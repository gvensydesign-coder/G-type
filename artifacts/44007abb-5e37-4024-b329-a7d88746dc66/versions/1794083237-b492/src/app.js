// Рука и вихрь: тестовая сцена двух механик (превью перед переносом в Godot).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Character } from './character.js';
import { FootIK } from './ik.js';
import { WallTouch } from './walltouch.js';
import { LeafVortex, T, PHASES } from './leafvortex.js';
import { buildWorld, collide, colliders, solids, buildPath, pathAt } from './world.js';
import { dashScenario, forestScenario, grabScenario } from './scenarios.js';
import { BONES, applyPose } from './pose.js';
import { Aura, SilhouetteMask, PRESETS as AURA, lerpParams } from './fx/aura.js';
import { SmokeFX, PRESETS as SMOKE } from './fx/smokefx.js';

const $ = (id) => document.getElementById(id);
const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const angTo = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// ------------------------------------------------------------------ renderer, свет сумерек
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const SKY = new THREE.Color('#8c8f86');
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 22, 70);
const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 220);
scene.add(new THREE.HemisphereLight('#d3dccd', '#4a4030', 1.7));
const sun = new THREE.DirectionalLight('#ffd9a8', 2.9);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
buildWorld(scene);
const mask = new SilhouetteMask(renderer);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ загрузка (в опубликованном окне бинарники лежат как base64-текст)
const bar = $('bar').firstElementChild;
let loaded = 0; const step = () => { loaded++; bar.style.width = (loaded / 4) * 100 + '%'; };
async function fetchBin(path) {
  try { const r = await fetch(path); if (r.ok) { const b = await r.arrayBuffer(); step(); return b; } } catch (e) { /* дальше */ }
  const txt = (await (await fetch(path + '.b64.txt')).text()).trim();
  const s = atob(txt), u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  step(); return u8.buffer;
}
const gltfLoad = (u) => fetchBin(u).then((buf) => new Promise((ok, no) => new GLTFLoader().parse(buf, '', ok, no)));
const [gB, gL, man, bin] = await Promise.all([
  gltfLoad('models/bogatyr.glb'), gltfLoad('models/leshy.glb'),
  fetch('data/anims.json').then((r) => r.json()).then((j) => { step(); return j; }),
  fetchBin('data/anims.bin'),
]);
function mocap(model, name) {
  const bones = man.models[model], nb = bones.length, c = man.clips.find((x) => x.model === model && x.name === name);
  const n = c.frames, times = new Float32Array(n);
  for (let f = 0; f < n; f++) times[f] = f / c.fps;
  const rot = new Int16Array(bin, c.rot, n * nb * 4), hips = new Float32Array(bin, c.hips, n * 3);
  const tracks = [];
  for (let b = 0; b < nb; b++) {
    const v = new Float32Array(n * 4);
    for (let f = 0; f < n; f++) {
      const o = (f * nb + b) * 4; let x = rot[o] / 32767, y = rot[o + 1] / 32767, z = rot[o + 2] / 32767, w = rot[o + 3] / 32767;
      const l = Math.hypot(x, y, z, w) || 1; v.set([x / l, y / l, z / l, w / l], f * 4);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack('mixamorig' + bones[b] + '.quaternion', times, v));
  }
  tracks.push(new THREE.VectorKeyframeTrack('mixamorigHips.position', times, new Float32Array(hips)));
  return new THREE.AnimationClip(name, (n - 1) / c.fps, tracks);
}

// ------------------------------------------------------------------ персонажи
function restOf(ch) {
  const r = [];
  ch.model.traverse((o) => { if (o.isBone) r.push([o, o.quaternion.clone(), o.position.clone()]); });
  return () => { for (const [b, q, p] of r) { b.quaternion.copy(q); b.position.copy(p); } };
}
const hero = new Character(gB, { height: 1.53, name: 'Богатырь' });
scene.add(hero.group);
const heroRest = restOf(hero);
const feet = new FootIK(hero);
const wall = new WallTouch(hero, colliders);

