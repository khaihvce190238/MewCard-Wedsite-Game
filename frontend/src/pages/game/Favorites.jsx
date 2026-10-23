import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl, errMsg } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Loading, ErrorBox, Empty, PageHeader } from '../../components/ui';

export default function Favorites() {
  const { data, loading, error, reload } = useFetch('/favorites');
  const toast = useToast();
  const remove = async (id) => {
    try { await api.delete(`/favorites/${id}`); toast.success('Đã xóa khỏi yêu thích'); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader title="Lá bài yêu thích" />
      {!data.length ? <Empty text="Chưa có lá bài yêu thích nào." /> : (
        <div className="grid grid-sm">
          {data.map((c) => (
            <article key={c.CardID} className={`card ${c.CardIsActive ? '' : 'is-disabled'}`}>
              <img src={assetUrl(c.FrontImageURL)} alt={c.Name} />
              <div className="card-body">
                <h3>{c.Name}</h3>
                <p>{c.Description}</p>
                <small className="muted">{c.TopicName}</small>
                {!c.CardIsActive && <div className="notice">Lá bài này hiện đã bị ẩn khỏi trò chơi</div>}
                <button className="btn" onClick={() => remove(c.CardID)}>Xóa khỏi yêu thích</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
