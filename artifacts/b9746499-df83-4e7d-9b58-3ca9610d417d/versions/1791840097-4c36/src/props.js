// Утварь и двор: бочки, кадки, вёдра, мешки, горшки, поленницы, телеги, козлы, колоды, ульи, стога,
// колокола, фонари, верёвки с бельём. Всё рисуется теми же деталями Kit (один меш на постройку).
// Каждая функция: (k, x, y, z, o) — x,y,z точка на земле в координатах постройки, o.ry поворот.
import * as THREE from 'three';
import { PAT, COL } from './kit.js';

const PI = Math.PI;
const rot = (ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (x, z, lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
const tint = (k, c, l = 0.05) => new THREE.Color(c).offsetHSL(0, k.rr(-0.03, 0.03), k.rr(-l, l)).getHex();

export const Props = {
  // Бочка из клёпок с обручами. o.lying — на боку
  barrel(k, x, y, z, o = {}) {
    const r = o.r ?? 0.32, h = o.h ?? 0.82, col = tint(k, o.color ?? 0x8a6038);
    const prof = [[0, 0.02], [r * 0.84, 0], [r * 0.96, h * 0.22], [r, h * 0.5], [r * 0.96, h * 0.78], [r * 0.84, h], [r * 0.78, h * 0.985], [0, h * 0.97]];
    const rx = o.lying ? PI / 2 : 0, yy = o.lying ? y + r * 0.95 : y;
    const zz = o.lying ? z - h / 2 : z;
    k.lathe(x, yy, zz, prof, { color: col, pat: PAT.planks, seg: 12, rx, ry: o.ry ?? 0, sway: 0 });
    for (const t of [0.12, 0.34, 0.66, 0.88]) {
      const rr = r * (t < 0.2 || t > 0.8 ? 0.9 : 0.99) + 0.012, g = new THREE.CylinderGeometry(rr, rr, 0.05, 12, 1, true);
      g.translate(0, h * t, 0);
      k.add(g, k.mat(x, yy, zz, rx, o.ry ?? 0, 0), { color: COL.iron, pat: PAT.iron, flatUv: false });
    }
    return k;
  },
  // Кадка: прямая, открытая, с водой или соленьем
  tub(k, x, y, z, o = {}) {
    const r = o.r ?? 0.4, h = o.h ?? 0.55;
    k.lathe(x, y, z, [[0, 0.02], [r * 0.9, 0], [r, h], [r * 0.9, h], [r * 0.82, h * 0.85], [0, h * 0.85]], { color: tint(k, 0x80603e), pat: PAT.planks, seg: 12 });
    k.cyl(x, y + h * 0.84, z, r * 0.85, 0.02, { color: o.water ? 0x1e3438 : 0x5a4a2a, pat: o.water ? PAT.dark : PAT.earth, seg: 12 });
    for (const t of [0.2, 0.8]) { const g = new THREE.CylinderGeometry(r * (0.9 + t * 0.1) + 0.012, r * (0.9 + t * 0.1) + 0.012, 0.045, 12, 1, true).translate(0, h * t, 0); k.add(g, k.mat(x, y, z), { color: COL.iron, pat: PAT.iron, flatUv: false }); }
    return k;
  },
  bucket(k, x, y, z, o = {}) {
    const r = 0.15;
    k.lathe(x, y, z, [[0, 0.01], [r * 0.8, 0], [r, 0.3], [r * 0.92, 0.3], [r * 0.75, 0.04], [0, 0.04]], { color: tint(k, 0x8a6a42), pat: PAT.planks, seg: 10, rz: o.tip ?? 0 });
    const g = new THREE.TorusGeometry(r, 0.008, 4, 10, PI); k.add(g, k.mat(x, y + 0.3, z, 0, k.rr(0, PI), o.tip ?? 0), { color: COL.iron, pat: PAT.iron });
    return k;
  },
  sack(k, x, y, z, o = {}) {
    const s = o.s ?? 1, g = new THREE.SphereGeometry(0.28 * s, 9, 7);
    g.scale(1, 1.35, 0.85); g.translate(0, 0.3 * s, 0);
    const P = g.attributes.position; for (let i = 0; i < P.count; i++) if (P.getY(i) < 0.04 * s) P.setY(i, 0.04 * s);
    g.computeVertexNormals();
    k.add(g, k.mat(x, y, z, k.rr(-0.15, 0.15), k.rr(0, PI), o.tilt ?? k.rr(-0.2, 0.2)), { color: tint(k, o.color ?? 0xb09868, 0.07), pat: PAT.cloth });
    k.cone(x, y + 0.66 * s, z, 0.07 * s, 0.14 * s, { color: tint(k, 0xa08858), pat: PAT.cloth, seg: 5 });
    return k;
  },
  crate(k, x, y, z, o = {}) {
    const w = o.w ?? 0.6, h = o.h ?? 0.45, d = o.d ?? 0.45, ry = o.ry ?? k.rr(-0.3, 0.3);
    k.box(x, y, z, w, h, d, { color: tint(k, 0x8a6a46), pat: PAT.planks, ry });
    const R = rot(ry);
    for (const sx of [-1, 1]) { const [a, b] = R(x, z, sx * (w / 2 - 0.04), d / 2 + 0.01); k.box(a, y, b, 0.06, h, 0.03, { color: 0x5a4030, pat: PAT.planks, ry }); }
    if (o.fill) k.box(x, y + h - 0.02, z, w - 0.08, 0.08, d - 0.08, { color: o.fill, pat: PAT.thatch, ry });
    return k;
  },
  // Горшок / кринка / кувшин
  pot(k, x, y, z, o = {}) {
    const s = o.s ?? 1, t = o.type ?? k.pick(['gorshok', 'krinka', 'kuvshin']);
    const prof = t === 'gorshok' ? [[0, 0], [0.1, 0], [0.16, 0.08], [0.17, 0.16], [0.13, 0.24], [0.14, 0.27], [0.11, 0.25], [0, 0.22]]
      : t === 'krinka' ? [[0, 0], [0.08, 0], [0.13, 0.1], [0.12, 0.2], [0.07, 0.3], [0.08, 0.36], [0.06, 0.34], [0, 0.3]]
      : [[0, 0], [0.08, 0], [0.14, 0.12], [0.12, 0.24], [0.05, 0.34], [0.05, 0.42], [0.07, 0.45], [0, 0.42]];
    k.lathe(x, y, z, prof.map(([r, yy]) => [r * s, yy * s]), { color: tint(k, o.color ?? k.pick([0x9a5a34, 0x7a4a2e, 0x6a5a48, 0xa8763e]), 0.07), pat: PAT.clay, seg: 10, rx: o.rx ?? 0, rz: o.rz ?? 0 });
    return k;
  },
  // Поленница: колотые поленья торцами наружу под дощатой крышей
  woodpile(k, x, y, z, o = {}) {
    const L = o.len ?? 2.4, H = o.h ?? 1.2, ry = o.ry ?? 0, R = rot(ry), dep = o.dep ?? 0.5;
    const n = Math.round(L / 0.2), m = Math.round(H / 0.18);
    k.log(...R(x, z, 0, 0).slice(0, 1), y + 0.05, R(x, z, 0, 0)[1], 0.06, L + 0.2, { color: COL.logDark, ry: ry, pat: PAT.bark });
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      if (j === m - 1 && k.rand() < 0.35) continue;
      const lx = -L / 2 + (i + 0.5) * L / n + k.rr(-0.02, 0.02) + (j % 2) * 0.05, [a, b] = R(x, z, lx, 0);
      const g = new THREE.CylinderGeometry(0.1, 0.1, dep * k.rr(0.92, 1.08), 3, 1).rotateX(PI / 2).rotateZ(k.rr(0, PI * 2));
      k.add(g, k.mat(a, y + 0.16 + j * 0.18 + 0.09, b, 0, ry, 0), { color: tint(k, 0x9a7048, 0.08), pat: PAT.bark, cap: true, capLocal: new THREE.Vector3(0, 0, 1), flatUv: false });
    }
    if (o.roof !== false) { const [a, b] = R(x, z, 0, 0); k.box(a, y + 0.16 + m * 0.18, b, L + 0.4, 0.06, dep + 0.35, { color: COL.plankOld, pat: PAT.planks, ry, rx: 0.12 }); }
    return k;
  },
  // Колода для колки дров с воткнутым топором и щепой
  chopBlock(k, x, y, z, o = {}) {
    k.cyl(x, y, z, 0.3, 0.55, { color: 0x6a4a30, pat: PAT.logs, seg: 9, r2: 0.28 });
    k.box(x + 0.05, y + 0.55, z, 0.04, 0.5, 0.05, { color: 0x8a6a40, rz: -0.6, ry: o.ry ?? 0.4 });
    k.box(x - 0.02, y + 0.5, z, 0.2, 0.12, 0.03, { color: COL.iron, pat: PAT.iron, ry: o.ry ?? 0.4, rz: -0.6 });
    for (let i = 0; i < 9; i++) k.box(x + k.rr(-0.9, 0.9), y, z + k.rr(-0.9, 0.9), k.rr(0.06, 0.16), 0.02, k.rr(0.03, 0.05), { color: 0xb08a58, ry: k.rr(0, PI) });
    for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 3, 1).rotateZ(PI / 2); k.add(g, k.mat(x + k.rr(-0.8, 0.8), y + 0.08, z + k.rr(-0.8, 0.8), 0, k.rr(0, PI), 0), { color: 0x9a7048, pat: PAT.bark, cap: true, flatUv: false }); }
    return k;
  },
  // Козлы с бревном и пилой
  sawhorse(k, x, y, z, o = {}) {
    const ry = o.ry ?? 0, R = rot(ry);
    for (const s of [-0.7, 0.7]) for (const t of [-1, 1]) { const [a, b] = R(x, z, s, 0); k.box(a, y, b, 0.07, 1.1, 0.07, { color: COL.logDark, pat: PAT.bark, ry, rx: t * 0.45 }); }
    const [a, b] = R(x, z, 0, 0);
    k.log(a, y + 0.86, b, 0.16, 2.6, { color: tint(k, COL.log), ry });
    k.box(a, y + 0.95, b, 0.025, 0.25, 0.8, { color: 0x9a9aa0, pat: PAT.iron, ry: ry + 0.1, rx: 0.3 });
    return k;
  },
  bench(k, x, y, z, o = {}) {
    const L = o.len ?? 1.6, ry = o.ry ?? 0, R = rot(ry);
    k.box(x, y + 0.42, z, L, 0.07, 0.32, { color: tint(k, 0x8a6a46), pat: PAT.planks, ry, rz: k.rr(-0.02, 0.02) });
    for (const s of [-1, 1]) { const [a, b] = R(x, z, s * (L / 2 - 0.18), 0); k.box(a, y, b, 0.08, 0.43, 0.26, { color: 0x6a4a30, pat: PAT.planks, ry }); }
    return k;
  },
  // Корыто из долблёной колоды
  trough(k, x, y, z, o = {}) {
    const L = o.len ?? 1.8, ry = o.ry ?? 0;
    const g = new THREE.CylinderGeometry(0.3, 0.3, L, 10, 1, false, PI / 2, PI).rotateZ(PI / 2).rotateX(PI);
    k.add(g, k.mat(x, y + 0.3, z, 0, ry, 0), { color: 0x6a4a30, pat: PAT.bark, cap: true, flatUv: false });
    k.box(x, y + 0.22, z, L - 0.1, 0.02, 0.44, { color: o.water === false ? 0x4a3a2a : 0x1e3438, pat: PAT.dark, ry });
    return k;
  },
  // Колода-улей под дощатой крышкой
  beehive(k, x, y, z, o = {}) {
    k.cyl(x, y, z, 0.28, 1.0, { color: tint(k, 0x6a5038), pat: PAT.logs, seg: 9 });
    k.gable(x, y + 1.0, z, 0.7, 0.7, 0.22, { ry: o.ry ?? 0, color: COL.plankOld, pat: PAT.planks, over: 0.08, th: 0.04, gables: false, ridge: false, eaves: false });
    k.box(x, y + 0.55, z + 0.27, 0.08, 0.1, 0.04, { color: 0x100804, pat: PAT.dark });
    return k;
  },
  // Стог сена на остожье: жердь, подстилка из жердей, слоистый конус
  haystack(k, x, y, z, o = {}) {
    const r = o.r ?? 1.1, h = o.h ?? 2.6;
    for (let i = 0; i < 4; i++) k.log(x, y + 0.08, z + (i - 1.5) * 0.4, 0.06, r * 2.4, { color: COL.logDark, ry: k.rr(-0.1, 0.1) });
    k.cyl(x, y, z, 0.05, h + 0.9, { color: COL.logDark, pat: PAT.bark, seg: 4, rz: k.rr(-0.04, 0.04) });
    const prof = [[0, 0.1], [r * 0.9, 0.12], [r, h * 0.3], [r * 0.92, h * 0.55], [r * 0.6, h * 0.82], [r * 0.18, h * 0.97], [0, h]];
    const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 14);
    k.add(g, k.mat(x, y, z, 0, k.rand() * 6, k.rr(-0.04, 0.04)), { color: tint(k, 0xb09452, 0.06), pat: PAT.thatch, flatUv: false, sway: 0.008, swayBase: y + h * 0.5 });
    for (let i = 0; i < 2; i++) k.box(x, y + h * 0.7, z, 0.05, h * 0.5, 0.05, { color: COL.logDark, rz: i ? 0.5 : -0.5, ry: i * 1.2 });
    return k;
  },
  // Телега: кузов, колёса со спицами, оглобли опущены на землю
  cart(k, x, y, z, o = {}) {
    const ry = o.ry ?? 0, R = rot(ry);
    const wheel = (lx, lz, r) => {
      const [a, b] = R(x, z, lx, lz);
      const t = new THREE.TorusGeometry(r, 0.05, 5, 14); k.add(t, k.mat(a, y + r, b, 0, ry + PI / 2, 0), { color: COL.logDark, pat: PAT.planks });
      for (let i = 0; i < 6; i++) { const g = new THREE.BoxGeometry(0.035, r * 2 - 0.08, 0.035).rotateZ(i * PI / 6); k.add(g, k.mat(a, y + r, b, 0, ry + PI / 2, 0), { color: 0x6a4a30 }); }
      const hub = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 7).rotateX(PI / 2); k.add(hub, k.mat(a, y + r, b, 0, ry + PI / 2, 0), { color: COL.logDark });
    };
    for (const s of [-1, 1]) { wheel(-0.7, s * 0.7, 0.42); wheel(0.75, s * 0.7, 0.48); }
    const [a, b] = R(x, z, 0, 0);
    k.box(a, y + 0.55, b, 2.3, 0.08, 1.15, { color: tint(k, 0x8a6a46), pat: PAT.planks, ry });
    for (const s of [-1, 1]) { const [c, d] = R(x, z, 0, s * 0.56); k.box(c, y + 0.6, d, 2.3, 0.32, 0.05, { color: tint(k, 0x7a5a3a), pat: PAT.planks, ry, rx: s * 0.15 }); }
    for (const s of [-1, 1]) { const [c, d] = R(x, z, -1.15 - 0.9, s * 0.42); k.box(c, y + 0.02, d, 0.06, 0.06, 2.1, { color: COL.logDark, pat: PAT.bark, ry: ry + PI / 2, rz: 0.04 }); }
    if (o.load === 'hay') { const [c, d] = R(x, z, 0, 0); k.lumpBox(c, y + 0.62, d, 2.1, 0.7, 1.1, { color: 0xb09452, pat: PAT.thatch, ry, amp: 0.12, cell: 0.3 }); }
    if (o.load === 'sacks') for (let i = 0; i < 4; i++) { const [c, d] = R(x, z, -0.6 + i * 0.45, k.rr(-0.2, 0.2)); Props.sack(k, c, y + 0.6, d, { s: 0.8, tilt: 1.2 }); }
    return k;
  },
  // Колокол: профиль литья, язык, ушко
  bell(k, x, y, z, o = {}) {
    const s = o.s ?? 0.5;
    const prof = [[0, 1.0], [0.3, 1.0], [0.42, 0.92], [0.46, 0.7], [0.5, 0.42], [0.6, 0.18], [0.74, 0.04], [0.76, 0], [0.7, 0.0], [0.55, 0.12], [0.4, 0.4], [0.35, 0.8], [0, 0.85]];
    k.lathe(x, y - s, z, prof.map(([r, yy]) => [r * s, yy * s]), { color: o.color ?? 0x9a7a3a, pat: PAT.gold, seg: 14, sway: o.sway ?? 0.02, swayBase: y });
    k.cyl(x, y - s * 0.75, z, s * 0.06, s * 0.7, { color: COL.iron, pat: PAT.iron, seg: 5, sway: o.sway ?? 0.02, swayBase: y });
    k.cyl(x, y - 0.02, z, s * 0.12, s * 0.12, { color: COL.iron, pat: PAT.iron, seg: 6 });
    return k;
  },
  lantern(k, x, y, z, o = {}) {
    k.box(x, y, z, 0.18, 0.24, 0.18, { color: COL.glow, pat: PAT.glow, sway: 0.03, swayBase: y + 0.4 });
    k.cone(x, y + 0.24, z, 0.16, 0.12, { color: COL.iron, pat: PAT.iron, seg: 4, sway: 0.03, swayBase: y + 0.4 });
    k.cyl(x, y + 0.36, z, 0.01, 0.1, { color: COL.iron, seg: 3 });
    return k;
  },
  // Верёвка с бельём/рыбой/вениками между двумя точками (качается)
  line(k, x0, y0, z0, x1, y1, z1, o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), n = o.n ?? Math.round(len / 0.45);
    k.box((x0 + x1) / 2, (y0 + y1) / 2 - 0.08, (z0 + z1) / 2, len, 0.02, 0.02, { color: COL.rope, ry: -ang });
    const type = o.type ?? 'cloth';
    for (let i = 1; i < n; i++) {
      if (k.rand() < 0.25) continue;
      const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t, py = y0 + (y1 - y0) * t - 0.1 - Math.sin(t * PI) * 0.12;
      if (type === 'cloth') { const h = k.rr(0.4, 0.8); k.box(px, py - h, pz, k.rr(0.3, 0.5), h, 0.02, { color: k.pick([0xd8cdb4, 0xb5462e, 0xc8b48a, 0x8a9aa8, 0xe0d8c0]), pat: PAT.cloth, ry: -ang, sway: 0.08, swayBase: py }); }
      else if (type === 'fish') { k.box(px, py - 0.35, pz, 0.08, 0.32, 0.03, { color: 0x9a9a88, pat: PAT.bone, ry: -ang, sway: 0.06, swayBase: py }); }
      else { k.cone(px, py - 0.5, pz, 0.12, 0.45, { color: 0x6a7a3a, pat: PAT.thatch, seg: 5, rx: PI, sway: 0.05, swayBase: py }); }
    }
    return k;
  },
  // Грабли / вилы, прислонённые к стене
  tool(k, x, y, z, o = {}) {
    const ry = o.ry ?? 0, lean = o.lean ?? 0.25;
    k.box(x, y, z, 0.04, 1.8, 0.04, { color: 0x9a7a50, ry, rx: -lean });
    const top = [x - 1.8 * Math.sin(lean) * Math.sin(ry), y + 1.8 * Math.cos(lean), z - 1.8 * Math.sin(lean) * Math.cos(ry)];
    if ((o.type ?? 'rake') === 'rake') { k.box(top[0], top[1], top[2], 0.6, 0.05, 0.05, { color: 0x8a6a40, ry, rx: -lean }); for (let i = 0; i < 6; i++) k.box(top[0] - 0.25 + i * 0.1, top[1] - 0.12, top[2], 0.02, 0.12, 0.02, { color: 0x8a6a40, ry, rx: -lean }); }
    else for (let i = 0; i < 3; i++) k.box(top[0] - 0.1 + i * 0.1, top[1] - 0.05, top[2], 0.02, 0.35, 0.02, { color: COL.iron, pat: PAT.iron, ry, rx: -lean });
    return k;
  },
  // Свечи / жертвенные чашки / ленты
  candle(k, x, y, z) { k.cyl(x, y, z, 0.03, k.rr(0.1, 0.22), { color: 0xe0d0a0, pat: PAT.bone, seg: 5 }); return k; },
  skull(k, x, y, z, o = {}) {
    k.sphere(x, y + 0.13, z, 0.13, { color: COL.bone, pat: PAT.bone, sy: 1.1, seg: 8 });
    k.box(x, y + 0.02, z + 0.05, 0.14, 0.08, 0.14, { color: COL.bone, pat: PAT.bone });
    for (const s of [-1, 1]) k.box(x + s * 0.045, y + 0.12, z + 0.11, 0.05, 0.04, 0.03, { color: 0x100808, pat: PAT.dark });
    return k;
  },
  // Сено/солома клочьями у стены, щепа, мусор: бытовой «шум» у построек
  litter(k, w, d, n = 10, o = {}) {
    for (let i = 0; i < n; i++) {
      const side = k.rand() < 0.5, x = side ? k.rr(-w / 2, w / 2) : k.pick([-1, 1]) * (w / 2 + k.rr(0.1, 0.5)), z = side ? k.pick([-1, 1]) * (d / 2 + k.rr(0.1, 0.5)) : k.rr(-d / 2, d / 2);
      const r = k.rand();
      if (r < 0.35) k.box(x, 0, z, k.rr(0.1, 0.3), 0.025, k.rr(0.04, 0.08), { color: 0xa88a58, ry: k.rr(0, PI) });
      else if (r < 0.6) k.lumpBox(x, -0.02, z, k.rr(0.4, 0.8), 0.12, k.rr(0.3, 0.6), { color: 0xa89050, pat: PAT.thatch, amp: 0.05, cell: 0.2, ry: k.rr(0, PI) });
      else if (r < 0.8) k.rock(x, 0, z, k.rr(0.08, 0.2), { color: COL.stone, sy: 0.6 });
      else { const g = new THREE.CylinderGeometry(0.06, 0.06, k.rr(0.5, 1.2), 5).rotateZ(PI / 2); k.add(g, k.mat(x, 0.06, z, 0, k.rr(0, PI), 0), { color: 0x6a5038, pat: PAT.bark, cap: true, flatUv: false }); }
    }
    return k;
  },
};
