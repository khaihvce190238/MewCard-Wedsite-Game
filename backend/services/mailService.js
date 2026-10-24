import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { buildVerificationEmail } from '../utils/emailTemplates.js';

let transporter;
const getTransporter = () => {
  transporter ??= nodemailer.createTransport({
    host: env.mail.host, port: env.mail.port, secure: env.mail.secure,
    auth: { user: env.mail.user, pass: env.mail.pass },
  });
  return transporter;
};

/**
 * Gửi mã xác nhận đăng ký.
 * - Có SMTP: gửi email thật, trả { delivered: true }.
 * - Chưa có SMTP + NODE_ENV=production: lỗi 503 (không giả vờ đã gửi).
 * - Chưa có SMTP + môi trường phát triển: in mã ra console backend và trả { delivered: false, devMode: true }.
 */
export async function sendVerificationEmail({ to, name, code, ttlMinutes }) {
  const { subject, text, html } = buildVerificationEmail({ name, code, ttlMinutes });
  if (!mailConfigured()) {
    if (env.isProduction) throw new AppError(503, 'Máy chủ chưa cấu hình gửi email. Vui lòng liên hệ quản trị viên.');
    console.log(`\n[MAIL-DEV] Chưa cấu hình SMTP — email KHÔNG được gửi. Mã xác nhận cho ${to}: ${code}\n`);
    return { delivered: false, devMode: true };
  }
  await getTransporter().sendMail({ from: env.mail.from || env.mail.user, to, subject, text, html });
  return { delivered: true, devMode: false };
}