const leshy = new Character(gL, { height: 2.5, name: 'Леший' });
leshy.clips.L_Roar = mocap('leshy', 'L_Roar');
scene.add(leshy.group);
const leshyRest = restOf(leshy);
const L0 = new THREE.Vector3(8, 0, 1);
const FLY = new THREE.Vector3(1, 0, -0.55).normalize();
leshy.group.position.copy(L0);
leshy.yaw = Math.atan2(-3.6 + 0, 4.2 - 8) ; // лицом к богатырю
leshy.yaw = Math.atan2(4.2 - L0.x, 3.6 - L0.z);
leshy.update(0);
mask.register(leshy.group, 0);
const vortex = new LeafVortex(leshy);
vortex.setOrigin(L0, FLY);
scene.add(vortex.group);
const AURA_LESHY = { ...AURA.spirit.params, cEdge: '#10300f', cMid: '#3d9a3a', cCore: '#e0ffb0', cLine: '#041004', cHalf: '#5fc24f', cP1: '#a8f07a', cP2: '#f2ffd6', revealOut: 'dissolve' };
const AURA_CALM = { ...AURA_LESHY, power: 0.3, scale: 1.15 };
const AURA_STORM = { ...AURA_LESHY, power: 1, scale: 1, swirl: 2.3, swirlFreq: 1.9, height: 3.2, radius: 1.0, hug: 0, speed: 1.0, turb: 1.0, pDensity: 1, pSwirl: 1.7, pSpread: 1.5, envGlow: 1.8, revealDur: 0.05 };
const aura = new Aura({ channel: 0, params: AURA_CALM, visible: false });
aura.floorY = L0.y;   // пол — земля под Лешим, а не низ летящей ауры
scene.add(aura.group);
const AURA_KEEP = { opacity: aura.params.opacity ?? 1, frontOpacity: aura.params.frontOpacity ?? 0.45, frontCover: aura.params.frontCover ?? 0.12 };   // виды правят их — возвращаем каждый кадр
const fx = new SmokeFX();
scene.add(fx.group);

// ------------------------------------------------------------------ виды превращения (сценарии)
const HERO_SPOT = new THREE.Vector3(4.2, 0, 3.6);
const LESHY_YAW0 = leshy.yaw;
const sctx = { leshy, heroPos: HERO_SPOT, solids };
const SCN = { fly: vortex.classic, forest: forestScenario(sctx), grab: grabScenario(sctx), dash: { walk: dashScenario(sctx, 'walk'), run: dashScenario(sctx, 'run') } };
const scOf = (kind, gait) => kind === 'dash' ? SCN.dash[gait] : SCN[kind];

// кости с процедурной позой: перед микшером вернуть его прошлый результат (микшер не переписывает неизменившиеся кости)
function posedUpdate(ch, dt, rot) {
  const B = ch.bones;
  if (ch._snap) for (const n of BONES) if (B[n]) B[n].quaternion.copy(ch._snap[n]);
  ch.update(dt);
  ch._snap = ch._snap || {};
  for (const n of BONES) if (B[n]) (ch._snap[n] || (ch._snap[n] = new THREE.Quaternion())).copy(B[n].quaternion);
  if (rot) applyPose(ch.model, B, rot);
}
function dropPose(ch) {
  if (ch._snap) { for (const n of BONES) if (ch.bones[n]) ch.bones[n].quaternion.copy(ch._snap[n]); ch._snap = null; }
  for (const o of ch.oneShots) o.action.stop();
  ch.oneShots.length = 0; ch._h = null;
  for (const n in ch.loco) ch.loco[n].w = ch.loco[n].target = n === 'Idle' ? 1 : 0;
  ch.setPivot(0, 0, 1);
}
// персонаж по описанию кадра: место, ход по пройденному пути, разовый клип, поза — всё от времени, без накопления
function driveChar(ch, o, t) {
  ch._flash = 0;
  ch.group.position.copy(o.pos); ch.yaw = o.yaw;
  for (const n in ch.loco) { const L = ch.loco[n]; L.w = L.target = (o.loco && o.loco[n]) || 0; }
  for (const n of ['Walk', 'Run']) { const L = ch.loco[n]; if (L.w > 0) L.action.time = (o.locoDist / L.speed) % ch.clips[n].duration; }
  ch.loco.Idle.action.time = t % ch.clips.Idle.duration;
  const c = o.clip;
  if (c && c.w > 0.001) {
    let h = ch._h && ch._h.name === c.name && ch.oneShots.find((x) => x.action === ch._h.action) ? ch._h : null;
    if (!h) h = ch._h = ch.play(c.name, 0.01);
    const os = ch.oneShots.find((x) => x.action === h.action);
    for (const x of ch.oneShots) x.w = x.target = x === os ? c.w : 0;
    ch.setTime(h, c.frac != null ? c.frac * h.duration : c.time);
  } else for (const x of ch.oneShots) x.w = x.target = 0;
  if (o.pivot) ch.setPivot(o.pivot[0], o.pivot[1], o.pivot[2]); else ch.setPivot(0, 0, 1);
  posedUpdate(ch, 0, o.rot);
}
const LS = { pos: new THREE.Vector3(), yaw: 0 }, HS = { pos: new THREE.Vector3(), yaw: 0 };

