
import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;

const COLORS = {
  white: [255, 250, 255],
  lavender: [210, 175, 255],
  purple: [155, 95, 255],
  pink: [255, 145, 220],
  gold: [255, 210, 130],
  blue: [115, 145, 255],
};

const MAX_DPR = 2;

const random = (min, max) =>
  Math.random() * (max - min) + min;

const pick = (items) =>
  items[Math.floor(Math.random() * items.length)];

const rgba = (color, alpha) =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

function createDust(width, height) {
  return {
    x: random(0, width),
    y: random(0, height),
    radius: random(0.4, 1.8),
    speedX: random(-5, 5),
    speedY: random(-9, -2),
    phase: random(0, TAU),
    frequency: random(0.5, 1.8),
    color: pick([
      COLORS.lavender,
      COLORS.pink,
      COLORS.gold,
      COLORS.white,
    ]),
  };
}

function createStar(width, height, layer = 1) {
  const large = layer === 2;

  return {
    x: random(0, width),
    y: random(0, height),
    radius: large ? random(1.5, 3.1) : random(0.35, 1.35),
    speedX: random(-2, 2) * layer,
    speedY: random(1, 5) * layer,
    phase: random(0, TAU),
    frequency: random(0.5, 2),
    layer,
    sparkle: large || Math.random() < 0.035,
    color: pick([
      COLORS.white,
      COLORS.white,
      COLORS.lavender,
      COLORS.pink,
      COLORS.gold,
      COLORS.blue,
    ]),
  };
}

function createShootingStar(width, height) {
  const x = random(width * 0.15, width * 1.05);
  const y = random(-height * 0.1, height * 0.65);
  const angle = random(Math.PI * 0.12, Math.PI * 0.34);
  const speed = random(650, 1050);

  return {
    x,
    y,
    vx: -Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: random(100, 230),
    life: 0,
    duration: random(0.65, 1.15),
    color: pick([
      COLORS.white,
      COLORS.lavender,
      COLORS.gold,
    ]),
  };
}

function drawNebula(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);

  // Nền vũ trụ tối.
  const base = ctx.createLinearGradient(
    0, 0, width, height
  );

  base.addColorStop(0, '#090714');
  base.addColorStop(0.45, '#100b25');
  base.addColorStop(1, '#080b19');

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Tinh vân nhiều lớp. Chỉ tạo gradient khi resize.
  const clouds = [
    {
      x: 0.18, y: 0.28, r: 0.48,
      color: COLORS.purple, alpha: 0.22,
    },
    {
      x: 0.76, y: 0.22, r: 0.36,
      color: COLORS.pink, alpha: 0.12,
    },
    {
      x: 0.67, y: 0.76, r: 0.44,
      color: COLORS.blue, alpha: 0.16,
    },
    {
      x: 0.37, y: 0.82, r: 0.32,
      color: COLORS.gold, alpha: 0.09,
    },
    {
      x: 0.48, y: 0.43, r: 0.30,
      color: COLORS.purple, alpha: 0.13,
    },
  ];

  for (const cloud of clouds) {
    const x = width * cloud.x;
    const y = height * cloud.y;
    const radius = Math.min(width, height) * cloud.r;

    const gradient = ctx.createRadialGradient(
      x, y, 0,
      x, y, radius
    );

    gradient.addColorStop(
      0,
      rgba(cloud.color, cloud.alpha)
    );
    gradient.addColorStop(
      0.38,
      rgba(cloud.color, cloud.alpha * 0.55)
    );
    gradient.addColorStop(
      1,
      rgba(cloud.color, 0)
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Quầng sáng vàng và tím nhẹ.
  const haze = ctx.createRadialGradient(
    width * 0.5,
    height * 0.52,
    0,
    width * 0.5,
    height * 0.52,
    Math.max(width, height) * 0.65
  );

  haze.addColorStop(0, 'rgba(95, 58, 145, 0.07)');
  haze.addColorStop(0.55, 'rgba(40, 30, 80, 0.035)');
  haze.addColorStop(1, 'rgba(0, 0, 0, 0.18)');

  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
}

function drawSparkle(ctx, star, alpha) {
  const { x, y, radius, color } = star;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Hào quang mềm.
  const glowRadius = radius * 5;
  const glow = ctx.createRadialGradient(
    x, y, 0,
    x, y, glowRadius
  );

  glow.addColorStop(0, rgba(color, 0.8));
  glow.addColorStop(0.25, rgba(color, 0.25));
  glow.addColorStop(1, rgba(color, 0));

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, TAU);
  ctx.fill();

  // Sao bốn cánh.
  ctx.fillStyle = rgba(COLORS.white, 0.95);
  ctx.beginPath();
  ctx.moveTo(x, y - radius * 2.8);
  ctx.quadraticCurveTo(
    x - radius * 0.25, y - radius * 0.25,
    x - radius * 2.1, y
  );
  ctx.quadraticCurveTo(
    x - radius * 0.25, y + radius * 0.25,
    x, y + radius * 2.8
  );
  ctx.quadraticCurveTo(
    x + radius * 0.25, y + radius * 0.25,
    x + radius * 2.1, y
  );
  ctx.quadraticCurveTo(
    x + radius * 0.25, y - radius * 0.25,
    x, y - radius * 2.8
  );
  ctx.fill();

  ctx.restore();
}

