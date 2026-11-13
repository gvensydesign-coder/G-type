// Вкладка 3. Режим стройки: объекты рядом сливаются (частокол, ворота, камни, мосты, избы, стены), с подсветкой «будет соединено».
import * as THREE from 'three';
import { G, rng, clamp, lerp, smooth, hash2, vnoise, col, mixCol } from './kit.js';
import { heightAt, WATER_Y, pad, HALF, slopeAt } from './terrain.js';
import { vcMat, toonMat } from './core.js';
import { placeHut } from './buildings.js';

const CS = 2, NC = 30;
const cx = (i) => -29 + 2 * i, cz = (j) => -29 + 2 * j;
const ci = (x) => Math.floor((x + 30) / 2), cj = (z) => Math.floor((z + 30) / 2);
const WOOD = [0x6a5233, 0x7a6040, 0x5d472c, 0x70573a], WOOD_T = [0x8a7048, 0x9a8056, 0x7a6038, 0x8a6e48];
const GAP = 0.14;
const GROUP = { pal: 'f', gate: 'f', wall: 'w', bridge: 'b' };
const NAME = { pal: 'Частокол', gate: 'Ворота', wall: 'Стена', bridge: 'Мост', stone: 'Камень', hut: 'Изба', seni: 'Сени' };
const SIDES = ['S', 'E', 'N', 'W'];
const SIDE_ARR = { S: ['S', 'E', 'N', 'W'], E: ['E', 'N', 'W', 'S'], N: ['N', 'W', 'S', 'E'], W: ['W', 'S', 'E', 'N'] };
const worldToLocal = (ws, rot) => { for (const L of SIDES) if (SIDE_ARR[L][rot] === ws) return L; };
const dirOf = (o) => (o.rot % 2 === 0 ? [1, 0] : [0, 1]);
const rect = (o) => o.type === 'hut' ? { x0: o.i, x1: o.i + 2, z0: o.j, z1: o.j + 2 } : { x0: o.i, x1: o.i + 1, z0: o.j, z1: o.j + 1 };
const isBld = (o) => o.type === 'hut' || o.type === 'seni';
const isRun = (o) => GROUP[o.type] !== undefined;

const RULES = [
  ['pal', 'Частокол + частокол: одна непрерывная линия, без швов'],
  ['gate', 'Ворота + частокол: частокол смыкается с воротами заподлицо'],
  ['stone', 'Камень + камень: сливаются в одну глыбу'],
  ['bridge', 'Мост + мост: единый настил с общим ограждением'],
  ['hut', 'Изба + сени: общий проём, единая кровля, без щелей'],
  ['wall', 'Стена + стена или изба: стык без щелей'],
];

function ghostMat() { return toonMat({ color: 0x66e0c8, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }); }

// ---------------------------------------------------------------- поверхности из поля расстояний (тетраэдры)
function marchTets(f, x0, y0, z0, nx, ny, nz, h, out) {
  const sx = nx + 1, sy = ny + 1;
  const vals = new Float32Array(sx * sy * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) vals[(k * sy + j) * sx + i] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const cor = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const T = [[0, 5, 1, 6], [0, 1, 2, 6], [0, 2, 3, 6], [0, 3, 7, 6], [0, 7, 4, 6], [0, 4, 5, 6]];
  const P = new Array(8), V = new Float32Array(8);
  const e = (a, b) => { const t = V[a] / (V[a] - V[b]); return [P[a][0] + (P[b][0] - P[a][0]) * t, P[a][1] + (P[b][1] - P[a][1]) * t, P[a][2] + (P[b][2] - P[a][2]) * t]; };
  const emit = (a, b, c, ins, outs) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nxn = uy * vz - uz * vy, nyn = uz * vx - ux * vz, nzn = ux * vy - uy * vx;
    let ax = 0, ay = 0, az = 0;
    for (const o of outs) { ax += P[o][0]; ay += P[o][1]; az += P[o][2]; } ax /= outs.length; ay /= outs.length; az /= outs.length;
    let bx = 0, by = 0, bz = 0;
    for (const o of ins) { bx += P[o][0]; by += P[o][1]; bz += P[o][2]; } bx /= ins.length; by /= ins.length; bz /= ins.length;
    const d = nxn * (ax - bx) + nyn * (ay - by) + nzn * (az - bz);
    if (d >= 0) out.push(a, b, c); else out.push(a, c, b);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0, pos = 0;
    for (let c = 0; c < 8; c++) { const q = cor[c]; const v = vals[((k + q[2]) * sy + j + q[1]) * sx + i + q[0]]; V[c] = v; P[c] = [x0 + (i + q[0]) * h, y0 + (j + q[1]) * h, z0 + (k + q[2]) * h]; if (v < 0) neg++; else pos++; }
    if (!neg || !pos) continue;
    for (const t of T) {
      const ins = [], outs = [];
      for (const c of t) (V[c] < 0 ? ins : outs).push(c);
      if (ins.length === 0 || outs.length === 0) continue;
      if (ins.length === 1) emit(e(ins[0], outs[0]), e(ins[0], outs[1]), e(ins[0], outs[2]), ins, outs);
      else if (outs.length === 1) emit(e(outs[0], ins[0]), e(outs[0], ins[1]), e(outs[0], ins[2]), ins, outs);
      else {
        const p0 = e(ins[0], outs[0]), p1 = e(ins[0], outs[1]), p2 = e(ins[1], outs[1]), p3 = e(ins[1], outs[0]);
        emit(p0, p1, p2, ins, outs); emit(p0, p2, p3, ins, outs);
      }
    }
  }
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

