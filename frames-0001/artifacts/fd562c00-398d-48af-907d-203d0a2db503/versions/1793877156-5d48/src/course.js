// Test course for movement animations: slopes, stairs, bumps, fences, a crate, a wall, a high ledge,
// a pond with a bridge. Everything is described analytically so ground queries are exact and cheap.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// solids: axis-aligned columns with a flat or sloped top
const S = [];
function box(x0, x1, z0, z1, y1, y0 = -2, name = '', mat = 'wood') { S.push({ x0, x1, z0, z1, y0, y1, kind: 'box', name, mat }); }
// ramp rising along axis ('z+','z-','x+','x-') from h0 to h1
function ramp(x0, x1, z0, z1, h0, h1, dir, name = '') { S.push({ x0, x1, z0, z1, y0: -2, h0, h1, dir, kind: 'ramp', name, mat: 'earth' }); }

// --- layout (metres). Start at the origin facing +Z.
// A. slopes: 15 deg up, platform, 30 deg down
ramp(-10, -7, 2, 8, 0, 1.6, 'z+', 'Склон 15°');
box(-10, -7, 8, 11, 1.6, -2, '', 'earth');
ramp(-10, -7, 11, 11 + 1.6 / Math.tan(30 * Math.PI / 180), 1.6, 0, 'z+', 'Склон 30°');
// B. stairs 18 cm up and down
const STEP = 0.18, RUN = 0.3;
for (let i = 0; i < 6; i++) box(-5, -2.5, 2 + i * RUN, 2 + (i + 1) * RUN, STEP * (i + 1), -2, i === 0 ? 'Ступени 18 см' : '', 'stone');
box(-5, -2.5, 3.8, 5.6, STEP * 6, -2, '', 'stone');
for (let i = 0; i < 6; i++) box(-5, -2.5, 5.6 + i * RUN, 5.6 + (i + 1) * RUN, STEP * (5 - i), -2, '', 'stone');
// D. low log and wattle fence (vaults)
box(0.5, 3.5, 3.0, 3.3, 0.55, -2, 'Бревно 0,55 м', 'log');
box(5, 8.5, 3.0, 3.12, 1.0, -2, 'Плетень 1 м', 'fence');
// E. crate (step up)
box(0.8, 2.6, 6.2, 7.4, 0.8, -2, 'Сундук 0,8 м', 'wood');
// F. wall 1.5 m (fast mantle), deep enough to stand on
box(5, 8.5, 6.4, 8.2, 1.5, -2, 'Стенка 1,5 м', 'stone');
// G. high ledge 2.3 m, 8 m long (jump, grab, hang, shimmy, pull up)
box(11, 19, 4.5, 7.5, 2.3, -2, 'Уступ 2,3 м', 'stone');
// H. pond 0.75 m deep and a bridge over it
const POND = { x0: 6, x1: 15, z0: 11, z1: 19, floor: -0.9, water: -0.15 };
box(3.5, 17.5, 14.6, 16.0, 0.32, 0.18, 'Мост', 'plank');
// C. bumpy ground
const BUMPS = { x0: -5, x1: 4, z0: 10, z1: 17 };

export const solids = S;
export const pond = POND;
export const bumpsZone = BUMPS;

function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function bumpH(x, z) {
  const B = BUMPS;
  const e = Math.min(x - B.x0, B.x1 - x, z - B.z0, B.z1 - z);
  if (e <= 0) return 0;
  const f = Math.min(1, e / 1.2);
  return (noise(x * 0.9, z * 0.9) * 0.34 + noise(x * 2.1 + 5, z * 2.1) * 0.1 - 0.12) * f * f;
}
export function inPond(x, z) { return x > POND.x0 && x < POND.x1 && z > POND.z0 && z < POND.z1; }
export function baseH(x, z) {
  if (inPond(x, z)) {
    const e = Math.min(x - POND.x0, POND.x1 - x, z - POND.z0, POND.z1 - z);
    return POND.floor + Math.max(0, 0.35 - e) * 0.4;
  }
  return bumpH(x, z);
}
function topOf(s, x, z) {
  if (s.kind === 'box') return s.y1;
  const k = s.dir === 'z+' ? (z - s.z0) / (s.z1 - s.z0) : s.dir === 'z-' ? (s.z1 - z) / (s.z1 - s.z0) : s.dir === 'x+' ? (x - s.x0) / (s.x1 - s.x0) : (s.x1 - x) / (s.x1 - s.x0);
  return s.h0 + (s.h1 - s.h0) * THREE.MathUtils.clamp(k, 0, 1);
}
function normalOf(s, out) {
  if (s.kind === 'box') return out.copy(UP);
  const len = s.dir[0] === 'z' ? s.z1 - s.z0 : s.x1 - s.x0;
  const g = (s.h1 - s.h0) / len * (s.dir[1] === '+' ? 1 : -1);
  if (s.dir[0] === 'z') out.set(0, 1, -g); else out.set(-g, 1, 0);
  return out.normalize();
}
const inside = (s, x, z) => x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1;

