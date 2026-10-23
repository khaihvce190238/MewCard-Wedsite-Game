import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg, fmtMoney } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox } from '../../components/ui';

export default function ProductDetail() {
  const { id } = useParams();
  const { data: p, loading, error, reload } = useFetch(`/products/${id}`);
  const { user } = useAuth();
  const { refresh } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error) return <div><ErrorBox message={error} onRetry={reload} /><Link className="btn" to="/shop">← Về cửa hàng</Link></div>;

  const add = async () => {
    if (!user) return nav('/login', { state: { from: `/shop/${id}` } });
    setBusy(true);
    try { await api.post('/cart/items', { productId: p.ProductID, quantity: qty }); await refresh(); toast.success('Đã thêm vào giỏ hàng'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="detail">
      <img className="detail-img" src={assetUrl(p.ImageURL)} alt={p.Name} />
      <div>
        <Link to="/shop" className="muted">← Cửa hàng</Link>
        <h1>{p.Name}</h1>
        {p.TopicName && <p className="muted">Chủ đề: {p.TopicName}</p>}
        <p className="price big">{fmtMoney(p.Price)}</p>
        <p>{p.Description}</p>
        <p className={p.StockQuantity > 0 ? 'muted' : 'text-bad'}>{p.StockQuantity > 0 ? `Còn ${p.StockQuantity} sản phẩm` : 'Hết hàng'}</p>
        {p.StockQuantity > 0 && (
          <div className="row gap">
            <input type="number" min="1" max={Math.min(99, p.StockQuantity)} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} />
            <button className="btn btn-primary" onClick={add} disabled={busy}>{busy ? 'Đang thêm...' : 'Thêm vào giỏ'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
