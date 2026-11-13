/**
 * Владения Лесовика: объекты с листа «Основные объекты» и сцена окружения.
 *
 *   chicken_hut   — избушка Бабы-яги на курьих ножках, 4×4 м: кривой сруб, лохматая крыша, светёлка,
 *                   печная труба с дымом, вилы, черепа, кости, обереги, тряпки, огоньки;
 *                   переминается с ноги на ногу (ноги — двухзвенный IK, свободная нога приподнимается)
 *   bone_totem    — костяной тотем, 2×2 м: треножник, связка жердей, две пары рук-сучьев, череп с рогами,
 *                   длинные красные ленты, обереги, светящиеся руны; череп следит за камерой или путником,
 *                   качается от ветра, при приближении путника вспыхивает и дрожит
 *   watchtower    — смотровая вышка, 3×3 м
 *   ritual_circle — ритуальный круг, 6×6 м: земляной помост, светящаяся красная роспись, жерди-рогатины с верёвками
 *   domain        — сцена 20×20 м: всё вместе, по тропе ходит богатырь
 *
 * Красное свечение (тотем, круг, глаза черепов) настраивается в панели: сила 0–3 и режим
 * «ночью / всегда / выкл.»; настройка общая для всех видов.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);

  const COL = {
    bone: '#b9ad92', boneDark: '#9c9079', rope: '#6b5a3e', rag: '#7b3526', ragDark: '#5e2a20', ragBright: '#8f3527',
    scale: '#a8955f', scaleDark: '#8c7c4f', claw: '#3a3228', feather: '#6a5640', featherLight: '#7d6548',
    paint: '#7a2f27', clay: '#6d5b48', mossHang: '#4f5f33',
  };

  // ---------- красное свечение: общая настройка ----------
  const RED = { k: 1, mode: 'night' };
  const redMats = [];
  const nightOf = (K) => Math.max(0, ((K.view ? K.view.state.time : 0.45) - 0.25) / 0.75);
  const pulseAt = (t) => 0.82 + 0.12 * Math.sin(t * 2.1) + 0.2 * Math.pow(Math.max(0, Math.sin(t * 4.2)), 6);
  function redFactor(K, t) {
    if (RED.mode === 'off') return 0;
    const n = nightOf(K);
    return (RED.mode === 'always' ? Math.max(n, 0.6) : n) * RED.k * pulseAt(t);
  }
  /** Меш красного свечения: днём — глухая красная краска, ночью — светится. */
  function redMesh(K, list, base = 3) {
    const { T } = K;
    const mat = new T.MeshStandardMaterial({ color: K.lin('#6e2a22'), emissive: K.lin('#ff2a14'), emissiveIntensity: 0, roughness: 0.85, metalness: 0, flatShading: true });
    const e = { mat, base, boost: 0 };
    redMats.push(e);
    const mesh = new T.Mesh(K.merge(list), mat);
    mesh.receiveShadow = true;
    return { mesh, e };
  }
  function redLight(K, group, x, y, z, base, dist) {
    const l = K.addGlowLight(group, x, y, z, base, dist);
    l.color = 0xff3a22;
    l.prio = 2;
    l.boost = 0;
    l.dyn = (glow, t) => redFactor(K, t) * base * (1 + l.boost);
    return l;
  }
  function updateRed(K, t) {
    const f = redFactor(K, t);
    redMats.forEach((e) => (e.mat.emissiveIntensity = f * e.base * (1 + e.boost)));
  }

  // ---------- панель настройки красного свечения ----------
  const panels = [];
  function syncPanels() {
    panels.forEach((p) => {
      p.querySelector('input[type=range]').value = String(RED.k);
      p.querySelector('output').textContent = RED.k.toFixed(1);
      p.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === RED.mode)));
    });
  }
  function makePanel(id) {
    const p = document.createElement('div');
    p.className = 'model-panel';
    p.innerHTML = `<span class="lbl">Красное свечение: <output>${RED.k.toFixed(1)}</output></span>
      <input type="range" id="red-${id}" min="0" max="3" step="0.1" value="${RED.k}" aria-label="Сила красного свечения">
      <div class="chips"><button type="button" data-mode="night">Ночью</button><button type="button" data-mode="always">Всегда</button><button type="button" data-mode="off">Выкл.</button></div>`;
    p.querySelector('input').addEventListener('input', (e) => { RED.k = +e.target.value; syncPanels(); });
    p.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { RED.mode = b.dataset.mode; syncPanels(); }));
    panels.push(p);
    syncPanels();
    return p;
  }

  // ---------- общие детали ----------
  function kitHelpers(K) {
    const { T, PAL, M, part, rand } = K;
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const UP = V(0, 1, 0);
    /** Палка/бревно между двумя точками. */
    function stick(L, a, b, r, hex = PAL.wood, o = {}) {
      const dir = new T.Vector3().subVectors(b, a), len = dir.length();
      const q = new T.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
      const m = new T.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(1, 1, 1));
      L.push(part(new T.CylinderGeometry(r * (o.taper ?? 0.85), r, len, o.seg ?? 6), hex,
        { m, tex: o.tex ?? 'wood', axis: [0, 1, 0], jitter: o.jitter ?? Math.min(0.012, r * 0.15), moss: o.moss ?? 0.15, ao: o.ao ?? true, vary: o.vary ?? 0.12 }));
    }
    /** Кривая палка из нескольких колен; возвращает точки колен. */
    function crooked(L, a, b, r, hex, bend = 0.12, n = 3, o = {}) {
      let prev = a.clone();
      const pts = [prev.clone()];
      for (let i = 1; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        if (i < n) p.add(V((rand() - 0.5) * bend, (rand() - 0.5) * bend * 0.5, (rand() - 0.5) * bend));
        stick(L, prev, p, r * (1 - 0.25 * (i - 1) / n), hex, o);
        prev = p;
        pts.push(p.clone());
      }
      return pts;
    }
    /** Рогатина-вилы: кривая жердь и 2–3 зубца; возвращает точку развилки. */
    function fork(L, base, h, r = 0.04, prongs = 3, hex = PAL.woodDark) {
      const top = base.clone().add(V((rand() - 0.5) * 0.15, h, (rand() - 0.5) * 0.15));
      crooked(L, base, top, r, hex, 0.08, 2, { moss: 0 });
      for (let i = 0; i < prongs; i++) {
        const a = (i / prongs) * Math.PI * 2 + rand();
        const s0 = top.clone().add(V(0, -0.12 - rand() * 0.1, 0));
        const tip = top.clone().add(V(Math.cos(a) * 0.18, 0.25 + rand() * 0.15, Math.sin(a) * 0.18));
        stick(L, s0, tip, r * 0.6, hex, { moss: 0, taper: 0.3, seg: 4 });
      }
      stick(L, top, top.clone().add(V(0, 0.3, 0)), r * 0.6, hex, { moss: 0, taper: 0.3, seg: 4 });
      return top;
    }
    /** Верёвка с провисом; возвращает точки подвеса. */
    function rope(L, a, b, sag = 0.3, n = 6) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(a.clone().lerp(b, t).add(V(0, -sag * 4 * t * (1 - t), 0)));
      }
      for (let i = 0; i < n; i++) stick(L, pts[i], pts[i + 1], 0.018, COL.rope, { tex: 'plain', jitter: 0, moss: 0, ao: false, seg: 4 });
      return pts;
    }
    /** Рваная красная тряпка, свисает из точки. */
    function rag(R, p, len = 0.6, w = 0.12, ry = 0) {
      const seg = Math.max(2, Math.round(len / 0.25));
      const g = new T.BoxGeometry(w, len, 0.014, 1, seg, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setX(i, pos.getX(i) * (1 - 0.25 * (0.5 - y / len)) + Math.sin(y * 9) * 0.015);
        if (y < -len / 2 + 0.01) pos.setY(i, y - rand() * 0.15);
      }
      const hex = [COL.rag, COL.ragDark, COL.ragBright][Math.floor(rand() * 3)];
      R.push(part(g, hex, { m: M(p.x, p.y - len / 2, p.z, (rand() - 0.5) * 0.2, ry + (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.16), jitter: 0.014, tex: 'cloth', ao: false, vary: 0.1 }));
    }
    /** Череп рогатого зверя в локальной системе (морда по +Z). Глазницы-угольки — в список E. */
    function skull(L, E, s = 1, antler = 1) {
      L.push(part(new T.IcosahedronGeometry(0.17 * s, 0), COL.bone, { m: M(0, 0, 0, 0, 0, 0, V(1, 0.85, 1.1)), jitter: 0.012 * s, ao: false, vary: 0.08 }));
      L.push(part(new T.CylinderGeometry(0.06 * s, 0.11 * s, 0.32 * s, 5), COL.bone, { m: M(0, -0.06 * s, 0.21 * s, Math.PI / 2 + 0.35, 0, 0), jitter: 0.008 * s, ao: false, vary: 0.08 }));
      L.push(part(new T.BoxGeometry(0.05 * s, 0.03 * s, 0.05 * s), '#1d1a17', { m: M(0, -0.1 * s, 0.34 * s), jitter: 0, ao: false, vary: 0 }));
      for (const sx of [-1, 1]) {
        L.push(part(new T.BoxGeometry(0.07 * s, 0.06 * s, 0.03 * s), '#1d1a17', { m: M(0.07 * sx * s, 0.02 * s, 0.15 * s), jitter: 0, ao: false, vary: 0 }));
        if (E) E.push(part(new T.IcosahedronGeometry(0.026 * s, 0), '#ff3a22', { m: M(0.07 * sx * s, 0.02 * s, 0.155 * s), jitter: 0, ao: false, vary: 0 }));
        if (!antler) continue;
        const A = s * antler;
        const root = V(0.09 * sx * s, 0.1 * s, -0.02 * s), mid = V(0.32 * sx * A, 0.3 * A, 0.02 * A), mid2 = V(0.52 * sx * A, 0.52 * A, -0.06 * A), tip = V(0.62 * sx * A, 0.82 * A, -0.14 * A);
        stick(L, root, mid, 0.032 * s, COL.boneDark, { tex: 'plain', moss: 0, ao: false, seg: 5 });
        stick(L, mid, mid2, 0.026 * s, COL.boneDark, { tex: 'plain', moss: 0, ao: false, seg: 5 });
        stick(L, mid2, tip, 0.02 * s, COL.boneDark, { tex: 'plain', moss: 0, ao: false, seg: 4, taper: 0.4 });
        for (const [b0, d] of [[mid, V(-0.02 * sx, 0.28, 0.14)], [mid2, V(0.06 * sx, 0.26, 0.12)], [mid2.clone().lerp(tip, 0.5), V(0.12 * sx, 0.12, -0.08)], [mid.clone().lerp(mid2, 0.4), V(0.05 * sx, 0.2, -0.14)]]) {
          stick(L, b0, b0.clone().add(d.multiplyScalar(A)), 0.014 * s, COL.boneDark, { tex: 'plain', moss: 0, ao: false, seg: 4, taper: 0.35 });
        }
      }
    }
    /** Череп, поставленный в мир: положение, поворот, масштаб, рога; глаза — в E. */
    function placeSkull(L, E, x, y, z, ry, s, antler = 1) {
      const sk = [], se = [];
      skull(sk, se, s, antler);
      const m = new T.Matrix4().makeRotationY(ry).setPosition(x, y, z);
      sk.forEach((geo) => geo.applyMatrix4(m));
      se.forEach((geo) => geo.applyMatrix4(m));
      L.push(...sk);
      if (E) E.push(...se);
    }
    /** Косточка. */
    function boneBit(L, x, y, z, len = 0.3, ry = 0, rz = Math.PI / 2) {
      const q = new T.Quaternion().setFromEuler(new T.Euler(0, ry, rz));
      const d = V(0, len / 2, 0).applyQuaternion(q);
      stick(L, V(x, y, z).sub(d), V(x, y, z).add(d), 0.02, COL.bone, { tex: 'plain', moss: 0, ao: false, seg: 5, taper: 1 });
      for (const e of [-1, 1]) L.push(part(new T.IcosahedronGeometry(0.034, 0), COL.bone, { m: M(x + d.x * e, y + d.y * e, z + d.z * e), jitter: 0.004, ao: false }));
    }
    /** Оберег: деревянный кружок на красной нити. */
    function charm(L, R, p, drop = 0.3) {
      stick(R, p, p.clone().add(V(0, -drop, 0)), 0.01, COL.rag, { tex: 'plain', moss: 0, ao: false, seg: 3, jitter: 0 });
      L.push(part(new T.CylinderGeometry(0.06, 0.06, 0.02, 7), PAL.woodLight, { m: M(p.x, p.y - drop - 0.05, p.z, Math.PI / 2, rand() * 3, 0), jitter: 0.004, ao: false }));
    }
    /** Кочка-дёрн. */
    function mound(L, x, z, rx, rz, h = 0.18) {
      L.push(part(new T.IcosahedronGeometry(1, 1), PAL.grass, { m: M(x, -h * 0.35, z, 0, rand() * 3, 0, V(rx, h, rz)), jitter: 0.04, moss: 0.35, mossHex: PAL.grassLight, tex: 'grass', ao: false, vary: 0.12 }));
    }
    return { V, stick, crooked, fork, rope, rag, skull, placeSkull, boneBit, charm, mound };
  }

  // =====================================================================
  // ИЗБУШКА НА КУРЬИХ НОЖКАХ
  // =====================================================================
  function buildChickenHut(K) {
    const { T, PAL, M, part, rand } = K;
    const H = kitHelpers(K);
    const { V } = H;
    const g = new T.Group();
    const x0 = 0.45, x1 = 3.55, z0 = 0.7, z1 = 3.3, zc = (z0 + z1) / 2, cxh = (x0 + x1) / 2, r = 0.13, row = 0.24, floor = 2.35, rows = 7;
    const wallTop = floor + r + rows * row;
    // тело избушки качается вокруг точки между бёдрами
    const pivot = V(cxh, floor, zc + 0.25);
    const body = new T.Group(), inner = new T.Group();
    body.position.copy(pivot);
    inner.position.copy(pivot).negate();
    body.add(inner);
    g.add(body);
    const L = [], G = [], R = [], E = [];

    // --- настил и кривой сруб (каждый ряд чуть съезжает — изба «завалилась»)
    L.push(part(new T.BoxGeometry(x1 - x0 + 0.35, 0.16, z1 - z0 + 0.35), PAL.woodDark, { m: M(cxh, floor, zc), tex: 'wood', axis: [1, 0, 0], jitter: 0.025 }));
    for (let k = 0; k < rows; k++) {
      const yx = floor + r + k * row, yz = yx + row / 2, lean = k * 0.012;
      for (const z of [z0, z1]) L.push(part(new T.CylinderGeometry(r, r * 1.06, x1 - x0 + 0.55 + (rand() - 0.5) * 0.18, 8), k % 3 ? PAL.log : PAL.woodDark,
        { m: M(cxh + lean + (rand() - 0.5) * 0.08, yx, z, 0, (rand() - 0.5) * 0.04, Math.PI / 2 + (rand() - 0.5) * 0.04), tex: 'wood', axis: [0, 1, 0], jitter: 0.02 }));
      for (const x of [x0, x1]) L.push(part(new T.CylinderGeometry(r, r * 1.06, z1 - z0 + 0.55 + (rand() - 0.5) * 0.18, 8), k % 2 ? PAL.log : PAL.wood,
        { m: M(x + lean, yz, zc + (rand() - 0.5) * 0.06, Math.PI / 2 + (rand() - 0.5) * 0.04, 0, 0), tex: 'wood', axis: [0, 1, 0], jitter: 0.02 }));
    }
    const rise = 2.2;
    for (let k = rows; ; k++) {
      const y = floor + r + k * row + row / 2, half = (zc - z0 + 0.1) * (1 - (y - wallTop) / rise);
      if (half < 0.22) break;
      for (const x of [x0, x1]) L.push(part(new T.CylinderGeometry(r, r, half * 2, 8), k % 2 ? PAL.log : PAL.wood, { m: M(x + rows * 0.012, y, zc, Math.PI / 2, 0, 0), tex: 'wood', axis: [0, 1, 0], jitter: 0.02 }));
    }
    // --- лохматая крыша: два ровных слоя тёса, третий — обломки враскид, мох, космы, торчащие палки
    const ridge = wallTop + rise, eave = 0.6, run = z1 + eave - zc, drop = run * rise / (zc - z0), slope = Math.hypot(run, drop), th = Math.atan2(drop, run);
    for (const s of [1, -1]) {
      for (let layer = 0; layer < 3; layer++) {
        for (let x = x0 - 0.7 + layer * 0.14; x < x1 + 0.7; x += layer === 2 ? 0.55 : 0.38) {
          const broken = layer === 2;
          const len = slope * (broken ? 0.4 + rand() * 0.4 : 0.86 + rand() * 0.18);
          const along = broken ? (rand() - 0.3) * (slope - len) : (slope - len) / 2;
          L.push(part(new T.BoxGeometry(layer === 1 ? 0.24 : 0.36, 0.07, len), rand() < 0.3 ? PAL.woodDark : PAL.roof, {
            m: M(x + 0.19, ridge + 0.1 + layer * 0.06 - drop / 2 + along * Math.sin(th), zc + s * (run / 2 - along * Math.cos(th)), s * th + (rand() - 0.5) * (broken ? 0.25 : 0.07), (rand() - 0.5) * (broken ? 0.3 : 0.07), (rand() - 0.5) * 0.06),
            jitter: 0.025, moss: 0.55, vary: 0.2, tex: 'roof', axis: [0, 0, 1],
          }));
        }
      }
      for (let i = 0; i < 16; i++) {
        const f = 0.1 + rand() * 0.85, x = x0 - 0.4 + rand() * (x1 - x0 + 0.8);
        L.push(part(new T.IcosahedronGeometry(1, 0), rand() < 0.6 ? '#4b5a30' : '#5d6b38',
          { m: M(x, ridge + 0.2 - drop * f, zc + s * run * f, s * th, rand() * 3, 0, V(0.22 + rand() * 0.25, 0.08, 0.16 + rand() * 0.16)), jitter: 0.025, ao: false, tex: 'grass' }));
      }
      for (let i = 0; i < 9; i++) {
        const x = x0 - 0.5 + rand() * (x1 - x0 + 1.0), y = ridge + 0.1 - drop, z = zc + s * (run - 0.05);
        L.push(part(new T.ConeGeometry(0.06, 0.3 + rand() * 0.35, 3), COL.mossHang, { m: M(x, y - 0.18, z, Math.PI + (rand() - 0.5) * 0.3, rand() * 3, 0), jitter: 0.01, ao: false, vary: 0.15 }));
      }
      for (let i = 0; i < 7; i++) {
        const x = x0 - 0.5 + rand() * (x1 - x0 + 1.0), f = 0.5 + rand() * 0.5;
        const a = V(x, ridge + 0.12 - drop * f, zc + s * run * f);
        H.stick(L, a, a.clone().add(V((rand() - 0.5) * 0.4, 0.15 + rand() * 0.35, s * (0.3 + rand() * 0.4))), 0.025, PAL.woodDark, { moss: 0, seg: 4, taper: 0.4 });
      }
    }
    L.push(part(new T.CylinderGeometry(0.15, 0.17, x1 - x0 + 1.5, 8), PAL.woodDark, { m: M(cxh, ridge + 0.2, zc, 0.02, 0, Math.PI / 2 + 0.03), tex: 'wood', axis: [0, 1, 0] }));
    // --- светёлка на коньке со своим окошком
    const tx = cxh + 0.55, tyb = ridge - 0.1;
    for (let k = 0; k < 4; k++) {
      const y = tyb + 0.1 + k * 0.17;
      for (const z of [zc - 0.42, zc + 0.42]) L.push(part(new T.CylinderGeometry(0.085, 0.09, 1.05, 7), k % 2 ? PAL.log : PAL.wood, { m: M(tx, y, z, 0, 0, Math.PI / 2), tex: 'wood', axis: [0, 1, 0], jitter: 0.012 }));
      for (const x of [tx - 0.45, tx + 0.45]) L.push(part(new T.CylinderGeometry(0.085, 0.09, 0.95, 7), k % 2 ? PAL.wood : PAL.log, { m: M(x, y + 0.085, zc, Math.PI / 2, 0, 0), tex: 'wood', axis: [0, 1, 0], jitter: 0.012 }));
    }
    const tRidge = tyb + 1.35;
    for (const s of [1, -1]) {
      for (let x = tx - 0.7; x < tx + 0.7; x += 0.3) {
        L.push(part(new T.BoxGeometry(0.29, 0.06, 0.78), rand() < 0.3 ? PAL.woodDark : PAL.roof, { m: M(x + 0.15, tRidge - 0.28, zc + s * 0.33, s * 0.95 + (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.08, 0), tex: 'roof', axis: [0, 0, 1], moss: 0.5, jitter: 0.02 }));
      }
    }
    G.push(part(new T.BoxGeometry(0.3, 0.3, 0.05), '#1b2024', { m: M(tx, tyb + 0.42, zc + 0.5), jitter: 0 }));
    L.push(part(new T.BoxGeometry(0.44, 0.06, 0.1), PAL.woodLight, { m: M(tx, tyb + 0.25, zc + 0.52), tex: 'wood', axis: [1, 0, 0] }));
    L.push(part(new T.BoxGeometry(0.46, 0.08, 0.08), PAL.woodLight, { m: M(tx, tyb + 0.6, zc + 0.52, 0, 0, 0.1), tex: 'wood', axis: [1, 0, 0] }));
    // --- печная труба: кривая кладка из камня и глины — из неё идёт дым
    const chx = x0 + 0.75, chz = zc - 0.75;
    let cy = ridge - 1.0;
    for (let k = 0; k < 7; k++, cy += 0.24) {
      const off = (rand() - 0.5) * 0.06 + k * 0.012;
      L.push(part(new T.BoxGeometry(0.42 - k * 0.012, 0.25, 0.42 - k * 0.012), rand() < 0.4 ? PAL.stoneDark : (rand() < 0.5 ? PAL.stone : COL.clay),
        { m: M(chx + off, cy, chz - off * 0.5, 0, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.06), tex: 'stone', jitter: 0.03, moss: 0.15, vary: 0.18 }));
    }
    L.push(part(new T.BoxGeometry(0.56, 0.08, 0.56), PAL.stoneDark, { m: M(chx + 0.09, cy - 0.06, chz - 0.04, 0, 0.3, 0.05), tex: 'stone', jitter: 0.03 }));
    const smokeAnchor = new T.Object3D();
    smokeAnchor.position.set(chx + 0.09, cy + 0.1, chz - 0.04);
    inner.add(smokeAnchor);
    // --- вилы-рогатины на коньке и светёлке, череп на торце конька
    H.fork(L, V(x0 - 0.55, ridge + 0.1, zc), 1.0, 0.045, 3);
    H.fork(L, V(x1 + 0.55, ridge + 0.1, zc), 1.2, 0.045, 3);
    H.fork(L, V(tx, tRidge - 0.05, zc), 0.8, 0.035, 3);
    H.placeSkull(L, E, x1 + 0.62, ridge + 1.05, zc, Math.PI / 2, 0.5, 0.8);
    // --- окна (свет ночью) с красными ставнями: фасад +Z и торец +X
    for (const [cx, cy2, cz, ry] of [[1.2, floor + 0.95, z1 + r + 0.02, 0], [x1 + r + 0.02, floor + 1.0, zc - 0.35, Math.PI / 2]]) {
      const W = (lx, ly, lz, geo, hex, o = {}) => part(geo, hex, { jitter: 0.006, ...o, m: new T.Matrix4().makeRotationY(ry).setPosition(cx, cy2, cz).multiply(M(lx, ly, lz, 0, 0, o.rz || 0)), base: -cy2 });
      G.push(W(0, 0, 0, new T.BoxGeometry(0.44, 0.48, 0.05), '#1b2024'));
      L.push(W(0, -0.3, 0.05, new T.BoxGeometry(0.66, 0.07, 0.12), PAL.woodLight, { tex: 'wood', axis: [1, 0, 0], rz: -0.06 }));
      L.push(W(0, 0.32, 0.05, new T.BoxGeometry(0.7, 0.1, 0.08), PAL.woodLight, { tex: 'wood', axis: [1, 0, 0], rz: 0.1 }));
      for (const sx of [-1, 1]) L.push(W(sx * 0.27, 0, 0.04, new T.BoxGeometry(0.07, 0.6, 0.07), PAL.woodLight, { tex: 'wood', axis: [0, 1, 0], rz: sx * 0.05 }));
      L.push(W(0, 0.02, 0.04, new T.BoxGeometry(0.04, 0.48, 0.04), PAL.woodDark));
      L.push(W(0, 0.02, 0.04, new T.BoxGeometry(0.44, 0.04, 0.04), PAL.woodDark, { rz: 0.08 }));
      L.push(W(-0.34, -0.02, 0.1, new T.BoxGeometry(0.26, 0.56, 0.04), COL.ragDark, { rz: 0.12, tex: 'wood', axis: [0, 1, 0] }));
    }
    // --- приоткрытая дверь на фасаде: свет в щели, приступок, череп над дверью
    const dx = 2.75;
    G.push(part(new T.BoxGeometry(0.1, 1.3, 0.03), '#1b2024', { m: M(dx - 0.33, floor + 0.8, z1 + r + 0.04), jitter: 0 }));
    L.push(part(new T.BoxGeometry(0.66, 1.4, 0.04), '#0d0c0b', { m: M(dx, floor + 0.8, z1 + r + 0.02), jitter: 0, vary: 0.02, ao: false }));
    for (let i = 0; i < 3; i++) L.push(part(new T.BoxGeometry(0.2, 1.34, 0.06), i % 2 ? PAL.wood : PAL.woodLight, { m: M(dx - 0.15 + i * 0.21, floor + 0.8, z1 + r + 0.1 + i * 0.03, 0, -0.35, (rand() - 0.5) * 0.04), jitter: 0.01, tex: 'wood', axis: [0, 1, 0] }));
    L.push(part(new T.BoxGeometry(0.9, 0.12, 0.1), PAL.woodLight, { m: M(dx, floor + 1.58, z1 + r + 0.06, 0, 0, -0.07), tex: 'wood', axis: [1, 0, 0] }));
    for (let i = 0; i < 4; i++) L.push(part(new T.BoxGeometry(0.24, 0.07, 0.55), PAL.wood, { m: M(dx - 0.36 + i * 0.25, floor + 0.02, z1 + 0.5, 0, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.06), tex: 'wood', axis: [0, 0, 1], jitter: 0.012, moss: 0.2 }));
    H.placeSkull(L, E, dx, floor + 1.82, z1 + r + 0.16, 0, 0.38, 0.6);
    // --- огоньки-светцы по фасаду; кости, обереги и тряпки на свесе
    for (const [x, y] of [[0.35, floor + 1.55], [1.9, floor + 1.7], [3.4, floor + 1.45], [0.6, floor + 0.35], [3.3, floor + 0.3]]) {
      G.push(part(new T.IcosahedronGeometry(0.05, 0), '#1b2024', { m: M(x, y, z1 + r + 0.08), jitter: 0 }));
      L.push(part(new T.ConeGeometry(0.06, 0.08, 4), PAL.iron, { m: M(x, y + 0.08, z1 + r + 0.08, 0, 0.8, 0), jitter: 0 }));
    }
    const eaveY = ridge + 0.1 - drop - 0.05, eaveZ = zc + run - 0.1;
    for (let i = 0; i < 7; i++) {
      const x = x0 - 0.3 + i * 0.62 + (rand() - 0.5) * 0.2, p = V(x, eaveY, eaveZ);
      if (i % 3 === 0) H.rag(R, p, 0.5 + rand() * 0.5, 0.1, 0);
      else if (i % 3 === 1) { H.rope(L, p, p.clone().add(V(0, -0.35, 0)), 0, 1); H.boneBit(L, x, eaveY - 0.44, eaveZ, 0.18, 0, 0); }
      else H.charm(L, R, p, 0.25 + rand() * 0.2);
    }

    // --- курьи ноги: бедро в перьях (таз → пятка), цевка в чешуе (пятка → стопа), пальцы стоят на земле
    const legs = [];
    for (const lx of [1.35, 2.65]) {
      const s = lx < 2 ? -1 : 1;
      const hip = V(lx, floor - 0.05, zc + 0.25), heel = V(lx + s * 0.42, 1.15, zc - 0.05), foot = V(lx + s * 0.55, 0.15, zc + 0.75);
      const L1 = hip.distanceTo(heel), L2 = heel.distanceTo(foot);
      const TH = [], SH = [], TO = [];
      H.stick(TH, V(0, 0, 0), V(0, L1, 0), 0.36, COL.feather, { tex: 'bark', taper: 0.55, moss: 0, jitter: 0.03, seg: 7 });
      for (let i = 0; i < 9; i++) {
        const t = 0.1 + rand() * 0.55, a = rand() * 6.28, rr = 0.34 * (1 - t * 0.45);
        TH.push(part(new T.ConeGeometry(0.11, 0.36, 3), rand() < 0.5 ? COL.feather : COL.featherLight,
          { m: M(Math.cos(a) * rr, t * L1 - 0.06, Math.sin(a) * rr, 0.45 * Math.sin(a), 0, -0.45 * Math.cos(a), V(1, 1, 0.35)), tex: 'bark', jitter: 0.01, ao: false }));
      }
      SH.push(part(new T.IcosahedronGeometry(0.17, 0), COL.scale, { m: M(0, 0, 0), jitter: 0.01, ao: false }));
      H.stick(SH, V(0, 0, 0), V(0, L2, 0), 0.14, COL.scale, { tex: 'bark', taper: 0.8, moss: 0, jitter: 0.01, seg: 6 });
      for (let k = 1; k < 5; k++) SH.push(part(new T.CylinderGeometry(0.15, 0.15, 0.045, 6), COL.scaleDark, { m: M(0, (k / 5) * L2, 0, 0.12, k, 0), jitter: 0.004, ao: false }));
      for (const [a, len] of [[-0.6, 0.75], [0, 0.88], [0.6, 0.75], [Math.PI, 0.45]]) {
        const d = V(Math.sin(a), 0, Math.cos(a));
        const k1 = foot.clone().add(d.clone().multiplyScalar(len * 0.55)).setY(0.1), k2 = foot.clone().add(d.clone().multiplyScalar(len)).setY(0.06);
        H.stick(TO, foot.clone().setY(0.14), k1, 0.095, COL.scale, { tex: 'bark', moss: 0, seg: 5 });
        H.stick(TO, k1, k2, 0.075, COL.scale, { tex: 'bark', moss: 0, seg: 5 });
        H.stick(TO, k2, k2.clone().add(d.clone().multiplyScalar(0.22)).setY(0.0), 0.058, COL.claw, { tex: 'plain', moss: 0, seg: 4, taper: 0.1 });
      }
      const thigh = K.facetGroup(TH), shin = K.facetGroup(SH), toes = K.facetGroup(TO);
      g.add(thigh, shin, toes);
      legs.push({ hip, foot, L1, L2, thigh, shin, toes, pole: heel.clone().sub(hip.clone().add(foot).multiplyScalar(0.5)) });
    }

    // --- рядом: кривой столб с перекладиной, тряпками и костью (неподвижный), кочки, камни
    const S = [], SR = [];
    const pTop = H.crooked(S, V(3.85, 0, 3.85), V(3.8, 1.9, 3.9), 0.055, PAL.woodDark, 0.08, 3, { moss: 0.25 }).pop();
    H.stick(S, pTop.clone().add(V(-0.45, -0.15, 0)), pTop.clone().add(V(0.3, -0.05, 0.05)), 0.03, PAL.woodDark, { moss: 0 });
    for (const dx2 of [-0.35, -0.12, 0.12]) H.rag(SR, pTop.clone().add(V(dx2, -0.12, 0.02)), 0.45 + rand() * 0.4, 0.09, 0);
    H.boneBit(S, pTop.x + 0.25, pTop.y - 0.35, pTop.z + 0.05, 0.16, 0, 0);
    H.mound(S, 1.3, zc + 0.8, 0.8, 0.8);
    H.mound(S, 2.9, zc + 0.8, 0.8, 0.7);
    K.rock(S, 0.4, 0, 3.7, 0.3);
    K.rock(S, 3.5, 0, 0.5, 0.22, PAL.stoneDark);
    H.boneBit(S, 0.9, 0.04, 3.4, 0.3, 0.7);
    for (let i = 0; i < 12; i++) K.tuft(S, 0.3 + rand() * 3.4, 0, 0.3 + rand() * 3.4, 3, 0.35);

    inner.add(K.facetGroup(L));
    inner.add(K.facetGroup(R, { wind: { phase: 3.1, h: 14 } }));
    inner.add(K.glassMesh(G));
    inner.add(redMesh(K, E, 2.5).mesh);
    g.add(K.facetGroup(S), K.facetGroup(SR, { wind: { phase: 2.5, h: 6 } }));
    for (const [x, y, z, b, dd] of [[1.2, floor + 0.95, z1 + 0.8, 1.1, 5], [x1 + 0.8, floor + 1.0, zc - 0.35, 0.9, 5], [dx, floor + 0.9, z1 + 0.7, 0.6, 3], [tx, tyb + 0.42, zc + 0.9, 0.6, 4]]) {
      K.addGlowLight(inner, x, y, z, b, dd).prio = 1;
    }

    // --- анимация: переминается с ноги на ногу, свободная нога приподнимается (двухзвенный IK)
    const e = new T.Euler(), d = new T.Vector3(), n = new T.Vector3(), UPV = V(0, 1, 0);
    const hipNow = (hipBind) => hipBind.clone().sub(pivot).applyQuaternion(body.quaternion).add(body.position);
    function solveLeg(lg, lift) {
      const hip = hipNow(lg.hip);
      const foot = lg.foot.clone().add(V(0, lift, lift * 0.3));
      d.subVectors(foot, hip);
      const dist = Math.min(Math.max(d.length(), 0.3), lg.L1 + lg.L2 - 1e-3);
      d.normalize();
      const a = (lg.L1 * lg.L1 + dist * dist - lg.L2 * lg.L2) / (2 * dist), h = Math.sqrt(Math.max(0, lg.L1 * lg.L1 - a * a));
      n.copy(lg.pole).sub(d.clone().multiplyScalar(lg.pole.dot(d))).normalize();
      const heel = hip.clone().add(d.clone().multiplyScalar(a)).add(n.clone().multiplyScalar(h));
      lg.thigh.position.copy(hip);
      lg.thigh.quaternion.setFromUnitVectors(UPV, heel.clone().sub(hip).normalize());
      lg.shin.position.copy(heel);
      lg.shin.quaternion.setFromUnitVectors(UPV, foot.clone().sub(heel).normalize());
      lg.toes.position.set(0, lift, lift * 0.3);
    }
    let tAcc = 0;
    function update(dt, t) {
      tAcc += dt;
      const ph = tAcc * 0.85, s = Math.sin(ph);
      body.position.set(pivot.x + 0.17 * s, pivot.y - 0.05 * Math.abs(s) + 0.03 * Math.sin(ph * 2 + 1), pivot.z + 0.03 * Math.sin(ph * 0.5));
      e.set(0.025 * Math.sin(ph * 2), 0.04 * Math.sin(ph * 0.5), -0.06 * s);
      body.quaternion.setFromEuler(e);
      solveLeg(legs[0], Math.max(0, s - 0.55) * 0.55);
      solveLeg(legs[1], Math.max(0, -s - 0.55) * 0.55);
      updateRed(K, t);
    }
    update(0, 0);
    return { group: g, update, smokes: [smokeAnchor] };
  }

  // =====================================================================
  // КОСТЯНОЙ ТОТЕМ
  // =====================================================================
  function buildBoneTotem(K) {
    const { T, PAL, M, part, rand } = K;
    const H = kitHelpers(K);
    const { V } = H;
    const g = new T.Group();
    const cx = 1, cz = 1, top = 3.9;
    const upper = new T.Group(); // всё выше треножника качается как одно целое
    upper.position.set(cx, 0.9, cz);
    const upIn = new T.Group();
    upIn.position.set(-cx, -0.9, -cz);
    upper.add(upIn);
    g.add(upper);
    const B = [], L = [], R = [], E = [];
    // треножник у основания
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4;
      H.crooked(B, V(cx + Math.cos(a) * 0.55, 0, cz + Math.sin(a) * 0.55), V(cx + Math.cos(a) * 0.08, 1.25, cz + Math.sin(a) * 0.08), 0.07, i ? PAL.wood : PAL.woodDark, 0.08, 2, { moss: 0.3 });
    }
    B.push(part(new T.TorusGeometry(0.16, 0.03, 4, 7), COL.rope, { m: M(cx, 1.05, cz, Math.PI / 2, 0, 0.3), jitter: 0.004 }));
    // ствол: две корявые жерди связкой, верёвочные перевязки
    for (let i = 0; i < 2; i++) {
      const a = i * 3.1 + 0.2;
      H.crooked(L, V(cx + Math.cos(a) * 0.07, 0.9, cz + Math.sin(a) * 0.07), V(cx + Math.cos(a) * 0.03, top, cz + Math.sin(a) * 0.03), 0.08, i ? PAL.wood : PAL.woodDark, 0.07, 4, { moss: 0.15 });
    }
    for (const y of [1.6, 2.3, 2.95, 3.55]) L.push(part(new T.TorusGeometry(0.12, 0.024, 4, 7), COL.rope, { m: M(cx, y, cz, Math.PI / 2 + (rand() - 0.5) * 0.3, 0, rand()), jitter: 0.004 }));
    // вырезанные руны — светятся красным
    for (const [y, w, h2, rz] of [[1.45, 0.05, 0.14, 0], [1.75, 0.1, 0.03, 0.3], [2.05, 0.04, 0.16, -0.25], [2.55, 0.1, 0.03, -0.3], [2.75, 0.04, 0.12, 0.2]]) {
      E.push(part(new T.BoxGeometry(w, h2, 0.02), '#ff3a22', { m: M(cx, y, cz + 0.105, 0, 0, rz), jitter: 0, ao: false, vary: 0 }));
    }
    // две пары рук-сучьев: нижняя короткая, верхняя широкая, пальцы-сучья вверх
    for (const [armY, reach, fingers] of [[2.15, 0.7, 2], [3.05, 1.15, 3]]) {
      for (const s of [-1, 1]) {
        const tip = V(cx + s * reach, armY + 0.18 + rand() * 0.15, cz + (rand() - 0.5) * 0.2);
        const pts = H.crooked(L, V(cx, armY, cz), tip, 0.06, PAL.woodDark, 0.1, 3, { moss: 0.1 });
        for (let f = 0; f < fingers; f++) {
          const b = pts[Math.min(pts.length - 1, 1 + f)];
          H.crooked(L, b, b.clone().add(V(s * (0.03 + rand() * 0.15), 0.35 + rand() * 0.4, (rand() - 0.5) * 0.2)), 0.028, PAL.woodDark, 0.06, 2, { moss: 0, taper: 0.5 });
        }
        for (let k = 0; k < (armY > 3 ? 5 : 3); k++) {
          const p = V(cx, armY, cz).lerp(tip, 0.2 + k * (armY > 3 ? 0.18 : 0.3)).add(V(0, -0.04, 0));
          const kind = (k + (s > 0 ? 1 : 0)) % 3;
          if (kind === 0) H.rag(R, p, 0.5 + rand() * 0.6, 0.09 + rand() * 0.05, 0);
          else if (kind === 1) H.charm(L, R, p, 0.2 + rand() * 0.25);
          else { H.rope(L, p, p.clone().add(V(0, -0.3, 0)), 0, 1); H.boneBit(L, p.x, p.y - 0.38, p.z, 0.15, 0, 0); }
        }
      }
    }
    // длинные красные полосы из-под черепа
    for (let k = 0; k < 9; k++) {
      const a = rand() * 6.28;
      H.rag(R, V(cx + Math.cos(a) * 0.14, top - 0.2 - rand() * 0.25, cz + Math.sin(a) * 0.14), 1.1 + rand() * 0.9, 0.08 + rand() * 0.05, a);
    }
    // череп с большими рогами на поворотном шарнире
    const head = new T.Group();
    head.position.set(cx, top + 0.18, cz);
    const SK = [], SE = [];
    H.skull(SK, SE, 1.15, 1.25);
    head.add(K.facetGroup(SK));
    const eyes = redMesh(K, SE, 4);
    head.add(eyes.mesh);
    upIn.add(head);
    // основание: кочка, камни, кости, маленький череп
    const G0 = [];
    H.mound(G0, cx, cz, 1.0, 0.95, 0.24);
    K.rock(G0, cx - 0.65, 0, cz + 0.35, 0.24);
    K.rock(G0, cx + 0.55, 0, cz - 0.45, 0.2, PAL.stoneDark);
    H.boneBit(G0, cx + 0.5, 0.06, cz + 0.55, 0.36, 0.6);
    H.boneBit(G0, cx - 0.35, 0.06, cz + 0.65, 0.28, -0.4);
    H.placeSkull(G0, null, cx + 0.2, 0.08, cz + 0.72, 0.7, 0.35, 0);
    for (let i = 0; i < 8; i++) K.tuft(G0, cx + (rand() - 0.5) * 1.8, 0.05, cz + (rand() - 0.5) * 1.8, 3, 0.35);
    g.add(K.facetGroup(B), K.facetGroup(G0));
    upIn.add(K.facetGroup(L));
    upIn.add(K.facetGroup(R, { wind: { phase: 1.3, h: 7 } }));
    const runes = redMesh(K, E, 2.2);
    upIn.add(runes.mesh);
    const lamp = redLight(K, upIn, cx, top + 0.1, cz + 0.4, 1.4, 5);

    // --- реакция: череп поворачивается к цели (путник ближе 6 м, иначе — зритель), ветер раскачивает,
    //     ночью горят глаза и руны; при приближении путника вспыхивают, череп наклоняется, тотем дрожит
    let yaw = 0, near = 0;
    const wp = new T.Vector3();
    function update(dt, t, target) {
      const k = Math.min(1, dt * 2.5);
      const base = g.getWorldPosition(wp).clone().add(V(cx, top, cz));
      let targetNear = 0;
      if (target) targetNear = Math.max(0, Math.min(1, (6 - Math.hypot(target.x - base.x, target.z - base.z)) / 4));
      let want;
      if (target && targetNear > 0) want = Math.atan2(target.x - base.x, target.z - base.z);
      else want = (((K.view ? K.view.state.az : 45) * Math.PI) / 180) + Math.sin(t * 0.23) * 0.35;
      want -= g.rotation.y;
      const dA = ((want - yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      yaw = Math.max(-1.3, Math.min(1.3, yaw + dA * k * 0.8));
      near += (targetNear - near) * k;
      head.rotation.set(-0.12 + near * 0.15 + Math.sin(t * 0.7) * 0.03, yaw, Math.sin(t * 0.5) * 0.04);
      const wind = K.windU ? K.windU.value : 1;
      const tremble = near * (Math.sin(t * 31) * 0.006 + Math.sin(t * 23) * 0.004);
      upper.rotation.set(Math.sin(t * 0.9 + 1) * 0.012 * wind + tremble, 0, Math.sin(t * 1.1) * 0.018 * wind + tremble);
      eyes.e.boost = near * 1.5;
      runes.e.boost = near;
      lamp.boost = near * 1.5;
      updateRed(K, t);
    }
    update(0.016, 0);
    return { group: g, update };
  }

  // =====================================================================
  // СМОТРОВАЯ ВЫШКА
  // =====================================================================
  function buildWatchtower(K) {
    const { T, PAL, M, part, rand } = K;
    const H = kitHelpers(K);
    const { V } = H;
    const g = new T.Group();
    const L = [], G = [], R = [];
    const c = 1.5, deck = 5.1;
    const bottom = [[0.3, 0.3], [2.7, 0.3], [2.7, 2.7], [0.3, 2.7]], topC = [[0.75, 0.75], [2.25, 0.75], [2.25, 2.25], [0.75, 2.25]];
    const at = (i, y) => { const f = y / deck; return V(bottom[i][0] + (topC[i][0] - bottom[i][0]) * f, y, bottom[i][1] + (topC[i][1] - bottom[i][1]) * f); };
    for (let i = 0; i < 4; i++) H.crooked(L, at(i, 0), at(i, deck + 0.9), 0.12, i % 2 ? PAL.log : PAL.wood, 0.06, 3, { moss: 0.3, seg: 7 });
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      for (const [y0, y1] of [[0.4, 2.6], [2.6, deck - 0.15]]) {
        H.stick(L, at(i, y0), at(j, y1), 0.055, PAL.woodDark, { moss: 0.1 });
        H.stick(L, at(j, y0), at(i, y1), 0.055, PAL.woodDark, { moss: 0.1 });
      }
      H.stick(L, at(i, 2.6), at(j, 2.6), 0.065, PAL.wood, { moss: 0.2 });
    }
    for (let x = 0.55; x < 2.5; x += 0.26) {
      L.push(part(new T.BoxGeometry(0.24, 0.07, 1.95 + (rand() - 0.5) * 0.1), rand() < 0.4 ? PAL.wood : PAL.woodLight, { m: M(x + 0.12, deck, c, 0, (rand() - 0.5) * 0.03, 0), tex: 'wood', axis: [0, 0, 1], jitter: 0.01, moss: 0.25 }));
    }
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      H.stick(L, at(i, deck - 0.1), at(j, deck - 0.1), 0.07, PAL.woodDark, { moss: 0.15 });
      H.stick(L, at(i, deck + 0.75), at(j, deck + 0.75), 0.045, PAL.wood, { moss: 0.1 });
      for (const f of [0.33, 0.66]) {
        const p = at(i, deck).lerp(at(j, deck), f);
        H.stick(L, p, p.clone().setY(deck + 0.75), 0.03, PAL.woodLight, { moss: 0 });
      }
    }
    const roofBase = deck + 1.7, rise = 0.75, zc = 1.5, run = zc - 0.35, slope = Math.hypot(run, rise), th = Math.atan2(rise, run);
    for (let i = 0; i < 4; i++) H.stick(L, at(i, deck + 0.9), V(topC[i][0], roofBase, topC[i][1]), 0.06, PAL.wood, { moss: 0.1 });
    for (const s of [1, -1]) {
      for (let x = 0.35; x < 2.7; x += 0.34) {
        L.push(part(new T.BoxGeometry(0.33, 0.06, slope * (0.95 + rand() * 0.12)), rand() < 0.3 ? PAL.woodDark : PAL.roof, {
          m: M(x + 0.17, roofBase + rise / 2 + 0.05, zc + s * run / 2, s * th + (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.04, 0), tex: 'roof', axis: [0, 0, 1], moss: 0.45, vary: 0.16, jitter: 0.015,
        }));
      }
    }
    H.stick(L, V(0.2, roofBase + rise + 0.08, zc), V(2.8, roofBase + rise + 0.08, zc), 0.08, PAL.woodDark, { moss: 0.2 });
    const pole = V(2.6, roofBase + rise + 0.9, zc);
    H.stick(L, V(2.6, roofBase + rise, zc), pole, 0.03, PAL.woodDark, { moss: 0 });
    R.push(part(new T.BoxGeometry(0.55, 0.28, 0.014, 3, 1, 1), COL.rag, { m: M(2.6 - 0.28, pole.y - 0.15, zc, 0, 0.2, 0), jitter: 0.02, ao: false }));
    H.fork(L, V(0.3, roofBase + rise, zc), 0.5, 0.025, 2);
    for (const [i, f] of [[0, 0.3], [1, 0.7], [2, 0.5]]) H.rag(R, at(i, deck + 0.75).lerp(at((i + 1) % 4, deck + 0.75), f), 0.4 + rand() * 0.3, 0.08, 0);
    H.charm(L, R, at(3, deck + 0.75).lerp(at(0, deck + 0.75), 0.5), 0.25);
    G.push(part(new T.BoxGeometry(0.18, 0.24, 0.18), '#1b2024', { m: M(1.5, roofBase - 0.35, zc), jitter: 0 }));
    L.push(part(new T.ConeGeometry(0.17, 0.12, 4), PAL.iron, { m: M(1.5, roofBase - 0.17, zc, 0, Math.PI / 4, 0), jitter: 0 }));
    H.rope(L, V(1.5, roofBase + 0.02, zc), V(1.5, roofBase - 0.12, zc), 0, 1);
    const l0 = V(1.5, 0, 3.05), l1 = V(1.5, deck + 0.1, 2.35);
    for (const dx of [-0.25, 0.25]) H.stick(L, l0.clone().add(V(dx, 0, 0)), l1.clone().add(V(dx, 0.6, 0)), 0.045, PAL.wood, { moss: 0.1 });
    for (let k = 1; k < 16; k++) {
      if (k === 9) continue; // выломанная перекладина
      const p = l0.clone().lerp(l1, k / 16);
      L.push(part(new T.CylinderGeometry(0.025, 0.025, 0.54, 5), PAL.woodLight, { m: M(p.x, p.y, p.z, 0, (rand() - 0.5) * 0.1, Math.PI / 2 + (rand() - 0.5) * 0.12), jitter: 0.003 }));
    }
    for (const [x, z] of [[0.3, 0.3], [2.7, 2.7], [2.7, 0.3], [0.3, 2.7]]) K.rock(L, x + (rand() - 0.5) * 0.3, 0, z + (rand() - 0.5) * 0.3, 0.2, rand() < 0.5 ? PAL.stone : PAL.stoneDark);
    for (let i = 0; i < 8; i++) K.tuft(L, 0.2 + rand() * 2.6, 0, 0.2 + rand() * 2.6, 3, 0.35);
    g.add(K.facetGroup(L));
    g.add(K.facetGroup(R, { wind: { phase: 0.7, h: 8 } }));
    g.add(K.glassMesh(G));
    K.addGlowLight(g, 1.5, roofBase - 0.35, zc, 1.3, 7);
    return { group: g };
  }

  // =====================================================================
  // РИТУАЛЬНЫЙ КРУГ
  // =====================================================================
  function buildRitualCircle(K) {
    const { T, PAL, M, part, rand } = K;
    const H = kitHelpers(K);
    const { V } = H;
    const g = new T.Group();
    const L = [], G = [], R = [], E = [];
    const c = 3, top = 0.34;
    // земляной помост с каменным бордюром
    L.push(part(new T.CylinderGeometry(2.6, 2.95, top, 16), PAL.dirt, { m: M(c, top / 2, c, 0, rand(), 0), tex: 'dirt', jitter: 0.03, vary: 0.1, ao: false, side: PAL.soil }));
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + rand() * 0.1;
      K.rock(L, c + Math.sin(a) * 2.8, 0, c + Math.cos(a) * 2.8, 0.2 + rand() * 0.1, rand() < 0.4 ? PAL.stoneDark : PAL.stone);
    }
    // роспись (светится красным): три кольца, восемь лучей, насечки-руны, крест в центре
    for (const rr of [0.55, 1.25, 1.95]) E.push(part(new T.TorusGeometry(rr, 0.04, 3, 28), COL.paint, { m: M(c, top + 0.01, c, Math.PI / 2, 0, 0), jitter: 0.008, ao: false, vary: 0 }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      E.push(part(new T.BoxGeometry(0.07, 0.015, 1.7), COL.paint, { m: M(c + Math.sin(a) * 1.4, top + 0.01, c + Math.cos(a) * 1.4, 0, a + (rand() - 0.5) * 0.04, 0), jitter: 0.005, ao: false, vary: 0 }));
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.2 + Math.PI / 16, rr = i % 2 ? 1.6 : 0.9;
      E.push(part(new T.BoxGeometry(0.05, 0.015, 0.22), COL.paint, { m: M(c + Math.sin(a) * rr, top + 0.01, c + Math.cos(a) * rr, 0, a + Math.PI / 2 + (rand() - 0.5) * 0.3, 0), jitter: 0.004, ao: false, vary: 0 }));
    }
    for (const a of [0, Math.PI / 2]) E.push(part(new T.BoxGeometry(0.06, 0.015, 0.5), COL.paint, { m: M(c, top + 0.012, c, 0, a + 0.2, 0), jitter: 0, ao: false, vary: 0 }));
    // алтарный камень с черепом в центре
    L.push(part(new T.IcosahedronGeometry(1, 0), PAL.stone, { m: M(c + 0.1, top + 0.08, c - 0.1, 0, 0.4, 0, V(0.3, 0.14, 0.26)), jitter: 0.02, tex: 'stone', ao: false }));
    H.placeSkull(L, E, c + 0.1, top + 0.3, c - 0.1, 0.8, 0.42, 0.7);
    // менгиры по сторонам
    for (const [a, sx, sy] of [[2.4, 0.3, 0.8], [3.9, 0.36, 0.95], [5.4, 0.28, 0.7]]) {
      L.push(part(new T.IcosahedronGeometry(1, 0), PAL.stone, { m: M(c + Math.sin(a) * 3.15, sy * 0.7, c + Math.cos(a) * 3.15, 0.06, a, (rand() - 0.5) * 0.12, V(sx, sy, sx * 0.8)), jitter: 0.05, moss: 0.4, tex: 'stone', vary: 0.14 }));
    }
    // жерди-рогатины по задней дуге, верёвки с тряпками и оберегами, череп на крайней
    const tops = [3.5, 4.3, 5.1, 5.9].map((a, i) => {
      const b = V(c + Math.sin(a) * 3.05, 0, c + Math.cos(a) * 3.05);
      const t = H.fork(L, b, [3.1, 2.7, 2.9, 3.3][i], 0.07, 2);
      L.push(part(new T.TorusGeometry(0.09, 0.022, 4, 6), COL.rope, { m: M(t.x, t.y - 0.3, t.z, Math.PI / 2, 0, 0), jitter: 0 }));
      return t.clone().add(V(0, -0.28, 0));
    });
    for (let i = 0; i < tops.length - 1; i++) {
      H.rope(L, tops[i], tops[i + 1], 0.5, 7).slice(1, -1).forEach((p) => {
        if (rand() < 0.75) H.rag(R, p, 0.45 + rand() * 0.8, 0.08 + rand() * 0.06, 0);
        else H.charm(L, R, p, 0.2);
      });
    }
    H.placeSkull(L, E, tops[3].x, tops[3].y + 0.62, tops[3].z, -0.8, 0.4, 0.8);
    // свечи (янтарь) и красный свет из центра
    for (const a of [0.9, 2.1, 4.6, 5.6]) {
      const x = c + Math.sin(a) * 2.35, z = c + Math.cos(a) * 2.35;
      L.push(part(new T.IcosahedronGeometry(1, 0), PAL.stoneDark, { m: M(x, top + 0.04, z, 0, a, 0, V(0.18, 0.1, 0.16)), jitter: 0.015, tex: 'stone', ao: false }));
      for (const [dx, h] of [[-0.05, 0.16], [0.06, 0.11]]) {
        L.push(part(new T.CylinderGeometry(0.025, 0.03, h, 6), PAL.bone, { m: M(x + dx, top + 0.12 + h / 2, z), jitter: 0, ao: false }));
        G.push(part(new T.ConeGeometry(0.018, 0.05, 4), '#1b2024', { m: M(x + dx, top + 0.14 + h + 0.02, z), jitter: 0 }));
      }
      K.addGlowLight(g, x, top + 0.5, z, 0.5, 3);
    }
    for (const [x, z, a] of [[c + 1.3, c + 2.1, 0.4], [c - 2.0, c + 1.2, -0.9], [c + 2.2, c - 1.1, 1.3]]) H.boneBit(L, x, top + 0.04, z, 0.3, a);
    for (let i = 0; i < 22; i++) {
      const a = rand() * 6.28, rr = 2.9 + rand() * 0.4;
      K.tuft(L, c + Math.sin(a) * rr, 0, c + Math.cos(a) * rr, 3, 0.35);
    }
    g.add(K.facetGroup(L));
    g.add(K.facetGroup(R, { wind: { phase: 2.2, h: 7 } }));
    g.add(K.glassMesh(G));
    g.add(redMesh(K, E, 2.4).mesh);
    redLight(K, g, c, top + 0.6, c, 2.2, 6);
    return { group: g, update: (dt, t) => updateRed(K, t) };
  }

  // =====================================================================
  // СЦЕНА: ВЛАДЕНИЯ ЛЕСОВИКА (20×20 м)
  // =====================================================================
  function buildDomain(K) {
    const { T, PAL, M, part, rand } = K;
    const H = kitHelpers(K);
    const { V } = H;
    const N = 20;
    const g = new T.Group();

    // ---------- рельеф: кочки, ямы, пруд, колеи троп; под постройками — ровно ----------
    const FLAT = [[0.3, 7.0, 7.0, 13.8], [2.7, 0.3, 6.3, 3.9], [11.6, 0.9, 16.4, 5.6], [8.6, 8.2, 11.4, 10.8], [11.2, 11.5, 17.8, 18.1], [7.4, 13.2, 8.8, 14.4], [6.9, 5.8, 9.0, 7.0], [9.9, 5.6, 14.7, 6.4]];
    const flatF = (x, z) => {
      let f = 1;
      for (const [ax, az, bx, bz] of FLAT) {
        const dx = Math.max(ax - x, 0, x - bx), dz = Math.max(az - z, 0, z - bz);
        f = Math.min(f, Math.min(1, Math.hypot(dx, dz) / 0.8));
      }
      return f;
    };
    const POND = [4.3, 16.8, 2.6];
    const PITS = [[15.9, 8.6, 0.75], [6.6, 4.3, 0.6], [18.2, 14.6, 0.8], [2.4, 11.2, 0.55], [9.2, 18.9, 0.6]];
    const WALK = [[8.2, 11.6], [10.6, 11.2], [11.2, 13.4], [10.9, 17.4], [9.0, 15.8], [8.2, 11.6]];
    const PATHS = [[[6.5, 9.5], [9.5, 10.2], [11.2, 11.4]], [[9.5, 10.2], [10.5, 7.5], [13, 5.8]], [[6.5, 9.5], [5, 6.5], [4.2, 4.2]], [[11.2, 13.4], [10.9, 17.4], [10.5, 19.9]], [[8.2, 11.6], [9.0, 15.8], [10.9, 17.4]], [[6.4, 14.0], [6.9, 12.6]]];
    const segDist = (x, z, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); };
    const pathD = (x, z) => { let d = 99; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i], p[i + 1])); return d; };
    const HUM = [];
    for (let i = 0; i < 46; i++) {
      const x = 0.5 + rand() * 19, z = 0.5 + rand() * 19;
      if (pathD(x, z) < 1.1 || flatF(x, z) < 1 || Math.hypot(x - POND[0], z - POND[1]) < POND[2] + 0.6) continue;
      HUM.push([x, z, 0.35 + rand() * 0.55, 0.12 + rand() * 0.22]);
    }
    const hgt = (x, z) => {
      let h = (Math.sin(x * 0.9 + z * 0.4) * 0.5 + Math.sin(z * 1.3 - x * 0.7) * 0.35 + Math.sin(x * 2.3 + z * 1.9) * 0.15) * 0.07;
      for (const [hx, hz, r, hh] of HUM) { const d = Math.hypot(x - hx, z - hz); if (d < r) h += hh * (1 - (d / r) ** 2); }
      for (const [px, pz, r] of PITS) { const d = Math.hypot(x - px, z - pz); if (d < r) h -= 0.28 * (1 - (d / r) ** 2); }
      const pd = pathD(x, z);
      if (pd < 0.7) h = h * (pd / 0.7) - 0.04 * (1 - pd / 0.7);
      h *= flatF(x, z);
      const dp = Math.hypot(x - POND[0], z - POND[1]);
      h -= 0.62 * (1 - Math.min(1, Math.max(0, (dp - 1.4) / (POND[2] - 1.4))));
      return h;
    };
    const B = { grass: [[], []], dirt: [[], []], cliff: [[], []] };
    const tri = (bk, a, b, c, col) => { const [P, C] = B[bk]; for (const v of [a, b, c]) { P.push(v.x, v.y, v.z); C.push(col.r, col.g, col.b); } };
    const tone = (hex, y, vary = 0.12) => K.lin(hex).multiplyScalar((1 - vary + rand() * vary * 2) * (0.62 + 0.38 * Math.min(1, Math.max(0, (y + 0.45) / 0.5))));
    const nz = (x, z) => Math.sin(x * 0.55 + Math.sin(z * 0.4) * 1.3) * 0.55 + Math.sin(z * 0.62 - x * 0.31 + 1.7) * 0.45;
    const softTone = (x, z) => {
      const n1 = nz(x, z), n2 = nz(z * 1.7 + 11, x * 1.7 - 5);
      const c = K.lin(PAL.grass).lerp(K.lin(PAL.grassLight), Math.max(0, Math.min(1, 0.35 + n1 * 0.45)));
      return n2 > 0.55 ? c.lerp(K.lin(PAL.moss), Math.min(1, (n2 - 0.55) * 2.5) * 0.6) : c;
    };
    const S = 0.5, n = N / S;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const P = (a, b) => V(a * S, hgt(a * S, b * S), b * S);
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      for (const [p, q, r] of [[a, c, b], [a, d, c]]) {
        const cx = (p.x + q.x + r.x) / 3, cz = (p.z + q.z + r.z) / 3, cy = (p.y + q.y + r.y) / 3;
        const dp = Math.hypot(cx - POND[0], cz - POND[1]), pd = pathD(cx, cz);
        // спокойная заливка: крупные мягкие пятна тона вместо шахматки из граней (референс: ельник/березняк)
        let bk = 'grass', col = softTone(cx, cz);
        if (dp < POND[2] - 0.2) { bk = 'dirt'; col = K.lin(PAL.mud); }
        else if (pd < 0.62) { bk = 'dirt'; col = K.lin(PAL.dirt).lerp(K.lin(PAL.mud), Math.max(0, nz(cx * 1.3, cz * 1.3)) * 0.5); }
        else if (cy < -0.1) { bk = 'dirt'; col = K.lin(PAL.mud); }
        tri(bk, p, q, r, col.multiplyScalar((0.97 + rand() * 0.06) * (0.62 + 0.38 * Math.min(1, Math.max(0, (cy + 0.45) / 0.5)))));
      }
    }
    // срез диорамы по краю
    const skirt = (x0, z0, x1, z1) => {
      const a = V(x0, hgt(x0, z0), z0), b = V(x1, hgt(x1, z1), z1), c = V(x1, -1.1, z1), d = V(x0, -1.1, z0);
      tri('cliff', a, d, c, tone(PAL.rock, 0, 0.16)); tri('cliff', a, c, b, tone(PAL.stoneDark, 0, 0.16));
    };
    for (let i = 0; i < n; i++) { skirt(N, i * S, N, (i + 1) * S); skirt((i + 1) * S, N, i * S, N); skirt(0, (i + 1) * S, 0, i * S); skirt(i * S, 0, (i + 1) * S, 0); }
    const ground = [];
    Object.entries(B).forEach(([tex, [P, C]]) => {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
      geo.computeVertexNormals();
      K.finalize(geo, null);
      geo.userData.tex = tex;
      ground.push(geo);
    });
    const L = [];
    L.push(part(new T.BoxGeometry(N, 1.2, N, N, 2, N), PAL.soil, { m: M(N / 2, -1.7, N / 2), jitter: 0.06, tex: 'cliff', ao: false, vary: 0.14 }));
    g.add(K.facetGroup([...ground, ...L]));

    // ---------- вода: пруд и лужи — тёмная бирюза с отражением неба ----------
    const waterMat = new T.MeshStandardMaterial({ color: K.lin('#173a3c'), roughness: 0.22, metalness: 0, envMapIntensity: 0.9, transparent: true, opacity: 0.92, flatShading: true }); // блик мягкий: резкий даёт белые вспышки под bloom
    const waters = [];
    const pond = new T.Mesh(new T.CircleGeometry(POND[2] - 0.15, 22, 0, Math.PI * 2), waterMat);
    pond.geometry.dispose();
    pond.geometry = new T.CircleGeometry(POND[2] - 0.1, 22);
    { const p = pond.geometry.attributes.position; for (let i = 1; i < p.count; i++) { p.setX(i, p.getX(i) * (0.92 + rand() * 0.14)); p.setY(i, p.getY(i) * (0.92 + rand() * 0.14)); } }
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(POND[0], -0.22, POND[1]);
    pond.receiveShadow = true;
    g.add(pond);
    waters.push(pond);
    for (const [px, pz, r] of PITS) {
      const w = new T.Mesh(new T.CircleGeometry(r * 0.55, 9), waterMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(px, hgt(px, pz) + 0.07, pz);
      w.receiveShadow = true;
      g.add(w);
      waters.push(w);
    }
    for (const [x, z, r] of [[9.8, 10.7, 0.35], [10.95, 15.5, 0.3], [5.4, 7.6, 0.3]]) {
      const w = new T.Mesh(new T.CircleGeometry(r, 8), waterMat);
      w.rotation.x = -Math.PI / 2;
      w.position.set(x, hgt(x, z) + 0.02, z);
      g.add(w);
    }

    // ---------- постройки и объекты ----------
    const place = (obj, x, z, ry = 0) => { obj.position.set(x, 0, z); obj.rotation.y = ry; g.add(obj); return obj; };
    const smokes = [];
    const stand = K.buildHut();
    place(stand.group, 0.6, 7.2);
    { const a = new T.Object3D(); a.position.copy(stand.smoke); stand.group.add(a); smokes.push(a); }
    K.setSeed(301); place(buildWatchtower(K).group, 3.0, 0.6);
    K.setSeed(302); const hut = buildChickenHut(K); place(hut.group, 12.0, 1.2); smokes.push(...hut.smokes);
    K.setSeed(303); const totem = buildBoneTotem(K); place(totem.group, 9.0, 8.4);
    K.setSeed(304); const circle = buildRitualCircle(K); place(circle.group, 11.5, 11.8);
    place(K.buildLanternPost(), 7.5, 13.4, -Math.PI / 2);
    place(K.buildWoodpile(), 7.4, 6.3, Math.PI / 2);
    // ельник: по краям диорамы и за её задними краями — стволы тонут в дымке, видны верхушки
    const trees = [[1.4, 1.6, 12], [6.2, 0.7, 11], [8.8, 1.4, 13], [18.9, 0.6, 12], [17.0, 0.9, 9], [0.8, 5.0, 10], [1.0, 14.0, 10], [18.8, 11.8, 9], [19.2, 7.0, 11],
      [-1.4, 2.5, 15], [-1.8, 7.5, 13], [-1.2, 11.5, 16], [-2.0, 16.0, 14], [-1.5, 20.5, 12], [3.5, -1.6, 14], [9.0, -2.0, 16], [13.5, -1.4, 13], [17.5, -2.2, 15], [21.0, -1.5, 12], [-3.2, -2.8, 17]];
    trees.forEach(([x, z, h], i) => { const t = K.buildSpruce(h, 20 + i); t.position.set(x, x < 0 || z < 0 ? -0.6 : hgt(x, z), z); g.add(t); });

    // ---------- детали окружения ----------
    K.setSeed(5);
    const D = [], DW = [], DR = [];
    const onGround = (x, z) => hgt(x, z);
    // мостки через пруд на сваях, с перилами; старые сваи в воде; фонарь-свеча в конце
    const w0 = V(6.4, 0, 14.2), w1 = V(2.1, 0, 19.2), dirW = w1.clone().sub(w0), lenW = dirW.length();
    dirW.normalize();
    const side = V(-dirW.z, 0, dirW.x), ang = Math.atan2(dirW.x, dirW.z);
    for (let s = 0; s < lenW; s += 0.32) {
      const p = w0.clone().add(dirW.clone().multiplyScalar(s));
      D.push(part(new T.BoxGeometry(1.05 + (rand() - 0.5) * 0.12, 0.07, 0.29), rand() < 0.35 ? PAL.woodDark : PAL.wood,
        { m: M(p.x, 0.2 + (rand() - 0.5) * 0.02, p.z, (rand() - 0.5) * 0.04, ang + (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.04), tex: 'wood', axis: [1, 0, 0], jitter: 0.012, moss: 0.3 }));
    }
    for (let s = 0.4; s < lenW; s += 1.3) {
      for (const e of [-0.45, 0.45]) {
        const p = w0.clone().add(dirW.clone().multiplyScalar(s)).add(side.clone().multiplyScalar(e));
        H.stick(D, V(p.x, -0.8, p.z), V(p.x, e > 0 ? 1.0 + rand() * 0.15 : 0.22, p.z), 0.07, PAL.woodDark, { moss: 0.35, seg: 6 });
      }
    }
    for (const [hy, e] of [[0.95, 0.45], [0.55, 0.45]]) {
      H.crooked(D, w0.clone().add(side.clone().multiplyScalar(e)).setY(hy), w1.clone().add(side.clone().multiplyScalar(e)).setY(hy), 0.035, PAL.wood, 0.06, 4, { moss: 0.1 });
    }
    for (const [x, z, h] of [[2.8, 15.2, 0.6], [3.4, 15.0, 0.35], [5.6, 17.9, 0.5], [4.6, 18.8, 0.25]]) H.stick(D, V(x, -0.8, z), V(x, h, z), 0.08, PAL.woodDark, { moss: 0.4 });
    {
      const lp = w1.clone().add(side.clone().multiplyScalar(0.45));
      H.stick(D, V(lp.x, -0.2, lp.z), V(lp.x, 1.25, lp.z), 0.06, PAL.woodDark, { moss: 0.2 });
      const G = [];
      G.push(part(new T.BoxGeometry(0.16, 0.2, 0.16), '#1b2024', { m: M(lp.x, 1.37, lp.z), jitter: 0 }));
      D.push(part(new T.ConeGeometry(0.15, 0.1, 4), PAL.iron, { m: M(lp.x, 1.52, lp.z, 0, 0.8, 0), jitter: 0 }));
      g.add(K.glassMesh(G));
      K.addGlowLight(g, lp.x, 1.4, lp.z, 1.0, 5);
      H.rag(DR, w0.clone().lerp(w1, 0.55).add(side.clone().multiplyScalar(0.45)).setY(0.95), 0.5, 0.1, ang);
    }
    // камыш и рогоз по берегу пруда
    for (let i = 0; i < 16; i++) {
      const a = rand() * 6.28, r = POND[2] - 0.3 + rand() * 0.5, x = POND[0] + Math.cos(a) * r, z = POND[1] + Math.sin(a) * r;
      if (Math.abs((x - w0.x) * side.x + (z - w0.z) * side.z) < 0.8 && ((x - w0.x) * dirW.x + (z - w0.z) * dirW.z) > 0) continue;
      for (let k = 0; k < 6; k++) {
        const h = 0.6 + rand() * 0.7;
        DW.push(part(new T.ConeGeometry(0.022, h, 3), rand() < 0.4 ? '#6b6a3a' : rand() < 0.5 ? '#7d855d' : '#5a5534',
          { m: M(x + (rand() - 0.5) * 0.3, Math.max(-0.2, onGround(x, z)) + h / 2, z + (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.25, rand() * 3, (rand() - 0.5) * 0.25), jitter: 0, ao: false, vary: 0.15 }));
        if (rand() < 0.25) DW.push(part(new T.CylinderGeometry(0.035, 0.035, 0.14, 5), '#4a3526', { m: M(x + (rand() - 0.5) * 0.3, Math.max(-0.2, onGround(x, z)) + h * 0.85, z + (rand() - 0.5) * 0.3), jitter: 0, ao: false }));
      }
    }
    // каменная мостовая по главной тропе: неровные плоские камни
    for (const pth of [[[6.5, 9.5], [9.5, 10.2], [11.2, 11.4]], [[6.5, 9.5], [6.9, 12.6], [6.4, 14.0]]]) {
      for (let i = 0; i < pth.length - 1; i++) {
        const a = pth[i], b = pth[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let s = 0; s < len; s += 0.5 + rand() * 0.15) {
          if (rand() < 0.2) continue;
          const f = s / len, x = a[0] + (b[0] - a[0]) * f + (rand() - 0.5) * 0.4, z = a[1] + (b[1] - a[1]) * f + (rand() - 0.5) * 0.4;
          D.push(part(new T.IcosahedronGeometry(1, 0), rand() < 0.4 ? PAL.stoneDark : PAL.stone, { m: M(x, onGround(x, z) + 0.01, z, 0, rand() * 3, 0, V(0.2 + rand() * 0.12, 0.045, 0.17 + rand() * 0.1)), jitter: 0.02, tex: 'stone', moss: 0.35, ao: false, vary: 0.16 }));
        }
      }
    }
    // кусты: комья листвы трёх тонов и сухие прутья
    const bush = (x, z, s) => {
      const y = onGround(x, z);
      for (let k = 0; k < 7; k++) {
        const a = rand() * 6.28, r = rand() * 0.45 * s;
        D.push(part(new T.IcosahedronGeometry(1, 0), [PAL.needleMid, '#3f684a', '#56663f', '#2d5038'][Math.floor(rand() * 4)],
          { m: M(x + Math.cos(a) * r, y + (0.25 + rand() * 0.35) * s, z + Math.sin(a) * r, rand() * 3, rand() * 3, rand() * 3, V((0.3 + rand() * 0.2) * s, (0.24 + rand() * 0.14) * s, (0.3 + rand() * 0.2) * s)), jitter: 0.03, tex: 'needles', moss: 0.3, mossHex: '#78945b', ao: false, vary: 0.14 }));
      }
      for (let k = 0; k < 3; k++) H.stick(D, V(x, y, z), V(x + (rand() - 0.5) * 0.9 * s, y + (0.6 + rand() * 0.4) * s, z + (rand() - 0.5) * 0.9 * s), 0.016, PAL.woodDark, { moss: 0, seg: 4, taper: 0.3 });
    };
    for (const [x, z, s] of [[1.6, 9.2, 1.1], [0.9, 11.6, 1.3], [5.6, 2.0, 1.0], [10.4, 2.2, 1.2], [17.2, 6.3, 1.3], [18.6, 9.4, 1.0], [15.1, 9.7, 0.9], [7.6, 16.4, 1.0], [8.2, 19.2, 1.2], [13.2, 19.1, 1.1], [18.8, 18.9, 1.3], [19.0, 16.8, 1.0], [0.8, 13.0, 0.9], [6.2, 11.0, 0.8], [13.9, 7.4, 0.8], [2.1, 4.9, 0.9]]) bush(x, z, s);
    // кочки с пучками травы, ямы с галькой, камни, пни, валежник
    for (const [hx, hz, r] of HUM) for (let k = 0; k < 2 + Math.floor(r * 3); k++) K.tuft(D, hx + (rand() - 0.5) * r, onGround(hx, hz), hz + (rand() - 0.5) * r, 3, 0.3 + rand() * 0.2);
    for (const [px, pz, r] of PITS) for (let k = 0; k < 3; k++) { const a = rand() * 6.28; K.rock(D, px + Math.cos(a) * r * 0.85, onGround(px + Math.cos(a) * r * 0.85, pz + Math.sin(a) * r * 0.85) - 0.03, pz + Math.sin(a) * r * 0.85, 0.12 + rand() * 0.1, PAL.stoneDark); }
    for (const [x, z, s] of [[6.2, 12.2, 0.45], [15.8, 19.0, 0.4], [9.6, 4.1, 0.35], [2.2, 5.9, 0.5], [17.2, 7.0, 0.3], [5.2, 13.2, 0.35], [13.6, 18.8, 0.4], [19.3, 3.6, 0.55], [0.6, 18.8, 0.5], [7.0, 18.2, 0.3]]) K.rock(D, x, onGround(x, z), z, s);
    for (const [x, z, r] of [[16.8, 12.2, 0.26], [3.4, 9.4, 0.22], [14.4, 19.4, 0.3]]) {
      const y = onGround(x, z);
      D.push(part(new T.CylinderGeometry(r * 0.9, r * 1.15, 0.35, 8), PAL.bark, { m: M(x, y + 0.14, z, 0, rand() * 3, 0), tex: 'bark', axis: [0, 1, 0], jitter: 0.02, moss: 0.5 }));
      for (let k = 0; k < 4; k++) { const a = (k / 4) * 6.28 + rand(); H.stick(D, V(x + Math.cos(a) * r * 0.8, y + 0.1, z + Math.sin(a) * r * 0.8), V(x + Math.cos(a) * r * 2.1, y - 0.05, z + Math.sin(a) * r * 2.1), 0.05, PAL.bark, { tex: 'bark', moss: 0.3, taper: 0.4, seg: 5 }); }
    }
    K.logWithRings(D, 15.0, onGround(15, 7.4) + 0.15, 7.4, 2.4, 0.17, 0.4);
    K.logWithRings(D, 6.0, onGround(6, 17.8) + 0.14, 17.8, 1.8, 0.15, -0.8);
    for (const [x, z] of [[3.1, 13.6], [17.4, 9.6], [7.8, 17.4], [14.2, 8.8], [2.4, 9.2], [6.8, 19.0], [17.6, 18.2], [12.8, 7.0], [19.0, 13.2]]) K.fern(D, x, onGround(x, z), z, 0.8 + rand() * 0.4);
    K.mushrooms(D, 4.2, onGround(4.2, 13.6), 13.6);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, x = 3.2 + Math.sin(a) * 0.9, z = 10.8 + Math.cos(a) * 0.9; K.mushrooms(D, x, onGround(x, z), z); } // грибной круг
    for (let k = 0; k < 220; k++) {
      const x = 0.3 + rand() * (N - 0.6), z = 0.3 + rand() * (N - 0.6);
      if (Math.hypot(x - POND[0], z - POND[1]) < POND[2] - 0.2 || pathD(x, z) < 0.5) continue;
      K.tuft(D, x, onGround(x, z), z, 3 + Math.floor(rand() * 2), 0.28 + rand() * 0.25);
    }
    // опавшие листья и хвоя — рыжие пятна на тропах и у изб
    for (let k = 0; k < 260; k++) {
      const x = 0.3 + rand() * (N - 0.6), z = 0.3 + rand() * (N - 0.6);
      if (Math.hypot(x - POND[0], z - POND[1]) < POND[2] - 0.3) continue;
      D.push(part(new T.ConeGeometry(0.07, 0.01, 3), ['#8a5a2a', '#6e4a24', '#9a6a30', '#5d4a2e'][Math.floor(rand() * 4)], { m: M(x, onGround(x, z) + 0.012, z, 0, rand() * 6, 0), jitter: 0, ao: false, vary: 0.15 }));
    }
    // жердевая изгородь вдоль левого края и тропы, как на референсе
    const fence = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = V(pts[i][0], 0, pts[i][1]), b = V(pts[i + 1][0], 0, pts[i + 1][1]);
        for (const pnt of [a, b]) H.stick(D, V(pnt.x, onGround(pnt.x, pnt.z) - 0.1, pnt.z), V(pnt.x + (rand() - 0.5) * 0.08, onGround(pnt.x, pnt.z) + 1.05, pnt.z), 0.06, PAL.woodDark, { moss: 0.35, seg: 6 });
        for (const hy of [0.45, 0.85]) H.crooked(D, V(a.x, onGround(a.x, a.z) + hy, a.z), V(b.x, onGround(b.x, b.z) + hy + (rand() - 0.5) * 0.1, b.z), 0.035, PAL.wood, 0.05, 2, { moss: 0.15 });
      }
    };
    fence([[0.35, 14.8], [0.35, 16.6], [0.4, 18.4], [0.5, 19.7]]);
    fence([[7.8, 14.6], [8.6, 15.8], [9.0, 17.2]]);
    // частокол у избушки с тряпками
    for (let k = 0; k < 16; k++) {
      const x = 10.2 + k * 0.26, h = 1.8 + rand() * 0.3;
      D.push(part(new T.CylinderGeometry(0.11, 0.12, h, 7), rand() < 0.4 ? PAL.log : PAL.wood, { m: M(x, h / 2, 6.0 + (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.06, rand() * 3, (rand() - 0.5) * 0.06), tex: 'wood', axis: [0, 1, 0], moss: 0.25 }));
      D.push(part(new T.ConeGeometry(0.115, 0.3, 7), PAL.wood, { m: M(x, h + 0.15, 6.0), tex: 'wood', axis: [0, 1, 0] }));
    }
    D.push(part(new T.BoxGeometry(4.3, 0.09, 0.09), PAL.woodDark, { m: M(12.2, 1.1, 6.15), tex: 'wood', axis: [1, 0, 0] }));
    H.rag(DR, V(11.0, 1.95, 6.1), 0.6, 0.1, 0);
    H.rag(DR, V(13.4, 1.9, 6.1), 0.5, 0.1, 0);
    g.add(K.facetGroup(D), K.facetGroup(DW, { wind: { phase: 5.5, h: 3 } }), K.facetGroup(DR, { wind: { phase: 4, h: 6 } }));

    // ---------- путник-богатырь ----------
    const def = (window.LPK_MODELS || []).find((m) => m.id === 'bogatyr');
    let walker = null;
    if (def) {
      K.setSeed(def.seed || 777);
      walker = def.build(K);
      g.add(walker.group);
      walker.api.play('Walk');
    }
    const segs = [];
    let total = 0;
    for (let i = 0; i < WALK.length - 1; i++) { const l = Math.hypot(WALK[i + 1][0] - WALK[i][0], WALK[i + 1][1] - WALK[i][1]); segs.push(l); total += l; }
    let dist = 0, heading = 0, wasNear = false;
    const wpos = new T.Vector3(), tpos = new T.Vector3();
    const ripple = waters.map((w) => ({ w, p: w.geometry.attributes.position, base: Float32Array.from(w.geometry.attributes.position.array) }));
    function update(dt, t) {
      hut.update(dt, t);
      circle.update(dt, t);
      for (const { p, base } of ripple) {
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 2.1 + t * 1.3) * 0.012 + Math.cos(base[i * 3 + 1] * 1.7 + t * 1.1) * 0.012);
        p.needsUpdate = true;
      }
      if (walker) {
        dist = (dist + dt * 1.05) % total;
        let d = dist, i = 0;
        while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
        const a = WALK[i], b = WALK[i + 1], f = Math.min(1, d / segs[i]);
        const want = Math.atan2(b[0] - a[0], b[1] - a[1]);
        const dA = ((want - heading + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        heading += dA * Math.min(1, dt * 4);
        const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        walker.api.root.position.set(x, hgt(x, z), z);
        walker.api.root.rotation.y = heading;
        walker.update(dt, t);
        walker.api.root.getWorldPosition(wpos);
        totem.group.getWorldPosition(tpos).add(new T.Vector3(1, 0, 1));
        const isNear = Math.hypot(wpos.x - tpos.x, wpos.z - tpos.z) < 4;
        if (isNear !== wasNear) { walker.api.setEmotion(isNear ? 'Решимость' : 'Нейтральный', true); wasNear = isNear; }
      }
      totem.update(dt, t, walker ? wpos : null);
    }
    return { group: g, update, smokes };
  }

  // общие детали и красное свечение — для models/props.js
  window.LPK_LES = { COL, kitHelpers, redMesh, redLight, updateRed, makePanel };

  // ---------- регистрация ----------
  const reg = (id, name, footprint, heightM, seed, fn, extra = {}) => models.push({
    id, name, footprint, heightM, seed, ...extra,
    build(K) { const out = fn(K); if (!out.panel && extra.panel !== false) out.panel = makePanel(id); return out; },
  });
  reg('chicken_hut', 'Избушка', [4, 4], 7.2, 302, (K) => buildChickenHut(K));
  reg('bone_totem', 'Тотем', [2, 2], 5.0, 303, (K) => buildBoneTotem(K));
  reg('watchtower', 'Вышка', [3, 3], 8.2, 301, (K) => buildWatchtower(K), { panel: false });
  reg('ritual_circle', 'Круг', [6, 6], 3.8, 304, (K) => buildRitualCircle(K));
  reg('domain', 'Владения', [20, 20], 13, 1, (K) => buildDomain(K), { noPlate: true, humanAt: [7.2, 0, 12.6], zoom: 1.2,
    fog: { center: [10.2, 11.0], clear: 7.4, falloff: 3.4, height: 1.7, top: 9, ground: 0, density: 0.62 } });
})();
