// Сцены по референсу ivanponivanov (refs/ivanov): подъезд днём и двор ночью.
// Цель — повторить материальность и графику кадра: свои цвета света и тени у каждого материала (сняты k-means с кадров),
// крупные пятна тона, пятно света от окна/фонаря, полупрозрачные лучи, светлые фаски и тёмные стыки, зерно и виньетка.
// Почеркушки (сколы, крошка, растр, подтёки) — из листов библиотеки, их можно перерисовать в редакторе.
import * as THREE from 'three';

// палитра: [свет, тень] — средние кластеры по кадрам v1_42, v2_* и снимкам (REF-ANALYSIS.md)
export const REF_PAL = {
  wall: ['#b8875a', '#86654a'],      // охра: освещённая боковая стена / стена с окном в тени
  panel: ['#46503f', '#2f3a30'],     // зелёная краска панели
  floor: ['#77644f', '#4a3c30'],     // мраморная крошка
  sill: ['#dcc28f', '#a58a67'],      // подоконник
  frame: ['#c6a77a', '#7a6247'],     // рама
  rad: ['#a38667', '#5f4c39'],       // батарея
  base: ['#5a3524', '#2c1910'],      // плинтус
  rail: ['#84503b', '#3a2216'],      // перила
  pole: ['#c8996c', '#7d5a3d'],
  bucket: ['#8f6c4c', '#5a412c'],
  ash: ['#5f6a6a', '#2f3536'],
  glass: '#efe3b0',
  // ночь
  snow: ['#5e85c4', '#3f5f9e'],
  bld: ['#33467a', '#24335d'],
  bldFar: ['#3b5389', '#2e4373'],
  car: ['#57699a', '#36456f'],
  bench: ['#4d6fae', '#2c4278'],
  post: ['#27345e', '#18213f'],
  fur: ['#4c4450', '#231f2a'],
};

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w * 4)), Math.max(1, Math.round(h * 4)), Math.max(1, Math.round(d * 4)));

