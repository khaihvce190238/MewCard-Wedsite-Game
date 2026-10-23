import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg, fmtMoney } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader } from '../../components/ui';

export default function Cart() {
  const { data, loading, error, reload } = useFetch('/cart');
  const { refresh } = useCart();
  const toast = useToast();
  const act = async (fn) => { try { await fn(); await refresh(); reload(); } catch (e) { toast.error(errMsg(e)); } };
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data.items.length) return <Empty text="Giỏ hàng của bạn đang trống."><Link className="btn btn-primary" to="/shop">Đi mua sắm</Link></Empty>;
  return (
    <div>
      <PageHeader title="Giỏ hàng" />
      <div className="list">
        {data.items.map((i) => (
          <article key={i.CartItemID} className={`list-item ${i.Available ? '' : 'is-disabled'}`}>
            <img className="thumb" src={assetUrl(i.ImageURL)} alt={i.Name} />
            <div className="grow">
              <h3>{i.Name}</h3>
              <span>{fmtMoney(i.Price)}</span>
              {i.Problem && <div className="notice">{i.Problem}</div>}
            </div>
            <input type="number" min="1" max="99" value={i.Quantity} style={{ width: 70 }} aria-label={`Số lượng ${i.Name}`}
              onChange={(e) => act(() => api.patch(`/cart/items/${i.CartItemID}`, { quantity: Number(e.target.value) }))} />
            <strong>{fmtMoney(i.LineTotal)}</strong>
            <button className="btn" onClick={() => act(() => api.delete(`/cart/items/${i.CartItemID}`))}>Xóa</button>
          </article>
        ))}
      </div>
      <div className="summary">
        <span>Tổng tiền (tính bởi máy chủ)</span><strong className="price big">{fmtMoney(data.totalAmount)}</strong>
        {data.hasProblem ? <small className="text-bad">Vui lòng xử lý các sản phẩm có cảnh báo trước khi thanh toán</small>
          : <Link className="btn btn-primary" to="/checkout">Tiến hành đặt hàng</Link>}
      </div>
    </div>
  );
}