// ------------------------------------------------------------------ состояние
const opt = { mode: 'wall', auto: true, pace: 'walk', view: 'game', rays: false, vview: 'wide', kind: 'fly', gait: 'walk' };
const H = { pos: new THREE.Vector3(-1.47, 0, -5.4), yaw: 0, speed: 0, s: 0, dirSign: 1, hold: 0.6 };
const path = buildPath(); const pq = {};
const V = { t: 0, rate: 0, speed: 1, roar: null };
const keys = {};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.code === 'Digit1') setMode('wall');
  if (e.code === 'Digit2') setMode('vortex');
  if (e.code === 'KeyV') play(1);
  if (e.code === 'KeyB') play(-1);
  if (e.code === 'Space') { e.preventDefault(); if (opt.mode === 'vortex') pause(); }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && opt.mode === 'wall') setAuto(false);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

const PACE = { slow: 0.85, walk: 1.3, run: 3.4 };

function heroStep(dt) {
  let want = 0, dir = null;
  if (opt.mode === 'vortex') {
    H.pos.copy(HERO_SPOT);
    if (vortex.sc.hero) return;            // в захвате богатырём управляет сценарий
    const to = Math.atan2(vortexCenter.x - H.pos.x, vortexCenter.z - H.pos.z);
    H.yaw += angTo(H.yaw, to) * (1 - Math.exp(-dt * 3));
  } else if (opt.auto) {
    if (H.hold > 0) { H.hold -= dt; }
    else {
      const v = PACE[opt.pace];
      H.s += v * dt * H.dirSign;
      if (H.s >= path.len || H.s <= 0) { H.s = Math.max(0, Math.min(path.len, H.s)); H.dirSign *= -1; H.hold = 1.6; }
      pathAt(path, H.s, pq);
      H.pos.x = pq.pos.x; H.pos.z = pq.pos.y;
      want = v; dir = Math.atan2(pq.dir.x * H.dirSign, pq.dir.y * H.dirSign);
    }
    if (H.hold > 0) {
      // разворот на месте в конце маршрута
      pathAt(path, H.s, pq); dir = Math.atan2(pq.dir.x * H.dirSign, pq.dir.y * H.dirSign);
      if (H.hold > 1.0) dir = null;
    }
  } else {
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    if (f || r) {
      const cy = cam.yaw;
      const mx = Math.sin(cy) * f - Math.cos(cy) * r, mz = Math.cos(cy) * f + Math.sin(cy) * r;
      dir = Math.atan2(mx, mz);
      want = keys.ShiftLeft || keys.ShiftRight ? PACE.run : opt.pace === 'run' ? PACE.run : PACE[opt.pace];
    }
  }
  const acc = 1 - Math.exp(-dt * (want > H.speed ? 5 : 8));
  H.speed += (want - H.speed) * acc;
  if (dir !== null) H.yaw += angTo(H.yaw, dir) * (1 - Math.exp(-dt * (opt.auto ? 7 : 10)));
  if (!opt.auto && opt.mode === 'wall' && H.speed > 0.01) {
    H.pos.x += Math.sin(H.yaw) * H.speed * dt; H.pos.z += Math.cos(H.yaw) * H.speed * dt;
  }
  const extra = leshy.group.visible ? [{ kind: 'circle', x: L0.x, z: L0.z, r: 0.7 }] : [];
  collide(H.pos, 0.28, extra);
  hero.group.position.copy(H.pos); hero.yaw = H.yaw;
  heroRest();
  hero.setSpeed(H.speed);
  hero.update(dt);
  feet.update(dt, () => ({ y: 0, n: UPV }), 0);
  wall.update(dt, H.speed);
}
const UPV = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ вихрь
const vortexCenter = new THREE.Vector3().copy(L0);
const _tr = new THREE.Vector3(), _ax = new THREE.Vector3(), _hand = new THREE.Vector3();
const CO = { pos: new THREE.Vector3(), look: new THREE.Vector3(), center: null };
function play(dir) {
  if (opt.mode !== 'vortex') setMode('vortex');
  const len = vortex.sc.len;
  if (dir > 0 && V.t >= len - 0.01) V.t = 0;
  if (dir < 0 && V.t <= 0.01) V.t = len;
  V.rate = dir; syncButtons();
}
function pause() { V.rate = V.rate ? 0 : 1; syncButtons(); }
let lastT = 0;
function vortexStep(dt) {
  const prev = V.t;
  const sc = vortex.sc, len = sc.len;
  V.t = Math.min(len, Math.max(0, V.t + V.rate * V.speed * dt));
  if ((V.t >= len && V.rate > 0) || (V.t <= 0 && V.rate < 0)) { V.rate = 0; syncButtons(); }
  const t = V.t;
  if (!sc.classic) { sc.leshy(t, LS); driveChar(leshy, LS, t); }
  else {
  // рык Лешего: клип мокапа по времени таймлайна
  // без сброса к покою: у Лешего нет IK, а сброс ломал позу, когда клип замирал (микшер не перезаписывает неизменившиеся кости)
  if (t > 0.01 && t < T.cut1 + 1.8) {   // держим позу, пока последние листья не оторвались от тела
    if (!V.roar) V.roar = leshy.play('L_Roar', 0.5);
    { const x = Math.min(1, t / T.roar); leshy.setTime(V.roar, (1 - (1 - x) * (1 - x)) * V.roar.duration * 0.7); }
  } else if (V.roar) { leshy.stop(V.roar, 0.3); V.roar = null; }
  leshy.setSpeed(0);
  leshy.update(dt);
  }
  const st = vortex.sample(t);
  vortexCenter.copy(st.center);
  // аура — часть того же вихря: та же ось, та же высота и ширина, вращение в ту же сторону, её время = фаза вихря
  const p = { ...AURA_KEEP, ...AURA_STORM };
  p.power = st.s; p.scale = 1; p.spinDir = 1;
  p.height = st.Hm / (0.6 + 0.55 * st.s);         // та же высота, что у пламени из листьев
  p.radius = st.Rm / (0.8 + 0.25 * st.s);
  p.swirl = st.swirl; p.swirlFreq = st.swirlFreq; p.pSwirl = 0.4 + 1.4 * st.s;
  // в полёте аура из языка пламени вытягивается почти в линию вдоль следа и гаснет, а не крутится сама по себе
  const lk = st.lineK;
  p.radius *= THREE.MathUtils.lerp(1, 0.14, lk);
  p.height *= THREE.MathUtils.lerp(1, 1.7, lk);
  p.thick = (p.thick ?? AURA_STORM.thick) * THREE.MathUtils.lerp(1, 0.35, lk);
  p.pSwirl *= 1 - lk; p.pDensity = (p.pDensity ?? AURA_STORM.pDensity) * (1 - 0.85 * lk);
  if (lk > 0.001) {
    const trail = vortex.center(t - 0.35, _tr).sub(st.center);
    if (trail.lengthSq() > 1e-6) aura.axis = _ax.set(0, 1, 0).lerp(trail.normalize(), lk).normalize();
  } else aura.axis = null;
  p.hug = 0.95 * (1 - st.front);                 // пока есть тело, аура обнимает силуэт; тает вместе с ним
  const onGround = 1 - THREE.MathUtils.smoothstep(st.center.y - L0.y, 0.05, 0.7);   // пятна на полу гаснут, как только вихрь оторвался
  p.ground = 0.8 * (1 - st.fk) * onGround; p.envPool = 0.8 * (1 - st.fk) * onGround;
  p.glow = (p.glow ?? 1) * (1 - 0.6 * lk); p.envGlow *= 1 - 0.7 * lk;   // энергия гаснет плавно
  // вид может вести ауру сам (захват: аура вспыхивает только после того, как Леший схватил)
  const ov = sc.aura ? sc.aura(t, st) : null;
  if (ov) { for (const key in ov.p) if (ov.p[key] !== undefined) p[key] = ov.p[key]; p.radius = ov.p.radius; aura.axis = null; }
  aura.set(p);
  aura.time = st.auraT - dt;
  const rev = ov ? ov.rev : Math.pow(st.s, 0.7) * (1 - 0.6 * lk * lk) * (1 - st.endK);   // аура улетает вместе с листьями
  aura.reveal = aura.revealTarget = rev; aura.revealMode = 'dissolve';
  for (const m of leshy.materials) m.emissive.copy(aura.glowColor).multiplyScalar(aura.glowStrength * 0.12 * (1 - st.front));
  // богатырь в захвате: после Лешего (нужна его кисть)
  if (sc.hero) {
    sc.hero(t, HS, leshy.worldBone('RightHand', _hand));
    HS.loco = { Idle: 1 }; HS.locoDist = 0;
    driveChar(hero, HS, t);
    H.yaw = HS.yaw;
  }
  // фаза и таймлайн
  $('scrub').value = Math.round((t / len) * 1000);
  $('ttime').textContent = fmt(t, 1) + ' / ' + fmt(len, 1) + ' с';
  $('phase').textContent = st.phase;
  return st;
}

