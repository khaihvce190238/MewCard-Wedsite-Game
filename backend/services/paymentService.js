import crypto from 'node:crypto';
import { getPool, exec, withTransaction, sql } from '../config/db.js';
import { env, vnpayConfigured } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { buildPaymentUrl, verifySignature, vnpDate, cleanOrderInfo } from '../utils/vnpay.js';
import { cancelInternal, expireStaleOrders } from './orderService.js';

const D = (x) => [sql.Decimal(12, 2), x];

async function loadPayableOrder(tx, userId, orderId, method) {
  const o = (await exec(tx, 'SELECT * FROM dbo.Orders WITH (UPDLOCK) WHERE OrderID=@id AND UserID=@u', { id: orderId, u: userId })).recordset[0];
  if (!o) throw new AppError(404, 'Không tìm thấy đơn hàng');
  if (o.PaymentMethod !== method) throw new AppError(400, `Đơn hàng này dùng phương thức thanh toán ${o.PaymentMethod}`);
  if (o.Status !== 'Pending' || !['Unpaid', 'Pending'].includes(o.PaymentStatus)) {
    throw new AppError(409, o.PaymentStatus === 'Paid' ? 'Đơn hàng đã được thanh toán' : 'Đơn hàng không còn ở trạng thái chờ thanh toán');
  }
  return o;
}

/**
 * Áp dụng kết quả thanh toán — IDEMPOTENT: chỉ giao dịch đang 'Pending' mới được cập nhật
 * (UPDATE ... WHERE Status='Pending'), nên callback/IPN lặp lại không thể ghi nhận hai lần.
 */
export async function applyResult(tx, txRef, { success, providerNo, responseCode }) {
  const t = (await exec(tx, 'SELECT * FROM dbo.PaymentTransactions WITH (UPDLOCK) WHERE TransactionReference=@ref', { ref: txRef })).recordset[0];
  if (!t) throw new AppError(404, 'Không tìm thấy giao dịch');
  if (t.Status !== 'Pending') return { processed: false, status: t.Status, orderId: t.OrderID };
  const st = success ? 'Paid' : 'Failed';
  const up = await exec(tx, `
    UPDATE dbo.PaymentTransactions SET Status=@st, ProviderTransactionNo=@no, ResponseCode=@code, UpdatedAt=SYSUTCDATETIME(),
      PaidAt=CASE WHEN @st=N'Paid' THEN SYSUTCDATETIME() ELSE NULL END
    WHERE PaymentTransactionID=@id AND Status=N'Pending'`, { st, no: providerNo || null, code: responseCode || null, id: t.PaymentTransactionID });
  if (!up.rowsAffected[0]) return { processed: false, status: 'Paid', orderId: t.OrderID };
  if (success) {
    // Nếu đơn đã bị hủy/quá hạn trước khi tiền về: vẫn ghi nhận Paid để Admin biết cần hoàn tiền thủ công.
    await exec(tx, `UPDATE dbo.Orders SET PaymentStatus=N'Paid', UpdatedAt=SYSUTCDATETIME()
      WHERE OrderID=@id AND PaymentStatus IN (N'Unpaid', N'Pending', N'Failed')`, { id: t.OrderID });
  } else {
    const o = (await exec(tx, 'SELECT Status, PaymentStatus FROM dbo.Orders WHERE OrderID=@id', { id: t.OrderID })).recordset[0];
    if (o.Status === 'Pending' && o.PaymentStatus !== 'Paid') await cancelInternal(tx, t.OrderID, 'Thanh toán thất bại — đơn bị hủy và hoàn kho');
  }
  return { processed: true, status: st, orderId: t.OrderID };
}

/* ---------- Thanh toán giả lập (CHỈ DEMO) ---------- */
export async function mockPay(userId, body) {
  if (!env.enableMockPayment) throw new AppError(403, 'Thanh toán giả lập đang bị tắt');
  const orderId = v.int(body.orderId, 'orderId');
  const outcome = v.oneOf(body.outcome, ['success', 'failure'], 'outcome');
  await expireStaleOrders();
  return withTransaction(async (tx) => {
    const o = await loadPayableOrder(tx, userId, orderId, 'Mock');
    const ref = `MOCK${orderId}${crypto.randomBytes(5).toString('hex')}`;
    await exec(tx, `INSERT INTO dbo.PaymentTransactions (OrderID, Provider, TransactionReference, Amount) VALUES (@o, N'Mock', @ref, @amt)`,
      { o: orderId, ref, amt: D(o.TotalAmount) });
    const res = await applyResult(tx, ref, { success: outcome === 'success', providerNo: ref, responseCode: outcome === 'success' ? '00' : '99' });
    return { ...res, orderId, demo: true, message: 'Đây là thanh toán giả lập (môi trường demo), không có giao dịch thật.' };
  });
}

/* ---------- VNPay ---------- */
const clientIp = (req) => {
  const ip = (req.ip || req.socket?.remoteAddress || '127.0.0.1').replace('::ffff:', '');
  return ip === '::1' ? '127.0.0.1' : ip;
};

