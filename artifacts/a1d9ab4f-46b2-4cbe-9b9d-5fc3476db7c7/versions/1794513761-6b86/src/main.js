import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Aura, SilhouetteMask, PRESETS as AURA } from 'fx/aura-2d/aura.js';
import { SmokeFX, PRESETS as SMOKE } from 'fx/explosion-smoke-3d/smokefx.js';
import { Character, warp } from './character.js';
import { pose, mirrorDef, blend, stack, PoseClip } from './pose.js';
import { sfx, resumeAudio } from './audio.js';
import { makeSword, makeShield, poseSword, poseShield, WeaponRig } from './weapons.js';
import { SwordTrail, GroundMarker, makeShadowBlob, makeThrowable } from './fx.js';
import { HitReactor, HitDebris, REACT_PRESETS, toLocal, dirToLocal } from './hitreact.js';
import { Finisher, FINISHERS } from './finisher.js';
import { RH, RhythmHud } from './rhythm.js';

// ---------------------------------------------------------------- tuning
// Everything is in metres and seconds. Movement is deliberately heavy: acceleration, braking and
// turning take time, every swing has a wind-up, a short "hold" before the strike and a long recovery.
const T = {
  hero: { height: 1.85, hp: 120, st: 100, run: 3.3, sprint: 4.9, back: 1.5, guard: 1.25, accel: 6.5, decel: 9, turn: 6, turnSprint: 3.2, turnAttack: 3.5 },
  leshy: { height: 2.5, hp: 620, walk: 1.35, turn: 1.7, accel: 2.2 },
  gravity: 16, jumpV: 4.4,
  arena: 24,
  stRegen: 22, stDelay: 1.0, exhaustDelay: 1.9, exhaustUntil: 30,
  cost: { l1: 14, l2: 13, l3: 18, heavy: 26, roll: 26, dodge: 17, sprint: 13, block: 16, parryHit: 10, jump: 10 },
  parryHold: 0.25, tapBlock: 0.6, parryDrain: 8, clickSpeed: 1.15,
  playerR: 0.36, enemyR: 0.62,
  auraOn: 50,       // hero aura burns while stamina > 50%
  phase2: 0.35,     // Leshy's finale below 35% health
  regen: { delay: 3.0, rate: 1.6, cap: 0.5 }, // hero heals 1.6 hp/s after 3 s without damage, up to 50% of max
  staggerDur: 2.3, // long enough to walk up and finish him
  finisher: { range: 3.4 },
  grab: { squeeze: 6, land: 22, mash: 7, throwSpeed: 8.5, throwUp: 4.6 },
  sens: 0.0026,
};

const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const lerpAng = (a, b, k) => a + ang(b - a) * k;
const turnTo = (a, b, maxStep) => { const d = ang(b - a); return a + Math.max(-maxStep, Math.min(maxStep, d)); };
const yawOf = (v) => Math.atan2(v.x, v.z);
const fwd = (yaw, out = new THREE.Vector3()) => out.set(Math.sin(yaw), 0, Math.cos(yaw));
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const params = new URLSearchParams(location.search);

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: params.has('test') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const SKY = 0x1a2120;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 20, 58);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xc4d4cc, 0x3a3422, 1.5));
const sun = new THREE.DirectionalLight(0xffe2b8, 2.7);
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
  g.fillStyle = '#353a26';
  g.fillRect(0, 0, 512, 512);
  // moss, earth and fallen leaves
  for (let i = 0; i < 4200; i++) {
    const r = Math.random();
    g.fillStyle = r < 0.45 ? `rgba(${70 + Math.random() * 30},${80 + Math.random() * 30},${36},0.35)`
      : r < 0.8 ? `rgba(${58 + Math.random() * 20},${48 + Math.random() * 14},${30},0.35)`
        : `rgba(${120 + Math.random() * 60},${70 + Math.random() * 30},${24},0.45)`;
    const s = 1 + Math.random() * (r < 0.8 ? 6 : 3);
    g.fillRect(Math.random() * 512, Math.random() * 512, s, s * (0.5 + Math.random()));
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 26);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.97 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(T.arena, T.arena + 0.25, 128), new THREE.MeshBasicMaterial({ color: 0x6f7a3a, transparent: true, opacity: 0.4 }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.01;
scene.add(ring);

// a dark spruce forest around the clearing (instanced, no shadows)
(function forest() {
  const trunkG = new THREE.CylinderGeometry(0.18, 0.3, 3, 6); trunkG.translate(0, 1.5, 0);
  const crownG = new THREE.ConeGeometry(1.8, 6.5, 7); crownG.translate(0, 5.5, 0);
  const crown2 = new THREE.ConeGeometry(1.3, 4.5, 7); crown2.translate(0, 8, 0);
  const n = 70;
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x2b2018, roughness: 1 }), n);
  const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0x1d2e1f, roughness: 1, flatShading: true }), n);
  const crowns2 = new THREE.InstancedMesh(crown2, new THREE.MeshStandardMaterial({ color: 0x22382a, roughness: 1, flatShading: true }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.04, 0.04), r = T.arena + 3 + rand(0, 9) + (i % 3) * 3;
    p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(0, 6));
    const k = rand(0.8, 1.5); s.set(k, k * rand(0.9, 1.25), k);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m); crowns.setMatrixAt(i, m); crowns2.setMatrixAt(i, m);
  }
  scene.add(trunks, crowns, crowns2);
  // a few mossy boulders at the edge of the clearing
  const rockG = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockG, new THREE.MeshStandardMaterial({ color: 0x4a4d3e, roughness: 1, flatShading: true }), 14);
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), r = T.arena + rand(0.5, 2.5);
    p.set(Math.cos(a) * r, 0.2, Math.sin(a) * r);
    q.setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), rand(0, 3)));
    const k = rand(0.5, 1.3); s.set(k * rand(1, 1.6), k * 0.7, k);
    m.compose(p, q, s); rocks.setMatrixAt(i, m);
  }
  rocks.receiveShadow = true;
  scene.add(rocks);
})();

// ---------------------------------------------------------------- weapons & effects
const sword = makeSword();
const shield = makeShield();
scene.add(sword, shield);
const trail = new SwordTrail(22, 0xfff2c8);
scene.add(trail.mesh);

const smoke = new SmokeFX();
scene.add(smoke.group);
const mask = new SilhouetteMask(renderer, { resolution: 0.5 });
// Hero: golden «Благодать», a little calmer so it does not cover the view from behind.
const heroAura = new Aura({ channel: 0, seed: 3, visible: false, params: { ...AURA.holy.params, scale: 0.95, power: 0.6, height: 2.2, envGlow: 0.9, envRadius: 4, envPool: 0.45, glow: 1.0, pDensity: 0.22, pSpread: 0.6, halfAmt: 0.55, opacity: 0.85 } });
// Leshy: greenish «Чумной дым», bigger for a 2.5 m body; stronger in the finale.
const LESHY_AURA = { ...AURA.plague.params, scale: 1.35, envGlow: 0.9, envRadius: 5, envPool: 0.6 };
const LESHY_AURA_FINAL = { ...LESHY_AURA, scale: 1.48, thick: 0.3, speed: 0.8, tongues: 1.6, glow: 1.2, envGlow: 1.1, envPool: 0.7, pDensity: 0.6, skulls: 1 };
const leshyAura = new Aura({ channel: 1, seed: 7, visible: false, params: LESHY_AURA });
scene.add(heroAura.group, leshyAura.group);
// hit reactions (src/hitreact.js): spring-driven recoil on the Leshy, bark chips, leaves and glowing wounds
const leshyReact = new HitReactor(REACT_PRESETS.giant);
const debris = new HitDebris(scene);
// finisher (src/finisher.js): choreographed scene in the Leshy's frame
const fin = new Finisher(FINISHERS.leapCleave);

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
const markers = [];
function marker(pos, radius, duration, color) { const m = new GroundMarker(scene, pos, radius, duration, color); markers.push(m); return m; }
function updateFx(dt) {
  debris.update(dt);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    s.v.y -= 12 * dt;
    s.m.position.addScaledVector(s.v, dt);
    s.m.material.opacity = Math.max(0, s.life / s.max);
    if (s.life <= 0) { scene.remove(s.m); s.m.material.dispose(); sparks.splice(i, 1); }
  }
  for (let i = markers.length - 1; i >= 0; i--) { markers[i].update(dt); if (markers[i].done) markers.splice(i, 1); }
}

// Explosion looks (fx-library presets with forest colours)
const BOOM = {
  rot: { recipe: 'blast', y: 0.7, p: { ...SMOKE.toxic.params, scale: 1.15, duration: 1.4, color: '#a9c24e', shadow: '#5f7030', accent: '#f4ff8a', cFlash: '#c8ff5a' }, r: 2.1, dmg: 22, color: 0x9fdc4a },
  wisp: { recipe: 'blast', y: 0.8, p: { ...SMOKE.magic.params, scale: 1.0, color: '#2f8f5a', shadow: '#1a5236', accent: '#d8ff6a', cFlash: '#9dff7a' }, r: 1.8, dmg: 18, color: 0x7dff9a },
  leap: { recipe: 'ground', y: 0, p: { ...SMOKE.ground.params, scale: 1.45, color: '#b9c98a', shadow: '#6d6a48', accent: '#f4ffd8', cFlash: '#eaffc8' }, r: 3.2, dmg: 30, color: 0xd0e08a },
  root: { recipe: 'blast', y: 0.35, p: { ...SMOKE.fire.params, scale: 0.75, spikes: 7, embers: 4, flash: 0.3, color: '#6b5a3e', shadow: '#3c3122', accent: '#c8ff6a', cFlash: '#a8e050' }, r: 1.35, dmg: 20, color: 0xa0c060 },
  roar: { recipe: 'ground', y: 0, p: { ...SMOKE.ground.params, scale: 1.0, intensity: 0.7, color: '#8fd6a0', shadow: '#557a5a', accent: '#eaffd8', cFlash: '#d8ffd0' }, r: 5, dmg: 0, color: 0x8fd6a0 },
};

// ---------------------------------------------------------------- procedural poses (root space, degrees)
const GUARD_D = { RightArm: [-22, 0, -8], RightForeArm: [-50, 15, 0], LeftArm: [-20, -8, 10], LeftForeArm: [-60, -25, 0] };
const P = {
  guard: pose(GUARD_D),
  parry: pose({ Spine1: [6, 0, 0], Spine2: [0, -18, 0], RightArm: [-15, -30, -40], RightForeArm: [-60, 0, 0], LeftArm: [-74, -22, 0], LeftForeArm: [-72, -32, 0], Neck: [5, 0, 0] }),
  block: pose({ Spine1: [10, 0, 0], Spine2: [0, -10, 0], RightArm: [-30, 0, -25], RightForeArm: [-70, 10, 0], LeftArm: [-70, -35, 0], LeftForeArm: [-85, -40, 0], Neck: [8, 0, 0] }),
  recoil: pose({ Spine: [-14, 0, 0], Spine1: [-8, 0, 0], Neck: [-10, 0, 0], LeftArm: [-40, -20, 0], LeftForeArm: [-60, -30, 0] }),
  hit: pose({ Spine: [-18, 0, 0], Spine1: [-10, 0, 0], Neck: [-15, 0, 0], RightArm: [0, 0, -35], LeftArm: [0, 0, 35] }),
  tuck: pose({ Spine: [35, 0, 0], Spine1: [25, 0, 0], Neck: [20, 0, 0], RightUpLeg: [-105, 0, 0], LeftUpLeg: [-105, 0, 0], RightLeg: [115, 0, 0], LeftLeg: [115, 0, 0], RightArm: [-70, 20, 0], LeftArm: [-70, -20, 0], RightForeArm: [-40, 0, 0], LeftForeArm: [-40, 0, 0] }),
  tired: pose({ Spine: [14, 0, 0], Spine1: [8, 0, 0], Neck: [10, 0, 0], RightArm: [12, 0, 0], LeftArm: [10, 0, 0] }),
  // heavy attack: an extra twist and lean on top of the overhead clip
  heavyAccent: pose({ Spine: [-6, 0, 0], Spine1: [0, -14, 0], Spine2: [-6, -12, 0] }),
};
const ID = pose({});

