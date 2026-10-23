import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { fmtDate, fmtMoney } from '../../services/api';
import { Loading, ErrorBox, PageHeader, Badge } from '../../components/ui';
import { ORDER_STATUS } from '../../utils/labels';

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/admin/dashboard');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const c = data.counts;
  const stats = [
    ['Người dùng', c.Users], ['Chủ đề', c.Topics], ['Lá bài', c.Cards], ['Lượt rút bài', c.Draws],
    ['Sản phẩm', c.Products], ['Đơn hàng', c.Orders], ['Thành viên', c.Members], ['Doanh thu (đã thanh toán)', fmtMoney(c.Revenue)],
  ];
  return (
    <div>
      <PageHeader title="Tổng quan" />
      <div className="stats">{stats.map(([k, v]) => <div key={k} className="stat"><small>{k}</small><strong>{v}</strong></div>)}</div>
      {(c.CancelRequests > 0 || c.PendingMemberships > 0) && (
        <div className="notice">
          {c.CancelRequests > 0 && <span><Link to="/admin/orders">{c.CancelRequests} yêu cầu hủy đơn</Link> đang chờ duyệt. </span>}
          {c.PendingMemberships > 0 && <span><Link to="/admin/memberships">{c.PendingMemberships} yêu cầu thành viên</Link> đang chờ duyệt.</span>}
        </div>
      )}
      <div className="two-col">
        <div className="panel"><h2>Đơn hàng theo trạng thái</h2>
          {data.ordersByStatus.length ? data.ordersByStatus.map((s) => <div key={s.Status} className="row between"><span>{ORDER_STATUS[s.Status]}</span><strong>{s.N}</strong></div>) : <p className="muted">Chưa có đơn hàng</p>}
        </div>
        <div className="panel"><h2>Sản phẩm sắp hết hàng</h2>
          {data.lowStock.length ? data.lowStock.map((p) => <div key={p.ProductID} className="row between"><span>{p.Name}</span><strong>{p.StockQuantity}</strong></div>) : <p className="muted">Không có</p>}
        </div>
        <div className="panel"><h2>Đơn hàng gần đây</h2>
          {data.recentOrders.length ? data.recentOrders.map((o) => (
            <div key={o.OrderID} className="row between"><span>#{o.OrderID} · {o.FullName}<br /><small className="muted">{fmtDate(o.CreatedAt)}</small></span><span><Badge value={o.Status} /> {fmtMoney(o.TotalAmount)}</span></div>
          )) : <p className="muted">Chưa có đơn hàng</p>}
        </div>
        <div className="panel"><h2>Lá bài được rút nhiều nhất</h2>
          {data.topCards.length ? data.topCards.map((x) => <div key={x.Name} className="row between"><span>{x.Name}</span><strong>{x.Draws}</strong></div>) : <p className="muted">Chưa có lượt rút</p>}
        </div>
      </div>
    </div>
  );
}
