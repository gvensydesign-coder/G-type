// Kit: набор процедурных деталей для зданий. Каждая деталь несёт цвет, фактуру, этап стройки
// и вид (обычная / леса / разметка), а в конце всё сливается в одну BufferGeometry.
// Оси здания: x вправо, z к фасаду (фасад смотрит на +z), y вверх, (0,0,0) = центр пятна на земле.
import * as THREE from 'three';

// Фактуры (номер передаётся в шейдер, см. toon.js)
export const PAT = {
  plain: 0, logs: 1, planks: 2, shingles: 3, stone: 4, thatch: 5, glow: 6, gold: 7,
  cloth: 8, logEnds: 9, grass: 10, road: 11, earth: 12, bone: 13, rune: 14, fire: 15, dark: 16,
  bark: 17, rings: 18, carved: 19, scales: 20, plinfa: 21, clay: 22, iron: 23, straw: 24, leaf: 25, rock: 26, moss: 27, rag: 28, leafCard: 29, needles: 30, menhir: 31, runestone: 32,
};
// Виды деталей
export const KIND = { normal: 0, scaffold: 1, marking: 2, finish: 3 };

// Палитра (линейные цвета подбираются в шейдере, здесь sRGB-hex)
export const COL = {
  log: 0x8a5a36, logOld: 0x6b5442, logDark: 0x4a3426, plank: 0x9a6a42, plankOld: 0x6f6152,
  shingle: 0x5c4c44, shingleOld: 0x4a4744, shingleBlue: 0x4c5560, thatch: 0x9c8452,
  stone: 0x8a8378, stoneDark: 0x5e5a55, white: 0xd8cdb4, gold: 0xd0a040, lead: 0x7d8a94,
  red: 0xa8322a, redDark: 0x6e2420, cloth: 0xb5462e, bone: 0xd8ccb0, glow: 0xffb54a,
  iron: 0x3a3a40, fire: 0xff7a22, rope: 0xc8b48a, chalk: 0xe8e0c8, moss: 0x5a6a3a, earth: 0x5a4632,
  green: 0x4f6b3a, blood: 0x8c1c1c, teal: 0x3e7c78,
};

// детерминированный 3D-шум для кривых камней и бугристых деталей (зависит только от точки — без щелей на швах)
function h3(x, y, z) { let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
export function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(ix, iy, iz), h3(ix + 1, iy, iz), u), L(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), u), v),
    L(L(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), u), L(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), u), v), w);
}
// сместить вершины геометрии шумом (вектор зависит от положения): кривые камни, бугры, мятые мешки
export function lumpify(g, amp, freq = 2.2, seed = 0, keepBottom = true) {
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), q = seed * 13.7;
    const dx = noise3(x * freq + q, y * freq, z * freq) - 0.5, dy = noise3(x * freq, y * freq + q + 5.1, z * freq) - 0.5, dz = noise3(x * freq + 9.3, y * freq, z * freq + q) - 0.5;
    P.setXYZ(i, x + dx * amp * 2, keepBottom && y < 0.001 ? y : y + dy * amp * 2, z + dz * amp * 2);
  }
  g.computeVertexNormals();
  return g;
}

const _hsl = {};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