// Leshy's procedural moves (the model ships with one claw swing, a pick-up, a jump, hit and death)
const E_SWIPE_D = [
  { Spine2: [0, -40, 0], Spine1: [0, -15, 0], RightArm: [0, -60, -90], RightForeArm: [0, 0, 0] },
  { Spine2: [10, 45, 0], Spine1: [0, 15, 0], RightArm: [0, 115, -85], RightForeArm: [0, 10, 0] },
];
const E = {
  grabPrep: pose({ Spine: [-6, 0, 0], RightArm: [-25, 0, -55], LeftArm: [-25, 0, 55], RightForeArm: [-30, 0, 0], LeftForeArm: [-30, 0, 0], RightUpLeg: [-22, 0, 0], LeftUpLeg: [-22, 0, 0], RightLeg: [38, 0, 0], LeftLeg: [38, 0, 0] }),
  grabReach: pose({ Spine: [26, 0, 0], Spine1: [8, 0, 0], RightArm: [-88, -18, -8], LeftArm: [-88, 18, 8], RightForeArm: [-12, 0, 0], LeftForeArm: [-12, 0, 0], LeftUpLeg: [-30, 0, 0], LeftLeg: [30, 0, 0] }),
  // holds the hero up in front of his face, leans in and cocks the head
  grabFace: pose({ Spine: [4, 0, 0], Spine1: [4, -8, 0], Neck: [8, -18, 0], Head: [6, -16, 12], RightArm: [-118, 12, -6], RightForeArm: [-32, 0, 0], LeftArm: [-40, 0, 40], LeftForeArm: [-45, 0, 0] }),
  grabRoar: pose({ Spine: [6, 0, 0], Neck: [12, 0, -4], Head: [10, 0, -6] }),
  grabLift: pose({ Spine: [-12, 0, 0], Spine1: [-8, 0, 0], Neck: [-14, 0, 0], RightArm: [-182, 0, -10], RightForeArm: [-4, 0, 0], LeftArm: [-45, 0, 45], LeftForeArm: [-40, 0, 0] }),
  backhand: new PoseClip(1.7, [[0, ID], [0.5, pose(mirrorDef(E_SWIPE_D[0]))], [0.62, pose(mirrorDef(E_SWIPE_D[0]))], [0.72, pose(mirrorDef(E_SWIPE_D[1]))], [1, ID]]),
  throwBack: pose({ Spine: [-10, 0, 0], Spine1: [-6, -22, 0], Spine2: [-4, -18, 0], RightArm: [-196, 18, -18], RightForeArm: [-55, 0, 0], LeftArm: [-55, -20, 20], LeftForeArm: [-30, 0, 0] }),
  throwFwd: pose({ Spine: [22, 0, 0], Spine1: [10, 26, 0], Spine2: [6, 18, 0], RightArm: [-75, 30, 0], RightForeArm: [-5, 0, 0], LeftArm: [-10, 0, 30] }),
  slam: new PoseClip(2.6, [[0, ID],
    [0.38, pose({ Spine: [-12, 0, 0], Spine1: [-12, 0, 0], RightArm: [-172, 0, -12], LeftArm: [-172, 0, 12], RightForeArm: [-30, 0, 0], LeftForeArm: [-30, 0, 0], Neck: [-12, 0, 0] })],
    [0.45, pose({ Spine: [-14, 0, 0], Spine1: [-14, 0, 0], RightArm: [-178, 0, -12], LeftArm: [-178, 0, 12], RightForeArm: [-34, 0, 0], LeftForeArm: [-34, 0, 0], Neck: [-14, 0, 0] })],
    [0.5, pose({ Spine: [32, 0, 0], Spine1: [24, 0, 0], RightArm: [-40, 0, 0], LeftArm: [-40, 0, 0], RightUpLeg: [-30, 0, 0], RightLeg: [40, 0, 0], LeftUpLeg: [-30, 0, 0], LeftLeg: [40, 0, 0] })],
    [0.72, pose({ Spine: [30, 0, 0], Spine1: [22, 0, 0], RightArm: [-40, 0, 0], LeftArm: [-40, 0, 0], RightUpLeg: [-28, 0, 0], RightLeg: [38, 0, 0], LeftUpLeg: [-28, 0, 0], LeftLeg: [38, 0, 0] })],
    [1, ID]]),
  roar: new PoseClip(2.4, [[0, ID],
    [0.22, pose({ Spine: [16, 0, 0], Spine1: [10, 0, 0], RightArm: [-30, 0, -20], LeftArm: [-30, 0, 20], RightForeArm: [-40, 0, 0], LeftForeArm: [-40, 0, 0] })],
    [0.32, pose({ Spine: [-16, 0, 0], Spine1: [-10, 0, 0], Neck: [-28, 0, 0], RightArm: [-35, 0, -80], LeftArm: [-35, 0, 80], RightForeArm: [-50, 0, 0], LeftForeArm: [-50, 0, 0] })],
    [0.78, pose({ Spine: [-14, 0, 0], Spine1: [-8, 0, 0], Neck: [-24, 0, 0], RightArm: [-30, 0, -75], LeftArm: [-30, 0, 75], RightForeArm: [-45, 0, 0], LeftForeArm: [-45, 0, 0] })],
    [1, ID]]),
  // finisher: sees the leap coming (head up, free arm half raised) ...
  brace: pose({ Spine: [-8, 0, 0], Spine1: [-6, 0, 0], Neck: [-16, 0, 0], Head: [-10, 0, 0], LeftArm: [-95, -20, 30], LeftForeArm: [-60, 0, 0], RightArm: [-30, 0, -30] }),
  // ... rising again: a hand pushes on the knee, head still low
  push: pose({ Spine: [12, 0, 0], RightArm: [-45, 0, -10], RightForeArm: [-30, 0, 0], Neck: [6, 0, 0] }),
  // finisher: the giant drops to one knee, head hanging
  kneel: pose({ Spine: [24, 0, 0], Spine1: [14, 0, 0], Neck: [18, 0, 0], RightUpLeg: [-88, 0, 0], RightLeg: [92, 0, 0], LeftUpLeg: [-8, 0, 0], LeftLeg: [100, 0, 0],
    RightArm: [-20, 0, -30], LeftArm: [-40, 0, 25], LeftForeArm: [-35, 0, 0] }),
  flinch: new PoseClip(0.45, [[0, ID], [0.3, pose({ Spine: [-10, 0, 0], Spine1: [-6, 0, 0], Neck: [-10, 0, 0] })], [1, ID]]),
};

// ---------------------------------------------------------------- moves
// Clip-driven swings use a 4-phase warp of the authored clip: wind-up -> hold -> strike -> recovery.
// clip times (s) of those phase borders in the Attack / Attack3 / Attack4 clips:
const CLIP_PH = [0, 0.52, 0.6, 0.82, 1.333];
function phaseKeys(w, h, s, r) {
  return [[0, CLIP_PH[0]], [w, CLIP_PH[1], 'io'], [w + h, CLIP_PH[2], 'in'], [w + h + s, CLIP_PH[3], 'lin'], [w + h + s + r, CLIP_PH[4], 'out']];
}
function swing(clip, [w, h, s, r], extra) {
  return { clip, keys: phaseKeys(w, h, s, r), dur: w + h + s + r, windup: w, strike: [w + h - 0.02, w + h + s + 0.04], recover: w + h + s, ...extra };
}
const HM = {
  l1: swing('Attack', [0.46, 0.12, 0.13, 0.58], { dmg: 16, cost: T.cost.l1, poise: 16, lunge: 0.55, next: 'l2' }),
  l2: swing('Attack4', [0.42, 0.1, 0.12, 0.58], { dmg: 15, cost: T.cost.l2, poise: 14, lunge: 0.8, next: 'l3' }),
  l3: swing('Attack3', [0.52, 0.16, 0.13, 0.72], { dmg: 24, cost: T.cost.l3, poise: 28, lunge: 0.6, next: 'l1', finisher: true }),
  heavy: swing('Attack3', [0.8, 0.32, 0.15, 0.9], { dmg: 38, cost: T.cost.heavy, poise: 50, lunge: 0.85, heavy: true, armor: true }),
  // контрудар после точного уклона: короткий замах, длинный выпад, сильнее обычного
  counter: swing('Attack4', [0.16, 0.04, 0.12, 0.52], { dmg: RH.counter.dmg, cost: 6, poise: RH.counter.poise, lunge: RH.counter.lunge, next: 'l2', counter: true }),
};
const HERO_JUMP = { prep: 0.24, land: 0.42 };

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
const hud = { pHPbar: $('p-hp-bar'), pHP: $('p-hp'), pHPg: $('p-hp-ghost'), pST: $('p-st'), stBar: $('p-st-bar'), aura: $('aura-label'), eHP: $('e-hp'), eHPg: $('e-hp-ghost'), phase: $('boss-phase'), lock: $('lock-icon'), toast: $('toast'), fin: $('fin-prompt') };
let toastT = 0;
function toast(text, t = 1.1) { hud.toast.textContent = text; hud.toast.classList.add('show'); toastT = t; }

// ---------------------------------------------------------------- game state
const game = { running: false, over: false, hitstop: 0, slowmo: 0, slowT: 0, slowScale: 1, shake: 0, lockOn: false, time: 0 };
// полигон: 1 кольца тайминга, 2 замедление, 3 набор приёмов Лешего, 4 бессмертие
const train = { rings: !params.has('norings'), slow: false, mode: params.get('mode') || 'mix', god: params.has('god') };
let rhud;
let player, enemy, weaponRig;
const projectiles = [];
const hazards = []; // delayed area hits (root eruptions)

class Player {
  constructor(ch) { this.ch = ch; this.reset(); }
  reset() {
    this.ch.position.set(0, 0, -6);
    this.heading = 0; this.ch.yaw = 0;
    this.vel = new THREE.Vector3();
    this.vy = 0; this.grounded = true;
    this.hp = T.hero.hp; this.st = T.hero.st; this.stTimer = 0; this.exhausted = false;
    this.state = 'free'; this.t = 0; this.dur = 0; this.tScale = 1;
    this.move = null; this.h = null; this.combo = 'l1'; this.comboTimer = 0; this.queued = false; this.hitDone = false;
    this.blocking = false; this.parrying = false; this.blockW = 0; this.parryW = 0; this.rmbHeld = 0; this.tapBlockT = 0;
    this.iframe = false; this.hitW = 0; this.recoilW = 0; this.tiredW = 0;
    this.moveDir = new THREE.Vector3();
    this.dashDir = new THREE.Vector3();
    this.lean = new THREE.Vector2();
    this.dead = false;
    this.auraOn = false; this.auraToggleT = 0;
    this.hurtT = 99; this.regenOn = false; this.mash = 0; this.spin = 0;
    this.buf = { atk: 0, heavy: 0, roll: 0, dodge: 0, jump: 0, shield: 0 };
    this.parryT = 9; this.parryWin = 0; this.lastPress = -9; this.lastClawHit = -9; this.counterT = 0; this.perfectUsed = false;
    this.ch.stopAll(0.01);
    this.ch.setPivot(0, 0, 0.9);
  }
  spend(c) { if (this.st <= 0) return false; this.st = Math.max(0, this.st - c); this.stTimer = T.stDelay; if (this.st <= 0) this.exhaust(); return true; }
  exhaust() { if (!this.exhausted) { this.exhausted = true; this.stTimer = T.exhaustDelay; toast('Нет сил', 0.8); } }
}

class Enemy {
  constructor(ch) { this.ch = ch; this.reset(); }
  reset() {
    this.ch.position.set(0, 0, 5);
    this.ch.yaw = Math.PI;
    this.speed = 0;
    this.hp = T.leshy.hp;
    this.state = 'intro'; this.t = 0; this.timer = 1.6;
    this.cooldown = 1.2; this.superCd = 7; this.move = null; this.h = null; this.hitDone = false; this.next = null;
    this.poise = 0; this.flinchT = 0; this.armorT = 0; this.dead = false; this.stunDur = T.staggerDur; this.glinted = false;
    this.phase = 1; this.lift = 0; this.held = null;
    this.ch.stopAll(0.01);
    this.ch.setPivot(0, 0, 1.6);
    this.ch.setGlow(0, 0);
    this.prevClaw = new THREE.Vector3(); this.clawInit = false;
  }
  get phase2() { return this.phase === 2; }
}

// ---------------------------------------------------------------- player logic
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpV3 = new THREE.Vector3();

function targetYaw() { return yawOf(tmpV.subVectors(enemy.ch.position, player.ch.position)); }
function enemyDist() { return Math.hypot(enemy.ch.position.x - player.ch.position.x, enemy.ch.position.z - player.ch.position.z); }
function softTarget(range = 4.5, cone = 1.3) {
  if (enemy.dead) return null;
  const d = enemyDist();
  if (game.lockOn && d < 14) return targetYaw();
  if (d < range && Math.abs(ang(targetYaw() - player.heading)) < cone) return targetYaw();
  return null;
}

function startAttack(name, tScale = 1) {
  const p = player, m = HM[name];
  if (p.st < m.cost * 0.5 || !p.spend(m.cost)) { toast('Нет сил', 0.6); return false; }
  p.state = 'attack'; p.t = 0; p.move = m; p.moveName = name; p.tScale = tScale; p.hitDone = false; p.queued = false; p.whoosh = false;
  p.h = p.ch.play(m.clip, 0.16);
  const ty = softTarget();
  p.attackYaw = ty ?? p.heading;
  p.hasTarget = ty != null;
  const d = enemyDist();
  p.lunge = ty != null ? clamp(d - (T.playerR + T.enemyR + 0.9), 0, m.lunge + 0.5) : m.lunge * 0.5;
  p.lungeDone = 0;
  return true;
}
function endAction(p, fade = 0.3) { if (p.h) p.ch.stop(p.h, fade); p.h = null; p.state = 'free'; p.t = 0; }

