// Дизайн-превью библиотеки рисованного стиля. Сцены: тоннель по фото, стенд слоёв,
// мазки-карточки, ночь и закат по видео. Вся стилизация — из paintfx.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  PaintStyle, PaintPost, StrokeCards, GlowPortal, PaintedOoze, PaintedSky, PRESETS, PORTAL_PRESETS, SKY_PRESETS,
  PARAM_DEFS, PARAM_GROUPS, COLOR_DEFS, LAYERS, markLightSource,
} from './paintfx.js';
import { FaceMarks, EmotionMarks, FACE_DESIGNS, MARK_KINDS } from './emotions.js';
import { ScribblePad } from './scribbles.js';
import { loadScribbles, applyHandDrawn, HandGlow, sampleAtlas } from './handdrawn.js';
import { PaintedAura, PaintedFire, PaintedRiver, PaintedFall, EnvSketch, PaintedBackdrop, PaintedTufts, ArcStrokes, elementHand, AURA_PRESETS, FIRE_PRESETS, WATER_PRESETS } from './elementfx.js';
import { ZoneEditor, loadZones, zonePoints, zoneSides, ZoneGlow } from './zones.js';

const $ = (s) => document.querySelector(s);
const errBox = $('#err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 900);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const style = new PaintStyle(PRESETS.mayhem.params);
const post = new PaintPost(renderer, style);
const clock = new THREE.Clock();
const marks = new EmotionMarks(style);
let autoT = 1.2, autoOn = true;
const AUTO_SEQ = [['bogatyr', 'anger'], ['leshy', 'interrobang'], ['bogatyr', 'exclaim'], ['leshy', 'spark'], ['bogatyr', 'sweat'], ['leshy', 'question'], ['bogatyr', 'shock'], ['bogatyr', 'sparkle'], ['leshy', 'swirl']];
let autoI = 0;
function autoEmotions(dt) {
  if (!autoOn || !chars.length) return;
  autoT -= dt; if (autoT > 0) return;
  autoT = 2.6;
  for (let n = 0; n < AUTO_SEQ.length; n++) {
    const [who, kind] = AUTO_SEQ[autoI++ % AUTO_SEQ.length];
    const c = chars.find((x) => x.name === who && x.wrap.visible);
    if (c) { marks.show(c.obj, kind, { duration: 2.3, side: who === 'leshy' ? -1 : 1, up: who === 'leshy' ? 0.32 : 0.22 }); break; }
  }
}
function emoUI() {
  const box = document.querySelector('#emo'); if (!box) return;
  box.innerHTML = '';
  const who = document.createElement('select'); who.id = 'emoWho';
  chars.forEach((c, i) => who.add(new Option((c.name === 'leshy' ? 'Леший' : 'Богатырь') + ' ' + (i + 1), i)));
  const fk = document.createElement('select'); fk.id = 'emoFace';
  const sync = () => { const c = chars[+who.value]; if (!c?.faceMarks) return; fk.innerHTML = ''; const K = FACE_DESIGNS[c.name].kinds; for (const k in K) fk.add(new Option('Лицо: ' + K[k].name, k)); fk.value = c.faceMarks.kind; };
  who.onchange = sync; fk.onchange = () => chars[+who.value]?.faceMarks?.setKind(fk.value);
  const row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '6px';
  for (const k in MARK_KINDS) {
    const b = document.createElement('button'); b.textContent = MARK_KINDS[k].name;
    b.onclick = () => { const c = chars[+who.value]; if (c) marks.show(c.obj, k, { duration: 2.6, side: c.name === 'leshy' ? -1 : 1, up: c.name === 'leshy' ? 0.32 : 0.22 }); };
    row.appendChild(b);
  }
  const au = document.createElement('label'); au.className = 'layers'; au.innerHTML = '<label><input type="checkbox" id="emoAuto"> Показывать знаки сами</label>';
  box.append(who, fk, row, au);
  const ai = box.querySelector('#emoAuto'); ai.checked = autoOn; ai.onchange = () => { autoOn = ai.checked; };
  sync();
}
let paused = false;

// ---------------------------------------------------------------- модели
const loader = new GLTFLoader();
async function loadModel(name) {
  const r = await fetch(`models/${name}.b64.txt`);
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  const b64 = (await r.text()).trim();
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  return new Promise((res, rej) => loader.parse(buf, '', res, rej));
}
const models = {};

function fitHeight(obj, h) {
  const box = new THREE.Box3().setFromObject(obj); const s = h / (box.max.y - box.min.y);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
}
const mixers = [];
const chars = [];
const faces = [];
// где лицо относительно кости головы (на рост 1,8 м) и что рисуем по умолчанию
// Глазницы замерены по геометрии голов (луч спереди в осях кости головы, сетка 1 см):
// eyes — точки на поверхности в координатах кости mixamorigHead, frame.f — «вперёд» лица в тех же осях.
const FACE_CFG = {
  bogatyr: { design: 'bogatyr', kind: 'stern', frame: { f: [0.99, 0.08, -0.06] },
    eyes: [[0.0412, 0.0264, 0.0154], [0.0376, 0.0261, -0.0204]], spanK: 3.6, depthK: 0.5 },
  leshy: { design: 'leshy', kind: 'glow', frame: { f: [0.6, 0.6, -0.5] },
    eyes: [[0.0429, 0.0303, -0.002], [0.0101, 0.0334, -0.0374]], spanK: 4.2, depthK: 0.6 },
};
// Разметка зон, которую Michael нарисовал в режиме «Разметка зон» (свежая из окна или файл zones/*.json).
const zoneData = {};
const glows = [];
const ZONE_GLOW = { bogatyr: { color: '#ffc870', intensity: 1.2 }, leshy: { color: '#6dff96', intensity: 1.5 } };
// Глаза, их ширина и рот берутся из зон: красная — глаза (если рядом зелёная «светится», центр — по ней), синяя — рот.
function faceFromZones(obj, data, frameF) {
  let bone = null; obj.traverse((b) => { if (!bone && b.isBone && /head$/i.test(b.name)) bone = b; });
  if (!bone) return {};
  obj.updateMatrixWorld(true);
  const O = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const bq = bone.getWorldQuaternion(new THREE.Quaternion());
  const F = new THREE.Vector3(...frameF).normalize().applyQuaternion(bq);
  const Sx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), F).normalize();
  const eyes = zonePoints(obj, data, 'eyes'); if (eyes.length < 4) return {};
  const E = zoneSides(eyes, bone, O, Sx); if (!E.L || !E.R) return {};
  const ws = bone.getWorldScale(new THREE.Vector3()).x;
  // ядро свечения в глазнице, если размечено рядом
  const glow = zonePoints(obj, data, 'glow');
  const near = (C) => { const g = glow.filter((p) => p.w.distanceTo(C) < 0.04 * ws / 2); return g.length >= 2 ? g.reduce((a, p) => a.add(p.w), new THREE.Vector3()).multiplyScalar(1 / g.length) : C; };
  const Lw = near(E.L), Rw = near(E.R);
  const half = (side, C) => { const xs = eyes.filter((p) => (p.w.clone().sub(O).dot(Sx) < 0) === side).map((p) => p.w.clone().sub(C).dot(Sx)); return xs.length ? (Math.max(...xs) - Math.min(...xs)) / 2 : 0.015; };
  const out = { eyes: [bone.worldToLocal(Lw.clone()).toArray(), bone.worldToLocal(Rw.clone()).toArray()], eyeHalfW: (half(true, E.L) + half(false, E.R)) / 2 / ws };
  const mouth = zonePoints(obj, data, 'mouth');
  if (mouth.length >= 3) {
    const M = mouth.reduce((a, p) => a.add(p.w), new THREE.Vector3()).multiplyScalar(1 / mouth.length);
    const xs = mouth.map((p) => p.w.clone().sub(M).dot(Sx));
    out.mouthB = bone.worldToLocal(M.clone()).toArray(); out.mouthHalfW = (Math.max(...xs) - Math.min(...xs)) / 2 / ws;
  }
  return out;
}
function character(name, h, anim = 'Idle', opts = {}) {
  const src = models[name];
  const obj = SkeletonUtils.clone(src.scene);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  fitHeight(obj, h);
  const wrap = new THREE.Group(); wrap.add(obj);
  style.paintObject(obj, { flow: 'wrap', flowDir: [0, 1, 0], strokeScale: opts.strokeScale ?? 0.55, rimScale: 1.2 });
  style.addOutline(obj, { widthScale: opts.lineScale ?? 1 });
  const clip = src.animations.find((a) => a.name === anim) ?? src.animations[0];
  if (clip) { const m = new THREE.AnimationMixer(obj); const a = m.clipAction(clip); a.time = Math.random() * clip.duration; a.play(); mixers.push(m); wrap.userData.mixer = m; }
  chars.push({ wrap, obj, name, h, face: opts.face });
  wrap.userData.charName = name;
  return wrap;
}

