import * as s from '../services/membershipService.js';
import { ok, created } from '../utils/response.js';
import { int } from '../utils/validate.js';

export const apply = async (req, res) => created(res, await s.apply(req.user.UserID, req.body), { message: 'Đã gửi yêu cầu đăng ký thành viên' });
export const mine = async (req, res) => ok(res, await s.myMemberships(req.user.UserID));
export const cancel = async (req, res) => ok(res, await s.cancelMine(req.user.UserID, int(req.params.id, 'ID')), { message: 'Đã hủy yêu cầu' });
export const adminList = async (req, res) => { const { rows, meta } = await s.adminList(req.query); ok(res, rows, meta); };
export const adminDetail = async (req, res) => ok(res, await s.adminDetail(int(req.params.id, 'ID')));
export const review = async (req, res) => ok(res, await s.review(req.user.UserID, int(req.params.id, 'ID'), req.body), { message: 'Đã xử lý yêu cầu' });
