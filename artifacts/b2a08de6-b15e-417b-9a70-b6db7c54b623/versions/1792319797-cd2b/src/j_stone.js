// Соединение камней: свободная постановка, связные группы, поле расстояний со сглаженным объединением.
// Группа определяет «составную форму»: двойной валун, гряда, плитняк-скала, ступенчатая глыба, рунный круг и т. д.
import * as THREE from 'three';
import { G, clamp, lerp, smooth, hash2, vnoise, col } from './kit.js';
import { heightAt } from './terrain.js';
import { vcMat } from './core.js';
import { marchTets, smin } from './tab3.js';

export const STONE_KINDS = {
  boulder: { name: 'Валун', rx: 0.92, ry: 0.78, rz: 0.86, shape: 'ell', rad: 0.9 },
  slab: { name: 'Плита', rx: 0.24, ry: 1.15, rz: 0.78, shape: 'box', round: 0.08, rad: 0.78 },
  block: { name: 'Глыба', rx: 0.56, ry: 0.5, rz: 0.56, shape: 'box', round: 0.07, rad: 0.62 },
  rune: { name: 'Рунный камень', rx: 0.3, ry: 0.98, rz: 0.3, shape: 'box', round: 0.1, rad: 0.3 },
  cobble: { name: 'Булыжник', rx: 0.46, ry: 0.32, rz: 0.42, shape: 'ell', rad: 0.44 },
};

const C1 = col(0x454d57), C2 = col(0x8794a0), MOSS = col(0x587a40), DARK = col(0x2f363e), GLOW = col(0x72f0d8);

// ---------------------------------------------------------------- разбор группы
export function analyzeGroup(list) {
  const n = list.length, kinds = new Set(list.map((p) => p.k));
  const cx = list.reduce((s, p) => s + p.x, 0) / n, cz = list.reduce((s, p) => s + p.z, 0) / n;
  let ext = 0, wid = 0;
  if (n > 1) { // главная ось по ковариации
    let sxx = 0, szz = 0, sxz = 0; for (const p of list) { const dx = p.x - cx, dz = p.z - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    const th = 0.5 * Math.atan2(2 * sxz, sxx - szz), c = Math.cos(th), s = Math.sin(th);
    let mn = 1e9, mx = -1e9, mn2 = 1e9, mx2 = -1e9; for (const p of list) { const a = (p.x - cx) * c + (p.z - cz) * s, b = -(p.x - cx) * s + (p.z - cz) * c; mn = Math.min(mn, a); mx = Math.max(mx, a); mn2 = Math.min(mn2, b); mx2 = Math.max(mx2, b); }
    ext = mx - mn + 1.8; wid = mx2 - mn2 + 1.8;
  }
  const r = { n, cx, cz, K: 0.5, name: 'Камень', rule: null, ring: null, link: false };
  if (n === 1) { r.name = STONE_KINDS[list[0].k].name; return r; }
  const only = (k) => kinds.size === 1 && kinds.has(k);
  if (only('boulder')) {
    if (n === 2) { r.name = 'Двойной валун'; r.rule = 'st_double'; r.K = 0.1; }
    else if (ext / wid > 2.2) { r.name = 'Гряда'; r.rule = 'st_ridge'; r.K = 0.1; }
    else { r.name = 'Валунный холм'; r.rule = 'st_ridge'; r.K = 0.09; }
  } else if (only('slab')) { r.name = 'Плитняк-скала'; r.rule = 'st_slab'; r.K = 0.05; }
  else if (only('block')) { r.name = 'Ступенчатая глыба'; r.rule = 'st_block'; r.K = 0.04; }
  else if (only('cobble')) { r.name = 'Россыпь булыжников'; r.rule = 'st_cobble'; r.K = 0.06; }
  else if (only('rune')) {
    r.link = true;
    if (n >= 4) {
      const ds = list.map((p) => Math.hypot(p.x - cx, p.z - cz)), m = ds.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) * (b - m), 0) / n);
      if (m >= 1.2 && m <= 3.2 && sd < m * 0.35) { r.name = 'Рунный круг'; r.rule = 'st_rune'; r.ring = { x: cx, z: cz, r: m }; }
      else { r.name = 'Рунные камни (не по кругу)'; r.rule = 'st_runepair'; }
    } else { r.name = n === 2 ? 'Парные руны (врата)' : 'Рунная тройка'; r.rule = 'st_runepair'; }
  } else { r.name = 'Скальный выход'; r.rule = 'st_mix'; r.K = 0.07; }
  return r;
}

