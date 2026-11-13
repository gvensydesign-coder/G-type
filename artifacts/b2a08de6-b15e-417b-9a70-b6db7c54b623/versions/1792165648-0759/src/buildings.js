// Постройки и мелкие предметы из примитивов (бревенчатая изба, сени, колодец, ящик, бочка, пень, костёр, инструменты).
import * as THREE from 'three';
import { G, col, mixCol, rng, clamp } from './kit.js';

const LOG = [0x5c4128, 0x664a2e, 0x543a24, 0x6f5233];
const ROOF = [0x3b3a2c, 0x33342a, 0x403c2e, 0x2e3328];
const STONE = [0x4e5660, 0x59626b, 0x464e58];

function logSeg(g, ax, ay, az, bx, by, bz, r, c) { g.prism([ax, ay, az], [bx, by, bz], r, c, 6, 1, c, true); }

// side: 'S' z=+d/2 (вдоль x), 'N' z=-d/2, 'E' x=+w/2 (вдоль z), 'W' x=-w/2
// opts: w, d (м), wallH, roofH, door ('S' по умолчанию), open{S,N,E,W}: проём в стене, skip{...}: стену не рисовать (рисует сосед),
// roofFlush{...}: свес кровли убран (стык), ruin, seed
export function hutLocal(g, o) {
  const { w, d, wallH = 2.5, roofH = 1.45 } = o;
  const rnd = rng(o.seed || 3);
  const skip = o.skip || {}, open = o.open || {}, flush = o.roofFlush || {};
  const rr = 0.125, step = 0.232, y0 = 0.16;
  let rows = Math.max(3, Math.round((wallH - y0) / step));
  const doorSide = o.door === undefined ? 'S' : o.door;
  const openAt = (side) => (open[side] !== undefined ? open[side] : (side === doorSide ? 0 : undefined));
  // фундамент
  g.box(0, -0.25, 0, w + 0.3, 0.9, d + 0.3, STONE[0], 0, STONE[1]);
  const wallTop = y0 + rows * step;
  for (let i = 0; i < rows; i++) {
    const y = y0 + step * (i + 0.5);
    const even = i % 2 === 0;
    const ext = rr + 0.06;
    let rowCut = o.ruin ? (rnd() < 0.5 ? rows - 1 - Math.floor(rnd() * 3) : rows) : rows;
    if (o.ruin && i >= rowCut) continue;
    const jit = () => LOG[Math.floor(rnd() * LOG.length)];
    for (const side of ['S', 'N', 'E', 'W']) {
      if (skip[side]) continue;
      const alongX = side === 'S' || side === 'N';
      const len = alongX ? w : d;
      const fixed = side === 'S' ? d / 2 : side === 'N' ? -d / 2 : side === 'E' ? w / 2 : -w / 2;
      const e = (alongX === even) ? ext : 0;
      const oc = openAt(side);
      const hasOpen = oc !== undefined && y < 2.04;
      const segs = hasOpen ? [[-len / 2 - e, oc - 0.52], [oc + 0.52, len / 2 + e]] : [[-len / 2 - e, len / 2 + e]];
      for (const [a, b] of segs) {
        const c = mixCol(jit(), 0x000000, 0.0).clone();
        if (alongX) logSeg(g, a, y, fixed, b, y, fixed, rr, c); else logSeg(g, fixed, y, a, fixed, y, b, rr, c);
      }
    }
  }
  // дверной проём: косяки и притолока, дверь (приоткрыта)
  for (const side of ['S', 'N', 'E', 'W']) {
    if (skip[side]) continue;
    const oc = openAt(side);
    if (oc === undefined || o.ruin) continue;
    const alongX = side === 'S' || side === 'N';
    const fixed = side === 'S' ? d / 2 : side === 'N' ? -d / 2 : side === 'E' ? w / 2 : -w / 2;
    const sgn = side === 'S' || side === 'E' ? 1 : -1;
    const P = (a, y, off = 0) => alongX ? [oc + a, y, fixed + sgn * off] : [fixed + sgn * off, y, oc + a];
    g.beam(P(-0.55, 0.16), P(-0.55, 2.1), 0.12, 0.2, 0x70552f);
    g.beam(P(0.55, 0.16), P(0.55, 2.1), 0.12, 0.2, 0x70552f);
    g.beam(P(-0.62, 2.14), P(0.62, 2.14), 0.2, 0.14, 0x70552f);
    if (side === doorSide && open[side] === undefined) {
      g.quad(P(-0.5, 0.16, 0.0), P(0.5, 0.16, 0.0), P(0.5, 2.06, 0.0), P(-0.5, 2.06, 0.0), 0x0b1214);
      const hinge = P(0.5, 0, 0.05);
      const dir = alongX ? [0.1, 0, sgn * 0.85] : [sgn * 0.85, 0, 0.1];
      g.beam([hinge[0], 0.2, hinge[2]], [hinge[0], 2.0, hinge[2]], 0.05, 0.06, 0x3a2a1c);
      for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.22; g.beam([hinge[0] + dir[0] * t, 0.2, hinge[2] + dir[2] * t], [hinge[0] + dir[0] * t, 2.0, hinge[2] + dir[2] * t], 0.2, 0.05, 0x4a3524); }
    }
  }
  // окно в боковой стене
  if (!o.ruin && !o.noWindow) {
    const ws = doorSide === 'S' ? 'E' : 'S';
    if (!skip[ws] && open[ws] === undefined) {
      const alongX = ws === 'S' || ws === 'N';
      const fixed = ws === 'S' ? d / 2 : ws === 'N' ? -d / 2 : ws === 'E' ? w / 2 : -w / 2;
      const sgn = ws === 'S' || ws === 'E' ? 1 : -1;
      const P = (a, y, off) => alongX ? [a, y, fixed + sgn * off] : [fixed + sgn * off, y, a];
      g.quad(P(-0.3, 1.1, 0.14), P(0.3, 1.1, 0.14), P(0.3, 1.7, 0.14), P(-0.3, 1.7, 0.14), 0x1b2a2a, 0x1b2a2a, 0x2c4a48, 0x2c4a48);
      g.beam(P(-0.34, 1.1, 0.15), P(0.34, 1.1, 0.15), 0.05, 0.08, 0x70552f); g.beam(P(-0.34, 1.7, 0.15), P(0.34, 1.7, 0.15), 0.05, 0.08, 0x70552f);
      g.beam(P(-0.32, 1.1, 0.15), P(-0.32, 1.7, 0.15), 0.05, 0.08, 0x70552f); g.beam(P(0.32, 1.1, 0.15), P(0.32, 1.7, 0.15), 0.05, 0.08, 0x70552f);
    }
  }
  // кровля: двускатная, конёк вдоль большей стороны
  const ridgeX = w >= d;
  const L = ridgeX ? w : d, Wd = ridgeX ? d : w;           // длина по коньку и ширина по скату
  const ovE0 = flush[ridgeX ? 'W' : 'N'] ? 0.0 : 0.3, ovE1 = flush[ridgeX ? 'E' : 'S'] ? 0.0 : 0.3;
  const ovA = flush[ridgeX ? 'N' : 'W'] ? 0.0 : 0.5, ovB = flush[ridgeX ? 'S' : 'E'] ? 0.0 : 0.5;
  const yEave = wallTop + 0.05, yRidge = wallTop + roofH;
  const slope = (side) => { // side -1 / +1 по ширине
    const ov = side < 0 ? ovA : ovB;
    const half = Wd / 2 + ov;
    const eaveY = yEave - ov * (roofH / (Wd / 2));
    const S = 7;
    for (let i = 0; i < S; i++) {
      const t0 = i / S, t1 = (i + 1) / S;
      const a0 = side * (half * (1 - t0)), a1 = side * (half * (1 - t1));
      const y0r = eaveY + (yRidge - eaveY) * t0, y1r = eaveY + (yRidge - eaveY) * t1;
      const c0 = ROOF[i % ROOF.length], c1 = mixCol(ROOF[(i + 1) % ROOF.length], 0x6a6a50, 0.18 * t1).clone();
      const l0 = -L / 2 - ovE0, l1 = L / 2 + ovE1;
      const Q = (l, a, y) => ridgeX ? [l, y, a] : [a, y, l];
      if (o.ruin && ((i * 3 + side) % 4 === 0 || i > 4)) continue;
      g.quad(Q(l0, a0, y0r), Q(l1, a0, y0r), Q(l1, a1, y1r), Q(l0, a1, y1r), c0, c0, c1, c1);
      // нижняя сторона и торец
      g.quad(Q(l0, a0, y0r - 0.07), Q(l0, a1, y1r - 0.07), Q(l1, a1, y1r - 0.07), Q(l1, a0, y0r - 0.07), 0x1d1c16);
      if (i === 0) g.quad(Q(l0, a0, y0r), Q(l0, a0, y0r - 0.1), Q(l1, a0, y0r - 0.1), Q(l1, a0, y0r), 0x2a261c);
    }
  };
  slope(-1); slope(1);
  // коньковое бревно
  const rl0 = -L / 2 - ovE0 - 0.05, rl1 = L / 2 + ovE1 + 0.05;
  if (!o.ruin) { if (ridgeX) logSeg(g, rl0, yRidge + 0.05, 0, rl1, yRidge + 0.05, 0, 0.1, 0x4a3822); else logSeg(g, 0, yRidge + 0.05, rl0, 0, yRidge + 0.05, rl1, 0.1, 0x4a3822); }
  // фронтоны из вертикальных досок
  for (const end of [-1, 1]) {
    const sideKey = ridgeX ? (end < 0 ? 'W' : 'E') : (end < 0 ? 'N' : 'S');
    if (skip[sideKey] || o.ruin) continue;
    const l = end * L / 2;
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a0 = -Wd / 2 + (Wd * k) / n, a1 = -Wd / 2 + (Wd * (k + 1)) / n;
      const hy = (a) => wallTop + roofH * (1 - Math.abs(a) / (Wd / 2));
      const Q = (a, y) => ridgeX ? [l, y, a] : [a, y, l];
      const c = LOG[k % LOG.length];
      g.quad(Q(a0, wallTop), Q(a1, wallTop), Q(a1, hy(a1) - 0.02), Q(a0, hy(a0) - 0.02), c);
    }
  }
  // труба
  if (o.chimney && !o.ruin) { const cx = ridgeX ? -L * 0.28 : 0, cz = ridgeX ? 0 : -L * 0.28; g.box(cx, yRidge - 0.1, cz, 0.55, 1.2, 0.55, STONE[1], 0, STONE[2]); g.box(cx, yRidge + 0.55, cz, 0.7, 0.14, 0.7, STONE[0]); }
  if (o.ruin) {
    // мох и гниль на срубе
    for (let k = 0; k < 9; k++) g.blob((rnd() - 0.5) * w, wallTop - 0.1 - rnd() * 0.8, (rnd() - 0.5) * d, 0.28 + rnd() * 0.2, 0x35552a, { sy: 0.4, detail: 1, noise: 0.2, seed: k + 4, top: 0x6a8c3e });
  }
  return { wallTop, yRidge };
}

