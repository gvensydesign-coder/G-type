// Растительность: данные PLANTS из godot-export/scripts/world/vegetation.gd (имя, зоны, плотность, размер, описание),
// упрощённый авто-расклад по зонам (в игре — кисть и скаттер), геометрия видов для 3D.
import * as THREE from 'three';
import { G, rng, clamp, lerp, smooth, fbm, hash2, col } from './kit.js';
import { heightAt, zoneAt, forestEdge, slopeAt, WATER_Y, HALF, ruin, hill, village, roadDist } from './terrain.js';
import { plantMat } from './core.js';

// color/shape/prefer — только для схемы превью
export const PLANTS = {
  grass:     { name: 'Трава', zones: ['ground', 'slope', 'shore', 'border'], dens: 2.2, max: 42000, s: [0.45, 0.85], cast: false, sway: 0.16, desc: 'Кустики травы: тёмный низ, светлые кончики, сухие травинки', color: '#9be15d', shape: 'dot', prefer: 'везде на земле, реже на склонах' },
  meadow:    { name: 'Разнотравье', zones: ['ground', 'slope', 'border'], dens: 1.2, max: 14000, s: [0.5, 0.95], cast: false, sway: 0.18, desc: 'Трава с цветами: ромашки, васильки, лютики, клевер', color: '#f2d45c', shape: 'star', prefer: 'цветочными полянами на открытой земле' },
  reeds:     { name: 'Камыш', zones: ['shore', 'shallow', 'water', 'ground'], dens: 1.6, max: 7000, s: [1.4, 2.3], cast: false, sway: 0.1, desc: 'Камыш и рогоз у воды, бурые початки', color: '#3fd1b4', shape: 'plus', prefer: 'вдоль берега и в мелководье' },
  fireweed:  { name: 'Иван-чай', zones: ['ground', 'slope', 'border'], dens: 0.7, max: 5000, s: [1.0, 1.6], cast: false, sway: 0.12, desc: 'Высокие розовые свечи на гарях и у заброшенных изб', color: '#ff6fb5', shape: 'tri', prefer: 'у заброшенной избы и на пустошах' },
  fern:      { name: 'Папоротник', zones: ['ground', 'slope', 'border'], dens: 0.6, max: 9000, s: [0.6, 1.25], cast: true, sway: 0.12, desc: 'Розетка резных вай, светлые кончики', color: '#58c76b', shape: 'x', prefer: 'под деревьями, у опушки' },
  moss:      { name: 'Мох', zones: ['ground', 'slope', 'shore', 'border'], dens: 0.8, max: 7000, s: [0.4, 1.3], cast: false, sway: 0, desc: 'Моховые подушки с искрами спор', color: '#b4e06a', shape: 'ring', prefer: 'в тени леса и на камнях' },
  mushroom:  { name: 'Грибы', zones: ['ground', 'slope', 'border'], dens: 0.9, max: 4000, s: [0.6, 1.5], cast: true, sway: 0, cluster: 4, desc: 'Мухоморы, боровики, лисички, бледные поганки — гнёздами', color: '#ff5a4a', shape: 'dia', prefer: 'гнёздами у опушки' },
  bush:      { name: 'Черничник', zones: ['ground', 'slope', 'border'], dens: 0.5, max: 5000, s: [0.6, 1.2], cast: true, sway: 0.05, desc: 'Низкие кусты с ягодой', color: '#7a8cff', shape: 'sq', prefer: 'у опушки' },
  shrub:     { name: 'Кустарник', zones: ['ground', 'slope', 'shore', 'border'], dens: 0.18, max: 2500, s: [1.4, 2.4], cast: true, sway: 0.04, desc: 'Подрост: бузина, крушина, ольха — густые кусты у старых срубов и руин', color: '#2fa36a', shape: 'sq', prefer: 'у руин и опушки' },
  stones:    { name: 'Камни', zones: ['ground', 'slope', 'shore', 'border', 'shallow'], dens: 0.35, max: 4000, s: [0.15, 0.7], cast: true, sway: 0, desc: 'Валуны и галька, мох на макушке', color: '#c9ced3', shape: 'dot', prefer: 'на склонах и берегу', look: 0 },
  cobble:    { name: 'Булыжники', zones: ['ground', 'slope', 'shore', 'border', 'shallow'], dens: 0.12, max: 3000, s: [0.5, 1.1], cast: true, sway: 0, desc: 'Россыпь окатанных булыжников разного размера', color: '#e5e9ee', shape: 'ring', prefer: 'у воды', look: 1 },
  boulder:   { name: 'Валуны', zones: ['ground', 'slope', 'shore', 'border', 'shallow'], dens: 0.05, max: 1500, s: [0.9, 2.0], cast: true, sway: 0, desc: 'Крупные гранёные валуны с трещинами и слоями породы', color: '#ffffff', shape: 'sq', prefer: 'на склонах', look: 2 },
  crag:      { name: 'Скалы-плиты', zones: ['ground', 'slope', 'border'], dens: 0.03, max: 800, s: [1.2, 2.4], cast: true, sway: 0, desc: 'Косые каменные плиты и обломки скалы', color: '#aab4c4', shape: 'tri', prefer: 'на холме', look: 3 },
  giant:     { name: 'Глыбы-гиганты', zones: ['ground', 'slope', 'border'], dens: 0.01, max: 200, s: [3.0, 5.5], cast: true, sway: 0, desc: 'Гигантские уступчатые глыбы, как выходы скал', color: '#8896ad', shape: 'dia', prefer: 'на вершине холма', look: 4 },
  runestone: { name: 'Рунные камни', zones: ['ground', 'slope', 'border'], dens: 0.015, max: 400, s: [1.3, 2.3], cast: true, sway: 0, desc: 'Стоячие камни с вырезанными рунами, ночью светятся', color: '#6fe7ff', shape: 'star', prefer: 'на холме и у руин', look: 5 },
  deadgrass: { name: 'Пожухлая трава', zones: ['ground', 'slope', 'shore', 'border'], dens: 2.0, max: 20000, s: [0.4, 0.8], cast: false, sway: 0.12, desc: 'Сухая серо-бурая трава с обломанными стеблями', color: '#c8b27a', shape: 'dot', prefer: 'пятнами у руин' },
  belena:    { name: 'Белена', zones: ['ground', 'slope', 'border'], dens: 0.9, max: 6000, s: [0.55, 0.95], cast: false, sway: 0.12, desc: 'Ядовитая: сизые листья, грязно-жёлтые цветы с лиловым зевом', color: '#d8d46a', shape: 'x', prefer: 'у жилья и руин' },
  hemlock:   { name: 'Болиголов', zones: ['ground', 'slope', 'shore', 'border'], dens: 0.6, max: 5000, s: [1.0, 1.7], cast: false, sway: 0.1, desc: 'Ядовитый: пятнистые стебли, плоские белёсые зонтики', color: '#e9efe0', shape: 'plus', prefer: 'у воды и канав' },
  toadstool: { name: 'Поганки', zones: ['ground', 'slope', 'border'], dens: 0.9, max: 4000, s: [0.5, 1.3], cast: true, sway: 0, cluster: 5, desc: 'Бледные поганки и ложные опята, тонкие ножки с юбкой', color: '#d6c2ff', shape: 'dia', prefer: 'гнёздами в тени леса' },
  trutovik:  { name: 'Трутовики', zones: ['ground', 'slope', 'border'], dens: 0.7, max: 3000, s: [0.35, 0.8], cast: true, sway: 0, desc: 'Древесные грибы-полки на старых брёвнах и пнях', color: '#ff9d4a', shape: 'tri', prefer: 'у пней и деревьев', onTrees: true },
  lichen:    { name: 'Лишайник', zones: ['ground', 'slope', 'shore', 'border'], dens: 1.0, max: 6000, s: [0.25, 0.8], cast: false, sway: 0, desc: 'Серо-зелёная и охристая корка на старом дереве и камне', color: '#a9c9a0', shape: 'ring', prefer: 'вокруг камней' },
  mold:      { name: 'Плесень, гниль', zones: ['ground', 'slope', 'shore', 'border'], dens: 1.0, max: 6000, s: [0.3, 0.9], cast: false, sway: 0, desc: 'Тухлая чёрно-зелёная гниль с белёсым пушком', color: '#7a5aa8', shape: 'x', prefer: 'у воды и руин' },
  vine:      { name: 'Лианы', zones: [], dens: 0.5, max: 5000, s: [0.9, 2.6], cast: false, sway: 0.05, desc: 'Свисающие лианы с листьями: со стен, свесов кровли, веток и брёвен', color: '#22e08a', shape: 'plus', prefer: 'на деревьях и стенах', hang: true },
  vinedry:   { name: 'Сухие плети', zones: [], dens: 0.45, max: 4000, s: [0.9, 2.4], cast: false, sway: 0.04, desc: 'Мёртвые бурые плети и обрывки плюща на старых стенах', color: '#b0784a', shape: 'x', prefer: 'на старых стенах', hang: true },
  lily:      { name: 'Кувшинки', zones: ['water', 'shallow'], dens: 0.8, max: 3000, s: [0.35, 0.7], cast: false, sway: 0, desc: 'Листья на воде, белые цветы', color: '#ffffff', shape: 'star', prefer: 'на тихой воде', onWater: true },
};
export const PLANT_IDS = Object.keys(PLANTS);
export const GROUPS = [
  ['Травы', ['grass', 'meadow', 'deadgrass', 'fireweed', 'belena', 'hemlock']],
  ['У воды', ['reeds', 'lily']],
  ['Лес и тень', ['fern', 'moss', 'lichen', 'mold', 'vine', 'vinedry']],
  ['Грибы', ['mushroom', 'toadstool', 'trutovik']],
  ['Кусты', ['bush', 'shrub']],
  ['Камни', ['stones', 'cobble', 'boulder', 'crag', 'giant', 'runestone']],
];
// набор, который показывается в обычной игровой сцене (вкладки 2–5)
export const DEFAULT_ON = ['grass', 'meadow', 'reeds', 'fireweed', 'fern', 'moss', 'mushroom', 'bush', 'shrub', 'stones', 'cobble', 'boulder', 'lily', 'toadstool', 'vine'];

