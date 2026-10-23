import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPool, exec } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Xác thực JWT, rồi đọc lại user từ DB để luôn áp dụng Role/Status mới nhất (khóa tài khoản có hiệu lực ngay). */
export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'Bạn chưa đăng nhập');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }
  const r = await exec(
    await getPool(),
    'SELECT UserID, FullName, Email, Phone, Address, Role, Status, CreatedAt FROM dbo.Users WHERE UserID = @id',
    { id: Number(payload.sub) },
  );
  const user = r.recordset[0];
  if (!user) throw new AppError(401, 'Tài khoản không tồn tại');
  if (user.Status === 'Locked') throw new AppError(403, 'Tài khoản của bạn đã bị khóa');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.Role) ? next() : next(new AppError(403, 'Bạn không có quyền thực hiện thao tác này'));

export const requireAdmin = [authenticate, requireRole('Admin')];