function updatePlayer(dt) {
  const p = player, ch = p.ch;
  if (p.state === 'finisher') { updateFinisherHero(dt); return; }
  p.t += dt * (p.state === 'attack' ? p.tScale : 1);
  p.comboTimer -= dt;
  p.stTimer -= dt;
  if (p.stTimer <= 0 && !(p.state === 'free' && p.sprinting)) p.st = Math.min(T.hero.st, p.st + T.stRegen * (p.exhausted ? 0.75 : 1) * dt);
  if (p.exhausted && p.st >= T.exhaustUntil) p.exhausted = false;
  p.hitW = Math.max(0, p.hitW - dt * 2.5);
  // light regeneration in a fight: only after a pause in taking damage, and only up to half health
  p.hurtT += dt;
  const cap = T.hero.hp * T.regen.cap;
  p.regenOn = !p.dead && p.hurtT > T.regen.delay && p.hp < cap && !['grabbed', 'thrown', 'down'].includes(p.state);
  if (p.regenOn) p.hp = Math.min(cap, p.hp + T.regen.rate * dt);
  p.recoilW = Math.max(0, p.recoilW - dt * 2.2);

  const ix = (down('KeyD') ? 1 : 0) - (down('KeyA') ? 1 : 0);
  const iz = (down('KeyW') ? 1 : 0) - (down('KeyS') ? 1 : 0);
  // --- heading: controls are relative to the automatic camera (W = away from the camera).
  // Outside the fight the input frame is latched while the same keys stay held, so the camera can
  // swing in behind the hero without bending his path.
  const keySig = ix + ',' + iz;
  if (!p.dead && (cam.mode === 'combat' || (ix === 0 && iz === 0) || keySig !== p.keySig || p.inputMode !== cam.mode)) p.heading = cam.yaw;
  p.keySig = keySig; p.inputMode = cam.mode;
  const f = fwd(p.heading, tmpV2);
  const r = tmpV3.set(-Math.cos(p.heading), 0, Math.sin(p.heading));
  p.moveDir.set(0, 0, 0).addScaledVector(f, iz).addScaledVector(r, ix);
  const moving = p.moveDir.lengthSq() > 0;
  if (moving) p.moveDir.normalize();

  // --- буфер ввода: нажатие помнится RH.buffer с и срабатывает, как только действие станет доступно
  const B = p.buf;
  for (const k in B) B[k] = Math.max(0, B[k] - dt);
  if (hit('LMB', 'KeyJ')) B.atk = RH.buffer;
  if (hit('KeyF', 'KeyK')) B.heavy = RH.buffer;
  if (hit('KeyC')) B.roll = RH.buffer;
  if (hit('KeyQ', 'AltLeft', 'AltRight')) B.dodge = RH.buffer;
  if (hit('Space')) B.jump = RH.buffer;
  const use = (k) => { if (B[k] > 0) { B[k] = 0; return true; } return false; };
  p.counterT = Math.max(0, p.counterT - dt);
  p.parryT += dt;

  const canAct = p.state === 'free' && !p.dead && p.grounded;
  // --- щит: нажатие ПКМ = блок и окно точного парирования; удержание = стойка (отбив)
  const shieldOk = !p.dead && p.grounded && (canAct || (p.state === 'recoil' && p.t > RH.recoilShield));
  const rmb = down('KeyL') || mouse.rmb;
  if (hit('RMB', 'KeyL')) {
    p.rmbHeld = 0; p.tapBlockT = T.tapBlock; B.shield = RH.buffer;
    if (game.time - p.lastClawHit < RH.lateBand) { rhud.feedback('Поздно', 'bad'); rhud.stats.late++; }
  }
  if (rmb) p.rmbHeld += dt; else p.rmbHeld = 0;
  p.tapBlockT = Math.max(0, p.tapBlockT - dt);
  const shieldUp = shieldOk && p.st > 0 && (rmb || p.tapBlockT > 0);
  if (shieldUp && B.shield > 0) {
    // окно открывается, когда щит реально поднялся; частые нажатия дают узкое окно
    B.shield = 0;
    p.parryWin = game.time - p.lastPress < RH.parrySpamGap ? RH.parrySpam : RH.parryWin;
    p.parryT = 0; p.lastPress = game.time;
  }
  p.parrying = shieldUp && rmb && p.rmbHeld >= T.parryHold;
  p.blocking = shieldUp;
  if (p.parrying) { p.st = Math.max(0, p.st - T.parryDrain * dt); p.stTimer = Math.max(p.stTimer, 0.3); if (p.st <= 0) p.exhaust(); }
  p.blockW += ((p.blocking ? 1 : 0) - p.blockW) * (1 - Math.exp(-dt * 12));
  p.parryW += ((p.parrying ? 1 : 0) - p.parryW) * (1 - Math.exp(-dt * 10));
  shieldGlow(Math.max(p.parryW, p.blocking && p.parryT < p.parryWin ? 2.2 : 0));

  // --- действия. Уклон и перекат прерывают: начало замаха, восстановление после клинка, оглушение от удара (после
  // RH.hurtCancel), отдачу щита. Вторая половина уклона сразу переходит в удар (контрудар после точного уклона).
  const m = p.move;
  const cancelable = p.state === 'attack' && (p.t < m.windup * 0.45 || p.t > m.recover + (m.dur - m.recover) * 0.35);
  const evadeOk = canAct || cancelable || (p.state === 'attack' && p.t > m.strike[1] + 0.08)
    || (p.state === 'hurt' && p.t > RH.hurtCancel) || (p.state === 'recoil' && p.t > RH.recoilShield);
  const dodgeLate = p.state === 'dodge' && p.t > RH.dodgeCancel;
  const startEvade = (kind, dur, dir) => {
    if (p.h) { ch.stop(p.h, 0.12); p.h = null; }
    p.state = kind; p.t = 0; p.dur = dur; p.perfectUsed = false;
    p.dashDir.copy(dir); sfx('whoosh');
  };
  if (!p.dead && p.grounded) {
    if (evadeOk && B.roll > 0 && p.st > 4 && p.spend(T.cost.roll)) {
      use('roll');
      startEvade('roll', 0.95, moving ? p.moveDir : fwd(ch.yaw, new THREE.Vector3()));
    } else if (evadeOk && B.dodge > 0 && p.st > 4 && p.spend(T.cost.dodge)) {
      use('dodge');
      startEvade('dodge', 0.6, moving ? p.moveDir : fwd(ch.yaw, new THREE.Vector3()).negate());
    } else if (canAct && B.jump > 0 && p.st > 4) {
      use('jump');
      p.spend(T.cost.jump);
      p.state = 'jump'; p.t = 0; p.h = ch.play('Jump', 0.15); p.jumpPhase = 'prep';
    } else if ((canAct || dodgeLate || cancelable) && finisherReady() && use('heavy')) {
      startFinisher();
      return;
    } else if ((canAct || dodgeLate) && B.atk > 0) {
      use('atk');
      if (dodgeLate) { p.state = 'free'; ch.setPivot(0, 0, 0.9); }
      if (p.counterT > 0) {
        p.counterT = 0;
        if (startAttack('counter')) { rhud.feedback('Контрудар', 'perfect'); rhud.stats.counter++; }
      } else {
        if (p.comboTimer <= 0) p.combo = 'l1';
        startAttack(p.combo, p.comboTimer > 0 && p.clicked ? T.clickSpeed : 1);
        p.clicked = true;
      }
    } else if (canAct && use('heavy')) {
      startAttack('heavy');
    }
  }
  if (p.state === 'attack' && hit('LMB', 'KeyJ') && p.t > 0.15) { p.queued = true; B.atk = 0; }
  const lmbHeld = mouse.lmb || down('KeyJ');

  // --- state machines
  let speed = 0, faceYaw = null, action = null, tuck = 0, turnRate = T.hero.turn, back = false;
  p.iframe = false;
  p.sprinting = false;
  ch.setPivot(0, 0, 0.9);
  const desired = tmpV.set(0, 0, 0);
  let accel = T.hero.accel, decel = T.hero.decel;

  switch (p.state) {
    case 'free': {
      if (moving) {
        back = iz < 0 && ix === 0 && !down('ShiftLeft', 'ShiftRight'); // Shift+S: turn and run away
        const slow = p.exhausted ? 0.62 : 1;
        if (p.blocking) speed = T.hero.guard;
        else if (back) speed = T.hero.back;
        else if (down('ShiftLeft', 'ShiftRight') && p.st > 0 && !p.exhausted) {
          speed = T.hero.sprint; p.sprinting = true; p.st -= T.cost.sprint * dt; p.stTimer = Math.max(p.stTimer, 0.4);
          if (p.st <= 0) { p.st = 0; p.exhaust(); }
          turnRate = T.hero.turnSprint;
        } else speed = T.hero.run;
        speed *= slow;
        desired.copy(p.moveDir).multiplyScalar(speed);
        const mv = yawOf(p.moveDir);
        faceYaw = back ? mv + Math.PI : mv;
        if (p.blocking && !enemy.dead && (game.lockOn || enemyDist() < 6)) faceYaw = targetYaw();
      } else if (p.blocking && !enemy.dead && enemyDist() < 8) faceYaw = targetYaw();
      // queued click after the swing ended: keep the combo going
      if (p.comboTimer > 0 && (p.queued || lmbHeld) && p.grounded && !p.blocking) { const q = p.queued; startAttack(p.combo, q ? T.clickSpeed : 1); }
      break;
    }
    case 'attack': {
      const mv = p.move, t = p.t;
      ch.setTime(p.h, warp(mv.keys, t));
      // track the target only during the wind-up, then the swing is committed
      if (t < mv.windup && p.hasTarget && !enemy.dead) p.attackYaw = turnTo(p.attackYaw, targetYaw(), dt * 2.2);
      faceYaw = p.attackYaw; turnRate = t < mv.windup ? T.hero.turnAttack : 1.2;
      // step into the swing: weight moves forward between late wind-up and strike
      const a0 = mv.windup * 0.45, a1 = mv.recover;
      const k = smooth(a0, a1, t);
      const step = (k - p.lungeDone) * p.lunge;
      p.lungeDone = k;
      ch.position.addScaledVector(fwd(p.attackYaw, tmpV3), step);
      decel = 12;
      if (mv.heavy) action = blend(ID, P.heavyAccent, Math.sin(clamp(t / (mv.windup + 0.3), 0, 1) * Math.PI) * 0.9);
      if (!p.whoosh && t >= mv.strike[0]) { p.whoosh = true; sfx(mv.heavy ? 'heavyWhoosh' : 'whoosh'); }
      if (t >= mv.strike[0] && t <= mv.strike[1] && !p.hitDone) meleeCheck(mv);
      // chain: queued clicks are a bit faster, holding LMB keeps the natural rhythm
      const chainAt = mv.recover + (mv.dur - mv.recover) * 0.4;
      if (!mv.heavy && t >= chainAt && (p.queued || lmbHeld)) {
        const q = p.queued;
        if (startAttack(mv.next, q ? T.clickSpeed : 1)) break;
      }
      if (t >= mv.dur) {
        endAction(p, 0.35);
        p.combo = mv.heavy || mv.finisher ? 'l1' : mv.next;
        p.comboTimer = 0.5;
        p.clicked = false;
      }
      // the shield can come up once the blade has passed
      if (rmb && t > mv.recover + (mv.dur - mv.recover) * 0.5) endAction(p, 0.25);
      break;
    }
    case 'roll': {
      const n = p.t / p.dur;
      const sp = 5.2 * (1 - smooth(0.45, 1, n) * 0.85);
      ch.position.addScaledVector(p.dashDir, sp * dt);
      p.vel.copy(p.dashDir).multiplyScalar(sp * 0.6);
      faceYaw = yawOf(p.dashDir); turnRate = 20;
      p.iframe = p.t > RH.rollIF[0] && p.t < RH.rollIF[1];
      tuck = Math.sin(Math.min(1, n * 1.25) * Math.PI);
      const e = n < 0.8 ? n / 0.8 : 1;
      ch.setPivot((e * e * (3 - 2 * e)) * Math.PI * 2, 0, 0.55, -0.22 * tuck);
      if (n >= 1) { p.state = 'free'; ch.setPivot(0, 0, 0.9); }
      break;
    }
    case 'dodge': {
      const n = p.t / p.dur;
      ch.position.addScaledVector(p.dashDir, 6.2 * Math.pow(Math.max(0, 1 - n), 1.6) * dt);
      p.iframe = p.t > RH.dodgeIF[0] && p.t < RH.dodgeIF[1];
      const local = ang(yawOf(p.dashDir) - ch.yaw);
      const lean = Math.sin(Math.min(1, n * 1.4) * Math.PI) * 0.3;
      ch.setPivot(-Math.cos(local) * lean, Math.sin(local) * lean, 0.0, Math.sin(n * Math.PI) * 0.06);
      p.vel.set(0, 0, 0);
      if (n >= 1) p.state = 'free';
      break;
    }
    case 'jump': {
      // Jump clip: crouch (0.30 -> 0.52 s), flight (0.52 -> 1.06 s) synced to the physics, landing (1.06 -> 1.6 s)
      if (p.jumpPhase === 'prep') {
        ch.setTime(p.h, 0.3 + 0.22 * Math.min(1, p.t / HERO_JUMP.prep));
        if (p.t >= HERO_JUMP.prep) { p.jumpPhase = 'air'; p.vy = T.jumpV; p.grounded = false; p.airT = 0; sfx('jump'); }
        decel = 6;
      } else if (p.jumpPhase === 'air') {
        p.airT += dt;
        const flight = (2 * T.jumpV) / T.gravity;
        ch.setTime(p.h, 0.52 + 0.54 * Math.min(1, p.airT / flight));
        accel = 0; decel = 0; desired.copy(p.vel);
      } else {
        ch.setTime(p.h, 1.06 + 0.54 * Math.min(1, p.t / HERO_JUMP.land));
        decel = 14;
        if (p.t >= HERO_JUMP.land) endAction(p, 0.25);
      }
      break;
    }
    case 'recoil': { // blocked hit: pushed back on the shield
      const n = p.t / p.dur;
      ch.position.addScaledVector(p.dashDir, p.knock * (1 - n) * dt);
      p.vel.set(0, 0, 0);
      if (n >= 1) p.state = 'free';
      break;
    }
    case 'hurt': { // full hit reaction from the Hit clip
      const n = p.t / p.dur;
      ch.setTime(p.h, warp([[0, 0], [0.12, 0.12, 'out'], [p.dur, 1.1, 'io']], p.t));
      ch.position.addScaledVector(p.dashDir, p.knock * Math.pow(1 - n, 2) * dt);
      p.vel.set(0, 0, 0);
      if (n >= 1) endAction(p, 0.3);
      break;
    }
    case 'grabbed': { // hanging from the Leshy's hand; the Leshy places the body (see updateEnemy)
      p.iframe = true; p.vel.set(0, 0, 0); p.grounded = false; p.vy = 0;
      if (hit('LMB', 'KeyJ', 'Space', 'KeyC')) { p.mash++; p.ch.flash(0.04); sfx('grab'); }
      break;
    }
    case 'thrown': { // ballistic flight with a backward tumble, ends lying on the back
      p.iframe = true;
      p.vy -= T.gravity * dt;
      ch.position.addScaledVector(p.vel, dt);
      ch.position.y += p.vy * dt;
      const u = clamp(p.t / p.flight, 0, 1);
      if (!p.soft) ch.setPivot(-p.spinTotal * smooth(0, 1, u), 0, 0.95);
      else ch.setPivot(-0.4 * Math.sin(u * Math.PI), 0, 0.95);
      if (ch.position.y <= 0) {
        ch.position.y = 0; p.grounded = true; p.vy = 0;
        ch.setPivot(0, 0, 0.9);
        if (p.soft) { p.state = 'recoil'; p.t = 0; p.dur = 0.4; p.knock = 1.5; p.dashDir.copy(p.vel).setY(0).normalize(); p.recoilW = 1; sfx('land'); break; }
        landFromThrow(p);
      }
      break;
    }
    case 'down': { // on the back (Death clip around ground contact), then the same clip reversed to stand up
      p.iframe = true;
      const k = Math.exp(-dt * 5);
      p.vel.multiplyScalar(k);
      ch.position.addScaledVector(p.vel, dt);
      const D = p.downKeys;
      ch.setTime(p.h, warp(D, p.t));
      if (p.t >= D[D.length - 1][0]) { endAction(p, 0.35); p.hurtT = 0; }
      break;
    }
    case 'dead': {
      ch.setTime(p.h, Math.min(2.99, p.t));
      p.vel.multiplyScalar(0.9);
      break;
    }
  }

  // --- inertia: velocity chases the desired velocity with limited acceleration / braking
  if (p.state === 'free' || p.state === 'attack' || p.state === 'jump') {
    const diff = tmpV3.subVectors(desired, p.vel);
    const a = desired.lengthSq() > p.vel.lengthSq() + 0.01 ? accel : decel;
    const maxStep = a * dt;
    if (diff.length() > maxStep) diff.setLength(maxStep);
    p.vel.add(diff);
    if (p.state === 'attack') p.vel.multiplyScalar(Math.exp(-dt * 6));
    ch.position.addScaledVector(p.vel, dt);
    // body leans into acceleration and turns (felt weight)
    const fwdV = fwd(ch.yaw, tmpV2);
    const accF = diff.dot(fwdV) / Math.max(dt, 1e-3);
    const sideV = p.vel.x * Math.cos(ch.yaw) - p.vel.z * Math.sin(ch.yaw);
    p.lean.x += (clamp(accF * 1.4, -10, 10) - p.lean.x) * (1 - Math.exp(-dt * 6));
    p.lean.y += (clamp(sideV * (faceYaw != null ? ang(faceYaw - ch.yaw) : 0) * 6, -9, 9) - p.lean.y) * (1 - Math.exp(-dt * 5));
  }
  const groundSpeed = p.state === 'free' ? p.vel.length() : 0;
  if (p.state === 'free') {
    const backNow = p.vel.dot(fwd(ch.yaw, tmpV2)) < -0.2;
    ch.setSpeed(p.grounded ? groundSpeed : 0, backNow);
  } else ch.setSpeed(0);

  // --- vertical
  if (p.state === 'grabbed' || p.state === 'thrown') { /* placed by the Leshy / own ballistic step */ }
  else if (p.grounded) ch.position.y = 0;
  else {
    p.vy -= T.gravity * dt;
    ch.position.y += p.vy * dt;
    if (ch.position.y <= 0) {
      ch.position.y = 0; p.vy = 0; p.grounded = true; sfx('land');
      if (p.state === 'jump') { p.jumpPhase = 'land'; p.t = 0; }
    }
  }

  if (faceYaw != null) ch.yaw = turnTo(ch.yaw, faceYaw, dt * turnRate);

  if (p.state !== 'grabbed') separate(ch.position, enemy.ch.position, T.playerR + T.enemyR, enemy.dead ? 0.5 : 1);
  const rr = Math.hypot(ch.position.x, ch.position.z);
  if (rr > T.arena - 0.5) ch.position.multiplyScalar((T.arena - 0.5) / rr);

  // --- compose procedural pose
  p.tiredW += ((p.exhausted && p.state === 'free' ? 1 : 0) - p.tiredW) * (1 - Math.exp(-dt * 4));
  let rot;
  const clipW = ch.oneShotWeight;
  if (p.state === 'dead' || p.state === 'down') rot = null;
  else if (p.state === 'grabbed' || (p.state === 'thrown' && !p.soft)) {
    // dangling: legs kick, the free arm pushes at the claw, sword arm flails
    const w = game.time * 9;
    rot = pose({ Spine: [-10 + Math.sin(w) * 4, 0, Math.sin(w * 0.7) * 5], Neck: [-18, 0, 0],
      LeftArm: [-120, -10, 30], LeftForeArm: [-40, 0, 0], RightArm: [-30 + Math.sin(w * 1.3) * 25, 0, -60], RightForeArm: [-30, 0, 0],
      RightUpLeg: [-25 + Math.sin(w) * 22, 0, 0], RightLeg: [45 + Math.sin(w) * 15, 0, 0], LeftUpLeg: [-15 - Math.sin(w) * 22, 0, 0], LeftLeg: [35 - Math.sin(w) * 15, 0, 0] });
    if (p.state === 'thrown') stack(rot, P.tuck, 0.35);
  } else {
    rot = blend(G_, P.block, p.blockW);
    if (p.parryW > 0.01) rot = blend(rot, P.parry, p.parryW);
    // the guard pose fades out while a clip (swing, jump, hit) drives the arms
    rot = blend(rot, ID, clipW);
    if (action) stack(rot, action, 1);
    if (tuck > 0) stack(rot, P.tuck, tuck);
    if (p.hitW > 0) stack(rot, P.hit, p.hitW);
    if (p.recoilW > 0) stack(rot, P.recoil, p.recoilW);
    if (p.tiredW > 0.01) stack(rot, P.tired, p.tiredW);
    if (p.state === 'free') stack(rot, pose({ Spine: [p.lean.x, 0, -p.lean.y], Spine1: [p.lean.x * 0.5, 0, 0] }), 1);
  }
  ch.update(dt, rot);
  updateWeapons(dt);
  updateHeroAura(dt);
}
const G_ = P.guard;
const FIN_POSE = {
  crouch: pose({ Spine: [14, 0, 0], RightUpLeg: [-55, 0, 0], RightLeg: [85, 0, 0], LeftUpLeg: [-45, 0, 0], LeftLeg: [80, 0, 0] }),
  tuck: pose({ RightUpLeg: [-80, 0, 0], RightLeg: [95, 0, 0], LeftUpLeg: [-35, 0, 0], LeftLeg: [70, 0, 0] }),
};