// положить локальный меш избы в мир: центр (x, y, z), поворот rot*90° вокруг Y
export function placeHut(g, o, x, y, z, rot) {
  const start = g.count;
  hutLocal(g, o);
  const m = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(rot * Math.PI / 2));
  g.transformFrom(start, m);
}

export function well(g, x, y, z) {
  const rnd = rng(11);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; g.blob(x + Math.cos(a) * 0.62, y + 0.2, z + Math.sin(a) * 0.62, 0.24, STONE[i % 3], { sy: 0.8, detail: 1, noise: 0.12, seed: i, top: 0x7e8a96 }); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28 + 0.25; g.blob(x + Math.cos(a) * 0.62, y + 0.55, z + Math.sin(a) * 0.62, 0.22, STONE[(i + 1) % 3], { sy: 0.8, detail: 1, noise: 0.12, seed: i + 20, top: 0x7e8a96 }); }
  g.quad([x - 0.5, y + 0.52, z - 0.5], [x + 0.5, y + 0.52, z - 0.5], [x + 0.5, y + 0.52, z + 0.5], [x - 0.5, y + 0.52, z + 0.5], 0x050a0b);
  g.beam([x - 0.7, y, z], [x - 0.7, y + 2.0, z], 0.14, 0.14, 0x5c4128); g.beam([x + 0.7, y, z], [x + 0.7, y + 2.0, z], 0.14, 0.14, 0x5c4128);
  g.beam([x - 0.8, y + 1.95, z], [x + 0.8, y + 1.95, z], 0.14, 0.14, 0x664a2e);
  for (const s of [-1, 1]) { g.quad([x - 0.9, y + 2.0, z + s * 0.3], [x + 0.9, y + 2.0, z + s * 0.3], [x + 0.9, y + 2.5, z], [x - 0.9, y + 2.5, z], 0x3b3a2c); }
  g.prism([x - 0.5, y + 1.8, z], [x + 0.5, y + 1.8, z], 0.045, 0x4a3822);
}

