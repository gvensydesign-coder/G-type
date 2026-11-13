// Лаборатория движений: playable test course + clip gallery for the hero and the Leshy.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Character } from './character.js';
import { makeSword, makeShield, WeaponRig } from './weapons.js';
import { FootIK } from './ik.js';
import * as C from './course.js';
import { LedgeRig, sampleKeys, hangPose, mantleKeys, grabKeys, pullKeys, liveKey, stepKeys, vaultKeys } from './ledge.js';
import { twoBone } from './ik.js';
import { pose as mkPose, blend as poseBlend } from './pose.js';
import { buildScenes, DUEL_GROUPS, keyAt, activeSeg, warp as dwarp } from './duel.js';
import { FIN_SRC } from './finishers.js';
import { PoseRig, sample as sampleKeysC, lerpPose } from './combat.js';

const HERO_H = 1.53, LESHY_H = 2.5, GRAV = 16;
const $ = (id) => document.getElementById(id);
const fmt = (x) => x.toFixed(2).replace('.', ',');

// ------------------------------------------------------------------ renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb0b4);
scene.fog = new THREE.Fog(0x9fb0b4, 30, 75);
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x5a4e3c, 1.25));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
C.buildCourse(scene);
// gallery stage: a round dais away from the course
const STAGE = new THREE.Vector3(30, 0, 6);
{
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xc9a25e, transparent: true, opacity: 0.5 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(STAGE.x, 0.004, STAGE.z); scene.add(ring);
  for (let i = 1; i < 4; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(i - 0.006, i, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })); r.rotation.x = -Math.PI / 2; r.position.set(STAGE.x, 0.003, STAGE.z); scene.add(r); }
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ loading
const bar = $('bar').firstElementChild;
let loaded = 0; const step = () => { loaded++; bar.style.width = (loaded / 4) * 100 + '%'; };
// binaries ship as .glb/.bin; the hosted build serves them base64-encoded as text (artifacts refuse binary types)
async function fetchBin(path) {
  try { const r = await fetch(path); if (r.ok) { const b = await r.arrayBuffer(); step(); return b; } } catch (e) { /* fall through */ }
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

// mocap clips (retargeted CMU) -> THREE.AnimationClip
function buildClips(model) {
  const bones = man.models[model], nb = bones.length, out = {};
  for (const c of man.clips) {
    if (c.model !== model) continue;
    const n = c.frames, times = new Float32Array(n);
    for (let f = 0; f < n; f++) times[f] = f / c.fps;
    const rot = new Int16Array(bin, c.rot, n * nb * 4), hips = new Float32Array(bin, c.hips, n * 3);
    const tracks = [];
    for (let b = 0; b < nb; b++) {
      const v = new Float32Array(n * 4);
      for (let f = 0; f < n; f++) {
        let x = rot[(f * nb + b) * 4] / 32767, y = rot[(f * nb + b) * 4 + 1] / 32767, z = rot[(f * nb + b) * 4 + 2] / 32767, w = rot[(f * nb + b) * 4 + 3] / 32767;
        const l = Math.hypot(x, y, z, w) || 1; v[f * 4] = x / l; v[f * 4 + 1] = y / l; v[f * 4 + 2] = z / l; v[f * 4 + 3] = w / l;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack('mixamorig' + bones[b] + '.quaternion', times, v));
    }
    tracks.push(new THREE.VectorKeyframeTrack('mixamorigHips.position', times, new Float32Array(hips)));
    const clip = new THREE.AnimationClip(c.name, (n - 1) / c.fps, tracks);
    out[c.name] = { clip, meta: c };
  }
  return out;
}
function arms(clip, name) {   // only the arms and the upper chest (for the water balance overlay)
  const keep = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'Spine2'].map((b) => 'mixamorig' + b + '.');
  return new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => keep.some((k) => t.name.startsWith(k))));
}

// procedural arm poses for the duel (same as the game: guard stance, shield block)
const GUARD = mkPose({ RightArm: [-22, 0, -8], RightForeArm: [-50, 15, 0], LeftArm: [-20, -8, 10], LeftForeArm: [-60, -25, 0] });
const BLOCK = mkPose({ Spine1: [10, 0, 0], Spine2: [0, -10, 0], RightArm: [-30, 0, -25], RightForeArm: [-70, 10, 0], LeftArm: [-70, -35, 0], LeftForeArm: [-85, -40, 0], Neck: [8, 0, 0] });

// ------------------------------------------------------------------ actors
class Actor {
  constructor(gltf, model, height, name) {
    this.model = model;
    const ch = this.ch = new Character(gltf, { height, name });
    this.mocap = buildClips(model);
    for (const k in this.mocap) ch.clips[k] = this.mocap[k].clip;
    scene.add(ch.group);
    ch.model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.hero = model === 'bogatyr';
    if (this.hero) {
      this.sword = makeSword(); this.shield = makeShield(); scene.add(this.sword, this.shield);
      this.rig = new WeaponRig(ch, this.sword, this.shield);
      if (this.mocap.Balance) {
        this.balance = ch.mixer.clipAction(arms(this.mocap.Balance.clip, 'BalanceArms'));
        this.balance.play(); this.balance.setEffectiveWeight(0);
      }
    }
    // rest pose of every bone: restored before each mixer update, so bones a clip does not animate
    // (hands, fingers, forearms in the idle) never keep a pose left by IK or by a previous clip
    this.rest = [];
    ch.model.traverse((o) => { if (o.isBone) this.rest.push([o, o.quaternion.clone(), o.position.clone()]); });
    if (this.hero) {
      this.rig.calibrateShield(BLOCK);
      for (const [b, q, p] of this.rest) { b.quaternion.copy(q); b.position.copy(p); }
    }
    this.ik = new FootIK(ch);
    this.R = new LedgeRig(ch);
    ch.setSpeed(0); ch.update(0); this.R.measure();
    this.s = height / 1.53;
    this.radius = 0.28 * Math.max(1, this.s * 0.8);
    this.bodyH = height;
    this.walk = this.hero ? 1.55 : 1.3; this.run = this.hero ? 3.7 : 2.9;
    this.reset(0, 0, 0);
  }
  reset(x, z, yaw) {
    const g = C.ground(x, z, 50);
    this.ch.group.position.set(x, g.y, z); this.ch.yaw = yaw;
    this.feet = g.y; this.vy = 0; this.speed = 0; this.state = 'ground'; this.sub = '';
    this.hv = new THREE.Vector3(); this.blockT = 0; this.airT = 0; this.peak = g.y; this.wbal = 0;
    this.layer = null; this.trav = null; this.oneshot = null; this.ch.stopAll(0.05);
    this.ik.pelvis = 0;
  }
  get pos() { return this.ch.group.position; }
  fwd(out = new THREE.Vector3()) { return out.set(Math.sin(this.ch.yaw), 0, Math.cos(this.ch.yaw)); }
}

const hero = new Actor(gB, 'bogatyr', HERO_H, 'Богатырь');
const leshy = new Actor(gL, 'leshy', LESHY_H, 'Леший');
hero.reset(0, 0, 0); leshy.reset(-4.5, -2.5, 0.5);
let act = hero;
const actors = [hero, leshy];

// ------------------------------------------------------------------ world queries
const groundFn = (x, z, maxY) => C.ground(x, z, maxY);
function blockedAt(a, x, z) {
  const r = a.radius;
  for (let i = 0; i < 9; i++) {
    const ang = (i / 8) * Math.PI * 2, rr = i === 8 ? 0 : r;
    const t = C.obstacleTop(x + Math.sin(ang) * rr, z + Math.cos(ang) * rr, a.feet, a.bodyH);
    if (t > a.feet + 0.45) return true;
  }
  return false;
}
const AXES = [[0, 1], [1, 0], [0, -1], [-1, 0]];
// what is in front of the actor: vault / up / mantle / grab / none
function probe(a, dirIn) {
  let dx = dirIn.x, dz = dirIn.z;
  // walls in the course are axis aligned: square up to the nearest face
  let best = null, bd = -2;
  for (const [ax, az] of AXES) { const d = ax * dx + az * dz; if (d > bd) { bd = d; best = [ax, az]; } }
  if (bd < 0.8) return null;
  [dx, dz] = best;
  const p = a.pos, f = a.feet;
  const top = (d, lat = 0) => C.obstacleTop(p.x + dx * d - dz * lat, p.z + dz * d + dx * lat, f, a.bodyH);
  let d0 = -1;
  for (let d = 0.1; d <= 1.35; d += 0.05) if (top(d) > f + 0.4) { d0 = d; break; }
  if (d0 < 0) return null;
  let lo = d0 - 0.05, hi = d0;
  for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (top(m) > f + 0.4) hi = m; else lo = m; }
  d0 = hi;
  let T = 0; for (let d = d0 + 0.02; d < d0 + 0.3; d += 0.04) T = Math.max(T, top(d));
  const H = T - f;
  let d1 = d0; while (d1 < d0 + 1.8 && top(d1 + 0.05) > T - 0.25) d1 += 0.05;
  const thick = d1 - d0;
  const land = C.ground(p.x + dx * (d1 + 0.45), p.z + dz * (d1 + 0.45), T + 0.1).y;
  // the edge must run on both sides of the hands
  const wideOk = Math.abs(top(d0 + 0.12, 0.25) - T) < 0.12 && Math.abs(top(d0 + 0.12, -0.25) - T) < 0.12;
  const yaw = Math.atan2(dx, dz);
  const edge = new THREE.Vector3(p.x + dx * d0, T, p.z + dz * d0);
  const r = { H, D: d0, thick, land, yaw, edge, dir: new THREE.Vector3(dx, 0, dz) };
  if (!a.hero) return null;
  if (H <= 1.25 && thick <= 0.75 && land <= T - 0.3 && d0 < (a.speed > 2.4 && H <= 0.72 ? 1.4 : 0.95)) return { ...r, kind: 'vault' };
  if (H <= 0.95 && d0 < 0.9) return { ...r, kind: 'up' };
  if (!wideOk) return null;
  if (H > 0.95 && H <= 1.75 && d0 < 0.95) return { ...r, kind: 'mantle' };
  if (H > 1.75 && H <= a.R.reach + 0.86 && d0 < 1.25) return { ...r, kind: 'grab' };
  return null;
}

