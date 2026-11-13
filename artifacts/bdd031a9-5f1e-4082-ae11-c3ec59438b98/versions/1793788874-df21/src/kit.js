// Набор деталей логова: доски, брёвна, сваи, крыши с мхом, лестницы, перила, черепа, рога, полотна с узором.
// Всё строится кодом; детали одного материала сливаются в один меш (быстро), у крупных форм контур пером.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, glow, inkMat } from './toon.js';

let _s = 7;
export const rnd = () => ((_s = (_s * 16807) % 2147483647) / 2147483647);
export const rr = (a, b) => a + (b - a) * rnd();
export const setSeed = (s) => { _s = s; };

// ---------- текстуры (рисуются на холсте) ----------
function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// красное полотно с ромбами и рунами (как на идолах и избах концептов)
export const clothTex = canvasTex(128, 512, (g, w, h) => {
  g.fillStyle = '#8c2a1c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '40,10,6' : '190,90,60'},${0.08 + rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 10, 1 + rnd() * 3); }
  g.strokeStyle = '#e0a070'; g.lineWidth = 5;
  g.strokeRect(10, 10, w - 20, h - 20);
  for (let k = 0; k < 4; k++) {
    const cy = 70 + k * 115, cx = w / 2, r = 34;
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx, cy - r * 0.45); g.lineTo(cx + r * 0.45, cy); g.lineTo(cx, cy + r * 0.45); g.lineTo(cx - r * 0.45, cy); g.closePath(); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r, cy); g.lineTo(cx + s * (r + 12), cy - 12); g.moveTo(cx + s * r, cy); g.lineTo(cx + s * (r + 12), cy + 12); g.stroke(); }
  }
});
// фронтон: тёмные доски и красное колесо-оберег
export const gableTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a2a1e'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 24) { g.fillStyle = `rgb(${50 + rnd() * 20},${36 + rnd() * 14},${26 + rnd() * 10})`; g.fillRect(x + 1, 0, 22, h); g.fillStyle = '#1c130d'; g.fillRect(x, 0, 2, h); }
  g.fillStyle = '#4a1e16'; g.fillRect(36, 40, w - 72, h - 40);
  g.strokeStyle = '#b23a2c'; g.lineWidth = 8;
  const cx = w / 2, cy = h * 0.6, r = 62;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(cx, cy, r * 0.32, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.32, cy + Math.sin(a) * r * 0.32); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(20,10,6,${rnd() * 0.25})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 6, 1 + rnd() * 2); }
});
// дранка крыши: ряды дощечек, мох пятнами
export const roofTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3b3024'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 22) for (let x = -(y / 22 % 2) * 14; x < w; x += 28) {
    const c = 48 + rnd() * 26; g.fillStyle = `rgb(${c},${c * 0.8},${c * 0.6})`; g.fillRect(x + 1, y + 1, 26, 20 + rnd() * 3);
    g.fillStyle = 'rgba(15,10,6,0.6)'; g.fillRect(x, y + 19, 28, 3);
  }
  for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 26; g.fillStyle = `rgba(${70 + rnd() * 40},${100 + rnd() * 40},${40 + rnd() * 20},${0.55 + rnd() * 0.35})`; g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd(), 0, Math.PI * 2); g.fill(); }
});