// Highest surface at (x, z) not above maxY. Returns { y, n, solid }.
const _res = { y: 0, n: new THREE.Vector3(), solid: null };
export function ground(x, z, maxY = 1e9, out = _res) {
  let y = baseH(x, z), sol = null;
  for (const s of S) {
    if (!inside(s, x, z)) continue;
    const t = topOf(s, x, z);
    if (t <= maxY + 1e-4 && t > y) { y = t; sol = s; }
  }
  out.y = y; out.solid = sol;
  if (sol) normalOf(sol, out.n);
  else {
    const e = 0.08, hx = baseH(x + e, z) - baseH(x - e, z), hz = baseH(x, z + e) - baseH(x, z - e);
    out.n.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
    if (inPond(x, z)) out.n.set(0, 1, 0);
  }
  return out;
}
// What a body standing with its feet at feetY bumps into at (x, z): the top of anything it cannot pass under.
export function obstacleTop(x, z, feetY, bodyH) {
  let y = baseH(x, z);
  for (const s of S) {
    if (!inside(s, x, z)) continue;
    if (s.y0 >= feetY + bodyH) continue;          // overhead: walk under it
    const t = topOf(s, x, z);
    if (s.y0 > feetY + 0.45 || true) y = Math.max(y, t);
  }
  return y;
}
export const waterY = (x, z) => (inPond(x, z) ? POND.water : -1e9);

