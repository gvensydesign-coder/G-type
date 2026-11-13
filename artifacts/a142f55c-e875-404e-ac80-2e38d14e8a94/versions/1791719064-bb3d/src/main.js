import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Character } from './character.js';
import { pose, mirrorDef, blend, stack, PoseClip } from './pose.js';
import { sfx, resumeAudio } from './audio.js';
import { makeSword, makeShield, poseSword, poseShield } from './weapons.js';

// ---------------------------------------------------------------- tuning
const T = {
  run: 4.2, sprint: 6.6, back: 2.4, blockWalk: 1.7,
  gravity: 20, jumpV: 6.8,
  arena: 24,
  playerHP: 100, enemyHP: 420, stamina: 100,
  stRegen: 32, stDelay: 0.7,
  cost: { atk: 7, fin: 11, heavy: 18, roll: 24, dodge: 14, sprint: 12, block: 22 },
  dmg: { atk: 13, fin: 22, heavy: 30, swipe: 18, slam: 34, lunge: 24 },
  parryWindow: 0.22,
  playerR: 0.4, enemyR: 0.78, enemyScale: 1.9,
  sens: 0.0026,
};

const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAng = (a, b, k) => a + ang(b - a) * k;
const turnTo = (a, b, maxStep) => { const d = ang(b - a); return a + Math.max(-maxStep, Math.min(maxStep, d)); };
const yawOf = (v) => Math.atan2(v.x, v.z);
const fwd = (yaw, out = new THREE.Vector3()) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: params.has('test') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f26);
scene.fog = new THREE.Fog(0x1b1f26, 22, 60);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xb8c4d6, 0x2a2218, 1.1));
const sun = new THREE.DirectionalLight(0xffe6c0, 2.4);
sun.position.set(8, 16, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3b3a36';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) {
    const v = 50 + Math.random() * 25;
    g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.35)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  g.strokeStyle = 'rgba(20,18,15,0.55)';
  g.lineWidth = 3;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const ox = (y % 2) * 64;
    g.strokeRect(x * 128 + ox + 2, y * 128 + 2, 124, 124);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(T.arena, T.arena + 0.25, 128), new THREE.MeshBasicMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0.45 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);

