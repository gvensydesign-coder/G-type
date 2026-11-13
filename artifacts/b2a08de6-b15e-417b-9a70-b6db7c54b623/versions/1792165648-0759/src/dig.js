// Рытьё: рельеф правится сеткой поправок 0,5 м (terrain.dig). Здесь: лопата-кисть, перерисовка земли,
// вода в ямах и рвах (волна от источника, подъём уровня, дождь, грунтовые воды), маска растений и вырубка деревьев.
import * as THREE from 'three';
import { dig, DIG_N, DIG_C, HALF, baseHeight, heightAt, WATER_Y } from './terrain.js';
import { makeWaterMaterial } from './core.js';
import { clamp, lerp, smooth, G, hash2 } from './kit.js';
import { vcMat } from './core.js';

const N = DIG_N, NN = N * N;
const nx = (i) => -HALF + i * DIG_C;
const ix = (x) => Math.round((x + HALF) / DIG_C);
const L0 = WATER_Y;                 // уровень воды в ручье и пруду
const FRONT_V = 1.0;                // скорость волны по рву, м/с
const RISE = 0.22;                  // подъём уровня за фронтом, м/с

// ---------------------------------------------------------------- маска растений (копание, стройка)
export class PlantMask {
  constructor(app) {
    this.app = app; this.flags = {}; this.orig = {}; this.grid = new Map();
    const pts = app.pts, meshes = app.plants.meshes;
    for (const id in meshes) {
      const arr = pts[id]; this.flags[id] = new Uint8Array(arr.length); this.orig[id] = meshes[id].instanceMatrix.array.slice();
      arr.forEach((p, i) => { const k = Math.floor(p.x / 4) + ',' + Math.floor(p.z / 4); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push([id, i]); });
    }
  }
  _apply(id, i) {
    const m = this.app.plants.meshes[id], a = m.instanceMatrix.array, o = this.orig[id], on = this.flags[id][i] === 0;
    for (let q = 0; q < 16; q++) a[i * 16 + q] = on ? o[i * 16 + q] : 0;
    const p = this.app.pts[id][i]; if (p.solid) p.solid.off = !on;
  }
  // скрыть растения круга (бит 1: рытьё); вернуть список скрытых
  hideCircle(x, z, r, bit = 1) {
    const out = [], R = r + 0.3, touched = new Set();
    for (let gx = Math.floor((x - R) / 4); gx <= Math.floor((x + R) / 4); gx++) for (let gz = Math.floor((z - R) / 4); gz <= Math.floor((z + R) / 4); gz++) {
      const a = this.grid.get(gx + ',' + gz); if (!a) continue;
      for (const [id, i] of a) {
        const p = this.app.pts[id][i]; if (Math.hypot(p.x - x, p.z - z) > r) continue;
        if (this.flags[id][i] & bit) continue;
        this.flags[id][i] |= bit; this._apply(id, i); touched.add(id); out.push({ id, p });
      }
    }
    for (const id of touched) this.app.plants.meshes[id].instanceMatrix.needsUpdate = true;
    return out;
  }
  // бит 2: постройка занимает место (test(x,z) → true, если растение под объектом)
  setBuild(test) {
    for (const id in this.flags) {
      const f = this.flags[id], arr = this.app.pts[id]; let ch = false;
      for (let i = 0; i < arr.length; i++) {
        const want = test(arr[i].x, arr[i].z) ? 2 : 0, cur = f[i] & 2;
        if (want !== cur) { f[i] = (f[i] & ~2) | want; this._apply(id, i); ch = true; }
      }
      if (ch) this.app.plants.meshes[id].instanceMatrix.needsUpdate = true;
    }
  }
}

