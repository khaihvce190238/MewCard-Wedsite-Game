import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg, fmtDate, fmtMoney } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Badge, Modal, Field } from '../../components/ui';
import { PAYMENT_METHOD } from '../../utils/labels';

export default function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useFetch(`/orders/my/${id}`);
  const toast = useToast();
  const nav = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <div><ErrorBox message={error} onRetry={reload} /><Link className="btn" to="/orders">← Đơn hàng</Link></div>;

  const requestCancel = async () => {
    setBusy(true);
    try { await api.post(`/orders/${id}/cancel-request`, { reason }); toast.success('Đã gửi yêu cầu hủy đơn'); setCancelOpen(false); reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const payNow = async () => {
    if (o.PaymentMethod === 'Mock') return nav(`/payment/mock/${o.OrderID}`);
    setBusy(true);
    try { window.location.href = (await api.post('/payments/vnpay/create', { orderId: o.OrderID })).data.data.paymentUrl; }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  const needsPay = o.Status === 'Pending' && ['Unpaid', 'Pending'].includes(o.PaymentStatus);
  return (
    <div>
      <Link to="/orders" className="muted">← Đơn hàng</Link>
      <div className="page-header"><h1>Đơn #{o.OrderID}</h1><div className="row gap"><Badge value={o.Status} /><Badge kind="payment" value={o.PaymentStatus} /></div></div>
      <div className="two-col">
        <div className="panel">
          <h2>Sản phẩm</h2>
          {o.Items.map((i) => (
            <div key={i.OrderItemID} className="list-item">
              <img className="thumb" src={assetUrl(i.ImageURL)} alt={i.ProductName} />
              <div className="grow"><strong>{i.ProductName}</strong><br /><small className="muted">{fmtMoney(i.UnitPrice)} × {i.Quantity}</small></div>
              <strong>{fmtMoney(i.UnitPrice * i.Quantity)}</strong>
            </div>
          ))}
          <div className="row between"><strong>Tổng cộng</strong><strong className="price">{fmtMoney(o.TotalAmount)}</strong></div>
        </div>
        <div className="panel">
          <h2>Giao hàng & thanh toán</h2>
          <p>{o.ShippingName} · {o.ShippingPhone}<br />{o.ShippingAddress}</p>
          <p className="muted">Đặt lúc {fmtDate(o.CreatedAt)} · {PAYMENT_METHOD[o.PaymentMethod]}</p>
          {o.CancelReason && <p>Lý do hủy: {o.CancelReason}</p>}
          {o.AdminNote && <div className="notice">Ghi chú từ cửa hàng: {o.AdminNote}</div>}
          {o.Status === 'CancellationRequested' && <div className="notice">Yêu cầu hủy đang chờ Admin xét duyệt.</div>}
          {o.Status === 'CancellationRejected' && <div className="notice">Yêu cầu hủy đã bị từ chối, đơn tiếp tục được xử lý.</div>}
          {o.Status === 'Cancelled' && o.PaymentStatus === 'Paid' && <div className="notice">Đơn đã hủy. Cửa hàng sẽ hoàn tiền thủ công và cập nhật trạng thái “Đã hoàn tiền”.</div>}
          <div className="row gap">
            {needsPay && <button className="btn btn-primary" onClick={payNow} disabled={busy}>Thanh toán ngay</button>}
            {o.CanRequestCancel && <button className="btn" onClick={() => setCancelOpen(true)}>Yêu cầu hủy đơn</button>}
          </div>
        </div>
      </div>
      {cancelOpen && (
        <Modal title="Yêu cầu hủy đơn" onClose={() => setCancelOpen(false)}>
          <p>Admin sẽ xem xét yêu cầu. Đơn chỉ bị hủy khi Admin duyệt.</p>
          <Field label="Lý do (tùy chọn)"><textarea rows="3" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="row gap"><button className="btn btn-primary" onClick={requestCancel} disabled={busy}>Gửi yêu cầu</button><button className="btn" onClick={() => setCancelOpen(false)}>Đóng</button></div>
        </Modal>
      )}
    </div>
  );
}