// ---------------------------------------------------------------- карта зон (шаг 0,5 м)
export const CELL = 0.5;
export const N = Math.round((HALF * 2) / CELL);
export const zoneGrid = new Array(N * N);
export const waterDist = new Float32Array(N * N);
export const hGrid = new Float32Array(N * N);
export function buildGrids() {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -HALF + (i + 0.5) * CELL, z = -HALF + (j + 0.5) * CELL;
    zoneGrid[j * N + i] = zoneAt(x, z); hGrid[j * N + i] = heightAt(x, z);
  }
  const isW = (k) => zoneGrid[k] === 'water' || zoneGrid[k] === 'shallow';
  const R = 10;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let best = R * CELL;
    if (isW(j * N + i)) best = 0;
    else for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue;
      if (isW(b * N + a)) best = Math.min(best, Math.hypot(di, dj) * CELL);
    }
    waterDist[j * N + i] = best;
  }
}
export const cellIdx = (x, z) => { const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j * N + i; };
export const zoneOfGrid = (x, z) => { const k = cellIdx(x, z); return k < 0 ? 'border' : zoneGrid[k]; };
export const wDist = (x, z) => { const k = cellIdx(x, z); return k < 0 ? 99 : waterDist[k]; };

// ---------------------------------------------------------------- расклад
function affinity(id, x, z, zone) {
  const e = forestEdge(x, z), wd = wDist(x, z), sl = slopeAt(x, z);
  const dr = Math.hypot(x - ruin.x, z - ruin.z), dh = Math.hypot(x - hill.x, z - hill.z), dv = Math.hypot(x - village.x, z - village.z);
  const patch = fbm(x * 0.22 + id.length * 3.1, z * 0.22 + 4.7);
  const nearRoad = roadDist(x, z) < 2.2 ? 0.45 : 1;
  switch (id) {
    case 'grass': return (zone === 'slope' ? 0.7 : 1) * nearRoad * (0.75 + 0.25 * patch);
    case 'meadow': return smooth(0.45, 0.6, patch) * nearRoad;
    case 'reeds': return zone === 'water' ? 0.7 : Math.exp(-wd / 1.1);
    case 'fireweed': return (Math.exp(-dr / 6) * 1.6 + smooth(0.55, 0.7, patch) * 0.5) * (dv < 7 ? 0.2 : 1);
    case 'fern': return smooth(5, -2, e) * 0.9 + 0.06;
    case 'moss': return smooth(7, -2, e) * smooth(0.35, 0.6, patch) * 1.4 + (zone === 'shore' ? 0.4 : 0.05);
    case 'mushroom': return smooth(4, -3, e) * smooth(0.5, 0.65, patch) * 2.2;
    case 'toadstool': return smooth(2, -5, e) * smooth(0.5, 0.65, 1 - patch) * 2.2;
    case 'bush': return smooth(9, 0, e) * 0.8 + 0.08;
    case 'shrub': return Math.exp(-dr / 7) * 1.4 + smooth(4, 0, e) * 0.5;
    case 'stones': return zone === 'slope' ? 1.2 : zone === 'shore' ? 1.0 : 0.25;
    case 'cobble': return Math.exp(-wd / 2.5) * 1.2 + 0.1;
    case 'boulder': return zone === 'slope' ? 1.3 : 0.2;
    case 'crag': return Math.exp(-dh / 5.5) * 2 + (zone === 'slope' ? 0.4 : 0);
    case 'giant': return dh < 7 && sl > 0.15 ? 1.4 : 0;
    case 'runestone': return Math.exp(-dh / 5) + Math.exp(-dr / 3.5) * 0.8;
    case 'deadgrass': return smooth(0.52, 0.62, patch) * (Math.exp(-dr / 9) + 0.15);
    case 'belena': return Math.exp(-dr / 7) * 1.5 + Math.exp(-Math.abs(dv - 9) / 3) * 0.7;
    case 'hemlock': return Math.exp(-wd / 3) * 0.9 * smooth(0.4, 0.55, patch);
    case 'lichen': return 0.25 + smooth(5, 0, e) * 0.4 + (sl > 0.3 ? 0.8 : 0);
    case 'mold': return (Math.exp(-wd / 2) * 0.8 + Math.exp(-dr / 4)) * smooth(0.4, 0.6, patch);
    case 'lily': return zone === 'water' ? 0.8 : 0.55;
    default: return 1;
  }
}

