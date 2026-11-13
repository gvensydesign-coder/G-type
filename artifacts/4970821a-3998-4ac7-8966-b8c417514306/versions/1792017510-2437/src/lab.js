// Лаборатория стиля: одна мини-сцена (две избы, мелочь, деревья, два костра) рисуется двумя стилями —
// нынешним (комикс с растром) и новым («нарисованный», мрачный). Сцена общая, стиль переключается uniform-ами и пост-проходом.
import * as THREE from 'three';
import { MapGrid } from './mapgrid.js';
import { G, InkPost, ShadowPass } from './toon.js';
import { buildTerrain, buildSky, buildWater } from './terrain.js';
import { makeArcWater } from './arcwater.js';
import { makeAirSigils } from './airsigils.js';
import { FX } from './fx.js';
import { BuildSystem } from './buildsys.js';
import { Forest } from './forest.js';
import { Vegetation } from './vegetation.js';
import { BUILDINGS, BY_ID } from './buildings.js';
import { Props as F } from './props.js';
import { Kit, PAT, COL } from './kit.js';
import { STYLES, applyStyle, makeArcPost, makeArcSky, makeArcExtras } from './arcane.js';

const $ = (id) => document.getElementById(id);
const TEST = location.search.includes('test');
const params = new URLSearchParams(location.search);

// костёр-бочка: своя «постройка» каталога (бочка с углями и огонь)
BUILDINGS.push({
  id: 'ogon', name: 'Бочка с огнём', cat: 'yard', size: [2, 2], tier: 0, cost: {}, effect: {}, time: 1, H: 1.1, plinth: false, desc: '',
  build(k, c) {
    k.stage = 4;
    F.barrel(k, 0, 0, 0, { r: 0.42, h: 0.95 });
    k.cyl(0, 0.9, 0, 0.36, 0.1, { color: 0x1a1210, seg: 10 });
    k.box(0, 0.92, 0, 0.5, 0.1, 0.5, { color: 0xe06a20, pat: PAT.fire });
    c.fx.push({ t: 'fire', x: 0, y: 1.0, z: 0, s: 0.62 }, { t: 'glow', x: 0, y: 1.3, z: 0, r: 3.4 });
  },
});
BY_ID.ogon = BUILDINGS[BUILDINGS.length - 1];

const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setClearColor(0x000000, 0); renderer.autoClear = true;
const PX = Math.min(window.devicePixelRatio || 1, 1.5);
const postOld = new InkPost(renderer);
const postNew = makeArcPost(renderer);
const shadow = new ShadowPass(2048);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 3000);
camera.layers.enableAll();

const map = await MapGrid.load('./lab-map.json');
const terrain = buildTerrain(map); scene.add(terrain);
const skyOld = buildSky(); scene.add(skyOld);
const skyNew = makeArcSky(); scene.add(skyNew);
const fx = new FX(scene);
const sys = new BuildSystem({ map, scene, fx });
sys.free = true; sys.owned = new Set(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1', '0,2', '1,2', '2,2']);
const forest = new Forest(sys, scene); sys.forest = forest;
const veg = new Vegetation(scene, map, sys);
sys.onTerrain = (x0, z0, x1, z1) => { terrain.userData.update(x0, z0, x1, z1); veg.clearCells(x0, z0, x1, z1); };

// ---------- расстановка ----------
const cell = (x, z) => ({ cx: Math.round(x + map.width / 2), cz: Math.round(z + map.height / 2) });
function put(id, x, z, o = {}) {   // x, z — мировые метры центра
  const def = BY_ID[id]; const [w, d] = sys.footprint(def, o.rot ?? 0, o.size);
  const c = cell(x, z);
  const it = sys.add(id, { x0: c.cx - Math.floor(w / 2), z0: c.cz - Math.floor(d / 2), rot: o.rot ?? 0, v: o.v ?? 0, ab: o.ab, stage: 4, size: o.size });
  return it;
}
put('izba', -11, -2, { rot: 1, v: 0 });                  // живая изба слева, фасад к дороге
put('izba', 13, -9, { rot: 3, v: 1, ab: true });         // заброшенная справа, во мху
put('kolodec', 9, 6);
put('bochki', -7, 9);
put('telega', 8, -20);
put('drova', -15, 6);
put('stog', 18, 4);
put('totem', -3, 14, { v: 0 });
put('krest', 4, -16);
put('ogon', -5.5, 8);                                    // костры у дороги
put('ogon', 6.5, 12);
put('ogon', -3, -19.5);                                    // костёр у озера: отражается в воде
sys.add('chastokol', { a: cell(-18, 12), b: cell(-8, 15), stage: 4 });
sys.add('chastokol', { a: cell(16, -2), b: cell(22, 3), stage: 4, ab: true });
const tree = (x, z, kind, s) => { const c = cell(x, z); const i = c.cz * map.width + c.cx; forest.trees.set(i, { cx: c.cx, cz: c.cz, kind, s, seed: (x * 31 + z * 17) | 0 }); sys.occ[i] = -1; };
tree(-20, -12, 'spruce', 1.5); tree(-24, 0, 'spruce', 1.2); tree(21, -14, 'oak', 1.1); tree(24, 8, 'birch', 1.0); tree(-14, -16, 'dead', 1.0); tree(2, -28, 'spruce', 1.6); tree(-22, 12, 'pine', 1.1);
forest.plant(11, [{ x: map.width / 2, z: map.height / 2, r: 46 }]);
for (let sz = 0; sz < sys.SZ; sz++) for (let sx = 0; sx < sys.SX; sx++) forest.rebuildChunk(sx, sz);
// старая растительность (нынешний стиль): трава, мох, камни
let seedN = 99; const rnd = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };
for (let i = 0; i < 900; i++) { const x = (rnd() - 0.5) * 60, z = (rnd() - 0.5) * 56; veg.add(rnd() < 0.7 ? 'grass' : rnd() < 0.5 ? 'meadow' : 'fern', x, z); }
for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 50, z = (rnd() - 0.5) * 44; veg.add(rnd() < 0.6 ? 'moss' : 'stones', x, z); }
// мох на заброшенной избе — кистью по стенам
veg.update();
const extras = makeArcExtras({ scene, map, sys, veg, rnd });
// озеро: в нынешнем стиле — вода игры, в новом — зеркало с мазками; узоры в воздухе живут только в новом
const waterOld = buildWater(192, map.waterLevel + 0.25, map); waterOld.scale.z = map.height / 192; waterOld.position.x = map.origin.x + map.width / 2; waterOld.position.z = map.origin.z + map.height / 2; scene.add(waterOld);
const water = makeArcWater(map, map.waterLevel); scene.add(water.mesh);
const air = makeAirSigils({ scene, map, rnd });   // новые пучки травы/мха, узоры на земле, дымка слоями

