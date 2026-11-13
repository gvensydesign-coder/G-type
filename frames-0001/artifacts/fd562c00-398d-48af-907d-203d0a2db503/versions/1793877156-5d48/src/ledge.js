// Procedural ledge moves (fast mantle, jump & grab, hang, shimmy, pull-up, drop) built on full-body IK.
// Every move is a list of key poses in the LEDGE frame: origin on the edge, +Z into the wall (the way
// the hero faces), +X = hero's left, +Y up, the wall top at y = 0 and the wall face at z = 0.
// Keys are in metres for a 1.53 m hero and scale with the real height.
import * as THREE from 'three';
import { twoBone, turnWorld, aimBone } from './ik.js';

const D2R = Math.PI / 180;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _p = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const AX = new THREE.Vector3();

const VEC = ['hips', 'hL', 'hR', 'fL', 'fR'];
const SCAL = ['pitch', 'chest', 'whL', 'whR', 'wfL', 'wfR', 'look'];

// Catmull-Rom between keys for positions, smoothstep for scalars
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function fillKeys(keys) {
  for (const f of VEC) {
    let last = null;
    for (const k of keys) { if (k[f]) last = k[f]; else if (last) k[f] = last.slice(); }
    let next = null;
    for (let i = keys.length - 1; i >= 0; i--) { if (keys[i][f]) next = keys[i][f]; else keys[i][f] = next ? next.slice() : [0, 0, 0]; }
  }
  keys._ok = true;
}
export function sampleKeys(keys, t, out = {}) {
  if (!keys._ok) fillKeys(keys);
  const n = keys.length;
  let i = 0;
  while (i < n - 2 && t > keys[i + 1].t) i++;
  const k1 = keys[i], k2 = keys[Math.min(n - 1, i + 1)];
  const k0 = keys[Math.max(0, i - 1)], k3 = keys[Math.min(n - 1, i + 2)];
  let u = k2.t > k1.t ? THREE.MathUtils.clamp((t - k1.t) / (k2.t - k1.t), 0, 1) : 1;
  const ue = k2.ease === 'lin' ? u : k2.ease === 'out' ? 1 - (1 - u) * (1 - u) : k2.ease === 'in' ? u * u : u;
  for (const f of VEC) {
    const o = out[f] || (out[f] = [0, 0, 0]);
    for (let c = 0; c < 3; c++) o[c] = cr(k0[f][c], k1[f][c], k2[f][c], k3[f][c], ue);
  }
  const us = u * u * (3 - 2 * u);
  for (const f of SCAL) out[f] = (k1[f] ?? 0) + ((k2[f] ?? 0) - (k1[f] ?? 0)) * us;
  return out;
}

