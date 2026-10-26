import { Link } from 'react-router-dom';
import { assetUrl } from '../services/api';
import logo from '../assets/logo.png';

/**
 * Thẻ chủ đề: ba lá bài xếp nan quạt, mỗi lá có mặt sau + mặt trước thật của lá bài.
 * Hover để xòe quạt và lật cả ba lá (lần lượt) lộ mặt trước.
 * `previews`: [{ front, back }] (tối đa 3); thiếu thì lặp lại, không có thì dùng logo.
 */
export default function TopicCard({ topic, previews = [], index = 0 }) {
  const cards = [0, 1, 2].map((i) => (previews.length ? previews[i % previews.length] : null));
  return (
    <Link to={`/play/${topic.TopicID}`} className="topic-tile" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="fan" aria-hidden="true">
        {cards.map((c, i) => (
          <div key={i} className="fan-card">
            <div className="tc">
              <div className="tc-inner">
                <img
                  className={`tc-face ${c ? '' : 'tc-face--logo'}`}
                  src={c ? assetUrl(c.back) : logo}
                  alt=""
                  loading="lazy"
                />
                <img
                  className={`tc-face tc-front ${c ? '' : 'tc-face--logo'}`}
                  src={c ? assetUrl(c.front) : logo}
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <h3>{topic.Name}</h3>
      {topic.Description && <p>{topic.Description}</p>}
      <small className="topic-count">{topic.CardCount} lá bài</small>
    </Link>
  );
}
