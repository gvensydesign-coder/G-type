// Тестовая сцена: лесная поляна, мшистый каменный страж, деревья, кулисы, небо, облака, дымка, трава.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  G, paintMat, foliageMat, FOLIAGE_PALETTES, skyMat, cloudMat, backdropMat, hazeCardMat,
  grassMat, flameMat, dustMat, birdMat, vineMat,
} from './materials.js';
import { NOISE, GLOBAL_DECL } from './glsl.js';

// ---------- детерминированный случайный ----------
let _s = 1234567;
export const rnd = () => ((_s = (_s * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + (b - a) * rnd();
function n3(x, y, z) { // дешёвый гладкий шум для смещения вершин
  return Math.sin(x * 1.7 + Math.sin(y * 2.3) * 1.3) * Math.sin(y * 1.9 + Math.sin(z * 1.1) * 1.7) * Math.sin(z * 2.1 + Math.sin(x * 1.5));
}

// ---------- материалы сцены ----------
export const M = {
  stone: paintMat({
    base: '#d9c6b0', litTint: [1.12, 1.0, 0.84], shadeTint: [1.0, 0.96, 1.04], // тёплый бежево-персиковый, как в видео
    patchA: { col: '#c56f42', scale: 0.45, th: 0.72, edge: 0.6, amt: 1 },     // ржавчина
    patchB: { col: '#7d989a', scale: 0.28, th: 0.66, edge: 0.45, amt: 0.9 }, // бирюзовый лишайник
    patchC: { col: '#a596ad', scale: 0.9, th: 0.7, edge: 0.7, amt: 0.6 },  // сиреневые подтёки (реже)
    strokeDir: [0, 0.4, 0], strokeAmt: 0.16, seam: 1, seamFreq: [0.3, 0.42], break: 0.24, rim: 0.35,
    wear: 1, grime: 1, streak: 0.5, runes: 1, crack: 1,
  }),
  metal: paintMat({
    base: '#87a3a6', litTint: [1.1, 1.02, 0.86],
    patchA: { col: '#b8683e', scale: 0.8, th: 0.64, edge: 0.6, amt: 1 },
    patchB: { col: '#e2c597', scale: 0.5, th: 0.66, edge: 0.5, amt: 0.8 },
    patchC: { col: '#5d6f7a', scale: 1.4, th: 0.6, edge: 0.6, amt: 0.6 },
    strokeAmt: 0.12, seam: 1, seamFreq: [0.9, 1.3], break: 0.2, rim: 0.35,
    gloss: 1, streak: 1, wear: 0.6, grime: 0.6,
  }),
  rust: paintMat({ base: '#8e3c2c', patchA: { col: '#b85b38', scale: 1.4, th: 0.58, amt: 1 }, strokeAmt: 0.2, break: 0.2, wear: 0.5, grime: 0.8 }),
  dark: paintMat({ base: '#4c4448', strokeAmt: 0.1, break: 0.15, rim: 0.5, gloss: 0.5 }),
  goggle: paintMat({ base: '#6aa6a0', litTint: [1.05, 1.05, 0.95], gloss: 1, strokeAmt: 0.08, break: 0.1, rim: 0.4, brush: 0.3,
    patchB: { col: '#4f8a88', scale: 1.5, th: 0.58, edge: 0.3, amt: 1 } }),
  glass: paintMat({ base: '#c69a52', pattern: 3, strokeAmt: 0.08, break: 0.1, rim: 0.3 }),
  fan: paintMat({ base: '#e9d6b4', pattern: 1, strokeAmt: 0.08, break: 0.15, side: THREE.DoubleSide }),
  bark: paintMat({
    base: '#4a3a30', strokeDir: [0, 2.5, 0], strokeAmt: 0.55, shadeTint: [0.8, 0.85, 0.9],
    patchA: { col: '#4d7748', scale: 0.3, th: 0.74, edge: 0.9, amt: 1 },     // плющ
    patchB: { col: '#7c8a6a', scale: 0.9, th: 0.74, edge: 0.6, amt: 0.6 },   // лишайник
    break: 0.3, rim: 1.2, grime: 1,
  }),
  ground: paintMat({
    base: '#b9b26a', pattern: 2,
    patchA: { col: '#5d7d47', scale: 0.12, th: 0.56, edge: 0.5, amt: 1 },
    patchB: { col: '#d8cc80', scale: 0.09, th: 0.62, edge: 0.4, amt: 1 },
    patchC: { col: '#7d8f4c', scale: 0.4, th: 0.6, edge: 0.6, amt: 0.8 },
    strokeDir: [1, 0, 0.3], strokeAmt: 0.22, break: 0.25, rim: 0,
  }),
  moss: foliageMat({ palette: FOLIAGE_PALETTES.moss, leaf: 8.0, flowers: 2.5, speck: 1, wet: 1 }),
  // пушистый край мха: два полупрозрачных слоя над комьями, остаются только ворсинки
  mossFuzz1: foliageMat({ palette: FOLIAGE_PALETTES.moss, leaf: 8.0, speck: 0.6, wet: 1, shell: 0.035, shellCut: 0.5 }),
  mossFuzz2: foliageMat({ palette: FOLIAGE_PALETTES.moss, leaf: 8.0, speck: 0.4, wet: 1, shell: 0.075, shellCut: 0.64 }),
  leaves: foliageMat({ palette: FOLIAGE_PALETTES.forest, leaf: 1.6, speck: 1, sway: 0.4 }),
  bush: foliageMat({ palette: FOLIAGE_PALETTES.forest, leaf: 1.6, speck: 1, sway: 0.4, push: true }), // кусты раздвигаются
  canopy: foliageMat({ palette: FOLIAGE_PALETTES.canopy, leaf: 1.5, speck: 1, sway: 0.25, nAmp: 0.75 }),
  vines: foliageMat({ palette: ['#183a37', '#2f5a48', '#557d55', '#8fa860'], leaf: 3.5, speck: 0.8, sway: 1.2 }),
};

// ---------- контур (inverted hull): тонкая тушевая линия силуэта ----------
const outlineMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: Object.assign({ uW: { value: 0.0045 } }, G),
  vertexShader: `uniform float uW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); float d = length(cameraPosition - w.xyz);
    vec3 n = normalize(mat3(modelMatrix)*normal);
    float k = 0.55 + 0.9 * (0.5 + 0.5 * sin(w.x * 2.3 + sin(w.y * 3.1) * 1.7 + w.z * 1.9)); // нажим пера: линия то тоньше, то толще
    w.xyz += n * uW * d * k; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float uHazeOn; void main(){ gl_FragColor = vec4(0.16,0.13,0.17,1.0);
    #include <colorspace_fragment>
  }`,
});
export const outlines = [];
function addOutline(mesh) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  o.position.copy(mesh.position); o.quaternion.copy(mesh.quaternion); o.scale.copy(mesh.scale);
  o.userData.isOutline = true;
  mesh.parent.add(o); outlines.push(o);
}
export const outlineUniform = outlineMat.uniforms.uW;
export const addOutlineTo = addOutline;

