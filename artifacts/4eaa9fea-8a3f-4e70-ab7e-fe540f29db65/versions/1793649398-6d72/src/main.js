import * as THREE from 'three';
import { G } from './materials.js';
import {
  M, makeGuardian, makeForest, makeGround, makeSkyAndFar, makeGrass, makeLeaves, makeBirds, Dust, makeSamples,
  outlines, outlineUniform, makeMotes,
} from './world.js';
import { Post } from './post.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadCharacters, characterOutlines } from './characters.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 2000);

// солнце: за стражем, слева, невысоко (контровой свет как в видео)
const sunDir = G.uSunDir.value;
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.copy(sunDir).multiplyScalar(80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);
const sunFar = G.uGlowDir.value.clone().multiplyScalar(800); // сияние на небе (контровое)

// ---------- мир ----------
scene.add(makeGround());
const far = makeSkyAndFar(scene);
makeForest(scene, G.uGlowDir.value, [[-9, -12], [0.5, -6.5], [-3.5, 19.5]]);
const guardian = makeGuardian(); scene.add(guardian);
const grass = makeGrass(); scene.add(grass, makeGrass(22000, { x0: -24, x1: 24, z0: 13, z1: 25.5 }), makeGrass(9000, { x0: -14, x1: 14, z0: -16, z1: -7.5, dense: true }));
const leaves = makeLeaves(); scene.add(leaves);
const birds = makeBirds(); scene.add(birds);
const dust = new Dust(scene);
// Богатырь (рост ~1,6 м) и Леший (~3,8 м) у ног стража, в стойке Idle
const heroes = loadCharacters(scene, [
  { url: 'models/bogatyr.b64.txt', height: 1.6, pos: [-2.6, 0, 6.2], rotY: Math.PI + 0.35 }, // модель смотрит в -z
  { url: 'models/leshy.b64.txt', height: 3.8, pos: [3.4, 0, 4.6], rotY: -0.45, litTint: [1.04, 1.0, 0.92] },
]);
const motes = makeMotes(); scene.add(motes);
const motesSun = makeMotes(500, new THREE.Vector3(-3, 7, -24), new THREE.Vector3(14, 12, 30)); scene.add(motesSun);
const samples = makeSamples(); samples.position.set(1.0, 0, 4); samples.visible = false; scene.add(samples);

// ---------- ракурсы (каждый сопоставлен кадру видео) ----------
const PRESETS = {
  forest: { name: 'Лес и страж', ref: 't009', pos: [-3.5, 2.4, 19.5], look: [-1.0, 6.4, -4], fov: 42 },
  hull: { name: 'Крупно: обшивка', ref: 't029', pos: [0.6, 6.3, 6.2], look: [0.5, 6.3, 0], fov: 40, dof: 0.55, focus: 4.6 },
  head: { name: 'Крупно: голова', ref: 't025', pos: [-2.2, 10.4, 5.6], look: [0.2, 9.0, 0.3], fov: 40, dof: 0.55, focus: 5.6 },
  sun: { name: 'Солнце сквозь лес', ref: 't079', pos: [0.5, 1.9, -6.5], look: [-5, 10, -60], fov: 46 },
  thrust: { name: 'Двигатели', ref: 't057', pos: [-9, 3.2, -12], look: [0, 6.2, 0], fov: 44, thrust: true },
  sky: { name: 'Небо и облака', ref: 't003', pos: [0, 50, 40], look: [0, 58, -300], fov: 48 },
  top: { name: 'Сверху на кроны', ref: 't065', pos: [0.5, 66, 5], look: [0, 0, -2], fov: 52, noCards: true },
  heroes: { name: 'Богатырь и Леший', ref: null, pos: [-1.6, 1.7, 13.2], look: [-1.4, 2.6, 4.5], fov: 44 },
  mats: { name: 'Образцы материалов', ref: null, pos: [-3.2, 3.8, 23.5], look: [-3.2, 1.6, 4], fov: 52, mats: true },
};
let cur = 'forest';
const camPos = new THREE.Vector3(...PRESETS.forest.pos), camLook = new THREE.Vector3(...PRESETS.forest.look);
const tgtPos = camPos.clone(), tgtLook = camLook.clone();
let orbit = 0, orbitT = 0, lift = 0;