function connected(a, b) {
  const ra = STONE_KINDS[a.k], rb = STONE_KINDS[b.k], d = Math.hypot(a.x - b.x, a.z - b.z);
  if (a.k === 'rune' || b.k === 'rune') return a.k === b.k && d < 2.8 && d > 0.5;
  return d < (ra.rad + rb.rad) * 1.25;
}
export function groups(list) {
  const seen = new Set(), out = [];
  for (const p of list) {
    if (seen.has(p)) continue;
    const comp = [], st = [p]; seen.add(p);
    while (st.length) { const c = st.pop(); comp.push(c); for (const q of list) if (!seen.has(q) && connected(c, q)) { seen.add(q); st.push(q); } }
    comp.sort((a, b) => a.id - b.id); out.push(comp);
  }
  return out;
}

// ---------------------------------------------------------------- геометрия группы
function effective(list, info) {
  // положение, поворот и наклон каждого камня с учётом группы
  const out = [];
  const cx = info.cx, cz = info.cz;
  for (const p of list) {
    const K = STONE_KINDS[p.k]; let base = heightAt(p.x, p.z), rot = p.rot || 0, tilt = 0;
    if (p.k === 'block') {
      for (const q of out) if (q.k === 'block' && Math.hypot(q.x - p.x, q.z - p.z) < 0.85) base = Math.max(base, q.base + q.ry * 2 - 0.05);
      base = Math.min(base, heightAt(p.x, p.z) + 2 * 1.0 * 1.9);
    }
    if (p.k === 'slab') {
      if (list.length > 1) { const dx = cx - p.x, dz = cz - p.z, d = Math.hypot(dx, dz); if (d > 0.1) { rot = Math.atan2(dx, dz) + Math.PI / 2; tilt = clamp(0.1 + d * 0.22, 0.1, 0.42); } else tilt = 0.1; } else tilt = 0.12;
    }
    out.push({ ...K, k: p.k, id: p.id, x: p.x, z: p.z, base, rot, tilt, a: clamp(p.a ?? 1, 0.05, 1), rune: p.k === 'rune' });
  }
  return out;
}

// граненый камень: выпуклый многогранник из 26 плоскостей со случайными сколами; у плит и глыб — сколотые углы
const DIRS = (() => { const d = []; for (const a of [-1, 1]) { d.push([a, 0, 0], [0, a, 0], [0, 0, a]); }
  for (const a of [-1, 1]) for (const b of [-1, 1]) { d.push([a, b, 0], [a, 0, b], [0, a, b]); }
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) d.push([a, b, c]);
  return d.map((v) => { const l = Math.hypot(...v); return v.map((q) => q / l); }); })();
function makeFacets(id, kind) {
  const r = (k) => hash2(id * 7.13 + k * 3.1, id * 1.7 + k);
  if (kind === 'boulder' || kind === 'cobble') {
    const off = DIRS.map((n, i) => { const nz = Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]); const base = nz < 1.01 ? 0.93 : nz < 1.5 ? 0.99 : 1.04; return base * (0.88 + r(i) * 0.2); });
    // слабый поворот набора плоскостей
    const ay = r(40) * 6.283, c = Math.cos(ay), sn = Math.sin(ay);
    const pl = DIRS.map((n) => [n[0] * c + n[2] * sn, n[1], -n[0] * sn + n[2] * c]);
    return { pl, off };
  }
  // chips: срезанные углы бокса
  const chips = []; const nC = 2 + Math.floor(r(1) * 3);
  for (let k = 0; k < nC; k++) { const sx = r(10 + k) < 0.5 ? -1 : 1, sy = r(20 + k) < 0.7 ? 1 : -1, sz = r(30 + k) < 0.5 ? -1 : 1; const n = [sx, sy, sz].map((q) => q / Math.sqrt(3)); chips.push({ n, cut: 0.1 + r(50 + k) * 0.16 }); }
  return { chips };
}
function sdfStone(s, x, y, z) {
  const dx = x - s.x, dz = z - s.z, c = Math.cos(s.rot), sn = Math.sin(s.rot);
  let lx = dx * c - dz * sn, lz = dx * sn + dz * c, ly = y - (s.base + s.ry * 0.9);
  if (s.tilt) { const ct = Math.cos(s.tilt), st = Math.sin(s.tilt); const nx = lx * ct + ly * st, ny = -lx * st + ly * ct; lx = nx; ly = ny; }
  const a = s.a, rx = s.rx * a, ry = s.ry * a, rz = s.rz * a;
  const F = s.fac || (s.fac = makeFacets(s.id, s.k));
  if (s.shape === 'ell') {
    const ux = lx / rx, uy = ly / ry, uz = lz / rz; let m = -1e9;
    for (let i = 0; i < DIRS.length; i++) { const n = F.pl[i], v = n[0] * ux + n[1] * uy + n[2] * uz - F.off[i]; if (v > m) m = v; }
    return m * Math.min(rx, ry, rz) * 0.95;
  }
  const r = s.round * a, qx = Math.abs(lx) - rx + r, qy = Math.abs(ly) - ry + r, qz = Math.abs(lz) - rz + r;
  let d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  const cd = (rx + ry + rz) / Math.sqrt(3);
  for (const c of F.chips) { const v = c.n[0] * lx + c.n[1] * ly + c.n[2] * lz - (cd - c.cut * a * 1.6); if (v > d) d = v; }
  return d;
}