// ---------- комья листвы/мха ----------
const _sZ = (x) => -9.5 + 2.2 * Math.sin(x * 0.11 + 0.6) + 0.8 * Math.sin(x * 0.27);
const _sW = (x) => 1.25 + 0.4 * Math.sin(x * 0.19 + 1.0);
export const nearStream = (x, z, pad = 0) => Math.abs(z - _sZ(x)) - _sW(x) < pad;
export function groundY(x, z) {
  return (Math.sin(x * 0.05) * Math.cos(z * 0.04) * 0.8 + Math.sin(x * 0.13 + z * 0.07) * 0.3) * Math.min(1, Math.hypot(x, z) / 25);
}
function addFuzz(parent, mesh) { // слои ворса поверх кома мха
  for (const mat of [M.mossFuzz1, M.mossFuzz2]) { const f = new THREE.Mesh(mesh.geometry, mat); f.position.copy(mesh.position); f.receiveShadow = true; parent.add(f); }
}
export function clumpGeo(cx, cy, cz, r, sy = 1, detail = 2, nrmDir = null) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position; const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  if (nrmDir) q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrmDir);
  const sx = rnd() * 10;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + 0.28 * n3(v.x * 2 + sx, v.y * 2, v.z * 2) + 0.12 * n3(v.x * 5, v.y * 5 + sx, v.z * 5);
    v.multiplyScalar(d * r); v.y *= sy;
    if (nrmDir) v.applyQuaternion(q);
    p.setXYZ(i, v.x + cx, v.y + cy, v.z + cz);
  }
  g.computeVertexNormals();
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { c[i * 3] = cx; c[i * 3 + 1] = cy - r * sy * 0.35; c[i * 3 + 2] = cz; }
  g.setAttribute('aCenter', new THREE.BufferAttribute(c, 3));
  return g;
}
export function clumpMesh(geos, mat) {
  const m = new THREE.Mesh(mergeGeometries(geos), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------- травинки из мха: берём верхние вершины комьев ----------
function makeTufts(geos, count) {
  const pts = [];
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i += 3) if (n.getY(i) > 0.55) pts.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const m = pts.length / 3; count = Math.min(count, m * 2);
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.03, 0, 0, 0.03, 0, 0, -0.018, 0.45, 0, 0.018, 0.45, 0, 0, 1, 0], 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const g = new THREE.InstancedBufferGeometry(); g.index = blade.index; g.attributes.position = blade.attributes.position;
  const off = new Float32Array(count * 3), hs = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rnd() * m) * 3;
    off[i * 3] = pts[k] + rr(-0.05, 0.05); off[i * 3 + 1] = pts[k + 1] - 0.03; off[i * 3 + 2] = pts[k + 2] + rr(-0.05, 0.05);
    hs[i * 2] = rr(0.12, 0.38); hs[i * 2 + 1] = rr(0.6, 1.4);
  }
  g.setAttribute('offset', new THREE.InstancedBufferAttribute(off, 3));
  g.setAttribute('hs', new THREE.InstancedBufferAttribute(hs, 2));
  g.instanceCount = count;
  const mat = grassMat();
  mat.uniforms.uBase.value.set('#3f6a45'); mat.uniforms.uTip.value.set('#9fb662'); mat.uniforms.uLitTip.value.set('#e2dc96');
  mat.uniforms.uFlower = { value: 1.8 }; // много белых и сиреневых цветов во мху, как в видео
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false;
  return mesh;
}