// рисованный меш + обычный материал для сравнения
function pmesh(geo, opts) {
  const m = new THREE.Mesh(geo, style.material({ rimScale: 0, ...opts }));
  m.userData.pfPlain = new THREE.MeshStandardMaterial({
    color: opts.color, roughness: 0.85, emissive: opts.emissive ?? '#000', emissiveIntensity: opts.emissiveIntensity ?? 1, side: opts.side ?? THREE.FrontSide,
  });
  m.castShadow = opts.cast ?? true; m.receiveShadow = true;
  return m;
}
function sun(color, intensity, pos, target = [0, 0, 0], size = 12) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos); l.target.position.set(...target);
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048);
  const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = 80;
  l.shadow.bias = -0.0006; l.shadow.normalBias = 0.03;
  return l;
}

// ---------------------------------------------------------------- сцены
// камень: икосаэдр с неровностями (одинаковые вершины смещаются одинаково — поверхность без щелей)
function rockGeo(s, seed = 1) {
  const g = new THREE.IcosahedronGeometry(s, 1); const P = g.attributes.position; const v = new THREE.Vector3();
  const h = (x, y, z) => { const t = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453; return t - Math.floor(t); };
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = 0.82 + 0.3 * h(+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)); v.multiplyScalar(k); P.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
const SCENES = {};

SCENES.tunnel = {
  name: 'Тоннель (фото)', preset: 'mayhem',
  caption: '<b>Тоннель по кадру из фото.</b> Кирпично-бурый свод мазками по кругу, светящийся проём с дуговыми мазками и цветной кромкой, контровый свет на силуэтах, кислотная лужа, тёплые почти чёрные тени, зерно и бумага.',
  view: { pos: [0.4, -1.0, 6.8], target: [0, -0.3, -4] },
  build(scene) {
    const R = 4.2;
    const tunnel = pmesh(new THREE.CylinderGeometry(R, R, 30, 64, 1, true), { color: '#6e4630', flow: 'wrap', flowDir: [0, 1, 0], side: THREE.BackSide, strokeScale: 1.7, cast: false });
    tunnel.rotation.x = Math.PI / 2; tunnel.position.z = -4; scene.add(tunnel);
    const floor = pmesh(new THREE.PlaneGeometry(7.4, 30, 1, 1), { color: '#4a3424', flow: 'fixed', flowDir: [0, 0, 1], strokeScale: 1.3, cast: false });
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.4, -4); scene.add(floor);
    // кислотная лужа
    const ooze = new PaintedOoze(style, { light: [0, -0.5, -10] }).mesh;
    ooze.scale.set(3.4, 1.6, 1); ooze.position.set(0.2, -2.38, -2.4); scene.add(ooze);
    // передний бортик-труба
    const ledge = pmesh(new THREE.BoxGeometry(9, 0.55, 0.9), { color: '#5a3020', flow: 'fixed', flowDir: [1, 0, 0], strokeScale: 0.9 });
    ledge.position.set(0, -2.15, 2.2); scene.add(ledge);
    const ledge2 = pmesh(new THREE.BoxGeometry(9, 0.3, 0.2), { color: '#7a3c26', flow: 'fixed', flowDir: [1, 0, 0], strokeScale: 0.6 });
    ledge2.position.set(0, -1.82, 2.62); scene.add(ledge2);
    // трубы на своде
    for (const [x, y, r] of [[-3.1, 2.2, 0.18], [-2.7, 2.75, 0.12], [3.3, 1.9, 0.15]]) {
      const p = pmesh(new THREE.CylinderGeometry(r, r, 19, 12), { color: '#3a2418', flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.5 });
      p.rotation.x = Math.PI / 2; p.position.set(x, y, -0.4); scene.add(p);
    }
    const portal = new GlowPortal(style, { radius: R * 0.93, colors: PORTAL_PRESETS.sewer, lightIntensity: 9, lightRange: 12 });
    portal.group.position.set(0, 0, -10); scene.add(portal.group);
    this.portal = portal;
    scene.add(new THREE.HemisphereLight('#7a5a40', '#1a0e08', 0.35));
    scene.add(sun('#e8eab0', 1.3, [0.6, 3.2, -11], [0, -2.4, 0], 9));
    const fill = new THREE.DirectionalLight('#ffb070', 0.8); fill.position.set(2, 1, 8); scene.add(fill);
    const b = character('bogatyr', 1.75, 'Idle'); b.position.set(-1.1, -2.4, -1.6); b.rotation.y = 0.25; scene.add(b);
    const l = character('leshy', 2.35, 'Idle', { strokeScale: 0.7 }); l.position.set(1.5, -2.4, -2.8); l.rotation.y = -0.35; scene.add(l);
    const b2 = character('bogatyr', 1.6, 'Crouch'); b2.position.set(-2.6, -2.4, -0.6); b2.rotation.y = 0.7; scene.add(b2);
    scene.background = new THREE.Color('#0c0604');
    this.portalSel = 'sewer';
  },
};