// ---------- камера ----------
const cam = { x: 0, z: 4, y: 0, yaw: 0.0, pitch: 0.2, dist: 30, fov: 42 };
const VIEWS = {
  street: { x: 0, z: 2, yaw: 0.0, pitch: 0.17, dist: 34, ty: 4 },
  fire: { x: -4, z: 9, yaw: 0.75, pitch: 0.12, dist: 11, ty: 2.2 },
  sky: { x: 0, z: -4, yaw: 0.0, pitch: 0.02, dist: 38, ty: 26 },
  top: { x: 0, z: 0, yaw: 0.3, pitch: 1.0, dist: 55, ty: 1 },
  lake: { x: -3, z: -34, yaw: -0.2, pitch: 0.2, dist: 26, ty: 0.4 },
};
function setView(n) { Object.assign(cam, { ty: 2.2 }, VIEWS[n]); cam.yawT = cam.yaw; cam.pitchT = cam.pitch; cam.distT = cam.dist; document.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === n)); }
setView('street');
function updateCamera() {
  cam.yaw = cam.yawT; cam.pitch = cam.pitchT; cam.dist = cam.distT;
  const gy = map.heightAt(cam.x, cam.z);
  camera.position.set(cam.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, gy + 2 + Math.sin(cam.pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
  camera.position.y = Math.max(camera.position.y, map.heightAt(camera.position.x, camera.position.z) + 1.2);
  camera.lookAt(cam.x, gy + cam.ty, cam.z);
  camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  skyOld.position.copy(camera.position); skyNew.position.copy(camera.position);
  forest.update(camera.position, 120);
}
let drag = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); drag = { b: e.button, x: e.clientX, y: e.clientY, yaw: cam.yawT, pitch: cam.pitchT, cx: cam.x, cz: cam.z }; });
canvas.addEventListener('pointermove', e => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.b === 2) { cam.yawT = drag.yaw - dx * 0.006; cam.pitchT = Math.max(0.0, Math.min(1.45, drag.pitch + dy * 0.004)); }
  else { const k = cam.distT / innerHeight * 1.6, fx_ = -Math.sin(cam.yawT), fz = -Math.cos(cam.yawT), rx = Math.cos(cam.yawT), rz = -Math.sin(cam.yawT); cam.x = Math.max(-60, Math.min(60, drag.cx - (dx * rx - dy * fx_) * k)); cam.z = Math.max(-45, Math.min(45, drag.cz - (dx * rz - dy * fz) * k)); }
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.distT = Math.max(5, Math.min(120, cam.distT * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
document.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => setView(b.dataset.cam));

// ---------- UI: вид, время, опции ----------
$('btnInfo').onclick = () => { $('info').hidden = !$('info').hidden; };
const S = { mode: 'split', tod: 'dusk', split: 0.5, opt: { sigils: true, haze: true, bloom: true, dots: false, brush: true } };
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.mode = b.dataset.mode; document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b)); layoutUI(); });
document.querySelectorAll('[data-tod]').forEach(b => b.onclick = () => { S.tod = b.dataset.tod; document.querySelectorAll('[data-tod]').forEach(x => x.classList.toggle('on', x === b)); });
document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { S.opt[b.dataset.opt] = !S.opt[b.dataset.opt]; b.classList.toggle('on', S.opt[b.dataset.opt]); });
document.querySelectorAll('[data-opt]').forEach(b => b.classList.toggle('on', !!S.opt[b.dataset.opt]));
function layoutUI() {
  const x = S.mode === 'split' ? S.split * innerWidth : S.mode === 'old' ? innerWidth : 0;
  $('split').style.left = x + 'px'; $('split').hidden = S.mode !== 'split'; $('grab').style.left = x + 'px'; $('grab').hidden = S.mode !== 'split';
  $('tagL').hidden = S.mode === 'new'; $('tagR').hidden = S.mode === 'old';
}
let gdrag = false;
$('grab').addEventListener('pointerdown', e => { gdrag = true; $('grab').setPointerCapture(e.pointerId); });
$('grab').addEventListener('pointermove', e => { if (gdrag) { S.split = Math.max(0.05, Math.min(0.95, e.clientX / innerWidth)); layoutUI(); } });
$('grab').addEventListener('pointerup', () => { gdrag = false; });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(PX); renderer.setSize(w, h, false);
  postOld.setSize(w, h, PX); postNew.setSize(w, h, PX); water.setSize(w * PX, h * PX);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  layoutUI();
}
addEventListener('resize', resize); resize();

