import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env, googleConfigured } from '../config/env.js';
import { getPool, exec, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';
import { generateCode, hashCode, checkResendAllowed, checkVerification } from '../utils/verificationCode.js';
import { sendVerificationEmail } from './mailService.js';

const USER_FIELDS = `UserID, FullName, Email, Phone, Address, Role, Status, CreatedAt,
  CAST(CASE WHEN PasswordHash IS NULL THEN 0 ELSE 1 END AS BIT) AS HasPassword`;
const signToken = (userId) => jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const googleClient = new OAuth2Client();

async function getUserById(ctx, id) {
  return (await exec(ctx, `SELECT ${USER_FIELDS} FROM dbo.Users WHERE UserID = @id`, { id })).recordset[0];
}

/* =====================================================================
   ĐĂNG KÝ CÓ XÁC NHẬN EMAIL
   1) POST /register        -> lưu yêu cầu tạm (PendingRegistrations) + gửi mã 6 số. CHƯA tạo tài khoản.
   2) POST /register/verify -> nhập đúng mã mới tạo dòng trong Users và đăng nhập.
   3) POST /register/resend -> gửi lại mã (có cooldown + giới hạn số lần).
   ===================================================================== */
const PENDING_SELECT = `
  SELECT PendingID, Email, FullName, PasswordHash, CodeHash, Attempts, SendCount,
         CASE WHEN ExpiresAt < SYSUTCDATETIME() THEN 1 ELSE 0 END AS Expired,
         DATEDIFF(SECOND, LastSentAt, SYSUTCDATETIME()) AS SecondsSinceLast,
         CASE WHEN CreatedAt >= DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN 1 ELSE 0 END AS Fresh
  FROM dbo.PendingRegistrations WITH (UPDLOCK, HOLDLOCK) WHERE Email = @email`;

// Phát hành mã mới: đặt hạn, xóa số lần nhập sai, đếm số lần gửi trong 1 giờ.
const REFRESH_CODE_SQL = `
  UPDATE dbo.PendingRegistrations SET
    CodeHash = @codeHash,
    ExpiresAt = DATEADD(MINUTE, @ttl, SYSUTCDATETIME()),
    Attempts = 0,
    SendCount = CASE WHEN CreatedAt >= DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN SendCount + 1 ELSE 1 END,
    CreatedAt = CASE WHEN CreatedAt >= DATEADD(HOUR, -1, SYSUTCDATETIME()) THEN CreatedAt ELSE SYSUTCDATETIME() END,
    LastSentAt = SYSUTCDATETIME()`;

function codeInfo(email, delivery) {
  return {
    email,
    expiresInMinutes: env.emailCode.ttlMinutes,
    resendAfterSeconds: env.emailCode.resendCooldownSeconds,
    devMode: Boolean(delivery.devMode),
  };
}

async function deliver(email, name, code) {
  try {
    return await sendVerificationEmail({ to: email, name, code, ttlMinutes: env.emailCode.ttlMinutes });
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[mail] Gửi email thất bại:', err.message);
    // Trả lại cooldown để người dùng thử lại ngay được.
    await exec(await getPool(), 'UPDATE dbo.PendingRegistrations SET LastSentAt = DATEADD(HOUR, -1, LastSentAt) WHERE Email = @email', { email });
    throw new AppError(502, 'Không gửi được email xác nhận. Vui lòng kiểm tra địa chỉ email hoặc thử lại sau.');
  }
}

export async function register(body) {
  const fullName = v.str(body.fullName, 'Họ tên', { max: 100 });
  const email = v.email(body.email);
  const password = v.password(body.password);
  const pool = await getPool();

  const used = (await exec(pool, 'SELECT PasswordHash FROM dbo.Users WHERE Email = @email', { email })).recordset[0];
  if (used) {
    throw new AppError(409, used.PasswordHash ? 'Email đã được sử dụng' : 'Email này đã được đăng ký bằng Google. Hãy đăng nhập bằng Google.');
  }
  await exec(pool, 'DELETE FROM dbo.PendingRegistrations WHERE ExpiresAt < DATEADD(DAY, -1, SYSUTCDATETIME())'); // dọn rác

  const hash = await bcrypt.hash(password, 10); // mật khẩu được hash ngay, không lưu bản rõ
  const code = generateCode();
  const codeHash = hashCode(email, code, env.jwtSecret);

  await withTransaction(async (tx) => {
    const row = (await exec(tx, PENDING_SELECT, { email })).recordset[0];
    const gate = checkResendAllowed(row, env.emailCode);
    if (!gate.ok) throw new AppError(gate.status, gate.message);
    if (row) {
      await exec(tx, `${REFRESH_CODE_SQL}, FullName = @fullName, PasswordHash = @hash WHERE PendingID = @id`,
        { codeHash, ttl: env.emailCode.ttlMinutes, fullName, hash, id: row.PendingID });
    } else {
      await exec(tx, `INSERT INTO dbo.PendingRegistrations (Email, FullName, PasswordHash, CodeHash, ExpiresAt)
        VALUES (@email, @fullName, @hash, @codeHash, DATEADD(MINUTE, @ttl, SYSUTCDATETIME()))`,
      { email, fullName, hash, codeHash, ttl: env.emailCode.ttlMinutes });
    }
  });

  return codeInfo(email, await deliver(email, fullName, code));
}

export async function resendCode(body) {
  const email = v.email(body.email);
  const code = generateCode();
  const codeHash = hashCode(email, code, env.jwtSecret);
  const fullName = await withTransaction(async (tx) => {
    const row = (await exec(tx, PENDING_SELECT, { email })).recordset[0];
    if (!row) throw new AppError(404, 'Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.');
    const gate = checkResendAllowed(row, env.emailCode);
    if (!gate.ok) throw new AppError(gate.status, gate.message);
    await exec(tx, `${REFRESH_CODE_SQL} WHERE PendingID = @id`, { codeHash, ttl: env.emailCode.ttlMinutes, id: row.PendingID });
    return row.FullName;
  });
  return codeInfo(email, await deliver(email, fullName, code));
}

export async function verifyRegistration(body) {
  const email = v.email(body.email);
  const code = String(body.code ?? '').trim();
  if (!/^\d{6}$/.test(code)) throw new AppError(400, 'Mã xác nhận gồm 6 chữ số');

  // Quyết định được tính TRONG transaction nhưng lỗi chỉ ném SAU khi commit,
  // để việc tăng số lần nhập sai không bị rollback.
  const outcome = await withTransaction(async (tx) => {
    const row = (await exec(tx, PENDING_SELECT, { email })).recordset[0];
    const res = checkVerification(row, { email, code, secret: env.jwtSecret, maxAttempts: env.emailCode.maxAttempts });
    if (!res.ok) {
      if (res.incrementAttempts) await exec(tx, 'UPDATE dbo.PendingRegistrations SET Attempts = Attempts + 1 WHERE PendingID = @id', { id: row.PendingID });
      return res;
    }
    const taken = await exec(tx, 'SELECT 1 FROM dbo.Users WHERE Email = @email', { email });
    if (taken.recordset.length) {
      await exec(tx, 'DELETE FROM dbo.PendingRegistrations WHERE PendingID = @id', { id: row.PendingID });
      return { ok: false, status: 409, message: 'Email đã được sử dụng' };
    }
    // Role luôn là 'User' — không có đường nào để chọn Admin khi đăng ký.
    const ins = await exec(tx, `INSERT INTO dbo.Users (FullName, Email, PasswordHash, Role) OUTPUT INSERTED.UserID
      VALUES (@fullName, @email, @hash, N'User')`, { fullName: row.FullName, email, hash: row.PasswordHash });
    await exec(tx, 'DELETE FROM dbo.PendingRegistrations WHERE PendingID = @id', { id: row.PendingID });
    return { ok: true, userId: ins.recordset[0].UserID };
  });
  if (!outcome.ok) throw new AppError(outcome.status, outcome.message);
  const user = await getUserById(await getPool(), outcome.userId);
  return { user, token: signToken(user.UserID) };
}

/* ===================================================================== */
export async function login(body) {
  const email = v.email(body.email);
  if (typeof body.password !== 'string' || !body.password) throw new AppError(400, 'Mật khẩu không được để trống');
  const pool = await getPool();
  const r = await exec(pool, `SELECT ${USER_FIELDS}, PasswordHash FROM dbo.Users WHERE Email = @email`, { email });
  const row = r.recordset[0];
  if (row && !row.PasswordHash) {
    throw new AppError(401, 'Tài khoản này được tạo bằng Google. Hãy bấm “Đăng nhập bằng Google”.');
  }
  const okPw = row ? await bcrypt.compare(body.password, row.PasswordHash) : false;
  if (!okPw) throw new AppError(401, 'Email hoặc mật khẩu không đúng');
  if (row.Status === 'Locked') throw new AppError(403, 'Tài khoản của bạn đã bị khóa');
  const { PasswordHash, ...user } = row; // eslint-disable-line no-unused-vars
  return { user, token: signToken(user.UserID) };
}

/* =====================================================================
   ĐĂNG NHẬP BẰNG GOOGLE (Google Identity Services)
   Frontend nhận ID token (credential) từ Google và gửi lên đây. Backend TỰ xác minh token
   (chữ ký, audience = GOOGLE_CLIENT_ID, issuer, hạn dùng) — không tin dữ liệu do client tự khai.
   Quy tắc:
   - Đã liên kết GoogleId  -> đăng nhập.
   - Email đã có tài khoản (đăng ký bằng email/mật khẩu) -> tự liên kết Google vào tài khoản đó (Google đã xác minh email).
   - Chưa có tài khoản     -> tạo mới (nếu GOOGLE_ALLOW_SIGNUP=true), không có mật khẩu.
   ===================================================================== */
export async function googleLogin(body) {
  if (!googleConfigured()) throw new AppError(503, 'Đăng nhập bằng Google chưa được cấu hình trên máy chủ');
  const credential = typeof body.credential === 'string' ? body.credential : '';
  if (!credential || credential.length > 4096) throw new AppError(400, 'Thiếu thông tin đăng nhập Google');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.google.clientId });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('[google] verifyIdToken:', err.message);
    throw new AppError(401, 'Không xác minh được tài khoản Google. Vui lòng thử lại.');
  }
  if (!payload?.sub || !payload.email) throw new AppError(401, 'Tài khoản Google không có email hợp lệ');
  if (!payload.email_verified) throw new AppError(401, 'Email Google chưa được xác minh');

  const email = payload.email.toLowerCase();
  const googleId = String(payload.sub);
  const pool = await getPool();

  let row = (await exec(pool, 'SELECT UserID, Status, GoogleId FROM dbo.Users WHERE GoogleId = @gid', { gid: googleId })).recordset[0];
  if (!row) {
    row = (await exec(pool, 'SELECT UserID, Status, GoogleId FROM dbo.Users WHERE Email = @email', { email })).recordset[0];
    if (row) {
      if (row.GoogleId && row.GoogleId !== googleId) throw new AppError(409, 'Email này đã được liên kết với một tài khoản Google khác');
      if (row.Status !== 'Locked') {
        await exec(pool, 'UPDATE dbo.Users SET GoogleId = @gid WHERE UserID = @id AND GoogleId IS NULL', { gid: googleId, id: row.UserID });
      }
    } else {
      if (!env.google.allowSignup) throw new AppError(403, 'Chưa có tài khoản ứng với email Google này. Hãy đăng ký trước.');
      const name = String(payload.name || email.split('@')[0]).trim().slice(0, 100) || 'Người dùng';
      const ins = await exec(pool, `INSERT INTO dbo.Users (FullName, Email, PasswordHash, GoogleId, Role)
        OUTPUT INSERTED.UserID, INSERTED.Status VALUES (@name, @email, NULL, @gid, N'User')`, { name, email, gid: googleId });
      row = ins.recordset[0];
      await exec(pool, 'DELETE FROM dbo.PendingRegistrations WHERE Email = @email', { email }); // hủy yêu cầu đăng ký dở (nếu có)
    }
  }
  if (row.Status === 'Locked') throw new AppError(403, 'Tài khoản của bạn đã bị khóa');
  const user = await getUserById(pool, row.UserID);
  return { user, token: signToken(user.UserID) };
}

