// Дизайн-превью библиотеки рисованного стиля. Сцены: тоннель по фото, стенд слоёв,
// мазки-карточки, ночь и закат по видео. Вся стилизация — из paintfx.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  PaintStyle, PaintPost, StrokeCards, GlowPortal, PaintedSky, PRESETS, PORTAL_PRESETS, SKY_PRESETS,
  PARAM_DEFS, PARAM_GROUPS, COLOR_DEFS, LAYERS,
} from './paintfx.js';
import { FaceMarks, EmotionMarks, FACE_KINDS, MARK_KINDS, FACE_LAYER } from './emotions.js';

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
post.overlay = marks.scene;
post.overlayLayer = FACE_LAYER;
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
    if (c) { marks.show(c.obj, kind, { duration: 2.3, side: who === 'leshy' ? -1 : 1, up: who === 'leshy' ? 0.42 : 0.3 }); break; }
  }
}
function emoUI() {
  const box = document.querySelector('#emo'); if (!box) return;
  box.innerHTML = '';
  const who = document.createElement('select'); who.id = 'emoWho';
  chars.forEach((c, i) => who.add(new Option((c.name === 'leshy' ? 'Леший' : 'Богатырь') + ' ' + (i + 1), i)));
  const fk = document.createElement('select'); fk.id = 'emoFace';
  for (const k in FACE_KINDS) fk.add(new Option('Лицо: ' + FACE_KINDS[k].name, k));
  const sync = () => { const c = chars[+who.value]; if (c?.faceMarks) fk.value = c.faceMarks.kind; };
  who.onchange = sync; fk.onchange = () => chars[+who.value]?.faceMarks?.setKind(fk.value);
  const row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '6px';
  for (const k in MARK_KINDS) {
    const b = document.createElement('button'); b.textContent = MARK_KINDS[k].name;
    b.onclick = () => { const c = chars[+who.value]; if (c) marks.show(c.obj, k, { duration: 2.6, side: c.name === 'leshy' ? -1 : 1, up: c.name === 'leshy' ? 0.42 : 0.3 }); };
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
const FACE_CFG = {
  bogatyr: { kind: 'angry', fwd: 0.12, up: 0.05, width: 0.26, eyeSep: 64, eyeY: 128 },
  leshy: { kind: 'glow', fwd: 0.18, up: -0.05, width: 0.34, eyeSep: 58, eyeY: 128, glow: '#ffa030', glowCore: '#fff2c0' },
};
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
    const ooze = pmesh(new THREE.CircleGeometry(1, 40), { color: '#4a8a2a', emissive: '#3c9a18', emissiveIntensity: 0.22, flow: 'fixed', flowDir: [1, 0, 0], strokeScale: 0.6, cast: false });
    ooze.rotation.x = -Math.PI / 2; ooze.scale.set(3.4, 1.6, 1); ooze.position.set(0.2, -2.38, -2.4); scene.add(ooze);
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
    bulb.position.copy(neon.position); bulb.userData.pfSkip = true; scene.add(bulb);
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

// ---------------------------------------------------------------- переключение сцен
let cur = null, scene = null;
function loadScene(key) {
  if (scene) scene.traverse((o) => { if (o.geometry && !o.isSkinnedMesh) o.geometry.dispose?.(); });
  style.outlines.length = 0; style.materials.clear(); mixers.length = 0; chars.length = 0; faces.length = 0; marks.clear(); autoT = 1.2;
  cur = SCENES[key]; scene = new THREE.Scene();
  cur.cards = null; cur.portal = null; cur.sky = null;
  cur.build(scene);
  scene.updateMatrixWorld(true);
  for (const c of chars) {
    c.wrap.userData.mixer?.update(0); c.wrap.updateMatrixWorld(true);
    const cfg = { ...FACE_CFG[c.name], ...(c.face ?? {}) }; const k = c.h / (c.name === 'leshy' ? 2.3 : 1.8);
    const f = new FaceMarks(style, c.obj, { ...cfg, fwd: cfg.fwd * k, up: cfg.up * k, width: cfg.width * k });
    f.mesh.userData.pfFace = true; c.faceMarks = f; faces.push(f);
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
for (const k in SCENES) { const b = document.createElement('button'); b.textContent = SCENES[k].name; b.dataset.k = k; b.onclick = () => (cur === SCENES[k] ? setView() : loadScene(k)); scBox.appendChild(b); }

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
  ['14. Эскизные линии света', 'Пучок тонких линий вокруг ярких мест, как карандашом по краю света (свод вокруг проёма на фото). Линии рвутся и дрожат.'],
  ['15. Линии эмоций', 'Брови, блики, румянец штрихами, светящиеся глаза Лешего с лучиками. Рисунок меняется 7 раз в секунду.'],
  ['16. Знаки эмоций', 'Рисованные знаки у головы: гнев, «!», «?», шок, пот, искры. Живут шагами 6 раз в секунду и лежат поверх кадра. Это полный стиль.'],
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
    if (o.userData.pfOutline || o.userData.pfFace || (o.userData.pfSkip && o.material?.isShaderMaterial && o.geometry?.attributes?.pcCorner)) { if (o.visible) { o.visible = false; hidden.push(o); } return; }
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
  if (!paused) { for (const m of mixers) m.update(dt); style.update(dt, renderer); cur?.tick?.(dt); for (const f of faces) f.update(dt, camera); marks.update(dt, camera); autoEmotions(dt); }
  controls.update();
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
  } catch (e) { errBox.textContent = 'Модели не загрузились: ' + e.message; }
  const start = new URLSearchParams(location.search).get('scene') ?? 'tunnel';
  loadScene(SCENES[start] ? start : 'tunnel');
  $('#loading').remove();
  frame();
})();
window.__pfResume = () => { window.__pfStop = false; window.__pfFrames = 0; requestAnimationFrame(frame); };
window.__pf = { style, post, SCENES, loadScene, renderer, get scene() { return scene; }, camera, controls };