// ------------------------------------------------------------------ input
const keys = {};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); spaceQueued = true; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let spaceQueued = false;
let script = null;   // gallery demo input

function readInput() {
  if (script) return script.input;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  return { f, r, run: !!(keys.ShiftLeft || keys.ShiftRight), space: spaceQueued, drop: keys.KeyS || keys.KeyC };
}

// ------------------------------------------------------------------ settings
const opt = { ik: true, lock: true, newClimb: true, speed: 1, view: 'back', dbg: false, mode: 'course' };

// ------------------------------------------------------------------ actor update (state machine)
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const angTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const TRAV = {
  vault: { clip: 'StepOver', t0: 0.15, t1: 1.45, rate: 1.25, label: 'Перелезть' },
  vault_run: { clip: 'StepOver2', t0: 0.2, t1: 1.75, rate: 1.5, label: 'Перемах с бега' },
  up: { clip: 'StepUp', t0: 0.35, t1: 1.85, rate: 1.3, label: 'Шаг на уступ' },
  climb_old: { clip: 'ClimbUp', t0: 1.5, t1: 6.3, rate: 1.65, label: 'Подъём (старый, мокап)' },
};
function rootAt(a, clip, t) {
  const m = a.mocap[clip].meta, r = m.root;
  if (!r || !r.length) return _w.set(0, 0, 0);
  const f = THREE.MathUtils.clamp(t * m.fps, 0, r.length - 1), i = Math.floor(f), j = Math.min(r.length - 1, i + 1), u = f - i;
  return new THREE.Vector3(r[i][0] + (r[j][0] - r[i][0]) * u, r[i][1] + (r[j][1] - r[i][1]) * u, r[i][2] + (r[j][2] - r[i][2]) * u).multiplyScalar(a.ch.scale);
}

let stateLabel = 'Готов';
function startTrav(a, pr, kind) {
  const T = TRAV[kind];
  const r0 = rootAt(a, T.clip, T.t0), r1 = rootAt(a, T.clip, T.t1);
  const wantZ = kind === 'up' || kind === 'climb_old' ? pr.D + 0.32 : pr.D + pr.thick + 0.42;
  const dz = r1.z - r0.z, dy = r1.y - r0.y;
  a.trav = {
    T, kind, t: T.t0, h: a.ch.play(T.clip, 0.12), start: a.pos.clone(), yaw: pr.yaw, r0,
    kz: THREE.MathUtils.clamp(wantZ / Math.max(0.2, dz), 0.55, 1.8),
    ky: kind === 'up' || kind === 'climb_old' ? (Math.abs(dy) > 0.05 ? pr.H / dy : 0) : 0,
    end: new THREE.Vector3(a.pos.x + pr.dir.x * wantZ, kind === 'vault' ? pr.land : pr.edge.y, a.pos.z + pr.dir.z * wantZ),
    climbY: kind === 'up' || kind === 'climb_old' ? pr.H : 0,
  };
  a.ch.yaw = pr.yaw; a.state = 'trav'; a.speed = 0; stateLabel = T.label;
}
function startLedge(a, pr, kind) {
  const R = a.R;
  R.setFrame(pr.edge, pr.yaw);
  a.ch.yaw = pr.yaw;
  let keysL;
  if (kind === 'mantle') { keysL = mantleKeys(R, pr.H, pr.D); stateLabel = 'Быстрый заброс'; }
  else if (kind === 'step') { keysL = stepKeys(R, pr.H, pr.D); stateLabel = 'Шаг на уступ с опорой рукой'; }
  else if (kind === 'vault') { keysL = vaultKeys(R, pr.H, pr.D, pr.thick, pr.land - pr.edge.y); stateLabel = 'Перемах с опорой на руки'; }
  else if (kind === 'grab') { keysL = grabKeys(R, pr.H, pr.D); stateLabel = 'Прыжок и захват'; }
  else if (kind === 'catch') {
    const h = hangPose(R, 0);
    keysL = [{ t: 0 }, { ...h, t: 0.12, hips: [0, R.hangY + 0.06 * R.s, -0.3 * R.s], ease: 'out' }, { ...h, t: 0.32, hips: [0, R.hangY - 0.05 * R.s, -0.2 * R.s] }, { ...h, t: 0.48 }];
    stateLabel = 'Поймал край';
  }
  keysL[0] = liveKey(R);
  if (kind === 'catch') Object.assign(keysL[0], { whL: 0.3, whR: 0.3, wfL: 0, wfR: 0 }), keysL[0].fL = keysL[1].fL, keysL[0].fR = keysL[1].fR;
  a.layer = { keys: keysL, t: 0, kind, end: keysL[keysL.length - 1].t, P: null, w: 1 };
  a.state = 'ledge'; a.sub = kind; a.speed = 0; a.vy = 0;
  a.ch.stopAll(0.15); a.ch.setSpeed(0);
  a.hang = { u: 0, hand: { L: 0.2 * R.s, R: -0.2 * R.s }, step: null, t: 0 };
}