export class LedgeRig {
  constructor(ch) {
    this.ch = ch;
    const B = (n) => ch.model.getObjectByName('mixamorig' + n);
    this.b = {};
    for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandMiddle1',
      'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'RightHandMiddle1', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']) this.b[n] = B(n);
    this.frame = new THREE.Object3D();   // the ledge frame in world space
    this.s = ch.height / 1.53;
  }
  // measure the standing pose (call once with the idle pose applied, group at the origin, yaw 0)
  measure() {
    const ch = this.ch, g = ch.group;
    g.updateMatrixWorld(true);
    const L = (n) => g.worldToLocal(this.b[n].getWorldPosition(new THREE.Vector3()));
    this.stand = { hips: L('Hips'), fL: L('LeftFoot'), fR: L('RightFoot') };
    const len = (a, b) => this.b[a].getWorldPosition(_a).distanceTo(this.b[b].getWorldPosition(_b));
    this.armLen = len('RightArm', 'RightForeArm') + len('RightForeArm', 'RightHand');
    this.legLen = len('RightUpLeg', 'RightLeg') + len('RightLeg', 'RightFoot');
    this.shoulderUp = L('RightArm').y - this.stand.hips.y;
    this.ankle = Math.max(0.05, (this.stand.fL.y + this.stand.fR.y) / 2);
    this.hipsH = this.stand.hips.y;
    // hanging: hips below the edge so the arms are nearly straight
    this.hangY = -(this.shoulderUp + this.armLen * 0.93);
    this.reach = this.hipsH + this.shoulderUp + this.armLen * 0.96;   // hands overhead, standing
  }

  // ledge frame from an edge point (world), facing yaw (into the wall)
  setFrame(p, yaw) { this.frame.position.copy(p); this.frame.rotation.set(0, yaw, 0); this.frame.updateMatrixWorld(true); }
  toWorld(arr, out = new THREE.Vector3()) { return out.set(arr[0], arr[1], arr[2]).applyMatrix4(this.frame.matrixWorld); }
  toLedge(v, out = [0, 0, 0]) { _v.copy(v); this.frame.worldToLocal(_v); out[0] = _v.x; out[1] = _v.y; out[2] = _v.z; return out; }

  // where the controller group must be for this hips key (so the base pose underneath stays consistent)
  groupFor(hips, out) {
    const st = this.stand.hips;
    return this.toWorld([hips[0] - st.x, hips[1] - st.y, hips[2] - st.z], out);
  }

  // Apply a sampled pose on top of the current (animated) skeleton. wAll fades the whole layer.
  apply(P, wAll = 1) {
    if (wAll <= 0.001) return;
    const ch = this.ch, b = this.b;
    ch.model.updateMatrixWorld(true);
    const yaw = this.frame.rotation.y;
    const left = AX.set(Math.cos(yaw), 0, -Math.sin(yaw));
    // hips: absolute position in the ledge frame
    const hw = this.toWorld(P.hips, _w);
    b.Hips.getWorldPosition(_a);
    _a.lerp(hw, wAll);
    b.Hips.position.copy(b.Hips.parent.worldToLocal(_a));
    b.Hips.updateMatrixWorld(true);
    // lean: hips and spine bend forward (about the hero's left axis), the head looks ahead
    const pitch = (P.pitch || 0) * D2R * wAll, chest = (P.chest || 0) * D2R * wAll;
    if (Math.abs(pitch) > 1e-4) turnWorld(b.Hips, _q.setFromAxisAngle(left, pitch * 0.55));
    if (Math.abs(pitch + chest) > 1e-4) {
      turnWorld(b.Spine, _q.setFromAxisAngle(left, pitch * 0.22 + chest * 0.4));
      turnWorld(b.Spine1, _q.setFromAxisAngle(left, pitch * 0.23 + chest * 0.6));
      turnWorld(b.Neck, _q.setFromAxisAngle(left, -pitch * 0.45 + (P.look || 0) * D2R * wAll));
      turnWorld(b.Head, _q.setFromAxisAngle(left, -pitch * 0.35));
    }
    // legs: knees forward (into the wall), a little outward
    for (const s of ['Left', 'Right']) {
      const w = (s === 'Left' ? P.wfL : P.wfR) * wAll;
      if (w < 0.001) continue;
      const t = this.toWorld(s === 'Left' ? P.fL : P.fR, _p);
      b[s + 'Leg'].getWorldPosition(_b);
      const side = s === 'Left' ? 1 : -1;
      const pole = this.toWorld([0, 0, 0], _v); // reuse
      const kl = this.toLedge(_b, [0, 0, 0]);
      this.toWorld([kl[0] + side * 0.12, kl[1] + 0.1, kl[2] + 0.6], pole);
      twoBone(b[s + 'UpLeg'], b[s + 'Leg'], b[s + 'Foot'], t, pole, w);
      // toes into the wall and a bit up while the foot is on the wall
      const fz = (s === 'Left' ? P.fL : P.fR);
      if (fz[1] < -0.12) aimBone(b[s + 'Foot'], b[s + 'ToeBase'], this.dirW([0, 0.35, 1], _v), w * 0.85);
      else aimBone(b[s + 'Foot'], b[s + 'ToeBase'], this.dirW([0, -0.25, 1], _v), w * 0.7);
    }
    // arms: shoulders shrug towards the hands, elbows out and back
    for (const s of ['Left', 'Right']) {
      const w = (s === 'Left' ? P.whL : P.whR) * wAll;
      if (w < 0.001) continue;
      const t = this.toWorld(s === 'Left' ? P.hL : P.hR, _p);
      b[s + 'Arm'].getWorldPosition(_a);
      _v.subVectors(t, _a);
      b[s + 'Shoulder'].getWorldPosition(_b);
      aimBone(b[s + 'Shoulder'], b[s + 'Arm'], _w.subVectors(_a, _b).normalize().lerp(_v.normalize(), 0.3), w);
      const side = s === 'Left' ? 1 : -1;
      b[s + 'ForeArm'].getWorldPosition(_b);
      const el = this.toLedge(_b, [0, 0, 0]);
      const pole = this.toWorld([el[0] + side * 0.5, el[1] - 0.15, el[2] - 0.35], _w);
      twoBone(b[s + 'Arm'], b[s + 'ForeArm'], b[s + 'Hand'], t, pole, w);
      // palm on the top, fingers over the edge
      aimBone(b[s + 'Hand'], b[s + 'HandMiddle1'], this.dirW([side * -0.15, -0.45, 1], _v), w * 0.9);
    }
  }
  dirW(arr, out) { return out.set(arr[0], arr[1], arr[2]).transformDirection(this.frame.matrixWorld); }
}