SCENES.stand = {
  name: 'Стенд слоёв', preset: 'rus',
  caption: '<b>Стенд образцов.</b> Сфера, узел, брус, колонна и Богатырь под одним солнцем. Двигайте «Разбор по слоям», чтобы увидеть, как кадр складывается из заливки, цветных теней, мазков, карандаша, кромки, контура и пост-обработки.',
  view: { pos: [0, 3.2, 11.5], target: [0, 0.9, 0] },
  build(scene) {
    const sky = new PaintedSky(style, { colors: SKY_PRESETS.overcast }); scene.add(sky.mesh); this.sky = sky;
    const ground = pmesh(new THREE.CircleGeometry(14, 64), { color: '#7a7058', flow: 'fixed', flowDir: [1, 0, 0.3], strokeScale: 1.8, cast: false });
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const items = [
      [new THREE.SphereGeometry(0.85, 64, 32), '#c87a3c', [-4, 0.85, 0]],
      [new THREE.TorusKnotGeometry(0.55, 0.2, 200, 24), '#4a7ab0', [-2, 1.1, 0]],
      [new THREE.BoxGeometry(1.2, 1.6, 1.2), '#8a5a3a', [2, 0.8, 0]],
      [new THREE.CylinderGeometry(0.45, 0.55, 2.4, 32), '#b8b0a0', [4, 1.2, 0]],
    ];
    for (const [g, c, p] of items) {
      const m = pmesh(g, { color: c, flow: 'wrap', flowDir: [0, 1, 0], strokeScale: 0.5, rimScale: 1 }); m.position.set(...p); scene.add(m);
      style.addOutline(m);
    }
    const b = character('bogatyr', 1.8, 'Idle'); b.position.set(0, 0, 0.2); scene.add(b);
    scene.add(new THREE.HemisphereLight('#a8b8c8', '#4a3a2a', 0.6));
    scene.add(sun('#fff0d0', 2.6, [6, 9, 5], [0, 0, 0], 8));
    const back = new THREE.DirectionalLight('#ffd890', 1.2); back.position.set(-4, 3, -8); scene.add(back);
  },
};

SCENES.cards = {
  name: 'Мазки-карточки', preset: 'rus',
  caption: '<b>Мазки по модели, как в начале видео.</b> Плоские мазки с ворсом и сухим хвостом рассыпаны по поверхности и лежат вдоль формы. Цвет из текстуры модели, свет в 2–3 тона. «Вырастить» повторяет дорисовку.',
  view: { pos: [0, 1.4, 4.4], target: [0, 1.05, 0] },
  build(scene) {
    scene.background = new THREE.Color('#1d1b1c');
    const sky = new PaintedSky(style, { colors: { top: '#1a1a1c', mid: '#262426', low: '#302c2c', cloud: '#3a3636', cloudShade: '#1a1818', stroke: 1, clouds: 0.5 } });
    scene.add(sky.mesh);
    const ground = pmesh(new THREE.CircleGeometry(6, 48), { color: '#3a3434', flow: 'fixed', strokeScale: 1, cast: false });
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const b = character('bogatyr', 2, 'Idle'); b.position.set(-0.7, 0, 0); b.rotation.y = 0.3; scene.add(b);
    const l = character('leshy', 2.2, 'Idle'); l.position.set(0.9, 0, -0.4); l.rotation.y = -0.4; scene.add(l);
    scene.add(new THREE.HemisphereLight('#8090a8', '#2a2020', 0.5));
    scene.add(sun('#ffe8c8', 2.4, [3, 5, 4], [0, 1, 0], 4));
    const back = new THREE.DirectionalLight('#9ad0ff', 1.4); back.position.set(-3, 2, -4); scene.add(back);
    this.cards = [];
    for (const o of [b, l]) {
      const c = new StrokeCards(style, o, { density: 1500, size: 0.035, aspect: 3.2, lightDir: [3, 5, 4], backDir: [3, -2, 4], backColor: '#9ad0ff' });
      this.cards.push(c);
    }
    this.growT = 0;
  },
  tick(dt) {
    if (!this.cards) return;
    this.growT = Math.min(1, this.growT + dt / 3.5);
    const g = this.growT * this.growT * (3 - 2 * this.growT);
    for (const c of this.cards) c.grow = g;
  },
  extra() {
    const d = document.createElement('div');
    d.innerHTML = '<div class="row" style="margin-top:6px"><button id="regrow">Вырастить заново</button></div>' +
      '<div class="sl"><span>Размер мазка, см</span><input id="cardSize" type="range" min="1" max="10" step="0.1" value="3.5"><output>3.5</output></div>';
    d.querySelector('#regrow').onclick = () => { this.growT = 0; };
    const s = d.querySelector('#cardSize');
    s.oninput = () => { s.nextElementSibling.value = s.value; for (const c of this.cards) c.setOptions({ size: s.value / 100 }); };
    return d;
  },
};