function separate(a, b, minD, share) {
  const dx = a.x - b.x, dz = a.z - b.z;
  const d = Math.hypot(dx, dz);
  if (d < minD && d > 1e-4) {
    const push = (minD - d) * share;
    a.x += (dx / d) * push; a.z += (dz / d) * push;
  }
}

// Hero aura: on while stamina is above 50% (with a short debounce so it does not flicker at the edge)
function updateHeroAura(dt) {
  const p = player;
  p.auraToggleT -= dt;
  const want = !p.dead && p.st > T.auraOn;
  if (want !== p.auraOn && p.auraToggleT <= 0) {
    p.auraOn = want; p.auraToggleT = 0.35;
    if (want) heroAura.appear(); else heroAura.disappear();
  }
}

// ---------------------------------------------------------------- weapons
const blade = { base: new THREE.Vector3(), tip: new THREE.Vector3(), pBase: new THREE.Vector3(), pTip: new THREE.Vector3() };
const shieldPos = (out = new THREE.Vector3()) => out.copy(shield.position);
const shieldMats = [];
shield.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (!shieldMats.includes(m)) { m.emissive = new THREE.Color(0); shieldMats.push(m); } });
function shieldGlow(w) { for (const m of shieldMats) m.emissive.setRGB(0.2 * w, 0.12 * w, 0.02 * w); }