export function stoneGroupGeometry(list, info, K, grow = 1) {
  const g = new G(4); g.jit = 0.04;
  const E = effective(list, info);
  let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9, mny = 1e9, mxy = -1e9;
  for (const s of E) { const R = Math.max(s.rx, s.rz) * 1.25 + 0.3; mnx = Math.min(mnx, s.x - R); mxx = Math.max(mxx, s.x + R); mnz = Math.min(mnz, s.z - R); mxz = Math.max(mxz, s.z + R); mny = Math.min(mny, s.base - 0.3); mxy = Math.max(mxy, s.base + s.ry * 2 + 0.4); }
  const h = E.length > 4 ? 0.26 : 0.21;
  const nx = Math.ceil((mxx - mnx) / h), nz = Math.ceil((mxz - mnz) / h), ny = Math.ceil((mxy - mny) / h);
  const gMin = Math.min(...E.map((s) => s.base));
  const f = (x, y, z) => {
    let d = 1e9;
    let d2 = 1e9;
    for (const s of E) { const e = sdfStone(s, x, y, z) - (grow - 1) * 0.5; if (d === 1e9) d = e; else { if (e < d) { d2 = d; d = e; } else if (e < d2) d2 = e; } }
    // стык: жёсткое объединение с малой фаской и тонкой трещиной по линии пересечения поверхностей
    if (E.length > 1 && d2 < 1e8) { const gap = d2 - d, k = Math.max(K, 0.001); if (gap < k) d -= (k - gap) * (k - gap) / (4 * k); const w = 0.16; d += 0.075 * Math.exp(-(gap / w) * (gap / w)) * (d > -0.5 ? 1 : 0); }
    d += (vnoise(x * 2.3 + 3, z * 2.3 + y * 1.9) - 0.5) * 0.08;
    return Math.max(d, gMin - 0.2 - y);
  };
  const tris = [];
  marchTets(f, mnx, mny, mnz, nx, ny, nz, h, tris);
  const cc = new THREE.Color();
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nxn = uy * vz - uz * vy, nyn = uz * vx - ux * vz, nzn = ux * vy - uy * vx; const l = Math.hypot(nxn, nyn, nzn) || 1; nxn /= l; nyn /= l; nzn /= l;
    const mx = (a[0] + b[0] + c[0]) / 3, my = (a[1] + b[1] + c[1]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    // ближайший камень по полю
    let near = E[0], bd = 1e9, bd2 = 1e9; for (const s of E) { const e = sdfStone(s, mx, my, mz); if (e < bd) { bd2 = bd; bd = e; near = s; } else if (e < bd2) bd2 = e; }
    cc.copy(C1).lerp(C2, clamp(nyn * 0.55 + 0.35 + (my - gMin) * 0.1, 0, 1));
    { const tone = (hash2(near.id * 3.7, 1.3) - 0.5) * 0.22; cc.r = clamp(cc.r * (1 + tone), 0, 1); cc.g = clamp(cc.g * (1 + tone * 0.9), 0, 1); cc.b = clamp(cc.b * (1 + tone * 0.8), 0, 1); }
    const seam = E.length > 1 ? clamp(1 - (bd2 - bd) / 0.22, 0, 1) : 0;
    if (seam > 0.01) cc.lerp(DARK, seam * 0.55);
    if (near.k === 'slab') { const band = Math.floor((my - near.base) * 4.2); if (band % 2 === 0) cc.lerp(DARK, 0.28); }
    if (near.k === 'block') cc.lerp(col(0x7a8794), 0.15);
    const n = vnoise(mx * 1.3, mz * 1.3);
    if (nyn > 0.45 && near.k !== 'rune') cc.lerp(MOSS, clamp(smooth(0.5, 0.9, nyn) * smooth(0.35, 0.62, n) + seam * 0.5 * smooth(0.3, 0.7, nyn), 0, 0.92));
    if (my < gMin + 0.1) cc.lerp(DARK, 0.5);
    if (near.rune && Math.abs(nyn) < 0.5 && my - near.base > 0.5 && my - near.base < 1.5) {
      const glyph = vnoise((mx + mz) * 5.5, my * 7.0);
      if (glyph > 0.58) cc.copy(GLOW);
    }
    g.tri(a, b, c, cc.clone(), cc.clone(), cc.clone());
  }
  return g.build();
}