function updateActor(a, dt, inp, controlled) {
  const keep = stateLabel;
  updateActor2(a, dt, inp, controlled);
  if (!controlled) stateLabel = keep;
}
function updateActor2(a, dt, inp, controlled) {
  const ch = a.ch;
  a.oneshotDt = dt;
  if (a.state === 'ground') {
    // movement relative to the camera
    let mx = 0, mz = 0;
    if (controlled && (inp.f || inp.r)) {
      const cf = _v.set(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
      mx = cf.x * inp.f - cf.z * inp.r; mz = cf.z * inp.f + cf.x * inp.r;
      // screen right of a camera looking along cf is (-cf.z, 0, cf.x) mirrored: (-cos, 0, sin)
      mx = cf.x * inp.f - Math.cos(cam.yaw) * inp.r; mz = cf.z * inp.f + Math.sin(cam.yaw) * inp.r;
      if (script) { const y = script.demo.at[2]; mx = Math.sin(y) * inp.f - Math.cos(y) * inp.r; mz = Math.cos(y) * inp.f + Math.sin(y) * inp.r; }
      const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    }
    if (controlled && inp.turn) ch.yaw += inp.turn * dt * 2.2;
    const want = (mx || mz) ? (inp.run ? a.run : a.walk) : 0;
    const wDepth = Math.max(0, C.waterY(a.pos.x, a.pos.z) - a.feet);
    const slow = wDepth > 0.15 ? 0.6 : 1;
    a.speed += THREE.MathUtils.clamp(want * slow - a.speed, -dt * 9, dt * 6);
    if (mx || mz) {
      const ty = Math.atan2(mx, mz), d = angTo(ch.yaw, ty);
      ch.yaw += THREE.MathUtils.clamp(d, -dt * 9, dt * 9);
    }
    const f = a.fwd(_w);
    const nx = a.pos.x + f.x * a.speed * dt, nz = a.pos.z + f.z * a.speed * dt;
    let moved = false;
    if (!blockedAt(a, nx, nz)) { a.pos.x = nx; a.pos.z = nz; moved = true; }
    else if (!blockedAt(a, nx, a.pos.z)) { a.pos.x = nx; }
    else if (!blockedAt(a, a.pos.x, nz)) { a.pos.z = nz; }
    // pushing into something climbable: go over it after a moment
    if (!moved && a.speed > 0.3 && controlled) a.blockT += dt; else a.blockT = 0;
    let pr = null;
    if ((controlled && inp.space) || a.blockT > 0.35) {
      pr = script && script.demo.noProbe && inp.space ? null : probe(a, f);
      if (pr) {
        if (pr.kind === 'vault') { if (pr.H > 0.72) startLedge(a, pr, 'vault'); else startTrav(a, pr, a.speed > 2.4 ? 'vault_run' : 'vault'); }
        else if (pr.kind === 'up') startLedge(a, pr, 'step');
        else if (pr.kind === 'mantle') opt.newClimb ? startLedge(a, pr, 'mantle') : startTrav(a, pr, 'climb_old');
        else if (pr.kind === 'grab') opt.newClimb ? startLedge(a, pr, 'grab') : (pr.H <= 2.25 ? startTrav(a, pr, 'climb_old') : null);
        a.blockT = 0;
      } else if (controlled && inp.space && a.hero) {
        // plain jump
        a.state = 'air'; a.vy = 4.9; a.airT = 0; a.peak = a.feet; a.oneshot = ch.play('Jump', 0.1); a.jumpClip = true; stateLabel = 'Прыжок';
      }
    }
    if (a.state === 'ground') {
      const g = C.ground(a.pos.x, a.pos.z, a.feet + 0.5);
      if (g.y < a.feet - 0.32) { a.state = 'air'; a.vy = 0; a.airT = 0; a.peak = a.feet; a.jumpClip = false; }
      else {
        a.feet = g.y;
        const k = 1 - Math.exp(-dt * (a.pos.y < g.y ? 16 : 20));
        a.pos.y += (g.y - a.pos.y) * k;
      }
      ch.setSpeed(a.speed);
      a.ik.weight = 1;
      a.wbal += ((wDepth > 0.08 ? THREE.MathUtils.clamp((wDepth - 0.05) / 0.3, 0, 1) * 0.8 : 0) - a.wbal) * (1 - Math.exp(-dt * 3));
      if (a.state === 'ground' && !a.oneshot) stateLabel = wDepth > 0.15 ? 'Вброд: руки держат равновесие' : a.speed > 2.4 ? 'Бег' : a.speed > 0.2 ? 'Шаг' : 'Стойка';
    }
    if (a.hv) a.hv.set(f.x * a.speed, 0, f.z * a.speed);
  } else if (a.state === 'air') {
    a.airT += dt;
    a.vy -= GRAV * dt;
    // a little air control
    const p = a.pos;
    const nx = p.x + a.hv.x * dt, nz = p.z + a.hv.z * dt;
    if (!blockedAt(a, nx, nz)) { p.x = nx; p.z = nz; } else a.hv.multiplyScalar(0.3);
    p.y += a.vy * dt; a.feet = p.y; a.peak = Math.max(a.peak, p.y);
    if (a.oneshot && a.jumpClip) ch.setTime(a.oneshot, Math.min(1.0, 0.52 + a.airT * 0.9));
    ch.setSpeed(0); a.ik.weight = 0;
    // catch an edge on the way up or down
    if (a.hero && opt.newClimb && a.vy < 2.5 && !a.noCatch) {
      const pr = probe(a, a.fwd(_w));
      if (pr && pr.D < 0.6 && pr.H > a.R.hipsH + 0.35 && pr.H < a.R.reach + 0.08) { startLedge(a, pr, 'catch'); return; }
    }
    const g = C.ground(p.x, p.z, p.y + 0.05);
    if (p.y <= g.y && a.vy <= 0) {
      const drop = a.peak - g.y;
      p.y = g.y; a.feet = g.y; a.vy = 0;
      a.ch.stop(a.oneshot, 0.2); a.oneshot = null;
      if (drop > 1.5 && a.hero) {
        const fast = Math.hypot(a.hv.x, a.hv.z) > 2;
        a.land = { clip: fast ? 'Roll' : 'JumpDown', t: fast ? 0.0 : 1.05, t1: fast ? a.mocap.Roll.clip.duration : 2.3, h: ch.play(fast ? 'Roll' : 'JumpDown', 0.06) };
        a.state = 'land'; stateLabel = fast ? 'Жёсткое приземление: перекат' : 'Жёсткое приземление';
      } else { a.state = 'ground'; a.ik.pelvis = -Math.min(0.18, drop * 0.12) * a.s; }
    }
  } else if (a.state === 'land') {
    const L = a.land;
    L.t += dt * 1.15;
    ch.setTime(L.h, L.t);
    if (L.clip === 'Roll') { const f = a.fwd(_w); const nx = a.pos.x + f.x * 2.2 * dt, nz = a.pos.z + f.z * 2.2 * dt; if (!blockedAt(a, nx, nz)) { a.pos.x = nx; a.pos.z = nz; } }
    a.ik.weight = 0;
    if (L.t >= L.t1 - 0.2) { ch.stop(L.h, 0.25); a.state = 'ground'; a.speed = 0; }
  } else if (a.state === 'trav') {
    const tr = a.trav, T = tr.T;
    tr.t += dt * T.rate;
    const t = Math.min(tr.t, T.t1);
    ch.setTime(tr.h, t);
    const r = rootAt(a, T.clip, t).sub(tr.r0);
    const k = (t - T.t0) / (T.t1 - T.t0);
    const f = _v.set(Math.sin(tr.yaw), 0, Math.cos(tr.yaw)), l = _w.set(Math.cos(tr.yaw), 0, -Math.sin(tr.yaw));
    const p = a.pos;
    p.copy(tr.start).addScaledVector(f, r.z * tr.kz).addScaledVector(l, r.x * tr.kz * 0.5);
    p.y = tr.start.y + (tr.ky ? r.y * tr.ky : 0);
    // land exactly where planned
    const e = k * k * (3 - 2 * k);
    const endNow = new THREE.Vector3().copy(tr.start).addScaledVector(f, (rootAt(a, T.clip, T.t1).z - tr.r0.z) * tr.kz);
    p.x += (tr.end.x - endNow.x) * e; p.z += (tr.end.z - endNow.z) * e;
    if (tr.kind.startsWith('vault')) p.y = tr.start.y + (tr.end.y - tr.start.y) * Math.max(0, (k - 0.55) / 0.45);
    a.feet = p.y;
    a.ik.weight = k > 0.85 ? (k - 0.85) / 0.15 : 0;
    ch.setSpeed(0);
    if (tr.t >= T.t1) {
      ch.stop(tr.h, 0.25);
      a.feet = C.ground(p.x, p.z, p.y + 0.5).y; a.state = 'ground'; a.speed = 0; a.trav = null;
    }
  } else if (a.state === 'ledge') {
    ledgeStep(a, dt, inp);
  }
  // balance overlay weight (normalised blend: w/(1+w) of the pose)
  if (a.balance) { const w = a.state === 'ground' ? a.wbal : 0; a.wbalE = (a.wbalE || 0) + (w - (a.wbalE || 0)) * Math.min(1, dt * 4); a.balance.setEffectiveWeight(a.wbalE / Math.max(0.05, 1 - a.wbalE)); }
}

function ledgeStep(a, dt, inp) {
  const L = a.layer, R = a.R;
  L.t += dt;
  if (a.sub === 'hang') {
    const hg = a.hang; hg.t += dt;
    // shimmy along the edge
    const dir = script ? script.input.r * -1 : ((keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0));
    let moving = 0;
    if (dir) {
      const left = _v.set(Math.cos(R.frame.rotation.y), 0, -Math.sin(R.frame.rotation.y));
      const fw = _w.set(Math.sin(R.frame.rotation.y), 0, Math.cos(R.frame.rotation.y));
      const probeP = R.frame.position.clone().addScaledVector(left, dir * 0.42 * R.s);
      const topIn = C.obstacleTop(probeP.x + fw.x * 0.15, probeP.z + fw.z * 0.15, R.frame.position.y - 2.5, 3);
      if (Math.abs(topIn - R.frame.position.y) < 0.08) {
        const sp = 0.62 * R.s * dt * dir;
        R.frame.position.addScaledVector(left, sp); R.frame.updateMatrixWorld(true);
        hg.u += sp; moving = dir;
      }
    }
    const P = hangPose(R, hg.t);
    P.hips[0] += moving * 0.04 * R.s;
    // hands stay on the edge and step one at a time
    for (const s of ['L', 'R']) {
      const ideal = (s === 'L' ? 0.2 : -0.2) * R.s;
      const cur = hg.hand[s] - hg.u;
      if (!hg.step && Math.abs(cur - ideal) > 0.13 * R.s && (Math.sign(ideal - cur) === moving || !moving)) hg.step = { s, from: hg.hand[s], to: hg.u + ideal + moving * 0.09 * R.s, t: 0 };
    }
    if (hg.step) {
      const st = hg.step; st.t += dt / 0.2;
      const k = Math.min(1, st.t), e = k * k * (3 - 2 * k);
      hg.hand[st.s] = st.from + (st.to - st.from) * e;
      P['h' + st.s][1] += Math.sin(Math.PI * k) * 0.07 * R.s;
      P['h' + st.s][2] -= Math.sin(Math.PI * k) * 0.04 * R.s;
      if (k >= 1) hg.step = null;
    }
    P.hL[0] = hg.hand.L - hg.u; P.hR[0] = hg.hand.R - hg.u;
    // feet scuff along the wall with the body
    P.fL[0] += moving * 0.05 * R.s * Math.sin(hg.t * 9); P.fR[0] -= moving * 0.05 * R.s * Math.sin(hg.t * 9);
    L.P = P;
    stateLabel = moving ? 'Перехват вдоль края' : 'Вис';
    if (inp.f > 0 || inp.space) {
      const k = pullKeys(R); k[0] = { ...JSON.parse(JSON.stringify(P)), t: 0 };
      a.layer = { keys: k, t: 0, kind: 'pull', end: k[k.length - 1].t, P };
      a.sub = 'pull'; stateLabel = 'Подтягивание';
    } else if (inp.drop) {
      a.sub = 'drop'; a.layer.fade = 1; a.layer.off = R.frame.position.clone().sub(a.pos);
      const hipsW = R.toWorld(P.hips, new THREE.Vector3());
      a.state = 'air'; a.vy = 0; a.airT = 0; a.peak = hipsW.y - R.hipsH; a.pos.y = a.peak; a.feet = a.peak; a.hv.set(0, 0, 0);
      a.dropLayer = a.layer; a.layer = null; stateLabel = 'Спрыгнуть';
      a.noCatch = 0.5;
      return;
    }
  } else {
    L.P = sampleKeys(L.keys, Math.min(L.t, L.end), L.P || {});
    if (L.t >= L.end) {
      if (a.sub === 'grab' || a.sub === 'catch') { a.sub = 'hang'; a.layer = { keys: null, t: 0, P: L.P }; }
      else { // finished on top
        a.state = 'ground'; a.sub = ''; a.feet = C.ground(a.pos.x, a.pos.z, a.pos.y + 0.3).y; a.layer = null; a.speed = 0;
        a.ch.yaw = R.frame.rotation.y;
        return;
      }
    }
  }
  const P = a.layer.P;
  R.groupFor(P.hips, a.pos);
  a.feet = a.pos.y;
  a.ch.yaw = R.frame.rotation.y;
  a.ik.weight = 0;
  a.ch.setSpeed(0);
}

// ------------------------------------------------------------------ gallery
const GROUPS = {
  bogatyr: [
    ['Передвижение', [['Idle', 'Стойка'], ['Walk', 'Ходьба'], ['Run', 'Бег'], ['Jump', 'Прыжок'], ['Balance', 'Ход с равновесием (вода)']]],
    ['Новое: уступы (процедурно, IK)', [['@mantle', 'Быстрый заброс на 1,5 м', 1], ['@grab', 'Прыжок, захват, вис 2,3 м', 1], ['@shimmy', 'Перехват вдоль края', 1], ['@pull', 'Подтягивание из виса', 1], ['@catch', 'Поймать край в прыжке', 1], ['@drop', 'Спрыгнуть из виса', 1]]],
    ['Новое: ноги (IK)', [['@slope', 'Склон 15° вверх, 30° вниз', 1], ['@stairs', 'Ступени 18 см', 1], ['@bumps', 'Кочки', 1], ['@turn', 'Разворот на месте, без скольжения', 1]]],
    ['Перелезание', [['@vault', 'Через плетень 1 м, опора на руки', 1], ['@vaultrun', 'Перемах бревна с бега'], ['@up', 'На сундук 0,8 м, опора рукой', 1], ['@water', 'Из воды на мост'], ['@old', 'Старый подъём на стенку (было)'], ['@hard', 'Жёсткое приземление']]],
    ['Клипы мокапа: перемещение', [['StepOver'], ['StepOver2'], ['StepUp'], ['ClimbUp'], ['JumpDown'], ['Roll'], ['DiveRoll']]],
    ['Удары', [['Sw_A'], ['Sw_B'], ['Sw_C'], ['Sw_D'], ['Sw_E'], ['Sw_F'], ['Sw_G'], ['Sw_H'], ['Sw_I'], ['Sw_J'], ['Sw_K'], ['Sw_L'], ['Sw_M'], ['Sw_Duck'], ['Sw_Crouch'], ['Kick'], ['JumpKick'], ['Attack', 'Удар наискось (старый)'], ['Attack3', 'Удар сверху (старый)'], ['Attack4', 'Выпад (старый)']]],
    ['Падения', [['Stumble'], ['FallBack'], ['FallFace'], ['Hit', 'Получить удар'], ['Death', 'Падение (старое)']]],
  ],
  leshy: [
    ['Передвижение', [['Idle', 'Стойка'], ['Walk', 'Ходьба'], ['Run', 'Бег'], ['L_Shamble'], ['L_Crawl'], ['@slope', 'Склон 15° вверх, 30° вниз', 1], ['@stairs', 'Ступени 18 см', 1]]],
    ['Атаки', [['L_SwipeA'], ['L_SwipeB'], ['L_Smash'], ['L_Slam'], ['L_Pounce'], ['L_Reach'], ['L_Beat'], ['Attack', 'Удар (старый)']]],
    ['Реакции', [['L_Roar'], ['L_Stagger'], ['L_FallBack'], ['Hit', 'Получить удар'], ['Death', 'Падение (старое)']]],
  ],
};
// scripted demos on the course: [seconds, input] with optional teleport
const DEMOS = {
  '@mantle': { at: [6.75, 5.55, 0], steps: [[0.5, {}], [0.05, { space: 1 }], [1.6, {}]] , cam: 'side' },
  '@grab': { at: [14, 3.45, 0], steps: [[0.5, {}], [0.05, { space: 1 }], [1.6, {}], [0.05, { f: 1 }], [1.8, {}]] , cam: 'side' },
  '@shimmy': { at: [15, 3.55, 0], steps: [[0.3, {}], [0.05, { space: 1 }], [0.9, {}], [1.6, { r: -1 }], [0.6, {}], [1.6, { r: 1 }], [0.6, {}], [0.05, { f: 1 }], [1.6, {}]] , cam: 'side' },
  '@pull': { at: [13, 3.45, 0], steps: [[0.2, {}], [0.05, { space: 1 }], [1.1, {}], [0.05, { f: 1 }], [1.8, {}]] , cam: 'side' },
  '@catch': { at: [12.5, 3.1, 0], steps: [[0.3, {}], [0.25, { f: 1, run: 1 }], [0.05, { f: 1, run: 1, space: 1 }], [1.6, {}], [0.05, { f: 1 }], [1.6, {}]], noProbe: 1 , cam: 'side' },
  '@drop': { at: [16, 3.45, 0], steps: [[0.3, {}], [0.05, { space: 1 }], [1.3, {}], [0.3, { drop: 1 }], [1.6, {}]] , cam: 'side' },
  '@slope': { at: [-8.5, 0.6, 0], steps: [[5.4, { f: 1 }], [1.0, {}]], cam: 'side', low: 1 },
  '@stairs': { at: [-3.75, 1.0, 0], steps: [[5.8, { f: 1 }], [1.0, {}]], cam: 'side', low: 1 },
  '@bumps': { at: [-4.5, 13.5, Math.PI / 2], steps: [[2.6, { f: 1 }], [0.7, { f: 1, run: 1 }], [1.0, {}]], cam: 'side', low: 1 },
  '@turn': { at: [2, -3, 0], steps: [[0.6, {}], [1.4, { turn: 1 }], [0.6, {}], [1.4, { turn: -1 }], [0.8, {}]], camFix: 1, low: 1 },
  '@vault': { at: [6.75, 1.6, 0], steps: [[0.6, { f: 1 }], [0.05, { f: 1, space: 1 }], [1.8, {}]] , cam: 'side' },
  '@vaultrun': { at: [2, -0.8, 0], steps: [[1.0, { f: 1, run: 1 }], [0.05, { f: 1, run: 1, space: 1 }], [1.8, { f: 1 }], [0.5, {}]] , cam: 'side' },
  '@up': { at: [1.7, 5.3, 0], steps: [[0.6, { f: 1 }], [0.05, { space: 1 }], [2.0, {}]] , cam: 'side' },
  '@water': { at: [9, 12.3, 0], steps: [[2.0, { f: 1 }], [0.05, { f: 1, space: 1 }], [2.2, {}]] , cam: 'side' },
  '@old': { at: [6.75, 5.55, 0], steps: [[0.5, {}], [0.05, { space: 1 }], [3.4, {}]], old: 1 , cam: 'side' },
  '@hard': { at: [15, 6.4, Math.PI], steps: [[0.5, {}], [1.6, { f: 1, run: 1 }], [2.2, {}]] , cam: 'side' },
};
let gsel = null, gplay = true, gtime = 0;

function labelOf(a, id, given) {
  if (given) return given;
  const m = a.mocap[id]?.meta; return m ? m.label : id;
}
function durOf(a, id) {
  if (id.startsWith('@')) return DEMOS[id].steps.reduce((s, x) => s + x[0], 0);
  return a.ch.clips[id]?.duration || 0;
}
function buildList() {
  const L = $('list'); L.innerHTML = '';
  const a = act;
  for (const [g, items] of GROUPS[a.model]) {
    const h = document.createElement('h5'); h.textContent = g; L.appendChild(h);
    for (const [id, name, isNew] of items) {
      if (!id.startsWith('@') && !a.ch.clips[id]) continue;
      const d = document.createElement('div'); d.className = 'it'; d.dataset.id = id;
      d.innerHTML = `<span>${labelOf(a, id, name)}${isNew ? ' <span class="new">НОВОЕ</span>' : ''}</span><small>${fmt(durOf(a, id))} с</small>`;
      d.onclick = () => selectItem(id);
      L.appendChild(d);
    }
  }
}
function selectItem(id) {
  gsel = id; gtime = 0; gplay = true; $('play').textContent = '❚❚';
  for (const e of document.querySelectorAll('#list .it')) e.classList.toggle('on', e.dataset.id === id);
  const a = act;
  const nameEl = document.querySelector(`#list .it[data-id="${CSS.escape(id)}"] span`);
  $('tname').textContent = nameEl ? nameEl.firstChild.textContent : id;
  startGalleryItem();
  const m = a.mocap[id]?.meta;
  const info = $('info');
  if (id.startsWith('@')) info.innerHTML = `<b>${$('tname').textContent}</b><br>Сценка на полигоне: тот же код, что при игре с клавиатуры.`;
  else info.innerHTML = `<b>${$('tname').textContent}</b><br>${m ? `Мокап ${m.src}, перенесён на скелет` : 'Клип из модели'} · ${fmt(durOf(a, id))} с`;
}
function startGalleryItem() {
  const a = act, id = gsel;
  for (const o of actors) o.ch.group.visible = o === a;
  script = null;
  if (!id) return;
  if (id.startsWith('@')) {
    const D = DEMOS[id];
    a.reset(D.at[0], D.at[1], D.at[2]);
    opt.newClimb = !D.old; syncClimbButtons();
    script = { demo: D, t: 0, i: 0, input: {} , st: 0};
    if (D.cam) setView(D.cam); else if (opt.view === 'side' && !D.cam) setView('back');
    cam.yaw = D.at[2]; cam.snap = true;
  } else {
    a.reset(STAGE.x, STAGE.z, 0);
    a.state = 'gallery';
    a.ghandle = a.ch.play(id, 0.01);
    cam.snap = true;
  }
}
function galleryClipStep(a, dt) {
  const id = gsel, ch = a.ch, clip = ch.clips[id];
  if (gplay) gtime += dt;
  const dur = clip.duration, hold = 0.5;
  const cyc = gtime % (dur + hold);
  const t = Math.min(dur, cyc);
  ch.setTime(a.ghandle, t);
  ch.setSpeed(0);
  // root motion of mocap clips (loops back to the start)
  const m = a.mocap[id]?.meta;
  if (m && m.root && m.root.length) {
    const r = rootAt(a, id, t);
    a.pos.set(STAGE.x + r.x, STAGE.y + r.y, STAGE.z + r.z);
  } else a.pos.copy(STAGE);
  a.feet = a.pos.y;
  a.ik.weight = ['Idle', 'Walk', 'Run', 'Balance', 'L_Shamble', 'L_Crawl'].includes(id) ? 1 : 0;
  $('scrub').value = Math.round((t / dur) * 1000);
  $('ttime').textContent = fmt(t) + ' / ' + fmt(dur) + ' с';
  stateLabel = $('tname').textContent;
}
function scriptStep(dt) {
  const S = script, D = S.demo;
  S.t += dt; S.st += dt;
  while (S.i < D.steps.length && S.st >= D.steps[S.i][0]) { S.st -= D.steps[S.i][0]; S.i++; S.fired = false; }
  if (S.i >= D.steps.length) { startGalleryItem(); return; }
  const inp = D.steps[S.i][1];
  S.input = { f: inp.f || 0, r: inp.r || 0, turn: inp.turn || 0, run: !!inp.run, space: !!inp.space && !S.fired, drop: !!inp.drop };
  if (inp.space) S.fired = true;
  const total = durOf(act, gsel);
  $('scrub').value = Math.round((S.t / total) * 1000);
  $('ttime').textContent = fmt(S.t) + ' / ' + fmt(total) + ' с';
}

// ------------------------------------------------------------------ camera
const cam = { zoom: 1, yaw: 0, pitch: 0.28, dist: 4.2, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true, side: 0 };
function setView(v) {
  opt.view = v;
  for (const b of document.querySelectorAll('#views button')) b.classList.toggle('on', b.dataset.v === v);
}
function updateCamera(dt) {
  if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
  const a = act;
  const s = a.ch.height / 1.53;
  const tgt = _v.copy(a.pos); tgt.y += (a.state === 'ledge' ? 0.4 : script && script.demo.low ? 0.5 : 1.05) * s;
  if (opt.mode === 'gallery' && !script) tgt.y = a.pos.y + 0.85 * s;
  if (keys.ArrowLeft) cam.yaw += dt * 1.8;
  if (keys.ArrowRight) cam.yaw -= dt * 1.8;
  if (keys.ArrowUp) cam.pitch = Math.min(1.1, cam.pitch + dt);
  if (keys.ArrowDown) cam.pitch = Math.max(-0.1, cam.pitch - dt);
  // follow behind the hero while moving (game camera), or hold a fixed angle for review
  const viewOff = opt.view === 'side' ? Math.PI / 2 : opt.view === 'front' ? Math.PI : 0;
  const scripted = script && script.demo.camFix;
  if (opt.mode === 'course' && !script) {
    if (a.state === 'ground' && a.speed > 0.6 && opt.view === 'back' && !keys.ArrowLeft && !keys.ArrowRight) cam.yaw += angTo(cam.yaw, a.ch.yaw) * (1 - Math.exp(-dt * 1.4));
  } else if (!scripted) {
    const want = (opt.mode === 'gallery' && !script ? Math.PI * 0.82 : a.ch.yaw) + viewOff * (opt.mode === 'gallery' && !script ? 0 : 1);
    if (!keys.ArrowLeft && !keys.ArrowRight) cam.yaw += angTo(cam.yaw, want + (opt.mode === 'gallery' && !script ? viewOff : 0)) * (cam.snap ? 1 : 1 - Math.exp(-dt * 2.5));
  }
  const dist = (opt.mode === 'gallery' && !script ? 3.6 : a.state === 'ledge' ? 4.6 : 4.3) * Math.max(1, s * 0.9) * cam.zoom;
  const yaw = cam.yaw + (opt.mode === 'course' && !script ? viewOff : 0);
  const want = _w.set(tgt.x - Math.sin(yaw) * Math.cos(cam.pitch) * dist, tgt.y + Math.sin(cam.pitch) * dist, tgt.z - Math.cos(yaw) * Math.cos(cam.pitch) * dist);
  const k = cam.snap ? 1 : 1 - Math.exp(-dt * 6);
  cam.pos.lerp(want, k); cam.look.lerp(tgt, cam.snap ? 1 : 1 - Math.exp(-dt * 10));
  cam.snap = false;
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  sun.position.set(a.pos.x + 5, a.pos.y + 12, a.pos.z + 7); sun.target.position.copy(a.pos);
}

// ------------------------------------------------------------------ weapons
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
function stowWeapons(a) {
  // sword and shield on the back: oriented by the chest (spine -> neck) and the facing
  const b = a.R.b;
  const chest = b.Spine2.getWorldPosition(new THREE.Vector3()), neck = b.Neck.getWorldPosition(new THREE.Vector3());
  const up = _y.subVectors(neck, chest).normalize();
  const fw = a.fwd(_z); b.Spine2.getWorldQuaternion(_q0); const f2 = new THREE.Vector3(0, 0, 1);
  // forward of the chest: hips facing bent by the spine
  fw.addScaledVector(up, -fw.dot(up)).normalize();
  const left = _x.crossVectors(up, fw).normalize();
  // shield: flat on the back, disc normal (+Y) facing backwards
  a.shield.position.copy(chest).addScaledVector(fw, -0.2 * a.s).addScaledVector(up, 0.02 * a.s);
  _m.makeBasis(left, _w.copy(fw).negate(), up);
  a.shield.quaternion.setFromRotationMatrix(_m);
  // sword: diagonal across the back, hilt over the right shoulder, tip down to the left hip
  const blade = new THREE.Vector3().copy(up).negate().addScaledVector(left, 0.5).normalize();
  const flat = new THREE.Vector3().copy(fw).negate();
  flat.addScaledVector(blade, -flat.dot(blade)).normalize();
  const xx = new THREE.Vector3().crossVectors(blade, flat).normalize();
  _m.makeBasis(xx, blade, flat);
  a.sword.quaternion.setFromRotationMatrix(_m);
  a.sword.position.copy(chest).addScaledVector(fw, -0.26 * a.s).addScaledVector(up, 0.3 * a.s).addScaledVector(left, -0.17 * a.s);
}
const _q0 = new THREE.Quaternion();

// ------------------------------------------------------------------ debug markers
const dbg = new THREE.Group(); scene.add(dbg); dbg.visible = false;
const mk = (c, r = 0.035) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true })); m.renderOrder = 10; dbg.add(m); return m; };
const DM = { fl: mk(0xe2c27f), fr: mk(0xe2c27f), hl: mk(0x6fa3c4), hr: mk(0x6fa3c4) };
const discs = [0, 1].map(() => { const d = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 24), new THREE.MeshBasicMaterial({ color: 0x7fae6a, depthTest: false, transparent: true, side: THREE.DoubleSide })); d.renderOrder = 10; d.rotation.x = -Math.PI / 2; dbg.add(d); return d; });

