import { getPool, exec, withTransaction, sql } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { allowedNext, canTransition, canRequestCancel, ORDER_STATUSES } from '../utils/orderStateMachine.js';

const D = (x) => [sql.Decimal(12, 2), x];

/* ---------- Tồn kho ----------
   QUY TẮC: trừ kho NGAY khi tạo đơn (giữ hàng). Hoàn kho khi đơn bị Cancelled
   (hủy được duyệt / thanh toán thất bại / quá hạn thanh toán). StockRestored chống hoàn 2 lần. */
export async function restoreStock(tx, orderId) {
  const mark = await exec(tx, 'UPDATE dbo.Orders SET StockRestored=1 WHERE OrderID=@id AND StockRestored=0', { id: orderId });
  if (!mark.rowsAffected[0]) return false;
  await exec(tx, `UPDATE p SET p.StockQuantity = p.StockQuantity + oi.Quantity
    FROM dbo.Products p JOIN dbo.OrderItems oi ON oi.ProductID=p.ProductID WHERE oi.OrderID=@id`, { id: orderId });
  return true;
}

/** Hủy đơn nội bộ: đổi trạng thái, đóng giao dịch đang chờ, hoàn kho. KHÔNG tự đánh dấu Refunded. */
export async function cancelInternal(tx, orderId, note) {
  const r = await exec(tx, `
    UPDATE dbo.Orders SET Status=N'Cancelled',
      PaymentStatus = CASE WHEN PaymentStatus IN (N'Unpaid', N'Pending') THEN N'Failed' ELSE PaymentStatus END,
      AdminNote = COALESCE(@note, AdminNote), UpdatedAt=SYSUTCDATETIME()
    WHERE OrderID=@id AND Status NOT IN (N'Cancelled', N'Delivered')`, { id: orderId, note: note || null });
  if (!r.rowsAffected[0]) return false;
  await exec(tx, `UPDATE dbo.PaymentTransactions SET Status=N'Failed', UpdatedAt=SYSUTCDATETIME() WHERE OrderID=@id AND Status=N'Pending'`, { id: orderId });
  await restoreStock(tx, orderId);
  return true;
}

/** Đơn chưa thanh toán quá hạn => tự hủy và hoàn kho (chạy "lười" mỗi khi có request liên quan đơn hàng). */
export async function expireStaleOrders() {
  await withTransaction(async (tx) => {
    const ids = (await exec(tx, `
      SELECT OrderID FROM dbo.Orders WITH (UPDLOCK, READPAST)
      WHERE Status=N'Pending' AND PaymentStatus IN (N'Unpaid', N'Pending')
        AND CreatedAt < DATEADD(MINUTE, -@m, SYSUTCDATETIME())`, { m: env.paymentTimeoutMinutes })).recordset;
    for (const { OrderID } of ids) await cancelInternal(tx, OrderID, 'Tự động hủy: quá hạn thanh toán');
  });
}