SCENES.night = {
  name: 'Ночь (видео)', preset: 'neon',
  caption: '<b>Ночь из конца видео.</b> Огромная луна с рваным краем мазков, небо фиолетово-бордовыми полосами, неоновый синий свет, тыквы-фонари. Bloom и аберрация сильнее, тени уходят в фиолетовый.',
  view: { pos: [2.5, 1.6, 7.5], target: [0, 1.4, 0] },
  build(scene) {
    const sky = new PaintedSky(style, { colors: SKY_PRESETS.night }); scene.add(sky.mesh); this.sky = sky;
    const moon = new GlowPortal(style, { radius: 26, colors: PORTAL_PRESETS.moon, light: false });
    moon.group.position.set(-30, 40, -140); moon.group.lookAt(0, 0, 0); scene.add(moon.group); this.portal = moon; this.portalSel = 'moon';
    const ground = pmesh(new THREE.CircleGeometry(40, 64), { color: '#4a2840', flow: 'fixed', flowDir: [1, 0, 0.2], strokeScale: 2.2, cast: false });
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const pg = new THREE.SphereGeometry(0.42, 24, 16); pg.scale(1, 0.72, 1);
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, r = 2.5 + rnd() * 7;
      const p = pmesh(pg, { rimScale: 1, color: '#e07020', emissive: '#ff6a10', emissiveIntensity: rnd() < 0.3 ? 0.8 : 0, flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.35 });
      const s = 0.6 + rnd() * 0.9; p.scale.setScalar(s); p.position.set(Math.cos(a) * r, 0.3 * s, Math.sin(a) * r - 1); scene.add(p);
    }
    const b = character('bogatyr', 1.8, 'Idle'); b.position.set(0.3, 0, 0.5); b.rotation.y = -0.3; scene.add(b);
    const l = character('leshy', 2.4, 'Idle'); l.position.set(-1.8, 0, -1.2); l.rotation.y = 0.5; scene.add(l);
    const neon = new THREE.PointLight('#4aa8ff', 9, 8, 1.6); neon.position.set(1.6, 1.2, 1.4); scene.add(neon);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 5, 9) }));
    bulb.position.copy(neon.position); bulb.userData.pfSkip = true; markLightSource(bulb); scene.add(bulb);
    scene.add(new THREE.HemisphereLight('#6a3a80', '#200a18', 0.5));
    scene.add(sun('#d8e4ff', 1.6, [-12, 14, -30], [0, 0, 0], 10));
  },
};

SCENES.sunset = {
  name: 'Закат 2.5D (видео)', preset: 'pastel',
  caption: '<b>Закат 2.5D из середины видео.</b> Небо и дальние руины нарисованы на плоскостях, песок мазками, тёплый низкий свет и сине-фиолетовые тени, сильный bloom по краю света.',
  view: { pos: [3.2, 1.2, 6.2], target: [0, 1.2, 0] },
  build(scene) {
    const sky = new PaintedSky(style, { colors: SKY_PRESETS.sunset }); scene.add(sky.mesh); this.sky = sky;
    const g = new THREE.PlaneGeometry(120, 120, 120, 120); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const d = Math.hypot(x, z); pos.setY(i, Math.sin(x * 0.18 + z * 0.07) * 0.6 * Math.min(1, d / 8) + Math.sin(z * 0.11) * 0.8 * Math.min(1, d / 12)); }
    g.computeVertexNormals();
    const sand = pmesh(g, { color: '#e8b878', flow: 'fixed', flowDir: [1, 0, 0.15], strokeScale: 2, cast: false }); scene.add(sand);
    // 2.5D руины: плоские силуэты вдали
    for (let i = 0; i < 7; i++) {
      const w = 2 + (i % 3) * 1.5, h = 4 + ((i * 7) % 5) * 2;
      const m = pmesh(new THREE.BoxGeometry(w, h, 0.4), { color: '#c89070', flow: 'fixed', flowDir: [0, 1, 0], strokeScale: 2.5, cast: false });
      m.position.set(-30 + i * 9 + (i % 2) * 3, h / 2 - 0.5, -38 - (i % 3) * 6); scene.add(m);
    }
    const b = character('bogatyr', 1.8, 'Run'); b.position.set(0, 0, 0); b.rotation.y = 0.9; scene.add(b);
    const l = character('leshy', 2.4, 'Walk'); l.position.set(-2.5, 0, -2.5); l.rotation.y = 0.8; scene.add(l);
    scene.add(new THREE.HemisphereLight('#8a90e0', '#c08060', 0.55));
    scene.add(sun('#ffc890', 2.8, [9, 5, 8], [0, 0, 0], 8));
    const rimL = new THREE.DirectionalLight('#ffe0a0', 1.5); rimL.position.set(-10, 3, -12); scene.add(rimL);
  },
};

