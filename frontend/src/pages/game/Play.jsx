import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, assetUrl, errMsg, leaveTopicKeepalive } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import FlipCard from '../../components/FlipCard';
import { Loading, ErrorBox } from '../../components/ui';

const newSessionId = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

const reduceMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const nextFrames = (n = 2) => new Promise((resolve) => {
  const step = (k) => requestAnimationFrame(() => (k <= 1 ? resolve() : step(k - 1)));
  step(n);
});
// Tải sẵn ảnh để lúc lật không bị trống/nhấp nháy.
const preload = (...urls) => Promise.all(urls.filter(Boolean).map((u) => new Promise((resolve) => {
  const img = new Image();
  img.onload = resolve; img.onerror = resolve;
  img.src = assetUrl(u);
})));

export default function Play() {
  const { topicId } = useParams();
  const id = Number(topicId);
  const nav = useNavigate();
  const toast = useToast();
  // Mỗi lượt vào trang = một sessionId mới. Backend dùng nó để biết vòng cũ đã bỏ dở.
  const sessionRef = useRef(newSessionId());
  const stageRef = useRef(null);   // khung chứa lá bài đang mở (để đo vị trí bắt đầu bay)
  const trayRef = useRef(null);    // thanh chứa các lá đã rút (đích đến)
  const cloneRef = useRef(null);   // bản sao ảnh đang bay (dọn khi rời trang)

  const [boot, setBoot] = useState({ loading: true, error: '' });
  const [topic, setTopic] = useState(null);
  const [progress, setProgress] = useState({ drawn: 0, remaining: 0, total: 0 });
  const [roundNo, setRoundNo] = useState(null);
  const [drawnList, setDrawnList] = useState([]);
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [instant, setInstant] = useState(false);   // tắt hiệu ứng trong 1 khung hình khi đặt lại lá úp
  const [dealKey, setDealKey] = useState(0);       // đổi key => lá úp mới "được chia" ra
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState('');
  const [fav, setFav] = useState(false);
  const [zoom, setZoom] = useState(null);          // lá bài đang phóng to (snapshot)
  const [idleBack, setIdleBack] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/topics/${id}/cards`)
      .then((r) => alive && setIdleBack(r.data.data.cards[0]?.BackImageURL || ''))
      .catch(() => { });
    api.post('/draw/start', { topicId: id, sessionId: sessionRef.current })
      .then((r) => {
        if (!alive) return;
        const d = r.data.data;
        setTopic(d.topic); setProgress(d.progress); setDrawnList(d.drawn || []);
        setRoundNo(d.round?.RoundNumber ?? null); setNotice(d.message || ''); setBoot({ loading: false, error: '' });
      })
      .catch((e) => alive && setBoot({ loading: false, error: errMsg(e) }));
    const onHide = () => leaveTopicKeepalive(id);
    window.addEventListener('pagehide', onHide);
    return () => {
      alive = false;
      window.removeEventListener('pagehide', onHide);
      cloneRef.current?.remove();
      leaveTopicKeepalive(id);
    };
  }, [id]);

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  /** Đặt lại khung chính thành một lá ÚP mới (không có hiệu ứng xoay ngược). */
  const resetStage = () => {
    flushSync(() => { setInstant(true); setFlipped(false); setCurrent(null); setDealKey((k) => k + 1); });
    requestAnimationFrame(() => setInstant(false));
  };

  /** Lá đang mở bay xuống mục "Các lá bài đã rút"; đồng thời lá úp mới xuất hiện tại chỗ cũ. */
  const flyToTray = (card) => new Promise((resolve) => {
    const from = stageRef.current?.getBoundingClientRect();
    flushSync(() => setDrawnList((l) => [...l, { ...card, _hidden: true }]));
    if (trayRef.current) trayRef.current.scrollLeft = trayRef.current.scrollWidth;
    const slot = document.querySelector(`[data-slot="${card.DrawID}"]`);
    const reveal = () => setDrawnList((l) => l.map((c) => (c.DrawID === card.DrawID ? { ...c, _hidden: false } : c)));
    if (!from || !slot || reduceMotion()) { resetStage(); reveal(); resolve(); return; }

    const to = slot.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src = assetUrl(card.FrontImageURLSnapshot);
    Object.assign(clone.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`,
      objectFit: 'contain', transformOrigin: 'top left', zIndex: '70', pointerEvents: 'none',
      borderRadius: '5%', boxShadow: '0 0 28px rgba(168,85,247,.55), 0 14px 30px rgba(0,0,0,.5)',
    });
    document.body.appendChild(clone);
    cloneRef.current = clone;
    resetStage(); // lá úp mới hiện ngay tại chỗ lá vừa rời đi

    const sx = to.width / from.width;
    const sy = to.height / from.height;
    const anim = clone.animate(
      [{ transform: 'translate(0, 0) scale(1, 1)' },
      { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${sx}, ${sy})` }],
      { duration: 650, easing: 'cubic-bezier(.5, 0, .2, 1)', fill: 'forwards' },
    );
    const done = () => { clone.remove(); cloneRef.current = null; reveal(); resolve(); };
    anim.onfinish = done;
    anim.oncancel = done;
  });

  const draw = useCallback(async () => {
    if (busy) return;
    setBusy(true); setNotice('');
    const prev = current && flipped ? current : null;
    const wasCompleted = completed;
    // Gửi yêu cầu ngay (chạy song song với hiệu ứng bay) — backend vẫn là nơi quyết định lá bài.
    const request = api.post('/draw', { topicId: id, sessionId: sessionRef.current }).then((r) => r.data.data);
    request.catch(() => { });
    try {
      if (wasCompleted) {
        // Vòng cũ đã xong: dọn khay và bắt đầu vòng mới.
        flushSync(() => { setDrawnList([]); setCompleted(false); });
        resetStage();
      } else if (prev) {
        await flyToTray(prev);
      }
      const r = await request;
      if (r.newRound && !wasCompleted) setDrawnList([]);
      setProgress(r.progress); setRoundNo(r.round.RoundNumber);
      if (!r.card) { setCompleted(true); setNotice(r.message || ''); return; }

      await preload(r.card.FrontImageURLSnapshot, r.card.BackImageURLSnapshot);
      setCurrent(r.card); setFav(false); setCompleted(r.completed);
      if (r.message) setNotice(r.message);
      await nextFrames(2);   // để lá úp được vẽ ra trước, rồi mới lật => lần nào cũng lật trọn vẹn
      setFlipped(true);
    } catch (e) {
      toast.error(errMsg(e)); setNotice(errMsg(e));
    } finally { setBusy(false); }
  }, [busy, completed, current, flipped, id, toast]);

  const addFav = async () => {
    try { await api.post(`/favorites/${current.CardID}`); setFav(true); toast.success('Đã thêm vào yêu thích'); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const leave = async () => {
    try { await api.post('/draw/leave', { topicId: id }); } catch { /* bỏ qua */ }
    nav('/topics');
  };

  if (boot.loading) return <Loading />;
  if (boot.error) return <div><ErrorBox message={boot.error} /><Link className="btn" to="/topics">← Chọn chủ đề khác</Link></div>;

  const pct = progress.total ? Math.round((progress.drawn / progress.total) * 100) : 0;
  const noCards = progress.total === 0 && !completed;
  const revealed = Boolean(current && flipped);
  return (
    <div className="play">
      <div className="page-header">
        <div><h1>{topic.Name}</h1><p className="muted">{topic.Description}</p></div>
        <button className="btn" onClick={leave}>← Kết thúc & chọn chủ đề khác</button>
      </div>

      <div className="progress-wrap" aria-label="Tiến độ vòng">
        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
        <span>{roundNo ? `Vòng ${roundNo} · ` : ''}Đã rút {progress.drawn}/{progress.total} lá</span>
      </div>

      <div className="stage">
        <div ref={stageRef} key={dealKey} className={`stage-card ${dealKey > 0 ? 'deal-in' : ''}`}>
          <div className={`halo ${revealed ? 'pulse' : ''}`}>
            <FlipCard
              front={current?.FrontImageURLSnapshot}
              back={current?.BackImageURLSnapshot || idleBack || topic.ImageURL}
              flipped={revealed}
              instant={instant}
              alt={current?.CardNameSnapshot}
              onClick={revealed && !busy ? () => setZoom(current) : undefined}
            />
          </div>
        </div>
        <div className="result">
          {revealed ? (
            <>
              <small className="muted">Bấm vào lá bài để phóng to</small>
              <h2>{current.CardNameSnapshot}</h2>
              <p>{current.CardDescriptionSnapshot}</p>
              <button className="btn btn-fav" onClick={addFav} disabled={fav}>{fav ? '♥ Đã yêu thích' : '♡ Thêm vào yêu thích'}</button>
            </>
          ) : <p className="muted">{noCards ? 'Chủ đề này hiện chưa có lá bài nào.' : 'Nhấn “Rút bài” để nhận gợi ý của bạn.'}</p>}
          {notice && <div className="notice">{notice}</div>}
          <button className="btn btn-primary btn-lg" onClick={draw} disabled={busy || noCards}>
            {busy ? 'Đang rút...' : completed ? 'Bắt đầu vòng mới' : current ? 'Rút lá tiếp theo' : 'Rút bài'}
          </button>
        </div>
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label="Lá bài phóng to">
          <img src={assetUrl(zoom.FrontImageURLSnapshot)} alt={zoom.CardNameSnapshot} />
          <button className="btn lightbox-close" onClick={() => setZoom(null)}>Đóng ✕</button>
        </div>
      )}

      <section className="tray" aria-label="Các lá bài đã rút trong vòng này">
        <div className="tray-head"><strong>Các lá bài đã rút trong vòng này</strong><span className="muted">{drawnList.length} lá</span></div>
        <div className="tray-list" ref={trayRef}>
          {drawnList.length === 0 && <small className="muted">Khi rút lá tiếp theo, lá bài đang mở sẽ được chuyển xuống đây.</small>}
          {drawnList.map((c) => (
            <button key={c.DrawID || c.CardID} className="tray-item" style={{ visibility: c._hidden ? 'hidden' : 'visible' }}
              onClick={() => setZoom(c)} title={`${c.CardNameSnapshot} — bấm để phóng to`}>
              <div className="tray-thumb" data-slot={c.DrawID}><img src={assetUrl(c.FrontImageURLSnapshot)} alt={c.CardNameSnapshot} /></div>
              <span>{c.CardNameSnapshot}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