const GROUND_BONES = ['Head', 'Hips', 'Spine2', 'LeftHand', 'RightHand', 'LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];
const _gc = new THREE.Vector3();
function groundClamp(ch) {
  let lo = 9;
  for (const n of GROUND_BONES) lo = Math.min(lo, ch.worldBone(n, _gc).y - (n === 'Head' ? 0.1 : n === 'Hips' || n === 'Spine2' ? 0.13 : 0.05));
  // shield rim
  const sn = _gc.set(0, 1, 0).applyQuaternion(shield.quaternion);
  lo = Math.min(lo, shield.position.y - 0.35 * Math.sqrt(Math.max(0, 1 - sn.y * sn.y)));
  if (lo < 0) {
    const d = -lo;
    ch.group.position.y += d; ch.group.updateMatrixWorld(true);
    sword.position.y += d; shield.position.y += d; blade.base.y += d; blade.tip.y += d;
  }
}
function updateWeapons(dt = 0) {
  blade.pBase.copy(blade.base); blade.pTip.copy(blade.tip);
  const p = player;
  // rolls and tumbles: the blade is tucked along the forearm
  const stowWant = p.state === 'roll' || (p.state === 'thrown' && !p.soft) ? 1 : 0;
  weaponRig.stow += (stowWant - weaponRig.stow) * (dt > 0 ? 1 - Math.exp(-dt * 14) : 1);
  weaponRig.update(blade);
  // body ground contact: in a roll / on the ground nothing (body, shield) may sink below the surface
  if (['roll', 'dodge', 'down', 'dead', 'hurt'].includes(p.state)) groundClamp(p.ch);
  const mv = player.move;
  const swinging = (player.state === 'attack' && mv && player.t > mv.strike[0] - 0.06 && player.t < mv.strike[1] + 0.08) || (player.state === 'finisher' && (game.finState?.hero.trail || 0) > 0.5);
  trail.push(blade.base, blade.tip, swinging, dt);
}

// capsule test against Leshy (vertical axis)
function pointVsEnemy(pos, extra = 0) {
  const e = enemy.ch.position;
  const h = Math.hypot(pos.x - e.x, pos.z - e.z);
  return h < T.enemyR + extra && pos.y > e.y + 0.15 && pos.y < e.y + T.leshy.height - 0.05;
}

const _hb = new THREE.Vector3(), _ht = new THREE.Vector3();
function meleeCheck(mv) {
  for (let i = 1; i <= 4; i++) {
    const k = i / 4;
    _hb.lerpVectors(blade.pBase, blade.base, k);
    _ht.lerpVectors(blade.pTip, blade.tip, k);
    for (let j = 0; j <= 6; j++) {
      tmpV.lerpVectors(_hb, _ht, j / 6);
      if (pointVsEnemy(tmpV, 0.08)) {
        player.hitDone = true;
        damageEnemy(mv.dmg, tmpV.clone(), mv.poise, mv.heavy);
        if (mv.finisher || mv.heavy) cinematic(0.55, 0.32, mv.heavy ? 6 : 4.5, 0.75);
        return;
      }
    }
  }
}

// push direction of a sword hit: from the hero into the Leshy, bent by the blade's sweep
function bladePush(out = new THREE.Vector3()) {
  out.subVectors(enemy.ch.position, player.ch.position).setY(0).normalize();
  const sweep = tmpV3.subVectors(blade.tip, blade.pTip).setY(0);
  if (sweep.lengthSq() > 1e-6) out.addScaledVector(sweep.normalize(), 0.8).normalize();
  return out;
}
function reactEnemy(at, dir, power) {
  const e = enemy;
  leshyReact.hit(toLocal(e.ch.position, e.ch.yaw, at), dirToLocal(e.ch.yaw, dir), power, T.leshy.height);
  debris.spawn(at, dir, Math.min(1, power));
  debris.wound(e.ch, at, dir);
}
function damageEnemy(dmg, at, poise, heavy) {
  if (enemy.dead) return;
  // окно оглушения и «открытый» Леший: урон и сбив стойкости выше
  const open = isOpen(enemy);
  if (enemy.state === 'stagger') dmg *= RH.stunDmg;
  else if (open) { dmg *= RH.openDmg; poise *= RH.openPoise; rhud.stats.open++; }
  enemy.hp = Math.max(0, enemy.hp - dmg);
  enemy.ch.flash(0.08);
  {
    // armoured supers shrug most of it off; otherwise the whole body rocks with the blow
    const armored = enemy.state === 'attack' && enemy.move?.armor;
    reactEnemy(at, bladePush(), (heavy ? 1 : 0.5) * (armored ? 0.4 : 1));
  }
  burst(at, 0xd8ffa0, heavy ? 26 : 16, heavy ? 6 : 5);
  sfx(heavy ? 'heavyHit' : 'hit');
  game.hitstop = heavy ? 0.11 : 0.075;
  game.shake = Math.max(game.shake, heavy ? 0.22 : 0.12);
  enemy.poise += poise;
  if (enemy.hp <= 0) { killEnemy(); return; }
  if (!enemy.phase2 && enemy.hp <= T.leshy.hp * T.phase2 && enemy.state !== 'attack') { enemyStartMove('roar'); return; }
  if (enemy.state === 'stagger' || enemy.state === 'roar') return;
  const superArmor = enemy.state === 'attack' && enemy.move?.armor && !open;
  if (enemy.poise >= RH.poiseMax && enemy.armorT <= 0 && !superArmor) { enemy.poise = 0; enemyStagger(); }
  else if (enemy.state !== 'attack') { enemy.flinchT = 0.45; enemy.cooldown = Math.min(enemy.cooldown, 0.5); }
}

// ---------------------------------------------------------------- Leshy
// Each move: dur, start(e), step(e, t, dt) -> optional pose, end(e). Telegraph: red glow = blockable, orange = unblockable.
const CLAW_KEYS = [[0, 0], [0.9, 0.52, 'io'], [1.2, 0.6, 'in'], [1.36, 0.82, 'lin'], [2.25, 1.333, 'out']];
const PICK_KEYS = [[0, 0], [0.75, 0.62, 'io'], [1.25, 1.25, 'io'], [1.85, 2.0, 'out']];
const JUMP_KEYS = { prep: 1.05, air: 0.95, land: 0.95 };

const EM = {
  claw: {
    dur: 2.25, glow: 'red', blockable: true, dmg: 20,
    start(e) { e.h = e.ch.play('Attack', 0.3); e.clawInit = false; },
    step(e, t, dt) {
      e.ch.setTime(e.h, warp(CLAW_KEYS, t));
      if (t < 0.9) trackPlayer(e, dt, 1.4);
      stepForward(e, t, 0.55, 1.36, 1.3);
      if (t >= 1.18 && t <= 1.4) clawSweep(e, 'Right', this);
    },
    end(e) { e.ch.stop(e.h, 0.4); },
  },
  backhand: {
    dur: 1.7, glow: 'red', blockable: true, dmg: 18,
    start(e) { e.clawInit = false; },
    step(e, t, dt) {
      if (t < 0.75) trackPlayer(e, dt, 1.3);
      stepForward(e, t, 0.5, 1.2, 0.8);
      if (t >= 0.82 && t <= 1.25) clawSweep(e, 'Left', this);
      return E.backhand.sample(t / this.dur);
    },
  },
  throw: {
    dur: 2.95, glow: null, kind: 'rot',
    start(e) { e.h = e.ch.play('PickUp', 0.3); e.thrown = false; },
    step(e, t, dt) {
      trackPlayer(e, dt, t < 2.0 ? 1.8 : 0.4);
      if (t < 1.85) e.ch.setTime(e.h, warp(PICK_KEYS, t));
      if (t >= 1.85 && e.h) { e.ch.stop(e.h, 0.35); e.h = null; }
      if (t >= 1.15 && !e.held) { e.held = makeThrowable(this.kind); scene.add(e.held); sfx('grab'); }
      // cock the arm while rising, whip forward, recover
      let rot;
      if (t < 1.35) rot = ID;
      else if (t < 2.05) rot = blend(ID, E.throwBack, smooth(1.35, 2.0, t));
      else if (t < 2.3) rot = blend(E.throwBack, E.throwFwd, smooth(2.05, 2.25, t));
      else rot = blend(E.throwFwd, ID, smooth(2.3, 2.95, t));
      if (!e.thrown && t >= 2.17) { e.thrown = true; releaseThrow(e, this.kind, 1); }
      return rot;
    },
    end(e) { if (e.h) e.ch.stop(e.h, 0.3); if (e.held) { disposeObj(e.held); e.held = null; } },
  },
  // SUPER: a volley of three swamp-fire pods (aura)
  volley: {
    dur: 2.95, glow: 'orange', super: true, kind: 'wisp', armor: true,
    start(e) { EM.throw.start(e); },
    step(e, t, dt) { return EM.throw.step.call(this, e, t, dt); },
    end(e) { EM.throw.end(e); },
  },
  // SUPER: leap onto the hero, ground blast on landing (unblockable)
  leap: {
    dur: JUMP_KEYS.prep + JUMP_KEYS.air + JUMP_KEYS.land, glow: 'orange', super: true, armor: true,
    start(e) { e.h = e.ch.play('Jump', 0.3); e.leapPhase = 'prep'; e.landed = false; },
    step(e, t, dt) {
      const J = JUMP_KEYS;
      if (t < J.prep) {
        e.ch.setTime(e.h, 0.52 * smooth(0, 1, t / J.prep));
        trackPlayer(e, dt, 2.2);
        if (t > J.prep - 0.45 && !e.leapTarget) {
          // pick the landing spot a little ahead of where the hero is going; show it on the ground
          const pp = player.ch.position;
          const tgt = new THREE.Vector3(pp.x, 0, pp.z).addScaledVector(player.vel, 0.35);
          const from = e.ch.position.clone();
          const d = tgt.clone().sub(from).setY(0);
          const len = d.length();
          if (len > 10) tgt.copy(from).addScaledVector(d, 10 / len);
          e.leapFrom = from; e.leapTarget = tgt;
          marker(tgt, BOOM.leap.r, 0.45 + J.air, 0xff7a1a);
        }
      } else if (t < J.prep + J.air) {
        const u = (t - J.prep) / J.air;
        e.ch.setTime(e.h, 0.52 + 0.54 * u);
        e.ch.position.lerpVectors(e.leapFrom, e.leapTarget, smooth(0, 1, u));
        e.ch.position.y = Math.sin(u * Math.PI) * 2.4;
        e.ch.yaw = turnTo(e.ch.yaw, yawOf(tmpV.subVectors(e.leapTarget, e.leapFrom)), dt * 4);
      } else {
        if (!e.landed) {
          e.landed = true; e.ch.position.y = 0;
          explode(e.leapTarget, 'leap');
          cinematic(0.6, 0.45, 7, 1.0);
        }
        e.ch.setTime(e.h, 1.06 + 0.54 * smooth(0, 1, (t - J.prep - J.air) / J.land));
      }
    },
    end(e) { e.ch.stop(e.h, 0.35); e.leapTarget = null; e.ch.position.y = 0; },
  },
  // SUPER: slams the ground, roots erupt in a line towards the hero (unblockable, sidestep it)
  roots: {
    dur: 2.6, glow: 'orange', super: true, armor: true,
    start(e) {
      const dir = tmpV.subVectors(player.ch.position, e.ch.position).setY(0).normalize();
      e.rootDir = dir.clone();
      const n = e.phase2 ? 7 : 6;
      for (let i = 0; i < n; i++) {
        const at = e.ch.position.clone().setY(0).addScaledVector(dir, 2.0 + i * 1.75);
        if (Math.hypot(at.x, at.z) > T.arena - 0.5) break;
        const when = 1.32 + i * 0.17;
        marker(at, BOOM.root.r, when, 0xff7a1a);
        hazards.push({ at, when, t: 0, kind: 'root' });
      }
    },
    step(e, t, dt) {
      if (t < 0.6) e.ch.yaw = turnTo(e.ch.yaw, yawOf(e.rootDir), dt * 2);
      if (!e.slammed && t >= 1.3) { e.slammed = true; sfx('slam'); game.shake = Math.max(game.shake, 0.3); cinematic(0.6, 0.5, 6, 1.0); }
      return E.slam.sample(t / this.dur);
    },
    end(e) { e.slammed = false; },
  },
  // SUPER: grab. Lunges with both claws (unblockable, roll away); on a catch lifts the hero overhead,
  // shakes him (mash to break free), winds up and hurls him. A miss leaves a long, punishable recovery.
  grab: {
    dur: 2.5, glow: 'orange', super: true, armor: true,
    start(e) { e.grabbed = false; e.grabWhiff = false; e.grabT = 0; e.dur = 2.5; e.released = false; e.roaredAt = false; },
    step(e, t, dt) {
      const p = player;
      if (!e.grabbed) {
        if (t < 0.85) trackPlayer(e, dt, 2.0);
        stepForward(e, t, 0.75, 1.25, 1.9);
        if (t >= 0.95 && t <= 1.35 && p.iframe && (p.state === 'dodge' || p.state === 'roll') && !p.perfectUsed && p.t < RH.perfect && enemyDist() < 2.8) perfectEvade();
        if (t >= 0.95 && t <= 1.35 && !e.grabWhiff && !p.iframe && !p.dead && p.ch.position.y < 0.8 && ['free', 'attack', 'recoil', 'hurt', 'jump'].includes(p.state)) {
          const hl = e.ch.worldBone('LeftHand', tmpV), hr = e.ch.worldBone('RightHand', tmpV2);
          const mx = (hl.x + hr.x) / 2, mz = (hl.z + hr.z) / 2;
          const toP = yawOf(tmpV3.subVectors(p.ch.position, e.ch.position));
          const dh = Math.hypot(p.ch.position.x - mx, p.ch.position.z - mz);
          if (dh < T.playerR + 0.6 || (enemyDist() < 1.8 && Math.abs(ang(toP - e.ch.yaw)) < 0.6)) {
            e.grabbed = true; e.grabT = t; e.dur = t + 3.1; grabHero(e);
          }
        }
        if (t < 0.85) return blend(ID, E.grabPrep, smooth(0, 0.8, t));
        if (t < 1.3) return blend(E.grabPrep, E.grabReach, smooth(0.85, 1.1, t));
        return blend(E.grabReach, ID, smooth(1.5, 2.5, t)); // whiff: off balance, slow to recover
      }
      // --- holding: lift to the face, glare and roar into it, then heave overhead and hurl
      const g = t - e.grabT;
      let rot;
      if (g < 0.55) rot = blend(E.grabReach, E.grabFace, smooth(0, 0.55, g));
      else if (g < 1.55) {
        rot = blend(E.grabFace, E.grabFace, 0);
        // the roar: head thrust at the hero, then a slow pull back
        const r = smooth(0.72, 0.85, g) * (1 - smooth(1.15, 1.5, g));
        if (r > 0) stack(rot, E.grabRoar, r);
        stack(rot, pose({ Spine: [0, Math.sin(g * 9) * 4, 0], RightArm: [Math.sin(g * 12) * 6, 0, Math.sin(g * 7) * 3] }), 1);
        if (!e.roaredAt && g >= 0.74) { e.roaredAt = true; sfx('roar'); game.shake = Math.max(game.shake, 0.18); zoomPunch(3, 0.6); }
      }
      else if (g < 2.25) rot = blend(E.grabFace, E.throwBack, smooth(1.55, 2.2, g));
      else if (g < 2.45) rot = blend(E.throwBack, E.throwFwd, smooth(2.25, 2.42, g));
      else rot = blend(E.throwFwd, ID, smooth(2.45, 3.1, g));
      if (g > 1.7 && g < 2.3) trackPlayer(e, dt, 0.8);
      if (!e.released) {
        if (p.dead) e.released = true;
        else if (p.mash >= T.grab.mash && g < 1.95) { e.released = true; releaseHero(e, false); p.spend(15); enemyStaggerLater(); }
        else if (g >= 2.36) { e.released = true; releaseHero(e, true); }
      }
      return rot;
    },
    end(e) {
      if (player.state === 'grabbed') releaseHero(e, false);
      e.grabbed = false; e.dur = null;
    },
  },
  // Finale: roar, the aura flares up and stays
  roar: {
    dur: 2.4, glow: 'green', armor: true,
    start(e) { e.phase = 2; leshyAura.appear('burst'); leshyAura.transitionTo(LESHY_AURA_FINAL, 1.4); toast('Леший в ярости', 1.6); e.roared = false; },
    step(e, t, dt) {
      if (!e.roared && t >= 0.75) {
        e.roared = true; sfx('roar'); cinematic(0.6, 0.5, 7, 1.2);
        explode(e.ch.position.clone().setY(0), 'roar');
        // shock wave pushes the hero back (no damage)
        const d = enemyDist();
        if (d < 5 && !player.dead) {
          const dir = tmpV.subVectors(player.ch.position, e.ch.position).setY(0).normalize();
          if (player.state !== 'hurt') { player.state = 'recoil'; player.t = 0; player.dur = 0.5; player.knock = 6; player.dashDir.copy(dir); player.recoilW = 1; if (player.h) { player.ch.stop(player.h, 0.15); player.h = null; } }
        }
        game.shake = Math.max(game.shake, 0.4);
      }
      return E.roar.sample(t / this.dur);
    },
  },
};

function trackPlayer(e, dt, rate) {
  const yawP = yawOf(tmpV.subVectors(player.ch.position, e.ch.position));
  e.ch.yaw = turnTo(e.ch.yaw, yawP, dt * rate);
}
// root-motion-like step forward between t0 and t1 (distance d), stops short of the hero
function stepForward(e, t, t0, t1, d) {
  const k = smooth(t0, t1, t);
  const stepD = (k - (e.stepDone || 0)) * d;
  e.stepDone = k;
  if (enemyDist() > T.playerR + T.enemyR + 0.25) e.ch.position.addScaledVector(fwd(e.ch.yaw, tmpV3), stepD);
}

const _claw = new THREE.Vector3(), _fa = new THREE.Vector3();
// The claw is the hand plus the long twig fingers beyond it; its path between frames is tested against the hero.
function clawSweep(e, side, mv) {
  e.ch.worldBone(side + 'ForeArm', _fa);
  e.ch.worldBone(side + 'Hand', _claw);
  _claw.addScaledVector(tmpV.subVectors(_claw, _fa), 0.7);
  if (!e.clawInit) { e.prevClaw.copy(_claw); e.clawInit = true; return; }
  if (!e.hitDone && !player.dead) {
    const pp = player.ch.position;
    for (let i = 0; i <= 5; i++) {
      tmpV2.lerpVectors(e.prevClaw, _claw, i / 5);
      const hd = Math.hypot(tmpV2.x - pp.x, tmpV2.z - pp.z);
      if (hd < T.playerR + 0.5 && tmpV2.y > pp.y - 0.1 && tmpV2.y < pp.y + T.hero.height + 0.2) {
        e.hitDone = true;
        hitPlayer({ dmg: mv.dmg * (e.phase2 ? 1.15 : 1), blockable: mv.blockable, from: e.ch.position, kind: 'claw' });
        break;
      }
    }
  }
  e.prevClaw.copy(_claw);
}

function enemyStartMove(name) {
  const e = enemy, mv = EM[name];
  if (e.move?.end && e.state === 'attack') e.move.end(e);
  e.state = name === 'roar' ? 'roar' : 'attack';
  e.move = mv; e.moveName = name; e.t = 0; e.hitDone = false; e.stepDone = 0; e.glinted = false;
  e.speedMul = e.phase2 && name !== 'roar' ? 1.12 : 1;
  e.dur = null;
  e.ch.stopAll(0.3); e.h = null;
  mv.start?.call(mv, e);
  if (mv.super && !e.phase2) leshyAura.appear();
  if (mv.super) toast({ leap: 'Прыжок Лешего!', roots: 'Корни!', volley: 'Болотные огни!', grab: 'Захват!' }[name], 1.0);
  e.next = name === 'claw' && Math.random() < (train.mode === 'claw' ? 0.5 : e.phase2 ? 0.55 : 0.35) ? 'backhand' : null;
}
function enemyEndMove() {
  const e = enemy, mv = e.move;
  mv?.end?.call(mv, e);
  e.ch.setGlow(0, 0);
  if (mv?.super && !e.phase2) leshyAura.disappear();
  e.move = null;
  if (e.staggerAfter) { e.staggerAfter = false; toast('Леший оглушён', 0.8); enemyStagger(); return; }
  if (!e.phase2 && !e.dead && e.hp <= T.leshy.hp * T.phase2) { enemyStartMove('roar'); return; }
  if (e.next && !player.dead) { const n = e.next; e.next = null; enemyStartMove(n); return; }
  e.state = 'chase';
  e.cooldown = e.phase2 ? rand(0.5, 1.2) : rand(0.9, 1.7);
}
function enemyStaggerLater() { enemy.staggerAfter = true; enemy.t = Math.max(enemy.t, (enemy.dur ?? 0) - 0.01); }
function enemyStagger(dur) {
  const e = enemy;
  e.stunDur = dur ?? T.staggerDur;
  if (e.state === 'attack') { e.move?.end?.call(e.move, e); if (e.move?.super && !e.phase2) leshyAura.disappear(); }
  e.state = 'stagger'; e.t = 0; e.move = null; e.next = null;
  e.h = e.ch.play('Hit', 0.12);
  e.armorT = 6; // no stun-lock: poise immunity after a stagger
  e.finishedThisStun = false;
  e.ch.setGlow(0, 0);
}
function killEnemy() {
  const e = enemy;
  if (e.state === 'attack') e.move?.end?.call(e.move, e);
  e.dead = true; e.state = 'dead'; e.t = 0; e.move = null;
  e.h = e.ch.play('Death', 0.2);
  e.ch.setGlow(0, 0);
  // the finale: the aura flares one last time and dissolves with him
  leshyAura.appear('burst');
  leshyAura.transitionTo({ ...LESHY_AURA_FINAL, scale: 1.8, glow: 2 }, 0.8);
  setTimeout(() => leshyAura.disappear('dissolve'), 1800);
  game.over = true;
  game.slowmo = 1.4;
  game.lockOn = false;
  toast('Леший повержен', 2);
  setTimeout(() => showEnd('Победа'), 2600);
}

function updateEnemy(dt) {
  const e = enemy, ch = e.ch, pp = player.ch.position;
  e.t += dt * (e.state === 'attack' ? e.speedMul || 1 : 1);
  e.flinchT = Math.max(0, e.flinchT - dt);
  e.armorT = Math.max(0, e.armorT - dt);
  e.superCd -= dt;
  e.poise = Math.max(0, e.poise - dt * 7);
  const toP = tmpV.subVectors(pp, ch.position).setY(0);
  const dist = toP.length();
  const yawP = yawOf(toP);
  let rot = null, speed = 0;
  ch.setPivot(0, 0, 1.6);

  switch (e.state) {
    case 'intro':
      e.timer -= dt;
      ch.yaw = turnTo(ch.yaw, yawP, dt * 1.2);
      if (e.timer <= 0) e.state = 'chase';
      break;
    case 'chase': {
      if (player.dead) break;
      ch.yaw = turnTo(ch.yaw, yawP, dt * T.leshy.turn);
      e.cooldown -= dt;
      const facing = Math.abs(ang(yawP - ch.yaw)) < 0.45;
      // keep closing in; far away he prefers throwing
      if (dist > 2.3) speed = T.leshy.walk * (dist > 8 ? 1.25 : 1) * (e.phase2 ? 1.15 : 1);
      if (e.cooldown <= 0 && facing) {
        const r = Math.random();
        const superReady = e.superCd <= 0;
        let pick = null;
        if (train.mode === 'claw') pick = dist < 3.0 ? 'claw' : null;
        else if (train.mode === 'super') {
          const q = Math.random();
          pick = dist < 3.0 ? (q < 0.55 ? 'grab' : 'roots') : dist < 9 ? (q < 0.45 ? 'leap' : q < 0.75 ? 'roots' : 'volley') : 'volley';
        }
        else if (dist < 3.0) {
          if (superReady && (player.blocking || r < 0.3)) pick = 'grab';
          else if (superReady && r < 0.55) pick = 'roots';
          else pick = 'claw';
        }
        else if (dist < 9) {
          if (superReady && r < 0.45) { const q = Math.random(); pick = q < 0.4 ? 'leap' : q < 0.7 ? 'roots' : 'volley'; }
          else if (r < 0.75 && dist > 4.5) pick = 'throw';
        } else pick = superReady && r < 0.5 ? 'volley' : 'throw';
        if (pick) {
          if (EM[pick].super && train.mode !== 'super') e.superCd = e.phase2 ? rand(5.5, 8) : rand(9, 13);
          enemyStartMove(pick);
          break;
        }
        e.cooldown = 0.35;
      }
      break;
    }
    case 'attack':
    case 'roar': {
      const mv = e.move;
      rot = mv.step?.call(mv, e, e.t, dt) || null;
      // telegraph glow ramps up through the wind-up
      const tele = mv.glow ? Math.min(1, e.t / Math.min(1.1, mv.dur * 0.45)) * (e.t < mv.dur * 0.65 ? 1 : 0) : 0;
      const pulse = 0.75 + 0.25 * Math.sin(e.t * 18);
      ch.setGlow(mv.glow === 'orange' ? 0xa040ff : mv.glow === 'green' ? 0x60ff60 : 0xff2010, tele * pulse * (mv.glow === 'red' ? 0.09 : 0.12));
      // блик на когтях перед самым ударом (всегда): подсказка момента для щита или уклона
      const hitAt = RH.hitAt[e.moveName];
      if (hitAt != null && !e.glinted && e.t >= hitAt - RH.glintLead && !(e.moveName === 'grab' && e.grabbed)) {
        e.glinted = true;
        const bones = e.moveName === 'backhand' ? ['LeftHand'] : e.moveName === 'claw' ? ['RightHand'] : e.moveName === 'leap' ? [] : ['LeftHand', 'RightHand'];
        for (const b of bones) burst(e.ch.worldBone(b, new THREE.Vector3()), mv.glow === 'red' ? 0xfff4d0 : 0xe0b0ff, 9, 1.6);
        sfx('glint');
      }
      if (isOpen(e)) ch.setGlow(0xffc040, 0.035);
      if (e.t >= (e.dur ?? mv.dur)) enemyEndMove();
      break;
    }
    case 'stagger': {
      ch.setTime(e.h, warp([[0, 0], [0.15, 0.12, 'out'], [e.stunDur, 1.1, 'io']], e.t));
      ch.setGlow(0xffc040, 0.05 * (0.7 + 0.3 * Math.sin(e.t * 9)));
      if (e.t < 0.4) ch.position.addScaledVector(fwd(ch.yaw, tmpV2), -1.6 * dt);
      if (e.t >= e.stunDur) { ch.stop(e.h, 0.35); e.h = null; e.state = 'chase'; e.cooldown = 0.6; ch.setGlow(0, 0); }
      break;
    }
    case 'dead':
      ch.setTime(e.h, Math.min(2.99, e.t * 0.9));
      break;
    case 'finished': { // held by the finisher scene: drops to one knee, then rises
      const s = game.finState;
      const k = s ? s.victim.kneel : 0;
      rot = blend(ID, E.kneel, Math.min(1, k));
      if (s?.victim.brace > 0) stack(rot, E.brace, s.victim.brace);
      if (s?.victim.push > 0) stack(rot, E.push, s.victim.push);
      // the overshoot (k > 1) only drives the body down: the knee hits and the weight bounces once
      ch.setPivot(0.18 * Math.min(1, k), 0, 1.0, -0.62 * k);
      break;
    }
  }
  // spring-driven hit reaction on top of whatever he is doing (copy: moves may return shared poses)
  rot = leshyReact.apply(rot ? blend(rot, rot, 0) : null, dt);
  if (e.state !== 'dead' && e.state !== 'finished') ch.position.add(leshyReact.slide(dt, ch.yaw, tmpV2));

  // heavy body: walking speed ramps up and down
  e.speed += clamp(speed - e.speed, -T.leshy.accel * 1.6 * dt, T.leshy.accel * dt);
  if (e.speed > 0.01 && e.state === 'chase') ch.position.addScaledVector(fwd(ch.yaw, tmpV2), e.speed * dt);
  if (e.state !== 'chase') e.speed = Math.max(0, e.speed - 4 * dt);
  ch.setSpeed(e.state === 'chase' ? e.speed : 0);

  const rr = Math.hypot(ch.position.x, ch.position.z);
  if (rr > T.arena - 1) { ch.position.x *= (T.arena - 1) / rr; ch.position.z *= (T.arena - 1) / rr; }
  ch.update(dt, rot);
  if (e.held) e.ch.worldBone('RightHand', e.held.position);
  if (player.state === 'grabbed') holdHero(e);
}

// ---------------------------------------------------------------- thrown objects & explosions
function disposeObj(o) { scene.remove(o); o.traverse((c) => { if (c.isMesh) { c.geometry.dispose(); for (const m of [].concat(c.material)) m.dispose(); } }); }
function releaseThrow(e, kind, n) {
  if (e.held) { disposeObj(e.held); e.held = null; }
  sfx('throw');
  if (kind === 'wisp') cinematic(0.6, 0.4, 5.5, 0.9);
  const from = e.ch.worldBone('RightHand', new THREE.Vector3());
  const pp = player.ch.position;
  const count = kind === 'wisp' ? 3 : 1;
  for (let i = 0; i < count; i++) {
    // aim where the hero will be (partial lead), spread the volley sideways
    const flight = (kind === 'wisp' ? 1.15 + i * 0.22 : 1.25) + enemyDist() * 0.025;
    const tgt = new THREE.Vector3(pp.x, 0, pp.z).addScaledVector(player.vel, flight * 0.55);
    if (count > 1) {
      const side = new THREE.Vector3(-(pp.z - e.ch.position.z), 0, pp.x - e.ch.position.x).normalize();
      tgt.addScaledVector(side, (i - 1) * 2.6).addScaledVector(tmpV.subVectors(pp, e.ch.position).setY(0).normalize(), (i === 1 ? 0 : -0.8));
    }
    const rr = Math.hypot(tgt.x, tgt.z);
    if (rr > T.arena - 0.5) tgt.multiplyScalar((T.arena - 0.5) / rr);
    const mesh = makeThrowable(kind);
    mesh.position.copy(from);
    const shadow = makeShadowBlob(1.2);
    scene.add(mesh, shadow);
    const mk = marker(tgt, BOOM[kind].r, flight, kind === 'wisp' ? 0xff6a2a : 0xff3a1a);
    projectiles.push({ kind, mesh, shadow, mk, from: from.clone(), to: tgt, t: 0, flight, apex: 2.2 + enemyDist() * 0.18, spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)) });
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.t += dt;
    const u = Math.min(1, pr.t / pr.flight);
    pr.mesh.position.lerpVectors(pr.from, pr.to, u);
    pr.mesh.position.y = pr.from.y * (1 - u) + 0.25 * u + 4 * pr.apex * u * (1 - u);
    pr.mesh.rotation.x += pr.spin.x * dt; pr.mesh.rotation.y += pr.spin.y * dt; pr.mesh.rotation.z += pr.spin.z * dt;
    // the ground shadow sits under the object, sharper and darker as it comes down
    pr.shadow.position.set(pr.mesh.position.x, 0.035, pr.mesh.position.z);
    const hgt = pr.mesh.position.y;
    pr.shadow.scale.setScalar(0.6 + hgt * 0.18);
    pr.shadow.material.opacity = clamp(1.1 - hgt * 0.12, 0.35, 1);
    if (u >= 1) {
      disposeObj(pr.mesh); disposeObj(pr.shadow);
      explode(pr.to, pr.kind);
      projectiles.splice(i, 1);
    }
  }
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.t += dt;
    if (h.t >= h.when) { explode(h.at, h.kind); hazards.splice(i, 1); }
  }
}

