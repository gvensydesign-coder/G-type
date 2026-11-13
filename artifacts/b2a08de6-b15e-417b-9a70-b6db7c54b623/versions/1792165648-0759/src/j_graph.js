// Линейные объекты со свободной постановкой: мосты, частокол с воротами и башнями, дороги и мостки.
// Модель: граф узлов и рёбер. Конец отрезка ловится на узел или на бок ребра (тогда ребро делится),
// пересечения режутся в точке пересечения. Вид узла (стык, угол, Т, Y, крест) определяется степенью и углами.
import * as THREE from 'three';
import { G, clamp, lerp, hash2, col } from './kit.js';
import { heightAt, WATER_Y } from './terrain.js';
import { vcMat } from './core.js';

const WOOD = [0x6a5233, 0x7a6040, 0x5d472c, 0x70573a], WOOD_T = [0x8a7048, 0x9a8056, 0x7a6038, 0x8a6e48];
const hc = (x, z, a) => a[Math.floor(hash2(Math.round(x * 6), Math.round(z * 6)) * a.length) % a.length];
const P = (x, y, z) => [x, y, z];

// ---------------------------------------------------------------- данные графа
export class GraphData {
  constructor(j) { this.nodes = []; this.edges = []; this.items = []; this.nid = 1; if (j) Object.assign(this, JSON.parse(j)); }
  json() { return JSON.stringify({ nodes: this.nodes, edges: this.edges, items: this.items, nid: this.nid }); }
  node(id) { return this.nodes.find((n) => n.id === id); }
  edgesOf(id) { return this.edges.filter((e) => e.a === id || e.b === id); }
  deg(id) { return this.edgesOf(id).length; }
  newNode(x, z) { const n = { id: this.nid++, x, z, s: 0 }; this.nodes.push(n); return n; }
  newEdge(a, b, style, g = 0) { if (a === b) return null; if (this.edges.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a))) return null; const e = { id: this.nid++, a, b, style, g }; this.edges.push(e); return e; }
  len(e) { const a = this.node(e.a), b = this.node(e.b); return Math.hypot(a.x - b.x, a.z - b.z); }
  splitEdge(e, x, z) {
    const n = this.newNode(x, z); const b = e.b; e.b = n.id; const e2 = { id: this.nid++, a: n.id, b, style: e.style, g: e.g }; this.edges.push(e2); n.s = 1; return n;
  }
  // привязка точки: узел в радиусе, иначе бок ребра, иначе новая точка. Возвращает {node, kind}
  snap(x, z, R = 1.1, RE = 0.9, create = true) {
    let best = null, bd = R;
    for (const n of this.nodes) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } }
    if (best) return { node: best, kind: 'node' };
    let be = null, bt = 0, bde = RE;
    for (const e of this.edges) {
      const a = this.node(e.a), b = this.node(e.b), dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(px - x, pz - z), s = t * Math.sqrt(L2);
      if (d < bde && s > 0.6 && Math.sqrt(L2) - s > 0.6) { bde = d; be = e; bt = t; }
    }
    if (be) {
      const a = this.node(be.a), b = this.node(be.b), px = a.x + (b.x - a.x) * bt, pz = a.z + (b.z - a.z) * bt;
      if (!create) return { kind: 'edge', edge: be, x: px, z: pz };
      return { node: this.splitEdge(be, px, pz), kind: 'edge', edge: be };
    }
    if (!create) return { kind: 'free', x, z };
    return { node: this.newNode(x, z), kind: 'free' };
  }
  // добавить отрезок; возвращает отчёт о стыках
  addSegment(x0, z0, x1, z1, style, startNode = null) {
    const rep = { newEdges: [], touched: [], cross: 0, closed: false };
    const A = startNode ? this.node(startNode) : this.snap(x0, z0).node;
    const sb = this.snap(x1, z1); const B = sb.node;
    if (!A || !B || A === B) return rep;
    const ax = A.x, az = A.z, bx = B.x, bz = B.z, L = Math.hypot(bx - ax, bz - az);
    if (L < 1.0) return rep;
    // пересечения с чужими рёбрами и узлы, лежащие на отрезке
    const cuts = [];
    for (const e of this.edges.slice()) {
      if (e.a === A.id || e.a === B.id || e.b === A.id || e.b === B.id) continue;
      const a = this.node(e.a), b = this.node(e.b);
      const rx = bx - ax, rz = bz - az, sx = b.x - a.x, sz = b.z - a.z, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-6) continue;
      const t = ((a.x - ax) * sz - (a.z - az) * sx) / den, u = ((a.x - ax) * rz - (a.z - az) * rx) / den;
      if (t > 0.03 && t < 0.97 && u > 0.02 && u < 0.98) cuts.push({ t, e, u });
    }
    cuts.sort((p, q) => p.t - q.t);
    let prev = A;
    for (const c of cuts) {
      const x = ax + (bx - ax) * c.t, z = az + (bz - az) * c.t;
      const near = this.nodes.find((n) => Math.hypot(n.x - x, n.z - z) < 0.6);
      const n = near || this.splitEdge(c.e, x, z); if (!near) n.s = 0;
      const ne = this.newEdge(prev.id, n.id, style); if (ne) rep.newEdges.push(ne.id);
      rep.touched.push(n.id); rep.cross++; prev = n;
    }
    const last = this.newEdge(prev.id, B.id, style); if (last) rep.newEdges.push(last.id);
    rep.touched.push(A.id, B.id);
    // замыкание цикла: конец привязан к существующему узлу, у которого уже есть путь до начала
    if (sb.kind === 'node' && this.connectedWithout(A.id, B.id, rep.newEdges)) rep.closed = true;
    return rep;
  }
  connectedWithout(a, b, skip) {
    const seen = new Set([a]), st = [a];
    while (st.length) { const c = st.pop(); for (const e of this.edges) { if (skip.includes(e.id)) continue; const o = e.a === c ? e.b : e.b === c ? e.a : null; if (o && !seen.has(o)) { seen.add(o); st.push(o); } } }
    return seen.has(b);
  }
  // направления рёбер от узла (углы в радианах)
  dirs(id) {
    const n = this.node(id), out = [];
    for (const e of this.edgesOf(id)) { const o = this.node(e.a === id ? e.b : e.a); out.push({ ang: Math.atan2(o.z - n.z, o.x - n.x), e }); }
    return out.sort((p, q) => p.ang - q.ang);
  }
  // тип стыка узла
  junction(id) {
    const d = this.dirs(id), k = d.length;
    if (k <= 1) return { type: 'end', deg: k };
    if (k === 2) { let da = Math.abs(d[0].ang - d[1].ang); if (da > Math.PI) da = 2 * Math.PI - da; const dev = Math.PI - da; return { type: dev < 0.14 ? 'line' : 'corner', deg: 2, dev: Math.round(dev * 180 / Math.PI) }; }
    let col_ = false;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { let da = Math.abs(d[i].ang - d[j].ang); if (da > Math.PI) da = 2 * Math.PI - da; if (da > Math.PI * 0.89) col_ = true; }
    return { type: k >= 4 ? 'X' : col_ ? 'T' : 'Y', deg: k };
  }
  addItem(type, x, z, ang) { const it = { id: this.nid++, type, x, z, ang, a: 0 }; this.items.push(it); return it; }
}

