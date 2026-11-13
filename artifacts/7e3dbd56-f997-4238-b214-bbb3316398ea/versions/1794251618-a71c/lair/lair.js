// Логово Лешего, версия 2: болотное царство посреди северного леса (по концептам Michael).
// Центр (0, 0). Богатырь приходит с юга (+z) по лесной тропе, у края болота тропа переходит в мостки.
// Дуб-терем (огромный, заросший, с лианами, наростами-избушками, галереями и винтовыми лестницами) — на севере;
// хоромы с колесом на фронтоне и костёр — на западе; девять изб на сваях вокруг; идолы с оленьими черепами у мостков.
// Вокруг — тёмный ельник, сухостой, корявые ивы с лианами; за ним обычный лес.
import * as THREE from 'three';
import { spruceGeo, pineGeo, birchGeo, needleTex, birchTex } from './trees.js';
import { bushGeo, mossGeo, fernGeo as vegFern, willowGeo, sprigGeo } from './veg.js';
const MOSS_LITE = mossGeo(7, true), WILLOW = [willowGeo(1), willowGeo(2)], SPRIG = sprigGeo(3);   // растения слоями (veg.js, R6)
import { paint, glow, water, mist, beam as beamMat, inkMat, bubbleMat, BOIL, U, puffMat, shaftMat, haloMat, webMat, flameMat, emberMat, dripMat, backdropMat } from './toon.js';
import {
  SHROOM_SPOTS,
  Pack, MAT, M4, V, beam, tube, box, plank, boardwalk, deck, mossStrand, vine, gableRoof, railing, stairs, skull, banner, chain,
  windowLit, lantern, shrooms, rope, lashing, rnd, rr, setSeed, mergeGeometries, boxUV, cylUV, canvasTex,
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
  [TREE.x, TREE.z, 19.5, 0.42], [-32, 2, 9.5, 0.36], [-20, 9, 4.8, 0.3],
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
  tree: { pos: [7, 3.6, 3], look: [-8, 14, -26] },
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
  SHROOM_SPOTS.length = 0;
  setSeed(11);
  const solids = [];   // круги {x, z, r, y0?, y1?}
  const lights = [];   // { pos, col, r, flick }
  const walks = [];    // отрезки {a, b, w, y} и пандусы {ya, yb}
  const plantSpots = [];
  const perches = [];  // места для ворон {x, y, z, ry}
  const lilyPads = []; let waterMesh = null;
  const lamps = [];   // фонари (для ореолов)
  const webs = [];    // паутина {o, u, v, r}
  const bases = [];   // основания (x, z, r): вокруг мох и трава, чтобы не было резкого входа в землю
  const leafM = [], leafM2 = [], leafM3 = [];
  const shafts = [];  // лучи из окон {p, d, w, h, len, col}
  const drips = [];  // капель с кровель {x, y, z}
  const halos = [];   // ореолы {p, col, s}   // листья дуба и плюща (инстансы)
  const anim = { flames: [], smoke: [] };
  const P = new Pack();      // постройки и детали (с контуром)
  const PG = new Pack();     // светящееся
  const ORANGE = [1.0, 0.52, 0.2], GREEN = [0.5, 0.95, 0.28], BLUE = [0.25, 0.7, 1.0];
  const addLight = (pos, col, r, flick = 0.3, pri = 0) => lights.push({ pos, col, r, flick, pri });

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
    const m = new THREE.Mesh(g, Object.assign(paint({ base: '#ffffff', vcol: true, moss: '#4d6a2a', mossAmt: 0.35, stroke: [1, 0, 0.3], strokeAmt: 0.22, break: 0.3, rim: 0 }), { name: 'ground' }));
    m.receiveShadow = true; m.userData.bake = 'ground'; scene.add(m);
    const wg = new THREE.PlaneGeometry(BASIN.rx * 2.3, BASIN.rz * 2.3, 230, 200); wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, water()); w.position.set(BASIN.x, WATER_Y, BASIN.z); w.receiveShadow = true; w.userData.bake = 'water'; scene.add(w); waterMesh = w;
    // карта глубины для воды: 1 px ≈ 0.5 м, в красном глубина / 3 м
    { const gw = BASIN.rx * 2.3, gh = BASIN.rz * 2.3, NX = 256, NZ = 212, d = new Uint8Array(NX * NZ * 4);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = BASIN.x - gw / 2 + (i + 0.5) / NX * gw, z = BASIN.z - gh / 2 + (j + 0.5) / NZ * gh; const v = Math.max(0, Math.min(1, (WATER_Y - groundAt(x, z)) / 3)); d[(j * NX + i) * 4] = v * 255; d[(j * NX + i) * 4 + 3] = 255; }
      const tx = new THREE.DataTexture(d, NX, NZ); tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
      U.uDepth.value = tx; U.uDepthBox.value.set(BASIN.x - gw / 2, BASIN.z - gh / 2, gw, gh); }
  }
  // очаги бурления: у корней дуба, в протоках
  const boils = [[TREE.x + 13, TREE.z + 9, 5, 0.9], [4, -6, 4, 0.8], [-22, -8, 4.5, 0.85], [20, 4, 3.5, 0.7], [-8, 16, 3, 0.6], [32, -14, 4, 0.75]];
  boils.forEach((b, i) => BOIL[i].set(...b));

  // ПРАВИЛО ОПОРЫ (R8): предмет с площадью опоры r ставим на самую низкую из 5 точек под ним (центр и 4 по краю) —
  // на склоне он врезается в склон верхним краем, а не висит нижним. Все такие постановки пишутся в propLog для проверки.
  const propLog = [];
  const footY = (x, z, r, name = '') => {
    const g = [groundAt(x, z), groundAt(x + r, z), groundAt(x - r, z), groundAt(x, z + r), groundAt(x, z - r)];
    const y = Math.min(...g); propLog.push({ name, x, z, r, y, top: Math.max(...g) }); return y;
  };
  // ---------- дома на сваях ----------
  // Сваи, настил, стены из брёвен с проёмами (дверь и окна вырезаны), внутри тёплый свет, дверь открыта,
  // крыша дранкой с красным узором выходит над крыльцом, крыльцо с перилами, лестница со ступенями до мостков.
  const PO = P, PGO = PG;
  function stiltHouse(cx, cz, face, o = {}) {
    const P = new Pack(), PG = new Pack();                 // свои пакеты: потом весь дом «покосим»
    const nF = anim.flames.length, nL = lights.length, nPe = perches.length, nWb = webs.length;
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
      bases.push([x, z, 0.3]);
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
    for (let k = 0; k < nPl; k++) { const lz = back + (k + 0.5) * (front - back) / nPl; const [x, z] = L(0, lz); plank(P, rnd() < 0.25 ? MAT.plankOld : MAT.plank, x, fy, z, pw, 0.28, rot, 0.08); }
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
      // дверь закрыта: полотно в проёме, две поперечные планки и кованые петли, ручка-кольцо
      const [dx0, dz0] = L(doorX, d / 2 + 0.02);
      P.add(MAT.door, boxUV(new THREE.BoxGeometry(dw - 0.04, dh - 0.06, 0.08), 1, 1, 1), M4(dx0, fy + dh / 2 + 0.04, dz0, 0, rot, 0));
      for (const hy of [0.35, dh - 0.4]) { const [bx, bz] = L(doorX, d / 2 + 0.07); box(P, MAT.woodDark, dw - 0.12, 0.1, 0.04, M4(bx, fy + hy, bz, 0, rot, 0)); const [ix, iz] = L(doorX - dw / 2 + 0.2, d / 2 + 0.09); box(P, MAT.iron, 0.34, 0.05, 0.02, M4(ix, fy + hy, iz, 0, rot, 0)); }
      { const [rx, rz] = L(doorX + dw / 2 - 0.2, d / 2 + 0.1); P.add(MAT.iron, new THREE.TorusGeometry(0.06, 0.012, 4, 10), M4(rx, fy + 1.0, rz, 0, rot, 0)); }
      if (o.doorSkull !== false) skull(P, ...L(doorX, d / 2 + 0.25).flatMap((v, i) => (i === 0 ? [v, fy + dh + 0.5] : [v])), 0.7, rot, !!o.antlers, true);
    }
    // окна в проёмах (бычий пузырь светится), ставни
    const nSh = shafts.length, nHa = halos.length, nDr = drips.length, WCOL = o.green ? [0.45, 1.0, 0.4] : [1.0, 0.55, 0.22];
    for (const [, x] of wins) { const [wx, wz] = L(x, d / 2 + 0.05); windowLit(P, PG, o.green ? MAT.winGreen : MAT.winOrange, wx, fy + 1.3, wz, rot, 0.62, 0.66); shafts.push({ p: V(wx, fy + 1.3, wz), d: V(s, -0.32, c), w: 0.6, h: 0.64, len: 3.2, col: WCOL, a: 0.22 }); }
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
    { const half = (w + 0.3) / 2 + 0.62; for (let k = 0; k < 7; k++) { const sd = k % 2 ? 1 : -1; drips.push(LV(sd * (half - 0.04), topY - 0.1, roofZ + rr(-roofD / 2 - 0.5, roofD / 2 + 0.5))); } }
    // столбы крыльца держат свес
    for (const sx of [-1, 1]) { const p = LV(sx * (w / 2 + 0.3), 0, front - 0.25); beam(P, MAT.woodDark, V(p.x, fy, p.z), V(p.x, topY + 0.15, p.z), 0.11, 6); lashing(P, p.x, fy + 1.2, p.z, 0.11); }
    // перила крыльца с проходом к лестнице
    const sw = o.stairW || 1.15;
    railing(P, LV(-pw / 2, 0, front), LV(-sw / 2 - 0.05, 0, front), fy, 0.95, 0);
    railing(P, LV(sw / 2 + 0.05, 0, front), LV(pw / 2, 0, front), fy, 0.95, 0);
    railing(P, LV(pw / 2, 0, front), LV(pw / 2, 0, d / 2 + 0.3), fy, 0.95, 0.3);
    railing(P, LV(-pw / 2, 0, d / 2 + 0.3), LV(-pw / 2, 0, front), fy, 0.95, 0.3);
    // лестница: от края крыльца вниз к мосткам/земле
    const rise0 = fy - WALK_Y;
    const nSt = Math.max(2, Math.round(rise0 / 0.22)), run = nSt * 0.3;
    const bot = LV(0, 0, front + run), botY = Math.max(WALK_Y, groundAt(bot.x, bot.z) + 0.03);
    const top = LV(0, fy, front - 0.02);
    walks.push(stairs(P, V(bot.x, botY, bot.z), V(top.x, fy, top.z), sw));
    // площадка крыльца и пол — ходить можно
    walks.push({ a: L(0, d / 2 + 0.1), b: L(0, front - 0.05), w: pw - 0.2, y: fy + 0.04 });
    // у двери фонарь, по сторонам факелы, по углам полотна, столб с черепом
    { const p = LV(doorX + dw / 2 + 0.45, 0, d / 2 + R + 0.25); halos.push({ p: lantern(P, PG, p.x, fy + 2.0, p.z, 1.0), col: [1.0, 0.55, 0.2], s: 0.55 }); beam(P, MAT.iron, V(p.x, fy + 2.4, p.z), LV(doorX + dw / 2 + 0.45, fy + 2.4, d / 2 + R).clone(), 0.015, 4); }
    { const p = LV(doorX, 0, d / 2 + 1.0); addLight(V(p.x, fy + 1.5, p.z), o.green ? GREEN : ORANGE, o.lightR || 7.5, 0.6); }
    for (const sx of [-1, 1]) {
      const p = LV(sx * (sw / 2 + 0.35), 0, front + 0.05);
      beam(P, MAT.woodDark, V(p.x, fy - 0.2, p.z), V(p.x, fy + 1.55, p.z), 0.05, 5);
      P.add(MAT.iron, new THREE.CylinderGeometry(0.09, 0.05, 0.16, 6), M4(p.x, fy + 1.6, p.z));
      anim.flames.push(makeFlame(scene, V(p.x, fy + 1.66, p.z), 0.38));
    }
    for (const sx of [-1, 1]) { const [bx, bz] = L(sx * (w / 2 + 0.42), d / 2 + 0.45); banner(P, bx, topY - 0.05, bz, 0.5, rr(1.4, 2.0), rot); beam(P, MAT.woodDark, LV(sx * (w / 2 + 0.1), topY - 0.02, d / 2), LV(sx * (w / 2 + 0.42), topY - 0.02, d / 2 + 0.45), 0.035, 4); beam(P, MAT.wood, LV(sx * (w / 2 + 0.12), topY - 0.04, d / 2 + 0.45), LV(sx * (w / 2 + 0.72), topY - 0.04, d / 2 + 0.45), 0.025, 4); }
    // мох и наросты на стыках: по нижнему венцу, у свай под настилом, у основания столбов крыльца, по углам сруба
    for (let k = 0; k < 14; k++) { const side = Math.floor(rnd() * 4), t = rr(-0.5, 0.5); const p = side === 0 ? LV(t * w, 0, d / 2 + R + 0.02) : side === 1 ? LV(t * w, 0, -d / 2 - R - 0.02) : LV((side === 2 ? -1 : 1) * (w / 2 + R + 0.02), 0, t * d); if (side === 0 && Math.abs(t * w - doorX) < dw / 2 + 0.2) continue; mossStrand(P, p.x, fy + 0.3, p.z, rr(0.3, 0.8), rr(0.3, 0.5), rot + (side >= 2 ? Math.PI / 2 : 0)); P.add(MAT.moss, MOSS_LITE, M4(p.x, fy + 0.04, p.z, 0, rot, 0, rr(0.25, 0.5), rr(0.1, 0.2), rr(0.15, 0.3))); }
    for (const lx of cols) for (const lz of rows) if (rnd() < 0.45) { const [x, z] = L(lx, lz); mossStrand(P, x, fy - 0.2, z, rr(0.4, 1.1), 0.3, rr(0, 6)); }
    for (const sx of [-1, 1]) { const p = LV(sx * (w / 2 + 0.3), 0, front - 0.25); P.add(MAT.moss, MOSS_LITE, M4(p.x, fy + 0.04, p.z, 0, 0, 0, 0.22, 0.12, 0.22)); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = LV(sx * (w / 2 + 0.15), 0, sz * (d / 2 + 0.15)); mossStrand(P, p.x, topY + 0.05, p.z, rr(0.4, 1.0), 0.35, rot + sx); }
    if (o.skullPost !== false) { const p = LV(pw / 2 + 0.25, 0, front + 0.3); beam(P, MAT.woodDark, V(p.x, groundAt(p.x, p.z) - 0.4, p.z), V(p.x, fy + 2.4, p.z), 0.08, 6); skull(P, p.x, fy + 2.6, p.z, 0.55, rot, false); perches.push({ x: p.x, y: fy + 2.85, z: p.z, ry: rot }); }
    // ворона на коньке
    perches.push({ ...(() => { const p = LV(0, topY + roofH + 0.15, -d / 2 + 0.3); return { x: p.x, y: p.y, z: p.z }; })(), ry: rot + Math.PI / 2 });
    // дым из дымника (зеленоватый)
    if (o.smoke) for (let k = 0; k < 4; k++) anim.smoke.push({ x: rcx + k * 0.7 + rr(-0.4, 0.4), y: topY + roofH + 0.8 + k * 1.6, z: rcz + k * 0.4, s: 2.0 + k * 1.1 });
    solids.push({ x: cx, z: cz, r: Math.min(w, d) * 0.55, y0: fy - 0.5, y1: fy + 3 });
    for (const lx of [-pw / 2 + 0.15, pw / 2 - 0.15]) for (const lz of [back + 0.1, front - 0.15]) { const [x, z] = L(lx, lz); solids.push({ x, z, r: 0.25, y1: fy - 0.3 }); }
    // жилое и заброшенное: поленница у стены, бочка и корзины на крыльце, пучки трав под свесом,
    // сеть на стене, деревце и папоротник на крыше, паутина в углах крыльца
    { const sd = rnd() < 0.5 ? -1 : 1; const p0 = LV(sd * (w / 2 + 0.45), 0, -d / 2 + 0.4);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) { const a = LV(sd * (w / 2 + 0.45), 0, -d / 2 + 0.3 + k * 0.32 + r * 0.16), b = LV(sd * (w / 2 + 1.0), 0, -d / 2 + 0.3 + k * 0.32 + r * 0.16); beam(P, MAT.log, V(a.x, fy + 0.13 + r * 0.24, a.z), V(b.x, fy + 0.13 + r * 0.24, b.z), 0.12, 6); } }
    { const p = LV(-pw / 2 + 0.5, 0, front - 0.5); P.add(MAT.wood, cylUV(new THREE.CylinderGeometry(0.3, 0.26, 0.7, 10), 0.7, 0.3), M4(p.x, fy + 0.35, p.z)); P.add(MAT.iron, new THREE.TorusGeometry(0.3, 0.02, 4, 12), M4(p.x, fy + 0.5, p.z, Math.PI / 2)); }
    { const p = LV(pw / 2 - 0.5, 0, d / 2 + 0.6); P.add(MAT.rope, new THREE.CylinderGeometry(0.22, 0.16, 0.32, 9, 1, true), M4(p.x, fy + 0.16, p.z)); }
    // жердь между столбами крыльца, на ней пучки трав
    beam(P, MAT.wood, LV(-(w / 2 + 0.3), topY - 0.05, front - 0.25), LV(w / 2 + 0.3, topY - 0.05, front - 0.25), 0.045, 5);
    for (let k = 0; k < 4; k++) { const p = LV(-w / 2 + 0.4 + k * (w - 0.8) / 3, 0, front - 0.25); rope(P, V(p.x, topY - 0.05, p.z), V(p.x, topY - 0.4, p.z), 0, 0.012); P.add(MAT.leaf, new THREE.ConeGeometry(0.1, 0.38, 5), M4(p.x, topY - 0.6, p.z, Math.PI, 0, 0)); }
    if (rnd() < 0.7) { const sd = rnd() < 0.5 ? -1 : 1; const p = LV(sd * (w / 2 + 0.2), 0, rr(-d / 4, d / 4)); for (let i = 0; i < 6; i++) beam(P, MAT.rope, V(p.x, fy + 0.6 + i * 0.25, p.z), LV(sd * (w / 2 + 0.2), fy + 0.6 + i * 0.25, rr(-d / 4, d / 4) + 0.8), 0.006, 3); }
    { // на крыше: моховые кочки, папоротник, тонкая берёзка
      const rp = (t, side, lz) => LV(side * (w / 2 + 0.77) * (1 - t), topY + roofH * t + 0.1, roofZ + lz);
      for (let k = 0; k < 5; k++) { const q = rp(rr(0.1, 0.8), rnd() < 0.5 ? -1 : 1, rr(-roofD / 2, roofD / 2)); P.add(MAT.moss, new THREE.SphereGeometry(1, 8, 5, 0, 6.29, 0, 1.4), M4(q.x, q.y - 0.05, q.z, 0, rr(0, 6), 0, rr(0.3, 0.7), rr(0.12, 0.25), rr(0.3, 0.7))); }
      if (rnd() < 0.6) { const q = rp(rr(0.3, 0.6), rnd() < 0.5 ? -1 : 1, rr(-roofD / 3, roofD / 3)); beam(P, MAT.stalk, q, V(q.x + rr(-0.2, 0.2), q.y + rr(1.0, 1.8), q.z + rr(-0.2, 0.2)), 0.03, 4); for (let j = 0; j < 4; j++) P.add(MAT.leaf, SPRIG, M4(q.x + rr(-0.3, 0.3), q.y + rr(0.9, 1.8), q.z + rr(-0.3, 0.3), 0, j * 1.7, 0)); }
    }
    for (const sx of [-1, 1]) { const A = LV(sx * (w / 2 + 0.3), topY - 0.1, front - 0.25); webs.push({ o: A, u: V(-sx * c, 0, sx * s), v: V(0, -1, 0), r: rr(0.5, 0.8) }); }
    { const A = LV(-pw / 2 + 0.15, fy - 0.15, back + 0.1); webs.push({ o: A, u: V(c, 0, -s), v: V(0, -1, 0), r: 0.6 }); }
    // покосить: наклон, лёгкое кручение, просевший конёк — дом «живой», как заброшки в деревне
    const leanX = rr(-0.035, 0.035), leanZ = rr(-0.025, 0.02), sag = rr(0.15, 0.4), twist = rr(-0.012, 0.012), sd0 = rr(0, 6);
    const def = (x, y, z) => {
      const dx = x - cx, dz = z - cz; let lx = dx * c - dz * s, lz = dx * s + dz * c; const h = Math.max(0, y - fy + 0.3);
      lx += leanX * h + twist * lz * h + 0.025 * Math.sin(h * 1.7 + sd0) * h / 3; lz += leanZ * h;
      const rt = Math.max(0, y - topY) / roofH, q = (2 * (lz - roofZ) / roofD);
      y -= sag * Math.min(1, rt * 1.5) * Math.max(0, 1 - q * q);
      return [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    };
    for (const [pk, outP] of [[P, PO], [PG, PGO]]) for (const [m, list] of pk.parts) {
      for (const g of list) { const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) { const r = def(pa.getX(i), pa.getY(i), pa.getZ(i)); pa.setXYZ(i, r[0], r[1], r[2]); } g.computeVertexNormals(); }
      if (!outP.parts.has(m)) outP.parts.set(m, []); outP.parts.get(m).push(...list);
    }
    for (let i = nF; i < anim.flames.length; i++) { const f = anim.flames[i].position; const r = def(f.x, f.y, f.z); f.set(...r); }
    for (let i = nL; i < lights.length; i++) { const f = lights[i].pos; f.set(...def(f.x, f.y, f.z)); }
    for (let i = nPe; i < perches.length; i++) { const f = perches[i]; [f.x, f.y, f.z] = def(f.x, f.y, f.z); }
    for (let i = nWb; i < webs.length; i++) webs[i].o.set(...def(webs[i].o.x, webs[i].o.y, webs[i].o.z));
    for (let i = nSh; i < shafts.length; i++) shafts[i].p.set(...def(shafts[i].p.x, shafts[i].p.y, shafts[i].p.z));
    for (let i = nHa; i < halos.length; i++) halos[i].p.set(...def(halos[i].p.x, halos[i].p.y, halos[i].p.z));
    for (let i = nDr; i < drips.length; i++) drips[i].set(...def(drips[i].x, drips[i].y, drips[i].z));
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
  // все линии мостков; узлы, где сходятся две и больше линий, — перекрёстки с общим настилом (без «паутины» верёвок)
  const LINES = [
    [[J.E0, J.E1, J.J1, J.J2, J.J3], { rails: 0.75 }],
    [[J.J1, [-8, 15], H[6].stairBot]],
    [[J.J1, [-8, 12], J.F]],
    [[J.J2, [-14, 1], hall.stairBot], { rails: 0.8 }],
    [[J.J1, [10, 12], H[4].stairBot]],
    [[J.J2, J.A, H[0].stairBot]],
    [[J.A, J.B, H[1].stairBot]],
    [[J.B, [30, -14], H[5].stairBot]],
    [[J.J3, J.C, [-24, -16], H[2].stairBot]],
    [[J.C, [-24, -34], H[8].stairBot]],
    [[J.F, [-30, 14], H[3].stairBot]],
    [[J.A, [18, -20], [14, -30], H[7].stairBot]],
  ];
  const key = (p) => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  const use = new Map();
  for (const [pts] of LINES) for (const p of pts) use.set(key(p), (use.get(key(p)) || 0) + 1);
  const JUNC = []; for (const [pts] of LINES) for (const p of pts) if (use.get(key(p)) > 1 && !JUNC.some((q) => key(q) === key(p))) JUNC.push(p);
  for (const [pts, o] of LINES) W(pts, { ...(o || {}), skip: JUNC });
  for (const j of JUNC) {
    // настил по направлению первой линии через узел
    let rot = 0; for (const [pts] of LINES) { const i = pts.findIndex((p) => key(p) === key(j)); if (i >= 0) { const q = pts[i + 1] || pts[i - 1]; rot = Math.atan2(q[0] - j[0], q[1] - j[1]); break; } }
    deck(P, j[0], j[1], WALK_Y, 2.9, groundAt, rot);
    walks.push({ a: [j[0] - 0.01, j[1]], b: [j[0] + 0.01, j[1]], w: 3.0, y: WALK_Y });
  }

  // ---------- дуб-терем ----------
  const T = TREE, base = groundAt(T.x, T.z);
  const rT = (y) => 4.5 + 0.7 * (1 - y / 30) + 3.9 * Math.exp(-y / 3.0);   // радиус ствола на высоте y
  const doorA = Math.atan2(J.J3[1] - T.z, J.J3[0] - T.x);                  // дверь смотрит на мостки
  const stairA0 = doorA + 0.75;                                            // винтовая лестница начинается правее двери
  const angD0 = (a, b) => Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
  const rDoor = rT(4.2) * 0.93;   // ниша входа: у двери ствол срезан вертикально
  // настоящий радиус ствола (y — по геометрии ствола: от base - 0.6)
  function trunkR(a, y) {
    const ad = (b) => angD0(a, b);
    const keep = Math.min(ss(0.35, 0.8, ad(doorA)), ss(0.9, 1.4, ad(stairA0 + 0.8)));
    const butt = 1 + (Math.max(0, Math.sin(a * 7 + 0.4)) * 0.42 + Math.max(0, Math.sin(a * 13 + 2.1)) * 0.16) * Math.exp(-y / 4.5) * keep;
    const bulge = 1 + 0.08 * Math.sin(a * 5 + y * 0.35) + 0.05 * Math.sin(a * 11 - y * 0.6) + 0.06 * Math.sin(y * 0.5 + a * 2);
    let r = rT(y) * bulge * butt;
    const k = (1 - ss(0.22, 0.42, ad(doorA))) * (1 - ss(4.2, 5.6, y));
    if (k > 0) r = r * (1 - k) + Math.min(r, rDoor) * k;
    return r;
  }
  // наибольший радиус ствола над участком (угол a ± da, высота над base y0..y1)
  const trunkMax = (a, da, y0, y1) => { let m = 0; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) m = Math.max(m, trunkR(a - da + 2 * da * i / 4, y0 + 0.6 + (y1 - y0) * j / 4)); return m; };
  {
    // ствол: бугристый, с контрфорсами у земли
    const g = new THREE.CylinderGeometry(1, 1, 31, 72, 40, true); g.translate(0, 15.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const ad = (b) => Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      const keep = Math.min(THREE.MathUtils.smoothstep(ad(doorA), 0.35, 0.8), THREE.MathUtils.smoothstep(ad(stairA0 + 0.8), 0.9, 1.4));
      const r = trunkR(a, y);
      p.setX(i, Math.cos(a) * r); p.setZ(i, Math.sin(a) * r);
    }
    g.computeVertexNormals(); cylUV(g, 31, 5);
    P.add(MAT.bark, g, M4(T.x, base - 0.6, T.z));
    solids.push({ x: T.x, z: T.z, r: rT(0) + 0.6, y1: base + 2 });
    // корни-сваи: изогнутые ноги дугой уходят в болото (просвет у двери и у лестницы), от них отходят корни-ответвления;
    // корень не заходит на мостки: длину режем до ближайшего настила
    const lowWalks = walks.filter((w) => !w.ramp && w.y < 1);
    const freeR = (a, r0, r1) => { for (let r = r0; r < r1; r += 0.4) { const x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r; if (lowWalks.some((w) => segDist(x, z, w) < w.w / 2 + 1.3)) return r - 0.6; } return r1; };
    const angD = (a, b) => Math.abs(((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
    const rootEnds = bases;
    const rootArc = (a, y0, r1, rad, sway) => {
      const pts = [];
      for (let t = 0; t <= 1.001; t += 0.125) {
        const r = rT(y0) * 0.9 + (r1 - rT(y0) * 0.9) * t, y = base + y0 * (1 - t) * (1 - t) * 0.95 + 2.4 * Math.sin(t * Math.PI) * (1 - t * 0.45) - 0.8 * t;
        const aa = a + t * sway + 0.05 * Math.sin(t * 9 + a * 3);
        pts.push(V(T.x + Math.cos(aa) * r, y, T.z + Math.sin(aa) * r));
      }
      return pts;
    };
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2 + rr(-0.1, 0.1);
      if (angD(a, doorA) < 0.42 || angD(a, stairA0) < 0.3) continue;
      const y0 = rr(4, 10), r1 = Math.min(rr(14, 20), freeR(a, rT(0) + 1, 21));
      if (r1 < rT(0) + 3.5) continue;
      const sway = rr(-0.14, 0.14), pts = rootArc(a, y0, r1, 0, sway);
      const rad = rr(0.7, 1.15);
      tube(P, MAT.bark, pts, rad, 9, 18);
      const end = pts[pts.length - 1]; solids.push({ x: end.x, z: end.z, r: rad + 0.2 }); rootEnds.push([end.x, end.z, rad * 2.2]);
      // корешки в землю у конца
      for (let j = 0; j < 3; j++) { const ra = a + rr(-1.2, 1.2), l = rr(1.0, 2.2); tube(P, MAT.bark, [V(end.x, end.y + rad * 0.5, end.z), V(end.x + Math.cos(ra) * l * 0.6, end.y + 0.1, end.z + Math.sin(ra) * l * 0.6), V(end.x + Math.cos(ra) * l, groundAt(end.x + Math.cos(ra) * l, end.z + Math.sin(ra) * l) - 0.3, end.z + Math.sin(ra) * l)], rad * 0.35, 6, 5); }
      // ответвления: от середины дуги в сторону и вниз
      const nb = rnd() < 0.7 ? 2 : 1;
      for (let b = 0; b < nb; b++) {
        const t0 = rr(0.35, 0.6), q = pts[Math.round(t0 * 8)], ba = a + (b ? -1 : 1) * rr(0.35, 0.7);
        const bl = rr(3.5, 6.5), ex = q.x + Math.cos(ba) * bl, ez = q.z + Math.sin(ba) * bl;
        if (lowWalks.some((w) => segDist(ex, ez, w) < w.w / 2 + 1.2 || segDist((q.x + ex) / 2, (q.z + ez) / 2, w) < w.w / 2 + 1.2)) continue;
        const ey = groundAt(ex, ez) - 0.4;
        const bp = [q.clone(), V(q.x + Math.cos(ba) * bl * 0.4, q.y + 0.5, q.z + Math.sin(ba) * bl * 0.4), V(q.x + Math.cos(ba) * bl * 0.8, (q.y + ey) / 2 + 0.2, q.z + Math.sin(ba) * bl * 0.8), V(ex, ey, ez)];
        tube(P, MAT.bark, bp, rad * rr(0.45, 0.6), 7, 10);
        rootEnds.push([ex, ez, rad * 1.4]); solids.push({ x: ex, z: ez, r: rad * 0.6 });
        if (rnd() < 0.5) mossStrand(P, bp[1].x, bp[1].y - rad * 0.4, bp[1].z, rr(0.5, 1.6), 0.3, ba);
      }
      // мох подушками по верху корня
      for (let j = 1; j < 7; j++) { const q = pts[j]; P.add(MAT.moss, MOSS_LITE, M4(q.x, q.y + rad * 0.72, q.z, rr(-0.2, 0.2), a, rr(-0.2, 0.2), rad * rr(0.6, 0.95), rad * 0.35, rad * rr(0.9, 1.4))); }
      for (let j = 0; j < 4; j++) { const q = pts[1 + Math.floor(rnd() * 6)]; mossStrand(P, q.x, q.y - rad * 0.8, q.z, rr(0.6, 2.4), rr(0.2, 0.45), a); }
      if (rnd() < 0.6) { const q = pts[6]; shrooms(P, PG, q.x, q.y + rad * 0.85, q.z, 6, 1.2, rnd() < 0.6 ? MAT.shroom : MAT.shroomG); if (rnd() < 0.5) addLight(V(q.x, q.y + 1.0, q.z), BLUE, 5.5, 0.1); }
      if (rnd() < 0.5) perches.push({ x: pts[3].x, y: pts[3].y + rad, z: pts[3].z, ry: a });
      if (rnd() < 0.35) webs.push({ o: pts[2].clone().add(V(0, -rad * 0.2, 0)), u: V(-Math.sin(a), 0, Math.cos(a)), v: V(0, -1, 0), r: rr(0.7, 1.2) });
    }
    // воздушные корни: тонкие, из ствола косо вниз в землю
    for (let k = 0; k < 22; k++) {
      const a = rr(0, 6.28); if (angD(a, doorA) < 0.5 || angD(a, stairA0 + 0.4) < 0.7) continue;
      const y0 = rr(5, 13), r0 = rT(y0) * 0.97, r1 = Math.min(rT(0) + rr(1.5, 5), freeR(a, rT(0), rT(0) + 6));
      if (r1 < rT(0) + 0.8) continue;
      const ex = T.x + Math.cos(a) * r1, ez = T.z + Math.sin(a) * r1;
      const pts = [V(T.x + Math.cos(a) * r0, base + y0, T.z + Math.sin(a) * r0)];
      for (let t = 0.25; t < 1; t += 0.25) { const r = r0 + (r1 - r0) * Math.pow(t, 0.7); pts.push(V(T.x + Math.cos(a + rr(-0.03, 0.03)) * r, base + y0 * (1 - t) + rr(-0.2, 0.2), T.z + Math.sin(a + rr(-0.03, 0.03)) * r)); }
      pts.push(V(ex, groundAt(ex, ez) - 0.3, ez));
      tube(P, MAT.bark, pts, rr(0.08, 0.2), 5, 10); rootEnds.push([ex, ez, 0.6]);
    }
    // крона: толстые сухие ветви вверх и в стороны, сучья, лианы и мох свисают
    const crownTips = [], crownSeg = [], hang = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + 0.3, lean = rr(0.45, 0.9), len = rr(11, 17);
      const p0 = V(T.x + Math.cos(a) * 2.6, base + rr(24, 29), T.z + Math.sin(a) * 2.6);
      const p1 = p0.clone().add(V(Math.cos(a) * len * lean * 0.5, len * 0.5, Math.sin(a) * len * lean * 0.5));
      const p2 = p1.clone().add(V(Math.cos(a + 0.35) * len * lean * 0.55, len * 0.32, Math.sin(a + 0.35) * len * lean * 0.55));
      const rad = rr(0.9, 1.5);
      tube(P, MAT.bark, [p0, p0.clone().lerp(p1, 0.5).add(V(0, -0.5, 0)), p1, p2], rad, 8, 12);
      P.add(MAT.bark, new THREE.ConeGeometry(rad * 0.75, 1.6, 7), M4(p2.x, p2.y + 0.6, p2.z, rr(-0.4, 0.4), 0, rr(-0.4, 0.4)));
      crownTips.push(p2); crownSeg.push([p0, p1, p2, rad]);
      for (let j = 0; j < 4; j++) {
        const s = p1.clone().lerp(p2, rr(0, 1)), dd = V(rr(-1, 1), rr(-0.1, 0.9), rr(-1, 1)).normalize().multiplyScalar(rr(2.5, 5.5));
        beam(P, MAT.bark, s, s.clone().add(dd), rr(0.14, 0.3), 6);
        perches.push({ x: s.x + dd.x, y: s.y + dd.y + 0.1, z: s.z + dd.z, ry: rr(0, 6) });
      }
      for (let j = 0; j < 9; j++) {
        const s = p0.clone().lerp(p2, rr(0.15, 1)); const top = V(s.x, s.y - rad * 0.8, s.z);
        hang.push(rnd() < 0.55 ? { v: true, top, len: rr(4, 15), a, curl: rr(0.2, 0.7) } : { v: false, top, len: rr(1.5, 4.5), wid: rr(0.35, 0.7), a: rr(0, 6) });
      }
    }
    // листва: редкие рваные кисти листьев на концах ветвей и сучьев (объём без «шапки»)
    const spray = (c, R, n) => { for (let q = 0; q < n; q++) { const d = V(rr(-1, 1), rr(-0.6, 0.8), rr(-1, 1)); if (d.length() > 1) continue; const p = c.clone().addScaledVector(d, R); (rnd() < 0.78 ? leafM : leafM2).push(M4(p.x, p.y, p.z, rr(-1.2, 1.2), rr(0, 6.28), rr(-1.2, 1.2), rr(0.8, 1.5))); } };
    for (const [p0, p1, p2] of crownSeg) for (let j = 0; j < 7; j++) { const t = rr(0.35, 1); const c = t < 0.5 ? p0.clone().lerp(p1, t * 2) : p1.clone().lerp(p2, (t - 0.5) * 2); spray(c.add(V(0, 0.5, 0)), rr(1.2, 2.0), 75); }
    for (const pe of perches.slice(-36)) spray(V(pe.x, pe.y + 0.3, pe.z), rr(1.0, 1.8), 45);
    // плющ пятнами по стволу
    for (let k = 0; k < 30; k++) {
      const a0 = rr(0, 6.28), y0 = rr(1, 26), h0 = rr(1.5, 4.5);
      if (y0 < 4 && angD(a0, doorA) < 0.5) continue;
      for (let q = 0; q < 55; q++) {
        const y = y0 + rr(-0.5, 1) * h0 * Math.sqrt(rnd()), aa = a0 + rr(-1, 1) * (0.45 - Math.abs(y - y0) / h0 * 0.25) * 3 / rT(y), R = trunkR(aa, y + 0.6) * 1.01 + rr(0.02, 0.08);
        (rnd() < 0.85 ? leafM3 : leafM2).push(M4(T.x + Math.cos(aa) * R, base + y, T.z + Math.sin(aa) * R, rr(-0.4, 0.4), Math.PI / 2 - aa + rr(-0.5, 0.5), rr(-0.8, 0.8), rr(0.6, 1.0)));
      }
    }
    // галереи, винтовые лестницы, окна по стволу
    const levels = [7.0, 13.0, 19.0, 24.5];
    const stairS = [];   // точки лестницы и галерей {a, y, R}: тут ничего не висит и не стоит
    const galArcs = [];
    let a = stairA0, yPrev = 0;
    levels.forEach((ly, li) => {
      // винтовая лестница от предыдущего яруса до этого
      const rise = ly - yPrev, n = Math.round(rise / 0.22), dth = 0.32 / (rT(yPrev + rise / 2) + 1.3);
      const pts = [], ptsO = [];
      for (let k = 0; k <= n; k++) {
        const ak = a + dth * k, y = base + yPrev + rise * k / n, R = rT(y - base) + 1.25;
        if (k < n) {
          const ym = y + rise / n - 0.035;
          box(P, rnd() < 0.3 ? MAT.plankOld : MAT.plank, 1.95, 0.08, 0.36, M4(T.x + Math.cos(ak + dth / 2) * (R - 0.35), ym, T.z + Math.sin(ak + dth / 2) * (R - 0.35), 0, -(ak + dth / 2), 0));
          stairS.push({ a: ak, y: ym, R });
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
      for (let k = 0; k < nP; k++) { const aa = g0 + (g1 - g0) * (k + 0.5) / nP; plank(P, rnd() < 0.25 ? MAT.plankOld : MAT.plank, T.x + Math.cos(aa) * (R + 0.35), y, T.z + Math.sin(aa) * (R + 0.35), 2.5, 0.3, -aa, 0.09); if (k % 3 === 0) stairS.push({ a: aa, y, R: R + 0.75 }); }
      for (let k = 0; k <= 7; k++) { const aa = g0 + (g1 - g0) * k / 7; beam(P, MAT.woodDark, V(T.x + Math.cos(aa) * rT(ly - 2) * 0.96, y - 2.0, T.z + Math.sin(aa) * rT(ly - 2) * 0.96), V(T.x + Math.cos(aa) * (R + 1.5), y - 0.06, T.z + Math.sin(aa) * (R + 1.5)), 0.09, 5); }
      const rp = []; for (let k = 0; k <= 9; k++) { const aa = g0 + 0.3 + (g1 - g0 - 0.3) * k / 9; rp.push(V(T.x + Math.cos(aa) * (R + 1.55), 0, T.z + Math.sin(aa) * (R + 1.55))); }
      for (let k = 0; k < 9; k++) railing(P, rp[k], rp[k + 1], y + 0.05, 0.9, 0.1);
      for (let k = 0; k < 10; k++) { const aa = g0 + (g1 - g0) * (k + 0.5) / 10; const a2 = g0 + (g1 - g0) * (k + 1.5) / 10; if (k < 9) walks.push({ a: [T.x + Math.cos(aa) * (R + 0.75), T.z + Math.sin(aa) * (R + 0.75)], b: [T.x + Math.cos(a2) * (R + 0.75), T.z + Math.sin(a2) * (R + 0.75)], w: 1.5, y: y + 0.05 }); }
      solids.push({ x: T.x, z: T.z, r: rT(ly) + 0.25, y0: y - 1, y1: y + 2.5 });
      galArcs.push({ g0, g1, ly, R });
      for (let k = 0; k < 16; k++) { const aa = g0 + (g1 - g0) * rnd(); const rr0 = R + rr(0.6, 1.6); const top = V(T.x + Math.cos(aa) * rr0, y - 0.1, T.z + Math.sin(aa) * rr0); hang.push(rnd() < 0.5 ? { v: false, top, len: rr(0.6, 2.2), wid: rr(0.25, 0.5), a: Math.PI / 2 - aa } : { v: true, top, len: rr(1.5, 5), a: aa, curl: 0.25 }); }
      // у стыка галереи со стволом: мох и трутовики
      for (let k = 0; k < 8; k++) { const aa = g0 + (g1 - g0) * rnd(), r0 = rT(ly) * 1.0; P.add(MAT.moss, MOSS_LITE, M4(T.x + Math.cos(aa) * r0, y + 0.02, T.z + Math.sin(aa) * r0, 0, Math.PI / 2 - aa, 0, rr(0.4, 0.8), rr(0.15, 0.3), rr(0.3, 0.5))); P.add(MAT.bone, new THREE.CylinderGeometry(0.01, rr(0.25, 0.45), 0.1, 9, 1, false, 0, Math.PI), M4(T.x + Math.cos(aa) * r0, y - rr(0.3, 1.2), T.z + Math.sin(aa) * r0, 0, -aa, 0)); }
      for (let k = 0; k < 3; k++) { const aa = g0 + (g1 - g0) * rnd(), rr0 = R + 1.45; webs.push({ o: V(T.x + Math.cos(aa) * rr0, y + 0.55, T.z + Math.sin(aa) * rr0), u: V(-Math.sin(aa), 0, Math.cos(aa)), v: V(0, -1, 0), r: rr(0.35, 0.6) }); }
      // окна по стволу над галереей и фонари
      const nw = 4 + li;
      for (let k = 0; k < nw; k++) {
        const aa = g0 + (g1 - g0) * (k + 0.5) / nw + rr(-0.06, 0.06), r0 = trunkMax(aa, 0.7 / rT(ly + 1.5), ly + 0.8, ly + 2.2) + 0.04;
        windowLit(P, PG, MAT.winGreen, T.x + Math.cos(aa) * r0, y + 1.5, T.z + Math.sin(aa) * r0, Math.PI / 2 - aa, 1.05, 1.35);
        shafts.push({ p: V(T.x + Math.cos(aa) * (r0 + 0.1), y + 1.5, T.z + Math.sin(aa) * (r0 + 0.1)), d: V(Math.cos(aa), -0.55, Math.sin(aa)), w: 1.0, h: 1.3, len: rr(5, 8), col: [0.45, 1.0, 0.45], a: 0.2 });
        box(P, MAT.roof, 1.4, 0.08, 0.75, M4(T.x + Math.cos(aa) * (r0 + 0.22), y + 2.4, T.z + Math.sin(aa) * (r0 + 0.22), 0.4, Math.PI / 2 - aa, 0));
        for (const q of [-0.6, 0.6]) { const ab = aa + q / r0; beam(P, MAT.woodDark, V(T.x + Math.cos(ab) * r0 * 0.97, y + 1.9, T.z + Math.sin(ab) * r0 * 0.97), V(T.x + Math.cos(ab) * (r0 + 0.5), y + 2.3, T.z + Math.sin(ab) * (r0 + 0.5)), 0.035, 4); }
      }
      const am = (g0 + g1) / 2;
      addLight(V(T.x + Math.cos(am) * (R + 2.2), y + 1.4, T.z + Math.sin(am) * (R + 2.2)), GREEN, 9, 0.3, 1);
      { const aa = g1 - 0.25, px = T.x + Math.cos(aa) * (R + 1.55), pz = T.z + Math.sin(aa) * (R + 1.55); beam(P, MAT.woodDark, V(px, y, pz), V(px, y + 2.1, pz), 0.05, 5); const hx = px - Math.cos(aa) * 0.45, hz = pz - Math.sin(aa) * 0.45; beam(P, MAT.woodDark, V(px, y + 2.05, pz), V(hx, y + 2.05, hz), 0.035, 5); chain(P, V(hx, y + 2.03, hz), 0.25); const p = lantern(P, PG, hx, y + 1.55, hz, 1.1, MAT.winGreen); halos.push({ p, col: [0.45, 1.0, 0.4], s: 0.65 }); }
      a = aEnd + (g1 - aEnd) * 0.8; yPrev = ly;
    });
    // проверка: не мешает ли лестнице и галереям (по высоте над base y0..y1, радиусы r0..r1)
    const clearOf = (aa, da, y0, y1, r0, r1) => !stairS.some((q) => angD(q.a, aa) < da + 0.9 / q.R && q.y - base > y0 - 2.4 && q.y - base < y1 + 0.4 && q.R + 1.1 > r0 && q.R - 1.1 < r1);
    // пристройки на стволе: сруб на помосте, помост на укосинах из ствола, крыша двускатная, окна светятся,
    // у стыка со стволом — нарост коры и мох; маленькие — избушки-наросты, большие — горницы с балконом
    const annexes = [];
    const annex = (aa, ly, big, rOut) => {
      const bw = big ? rr(3.4, 4.2) : rr(2.1, 2.6), bd = big ? rr(2.8, 3.4) : rr(1.8, 2.2), bh = big ? rr(2.2, 2.5) : rr(1.6, 1.9);
      const da = (bw / 2 + 0.6) / rT(ly);
      const onGal = rOut !== undefined;                               // горница на краю галереи
      const rb = onGal ? rOut : trunkMax(aa, da, ly - 0.2, ly + bh + 1.5) - 0.15;    // задняя стенка заходит в ствол
      if (!clearOf(aa, da, ly - 0.3, ly + bh + 2.2, onGal ? rb + 0.3 : rb - 0.5, rb + bd + 1.2)) return false;
      if (annexes.some((q) => angD(q.aa, aa) < (q.bw + bw) / 2 / rT(ly) + 0.15 && Math.abs(q.ly - ly) < (q.bh + bh) / 2 + 2.6)) return false;
      annexes.push({ aa, ly, bw, bh });
      const y = base + ly, rc = rb + bd / 2, x = T.x + Math.cos(aa) * rc, z = T.z + Math.sin(aa) * rc, rot = Math.PI / 2 - aa;
      const c = Math.cos(rot), s = Math.sin(rot), ox = Math.cos(aa), oz = Math.sin(aa);
      const LA = (lx, yy, lz) => V(x + lx * c + lz * s, yy, z - lx * s + lz * c);
      const deckD = bd + (big ? 1.4 : 0.5);
      // помост: доски поперёк, от ствола наружу
      const np = Math.round(deckD / 0.3);
      const dz0 = onGal ? -bd / 2 + 0.05 : -bd / 2;
      for (let k = 0; k < np; k++) { const lz = dz0 + (k + 0.5) * (deckD - (dz0 + bd / 2)) / np; const p = LA(0, y, lz); plank(P, rnd() < 0.3 ? MAT.plankOld : MAT.plank, p.x, y, p.z, bw + 0.6, 0.3, rot, 0.09); }
      for (const lx of [-bw / 2 - 0.1, 0, bw / 2 + 0.1]) beam(P, MAT.woodDark, LA(lx, y - 0.12, -bd / 2 - 0.3), LA(lx, y - 0.12, -bd / 2 + deckD), 0.09, 6);
      // укосины из ствола под край помоста
      for (const lx of [-bw / 2 + 0.2, bw / 2 - 0.2]) { const ab = aa + lx / rb; const r0 = trunkR(ab, ly - 2.0) * 0.97; beam(P, MAT.woodDark, V(T.x + Math.cos(ab) * r0, y - 2.6, T.z + Math.sin(ab) * r0), LA(lx, y - 0.15, -bd / 2 + deckD - 0.2), 0.1, 6); }
      // сруб: три стены (задняя — ствол), в передней окно, в боковой дверь
      const nl = Math.round(bh / 0.3);
      for (let k = 0; k < nl; k++) {
        const yy = y + 0.17 + k * 0.3;
        const fr = [LA(-bw / 2 - 0.2, yy, bd / 2), LA(bw / 2 + 0.2, yy, bd / 2)];
        if (k >= 2 && k <= 4) { beam(P, MAT.log, fr[0], fr[0].clone().lerp(fr[1], 0.36), 0.14, 6); beam(P, MAT.log, fr[0].clone().lerp(fr[1], 0.64), fr[1], 0.14, 6); } else beam(P, MAT.log, fr[0], fr[1], 0.14, 6);
        for (const sx of [-1, 1]) {
          const A = LA(sx * bw / 2, yy, -bd / 2 - 0.25), B = LA(sx * bw / 2, yy, bd / 2 + 0.2);
          if (big && sx > 0 && k < 6) { beam(P, MAT.log, A, A.clone().lerp(B, 0.3), 0.14, 6); beam(P, MAT.log, A.clone().lerp(B, 0.72), B, 0.14, 6); } else beam(P, MAT.log, A, B, 0.14, 6);
        }
      }
      const inner = LA(0, y + bh / 2, 0);
      PG.add(MAT.inGreen, new THREE.PlaneGeometry(bw * 0.85, bh * 0.85), M4(inner.x - ox * bd * 0.3, inner.y, inner.z - oz * bd * 0.3, 0, rot, 0));
      box(P, MAT.dark, bw - 0.2, 0.05, bd - 0.1, M4(inner.x, y + bh + 0.08, inner.z, 0, rot, 0));
      { const p = LA(0, y + 1.1, bd / 2 + 0.1); windowLit(P, PG, MAT.winGreen, p.x, p.y, p.z, rot, 0.62, 0.62); shafts.push({ p: p.clone().add(V(ox * 0.06, 0, oz * 0.06)), d: V(ox, -0.5, oz), w: 0.6, h: 0.6, len: 4.5, col: [0.45, 1.0, 0.45], a: 0.2 }); }
      if (big) { // боковая дверь (закрыта) и балкон с перилами
        const p = LA(bw / 2 + 0.06, y + 1.0, (-bd / 2 - 0.25) + (bd + 0.45) * 0.51);
        P.add(MAT.door, boxUV(new THREE.BoxGeometry(0.07, 1.85, 0.85), 1, 1, 1), M4(p.x, y + 0.98, p.z, 0, rot, 0));
        railing(P, LA(-bw / 2 - 0.25, 0, -bd / 2 + deckD), LA(bw / 2 + 0.25, 0, -bd / 2 + deckD), y + 0.05, 0.9, 0);
        railing(P, LA(-bw / 2 - 0.25, 0, bd / 2 + 0.25), LA(-bw / 2 - 0.25, 0, -bd / 2 + deckD), y + 0.05, 0.9, 0);
        const lp = LA(bw / 2 + 0.2, y, -bd / 2 + deckD - 0.1); beam(P, MAT.woodDark, lp, lp.clone().add(V(0, 2.0, 0)), 0.045, 5); halos.push({ p: lantern(P, PG, lp.x, y + 2.2, lp.z, 0.9, MAT.winOrange), col: [1.0, 0.55, 0.2], s: 0.5 });
        addLight(LA(0, y + 1.6, bd / 2 + 1.8), ORANGE, 5.5, 0.6);
      }
      gableRoof(P, x, y + bh + 0.15, z, bw + 0.2, bd + 0.6, big ? rr(2.0, 2.6) : rr(1.5, 2.0), rot, 0.45, { horns: big ? 1.2 : 0.9 });
      // нарост коры и мох на стыке со стволом, лианы с края помоста, трутовики снизу
      if (!onGal) P.add(MAT.bark, new THREE.SphereGeometry(1, 12, 8), M4(T.x + Math.cos(aa) * rb, y - 0.7, T.z + Math.sin(aa) * rb, 0, rot, 0, bw * 0.62, 1.1, 0.9));
      else for (const lx of [-bw / 2, bw / 2]) { const ab = aa + lx / rb, r0 = trunkR(ab, ly - 3.2) * 0.97; beam(P, MAT.woodDark, V(T.x + Math.cos(ab) * r0, y - 3.6, T.z + Math.sin(ab) * r0), LA(lx, y - 0.15, -bd / 2 + 0.1), 0.11, 6); }
      for (let k = 0; k < (onGal ? 0 : 6); k++) { const q = LA(rr(-bw / 2, bw / 2), y - 0.05, -bd / 2 - 0.1); P.add(MAT.moss, MOSS_LITE, M4(q.x, y + 0.05, q.z, 0, rot, 0, rr(0.35, 0.7), rr(0.15, 0.28), rr(0.3, 0.5))); }
      for (let k = 0; k < (big ? 7 : 4); k++) { const q = LA(rr(-bw / 2, bw / 2), y - 0.12, -bd / 2 + deckD - rr(0, 0.2)); hang.push(rnd() < 0.5 ? { v: true, top: q, len: rr(1.5, 4), a: aa, curl: 0.3 } : { v: false, top: q, len: rr(0.6, 1.8), wid: rr(0.3, 0.5), a: rot }); }
      for (let k = 0; k < 3; k++) { const ab = aa + rr(-da, da), r0 = trunkR(ab, ly - 1.2); P.add(MAT.bone, new THREE.CylinderGeometry(0.01, rr(0.25, 0.45), 0.1, 9, 1, false, 0, Math.PI), M4(T.x + Math.cos(ab) * r0, y - rr(0.8, 1.8), T.z + Math.sin(ab) * r0, 0, -ab, 0)); }
      for (let k = 0; k < 4; k++) { const q = LA(rr(-bw / 2, bw / 2), y + bh + 0.4, rr(-bd / 2, bd / 2)); P.add(MAT.moss, new THREE.SphereGeometry(1, 8, 5, 0, 6.29, 0, 1.4), M4(q.x, q.y + rr(0, 0.6), q.z, 0, rr(0, 6), 0, rr(0.3, 0.6), rr(0.1, 0.2), rr(0.3, 0.6))); }
      addLight(LA(0, y + 1.2, bd / 2 + 1.6), GREEN, big ? 6.5 : 5, 0.4, big ? 1 : 0);
      perches.push({ x, y: y + bh + (big ? 2.6 : 2.0), z, ry: rot });
      solids.push({ x, z, r: Math.max(bw, bd) * 0.5, y0: y - 0.5, y1: y + bh + 1 });
      return true;
    };
    // перебираем места по кругу и высоте: сначала большие, потом малые; лестница и галереи остаются свободными
    { let nb = 0, ns = 0;
      const front = Math.atan2(SHOT_CAMS.whole.pos[2] - T.z, SHOT_CAMS.whole.pos[0] - T.x);
      // горницы на галереях: за перилами, дверью к галерее, на своих укосинах из ствола
      for (const g of galArcs) { let n = 0; const cand = []; for (let t = 0.15; t <= 0.85; t += 0.07) cand.push(g.g0 + (g.g1 - g.g0) * t); cand.sort((p, q) => angD(p, front) - angD(q, front)); for (const aa of cand) { if (n >= 2) break; if (annex(aa, g.ly, true, g.R + 1.72)) { n++; nb++; } } }
      // сначала со стороны, откуда смотрит общий план (как на концепте), потом по кругу
      for (const ly of [9.5, 15.5, 21.0, 4.5, 11.5, 17.5, 26.5, 6.5, 13.5, 23.0]) for (let k = 0; k < 13; k++) {
        const aa = front + (k - 6) * 0.2 + rr(-0.05, 0.05);
        if (ly < 6 && angD(aa, doorA) < 1.2) continue;
        if (nb < 7 && annex(aa, ly, true)) { nb++; continue; }
        if (ns < 6 && rnd() < 0.5 && annex(aa, ly + rr(-0.4, 0.4), false)) ns++;
      }
      for (const ly of [4.5, 10.0, 15.8, 21.5, 9.0, 3.6, 27.5, 12.4, 17.6]) for (let k = 0; k < 16; k++) {
        const aa = doorA + 0.9 + k / 16 * Math.PI * 2 + rr(-0.1, 0.1);
        if (ly < 6 && angD(aa, doorA) < 1.2) continue;
        if (rnd() < 0.35) continue;
        if (nb < 14 && annex(aa, ly, true)) { nb++; continue; }
        if (ns < 12 && rnd() < 0.6 && annex(aa, ly + rr(-0.5, 0.5), false)) ns++;
      }
      anim.annexCount = [nb, ns];
    }
    // дупла с совами (глаза светятся) — ставим места, сами совы в life.js
    anim.owls = [[doorA + 1.5, 4.3], [doorA - 2.0, 15.0], [doorA + 2.6, 26.5]].map(([aa, ly]) => {
      const r0 = trunkR(aa, ly + 0.6) * 0.99, x = T.x + Math.cos(aa) * r0, z = T.z + Math.sin(aa) * r0, y = base + ly;
      P.add(MAT.dark, new THREE.SphereGeometry(0.62, 10, 8), M4(x, y, z, 0, Math.PI / 2 - aa, 0, 0.9, 1.25, 0.35));
      return { x: x + Math.cos(aa) * 0.15, y: y - 0.25, z: z + Math.sin(aa) * 0.15, ry: Math.PI / 2 - aa };
    });
    // дверь у подножия (оттуда выходит Леший): ниша в стволе, косяки и притолока из брёвен, арка из корней,
    // две створки закрыты (открываются, когда Леший выходит), над дверью — оконце и рогатый череп
    {
      const r0 = rDoor + 0.02, dx = T.x + Math.cos(doorA) * r0, dz = T.z + Math.sin(doorA) * r0, rot = Math.PI / 2 - doorA;
      const ox = Math.cos(doorA), oz = Math.sin(doorA), tx = -Math.sin(doorA), tz = Math.cos(doorA);
      const DW = 2.3, DH = 3.1;
      P.add(MAT.dark, new THREE.PlaneGeometry(DW + 0.3, DH + 0.2), M4(dx - ox * 0.1, base + DH / 2, dz - oz * 0.1, 0, rot, 0));
      for (const sd of [-1, 1]) {
        beam(P, MAT.woodDark, V(dx + tx * sd * (DW / 2 + 0.18), base - 0.3, dz + tz * sd * (DW / 2 + 0.18)), V(dx + tx * sd * (DW / 2 + 0.18), base + DH + 0.3, dz + tz * sd * (DW / 2 + 0.18)), 0.2, 7);
        // корни аркой: от земли по краю ниши к притолоке, прижаты к стволу
        tube(P, MAT.bark, [V(dx + tx * sd * 2.1 + ox * 0.5, base - 0.4, dz + tz * sd * 2.1 + oz * 0.5), V(dx + tx * sd * 1.85 + ox * 0.2, base + 1.8, dz + tz * sd * 1.85 + oz * 0.2), V(dx + tx * sd * 1.3 + ox * 0.15, base + DH + 0.6, dz + tz * sd * 1.3 + oz * 0.15), V(dx + ox * 0.15, base + DH + 0.95, dz + oz * 0.15)], 0.34, 8, 12);
      }
      beam(P, MAT.woodDark, V(dx - tx * 1.6, base + DH + 0.15, dz - tz * 1.6), V(dx + tx * 1.6, base + DH + 0.15, dz + tz * 1.6), 0.2, 6);
      box(P, MAT.woodDark, DW + 0.4, 0.14, 0.7, M4(dx + ox * 0.15, base + 0.07, dz + oz * 0.15, 0, rot, 0));   // порог
      // створки: каждая на своей петле (крайней), закрыты
      const leaves = [];
      for (const sd of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.set(dx + tx * sd * DW / 2 + ox * 0.06, base + 0.12, dz + tz * sd * DW / 2 + oz * 0.06); piv.rotation.y = rot;
        const PL = new Pack();
        const lw = DW / 2 - 0.02;
        box(PL, MAT.door, lw, DH - 0.15, 0.1, M4(-sd * lw / 2, (DH - 0.15) / 2, 0));
        for (const hy of [0.45, 1.5, DH - 0.6]) { box(PL, MAT.woodDark, lw - 0.06, 0.12, 0.05, M4(-sd * lw / 2, hy, 0.07)); box(PL, MAT.iron, 0.5, 0.06, 0.02, M4(-sd * 0.27, hy, 0.1)); }
        PL.add(MAT.iron, new THREE.TorusGeometry(0.09, 0.016, 4, 10), M4(-sd * (lw - 0.18), 1.35, 0.1));
        piv.add(PL.build(true, true)); scene.add(piv); leaves.push({ g: piv, sd, rot });
      }
      // круглое оконце над дверью — зелёный свет изнутри
      windowLit(P, PG, MAT.winGreen, dx + ox * 0.05, base + DH + 1.4, dz + oz * 0.05, rot, 0.7, 0.7, { shutter: false });
      skull(P, dx + ox * 0.45, base + DH + 2.3, dz + oz * 0.45, 1.25, rot, true, true);
      for (const sd of [-1, 1]) { const p = V(dx + tx * sd * 2.4 + ox * 0.9, base, dz + tz * sd * 2.4 + oz * 0.9); beam(P, MAT.woodDark, V(p.x, base - 0.3, p.z), V(p.x, base + 2.1, p.z), 0.07, 5); P.add(MAT.iron, new THREE.CylinderGeometry(0.1, 0.06, 0.18, 6), M4(p.x, base + 2.15, p.z)); anim.flames.push(makeFlame(scene, V(p.x, base + 2.22, p.z), 0.45)); bases.push([p.x, p.z, 0.2]); }
      // мох и папоротник у порога, мох по притолоке
      for (let k = 0; k < 10; k++) { const sd = rnd() < 0.5 ? -1 : 1, q = V(dx + tx * sd * rr(1.3, 2.3) + ox * rr(0.1, 0.8), base, dz + tz * sd * rr(1.3, 2.3) + oz * rr(0.1, 0.8)); P.add(MAT.moss, MOSS_LITE, M4(q.x, base - 0.05, q.z, 0, rr(0, 6), 0, rr(0.3, 0.6), rr(0.15, 0.3), rr(0.3, 0.6))); }
      for (let k = 0; k < 6; k++) { const t = rr(-1.5, 1.5); mossStrand(P, dx + tx * t + ox * 0.25, base + DH + 0.05, dz + tz * t + oz * 0.25, rr(0.3, 0.9), 0.3, rot); }
      addLight(V(T.x + ox * 16, base + 15, T.z + oz * 16), [0.35, 0.8, 0.3], 16, 0.15, 1);
      addLight(V(T.x + ox * 14, base + 6, T.z + oz * 14), [0.3, 0.75, 0.35], 12, 0.1, 1);
      addLight(V(dx + ox * 2.5, base + 2.2, dz + oz * 2.5), ORANGE, 6, 0.8);
      anim.doorLeshy = { x: dx + ox * 2.6, z: dz + oz * 2.6, ix: dx - ox * 1.6, iz: dz - oz * 1.6, yaw: Math.atan2(ox, oz), leaves };
      walks.push({ a: [dx - ox * 1.8, dz - oz * 1.8], b: [J.J3[0], J.J3[1]], w: 2.0, y: WALK_Y });
    }
    // свисающее с кроны и галерей: только там, где не мешает лестнице и галереям
    for (const h of hang) {
      const aa = Math.atan2(h.top.z - T.z, h.top.x - T.x), r = Math.hypot(h.top.x - T.x, h.top.z - T.z), y1 = h.top.y - base;
      if (!clearOf(aa, 0.1, y1 - h.len, y1 - 0.25, r - 0.3, r + 0.3)) continue;
      if (h.v) vine(P, h.top, h.len, h.a, h.curl); else mossStrand(P, h.top.x, h.top.y, h.top.z, h.len, h.wid, h.a);
    }
    // мох по всему стволу
    for (let k = 0; k < 220; k++) {
      const aa = rr(0, 6.28), y = rr(2, 28), R = trunkMax(aa, 0.04, y - 3, y), len = rr(0.8, 3.5);
      if (y < 6 && angD(aa, doorA) < 0.45) continue;
      if (!clearOf(aa, 0.05, y - len, y, R - 0.2, R + 0.3)) continue;
      if (rnd() < 0.3) vine(P, V(T.x + Math.cos(aa) * (R + 0.06), base + y, T.z + Math.sin(aa) * (R + 0.06)), len * 1.5, aa, 0.2);
      else mossStrand(P, T.x + Math.cos(aa) * (R + 0.05), base + y, T.z + Math.sin(aa) * (R + 0.05), len, rr(0.25, 0.6), Math.PI / 2 - aa);
    }
    // грибы-трутовики полками на стволе
    for (let k = 0; k < 26; k++) { const aa = rr(0, 6.28), y = rr(1, 22), R = trunkR(aa, y + 0.6) * 0.99; P.add(MAT.bone, new THREE.CylinderGeometry(0.01, rr(0.3, 0.6), 0.12, 9, 1, false, 0, Math.PI), M4(T.x + Math.cos(aa) * R, base + y, T.z + Math.sin(aa) * R, 0, Math.PI / 2 - aa - Math.PI / 2, 0)); }
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
    solids.push({ x, z, r: 0.75 }); bases.push([x, z, 0.9]);
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

  // ---------- фонари на шестах: стоят сбоку от мостков, фонарь висит над краем настила ----------
  {
    const segsW = walks.filter((w) => !w.ramp && w.y === WALK_Y && Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) > 4.5);
    segsW.forEach((w, i) => {
      if (i % 2) return;
      const mx = (w.a[0] + w.b[0]) / 2, mz = (w.a[1] + w.b[1]) / 2;
      if (JUNC.some((j) => Math.hypot(mx - j[0], mz - j[1]) < 3)) return;
      if (Math.hypot(mx - TREE.x, mz - TREE.z) < rT(0) + 7) return;          // не перед дверью дуба
      const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], L = Math.hypot(dx, dz), sd = i % 4 ? 1 : -1;
      const nx = dz / L * sd, nz = -dx / L * sd;                        // поперёк линии
      const off = w.w / 2 + 0.55, px = mx + nx * off, pz = mz + nz * off, y = groundAt(px, pz);
      if (walks.some((q) => !q.ramp && segDist(px, pz, q) < q.w / 2 + 0.3)) return;   // не на чужом проходе
      beam(P, MAT.woodDark, V(px, y - 0.5, pz), V(px, WALK_Y + 2.7, pz), 0.07, 5); bases.push([px, pz, 0.15]);
      lashing(P, px, WALK_Y + 0.6, pz, 0.07);
      const hx = px - nx * 0.75, hz = pz - nz * 0.75;
      beam(P, MAT.woodDark, V(px, WALK_Y + 2.6, pz), V(hx - nx * 0.05, WALK_Y + 2.66, hz - nz * 0.05), 0.04, 5);
      chain(P, V(hx, WALK_Y + 2.62, hz), 0.3);
      const blue = rnd() < 0.3, p = lantern(P, PG, hx, WALK_Y + 2.12, hz, 1.0, blue ? MAT.shroom : MAT.winOrange);
      addLight(p, blue ? BLUE : ORANGE, 6, blue ? 0.2 : 0.7);
      lamps.push(p); halos.push({ p, col: blue ? BLUE : ORANGE, s: 0.6 });
      webs.push({ o: V(px, WALK_Y + 2.58, pz), u: V(-nx, 0, -nz), v: V(0, -1, 0), r: 0.55 });
      perches.push({ x: px, y: WALK_Y + 2.8, z: pz, ry: rr(0, 6) });
    });
  }

  // опора для предмета радиуса R и высоты H: возвращает центр y и наклон (ax, az)
  const restProp = (x, z, R, H) => {
    const onDeck = walks.some((w) => !w.ramp && segDist(x, z, w) < 0.875 - R * 0.6);
    if (onDeck) return { y: WALK_Y + 0.035 + H / 2, ax: 0, az: 0 };
    const gx0 = groundAt(x - R, z), gx1 = groundAt(x + R, z), gz0 = groundAt(x, z - R), gz1 = groundAt(x, z + R);
    const g = Math.max((gx0 + gx1 + gz0 + gz1) / 4, groundAt(x, z));
    const depth = WATER_Y - g;
    if (depth > 0.45) { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453, f = h - Math.floor(h); // без rr: порядок случайных чисел логова не сдвигается
      return { y: WATER_Y - 0.08, ax: Math.PI / 2 + (f - 0.5) * 0.5, az: (f * 7 % 1 - 0.5) * 0.6 }; } // плывёт набок
    const k = 0.8; // наклон по рельефу, не круче ~35°
    const ax = -Math.max(-0.6, Math.min(0.6, Math.atan2(gz1 - gz0, 2 * R))) * k, az = Math.max(-0.6, Math.min(0.6, Math.atan2(gx1 - gx0, 2 * R))) * k;
    return { y: g + H / 2 - 0.04 - (depth > 0 ? 0.06 : 0), ax, az };
  };
  // ---------- лодки-долблёнки у мостков, сети, бочки ----------
  for (const [x, z, ry] of [[3.5, 21, 0.2], [-15, -2.5, 1.4], [21, -2, 1.7], [-2, -14, 0.5]]) {
    const g = new THREE.CylinderGeometry(0.42, 0.42, 3.4, 12, 1, true, Math.PI / 2, Math.PI); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI);
    P.add(MAT.log, g, M4(x, WATER_Y + 0.12, z, 0, ry, 0, 1, 1, 1));
    beam(P, MAT.wood, V(x, WATER_Y + 0.2, z), V(x + Math.sin(ry + 0.3) * 1.6, WATER_Y + 0.1, z + Math.cos(ry + 0.3) * 1.6), 0.03, 4);
  }
  // бочки ложатся по «гравитации» (правило R8): на настил, если стоят на нём целиком; иначе на землю с наклоном
  // по рельефу; в воде — на дно (мелко) или всплывают, утонув на две трети и завалившись набок
  for (const [x, z] of [[-29, 9.5], [-36, 9], [27, 1.5], [-10, 21]]) for (let k = 0; k < 3; k++) {
    const px = x + rr(-0.6, 0.6), pz = z + rr(-0.6, 0.6), R = 0.32, H = 0.75;
    const r = restProp(px, pz, R, H);
    const m = M4(px, r.y, pz, r.ax, 0, r.az);
    P.add(MAT.wood, new THREE.CylinderGeometry(0.32, 0.28, H, 10), m);
    P.add(MAT.iron, new THREE.TorusGeometry(0.31, 0.02, 4, 12), m.clone().multiply(M4(0, 0.18, 0, Math.PI / 2)));
  }

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
    const needleMat = paint({ base: '#2a4632', moss: '#3f5c2c', mossAmt: 0.25, stroke: [0, -1, 0], strokeAmt: 0.36, break: 0.4, rim: 0.7 }); needleMat.name = 'needleMat';
    const needleMatS = paint({ base: '#3a5c3a', stroke: [0, -1, 0], strokeAmt: 0.3, break: 0.36, rim: 0.9 }); needleMatS.name = 'needleMatS';
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
      solids.push({ x, z, r: 0.5 }); if (edge < 1.75) bases.push([x, z, w * 0.75]);
    }
    const Mx = (t) => M4(t.x, t.y, t.z, rr(-0.03, 0.03), t.ry, rr(-0.03, 0.03), t.w, t.h, t.w);
    // ближний лес — проработанные деревья как в деревне: 4 вида ели, сосны, берёзы на опушке; дальний — простые конусы
    const sprG = [spruceGeo(1, 0), spruceGeo(2, 0), spruceGeo(3, 1), spruceGeo(4, 2)];
    const pines = [pineGeo(5), pineGeo(6)], birches = [birchGeo(7, 0.6), birchGeo(8, 0.35)];
    const sprMat = paint({ base: '#ffffff', vcol: true, map: needleTex, mapGain: 2.3, sway: 0.35, rim: 0.9, strokeAmt: 0.16, break: 0.32, side: THREE.DoubleSide, noFlip: true }); sprMat.name = 'sprMat';
    const pineMat = paint({ base: '#ffffff', vcol: true, map: needleTex, mapGain: 2.2, sway: 0.4, rim: 1.0, strokeAmt: 0.16, break: 0.32, side: THREE.DoubleSide, noFlip: true }); pineMat.name = 'pineMat';
    const pineBark = paint({ base: '#a0562c', moss: '#3e5a24', mossAmt: 0.25, stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.3, rim: 1.0 }); pineBark.name = 'pineBark';
    const birchLeaf = paint({ base: '#ffffff', vcol: true, sway: 0.7, rim: 1.0, strokeAmt: 0.12, break: 0.3, side: THREE.DoubleSide, noFlip: true }); birchLeaf.name = 'birchLeaf';
    const birchBark = paint({ base: '#ffffff', map: birchTex, mapGain: 1.0, moss: '#3e5a24', mossAmt: 0.12, strokeAmt: 0.1, break: 0.25, rim: 1.0 }); birchBark.name = 'birchBark';
    const sprI = sprG.map(() => []), pineI = pines.map(() => []), birchI = birches.map(() => []), far = [], farS = [];
    for (const t of [...list, ...listS]) {
      const d = Math.hypot(t.x, t.z + 6), south = listS.includes(t);
      if (d > 105) { (south ? farS : far).push(t); continue; }
      const q = rnd();
      if ((t.edge < 2.3 && q < 0.13) || (south && q < 0.3)) { t.kind = 'birch'; const k = Math.floor(rnd() * 2), s = t.h * 0.55 / 10.5; birchI[k].push(M4(t.x, t.y + 0.1, t.z, 0, t.ry, 0, s, s, s)); continue; }
      if (q > 0.8) { t.kind = 'pine'; const k = Math.floor(rnd() * 2), s = t.h / 17; pineI[k].push(M4(t.x, t.y, t.z, 0, t.ry, 0, s, s, s)); continue; }
      t.kind = 'spruce'; const k = (t.edge < 1.6 && rnd() < 0.35) ? 3 : Math.floor(rnd() * 3), g = sprG[k], s = t.h / g.userData.H;
      sprI[k].push(M4(t.x, t.y + 0.15, t.z, rr(-0.02, 0.02), t.ry, rr(-0.02, 0.02), s, s, s));
    }
    sprG.forEach((g, k) => { if (sprI[k].length) mk(g, sprMat, sprI[k], true, false); });
    pines.forEach((g, k) => { if (pineI[k].length) { mk(g.needles, pineMat, pineI[k], true, false); mk(g.bark, pineBark, pineI[k], true, false); } });
    birches.forEach((g, k) => { if (birchI[k].length) { mk(g.leaves, birchLeaf, birchI[k], true, false); mk(g.trunk, birchBark, birchI[k], true, false); } });
    const sprT = []; for (const arr of sprI) for (const m of arr) { const e = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(e, q, sc); sprT.push(M4(e.x, e.y - 0.15, e.z, 0, 0, 0, 3.6 * sc.x, sc.y * 12.5, 3.6 * sc.x)); }
    mk(trunkGeo, MAT.bark, sprT, true, false);
    mk(needleGeo, needleMat, far.map(Mx)); mk(trunkGeo, MAT.bark, far.map((t) => M4(t.x, t.y, t.z, 0, t.ry, 0, t.w * 1.2, t.h, t.w * 1.2)), true, false);
    mk(needleGeo, needleMatS, farS.map(Mx)); mk(trunkGeo, MAT.bark, farS.map((t) => M4(t.x, t.y, t.z, 0, t.ry, 0, t.w * 1.2, t.h, t.w * 1.2)), true, false);
    trees.push(...list, ...listS);
    // бороды мха на ближних елях
    const beard = new Pack(); mossStrand(beard, 0, 0, 0, 1, 0.35, 0); mossStrand(beard, 0.1, -0.1, 0.05, 0.8, 0.3, 1.2);
    const beardGeo = mergeAll(beard), bm = [];
    for (const t of list) if (t.edge < 1.6 && t.kind === 'spruce') for (let k = 0; k < 4; k++) { const a = rr(0, 6.28), hh = rr(0.25, 0.8), rr0 = t.h * 0.2 * (1 - hh) * 0.75; bm.push(M4(t.x + Math.cos(a) * rr0, t.y + t.h * hh, t.z + Math.sin(a) * rr0, 0, a, 0, rr(1, 2), rr(1.2, 2.6), 1)); }
    mk(beardGeo, MAT.moss, bm, false, false);
    // лиственные кроны в обычном лесу на юге
    const crown = new THREE.IcosahedronGeometry(1, 1); { const p = crown.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.35 * Math.abs(Math.sin(i * 3.1)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); } crown.computeVertexNormals(); }
    const leafMat = paint({ base: '#58803e', stroke: [0, -1, 0.3], strokeAmt: 0.3, break: 0.4, rim: 1.0 }); leafMat.name = 'leafMat';
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
    for (const c of forest.children) c.userData.bake = 'tree';   // ели, сосны, берёзы, кроны — в Godot свой лес
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
      solids.push({ x, z, r: 0.4 }); bases.push([x, z, 0.04 * h]);
      if (rnd() < 0.35) perches.push({ x: x + 0.07 * h, y: groundAt(x, z) - 0.4 + h * 1.0, z, ry: rr(0, 6) });
      if (rnd() < 0.5) mossStrand(P, x + 0.03 * h * 0.6, groundAt(x, z) + h * rr(0.4, 0.8), z + 0.1, rr(1, 3), 0.4, rr(0, 6));
    }
    mk(deadGeo, MAT.bark, dead).userData.bakeKeep = true;
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
        for (let q = 0; q < 3; q++) { const px = tip.x + rr(-1, 1), py = tip.y + rr(-0.5, 0.5), pz = tip.z + rr(-1, 1); rr(0, 3); const ry = rr(0, 3), sx = rr(1.2, 2), sy = rr(0.8, 1.2), sz = rr(1.2, 2);   // те же вызовы rnd, что у прежнего комка
          P.add(MAT.leaf, WILLOW[q % 2], M4(px, py, pz, 0, ry, 0, sx * 0.75, sy, sz * 0.75)); }
        for (let q = 0; q < 5; q++) { const vp = s.clone().lerp(tip, rr(0.3, 1)); vine(P, vp, rr(2, 7), rr(0, 6), 0.2); }
        perches.push({ x: tip.x, y: tip.y + 0.2, z: tip.z, ry: rr(0, 6) });
      }
      solids.push({ x, z, r: 1.0 }); bases.push([x, z, 1.6]);
    }
  }
  scene.add(forest);

  // ---------- подлесок и берег: камыш с рогозом, папоротник, кусты, камни, коряги, пни, кувшинки, грибы ----------
  {
    // камыш
    const blade = new THREE.PlaneGeometry(0.05, 1, 1, 3); blade.translate(0, 0.5, 0);
    { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8) + y * y * 0.12); } }
    const reedMat = paint({ base: '#5d6e34', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.5, rim: 1.2, push: true }); reedMat.name = 'reedMat';
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
    // папоротник: 7 вай с перышками (veg.js)
    const fernGeo = vegFern(1), ferns = [];
    const fernAt = (x, z, s) => { const y = groundAt(x, z); if (y < WATER_Y + 0.02) return; ferns.push(M4(x, y, z, 0, rr(0, 6.28), 0, s, s * rr(0.8, 1.2), s)); };
    for (let k = 0; k < 2600; k++) { const a = rr(0, 6.28), r = rr(0.85, 2.2), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (!nearPath(x, z) && !kept(x, z, 3)) fernAt(x, z, rr(0.7, 1.6)); }
    for (const [ix, iz, ir] of ISLANDS) for (let k = 0; k < ir * 6; k++) { const a = rr(0, 6.28), r = rr(0.4, 1.0) * ir; fernAt(ix + Math.cos(a) * r, iz + Math.sin(a) * r, rr(0.6, 1.3)); }
    for (const [x, z] of plantSpots) if (rnd() < 0.5) fernAt(x + rr(-0.5, 0.5), z + rr(-0.5, 0.5), rr(0.7, 1.2));
    mk(fernGeo, Object.assign(paint({ base: '#ffffff', vcol: true, noFlip: true, moss: '#4e6e2c', mossAmt: 0.2, stroke: [0, 1, 0], strokeAmt: 0.3, side: THREE.DoubleSide, sway: 0.8, rim: 0.9, push: true }), { name: 'fern' }), ferns, false, false);
    // кусты
    // кусты слоями (veg.js): ядро, ветки, три оболочки веточек с листьями; два вида, у второго ягоды
    const bushes = [];
    for (let k = 0; k < 700; k++) { const a = rr(0, 6.28), r = rr(0.95, 2.4), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearPath(x, z) || kept(x, z, 5)) continue; const y = groundAt(x, z); if (y < 0) continue; const s = rr(0.6, 1.5); bushes.push(M4(x, y, z, 0, rr(0, 6), 0, s * rr(1, 1.6), s, s * rr(1, 1.6))); }
    { const bm = paint({ base: '#ffffff', vcol: true, noFlip: true, side: THREE.DoubleSide, sway: 0.5, stroke: [0, -1, 0.3], strokeAmt: 0.3, break: 0.4, rim: 0.9 }); bm.name = 'bm';
      mk(bushGeo(1), bm, bushes.filter((_, i) => i % 2 === 0), true, false); mk(bushGeo(2, true), bm, bushes.filter((_, i) => i % 2 === 1), true, false); }
    // камни
    const rock = new THREE.DodecahedronGeometry(1, 1); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.3 * Math.sin(i * 5.3); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); } rock.computeVertexNormals(); }
    const rocks = [];
    for (let k = 0; k < 260; k++) { const a = rr(0, 6.28), r = rr(0.6, 2.0), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearPath(x, z) || nearWalk(x, z, 1.5) || kept(x, z, 4)) continue; const s = rr(0.3, 1.4); rocks.push(M4(x, footY(x, z, s * 0.6, 'камень') - s * 0.2, z, rr(0, 1), rr(0, 6), rr(0, 1), s, s, s)); }
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
    for (let k = 0; k < 40; k++) { const a = rr(0, 6.28), r = rr(0.8, 1.8), x = BASIN.x + Math.cos(a) * BASIN.rx * r, z = BASIN.z + Math.sin(a) * BASIN.rz * r; if (nearWalk(x, z, 2) || nearPath(x, z) || kept(x, z, 4)) continue; const rad = rr(0.3, 0.7), y = footY(x, z, rad, 'пень'), h = rr(0.3, 1.2); P.add(MAT.bark, cylUV(new THREE.CylinderGeometry(rad * 0.85, rad * 1.2, h, 9), h, rad), M4(x, y + h / 2 - 0.1, z)); bases.push([x, z, rad * 1.1]); if (rnd() < 0.4) shrooms(P, PG, x, y + h - 0.05, z, 5, 0.9, MAT.shroom); }
    // грибы под сваями и у кромки воды
    for (let k = 0; k < 60; k++) { const sp = plantSpots[Math.floor(rnd() * plantSpots.length)]; if (!sp) break; const y = groundAt(sp[0], sp[1]); if (y < WATER_Y) continue; shrooms(P, PG, sp[0], y, sp[1], 4, 0.9, rnd() < 0.7 ? MAT.shroom : MAT.shroomG); if (k % 4 === 0) addLight(V(sp[0], y + 0.8, sp[1]), BLUE, 4.5, 0.1); }
    // кувшинки с цветами
    const pad = new THREE.CircleGeometry(0.32, 9, 0.3, 5.9); pad.rotateX(-Math.PI / 2);
    const padMat = paint({ base: '#4f6a2a', strokeAmt: 0.2, rim: 0.4, wet: 0.8, bob: true }); padMat.name = 'padMat';
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

  // ---------- грибы: мухоморы и боровики у оснований, по опушке, у тропы ----------
  {
    const dots = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#c8321e'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,120,60,0.35)'); gr.addColorStop(1, 'rgba(90,10,10,0.4)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4ead2'; for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * h * 0.8, r = 2 + rnd() * 5 * (1 - y / h); g.beginPath(); g.ellipse(x, y, r * 1.3, r, 0, 0, 6.28); g.fill(); }
    });
    const capG = new THREE.SphereGeometry(1, 14, 6, 0, 6.29, 0, Math.PI / 2); capG.scale(0.13, 0.085, 0.13); capG.translate(0, 0.2, 0);
    const stemG = new THREE.CylinderGeometry(0.03, 0.045, 0.22, 7); stemG.translate(0, 0.1, 0);
    const bcapG = new THREE.SphereGeometry(1, 12, 6, 0, 6.29, 0, Math.PI / 2); bcapG.scale(0.14, 0.09, 0.14); bcapG.translate(0, 0.15, 0);
    const bstemG = new THREE.CylinderGeometry(0.05, 0.075, 0.17, 8); bstemG.translate(0, 0.08, 0);
    const amCap = paint({ base: '#ffffff', map: dots, strokeAmt: 0.08, rim: 1.2, break: 0.2 }); amCap.name = 'amCap';
    const stemMat = paint({ base: '#e8dcc0', strokeAmt: 0.1, rim: 0.8 }); stemMat.name = 'stemMat';
    const boCap = paint({ base: '#6a3c1e', strokeAmt: 0.12, rim: 1.0, break: 0.25 }); boCap.name = 'boCap';
    const am = [], bo = [];
    const cluster = (x, z, n) => {
      const amanita = rnd() < 0.6;
      for (let k = 0; k < n; k++) {
        const px = x + rr(-0.5, 0.5), pz = z + rr(-0.5, 0.5), g = groundAt(px, pz);
        if (g < WATER_Y + 0.06 || nearWalk(px, pz, 1.05) || nearPath(px, pz) && Math.abs(px - pathX(pz)) < 1.6) continue;
        const sc = rr(0.7, 1.8) * (k ? 0.75 : 1); (amanita ? am : bo).push(M4(px, g - 0.02, pz, rr(-0.15, 0.15), rr(0, 6.28), rr(-0.15, 0.15), sc, sc, sc));
      }
    };
    for (const [x, z, r] of bases) if (r > 0.25 && rnd() < 0.22) { const a = rr(0, 6.28); cluster(x + Math.cos(a) * (r + 0.35), z + Math.sin(a) * (r + 0.35), 1 + Math.floor(rnd() * 4)); }
    for (let k = 0; k < 140; k++) { const a = rr(0, 6.28), e = rr(1.08, 1.9); cluster(BASIN.x + Math.cos(a) * BASIN.rx * e, BASIN.z + Math.sin(a) * BASIN.rz * e, 1 + Math.floor(rnd() * 4)); }
    for (let z = 36; z < 90; z += 2.2) for (const sd of [-1, 1]) if (rnd() < 0.45) cluster(pathX(z) + sd * rr(2.0, 4.5), z, 1 + Math.floor(rnd() * 3));
    for (const [ix, iz, ir] of ISLANDS) for (let k = 0; k < ir * 0.6; k++) { const a = rr(0, 6.28); cluster(ix + Math.cos(a) * ir * rr(0.3, 0.8), iz + Math.sin(a) * ir * rr(0.3, 0.8), 2); }
    mk(capG, amCap, am, true, true); mk(stemG, stemMat, am, false, false);
    mk(bcapG, boCap, bo, true, true); mk(bstemG, stemMat, bo, false, false);
  }

  // ---------- лесные атрибуты по краям: валуны во мху, муравейники, поленницы, голубцы, костяные обереги, выворотни ----------
  {
    const free = (x, z, r) => !nearPath(x, z) && !nearWalk(x, z, r + 1.5) && !kept(x, z, r + 2) && !solids.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + r + 0.4) && groundAt(x, z) > WATER_Y + 0.05;
    const ringPt = (e0, e1) => { const a = rr(0, 6.28), e = rr(e0, e1); return [BASIN.x + Math.cos(a) * BASIN.rx * e, BASIN.z + Math.sin(a) * BASIN.rz * e]; };
    // валуны с шапкой мха
    const rock = new THREE.DodecahedronGeometry(1, 1); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.82 + 0.25 * Math.sin(i * 4.7) * Math.sin(i * 1.3); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k); } rock.computeVertexNormals(); }
    const capM = new THREE.SphereGeometry(1, 10, 5, 0, 6.29, 0, Math.PI / 2);
    const bR = [], bC = [];
    for (let k = 0, n = 0; k < 400 && n < 26; k++) {
      const [x, z] = k < 200 ? ringPt(1.08, 1.6) : [pathX(rr(38, 80)) + (rnd() < 0.5 ? -1 : 1) * rr(4, 8), rr(38, 80)];
      const sc = rr(0.9, 2.4); if (!free(x, z, sc)) continue; n++;
      const y = footY(x, z, sc * 0.7, 'валун') - sc * 0.25, ry = rr(0, 6.28);
      bR.push(M4(x, y, z, rr(-0.2, 0.2), ry, rr(-0.2, 0.2), sc * rr(1, 1.4), sc, sc));
      bC.push(M4(x, y + sc * 0.5, z, rr(-0.15, 0.15), ry, 0, sc * 0.95, sc * 0.32, sc * 0.85));
      solids.push({ x, z, r: sc * 0.9 }); bases.push([x, z, sc * 1.1]);
      if (rnd() < 0.4) mossStrand(P, x + sc * 0.6, y + sc * 0.5, z, rr(0.4, 1.0), 0.4, ry);
    }
    mk(rock, MAT.stone, bR); mk(capM, paint({ base: '#47662a', moss: '#5f8030', mossAmt: 0.5, stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.4, rim: 0.8 }), bC, false, false);
    // муравейники: бугор из хвои
    const hill = new THREE.ConeGeometry(1, 1, 14, 3); { const p = hill.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.5, k = 1 + 0.1 * Math.sin(i * 7.1); p.setXYZ(i, p.getX(i) * k * (1 - 0.35 * y * y), p.getY(i) * (0.9 + 0.1 * Math.cos(i)), p.getZ(i) * k * (1 - 0.35 * y * y)); } hill.translate(0, 0.5, 0); hill.computeVertexNormals(); }
    const hm = [];
    for (let k = 0, n = 0; k < 200 && n < 9; k++) { const [x, z] = ringPt(1.15, 1.7); const s0 = rr(0.6, 1.1); if (!free(x, z, s0)) continue; n++; hm.push(M4(x, footY(x, z, s0 * 0.8, 'муравейник') - 0.05, z, 0, rr(0, 6), 0, s0, s0 * rr(0.8, 1.1), s0)); solids.push({ x, z, r: s0 * 0.8 }); }
    mk(hill, paint({ base: '#6a4a2a', stroke: [0, 1, 0], strokeAmt: 0.4, break: 0.45, rim: 0.7 }), hm);
    // поленницы между кольями
    for (let k = 0, n = 0; k < 200 && n < 5; k++) {
      const [x, z] = k % 2 ? ringPt(1.1, 1.4) : [pathX(rr(40, 64)) + (rnd() < 0.5 ? -1 : 1) * rr(3.6, 5), rr(40, 64)];
      if (!free(x, z, 1.6)) continue; n++;
      const ry = Math.atan2(-(x - BASIN.x), -(z - BASIN.z)) + Math.PI / 2, c = Math.cos(ry), s = Math.sin(ry), y = footY(x, z, 1.2, 'поленница');
      const len = rr(1.8, 2.6);
      for (const sd of [-1, 1]) beam(P, MAT.woodDark, V(x + sd * len / 2 * c, y - 0.2, z - sd * len / 2 * s), V(x + sd * len / 2 * c, y + 1.25, z - sd * len / 2 * s), 0.05, 5);
      for (let row = 0; row < 5; row++) for (let i = 0; i < Math.round(len / 0.2); i++) {
        if (row === 4 && rnd() < 0.4) continue;
        const lx = -len / 2 + 0.1 + i * 0.2 + (row % 2) * 0.1; if (lx > len / 2 - 0.08) continue;
        const px = x + lx * c, pz = z - lx * s, py = y + 0.1 + row * 0.19;
        P.add(MAT.log, cylUV(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 7), 0.6, 0.09), M4(px, py, pz, Math.PI / 2, ry, 0));
      }
      box(P, MAT.roof, len + 0.4, 0.06, 0.95, M4(x, y + 1.32, z, 0.1, ry, 0));
      solids.push({ x, z, r: len / 2 });
    }
    // голубцы у тропы: столб с двускатной кровелькой, внутри огонёк, вышитое полотенце
    for (const [z0, sd] of [[44, -1], [52, 1], [70, -1], [79, 1]]) {
      const x = pathX(z0) + sd * 3.4, z = z0, y = groundAt(x, z), ry = sd > 0 ? -Math.PI / 2 : Math.PI / 2;
      if (kept(x, z, 4)) continue;
      beam(P, MAT.woodDark, V(x, y - 0.3, z), V(x, y + 1.55, z), 0.1, 6);
      box(P, MAT.wood, 0.5, 0.45, 0.32, M4(x, y + 1.75, z, 0, ry, 0));
      for (const q of [-1, 1]) box(P, MAT.roof, 0.72, 0.045, 0.4, M4(x, y + 2.08, z + q * 0.15, q * 0.62, 0, 0));
      beam(P, MAT.woodDark, V(x - 0.38, y + 2.2, z), V(x + 0.38, y + 2.2, z), 0.03, 5);
      PG.add(MAT.candle, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), M4(x - sd * 0.17, y + 1.6, z));
      halos.push({ p: V(x - sd * 0.2, y + 1.72, z), col: [1.0, 0.7, 0.3], s: 0.5 });
      addLight(V(x - sd * 0.5, y + 1.8, z), ORANGE, 3.5, 0.6);
      banner(P, x - sd * 0.06, y + 1.5, z, 0.14, 0.8, ry);
      solids.push({ x, z, r: 0.3 }); bases.push([x, z, 0.3]);
    }
    // костяные обереги: кривой шест с перекладиной, на верёвках кости и черепки, стучат на ветру
    for (let k = 0, n = 0; k < 200 && n < 7; k++) {
      const [x, z] = k % 2 ? [pathX(rr(36, 50)) + (rnd() < 0.5 ? -1 : 1) * rr(2.6, 3.4), rr(36, 50)] : ringPt(1.05, 1.25);
      if (!free(x, z, 0.6)) continue; n++;
      const y = groundAt(x, z), ry = rr(0, 6.28), c = Math.cos(ry), s = Math.sin(ry);
      tube(P, MAT.bark, [V(x, y - 0.3, z), V(x + 0.08, y + 1.4, z + 0.05), V(x - 0.05, y + 2.6, z)], 0.06, 5, 6);
      const A = V(x - 0.7 * c, y + 2.4, z + 0.7 * s), B = V(x + 0.7 * c, y + 2.5, z - 0.7 * s);
      beam(P, MAT.bark, A, B, 0.04, 5); lashing(P, x, y + 2.45, z, 0.06);
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5, top = A.clone().lerp(B, t), l = rr(0.4, 0.9);
        beam(P, MAT.rope, top, top.clone().add(V(0, -l, 0)), 0.008, 3);
        if (i === 2) skull(P, top.x, top.y - l - 0.1, top.z, 0.35, ry, false); else beam(P, MAT.bone, top.clone().add(V(0, -l, 0)), top.clone().add(V(rr(-0.05, 0.05), -l - rr(0.2, 0.35), rr(-0.05, 0.05))), 0.022, 4);
      }
      solids.push({ x, z, r: 0.25 }); bases.push([x, z, 0.25]);
    }
    // выворотни: упавшее дерево и вздыбленный пласт земли с корнями
    for (let k = 0, n = 0; k < 300 && n < 7; k++) {
      const [x, z] = ringPt(1.12, 1.75); const ra = rr(0, 6.28), L = rr(8, 13), c = Math.cos(ra), s = Math.sin(ra);
      if (!free(x, z, 2) || !free(x + c * L * 0.6, z + s * L * 0.6, 1)) continue; n++;
      const y = groundAt(x, z), y2 = groundAt(x + c * L, z + s * L);
      const A = V(x + c * 0.6, y + 0.55, z + s * 0.6), B = V(x + c * L, y2 + 0.3, z + s * L);
      tube(P, MAT.bark, [A, A.clone().lerp(B, 0.5).add(V(0, 0.1, 0)), B], 0.42, 8, 8);
      for (let j = 0; j < 4; j++) { const q = A.clone().lerp(B, rr(0.4, 0.95)); beam(P, MAT.bark, q, q.clone().add(V(rr(-1.5, 1.5), rr(0.4, 1.6), rr(-1.5, 1.5))), 0.07, 5); }
      // пласт: сплюснутый диск поперёк ствола, рваный край, корни торчат
      const disk = new THREE.CylinderGeometry(1.6, 1.4, 0.45, 12, 1); { const p = disk.attributes.position; for (let i = 0; i < p.count; i++) { const kk = 0.8 + 0.3 * Math.abs(Math.sin(i * 2.9)); p.setX(i, p.getX(i) * kk); p.setZ(i, p.getZ(i) * kk); } disk.computeVertexNormals(); }
      P.add(MAT.dark, disk, M4(x, y + 1.25, z, Math.PI / 2, -ra + Math.PI / 2, 0));
      for (let j = 0; j < 12; j++) { const a2 = rr(0, 6.28), r0 = rr(0.3, 1.4); const o = V(x - s * Math.cos(a2) * r0, y + 1.25 + Math.sin(a2) * r0, z + c * Math.cos(a2) * r0); beam(P, MAT.bark, o, o.clone().add(V(-c * rr(0.3, 1.1) - s * Math.cos(a2) * 0.5, Math.sin(a2) * 0.5, -s * rr(0.3, 1.1) + c * Math.cos(a2) * 0.5)), rr(0.025, 0.06), 4); }
      P.add(MAT.moss, MOSS_LITE, M4(x, y - 0.05, z, 0, ra, 0, 1.6, 0.3, 1.2));
      for (let j = 0; j < 3; j++) { const q = A.clone().lerp(B, rr(0.2, 0.9)); mossStrand(P, q.x, q.y - 0.35, q.z, rr(0.3, 0.8), 0.35, ra); }
      if (rnd() < 0.7) { const q = A.clone().lerp(B, rr(0.3, 0.7)); shrooms(P, PG, q.x, q.y + 0.38, q.z, 6, 1.1, rnd() < 0.5 ? MAT.shroom : MAT.shroomG); }
      for (let t = 0.1; t < 1; t += 0.2) { const q = A.clone().lerp(B, t); solids.push({ x: q.x, z: q.z, r: 0.55 }); }
      solids.push({ x, z, r: 1.3 }); bases.push([x, z, 1.4]);
      perches.push({ x: B.x, y: B.y + 0.42, z: B.z, ry: ra });
    }
  }

  // ---------- мох и трава у оснований и по берегу: убирают резкий вход в землю ----------
  {
    const mound = mossGeo(1), mound2 = mossGeo(2);   // подушки с бугорками и стебельками (veg.js)
    const tuft = new THREE.BufferGeometry(); {
      const pos = [], idx = [];
      for (let b = 0; b < 9; b++) { const a = b / 9 * 6.28 + b, l = 0.6 + 0.4 * Math.abs(Math.sin(b * 3.3)), lean = 0.25 + 0.2 * Math.sin(b * 1.9), q = pos.length / 3;
        for (let i = 0; i <= 3; i++) { const t = i / 3, w = 0.035 * (1 - t), r = lean * t * t * l; const cx = Math.cos(a) * r, cz = Math.sin(a) * r, y = t * l * 0.55; pos.push(cx - Math.sin(a) * w, y, cz + Math.cos(a) * w, cx + Math.sin(a) * w, y, cz - Math.cos(a) * w); }
        for (let i = 0; i < 3; i++) { const o = q + i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
      tuft.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tuft.setIndex(idx); tuft.computeVertexNormals();
    }
    const mossMat = paint({ vcol: true, base: '#47662a', moss: '#5f8030', mossAmt: 0.5, stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.4, rim: 0.8 }); mossMat.name = 'mossMat';
    const mossMat2 = paint({ vcol: true, base: '#355a30', moss: '#4c7a3a', mossAmt: 0.4, stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.4, rim: 0.8 }); mossMat2.name = 'mossMat2';
    const grassMat = paint({ base: '#5f7834', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.6, rim: 1.1, push: true }); grassMat.name = 'grassMat';
    const mm = [], mm2 = [], tm = [];
    const onWalk = (x, z) => walks.some((w) => !w.ramp && w.y < 1 && segDist(x, z, w) < w.w / 2 + 0.1);
    const skirt = (x, z, r, n) => {
      for (let k = 0; k < n; k++) {
        const a = rr(0, 6.28), d = r * rr(0.7, 1.05) + rr(0, 0.6) * Math.max(0.5, r * 0.4), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
        if (onWalk(px, pz)) continue;
        const g = groundAt(px, pz); if (g < WATER_Y - 0.35) continue;       // в глубокой воде — только у самой сваи
        const y = Math.max(g, WATER_Y + 0.01), s = rr(0.18, 0.4) * Math.min(2.2, 0.7 + r * 0.6);
        (rnd() < 0.6 ? mm : mm2).push(M4(px, y - s * 0.25, pz, 0, a, 0, s * rr(1.2, 1.9), s * rr(0.28, 0.5), s * rr(1.0, 1.5)));   // ниже и площе: мох стелется
        if (g > WATER_Y - 0.05 && rnd() < 0.7) { const ts = rr(0.6, 1.3); tm.push(M4(px + rr(-0.2, 0.2), y, pz + rr(-0.2, 0.2), rr(-0.1, 0.1), rr(0, 6.28), rr(-0.1, 0.1), ts, ts * rr(0.8, 1.4), ts)); }
      }
    };
    for (const [x, z, r] of bases) skirt(x, z, r, Math.round(4 + Math.min(r, 2.5) * 6));
    // кромка болота и островов
    for (let k = 0; k < 9000; k++) {
      const a = rr(0, 6.28), e = Math.sqrt(rr(0.0, 1.45)), x = BASIN.x + Math.cos(a) * BASIN.rx * e, z = BASIN.z + Math.sin(a) * BASIN.rz * e;
      const g = groundAt(x, z); if (g < WATER_Y - 0.08 || g > WATER_Y + 0.22 || kept(x, z, 1.2) || onWalk(x, z)) continue;
      const s = rr(0.3, 0.75), y = Math.max(g, WATER_Y + 0.01);
      (rnd() < 0.5 ? mm : mm2).push(M4(x, y - s * 0.2, z, 0, rr(0, 6.28), 0, s * rr(1.3, 2.4), s * rr(0.22, 0.4), s * rr(1.0, 1.6)));
      if (rnd() < 0.8) for (let q = 0; q < 2; q++) { const ts = rr(0.7, 1.4); tm.push(M4(x + rr(-0.5, 0.5), y, z + rr(-0.5, 0.5), 0, rr(0, 6.28), 0, ts, ts * rr(0.8, 1.5), ts)); }
    }
    const mkI = (g, m, arr, cast) => { if (!arr.length) return; const im = new THREE.InstancedMesh(g, m, arr.length); arr.forEach((x, i) => im.setMatrixAt(i, x)); im.receiveShadow = true; im.castShadow = cast; scene.add(im); };
    mkI(mound, mossMat, mm, false); mkI(mound2, mossMat2, mm2, false); mkI(tuft, grassMat, tm, false);
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
    // объёмный дым клубами (как в деревне): из дымников и от костра
    {
      const src = [];
      anim.smoke.forEach((q, i) => { if (i % 4 === 0) src.push([q.x, q.y - 0.6, q.z, 8, 0.55, 0]); });
      src.push([FIRE.x, groundAt(FIRE.x, FIRE.z) + 1.0, FIRE.z, 6, 0.36, 1]);
      // тонкая струйка дыма над каждым факелом
      for (const f of anim.flames) if (f.userData.s < 0.8) src.push([f.position.x, f.position.y + 0.5, f.position.z, 2.2, 0.08, 1, 5]);
      const N = 22, A = [], Pp = [], Tt = [];
      for (const [x, y, z, h, sz, warm, cnt] of src) for (let k = 0, nn = cnt || (warm ? 13 : N); k < nn; k++) { A.push(x, y, z, h * rr(0.8, 1.15)); Pp.push(k / nn + rr(-0.03, 0.03), 1 / rr(7, 10), sz * rr(0.6, 1.35), rnd()); Tt.push(warm); }
      const g = new THREE.IcosahedronGeometry(1, 2);
      const im = new THREE.InstancedMesh(g, puffMat(), A.length / 4);
      im.geometry = g.clone();
      im.geometry.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4));
      im.geometry.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 4));
      im.geometry.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(Tt), 1));
      im.frustumCulled = false; scene.add(im); anim.puffs = im;
    }
    const bg = new THREE.CylinderGeometry(2.2, 6.5, 80, 18, 1, true); bg.translate(0, 40, 0);
    const bm = new THREE.Mesh(bg, beamMat('#6fe8a0', { a: 0.035 })); bm.position.set(T.x + 4, base + 6, T.z - 8); bm.rotation.z = -0.1; bm.renderOrder = 3;
    scene.add(bm); anim.beam = bm;
  }

  // ---------- световые столбы: сквозь ветви дуба сверху и из окон ----------
  {
    const sd = new THREE.Vector3(0.25, 0.85, -0.45).normalize();          // солнце в логове (как в main.js)
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, sd);
    const hits = [[-0.6, 11], [0.6, 14], [1.4, 12], [2.4, 16], [-1.7, 13], [3.1, 11], [-2.6, 17]];
    hits.forEach(([a, r], i) => {
      const hx = TREE.x + Math.cos(a) * r, hz = TREE.z + Math.sin(a) * r, hy = WATER_Y;
      const len = 40, rad = rr(0.25, 0.6);
      const g = new THREE.CylinderGeometry(rad * 0.6, rad * 1.3, len, 14, 1, true); g.translate(0, len / 2, 0);
      const m = new THREE.Mesh(g, shaftMat(i % 3 ? '#9dffb0' : '#d8ffb0', { a: rr(0.03, 0.05), seed: i * 3.7, flow: 0.05 }));
      m.position.set(hx, hy, hz); m.quaternion.copy(q); m.renderOrder = 3; scene.add(m);
    });
    // из окон: усечённая пирамида от проёма наружу и чуть вниз
    const mats = new Map();
    for (const sh of shafts) {
      const d = sh.d.clone().normalize(), side = new THREE.Vector3(-d.z, 0, d.x).normalize(), upv = new THREE.Vector3().crossVectors(side, d).normalize();
      const e = 2.0, pos = [], uv = [], idx = [];
      const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const P0 = cs.map(([a, b]) => sh.p.clone().addScaledVector(side, a * sh.w / 2).addScaledVector(upv, b * sh.h / 2));
      const P1 = cs.map(([a, b]) => sh.p.clone().addScaledVector(d, sh.len).addScaledVector(side, a * sh.w * e / 2).addScaledVector(upv, b * sh.h * e / 2));
      for (let k = 0; k < 4; k++) {
        const o = pos.length / 3, k2 = (k + 1) % 4;
        for (const v of [P0[k], P0[k2], P1[k2], P1[k]]) pos.push(v.x, v.y, v.z);
        uv.push(0, 0.55, 1, 0.55, 1, 0, 0, 0); idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const key = sh.col.join() + sh.a;
      if (!mats.has(key)) mats.set(key, { m: shaftMat(new THREE.Color(...sh.col), { a: sh.a * 0.45, seed: mats.size, flow: 0.02, side: true }), list: [] });
      mats.get(key).list.push(g);
    }
    for (const { m, list } of mats.values()) { const mesh = new THREE.Mesh(mergeGeometries(list, false), m); mesh.renderOrder = 3; scene.add(mesh); }
  }

  // ---------- ореолы у фонарей, факелов, костра ----------
  {
    for (const f of anim.flames) halos.push({ p: f.position.clone().add(V(0, 0.3, 0)), col: [1.0, 0.5, 0.18], s: 0.7 });
    // искры и угольки от каждого огня
    { const A = [], Pp = [];
      for (const f of anim.flames) { const s = f.userData.s || 0.5; for (let k = 0, n = Math.round(3 + s * 12); k < n; k++) { A.push(f.position.x + rr(-0.1, 0.1) * s, f.position.y + 0.15 * s, f.position.z + rr(-0.1, 0.1) * s, s); Pp.push(rnd(), 1 / rr(1.2, 2.6), rnd(), rnd()); } }
      const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
      g.index = q.index; g.setAttribute('position', q.attributes.position);
      g.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 4));
      g.instanceCount = A.length / 4; const m = new THREE.Mesh(g, emberMat()); m.frustumCulled = false; m.renderOrder = 4; scene.add(m); }
    // капель с кровель: до земли или до воды
    { const A = [], Pp = [];
      for (const d of drips) { const fl = Math.max(groundAt(d.x, d.z), WATER_Y); A.push(d.x, d.y, d.z, fl); Pp.push(rnd(), rr(1.6, 4.5)); }
      const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
      g.index = q.index; g.setAttribute('position', q.attributes.position);
      g.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 2));
      g.instanceCount = A.length / 4; const m = new THREE.Mesh(g, dripMat()); m.frustumCulled = false; m.renderOrder = 4; scene.add(m); }
    // цветы: ромашки, лютики, иван-чай и колокольчики на опушке и у тропы; гнутся вместе с травой
    { const stem = new THREE.CylinderGeometry(0.006, 0.01, 0.34, 3, 2); stem.translate(0, 0.17, 0);
      const head = new THREE.IcosahedronGeometry(0.045, 0); head.scale(1, 0.55, 1); head.translate(0, 0.35, 0);
      const stemMat = paint({ base: '#4f6a2c', strokeAmt: 0.1, rim: 0.6, sway: 1.4, push: true }); stemMat.name = 'stemMat';
      const cols = ['#e8e4d0', '#e0c040', '#b4609a', '#7a7ac8'], heads = cols.map(() => []), stems = [];
      for (let k = 0; k < 2600 && stems.length < 900; k++) {
        const a = rr(0, 6.28), e = rr(0.96, 1.9), x = BASIN.x + Math.cos(a) * BASIN.rx * e, z = BASIN.z + Math.sin(a) * BASIN.rz * e;
        const y = groundAt(x, z); if (y < WATER_Y + 0.08 || kept(x, z, 1.5) || nearWalk(x, z, 1.2)) continue;
        if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 0.3)) continue;
        const south = z > 30, ci = south ? Math.floor(rnd() * 4) : (rnd() < 0.6 ? 0 : 3);
        if (!south && rnd() < 0.5) continue;
        const sc = rr(0.7, 1.4), m = M4(x, y, z, rr(-0.1, 0.1), rr(0, 6.28), rr(-0.1, 0.1), sc, sc, sc);
        stems.push(m); heads[ci].push(m);
        if (rnd() < 0.6) { const m2 = M4(x + rr(-0.15, 0.15), y, z + rr(-0.15, 0.15), rr(-0.15, 0.15), rr(0, 6.28), 0, sc * 0.8, sc * 0.8, sc * 0.8); stems.push(m2); heads[ci].push(m2); }
      }
      mk(stem, stemMat, stems, false, false);
      cols.forEach((c, i) => { if (heads[i].length) mk(head, paint({ base: c, strokeAmt: 0.1, rim: 1.0, sway: 1.4, push: true, emit: [0.01, 0.01, 0.01] }), heads[i], false, false); });
    }
    // дальний лес слоями в тумане: три кольца-кулисы
    { const sil = canvasTex(2048, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
        for (let x = 0; x < w; x += 3 + Math.random() * 7) { const th = h * (0.35 + Math.random() * 0.5), bw = 6 + Math.random() * 12; g.beginPath(); g.moveTo(x - bw, h); g.lineTo(x, h - th); g.lineTo(x + bw, h); g.fill();
          for (let t = 0; t < 6; t++) { const yy = h - th + t * th / 7, ww = bw * (0.3 + t * 0.12); g.beginPath(); g.moveTo(x - ww, yy + th / 7); g.lineTo(x, yy); g.lineTo(x + ww, yy + th / 7); g.fill(); } }
        g.fillRect(0, h * 0.85, w, h * 0.15); }, false);
      sil.wrapS = THREE.RepeatWrapping;
      [[192, 34, 0], [245, 48, 1], [310, 66, 2]].forEach(([r, h, L], i) => {
        const cg = new THREE.CylinderGeometry(r, r, h, 96, 1, true); cg.translate(0, h / 2 - 3, 0);
        const uv = cg.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setX(j, uv.getX(j) * (5 + i * 2) + i * 0.37);
        const t2 = sil.clone(); t2.needsUpdate = true; t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(1, 1);
        const m = new THREE.Mesh(cg, backdropMat(t2, L)); m.position.set(0, 0, -6); m.renderOrder = -1 - i; m.frustumCulled = false; m.userData.bake = 'skip'; scene.add(m);
      }); }
    halos.push({ p: V(FIRE.x, groundAt(FIRE.x, FIRE.z) + 1.0, FIRE.z), col: [1.0, 0.5, 0.15], s: 1.8 });
    const g = new THREE.InstancedBufferGeometry(); const pl = new THREE.PlaneGeometry(1, 1);
    g.index = pl.index; g.setAttribute('position', pl.attributes.position);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => [h.p.x, h.p.y, h.p.z])), 3));
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => h.col)), 3));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => [h.s, rnd() * 3])), 2));
    g.instanceCount = halos.length;
    const m = new THREE.Mesh(g, haloMat()); m.frustumCulled = false; m.renderOrder = 4; scene.add(m);
  }

  // ---------- паутина ----------
  {
    // ещё паутина: между сучьями сухостоя и у кольев входа
    for (const pe of perches) if (rnd() < 0.08 && pe.y < 16) webs.push({ o: V(pe.x, pe.y - 0.1, pe.z), u: V(Math.cos(pe.ry), 0, Math.sin(pe.ry)), v: V(0, -1, 0), r: rr(0.5, 1.0) });
    const pos = [];
    const P3 = (o, u, v, t, r) => o.clone().addScaledVector(u, Math.cos(t) * r).addScaledVector(v, Math.sin(t) * r);
    for (const w of webs) {
      const u = w.u.clone().normalize(), v = w.v.clone().normalize(), ns = 7, rings = 7;
      const ends = [];
      for (let k = 0; k <= ns; k++) { const t = k / ns * Math.PI / 2, rk = w.r * rr(0.85, 1.05); const e = P3(w.o, u, v, t, rk); ends.push(rk); pos.push(w.o.x, w.o.y, w.o.z, e.x, e.y, e.z); }
      for (let j = 1; j <= rings; j++) for (let k = 0; k < ns; k++) {
        if (rnd() < 0.08) continue;                             // рваная
        const f = j / (rings + 0.6), t0 = k / ns * Math.PI / 2, t1 = (k + 1) / ns * Math.PI / 2;
        const a = P3(w.o, u, v, t0, ends[k] * f), b = P3(w.o, u, v, t1, ends[k + 1] * f);
        const m = a.clone().lerp(b, 0.5).lerp(w.o, 0.06);
        pos.push(a.x, a.y, a.z, m.x, m.y, m.z, m.x, m.y, m.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const ls = new THREE.LineSegments(g, webMat()); ls.renderOrder = 4; ls.frustumCulled = false; scene.add(ls);
  }

  // ---------- листья (дуб, плющ) ----------
  {
    // резной дубовый лист
    const sh = new THREE.Shape(); sh.moveTo(0, 0);
    const L = [[0.05, 0.08], [0.14, 0.14], [0.1, 0.22], [0.17, 0.3], [0.11, 0.38], [0.15, 0.46], [0.07, 0.52], [0.0, 0.58]];
    for (const [x, y] of L) sh.lineTo(x * 0.9, y * 0.9); for (let i = L.length - 2; i >= 0; i--) sh.lineTo(-L[i][0] * 0.9, L[i][1] * 0.9); sh.lineTo(0, 0);
    const lg = new THREE.ShapeGeometry(sh); lg.translate(0, -0.05, 0);
    const oakLeaf = paint({ base: '#2c4620', moss: '#40602a', mossAmt: 0.3, strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.0, rim: 0.45, break: 0.35 }); oakLeaf.name = 'oakLeaf';
    const oakLeaf2 = paint({ base: '#5a4e22', strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.0, rim: 0.45, break: 0.35 }); oakLeaf2.name = 'oakLeaf2';
    const ivy = paint({ base: '#24391c', moss: '#34502a', mossAmt: 0.3, strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 0.4, rim: 0.6, break: 0.35 }); ivy.name = 'ivy';
    for (const [arr, m] of [[leafM, oakLeaf], [leafM2, oakLeaf2], [leafM3, ivy]]) { if (!arr.length) continue; const im = new THREE.InstancedMesh(lg, m, arr.length); arr.forEach((x, i) => im.setMatrixAt(i, x)); im.receiveShadow = true; im.castShadow = true; scene.add(im); }
  }

  // ---------- сборка ----------
  scene.add(P.build(true, true));
  scene.add(PG.build(false, false));
  // проверка опоры (R8): ни один предмет не висит (низ ниже или на уровне самой низкой точки под ним), не тонет глубже 0,8 м верхним краем
  if (typeof window !== 'undefined') window.__lairPropAudit = { n: propLog.length, buried: propLog.filter((q) => q.top - q.y > 0.8).map((q) => q.name + '@' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ' ' + (q.top - q.y).toFixed(2)) };
  return { solids, lights, walks, anim, trees, mists, perches, lilyPads, lamps, webs, waterMesh, TREE, FIRE, pathX, groundAt, base, rT, doorA, boils, houses: [hall, ...H] };
}

// пламя: языки-конусы колышутся и мерцают
function makeFlame(scene, pos, s) {
  // огонь: два листа языков к камере (большой и малый со сдвигом) + угли у основания; искры собираются в общий поток
  const g = new THREE.Group(); g.position.copy(pos);
  const geo = new THREE.PlaneGeometry(1, 1, 1, 6); geo.translate(0, 0.5, 0);
  const seed = pos.x * 1.7 + pos.z;
  const a = new THREE.Mesh(geo, flameMat(seed, 1.5)); a.scale.set(0.42 * s, 1.25 * s, 1); a.position.y = -0.12 * s; g.add(a);
  const b = new THREE.Mesh(geo, flameMat(seed + 5.3, 1.25)); b.scale.set(0.3 * s, 0.85 * s, 1); b.position.set(0.06 * s, -0.1 * s, 0.04 * s); g.add(b);
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 7, 4, 0, 6.29, 0, 1.6), glow('#ff5a14', { k: 1.4, flick: 1, seed }));
  ember.scale.y = 0.45; ember.position.y = -0.08 * s; g.add(ember);
  g.userData.s = s; scene.add(g);
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