// ---------- материалы ----------
export const MAT = {
  wood: paint({ base: '#5a4634', moss: '#4f6b2c', mossAmt: 0.55, wood: 1, stroke: [0, 1, 0], strokeAmt: 0.18, drip: 0.6, break: 0.24 }),
  woodDark: paint({ base: '#3d2f24', moss: '#45602a', mossAmt: 0.5, wood: 1, stroke: [0, 1, 0], strokeAmt: 0.16, drip: 0.5 }),
  plank: paint({ base: '#5f4b37', moss: '#5a7430', mossAmt: 0.45, wood: 1, stroke: [1, 0, 0], strokeAmt: 0.16, wet: 0.6 }),
  log: paint({ base: '#5b4532', moss: '#4f6b2c', mossAmt: 0.35, wood: 0.8, stroke: [1, 0, 0], strokeAmt: 0.2 }),
  roof: paint({ base: '#ffffff', map: roofTex, moss: '#5e7c32', mossAmt: 0.4, stroke: [1, 0, 0], strokeAmt: 0.12, drip: 0.2 }),
  gable: paint({ base: '#ffffff', map: gableTex, strokeAmt: 0.08, rim: 0.6 }),
  cloth: paint({ base: '#ffffff', map: clothTex, strokeAmt: 0.1, side: THREE.DoubleSide, sway: 1, rim: 0.5 }),
  bone: paint({ base: '#cdbfa2', strokeAmt: 0.1, break: 0.18, rim: 1.2, moss: '#6a7a3a', mossAmt: 0.12 }),
  moss: paint({ base: '#56742e', strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.2, rim: 0.4, break: 0.3 }),
  bark: paint({ base: '#463a2e', moss: '#506c2c', mossAmt: 0.6, stroke: [0, 1, 0], strokeAmt: 0.45, drip: 0.8, break: 0.3, rim: 1.0 }),
  iron: paint({ base: '#4a4b4c', strokeAmt: 0.08, rim: 1.4, wet: 0.5 }),
  stone: paint({ base: '#6b6a5e', moss: '#55702c', mossAmt: 0.5, strokeAmt: 0.12 }),
  winGreen: glow('#c8f05a', { k: 2.2, flick: 0.4 }),
  winOrange: glow('#ffa040', { k: 2.0, flick: 0.6 }),
  ember: glow('#ff7a26', { k: 1.8, flick: 1.0 }),
};
MAT.moss.userData.noInk = true; MAT.cloth.userData.noInk = true;

// ---------- сборка ----------
// Пакет: детали по материалам; build() сливает и даёт группу с контуром
export class Pack {
  constructor() { this.parts = new Map(); }
  add(mat, geo, m4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.deleteAttribute('color');
    if (m4) g.applyMatrix4(m4);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(g);
  }
  build(outline = true, shadow = true) {
    const grp = new THREE.Group();
    for (const [mat, list] of this.parts) {
      const geo = mergeGeometries(list, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      grp.add(mesh);
      if (outline && !(mat.uniforms && mat.uniforms.uCol) && !mat.userData.noInk) { const o = new THREE.Mesh(geo, inkMat); grp.add(o); }
    }
    return grp;
  }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s3 = new THREE.Vector3();
export function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s3.set(sx, sy, sz));
}
// брусок/бревно между двумя точками
export function beam(pack, mat, a, b, r = 0.1, seg = 6, square = false) {
  const d = _v.subVectors(b, a); const len = d.length();
  const geo = square ? new THREE.BoxGeometry(r * 2, len, r * 2) : new THREE.CylinderGeometry(r * rr(0.85, 1.0), r, len, seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = new THREE.Matrix4().compose(a.clone().addScaledVector(d, 0.5), q, new THREE.Vector3(1, 1, 1));
  pack.add(mat, geo, m);
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export { V };

// неровная доска: чуть повёрнута и разной длины
export function plank(pack, mat, x, y, z, len, w, rotY, th = 0.07) {
  const g = new THREE.BoxGeometry(len * rr(0.92, 1.06), th, w * rr(0.85, 1.0));
  pack.add(mat, g, M4(x + rr(-0.03, 0.03), y + rr(-0.02, 0.02), z, rr(-0.04, 0.04), rotY + rr(-0.05, 0.05), rr(-0.03, 0.03)));
}

// мостки по ломаной: доски поперёк, лаги, сваи; возвращает отрезки для ходьбы
export function boardwalk(pack, pts, y = 0.22, w = 1.7, groundAt) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz);
    const n = Math.max(1, Math.round(len / 0.32));
    for (let k = 0; k < n; k++) {
      if (rnd() < 0.05) continue; // выпавшая доска
      const t = (k + 0.5) / n, x = a[0] + dx * t, z = a[1] + dz * t;
      plank(pack, MAT.plank, x, y, z, w, 0.27, yaw + Math.PI / 2);
    }
    for (const s of [-1, 1]) { // лаги
      const ox = Math.cos(yaw) * s * w * 0.35, oz = -Math.sin(yaw) * s * w * 0.35;
      beam(pack, MAT.woodDark, V(a[0] + ox, y - 0.09, a[1] + oz), V(b[0] + ox, y - 0.09, b[1] + oz), 0.06, 5);
    }
    const ns = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k <= ns; k++) { // сваи
      const t = k / ns, x = a[0] + dx * t, z = a[1] + dz * t;
      for (const s of [-1, 1]) {
        const ox = Math.cos(yaw) * s * w * 0.42, oz = -Math.sin(yaw) * s * w * 0.42;
        const gy = groundAt(x + ox, z + oz);
        beam(pack, MAT.woodDark, V(x + ox, gy - 0.4, z + oz), V(x + ox + rr(-0.05, 0.05), y + rr(0.05, 0.5) * (rnd() < 0.3 ? 1 : 0.1), z + oz), 0.07, 5);
      }
    }
    segs.push({ a, b, w, y });
  }
  return segs;
}

