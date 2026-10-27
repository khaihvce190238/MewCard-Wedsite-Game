import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { useTopicPreviews } from '../hooks/useTopicPreviews';
import { assetUrl } from '../services/api';
import { Loading, ErrorBox, Empty } from '../components/ui';
import TopicCard from '../components/TopicCard';
import logo from '../assets/logo.png';

export default function Home() {
  const { data, loading, error, reload } = useFetch('/topics');
  const topics = data || [];
  const previews = useTopicPreviews(topics);

  // Lá bài ở hero: một lá thật của chủ đề đầu tiên (mặt sau + mặt trước). Chưa có dữ liệu thì dùng logo.
  const heroCard = previews[topics[0]?.TopicID]?.[0];
  const heroBackSrc = heroCard ? assetUrl(heroCard.back) : logo;
  const heroFrontSrc = heroCard ? assetUrl(heroCard.front) : logo;

  const toTopics = (e) => {
    const el = document.getElementById('topics');
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <section className="hero">
        <div className="hero-card" aria-hidden="true">
          <div className="halo">
            <div className="tc">
              <div className="tc-inner">
                <img className={`tc-face ${heroCard ? '' : 'tc-face--logo'}`} src={heroBackSrc} alt="" />
                <img className={`tc-face tc-front ${heroCard ? '' : 'tc-face--logo'}`} src={heroFrontSrc} alt="" />
              </div>
            </div>
          </div>
        </div>
        <h1>Chào mừng đến với MewCard</h1>
        <p>Hôm nay bạn thế nào? Hãy để MewCard gợi ý giúp bạn!</p>
        <div className="row gap center wrap">
          <a className="btn btn-primary btn-lg" href="#topics" onClick={toTopics}>Chọn bộ bài</a>
          <Link className="btn btn-lg" to="/shop">Xem bộ bài thật</Link>
        </div>
      </section>

      <section id="topics" className="home-section" aria-labelledby="home-topics-title">
        <h2 id="home-topics-title">Chọn chủ đề</h2>
        <p>Di chuột vào bộ bài để xòe và lật thử các lá.</p>
        {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : !topics.length ? <Empty text="Hiện chưa có chủ đề nào." /> : (
          <div className="topic-grid">
            {topics.map((t, i) => <TopicCard key={t.TopicID} topic={t} previews={previews[t.TopicID]} index={i} />)}
          </div>
        )}
      </section>

      <section className="home-section home-about" aria-labelledby="home-about-title">
        <h2 id="home-about-title">MewCard là gì?</h2>
        <p>
          MewCard là bộ bài giúp bạn quyết định nhanh những chuyện nhỏ hằng ngày — ăn gì, đi đâu, làm gì — kèm một chút
          lời nhắn nhẹ nhàng để bạn chậm lại một nhịp. Chọn một chủ đề, rút từng lá bài và nhận gợi ý cho quyết định tiếp
          theo. Mỗi lá chỉ xuất hiện một lần trong mỗi vòng.
        </p>
      </section>
    </div>
  );
}
