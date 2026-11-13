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
      const kind = r < 0.62 ? 'spruce' : r < 0.74 ? 'pine' : r < 0.88 ? 'birch' : r < 0.95 ? 'dead' : 'stump';
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
      // качание: ствол чуть, крона сильнее — от земли у дерева
      k.swayBase = y; k.sway = 0;
      if (t.kind === 'spruce') {
        k.cyl(w.x, y - 0.2, w.z, 0.18 * s, 1.6 * s, { color: COL.logDark, pat: PAT.logs, seg: 5, sway: 0.002 });
        const tiers = 4 + (t.seed % 2), H = (6 + k.rr(0, 4)) * s, g = k.pick([0x1f4a40, 0x245a48, 0x2c5a3c, 0x1d3f3a, 0x2f5a30]);
        for (let i = 0; i < tiers; i++) {
          const f = i / tiers, r = (1 - f * 0.78) * 1.9 * s * k.rr(0.9, 1.1), h = H * 0.42;
          const tc = new THREE.Color(g).offsetHSL(0, 0, (f - 0.4) * 0.08).getHex();
          k.cone(w.x + k.rr(-0.08, 0.08), y + 1.1 * s + f * H * 0.68, w.z + k.rr(-0.08, 0.08), r, h, { color: tc, pat: PAT.thatch, seg: 7, ry: k.rr(0, 6), sway: 0.006, rz: k.rr(-0.05, 0.05) });
        }
      } else if (t.kind === 'pine') {
        // сосна: высокий рыжий ствол, крона облаками наверху, сухие сучки
        const H = (8 + k.rr(0, 4)) * s, lean = k.rr(-0.06, 0.06);
        k.cyl(w.x, y - 0.2, w.z, 0.2 * s, H, { color: 0x9a5a34, pat: PAT.bark, seg: 6, r2: 0.12 * s, rz: lean, sway: 0.003 });
        for (let i = 0; i < 3; i++) k.box(w.x, y + H * (0.3 + i * 0.1), w.z, 0.04, 0.6 * s, 0.04, { color: 0x4a3426, rz: k.rr(0.9, 1.3) * (i % 2 ? 1 : -1), ry: k.rr(0, 6) });
        for (let i = 0; i < 4; i++) {
          const hx = w.x - Math.sin(lean) * H * (0.78 + i * 0.06) + k.rr(-1, 1) * s, hz = w.z + k.rr(-1, 1) * s;
          k.lumpBox(hx, y + H * (0.72 + i * 0.07), hz, k.rr(1.6, 2.4) * s, k.rr(0.7, 1.1) * s, k.rr(1.4, 2.2) * s, { color: k.pick([0x2a4a34, 0x34583a, 0x2e5040]), pat: PAT.leaf, amp: 0.25 * s, cell: 0.5, sway: 0.008, keepBottom: false, jitter: 0 });
        }
      } else if (t.kind === 'birch') {
        k.cyl(w.x, y - 0.2, w.z, 0.12 * s, 5.5 * s, { color: 0xe0dccc, pat: PAT.bone, seg: 6, sway: 0.004 });
        for (let i = 0; i < 5; i++) k.box(w.x, y + k.rr(0.5, 4.5) * s, w.z, 0.27 * s, 0.05, 0.27 * s, { color: 0x2a2624, pat: PAT.dark, ry: k.rr(0, 6), sway: 0.004 }); // чёрные чечевички
        const col = k.pick([0xd9a23a, 0xe0b84a, 0xc8782e, 0xb8502a, 0x9aa03a, 0xd8c050]);
        for (let i = 0; i < 4; i++) k.lumpBox(w.x + k.rr(-0.8, 0.8) * s, y + (3.4 + i * 0.75) * s, w.z + k.rr(-0.8, 0.8) * s, (2.0 - i * 0.3) * s, 1.0 * s, (1.8 - i * 0.25) * s, { color: new THREE.Color(col).offsetHSL(k.rr(-0.02, 0.02), 0, k.rr(-0.06, 0.06)).getHex(), pat: PAT.leaf, amp: 0.2 * s, cell: 0.45, sway: 0.012, keepBottom: false, jitter: 0 });
      } else if (t.kind === 'dead') {
        k.cyl(w.x, y - 0.2, w.z, 0.2 * s, 5 * s, { color: 0x3e3630, pat: PAT.bark, seg: 5, r2: 0.05, sway: 0.002 });
        for (let i = 0; i < 4; i++) k.box(w.x, y + (2.2 + i * 0.7) * s, w.z, 0.07 * s, 1.6 * s, 0.07 * s, { color: 0x3e3630, rz: k.rr(0.6, 1.1) * (i % 2 ? 1 : -1), ry: k.rr(0, 6), sway: 0.004 });
      } else {
        // пень с опятами и упавший ствол
        k.cyl(w.x, y - 0.1, w.z, 0.32 * s, 0.5 * s, { color: 0x6a4a30, pat: PAT.logs, seg: 8, r2: 0.3 * s });
        for (let i = 0; i < 4; i++) k.sphere(w.x + k.rr(-0.3, 0.3) * s, y + k.rr(0.1, 0.35) * s, w.z + 0.3 * s, 0.07, { color: 0xc89a5a, pat: PAT.clay, sy: 0.5 });
        if (t.seed % 3 === 0) k.log(w.x + 1.6 * s, y + 0.18 * s, w.z, 0.2 * s, 3.2 * s, { color: 0x5a4434, ry: k.rr(0, 6) });
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
