// Тестовая сцена: изба из брёвен (окно с наличником), проход, каменный амбар, частокол дугой,
// поляна Лешего и лес. Стены — отдельные меши для лучей руки; столкновения — простые фигуры.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toonRamp } from './leafvortex.js';

const ramp = toonRamp([0.42, 0.7, 1]);
const toon = (opts) => new THREE.MeshToonMaterial({ gradientMap: ramp, ...opts });
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(42);
const rr = (a, b) => a + R() * (b - a);

function tint(geo, hex, jitter = 0.08) {
  const c = new THREE.Color(hex).offsetHSL(0, 0, (R() - 0.5) * jitter);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (geo.index) return geo.toNonIndexed();
  return geo;
}
function clean(g) { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; }
function mergeMesh(geos, mat) { const m = new THREE.Mesh(mergeGeometries(geos.map(clean)), mat); m.castShadow = true; m.receiveShadow = true; return m; }

export const solids = [];   // {kind:'box', x0,x1,z0,z1} | {kind:'ring', cx,cz,r,t,a0,a1} | {kind:'circle', x,z,r}
export const colliders = []; // меши для лучей руки

// --- бревенчатая стена вдоль отрезка
function logWall(geos, x0, z0, x1, z1, H, r, over = 0.28, startHalf = false) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
  const n = Math.ceil(H / (r * 1.84));
  for (let i = 0; i < n; i++) {
    const y = r + i * r * 1.84 + (startHalf ? r * 0.92 : 0);
    if (y > H) break;
    const rad = r * rr(0.93, 1.07);
    const g = new THREE.CylinderGeometry(rad, rad * rr(0.95, 1.05), len + over * 2, 10, 1);
    g.rotateX(Math.PI / 2); g.rotateY(yaw);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    geos.push(tint(g, '#6f5640', 0.12));
  }
}

function box(geos, w, h, d, x, y, z, hex, rotY = 0, j = 0.06) {
  const g = new THREE.BoxGeometry(w, h, d); if (rotY) g.rotateY(rotY); g.translate(x, y, z); geos.push(tint(g, hex, j)); return g;
}

function gable(group, x0, x1, z0, z1, wallH, rise, hex) {
  // скат вдоль Z (конёк по Z), свесы
  const w = x1 - x0, cx = (x0 + x1) / 2, L = z1 - z0 + 1.0, cz = (z0 + z1) / 2;
  const half = w / 2 + 0.55, slope = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  const geos = [];
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, 0.09, L);
    g.rotateZ(-s * ang); g.translate(cx + s * (half / 2 - 0.02), wallH + rise / 2, cz);
    geos.push(tint(g, hex, 0.04));
    // доски-полосы на скате
    for (let k = 0; k < 9; k++) {
      const p = new THREE.BoxGeometry(slope * 1.01, 0.03, 0.06);
      p.rotateZ(-s * ang); p.translate(cx + s * (half / 2 - 0.02), wallH + rise / 2 + 0.06, z0 - 0.4 + k * (L - 0.2) / 8);
      geos.push(tint(p, '#2f251b', 0.05));
    }
  }
  // фронтоны
  for (const z of [z0 - 0.05, z1 + 0.05]) {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.1, 0); sh.lineTo(w / 2 + 0.1, 0); sh.lineTo(0, rise - 0.05); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); g.translate(cx, wallH, z - 0.06);
    geos.push(tint(g, '#5c4632', 0.05));
  }
  const ridge = new THREE.CylinderGeometry(0.11, 0.11, L + 0.3, 8); ridge.rotateX(Math.PI / 2); ridge.translate(cx, wallH + rise + 0.05, cz);
  geos.push(tint(ridge, '#4a3a2a'));
  const m = mergeMesh(geos, toon({ vertexColors: true }));
  group.add(m);
}

