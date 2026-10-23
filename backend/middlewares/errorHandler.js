import { AppError } from '../utils/AppError.js';
import { discardUploads } from './upload.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Không tìm thấy đường dẫn' });
}

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (req.file || req.files) discardUploads(req);

  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }
  if (err?.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh vượt quá dung lượng cho phép' : 'Upload ảnh không hợp lệ';
    return res.status(400).json({ success: false, message: msg });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON gửi lên không hợp lệ' });
  }
  if (err?.status === 413) return res.status(413).json({ success: false, message: 'Dữ liệu gửi lên quá lớn' });
  const n = err?.number ?? err?.originalError?.info?.number;
  if (n === 2627 || n === 2601) return res.status(409).json({ success: false, message: 'Dữ liệu bị trùng hoặc thao tác đã được thực hiện' });
  if (n === 547) return res.status(409).json({ success: false, message: 'Dữ liệu không hợp lệ hoặc đang được tham chiếu bởi dữ liệu khác' });

  console.error('[error]', err);
  res.status(500).json({ success: false, message: 'Lỗi máy chủ, vui lòng thử lại sau' });
}
