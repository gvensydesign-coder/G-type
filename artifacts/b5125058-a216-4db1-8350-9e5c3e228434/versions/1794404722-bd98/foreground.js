// Ближний план: тёмные силуэты ветки, травы и листьев лопуха по краям кадра (как листва в углу кадра t007
// и тёмный бортик снизу в TMNT photo1/photo2). Плоская тёмная заливка без света и тонкая светлая линия
// «на отрыве» вдоль края, который смотрит в освещённую сцену. Линия — твоими штрихами (handlib: нажим,
// дрожь руки и кисть берутся из твоих линий), защищена от Кувахары (alpha .5), как линейная аура.
// Здесь же общие помощники для fogforms.js и debris.js: загрузка твоих штрихов, линия «рукой», упаковка масок.
import * as THREE from 'three';
import { renderStroke } from './brushes.js';

// ---------------------------------------------------------------- твои штрихи → «почерк» линии
// Из штриха берём: нажим по длине (pr), отклонение от хорды (дрожь руки) и кисть (b).
const HAND = { lines: [], ready: null };
function styleOf(pts, pr, b) {
  const n = pts.length; if (n < 5) return null;
  const a = pts[0], z = pts[n - 1]; const dx = z[0] - a[0], dy = z[1] - a[1]; const L = Math.hypot(dx, dy); if (L < 0.08) return null;
  const ux = dx / L, uy = dy / L; const u = [], dev = [], p = [];
  for (let i = 0; i < n; i++) { const qx = pts[i][0] - a[0], qy = pts[i][1] - a[1]; u.push((qx * ux + qy * uy) / L); dev.push((-qx * uy + qy * ux) / L); p.push(pr?.[i] ?? 0.6); }
  // только почти прямые линии годятся для контура (зигзаги — нет)
  for (let i = 1; i < n; i++) if (u[i] < u[i - 1] - 0.08) return null;
  if (Math.max(...dev.map(Math.abs)) > 0.18) return null;
  return { u, dev, p, b: b ? { ...b, o: 1 } : null };
}
export function loadHand(base = '') {
  if (HAND.ready) return HAND.ready;
  const get = (f) => fetch(base + f).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  HAND.ready = Promise.all([...['moss', 'wood', 'stone', 'hay'].map((k) => get('handlib/' + k + '.json')), get('scribbles/outline.json')]).then((ds) => {
    const OK = ['ink', 'pen', 'nib', 'pencil'];
    for (const d of ds.slice(0, 4)) for (const ly of ['aura', 'light', 'shadow']) for (const v of d?.layers?.[ly]?.vars ?? []) for (const s of v) {
      if (s.b && !OK.includes(s.b.t)) continue;
      const P = []; for (let i = 0; i + 1 < s.pts.length; i += 2) P.push([s.pts[i], s.pts[i + 1]]);
      const st = styleOf(P, s.pr, s.b); if (st) HAND.lines.push(st);
    }
    const unpack = (a) => { const P = [], pr = []; for (let i = 1; i + 2 < a.length; i += 3) { P.push([a[i], a[i + 1]]); pr.push(a[i + 2]); } return { P, pr }; };
    for (const sl of Object.values(ds[4]?.slots ?? {})) for (const a of sl.s ?? []) { const { P, pr } = unpack(a); const st = styleOf(P, pr, null); if (st) HAND.lines.push(st); }
    if (!HAND.lines.length) HAND.lines.push({ u: [0, 0.5, 1], dev: [0, 0.01, 0], p: [0.5, 0.8, 0.4], b: null });
    return HAND;
  });
  return HAND.ready;
}