export function scatterAll(blockers = [], trees = [], huts = [], seed = 42) {
  const pts = {};
  for (const id of PLANT_IDS) pts[id] = [];
  const blocked = (x, z, pad = 0) => {
    for (const b of blockers) { if (b.r != null) { if (Math.hypot(x - b.x, z - b.z) < b.r + pad) return true; } else if (x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad) return true; }
    return false;
  };
  for (const id of PLANT_IDS) {
    const P = PLANTS[id];
    if (P.hang || P.onTrees) continue;
    const r = rng(seed + id.charCodeAt(0) * 131 + id.length * 17);
    const per = (P.dens * 0.25 * CELL * CELL) / (P.cluster || 1);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const zone = zoneGrid[j * N + i];
      if (!P.zones.includes(zone)) continue;
      const x = -HALF + (i + r()) * CELL, z = -HALF + (j + r()) * CELL;
      if (zone === 'road') continue;
      const a = affinity(id, x, z, zone);
      if (a <= 0 || r() > per * 4 * a * 1.0 / 4 * 1) continue;
      const n = P.cluster ? 2 + Math.floor(r() * P.cluster) : 1;
      for (let q = 0; q < n; q++) {
        const px = x + (r() - 0.5) * (P.cluster ? 1.1 : 0), pz = z + (r() - 0.5) * (P.cluster ? 1.1 : 0);
        if (!P.zones.includes(zoneOfGrid(px, pz)) || blocked(px, pz, 0.3)) continue;
        const s = lerp(P.s[0], P.s[1], r());
        const y = P.onWater ? WATER_Y + 0.02 : heightAt(px, pz);
        pts[id].push({ id, x: px, y, z: pz, s, ry: r() * Math.PI * 2, seed: Math.floor(r() * 1e6) });
      }
    }
  }
  // лианы и сухие плети — на деревьях и стенах; трутовики — у основания деревьев и пней
  const rv = rng(seed + 999);
  for (const t of trees) {
    if (t.kind === 'dead' && rv() < 0.7) pts.vinedry.push({ id: 'vinedry', x: t.x, y: heightAt(t.x, t.z) + 2.6, z: t.z, s: 0.9 + rv() * 1.1, ry: rv() * 6.28, seed: Math.floor(rv() * 1e6), on: 'tree' });
    else if (rv() < 0.22 && forestEdge(t.x, t.z) < 4) pts.vine.push({ id: 'vine', x: t.x + 0.25, y: heightAt(t.x, t.z) + 3.2 * t.s, z: t.z, s: 0.9 + rv() * 1.4, ry: rv() * 6.28, seed: Math.floor(rv() * 1e6), on: 'tree' });
    if (rv() < 0.11) pts.trutovik.push({ id: 'trutovik', x: t.x + (rv() - 0.5) * 0.6, y: heightAt(t.x, t.z), z: t.z + (rv() - 0.5) * 0.6, s: 0.4 + rv() * 0.4, ry: rv() * 6.28, seed: Math.floor(rv() * 1e6), on: 'tree' });
  }
  for (const h of huts) {
    const n = h.ruin ? 9 : 3;
    for (let k = 0; k < n; k++) {
      const a = rv() * 6.28, rr = Math.max(h.w, h.d) * 0.5 + 0.2;
      const id = h.ruin ? (rv() < 0.55 ? 'vinedry' : 'vine') : 'vine';
      pts[id].push({ id, x: h.x + Math.cos(a) * rr, y: heightAt(h.x, h.z) + 1.9 + rv() * 0.5, z: h.z + Math.sin(a) * rr, s: 0.9 + rv() * 1.2, ry: a, seed: Math.floor(rv() * 1e6), on: 'hut' });
    }
  }
  return pts;
}

