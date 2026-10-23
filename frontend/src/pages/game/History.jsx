import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg, fmtDate } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader, Pagination } from '../../components/ui';

export default function History() {
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch('/draw/history', { page });
  const toast = useToast();
  const fav = async (row) => {
    try { await api.post(`/favorites/${row.CardID}`); toast.success('Đã thêm vào yêu thích'); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader title="Lịch sử rút bài" />
      <p className="muted">Nội dung hiển thị đúng như lúc bạn rút, kể cả khi Admin đã sửa hoặc ẩn lá bài sau đó.</p>
      {!data.length ? <Empty text="Bạn chưa rút lá bài nào." /> : (
        <div className="list">
          {data.map((r) => (
            <article key={r.DrawID} className="list-item">
              <img className="thumb" src={assetUrl(r.FrontImageURLSnapshot)} alt={r.CardNameSnapshot} />
              <div className="grow">
                <h3>{r.CardNameSnapshot}</h3>
                <p>{r.CardDescriptionSnapshot}</p>
                <small className="muted">{r.TopicName} · Vòng {r.RoundNumber} · {fmtDate(r.DrawnAt)}</small>
              </div>
              {r.CardIsActive === false || r.CardIsActive === null ? <small className="muted">Lá bài không còn khả dụng</small>
                : <button className="btn" disabled={r.IsFavorite} onClick={() => fav(r)}>{r.IsFavorite ? '♥ Đã thích' : '♡ Yêu thích'}</button>}
            </article>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
