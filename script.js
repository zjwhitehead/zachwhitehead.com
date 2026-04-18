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
      warm: false,
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

  const MASK = '#0a2a18';
  const MASK_SHADE = '#071e11';
  const COPPER = '#1f7a38';
  const COPPER_CORE = '#2fa54d';
  const GOLD = '#c9a449';
  const GOLD_HI = '#f0d37a';
  const SILK = 'rgba(228, 224, 204, 0.7)';
  const SILK_DIM = 'rgba(228, 224, 204, 0.35)';
  const DRILL = '#070806';
  const IC_FILL = '#0d1c10';

  let W = 0, H = 0;
  let nodes = [];
  let traces = [];
  let pulses = [];
  let components = [];
  let bg = null;

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

  function rectOverlap(a, b, pad) {
    return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x ||
             a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
  }

  function drawIC(bc, cp) {
    bc.fillStyle = IC_FILL;
    bc.fillRect(cp.x, cp.y, cp.w, cp.h);
    bc.strokeStyle = SILK;
    bc.lineWidth = 0.9;
    bc.strokeRect(cp.x + 0.5, cp.y + 0.5, cp.w - 1, cp.h - 1);
    bc.fillStyle = SILK_DIM;
    const pin1r = Math.min(1.6, cp.h * 0.14);
    bc.beginPath();
    bc.arc(cp.x + Math.min(6, cp.w * 0.2), cp.y + Math.min(6, cp.h * 0.3), pin1r, 0, Math.PI * 2);
    bc.fill();
    if (cp.h >= 22) {
      bc.fillStyle = SILK;
      bc.font = '600 8px "JetBrains Mono", ui-monospace, monospace';
      bc.textBaseline = 'top';
      bc.textAlign = 'left';
      bc.fillText(cp.label, cp.x + 4, cp.y + cp.h - 11);
    }

    const pinSpacing = cp.pinSpacing;
    const pinsTop = Math.floor((cp.w - 6) / pinSpacing);
    if (pinsTop < 1) return;
    const pinW = pinSpacing >= 9 ? 4 : 2.2;
    const pinLen = pinSpacing >= 9 ? 5 : 3;
    for (let i = 0; i < pinsTop; i++) {
      const px = cp.x + 3 + i * pinSpacing + (cp.w - 6 - (pinsTop - 1) * pinSpacing) / 2;
      bc.fillStyle = GOLD;
      bc.fillRect(px - pinW / 2, cp.y - pinLen + 1, pinW, pinLen);
      bc.fillRect(px - pinW / 2, cp.y + cp.h - 1, pinW, pinLen);
      bc.fillStyle = GOLD_HI;
      bc.fillRect(px - pinW / 2, cp.y - pinLen + 1, pinW, 1);
      bc.fillRect(px - pinW / 2, cp.y + cp.h - 1, pinW, 1);
    }
  }

  function drawPassive(bc, cp, bodyColor, highlight) {
    const endW = 1.6;
    bc.fillStyle = '#c7cbcf';
    if (cp.horiz) {
      bc.fillRect(cp.x, cp.y, endW, cp.h);
      bc.fillRect(cp.x + cp.w - endW, cp.y, endW, cp.h);
      bc.fillStyle = bodyColor;
      bc.fillRect(cp.x + endW, cp.y, cp.w - endW * 2, cp.h);
      bc.fillStyle = highlight;
      bc.fillRect(cp.x + endW, cp.y, cp.w - endW * 2, 1);
    } else {
      bc.fillRect(cp.x, cp.y, cp.w, endW);
      bc.fillRect(cp.x, cp.y + cp.h - endW, cp.w, endW);
      bc.fillStyle = bodyColor;
      bc.fillRect(cp.x, cp.y + endW, cp.w, cp.h - endW * 2);
      bc.fillStyle = highlight;
      bc.fillRect(cp.x, cp.y + endW, 1, cp.h - endW * 2);
    }
  }

  function drawTantalum(bc, cp) {
    bc.fillStyle = '#c38a2a';
    bc.fillRect(cp.x, cp.y, cp.w, cp.h);
    bc.fillStyle = 'rgba(255,230,160,0.22)';
    if (cp.horiz) {
      bc.fillRect(cp.x, cp.y, cp.w, 1);
      bc.fillStyle = 'rgba(245,245,245,0.85)';
      bc.fillRect(cp.x + cp.w - 2.4, cp.y + 1, 1.8, cp.h - 2);
    } else {
      bc.fillRect(cp.x, cp.y, 1, cp.h);
      bc.fillStyle = 'rgba(245,245,245,0.85)';
      bc.fillRect(cp.x + 1, cp.y + cp.h - 2.4, cp.w - 2, 1.8);
    }
    bc.strokeStyle = 'rgba(0,0,0,0.45)';
    bc.lineWidth = 0.5;
    bc.strokeRect(cp.x + 0.25, cp.y + 0.25, cp.w - 0.5, cp.h - 0.5);
  }

  function build() {
    nodes = [];
    traces = [];
    pulses = [];
    components = [];

    const cellW = W < 700 ? 64 : 86;
    const cellH = W < 700 ? 58 : 74;
    const cols = Math.max(3, Math.floor(W / cellW));
    const rows = Math.max(3, Math.floor(H / cellH));
    const grid = {};

    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        if (Math.random() > 0.72) continue;
        const x = Math.round((c / cols) * (W - 40)) + 20;
        const y = Math.round((r / rows) * (H - 40)) + 20;
        const n = { id: `${c},${r}`, c, r, x, y };
        grid[n.id] = n;
        nodes.push(n);
      }
    }

    let icIndex = 1;
    function tryPlace(count, factory, minGap) {
      let attempts = 0;
      const start = components.length;
      while (components.length - start < count && attempts < 80) {
        attempts++;
        const spec = factory();
        const x = 26 + Math.floor(Math.random() * (W - spec.w - 52));
        const y = 24 + Math.floor(Math.random() * (H - spec.h - 46));
        const candidate = { ...spec, x, y };
        if (components.some(c => rectOverlap(c, candidate, minGap))) continue;
        components.push(candidate);
      }
    }

    const largeICCount = Math.max(1, Math.min(2, Math.floor((W * H) / 220000)));
    tryPlace(largeICCount, () => ({
      type: 'ic',
      w: 95 + Math.floor(Math.random() * 50),
      h: 52 + Math.floor(Math.random() * 22),
      pinSpacing: 10,
      label: `U${icIndex++}`,
    }), 22);

    const smallICCount = Math.max(1, Math.min(3, Math.floor((W * H) / 160000)));
    tryPlace(smallICCount, () => ({
      type: 'ic',
      w: 28 + Math.floor(Math.random() * 10),
      h: 14 + Math.floor(Math.random() * 4),
      pinSpacing: 5,
      label: `U${icIndex++}`,
    }), 14);

    const passiveCount = Math.max(10, Math.floor((W * H) / 26000));
    tryPlace(passiveCount, () => {
      const roll = Math.random();
      const horiz = Math.random() > 0.5;
      let type, len, wid;
      if (roll < 0.5) { type = 'r'; len = 11; wid = 5; }
      else if (roll < 0.85) { type = 'c'; len = 11; wid = 5; }
      else { type = 't'; len = 13; wid = 7; }
      return {
        type,
        w: horiz ? len : wid,
        h: horiz ? wid : len,
        horiz,
      };
    }, 6);

    const blocked = (x, y) => components.some(c =>
      x >= c.x - 8 && x <= c.x + c.w + 8 && y >= c.y - 8 && y <= c.y + c.h + 8);

    nodes = nodes.filter(n => !blocked(n.x, n.y));

    for (const cp of components) {
      if (cp.type !== 'ic') continue;
      const pinSpacing = cp.pinSpacing;
      const pinsTop = Math.floor((cp.w - 6) / pinSpacing);
      if (pinsTop < 1) continue;
      for (let i = 0; i < pinsTop; i++) {
        const px = cp.x + 3 + i * pinSpacing + (cp.w - 6 - (pinsTop - 1) * pinSpacing) / 2;
        nodes.push({ id: `ic_${cp.label}_t${i}`, x: Math.round(px), y: cp.y, isPin: true, isTop: true });
        nodes.push({ id: `ic_${cp.label}_b${i}`, x: Math.round(px), y: cp.y + cp.h, isPin: true, isBottom: true });
      }
    }

    const gridNodes = nodes.filter(n => !n.isPin);
    for (const n of gridNodes) {
      const right = grid[`${n.c + 1},${n.r}`];
      const down = grid[`${n.c},${n.r + 1}`];
      const dr = grid[`${n.c + 1},${n.r + 1}`];
      const ur = grid[`${n.c + 1},${n.r - 1}`];
      if (right && !blocked(right.x, n.y) && Math.random() > 0.22) {
        traces.push(buildTrace([{ x: n.x, y: n.y }, { x: right.x, y: n.y }]));
      }
      if (down && !blocked(n.x, down.y) && Math.random() > 0.22) {
        traces.push(buildTrace([{ x: n.x, y: n.y }, { x: n.x, y: down.y }]));
      }
      if (dr && Math.random() > 0.58) {
        const bend = Math.random() < 0.5 ? { x: dr.x, y: n.y } : { x: n.x, y: dr.y };
        if (!blocked(bend.x, bend.y) && !blocked(dr.x, dr.y)) {
          traces.push(buildTrace([{ x: n.x, y: n.y }, bend, { x: dr.x, y: dr.y }]));
        }
      }
      if (ur && Math.random() > 0.65) {
        const bend = Math.random() < 0.5 ? { x: ur.x, y: n.y } : { x: n.x, y: ur.y };
        if (!blocked(bend.x, bend.y) && !blocked(ur.x, ur.y)) {
          traces.push(buildTrace([{ x: n.x, y: n.y }, bend, { x: ur.x, y: ur.y }]));
        }
      }
    }

    for (const cp of components) {
      if (cp.type !== 'ic') continue;
      const pins = nodes.filter(n => n.isPin && n.id.startsWith(`ic_${cp.label}_`));
      for (const p of pins) {
        const stub = p.isTop
          ? { x: p.x, y: p.y - 10 }
          : { x: p.x, y: p.y + 10 };
        let target = null;
        let best = Infinity;
        for (const g of gridNodes) {
          const d = Math.abs(g.x - stub.x) + Math.abs(g.y - stub.y);
          if (d < best && d < 120) { best = d; target = g; }
        }
        if (target && Math.random() > 0.4) {
          const bend = { x: stub.x, y: target.y };
          traces.push(buildTrace([
            { x: p.x, y: p.y },
            stub,
            bend,
            { x: target.x, y: target.y },
          ]));
        } else {
          traces.push(buildTrace([{ x: p.x, y: p.y }, stub]));
        }
      }
    }

    if (traces.length === 0) return;

    const pulseCount = Math.max(3, Math.min(7, Math.floor(traces.length * 0.04)));
    for (let i = 0; i < pulseCount; i++) {
      const tr = traces[Math.floor(Math.random() * traces.length)];
      pulses.push({
        tr,
        d: Math.random() * tr.total,
        speed: 55 + Math.random() * 80,
        intensity: 0.55 + Math.random() * 0.35,
        wait: Math.random() * 2.2,
      });
    }

    bg = document.createElement('canvas');
    bg.width = W * dpr;
    bg.height = H * dpr;
    const bc = bg.getContext('2d');
    bc.setTransform(dpr, 0, 0, dpr, 0, 0);

    const mask = bc.createLinearGradient(0, 0, W, H);
    mask.addColorStop(0, MASK);
    mask.addColorStop(1, MASK_SHADE);
    bc.fillStyle = mask;
    bc.fillRect(0, 0, W, H);

    const noiseCount = Math.floor((W * H) / 350);
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      bc.fillStyle = Math.random() > 0.55 ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.06)';
      bc.fillRect(x, y, 1, 1);
    }

    bc.fillStyle = 'rgba(47, 165, 77, 0.07)';
    for (let x = 14; x < W; x += 30) {
      for (let y = 14; y < H; y += 30) {
        bc.fillRect(x - 0.4, y - 0.4, 0.8, 0.8);
      }
    }

    bc.lineCap = 'butt';
    bc.lineJoin = 'miter';
    bc.strokeStyle = COPPER;
    bc.lineWidth = 3;
    for (const tr of traces) {
      bc.beginPath();
      for (let i = 0; i < tr.pts.length; i++) {
        const p = tr.pts[i];
        if (i === 0) bc.moveTo(p.x, p.y);
        else bc.lineTo(p.x, p.y);
      }
      bc.stroke();
    }
    bc.strokeStyle = COPPER_CORE;
    bc.lineWidth = 1.1;
    for (const tr of traces) {
      bc.beginPath();
      for (let i = 0; i < tr.pts.length; i++) {
        const p = tr.pts[i];
        if (i === 0) bc.moveTo(p.x, p.y);
        else bc.lineTo(p.x, p.y);
      }
      bc.stroke();
    }

    for (const cp of components) {
      if (cp.type === 'ic') drawIC(bc, cp);
      else if (cp.type === 'r') drawPassive(bc, cp, '#161110', 'rgba(230,230,230,0.16)');
      else if (cp.type === 'c') drawPassive(bc, cp, '#9d7a3e', 'rgba(255,240,210,0.12)');
      else if (cp.type === 't') drawTantalum(bc, cp);
    }

    for (const n of nodes) {
      if (n.isPin) continue;
      bc.fillStyle = GOLD;
      bc.beginPath();
      bc.arc(n.x, n.y, 3.6, 0, Math.PI * 2);
      bc.fill();
      bc.fillStyle = GOLD_HI;
      bc.beginPath();
      bc.arc(n.x - 0.7, n.y - 0.7, 2.9, 0, Math.PI * 2);
      bc.fill();
      bc.fillStyle = DRILL;
      bc.beginPath();
      bc.arc(n.x, n.y, 1.3, 0, Math.PI * 2);
      bc.fill();
    }

    const corners = [[22, 22], [W - 22, 22], [22, H - 22], [W - 22, H - 22]];
    for (const [x, y] of corners) {
      bc.fillStyle = GOLD;
      bc.beginPath();
      bc.arc(x, y, 8, 0, Math.PI * 2);
      bc.fill();
      bc.fillStyle = GOLD_HI;
      bc.beginPath();
      bc.arc(x - 1, y - 1, 7, 0, Math.PI * 2);
      bc.fill();
      bc.fillStyle = DRILL;
      bc.beginPath();
      bc.arc(x, y, 3.4, 0, Math.PI * 2);
      bc.fill();
    }

    bc.fillStyle = SILK_DIM;
    bc.font = '600 7px "JetBrains Mono", ui-monospace, monospace';
    bc.textBaseline = 'top';
    bc.fillText('REV 0.3', 34, H - 16);
    bc.textAlign = 'right';
    bc.fillText('ZW//PCB', W - 34, H - 16);
    bc.textAlign = 'left';
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

    for (const p of pulses) {
      if (p.wait > 0) {
        if (!reduceMotion) p.wait -= dt;
        continue;
      }
      if (!reduceMotion) p.d += p.speed * dt;
      if (p.d > p.tr.total) {
        p.d = 0;
        p.tr = traces[Math.floor(Math.random() * traces.length)];
        p.speed = 55 + Math.random() * 80;
        p.intensity = 0.55 + Math.random() * 0.35;
        p.wait = 0.8 + Math.random() * 2.4;
        continue;
      }
      const pos = posAt(p.tr, p.d);

      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 11);
      g.addColorStop(0, `rgba(255, 245, 180, ${0.7 * p.intensity})`);
      g.addColorStop(0.4, `rgba(240, 200, 60, ${0.28 * p.intensity})`);
      g.addColorStop(1, 'rgba(240, 200, 60, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 253, 230, ${Math.min(0.85, p.intensity + 0.15)})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  let resizeRaf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (W > 0) build(); });
  }

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