// ---------- страж: каменный механизм, заросший мхом ----------
export function makeGuardian() {
  const grp = new THREE.Group();
  const parts = [];
  const box = (w, h, d, x, y, z, mat = M.stone, r = 0.45, rot = null) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)), mat);
    m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true; grp.add(m); parts.push(m); addOutline(m); return m;
  };
  const cyl = (rt, rb, h, x, y, z, mat, rot = null, seg = 18) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1), mat);
    m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true; grp.add(m); parts.push(m); addOutline(m); return m;
  };
  // ноги и ступни
  for (const s of [-1, 1]) {
    box(1.7, 0.8, 2.3, s * 1.35, 0.4, 0.15);
    box(1.5, 3.0, 1.6, s * 1.3, 2.2, 0);
    box(1.62, 0.28, 1.72, s * 1.3, 2.6, 0, M.rust, 0.1);
  }
  box(3.8, 1.3, 2.3, 0, 4.1, 0);                // таз
  box(4.8, 3.7, 3.3, 0, 6.3, 0, M.stone, 0.7);  // корпус
  box(4.9, 0.3, 3.4, 0, 5.05, 0, M.rust, 0.12); // ржавый пояс
  // иллюминатор на груди
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.17, 10, 32), M.metal);
  ring.position.set(0, 6.4, 1.72); ring.castShadow = true; grp.add(ring); parts.push(ring); addOutline(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), M.glass);
  glass.position.set(0, 6.4, 1.70); grp.add(glass); parts.push(glass);
  for (let i = 0; i < 4; i++) { // 8 спиц и внутреннее кольцо, как на иллюминаторе в видео
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.05), M.dark);
    sp.position.set(0, 6.4, 1.73); sp.rotation.z = (i / 4) * Math.PI; grp.add(sp);
  }
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 32), M.dark); inner.position.set(0, 6.4, 1.73); grp.add(inner);
  cyl(0.11, 0.11, 0.1, 0, 6.4, 1.74, M.dark, [Math.PI / 2, 0, 0]);
  // голова с визором
  // круглая голова, как в видео: купол с бирюзовыми очками-визором
  const headG = new THREE.SphereGeometry(1, 36, 22); headG.scale(1.2, 0.92, 1.05);
  const head = new THREE.Mesh(headG, M.stone); head.position.set(0, 9.05, 0.1);
  head.castShadow = head.receiveShadow = true; grp.add(head); parts.push(head); addOutline(head);
  for (const s of [-1, 1]) {
    cyl(0.46, 0.46, 0.24, s * 0.5, 8.9, 1.03, M.metal, [Math.PI / 2, 0, 0], 22);        // оправа, наполовину в куполе
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.37, 28), M.goggle);
    lens.position.set(s * 0.5, 8.9, 1.155); grp.add(lens); parts.push(lens);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.075, 0.03), M.dark);         // тёмная прорезь
    slit.position.set(s * 0.5, 8.9, 1.17); grp.add(slit);
  }
  box(0.2, 0.18, 0.2, 0, 8.9, 1.1, M.dark, 0.05);                                          // перемычка очков
  box(0.2, 1.0, 0.25, 0, 9.55, 1.0, M.rust, 0.08);
  // плечи и руки
  for (const s of [-1, 1]) {
    box(1.9, 1.7, 2.1, s * 3.25, 7.4, 0, M.stone, 0.6);
    box(1.96, 0.25, 2.16, s * 3.25, 6.95, 0, M.rust, 0.1);
    box(1.1, 2.3, 1.1, s * 3.35, 5.5, 0.05);
    box(1.35, 2.4, 1.45, s * 3.4, 3.4, 0.25, M.metal, 0.4);
    box(1.4, 0.24, 1.5, s * 3.4, 3.9, 0.25, M.rust, 0.08);
    box(1.4, 1.0, 1.5, s * 3.4, 1.75, 0.35, M.stone, 0.4);
    // сопла на спине предплечий
    cyl(0.32, 0.42, 0.6, s * 3.4, 3.6, -0.95, M.dark, [Math.PI / 2, 0, 0], 14);
  }
  // сопла на спине корпуса
  for (const s of [-1, 1]) cyl(0.42, 0.55, 0.8, s * 1.2, 6.8, -1.95, M.dark, [Math.PI / 2 - 0.4, 0, 0], 14);
  // вертушки над головой
  cyl(0.09, 0.09, 2.6, 0, 10.35, -0.4, M.dark, [0, 0, Math.PI / 2], 8);
  const fans = [];
  for (const s of [-1, 1]) {
    cyl(0.09, 0.09, 1.2, s * 0.6, 9.85, -0.4, M.dark, null, 8);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), M.fan);
    f.position.set(s * 1.32, 10.35, -0.25); f.castShadow = true; grp.add(f); fans.push(f);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 28), M.dark);
    rim.position.copy(f.position); grp.add(rim);
  }

  // пламя двигателей
  const flames = [];
  const fm = flameMat();
  const addFlame = (x, y, z, rx) => {
    const g = new THREE.ConeGeometry(0.5, 2.7, 16, 6, true); g.translate(0, 1.35, 0); // короткий конус, как в видео // широкое основание у сопла, остриё по +y
    const f = new THREE.Mesh(g, fm); f.position.set(x, y, z); f.rotation.x = rx; f.renderOrder = 5; grp.add(f); flames.push(f);
  };
  for (const s of [-1, 1]) { addFlame(s * 3.4, 3.6, -1.25, -Math.PI / 2 - 0.1); addFlame(s * 1.2, 6.65, -2.35, -Math.PI / 2 - 0.4 + 0.0); }

  grp.updateMatrixWorld(true);

  // мох: бросаем лучи сверху и сбоку, кладём комья на поверхность
  const ray = new THREE.Raycaster();
  const geos = [], geosBig = [];
  const targets = parts.filter((p) => p.material !== M.glass);
  const tryPlace = (o, d, minNy, rMin, rMax, list) => {
    ray.set(o, d);
    const h = ray.intersectObjects(targets, false)[0];
    if (!h) return;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.y < minNy) return;
    const lp = grp.worldToLocal(h.point.clone());
    if (lp.y > 5.2 && lp.y < 7.6 && Math.abs(lp.x) < 1.4 && lp.z > 1.0) return; // не закрывать иллюминатор
    if (lp.y > 8.1 && lp.y < 10 && Math.abs(lp.x) < 1.2 && n.z > 0.3) return;  // и лицо с визором
    if (lp.y > 8.1 && Math.abs(lp.x) < 1.15 && rnd() < 0.85) return;           // на голове мха почти нет
    const r = rr(rMin, rMax);
    list.push(clumpGeo(h.point.x + n.x * r * 0.25, h.point.y + n.y * r * 0.22, h.point.z + n.z * r * 0.25, r, 0.45, 2, n)); // площе: клочья, а не шары
  };
  for (let i = 0; i < 720; i++) { // сверху: густые шапки
    tryPlace(new THREE.Vector3(rr(-4.4, 4.4), 14, rr(-1.8, 1.8)), new THREE.Vector3(0, -1, 0), 0.5, 0.25, 0.62, geos);
  }
  for (let i = 0; i < 300; i++) { // сбоку: свисающий мох
    const a = rnd() * Math.PI * 2;
    const o = new THREE.Vector3(Math.cos(a) * 9, rr(0.5, 9.5), Math.sin(a) * 9);
    tryPlace(o, o.clone().setY(o.y + rr(-2, 1)).multiplyScalar(-1).normalize().setY(0).normalize(), -0.3, 0.16, 0.42, geos);
  }
  const moss = clumpMesh(geos, M.moss); grp.add(moss); addFuzz(grp, moss);

  // травинки и цветы, торчащие из мха (как в видео на крупных планах)
  grp.add(makeTufts(geos, 4800));

  // свисающий мох-плющ: пряди прижаты к стенкам, начинаются от верхних кромок
  const drape = [];
  const hang = (x, top, z, len, rot) => drape.push(vineGeo(x, top, z, len, rot, true, 0.7));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) hang(s * 3.25 + rr(-0.85, 0.85), 8.2, 1.08, rr(0.8, 2.6), 0);           // перед плеча
    for (let i = 0; i < 7; i++) hang(s * 4.23, 8.2, rr(-0.95, 0.95), rr(0.8, 2.2), s * Math.PI / 2);    // бок плеча
    for (let i = 0; i < 4; i++) hang(s * rr(1.5, 2.3), 8.1, 1.68, rr(1.2, 3.4), 0);                   // перед корпуса, мимо иллюминатора
    for (let i = 0; i < 6; i++) hang(s * rr(0.3, 1.85), 4.7, 1.18, rr(0.6, 1.9), 0);                  // кромка таза
    for (let i = 0; i < 4; i++) hang(s * 3.4 + rr(-0.6, 0.6), 4.55, 1.0, rr(0.6, 1.7), 0);            // предплечье
  }
  const dm = vineMat();
  dm.uniforms.uC0.value.set('#3b5f3f'); dm.uniforms.uC1.value.set('#6f9a50'); dm.uniforms.uC2.value.set('#a9c460'); dm.uniforms.uC3.value.set('#e2e08a');
  grp.add(new THREE.Mesh(mergeGeometries(drape), dm));

  // деревце на правом плече
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.16, 2.6, 7), M.bark);
  tr.position.set(3.0, 9.3, 0.2); tr.rotation.z = -0.25; tr.castShadow = true; grp.add(tr);
  const tg = [];
  for (let i = 0; i < 6; i++) tg.push(clumpGeo(3.4 + rr(-0.9, 0.9), 10.9 + rr(-0.4, 0.6), 0.2 + rr(-0.7, 0.7), rr(0.55, 0.9), 0.75));
  grp.add(clumpMesh(tg, M.leaves));

  grp.userData = { fans, flames, flameMat: fm, glass };
  return grp;
}

