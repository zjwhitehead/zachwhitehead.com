(function () {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const mouse = { x: -9999, y: -9999, active: false };
  const particles = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const REACT_RADIUS = 140;
  const LINK_DIST = 130;

  function resize() {
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    particles.length = 0;
    const target = Math.min(Math.round((W * H) / 12000), 160);
    for (let i = 0; i < target; i++) {
      // Power curve: lots of tiny stars, occasional bright one
      const rRoll = Math.random();
      const r = Math.pow(rRoll, 3) * 1.8 + 0.3;
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - .5) * 0.035,
        vy: (Math.random() - .5) * 0.035,
        r,
        base: 0.35 + rRoll * 0.5,
        twPhase: Math.random() * Math.PI * 2,
        twSpeed: 0.0008 + Math.random() * 0.0014,
      });
    }
  }

  function accentRGB() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#009dff';
    const m = c.match(/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
    if (!m) return [0, 157, 255];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    const [ar, ag, ab] = accentRGB();

    for (const p of particles) {
      if (!reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }

      if (mouse.active && !reduceMotion) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REACT_RADIUS * REACT_RADIUS) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / REACT_RADIUS) * 0.15;
          p.x += (dx / d) * force;
          p.y += (dy / d) * force;
        }
      }
    }

    // Constellation lines — softer, only between nearby stars
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const alpha = Math.pow(1 - Math.sqrt(d2) / LINK_DIST, 1.6) * 0.18;
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Stars with gentle twinkle
    for (const p of particles) {
      const twinkle = Math.sin(t * p.twSpeed + p.twPhase) * 0.15;
      let glow = Math.max(0.1, Math.min(1, p.base + twinkle));

      if (mouse.active && !reduceMotion) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REACT_RADIUS * REACT_RADIUS) {
          glow = Math.min(1, glow + (1 - Math.sqrt(d2) / REACT_RADIUS) * 0.5);
        }
      }

      ctx.fillStyle = `rgba(${ar},${ag},${ab},${glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener('pointerleave', () => { mouse.active = false; });
  window.addEventListener('blur', () => { mouse.active = false; });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(tick);
})();

(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('open', open);
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