// ------------------------------------------------------------------ moves
// Each builder returns keys; key 0 is filled from the live pose by the caller (start()).
// H = wall height above the feet, D = distance from the feet to the wall face. s = height / 1.53.
function K(t, o) { return Object.assign({ t, pitch: 0, chest: 0, whL: 0, whR: 0, wfL: 1, wfR: 1, look: 0 }, o); }

export function hangPose(R, t = 0) {
  const s = R.s, y = R.hangY;
  const sw = Math.sin(t * 1.7) * 0.012 * s;
  return K(0, {
    hips: [0, y + Math.sin(t * 2.3) * 0.006, -0.24 * s + sw], pitch: -6, chest: -4,
    hL: [0.2 * s, 0.015, 0.06 * s], hR: [-0.2 * s, 0.015, 0.06 * s], whL: 1, whR: 1,
    fL: [0.12 * s, y - R.legLen * 0.62, -0.1 * s], fR: [-0.13 * s, y - R.legLen * 0.48, -0.09 * s], wfL: 1, wfR: 1, look: -14,
  });
}

// fast mantle onto a 1.0 - 1.7 m wall (hands, hop, foot on top, stand up): about 0.95 s
export function mantleKeys(R, H, D) {
  const s = R.s, hh = R.hipsH, a = R.ankle;
  const k = [];
  k.push(K(0.0, {}));                                                                 // live pose
  k.push(K(0.13, { hips: [0, -H + hh - 0.1 * s, -D * 0.65], pitch: 24, chest: 6, hL: [0.22 * s, 0.03, 0.08 * s], hR: [-0.22 * s, 0.03, 0.08 * s], whL: 1, whR: 1,
    fL: [0.11 * s, -H + a, -D + 0.02], fR: [-0.11 * s, -H + a, -D - 0.04 * s], look: -10, ease: 'out' }));
  k.push(K(0.33, { hips: [0, -0.06 * s, -0.16 * s], pitch: 38, chest: 10, hL: [0.22 * s, 0.03, 0.08 * s], hR: [-0.22 * s, 0.03, 0.08 * s], whL: 1, whR: 1,
    fL: [0.12 * s, -Math.min(H * 0.55, 0.75 * s), -0.1 * s], fR: [-0.12 * s, -0.25 * s, -0.3 * s], look: -6 }));
  k.push(K(0.5, { hips: [0, 0.4 * s, -0.02 * s], pitch: 52, chest: 8, hL: [0.23 * s, 0.02, 0.1 * s], hR: [-0.23 * s, 0.02, 0.1 * s], whL: 1, whR: 1,
    fL: [0.12 * s, -0.28 * s, -0.12 * s], fR: [-0.11 * s, a + 0.02, 0.2 * s], look: 6 }));
  k.push(K(0.72, { hips: [0, hh * 0.72, 0.24 * s], pitch: 24, chest: 2, hL: [0.24 * s, 0.25 * s, 0.22 * s], hR: [-0.24 * s, 0.22 * s, 0.24 * s], whL: 0.35, whR: 0.25,
    fL: [0.11 * s, 0.18 * s, 0.12 * s], fR: [-0.11 * s, a, 0.22 * s], look: 4 }));
  k.push(K(0.95, { hips: [R.stand.hips.x, hh, 0.42 * s + R.stand.hips.z], pitch: 0, fL: [R.stand.fL.x, a, R.stand.fL.z + 0.42 * s], fR: [R.stand.fR.x, a, R.stand.fR.z + 0.42 * s], wfL: 0, wfR: 0, ease: 'out' }));
  return k;
}