// ---------- лиана: две скрещённые карточки ----------
function vineGeo(x, top, z, len, rot, single = false, width = 0.8) {
  const gs = [];
  const seed = rnd() * 10;
  for (const a of (single ? [0] : [0, Math.PI / 2])) {
    const g = new THREE.PlaneGeometry(width, len); g.translate(0, -len / 2, 0); g.rotateY(rot + a); g.translate(x, top, z);
    g.deleteAttribute('normal');
    const n = g.attributes.position.count; const info = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { info[i * 2] = len; info[i * 2 + 1] = seed; }
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 2));
    gs.push(g);
  }
  return mergeGeometries(gs);
}

// ---------- деревья ----------
export function makeForest(scene, sunDir, keepClear = []) {
  const trunks = [], canopy = [], vines = [];
  const sunAz = Math.atan2(sunDir.x, -sunDir.z); // направление «просвета» к солнцу
  const geoT = [];
  const placeTree = (x, z, r, h, lean, chFix = 0) => {
    const g = new THREE.CylinderGeometry(r * 0.75, r, h, 12, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { // лёгкая неровность ствола
      const y = p.getY(i); const k = 1 + 0.06 * Math.sin(y * 0.9 + x) + 0.04 * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 5 + y);
      p.setX(i, p.getX(i) * k + lean * (y + h / 2) * 0.02); p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals(); g.translate(x, h / 2 - 0.3, z);
    geoT.push(g); trunks.push({ x, z, r });
    // крона: пласт комьев наверху
    const ch = chFix || h * rr(0.8, 0.9);
    const away = Math.atan2(z, x); // кроны ближних деревьев отклоняем от поляны, чтобы она оставалась открытой сверху
    for (let i = 0; i < 9; i++) {
      const a = (chFix || Math.hypot(x, z) < 35) ? away + rr(-1.1, 1.1) : rnd() * Math.PI * 2, d = rr(0, 6.5);
      canopy.push(clumpGeo(x + Math.cos(a) * d, ch + rr(0, h - ch + 2), z + Math.sin(a) * d, rr(3.0, 5.0), 0.6, 2));
    }
    // плакучие лианы
    for (let j = 0; j < 9; j++) {
      const a = rnd() * Math.PI * 2, d = rr(1.5, 4.5);
      const vx = x + Math.cos(a) * d, vz = z + Math.sin(a) * d;
      const len = rr(4, 11);
      vines.push(vineGeo(vx, ch, vz, len, rnd() * Math.PI));
    }
  };
  // передний план: толстые стволы по бокам кадра
  placeTree(-11, 9, 0.9, 30, -1, 15); placeTree(-7.5, 3, 0.6, 28, 0, 16);
  placeTree(11.5, 8, 0.85, 30, 1, 15); placeTree(8, 2, 0.55, 28, 0.5, 17); placeTree(13, -3, 0.65, 29, 0, 16);
  placeTree(-10.5, 15, 0.7, 26, 0, 14); placeTree(6.5, 16, 0.6, 26, 0, 14.5);
  // кольцо вокруг поляны, с просветом к солнцу
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2; const d = rr(18, 75);
    const da = Math.atan2(Math.sin(a - sunAz), Math.cos(a - sunAz));
    if (Math.abs(da) < 0.2 && d < 45) continue;
    const x = Math.sin(a) * d, z = -Math.cos(a) * d;
    if (z > 16 && Math.abs(x) < 16) continue; // не загораживать камеру
    if (keepClear.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 6)) continue;
    if (nearStream(x, z, 2.5)) continue; // деревья не в ручье
    placeTree(x, z, rr(0.35, 0.8), rr(24, 34), rr(-1, 1));
  }
  // кусты по краю поляны (низкий ярус, как полоса зелени за стражем в видео)
  const bushes = [];
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2, d = rr(11, 32);
    const x = Math.sin(a) * d, z = -Math.cos(a) * d;
    if (z > 8 && Math.abs(x) < 14) continue;
    if (keepClear.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 9)) continue;
    if (nearStream(x, z, 1.8)) continue;
    const r = rr(0.8, 1.8);
    bushes.push(clumpGeo(x, r * 0.45, z, r, 0.75, 2));
  }
  scene.add(clumpMesh(bushes, M.bush));
  const tm = new THREE.Mesh(mergeGeometries(geoT), M.bark); tm.castShadow = tm.receiveShadow = true;
  scene.add(tm);
  // сплошной полог крон вокруг поляны (вид сверху и потолок кадра снизу)
  for (let i = 0; i < 320; i++) {
    const a = rnd() * Math.PI * 2, d = rr(24, 110);
    const x = Math.sin(a) * d, z = -Math.cos(a) * d;
    const da = Math.atan2(Math.sin(a - sunAz), Math.cos(a - sunAz));
    if (Math.abs(da) < 0.12 && d < 40) continue;
    canopy.push(clumpGeo(x, rr(22, 29), z, rr(4, 7.5), 0.55, 2));
  }
  const cm = clumpMesh(canopy, M.canopy); cm.castShadow = false; scene.add(cm); // кроны не гасят поляну: в видео страж почти весь на свету
  const vm = new THREE.Mesh(mergeGeometries(vines), vineMat()); scene.add(vm);
  return { tm, trunks };
}