export function crate(g, x, y, z, s = 1, ry = 0) {
  g.box(x, y + 0.3 * s, z, 0.7 * s, 0.6 * s, 0.7 * s, 0x6a4e2e, ry, 0x7e6038);
  for (const k of [-1, 1]) { g.box(x, y + 0.3 * s, z, 0.74 * s, 0.07 * s, 0.74 * s, 0x4a3822, ry); g.box(x, y + (0.3 + k * 0.22) * s, z, 0.73 * s, 0.07 * s, 0.73 * s, 0x4a3822, ry); }
}
export function barrel(g, x, y, z, s = 1) {
  g.prism([x, y, z], [x, y + 0.9 * s, z], 0.36 * s, 0x5a4026, 10, 0.92, 0x6a4e2e);
  for (const t of [0.2, 0.7]) g.prism([x, y + t * s, z], [x, y + (t + 0.06) * s, z], 0.38 * s, 0x2e3438, 10, 1, 0x3c444a);
}
export function stump(g, x, y, z, s = 1, seed = 1) {
  g.prism([x, y - 0.1, z], [x, y + 0.5 * s, z], 0.34 * s, 0x5a4028, 8, 0.82, 0x7a5a38);
  g.prism([x, y + 0.5 * s, z], [x, y + 0.52 * s, z], 0.28 * s, 0xb89a68, 8, 0.9, 0xc8aa78);
  for (let k = 0; k < 5; k++) { const a = k * 1.3 + seed; g.blob(x + Math.cos(a) * 0.3 * s, y + 0.02, z + Math.sin(a) * 0.3 * s, 0.14 * s, 0x4a3422, { sy: 0.5, detail: 0, noise: 0.1, seed: k, top: 0x5a4028 }); }
}
export function logPile(g, x, y, z, ry = 0, n = 3, len = 1.6) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const pos = [[0, 0.16, 0], [0.34, 0.16, 0], [0.17, 0.46, 0], [-0.34, 0.16, 0], [0.0, 0.76, 0]];
  for (let i = 0; i < n; i++) { const [px, py, pz] = pos[i]; const X = x + px * c, Z = z - px * s; g.prism([X - s * len / 2 * 0 - c * 0 + (-len / 2) * s, y + py, Z + (-len / 2) * c], [X + (len / 2) * s, y + py, Z + (len / 2) * c], 0.16, 0x5c4128, 8, 1, 0x664a2e); g.prism([X + (len / 2) * s, y + py, Z + (len / 2) * c], [X + (len / 2) * s + 0.001 * s, y + py, Z + (len / 2) * c], 0.13, 0xb89a68, 8, 1, 0xc8aa78, false); }
}
export function woodpile(g, x, y, z, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - (row >> 1); i++) {
    const px = (i - 2.5 + (row >> 1) * 0.5) * 0.3, py = 0.14 + row * 0.26;
    const X = x + px * c, Z = z - px * s;
    g.prism([X - s * 0.5, y + py, Z - c * 0.5], [X + s * 0.5, y + py, Z + c * 0.5], 0.12, 0x5c4128 + (i % 2) * 0x080808, 7, 1, 0xb89a68);
  }
}
export function campfire(g, x, y, z) {
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; g.blob(x + Math.cos(a) * 0.75, y + 0.1, z + Math.sin(a) * 0.75, 0.22, STONE[i % 3], { sy: 0.7, detail: 1, noise: 0.15, seed: i, top: 0x808c98 }); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + 0.3; g.prism([x + Math.cos(a) * 0.55, y + 0.1, z + Math.sin(a) * 0.55], [x - Math.cos(a) * 0.08, y + 0.5, z - Math.sin(a) * 0.08], 0.07, 0x2a1c12, 6, 0.9, 0x1a110a); }
  g.blob(x, y + 0.08, z, 0.45, 0x1a1210, { sy: 0.25, detail: 1, noise: 0.1, seed: 2, top: 0x3a2210 });
}
export function bench(g, x, y, z, ry = 0) {
  // лавка: сиденье 0,45 м, длина 1,8 м, глубина 0,4 м
  const c = Math.cos(ry), s = Math.sin(ry);
  g.box(x, y + 0.415, z, 1.8, 0.07, 0.4, 0x6a4e2e, ry, 0x7e6038);
  for (const k of [-0.7, 0.7]) g.box(x + k * c, y + 0.19, z - k * s, 0.1, 0.38, 0.34, 0x4a3822, ry);
  g.box(x, y + 0.34, z, 1.5, 0.06, 0.08, 0x4a3822, ry);
}
export function hay(g, x, y, z, seed = 1) {
  g.prism([x, y, z], [x, y + 1.15, z], 0.85, 0x7c6c34, 10, 0.55, 0xa8975a);
  g.cone([x, y + 1.1, z], 0.55, 0.5, 0xa8975a, 10, 0xc2b274);
  g.prism([x, y + 1.6, z], [x, y + 1.95, z], 0.03, 0x4a3822, 4, 1, 0x4a3822, false);
}