SCENES.elements = {
  name: 'Ауры, огонь, вода', preset: 'rus',
  caption: '<b>Стихии в рисованном стиле.</b> Аура включается рывком: сбор, вспышка-звезда за спиной, удар кольцом по земле, языки по силуэту кольцами тонов с тушевой кромкой, штрихи вверх, у Богатыря искры, у Лешего листья. Костёр языками и каплями, дым клубами, угли. Река полосами глубины с рваной пеной, водопад струями. Огонь и ауры красят тела и землю ступенями, тени у костра тёплые, в реке их отражения рваными штрихами. Дальний план силуэтами через дымку, трава пучками, вокруг костра мазки дугами. Всё живёт шагами, как рисованная анимация.',
  view: { pos: [0.6, 1.9, 7.6], target: [0, 1.0, -0.6] },
  build(scene) {
    const sky = new PaintedSky(style, { colors: SKY_PRESETS.night }); scene.add(sky.mesh); this.sky = sky;
    const ground = pmesh(new THREE.CircleGeometry(40, 64), { color: '#4e5234', flow: 'fixed', flowDir: [1, 0, 0.2], strokeScale: 1.4, cast: false });
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // река за героями и водопад со скалы слева
    const river = new PaintedRiver(style, { length: 26, width: 3.4, preset: 'night', light: [-30, 40, -140] });
    river.group.position.set(0, 0.03, -4.6); scene.add(river.group);
    for (const [x, z, r] of [[1.5, 1.4, 0.35], [4.2, -1.5, 0.4], [-0.8, -1.6, 0.3]]) river.addRock(x, z, r);
    const fall = new PaintedFall(style, { width: 1.3, height: 2.3, preset: 'night' });
    fall.group.position.set(-3.4, 0.02, -6.15); scene.add(fall.group); river.fall = fall;
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    // скала за водопадом: верх на уровне кромки струи, по бокам глыбы; камни в русле
    for (const [x, y, z, s, sy] of [[-3.4, 1.15, -7.7, 1.6, 0.75], [-4.9, 0.75, -7.0, 1.1, 0.8], [-1.9, 0.7, -7.1, 1.0, 0.8], [-4.2, 1.9, -8.2, 1.0, 0.9], [-2.6, 1.8, -8.3, 0.9, 0.9], [1.5, 0.12, -3.2, 0.35, 0.6], [4.2, 0.1, -6.1, 0.4, 0.6], [-0.8, 0.08, -6.2, 0.3, 0.6]]) {
      const m = pmesh(rockGeo(s, x * 7 + z), { color: '#86766e', flow: 'wrap', strokeScale: 0.8 }); m.position.set(x, y, z); m.rotation.set(rnd() * 3, rnd() * 3, 0); m.scale.y = sy; scene.add(m);
    }
    const moon = new GlowPortal(style, { radius: 20, colors: PORTAL_PRESETS.moon, light: false });
    moon.group.position.set(-30, 40, -140); moon.group.lookAt(0, 0, 0); scene.add(moon.group);
    const fire = new PaintedFire(style, { size: 0.9, preset: 'hearth' }); fire.group.position.set(0.15, 0, 0.9); scene.add(fire.group);
    const b = character('bogatyr', 1.8, 'Idle'); b.position.set(-1.7, 0, 0.3); b.rotation.y = 0.55; scene.add(b);
    const l = character('leshy', 2.4, 'Idle'); l.position.set(2.0, 0, -0.4); l.rotation.y = -0.6; scene.add(l);
    scene.add(new THREE.HemisphereLight('#4a5a8a', '#1a1420', 0.5));
    scene.add(sun('#c8d4ff', 1.1, [-12, 14, -30], [0, 0, 0], 10));
    const fillL = new THREE.DirectionalLight('#8a9ad8', 0.7); fillL.position.set(3, 4, 8); scene.add(fillL);
    // наброски окружения: линии поиска формы над скалами и по горизонту
    const env = new EnvSketch(style, [
      { p: [-3.4, 2.55, -7.2], w: 3.4, h: 0.9 }, { p: [-5.0, 1.65, -6.6], w: 1.9, h: 0.6, rot: 0.2 }, { p: [-1.8, 1.5, -6.7], w: 1.7, h: 0.6, rot: -0.15 },
      { p: [7, 1.1, -15], w: 7, h: 1.2, rot: 0.03 }, { p: [-9, 1.3, -14], w: 6, h: 1.2, rot: -0.04 }, { p: [3.2, 0.5, -7.4], w: 2.2, h: 0.6, rot: 0.08 },
    ]);
    scene.add(env.group);
    // крупные свободные петли поиска формы по небу и дальнему плану (как карандаш поверх кадра), светлее ближних
    const loops = new EnvSketch(style, [
      { p: [-1, 4.6, -14], w: 12, h: 3, rot: 0.08 }, { p: [6, 3.4, -12], w: 9, h: 2.4, rot: -0.12 }, { p: [-8, 3.6, -12], w: 8, h: 2.5, rot: 0.2 },
    ], { color: '#a04060', light: '#e09070' });
    scene.add(loops.group);
    // дальний план силуэтами: деревня, лес, холмы, между ними дымка
    const back = new PaintedBackdrop(style); scene.add(back.group);
    // трава и кусты пучками: не в реке, не у костра, не под героями
    const tr = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const tuftItems = []; const firePos = new THREE.Vector3(0.15, 0, 0.9);
    const free = (x, z, r0) => !(z > -6.6 && z < -2.6) && Math.hypot(x - firePos.x, z - firePos.z) > 1.4 + r0 && Math.hypot(x + 1.7, z - 0.3) > 1.2 && Math.hypot(x - 2, z + 0.4) > 1.4 && Math.hypot(x + 3.4, z + 7.2) > 2.2;
    for (let i = 0, tries = 0; tuftItems.length < 154 && tries < 3000; tries++) {
      const bush = i < 14; const x = (tr() - 0.5) * 22, z = 4.5 - tr() * 15;
      if (!free(x, z, bush ? 0.4 : 0)) continue;
      tuftItems.push({ p: [x, 0, z], s: bush ? 0.55 + tr() * 0.35 : 0.22 + tr() * 0.2, bush }); i++;
    }
    const tufts = new PaintedTufts(style, tuftItems); tufts.setWarm(firePos, 6); scene.add(tufts.mesh);
    // мазки земли дугами вокруг костра
    const arcs = new ArcStrokes(style, { center: [firePos.x, 0, firePos.z], r0: 0.9, r1: 2.8, count: 48 }); scene.add(arcs.group);
    this.fx = { fire, river, fall, env, loops, back, tufts, arcs };
    this.auras = {
      bogatyr: new PaintedAura(style, b, { preset: 'grace', h: 1.8 }),
      leshy: new PaintedAura(style, l, { preset: 'forest', h: 2.4, particles: 18 }),
    };
    for (const k in this.auras) {
      const a = this.auras[k]; scene.add(a.group);
      a.onChange = (on) => {
        const c = chars.find((x) => x.name === k); const f = c?.faceMarks; if (!f) return;
        f.setKind(on ? (k === 'leshy' ? 'rage' : 'angry') : (k === 'leshy' ? 'glow' : 'stern'));
      };
    }
    this.autoT = 1.0; this.autoI = 0; this.autoOn = true;
  },
  tick(dt) {
    if (!this.fx) return;
    for (const k in this.fx) this.fx[k].update(dt, camera);
    for (const k in this.auras) this.auras[k].update(dt);
    this.light(dt);
    if (!this.autoOn) return;
    this.autoT -= dt; if (this.autoT > 0) return;
    const seq = [['bogatyr', 1], ['leshy', 1], ['bogatyr', 0], ['leshy', 0]];
    const [who, on] = seq[this.autoI++ % seq.length];
    on ? this.auras[who].activate() : this.auras[who].deactivate();
    this.autoT = on ? 2.6 : 1.4;
  },
  // отсвет окружения: огонь и включённые ауры красят тела и землю; отражения в реке
  light(dt) {
    const fire = this.fx.fire; const fp = fire.group.position; this.flT = (this.flT ?? 0) + dt;
    const fk = (0.5 + 0.08 * Math.sin(Math.floor(this.flT * 8) * 2.3)) * Math.min(1.3, fire.amount ?? 1);
    const B = [{ pos: new THREE.Vector3(fp.x, 0.5, fp.z), color: fire.p.light, radius: 7, k: fk }];
    const R = [{ x: fp.x, z: -2.9, w: 0.55, len: 1.7, dir: -1, color: fire.p.light, k: 0.85 }];
    for (const k in this.auras) {
      const a = this.auras[k]; const b = a.bounce(camera); if (!b) continue; B.push(b);
      R.push({ x: b.pos.x, z: -2.9, w: 0.5, len: 1.5, dir: -1, color: a.p.light, k: 0.75 * b.k / 0.85 });
    }
    R.push({ x: this.fx.fall.group.position.x, z: -5.8, w: 0.6, len: 2.2, dir: 1, color: '#c8d8ff', k: 0.55 });
    style.setBounce(B); this.fx.river.setReflectors(R);
  },
  extra() {
    const d = document.createElement('div');
    const opt = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    d.innerHTML = '<h2>Ауры</h2><div class="row"><button id="auB">Аура Богатыря</button><button id="auL">Аура Лешего</button></div>' +
      '<div class="row" style="margin-top:4px"><select id="auBp">' + opt(AURA_PRESETS) + '</select><select id="auLp">' + opt(AURA_PRESETS) + '</select></div>' +
      '<label class="layers"><label><input type="checkbox" id="auAuto" checked> Включать по очереди сами</label></label>' +
      '<h2>Огонь</h2><select id="fiP">' + opt(FIRE_PRESETS) + '</select>' +
      '<div class="sl"><span>Сила огня</span><input id="fiA" type="range" min="0.3" max="1.4" step="0.05" value="1"><output>1</output></div>' +
      '<h2>Вода</h2><select id="waP">' + opt(WATER_PRESETS) + '</select>';
    const A = this.auras; const self = this;
    const stopAuto = () => { self.autoOn = false; d.querySelector('#auAuto').checked = false; };
    d.querySelector('#auB').onclick = () => { stopAuto(); A.bogatyr.toggle(); };
    d.querySelector('#auL').onclick = () => { stopAuto(); A.leshy.toggle(); };
    d.querySelector('#auAuto').onchange = (e) => { self.autoOn = e.target.checked; self.autoT = 0.3; };
    const reAura = (k, sel) => {
      const wasOn = A[k].active; const c = chars.find((x) => x.name === k); A[k].dispose();
      const n = new PaintedAura(style, c.wrap, { preset: sel.value, h: c.h, particles: k === 'leshy' ? 18 : 14 }); scene.add(n.group); n.onChange = A[k].onChange; A[k] = n; if (wasOn) n.activate();
    };
    d.querySelector('#auBp').value = 'grace'; d.querySelector('#auLp').value = 'forest';
    d.querySelector('#auBp').onchange = (e) => reAura('bogatyr', e.target);
    d.querySelector('#auLp').onchange = (e) => reAura('leshy', e.target);
    d.querySelector('#fiP').onchange = (e) => self.fx.fire.setPreset(e.target.value);
    const fa = d.querySelector('#fiA'); fa.oninput = () => { fa.nextElementSibling.value = fa.value; self.fx.fire.amount = +fa.value; };
    d.querySelector('#waP').value = 'night'; d.querySelector('#waP').onchange = (e) => self.fx.river.setPreset(e.target.value);
    return d;
  },
};

