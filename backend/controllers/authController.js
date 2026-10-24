import * as auth from '../services/authService.js';
import { ok, created } from '../utils/response.js';

export const register = async (req, res) => {
  const data = await auth.register(req.body);
  ok(res, data, { message: data.devMode ? 'Chế độ phát triển: mã xác nhận được in ra terminal của backend' : 'Đã gửi mã xác nhận đến email của bạn' });
};
export const resendCode = async (req, res) => {
  const data = await auth.resendCode(req.body);
  ok(res, data, { message: data.devMode ? 'Chế độ phát triển: mã xác nhận được in ra terminal của backend' : 'Đã gửi lại mã xác nhận' });
};
export const verifyRegistration = async (req, res) => created(res, await auth.verifyRegistration(req.body), { message: 'Xác nhận thành công, tài khoản đã được tạo' });
export const login = async (req, res) => ok(res, await auth.login(req.body), { message: 'Đăng nhập thành công' });
export const googleLogin = async (req, res) => ok(res, await auth.googleLogin(req.body), { message: 'Đăng nhập Google thành công' });
export const me = async (req, res) => ok(res, req.user);
export const updateMe = async (req, res) => ok(res, await auth.updateProfile(req.user.UserID, req.body), { message: 'Đã cập nhật hồ sơ' });
export const changePassword = async (req, res) => {
  await auth.changePassword(req.user.UserID, req.body);
  ok(res, null, { message: 'Đã đổi mật khẩu' });
};
