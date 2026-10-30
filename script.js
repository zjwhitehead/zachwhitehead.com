(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pointer = { x: 0, y: 0, active: false };

  let width = 0;
  let height = 0;
  let frame = 0;
  let staticFrame = 0;
  let reduceMotion = motionQuery.matches;
  let isVisible = document.visibilityState === 'visible';
  let scrollY = window.scrollY;
  let isInView = true;
  let fieldStars = [];
  let clusters = [];
  let travelers = [];
  let cool = [0, 157, 255];
  let warm = [255, 157, 74];

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

  function updateAccentColors() {
    cool = accentRGB('--accent');
    warm = accentRGB('--accent-warm');
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

    updateAccentColors();
    buildScene();
    render(performance.now());
  }

  function getNodePosition(node, time, pointerShiftX, pointerShiftY) {
    const pointerOffsetX = pointerShiftX * node.depth;
    const pointerOffsetY = pointerShiftY * node.depth;

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
    const scrollFade = 1 - Math.min(scrollY / Math.max(height * 1.15, 1), 0.78);
    const pointerShiftX = pointer.active
      ? (pointer.x / Math.max(width, 1) - 0.5) * 18
      : 0;
    const pointerShiftY = pointer.active
      ? (pointer.y / Math.max(height, 1) - 0.35) * 10
      : 0;
    const positionsByCluster = [];

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

    clusters.forEach((cluster, clusterIndex) => {
      const color = cluster.warm ? warm : cool;
      const positions = cluster.nodes.map((node) =>
        getNodePosition(node, time, pointerShiftX, pointerShiftY)
      );
      positionsByCluster[clusterIndex] = positions;

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
      const positions = positionsByCluster[traveler.clusterIndex];
      const from = positions[traveler.link.from];
      const to = positions[traveler.link.to];
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
    frame = isVisible && isInView && !reduceMotion
      ? window.requestAnimationFrame(loop)
      : 0;
  }

  function cancelFrames() {
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(staticFrame);
    frame = 0;
    staticFrame = 0;
  }

  function scheduleStaticRender() {
    if (!isVisible || !isInView || staticFrame) return;
    staticFrame = window.requestAnimationFrame((time) => {
      staticFrame = 0;
      render(time);
    });
  }

  function start() {
    cancelFrames();
    if (!isVisible || !isInView) return;
    render(performance.now());
    if (reduceMotion) {
      scheduleStaticRender();
    } else {
      frame = window.requestAnimationFrame(loop);
    }
  }

  function onMotionChange(event) {
    reduceMotion = event.matches;
    start();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (reduceMotion) scheduleStaticRender();
  }, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (reduceMotion || !isInView) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (reduceMotion) scheduleStaticRender();
  });
  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    if (reduceMotion) scheduleStaticRender();
  });
  window.addEventListener('blur', () => {
    pointer.active = false;
    if (reduceMotion) scheduleStaticRender();
  });
  document.addEventListener('visibilitychange', () => {
    isVisible = document.visibilityState === 'visible';
    start();
  });
  motionQuery.addEventListener('change', onMotionChange);

  const hero = document.querySelector('.hero');
  if (hero) {
    new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting;
      start();
    }).observe(hero);
  }

  resize();
  start();
})();

