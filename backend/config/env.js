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
