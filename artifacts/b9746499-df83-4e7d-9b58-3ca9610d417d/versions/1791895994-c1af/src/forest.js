// Лес: ели, сосны, дубы, берёзы, сухостой, пни (формы — trees.js). Деревья занимают клетки (occ = -1) и мешают стройке,
// их можно вырубить (даёт брёвна). Сетки собраны по наделам 32×32 м и пересобираются при вырубке.
import * as THREE from 'three';
import { Kit, PAT, COL } from './kit.js';
import { makeToonMaterial } from './toon.js';
import { SECTOR } from './buildsys.js';
import { buildTree } from './trees.js';

export class Forest {
  constructor(sys, scene) {
    this.sys = sys; this.map = sys.map; this.scene = scene;
    this.trees = new Map();   // key cell index -> {cx, cz, kind, s, seed}
    this.chunks = new Map();  // sector key -> mesh (дальний вид)
    this.near = new Map();    // sector key -> mesh (подробный, вблизи камеры)
    this.nearR = 70;
    this.mat = makeToonMaterial({ side: THREE.DoubleSide });
    this.group = new THREE.Group(); scene.add(this.group);
  }
  // Расставить по шуму: густо у краёв карты и на севере, редко в деревне, не у дорог и воды
  plant(seed = 5, keepClear = []) {
    const m = this.map; let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const roadNear = (cx, cz, r) => { for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) { const k = m.zoneAtCell(cx + dx, cz + dz).key; if (k === 'road' || k === 'bridge' || k === 'shore' || k === 'water' || k === 'shallow') return true; } return false; };
    const noise = (x, z) => Math.sin(x * 0.045 + Math.sin(z * 0.03) * 2.2) * Math.sin(z * 0.05 + x * 0.013) + 0.5 * Math.sin(x * 0.11 - z * 0.09);
    for (let cz = 2; cz < m.height - 2; cz += 2) for (let cx = 2; cx < m.width - 2; cx += 2) {
      const jx = cx + Math.floor(rnd() * 2), jz = cz + Math.floor(rnd() * 2);
      const z = m.zoneAtCell(jx, jz).key;
      if (z !== 'ground') continue;
      let dens = 0.25 + 0.35 * noise(jx, jz);
      const edge = Math.min(jx, m.width - jx, jz < 256 ? jz : 999, Math.abs(jx - 150) > 44 && jz > 250 ? 0 : 999);
      if (edge < 30) dens += (30 - edge) / 30 * 0.6;
      for (const c of keepClear) { const d = Math.hypot(jx - c.x, jz - c.z); if (d < c.r) dens -= (c.r - d) / c.r * 1.2; }
      if (rnd() > dens) continue;
      if (roadNear(jx, jz, 2)) continue;
      const i = jz * m.width + jx; if (this.sys.occ[i]) continue;
      const r = rnd();
      // дубы — на опушках и редколесье (низкая густота), великаны
      const oak = dens < 0.5 && rnd() < 0.12;
      const kind = oak ? 'oak' : r < 0.62 ? 'spruce' : r < 0.74 ? 'pine' : r < 0.88 ? 'birch' : r < 0.95 ? 'dead' : 'stump';
      this.trees.set(i, { cx: jx, cz: jz, kind, s: oak ? 1.0 + rnd() * 0.5 : 0.75 + rnd() * 0.6, seed: Math.floor(rnd() * 1e6) });
      this.sys.occ[i] = -1;
    }
    for (let sz = 0; sz < this.sys.SZ; sz++) for (let sx = 0; sx < this.sys.SX; sx++) this.rebuildChunk(sx, sz);
  }
  // Надел строится в двух видах: дальний (lod 1: меньше граней, без корней и шишек) — всегда, ближний — по мере подхода камеры.
  rebuildChunk(sx, sz) {
    const key = sx + ',' + sz;
    for (const M of [this.chunks, this.near]) { const old = M.get(key); if (old) { this.group.remove(old); old.geometry.dispose(); M.delete(key); } }
    const mesh = this.buildChunk(sx, sz, 1);
    if (mesh) { this.group.add(mesh); this.chunks.set(key, mesh); }
  }
  buildChunk(sx, sz, lod) {
    const k = new Kit(sx * 97 + sz * 13 + 1); k.stage = 1; k.lod = lod;
    let n = 0;
    for (let cz = sz * SECTOR; cz < (sz + 1) * SECTOR; cz++) for (let cx = sx * SECTOR; cx < (sx + 1) * SECTOR; cx++) {
      const t = this.trees.get(cz * this.map.width + cx); if (!t) continue;
      const w = this.map.cellToWorld(cx, cz), y = this.map.heightAtCell(cx, cz), s = t.s;
      k.seed = t.seed + 1;
      buildTree(k, t.kind, w.x, y, w.z, s);
      n++;
    }
    if (!n) { k.build().dispose(); return null; }
    const mesh = new THREE.Mesh(k.build(), this.mat);
    mesh.userData.lod = lod;
    return mesh;
  }
  // Каждый кадр: наделы ближе nearR от камеры получают подробные деревья (не больше одного нового за кадр), дальние — простые.
  update(camPos, nearR = this.nearR) {
    const S = SECTOR * this.map.cellSize, ox = this.map.origin.x, oz = this.map.origin.z;
    let built = false;
    for (const [key, far] of this.chunks) {
      const [sx, sz] = key.split(',').map(Number);
      const d = Math.hypot(ox + (sx + 0.5) * S - camPos.x, oz + (sz + 0.5) * S - camPos.z) - S * 0.7;
      let nm = this.near.get(key);
      if (d < nearR && !nm && !built && nearR > 0) { nm = this.buildChunk(sx, sz, 0); if (nm) { this.group.add(nm); this.near.set(key, nm); } built = true; }
      if (nm && d > nearR + 40) { this.group.remove(nm); nm.geometry.dispose(); this.near.delete(key); nm = null; }
      far.visible = !nm; if (nm) nm.visible = true;
    }
    return built;
  }
  // Вырубить деревья в прямоугольнике (только на своей меже). Возвращает число деревьев.
  clearRect(x0, z0, w, d) {
    let n = 0; const dirty = new Set();
    for (let cz = z0; cz < z0 + d; cz++) for (let cx = x0; cx < x0 + w; cx++) {
      const i = cz * this.map.width + cx;
      if (!this.trees.has(i) || !this.sys.isOwnedCell(cx, cz)) continue;
      this.trees.delete(i); this.sys.occ[i] = 0; n++;
      dirty.add(Math.floor(cx / SECTOR) + ',' + Math.floor(cz / SECTOR));
    }
    for (const k of dirty) { const [a, b] = k.split(',').map(Number); this.rebuildChunk(a, b); }
    if (n) this.onCleared?.(x0, z0, w, d);   // хозяин убирает мох и грибы, нарисованные на срубленных деревьях
    return n;
  }
  countRect(x0, z0, w, d) { let n = 0, own = 0; for (let cz = z0; cz < z0 + d; cz++) for (let cx = x0; cx < x0 + w; cx++) if (this.trees.has(cz * this.map.width + cx)) { n++; if (this.sys.isOwnedCell(cx, cz)) own++; } return { n, own }; }
}