// ------------------------------------------------------------------ Бой (duel library)
// procedural full-body poses (combat.js) on both actors; scenes from duel.js
const DS = new THREE.Vector3(30, 0, -16);
hero.pr = new PoseRig(hero); leshy.pr = new PoseRig(leshy);
const D = { sc: null, id: '', t: 0, last: 0, shake: 0, fx: [], note: '', log: [], flash: 0, shot: null, look: new THREE.Vector3() };
const _bo = { base: new THREE.Vector3(), tip: new THREE.Vector3() };
function restPose(a) { for (const [b, q, p] of a.rest) { b.quaternion.copy(q); b.position.copy(p); } }
// a striking point of the actor in world space (call after the pose is applied)
function strikePoint(a, src, out = new THREE.Vector3()) {
  const b = a.R.b;
  if (src === 'blade') { a.rig.update(_bo); return out.copy(_bo.base).lerp(_bo.tip, 0.7); }
  if (src === 'shield') return a.shield.getWorldPosition(out);
  if (src === 'footR') return b.RightToeBase.getWorldPosition(out);
  if (src === 'body') return b.Spine2.getWorldPosition(out);
  if (b[src]) return b[src].getWorldPosition(out);
  const claw = (s, o) => { const h = b[s + 'Hand'].getWorldPosition(new THREE.Vector3()), m = b[s + 'HandMiddle1'].getWorldPosition(new THREE.Vector3()); return o.copy(h).addScaledVector(m.sub(h), 2.2); };
  if (src === 'clawR') return claw('Right', out);
  if (src === 'clawL') return claw('Left', out);
  claw('Right', out); const l = claw('Left', new THREE.Vector3()); return out.lerp(l, 0.5);
}
// pose an actor alone at the origin (yaw 0) and read something off it
function probeAt(a, keys, t, fn) {
  const g = a.ch.group, keep = [g.position.clone(), a.ch.yaw];
  g.position.set(0, 0, 0); a.ch.yaw = 0; a.ch.pivot.position.set(0, 0, 0); a.ch.pivot.quaternion.identity(); g.updateMatrixWorld(true);
  restPose(a); a.pr.apply(sampleKeysC(keys, t), 1); if (a.hero) { a.rig.tilt = 0; a.rig.update(); }
  const r = fn(a);
  g.position.copy(keep[0]); a.ch.yaw = keep[1]; g.updateMatrixWorld(true);
  return r;
}
window.__ctx = () => ctx;
const ctx = {
  runSpeed: hero.ch.loco.Run.speed,
  info: {},
  point: (who, keys, t, src) => probeAt(who === 'hero' ? hero : leshy, keys, t, (a) => strikePoint(a, src).clone()),
  heroPoint: (mv) => probeAt(hero, mv.keys, mv.hit, (a) => strikePoint(a, mv.src)),
  leshyPoint: (mv) => probeAt(leshy, mv.keys, mv.hit, (a) => strikePoint(a, mv.src || 'claws')),
  finDistance(mv, vic, tImp) {
    const p = probeAt(hero, mv.keys, mv.hit, (a) => strikePoint(a, 'blade'));
    const c = probeAt(leshy, vic.keys, tImp, (a) => a.R.b.Spine2.getWorldPosition(new THREE.Vector3()));
    D.finInfo = { bladeY: +p.y.toFixed(2), chestY: +c.y.toFixed(2) };
    return p.z + c.z + 0.1;
  },
};
const SCENES = buildScenes(ctx);
for (const a of actors) { restPose(a); a.ch.update(0, null); }
const LOOPS = new Set(['Run', 'Walk', 'Idle']);
{ // duel ground marks
  const r = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.64, 72), new THREE.MeshBasicMaterial({ color: 0xc9a25e, transparent: true, opacity: 0.45 }));
  r.rotation.x = -Math.PI / 2; r.position.set(DS.x, 0.004, DS.z - 1); scene.add(r);
}
function enterDuel() {
  for (const a of actors) { a.ch.group.visible = true; a.reset(DS.x, DS.z, 0); a.state = 'duel'; a.dseg = undefined; }
  const L = $('list'); L.innerHTML = '';
  for (const [g, ids] of DUEL_GROUPS) {
    const h = document.createElement('h5'); h.textContent = g; L.appendChild(h);
    for (const id of ids) {
      const sc = SCENES[id]; if (!sc) continue;
      const d = document.createElement('div'); d.className = 'it'; d.dataset.id = id;
      d.innerHTML = `<span>${sc.name}</span><small>${fmt(sc.dur)} с</small>`;
      d.onclick = () => selectDuel(id); L.appendChild(d);
    }
  }
  setView('side');
  selectDuel('stance');
}
function selectDuel(id) {
  D.id = id; D.sc = SCENES[id]; D.t = 0; D.last = 0; D.shot = null; D.flash = 0; for (const T of TR) T.hist.length = 0; gplay = true; $('play').textContent = '❚❚'; D.log = [];
  for (const a of actors) { a.dseg = undefined; a.ch.stopAll(0.05); }
  for (const e of document.querySelectorAll('#list .it')) e.classList.toggle('on', e.dataset.id === id);
  $('tname').textContent = D.sc.name;
  const hm = D.sc.notes.map((n) => n[1]);
  $('info').innerHTML = `<b>${D.sc.name}</b><br>${[...new Set(hm)].join(' → ') || 'Тайминги из боя в игре'}`;
  cam.snap = true;
}
// effects: hit spark, ground ring
const sparkTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.25, 'rgba(255,214,140,.9)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,240,200,.95)'; g.lineWidth = 3;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3; g.beginPath(); g.moveTo(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14); g.lineTo(64 + Math.cos(a) * (40 + (i % 3) * 10), 64 + Math.sin(a) * (40 + (i % 3) * 10)); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function addFx(kind, at) {
  if (kind === 'ring') {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: at.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.copy(at.p); m.position.y = 0.03; scene.add(m);
    D.fx.push({ m, t: 0, life: 0.7, up(f, k) { const r = 0.3 + at.r * (1 - (1 - k) * (1 - k)); f.m.scale.setScalar(r); f.m.material.opacity = 0.8 * (1 - k); } });
  } else {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: at.color || 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    m.position.copy(at.p); m.renderOrder = 20; scene.add(m);
    const big = at.big || 1;
    D.fx.push({ m, t: 0, life: 0.28, up(f, k) { f.m.scale.setScalar((0.25 + 0.75 * Math.sqrt(k)) * 0.8 * big); f.m.material.opacity = 1 - k; f.m.material.rotation = k * 0.6; } });
  }
}
// cinematic effects: dust puffs, wood / bark chips, screen flash, blade and claw trails
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = 32 + (Math.random() - 0.5) * 18, y = 32 + (Math.random() - 0.5) * 18, r = 12 + Math.random() * 12;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const chipGeo = new THREE.PlaneGeometry(1, 1);
function fxPoint(e) {
  const a = e.who === 'hero' ? hero : leshy;
  return e.src ? strikePoint(a, e.src) : a.R.b[e.bone || 'Hips'].getWorldPosition(new THREE.Vector3());
}
function cineFx(e) {
  if (e.kind === 'flash') { D.flash = Math.max(D.flash, e.s); $('flash').style.background = e.color || '#fff6e0'; return; }
  if (e.kind === 'shake') { D.shake = Math.max(D.shake, e.s); return; }
  const p = fxPoint(e);
  if (e.kind === 'ring') { p.y = 0; addFx('ring', { p, r: e.r, color: 0xe6e0b0 }); return; }
  if (e.kind === 'dust') {
    for (let i = 0; i < e.n; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: 0xb8a586, transparent: true, depthWrite: false, opacity: 0 }));
      const a = (i / e.n) * Math.PI * 2 + Math.random() * 0.5, sp = (0.6 + Math.random() * 0.8) * e.r;
      m.position.set(p.x + Math.cos(a) * 0.2, 0.12 + Math.random() * 0.1, p.z + Math.sin(a) * 0.2); scene.add(m);
      const v = new THREE.Vector3(Math.cos(a) * sp, 0.25 + Math.random() * 0.35, Math.sin(a) * sp), s0 = 0.25 + Math.random() * 0.2, life = 1.2 + Math.random() * 0.8;
      D.fx.push({ m, t: 0, life, up(f, k) { v.multiplyScalar(Math.exp(-f.dt * 2.6)); f.m.position.addScaledVector(v, f.dt); f.m.scale.setScalar(s0 + e.r * 0.7 * Math.sqrt(k)); f.m.material.opacity = 0.5 * Math.min(1, k * 8) * (1 - k); f.m.material.rotation += f.dt * 0.4; } });
    }
    return;
  }
  // chips (bark and leaves from the Leshy) or splinters (the shield)
  const wood = e.kind === 'splinters';
  const cols = wood ? [0x7a5634, 0x5b3d22, 0xa27a4c, 0x3e2a18] : [0x3f5a2a, 0x5f4528, 0x8fa04a, 0x2d3f1f, 0xb59b5a];
  const away = new THREE.Vector3().subVectors(p, (e.who === 'hero' ? leshy : hero).pos); away.y = 0; away.normalize();
  for (let i = 0; i < e.n; i++) {
    const m = new THREE.Mesh(chipGeo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], transparent: true, side: THREE.DoubleSide, depthWrite: true }));
    const L = wood ? 0.07 + Math.random() * 0.08 : 0.03 + Math.random() * 0.04;
    m.scale.set(L, wood ? 0.018 : L * 0.6, 1); m.position.copy(p); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); scene.add(m);
    const v = new THREE.Vector3((Math.random() - 0.5) * 2.4, 0.8 + Math.random() * 2.4, (Math.random() - 0.5) * 2.4).addScaledVector(away, 1.2 + Math.random() * 1.6);
    const w = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(18);
    D.fx.push({ m, t: 0, life: 2.4, up(f, k) {
      if (f.m.position.y > 0.012) { v.y -= 7.5 * f.dt; v.multiplyScalar(Math.exp(-f.dt * (wood ? 0.6 : 1.8))); f.m.position.addScaledVector(v, f.dt); f.m.rotation.x += w.x * f.dt; f.m.rotation.y += w.y * f.dt; f.m.rotation.z += w.z * f.dt; }
      if (f.m.position.y <= 0.012) { f.m.position.y = 0.012; f.m.rotation.x = -Math.PI / 2; }
      f.m.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }, keep: true });
  }
}
const TR = [];
function trailMesh(i) {
  if (TR[i]) return TR[i];
  const N = 24, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 8), 4));
  const idx = []; for (let k = 0; k < N - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.frustumCulled = false; m.renderOrder = 15; scene.add(m);
  return (TR[i] = { m, N, hist: [] });
}
function trailEnds(src, a, b) {
  if (src === 'blade') { hero.rig.update(_bo); a.copy(_bo.base).lerp(_bo.tip, 0.3); b.copy(_bo.tip); return; }
  if (src === 'footR') { hero.R.b.RightLeg.getWorldPosition(a).lerp(hero.R.b.RightFoot.getWorldPosition(b), 0.7); hero.R.b.RightToeBase.getWorldPosition(b); return; }
  const s = src === 'clawR' ? 'Right' : 'Left';
  leshy.R.b[s + 'Hand'].getWorldPosition(a); strikePoint(leshy, src, b); a.lerp(b, 0.35);
}
function updateTrails(sc, t) {
  const list = sc.trail || [];
  for (let i = 0; i < Math.max(list.length, TR.length); i++) {
    const T = trailMesh(i), sp = list[i];
    if (!sp) { T.m.visible = false; T.hist.length = 0; continue; }
    if (t >= sp.t0 && t <= sp.t1 && (!T.hist.length || t > T.hist[T.hist.length - 1].t + 1e-4)) {
      const a = new THREE.Vector3(), b = new THREE.Vector3(); trailEnds(sp.src, a, b); T.hist.push({ t, a, b });
    }
    while (T.hist.length && (T.hist[0].t < t - 0.09 || T.hist[0].t > t + 1e-3 || T.hist.length > T.N)) T.hist.shift();
    const n = T.hist.length; T.m.visible = n > 1;
    if (n < 2) continue;
    const P = T.m.geometry.attributes.position.array, C = T.m.geometry.attributes.color.array;
    const col = sp.src === 'blade' ? [1, 0.9, 0.7] : sp.src === 'footR' ? [0.9, 0.85, 0.7] : [0.55, 0.9, 0.5];
    for (let k = 0; k < T.N; k++) {
      const h = T.hist[Math.min(n - 1, k)], f = k < n ? Math.pow(k / (n - 1), 1.6) * 0.8 : 0;
      P.set([h.a.x, h.a.y, h.a.z, h.b.x, h.b.y, h.b.z], k * 6);
      C.set([col[0], col[1], col[2], f * 0.35, col[0], col[1], col[2], f], k * 8);
    }
    T.m.geometry.attributes.position.needsUpdate = true; T.m.geometry.attributes.color.needsUpdate = true;
    T.m.geometry.setDrawRange(0, (Math.min(n, T.N) - 1) * 6);
  }
}
// closest points between segments p1-q1 and p2-q2
function segDist(p1, q1, p2, q2, out) {
  const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), bb = d1.dot(d2), den = a * e - bb * bb;
  let s = den > 1e-8 ? THREE.MathUtils.clamp((bb * f - c * e) / den, 0, 1) : 0;
  let t = (bb * s + f) / e;
  if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((bb - c) / a, 0, 1); }
  const c1 = p1.clone().addScaledVector(d1, s), c2 = p2.clone().addScaledVector(d2, t);
  if (out) out.copy(c1);
  return c1.distanceTo(c2);
}
// body axis for hit tests: from mid-thigh up to the neck
function bodyAxis(a) { const h = a.R.b.Hips.getWorldPosition(new THREE.Vector3()), n = a.R.b.Neck.getWorldPosition(new THREE.Vector3()); return [h.clone().add(new THREE.Vector3(0, -0.3 * a.s, 0)), n]; }
function duelHit(h) {
  const kinds = { light: 0.18, heavy: 0.45, kick: 0.35, finisher: 0.7, block: 0.25 };
  D.shake = Math.max(D.shake, kinds[h.kind] ?? 0.4);
  if (h.who === 'ground') {
    const p = strikePoint(leshy, 'claws'); p.y = 0;
    if (h.kind === 'roar') p.copy(leshy.pos);
    const col = { leap: 0xe6e0b0, leapS: 0xe6e0b0, roar: 0x9fe0aa }[h.kind] || 0xffffff;
    const r = { leap: 2.7, leapS: 2.0, roar: 4.0 }[h.kind] || 1.4;
    addFx('ring', { p, r, color: col });
    D.log.push({ t: +D.t.toFixed(2), kind: h.kind, src: h.src, heroDist: +Math.hypot(hero.pos.x - p.x, hero.pos.z - p.z).toFixed(2), r });
    return;
  }
  const by = h.who === 'hero' ? leshy : hero, vic = h.who === 'hero' ? hero : leshy;
  const p = new THREE.Vector3(); let dist = 0;
  const [a0, a1] = bodyAxis(vic);
  if (h.src === 'blade') { hero.rig.update(_bo); dist = segDist(_bo.base, _bo.tip, a0, a1, p); }
  else if (h.src === 'shield' && h.who === 'hero') {   // a blocked claw: spark on the shield face
    hero.shield.getWorldPosition(p);
    const c = strikePoint(leshy, LESHY_SRC[D.id] || 'claws'); dist = c.distanceTo(p);
    p.addScaledVector(c.clone().sub(p).normalize(), 0.06);
  } else {
    strikePoint(by, h.src, p);
    if (h.src === 'body') vic.R.b.Spine2.getWorldPosition(p);
    dist = segDist(p, p.clone().add(new THREE.Vector3(0, 1e-3, 0)), a0, a1);
  }
  D.log.push({ t: +D.t.toFixed(2), who: h.who, kind: h.kind, src: h.src, dist: +dist.toFixed(2), y: +p.y.toFixed(2) });
  addFx('spark', { p, big: h.kind === 'finisher' ? 2 : h.kind === 'heavy' || h.kind === 'kick' ? 1.4 : 1, color: h.kind === 'block' ? 0xfff2c0 : 0xffd6a0 });
}
const LESHY_SRC = { swBlock: 'clawR', smBlock: 'claws', roar: 'claws', ...FIN_SRC };
const _P0 = {}, _P1 = {}, _P2 = {};
function segPose(seg, t, out) {
  let lt = t - seg.t;
  if (seg.mv.loop) lt = ((lt % seg.mv.dur) + seg.mv.dur) % seg.mv.dur;
  return sampleKeysC(seg.mv.keys, lt, out);
}
function duelSim(dt) {
  const sc = D.sc; if (!sc) return;
  const ts = sc.ts ? keyAt(sc.ts, D.t) : 1;
  const sdt = dt * ts;
  if (gplay) {
    D.t += sdt;
    if (D.t > sc.dur + 0.6) { D.t = 0; D.last = 0; D.shot = null; for (const T of TR) T.hist.length = 0; for (const a of actors) { a.dseg = undefined; a.ch.stopAll(0.15); } }
  }
  const t = Math.min(D.t, sc.dur);
  for (const [nt, text] of sc.notes) if (nt <= t) D.note = text;
  if (t < 0.05) D.note = sc.notes.length ? sc.notes[0][1] : sc.name;
  for (const a of actors) {
    const who = a.hero ? 'hero' : 'leshy', ch = a.ch;
    const seg = activeSeg(sc.seg[who], t);
    if (seg !== a.dseg) {
      a.dseg = seg;
      if (seg && seg.clip) a.dh = ch.play(seg.clip, seg.fade); else { ch.stopAll(0.2); a.dh = null; }
    }
    if (a.dh && seg && seg.clip) {
      const ct = dwarp(seg.keys, t - seg.t);
      ch.setTime(a.dh, LOOPS.has(seg.clip) ? ct % a.dh.duration : ct);
    }
    const p = keyAt(sc.pos[who], t), y = keyAt(sc.yaw[who], t);
    a.pos.set(DS.x + p[0], 0, DS.z + p[1]); ch.yaw = y; a.feet = 0;
    ch.pivot.position.set(0, 0, 0); ch.pivot.quaternion.identity();
    ch.setSpeed(0);
    restPose(a);
    ch.update(sdt, null);
    if (seg && seg.mv) {
      let P = segPose(seg, t, _P1), w = 1;
      const pv = seg.prev, u = seg.fade > 0 ? (t - seg.t) / seg.fade : 1;
      if (u < 1 && pv) {
        const s = u * u * (3 - 2 * u);
        if (pv.mv) {
          const P0 = segPose(pv, t, _P0);
          if (!pv.mv.loop && pv.mv.adv) for (const f of ['hips', 'fL', 'fR']) { P0[f][0] -= pv.mv.adv[0]; P0[f][2] -= pv.mv.adv[1]; }
          P = lerpPose(P0, P, s, _P2);
        } else w = s;
      }
      a.pr.apply(P, w);
      a.miss = a.pr.miss;
    }
    if (a.hero) { a.rig.tilt = seg && seg.clip ? 0.22 : 0; a.rig.update(); }
  }
  // hits crossed this frame (after the poses, so sparks sit where the blade / claws really are)
  for (const h of sc.hits) if (h.t > D.last && h.t <= t) duelHit(h);
  for (const e of sc.fx) if (e.t > D.last && e.t <= t) cineFx(e);
  D.last = t;
  const fdt = dt * Math.max(ts, 0.3);
  for (let i = D.fx.length - 1; i >= 0; i--) {
    const f = D.fx[i]; f.dt = fdt; f.t += fdt; const k = Math.min(1, f.t / f.life); f.up(f, k);
    if (k >= 1) { scene.remove(f.m); f.m.material.dispose(); D.fx.splice(i, 1); }
  }
  updateTrails(sc, t);
  const cine = !!(sc.cine && t >= sc.cine.t0 && t <= sc.cine.t1);
  $('cine').classList.toggle('on', cine);
  const capOn = cine && t >= sc.cine.t0 + 0.25 && t <= sc.cine.t0 + 3.0;
  if (capOn && $('cap').dataset.id !== D.id) { $('cap').dataset.id = D.id; $('cap').innerHTML = `<b>${sc.cine.title}</b><span>${sc.cine.sub}</span>`; }
  $('cap').classList.toggle('on', capOn);
  D.flash *= Math.exp(-dt * 5); $('flash').style.opacity = D.flash.toFixed(3);
  $('scrub').value = Math.round((t / sc.dur) * 1000);
  $('ttime').textContent = fmt(t) + ' / ' + fmt(sc.dur) + ' с' + (ts < 0.95 ? ' · замедление' : '');
  stateLabel = D.note;
  duelCamera(dt, t);
  $('state').textContent = stateLabel;
  updateKeysHint();
}
function duelCamera(dt, t) {
  const sc = D.sc;
  let pos, look, fov = 50;
  const local = (v) => new THREE.Vector3(DS.x + v[0], v[1], DS.z + v[2]);
  const S = sc.shots && sc.shots.find((s) => t >= s.t0 && t < s.t1);
  if (S) {
    const bone = (a, n) => a.R.b[n || 'Spine2'].getWorldPosition(new THREE.Vector3());
    const L = S.look, tgt = L.who === 'mid' ? bone(hero, L.bone).lerp(bone(leshy, L.bone), L.k ?? 0.5) : bone(L.who === 'hero' ? hero : leshy, L.bone);
    if (L.off) tgt.add(new THREE.Vector3(L.off[0], L.off[1], L.off[2]));
    const cut = S !== D.shot || cam.snap; D.shot = S;
    if (cut) D.look.copy(tgt); else D.look.lerp(tgt, 1 - Math.exp(-dt * 7));
    const [az, el, dist, fv] = keyAt(S.orbit, t - S.t0);
    cam.pos.set(D.look.x + Math.sin(az) * Math.cos(el) * dist, Math.max(0.22, D.look.y + Math.sin(el) * dist), D.look.z + Math.cos(az) * Math.cos(el) * dist);
    cam.look.copy(D.look); cam.snap = false;
    camera.fov = fv; camera.updateProjectionMatrix();
    D.shake *= Math.exp(-dt * 6);
    const sh = D.shake * 0.06;
    camera.position.copy(cam.pos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    camera.lookAt(cam.look);
    sun.position.set(DS.x - 6, 12, DS.z + 3); sun.target.position.copy(DS);
    return;
  }
  D.shot = null;
  if (sc.cam && t >= sc.cam.t0 - 0.01 && t <= sc.cam.t0 + sc.cam.dur) {
    const u = t - sc.cam.t0;
    look = local(keyAt(sc.cam.look, u)); pos = local(keyAt(sc.cam.pos, u)); fov = keyAt(sc.cam.fov, u);
    pos.sub(look).multiplyScalar(1.6).add(look); pos.y = Math.max(pos.y, 0.5);
  } else {
    const mid = (hero.pos.z + leshy.pos.z) / 2 - DS.z, mx = (hero.pos.x + leshy.pos.x) / 2 - DS.x;
    const span = Math.max(2.4, Math.abs(hero.pos.z - leshy.pos.z) + Math.abs(hero.pos.x - leshy.pos.x));
    const k = Math.max(1, span / 2.6);
    const V = { side: [-4.2, 1.6, -0.3], back: [1.2, 2.2, -5.4], front: [-1.8, 2.6, 4.4] }[opt.view] || [5.0, 1.7, -0.4];
    pos = local([mx + V[0] * k, V[1] + (k - 1) * 0.4, mid + V[2] * k]); look = local([mx, 1.15, mid]);
  }
  const k = cam.snap ? 1 : 1 - Math.exp(-dt * 6);
  cam.pos.lerp(pos, k); cam.look.lerp(look, k); cam.snap = false;
  camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix();
  D.shake *= Math.exp(-dt * 7);
  const sh = D.shake * 0.05;
  camera.position.copy(cam.pos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
  camera.lookAt(cam.look);
  sun.position.set(DS.x - 6, 12, DS.z + 3); sun.target.position.copy(DS);
}

// mocap traversal clips: a foot that would go into a block is lifted onto its top
function noSink(a) {
  a.ch.model.updateMatrixWorld(true);
  const b = a.R.b;
  for (const s of ['Left', 'Right']) {
    const f = b[s + 'Foot'].getWorldPosition(new THREE.Vector3());
    const g = C.ground(f.x, f.z, f.y + 0.7).y + a.ik.ankle * 0.95;
    if (f.y < g) {
      const pole = b[s + 'Leg'].getWorldPosition(new THREE.Vector3()).add(a.fwd(new THREE.Vector3()).multiplyScalar(0.5));
      twoBone(b[s + 'UpLeg'], b[s + 'Leg'], b[s + 'Foot'], new THREE.Vector3(f.x, g, f.z), pole, 1);
    }
  }
}

// ------------------------------------------------------------------ main loop
let last = performance.now(), fpsT = 0, frames = 0;
let paused = false;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (paused) return;
  simulate(dt * opt.speed);
  renderer.render(scene, camera);
}
function simulate(dt) {
  if (opt.mode === 'duel') { duelSim(dt); return; }
  if (script) scriptStep(dt);
  const inp = readInput(); spaceQueued = false;
  for (const a of actors) {
    if (a.hero) { a.sword.visible = a.shield.visible = a.ch.group.visible; }
    if (!a.ch.group.visible) continue;
    const controlled = a === act;
    if (a.state === 'gallery') galleryClipStep(a, dt);
    else updateActor(a, dt, controlled ? inp : { f: 0, r: 0 }, controlled);
    if (a.noCatch) a.noCatch = Math.max(0, a.noCatch - dt);
    for (const [b, q, p] of a.rest) { b.quaternion.copy(q); b.position.copy(p); }
    a.ch.update(dt);
    if (a.state === 'trav') noSink(a);
    // procedural layers on top of the mixer
    if (a.state === 'ledge' && a.layer && a.layer.P) {
      a.R.apply(a.layer.P, 1);
      if (a.rig && (a.layer.P.whL > 0.5 || a.layer.P.whR > 0.5)) { a.rig.right.grip(); a.rig.left.grip(); }
    } else if (a.dropLayer) {
      const D = a.dropLayer; D.fade -= dt / 0.22;
      if (D.fade <= 0) a.dropLayer = null;
      else { a.R.frame.position.copy(a.pos).add(D.off); a.R.frame.updateMatrixWorld(true); a.R.apply(D.P, D.fade * D.fade); }
    }
    a.ik.enabled = opt.ik; a.ik.lockOn = opt.lock;
    a.ik.update(dt, groundFn, a.pos.y);
    if (a.hero) { a.sword.visible = a.shield.visible = a.ch.group.visible; }
    if (a.hero) {
      const inHand = opt.mode === 'gallery' && gsel && !gsel.startsWith('@') && /^(Sw_|Kick|JumpKick|Attack|Hit)/.test(gsel);
      if (inHand) { a.rig.tilt = 0.22; a.rig.update(); } else stowWeapons(a);
    }
  }
  // debug
  if (opt.dbg) {
    const a = act;
    const [L, Rg] = a.ik.legs;
    DM.fl.position.copy(L.final || L.tgt); DM.fr.position.copy(Rg.final || Rg.tgt);
    DM.fl.visible = DM.fr.visible = a.ik.w > 0.05;
    for (let i = 0; i < 2; i++) { const l = a.ik.legs[i]; discs[i].visible = a.ik.w > 0.05 && l.lockW > 0.3; discs[i].position.set(l.lock.x, l.gy + 0.01, l.lock.z); }
    const P = a.layer && a.layer.P;
    DM.hl.visible = DM.hr.visible = !!(P && a.state === 'ledge');
    if (P) { a.R.toWorld(P.hL, DM.hl.position); a.R.toWorld(P.hR, DM.hr.position); }
  }
  updateCamera(dt / Math.max(0.25, opt.speed) * opt.speed);
  $('state').textContent = stateLabel;
  updateKeysHint();
}

function updateKeysHint() {
  if (opt.mode === 'duel') { $('hint').hidden = false; $('keys').dataset.m = ''; $('keys').textContent = 'Сцена собрана из таймингов игры: удары, окна блока, добивания'; return; }
  if (opt.mode === 'gallery') { $('hint').hidden = true; return; }
  $('hint').hidden = false;
  const a = act;
  const k = $('keys');
  const want = a.state === 'ledge' && a.sub === 'hang' ? 'hang' : 'ground';
  if (k.dataset.m === want) return;
  k.dataset.m = want;
  k.innerHTML = want === 'hang'
    ? '<kbd>A</kbd><kbd>D</kbd> вдоль края · <kbd>W</kbd> или <kbd>Пробел</kbd> подтянуться · <kbd>S</kbd> спрыгнуть'
    : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> идти · <kbd>Shift</kbd> бег · <kbd>Пробел</kbd> прыжок / перелезть · <kbd>←</kbd><kbd>→</kbd> камера';
}

// ------------------------------------------------------------------ UI wiring
function setMode(m) {
  opt.mode = m;
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.m === m);
  $('side').hidden = m === 'course'; $('transport').hidden = m === 'course'; $('info').hidden = m === 'course';
  $('who').hidden = m === 'duel';
  script = null;
  $('cine').classList.remove('on'); $('cap').classList.remove('on'); $('flash').style.opacity = 0; for (const T of TR) { T.m.visible = false; T.hist.length = 0; }
  if (m === 'duel') { enterDuel(); return; }
  if (m === 'course') {
    for (const o of actors) { o.ch.group.visible = true; }
    hero.reset(0, 0, 0); leshy.reset(-4.5, -2.5, 0.5);
    if (act === leshy) { leshy.reset(0, 0, 0); hero.reset(-4.5, -2.5, 0.5); }
    cam.yaw = 0; cam.snap = true; setView('back'); gsel = null;
    stateLabel = 'Готов';
  } else {
    buildList();
    selectItem(act.hero ? '@grab' : 'L_SwipeA');
  }
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.m);
for (const b of document.querySelectorAll('#who button')) b.onclick = () => {
  act = b.dataset.c === 'hero' ? hero : leshy;
  for (const x of document.querySelectorAll('#who button')) x.classList.toggle('on', x === b);
  setMode(opt.mode);
};
const tog = (id, key) => { const b = $(id); b.onclick = () => { opt[key] = !opt[key]; b.classList.toggle('on', opt[key]); if (key === 'dbg') { dbg.visible = opt.dbg; $('legend').hidden = !opt.dbg; } }; };
tog('tIK', 'ik'); tog('tLock', 'lock'); tog('tDbg', 'dbg');
function syncClimbButtons() { $('tNew').classList.toggle('on', opt.newClimb); $('tOld').classList.toggle('on', !opt.newClimb); }
$('tNew').onclick = () => { opt.newClimb = true; syncClimbButtons(); };
$('tOld').onclick = () => { opt.newClimb = false; syncClimbButtons(); };
for (const b of document.querySelectorAll('#speeds button')) b.onclick = () => { opt.speed = +b.dataset.s; for (const x of document.querySelectorAll('#speeds button')) x.classList.toggle('on', x === b); };
for (const b of document.querySelectorAll('#views button')) b.onclick = () => { setView(b.dataset.v); };
$('play').onclick = () => { gplay = !gplay; $('play').textContent = gplay ? '❚❚' : '▶'; };
$('scrub').oninput = (e) => {
  if (opt.mode === 'duel') { if (!D.sc) return; gplay = false; $('play').textContent = '▶'; D.t = (e.target.value / 1000) * D.sc.dur; D.last = D.t; for (const a of actors) a.dseg = undefined; return; }
  if (!gsel || gsel.startsWith('@')) return;
  gplay = false; $('play').textContent = '▶';
  const dur = act.ch.clips[gsel].duration; gtime = (e.target.value / 1000) * dur;
};