// ---------------------------------------------------------------- переключение сцен
let cur = null, scene = null;
function loadScene(key) {
  if (scene) scene.traverse((o) => { if (o.geometry && !o.isSkinnedMesh) o.geometry.dispose?.(); });
  style.outlines.length = 0; style.materials.clear(); mixers.length = 0; chars.length = 0; faces.length = 0; glows.length = 0; marks.clear(); autoT = 1.2;
  if (!style.handEl) style.handEl = elementHand({}, sampleAtlas); style.setBounce([]);
  cur = SCENES[key]; scene = new THREE.Scene();
  cur.cards = null; cur.portal = null; cur.sky = null; cur.fx = null; cur.auras = null;
  cur.build(scene);
  scene.add(marks.group);
  scene.updateMatrixWorld(true);
  for (const c of chars) {
    c.wrap.userData.mixer?.update(0); c.wrap.updateMatrixWorld(true);
    let cfg = { ...FACE_CFG[c.name], ...(c.face ?? {}) }; const k = c.h / (c.name === 'leshy' ? 2.3 : 1.8);
    if (zoneData[c.name]) cfg = { ...cfg, ...faceFromZones(c.obj, zoneData[c.name], cfg.frame.f) };
    const zg = zoneData[c.name] ? new ZoneGlow(c.obj, zoneData[c.name], ZONE_GLOW[c.name]) : null;
    if (zg) glows.push(zg);
    const hg = zg && (style.handGlow || style.handFx) ? new HandGlow(style, zg.anchors, { color: ZONE_GLOW[c.name].color }) : null;
    if (hg) glows.push(hg);
    const f = new FaceMarks(style, c.obj, cfg.eyes ? cfg : { ...cfg, up: cfg.up * k, width: cfg.width * k, depth: (cfg.depth ?? 0.09) * k });
    f.glow = zg; f.hand = hg; f.setKind(f.kind);
    c.faceMarks = f; faces.push(f);
  }
  emoUI();
  applyPreset(cur.preset);
  setView();
  document.querySelectorAll('#scenes button').forEach((b) => b.classList.toggle('on', b.dataset.k === key));
  $('#caption').innerHTML = cur.caption;
  const ex = $('#extra'); ex.innerHTML = '';
  if (cur.portal) ex.appendChild(portalUI());
  if (cur.extra) ex.appendChild(cur.extra());
  applyStep();
}
function applyOffset() {
  const open = !$('#panel').classList.contains('hide') && innerWidth > 760;
  camera.setViewOffset(innerWidth, innerHeight, open ? 170 : 0, 0, innerWidth, innerHeight);
}
function setView() {
  applyOffset();
  camera.position.set(...cur.view.pos); controls.target.set(...cur.view.target); controls.update();
}
function portalUI() {
  const d = document.createElement('div');
  d.innerHTML = '<h2>Светящийся проём</h2>';
  const s = document.createElement('select');
  for (const k in PORTAL_PRESETS) s.add(new Option(PORTAL_PRESETS[k].name, k));
  s.value = cur.portalSel ?? 'sewer';
  s.onchange = () => cur.portal.setColors(PORTAL_PRESETS[s.value]);
  d.appendChild(s);
  return d;
}