// ---------- земля ----------
export function makeGround() {
  const g = new THREE.PlaneGeometry(600, 600, 120, 120); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.hypot(x, z);
    p.setY(i, groundY(x, z));
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.ground); m.receiveShadow = true;
  return m;
}

// ---------- небо, облака, кулисы, дымка ----------
export function makeSkyAndFar(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat());
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  const clouds = new THREE.Group();
  const cdefs = [[-260, 230, -620, 520, 95], [160, 270, -640, 480, 85], [420, 200, -560, 380, 70], [-60, 170, -600, 620, 80],
    [-440, 160, -520, 380, 64], [280, 150, -600, 340, 56], [0, 330, -560, 440, 80], [-330, 320, -500, 400, 70], [470, 320, -450, 360, 64]];
  cdefs.forEach(([x, y, z, w, h], i) => {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloudMat(i * 7.3));
    c.position.set(x, y, z); c.lookAt(0, 30, 0); c.renderOrder = -5; clouds.add(c);
  });
  scene.add(clouds);

  // дальние кулисы: гряда, ели, кромки леса — всё уходит в дымку
  const layers = [
    { kind: 2, z: -480, y: 0, w: 1600, h: 140, col: '#b4adc6', col2: '#e8dee4', freq: 3, seed: 1 },
    { kind: 0, z: -300, y: 0, w: 1100, h: 60, col: '#8eac92', col2: '#c3d2b4', freq: 18, seed: 2 },
    { kind: 0, z: -190, y: 0, w: 800, h: 54, col: '#6f966f', col2: '#adc39a', freq: 16, seed: 3 },
    { kind: 1, z: -130, y: 0, w: 600, h: 34, col: '#3d6656', col2: '#6c8f6c', freq: 40, seed: 4 },
    { kind: 0, z: -95, y: 0, w: 420, h: 46, col: '#5b8660', col2: '#9db88a', freq: 12, seed: 5 },
  ];
  for (const L of layers) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), backdropMat(L));
    m.position.set(0, L.y + L.h / 2 - 2, L.z); m.renderOrder = -4; scene.add(m);
    // боковые и задние кулисы, чтобы дальний план был со всех сторон
    for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const m2 = m.clone(); m2.material = backdropMat({ ...L, seed: L.seed + a * 3 });
      m2.position.set(Math.sin(a) * -L.z, L.y + L.h / 2 - 2, Math.cos(a) * L.z); m2.rotation.y = a; scene.add(m2);
    }
  }

  // пелена тумана между стволами и у земли
  const hz = [];
  const hdefs = [[0, 3, -22, 70, 10, 0.55], [-20, 2.5, -35, 60, 9, 0.6], [25, 3, -40, 70, 12, 0.6], [0, 4, -55, 120, 16, 0.75],
    [-30, 2, -14, 30, 6, 0.45], [32, 2, -12, 30, 6, 0.45], [0, 1.5, -12, 40, 5, 0.35]];
  // море тумана над лесом вдали (видно с высоты, как на кадре с небом)
  hdefs.push([0, 16, -150, 700, 22, 0.8], [-120, 20, -230, 600, 26, 0.75], [140, 22, -260, 600, 26, 0.75]);
  hdefs.forEach(([x, y, z, w, h, op], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hazeCardMat({ seed: i * 3.7, op, speed: 0.006 + i * 0.002 }));
    m.position.set(x, y + h * 0.35, z); m.renderOrder = 2; scene.add(m); hz.push(m);
  });
  // тёмная полоса ёлок на переднем плане вида на небо (только для этого ракурса)
  const sil = new THREE.Mesh(new THREE.PlaneGeometry(420, 22), backdropMat({ kind: 1, col: '#16302b', col2: '#22413a', freq: 70, seed: 9 }));
  sil.position.set(0, 33, -6); sil.renderOrder = 3; sil.visible = false; scene.add(sil);
  return { sky, clouds, hz, sil };
}