// луч света: лента вдоль направления света, мягкие края, гаснет к концу
function beamMat(color, k) {
  return new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uK: { value: k } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uC; uniform float uK; varying vec2 vU; void main(){ float a = smoothstep(0.0, 0.25, vU.y) * smoothstep(1.0, 0.75, vU.y) * smoothstep(0.0, 0.08, vU.x) * (1.0 - smoothstep(0.35, 1.0, vU.x)); gl_FragColor = vec4(uC * a * uK, 1.0); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
function beam(a, b, dir, len, color, k) {
  const g = new THREE.BufferGeometry(); const c = b.clone().addScaledVector(dir, len), d = a.clone().addScaledVector(dir, len);
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
  const m = new THREE.Mesh(g, beamMat(color, k)); m.renderOrder = 5; return m;
}

// ---------- подъезд днём ----------
export function buildEntrance(pv) {
  const G = new THREE.Group(); G.userData.refScene = 'entrance';
  const P = REF_PAL; const o = { ink: 0, aura: false, rim: false };
  const B = (cls, pal, x0, x1, y0, y1, z0, z1, extra = {}) => pv.add(G, box(x1 - x0, y1 - y0, z1 - z0), cls, { ...o, marks: cls !== 'wood' && cls !== 'metal', pos: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], base: pal[0], shade: pal[1], ...extra });
  const PH = 1.2; // высота зелёной панели
  // стена: охра сверху, панель снизу, кусками вокруг проёма окна
  const wallPart = (x0, x1, y0, y1, z0, z1) => {
    if (y0 < PH) B('panel', P.panel, x0, x1, y0, Math.min(PH, y1), z0, z1);
    if (y1 > PH) B('wall', P.wall, x0, x1, Math.max(PH, y0), y1, z0, z1);
  };
  const WX0 = -2.75, WX1 = -1.3, WY0 = 1.3, WY1 = 2.9, H = 3.4;
  wallPart(-3.6, WX0, 0, H, -0.32, 0); wallPart(WX1, 0, 0, H, -0.32, 0); wallPart(WX0, WX1, 0, WY0, -0.32, 0); wallPart(WX0, WX1, WY1, H, -0.32, 0);
  wallPart(0, 0.3, 0, H, -0.32, 3.4); // боковая стена (в свету)
  wallPart(-3.9, -3.6, 0, H, -0.32, 2.4); // левая стена (в тени)
  // пол и пролёт лестницы за перилами
  B('floor', P.floor, -3.6, 0.3, -0.12, 0, -0.32, 2.4); B('floor', P.floor, -1.0, 0.3, -0.12, 0, 2.4, 3.6);
  B('floor', P.floor, -3.6, -1.0, -1.72, -1.6, 2.4, 3.6, { base: '#5d4d3e', shade: '#3b2f25' });
  // плинтус
  B('wood', P.base, -3.6, 0, 0, 0.11, 0, 0.03); B('wood', P.base, -0.03, 0, 0, 0.11, 0, 3.4);
  // рама окна, середник, фрамуга, открытая форточка
  const F = (x0, x1, y0, y1, z0 = -0.24, z1 = -0.17) => B('wood', P.frame, x0, x1, y0, y1, z0, z1);
  F(WX0, WX1, WY0, WY0 + 0.07); F(WX0, WX1, WY1 - 0.07, WY1); F(WX0, WX0 + 0.07, WY0, WY1); F(WX1 - 0.07, WX1, WY0, WY1);
  F(-2.06, -1.99, WY0, WY1); F(WX0, WX1, 2.33, 2.39);
  const sash = new THREE.Group(); sash.position.set(WX1 - 0.07, 2.39, -0.17); sash.rotation.y = -1.05; G.add(sash);
  for (const [x0, x1, y0, y1] of [[-0.6, 0, 0, 0.06], [-0.6, 0, 0.44, 0.5], [-0.6, -0.54, 0, 0.5], [-0.06, 0, 0, 0.5]]) pv.add(sash, box(x1 - x0, y1 - y0, 0.06), 'wood', { ...o, marks: false, pos: [(x0 + x1) / 2, (y0 + y1) / 2, 0.03], base: P.frame[0], shade: P.frame[1] });
  pv.add(sash, new THREE.PlaneGeometry(0.5, 0.4), 'glass', { ...o, marks: false, pos: [-0.3, 0.25, 0.03], flat: true, base: '#f6edc8' });
  // стекло: светлое, плоское, с растром (лист «Растр точками»)
  pv.add(G, new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), 'glass', { ...o, pos: [(WX0 + WX1) / 2, (WY0 + WY1) / 2, -0.25], flat: true, base: P.glass, worldK: 1 });
  // подоконник и батарея
  B('wall', P.sill, -2.95, -1.1, 1.2, 1.29, -0.32, 0.27);
  for (let i = 0; i < 7; i++) { const x = -2.55 + i * 0.17; B('metal', P.rad, x, x + 0.12, 0.3, 0.98, 0.05, 0.22); }
  B('metal', P.rad, -2.6, -1.36, 0.36, 0.42, 0.1, 0.17); B('metal', P.rad, -2.6, -1.36, 0.86, 0.92, 0.1, 0.17);
  // пепельница-банка на подоконнике, ведро, шест у стены, листок
  pv.add(G, new THREE.CylinderGeometry(0.065, 0.065, 0.045, 28), 'metal', { ...o, marks: false, pos: [-1.55, 1.315, 0.1], base: P.ash[0], shade: P.ash[1] });
  pv.add(G, new THREE.CylinderGeometry(0.065, 0.065, 0.008, 28), 'metal', { ...o, marks: false, pos: [-1.6, 1.38, 0.04], rot: [1.25, 0, 0.2], base: '#77807c', shade: P.ash[1] });
  pv.add(G, new THREE.CylinderGeometry(0.17, 0.13, 0.3, 24, 1, true), 'wood', { ...o, marks: false, pos: [-2.8, 1.44, 0.02], base: P.bucket[0], shade: P.bucket[1], side: THREE.DoubleSide });
  const pole = pv.add(G, new THREE.CylinderGeometry(0.025, 0.025, 2.6, 10), 'wood', { ...o, marks: false, pos: [-0.12, 1.25, 1.6], rot: [0.32, 0, 0.06], base: P.pole[0], shade: P.pole[1] });
  pv.add(G, new THREE.PlaneGeometry(0.42, 0.55), 'cloth', { ...o, marks: false, pos: [-0.005, 2.85, 0.55], rot: [0, -Math.PI / 2, 0], base: '#b5465d', shade: '#7e2f41' });
  // перила лестницы и балясины
  B('wood', P.rail, -3.6, -0.95, 0.92, 1.0, 2.36, 2.46); B('wood', P.rail, -1.05, -0.95, 0.92, 1.0, 2.36, 3.6);
  for (let i = 0; i < 9; i++) { const x = -3.4 + i * 0.3; pv.add(G, new THREE.CylinderGeometry(0.012, 0.012, 2.6, 6), 'metal', { ...o, marks: false, pos: [x, -0.35, 2.41], base: '#6d7470', shade: '#2a2f2c' }); }
  // лучи из окна (направление — от источника внутрь, как в кадре)
  const L = new THREE.Vector3(0.62, -0.5, 0.62).normalize();
  for (const [x, w, k] of [[-2.68, 0.2, 0.16], [-2.38, 0.12, 0.11], [-1.95, 0.28, 0.14], [-1.55, 0.14, 0.1]]) {
    G.add(beam(new THREE.Vector3(x, WY0 + 0.1, -0.22), new THREE.Vector3(x + w, WY1 - 0.1, -0.22), L, 4.2, '#ffd59a', k));
  }
  G.userData.cam = { pos: [-2.75, 2.75, 4.6], target: [-1.25, 1.15, 0.6], fov: 50 };
  G.userData.look = { sun: [-0.62, 0.5, -0.6], paint: 0.13, pool: [-1.9, 1.4, 0.4, 2.6], poolC: '#ffc988', poolK: 0.12, bg: [[0, '#2a1f17'], [1, '#2a1f17']], grain: 0.02, vig: 0.35, edgeL: 0.4, edgeD: 0.45, tint: '#f4d9b0', tintK: 0.06 };
  return G;
}