// Свободная камера мышью: ЛКМ — вращать, ПКМ (или Shift+ЛКМ) — сдвигать, колёсико — ближе/дальше.
// На телефоне: один палец вращает, два — сдвиг и масштаб. Кнопка ракурса возвращает к кадру из видео.
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.screenSpacePanning = true; controls.zoomSpeed = 1.1; controls.panSpeed = 0.9; controls.rotateSpeed = 0.6;
controls.minDistance = 0.8; controls.maxDistance = 400; controls.maxPolarAngle = Math.PI * 0.495;
controls.enabled = true;
let free = false; // true — камерой управляет пользователь
controls.addEventListener('start', () => {
  free = true;
  for (const b of ui.presets.children) b.classList.remove('on');
});

const post = new Post(renderer);

// ---------- UI ----------
const ui = {
  presets: document.getElementById('presets'), toggles: document.getElementById('toggles'),
  cmp: document.getElementById('cmp'), cmpImg: document.getElementById('cmpImg'), split: document.getElementById('split'),
  labels: document.getElementById('labels'), fps: document.getElementById('fps'), stage: document.getElementById('stage'),
};
for (const [k, p] of Object.entries(PRESETS)) {
  const b = document.createElement('button'); b.textContent = p.name; b.dataset.k = k;
  b.onclick = () => setPreset(k); ui.presets.appendChild(b);
}
const TOG = [
  ['paint', 'Краска', (v) => (post.comp.uniforms.uPaint.value = v)],
  ['bloom', 'Свечение', (v) => (post.comp.uniforms.uBloom.value = v)],
  ['rays', 'Лучи', (v) => (post.comp.uniforms.uRays.value = v)],
  ['grade', 'Цвет', (v) => (post.comp.uniforms.uGrade.value = v)],
  ['vig', 'Виньетка', (v) => (post.comp.uniforms.uVig.value = v)],
  ['grain', 'Зерно', (v) => (post.comp.uniforms.uGrain.value = v)],
  ['haze', 'Дымка', (v) => { G.uHazeOn.value = v; G.uGroundFog.value = v; far.hz.forEach((m) => (m.visible = !!v)); }],
  ['ink', 'Контуры', (v) => [...outlines, ...characterOutlines].forEach((o) => (o.visible = !!v))],
  ['thr', 'Двигатели', (v) => setThrust(!!v)],
  ['cmp', 'Сравнить с кадром', (v) => setCompare(!!v)],
];
const state = {};
for (const [k, label, fn] of TOG) {
  const l = document.createElement('label');
  const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !['thr', 'cmp'].includes(k); c.id = 't_' + k;
  c.onchange = () => { state[k] = c.checked; fn(c.checked ? 1 : 0); };
  state[k] = c.checked;
  l.append(c, ' ' + label); ui.toggles.appendChild(l);
}
document.getElementById('dustBtn').onclick = () => {
  const p = new THREE.Vector3(); guardian.localToWorld(p.set(-1.4, 0, 0.6)); dust.burst(p, 7, 1.1);
  guardian.localToWorld(p.set(1.4, 0, 0.6)); dust.burst(p, 6, 1.0);
};

function setThrust(on) {
  guardian.userData.flameMat.uniforms.uOn.value = on ? 1 : 0;
  M.glass.uniforms.uEmit.value.set(on ? 0.55 : 0, on ? 0.38 : 0, on ? 0.12 : 0);
  document.getElementById('t_thr').checked = on; state.thr = on;
  if (on) document.getElementById('dustBtn').onclick();
}
let compare = false;
function setCompare(on) { compare = on; document.getElementById('t_cmp').checked = on; layout(); updateRef(); }
function updateRef() {
  const p = PRESETS[cur];
  ui.cmp.style.display = compare && p.ref ? 'block' : 'none';
  if (p.ref) ui.cmpImg.src = `refs/cmp/${p.ref}.jpg`;
}
let splitX = 0.5;
ui.split.addEventListener('input', () => { splitX = ui.split.value / 100; ui.cmpImg.style.clipPath = `inset(0 ${100 - ui.split.value}% 0 0)`; document.getElementById('splitLine').style.left = ui.split.value + '%'; });