export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// длина ломаной
const plen = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
// точка на ломаной по доле длины и нормаль
function at(P, cum, s) {
  let i = 1; while (i < P.length - 1 && cum[i] < s) i++;
  const a = P[i - 1], b = P[i]; const seg = cum[i] - cum[i - 1] || 1; const t = Math.max(0, Math.min(1, (s - cum[i - 1]) / seg));
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [a[0] + dx * t, a[1] + dy * t, -dy / l, dx / l];
}
// линия «твоей рукой» по ломаной P (пиксели): нажим и дрожь из штриха st, jit — размах дрожи (доля длины)
export function handLine(g, P, wPx, st, color, jit = 0.025) {
  const L = plen(P); if (L < 2) return;
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const n = Math.max(4, Math.ceil(L / 3)); const out = [];
  const k = Math.min(jit * L, wPx * 1.2);   // дрожь не дальше толщины: линия остаётся «впритык»
  const samp = (arr, u) => { let j = 1; while (j < st.u.length - 1 && st.u[j] < u) j++; const a = st.u[j - 1], b = st.u[j]; const t = b > a ? Math.max(0, Math.min(1, (u - a) / (b - a))) : 0; return arr[j - 1] + (arr[j] - arr[j - 1]) * t; };
  for (let i = 0; i <= n; i++) { const u = i / n; const [x, y, nx, ny] = at(P, cum, u * L); const d = samp(st.dev, u) * k * 6; out.push([x + nx * d, y + ny * d, samp(st.p, u)]); }
  renderStroke(g, out, wPx, st.b ?? { t: 'pen', o: 1, pr: 0.8, tp: 0.8 }, color, { minW: Math.max(1, wPx * 0.45) });
}
// разбить ломаную на куски «как рука ведёт»: куски len0..len1, разрывы gap0..gap1, каждый своим штрихом
export function handRun(g, P, wPx, color, r, { len0 = 40, len1 = 120, gap0 = 3, gap1 = 10, jit = 0.025 } = {}) {
  const L = plen(P); if (L < 4) return;
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  let s = r() * gap1;
  while (s < L - 3) {
    const e = Math.min(L, s + len0 + r() * (len1 - len0)); const Q = [];
    for (let t = s; t < e; t += 3) { const p = at(P, cum, t); Q.push([p[0], p[1]]); }
    const p = at(P, cum, e); Q.push([p[0], p[1]]);
    handLine(g, Q, wPx * (0.8 + 0.4 * r()), HAND.lines[Math.floor(r() * HAND.lines.length)], color, jit);
    s = e + gap0 + r() * (gap1 - gap0);
  }
}
// светлая линия «на отрыве» вдоль освещённой стороны замкнутого контура poly; lit — куда свет (экран, y вниз)
export function rimPoly(g, poly, lit, gap, w, r, opt = {}) {
  const n = poly.length; let A = 0; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sgn = A > 0 ? 1 : -1; const ll = Math.hypot(lit[0], lit[1]) || 1; const lx = lit[0] / ll, ly = lit[1] / ll;
  const runs = []; let cur = null;
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[(i + 1) % n]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = ty * sgn, ny = -tx * sgn;                     // наружная нормаль
    if (nx * lx + ny * ly > (opt.th ?? 0.2)) { const o = gap + w * 0.5; (cur ??= []).push([poly[i][0] + nx * o, poly[i][1] + ny * o]); }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  for (const R of runs) if (R.length > 2) handRun(g, R, w, opt.color ?? '#fff', r, opt);
}
// маски (холсты, белое по прозрачному) → одна RGBA-текстура: R, G, B — маски, A — шум для растворения
export function packTex(cs, { noise = true, seed = 7, mip = false } = {}) {
  const W = cs[0].width, H = cs[0].height; const D = new Uint8Array(W * H * 4); const r = rng(seed);
  const ims = cs.map((c) => c?.getContext('2d').getImageData(0, 0, W, H).data);
  // шум крупными пятнами (растворение кусками, а не пылью)
  const NS = 16, gw = Math.ceil(W / NS) + 1, gh = Math.ceil(H / NS) + 1; const grid = new Float32Array(gw * gh).map(() => r());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ((H - 1 - y) * W + x) * 4, s = (y * W + x) * 4;   // строки снизу вверх (uv WebGL)
    for (let k = 0; k < 3; k++) D[o + k] = ims[k] ? ims[k][s + 3] : 0;
    if (noise) { const fx = x / NS, fy = y / NS, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy; const q = (i, j) => grid[j * gw + i];
      D[o + 3] = 255 * ((q(ix, iy) * (1 - tx) + q(ix + 1, iy) * tx) * (1 - ty) + (q(ix, iy + 1) * (1 - tx) + q(ix + 1, iy + 1) * tx) * ty); } else D[o + 3] = 255;
  }
  const t = new THREE.DataTexture(D, W, H, THREE.RGBAFormat); t.colorSpace = THREE.NoColorSpace;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = mip; t.needsUpdate = true; return t;
}
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function fillPoly(g, P) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); g.fill(); }
// лента по осевой C с толщиной w(t) → замкнутый контур
export function ribbon(C, wf) {
  const L = [], R = []; const n = C.length;
  for (let i = 0; i < n; i++) { const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = wf(i / (n - 1)) * 0.5;
    L.push([C[i][0] - ty * w, C[i][1] + tx * w]); R.push([C[i][0] + ty * w, C[i][1] - tx * w]); }
  return [...L, ...R.reverse()];
}
// лист: длина len, ширина wid, угол ang, от черенка (x, y)
export function leaf(x, y, ang, len, wid, bend = 0) {
  const P = []; const ca = Math.cos(ang), sa = Math.sin(ang); const N = 12;
  for (let s = -1; s <= 1; s += 2) for (let i = 0; i <= N; i++) { const t = s > 0 ? i / N : 1 - i / N; const hw = wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75) * (1 - 0.25 * t) * s;
    const lx = t * len, ly = hw + bend * len * t * t; P.push([x + lx * ca - ly * sa, y + lx * sa + ly * ca]); }
  return P;
}
// кривая Безье в ломаную
export function bez(a, b, c, d, n = 24) { const P = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } return P; }