// ---------- двор, синяя ночь ----------
export function buildNight(pv) {
  const G = new THREE.Group(); G.userData.refScene = 'night';
  const P = REF_PAL; const o = { ink: 0, aura: false, rim: false };
  const B = (cls, pal, x, y, z, w, h, d, extra = {}) => pv.add(G, box(w, h, d), cls, { ...o, marks: cls === 'snow', pos: [x, y, z], base: pal[0], shade: pal[1], ...extra });
  // снег: земля и сугробы
  pv.add(G, new THREE.PlaneGeometry(60, 60, 30, 30), 'snow', { ...o, rot: [-Math.PI / 2, 0, 0], base: P.snow[0], shade: P.snow[1], worldK: 1 });
  for (const [x, z, sx, sy, sz] of [[2.5, -3, 3.2, 0.6, 1.4], [-4, -1.5, 2.4, 0.45, 1.2], [5.5, 1.5, 2, 0.5, 1.6], [-1.5, 3.5, 1.6, 0.25, 1]]) {
    const m = pv.add(G, new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), 'snow', { ...o, pos: [x, 0, z], base: P.snow[0], shade: P.snow[1] }); m.scale.set(sx, sy, sz);
  }
  // дом с окнами
  const bx = 7, bz = -9;
  B('wall', P.bld, bx, 7, bz, 9, 14, 6);
  let sd = 3; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const win = (x, y, on) => pv.add(G, new THREE.PlaneGeometry(0.75, 1.0), 'glass', { ...o, marks: false, pos: [x, y, bz + 3.01], flat: true, base: on ? (rnd() < 0.6 ? '#f4bf62' : '#e6c58e') : '#1d2a52' });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) win(bx - 3.6 + c * 1.45, 2.2 + r * 2.1, rnd() < 0.38);
  B('snow', P.snow, bx, 14.15, bz, 9.2, 0.3, 6.2, { base: '#7f9fd6', shade: '#5c7fc0' }); // снег на крыше
  // дальние дома
  B('wall', P.bldFar, -6, 3, -22, 18, 6, 4); B('wall', P.bldFar, -13, 5, -26, 6, 10, 4);
  for (let c = 0; c < 9; c++) if (rnd() < 0.4) pv.add(G, new THREE.PlaneGeometry(0.6, 0.7), 'glass', { ...o, marks: false, pos: [-13 + c * 1.9, 4.2, -19.99], flat: true, base: '#efc27a' });
  // машина под снегом
  const car = new THREE.Group(); car.position.set(1.2, 0, -1.6); car.rotation.y = 0.12; G.add(car);
  pv.add(car, box(4.2, 0.75, 1.8), 'metal', { ...o, marks: false, pos: [0, 0.65, 0], base: P.car[0], shade: P.car[1] });
  pv.add(car, box(2.2, 0.6, 1.6), 'metal', { ...o, marks: false, pos: [-0.2, 1.3, 0], base: P.car[0], shade: P.car[1] });
  pv.add(car, box(2.25, 0.12, 1.65), 'snow', { ...o, pos: [-0.2, 1.65, 0], base: '#8aa7da', shade: P.snow[1] });
  pv.add(car, box(1.2, 0.08, 1.8), 'snow', { ...o, pos: [1.5, 1.06, 0], base: '#8aa7da', shade: P.snow[1] });
  for (const z of [-0.81, 0.81]) for (const [x, w] of [[-0.75, 0.9], [0.25, 0.8]]) pv.add(car, new THREE.PlaneGeometry(w, 0.42), 'glass', { ...o, marks: false, flat: true, pos: [x, 1.32, z], rot: [0, z > 0 ? 0 : Math.PI, 0], base: '#2c3b66' });
  pv.add(car, new THREE.PlaneGeometry(1.5, 0.45), 'glass', { ...o, marks: false, flat: true, pos: [0.92, 1.3, 0], rot: [0, Math.PI / 2, -0.5], base: '#7f93c2' });
  for (const x of [-1.3, 1.3]) pv.add(car, new THREE.CylinderGeometry(0.36, 0.36, 1.84, 20), 'metal', { ...o, marks: false, pos: [x, 0.36, 0], rot: [Math.PI / 2, 0, 0], base: '#232c4c', shade: '#151b33' });
  // скамейка со снегом
  const bench = new THREE.Group(); bench.position.set(-2.4, 0, 1.8); bench.rotation.y = -0.15; G.add(bench);
  for (let i = 0; i < 3; i++) pv.add(bench, box(2.6, 0.06, 0.14), 'wood', { ...o, marks: false, pos: [0, 0.48, -0.2 + i * 0.18], base: P.bench[0], shade: P.bench[1] });
  pv.add(bench, box(2.6, 0.08, 0.55), 'snow', { ...o, pos: [0, 0.55, -0.02], base: '#93add9', shade: P.snow[1] });
  for (const x of [-1.1, 1.1]) pv.add(bench, box(0.08, 0.48, 0.5), 'metal', { ...o, marks: false, pos: [x, 0.24, 0], base: P.post[0], shade: P.post[1] });
  // фонарь
  B('metal', P.post, 4.2, 2.6, -4.6, 0.12, 5.2, 0.12); B('metal', P.post, 3.75, 5.15, -4.6, 0.9, 0.08, 0.1);
  pv.add(G, new THREE.SphereGeometry(0.16, 16, 10), 'light', { ...o, marks: false, pos: [3.35, 5.0, -4.6], flat: true, base: '#ffe2a0' });
  { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,140,0.9)'); gr.addColorStop(0.35, 'rgba(242,160,60,0.35)'); gr.addColorStop(1, 'rgba(242,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.position.set(3.35, 5.0, -4.6); sp.scale.set(2.4, 2.4, 1); sp.renderOrder = 5; G.add(sp); }
  // провода
  for (const [y0, y1, z] of [[9.5, 7.8, -7], [10.2, 8.6, -7.6], [8.7, 9.9, -6.3]]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-14, y0, z), new THREE.Vector3(-3, (y0 + y1) / 2 - 1.1, z + 0.4), new THREE.Vector3(12, y1, z)]);
    pv.add(G, new THREE.TubeGeometry(c, 40, 0.025, 4), 'metal', { ...o, marks: false, base: '#1a2547', shade: '#1a2547', flat: true });
  }
  // собака: шерсть + оранжевая кромка от фонаря
  const dog = new THREE.Group(); dog.position.set(-0.4, 0, 0.4); dog.rotation.y = 0.5; G.add(dog);
  for (const [x, y, z, r] of [[0, 0.5, 0, 0.32], [0.36, 0.56, 0, 0.22], [-0.34, 0.46, 0, 0.26], [0.56, 0.72, 0, 0.15]]) pv.add(dog, new THREE.IcosahedronGeometry(r, 3), 'fur', { ...o, rim: true, pos: [x, y, z], base: P.fur[0], shade: P.fur[1] });
  for (const x of [-0.3, -0.12, 0.18, 0.34]) pv.add(dog, new THREE.CylinderGeometry(0.045, 0.035, 0.36, 8), 'fur', { ...o, rim: true, pos: [x, 0.18, 0.07], base: P.fur[0], shade: P.fur[1] });
  // шерсть: острые пряди наружу; со стороны фонаря рыжие, в тени тёмные (как у собаки в кадре)
  { let q = 7; const rr = () => { q = (q * 16807) % 2147483647; return q / 2147483647; }; const up = new THREE.Vector3(0, 1, 0);
    for (const [x, y, z, r] of [[0, 0.5, 0, 0.32], [0.36, 0.56, 0, 0.22], [-0.34, 0.46, 0, 0.26], [0.56, 0.72, 0, 0.15]]) for (let i = 0; i < 26; i++) {
      const n = new THREE.Vector3(rr() * 2 - 1, rr() * 1.4 - 0.4, rr() * 2 - 1).normalize(); const len = 0.1 + rr() * 0.12;
      const c = pv.add(dog, new THREE.ConeGeometry(0.035, len, 5), 'fur', { ...o, marks: false, pos: [x + n.x * (r + len * 0.3), y + n.y * (r + len * 0.3), z + n.z * (r + len * 0.3)], base: '#e39a3a', shade: '#28222e' });
      c.quaternion.setFromUnitVectors(up, n.clone().add(new THREE.Vector3(-0.5, 0.25, 0)).normalize());
    } }
  G.userData.cam = { pos: [-3.6, 1.5, 5.2], target: [1.2, 2.2, -3], fov: 50 };
  G.userData.look = { sun: [0.62, 0.42, -0.4], paint: 0.07, pool: [3.4, 0.0, -4.6, 5.5], poolC: '#f2a03c', poolK: 0.32, bg: [[0, '#21438a'], [0.4, '#2c5397'], [0.47, '#d9a38f'], [0.5, '#7d8fbb'], [0.56, '#3a5fa3'], [1, '#3a5fa3']], grain: 0.018, vig: 0.3, edgeL: 0.3, edgeD: 0.3, tint: '#5f8ad6', tintK: 0.05 };
  return G;
}

