import * as THREE from 'three';
import { BONES, applyPose } from './pose.js';

// A rigged, animated character: yaw group -> pivot (rolls) -> skinned model.
// Locomotion (Idle / Walk / Run) is blended by actual ground speed so the feet do not slide;
// one-shot clips (attacks, hits, jumps, death) are driven by game time through a time warp,
// and a procedural pose layer (pose.js) is stacked on top.
export class Character {
  constructor(gltf, { height, name = '' } = {}) {
    this.name = name;
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    this.model = gltf.scene;
    this.model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.model, true);
    this.scale = height / (box.max.y - box.min.y);
    this.height = height;
    this.model.scale.setScalar(this.scale);
    this.model.position.y = -box.min.y * this.scale;
    this.pivot.add(this.model);

    this.materials = [];
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material.clone();
        m.emissive = new THREE.Color(0);
        m.emissiveIntensity = 1;
        o.material = m;
        this.materials.push(m);
      }
    });

    this.bones = {};
    for (const n of BONES) this.bones[n] = this.model.getObjectByName('mixamorig' + n);
    for (const n of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) this.bones[n] = this.model.getObjectByName('mixamorig' + n);

    // weapon grip frames, measured in the rest (T) pose: blade forward (+Z) and edge vertical,
    // expressed in the hand bone's own frame so the wrist motion of every clip carries the sword.
    this.model.updateMatrixWorld(true);
    const hq = this.bones.RightHand ? this.bones.RightHand.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion();
    this.grip = { blade: new THREE.Vector3(0, 0.12, 1).normalize().applyQuaternion(hq), edge: new THREE.Vector3(0, 1, 0).applyQuaternion(hq) };

    // clip metadata (speed in m/s at scale 1, events) lives in animation.extras
    const meta = {};
    for (const a of gltf.parser?.json?.animations || []) meta[a.name] = a.extras || {};
    this.meta = meta;
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;

    this.mixer = new THREE.AnimationMixer(this.model);
    this.loco = {};
    for (const n of ['Idle', 'Walk', 'Run']) {
      const a = this.mixer.clipAction(this.clips[n]);
      a.play();
      a.setEffectiveWeight(n === 'Idle' ? 1 : 0);
      this.loco[n] = { action: a, w: n === 'Idle' ? 1 : 0, target: n === 'Idle' ? 1 : 0, speed: (meta[n]?.speed || 1) * this.scale };
    }
    this.locoBlend = 7; // how fast loco weights follow (lower = heavier transitions)
    this.oneShots = [];
    this._flash = 0;
    this._glow = new THREE.Color(0, 0, 0);
    this._tint = new THREE.Color(0, 0, 0);
  }

  get position() { return this.group.position; }
  get yaw() { return this.group.rotation.y; }
  set yaw(v) { this.group.rotation.y = v; }
  get walkSpeed() { return this.loco.Walk.speed; }
  get runSpeed() { return this.loco.Run.speed; }

  // Blend Idle / Walk / Run by ground speed (m/s). back = walking backwards.
  setSpeed(speed, back = false) {
    const W = this.loco.Walk, R = this.loco.Run, I = this.loco.Idle;
    const s = Math.abs(speed);
    let wi = 0, ww = 0, wr = 0;
    const runFrom = W.speed * 1.15, runFull = Math.max(runFrom + 0.3, R.speed * 0.7);
    if (s < 0.06) wi = 1;
    else if (s <= runFrom) { ww = Math.min(1, s / (W.speed * 0.45)); wi = 1 - ww; }
    else if (s < runFull) { const k = (s - runFrom) / (runFull - runFrom); ww = 1 - k; wr = k; }
    else wr = 1;
    if (back) { wr = 0; ww = 1 - wi; }
    I.target = wi; W.target = ww; R.target = wr;
    // stride rate follows speed (no foot sliding); a heavy body does not shorten its stride much
    W.action.timeScale = THREE.MathUtils.clamp(s / W.speed, 0.6, 1.9) * (back ? -1 : 1);
    R.action.timeScale = THREE.MathUtils.clamp(s / R.speed, 0.62, 1.45);
    // keep walk and run feet in phase while they cross-fade
    if (ww > 0.01 && wr > 0.01) {
      const ph = (R.action.time / this.clips.Run.duration) % 1;
      W.action.time = ph * this.clips.Walk.duration;
    }
    I.action.timeScale = 1;
  }

  // Start a one-shot clip. Its time is set every frame with setTime (game-time warp).
  play(name, fade = 0.18) {
    const clip = this.clips[name];
    const action = this.mixer.clipAction(clip);
    for (const o of this.oneShots) if (o.action !== action) { o.target = 0; o.fade = fade; }
    let o = this.oneShots.find((x) => x.action === action);
    if (!o) { o = { action, w: 0 }; this.oneShots.push(o); }
    o.target = 1; o.fade = fade;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = 0;
    action.time = 0;
    action.play();
    return { name, action, duration: clip.duration };
  }
  setTime(h, t) { if (h) h.action.time = THREE.MathUtils.clamp(t, 0, h.duration - 1e-4); }
  stop(h, fade = 0.25) { const o = h && this.oneShots.find((x) => x.action === h.action); if (o) { o.target = 0; o.fade = fade; } }
  stopAll(fade = 0.2) { for (const o of this.oneShots) { o.target = 0; o.fade = fade; } }
  get oneShotWeight() { let s = 0; for (const o of this.oneShots) s += o.w; return Math.min(1, s); }

  // Rotate around the point (0, h, 0) in the yaw group's frame.
  setPivot(rx, rz, h, lift = 0) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz, 'XYZ'));
    const c = new THREE.Vector3(0, h, 0);
    this.pivot.quaternion.copy(q);
    this.pivot.position.copy(c).sub(c.clone().applyQuaternion(q));
    this.pivot.position.y += lift;
  }

  flash(t = 0.1) { this._flash = t; }
  setGlow(hex, strength) { this._glow.setHex(hex).multiplyScalar(strength); }
  setTint(color, strength) { this._tint.copy(color).multiplyScalar(strength); }

  update(dt, rot) {
    // one-shots fade in / out; locomotion gets the remaining weight
    let one = 0;
    for (let i = this.oneShots.length - 1; i >= 0; i--) {
      const o = this.oneShots[i];
      const step = dt / Math.max(0.01, o.fade);
      o.w += Math.sign(o.target - o.w) * Math.min(Math.abs(o.target - o.w), step);
      if (o.w <= 0 && o.target === 0) { o.action.stop(); this.oneShots.splice(i, 1); continue; }
      one += o.w;
    }
    const norm = one > 1 ? 1 / one : 1;
    for (const o of this.oneShots) o.action.setEffectiveWeight(o.w * norm);
    const rest = Math.max(0, 1 - one);
    const k = 1 - Math.exp(-dt * this.locoBlend);
    let sum = 0;
    for (const n in this.loco) { const L = this.loco[n]; L.w += (L.target - L.w) * k; sum += L.w; }
    for (const n in this.loco) { const L = this.loco[n]; L.action.setEffectiveWeight(sum > 0 ? (L.w / sum) * rest : 0); }
    this.mixer.update(dt);
    if (rot) applyPose(this.model, this.bones, rot);
    else this.model.updateMatrixWorld(true);
    this._flash = Math.max(0, this._flash - dt);
    for (const m of this.materials) {
      if (this._flash > 0) m.emissive.setRGB(0.22, 0.2, 0.18);
      else m.emissive.copy(this._glow).add(this._tint);
    }
  }

  worldBone(name, out = new THREE.Vector3()) { return this.bones[name].getWorldPosition(out); }
}

// Piecewise time warp: game time -> clip time. keys = [[gameT, clipT, ease], ...]
// ease of the segment that ends at the key: 'io' smooth, 'in' slow start, 'out' slow end, 'lin'.
const EASE = {
  lin: (x) => x,
  io: (x) => x * x * (3 - 2 * x),
  in: (x) => x * x,
  out: (x) => 1 - (1 - x) * (1 - x),
};
export function warp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * EASE[b[2] || 'lin'](u);
    }
  }
  return keys[keys.length - 1][1];
}
