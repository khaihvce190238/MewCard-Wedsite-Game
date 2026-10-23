import * as auth from '../services/authService.js';
import { ok, created } from '../utils/response.js';

export const register = async (req, res) => created(res, await auth.register(req.body), { message: 'Đăng ký thành công' });
export const login = async (req, res) => ok(res, await auth.login(req.body), { message: 'Đăng nhập thành công' });
export const me = async (req, res) => ok(res, req.user);
export const updateMe = async (req, res) => ok(res, await auth.updateProfile(req.user.UserID, req.body), { message: 'Đã cập nhật hồ sơ' });
export const changePassword = async (req, res) => {
  await auth.changePassword(req.user.UserID, req.body);
  ok(res, null, { message: 'Đã đổi mật khẩu' });
};
