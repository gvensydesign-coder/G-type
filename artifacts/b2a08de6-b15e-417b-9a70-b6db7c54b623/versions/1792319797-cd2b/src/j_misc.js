// Участки и огороды (общее поле, плетень по внешней границе, калитка, пугало) и малые объекты
// (штабель ящиков, бочки пирамидой, длинная поленница, общий стог, гружёная телега).
import * as THREE from 'three';
import { G, clamp, lerp, hash2 } from './kit.js';
import { heightAt, WATER_Y, slopeAt } from './terrain.js';
import { vcMat } from './core.js';
import { crate, barrel } from './buildings.js';

const CX = (i) => -29 + 2 * i, CZ = (j) => -29 + 2 * j; // центр клетки 2 м
const ky = (i, j) => i + ',' + j;

// ================================================================= участки
export const PLOT_KINDS = [{ id: 'ogorod', name: 'Огород' }, { id: 'kalitka', name: 'Калитка' }, { id: 'pugalo', name: 'Пугало' }];

export class PlotMod {
  constructor(host) {
    this.host = host; this.id = 'plots'; this.name = 'Участки и огороды'; this.kinds = PLOT_KINDS;
    this.site = { x: 21, z: 4, dist: 13, yaw: -0.5, pitch: 0.85 };
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.pieces = []; this.nid = 1; this.hist = []; this.dirty = true; this.time = 0; this.fenceLife = new Map(); this.prevBoundary = new Set();
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.group.add(this.mesh);
    this.base = [25, 16];
  }
  enter() { this.group.visible = true; }
  leave() { this.group.visible = false; }
  cells(list = this.pieces) { const s = new Set(); for (const p of list) if (p.k === 'ogorod') for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) s.add(ky(p.i + i, p.j + j)); return s; }
  occupies(x, z) { for (const p of this.pieces) if (p.k === 'ogorod' && Math.abs(CX(p.i) + 1 - x) < 3.2 && Math.abs(CZ(p.j) + 1 - z) < 3.2) return true; return false; }
  clear() { this.pieces.length = 0; this.hist.length = 0; this.fenceLife.clear(); this.sync(); }
  undo() { const id = this.hist.pop(); if (id == null) return 'Нечего отменять'; this.pieces = this.pieces.filter((p) => p.id !== id); this.sync(); return null; }
  sync() { this.dirty = true; this.host.changed(); }
  // ---- границы поля
  boundary(cells) {
    const out = [];
    for (const k of cells) { const [i, j] = k.split(',').map(Number); for (const [di, dj, s] of [[0, -1, 'N'], [1, 0, 'E'], [0, 1, 'S'], [-1, 0, 'W']]) if (!cells.has(ky(i + di, j + dj))) out.push({ i, j, s, key: i + ',' + j + s }); }
    return out;
  }
  edgeMid(b) { const x = CX(b.i), z = CZ(b.j); return b.s === 'N' ? [x, z - 1, 0] : b.s === 'S' ? [x, z + 1, 0] : b.s === 'E' ? [x + 1, z, Math.PI / 2] : [x - 1, z, Math.PI / 2]; }
  bounds(cells) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const k of cells) { const [i, j] = k.split(',').map(Number); a = Math.min(a, i); b = Math.max(b, i); c = Math.min(c, j); d = Math.max(d, j); } return [b - a + 1, d - c + 1]; }
  cand(kind, p) {
    if (kind === 'ogorod') return { id: -1, k: 'ogorod', i: Math.round((p.x + 30) / 2 - 1), j: Math.round((p.z + 30) / 2 - 1), born: this.time };
    const cells = this.cells();
    if (kind === 'kalitka') { let best = null, bd = 2.2; for (const b of this.boundary(cells)) { const m = this.edgeMid(b), d = Math.hypot(m[0] - p.x, m[1] - p.z); if (d < bd) { bd = d; best = { b, m }; } } return best ? { id: -1, k: 'kalitka', x: best.m[0], z: best.m[1], ang: best.m[2], key: best.b.key, born: this.time } : { id: -1, k: 'kalitka', x: p.x, z: p.z, ang: 0, key: null, born: this.time }; }
    const ci = Math.floor((p.x + 30) / 2), cj = Math.floor((p.z + 30) / 2);
    return { id: -1, k: 'pugalo', x: cells.has(ky(ci, cj)) ? CX(ci) : p.x, z: cells.has(ky(ci, cj)) ? CZ(cj) : p.z, inside: cells.has(ky(ci, cj)), born: this.time };
  }
  valid(o) {
    if (o.k === 'ogorod') {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x = CX(o.i + i), z = CZ(o.j + j); if (Math.abs(x - this.site.x) > 13 || Math.abs(z - this.site.z) > 11) return 'за площадкой'; if (heightAt(x, z) < WATER_Y + 0.1) return 'здесь вода'; if (slopeAt(x, z) > 0.5) return 'слишком крутой склон'; }
      const cells = this.cells(); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (cells.has(ky(o.i + i, o.j + j))) return 'клетка занята';
      const all = this.cells(this.pieces.concat([o])); const [w, d] = this.bounds(all); if (w > 8 || d > 7) return 'поле не больше 16×14 м';
      return null;
    }
    if (o.k === 'kalitka') return o.key ? (this.pieces.some((q) => q.k === 'kalitka' && q.key === o.key) ? 'калитка уже есть' : null) : 'калитка ставится на внешнюю границу огорода';
    return o.inside ? null : 'пугало ставят внутри огорода';
  }
  info(o) {
    if (o.k === 'ogorod') { const touch = []; const set = new Set(); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) set.add(ky(o.i + i, o.j + j)); for (const p of this.pieces) { if (p.k !== 'ogorod') continue; const ps = new Set(); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) ps.add(ky(p.i + i, p.j + j)); let t = false; for (const k of set) { const [i, j] = k.split(',').map(Number); if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => ps.has(ky(i + a, j + b)))) t = true; } if (t) touch.push(p); }
      if (touch.length) return { text: 'единое поле из ' + (touch.length + 1) + ' участков, плетень между ними убирается', rule: 'pg_merge', parts: touch.map((p) => [CX(p.i) + 1, CZ(p.j) + 1]) }; return null; }
    if (o.k === 'kalitka' && o.key) return { text: 'калитка в плетне, колья в проёме 1 м убираются', rule: 'pg_gate', parts: [] };
    if (o.k === 'pugalo' && o.inside) return { text: 'пугало встанет на грядку огорода', rule: 'pg_scare', parts: [] };
    return null;
  }
  click(kind, p) {
    const o = this.cand(kind, p), err = this.valid(o); if (err) return err;
    const inf = this.info(o); o.id = this.nid++; this.pieces.push(o); this.hist.push(o.id); this.sync();
    if (inf) { this.host.toast('Соединено: ' + inf.text); this.host.burst(...(o.k === 'ogorod' ? [CX(o.i) + 1, CZ(o.j) + 1] : [o.x, o.z])); }
    return null;
  }
  hover(kind, p) {
    const o = this.cand(kind, p), err = this.valid(o), inf = err ? null : this.info(o);
    const list = this.pieces.concat([o]); const g = new G(3); g.jit = 0; this.build(g, list, true, o);
    return { ok: !err, err, text: inf ? 'будет соединено: ' + inf.text : null, geo: g.count ? g.build() : null, parts: inf ? inf.parts : [], rule: inf ? inf.rule : null };
  }
  step(s) { if (s.pc) { const [bi, bj] = this.base; const o = s.pc.k === 'ogorod' ? { id: this.nid++, k: 'ogorod', i: bi + s.pc.x, j: bj + s.pc.z, born: this.time } : this.cand(s.pc.k, { x: this.site.x + s.pc.x, z: this.site.z + s.pc.z }); if (this.valid(o)) return; o.id = this.nid++; o.born = this.time; this.pieces.push(o); this.sync(); } }
  build(g, list, ghost = false, only = null) {
    const cells = this.cells(list), bd = this.boundary(cells), bset = new Set(bd.map((b) => b.key));
    const Y = (x, z) => heightAt(x, z);
    if (!ghost) { // забор, ставший внутренним, оседает
      for (const k of this.prevBoundary) if (!bset.has(k) && !this.fenceLife.has(k)) this.fenceLife.set(k, 1);
      this.prevBoundary = bset;
    }
    const t = this.time;
    const bornOf = (i, j) => { const p = list.find((q) => q.k === 'ogorod' && i >= q.i && i < q.i + 2 && j >= q.j && j < q.j + 2); return p ? p.born : -9; };
    const inGhostArea = (i, j) => !only || only.k !== 'ogorod' || (i >= only.i - 1 && i <= only.i + 2 && j >= only.j - 1 && j <= only.j + 2);
    for (const k of cells) {
      const [i, j] = k.split(',').map(Number); if (ghost && only && only.k === 'ogorod' && !inGhostArea(i, j)) continue;
      const x0 = CX(i) - 1, z0 = CZ(j) - 1, age = clamp((t - bornOf(i, j)) / 0.9, 0, 1), sk = 0.02 + 0.05 * age;
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { const xa = x0 + a, xb = x0 + a + 1, za = z0 + b, zb = z0 + b + 1; g.quad([xa, Y(xa, za) + sk, za], [xb, Y(xb, za) + sk, za], [xb, Y(xb, zb) + sk, zb], [xa, Y(xa, zb) + sk, zb], 0x2c2216, 0x2c2216, 0x3a2e1c, 0x3a2e1c); }
    }
    // грядки вдоль z, сквозь стыки
    const rows = new Map();
    for (const k of cells) { const [i, j] = k.split(',').map(Number); for (let r = 0; r < 2.5; r++) { const xr = CX(i) - 1 + 0.4 + r * 0.8; if (r > 2) break; const rk = xr.toFixed(2); let a = rows.get(rk); if (!a) rows.set(rk, a = []); a.push(j); } }
    for (const [rk, js] of rows) {
      const xr = parseFloat(rk); js.sort((a, b) => a - b); let s = 0;
      while (s < js.length) { let e = s; while (e + 1 < js.length && js[e + 1] === js[e] + 1) e++; const za = CZ(js[s]) - 1 + 0.25, zb = CZ(js[e]) + 1 - 0.25;
        const ci = Math.floor((xr + 30) / 2);
        if (!(ghost && only && only.k === 'ogorod' && (ci < only.i - 1 || ci > only.i + 2))) {
          const born = bornOf(ci, js[s]), age = clamp((t - born) / 1.2, 0, 1), h = 0.22 * age;
          g.beam([xr, Y(xr, za) + 0.02, za], [xr, Y(xr, zb) + 0.02, zb], 0.5, h * 1.0 + 0.04, 0x3a2c1a, 0x4a3822);
          const n = Math.round((zb - za) / 0.55);
          for (let q = 0; q <= n; q++) { const z = lerp(za, zb, q / n), hh = hash2(xr * 3, z * 3), c = hh < 0.5 ? 0x5f8a3a : hh < 0.8 ? 0x7aa050 : 0x6a7a34; const sc = age * (0.6 + hh * 0.5); if (sc > 0.05) g.blob(xr, Y(xr, z) + 0.2 + 0.1 * sc, z, 0.17 * sc, c, { sy: 0.8, detail: 0, noise: 0.15, seed: q, top: 0xa6c870 }); }
        }
        s = e + 1; }
    }
    // плетень
    const kal = new Map(list.filter((p) => p.k === 'kalitka').map((p) => [p.key, p]));
    const fence = (b, life) => {
      const m = this.edgeMid(b), horiz = b.s === 'N' || b.s === 'S', ux = horiz ? 1 : 0, uz = horiz ? 0 : 1, hole = kal.get(b.key);
      const n = 8;
      for (let k = 0; k <= n; k++) { const s = (k / n - 0.5) * 2; if (hole && Math.abs(s) < 0.5) continue; const x = m[0] + ux * s, z = m[1] + uz * s, gy = Y(x, z); const h = 0.95 * life + 0.02; g.prism([x, gy - 0.1, z], [x, gy + h, z], 0.045, 0x5a4630, 5, 0.8, 0x7a6040, false); }
      for (const rh of [0.35, 0.7]) { const a = hole ? [[-1, -0.5], [0.5, 1]] : [[-1, 1]]; for (const [s0, s1] of a) g.beam([m[0] + ux * s0, Y(m[0] + ux * s0, m[1] + uz * s0) + rh * life, m[1] + uz * s0], [m[0] + ux * s1, Y(m[0] + ux * s1, m[1] + uz * s1) + rh * life, m[1] + uz * s1], 0.05, 0.05, 0x6a5233, 0x7a6040); }
      if (hole) for (const sg of [-0.5, 0.5]) { const x = m[0] + ux * sg, z = m[1] + uz * sg, gy = Y(x, z); g.prism([x, gy - 0.1, z], [x, gy + 1.25, z], 0.07, 0x4c3a24, 6, 1, 0x6a5233, true); }
      if (hole) { const gy = Y(m[0], m[1]); const sg = 0.5, x = m[0] + ux * sg, z = m[1] + uz * sg; const ang = 0.9; g.box(x - uz * 0.0 + (horiz ? -0.25 : 0.35), gy + 0.6, z + (horiz ? 0.35 : -0.25), 0.6, 0.95, 0.04, 0x5a4630, horiz ? ang : -ang + Math.PI / 2, 0x6f5c3c); }
    };
    for (const b of bd) { if (ghost && only && only.k !== 'ogorod' && only.key !== b.key) continue; if (ghost && only && only.k === 'ogorod' && !inGhostArea(b.i, b.j)) continue; fence(b, 1); }
    if (!ghost) for (const [k, life] of [...this.fenceLife]) {
      const m = /^(-?\d+),(-?\d+)([NESW])$/.exec(k); if (!m) continue; fence({ i: +m[1], j: +m[2], s: m[3], key: k }, life);
    }
    for (const b of bd) { // угловые столбы
    }
    for (const p of list) if (p.k === 'pugalo' && (!ghost || p === only)) { // пугало
      const x = p.x, z = p.z, y = Y(x, z) + 0.1;
      g.prism([x, y, z], [x, y + 1.7, z], 0.045, 0x5a4630, 5, 1, 0x7a6040, true); g.beam([x - 0.6, y + 1.3, z], [x + 0.6, y + 1.3, z], 0.05, 0.05, 0x5a4630, 0x7a6040);
      g.blob(x, y + 1.78, z, 0.17, 0xb89a68, { sy: 1.05, detail: 1, noise: 0.05, seed: 2, top: 0xd6b888 }); g.cone([x, y + 1.9, z], 0.28, 0.24, 0x3a3228, 7); g.box(x, y + 1.05, z, 0.5, 0.55, 0.18, 0x4a5a3a, 0, 0x5a6a44);
    }
  }
  update(dt) {
    this.time += dt; let anim = this.dirty || this.pieces.some((p) => this.time - p.born < 1.4);
    for (const [k, l] of [...this.fenceLife]) { const nl = l - dt * 1.4; anim = true; if (nl <= 0) this.fenceLife.delete(k); else this.fenceLife.set(k, nl); }
    if (!anim) return; this.dirty = false;
    const g = new G(8); g.jit = 0.05; this.build(g, this.pieces); const old = this.mesh.geometry; this.mesh.geometry = g.count ? g.build() : new THREE.BufferGeometry(); old.dispose();
  }
}

