const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Nội dung email xác nhận đăng ký. Tên người dùng do người dùng nhập nên luôn được escape HTML. */
export function buildVerificationEmail({ name, code, ttlMinutes }) {
  const subject = 'Mã xác nhận tài khoản MewCard';
  const text = `Xin chào ${name},\n\nMã xác nhận đăng ký MewCard của bạn là: ${code}\nMã có hiệu lực trong ${ttlMinutes} phút.\n\nNếu bạn không yêu cầu đăng ký, hãy bỏ qua email này. Tuyệt đối không chia sẻ mã cho bất kỳ ai.\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#222">
  <h2 style="color:#7c3aed;margin:0 0 12px">MewCard</h2>
  <p>Xin chào <strong>${esc(name)}</strong>,</p>
  <p>Mã xác nhận đăng ký của bạn là:</p>
  <p style="font-size:34px;letter-spacing:8px;font-weight:700;background:#f4f0ff;border-radius:8px;padding:12px 16px;text-align:center;margin:12px 0">${esc(code)}</p>
  <p>Mã có hiệu lực trong <strong>${esc(ttlMinutes)} phút</strong>.</p>
  <p style="color:#666;font-size:13px">Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này. Tuyệt đối không chia sẻ mã cho bất kỳ ai.</p>
</div>`;
  return { subject, text, html };
}
