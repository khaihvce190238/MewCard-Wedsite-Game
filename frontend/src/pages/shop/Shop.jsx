import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { assetUrl, fmtMoney } from '../../services/api';
import { Loading, ErrorBox, Empty, PageHeader, Pagination } from '../../components/ui';

export default function Shop() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/products', { q: term || undefined, page });
  const search = (e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); };
  return (
    <div>
      <PageHeader title="Cửa hàng bộ bài">
        <form className="row gap" onSubmit={search}>
          <input placeholder="Tìm sản phẩm..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn">Tìm</button>
        </form>
      </PageHeader>
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !data.length ? <Empty text="Không tìm thấy sản phẩm nào." /> : (
        <div className="grid">
          {data.map((p) => (
            <Link key={p.ProductID} to={`/shop/${p.ProductID}`} className="card">
              <img src={assetUrl(p.ImageURL)} alt={p.Name} />
              <div className="card-body">
                <h3>{p.Name}</h3>
                <strong className="price">{fmtMoney(p.Price)}</strong>
                <small className={p.StockQuantity > 0 ? 'muted' : 'text-bad'}>{p.StockQuantity > 0 ? `Còn ${p.StockQuantity} sản phẩm` : 'Hết hàng'}</small>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