$('load').remove();
if (innerWidth <= 820) $('tools').classList.add('fold');
$('tFold').onclick = () => $('tools').classList.toggle('fold');
requestAnimationFrame(frame);
// test hooks
window.__sel = (id) => selectDuel(id);
window.LAB = { sim(sec, dt = 1 / 60) { paused = true; for (let t = 0; t < sec - 1e-6; t += dt) simulate(dt); renderer.render(scene, camera); }, hero, leshy, opt, setMode, selectItem, keys, C, probe, get act() { return act; }, get state() { return stateLabel; }, cam, setView };
window.__dur = () => D.sc ? D.sc.dur : 0;
window.__dinfo = () => { const s = D.sc; if (!s) return ''; const h = activeSeg(s.seg.hero, D.t), l = activeSeg(s.seg.leshy, D.t); return `t=${D.t.toFixed(2)} H:${h && h.clip || '-'} L:${l && l.clip || '-'}`; };
// analysis: sample a clip on an actor standing at the origin facing +Z, report key points in its frame
window.__an = (who, clip, times, guard) => {
  const a = who === 'hero' ? hero : leshy, ch = a.ch, b = a.R.b, out = [];
  const keep = { p: a.pos.clone(), y: ch.yaw, st: opt.mode };
  a.pos.set(0, 0, 0); ch.yaw = 0; ch.stopAll(0.0001); ch.update(0.01, null);
  const h = clip ? ch.play(clip, 0.0001) : null;
  const P = (o) => { const v = o.getWorldPosition(new THREE.Vector3()); return [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)]; };
  for (const t of times) {
    if (h) ch.setTime(h, t);
    for (const [bn, q, pp] of a.rest) { bn.quaternion.copy(q); bn.position.copy(pp); }
    ch.setSpeed(0); ch.update(0.001, guard ? poseBlend({}, GUARD, 1) : null);
    const r = { t };
    r.hips = P(b.Hips);
    const ls = b.LeftArm.getWorldPosition(new THREE.Vector3()), rs = b.RightArm.getWorldPosition(new THREE.Vector3());
    const ac = ls.sub(rs); r.chestYaw = +(Math.atan2(-ac.z, ac.x) * 57.3).toFixed(0);   // 0 = facing +Z
    r.rH = P(b.RightHand); r.lH = P(b.LeftHand); r.lF = P(b.LeftFoot); r.rF = P(b.RightFoot);
    if (a.hero) { const o = { base: new THREE.Vector3(), tip: new THREE.Vector3() }; a.rig.update(o); r.tip = [o.tip.x, o.tip.y, o.tip.z].map((v) => +v.toFixed(2)); }
    out.push(r);
  }
  ch.stopAll(0.0001); ch.update(0.01, null); a.pos.copy(keep.p); ch.yaw = keep.y;
  return out;
};
window.__clips = (who) => Object.keys((who === 'hero' ? hero : leshy).ch.clips);
window.THREE = THREE;