// ---------------------------------------------------------------- геометрия видов (высота ~1, ширина ~1)
const C = (h) => col(h);
function blade(g, x, z, h, w, lean, ang, c0, c1) {
  const dx = Math.cos(ang), dz = Math.sin(ang);
  const tip = [x + dx * lean, h, z + dz * lean];
  const mid = [x + dx * lean * 0.35, h * 0.55, z + dz * lean * 0.35];
  const px = -dz * w, pz = dx * w;
  g.quad([x - px, 0, z - pz], [x + px, 0, z + pz], [mid[0] + px * 0.7, mid[1], mid[2] + pz * 0.7], [mid[0] - px * 0.7, mid[1], mid[2] - pz * 0.7], c0, c0, lerpC(c0, c1, 0.6), lerpC(c0, c1, 0.6));
  g.tri([mid[0] - px * 0.7, mid[1], mid[2] - pz * 0.7], [mid[0] + px * 0.7, mid[1], mid[2] + pz * 0.7], tip, lerpC(c0, c1, 0.6), lerpC(c0, c1, 0.6), c1);
}
const _l = new THREE.Color();
function lerpC(a, b, t) { return _l.copy(a).lerp(b, t).clone(); }

function tuft(g, r, n, h0, h1, spread, c0, c1, lean = 0.3) {
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = Math.sqrt(r()) * spread;
    blade(g, Math.cos(a) * d, Math.sin(a) * d, lerp(h0, h1, r()), 0.035 + r() * 0.025, lean * (0.4 + r()), r() * 6.28, c0, c1);
  }
}
function stalkFlower(g, x, z, h, stem, head, headR) {
  g.prism([x, 0, z], [x, h, z], 0.012, stem, 4, 0.8, stem, false);
  g.blob(x, h, z, headR, head, { sy: 0.6, detail: 0, noise: 0.1, seed: Math.floor(x * 99 + z * 77), top: head });
}

