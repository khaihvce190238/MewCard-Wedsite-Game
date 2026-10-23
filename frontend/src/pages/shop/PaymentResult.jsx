import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errMsg, fmtMoney } from '../../services/api';
import { Loading, ErrorBox, Badge } from '../../components/ui';

/** Hiển thị kết quả LẤY TỪ BACKEND. Với VNPay, backend xác minh chữ ký/số tiền/mã giao dịch trước khi ghi nhận. */
export default function PaymentResult() {
  const [sp] = useSearchParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        let orderId = sp.get('orderId');
        if (sp.get('vnp_SecureHash')) {
          const query = Object.fromEntries(sp.entries());
          orderId = (await api.get('/payments/vnpay/return', { params: query })).data.data.orderId;
        }
        const r = (await api.get(`/payments/order/${orderId}`)).data.data;
        setState({ loading: false, ...r });
      } catch (e) { setState({ loading: false, error: errMsg(e) }); }
    })();
  }, [sp]);

  if (state.loading) return <Loading text="Đang xác minh thanh toán..." />;
  if (state.error) return <div><ErrorBox message={state.error} /><Link className="btn" to="/orders">Xem đơn hàng</Link></div>;
  const { order } = state;
  const paid = order.PaymentStatus === 'Paid';
  return (
    <div className="form-card center-text">
      <h1>{paid ? '✅ Thanh toán thành công' : '❌ Thanh toán chưa thành công'}</h1>
      <p>Đơn #{order.OrderID} · {fmtMoney(order.TotalAmount)}</p>
      <p>Thanh toán: <Badge kind="payment" value={order.PaymentStatus} /> · Đơn: <Badge value={order.Status} /></p>
      {!paid && order.Status === 'Cancelled' && <p className="muted">Đơn đã bị hủy và hàng được hoàn lại kho. Bạn có thể đặt lại từ giỏ hàng.</p>}
      <div className="row gap center">
        <Link className="btn btn-primary" to={`/orders/${order.OrderID}`}>Xem đơn hàng</Link>
        <Link className="btn" to="/shop">Tiếp tục mua sắm</Link>
      </div>
    </div>
  );
}
