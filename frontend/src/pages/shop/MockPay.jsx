import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtMoney } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox } from '../../components/ui';

export default function MockPay() {
  const { orderId } = useParams();
  const { data, loading, error, reload } = useFetch(`/orders/my/${orderId}`);
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const pay = async (outcome) => {
    setBusy(true);
    try { await api.post('/payments/mock', { orderId: Number(orderId), outcome }); nav(`/payment/result?orderId=${orderId}&provider=mock`); }
    catch (e) { toast.error(errMsg(e)); setBusy(false); }
  };
  return (
    <div className="form-card">
      <div className="notice">⚠ ĐÂY LÀ THANH TOÁN GIẢ LẬP — môi trường demo, không có giao dịch thật.</div>
      <h1>Thanh toán đơn #{data.OrderID}</h1>
      <p>Số tiền: <strong className="price">{fmtMoney(data.TotalAmount)}</strong></p>
      <button className="btn btn-primary" disabled={busy} onClick={() => pay('success')}>Giả lập: thanh toán THÀNH CÔNG</button>
      <button className="btn" disabled={busy} onClick={() => pay('failure')}>Giả lập: thanh toán THẤT BẠI</button>
      <Link to={`/orders/${orderId}`}>Thanh toán sau</Link>
    </div>
  );
}