// ------------------------------------------------------------------ камера (без мыши: сама следит, стрелки подкручивают)
const cam = { yaw: 0, pitch: 0.3, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true, side: 0, user: 0 };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
function cameraStep(dt) {
  if (keys.ArrowLeft) cam.user += dt * 1.6;
  if (keys.ArrowRight) cam.user -= dt * 1.6;
  if (keys.ArrowUp) cam.pitch = Math.min(1.1, cam.pitch + dt * 0.8);
  if (keys.ArrowDown) cam.pitch = Math.max(0.02, cam.pitch - dt * 0.8);
  const k = cam.snap ? 1 : 1 - Math.exp(-dt * 4);
  let want, look;
  if (opt.mode === 'wall') {
    const S = wall.state();
    const near = (x) => x.dist < 1.3 ? 1 : 0;
    const side = near(S[0]) && !near(S[1]) ? 1 : near(S[1]) && !near(S[0]) ? -1 : near(S[0]) && near(S[1]) ? 0 : cam.side;
    cam.side += (side - cam.side) * (1 - Math.exp(-dt * 1.5));
    look = _v.copy(H.pos); look.y += 1.0;
    let yaw = H.yaw, dist = 2.9, pitch = cam.pitch;
    if (opt.view === 'game') yaw += 0.62 * cam.side;
    else if (opt.view === 'side') { const sd = Math.abs(cam.side) > 0.2 ? Math.sign(cam.side) : -1; yaw += sd * (Math.PI / 2 - 0.3); dist = 3.0; pitch = 0.12; look.y = 1.0; }
    else if (opt.view === 'front') { yaw += Math.PI - 0.35 * cam.side; dist = 3.0; pitch = 0.15; }
    yaw += cam.user;
    cam.yaw += angTo(cam.yaw, yaw) * (cam.snap ? 1 : 1 - Math.exp(-dt * 2.4));
    want = _w.set(look.x - Math.sin(cam.yaw) * Math.cos(pitch) * dist, look.y + Math.sin(pitch) * dist, look.z - Math.cos(cam.yaw) * Math.cos(pitch) * dist);
  } else {
    const c = vortexCenter;
    if (opt.vview === 'hero') {
      look = _v.copy(c); look.y += 1.4;
      const back = _w.subVectors(H.pos, c).setY(0).normalize();
      want = new THREE.Vector3().copy(H.pos).addScaledVector(back, 1.8).add(new THREE.Vector3(Math.cos(H.yaw) * 0.6, 1.75, -Math.sin(H.yaw) * 0.6));
      // держим в кадре, если вихрь ушёл далеко
    } else if (!vortex.sc.classic) {
      // свой план у каждого вида; стрелки поворачивают камеру вокруг точки взгляда
      CO.center = c; vortex.sc.cam(V.t, opt.vview, CO);
      look = _v.copy(CO.look);
      const off = new THREE.Vector3().subVectors(CO.pos, CO.look).applyAxisAngle(UPV, cam.user);
      want = off.add(CO.look);
    } else {
      const d = opt.vview === 'close' ? 5.0 : 8.5;
      const fly = sm((V.t - T.fly) / T.flyDur);
      // камера остаётся на месте (не влетает в лес), только приподнимается и поворачивается вслед вихрю
      look = _v.copy(L0).lerp(c, 0.55 + 0.45 * fly); look.y = THREE.MathUtils.lerp(L0.y + 1.5, c.y + 1.0, fly);
      const base = Math.atan2(FLY.x, FLY.z) + Math.PI + 0.85 + cam.user;
      want = new THREE.Vector3(L0.x + Math.sin(base) * d, 2.0 + Math.sin(cam.pitch) * d * 0.4 + (c.y - L0.y) * 0.5, L0.z + Math.cos(base) * d);
    }
  }
  cam.pos.lerp(want, k); cam.look.lerp(look, cam.snap ? 1 : 1 - Math.exp(-dt * 6));
  cam.snap = false;
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  const fp = opt.mode === 'wall' ? H.pos : (vortex.sc.focus || L0);
  sun.position.set(fp.x + 8, 11, fp.z - 4); sun.target.position.copy(fp);
}