// небо градиентом (верх → низ → полоса заката у горизонта)
export function gradientTex(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); for (const [p, c] of stops) gr.addColorStop(p, c);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// постобработка кадра: светлые фаски на выпуклых рёбрах, тёмные линии в стыках, зерно бумаги, виньетка, общий тон
export class RefPost {
  constructor(renderer) {
    this.r = renderer;
    const opt = { type: THREE.HalfFloatType };
    this.col = new THREE.WebGLRenderTarget(4, 4, opt); this.col.depthTexture = new THREE.DepthTexture(4, 4);
    this.nrm = new THREE.WebGLRenderTarget(4, 4, opt); this.nrm.depthTexture = new THREE.DepthTexture(4, 4);
    this.nmat = new THREE.MeshNormalMaterial();
    this.u = { tC: { value: this.col.texture }, tN: { value: this.nrm.texture }, tD: { value: this.nrm.depthTexture }, uPx: { value: new THREE.Vector2() }, uNear: { value: 0.05 }, uFar: { value: 300 },
      uGrain: { value: 0.05 }, uVig: { value: 0.3 }, uEdgeL: { value: 0.4 }, uEdgeD: { value: 0.4 }, uTint: { value: new THREE.Color('#ffffff') }, uTintK: { value: 0 }, uTime: { value: 0 } };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: this.u, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
uniform sampler2D tC, tN, tD; uniform vec2 uPx; uniform float uNear, uFar, uGrain, uVig, uEdgeL, uEdgeD, uTintK, uTime; uniform vec3 uTint; varying vec2 vU;
float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c = texture2D(tC, vU).rgb;
  vec3 n0 = texture2D(tN, vU).rgb * 2.0 - 1.0; float d0 = lin(texture2D(tD, vU).r);
  float e = 0.0, dd = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = (i == 0 ? vec2(1, 0) : i == 1 ? vec2(-1, 0) : i == 2 ? vec2(0, 1) : vec2(0, -1)) * uPx * 1.5;
    vec3 n = texture2D(tN, vU + o).rgb * 2.0 - 1.0; float d = lin(texture2D(tD, vU + o).r);
    e = max(e, 1.0 - dot(n0, n)); dd += d - d0;
  }
  float edge = smoothstep(0.15, 0.6, e) * step(d0, 60.0);
  float convex = smoothstep(-0.002, 0.01, dd * 0.25 / max(d0, 0.5));   // соседи дальше — ребро наружу (фаска), ближе — стык
  c = mix(c, c * 1.45 + 0.05, edge * convex * uEdgeL);
  c = mix(c, c * 0.45, edge * (1.0 - convex) * uEdgeD);
  c = mix(c, uTint * dot(c, vec3(0.3, 0.59, 0.11)) * 1.6, uTintK);
  float g = h(floor(gl_FragCoord.xy / 1.5) + floor(uTime * 8.0) * 0.0) - 0.5; c += g * uGrain;
  vec2 q = vU - 0.5; c *= 1.0 - uVig * smoothstep(0.25, 0.85, length(q * vec2(1.0, 1.25)));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}` }));
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setLook(L) { this.u.uGrain.value = L.grain; this.u.uVig.value = L.vig; this.u.uEdgeL.value = L.edgeL; this.u.uEdgeD.value = L.edgeD; this.u.uTint.value.set(L.tint); this.u.uTintK.value = L.tintK; }
  render(scene, camera, hide = []) {
    const s = new THREE.Vector2(); this.r.getDrawingBufferSize(s);
    if (this.col.width !== s.x || this.col.height !== s.y) { this.col.setSize(s.x, s.y); this.nrm.setSize(s.x, s.y); }
    this.u.uPx.value.set(1 / s.x, 1 / s.y); this.u.uNear.value = camera.near; this.u.uFar.value = camera.far;
    // нормали: без лучей и спрайтов
    const vis = hide.map((o) => o.visible); hide.forEach((o) => { o.visible = false; });
    const bg = scene.background; scene.background = null; scene.overrideMaterial = this.nmat;
    this.r.setRenderTarget(this.nrm); this.r.setClearColor(0x8080ff, 1); this.r.clear(); this.r.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; hide.forEach((o, i) => { o.visible = vis[i]; });
    this.r.setRenderTarget(this.col); this.r.render(scene, camera);
    this.r.setRenderTarget(null); this.r.render(this.qs, this.qc);
  }
}
