import * as THREE from 'three';
import { Stage, CamRig, U } from './core.js';
import { World } from './world.js';
import { FX } from './fx.js';
import { Hero, loadBogatyr } from './hero.js';
import { buildGrids, scatterAll, buildPlantMeshes, DEFAULT_ON, PLANTS } from './plants.js';
import { heightAt, FIRE, lightAt } from './terrain.js';
import { clamp } from './kit.js';
import { Tab1 } from './tab1.js';
import { Tab2 } from './tab2.js';
import { Tab3 } from './tab3.js';
import { Tab4 } from './tab4.js';
import { Tab5 } from './tab5.js';
import { ObstacleView, ScaleTool } from './debug.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const view = $('view'), canvas = $('gl');

const app = window.__app = {
  $, params, view, canvas, tab: null, tabs: [], keys: new Set(), t: 0, frames: 0, dialogOpen: false,
  input: { x: 0, z: 0, run: false },
};

// ---------------------------------------------------------------- UI-помощники
let toastT = 0;
app.toast = (txt, ms = 2200) => { const el = $('toast'); el.textContent = txt; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); };
app.prompt = (txt) => { const el = $('prompt'); if (txt) { if (el.textContent !== txt) el.textContent = txt; el.classList.add('on'); } else el.classList.remove('on'); };
app.hint = (html) => { $('hint').innerHTML = html; };
app.setTouch = (on) => $('touch').classList.toggle('on', on && isTouch);
app.isTouchDevice = () => isTouch;
const isTouch = matchMedia('(pointer: coarse)').matches || params.has('touch');

// ---------------------------------------------------------------- сцена
try {
  app.stage = new Stage(canvas);
} catch (e) {
  $('loadtxt').textContent = 'Не удалось создать WebGL-сцену: ' + e.message; throw e;
}
const stage = app.stage;
app.world = new World(stage);
buildGrids();
app.pts = scatterAll(app.world.blockers(), app.world.trees, app.world.huts);
app.world.addPlantSolids(app.pts);
app.plants = buildPlantMeshes(app.pts);
stage.scene.add(app.plants.group);
app.fx = new FX(stage.scene);
app.cam = new CamRig(stage.camera);
app.cam.extraTrees = null;
app.cam.blocked = (x, z, hy) => {
  const hp = app.hero.pos;
  for (const h of app.world.huts) { if (hy < 3.4 && Math.abs(x - h.x) < 2.4 && Math.abs(z - h.z) < 2.4 && !(Math.abs(hp.x - h.x) < 3.4 && Math.abs(hp.z - h.z) < 3.4)) return true; }
  if (hy < 5.5) {
    for (const t of app.world.trees) { const r = 1.5 * t.s; if (Math.abs(x - t.x) < r && Math.abs(z - t.z) < r && Math.hypot(x - t.x, z - t.z) < r) return true; }
    if (app.cam.extraTrees) for (const t of app.cam.extraTrees) if (t.alive && Math.hypot(x - t.x, z - t.z) < 1.5 * t.s) return true;
  }
  return false;
};
app.setPlants = (ids) => { const s = new Set(ids); for (const id in app.plants.meshes) { app.plants.meshes[id].visible = s.has(id); app.world.solids.setGroup(id, s.has(id)); } };
app.setPlants(DEFAULT_ON);

// огонь костра (общий)
{
  const g = app.fx;
  app.fireT = 0;
  app.updateFire = (dt) => {
    app.fireT += dt;
    stage.fire.intensity = 14 + Math.sin(app.fireT * 11) * 2.2 + Math.sin(app.fireT * 23) * 1.2;
    if (Math.random() < dt * 40) g.glow.emit(FIRE.x + (Math.random() - 0.5) * 0.4, heightAt(FIRE.x, FIRE.z) + 0.3, FIRE.z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, 1.0 + Math.random() * 1.0, (Math.random() - 0.5) * 0.3, Math.random() < 0.5 ? 0xff7a1c : 0xffb040, 0.1 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, -0.8, 0.8, 0.9, -0.5);
    if (Math.random() < dt * 14) g.glow.emit(FIRE.x + (Math.random() - 0.5) * 0.3, heightAt(FIRE.x, FIRE.z) + 0.6, FIRE.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6, 1.4 + Math.random(), (Math.random() - 0.5) * 0.6, 0xffc060, 0.03, 1.4 + Math.random(), -0.2, 0.2, 1, 0);
    if (Math.random() < dt * 4) g.soft.emit(FIRE.x + (Math.random() - 0.5) * 0.3, heightAt(FIRE.x, FIRE.z) + 1.0, FIRE.z + (Math.random() - 0.5) * 0.3, 0.12, 0.6, 0.06, 0x1c2a2c, 0.5, 3.2, -0.1, 0.4, 0.3, 2.5);
  };
}