function explode(at, kind) {
  const B = BOOM[kind];
  const pos = new THREE.Vector3(at.x, B.y, at.z);
  smoke.spawn(B.recipe, pos, B.p, { groundY: 0 });
  sfx(kind === 'root' ? 'crack' : 'boom');
  const d = Math.hypot(player.ch.position.x - at.x, player.ch.position.z - at.z);
  game.shake = Math.max(game.shake, clamp(0.5 - d * 0.03, 0.08, 0.45) * (kind === 'root' ? 0.6 : 1));
  if (!B.dmg || player.dead) return;
  if (d < B.r + T.playerR && player.ch.position.y < 1.4) {
    const fall = 1 - 0.5 * clamp(d / B.r, 0, 1);
    hitPlayer({ dmg: B.dmg * fall * (enemy.phase2 ? 1.15 : 1), blockable: kind !== 'leap' && kind !== 'root', from: at, kind: 'blast', blastBlock: true });
  }
}

function hitPlayer({ dmg, blockable, from, kind, blastBlock }) {
  const p = player;
  if (p.dead) return;
  if (p.iframe) {
    if ((p.state === 'dodge' || p.state === 'roll') && !p.perfectUsed && p.t < RH.perfect + (p.state === 'roll' ? RH.rollIF[0] : 0)) perfectEvade();
    return;
  }
  const dirToSrc = yawOf(tmpV2.subVectors(from, p.ch.position));
  const facing = Math.abs(ang(dirToSrc - p.ch.yaw)) < 1.3;
  const knockDir = tmpV3.subVectors(p.ch.position, from).setY(0);
  if (knockDir.lengthSq() < 1e-4) knockDir.copy(fwd(p.ch.yaw)).negate();
  knockDir.normalize();
  if (p.blocking && facing) {
    if (!blockable) { toast('Не блокируется!', 0.8); rhud.feedback('Не блокируется: Q', 'bad'); }
    else if (kind === 'claw' && p.parryT <= p.parryWin) { perfectParry(); return; }
    else if (p.parrying && kind === 'claw') {
      // стойка (удержание ПКМ): отбив без оглушения, сбивает стойкость Лешего
      p.spend(T.cost.parryHit);
      sfx('parry');
      burst(shieldPos(), 0xfff0b0, 18, 5);
      rhud.feedback('Отбив', 'ok'); rhud.stats.deflect++;
      p.state = 'recoil'; p.t = 0; p.dur = 0.3; p.knock = 1.4; p.dashDir.copy(knockDir); p.recoilW = 0.6;
      enemy.poise += RH.deflectPoise;
      if (enemy.poise >= RH.poiseMax && enemy.armorT <= 0) { enemy.poise = 0; enemyStaggerLater(); }
      return;
    } else if (p.st >= T.cost.block * 0.5) {
      if (kind === 'claw' && p.parryT > p.parryWin && p.parryT < p.parryWin + RH.earlyBand) { rhud.feedback('Рано', 'warn'); rhud.stats.early++; }
      // the shield takes it; explosions still singe a little through it
      p.spend(T.cost.block + dmg * 0.4);
      sfx('block');
      burst(shieldPos(), 0xffd890, 14, 4);
      if (p.h) { p.ch.stop(p.h, 0.15); p.h = null; }
      p.state = 'recoil'; p.t = 0; p.dur = 0.45; p.knock = blastBlock ? 4 : 2.4; p.dashDir.copy(knockDir); p.recoilW = 1;
      if (blastBlock) damagePlayer(dmg * 0.3, knockDir, false);
      game.shake = Math.max(game.shake, 0.12);
      return;
    } else toast('Защита пробита', 0.8);
  }
  if (kind === 'claw') p.lastClawHit = game.time;
  rhud.stats.taken++;
  // heavy swing with armor keeps going, but still takes the damage
  if (p.state === 'attack' && p.move?.armor && p.t > p.move.windup * 0.5 && p.t < p.move.recover && kind === 'claw') { damagePlayer(dmg * 0.8, knockDir, false); return; }
  damagePlayer(dmg, knockDir, true, kind === 'blast' ? 1.05 : 0.9, kind === 'blast' ? 5.5 : 3);
}

// ---------------------------------------------------------------- ритм: точное парирование, точный уклон, «открыт»
function perfectParry() {
  const p = player;
  p.st = Math.min(T.hero.st, p.st + RH.parryRefund);
  p.parryT = 9; p.lastPress = -9; // удачное парирование не наказывается узким окном
  sfx('parry'); sfx('perfect');
  burst(shieldPos(), 0xffffff, 34, 8); burst(shieldPos(), 0xffd36b, 22, 5);
  game.hitstop = 0.13; game.shake = Math.max(game.shake, 0.22);
  cinematic(0.4, 0.4, 4, 0.6);
  p.recoilW = 0.5;
  rhud.feedback('Точно!', 'perfect', 1.1); rhud.stats.parry++;
  enemy.next = null;
  enemyStagger(RH.parryStun);
}
function perfectEvade() {
  const p = player;
  p.perfectUsed = true;
  p.counterT = RH.counterWin;
  p.st = Math.min(T.hero.st, p.st + T.cost.dodge);
  cinematic(RH.perfectSlow[0], RH.perfectSlow[1], 2, 0.5);
  sfx('perfect');
  burst(tmpV.copy(p.ch.position).setY(1.1), 0xc8dcff, 16, 3);
  rhud.feedback('Точный уклон', 'perfect'); rhud.stats.dodge++;
  if (enemy.state === 'attack' && enemy.moveName === 'grab' && !enemy.grabbed) enemy.grabWhiff = true; // лапы схватили воздух
}
function isOpen(e) {
  if (e.dead || e.state !== 'attack' || !e.move) return false;
  const from = RH.openFrom[e.moveName];
  if (from == null || e.t < from) return false;
  return !(e.moveName === 'grab' && e.grabbed);
}

// ---------------------------------------------------------------- finisher (добивание)
// Available while the Leshy is stunned and the hero is close: F plays the leapCleave scene from finisher.js.
function finisherReady() {
  const e = enemy, p = player;
  return e.state === 'stagger' && !e.dead && !p.dead && p.grounded && !e.finishedThisStun && enemyDist() < T.finisher.range;
}
function startFinisher() {
  const p = player, e = enemy;
  if (p.h) p.ch.stop(p.h, 0.1);
  p.ch.stopAll(0.15);
  p.state = 'finisher'; p.t = 0; p.blocking = p.parrying = false; p.vel.set(0, 0, 0);
  p.h = p.ch.play(fin.def.hero.clip, 0.15);
  if (e.h) { e.ch.stop(e.h, 0.4); e.h = null; }
  e.state = 'finished'; e.t = 0; e.finishedThisStun = true; e.speed = 0;
  fin.start(e.ch.position, e.ch.yaw, p.ch.position);
  game.finState = null;
  cam.cine = { phase: 'fin', t: 0 };
  document.body.classList.add('cine');
  game.lockOn = true;
}
function updateFinisherHero(dt) {
  const p = player, ch = p.ch, e = enemy;
  const s = fin.update(dt);
  game.finState = s;
  p.iframe = true; p.hurtT = 0;
  const h = s.hero;
  const moved = dt > 0 ? Math.hypot(h.pos.x - ch.position.x, h.pos.z - ch.position.z) / dt : 0;
  ch.position.copy(h.pos);
  ch.position.y = Math.max(h.pos.y, 0) + 0.32 * h.hop;
  ch.yaw = h.hop > 0.01 || s.t > 1.8 ? turnTo(ch.yaw, h.yaw, dt * 4) : h.yaw;
  ch.setTime(p.h, h.clipT);
  ch.setSpeed(h.run > 0.01 ? moved : 0); // the run cycle follows the real speed: no foot sliding
  ch.setPivot(0, 0, 0.9, -0.22 * h.crouch);
  const rot = blend(ID, ID, 0);
  if (h.crouch > 0) stack(rot, FIN_POSE.crouch, h.crouch);
  if (h.tuck > 0) stack(rot, FIN_POSE.tuck, h.tuck);
  if (h.hop > 0) stack(rot, FIN_POSE.tuck, h.hop * 0.4);
  ch.update(dt, rot);
  updateWeapons(dt);
  updateHeroAura(dt);
  for (const ev of s.events) finisherEvent(ev);
}
function finisherEvent(ev) {
  const p = player, e = enemy;
  if (ev === 'whoosh') { sfx('heavyWhoosh'); sfx('jump'); }
  else if (ev === 'impact') {
    // contact: the first point along the blade that is inside the Leshy's body
    let at = null;
    for (let k = 0; k <= 20 && !at; k++) { const q = new THREE.Vector3().lerpVectors(blade.base, blade.tip, k / 20); if (pointVsEnemy(q, 0.1)) at = q; }
    if (!at) at = new THREE.Vector3().lerpVectors(blade.base, blade.tip, 0.6);
    const dir = new THREE.Vector3().subVectors(e.ch.position, p.ch.position).setY(0).normalize();
    dir.y = -0.6; // driven down into the shoulder
    e.hp = Math.max(0, e.hp - T.leshy.hp * fin.def.damage);
    e.ch.flash(0.12);
    reactEnemy(at, dir, 1.6);
    debris.spawn(at, dir, 1); debris.wound(e.ch, at.clone().add(tmpV.set(0, -0.25, 0)), dir);
    burst(at, 0xd8ffa0, 36, 7);
    sfx('heavyHit'); sfx('crack');
    game.shake = Math.max(game.shake, 0.55);
    zoomPunch(4, 0.6);
    if (e.hp <= 0) killEnemy();
  } else if (ev === 'knee') {
    if (!e.dead) {
      const knee = e.ch.worldBone('RightLeg', new THREE.Vector3()); knee.y = 0.05;
      smoke.spawn('dash', knee, { ...SMOKE.dash.params, scale: 0.8, color: '#a89c78', shadow: '#6e6448' }, { yaw: e.ch.yaw });
      burst(knee.clone().setY(0.15), 0x8a7a50, 14, 3);
      sfx('slam'); game.shake = Math.max(game.shake, 0.35);
    }
  } else if (ev === 'land') {
    sfx('land');
    const at = p.ch.position.clone();
    smoke.spawn('dash', at, { ...SMOKE.dash.params, scale: 0.6, color: '#b9b08a', shadow: '#7a7052' }, { yaw: p.ch.yaw });
  } else if (ev === 'end') endFinisher();
}
function endFinisher() {
  const p = player, e = enemy;
  p.ch.stop(p.h, 0.3); p.h = null;
  p.state = 'free'; p.t = 0; p.iframe = false; p.grounded = true; p.ch.position.y = 0;
  p.ch.setPivot(0, 0, 0.9);
  game.finState = null;
  if (cam.cine?.phase === 'fin') endCine();
  game.lockOn = false;
  if (!e.dead) {
    e.ch.setPivot(0, 0, 1.6);
    e.state = 'chase'; e.cooldown = 1.1; e.armorT = 6; e.poise = 0;
    if (!e.phase2 && e.hp <= T.leshy.hp * T.phase2) enemyStartMove('roar');
  }
}

