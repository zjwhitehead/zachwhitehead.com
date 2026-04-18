(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pointer = { x: 0, y: 0, active: false };

  let width = 0;
  let height = 0;
  let frame = 0;
  let reduceMotion = motionQuery.matches;
  let fieldStars = [];
  let clusters = [];
  let travelers = [];

  const clusterDefs = [
    {
      anchor: [0.08, 0.14],
      points: [[0.00, 0.04], [0.05, 0.00], [0.11, 0.05], [0.09, 0.12], [0.02, 0.13]],
      links: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3], [1, 3]],
      warm: false,
    },
    {
      anchor: [0.63, 0.07],
      points: [[0.01, 0.02], [0.07, 0.00], [0.12, 0.05], [0.08, 0.13], [0.00, 0.10]],
      links: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3]],
      warm: false,
    },
    {
      anchor: [0.10, 0.67],
      points: [[0.00, 0.02], [0.06, 0.00], [0.12, 0.03], [0.08, 0.10]],
      links: [[0, 1], [1, 2], [2, 3]],
      warm: true,
    },
    {
      anchor: [0.70, 0.63],
      points: [[0.00, 0.03], [0.08, 0.00], [0.13, 0.06], [0.08, 0.12], [0.01, 0.10]],
      links: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 3], [1, 4]],
      warm: false,
    },
  ];

  function accentRGB(token) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(token)
      .trim();
    const match = value.match(/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
    if (!match) return token === '--accent-warm' ? [255, 157, 74] : [0, 157, 255];
    return [
      parseInt(match[1], 16),
      parseInt(match[2], 16),
      parseInt(match[3], 16),
    ];
  }

  function buildScene() {
    fieldStars = [];
    clusters = [];
    travelers = [];

    const starCount = Math.max(18, Math.round((width * height) / 90000));
    for (let i = 0; i < starCount; i++) {
      fieldStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.2,
        twinkle: Math.random() * Math.PI * 2,
        depth: 0.15 + Math.random() * 0.25,
      });
    }

    clusterDefs.forEach((def, clusterIndex) => {
      const nodes = def.points.map(([dx, dy], pointIndex) => ({
        baseX: (def.anchor[0] + dx) * width,
        baseY: (def.anchor[1] + dy) * height,
        radius: pointIndex % 3 === 0 ? 2.1 : 1.4,
        phase: clusterIndex * 0.9 + pointIndex * 0.55,
        depth: 0.35 + pointIndex * 0.09,
        drift: 1.8 + ((clusterIndex + pointIndex) % 3) * 1.3,
      }));

      const links = def.links.map(([from, to], linkIndex) => ({
        from,
        to,
        phase: clusterIndex * 0.4 + linkIndex * 0.21,
      }));

      clusters.push({ nodes, links, warm: def.warm });

      links
        .filter((_, index) => index % 2 === 0)
        .forEach((link, travelIndex) => {
          travelers.push({
            clusterIndex,
            link,
            speed: 0.00008 + travelIndex * 0.00001 + clusterIndex * 0.000005,
            phase: clusterIndex * 0.8 + travelIndex * 0.45,
            warm: def.warm,
          });
        });
    });
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildScene();
    render(performance.now());
  }

  function getNodePosition(node, time) {
    const pointerOffsetX = pointer.active
      ? (pointer.x / Math.max(width, 1) - 0.5) * node.depth * 18
      : 0;
    const pointerOffsetY = pointer.active
      ? (pointer.y / Math.max(height, 1) - 0.35) * node.depth * 10
      : 0;

    const driftX = reduceMotion
      ? 0
      : Math.sin(time * 0.00016 + node.phase) * node.drift;
    const driftY = reduceMotion
      ? 0
      : Math.cos(time * 0.00013 + node.phase * 1.2) * node.drift * 0.75;

    return {
      x: node.baseX + pointerOffsetX + driftX,
      y: node.baseY + pointerOffsetY + driftY,
    };
  }

  function drawStar(x, y, radius, alpha, color) {
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function render(time) {
    const cool = accentRGB('--accent');
    const warm = accentRGB('--accent-warm');
    const scrollFade = 1 - Math.min(window.scrollY / Math.max(height * 1.15, 1), 0.78);

    ctx.clearRect(0, 0, width, height);

    fieldStars.forEach((star, index) => {
      const twinkle = 0.28 + (Math.sin(time * 0.0012 + star.twinkle + index) + 1) * 0.18;
      const driftX = reduceMotion ? 0 : Math.sin(time * 0.00008 + star.twinkle) * star.depth * 6;
      const driftY = reduceMotion ? 0 : Math.cos(time * 0.00006 + star.twinkle) * star.depth * 4;

      drawStar(
        star.x + driftX,
        star.y + driftY,
        star.r,
        twinkle * scrollFade * 0.65,
        cool
      );
    });

    clusters.forEach((cluster) => {
      const color = cluster.warm ? warm : cool;
      const positions = cluster.nodes.map((node) => getNodePosition(node, time));

      cluster.links.forEach((link, index) => {
        const from = positions[link.from];
        const to = positions[link.to];
        const alpha = (0.08 + (index % 3) * 0.025) * scrollFade;

        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      });

      positions.forEach((position, index) => {
        const node = cluster.nodes[index];
        const glow = 0.55 + (Math.sin(time * 0.001 + node.phase * 2.4) + 1) * 0.12;
        drawStar(position.x, position.y, node.radius, glow * scrollFade, color);
      });
    });

    travelers.forEach((traveler) => {
      const cluster = clusters[traveler.clusterIndex];
      const from = getNodePosition(cluster.nodes[traveler.link.from], time);
      const to = getNodePosition(cluster.nodes[traveler.link.to], time);
      const color = traveler.warm ? warm : cool;
      const progress = reduceMotion
        ? 0.5
        : (time * traveler.speed + traveler.phase) % 1;

      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;

      ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.95 * scrollFade})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.28 * scrollFade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    });
  }

  function loop(time) {
    render(time);
    frame = window.requestAnimationFrame(loop);
  }

  function start() {
    window.cancelAnimationFrame(frame);
    render(performance.now());
    if (!reduceMotion) {
      frame = window.requestAnimationFrame(loop);
    }
  }

  function onMotionChange(event) {
    reduceMotion = event.matches;
    start();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => {
    if (reduceMotion) render(performance.now());
  }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (reduceMotion) render(performance.now());
  });
  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    if (reduceMotion) render(performance.now());
  });
  window.addEventListener('blur', () => {
    pointer.active = false;
  });
  motionQuery.addEventListener('change', onMotionChange);

  resize();
  start();
})();

