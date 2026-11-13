// Соединение растений: посадки одного семейства срастаются в заросли (папоротник, мох, ягодник, цветочная поляна,
// подлесок, грибное кольцо), лианы на опоре удлиняются вниз и срастаются в завесу. Инстансы вырастают волной от места посадки.
import * as THREE from 'three';
import { G, clamp, lerp, hash2 } from './kit.js';
import { heightAt } from './terrain.js';
import { plantMat, vcMat } from './core.js';
import { PLANTS, plantGeometry } from './plants.js';

const FOREST = new Set(['fern', 'moss', 'bush', 'shrub']), FLOWER = new Set(['meadow', 'fireweed']);
const REACH = { fern: 1.0, moss: 1.15, bush: 0.95, shrub: 1.25, meadow: 1.25, fireweed: 1.2, mushroom: 0.55 };
export const PLANT_KINDS = [
  { id: 'fern', name: 'Папоротник' }, { id: 'moss', name: 'Мох' }, { id: 'bush', name: 'Черничник' }, { id: 'shrub', name: 'Кустарник' },
  { id: 'meadow', name: 'Разнотравье' }, { id: 'fireweed', name: 'Иван-чай' }, { id: 'mushroom', name: 'Гриб' }, { id: 'vine', name: 'Лиана' },
];
const family = (k) => (FOREST.has(k) ? 'forest' : FLOWER.has(k) ? 'flower' : k);
const link = (a, b) => a.k !== 'vine' && b.k !== 'vine' && family(a.k) === family(b.k) && Math.hypot(a.x - b.x, a.z - b.z) < 1.9;

export function plantGroups(list) {
  const seen = new Set(), out = [];
  for (const p of list) {
    if (seen.has(p) || p.k === 'vine') continue;
    const comp = [], st = [p]; seen.add(p);
    while (st.length) { const c = st.pop(); comp.push(c); for (const q of list) if (!seen.has(q) && link(c, q)) { seen.add(q); st.push(q); } }
    out.push(comp);
  }
  return out;
}
export function vineGroups(list) {
  const vs = list.filter((p) => p.k === 'vine'), seen = new Set(), out = [];
  for (const p of vs) {
    if (seen.has(p)) continue; const comp = [], st = [p]; seen.add(p);
    while (st.length) { const c = st.pop(); comp.push(c); for (const q of vs) if (!seen.has(q) && q.host === c.host && Math.hypot(q.x - c.x, q.z - c.z) < 1.65) { seen.add(q); st.push(q); } }
    out.push(comp);
  }
  return out;
}
export function describePlants(comp) {
  const kinds = new Set(comp.map((p) => p.k)), n = comp.length;
  if (n === 1) return { name: PLANTS[comp[0].k].name, rule: null };
  if (kinds.size === 1) {
    const k = comp[0].k;
    if (k === 'fern') return { name: 'Папоротниковая заросль', rule: 'pl_fern' };
    if (k === 'moss') return { name: 'Моховой ковёр', rule: 'pl_moss' };
    if (k === 'bush') return n >= 3 ? { name: 'Ягодник', rule: 'pl_bush' } : { name: 'Двойной черничник', rule: 'pl_bush' };
    if (k === 'shrub') return { name: 'Куртина кустарника', rule: 'pl_shrub' };
    if (k === 'mushroom') return n >= 4 ? { name: 'Грибное кольцо', rule: 'pl_mush', ring: true } : { name: 'Грибной выводок', rule: 'pl_mush' };
  }
  if (family(comp[0].k) === 'flower') return { name: 'Цветочная поляна', rule: 'pl_flower' };
  return { name: 'Подлесок', rule: 'pl_mix' };
}