export class Kit {
  // отладка: Kit.debug = true — каждая деталь помнит локальную рамку, матрицу и строку вызова; Kit.onBuild(parts) — проверка перед слиянием
  static debug = false;
  static onBuild = null;
  static where() { const st = new Error().stack.split('\n').slice(2); const l = st.find(t => !t.includes('kit.js')) || st[0] || ''; const m = l.match(/([\w-]+\.js):(\d+)/); return m ? m[1] + ':' + m[2] : '?'; }
  constructor(seed = 1) {
    this.parts = [];
    this.seed = seed >>> 0 || 1;
    this.stage = 1;          // этап по умолчанию для следующих деталей
    this.kind = KIND.normal;
    this.decay = 0;          // >0: заброшенное, детали получают случайный наклон и выпадения
    this.jitter = 0;         // случайный перекос деталей (рад): постройка «рукотворная», не по линейке
    this.sway = 0;           // качание ветром: смещение на метр высоты над swayBase (листва, ткань, верёвки)
    this.swayBase = 0;
    this.ab = false;         // заброшенная постройка: окна без стёкол, двери нараспашку
    this.openings = [];      // проёмы (окна, двери) в бревенчатых стенах: брёвна в них вырезаны, внутри видна пустота
    this.liners = [];        // внутренняя обшивка срубов: стены, пол и потолок с теми же проёмами
  }
  // детерминированный случайный поток
  rand() { let t = (this.seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  rr(a, b) { return a + (b - a) * this.rand(); }
  pick(arr) { return arr[Math.floor(this.rand() * arr.length) % arr.length]; }

  // Добавить геометрию (в локальных координатах детали) с матрицей и свойствами.
  add(geom, matrix, o = {}) {
    let dbg = null;
    if (Kit.debug) { geom.computeBoundingBox(); dbg = { lb: geom.boundingBox.clone(), M: matrix.clone(), where: Kit.where() }; }
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const jit = (o.jitter ?? this.jitter);
    if (jit > 0) {
      g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()), bs = g.boundingBox.getSize(new THREE.Vector3());
      const jj = jit * Math.min(1, 1.2 / Math.max(0.3, bs.x, bs.y, bs.z));   // крупные детали почти не перекашиваются
      const m = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
      m.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(this.rr(-jj, jj), this.rr(-jj, jj) * 0.5, this.rr(-jj, jj))));
      m.premultiply(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z));
      g.applyMatrix4(m);
      if (dbg) dbg.M.premultiply(m);
    }
    let capAxis = null;
    if (o.cap) capAxis = (o.capLocal ?? new THREE.Vector3(1, 0, 0)).clone().transformDirection(matrix);
    this.parts.push({ capAxis,
      g, color: new THREE.Color(o.color ?? COL.log), pat: o.pat ?? PAT.plain,
      stage: o.stage ?? this.stage, kind: o.kind ?? this.kind, uvScale: o.uvScale ?? 1,
      flatUv: o.flatUv ?? true, sway: o.sway ?? this.sway, swayBase: o.swayBase ?? this.swayBase, dbg, float: o.float,
      swayFn: o.swayFn ?? null, flut: o.flut ?? 0, flutFn: o.flutFn ?? null, holes: o.holes ?? 0, ownUv: o.ownUv ?? null,
    });
    geom.dispose?.();
    return this;
  }
  mat(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ'));
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  }

  // ---------- примитивы ----------
  // Брус: основание на высоте y, центр (x, z).
  box(x, y, z, w, h, d, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), o);
  }
  // Цилиндр вертикальный (бревно-столб), основание на y.
  cyl(x, y, z, r, h, o = {}) {
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 8, 1, false);
    g.translate(0, h / 2, 0);
    const lg = (o.pat ?? PAT.plain) === PAT.logs && r < 0.4;
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), lg ? { ...o, pat: PAT.bark, cap: true, capLocal: new THREE.Vector3(0, 1, 0), flatUv: false } : o);
  }
  // Бревно лежащее вдоль оси x (центр), длина len.
  log(x, y, z, r, len, o = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, o.seg ?? 7);
    g.rotateZ(Math.PI / 2);
    const M = this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), lo = { pat: PAT.bark, cap: true, flatUv: false, ...o };
    this.add(g, M, lo);
    if (o.cuttable) this.parts[this.parts.length - 1].logMeta = { M, r, len, seg: o.seg ?? 7, lo };
    return this;
  }
  // Вырезать проём в бревенчатой стене: op = { x, y, z (центр низа на плоскости стены), ry, w, h }.
  // Бревна, пересекающие проём, режутся на два куска; возвращает, сколько брёвен разрезано (0 — стена не из брёвен).
  _cutLogs(op) {
    const c = Math.cos(op.ry), s = Math.sin(op.ry), half = op.w / 2;
    const ctr = new THREE.Vector3(), dir = new THREE.Vector3();
    let cuts = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i], m = p.logMeta; if (!m) continue;
      ctr.setFromMatrixPosition(m.M); dir.set(1, 0, 0).transformDirection(m.M);
      if (ctr.y + m.r * 0.75 < op.y || ctr.y - m.r * 0.75 > op.y + op.h) continue;
      if (Math.abs(dir.x * c - dir.z * s) < 0.97) continue;                     // бревно не вдоль этой стены
      if (Math.abs((ctr.x - op.x) * s + (ctr.z - op.z) * c) > 0.3) continue;   // не в плоскости стены
      const ct = (op.x - ctr.x) * dir.x + (op.z - ctr.z) * dir.z, L2 = m.len / 2;
      if (ct + half <= -L2 || ct - half >= L2) continue;
      this.parts.splice(i, 1); cuts++;
      for (const [a, b] of [[-L2, ct - half], [ct + half, L2]]) {
        if (b - a < 0.12) continue;
        const g = new THREE.CylinderGeometry(m.r, m.r, b - a, m.seg); g.rotateZ(Math.PI / 2);
        const M2 = m.M.clone().multiply(new THREE.Matrix4().makeTranslation((a + b) / 2, 0, 0));
        this.add(g, M2, { ...m.lo, jitter: 0 });
        this.parts[this.parts.length - 1].logMeta = { M: M2, r: m.r, len: b - a, seg: m.seg, lo: m.lo };
      }
    }
    if (cuts) this.openings.push(op);
    return cuts;
  }
  cone(x, y, z, r, h, o = {}) {
    const g = new THREE.ConeGeometry(r, h, o.seg ?? 8, 1, !!o.openEnded);
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), o);
  }
  sphere(x, y, z, r, o = {}) {
    const g = new THREE.SphereGeometry(r, o.seg ?? 8, Math.max(4, (o.seg ?? 8) >> 1));
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1), o);
  }

  // ---------- детали «от точки к точке» ----------
  // матрица: ось y детали — вдоль a→b, ось x — горизонтальная поперёк, z — третья; roll крутит вокруг оси
  frameAB(a, b, roll = 0) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), L = dir.length(); dir.normalize();
    let X = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (X.lengthSq() < 1e-6) X.set(1, 0, 0); X.normalize();
    let Z = new THREE.Vector3().crossVectors(X, dir).normalize();
    if (roll) { const q = new THREE.Quaternion().setFromAxisAngle(dir, roll); X.applyQuaternion(q); Z.applyQuaternion(q); }
    const M = new THREE.Matrix4().makeBasis(X, dir, Z); M.setPosition(A);
    return { M, L };
  }
  // брус от a до b: sx — толщина поперёк (горизонтально), sz — высота сечения (в вертикальной плоскости)
  beam(a, b, sx, sz, o = {}) {
    const { M, L } = this.frameAB(a, b, o.roll ?? 0);
    const g = new THREE.BoxGeometry(sx, L + (o.ext ?? 0) * 2, sz).translate(0, L / 2, 0);
    return this.add(g, M, { jitter: 0, ...o });
  }
  // круглая жердь/бревно от a до b
  pole(a, b, r, o = {}) {
    const { M, L } = this.frameAB(a, b);
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, L + (o.ext ?? 0) * 2, o.seg ?? 6, 1).translate(0, L / 2, 0);
    return this.add(g, M, { pat: PAT.bark, cap: true, capLocal: new THREE.Vector3(0, 1, 0), flatUv: false, jitter: 0, ...o });
  }
  // точка цепной линии между a и b с провисом sag (м) в доле t
  static sagPt(a, b, t, sag) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; }
  // верёвка/цепь: провисает под своим весом, качается — сильнее в середине пролёта (концы закреплены)
  rope(a, b, o = {}) {
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]), sag = o.sag ?? Math.max(0.02, span * 0.06 + Math.abs(b[1] - a[1]) * 0.02);
    const n = o.n ?? Math.max(3, Math.min(12, Math.round(Math.hypot(span, b[1] - a[1]) / 0.35))), r = o.r ?? 0.016;
    const pts = []; for (let i = 0; i <= n; i++) pts.push(Kit.sagPt(a, b, i / n, sag));
    const sw = o.sway ?? 0.05, len = Math.hypot(span, b[1] - a[1]) || 1;
    const A = new THREE.Vector3(...a), D = new THREE.Vector3(...b).sub(A);
    const fn = (v) => { const t = Math.min(1, Math.max(0, v.clone().sub(A).dot(D) / (len * len))); return 4 * t * (1 - t) * (0.3 + len * 0.25); };
    for (let i = 0; i < n; i++) this.pole(pts[i], pts[i + 1], r, { color: o.color ?? COL.rope, pat: o.pat ?? PAT.plain, seg: o.seg ?? 4, cap: false, flatUv: true, ext: r * 0.6, sway: sw, swayFn: fn, stage: o.stage, kind: o.kind });
    return pts;
  }
  // висячая верёвка (от крюка вниз): маятник — качается тем сильнее, чем ниже
  hang(x, yTop, z, len, o = {}) {
    const r = o.r ?? 0.014, g = new THREE.CylinderGeometry(r, r, len, o.seg ?? 4).translate(0, -len / 2, 0);
    return this.add(g, this.mat(x, yTop, z), { color: o.color ?? COL.rope, pat: o.pat ?? PAT.plain, sway: o.sway ?? 0.05, swayBase: yTop, swayFn: (v) => Math.max(0, yTop - v.y), stage: o.stage, kind: o.kind });
  }
  // Ткань: сетка nu×nv между углами a,b (верхний край) и d,c (нижний). pin: 'top' — висит на верхнем крае,
  // 'edges' — натянута между верхним и нижним краями (полог), 'corners' — за 4 угла. sag — провис/пузо (м),
  // weight — тяжесть (сильнее провис низа, меньше трепет), holes — доля дыр 0..1, tatter — рваный низ.
  cloth(a, b, c, d, o = {}) {
    const nu = o.nu ?? 8, nv = o.nv ?? 6, pin = o.pin ?? 'top', sag = o.sag ?? 0.15, wgt = o.weight ?? 1;
    const V = (p) => new THREE.Vector3(...p), A = V(a), B = V(b), C = V(c), D = V(d);
    const pos = [], uvs = [], idx = [];
    const wTop = A.distanceTo(B), hSide = A.distanceTo(D);
    const nrm = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(D, A)).normalize();
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;   // v: 0 — верх (a-b), 1 — низ (d-c)
      const top = A.clone().lerp(B, u), bot = D.clone().lerp(C, u), p = top.lerp(bot, v);
      let dy = 0, dn = 0;
      if (pin === 'edges') { dy = -sag * 4 * v * (1 - v) * (0.7 + 0.3 * Math.sin(u * Math.PI)) * wgt; dn = sag * 0.25 * Math.sin(u * Math.PI) * 4 * v * (1 - v); }
      else if (pin === 'left') { dy = -sag * u * u * wgt * 1.6; dn = sag * 0.35 * Math.sin(u * Math.PI * 1.5) * u; }   // флаг на древке: край a-d у древка
      else if (pin === 'corners') { dy = -sag * (Math.sin(u * Math.PI) * (1 - v) + Math.sin(u * Math.PI) * v * 0.6 + 4 * v * (1 - v) * 0.5) * wgt; }
      else { dy = -sag * 0.25 * v * v * wgt; dn = sag * Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.9) * 0.6 / wgt; }
      p.y += dy; p.addScaledVector(nrm, dn);
      pos.push(p.x, p.y, p.z); uvs.push(u, 1 - v);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const q = j * (nu + 1) + i; idx.push(q, q + nu + 1, q + 1, q + 1, q + nu + 1, q + nu + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    // качание: маятником от закреплённого края; трепет — волна по полотну, гаснет у закреплённых краёв
    const free = pin === 'left' ? (u, v) => u : pin === 'top' ? (u, v) => (1 - v) : pin === 'edges' ? (u, v) => 4 * v * (1 - v) * (0.5 + 0.5 * Math.sin(u * Math.PI)) : (u, v) => Math.sin(u * Math.PI) * (0.4 + 0.6 * (1 - v));
    const fv = (vv, u, w) => free(u, 1 - w);
    return this.add(g, new THREE.Matrix4(), { color: o.color ?? COL.cloth, pat: o.holes || o.tatter ? PAT.rag : PAT.cloth, jitter: 0, ownUv: [wTop, hSide],
      sway: (o.sway ?? 0.06) / wgt, swayFn: (vv, u, w) => fv(vv, u, w) * (pin === 'left' ? wTop : hSide), flut: (o.flutter ?? 0.05) / Math.sqrt(wgt), flutFn: fv, holes: o.holes ?? (o.tatter ? 0.001 : 0), stage: o.stage, kind: o.kind });
  }
  // Крест по матрице (наклон вместе с главой)
  crossM(M, s, o = {}) {
    const c = { color: o.color ?? COL.gold, pat: PAT.gold, stage: o.stage, kind: o.kind, jitter: 0 };
    const t = 0.07 * s / 0.9 + 0.03;
    const put = (lx, ly, w, h, d, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0); const L = this.mat(lx, ly, 0, 0, 0, rz); this.add(g, M.clone().multiply(L), c); };
    put(0, -0.06, t, s * 1.3 + 0.06, t); put(0, s * 0.85, s * 0.7, t, t); put(0, s * 1.08, s * 0.36, t * 0.8, t); put(0, s * 0.42, s * 0.46, t * 0.8, t, 0.35);
    return this;
  }

  // Двускатная кровля: конёк вдоль x. w — длина по коньку, d — глубина (по z), h — высота конька над y.
  // Скаты — толстые плиты, щипцы (треугольники) — отдельно, доской.
  gable(x, y, z, w, d, h, o = {}) {
    const over = o.over ?? this.rr(0.32, 0.66), th = o.th ?? 0.14, ry = o.ry ?? 0;
    const half = d / 2 + over, ang = Math.atan2(h, d / 2), slope = Math.hypot(half, h * half / (d / 2));
    const sag = o.sag ?? 0; // провис для заброшенных
    const roofO = { color: o.color ?? COL.shingle, pat: o.pat ?? PAT.shingles, stage: o.stage, kind: o.kind };
    const hole = o.hole ?? 0; // доля выпавшей кровли
    const segs = hole > 0 ? 4 : 1, gone = { 1: new Set(), [-1]: new Set() };
    // крупные кровли кроются по-настоящему: тёс в два ряда, дранка рядами, солома/дёрн толстым бугристым пластом;
    // у каждой своя кривизна (провис конька, прогиб ската, перекос), своё дерево и свой свес
    const big = (w + over * 2) * slope > 3.5 && o.cover !== false;
    const style = o.style ?? (roofO.pat === PAT.thatch || roofO.pat === PAT.moss ? 'thatch' : roofO.pat === PAT.planks ? 'tes' : 'dranka');
    let RP = null;   // точка изогнутого ската (для конька и свеса крупной кровли)
    if (big) {
      RP = this.roofCover(x, y, z, w, d, h, { ...o, over, th, ry, half, slope, sag, hole, style, roofO, gone });
    } else {
      const mk = (side) => {
        for (let i = 0; i < segs; i++) {
          if (hole > 0 && this.rand() < hole) { gone[side].add(i); continue; }
          const sw = (w + over * 2) / segs, cx = -(w / 2 + over) + sw * (i + 0.5);
          const g = new THREE.BoxGeometry(sw * (hole > 0 ? 0.98 : 1), th, slope);
          // плита: центр на середине ската
          const t = side * ang + (sag ? side * this.rr(-sag, sag) : 0);
          g.rotateX(t);
          const mzc = side * (half / 2), myc = h - (h * half / (d / 2)) / 2 + th * 0.5;
          g.translate(cx, myc, mzc);
          this.add(g, this.mat(x, y, z, 0, ry, 0), roofO);
        }
      };
      mk(1); mk(-1);
    }
    // свес: тёс разной длины — рваный, живой край кровли
    if (o.eaves !== false && hole < 0.5 && !(big && style === 'thatch')) for (const side of [1, -1]) {
      const n = Math.round((w + over * 2) / 0.27), eY = h - h * half / (d / 2);
      for (let i = 0; i < n; i++) {
        if (hole > 0 && this.rand() < hole * 0.8) continue;
        const cx = -(w / 2 + over) + (i + 0.5) * (w + over * 2) / n, L = this.rr(0.3, 0.62);
        if (gone[side].has(Math.min(segs - 1, Math.floor((i + 0.5) / n * segs)))) continue;   // нет ската — нет и свеса
        if (RP && RP.hole(side, cx, 0.02)) continue;
        const g = new THREE.BoxGeometry(0.25, 0.05, L).translate(0, 0, side * (L / 2 - 0.12)).rotateX(side * ang + this.rr(-0.04, 0.04) + (sag ? side * 0.1 : 0));
        if (RP) { const q = RP(side, cx, 0, 0.1); g.translate(q.x, q.y, q.z); } else
        g.translate(cx, eY + th * 0.9, side * half);
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: roofO.color, pat: PAT.planks, stage: o.stage, kind: o.kind });
      }
    }
    // конёк — бревно-охлупень
    if (o.ridge !== false && RP) {   // охлупень повторяет провис конька: бревно из нескольких колен
      const Bm = this.mat(x, y, z, 0, ry, 0), n = 4, Wt = w + over * 2;
      for (let i = 0; i < n; i++) {
        const a = RP(1, -Wt / 2 + Wt * i / n, 1, 0.2).applyMatrix4(Bm), b = RP(1, -Wt / 2 + Wt * (i + 1) / n, 1, 0.2).applyMatrix4(Bm);
        this.pole(a.toArray(), b.toArray(), 0.14, { color: o.ridgeColor ?? COL.logDark, ext: 0.03, seg: 7, stage: o.stage, kind: o.kind, cap: i === 0 || i === n - 1 });
      }
    } else if (o.ridge !== false) this.add(new THREE.CylinderGeometry(0.13, 0.13, w + over * 2, 6).rotateZ(Math.PI / 2).translate(0, h + th, 0), this.mat(x, y, z, 0, ry, 0), { color: o.ridgeColor ?? COL.logDark, pat: PAT.logs, stage: o.stage, kind: o.kind });
    // курицы и поток: крюки под свесом держат бревно-жёлоб, в него упирается тёс
    if (o.kuricy && hole < 0.5) for (const side of [1, -1]) {
      const eY = h - h * half / (d / 2), n = Math.max(2, Math.round(w / 0.9));
      for (let i = 0; i <= n; i++) {
        const cx = -w / 2 + w * i / n;
        const g = new THREE.BoxGeometry(0.09, 0.32, 0.1).translate(0, -0.16, 0).rotateX(side * 0.5);
        g.translate(cx, eY + th * 0.4, side * (half - 0.15));
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: COL.logDark, pat: PAT.bark, stage: o.stage, kind: o.kind });
      }
      const g = new THREE.CylinderGeometry(0.1, 0.1, w + over * 1.4, 6, 1).rotateZ(Math.PI / 2).translate(0, eY - 0.06, side * (half - 0.05));
      this.add(g, this.mat(x, y, z, 0, ry, 0), { color: COL.logDark, pat: PAT.bark, stage: o.stage, kind: o.kind, cap: true });
    }
    // щипцы: бревенчатые «самцы» (укорачиваются к коньку) или дощатые
    if (o.logGable) {
      const r = 0.14, col = new THREE.Color(o.logGable);
      for (const sx of [-1, 1]) for (let yy = r; yy < h - 0.08; yy += r * 1.75) {
        const len = d * (1 - yy / h) + 0.15;
        const g = new THREE.CylinderGeometry(r * this.rr(0.9, 1.05), r, len, 7).rotateX(Math.PI / 2).translate(sx * (o.gableAt ?? (w / 2 - r)), yy, 0);
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: col.clone().offsetHSL(0, 0, this.rr(-0.05, 0.04)).getHex(), pat: PAT.bark, cap: true, capLocal: new THREE.Vector3(0, 0, 1), flatUv: false, stage: o.stage, kind: o.kind });
      }
    } else if (o.gables !== false) {
      for (const sx of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, h); shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
        g.rotateY(Math.PI / 2); g.translate(sx * w / 2 - (sx > 0 ? 0.12 : 0), 0, 0);
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: o.gableColor ?? COL.plank, pat: PAT.planks, stage: o.stage, kind: o.kind });
      }
    }
    return this;
  }

  // Покрытие ската по-настоящему. Точка ската P(u, v): u — вдоль конька, v — от свеса (0) к коньку (1);
  // поверх — изгиб: провис конька к середине, прогиб ската, перекос (один край ниже), мелкая волна.
  roofCover(x, y, z, w, d, h, o) {
    const { over, th, ry, half, sag, hole, style, roofO, gone } = o;
    const Wt = w + over * 2, eY = h - h * half / (d / 2), B = this.mat(x, y, z, 0, ry, 0);
    const ridgeSag = this.rr(0.01, 0.1) + sag * 1.2, bow = this.rr(0.01, 0.07) + sag * 0.5, twist = this.rr(-0.03, 0.03), wave = this.rr(0.004, 0.012), ws = this.rand() * 9;
    // дерево кровли: своя порода и возраст у каждой постройки (смола-мёд, серебристая осина, рыжая лиственница, тёмная старая)
    const base = new THREE.Color(roofO.color), hsl = {}; base.getHSL(hsl, THREE.SRGBColorSpace);
    const tone = style === 'thatch' ? [0, 0, 0] : this.pick([[0, 0, 0], [0.01, -0.05, 0.06], [-0.01, -0.12, 0.03], [0.015, 0.06, -0.02], [0, -0.04, -0.05]]);
    const colAt = (dl = 0, dh = 0) => new THREE.Color().setHSL(hsl.h + tone[0] + dh, Math.max(0, Math.min(1, hsl.s + tone[1])), Math.max(0.03, Math.min(0.95, hsl.l + tone[2] + dl)), THREE.SRGBColorSpace).getHex();
    const P = (side, u, v, lift = 0) => {
      const t = u / (Wt / 2);   // -1..1 вдоль конька
      const p = new THREE.Vector3(u, eY + (h - eY) * v, side * half * (1 - v));
      const S = new THREE.Vector3(0, h - eY, -side * half).normalize(), N = new THREE.Vector3(0, half, side * (h - eY)).normalize();
      const mid = Math.max(0, 1 - t * t);   // у щипцов кровля лежит на брёвнах щипца — провис и прогиб только между ними
      const off = -ridgeSag * mid * (0.25 + 0.75 * v) - bow * Math.sin(Math.PI * v) * mid + twist * t * (1 - v * 0.5)
        + wave * (Math.sin(u * 2.3 + ws + side) + Math.sin(v * 7.1 + u * 0.7 + ws * 2));
      return p.addScaledVector(N, off + lift);   // lift от линии опоры (верх стен/обвязки)
    };
    const frame = (side, u, v, lift) => {
      const e = 0.05, c = P(side, u, v, lift);
      const U = P(side, u + e, v, lift).sub(P(side, u - e, v, lift)).normalize();
      const S = P(side, u, Math.min(1, v + e), lift).sub(P(side, u, Math.max(0, v - e), lift)).normalize();
      const N = new THREE.Vector3().crossVectors(U, S).normalize(); if (N.y < 0) N.negate();
      const W = new THREE.Vector3().crossVectors(U, N);
      return { c, M: new THREE.Matrix4().makeBasis(U, N, W).setPosition(c) };
    };
    // плашка в рамке ската: lenU вдоль конька, lenS вдоль ската; наклоны — неровность ручной работы
    const plate = (side, u, v, lenU, lenS, t, lift, opt, rx = 0, rz = 0) => {
      const { M } = frame(side, u, v, lift);
      const g = new THREE.BoxGeometry(lenU, t, lenS);
      if (rx || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz)));
      this.add(g, B.clone().multiply(M), { jitter: 0, stage: o.stage, kind: o.kind, ...opt });
    };
    const slopeLen = P(1, 0, 0).distanceTo(P(1, 0, 1));
    // выпавшие куски кровли: пятна по ячейкам (сверху видно стропила)
    const holeAt = (side, u, v) => hole > 0 && Math.sin(u * 1.7 + side * 3 + ws) * Math.sin(v * 5.3 + ws * 1.3) + 0.25 * Math.sin(u * 9.1 + v * 13.7 + ws * 5) > 1 - hole * 2.2;
    P.hole = holeAt;
    for (const side of [1, -1]) {
      for (let i = 0; i < 4; i++) if (hole > 0 && holeAt(side, -Wt / 2 + Wt * (i + 0.5) / 4, 0.5)) gone[side].add(i);
      // настил-подкладка: тёмные доски сплошняком (виден в щелях и в дырах — не просвет насквозь)
      // настил и обрешётка идут кусками — повторяют изгиб ската (одна плита у провисшей кровли отходила бы от тёса)
      const nU = Math.max(3, Math.round(Wt / 1.2)), nV = 3;
      if (hole < 0.05) for (let a = 0; a < nU; a++) for (let b = 0; b < nV; b++) plate(side, -Wt / 2 + Wt * (a + 0.5) / nU, (b + 0.5) / nV, Wt / nU + 0.03, slopeLen / nV + 0.04, 0.05, 0.005, { color: colAt(-0.12), pat: PAT.planks });
      else {   // в дырявой кровле — только обрешётка и стропила
        const nl = style === 'dranka' ? Math.max(3, Math.round(slopeLen / (0.32 * 0.8))) : 6;   // обрешётка: под каждым рядом дранки
        for (let j = 0; j < nl; j++) for (let a = 0; a < nU; a++) plate(side, -Wt / 2 + 0.05 + (Wt - 0.1) * (a + 0.5) / nU, (j + 0.5) / nl, (Wt - 0.1) / nU + 0.02, 0.16, 0.06, 0.0, { color: COL.logOld, pat: PAT.bark });
        for (let j = 0; j <= Math.round(w / 1.2); j++) for (let b = 0; b < nV; b++) plate(side, -w / 2 + w * j / Math.round(w / 1.2), (b + 0.5) / nV, 0.14, slopeLen / nV + 0.03, 0.16, -0.1, { color: COL.logOld, pat: PAT.bark });   // стропила
      }
      if (style === 'tes') {
        // тёс в два ряда: нижний с зазорами, верхний перекрывает щели; доски разной ширины, тона, местами короче
        for (let layer = 0; layer < 2; layer++) {
          let u = -Wt / 2 + (layer ? this.rr(0.08, 0.16) : 0);
          while (u < Wt / 2 - 0.05) {
            const bw = Math.min(Wt / 2 - u, this.rr(0.18, 0.3)), uc = u + bw / 2, segN = 2;
            const v0 = layer ? this.rr(-0.04, 0.03) : 0, v1 = 1 - this.rr(0, 0.04);
            for (let sgi = 0; sgi < segN; sgi++) {
              const va = v0 + (v1 - v0) * sgi / segN, vb = v0 + (v1 - v0) * (sgi + 1) / segN, vm = (va + vb) / 2;
              if (holeAt(side, uc, vm)) continue;
              plate(side, uc, vm, bw * (layer ? 0.98 : 0.8), slopeLen * (vb - va) + 0.04, 0.045, layer * 0.042 + 0.055, { color: colAt(this.rr(-0.06, 0.05) - layer * 0.0, this.rr(-0.01, 0.01)), pat: PAT.planks }, this.rr(-0.02, 0.02), this.rr(-0.04, 0.04));
            }
            u += bw + (layer ? this.rr(0.02, 0.06) : this.rr(0.04, 0.08));
          }
        }
      } else if (style === 'dranka') {
        // дранка/лемех рядами снизу вверх: каждый ряд чуть приподнят нижним краем, куски разной длины, свои тона
        const rowH = 0.32, nr = Math.max(3, Math.round(slopeLen / (rowH * 0.8)));
        for (let r = 0; r < nr; r++) {
          const vm = (r + 0.5) / nr; let u = -Wt / 2 + (r % 2) * this.rr(0.1, 0.4);
          while (u < Wt / 2 - 0.02) {
            const L = Math.min(Wt / 2 - u, this.rr(0.6, 1.6)), uc = u + L / 2;
            if (!holeAt(side, uc, vm)) plate(side, uc, vm, L - 0.015, slopeLen / nr * 1.35, 0.04, 0.055 + r * 0.0005, { color: colAt(this.rr(-0.05, 0.04)), pat: roofO.pat }, -0.06 + this.rr(-0.02, 0.02), this.rr(-0.015, 0.015));
            u += L;
          }
        }
      } else {
        // солома / дёрн: толстый бугристый пласт с подрезанным неровным краем
        const nu = Math.max(4, Math.round(Wt / 0.5)), nv = Math.max(3, Math.round(slopeLen / 0.5));
        const g = new THREE.PlaneGeometry(1, 1, nu, nv), Pa = g.attributes.position;
        const pos = [];
        for (let i = 0; i < Pa.count; i++) {
          const uu = (Pa.getX(i) + 0.5) * Wt - Wt / 2, vv = Pa.getY(i) + 0.5;
          const bump = 0.06 * Math.sin(uu * 3.1 + ws) * Math.sin(vv * 9 + ws) + 0.04 * Math.sin(uu * 7.3 - vv * 5 + ws * 3);
          const q = P(side, uu, vv, 0.26 + bump + (vv < 0.04 ? -0.05 : 0));
          pos.push(q);
        }
        // верх и толщина: верхняя поверхность + нижняя на 0.25 ниже, борта у свеса
        const top = new THREE.BufferGeometry(), arr = [];
        const idx = (i, j) => j * (nu + 1) + i;
        for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
          const a = pos[idx(i, j)], b = pos[idx(i + 1, j)], c = pos[idx(i, j + 1)], e = pos[idx(i + 1, j + 1)];
          if (hole > 0 && holeAt(side, (i + 0.5) / nu * Wt - Wt / 2, (j + 0.5) / nv)) continue;
          const tri = side > 0 ? [a, b, c, b, e, c] : [a, c, b, b, c, e];
          for (const q of tri) arr.push(q.x, q.y, q.z);
        }
        const N0 = new THREE.Vector3(0, half, side * (h - eY)).normalize();
        for (let i = 0; i < nu; i++) {   // торец пласта у свеса — видна толщина соломы
          const a = pos[idx(i, 0)], b = pos[idx(i + 1, 0)], a2 = a.clone().addScaledVector(N0, -0.3), b2 = b.clone().addScaledVector(N0, -0.3);
          const tri = side > 0 ? [a, a2, b, b, a2, b2] : [a, b, a2, b, b2, a2];
          for (const q of tri) arr.push(q.x, q.y, q.z);
        }
        top.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); top.computeVertexNormals();
        g.dispose();
        this.add(top, B, { color: colAt(this.rr(-0.03, 0.03)), pat: roofO.pat, jitter: 0, stage: o.stage, kind: o.kind });
      }
    }
    return P;
  }

  // Шатёр / пирамида (n граней), основание на y.
  tent(x, y, z, r, h, o = {}) {
    const g = new THREE.ConeGeometry(r, h, o.seg ?? 8, 1, false, o.rot ?? Math.PI / (o.seg ?? 8));
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, 0, o.ry || 0, 0, 1, 1, o.sz ?? 1), { color: COL.shingle, pat: PAT.shingles, ...o });
  }

  // Луковичная глава на барабане: основание на y, радиус r.
  onion(x, y, z, r, o = {}) {
    const pts = [];
    const prof = [[0, 0], [0.82, 0.02], [1.0, 0.32], [0.96, 0.62], [0.72, 0.95], [0.38, 1.25], [0.14, 1.52], [0.05, 1.75], [0, 1.82]];
    for (const [a, b] of prof) pts.push(new THREE.Vector2(a * r, b * r));
    const g = new THREE.LatheGeometry(pts, o.seg ?? 12);
    const M = this.mat(x, y, z, o.tilt || 0, 0, o.tiltZ || 0);
    this.add(g, M, { color: o.color ?? COL.gold, pat: o.pat ?? PAT.scales, flatUv: false, stage: o.stage, kind: o.kind, jitter: 0 });
    // яблоко под крестом и крест — в той же системе, что и глава: при наклоне главы крест наклоняется с ней
    this.add(new THREE.SphereGeometry(r * 0.12, 8, 5), M.clone().multiply(this.mat(0, 1.8 * r, 0)), { color: o.crossColor ?? COL.gold, pat: PAT.gold, stage: o.stage, kind: o.kind, jitter: 0 });
    if (o.cross !== false) this.crossM(M.clone().multiply(this.mat(0, 1.86 * r, 0)), r * 0.9, { stage: o.stage, kind: o.kind, color: o.crossColor });
    return this;
  }
  // Крест (восьмиконечный упрощённо)
  cross(x, y, z, s, o = {}) {
    return this.crossM(this.mat(x, y + 0.06, z, 0, o.ry ?? 0, o.tilt || 0), s, o);
  }

  // Сруб: четыре стены из бревна (фактура венцов) с выпусками на углах.
  // w по x, d по z, h высота. Возвращает ничего. Окна/двери добавляются отдельно поверх.
  srub(x, y, z, w, d, h, o = {}) {
    if (o.logs !== false && !(o.t && o.t < 0.25)) return this.srubLogs(x, y, z, w, d, h, o);
    const t = o.t ?? 0.3, col = o.color ?? COL.log, ry = o.ry ?? 0;
    const st = { stage: o.stage, kind: o.kind };
    const put = (lx, lz, bw, bd) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      this.box(x + lx * c + lz * s, y, z - lx * s + lz * c, bw, h, bd, { color: col, pat: PAT.logs, ry, ...st });
    };
    put(0, d / 2 - t / 2, w, t); put(0, -d / 2 + t / 2, w, t);
    put(w / 2 - t / 2, 0, t, d - 2 * t); put(-w / 2 + t / 2, 0, t, d - 2 * t);
    if (o.corners !== false) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const c = Math.cos(ry), s = Math.sin(ry), lx = sx * (w / 2 + 0.02), lz = sz * (d / 2 + 0.02);
        this.box(x + lx * c + lz * s, y, z - lx * s + lz * c, t + 0.22, h, t + 0.22, { color: o.endColor ?? col, pat: PAT.logEnds, ry, ...st });
      }
    }
    return this;
  }

  // Настоящий сруб «в обло»: бревна венцами, торцы выступают на углах, боковые стены сдвинуты на полвенца.
  srubLogs(x, y, z, w, d, h, o = {}) {
    const r = o.r ?? 0.15, col = o.color ?? COL.log, ry = o.ry ?? 0;
    // боковые стены кончаются ровно на высоте h, фасадные — на полвенца выше (под щипец)
    const n = Math.max(1, Math.round((h - 2 * r) / (r * 1.72) + 0.5));
    const step = (h - 2 * r) / Math.max(0.5, n - 0.5);
    const st = { stage: o.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const over = o.corners === false ? 0.02 : 0.3;
    const lc = new THREE.Color(col);
    for (let i = 0; i <= n; i++) {
      const yy = y + i * step + r;
      for (const sz of [-1, 1]) {
        if (i === n && o.topFront === false) continue;
        if (o.gap && o.gap(i, sz)) continue;
        const [px, pz] = P(this.rr(-0.06, 0.06), sz * (d / 2 - r));
        const tint = lc.clone().offsetHSL(0, 0, this.rr(-0.05, 0.04)).getHex();
        // верхний полувенец лежит под щипцом: без выпусков, иначе торцы протыкают свес кровли
        const len = i === n ? w - 0.06 : w + 2 * over * this.rr(0.75, 1.15);
        this.log(px, yy, pz, r * this.rr(0.9, 1.08), len, { color: tint, ry, ...st, seg: 7, cuttable: true });
      }
      for (const sx of [-1, 1]) {
        if (i === n || (i === n - 1 && o.topSides === false)) continue;
        const [px, pz] = P(sx * (w / 2 - r), this.rr(-0.06, 0.06));
        const tint = lc.clone().offsetHSL(0, 0, this.rr(-0.05, 0.04)).getHex();
        this.log(px, yy + step / 2, pz, r * this.rr(0.9, 1.08), d + 2 * over * this.rr(0.75, 1.15), { color: tint, ry: ry + Math.PI / 2, ...st, seg: 7, cuttable: true });
      }
    }
    // внутри — обшивка (стены, пол, потолок): между брёвнами не просвечивает, а в проёмах видна тёмная пустая комната
    this.liners.push({ x, y, z, w, d, h: n * step + r, ry, r, stage: o.stage ?? this.stage, kind: o.kind });
    return this;
  }
  // Обшивка срубов с отверстиями под проёмы: стена режется на куски вокруг каждого окна и двери (вызывается из build)
  _buildLiners() {
    for (const L of this.liners) {
      const { x, y, z, w, d, h, ry, r } = L, c = Math.cos(ry), s = Math.sin(ry), st = { stage: L.stage, kind: L.kind, jitter: 0 };
      const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      const wallCol = 0x241810, t = 0.04;
      const ops = this.openings.map(op => { const dx = op.x - x, dz = op.z - z; return { lx: dx * c - dz * s, lz: dx * s + dz * c, y: op.y, h: op.h, w: op.w + 0.04 }; });
      const hx = w / 2 - 2 * r, hz = d / 2 - 2 * r;
      for (const wall of [{ n: 'f', sg: 1 }, { n: 'b', sg: -1 }, { n: 'r', sg: 1 }, { n: 'l', sg: -1 }]) {
        const fb = wall.n === 'f' || wall.n === 'b', U = fb ? hx : hz, off = (fb ? hz : hx) - 0.02;
        const mine = ops.filter(o => fb ? Math.abs(o.lz - wall.sg * d / 2) < 0.4 && Math.abs(o.lx) < w / 2 : Math.abs(o.lx - wall.sg * w / 2) < 0.4 && Math.abs(o.lz) < d / 2)
          .map(o => ({ u: fb ? o.lx : o.lz, ...o })).sort((a, b) => a.u - b.u);
        const seg = (u0, u1, y0, y1) => {
          if (u1 - u0 < 0.05 || y1 - y0 < 0.05) return;
          const um = (u0 + u1) / 2, [px, pz] = fb ? P(um, wall.sg * off) : P(wall.sg * off, um);
          this.box(px, y0, pz, u1 - u0, y1 - y0, t, { color: wallCol, pat: PAT.logs, ry: fb ? ry : ry + Math.PI / 2, ...st });
        };
        let cur = -U;
        for (const o of mine) {
          const u0 = Math.max(-U, o.u - o.w / 2), u1 = Math.min(U, o.u + o.w / 2);
          seg(cur, u0, y, y + h);
          seg(u0, u1, y, o.y); seg(u0, u1, o.y + o.h, y + h);
          cur = Math.max(cur, u1);
        }
        seg(cur, U, y, y + h);
      }
      this.box(x, y, z, w - 4 * r - 0.04, 0.06, d - 4 * r - 0.04, { color: 0x2c2018, pat: PAT.planks, ry, ...st });
      this.box(x, y + h - 0.03, z, w - 4 * r - 0.04, 0.05, d - 4 * r - 0.04, { color: 0x181009, pat: PAT.planks, ry, ...st });
    }
    this.liners.length = 0;
  }

  // Подзор / резная доска: кружевная полоса (сквозная резьба) от (x0,z0) до (x1,z1)
  lace(x0, y, z0, x1, z1, h, o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    return this.box((x0 + x1) / 2, y - h, (z0 + z1) / 2, len, h, 0.04, { color: o.color ?? COL.white, pat: PAT.carved, ry: -ang, stage: o.stage, kind: o.kind, jitter: 0.004 });
  }

  // Окно с наличником на стене фасада (+z) или любой: (x, y, z) центр низа окна, ry поворот стены.
  window(x, y, z, ry = 0, o = {}) {
    const w = o.w ?? 0.6, h = o.h ?? 0.7, st = { stage: o.stage ?? this.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const cut = this._cutLogs({ x, y, z, ry, w: w + 0.08, h }) > 0;   // проём вырезан в брёвнах: за ним пустая комната
    const [ax, az] = P(0, cut ? -0.12 : 0.02);
    if (cut) {   // откосы проёма: доски по краям, чтобы не торчали торцы разрезанных брёвен
      const rv = { color: 0x2a1e16, pat: PAT.planks, ry, jitter: 0, ...st };
      for (const sx of [-1, 1]) { const [bx, bz] = P(sx * (w / 2 + 0.01), -0.1); this.box(bx, y - 0.02, bz, 0.04, h + 0.04, 0.32, rv); }
      { const [bx, bz] = P(0, -0.1); this.box(bx, y - 0.03, bz, w + 0.06, 0.04, 0.32, rv); this.box(bx, y + h - 0.01, bz, w + 0.06, 0.04, 0.32, rv); }
    }
    if (o.boarded) {
      if (!cut) this.box(ax, y, az, w, h, 0.06, { color: COL.logDark, pat: PAT.dark, ry, ...st });
      for (let i = 0; i < 2; i++) { const [bx, bz] = P(0, 0.07); this.box(bx, y + h * (0.25 + i * 0.4), bz, w * 1.25, 0.12, 0.05, { color: COL.plankOld, pat: PAT.planks, ry, rz: this.rr(-0.4, 0.4), ...st }); }
    } else {
      const glass = !cut || !this.ab;   // у заброшенного дома стёкол нет: окно пустое
      if (glass) this.box(ax, y, az, w, h, 0.06, { color: COL.glow, pat: o.dark ? PAT.dark : PAT.glow, ry, ...st });
      const [mx, mz] = P(0, cut ? -0.1 : 0.06); // переплёт: у заброшенного уцелела половина
      if (!this.ab || this.rand() < 0.6) this.box(mx, y, mz, 0.05, h, 0.03, { color: COL.logDark, pat: PAT.plain, ry, ...st });
      if (!this.ab || this.rand() < 0.4) this.box(mx, y + h / 2 - 0.025, mz, w, 0.05, 0.03, { color: COL.logDark, pat: PAT.plain, ry, ...st });
    }
    // наличник: верх с «кокошником», низ с отливом, боковины
    const nc = o.nal ?? COL.white;
    const [nx, nz] = P(0, 0.06);
    this.box(nx, y - 0.12, nz, w + 0.3, 0.12, 0.08, { color: nc, pat: PAT.planks, ry, ...st });
    { const [sx2, sz2] = P(0, 0.12); this.box(sx2, y - 0.17, sz2, w + 0.42, 0.06, 0.2, { color: nc, pat: PAT.planks, ry, rx: 0.12, ...st }); }
    this.box(nx, y + h, nz, w + 0.3, 0.14, 0.09, { color: nc, pat: PAT.planks, ry, ...st });
    const g = new THREE.CylinderGeometry(0.01, (w + 0.3) / 2, 0.28, 3, 1).rotateY(Math.PI / 6 + Math.PI / 2).scale(1, 1, 0.25);
    g.translate(0, 0.14, 0);
    this.add(g, this.mat(nx, y + h + 0.14, nz, 0, ry, 0), { color: nc, pat: PAT.plain, ...st });
    for (const sx of [-1, 1]) { const [px, pz] = P(sx * (w / 2 + 0.08), 0.06); this.box(px, y, pz, 0.1, h, 0.08, { color: nc, pat: PAT.planks, ry, ...st }); }
    if (o.shutters && !o.boarded) for (const sx of [-1, 1]) {
      const ang = this.rr(0, 0.25), [px, pz] = P(sx * (w * 0.75 + 0.14), 0.1 + Math.sin(ang) * w * 0.25);
      this.box(px, y, pz, w / 2, h, 0.05, { color: o.shutterColor ?? COL.red, pat: PAT.planks, ry: ry + sx * ang, ...st });
      for (const yy of [0.12, h - 0.18]) { const [hx, hz] = P(sx * (w * 0.75 + 0.14), 0.14 + Math.sin(ang) * w * 0.25); this.box(hx, y + yy, hz, w / 2 + 0.06, 0.05, 0.02, { color: COL.iron, pat: PAT.iron, ry: ry + sx * ang, ...st }); }
    }
    return this;
  }

  // Дверь: центр низа (на плоскости стены), поворот стены. Косяки, притолока с выпуском, порог,
  // полотно из досок на шпонках с раскосом, кованые петли-жиковины, кольцо-ручка. o.open — приоткрыта (рад).
  door(x, y, z, ry = 0, o = {}) {
    const w = o.w ?? 0.9, h = o.h ?? 1.7, st = { stage: o.stage ?? this.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    const L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const fc = o.frame ?? COL.logDark, jt = 0.14, jd = o.jd ?? 0.22;
    let a, b;
    // проём: в брёвнах вырезан сквозной (за ним тёмная комната), иначе тёмная заглушка
    const cut = this._cutLogs({ x, y, z, ry, w: w + 0.1, h }) > 0;
    if (cut) {
      const rv = { color: 0x2a1e16, pat: PAT.planks, ry, jitter: 0, ...st };
      for (const sx of [-1, 1]) { [a, b] = L(sx * (w / 2 + 0.01), -0.1); this.box(a, y, b, 0.04, h + 0.02, 0.32, rv); }
      [a, b] = L(0, -0.1); this.box(a, y + h - 0.01, b, w + 0.06, 0.04, 0.32, rv); this.box(a, y, b, w + 0.06, 0.04, 0.32, rv);
    } else { [a, b] = L(0, -0.03); this.box(a, y, b, w + 0.02, h, 0.08, { color: 0x140c08, pat: PAT.dark, ry, ...st, jitter: 0 }); }
    // косяки (чуть разной толщины и не по отвесу), притолока, порог
    for (const sx of [-1, 1]) { [a, b] = L(sx * (w / 2 + jt / 2), 0.03); this.box(a, y - 0.04, b, jt * this.rr(0.9, 1.1), h + 0.08, jd, { color: fc, pat: PAT.planks, ry, rz: this.rr(-0.012, 0.012), ...st }); }
    [a, b] = L(this.rr(-0.04, 0.04), 0.05); this.box(a, y + h, b, w + jt * 2 + this.rr(0.2, 0.34), 0.18, jd + 0.04, { color: fc, pat: PAT.planks, ry, rz: this.rr(-0.02, 0.02), ...st });
    if (o.carved !== false) { [a, b] = L(0, 0.16); this.box(a, y + h + 0.18, b, w + jt * 2, 0.14, 0.04, { color: o.nal ?? fc, pat: PAT.carved, ry, ...st }); }
    [a, b] = L(0, 0.1); this.box(a, y - 0.12, b, w + jt * 2 + 0.06, 0.14, jd + 0.2, { color: COL.logDark, pat: PAT.planks, ry, ...st });
    // полотно на петлях: петли слева, поворот наружу на open
    const open = o.open ?? 0, oc = Math.cos(open), os = Math.sin(open), ryL = ry - open;
    const LP = (u, t) => L(-w / 2 + u * oc - t * os, 0.03 + u * os + t * oc);
    const leafC = o.color ?? COL.plankOld;
    [a, b] = LP(w / 2, 0); this.box(a, y + 0.01, b, w - 0.02, h - 0.03, 0.07, { color: leafC, pat: PAT.planks, ry: ryL, ...st });
    for (const yy of [0.22, h - 0.36]) { [a, b] = LP(w / 2, 0.05); this.box(a, y + yy, b, w * 0.9, 0.1, 0.04, { color: leafC, pat: PAT.planks, ry: ryL, ...st }); }
    const dl = Math.hypot(w * 0.8, h - 0.62);
    [a, b] = LP(w * 0.12, 0.05); this.box(a, y + 0.3, b, 0.08, dl, 0.035, { color: leafC, pat: PAT.planks, ry: ryL, rz: -Math.atan2(w * 0.76, h - 0.62), ...st });
    // жиковины и кольцо
    for (const yy of [0.25, h - 0.33]) { [a, b] = LP(w * 0.3, 0.085); this.box(a, y + yy, b, w * 0.58, 0.055, 0.02, { color: COL.iron, pat: PAT.iron, ry: ryL, ...st }); }
    [a, b] = LP(w - 0.16, 0.08); this.box(a, y + h * 0.5 - 0.07, b, 0.12, 0.14, 0.015, { color: COL.iron, pat: PAT.iron, ry: ryL, ...st });
    const ring = new THREE.TorusGeometry(0.07, 0.014, 5, 12);
    [a, b] = LP(w - 0.16, 0.1); this.add(ring, this.mat(a, y + h * 0.5 - 0.1, b, 0, ryL, 0), { color: COL.iron, pat: PAT.iron, ...st, sway: 0 });
    if (o.lock) { [a, b] = LP(w - 0.1, 0.1); this.box(a, y + h * 0.45, b, 0.14, 0.18, 0.06, { color: COL.iron, pat: PAT.iron, ry: ryL, ...st }); }
    return this;
  }

  // Бугристый брус: камень, глина, кладка «на глаз», мешок. Верх/бока смещены шумом, низ ровный.
  lumpBox(x, y, z, w, h, d, o = {}) {
    const cell = o.cell ?? 0.32, sg = (v) => Math.max(1, Math.min(12, Math.round(v / cell)));
    const g = new THREE.BoxGeometry(w, h, d, sg(w), sg(h), sg(d));
    g.translate(0, h / 2, 0);
    lumpify(g, o.amp ?? 0.045, o.freq ?? 2.4, this.rand() * 10, o.keepBottom ?? true);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), { pat: PAT.stone, color: COL.stone, ...o });
  }
  // Валун: гранёный, неровный, приплюснутый; основание врыто в землю
  rock(x, y, z, r, o = {}) {
    let g = new THREE.IcosahedronGeometry(r, o.detail ?? 1);
    lumpify(g, r * (o.amp ?? 0.3), (o.freq ?? 1.2) / r, this.rand() * 10, false);
    g.scale(o.sx ?? 1, o.sy ?? 0.68, o.sz ?? 1);
    if (g.index) g = g.toNonIndexed(); g.computeVertexNormals();   // грани плоские: камень сколот, а не оплавлен
    return this.add(g, this.mat(x, y, z, this.rr(-0.2, 0.2), this.rand() * 6.28, this.rr(-0.2, 0.2)), { pat: PAT.rock, color: o.color ?? COL.stone, ...o, jitter: 0 });
  }
  // Стоячий камень: гранёный столб, сужается кверху, верх срезан косо, комель врыт на 0.35 м. o.rune — рунный (вырезанные знаки полосой)
  menhir(x, y, z, w, h, d, o = {}) {
    let g = new THREE.BoxGeometry(w, h, d, 3, Math.max(4, Math.round(h / 0.4)), 3);
    g.translate(0, h / 2, 0);
    const P = g.attributes.position, sh = o.skew ?? this.rr(-0.22, 0.22), cut = o.cut ?? this.rr(0.08, 0.3), tp = o.taper ?? this.rr(0.15, 0.4), bulge = o.bulge ?? this.rr(0, 0.15);
    for (let i = 0; i < P.count; i++) {
      const yy = P.getY(i) / h, k = 1 - tp * yy + bulge * Math.sin(yy * Math.PI);
      let px = P.getX(i) * k + sh * yy * w, pz = P.getZ(i) * k, py = P.getY(i);
      if (yy > 0.8) py -= cut * (P.getX(i) / w + 0.5) * (yy - 0.8) * 5;   // косой скол макушки
      P.setXYZ(i, px, py, pz);
    }
    lumpify(g, o.amp ?? 0.06, 2.4, this.rand() * 10, false);
    if (g.index) g = g.toNonIndexed(); g.computeVertexNormals();
    return this.add(g, this.mat(x, y - 0.35, z, o.rx || 0, o.ry || 0, o.rz || 0), { pat: o.rune ? PAT.runestone : PAT.menhir, color: o.color ?? COL.stone, jitter: 0, ...o });
  }
  // Тело вращения по профилю [[r, y], ...]
  lathe(x, y, z, prof, o = {}) {
    const g = new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(Math.max(0.0001, r), yy)), o.seg ?? 12);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1), { flatUv: false, ...o });
  }
  // Подошва из валунов под венцами: камни по периметру и крупные под углами
  footing(x, y, z, w, d, h, o = {}) {
    const ry = o.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const col = o.color ?? COL.stone, st = { stage: o.stage ?? 1 };
    const put = (lx, lz, r) => { const [a, b] = P(lx, lz); this.rock(a, y + h - r * 0.62, b, r, { color: new THREE.Color(col).offsetHSL(0, this.rr(-0.05, 0.03), this.rr(-0.07, 0.05)).getHex(), ...st }); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(sx * (w / 2 - 0.1), sz * (d / 2 - 0.1), Math.max(0.3, h * 0.75) * this.rr(0.95, 1.2));
    const edge = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.75)); for (let i = 1; i < n; i++) { const t = i / n + this.rr(-0.08, 0.08); put(ax + (bx - ax) * t, az + (bz - az) * t, Math.max(0.22, h * 0.6) * this.rr(0.8, 1.15)); } };
    const W = w / 2 - 0.1, D = d / 2 - 0.1;
    edge(-W, -D, W, -D); edge(-W, D, W, D); edge(-W, -D, -W, D); edge(W, -D, W, D);
    // забирка: между камнями подполье закрыто тёмными досками (пустоты под срубом нет)
    if (o.skirt !== false) {
      const sk = { color: o.skirtColor ?? 0x3e3026, pat: PAT.planks, stage: st.stage, jitter: 0 }, t = 0.06, ins = 0.2;
      for (const sz of [-1, 1]) { const [a, b] = P(0, sz * (d / 2 - ins)); this.box(a, y - 0.05, b, w - 2 * ins, h + 0.07, t, { ...sk, ry }); }
      for (const sx of [-1, 1]) { const [a, b] = P(sx * (w / 2 - ins), 0); this.box(a, y - 0.05, b, t, h + 0.07, d - 2 * ins, { ...sk, ry }); }
    }
    return this;
  }
  // Бутовый фундамент вместо ровной плиты: бугристое ядро, по краю неровный пояс из валунов в 2–4 ряда
  // (ниже крупнее, выше мельче, ряды сдвинуты внутрь), плоские плиты-венцы поверху, неровная мостовая и щебень у подошвы.
  // (x, z) — центр, y — земля, h — высота над землёй (верх на y + h), o.vents — положения продухов на фасаде +z.
  foundation(x, y, z, w, d, h, o = {}) {
    const ry = o.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const col = o.color ?? COL.stone, st = { stage: o.stage ?? 1 }, vents = o.vents ?? [];
    const tone = (dl = 0) => new THREE.Color(col).offsetHSL(this.rr(-0.02, 0.02), this.rr(-0.07, 0.03), this.rr(-0.09, 0.06) + dl).getHex();
    const hw = w / 2, hd = d / 2, nC = Math.max(2, Math.round(h / 0.34)), hb = h / nC;
    // ядро: кладка внутри пояса, верх чуть ниже плит
    this.lumpBox(x, y - 0.45, z, w - 0.9, h + 0.37, d - 0.9, { color: COL.stoneDark, pat: PAT.stone, amp: 0.1, cell: 0.5, ry, ...st });
    const sides = [[-hw, -hd, hw, -hd, 0, -1], [-hw, hd, hw, hd, 0, 1], [-hw, -hd, -hw, hd, -1, 0], [hw, -hd, hw, hd, 1, 0]];
    const nearVent = (sd, lx) => sd[5] === 1 && vents.some(v => Math.abs(lx - v) < 0.5);
    for (const sd of sides) {
      const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), ux = (sd[2] - sd[0]) / len, uz = (sd[3] - sd[1]) / len;
      for (let j = 0; j < nC; j++) {
        let t = this.rr(0, 0.3);
        while (t < len) {
          const r = hb * this.rr(0.8, 1.15) * (1 - j * 0.05), adv = r * this.rr(1.5, 1.9);
          const out = this.rr(-0.04, 0.2) - j * 0.07, lx = sd[0] + ux * t + sd[4] * (out - 0.1), lz = sd[1] + uz * t + sd[5] * (out - 0.1);
          if (!(j < nC - 1 && nearVent(sd, lx))) {
            const [a, b] = P(lx, lz);
            this.rock(a, y + hb * (j + 0.5) + (j ? 0.02 : r * 0.1 - 0.05), b, r, { color: tone(j * 0.012), sy: this.rr(0.58, 0.75), sz: this.rr(0.85, 1.15), ...st });
          }
          t += adv;
        }
      }
    }
    // крупные валуны по углам и редкие выступающие по сторонам
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = hb * this.rr(1.2, 1.6), [a, b] = P(sx * (hw - 0.05), sz * (hd - 0.05)); this.rock(a, y + r * 0.35, b, r, { color: tone(), sy: this.rr(0.7, 0.9), ...st }); }
    for (const sd of sides) {
      const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), n = Math.floor(len / 4.5);
      for (let i = 0; i < n; i++) { const t = (i + this.rr(0.3, 0.8)) / n * len, r = this.rr(0.4, 0.62), ox = sd[4] * 0.28, oz = sd[5] * 0.28, lx = sd[0] + (sd[2] - sd[0]) * t / len + ox, lz = sd[1] + (sd[3] - sd[1]) * t / len + oz; if (nearVent(sd, lx)) continue; const [a, b] = P(lx, lz); this.rock(a, y + r * 0.22, b, r, { color: tone(-0.02), sy: this.rr(0.55, 0.7), ...st }); }
    }
    // продухи: тёмный проём в кладке под перемычкой
    for (const v of vents) { const [a, b] = P(v, hd - 0.46); this.box(a, y + h * 0.18, b, 0.5, Math.min(0.4, h * 0.45), 0.1, { color: 0x100a08, pat: PAT.dark, ry, ...st, jitter: 0 }); }
    // венцы: плоские плиты по краю, лежат неровно
    for (const sd of sides) {
      const len = Math.hypot(sd[2] - sd[0], sd[3] - sd[1]), ux = (sd[2] - sd[0]) / len, uz = (sd[3] - sd[1]) / len;
      let t = this.rr(0, 0.4);
      while (t < len - 0.3) {
        const sl = Math.min(this.rr(0.8, 1.35), len - t), lx = sd[0] + ux * (t + sl / 2) + sd[4] * -0.3, lz = sd[1] + uz * (t + sl / 2) + sd[5] * -0.3, [a, b] = P(lx, lz);
        const fb = Math.abs(sd[5]) > 0;
        this.lumpBox(a, y + h - 0.2 + this.rr(-0.025, 0.02), b, fb ? sl : this.rr(0.6, 0.85), 0.2, fb ? this.rr(0.6, 0.85) : sl, { color: tone(0.02), pat: PAT.stone, amp: 0.025, cell: 0.35, ry: ry + this.rr(-0.1, 0.1), rz: this.rr(-0.03, 0.03), ...st });
        t += sl + this.rr(0.02, 0.1);
      }
    }
    // мостовая внутри: плоские камни разной формы, местами щели до тёмного ядра
    const cell = o.paving ?? 1.15;
    for (let gx = -hw + 0.9; gx < hw - 0.6; gx += cell) for (let gz = -hd + 0.9; gz < hd - 0.6; gz += cell) {
      if (this.rand() < 0.1 || (o.skip && gx > o.skip[0] && gx < o.skip[2] && gz > o.skip[1] && gz < o.skip[3])) continue;
      const [a, b] = P(gx + this.rr(-0.15, 0.15), gz + this.rr(-0.15, 0.15));
      this.lumpBox(a, y + h - 0.13 + this.rr(-0.02, 0.025), b, cell * this.rr(0.78, 0.98), 0.14, cell * this.rr(0.7, 0.95), { color: tone(0.015), pat: PAT.stone, amp: 0.02, cell: 0.4, ry: ry + this.rr(-0.25, 0.25), ...st });
    }
    // щебень и мелкие камни у подошвы
    const per = 2 * (w + d), nT = Math.round(per / 1.1);
    for (let i = 0; i < nT; i++) {
      const sd = sides[Math.floor(this.rand() * 4)], t = this.rand(), r = this.rr(0.08, 0.26), off = this.rr(0.25, 0.75);
      const lx = sd[0] + (sd[2] - sd[0]) * t + sd[4] * off, lz = sd[1] + (sd[3] - sd[1]) * t + sd[5] * off, [a, b] = P(lx, lz);
      this.rock(a, y + r * 0.28, b, r, { color: tone(-0.03), sy: this.rr(0.5, 0.75), detail: 0, ...st });
    }
    return this;
  }
  // Земляная площадка неровного очертания (вместо прямоугольной плиты): скруглённый контур с волной по краю, фаска, второй, меньший слой.
  earthPad(x, y, z, w, h, d, o = {}) {
    const ry = o.ry ?? 0, st = { stage: o.stage, kind: o.kind };
    for (let j = 0; j < 2; j++) {
      const sc = 1 - j * 0.14, hh = h * (j ? 0.55 : 1), ph = [this.rr(0, 6.28), this.rr(0, 6.28), this.rr(0, 6.28)], N = 30, shape = new THREE.Shape();
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        const k = 1 + 0.07 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(5 * a + ph[1]) + 0.03 * Math.sin(9 * a + ph[2]);
        const px = Math.sign(ca) * Math.pow(Math.abs(ca), 0.5) * (w / 2) * sc * k, pz = Math.sign(sa) * Math.pow(Math.abs(sa), 0.5) * (d / 2) * sc * k;
        if (i) shape.lineTo(px, pz); else shape.moveTo(px, pz);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.02, hh - 0.06), bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.08, bevelSegments: 2, curveSegments: 1 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.03, 0);
      this.add(g, this.mat(x, y + j * 0.05, z, 0, ry, 0), { color: o.color ?? COL.earth, pat: o.pat ?? PAT.earth, ...st, jitter: 0, flatUv: true });
    }
    return this;
  }
  // Плетень: колья и плетёные полосы от (x0,z0) до (x1,z1)
  pleten(x0, z0, x1, z1, h = 1.0, o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), n = Math.max(2, Math.round(len / 0.55));
    const stakes = []; this.stakes = stakes;   // вершины кольев: на них вешают кринки
    for (let i = 0; i <= n; i++) {
      if (o.broken && this.rand() < o.broken) continue;
      const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t, sh = h + 0.1 + this.rr(0, 0.25);
      this.cyl(px, -0.1, pz, 0.035, sh, { color: COL.logDark, pat: PAT.bark, seg: 4, rz: this.rr(-0.02, 0.02), rx: this.rr(-0.02, 0.02), stage: o.stage, jitter: 0 });
      stakes.push([px, sh - 0.1, pz]);
    }
    const bands = o.bands ?? 2;
    for (let b = 0; b < bands; b++) {
      if (o.broken && this.rand() < o.broken * 0.6) continue;
      const bh = h * (b === 0 ? 0.42 : 0.38), by = 0.08 + b * h * 0.5;
      this.box((x0 + x1) / 2, by, (z0 + z1) / 2, len, bh, 0.09, { color: o.color ?? 0x7a6244, pat: PAT.straw, ry: -ang, stage: o.stage, rz: this.rr(-0.015, 0.015) });
    }
    return this;
  }

  // Строительные леса вокруг прямоугольника (вид scaffold): стойки, настилы, раскосы.
  scaffold(x, y, z, w, d, h, ry = 0) {
    const sk = this.kind; this.kind = KIND.scaffold;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const W = w / 2 + 0.7, D = d / 2 + 0.7, nx = Math.max(2, Math.round(w / 2.4)), nz = Math.max(2, Math.round(d / 2.4));
    const posts = [];
    for (let i = 0; i <= nx; i++) { posts.push([-W + 2 * W * i / nx, -D]); posts.push([-W + 2 * W * i / nx, D]); }
    for (let i = 1; i < nz; i++) { posts.push([-W, -D + 2 * D * i / nz]); posts.push([W, -D + 2 * D * i / nz]); }
    for (const [lx, lz] of posts) { const [px, pz] = P(lx, lz); this.cyl(px, y - 0.4, pz, 0.06, h + 0.8, { color: COL.plank, pat: PAT.logs, seg: 5, rz: this.rr(-0.03, 0.03) }); }
    for (let lv = 1.4; lv < h; lv += 1.6) {
      for (const sz of [-1, 1]) { const [px, pz] = P(0, sz * D); this.box(px, y + lv, pz, 2 * W + 0.2, 0.06, 0.5, { color: COL.plankOld, pat: PAT.planks, ry }); }
      for (const sx of [-1, 1]) { const [px, pz] = P(sx * W, 0); this.box(px, y + lv, pz, 0.5, 0.06, 2 * D + 0.2, { color: COL.plankOld, pat: PAT.planks, ry }); }
    }
    // раскосы на фасаде
    for (let i = 0; i < nx; i++) {
      const lx = -W + 2 * W * (i + 0.5) / nx, [px, pz] = P(lx, D + 0.06), len = Math.hypot(2 * W / nx, Math.min(h, 3));
      this.box(px, y + 0.2, pz, 0.06, len, 0.06, { color: COL.plank, pat: PAT.plain, ry, rz: (i % 2 ? 1 : -1) * Math.atan2(2 * W / nx, Math.min(h, 3)) });
    }
    this.kind = sk;
    return this;
  }

  // Разметка: колышки и верёвка (вид marking)
  marking(x, y, z, w, d, ry = 0) {
    const sk = this.kind; this.kind = KIND.marking;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of cs) { const [px, pz] = P(a * w / 2, b * d / 2); this.cyl(px, y - 0.1, pz, 0.05, 0.7, { color: COL.plank, pat: PAT.plain, seg: 5, stage: 0 }); this.cone(px, y + 0.6, pz, 0.06, 0.12, { color: COL.red, seg: 5, stage: 0 }); }
    for (let i = 0; i < 4; i++) {
      const [a, b] = cs[i], [e, f] = cs[(i + 1) % 4], lx = (a + e) / 2 * w / 2, lz = (b + f) / 2 * d / 2, len = (a !== e ? w : d);
      const [px, pz] = P(lx, lz);
      this.box(px, y + 0.45, pz, a !== e ? len : 0.03, 0.03, a !== e ? 0.03 : len, { color: COL.rope, pat: PAT.plain, ry, stage: 0 });
    }
    this.kind = sk;
    return this;
  }

  // ---------- слияние ----------
  build() {
    this._buildLiners();
    if (Kit.onBuild) Kit.onBuild(this.parts);
    let n = 0;
    for (const p of this.parts) n += p.g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3),
      uv = new Float32Array(n * 2), info = new Float32Array(n * 4), rng = new Float32Array(n * 2), sw = new Float32Array(n), fx = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(),
      T = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Color();
    let o = 0;
    const box = new THREE.Box3();
    for (const p of this.parts) {
      const P = p.g.attributes.position, N = p.g.attributes.normal, cnt = P.count, UV = p.ownUv ? p.g.attributes.uv : null;
      let ymin = Infinity, ymax = -Infinity;
      for (let i = 0; i < cnt; i++) { const y = P.getY(i); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
      const seed = this.rand();
      const pc = new THREE.Vector3(); { const bb = new THREE.Box3().setFromBufferAttribute(P); bb.getCenter(pc); }
      const sz3 = new THREE.Box3().setFromBufferAttribute(P).getSize(new THREE.Vector3());
      const R = Math.max(0.05, p.capAxis ? Math.min(sz3.x, sz3.y, sz3.z) / 2 : Math.max(sz3.x, sz3.z) / 2);
      // лёгкий разброс тона детали — «мазок»
      // разброс в sRGB: в линейном цвете тёмные (хвоя, тёмная листва, морёное дерево) от -0.035 уходили в чёрное
      p.color.getHSL(_hsl, THREE.SRGBColorSpace);
      tmp.setHSL(_hsl.h + this.rr(-0.012, 0.012), Math.min(1, Math.max(0, _hsl.s + this.rr(-0.04, 0.04))), Math.min(1, Math.max(0.015, _hsl.l + this.rr(-0.035, 0.035) * Math.min(1, _hsl.l * 4))), THREE.SRGBColorSpace);
      for (let i = 0; i < cnt; i += 3) {
        a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
        fn.subVectors(c, b).cross(a.clone().sub(b)).normalize();
        const isCap = p.capAxis && Math.abs(fn.dot(p.capAxis)) > 0.85;
        if (Math.abs(fn.y) > 0.92) { T.set(1, 0, 0); B.set(0, 0, fn.y > 0 ? -1 : 1); }
        else { B.copy(up).addScaledVector(fn, -fn.y).normalize(); T.crossVectors(B, fn).normalize(); }
        // круглые детали (луковицы, бревна): u — по дуге вокруг оси, без шва внутри треугольника
        let a0 = null;
        const axis = p.capAxis ?? up;
        for (let k = 0; k < 3; k++) {
          const j = o + i + k, v = k === 0 ? a : k === 1 ? b : c;
          pos.set([v.x, v.y, v.z], j * 3);
          nor.set([N.getX(i + k), N.getY(i + k), N.getZ(i + k)], j * 3);
          col.set([tmp.r, tmp.g, tmp.b], j * 3);
          let pat = p.pat, u = v.dot(T) * p.uvScale, w = v.dot(B) * p.uvScale;
          if (isCap) {
            const dv = v.clone().sub(pc); dv.addScaledVector(p.capAxis, -dv.dot(p.capAxis));
            const t1 = Math.abs(p.capAxis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const t2 = new THREE.Vector3().crossVectors(p.capAxis, t1);
            u = dv.dot(t1); w = dv.dot(t2); pat = PAT.rings;
          } else if (!p.flatUv) {
            const dv = v.clone().sub(pc);
            const along = dv.dot(axis); dv.addScaledVector(axis, -along);
            const e1 = Math.abs(axis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const e2 = new THREE.Vector3().crossVectors(axis, e1);
            let ang = Math.atan2(dv.dot(e2), dv.dot(e1));
            if (a0 === null) a0 = ang; else { while (ang - a0 > Math.PI) ang -= 2 * Math.PI; while (ang - a0 < -Math.PI) ang += 2 * Math.PI; }
            if (p.capAxis) { u = along; w = ang * R; } else { u = ang * R; w = v.y; }
          }
          if (UV) { u = UV.getX(i + k) * p.ownUv[0]; w = UV.getY(i + k) * p.ownUv[1]; }
          uv[j * 2] = u; uv[j * 2 + 1] = w;
          info.set([pat, p.stage, p.kind, seed], j * 4);
          rng[j * 2] = ymin; rng[j * 2 + 1] = ymax;
          sw[j] = p.swayFn ? p.sway * p.swayFn(v, UV ? UV.getX(i + k) : 0, UV ? UV.getY(i + k) : 0) : p.sway ? p.sway * Math.max(0, v.y - p.swayBase) : 0;
          fx[j * 2] = p.flutFn ? p.flut * p.flutFn(v, UV ? UV.getX(i + k) : 0, UV ? UV.getY(i + k) : 0) : p.flut; fx[j * 2 + 1] = p.holes;
        }
      }
      o += cnt;
      p.g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
    g.setAttribute('aRange', new THREE.BufferAttribute(rng, 2));
    g.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
    g.setAttribute('aFx', new THREE.BufferAttribute(fx, 2));
    g.computeBoundingBox(); g.computeBoundingSphere();
    this.parts = [];
    return g;
  }
}
