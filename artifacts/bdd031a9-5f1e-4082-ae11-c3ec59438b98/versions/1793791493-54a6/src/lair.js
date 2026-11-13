// Логово Лешего, версия 2: болотное царство посреди северного леса (по концептам Michael).
// Центр (0, 0). Богатырь приходит с юга (+z) по лесной тропе, у края болота тропа переходит в мостки.
// Дуб-терем (огромный, заросший, с лианами, наростами-избушками, галереями и винтовыми лестницами) — на севере;
// хоромы с колесом на фронтоне и костёр — на западе; девять изб на сваях вокруг; идолы с оленьими черепами у мостков.
// Вокруг — тёмный ельник, сухостой, корявые ивы с лианами; за ним обычный лес.
import * as THREE from 'three';
import { paint, glow, water, mist, beam as beamMat, inkMat, bubbleMat, BOIL, U } from './toon.js';
import {
  Pack, MAT, M4, V, beam, tube, box, plank, boardwalk, mossStrand, vine, gableRoof, railing, stairs, skull, banner, chain,
  windowLit, lantern, shrooms, rope, lashing, rnd, rr, setSeed, mergeGeometries, boxUV, cylUV,
} from './kit.js';

// ---------- рельеф ----------
// smoothstep как в GLSL: ss(e0, e1, x)
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function n2(x, z) {
  return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 1.3) * 0.5 + Math.sin(z * 0.13 + Math.sin(x * 0.05) * 1.7) * 0.35 + Math.sin((x + z) * 0.31) * 0.15;
}
export const BASIN = { x: 0, z: -6, rx: 54, rz: 46 };
export const WATER_Y = -0.18;
export const WALK_Y = 0.25;
export const TREE = { x: -8, z: -26 };
const ISLANDS = [
  // x, z, радиус, высота над водой (не выше мостков)
  [TREE.x, TREE.z, 17, 0.42], [-32, 2, 9.5, 0.36], [-20, 9, 4.8, 0.3],
  [12, -14, 5.5, 0.32], [30, -4, 5.5, 0.32], [-36, -28, 5.5, 0.32], [-42, 18, 5, 0.32], [22, 15, 5, 0.32], [38, -24, 5, 0.32],
  [-14, 24, 5, 0.32], [10, -40, 5, 0.32], [-28, -46, 5, 0.32],
  [14, 28, 3, 0.28], [-6, 31, 3, 0.28], [6, 4, 2.8, 0.25], [27, 29, 3, 0.28], [46, 8, 3, 0.28], [-25, 31, 3, 0.28], [-44, -8, 4, 0.3],
];
export function groundAt(x, z) {
  const ex = (x - BASIN.x) / BASIN.rx, ez = (z - BASIN.z) / BASIN.rz, e = Math.sqrt(ex * ex + ez * ez);
  const out = 0.3 + n2(x, z) * 0.35 + Math.max(0, Math.hypot(x, z) - 60) * 0.025;
  const b = ss(1.12, 0.88, e);
  let h = out * (1 - b) + (-0.75 + n2(x * 1.7, z * 1.7) * 0.14) * b;
  for (const [ix, iz, r, ih] of ISLANDS) {
    const d = Math.hypot(x - ix, z - iz) / r;
    if (d < 1.3) { const k = ss(1.3, 0.72, d); h = Math.max(h, WATER_Y + ih * k - (1 - k) * 0.55 + n2(x * 3, z * 3) * 0.05 * k); }
  }
  return h;
}