function stoneCluster(stones, K, grow = 1) {
  const g = new G(4); g.jit = 0.05;
  let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9, gyAvg = 0;
  for (const s of stones) { mnx = Math.min(mnx, s.x - s.rx); mxx = Math.max(mxx, s.x + s.rx); mnz = Math.min(mnz, s.z - s.rz); mxz = Math.max(mxz, s.z + s.rz); gyAvg += s.gy; }
  gyAvg /= stones.length;
  const maxRy = Math.max(...stones.map((s) => s.ry));
  const pad_ = 0.35, h = stones.length > 4 ? 0.26 : 0.2;
  const x0 = mnx - pad_, z0 = mnz - pad_, y0 = gyAvg - 0.45;
  const nx = Math.ceil((mxx - mnx + pad_ * 2) / h), nz = Math.ceil((mxz - mnz + pad_ * 2) / h), ny = Math.ceil((maxRy * 2 + 0.2) / h);
  const f = (x, y, z) => {
    let d = 1e9;
    for (const s of stones) {
      const qx = (x - s.x) / (s.rx * grow), qy = (y - (s.gy + s.ry * 0.55)) / (s.ry * grow), qz = (z - s.z) / (s.rz * grow);
      const e = (Math.hypot(qx, qy, qz) - 1) * Math.min(s.rx, s.ry, s.rz) * grow;
      d = d === 1e9 ? e : smin(d, e, K);
    }
    d += (vnoise(x * 1.7 + 3, z * 1.7 + y * 1.3) - 0.5) * 0.28;
    return Math.max(d, (gyAvg - 0.3) - y);
  };
  const tris = [];
  marchTets(f, x0, y0, z0, nx, ny, nz, h, tris);
  const c1 = col(0x454d57), c2 = col(0x8794a0), moss = col(0x587a40), dark = col(0x2f363e);
  const cc = new THREE.Color();
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nxn = uy * vz - uz * vy, nyn = uz * vx - ux * vz, nzn = ux * vy - uy * vx; const l = Math.hypot(nxn, nyn, nzn) || 1; nyn /= l;
    const my = (a[1] + b[1] + c[1]) / 3, mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    cc.copy(c1).lerp(c2, clamp(nyn * 0.55 + 0.35 + (my - gyAvg) * 0.12, 0, 1));
    const n = vnoise(mx * 1.3, mz * 1.3);
    if (nyn > 0.55 && n > 0.45) cc.lerp(moss, smooth(0.45, 0.7, n) * 0.85);
    if (my < gyAvg + 0.08) cc.lerp(dark, 0.5);
    g.tri(a, b, c, cc.clone(), cc.clone(), cc.clone());
  }
  return g.build();
}

// ---------------------------------------------------------------- линейные объекты: частокол, ворота, стена, мост
const hcol = (x, z, arr) => arr[Math.floor(hash2(Math.round(x * 6), Math.round(z * 6)) * arr.length) % arr.length];
function endsOf(o) { const c = [cx(o.i), cz(o.j)], d = dirOf(o); return [[c[0] - d[0], c[1] - d[1]], [c[0] + d[0], c[1] + d[1]], d]; }

function runPoints(o, s0, s1, step) { // точки вдоль оси, s — расстояние от начала ячейки (0..2)
  const [a, b, d] = endsOf(o); const pts = [];
  const n = Math.max(1, Math.round((s1 - s0) / step));
  for (let k = 0; k <= n; k++) { const s = lerp(s0, s1, k / n); pts.push([a[0] + d[0] * s, a[1] + d[1] * s]); }
  return pts;
}

function buildPal(g, o) {
  const [a, b, d] = endsOf(o); const [ca, cb] = o.cap;
  const insA = GAP * ca, insB = GAP * cb;
  for (let k = 0; k < 8; k++) {
    const s = (k + 0.5) * 0.25;
    if (s < insA + 0.1 || 2 - s < insB + 0.1) continue;
    const x = a[0] + d[0] * s, z = a[1] + d[1] * s, gy = heightAt(x, z), hh = hash2(Math.round(x * 8), Math.round(z * 8));
    const top = gy + 1.85 + hh * 0.45, c = hcol(x, z, WOOD), ct = hcol(x, z, WOOD_T);
    g.prism([x, gy - 0.35, z], [x, top - 0.3, z], 0.118, c, 6, 1, c, false);
    g.prism([x, top - 0.3, z], [x, top, z], 0.118, c, 6, 0.1, ct, false);
  }
  for (let e = 0; e < 2; e++) {
    const cap = o.cap[e]; if (cap < 0.02) continue;
    const s = e === 0 ? (insA + 0.14) : 2 - (insB + 0.14);
    const x = a[0] + d[0] * s, z = a[1] + d[1] * s, gy = heightAt(x, z), top = gy + 2.15 + 0.3 * cap;
    const r = 0.12 + 0.06 * cap, c = 0x50402a;
    g.prism([x, gy - 0.35, z], [x, top, z], r, c, 7, 1, 0x6a5233, true);
    g.blob(x, top + 0.04, z, r * 1.1, 0x6a5233, { sy: 0.8, detail: 0, noise: 0.05, seed: 2, top: 0x8a7048 });
  }
  for (const rh of [0.62, 1.32]) {
    const pts = runPoints(o, ca > 0.02 ? insA + 0.1 : -0.12, cb > 0.02 ? 2 - insB - 0.1 : 2.12, 0.5);
    for (let k = 0; k < pts.length - 1; k++) {
      const p = pts[k], q = pts[k + 1];
      g.beam([p[0], heightAt(p[0], p[1]) + rh, p[1]], [q[0], heightAt(q[0], q[1]) + rh, q[1]], 0.1, 0.13, 0x5a4a30, 0x6f5c3c);
    }
  }
}

