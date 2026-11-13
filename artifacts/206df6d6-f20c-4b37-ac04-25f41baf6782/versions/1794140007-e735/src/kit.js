// Набор деталей логова: доски, брёвна, сваи, крыши с мхом и красным узором, лестницы со ступенями, перила с верёвкой,
// черепа, полотна с узором, фонари, лианы, грибы. Всё строится кодом; детали одного материала сливаются в один меш,
// у крупных форм контур пером. Текстуры рисуются на холсте: волокна дерева, кора, дранка, ткань, камень, дверь.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, glow, inkMat, inkFor } from './toon.js';

let _s = 7;
export const rnd = () => ((_s = (_s * 16807) % 2147483647) / 2147483647);
export const rr = (a, b) => a + (b - a) * rnd();
export const setSeed = (s) => { _s = s; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export { V };

// ---------- текстуры (холст) ----------
export function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
const gray = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;
// волокна дерева вдоль u (1 повтор ≈ 1,5 м): светлые и тёмные жилки, сучки, трещины, следы топора
export const grainTex = canvasTex(512, 128, (g, w, h) => {
  g.fillStyle = gray(178); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const y0 = rnd() * h, amp = 1 + rnd() * 4, ph = rnd() * 6, f = 0.01 + rnd() * 0.02;
    g.strokeStyle = rnd() < 0.55 ? gray(120 + rnd() * 30, 0.55) : gray(215 + rnd() * 30, 0.4); g.lineWidth = 0.6 + rnd() * 1.8;
    g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  for (let i = 0; i < 9; i++) { // сучки
    const x = rnd() * w, y = rnd() * h, r = 3 + rnd() * 6;
    g.fillStyle = gray(80, 0.8); g.beginPath(); g.ellipse(x, y, r * 1.8, r, 0, 0, 6.3); g.fill();
    g.strokeStyle = gray(130, 0.6); g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, r * 3, r * 1.7, 0, 0, 6.3); g.stroke();
  }
  for (let i = 0; i < 14; i++) { const x = rnd() * w, y = rnd() * h; g.strokeStyle = gray(55, 0.8); g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 70, y + rr(-3, 3)); g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = rnd() * w; g.fillStyle = gray(150 + rnd() * 60, 0.25); g.fillRect(x, 0, 10 + rnd() * 30, h); } // тёсаные грани
});
// кора: глубокие продольные борозды вдоль u, чешуйки
export const barkTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = gray(165); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y0 = rnd() * h, amp = 3 + rnd() * 8, ph = rnd() * 6, f = 0.012 + rnd() * 0.02;
    g.strokeStyle = gray(50 + rnd() * 40, 0.85); g.lineWidth = 2 + rnd() * 5;
    g.beginPath(); for (let x = -10; x <= w + 10; x += 10) { const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * 0.07) * 1.5; x > -10 ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = gray(rnd() < 0.5 ? 210 : 90, 0.3); g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 20, 2 + rnd() * 4); }
});
// дранка крыши: ряды дощечек, на части рядов красный узор ромбами и зубцами (как на концептах), мох пятнами
export const roofTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#3b3024'; g.fillRect(0, 0, w, h);
  const rowH = 32;
  for (let y = 0, r = 0; y < h; y += rowH, r++) {
    for (let x = -(r % 2) * 20; x < w; x += 40) {
      const c = 52 + rnd() * 30; g.fillStyle = `rgb(${c},${c * 0.8},${c * 0.62})`; g.fillRect(x + 1, y + 1, 38, rowH - 2 + rnd() * 4);
      g.fillStyle = 'rgba(15,10,6,0.65)'; g.fillRect(x, y + rowH - 3, 40, 3); g.fillRect(x, y, 2, rowH);
      if (rnd() < 0.1) { g.fillStyle = 'rgba(10,6,4,0.8)'; g.fillRect(x + 4, y + 4, 30, rowH - 8); } // выпавшая дранка
    }
  }
  // красный узор по краске (выцветший, местами стёрт)
  g.strokeStyle = 'rgba(150,40,28,0.85)'; g.lineWidth = 7;
  for (const yy of [96, 288, 448]) {
    g.beginPath(); for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + ((x / 32) % 2 ? -14 : 14)); g.stroke();
  }
  g.fillStyle = 'rgba(150,40,28,0.8)';
  for (let k = 0; k < 6; k++) { const cx = 40 + k * 86, cy = 192; g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 26); g.lineTo(cx - 22, cy); g.closePath(); g.fill(); g.fillStyle = '#3b3024'; g.fillRect(cx - 5, cy - 5, 10, 10); g.fillStyle = 'rgba(150,40,28,0.8)'; }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(40,28,18,${0.3 + rnd() * 0.5})`; g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 16, 2 + rnd() * 5); } // стёртость
  for (let i = 0; i < 40; i++) { const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 30; g.fillStyle = `rgba(${70 + rnd() * 40},${100 + rnd() * 40},${38 + rnd() * 20},${0.55 + rnd() * 0.35})`; g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd(), 0, Math.PI * 2); g.fill(); }
});
// красное полотно: ромбы с крючками, зубчатая кайма (узор с идолов концепта)
export const clothTex = canvasTex(128, 512, (g, w, h) => {
  g.fillStyle = '#8e2a1a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '40,10,6' : '200,96,60'},${0.06 + rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 1 + rnd() * 3); }
  g.fillStyle = '#d98a50';
  for (let y = 0; y < h; y += 12) { g.beginPath(); g.moveTo(6, y); g.lineTo(14, y + 6); g.lineTo(6, y + 12); g.fill(); g.beginPath(); g.moveTo(w - 6, y); g.lineTo(w - 14, y + 6); g.lineTo(w - 6, y + 12); g.fill(); }
  g.strokeStyle = '#e0a070'; g.lineWidth = 5;
  for (let k = 0; k < 4; k++) {
    const cy = 64 + k * 118, cx = w / 2, r = 34;
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx, cy - r * 0.45); g.lineTo(cx + r * 0.45, cy); g.lineTo(cx, cy + r * 0.45); g.lineTo(cx - r * 0.45, cy); g.closePath(); g.stroke();
    for (const s of [-1, 1]) for (const t of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.5, cy + t * r * 0.5); g.lineTo(cx + s * r * 0.85, cy + t * r * 0.5); g.lineTo(cx + s * r * 0.85, cy + t * r * 0.2); g.stroke(); }
  }
  g.fillStyle = 'rgba(30,8,4,0.5)'; for (let i = 0; i < 30; i++) g.fillRect(rnd() * w, h - 40 + rnd() * 40, 3, 20); // бахрома снизу темнее
});
// фронтон хором: тёмные доски, красное колесо-оберег с загнутыми спицами, кайма
export const gableTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 24) { g.fillStyle = `rgb(${50 + rnd() * 20},${36 + rnd() * 14},${26 + rnd() * 10})`; g.fillRect(x + 1, 0, 22, h); g.fillStyle = '#1c130d'; g.fillRect(x, 0, 2, h); }
  g.fillStyle = '#4a1e16'; g.fillRect(40, 60, w - 80, h - 60);
  g.strokeStyle = '#b8402e'; g.lineWidth = 8;
  const cx = w / 2, cy = h * 0.63, r = 58;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx, cy, r * 0.3, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3); g.quadraticCurveTo(cx + Math.cos(a + 0.35) * r * 0.75, cy + Math.sin(a + 0.35) * r * 0.75, cx + Math.cos(a + 0.2) * r, cy + Math.sin(a + 0.2) * r); g.stroke(); }
  g.lineWidth = 5; for (let i = 0; i < 9; i++) { const x = 44 + i * 19; g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 9, 76); g.lineTo(x + 18, 64); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(20,10,6,${rnd() * 0.25})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 6, 1 + rnd() * 2); }
});
// дверь: вертикальные доски, кованые полосы, кольцо
export const doorTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 26) { g.fillStyle = `rgb(${58 + rnd() * 20},${42 + rnd() * 14},${28 + rnd() * 10})`; g.fillRect(x + 1, 0, 24, h); g.fillStyle = '#160f09'; g.fillRect(x, 0, 2, h); }
  g.fillStyle = '#2b2b2b'; for (const y of [40, 210]) { g.fillRect(0, y, w, 12); for (let x = 10; x < w; x += 26) { g.fillStyle = '#777'; g.fillRect(x, y + 4, 4, 4); g.fillStyle = '#2b2b2b'; } }
  g.strokeStyle = '#555'; g.lineWidth = 4; g.beginPath(); g.arc(w * 0.78, h * 0.52, 10, 0, 6.3); g.stroke();
});
// камень: пятна и сколы
export const stoneTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = gray(170); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) { g.fillStyle = gray(rnd() < 0.5 ? 110 : 215, 0.25); const r = 2 + rnd() * 10; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 6.3); g.fill(); }
  for (let i = 0; i < 20; i++) { g.strokeStyle = gray(70, 0.7); g.lineWidth = 1.5; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rr(-20, 20); y += rr(-20, 20); g.lineTo(x, y); } g.stroke(); }
});

// ---------- материалы ----------
const WOOD = { map: grainTex, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.45 };
export const MAT = {
  wood: paint({ base: '#5c4836', moss: '#4f6b2c', mossAmt: 0.5, stroke: [0, 1, 0], strokeAmt: 0.14, drip: 0.55, break: 0.24, ...WOOD }),
  woodDark: paint({ base: '#423226', moss: '#45602a', mossAmt: 0.5, stroke: [0, 1, 0], strokeAmt: 0.14, drip: 0.5, ...WOOD }),
  plank: paint({ base: '#665040', moss: '#5a7430', mossAmt: 0.42, stroke: [1, 0, 0], strokeAmt: 0.12, wet: 0.6, ...WOOD }),
  plankOld: paint({ base: '#4e4a3a', moss: '#5f7a30', mossAmt: 0.6, stroke: [1, 0, 0], strokeAmt: 0.14, wet: 0.8, ...WOOD }),
  log: paint({ base: '#5e4733', moss: '#4f6b2c', mossAmt: 0.32, stroke: [1, 0, 0], strokeAmt: 0.16, ...WOOD }),
  roof: paint({ base: '#ffffff', map: roofTex, mapRep: [1 / 2.6, 1 / 2.6], moss: '#5e7c32', mossAmt: 0.42, stroke: [1, 0, 0], strokeAmt: 0.1, drip: 0.25 }),
  gable: paint({ base: '#ffffff', map: gableTex, strokeAmt: 0.08, rim: 0.6 }),
  door: paint({ base: '#ffffff', map: doorTex, strokeAmt: 0.08, rim: 0.4, mossAmt: 0.2, moss: '#4f6b2c' }),
  cloth: paint({ base: '#ffffff', map: clothTex, strokeAmt: 0.1, side: THREE.DoubleSide, sway: 1, swayM: [3, 0, 1], rim: 0.5 }),
  rope: paint({ base: '#8a7a58', strokeAmt: 0.2, stroke: [1, 0, 0], rim: 0.6 }),
  bone: paint({ base: '#d2c4a6', strokeAmt: 0.1, break: 0.18, rim: 1.2, moss: '#6a7a3a', mossAmt: 0.12 }),
  moss: paint({ base: '#3e5a24', strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.2, swayM: [2, 0, 1], rim: 0.4, break: 0.3 }),
  vine: paint({ base: '#34483a', moss: '#4a6a50', mossAmt: 0.5, strokeAmt: 0.25, stroke: [0, 1, 0], sway: 2.2, swayM: [2, 0, 1], rim: 0.6 }),
  leaf: paint({ base: '#3c5a46', strokeAmt: 0.3, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.4, swayM: [2, 0, 1], rim: 0.9, break: 0.35 }),
  bark: paint({ base: '#4a3d30', moss: '#506c2c', mossAmt: 0.55, stroke: [0, 1, 0], strokeAmt: 0.3, drip: 0.8, break: 0.3, rim: 1.0, map: barkTex, mapRep: [1 / 3.0, 1 / 1.6], mapGain: 1.5 }),
  iron: paint({ base: '#4a4b4c', strokeAmt: 0.08, rim: 1.4, wet: 0.5 }),
  stone: paint({ base: '#6b6a5e', moss: '#55702c', mossAmt: 0.55, strokeAmt: 0.12, map: stoneTex, mapRep: [1, 1], mapGain: 1.4 }),
  stalk: paint({ base: '#c9c0a0', strokeAmt: 0.1, rim: 0.8 }),
  dark: paint({ base: '#1a1410', strokeAmt: 0.05, rim: 0 }),
  winGreen: glow('#c8f05a', { k: 2.8, flick: 0.4 }),
  winOrange: glow('#ffa040', { k: 2.1, flick: 0.6 }),
  inOrange: glow('#ff7426', { k: 0.95, flick: 0.5 }),
  inGreen: glow('#9be04a', { k: 1.2, flick: 0.3 }),
  ember: glow('#ff7a26', { k: 1.8, flick: 1.0 }),
  shroom: glow('#58d8ff', { k: 1.9, flick: 0.2 }),
  shroomG: glow('#7dff9a', { k: 1.7, flick: 0.2 }),
  eye: glow('#ffd84a', { k: 2.6, flick: 0.1 }),
  candle: glow('#ffc060', { k: 2.4, flick: 1.0 }),
};
for (const k of ['moss', 'cloth', 'vine', 'leaf', 'rope']) MAT[k].userData.noInk = true;

// ---------- сборка ----------
export class Pack {
  constructor() { this.parts = new Map(); }
  add(mat, geo, m4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.deleteAttribute('color');
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (m4) g.applyMatrix4(m4);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
  }
  build(outline = true, shadow = true) {
    const grp = new THREE.Group();
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      geo.userData.parts = list.map((g) => g.attributes.position.count);   // для запекания: границы деталей
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadow && !mat.uniforms.uCol; mesh.receiveShadow = true;
      grp.add(mesh);
      if (outline && !(mat.uniforms && mat.uniforms.uCol) && !mat.userData.noInk) { const o = new THREE.Mesh(geo, inkFor(mat)); grp.add(o); }
    }
    return grp;
  }
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new THREE.Vector3();
export function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s3.set(sx, sy, sz));
}
// UV в метрах: у бруса грани по своим размерам, волокно вдоль длинной стороны (u)
export function boxUV(g, sx, sy, sz) {
  const uv = g.attributes.uv; const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
  return g;
}
// UV цилиндра/трубы в метрах: u — вдоль длины, v — по окружности
export function cylUV(g, len, r, alongU = false) {
  const uv = g.attributes.uv; const c = Math.PI * 2 * r;
  for (let i = 0; i < uv.count; i++) { const a = uv.getX(i), b = uv.getY(i); if (alongU) uv.setXY(i, a * len, b * c); else uv.setXY(i, b * len, a * c); }
  return g;
}
export function box(pack, mat, sx, sy, sz, m4) { pack.add(mat, boxUV(new THREE.BoxGeometry(sx, sy, sz), sx, sy, sz), m4); }
// брусок/бревно между двумя точками
export function beam(pack, mat, a, b, r = 0.1, seg = 6, square = false) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
  if (len < 1e-4) return;
  const geo = square ? boxUV(new THREE.BoxGeometry(r * 2, len, r * 2), r * 2, len, r * 2) : cylUV(new THREE.CylinderGeometry(r * rr(0.85, 1.0), r, len, seg, 1), len, r);
  if (square) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); }
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), q, new THREE.Vector3(1, 1, 1));
  pack.add(mat, geo, m);
}
// изогнутое бревно/корень/лиана по точкам
export function tube(pack, mat, pts, r, seg = 7, segs = 10) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const len = curve.getLength();
  pack.add(mat, cylUV(new THREE.TubeGeometry(curve, segs, r, seg, false), len, r, true));
}
// неровная доска
export function plank(pack, mat, x, y, z, len, w, rotY, th = 0.07, tilt = 0) {
  const L = len * rr(0.94, 1.05), W = w * rr(0.85, 1.0);
  box(pack, mat, L, th, W, M4(x + rr(-0.02, 0.02), y + rr(-0.012, 0.012), z, rr(-0.03, 0.03) + tilt, rotY + rr(-0.04, 0.04), rr(-0.025, 0.025)));
}

// верёвка с провисом между точками
export function rope(pack, a, b, sag = 0.15, r = 0.022) {
  const m = a.clone().lerp(b, 0.5); m.y -= sag;
  tube(pack, MAT.rope, [a, a.clone().lerp(m, 0.6).add(V(0, -sag * 0.25, 0)), m, b.clone().lerp(m, 0.6).add(V(0, -sag * 0.25, 0)), b], r, 4, 8);
}
// обмотка верёвкой вокруг столба
export function lashing(pack, x, y, z, r = 0.12) {
  for (let i = 0; i < 3; i++) pack.add(MAT.rope, new THREE.TorusGeometry(r + 0.015, 0.018, 4, 10), M4(x, y + i * 0.045, z, Math.PI / 2 + rr(-0.15, 0.15), 0, rr(-0.1, 0.1)));
}

// мостки по ломаной: сваи парами с поперечиной, лаги, доски поперёк (часть выпала, часть треснула и просела),
// перила с верёвкой (местами сломаны). Возвращает отрезки для ходьбы и места для растений.
export function boardwalk(pack, pts, y = 0.25, w = 1.7, groundAt, o = {}) {
  const segs = [], spots = [];
  const rails = o.rails ?? 0.6;
  const skip = o.skip || [];
  const nearJ = (x, z, r) => skip.some(([jx, jz]) => Math.hypot(x - jx, z - jz) < r);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const sx = Math.cos(yaw), sz = -Math.sin(yaw); // поперёк
    const n = Math.max(1, Math.round(len / 0.3));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = a[0] + dx * t, z = a[1] + dz * t;
      const r0 = rnd();
      if (nearJ(x, z, 1.3)) continue;                               // на перекрёстке — общий настил
      if (r0 < 0.045) continue;                                      // выпавшая доска
      if (r0 < 0.09) { plank(pack, MAT.plankOld, x + sx * rr(-0.4, 0.4), y - 0.05, z + sz * rr(-0.4, 0.4), w * rr(0.4, 0.6), 0.26, yaw + rr(-0.25, 0.25), 0.07, rr(-0.18, 0.18)); continue; } // обломок
      plank(pack, rnd() < 0.3 ? MAT.plankOld : MAT.plank, x, y - (r0 < 0.16 ? 0.035 : 0), z, w, 0.27, yaw, 0.07, r0 < 0.16 ? rr(-0.06, 0.06) : 0);
    }
    { // лаги (обрезаны у перекрёстков)
      const ta = nearJ(a[0], a[1], 0.1) ? Math.min(0.5, 1.2 / len) : 0, tb = nearJ(b[0], b[1], 0.1) ? 1 - Math.min(0.5, 1.2 / len) : 1;
      for (const s of [-1, 1]) beam(pack, MAT.woodDark, V(a[0] + dx * ta + sx * s * w * 0.33, y - 0.1, a[1] + dz * ta + sz * s * w * 0.33), V(a[0] + dx * tb + sx * s * w * 0.33, y - 0.1, a[1] + dz * tb + sz * s * w * 0.33), 0.065, 6);
    }
    const ns = Math.max(1, Math.round(len / 2.2));
    for (let k = 0; k <= ns; k++) { // сваи парами + поперечина
      if (i > 0 && k === 0) continue;
      const t = k / ns, x = a[0] + dx * t, z = a[1] + dz * t;
      if (nearJ(x, z, 1.9)) continue;
      const P = [];
      for (const s of [-1, 1]) {
        const px = x + sx * s * w * 0.46, pz = z + sz * s * w * 0.46, gy = groundAt(px, pz);
        const tall = rnd() < rails ? 1.05 : rr(0.02, 0.25);
        beam(pack, MAT.woodDark, V(px, gy - 0.5, pz), V(px + rr(-0.04, 0.04), y + tall, pz + rr(-0.04, 0.04)), 0.085, 6);
        if (tall > 0.9) lashing(pack, px, y + 0.5, pz, 0.085);
        P.push({ x: px, z: pz, top: y + tall, tall: tall > 0.9 });
        spots.push([px + sx * s * 0.4, pz + sz * s * 0.4]);
      }
      beam(pack, MAT.woodDark, V(P[0].x, y - 0.17, P[0].z), V(P[1].x, y - 0.17, P[1].z), 0.06, 5);
      P.forEach((p, j) => { p.side = j; });
      (segs.posts || (segs.posts = [])).push(...P);
    }
    segs.push({ a, b, w, y });
  }
  // перила: верёвка между высокими сваями одной стороны (если соседние обе высокие)
  const posts = segs.posts || [];
  for (const side of [0, 1]) {
    const ps = posts.filter((p) => p.side === side);
    for (let k = 0; k < ps.length - 1; k++) {
      const p = ps[k], q = ps[k + 1];
      if (!p.tall || !q.tall || Math.hypot(p.x - q.x, p.z - q.z) > 3) continue;
      if (rnd() < 0.15) { rope(pack, V(p.x, p.top - 0.08, p.z), V(p.x + (q.x - p.x) * 0.4, y + 0.1, p.z + (q.z - p.z) * 0.4), 0.05); continue; } // оборванная
      rope(pack, V(p.x, p.top - 0.08, p.z), V(q.x, q.top - 0.08, q.z), 0.18);
      rope(pack, V(p.x, p.top - 0.5, p.z), V(q.x, q.top - 0.5, q.z), 0.12, 0.018);
    }
  }
  delete segs.posts;
  segs.spots = spots;
  return segs;
}

// настил на перекрёстке мостков: квадрат досок на своих сваях, угловые столбы без верёвок
export function deck(pack, x, z, y, size, groundAt, rotY = 0) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const n = Math.round(size / 0.29);
  for (let k = 0; k < n; k++) { const lz = -size / 2 + (k + 0.5) * size / n; plank(pack, rnd() < 0.3 ? MAT.plankOld : MAT.plank, x + lz * s, y, z + lz * c, size + 0.1, 0.28, rotY, 0.08); }
  for (const lx of [-size / 2 + 0.15, size / 2 - 0.15]) beam(pack, MAT.woodDark, V(x + lx * c - (size / 2) * s, y - 0.1, z - lx * s - (size / 2) * c), V(x + lx * c + (size / 2) * s, y - 0.1, z - lx * s + (size / 2) * c), 0.07, 6);
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const px = x + (a * c + b * s) * size * 0.46, pz = z + (-a * s + b * c) * size * 0.46, gy = groundAt(px, pz);
    beam(pack, MAT.woodDark, V(px, gy - 0.5, pz), V(px, y + 0.35, pz), 0.1, 6);
  }
}

// свисающий мох: полоса с рваным низом
export function mossStrand(pack, x, y, z, len, wid = 0.25, rotY = 0) {
  const n = 6, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ww = wid * (1 - t * 0.75) * (0.8 + rnd() * 0.4), yy = -len * t, sw = Math.sin(t * 3 + rnd()) * 0.06;
    pos.push(-ww / 2 + sw, yy, 0, ww / 2 + sw, yy - rr(0, 0.15) * t, 0);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 0 ? [Math.min(1, -pos[i + 1] / len), 0] : [])), 2));   // u — доля длины от точки подвеса (для качания)
  pack.add(MAT.moss, g, M4(x, y, z, 0, rotY, 0));
}
// лиана: тонкий стебель свисает дугой, с листиками
export function vine(pack, top, len, rotY = 0, curl = 0.4) {
  const pts = []; const n = 6;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(V(top.x + Math.sin(rotY) * curl * Math.sin(t * 2.6) + rr(-0.05, 0.05), top.y - len * t, top.z + Math.cos(rotY) * curl * Math.sin(t * 2.6) + rr(-0.05, 0.05))); }
  const T = new Pack();   // u = доля длины от точки подвеса: верх лианы неподвижен, низ качается
  tube(T, MAT.vine, pts, rr(0.025, 0.05), 4, 10);
  const leaf = new THREE.PlaneGeometry(0.16, 0.24); leaf.translate(0, -0.12, 0);
  for (let i = 1; i < n * 2; i++) { const p = pts[Math.floor(i / 2)].clone().lerp(pts[Math.min(n, Math.floor(i / 2) + 1)], (i % 2) * 0.5); T.add(MAT.leaf, leaf, M4(p.x, p.y, p.z, rr(-0.5, 0.5), rr(0, 6.28), rr(-0.6, 0.6))); }
  for (const [mat, list] of T.parts) for (const g of list) { const ps = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < ps.count; i++) uv.setX(i, Math.max(0, Math.min(1, (top.y - ps.getY(i)) / len))); pack.add(mat, g); }
}

// крыша-домик крутая: два ската дранкой с красным узором, торчащие концы слег крест-накрест, мох с карниза
export function gableRoof(pack, cx, cy, cz, w, d, h, rotY, over = 0.5, o = {}) {
  const half = w / 2 + over, slope = Math.hypot(half, h), ang = Math.atan2(h, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, 0.14, d + over * 2, 1, 1, 1);
    boxUV(g, slope, 0.14, d + over * 2);
    const m = new THREE.Matrix4().makeRotationY(rotY)
      .multiply(new THREE.Matrix4().makeTranslation(s * half / 2, h / 2, 0))
      .multiply(new THREE.Matrix4().makeRotationZ(-s * ang));
    m.premultiply(new THREE.Matrix4().makeTranslation(cx, cy, cz));
    pack.add(MAT.roof, g, m);
    // приподнятые/сбитые дранки поверх (неровный край)
    for (let k = 0; k < Math.round(d * 1.2); k++) {
      const lz = rr(-d / 2 - over, d / 2 + over), lt = rr(0.15, 0.9);
      const lx = s * half * (1 - lt), ly = h * lt + 0.09;
      const c = Math.cos(rotY), sn = Math.sin(rotY);
      box(pack, MAT.roof, 0.9, 0.05, 0.42, M4(cx + lx * c + lz * sn, cy + ly, cz - lx * sn + lz * c, rr(-0.15, 0.15), rotY, -s * ang + rr(-0.2, 0.2)));
    }
  }
  const P = (lx, ly, lz) => { const c = Math.cos(rotY), s = Math.sin(rotY); return V(cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c); };
  // конёк: бревно
  beam(pack, MAT.log, P(0, h + 0.08, -d / 2 - over), P(0, h + 0.08, d / 2 + over), 0.11, 6);
  // слеги крест-накрест на концах конька (как на концептах — длинные, торчат вверх)
  for (const e of [-1, 1]) {
    const lz = e * (d / 2 + over * 0.95);
    const k = o.horns || 1.4;
    beam(pack, MAT.woodDark, P(-0.75, h - 0.6, lz), P(0.9 * k, h + 1.3 * k, lz), 0.09, 6);
    beam(pack, MAT.woodDark, P(0.75, h - 0.6, lz), P(-0.9 * k, h + 1.3 * k, lz), 0.09, 6);
    lashing(pack, P(0, h + 0.2, lz).x, P(0, h + 0.2, lz).y - 0.06, P(0, h + 0.2, lz).z, 0.11);
    // причелины
    for (const s of [-1, 1]) beam(pack, MAT.wood, P(0, h + 0.12, lz), P(s * half, -0.1, lz), 0.07, 5, true);
  }
  // мох и лианы с карниза
  const nm = Math.round(d * 2.0);
  for (let i = 0; i < nm; i++) for (const s of [-1, 1]) {
    const lz = rr(-d / 2 - over, d / 2 + over), p = P(s * (half - 0.05), 0.0, lz);
    if (rnd() < 0.25) vine(pack, p, rr(0.8, 2.4), rotY + Math.PI / 2, 0.15);
    else mossStrand(pack, p.x, p.y + 0.02, p.z, rr(0.3, 1.6), rr(0.12, 0.32), rotY + Math.PI / 2);
  }
}

// перила вдоль отрезка: столбики, жердь, нижняя жердь; часть может быть сломана
export function railing(pack, a, b, y, h = 0.9, broken = 0.12) {
  const len = a.distanceTo(b), n = Math.max(1, Math.round(len / 1.1));
  for (let k = 0; k <= n; k++) { const p = a.clone().lerp(b, k / n); beam(pack, MAT.woodDark, V(p.x, y - 0.1, p.z), V(p.x + rr(-0.03, 0.03), y + h + rr(-0.03, 0.12), p.z), 0.055, 5); }
  if (rnd() < broken) { // сломанная жердь: висит одним концом
    const m = a.clone().lerp(b, rr(0.35, 0.65));
    beam(pack, MAT.wood, V(a.x, y + h, a.z), V(m.x, y + h - 0.05, m.z), 0.045, 5);
    beam(pack, MAT.wood, V(b.x, y + h, b.z), V(m.x + rr(-0.1, 0.1), y + h * 0.35, m.z), 0.045, 5);
  } else beam(pack, MAT.wood, V(a.x, y + h, a.z), V(b.x, y + h + rr(-0.04, 0.04), b.z), 0.05, 5);
  beam(pack, MAT.wood, V(a.x, y + h * 0.45, a.z), V(b.x, y + h * 0.45, b.z), 0.038, 5);
}

// лестница: тетивы от земли до площадки, горизонтальные ступени (подъём ≈ 0,22, проступь ≈ 0,3), перила
// from — низ (на земле или мостках), top — верхняя кромка у площадки. Возвращает отрезок-пандус для ходьбы.
export function stairs(pack, from, top, w = 1.0, o = {}) {
  const rise = top.y - from.y;
  const n = Math.max(2, Math.round(rise / 0.22));
  const dir = V(top.x - from.x, 0, top.z - from.z); const run = dir.length(); dir.normalize();
  const yaw = Math.atan2(dir.x, dir.z), side = V(Math.cos(yaw), 0, -Math.sin(yaw));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, x = from.x + dir.x * run * t, z = from.z + dir.z * run * t, y = from.y + rise * (k + 1) / n - 0.035;
    if (o.broken && k > 0 && k < n - 1 && rnd() < o.broken) continue;
    box(pack, rnd() < 0.3 ? MAT.plankOld : MAT.plank, w * rr(0.96, 1.04), 0.07, Math.min(0.34, run / n + 0.06), M4(x, y, z, 0, yaw + rr(-0.03, 0.03), rr(-0.02, 0.02)));
  }
  for (const s of [-1, 1]) { // тетивы
    const ox = side.x * s * w * 0.5, oz = side.z * s * w * 0.5;
    beam(pack, MAT.woodDark, V(from.x + ox - dir.x * 0.15, from.y - 0.12, from.z + oz - dir.z * 0.15), V(top.x + ox, top.y - 0.02, top.z + oz), 0.075, 5, true);
    // опорный столб внизу и перила
    beam(pack, MAT.woodDark, V(from.x + ox, from.y - 0.5, from.z + oz), V(from.x + ox, from.y + 0.95, from.z + oz), 0.06, 5);
    if (o.rail !== false) beam(pack, MAT.wood, V(from.x + ox, from.y + 0.92, from.z + oz), V(top.x + ox, top.y + 0.95, top.z + oz), 0.04, 5);
  }
  // подпорка под серединой
  if (rise > 1.2) { const m = from.clone().lerp(top, 0.55); beam(pack, MAT.woodDark, V(m.x, from.y - 0.5, m.z), V(m.x, m.y - 0.15, m.z), 0.07, 5); }
  return { a: [from.x, from.z], b: [top.x, top.z], w: w * 0.95, ya: from.y, yb: top.y, y: top.y, ramp: true };
}

// череп рогатого зверя: короб черепа, морда, глазницы, рога ветвятся; на рогах — красные лоскуты
export function skull(pack, x, y, z, s = 1, rotY = 0, antlers = true, rags = false) {
  const base = M4(x, y, z, 0, rotY, 0, s, s, s);
  const add = (mat, geo, m) => pack.add(mat, geo, base.clone().multiply(m));
  add(MAT.bone, new THREE.SphereGeometry(0.2, 9, 7), M4(0, 0, 0, 0, 0, 0, 1, 0.9, 1.1));
  add(MAT.bone, new THREE.CylinderGeometry(0.07, 0.13, 0.42, 7), M4(0, -0.12, 0.2, 1.25, 0, 0));
  for (const sd of [-1, 1]) add(MAT.dark, new THREE.SphereGeometry(0.05, 6, 4), M4(sd * 0.09, 0.0, 0.17, 0, 0, 0, 1, 1, 0.6)); // глазницы
  const seg = (mat, a, b, r) => { const P = new Pack(); beam(P, mat, a, b, r, 5); for (const g of P.parts.get(mat)) add(mat, g, new THREE.Matrix4()); };
  if (antlers) for (const sd of [-1, 1]) {
    const p0 = V(sd * 0.12, 0.12, -0.02), p1 = V(sd * 0.42, 0.42, -0.08), p2 = V(sd * 0.58, 0.85, -0.02), p3 = V(sd * 0.5, 1.2, 0.08);
    seg(MAT.bone, p0, p1, 0.045); seg(MAT.bone, p1, p2, 0.038); seg(MAT.bone, p2, p3, 0.03);
    seg(MAT.bone, p1, V(sd * 0.72, 0.55, 0.1), 0.028); seg(MAT.bone, p2, V(sd * 0.9, 0.98, 0.0), 0.025); seg(MAT.bone, p2, V(sd * 0.32, 1.08, 0.08), 0.024);
    seg(MAT.bone, p3, V(sd * 0.62, 1.4, 0.0), 0.02);
    if (rags) { const P = new Pack(); banner(P, 0, 0, 0, 0.09, rr(0.4, 0.8), 0); for (const g of P.parts.get(MAT.cloth)) add(MAT.cloth, g, M4(sd * 0.7, 0.56, 0.1)); const P2 = new Pack(); banner(P2, 0, 0, 0, 0.08, rr(0.3, 0.6), 0); for (const g of P2.parts.get(MAT.cloth)) add(MAT.cloth, g, M4(sd * 0.88, 0.96, 0.0)); }
  } else for (const sd of [-1, 1]) { seg(MAT.bone, V(sd * 0.15, 0.05, 0), V(sd * 0.45, 0.25, 0.05), 0.05); seg(MAT.bone, V(sd * 0.45, 0.25, 0.05), V(sd * 0.5, 0.5, 0.15), 0.035); }
}

// полотно с узором: полоса с рваным низом (колышется)
export function banner(pack, x, y, z, w, h, rotY) {
  const n = 6, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, yy = -h * t;
    const tear = i === n ? rr(0, 0.25) * h : 0;
    pos.push(-w / 2, yy - (i === n ? rr(0, 0.2) : 0), 0, w / 2, yy - tear, 0);
    uv.push(0, 1 - t, 1, 1 - t);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  pack.add(MAT.cloth, g, M4(x, y, z, 0, rotY, 0));
}

// цепь из звеньев, внизу может висеть кольцо
export function chain(pack, top, len, rotY = 0, ring = false) {
  const n = Math.round(len / 0.09);
  for (let i = 0; i < n; i++) pack.add(MAT.iron, new THREE.TorusGeometry(0.04, 0.012, 4, 8), M4(top.x, top.y - i * 0.085, top.z, Math.PI / 2 * 0, rotY + (i % 2) * Math.PI / 2, 0));
  if (ring) pack.add(MAT.iron, new THREE.TorusGeometry(0.12, 0.022, 5, 14), M4(top.x, top.y - n * 0.085 - 0.1, top.z, 0, rotY, 0));
}

// окно: свечение в проёме + рама + переплёт + наличник; ставня приоткрыта
export function windowLit(pack, glowPack, mat, x, y, z, rotY, w = 0.6, h = 0.75, o = {}) {
  const fr = M4(x, y, z, 0, rotY, 0);
  glowPack.add(mat, new THREE.PlaneGeometry(w, h), fr.clone().multiply(M4(0, 0, -0.04)));
  const P = new Pack();
  const bx = (sx, sy, sz, px, py, pz) => box(P, MAT.woodDark, sx, sy, sz, M4(px, py, pz));
  bx(w + 0.24, 0.1, 0.16, 0, -h / 2 - 0.05, 0.03); bx(w + 0.3, 0.12, 0.18, 0, h / 2 + 0.06, 0.03);
  bx(0.09, h, 0.14, -w / 2 - 0.045, 0, 0.03); bx(0.09, h, 0.14, w / 2 + 0.045, 0, 0.03);
  bx(0.04, h, 0.05, 0, 0, 0.0); bx(w, 0.04, 0.05, 0, h * 0.1, 0.0);
  if (o.shutter !== false) { const sd = rnd() < 0.5 ? -1 : 1; box(P, MAT.wood, w * 0.5, h, 0.04, M4(sd * (w / 2 + 0.1 + w * 0.2), 0, 0.12 + w * 0.12, 0, sd * 0.9, 0)); }
  if (o.sill !== false) bx(w + 0.4, 0.06, 0.28, 0, -h / 2 - 0.12, 0.1);
  for (const [mat2, list] of P.parts) for (const g of list) pack.add(mat2, g, fr);
}

// фонарь: короб с огнём, висит на крюке или цепи; возвращает точку света
export function lantern(pack, glowPack, x, y, z, s = 1, mat = MAT.winOrange) {
  box(pack, MAT.iron, 0.24 * s, 0.03 * s, 0.24 * s, M4(x, y + 0.16 * s, z));
  box(pack, MAT.iron, 0.26 * s, 0.03 * s, 0.26 * s, M4(x, y - 0.17 * s, z));
  pack.add(MAT.iron, new THREE.ConeGeometry(0.18 * s, 0.14 * s, 4), M4(x, y + 0.24 * s, z, 0, Math.PI / 4, 0));
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(pack, MAT.iron, V(x + a * 0.11 * s, y - 0.17 * s, z + b * 0.11 * s), V(x + a * 0.11 * s, y + 0.16 * s, z + b * 0.11 * s), 0.012 * s, 4);
  glowPack.add(mat, new THREE.BoxGeometry(0.19 * s, 0.28 * s, 0.19 * s), M4(x, y, z));
  pack.add(MAT.iron, new THREE.TorusGeometry(0.05 * s, 0.01 * s, 4, 8), M4(x, y + 0.33 * s, z));
  return V(x, y, z);
}

// гроздь светящихся грибов (шляпки светятся голубым/зелёным)
export function shrooms(pack, glowPack, x, y, z, n = 5, s = 1, mat = MAT.shroom, ny = [0, 1, 0]) {
  for (let i = 0; i < n; i++) {
    const h = rr(0.08, 0.28) * s, r = rr(0.05, 0.14) * s, px = x + rr(-0.25, 0.25) * s, pz = z + rr(-0.25, 0.25) * s;
    beam(pack, MAT.stalk, V(px, y - 0.02, pz), V(px + ny[0] * h, y + h * ny[1], pz + ny[2] * h), r * 0.25, 5);
    glowPack.add(mat, new THREE.SphereGeometry(r, 8, 4, 0, 6.29, 0, 1.4), M4(px + ny[0] * h, y + h * ny[1] - r * 0.15, pz + ny[2] * h, rr(-0.2, 0.2), 0, rr(-0.2, 0.2), 1, 0.6, 1));
  }
}

export { mergeGeometries };