// ---------- трава переднего плана (инстансы-лезвия) ----------
export function makeGrass(count = 14000, area = { x0: -40, x1: 40, z0: -30, z1: 26 }) {
  const blade = new THREE.BufferGeometry();
  const v = [-0.035, 0, 0, 0.035, 0, 0, -0.022, 0.45, 0, 0.022, 0.45, 0, 0, 1, 0];
  blade.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const g = new THREE.InstancedBufferGeometry(); g.index = blade.index; g.attributes.position = blade.attributes.position;
  const off = new Float32Array(count * 3), hs = new Float32Array(count * 2);
  let n = 0;
  for (let i = 0; i < count; i++) {
    const x = rr(area.x0, area.x1), z = rr(area.z0, area.z1);
    const front = area.dense ? 1 : THREE.MathUtils.smoothstep(z, -5, 18); // гуще и выше у камеры
    if (rnd() > 0.25 + front * 0.75) continue;
    if (nearStream(x, z, -0.1)) continue; // в воде травы нет, у кромки — есть
    off[n * 3] = x; off[n * 3 + 1] = (Math.sin(x * 0.05) * Math.cos(z * 0.04) * 0.8 + Math.sin(x * 0.13 + z * 0.07) * 0.3) * Math.min(1, Math.hypot(x, z) / 25) - 0.05; off[n * 3 + 2] = z;
    hs[n * 2] = rr(0.35, 0.9) * (0.6 + front * 1.1); hs[n * 2 + 1] = rr(0.6, 1.4);
    n++;
  }
  g.setAttribute('offset', new THREE.InstancedBufferAttribute(off.slice(0, n * 3), 3));
  g.setAttribute('hs', new THREE.InstancedBufferAttribute(hs.slice(0, n * 2), 2));
  g.instanceCount = n;
  const m = new THREE.Mesh(g, grassMat()); m.frustumCulled = false;
  return m;
}

