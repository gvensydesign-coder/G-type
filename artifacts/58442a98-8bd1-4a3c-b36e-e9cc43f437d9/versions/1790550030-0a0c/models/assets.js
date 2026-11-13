/**
 * Ассеты v5 — по листу «камни / алтарь / часовня / утварь» (2026-09-27).
 *
 * Регистрирует:
 *   window.LPK_ASSETS — библиотека одиночных ассетов для конструктора мира:
 *     { id, name, cat, footprint:[w,d], heightM, seed, build(K) → Object3D | {group, update} }
 *   виды кита: «Камни» (все 10 камней), «Алтарь» (рунная площадка), «Часовня», «Утварь» (все предметы)
 *
 * Все ассеты — в корне footprint (0..w, 0..d), как остальные модели кита.
 * Красные руны светятся ночью по общей настройке красного свечения (Лесовик), свечи горят всегда.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);
  const lib = (window.LPK_ASSETS = window.LPK_ASSETS || []);
  const LES = () => window.LPK_LES;
  const NAT = (K) => window.LPK_NATURE(K);

  const C = {
    iron: '#2d2c2a', ironLight: '#4a4845', gold: '#d9a73a', goldDark: '#a8781f', wax: '#e8dcc0', red: '#8f3527', redDark: '#6e2a22',
    stoneWarm: '#7d7a70', bone: '#cdc3aa', boneDark: '#a99c80', horn: '#3b342c', leaf: '#5f7d36', leafDark: '#4a6630', dryWood: '#6b5a44',
  };

  // ---------- руны: штрихи в квадрате [-0.5..0.5]×[-1..1] ----------
  const GLYPHS = {
    bind: [[0, -1, 0, 1], [-0.45, 0.6, 0.45, -0.2], [0.45, 0.6, -0.45, -0.2], [-0.45, -0.2, 0, -0.8], [0.45, -0.2, 0, -0.8]],
    algiz: [[0, -1, 0, 1], [0, 0.2, -0.45, 0.8], [0, 0.2, 0.45, 0.8]],
    tyr: [[0, -1, 0, 1], [0, 1, -0.45, 0.5], [0, 1, 0.45, 0.5]],
    othala: [[0, -0.2, -0.45, 0.35], [0, -0.2, 0.45, 0.35], [-0.45, 0.35, 0, 0.9], [0.45, 0.35, 0, 0.9], [0, -0.2, -0.4, -1], [0, -0.2, 0.4, -1]],
    kaun: [[0.3, 1, -0.3, 0], [-0.3, 0, 0.3, -1]],
    sowilo: [[0.4, 1, -0.4, 0.2], [-0.4, 0.2, 0.4, -0.2], [0.4, -0.2, -0.4, -1]],
    fehu: [[-0.3, -1, -0.3, 1], [-0.3, 0.5, 0.4, 1], [-0.3, 0, 0.4, 0.5]],
  };
  const GLYPH_KEYS = Object.keys(GLYPHS);
  /** Руна на плоскости: центр (x,y,z), нормаль плоскости — поворот ry (нормаль = (sin ry, 0, cos ry)), высота 2s. */
  function rune(K, E, x, y, z, s, ry, kind = 'bind', hex = '#ff3a22', lean = 0) {
    const { T, M, part } = K;
    for (const [x1, y1, x2, y2] of GLYPHS[kind] || GLYPHS.bind) {
      const dx = (x2 - x1) * s, dy = (y2 - y1) * s, len = Math.hypot(dx, dy) + s * 0.1;
      const u = (x1 + x2) / 2 * s, v = (y1 + y2) / 2 * s;
      E.push(part(new T.BoxGeometry(s * 0.13, len, 0.02), hex, {
        m: M(x + u * Math.cos(ry), y + v, z - u * Math.sin(ry), lean, ry, Math.atan2(-dx, dy)), jitter: 0, ao: false, vary: 0,
      }));
    }
  }
  /** Стоячий камень: брус с сужением кверху, срезанной макушкой и мхом. */
  function slab(K, L, x, z, w, d, h, ry = 0, lean = 0, o = {}) {
    const { T, PAL, M, part, rand } = K;
    const g = new T.BoxGeometry(w, h, d, 2, 4, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / h + 0.5, k = 1 - y * (o.taper ?? 0.35);
      p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
      if (y > 0.99) p.setY(i, p.getY(i) - (p.getX(i) / w) * h * (o.cut ?? 0.12) + (rand() - 0.5) * 0.04);
    }
    L.push(part(g, o.hex || (rand() < 0.3 ? PAL.stoneDark : PAL.stone), { m: M(x, h / 2 - 0.08, z, lean, ry, (rand() - 0.5) * 0.05), jitter: Math.min(w, d) * 0.08, tex: 'stone', moss: o.moss ?? 0.45, vary: 0.1 }));
  }
  /** Свечи: воск, потёки, пламя (светится всегда, мерцает) и один огонь в пуле. */
  function candles(K, g, L, pts) {
    const { T, M, part, rand } = K;
    const F = [];
    pts.forEach(([x, y, z, h = 0.18]) => {
      L.push(part(new T.CylinderGeometry(0.045, 0.055, h, 7), C.wax, { m: M(x, y + h / 2, z), jitter: 0.004, ao: false, vary: 0.04 }));
      for (let k = 0; k < 3; k++) { const a = rand() * 6.28, ln = 0.04 + rand() * 0.1; L.push(part(new T.CylinderGeometry(0.012, 0.018, ln, 4), C.wax, { m: M(x + Math.cos(a) * 0.05, y + h - ln / 2, z + Math.sin(a) * 0.05), jitter: 0, ao: false })); }
      F.push(part(new T.ConeGeometry(0.028, 0.1, 5), '#ffb24a', { m: M(x, y + h + 0.06, z), jitter: 0, ao: false, vary: 0 }));
      F.push(part(new T.IcosahedronGeometry(0.024, 0), '#ffb24a', { m: M(x, y + h + 0.025, z), jitter: 0, ao: false, vary: 0 }));
    });
    const mat = new T.MeshStandardMaterial({ color: K.lin('#3a1a08'), emissive: K.lin('#ffb24a'), emissiveIntensity: 3, roughness: 1, metalness: 0, flatShading: true });
    g.add(new T.Mesh(K.merge(F), mat));
    const [x0, y0, z0, h0 = 0.18] = pts[0];
    const l = K.addGlowLight(g, x0, y0 + h0 + 0.15, z0 + 0.1, 0.9, 4);
    l.color = 0xffa04a; l.prio = 1;
    const flick = (t) => 1 + Math.sin(t * 11.3) * 0.12 + Math.sin(t * 27.1 + 0.7) * 0.07;
    l.dyn = (glow, t) => (0.35 + glow) * 0.9 * flick(t);
    return (t) => { const n = K.view ? Math.max(0, (K.view.state.time - 0.25) / 0.75) : 0.4; mat.emissiveIntensity = (2.2 + n * 2) * flick(t); };
  }
  /** Бычий череп с изогнутыми рогами (морда по +Z). */
  function bullSkull(K, L, E, x, y, z, s, ry, o = {}) {
    const { T, M, part } = K;
    const G = [];
    G.push(part(new T.IcosahedronGeometry(0.2 * s, 1), C.bone, { m: M(0, 0, 0, 0, 0, 0, new T.Vector3(1.1, 0.8, 1)), jitter: 0.012 * s, ao: false, vary: 0.06 }));
    G.push(part(new T.CylinderGeometry(0.07 * s, 0.13 * s, 0.42 * s, 6), C.bone, { m: M(0, -0.08 * s, 0.26 * s, Math.PI / 2 + 0.4, 0, 0), jitter: 0.008 * s, ao: false, vary: 0.06 }));
    for (const sx of [-1, 1]) {
      G.push(part(new T.BoxGeometry(0.08 * s, 0.07 * s, 0.04 * s), '#1d1a17', { m: M(0.09 * sx * s, 0.02 * s, 0.17 * s), jitter: 0, ao: false, vary: 0 }));
      if (o.eyes && E) E.push(part(new T.IcosahedronGeometry(0.03 * s, 0), '#ff3a22', { m: M(0.09 * sx * s, 0.02 * s, 0.175 * s), jitter: 0, ao: false, vary: 0 }));
      let prev = new T.Vector3(0.16 * sx * s, 0.06 * s, -0.02 * s);
      for (let k = 1; k <= 4; k++) { // рог: 4 колена вбок, вверх и вперёд
        const t = k / 4, nx = new T.Vector3((0.16 + 0.42 * t) * sx * s, (0.06 + 0.12 * t + 0.26 * t * t) * s, (-0.02 + 0.12 * t * t) * s);
        const dir = nx.clone().sub(prev), len = dir.length();
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
        const m = new T.Matrix4().compose(prev.clone().add(nx).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1));
        G.push(part(new T.CylinderGeometry(0.035 * s * (1.1 - t * 0.8), 0.05 * s * (1.1 - (k - 1) / 4 * 0.8), len, 6), k > 2 ? C.horn : C.boneDark, { m, jitter: 0, ao: false, vary: 0.05 }));
        prev = nx;
      }
    }
    if (o.mark && E) rune(K, E, 0, 0.1 * s, 0.2 * s, 0.07 * s, 0, 'othala', '#ff3a22', -0.5);
    if (o.cloth) G.push(part(new T.CylinderGeometry(0.19 * s, 0.2 * s, 0.1 * s, 8, 1, true), C.red, { m: M(0, 0, 0.1 * s, Math.PI / 2 + 0.3, 0, 0), jitter: 0.01 * s, tex: 'cloth', ao: false }));
    const mat = new T.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    G.forEach((gg) => { gg.applyMatrix4(mat); L.push(gg); });
  }
  /** Бочка: клёпки, выпуклый бок, обручи, крышка. */
  function barrel(K, L, x, y, z, r = 0.3, h = 0.8, o = {}) {
    const { T, PAL, M, part } = K;
    const geo = new T.CylinderGeometry(r, r, h, 12, 4, !!o.open);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i), f = 1 + 0.1 * (1 - (yy / (h / 2)) ** 2); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    const rot = o.lying ? [0, o.ry || 0, Math.PI / 2] : [0, o.ry || 0, 0];
    L.push(part(geo, o.hex || PAL.wood, { m: M(x, y, z, ...rot), tex: 'wood', axis: o.lying ? [1, 0, 0] : [0, 1, 0], jitter: 0.004, vary: 0.1, moss: 0.15 }));
    for (const k of [-0.38, 0, 0.38]) {
      const rr = r * (k === 0 ? 1.1 : 1.04) + 0.012;
      if (o.lying) L.push(part(new T.TorusGeometry(rr, 0.018, 3, 12), PAL.iron, { m: M(x + Math.cos(o.ry || 0) * k * h, y, z - Math.sin(o.ry || 0) * k * h, 0, (o.ry || 0) + Math.PI / 2, 0), jitter: 0, ao: false }));
      else L.push(part(new T.TorusGeometry(rr, 0.018, 3, 12), PAL.iron, { m: M(x, y + k * h, z, Math.PI / 2, 0, 0), jitter: 0, ao: false }));
    }
    if (!o.open && !o.lying) L.push(part(new T.CylinderGeometry(r * 0.94, r * 0.94, 0.03, 12), PAL.woodDark, { m: M(x, y + h / 2 - 0.01, z), tex: 'wood', axis: [1, 0, 0], jitter: 0 }));
  }
  /** Сундук: корпус, полукруглая крышка, железные полосы, замок. */
  function chest(K, L, E, x, z, o = {}) {
    const { T, PAL, M, part, rand } = K;
    const w = o.w ?? 0.9, d = o.d ?? 0.55, h = o.h ?? 0.45;
    L.push(part(new T.BoxGeometry(w, h, d), o.hex || PAL.woodDark, { m: M(x, h / 2, z), tex: 'wood', axis: [1, 0, 0], jitter: 0.008, vary: 0.1, moss: 0.1 }));
    const lid = new T.CylinderGeometry(d / 2, d / 2, w, 8, 1, false, 0, Math.PI);
    const open = o.open;
    let lm = M(x, h, z, 0, 0, Math.PI / 2); // половина цилиндра: ось вдоль X, выпуклостью вверх
    if (open) lm = new T.Matrix4().makeTranslation(0, h, z - d / 2).multiply(new T.Matrix4().makeRotationX(-1.9)).multiply(new T.Matrix4().makeTranslation(0, -h, -(z - d / 2))).multiply(lm);
    L.push(part(lid, o.hex || PAL.woodDark, { m: lm, tex: 'wood', axis: [0, 1, 0], jitter: 0.006 }));
    for (const k of [-0.36, 0, 0.36]) {
      L.push(part(new T.BoxGeometry(0.06, h + 0.01, d + 0.02), PAL.iron, { m: M(x + k * w, h / 2, z), jitter: 0, ao: false }));
      if (!open) L.push(part(new T.CylinderGeometry(d / 2 + 0.012, d / 2 + 0.012, 0.06, 8, 1, true, 0, Math.PI), PAL.iron, { m: M(x + k * w, h, z, 0, 0, Math.PI / 2), jitter: 0, ao: false }));
    }
    L.push(part(new T.BoxGeometry(0.14, 0.16, 0.03), PAL.iron, { m: M(x, h - 0.06, z + d / 2 + 0.015), jitter: 0 }));
    L.push(part(new T.TorusGeometry(0.05, 0.012, 3, 8), PAL.iron, { m: M(x, h - 0.16, z + d / 2 + 0.03), jitter: 0, ao: false }));
    if (o.rune && E) rune(K, E, x - w * 0.22, h * 0.55, z + d / 2 + 0.012, 0.1, 0, 'bind', '#a3342a');
    if (o.cloth) { const H = LES().kitHelpers(K); o.R && H.rag(o.R, new T.Vector3(x + w * 0.3, h + 0.02, z + d / 2 + 0.02), 0.4, 0.1, 0); }
    if (open) { // золото горкой и россыпью
      for (let k = 0; k < 26; k++) L.push(part(new T.CylinderGeometry(0.045, 0.045, 0.012, 7), rand() < 0.5 ? C.gold : C.goldDark, { m: M(x + (rand() - 0.5) * w * 0.8, h - 0.02 + rand() * 0.1, z + (rand() - 0.5) * d * 0.7, (rand() - 0.5) * 0.8, rand() * 3, (rand() - 0.5) * 0.8), jitter: 0, ao: false, vary: 0.1 }));
      L.push(part(new T.SphereGeometry(w * 0.42, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), C.goldDark, { m: M(x, h - 0.08, z, 0, 0, 0, new T.Vector3(1, 0.35, 0.55)), jitter: 0.01, ao: false }));
      for (let k = 0; k < 12; k++) { const a = rand() * 6.28, rr = 0.3 + rand() * 0.5; L.push(part(new T.CylinderGeometry(0.045, 0.045, 0.012, 7), C.gold, { m: M(x + Math.cos(a) * rr * w, 0.01, z + Math.abs(Math.sin(a)) * rr * 0.9 + d * 0.4, 0, rand() * 3, 0), jitter: 0, ao: false })); }
    }
  }
  /** Ящик: доски, рамка, опционально руна. */
  function crate(K, L, E, x, z, s = 0.8, o = {}) {
    const { T, PAL, M, part, rand } = K;
    for (let i = 0; i < 4; i++) L.push(part(new T.BoxGeometry(s, s / 4 - 0.015, s - 0.02), rand() < 0.3 ? PAL.woodLight : PAL.wood, { m: M(x, s / 8 + i * s / 4, z), tex: 'wood', axis: [1, 0, 0], jitter: 0.006, vary: 0.1, moss: 0.1 }));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L.push(part(new T.BoxGeometry(0.07, s + 0.02, 0.07), PAL.woodDark, { m: M(x + dx * (s / 2 - 0.02), s / 2, z + dz * (s / 2 - 0.02)), tex: 'wood', axis: [0, 1, 0], jitter: 0.004 }));
    L.push(part(new T.BoxGeometry(s + 0.02, 0.06, s + 0.02), PAL.woodDark, { m: M(x, s + 0.01, z), tex: 'wood', axis: [1, 0, 0], jitter: 0.004 }));
    if (o.rune && E) rune(K, E, x, s * 0.5, z + s / 2 + 0.012, 0.14, 0, 'othala', '#a3342a');
    else L.push(part(new T.BoxGeometry(0.06, s * 1.2, 0.02), PAL.woodDark, { m: M(x, s / 2, z + s / 2 + 0.01, 0, 0, 0.78), jitter: 0 }));
  }
  const tuftsAround = (K, L, w, d, n = 8) => { for (let k = 0; k < n; k++) K.tuft(L, 0.15 + K.rand() * (w - 0.3), 0, 0.15 + K.rand() * (d - 0.3), 3, 0.25 + K.rand() * 0.2); };

  // =====================================================================
  // КАМНИ
  // =====================================================================
  const STONES = {
    rock_cluster: { name: 'Замшелые валуны', fp: [2, 2], h: 1.2, build(K, L) { const N = NAT(K); N.boulder(L, 0.9, -0.1, 1.0, 0.75, { moss: 0.7 }); N.boulder(L, 1.45, -0.1, 0.7, 0.5, { moss: 0.6 }); N.boulder(L, 0.5, -0.1, 1.5, 0.42); K.fern(L, 1.5, 0, 1.5, 0.7); tuftsAround(K, L, 2, 2, 8); } },
    rune_menhir: { name: 'Менгир с руной', fp: [1.5, 1.5], h: 2.1, build(K, L, E) { slab(K, L, 0.75, 0.75, 0.75, 0.45, 2.1, 0.1, 0.03); rune(K, E, 0.75 + 0.02, 1.15, 0.75 + 0.2, 0.22, 0.1, 'bind', '#ff3a22'); const N = NAT(K); N.boulder(L, 0.3, -0.05, 1.2, 0.24); N.boulder(L, 1.2, -0.05, 1.25, 0.2); tuftsAround(K, L, 1.5, 1.5, 7); } },
    rock_spire: { name: 'Скальный останец', fp: [2, 2], h: 2.3, build(K, L) { for (const [x, z, w, d, h, ry, lean] of [[1.0, 1.0, 0.7, 0.6, 2.3, 0.2, 0.04], [0.55, 1.2, 0.5, 0.5, 1.5, -0.3, -0.08], [1.45, 0.75, 0.55, 0.45, 1.3, 0.6, 0.1], [0.75, 0.55, 0.45, 0.4, 0.9, 1.1, -0.1], [1.4, 1.4, 0.4, 0.35, 0.7, 0.3, 0.12]]) slab(K, L, x, z, w, d, h, ry, lean, { moss: 0.6, taper: 0.45 }); K.fern(L, 0.4, 0, 0.5, 0.7); K.fern(L, 1.7, 0, 1.6, 0.6); tuftsAround(K, L, 2, 2, 6); } },
    cloth_obelisk: { name: 'Обелиск с тканью', fp: [1.5, 1.5], h: 2.6, build(K, L, E, R) {
      const { T, M, part } = K; const H = LES().kitHelpers(K);
      slab(K, L, 0.75, 0.75, 0.36, 0.3, 2.3, 0.3, 0, { taper: 0.25, cut: 0 });
      L.push(part(new T.ConeGeometry(0.2, 0.35, 4), K.PAL.stone, { m: M(0.75, 2.36, 0.75, 0, 0.3 + Math.PI / 4, 0), tex: 'stone', jitter: 0.01 }));
      for (const [y, c] of [[1.55, C.red], [1.72, C.redDark]]) L.push(part(new T.CylinderGeometry(0.23, 0.24, 0.13, 8, 1, true), c, { m: M(0.75, y, 0.75, 0.05, 0.3, 0), tex: 'cloth', jitter: 0.012, ao: false }));
      for (let k = 0; k < 3; k++) H.rag(R, new T.Vector3(0.75 + (k - 1) * 0.12, 1.6, 0.9), 0.5 + k * 0.15, 0.08, 0.2 * k);
      const N = NAT(K); N.boulder(L, 0.4, -0.05, 1.1, 0.3); N.boulder(L, 1.15, -0.05, 1.05, 0.26); N.boulder(L, 1.1, -0.05, 0.35, 0.22); tuftsAround(K, L, 1.5, 1.5, 6);
    } },
    dolmen: { name: 'Дольмен', fp: [2.5, 2], h: 1.5, build(K, L) {
      const { T, PAL, M, part } = K;
      slab(K, L, 0.6, 1.0, 0.5, 0.45, 1.25, 0.1, 0.03, { taper: 0.15, cut: 0 }); slab(K, L, 1.9, 1.0, 0.55, 0.45, 1.2, -0.1, -0.03, { taper: 0.15, cut: 0 });
      L.push(part(new T.BoxGeometry(2.1, 0.28, 1.0, 3, 1, 2), PAL.stoneDark, { m: M(1.25, 1.3, 1.0, 0.03, 0.05, 0.05), tex: 'stone', moss: 0.75, jitter: 0.06 }));
      const N = NAT(K); N.boulder(L, 1.25, -0.1, 1.6, 0.25); N.boulder(L, 0.2, -0.1, 0.4, 0.22); tuftsAround(K, L, 2.5, 2, 10); K.fern(L, 2.2, 0, 1.7, 0.6);
    } },
    stone_ruin: { name: 'Разрушенный круг', fp: [2, 2], h: 1.1, build(K, L, E) {
      const H = LES().kitHelpers(K);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.3, h = 0.4 + K.rand() * 0.7; slab(K, L, 1 + Math.cos(a) * 0.7, 1 + Math.sin(a) * 0.7, 0.28, 0.24, h, -a, (K.rand() - 0.5) * 0.3, { cut: 0.3 }); }
      H.placeSkull(L, null, 1.0, 0.12, 1.0, 0.6, 0.65, 0);
      for (let k = 0; k < 8; k++) K.rock(L, 0.3 + K.rand() * 1.4, 0, 0.3 + K.rand() * 1.4, 0.08 + K.rand() * 0.07, K.PAL.stoneDark);
      tuftsAround(K, L, 2, 2, 7);
    } },
    rune_stone_candle: { name: 'Рунный камень со свечой', fp: [1.6, 1.6], h: 1.5, build(K, L, E, R, g, U) {
      const { T, PAL, M, part } = K; const H = LES().kitHelpers(K);
      L.push(part(new T.IcosahedronGeometry(1, 1), PAL.stone, { m: M(0.8, 0.6, 0.75, 0, 0.2, 0, new T.Vector3(0.55, 0.78, 0.42)), tex: 'stone', moss: 0.5, jitter: 0.05 }));
      rune(K, E, 0.82, 0.78, 0.75 + 0.4, 0.18, 0.1, 'othala', '#ff3a22');
      const pts = H.rope(L, new T.Vector3(0.35, 0.95, 1.0), new T.Vector3(1.25, 0.95, 1.0), 0.15, 5);
      pts.slice(1, -1).forEach((p, i) => (i % 2 ? H.charm(L, R, p, 0.15) : H.rag(R, p, 0.35, 0.07, 0)));
      U.push(candles(K, g, L, [[1.25, 0, 1.35, 0.2], [1.4, 0, 1.2, 0.12]]));
      H.boneBit(L, 0.4, 0.04, 1.3, 0.28, 0.6); tuftsAround(K, L, 1.6, 1.6, 6);
    } },
    standing_stones: { name: 'Стоячие камни с оберегами', fp: [3, 1.5], h: 2.1, build(K, L, E, R) {
      const { T } = K; const H = LES().kitHelpers(K);
      const xs = [0.45, 1.15, 1.9, 2.55], hs = [1.7, 2.1, 1.5, 1.9];
      xs.forEach((x, i) => slab(K, L, x, 0.75, 0.42, 0.34, hs[i], (K.rand() - 0.5) * 0.4, (K.rand() - 0.5) * 0.08, { moss: 0.55 }));
      for (let i = 0; i < 3; i++) {
        const pts = H.rope(L, new T.Vector3(xs[i] + 0.1, hs[i] - 0.3, 0.92), new T.Vector3(xs[i + 1] - 0.1, hs[i + 1] - 0.3, 0.92), 0.25, 4);
        H.charm(L, R, pts[2], 0.2); if (i !== 1) H.boneBit(L, pts[1].x, pts[1].y - 0.15, pts[1].z, 0.2, 0, 0); else H.rag(R, pts[1], 0.4, 0.07, 0);
      }
      tuftsAround(K, L, 3, 1.5, 9);
    } },
    small_rune: { name: 'Малый рунный камень', fp: [1, 1], h: 1.0, build(K, L, E) { slab(K, L, 0.5, 0.5, 0.42, 0.3, 0.95, 0.15, 0.05, { taper: 0.4, cut: 0.25 }); rune(K, E, 0.52, 0.5, 0.5 + 0.14, 0.13, 0.15, 'algiz', '#c23a2a'); tuftsAround(K, L, 1, 1, 4); } },
    boulder_pile: { name: 'Гряда валунов', fp: [2.5, 1.5], h: 0.8, build(K, L) { const N = NAT(K); N.boulder(L, 0.6, -0.1, 0.75, 0.55, { moss: 0.7 }); N.boulder(L, 1.3, -0.1, 0.7, 0.62, { moss: 0.6 }); N.boulder(L, 1.95, -0.1, 0.85, 0.45, { moss: 0.7 }); N.boulder(L, 1.0, -0.1, 1.15, 0.3); tuftsAround(K, L, 2.5, 1.5, 9); K.fern(L, 2.2, 0, 0.3, 0.6); } },
  };

  // =====================================================================
  // УТВАРЬ И МЕЛОЧИ
  // =====================================================================
  const PROPS = {
    barrel: { name: 'Бочка с руной', fp: [1, 1], h: 0.85, build(K, L, E) { barrel(K, L, 0.5, 0.42, 0.5, 0.3, 0.82); rune(K, E, 0.5, 0.45, 0.5 + 0.335, 0.1, 0, 'bind', '#a3342a'); } },
    barrel_tall: { name: 'Бочонок с верёвкой', fp: [1, 1], h: 0.9, build(K, L) { barrel(K, L, 0.5, 0.45, 0.5, 0.24, 0.88, { hex: K.PAL.woodLight }); const H = LES().kitHelpers(K); H.rope(L, new K.T.Vector3(0.28, 0.7, 0.62), new K.T.Vector3(0.72, 0.7, 0.62), 0.2, 4); } },
    barrel_rack: { name: 'Бочка на козлах', fp: [1.4, 1], h: 0.9, build(K, L) {
      const { T, PAL, M, part } = K; barrel(K, L, 0.7, 0.55, 0.5, 0.32, 0.95, { lying: true });
      for (const x of [0.4, 1.0]) { L.push(part(new T.BoxGeometry(0.08, 0.35, 0.8), PAL.woodDark, { m: M(x, 0.17, 0.5), tex: 'wood', jitter: 0.004 })); }
      L.push(part(new T.CylinderGeometry(0.03, 0.03, 0.14, 6), PAL.iron, { m: M(0.7, 0.55, 0.5 + 0.35, Math.PI / 2, 0, 0), jitter: 0 }));
    } },
    tub_broken: { name: 'Разбитая кадка', fp: [1, 1], h: 0.7, build(K, L) {
      const { T, PAL, M, part, rand } = K;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, h = i === 3 || i === 4 ? 0.25 + rand() * 0.15 : 0.55 + rand() * 0.12; L.push(part(new T.BoxGeometry(0.15, h, 0.04), rand() < 0.3 ? PAL.woodDark : PAL.wood, { m: M(0.5 + Math.cos(a) * 0.3, h / 2, 0.5 + Math.sin(a) * 0.3, 0, -a + Math.PI / 2, (rand() - 0.5) * 0.08), tex: 'wood', axis: [0, 1, 0], jitter: 0.004, moss: 0.2 })); }
      L.push(part(new T.TorusGeometry(0.33, 0.016, 3, 12), PAL.iron, { m: M(0.5, 0.15, 0.5, Math.PI / 2 + 0.05, 0, 0), jitter: 0, ao: false }));
      L.push(part(new T.BoxGeometry(0.14, 0.04, 0.6), PAL.wood, { m: M(0.85, 0.03, 0.8, 0, 0.7, 0), tex: 'wood', jitter: 0.004 }));
    } },
    barrels_stack: { name: 'Бочки штабелем', fp: [1.6, 1.4], h: 1.5, build(K, L) { barrel(K, L, 0.45, 0.4, 0.55, 0.3, 0.8); barrel(K, L, 1.15, 0.4, 0.6, 0.3, 0.8, { hex: K.PAL.woodLight }); barrel(K, L, 0.8, 1.2, 0.58, 0.29, 0.78); } },
    stump: { name: 'Пень', fp: [1, 1], h: 0.5, build(K, L) { const { T, PAL, M, part } = K; const H = LES().kitHelpers(K); L.push(part(new T.CylinderGeometry(0.34, 0.42, 0.45, 9), PAL.bark, { m: M(0.5, 0.22, 0.5), tex: 'bark', axis: [0, 1, 0], jitter: 0.02, moss: 0.3 })); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + 0.3; H.stick(L, new T.Vector3(0.5 + Math.cos(a) * 0.3, 0.12, 0.5 + Math.sin(a) * 0.3), new T.Vector3(0.5 + Math.cos(a) * 0.62, -0.03, 0.5 + Math.sin(a) * 0.62), 0.09, PAL.bark, { tex: 'bark', taper: 0.35, moss: 0.3, seg: 5 }); } } },
    stump_mushroom: { name: 'Пень с грибами', fp: [1, 1], h: 0.55, build(K, L) { PROPS.stump.build(K, L); K.mushrooms(L, 0.85, 0, 0.75); } },
    stump_broken: { name: 'Сломанный ствол', fp: [1, 1], h: 1.1, build(K, L) { NAT(K).stump(L, 0.5, 0, 0.5, 0.32, 0.9); } },
    stump_wrapped: { name: 'Пень с красной обмоткой', fp: [1, 1], h: 1.2, build(K, L, E, R) { const { T, M, part } = K; NAT(K).stump(L, 0.5, 0, 0.5, 0.28, 1.0); L.push(part(new T.CylinderGeometry(0.29, 0.3, 0.2, 8, 1, true), C.red, { m: M(0.5, 0.7, 0.5, 0.06, 0, 0), tex: 'cloth', jitter: 0.012, ao: false })); LES().kitHelpers(K).rag(R, new T.Vector3(0.62, 0.72, 0.78), 0.5, 0.09, 0.3); } },
    firewood_axe: { name: 'Поленница с топором', fp: [2, 1.2], h: 1.0, build(K, L) {
      const { T, PAL, M, part, rand } = K;
      for (let row = 0; row < 4; row++) for (let i = 0; i < 5 - (row > 2 ? 1 : 0); i++) K.logWithRings(L, 0.25 + i * 0.22 + (row % 2) * 0.1, 0.1 + row * 0.19, 0.55, 0.7, 0.095, Math.PI / 2 + (rand() - 0.5) * 0.08, rand() < 0.5 ? PAL.woodLight : PAL.wood);
      for (const y of [0.3, 0.6]) L.push(part(new T.BoxGeometry(1.2, 0.04, 0.73), C.red, { m: M(0.62, y, 0.55), jitter: 0.005, tex: 'cloth', ao: false }));
      L.push(part(new T.CylinderGeometry(0.22, 0.25, 0.42, 9), PAL.bark, { m: M(1.6, 0.21, 0.6), tex: 'bark', axis: [0, 1, 0], jitter: 0.012, moss: 0.2 }));
      L.push(part(new T.CylinderGeometry(0.025, 0.03, 0.75, 5), PAL.woodLight, { m: M(1.62, 0.72, 0.6, 0, 0, 0.35), tex: 'wood', axis: [0, 1, 0], jitter: 0 }));
      L.push(part(new T.BoxGeometry(0.22, 0.12, 0.03), PAL.iron, { m: M(1.56, 0.46, 0.6, 0, 0, 0.35), jitter: 0 }));
      for (let k = 0; k < 4; k++) L.push(part(new T.BoxGeometry(0.12, 0.03, 0.05), PAL.woodLight, { m: M(1.3 + rand() * 0.5, 0.02, 0.9 + rand() * 0.2, 0, rand() * 3, 0), jitter: 0, ao: false }));
    } },
    ox_skull: { name: 'Бычий череп с тканью', fp: [1, 1], h: 0.7, build(K, L, E) { bullSkull(K, L, E, 0.5, 0.25, 0.5, 1.2, 0.3, { eyes: true, cloth: true }); } },
    skull_human: { name: 'Человеческий череп', fp: [0.6, 0.6], h: 0.3, build(K, L) {
      const { T, M, part } = K;
      L.push(part(new T.IcosahedronGeometry(0.14, 1), C.bone, { m: M(0.3, 0.14, 0.3, 0, 0, 0, new T.Vector3(1, 0.95, 1.15)), jitter: 0.006, ao: false, vary: 0.06 }));
      L.push(part(new T.BoxGeometry(0.16, 0.08, 0.12), C.boneDark, { m: M(0.3, 0.05, 0.38), jitter: 0.004, ao: false }));
      for (const sx of [-1, 1]) L.push(part(new T.BoxGeometry(0.06, 0.05, 0.03), '#1d1a17', { m: M(0.3 + sx * 0.05, 0.15, 0.45), jitter: 0, ao: false, vary: 0 }));
      L.push(part(new T.ConeGeometry(0.025, 0.04, 3), '#1d1a17', { m: M(0.3, 0.1, 0.46, Math.PI, 0, 0), jitter: 0, ao: false }));
    } },
    skull_marked: { name: 'Рогатый череп с меткой', fp: [1, 1], h: 0.7, build(K, L, E) { bullSkull(K, L, E, 0.5, 0.25, 0.5, 1.1, -0.2, { mark: true }); } },
    chest: { name: 'Сундук', fp: [1.2, 1], h: 0.75, build(K, L, E) { chest(K, L, E, 0.6, 0.5, {}); } },
    chest_rune: { name: 'Сундук с руной', fp: [1.2, 1], h: 0.75, build(K, L, E) { chest(K, L, E, 0.6, 0.5, { rune: true }); } },
    chest_cloth: { name: 'Сундук с тканью', fp: [1.2, 1], h: 0.75, build(K, L, E, R) { chest(K, L, E, 0.6, 0.5, { cloth: true, R }); } },
    chest_gold: { name: 'Сундук с золотом', fp: [1.4, 1.2], h: 0.9, build(K, L, E) { chest(K, L, E, 0.7, 0.55, { open: true }); const N = NAT(K); N.boulder(L, 1.2, -0.05, 0.3, 0.3); } },
    crate: { name: 'Ящик', fp: [1, 1], h: 0.8, build(K, L, E) { crate(K, L, E, 0.5, 0.5, 0.75); } },
    crate_rune: { name: 'Ящик с руной', fp: [1, 1], h: 0.8, build(K, L, E) { crate(K, L, E, 0.5, 0.5, 0.75, { rune: true }); } },
    bush_dry: { name: 'Сухой куст', fp: [1, 1], h: 0.9, build(K, L) {
      const { T, rand } = K; const H = LES().kitHelpers(K);
      for (let k = 0; k < 9; k++) { const a = rand() * 6.28, top = new T.Vector3(0.5 + Math.cos(a) * 0.4, 0.5 + rand() * 0.45, 0.5 + Math.sin(a) * 0.4); H.crooked(L, new T.Vector3(0.5, 0, 0.5), top, 0.025, C.dryWood, 0.12, 2, { moss: 0, tex: 'bark' }); }
      tuftsAround(K, L, 1, 1, 3);
    } },
    bush_green: { name: 'Зелёный куст', fp: [1.2, 1.2], h: 0.9, build(K, L) {
      const { T, M, part, rand } = K;
      for (let k = 0; k < 8; k++) { const a = rand() * 6.28, r = rand() * 0.3, cy = 0.3 + rand() * 0.35, s = 0.22 + rand() * 0.14; L.push(K.tint(part(new T.IcosahedronGeometry(1, 1), rand() < 0.5 ? C.leaf : C.leafDark, { m: M(0.6 + Math.cos(a) * r, cy, 0.6 + Math.sin(a) * r, rand(), rand() * 3, rand(), new T.Vector3(s, s * 0.8, s)), jitter: 0.03, tex: 'leaves', ao: false, vary: 0.1 }), (x, y) => (y - cy) / s * 0.6 + 0.1, '#a5b861')); }
    } },
    tree_small: { name: 'Молодой дуб', fp: [1.6, 1.6], h: 2.4, build(K, L) {
      const { T, M, part, rand } = K; const H = LES().kitHelpers(K);
      const pts = H.crooked(L, new T.Vector3(0.8, 0, 0.8), new T.Vector3(0.85, 1.4, 0.78), 0.1, K.PAL.bark, 0.25, 3, { tex: 'bark', moss: 0.2 });
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + rand(), p = pts[2 + (k % 2)]; H.stick(L, p, p.clone().add(new T.Vector3(Math.cos(a) * 0.5, 0.35 + rand() * 0.3, Math.sin(a) * 0.5)), 0.04, K.PAL.bark, { tex: 'bark', taper: 0.4, moss: 0, seg: 5 }); }
      for (let k = 0; k < 9; k++) { const a = rand() * 6.28, r = rand() * 0.5, cy = 1.6 + rand() * 0.6, s = 0.3 + rand() * 0.2; L.push(K.tint(part(new T.IcosahedronGeometry(1, 1), rand() < 0.5 ? C.leaf : C.leafDark, { m: M(0.8 + Math.cos(a) * r, cy, 0.8 + Math.sin(a) * r, rand(), rand() * 3, rand(), new T.Vector3(s, s * 0.8, s)), jitter: 0.04, tex: 'leaves', ao: false, vary: 0.1 }), (x, y) => (y - cy) / s * 0.6 + 0.1, '#a5b861')); }
      H.mound(L, 0.8, 0.8, 0.5, 0.45, 0.12); tuftsAround(K, L, 1.6, 1.6, 5);
    } },
    // ---- мостик, лестница и водопад — для рек и озёр в конструкторе мира, тот же приём, что в основной сцене ----
    bridge: { name: 'Мостик', fp: [1.6, 4], h: 1.1, build(K, L) {
      const { T, PAL, M, part, rand } = K;
      for (const x of [0.35, 1.25]) L.push(part(new T.BoxGeometry(0.14, 0.16, 4), PAL.woodDark, { m: M(x, 0.14, 2), tex: 'wood', axis: [0, 0, 1], jitter: 0.01 }));
      for (let z = 0.15; z < 3.9; z += 0.28) L.push(part(new T.BoxGeometry(1.5, 0.06, 0.24), PAL.woodLight, { m: M(0.8, 0.28, z, 0, (rand() - 0.5) * 0.04, 0), jitter: 0.01, moss: 0.2, tex: 'wood', axis: [1, 0, 0] }));
      for (const x of [0.05, 1.55]) { for (const z of [0.15, 3.85]) L.push(part(new T.CylinderGeometry(0.06, 0.06, 0.9, 6), PAL.wood, { m: M(x, 0.65, z), tex: 'wood', axis: [0, 1, 0] })); L.push(part(new T.BoxGeometry(0.06, 0.06, 3.9), PAL.wood, { m: M(x, 1.02, 2), tex: 'wood', axis: [0, 0, 1] })); }
    } },
    stairs: { name: 'Лестница к воде', fp: [1, 3.6], h: 2.6, build(K, L) {
      const { T, PAL, M, part } = K;
      const steps = 7, rise = 2.5 / steps, run = 3.6 / steps;
      for (let k = 0; k < steps; k++) { const top = 2.5 - (k + 1) * rise; L.push(part(new T.BoxGeometry(0.9, 0.08, run - 0.02), PAL.woodLight, { m: M(0.5, top - 0.04, (k + 0.5) * run), jitter: 0.008, moss: 0.2, base: top - 1, tex: 'wood', axis: [0, 0, 1] })); }
      const strL = Math.hypot(3.6, 2.5), strA = Math.atan2(2.5, 3.6);
      for (const x of [0.06, 0.94]) L.push(part(new T.BoxGeometry(0.05, 0.22, strL), PAL.woodDark, { m: M(x, 1.25 - 0.05, 1.8, 0, 0, -strA), jitter: 0.008, tex: 'wood', axis: [1, 0, 0] }));
    } },
    waterfall: { name: 'Водопад', fp: [2, 0.6], h: 2.4, build(K, L, E, R, g, U) {
      const { T, PAL, M, part, rand } = K;
      // валуны по бокам, как у уступа основной сцены, и падающая вода отдельным мешем (та же анимация ряби, что у воды)
      K.rock(L, 0.15, 0, 0.4, 0.32); K.rock(L, 1.85, 0, 0.4, 0.3);
      for (let i = 0; i < 5; i++) L.push(part(new T.IcosahedronGeometry(0.1 + rand() * 0.08, 0), PAL.stone, { m: M(0.4 + rand() * 1.2, 0.05, 0.55 + rand() * 0.15, rand() * 3, rand() * 3, 0), jitter: 0.02, ao: false, tex: 'stone' }));
      const fallMat = new T.MeshStandardMaterial({ color: K.lin('#78a8a4'), roughness: 0.3, transparent: true, opacity: 0.8, flatShading: true, side: T.DoubleSide });
      const fall = new T.Mesh(new T.PlaneGeometry(2, 2.4, 4, 10), fallMat);
      fall.position.set(1, 1.2, 0.32);
      g.add(fall);
      const base = fall.geometry.attributes.position.array.slice();
      U.push((t) => { const p = fall.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 3.5 + t * 7 + base[i * 3 + 1] * 2) * 0.07); p.needsUpdate = true; });
    } },
  };

  /** Собирает ассет из словаря: L — роспись, E — красные руны, R — ткань на ветру, U — анимации. */
  function assemble(K, def, id) {
    const { T } = K;
    const g = new T.Group();
    const L = [], E = [], R = [], U = [];
    def.build(K, L, E, R, g, U);
    if (L.length) g.add(K.facetGroup(L));
    if (R.length) g.add(K.facetGroup(R, { wind: { phase: 2.1, h: 3 } }));
    if (E.length) {
      const red = LES().redMesh(K, E, 2.2);
      g.add(red.mesh);
      U.push((t) => LES().updateRed(K, t));
    }
    return U.length ? { group: g, update: (dt, t) => U.forEach((f) => f(t)) } : { group: g };
  }

  // =====================================================================
  // РУННАЯ ПЛОЩАДКА (АЛТАРЬ), 6×6 м
  // =====================================================================
  function buildRunePlatform(K) {
    const { T, PAL, M, part, rand } = K;
    const H = LES().kitHelpers(K), N = NAT(K);
    const g = new T.Group();
    const L = [], E = [], R = [], U = [];
    const c = 3, top = 0.42;
    // основание: каменный барабан, край из плит, верх — тёмная плита
    L.push(part(new T.CylinderGeometry(2.75, 2.95, top, 20, 1), PAL.stoneDark, { m: M(c, top / 2, c), tex: 'cliff', jitter: 0.03, moss: 0.3, vary: 0.08 }));
    L.push(part(new T.CylinderGeometry(2.45, 2.45, 0.04, 20), '#4a4a45', { m: M(c, top + 0.01, c), tex: 'stone', jitter: 0.01, moss: 0.2, vary: 0.06 }));
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.28; L.push(part(new T.BoxGeometry(0.62, 0.16, 0.42), rand() < 0.4 ? PAL.stoneDark : PAL.stone, { m: M(c + Math.cos(a) * 2.6, top + 0.04, c + Math.sin(a) * 2.6, (rand() - 0.5) * 0.06, -a + Math.PI / 2, (rand() - 0.5) * 0.06), tex: 'stone', jitter: 0.03, moss: 0.4 })); }
    // светящиеся руны: три кольца, руны по кольцу, знак в центре
    for (const rr of [0.85, 1.75, 2.25]) E.push(part(new T.TorusGeometry(rr, 0.035, 3, 40), '#ff3a22', { m: M(c, top + 0.035, c, Math.PI / 2, 0, 0), jitter: 0, ao: false, vary: 0 }));
    for (let k = 0; k < 14; k++) { // руны лёжа между кольцами
      const a = k / 14 * 6.28, x = c + Math.cos(a) * 2.0, z = c + Math.sin(a) * 2.0, kind = GLYPH_KEYS[k % GLYPH_KEYS.length];
      for (const [x1, y1, x2, y2] of GLYPHS[kind]) {
        const s = 0.1, dx = (x2 - x1) * s, dy = (y2 - y1) * s, u = (x1 + x2) / 2 * s, v = (y1 + y2) / 2 * s;
        const ta = a + Math.PI / 2; // «вверх» руны — по радиусу наружу
        const px = x + Math.cos(a) * v + Math.cos(ta) * u, pz = z + Math.sin(a) * v + Math.sin(ta) * u;
        E.push(part(new T.BoxGeometry(s * 0.14, Math.hypot(dx, dy) + s * 0.1, 0.02), '#ff3a22', { m: M(px, top + 0.035, pz, -Math.PI / 2, 0, 0).multiply(new T.Matrix4().makeRotationZ(-a + Math.PI / 2 + Math.atan2(-dx, dy))), jitter: 0, ao: false, vary: 0 }));
      }
    }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; E.push(part(new T.BoxGeometry(0.05, 0.02, 0.6), '#ff3a22', { m: M(c + Math.cos(a) * 1.3, top + 0.035, c + Math.sin(a) * 1.3, 0, -a + Math.PI / 2, 0), jitter: 0, ao: false, vary: 0 })); }
    rune(K, E, c, top + 0.04, c, 0.35, 0, 'bind', '#ff3a22', -Math.PI / 2);
    // черепа и кости по краю
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + 0.4; H.placeSkull(L, E, c + Math.cos(a) * 2.35, top + 0.13, c + Math.sin(a) * 2.35, -a + Math.PI / 2 + Math.PI, 0.75, k % 2 ? 0.8 : 0); H.boneBit(L, c + Math.cos(a + 0.25) * 2.4, top + 0.05, c + Math.sin(a + 0.25) * 2.4, 0.35, a); }
    // столбы с тканью и тотем с птичьей головой и фонарём
    const post = (x, z, h, face) => {
      L.push(part(new T.BoxGeometry(0.28, h, 0.26, 1, 3, 1), PAL.woodDark, { m: M(x, h / 2, z, 0, face, (rand() - 0.5) * 0.06), tex: 'wood', axis: [0, 1, 0], jitter: 0.02, moss: 0.25 }));
      L.push(part(new T.ConeGeometry(0.2, 0.3, 4), PAL.woodDark, { m: M(x, h + 0.14, z, 0, face + Math.PI / 4, 0), tex: 'wood', jitter: 0.01 }));
      for (const y of [h * 0.62, h * 0.72]) L.push(part(new T.CylinderGeometry(0.21, 0.22, 0.12, 8, 1, true), C.red, { m: M(x, y, z, 0.05, 0, 0), tex: 'cloth', jitter: 0.012, ao: false }));
      H.rag(R, new T.Vector3(x + 0.15, h * 0.66, z + 0.1), 0.7, 0.1, face);
      rune(K, E, x + Math.sin(face) * 0.14, h * 0.4, z + Math.cos(face) * 0.14, 0.12, face, 'algiz', '#c23a2a');
    };
    post(0.45, 1.2, 2.6, 0.6); post(1.0, 0.35, 2.2, 0.9); post(5.6, 4.9, 2.4, -2.3);
    // тотем: столб, перекладина, голова птицы, фонарь
    const tx = 4.9, tz = 0.9;
    L.push(part(new T.BoxGeometry(0.3, 3.1, 0.28, 1, 4, 1), PAL.wood, { m: M(tx, 1.55, tz), tex: 'wood', axis: [0, 1, 0], jitter: 0.02, moss: 0.2 }));
    L.push(part(new T.BoxGeometry(1.1, 0.14, 0.16), PAL.woodDark, { m: M(tx - 0.3, 2.55, tz), tex: 'wood', axis: [1, 0, 0], jitter: 0.01 }));
    L.push(part(new T.BoxGeometry(0.34, 0.32, 0.36), PAL.woodDark, { m: M(tx, 3.26, tz), jitter: 0.02, tex: 'wood' }));
    L.push(part(new T.ConeGeometry(0.1, 0.32, 4), PAL.woodDark, { m: M(tx, 3.2, tz + 0.3, Math.PI / 2 + 0.3, 0, 0), jitter: 0.01 })); // клюв
    for (const sx of [-1, 1]) { E.push(part(new T.IcosahedronGeometry(0.035, 0), '#ff3a22', { m: M(tx + sx * 0.1, 3.3, tz + 0.18), jitter: 0, ao: false, vary: 0 })); L.push(part(new T.ConeGeometry(0.06, 0.2, 3), PAL.woodDark, { m: M(tx + sx * 0.12, 3.5, tz - 0.05, 0, 0, sx * 0.4), jitter: 0 })); }
    H.rag(R, new T.Vector3(tx + 0.05, 2.9, tz + 0.15), 0.8, 0.12, 0);
    const G = [], lx = tx - 0.75, ly = 2.18;
    L.push(part(new T.TorusGeometry(0.035, 0.01, 3, 6), PAL.iron, { m: M(lx, 2.44, tz), jitter: 0, ao: false }));
    L.push(part(new T.BoxGeometry(0.22, 0.04, 0.22), PAL.iron, { m: M(lx, ly - 0.17, tz), jitter: 0 }));
    G.push(part(new T.BoxGeometry(0.17, 0.26, 0.17), '#1b2024', { m: M(lx, ly, tz), jitter: 0 }));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) L.push(part(new T.BoxGeometry(0.025, 0.3, 0.025), PAL.iron, { m: M(lx + dx * 0.09, ly, tz + dz * 0.09), jitter: 0 }));
    L.push(part(new T.ConeGeometry(0.18, 0.14, 4), PAL.iron, { m: M(lx, ly + 0.2, tz, 0, Math.PI / 4, 0), jitter: 0 }));
    g.add(K.glassMesh(G));
    K.addGlowLight(g, lx, ly, tz + 0.1, 1.6, 7);
    U.push(candles(K, g, L, [[c - 1.2, top, c + 1.9, 0.22], [c + 1.9, top, c + 1.2, 0.16], [c - 2.0, top, c - 0.9, 0.2]]));
    // мох и трава у подножия
    for (let k = 0; k < 16; k++) { const a = rand() * 6.28, r = 2.95 + rand() * 0.25; K.tuft(L, c + Math.cos(a) * r, 0, c + Math.sin(a) * r, 3, 0.3 + rand() * 0.2); }
    for (let k = 0; k < 4; k++) { const a = rand() * 6.28; N.boulder(L, c + Math.cos(a) * 3.0, -0.05, c + Math.sin(a) * 3.0, 0.2 + rand() * 0.12); }
    g.add(K.facetGroup(L), K.facetGroup(R, { wind: { phase: 1.3, h: 3.5 } }));
    const red = LES().redMesh(K, E, 2.4);
    g.add(red.mesh);
    LES().redLight(K, g, c, 0.9, c, 1.4, 6);
    return { group: g, update: (dt, t) => { U.forEach((f) => f(t)); LES().updateRed(K, t); } };
  }

  // =====================================================================
  // РАЗРУШЕННАЯ ЧАСОВНЯ, 8×9 м
  // =====================================================================
  function buildChapel(K) {
    const { T, PAL, M, part, rand } = K;
    const H = LES().kitHelpers(K), N = NAT(K);
    const { V, stick } = H;
    const g = new T.Group();
    const L = [], G = [], R = [];
    const logWall = (x0, z0, x1, z1, y0, rows, r = 0.13, gap = null) => { // сруб: брёвна вдоль стены, gap = [t0, t1] — проём
      for (let k = 0; k < rows; k++) {
        const y = y0 + r + k * r * 1.85;
        const a = V(x0, y, z0), b = V(x1, y + (rand() - 0.5) * 0.02, z1);
        if (gap && y > gap[2] && y < gap[3]) {
          stick(L, a, a.clone().lerp(b, gap[0]), r, rand() < 0.3 ? PAL.log : PAL.woodDark, { tex: 'wood', moss: 0.2, seg: 7, taper: 0.95 });
          stick(L, a.clone().lerp(b, gap[1]), b, r, rand() < 0.3 ? PAL.log : PAL.woodDark, { tex: 'wood', moss: 0.2, seg: 7, taper: 0.95 });
        } else stick(L, a.clone().add(V(x0 === x1 ? 0 : -0.15 * Math.sign(x1 - x0), 0, z0 === z1 ? 0 : -0.15 * Math.sign(z1 - z0))), b.clone().add(V(x0 === x1 ? 0 : 0.15 * Math.sign(x1 - x0), 0, z0 === z1 ? 0 : 0.15 * Math.sign(z1 - z0))), r, rand() < 0.3 ? PAL.log : PAL.woodDark, { tex: 'wood', moss: 0.25, seg: 7, taper: 0.95 });
      }
      return y0 + rows * r * 1.85;
    };
    const window_ = (x, y, z, ry, w = 0.5, h = 0.7) => {
      G.push(part(new T.BoxGeometry(w, h, 0.05), '#1b2024', { m: M(x, y, z, 0, ry, 0), jitter: 0 }));
      L.push(part(new T.BoxGeometry(w + 0.16, 0.08, 0.1), PAL.woodDark, { m: M(x, y + h / 2 + 0.04, z, 0, ry, 0), jitter: 0.004 }));
      L.push(part(new T.BoxGeometry(w + 0.1, 0.07, 0.12), PAL.woodDark, { m: M(x, y - h / 2 - 0.04, z, 0, ry, 0), jitter: 0.004 }));
    };
    // ---- основание: подклет из камня ----
    const nx0 = 1.2, nx1 = 5.8, nz0 = 3.2, nz1 = 8.3, base = 0.35;
    L.push(part(new T.BoxGeometry(nx1 - nx0 + 0.4, base, nz1 - nz0 + 0.4, 4, 1, 4), PAL.stoneDark, { m: M((nx0 + nx1) / 2, base / 2, (nz0 + nz1) / 2), tex: 'cliff', jitter: 0.03, moss: 0.3 }));
    // ---- неф: сруб ----
    const wallTop = logWall(nx0, nz0, nx1, nz0, base, 12, 0.13, [0.38, 0.62, 0.3, 2.4]); // фасад к башне с проёмом
    logWall(nx0, nz1, nx1, nz1, base, 12);
    logWall(nx0, nz0, nx0, nz1, base, 12, 0.13, [0.45, 0.6, 1.3, 2.2]);
    logWall(nx1, nz0, nx1, nz1, base, 12, 0.13, [0.3, 0.45, 1.3, 2.2]);
    window_(nx0 - 0.05, 1.75, nz0 + (nz1 - nz0) * 0.52, Math.PI / 2); window_(nx1 + 0.05, 1.75, nz0 + (nz1 - nz0) * 0.37, Math.PI / 2);
    // ---- крыша нефа: двускатная, справа провал с обломками стропил ----
    const ridgeY = wallTop + 1.9, cx = (nx0 + nx1) / 2, span = (nx1 - nx0) / 2 + 0.45, pitch = Math.atan2(ridgeY - wallTop, span), sl = Math.hypot(span, ridgeY - wallTop);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const z = nz0 - 0.3 + (i + 0.5) * (nz1 - nz0 + 0.6) / 16;
        const hole = s > 0 && i > 5 && i < 12; // провал
        const len = hole ? sl * (0.25 + rand() * 0.25) : sl + (rand() - 0.5) * 0.15;
        const off = (sl - len) / 2; // короткие доски — у конька
        L.push(part(new T.BoxGeometry(len, 0.06, (nz1 - nz0 + 0.6) / 16 - 0.015), rand() < 0.3 ? PAL.woodDark : PAL.roof, {
          m: M(cx + s * (span / 2 - off * Math.cos(pitch)), (ridgeY + wallTop) / 2 + off * Math.sin(pitch) + (rand() - 0.5) * 0.02, z, 0, 0, -s * pitch),
          tex: 'roof', axis: [1, 0, 0], jitter: 0.012, moss: 0.55, vary: 0.12,
        }));
      }
    }
    for (let i = 0; i < 6; i++) { // стропила и обломки в провале
      const z = nz0 + 1.6 + i * 0.55;
      stick(L, V(cx, ridgeY, z), V(cx + span * (0.35 + rand() * 0.55), ridgeY - (ridgeY - wallTop) * (0.4 + rand() * 0.6), z + (rand() - 0.5) * 0.3), 0.06, PAL.woodDark, { tex: 'wood', moss: 0, seg: 5 });
    }
    stick(L, V(cx, ridgeY + 0.05, nz0 - 0.3), V(cx, ridgeY + 0.05, nz1 + 0.3), 0.09, PAL.log, { tex: 'wood', moss: 0.5, seg: 7 });
    // фронтоны
    for (const z of [nz0 - 0.05, nz1 - 0.05]) { const tri = new T.Shape(); tri.moveTo(-span + 0.3, 0); tri.lineTo(span - 0.3, 0); tri.lineTo(0, ridgeY - wallTop - 0.1); tri.lineTo(-span + 0.3, 0);
      L.push(part(new T.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), PAL.woodDark, { m: M(cx, wallTop, z), tex: 'wood', axis: [1, 0, 0], jitter: 0.01, moss: 0.1 })); }
    // ---- колокольня у фасада ----
    const bx = cx, bz = nz0 - 1.3, bw = 1.3;
    const tTop = logWall(bx - bw, bz - bw, bx + bw, bz - bw, base, 17, 0.12, [0.35, 0.65, 0.2, 2.0]);
    logWall(bx - bw, bz - bw, bx - bw, bz + bw * 0.9, base, 17, 0.12);
    logWall(bx + bw, bz - bw, bx + bw, bz + bw * 0.9, base, 17, 0.12);
    L.push(part(new T.BoxGeometry(bw * 2 + 0.5, 0.12, bw * 2 + 0.5), PAL.woodDark, { m: M(bx, tTop + 0.05, bz), tex: 'wood', jitter: 0.01 }));
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) stick(L, V(bx + dx * (bw - 0.1), tTop, bz + dz * (bw - 0.1)), V(bx + dx * (bw - 0.15), tTop + 1.5, bz + dz * (bw - 0.15)), 0.08, PAL.woodDark, { tex: 'wood', moss: 0.1, seg: 6 });
    // открытая балюстрада звонницы — низкий и верхний пояс перекладин между столбами
    for (const railY of [tTop + 0.55, tTop + 1.25]) {
      for (const [ax, az, bx2, bz2] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
        stick(L, V(bx + ax * (bw - 0.12), railY, bz + az * (bw - 0.12)), V(bx + bx2 * (bw - 0.12), railY, bz + bz2 * (bw - 0.12)), 0.03, PAL.woodDark, { tex: 'wood', moss: 0.15, seg: 4 });
      }
    }
    L.push(part(new T.CylinderGeometry(0.25, 0.35, 0.4, 8), '#6b5a3e', { m: M(bx, tTop + 0.85, bz), jitter: 0.01 })); // колокол
    window_(bx, tTop + 0.9, bz - bw + 0.04, 0, 0.6, 0.9);
    // шатёр звонницы: целый конус, а пробитый обвалившийся верх — накренённый обломок пика (как на референсе)
    L.push(part(new T.ConeGeometry(bw * 1.5, 1.7, 4, 1), PAL.roof, { m: M(bx, tTop + 2.05, bz, 0, Math.PI / 4, 0), tex: 'roof', jitter: 0.03, moss: 0.5 }));
    L.push(part(new T.ConeGeometry(bw * 0.55, 0.75, 4, 1), PAL.woodDark, { m: M(bx + 0.18, tTop + 2.75, bz + 0.1, 0.35, Math.PI / 6, 0.15), tex: 'wood', jitter: 0.02, moss: 0.2 })); // накренённый пробитый обломок пика
    L.push(part(new T.CylinderGeometry(0.14, 0.14, 0.02, 8), '#0d0c0a', { m: M(bx - 0.05, tTop + 2.55, bz - 0.05), jitter: 0, ao: false })); // дыра в шатре
    for (let i = 0; i < 3; i++) stick(L, V(bx + (rand() - 0.5) * 0.3, tTop + 2.1, bz + (rand() - 0.5) * 0.3), V(bx + (rand() - 0.5) * 0.9, tTop + 2.6 + rand() * 0.3, bz + (rand() - 0.5) * 0.9), 0.03, PAL.woodDark, { tex: 'wood', moss: 0.2, seg: 4 }); // торчащие обломки стропил у пролома
    const dome = (x, y, z, s) => { // луковка с крестом
      const pts = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; const r = s * (0.35 + Math.sin(t * Math.PI) * 0.65) * (1 - t * 0.55); pts.push(new T.Vector2(t < 1 ? Math.max(0.01, r * (t < 0.15 ? 0.7 + t * 2 : 1)) : 0.01, t * s * 1.9)); }
      L.push(part(new T.LatheGeometry(pts, 8), PAL.roof, { m: M(x, y, z), tex: 'roof', jitter: 0.02 * s, moss: 0.6, vary: 0.1 }));
      L.push(part(new T.CylinderGeometry(0.03, 0.03, 0.9 * s, 5), C.iron, { m: M(x, y + s * 1.9 + 0.4 * s, z), jitter: 0 }));
      for (const [yy, w, rz] of [[0.65, 0.5, 0], [0.5, 0.3, 0], [0.25, 0.32, 0.4]]) L.push(part(new T.BoxGeometry(w * s, 0.03, 0.03), C.iron, { m: M(x, y + s * 1.9 + yy * s, z, 0, 0, rz), jitter: 0 }));
    };
    L.push(part(new T.CylinderGeometry(0.28, 0.32, 0.5, 8), PAL.woodDark, { m: M(bx, tTop + 3.1, bz), tex: 'wood', jitter: 0.01 }));
    dome(bx, tTop + 3.3, bz, 0.7);
    // малая луковка на апсиде (над дальним концом нефа)
    L.push(part(new T.CylinderGeometry(0.22, 0.26, 0.5, 8), PAL.woodDark, { m: M(cx, ridgeY + 0.2, nz1 - 0.9), tex: 'wood', jitter: 0.01 }));
    dome(cx, ridgeY + 0.42, nz1 - 0.9, 0.5);
    // ---- крыльцо и ступени, навес на двух столбах (как на референсе) ----
    for (let k = 0; k < 4; k++) L.push(part(new T.BoxGeometry(1.5, 0.12, 0.36), PAL.wood, { m: M(bx, 0.06 + k * 0.1, bz - bw - 0.3 - (3 - k) * 0.3), tex: 'wood', axis: [1, 0, 0], jitter: 0.01, moss: 0.3 }));
    G.push(part(new T.BoxGeometry(0.9, 1.6, 0.06), '#1b2024', { m: M(bx, base + 0.95, bz - bw - 0.01), jitter: 0 }));
    const porchPostZ = bz - bw - 1.05, porchWallZ = bz - bw - 0.02, porchMidZ = (porchPostZ + porchWallZ) / 2, porchLen = porchWallZ - porchPostZ;
    for (const dx of [-0.8, 0.8]) stick(L, V(bx + dx, base + 0.35, porchPostZ), V(bx + dx, base + 2.25, porchPostZ), 0.07, PAL.woodDark, { tex: 'wood', moss: 0.2, seg: 6 });
    L.push(part(new T.BoxGeometry(0.08, 0.08, 1.7), PAL.woodDark, { m: M(bx, base + 2.2, porchPostZ), tex: 'wood', axis: [0, 0, 1] })); // прогон между столбами
    { const pitchP = Math.atan2(0.45, porchLen);
      L.push(part(new T.BoxGeometry(2.0, 0.08, Math.hypot(porchLen, 0.45) + 0.15, 2, 1, 3), PAL.roof, { m: M(bx, base + 2.4, porchMidZ, -pitchP, 0, 0), tex: 'roof', jitter: 0.02, moss: 0.45 })); } // навес крыльца
    // ---- печная труба с дымом ----
    const chx = nx0 + 0.6, chz = nz1 - 1.3;
    let cy = wallTop + 0.3;
    for (let k = 0; k < 4; k++) { L.push(part(new T.BoxGeometry(0.5 - k * 0.04, 0.5, 0.5 - k * 0.04), k % 2 ? PAL.stone : PAL.stoneDark, { m: M(chx, cy + 0.25, chz), tex: 'stone', jitter: 0.02 })); cy += 0.48; }
    const smoke = new T.Object3D(); smoke.position.set(chx, cy + 0.2, chz); g.add(smoke);
    // ---- обломки, дрова, колодец, фонари ----
    for (let k = 0; k < 14; k++) { const a = rand() * 6.28, r = 0.4 + rand() * 1.4, x = nx1 + 0.8 + Math.cos(a) * r * 0.6, z = (nz0 + nz1) / 2 + Math.sin(a) * r * 1.4; L.push(part(new T.BoxGeometry(0.14, 0.05, 0.8 + rand() * 1.2), rand() < 0.4 ? PAL.woodDark : PAL.wood, { m: M(x, 0.05 + rand() * 0.2, z, (rand() - 0.5) * 0.4, rand() * 3, (rand() - 0.5) * 0.4), tex: 'wood', axis: [0, 0, 1], jitter: 0.01, moss: 0.2 })); }
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) K.logWithRings(L, nx0 - 0.9, 0.1 + row * 0.19, nz0 + 0.8 + i * 0.21 + row * 0.1, 0.7, 0.095, 0, rand() < 0.5 ? PAL.woodLight : PAL.wood);
    // провалившаяся кровля осыпалась внутрь и наружу под дырой — доски и черепки на земле
    for (let k = 0; k < 16; k++) { const x = nx1 - 0.3 + rand() * 1.6, z = 5.0 + rand() * 2.2; L.push(part(new T.BoxGeometry(0.5 + rand() * 0.4, 0.05, 0.16), rand() < 0.5 ? PAL.roof : PAL.woodDark, { m: M(x, 0.03 + rand() * 0.06, z, (rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5), jitter: 0.02, tex: 'roof', axis: [1, 0, 0], moss: 0.35 })); }
    // сломанное бревно прислонено к стене — ещё один знак разрухи
    stick(L, V(nx1 + 0.15, 0, 5.6), V(nx1 - 0.25, 2.1, 5.6), 0.08, PAL.woodDark, { tex: 'bark', moss: 0.3, seg: 6 });
    // мох и плющ карабкается по срубу и башне
    for (let k = 0; k < 10; k++) { const wall = rand() < 0.5, x = wall ? nx0 : nx0 + rand() * (nx1 - nx0), z = wall ? nz0 + rand() * (nz1 - nz0) : nz0, y = 0.4 + rand() * (wallTop - 0.6);
      L.push(part(new T.IcosahedronGeometry(0.13 + rand() * 0.1, 0), PAL.moss, { m: M(x + (wall ? -0.13 : 0), y, z + (wall ? 0 : -0.13), 0, rand() * 3, 0), jitter: 0.03, ao: false, vary: 0.14 })); }
    for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28; L.push(part(new T.DodecahedronGeometry(1, 0), PAL.stone, { m: M(nx1 + 1.2 + Math.cos(a) * 0.45, 0.2, nz1 - 0.2 + Math.sin(a) * 0.45, 0, rand() * 3, 0, V(0.17, 0.22, 0.14)), tex: 'stone', jitter: 0.01, moss: 0.4 })); }
    L.push(part(new T.CylinderGeometry(0.33, 0.33, 0.02, 10), '#0d1716', { m: M(nx1 + 1.2, 0.3, nz1 - 0.2), jitter: 0, ao: false }));
    // низкое кольцо колодца из камня — как на референсе, без крышицы и ворота
    for (const [x, z] of [[bx - 0.95, bz - bw - 0.15], [bx + 0.95, bz - bw - 0.15]]) {
      L.push(part(new T.BoxGeometry(0.2, 0.04, 0.2), C.iron, { m: M(x, 1.8, z), jitter: 0 }));
      G.push(part(new T.BoxGeometry(0.15, 0.22, 0.15), '#1b2024', { m: M(x, 1.95, z), jitter: 0 }));
      L.push(part(new T.ConeGeometry(0.15, 0.12, 4), C.iron, { m: M(x, 2.13, z, 0, Math.PI / 4, 0), jitter: 0 }));
    }
    H.rag(R, V(bx + 0.9, 2.3, bz - bw - 0.05), 0.7, 0.12, 0);
    // алые обереги-обвязки на столбах крыльца и на дровах/завале — сквозной мотив кита
    H.rag(R, V(bx - 0.8, 1.55, porchPostZ + 0.12), 0.5, 0.1, 0.3);
    H.rag(R, V(nx0 - 1.1, 0.55, nz0 + 1.3), 0.45, 0.09, -0.2);
    H.rag(R, V(nx1 + 0.55, 0.15, (nz0 + nz1) / 2 - 0.4), 0.4, 0.09, 0.5);
    // рассыпанные кости у завала
    for (let k = 0; k < 5; k++) { const x = nx1 + 0.5 + rand() * 1.6, z = (nz0 + nz1) / 2 - 0.9 + rand() * 1.8;
      L.push(part(new T.CylinderGeometry(0.035, 0.035, 0.32 + rand() * 0.2, 6), C.bone, { m: M(x, 0.03, z, (rand() - 0.5) * 2.4, rand() * 3, (rand() - 0.5) * 2.4), jitter: 0.01, ao: false })); }
    L.push(part(new T.SphereGeometry(0.09, 8, 6), C.bone, { m: M(nx1 + 1.6, 0.06, (nz0 + nz1) / 2 - 0.3), jitter: 0.02, ao: false })); // череп-обломок в завале
    // осенние листья на кровле и у завала — тёплые пятна ржавого и красного на мху
    for (let k = 0; k < 14; k++) {
      const onRoof = k < 9, s = -1 + (k % 2) * 2;
      const x = onRoof ? nx0 + rand() * (nx1 - nx0) : nx1 - 0.2 + rand() * 1.8;
      const z = onRoof ? nz0 - 0.2 + rand() * (nz1 - nz0 + 0.4) : (nz0 + nz1) / 2 - 1 + rand() * 2;
      const y = onRoof ? wallTop + 0.4 + rand() * (ridgeY - wallTop - 0.3) : 0.04 + rand() * 0.05;
      L.push(part(new T.IcosahedronGeometry(0.05 + rand() * 0.05, 0), rand() < 0.5 ? '#8a4a1f' : '#a33322', { m: M(x, y, z, (rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6, V(1, 0.3, 1)), jitter: 0.02, ao: false, moss: 0 }));
    }
    for (let k = 0; k < 30; k++) { const x = rand() * 8, z = rand() * 9; if (x > nx0 - 0.3 && x < nx1 + 0.3 && z > bz - bw - 1.4 && z < nz1 + 0.3) continue; K.tuft(L, x, 0, z, 3, 0.3 + rand() * 0.2); }
    N.boulder(L, 0.4, -0.05, 8.5, 0.35); N.boulder(L, 7.4, -0.05, 1.0, 0.3); K.fern(L, 0.5, 0, 2.2, 0.8); K.fern(L, 7.3, 0, 8.3, 0.8);
    g.add(K.facetGroup(L), K.glassMesh(G), K.facetGroup(R, { wind: { phase: 0.8, h: 4 } }));
    K.addGlowLight(g, bx - 0.95, 1.95, bz - bw - 0.3, 1.5, 7);
    K.addGlowLight(g, nx0 - 0.3, 1.75, nz0 + (nz1 - nz0) * 0.52, 1.2, 6);
    return { group: g, smokes: [smoke] };
  }

  // =====================================================================
  // РЕГИСТРАЦИЯ: библиотека конструктора + витрины в ките
  // =====================================================================
  const addLib = (cat, dict, seedBase) => Object.entries(dict).forEach(([id, d], i) => lib.push({
    id, name: d.name, cat, footprint: d.fp, heightM: d.h, seed: seedBase + i, build: (K) => assemble(K, d, id),
  }));
  addLib('Камни', STONES, 600);
  addLib('Утварь', PROPS, 700);
  lib.push({ id: 'rune_platform', name: 'Рунный алтарь', cat: 'Хтонь', footprint: [6, 6], heightM: 3.6, seed: 801, build: buildRunePlatform });
  lib.push({ id: 'chapel', name: 'Разрушенная часовня', cat: 'Постройки', footprint: [8, 9.5], heightM: 9, seed: 802, build: buildChapel });

  /** Витрина: ассеты категории рядами на одной подставке. */
  function showcase(K, list, cols) {
    const g = new K.T.Group();
    const smokes = [], ups = [];
    let x = 0, z = 0, rowD = 0, maxW = 0;
    list.forEach((a, i) => {
      if (i && i % cols === 0) { x = 0; z += rowD + 0.6; rowD = 0; }
      K.setSeed(a.seed);
      const out = a.build(K);
      const o = out.isObject3D ? out : out.group;
      o.position.set(x, 0, z);
      g.add(o);
      if (out.update) ups.push(out.update);
      (out.smokes || []).forEach((s) => smokes.push(s));
      x += a.footprint[0] + 0.5; rowD = Math.max(rowD, a.footprint[1]); maxW = Math.max(maxW, x);
    });
    return { group: g, smokes, update: (dt, t) => ups.forEach((f) => f(dt, t)), size: [maxW, z + rowD] };
  }
  const stonesList = () => lib.filter((a) => a.cat === 'Камни');
  const propsList = () => lib.filter((a) => a.cat === 'Утварь');
  const view = (id, name, fp, fn, extra = {}) => models.push({ id, name, footprint: fp, heightM: 3, seed: 1, ...extra,
    build(K) { const out = fn(K); if (extra.redPanel) out.panel = LES().makePanel(id); return out; } });
  view('stones_v5', 'Камни', [11, 7], (K) => showcase(K, stonesList(), 4), { redPanel: true, zoom: 1.1 });
  view('altar_v5', 'Алтарь', [6, 6], (K) => buildRunePlatform(K), { redPanel: true, seed: 801 });
  view('chapel_v5', 'Часовня', [8, 9.5], (K) => buildChapel(K), { seed: 802 });
  view('props_v5', 'Утварь', [12, 8], (K) => showcase(K, propsList(), 6), { redPanel: true, zoom: 1.1 });
})();