// ---------------------------------------------------------------- размер
const ro = new ResizeObserver(() => { const r = view.getBoundingClientRect(); stage.resize(r.width, r.height); app.tab && app.tab.resize && app.tab.resize(r.width, r.height); });
ro.observe(view);

// ---------------------------------------------------------------- ввод
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', (e) => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat && app.tab && app.tab.onJump) app.tab.onJump(); }
  if (e.code === 'KeyE' && !e.repeat) { app.tab && app.tab.onInteract && app.tab.onInteract(); }
  if (e.code === 'Escape') { app.tab && app.tab.onEscape && app.tab.onEscape(); }
  if (e.code === 'KeyR' && !e.repeat) { app.tab && app.tab.onRotate && app.tab.onRotate(); }
  if (/^Digit[1-9]$/.test(e.code) && app.tab && app.tab.onDigit) app.tab.onDigit(+e.code.slice(5));
  if (KEYMAP[e.code]) { app.keys.add(KEYMAP[e.code]); if (e.code.startsWith('Arrow')) e.preventDefault(); }
  if (e.key === 'Shift') app.keys.add('run');
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) app.keys.delete(KEYMAP[e.code]); if (e.key === 'Shift') app.keys.delete('run'); });
addEventListener('blur', () => app.keys.clear());
// джойстик
const stick = $('stick'); let stickId = null;
const setStick = (e) => {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  app.touchMove = { x: Math.abs(dx) > 0.12 ? dx : 0, z: Math.abs(dy) > 0.12 ? -dy : 0 };
  stick.firstElementChild.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
};
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); setStick(e); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) setStick(e); });
const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; app.touchMove = null; stick.firstElementChild.style.transform = ''; } };
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
let touchRun = false;
$('bRun').addEventListener('click', () => { touchRun = !touchRun; $('bRun').style.background = touchRun ? '#e0a64a55' : ''; });
$('bJump').addEventListener('click', () => app.tab && app.tab.onJump && app.tab.onJump());
$('bE').addEventListener('click', () => app.tab && app.tab.onInteract && app.tab.onInteract());

// вращение камеры перетаскиванием (не мешает кликам: порог 6 пикселей)
app.drag = null;
canvas.addEventListener('pointerdown', (e) => { app.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, lx: e.clientX, ly: e.clientY, button: e.button }; });
canvas.addEventListener('pointermove', (e) => {
  const d = app.drag;
  if (d && d.id === e.pointerId) {
    const dx = e.clientX - d.lx, dy = e.clientY - d.ly; d.lx = e.clientX; d.ly = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > 6 && !(app.tab && app.tab.noOrbit && app.tab.noOrbit(d))) { app.cam.yaw -= dx * 0.006; app.cam.pitch = clamp(app.cam.pitch + dy * 0.004, 0.08, 1.3); app.cam.auto = false; }
  }
  app.tab && app.tab.onPointerMove && app.tab.onPointerMove(e);
});
canvas.addEventListener('pointerup', (e) => {
  const d = app.drag; app.drag = null;
  if (d && d.moved <= 6) app.tab && app.tab.onClick && app.tab.onClick(e);
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); app.cam.dist = clamp(app.cam.dist * (1 + Math.sign(e.deltaY) * 0.08), app.cam.mode === 'orbit' ? 8 : 3, app.cam.mode === 'orbit' ? 90 : 12); }, { passive: false });
// щипок двумя пальцами
{
  const pts = new Map(); let d0 = 0;
  canvas.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
  canvas.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (d0 > 0) { app.cam.dist = clamp(app.cam.dist * (d0 / d), 4, 90); d0 = d; if (app.drag) app.drag.moved = 99; } } });
  const up = (e) => pts.delete(e.pointerId); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
}

