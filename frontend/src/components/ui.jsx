import { useEffect } from 'react';
import { ORDER_STATUS, PAYMENT_STATUS, MEMBER_STATUS, badgeTone } from '../utils/labels';

export const Loading = ({ text = 'Đang tải...' }) => <div className="state"><div className="spinner" />{text}</div>;

export const ErrorBox = ({ message, onRetry }) => (
  <div className="state state-error" role="alert">
    <p>{message}</p>
    {onRetry && <button className="btn" onClick={onRetry}>Thử lại</button>}
  </div>
);

export const Empty = ({ text = 'Chưa có dữ liệu', children }) => <div className="state state-empty"><p>{text}</p>{children}</div>;

export const PageHeader = ({ title, children }) => (
  <div className="page-header"><h1>{title}</h1><div className="row gap">{children}</div></div>
);

export function Badge({ value, kind }) {
  const dict = kind === 'payment' ? PAYMENT_STATUS : kind === 'member' ? MEMBER_STATUS : ORDER_STATUS;
  return <span className={`badge badge-${badgeTone(value)}`}>{dict[value] || value}</span>;
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>‹ Trước</button>
      <span>Trang {meta.page}/{meta.totalPages}</span>
      <button className="btn" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Sau ›</button>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><button className="btn btn-ghost" onClick={onClose} aria-label="Đóng">✕</button></div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, error, children }) => (
  <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>
);
