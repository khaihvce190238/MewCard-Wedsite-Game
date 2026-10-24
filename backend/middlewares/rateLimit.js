/** Giới hạn số request theo IP (bộ nhớ tiến trình — đủ cho dự án sinh viên, chạy 1 instance). */
export function rateLimit({ windowMs, max, message = 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    let e = hits.get(req.ip);
    if (!e || e.reset <= now) { e = { count: 0, reset: now + windowMs }; hits.set(req.ip, e); }
    e.count += 1;
    if (e.count > max) {
      res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}