(function () {
  // Interactive two-layer board: a small ESP32-S3 flight logger, routed the way a real one would be.
  // Logical units are about 0.07 mm; the canvas scales them to fit.
  const board = document.getElementById('board');
  const cv = document.getElementById('pcb');
  if (!board || !cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let RM = motionQuery.matches;
  const TAU = Math.PI * 2;
  const sheen = board.querySelector('.sheen');
  const probe = document.getElementById('probe');
  const elNet = document.getElementById('probeNet');
  const elInfo = document.getElementById('probeInfo');
  const maskButtons = document.querySelectorAll('[data-mask]');
  const IDLE_TEXT = window.matchMedia('(hover: none)').matches
    ? 'Tap any trace to read it.'
    : 'Move over any trace to read it.';
  const LW = 720, LH = 440;

  /* ---------- netlist ---------- */
  const traces = [];
  const vias = []; // [x, y, net]
  function add(net, pts, o) { traces.push(Object.assign({ net, pts, w: 2.5, layer: 'F' }, o)); }
  function via(x, y, net) { vias.push([x, y, net || 'GND']); }
  // Short ground stub from a pad to a via into the pour and bottom plane.
  function gnd(from, pts) {
    add('GND', pts, { w: 3, info: 'Ground · stitched to the top pour and the bottom plane', from, to: 'GND' });
    const e = pts[pts.length - 1]; via(e[0], e[1]);
  }

  // USB-C in, with CC pull-downs and an ESD clamp on the data pair.
  const USB = 'USB 2.0 full speed · 90 Ω pair through the U5 ESD clamp, lengths matched within 1 mm';
  add('VBUS', [[68, 198], [86, 198], [130, 154], [130, 113], [154, 113]], { w: 5, info: '5 V from USB-C · feeds the LiPo charger', from: 'J1 USB-C', to: 'U6 MCP73831' });
  add('CC1', [[68, 222], [80, 222]], { info: '5.1 kΩ pull-down · tells a USB-C charger to supply 5 V', from: 'J1 CC1', to: 'R1' });
  add('CC2', [[68, 274], [80, 274]], { info: '5.1 kΩ pull-down · works with the cable either way up', from: 'J1 CC2', to: 'R2' });
  gnd('R1', [[92, 222], [102, 222]]);
  gnd('R2', [[92, 274], [102, 274]]);
  gnd('J1', [[68, 210], [78, 210]]);
  gnd('J1', [[68, 286], [78, 286]]);
  add('USB_D+', [[68, 244], [76, 244], [84, 236], [140, 236], [143, 233], [435, 233]], { info: USB, from: 'J1 USB-C', to: 'U1 GPIO20' });
  add('USB_D−', [[68, 250], [76, 250], [90, 264], [134, 264], [159, 239], [435, 239]], { info: USB, from: 'J1 USB-C', to: 'U1 GPIO19' });
  gnd('U5', [[94, 250], [90, 250]]);

  // LiPo charger, battery, regulator.
  const VBAT = { w: 5, info: 'LiPo battery · 3.0–4.2 V · charger output and regulator input', from: 'J3 / U6', to: 'U4 LDO' };
  gnd('C14', [[118, 138], [108, 138]]);
  add('PROG', [[154, 137], [154, 145]], { info: '2 kΩ to ground sets the charge current to 500 mA', from: 'U6 PROG', to: 'R10' });
  gnd('R10', [[154, 157], [154, 167]]);
  gnd('U6', [[184, 125], [196, 125]]);
  add('VBAT', [[184, 113], [244, 113]], VBAT);
  add('VBAT', [[196, 113], [196, 60]], VBAT);
  add('VBAT', [[244, 137], [226, 137], [226, 113]], { info: 'Regulator enable tied to its input, so it is always on', from: 'U4 EN', to: 'VBAT' });
  add('VBAT', [[226, 137], [226, 150]], { info: 'Top of the battery divider', from: 'VBAT', to: 'R7 100 kΩ' });
  gnd('J3', [[224, 60], [224, 74]]);
  gnd('C15', [[210, 125], [210, 135]]);
  gnd('U4', [[244, 125], [234, 125]]);
  const BAT = { info: 'Battery voltage ÷ 2 into the ADC · 100 kΩ / 100 kΩ divider', from: 'R7 / R8', to: 'U1 GPIO1 ADC' };
  add('BAT_SENSE', [[226, 162], [226, 176]], BAT);
  add('BAT_SENSE', [[226, 170], [242, 170]], BAT);
  via(242, 170, 'BAT_SENSE');
  add('BAT_SENSE', [[242, 170], [242, 207], [256, 221], [350, 221]], Object.assign({ layer: 'B' }, BAT, { info: BAT.info + ' · bottom layer' }));
  via(350, 221, 'BAT_SENSE');
  add('BAT_SENSE', [[350, 221], [435, 221]], BAT);
  gnd('R8', [[226, 188], [226, 200]]);

  // 3.3 V rail with decoupling at every supply pin.
  const V33 = (to) => ({ w: 3, info: '3.3 V rail · AP2112K regulator, 600 mA · decoupled at each pin', from: 'U4 LDO', to });
  add('+3V3', [[274, 113], [340, 113], [355, 128], [467, 128], [467, 136]], Object.assign(V33('U1 / R4'), { w: 4 }));
  gnd('C16', [[290, 125], [290, 135]]);
  add('+3V3', [[306, 167], [306, 113]], V33('U3 VDD'));
  add('+3V3', [[326, 167], [326, 113]], V33('U3 VDDIO'));
  gnd('C13', [[294, 150], [284, 150]]);
  add('+3V3', [[455, 128], [455, 165]], V33('U1 VDD3P3'));
  gnd('C1', [[443, 145], [433, 145]]);
  add('+3V3', [[420, 128], [420, 179], [435, 179]], V33('U1 VDD3P3_CPU'));
  gnd('C2', [[408, 160], [398, 160]]);
  via(380, 128, '+3V3');
  add('+3V3', [[380, 128], [380, 272], [394, 286]], { layer: 'B', w: 4, info: '3.3 V to the flash · drops to the bottom layer to pass under the USB pair', from: 'U4 LDO', to: 'U2 VCC' });
  via(394, 286, '+3V3');
  add('+3V3', [[382, 309], [394, 309], [394, 286]], V33('U2 VCC'));
  gnd('C5', [[406, 298], [416, 298]]);

  // Reset, crystal and RF.
  const EN = { info: 'Chip enable · 10 kΩ pull-up and 1 µF cap give a clean power-on reset', from: 'U1 CHIP_PU', to: 'R4 / C6' };
  add('EN', [[467, 165], [467, 148]], EN);
  add('EN', [[467, 156], [480, 156]], EN);
  gnd('C6', [[492, 156], [502, 156]]);
  add('XTAL_N', [[521, 165], [521, 147], [510, 136], [498, 136], [498, 126]], { w: 2, info: '40 MHz crystal · load cap C11 to ground', from: 'U1 XTAL_N', to: 'Y1 / C11' });
  add('XTAL_P', [[527, 165], [527, 141], [532, 136], [544, 136], [544, 126]], { w: 2, info: '40 MHz crystal · load cap C12 to ground', from: 'U1 XTAL_P', to: 'Y1 / C12' });
  gnd('C11', [[498, 114], [498, 104]]);
  gnd('C12', [[544, 114], [544, 104]]);
  gnd('Y1', [[510, 121], [510, 108]]);
  gnd('Y1', [[532, 121], [532, 108]]);
  add('RF_LNA', [[541, 179], [556, 179], [570, 165], [570, 126], [584, 112], [600, 112]], { w: 3.5, info: '2.4 GHz · short feed into the pi matching network (C9, L1, C10)', from: 'U1 LNA_IN', to: 'L1' });
  gnd('C9', [[582, 148], [592, 148]]);
  add('RF_ANT', [[614, 112], [676, 112], [676, 30]], { w: 3.5, info: '2.4 GHz meandered inverted-F antenna · 50 Ω feed, no copper underneath', from: 'L1', to: 'ANT1' });
  const arm = [[696, 124], [696, 30], [660, 30]];
  for (let x = 660, top = true; x > 564; top = !top) {
    arm.push([x, top ? 78 : 30]); x -= 16; arm.push([x, top ? 78 : 30]);
  }
  add('RF_ANT', arm, { w: 3.5, info: '2.4 GHz inverted-F antenna · shorted to ground at the corner, meandered to fit', from: 'ANT1', to: 'GND short' });
  via(696, 124);
  gnd('C10', [[640, 124], [640, 134]]);

  // IMU on SPI.
  const IMU = [
    ['IMU_CS', 'SPI chip select'], ['IMU_SCLK', 'SPI clock · 24 MHz'], ['IMU_SDI', 'SPI data in'],
    ['IMU_SDO', 'SPI data out'], ['IMU_INT1', 'Data-ready interrupt · 1 kHz'],
  ];
  IMU.forEach(([n, info], i) => add(n, [[435, 185 + 6 * i], [341, 185 + 6 * i]], { info, from: 'U1', to: 'U3 ICM-42688-P' }));
  gnd('U3', [[291, 197], [283, 197]]);

  // Quad SPI flash. Pins on the far side of the SOIC drop to the bottom layer.
  const Q = (info, pin) => ({ info: 'Quad SPI flash · ' + info, from: 'U1', to: 'U2 pin ' + pin });
  add('FLASH_IO3', [[449, 271], [449, 300], [422, 327], [382, 327]], Q('data 3 (HOLD pin) · 80 MHz', 7));
  add('FLASH_CLK', [[455, 271], [455, 306], [416, 345], [382, 345]], Q('clock · 80 MHz', 6));
  add('FLASH_IO0', [[461, 271], [461, 312], [410, 363], [382, 363]], Q('data 0 · 80 MHz', 5));
  function flashUnder(net, info, pin, topPts, bottomPts) {
    const o = Q(info, pin);
    add(net, topPts, o);
    const a = topPts[topPts.length - 1], b = bottomPts[bottomPts.length - 1];
    via(a[0], a[1], net);
    add(net, bottomPts, Object.assign({}, o, { layer: 'B', info: o.info + ' · bottom layer' }));
    via(b[0], b[1], net);
    add(net, [[b[0], b[1]], [322, b[1]]], o);
  }
  flashUnder('FLASH_IO2', 'data 2 (WP pin)', 3, [[479, 271], [479, 296]],
    [[479, 296], [479, 380], [471, 388], [304, 388], [296, 380], [296, 353], [304, 345], [306, 345]]);
  flashUnder('FLASH_IO1', 'data 1', 2, [[485, 271], [485, 282], [499, 296]],
    [[499, 296], [499, 388], [491, 396], [296, 396], [288, 388], [288, 335], [296, 327], [306, 327]]);
  flashUnder('FLASH_CS', 'chip select', 1, [[491, 271], [491, 278], [517, 304]],
    [[517, 304], [517, 396], [509, 404], [288, 404], [280, 396], [280, 317], [288, 309], [306, 309]]);
  gnd('U2', [[322, 363], [306, 363]]);

  // LEDs through their resistors, and the boot button.
  add('LED_STAT', [[541, 239], [598, 239]], { info: 'Status LED drive · send a signal to light D1', from: 'U1 GPIO', to: 'R5' });
  add('D1_A', [[612, 239], [652, 239]], { info: 'D1 anode · R5 limits the current', from: 'R5', to: 'D1 green LED' });
  gnd('D1', [[674, 239], [686, 239]]);
  add('LED_LOG', [[541, 251], [560, 251], [570, 261], [598, 261]], { info: 'Logging LED drive · send a signal to light D2', from: 'U1 GPIO', to: 'R6' });
  add('D2_A', [[612, 261], [652, 261]], { info: 'D2 anode · R6 limits the current', from: 'R6', to: 'D2 blue LED' });
  gnd('D2', [[674, 261], [686, 261]]);
  add('GPIO0', [[527, 271], [527, 318], [545, 336], [556, 336]], { info: 'Boot strap · hold BOOT while resetting to load firmware over USB', from: 'U1 GPIO0', to: 'SW1 BOOT' });
  gnd('SW1', [[556, 374], [546, 384]]);
  // Signals that light an LED pass through a resistor first.
  const chain = { LED_STAT: 'D1_A', LED_LOG: 'D2_A' };

  for (const t of traces) {
    t.segs = []; let tot = 0;
    for (let i = 0; i < t.pts.length - 1; i++) {
      const a = t.pts[i], b = t.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      t.segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], len, start: tot }); tot += len;
    }
    t.total = tot;
  }
  const frontTraces = traces.filter((t) => t.layer === 'F');
  const signalTraces = frontTraces.filter((t) => t.net !== 'GND');
  const netTraces = {};
  for (const t of traces) (netTraces[t.net] = netTraces[t.net] || []).push(t);

  /* ---------- parts ---------- */
  const comps = [
    { ref: 'U1', val: 'ESP32-S3', val2: 'QFN-56', type: 'qfn', dot: 'tr', x: 440, y: 170, w: 96, h: 96, lx: 420, ly: 254 },
    { ref: 'U2', val: 'W25Q128', type: 'soic8', x: 330, y: 300, w: 44, h: 72, lx: 330, ly: 378 },
    { ref: 'U3', val: '42688', type: 'lga', x: 296, y: 172, w: 40, h: 46, lx: 266, ly: 174 },
    { ref: 'U4', val: '2112', type: 'sot5', two: 'right', x: 250, y: 110, w: 18, h: 30, lx: 250, ly: 97 },
    { ref: 'U5', type: 'sot6', x: 100, y: 228, w: 20, h: 44, lx: 110, ly: 280 },
    { ref: 'U6', val: '7383', type: 'sot5', two: 'left', x: 160, y: 110, w: 18, h: 30, lx: 160, ly: 97 },
    { ref: 'J1', type: 'usbc', x: 10, y: 186, w: 46, h: 120, lx: 14, ly: 172 },
    { ref: 'J3', type: 'jst', x: 168, y: 18, w: 60, h: 32, lx: 234, ly: 24 },
    { ref: 'Y1', val: '40.000', type: 'xtal', x: 504, y: 115, w: 34, h: 27 },
    { ref: 'SW1', type: 'sw', x: 560, y: 330, w: 40, h: 50, lx: 570, ly: 386 },
    { ref: 'D1', type: 'led', a: [652, 239], b: [674, 239], tint: 'rgba(77,255,154,.55)', lx: 654, ly: 226 },
    { ref: 'D2', type: 'led', a: [652, 261], b: [674, 261], tint: 'rgba(57,169,255,.55)', lx: 654, ly: 268 },
    { ref: 'R5', type: 'res', a: [598, 239], b: [612, 239], lx: 597, ly: 226 },
    { ref: 'R6', type: 'res', a: [598, 261], b: [612, 261], lx: 597, ly: 268 },
    { ref: 'L1', type: 'ind', a: [600, 112], b: [614, 112] },
  ];
  const passive = (ref, type, a, b) => comps.push({ ref, type, a, b });
  [['R1', [80, 222], [92, 222]], ['R2', [80, 274], [92, 274]], ['R4', [467, 136], [467, 148]],
    ['R7', [226, 150], [226, 162]], ['R8', [226, 176], [226, 188]], ['R10', [154, 145], [154, 157]]]
    .forEach(([r, a, b]) => passive(r, 'res', a, b));
  [['C1', [455, 145], [443, 145]], ['C2', [420, 160], [408, 160]], ['C5', [394, 298], [406, 298]],
    ['C6', [480, 156], [492, 156]], ['C9', [570, 148], [582, 148]], ['C10', [640, 112], [640, 124]],
    ['C11', [498, 126], [498, 114]], ['C12', [544, 126], [544, 114]], ['C13', [306, 150], [294, 150]],
    ['C14', [130, 138], [118, 138]], ['C15', [210, 113], [210, 125]], ['C16', [290, 113], [290, 125]]]
    .forEach(([r, a, b]) => passive(r, 'cap', a, b));
  // Two-terminal parts get a bounding box from their pads.
  for (const c of comps) if (c.a) {
    c.x = Math.min(c.a[0], c.b[0]) - 3; c.y = Math.min(c.a[1], c.b[1]) - 3;
    c.w = Math.abs(c.a[0] - c.b[0]) + 6; c.h = Math.abs(c.a[1] - c.b[1]) + 6;
  }
  // Exposed pad thermal vias under U1.
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) via(474 + i * 14, 204 + j * 14);

  const holes = [[34, 34], [34, LH - 34], [LW - 34, LH - 34]];
  const antKeep = [552, 8, 160, 96];
  const silkKeep = [[56, LH - 36, 156, 14], [540, LH - 36, 112, 14]];

  const MASKS = {
    black:  { mask: '#101113', pour: '#1c1e23', trace: '#2a2e35', silk: 'rgba(236,232,220,.85)', edge: '#4a3f2a' },
    green:  { mask: '#0c3a21', pour: '#124d2c', trace: '#1d6c3d', silk: 'rgba(245,242,230,.9)', edge: '#6b5a2e' },
    purple: { mask: '#2a1745', pour: '#37205c', trace: '#4c2c7d', silk: 'rgba(245,242,234,.9)', edge: '#6b5a2e' },
  };
  const GOLD = '#c9a14a';
  const XR = { bg: '#001023', f: '#c83434', fpad: '#d9534f', b: '#4d7fc4', silk: '#f2eda1', edge: '#d0d2cd', via: '#c9c9c9', text: 'rgba(255,255,255,.62)' };
  let mask = 'black';

  function compPads(c) {
    const p = [];
    const x1 = c.x + c.w, y1 = c.y + c.h;
    if (c.type === 'qfn') {
      for (let i = 0; i < 14; i++) {
        const o = 9 + i * 6;
        p.push([c.x + o - 1.3, c.y - 5, 2.6, 7], [c.x + o - 1.3, y1 - 2, 2.6, 7], [c.x - 5, c.y + o - 1.3, 7, 2.6], [x1 - 2, c.y + o - 1.3, 7, 2.6]);
      }
      p.push([c.x + 22, c.y + 22, 52, 52]);
    } else if (c.type === 'soic8') {
      for (let i = 0; i < 4; i++) { const y = c.y + 9 + i * 18; p.push([c.x - 8, y - 3, 10, 6], [x1 - 2, y - 3, 10, 6]); }
    } else if (c.type === 'lga') {
      for (let i = 0; i < 5; i++) { const y = 185 + i * 6; p.push([c.x - 5, y - 1.3, 7, 2.6], [x1 - 2, y - 1.3, 7, 2.6]); }
      for (const x of [306, 326]) p.push([x - 1.3, c.y - 5, 2.6, 7], [x - 1.3, y1 - 2, 2.6, 7]);
    } else if (c.type === 'sot5' || c.type === 'sot6') {
      const ys = c.type === 'sot6' ? [c.y + 8, c.y + 22, c.y + 36] : [c.y + 3, c.y + 15, c.y + 27];
      ys.forEach((y, i) => {
        const mid = i === 1;
        if (!(mid && c.two === 'left')) p.push([c.x - 6, y - 2.5, 8, 5]);
        if (!(mid && c.two === 'right')) p.push([x1 - 2, y - 2.5, 8, 5]);
      });
    } else if (c.type === 'usbc') {
      for (const y of [198, 210, 222, 274, 286]) p.push([56, y - 2.5, 12, 5]);
      for (const y of [244, 250]) p.push([56, y - 1.5, 12, 3]);
    } else if (c.type === 'jst') {
      p.push([190, 54, 12, 12], [218, 54, 12, 12], [c.x - 6, c.y + 6, 8, 16], [x1 - 2, c.y + 6, 8, 16]);
    } else if (c.type === 'xtal') {
      for (const [x, y] of [[510, 121], [532, 121], [510, 136], [532, 136]]) p.push([x - 4, y - 3.5, 8, 7]);
    } else if (c.type === 'sw') {
      for (const [x, y] of [[556, 336], [604, 336], [556, 374], [604, 374]]) p.push([x - 4, y - 3, 8, 6]);
    } else if (c.a) {
      p.push([c.a[0] - 3, c.a[1] - 3, 6, 6], [c.b[0] - 3, c.b[1] - 3, 6, 6]);
    }
    return p;
  }

  function rand(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function distSeg(px, py, s) {
    const dx = s.bx - s.ax, dy = s.by - s.ay, l2 = dx * dx + dy * dy || 1;
    let u = ((px - s.ax) * dx + (py - s.ay) * dy) / l2; u = Math.max(0, Math.min(1, u));
    return Math.hypot(px - (s.ax + dx * u), py - (s.ay + dy * u));
  }
  function inRect(x, y, r, pad) { return x > r[0] - pad && x < r[0] + r[2] + pad && y > r[1] - pad && y < r[1] + r[3] + pad; }
  // A via can go here only if it clears every trace on both layers, every part and every keep-out.
  function clearOf(x, y, gap) {
    for (const t of traces) for (const s of t.segs) if (distSeg(x, y, s) < t.w / 2 + gap) return false;
    for (const c of comps) if (inRect(x, y, [c.x, c.y, c.w, c.h], gap + 6)) return false;
    for (const h of holes) if (Math.hypot(x - h[0], y - h[1]) < 26) return false;
    if (inRect(x, y, antKeep, 10)) return false;
    for (const r of silkKeep) if (inRect(x, y, r, 4)) return false;
    for (const v of vias) if (Math.hypot(x - v[0], y - v[1]) < 14) return false;
    return true;
  }
  // Stitching vias around the edge and a light sprinkle inside. Seeded so the board is the same every visit.
  (function () {
    const r = rand(11);
    for (let x = 56; x <= LW - 56; x += 26) { if (clearOf(x, 22, 6)) via(x, 22); if (clearOf(x, LH - 22, 6)) via(x, LH - 22); }
    for (let y = 56; y <= LH - 56; y += 26) { if (clearOf(22, y, 6)) via(22, y); if (clearOf(LW - 22, y, 6)) via(LW - 22, y); }
    for (let x = 50; x < LW - 40; x += 34) for (let y = 50; y < LH - 40; y += 34) {
      const jx = x + (r() - 0.5) * 12, jy = y + (r() - 0.5) * 12;
      if (r() < 0.15 && clearOf(jx, jy, 8)) via(jx, jy);
    }
  })();

  /* ---------- drawing ---------- */
  let W = 0, H = 0, dpr = 1, k = 1, baseFull = null, baseBare = null, xray = null;
  function mk() {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
    const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); return [c, g];
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); }
  function strokeT(g, t, color, extra, len) {
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = t.w + (extra || 0); g.strokeStyle = color;
    if (len == null) { poly(g, t.pts); g.stroke(); return; }
    if (len <= 0) return;
    g.beginPath(); g.moveTo(t.pts[0][0], t.pts[0][1]);
    for (const s of t.segs) {
      if (len >= s.start + s.len) { g.lineTo(s.bx, s.by); continue; }
      const f = (len - s.start) / (s.len || 1); g.lineTo(s.ax + (s.bx - s.ax) * f, s.ay + (s.by - s.ay) * f); break;
    }
    g.stroke();
  }
  function posAt(t, d) {
    for (const s of t.segs) { if (d <= s.start + s.len) { const f = (d - s.start) / (s.len || 1); return [s.ax + (s.bx - s.ax) * f, s.ay + (s.by - s.ay) * f]; } }
    const s = t.segs[t.segs.length - 1]; return [s.bx, s.by];
  }
  // Top-layer ground pour, cut back around every signal, pad and non-ground via.
  function pourLayer(fillStyle) {
    const [pc, pg] = mk();
    rr(pg, 16, 16, LW - 32, LH - 32, 10); pg.fillStyle = fillStyle; pg.fill();
    pg.globalCompositeOperation = 'destination-out'; pg.fillStyle = '#000'; pg.strokeStyle = '#000';
    for (const t of signalTraces) strokeT(pg, t, '#000', 10);
    for (const c of comps) for (const p of compPads(c)) pg.fillRect(p[0] - 4, p[1] - 4, p[2] + 8, p[3] + 8);
    for (const c of comps) if (!c.a) { rr(pg, c.x - 4, c.y - 4, c.w + 8, c.h + 8, 3); pg.fill(); }
    for (const v of vias) if (v[2] !== 'GND') { pg.beginPath(); pg.arc(v[0], v[1], 9, 0, TAU); pg.fill(); }
    pg.fillRect(antKeep[0], 0, LW - antKeep[0], antKeep[1] + antKeep[3]);
    for (const h of holes) { pg.beginPath(); pg.arc(h[0], h[1], 19, 0, TAU); pg.fill(); }
    for (const r of silkKeep) pg.fillRect(r[0] - 3, r[1] - 3, r[2] + 6, r[3] + 6);
    return pc;
  }
  function blit(g, c) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore(); }
  function text(g, s, x, y, size, color, align, weight) {
    g.font = (weight || 600) + ' ' + size + 'px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillText(s, x, y);
  }
  function drawVia(g, v, ring, hole) {
    g.beginPath(); g.arc(v[0], v[1], 3.6, 0, TAU); g.fillStyle = ring; g.fill();
    g.beginPath(); g.arc(v[0], v[1], 1.6, 0, TAU); g.fillStyle = hole; g.fill();
  }

  function drawBase(withTraces) {
    const M = MASKS[mask];
    const [c, g] = mk();
    rr(g, 8, 8, LW - 16, LH - 16, 16); g.fillStyle = M.mask; g.fill();
    g.lineWidth = 2; g.strokeStyle = M.edge; g.stroke();
    blit(g, pourLayer(M.pour));
    if (withTraces) {
      for (const t of frontTraces) strokeT(g, t, M.trace);
      g.globalAlpha = 0.35;
      for (const t of frontTraces) { g.save(); g.translate(-0.4, -0.5); strokeT(g, t, 'rgba(255,255,255,.18)', -t.w + 1); g.restore(); }
      g.globalAlpha = 1;
    }
    for (const cp of comps) for (const p of compPads(cp)) {
      g.fillStyle = GOLD; g.fillRect(p[0], p[1], p[2], p[3]);
      g.fillStyle = 'rgba(255,240,190,.35)'; g.fillRect(p[0], p[1], p[2], Math.min(1, p[3]));
    }
    for (const v of vias) drawVia(g, v, GOLD, '#060606');
    for (const h of holes) {
      g.beginPath(); g.arc(h[0], h[1], 12, 0, TAU); g.fillStyle = GOLD; g.fill();
      g.beginPath(); g.arc(h[0], h[1], 7, 0, TAU); g.fillStyle = '#050505'; g.fill();
    }
    drawBodies(g);
    drawSilk(g, M);
    return c;
  }

  function icBody(g, c, inset) {
    const x = c.x + (inset || 0), y = c.y + (inset || 0), w = c.w - 2 * (inset || 0), h = c.h - 2 * (inset || 0);
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#1b1c1f'); gr.addColorStop(1, '#0b0b0c');
    rr(g, x, y, w, h, 2); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.stroke();
    const dotX = c.dot === 'tr' ? x + w - 6 : x + 6;
    g.beginPath(); g.arc(dotX, y + 6, Math.min(2.2, w * 0.06), 0, TAU); g.fillStyle = 'rgba(255,255,255,.14)'; g.fill();
    if (c.val && w >= 36) {
      const fs = c.type === 'qfn' ? 9 : 6.5;
      text(g, c.val, x + w / 2, y + h / 2 - (c.val2 ? fs : fs / 2), fs, 'rgba(210,212,216,.42)', 'center', 600);
      if (c.val2) text(g, c.val2, x + w / 2, y + h / 2 + 3, 6, 'rgba(210,212,216,.3)', 'center', 500);
    } else if (c.val) {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(-Math.PI / 2);
      text(g, c.val, 0, -3, 5.5, 'rgba(210,212,216,.4)', 'center', 600); g.restore();
    }
  }
  function twoTerminal(g, c, ends, body) {
    const horiz = c.a[1] === c.b[1];
    const x0 = Math.min(c.a[0], c.b[0]) - 2, y0 = Math.min(c.a[1], c.b[1]) - 2;
    const len = Math.abs(horiz ? c.a[0] - c.b[0] : c.a[1] - c.b[1]) + 4, e = 2.5;
    g.fillStyle = ends;
    if (horiz) { g.fillRect(x0, y0 - 0.5, e, 5); g.fillRect(x0 + len - e, y0 - 0.5, e, 5); g.fillStyle = body; g.fillRect(x0 + e, y0 - 0.5, len - 2 * e, 5); }
    else { g.fillRect(x0 - 0.5, y0, 5, e); g.fillRect(x0 - 0.5, y0 + len - e, 5, e); g.fillStyle = body; g.fillRect(x0 - 0.5, y0 + e, 5, len - 2 * e); }
  }
  function drawBodies(g) {
    for (const c of comps) {
      if (c.type === 'qfn' || c.type === 'soic8' || c.type === 'lga') icBody(g, c, 0);
      else if (c.type === 'sot5' || c.type === 'sot6') icBody(g, c, 0);
      else if (c.type === 'usbc') {
        const gr = g.createLinearGradient(c.x, 0, c.x + c.w, 0); gr.addColorStop(0, '#6c7177'); gr.addColorStop(0.5, '#b9bec3'); gr.addColorStop(1, '#7c8187');
        rr(g, c.x, c.y, c.w, c.h, 5); g.fillStyle = gr; g.fill();
        rr(g, c.x + 6, c.y + 24, 12, c.h - 48, 4); g.fillStyle = '#1a1b1d'; g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8;
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(c.x + 22 + i * 6, c.y + 6); g.lineTo(c.x + 22 + i * 6, c.y + c.h - 6); g.stroke(); }
      } else if (c.type === 'jst') {
        rr(g, c.x, c.y, c.w, c.h, 2); g.fillStyle = '#e9e2cf'; g.fill();
        rr(g, c.x + 6, c.y + 6, c.w - 12, c.h - 14, 2); g.fillStyle = '#cfc6ae'; g.fill();
      } else if (c.type === 'xtal') {
        const gr = g.createLinearGradient(0, c.y, 0, c.y + c.h); gr.addColorStop(0, '#d4d8dc'); gr.addColorStop(1, '#8d9196');
        rr(g, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 3); g.fillStyle = gr; g.fill();
        text(g, c.val, c.x + c.w / 2, c.y + c.h / 2 - 3, 5.5, 'rgba(30,30,30,.65)', 'center', 600);
      } else if (c.type === 'sw') {
        const gr = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); gr.addColorStop(0, '#c5c9ce'); gr.addColorStop(1, '#7d8186');
        rr(g, c.x, c.y + 4, c.w, c.h - 8, 3); g.fillStyle = gr; g.fill();
        g.beginPath(); g.arc(c.x + c.w / 2, c.y + c.h / 2, 11, 0, TAU); g.fillStyle = '#151515'; g.fill();
        g.beginPath(); g.arc(c.x + c.w / 2 - 2, c.y + c.h / 2 - 2, 6, 0, TAU); g.fillStyle = 'rgba(255,255,255,.06)'; g.fill();
      } else if (c.type === 'led') {
        rr(g, c.a[0] + 3, c.a[1] - 4, c.b[0] - c.a[0] - 6, 8, 1.5); g.fillStyle = '#e9e4d6'; g.fill();
        g.fillStyle = c.tint; g.fillRect(c.a[0] + 7, c.a[1] - 2.5, c.b[0] - c.a[0] - 14, 5);
      } else if (c.type === 'res') twoTerminal(g, c, '#c4c8cc', '#151515');
      else if (c.type === 'cap') twoTerminal(g, c, '#c4c8cc', '#b39566');
      else if (c.type === 'ind') twoTerminal(g, c, '#c4c8cc', '#3d3a36');
    }
  }
  function drawSilk(g, M) {
    const S = M.silk;
    g.strokeStyle = S; g.lineWidth = 0.9;
    g.strokeRect(429, 159, 118, 118);
    g.beginPath(); g.arc(551, 163, 2, 0, TAU); g.fillStyle = S; g.fill();
    g.setLineDash([4, 3]); g.strokeRect(antKeep[0], antKeep[1] + 4, antKeep[2] - 4, antKeep[3] - 4); g.setLineDash([]);
    for (const c of comps) if (c.lx != null) text(g, c.ref, c.lx, c.ly, 7, S, 'left', 600);
    text(g, 'ANT1', antKeep[0] + 4, antKeep[1] + antKeep[3] - 12, 7, S);
    text(g, '+', 186, 64, 8, S, 'left', 600);
    text(g, 'BOOT', 580, 316, 6, S, 'center', 600);
    text(g, 'ZW-01  FLIGHT LOGGER', 60, LH - 34, 8, S, 'left', 600);
    text(g, 'REV C · 2026-10', 650, LH - 34, 7, S, 'right', 500);
  }

  // The CAD view inside the lens: both copper layers, courtyards and net names.
  function drawXray() {
    const [c, g] = mk();
    g.fillStyle = XR.bg; g.fillRect(0, 0, LW, LH);
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let x = 20; x < LW; x += 20) for (let y = 20; y < LH; y += 20) g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
    rr(g, 8, 8, LW - 16, LH - 16, 16); g.strokeStyle = XR.edge; g.lineWidth = 1.4; g.stroke();
    for (const t of traces) if (t.layer === 'B') strokeT(g, t, XR.b);
    const pat = document.createElement('canvas'); pat.width = pat.height = 8;
    const pp = pat.getContext('2d'); pp.strokeStyle = 'rgba(200,52,52,.42)'; pp.lineWidth = 1; pp.beginPath(); pp.moveTo(0, 8); pp.lineTo(8, 0); pp.stroke();
    blit(g, pourLayer(g.createPattern(pat, 'repeat')));
    g.globalAlpha = 0.92;
    for (const t of frontTraces) strokeT(g, t, XR.f);
    g.globalAlpha = 1;
    for (const cp of comps) for (const p of compPads(cp)) { g.fillStyle = XR.fpad; g.fillRect(p[0], p[1], p[2], p[3]); }
    for (const v of vias) drawVia(g, v, XR.via, XR.bg);
    for (const h of holes) { g.beginPath(); g.arc(h[0], h[1], 12, 0, TAU); g.strokeStyle = XR.edge; g.stroke(); g.beginPath(); g.arc(h[0], h[1], 7, 0, TAU); g.stroke(); }
    g.strokeStyle = XR.silk; g.lineWidth = 0.8;
    for (const cp of comps) {
      g.strokeRect(cp.x - 2, cp.y - 2, cp.w + 4, cp.h + 4);
      const lx = cp.lx != null ? cp.lx : cp.x, ly = cp.ly != null ? cp.ly : cp.y - 9;
      text(g, cp.ref, lx, ly, 6.5, XR.silk);
    }
    for (const t of traces) {
      if (t.net === 'GND') continue;
      let best = t.segs[0]; for (const s of t.segs) if (s.len > best.len) best = s;
      if (best.len < 34) continue;
      g.save(); g.translate((best.ax + best.bx) / 2, (best.ay + best.by) / 2);
      let ang = Math.atan2(best.by - best.ay, best.bx - best.ax); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
      g.rotate(ang); text(g, t.net, 0, -t.w / 2 - 5.5, 4.5, XR.text, 'center', 500); g.restore();
    }
    return c;
  }

  function buildBases() { baseBare = drawBase(false); baseFull = drawBase(true); }
  function build() { buildBases(); xray = drawXray(); }
  function resize() {
    const w = board.clientWidth; if (!w) return;
    W = w; H = board.clientHeight;
    // Cap the backing store so the board stays light on memory on retina screens.
    dpr = Math.min(window.devicePixelRatio || 1, 2, 1800 / W); k = dpr * W / LW;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    build(); render(0);
  }

  /* ---------- interaction ---------- */
  const ptr = { x: 0, y: 0, in: false };
  const lens = { x: LW / 2, y: LH / 2, a: 0 };
  let hover = null, intro = 1, introStarted = false, routedShown = -1;
  let pulses = [], ambient = 1.2, stream = 0, clock = 0, last = 0, running = false, visible = false, msgTimer = 0;
  const leds = {
    D1_A: { x: 663, y: 239, c: '77,255,154', base: 0.32, boost: 0 },
    D2_A: { x: 663, y: 261, c: '57,169,255', base: 0, boost: 0 },
  };

  function nearest(x, y) {
    let best = null, bd = 1e9;
    for (const t of traces) for (const s of t.segs) { const d = distSeg(x, y, s) - t.w / 2; if (d < bd) { bd = d; best = t; } }
    return bd < 7 ? best : null;
  }
  function setReadout(t) {
    if (t) {
      probe.classList.add('on');
      elNet.textContent = t.net;
      const route = document.createElement('b');
      route.textContent = t.from + ' → ' + t.to;
      elInfo.replaceChildren(route, ' · ' + t.info);
    } else {
      probe.classList.remove('on');
      elNet.textContent = 'PROBE';
      elInfo.textContent = IDLE_TEXT;
    }
  }
  function spawn(t, delay, speed) { pulses.push({ t, d: -(delay || 0) * (speed || 300), speed: speed || 300 }); }
  // A pulse reaching a resistor carries on to the LED; reaching the LED lights it.
  function arrive(t, fromClick) {
    if (leds[t.net]) leds[t.net].boost = 1.2;
    else if (chain[t.net] && fromClick) netTraces[chain[t.net]].forEach((n) => spawn(n, 0, 360));
  }
  function idleRender() { if (!running) render(0); }

  function toLogical(e) {
    const r = board.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
    return [u * LW, v * LH, u, v];
  }
  board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const [x, y, u, v] = toLogical(e);
    ptr.x = x; ptr.y = y; ptr.in = true;
    const t = nearest(x, y);
    if (t !== hover) { hover = t; setReadout(t); }
    sheen.style.setProperty('--sx', (u * 100).toFixed(1) + '%');
    sheen.style.setProperty('--sy', (v * 100).toFixed(1) + '%');
    if (!RM) board.style.transform = 'perspective(1400px) rotateX(' + ((0.5 - v) * 3).toFixed(2) + 'deg) rotateY(' + ((u - 0.5) * 4).toFixed(2) + 'deg)';
    idleRender();
  });
  board.addEventListener('pointerleave', (e) => {
    ptr.in = false; board.style.transform = '';
    // A tap leaves its net selected so touch users can read it.
    if (e.pointerType !== 'touch') { hover = null; setReadout(null); }
    idleRender();
  });
  board.addEventListener('pointerdown', (e) => {
    const touch = e.pointerType === 'touch';
    const [x, y] = toLogical(e);
    ptr.x = x; ptr.y = y;
    if (!touch) ptr.in = true;
    const t = nearest(x, y) || (touch ? null : hover);
    if (!t) {
      if (touch) { hover = null; setReadout(null); idleRender(); }
      return;
    }
    hover = t; setReadout(t);
    if (RM) {
      // No moving pulses with reduced motion: light the LED straight away, then let it go dark.
      const led = leds[t.net] || leds[chain[t.net]];
      if (led) { led.boost = 1.2; setTimeout(() => { led.boost = 0; idleRender(); }, 1200); }
    } else {
      netTraces[t.net].forEach((tr) => { spawn(tr, 0, 360); spawn(tr, 0.14, 360); spawn(tr, 0.28, 360); });
      pulses.forEach((p) => { if (p.t.net === t.net) p.click = true; });
    }
    idleRender();
  });

  maskButtons.forEach((b) => b.addEventListener('click', () => {
    mask = b.dataset.mask;
    maskButtons.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    buildBases(); render(0);
  }));

  /* ---------- render ---------- */
  function render(dt) {
    if (!baseFull) return;
    clock += dt;
    const M = MASKS[mask];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const routing = intro < 1;
    ctx.drawImage(routing ? baseBare : baseFull, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0);

    // First view: tracks route themselves in, then a design-rule check result.
    if (routing) {
      intro = Math.min(1, intro + dt / 2.4);
      let done = 0;
      frontTraces.forEach((t, i) => {
        const st = i / frontTraces.length * 0.62, f = Math.max(0, Math.min(1, (intro - st) / 0.36));
        if (f >= 1) done++;
        strokeT(ctx, t, M.trace, 0, t.total * f);
        if (f > 0 && f < 1) { const p = posAt(t, t.total * f); ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, TAU); ctx.fillStyle = 'rgba(255,230,160,.95)'; ctx.fill(); }
      });
      if (done !== routedShown && !hover) { routedShown = done; probe.classList.add('on'); elNet.textContent = 'ROUTING'; elInfo.textContent = 'Autorouter · ' + done + ' / ' + frontTraces.length + ' tracks'; }
      if (intro >= 1 && !hover) {
        elNet.textContent = 'DRC';
        const ok = document.createElement('b'); ok.textContent = traces.length + ' tracks, ' + vias.length + ' vias';
        elInfo.replaceChildren(ok, ' · 0 errors · 0 unconnected');
        msgTimer = 2.6;
      }
    } else if (msgTimer > 0) {
      msgTimer -= dt; if (msgTimer <= 0 && !hover) setReadout(null);
    }

    // Ambient signals, plus a steady stream on the net under the cursor.
    if (!RM && !routing && dt > 0) {
      ambient -= dt;
      if (ambient <= 0) { spawn(signalTraces[Math.floor(Math.random() * signalTraces.length)], 0, 140 + Math.random() * 80); ambient = 1 + Math.random() * 1.6; }
      if (hover) { stream -= dt; if (stream <= 0) { netTraces[hover.net].forEach((t) => spawn(t, 0, 220)); stream = 0.55; } }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]; p.d += p.speed * dt;
      if (p.d > p.t.total + 30) { arrive(p.t, p.click); pulses.splice(i, 1); continue; }
      if (p.d <= 0) continue;
      const blue = p.t.layer === 'B';
      for (let s = 8; s >= 0; s--) {
        const d = p.d - s * 3.6; if (d < 0 || d > p.t.total) continue;
        const q = posAt(p.t, d), a = (1 - s / 9) * 0.9;
        ctx.beginPath(); ctx.arc(q[0], q[1], 2 - s * 0.14, 0, TAU);
        ctx.fillStyle = blue ? 'rgba(150,200,255,' + a + ')' : 'rgba(255,236,170,' + a + ')'; ctx.fill();
      }
      if (p.d <= p.t.total) {
        const h = posAt(p.t, p.d), gr = ctx.createRadialGradient(h[0], h[1], 0, h[0], h[1], 11);
        gr.addColorStop(0, blue ? 'rgba(120,180,255,.5)' : 'rgba(255,214,110,.5)'); gr.addColorStop(1, 'rgba(255,214,110,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h[0], h[1], 11, 0, TAU); ctx.fill();
      }
    }

    // Layout lens
    const target = ptr.in ? 1 : 0;
    lens.a += (target - lens.a) * (RM ? 1 : Math.min(1, dt * 10));
    lens.x += (ptr.x - lens.x) * (RM || lens.a < 0.05 ? 1 : Math.min(1, dt * 14));
    lens.y += (ptr.y - lens.y) * (RM || lens.a < 0.05 ? 1 : Math.min(1, dt * 14));
    const R = 64 * lens.a;
    if (R > 1) {
      ctx.save(); ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, TAU); ctx.clip();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(xray, 0, 0); ctx.restore();
    }

    // Highlighted net
    if (hover) {
      ctx.save(); ctx.shadowBlur = 12 * dpr;
      const blue = hover.layer === 'B';
      ctx.shadowColor = blue ? 'rgba(110,170,255,.9)' : 'rgba(255,200,90,.9)';
      for (const t of netTraces[hover.net]) {
        const b = t.layer === 'B';
        strokeT(ctx, t, b ? 'rgba(160,205,255,.95)' : 'rgba(255,228,150,.95)', 0.6);
      }
      ctx.restore();
    }

    // LEDs: D1 glows steadily, D2 blinks like it's logging.
    for (const key in leds) {
      const L = leds[key];
      L.boost *= Math.exp(-dt * 2.2);
      const beat = key === 'D2_A' ? (RM ? 0.3 : Math.pow(Math.max(0, Math.sin(clock * 2.1)), 10) * 0.7) : 0;
      const lv = Math.min(1.4, L.base + beat + L.boost);
      if (lv > 0.02) {
        const gr = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 24);
        gr.addColorStop(0, 'rgba(' + L.c + ',' + (0.55 * lv).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + L.c + ',0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(L.x, L.y, 24, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.95, lv * 0.8).toFixed(3) + ')'; ctx.fillRect(L.x - 3.5, L.y - 1.2, 7, 2.4);
      }
    }

    // Lens reticle
    if (R > 1) {
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * lens.a) + ')';
      ctx.beginPath(); ctx.arc(lens.x, lens.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * lens.a) + ')';
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(lens.x + Math.cos(a) * (R - 6), lens.y + Math.sin(a) * (R - 6)); ctx.lineTo(lens.x + Math.cos(a) * (R + 3), lens.y + Math.sin(a) * (R + 3)); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(lens.x - 4, lens.y); ctx.lineTo(lens.x + 4, lens.y); ctx.moveTo(lens.x, lens.y - 4); ctx.lineTo(lens.x, lens.y + 4); ctx.stroke();
      text(ctx, 'LAYOUT · F.Cu + B.Cu', lens.x, lens.y - R - 11, 6.5, 'rgba(255,255,255,' + (0.7 * lens.a) + ')', 'center', 500);
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = last ? Math.max(0, Math.min(0.05, (now - last) / 1000)) : 0; last = now;
    render(dt);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || RM || !visible || document.hidden) return;
    running = true; last = 0; requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      if (!introStarted && !RM) { introStarted = true; intro = 0; routedShown = -1; }
      start();
    } else stop();
  }, { threshold: 0.25 }).observe(board);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  motionQuery.addEventListener('change', (e) => {
    RM = e.matches;
    if (RM) {
      stop(); pulses = []; board.style.transform = '';
      if (intro < 1) { intro = 1; if (!hover) setReadout(null); }
      render(0);
    } else start();
  });

  let resizeFrame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  }).observe(board);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (W) { build(); render(0); } });
  elInfo.textContent = IDLE_TEXT;
})();