function buildGate(g, o) {
  const [a, b, d] = endsOf(o); const perp = [-d[1], d[0]];
  const insA = GAP * o.cap[0], insB = GAP * o.cap[1];
  const sA = 0.24 + insA, sB = 2 - 0.24 - insB;
  const pA = [a[0] + d[0] * sA, a[1] + d[1] * sA], pB = [a[0] + d[0] * sB, a[1] + d[1] * sB];
  for (const p of [pA, pB]) {
    const gy = heightAt(p[0], p[1]);
    g.prism([p[0], gy - 0.4, p[1]], [p[0], gy + 3.15, p[1]], 0.22, 0x4c3a24, 8, 1, 0x6a5233, true);
    g.blob(p[0], gy + 3.25, p[1], 0.26, 0x5a4630, { sy: 0.7, detail: 0, noise: 0.05, seed: 3, top: 0x8a7048 });
  }
  const gA = heightAt(pA[0], pA[1]), gB = heightAt(pB[0], pB[1]);
  g.beam([pA[0], gA + 2.7, pA[1]], [pB[0], gB + 2.7, pB[1]], 0.3, 0.26, 0x4c3a24, 0x6a5233);
  g.beam([pA[0], gA + 2.2, pA[1]], [pB[0], gB + 2.2, pB[1]], 0.14, 0.12, 0x5a4a30, 0x6f5c3c);
  // створки приоткрыты
  const ang = 1.15;
  for (const [h, sgn, gy] of [[pA, 1, gA], [pB, -1, gB]]) {
    const ld = [d[0] * Math.cos(ang) * sgn + perp[0] * Math.sin(ang), d[1] * Math.cos(ang) * sgn + perp[1] * Math.sin(ang)];
    const w = 0.7;
    const c = [h[0] + ld[0] * (w / 2 + 0.2), h[1] + ld[1] * (w / 2 + 0.2)];
    g.box(c[0], gy + 1.05, c[1], w, 1.8, 0.07, 0x5a4630, Math.atan2(-ld[1], ld[0]), 0x6f5c3c);
    g.box(c[0], gy + 1.65, c[1], w, 0.09, 0.1, 0x3a3228, Math.atan2(-ld[1], ld[0]));
    g.box(c[0], gy + 0.5, c[1], w, 0.09, 0.1, 0x3a3228, Math.atan2(-ld[1], ld[0]));
  }
  // торцевые брёвна ограды у ворот (чтобы ворота выглядели частью линии)
}

function buildWall(g, o) {
  const [a, b, d] = endsOf(o); const [ca, cb] = o.cap;
  const s0 = ca > 0.02 ? GAP * ca + 0.12 : -0.12, s1 = cb > 0.02 ? 2 - GAP * cb - 0.12 : 2.12;
  const pts = runPoints(o, s0, s1, 0.5);
  for (let r = 0; r < 8; r++) {
    const y = 0.14 + r * 0.22;
    for (let k = 0; k < pts.length - 1; k++) {
      const p = pts[k], q = pts[k + 1];
      const c = hcol(p[0] + r, p[1] - r, WOOD);
      g.prism([p[0], heightAt(p[0], p[1]) + y, p[1]], [q[0], heightAt(q[0], q[1]) + y, q[1]], 0.13, c, 6, 1, c, false);
    }
  }
  for (let e = 0; e < 2; e++) {
    const cap = o.cap[e]; if (cap < 0.02) continue;
    const s = e === 0 ? GAP * cap + 0.08 : 2 - GAP * cap - 0.08;
    const x = a[0] + d[0] * s, z = a[1] + d[1] * s, gy = heightAt(x, z);
    g.prism([x, gy - 0.3, z], [x, gy + 2.15, z], 0.2, 0x4c3a24, 8, 1, 0x6a5233, true);
  }
  for (let k = 0; k < pts.length - 1; k++) { const p = pts[k], q = pts[k + 1]; g.beam([p[0], heightAt(p[0], p[1]) + 1.92, p[1]], [q[0], heightAt(q[0], q[1]) + 1.92, q[1]], 0.46, 0.08, 0x3c3a2c, 0x4a4a38); }
}

function buildBridge(g, o) {
  const [a, b, d] = endsOf(o); const perp = [-d[1], d[0]]; const [ca, cb] = o.cap;
  const insA = GAP * ca, insB = GAP * cb;
  const deckY = (x, z) => Math.max(0.36, heightAt(x, z) + 0.16);
  const yAt = (s) => { const x = a[0] + d[0] * s, z = a[1] + d[1] * s; return lerp(deckY(a[0], a[1]), deckY(b[0], b[1]), s / 2); };
  for (let k = 0; k < 9; k++) {
    const s = (k + 0.5) * (2 / 9);
    if (s < insA + 0.05 || 2 - s < insB + 0.05) continue;
    const x = a[0] + d[0] * s, z = a[1] + d[1] * s, c = hcol(x, z, WOOD);
    g.box(x, yAt(s) - 0.04, z, d[0] ? 0.2 : 1.8, 0.08, d[1] ? 0.2 : 1.8, c, 0, hcol(x, z, WOOD_T));
  }
  const s0 = ca > 0.02 ? insA : -0.1, s1 = cb > 0.02 ? 2 - insB : 2.1;
  for (const sd of [-0.62, 0.62]) {
    const P = (s) => [a[0] + d[0] * s + perp[0] * sd, a[1] + d[1] * s + perp[1] * sd];
    const p0 = P(s0), p1 = P(s1);
    g.beam([p0[0], yAt(s0) - 0.22, p0[1]], [p1[0], yAt(s1) - 0.22, p1[1]], 0.18, 0.24, 0x4c3a24, 0x5a4630);
    // ограждение: стойки на 0,5 и 1,5, поручень сплошной
    for (const s of [0.5, 1.5]) { const p = P(s); const y = yAt(s); g.prism([p[0], y - 0.2, p[1]], [p[0], y + 1.0, p[1]], 0.07, 0x5a4630, 6, 1, 0x7a6040, true); }
    g.beam([p0[0], yAt(s0) + 0.95, p0[1]], [p1[0], yAt(s1) + 0.95, p1[1]], 0.1, 0.1, 0x5a4630, 0x7a6040);
    g.beam([p0[0], yAt(s0) + 0.5, p0[1]], [p1[0], yAt(s1) + 0.5, p1[1]], 0.07, 0.07, 0x4c3a24);
    // сваи
    const pm = P(1); const gy = Math.min(heightAt(pm[0], pm[1]), -0.5);
    g.prism([pm[0], gy - 0.2, pm[1]], [pm[0], yAt(1) - 0.2, pm[1]], 0.13, 0x3a2e1e, 6, 1, 0x4c3a24, false);
  }
  for (let e = 0; e < 2; e++) {
    const cap = o.cap[e]; if (cap < 0.02) continue;
    const s = e === 0 ? insA + 0.04 : 2 - insB - 0.04;
    for (const sd of [-0.62, 0.62]) {
      const x = a[0] + d[0] * s + perp[0] * sd, z = a[1] + d[1] * s + perp[1] * sd, y = yAt(s);
      g.prism([x, y - 0.25, z], [x, y + 1.3, z], 0.12, 0x4c3a24, 7, 1, 0x6a5233, true);
    }
  }
}

