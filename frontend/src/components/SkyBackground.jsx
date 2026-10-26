import { useEffect, useRef } from 'react';

const COLORS = ['245,194,107', '168,85,247', '244,114,182', '255,255,255'];

/** Nền động: đốm sáng + sao lấp lánh trôi lên (theo thiết kế homepage). Chỉ trang trí, không chặn thao tác. */
export default function SkyBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const cx = cv?.getContext('2d');
    if (!cv || !cx) return undefined;

    let W = 0;
    let H = 0;
    let particles = [];
    let raf = 0;

    const resize = () => {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
      particles = Array.from({ length: Math.min(90, Math.floor(W / 14)) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 2.2 + 0.4,
        vy: -(Math.random() * 0.25 + 0.05),
        vx: (Math.random() - 0.5) * 0.15,
        t: Math.random() * 6.3,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const draw = () => {
      cx.clearRect(0, 0, W, H);
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx; p.y += p.vy; p.t += 0.02;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        }
        const a = 0.25 + 0.55 * Math.abs(Math.sin(p.t));
        const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `rgba(${p.c},${a})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        cx.fillStyle = g;
        cx.beginPath();
        cx.arc(p.x, p.y, p.r * 6, 0, 6.3);
        cx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
