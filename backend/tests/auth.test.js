import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCode, hashCode, verifyCodeHash, checkResendAllowed, checkVerification } from '../utils/verificationCode.js';
import { buildVerificationEmail } from '../utils/emailTemplates.js';

const SECRET = 'unit-test-secret-0123456789';
const cfg = { resendCooldownSeconds: 60, maxSendsPerHour: 5 };

test('generateCode: luôn 6 chữ số', () => {
  for (let i = 0; i < 500; i++) assert.match(generateCode(), /^\d{6}$/);
});

test('hash mã: đúng mã/đúng email mới khớp', () => {
  const h = hashCode('a@x.com', '123456', SECRET);
  assert.ok(verifyCodeHash('a@x.com', '123456', SECRET, h));
  assert.ok(verifyCodeHash('A@X.com', '123456', SECRET, h), 'email không phân biệt hoa thường');
  assert.ok(!verifyCodeHash('a@x.com', '654321', SECRET, h));
  assert.ok(!verifyCodeHash('b@x.com', '123456', SECRET, h));
  assert.ok(!verifyCodeHash('a@x.com', '123456', 'other-secret-0123456789', h));
  assert.ok(!verifyCodeHash('a@x.com', '123456', SECRET, 'khong-phai-hex'));
});

test('checkVerification: các trường hợp', () => {
  const opt = { email: 'a@x.com', code: '123456', secret: SECRET, maxAttempts: 5 };
  const row = (o = {}) => ({ Expired: 0, Attempts: 0, CodeHash: hashCode('a@x.com', '123456', SECRET), ...o });
  assert.equal(checkVerification(undefined, opt).ok, false);
  assert.match(checkVerification(row({ Expired: 1 }), opt).message, /hết hạn/);
  assert.equal(checkVerification(row({ Attempts: 5 }), opt).status, 429);
  assert.ok(checkVerification(row(), opt).ok);
  const bad = checkVerification(row(), { ...opt, code: '000000' });
  assert.equal(bad.ok, false);
  assert.ok(bad.incrementAttempts);
  assert.match(bad.message, /còn 4 lần/);
  const last = checkVerification(row({ Attempts: 4 }), { ...opt, code: '000000' });
  assert.equal(last.status, 429);
  assert.ok(last.incrementAttempts);
  // mã đúng nhưng đã hết lượt thử thì vẫn bị chặn (không cho brute-force)
  assert.equal(checkVerification(row({ Attempts: 5 }), opt).ok, false);
});

test('checkResendAllowed: cooldown và giới hạn mỗi giờ', () => {
  assert.ok(checkResendAllowed(undefined, cfg).ok);
  const r1 = checkResendAllowed({ SecondsSinceLast: 10, Fresh: 1, SendCount: 1 }, cfg);
  assert.equal(r1.ok, false);
  assert.match(r1.message, /50 giây/);
  assert.ok(checkResendAllowed({ SecondsSinceLast: 61, Fresh: 1, SendCount: 2 }, cfg).ok);
  assert.equal(checkResendAllowed({ SecondsSinceLast: 61, Fresh: 1, SendCount: 5 }, cfg).ok, false);
  assert.ok(checkResendAllowed({ SecondsSinceLast: 61, Fresh: 0, SendCount: 5 }, cfg).ok, 'quá 1 giờ thì được làm mới');
});

test('email: escape HTML trong tên, chứa mã', () => {
  const m = buildVerificationEmail({ name: '<script>alert(1)</script>', code: '123456', ttlMinutes: 10 });
  assert.ok(!m.html.includes('<script>'));
  assert.ok(m.html.includes('&lt;script&gt;'));
  assert.ok(m.html.includes('123456') && m.text.includes('123456'));
});