// jump from the ground and catch a 1.7 - 2.6 m edge: about 0.7 s, ends hanging
export function grabKeys(R, H, D) {
  const s = R.s, hh = R.hipsH, a = R.ankle, y = R.hangY;
  const hang = hangPose(R, 0);
  return [
    K(0.0, {}),
    K(0.14, { hips: [0, -H + hh - 0.16 * s, -D + 0.04], pitch: 16, chest: 4, hL: [0.24 * s, -H + hh + 0.05, -D - 0.12 * s], hR: [-0.24 * s, -H + hh + 0.05, -D - 0.12 * s], whL: 0.7, whR: 0.7,
      fL: [0.11 * s, -H + a, -D + 0.03], fR: [-0.11 * s, -H + a, -D - 0.03], look: -20, ease: 'out' }),
    K(0.34, { hips: [0, y + 0.12 * s, -0.36 * s], pitch: 2, chest: -4, hL: [0.22 * s, 0.1 * s, -0.12 * s], hR: [-0.22 * s, 0.12 * s, -0.1 * s], whL: 1, whR: 1,
      fL: [0.1 * s, y - R.legLen * 0.85, -0.42 * s], fR: [-0.12 * s, y - R.legLen * 0.7, -0.3 * s], wfL: 0.6, wfR: 0.6, look: -24, ease: 'out' }),
    K(0.44, { ...hang, t: 0.44, hips: [0, y + 0.05 * s, -0.3 * s], fL: [0.12 * s, y - R.legLen * 0.75, -0.22 * s], fR: [-0.12 * s, y - R.legLen * 0.62, -0.2 * s], wfL: 0.7, wfR: 0.7 }),
    K(0.62, { ...hang, t: 0.62, hips: [0, y - 0.04 * s, -0.2 * s] }),
    K(0.8, { ...hang, t: 0.8 }),
  ];
}

// from the hang: dip, pull, foot on top, stand: about 1.05 s
export function pullKeys(R) {
  const s = R.s, hh = R.hipsH, a = R.ankle, y = R.hangY;
  const hL = [0.2 * s, 0.015, 0.06 * s], hR = [-0.2 * s, 0.015, 0.06 * s];
  return [
    K(0.0, {}),
    K(0.13, { hips: [0, y - 0.06 * s, -0.27 * s], pitch: -8, chest: -6, hL, hR, whL: 1, whR: 1, fL: [0.12 * s, y - R.legLen * 0.5, -0.08 * s], fR: [-0.13 * s, y - R.legLen * 0.38, -0.07 * s], look: -18 }),
    K(0.36, { hips: [0, y * 0.5, -0.22 * s], pitch: 10, chest: 6, hL, hR, whL: 1, whR: 1, fL: [0.12 * s, y * 0.5 - R.legLen * 0.62, -0.08 * s], fR: [-0.12 * s, y * 0.5 - R.legLen * 0.25, -0.06 * s], look: -8, ease: 'in' }),
    K(0.56, { hips: [0, 0.38 * s, -0.04 * s], pitch: 52, chest: 8, hL: [0.22 * s, 0.02, 0.08 * s], hR: [-0.22 * s, 0.02, 0.08 * s], whL: 1, whR: 1,
      fL: [0.12 * s, -0.36 * s, -0.12 * s], fR: [-0.11 * s, a + 0.02, 0.18 * s], look: 6 }),
    K(0.8, { hips: [0, hh * 0.72, 0.24 * s], pitch: 24, chest: 2, hL: [0.24 * s, 0.25 * s, 0.22 * s], hR: [-0.24 * s, 0.22 * s, 0.24 * s], whL: 0.35, whR: 0.25,
      fL: [0.11 * s, 0.18 * s, 0.12 * s], fR: [-0.11 * s, a, 0.22 * s], look: 4 }),
    K(1.04, { hips: [R.stand.hips.x, hh, 0.42 * s + R.stand.hips.z], pitch: 0, fL: [R.stand.fL.x, a, R.stand.fL.z + 0.42 * s], fR: [R.stand.fR.x, a, R.stand.fR.z + 0.42 * s], wfL: 0, wfR: 0, ease: 'out' }),
  ];
}

// fill key 0 from the live skeleton (current hips/hands/feet in the ledge frame, IK weights 0 for hands)
export function liveKey(R, from) {
  const b = R.b, k = K(0, {});
  k.hips = R.toLedge(b.Hips.getWorldPosition(_a));
  k.hL = R.toLedge(b.LeftHand.getWorldPosition(_a)); k.hR = R.toLedge(b.RightHand.getWorldPosition(_a));
  k.fL = R.toLedge(b.LeftFoot.getWorldPosition(_a)); k.fR = R.toLedge(b.RightFoot.getWorldPosition(_a));
  if (from) Object.assign(k, { pitch: from.pitch, chest: from.chest, whL: from.whL, whR: from.whR, wfL: from.wfL, wfR: from.wfR, look: from.look });
  else { k.whL = 0; k.whR = 0; k.wfL = 1; k.wfR = 1; }
  return k;
}