// ---------------------------------------------------------------- стили
export const STYLES = {
  most: { name: 'Мост на ряжах', w: 2.0, kind: 'bridge' },
  gorb: { name: 'Горбатый мост', w: 2.0, kind: 'bridge', hump: 0.9 },
  mostki: { name: 'Мостки', w: 1.2, kind: 'mostki' },
  pal: { name: 'Частокол', w: 0.3, kind: 'pal' },
  road: { name: 'Дорога', w: 2.4, kind: 'road' },
};

const nearWater = (x, z) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (heightAt(x + Math.cos(a) * 3.2, z + Math.sin(a) * 3.2) < WATER_Y + 0.02) return true; } return heightAt(x, z) < WATER_Y + 0.3; };
export const nodeDeckY = (x, z) => { const gy = heightAt(x, z) + 0.14; return nearWater(x, z) ? Math.max(gy, 0.4) : gy; };
const bridgeKind = (s) => STYLES[s].kind === 'bridge' || STYLES[s].kind === 'mostki';

// ---------------------------------------------------------------- построители
function nodeRadius(data, n, J) {
  const es = data.edgesOf(n.id).filter((e) => bridgeKind(e.style) || STYLES[e.style].kind === 'road');
  let w = 0; for (const e of data.edgesOf(n.id)) w = Math.max(w, STYLES[e.style].w);
  if (!es.length) return { R: 0, w };
  if (J.deg >= 3) return { R: Math.max(1.5, w * 0.78) + (J.deg - 3) * 0.25, w };
  if (J.type === 'corner') return { R: w * 0.5, w };
  return { R: 0, w };
}

function deckSamples(data, e, ra, rb) {
  const A = data.node(e.a), B = data.node(e.b), L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
  const st = STYLES[e.style], yA = nodeDeckY(A.x, A.z), yB = nodeDeckY(B.x, B.z);
  const yAt = (s) => { const x = A.x + ux * s, z = A.z + uz * s; let y = lerp(yA, yB, s / L); if (st.hump) y += st.hump * Math.sin(Math.PI * s / L); return Math.max(y, heightAt(x, z) + 0.1); };
  return { A, B, L, ux, uz, yAt, st };
}

function bridgeEdge(g, data, e, ra, rb, J) {
  const { A, B, L, ux, uz, yAt, st } = deckSamples(data, e, ra, rb);
  const w = st.w, nx = -uz, nz = ux, rail = st.kind === 'bridge';
  const s0 = ra, s1 = L - rb, gl = e.g; if (s1 - s0 < 0.05) return;
  const sEnd = s0 + (s1 - s0) * gl;
  const Pt = (s, off, dy = 0) => P(A.x + ux * s + nx * off, yAt(s) + dy, A.z + uz * s + nz * off);
  // настил
  const n = Math.max(1, Math.round((sEnd - s0) / 0.28));
  for (let k = 0; k < n; k++) {
    const sa = s0 + (sEnd - s0) * k / n, sb = s0 + (sEnd - s0) * (k + 1) / n - 0.03;
    const mx = A.x + ux * sa, mz = A.z + uz * sa, c = hc(mx, mz, WOOD), ct = hc(mx + 1, mz, WOOD_T);
    g.beam(Pt(sa, 0, -0.04), Pt(sb, 0, -0.04), w, 0.08, c, ct);
  }
  // продольные балки
  for (const sd of [-1, 1]) { const off = sd * (w / 2 - 0.12); g.beam(Pt(s0, off, -0.2), Pt(sEnd, off, -0.2), 0.16, 0.22, 0x4c3a24, 0x5a4630); }
  const m = Math.max(1, Math.round((sEnd - s0) / 1.2));
  if (rail) {
    for (let k = 0; k <= m; k++) {
      const s = s0 + (sEnd - s0) * k / m; if (gl < 1 && k === m) continue;
      for (const sd of [-1, 1]) { const q = Pt(s, sd * (w / 2 - 0.07)); g.prism([q[0], q[1] - 0.12, q[2]], [q[0], q[1] + 1.02, q[2]], 0.06, 0x5a4630, 6, 1, 0x7a6040, true); }
    }
    for (const sd of [-1, 1]) { const off = sd * (w / 2 - 0.07); g.beam(Pt(s0, off, 1.0), Pt(sEnd, off, 1.0), 0.1, 0.09, 0x5a4630, 0x7a6040); g.beam(Pt(s0, off, 0.55), Pt(sEnd, off, 0.55), 0.07, 0.07, 0x4c3a24); }
  }
  // опоры-козлы
  const spacing = rail ? 2.6 : 2.0, sup = Math.max(1, Math.round((s1 - s0) / spacing));
  for (let k = 0; k <= sup; k++) {
    const s = s0 + (s1 - s0) * k / sup; if (s > sEnd + 0.01) continue;
    const q = Pt(s, 0), gy0 = heightAt(q[0], q[2]), dd = q[1] - gy0;
    if (dd < 0.45) continue;
    const offs = rail ? [-1, 1] : [0];
    for (const sd of offs) {
      const o = Pt(s, sd * (w / 2 - 0.22)); const gy = heightAt(o[0], o[2]);
      g.prism([o[0], Math.min(gy, o[1]) - 0.3, o[2]], [o[0], o[1] - 0.12, o[2]], rail ? 0.13 : 0.1, 0x3a2e1e, 7, 1, 0x4c3a24, false);
    }
    if (rail) {
      g.beam(Pt(s, -(w / 2 - 0.22), -0.38), Pt(s, w / 2 - 0.22, -0.38), 0.1, 0.12, 0x4c3a24);
      if (dd > 1.0) { const a = Pt(s, -(w / 2 - 0.22), -0.3), b = P(q[0] + nx * (w / 2 - 0.22), Math.min(heightAt(q[0] + nx * (w / 2 - 0.22), q[2] + nz * (w / 2 - 0.22)), q[1]) + 0.2, q[2] + nz * (w / 2 - 0.22)); g.beam(a, b, 0.08, 0.08, 0x3a2e1e); }
    }
  }
}

