// Общая сцена: земля, вода, деревья, деревня. Одна на все вкладки.
import * as THREE from 'three';
import { G, rng, clamp, lerp, smooth, fbm, hash2, col, mixCol } from './kit.js';
import { KEEP_CLEAR, heightAt, zoneAt, forestEdge, slopeAt, roadDist, softAt, WATER_Y, HALF, village, pad, ruin, hill, FIRE, pond } from './terrain.js';
import { vcMat, makeWaterMaterial, toonMat } from './core.js';
import { Solids } from './solids.js';
import { placeHut, well, barrel, stump, woodpile, campfire, bench, hay, crate } from './buildings.js';

// ---------------------------------------------------------------- деревья
export function treeGeo(kind, seed = 1) {
  const g = new G(seed * 7 + 1); g.jit = 0.06; const r = rng(seed * 13 + 5);
  if (kind === 'spruce') {
    g.prism([0, -0.2, 0], [0, 1.6, 0], 0.2, 0x4a3322, 7, 0.7, 0x5a4030);
    const tiers = 6;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1), y = 1.0 + i * 1.05, R = lerp(1.75, 0.55, t), H = lerp(2.4, 1.5, t);
      const c0 = mixCol(0x142e22, 0x1c3d2c, t).clone(), c1 = mixCol(0x2a5a40, 0x3d7a58, t).clone();
      const n = 9;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * 6.28 + i * 0.5, a1 = ((k + 1) / n) * 6.28 + i * 0.5, rr = R * (0.85 + r() * 0.3), rr2 = R * (0.85 + r() * 0.3);
        const tip = [0, y + H, 0];
        const lo = R * 0.15;
        g.tri([Math.cos(a0) * rr, y, Math.sin(a0) * rr], [Math.cos(a1) * rr2, y, Math.sin(a1) * rr2], tip, c0, c0, c1);
        g.tri([Math.cos(a0) * rr, y, Math.sin(a0) * rr], [Math.cos(a0 + 0.2) * rr * 0.55, y - 0.35, Math.sin(a0 + 0.2) * rr * 0.55], [Math.cos(a1) * rr2, y, Math.sin(a1) * rr2], 0x0c1c15, 0x0c1c15, 0x0c1c15);
      }
    }
  } else if (kind === 'pine') {
    g.prism([0, -0.2, 0], [0.15, 5.6, 0.1], 0.2, 0x5e4230, 7, 0.6, 0x7a5a3a);
    for (const [x, y, z, rr] of [[0, 5.6, 0, 1.7], [1.1, 4.7, 0.5, 1.2], [-1.0, 4.4, -0.6, 1.1], [0.2, 6.5, -0.2, 1.2]])
      g.blob(x + 0.1, y, z, rr, 0x1d3d2a, { sy: 0.55, detail: 1, noise: 0.2, seed: Math.floor(x * 10 + y), top: 0x44744a });
  } else if (kind === 'birch') {
    g.prism([0, -0.2, 0], [0.1, 4.8, 0], 0.13, 0xc9ccc2, 6, 0.55, 0xd8dacf);
    for (let k = 0; k < 7; k++) g.prism([0.02, 0.5 + k * 0.6, 0], [0.03, 0.56 + k * 0.6, 0], 0.135 - k * 0.006, 0x25262a, 6, 1, 0x25262a, false);
    for (const [x, y, z, rr] of [[0, 4.6, 0, 1.3], [0.8, 3.9, 0.3, 0.95], [-0.8, 3.7, -0.3, 1.0], [0.1, 5.4, 0.1, 0.9]])
      g.blob(x + 0.1, y, z, rr, 0x3f6a38, { sy: 0.8, detail: 1, noise: 0.22, seed: Math.floor(x * 9 + y * 3), top: 0x8fb04e });
  } else { // dead
    g.prism([0, -0.2, 0], [0.1, 5.0, 0], 0.2, 0x3e3a34, 6, 0.3, 0x5a554c);
    for (let k = 0; k < 5; k++) { const a = k * 2.4 + 0.5, y = 2.0 + k * 0.6; g.prism([0.05, y, 0], [Math.cos(a) * 1.1, y + 0.7, Math.sin(a) * 1.1], 0.07, 0x3e3a34, 5, 0.3, 0x5a554c); }
  }
  return g.build();
}
const KIND_R = { spruce: 0.28, pine: 0.28, birch: 0.2, dead: 0.25 };
const TRUNK_R = { spruce: 0.2, pine: 0.2, birch: 0.13, dead: 0.2 }; // радиус ствола в геометрии, умножается на масштаб дерева