// ------------------------------------------------------------------ отладка: лучи и цели руки
const dbg = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
dbg.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
dbg.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
dbg.renderOrder = 10; dbg.frustumCulled = false; scene.add(dbg);
const tgtBalls = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd166', depthTest: false })); m.renderOrder = 11; scene.add(m); return m; });
function debugStep() {
  const show = opt.rays && opt.mode === 'wall';
  dbg.visible = show;
  const S = wall.state();
  S.forEach((s, i) => { tgtBalls[i].visible = show && s.w > 0.01; tgtBalls[i].position.copy(s.tgt); tgtBalls[i].scale.setScalar(0.5 + s.w); });
  if (!show) return;
  const P = dbg.geometry.attributes.position, C = dbg.geometry.attributes.color;
  let n = 0;
  for (const s of S) for (const r of s.rays) {
    if (n >= 30) break;
    P.setXYZ(n, r.o.x, r.o.y, r.o.z); P.setXYZ(n + 1, r.e.x, r.e.y, r.e.z);
    const c = r.hit ? [0.5, 1, 0.45] : [0.6, 0.6, 0.6];
    C.setXYZ(n, ...c); C.setXYZ(n + 1, ...c); n += 2;
  }
  for (const s of S) if (s.w > 0.01) {
    P.setXYZ(n, s.tgt.x, s.tgt.y, s.tgt.z); P.setXYZ(n + 1, s.tgt.x + s.n.x * 0.3, s.tgt.y + s.n.y * 0.3, s.tgt.z + s.n.z * 0.3);
    C.setXYZ(n, 1, 0.8, 0.3); C.setXYZ(n + 1, 1, 0.8, 0.3); n += 2;
  }
  dbg.geometry.setDrawRange(0, n);
  P.needsUpdate = true; C.needsUpdate = true;
}