// ---------------------------------------------------------------- силуэты ближнего плана
// каждый силуэт: холст заливки (R), линии на отрыве (G), лёгкий тон заливки к свету (B)
export function silhouette(W, H, build, lit, seed) {
  const cf = canvas(W, H), cr = canvas(W, H), ct = canvas(W, H); const gf = cf.getContext('2d'), gr = cr.getContext('2d'), gt = ct.getContext('2d');
  gf.fillStyle = '#fff'; gt.fillStyle = '#fff'; const r = rng(seed);
  const shapes = build(r);   // [{ poly, rim: bool, w }]
  for (const s of shapes) fillPoly(gf, s.poly);
  // тон: чуть светлее к освещённому краю (сдвинутая копия, вычитаем её)
  for (const s of shapes) fillPoly(gt, s.poly);
  gt.globalCompositeOperation = 'destination-out'; gt.save(); gt.translate(-lit[0] * 10, -lit[1] * 10); for (const s of shapes) fillPoly(gt, s.poly); gt.restore();
  for (const s of shapes) if (s.rim !== false) rimPoly(gr, s.poly, lit, 2.5, s.rw ?? 4.5, r, { len0: 30, len1: 110, gap0: 4, gap1: 14 });
  gr.globalCompositeOperation = 'destination-out'; gr.drawImage(cf, 0, 0);      // линия только снаружи силуэта
  return packTex([cf, cr, ct], { noise: false });
}
// ветка с листьями, свисает из левого верхнего угла (свет — к центру кадра: вправо-вниз)
export function branchShapes(r) {
  const S = []; const main = bez([-40, 70], [260, 40], [520, 150], [880, 300], 40);
  S.push({ poly: ribbon(main, (t) => 44 * (1 - t) + 7) });
  const twigs = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.18 + i * 0.13 + r() * 0.05; const p = main[Math.floor(t * 40)]; const dn = i % 2 ? 1 : -0.4;
    const e = [p[0] + 90 + r() * 120, p[1] + dn * (80 + r() * 120)];
    const tw = bez(p, [p[0] + 40, p[1] + dn * 20], [e[0] - 40, e[1] - dn * 10], e, 16); twigs.push(tw);
    S.push({ poly: ribbon(tw, (u) => 12 * (1 - u) + 3), rw: 3.5 });
  }
  // листья гроздьями по веткам: заострённые, висят вниз-вправо
  const L = [];
  for (const tw of [main, ...twigs]) for (let k = 0; k < (tw === main ? 9 : 4); k++) {
    const p = tw[Math.floor((0.25 + 0.75 * r()) * (tw.length - 1))]; const ang = 0.5 + r() * 1.6 - (r() < 0.25 ? 1.4 : 0);
    const len = 60 + r() * 70; L.push({ poly: leaf(p[0], p[1], ang, len, len * (0.2 + r() * 0.1), (r() - 0.5) * 0.3) });
  }
  // мох-бородка: тонкие пряди без линии
  for (let i = 0; i < 7; i++) { const p = main[8 + Math.floor(r() * 26)]; const h = 70 + r() * 160; const st = bez(p, [p[0] + 4, p[1] + h * 0.3], [p[0] - 8, p[1] + h * 0.7], [p[0] + (r() - 0.5) * 20, p[1] + h], 12); S.push({ poly: ribbon(st, (u) => 7 * (1 - u) + 1.5), rim: false }); }
  return [...S, ...L];
}
// пучок травы снизу справа (свет — вверх-влево)
export function grassShapes(r) {
  const S = []; const W = 1024, H = 512;
  for (let i = 0; i < 18; i++) {
    const x0 = 120 + r() * 960, h = 140 + r() * 330 * (0.4 + 0.6 * (x0 / W)); const lean = -(0.2 + r() * 0.7) * h * (r() < 0.8 ? 1 : -0.6);
    const C = bez([x0, H + 10], [x0 + lean * 0.1, H - h * 0.45], [x0 + lean * 0.6, H - h * 0.85], [x0 + lean, H - h], 20);
    S.push({ poly: ribbon(C, (t) => (14 + r() * 0) * (1 - t) + 1), rw: 3.5 });
  }
  // широкие листья осоки у основания
  for (let i = 0; i < 5; i++) { const x0 = 300 + r() * 700; S.push({ poly: leaf(x0, H + 20, -1.9 - r() * 0.8, 170 + r() * 90, 26, 0.15) }); }
  // метёлки
  for (let i = 0; i < 3; i++) { const x0 = 500 + r() * 500, h = 300 + r() * 160; const C = bez([x0, H + 10], [x0 - 20, H - h * 0.5], [x0 - 60, H - h * 0.9], [x0 - 90, H - h], 20); S.push({ poly: ribbon(C, () => 4), rw: 3 }); const t = C[C.length - 1]; S.push({ poly: leaf(t[0], t[1], -2.3, 70, 14) }); }
  return S;
}
// крупные листья лопуха слева снизу, крупными пятнами, как листва в углу t007 (свет — вверх-вправо).
// Мелкий папоротник пробовал: десятки листочков под Кувахарой и контуром дают рябь, крупный лист — нет.
export function burdockShapes(r) {
  const S = []; const H = 512;
  const L = [[-60, H + 20, -0.42, 900, 250], [-80, H - 150, -0.08, 700, 190], [140, H + 60, -0.8, 640, 200], [-60, H - 330, 0.12, 420, 120]];
  for (const [x, y, a, len, wid] of L) {
    const P = leaf(x, y, a, len, wid * (0.9 + r() * 0.2), (r() - 0.5) * 0.15);
    S.push({ poly: P, rw: 5 });
  }
  return S;
}

