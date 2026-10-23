import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { assetUrl } from '../services/api';
import { Loading } from '../components/ui';

export default function Home() {
  const { data, loading } = useFetch('/topics');
  return (
    <div>
      <section className="hero">
        <h1>Khó chọn? Để lá bài giúp bạn.</h1>
        <p>Chọn một chủ đề, rút một lá bài và nhận gợi ý cho quyết định tiếp theo. Mỗi lá chỉ xuất hiện một lần trong mỗi vòng.</p>
        <div className="row gap center">
          <Link className="btn btn-primary" to="/topics">Bắt đầu rút bài</Link>
          <Link className="btn" to="/shop">Xem bộ bài thật</Link>
        </div>
      </section>
      <h2>Chủ đề nổi bật</h2>
      {loading ? <Loading /> : (
        <div className="grid">
          {(data || []).slice(0, 3).map((t) => (
            <Link key={t.TopicID} to={`/play/${t.TopicID}`} className="card topic-card">
              <img src={assetUrl(t.ImageURL)} alt="" /><div className="card-body"><h3>{t.Name}</h3><p>{t.Description}</p></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
