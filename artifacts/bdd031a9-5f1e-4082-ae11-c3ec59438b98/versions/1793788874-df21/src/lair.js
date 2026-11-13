// Логово Лешего: болотное поселение посреди северного леса (по концептам Michael).
// Центр (0, 0). Богатырь приходит с юга (+z) по лесной тропе, у края болота тропа переходит в мостки.
// Дуб-терем — на северо-западе, хоромы с колесом на фронтоне и костром — на западе, избы на сваях — вокруг,
// идолы с оленьими черепами — у входа и на островках. Вокруг — тёмный ельник и сухостой, за ним обычный лес.
import * as THREE from 'three';
import { paint, glow, water, mist, beam as beamMat, inkMat, U, lin } from './toon.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Pack, MAT, M4, V, beam, plank, boardwalk, mossStrand, gableRoof, railing, stairs, skull, banner, chain, windowLit, rnd, rr, setSeed } from './kit.js';

// ---------- рельеф ----------
function n2(x, z) { // гладкий шум без текстур (для рельефа и расстановки)
  return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 1.3) * 0.5 + Math.sin(z * 0.13 + Math.sin(x * 0.05) * 1.7) * 0.35 + Math.sin((x + z) * 0.31) * 0.15;
}
export const BASIN = { x: 0, z: -4, rx: 36, rz: 31 };
export const WATER_Y = -0.18;
const ISLANDS = [
  // x, z, радиус, высота над водой
  [-20, 1, 8.5, 0.42], [-12.5, 6.5, 4.2, 0.3], [-6, -18, 11.5, 0.55], [8, -11, 5.2, 0.34], [21, -3, 5.4, 0.34], [-25, -20, 5.6, 0.34],
  [10, 8, 3.2, 0.3], [17.5, 12, 3.0, 0.28], [-2, -3, 2.6, 0.25], [27, 14, 3.5, 0.3], [-30, 12, 4, 0.3],
];
export function groundAt(x, z) {
  const ex = (x - BASIN.x) / BASIN.rx, ez = (z - BASIN.z) / BASIN.rz, e = Math.sqrt(ex * ex + ez * ez);
  const out = 0.25 + n2(x, z) * 0.35 + Math.max(0, Math.hypot(x, z) - 45) * 0.025;
  const b = THREE.MathUtils.smoothstep(1.12, 0.86, e);
  let h = out * (1 - b) + (-0.62 + n2(x * 1.7, z * 1.7) * 0.12) * b;
  for (const [ix, iz, r, ih] of ISLANDS) {
    const d = Math.hypot(x - ix, z - iz) / r;
    if (d < 1.3) { const k = THREE.MathUtils.smoothstep(1.3, 0.75, d); h = Math.max(h, WATER_Y + ih * k - (1 - k) * 0.5 + n2(x * 3, z * 3) * 0.05 * k); }
  }
  // лесная тропа с юга: чуть утоптана
  return h;
}

// места камер ракурсов: тут ничего высокого не ставим
const KEEP = [[6, 52], [12, 26], [6, 2], [-4, 16], [16.5, 17.5], [15, 6], [10, 52]];
// линии взгляда ракурсов (камера → цель): вдоль них тоже ничего высокого
const SIGHT = [[12, 26, -8, -8], [6, 2, -6, -18], [-4, 16, -18, 1], [16.5, 17.5, 10.5, 8.6], [15, 6, 20, -3], [6, 52, -2, 10]];
function sightDist(x, z) {
  let m = 1e9;
  for (const [ax, az, bx, bz] of SIGHT) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}
