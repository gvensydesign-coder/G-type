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
const DS = new THREE.Vector3(30, 0, -16);
const SCENES = buildScenes();
for (const k in SCENES) {
  const sc = SCENES[k];
  for (const w of ['hero', 'leshy']) { sc.pos[w].sort((a, b) => a[0] - b[0]); sc.yaw[w].sort((a, b) => a[0] - b[0]); sc.seg[w].sort((a, b) => a.t - b.t); }
  sc.pose.block.sort((a, b) => a[0] - b[0]); sc.hits.sort((a, b) => a.t - b.t);
}
const D = { sc: null, id: '', t: 0, last: 0, shake: 0, fx: [], note: '' };
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
      d.innerHTML = `<span>${sc.name} <span class="new">НОВОЕ</span></span><small>${fmt(sc.dur)} с</small>`;
      d.onclick = () => selectDuel(id); L.appendChild(d);
    }
  }
  setView('side');
  selectDuel('series');
}
function selectDuel(id) {
  D.id = id; D.sc = SCENES[id]; D.t = 0; D.last = 0; gplay = true; $('play').textContent = '❚❚';
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
    m.rotation.x = -Math.PI / 2; m.position.copy(at.p); m.position.y += 0.03; scene.add(m);
    D.fx.push({ m, t: 0, life: 0.7, up(f, k) { const r = 0.3 + at.r * (1 - (1 - k) * (1 - k)); f.m.scale.setScalar(r); f.m.material.opacity = 0.8 * (1 - k); } });
  } else {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: at.color || 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    m.position.copy(at.p); m.renderOrder = 20; scene.add(m);
    const big = at.big || 1;
    D.fx.push({ m, t: 0, life: 0.28, up(f, k) { f.m.scale.setScalar((0.25 + 0.75 * Math.sqrt(k)) * 0.9 * big); f.m.material.opacity = 1 - k; f.m.material.rotation = k * 0.6; } });
  }
}
function duelHit(h) {
  const vic = h.who === 'hero' ? hero : h.who === 'leshy' ? leshy : null;
  const kinds = { light: 0.18, heavy: 0.45, kick: 0.35, finisher: 0.7, block: 0.25 };
  D.shake = Math.max(D.shake, kinds[h.kind] ?? 0.4);
  if (h.who === 'ground') {
    const p = leshy.pos.clone().add(leshy.fwd(new THREE.Vector3()).multiplyScalar(1.5)); p.y = 0;
    const col = { root: 0xb7d26a, leap: 0xe6e0b0, roar: 0x9fe0aa }[h.kind] || 0xffffff;
    addFx('ring', { p, r: h.kind === 'leap' ? 3.2 : h.kind === 'roar' ? 4.5 : 1.4, color: col });
    return;
  }
  let p;
  if (h.kind === 'block') p = hero.shield.getWorldPosition(new THREE.Vector3()).add(hero.fwd(new THREE.Vector3()).multiplyScalar(0.15));
  else { p = vic.R.b.Spine2.getWorldPosition(new THREE.Vector3()); p.add(vic.fwd(new THREE.Vector3()).multiplyScalar(0.25 * vic.s)); }
  addFx('spark', { p, big: h.kind === 'finisher' ? 2 : h.kind === 'heavy' || h.kind === 'kick' ? 1.5 : 1, color: h.kind === 'block' ? 0xfff2c0 : 0xffd6a0 });
}
function duelSim(dt) {
  const sc = D.sc; if (!sc) return;
  const ts = sc.ts ? keyAt(sc.ts, D.t) : 1;
  const sdt = dt * ts;
  if (gplay) {
    D.t += sdt;
    if (D.t > sc.dur + 0.6) { D.t = 0; D.last = 0; for (const a of actors) { a.dseg = undefined; a.ch.stopAll(0.15); } }
  }
  const t = Math.min(D.t, sc.dur);
  // hits crossed this frame
  for (const h of sc.hits) if (h.t > D.last && h.t <= t) duelHit(h);
  for (const [nt, text] of sc.notes) if (nt <= t) D.note = text;
  if (t < 0.05) D.note = sc.notes.length ? sc.notes[0][1] : sc.name;
  D.last = t;
  for (const a of actors) {
    const who = a.hero ? 'hero' : 'leshy', ch = a.ch;
    const seg = activeSeg(sc.seg[who], t);
    if (seg !== a.dseg) {
      a.dseg = seg;
      if (seg && seg.clip) a.dh = ch.play(seg.clip, seg.fade); else { ch.stopAll(0.25); a.dh = null; }
    }
    if (a.dh && seg) {
      const ct = dwarp(seg.keys, t - seg.t);
      ch.setTime(a.dh, LOOPS.has(seg.clip) ? ct % a.dh.duration : ct);
    }
    const p = keyAt(sc.pos[who], t), y = keyAt(sc.yaw[who], t);
    a.pos.set(DS.x + p[0], 0, DS.z + p[1]); ch.yaw = y; a.feet = 0;
    ch.setSpeed(0);
    for (const [b, q, pp] of a.rest) { b.quaternion.copy(q); b.position.copy(pp); }
    let rot = null;
    if (a.hero) {
      const g = 1 - ch.oneShotWeight, bw = keyAt(sc.pose.block, t);
      rot = poseBlend(poseBlend({}, GUARD, g), BLOCK, bw);
    }
    ch.update(sdt, rot);
    if (!a.hero && sc.kneel) kneel(a, keyAt(sc.kneel, t));
    if (a.hero) a.rig.update();
  }
  // fx
  for (let i = D.fx.length - 1; i >= 0; i--) {
    const f = D.fx[i]; f.t += dt; const k = Math.min(1, f.t / f.life); f.up(f, k);
    if (k >= 1) { scene.remove(f.m); f.m.material.dispose(); D.fx.splice(i, 1); }
  }
  $('scrub').value = Math.round((t / sc.dur) * 1000);
  $('ttime').textContent = fmt(t) + ' / ' + fmt(sc.dur) + ' с' + (ts < 0.95 ? ' · замедление' : '');
  stateLabel = D.note;
  duelCamera(dt, t);
  $('state').textContent = stateLabel;
  updateKeysHint();
}
// the stunned Leshy sinks to one knee: hips down, feet stay planted (two-bone IK)
function kneel(a, w) {
  if (w < 0.01) return;
  const b = a.R.b; a.ch.model.updateMatrixWorld(true);
  const fl = b.LeftFoot.getWorldPosition(new THREE.Vector3()), fr = b.RightFoot.getWorldPosition(new THREE.Vector3());
  b.Hips.position.y -= (w * 0.32 * a.ch.height / 2.5) / a.ch.scale;
  b.Hips.updateMatrixWorld(true);
  const fw = a.fwd(new THREE.Vector3());
  fr.add(fw.clone().multiplyScalar(-0.35 * w)); fr.y = Math.max(fr.y, 0.06);
  for (const [s, f] of [['Left', fl], ['Right', fr]]) {
    const pole = b[s + 'Leg'].getWorldPosition(new THREE.Vector3()).add(fw.clone().multiplyScalar(0.6));
    twoBone(b[s + 'UpLeg'], b[s + 'Leg'], b[s + 'Foot'], f, pole, 1);
  }
}
function duelCamera(dt, t) {
  const sc = D.sc;
  let pos, look, fov = 50;
  const local = (v) => new THREE.Vector3(DS.x + v[0], v[1], DS.z + v[2]);
  if (sc.cam && t >= sc.cam.t0 - 0.01 && t <= sc.cam.t0 + sc.cam.dur) {
    const u = t - sc.cam.t0;
    look = local(keyAt(sc.cam.look, u)); pos = local(keyAt(sc.cam.pos, u)); fov = keyAt(sc.cam.fov, u);
    pos.sub(look).multiplyScalar(1.45).add(look); pos.y = Math.max(pos.y, 0.5);
  } else {
    const mid = (hero.pos.z + leshy.pos.z) / 2 - DS.z, mx = (hero.pos.x + leshy.pos.x) / 2 - DS.x;
    const V = { side: [5.2, 1.9, -0.6], back: [1.3, 2.3, -5.6], front: [-1.8, 2.9, 4.4] }[opt.view] || [5.2, 1.9, -0.6];
    pos = local([mx + V[0], V[1], mid + V[2]]); look = local([mx, 1.2, mid]);
  }
  const k = cam.snap ? 1 : 1 - Math.exp(-dt * 7);
  cam.pos.lerp(pos, k); cam.look.lerp(look, k); cam.snap = false;
  camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix();
  D.shake *= Math.exp(-dt * 7);
  const sh = D.shake * 0.06;
  camera.position.copy(cam.pos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
  camera.lookAt(cam.look);
  sun.position.set(DS.x + 5, 12, DS.z + 7); sun.target.position.copy(DS);
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
      if (inHand) a.rig.update(); else stowWeapons(a);
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