/* ===================================================================== */
export async function updateProfile(userId, body) {
  const fullName = v.str(body.fullName, 'Họ tên', { max: 100 });
  const phone = v.phone(body.phone, { optional: true });
  const address = v.str(body.address, 'Địa chỉ', { optional: true, max: 300 });
  const pool = await getPool();
  await exec(pool, 'UPDATE dbo.Users SET FullName=@fullName, Phone=@phone, Address=@address WHERE UserID=@id',
    { fullName, phone, address, id: userId });
  return getUserById(pool, userId);
}

export async function changePassword(userId, body) {
  const newPassword = v.password(body.newPassword, 'Mật khẩu mới');
  const pool = await getPool();
  const row = (await exec(pool, 'SELECT PasswordHash FROM dbo.Users WHERE UserID=@id', { id: userId })).recordset[0];
  if (!row.PasswordHash) throw new AppError(400, 'Tài khoản này đăng nhập bằng Google nên chưa có mật khẩu để đổi');
  if (!(await bcrypt.compare(String(body.currentPassword || ''), row.PasswordHash))) {
    throw new AppError(400, 'Mật khẩu hiện tại không đúng');
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await exec(pool, 'UPDATE dbo.Users SET PasswordHash=@hash WHERE UserID=@id', { hash, id: userId });
}