/* ---------- Tạo đơn ---------- */
export async function createOrder(userId, body) {
  const shippingName = v.str(body.shippingName, 'Tên người nhận', { max: 100 });
  const shippingPhone = v.phone(body.shippingPhone);
  const shippingAddress = v.str(body.shippingAddress, 'Địa chỉ nhận hàng', { min: 5, max: 300 });
  const paymentMethod = v.oneOf(body.paymentMethod, ['Mock', 'VNPay'], 'Phương thức thanh toán');
  if (paymentMethod === 'Mock' && !env.enableMockPayment) throw new AppError(400, 'Thanh toán giả lập đang bị tắt');
  await expireStaleOrders();

  return withTransaction(async (tx) => {
    const items = (await exec(tx, `
      SELECT c.CartItemID, c.ProductID, c.Quantity, p.Name, p.Price, p.StockQuantity, p.IsActive
      FROM dbo.CartItems c JOIN dbo.Products p WITH (UPDLOCK, ROWLOCK) ON p.ProductID=c.ProductID
      WHERE c.UserID=@u`, { u: userId })).recordset;
    if (!items.length) throw new AppError(400, 'Giỏ hàng đang trống');
    let totalCents = 0;
    for (const it of items) {
      if (!it.IsActive) throw new AppError(409, `Sản phẩm "${it.Name}" đã ngừng bán`);
      if (it.Quantity > it.StockQuantity) throw new AppError(409, `Sản phẩm "${it.Name}" chỉ còn ${it.StockQuantity} trong kho`);
      totalCents += Math.round(it.Price * 100) * it.Quantity; // tổng tiền do backend tính
    }
    const o = await exec(tx, `
      INSERT INTO dbo.Orders (UserID, TotalAmount, PaymentMethod, ShippingName, ShippingPhone, ShippingAddress)
      OUTPUT INSERTED.OrderID VALUES (@u, @total, @pm, @n, @ph, @ad)`,
    { u: userId, total: D(totalCents / 100), pm: paymentMethod, n: shippingName, ph: shippingPhone, ad: shippingAddress });
    const orderId = o.recordset[0].OrderID;
    for (const it of items) {
      // UPDATE có điều kiện => hai người mua sản phẩm cuối: chỉ một người trừ được, tồn kho không bao giờ âm.
      const dec = await exec(tx, `UPDATE dbo.Products SET StockQuantity=StockQuantity-@q WHERE ProductID=@p AND IsActive=1 AND StockQuantity>=@q`, { q: it.Quantity, p: it.ProductID });
      if (!dec.rowsAffected[0]) throw new AppError(409, `Sản phẩm "${it.Name}" vừa hết hàng`);
      await exec(tx, `INSERT INTO dbo.OrderItems (OrderID, ProductID, Quantity, UnitPrice) VALUES (@o,@p,@q,@price)`,
        { o: orderId, p: it.ProductID, q: it.Quantity, price: D(it.Price) });
    }
    await exec(tx, 'DELETE FROM dbo.CartItems WHERE UserID=@u', { u: userId });
    return { OrderID: orderId, TotalAmount: totalCents / 100, PaymentMethod: paymentMethod, PaymentStatus: 'Unpaid', Status: 'Pending' };
  });
}

/* ---------- Truy vấn ---------- */
async function attachItems(pool, orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.OrderID).join(',');
  const items = (await exec(pool, `
    SELECT oi.*, p.Name AS ProductName, p.ImageURL FROM dbo.OrderItems oi JOIN dbo.Products p ON p.ProductID=oi.ProductID
    WHERE oi.OrderID IN (${ids}) ORDER BY oi.OrderItemID`)).recordset; // ids là số nguyên lấy từ DB
  return orders.map((o) => ({ ...o, Items: items.filter((i) => i.OrderID === o.OrderID), AllowedNext: allowedNext(o), CanRequestCancel: canRequestCancel(o) }));
}

export async function myOrders(userId, query) {
  await expireStaleOrders();
  const p = v.paging(query, { defaultSize: 10 });
  const pool = await getPool();
  const total = (await exec(pool, 'SELECT COUNT(*) AS N FROM dbo.Orders WHERE UserID=@u', { u: userId })).recordset[0].N;
  const orders = (await exec(pool, `SELECT * FROM dbo.Orders WHERE UserID=@u ORDER BY CreatedAt DESC, OrderID DESC
    OFFSET @o ROWS FETCH NEXT @s ROWS ONLY`, { u: userId, o: p.offset, s: p.pageSize })).recordset;
  return { rows: await attachItems(pool, orders), meta: v.pageMeta(p, total) };
}

export async function myOrder(userId, id) {
  await expireStaleOrders();
  const pool = await getPool();
  const o = (await exec(pool, 'SELECT * FROM dbo.Orders WHERE OrderID=@id AND UserID=@u', { id, u: userId })).recordset;
  if (!o.length) throw new AppError(404, 'Không tìm thấy đơn hàng');
  return (await attachItems(pool, o))[0];
}

