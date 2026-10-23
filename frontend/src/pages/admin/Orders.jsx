import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtDate, fmtMoney } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Modal, Field, Badge } from '../../components/ui';
import { ORDER_STATUS, PAYMENT_METHOD } from '../../utils/labels';

const ACTION = {
  Confirmed: 'Xác nhận đơn', Shipping: 'Bắt đầu giao hàng', Delivered: 'Đánh dấu đã giao',
  Cancelled: 'Hủy đơn / Duyệt yêu cầu hủy', CancellationRejected: 'Từ chối yêu cầu hủy',
};

export default function Orders() {
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [q, setQ] = useState(''); const [term, setTerm] = useState('');
  const { data, meta, loading, error, reload } = useFetch('/admin/orders', { status: status || undefined, q: term || undefined, page });
  const [dlg, setDlg] = useState(null); // {order, kind:'status'|'refund', to?}
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const open = (order, kind, to) => { setNote(''); setDlg({ order, kind, to }); };
  const confirm = async () => {
    setBusy(true);
    try {
      if (dlg.kind === 'refund') await api.patch(`/admin/orders/${dlg.order.OrderID}/refund`, { confirmed: true, note });
      else await api.patch(`/admin/orders/${dlg.order.OrderID}/status`, { status: dlg.to, note });
      toast.success('Đã cập nhật đơn hàng'); setDlg(null); reload();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <PageHeader title="Quản lý đơn hàng" />
      <form className="row gap wrap" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); }}>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input placeholder="Mã đơn / tên / email" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn">Tìm</button>
      </form>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Không có đơn hàng." /> : (
        <div className="list">
          {data.map((o) => (
            <article key={o.OrderID} className="panel">
              <div className="row between wrap">
                <h3>Đơn #{o.OrderID} · {o.UserFullName} <small className="muted">({o.UserEmail})</small></h3>
                <span className="row gap"><Badge value={o.Status} /><Badge kind="payment" value={o.PaymentStatus} /><strong>{fmtMoney(o.TotalAmount)}</strong></span>
              </div>
              <small className="muted">{fmtDate(o.CreatedAt)} · {PAYMENT_METHOD[o.PaymentMethod]}</small>
              <p>{o.Items.map((i) => `${i.ProductName} × ${i.Quantity} (${fmtMoney(i.UnitPrice)})`).join(' · ')}</p>
              <p>📦 {o.ShippingName} · {o.ShippingPhone} · {o.ShippingAddress}</p>
              {o.CancelReason && <div className="notice">Lý do khách muốn hủy: {o.CancelReason}</div>}
              {o.AdminNote && <small className="muted">Ghi chú: {o.AdminNote}</small>}
              <div className="row gap wrap">
                {o.AllowedNext.map((to) => (
                  <button key={to} className={`btn ${to === 'Cancelled' || to === 'CancellationRejected' ? '' : 'btn-primary'}`}
                    disabled={to === 'Confirmed' && o.PaymentStatus !== 'Paid'} title={to === 'Confirmed' && o.PaymentStatus !== 'Paid' ? 'Chỉ xác nhận đơn đã thanh toán' : ''}
                    onClick={() => open(o, 'status', to)}>{ACTION[to]}</button>
                ))}
                {o.Status === 'Cancelled' && o.PaymentStatus === 'Paid' && <button className="btn" onClick={() => open(o, 'refund')}>Đánh dấu đã hoàn tiền</button>}
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
      {dlg && (
        <Modal title={dlg.kind === 'refund' ? `Hoàn tiền đơn #${dlg.order.OrderID}` : `${ACTION[dlg.to]} · đơn #${dlg.order.OrderID}`} onClose={() => setDlg(null)}>
          {dlg.kind === 'refund'
            ? <p className="notice">Chỉ bấm xác nhận sau khi bạn ĐÃ hoàn tiền thật cho khách (ví dụ qua cổng VNPay merchant hoặc chuyển khoản). Hệ thống không tự hoàn tiền.</p>
            : dlg.to === 'Cancelled' ? <p>Đơn sẽ bị hủy và hàng được hoàn lại kho. Nếu đơn đã thanh toán, bạn cần hoàn tiền riêng.</p> : null}
          <Field label={dlg.kind === 'refund' ? 'Ghi chú hoàn tiền (bắt buộc)' : 'Ghi chú (tùy chọn)'}><textarea rows="3" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="row gap">
            <button className="btn btn-primary" onClick={confirm} disabled={busy || (dlg.kind === 'refund' && !note.trim())}>Xác nhận</button>
            <button className="btn" onClick={() => setDlg(null)}>Đóng</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