export class PlantMod {
  constructor(host) {
    this.host = host; this.id = 'plants'; this.name = 'Растения'; this.kinds = PLANT_KINDS;
    this.site = { x: 21, z: 4, dist: 9.5, yaw: -0.3, pitch: 0.7 };
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.pieces = []; this.nid = 1; this.hist = []; this.inst = new Map(); this.meshes = {}; this.time = 0; this.dirty = true;
    this.bedMat = vcMat({ side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    this.bed = new THREE.Mesh(new THREE.BufferGeometry(), this.bedMat); this.bed.frustumCulled = false; this.bed.renderOrder = 1; this.group.add(this.bed);
    for (const k of PLANT_KINDS.map((p) => p.id)) {
      const P = PLANTS[k], m = new THREE.InstancedMesh(plantGeometry(k), plantMat(P.sway, P.hang), 900); m.count = 0; m.frustumCulled = false; m.castShadow = P.cast; m.receiveShadow = true; this.group.add(m); this.meshes[k] = m;
    }
    // опоры для лиан: беседка (две стойки и балка) и столб с кронштейном
    this.hosts = [{ id: 'beam', a: [-4, -3.4], b: [3.5, -3.4], y: 3.0, name: 'балка' }, { id: 'post', a: [5.2, -1.2], b: [6.8, -1.2], y: 2.6, name: 'кронштейн' }];
    this.hostMesh = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.hostMesh.castShadow = true; this.group.add(this.hostMesh);
    this.hostBuilt = false; this.ghost = null;
  }
  enter() { this.group.visible = true; if (!this.hostBuilt) this.buildHosts(); }
  leave() { this.group.visible = false; }
  occupies(x, z) { return this.pieces.some((p) => Math.hypot(p.x - x, p.z - z) < 1.6) || this.hosts.some((h) => { const [ax, az] = this.abs(h.a), [bx, bz] = this.abs(h.b); return Math.hypot((ax + bx) / 2 - x, (az + bz) / 2 - z) < 5; }); }
  abs(p) { return [this.site.x + p[0], this.site.z + p[1]]; }
  buildHosts() {
    const g = new G(13); g.jit = 0.04;
    for (const h of this.hosts) {
      const [ax, az] = this.abs(h.a), [bx, bz] = this.abs(h.b);
      for (const [x, z] of [[ax, az], [bx, bz]]) { const gy = heightAt(x, z); g.prism([x, gy - 0.3, z], [x, gy + h.y + 0.15, z], 0.17, 0x4c3a24, 8, 1, 0x6a5233, true); g.blob(x, gy + 0.05, z, 0.35, 0x4e5660, { sy: 0.5, detail: 1, noise: 0.15, seed: 4, top: 0x7e8a96 }); }
      const ya = heightAt(ax, az) + h.y, yb = heightAt(bx, bz) + h.y;
      g.beam([ax, ya + 0.1, az], [bx, yb + 0.1, bz], 0.22, 0.24, 0x4c3a24, 0x6a5233);
      g.beam([ax, ya - 0.35, az], [lerp(ax, bx, 0.12), ya + 0.05, lerp(az, bz, 0.12)], 0.1, 0.1, 0x4c3a24);
      g.beam([bx, yb - 0.35, bz], [lerp(bx, ax, 0.12), yb + 0.05, lerp(bz, az, 0.12)], 0.1, 0.1, 0x4c3a24);
    }
    this.hostMesh.geometry = g.build(); this.hostBuilt = true;
  }
  hostAt(x, z) {
    let best = null, bd = 1.5;
    for (const h of this.hosts) { const [ax, az] = this.abs(h.a), [bx, bz] = this.abs(h.b), dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0.03, 0.97), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = { h, x: px, z: pz, y: heightAt(px, pz) + h.y }; } }
    return best;
  }
  clear() { this.pieces.length = 0; this.hist.length = 0; this.sync(); }
  undo() { const id = this.hist.pop(); if (id == null) return 'Нечего отменять'; this.pieces = this.pieces.filter((p) => p.id !== id); this.sync(); return null; }
  sync() { this.dirty = true; this.host.changed(); }
  rel(x, z) { return [this.site.x + x, this.site.z + z]; }
  check(kind, x, z) {
    if (Math.abs(x - this.site.x) > 12 || Math.abs(z - this.site.z) > 10) return 'за площадкой';
    if (heightAt(x, z) < -0.05) return 'вода: сухие растения здесь не растут';
    if (kind === 'vine' && !this.hostAt(x, z)) return 'лиане нужна опора: балка или кронштейн';
    if (this.pieces.length > 40) return 'достаточно посадок';
    return null;
  }
  addPiece(k, x, z, extra = {}) { const p = { id: this.nid++, k, x, z, born: this.time, ...extra }; this.pieces.push(p); this.hist.push(p.id); this.sync(); return p; }
  click(kind, p) {
    const err = this.check(kind, p.x, p.z); if (err) return err;
    if (kind === 'vine') return this.clickVine(p);
    const n0 = plantGroups(this.pieces).find((c) => c.some((q) => link(q, { k: kind, x: p.x, z: p.z })));
    const pc = this.addPiece(kind, p.x, p.z);
    const comp = plantGroups(this.pieces).find((c) => c.includes(pc)), d = describePlants(comp);
    if (comp.length > 1) { this.host.toast('Соединено: ' + d.name); this.host.burst(p.x, p.z); }
    return null;
  }
  clickVine(p) {
    const h = this.hostAt(p.x, p.z), same = this.pieces.find((q) => q.k === 'vine' && q.host === h.h.id && Math.hypot(q.x - h.x, q.z - h.z) < 0.4);
    if (same) { if (same.len >= 5) return 'лиана уже длиной 5 м'; same.len = Math.min(5, same.len + 1.4); same.grow = this.time; this.host.toast('Лиана удлинилась до ' + same.len.toFixed(1) + ' м'); this.sync(); return null; }
    const pc = this.addPiece('vine', h.x, h.z, { host: h.h.id, y: h.y, len: 1.5 });
    const comp = vineGroups(this.pieces).find((c) => c.includes(pc)); if (comp.length > 1) this.host.toast('Соединено: завеса из лиан');
    return null;
  }
  hover(kind, p) {
    const err = this.check(kind, p.x, p.z);
    this.ghost = this.ghost || new THREE.Group();
    let text = null, parts = [], rule = null, geo = null;
    if (kind === 'vine') {
      const h = this.hostAt(p.x, p.z);
      if (h) { const same = this.pieces.find((q) => q.k === 'vine' && q.host === h.h.id && Math.hypot(q.x - h.x, q.z - h.z) < 0.4); const near = vineGroups(this.pieces.concat([{ k: 'vine', x: h.x, z: h.z, host: h.h.id }])).find((c) => c.some((q) => q.id === undefined));
        if (same) { text = 'будет соединено: лиана удлинится до ' + Math.min(5, same.len + 1.4).toFixed(1) + ' м'; rule = 'pl_vine'; parts = [[same.x, same.z]]; }
        else if (near && near.length > 1) { text = 'будет соединено: завеса из лиан (' + near.length + ' плети)'; rule = 'pl_curtain'; parts = near.filter((q) => q.id !== undefined).map((q) => [q.x, q.z]); }
        const len = same ? Math.min(5, same.len + 1.4) : 1.5, gg = new G(2); gg.jit = 0; for (const o of [-0.2, 0, 0.2]) { gg.prism([h.x + o, h.y, h.z], [h.x + o, h.y - len, h.z], 0.03, 0xffffff, 4, 1, 0xffffff, false); } geo = gg.build(); this.ghostVine = true;
      } else this.ghostVine = null;
      return { ok: !err, err, text, geo, parts, rule };
    }
    this.ghostVine = null;
    const cand = { id: -1, k: kind, x: Math.round(p.x * 10) / 10, z: Math.round(p.z * 10) / 10 };
    const comp = plantGroups(this.pieces.concat([cand])).find((c) => c.includes(cand)), d = describePlants(comp);
    if (comp.length > 1) { text = 'будет соединено: ' + d.name + ' (' + comp.length + ' посадок)'; rule = d.rule; parts = comp.filter((q) => q !== cand).map((q) => [q.x, q.z]); }
    return { ok: !err, err, text, geo: this.discGeo(cand.x, cand.z, comp.length > 1 ? 1.5 : 0.8), parts, rule };
  }
  discGeo(x, z, r) { const g = new G(1); g.jit = 0; const seg = 20; for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.283, a1 = (i + 1) / seg * 6.283; const P = (a) => [x + Math.cos(a) * r, heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r) + 0.08, z + Math.sin(a) * r]; g.tri([x, heightAt(x, z) + 0.08, z], P(a0), P(a1), 0xffffff); } return g.build(); }
  step(s) {
    if (s.pc) { const [x, z] = this.rel(s.pc.x, s.pc.z); if (s.pc.k === 'vine') { const h = this.hostAt(x, z); if (!h) return; if (s.pc.extend) { const same = this.pieces.find((q) => q.k === 'vine' && Math.hypot(q.x - h.x, q.z - h.z) < 0.4); if (same) { same.len = Math.min(5, same.len + 1.4); same.grow = this.time; this.sync(); return; } } this.addPiece('vine', h.x, h.z, { host: h.h.id, y: h.y, len: s.pc.len || 1.5 }); } else this.addPiece(s.pc.k, x, z); }
  }
  // ---- пересборка инстансов
  rebuild() {
    this.dirty = false;
    const want = new Map(); // key → {k,x,y,z,sc,sy,ry,birth,grow}
    const bed = new G(5); bed.jit = 0;
    const comps = plantGroups(this.pieces);
    for (const comp of comps) {
      const d = describePlants(comp), cx = comp.reduce((s, q) => s + q.x, 0) / comp.length, cz = comp.reduce((s, q) => s + q.z, 0) / comp.length;
      const reach = (q) => REACH[q.k] * (comp.length === 1 ? 0.55 : 1);
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of comp) { const r = reach(q) + 0.5; x0 = Math.min(x0, q.x - r); x1 = Math.max(x1, q.x + r); z0 = Math.min(z0, q.z - r); z1 = Math.max(z1, q.z + r); }
      if (d.ring) {
        const mean = clamp(comp.reduce((s, q) => s + Math.hypot(q.x - cx, q.z - cz), 0) / comp.length, 0.8, 1.6), N = 11;
        for (let i = 0; i < N; i++) { const a = i / N * 6.283 + 0.3, x = cx + Math.cos(a) * mean, z = cz + Math.sin(a) * mean; const nearest = comp.reduce((b, q) => (Math.hypot(q.x - x, q.z - z) < Math.hypot(b.x - x, b.z - z) ? q : b)); want.set('r' + comp[0].id + ':' + i, { k: 'mushroom', x, z, sc: 0.9 + hash2(i, 3) * 0.5, ry: hash2(i, 5) * 6.28, birth: nearest.born + 0.15 * Math.hypot(nearest.x - x, nearest.z - z) }); }
      } else {
        const C = 0.42;
        for (let gx = Math.floor(x0 / C); gx <= Math.ceil(x1 / C); gx++) for (let gz = Math.floor(z0 / C); gz <= Math.ceil(z1 / C); gz++) {
          const h1 = hash2(gx * 1.7, gz * 2.3), h2 = hash2(gx * 3.1 + 7, gz * 0.9), x = (gx + 0.5 + (h1 - 0.5) * 0.9) * C, z = (gz + 0.5 + (h2 - 0.5) * 0.9) * C;
          let nq = null, nd = 1e9; for (const q of comp) { const dd = Math.hypot(q.x - x, q.z - z) / reach(q); if (dd < nd) { nd = dd; nq = q; } }
          if (nd > 1.0 - (h1 * 0.25)) continue;
          let k = nq.k; const hh = hash2(gx * 5.3, gz * 1.1);
          if (family(k) === 'flower') k = hh < 0.3 ? 'fireweed' : 'meadow';
          else if (d.rule === 'pl_mix') { const edge = nd; k = hh < 0.35 ? 'moss' : hh < 0.65 ? 'fern' : edge < 0.55 ? 'bush' : 'moss'; if (nq.k === 'shrub' && nd < 0.5) k = 'shrub'; }
          else if (k === 'moss' && hh < 0.12) k = 'moss';
          // редкие: в густом ковре мох не стоит по три штуки в клетке
          if (k === 'moss' && hh > 0.55 && comp.length > 1) continue;
          if (k === 'fern' && comp.length > 1 && hh > 0.6) continue;
          if (k === 'meadow' && hh > 0.8) continue;
          const P = PLANTS[k], s = lerp(P.s[0], P.s[1], hash2(gx, gz * 2)) * (comp.length > 1 ? 1 + 0.25 * (1 - nd) : 0.85);
          want.set(k + ':' + gx + ',' + gz, { k, x, z, sc: s, ry: hh * 6.28, birth: nq.born + 0.35 * Math.hypot(nq.x - x, nq.z - z) + hash2(gx, gz) * 0.2 });
        }
        // подстилка под зарослью
        if (comp.length > 1 || true) {
          const cc = d.rule === 'pl_moss' ? [0x2c3d22, 0x3c5230] : d.rule === 'pl_flower' ? [0x34452a, 0x44582f] : [0x28351f, 0x354628];
          for (const q of comp) { const r = reach(q) * 0.85, seg = 16; for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.283, a1 = (i + 1) / seg * 6.283; const P1 = (a) => [q.x + Math.cos(a) * r, heightAt(q.x + Math.cos(a) * r, q.z + Math.sin(a) * r) + 0.03, q.z + Math.sin(a) * r]; bed.tri([q.x, heightAt(q.x, q.z) + 0.03, q.z], P1(a0), P1(a1), cc[1], cc[0], cc[0]); } }
        }
      }
    }
    // лианы
    for (const comp of vineGroups(this.pieces)) {
      const sorted = comp.slice().sort((a, b) => a.x - b.x);
      for (const q of sorted) want.set('v' + q.id, { k: 'vine', x: q.x, z: q.z, y: q.y, len: q.len, birth: q.born, grow: q.grow, ry: 0.3 + hash2(q.id, 1) });
      // завеса: между соседними лианами достраиваются плети
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.round(d / 0.42);
        for (let j = 1; j < n; j++) { const t = j / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t), L = lerp(a.len, b.len, t) * (0.8 + 0.4 * hash2(i * 7 + j, 2)); want.set('vc' + a.id + '_' + j, { k: 'vine', x, z, y: lerp(a.y, b.y, t), len: L, birth: Math.max(a.born, b.born) + 0.3 + j * 0.12, ry: hash2(j, 9) * 6.28 }); }
      }
    }
    // сохранить время рождения уже существующих
    for (const [k, v] of want) { const o = this.inst.get(k); if (o) { v.birth = o.birth; if (o.k === v.k && v.k === 'vine' && v.grow !== undefined && o.len !== v.len) { v.prevLen = o.len; v.growT = this.time; } else if (o.prevLen !== undefined) { v.prevLen = o.prevLen; v.growT = o.growT; } } }
    this.inst = want; this.anim = true;
    const og = this.bed.geometry; this.bed.geometry = bed.count ? bed.build() : new THREE.BufferGeometry(); og.dispose();
  }
  update(dt) {
    this.time += dt;
    if (this.dirty) this.rebuild();
    if (!this.anim) return;
    const idx = {}; for (const k in this.meshes) idx[k] = 0;
    let still = false; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (const v of this.inst.values()) {
      const m = this.meshes[v.k]; if (!m || idx[v.k] >= 900) continue;
      const age = this.time - v.birth; if (age < 0) { still = true; continue; }
      const e = clamp(age / 0.8, 0, 1), ee = 1 - Math.pow(1 - e, 3); if (e < 1) still = true;
      q.setFromAxisAngle(up, v.ry);
      if (v.k === 'vine') {
        let L = v.len; if (v.prevLen !== undefined) { const t = clamp((this.time - v.growT) / 1.1, 0, 1); L = lerp(v.prevLen, v.len, 1 - Math.pow(1 - t, 2)); if (t < 1) still = true; }
        const yg = clamp((age) / 1.4, 0, 1); if (yg < 1) still = true;
        pos.set(v.x, v.y, v.z); sc.set(1.5, Math.max(0.02, L / 0.85 * (1 - Math.pow(1 - yg, 3))), 1.5);
      } else { pos.set(v.x, heightAt(v.x, v.z), v.z); const s = v.sc * ee; sc.set(s, s * (0.35 + 0.65 * ee), s); }
      m4.compose(pos, q, sc); m.setMatrixAt(idx[v.k]++, m4);
    }
    for (const k in this.meshes) { const m = this.meshes[k]; m.count = idx[k]; m.instanceMatrix.needsUpdate = true; }
    this.anim = still;
  }
}
