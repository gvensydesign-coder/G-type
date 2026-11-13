// Тестовая сцена «Огонь как механика»: опушка с сенником и рощей, богатырь с факелом, Леший.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WildFire, HeatPost, toonMaterial, toonMesh, SHARED, NOISE } from '../fx/firefx.js';
import { Character, warp } from './character.js';
import { pose, blend } from './pose.js';
import { FM, FireField, HeldTorch, BodyFire, TreeFall, paintCharacter } from './firemech.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const turnTo = (a, b, s) => { const d = ang(b - a); return a + Math.max(-s, Math.min(s, d)); };
const hs = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (hs(ix, iz) * (1 - u) + hs(ix + 1, iz) * u) * (1 - v) + (hs(ix, iz + 1) * (1 - u) + hs(ix + 1, iz + 1) * u) * v; };

// ---------------------------------------------------------------- настройки боя
const T = {
  hero: { height: 1.85, hp: 100, run: 3.0, sprint: 4.7, accel: 9, turn: 9 },
  leshy: { height: 2.5, hp: 260, walk: 1.5, run: 3.2, turn: 3.2 },
  arena: 15,
  heroR: .36, leshyR: .6,
  swing: { dmg: 6, litDmg: 9, range: 2.5, cone: .45 },
  claw: { dmg: 14, range: 2.6, cone: .5 },
  dodge: { dur: .34, speed: 7.5 },
};

// ---------------------------------------------------------------- рендер
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('test') });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio, params.has('test') ? 1 : 1.5));
renderer.setSize(innerWidth, innerHeight, false);
const scene = new THREE.Scene(); scene.userData.clear = 0x16303a;
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 200);
const fire = new WildFire(scene, camera, { maxFlames: 1800 });
const field = new FireField(fire);
const post = new HeatPost(renderer, fire);