// свисающий мох: полоса с рваным низом, слегка закручена
export function mossStrand(pack, x, y, z, len, wid = 0.25, rotY = 0) {
  const n = 5, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, ww = wid * (1 - t * 0.7) * (0.8 + rnd() * 0.4), yy = -len * t, sw = Math.sin(t * 3 + rnd()) * 0.05;
    pos.push(-ww / 2 + sw, yy, 0, ww / 2 + sw, yy - rr(0, 0.15) * t, 0);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  pack.add(MAT.moss, g, M4(x, y, z, 0, rotY, 0));
}

// крыша-домик из двух скатов (дранка), с выступом и перекрещенными коньковыми слегами
export function gableRoof(pack, cx, cy, cz, w, d, h, rotY, over = 0.5) {
  const half = w / 2 + over, slope = Math.hypot(half, h), ang = Math.atan2(h, half);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(slope, 0.12, d + over * 2, 1, 1, 1);
    // uv по размеру ската: дранка одного масштаба на всех крышах
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * slope / 2.2, uv.getY(i) * (d + over * 2) / 2.2);
    const m = new THREE.Matrix4().makeRotationY(rotY)
      .multiply(new THREE.Matrix4().makeTranslation(s * half / 2, h / 2, 0))
      .multiply(new THREE.Matrix4().makeRotationZ(-s * ang));
    m.premultiply(new THREE.Matrix4().makeTranslation(cx, cy, cz));
    pack.add(MAT.roof, g, m);
  }
  // слеги крест-накрест на концах конька
  for (const e of [-1, 1]) {
    const lz = e * (d / 2 + over * 0.9);
    const p = (lx, ly) => { const c = Math.cos(rotY), s = Math.sin(rotY); return V(cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c); };
    beam(pack, MAT.woodDark, p(-0.6, h - 0.5), p(0.9, h + 1.3), 0.08, 5);
    beam(pack, MAT.woodDark, p(0.6, h - 0.5), p(-0.9, h + 1.3), 0.08, 5);
  }
  // мох свисает с карниза
  const nm = Math.round(d * 1.6);
  for (let i = 0; i < nm; i++) for (const s of [-1, 1]) {
    const lz = rr(-d / 2 - over, d / 2 + over), lx = s * (half - 0.05);
    const c = Math.cos(rotY), sn = Math.sin(rotY);
    mossStrand(pack, cx + lx * c + lz * sn, cy + 0.02, cz - lx * sn + lz * c, rr(0.3, 1.4), rr(0.12, 0.3), rotY + Math.PI / 2);
  }
}

// перила вдоль отрезка
export function railing(pack, a, b, y, h = 0.9) {
  const len = a.distanceTo(b), n = Math.max(1, Math.round(len / 1.1));
  for (let k = 0; k <= n; k++) { const p = a.clone().lerp(b, k / n); beam(pack, MAT.woodDark, V(p.x, y, p.z), V(p.x + rr(-0.04, 0.04), y + h + rr(-0.05, 0.12), p.z), 0.05, 5); }
  beam(pack, MAT.wood, V(a.x, y + h, a.z), V(b.x, y + h + rr(-0.06, 0.06), b.z), 0.045, 5);
  beam(pack, MAT.wood, V(a.x, y + h * 0.5, a.z), V(b.x, y + h * 0.5, b.z), 0.035, 5);
}

// лестница: от земли к площадке
export function stairs(pack, from, to, w = 1.0) {
  const d = to.clone().sub(from), len = Math.hypot(d.x, d.z), n = Math.max(3, Math.round(d.y / 0.24));
  const yaw = Math.atan2(d.x, d.z);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, p = from.clone().lerp(to, t);
    plank(pack, MAT.plank, p.x, p.y, p.z, w, 0.28, yaw + Math.PI / 2, 0.06);
  }
  for (const s of [-1, 1]) {
    const ox = Math.cos(yaw) * s * w * 0.5, oz = -Math.sin(yaw) * s * w * 0.5;
    beam(pack, MAT.woodDark, V(from.x + ox, from.y - 0.2, from.z + oz), V(to.x + ox, to.y, to.z + oz), 0.06, 5, true);
  }
  return { len, yaw };
}