function bridgeNode(g, data, n, J, pop) {
  const es = data.edgesOf(n.id).filter((e) => bridgeKind(e.style)); if (!es.length) return;
  const { R, w } = nodeRadius(data, n, J); const y = nodeDeckY(n.x, n.z);
  const dirs = data.dirs(n.id).filter((d) => bridgeKind(d.e.style));
  const rail = es.some((e) => STYLES[e.style].kind === 'bridge'), s0 = g.count;
  if (J.deg === 1) {
    const d = dirs[0]; const ux = Math.cos(d.ang), uz = Math.sin(d.ang), nx = -uz, nz = ux;
    for (const sd of [-1, 1]) { const q = [n.x + nx * sd * (w / 2 - 0.07), y, n.z + nz * sd * (w / 2 - 0.07)]; g.prism([q[0], y - 0.3, q[2]], [q[0], y + (rail ? 1.35 : 0.7), q[2]], rail ? 0.1 : 0.08, 0x4c3a24, 7, 1, 0x6a5233, true); if (rail) g.blob(q[0], y + 1.4, q[2], 0.1, 0x6a5233, { sy: 0.8, detail: 0, noise: 0.05, seed: 3, top: 0x8a7048 }); }
    return;
  }
  if (J.deg === 2 && J.type === 'corner') {
    for (let k = 0; k < 12; k++) { const a0 = k / 12 * 6.283, a1 = (k + 1) / 12 * 6.283; const c = hc(n.x + k, n.z, WOOD); g.tri(P(n.x, y, n.z), P(n.x + Math.cos(a0) * R * 1.05, y, n.z + Math.sin(a0) * R * 1.05), P(n.x + Math.cos(a1) * R * 1.05, y, n.z + Math.sin(a1) * R * 1.05), c); }
    if (rail) { const mid = (dirs[0].ang + dirs[1].ang) / 2; let bis = mid; const dd = Math.abs(dirs[0].ang - dirs[1].ang); if (dd < Math.PI) bis += Math.PI; // наружу — противоположная сторона от середины
      const q = [n.x + Math.cos(bis) * (w / 2 - 0.07), y, n.z + Math.sin(bis) * (w / 2 - 0.07)]; g.prism([q[0], y - 0.12, q[2]], [q[0], y + 1.25, q[2]], 0.09, 0x5a4630, 7, 1, 0x7a6040, true); }
    return;
  }
  if (J.deg < 3) return;
  const seg = 16;
  for (let k = 0; k < seg; k++) { const a0 = k / seg * 6.283, a1 = (k + 1) / seg * 6.283; const c = hc(n.x + k * 0.3, n.z - k * 0.2, WOOD), ct = hc(n.x - k, n.z, WOOD_T);
    g.tri(P(n.x, y, n.z), P(n.x + Math.cos(a0) * R, y, n.z + Math.sin(a0) * R), P(n.x + Math.cos(a1) * R, y, n.z + Math.sin(a1) * R), ct, c, c);
    g.quad(P(n.x + Math.cos(a0) * R, y, n.z + Math.sin(a0) * R), P(n.x + Math.cos(a1) * R, y, n.z + Math.sin(a1) * R), P(n.x + Math.cos(a1) * (R - 0.02), y - 0.3, n.z + Math.sin(a1) * (R - 0.02)), P(n.x + Math.cos(a0) * (R - 0.02), y - 0.3, n.z + Math.sin(a0) * (R - 0.02)), 0x4c3a24); }
  // перила по кругу, открыты у рукавов
  if (rail) {
    const half = (d) => Math.asin(Math.min(0.95, (STYLES[d.e.style].w / 2) / R)) + 0.04, posts = 24, kept = [];
    for (let k = 0; k < posts; k++) {
      const a = k / posts * 6.283; let open = false;
      for (const d of dirs) { let da = Math.abs(a - ((d.ang % 6.283) + 6.283) % 6.283); if (da > Math.PI) da = 6.283 - da; if (da < half(d)) open = true; }
      kept.push(!open);
      if (!open) { const q = [n.x + Math.cos(a) * (R - 0.08), y, n.z + Math.sin(a) * (R - 0.08)]; g.prism([q[0], y - 0.12, q[2]], [q[0], y + 1.02, q[2]], 0.06, 0x5a4630, 6, 1, 0x7a6040, true); }
    }
    for (let k = 0; k < posts; k++) {
      const k2 = (k + 1) % posts; if (!kept[k] || !kept[k2]) continue; const a = k / posts * 6.283, b = k2 / posts * 6.283;
      for (const [dy, th, c] of [[1.0, 0.09, 0x6a5233], [0.55, 0.07, 0x4c3a24]]) g.beam([n.x + Math.cos(a) * (R - 0.08), y + dy, n.z + Math.sin(a) * (R - 0.08)], [n.x + Math.cos(b) * (R - 0.08), y + dy, n.z + Math.sin(b) * (R - 0.08)], th, th, c);
    }
    // столб с фонарём в центре
    g.prism([n.x, y, n.z], [n.x, y + 2.5, n.z], 0.07, 0x4c3a24, 6, 1, 0x6a5233, false);
    g.blob(n.x, y + 2.6, n.z, 0.17, 0xffb060, { sy: 1.1, detail: 0, noise: 0.03, seed: 5, top: 0xffe0a0 });
  }
  // сваи под площадкой
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2, q = [n.x + Math.cos(a) * R * 0.72, 0, n.z + Math.sin(a) * R * 0.72]; const gy = heightAt(q[0], q[2]);
    if (y - gy < 0.45) continue;
    g.prism([q[0], gy - 0.3, q[2]], [q[0], y - 0.12, q[2]], 0.17, 0x3a2e1e, 7, 1, 0x4c3a24, false);
  }
  if (pop < 1) { const e = pop * pop * (3 - 2 * pop), sc = 0.55 + 0.45 * e; const m4 = new THREE.Matrix4().makeTranslation(n.x, y, n.z).multiply(new THREE.Matrix4().makeScale(sc, 0.4 + 0.6 * e, sc)).multiply(new THREE.Matrix4().makeTranslation(-n.x, -y, -n.z)); g.transformFrom(s0, m4); }
}

