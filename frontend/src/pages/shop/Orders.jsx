import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { fmtDate, fmtMoney } from '../../services/api';
import { Loading, ErrorBox, Empty, PageHeader, Pagination, Badge } from '../../components/ui';

export default function Orders() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/orders/my', { page });
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader title="Đơn hàng của tôi" />
      {!data.length ? <Empty text="Bạn chưa có đơn hàng nào."><Link className="btn btn-primary" to="/shop">Đi mua sắm</Link></Empty> : (
        <div className="list">
          {data.map((o) => (
            <Link key={o.OrderID} to={`/orders/${o.OrderID}`} className="list-item">
              <div className="grow">
                <h3>Đơn #{o.OrderID}</h3>
                <small className="muted">{fmtDate(o.CreatedAt)} · {o.Items.length} sản phẩm</small>
              </div>
              <Badge value={o.Status} /><Badge kind="payment" value={o.PaymentStatus} /><strong>{fmtMoney(o.TotalAmount)}</strong>
            </Link>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