export function buildWorld(scene) {
  const group = new THREE.Group(); scene.add(group);

  // --- земля: трава, тропа вдоль стен, поляна
  {
    const S = 140, N = 140;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3);
    const grass = new THREE.Color('#4a5730'), dark = new THREE.Color('#34401f'), dirt = new THREE.Color('#6b5a3f'), moss = new THREE.Color('#5b6a35');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const n = Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5 + Math.sin(x * 2.3 + z * 1.7) * 0.25 + 0.5;
      c.copy(grass).lerp(dark, n * 0.6);
      // тропа у стен
      const path = Math.max(0, 1 - Math.abs(x + 1.2) / 0.9) * (z > -7 && z < 11.5 ? 1 : 0);
      const dr = Math.hypot(x - 2.5, z - 11), ring = Math.max(0, 1 - Math.abs(dr - 3.8) / 0.9) * (z > 10.5 ? 1 : 0);
      const clear = Math.max(0, 1 - Math.hypot(x - 8, z - 1) / 5);
      c.lerp(dirt, Math.min(1, Math.max(path, ring) * 0.8));
      c.lerp(moss, clear * 0.5);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, toon({ vertexColors: true }));
    m.receiveShadow = true; group.add(m);
  }

  // --- изба: x -6.4..-2, z -6..4
  {
    const geos = [];
    const X0 = -6.4, X1 = -2, Z0 = -6, Z1 = 4, H = 2.75, r = 0.15;
    logWall(geos, X1, Z0, X1, Z1, H, r);          // восточная, вдоль тропы
    logWall(geos, X0, Z0, X0, Z1, H, r);
    logWall(geos, X0, Z0, X1, Z0, H, r, 0.28, true);
    logWall(geos, X0, Z1, X1, Z1, H, r, 0.28, true);
    // окно с наличником на восточной стене
    const wz = 0.6, wy = 1.45;
    const fx = X1 + r + 0.035;
    box(geos, 0.06, 0.95, 0.09, fx, wy, wz - 0.45, '#8a6a46');
    box(geos, 0.06, 0.95, 0.09, fx, wy, wz + 0.45, '#8a6a46');
    box(geos, 0.07, 0.1, 1.05, fx + 0.005, wy + 0.5, wz, '#8a6a46');
    box(geos, 0.08, 0.08, 1.15, fx + 0.01, wy - 0.5, wz, '#8a6a46');
    // резной кокошник наличника
    const ko = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16, 1, false, 0, Math.PI);
    ko.rotateZ(Math.PI / 2); ko.rotateX(Math.PI / 2); ko.rotateZ(Math.PI / 2); ko.scale(1, 0.45, 1);
    ko.translate(fx, wy + 0.55, wz); geos.push(tint(ko, '#9c7a4f'));
    const wall = mergeMesh(geos, toon({ vertexColors: true }));
    group.add(wall); colliders.push(wall);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.9), new THREE.MeshBasicMaterial({ color: '#f2b45a' }));
    glass.rotation.y = Math.PI / 2; glass.position.set(X1 + r + 0.012, wy, wz); group.add(glass);
    const warm = new THREE.PointLight('#ffb45a', 2.2, 4.5, 1.6); warm.position.set(X1 + 0.7, wy, wz); group.add(warm);
    gable(group, X0 - 0.15, X1 + 0.15, Z0, Z1, H + 0.05, 1.6, '#3d3125');
    solids.push({ kind: 'box', x0: X0 - r - 0.28, x1: X1 + r, z0: Z0 - r - 0.28, z1: Z1 + r + 0.28 });
  }

  // --- амбар: каменная кладка, x -6..-2, z 5.8..11
  {
    const geos = [];
    const X0 = -6, X1 = -2, Z0 = 5.8, Z1 = 11, H = 2.3;
    box(geos, X1 - X0 - 0.2, H, Z1 - Z0, (X0 + X1) / 2 - 0.1, H / 2, (Z0 + Z1) / 2, '#5f5a50', 0, 0.02);
    // лицевая кладка на восточной стороне: камни разной длины и выступа
    let y = 0;
    while (y < H - 0.05) {
      const h = rr(0.22, 0.34); let z = Z0 + rr(-0.2, 0);
      while (z < Z1) {
        const w = Math.min(rr(0.32, 0.72), Z1 - z); if (w < 0.12) break;
        const d = rr(0.08, 0.16);
        const g = new THREE.BoxGeometry(d, h - 0.03, w - 0.03, 1, 1, 1);
        g.translate(X1 - 0.1 + d / 2, y + h / 2, z + w / 2);
        geos.push(tint(g, R() < 0.2 ? '#8a8173' : '#77705f', 0.14));
        z += w;
      }
      y += h;
    }
    const wall = mergeMesh(geos, toon({ vertexColors: true }));
    group.add(wall); colliders.push(wall);
    gable(group, X0 - 0.1, X1 + 0.08, Z0, Z1, H, 1.3, '#3a2f24');
    solids.push({ kind: 'box', x0: X0, x1: X1 + 0.08, z0: Z0, z1: Z1 });
  }

  // --- частокол дугой: центр (2.5, 11), радиус 4.5, от запада через север на восток
  {
    const cx = 2.5, cz = 11, Rr = 4.5, geos = [];
    const a0 = Math.PI * 1.0, a1 = Math.PI * 0.0;
    const step = 0.245 / Rr;
    for (let a = a0; a >= a1 - 1e-6; a -= step) {
      const r = rr(0.11, 0.135), h = rr(2.2, 2.65);
      const x = cx + Math.cos(a) * Rr, z = cz + Math.sin(a) * Rr;
      const g = new THREE.CylinderGeometry(r, r * 1.05, h, 8); g.translate(0, h / 2, 0);
      const tip = new THREE.ConeGeometry(r, 0.32, 8); tip.translate(0, h + 0.16, 0);
      for (const q of [g, tip]) { q.rotateZ(rr(-0.03, 0.03)); q.rotateX(rr(-0.03, 0.03)); q.translate(x, 0, z); }
      geos.push(tint(g, '#5d4936', 0.14), tint(tip, '#4c3b2b', 0.08));
    }
    // обвязка снаружи
    for (const yb of [0.6, 1.8]) {
      for (let a = a0; a > a1; a -= 0.2) {
        const b = Math.max(a1, a - 0.2), rad = Rr + 0.17;
        const p0 = new THREE.Vector3(cx + Math.cos(a) * rad, yb, cz + Math.sin(a) * rad), p1 = new THREE.Vector3(cx + Math.cos(b) * rad, yb, cz + Math.sin(b) * rad);
        const len = p0.distanceTo(p1) + 0.05, g = new THREE.CylinderGeometry(0.05, 0.05, len, 6);
        g.rotateX(Math.PI / 2); g.rotateY(Math.atan2(p1.x - p0.x, p1.z - p0.z)); g.translate((p0.x + p1.x) / 2, yb, (p0.z + p1.z) / 2);
        geos.push(tint(g, '#4a3a2a'));
      }
    }
    const wall = mergeMesh(geos, toon({ vertexColors: true }));
    group.add(wall); colliders.push(wall);
    solids.push({ kind: 'ring', cx, cz, r: Rr, t: 0.16, a0: 0, a1: Math.PI });
  }

  // --- лес вокруг: ели и берёзы, кроме тропы, построек и поляны
  {
    const pine = [], birch = [], trunks = [];
    const free = (x, z) => {
      if (x > -8 && x < 0 && z > -8 && z < 13) return false;                    // постройки и тропа
      if (Math.hypot(x - 2.5, z - 11) < 5.4) return false;                       // за частоколом место
      if (Math.hypot(x - 7, z + 0) < 8.5) return false;                          // поляна Лешего
      if (x > -1 && x < 6 && z > -9 && z < 10) return false;
      return true;
    };
    let placed = 0;
    for (let k = 0; k < 900 && placed < 150; k++) {
      const x = rr(-24, 40), z = rr(-26, 34);
      if (!free(x, z)) continue;
      placed++;
      const isPine = R() < 0.65, s = rr(0.8, 1.35);
      if (isPine) {
        const t = new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 2.2 * s, 6); t.translate(x, 1.1 * s, z); trunks.push(tint(t, '#3b2a1e'));
        for (let i = 0; i < 4; i++) {
          const r = (1.7 - i * 0.36) * s, h = 1.9 * s;
          const c = new THREE.ConeGeometry(r, h, 8); c.rotateY(R() * 3); c.translate(x, (1.6 + i * 1.05) * s + h / 2, z);
          pine.push(tint(c, R() < 0.5 ? '#36502c' : '#405c32', 0.08));
        }
      } else {
        const t = new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 4.2 * s, 6); t.translate(x, 2.1 * s, z); trunks.push(tint(t, '#d9d2c2', 0.06));
        for (let i = 0; i < 4; i++) {
          const b = new THREE.IcosahedronGeometry(rr(0.8, 1.2) * s, 0);
          b.translate(x + rr(-0.6, 0.6) * s, rr(3.3, 5.0) * s, z + rr(-0.6, 0.6) * s);
          birch.push(tint(b, R() < 0.3 ? '#8a8a2e' : '#55702c', 0.1));
        }
      }
      solids.push({ kind: 'circle', x, z, r: 0.3 * s });
    }
    group.add(mergeMesh(trunks, toon({ vertexColors: true })));
    group.add(mergeMesh(pine, toon({ vertexColors: true })));
    group.add(mergeMesh(birch, toon({ vertexColors: true })));
  }

  // --- трава пучками и камни на поляне
  {
    const blades = [];
    for (let k = 0; k < 2200; k++) {
      const x = rr(-14, 22), z = rr(-14, 22);
      if (x > -6.6 && x < -1.6 && z > -6.3 && z < 11.2) continue;
      if (Math.abs(x + 1.2) < 0.7 && z > -7 && z < 11.5) continue;
      const h = rr(0.12, 0.3), g = new THREE.ConeGeometry(0.035, h, 3); g.translate(x, h / 2, z);
      blades.push(tint(g, R() < 0.5 ? '#5f7a34' : '#4c632b', 0.1));
    }
    const m = mergeMesh(blades, toon({ vertexColors: true })); m.castShadow = false; group.add(m);
    const rocks = [];
    for (const [x, z, s] of [[10.8, -2.4, 0.7], [11.6, 3.2, 0.45], [5.2, -3.4, 0.5], [9.8, 5.4, 0.35]]) {
      const g = new THREE.DodecahedronGeometry(s, 0); g.scale(1.3, 0.7, 1); g.translate(x, s * 0.35, z); rocks.push(tint(g, '#6c6a5f', 0.1));
      solids.push({ kind: 'circle', x, z, r: s * 1.1 });
    }
    group.add(mergeMesh(rocks, toon({ vertexColors: true })));
  }
  return group;
}