// --- частокол
function palSegments(data, e, towerR) {
  const A = data.node(e.a), B = data.node(e.b), L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L;
  const win = []; // запрещённые окна [s0,s1]
  for (const it of data.items) {
    if (it.type === 'gate' || it.type === 'kpp') { const dx = it.x - A.x, dz = it.z - A.z, s = dx * ux + dz * uz, off = Math.abs(-dx * uz + dz * ux); if (off < 0.5 && s > 0 && s < L) win.push([s - 1.6, s + 1.6]); }
    if (it.type === 'tower' || it.type === 'kpp') for (const tt of it.type === 'kpp' ? [-1, 1] : [0]) { const tx = it.type === 'kpp' ? it.x + Math.cos(it.ang) * 2.9 * tt : it.x, tz = it.type === 'kpp' ? it.z + Math.sin(it.ang) * 2.9 * tt : it.z; const dx = tx - A.x, dz = tz - A.z, s = dx * ux + dz * uz, off = Math.abs(-dx * uz + dz * ux); if (off < 1.0 && s > -1.5 && s < L + 1.5) win.push([s - towerR, s + towerR]); }
  }
  return { A, B, L, ux, uz, win };
}
const inWin = (s, win) => win.some((w) => s > w[0] && s < w[1]);

function palEdge(g, data, e, J0, J1) {
  const { A, B, L, ux, uz, win } = palSegments(data, e, 1.35);
  const gl = e.g, sEnd = L * gl;
  const startCut = J0.deg >= 2 || J0.deg === 1 ? 0.22 : 0.0, endCut = J1.deg >= 1 ? 0.22 : 0.0;
  const n = Math.max(1, Math.round(L / 0.27));
  for (let k = 0; k <= n; k++) {
    const s = L * k / n; if (s < startCut || s > L - endCut || s > sEnd || inWin(s, win)) continue;
    const x = A.x + ux * s, z = A.z + uz * s, gy = heightAt(x, z), hh = hash2(Math.round(x * 8), Math.round(z * 8));
    const top = gy + 2.2 + hh * 0.3, c = hc(x, z, WOOD), ct = hc(x, z, WOOD_T);
    g.prism([x, gy - 0.35, z], [x, top - 0.3, z], 0.118, c, 6, 1, c, false);
    g.prism([x, top - 0.3, z], [x, top, z], 0.118, c, 6, 0.1, ct, false);
  }
  for (const rh of [0.7, 1.55]) {
    // перекладины кусками между окнами
    const pts = [0]; for (const w of win.slice().sort((a, b) => a[0] - b[0])) { pts.push(Math.max(0, w[0]), Math.min(L, w[1])); } pts.push(L);
    for (let i = 0; i < pts.length; i += 2) { const a = Math.max(pts[i], 0), b = Math.min(pts[i + 1], sEnd); if (b - a < 0.15) continue; const m = Math.max(1, Math.round((b - a) / 0.5)); for (let k = 0; k < m; k++) { const s0 = a + (b - a) * k / m, s1 = a + (b - a) * (k + 1) / m; g.beam([A.x + ux * s0, heightAt(A.x + ux * s0, A.z + uz * s0) + rh, A.z + uz * s0], [A.x + ux * s1, heightAt(A.x + ux * s1, A.z + uz * s1) + rh, A.z + uz * s1], 0.1, 0.13, 0x5a4a30, 0x6f5c3c); } }
  }
}
function palNode(g, data, n, J, pop) {
  const es = data.edgesOf(n.id).filter((e) => STYLES[e.style].kind === 'pal'); if (!es.length) return;
  if (es.some((e) => e.g < 1)) return;
  const tower = data.items.find((it) => (it.type === 'tower') && Math.hypot(it.x - n.x, it.z - n.z) < 0.4);
  if (tower) return;
  const gy = heightAt(n.x, n.z); const big = J.deg >= 3 || J.type === 'corner';
  const r = big ? 0.2 : 0.15, h = big ? 2.75 : 2.6, e = pop * pop * (3 - 2 * pop);
  g.prism([n.x, gy - 0.35, n.z], [n.x, gy + (h) * (0.4 + 0.6 * e), n.z], r, 0x50402a, 7, 1, 0x6a5233, true);
  g.blob(n.x, gy + h * (0.4 + 0.6 * e) + 0.04, n.z, r * 1.1, 0x6a5233, { sy: 0.8, detail: 0, noise: 0.05, seed: 2, top: 0x8a7048 });
}
function gateGeom(g, it) {
  const e = it.a * it.a * (3 - 2 * it.a), ux = Math.cos(it.ang), uz = Math.sin(it.ang), nx = -uz, nz = ux, lift = -(1 - e) * 3.5, s0 = g.count;
  const pA = [it.x - ux * 1.6, it.z - uz * 1.6], pB = [it.x + ux * 1.6, it.z + uz * 1.6];
  for (const p of [pA, pB]) { const gy = heightAt(p[0], p[1]); g.prism([p[0], gy - 0.4, p[1]], [p[0], gy + 3.15, p[1]], 0.22, 0x4c3a24, 8, 1, 0x6a5233, true); g.blob(p[0], gy + 3.25, p[1], 0.26, 0x5a4630, { sy: 0.7, detail: 0, noise: 0.05, seed: 3, top: 0x8a7048 }); }
  const gA = heightAt(pA[0], pA[1]), gB = heightAt(pB[0], pB[1]);
  g.beam([pA[0], gA + 2.75, pA[1]], [pB[0], gB + 2.75, pB[1]], 0.3, 0.26, 0x4c3a24, 0x6a5233);
  g.beam([pA[0], gA + 2.3, pA[1]], [pB[0], gB + 2.3, pB[1]], 0.14, 0.12, 0x5a4a30, 0x6f5c3c);
  const ang = 1.15;
  for (const [h, sgn, gy] of [[pA, 1, gA], [pB, -1, gB]]) {
    const ld = [ux * Math.cos(ang) * sgn + nx * Math.sin(ang), uz * Math.cos(ang) * sgn + nz * Math.sin(ang)], w = 1.4;
    const c = [h[0] + ld[0] * (w / 2 + 0.2), h[1] + ld[1] * (w / 2 + 0.2)], ry = Math.atan2(-ld[1], ld[0]);
    g.box(c[0], gy + 1.2, c[1], w, 2.1, 0.07, 0x5a4630, ry, 0x6f5c3c);
    for (const yy of [0.4, 1.2, 2.05]) g.box(c[0], gy + yy, c[1], w, 0.09, 0.1, 0x3a3228, ry);
  }
  if (lift) g.transformFrom(s0, new THREE.Matrix4().makeTranslation(0, lift, 0));
}
function towerGeom(g, x, z, a, ang) {
  const e = a * a * (3 - 2 * a), s0 = g.count, gy = heightAt(x, z), H = 3.1;
  const legs = [[-0.85, -0.85], [0.85, -0.85], [0.85, 0.85], [-0.85, 0.85]];
  for (const [lx, lz] of legs) g.prism([x + lx, gy - 0.4, z + lz], [x + lx, gy + H + 1.1, z + lz], 0.17, 0x4c3a24, 7, 1, 0x6a5233, true);
  for (let i = 0; i < 4; i++) { const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4]; for (const yy of [0.9, 2.0]) g.beam([x + ax, gy + yy, z + az], [x + bx, gy + yy, z + bz], 0.1, 0.12, 0x5a4630); g.beam([x + ax, gy + 0.5, z + az], [x + bx, gy + 2.3, z + bz], 0.07, 0.08, 0x3a2e1e); }
  g.box(x, gy + H, z, 2.3, 0.14, 2.3, 0x6a5233, 0, 0x8a7048);
  for (let i = 0; i < 4; i++) { const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4]; for (const yy of [H + 0.55, H + 1.0]) g.beam([x + ax, gy + yy, z + az], [x + bx, gy + yy, z + bz], 0.08, 0.08, 0x5a4630, 0x7a6040); }
  g.cone([x, gy + H + 1.15, z], 1.5, 1.85, 0x33342a, 4, 0x403c2e); g.prism([x, gy + H + 2.5, z], [x, gy + H + 3.1, z], 0.04, 0x4a3822, 4, 1, 0x4a3822, false);
  const lx = Math.cos(ang), lz = Math.sin(ang);
  for (const sx of [-0.22, 0.22]) g.prism([x + sx, gy, z + 1.05], [x + sx, gy + H + 0.1, z + 1.05], 0.035, 0x5a4630, 5, 1, 0x7a6040, false);
  for (let k = 0; k < 7; k++) g.beam([x - 0.22, gy + 0.3 + k * 0.4, z + 1.05], [x + 0.22, gy + 0.3 + k * 0.4, z + 1.05], 0.04, 0.05, 0x5a4630);
  if (e < 1) g.transformFrom(s0, new THREE.Matrix4().makeTranslation(0, -(1 - e) * 4.5, 0));
}
function kppWalk(g, it) {
  const ux = Math.cos(it.ang), uz = Math.sin(it.ang), gy = heightAt(it.x, it.z), y = gy + 3.0;
  const a = [it.x - ux * 2.9, it.z - uz * 2.9], b = [it.x + ux * 2.9, it.z + uz * 2.9];
  g.beam([a[0], y + 0.02, a[1]], [b[0], y + 0.02, b[1]], 1.1, 0.12, 0x6a5233, 0x8a7048);
  for (const sd of [-1, 1]) { const o = [-uz * sd * 0.5, ux * sd * 0.5]; g.beam([a[0] + o[0], y + 0.5, a[1] + o[1]], [b[0] + o[0], y + 0.5, b[1] + o[1]], 0.08, 0.08, 0x5a4630, 0x7a6040); for (let k = 0; k <= 8; k++) { const s = k / 8; g.prism([lerp(a[0], b[0], s) + o[0], y, lerp(a[1], b[1], s) + o[1]], [lerp(a[0], b[0], s) + o[0], y + 0.55, lerp(a[1], b[1], s) + o[1]], 0.04, 0x5a4630, 5, 1, 0x7a6040, false); } }
}

