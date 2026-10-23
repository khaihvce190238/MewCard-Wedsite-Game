import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPool, exec } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const USER_FIELDS = 'UserID, FullName, Email, Phone, Address, Role, Status, CreatedAt';
const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export async function register(body) {
  const fullName = v.str(body.fullName, 'Họ tên', { max: 100 });
  const email = v.email(body.email);
  const password = v.password(body.password);
  const pool = await getPool();
  const exist = await exec(pool, 'SELECT 1 FROM dbo.Users WHERE Email = @email', { email });
  if (exist.recordset.length) throw new AppError(409, 'Email đã được sử dụng');
  const hash = await bcrypt.hash(password, 10);
  // Role luôn là 'User' — mọi trường role gửi lên đều bị bỏ qua.
  const r = await exec(
    pool,
    `INSERT INTO dbo.Users (FullName, Email, PasswordHash, Role) OUTPUT INSERTED.UserID VALUES (@fullName, @email, @hash, N'User')`,
    { fullName, email, hash },
  );
  const userId = r.recordset[0].UserID;
  const user = (await exec(pool, `SELECT ${USER_FIELDS} FROM dbo.Users WHERE UserID = @id`, { id: userId })).recordset[0];
  return { user, token: signToken(userId) };
}

export async function login(body) {
  const email = v.email(body.email);
  if (typeof body.password !== 'string' || !body.password) throw new AppError(400, 'Mật khẩu không được để trống');
  const pool = await getPool();
  const r = await exec(pool, `SELECT ${USER_FIELDS}, PasswordHash FROM dbo.Users WHERE Email = @email`, { email });
  const row = r.recordset[0];
  const okPw = row ? await bcrypt.compare(body.password, row.PasswordHash) : false;
  if (!okPw) throw new AppError(401, 'Email hoặc mật khẩu không đúng');
  if (row.Status === 'Locked') throw new AppError(403, 'Tài khoản của bạn đã bị khóa');
  const { PasswordHash, ...user } = row; // eslint-disable-line no-unused-vars
  return { user, token: signToken(user.UserID) };
}

export async function updateProfile(userId, body) {
  const fullName = v.str(body.fullName, 'Họ tên', { max: 100 });
  const phone = v.phone(body.phone, { optional: true });
  const address = v.str(body.address, 'Địa chỉ', { optional: true, max: 300 });
  const pool = await getPool();
  await exec(pool, 'UPDATE dbo.Users SET FullName=@fullName, Phone=@phone, Address=@address WHERE UserID=@id',
    { fullName, phone, address, id: userId });
  return (await exec(pool, `SELECT ${USER_FIELDS} FROM dbo.Users WHERE UserID=@id`, { id: userId })).recordset[0];
}

export async function changePassword(userId, body) {
  const newPassword = v.password(body.newPassword, 'Mật khẩu mới');
  const pool = await getPool();
  const row = (await exec(pool, 'SELECT PasswordHash FROM dbo.Users WHERE UserID=@id', { id: userId })).recordset[0];
  if (!(await bcrypt.compare(String(body.currentPassword || ''), row.PasswordHash))) {
    throw new AppError(400, 'Mật khẩu hiện tại không đúng');
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await exec(pool, 'UPDATE dbo.Users SET PasswordHash=@hash WHERE UserID=@id', { hash, id: userId });
}
