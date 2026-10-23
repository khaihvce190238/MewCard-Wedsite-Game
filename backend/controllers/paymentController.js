import * as s from '../services/paymentService.js';
import { ok } from '../utils/response.js';
import { int } from '../utils/validate.js';
import { env, vnpayConfigured } from '../config/env.js';

export const config = async (req, res) => ok(res, { mockEnabled: env.enableMockPayment, vnpayConfigured: vnpayConfigured() });
export const mock = async (req, res) => ok(res, await s.mockPay(req.user.UserID, req.body));
export const vnpayCreate = async (req, res) => ok(res, await s.createVnpayUrl(req.user.UserID, req.body, req));
export const vnpayReturn = async (req, res) => ok(res, await s.handleReturn(req.query));
export const vnpayIpn = async (req, res) => res.status(200).json(await s.handleIpn(req.query));
export const status = async (req, res) => ok(res, await s.orderPaymentStatus(req.user.UserID, int(req.params.orderId, 'orderId')));