const kept = (x, z, r) => KEEP.some(([kx, kz]) => Math.hypot(x - kx, z - kz) < r) || sightDist(x, z) < 2.2;
export function buildLair(scene) {
  setSeed(11);
  const solids = [];   // круги {x, z, r}
  const lights = [];   // { pos, col, r, flick }
  const walks = [];    // отрезки мостков { a, b, w, y }
  const anim = { flames: [] };
  const P = new Pack();      // постройки и детали (с контуром)
  const PG = new Pack();     // светящееся (без контура)

  // ---------- земля ----------
  {
    const S = 320, N = 200;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
    const cMud = new THREE.Color('#3a3a26'), cMoss = new THREE.Color('#566b30'), cLitter = new THREE.Color('#6b5a3a'), cGrass = new THREE.Color('#6f8a45');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); const y = groundAt(x, z); pos.setY(i, y);
      const wet = THREE.MathUtils.smoothstep(0.1, -0.3, y);
      const south = THREE.MathUtils.smoothstep(40, 75, z);           // обычный лес: трава светлее
      const c = cLitter.clone().lerp(cMoss, 0.5 + n2(x * 2, z * 2) * 0.4).lerp(cMud, wet).lerp(cGrass, south * 0.7);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, paint({ base: '#ffffff', vcol: true, moss: '#4d6a2a', mossAmt: 0.35, stroke: [1, 0, 0.3], strokeAmt: 0.2, break: 0.3, rim: 0 }));
    m.receiveShadow = true; scene.add(m);
    // вода болота
    const wg = new THREE.CircleGeometry(48, 64); wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, water()); w.position.set(BASIN.x, WATER_Y, BASIN.z); w.scale.set(1, 1, 0.9); w.receiveShadow = true; scene.add(w);
  }

  // ---------- мостки ----------
  const W = (pts) => walks.push(...boardwalk(P, pts, 0.2, 1.7, groundAt));
  W([[2, 34], [1.5, 22], [0, 11], [-2.5, 0], [-4.5, -8]]);                 // вход: от тропы к дубу
  W([[0, 11], [-6, 8], [-11, 6.5]]);                                         // к костру
  W([[-2.5, 0], [-9, -1], [-14, 0.5]]);                                      // к хоромам
  W([[0.5, 6], [6, 1], [9, -5]]);                                            // к избе у дуба
  W([[6, 1], [14, -1], [17, -2]]);                                           // к избе справа
  W([[-4.5, -8], [-14, -12], [-21, -17]]);                                   // к избе слева за дубом
  W([[1.5, 22], [9, 15], [9.5, 10]]);                                        // к идолу
  // земляная тропа с юга (по ней приходит богатырь): вытоптанная полоса
  {
    const pts = [[2, 34], [3, 46], [1, 58], [4, 72], [2, 90], [5, 110]];
    for (let i = 0; i < pts.length - 1; i++) walks.push({ a: pts[i], b: pts[i + 1], w: 2.6, y: null });
  }

  // ---------- дуб-терем (центр композиции) ----------
  const TREE = { x: -6, z: -18 };
  {
    const T = TREE, base = groundAt(T.x, T.z);
    // ствол: толстый, бугристый, сужается; сверху расходится на 6 толстых сухих ветвей
    const g = new THREE.CylinderGeometry(3.0, 4.6, 22, 28, 22, true);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const bulge = 1 + 0.12 * Math.sin(a * 5 + y * 0.35) + 0.08 * Math.sin(a * 11 - y * 0.6) + 0.1 * Math.sin(y * 0.5 + a * 2);
      const flare = 1 + Math.max(0, -y - 8) * 0.09;
      p.setX(i, x * bulge * flare); p.setZ(i, z * bulge * flare);
    }
    g.computeVertexNormals();
    P.add(MAT.bark, g, M4(T.x, base + 11, T.z));
    solids.push({ x: T.x, z: T.z, r: 5.4 });
    // корни-сваи: изогнутые ноги, уходящие в болото
    for (let k = 0; k < 11; k++) {
      const a = k / 11 * Math.PI * 2 + rr(-0.15, 0.15), r0 = 4.0, r1 = rr(7.5, 10.5);
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.25) {
        const r = r0 + (r1 - r0) * t, y = base + 4.5 * (1 - t) * (1 - t) + 1.2 * Math.sin(t * Math.PI) - 0.6 * t;
        pts.push(V(T.x + Math.cos(a) * r, y, T.z + Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      P.add(MAT.bark, new THREE.TubeGeometry(curve, 10, rr(0.45, 0.75), 7, false));
      const end = pts[pts.length - 1]; solids.push({ x: end.x, z: end.z, r: 0.7 });
    }
    // ветви кроны: толстые, сухие, торчат вверх и в стороны
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.3, lean = rr(0.35, 0.8), len = rr(9, 14);
      const p0 = V(T.x + Math.cos(a) * 1.5, base + 20, T.z + Math.sin(a) * 1.5);
      const p1 = p0.clone().add(V(Math.cos(a) * len * lean * 0.5, len * 0.55, Math.sin(a) * len * lean * 0.5));
      const p2 = p1.clone().add(V(Math.cos(a + 0.3) * len * lean * 0.5, len * 0.4, Math.sin(a + 0.3) * len * lean * 0.5));
      P.add(MAT.bark, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 8, rr(0.6, 1.1), 7, false));
      // сучья
      for (let j = 0; j < 3; j++) {
        const s = p1.clone().lerp(p2, rr(0, 1)), d = V(rr(-1, 1), rr(0.2, 1), rr(-1, 1)).normalize().multiplyScalar(rr(2, 4));
        beam(P, MAT.bark, s, s.clone().add(d), rr(0.12, 0.25), 5);
      }
      for (let j = 0; j < 5; j++) { const s = p0.clone().lerp(p2, rr(0.2, 1)); mossStrand(P, s.x, s.y, s.z, rr(1, 3.5), rr(0.3, 0.6), rr(0, 6)); }
    }
    // обхватывающие галереи (3 яруса) с перилами, окна, избушки-наросты, лестница
    const levels = [5.5, 10.5, 15.5];
    levels.forEach((ly, li) => {
      const R = 4.6 + (li === 0 ? 0.6 : 0) - li * 0.25, y = base + ly;
      const a0 = rr(0, 6), a1 = a0 + rr(2.6, 3.6);
      const n = Math.round((a1 - a0) * R / 0.3);
      for (let k = 0; k < n; k++) { // настил дугой
        const a = a0 + (a1 - a0) * (k + 0.5) / n;
        plank(P, MAT.plank, T.x + Math.cos(a) * (R + 0.7), y, T.z + Math.sin(a) * (R + 0.7), 1.6, 0.3, -a, 0.08);
      }
      for (let k = 0; k <= 6; k++) { // подпорки-укосины
        const a = a0 + (a1 - a0) * k / 6;
        beam(P, MAT.woodDark, V(T.x + Math.cos(a) * (R - 0.2), y - 1.6, T.z + Math.sin(a) * (R - 0.2)), V(T.x + Math.cos(a) * (R + 1.4), y - 0.05, T.z + Math.sin(a) * (R + 1.4)), 0.08, 5);
      }
      const rp = []; for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; rp.push(V(T.x + Math.cos(a) * (R + 1.45), 0, T.z + Math.sin(a) * (R + 1.45))); }
      for (let k = 0; k < 8; k++) railing(P, rp[k], rp[k + 1], y + 0.04, 0.85);
      // окна по стволу над галереей
      for (let k = 0; k < 4 + li; k++) {
        const a = a0 + (a1 - a0) * (k + 0.5) / (4 + li) + rr(-0.08, 0.08), rr0 = R * 0.98;
        windowLit(P, PG, MAT.winGreen, T.x + Math.cos(a) * rr0, y + 1.3, T.z + Math.sin(a) * rr0, Math.PI / 2 - a, 0.75, 0.95);
        // козырёк
        P.add(MAT.roof, new THREE.BoxGeometry(0.95, 0.07, 0.5), M4(T.x + Math.cos(a) * (rr0 + 0.25), y + 1.75, T.z + Math.sin(a) * (rr0 + 0.25), 0.35, Math.PI / 2 - a, 0));
      }
      lights.push({ pos: V(T.x + Math.cos((a0 + a1) / 2) * (R + 2), y + 1.4, T.z + Math.sin((a0 + a1) / 2) * (R + 2)), col: [0.55, 0.8, 0.22], r: 7.5, flick: 0.3 });
    });
    // избушки-наросты на стволе (крыша-домик, окно)
    [[0.6, 8.0], [2.6, 13.0], [4.4, 18.0], [-1.0, 3.2]].forEach(([a, ly]) => {
      const y = base + ly, R = 4.0, x = T.x + Math.cos(a) * (R + 0.9), z = T.z + Math.sin(a) * (R + 0.9), rot = Math.PI / 2 - a;
      P.add(MAT.wood, new THREE.BoxGeometry(2.0, 1.7, 1.8), M4(x, y + 0.85, z, 0, rot, 0));
      gableRoof(P, x, y + 1.7, z, 2.0, 1.8, 0.9, rot + Math.PI / 2, 0.3);
      windowLit(P, PG, MAT.winGreen, x + Math.cos(a) * 0.92, y + 0.95, z + Math.sin(a) * 0.92, rot, 0.5, 0.6);
    });
    // дверь у подножия (оттуда выходит Леший) и лестница к первой галерее
    const da = 0.95, dx = T.x + Math.cos(da) * 4.9, dz = T.z + Math.sin(da) * 4.9;
    PG.add(MAT.winGreen, new THREE.PlaneGeometry(1.5, 2.6), M4(dx, base + 1.5, dz, 0, Math.PI / 2 - da, 0));
    beam(P, MAT.woodDark, V(dx - Math.sin(da) * 0.9, base, dz + Math.cos(da) * 0.9), V(dx - Math.sin(da) * 0.9, base + 3.0, dz + Math.cos(da) * 0.9), 0.14, 6);
    beam(P, MAT.woodDark, V(dx + Math.sin(da) * 0.9, base, dz - Math.cos(da) * 0.9), V(dx + Math.sin(da) * 0.9, base + 3.0, dz - Math.cos(da) * 0.9), 0.14, 6);
    beam(P, MAT.woodDark, V(dx - Math.sin(da) * 1.1, base + 2.95, dz + Math.cos(da) * 1.1), V(dx + Math.sin(da) * 1.1, base + 2.95, dz - Math.cos(da) * 1.1), 0.13, 6);
    skull(P, dx + Math.cos(da) * 0.15, base + 3.4, dz + Math.sin(da) * 0.15, 1.1, Math.PI / 2 - da);
    lights.push({ pos: V(dx + Math.cos(da) * 1.5, base + 1.6, dz + Math.sin(da) * 1.5), col: [0.5, 0.85, 0.25], r: 8, flick: 0.4 });
    const sa = 1.9, s0 = V(T.x + Math.cos(sa) * 9.5, groundAt(T.x + Math.cos(sa) * 9.5, T.z + Math.sin(sa) * 9.5) + 0.1, T.z + Math.sin(sa) * 9.5);
    stairs(P, s0, V(T.x + Math.cos(sa - 0.4) * 6.0, base + 5.5, T.z + Math.sin(sa - 0.4) * 6.0), 1.0);
    // мох свисает со всего дерева
    for (let k = 0; k < 60; k++) {
      const a = rr(0, 6.28), y = base + rr(3, 20), R = 3.2 + (22 - (y - base)) * 0.06;
      mossStrand(P, T.x + Math.cos(a) * (R + 0.4), y, T.z + Math.sin(a) * (R + 0.4), rr(0.8, 3.2), rr(0.2, 0.5), Math.PI / 2 - a);
    }
    anim.doorLeshy = { x: dx + Math.cos(da) * 2.2, z: dz + Math.sin(da) * 2.2, yaw: Math.PI / 2 - da };
  }

  // ---------- хоромы с колесом на фронтоне (запад), костёр перед ними ----------
  function stiltHouse(cx, cz, w, d, wallH, roofH, rot, o = {}) {
    const gy = groundAt(cx, cz), fy = Math.max(gy, WATER_Y) + (o.stilt || 1.4);
    const c = Math.cos(rot), s = Math.sin(rot);
    const L = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
    // сваи
    for (let i = -1; i <= 1; i += 0.5) for (let j = -1; j <= 1; j += 0.5) {
      if (Math.abs(i) < 0.9 && Math.abs(j) < 0.9 && (i + j) % 1 !== 0) continue;
      const [x, z] = L(i * (w / 2 + 0.3), j * (d / 2 + 0.3));
      beam(P, MAT.woodDark, V(x, groundAt(x, z) - 0.5, z), V(x + rr(-0.06, 0.06), fy + (Math.abs(i) > 0.9 || Math.abs(j) > 0.9 ? 0.0 : -0.1), z), rr(0.12, 0.17), 6);
    }
    // площадка
    const pw = w + 1.6, pd = d + (o.porch || 2.2);
    const n = Math.round(pw / 0.3);
    for (let k = 0; k < n; k++) { const lx = -pw / 2 + (k + 0.5) * pw / n, [x, z] = L(lx, (o.porch || 2.2) / 2); plank(P, MAT.plank, x, fy, z, pd, 0.28, rot, 0.08); }
    // стены из бруса (горизонтальные венцы)
    const logs = Math.round(wallH / 0.32);
    for (let k = 0; k < logs; k++) {
      const y = fy + 0.18 + k * 0.32;
      for (const [ax, az, bx, bz] of [[-w / 2, -d / 2, w / 2, -d / 2], [-w / 2, d / 2, w / 2, d / 2], [-w / 2, -d / 2, -w / 2, d / 2], [w / 2, -d / 2, w / 2, d / 2]]) {
        const [x0, z0] = L(ax * 1.04, az * 1.04), [x1, z1] = L(bx * 1.04, bz * 1.04);
        beam(P, MAT.log, V(x0, y, z0), V(x1, y + rr(-0.02, 0.02), z1), 0.17, 6);
      }
    }
    // фронтон (треугольник с текстурой) спереди и сзади
    for (const e of [1, -1]) {
      const g = new THREE.BufferGeometry();
      const hw = w / 2 + 0.1;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, 0, roofH, 0], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      g.setIndex(e > 0 ? [0, 1, 2] : [0, 2, 1]); g.computeVertexNormals();
      const [x, z] = L(0, e * (d / 2 + 0.05));
      P.add(o.gable && e > 0 ? MAT.gable : MAT.woodDark, g, M4(x, fy + wallH + 0.15, z, 0, rot, 0));
    }
    gableRoof(P, cx, fy + wallH + 0.15, cz, w, d, roofH, rot + Math.PI / 2 * 0 + 0, 0.7);
    // дверь со светом и окна
    {
      const [x, z] = L(o.doorX || 0, d / 2 + 0.2);
      PG.add(MAT.winOrange, new THREE.PlaneGeometry(1.0, 1.9), M4(x, fy + 1.05, z, 0, rot, 0));
      const [lx, lz] = L((o.doorX || 0), d / 2 + 1.6);
      lights.push({ pos: V(lx, fy + 1.4, lz), col: [1.0, 0.55, 0.22], r: o.lightR || 7, flick: 0.7 });
      for (const sx of [-1, 1]) { // факелы по сторонам двери
        const [tx, tz] = L((o.doorX || 0) + sx * 0.85, d / 2 + 0.45);
        beam(P, MAT.woodDark, V(tx, fy + 0.9, tz), V(tx, fy + 1.9, tz), 0.04, 5);
        anim.flames.push(makeFlame(scene, V(tx, fy + 1.92, tz), 0.35));
      }
      for (const sx of [-1, 1]) { const [wx, wz] = L(sx * w * 0.3 + (o.doorX || 0) * 0.2, d / 2 + 0.21); windowLit(P, PG, MAT.winOrange, wx, fy + 1.35, wz, rot, 0.55, 0.55); }
    }
    // перила по краю площадки и лестница
    const corners = [L(-pw / 2, d / 2 + (o.porch || 2.2)), L(pw / 2, d / 2 + (o.porch || 2.2)), L(pw / 2, -d / 2 - 0.3), L(-pw / 2, -d / 2 - 0.3)];
    railing(P, V(corners[0][0], 0, corners[0][1]), V(L(-0.7, d / 2 + (o.porch || 2.2))[0], 0, L(-0.7, d / 2 + (o.porch || 2.2))[1]), fy, 0.95);
    railing(P, V(L(0.7, d / 2 + (o.porch || 2.2))[0], 0, L(0.7, d / 2 + (o.porch || 2.2))[1]), V(corners[1][0], 0, corners[1][1]), fy, 0.95);
    railing(P, V(corners[1][0], 0, corners[1][1]), V(corners[2][0], 0, corners[2][1]), fy, 0.95);
    railing(P, V(corners[3][0], 0, corners[3][1]), V(corners[0][0], 0, corners[0][1]), fy, 0.95);
    const [sx0, sz0] = L(0, d / 2 + (o.porch || 2.2) + fy * 1.1), [sx1, sz1] = L(0, d / 2 + (o.porch || 2.2) - 0.1);
    stairs(P, V(sx0, groundAt(sx0, sz0) + 0.05, sz0), V(sx1, fy, sz1), 1.1);
    // полотна на углах и мох
    for (const sx of [-1, 1]) { const [bx, bz] = L(sx * (w / 2 + 0.35), d / 2 + 0.35); banner(P, bx, fy + wallH + 0.1, bz, 0.5, rr(1.4, 2.2), rot); }
    // столб с черепом у крыльца
    if (o.skull !== false) { const [kx, kz] = L(pw / 2 + 0.2, d / 2 + (o.porch || 2.2)); beam(P, MAT.woodDark, V(kx, fy - 0.2, kz), V(kx, fy + 2.3, kz), 0.1, 6); skull(P, kx, fy + 2.5, kz, 0.6, rot, false); }
    // занимает место
    solids.push({ x: cx, z: cz, r: Math.max(w, d) * 0.55 });
    return { fy };
  }
  const hall = stiltHouse(-20, 1, 7.5, 9, 3.0, 4.6, 0.95, { gable: true, porch: 2.6, lightR: 9, stilt: 1.3 });
  skull(P, -20 + Math.sin(0.95) * 5.2, hall.fy + 3.0 + 4.0, 1 + Math.cos(0.95) * 5.2, 1.3, 0.95);
  stiltHouse(8, -11, 4.2, 4.0, 2.4, 2.4, -0.25, { porch: 1.6, lightR: 6 });
  stiltHouse(21, -3, 4.4, 4.2, 2.4, 2.6, -0.9, { porch: 1.8, lightR: 6 });
  stiltHouse(-25, -20, 4.0, 4.0, 2.3, 2.4, 0.5, { porch: 1.5, lightR: 6, skull: false });
  stiltHouse(-30, 12, 3.6, 3.6, 2.2, 2.2, 1.6, { porch: 1.4, lightR: 5.5 });

  // костёр: круг камней, поленья, пламя (свет, искры)
  const FIRE = { x: -12.5, z: 6.5 };
  {
    const y = groundAt(FIRE.x, FIRE.z);
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; P.add(MAT.stone, new THREE.DodecahedronGeometry(rr(0.18, 0.28), 0), M4(FIRE.x + Math.cos(a) * 0.85, y + 0.1, FIRE.z + Math.sin(a) * 0.85, rr(0, 3), rr(0, 3), 0)); }
    for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; beam(P, MAT.log, V(FIRE.x + Math.cos(a) * 0.6, y + 0.05, FIRE.z + Math.sin(a) * 0.6), V(FIRE.x + Math.cos(a) * 0.05, y + 0.45, FIRE.z + Math.sin(a) * 0.05), 0.08, 5); }
    PG.add(MAT.ember, new THREE.CircleGeometry(0.55, 10), M4(FIRE.x, y + 0.12, FIRE.z, -Math.PI / 2));
    lights.push({ pos: V(FIRE.x, y + 1.0, FIRE.z), col: [1.0, 0.5, 0.18], r: 11, flick: 1 });
    anim.flames.push(makeFlame(scene, V(FIRE.x, y + 0.15, FIRE.z), 1.0));
    solids.push({ x: FIRE.x, z: FIRE.z, r: 1.1 });
    // котёл на треноге
    beam(P, MAT.woodDark, V(FIRE.x - 1.0, y, FIRE.z - 0.6), V(FIRE.x, y + 2.0, FIRE.z), 0.06, 5);
    beam(P, MAT.woodDark, V(FIRE.x + 1.0, y, FIRE.z - 0.6), V(FIRE.x, y + 2.0, FIRE.z), 0.06, 5);
    beam(P, MAT.woodDark, V(FIRE.x, y, FIRE.z + 1.1), V(FIRE.x, y + 2.0, FIRE.z), 0.06, 5);
    chain(P, V(FIRE.x, y + 1.98, FIRE.z), 0.7);
    P.add(MAT.iron, new THREE.SphereGeometry(0.36, 10, 6, 0, 6.29, 0.9, 2.2), M4(FIRE.x, y + 1.05, FIRE.z));
  }

  // ---------- идолы с оленьими черепами ----------
  function idol(x, z, h, rot) {
    const y = groundAt(x, z);
    const g = new THREE.CylinderGeometry(0.42, 0.55, h, 8, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i), k = 1 + 0.08 * Math.sin(yy * 2.4) - (Math.abs(((yy / h + 0.5) * 5) % 1 - 0.5) < 0.06 ? 0.12 : 0); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    g.computeVertexNormals();
    P.add(MAT.wood, g, M4(x, y + h / 2 - 0.3, z, rr(-0.04, 0.04), rot, rr(-0.04, 0.04)));
    // резной пояс и полотно
    P.add(MAT.woodDark, new THREE.BoxGeometry(1.25, 0.25, 0.3), M4(x, y + h * 0.82, z, 0, rot, 0));
    banner(P, x + Math.sin(rot) * 0.5, y + h * 0.8, z + Math.cos(rot) * 0.5, 0.7, h * 0.55, rot);
    skull(P, x + Math.sin(rot) * 0.15, y + h + 0.0, z + Math.cos(rot) * 0.15, 1.25, rot, true);
    // перекладина с цепями
    const cx = Math.cos(rot), cz = -Math.sin(rot);
    beam(P, MAT.woodDark, V(x - cx * 1.1, y + h * 0.62, z - cz * 1.1), V(x + cx * 1.3, y + h * 0.66, z + cz * 1.3), 0.07, 5);
    chain(P, V(x + cx * 1.2, y + h * 0.65, z + cz * 1.2), rr(0.8, 1.4), rot);
    chain(P, V(x - cx * 0.95, y + h * 0.61, z - cz * 0.95), rr(0.6, 1.1), rot);
    // колья с черепками вокруг
    for (let k = 0; k < 4; k++) { const a = rr(0, 6.28), r = rr(1.2, 2.2), sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r, sy = groundAt(sx, sz); beam(P, MAT.woodDark, V(sx, sy - 0.3, sz), V(sx + rr(-0.15, 0.15), sy + rr(1.0, 1.8), sz + rr(-0.15, 0.15)), 0.06, 5); }
    for (let k = 0; k < 6; k++) mossStrand(P, x + rr(-0.45, 0.45), y + h * rr(0.3, 0.95), z + rr(-0.45, 0.45), rr(0.3, 1.0), 0.18, rr(0, 6));
    solids.push({ x, z, r: 0.8 });
  }
  idol(10, 8, 7.2, -0.6);
  idol(17.5, 12, 6.0, -0.9);
  idol(4.4, 20.5, 5.4, 0.2);      // у входа на мостки
  idol(-1.2, 20.8, 5.0, -0.25);
  idol(-2, -3, 4.2, 0.4);
  idol(27, 14, 5.2, -1.2);

  // колья с черепами вдоль мостков у входа
  for (let k = 0; k < 7; k++) {
    for (const s of [-1, 1]) {
      const z = 26 - k * 2.6, x = 1.6 + s * 1.6 + rr(-0.2, 0.2), y = groundAt(x, z);
      if (rnd() < 0.35) continue;
      beam(P, MAT.woodDark, V(x, y - 0.4, z), V(x + rr(-0.1, 0.1), y + rr(1.3, 2.3), z), 0.06, 5);
      if (rnd() < 0.5) skull(P, x, y + 2.3, z, 0.4, s * 1.4, false);
    }
  }
  // сухие обломки и пни в воде
  for (let k = 0; k < 40; k++) {
    const a = rr(0, 6.28), r = rr(6, 32), x = BASIN.x + Math.cos(a) * r, z = BASIN.z + Math.sin(a) * r * 0.85;
    if (Math.hypot(x - TREE.x, z - TREE.z) < 11) continue;
    const y = groundAt(x, z);
    beam(P, MAT.woodDark, V(x, y - 0.3, z), V(x + rr(-0.3, 0.3), y + rr(0.4, 2.2), z + rr(-0.3, 0.3)), rr(0.08, 0.2), 5);
  }

  // ---------- лес вокруг: ельник и сухостой у логова, светлее к югу ----------
  const forest = new THREE.Group();
  const trees = [];
  const pathX = (z) => 2 + Math.sin(z * 0.05) * 2.5;
  const nearPath = (x, z) => z > 26 && Math.abs(x - pathX(z)) < 4.5;
  const inBasin = (x, z) => { const ex = (x - BASIN.x) / BASIN.rx, ez = (z - BASIN.z) / BASIN.rz; return ex * ex + ez * ez < 1.08; };
  {
    // ель: ярусы лап (конусы с рваным краем) и ствол
    const cones = [];
    for (let k = 0; k < 7; k++) {
      const c = new THREE.ConeGeometry(1.0 - k * 0.12, 0.36, 9, 1, true); const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { const j = 0.72 + 0.5 * Math.abs(Math.sin(i * 1.7 + k)); p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); p.setY(i, p.getY(i) - 0.1 * Math.abs(Math.sin(i * 2.3))); }
      c.translate(0, 0.3 + k * 0.115, 0); cones.push(c.toNonIndexed());
    }
    const P2 = new Pack(); for (const c of cones) P2.add(MAT.bark, c);
    const needleGeo = mergeAll(P2);
    const trunkGeo = new THREE.CylinderGeometry(0.05, 0.11, 1.12, 6); trunkGeo.translate(0, 0.5, 0);
    const needleMat = paint({ base: '#2e4a34', moss: '#3f5c2c', mossAmt: 0.0, stroke: [0, -1, 0], strokeAmt: 0.32, break: 0.38, rim: 0.7 });
    const needleMatS = paint({ base: '#3b5e3a', stroke: [0, -1, 0], strokeAmt: 0.3, break: 0.36, rim: 0.9 }); // южный лес светлее
    const list = [], listS = [];
    let tries = 0;
    while (list.length + listS.length < 900 && tries++ < 20000) {
      const a = rr(0, 6.28), r = Math.sqrt(rr(0, 1)) * 150 + 10;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 4;
      if (inBasin(x, z) || nearPath(x, z)) continue;
      const edge = Math.hypot((x - BASIN.x) / BASIN.rx, (z - BASIN.z) / BASIN.rz);
      if (edge < 1.5 && rnd() < 0.15) continue;
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.5)) continue;
      if (kept(x, z, 7)) continue;
      const south = z > 46;
      if (south && rnd() < 0.45) continue;
      const h = rr(9, 21) * (edge < 1.6 ? 1.15 : 1), w = h * rr(0.24, 0.34);
      (south ? listS : list).push({ x, z, h, w, y: groundAt(x, z) - 0.2, ry: rr(0, 6.28) });
      solids.push({ x, z, r: 0.45 });
    }
    const mk = (geo, mat, arr, shadow, ink) => {
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((t, i) => im.setMatrixAt(i, M4(t.x, t.y, t.z, 0, t.ry, 0, t.w, t.h, t.w)));
      im.castShadow = shadow; im.receiveShadow = true; forest.add(im);
      if (ink) { const o = new THREE.InstancedMesh(geo, inkMat, arr.length); o.instanceMatrix = im.instanceMatrix; forest.add(o); }
      return im;
    };
    mk(needleGeo, needleMat, list, true, true); mk(trunkGeo, MAT.bark, list, true, false);
    mk(needleGeo, needleMatS, listS, true, true); mk(trunkGeo, MAT.bark, listS, true, false);
    trees.push(...list, ...listS);
    // лиственные кроны в обычном лесу на юге
    const crown = new THREE.IcosahedronGeometry(1, 1); { const p = crown.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.35 * Math.abs(Math.sin(i * 3.1)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } crown.computeVertexNormals(); }
    const leafMat = paint({ base: '#58803e', stroke: [0, -1, 0.3], strokeAmt: 0.3, break: 0.4, rim: 1.0 });
    const dec = [];
    for (let k = 0; k < 220; k++) {
      const x = rr(-80, 80), z = rr(48, 150); if (nearPath(x, z)) continue;
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < 2.5)) continue;
      if (kept(x, z, 7)) continue;
      const s0 = rr(2.6, 4.2), y = groundAt(x, z);
      const trunk = M4(x, y, z, 0, 0, 0, s0 * 0.09, s0 * 1.9, s0 * 0.09);
      dec.push({ x, z, y, s: s0, trunk }); solids.push({ x, z, r: 0.4 });
    }
    const cm = new THREE.InstancedMesh(crown, leafMat, dec.length * 3); let ci = 0;
    for (const d of dec) for (let j = 0; j < 3; j++) cm.setMatrixAt(ci++, M4(d.x + rr(-1, 1) * d.s * 0.4, d.y + d.s * (1.9 + j * 0.45), d.z + rr(-1, 1) * d.s * 0.4, rr(0, 3), rr(0, 3), 0, d.s * rr(0.7, 1.0), d.s * rr(0.6, 0.9), d.s * rr(0.7, 1.0)));
    cm.castShadow = true; cm.receiveShadow = true; forest.add(cm);
    { const o = new THREE.InstancedMesh(crown, inkMat, dec.length * 3); o.instanceMatrix = cm.instanceMatrix; forest.add(o); }
    const tm = new THREE.InstancedMesh(trunkGeo, MAT.bark, dec.length); dec.forEach((d, i) => tm.setMatrixAt(i, M4(d.x, d.y, d.z, 0, 0, 0, d.s * 0.12, d.s * 2.1, d.s * 0.12))); tm.castShadow = true; forest.add(tm);
    // сухостой: голые стволы с обломанными сучьями, у болота и в воде
    const PD = new Pack();
    beam(PD, MAT.bark, V(0, 0, 0), V(0.1, 1, 0.05), 0.04, 6);
    for (let k = 0; k < 6; k++) { const y = rr(0.35, 0.95), a = rr(0, 6.28); beam(PD, MAT.bark, V(0, y, 0), V(Math.cos(a) * rr(0.15, 0.35), y + rr(0.05, 0.2), Math.sin(a) * rr(0.15, 0.35)), 0.012, 4); }
    const deadGeo = mergeAll(PD);
    const dead = [];
    for (let k = 0; k < 140; k++) {
      const a = rr(0, 6.28), r = rr(0.7, 1.9), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r;
      if (nearPath(x, z) || Math.hypot(x - TREE.x, z - TREE.z) < 12) continue;
      if (walks.some((w) => w.y !== null && segDist(x, z, w) < 3.5)) continue;
      if (kept(x, z, 6)) continue;
      if (solids.some((s) => s.r > 1 && Math.hypot(s.x - x, s.z - z) < s.r + 2)) continue;
      dead.push({ x, z, y: groundAt(x, z) - 0.3, h: rr(6, 17), ry: rr(0, 6.28) }); solids.push({ x, z, r: 0.35 });
    }
    const dm = new THREE.InstancedMesh(deadGeo, MAT.bark, dead.length);
    dead.forEach((t, i) => dm.setMatrixAt(i, M4(t.x, t.y, t.z, rr(-0.06, 0.06), t.ry, rr(-0.06, 0.06), t.h, t.h, t.h)));
    dm.castShadow = true; dm.receiveShadow = true; forest.add(dm);
    { const o = new THREE.InstancedMesh(deadGeo, inkMat, dead.length); o.instanceMatrix = dm.instanceMatrix; forest.add(o); }
  }
  scene.add(forest);

  // ---------- камыш, кувшинки ----------
  {
    const blade = new THREE.PlaneGeometry(0.05, 1, 1, 3); blade.translate(0, 0.5, 0);
    { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8) + y * y * 0.12); } }
    const reedMat = paint({ base: '#5d6e34', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.5, rim: 1.2 });
    const reeds = [];
    for (let k = 0; k < 2600; k++) {
      const a = rr(0, 6.28), r = Math.sqrt(rr(0.05, 1.15)), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r;
      const y = groundAt(x, z); if (y < WATER_Y - 0.35 || y > 0.35) continue;
      if (walks.some((w) => w.y !== null && segDist(x, z, w) < w.w * 0.7)) continue;
      const cl = rnd() < 0.5 ? 1 : 0; reeds.push(M4(x, y, z, rr(-0.15, 0.15), rr(0, 6.28), rr(-0.15, 0.15), 1, rr(0.6, 1.6) * (cl ? 1.3 : 1), 1));
    }
    const rm = new THREE.InstancedMesh(blade, reedMat, reeds.length); reeds.forEach((m, i) => rm.setMatrixAt(i, m)); rm.receiveShadow = true; scene.add(rm);
    const pad = new THREE.CircleGeometry(0.32, 9, 0.3, 5.9); pad.rotateX(-Math.PI / 2);
    const padMat = paint({ base: '#4f6a2a', strokeAmt: 0.2, rim: 0.4, wet: 0.8 });
    const pads = [];
    for (let k = 0; k < 600; k++) {
      const x = BASIN.x + rr(-1, 1) * BASIN.rx, z = BASIN.z + rr(-1, 1) * BASIN.rz;
      if (groundAt(x, z) > WATER_Y - 0.05) continue;
      const s = rr(0.6, 1.6); pads.push(M4(x, WATER_Y + 0.01, z, 0, rr(0, 6.28), 0, s, 1, s));
    }
    const pm = new THREE.InstancedMesh(pad, padMat, pads.length); pads.forEach((m, i) => pm.setMatrixAt(i, m)); pm.receiveShadow = true; scene.add(pm);
  }

  // ---------- туман, зелёный столб света, споры ----------
  const mists = [];
  {
    const card = new THREE.PlaneGeometry(1, 1);
    for (let k = 0; k < 34; k++) {
      const a = rr(0, 6.28), r = rr(4, 34), x = BASIN.x + Math.cos(a) * r, z = BASIN.z + Math.sin(a) * r * 0.85;
      const m = new THREE.Mesh(card, mist(k % 3 ? '#2f5a3c' : '#4f8452', { a: rr(0.14, 0.28), seed: k, themeOnly: true }));
      m.position.set(x, rr(0.4, 2.2), z); m.scale.set(rr(10, 22), rr(2, 4.5), 1); m.userData.ry = rr(0, 6.28);
      m.renderOrder = 2; scene.add(m); mists.push(m);
    }
    // дым из дымника хором — зелёный
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(card, mist('#5f8f4a', { a: 0.3, seed: 40 + k, themeOnly: false }));
      m.position.set(-20 + rr(-0.6, 0.6), 9 + k * 1.6, 1 + rr(-0.5, 0.5)); m.scale.set(2.2 + k * 0.9, 2 + k * 0.5, 1); m.renderOrder = 2; scene.add(m); mists.push(m);
    }
    const bg = new THREE.CylinderGeometry(1.6, 5.5, 70, 16, 1, true); bg.translate(0, 35, 0);
    const bm = new THREE.Mesh(bg, beamMat('#6fe8a0', { a: 0.04 })); bm.position.set(TREE.x + 3, groundAt(TREE.x, TREE.z) + 4, TREE.z - 6); bm.rotation.z = -0.12; bm.renderOrder = 3;
    // UV цилиндра: u по кругу, v по высоте — луч как полосы
    scene.add(bm);
    anim.beam = bm;
  }

  // ---------- сборка ----------
  const built = P.build(true, true); scene.add(built);
  const builtG = PG.build(false, false); scene.add(builtG);
  // окна — источники света для ближних построек
  return { solids, lights, walks, anim, trees, mists, TREE, FIRE, pathX, groundAt };
}

// пламя: несколько языков-конусов, колышутся и мерцают
function makeFlame(scene, pos, s) {
  const g = new THREE.Group(); g.position.copy(pos);
  const cols = ['#ff6a1c', '#ffa53a', '#ffe08a'];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s * (1 - i * 0.25), 0.9 * s * (1 - i * 0.2), 6, 1), glow(cols[i], { k: 1.6 + i * 0.4, flick: 1, seed: i + pos.x }));
    m.position.y = 0.4 * s * (1 - i * 0.2); g.add(m);
  }
  scene.add(g);
  return g;
}
function mergeAll(pack) {
  const list = []; for (const arr of pack.parts.values()) list.push(...arr);
  return mergeGeometries(list, false);
}
function segDist(x, z, w) {
  const ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1];
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
export { segDist };
