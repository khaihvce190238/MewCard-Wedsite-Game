import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { assetUrl } from '../../services/api';
import { Loading, ErrorBox, Empty, PageHeader } from '../../components/ui';

export default function Topics() {
  const { data, loading, error, reload } = useFetch('/topics');
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <div>
      <PageHeader title="Chọn chủ đề" />
      {!data.length ? <Empty text="Hiện chưa có chủ đề nào." /> : (
        <div className="grid">
          {data.map((t) => (
            <Link key={t.TopicID} to={`/play/${t.TopicID}`} className="card topic-card">
              <img src={assetUrl(t.ImageURL)} alt="" />
              <div className="card-body"><h3>{t.Name}</h3><p>{t.Description}</p><small className="muted">{t.CardCount} lá bài</small></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