// ================================================================= малые объекты
export const PROP_KINDS = [{ id: 'crate', name: 'Ящик' }, { id: 'barrel', name: 'Бочка' }, { id: 'woodpile', name: 'Поленница' }, { id: 'stog', name: 'Стог' }, { id: 'cart', name: 'Телега' }];
const CG = 0.74;

export class PropMod {
  constructor(host) {
    this.host = host; this.id = 'props'; this.name = 'Малые объекты'; this.kinds = PROP_KINDS;
    this.site = { x: 21, z: 4, dist: 8, yaw: -0.5, pitch: 0.65 };
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.pieces = []; this.nid = 1; this.hist = []; this.dirty = true; this.time = 0;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.group.add(this.mesh);
  }
  enter() { this.group.visible = true; }
  leave() { this.group.visible = false; }
  occupies(x, z) { return this.pieces.some((p) => Math.hypot(p.x - x, p.z - z) < 2.4); }
  clear() { this.pieces.length = 0; this.hist.length = 0; this.sync(); }
  undo() { const id = this.hist.pop(); if (id == null) return 'Нечего отменять'; if (id < 0) this.undoCart(-id); else this.pieces = this.pieces.filter((p) => p.id !== id); this.sync(); return null; }
  sync() { this.dirty = true; this.host.changed(); }
  // ---- кандидат
  cand(kind, p, rot) {
    let x = p.x, z = p.z, lvl = 0, extra = {};
    const same = (q) => q.k === kind;
    if (kind === 'crate') { x = Math.round(x / CG) * CG; z = Math.round(z / CG) * CG; lvl = this.pieces.filter((q) => q.k === 'crate' && Math.abs(q.x - x) < 0.1 && Math.abs(q.z - z) < 0.1).length; }
    else if (kind === 'barrel') {
      // гексагональная упаковка: притяжение к соседям, второй ярус на середину пары
      const lo = this.pieces.filter((q) => q.k === 'barrel' && q.lvl === 0);
      let done = false;
      for (let a = 0; a < lo.length && !done; a++) for (let b = a + 1; b < lo.length; b++) { const A = lo[a], B = lo[b]; if (Math.hypot(A.x - B.x, A.z - B.z) < 1.0) { const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2; if (Math.hypot(mx - x, mz - z) < 0.5 && !this.pieces.some((q) => q.k === 'barrel' && q.lvl === 1 && Math.hypot(q.x - mx, q.z - mz) < 0.2)) { x = mx; z = mz; lvl = 1; done = true; break; } } }
      if (!done) { let best = null, bd = 1.5; for (const q of lo) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } } if (best) { const ang = Math.round(Math.atan2(z - best.z, x - best.x) / (Math.PI / 3)) * (Math.PI / 3); x = best.x + Math.cos(ang) * 0.8; z = best.z + Math.sin(ang) * 0.8; } else { x = Math.round(x * 5) / 5; z = Math.round(z * 5) / 5; } }
    } else if (kind === 'woodpile') {
      const ry = (rot % 2) * Math.PI / 2; extra.ry = ry; let best = null, bd = 3.0;
      for (const q of this.pieces) if (q.k === 'woodpile' && q.ry === ry) { const d = Math.hypot(q.x - x, q.z - z); if (d < bd) { bd = d; best = q; } }
      if (best) { const ax = ry === 0 ? [1, 0] : [0, 1]; const s = Math.sign((x - best.x) * ax[0] + (z - best.z) * ax[1]) || 1; x = best.x + ax[0] * 1.8 * s; z = best.z + ax[1] * 1.8 * s; } else { x = Math.round(x * 5) / 5; z = Math.round(z * 5) / 5; }
    } else if (kind === 'stog') { x = Math.round(x * 5) / 5; z = Math.round(z * 5) / 5; }
    else if (kind === 'cart') { x = Math.round(x * 5) / 5; z = Math.round(z * 5) / 5; extra.ry = rot * Math.PI / 2; }
    // груз на телегу
    if (kind !== 'cart') { const c = this.pieces.find((q) => q.k === 'cart' && Math.hypot(q.x - p.x, q.z - p.z) < 1.9); if (c) return { id: -1, k: kind, x: c.x, z: c.z, lvl: 0, cartId: c.id, ry: 0, born: this.time }; }
    return { id: -1, k: kind, x, z, lvl, born: this.time, ...extra };
  }
  valid(o) {
    if (Math.abs(o.x - this.site.x) > 12 || Math.abs(o.z - this.site.z) > 10) return 'за площадкой';
    if (heightAt(o.x, o.z) < WATER_Y + 0.1) return 'здесь вода';
    if (o.cartId) { const c = this.pieces.find((q) => q.id === o.cartId); if (c.cargo && c.cargo !== o.k) return 'на телеге уже другой груз'; if (c.cargoN >= 3) return 'телега полна'; return null; }
    if (o.k === 'crate' && o.lvl >= 3) return 'не выше 3 ярусов';
    if (o.k === 'barrel') { if (this.pieces.some((q) => q.k === 'barrel' && q.lvl === o.lvl && Math.hypot(q.x - o.x, q.z - o.z) < 0.55)) return 'место занято'; }
    else if (o.k === 'woodpile') { if (this.pieces.some((q) => q.k === 'woodpile' && Math.hypot(q.x - o.x, q.z - o.z) < 0.5)) return 'место занято'; const row = this.row(o, this.pieces.concat([o])); if (row.length > 4) return 'поленница не длиннее 8 м'; }
    else if (o.k !== 'crate') { if (this.pieces.some((q) => q.k !== 'crate' && q.k !== 'barrel' && q.k !== 'woodpile' && Math.hypot(q.x - o.x, q.z - o.z) < (o.k === 'cart' ? 2.2 : 0.9) && !(o.k === 'stog' && q.k === 'stog'))) return 'место занято'; }
    if (o.k === 'stog') { const gr = this.stogGroup(o, this.pieces.concat([o])); if (gr.length > 4) return 'стог не больше 4 копен'; }
    return null;
  }
  row(o, list) { const out = [o], ry = o.ry; let ch = true; while (ch) { ch = false; for (const q of list) if (q.k === 'woodpile' && q.ry === ry && !out.includes(q) && out.some((r) => Math.hypot(r.x - q.x, r.z - q.z) < 2.0)) { out.push(q); ch = true; } } return out; }
  stogGroup(o, list) { const out = [o]; let ch = true; while (ch) { ch = false; for (const q of list) if (q.k === 'stog' && !out.includes(q) && out.some((r) => Math.hypot(r.x - q.x, r.z - q.z) < 1.9)) { out.push(q); ch = true; } } return out; }
  crateGroup(o, list) { const out = [o]; let ch = true; while (ch) { ch = false; for (const q of list) if (q.k === 'crate' && !out.includes(q) && out.some((r) => Math.abs(r.x - q.x) < CG * 1.1 && Math.abs(r.z - q.z) < CG * 1.1)) { out.push(q); ch = true; } } return out; }
  barrelGroup(o, list) { const out = [o]; let ch = true; while (ch) { ch = false; for (const q of list) if (q.k === 'barrel' && !out.includes(q) && out.some((r) => Math.hypot(r.x - q.x, r.z - q.z) < 1.0)) { out.push(q); ch = true; } } return out; }
  info(o, list) {
    if (o.cartId) return { text: 'гружёная телега: ' + ({ crate: 'ящики', barrel: 'бочки', woodpile: 'дрова', stog: 'сено' }[o.k]), rule: 'pr_cart', parts: [[o.x, o.z]] };
    if (o.k === 'crate') { const g = this.crateGroup(o, list); if (g.length > 1) return { text: 'штабель ящиков (' + g.length + ' шт.)' + (g.length >= 4 ? ' под холстом' : ''), rule: 'pr_crate', parts: g.filter((q) => q !== o).map((q) => [q.x, q.z]) }; }
    if (o.k === 'barrel') { const g = this.barrelGroup(o, list); if (g.length > 1) return { text: g.some((q) => q.lvl === 1) ? 'бочки пирамидой (' + g.length + ' шт.)' : 'ряд бочек (' + g.length + ' шт.)', rule: 'pr_barrel', parts: g.filter((q) => q !== o).map((q) => [q.x, q.z]) }; }
    if (o.k === 'woodpile') { const g = this.row(o, list); if (g.length > 1) return { text: 'длинная поленница ' + (g.length * 1.8).toFixed(1) + ' м' + (g.length >= 3 ? ' под навесом' : ''), rule: 'pr_wood', parts: g.filter((q) => q !== o).map((q) => [q.x, q.z]) }; }
    if (o.k === 'stog') { const g = this.stogGroup(o, list); if (g.length > 1) return { text: 'общий стог из ' + g.length + ' копен', rule: 'pr_hay', parts: g.filter((q) => q !== o).map((q) => [q.x, q.z]) }; }
    return null;
  }
  click(kind, p, rot) {
    const o = this.cand(kind, p, rot), err = this.valid(o); if (err) return err;
    const inf = this.info(o, this.pieces.concat([o]));
    if (o.cartId) { const c = this.pieces.find((q) => q.id === o.cartId); c.cargo = o.k; c.cargoN = (c.cargoN || 0) + 1; c.cargoT = this.time; this.hist.push(-c.id); }
    else { o.id = this.nid++; o.born = this.time; this.pieces.push(o); this.hist.push(o.id); }
    this.sync(); if (inf) { this.host.toast('Соединено: ' + inf.text); this.host.burst(o.x, o.z); }
    return null;
  }
  hover(kind, p, rot) {
    const o = this.cand(kind, p, rot), err = this.valid(o), list = this.pieces.concat([o]), inf = err ? null : this.info(o, list);
    const g = new G(3); g.jit = 0; const gl = o.cartId ? this.pieces.map((q) => (q.id === o.cartId ? { ...q, cargo: o.k, cargoN: (q.cargoN || 0) + 1, cargoT: -9 } : q)).filter((q) => q.id === o.cartId) : list.filter((q) => q === o || (inf && inf.parts.some((pt) => Math.abs(pt[0] - q.x) < 0.01 && Math.abs(pt[1] - q.z) < 0.01)));
    this.build(g, o.cartId ? gl : list, true, o);
    return { ok: !err, err, text: inf ? 'будет соединено: ' + inf.text : null, geo: g.count ? g.build() : null, parts: inf ? inf.parts : [], rule: inf ? inf.rule : null };
  }
  undoCart(id) { const c = this.pieces.find((q) => q.id === id); if (c) { c.cargoN = (c.cargoN || 1) - 1; if (!c.cargoN) c.cargo = null; } }
  step(s) { if (s.pc) { const x = this.site.x + s.pc.x, z = this.site.z + s.pc.z; const o = this.cand(s.pc.k, { x, z }, s.pc.rot || 0); if (this.valid(o)) return; if (o.cartId) { const c = this.pieces.find((q) => q.id === o.cartId); c.cargo = o.k; c.cargoN = (c.cargoN || 0) + 1; c.cargoT = this.time; } else { o.id = this.nid++; o.born = this.time; this.pieces.push(o); } this.sync(); } }
  // ---- геометрия
  cargoGeom(g, c, x, y, z, ry, ghost = false) {
    const k = c.cargo, n = c.cargoN || 1, age = ghost ? 1 : clamp((this.time - (c.cargoT || -9)) / 0.6, 0, 1), lift = (1 - age) * 0.8;
    const yy = y + 0.62 - lift, cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 0.62, px = x + cs * o, pz = z - sn * o;
      if (k === 'crate') crate(g, px, yy, pz, 0.85, ry); else if (k === 'barrel') barrel(g, px, yy, pz, 0.7);
      else if (k === 'stog') { g.prism([px, yy, pz], [px, yy + 0.7, pz], 0.5, 0x7c6c34, 9, 0.6, 0xa8975a); g.cone([px, yy + 0.65, pz], 0.35, 0.3, 0xa8975a, 9, 0xc2b274); }
      else if (k === 'woodpile') for (let r = 0; r < 3; r++) for (let q = 0; q < 3 - (r >> 1); q++) g.prism([px - sn * 0.5 - cs * (q - 1) * 0.0, yy + 0.12 + r * 0.22, pz - cs * 0.5 - sn * 0 + (q - 1) * 0.22], [px + sn * 0.5, yy + 0.12 + r * 0.22, pz + cs * 0.5 + (q - 1) * 0.22], 0.1, 0x5c4128, 6, 1, 0xb89a68);
    }
    if (k === 'stog' || k === 'crate' || k === 'barrel' || k === 'woodpile') g.beam([x - cs * 0.9 + sn * 0.0, yy + 0.4, z + sn * 0.9], [x + cs * 0.9, yy + 0.4, z - sn * 0.9], 0.03, 0.03, 0x2a2018);
  }
  cartGeom(g, c, ghost) {
    const ry = c.ry || 0, x = c.x, z = c.z, y = heightAt(x, z), cs = Math.cos(ry), sn = Math.sin(ry);
    const L = (a, b, h) => [x + cs * a + sn * b, y + h, z - sn * a + cs * b];
    g.box(x, y + 0.62, z, 1.9, 0.1, 0.95, 0x6a4e2e, ry, 0x7e6038);
    for (const sd of [-1, 1]) { const a = L(-0.95, sd * 0.47, 0.7), b = L(0.95, sd * 0.47, 0.7); g.beam(a, b, 0.05, 0.4, 0x5a4026, 0x6a4e2e); }
    g.beam(L(-0.95, 0, 0.7), L(-0.95, 0, 0.7 + 0.001), 0.95, 0.4, 0x5a4026);
    for (const sd of [-1, 1]) { const a = L(0.3, sd * 0.62, 0.45); const w = [x + cs * 0.15 + sn * sd * 0.62, y + 0.45, z - sn * 0.15 + cs * sd * 0.62]; const wa = [w[0] - sn * sd * 0.05, w[1], w[2] - cs * sd * 0.05], wb = [w[0] + sn * sd * 0.05, w[1], w[2] + cs * sd * 0.05]; g.prism(wa, wb, 0.45, 0x3c2e1e, 12, 1, 0x4c3a24, true); for (let k = 0; k < 4; k++) { const an = k * Math.PI / 4, dx = Math.cos(an) * 0.42, dy = Math.sin(an) * 0.42; g.beam([w[0] + cs * dx, w[1] + dy, w[2] - sn * dx], [w[0] - cs * dx, w[1] - dy, w[2] + sn * dx], 0.05, 0.05, 0x4c3a24); } }
    for (const sd of [-1, 1]) g.beam(L(0.8, sd * 0.4, 0.62), L(2.4, sd * 0.28, 0.5), 0.07, 0.07, 0x4c3a24, 0x5a4630);
    if (c.cargo) this.cargoGeom(g, c, x, y, z, ry, ghost);
  }
  build(g, list, ghost = false, only = null) {
    const t = this.time, ageOf = (o) => (ghost ? 1 : clamp((t - o.born) / 0.5, 0, 1));
    const lift = (o) => (1 - Math.pow(1 - ageOf(o), 3)) * 1 - 1;
    // ящики
    const crates = list.filter((p) => p.k === 'crate'), seen = new Set();
    for (const c of crates) { const y = heightAt(c.x, c.z) + c.lvl * 0.6 + lift(c) * 0.9; crate(g, c.x, y, c.z, 1, 0); }
    for (const c of crates) { if (seen.has(c)) continue; const grp = this.crateGroup(c, crates); grp.forEach((q) => seen.add(q)); if (grp.length >= 4) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = 0; for (const q of grp) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); top = Math.max(top, q.lvl); } const yT = heightAt((x0 + x1) / 2, (z0 + z1) / 2) + (top + 1) * 0.6 + 0.06; const e = 0.45; const col1 = 0x4a5a44, col2 = 0x3a4a36; g.quad([x0 - e, yT - 0.2, z0 - e], [x1 + e, yT - 0.2, z0 - e], [x1 + e * 0.4, yT, z0], [x0 - e * 0.4, yT, z0], col2, col2, col1, col1); g.quad([x0 - e * 0.4, yT, z0], [x1 + e * 0.4, yT, z0], [x1 + e * 0.4, yT, z1], [x0 - e * 0.4, yT, z1], col1); g.quad([x0 - e * 0.4, yT, z1], [x1 + e * 0.4, yT, z1], [x1 + e, yT - 0.2, z1 + e], [x0 - e, yT - 0.2, z1 + e], col1, col1, col2, col2); g.quad([x0 - e, yT - 0.2, z0 - e], [x0 - e * 0.4, yT, z0], [x0 - e * 0.4, yT, z1], [x0 - e, yT - 0.2, z1 + e], col2, col1, col1, col2); g.quad([x1 + e * 0.4, yT, z0], [x1 + e, yT - 0.2, z0 - e], [x1 + e, yT - 0.2, z1 + e], [x1 + e * 0.4, yT, z1], col1, col2, col2, col1); } }
    // бочки
    for (const b of list.filter((p) => p.k === 'barrel')) { const y = heightAt(b.x, b.z) + (b.lvl === 1 ? 0.78 : 0) + lift(b) * 0.8; barrel(g, b.x, y, b.z, 1); }
    for (const b of list.filter((p) => p.k === 'barrel' && p.lvl === 0)) for (const q of list.filter((p) => p.k === 'barrel' && p.lvl === 0)) if (q.id > b.id && Math.hypot(q.x - b.x, q.z - b.z) < 1.0 && list.some((u) => u.k === 'barrel' && u.lvl === 1)) g.beam([b.x, heightAt(b.x, b.z) + 0.8, b.z], [q.x, heightAt(q.x, q.z) + 0.8, q.z], 0.1, 0.05, 0x4a3822);
    // поленницы по рядам
    const done = new Set();
    for (const w of list.filter((p) => p.k === 'woodpile')) {
      if (done.has(w)) continue; const row = this.row(w, list); row.forEach((q) => done.add(q));
      const ry = w.ry, ax = ry === 0 ? [1, 0] : [0, 1], nz = ry === 0 ? [0, 1] : [1, 0]; const cx = row.reduce((s, q) => s + q.x, 0) / row.length, cz = row.reduce((s, q) => s + q.z, 0) / row.length, Lr = row.length * 1.8, a0 = -Lr / 2;
      const age = Math.min(...row.map((q) => ageOf(q)));
      const nlog = Math.round(Lr / 0.3);
      for (let rowi = 0; rowi < 4; rowi++) for (let i = 0; i < nlog - (rowi >> 1); i++) { const s = a0 + 0.15 + (i + (rowi >> 1) * 0.5) * 0.3; const px = cx + ax[0] * s, pz = cz + ax[1] * s, y = heightAt(px, pz) + (0.14 + rowi * 0.26) * (0.3 + 0.7 * age); g.prism([px - nz[0] * 0.5, y, pz - nz[1] * 0.5], [px + nz[0] * 0.5, y, pz + nz[1] * 0.5], 0.12, 0x5c4128 + (i % 2) * 0x080808, 7, 1, 0xb89a68); }
      if (row.length >= 3) { const y = heightAt(cx, cz) + 1.35; for (const sd of [-1, 1]) g.quad([cx + ax[0] * (a0 - 0.2) + nz[0] * sd * 0.75, y - 0.1, cz + ax[1] * (a0 - 0.2) + nz[1] * sd * 0.75], [cx + ax[0] * (-a0 + 0.2) + nz[0] * sd * 0.75, y - 0.1, cz + ax[1] * (-a0 + 0.2) + nz[1] * sd * 0.75], [cx + ax[0] * (-a0 + 0.2), y + 0.35, cz + ax[1] * (-a0 + 0.2)], [cx + ax[0] * (a0 - 0.2), y + 0.35, cz + ax[1] * (a0 - 0.2)], 0x3b3a2c, 0x3b3a2c, 0x403c2e, 0x403c2e); for (const s of [a0, -a0]) for (const sd of [-1, 1]) g.prism([cx + ax[0] * s + nz[0] * sd * 0.7, heightAt(cx, cz), cz + ax[1] * s + nz[1] * sd * 0.7], [cx + ax[0] * s + nz[0] * sd * 0.7, y - 0.1, cz + ax[1] * s + nz[1] * sd * 0.7], 0.06, 0x4c3a24, 6, 1, 0x6a5233, false); }
    }
    // стога
    const sd = new Set();
    for (const s of list.filter((p) => p.k === 'stog')) {
      if (sd.has(s)) continue; const grp = this.stogGroup(s, list); grp.forEach((q) => sd.add(q));
      const cx = grp.reduce((a, q) => a + q.x, 0) / grp.length, cz = grp.reduce((a, q) => a + q.z, 0) / grp.length, R = 0.85 * Math.sqrt(grp.length) * (grp.length > 1 ? 0.93 : 1), age = Math.min(...grp.map((q) => ageOf(q))), gy = heightAt(cx, cz), H = (1.15 + 0.35 * (grp.length - 1)) * (0.4 + 0.6 * age);
      g.prism([cx, gy, cz], [cx, gy + H, cz], R, 0x7c6c34, 11, 0.55, 0xa8975a); g.cone([cx, gy + H - 0.05, cz], 0.55 + 0.2 * grp.length, R * 0.58, 0xa8975a, 11, 0xc2b274); g.prism([cx, gy + H + 0.5, cz], [cx, gy + H + 1.0 + 0.2 * grp.length, cz], 0.03, 0x4a3822, 4, 1, 0x4a3822, false);
    }
    for (const c of list.filter((p) => p.k === 'cart')) this.cartGeom(g, c, ghost);
  }
  update(dt) {
    this.time += dt; const anim = this.dirty || this.pieces.some((p) => this.time - p.born < 0.7 || (p.cargoT && this.time - p.cargoT < 0.8));
    if (!anim) return; this.dirty = false;
    const g = new G(8); g.jit = 0.05; this.build(g, this.pieces); const old = this.mesh.geometry; this.mesh.geometry = g.count ? g.build() : new THREE.BufferGeometry(); old.dispose();
  }
}