// step up onto a knee-to-hip high block (0.6 - 1.0 m): one hand on the lid, foot up, push, stand. ~0.85 s
export function stepKeys(R, H, D) {
  const s = R.s, hh = R.hipsH, a = R.ankle, st = R.stand;
  return [
    K(0.0, {}),
    K(0.14, { hips: [0, -H + hh - 0.07 * s, -D + 0.04], pitch: 22, chest: 6, hL: [0.24 * s, 0.03, 0.12 * s], hR: [-0.24 * s, 0.03, 0.12 * s], whL: 1, whR: 0.85,
      fL: [0.11 * s, -H + a, -D + 0.02], fR: [-0.11 * s, -H + 0.36 * s, -D + 0.08], look: -12, ease: 'out' }),
    K(0.32, { hips: [0, -H * 0.45 + hh * 0.55, -0.08 * s], pitch: 34, chest: 6, hL: [0.24 * s, 0.03, 0.12 * s], hR: [-0.24 * s, 0.03, 0.12 * s], whL: 1, whR: 0.85,
      fL: [0.11 * s, -H + a, -D + 0.02], fR: [-0.11 * s, a + 0.01, 0.16 * s], look: -4 }),
    K(0.52, { hips: [0, hh * 0.62, 0.12 * s], pitch: 24, chest: 2, hL: [0.24 * s, 0.03, 0.12 * s], hR: [-0.24 * s, 0.1 * s, 0.16 * s], whL: 0.7, whR: 0.3,
      fL: [0.11 * s, -H * 0.35, -0.12 * s], fR: [-0.11 * s, a, 0.16 * s], look: 2 }),
    K(0.7, { hips: [0, hh * 0.92, 0.28 * s], pitch: 8, hL: [0.26 * s, 0.35 * s, 0.3 * s], hR: [-0.26 * s, 0.35 * s, 0.3 * s], whL: 0.15, whR: 0,
      fL: [0.11 * s, a + 0.04, 0.34 * s], fR: [-0.11 * s, a, 0.2 * s] }),
    K(0.88, { hips: [st.hips.x, hh, 0.32 * s + st.hips.z], pitch: 0, fL: [st.fL.x, a, st.fL.z + 0.32 * s], fR: [st.fR.x, a, st.fR.z + 0.32 * s], wfL: 0, wfR: 0, ease: 'out' }),
  ];
}

// vault a thin fence (0.7 - 1.25 m): both hands on the top rail, hips over, knees tucked above the rail, land beyond. ~0.95 s
// th = rail thickness, L = landing height relative to the rail top (negative)
export function vaultKeys(R, H, D, th, L) {
  const s = R.s, hh = R.hipsH, a = R.ankle, st = R.stand, c = th / 2;
  const fz = th + 0.55 * s;
  return [
    K(0.0, {}),
    K(0.13, { hips: [0, -H + hh - 0.1 * s, -D + 0.06], pitch: 22, chest: 6, hL: [0.2 * s, 0.03, c], hR: [-0.2 * s, 0.03, c], whL: 1, whR: 1,
      fL: [0.11 * s, -H + a, -D + 0.02], fR: [-0.11 * s, -H + a, -D - 0.04 * s], look: -10, ease: 'out' }),
    K(0.32, { hips: [0.06 * s, 0.32 * s, -0.12 * s], pitch: 30, chest: 4, hL: [0.2 * s, 0.03, c], hR: [-0.2 * s, 0.03, c], whL: 1, whR: 1,
      fL: [0.16 * s, 0.1 * s, -0.22 * s], fR: [-0.02 * s, 0.14 * s, -0.16 * s], look: -2, ease: 'in' }),
    K(0.48, { hips: [0.04 * s, 0.3 * s, th + 0.18 * s], pitch: 14, chest: 0, hL: [0.2 * s, 0.03, c], hR: [-0.2 * s, 0.03, c], whL: 0.8, whR: 0.6,
      fL: [0.14 * s, 0.13 * s, th + 0.12 * s], fR: [-0.04 * s, 0.11 * s, th + 0.18 * s], look: 4 }),
    K(0.66, { hips: [0, L + hh - 0.16 * s, fz - 0.05 * s], pitch: 12, hL: [0.3 * s, L + hh + 0.1 * s, fz], hR: [-0.3 * s, L + hh + 0.1 * s, fz], whL: 0.2, whR: 0.1,
      fL: [0.12 * s, L + a, fz + 0.06 * s], fR: [-0.11 * s, L + a + 0.03, fz - 0.06 * s], ease: 'in' }),
    K(0.9, { hips: [st.hips.x, L + hh, fz + st.hips.z], pitch: 0, fL: [st.fL.x, L + a, st.fL.z + fz], fR: [st.fR.x, L + a, st.fR.z + fz], wfL: 0, wfR: 0, ease: 'out' }),
  ];
}