// ---------------------------------------------------------------- grab & throw
// The Leshy's hand holds the hero by the chest: the hero's root is placed under the hand every frame.
const HOLD_DROP = 1.1; // hand to feet, metres (the claw grips the hero under the arms)
function holdHero(e) {
  const p = player;
  const hand = e.ch.worldBone('RightHand', tmpV);
  const away = tmpV2.subVectors(hand, e.ch.position).setY(0);
  if (away.lengthSq() < 1e-4) away.copy(fwd(e.ch.yaw)); away.normalize();
  p.ch.position.set(hand.x + away.x * 0.22, Math.max(0, hand.y - HOLD_DROP), hand.z + away.z * 0.22);
  p.ch.yaw = yawOf(tmpV3.subVectors(e.ch.position, p.ch.position));
  p.ch.setPivot(0.15 + Math.sin(game.time * 7) * 0.05, Math.sin(game.time * 5) * 0.06, 1.3);
  p.ch.group.updateMatrixWorld(true);
  updateWeapons(0);
}
function grabHero(e) {
  const p = player;
  if (p.h) { p.ch.stop(p.h, 0.1); p.h = null; }
  p.ch.stopAll(0.15);
  p.state = 'grabbed'; p.t = 0; p.mash = 0; p.blocking = p.parrying = false;
  p.vel.set(0, 0, 0);
  sfx('hurt'); sfx('grab');
  damagePlayer(T.grab.squeeze, fwd(e.ch.yaw), false);
  if (!p.dead) { p.state = 'grabbed'; toast('Вырывайся: ЛКМ / Space!', 1.4); startGrabCine(); cinematic(0.7, 0.45, 0, 0.1); }
  game.shake = Math.max(game.shake, 0.25);
}
// release: thrown = a full throw, otherwise the hero wriggled free and drops
function releaseHero(e, thrown) {
  const p = player;
  const dir = fwd(e.ch.yaw, new THREE.Vector3());
  p.state = 'thrown'; p.t = 0; p.grounded = false; p.soft = !thrown;
  if (thrown) {
    p.vel.copy(dir).multiplyScalar(T.grab.throwSpeed);
    p.vy = T.grab.throwUp;
    // flight time from the release height -> spread one backward somersault (+ a quarter to land on the back)
    const h = p.ch.position.y, g = T.gravity;
    p.flight = (p.vy + Math.sqrt(p.vy * p.vy + 2 * g * h)) / g;
    p.spinTotal = Math.PI * 2.5;
    cinematic(0.6, 0.4, 6, 1.0);
    sfx('throw');
  } else {
    p.vel.copy(dir).multiplyScalar(1.6); p.vy = 1.5; p.flight = 0.5;
    toast('Вырвался!', 0.9);
  }
}
function landFromThrow(p) {
  sfx('boom');
  const at = p.ch.position.clone();
  smoke.spawn('dash', at, { ...SMOKE.dash.params, scale: 0.9, color: '#b9b08a', shadow: '#7a7052' }, { yaw: yawOf(p.vel) });
  burst(at.clone().setY(0.2), 0xb8a878, 18, 4);
  game.shake = Math.max(game.shake, 0.45);
  p.vel.multiplyScalar(0.45); // skids on the ground
  p.state = 'down'; p.t = 0;
  // Death clip: 1.55 s is the moment the back meets the ground; settle, lie, then play it backwards to stand up
  p.h = p.ch.play('Death', 0.12);
  p.downKeys = [[0, 1.55], [0.45, 2.3, 'out'], [1.2, 2.3], [2.3, 0.35, 'io']];
  p.ch.setTime(p.h, 1.55);
  p.hurtT = 0;
  damagePlayer(T.grab.land * (enemy.phase2 ? 1.15 : 1), tmpV.set(0, 0, 0), false);
  if (p.dead) { p.state = 'dead'; p.t = 2.3; }
}

function damagePlayer(dmg, knockDir, react = true, dur = 0.9, knock = 3) {
  const p = player;
  p.hp = Math.max(train.god ? 1 : 0, p.hp - dmg);
  p.hurtT = 0;
  p.ch.flash(0.1);
  sfx('hurt');
  burst(tmpV.copy(p.ch.position).setY(p.ch.position.y + 1.3), 0xff4030, 12, 4);
  game.shake = Math.max(game.shake, 0.3);
  game.hitstop = Math.max(game.hitstop, 0.06);
  if (p.hp <= 0) {
    const lying = p.state === 'down';
    if (p.h && !lying) p.ch.stop(p.h, 0.1);
    p.dead = true; p.state = 'dead'; p.t = 0;
    if (lying) p.t = 2.3; else p.h = p.ch.play('Death', 0.15);
    if (p.ch.position.y > 0.01) { p.ch.position.y = 0; p.grounded = true; p.ch.setPivot(0, 0, 0.9); }
    heroAura.disappear(); p.auraOn = false;
    game.over = true; game.lockOn = false;
    setTimeout(() => showEnd('Богатырь пал'), 2600);
    return;
  }
  if (!react) { p.hitW = Math.max(p.hitW, 0.6); return; }
  if (p.h) p.ch.stop(p.h, 0.1);
  p.state = 'hurt'; p.t = 0; p.dur = dur; p.knock = knock; p.dashDir.copy(knockDir);
  p.h = p.ch.play('Hit', 0.08);
  p.vy = Math.min(p.vy, 0);
}

// ---------------------------------------------------------------- camera
// The camera drives itself, the mouse does not turn it:
//  • combat (Leshy within ~11 m, or Tab lock-on): behind the hero on the hero→Leshy line, a little over the
//    shoulder, framing both; it follows every step and circles with the hero.
//  • explore (hero left the radius): swings in behind the running direction; after standing still for
//    a moment it turns to face the Leshy again.
// ← → nudge the camera, ↑ ↓ tilt it.
const cam = { yaw: 0, pitch: 0.2, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false, mode: 'combat', still: 0, nudge: 0,
  fov: 58, zoomAmt: 0, zoomT: 9, zoomDur: 1, side: 0.55,
  cine: null, cineW: 0, jitP: new THREE.Vector3(), jitL: new THREE.Vector3(), cinePos: new THREE.Vector3(), cineLook: new THREE.Vector3(), cineFov: 58 };
const COMBAT_IN = 11, COMBAT_OUT = 14;
function zoomPunch(amount, dur) { if (amount >= cam.zoomAmt * zoomEnv() - 0.5) { cam.zoomAmt = amount; cam.zoomT = 0; cam.zoomDur = dur; } }
function zoomEnv() { const t = cam.zoomT, d = cam.zoomDur; return t >= d ? 0 : Math.min(1, t / 0.12) * (1 - smooth(d * 0.35, d, t)); }
// light slow motion + zoom for big moments (enemy supers, the hero's combo finisher / heavy hit)
function cinematic(scale, dur, zoom, zoomDur) {
  if (scale < game.slowScale || game.slowT <= 0) game.slowScale = scale;
  game.slowT = Math.max(game.slowT, dur);
  zoomPunch(zoom, zoomDur);
}
// Grab cinematic: the view cuts to a close-up of the Leshy's face while he holds the hero up,
// then pulls out to a wide side shot for the wind-up, the throw and the landing.
const tmpLook = new THREE.Vector3(), _cp = new THREE.Vector3();
function startGrabCine() {
  cam.cine = { phase: 'face', t: 0, side: null, dir: new THREE.Vector3(), from: new THREE.Vector3() };
  document.body.classList.add('cine');
}
function endCine() { if (cam.cine) { cam.cine = null; document.body.classList.remove('cine'); } }
function updateCine(dt) {
  const c = cam.cine, p = player, e = enemy;
  if (c) {
    c.t += dt;
    const g = e.moveName === 'grab' && e.grabbed ? e.t - e.grabT : 9;
    if (c.phase === 'face' && (p.state !== 'grabbed' || g >= 1.55)) {
      if (p.state === 'thrown' && p.soft || p.state === 'free') { endCine(); }
      else {
        // fix the throw axis and look at it from the side the camera already is on
        c.phase = 'throw'; c.t = 0;
        fwd(e.ch.yaw, c.dir);
        const side = tmpV.set(c.dir.z, 0, -c.dir.x);
        if (side.dot(tmpV2.subVectors(cam.pos, e.ch.position)) < 0) side.negate();
        c.side = side.clone(); c.from.copy(e.ch.position);
      }
    }
    if (c && c.phase === 'throw' && (p.state === 'free' || p.state === 'dead' && c.t > 2.5 || p.state === 'down' && p.t > 1.0 || (p.state === 'thrown' && p.soft))) endCine();
  }
  const on = !!cam.cine;
  cam.cineW = clamp(cam.cineW + dt * (on ? (cam.cine.phase === 'throw' ? 3 : 5) : -1.6), 0, 1);
  cam.jitP.set(0, 0, 0); cam.jitL.set(0, 0, 0);
  if (!cam.cine) return;
  if (cam.cine.phase === 'fin') {
    const s = game.finState;
    if (s) {
      if (cam.cineW < 0.05 || !cam.cine.set) { cam.cinePos.copy(s.cam.pos); cam.cineLook.copy(s.cam.look); cam.cine.set = true; }
      cam.cinePos.lerp(s.cam.pos, 1 - Math.exp(-dt * 9));
      cam.cineLook.lerp(s.cam.look, 1 - Math.exp(-dt * 12));
      cam.cineFov = s.cam.fov;
      // hand-held operator: slow layered sway, stronger on the blow
      const a = s.cam.shake * 0.035, tt = game.time;
      cam.jitP.set(a * (Math.sin(tt * 1.7) + 0.5 * Math.sin(tt * 4.3 + 1)), a * (Math.sin(tt * 2.3 + 2) + 0.4 * Math.sin(tt * 5.1)), a * 0.7 * Math.sin(tt * 1.1 + 5));
      cam.jitL.set(a * 0.6 * Math.sin(tt * 1.3 + 4), a * 0.6 * Math.sin(tt * 2.9 + 3), 0);
    }
    return;
  }
  const ep = e.ch.position;
  if (cam.cine.phase === 'face') {
    // face-off two-shot: both heads in profile, the Leshy's a little towards camera, low angle;
    // a slow push-in while he holds the hero, the roar adds a jolt (zoom punch + shake)
    const headL = e.ch.worldBone('Head', tmpV);
    const headH = p.ch.worldBone('Head', tmpV2);
    const k = smooth(0, 1.5, cam.cine.t);
    const mid = new THREE.Vector3().lerpVectors(headH, headL, 0.5);
    const axis = new THREE.Vector3().subVectors(headH, headL).setY(0);
    if (axis.lengthSq() < 1e-4) fwd(e.ch.yaw, axis); axis.normalize();
    const side = new THREE.Vector3(axis.z, 0, -axis.x);
    const lf = fwd(e.ch.yaw, tmpV3);
    if (side.dot(tmpV3.set(lf.z, 0, -lf.x)) < 0) side.negate(); // the Leshy's free (left) side
    const dist = 2.9 - 0.75 * k;
    const want = new THREE.Vector3().copy(mid).addScaledVector(side, dist).addScaledVector(fwd(e.ch.yaw, tmpV3), 0.55 * dist);
    want.y = mid.y - 0.3;
    mid.y += 0.1;
    if (cam.cineW < 0.05) cam.cinePos.copy(want); else cam.cinePos.lerp(want, 1 - Math.exp(-dt * 8));
    if (cam.cineW < 0.05) cam.cineLook.copy(mid); else cam.cineLook.lerp(mid, 1 - Math.exp(-dt * 10));
    cam.cineFov = 40 - 6 * k;
    const tt = game.time, a = 0.012 + 0.02 * game.shake;
    cam.jitP.set(a * Math.sin(tt * 1.9), a * Math.sin(tt * 2.6 + 1), a * Math.sin(tt * 1.3 + 2));
  } else {
    // wide side shot of the throw: a hard cut from the face, framing the Leshy for the wind-up,
    // then panning with the flying hero to the landing
    const c = cam.cine, pp = p.ch.position;
    const fly = p.state === 'thrown' || p.state === 'down' ? 1 : 0;
    c.fly = (c.fly || 0) + ((fly - (c.fly || 0)) * (1 - Math.exp(-dt * 2.5)));
    const along = 0.9 + 3.0 * c.fly, back = 6.4 + 2.8 * c.fly;
    const want = new THREE.Vector3().copy(c.from).addScaledVector(c.dir, along).addScaledVector(c.side, back);
    want.y = 2.0 + 0.3 * c.fly;
    const look = new THREE.Vector3().copy(c.from).addScaledVector(c.dir, 0.9).lerp(pp, 0.92 * c.fly);
    look.y = 1.5 - 0.3 * c.fly + Math.max(0, pp.y - 1) * 0.4 * c.fly;
    if (c.t === dt || !c.cut) { c.cut = true; cam.cinePos.copy(want); cam.cineLook.copy(look); cam.cineFov = 44; }
    cam.cinePos.lerp(want, 1 - Math.exp(-dt * 4));
    cam.cineLook.lerp(look, 1 - Math.exp(-dt * 6));
    cam.cineFov += (48 - cam.cineFov) * (1 - Math.exp(-dt * 1.5));
  }
}
function updateCamera(dt) {
  const p = player, e = enemy;
  if (down('ArrowUp')) cam.pitch = clamp(cam.pitch - dt * 0.8, -0.05, 0.7);
  if (down('ArrowDown')) cam.pitch = clamp(cam.pitch + dt * 0.8, -0.05, 0.7);
  if (down('ArrowLeft')) cam.nudge += 1.6 * dt;
  if (down('ArrowRight')) cam.nudge -= 1.6 * dt;

  const pp = p.ch.position, ep = e.ch.position;
  const d = enemyDist();
  const alive = !e.dead && !p.dead;
  if (cam.mode === 'combat' && (!alive || (d > COMBAT_OUT && !game.lockOn))) cam.mode = 'explore';
  else if (cam.mode === 'explore' && alive && (d < COMBAT_IN || game.lockOn)) cam.mode = 'combat';
  const spd = Math.hypot(p.vel.x, p.vel.z);
  cam.still = spd < 0.4 && p.state === 'free' ? cam.still + dt : 0;
  const yawToE = yawOf(tmpV.subVectors(ep, pp));

  let want = cam.yaw, rate = 0;
  if (cam.mode === 'combat') {
    // very close the hero→enemy line spins fast: slow down there so circling stays readable
    want = yawToE; rate = d < 1.6 ? 1.4 : 3.0;
  } else if (spd > 0.6) {
    const vy = yawOf(p.vel), diff = ang(vy - cam.yaw);
    // swing in behind the run (slower when the hero runs towards the camera)
    want = vy; rate = 1.7 * Math.max(0.35, Math.cos(diff)) * Math.min(1, spd / 3);
  } else if (cam.still > 0.45 && !e.dead) { want = yawToE; rate = 1.5; }
  cam.nudge *= Math.exp(-dt * (down('ArrowLeft', 'ArrowRight') ? 0 : 0.8));
  cam.yaw = lerpAng(cam.yaw, want, 1 - Math.exp(-dt * rate));
  const yaw = cam.yaw + cam.nudge;

  const base = tmpV.copy(pp);
  base.y = pp.y * 0.5;
  const f = fwd(yaw, tmpV2);
  const right = tmpV3.set(-Math.cos(yaw), 0, Math.sin(yaw));
  let dist = 4.6, look;
  if (cam.mode === 'combat') {
    // pull back as the fight spreads out, and aim between the hero and the Leshy (closer to the hero)
    dist = 4.9 + clamp(d - 3, 0, 8) * 0.22;
    const w = clamp(0.3 + (d - 2) * 0.03, 0.3, 0.45);
    look = new THREE.Vector3(pp.x + (ep.x - pp.x) * w, 1.55 + (ep.y + 1.9 - 1.55) * w, pp.z + (ep.z - pp.z) * w);
    cam.side += (0.55 - cam.side) * (1 - Math.exp(-dt * 3));
  } else {
    look = new THREE.Vector3().copy(base).addScaledVector(f, 2.2);
    look.y = base.y + 1.5;
    cam.side += (0.25 - cam.side) * (1 - Math.exp(-dt * 3));
  }
  const desired = new THREE.Vector3().copy(base).addScaledVector(f, -dist * Math.cos(cam.pitch)).addScaledVector(right, cam.side);
  desired.y = base.y + 1.9 + dist * Math.sin(cam.pitch);
  if (cam.mode !== 'combat') look.addScaledVector(right, cam.side * 0.5); // in a fight the hero sits left of centre, the Leshy right
  const rr = Math.hypot(desired.x, desired.z);
  if (rr > T.arena + 6) { desired.x *= (T.arena + 6) / rr; desired.z *= (T.arena + 6) / rr; }

  if (!cam.init) { cam.pos.copy(desired); cam.look.copy(look); cam.init = true; }
  const k = 1 - Math.exp(-dt * 6);
  cam.pos.lerp(desired, k);
  cam.look.lerp(look, 1 - Math.exp(-dt * 8));
  camera.position.copy(cam.pos);
  updateCine(dt);
  let fovBase = cam.fov;
  if (cam.cineW > 0.001) {
    const w = smooth(0, 1, cam.cineW);
    camera.position.lerp(_cp.copy(cam.cinePos).add(cam.jitP), w);
    tmpLook.copy(cam.look).lerp(_cp.copy(cam.cineLook).add(cam.jitL), w);
    fovBase += (cam.cineFov - cam.fov) * w;
  } else tmpLook.copy(cam.look);
  if (game.shake > 0) {
    const s = game.shake * 0.3;
    camera.position.x += rand(-s, s); camera.position.y += rand(-s, s); camera.position.z += rand(-s, s);
  }
  if (game.debugCam) { camera.position.fromArray(game.debugCam[0]); tmpLook.fromArray(game.debugCam[1]); }
  camera.lookAt(tmpLook);
  // zoom punch: narrow the lens a little, then ease back
  cam.zoomT += dt;
  const fov = fovBase - cam.zoomAmt * zoomEnv();
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

  sun.position.set(pp.x + 8, 16, pp.z + 6);
  sun.target.position.copy(pp);
}

