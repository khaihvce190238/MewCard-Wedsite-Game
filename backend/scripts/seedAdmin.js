// Tạo/cập nhật tài khoản Admin từ biến môi trường (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULLNAME).
// Mật khẩu KHÔNG nằm trong source code. Chạy: npm run seed:admin
import bcrypt from 'bcryptjs';
import { assertEnv } from '../config/env.js';
import { getPool, exec } from '../config/db.js';

assertEnv();
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
const fullName = process.env.ADMIN_FULLNAME || 'Administrator';
if (!email || password.length < 8) {
  console.error('Cần ADMIN_EMAIL và ADMIN_PASSWORD (>= 8 ký tự) trong backend/.env');
  process.exit(1);
}
const pool = await getPool();
const hash = await bcrypt.hash(password, 10);
const found = await exec(pool, 'SELECT UserID FROM dbo.Users WHERE Email=@email', { email });
if (found.recordset.length) {
  await exec(pool, `UPDATE dbo.Users SET Role=N'Admin', Status=N'Active', PasswordHash=@hash WHERE Email=@email`, { hash, email });
  console.log(`Đã cập nhật Admin: ${email}`);
} else {
  await exec(pool, `INSERT INTO dbo.Users (FullName, Email, PasswordHash, Role) VALUES (@fullName, @email, @hash, N'Admin')`, { fullName, email, hash });
  console.log(`Đã tạo Admin: ${email}`);
}
await pool.close();