// плоская подложка рунного круга: кольцо знаков и нити между стелами
function runeDecor(list, info) {
  const g = new G(9); g.jit = 0;
  const seg = 36;
  if (info.ring) {
    const { x, z, r } = info.ring;
    for (let i = 0; i < seg; i++) {
      if (i % 3 === 2) continue;
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 0.62) / seg) * Math.PI * 2;
      const P = (a, rr) => [x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr];
      const q = [P(a0, r - 0.1), P(a1, r - 0.1), P(a1, r + 0.1), P(a0, r + 0.1)];
      for (const p of q) p[1] = heightAt(p[0], p[2]) + 0.05;
      g.quad(q[0], q[1], q[2], q[3], GLOW);
    }
  }
  if (info.link && list.length > 1) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d > 2.8 || (info.ring && list.length >= 4 && d > info.ring.r * 1.2)) continue;
      const nx = -(b.z - a.z) / d * 0.035, nz = (b.x - a.x) / d * 0.035, y = (x, z) => heightAt(x, z) + 0.06;
      g.quad([a.x + nx, y(a.x, a.z), a.z + nz], [b.x + nx, y(b.x, b.z), b.z + nz], [b.x - nx, y(b.x, b.z), b.z - nz], [a.x - nx, y(a.x, a.z), a.z - nz], GLOW);
    }
  }
  return g.count ? g.build() : null;
}