// ------------------------------------------------------------------ пыль из-под ладони
const DUST = 90;
const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#d8c9a8', size: 0.016, transparent: true, opacity: 0.7, depthWrite: false }));
dust.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST * 3), 3));
dust.frustumCulled = false; scene.add(dust);
const dustP = Array.from({ length: DUST }, () => ({ p: new THREE.Vector3(0, -9, 0), v: new THREE.Vector3(), life: 0 }));
let dustI = 0, dustAcc = 0;
function dustStep(dt) {
  for (const s of wall.state()) {
    if (opt.mode !== 'wall' || s.w < 0.85 || s.slide < 0.35) continue;
    dustAcc += dt * 9 * Math.min(1.5, s.slide);
    while (dustAcc > 1) {
      dustAcc -= 1;
      const d = dustP[dustI++ % DUST];
      d.p.copy(s.tgt).addScaledVector(s.n, 0.02).add(new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.06));
      d.v.copy(s.n).multiplyScalar(0.05 + Math.random() * 0.07); d.v.y = -0.03; d.life = 0.35 + Math.random() * 0.35;
    }
  }
  const P = dust.geometry.attributes.position;
  dustP.forEach((d, i) => {
    if (d.life > 0) { d.life -= dt; d.v.y -= dt * 0.6; d.p.addScaledVector(d.v, dt); if (d.life <= 0) d.p.y = -9; }
    P.setXYZ(i, d.p.x, d.p.y, d.p.z);
  });
  P.needsUpdate = true;
}