const FG_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const FG_FRAG = /* glsl */`
uniform sampler2D uTex; uniform vec3 uDark, uLift, uRim; uniform float uK; varying vec2 vUv;
void main(){
  vec4 m = texture2D(uTex, vUv);
  if (m.g > .42) { gl_FragColor = vec4(uRim * uK, .5); }                    // линия на отрыве: защищена от Кувахары
  else if (m.r > .5) { gl_FragColor = vec4(mix(uDark, uLift, m.b * .8), 1.); }  // плоский тёмный силуэт
  else discard;
  #include <colorspace_fragment>
}`;

export class ForegroundFrame {
  // fight — LairFight; opts: { dark, lift, rim, k, dist }
  constructor(fight, opts = {}) {
    this.f = fight; this.cam = fight.ctx.camera; this.D = opts.dist ?? 0.8;
    this.group = new THREE.Group(); this.group.userData.pfSkip = true; fight.scene.add(this.group);
    this.U = { uDark: { value: new THREE.Color(opts.dark ?? '#070d0b') }, uLift: { value: new THREE.Color(opts.lift ?? '#16241c') }, uRim: { value: new THREE.Color(opts.rim ?? '#d6e6b4') }, uK: { value: opts.k ?? 0.65 } };
    this.items = [];
    // какие силуэты, где их угол-якорь (в долях экрана −1..1), ширина (доля размера кадра), свет, качание
    this.defs = [
      { id: 'branch', W: 1024, H: 768, build: branchShapes, lit: [0.7, 0.7], anchor: [-1, 1], tex: [0, 0], w: 0.48, push: [-0.06, 0.05], sway: 0.016, seed: 11 },
      { id: 'grass', W: 1024, H: 512, build: grassShapes, lit: [-0.5, -0.85], anchor: [1, -1], tex: [1, 1], w: 0.38, push: [0.04, -0.03], sway: 0.012, seed: 23 },
      { id: 'leaves', W: 1024, H: 512, build: burdockShapes, lit: [0.45, -0.9], anchor: [-1, -1], tex: [0, 1], w: 0.3, push: [-0.03, -0.02], sway: 0.014, seed: 37 },
    ];
    loadHand().then(() => this.build()).catch((e) => console.warn('foreground', e));
  }
  build() {
    for (const d of this.defs) {
      const tex = silhouette(d.W, d.H, d.build, d.lit, d.seed);
      const mat = new THREE.ShaderMaterial({ uniforms: { ...this.U, uTex: { value: tex } }, vertexShader: FG_VERT, fragmentShader: FG_FRAG, blending: THREE.NoBlending, depthWrite: true, depthTest: true });
      // плоскость: угол текстуры tex совпадает с якорем pivot
      const g = new THREE.PlaneGeometry(1, d.H / d.W); g.translate((d.tex[0] ? -0.5 : 0.5), (d.tex[1] ? 0.5 : -0.5) * d.H / d.W, 0);
      const mesh = new THREE.Mesh(g, mat); mesh.userData.pfSkip = true; mesh.renderOrder = 20; mesh.frustumCulled = false;
      const pivot = new THREE.Group(); pivot.add(mesh); this.group.add(pivot); this.items.push({ d, pivot, mesh, ph: d.seed * 0.37 });
    }
    this.layout();
  }
  layout() {
    const c = this.cam; const hh = this.D * Math.tan(THREE.MathUtils.degToRad(c.fov * 0.5)); const hw = hh * c.aspect; const s = Math.min(hw, hh * 1.78) * 2;
    for (const it of this.items) { const d = it.d; it.pivot.position.set(d.anchor[0] * hw + d.push[0] * s, d.anchor[1] * hh + d.push[1] * s, -this.D); it.mesh.scale.setScalar(d.w * s); }
    this._asp = c.aspect; this._fov = c.fov;
  }
  update(dt) {
    if (!this.items.length) return;
    const c = this.cam; if (c.aspect !== this._asp || c.fov !== this._fov) this.layout();
    this.group.position.copy(c.position); this.group.quaternion.copy(c.quaternion);
    // качание шагами 12 к/с; от удара по земле — вздрагивают
    const st = Math.floor(this.f.t * 12) / 12; const kick = this.f.wave?.visible ? 1 : 0;
    for (const it of this.items) it.pivot.rotation.z = it.d.sway * (Math.sin(st * 0.9 + it.ph) + 0.4 * Math.sin(st * 2.3 + it.ph * 2)) * (it.d.anchor[0] > 0 ? -1 : 1) + kick * 0.01 * Math.sin(st * 40);
  }
  setVisible(v) { this.group.visible = v; }
}
// для проверки текстур (tex.html)
export const _dbg = { silhouette, branchShapes, grassShapes, burdockShapes };