// ---------------------------------------------------------------- вкладки
const TABS = [
  ['1', 'Растительность', Tab1], ['2', 'Богатырь', Tab2], ['3', 'Соединение', Tab3], ['4', 'Рубка и сбор', Tab4], ['5', 'Жители', Tab5],
];
const tabsEl = $('tabs');
app.setTab = (i) => {
  if (app.tab === app.tabs[i]) return;
  if (app.tab) { app.tab.leave(); app.setPlants(DEFAULT_ON); app.hero.group.visible = true; }
  tabsEl.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
  for (let k = 0; k < 5; k++) $('s' + (k + 1)).classList.toggle('on', k === i);
  app.tab = app.tabs[i];
  try { tabsEl.children[i].scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* не важно */ }
  $('dbg').classList.toggle('on', i !== 0);
  if (app.obst) { app.obst.mesh.visible = i !== 0 && app.obst.on; app.scale.root.visible = i !== 0 && app.scale.on; $('rulers').hidden = !(i !== 0 && app.scale.on); }
  app.prompt(null); $('label3').classList.remove('on'); $('dialog').classList.remove('on'); $('counters').classList.remove('on');
  app.tab.enter();
  try { history.replaceState(null, '', '#tab' + (i + 1)); } catch (e) { /* в окне просмотра может быть запрещено */ }
};
const loop = (dt) => {
  app.t += dt; app.frames++;
  U.uTime.value = app.t;
  const hero = app.hero;
  // ввод героя
  if (hero) {
    const k = app.keys, tm = app.touchMove;
    hero.input.x = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0) + (tm ? tm.x : 0);
    hero.input.z = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0) + (tm ? tm.z : 0);
    hero.input.x = clamp(hero.input.x, -1, 1); hero.input.z = clamp(hero.input.z, -1, 1);
    hero.input.run = k.has('run') || touchRun;
  }
  app.updateFire(dt);
  app.tab && app.tab.update(dt, app.t);
  if (app.obst) { app.obst.update(dt); app.scale.update(); }
  app.fx.update(dt, stage.camera, stage.h || 600);
  const fp = app.tab && app.tab.focus ? app.tab.focus() : app.cam.center;
  stage.followShadow(fp.x, 0, fp.z);
};
app.sim = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) loop(dt); };
app.step = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) loop(dt); stage.render(app.t); };
let last = performance.now();
const raf = (now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!app.paused && !document.hidden) { loop(dt); if (!app.tab || !app.tab.hideGL) stage.render(app.t); }
  requestAnimationFrame(raf);
};

// ---------------------------------------------------------------- загрузка
(async () => {
  try {
    const gltf = await loadBogatyr('models/bogatyr.wasm', (p) => { $('loadbar').style.width = Math.round(p * 100) + '%'; });
    app.gltf = gltf;
    app.hero = new Hero(gltf, app.world, app.fx);
    stage.scene.add(app.hero.group);
    app.hero.trSlot = 0;
  } catch (e) {
    $('loadtxt').textContent = 'Не удалось загрузить модель богатыря: ' + (e.message || e);
    console.error(e);
  }
  app.obst = new ObstacleView(app); app.scale = new ScaleTool(app);
  { const pr = (b, on) => b.setAttribute('aria-pressed', String(on));
    $('dbgObst').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; pr(e.currentTarget, on); app.obst.set(on); });
    $('dbgScale').addEventListener('click', (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; pr(e.currentTarget, on); app.scale.setOn(on); }); }
  TABS.forEach(([n, name, Cls], i) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false');
    b.innerHTML = `<span class="n">${n}</span>${name}`;
    b.addEventListener('click', () => app.setTab(i));
    tabsEl.appendChild(b);
    app.tabs.push(new Cls(app, $('s' + (i + 1))));
  });
  const m = /tab([1-5])/.exec(location.hash) || /tab=([1-5])/.exec(location.search);
  app.setTab(m ? +m[1] - 1 : 0);
  $('loading').classList.add('off');
  app.ready = true;
  requestAnimationFrame((t) => { last = t; raf(t); });
})();