export async function requestCancel(userId, id, body) {
  const reason = v.str(body.reason, 'Lý do hủy', { optional: true, max: 500 });
  return withTransaction(async (tx) => {
    const o = (await exec(tx, 'SELECT * FROM dbo.Orders WITH (UPDLOCK) WHERE OrderID=@id AND UserID=@u', { id, u: userId })).recordset[0];
    if (!o) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (!canRequestCancel(o)) throw new AppError(409, 'Đơn hàng ở trạng thái hiện tại không thể yêu cầu hủy');
    await exec(tx, `UPDATE dbo.Orders SET Status=N'CancellationRequested', StatusBeforeCancelRequest=@prev, CancelReason=@r, UpdatedAt=SYSUTCDATETIME() WHERE OrderID=@id`,
      { prev: o.Status, r: reason, id });
    return { OrderID: id, Status: 'CancellationRequested' };
  });
}

/* ---------- Admin ---------- */
export async function adminList(query) {
  await expireStaleOrders();
  const p = v.paging(query);
  const where = [];
  const params = { o: p.offset, s: p.pageSize };
  if (query.status) { where.push('o.Status=@status'); params.status = v.oneOf(query.status, ORDER_STATUSES, 'status'); }
  if (query.q) { where.push('(u.FullName LIKE @q OR u.Email LIKE @q OR o.ShippingName LIKE @q OR CAST(o.OrderID AS NVARCHAR(12)) = @exact)'); params.q = v.likeParam(query.q); params.exact = String(query.q).trim(); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pool = await getPool();
  const from = 'FROM dbo.Orders o JOIN dbo.Users u ON u.UserID=o.UserID';
  const total = (await exec(pool, `SELECT COUNT(*) AS N ${from} ${w}`, params)).recordset[0].N;
  const orders = (await exec(pool, `SELECT o.*, u.FullName AS UserFullName, u.Email AS UserEmail ${from} ${w}
    ORDER BY o.CreatedAt DESC, o.OrderID DESC OFFSET @o ROWS FETCH NEXT @s ROWS ONLY`, params)).recordset;
  return { rows: await attachItems(pool, orders), meta: v.pageMeta(p, total) };
}

export async function adminUpdateStatus(id, body) {
  const to = v.oneOf(body.status, ORDER_STATUSES, 'Trạng thái');
  const note = v.str(body.note, 'Ghi chú', { optional: true, max: 500 });
  return withTransaction(async (tx) => {
    const o = (await exec(tx, 'SELECT * FROM dbo.Orders WITH (UPDLOCK) WHERE OrderID=@id', { id })).recordset[0];
    if (!o) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (!canTransition(o, to)) throw new AppError(409, `Không thể chuyển đơn từ "${o.Status}" sang "${to}"`);
    // Thanh toán là bắt buộc => chỉ xác nhận đơn đã thanh toán.
    if (to === 'Confirmed' && o.PaymentStatus !== 'Paid') throw new AppError(409, 'Chỉ xác nhận được đơn đã thanh toán');
    if (to === 'Cancelled') {
      await cancelInternal(tx, id, note);
    } else {
      await exec(tx, `UPDATE dbo.Orders SET Status=@to, AdminNote=COALESCE(@note, AdminNote), UpdatedAt=SYSUTCDATETIME() WHERE OrderID=@id`, { to, note, id });
    }
    return (await exec(tx, 'SELECT * FROM dbo.Orders WHERE OrderID=@id', { id })).recordset[0];
  });
}

/** Chỉ đánh dấu Refunded khi Admin xác nhận ĐÃ hoàn tiền thật cho khách (ngoài hệ thống). */
export async function adminMarkRefunded(id, body) {
  if (body.confirmed !== true) throw new AppError(400, 'Cần xác nhận đã hoàn tiền thực tế cho khách (confirmed: true)');
  const note = v.str(body.note, 'Ghi chú hoàn tiền', { max: 500 });
  const r = await exec(await getPool(), `
    UPDATE dbo.Orders SET PaymentStatus=N'Refunded', AdminNote=@note, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.*
    WHERE OrderID=@id AND Status=N'Cancelled' AND PaymentStatus=N'Paid'`, { id, note });
  if (!r.recordset.length) throw new AppError(409, 'Chỉ đánh dấu hoàn tiền cho đơn đã hủy và đã thanh toán');
  return r.recordset[0];
}