export class Tab3 {
  constructor(app, el) {
    this.app = app; this.el = el;
    this.objects = []; this.nid = 1; this.tool = 'pal'; this.rot = 0; this.dirty = true; this.hover = null;
    this.stoneMeshes = new Map(); this.clusterKeys = new Map();
    this.group = new THREE.Group(); app.stage.scene.add(this.group); this.group.visible = false;
    this.struct = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.struct.castShadow = true; this.struct.receiveShadow = true; this.struct.frustumCulled = false;
    this.group.add(this.struct);
    this.ghostMesh = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat()); this.ghostMesh.renderOrder = 8; this.ghostMesh.frustumCulled = false; this.group.add(this.ghostMesh);
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe0a64a, depthTest: false, transparent: true })); this.lines.renderOrder = 9; this.lines.frustumCulled = false; this.group.add(this.lines);
    this.hintMeshes = [];
    this.origMat = {};
    this.build();
    this.seed();
  }
  build() {
    this.el.innerHTML = `
      <h2>Соединение объектов</h2>
      <p>Режим стройки на тестовой площадке. Ставьте объекты щелчком. Рядом стоящие сливаются, а правило видно заранее: призрак подсвечивается, и появляется надпись «будет соединено».</p>
      <h3>Что ставить</h3>
      <div class="pal" id="t3pal"></div>
      <div class="row"><button class="btn" id="t3rot" type="button">Повернуть (R)</button><button class="btn" id="t3undo" type="button">Отменить</button><button class="btn" id="t3clear" type="button">Очистить</button><button class="btn primary" id="t3demo" type="button">Показать пример</button></div>
      <h3>Правила слияния</h3>
      <ul class="rules" id="t3rules"></ul>
      <p style="font-size:13px">Бирюзовые клетки на площадке показывают разрывы в готовых линиях. Поставьте туда объект и посмотрите на слияние.</p>`;
    const pal = this.el.querySelector('#t3pal'); this.palBtns = {};
    const tools = [['pal', 'Частокол', '1'], ['gate', 'Ворота', '2'], ['stone', 'Камень', '3'], ['bridge', 'Мост', '4'], ['hut', 'Изба', '5'], ['seni', 'Сени', '6'], ['wall', 'Стена', '7'], ['erase', 'Убрать', '8']];
    for (const [id, name, k] of tools) {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `${name}<small>клавиша ${k}</small>`; b.setAttribute('aria-pressed', String(id === this.tool));
      b.addEventListener('click', () => this.setTool(id)); pal.appendChild(b); this.palBtns[id] = b;
    }
    this.toolList = tools.map((t) => t[0]);
    const ul = this.el.querySelector('#t3rules'); this.ruleEls = {};
    for (const [id, txt] of RULES) { const li = document.createElement('li'); li.innerHTML = `<i></i><span>${txt}</span>`; ul.appendChild(li); this.ruleEls[id] = li; }
    this.el.querySelector('#t3rot').addEventListener('click', () => this.onRotate());
    this.el.querySelector('#t3undo').addEventListener('click', () => this.undo());
    this.el.querySelector('#t3clear').addEventListener('click', () => { this.objects = []; this.afterChange(); });
    this.el.querySelector('#t3demo').addEventListener('click', () => this.demo());
  }
  setTool(id) { this.tool = id; for (const k in this.palBtns) this.palBtns[k].setAttribute('aria-pressed', String(k === id)); this.updateGhost(); }
  onDigit(n) { const t = this.toolList[n - 1]; if (t) this.setTool(t); }
  onRotate() { this.rot = (this.rot + 1) % 4; this.updateGhost(); }
  seed() {
    const add = (type, i, j, rot = 0) => { const o = this.makeObj(type, i, j, rot); o.cap = [1, 1]; o.capT = [1, 1]; o.drop = 1; this.objects.push(o); return o; };
    add('pal', 22, 10, 0); add('pal', 23, 10, 0); add('pal', 24, 10, 0); add('gate', 26, 10, 0); add('pal', 27, 10, 0); add('pal', 28, 10, 0);
    add('stone', 23, 13); add('stone', 23, 15);
    add('hut', 25, 13, 0);
    add('bridge', 17, 10, 0); add('bridge', 19, 10, 0);
    add('wall', 25, 17, 0); add('wall', 27, 17, 0);
    this.hintCells = [[25, 10, 'pal'], [23, 14, 'stone'], [18, 10, 'bridge'], [26, 17, 'wall'], [27, 13, 'seni']];
    this.analyzeAll(); for (const o of this.objects) { o.cap = o.capT.slice(); }
    this.dirty = true;
  }
  makeObj(type, i, j, rot) { return { id: this.nid++, type, i, j, rot, cap: [1, 1], capT: [1, 1], flash: 0, hl: 0, hlT: 0, drop: 0, born: 0, seed: Math.floor(hash2(i * 3.1, j * 7.7) * 1e5) }; }
  // ---- занятость
  cellsOf(o) { const r = rect(o); const out = []; for (let j = r.z0; j < r.z1; j++) for (let i = r.x0; i < r.x1; i++) out.push([i, j]); return out; }
  occMap(list, skipId) { const m = new Map(); for (const o of list) { if (o.id === skipId) continue; for (const [i, j] of this.cellsOf(o)) m.set(i + ',' + j, o); } return m; }
  valid(o, list) {
    const occ = this.occMap(list, o.id);
    for (const [i, j] of this.cellsOf(o)) {
      if (i < 0 || j < 0 || i >= NC || j >= NC) return 'за краем участка';
      if (occ.has(i + ',' + j)) return 'клетка занята';
      const x = cx(i), z = cz(j), h = heightAt(x, z);
      if (o.type === 'bridge') { if (h > 0.5) { const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => { const p = occ.get((i + di) + ',' + (j + dj)); return p && p.type === 'bridge'; }); const wet = [[-2, 0], [2, 0], [0, -2], [0, 2]].some(([dx, dz]) => heightAt(x + dx, z + dz) < -0.3); if (!nb && !wet) return 'мост ставят у воды'; } continue; }
      if (h < WATER_Y + 0.02 || heightAt(x + 1, z) < WATER_Y - 0.05 && heightAt(x - 1, z) < WATER_Y - 0.05) return 'здесь вода';
      if (slopeAt(x, z) > 0.5) return 'слишком крутой склон';
      for (const c of this.app.world.colliders) { if (c.r != null ? Math.hypot(x - c.x, z - c.z) < c.r + 1.3 : (x > c.x0 - 1 && x < c.x1 + 1 && z > c.z0 - 1 && z < c.z1 + 1)) return 'мешает дерево или постройка'; }
    }
    return null;
  }
  // ---- анализ соединений для списка объектов
  analyze(list) {
    const an = new Map(); const occ = this.occMap(list);
    for (const o of list) an.set(o.id, { endJ: [false, false], endP: [null, null], stone: null, skip: {}, open: {}, flush: {}, partners: [] });
    // линейные
    for (const o of list) {
      if (!isRun(o)) continue;
      const d = dirOf(o), A = an.get(o.id);
      for (let e = 0; e < 2; e++) {
        const s = e === 0 ? -1 : 1; const ni = o.i + d[0] * s, nj = o.j + d[1] * s;
        const p = occ.get(ni + ',' + nj); if (!p) continue;
        let ok = false;
        if (isRun(p) && GROUP[p.type] === GROUP[o.type]) ok = true;
        if (GROUP[o.type] === 'w' && isBld(p)) ok = true;
        if (GROUP[o.type] === 'f' && false) ok = true;
        if (ok) { A.endJ[e] = true; A.endP[e] = p; if (!A.partners.includes(p)) A.partners.push(p); }
      }
    }
    // камни: связность по 4 соседям
    const seen = new Set(); let cid = 0;
    for (const o of list) {
      if (o.type !== 'stone' || seen.has(o.id)) continue;
      const cl = []; const st = [o]; seen.add(o.id);
      while (st.length) { const c = st.pop(); cl.push(c); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const p = occ.get((c.i + di) + ',' + (c.j + dj)); if (p && p.type === 'stone' && !seen.has(p.id)) { seen.add(p.id); st.push(p); } } }
      cl.sort((a, b) => a.id - b.id);
      for (const c of cl) { an.get(c.id).stone = cl; if (cl.length > 1) for (const p of cl) if (p !== c && !an.get(c.id).partners.includes(p)) an.get(c.id).partners.push(p); }
    }
    // постройки
    const blds = list.filter(isBld);
    for (let x = 0; x < blds.length; x++) for (let y = x + 1; y < blds.length; y++) {
      const A = blds[x], B = blds[y]; const ra = rect(A), rb = rect(B);
      let side = null, ov0, ov1;
      if (ra.x1 === rb.x0 || rb.x1 === ra.x0) { ov0 = Math.max(ra.z0, rb.z0); ov1 = Math.min(ra.z1, rb.z1); if (ov1 > ov0) side = ra.x1 === rb.x0 ? 'E' : 'W'; }
      if (!side && (ra.z1 === rb.z0 || rb.z1 === ra.z0)) { ov0 = Math.max(ra.x0, rb.x0); ov1 = Math.min(ra.x1, rb.x1); if (ov1 > ov0) side = ra.z1 === rb.z0 ? 'S' : 'N'; }
      if (!side) continue;
      const opp = { E: 'W', W: 'E', S: 'N', N: 'S' }[side];
      const mid = -30 + 2 * ((ov0 + ov1) / 2);
      const owner = (A.type === 'hut' && B.type !== 'hut') ? A : (B.type === 'hut' && A.type !== 'hut') ? B : (A.id < B.id ? A : B);
      const other = owner === A ? B : A;
      const wsOwner = owner === A ? side : opp, wsOther = owner === A ? opp : side;
      const lo = worldToLocal(wsOwner, owner.rot), lt = worldToLocal(wsOther, other.rot);
      const ocx = (o) => -30 + 2 * (rect(o).x0 + rect(o).x1) / 2, ocz = (o) => -30 + 2 * (rect(o).z0 + rect(o).z1) / 2;
      const th = owner.rot * Math.PI / 2; const xL = [Math.cos(th), -Math.sin(th)], zL = [Math.sin(th), Math.cos(th)];
      const v = (wsOwner === 'E' || wsOwner === 'W') ? [0, mid - ocz(owner)] : [mid - ocx(owner), 0];
      const off = (lo === 'S' || lo === 'N') ? v[0] * xL[0] + v[1] * xL[1] : v[0] * zL[0] + v[1] * zL[1];
      const an1 = an.get(owner.id), an2 = an.get(other.id);
      an1.open[lo] = clamp(off, -1.0, 1.0); an1.flush[lo] = true; an2.skip[lt] = true; an2.flush[lt] = true;
      an1.partners.push(other); an2.partners.push(owner);
    }
    return an;
  }
  analyzeAll() {
    const an = this.analyze(this.objects); this.an = an;
    for (const o of this.objects) { const a = an.get(o.id); o.capT = [a.endJ[0] ? 0 : 1, a.endJ[1] ? 0 : 1]; }
    // кластеры камней
    const keys = new Map();
    for (const o of this.objects) { if (o.type !== 'stone') continue; const a = an.get(o.id); keys.set(a.stone.map((s) => s.id).join('-'), a.stone); }
    return an;
  }
  // ---- построение геометрии
  objGeom(g, o, a) {
    if (o.type === 'pal') buildPal(g, o);
    else if (o.type === 'gate') buildGate(g, o);
    else if (o.type === 'wall') buildWall(g, o);
    else if (o.type === 'bridge') buildBridge(g, o);
    else if (isBld(o)) {
      const hut = o.type === 'hut';
      const x = -30 + 2 * (rect(o).x0 + rect(o).x1) / 2, z = -30 + 2 * (rect(o).z0 + rect(o).z1) / 2;
      const y = heightAt(x, z) - 0.05;
      placeHut(g, { w: hut ? 4 : 2, d: hut ? 4 : 2, wallH: hut ? 2.2 : 1.9, roofH: hut ? 1.45 : 0.9, chimney: hut && !Object.keys(a.open).length, seed: o.seed, skip: a.skip, open: a.open, roofFlush: a.flush, noWindow: !hut }, x, y, z, o.rot);
    }
  }
  rebuildStruct() {
    const g = new G(31); g.jit = 0.05;
    for (const o of this.objects) {
      if (o.type === 'stone') continue;
      const a = this.an.get(o.id);
      const s0 = g.count;
      this.objGeom(g, o, a);
      const e = 1 - Math.pow(1 - clamp(o.drop, 0, 1), 3);
      const lift = (1 - e) * 1.4;
      const hl = Math.max(o.flash, o.hl);
      if (lift > 0.001 || hl > 0.01) {
        for (let i = s0 * 3; i < g.p.length; i += 3) { g.p[i + 1] -= lift; }
        if (hl > 0.01) for (let i = s0 * 3; i < g.c.length; i += 3) { g.c[i] += hl * 0.22 * (o.hl > o.flash ? 1.2 : 0.25); g.c[i + 1] += hl * 0.4 * (o.hl > o.flash ? 0.75 : 1); g.c[i + 2] += hl * 0.34 * (o.hl > o.flash ? 0.1 : 1); }
      }
    }
    const old = this.struct.geometry; this.struct.geometry = g.count ? g.build() : new THREE.BufferGeometry(); old.dispose();
  }
  rebuildStones(dt, t) {
    const clusters = new Map();
    for (const o of this.objects) if (o.type === 'stone') { const a = this.an.get(o.id); clusters.set(a.stone.map((s) => s.id).join('-'), a.stone); }
    for (const [k, m] of [...this.stoneMeshes]) if (!clusters.has(k)) { this.group.remove(m.mesh); m.mesh.geometry.dispose(); this.stoneMeshes.delete(k); }
    for (const [k, list] of clusters) {
      let m = this.stoneMeshes.get(k);
      if (!m) {
        m = { mesh: new THREE.Mesh(new THREE.BufferGeometry(), vcMat()), t: list.length > 1 ? 0 : 1, built: -1, n: list.length };
        m.mesh.castShadow = true; m.mesh.receiveShadow = true; m.mesh.frustumCulled = false; this.group.add(m.mesh); this.stoneMeshes.set(k, m);
        if (list.length > 1) { this.flashList(list); }
      }
      const hlv = Math.max(...list.map((s) => Math.max(s.flash, s.hl)));
      const nt = Math.min(1, m.t + dt / 1.1);
      const bornAge = Math.min(...list.map((s) => s.drop));
      const key = nt.toFixed(3) + '|' + bornAge.toFixed(2) + '|' + hlv.toFixed(2);
      if (m.t !== nt || m.built !== key) {
        m.t = nt;
        const e = nt * nt * (3 - 2 * nt);
        const K = list.length > 1 ? lerp(0.03, 0.95, e) : 0.5;
        const grow = 0.55 + 0.45 * (1 - Math.pow(1 - clamp(bornAge, 0, 1), 3));
        const stones = list.map((s) => { const r = rng(s.seed); const rx = 0.88 + r() * 0.22, rz = 0.88 + r() * 0.22; return { x: cx(s.i) + (r() - 0.5) * 0.3, z: cz(s.j) + (r() - 0.5) * 0.3, rx, rz, ry: 0.78 + r() * 0.25, gy: heightAt(cx(s.i), cz(s.j)) }; });
        const geo = stoneCluster(stones, K, grow);
        const col_ = geo.attributes.color; if (hlv > 0.01) for (let i = 0; i < col_.count; i++) { col_.setXYZ(i, col_.getX(i) + hlv * 0.1, col_.getY(i) + hlv * 0.3, col_.getZ(i) + hlv * 0.26); }
        const old = m.mesh.geometry; m.mesh.geometry = geo; old.dispose(); m.built = key;
      }
    }
  }
  flashList(list) { for (const s of list) s.flash = 1; }
  afterChange() {
    this.analyzeAll(); this.dirty = true; this.maskPlants(); this.updateHints(); this.updateGhost();
  }
  place(type, i, j, rot) {
    const o = this.makeObj(type, i, j, rot); o.drop = 0; o.cap = [1, 1];
    const err = this.valid(o, this.objects); if (err) return err;
    this.objects.push(o); this.history = this.history || []; this.history.push(o.id);
    const before = new Map(); for (const p of this.objects) if (p !== o) before.set(p.id, this.an.get(p.id));
    this.afterChange();
    // подсветка слияния: объект и партнёры вспыхивают
    const a = this.an.get(o.id); o.flash = 1;
    for (const p of a.partners) p.flash = 1;
    if (a.partners.length) { this.app.toast('Соединено: ' + [o, ...a.partners].map((x) => NAME[x.type]).filter((v, k, ar) => ar.indexOf(v) === k).join(' + ')); this.ringAt(o); }
    return null;
  }
  ringAt(o) {
    const r = rect(o); const x = -30 + (r.x0 + r.x1) * 1, z = -30 + (r.z0 + r.z1) * 1;
    for (let k = 0; k < 18; k++) { const an = (k / 18) * 6.28; this.app.fx.glow.emit(x + Math.cos(an) * 1.0, heightAt(x, z) + 0.4, z + Math.sin(an) * 1.0, Math.cos(an) * 1.2, 1.2, Math.sin(an) * 1.2, 0x66e0c8, 0.14, 0.9, 1.5, 1.0, 0.9); }
  }
  remove(id) { this.objects = this.objects.filter((o) => o.id !== id); this.afterChange(); }
  undo() { while (this.history && this.history.length) { const id = this.history.pop(); if (this.objects.some((o) => o.id === id)) { this.remove(id); return; } } this.app.toast('Нечего отменять'); }
  demo() {
    if (this.demoT) return;
    const steps = [['pal', 25, 10, 0, 'Частокол в разрыв между частоколом и воротами'], ['stone', 23, 14, 0, 'Камень между камнями'], ['bridge', 18, 10, 0, 'Звено моста между звеньями'], ['wall', 26, 17, 0, 'Стена между стенами'], ['seni', 27, 13, 1, 'Сени у избы']];
    let k = 0; this.demoT = true;
    const run = () => {
      if (k >= steps.length) { this.demoT = false; return; }
      const [t, i, j, r, msg] = steps[k++]; this.app.toast(msg, 1800);
      const exists = this.objects.some((o) => o.type === t && o.i === i && o.j === j);
      if (!exists) this.place(t, i, j, r);
      setTimeout(run, 2100);
    };
    run();
  }
  updateHints() {
    for (const m of this.hintMeshes) { this.group.remove(m); }
    this.hintMeshes = [];
    const occ = this.occMap(this.objects);
    const geo = new THREE.PlaneGeometry(1.9, 1.9); geo.rotateX(-Math.PI / 2);
    for (const [i, j, t] of this.hintCells || []) {
      if (occ.has(i + ',' + j)) continue;
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x66e0c8, transparent: true, opacity: 0.2, depthWrite: false }));
      m.position.set(cx(i), heightAt(cx(i), cz(j)) + 0.07, cz(j)); m.renderOrder = 4; this.group.add(m); this.hintMeshes.push(m);
    }
  }
  maskPlants() {
    const occ = this.occMap(this.objects);
    if (!this.origMat.ok) { for (const id in this.app.plants.meshes) this.origMat[id] = this.app.plants.meshes[id].instanceMatrix.array.slice(); this.origMat.ok = true; }
    for (const id in this.app.plants.meshes) {
      const mesh = this.app.plants.meshes[id], arr = mesh.instanceMatrix.array, orig = this.origMat[id]; let ch = false;
      for (let k = 0; k < mesh.count; k++) {
        const x = orig[k * 16 + 12], z = orig[k * 16 + 14];
        let hide = false;
        const i = ci(x), j = cj(z);
        for (let di = -1; di <= 1 && !hide; di++) for (let dj = -1; dj <= 1 && !hide; dj++) { const o = occ.get((i + di) + ',' + (j + dj)); if (!o) continue; const r = rect(o); const m = isRun(o) ? 0.9 : 0.5; if (x > -30 + 2 * r.x0 - m && x < -30 + 2 * r.x1 + m && z > -30 + 2 * r.z0 - m && z < -30 + 2 * r.z1 + m) hide = true; }
        const was = arr[k * 16] === 0 && arr[k * 16 + 5] === 0;
        if (hide && !was) { for (let q = 0; q < 16; q++) if (q !== 12 && q !== 13 && q !== 14 && q !== 15) arr[k * 16 + q] = 0; ch = true; }
        else if (!hide && was) { for (let q = 0; q < 16; q++) arr[k * 16 + q] = orig[k * 16 + q]; ch = true; }
      }
      if (ch) mesh.instanceMatrix.needsUpdate = true;
    }
  }
  // ---- курсор и призрак
  cellFromEvent(e) {
    const app = this.app, r = app.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, app.stage.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = (0.4 - o.y) / d.y; if (!(t > 0)) return null;
    for (let k = 0; k < 5; k++) { const x = o.x + d.x * t, z = o.z + d.z * t; const h = heightAt(x, z); t = (h - o.y) / d.y; }
    const x = o.x + d.x * t, z = o.z + d.z * t;
    return { x, z };
  }
  cellFor(type, p) {
    if (type === 'hut') return [Math.round((p.x + 30) / 2) - 1, Math.round((p.z + 30) / 2) - 1];
    return [ci(p.x), cj(p.z)];
  }
  onPointerMove(e) {
    if (e.pointerType === 'touch' && !this.app.drag) return;
    const p = this.cellFromEvent(e); if (!p) return;
    this.hover = p; this.updateGhost();
  }
  onClick(e) {
    const p = this.cellFromEvent(e); if (!p) return;
    if (this.tool === 'erase') {
      const occ = this.occMap(this.objects); const o = occ.get(ci(p.x) + ',' + cj(p.z)); if (o) { this.remove(o.id); this.app.toast('Убрано: ' + NAME[o.type]); } return;
    }
    const [i, j] = this.cellFor(this.tool, p);
    if (e.pointerType === 'touch') {
      if (!this.ghostCell || this.ghostCell[0] !== i || this.ghostCell[1] !== j) { this.hover = p; this.updateGhost(); return; }
    }
    const err = this.place(this.tool, i, j, this.rot);
    if (err) this.app.toast('Нельзя здесь: ' + err);
    this.hover = p; this.updateGhost();
  }
  updateGhost() {
    const app = this.app;
    for (const o of this.objects) o.hlT = 0;
    const lab = app.$('label3');
    for (const k in this.ruleEls) this.ruleEls[k].classList.remove('on');
    if (!this.hover || this.tool === 'erase') {
      this.ghostMesh.visible = false; this.lines.visible = false; lab.classList.remove('on'); this.ghostCell = null; this.markHl();
      if (this.tool === 'erase' && this.hover) { const occ = this.occMap(this.objects); const o = occ.get(ci(this.hover.x) + ',' + cj(this.hover.z)); if (o) o.hlT = 1; this.markHl(); }
      return;
    }
    const [i, j] = this.cellFor(this.tool, this.hover); this.ghostCell = [i, j];
    const g = this.makeObj(this.tool, i, j, this.rot); g.id = -1; g.cap = [1, 1];
    const err = this.valid(g, this.objects);
    const list = this.objects.concat([g]);
    const an = this.analyze(list); const a = an.get(g.id);
    g.capT = [a.endJ[0] ? 0 : 1, a.endJ[1] ? 0 : 1]; g.cap = g.capT.slice();
    const G_ = new G(5); G_.jit = 0;
    // призрак показывает уже слитый вид
    const keepAn = this.an; this.an = an;
    if (g.type === 'stone') {
      const cl = a.stone; const stones = cl.map((s) => { const r = rng(s.seed); return { x: cx(s.i), z: cz(s.j), rx: 0.95, rz: 0.95, ry: 0.85, gy: heightAt(cx(s.i), cz(s.j)) }; });
      const old = this.ghostMesh.geometry; this.ghostMesh.geometry = stoneCluster(stones, cl.length > 1 ? 0.95 : 0.5, 1.02); old.dispose();
    } else {
      this.objGeom(G_, g, a); const old = this.ghostMesh.geometry; this.ghostMesh.geometry = G_.count ? G_.build() : new THREE.BufferGeometry(); old.dispose();
    }
    this.an = keepAn;
    this.ghostMesh.visible = true;
    this.ghostMesh.material.color.set(err ? 0xe0704a : (a.partners.length ? 0xe0c04a : 0x66e0c8));
    this.ghostMesh.material.opacity = err ? 0.5 : 0.62;
    // линии к партнёрам
    const pts = [];
    const centerOf = (o) => { const r = rect(o); const x = -30 + (r.x0 + r.x1), z = -30 + (r.z0 + r.z1); return [x, heightAt(x, z) + 1.3, z]; };
    const gc = centerOf(g);
    if (!err) for (const p of a.partners) { const pc = centerOf(p); pts.push(...gc, ...pc); const real = this.objects.find((o) => o.id === p.id); if (real) real.hlT = 1; }
    this.lines.geometry.dispose(); this.lines.geometry = new THREE.BufferGeometry(); this.lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); this.lines.visible = pts.length > 0;
    // подпись и правила
    if (err) { lab.textContent = 'Нельзя: ' + err; lab.classList.add('on'); lab.style.borderColor = 'var(--danger)'; }
    else if (a.partners.length) {
      const names = [...new Set([g, ...a.partners].map((x) => NAME[x.type]))].join(' + ');
      lab.textContent = 'Будет соединено: ' + names; lab.classList.add('on'); lab.style.borderColor = 'var(--accent)';
      const fire = (r) => this.ruleEls[r] && this.ruleEls[r].classList.add('on');
      const has = (t) => a.partners.some((p) => p.type === t);
      if (g.type === 'pal' && has('pal')) fire('pal');
      if ((g.type === 'gate' && has('pal')) || (g.type === 'pal' && has('gate'))) fire('gate');
      if (g.type === 'stone' && has('stone')) fire('stone');
      if (g.type === 'bridge' && has('bridge')) fire('bridge');
      if (isBld(g) && a.partners.some((p) => isBld(p))) fire('hut');
      if ((g.type === 'wall' && a.partners.length) || (isBld(g) && has('wall'))) fire('wall');
    } else { lab.textContent = NAME[g.type] + ': рядом нет объектов для соединения'; lab.classList.add('on'); lab.style.borderColor = 'var(--line)'; }
    this.markHl();
  }
  markHl() { /* hlT применяется в update */ }
  // ---- жизненный цикл
  enter() {
    const app = this.app;
    app.hero.group.visible = false; app.hero.item && (app.hero.item.visible = false);
    this.group.visible = true; this.hideGL = false;
    app.setPlants(['grass', 'meadow', 'reeds', 'fireweed', 'fern', 'moss', 'bush', 'stones', 'lily']);
    app.cam.setOrbit(new THREE.Vector3(21, 0.4, -1.8), -0.55, 0.98, 27); app.cam.auto = false;
    app.hint('Перетащите, чтобы повернуть камеру. Колесо или щипок меняет масштаб. WASD сдвигает камеру. <span class="kbd">R</span> поворачивает, цифры 1–8 выбирают объект.');
    app.setTouch(false);
    const mini = app.$('mini'); mini.classList.add('on'); mini.innerHTML = '<button class="btn" id="mRot" type="button">Повернуть</button><button class="btn primary" id="mPut" type="button">Поставить</button>';
    mini.querySelector('#mRot').onclick = () => this.onRotate();
    mini.querySelector('#mPut').onclick = () => { if (this.ghostCell) { const err = this.place(this.tool, this.ghostCell[0], this.ghostCell[1], this.rot); if (err) this.app.toast('Нельзя здесь: ' + err); this.updateGhost(); } };
    this.maskPlants(); this.updateHints(); this.updateGhost();
    this.analyzeAll(); this.dirty = true;
  }
  leave() {
    const app = this.app; this.group.visible = false; app.$('mini').classList.remove('on'); app.$('label3').classList.remove('on'); app.cam.auto = false;
    this.ghostMesh.visible = false; this.lines.visible = false;
    // вернуть траву под постройками
    const keep = this.objects; this.objects = []; this.maskPlants(); this.objects = keep;
  }
  focus() { return this.app.cam.center; }
  update(dt, t) {
    const app = this.app;
    // камера: WASD сдвигает центр
    const k = app.keys, c = app.cam;
    const ix = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), iz = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0);
    if (ix || iz) {
      const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
      const sp = 14 * dt * (c.dist / 33);
      c.center.x = clamp(c.center.x + (fx * iz - fz * ix) * sp, -28, 28); c.center.z = clamp(c.center.z + (fz * iz + fx * ix) * sp, -28, 28);
    }
    c.update(dt, c.center);
    // анимации
    let changed = this.dirty;
    for (const o of this.objects) {
      for (let e = 0; e < 2; e++) { const d = o.capT[e] - o.cap[e]; if (Math.abs(d) > 0.001) { o.cap[e] += Math.sign(d) * Math.min(Math.abs(d), dt * 1.6); changed = true; } }
      if (o.flash > 0) { o.flash = Math.max(0, o.flash - dt * 0.9); changed = true; }
      const hd = o.hlT - o.hl; if (Math.abs(hd) > 0.001) { o.hl += Math.sign(hd) * Math.min(Math.abs(hd), dt * 6); changed = true; }
      if (o.drop < 1) { o.drop = Math.min(1, o.drop + dt * 2.6); changed = true; }
    }
    if (changed) { this.rebuildStruct(); this.dirty = false; }
    this.rebuildStones(dt, t);
    for (const m of this.hintMeshes) m.material.opacity = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(t * 3));
    if (this.ghostMesh.visible) this.ghostMesh.material.opacity = 0.55 + 0.1 * Math.sin(t * 6);
  }
}