// ракурсы: камеры и линии взгляда, тут ничего высокого не ставим
export const SHOT_CAMS = {
  path: { pos: [6, 2.6, 64], look: [-2, 4, 20] },
  whole: { pos: [5, 2.4, 21], look: [-9, 10.5, -22] },
  tree: { pos: [2, 4.2, -3], look: [-8, 15, -26] },
  hall: { pos: [-10.5, 2.5, 13.5], look: [-31, 4.5, 2] },
  idol: { pos: [19.5, 2.4, 36.5], look: [13.6, 6.0, 27.6] },
  hut: { pos: [11, 2.3, 7.5], look: [23, 3.2, 15.5] },
  walks: { pos: [26, 1.7, 2], look: [8, 0.6, -6] },
  water: { pos: [3, 1.3, 8], look: [-10, 0.2, -10] },
  top: { pos: [44, 125, 100], look: [-4, 0, -8] },
  edge: { pos: [10, 3, 64], look: [0, 3, 36] },
};
function sightDist(x, z) {
  let m = 1e9;
  for (const k in SHOT_CAMS) {
    if (k === 'top') continue;
    const s = SHOT_CAMS[k], ax = s.pos[0], az = s.pos[2], bx = s.look[0], bz = s.look[2];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    // ближняя часть луча важнее (до 22 м от камеры)
    if (t * L > 36) continue;
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}
const kept = (x, z, r) => Object.values(SHOT_CAMS).some((s) => Math.hypot(x - s.pos[0], z - s.pos[2]) < r) || sightDist(x, z) < 3.4;

export function buildLair(scene) {
  setSeed(11);
  const solids = [];   // круги {x, z, r, y0?, y1?}
  const lights = [];   // { pos, col, r, flick }
  const walks = [];    // отрезки {a, b, w, y} и пандусы {ya, yb}
  const plantSpots = [];
  const perches = [];  // места для ворон {x, y, z, ry}
  const lilyPads = [];
  const anim = { flames: [], smoke: [] };
  const P = new Pack();      // постройки и детали (с контуром)
  const PG = new Pack();     // светящееся
  const ORANGE = [1.0, 0.52, 0.2], GREEN = [0.5, 0.95, 0.28], BLUE = [0.25, 0.7, 1.0];
  const addLight = (pos, col, r, flick = 0.3) => lights.push({ pos, col, r, flick });

  // ---------- земля и вода ----------
  {
    const S = 360, N = 240;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
    const cMud = new THREE.Color('#33331f'), cMoss = new THREE.Color('#4f6a2c'), cLitter = new THREE.Color('#5e4e33'), cGrass = new THREE.Color('#6f8a45'), cNeedle = new THREE.Color('#4a3a28');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); const y = groundAt(x, z); pos.setY(i, y);
      const wet = ss(0.12, -0.3, y);
      const south = ss(46, 80, z);
      const c = cLitter.clone().lerp(cMoss, 0.5 + n2(x * 2.3, z * 2.3) * 0.45).lerp(cNeedle, Math.max(0, n2(x * 4.1, z * 3.7)) * 0.4).lerp(cMud, wet).lerp(cGrass, south * 0.7);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, paint({ base: '#ffffff', vcol: true, moss: '#4d6a2a', mossAmt: 0.35, stroke: [1, 0, 0.3], strokeAmt: 0.22, break: 0.3, rim: 0 }));
    m.receiveShadow = true; scene.add(m);
    const wg = new THREE.PlaneGeometry(BASIN.rx * 2.3, BASIN.rz * 2.3, 230, 200); wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, water()); w.position.set(BASIN.x, WATER_Y, BASIN.z); w.receiveShadow = true; scene.add(w);
  }
  // очаги бурления: у корней дуба, в протоках
  const boils = [[TREE.x + 13, TREE.z + 9, 5, 0.9], [4, -6, 4, 0.8], [-22, -8, 4.5, 0.85], [20, 4, 3.5, 0.7], [-8, 16, 3, 0.6], [32, -14, 4, 0.75]];
  boils.forEach((b, i) => BOIL[i].set(...b));

  // ---------- дома на сваях ----------
  // Сваи, настил, стены из брёвен с проёмами (дверь и окна вырезаны), внутри тёплый свет, дверь открыта,
  // крыша дранкой с красным узором выходит над крыльцом, крыльцо с перилами, лестница со ступенями до мостков.
  function stiltHouse(cx, cz, face, o = {}) {
    const w = o.w || 4.4, d = o.d || 4.2, wallH = o.wallH || 2.5, roofH = o.roofH || 3.0, porch = o.porch || 1.8;
    const rot = Math.atan2(face[0] - cx, face[1] - cz);
    const gy = groundAt(cx, cz), fy = Math.max(gy, WATER_Y) + (o.stilt || 1.5);
    const c = Math.cos(rot), s = Math.sin(rot);
    const L = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
    const LV = (lx, y, lz) => { const [x, z] = L(lx, lz); return V(x, y, z); };
    const pw = w + 1.4, front = d / 2 + porch, back = -d / 2 - 0.35;
    // сваи сеткой и раскосы крестом
    const cols = [-pw / 2 + 0.15, -w / 4, w / 4, pw / 2 - 0.15], rows = [back + 0.1, -d / 6, d / 6, d / 2 + 0.1, front - 0.15];
    for (const lx of cols) for (const lz of rows) {
      const [x, z] = L(lx, lz);
      beam(P, MAT.woodDark, V(x, groundAt(x, z) - 0.6, z), V(x + rr(-0.05, 0.05), fy - 0.08, z + rr(-0.05, 0.05)), rr(0.13, 0.17), 6);
    }
    for (const lz of [back + 0.1, front - 0.15]) for (let i = 0; i < cols.length - 1; i++) {
      const y0 = Math.max(groundAt(...L(cols[i], lz)), WATER_Y) + 0.1;
      if (fy - y0 < 0.8) continue;
      beam(P, MAT.woodDark, LV(cols[i], y0, lz), LV(cols[i + 1], fy - 0.25, lz), 0.06, 5);
      beam(P, MAT.woodDark, LV(cols[i + 1], y0, lz), LV(cols[i], fy - 0.25, lz), 0.06, 5);
    }
    for (const lx of cols) beam(P, MAT.woodDark, LV(lx, fy - 0.18, back), LV(lx, fy - 0.18, front), 0.1, 6); // лаги
    // настил поперёк
    const nPl = Math.round((front - back) / 0.29);
    for (let k = 0; k < nPl; k++) { const lz = back + (k + 0.5) * (front - back) / nPl; const [x, z] = L(0, lz); plank(P, rnd() < 0.25 ? MAT.plankOld : MAT.plank, x, fy, z, pw, 0.28, rot + Math.PI / 2, 0.08); }
    // проёмы: дверь и окна (локальные x0, x1, y0, y1 по стене)
    const doorX = o.doorX || 0, dw = 1.05, dh = 1.95;
    const openF = [[doorX - dw / 2, doorX + dw / 2, 0, dh]];
    const wins = [];
    for (const sx of [-1, 1]) { const x = sx * (w * 0.32) + doorX * 0.2; if (Math.abs(x - doorX) > dw / 2 + 0.55) { openF.push([x - 0.33, x + 0.33, 0.95, 1.65]); wins.push(['f', x]); } }
    const openS = [[-0.33, 0.33, 0.95, 1.6]];
    const R = 0.17, step = 0.33, logs = Math.round(wallH / step);
    const wallRow = (ax, az, bx, bz, ext, opens) => {
      // стена от (ax,az) до (bx,bz) локально; бревно с выпуском ext на углах, проёмы вырезаны
      const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      for (let k = 0; k < logs; k++) {
        const y = fy + 0.2 + k * step;
        let iv = [[-ext, len + ext]];
        for (const [o0, o1, h0, h1] of opens) {
          if (y + R * 0.6 < fy + h0 || y - R * 0.6 > fy + h1) continue;
          const a0 = o0 + len / 2, a1 = o1 + len / 2;
          iv = iv.flatMap(([p, q]) => (a1 <= p || a0 >= q ? [[p, q]] : [[p, a0], [a1, q]].filter(([u, v]) => v - u > 0.15)));
        }
        for (const [p, q] of iv) beam(P, MAT.log, LV(ax + ux * p, y, az + uz * p), LV(ax + ux * q, y + rr(-0.02, 0.02), az + uz * q), R * rr(0.92, 1.05), 7);
      }
    };
    wallRow(-w / 2, d / 2, w / 2, d / 2, 0.3, openF);
    wallRow(w / 2, -d / 2, -w / 2, -d / 2, 0.3, []);
    wallRow(-w / 2, -d / 2, -w / 2, d / 2, 0.3, openS);
    wallRow(w / 2, d / 2, w / 2, -d / 2, 0.3, o.sideWin2 === false ? [] : openS);
    const topY = fy + 0.2 + logs * step - 0.1;
    // внутри: тёмный пол, тёплый свет на задней стене и по бокам (видно в дверь и окна)
    box(P, MAT.dark, w - 0.4, 0.05, d - 0.4, M4(cx, fy + 0.06, cz, 0, rot));
    const inMat = o.green ? MAT.inGreen : MAT.inOrange;
    PG.add(inMat, new THREE.PlaneGeometry(w - 0.5, wallH), M4(...L(0, -d / 2 + 0.3).flatMap((v, i) => (i === 0 ? [v, fy + wallH / 2 + 0.1] : [v])), 0, rot, 0));
    for (const sx of [-1, 1]) PG.add(inMat, new THREE.PlaneGeometry(d - 0.6, wallH * 0.9), (() => { const [x, z] = L(sx * (w / 2 - 0.28), 0); return M4(x, fy + wallH / 2, z, 0, rot - sx * Math.PI / 2, 0); })());
    box(P, MAT.dark, w - 0.3, 0.06, d - 0.3, M4(cx, topY + 0.02, cz, 0, rot)); // потолок
    // дверной проём: косяки, притолока, порог, дверь распахнута наружу
    {
      const zf = d / 2 + R + 0.02;
      for (const sx of [-1, 1]) box(P, MAT.woodDark, 0.16, dh + 0.12, 0.42, M4(...(() => { const [x, z] = L(doorX + sx * (dw / 2 + 0.06), d / 2); return [x, fy + dh / 2 + 0.02, z]; })(), 0, rot, 0));
      box(P, MAT.woodDark, dw + 0.5, 0.2, 0.44, M4(...(() => { const [x, z] = L(doorX, d / 2); return [x, fy + dh + 0.1, z]; })(), 0, rot, 0));
      box(P, MAT.woodDark, dw + 0.2, 0.08, 0.44, M4(...(() => { const [x, z] = L(doorX, d / 2); return [x, fy + 0.06, z]; })(), 0, rot, 0));
      const hx = doorX - dw / 2, open = rr(1.0, 1.4);
      const [hx0, hz0] = L(hx, zf);
      const g = boxUV(new THREE.BoxGeometry(dw - 0.06, dh - 0.06, 0.07), 1, 1, 1); g.translate((dw - 0.06) / 2, 0, 0);
      P.add(MAT.door, g, M4(hx0, fy + dh / 2 + 0.02, hz0, 0, rot - open, 0));
      if (o.doorSkull !== false) skull(P, ...L(doorX, d / 2 + 0.25).flatMap((v, i) => (i === 0 ? [v, fy + dh + 0.5] : [v])), 0.7, rot, !!o.antlers, true);
    }
    // окна в проёмах (бычий пузырь светится), ставни
    for (const [, x] of wins) { const [wx, wz] = L(x, d / 2 + 0.05); windowLit(P, PG, o.green ? MAT.winGreen : MAT.winOrange, wx, fy + 1.3, wz, rot, 0.62, 0.66); }
    for (const sx of [-1, 1]) { if (sx > 0 && o.sideWin2 === false) continue; const [wx, wz] = L(sx * (w / 2 + 0.05), 0); windowLit(P, PG, o.green ? MAT.winGreen : MAT.winOrange, wx, fy + 1.28, wz, rot + sx * Math.PI / 2, 0.62, 0.6); }
    // фронтоны (спереди и сзади) и крыша, выходящая над крыльцом
    const roofZ = porch * 0.42, roofD = d + porch * 0.84;
    for (const e of [1, -1]) {
      const g = new THREE.BufferGeometry(), hw = w / 2 + 0.32;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-hw, 0, 0, hw, 0, 0, 0, roofH * (hw / (w / 2 + 0.6)), 0], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      g.setIndex(e > 0 ? [0, 1, 2] : [0, 2, 1]); g.computeVertexNormals();
      const [x, z] = L(0, e * (d / 2 + R * 0.6));
      P.add(o.gable && e > 0 ? MAT.gable : MAT.woodDark, g, M4(x, topY, z, 0, rot, 0));
      if (!o.gable && e > 0 && roofH > 2.4) { const [gx, gz] = L(0, d / 2 + R + 0.06); windowLit(P, PG, o.green ? MAT.winGreen : MAT.winOrange, gx, topY + roofH * 0.35, gz, rot, 0.4, 0.45, { shutter: false, sill: false }); }
    }
    const [rcx, rcz] = L(0, roofZ);
    gableRoof(P, rcx, topY, rcz, w + 0.3, roofD, roofH, rot, 0.62, { horns: o.horns || 1.3 });
    // столбы крыльца держат свес
    for (const sx of [-1, 1]) { const p = LV(sx * (w / 2 + 0.3), 0, front - 0.25); beam(P, MAT.woodDark, V(p.x, fy, p.z), V(p.x, topY + 0.15, p.z), 0.11, 6); lashing(P, p.x, fy + 1.2, p.z, 0.11); }
    // перила крыльца с проходом к лестнице
    const sw = o.stairW || 1.15;
    railing(P, LV(-pw / 2, 0, front), LV(-sw / 2 - 0.05, 0, front), fy, 0.95);
    railing(P, LV(sw / 2 + 0.05, 0, front), LV(pw / 2, 0, front), fy, 0.95);
    railing(P, LV(pw / 2, 0, front), LV(pw / 2, 0, d / 2 + 0.3), fy, 0.95);
    railing(P, LV(-pw / 2, 0, d / 2 + 0.3), LV(-pw / 2, 0, front), fy, 0.95);
    // лестница: от края крыльца вниз к мосткам/земле
    const rise0 = fy - WALK_Y;
    const nSt = Math.max(2, Math.round(rise0 / 0.22)), run = nSt * 0.3;
    const bot = LV(0, 0, front + run), botY = Math.max(WALK_Y, groundAt(bot.x, bot.z) + 0.03);
    const top = LV(0, fy, front - 0.02);
    walks.push(stairs(P, V(bot.x, botY, bot.z), V(top.x, fy, top.z), sw));
    // площадка крыльца и пол — ходить можно
    walks.push({ a: L(0, d / 2 + 0.1), b: L(0, front - 0.05), w: pw - 0.2, y: fy + 0.04 });
    // у двери фонарь, по сторонам факелы, по углам полотна, столб с черепом
    { const p = LV(doorX + dw / 2 + 0.45, 0, d / 2 + R + 0.25); lantern(P, PG, p.x, fy + 2.0, p.z, 1.0); beam(P, MAT.iron, V(p.x, fy + 2.4, p.z), LV(doorX + dw / 2 + 0.45, fy + 2.4, d / 2 + R).clone(), 0.015, 4); }
    { const p = LV(doorX, 0, d / 2 + 1.0); addLight(V(p.x, fy + 1.5, p.z), o.green ? GREEN : ORANGE, o.lightR || 7.5, 0.6); }
    for (const sx of [-1, 1]) {
      const p = LV(sx * (sw / 2 + 0.35), 0, front + 0.05);
      beam(P, MAT.woodDark, V(p.x, fy - 0.2, p.z), V(p.x, fy + 1.55, p.z), 0.05, 5);
      P.add(MAT.iron, new THREE.CylinderGeometry(0.09, 0.05, 0.16, 6), M4(p.x, fy + 1.6, p.z));
      anim.flames.push(makeFlame(scene, V(p.x, fy + 1.66, p.z), 0.38));
    }
    for (const sx of [-1, 1]) { const [bx, bz] = L(sx * (w / 2 + 0.42), d / 2 + 0.45); banner(P, bx, topY - 0.05, bz, 0.5, rr(1.4, 2.0), rot); }
    if (o.skullPost !== false) { const p = LV(pw / 2 + 0.25, 0, front + 0.3); beam(P, MAT.woodDark, V(p.x, groundAt(p.x, p.z) - 0.4, p.z), V(p.x, fy + 2.4, p.z), 0.08, 6); skull(P, p.x, fy + 2.6, p.z, 0.55, rot, false); perches.push({ x: p.x, y: fy + 2.85, z: p.z, ry: rot }); }
    // ворона на коньке
    perches.push({ ...(() => { const p = LV(0, topY + roofH + 0.15, -d / 2 + 0.3); return { x: p.x, y: p.y, z: p.z }; })(), ry: rot + Math.PI / 2 });
    // дым из дымника (зеленоватый)
    if (o.smoke) for (let k = 0; k < 4; k++) anim.smoke.push({ x: rcx + k * 0.7 + rr(-0.4, 0.4), y: topY + roofH + 0.8 + k * 1.6, z: rcz + k * 0.4, s: 2.0 + k * 1.1 });
    solids.push({ x: cx, z: cz, r: Math.min(w, d) * 0.55, y0: fy - 0.5, y1: fy + 3 });
    for (const lx of [-pw / 2 + 0.15, pw / 2 - 0.15]) for (const lz of [back + 0.1, front - 0.15]) { const [x, z] = L(lx, lz); solids.push({ x, z, r: 0.25, y1: fy - 0.3 }); }
    const ext = LV(0, 0, front + run + 0.5);
    return { fy, rot, stairBot: [ext.x, ext.z], L };
  }

  // ---------- мостки ----------
  const W = (pts, o) => { const segs = boardwalk(P, pts, WALK_Y, 1.75, groundAt, o); walks.push(...segs); plantSpots.push(...segs.spots); return segs; };
  const J = { E0: [3, 44], E1: [2, 31], J1: [0, 17], J2: [-3, 3], J3: [-6, -10], A: [8, -4], B: [20, -4], C: [-20, -14], F: [-16, 10] };

  const hall = stiltHouse(-32, 2, [-14, 1], { w: 7.4, d: 8.6, wallH: 2.9, roofH: 6.2, porch: 2.8, gable: true, lightR: 10, stilt: 1.4, stairW: 1.9, horns: 1.9, antlers: true, smoke: true, skullPost: false });
  const H = [
    stiltHouse(12, -14, [8, -4], { w: 4.2, d: 4.0, roofH: 3.2 }),
    stiltHouse(30, -4, [20, -4], { w: 4.6, d: 4.4, roofH: 3.4, smoke: true }),
    stiltHouse(-36, -28, [-24, -16], { w: 4.2, d: 4.2, roofH: 3.1, green: true }),
    stiltHouse(-42, 18, [-30, 14], { w: 4.0, d: 3.8, roofH: 3.0, smoke: true }),
    stiltHouse(22, 15, [10, 12], { w: 4.6, d: 4.2, roofH: 3.5 }),
    stiltHouse(38, -24, [30, -14], { w: 4.0, d: 4.0, roofH: 3.0, sideWin2: false }),
    stiltHouse(-14, 24, [-8, 15], { w: 4.2, d: 4.0, roofH: 3.2, smoke: true }),
    stiltHouse(10, -40, [14, -30], { w: 4.4, d: 4.2, roofH: 3.3, green: true }),
    stiltHouse(-28, -46, [-24, -34], { w: 4.0, d: 3.8, roofH: 3.0 }),
  ];
  // главная линия: с берега к двери дуба
  W([J.E0, J.E1, J.J1, J.J2, J.J3], { rails: 0.75 });
  W([J.J1, [-8, 15], H[6].stairBot]);
  W([J.J1, [-8, 12], J.F]);
  W([J.J2, [-14, 1], hall.stairBot], { rails: 0.8 });
  W([J.J1, [10, 12], H[4].stairBot]);
  W([J.J2, J.A, H[0].stairBot]);
  W([J.A, J.B, H[1].stairBot]);
  W([J.B, [30, -14], H[5].stairBot]);
  W([J.J3, J.C, [-24, -16], H[2].stairBot]);
  W([J.C, [-24, -34], H[8].stairBot]);
  W([J.F, [-30, 14], H[3].stairBot]);
  W([J.A, [18, -20], [14, -30], H[7].stairBot]);

  // ---------- дуб-терем ----------
  const T = TREE, base = groundAt(T.x, T.z);
  const rT = (y) => 3.7 + 0.5 * (1 - y / 30) + 3.0 * Math.exp(-y / 3.2);   // радиус ствола на высоте y
  const doorA = Math.atan2(J.J3[1] - T.z, J.J3[0] - T.x);                  // дверь смотрит на мостки
  const stairA0 = doorA + 0.75;                                            // винтовая лестница начинается правее двери
  {
    // ствол: бугристый, с контрфорсами у земли
    const g = new THREE.CylinderGeometry(1, 1, 31, 40, 34, true); g.translate(0, 15.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const ad = (b) => Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      const keep = Math.min(THREE.MathUtils.smoothstep(ad(doorA), 0.35, 0.8), THREE.MathUtils.smoothstep(ad(stairA0 + 0.8), 0.9, 1.4));
      const butt = 1 + Math.max(0, Math.sin(a * 7 + 0.4)) * 0.35 * Math.exp(-y / 4) * keep;
      const bulge = 1 + 0.08 * Math.sin(a * 5 + y * 0.35) + 0.05 * Math.sin(a * 11 - y * 0.6) + 0.06 * Math.sin(y * 0.5 + a * 2);
      const r = rT(y) * bulge * butt;
      p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r);
    }
    g.computeVertexNormals(); cylUV(g, 31, 5);
    P.add(MAT.bark, g, M4(T.x, base - 0.6, T.z));
    solids.push({ x: T.x, z: T.z, r: rT(0) + 0.6, y1: base + 2 });
    // корни-сваи: изогнутые ноги дугой уходят в болото (просвет у двери и у лестницы)
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2 + rr(-0.12, 0.12);
      const da = Math.abs(((a - doorA + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      const sa = Math.abs(((a - stairA0 + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      if (da < 0.42 || sa < 0.3) continue;
      const y0 = rr(3.5, 9), r1 = rr(12, 17);
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.2) {
        const r = rT(y0) * 0.9 + (r1 - rT(y0) * 0.9) * t, y = base + y0 * (1 - t) * (1 - t) * 0.95 + 2.2 * Math.sin(t * Math.PI) * (1 - t * 0.4) - 0.7 * t;
        pts.push(V(T.x + Math.cos(a + t * 0.12) * r, y, T.z + Math.sin(a + t * 0.12) * r));
      }
      const rad = rr(0.55, 0.95);
      tube(P, MAT.bark, pts, rad, 8, 14);
      const end = pts[pts.length - 1]; solids.push({ x: end.x, z: end.z, r: rad + 0.2 });
      for (let j = 0; j < 4; j++) { const q = pts[1 + Math.floor(rnd() * 4)]; mossStrand(P, q.x, q.y - rad * 0.8, q.z, rr(0.6, 2.2), rr(0.2, 0.45), a); }
      if (rnd() < 0.6) { const q = pts[4]; shrooms(P, PG, q.x, q.y + rad * 0.85, q.z, 6, 1.2, rnd() < 0.6 ? MAT.shroom : MAT.shroomG); if (rnd() < 0.5) addLight(V(q.x, q.y + 1.0, q.z), BLUE, 5.5, 0.1); }
      if (rnd() < 0.5) perches.push({ x: pts[2].x, y: pts[2].y + rad, z: pts[2].z, ry: a });
    }
    // крона: толстые сухие ветви вверх и в стороны, сучья, лианы и мох свисают
    const crownTips = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + 0.3, lean = rr(0.45, 0.9), len = rr(11, 17);
      const p0 = V(T.x + Math.cos(a) * 1.8, base + rr(24, 29), T.z + Math.sin(a) * 1.8);
      const p1 = p0.clone().add(V(Math.cos(a) * len * lean * 0.5, len * 0.5, Math.sin(a) * len * lean * 0.5));
      const p2 = p1.clone().add(V(Math.cos(a + 0.35) * len * lean * 0.55, len * 0.32, Math.sin(a + 0.35) * len * lean * 0.55));
      const rad = rr(0.9, 1.5);
      tube(P, MAT.bark, [p0, p0.clone().lerp(p1, 0.5).add(V(0, -0.5, 0)), p1, p2], rad, 8, 12);
      P.add(MAT.bark, new THREE.ConeGeometry(rad * 0.75, 1.6, 7), M4(p2.x, p2.y + 0.6, p2.z, rr(-0.4, 0.4), 0, rr(-0.4, 0.4)));
      crownTips.push(p2);
      for (let j = 0; j < 4; j++) {
        const s = p1.clone().lerp(p2, rr(0, 1)), dd = V(rr(-1, 1), rr(-0.1, 0.9), rr(-1, 1)).normalize().multiplyScalar(rr(2.5, 5.5));
        beam(P, MAT.bark, s, s.clone().add(dd), rr(0.14, 0.3), 6);
        perches.push({ x: s.x + dd.x, y: s.y + dd.y + 0.1, z: s.z + dd.z, ry: rr(0, 6) });
      }
      for (let j = 0; j < 9; j++) {
        const s = p0.clone().lerp(p2, rr(0.15, 1)); const top = V(s.x, s.y - rad * 0.8, s.z);
        if (rnd() < 0.55) vine(P, top, rr(4, 15), a, rr(0.2, 0.7)); else mossStrand(P, top.x, top.y, top.z, rr(1.5, 4.5), rr(0.35, 0.7), rr(0, 6));
      }
    }
    // галереи, винтовые лестницы, окна по стволу
    const levels = [7.0, 13.0, 19.0, 24.5];
    let a = stairA0, yPrev = 0;
    levels.forEach((ly, li) => {
      // винтовая лестница от предыдущего яруса до этого
      const rise = ly - yPrev, n = Math.round(rise / 0.22), dth = 0.32 / (rT(yPrev + rise / 2) + 1.3);
      const pts = [], ptsO = [];
      for (let k = 0; k <= n; k++) {
        const ak = a + dth * k, y = base + yPrev + rise * k / n, R = rT(y - base) + 1.25;
        if (k < n) {
          const ym = y + rise / n - 0.035;
          box(P, rnd() < 0.3 ? MAT.plankOld : MAT.plank, 1.25, 0.08, 0.36, M4(T.x + Math.cos(ak + dth / 2) * R, ym, T.z + Math.sin(ak + dth / 2) * R, 0, -(ak + dth / 2), 0));
          if (k % 3 === 0) beam(P, MAT.woodDark, V(T.x + Math.cos(ak) * (R - 0.85), ym - 0.9, T.z + Math.sin(ak) * (R - 0.85)), V(T.x + Math.cos(ak) * (R + 0.6), ym - 0.05, T.z + Math.sin(ak) * (R + 0.6)), 0.06, 5);
        }
        pts.push(V(T.x + Math.cos(ak) * (R + 0.62), y - 0.1, T.z + Math.sin(ak) * (R + 0.62)));
        ptsO.push(V(T.x + Math.cos(ak) * (R + 0.62), y + 0.95, T.z + Math.sin(ak) * (R + 0.62)));
        if (k % 4 === 0) beam(P, MAT.woodDark, pts[pts.length - 1], ptsO[ptsO.length - 1], 0.045, 5);
        // пандус для ходьбы: хорды винта
        if (k > 0) { const a0 = a + dth * (k - 1); walks.push({ a: [T.x + Math.cos(a0) * R, T.z + Math.sin(a0) * R], b: [T.x + Math.cos(ak) * R, T.z + Math.sin(ak) * R], w: 1.1, ya: base + yPrev + rise * (k - 1) / n, yb: y, y, ramp: true }); }
      }
      tube(P, MAT.woodDark, pts, 0.07, 5, n * 2); tube(P, MAT.wood, ptsO, 0.045, 5, n * 2);
      const aEnd = a + dth * n;
      // галерея: дуга от конца лестницы, настил, укосины, перила
      const y = base + ly, R = rT(ly) + 0.9, g0 = aEnd - 0.35, g1 = aEnd + rr(2.4, 3.0);
      const nP = Math.round((g1 - g0) * (R + 0.7) / 0.29);
      for (let k = 0; k < nP; k++) { const aa = g0 + (g1 - g0) * (k + 0.5) / nP; plank(P, rnd() < 0.25 ? MAT.plankOld : MAT.plank, T.x + Math.cos(aa) * (R + 0.75), y, T.z + Math.sin(aa) * (R + 0.75), 1.7, 0.3, -aa, 0.09); }
      for (let k = 0; k <= 7; k++) { const aa = g0 + (g1 - g0) * k / 7; beam(P, MAT.woodDark, V(T.x + Math.cos(aa) * (R - 0.6), y - 2.0, T.z + Math.sin(aa) * (R - 0.6)), V(T.x + Math.cos(aa) * (R + 1.5), y - 0.06, T.z + Math.sin(aa) * (R + 1.5)), 0.09, 5); }
      const rp = []; for (let k = 0; k <= 9; k++) { const aa = g0 + 0.3 + (g1 - g0 - 0.3) * k / 9; rp.push(V(T.x + Math.cos(aa) * (R + 1.55), 0, T.z + Math.sin(aa) * (R + 1.55))); }
      for (let k = 0; k < 9; k++) railing(P, rp[k], rp[k + 1], y + 0.05, 0.9, 0.1);
      for (let k = 0; k < 10; k++) { const aa = g0 + (g1 - g0) * (k + 0.5) / 10; const a2 = g0 + (g1 - g0) * (k + 1.5) / 10; if (k < 9) walks.push({ a: [T.x + Math.cos(aa) * (R + 0.75), T.z + Math.sin(aa) * (R + 0.75)], b: [T.x + Math.cos(a2) * (R + 0.75), T.z + Math.sin(a2) * (R + 0.75)], w: 1.5, y: y + 0.05 }); }
      solids.push({ x: T.x, z: T.z, r: rT(ly) + 0.25, y0: y - 1, y1: y + 2.5 });
      // окна по стволу над галереей и фонари
      const nw = 4 + li;
      for (let k = 0; k < nw; k++) {
        const aa = g0 + (g1 - g0) * (k + 0.5) / nw + rr(-0.06, 0.06), r0 = rT(ly + 1.3) * 1.02;
        windowLit(P, PG, MAT.winGreen, T.x + Math.cos(aa) * r0, y + 1.5, T.z + Math.sin(aa) * r0, Math.PI / 2 - aa, 1.05, 1.35);
        box(P, MAT.roof, 1.4, 0.08, 0.7, M4(T.x + Math.cos(aa) * (r0 + 0.3), y + 2.4, T.z + Math.sin(aa) * (r0 + 0.3), 0.4, Math.PI / 2 - aa, 0));
      }
      const am = (g0 + g1) / 2;
      addLight(V(T.x + Math.cos(am) * (R + 2.2), y + 1.4, T.z + Math.sin(am) * (R + 2.2)), GREEN, 9, 0.3);
      { const aa = g1 - 0.25; const p = lantern(P, PG, T.x + Math.cos(aa) * (R + 1.55), y + 1.25, T.z + Math.sin(aa) * (R + 1.55), 1.1, MAT.winGreen); }
      a = aEnd + (g1 - aEnd) * 0.8; yPrev = ly;
    });
    // избушки-наросты: короба с крутой крышей на консолях, окна светятся
    [[doorA + 2.0, 9.5], [doorA - 1.2, 11.0], [doorA + 3.3, 15.5], [doorA - 2.4, 17.0], [doorA + 0.9, 21.5], [doorA - 0.4, 27.0], [doorA + 4.4, 22.5], [doorA - 3.6, 5.2]].forEach(([aa, ly], i) => {
      const y = base + ly, R = rT(ly) + 0.8, x = T.x + Math.cos(aa) * (R + 0.9), z = T.z + Math.sin(aa) * (R + 0.9), rot = Math.PI / 2 - aa;
      const bw = rr(2.0, 2.6), bd = rr(1.8, 2.2), bh = rr(1.6, 2.0);
      // стенки из досок
      for (let k = 0; k < Math.round(bh / 0.3); k++) {
        for (const [ax, az, bx, bz] of [[-bw / 2, bd / 2, bw / 2, bd / 2], [-bw / 2, -bd / 2, -bw / 2, bd / 2], [bw / 2, -bd / 2, bw / 2, bd / 2]]) {
          const c = Math.cos(rot), s = Math.sin(rot);
          const A = V(x + ax * c + az * s, y + 0.15 + k * 0.3, z - ax * s + az * c), B = V(x + bx * c + bz * s, y + 0.15 + k * 0.3, z - bx * s + bz * c);
          if (az === bd / 2 && k >= 1 && k <= 3) { const m1 = A.clone().lerp(B, 0.32), m2 = A.clone().lerp(B, 0.68); beam(P, MAT.log, A, m1, 0.13, 6); beam(P, MAT.log, m2, B, 0.13, 6); } else beam(P, MAT.log, A, B, 0.13, 6);
        }
      }
      PG.add(MAT.inGreen, new THREE.PlaneGeometry(bw * 0.8, bh * 0.8), M4(x, y + bh / 2, z, 0, rot, 0));
      windowLit(P, PG, MAT.winGreen, x + Math.cos(aa) * (bd / 2 + 0.12), y + 0.95, z + Math.sin(aa) * (bd / 2 + 0.12), rot, 0.62, 0.62);
      gableRoof(P, x, y + bh, z, bw, bd + 0.3, rr(1.5, 2.1), rot, 0.4, { horns: 0.9 });
      box(P, MAT.plank, bw + 0.5, 0.1, bd + 0.6, M4(x, y + 0.02, z, 0, rot, 0));
      for (const sx of [-1, 1]) { const c = Math.cos(rot), s = Math.sin(rot); const bx = x + sx * bw * 0.4 * c, bz = z - sx * bw * 0.4 * s; beam(P, MAT.woodDark, V(bx - Math.cos(aa) * (bd / 2 + 0.6), y - 2.0, bz - Math.sin(aa) * (bd / 2 + 0.6)), V(bx + Math.cos(aa) * (bd / 2), y - 0.05, bz + Math.sin(aa) * (bd / 2)), 0.1, 5); }
      addLight(V(x + Math.cos(aa) * 2, y + 1.2, z + Math.sin(aa) * 2), GREEN, 5.5, 0.4);
      perches.push({ x, y: y + bh + 1.9, z, ry: rot });
    });
    // дупла с совами (глаза светятся) — ставим места, сами совы в life.js
    anim.owls = [[doorA + 1.5, 4.3], [doorA - 2.0, 15.0], [doorA + 2.6, 26.5]].map(([aa, ly]) => {
      const r0 = rT(ly) * 0.98, x = T.x + Math.cos(aa) * r0, z = T.z + Math.sin(aa) * r0, y = base + ly;
      P.add(MAT.dark, new THREE.SphereGeometry(0.62, 10, 8), M4(x, y, z, 0, Math.PI / 2 - aa, 0, 0.9, 1.25, 0.35));
      return { x: x + Math.cos(aa) * 0.15, y: y - 0.25, z: z + Math.sin(aa) * 0.15, ry: Math.PI / 2 - aa };
    });
    // дверь у подножия (оттуда выходит Леший): арка из корней, створки распахнуты, внутри зелёный свет, череп с рогами
    {
      const r0 = rT(1.2) + 0.2, dx = T.x + Math.cos(doorA) * r0, dz = T.z + Math.sin(doorA) * r0, rot = Math.PI / 2 - doorA;
      const tx = -Math.sin(doorA), tz = Math.cos(doorA);
      PG.add(MAT.inGreen, new THREE.PlaneGeometry(2.0, 3.2), M4(dx - Math.cos(doorA) * 0.6, base + 1.6, dz - Math.sin(doorA) * 0.6, 0, rot, 0));
      P.add(MAT.dark, new THREE.PlaneGeometry(2.4, 3.6), M4(dx - Math.cos(doorA) * 0.75, base + 1.6, dz - Math.sin(doorA) * 0.75, 0, rot, 0));
      for (const s of [-1, 1]) {
        beam(P, MAT.woodDark, V(dx + tx * s * 1.15, base - 0.2, dz + tz * s * 1.15), V(dx + tx * s * 1.1, base + 3.1, dz + tz * s * 1.1), 0.18, 7);
        tube(P, MAT.bark, [V(dx + tx * s * 1.6, base - 0.3, dz + tz * s * 1.6), V(dx + tx * s * 1.4 + Math.cos(doorA) * 0.3, base + 2.2, dz + tz * s * 1.4 + Math.sin(doorA) * 0.3), V(dx + tx * s * 0.6 + Math.cos(doorA) * 0.4, base + 3.7, dz + tz * s * 0.6 + Math.sin(doorA) * 0.4), V(dx + Math.cos(doorA) * 0.4, base + 3.9, dz + Math.sin(doorA) * 0.4)], 0.32, 7, 10);
        const g = boxUV(new THREE.BoxGeometry(1.05, 2.9, 0.09), 1, 1, 1); g.translate(s * 0.52, 0, 0);
        P.add(MAT.door, g, M4(dx + tx * s * 1.05, base + 1.5, dz + tz * s * 1.05, 0, rot + s * 1.25, 0));
      }
      beam(P, MAT.woodDark, V(dx - tx * 1.35, base + 3.1, dz - tz * 1.35), V(dx + tx * 1.35, base + 3.1, dz + tz * 1.35), 0.17, 6);
      skull(P, dx + Math.cos(doorA) * 0.35, base + 3.75, dz + Math.sin(doorA) * 0.35, 1.25, rot, true, true);
      for (const s of [-1, 1]) { const p = V(dx + tx * s * 1.8 + Math.cos(doorA) * 0.6, base, dz + tz * s * 1.8 + Math.sin(doorA) * 0.6); beam(P, MAT.woodDark, p, V(p.x, base + 2.1, p.z), 0.06, 5); P.add(MAT.iron, new THREE.CylinderGeometry(0.1, 0.06, 0.18, 6), M4(p.x, base + 2.15, p.z)); anim.flames.push(makeFlame(scene, V(p.x, base + 2.22, p.z), 0.45)); }
      addLight(V(dx + Math.cos(doorA) * 1.8, base + 1.7, dz + Math.sin(doorA) * 1.8), GREEN, 10, 0.4);
      addLight(V(T.x + Math.cos(doorA) * 12, base + 12, T.z + Math.sin(doorA) * 12), [0.35, 0.8, 0.3], 16, 0.15);
      addLight(V(dx + Math.cos(doorA) * 2.5, base + 2.2, dz + Math.sin(doorA) * 2.5), ORANGE, 6, 0.8);
      anim.doorLeshy = { x: dx + Math.cos(doorA) * 2.6, z: dz + Math.sin(doorA) * 2.6, yaw: Math.atan2(Math.cos(doorA), Math.sin(doorA)) };
      walks.push({ a: [dx + Math.cos(doorA) * 0.2, dz + Math.sin(doorA) * 0.2], b: [J.J3[0], J.J3[1]], w: 2.0, y: WALK_Y });
    }
    // мох по всему стволу
    for (let k = 0; k < 220; k++) {
      const aa = rr(0, 6.28), y = rr(2, 28), R = rT(y) * 1.03;
      if (rnd() < 0.3) vine(P, V(T.x + Math.cos(aa) * (R + 0.15), base + y, T.z + Math.sin(aa) * (R + 0.15)), rr(1.5, 6), aa, 0.2);
      else mossStrand(P, T.x + Math.cos(aa) * (R + 0.12), base + y, T.z + Math.sin(aa) * (R + 0.12), rr(0.8, 3.5), rr(0.25, 0.6), Math.PI / 2 - aa);
    }
    // грибы-трутовики полками на стволе
    for (let k = 0; k < 26; k++) { const aa = rr(0, 6.28), y = rr(1, 22), R = rT(y); P.add(MAT.bone, new THREE.CylinderGeometry(0.01, rr(0.3, 0.6), 0.12, 9, 1, false, 0, Math.PI), M4(T.x + Math.cos(aa) * R, base + y, T.z + Math.sin(aa) * R, 0, Math.PI / 2 - aa - Math.PI / 2, 0)); }
  }

  // ---------- костёр у хором ----------
  const FIRE = { x: J.F[0] - 3.6, z: J.F[1] - 2.4 };
  {
    const y = groundAt(FIRE.x, FIRE.z);
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; P.add(MAT.stone, new THREE.DodecahedronGeometry(rr(0.2, 0.3), 0), M4(FIRE.x + Math.cos(a) * 0.95, y + 0.1, FIRE.z + Math.sin(a) * 0.95, rr(0, 3), rr(0, 3), 0)); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; beam(P, MAT.log, V(FIRE.x + Math.cos(a) * 0.7, y + 0.05, FIRE.z + Math.sin(a) * 0.7), V(FIRE.x + Math.cos(a) * 0.05, y + 0.5, FIRE.z + Math.sin(a) * 0.05), 0.09, 5); }
    PG.add(MAT.ember, new THREE.CircleGeometry(0.62, 10), M4(FIRE.x, y + 0.12, FIRE.z, -Math.PI / 2));
    addLight(V(FIRE.x, y + 1.1, FIRE.z), ORANGE, 13, 1);
    anim.flames.push(makeFlame(scene, V(FIRE.x, y + 0.15, FIRE.z), 1.15));
    solids.push({ x: FIRE.x, z: FIRE.z, r: 1.2 });
    for (const [ax, az] of [[-1.1, -0.6], [1.1, -0.6], [0, 1.2]]) beam(P, MAT.woodDark, V(FIRE.x + ax, y, FIRE.z + az), V(FIRE.x, y + 2.2, FIRE.z), 0.07, 5);
    lashing(P, FIRE.x, y + 2.05, FIRE.z, 0.12);
    chain(P, V(FIRE.x, y + 2.1, FIRE.z), 0.7);
    P.add(MAT.iron, new THREE.SphereGeometry(0.4, 12, 7, 0, 6.29, 0.9, 2.2), M4(FIRE.x, y + 1.12, FIRE.z));
    // брёвна-скамьи, сушилка с рыбой
    for (const a of [0.6, 2.4, 4.2]) { const x = FIRE.x + Math.cos(a) * 2.4, z = FIRE.z + Math.sin(a) * 2.4; beam(P, MAT.log, V(x - Math.sin(a) * 0.9, y + 0.22, z + Math.cos(a) * 0.9), V(x + Math.sin(a) * 0.9, y + 0.22, z - Math.cos(a) * 0.9), 0.2, 7); }
    const rx = FIRE.x + 2.2, rz = FIRE.z - 2.4;
    for (const s of [-1, 1]) beam(P, MAT.woodDark, V(rx + s * 1.2, y - 0.2, rz), V(rx + s * 1.2, y + 1.9, rz), 0.06, 5);
    beam(P, MAT.woodDark, V(rx - 1.3, y + 1.85, rz), V(rx + 1.3, y + 1.85, rz), 0.05, 5);
    for (let k = 0; k < 6; k++) { const x = rx - 1.0 + k * 0.4; rope(P, V(x, y + 1.85, rz), V(x, y + 1.55, rz), 0.0, 0.01); P.add(MAT.bone, new THREE.SphereGeometry(0.1, 6, 4), M4(x, y + 1.35, rz, 0, 0, 0, 0.6, 2.2, 0.4)); }
    perches.push({ x: FIRE.x, y: y + 2.3, z: FIRE.z, ry: 1 });
  }
  // большой череп над входом в хоромы
  { const [x, z] = hall.L(0, 4.3 + 0.4); skull(P, x, hall.fy + 3.3 + 5.0, z, 1.4, hall.rot, true, true); }

  // ---------- идолы как на концепте ----------
  // Прямой тёсаный столб, резные пояса и личина, красное полотно обёрнуто вокруг и перехвачено верёвкой,
  // сверху короб и олений череп с рогами, на рогах лоскуты; перекладина с цепями и кольцами; у подножия колья и камни.
  function idol(x, z, h, face) {
    const rot = Math.atan2(face[0] - x, face[1] - z);
    const y = groundAt(x, z), c = Math.cos(rot), s = Math.sin(rot);
    const at = (lx, ly, lz) => V(x + lx * c + lz * s, y + ly, z - lx * s + lz * c);
    const wpost = 0.82;
    // столб: блоки с бороздами (резьба)
    const nb = Math.max(3, Math.round(h / 1.6));
    for (let k = 0; k < nb; k++) { const hh = h / nb; box(P, MAT.wood, wpost * rr(0.96, 1.04), hh - 0.05, wpost * rr(0.96, 1.04), M4(...at(0, -0.4 + hh * (k + 0.5), 0).toArray(), 0, rot + rr(-0.02, 0.02), 0)); box(P, MAT.woodDark, wpost * 1.06, 0.1, wpost * 1.06, M4(...at(0, -0.4 + hh * (k + 1), 0).toArray(), 0, rot, 0)); }
    // личина: брови, глаза, нос, рот (вырезаны)
    const fy = h * 0.6;
    box(P, MAT.woodDark, wpost + 0.1, 0.12, 0.12, M4(...at(0, fy + 0.25, wpost / 2 + 0.02).toArray(), 0, rot, 0));
    for (const sd of [-1, 1]) box(P, MAT.dark, 0.13, 0.08, 0.05, M4(...at(sd * 0.15, fy + 0.12, wpost / 2 + 0.01).toArray(), 0, rot, 0));
    box(P, MAT.wood, 0.1, 0.26, 0.1, M4(...at(0, fy - 0.02, wpost / 2 + 0.03).toArray(), 0.2, rot, 0));
    box(P, MAT.dark, 0.26, 0.05, 0.05, M4(...at(0, fy - 0.25, wpost / 2 + 0.01).toArray(), 0, rot, 0));
    // полотно вокруг столба (4 стороны) с верёвочными перехватами
    const cy0 = h * 0.14, cy1 = h * 0.56;
    for (let f = 0; f < 4; f++) {
      const ang = rot + f * Math.PI / 2, p = V(x + Math.sin(ang) * (wpost / 2 + 0.03), 0, z + Math.cos(ang) * (wpost / 2 + 0.03));
      banner(P, p.x, y - 0.4 + cy1, p.z, wpost + 0.06, cy1 - cy0, ang);
    }
    for (const yy of [cy0 - 0.4 + 0.05, cy1 - 0.4 - 0.05, h * 0.3]) for (let f = 0; f < 4; f++) box(P, MAT.rope, wpost + 0.1, 0.05, 0.04, M4(...at(Math.sin(f * Math.PI / 2) * (wpost / 2 + 0.05), yy, Math.cos(f * Math.PI / 2) * (wpost / 2 + 0.05)).toArray(), 0, rot + f * Math.PI / 2, 0));
    // длинный лоскут спереди ниже полотна (как на концепте)
    banner(P, ...at(0, cy1 - 0.4, wpost / 2 + 0.07).toArray(), 0.32, h * 0.62, rot);
    // короб-навершие и череп
    box(P, MAT.woodDark, wpost + 0.28, 0.24, wpost + 0.28, M4(...at(0, h - 0.4 + 0.1, 0).toArray(), 0, rot, 0));
    skull(P, ...at(0, h - 0.4 + 0.42, 0.08).toArray(), 1.35, rot, true, true);
    perches.push({ ...(() => { const p = at(0, h - 0.4 + 0.25, -0.2); return { x: p.x, y: p.y, z: p.z }; })(), ry: rot });
    // перекладина с цепями и кольцами
    beam(P, MAT.woodDark, at(-1.15, h * 0.72, 0.05), at(1.25, h * 0.74, 0.05), 0.07, 5);
    lashing(P, ...at(0, h * 0.72, 0).toArray(), 0.36);
    chain(P, at(1.12, h * 0.73, 0.05), rr(0.8, 1.3), rot, true);
    chain(P, at(-1.0, h * 0.71, 0.05), rr(0.6, 1.0), rot, true);
    banner(P, ...at(0.6, h * 0.72, 0.1).toArray(), 0.16, rr(0.6, 1.0), rot);
    // колья, камни, черепки у подножия
    for (let k = 0; k < 6; k++) { const a = rr(0, 6.28), r = rr(1.0, 2.0), sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r, sy = groundAt(sx, sz); beam(P, MAT.woodDark, V(sx, sy - 0.3, sz), V(sx + rr(-0.12, 0.12), sy + rr(0.8, 1.7), sz + rr(-0.12, 0.12)), 0.06, 5); if (rnd() < 0.4) skull(P, sx, sy + 1.75, sz, 0.32, rr(0, 6), false); }
    for (let k = 0; k < 7; k++) { const a = rr(0, 6.28), r = rr(0.55, 1.0); P.add(MAT.stone, new THREE.DodecahedronGeometry(rr(0.15, 0.32), 0), M4(x + Math.cos(a) * r, y + 0.05, z + Math.sin(a) * r, rr(0, 3), rr(0, 3), 0)); }
    for (let k = 0; k < 5; k++) mossStrand(P, ...at(rr(-0.3, 0.3), h * rr(0.55, 0.95), wpost / 2 + 0.05).toArray(), rr(0.3, 1.0), 0.18, rot);
    // свечки у подножия
    for (let k = 0; k < 3; k++) { const p = at(rr(-0.5, 0.5), 0, wpost / 2 + rr(0.25, 0.5)); beam(P, MAT.bone, V(p.x, y - 0.02, p.z), V(p.x, y + 0.18, p.z), 0.035, 5); PG.add(MAT.candle, new THREE.ConeGeometry(0.03, 0.09, 5), M4(p.x, y + 0.23, p.z)); }
    addLight(at(0, 0.7, wpost / 2 + 0.7), ORANGE, 3.5, 1);
    { const tp = at(1.45, 0, 0.7), ty = groundAt(tp.x, tp.z); beam(P, MAT.woodDark, V(tp.x, ty - 0.3, tp.z), V(tp.x, ty + 2.0, tp.z), 0.06, 5); lashing(P, tp.x, ty + 1.7, tp.z, 0.06); P.add(MAT.iron, new THREE.CylinderGeometry(0.11, 0.06, 0.2, 6), M4(tp.x, ty + 2.05, tp.z)); anim.flames.push(makeFlame(scene, V(tp.x, ty + 2.12, tp.z), 0.5)); addLight(V(tp.x, ty + 2.4, tp.z), ORANGE, 5.5, 0.9); }
    solids.push({ x, z, r: 0.75 });
  }
  idol(14, 28, 7.0, [13, 40]);
  idol(8.8, 15.8, 7.4, [5, 21]);
  idol(-6, 31, 5.8, [2, 40]);
  idol(6, 4, 6.4, [2, 14]);
  idol(27, 29, 5.6, [10, 34]);
  idol(46, 8, 6.0, [30, 2]);
  idol(-25, 31, 5.4, [-10, 34]);
  idol(-44, -8, 6.2, [-32, 2]);

  // колья с черепами вдоль входа и навешанные ловцы-обереги
  for (let k = 0; k < 8; k++) for (const sd of [-1, 1]) {
    const z = 40 - k * 2.6, x = 2.6 + sd * 1.9 + rr(-0.2, 0.2), y = groundAt(x, z);
    if (rnd() < 0.35) continue;
    beam(P, MAT.woodDark, V(x, y - 0.4, z), V(x + rr(-0.1, 0.1), y + rr(1.5, 2.6), z), 0.06, 5);
    if (rnd() < 0.55) skull(P, x, y + 2.55, z, 0.42, sd * 1.4, false);
    else banner(P, x, y + 2.3, z, 0.18, rr(0.6, 1.1), sd * 1.4);
  }

  // ---------- фонари на шестах вдоль мостков ----------
  for (const [x, z, sd] of [[3.4, 36, 1], [1.8, 24, -1], [-1.8, 9, 1], [-5.5, -4, -1], [12, 9, 1], [-6, 14, 1], [14, -4, 1], [-14, -10, -1], [24, -8, 1], [-22, -26, -1], [16, -24, 1], [-24, 12, 1]]) {
    const px = x + sd * 1.3, pz = z, y = groundAt(px, pz);
    beam(P, MAT.woodDark, V(px, y - 0.5, pz), V(px, WALK_Y + 2.6, pz), 0.07, 5);
    beam(P, MAT.woodDark, V(px, WALK_Y + 2.5, pz), V(px - sd * 0.7, WALK_Y + 2.62, pz), 0.04, 5);
    chain(P, V(px - sd * 0.65, WALK_Y + 2.58, pz), 0.3);
    const blue = rnd() < 0.3, p = lantern(P, PG, px - sd * 0.65, WALK_Y + 2.05, pz, 1.0, blue ? MAT.shroom : MAT.winOrange);
    addLight(p, blue ? BLUE : ORANGE, 5.5, blue ? 0.2 : 0.7);
    perches.push({ x: px, y: WALK_Y + 2.7, z: pz, ry: rr(0, 6) });
  }

  // ---------- лодки-долблёнки у мостков, сети, бочки ----------
  for (const [x, z, ry] of [[3.5, 21, 0.2], [-15, -2.5, 1.4], [21, -2, 1.7], [-2, -14, 0.5]]) {
    const g = new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12, 1, true, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI);
    P.add(MAT.log, g, M4(x, WATER_Y + 0.12, z, 0, ry, 0, 1, 1, 1));
    beam(P, MAT.wood, V(x, WATER_Y + 0.2, z), V(x + Math.sin(ry + 0.3) * 1.6, WATER_Y + 0.1, z + Math.cos(ry + 0.3) * 1.6), 0.03, 4);
  }
  for (const [x, z] of [[-29, 9.5], [-36, 9], [27, 1.5], [-10, 21]]) { const y = Math.max(groundAt(x, z), WALK_Y); for (let k = 0; k < 3; k++) { const px = x + rr(-0.6, 0.6), pz = z + rr(-0.6, 0.6); P.add(MAT.wood, new THREE.CylinderGeometry(0.32, 0.28, 0.75, 10), M4(px, y + 0.37, pz)); P.add(MAT.iron, new THREE.TorusGeometry(0.31, 0.02, 4, 12), M4(px, y + 0.55, pz, Math.PI / 2)); } }

  // ---------- лес вокруг ----------
  const forest = new THREE.Group();
  const trees = [];
  const pathX = (z) => 2 + Math.sin(z * 0.05) * 2.5;
  const nearPath = (x, z) => z > 38 && Math.abs(x - pathX(z)) < 6.5;
  const inBasin = (x, z, k = 1.08) => { const ex = (x - BASIN.x) / BASIN.rx, ez = (z - BASIN.z) / BASIN.rz; return ex * ex + ez * ez < k; };
  const nearWalk = (x, z, d) => walks.some((w) => !w.ramp && segDist(x, z, w) < d);
  const mk = (geo, mat, mats, shadow = true, ink = true) => {
    const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = shadow; im.receiveShadow = true; forest.add(im);
    if (ink) { const o = new THREE.InstancedMesh(geo, inkMat, mats.length); o.instanceMatrix = im.instanceMatrix; forest.add(o); }
    return im;
  };
  {
    // ель: ярусы обвислых лап с рваным краем, сверху тонкая макушка
    const tiers = [];
    for (let k = 0; k < 11; k++) {
      const r = 1.0 - k * 0.085, c = new THREE.ConeGeometry(r, 0.3, 11, 2, true); const p = c.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { const j = 0.65 + 0.55 * Math.abs(Math.sin(i * 1.7 + k * 2.3)); p.setX(i, p.getX(i) * j); p.setZ(i, p.getZ(i) * j); p.setY(i, p.getY(i) - 0.12 * j - 0.05 * Math.abs(Math.sin(i * 2.3))); }
      c.translate(0, 0.22 + k * 0.082, 0); c.computeVertexNormals(); tiers.push(c.toNonIndexed());
    }
    const P2 = new Pack(); for (const c of tiers) P2.add(MAT.bark, c);
    P2.add(MAT.bark, new THREE.ConeGeometry(0.06, 0.18, 5), M4(0, 1.18, 0));
    const needleGeo = mergeAll(P2);
    const trunkGeo = cylUV(new THREE.CylinderGeometry(0.035, 0.09, 1.12, 7), 1.1, 0.06); trunkGeo.translate(0, 0.5, 0);
    const needleMat = paint({ base: '#2a4632', moss: '#3f5c2c', mossAmt: 0.25, stroke: [0, -1, 0], strokeAmt: 0.36, break: 0.4, rim: 0.7 });
    const needleMatS = paint({ base: '#3a5c3a', stroke: [0, -1, 0], strokeAmt: 0.3, break: 0.36, rim: 0.9 });
    const list = [], listS = [];
    let tries = 0;
    while (list.length + listS.length < 1500 && tries++ < 40000) {
      const a = rr(0, 6.28), r = Math.sqrt(rr(0, 1)) * 175 + 12;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 6;
      if (inBasin(x, z) || nearPath(x, z)) continue;
      const edge = Math.hypot((x - BASIN.x) / BASIN.rx, (z - BASIN.z) / BASIN.rz);
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.4)) continue;
      if (kept(x, z, 13)) continue;
      const south = z > 52;
      if (south && rnd() < 0.45) continue;
      const h = rr(10, 24) * (edge < 1.5 ? 1.2 : 1), w = h * rr(0.15, 0.22);
      (south ? listS : list).push({ x, z, h, w, y: groundAt(x, z) - 0.2, ry: rr(0, 6.28), edge });
      solids.push({ x, z, r: 0.5 });
    }
    const Mx = (t) => M4(t.x, t.y, t.z, rr(-0.03, 0.03), t.ry, rr(-0.03, 0.03), t.w, t.h, t.w);
    const lm = list.map(Mx), lsm = listS.map(Mx);
    mk(needleGeo, needleMat, lm); mk(trunkGeo, MAT.bark, list.map((t) => M4(t.x, t.y, t.z, 0, t.ry, 0, t.w * 1.2, t.h, t.w * 1.2)), true, false);
    mk(needleGeo, needleMatS, lsm); mk(trunkGeo, MAT.bark, listS.map((t) => M4(t.x, t.y, t.z, 0, t.ry, 0, t.w * 1.2, t.h, t.w * 1.2)), true, false);
    trees.push(...list, ...listS);
    // бороды мха на ближних елях
    const beard = new Pack(); mossStrand(beard, 0, 0, 0, 1, 0.35, 0); mossStrand(beard, 0.1, -0.1, 0.05, 0.8, 0.3, 1.2);
    const beardGeo = mergeAll(beard), bm = [];
    for (const t of list) if (t.edge < 1.6) for (let k = 0; k < 4; k++) { const a = rr(0, 6.28), hh = rr(0.25, 0.8), rr0 = t.w * (1 - hh) * 0.75; bm.push(M4(t.x + Math.cos(a) * rr0, t.y + t.h * hh, t.z + Math.sin(a) * rr0, 0, a, 0, rr(1, 2), rr(1.2, 2.6), 1)); }
    mk(beardGeo, MAT.moss, bm, false, false);
    // лиственные кроны в обычном лесу на юге
    const crown = new THREE.IcosahedronGeometry(1, 1); { const p = crown.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.35 * Math.abs(Math.sin(i * 3.1)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } crown.computeVertexNormals(); }
    const leafMat = paint({ base: '#58803e', stroke: [0, -1, 0.3], strokeAmt: 0.3, break: 0.4, rim: 1.0 });
    const dec = [];
    for (let k = 0; k < 260; k++) {
      const x = rr(-90, 90), z = rr(54, 170); if (nearPath(x, z)) continue;
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < 2.5)) continue;
      if (kept(x, z, 8)) continue;
      dec.push({ x, z, y: groundAt(x, z), s: rr(2.6, 4.4) }); solids.push({ x, z, r: 0.4 });
    }
    const cms = []; for (const d of dec) for (let j = 0; j < 3; j++) cms.push(M4(d.x + rr(-1, 1) * d.s * 0.4, d.y + d.s * (1.9 + j * 0.45), d.z + rr(-1, 1) * d.s * 0.4, rr(0, 3), rr(0, 3), 0, d.s * rr(0.7, 1.0), d.s * rr(0.6, 0.9), d.s * rr(0.7, 1.0)));
    mk(crown, leafMat, cms);
    mk(trunkGeo, MAT.bark, dec.map((d) => M4(d.x, d.y, d.z, 0, 0, 0, d.s * 0.12, d.s * 2.1, d.s * 0.12)), true, false);
    // сухостой: ствол с обломанной макушкой, короткие сучья, у болота и в воде
    const PD = new Pack();
    tube(PD, MAT.bark, [V(0, 0, 0), V(0.02, 0.35, 0.01), V(0.05, 0.7, 0.03), V(0.07, 0.96, 0.02)], 0.03, 6, 6);
    PD.add(MAT.bark, new THREE.ConeGeometry(0.03, 0.08, 5), M4(0.08, 1.0, 0.02, 0.3, 0, 0.4));
    for (let k = 0; k < 9; k++) { const y = rr(0.3, 0.92), a = rr(0, 6.28), l = rr(0.06, 0.22) * (1.1 - y); beam(PD, MAT.bark, V(0.03 * y, y, 0), V(Math.cos(a) * l, y + rr(-0.04, 0.08), Math.sin(a) * l), 0.008, 4); }
    const deadGeo = mergeAll(PD);
    const dead = [];
    for (let k = 0; k < 260 && dead.length < 170; k++) {
      const a = rr(0, 6.28), r = rr(0.55, 1.7), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r;
      if (nearPath(x, z) || Math.hypot(x - T.x, z - T.z) < 19) continue;
      if (nearWalk(x, z, 3.2) || kept(x, z, 7)) continue;
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1.6)) continue;
      const h = rr(7, 19);
      dead.push(M4(x, groundAt(x, z) - 0.4, z, rr(-0.08, 0.08), rr(0, 6.28), rr(-0.08, 0.08), h, h, h));
      solids.push({ x, z, r: 0.4 });
      if (rnd() < 0.35) perches.push({ x: x + 0.07 * h, y: groundAt(x, z) - 0.4 + h * 1.0, z, ry: rr(0, 6) });
      if (rnd() < 0.5) mossStrand(P, x + 0.03 * h * 0.6, groundAt(x, z) + h * rr(0.4, 0.8), z + 0.1, rr(1, 3), 0.4, rr(0, 6));
    }
    mk(deadGeo, MAT.bark, dead);
    // корявые ивы по берегу: толстый наклонный ствол, корни в воде, ветви, лианы
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.28 + rr(-0.15, 0.15), e = rr(0.92, 1.12), x = BASIN.x + Math.cos(a) * BASIN.rx * e, z = BASIN.z + Math.sin(a) * BASIN.rz * e;
      if (nearPath(x, z) || kept(x, z, 9) || nearWalk(x, z, 4) || solids.some((s) => s.r > 1 && Math.hypot(s.x - x, s.z - z) < s.r + 4)) continue;
      const y = groundAt(x, z), h = rr(8, 13), lean = V(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(rr(1.5, 3.5));
      const pts = [V(x, y - 0.5, z), V(x + lean.x * 0.2, y + h * 0.35, z + lean.z * 0.2), V(x + lean.x * 0.6, y + h * 0.7, z + lean.z * 0.6), V(x + lean.x, y + h, z + lean.z)];
      tube(P, MAT.bark, pts, rr(0.6, 0.9), 9, 10);
      for (let j = 0; j < 6; j++) { const ra = rr(0, 6.28), rl = rr(1.5, 3); tube(P, MAT.bark, [V(x, y + 1.2, z), V(x + Math.cos(ra) * rl * 0.6, y + 0.8, z + Math.sin(ra) * rl * 0.6), V(x + Math.cos(ra) * rl, y - 0.5, z + Math.sin(ra) * rl)], rr(0.15, 0.3), 6, 6); }
      for (let j = 0; j < 5; j++) {
        const s = pts[2].clone().lerp(pts[3], rr(0, 1)), dd = V(rr(-1, 1), rr(0.2, 0.8), rr(-1, 1)).normalize().multiplyScalar(rr(3, 6));
        const tip = s.clone().add(dd); tube(P, MAT.bark, [s, s.clone().lerp(tip, 0.5).add(V(0, 0.6, 0)), tip], rr(0.15, 0.3), 6, 6);
        for (let q = 0; q < 3; q++) P.add(MAT.leaf, new THREE.IcosahedronGeometry(1, 0), M4(tip.x + rr(-1, 1), tip.y + rr(-0.5, 0.5), tip.z + rr(-1, 1), rr(0, 3), rr(0, 3), 0, rr(1.2, 2), rr(0.8, 1.2), rr(1.2, 2)));
        for (let q = 0; q < 5; q++) { const vp = s.clone().lerp(tip, rr(0.3, 1)); vine(P, vp, rr(2, 7), rr(0, 6), 0.2); }
        perches.push({ x: tip.x, y: tip.y + 0.2, z: tip.z, ry: rr(0, 6) });
      }
      solids.push({ x, z, r: 1.0 });
    }
  }
  scene.add(forest);

  // ---------- подлесок и берег: камыш с рогозом, папоротник, кусты, камни, коряги, пни, кувшинки, грибы ----------
  {
    // камыш
    const blade = new THREE.PlaneGeometry(0.05, 1, 1, 3); blade.translate(0, 0.5, 0);
    { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8) + y * y * 0.12); } }
    const reedMat = paint({ base: '#5d6e34', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.5, rim: 1.2 });
    const reeds = [], heads = [];
    const placeReed = (x, z, s = 1) => {
      const y = groundAt(x, z); if (y < WATER_Y - 0.45 || y > 0.45) return;
      if (walks.some((w) => !w.ramp && segDist(x, z, w) < w.w * 0.6)) return;
      const h = rr(0.6, 1.8) * s; reeds.push(M4(x, y, z, rr(-0.15, 0.15), rr(0, 6.28), rr(-0.15, 0.15), 1, h, 1));
      if (rnd() < 0.12) heads.push(M4(x, y + h * 1.05, z, 0, 0, 0, 1, 1, 1));
    };
    for (let k = 0; k < 5200; k++) { const a = rr(0, 6.28), r = Math.sqrt(rr(0.02, 1.2)), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; placeReed(x, z); }
    for (const [x, z] of plantSpots) for (let k = 0; k < 5; k++) placeReed(x + rr(-0.6, 0.6), z + rr(-0.6, 0.6), 1.1);
    const rm = new THREE.InstancedMesh(blade, reedMat, reeds.length); reeds.forEach((m, i) => rm.setMatrixAt(i, m)); rm.receiveShadow = true; scene.add(rm);
    const headGeo = cylUV(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), 0.22, 0.035);
    mk(headGeo, paint({ base: '#4a3020', strokeAmt: 0.1, rim: 0.6 }), heads, false, false);
    // папоротник: 7 изогнутых листьев
    const PF = new Pack();
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * 6.28, pos = [], idx = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6, r = t * 0.75, y = Math.sin(t * 2.4) * 0.45, ww = 0.11 * Math.sin(t * Math.PI) + 0.01; pos.push(r, y, -ww, r, y, ww); }
      for (let i = 0; i < 6; i++) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      PF.add(MAT.leaf, g, M4(0, 0, 0, 0, a, 0));
    }
    const fernGeo = mergeAll(PF), ferns = [];
    const fernAt = (x, z, s) => { const y = groundAt(x, z); if (y < WATER_Y + 0.02) return; ferns.push(M4(x, y, z, 0, rr(0, 6.28), 0, s, s * rr(0.8, 1.2), s)); };
    for (let k = 0; k < 2600; k++) { const a = rr(0, 6.28), r = rr(0.85, 2.2), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (!nearPath(x, z) && !kept(x, z, 3)) fernAt(x, z, rr(0.7, 1.6)); }
    for (const [ix, iz, ir] of ISLANDS) for (let k = 0; k < ir * 6; k++) { const a = rr(0, 6.28), r = rr(0.4, 1.0) * ir; fernAt(ix + Math.cos(a) * r, iz + Math.sin(a) * r, rr(0.6, 1.3)); }
    for (const [x, z] of plantSpots) if (rnd() < 0.5) fernAt(x + rr(-0.5, 0.5), z + rr(-0.5, 0.5), rr(0.7, 1.2));
    mk(fernGeo, MAT.leaf, ferns, false, false);
    // кусты
    const bush = new THREE.IcosahedronGeometry(1, 1); { const p = bush.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.7 + 0.5 * Math.abs(Math.sin(i * 4.1)); p.setXYZ(i, p.getX(i) * k, Math.max(p.getY(i), -0.2) * k * 0.75, p.getZ(i) * k); } bush.computeVertexNormals(); }
    const bushes = [];
    for (let k = 0; k < 700; k++) { const a = rr(0, 6.28), r = rr(0.95, 2.4), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearPath(x, z) || kept(x, z, 5)) continue; const y = groundAt(x, z); if (y < 0) continue; const s = rr(0.6, 1.5); bushes.push(M4(x, y, z, 0, rr(0, 6), 0, s * rr(1, 1.6), s, s * rr(1, 1.6))); }
    mk(bush, paint({ base: '#36502c', moss: '#4e6e2c', mossAmt: 0.25, stroke: [0, -1, 0.3], strokeAmt: 0.35, break: 0.42, rim: 0.9 }), bushes);
    // камни
    const rock = new THREE.DodecahedronGeometry(1, 1); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.3 * Math.sin(i * 5.3); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); } rock.computeVertexNormals(); }
    const rocks = [];
    for (let k = 0; k < 260; k++) { const a = rr(0, 6.28), r = rr(0.6, 2.0), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearPath(x, z) || nearWalk(x, z, 1.5) || kept(x, z, 4)) continue; const s = rr(0.3, 1.4); rocks.push(M4(x, groundAt(x, z) - s * 0.2, z, rr(0, 1), rr(0, 6), rr(0, 1), s, s, s)); }
    mk(rock, MAT.stone, rocks);
    // коряги и упавшие стволы с мхом и грибами
    for (let k = 0; k < 34; k++) {
      const a = rr(0, 6.28), r = rr(0.35, 1.5), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r;
      if (nearWalk(x, z, 3) || kept(x, z, 8) || nearPath(x, z) || Math.hypot(x - T.x, z - T.z) < 18) continue;
      const ra = rr(0, 6.28), l = rr(3, 8), y = Math.max(groundAt(x, z), WATER_Y - 0.1);
      const A = V(x - Math.cos(ra) * l / 2, y + 0.1, z - Math.sin(ra) * l / 2), B = V(x + Math.cos(ra) * l / 2, y + rr(0.2, 0.9), z + Math.sin(ra) * l / 2);
      const rad = rr(0.25, 0.5);
      tube(P, MAT.bark, [A, A.clone().lerp(B, 0.5).add(V(0, 0.15, 0)), B], rad, 7, 6);
      for (let j = 0; j < 3; j++) { const s = A.clone().lerp(B, rr(0.1, 0.9)); beam(P, MAT.bark, s, s.clone().add(V(rr(-1, 1), rr(0.3, 1.2), rr(-1, 1))), rad * 0.3, 5); }
      for (let j = 0; j < 3; j++) { const s = A.clone().lerp(B, rr(0, 1)); mossStrand(P, s.x, s.y - rad * 0.6, s.z, rr(0.3, 0.9), 0.3, ra); }
      if (rnd() < 0.75) { const s = A.clone().lerp(B, rr(0.2, 0.8)); const blue = rnd() < 0.6; shrooms(P, PG, s.x, s.y + rad * 0.9, s.z, 7, 1.3, blue ? MAT.shroom : MAT.shroomG); if (rnd() < 0.6) addLight(V(s.x, s.y + 1.0, s.z), blue ? BLUE : GREEN, 5, 0.1); }
      perches.push({ x: B.x, y: B.y + rad, z: B.z, ry: ra });
    }
    // пни
    for (let k = 0; k < 40; k++) { const a = rr(0, 6.28), r = rr(0.8, 1.8), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearWalk(x, z, 2) || nearPath(x, z) || kept(x, z, 4)) continue; const y = groundAt(x, z), rad = rr(0.3, 0.7), h = rr(0.3, 1.2); P.add(MAT.bark, cylUV(new THREE.CylinderGeometry(rad * 0.85, rad * 1.2, h, 9), h, rad), M4(x, y + h / 2 - 0.1, z)); if (rnd() < 0.4) shrooms(P, PG, x, y + h - 0.05, z, 5, 0.9, MAT.shroom); }
    // грибы под сваями и у кромки воды
    for (let k = 0; k < 60; k++) { const sp = plantSpots[Math.floor(rnd() * plantSpots.length)]; if (!sp) break; const y = groundAt(sp[0], sp[1]); if (y < WATER_Y) continue; shrooms(P, PG, sp[0], y, sp[1], 4, 0.9, rnd() < 0.7 ? MAT.shroom : MAT.shroomG); if (k % 4 === 0) addLight(V(sp[0], y + 0.8, sp[1]), BLUE, 4.5, 0.1); }
    // кувшинки с цветами
    const pad = new THREE.CircleGeometry(0.32, 9, 0.3, 5.9); pad.rotateX(-Math.PI / 2);
    const padMat = paint({ base: '#4f6a2a', strokeAmt: 0.2, rim: 0.4, wet: 0.8 });
    const pads = [], flowers = [];
    for (let k = 0; k < 1400; k++) {
      const x = BASIN.x + rr(-1, 1) * BASIN.rx, z = BASIN.z + rr(-1, 1) * BASIN.rz;
      if (groundAt(x, z) > WATER_Y - 0.06 || !inBasin(x, z, 1.0)) continue;
      const s = rr(0.6, 1.7); pads.push(M4(x, WATER_Y + 0.025, z, 0, rr(0, 6.28), 0, s, 1, s)); lilyPads.push([x, z]);
      if (rnd() < 0.07) flowers.push(M4(x + 0.05, WATER_Y + 0.08, z, 0, rr(0, 6), 0, s * 0.6, s * 0.6, s * 0.6));
    }
    mk(pad, padMat, pads, false, false);
    const fl = new THREE.ConeGeometry(0.12, 0.12, 7, 1, true); fl.rotateX(Math.PI);
    mk(fl, glow('#f0e0ff', { k: 1.2 }), flowers, false, false);
  }

  // ---------- пузыри (полусферы надуваются и лопаются в очагах и по болоту) ----------
  {
    const g = new THREE.SphereGeometry(1, 10, 5, 0, 6.29, 0, Math.PI / 2);
    const mats = [], ph = [];
    for (let k = 0; k < 520; k++) {
      let x, z;
      if (k < 380) { const b = boils[k % boils.length], a = rr(0, 6.28), r = Math.sqrt(rnd()) * b[2]; x = b[0] + Math.cos(a) * r; z = b[1] + Math.sin(a) * r; }
      else { x = BASIN.x + rr(-1, 1) * BASIN.rx * 0.9; z = BASIN.z + rr(-1, 1) * BASIN.rz * 0.9; }
      if (groundAt(x, z) > WATER_Y - 0.08) continue;
      const s = rr(0.04, 0.16); mats.push(M4(x, WATER_Y + 0.0, z, 0, 0, 0, s, s * 0.8, s)); ph.push(rnd(), rr(0.25, 0.9));
    }
    const im = new THREE.InstancedMesh(g, bubbleMat(), mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.geometry = g.clone(); im.geometry.setAttribute('aPh', new THREE.InstancedBufferAttribute(new Float32Array(ph), 2));
    im.frustumCulled = false; scene.add(im);
    // в очагах снизу светит (голубое и зелёное)
    boils.forEach((b, i) => addLight(V(b[0], WATER_Y + 0.4, b[1]), i % 2 ? BLUE : [0.35, 1.0, 0.55], b[2] * 1.4, 0.25));
  }

  // ---------- туман, дым, зелёный столб света ----------
  const mists = [];
  {
    const card = new THREE.PlaneGeometry(1, 1);
    for (let k = 0; k < 46; k++) {
      const a = rr(0, 6.28), r = rr(5, 48), x = BASIN.x + Math.cos(a) * r, z = BASIN.z + Math.sin(a) * r * 0.85;
      if (kept(x, z, 6)) continue;
      const m = new THREE.Mesh(card, mist(k % 3 ? '#2a5238' : '#3f7a4c', { a: rr(0.12, 0.24), seed: k, themeOnly: true }));
      m.position.set(x, rr(0.3, 2.0), z); m.scale.set(rr(10, 24), rr(1.6, 4), 1);
      m.renderOrder = 2; scene.add(m); mists.push(m);
    }
    for (const s of anim.smoke) {
      const m = new THREE.Mesh(card, mist('#5f8a4c', { a: 0.16, seed: s.x * 3.1 + s.y, themeOnly: false }));
      m.position.set(s.x, s.y, s.z); m.scale.set(s.s, s.s * 0.8, 1); m.renderOrder = 2; scene.add(m); mists.push(m); m.userData.rise = s.y;
    }
    const bg = new THREE.CylinderGeometry(2.2, 6.5, 80, 18, 1, true); bg.translate(0, 40, 0);
    const bm = new THREE.Mesh(bg, beamMat('#6fe8a0', { a: 0.035 })); bm.position.set(T.x + 4, base + 6, T.z - 8); bm.rotation.z = -0.1; bm.renderOrder = 3;
    scene.add(bm); anim.beam = bm;
  }

  // ---------- сборка ----------
  scene.add(P.build(true, true));
  scene.add(PG.build(false, false));
  return { solids, lights, walks, anim, trees, mists, perches, lilyPads, TREE, FIRE, pathX, groundAt, base, rT, doorA, boils, houses: [hall, ...H] };
}

// пламя: языки-конусы колышутся и мерцают
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
export function segT(x, z, w) {
  const ax = w.a[0], az = w.a[1], dx = w.b[0] - ax, dz = w.b[1] - az, L2 = dx * dx + dz * dz;
  return Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1)));
}
export { segDist };