const BUILD = {
  grass(g, r) { tuft(g, r, 11, 0.55, 1.0, 0.42, C(0x1b3321), C(0x86ab4c)); },
  deadgrass(g, r) { tuft(g, r, 10, 0.4, 0.85, 0.4, C(0x3a3828), C(0xa39a6a), 0.5); },
  meadow(g, r) {
    tuft(g, r, 8, 0.45, 0.8, 0.4, C(0x1f3a22), C(0x7aa046));
    const fc = [0xe8e2c8, 0xd9b84a, 0xa98bd0, 0xc87a6a];
    for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = 0.12 + r() * 0.3; stalkFlower(g, Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 0.3, C(0x3a6a30), C(fc[Math.floor(r() * 4)]), 0.07); }
  },
  reeds(g, r) {
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.35; blade(g, Math.cos(a) * d, Math.sin(a) * d, 0.75 + r() * 0.25, 0.028, 0.18 * r(), r() * 6.28, C(0x2a4a28), C(0xa6b062)); }
    for (let i = 0; i < 3; i++) { const a = r() * 6.28, d = 0.1 + r() * 0.2, x = Math.cos(a) * d, z = Math.sin(a) * d; g.prism([x, 0, z], [x, 0.78, z], 0.012, C(0x4a6a30), 4, 1, C(0x6a8a38), false); g.prism([x, 0.62, z], [x, 0.84, z], 0.035, C(0x5a3a22), 6, 0.6, C(0x6e4a2a)); }
  },
  fireweed(g, r) {
    for (let k = 0; k < 3; k++) {
      const a = r() * 6.28, d = 0.05 + r() * 0.18, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.8 + r() * 0.2;
      g.prism([x, 0, z], [x, h, z], 0.014, C(0x3a5a2c), 4, 0.8, C(0x4a7a34), false);
      for (let q = 0; q < 6; q++) { const yy = 0.45 + q * 0.09; g.blob(x + (r() - 0.5) * 0.06, yy, z + (r() - 0.5) * 0.06, 0.06 - q * 0.004, C(0xc65a9a), { sy: 0.8, detail: 0, noise: 0.15, seed: q + k, top: C(0xe88ac0) }); }
      for (let q = 0; q < 4; q++) blade(g, x, z, 0.25 + q * 0.05, 0.03, 0.12, r() * 6.28, C(0x2f5028), C(0x5f8f3c));
    }
  },
  fern(g, r) {
    const NF = 8;
    for (let f = 0; f < NF; f++) {
      const a = (f / NF) * 6.28 + r() * 0.3, L = 0.7 + r() * 0.3, rise = 0.6 + r() * 0.2, S = 5;
      const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
      let prev = null;
      for (let i = 0; i <= S; i++) {
        const t = i / S, w = 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05));
        const P = [dx * t * L, rise * (t * 1.3 - t * t * 1.15), dz * t * L];
        const cc = lerpC(C(0x1d4a26), C(0x8cc060), t);
        const cur = { l: [P[0] - px * w, P[1], P[2] - pz * w], r: [P[0] + px * w, P[1], P[2] + pz * w], c: cc };
        if (prev) g.quad(prev.l, prev.r, cur.r, cur.l, prev.c, prev.c, cur.c, cur.c);
        prev = cur;
      }
    }
  },
  moss(g, r) {
    g.blob(0, 0, 0, 0.5, C(0x45622e), { sy: 0.28, detail: 1, noise: 0.22, seed: Math.floor(r() * 99), top: C(0x7a9a48) });
    g.blob(0.28, 0, 0.1, 0.3, C(0x4f6e35), { sy: 0.3, detail: 1, noise: 0.2, seed: 5, top: C(0x8aaa52) });
  },
  mushroom(g, r) {
    const caps = [[0xb02a22, 0xe8e0d0], [0x8a5a2a, 0xe3d3b0], [0xd89a3a, 0xf0e2b8]];
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + r(), d = i === 0 ? 0 : 0.2 + r() * 0.1, x = Math.cos(a) * d, z = Math.sin(a) * d, s = i === 0 ? 1 : 0.65 + r() * 0.2;
      const [cc, st] = caps[Math.floor(r() * 3)];
      g.prism([x, 0, z], [x, 0.26 * s, z], 0.05 * s, C(st), 6, 0.85, C(st), false);
      g.blob(x, 0.27 * s, z, 0.17 * s, C(cc), { sy: 0.5, detail: 1, noise: 0.05, seed: i + 1, top: C(cc) });
    }
  },
  toadstool(g, r) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + r(), d = i === 0 ? 0 : 0.15 + r() * 0.15, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.6 + r() * 0.5;
      g.prism([x, 0, z], [x, 0.38 * s, z], 0.025 * s, C(0xd8d4b8), 5, 0.8, C(0xe4e0c8), false);
      g.blob(x, 0.38 * s, z, 0.1 * s, C(0xcfc6a0), { sy: 0.55, detail: 1, noise: 0.05, seed: i, top: C(0xe6dcb8) });
    }
  },
  trutovik(g, r) {
    g.prism([0, 0, 0], [0, 0.34, 0], 0.17, C(0x4a3626), 7, 0.9, C(0x5a4632));
    for (let i = 0; i < 3; i++) { const a = i * 2.2 + r(), y = 0.1 + i * 0.09; g.blob(Math.cos(a) * 0.17, y, Math.sin(a) * 0.17, 0.11, C(0x9a6a40), { sy: 0.3, detail: 1, noise: 0.06, seed: i, top: C(0xd8a868) }); }
  },
  bush(g, r) {
    for (const [x, y, z, rr] of [[0, 0.3, 0, 0.42], [0.3, 0.22, 0.12, 0.3], [-0.28, 0.2, -0.1, 0.32], [0.05, 0.2, -0.32, 0.28], [-0.1, 0.18, 0.3, 0.27]])
      g.blob(x, y, z, rr, C(0x23452a), { sy: 0.8, detail: 1, noise: 0.18, seed: Math.floor(x * 50 + z * 70 + 9), top: C(0x4f7d3c) });
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = 0.25 + r() * 0.25; g.blob(Math.cos(a) * d, 0.2 + r() * 0.3, Math.sin(a) * d, 0.035, C(0x3a4a9a), { detail: 0, noise: 0.05, seed: i, top: C(0x6a7ad0) }); }
  },
  shrub(g, r) {
    for (let i = 0; i < 6; i++) { const a = i * 1.05, d = 0.22 + (i % 2) * 0.12; g.prism([Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], [Math.cos(a) * d, 0.5, Math.sin(a) * d], 0.02, C(0x3a2c20), 4, 0.7, C(0x4a3828), false); }
    for (const [x, y, z, rr] of [[0, 0.62, 0, 0.42], [0.28, 0.5, 0.15, 0.3], [-0.3, 0.52, -0.1, 0.32], [0.05, 0.55, -0.32, 0.29], [-0.08, 0.7, 0.28, 0.28]])
      g.blob(x, y, z, rr, C(0x2c4a2c), { sy: 0.85, detail: 1, noise: 0.2, seed: Math.floor(x * 40 + z * 60 + 3), top: C(0x5f8c44) });
  },
  lichen(g, r) { g.blob(0, 0, 0, 0.5, C(0x7a8a6a), { sy: 0.06, detail: 1, noise: 0.25, seed: 4, top: C(0xb0b890) }); g.blob(0.25, 0, 0.1, 0.25, C(0xb09a50), { sy: 0.07, detail: 1, noise: 0.2, seed: 8, top: C(0xd2b868) }); },
  mold(g, r) { g.blob(0, 0, 0, 0.5, C(0x151f16), { sy: 0.07, detail: 1, noise: 0.3, seed: 2, top: C(0x2a3a2a) }); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = r() * 0.3; g.blob(Math.cos(a) * d, 0.03, Math.sin(a) * d, 0.05, C(0xcfd6c8), { sy: 0.5, detail: 0, noise: 0.1, seed: i, top: C(0xe8ede0) }); } },
  vine(g, r) {
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * 0.18, L = 0.7 + r() * 0.3;
      g.prism([x, 0, 0], [x + (r() - 0.5) * 0.1, -L, (r() - 0.5) * 0.1], 0.012, C(0x2a4a24), 4, 0.8, C(0x3a6a2c), false);
      for (let q = 0; q < 6; q++) { const y = -0.1 - q * (L / 6.5), sd = q % 2 ? 1 : -1; g.tri([x, y, 0], [x + sd * 0.14, y - 0.03, 0.03], [x + sd * 0.05, y - 0.14, 0], C(0x2f5a2a), C(0x4f8a3a), C(0x3f7a30)); }
    }
  },
  vinedry(g, r) {
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * 0.18, L = 0.55 + r() * 0.45;
      g.prism([x, 0, 0], [x + (r() - 0.5) * 0.15, -L, (r() - 0.5) * 0.1], 0.011, C(0x4a3828), 4, 0.7, C(0x5a4632), false);
      for (let q = 0; q < 3; q++) { const y = -0.15 - q * 0.2, sd = q % 2 ? 1 : -1; g.tri([x, y, 0], [x + sd * 0.1, y - 0.02, 0.02], [x + sd * 0.03, y - 0.1, 0], C(0x5a4426), C(0x8a6a3a), C(0x6a5230)); }
    }
  },
  lily(g, r) {
    for (let k = 0; k < 3; k++) {
      const cx = (k - 1) * 0.55 + (r() - 0.5) * 0.2, cz = (k % 2) * 0.4 - 0.2, R = 0.32 + r() * 0.12, a0 = r() * 6.28;
      const n = 12;
      for (let i = 0; i < n - 1; i++) { const a = a0 + 0.3 + (i / n) * (6.28 - 0.6), b = a0 + 0.3 + ((i + 1) / n) * (6.28 - 0.6); g.tri([cx, 0, cz], [cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R], [cx + Math.cos(b) * R, 0, cz + Math.sin(b) * R], C(0x2c5a3a), C(0x4a8a52), C(0x4a8a52)); }
    }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; g.tri([0, 0.02, 0], [Math.cos(a) * 0.11, 0.1, Math.sin(a) * 0.11], [Math.cos(a + 0.9) * 0.1, 0.03, Math.sin(a + 0.9) * 0.1], C(0xf0eee0), C(0xffffff), C(0xe8e4d0)); }
  },
  belena(g, r) {
    tuft(g, r, 7, 0.4, 0.75, 0.3, C(0x2c4a40), C(0x7f9f90));
    for (let i = 0; i < 4; i++) { const a = r() * 6.28, d = 0.1 + r() * 0.2; stalkFlower(g, Math.cos(a) * d, Math.sin(a) * d, 0.6 + r() * 0.3, C(0x3a5a40), C(0xc8c070), 0.06); }
  },
  hemlock(g, r) {
    for (let k = 0; k < 3; k++) {
      const a = r() * 6.28, d = 0.05 + r() * 0.2, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.75 + r() * 0.25;
      g.prism([x, 0, z], [x, h, z], 0.015, C(0x5a4a5a), 4, 0.8, C(0x4a7a3a), false);
      for (let q = 0; q < 3; q++) { const y = h - q * 0.1, rr = 0.1 - q * 0.02; g.blob(x + (r() - 0.5) * 0.15, y, z + (r() - 0.5) * 0.15, rr, C(0xcfd0b8), { sy: 0.22, detail: 1, noise: 0.1, seed: q, top: C(0xeceee0) }); }
    }
    tuft(g, r, 6, 0.25, 0.5, 0.3, C(0x2a4a2a), C(0x6a9a4a));
  },
};
function stone(g, r, look) {
  const seed = Math.floor(r() * 1000);
  if (look === 5) { // рунный столб
    g.box(0, 0.62, 0, 0.5, 1.24, 0.22, C(0x56606a), 0, C(0x7a8794));
    g.blob(0, 1.24, 0, 0.25, C(0x56606a), { sy: 0.4, sz: 0.5, detail: 1, noise: 0.1, seed, top: C(0x7a8794) });
    for (let i = 0; i < 4; i++) g.box(0, 0.35 + i * 0.22, 0.115, 0.22 - (i % 2) * 0.1, 0.04, 0.012, C(0x7ae8ff));
    return;
  }
  if (look === 3) { // наклонная плита
    g.box(0, 0.4, 0, 0.95, 0.22, 0.6, C(0x5a626c), 0.2, C(0x8a94a0));
    g.box(0.15, 0.7, 0.05, 0.6, 0.2, 0.4, C(0x626b75), 0.5, C(0x949ea8));
    g.blob(0.25, 0.28, -0.1, 0.3, C(0x555d66), { sy: 0.6, noise: 0.2, seed, top: C(0x7f8995) });
    return;
  }
  if (look === 4) { // ступенчатая глыба
    g.blob(0, 0.35, 0, 0.55, C(0x4f5862), { sy: 0.7, detail: 1, noise: 0.15, seed, top: C(0x7e8a96) });
    g.blob(0.15, 0.78, 0.05, 0.38, C(0x57616b), { sy: 0.75, detail: 1, noise: 0.15, seed: seed + 3, top: C(0x8995a2) });
    g.blob(-0.1, 1.08, 0, 0.22, C(0x5d6772), { sy: 0.75, detail: 1, noise: 0.12, seed: seed + 5, top: C(0x92a0ad) });
    return;
  }
  const sq = look === 2 ? 0.8 : look === 1 ? 0.85 : 0.7, nz = look === 2 ? 0.1 : 0.22;
  g.blob(0, 0.25, 0, 0.5, C(0x4e5660), { sy: sq, detail: look === 1 ? 2 : 1, noise: nz, seed, top: C(0x84909c) });
  if (look !== 1 && look !== 2) g.blob(0.05, 0.43, 0, 0.2, C(0x4a6a38), { sy: 0.35, detail: 1, noise: 0.2, seed: seed + 1, top: C(0x7a9a4c) });
  if (look === 0) g.blob(0.5, 0.08, 0.2, 0.14, C(0x555d66), { sy: 0.7, detail: 0, noise: 0.2, seed: 3, top: C(0x8a94a0) });
}