(function () {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  toggle.hidden = false;

  function setOpen(open, returnFocus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    links.hidden = mobileQuery.matches && !open;
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) links.querySelector('a').focus();
  });
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.top')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });
  mobileQuery.addEventListener('change', () => {
    const focusWasInside = links.contains(document.activeElement);
    setOpen(false, mobileQuery.matches && focusWasInside);
  });
  setOpen(false);
})();

(function () {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Browsers with scroll-driven animations run the reveal and progress bar in CSS.
  const supports = (rule) => window.CSS && CSS.supports && CSS.supports(rule);
  const cssReveal = supports('animation-timeline: view()');
  const cssProgress = supports('animation-timeline: scroll()');
  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !motionQuery.matches && !cssReveal) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06 });
    revealElements.forEach((element) => {
      element.classList.add('reveal-pending');
      observer.observe(element);
    });
    motionQuery.addEventListener('change', (event) => {
      if (!event.matches) return;
      revealElements.forEach((element) => element.classList.remove('reveal-pending'));
      observer.disconnect();
    });
  }

  const hero = document.querySelector('.hero');
  let heroInView = true;
  function syncOrbit() {
    hero.classList.toggle('is-paused', !heroInView || document.hidden);
  }
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      syncOrbit();
    }).observe(hero);
    document.addEventListener('visibilitychange', syncOrbit);
    syncOrbit();
  }

  const progress = document.querySelector('.reading-progress');
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  const links = document.querySelectorAll('.nav-links a, .nav-cta');
  let scrollFrame = 0;
  function updateReadingPosition() {
    scrollFrame = 0;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = cssProgress && !motionQuery.matches
      ? ''
      : `scaleX(${available > 0 ? Math.min(Math.max(window.scrollY / available, 0), 1) : 0})`;
    const atBottom = available > 0 && window.scrollY >= available - 2;
    const current = atBottom
      ? sections.at(-1)
      : sections.filter((section) => section.getBoundingClientRect().top <= 150).at(-1);
    links.forEach((link) => {
      if (current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReadingPosition);
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  if (document.fonts) document.fonts.ready.then(scheduleUpdate);
  scheduleUpdate();
})();

(function () {
  const button = document.getElementById('copyEmail');
  const status = document.getElementById('copyStatus');
  if (!button || !status || !navigator.clipboard || !window.isSecureContext) return;
  const label = button.querySelector('.copy-label');
  const led = button.querySelector('.tx');
  const email = document.querySelector('.email');
  const address = 'hello@zachwhitehead.com';
  button.hidden = false;
  let resetTimer;
  let blinkTimer;

  // Flicker the TX light like a UART sending a burst.
  function blink() {
    clearInterval(blinkTimer);
    let count = 0;
    blinkTimer = setInterval(() => {
      led.classList.toggle('on');
      if (++count > 7) {
        clearInterval(blinkTimer);
        led.classList.remove('on');
      }
    }, 55);
  }

  function selectAddress() {
    if (!email || !email.firstChild) return;
    const range = document.createRange();
    range.selectNodeContents(email.firstChild);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  button.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    blink();
    try {
      await navigator.clipboard.writeText(address);
      label.textContent = 'Copied';
      status.textContent = 'Email address copied to clipboard.';
    } catch {
      label.textContent = 'Copy email';
      selectAddress();
      status.textContent = 'Copy unavailable. The address above is selected so you can copy it yourself.';
    }
    resetTimer = setTimeout(() => {
      label.textContent = 'Copy email';
      status.textContent = '';
    }, 4000);
  });
})();

