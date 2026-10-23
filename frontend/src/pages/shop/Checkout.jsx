import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, errMsg, fmtMoney } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, Field } from '../../components/ui';

export default function Checkout() {
  const { user } = useAuth();
  const { refresh } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const cart = useFetch('/cart');
  const cfg = useFetch('/payments/config');
  const [f, setF] = useState({ shippingName: user.FullName, shippingPhone: user.Phone || '', shippingAddress: user.Address || '', paymentMethod: 'Mock' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (cart.loading || cfg.loading) return <Loading />;
  if (cart.error) return <ErrorBox message={cart.error} onRetry={cart.reload} />;
  if (!cart.data.items.length) return <Empty text="Giỏ hàng trống."><Link className="btn" to="/shop">Về cửa hàng</Link></Empty>;
  if (cart.data.hasProblem) return <Empty text="Giỏ hàng có sản phẩm không hợp lệ."><Link className="btn" to="/cart">Quay lại giỏ hàng</Link></Empty>;

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!f.shippingName.trim()) er.shippingName = 'Nhập tên người nhận';
    if (!/^[0-9+\-\s]{8,20}$/.test(f.shippingPhone)) er.shippingPhone = 'Số điện thoại không hợp lệ';
    if (f.shippingAddress.trim().length < 5) er.shippingAddress = 'Nhập địa chỉ nhận hàng';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    let order;
    try {
      order = (await api.post('/orders', f)).data.data; // backend tính lại giá & tổng tiền
      await refresh();
    } catch (err) { toast.error(errMsg(err)); setBusy(false); return; }
    try {
      if (f.paymentMethod === 'VNPay') {
        const r = (await api.post('/payments/vnpay/create', { orderId: order.OrderID })).data.data;
        window.location.href = r.paymentUrl; return;
      }
      nav(`/payment/mock/${order.OrderID}`);
    } catch (err) {
      toast.error(errMsg(err));
      nav(`/orders/${order.OrderID}`); // đơn đã tạo; có thể thanh toán lại từ trang đơn hàng
    }
  };
  const vnOk = cfg.data?.vnpayConfigured;
  return (
    <form className="two-col" onSubmit={submit} noValidate>
      <div className="panel">
        <h1>Thông tin nhận hàng</h1>
        <Field label="Người nhận" error={errors.shippingName}><input value={f.shippingName} onChange={set('shippingName')} /></Field>
        <Field label="Số điện thoại" error={errors.shippingPhone}><input value={f.shippingPhone} onChange={set('shippingPhone')} /></Field>
        <Field label="Địa chỉ" error={errors.shippingAddress}><input value={f.shippingAddress} onChange={set('shippingAddress')} /></Field>
        <h2>Phương thức thanh toán</h2>
        <label className="radio"><input type="radio" name="pm" checked={f.paymentMethod === 'Mock'} onChange={() => setF({ ...f, paymentMethod: 'Mock' })} /> Thanh toán giả lập (chỉ để demo/kiểm thử)</label>
        <label className={`radio ${vnOk ? '' : 'is-disabled'}`}>
          <input type="radio" name="pm" disabled={!vnOk} checked={f.paymentMethod === 'VNPay'} onChange={() => setF({ ...f, paymentMethod: 'VNPay' })} /> VNPay (sandbox)
          {!vnOk && <small className="text-bad"> — chưa được cấu hình trên máy chủ</small>}
        </label>
      </div>
      <div className="panel">
        <h2>Đơn hàng</h2>
        {cart.data.items.map((i) => <div key={i.CartItemID} className="row between"><span>{i.Name} × {i.Quantity}</span><span>{fmtMoney(i.LineTotal)}</span></div>)}
        <hr />
        <div className="row between"><strong>Tổng cộng</strong><strong className="price">{fmtMoney(cart.data.totalAmount)}</strong></div>
        <p className="muted">Hàng được giữ ngay khi đặt. Đơn chưa thanh toán sau một thời gian sẽ tự hủy và hoàn kho.</p>
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Đang xử lý...' : 'Đặt hàng & thanh toán'}</button>
      </div>
    </form>
  );
}
