import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

export const env = {
  port: num(process.env.PORT, 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: num(process.env.DB_PORT, 1433),
    database: process.env.DB_NAME || 'DecisionCardDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 3),
  drawTimeoutMinutes: num(process.env.DRAW_SESSION_TIMEOUT_MINUTES, 30),
  paymentTimeoutMinutes: num(process.env.PAYMENT_PENDING_TIMEOUT_MINUTES, 30),
  enableMockPayment: process.env.ENABLE_MOCK_PAYMENT !== 'false',
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL,
    ipnUrl: process.env.VNPAY_IPN_URL,
  },
  isProduction: process.env.NODE_ENV === 'production',
  // Gửi email xác nhận đăng ký (SMTP). Gmail: dùng "Mật khẩu ứng dụng", không dùng mật khẩu đăng nhập Gmail.
  mail: {
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true', // true cho cổng 465
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
  emailCode: {
    ttlMinutes: num(process.env.EMAIL_CODE_TTL_MINUTES, 10),
    maxAttempts: num(process.env.EMAIL_CODE_MAX_ATTEMPTS, 5),
    resendCooldownSeconds: num(process.env.EMAIL_RESEND_COOLDOWN_SECONDS, 60),
    maxSendsPerHour: num(process.env.EMAIL_MAX_SENDS_PER_HOUR, 5),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    // true: lần đầu đăng nhập Google sẽ tự tạo tài khoản (giống đa số ứng dụng). false: chỉ cho tài khoản đã có.
    allowSignup: process.env.GOOGLE_ALLOW_SIGNUP !== 'false',
  },
};

export function assertEnv() {
  const missing = [];
  if (!env.jwtSecret || env.jwtSecret.length < 16) missing.push('JWT_SECRET (>= 16 ký tự)');
  if (!env.db.user) missing.push('DB_USER');
  if (!env.db.password) missing.push('DB_PASSWORD');
  if (missing.length) {
    throw new Error('Thiếu cấu hình trong backend/.env: ' + missing.join(', ') + '. Hãy copy .env.example thành .env và điền giá trị.');
  }
}

export const vnpayConfigured = () =>
  Boolean(env.vnpay.tmnCode && env.vnpay.hashSecret && env.vnpay.url && env.vnpay.returnUrl);

export const mailConfigured = () => Boolean(env.mail.host && env.mail.user && env.mail.pass);
export const googleConfigured = () => Boolean(env.google.clientId);