// ---------------------------------------------------------------- HUD update
let ghostP = 100, ghostE = 100;
function updateHUD(dt) {
  hud.fin.classList.toggle('hidden', !finisherReady() || player.state === 'finisher');
  const pp = (player.hp / T.hero.hp) * 100, ep = (enemy.hp / T.leshy.hp) * 100;
  hud.pHP.style.width = pp + '%';
  hud.pST.style.width = (player.st / T.hero.st) * 100 + '%';
  hud.stBar.classList.toggle('aura', player.auraOn);
  hud.pHPbar.classList.toggle('regen', player.regenOn);
  hud.stBar.classList.toggle('exhausted', player.exhausted);
  hud.aura.textContent = player.auraOn ? 'Аура богатыря' : player.exhausted ? 'Выдохся' : '';
  hud.eHP.style.width = ep + '%';
  hud.phase.textContent = enemy.dead ? '' : enemy.phase2 ? 'Ярость леса' : '';
  ghostP = Math.max(pp, ghostP - dt * 25); ghostE = Math.max(ep, ghostE - dt * 25);
  hud.pHPg.style.width = ghostP + '%'; hud.eHPg.style.width = ghostE + '%';
  if (game.lockOn && !enemy.dead) {
    const v = new THREE.Vector3(enemy.ch.position.x, 1.9, enemy.ch.position.z).project(camera);
    hud.lock.classList.toggle('hidden', v.z > 1);
    hud.lock.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
    hud.lock.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
  } else hud.lock.classList.add('hidden');
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) hud.toast.classList.remove('show'); }
  updateRhythmHud(dt);
}
const _hv = new THREE.Vector3();
let panelSig = '';
function updateRhythmHud(dt) {
  const e = enemy, p = player;
  rhud.update(dt);
  // метка над Лешим: что делать с этим приёмом, и кольцо тайминга (сходится к метке в момент нажатия)
  let kind = '', ring = null, now = false;
  if (!e.dead && e.state === 'attack' && e.move && !p.dead) {
    const mv = e.move, name = e.moveName, hitAt = RH.hitAt[name];
    if (mv.glow === 'red') kind = 'block';
    else if (mv.glow === 'orange') kind = name === 'roots' || name === 'volley' ? 'run' : 'dodge';
    const endAt = hitAt != null ? hitAt + 0.12 : mv.dur * 0.65;
    if (e.t > endAt || (name === 'grab' && e.grabbed)) kind = '';
    if (kind && hitAt != null && train.rings) {
      const press = hitAt - (kind === 'block' ? RH.parryWin * 0.5 : RH.perfect * 0.5);
      const u = (press - e.t) / RH.ringLead;
      if (u <= 1) { ring = Math.max(0, u); now = u <= 0.1; }
    }
  }
  rhud.telegraph(kind, ring, now);
  if (kind) rhud.place(rhud.tele, _hv.set(e.ch.position.x, e.ch.position.y + 3.05, e.ch.position.z).project(camera));
  const open = isOpen(e) || e.state === 'stagger';
  rhud.open.classList.toggle('show', open && !e.dead);
  if (open) {
    rhud.open.textContent = e.state === 'stagger' ? 'Оглушён' : 'Открыт!';
    rhud.place(rhud.open, _hv.set(e.ch.position.x, e.ch.position.y + 2.2, e.ch.position.z).project(camera));
  }
  // окно оглушения и стойкость под полосой здоровья Лешего
  const st = e.state === 'stagger' && !e.dead;
  rhud.stun.classList.toggle('show', st);
  if (st) {
    rhud.stunFill.style.width = Math.max(0, 1 - e.t / e.stunDur) * 100 + '%';
    rhud.stunTxt.textContent = 'Оглушён ' + Math.max(0, e.stunDur - e.t).toFixed(1) + ' с · урон ×' + String(RH.stunDmg).replace('.', ',');
  }
  rhud.poise.style.width = Math.min(1, e.poise / RH.poiseMax) * 100 + '%';
  rhud.poiseBar.classList.toggle('locked', e.armorT > 0);
  rhud.counter.classList.toggle('hidden', !(p.counterT > 0) || p.dead);
  const sig = JSON.stringify(train) + JSON.stringify(rhud.stats);
  if (sig !== panelSig) { panelSig = sig; rhud.renderPanel(train); }
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
  for (const pr of projectiles) { disposeObj(pr.mesh); disposeObj(pr.shadow); }
  projectiles.length = 0; hazards.length = 0;
  for (const m of markers) m.dispose();
  markers.length = 0;
  if (enemy.held) { disposeObj(enemy.held); enemy.held = null; }
  player.reset(); enemy.reset();
  heroAura.set({ ...heroAura.params }); heroAura.disappear(); heroAura.reveal = 0;
  leshyAura.set(LESHY_AURA); leshyAura.disappear(); leshyAura.reveal = 0;
  smoke.clear();
  debris.clear(); leshyReact.reset(); fin.done = true; game.finState = null;
  game.over = false; game.lockOn = false; game.slowmo = 0; game.slowT = 0;
  cam.init = false; cam.yaw = 0; cam.mode = 'combat'; cam.nudge = 0; cam.zoomT = 9; endCine(); cam.cineW = 0;
  ghostP = ghostE = 100;
  $('end').classList.add('hidden');
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.manual) step(dt);
}

function step(dt) {
  if (player && game.running) {
    if (hit('KeyR')) restart();
    if (hit('Tab', 'MMB') && !enemy.dead) { game.lockOn = !game.lockOn; toast(game.lockOn ? 'Цель захвачена' : 'Захват снят', 0.6); }
    if (hit('Escape')) { if (document.pointerLockElement) document.exitPointerLock(); else pause(); }
    if (hit('Digit1')) train.rings = !train.rings;
    if (hit('Digit2')) train.slow = !train.slow;
    if (hit('Digit3')) { train.mode = { mix: 'claw', claw: 'super', super: 'mix' }[train.mode]; enemy.superCd = 0; toast({ mix: 'Леший: всё', claw: 'Леший: только когти', super: 'Леший: только суперы' }[train.mode], 0.9); }
    if (hit('Digit4')) train.god = !train.god;

    let ts = 1;
    if (game.hitstop > 0) { game.hitstop -= dt; ts = 0.06; }
    else if (game.slowmo > 0) { game.slowmo -= dt; ts = 0.35; }
    else if (game.slowT > 0) { game.slowT -= dt; ts = game.slowScale; }
    if (player?.state === 'finisher') ts = Math.min(ts, fin.timeScale());
    if (train.slow) ts *= 0.5;
    const gdt = dt * ts;
    game.time += gdt;
    updatePlayer(gdt);
    updateEnemy(gdt);
    updateProjectiles(gdt);
    updateFx(gdt);
    smoke.update(gdt, camera);
    game.shake = Math.max(0, game.shake - dt);
    updateCamera(dt);
    updateHUD(dt);
    renderFrame(gdt);
  } else if (player) {
    // paused / menu: keep the scene alive in the background
    player.ch.update(0, null); enemy.ch.update(dt * 0.5, null);
    updateWeapons(0);
    updateCamera(dt);
    renderFrame(0);
  }
  pressed.clear();
  mouse.dx = mouse.dy = 0;
}

function renderFrame(dt) {
  if (game.noRender) {
    // logic-only stepping for automated tests: keep the aura state machines running without drawing
    heroAura.update(dt, camera, player.ch.position, null, null);
    leshyAura.update(dt, camera, enemy.ch.position, null, null);
    return;
  }
  camera.updateMatrixWorld();
  mask.render(renderer, scene, camera);
  heroAura.update(dt, camera, player.ch.position, mask, renderer);
  leshyAura.update(dt, camera, enemy.ch.position, mask, renderer);
  // in the face close-up the camera sits inside the auras: thin them out so the face reads
  const faceW = cam.cine?.phase === 'face' || cam.cine?.phase === 'fin' ? cam.cineW : 0;
  for (const a of [heroAura, leshyAura]) {
    a.u.uOpacity.value *= 1 - 0.8 * faceW;
    a.points.visible = faceW < 0.4;
  }
  // characters pick up a little of their own aura colour
  player.ch.setTint(heroAura.glowColor, 0.05 * heroAura.visibleAmount);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- boot
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

$('start').disabled = true;
$('start').addEventListener('click', start);

// Models ship as .glb; the hosted build serves them base64-encoded as text instead (artifacts refuse .glb).
const progress = { bogatyr: 0, leshy: 0 };
function showProgress() { $('loadbar').firstElementChild.style.width = ((progress.bogatyr + progress.leshy) / 2) * 100 + '%'; }
async function fetchBuf(url, key) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' ' + r.status);
  const total = +r.headers.get('content-length') || 0;
  if (!r.body || !total) { const b = await r.arrayBuffer(); progress[key] = 1; showProgress(); return b; }
  const reader = r.body.getReader();
  const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; progress[key] = got / total; showProgress(); }
  const out = new Uint8Array(got); let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}
async function loadModel(name) {
  let buf;
  try { buf = await fetchBuf(`models/${name}.glb`, name); }
  catch {
    const txt = new TextDecoder().decode(await fetchBuf(`models/${name}.b64.txt`, name));
    const bin = atob(txt.trim());
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    buf = u8.buffer;
  }
  return new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
}
const onModelError = (err) => { $('loading').textContent = 'Не удалось загрузить модели: ' + (err?.message || err) + ' (запустите через локальный сервер, см. README)'; console.error(err); };
rhud = new RhythmHud();
Promise.all([loadModel('bogatyr'), loadModel('leshy')]).then(([gB, gL]) => {
  player = new Player(new Character(gB, { height: T.hero.height, name: 'Богатырь' }));
  enemy = new Enemy(new Character(gL, { height: T.leshy.height, name: 'Леший' }));
  // weapons in the fists (built in the rest pose), shield placement measured in the block pose
  weaponRig = new WeaponRig(player.ch, sword, shield);
  weaponRig.calibrateShield(P.block);
  enemy.ch.locoBlend = 4; // the big one shifts between gaits slowly
  scene.add(player.ch.group, enemy.ch.group);
  mask.register(player.ch.group, 0); mask.register(sword, 0); mask.register(shield, 0);
  mask.register(enemy.ch.group, 1);
  $('loading').textContent = '';
  $('start').disabled = false;
  if (params.has('test')) start();
  requestAnimationFrame(frame);
  window.game.ready = true;
}).catch(onModelError);

// handle for automated testing / debugging from the console
window.game = {
  game, T, step, keys, pressed, mouse, heroAura, leshyAura, smoke, projectiles, hazards, markers, scene, camera, renderer,
  get player() { return player; }, get enemy() { return enemy; }, cam, fin, leshyReact, debris, stagger: () => enemyStagger(), sword, shield, blade, get rig() { return weaponRig; },
  advance(sec, fps = 60) { for (let i = 0; i < Math.round(sec * fps); i++) step(1 / fps); },
  tap(code) { pressed.add(code); },
  force(name) { enemyStartMove(name); },
  train, RH, get rhud() { return rhud; }, isOpen: () => isOpen(enemy),
};