// --- дорога (лента по рельефу) и мостки на земле
const RC = col(0xa28660), RE = col(0x8a6f4e), RR = col(0x967a57);
function roadEdge(g, data, e, ra, rb) {
  const A = data.node(e.a), B = data.node(e.b), L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L, nx = -uz, nz = ux, w = STYLES.road.w / 2;
  const s0 = ra, s1 = L - rb, sEnd = s0 + (s1 - s0) * e.g; if (sEnd - s0 < 0.05) return;
  const n = Math.max(1, Math.round((sEnd - s0) / 0.3)); let prev = null;
  for (let k = 0; k <= n; k++) {
    const s = s0 + (sEnd - s0) * k / n, x = A.x + ux * s, z = A.z + uz * s;
    const q = [-w, -w * 0.45, 0, w * 0.45, w].map((o) => { const px = x + nx * o, pz = z + nz * o; return P(px, heightAt(px, pz) + 0.07, pz); });
    if (prev) { const cs = [RE, RR, RC, RR, RE]; for (let i = 0; i < 4; i++) g.quad(prev[i], prev[i + 1], q[i + 1], q[i], cs[i], cs[i + 1], cs[i + 1], cs[i]); }
    prev = q;
  }
}
function roadNode(g, data, n, J, pop) {
  const es = data.edgesOf(n.id).filter((e) => STYLES[e.style].kind === 'road'); if (!es.length) return;
  const R = J.deg >= 3 ? nodeRadius(data, n, J).R + 0.02 : STYLES.road.w / 2, seg = 16, e = pop * pop * (3 - 2 * pop);
  const Y = (x, z) => heightAt(x, z) + 0.075;
  for (let k = 0; k < seg; k++) { const a0 = k / seg * 6.283, a1 = (k + 1) / seg * 6.283, r = R * (0.3 + 0.7 * e); g.tri(P(n.x, Y(n.x, n.z), n.z), P(n.x + Math.cos(a0) * r, Y(n.x + Math.cos(a0) * r, n.z + Math.sin(a0) * r), n.z + Math.sin(a0) * r), P(n.x + Math.cos(a1) * r, Y(n.x + Math.cos(a1) * r, n.z + Math.sin(a1) * r), n.z + Math.sin(a1) * r), RC, RR, RR); }
}

