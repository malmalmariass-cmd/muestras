// Decoración del fondo: líneas curvas y partículas que se mueven despacio y se apartan del mouse.
(() => {
  const canvas = document.getElementById("bg");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LINE_COLORS = ["rgba(255,255,255,.35)", "rgba(231,160,254,.45)", "rgba(208,255,163,.40)", "rgba(0,1,128,.18)"];
  const DOT_COLORS = ["rgba(255,255,255,.75)", "rgba(231,160,254,.85)", "rgba(208,255,163,.85)", "rgba(0,1,128,.35)"];
  const MOUSE_RADIUS = 160;

  let w = 0, h = 0, dpr = 1, lines = [], dots = [], t = 0, raf = 0;
  const mouse = { x: -9999, y: -9999, active: false };

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    lines = Array.from({ length: 5 }, (_, i) => ({
      y: h * (0.15 + i * 0.18),
      amp: 30 + Math.random() * 50,
      len: 0.0015 + Math.random() * 0.002,
      speed: 0.12 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      color: LINE_COLORS[i % LINE_COLORS.length],
      width: 1 + Math.random() * 1.5,
    }));

    const count = Math.min(90, Math.round((w * h) / 16000));
    dots = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      ox: 0, oy: 0, // desplazamiento por el mouse
      r: 1 + Math.random() * 2.2,
      color: DOT_COLORS[i % DOT_COLORS.length],
    }));
  }

  // Empuje suave alejándose del mouse (0 lejos, 1 encima).
  function push(x, y) {
    if (!mouse.active) return [0, 0];
    const dx = x - mouse.x, dy = y - mouse.y;
    const d = Math.hypot(dx, dy);
    if (d > MOUSE_RADIUS || d === 0) return [0, 0];
    const f = (1 - d / MOUSE_RADIUS) ** 2;
    return [(dx / d) * f, (dy / d) * f];
  }

  function drawLines() {
    for (const l of lines) {
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 12) {
        let y = l.y + Math.sin(x * l.len + t * l.speed + l.phase) * l.amp
                    + Math.sin(x * l.len * 2.3 - t * l.speed * 0.7) * l.amp * 0.35;
        const [, py] = push(x, y);
        y += py * 60;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = l.color;
      ctx.lineWidth = l.width;
      ctx.stroke();
    }
  }

  function drawDots() {
    for (const p of dots) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      const [fx, fy] = push(p.x + p.ox, p.y + p.oy);
      p.ox = p.ox * 0.9 + fx * 16;
      p.oy = p.oy * 0.9 + fy * 16;
    }
    // Hilos entre partículas cercanas y hacia el mouse.
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i], ax = a.x + a.ox, ay = a.y + a.oy;
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], d = Math.hypot(ax - b.x - b.ox, ay - b.y - b.oy);
        if (d < 110) {
          ctx.strokeStyle = `rgba(255,255,255,${0.18 * (1 - d / 110)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(b.x + b.ox, b.y + b.oy); ctx.stroke();
        }
      }
      if (mouse.active) {
        const d = Math.hypot(ax - mouse.x, ay - mouse.y);
        if (d < MOUSE_RADIUS) {
          ctx.strokeStyle = `rgba(231,160,254,${0.45 * (1 - d / MOUSE_RADIUS)})`;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }
    for (const p of dots) {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x + p.ox, p.y + p.oy, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    drawLines();
    drawDots();
    t += 0.016;
    raf = reduceMotion ? 0 : requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
  window.addEventListener("pointerleave", () => { mouse.active = false; });
  document.addEventListener("mouseleave", () => { mouse.active = false; });
  window.addEventListener("resize", () => { setup(); if (reduceMotion) frame(); });
  // Pausa cuando la pestaña no está visible, para no gastar batería.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf && !reduceMotion) raf = requestAnimationFrame(frame);
  });

  setup();
  frame();
})();