// ---------------- предметы в руках (начало — середина рукояти, ось вдоль +Y, userData.base / tip)
export function makeAxe() {
  const g = new G(5); g.jit = 0.03;
  g.prism([0, -0.2, 0], [0, 0.66, 0], 0.024, 0x6a4a2a, 6, 1, 0x7a5a36);
  g.prism([0, 0.66, 0], [0, 0.69, 0], 0.03, 0x5a3e22, 6, 1, 0x5a3e22, true);
  // клин-лезвие: от обуха на рукояти расходится к режущей кромке (вдоль +X)
  const t0 = 0.026, t1 = 0.006, A = [0.02, 0.47], B = [0.02, 0.63], C = [0.27, 0.73], D = [0.27, 0.35];
  const P = (p, z) => [p[0], p[1], z];
  g.quad(P(A, t0), P(D, t1), P(C, t1), P(B, t0), 0x8a9098, 0x9aa2aa, 0xaab2ba, 0x8a9098);
  g.quad(P(A, -t0), P(B, -t0), P(C, -t1), P(D, -t1), 0x7a8088, 0x7a8088, 0x9aa2aa, 0x9aa2aa);
  g.quad(P(B, t0), P(C, t1), P(C, -t1), P(B, -t0), 0x6a7078);
  g.quad(P(A, t0), P(A, -t0), P(D, -t1), P(D, t1), 0x6a7078);
  g.quad(P(D, t1), P(D, -t1), P(C, -t1), P(C, t1), 0xe4ecf2);
  g.box(-0.045, 0.55, 0, 0.1, 0.16, 0.05, 0x4a4f56, 0, 0x5e646c);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true;
  grp.userData.base = 0.0; grp.userData.tip = 0.72; grp.userData.mat = mesh.material;
  return grp;
}
export function makePick() {
  const g = new G(6); g.jit = 0.03;
  g.prism([0, -0.2, 0], [0, 0.66, 0], 0.022, 0x6a4a2a, 6, 1, 0x7a5a36);
  g.box(0, 0.66, 0, 0.1, 0.07, 0.07, 0x4a4f56);
  g.prism([0.05, 0.66, 0], [0.34, 0.6, 0], 0.035, 0x7a828c, 4, 0.1, 0xb0b8c0);
  g.prism([-0.05, 0.66, 0], [-0.34, 0.6, 0], 0.035, 0x7a828c, 4, 0.1, 0xb0b8c0);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true;
  grp.userData.base = 0.0; grp.userData.tip = 0.66; grp.userData.mat = mesh.material;
  return grp;
}
export function makeShovel() {
  const g = new G(9); g.jit = 0.03;
  g.prism([0, -0.25, 0], [0, 0.7, 0], 0.022, 0x6a4a2a, 6, 1, 0x7a5a36);
  g.box(-0.06, 0.66, -0.02, 0.12, 0.04, 0.04, 0x5a3e22);
  g.prism([0, 0.7, 0], [0, 0.98, 0], 0.15, 0x7a828c, 5, 0.15, 0xb0b8c0);
  g.box(-0.1, 0.7, -0.012, 0.2, 0.2, 0.024, 0x8a9098, 0, 0xa0a8b0);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true;
  grp.userData.base = 0.0; grp.userData.tip = 0.98; grp.userData.mat = mesh.material;
  return grp;
}
export function makeBroom() {
  const g = new G(7); g.jit = 0.05;
  g.prism([0, -0.3, 0], [0, 0.95, 0], 0.016, 0x6a4a2a, 5, 1, 0x7a5a36);
  g.prism([0, 0.95, 0], [0, 1.28, 0], 0.09, 0x9a8a48, 8, 0.55, 0xc8b868);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true;
  grp.userData.base = 0.0; grp.userData.tip = 1.28; grp.userData.mat = mesh.material;
  return grp;
}
export function makeBucket() {
  const g = new G(8); g.jit = 0.04;
  g.prism([0, -0.3, 0], [0, 0, 0], 0.11, 0x5a4026, 9, 1.3, 0x6a4e2e);
  g.prism([0, -0.3, 0], [0, -0.285, 0], 0.1, 0x1a2a30, 9, 1, 0x2a4048);
  g.prism([0, -0.22, 0], [0, -0.2, 0], 0.125, 0x2e3438, 9, 1, 0x3c444a); g.prism([0, -0.08, 0], [0, -0.06, 0], 0.15, 0x2e3438, 9, 1, 0x3c444a);
  g.beam([-0.15, 0.0, 0], [0, 0.12, 0], 0.012, 0.012, 0x2e3438); g.beam([0, 0.12, 0], [0.15, 0.0, 0], 0.012, 0.012, 0x2e3438);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true;
  return grp;
}
export function makeCrateProp() {
  const g = new G(9); crate(g, 0, -0.3, 0, 0.7, 0);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const grp = new THREE.Group(); grp.add(mesh); mesh.castShadow = true; return grp;
}