// ---------------------------------------------------------------- модуль
export class GraphMod {
  constructor(host, cfg) {
    this.host = host; this.id = cfg.id; this.name = cfg.name; this.kinds = cfg.kinds; this.site = cfg.site; this.cfg = cfg;
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.data = new GraphData(); this.hist = []; this.cur = null; this.dirty = true;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.group.add(this.mesh);
    this.flat = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); this.flat.frustumCulled = false; this.flat.receiveShadow = true; this.group.add(this.flat);
    this.mark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 28), new THREE.MeshBasicMaterial({ color: 0xe0a64a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })); this.mark.rotation.x = -Math.PI / 2; this.mark.renderOrder = 9; this.mark.visible = false; this.group.add(this.mark);
    this.ghostKey = '';
  }
  enter() { this.group.visible = true; }
  leave() { this.group.visible = false; this.cur = null; this.mark.visible = false; this.host.world.decks.length = 0; }
  rel(x, z) { return [this.site.x + x, this.site.z + z]; }
  occupies(x, z) {
    const d = this.data; for (const e of d.edges) { const a = d.node(e.a), b = d.node(e.b), dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1); if (Math.hypot(a.x + dx * t - x, a.z + dz * t - z) < STYLES[e.style].w / 2 + 0.7) return true; }
    for (const it of d.items) if (Math.hypot(it.x - x, it.z - z) < 1.8) return true;
    return false;
  }
  snapshot() { this.hist.push(this.data.json()); if (this.hist.length > 40) this.hist.shift(); }
  clear() { this.data = new GraphData(); this.hist.length = 0; this.cur = null; this.mark.visible = false; this.sync(); }
  undo() { const j = this.hist.pop(); if (!j) return 'Нечего отменять'; this.data = new GraphData(j); for (const e of this.data.edges) e.g = 1; for (const n of this.data.nodes) n.s = 1; for (const i of this.data.items) i.a = 1; this.cur = null; this.sync(); return null; }
  cancel() { this.cur = null; this.mark.visible = false; this.ghostKey = ''; }
  sync() { this.dirty = true; this.host.changed(); }
  // ---- действия
  isSeg(kind) { return !!STYLES[kind] && kind !== 'gate'; }
  click(kind, p) {
    const d = this.data;
    if (Math.abs(p.x - this.site.x) > 18 || Math.abs(p.z - this.site.z) > 16) return 'за площадкой';
    if (this.isSeg(kind)) {
      const err = this.checkPoint(kind, p.x, p.z); if (err) return err;
      if (!this.cur) { this.snapshot(); const sn = d.snap(p.x, p.z); this.cur = sn.node.id; this.markAt(sn.node.x, sn.node.z); this.sync(); return null; }
      const A = d.node(this.cur); if (!A) { this.cur = null; return null; }
      const err2 = this.checkSeg(kind, A.x, A.z, p.x, p.z); if (err2) return err2;
      this.snapshot();
      const rep = d.addSegment(A.x, A.z, p.x, p.z, kind, this.cur);
      if (!rep.newEdges.length) { this.hist.pop(); return 'слишком коротко'; }
      const last = d.edges.find((e) => e.id === rep.newEdges[rep.newEdges.length - 1]); this.cur = last ? last.b : null;
      this.host.toast(this.textFor(d, rep, kind) || 'Отрезок добавлен'); this.sync(); this.host.burst(p.x, p.z);
      return null;
    }
    // предметы: ворота, башня, КПП
    const hit = this.itemTarget(kind, p.x, p.z); if (hit.err) return hit.err;
    this.snapshot();
    if (kind === 'tower') { const sn = d.snap(p.x, p.z, 1.1, 0.9); const x = sn.node ? sn.node.x : p.x, z = sn.node ? sn.node.z : p.z; d.addItem('tower', x, z, 0); }
    else if (kind === 'gate') d.addItem('gate', hit.x, hit.z, hit.ang);
    else if (kind === 'kpp') d.addItem('kpp', hit.x, hit.z, hit.ang);
    this.host.toast({ tower: 'Башня поставлена', gate: 'Ворота встали в линию частокола', kpp: 'КПП собран: ворота, две башни, переход' }[kind]); this.sync(); this.host.burst(hit.x ?? p.x, hit.z ?? p.z);
    return null;
  }
  checkPoint(kind, x, z) {
    const st = STYLES[kind];
    if (st.kind === 'road' || st.kind === 'pal') { if (heightAt(x, z) < WATER_Y + 0.05) return st.kind === 'pal' ? 'колья не вкапывают в воду' : 'дорога не идёт по воде: нужен мост'; }
    if (st.kind === 'mostki' && this.cfg.id === 'roads' && heightAt(x, z) < WATER_Y - 0.35) return 'мостки только на мелководье';
    return null;
  }
  checkSeg(kind, x0, z0, x1, z1) {
    const st = STYLES[kind], L = Math.hypot(x1 - x0, z1 - z0);
    if (L > 26) return 'слишком длинно (до 26 м)';
    if (st.kind === 'bridge' || st.kind === 'mostki') {
      const wet = (x, z) => heightAt(x, z) < WATER_Y; const n = Math.ceil(L / 0.5); let anyWet = false;
      for (let k = 0; k <= n; k++) if (wet(lerp(x0, x1, k / n), lerp(z0, z1, k / n))) anyWet = true;
      if (this.cfg.id === 'bridges' && st.kind === 'bridge' && !anyWet && L > 6) { /* сухой мост допустим коротким */ }
    }
    if (st.kind === 'road' || st.kind === 'pal') { const n = Math.ceil(L / 0.5); for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n); if (heightAt(x, z) < WATER_Y + 0.02) return st.kind === 'pal' ? 'линия идёт по воде: колья не вкапывают' : 'дорога пересекает воду: нужен мост'; } }
    return null;
  }
  // ворота: ближайшее ребро частокола; КПП — тоже
  itemTarget(kind, x, z) {
    const d = this.data;
    if (kind === 'tower') return {};
    let best = null, bd = 1.2;
    for (const e of d.edges) { if (STYLES[e.style].kind !== 'pal') continue; const a = d.node(e.a), b = d.node(e.b), dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (L * L), 0, 1), px = a.x + dx * t, pz = a.z + dz * t, dd = Math.hypot(px - x, pz - z), s = t * L;
      const need = kind === 'kpp' ? 4.4 : 2.2; if (dd < bd && s > need && L - s > need) { bd = dd; best = { x: px, z: pz, ang: Math.atan2(dz, dx), e, s, L }; } }
    if (!best) return { err: kind === 'gate' ? 'ворота ставят на прямую часть частокола, не ближе 2,2 м к углу' : 'КПП ставят на прямую часть линии не короче 9 м' };
    if (d.items.some((it) => (it.type === 'gate' || it.type === 'kpp') && Math.hypot(it.x - best.x, it.z - best.z) < 4)) return { err: 'здесь уже есть ворота' };
    return best;
  }
  // ---- тексты
  textFor(d, rep, kind) {
    const lx = this.cfg.texts, out = [], seen = new Set();
    for (const id of rep.touched) {
      if (seen.has(id) || !d.node(id)) continue; seen.add(id); const J = d.junction(id);
      const styles = new Set(d.edgesOf(id).map((e) => STYLES[e.style].kind));
      let t = null;
      if (styles.size > 1 && lx.mixed && (J.type !== 'end')) t = lx.mixed(styles);
      else if (styles.size === 1 && styles.has('mostki') && lx.mostki && J.type !== 'end') t = lx.mostki;
      else if (J.type === 'line') t = lx.line; else if (J.type === 'corner') t = lx.corner(J.dev); else if (J.type === 'T') t = lx.T; else if (J.type === 'Y') t = lx.Y; else if (J.type === 'X') t = lx.X;
      if (t) out.push(t);
    }
    if (rep.closed && lx.ring) out.unshift(lx.ring);
    return out.length ? (out.length > 1 ? [...new Set(out)].join('; ') : out[0]) : null;
  }
  ruleFor(d, rep, kind) {
    const lx = this.cfg.rules; let r = null;
    for (const id of rep.touched) { if (!d.node(id)) continue; const J = d.junction(id); const styles = new Set(d.edgesOf(id).map((e) => STYLES[e.style].kind)); const pick = (styles.size > 1 && lx.mixed) ? lx.mixed : (styles.size === 1 && styles.has('mostki') && lx.mostkiR) ? lx.mostkiR : lx[J.type]; if (pick && J.type !== 'end') r = pick; }
    if (rep.closed && lx.ring) r = lx.ring;
    if (STYLES[kind] && STYLES[kind].hump && lx.hump) r = lx.hump;
    return r;
  }
  hover(kind, p) {
    const d0 = this.data;
    if (this.isSeg(kind)) {
      const err = this.checkPoint(kind, p.x, p.z);
      const sn = d0.snap(p.x, p.z, 1.1, 0.9, false);
      const px = sn.node ? sn.node.x : sn.x ?? p.x, pz = sn.node ? sn.node.z : sn.z ?? p.z;
      this.markAt(px, pz, sn.kind !== 'free');
      let text = null, rule = null, geo = null, ok = !err, e2 = err;
      if (!this.cur) {
        if (sn.kind === 'node') text = 'начало на узле: линия продолжится от него'; else if (sn.kind === 'edge') text = 'начало на боку линии: она разделится на две части';
        return { ok, err: e2, text, geo: null, parts: [], rule: null };
      }
      const A = d0.node(this.cur); if (!A) { this.cur = null; return null; }
      const er2 = this.checkSeg(kind, A.x, A.z, px, pz); if (er2) { ok = false; e2 = er2; }
      const key = [this.cur, px.toFixed(1), pz.toFixed(1), kind, d0.edges.length, d0.items.length].join('|');
      if (key !== this.ghostKey) {
        this.ghostKey = key;
        const T = new GraphData(d0.json()); const rep = T.addSegment(A.x, A.z, px, pz, kind, this.cur);
        for (const e of T.edges) e.g = 1; for (const n of T.nodes) n.s = 1; for (const it of T.items) it.a = 1;
        const want = new Set(rep.newEdges); for (const id of rep.touched) for (const e of T.edgesOf(id)) want.add(e.id);
        this.gcache = { geo: rep.newEdges.length ? buildGraph(T, { edges: want, nodes: new Set(rep.touched), items: false, ghost: true }).build() : null, text: rep.newEdges.length ? this.textFor(T, rep, kind) : null, rule: this.ruleFor(T, rep, kind), parts: rep.touched.filter((id) => T.node(id) && d0.node(id) && T.deg(id) > 1).map((id) => [T.node(id).x, T.node(id).z]) };
      }
      const c = this.gcache; return { ok, err: e2, text: c.text, geo: c.geo, parts: c.parts, rule: c.rule };
    }
    const hit = this.itemTarget(kind, p.x, p.z);
    if (hit.err) return { ok: false, err: hit.err, geo: null, parts: [] };
    const T = new GraphData(d0.json()); for (const e of T.edges) e.g = 1;
    const g = new G(7); g.jit = 0;
    if (kind === 'gate') gateGeom(g, { x: hit.x, z: hit.z, ang: hit.ang, a: 1 });
    else if (kind === 'kpp') { gateGeom(g, { x: hit.x, z: hit.z, ang: hit.ang, a: 1 }); for (const s of [-1, 1]) towerGeom(g, hit.x + Math.cos(hit.ang) * 2.9 * s, hit.z + Math.sin(hit.ang) * 2.9 * s, 1, hit.ang); kppWalk(g, { x: hit.x, z: hit.z, ang: hit.ang }); }
    else { const sn = d0.snap(p.x, p.z, 1.1, 0.9, false); const x = sn.node ? sn.node.x : sn.x ?? p.x, z = sn.node ? sn.node.z : sn.z ?? p.z; towerGeom(g, x, z, 1, 0); const nearLine = sn.kind !== 'free'; return { ok: true, text: nearLine ? 'будет соединено: башня встанет на ' + (sn.kind === 'node' ? 'угол/конец линии, колья вокруг обрезаются' : 'линию, она разделится на две части') : null, geo: g.build(), parts: [], rule: nearLine ? 'fe_tower' : null }; }
    return { ok: true, text: kind === 'gate' ? 'будет соединено: ворота в линии частокола, колья в проёме 3,2 м убираются' : 'будет соединено: КПП: ворота, две башни и переход на частоколе', geo: g.build(), parts: [], rule: kind === 'gate' ? 'fe_gate' : 'fe_kpp' };
  }
  markAt(x, z, hot = true) { this.mark.visible = true; this.mark.position.set(x, heightAt(x, z) + 0.2, z); this.mark.material.color.set(hot ? 0xe0a64a : 0x66e0c8); }
  step(s) {
    const d = this.data;
    if (s.seg) { const [x0, z0] = this.rel(s.seg[0], s.seg[1]), [x1, z1] = this.rel(s.seg[2], s.seg[3]); const rep = d.addSegment(x0, z0, x1, z1, s.seg[4] || this.cfg.defaultStyle); if (s.seg[5]) for (const id of rep.newEdges) { const e = d.edges.find((q) => q.id === id); if (e) e.g = 0; } this.sync(); return rep; }
    if (s.absSeg) { const rep = d.addSegment(s.absSeg[0], s.absSeg[1], s.absSeg[2], s.absSeg[3], s.absSeg[4]); this.sync(); return rep; }
    if (s.gate) { const [x, z] = this.rel(s.gate[0], s.gate[1]); const h = this.itemTarget('gate', x, z); if (!h.err) d.addItem('gate', h.x, h.z, h.ang); this.sync(); }
    if (s.kpp) { const [x, z] = this.rel(s.kpp[0], s.kpp[1]); const h = this.itemTarget('kpp', x, z); if (!h.err) d.addItem('kpp', h.x, h.z, h.ang); this.sync(); }
    if (s.tower) { const [x, z] = this.rel(s.tower[0], s.tower[1]); const sn = d.snap(x, z, 1.1, 0.9); d.addItem('tower', sn.node.x, sn.node.z, 0); this.sync(); }
  }
  update(dt) {
    const d = this.data; let anim = this.dirty;
    for (const e of d.edges) if (e.g < 1) { e.g = Math.min(1, e.g + dt * Math.max(0.45, 4.5 / Math.max(2, d.len(e)))); anim = true; }
    for (const n of d.nodes) { const es = d.edgesOf(n.id); const full = es.length && es.every((e) => e.g >= 1); if (n.s < 1 && (full || !es.length)) { n.s = Math.min(1, n.s + dt * 2.2); anim = true; } }
    for (const it of d.items) if (it.a < 1) { it.a = Math.min(1, it.a + dt * 1.6); anim = true; }
    if (!anim) return; this.dirty = false;
    const g = buildGraph(d, { layer: 'solid' }); const old = this.mesh.geometry; this.mesh.geometry = g.count ? g.build() : new THREE.BufferGeometry(); old.dispose();
    const g2 = buildGraph(d, { layer: 'flat' }); const o2 = this.flat.geometry; this.flat.geometry = g2.count ? g2.build() : new THREE.BufferGeometry(); o2.dispose();
    // настилы для героя
    const dk = this.host.world.decks; dk.length = 0;
    if (this.cfg.decks) for (const e of d.edges) { const st = STYLES[e.style]; if (st.kind === 'road' || st.kind === 'pal' || e.g < 1) continue; const A = d.node(e.a), B = d.node(e.b); dk.push({ ax: A.x, az: A.z, bx: B.x, bz: B.z, ya: nodeDeckY(A.x, A.z), yb: nodeDeckY(B.x, B.z), hw: st.w / 2 }); }
  }
}