// ---------- птицы ----------
export function makeBirds(count = 90, center = new THREE.Vector3(0, 95, -260)) {
  const b = new THREE.BufferGeometry();
  b.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 0, -0.15, 0.2, 0, 0.05, -0.2, 1, 0, 0, 0, -0.15, 0.2, 0, 0.05, -0.2], 3));
  const g = new THREE.InstancedBufferGeometry(); g.attributes.position = b.attributes.position;
  const s = new Float32Array(count * 4); for (let i = 0; i < s.length; i++) s[i] = rnd();
  g.setAttribute('seed', new THREE.InstancedBufferAttribute(s, 4)); g.instanceCount = count;
  const mat = birdMat(); mat.uniforms.uCenter.value.copy(center);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}

// ---------- клуб пыли ----------
export class Dust {
  constructor(scene) { this.scene = scene; this.items = []; }
  burst(pos, n = 9, size = 1.6) {
    for (let i = 0; i < n; i++) {
      const g = clumpGeo(0, 0, 0, 1, 0.8, 2);
      const mat = dustMat(); mat.uniforms.uSeed.value = rnd() * 10;
      const m = new THREE.Mesh(g, mat);
      const a = rnd() * Math.PI * 2;
      m.position.set(pos.x + Math.cos(a) * rr(0.5, 2), pos.y + rr(0.3, 1.2), pos.z + Math.sin(a) * rr(0.5, 2));
      m.userData = { v: new THREE.Vector3(Math.cos(a) * rr(1.5, 4), rr(0.4, 1.4), Math.sin(a) * rr(1.5, 4)), s: size * rr(0.6, 1.2), t: 0, life: rr(2.2, 3.4) };
      m.scale.setScalar(0.2); this.scene.add(m); this.items.push(m);
    }
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const m = this.items[i]; const u = m.userData; u.t += dt;
      const k = u.t / u.life;
      m.position.addScaledVector(u.v, dt * (1 - k));
      m.scale.setScalar(u.s * (0.4 + Math.sqrt(k) * 1.6));
      m.material.uniforms.uLife.value = THREE.MathUtils.smoothstep(k, 0.35, 1.0) * 0.95;
      if (k >= 1) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); this.items.splice(i, 1); }
    }
  }
}

// ---------- стенд образцов материалов ----------
export function makeSamples() {
  const grp = new THREE.Group();
  const labels = [];
  const add = (obj, x, label, y = 1.3) => { obj.position.x = x; grp.add(obj); labels.push({ obj, label, off: y }); };
  const sph = (mat, r = 1.1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), mat); m.castShadow = m.receiveShadow = true; m.position.y = r + 0.1; return m; };

  const sb = new THREE.Mesh(new RoundedBoxGeometry(2.0, 2.0, 2.0, 4, 0.5), M.stone); sb.position.y = 1.0; sb.castShadow = sb.receiveShadow = true;
  add(sb, -10.5, 'Камень: сколы и износ на рёбрах, грязь и зелень у земли, патина');
  const mb = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.9, 1.9, 3, 0.35), M.metal); mb.position.y = 1.05; mb.castShadow = mb.receiveShadow = true;
  add(mb, -7.5, 'Металл: блик кистью, заклёпки, ржавые подтёки');
  const mossG = clumpMesh([clumpGeo(0, 1.0, 0, 1.15, 0.85, 3)], M.moss); addFuzz(mossG, new THREE.Mesh(mossG.geometry)); add(mossG, -4.5, 'Мох: 4 тона, пушистый край, влажные пятна темнее');
  const tg = clumpMesh([clumpGeo(0, 1.4, 0, 0.9, 0.8), clumpGeo(0.8, 1.0, 0.2, 0.7, 0.8), clumpGeo(-0.7, 0.9, 0.1, 0.7, 0.8)], M.leaves);
  add(tg, -1.5, 'Листва: объём кома, тёплый контровой край');
  const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 4, 16, 6), M.bark); bk.position.y = 2; bk.castShadow = bk.receiveShadow = true;
  add(bk, 1.5, 'Кора: вертикальные мазки, плющ', 2.4);
  const gd = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), M.ground); gd.rotation.x = -Math.PI / 2; gd.position.y = 0.06; gd.receiveShadow = true;
  add(gd, 4.5, 'Луг: пятна света, белые и сиреневые цветы', 0.5);
  const dm = new THREE.Mesh(clumpGeo(0, 0, 0, 1, 0.8, 3), dustMat()); dm.position.y = 1.0; dm.material.uniforms.uLife.value = 0.25;
  add(dm, 7.5, 'Пыль: 2 тона, растворение рваным краем');
  const fg = new THREE.ConeGeometry(0.42, 2.6, 16, 6, true); fg.translate(0, 1.3, 0);
  const fl = new THREE.Mesh(fg, flameMat()); fl.material.uniforms.uOn.value = 1; fl.rotation.z = Math.PI / 2; fl.position.y = 1.4;
  const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 0.6, 14), M.dark); noz.rotation.z = Math.PI / 2; noz.position.set(-0.3, 1.4, 0);
  const fgp = new THREE.Group(); fgp.add(noz, fl); fl.position.x = -0.6;
  add(fgp, 10.8, 'Пламя сопла: жёлтое ядро, оранжевый край, свечение');
  grp.userData.labels = labels;
  return grp;
}