// ---------------------------------------------------------------- sword & shield (the hero's weapons)
const sword = makeSword();
const shield = makeShield();
scene.add(sword, shield);
// ---------------------------------------------------------------- effects
const sparks = [];
const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
function burst(pos, color, n = 14, speed = 5) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos);
    const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
    scene.add(m);
    sparks.push({ m, v, life: rand(0.25, 0.45), max: 0.45 });
  }
}
const waves = [];
function shockwave(pos, color = 0xf0a050) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.9, 48), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos).setY(0.05);
  scene.add(m);
  waves.push({ m, life: 0.5 });
}
function updateFx(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    s.v.y -= 12 * dt;
    s.m.position.addScaledVector(s.v, dt);
    s.m.material.opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); }
  }
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.life -= dt;
    const s = 1 + (0.5 - w.life) * 7;
    w.m.scale.set(s, s, s);
    w.m.material.opacity = Math.max(0, w.life * 2);
    if (w.life <= 0) { scene.remove(w.m); w.m.material.dispose(); w.m.geometry.dispose(); waves.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- poses
const GUARD_D = { RightArm: [-25, 0, -8], RightForeArm: [-55, 15, 0], LeftArm: [-22, -8, 10], LeftForeArm: [-65, -25, 0] };
const P = {
  guard: pose(GUARD_D),
  block: pose({ Spine1: [10, 0, 0], Spine2: [0, -10, 0], RightArm: [-30, 0, -25], RightForeArm: [-70, 10, 0], LeftArm: [-70, -35, 0], LeftForeArm: [-85, -40, 0], Neck: [8, 0, 0] }),
  hit: pose({ Spine: [-18, 0, 0], Spine1: [-10, 0, 0], Neck: [-15, 0, 0], RightArm: [0, 0, -35], LeftArm: [0, 0, 35] }),
  jump: pose({ RightUpLeg: [-45, 0, 0], RightLeg: [70, 0, 0], LeftUpLeg: [-15, 0, 0], LeftLeg: [35, 0, 0], LeftArm: [0, 0, 30] }),
  tuck: pose({ Spine: [35, 0, 0], Spine1: [25, 0, 0], Neck: [20, 0, 0], RightUpLeg: [-105, 0, 0], LeftUpLeg: [-105, 0, 0], RightLeg: [115, 0, 0], LeftLeg: [115, 0, 0], RightArm: [-70, 20, 0], LeftArm: [-70, -20, 0], RightForeArm: [-40, 0, 0], LeftForeArm: [-40, 0, 0] }),
  dead: pose({ RightArm: [0, 0, -80], LeftArm: [0, 0, 80], Neck: [-20, 0, 0] }),
};
const G = P.guard;
const atkClips = [
  // right hook
  new PoseClip(0.42, [[0, G],
    [0.32, pose({ Spine2: [0, -35, 0], Spine1: [0, -10, 0], RightArm: [0, -45, -85], RightForeArm: [0, -10, 0] })],
    [0.58, pose({ Spine2: [5, 38, 0], Spine1: [0, 12, 0], RightArm: [0, 110, -85], RightForeArm: [0, 15, 0] })],
    [1, G]], { active: [0.36, 0.6], dmg: T.dmg.atk, cost: T.cost.atk }),
  // backhand
  new PoseClip(0.42, [[0, G],
    [0.32, pose({ Spine2: [0, 38, 0], Spine1: [0, 10, 0], RightArm: [0, 125, -80], RightForeArm: [0, 40, 0] })],
    [0.58, pose({ Spine2: [5, -38, 0], Spine1: [0, -12, 0], RightArm: [0, -30, -85], RightForeArm: [0, -10, 0] })],
    [1, G]], { active: [0.36, 0.6], dmg: T.dmg.atk, cost: T.cost.atk }),
  // overhead smash finisher
  new PoseClip(0.62, [[0, G],
    [0.4, pose({ Spine1: [-15, -10, 0], Spine: [-5, 0, 0], RightArm: [-175, 0, -10], RightForeArm: [-40, 0, 0] })],
    [0.6, pose({ Spine: [18, 0, 0], Spine1: [25, 0, 0], RightArm: [-70, 0, 0], RightForeArm: [10, 0, 0] })],
    [1, G]], { active: [0.44, 0.64], dmg: T.dmg.fin, cost: T.cost.fin, finisher: true }),
];
// strong attack: wide two-handed-feel horizontal cleave with a long wind-up
const heavyClip = new PoseClip(0.8, [[0, G],
  [0.45, pose({ Spine2: [-5, -50, 0], Spine1: [0, -20, 0], RightArm: [0, -70, -80], RightForeArm: [0, -20, 0], LeftArm: [-30, 20, 0] })],
  [0.66, pose({ Spine2: [8, 55, 0], Spine1: [5, 20, 0], RightArm: [0, 125, -85], RightForeArm: [0, 20, 0], LeftArm: [-20, -20, 20] })],
  [1, G]], { active: [0.5, 0.7], dmg: T.dmg.heavy, cost: T.cost.heavy, heavy: true });

const E_N = {};
const E_SWIPE_D = [
  { Spine2: [0, -40, 0], Spine1: [0, -15, 0], RightArm: [0, -60, -90], RightForeArm: [0, 0, 0] },
  { Spine2: [10, 45, 0], Spine1: [0, 15, 0], RightArm: [0, 115, -85], RightForeArm: [0, 10, 0] },
];
const eClips = {
  swipe: new PoseClip(1.55, [[0, pose(E_N)], [0.47, pose(E_SWIPE_D[0])], [0.62, pose(E_SWIPE_D[1])], [1, pose(E_N)]],
    { active: [0.5, 0.64], kind: 'arc', reach: 3.4, arc: 1.3, dmg: T.dmg.swipe, blockable: true, track: 0.4 }),
  swipeL: new PoseClip(1.2, [[0, pose(E_N)], [0.35, pose(mirrorDef(E_SWIPE_D[0]))], [0.55, pose(mirrorDef(E_SWIPE_D[1]))], [1, pose(E_N)]],
    { active: [0.38, 0.57], kind: 'arc', reach: 3.4, arc: 1.3, dmg: T.dmg.swipe, blockable: true, track: 0.3 }),
  slam: new PoseClip(2.0, [[0, pose(E_N)],
    [0.5, pose({ Spine: [-10, 0, 0], Spine1: [-12, 0, 0], RightArm: [-170, 0, -12], LeftArm: [-170, 0, 12], RightForeArm: [-30, 0, 0], LeftForeArm: [-30, 0, 0] })],
    [0.6, pose({ Spine: [25, 0, 0], Spine1: [22, 0, 0], RightArm: [-55, 0, 0], LeftArm: [-55, 0, 0] })],
    [0.8, pose({ Spine: [25, 0, 0], Spine1: [22, 0, 0], RightArm: [-55, 0, 0], LeftArm: [-55, 0, 0] })],
    [1, pose(E_N)]], { active: [0.57, 0.63], kind: 'slam', dmg: T.dmg.slam, blockable: false, track: 0.42 }),
  lunge: new PoseClip(1.55, [[0, pose(E_N)],
    [0.32, pose({ Spine: [22, 0, 0], RightArm: [0, -40, -60], RightForeArm: [0, 0, 0], RightUpLeg: [-25, 0, 0], RightLeg: [35, 0, 0] })],
    [0.4, pose({ Spine: [15, 0, 0], RightArm: [-88, 0, 0], RightForeArm: [0, 0, 0] })],
    [0.62, pose({ Spine: [15, 0, 0], RightArm: [-88, 0, 0], RightForeArm: [0, 0, 0] })],
    [1, pose(E_N)]], { active: [0.36, 0.62], kind: 'lunge', reach: 2.0, arc: 0.9, dmg: T.dmg.lunge, blockable: true, track: 0.3, dash: [0.32, 0.62], dashSpeed: 14 }),
  stagger: new PoseClip(1.8, [[0, pose(E_N)],
    [0.12, pose({ Spine: [-25, 0, 0], Spine1: [-12, 0, 0], Neck: [-20, 0, 0], RightArm: [0, 0, -75], LeftArm: [0, 0, 75] })],
    [0.8, pose({ Spine: [-15, 0, 0], Spine1: [-8, 0, 0], Neck: [-10, 0, 0], RightArm: [0, 0, -55], LeftArm: [0, 0, 55] })],
    [1, pose(E_N)]]),
  flinch: new PoseClip(0.35, [[0, pose(E_N)], [0.3, pose({ Spine: [-12, 0, 0], Neck: [-10, 0, 0] })], [1, pose(E_N)]]),
};

// ---------------------------------------------------------------- input
const keys = new Set();
const pressed = new Set();
const mouse = { dx: 0, dy: 0, lmb: false, rmb: false };
let locked = false;
const GAME_KEYS = ['Tab', 'Space', 'AltLeft', 'AltRight', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
addEventListener('keydown', (e) => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (!game.running) return;
  if (!locked && canvas.requestPointerLock && !params.has('test')) { try { canvas.requestPointerLock(); } catch {} }
  if (e.button === 0) { pressed.add('LMB'); mouse.lmb = true; }
  if (e.button === 1) { e.preventDefault(); pressed.add('MMB'); }
  if (e.button === 2) { pressed.add('RMB'); mouse.rmb = true; }
});
addEventListener('mouseup', (e) => { if (e.button === 0) mouse.lmb = false; if (e.button === 2) mouse.rmb = false; });
// Without pointer lock (embedded frames, some browsers) plain mouse movement over the canvas still turns the hero.
addEventListener('mousemove', (e) => { if (locked || (game.running && e.target === canvas)) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
document.addEventListener('pointerlockchange', () => {
  const was = locked;
  locked = document.pointerLockElement === canvas;
  if (was && !locked && game.running && !game.over) pause();
});
const down = (...c) => c.some((k) => keys.has(k));
const hit = (...c) => c.some((k) => pressed.has(k));

// ---------------------------------------------------------------- HUD
const $ = (id) => document.getElementById(id);
const hud = { pHP: $('p-hp'), pHPg: $('p-hp-ghost'), pST: $('p-st'), eHP: $('e-hp'), eHPg: $('e-hp-ghost'), lock: $('lock-icon'), toast: $('toast') };
let toastT = 0;
function toast(text, t = 1.1) { hud.toast.textContent = text; hud.toast.classList.add('show'); toastT = t; }

// ---------------------------------------------------------------- game state
const game = { running: false, over: false, timeScale: 1, hitstop: 0, slowmo: 0, shake: 0, lockOn: false };
let player, enemy;

class Player {
  constructor(ch) {
    this.ch = ch;
    this.reset();
  }
  reset() {
    this.ch.position.set(0, 0, -6);
    this.heading = 0; this.ch.yaw = 0;
    this.vy = 0; this.grounded = true;
    this.hp = T.playerHP; this.st = T.stamina; this.stTimer = 0;
    this.state = 'free'; this.t = 0;
    this.combo = 0; this.comboTimer = 0; this.queued = false;
    this.blocking = false; this.blockT = 0; this.blockW = 0; this.blockPressedAt = -9;
    this.iframe = false; this.hitW = 0;
    this.moveDir = new THREE.Vector3();
    this.dashDir = new THREE.Vector3();
    this.dead = false;
    this.ch.setPivot(0, 0, 0.9);
  }
  spend(c) { if (this.st <= 0) return false; this.st = Math.max(0, this.st - c); this.stTimer = T.stDelay; return true; }
}

class Enemy {
  constructor(ch) { this.ch = ch; this.reset(); }
  reset() {
    this.ch.position.set(0, 0, 4);
    this.ch.yaw = Math.PI;
    this.hp = T.enemyHP;
    this.state = 'idle'; this.t = 0; this.timer = 1.2;
    this.cooldown = 1.0; this.clip = null; this.hitDone = false; this.next = null;
    this.poise = 0; this.flinchT = 0; this.armorT = 0; this.dead = false;
    this.ch.setPivot(0, 0, 1.6);
    this.ch.setGlow(0, 0);
  }
}

// ---------------------------------------------------------------- player logic
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();

function targetYaw() {
  const d = tmpV.subVectors(enemy.ch.position, player.ch.position);
  return yawOf(d);
}
function enemyDist() { return Math.hypot(enemy.ch.position.x - player.ch.position.x, enemy.ch.position.z - player.ch.position.z); }
// Soft targeting: face the enemy if it is close and roughly ahead (or always when locked on)
function softTarget(range = 4.5, cone = 1.3) {
  if (enemy.dead) return null;
  const d = enemyDist();
  if (game.lockOn && d < 14) return targetYaw();
  if (d < range && Math.abs(ang(targetYaw() - player.heading)) < cone) return targetYaw();
  return null;
}

function startAttack(clipOverride) {
  const clip = clipOverride || atkClips[player.combo];
  if (!player.spend(clip.cost)) { toast('Нет сил', 0.6); return; }
  player.state = 'attack'; player.t = 0; player.clip = clip; player.hitDone = false; player.queued = false;
  const ty = softTarget();
  player.attackYaw = ty ?? player.heading;
  const d = enemyDist();
  player.lunge = ty != null ? clamp(d - (T.playerR + T.enemyR + 0.25), 0, 1.4) : 0.35;
  sfx('whoosh');
}

function updatePlayer(dt) {
  const p = player, ch = p.ch;
  p.t += dt;
  p.comboTimer -= dt;
  p.stTimer -= dt;
  if (p.stTimer <= 0) p.st = Math.min(T.stamina, p.st + T.stRegen * dt);
  p.hitW = Math.max(0, p.hitW - dt * 3);

  // --- heading: mouse / arrows, or lock-on
  if (!p.dead) {
    if (game.lockOn && !enemy.dead) p.heading = lerpAng(p.heading, targetYaw(), 1 - Math.exp(-dt * 8));
    else {
      p.heading -= mouse.dx * T.sens;
      if (down('ArrowLeft')) p.heading += 2.6 * dt;
      if (down('ArrowRight')) p.heading -= 2.6 * dt;
    }
  }

  const ix = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0);
  const iz = (down('KeyW') ? 1 : 0) - (down('KeyS') ? 1 : 0);
  const f = fwd(p.heading, tmpV2);
  const r = tmpV3.set(-Math.cos(p.heading), 0, Math.sin(p.heading));
  p.moveDir.set(0, 0, 0).addScaledVector(f, iz).addScaledVector(r, ix);
  const moving = p.moveDir.lengthSq() > 0;
  if (moving) p.moveDir.normalize();

  const canAct = p.state === 'free' && !p.dead;
  // --- blocking
  const wantBlock = down('KeyL') || mouse.rmb;
  if (hit('RMB', 'KeyL')) p.blockPressedAt = performance.now() / 1000;
  p.blocking = canAct && p.grounded && wantBlock && p.st > 0;
  p.blockW += ((p.blocking ? 1 : 0) - p.blockW) * (1 - Math.exp(-dt * 18));

  // --- actions
  if (canAct && p.grounded) {
    if (hit('KeyC') && p.spend(T.cost.roll)) {
      p.state = 'roll'; p.t = 0; p.dur = 0.62;
      p.dashDir.copy(moving ? p.moveDir : f);
      ch.yaw = yawOf(p.dashDir);
      sfx('whoosh');
    } else if (hit('KeyQ', 'AltLeft', 'AltRight') && p.spend(T.cost.dodge)) {
      p.state = 'dodge'; p.t = 0; p.dur = 0.36;
      p.dashDir.copy(moving ? p.moveDir : f.clone().negate());
      sfx('whoosh');
    } else if (hit('Space')) {
      p.vy = T.jumpV; p.grounded = false; sfx('jump');
    } else if (hit('LMB', 'KeyJ')) {
      if (p.comboTimer <= 0) p.combo = 0;
      startAttack();
    } else if (hit('KeyF', 'KeyK')) {
      startAttack(heavyClip);
    }
  }
  if (p.state === 'attack' && hit('LMB', 'KeyJ') && p.t / p.clip.duration > 0.3) p.queued = true;

  // --- state machines
  let speed = 0;
  let faceYaw = null;
  let action = null; // pose for an action layer
  let tuck = 0;
  p.iframe = false;
  ch.setPivot(0, 0, 0.9);

  switch (p.state) {
    case 'free': {
      if (moving) {
        const back = iz < 0;
        if (p.blocking) speed = T.blockWalk;
        else if (back) speed = T.back;
        else if (down('ShiftLeft', 'ShiftRight') && p.st > 0) { speed = T.sprint; p.st -= T.cost.sprint * dt; p.stTimer = 0.3; }
        else speed = T.run;
        // Face where we run; when backing off, keep facing forward and walk backwards.
        const mv = yawOf(p.moveDir);
        faceYaw = back ? mv + Math.PI : mv;
        if (p.blocking && !enemy.dead && (game.lockOn || enemyDist() < 6)) faceYaw = targetYaw();
        ch.position.addScaledVector(p.moveDir, speed * dt);
        if (p.blocking) ch.setLoco('walk', 1.2);
        else if (back) ch.setLoco('walk', -1.6);
        else ch.setLoco('run', speed > T.run ? 1.3 : 0.95);
      } else {
        ch.setLoco('idle', 1);
        if (p.blocking && !enemy.dead && enemyDist() < 8) faceYaw = targetYaw();
      }
      break;
    }
    case 'attack': {
      const c = p.clip, n = p.t / c.duration;
      faceYaw = p.attackYaw;
      if (n < 0.45) ch.position.addScaledVector(fwd(p.attackYaw, tmpV), (p.lunge / (0.45 * c.duration)) * dt);
      action = c.sample(Math.min(n, 1));
      ch.setLoco('idle', 1);
      if (n >= c.active[0] && n <= c.active[1] && !p.hitDone) meleeCheck(c);
      if (n >= 0.72 && p.queued && p.combo < 2 && !c.heavy) { p.combo++; startAttack(); break; }
      if (n >= 1) {
        p.state = 'free';
        p.combo = c.heavy ? 0 : (p.combo + 1) % 3;
        p.comboTimer = 0.45;
        if (c.finisher) p.combo = 0;
      }
      break;
    }
    case 'roll': {
      const n = p.t / p.dur;
      const sp = 7.5 * (1 - n * 0.6);
      ch.position.addScaledVector(p.dashDir, sp * dt);
      faceYaw = yawOf(p.dashDir);
      p.iframe = n > 0.06 && n < 0.72;
      tuck = Math.sin(Math.min(1, n * 1.15) * Math.PI);
      const e = n < 0.85 ? n / 0.85 : 1;
      ch.setPivot((e * e * (3 - 2 * e)) * Math.PI * 2, 0, 0.55, -0.2 * tuck);
      ch.setLoco('idle', 1);
      if (n >= 1) { p.state = 'free'; ch.setPivot(0, 0, 0.9); }
      break;
    }
    case 'dodge': {
      const n = p.t / p.dur;
      ch.position.addScaledVector(p.dashDir, 9 * (1 - n) * dt);
      p.iframe = n < 0.7;
      // lean away from the dodge direction
      const local = ang(yawOf(p.dashDir) - ch.yaw);
      const lean = Math.sin(n * Math.PI) * 0.35;
      ch.setPivot(-Math.cos(local) * lean, Math.sin(local) * lean, 0.0, Math.sin(n * Math.PI) * 0.12);
      ch.setLoco('idle', 1);
      if (n >= 1) p.state = 'free';
      break;
    }
    case 'hit': {
      const n = p.t / p.dur;
      ch.position.addScaledVector(p.dashDir, p.knock * (1 - n) * dt);
      ch.setLoco('idle', 1);
      if (n >= 1) p.state = 'free';
      break;
    }
    case 'dead': {
      const n = Math.min(1, p.t / 0.8);
      ch.setPivot(-n * n * Math.PI / 2, 0, 0.05);
      ch.setLoco('idle', 0.2);
      break;
    }
  }

  // --- vertical
  if (!p.grounded) {
    p.vy -= T.gravity * dt;
    ch.position.y += p.vy * dt;
    if (ch.position.y <= 0) { ch.position.y = 0; p.vy = 0; p.grounded = true; sfx('land'); }
    if (moving && p.state === 'free') ch.setLoco('idle', 1);
  }

  if (faceYaw != null) ch.yaw = turnTo(ch.yaw, faceYaw, dt * (p.state === 'free' ? 12 : 20));

  // keep inside arena / out of the enemy
  separate(ch.position, enemy.ch.position, T.playerR + T.enemyR, enemy.dead ? 0.5 : 1);
  const rr = Math.hypot(ch.position.x, ch.position.z);
  if (rr > T.arena - 0.5) ch.position.multiplyScalar((T.arena - 0.5) / rr);

  // --- compose procedural pose
  let rot;
  if (p.state === 'dead') rot = blend(G, P.dead, Math.min(1, p.t * 2));
  else if (action) rot = action;
  else rot = blend(G, P.block, p.blockW);
  if (tuck > 0) stack(rot, P.tuck, tuck);
  if (!p.grounded) stack(rot, P.jump, 1);
  if (p.hitW > 0) stack(rot, P.hit, p.hitW);
  ch.update(dt, rot);
  updateWeapons();
}

function separate(a, b, minD, share) {
  const dx = a.x - b.x, dz = a.z - b.z;
  const d = Math.hypot(dx, dz);
  if (d < minD && d > 1e-4) {
    const push = (minD - d) * share;
    a.x += (dx / d) * push; a.z += (dz / d) * push;
  }
}

// ---------------------------------------------------------------- weapons
const blade = { base: new THREE.Vector3(), tip: new THREE.Vector3(), pBase: new THREE.Vector3(), pTip: new THREE.Vector3() };
const shieldPos = (out = new THREE.Vector3()) => out.copy(shield.position);

function updateWeapons() {
  blade.pBase.copy(blade.base); blade.pTip.copy(blade.tip);
  poseSword(sword, player.ch, blade);
  poseShield(shield, player.ch);
}

// capsule test against the big enemy (vertical axis, scaled by his size)
function pointVsEnemy(pos, extra = 0) {
  const e = enemy.ch.position;
  const h = Math.hypot(pos.x - e.x, pos.z - e.z);
  return h < T.enemyR + extra && pos.y > 0.1 && pos.y < 3.4;
}

const _hb = new THREE.Vector3(), _ht = new THREE.Vector3();
function meleeCheck(clip) {
  // sweep the blade between last frame and this frame, sampling along its length
  for (let i = 1; i <= 4; i++) {
    const k = i / 4;
    _hb.lerpVectors(blade.pBase, blade.base, k);
    _ht.lerpVectors(blade.pTip, blade.tip, k);
    for (let j = 0; j <= 6; j++) {
      tmpV.lerpVectors(_hb, _ht, j / 6);
      if (pointVsEnemy(tmpV, 0.08)) {
        player.hitDone = true;
        damageEnemy(clip.dmg, tmpV.clone(), clip.heavy ? 40 : clip.finisher ? 30 : 14);
        return;
      }
    }
  }
}

function damageEnemy(dmg, at, poise) {
  if (enemy.dead) return;
  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.ch.flash(0.1);
  burst(at, 0xffe2a0, 16, 5);
  sfx('hit');
  game.hitstop = 0.07;
  game.shake = Math.max(game.shake, 0.12);
  enemy.poise += poise;
  if (enemy.hp <= 0) { killEnemy(); return; }
  if (enemy.state === 'stagger') return;
  if (enemy.poise >= 55 && enemy.armorT <= 0) { enemy.poise = 0; enemyStagger(0.55); }
  else if (enemy.state !== 'attack') { enemy.flinchT = 0.35; enemy.cooldown = Math.min(enemy.cooldown, 0.3); }
}

// ---------------------------------------------------------------- enemy logic
function enemyStartAttack(name) {
  const e = enemy;
  e.state = 'attack'; e.clip = eClips[name]; e.clipName = name; e.t = 0; e.hitDone = false;
  e.next = name === 'swipe' && Math.random() < 0.4 ? 'swipeL' : null;
}
function enemyStagger(scale = 1) {
  const e = enemy;
  e.state = 'stagger'; e.t = 0; e.staggerDur = eClips.stagger.duration * scale; e.next = null;
  e.armorT = e.staggerDur + 4; // no stun-lock: poise immunity after a stagger
  e.ch.setGlow(0, 0);
}
function killEnemy() {
  enemy.dead = true; enemy.state = 'dead'; enemy.t = 0;
  enemy.ch.setGlow(0, 0);
  game.over = true;
  game.slowmo = 1.2;
  setTimeout(() => showEnd('Победа'), 1600);
}

function updateEnemy(dt) {
  const e = enemy, ch = e.ch, pp = player.ch.position;
  e.t += dt;
  e.flinchT = Math.max(0, e.flinchT - dt);
  e.armorT = Math.max(0, e.armorT - dt);
  e.poise = Math.max(0, e.poise - dt * 6);
  const toP = tmpV.subVectors(pp, ch.position).setY(0);
  const dist = toP.length();
  const yawP = yawOf(toP);
  let rot = null;
  ch.setPivot(0, 0, 1.6);

  switch (e.state) {
    case 'idle':
      ch.setLoco('idle', 1);
      e.timer -= dt;
      ch.yaw = turnTo(ch.yaw, yawP, dt * 2);
      if (e.timer <= 0) e.state = 'chase';
      break;
    case 'chase': {
      if (player.dead) { ch.setLoco('idle', 1); break; }
      ch.yaw = turnTo(ch.yaw, yawP, dt * 2.6);
      e.cooldown -= dt;
      const facing = Math.abs(ang(yawP - ch.yaw)) < 0.5;
      if (dist > 2.9) {
        ch.position.addScaledVector(fwd(ch.yaw, tmpV2), 2.4 * dt);
        ch.setLoco('walk', 1.0);
      } else ch.setLoco('idle', 1);
      if (e.cooldown <= 0 && facing) {
        const r = Math.random();
        if (dist < 3.6) enemyStartAttack(r < 0.6 ? 'swipe' : 'slam');
        else if (dist > 5 && dist < 11 && r < 0.02 + dt * 1.2) enemyStartAttack('lunge');
      }
      break;
    }
    case 'attack': {
      const c = e.clip, n = e.t / c.duration;
      ch.setLoco('idle', 1);
      if (n < c.track) ch.yaw = turnTo(ch.yaw, yawP, dt * 2.4);
      // telegraph: red = blockable, orange = dodge only
      const tele = n < c.active[0] ? Math.min(1, n / c.active[0]) : n < c.active[1] ? 1 : 0;
      ch.setGlow(c.blockable ? 0xaa1408 : 0xff7a10, tele * (c.blockable ? 0.4 : 0.6));
      if (c.dash && n > c.dash[0] && n < c.dash[1] && dist > T.playerR + T.enemyR + 0.3) {
        ch.position.addScaledVector(fwd(ch.yaw, tmpV2), c.dashSpeed * dt);
        ch.setLoco('run', 1.4);
      }
      if (!e.hitDone && n >= c.active[0] && n <= c.active[1]) enemyHitCheck(c, dist, yawP);
      if (c.kind === 'slam' && !e.slammed && n >= c.active[0]) {
        e.slammed = true;
        const at = ch.position.clone().addScaledVector(fwd(ch.yaw, tmpV2), 2.3);
        shockwave(at); burst(at.setY(0.1), 0xc8a070, 24, 6); sfx('slam');
        game.shake = Math.max(game.shake, 0.35);
      }
      rot = c.sample(Math.min(1, n));
      if (n >= 1) {
        e.slammed = false;
        ch.setGlow(0, 0);
        if (e.next) enemyStartAttack(e.next);
        else { e.state = 'chase'; e.cooldown = rand(0.5, 1.3); }
      }
      break;
    }
    case 'stagger': {
      const n = e.t / e.staggerDur;
      ch.setLoco('idle', 0.5);
      rot = eClips.stagger.sample(Math.min(1, n));
      if (n < 0.2) ch.position.addScaledVector(fwd(ch.yaw, tmpV2), -2.5 * dt);
      if (n >= 1) { e.state = 'chase'; e.cooldown = 0.5; }
      break;
    }
    case 'dead': {
      const n = Math.min(1, e.t / 1.2);
      ch.setPivot(-n * n * Math.PI / 2, 0, 0.1);
      ch.setLoco('idle', 0.1);
      rot = blend(pose(E_N), P.dead, n);
      break;
    }
  }
  if (e.flinchT > 0 && !rot) rot = eClips.flinch.sample(1 - e.flinchT / 0.35);

  const rr = Math.hypot(ch.position.x, ch.position.z);
  if (rr > T.arena - 1) ch.position.multiplyScalar((T.arena - 1) / rr);
  ch.update(dt, rot);
}

function enemyHitCheck(c, dist, yawP) {
  const e = enemy, p = player;
  if (p.dead) return;
  let inRange = false;
  if (c.kind === 'arc' || c.kind === 'lunge') inRange = dist <= c.reach && Math.abs(ang(yawP - e.ch.yaw)) <= c.arc;
  else if (c.kind === 'slam') {
    const at = tmpV2.copy(e.ch.position).addScaledVector(fwd(e.ch.yaw, tmpV3), 2.3);
    inRange = Math.hypot(p.ch.position.x - at.x, p.ch.position.z - at.z) <= 1.8 && p.ch.position.y < 0.6;
  }
  if (!inRange) return;
  if (p.iframe) return; // rolling/dodging through it
  e.hitDone = true;

  const dirToEnemy = yawOf(tmpV2.subVectors(e.ch.position, p.ch.position));
  const facingEnemy = Math.abs(ang(dirToEnemy - p.ch.yaw)) < 1.4;
  const knockDir = tmpV3.subVectors(p.ch.position, e.ch.position).setY(0).normalize();
  if (p.blocking && facingEnemy) {
    if (!c.blockable) { toast('Не блокируется!', 0.8); }
    else {
      const now = performance.now() / 1000;
      if (now - p.blockPressedAt <= T.parryWindow) {
        toast('Парирование!');
        sfx('parry');
        burst(shieldPos(), 0xfff0b0, 26, 7);
        game.slowmo = 0.45;
        enemyStagger(1);
        return;
      }
      if (p.st >= T.cost.block * 0.5) {
        p.spend(T.cost.block);
        sfx('block');
        burst(shieldPos(), 0xffd890, 14, 4);
        p.state = 'hit'; p.t = 0; p.dur = 0.25; p.knock = 3; p.dashDir.copy(knockDir);
        game.shake = Math.max(game.shake, 0.1);
        return;
      }
      toast('Защита пробита', 0.8);
      damagePlayer(c.dmg * 0.5, knockDir, 0.8);
      return;
    }
  }
  damagePlayer(c.dmg, knockDir, c.kind === 'slam' ? 0.8 : 0.45);
}

function damagePlayer(dmg, knockDir, dur) {
  const p = player;
  p.hp = Math.max(0, p.hp - dmg);
  p.ch.flash(0.12);
  sfx('hurt');
  burst(tmpV.copy(p.ch.position).setY(1.3), 0xff4030, 12, 4);
  game.shake = Math.max(game.shake, 0.3);
  game.hitstop = 0.06;
  p.hitW = 1;
  p.state = 'hit'; p.t = 0; p.dur = dur; p.knock = dur > 0.6 ? 7 : 4; p.dashDir.copy(knockDir);
  p.vy = Math.max(p.vy, 0);
  if (p.hp <= 0) {
    p.dead = true; p.state = 'dead'; p.t = 0;
    game.over = true;
    setTimeout(() => showEnd('Вы погибли'), 1500);
  }
}

// ---------------------------------------------------------------- camera
const cam = { yaw: 0, pitch: 0.16, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false };
function updateCamera(dt) {
  const p = player;
  cam.pitch = clamp(cam.pitch + mouse.dy * T.sens * 0.8, -0.25, 0.75);
  if (down('ArrowUp')) cam.pitch = clamp(cam.pitch - dt, -0.25, 0.75);
  if (down('ArrowDown')) cam.pitch = clamp(cam.pitch + dt, -0.25, 0.75);
  // camera swings with the hero's heading
  cam.yaw = lerpAng(cam.yaw, p.heading, 1 - Math.exp(-dt * 14));

  const base = tmpV.copy(p.ch.position);
  base.y = p.ch.position.y * 0.5; // damp the jump
  const lockActive = game.lockOn && !enemy.dead;
  const dist = lockActive ? 5.2 : 4.4;
  const f = fwd(cam.yaw, tmpV2);
  const desired = tmpV3.copy(base).addScaledVector(f, -dist * Math.cos(cam.pitch));
  desired.y = base.y + 1.75 + dist * Math.sin(cam.pitch);
  const look = new THREE.Vector3().copy(base).addScaledVector(f, 2.2);
  look.y = base.y + 1.45;
  if (lockActive) look.lerp(new THREE.Vector3(enemy.ch.position.x, 2.0, enemy.ch.position.z), 0.35);

  if (!cam.init) { cam.pos.copy(desired); cam.look.copy(look); cam.init = true; }
  const k = 1 - Math.exp(-dt * 12);
  cam.pos.lerp(desired, k);
  cam.look.lerp(look, k);
  camera.position.copy(cam.pos);
  if (game.shake > 0) {
    const s = game.shake * 0.35;
    camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); camera.position.z += rand(-s, s);
  }
  if (game.debugCam) { camera.position.fromArray(game.debugCam[0]); cam.look.fromArray(game.debugCam[1]); }
  camera.lookAt(cam.look);

  sun.position.set(p.ch.position.x + 8, 16, p.ch.position.z + 6);
  sun.target.position.copy(p.ch.position);
}

// ---------------------------------------------------------------- HUD update
let ghostP = 100, ghostE = 100;
function updateHUD(dt) {
  const pp = (player.hp / T.playerHP) * 100, ep = (enemy.hp / T.enemyHP) * 100;
  hud.pHP.style.width = pp + '%';
  hud.pST.style.width = (player.st / T.stamina) * 100 + '%';
  hud.eHP.style.width = ep + '%';
  ghostP = Math.max(pp, ghostP - dt * 25); ghostE = Math.max(ep, ghostE - dt * 25);
  hud.pHPg.style.width = ghostP + '%'; hud.eHPg.style.width = ghostE + '%';
  if (game.lockOn && !enemy.dead) {
    const v = new THREE.Vector3(enemy.ch.position.x, 2.3, enemy.ch.position.z).project(camera);
    hud.lock.classList.toggle('hidden', v.z > 1);
    hud.lock.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
    hud.lock.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
  } else hud.lock.classList.add('hidden');
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) hud.toast.classList.remove('show'); }
}