// ---------------------------------------------------------------- небо и дальний лес
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Color('#2e5a52') }, b: { value: new THREE.Color('#16303a') }, f: SHARED.uFog },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 a, b, f; varying vec3 vD; ${NOISE} void main(){ float y = vD.y; float s = y < .04 ? 0. : (y < .16 ? .45 : 1.);
      float st = pfNoise(vec2(atan(vD.z, vD.x) * 9., y * 26.)) * .12; vec3 c = mix(mix(f, a, step(.02, y)), b, clamp(s - st, 0., 1.)); gl_FragColor = vec4(c, 1.); }` }));
  sky.renderOrder = -10; scene.add(sky);
  const tm = toonMaterial({ color: '#0b1712', kind: 2, outline: false });
  for (let i = 0; i < 90; i++) {
    const a = i / 90 * Math.PI * 2 + hs(i, 1) * .06, r = 26 + hs(i, 2) * 12, h = 6 + hs(i, 3) * 7;
    const g = new THREE.ConeGeometry(h * .27, h, 6); const t = toonMesh(g, tm); t.position.set(Math.cos(a) * r, h / 2 - .2, Math.sin(a) * r); scene.add(t);
  }
}

// ---------------------------------------------------------------- земля: сухая трава полосой между богатырём и рощей и у стога
const dry = (x, z) => {
  const a = Math.hypot((x - .5) / 8.5, (z + 1.6) / 3.0), b = Math.hypot((x + 8) / 3.2, (z - 1.5) / 3.4), c = Math.hypot((x - 4.5) / 3, (z + 7.5) / 3.4);
  return Math.min(a, b, c) - (vn(x * .7, z * .7) - .5) * .7 < .78 ? 1 : 0;
};
const G = 36, GS = 120;
const gGeo = new THREE.PlaneGeometry(G, G, GS, GS); gGeo.rotateX(-Math.PI / 2);
{ const P = gGeo.attributes.position, mix = new Float32Array(P.count); for (let i = 0; i < P.count; i++) mix[i] = dry(P.getX(i), P.getZ(i)); gGeo.setAttribute('aMix', new THREE.BufferAttribute(mix, 1)); }
const ground = toonMesh(gGeo, toonMaterial({ color: '#1e3a1c', color2: '#4a4624', kind: 3, outline: false, name: 'ground' }));
scene.add(ground);
{ const outer = toonMesh(new THREE.RingGeometry(G * .7, 95, 48, 1).rotateX(-Math.PI / 2), toonMaterial({ color: '#1e3a1c', kind: 3, outline: false })); outer.position.y = -.02; scene.add(outer); }
fire.addGround(ground, dry, { spacing: .32, bounds: [-11.5, 8, -11, 5] });

const camRay = new THREE.Raycaster(); const camBlockers = [];   // камера не смотрит сквозь деревья
const colliders = [];   // { x, z, r, ob? } — характеры обходят
const wood = (c) => toonMaterial({ color: c, kind: 0, name: 'wood' });
const add = (mesh, fuel, o) => { if (!mesh.parent) scene.add(mesh); return fire.addObject(mesh, fuel, o); };
const segs = (L, s = .16) => Math.max(1, Math.ceil(L / s));

// ---------------------------------------------------------------- роща: ели и берёзы (кроны горят, ствол прогорает у корня и валится по ветру)
const trees = [];
const firM = toonMaterial({ color: '#1f3d2a', kind: 2, shrink: .4, name: 'fir' });
const birchCrownM = toonMaterial({ color: '#3f5a26', kind: 2, shrink: .35, name: 'leaves' });
function pine(x, z, s = 1) {
  const H = 4.6 * s; const g = new THREE.CylinderGeometry(.1 * s, .2 * s, H, 7, segs(H, .3)); g.translate(0, H / 2, 0);
  const trunk = toonMesh(g, wood('#4a3624')); trunk.position.set(x, 0, z); trunk.rotation.y = hs(x, z) * 6; scene.add(trunk);
  const tOb = add(trunk, 'log', { spacing: .22, phys: { type: 'topple', dir: new THREE.Vector3(1, 0, 0) } });
  for (let i = tOb.n0; i < tOb.n0 + tOb.nN; i++) { fire.nodes[i].fuel0 *= .55; fire.nodes[i].fuel = fire.nodes[i].fuel0; }
  const crowns = [];
  for (const [yb, R, h] of [[1.1, 1.35, 1.7], [2.05, 1.05, 1.5], [2.9, .72, 1.5]]) {
    const cg = new THREE.ConeGeometry(R * s, h * s, 8, 3); cg.translate(0, (yb + h / 2) * s, 0);
    const c = toonMesh(cg, firM); trunk.add(c); crowns.push(add(c, 'needles', { heatKind: 'hay', spacing: .34 }));
  }
  camBlockers.push(trunk, ...crowns.map((c) => c.mesh)); trees.push(new TreeFall(fire, tOb, crowns, H)); colliders.push({ x, z, r: .3 * s, tree: trees[trees.length - 1] });
}
function birch(x, z, s = 1) {
  const H = 4.2 * s; const g = new THREE.CylinderGeometry(.08 * s, .14 * s, H, 7, segs(H, .3)); g.translate(0, H / 2, 0);
  const trunk = toonMesh(g, wood('#c9c0a8')); trunk.position.set(x, 0, z); trunk.rotation.y = hs(z, x) * 6; scene.add(trunk);
  const tOb = add(trunk, 'log', { spacing: .22, phys: { type: 'topple', dir: new THREE.Vector3(1, 0, 0) } });
  for (let i = tOb.n0; i < tOb.n0 + tOb.nN; i++) { fire.nodes[i].fuel0 *= .5; fire.nodes[i].fuel = fire.nodes[i].fuel0; }
  const crowns = [];
  for (const [ox, y, oz, r] of [[0, 3.3, 0, .95], [.45, 2.6, .2, .7], [-.4, 2.75, -.25, .72]]) {
    const cg = new THREE.IcosahedronGeometry(r * s, 1); cg.scale(1, 1.2, 1); cg.translate(ox * s, y * s, oz * s);
    const c = toonMesh(cg, birchCrownM); trunk.add(c); crowns.push(add(c, 'leaves', { heatKind: 'hay', spacing: .34 }));
  }
  camBlockers.push(trunk, ...crowns.map((c) => c.mesh)); trees.push(new TreeFall(fire, tOb, crowns, H)); colliders.push({ x, z, r: .25 * s, tree: trees[trees.length - 1] });
}
pine(2.6, -6.8, 1); pine(6.2, -5.4, .9); pine(8.4, -9.2, 1.1); pine(.6, -10.6, 1.05); pine(5.2, -11.2, .95); pine(-3.4, -7.6, 1);
birch(-6.3, -4.8, 1); birch(9.4, -2.6, .95); birch(-1.2, -4.9, .9);

// ---------------------------------------------------------------- сенник: тюки и стог
const hayM = toonMaterial({ color: '#9a7a34', kind: 1, shrink: .5, name: 'hay' });
for (const [x, y, z, ry, top] of [[-8.4, .6, -1.6, .1], [-7.15, .6, -1.7, -.08], [-7.8, 1.78, -1.65, .03, 1]]) {
  const g = new THREE.CylinderGeometry(.6, .6, 1.2, 18, 6); g.rotateZ(Math.PI / 2);
  const m = toonMesh(g, hayM); m.position.set(x, y, z); m.rotation.y = ry; add(m, 'hay', top ? { phys: { type: 'settle', hx: .5, hz: .35 } } : {});
}
colliders.push({ x: -7.8, z: -1.65, r: 1.25 });
{ // стог на жерди
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.max(.05, 1.35 * Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI / 2) * (1 - t * .15)), t * 2.7)); }
  const g = new THREE.LatheGeometry(pts, 16); const m = toonMesh(g, hayM); m.position.set(-8.2, 0, 2.6); add(m, 'hay', { spacing: .3 });
  const pg = new THREE.CylinderGeometry(.04, .05, 3.4, 6, 6); pg.translate(0, 1.7, 0); const p = toonMesh(pg, wood('#3e2c1a')); p.position.set(-8.2, 0, 2.6); add(p, 'wood');
  colliders.push({ x: -8.2, z: 2.6, r: 1.35 });
}
// изгородь у сенника: столбы стоят, жерди падают, когда прогорает конец
for (let i = 0; i <= 3; i++) {
  const x = -11 + i * 2.1, z = 5.2; const g = new THREE.BoxGeometry(.14, 1.3, .14, 1, segs(1.3), 1); g.translate(0, .65, 0);
  const m = toonMesh(g, wood('#4e3820')); m.position.set(x, 0, z); m.rotation.y = hs(i, 3) * .3; add(m, 'log');
  if (i < 3) for (const y of [.5, 1.0]) { const rg = new THREE.BoxGeometry(2.1, .1, .07, segs(2.1, .2), 1, 1); const r = toonMesh(rg, wood('#5e4428')); r.position.set(x + 1.05, y, z + .07); add(r, 'wood', { phys: { type: 'fall' } }); }
}

// ---------------------------------------------------------------- костёр в кругу камней (от него можно зажечь факел)
const stoneM = toonMaterial({ color: '#4a4e52', kind: 2, name: 'stone' });
const CF = new THREE.Vector3(4.6, 0, 7.6);
for (let i = 0; i < 9; i++) {
  const a = i / 9 * Math.PI * 2; const g = new THREE.IcosahedronGeometry(.2 + hs(i, 11) * .06, 1); g.scale(1, .7, 1);
  const m = toonMesh(g, stoneM); m.position.set(CF.x + Math.cos(a) * .62, .1, CF.z + Math.sin(a) * .62); add(m, null, { heatKind: 'stone' });
}
const campLogs = [];
const logM = toonMaterial({ color: '#6a4a2c', kind: 5, name: 'log' });
for (let i = 0; i < 4; i++) {
  const a = i / 4 * Math.PI * 2 + .4; const g = new THREE.CylinderGeometry(.06, .08, .95, 8, 4); g.translate(0, .47, 0);
  const m = toonMesh(g, logM); m.position.set(CF.x + Math.cos(a) * .32, 0, CF.z + Math.sin(a) * .32);
  m.lookAt(CF.x, .9, CF.z); m.rotateX(Math.PI / 2); campLogs.push(add(m, 'log', { spacing: .16 }));
}
for (const ob of campLogs) for (let i = ob.n0; i < ob.n0 + ob.nN; i++) { fire.nodes[i].fuel0 *= 30; fire.nodes[i].fuel = fire.nodes[i].fuel0; }
colliders.push({ x: CF.x, z: CF.z, r: .8 });
for (const [x, z, s] of [[-2.6, 2.2, .6], [6.6, 1.2, .75], [-4.6, -2.4, .5]]) {
  const g = new THREE.IcosahedronGeometry(s, 2); g.scale(1.2, .75, 1); const m = toonMesh(g, stoneM); m.position.set(x, s * .45, z); m.rotation.y = x; add(m, null, { heatKind: 'stone' });
  colliders.push({ x, z, r: s * 1.1 });
}

// ---------------------------------------------------------------- флаг ветра
const flagG = new THREE.Group(); flagG.position.set(-4.2, 0, 4.2); scene.add(flagG);
{ const pg = new THREE.CylinderGeometry(.04, .05, 3.2, 6, 4); pg.translate(0, 1.6, 0); const p = toonMesh(pg, wood('#3a2a1a')); flagG.add(p); fire.addObject(p, null, { heatKind: 'wood' }); colliders.push({ x: -4.2, z: 4.2, r: .15 }); }
const flagPiv = new THREE.Group(); flagPiv.position.y = 2.85; flagG.add(flagPiv);
{ const fg = new THREE.PlaneGeometry(1.1, .5, 12, 2); fg.translate(.55, -.25, 0); const f = toonMesh(fg, toonMaterial({ color: '#8a2a24', kind: 4, flag: true, doubleSide: true, outline: false })); f.geometry.scale(1 / 1.1, 1, 1); f.scale.x = 1.1; flagPiv.add(f); }

// ---------------------------------------------------------------- кустики сухой травы (сгорают в стерню, качаются по ветру)
const TUFTS = [];
for (let i = 0; i < 6000 && TUFTS.length < 520; i++) { const x = -11.5 + hs(i, 21) * 19.5, z = -11 + hs(i, 22) * 16; if (dry(x, z)) TUFTS.push([x, z, hs(i, 23)]); }
const tuftGeo = (() => { const p = []; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI + .3, c = Math.cos(a) * .09, s = Math.sin(a) * .09, lx = Math.cos(a * 3) * .05, lz = Math.sin(a * 2) * .05;
  p.push(-c, 0, -s, c, 0, s, lx, .42 + (k % 2) * .12, lz); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; })();
const tuftMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { ...SHARED, cDry: { value: new THREE.Color('#7a7034') }, cTip: { value: new THREE.Color('#a8964c') } },
  vertexShader: `attribute vec2 aT; uniform vec3 uWind; uniform float uTime; varying float vY; varying vec2 vT; varying vec3 vW;
    void main(){ vec3 p = position; float ch = aT.x; p.y *= 1. - ch * .8; float t = floor(uTime * 10.) / 10.;
      vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.); w.xyz += uWind * p.y * p.y * (2. + sin(t * 3. + aT.y * 20.) * .8) * (1. - ch);
      vY = position.y / .54; vT = aT; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 cDry, cTip, cChar, uFog, uMoonCol, uAmb, cOut, cCore; uniform float uFogD; uniform vec3 uFireP[8]; uniform vec4 uFireC[8]; uniform int uFireN;
    varying float vY; varying vec2 vT; varying vec3 vW;
    void main(){ vec3 c = mix(cDry, cTip, step(.6, vY)) * (uAmb + uMoonCol * .5);
      float fs = 0.; for (int i = 0; i < 8; i++) { if (i >= uFireN) break; float d = length(uFireP[i] - vW); float a = clamp(1. - d / uFireC[i].w, 0., 1.); fs += a * a * uFireC[i].r; }
      c += cDry * vec3(1., .6, .3) * (fs > .7 ? 1. : (fs > .25 ? .55 : 0.));
      if (vT.x > .3) c = cChar * 1.4; if (vT.x > .3 && vT.x < .75 && vY > .5) c = vT.x < .5 ? cCore : cOut;
      float fk = 1. - exp(-pow(length(vW - cameraPosition) * uFogD, 2.)); gl_FragColor = vec4(mix(c, uFog, fk * .88), 1.); }` });
const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, TUFTS.length);
{ const m = new THREE.Matrix4(), q = new THREE.Quaternion(), aT = new Float32Array(TUFTS.length * 2);
  TUFTS.forEach(([x, z, r], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r * 6.28); m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, .7 + r * .7, 1).multiplyScalar(.8 + r * .5)); tufts.setMatrixAt(i, m); aT[i * 2 + 1] = r; });
  tufts.geometry.setAttribute('aT', new THREE.InstancedBufferAttribute(aT, 2)); }
scene.add(tufts);
const gIdx = (x, z) => Math.round((z + G / 2) / (G / GS)) * (GS + 1) + Math.round((x + G / 2) / (G / GS));
function updateTufts() { const ch = ground.geometry.attributes.aChar.array, a = tufts.geometry.attributes.aT;
  TUFTS.forEach(([x, z], i) => { const k = gIdx(x, z); a.array[i * 2] = Math.max(a.array[i * 2], ch[k] > .25 ? Math.min(1, ch[k] * 1.3) : 0); }); a.needsUpdate = true; }

// ---------------------------------------------------------------- тень-пятно под фигурой (без записи глубины)
function blob(r) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050807, transparent: true, opacity: .45, depthWrite: false })); m.renderOrder = 1; scene.add(m); return m; }

// ---------------------------------------------------------------- знак испуга над головой Лешего (шагами)
function fearSign() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.lineJoin = 'round'; g.font = '900 104px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 14; g.strokeStyle = '#1a0c08'; g.strokeText('!', 64, 68); g.fillStyle = '#ffb23c'; g.fillText('!', 64, 68);
  g.lineWidth = 4; g.strokeStyle = '#e0483a'; for (const [a, r] of [[-.9, 50], [-.55, 56], [.55, 56], [.9, 50]]) { g.beginPath(); g.moveTo(64 + Math.sin(a) * (r - 14), 64 - Math.cos(a) * (r - 14)); g.lineTo(64 + Math.sin(a) * r, 64 - Math.cos(a) * r); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, fog: false })); s.scale.setScalar(.55); s.renderOrder = 10; s.visible = false; scene.add(s); return s;
}

// ---------------------------------------------------------------- позы поверх анимации
const P = {
  torchUp: pose({ RightArm: [-28, 0, -18], RightForeArm: [-70, 8, 0] }),
  shield: pose({ Spine: [-14, 0, 0], Spine1: [-8, 0, 0], Neck: [-14, 0, 0], LeftArm: [-72, -35, 0], LeftForeArm: [-88, -40, 0], RightArm: [-40, 20, 0], RightForeArm: [-60, 30, 0] }),
  flail: pose({ Spine: [-10, 0, 0], RightArm: [-60, 0, -70], LeftArm: [-60, 0, 70], RightForeArm: [-50, 0, 0], LeftForeArm: [-50, 0, 0], Neck: [-25, 0, 0] }),
};
const ID = pose({});

// ---------------------------------------------------------------- состояние игры
let hero, leshy, heroTorch, heroBody, leshyBody, heroU, leshyU, sign, heroBlob, leshyBlob;
const game = { over: false, aiOn: true, time: 0, msg: '', msgT: 0 };
const cam = { yaw: 0, pitch: .36, dist: 7.2, target: new THREE.Vector3(), manual: 0 };
const keys = new Set();

function toast(text, t = 2.4) { game.msg = text; game.msgT = t; const el = $('toast'); el.textContent = text; el.classList.add('on'); }

async function load() {
  const loader = new GLTFLoader();
  // модели: в окне артефакта — base64 рядом со страницей, локально — .glb
  const model = async (n) => { try { const r = await fetch(`models/${n}.b64.txt`); if (r.ok) { const t = (await r.text()).trim(); const b = Uint8Array.from(atob(t), (c) => c.charCodeAt(0)); return await loader.parseAsync(b.buffer, ''); } } catch (e) { /* локальная копия */ }
    return loader.loadAsync(`models/${n}.glb`); };
  const [gB, gL] = await Promise.all([model('bogatyr'), model('leshy')]);
  hero = new Character(gB, { height: T.hero.height, name: 'Богатырь' }); scene.add(hero.group);
  leshy = new Character(gL, { height: T.leshy.height, name: 'Леший' }); scene.add(leshy.group);
  heroU = paintCharacter(hero, { hull: .016 }); leshyU = paintCharacter(leshy, { hull: .024 });
  heroTorch = new HeldTorch(hero, fire, field);
  heroBody = new BodyFire(hero, fire, field, { size: .75 }); heroBody.U = heroU;
  leshyBody = new BodyFire(leshy, fire, field, { size: 1.05 }); leshyBody.U = leshyU;
  sign = fearSign(); heroBlob = blob(.45); leshyBlob = blob(.7);
  reset();
  $('loading').remove();
  requestAnimationFrame(loop);
}

function newActor(ch, o) { return Object.assign({ ch, hp: o.hp, hpMax: o.hp, state: 'move', t: 0, h: null, vel: new THREE.Vector3(), speed: 0, hurtT: 0, poseW: 0 }, o); }
let H, L;
function reset() {
  fire.reset(); for (const t of trees) t.reset();
  tufts.geometry.attributes.aT.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = 0; }); tufts.geometry.attributes.aT.needsUpdate = true;
  fire.ignite(new THREE.Vector3(CF.x, .35, CF.z), .5, 4);
  H = newActor(hero, { hp: T.hero.hp, r: T.heroR }); L = newActor(leshy, { hp: T.leshy.hp, r: T.leshyR, fear: 0, keepT: 0, circle: 1, atkCD: 1.5, think: 0, dir: new THREE.Vector3(), steer: 0 });
  hero.position.set(.6, 0, 7.4); hero.yaw = Math.PI; leshy.position.set(3.6, 0, -8.6); leshy.yaw = 0;
  hero.stopAll(0); leshy.stopAll(0);
  heroBody.douse(); leshyBody.douse(); heroBody.char = leshyBody.char = 0;
  heroTorch.douse(); heroTorch.torch.state = 'off'; heroTorch.torch.heat = 0;
  setTimeout(() => heroTorch.ignite(), 600);
  game.over = false; $('over').classList.remove('on');
  cam.yaw = 0.0; cam.target.set(.6, 1.4, 7.4);
}

// ---------------------------------------------------------------- ввод: клавиатура, ЛКМ по сцене — удар (мышь камерой не управляет)
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return; const k = e.code; keys.add(k);
  if (k === 'KeyJ') act('swing'); if (k === 'KeyE') act('poke'); if (k === 'KeyF') act('torch'); if (k === 'Space') { e.preventDefault(); act('dodge'); }
  if (k === 'KeyR') reset();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('pointerdown', (e) => { if (e.button === 0) act('swing'); });
const hold = (id, code) => { const b = $(id); if (!b) return; b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.add(code); }); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => keys.delete(code)); };
hold('tU', 'KeyW'); hold('tD', 'KeyS'); hold('tL', 'KeyA'); hold('tR', 'KeyD'); hold('cL', 'ArrowLeft'); hold('cR', 'ArrowRight');
for (const [id, a] of [['bSwing', 'swing'], ['bPoke', 'poke'], ['bTorch', 'torch'], ['bDodge', 'dodge']]) $(id)?.addEventListener('pointerdown', (e) => { e.preventDefault(); act(a); });

function act(a) {
  if (!H || game.over || H.state === 'dead') return;
  const busy = H.state !== 'move';
  if (a === 'torch') {
    if (heroTorch.on) { heroTorch.douse(); toast('Факел погашен'); }
    else { heroTorch.ignite(); toast('Огниво: факел занимается'); }
    return;
  }
  if (busy) return;
  if (a === 'swing') { H.state = 'swing'; H.t = 0; H.h = hero.play('Attack', .12); H.hitDone = false; }
  if (a === 'poke') { H.state = 'poke'; H.t = 0; H.h = hero.play('PickUp', .2); }
  if (a === 'dodge') { H.state = 'dodge'; H.t = 0; const d = moveDir(); H.dodgeDir = d.lengthSq() > 0 ? d : new THREE.Vector3(-Math.sin(hero.yaw), 0, -Math.cos(hero.yaw)); }
}
const _md = new THREE.Vector3();
function moveDir() {
  let x = 0, z = 0; if (keys.has('KeyW')) z -= 1; if (keys.has('KeyS')) z += 1; if (keys.has('KeyA')) x -= 1; if (keys.has('KeyD')) x += 1;
  if (!x && !z) return _md.set(0, 0, 0);
  const c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  return _md.set(x * c + z * s, 0, -x * s + z * c).normalize();
}

// ---------------------------------------------------------------- урон
function hurtHero(d, from) {
  if (H.state === 'dead' || game.over) return; H.hp = Math.max(0, H.hp - d); heroU.uFlash.value = 1;
  if (H.hp <= 0) { H.state = 'dead'; H.t = 0; H.h = hero.play('Death', .15); heroTorch.douse(); setTimeout(() => endGame('Богатырь пал'), 1800); return; }
  if (from && d >= 10 && H.state !== 'dodge') { H.state = 'hit'; H.t = 0; H.h = hero.play('Hit', .08); H.push = from.clone().sub(hero.position).setY(0).normalize().multiplyScalar(-2.2); }
}
function hurtLeshy(d, kind) {
  if (L.state === 'dead') return; L.hp = Math.max(0, L.hp - d); leshyU.uFlash.value = Math.min(1, leshyU.uFlash.value + d / 10);
  if (L.hp <= 0) { L.state = 'dead'; L.t = 0; L.h = leshy.play('Death', .2); setTimeout(() => endGame('Леший повержен огнём'), 2600); }
  else if (kind === 'heavy') { L.state = 'stun'; L.t = 0; L.h = leshy.play('Hit', .1); }
}
function endGame(t) { if (game.over) return; game.over = true; $('overT').textContent = t; $('over').classList.add('on'); }

// ---------------------------------------------------------------- богатырь
function updateHero(dt) {
  const ch = hero; H.t += dt;
  const md = moveDir(); let want = 0;
  if (H.state === 'move') {
    if (md.lengthSq() > 0) { want = keys.has('ShiftLeft') || keys.has('ShiftRight') ? T.hero.sprint : T.hero.run; ch.yaw = turnTo(ch.yaw, Math.atan2(md.x, md.z), T.hero.turn * dt); }
    H.speed += clamp(want - H.speed, -T.hero.accel * 1.3 * dt, T.hero.accel * dt);
    const f = new THREE.Vector3(Math.sin(ch.yaw), 0, Math.cos(ch.yaw)); ch.position.addScaledVector(f, H.speed * dt); ch.setSpeed(H.speed);
  } else {
    H.speed = Math.max(0, H.speed - 12 * dt); ch.setSpeed(0);
  }
  if (H.state === 'swing') {
    ch.setTime(H.h, warp([[0, 0], [.3, .5, 'in'], [.42, .76, 'out'], [.9, 1.33, 'io']], H.t));
    if (!H.hitDone && H.t > .36) { H.hitDone = true; swingHit(); }
    if (H.t > .9) { ch.stop(H.h); H.state = 'move'; }
  } else if (H.state === 'poke') {
    ch.setTime(H.h, warp([[0, 0], [.55, 1.15, 'io'], [1.05, 1.32], [1.55, 3.1, 'io']], H.t));
    if (H.t > 1.55) { ch.stop(H.h); H.state = 'move'; }
  } else if (H.state === 'dodge') {
    const k = 1 - H.t / T.dodge.dur; ch.position.addScaledVector(H.dodgeDir, T.dodge.speed * Math.max(0, k) * dt * 1.6);
    ch.setPivot(-.25 * Math.sin(Math.PI * Math.min(1, H.t / T.dodge.dur)), 0, .9);
    if (H.t > T.dodge.dur) { ch.setPivot(0, 0, .9); H.state = 'move'; }
  } else if (H.state === 'hit') {
    ch.setTime(H.h, H.t * 1.2); if (H.push) ch.position.addScaledVector(H.push, dt * Math.max(0, 1 - H.t * 2));
    if (H.t > .7) { ch.stop(H.h); H.state = 'move'; }
  } else if (H.state === 'dead') ch.setTime(H.h, Math.min(2.9, H.t * 1.1));
  // поднятый факел, пока не бьёт и не наклоняется
  const tw = H.state === 'move' || H.state === 'dodge' ? (heroTorch.on ? 1 : .6) : 0;
  H.poseW += (tw - H.poseW) * Math.min(1, dt * 8);
  ch.update(dt, H.poseW > .01 ? blend(ID, P.torchUp, H.poseW) : null);
  heroTorch.swing = H.state === 'swing' && H.t > .25 && H.t < .6;
  heroTorch.update(dt); heroBody.update(dt);
  // огонь под ногами: жжёт, сильный — поджигает богатыря
  const p = ch.position, hh = field.heat(p.x, .3, p.z, .8);
  if (hh > .8 && H.state !== 'dead') { hurtHero(hh * 1.6 * dt); if (hh > FM.burn.heroIgnite && !heroBody.burning) { heroBody.ignite(FM.burn.heroDur); toast('Богатырь вспыхнул — уходи из огня!'); } }
  if (heroBody.burning) hurtHero(FM.body.dps * .7 * dt);
  heroU.uFlash.value = Math.max(0, heroU.uFlash.value - dt * 6);
}
function swingHit() {
  const f = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw)); const d = leshy.position.clone().sub(hero.position).setY(0); const dist = d.length();
  if (L.state === 'dead' || dist > T.swing.range || d.normalize().dot(f) < T.swing.cone) return;
  const lit = heroTorch.lit;
  hurtLeshy(lit ? T.swing.litDmg : T.swing.dmg, 'swing');
  for (let k = 0; k < 16; k++) fire._spark(heroTorch.tip, 1.5, .9);
  if (lit) {
    L.fear += .9; if (!leshyBody.burning) toast('Леший загорелся!'); leshyBody.ignite(FM.burn.dur);
    if (L.state !== 'dead' && L.state !== 'stun') { L.state = 'panic'; L.t = 0; L.h = null; }
  } else if (L.state === 'move' || L.state === 'keep') { L.state = 'recoil'; L.t = 0; L.h = leshy.play('Hit', .1); }
}

// ---------------------------------------------------------------- Леший: боится огня, обходит пламя, горит
const DIRS = Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i / 12 * Math.PI * 2), 0, Math.cos(i / 12 * Math.PI * 2)));
const _c4 = new THREE.Vector4();
function steer(from, want, avoid = 2.6) {
  // выбрать направление: ближе к желаемому и подальше от жара (пламя — преграда)
  let best = null, bs = -1e9;
  for (const d of DIRS) {
    const q = from.clone().addScaledVector(d, 1.6); const h = field.heat(q.x, .5, q.z, 1.3);
    let s = d.dot(want) - avoid * Math.min(2, h * .6);
    if (Math.hypot(q.x, q.z) > T.arena - .5) s -= 2;
    for (const c of colliders) if (Math.hypot(q.x - c.x, q.z - c.z) < c.r + .5 && !c.tree?.trunk.fallen) s -= .8;
    if (s > bs) { bs = s; best = d; }
  }
  return best;
}
function updateLeshy(dt) {
  const ch = leshy; L.t += dt; L.atkCD -= dt;
  const toH = hero.position.clone().sub(ch.position).setY(0); const dist = toH.length(); const dirH = toH.clone().normalize();
  // ---- страх: факел в руке богатыря и огонь рядом
  let fearIn = 0;
  if (heroTorch.lit && H.state !== 'dead') {
    const td = heroTorch.tip.distanceTo(ch.position.clone().setY(1.3));
    const facing = new THREE.Vector3(Math.sin(hero.yaw), 0, Math.cos(hero.yaw)).dot(dirH.clone().negate());
    fearIn += FM.fear.torchK * clamp(1 - td / FM.fear.torchR, 0, 1) * (FM.fear.facingMin + (1 - FM.fear.facingMin) * clamp(facing, 0, 1));
  }
  const p = ch.position; const near = field.heat(p.x, .6, p.z, FM.fear.fireR);
  fearIn += Math.min(1.5, near * FM.fear.fireK);
  if (leshyBody.burning) fearIn += .8;
  // страх быстро догоняет угрозу и медленно спадает
  L.fear = clamp(fearIn > L.fear ? L.fear + (fearIn - L.fear) * Math.min(1, dt * FM.fear.rise) : L.fear - FM.fear.decay * dt, 0, 1.6);
  // ---- огонь под ногами: вспыхивает
  const feet = field.heat(p.x, .5, p.z, .9);
  if (feet > FM.burn.igniteHeat && L.state !== 'dead') { if (!leshyBody.burning) toast('Леший вступил в огонь и загорелся!'); leshyBody.ignite(FM.burn.dur * .8); if (L.state !== 'stun') { L.state = 'panic'; L.t = 0; } }
  if (leshyBody.burning) hurtLeshy(FM.body.dps * dt);
  if (feet > .5) hurtLeshy(FM.burn.fieldDps * Math.min(2, feet) * dt);
  leshyU.uFlash.value = Math.max(0, leshyU.uFlash.value - dt * 5);

  let speed = 0, face = null, rot = null;
  const s = L.state;
  if (!game.aiOn && s !== 'dead' && s !== 'panic' && s !== 'stun') { L.state = 'move'; ch.setSpeed(0); ch.update(dt, L.fear > .5 ? blend(ID, P.shield, Math.min(1, L.fear)) : null); return finishLeshy(dt); }
  if (s === 'move' || s === 'keep') {
    if (H.state === 'dead') { speed = 0; }
    else if (L.fear > FM.fear.recoil && s !== 'keep') { L.state = 'recoil'; L.t = 0; L.h = ch.play('Hit', .12); toast('Леший шарахается от огня'); }
    else {
      // держит дистанцию от факела и обходит со спины; без огня — идёт на богатыря
      let target;
      if (L.fear > FM.fear.keep || s === 'keep') {
        const side = new THREE.Vector3(-dirH.z, 0, dirH.x).multiplyScalar(L.circle);
        const back = new THREE.Vector3(-Math.sin(hero.yaw), 0, -Math.cos(hero.yaw));
        target = hero.position.clone().addScaledVector(back, 3.6).addScaledVector(side, 1.2);
        if (dist < 4.2) target = ch.position.clone().addScaledVector(dirH, -2).addScaledVector(side, 1.5);
        if (s === 'keep' && L.t > 2.6) L.state = 'move';
        speed = T.leshy.run * .8;
      } else { target = hero.position.clone(); speed = dist > 7 ? T.leshy.run * .75 : T.leshy.walk; }
      const want = target.sub(ch.position).setY(0); const wl = want.length(); want.normalize();
      L.think -= dt; if (L.think <= 0) { L.think = .12; L.dir.copy(steer(ch.position, want)); }
      if (wl < .4) speed = 0;
      // атака: близко и факел не пугает (или богатырь стоит спиной)
      if (dist < T.claw.range - .2 && L.fear < FM.fear.keep && L.atkCD <= 0 && H.state !== 'dead') { L.state = 'attack'; L.t = 0; L.h = ch.play('Attack', .25); L.hitDone = false; speed = 0; }
      else { face = Math.atan2(L.dir.x, L.dir.z); if (L.fear > FM.fear.keep && dist < 6) face = Math.atan2(dirH.x, dirH.z); ch.position.addScaledVector(L.dir, speed * dt); }
    }
    if (L.fear > .35) rot = blend(ID, P.shield, clamp((L.fear - .35) * 1.4, 0, .85));
  } else if (s === 'recoil') {
    ch.setTime(L.h, L.t * 1.1); ch.position.addScaledVector(dirH, -2.4 * dt * Math.max(0, 1 - L.t / .9)); face = Math.atan2(dirH.x, dirH.z);
    rot = blend(ID, P.shield, .8);
    if (L.t > .9) { ch.stop(L.h); L.state = 'keep'; L.t = 0; L.circle = Math.random() < .5 ? -1 : 1; L.fear = Math.min(L.fear, .9); }
  } else if (s === 'attack') {
    ch.setTime(L.h, warp([[0, 0], [.55, .55, 'in'], [.7, .78, 'out'], [1.25, 1.33, 'io']], L.t)); face = Math.atan2(dirH.x, dirH.z);
    if (L.t < .5) { ch.yaw = turnTo(ch.yaw, face, T.leshy.turn * dt); face = null; }
    if (!L.hitDone && L.t > .62) { L.hitDone = true; const f = new THREE.Vector3(Math.sin(ch.yaw), 0, Math.cos(ch.yaw));
      if (dist < T.claw.range && f.dot(dirH) > T.claw.cone && H.state !== 'dodge') hurtHero(T.claw.dmg, ch.position); }
    // ткнули факелом в морду посреди замаха — срывается
    if (L.t < .55 && L.fear > FM.fear.recoil) { ch.stop(L.h); L.state = 'recoil'; L.t = 0; L.h = ch.play('Hit', .1); }
    else if (L.t > 1.25) { ch.stop(L.h); L.state = 'move'; L.atkCD = 1.2 + Math.random(); }
    face = null;
  } else if (s === 'panic') {
    // горит: бежит прочь от огня и от богатыря, машет руками, поджигая траву на бегу
    const c = field.center(p.x, .5, p.z, 4, _c4);
    const away = dirH.clone().negate(); if (c) away.add(new THREE.Vector3(p.x - c.x, 0, p.z - c.z).normalize().multiplyScalar(1.4));
    if (Math.hypot(p.x, p.z) > T.arena - 3) away.add(new THREE.Vector3(-p.x, 0, -p.z).normalize().multiplyScalar(1.5));
    away.normalize(); L.think -= dt; if (L.think <= 0) { L.think = .15; L.dir.copy(steer(ch.position, away, 1.2)); }
    speed = T.leshy.run; ch.position.addScaledVector(L.dir, speed * dt); face = Math.atan2(L.dir.x, L.dir.z);
    rot = blend(ID, P.flail, .9);
    if (!leshyBody.burning && L.t > 1.2) { L.state = 'keep'; L.t = 0; L.fear = Math.max(L.fear, .9); toast('Огонь на Лешем погас — теперь он держится от огня подальше'); }
  } else if (s === 'stun') {
    ch.setTime(L.h, Math.min(1.05, L.t * .8)); rot = blend(ID, P.shield, .5);
    if (L.t > 2) { ch.stop(L.h); L.state = leshyBody.burning ? 'panic' : 'move'; L.t = 0; }
  } else if (s === 'dead') { ch.setTime(L.h, Math.min(2.9, L.t)); }
  if (face !== null) ch.yaw = turnTo(ch.yaw, face, T.leshy.turn * dt);
  L.speed += (speed - L.speed) * Math.min(1, dt * 5); ch.setSpeed(L.state === 'move' || L.state === 'keep' || L.state === 'panic' ? L.speed : 0);
  ch.update(dt, rot);
  finishLeshy(dt);
}
function finishLeshy(dt) {
  leshyBody.update(dt);
  // знак испуга шагами
  const show = L.state !== 'dead' && (L.fear > FM.fear.keep || L.state === 'panic' || L.state === 'recoil');
  sign.visible = show; if (show) { leshy.worldBone('Head', sign.position); sign.position.y += .62 + (Math.floor(game.time * 8) % 2) * .03; }
}

// ---------------------------------------------------------------- столкновения: круги, арена, фигуры не проходят друг сквозь друга
function collide(ch, r) {
  const p = ch.position;
  for (const c of colliders) { if (c.tree && c.tree.trunk.fallen) continue; const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
  const d = Math.hypot(p.x, p.z); if (d > T.arena) { p.x *= T.arena / d; p.z *= T.arena / d; }
  p.y = 0;
}
function separate() {
  if (L.state === 'dead' || H.state === 'dead') return;
  const d = leshy.position.clone().sub(hero.position).setY(0); const l = d.length(), m = T.heroR + T.leshyR;
  if (l < m && l > 1e-4) { d.multiplyScalar((m - l) / l / 2); leshy.position.add(d); hero.position.sub(d); }
}

// ---------------------------------------------------------------- падающие деревья бьют
function treeHit(tf) {
  for (const [ch, A, who] of [[hero, H, 'h'], [leshy, L, 'l']]) {
    if (tf.hit.has(who) || A.state === 'dead') continue;
    if (tf.distXZ(ch.position) < FM.tree.fallR + A.r) {
      tf.hit.add(who);
      if (who === 'l') { hurtLeshy(FM.tree.fallDmg, 'heavy'); toast('Горящая ель рухнула на Лешего!'); } else { hurtHero(FM.tree.fallDmg * .6, tf.top()); toast('Берегись падающих деревьев!'); }
    }
  }
}

// ---------------------------------------------------------------- камера: за спиной, сама разворачивается за бегом; стрелки — повернуть
function updateCam(dt) {
  let man = 0; if (keys.has('ArrowLeft') || keys.has('KeyQ')) man -= 1; if (keys.has('ArrowRight') || keys.has('KeyZ')) man += 1;
  if (keys.has('ArrowUp')) cam.dist = Math.max(4.5, cam.dist - dt * 5); if (keys.has('ArrowDown')) cam.dist = Math.min(13, cam.dist + dt * 5);
  if (man) { cam.yaw += man * dt * 1.6; cam.manual = 1.2; }
  cam.manual -= dt;
  if (cam.manual <= 0 && H.speed > .5 && !keys.has('KeyS')) cam.yaw += ang(hero.yaw + Math.PI - cam.yaw) * Math.min(1, dt * 1.1);
  const tgt = hero.position.clone().setY(1.45);
  const ld = leshy.position.distanceTo(hero.position); if (L.state !== 'dead' && ld < 11) tgt.lerp(leshy.position.clone().setY(1.6), .22 * (1 - ld / 11));
  cam.target.lerp(tgt, Math.min(1, dt * 6));
  const c = Math.cos(cam.pitch);
  const dir = new THREE.Vector3(Math.sin(cam.yaw) * c, Math.sin(cam.pitch), Math.cos(cam.yaw) * c);
  // кроны и стволы между камерой и богатырём: камера подходит ближе, а не смотрит сквозь
  camRay.set(cam.target, dir); camRay.far = cam.dist;
  const hit = camRay.intersectObjects(camBlockers, false)[0];
  const want = hit ? Math.max(1.6, hit.distance - .35) : cam.dist;
  cam.cur = want < (cam.cur ?? cam.dist) ? want : (cam.cur ?? cam.dist) + (want - (cam.cur ?? cam.dist)) * Math.min(1, dt * 2.5);
  camera.position.copy(cam.target).addScaledVector(dir, cam.cur);
  camera.lookAt(cam.target);
}

// ---------------------------------------------------------------- панель: ветер, огонь, Леший
const WDIRS = ['восток', 'юго-восток', 'юг', 'юго-запад', 'запад', 'северо-запад', 'север', 'северо-восток'];
let windDrift = true;
function syncWind() {
  const a = +$('windDir').value, s = +$('windStr').value / 100; fire.setWind(a, s); fire.wind.gusts = $('gusts').checked; windDrift = $('drift').checked;
  $('oDir').textContent = `на ${WDIRS[Math.round(a / 45) % 8]}`; $('oStr').textContent = s < .05 ? 'штиль' : `${Math.round(s * 12)} м/с`;
  fire.o.spread = +$('spread').value / 100; $('oSpread').textContent = `×${(+$('spread').value / 100).toFixed(1)}`;
  post.mat.uniforms.uHaze.value = $('haze').checked ? 1 : 0;
}
for (const id of ['windDir', 'windStr', 'gusts', 'drift', 'spread', 'haze']) $(id).addEventListener('input', syncWind);
syncWind();
$('bAI').onclick = () => { game.aiOn = !game.aiOn; $('bAI').textContent = game.aiOn ? 'Леший: нападает' : 'Леший: стоит'; $('bAI').classList.toggle('on', game.aiOn); };
$('bReset').onclick = () => reset(); $('overB').onclick = () => reset();
$('toggle').onclick = () => $('ui').classList.toggle('closed');
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.setSize(); });

// ---------------------------------------------------------------- цикл
let last = performance.now(), fpsT = 0, frames = 0, fps = 0, tuftT = 0, hudT = 0;
function step(dt) {
  game.time += dt;
  // ветер гуляет сам: медленно поворачивает
  if (windDrift) { const el = $('windDir'); const a = (+el.value + dt * 4 * Math.sin(game.time * .05) + 360) % 360; el.value = a; fire.setWind(a, fire.wind.strength); $('oDir').textContent = `на ${WDIRS[Math.round(a / 45) % 8]}`; }
  updateHero(dt); updateLeshy(dt);
  collide(hero, T.heroR); collide(leshy, T.leshyR); separate();
  for (const t of trees) t.pre();
  fire.update(dt);
  for (const t of trees) t.post(treeHit);
  heroBlob.position.set(hero.position.x, .025, hero.position.z); leshyBlob.position.set(leshy.position.x, .025, leshy.position.z);
  flagPiv.rotation.y = -fire.wind.angle * Math.PI / 180;
  tuftT += dt; if (tuftT > 1 / 12) { tuftT = 0; updateTufts(); }
  if (game.msgT > 0) { game.msgT -= dt; if (game.msgT <= 0) $('toast').classList.remove('on'); }
}
function hud() {
  $('hpH').style.width = `${H.hp / H.hpMax * 100}%`; $('hpL').style.width = `${L.hp / L.hpMax * 100}%`; $('fearL').style.width = `${Math.min(1, L.fear) * 100}%`;
  const st = { move: L.fear > FM.fear.keep ? 'держит дистанцию' : 'идёт на тебя', keep: 'обходит огонь', recoil: 'шарахается', attack: 'бьёт', panic: 'горит и мечется', stun: 'оглушён', dead: 'повержен' }[L.state] ?? '';
  $('lState').textContent = st; $('torchS').textContent = heroTorch.lit ? 'факел горит' : heroTorch.on ? 'факел занимается' : 'факел погашен';
  const s = fire.stats; $('stats').innerHTML = `<span>Горит узлов: <b>${s.burning}</b> · сгорело <b>${Math.round(s.burnt / Math.max(1, s.total) * 100)}%</b></span><span>${fps} к/с</span>`;
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!game.manual) step(dt);
  updateCam(dt);
  post.render(scene, camera);
  frames++; fpsT += dt; if (fpsT > .5) { fps = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
  hudT += dt; if (hudT > .1) { hudT = 0; hud(); }
  requestAnimationFrame(loop);
}
// для проверки: шаги без рендера
window.__fm = { get H() { return H; }, get L() { return L; }, get hero() { return hero; }, get leshy() { return leshy; }, fire, field, trees, game, cam, act, reset, keys, step, updateCam,
  render() { updateCam(1 / 30); post.render(scene, camera); }, heroTorch: () => heroTorch, leshyBody: () => leshyBody, THREE };
load().catch((e) => { $('loading').textContent = 'Не удалось загрузить модели: ' + e.message; console.error(e); });