// столкновение героя (окружность r) со всем, вернуть исправленную позицию
export function collide(p, r, extra = []) {
  for (const s of solids.concat(extra)) {
    if (s.kind === 'box') {
      const cx = Math.max(s.x0, Math.min(p.x, s.x1)), cz = Math.max(s.z0, Math.min(p.z, s.z1));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
        else { // внутри: вытолкнуть к ближней грани
          const m = [p.x - s.x0, s.x1 - p.x, p.z - s.z0, s.z1 - p.z], i = m.indexOf(Math.min(...m));
          if (i === 0) p.x = s.x0 - r; else if (i === 1) p.x = s.x1 + r; else if (i === 2) p.z = s.z0 - r; else p.z = s.z1 + r;
        }
      }
    } else if (s.kind === 'ring') {
      const dx = p.x - s.cx, dz = p.z - s.cz, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
      if (a >= s.a0 - 0.02 && a <= s.a1 + 0.02 && Math.abs(d - s.r) < s.t + r) {
        const target = d < s.r ? s.r - s.t - r : s.r + s.t + r;
        p.x = s.cx + dx / d * target; p.z = s.cz + dz / d * target;
      }
    } else {
      const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
      if (d < s.r + r && d > 1e-5) { p.x = s.x + dx / d * (s.r + r); p.z = s.z + dz / d * (s.r + r); }
    }
  }
  return p;
}

// маршрут авто-прохода: вдоль избы, через проход, вдоль амбара, по дуге частокола
export function buildPath() {
  const pts = [];
  const x = -1.47;
  for (let z = -5.4; z <= 11; z += 0.25) pts.push(new THREE.Vector2(x, z));
  const cx = 2.5, cz = 11, r = 4.5 - 0.13 - 0.38;
  for (let a = Math.PI; a >= 0.12; a -= 0.04) pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r));
  // равномерная параметризация
  const out = [pts[0]], L = [0];
  for (let i = 1; i < pts.length; i++) { L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); out.push(pts[i]); }
  return { pts: out, L, len: L[L.length - 1] };
}
export function pathAt(path, s, out) {
  const { pts, L } = path;
  s = Math.max(0, Math.min(path.len, s));
  let i = 1; while (i < L.length - 1 && L[i] < s) i++;
  const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
  out.pos = (out.pos || new THREE.Vector2()).lerpVectors(pts[i - 1], pts[i], k);
  out.dir = (out.dir || new THREE.Vector2()).subVectors(pts[i], pts[i - 1]).normalize();
  return out;
}