const geoCache = {};
export function plantGeometry(id) {
  if (geoCache[id]) return geoCache[id];
  const r = rng(PLANT_IDS.indexOf(id) * 31 + 7), g = new G(PLANT_IDS.indexOf(id) + 3);
  g.jit = 0.05;
  if (PLANTS[id].look != null) stone(g, r, PLANTS[id].look); else BUILD[id](g, r);
  return (geoCache[id] = g.build());
}

// InstancedMesh на каждый вид
export function buildPlantMeshes(pts) {
  const group = new THREE.Group();
  const meshes = {};
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3();
  for (const id of PLANT_IDS) {
    const list = pts[id]; const P = PLANTS[id];
    if (!list.length) continue;
    const geo = plantGeometry(id);
    const isStone = P.look != null;
    const mat = plantMat(P.sway, P.hang);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.ry);
      const wide = isStone ? (0.85 + hash2(p.seed, 3) * 0.3) : 1;
      sc.set(p.s * wide, p.s * (isStone ? 0.8 + hash2(p.seed, 7) * 0.5 : 1), p.s * wide);
      pos.set(p.x, p.y - (isStone ? 0.05 * p.s : 0), p.z);
      m4.compose(pos, q, sc);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = P.cast; mesh.receiveShadow = true; mesh.frustumCulled = false;
    mesh.userData.id = id;
    meshes[id] = mesh; group.add(mesh);
  }
  return { group, meshes };
}