// ---------------------------------------------------------------- панель
const scBox = $('#scenes');
for (const k in SCENES) { const b = document.createElement('button'); b.textContent = SCENES[k].name; b.dataset.k = k; b.onclick = () => { if (zed?.active) zed.close(); cur === SCENES[k] ? setView() : loadScene(k); }; scBox.appendChild(b); }
// режим разметки: кистью по модели отмечаются глаза, рот, волосы… — по этим меткам ставятся шейдеры лица
let zed = null;
const zBtn = document.createElement('button'); zBtn.textContent = '✎ Разметка зон'; zBtn.id = 'zBtn'; scBox.appendChild(zBtn);
zBtn.onclick = () => {
  if (!zed) zed = new ZoneEditor({ renderer, canvas, models, names: [{ key: 'bogatyr', label: 'Богатырь' }, { key: 'leshy', label: 'Леший' }], onExit: zoneOff });
  if (zed.active) return zed.close();
  controls.enabled = false; for (const id of ['#panel', '#toggle', '#caption', '#split']) { const e = $(id); if (e) e.style.visibility = 'hidden'; }
  zBtn.classList.add('on'); scBox.querySelectorAll('button[data-k]').forEach((b) => b.classList.remove('on'));
  zed.start();
};
// почеркушки: полотно для рисунков от руки по классам с окном-превью
let scrib = null; let hand = [];
const sBtn = document.createElement('button'); sBtn.textContent = '✍ Почеркушки'; sBtn.id = 'sBtn'; scBox.appendChild(sBtn);
sBtn.onclick = () => {
  if (!scrib) scrib = new ScribblePad({ onExit: async () => {
    sBtn.classList.remove('on');
    // свежие рисунки сразу в стиль: перечитать, подключить, пересобрать сцену
    { const lib = await loadScribbles(); hand = applyHandDrawn(lib, { style, post }); style.handEl = elementHand(lib, sampleAtlas); hand.push(...Object.keys(style.handEl).filter((k) => style.handEl[k].hand)); }
    loadScene(Object.keys(SCENES).find((k) => SCENES[k] === cur) ?? 'tunnel');
  } });
  sBtn.classList.add('on'); scrib.start();
};
async function zoneOff() {
  const [zb, zl] = await Promise.all([loadZones('bogatyr'), loadZones('leshy')]);
  if (zb) zoneData.bogatyr = zb; if (zl) zoneData.leshy = zl;
  for (const f of faces) f.dispose?.();
  loadScene(Object.keys(SCENES).find((k) => SCENES[k] === cur) ?? 'tunnel');
  controls.enabled = true; for (const id of ['#panel', '#toggle', '#caption', '#split']) { const e = $(id); if (e) e.style.visibility = ''; }
  zBtn.classList.remove('on'); document.querySelectorAll('#scenes button[data-k]').forEach((b) => b.classList.toggle('on', SCENES[b.dataset.k] === cur));
}

const prBox = $('#presets');
let curPreset = 'mayhem';
for (const k in PRESETS) { const b = document.createElement('button'); b.textContent = PRESETS[k].name; b.dataset.k = k; b.onclick = () => applyPreset(k); prBox.appendChild(b); }
function applyPreset(k) {
  curPreset = k; style.set(PRESETS[k].params); syncUI();
  prBox.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
}

const lyBox = $('#layers');
const layerInputs = {};
for (const [k, label] of LAYERS) {
  const l = document.createElement('label'); const i = document.createElement('input'); i.type = 'checkbox'; i.checked = true;
  i.onchange = () => { setLayer(k, i.checked); };
  l.append(i, label); lyBox.appendChild(l); layerInputs[k] = i;
}
function setLayer(k, on) {
  style.setLayer(k, on);
  if (k === 'face') for (const f of faces) f.visible = on;
  if (k === 'marks') marks.visible = on;
  if (k === 'cards' && cur?.cards) for (const c of cur.cards) c.visible = on;
}

const STEPS = [
  ['Без стиля', 'Обычный three.js: физический свет, ни одного рисованного слоя. Отсюда начинаем.'],
  ['1. Заливка тонами', 'Свет режется на 2–3 плоских тона с жёсткой границей. Форма читается силуэтом.'],
  ['2. Цветные тени', 'Тень не просто темнее: она сдвинута по тону (бордо, фиолет, оливка) и подсвечена окружением.'],
  ['3. Мазки по форме', 'Клетки Вороного дают мазки с ворсом; каждый мазок чуть наклоняет нормаль и рвёт границу тени.'],
  ['4. Мазки-карточки', 'Поверх модели ложатся плоские мазки-инстансы вдоль формы (как Hatchix в видео).'],
  ['5. Карандаш', 'Пачки тонких волнистых штрихов в тени, перекрёст в глубокой тени, светлые процарапы на свету.'],
  ['6. Контровый свет', 'Рваная светлая кромка на стороне, обращённой к источнику сзади (как силуэты на фоне проёма).'],
  ['7. Контур', 'Оболочка с нажимом: толщина гуляет, есть разрывы, цвет от предмета. Линия кипит шагами.'],
  ['8. Кувахара', 'Мелкие детали сливаются в пятна, края пятен остаются резкими; мазок вытянут вдоль формы.'],
  ['9. Набросок', 'Тонкие линии по глубине с перелётом за край и линии по перепадам цвета.'],
  ['10. Бумага и зерно', 'Волокна и пятна бумаги, зерно сильнее в тенях.'],
  ['11. Свечение', 'Bloom на четверти разрешения, смешение «экран»: проём и огни светятся.'],
  ['12. Аберрация и виньетка', 'Цветная бахрома к краям кадра и затемнение углов.'],
  ['13. Акцентные линии', 'Короткие линии там, где форма резко ломается: складки, пряди, перья, мелкие детали. На свету светлые, в тени тёмные.'],
  ['14. Эскизные линии света', 'Пучок кривых карандашных линий вокруг источника света (проём, луна, лампа), только на его плане: персонажи перед светом остаются чистыми.'],
  ['15. Линии эмоций', 'Нарисованы прямо по модели, как анимированная текстура: у Богатыря светлые щели глаз в тени шлема и красные штрихи, у Лешего зелёный свет в глазницах. Меняются 6 раз в секунду.'],
  ['16. Знаки эмоций', 'Знаки у самой головы: гнев, «!», «?», шок, пот, искры. Часть сцены: бумага, зерно и свечение общие, живут шагами 6 раз в секунду. Это полный стиль.'],
];
const STEP_LAYERS = [null, 'fill', 'shadow', 'stroke', 'cards', 'pencil', 'rim', 'line', 'kuwahara', 'sketch', 'paper', 'bloom', 'lens', 'accent', 'lightlines', 'face', 'marks'];
const stepIn = $('#step');
function applyStep() {
  const s = +stepIn.value;
  for (let i = 1; i < STEP_LAYERS.length; i++) { const on = i <= s; layerInputs[STEP_LAYERS[i]].checked = on; setLayer(STEP_LAYERS[i], on); }
  $('#stepCap').innerHTML = `<b>${STEPS[s][0]}</b>${STEPS[s][1]}`;
}
stepIn.oninput = applyStep;