// ---------- кадр ----------
const clock = new THREE.Clock();
const _cands = [];
function pickLights(style) {
  _cands.length = 0;
  for (const e of fx.emitters) if (e.t === 'fire' || e.t === 'glow') _cands.push([(e.x - cam.x) ** 2 + (e.z - cam.z) ** 2, e]);
  _cands.sort((a, b) => a[0] - b[0]);
  const n = Math.min(16, _cands.length);
  for (let i = 0; i < n; i++) {
    const e = _cands[i][1], fire = e.t === 'fire', flick = fire ? 0.85 + 0.15 * Math.sin(G.uTime.value * 11 + i * 3) : 1;
    G.uPL.value[i].set(e.x, e.y, e.z, fire ? 4 + (e.s ?? 0.5) * 9 : (e.r ?? 1.5) * 2.6);
    if (style === 'new') G.uPLc.value[i].setRGB(1.0 * flick, 0.38 * flick, 0.1); else G.uPLc.value[i].setRGB(1.0 * flick, 0.6 * flick, 0.28);
  }
  G.uPLn.value = n;
}
function renderPane(style, x0, x1) {   // x0..x1 — доли ширины
  const post = style === 'new' ? postNew : postOld;
  applyStyle(style, S, { G, post, skyOld, skyNew, extras, terrain, fx, waterOld, water, air });
  if (S.dbg && style === 'new') for (const k in S.dbg) G[k].value = S.dbg[k];
  pickLights(style);
  shadow.render(renderer, scene, new THREE.Vector3(cam.x, 0, cam.z), 60);
  if (style === 'new') water.reflect(renderer, scene, camera);
  const W = innerWidth, H = innerHeight;   // setScissor и setViewport сами умножают на pixelRatio
  renderer.setScissorTest(true);
  renderer.setScissor(Math.floor(x0 * W), 0, Math.ceil((x1 - x0) * W), H);
  renderer.setViewport(0, 0, W, H);
  post.render(scene, camera);
  fx.renderOverlay(renderer, camera, post.rt.depthTexture);
  renderer.setScissorTest(false);
}
let step = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  G.uTime.value += dt; step++;
  G.uOwnOn.value = 0; G.uGridOn.value = 0;   // границы владений и сетка стройки здесь не нужны
  updateCamera();
  fx.camPos = camera.position;
  extras.update?.(dt, camera);
  air.update(dt, camera, S.opt.sigils);
  fx.update(dt, G.uTime.value);
  const s = S.mode === 'split' ? S.split : S.mode === 'old' ? 1 : 0;
  if (s > 0) renderPane('old', 0, s);
  if (s < 1) renderPane('new', s, 1);
}
let paused = TEST && params.has('manual');
function loop() { if (!paused) frame(); requestAnimationFrame(loop); }
$('load').remove();
if (TEST) window.__lab = { frame, S, setView, cam, scene, camera, fx, THREE, G, layoutUI, renderer, extras, water, air, map };
loop();