// ------------------------------------------------------------------ интерфейс
function seg(id, key, onSet) {
  for (const b of $(id).querySelectorAll('button')) b.addEventListener('click', () => { onSet ? onSet(b.dataset.v) : (opt[key] = b.dataset.v); syncButtons(); });
}
function syncButtons() {
  const on = (id, val) => { for (const b of $(id).querySelectorAll('button')) b.classList.toggle('on', b.dataset.v === String(val)); };
  on('modes', opt.mode); on('touch', wall.o.enabled ? 'on' : 'off'); on('hmode', wall.o.mode); on('drive', opt.auto ? 'auto' : 'manual');
  on('pace', opt.pace); on('view', opt.view); on('rays', opt.rays ? 'on' : 'off'); on('vspeed', String(V.speed)); on('vview', opt.vview);
  $('pwall').hidden = opt.mode !== 'wall'; $('pvortex').hidden = opt.mode !== 'vortex'; $('timeline').hidden = opt.mode !== 'vortex';
  $('bplay').classList.toggle('on', V.rate > 0); $('bback').classList.toggle('on', V.rate < 0);
  $('bpause').textContent = V.rate ? 'Пауза' : 'Дальше';
  on('vkind', opt.kind); on('vgait', opt.gait); $('vgait').hidden = opt.kind !== 'dash';
  $('bplay').textContent = opt.kind === 'fly' ? 'Превратиться' : 'Пуск';
  $('bback').textContent = opt.kind === 'fly' ? 'Вернуть' : 'Назад';
  $('hintWall').hidden = opt.mode !== 'wall'; $('hintVortex').hidden = opt.mode !== 'vortex';
}
function setMode(m) {
  opt.mode = m; cam.snap = true; cam.user = 0;
  if (m === 'wall') dropPose(hero);
  if (m === 'vortex') { V.t = 0; V.rate = 0; }
  else { V.t = 0; V.rate = 0; vortexStep(0); }
  syncButtons();
}
function setKind(kind, gait = opt.gait) {
  opt.kind = kind; opt.gait = gait;
  const sc = scOf(kind, gait);
  dropPose(leshy); dropPose(hero); V.roar = null;
  if (sc.classic) { leshy.group.position.copy(L0); leshy.yaw = LESHY_YAW0; }
  vortex.setScenario(sc);
  if (opt.mode !== 'vortex') setMode('vortex');
  V.t = 0; V.rate = 0; cam.snap = true; cam.user = 0;
  buildPhases(); vortexDirty = true; syncButtons();
}
function setAuto(a) { opt.auto = a; if (a) { H.s = 0; H.dirSign = 1; H.hold = 0.4; } syncButtons(); }
seg('modes', 'mode', setMode);
seg('touch', null, (v) => { wall.o.enabled = v === 'on'; });
seg('hmode', null, (v) => { wall.o.mode = v; });
seg('drive', null, (v) => setAuto(v === 'auto'));
seg('pace', 'pace');
seg('view', 'view');
seg('rays', null, (v) => { opt.rays = v === 'on'; });
seg('vspeed', null, (v) => { V.speed = +v; });
seg('vview', 'vview', (v) => { opt.vview = v; cam.snap = true; });
$('bplay').addEventListener('click', () => play(1));
$('bback').addEventListener('click', () => play(-1));
$('bpause').addEventListener('click', pause);
$('scrub').addEventListener('input', (e) => { V.t = (+e.target.value / 1000) * vortex.sc.len; V.rate = 0; syncButtons(); });
seg('vkind', null, (v) => setKind(v));
seg('vgait', null, (v) => setKind('dash', v));
function buildPhases() { // метки фаз на таймлайне
  const box = $('phases'), sc = vortex.sc;
  box.textContent = '';
  for (const [name, a, b] of sc.phases) {
    const d = document.createElement('span'); d.textContent = name;
    d.style.left = (a / sc.len) * 100 + '%'; d.style.width = ((b - a) / sc.len) * 100 + '%';
    box.appendChild(d);
  }
}
buildPhases();
$('about').addEventListener('click', () => { $('notes').hidden = !$('notes').hidden; });
$('notesClose').addEventListener('click', () => { $('notes').hidden = true; });
// мобильный: кнопки-стрелки для камеры
for (const b of document.querySelectorAll('[data-key]')) {
  const k = b.dataset.key;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[k] = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { keys[k] = false; });
}