function setPreset(k, instant = false) {
  free = false;
  cur = k; const p = PRESETS[k];
  tgtPos.set(...p.pos); tgtLook.set(...p.look); orbit = 0; lift = 0;
  if (instant) { camPos.copy(tgtPos); camLook.copy(tgtLook); }
  camera.fov = p.fov; camera.updateProjectionMatrix();
  post.comp.uniforms.uDof.value = p.dof || 0; post.comp.uniforms.uFocus.value = p.focus || 10;
  if (state.paint !== false) post.comp.uniforms.uPaint.value = p.dof ? 0.35 : 1; // вблизи «краска» мельче, пятна чётче
  guardian.visible = !p.mats; samples.visible = !!p.mats;
  far.hz.forEach((m) => (m.visible = !p.noCards && state.haze !== false)); // сверху вертикальные пелены тумана выглядят листами
  ui.labels.style.display = p.mats ? 'block' : 'none';
  if (p.thrust && !state.thr) setThrust(true);
  if (!p.thrust && state.thr && k !== 'top') setThrust(false);
  for (const b of ui.presets.children) b.classList.toggle('on', b.dataset.k === k);
  updateRef();
}

// подписи образцов
const labelEls = samples.userData.labels.map((s) => { const d = document.createElement('div'); d.className = 'lab'; d.textContent = s.label; ui.labels.appendChild(d); return d; });

// клавиши: 1–8 ракурсы, стрелки — слегка повернуть/поднять камеру
window.addEventListener('keydown', (e) => {
  const keys = Object.keys(PRESETS);
  if (e.key >= '1' && e.key <= String(keys.length)) setPreset(keys[+e.key - 1]);
  if (e.key === 'ArrowLeft') orbit -= 0.08; if (e.key === 'ArrowRight') orbit += 0.08;
  if (e.key === 'ArrowUp') lift += 0.5; if (e.key === 'ArrowDown') lift -= 0.5;
});