// ползунки
const pBox = $('#params');
const inputs = {};
const groups = {};
for (const g in PARAM_GROUPS) { const d = document.createElement('details'); d.innerHTML = `<summary>${PARAM_GROUPS[g]}</summary>`; pBox.appendChild(d); groups[g] = d; }
for (const [k, label, min, max, step, g] of PARAM_DEFS) {
  const row = document.createElement('div'); row.className = 'sl';
  row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
  const i = row.querySelector('input'), o = row.querySelector('output');
  i.oninput = () => { style.set({ [k]: +i.value }); o.value = fmt(+i.value); };
  groups[g].appendChild(row); inputs[k] = [i, o];
}
const cd = document.createElement('details'); cd.innerHTML = '<summary>Цвета</summary>'; pBox.appendChild(cd);
for (const [k, label] of COLOR_DEFS) {
  const row = document.createElement('div'); row.className = 'cl';
  row.innerHTML = `<span>${label}</span><input type="color">`;
  const i = row.querySelector('input'); i.oninput = () => style.set({ [k]: i.value });
  cd.appendChild(row); inputs[k] = [i, null];
}
function fmt(v) { return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2); }
function syncUI() {
  for (const k in inputs) { const [i, o] = inputs[k]; const v = style.params[k]; i.value = v; if (o) o.value = fmt(+v); }
}

$('#copy').onclick = async () => {
  const txt = JSON.stringify({ name: PRESETS[curPreset].name + ' (правка)', params: style.params }, null, 2);
  try { await navigator.clipboard.writeText(txt); $('#copy').textContent = 'Скопировано'; } catch { console.log(txt); $('#copy').textContent = 'В консоли'; }
  setTimeout(() => ($('#copy').textContent = 'Копировать пресет (JSON)'), 1500);
};
$('#toggle').onclick = () => { $('#panel').classList.toggle('hide'); applyOffset(); };
$('#anim').onclick = () => { paused = !paused; $('#anim').textContent = paused ? 'Продолжить анимацию' : 'Пауза анимации'; };

// шторка
let compare = false, splitX = 0.5;
const split = $('#split');
$('#cmp').onclick = () => { compare = !compare; $('#cmp').classList.toggle('on', compare); split.style.display = compare ? 'block' : 'none'; placeSplit(); };
function placeSplit() { split.style.left = `${splitX * 100}%`; }
let drag = false;
split.addEventListener('pointerdown', (e) => { drag = true; split.setPointerCapture(e.pointerId); e.stopPropagation(); });
split.addEventListener('pointermove', (e) => { if (drag) { splitX = Math.min(0.95, Math.max(0.05, e.clientX / innerWidth)); placeSplit(); } });
split.addEventListener('pointerup', () => { drag = false; });

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; applyOffset();
});

// ---------------------------------------------------------------- рендер
const hidden = [];
function renderPlain() {
  scene.traverse((o) => {
    if (o.userData.pfOutline || o.userData.pfMark || (o.userData.pfSkip && o.material?.isShaderMaterial && o.geometry?.attributes?.pcCorner)) { if (o.visible) { o.visible = false; hidden.push(o); } return; }
    if (o.isMesh && o.userData.pfPlain) { o.userData.pfPainted = o.material; o.material = o.userData.pfPlain; }
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.setRenderTarget(null); renderer.render(scene, camera);
  renderer.toneMapping = THREE.NoToneMapping;
  scene.traverse((o) => { if (o.userData.pfPainted) { o.material = o.userData.pfPainted; delete o.userData.pfPainted; } });
  for (const o of hidden) o.visible = true; hidden.length = 0;
}

function frame() {
  if (window.__pfStop) { window.__pfFrames = (window.__pfFrames || 0); return; }
  window.__pfFrames = (window.__pfFrames || 0) + 1;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (zed?.active) { zed.render(); requestAnimationFrame(frame); return; }
  if (scrib?.active) { requestAnimationFrame(frame); return; }
  if (!paused) { const ad = style.animDelta(dt); if (ad) for (const m of mixers) m.update(ad); style.update(dt, renderer); cur?.tick?.(dt); for (const f of faces) f.update(dt, camera); for (const g of glows) g.update(dt); marks.update(dt, camera); autoEmotions(dt); }
  controls.update();
  if (cur?.auras) for (const k in cur.auras) cur.auras[k].renderMask(renderer, scene, camera);
  const s = +stepIn.value;
  if (s === 0) { renderPlain(); }
  else {
    if (compare) renderPlain();
    post.splitX = compare ? splitX : 0;
    post.render(scene, camera);
  }
  requestAnimationFrame(frame);
}

(async () => {
  try {
    const [b, l] = await Promise.all([loadModel('bogatyr'), loadModel('leshy')]);
    models.bogatyr = b; models.leshy = l;
    const [zb, zl] = await Promise.all([loadZones('bogatyr'), loadZones('leshy')]);
    if (zb) zoneData.bogatyr = zb; if (zl) zoneData.leshy = zl;
    { const lib = await loadScribbles(); hand = applyHandDrawn(lib, { style, post }); style.handEl = elementHand(lib, sampleAtlas); hand.push(...Object.keys(style.handEl).filter((k) => style.handEl[k].hand)); }
  } catch (e) { errBox.textContent = 'Модели не загрузились: ' + e.message; }
  const start = new URLSearchParams(location.search).get('scene') ?? 'tunnel';
  loadScene(SCENES[start] ? start : 'tunnel');
  $('#loading').remove();
  frame();
})();
window.__pfResume = () => { window.__pfStop = false; window.__pfFrames = 0; requestAnimationFrame(frame); };
window.__pf = { get hand() { return hand; }, get zed() { return zed; }, faces, zoneData, style, post, SCENES, loadScene, renderer, get scene() { return scene; }, camera, controls };