export class StoneMod {
  constructor(host) {
    this.host = host; this.id = 'stones'; this.name = 'Камни';
    this.kinds = Object.entries(STONE_KINDS).map(([id, k]) => ({ id, name: k.name }));
    this.site = { x: 21, z: 4, dist: 9, yaw: -0.45, pitch: 0.62 };
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.pieces = []; this.nid = 1; this.recs = new Map(); this.hist = [];
    this.mat = vcMat(); this.decorMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
    this.ghostKey = '';
  }
  enter() { this.group.visible = true; }
  leave() { this.group.visible = false; }
  occupies(x, z) { return this.pieces.some((p) => Math.hypot(p.x - x, p.z - z) < 1.3); }
  clear() { this.pieces.length = 0; this.hist.length = 0; this.sync(true); }
  undo() { const id = this.hist.pop(); if (id == null) return 'Нечего отменять'; this.pieces = this.pieces.filter((p) => p.id !== id); this.sync(); return null; }
  seed() { }
  rel(x, z) { return [this.site.x + x, this.site.z + z]; }
  add(k, x, z, rot = 0, extra = {}) {
    const p = { id: this.nid++, k, x, z, rot, a: 0.3, ...extra }; this.pieces.push(p); this.hist.push(p.id); this.sync(); return p;
  }
  click(kind, p, rot) {
    const err = this.check(kind, p.x, p.z); if (err) return err;
    const gi = groups(this.pieces).length;
    this.add(kind, p.x, p.z, rot * Math.PI / 2 + (hash2(p.x, p.z) - 0.5) * 0.6);
    const comp = groups(this.pieces).find((c) => c.some((q) => q.id === this.nid - 1)), info = analyzeGroup(comp);
    if (comp.length > 1) { this.host.toast('Соединено: ' + info.name); this.host.burst(info.cx, info.cz); }
    return null;
  }
  check(kind, x, z) {
    if (Math.abs(x - this.site.x) > 13 || Math.abs(z - this.site.z) > 11) return 'за площадкой';
    if (heightAt(x, z) < -0.1) return 'здесь вода';
    if (this.pieces.length >= 24) return 'не больше 24 камней';
    return null;
  }
  // подсказка по курсору: что получится
  hover(kind, p, rot) {
    const err = this.check(kind, p.x, p.z);
    const cand = { id: -1, k: kind, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10, rot: rot * Math.PI / 2 + (hash2(p.x, p.z) - 0.5) * 0.6, a: 1 };
    const list = this.pieces.concat([cand]);
    const comp = groups(list).find((c) => c.includes(cand)), info = analyzeGroup(comp);
    const partners = comp.filter((q) => q !== cand);
    const key = comp.map((q) => q.id + ':' + q.x.toFixed(1) + ',' + q.z.toFixed(1)).join('|') + kind + (cand.rot).toFixed(1);
    let geo = null;
    if (key !== this.ghostKey) { this.ghostKey = key; geo = stoneGroupGeometry(comp.map((q) => (q === cand ? cand : { ...q, a: 1 })), info, info.K, 1.04); this.ghostGeoCache = geo; } else geo = this.ghostGeoCache;
    const out = { ok: !err, err, geo, parts: partners.map((q) => [q.x, q.z]), rule: info.rule };
    if (!err) out.text = partners.length ? 'будет соединено: ' + info.name + ' (' + comp.map((q) => STONE_KINDS[q.k].name.toLowerCase()).join(' + ') + ')' : null;
    const decor = runeDecor(comp, info);
    out.decor = decor;
    return out;
  }
  step(s) {
    if (s.pc) { const [x, z] = this.rel(s.pc.x, s.pc.z); const p = this.add(s.pc.k, x, z, s.pc.rot ?? 0.3 * this.pieces.length); if (s.from) { p.tween = { fx: s.from[0], fz: s.from[1], t: 0, dur: s.dur || 1.3, x, z }; p.x = x + s.from[0]; p.z = z + s.from[1]; } }
  }
  sync() { this.dirty = true; this.host.changed(); }
  // состав пересобирается раз в кадр по необходимости
  update(dt) {
    let anim = false;
    for (const p of this.pieces) {
      if (p.a < 1) { p.a = Math.min(1, p.a + dt * 2.2); anim = true; }
      if (p.tween) { const t = p.tween; t.t = Math.min(1, t.t + dt / t.dur); const e = t.t * t.t * (3 - 2 * t.t); p.x = t.x + t.fx * (1 - e); p.z = t.z + t.fz * (1 - e); anim = true; if (t.t >= 1) delete p.tween; }
    }
    const gs = groups(this.pieces), keep = new Set();
    for (const comp of gs) {
      const info = analyzeGroup(comp); const key = comp.map((q) => q.id).join('-'); keep.add(key);
      let r = this.recs.get(key);
      if (!r) {
        // кто был до слияния: новая запись начинает с жёсткого объединения и плавно набирает K
        r = { mesh: new THREE.Mesh(new THREE.BufferGeometry(), this.mat), k: comp.length > 1 ? 0.03 : info.K, built: '', t: 0, decor: new THREE.Mesh(new THREE.BufferGeometry(), this.decorMat) };
        r.mesh.castShadow = r.mesh.receiveShadow = true; r.mesh.frustumCulled = false; r.decor.frustumCulled = false; r.decor.renderOrder = 3;
        this.group.add(r.mesh, r.decor); this.recs.set(key, r);
        if (comp.length > 1) this.host.pulse(info.cx, info.cz);
      }
      const kT = info.K; if (Math.abs(r.k - kT) > 0.002) { r.k += (kT - r.k) * Math.min(1, dt * 3.2); if (Math.abs(r.k - kT) < 0.004) r.k = kT; anim = true; }
      const sig = comp.map((q) => q.x.toFixed(2) + q.z.toFixed(2) + q.a.toFixed(2)).join('') + r.k.toFixed(3);
      r.t += dt;
      if (sig !== r.built && r.t > 0.04) {
        r.t = 0; r.built = sig;
        const geo = stoneGroupGeometry(comp, info, r.k, 1); const old = r.mesh.geometry; r.mesh.geometry = geo; old.dispose();
        const dg = runeDecor(comp, info); const od = r.decor.geometry; r.decor.geometry = dg || new THREE.BufferGeometry(); od.dispose();
      }
      r.mesh.userData.info = info;
      if (info.rune || info.ring || info.link) { if (Math.random() < dt * 5) { const q = comp[Math.floor(Math.random() * comp.length)]; this.host.app.fx.glow.emit(q.x + (Math.random() - 0.5) * 0.3, heightAt(q.x, q.z) + 0.8 + Math.random() * 0.9, q.z + (Math.random() - 0.5) * 0.3, 0, 0.35, 0, 0x72f0d8, 0.05, 1.3, 0.1, 0.3, 1, 0); } }
    }
    for (const [k, r] of [...this.recs]) if (!keep.has(k)) { this.group.remove(r.mesh, r.decor); r.mesh.geometry.dispose(); r.decor.geometry.dispose(); this.recs.delete(k); }
  }
  describe() { return groups(this.pieces).map((c) => analyzeGroup(c).name); }
}