// ---------- качество: авто снижает нагрузку, если кадров меньше 40 в секунду ----------
const QUAL = [
  { name: 'Низкое', pr: 0.75, paint: false, rays: false, shadow: 1024 },
  { name: 'Среднее', pr: 1.0, paint: true, rays: true, shadow: 2048 },
  { name: 'Высокое', pr: 1.5, paint: true, rays: true, shadow: 2048 },
];
let qLevel = 2, qAuto = true, lowTime = 0;
function setQuality(l) {
  qLevel = l; const q = QUAL[l];
  post.qPaint = q.paint; post.qRays = q.rays;
  if (sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  layout();
  const sel = document.getElementById('qual'); if (sel && !qAuto) sel.value = String(l);
  document.getElementById('qualNow').textContent = q.name;
}
document.getElementById('qual').onchange = (e) => {
  const v = e.target.value; qAuto = v === 'auto'; lowTime = 0;
  setQuality(qAuto ? 2 : +v);
};

// ---------- размер: в режиме сравнения кадр как у видео (1036×562) ----------
const REF_ASPECT = 1036 / 562;
let W = 1, H = 1;
function layout() {
  const sw = ui.stage.clientWidth, sh = ui.stage.clientHeight;
  if (compare) { W = Math.min(sw, sh * REF_ASPECT); H = W / REF_ASPECT; } else { W = sw; H = sh; }
  W = Math.floor(W); H = Math.floor(H);
  const pr = Math.min(window.devicePixelRatio || 1, QUAL[qLevel].pr);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  for (const el of [canvas, ui.cmp]) { el.style.left = ((sw - W) / 2) + 'px'; el.style.top = ((sh - H) / 2) + 'px'; }
  ui.cmp.style.width = W + 'px'; ui.cmp.style.height = H + 'px';
  camera.aspect = W / H; camera.updateProjectionMatrix();
  post.setSize(W, H, pr);
}
window.addEventListener('resize', layout);
layout();
setPreset(new URLSearchParams(location.search).get('view') || 'forest', true);
if (new URLSearchParams(location.search).get('cmp')) setCompare(true);

// ---------- цикл ----------
const clock = new THREE.Clock();
let t = 0, fpsAcc = 0, fpsN = 0, dustTimer = 0;
const v = new THREE.Vector3();
const MANUAL = new URLSearchParams(location.search).has('manual'); // для автоснимков: кадры по запросу
function frame(fixedDt) {
  const dt = fixedDt !== undefined ? fixedDt : Math.min(clock.getDelta(), 0.05); t += dt; G.uTime.value = t;
  // камера: плавно к ракурсу, лёгкое «дыхание» как у ручной камеры
  if (free) {
    controls.update(); camLook.copy(controls.target);
  } else {
    camPos.lerp(tgtPos, 1 - Math.exp(-dt * 2.5)); camLook.lerp(tgtLook, 1 - Math.exp(-dt * 2.5));
    orbitT += (orbit - orbitT) * (1 - Math.exp(-dt * 3));
    v.copy(camPos).sub(camLook).applyAxisAngle(new THREE.Vector3(0, 1, 0), orbitT).add(camLook);
    camera.position.set(v.x + Math.sin(t * 0.31) * 0.12, v.y + lift + Math.sin(t * 0.43) * 0.06, v.z);
    camera.lookAt(camLook.x, camLook.y + lift * 0.5, camLook.z);
    controls.target.set(camLook.x, camLook.y + lift * 0.5, camLook.z);
  }

  for (const f of guardian.userData.fans) f.rotation.z += dt * 2.2;
  if (state.thr) { dustTimer -= dt; if (dustTimer < 0) { dustTimer = 1.2; const p = new THREE.Vector3(); guardian.localToWorld(p.set(0, 0, -1.5)); dust.burst(p, 3, 0.9); } }
  dust.update(dt); heroes.update(dt);
  // тень следует за камерой
  sun.target.position.set(camLook.x * 0.5, 0, camLook.z * 0.5); sun.position.copy(sun.target.position).addScaledVector(sunDir, 90);

  post.render(scene, camera, sunFar, t);

  if (samples.visible) {
    samples.userData.labels.forEach((s, i) => {
      s.obj.getWorldPosition(v); v.y = s.off + 2.4 + (i % 2) * 0.9; v.project(camera); // подписи через одну выше, чтобы не наезжали
      const el = labelEls[i]; el.style.left = ((v.x * 0.5 + 0.5) * W + canvas.offsetLeft) + 'px'; el.style.top = ((-v.y * 0.5 + 0.5) * H + canvas.offsetTop) + 'px';
      el.style.display = v.z < 1 ? 'block' : 'none';
    });
  }
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 1) {
    const fps = fpsN / fpsAcc; ui.fps.textContent = Math.round(fps) + ' к/с';
    if (qAuto && !MANUAL) { lowTime = fps < 40 ? lowTime + fpsAcc : 0; if (lowTime > 2.5 && qLevel > 0) { setQuality(qLevel - 1); lowTime = -2; } }
    fpsAcc = 0; fpsN = 0;
  }
  if (!MANUAL) requestAnimationFrame(() => frame());
}
if (!MANUAL) frame();
window.__lab = { heroes, setPreset, setCompare, setThrust, PRESETS, renderer, post, G, step: (n = 1, d = 1 / 30) => { for (let i = 0; i < n; i++) frame(d); } };
document.getElementById('hide').onclick = () => { const p = document.getElementById('panel'); p.hidden = !p.hidden; };