class Heap {
  constructor() { this.a = []; }
  push(t, n) { const a = this.a; a.push([t, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

export class DigSystem {
  constructor(app) {
    this.app = app; this.world = app.world; app.world.dig = this;
    this.time = 0; this.rain = false; this.rainOn = 0; this.speed = 1;
    this.mask = new PlantMask(app);
    const tg = app.world.terrain.geometry; this.tg = tg; this.tpos = tg.attributes.position; this.tcol = tg.attributes.color; this.baseCol = new Float32Array(this.tcol.array);
    this.dirty = null; this.needWater = false; this.volume = { out: 0, spoil: 0 };
    // естественная вода и расстояние до неё (для грунтовых вод)
    this.nat = new Uint8Array(NN); this.dw = new Float32Array(NN).fill(99);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const n = j * N + i; if (baseHeight(nx(i), nx(j)) < L0 - 0.02) { this.nat[n] = 1; this.dw[n] = 0; } }
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const n = j * N + i; let d = this.dw[n]; if (i > 0) d = Math.min(d, this.dw[n - 1] + 0.5); if (j > 0) d = Math.min(d, this.dw[n - N] + 0.5); this.dw[n] = d; }
      for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) { const n = j * N + i; let d = this.dw[n]; if (i < N - 1) d = Math.min(d, this.dw[n + 1] + 0.5); if (j < N - 1) d = Math.min(d, this.dw[n + N] + 0.5); this.dw[n] = d; }
    }
    this.wt = new Float32Array(NN).fill(Infinity); this.wl = new Float32Array(NN).fill(-99);   // время прихода воды в узел
    this.ws = new Float32Array(NN).fill(-99);        // уровень поверхности (−99 — сухо)
    this.rd = new Float32Array(NN);                  // дождевая глубина бассейна
    this.basin = new Int32Array(NN).fill(-1); this.bMin = []; this.bSpill = [];
    this.conn = new Uint8Array(NN);
    // мешь воды ям
    const MAXQ = (N - 1) * (N - 1);
    this.wpos = new Float32Array(MAXQ * 6 * 3); this.wdep = new Float32Array(MAXQ * 6);
    const g = new THREE.BufferGeometry();
    this.wpa = new THREE.BufferAttribute(this.wpos, 3).setUsage(THREE.DynamicDrawUsage); this.wda = new THREE.BufferAttribute(this.wdep, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.wpa); g.setAttribute('aDepth', this.wda); g.setDrawRange(0, 0);
    this.wmesh = new THREE.Mesh(g, makeWaterMaterial()); this.wmesh.frustumCulled = false; this.wmesh.renderOrder = 3;
    app.stage.scene.add(this.wmesh);
    this.acc = 0; this.rainAcc = 0;
    this.wetCount = 0; this.candCount = 0;
    this.rainFx = null;
    this.tasks = []; this.finds = []; this.walkers = [];
    this.findsGroup = new THREE.Group(); app.stage.scene.add(this.findsGroup); this.findMat = vcMat({ side: THREE.DoubleSide });
  }
  // ---------------- один шаг лопаты: углубить место на deepen (м) до предела maxD или копать до глубины depth
  stamp(x, z, R, depth, deepen = 0, maxD = 1.6) {
    const err = this.canDig(x, z, R); if (err) return { err };
    const n = this._node(x, z); let target = depth;
    if (deepen) target = Math.min(maxD, Math.max(0, -dig.H[n]) + deepen);
    const out = this.brush(x, z, R, target, 'dig');
    if (out.cells) {
      const fx = this.app.fx;
      for (let k = 0; k < 7; k++) { const a = Math.random() * 6.28; fx.soft.emit(x + Math.cos(a) * R * 0.5, heightAt(x, z) + 0.15, z + Math.sin(a) * R * 0.5, Math.cos(a) * 0.8, 1.2 + Math.random(), Math.sin(a) * 0.8, 0x4a3a28, 0.12 + Math.random() * 0.1, 0.7, 6, 0.6, 0.9); }
      for (const p of out.stones) this.addFind('stone', x, z, R, p.s);
      if (out.roots) this.addFind('root', x, z, R, 1, out.roots);
    }
    return out;
  }
  // выкопанные камни и корни остаются на отвале рядом
  addFind(kind, x, z, R, s = 1, n = 1) {
    for (let i = 0; i < n; i++) {
      const a = hash2(x * 7 + this.finds.length, z * 3 + i) * 6.28, d = R + 0.55 + hash2(i, a) * 0.5, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const g = new G(this.finds.length + 5); g.jit = 0.04;
      if (kind === 'stone') g.blob(0, 0.12, 0, 0.18 + 0.2 * Math.min(1, s), 0x59626b, { sy: 0.7, detail: 1, noise: 0.2, seed: this.finds.length, top: 0x8794a0 });
      else { g.prism([0, 0.06, 0], [0.6, 0.12, 0.1], 0.07, 0x4a3422, 5, 0.5, 0x5a4028, false); g.prism([0.1, 0.07, 0.05], [0.45, 0.2, -0.3], 0.045, 0x4a3422, 5, 0.4, 0x5a4028, false); }
      const m = new THREE.Mesh(g.build(), this.findMat); m.position.set(px, heightAt(px, pz), pz); m.rotation.y = a; m.castShadow = true; m.userData.t = 0; m.scale.setScalar(0.1);
      this.findsGroup.add(m); this.finds.push(m);
    }
    if (this.onFind) this.onFind(kind, n);
  }
  clearFinds() { for (const m of this.finds) { this.findsGroup.remove(m); m.geometry.dispose(); } this.finds.length = 0; }
  // ---------------- задачи «копать вдоль пути»: точки [[x,z],…], радиус, глубина, скорость м/с
  digPath(pts, R, depth, speed = 7, done = null) {
    let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); L += d; }
    this.tasks.push({ pts, seg, L, s: 0, R, depth, speed, done, last: -9 });
  }
  _runTasks(dt) {
    for (const t of this.tasks) {
      const from = t.s; t.s = Math.min(t.L, t.s + t.speed * dt);
      const step = Math.max(0.25, t.R * 0.4);
      for (let s = Math.max(from, t.last + step); s <= t.s + 1e-6; s += step) { const p = this._at(t, s); this.brush(p[0], p[1], t.R, t.depth, 'dig'); this.app.fx.soft.emit(p[0], heightAt(p[0], p[1]) + 0.3, p[1], (Math.random() - 0.5) * 1.2, 1.4, (Math.random() - 0.5) * 1.2, 0x4a3a28, 0.14, 0.7, 6, 0.6, 0.9); t.last = s; }
      if (t.s >= t.L && !t.fin) { const p = this._at(t, t.L); this.brush(p[0], p[1], t.R, t.depth, 'dig'); t.fin = true; t.done && t.done(); }
    }
    this.tasks = this.tasks.filter((t) => !t.fin);
  }
  _at(t, s) { let a = s; for (let i = 0; i < t.seg.length; i++) { if (a <= t.seg[i] || i === t.seg.length - 1) { const k = t.seg[i] > 0 ? Math.min(1, a / t.seg[i]) : 0; return [lerp(t.pts[i][0], t.pts[i + 1][0], k), lerp(t.pts[i][1], t.pts[i + 1][1], k)]; } a -= t.seg[i]; } return t.pts[t.pts.length - 1]; }
  // тропа выхода из ямы: ближайшее место по краю, где поправка почти нулевая
  exitFrom(x, z) {
    let best = null, bd = 1e9;
    for (let a = 0; a < 16; a++) { const an = a / 16 * 6.283; for (let d = 0.6; d < 14; d += 0.4) { const px = x + Math.cos(an) * d, pz = z + Math.sin(an) * d; if (this.depthDug(px, pz) < 0.15 && this.depthAt(px, pz) < 0.2) { if (d < bd) { bd = d; best = [px, pz]; } break; } } }
    return best;
  }
  depthDug(x, z) { return Math.max(0, -dig.H[this._node(x, z)]); }
  // ---------------- высота и вода
  digAt(x, z) { return heightAt(x, z) - baseHeight(x, z); }
  _node(x, z) { const i = clamp(Math.round((x + HALF) / DIG_C), 0, N - 1), j = clamp(Math.round((z + HALF) / DIG_C), 0, N - 1); return j * N + i; }
  depthAt(x, z) {
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) return Math.max(0, L0 - heightAt(x, z));
    const n = this._node(x, z);
    if (this.nat[n]) return Math.max(0, L0 - heightAt(x, z));
    const w = this.ws[n]; if (w < -50) return 0;
    return Math.max(0, w - heightAt(x, z));
  }
  isWet(x, z) { return this.depthAt(x, z) > 0.03; }
  // ---------------- кисть
  // режим 'dig': вдавить до глубины depth (м) по профилю с откосами и насыпью вала; 'fill': сводить поправку к нулю
  brush(x, z, R, depth, mode = 'dig', k = 1) {
    const H = dig.H, berm = 1.0, out = { stones: [], roots: 0, cells: 0, trees: [] };
    const i0 = Math.max(0, ix(x - R - berm)), i1 = Math.min(N - 1, ix(x + R + berm)), j0 = Math.max(0, ix(z - R - berm)), j1 = Math.min(N - 1, ix(z + R + berm));
    let changed = false, rem = 0, add = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const n = j * N + i, px = nx(i), pz = nx(j), d = Math.hypot(px - x, pz - z);
      if (d > R + berm) continue;
      if (this.nat[n] && mode === 'dig') continue;
      if (Math.abs(px) > HALF - 0.6 || Math.abs(pz) > HALF - 0.6) continue;
      const cur = H[n];
      if (mode === 'dig') {
        let t;
        if (d <= R) { const u = d / R; t = -depth * (u < 0.55 ? 1 : 1 - smooth(0.55, 1, u)); out.cells++; }
        else { const u = (d - R) / berm; t = depth * 0.26 * Math.sin(Math.PI * Math.min(1, u)) * (1 - u * 0.5); }
        if (d <= R) { if (cur > t) { H[n] = lerp(cur, t, k); rem += cur - H[n]; changed = true; } }
        else if (t > 0.01 && cur < t && cur > -0.02) { H[n] = lerp(cur, t, k); add += H[n] - cur; changed = true; }
      } else {
        if (d <= R + berm && Math.abs(cur) > 0.002) { const w = (d <= R ? 1 : 0.6) * k; H[n] = cur * (1 - w); if (Math.abs(H[n]) < 0.01) H[n] = 0; changed = true; if (cur < 0) add += (H[n] - cur); else rem += cur - H[n]; }
      }
    }
    if (!changed) return out;
    this.volume.out += rem * DIG_C * DIG_C; this.volume.spoil += add * DIG_C * DIG_C;
    if (mode === 'dig') {
      for (const h of this.mask.hideCircle(x, z, R + 0.2)) { if (h.id === 'stones' || h.id === 'boulder' || h.id === 'cobble' || h.id === 'crag') { if (h.p.s * 0.42 >= 0.22) out.stones.push(h.p); } }
      // корни: деревья рядом, но не под лопатой
      for (const t of this.world.trees) { if (t.cut) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < R + 1.8 && d > 0.8) out.roots++; }
    }
    this.mark(i0, i1, j0, j1);
    return out;
  }
  // можно ли копать здесь (деревья, избы, вода, камни-валуны не мешают, их выкапывают)
  canDig(x, z, R) {
    if (Math.abs(x) > HALF - 1.2 || Math.abs(z) > HALF - 1.2) return 'край участка';
    for (const it of this.world.solids.around(x, z, R + 3, null)) {
      if (!this.world.solids.active(it)) continue;
      if (it.tag === 'ствол') { if (Math.hypot(it.x - x, it.z - z) < R + it.r + 0.5) return 'корни дерева мешают'; }
      else if (it.tag === 'стена избы' || it.tag === 'внутри избы') { const rx = x - it.cx, rz = z - it.cz, lx = rx * it.c - rz * it.s, lz = rx * it.s + rz * it.c; if (Math.abs(lx) < it.hw + R + 0.4 && Math.abs(lz) < it.hd + R + 0.4) return 'фундамент избы'; }
      else if (it.tag === 'колодец' || it.tag === 'кольцо костра') { if (Math.hypot(it.x - x, it.z - z) < R + it.r + 0.3) return 'каменная кладка'; }
    }
    return null;
  }
  mark(i0, i1, j0, j1) {
    this.dirty = this.dirty ? [Math.min(this.dirty[0], i0), Math.max(this.dirty[1], i1), Math.min(this.dirty[2], j0), Math.max(this.dirty[3], j1)] : [i0, i1, j0, j1];
    dig.version++; this.needWater = true;
  }
  reset() { this.clearFinds(); this.tasks.length = 0; dig.H.fill(0); this.wt.fill(Infinity); this.wl.fill(-99); this.ws.fill(-99); this.rd.fill(0); this.volume.out = this.volume.spoil = 0; this.mark(0, N - 1, 0, N - 1); }
  // ---------------- перерисовка земли
  flushTerrain() {
    const d = this.dirty; if (!d) return; this.dirty = null;
    const pos = this.tpos, col = this.tcol, H = dig.H;
    for (let j = Math.max(0, d[2] - 1); j <= Math.min(N - 1, d[3] + 1); j++) for (let i = Math.max(0, d[0] - 1); i <= Math.min(N - 1, d[1] + 1); i++) {
      const vi = (j + 60) * 241 + (i + 60), n = j * N + i, x = nx(i), z = nx(j), D = H[n];
      pos.setY(vi, baseHeight(x, z) + D);
      const b = vi * 3; let r = this.baseCol[b], g = this.baseCol[b + 1], bl = this.baseCol[b + 2];
      if (D < -0.03) { const a = clamp(-D * 1.6, 0, 0.88); r = lerp(r, 0.085, a); g = lerp(g, 0.06, a); bl = lerp(bl, 0.04, a); }
      else if (D > 0.03) { const a = clamp(D * 3.2, 0, 0.75); r = lerp(r, 0.22, a); g = lerp(g, 0.15, a); bl = lerp(bl, 0.08, a); }
      col.setXYZ(vi, r, g, bl);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    this.tg.computeVertexNormals();
    this.tg.computeBoundingSphere();
  }
  // ---------------- вода: связность, волна, дождь
  recomputeWater() {
    this.needWater = false;
    const H = new Float32Array(NN); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = baseHeight(nx(i), nx(j)) + dig.H[j * N + i];
    this.H = H;
    const now = this.time, old = this.wt, oldL = this.wl, dist = new Float32Array(NN).fill(Infinity), lv = new Float32Array(NN).fill(-99), heap = new Heap();
    for (let n = 0; n < NN; n++) {
      if (this.nat[n]) { if (H[n] < L0 - 0.03) { dist[n] = -1e6; lv[n] = L0; heap.push(-1e6, n); } continue; }
      if (old[n] < Infinity) { dist[n] = old[n]; lv[n] = oldL[n]; heap.push(old[n], n); continue; }
      const gw = L0 + 0.12 - 0.09 * this.dw[n];
      if (dig.H[n] < -0.1 && H[n] < gw - 0.02 && this.dw[n] < 5) { const t = now + 6 + this.dw[n] * 1.6; dist[n] = t; lv[n] = gw; heap.push(t, n); }
    }
    const step = DIG_C / FRONT_V;
    while (heap.size) {
      const [t, n] = heap.pop(); if (t > dist[n]) continue;
      const i = n % N, j = (n / N) | 0;
      for (const m of [i > 0 ? n - 1 : -1, i < N - 1 ? n + 1 : -1, j > 0 ? n - N : -1, j < N - 1 ? n + N : -1]) {
        if (m < 0 || old[m] < Infinity || this.nat[m] || dig.H[m] > -0.2) continue;
        let l;
        if (H[m] < lv[n] - 0.03) l = lv[n];                                  // ниже уровня воды: заливает
        else if (dig.H[m] < -0.5 && H[m] < lv[n] + 0.9) l = H[m] + 0.3;       // дно канала чуть выше: вода «подпёрта» наклоном
        else continue;
        const depthK = 1 + clamp(0.35 - (l - H[m]), 0, 0.35);                 // на мелком течёт медленнее
        const tt = Math.max(t, now) + step * depthK;
        if (tt < dist[m]) { dist[m] = tt; lv[m] = l; heap.push(tt, m); }
      }
    }
    for (let n = 0; n < NN; n++) { const ok = dist[n] < Infinity && !this.nat[n] && lv[n] > -50; this.wt[n] = ok ? dist[n] : Infinity; this.wl[n] = ok ? lv[n] : -99; }
    // бассейны дождя: связные ямы (поправка < −0.2), не соединённые с водой
    this.basin.fill(-1); this.bMin.length = 0; this.bSpill.length = 0; const rdNew = new Float32Array(NN);
    let nb = 0; const st = [];
    for (let s = 0; s < NN; s++) {
      if (this.basin[s] >= 0 || dig.H[s] > -0.2 || this.nat[s] || this.wt[s] < Infinity) continue;
      let mn = 99, sp = 99, rmax = 0; st.length = 0; st.push(s); this.basin[s] = nb;
      while (st.length) {
        const n = st.pop(); mn = Math.min(mn, H[n]); rmax = Math.max(rmax, this.rd[n]);
        const i = n % N, j = (n / N) | 0;
        for (const m of [i > 0 ? n - 1 : -1, i < N - 1 ? n + 1 : -1, j > 0 ? n - N : -1, j < N - 1 ? n + N : -1]) {
          if (m < 0) continue;
          if (dig.H[m] <= -0.2 && !this.nat[m] && !(this.wt[m] < Infinity)) { if (this.basin[m] < 0) { this.basin[m] = nb; st.push(m); } }
          else sp = Math.min(sp, H[m]);
        }
      }
      this.bMin.push(mn); this.bSpill.push(sp); this.bRd = this.bRd || []; this.bRd[nb] = rmax; nb++;
    }
    for (let n = 0; n < NN; n++) { const b = this.basin[n]; rdNew[n] = b >= 0 ? this.bRd[b] : 0; }
    this.rd = rdNew;
    let cc = 0; for (let n = 0; n < NN; n++) if (dig.H[n] < -0.2 && !this.nat[n]) cc++;
    this.candCount = cc;
  }
  update(dt) {
    dt *= this.speed;
    this.time += dt;
    if (this.tasks.length) this._runTasks(dt / this.speed);
    for (const m of this.finds) if (m.userData.t < 1) { m.userData.t = Math.min(1, m.userData.t + dt * 3); const e = 1 - Math.pow(1 - m.userData.t, 3); m.scale.setScalar(0.1 + 0.9 * e); }
    if (this.dirtyTimer === undefined) this.dirtyTimer = 0;
    this.dirtyTimer += dt; if (this.dirty && this.dirtyTimer > 0.07) { this.dirtyTimer = 0; this.flushTerrain(); }
    if (this.needWater) this.recomputeWater();
    if (!this.H) return;
    // дождь поднимает уровень в бассейнах
    if (this.rain) { for (let b = 0; b < this.bMin.length; b++) { const cap = Math.max(0, Math.min(this.bSpill[b] - 0.04, this.bMin[b] + 0.7) - this.bMin[b]); this.bRd[b] = Math.min(cap, (this.bRd[b] || 0) + 0.012 * dt); } }
    const H = this.H, t = this.time; let wet = 0;
    for (let n = 0; n < NN; n++) {
      if (this.nat[n]) { this.ws[n] = L0; continue; }
      const w = this.wt[n];
      if (w < Infinity) { const f = t - w; const tl = this.wl[n]; this.ws[n] = f >= 0 ? Math.min(tl, H[n] + f * RISE) : -99; if (f >= 0 && dig.H[n] < -0.2) wet++; continue; }
      const b = this.basin[n];
      if (b >= 0) { const lv = this.bMin[b] + (this.bRd[b] || 0); this.ws[n] = H[n] < lv - 0.01 && (this.bRd[b] || 0) > 0.01 ? lv : -99; this.rd[n] = this.bRd[b] || 0; if (this.ws[n] > -50) wet++; }
      else this.ws[n] = -99;
    }
    this.wetCount = wet;
    this.acc += dt; if (this.acc > 0.1 || this.forceMesh) { this.acc = 0; this.forceMesh = false; this.buildMesh(); }
  }
  buildMesh() {
    const ws = this.ws, H = this.H, nat = this.nat; let v = 0;
    const P = this.wpos, D = this.wdep;
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const n = j * N + i, c = [n, n + 1, n + N + 1, n + N];
      let wetN = 0, natN = 0, sum = 0;
      for (const q of c) { if (nat[q]) natN++; else if (ws[q] > -50) { wetN++; sum += ws[q]; } }
      if (!wetN) continue; if (natN === 4) continue;
      const avg = (sum + natN * L0) / (wetN + natN);
      const xs = [nx(i), nx(i + 1), nx(i + 1), nx(i)], zs = [nx(j), nx(j), nx(j + 1), nx(j + 1)];
      const yy = c.map((q) => (nat[q] ? L0 : ws[q] > -50 ? ws[q] : avg));
      const dd = c.map((q, k) => (nat[q] ? L0 - H[q] : ws[q] > -50 ? ws[q] - H[q] : H[q] > avg ? -0.25 : avg - H[q]));
      for (const k of [0, 2, 1, 0, 3, 2]) { P[v * 3] = xs[k]; P[v * 3 + 1] = yy[k] + 0.006; P[v * 3 + 2] = zs[k]; D[v] = Math.min(dd[k], 1.0); v++; }
    }
    this.wmesh.geometry.setDrawRange(0, v); this.wpa.needsUpdate = true; this.wda.needsUpdate = true;
  }
  // доля заполнения вырытых клеток (для подписи)
  fillPct() { return this.candCount ? Math.round(100 * clamp(this.wetCount / this.candCount, 0, 1)) : 0; }
}
