import { useEffect, useState } from 'react';
import { assetUrl } from '../services/api';

/** Chọn ảnh + xem trước ngay (kể cả trước khi lưu). Kiểm tra loại/kích thước phía client để báo lỗi sớm (backend vẫn kiểm tra lại). */
export default function ImageField({ label, currentUrl, onChange, maxMb = 20 }) {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (!f) { setPreview(''); onChange(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) { setError('Chỉ nhận JPG, PNG, WEBP, GIF'); e.target.value = ''; return; }
    if (f.size > maxMb * 1024 * 1024) { setError(`Ảnh tối đa ${maxMb}MB`); e.target.value = ''; return; }
    setPreview(URL.createObjectURL(f));
    onChange(f);
  };
  const shown = preview || assetUrl(currentUrl);
  return (
    <div className="field">
      <span>{label}</span>
      <div className="img-field">
        {shown ? <img src={shown} alt={`Xem trước ${label}`} /> : <div className="img-placeholder">Chưa có ảnh</div>}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} />
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
