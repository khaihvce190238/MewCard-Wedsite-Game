import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middlewares/auth.js';
import * as s from '../services/adminService.js';
import { ok } from '../utils/response.js';
import { int } from '../utils/validate.js';

const r = Router();
r.use(requireAdmin);
r.get('/dashboard', h(async (req, res) => ok(res, await s.dashboard())));
r.get('/users', h(async (req, res) => { const { rows, meta } = await s.listUsers(req.query); ok(res, rows, meta); }));
r.patch('/users/:id/status', h(async (req, res) =>
  ok(res, await s.setUserStatus(req.user.UserID, int(req.params.id, 'ID'), req.body.status), { message: 'Đã cập nhật trạng thái tài khoản' })));
export default r;