export async function createVnpayUrl(userId, body, req) {
  if (!vnpayConfigured()) throw new AppError(503, 'VNPay chưa được cấu hình trên máy chủ (thiếu VNPAY_TMN_CODE / VNPAY_HASH_SECRET / VNPAY_RETURN_URL). Xem README mục "Cấu hình VNPay sandbox".');
  const orderId = v.int(body.orderId, 'orderId');
  await expireStaleOrders();
  return withTransaction(async (tx) => {
    const o = await loadPayableOrder(tx, userId, orderId, 'VNPay');
    // Mỗi lần bấm thanh toán = một giao dịch mới (mã tham chiếu mới); giao dịch Pending cũ bị đóng lại.
    await exec(tx, `UPDATE dbo.PaymentTransactions SET Status=N'Failed', UpdatedAt=SYSUTCDATETIME() WHERE OrderID=@o AND Status=N'Pending'`, { o: orderId });
    const ref = `${orderId}${Date.now()}`;
    await exec(tx, `INSERT INTO dbo.PaymentTransactions (OrderID, Provider, TransactionReference, Amount) VALUES (@o, N'VNPay', @ref, @amt)`,
      { o: orderId, ref, amt: D(o.TotalAmount) });
    await exec(tx, `UPDATE dbo.Orders SET PaymentStatus=N'Pending', UpdatedAt=SYSUTCDATETIME() WHERE OrderID=@o`, { o: orderId });
    const now = new Date();
    const params = {
      vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: env.vnpay.tmnCode,
      vnp_Amount: String(Math.round(o.TotalAmount * 100)), // VNPay yêu cầu nhân 100
      vnp_CreateDate: vnpDate(now), vnp_ExpireDate: vnpDate(new Date(now.getTime() + env.paymentTimeoutMinutes * 60000)),
      vnp_CurrCode: 'VND', vnp_IpAddr: clientIp(req), vnp_Locale: 'vn',
      vnp_OrderInfo: cleanOrderInfo(`Thanh toan don hang ${orderId}`), vnp_OrderType: 'other',
      vnp_ReturnUrl: env.vnpay.returnUrl, vnp_TxnRef: ref,
    };
    return { paymentUrl: buildPaymentUrl(env.vnpay.url, params, env.vnpay.hashSecret), transactionReference: ref };
  });
}

async function checkVnpay(query) {
  if (!vnpayConfigured()) throw new AppError(503, 'VNPay chưa được cấu hình trên máy chủ');
  if (!verifySignature(query, env.vnpay.hashSecret)) return { code: 'BAD_SIGNATURE' };
  const t = (await exec(await getPool(), 'SELECT * FROM dbo.PaymentTransactions WHERE TransactionReference=@ref AND Provider=N\'VNPay\'', { ref: String(query.vnp_TxnRef || '') })).recordset[0];
  if (!t) return { code: 'NOT_FOUND' };
  if (Math.round(t.Amount * 100) !== Number(query.vnp_Amount)) return { code: 'BAD_AMOUNT', tx: t };
  return { code: 'OK', tx: t };
}

const isSuccess = (q) => q.vnp_ResponseCode === '00' && (q.vnp_TransactionStatus === undefined || q.vnp_TransactionStatus === '00');

/** IPN (server-to-server, nguồn tin cậy chính). Phản hồi theo đúng định dạng VNPay yêu cầu. */
export async function handleIpn(query) {
  try {
    const c = await checkVnpay(query);
    if (c.code === 'BAD_SIGNATURE') return { RspCode: '97', Message: 'Invalid signature' };
    if (c.code === 'NOT_FOUND') return { RspCode: '01', Message: 'Order not found' };
    if (c.code === 'BAD_AMOUNT') return { RspCode: '04', Message: 'Invalid amount' };
    if (c.tx.Status !== 'Pending') return { RspCode: '02', Message: 'Order already confirmed' };
    await withTransaction((tx) => applyResult(tx, c.tx.TransactionReference, { success: isSuccess(query), providerNo: query.vnp_TransactionNo, responseCode: query.vnp_ResponseCode }));
    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (err) {
    console.error('[vnpay ipn]', err);
    return { RspCode: '99', Message: 'Unknown error' };
  }
}

/**
 * Return URL: trình duyệt chuyển về frontend kèm tham số, frontend gọi API này.
 * Backend KHÔNG tin dữ liệu thô: kiểm tra chữ ký + số tiền + mã giao dịch, rồi áp dụng kết quả (idempotent).
 * Khi chạy localhost, VNPay không gọi được IPN nên đây là đường dự phòng; trên production IPN là nguồn chính.
 */
export async function handleReturn(query) {
  const c = await checkVnpay(query);
  if (c.code === 'BAD_SIGNATURE') throw new AppError(400, 'Chữ ký VNPay không hợp lệ');
  if (c.code === 'NOT_FOUND') throw new AppError(404, 'Không tìm thấy giao dịch');
  if (c.code === 'BAD_AMOUNT') throw new AppError(400, 'Số tiền thanh toán không khớp');
  const res = await withTransaction((tx) => applyResult(tx, c.tx.TransactionReference, { success: isSuccess(query), providerNo: query.vnp_TransactionNo, responseCode: query.vnp_ResponseCode }));
  return { orderId: res.orderId, status: res.status, responseCode: query.vnp_ResponseCode };
}

export async function orderPaymentStatus(userId, orderId) {
  const pool = await getPool();
  const o = (await exec(pool, 'SELECT OrderID, Status, PaymentMethod, PaymentStatus, TotalAmount FROM dbo.Orders WHERE OrderID=@id AND UserID=@u', { id: orderId, u: userId })).recordset[0];
  if (!o) throw new AppError(404, 'Không tìm thấy đơn hàng');
  const txs = (await exec(pool, 'SELECT Provider, TransactionReference, Amount, Status, CreatedAt, PaidAt FROM dbo.PaymentTransactions WHERE OrderID=@id ORDER BY PaymentTransactionID DESC', { id: orderId })).recordset;
  return { order: o, transactions: txs };
}