export default function SkyBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d', {
      alpha: true,
    });

    if (!canvas || !ctx) return undefined;

    const background = document.createElement('canvas');
    const bgCtx = background.getContext('2d');

    if (!bgCtx) return undefined;

    const motionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    let width = 0;
    let height = 0;
    let dpr = 1;

    let stars = [];
    let dust = [];
    let shootingStars = [];

    let rafId = 0;
    let running = false;
    let lastTime = 0;
    let nextShootingStar = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      background.width = canvas.width;
      background.height = canvas.height;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawNebula(bgCtx, width, height);

      // Nhiều lớp sao tạo cảm giác chiều sâu.
      const area = width * height;

      const farCount = Math.min(
        500,
        Math.max(180, Math.floor(area / 3500))
      );

      const nearCount = Math.min(
        100,
        Math.max(35, Math.floor(area / 18000))
      );

      const dustCount = Math.min(
        180,
        Math.max(60, Math.floor(area / 12000))
      );

      stars = [
        ...Array.from(
          { length: farCount },
          () => createStar(width, height, 1)
        ),
        ...Array.from(
          { length: nearCount },
          () => createStar(width, height, 2)
        ),
      ];

      dust = Array.from(
        { length: dustCount },
        () => createDust(width, height)
      );

      shootingStars = [];

      renderScene(0, false);
    };

    const renderScene = (delta, animate) => {
      ctx.clearRect(0, 0, width, height);

      // Nền tinh vân đã vẽ sẵn, không tạo lại gradient mỗi frame.
      ctx.drawImage(background, 0, 0, width, height);

      // Lớp 1: các sao ở xa.
      for (const star of stars) {
        if (animate) {
          star.x += star.speedX * delta;
          star.y += star.speedY * delta;
          star.phase += star.frequency * delta;

          if (star.y > height + 3) star.y = -3;
          if (star.x < -3) star.x = width + 3;
          if (star.x > width + 3) star.x = -3;
        }

        const twinkle =
          0.35 +
          0.65 * ((Math.sin(star.phase) + 1) / 2);

        ctx.globalAlpha = twinkle;

        if (star.sparkle) {
          drawSparkle(ctx, star, twinkle);
        } else {
          ctx.fillStyle = rgba(star.color, 0.9);
          ctx.beginPath();
          ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            TAU
          );
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;

      // Lớp 2: bụi phép thuật.
      for (const p of dust) {
        if (animate) {
          p.x += p.speedX * delta;
          p.y += p.speedY * delta;
          p.phase += p.frequency * delta;

          if (p.y < -4) {
            p.y = height + 4;
            p.x = random(0, width);
          }

          if (p.x < -4) p.x = width + 4;
          if (p.x > width + 4) p.x = -4;
        }

        const alpha =
          0.18 +
          0.55 * ((Math.sin(p.phase) + 1) / 2);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = rgba(p.color, 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Lớp 3: sao băng.
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];

        if (animate) {
          s.x += s.vx * delta;
          s.y += s.vy * delta;
          s.life += delta;
        }

        const progress = s.life / s.duration;

        if (progress >= 1) {
          shootingStars.splice(i, 1);
          continue;
        }

        const fade = Math.sin(progress * Math.PI);
        const tailX =
          s.x - s.vx * (s.length / Math.abs(s.vx || 1));
        const tailY =
          s.y - s.vy * (s.length / Math.abs(s.vx || 1));

        const gradient = ctx.createLinearGradient(
          s.x, s.y,
          tailX, tailY
        );

        gradient.addColorStop(0, rgba(s.color, fade));
        gradient.addColorStop(0.25, rgba(s.color, fade * 0.55));
        gradient.addColorStop(1, rgba(s.color, 0));

        ctx.save();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.fillStyle = rgba(COLORS.white, fade);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    };

    const frame = (timestamp) => {
      if (!running) return;

      const delta = lastTime
        ? Math.min((timestamp - lastTime) / 1000, 0.05)
        : 0;

      lastTime = timestamp;

      if (
        timestamp >= nextShootingStar &&
        shootingStars.length < 2 &&
        width > 0 &&
        height > 0
      ) {
        shootingStars.push(
          createShootingStar(width, height)
        );

        // Khoảng cách ngẫu nhiên giữa các sao băng.
        nextShootingStar =
          timestamp + random(2500, 6500);
      }

      renderScene(delta, true);
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }

      lastTime = 0;
    };

    const start = () => {
      if (
        running ||
        document.hidden ||
        motionQuery.matches
      ) {
        return;
      }

      running = true;
      lastTime = 0;
      nextShootingStar = performance.now() + 1200;
      rafId = requestAnimationFrame(frame);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (!motionQuery.matches) {
        start();
      } else {
        renderScene(0, false);
      }
    };

    const handleMotionChange = () => {
      stop();

      // Khi giảm chuyển động, giữ nền tĩnh và không tạo sao băng mới.
      shootingStars = [];
      renderScene(0, false);

      if (!motionQuery.matches && !document.hidden) {
        start();
      }
    };

    resize();

    window.addEventListener('resize', resize);
    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );
    motionQuery.addEventListener(
      'change',
      handleMotionChange
    );

    if (!motionQuery.matches && !document.hidden) {
      start();
    }

    return () => {
      stop();

      window.removeEventListener('resize', resize);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
      motionQuery.removeEventListener(
        'change',
        handleMotionChange
      );

      // Giải phóng bộ nhớ Canvas phụ.
      background.width = 0;
      background.height = 0;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="sky"
      aria-hidden="true"
    />
  );
}
