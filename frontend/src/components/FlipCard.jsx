import { assetUrl } from '../services/api';

/** Lá bài lật bằng CSS 3D. flipped=false: mặt sau; flipped=true: mặt trước. */
export default function FlipCard({ front, back, flipped, alt = 'Lá bài', size = 'lg', onClick, instant = false }) {
  return (
    <div
      className={`flip flip-${size} ${flipped ? 'is-flipped' : ''} ${onClick ? 'is-clickable' : ''} ${instant ? 'no-anim' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      aria-label={onClick ? 'Phóng to lá bài' : undefined}
    >
      <div className="flip-inner">
        <img className="flip-face flip-back" src={assetUrl(back)} alt="Mặt sau lá bài" />
        <img className="flip-face flip-front" src={assetUrl(front)} alt={alt} />
      </div>
    </div>
  );
}
