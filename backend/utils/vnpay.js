import crypto from 'node:crypto';

// Mã hóa giống mẫu VNPay: encodeURIComponent, khoảng trắng -> '+'. Tránh ký tự đặc biệt trong OrderInfo.
const enc = (v) => encodeURIComponent(v).replace(/%20/g, '+');

export function buildSignData(params) {
  return Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
}
export const hmacSha512 = (data, secret) => crypto.createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');

export function buildPaymentUrl(baseUrl, params, secret) {
  const data = buildSignData(params);
  return `${baseUrl}?${data}&vnp_SecureHash=${hmacSha512(data, secret)}`;
}

/** Kiểm tra chữ ký của dữ liệu VNPay trả về (return URL hoặc IPN). */
export function verifySignature(query, secret) {
  const { vnp_SecureHash: received, vnp_SecureHashType: _t, ...rest } = query; // eslint-disable-line no-unused-vars
  if (!received || typeof received !== 'string') return false;
  const params = {};
  for (const [k, val] of Object.entries(rest)) if (k.startsWith('vnp_')) params[k] = String(val);
  const expected = hmacSha512(buildSignData(params), secret);
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(received.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** yyyyMMddHHmmss theo giờ Việt Nam (GMT+7). */
export function vnpDate(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

export const cleanOrderInfo = (s) => String(s).replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