export class World {
  constructor(stage) {
    this.stage = stage; this.scene = stage.scene;
    this.colliders = [];   // грубые круги/прямоугольники: для расстановки растений и проверки постройки
    this.solids = new Solids(); // точные преграды для героя и жителей
    this.floors = []; this.decks = [];
    this.trees = [];
    this.group = new THREE.Group(); this.scene.add(this.group);
    this.makeTerrain(); this.makeWater(); this.makeTrees(); this.makeVillage();
  }
  makeTerrain() {
    const SZ = 120, SEG = 240;
    const geo = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const ZC = { ground: 0x4a5f3a, slope: 0x5d5a40, shore: 0x6c6648, shallow: 0x44574a, water: 0x233f46, border: 0x2e4531, road: 0x7d6e50 };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z); pos.setY(i, h);
      let zone = zoneAt(x, z);
      const n = fbm(x * 0.5 + 3, z * 0.5 + 9), n2 = fbm(x * 0.12 + 40, z * 0.12 + 11);
      c.set(ZC[zone]);
      const e = forestEdge(x, z);
      if (zone === 'ground' || zone === 'border' || zone === 'slope') {
        c.lerp(col(0x6a7f44), smooth(0.5, 0.75, n2) * 0.4);                    // светлые лужайки
        c.lerp(col(0x1f3022), smooth(2, -5, e) * 0.75);                         // лесной полог темнее
        if (zone === 'slope') c.lerp(col(0x75725a), clamp((slopeAt(x, z) - 0.33) * 1.8, 0, 0.7));
        const dv = Math.hypot(x - village.x, z - village.z - 1);
        c.lerp(col(0x5b4d37), smooth(7.5, 3.5, dv) * (0.5 + 0.5 * n));         // утоптанная земля двора
        if (x > pad.x0 - 1 && x < pad.x1 + 1 && z > pad.z0 - 1 && z < pad.z1 + 1) c.lerp(col(0x5f5440), 0.45);
        if (softAt(x, z) > 0.5 && zone !== 'slope') c.lerp(col(0x3a3024), 0.65); // грязь
        const dr = Math.hypot(x - ruin.x, z - ruin.z); c.lerp(col(0x5a4a30), smooth(5, 1.5, dr) * 0.4 * n);
      }
      if (zone === 'shore') c.lerp(col(0x3c3326), 0.35 + 0.4 * n);
      if (zone === 'road') c.lerp(col(0x9a875f), n * 0.5);
      if (h > 4.2) c.lerp(col(0x6a6a5c), clamp((h - 4.2) * 0.4, 0, 0.5));
      c.multiplyScalar(0.88 + n * 0.28);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, toonMat({ vertexColors: true }));
    this.terrain.receiveShadow = true; this.terrain.castShadow = false;
    this.group.add(this.terrain);
  }
  makeWater() {
    const SEG = 120, S = 60; // только внутри участка, ячейка 0,5
    const verts = [], dep = [], idx = [];
    const step = (HALF * 2 + 8) / SEG;
    const at = (i, j) => { const x = -HALF - 4 + i * step, z = -HALF - 4 + j * step; return [x, z, heightAt(x, z)]; };
    const grid = [];
    for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) grid.push(at(i, j));
    const use = new Map();
    for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) {
      const q = [grid[j * (SEG + 1) + i], grid[j * (SEG + 1) + i + 1], grid[(j + 1) * (SEG + 1) + i + 1], grid[(j + 1) * (SEG + 1) + i]];
      if (Math.min(q[0][2], q[1][2], q[2][2], q[3][2]) > WATER_Y + 0.12) continue;
      const base = verts.length / 3;
      for (const p of q) { verts.push(p[0], WATER_Y, p[1]); dep.push(clamp(WATER_Y - p[2], -0.3, 1)); }
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('aDepth', new THREE.Float32BufferAttribute(dep, 1));
    geo.setIndex(idx);
    this.water = new THREE.Mesh(geo, makeWaterMaterial()); this.water.renderOrder = 2; this.water.frustumCulled = false;
    this.group.add(this.water);
  }
  makeTrees() {
    const r = rng(777);
    const list = [];
    const sp = 2.7;
    for (let gz = -46; gz <= 46; gz += sp) for (let gx = -46; gx <= 46; gx += sp) {
      const x = gx + (r() - 0.5) * sp * 0.9, z = gz + (r() - 0.5) * sp * 0.9;
      const inPlot = Math.abs(x) <= HALF && Math.abs(z) <= HALF;
      const e = inPlot ? forestEdge(x, z) : -6;
      let p = e < 0 ? 0.8 * smooth(0.5, -4, e) + 0.12 : (e < 7 ? 0.06 : 0.015);
      if (!inPlot) p = 0.95;
      if (r() > p) continue;
      const h = heightAt(x, z);
      if (h < 0.1 || h > 8) continue;
      if (inPlot) {
        if (roadDist(x, z) < 3.0) continue;
        if (Math.hypot(x - village.x, z - village.z) < 10.5) continue;
        if (KEEP_CLEAR.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
        if (x > pad.x0 - 2.5 && x < pad.x1 + 2.5 && z > pad.z0 - 2.5 && z < pad.z1 + 2.5) continue;
        if (Math.hypot(x - ruin.x, z - ruin.z) < 3.4) continue;
        if (slopeAt(x, z) > 0.6) continue;
        if (Math.abs(x - 0) < 4 && Math.abs(z - 4) < 4) continue;
      }
      const q = r();
      const kind = q < 0.52 ? 'spruce' : q < 0.74 ? 'pine' : q < 0.9 ? 'birch' : 'dead';
      list.push({ x, z, kind, s: 0.8 + r() * 0.6, ry: r() * 6.28, r: KIND_R[kind] * (0.8 + r() * 0.6), seed: Math.floor(r() * 5) });
    }
    this.trees = list;
    this.treeMeshes = {};
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    const mat = vcMat({ side: THREE.DoubleSide });
    for (const kind of ['spruce', 'pine', 'birch', 'dead']) {
      const arr = list.filter((t) => t.kind === kind);
      if (!arr.length) continue;
      const mesh = new THREE.InstancedMesh(treeGeo(kind, kind.length), mat, arr.length);
      arr.forEach((t, i) => {
        t.s = t.s; q4.setFromAxisAngle(up, t.ry); sc.set(t.s, t.s, t.s); ps.set(t.x, heightAt(t.x, t.z), t.z);
        m4.compose(ps, q4, sc); mesh.setMatrixAt(i, m4); t.h = ps.y; t.mesh = mesh; t.mi = i;
        if (Math.abs(t.x) < HALF + 2 && Math.abs(t.z) < HALF + 2) { this.colliders.push({ x: t.x, z: t.z, r: t.r * t.s * 1.1 + 0.15 }); t.solid = this.solids.circle(t.x, t.z, TRUNK_R[kind] * t.s + 0.1, 'ствол', 5); }
      });
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      this.group.add(mesh); this.treeMeshes[kind] = mesh;
    }
  }
  makeVillage() {
    const g = new G(21); g.jit = 0.05;
    const hy = (x, z) => heightAt(x, z);
    this.huts = [];
    const addHut = (x, z, rot, opt = {}) => {
      const y = hy(x, z) - 0.05;
      placeHut(g, { w: 4, d: 4, chimney: !opt.ruin, seed: Math.floor(x * 7 + z), ...opt }, x, y, z, rot);
      const hw = 2.05, hd = 2.05;
      this.colliders.push({ x0: x - hw - 0.3, x1: x + hw + 0.3, z0: z - hd - 0.3, z1: z + hd + 0.3 });
      this.huts.push({ x, z, w: 4, d: 4, rot, ruin: !!opt.ruin, y });
      // стены по реальной форме: проём двери 1,0 м на стороне +Z локальной системы избы, внутрь заходит только прихожая
      const a = rot * Math.PI / 2, S = this.solids, T = 0.2, H = 2.5;
      S.localBox(x, z, a, 0, -2, 2.25, T, 'стена избы', H);
      S.localBox(x, z, a, 2, 0, T, 2.25, 'стена избы', H);
      S.localBox(x, z, a, -2, 0, T, 2.25, 'стена избы', H);
      S.localBox(x, z, a, 1.4, 2, 0.9, T, 'стена избы', H);
      S.localBox(x, z, a, -1.4, 2, 0.9, T, 'стена избы', H);
      S.localBox(x, z, a, 0, -0.5, 1.85, 1.35, 'внутри избы', H);
      S.localBox(x, z, a, 0.55, 2.43, 0.06, 0.43, 'створка двери', 2.0);
      this.floors.push({ x, z, a, y: y + 0.2 });
    };
    addHut(-15.2, 5.0, 1);
    addHut(-9, 12.9, 2);
    addHut(-2.6, 7.4, 3);
    addHut(ruin.x, ruin.z, 0, { ruin: true });
    const Y = (x, z) => hy(x, z);
    well(g, -3.8, Y(-3.8, 14.2), 14.2); this.colliders.push({ x: -3.8, z: 14.2, r: 1.1 }); this.solids.circle(-3.8, 14.2, 0.95, 'колодец', 0.8);
    campfire(g, FIRE.x, Y(FIRE.x, FIRE.z), FIRE.z); this.colliders.push({ x: FIRE.x, z: FIRE.z, r: 0.95 }); this.solids.circle(FIRE.x, FIRE.z, 0.95, 'кольцо костра', 0.4);
    woodpile(g, -17.6, Y(-17.6, 9.8), 9.8, 0.2); this.colliders.push({ x0: -18.7, x1: -16.5, z0: 9.2, z1: 10.4 }); this.solids.box(-17.6, 9.8, 0.95, 0.55, 0.2, 'поленница', 1.1);
    barrel(g, -18.2, Y(-18.2, 2.0), 2.0); barrel(g, -17.5, Y(-17.5, 2.6), 2.6, 0.9);
    this.colliders.push({ x: -18.2, z: 2.0, r: 0.5 }, { x: -17.5, z: 2.6, r: 0.5 }); this.solids.circle(-18.2, 2.0, 0.4, 'бочка', 0.9); this.solids.circle(-17.5, 2.6, 0.4, 'бочка', 0.9);
    hay(g, -12.8, Y(-12.8, 13.2), 13.2, 3); this.colliders.push({ x: -12.8, z: 13.2, r: 1.0 }); this.solids.circle(-12.8, 13.2, 0.9, 'стог', 1.95);
    bench(g, -9, Y(-9, 3.5), 3.5, 0); bench(g, -6.2, Y(-6.2, 6.2), 6.2, Math.PI / 2); bench(g, -11.9, Y(-11.9, 6.2), 6.2, Math.PI / 2);
    this.benches = [[-9, 3.5, 0], [-6.2, 6.2, Math.PI / 2], [-11.9, 6.2, Math.PI / 2]];
    for (const [bx, bz, br] of this.benches) { this.solids.box(bx, bz, 0.9, 0.2, br, 'лавка', 0.45); this.colliders.push({ x0: bx - (br ? 0.3 : 1.0), x1: bx + (br ? 0.3 : 1.0), z0: bz - (br ? 1.0 : 0.3), z1: bz + (br ? 1.0 : 0.3) }); }
    // woodcutter stump
    this.solids.circle(-14.4, 9.6, 0.45, 'колода', 0.55);
    this.mesh = new THREE.Mesh(g.build(), vcMat({ side: THREE.DoubleSide }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.group.add(this.mesh);
    this.treeCircles = this.trees.map((t) => ({ x: t.x, z: t.z, r: t.r * t.s * 1.0 + 1.0 }));
  }
  blockers() {
    const out = [];
    for (const c of this.colliders) out.push(c.r != null ? { x: c.x, z: c.z, r: c.r + 0.1 } : { x0: c.x0, x1: c.x1, z0: c.z0, z1: c.z1 });
    out.push({ x0: pad.x0 + 0.5, x1: pad.x1 - 0.5, z0: pad.z0 + 0.5, z1: pad.z1 - 0.5 });
    out.push({ x: village.x, z: village.z, r: 3.2 });
    return out;
  }
  // столкновение окружностью радиуса rad: возвращает скорректированную позицию
  collide(x, z, rad, extra = []) { return this.solids.resolve(x, z, rad, extra); }
  // крупные растения и камни тоже преграды (мелкая трава, цветы, черничник проходимы)
  addPlantSolids(pts) {
    const K = { stones: 0.42, cobble: 0.42, boulder: 0.42, crag: 0.45, giant: 0.4, runestone: 0.22, shrub: 0.3 };
    const H = { stones: 0.5, cobble: 0.5, boulder: 0.9, crag: 1.0, giant: 3.0, runestone: 1.3, shrub: 1.6 };
    for (const id in K) for (const p of pts[id] || []) {
      const r = K[id] * p.s * (id === 'shrub' ? 1 : 0.95);
      if (r < 0.22 || Math.abs(p.x) > HALF + 1 || Math.abs(p.z) > HALF + 1) continue;
      p.solid = this.solids.circle(p.x, p.z, r, id, H[id] * p.s, id); p.solidR = r;
    }
  }
  // срубить (убрать) деревья в круге: ров, яма, стройка
  cutTrees(x, z, r) {
    const out = []; const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const t of this.trees) {
      if (t.cut || !t.mesh) continue;
      if (Math.hypot(t.x - x, t.z - z) < r + (t.r || 0.3)) { t.cut = true; t.mesh.setMatrixAt(t.mi, m); t.mesh.instanceMatrix.needsUpdate = true; if (t.solid) t.solid.off = true; out.push(t); }
    }
    return out;
  }
  // временно спрятать деревья в круге (песочницы вкладки 3)
  hideTrees(x, z, r) {
    const m = new THREE.Matrix4().makeScale(0, 0, 0), a = new THREE.Matrix4();
    for (const t of this.trees) {
      if (t.cut || t.hid || !t.mesh) continue;
      if (Math.hypot(t.x - x, t.z - z) < r + (t.r || 0.3)) { t.mesh.getMatrixAt(t.mi, a); t.m0 = a.clone(); t.mesh.setMatrixAt(t.mi, m); t.mesh.instanceMatrix.needsUpdate = true; if (t.solid) t.solid.off = true; t.hid = true; }
    }
  }
  restoreTrees() {
    for (const t of this.trees) { if (!t.hid) continue; t.hid = false; if (t.cut) continue; t.mesh.setMatrixAt(t.mi, t.m0); t.mesh.instanceMatrix.needsUpdate = true; if (t.solid) t.solid.off = false; }
  }
  // глубина воды в точке (естественная и в ямах)
  waterDepthAt(x, z) { return this.dig ? this.dig.depthAt(x, z) : Math.max(0, WATER_Y - heightAt(x, z)); }
  // пол внутри прихожей избы (фундамент выше земли)
  floorAt(x, z) {
    for (const d of this.decks) {
      const dx = d.bx - d.ax, dz = d.bz - d.az, L2 = dx * dx + dz * dz; if (L2 < 1e-6) continue;
      const t = ((x - d.ax) * dx + (z - d.az) * dz) / L2; if (t < -0.02 || t > 1.02) continue;
      const px = d.ax + dx * t, pz = d.az + dz * t; if (Math.hypot(x - px, z - pz) < d.hw) return d.ya + (d.yb - d.ya) * clamp(t, 0, 1);
    }
    for (const f of this.floors) {
      const rx = x - f.x, rz = z - f.z, c = Math.cos(f.a), s = Math.sin(f.a);
      const lx = rx * c - rz * s, lz = rx * s + rz * c;
      if (Math.abs(lx) < 2.1 && Math.abs(lz) < 2.1) return f.y;
    }
    return null;
  }
}
