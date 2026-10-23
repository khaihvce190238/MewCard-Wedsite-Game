import fs from 'node:fs';
import multer from 'multer';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

// Đuôi file lấy từ mimetype đã whitelist, KHÔNG lấy từ tên file do client gửi.
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.uploadDir),
  // Tên duy nhất (UUID) => không bao giờ ghi đè ảnh cũ => snapshot lịch sử luôn trỏ đúng ảnh.
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${EXT[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new AppError(400, 'Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF')),
});

export const uploadCardImages = upload.fields([{ name: 'front', maxCount: 1 }, { name: 'back', maxCount: 1 }]);
export const uploadSingleImage = upload.single('image');

export const fileUrl = (file) => (file ? `/uploads/${file.filename}` : null);

/** Xóa các file vừa upload trong request bị lỗi (chỉ file mới, không đụng ảnh cũ). */
export function discardUploads(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) Object.values(req.files).forEach((arr) => files.push(...arr));
  files.forEach((f) => fs.unlink(f.path, () => {}));
}