(function () {
  // Small hover details: magnetic buttons, trace underlines and decoding nav labels.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const canAnimate = () => fineQuery.matches && !motionQuery.matches;

  // Magnetic buttons lean toward a nearby cursor; the label moves less, which reads as depth.
  const magnets = Array.from(document.querySelectorAll('[data-magnetic]'));
  let px = -1e4;
  let py = -1e4;
  let magFrame = 0;
  function pull() {
    magFrame = 0;
    const active = canAnimate();
    magnets.forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.2;
      const ox = parseFloat(el.style.getPropertyValue('--mx')) || 0;
      const oy = parseFloat(el.style.getPropertyValue('--my')) || 0;
      const r = el.getBoundingClientRect();
      const dx = px - (r.left - ox + r.width / 2);
      const dy = py - (r.top - oy + r.height / 2);
      const near = active && Math.abs(dx) < r.width / 2 + 60 && Math.abs(dy) < r.height / 2 + 44;
      el.style.setProperty('--mx', near ? `${(dx * strength).toFixed(1)}px` : '0px');
      el.style.setProperty('--my', near ? `${(dy * strength * 1.2).toFixed(1)}px` : '0px');
      el.style.setProperty('--lx', near ? `${(dx * strength * 0.4).toFixed(1)}px` : '0px');
      el.style.setProperty('--ly', near ? `${(dy * strength * 0.45).toFixed(1)}px` : '0px');
    });
  }
  function schedulePull() {
    if (!magFrame) magFrame = requestAnimationFrame(pull);
  }
  function releaseAll() {
    px = -1e4;
    py = -1e4;
    schedulePull();
  }
  if (magnets.length) {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      px = event.clientX;
      py = event.clientY;
      schedulePull();
    }, { passive: true });
    window.addEventListener('scroll', () => { if (px > -1e4) schedulePull(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', releaseAll);
    window.addEventListener('blur', releaseAll);
  }

  // Link underlines drawn as a copper trace with a 45° jog that lands on a via.
  const NS = 'http://www.w3.org/2000/svg';
  document.querySelectorAll('.text-link, .email, .social-list a').forEach((link) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'trace-ul');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('pathLength', '1');
    const via = document.createElementNS(NS, 'circle');
    via.setAttribute('r', '3');
    svg.append(path, via);
    link.classList.add('has-trace');
    link.append(svg);
    const shape = () => {
      const w = link.offsetWidth;
      if (!w) return;
      svg.setAttribute('width', w + 16);
      svg.setAttribute('height', 14);
      svg.setAttribute('viewBox', `0 0 ${w + 16} 14`);
      path.setAttribute('d', `M0 3H${w - 10}L${w - 2} 11H${w + 6}`);
      via.setAttribute('cx', w + 9);
      via.setAttribute('cy', 11);
    };
    shape();
    if ('ResizeObserver' in window) new ResizeObserver(shape).observe(link);
  });

  // Nav labels flicker through glyphs and settle, like a terminal resolving a value.
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>_';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const label = link.textContent;
    let token = 0;
    link.setAttribute('aria-label', label);
    const run = () => {
      if (!canAnimate()) return;
      const mine = ++token;
      let frame = 0;
      const step = () => {
        if (mine !== token) return;
        frame++;
        link.textContent = label
          .split('')
          .map((ch, i) => (i < frame / 2 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join('');
        if (frame / 2 < label.length) setTimeout(step, 28);
        else link.textContent = label;
      };
      step();
    };
    link.addEventListener('pointerenter', run);
    link.addEventListener('focus', run);
  });
})();
