import crypto from 'node:crypto';

/** Mã xác nhận 6 chữ số, sinh bằng CSPRNG (không dùng Math.random). */
export const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

/** Chỉ lưu HMAC của mã (khóa = JWT_SECRET, gắn với email) — DB bị lộ cũng không đọc được mã. */
export const hashCode = (email, code, secret) =>
  crypto.createHmac('sha256', secret).update(`${String(email).toLowerCase()}:${code}`).digest('hex');

export function verifyCodeHash(email, code, secret, storedHash) {
  const a = Buffer.from(hashCode(email, code, secret), 'hex');
  let b;
  try { b = Buffer.from(String(storedHash), 'hex'); } catch { return false; }
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Có được phát hành/gửi lại mã không? (thời gian được SQL Server tính sẵn vào row để tránh lệch đồng hồ)
 * row: { SecondsSinceLast, Fresh (1 nếu bản ghi tạo trong vòng 1 giờ), SendCount }
 */
export function checkResendAllowed(row, { resendCooldownSeconds, maxSendsPerHour }) {
  if (!row) return { ok: true };
  if (row.SecondsSinceLast < resendCooldownSeconds) {
    const wait = Math.max(1, resendCooldownSeconds - row.SecondsSinceLast);
    return { ok: false, status: 429, message: `Vui lòng đợi ${wait} giây trước khi gửi lại mã`, retryAfter: wait };
  }
  if (row.Fresh && row.SendCount >= maxSendsPerHour) {
    return { ok: false, status: 429, message: 'Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.' };
  }
  return { ok: true };
}

/**
 * Kiểm tra mã người dùng nhập.
 * Trả về { ok:true } hoặc { ok:false, status, message, incrementAttempts? }.
 * row: { Expired (0/1), Attempts, CodeHash } hoặc undefined nếu không có yêu cầu đăng ký.
 */
export function checkVerification(row, { email, code, secret, maxAttempts }) {
  if (!row) return { ok: false, status: 400, message: 'Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.' };
  if (row.Expired) return { ok: false, status: 400, message: 'Mã xác nhận đã hết hạn. Hãy bấm “Gửi lại mã”.' };
  if (row.Attempts >= maxAttempts) {
    return { ok: false, status: 429, message: 'Bạn đã nhập sai quá nhiều lần. Hãy bấm “Gửi lại mã” để nhận mã mới.' };
  }
  if (!verifyCodeHash(email, code, secret, row.CodeHash)) {
    const left = maxAttempts - (row.Attempts + 1);
    return left > 0
      ? { ok: false, status: 400, message: `Mã không đúng. Bạn còn ${left} lần thử.`, incrementAttempts: true }
      : { ok: false, status: 429, message: 'Bạn đã nhập sai quá nhiều lần. Hãy bấm “Gửi lại mã” để nhận mã mới.', incrementAttempts: true };
  }
  return { ok: true };
}