window.__dlog = () => D.log;
window.__miss = () => ({ hero: hero.pr.miss, leshy: leshy.pr.miss });
window.__fin = () => ctx.info;
window.__ids = () => DUEL_GROUPS.flatMap((g) => g[1]);
// step a scene and collect faults
window.__check = (id) => {
  selectDuel(id); const sc = D.sc, dt = 1 / 60, r = { hits: [], handMiss: 0, footMiss: 0, footLow: 9, slide: 0, bladeLow: 9, overlap: 9, selfCut: 9 };
  let prev = null;
  const o = { base: new THREE.Vector3(), tip: new THREE.Vector3() };
  for (let t = 0; t < sc.dur; t += dt) {
    simulate(dt);
    for (const a of actors) {
      if (a.dseg && a.dseg.mv) { r.handMiss = Math.max(r.handMiss, a.pr.miss.hand); r.footMiss = Math.max(r.footMiss, a.pr.miss.foot); }
      const b = a.R.b;
      for (const s of ['Left', 'Right']) { r.footLow = Math.min(r.footLow, b[s + 'ToeBase'].getWorldPosition(new THREE.Vector3()).y); }
    }
    hero.rig.update(o); r.bladeLow = Math.min(r.bladeLow, o.tip.y);
    const ha = bodyAxis(hero); r.selfCut = Math.min(r.selfCut, segDist(o.base.clone().lerp(o.tip, 0.25), o.tip, ha[0], ha[1]));
    const la = bodyAxis(leshy); r.overlap = Math.min(r.overlap, segDist(ha[0], ha[1], la[0], la[1]));
  }
  r.hits = D.log;
  for (const k in r) if (typeof r[k] === 'number') r[k] = +r[k].toFixed(3);
  return r;
};
