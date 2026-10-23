import { AppError } from './AppError.js';

export function str(value, label, { min = 1, max = 255, optional = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (optional) return null;
    throw new AppError(400, `${label} không được để trống`);
  }
  const s = String(value).trim();
  if (s.length < min) throw new AppError(400, `${label} phải có ít nhất ${min} ký tự`);
  if (s.length > max) throw new AppError(400, `${label} tối đa ${max} ký tự`);
  return s;
}

export function email(value) {
  const s = str(value, 'Email', { max: 255 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new AppError(400, 'Email không hợp lệ');
  return s;
}

export function password(value, label = 'Mật khẩu') {
  if (typeof value !== 'string' || value.length < 8) throw new AppError(400, `${label} phải có ít nhất 8 ký tự`);
  if (value.length > 72) throw new AppError(400, `${label} tối đa 72 ký tự`);
  return value;
}

export function phone(value, { optional = false } = {}) {
  const s = str(value, 'Số điện thoại', { optional, max: 20 });
  if (s === null) return null;
  if (!/^[0-9+\-\s]{8,20}$/.test(s)) throw new AppError(400, 'Số điện thoại không hợp lệ');
  return s;
}

export function int(value, label, { min = 1, max = 2147483647 } = {}) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new AppError(400, `${label} không hợp lệ`);
  return n;
}

export function money(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 9999999999) throw new AppError(400, `${label} không hợp lệ`);
  return Math.round(n * 100) / 100;
}

export function bool(value, label) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  throw new AppError(400, `${label} phải là true/false`);
}

export function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new AppError(400, `${label} không hợp lệ (cho phép: ${allowed.join(', ')})`);
  return value;
}

export function paging(query, { defaultSize = 10, maxSize = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export const pageMeta = (p, total) => ({
  pagination: { page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) },
});

export const likeParam = (q) => `%${String(q).trim().replace(/[%_\[]/g, (c) => `[${c}]`)}%`;
