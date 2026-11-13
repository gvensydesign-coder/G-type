// Лес: ели, сухостой, берёзы. Деревья занимают клетки (occ = -1) и мешают стройке,
// их можно вырубить (даёт брёвна). Сетки собраны по наделам 32×32 м и пересобираются при вырубке.
import * as THREE from 'three';
import { Kit, PAT, COL } from './kit.js';
import { makeToonMaterial } from './toon.js';
import { SECTOR } from './buildsys.js';

export class Forest {
  constructor(sys, scene) {
    this.sys = sys; this.map = sys.map; this.scene = scene;
    this.trees = new Map();   // key cell index -> {cx, cz, kind, s, seed}
    this.chunks = new Map();  // sector key -> mesh
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
      const kind = r < 0.78 ? 'spruce' : r < 0.9 ? 'birch' : 'dead';
      this.trees.set(i, { cx: jx, cz: jz, kind, s: 0.75 + rnd() * 0.6, seed: Math.floor(rnd() * 1e6) });
      this.sys.occ[i] = -1;
    }
    for (let sz = 0; sz < this.sys.SZ; sz++) for (let sx = 0; sx < this.sys.SX; sx++) this.rebuildChunk(sx, sz);
  }
  rebuildChunk(sx, sz) {
    const key = sx + ',' + sz, old = this.chunks.get(key);
    if (old) { this.group.remove(old); old.geometry.dispose(); this.chunks.delete(key); }
    const k = new Kit(sx * 97 + sz * 13 + 1); k.stage = 1;
    let n = 0;
    for (let cz = sz * SECTOR; cz < (sz + 1) * SECTOR; cz++) for (let cx = sx * SECTOR; cx < (sx + 1) * SECTOR; cx++) {
      const t = this.trees.get(cz * this.map.width + cx); if (!t) continue;
      const w = this.map.cellToWorld(cx, cz), y = this.map.heightAtCell(cx, cz), s = t.s;
      k.seed = t.seed + 1;
      if (t.kind === 'spruce') {
        k.cyl(w.x, y - 0.2, w.z, 0.18 * s, 1.6 * s, { color: COL.logDark, pat: PAT.logs, seg: 5 });
        const tiers = 4, H = (6 + k.rr(0, 4)) * s, g = k.pick([0x2c4a38, 0x27413a, 0x34503a, 0x2a3f33]);
        for (let i = 0; i < tiers; i++) {
          const f = i / tiers, r = (1 - f * 0.78) * 1.9 * s, h = H * 0.42;
          k.cone(w.x, y + 1.1 * s + f * H * 0.68, w.z, r, h, { color: g, pat: PAT.thatch, seg: 7, ry: k.rr(0, 6) });
        }
      } else if (t.kind === 'birch') {
        k.cyl(w.x, y - 0.2, w.z, 0.12 * s, 5.5 * s, { color: 0xd8d0c0, pat: PAT.bone, seg: 6 });
        for (let i = 0; i < 3; i++) k.sphere(w.x + k.rr(-0.8, 0.8) * s, y + (4 + i * 0.9) * s, w.z + k.rr(-0.8, 0.8) * s, (1.3 - i * 0.2) * s, { color: k.pick([0x6a7a3a, 0x7a8440, 0x5e7036]), pat: PAT.thatch, seg: 7, sy: 1.15 });
      } else {
        k.cyl(w.x, y - 0.2, w.z, 0.2 * s, 5 * s, { color: 0x3e3630, pat: PAT.logs, seg: 5, r2: 0.05 });
        for (let i = 0; i < 4; i++) k.box(w.x, y + (2.2 + i * 0.7) * s, w.z, 0.07 * s, 1.6 * s, 0.07 * s, { color: 0x3e3630, rz: k.rr(0.6, 1.1) * (i % 2 ? 1 : -1), ry: k.rr(0, 6) });
      }
      n++;
    }
    if (!n) { k.build().dispose(); return; }
    const mesh = new THREE.Mesh(k.build(), this.mat);
    this.group.add(mesh); this.chunks.set(key, mesh);
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
    return n;
  }
  countRect(x0, z0, w, d) { let n = 0, own = 0; for (let cz = z0; cz < z0 + d; cz++) for (let cx = x0; cx < x0 + w; cx++) if (this.trees.has(cz * this.map.width + cx)) { n++; if (this.sys.isOwnedCell(cx, cz)) own++; } return { n, own }; }
}
