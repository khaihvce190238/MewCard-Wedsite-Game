import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import * as c from '../controllers/paymentController.js';

const r = Router();
r.get('/config', h(c.config));
// IPN do máy chủ VNPay gọi => không có JWT; bảo vệ bằng chữ ký HMAC.
r.get('/vnpay/ipn', h(c.vnpayIpn));
r.get('/vnpay/return', h(c.vnpayReturn));
r.post('/mock', authenticate, h(c.mock));
r.post('/vnpay/create', authenticate, h(c.vnpayCreate));
r.get('/order/:orderId', authenticate, h(c.status));
export default r;