// ---------- пылинки в столбе света (светятся сильнее, когда смотришь против солнца) ----------
export function makeMotes(count = 900, center = new THREE.Vector3(0, 6, -4), box = new THREE.Vector3(28, 14, 34), fly = 0) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3), sd = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    p[i * 3] = center.x + (rnd() - 0.5) * box.x; p[i * 3 + 1] = center.y + (rnd() - 0.5) * box.y; p[i * 3 + 2] = center.z + (rnd() - 0.5) * box.z;
    sd[i] = rnd();
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: Object.assign({ uPx: { value: 1 }, uC: { value: new THREE.Vector2(center.x, center.z) }, uR: { value: Math.max(box.x, box.z) * 0.5 },
      uMoteK: { value: 1 }, uMoteC: { value: new THREE.Vector3(1, 0.93, 0.72) }, uFly: { value: fly } }, G),
    vertexShader: `uniform float uTime; uniform float uPx; uniform vec3 uGlowDir; uniform vec2 uC; uniform float uR; uniform float uMoteK; uniform float uFly; uniform vec4 uPush[10]; attribute float seed; varying float vA;
      void main(){
        vec3 q = position;
        q.x += sin(uTime*0.3 + seed*40.0) * 0.8; q.y += sin(uTime*0.21 + seed*17.0) * 0.6 + mod(uTime*0.15 + seed*10.0, 2.0) - 1.0; q.z += cos(uTime*0.27 + seed*23.0) * 0.8;
        if (uFly > 0.0) for (int i = 0; i < 2; i++) { // светлячки разлетаются от героев
          vec2 d = q.xz - uPush[i].xz; float dist = length(d);
          q.xz += d / max(dist, 0.05) * (1.0 - smoothstep(0.0, 2.6, dist)) * 1.6 * uPush[i].y;
          q.y += (1.0 - smoothstep(0.0, 2.6, dist)) * 0.8 * uPush[i].y;
        }
        vec4 mv = viewMatrix * modelMatrix * vec4(q, 1.0);
        vec3 wd = normalize((modelMatrix * vec4(q,1.0)).xyz - cameraPosition);
        float fwd = pow(max(dot(wd, uGlowDir), 0.0), 4.0);            // рассеяние вперёд: против солнца пылинки ярче
        float r = length(q.xz - uC);
        vA = (0.25 + 0.9 * fwd) * smoothstep(uR, uR * 0.5, r) * (0.5 + 0.5 * sin(uTime*1.7 + seed*60.0));
        float ps = 22.0;
        if (uFly > 0.0) { // светлячки: мигают поодиночке, медленно плывут у земли
          float blink = smoothstep(0.55, 0.95, sin(uTime * (0.8 + seed) + seed * 90.0));
          vA = blink * 2.6 * smoothstep(uR, uR * 0.6, r); ps = 34.0;
        }
        vA *= uMoteK;
        gl_PointSize = clamp(uPx * (0.6 + seed) * ps / -mv.z, 1.0, 7.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uMoteC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        gl_FragColor = vec4(uMoteC * vA * smoothstep(0.5, 0.1, d), 1.0); }`,
  });
  const m = new THREE.Points(g, mat); m.frustumCulled = false; m.renderOrder = 6;
  return m;
}

// ---------- лучи сквозь кроны: длинные полупрозрачные полосы вдоль света, всегда повёрнуты к камере ----------
export function makeShafts(count = 16) {
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
  const base = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 13;
    base[i * 4] = Math.cos(a) * d - 2; base[i * 4 + 1] = rr(0.6, 2.6); base[i * 4 + 2] = Math.sin(a) * d - 3; base[i * 4 + 3] = rnd();
  }
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 4)); g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: Object.assign({ uShaft: { value: 0.5 }, uShaftC: { value: new THREE.Vector3(1, 0.9, 0.7) } }, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute vec4 aBase; varying vec2 vUv; varying float vSeed; varying vec3 vWPos;
      void main(){
        vUv = uv; vSeed = aBase.w;
        vec3 axis = normalize(uSunDir);
        vec3 p0 = vec3(aBase.x, 0.0, aBase.z);
        vec3 toCam = normalize(cameraPosition - p0);
        vec3 side = normalize(cross(axis, toCam));
        float len = 34.0;
        vec3 w = p0 + axis * position.y * len + side * position.x * aBase.y;
        vWPos = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + /* glsl */`
      uniform float uShaft; uniform vec3 uShaftC; varying vec2 vUv; varying float vSeed; varying vec3 vWPos;
      void main(){
        float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float a = smoothstep(0.0, 0.5, across);
        a *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.75, 0.35, vUv.y);           // гаснет у земли и к кронам
        a *= 0.55 + 0.45 * sin(uTime * 0.35 + vSeed * 40.0);                           // лучи медленно дышат
        a *= smoothstep(0.35, 0.65, vnoise(vec3(vUv.x * 3.0, vUv.y * 2.0 - uTime * 0.03, vSeed * 9.0)));
        float view = pow(max(dot(normalize(vWPos - cameraPosition), uGlowDir), 0.0), 2.0) * 0.8 + 0.2;  // против света ярче
        gl_FragColor = vec4(uShaftC * a * uShaft * view * 0.22, 1.0);
      }`,
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 7;
  return m;
}