// ---------------------------------------------------------------- flow
function start() {
  $('overlay').classList.add('hidden');
  $('hud').classList.remove('hidden');
  game.running = true;
  resumeAudio();
  if (!params.has('test')) { try { canvas.requestPointerLock(); } catch {} }
}
function pause() {
  game.running = false;
  $('start').textContent = 'Продолжить';
  $('overlay').classList.remove('hidden');
}
function showEnd(text) {
  if (!game.over) return;
  $('end-title').textContent = text;
  $('end').classList.remove('hidden');
}
function restart() {
  player.reset(); enemy.reset();
  game.over = false; game.lockOn = false; game.slowmo = 0;
  cam.init = false; cam.yaw = 0;
  ghostP = ghostE = 100;
  $('end').classList.add('hidden');
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.manual) step(dt);
}

function step(dt) {
  if (player && game.running) {
    if (hit('KeyR')) restart();
    if (hit('Tab', 'MMB') && !enemy.dead) { game.lockOn = !game.lockOn; toast(game.lockOn ? 'Цель захвачена' : 'Захват снят', 0.6); }
    if (hit('Escape')) { if (document.pointerLockElement) document.exitPointerLock(); else pause(); }

    let ts = 1;
    if (game.hitstop > 0) { game.hitstop -= dt; ts = 0.05; }
    else if (game.slowmo > 0) { game.slowmo -= dt; ts = 0.35; }
    const gdt = dt * ts;
    updatePlayer(gdt);
    updateEnemy(gdt);
    updateFx(gdt);
    game.shake = Math.max(0, game.shake - dt);
    updateCamera(dt);
    updateHUD(dt);
  } else if (player) {
    // paused / menu: keep the scene alive in the background
    player.ch.update(0, null); enemy.ch.update(dt * 0.5, null);
    updateWeapons();
    updateCamera(dt);
  }
  pressed.clear();
  mouse.dx = mouse.dy = 0;
  if (player && !game.noRender) renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

$('start').disabled = true;
$('start').addEventListener('click', start);

// The model ships as Xbot.glb; the hosted prototype serves it base64-encoded as text instead.
const onModelError = (err) => { $('loading').textContent = 'Не удалось загрузить модель: ' + err.message + ' (запустите через локальный сервер, см. README)'; };
fetch('models/Xbot.glb')
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
  .catch(() => fetch('models/xbot.b64.txt').then((r) => r.text()).then((b64) => Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0)).buffer))
  .then((buf) => new GLTFLoader().parse(buf, '', onModel, onModelError))
  .catch(onModelError);
function onModel(gltf) {
  player = new Player(new Character(gltf, { scale: 1, surface: 0xb9b2a4, joints: 0x2c3e5c }));
  enemy = new Enemy(new Character(gltf, { scale: T.enemyScale, surface: 0x7a3c30, joints: 0x1c1414 }));
  scene.add(player.ch.group, enemy.ch.group);
  $('loading').textContent = '';
  $('start').disabled = false;
  if (params.has('test')) start();
  requestAnimationFrame(frame);
}

// handle for automated testing / debugging from the console
window.game = {
  game, T, step, keys, pressed, mouse,
  get player() { return player; }, get enemy() { return enemy; },
  advance(sec, fps = 60) { for (let i = 0; i < Math.round(sec * fps); i++) step(1 / fps); },
  tap(code) { pressed.add(code); },
};