// ------------------------------------------------------------------ meshes
function gridTex(base, line, size = 256, cells = 4, accent) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 3, 1 + Math.random() * 2); }
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = 0; i <= cells; i++) { const p = (i * size) / cells; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(size, p); g.stroke(); }
  if (accent) { g.strokeStyle = accent; g.lineWidth = 3; g.strokeRect(1, 1, size - 2, size - 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const MATS = {};
function mat(name) {
  if (MATS[name]) return MATS[name];
  const spec = {
    wood: ['#7a5a3c', 'rgba(40,24,12,.45)'], log: ['#6b4a2e', 'rgba(30,18,8,.4)'], fence: ['#8a6a43', 'rgba(40,24,12,.5)'],
    stone: ['#8d8a80', 'rgba(50,48,44,.45)'], earth: ['#7c7357', 'rgba(50,44,30,.4)'], plank: ['#86643f', 'rgba(40,24,12,.55)'],
    ground: ['#6f7a5a', 'rgba(40,48,30,.35)'],
  }[name] || ['#888', 'rgba(0,0,0,.3)'];
  const t = gridTex(spec[0], spec[1], 256, name === 'ground' ? 2 : 4);
  MATS[name] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
  return MATS[name];
}
function boxUV(geo, sx, sy, sz) {
  // world-scale UVs (1 tile = 1 m)
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + sx, y = p.getY(i) + sy, z = p.getZ(i) + sz;
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, x, z); else if (ax > 0.5) uv.setXY(i, z, y); else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true;
}
function label(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(24,20,16,.82)'; g.beginPath(); g.roundRect(6, 6, 500, 148, 18); g.fill();
  g.strokeStyle = '#c9a25e'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#f1e6cf'; g.font = '600 54px "PT Sans", "Segoe UI", sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, sub ? 74 : 98);
  if (sub) { g.fillStyle = '#c9b48a'; g.font = '36px "PT Sans", "Segoe UI", sans-serif'; g.fillText(sub, 256, 124); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  sp.scale.set(1.2, 0.375, 1);
  return sp;
}
const HINT = {
  'Склон 15°': 'IK стоп, таз ниже', 'Склон 30°': 'спуск', 'Ступени 18 см': 'стопа на ступени', 'Бревно 0,55 м': 'Пробел: перемах с бега',
  'Плетень 1 м': 'Пробел: перелезть', 'Сундук 0,8 м': 'Пробел: шаг вверх', 'Стенка 1,5 м': 'Пробел: быстрый заброс',
  'Уступ 2,3 м': 'прыжок, вис, A/D вдоль', 'Мост': 'из воды: забраться', 'Кочки': 'неровная земля',
};

export function buildCourse(scene) {
  const g = new THREE.Group();
  // ground with the pond cut out (a grid of quads following baseH)
  const W = 60, D = 60, N = 240;
  const geo = new THREE.PlaneGeometry(W, D, N, N); geo.rotateX(-Math.PI / 2); geo.translate(4, 0, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, baseH(p.getX(i), p.getZ(i)));
  const uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5, p.getZ(i) * 0.5);
  geo.computeVertexNormals();
  const gm = new THREE.Mesh(geo, mat('ground')); gm.receiveShadow = true; g.add(gm);
  for (const s of S) {
    const y0 = Math.max(s.y0, -1.2);
    let m;
    if (s.kind === 'box') {
      const bg = new THREE.BoxGeometry(s.x1 - s.x0, s.y1 - y0, s.z1 - s.z0);
      boxUV(bg, (s.x0 + s.x1) / 2, (s.y1 + y0) / 2, (s.z0 + s.z1) / 2);
      m = new THREE.Mesh(bg, mat(s.mat)); m.position.set((s.x0 + s.x1) / 2, (s.y1 + y0) / 2, (s.z0 + s.z1) / 2);
    } else {
      // wedge: a box whose top vertices follow the slope
      const top = Math.max(s.h0, s.h1);
      const eg = new THREE.BoxGeometry(s.x1 - s.x0, top - y0, s.z1 - s.z0);
      eg.translate((s.x0 + s.x1) / 2, (top + y0) / 2, (s.z0 + s.z1) / 2);
      const pp = eg.attributes.position;
      for (let i = 0; i < pp.count; i++) if (pp.getY(i) > y0 + 0.01) pp.setY(i, Math.max(y0 + 0.002, topOf(s, pp.getX(i), pp.getZ(i))));
      eg.computeVertexNormals();
      boxUV(eg, 0, 0, 0);
      m = new THREE.Mesh(eg, mat(s.mat));
    }
    m.castShadow = m.receiveShadow = true; g.add(m);
    if (s.name) {
      const L = label(s.name, HINT[s.name]);
      const top = s.kind === 'box' ? s.y1 : Math.max(s.h0, s.h1);
      L.position.set((s.x0 + s.x1) / 2, top + 1.25, s.kind === 'ramp' ? (s.z0 + s.z1) / 2 : s.z0 - 0.2);
      if (s.name === 'Мост') L.position.set(4.6, 1.5, 15.3);
      g.add(L);
    }
  }
  const bl = label('Кочки', HINT['Кочки']); bl.position.set(-0.5, 1.5, 13.5); g.add(bl);
  const st = label('Старт', 'WASD, Shift бег, Пробел'); st.position.set(2.6, 1.7, 0.6); st.scale.set(1.2, 0.375, 1); g.add(st);
  // posts and rails of the bridge
  const rail = mat('log');
  for (const z of [14.62, 15.98]) {
    for (let x = 4; x <= 17; x += 1.6) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.25, 8), rail); post.position.set(x, 0.32 + 0.6 - 0.62 + 0.3, z); post.castShadow = true; g.add(post); }
  }
  // water
  const wg = new THREE.PlaneGeometry(POND.x1 - POND.x0, POND.z1 - POND.z0); wg.rotateX(-Math.PI / 2);
  const wm = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x3f6a78, transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0.1 }));
  wm.position.set((POND.x0 + POND.x1) / 2, POND.water, (POND.z0 + POND.z1) / 2); g.add(wm);
  scene.add(g);
  return g;
}