export function buildGraph(d, o) {
  const g = new G(31); g.jit = 0.05;
  const J = new Map(); for (const n of d.nodes) J.set(n.id, d.junction(n.id));
  for (const e of d.edges) {
    if (o.edges && !o.edges.has(e.id)) continue;
    const st = STYLES[e.style], A = d.node(e.a), B = d.node(e.b), ja = J.get(A.id), jb = J.get(B.id);
    if (o.layer && (st.kind === 'road') !== (o.layer === 'flat')) continue;
    if (st.kind === 'pal') palEdge(g, d, e, ja, jb);
    else { const ra = nodeRadius(d, A, ja).R, rb = nodeRadius(d, B, jb).R; if (st.kind === 'road') roadEdge(g, d, e, ra, rb); else bridgeEdge(g, d, e, ra, rb, ja); }
  }
  for (const n of d.nodes) {
    if (o.nodes && !o.nodes.has(n.id)) continue;
    const j = J.get(n.id), es = d.edgesOf(n.id); if (!es.length) continue;
    const kinds = new Set(es.map((e) => STYLES[e.style].kind));
    if (o.layer === 'flat') { if (kinds.has('road')) roadNode(g, d, n, j, n.s); continue; }
    if (o.layer === 'solid') kinds.delete('road');
    if (kinds.has('pal')) palNode(g, d, n, j, n.s);
    if (kinds.has('road')) roadNode(g, d, n, j, n.s);
    if (kinds.has('bridge') || kinds.has('mostki')) bridgeNode(g, d, n, j, n.s);
  }
  if (o.layer === 'flat') return g;
  if (o.items !== false) for (const it of d.items) {
    if (it.type === 'gate') gateGeom(g, it);
    else if (it.type === 'tower') towerGeom(g, it.x, it.z, it.a, it.ang);
    else if (it.type === 'kpp') { gateGeom(g, it); for (const s of [-1, 1]) towerGeom(g, it.x + Math.cos(it.ang) * 2.9 * s, it.z + Math.sin(it.ang) * 2.9 * s, it.a, it.ang); if (it.a > 0.9) kppWalk(g, it); }
  }
  return g;
}