// череп рогатого зверя (олень/бык): короб черепа, морда, глазницы темнее, рога ветвятся
export function skull(pack, x, y, z, s = 1, rotY = 0, antlers = true) {
  const base = M4(x, y, z, 0, rotY, 0, s, s, s);
  const add = (geo, m) => pack.add(MAT.bone, geo, base.clone().multiply(m));
  add(new THREE.SphereGeometry(0.2, 8, 6), M4(0, 0, 0, 0, 0, 0, 1, 0.9, 1.1));
  add(new THREE.CylinderGeometry(0.07, 0.13, 0.42, 6), M4(0, -0.12, 0.2, 1.25, 0, 0));
  if (antlers) for (const sd of [-1, 1]) {
    const p0 = V(sd * 0.12, 0.12, -0.02), p1 = V(sd * 0.42, 0.42, -0.08), p2 = V(sd * 0.55, 0.85, -0.02), p3 = V(sd * 0.48, 1.15, 0.08);
    const seg = (a, b, r) => { const P = new Pack(); beam(P, MAT.bone, a, b, r, 5); for (const g of P.parts.get(MAT.bone)) add(g, new THREE.Matrix4()); };
    seg(p0, p1, 0.045); seg(p1, p2, 0.038); seg(p2, p3, 0.03);
    seg(p1, V(sd * 0.7, 0.55, 0.05), 0.028); seg(p2, V(sd * 0.85, 0.95, 0.0), 0.025); seg(p2, V(sd * 0.32, 1.05, 0.05), 0.024);
  } else for (const sd of [-1, 1]) {
    const P = new Pack(); beam(P, MAT.bone, V(sd * 0.15, 0.05, 0), V(sd * 0.45, 0.25, 0.05), 0.05, 5); beam(P, MAT.bone, V(sd * 0.45, 0.25, 0.05), V(sd * 0.5, 0.5, 0.15), 0.035, 5);
    for (const g of P.parts.get(MAT.bone)) add(g, new THREE.Matrix4());
  }
}

// полотно с узором: полоса с рваным низом (колышется от ветра)
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

// цепь из звеньев
export function chain(pack, top, len, rotY = 0) {
  const n = Math.round(len / 0.09);
  for (let i = 0; i < n; i++) {
    const g = new THREE.TorusGeometry(0.04, 0.012, 4, 8);
    pack.add(MAT.iron, g, M4(top.x, top.y - i * 0.085, top.z, Math.PI / 2, rotY + (i % 2) * Math.PI / 2, 0));
  }
}

// окно со светом: проём (свечение) + рама + наличник + козырёк
export function windowLit(pack, glowPack, mat, x, y, z, rotY, w = 0.6, h = 0.75) {
  const fr = M4(x, y, z, 0, rotY, 0);
  glowPack.add(mat, new THREE.PlaneGeometry(w, h), fr.clone().multiply(M4(0, 0, 0.02)));
  const P = new Pack();
  beam(P, MAT.woodDark, V(-w / 2 - 0.06, -h / 2 - 0.06, 0.05), V(w / 2 + 0.06, -h / 2 - 0.06, 0.05), 0.05, 4, true);
  beam(P, MAT.woodDark, V(-w / 2 - 0.06, h / 2 + 0.06, 0.05), V(w / 2 + 0.06, h / 2 + 0.06, 0.05), 0.05, 4, true);
  beam(P, MAT.woodDark, V(-w / 2 - 0.04, -h / 2, 0.05), V(-w / 2 - 0.04, h / 2, 0.05), 0.045, 4, true);
  beam(P, MAT.woodDark, V(w / 2 + 0.04, -h / 2, 0.05), V(w / 2 + 0.04, h / 2, 0.05), 0.045, 4, true);
  beam(P, MAT.woodDark, V(0, -h / 2, 0.04), V(0, h / 2, 0.04), 0.025, 4, true);   // переплёт
  beam(P, MAT.woodDark, V(-w / 2, 0.05, 0.04), V(w / 2, 0.05, 0.04), 0.025, 4, true);
  for (const g of P.parts.get(MAT.woodDark)) pack.add(MAT.woodDark, g, fr);
}