(function () {
  const canvas = document.getElementById('pcb');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;
  let nodes = [];
  let traces = [];
  let pulses = [];
  let bg = null;

  function accentRGB() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#009dff';
    const m = c.match(/#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i);
    if (!m) return [0, 157, 255];
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  function buildTrace(pts) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, len, start: total });
      total += len;
    }
    return { pts, segs, total };
  }

  function posAt(tr, d) {
    for (const s of tr.segs) {
      if (d <= s.start + s.len) {
        const f = (d - s.start) / (s.len || 1);
        return { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f };
      }
    }
    const last = tr.segs[tr.segs.length - 1];
    return { x: last.b.x, y: last.b.y };
  }

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (W === 0 || H === 0) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    nodes = [];
    traces = [];
    pulses = [];

    const cellW = W < 700 ? 80 : 110;
    const cellH = W < 700 ? 72 : 92;
    const cols = Math.max(2, Math.floor(W / cellW));
    const rows = Math.max(2, Math.floor(H / cellH));
    const grid = {};

    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        if (Math.random() > 0.6) continue;
        const x = (c / cols) * W + (Math.random() - 0.5) * 14;
        const y = (r / rows) * H + (Math.random() - 0.5) * 10;
        const n = { id: `${c},${r}`, c, r, x, y };
        grid[n.id] = n;
        nodes.push(n);
      }
    }

    for (const n of nodes) {
      const right = grid[`${n.c + 1},${n.r}`];
      const down = grid[`${n.c},${n.r + 1}`];
      const dr = grid[`${n.c + 1},${n.r + 1}`];
      const ur = grid[`${n.c + 1},${n.r - 1}`];
      if (right && Math.random() > 0.25) traces.push(buildTrace([n, right]));
      if (down && Math.random() > 0.25) traces.push(buildTrace([n, down]));
      if (dr && Math.random() > 0.65) {
        const bend = Math.random() < 0.5 ? { x: dr.x, y: n.y } : { x: n.x, y: dr.y };
        traces.push(buildTrace([n, bend, dr]));
      }
      if (ur && Math.random() > 0.7) {
        const bend = Math.random() < 0.5 ? { x: ur.x, y: n.y } : { x: n.x, y: ur.y };
        traces.push(buildTrace([n, bend, ur]));
      }
    }

    if (traces.length === 0) return;

    const pulseCount = Math.min(traces.length, Math.max(10, Math.floor(traces.length * 0.4)));
    for (let i = 0; i < pulseCount; i++) {
      const tr = traces[Math.floor(Math.random() * traces.length)];
      pulses.push({
        tr,
        d: Math.random() * tr.total,
        speed: 40 + Math.random() * 70,
        intensity: 0.55 + Math.random() * 0.45,
      });
    }

    bg = document.createElement('canvas');
    bg.width = W * dpr;
    bg.height = H * dpr;
    const bc = bg.getContext('2d');
    bc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [ar, ag, ab] = accentRGB();

    const gridSize = 22;
    bc.fillStyle = `rgba(${ar},${ag},${ab},0.055)`;
    for (let x = gridSize / 2; x < W; x += gridSize) {
      for (let y = gridSize / 2; y < H; y += gridSize) {
        bc.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }

    bc.lineWidth = 1.15;
    bc.strokeStyle = `rgba(${ar},${ag},${ab},0.18)`;
    for (const tr of traces) {
      bc.beginPath();
      for (let i = 0; i < tr.pts.length; i++) {
        const p = tr.pts[i];
        if (i === 0) bc.moveTo(p.x, p.y);
        else bc.lineTo(p.x, p.y);
      }
      bc.stroke();
    }

    for (const n of nodes) {
      bc.fillStyle = `rgba(${ar},${ag},${ab},0.55)`;
      bc.beginPath();
      bc.arc(n.x, n.y, 2.6, 0, Math.PI * 2);
      bc.fill();
      bc.fillStyle = `rgba(10,11,13,0.82)`;
      bc.beginPath();
      bc.arc(n.x, n.y, 1.1, 0, Math.PI * 2);
      bc.fill();
    }
  }

  let last = performance.now();
  function tick(t) {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;

    if (W === 0 || H === 0) {
      requestAnimationFrame(tick);
      return;
    }

    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);

    const [ar, ag, ab] = accentRGB();

    for (const p of pulses) {
      if (!reduceMotion) p.d += p.speed * dt;
      if (p.d > p.tr.total) {
        p.d = 0;
        p.tr = traces[Math.floor(Math.random() * traces.length)];
        p.speed = 40 + Math.random() * 70;
        p.intensity = 0.55 + Math.random() * 0.45;
      }
      const pos = posAt(p.tr, p.d);

      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18);
      g.addColorStop(0, `rgba(${ar},${ag},${ab},${0.6 * p.intensity})`);
      g.addColorStop(0.4, `rgba(${ar},${ag},${ab},${0.22 * p.intensity})`);
      g.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${0.9 * p.intensity})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  let resizeRaf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

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

  links.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