// настройки трёх модулей
export const BRIDGES_CFG = {
  id: 'bridges', name: 'Мосты', defaultStyle: 'most', decks: true,
  site: { x: 12, z: 21, dist: 24, yaw: -0.35, pitch: 0.9 },
  kinds: [{ id: 'most', name: 'Мост на ряжах' }, { id: 'gorb', name: 'Горбатый мост' }, { id: 'mostki', name: 'Мостки' }],
  texts: {
    line: 'мост продолжается без шва', corner: (a) => 'диагональный стык ' + a + '°, угловая стойка', T: 'Т-узел: площадка с перилами', Y: 'Y-узел: площадка над развилкой, рукава к берегам', X: 'крест: площадка с четырьмя рукавами',
    mixed: () => 'переход мостков на мост через площадку-накладку',
  },
  rules: { line: 'br_line', corner: 'br_diag', T: 'br_T', Y: 'br_Y', X: 'br_X', mixed: 'br_mostki', hump: 'br_gorb' },
};
export const FENCES_CFG = {
  id: 'fences', name: 'Ограждения', defaultStyle: 'pal', decks: false,
  site: { x: 21, z: 4, dist: 17, yaw: -0.5, pitch: 0.82 },
  kinds: [{ id: 'pal', name: 'Частокол' }, { id: 'gate', name: 'Ворота' }, { id: 'tower', name: 'Башня' }, { id: 'kpp', name: 'КПП' }],
  texts: { line: 'частокол продолжается без шва', corner: (a) => 'угол ' + a + '°: общий высокий столб', T: 'Т-стык: линия делится, толстый столб', Y: 'развилка линии: толстый столб', X: 'крестовой стык', ring: 'линия замкнётся кольцом' },
  rules: { line: 'fe_line', corner: 'fe_corner', T: 'fe_T', Y: 'fe_T', X: 'fe_T', ring: 'fe_ring' },
};
export const ROADS_CFG = {
  id: 'roads', name: 'Дороги и мостки', defaultStyle: 'road', decks: false,
  site: { x: 21, z: 4, dist: 17, yaw: -0.5, pitch: 0.85 },
  kinds: [{ id: 'road', name: 'Дорога' }, { id: 'mostki', name: 'Мостки' }],
  texts: { line: 'дорога продолжается без шва', corner: (a) => 'поворот ' + a + '°: скруглённый стык', T: 'Т-перекрёсток со скруглением', Y: 'развилка дороги', X: 'перекрёсток', mixed: () => 'въезд на мостки: накладка и сужение до 1,2 м', mostki: 'настил мостков продолжается без шва, угол сглажен накладкой' },
  rules: { mostkiR: 'rd_mostki', line: 'rd_join', corner: 'rd_join', T: 'rd_T', Y: 'rd_T', X: 'rd_X', mixed: 'rd_apron' },
};