function readout() {
  if (opt.mode !== 'wall') return;
  const S = wall.state();
  const r = (s) => `<span class="${s.w > 0.5 ? 'hit' : ''}">${s.side === 'Left' ? 'Левая' : 'Правая'} ${fmt(s.w)}</span>`;
  const d = Math.min(S[0].dist, S[1].dist);
  $('read').innerHTML = `${r(S[0])} ${r(S[1])}<span>до стены ${d < 5 ? fmt(d) + ' м' : '—'}</span><span>${fmt(H.speed, 1)} м/с</span>`;
}

// ------------------------------------------------------------------ цикл
function frame(dt) {
  heroStep(dt);
  if (opt.mode === 'vortex' || vortexDirty) { vortexStep(opt.mode === 'vortex' ? dt : 0); vortexDirty = false; }
  else { leshy.setSpeed(0); leshy.update(dt); aura.reveal = aura.revealTarget = 0; }
  cameraStep(dt);
  debugStep(); dustStep(dt);
  fx.update(dt, camera);
  mask.render(renderer, scene, camera);
  aura.update(dt, camera, vortexCenter.clone(), mask, renderer);   // ось ауры = ось вихря
}
let vortexDirty = true;
let last = performance.now();
function loop(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;   // первый кадр rAF бывает раньше performance.now()
  frame(dt);
  renderer.render(scene, camera);
  readout();
  requestAnimationFrame(loop);
}
syncButtons();
$('loading').hidden = true;
requestAnimationFrame(loop);

// хук для автотестов
window.LAB = {
  sim(sec, step = 1 / 60) { for (let t = 0; t < sec; t += step) frame(step); renderer.render(scene, camera); },
  setMode, setKind, play, opt, wall, H, V, T, vortex, leshy, hero, SCN, step: (dt) => frame(dt),
  setT(t) { V.t = t; V.rate = 0; },
};
