// Procedural combat poses on full-body IK (replaces the retargeted mocap swings, whose arms barely moved).
// A move is a list of key poses in the actor's GROUP frame: +Z forward, +X the actor's LEFT, +Y up, ground at y = 0.
// Key fields
//   hips [x,y,z]            pelvis position (absolute, metres)
//   hy hp hr                pelvis yaw / pitch (forward lean +) / roll (lean to the right +), degrees
//   cy cp cr                chest twist / bend / side bend relative to the pelvis (spread over the spine)
//   ny np                   head yaw / pitch (looks down +)
//   hR hL [x,y,z]           wrist target as an OFFSET from that shoulder joint, in group axes (arm length limits it)
//   eR eL [x,y,z]           elbow direction in the chest frame (pole)
//   fL fR [x,y,z]           ankle targets (absolute); kL kR knee direction (group frame); yL yR foot yaw; tL tR heel raise
//   bl [x,y,z]              hero: blade direction (group frame); sh: shield face normal
// Keys are interpolated with a C1 Hermite spline (finite-difference tangents); a key with stop: true is a hold.
import * as THREE from 'three';
import { twoBone, turnWorld, setWorldQuat } from './ik.js';

const D2R = Math.PI / 180;
const VEC = ['hips', 'hR', 'hL', 'eR', 'eL', 'fL', 'fR', 'kL', 'kR', 'bl', 'sh'];
const SCA = ['hy', 'hp', 'hr', 'cy', 'cp', 'cr', 'ny', 'np', 'yL', 'yR', 'tL', 'tR'];

const cl = (o) => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; return r; };
// keys from a base pose and a list of [t, overrides, stop]
export function seq(base, list) {
  const out = []; let cur = cl(base);
  for (const [t, over, stop] of list) { cur = Object.assign(cl(cur), cl(over || {})); cur.t = t; cur.stop = !!stop; out.push(cur); }
  return out;
}
export function shiftKeys(keys, dx, dz) {
  for (const k of keys) for (const f of ['hips', 'fL', 'fR']) if (k[f]) { k[f][0] += dx; k[f][2] += dz; }
  return keys;
}
export const add = (v, d) => v.map((x, i) => x + (d[i] || 0));
// mirror left <-> right
export function mirror(keys) {
  return keys.map((k) => {
    const m = cl(k);
    const sw = [['hR', 'hL'], ['eR', 'eL'], ['fL', 'fR'], ['kL', 'kR'], ['yL', 'yR'], ['tL', 'tR']];
    for (const [a, b] of sw) { m[a] = cl({ v: k[b] }).v; m[b] = cl({ v: k[a] }).v; }
    for (const f of VEC) if (Array.isArray(m[f])) m[f][0] = -m[f][0];
    for (const f of ['hy', 'hr', 'cy', 'cr', 'ny', 'yL', 'yR']) if (m[f] != null) m[f] = -m[f];
    return m;
  });
}
function tan(keys, i, f, c) {
  const k = keys[i];
  if (k.stop || i === 0 || i === keys.length - 1) return 0;
  const a = keys[i - 1], b = keys[i + 1];
  const va = c < 0 ? a[f] ?? 0 : a[f][c], vb = c < 0 ? b[f] ?? 0 : b[f][c];
  return (vb - va) / Math.max(1e-4, b.t - a.t);
}
export function sample(keys, t, out = {}) {
  const n = keys.length;
  let i = 0;
  if (t <= keys[0].t) { t = keys[0].t; } else if (t >= keys[n - 1].t) { t = keys[n - 1].t; i = Math.max(0, n - 2); }
  while (i < n - 2 && keys[i + 1].t < t) i++;
  const a = keys[i], b = keys[Math.min(n - 1, i + 1)];
  const dt = Math.max(1e-4, b.t - a.t), u = THREE.MathUtils.clamp((t - a.t) / dt, 0, 1);
  const u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const j = Math.min(n - 1, i + 1);
  for (const f of VEC) {
    if (!a[f] || !b[f]) { out[f] = a[f] ? a[f].slice() : null; continue; }
    const o = out[f] || (out[f] = [0, 0, 0]);
    for (let c = 0; c < 3; c++) o[c] = h00 * a[f][c] + h10 * dt * tan(keys, i, f, c) + h01 * b[f][c] + h11 * dt * tan(keys, j, f, c);
  }
  for (const f of SCA) out[f] = h00 * (a[f] ?? 0) + h10 * dt * tan(keys, i, f, -1) + h01 * (b[f] ?? 0) + h11 * dt * tan(keys, j, f, -1);
  return out;
}
export function lerpPose(a, b, w, out = {}) {
  for (const f of VEC) {
    if (!a[f] || !b[f]) { out[f] = (w < 0.5 ? a[f] : b[f]) || null; if (out[f]) out[f] = out[f].slice(); continue; }
    const o = out[f] || (out[f] = [0, 0, 0]);
    for (let c = 0; c < 3; c++) o[c] = a[f][c] + (b[f][c] - a[f][c]) * w;
  }
  for (const f of SCA) out[f] = (a[f] ?? 0) + ((b[f] ?? 0) - (a[f] ?? 0)) * w;
  return out;
}

// ------------------------------------------------------------------ the rig
const _G = new THREE.Quaternion(), _R = new THREE.Quaternion(), _C = new THREE.Quaternion(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _GR = new THREE.Quaternion(), _GC = new THREE.Quaternion(), _part = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _t = new THREE.Vector3(), _o = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();
const eq = (y, p, r, out) => out.setFromEuler(_e.set((p || 0) * D2R, (y || 0) * D2R, -(r || 0) * D2R, 'YXZ'));

export class PoseRig {
  constructor(actor) {
    this.a = actor; this.ch = actor.ch; this.b = actor.R.b; this.hero = actor.hero;
    const ch = this.ch, g = ch.group;
    const keep = [g.position.clone(), g.rotation.y];
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); ch.pivot.position.set(0, 0, 0); ch.pivot.quaternion.identity();
    for (const [bn, q, p] of actor.rest) { bn.quaternion.copy(q); bn.position.copy(p); }
    g.updateMatrixWorld(true);
    this.Q = {}; this.P = {};
    for (const n in this.b) { this.Q[n] = this.b[n].getWorldQuaternion(new THREE.Quaternion()); this.P[n] = this.b[n].getWorldPosition(new THREE.Vector3()); }
    this.armLen = this.P.RightArm.distanceTo(this.P.RightForeArm) + this.P.RightForeArm.distanceTo(this.P.RightHand);
    this.legLen = this.P.RightUpLeg.distanceTo(this.P.RightLeg) + this.P.RightLeg.distanceTo(this.P.RightFoot);
    g.position.copy(keep[0]); g.rotation.y = keep[1]; g.updateMatrixWorld(true);
    this.miss = { hand: 0, foot: 0 };
  }
  _set(bone, q, w) {
    if (w < 1) { bone.getWorldQuaternion(_q2); _q2.slerp(q, w); setWorldQuat(bone, _q2); } else setWorldQuat(bone, q);
  }
  apply(K, w = 1) {
    if (w <= 0.001) return;
    const ch = this.ch, b = this.b, Q = this.Q;
    ch.pivot.updateMatrixWorld(true);
    const M = ch.pivot.matrixWorld; ch.pivot.getWorldQuaternion(_G);
    const W = (v, out) => out.set(v[0], v[1], v[2]).applyMatrix4(M);
    // pelvis
    W(K.hips, _p);
    if (w < 1) { b.Hips.getWorldPosition(_a); _p.lerpVectors(_a, _p, w); }
    b.Hips.parent.updateMatrixWorld(true);
    b.Hips.position.copy(b.Hips.parent.worldToLocal(_p.clone()));
    b.Hips.updateMatrixWorld(true);
    eq(K.hy, K.hp, K.hr, _R); _GR.copy(_G).multiply(_R);
    this._set(b.Hips, _q.copy(_GR).multiply(Q.Hips), w);
    // spine
    eq(K.cy, K.cp, K.cr, _C);
    const fr = { Spine: 0.3, Spine1: 0.65, Spine2: 1 };
    for (const n of ['Spine', 'Spine1', 'Spine2']) { _part.identity().slerp(_C, fr[n]); this._set(b[n], _q.copy(_GR).multiply(_part).multiply(Q[n]), w); }
    _GC.copy(_GR).multiply(_C);
    eq((K.ny || 0) * 0.4, (K.np || 0) * 0.4, 0, _part); this._set(b.Neck, _q.copy(_GC).multiply(_part).multiply(Q.Neck), w);
    eq(K.ny, K.np, 0, _part); this._set(b.Head, _q.copy(_GC).multiply(_part).multiply(Q.Head), w);
    for (const s of ['Left', 'Right']) this._set(b[s + 'Shoulder'], _q.copy(_GC).multiply(Q[s + 'Shoulder']), w);
    // arms
    this.miss.hand = 0;
    for (const s of ['Right', 'Left']) {
      const off = K['h' + s[0]]; if (!off) continue;
      const sign = s === 'Right' ? -1 : 1;
      // the collarbone lifts when the hand goes up
      const lift = THREE.MathUtils.clamp((off[1] - 0.04) / 0.3, 0, 1) * 18 * D2R;
      if (lift > 1e-3) turnWorld(b[s + 'Shoulder'], _q.setFromAxisAngle(_a.set(0, 0, 1).applyQuaternion(_GC), sign * lift * w));
      b[s + 'Arm'].getWorldPosition(_s);
      _t.copy(_s).add(_o.set(off[0], off[1], off[2]).multiplyScalar(this.ch.scale > 0 ? 1 : 1).applyQuaternion(_G));
      const e = K['e' + s[0]] || [sign * 0.7, -0.6, -0.2];
      const pole = _c.copy(_s).add(_o.set(e[0], e[1], e[2]).applyQuaternion(_GC).multiplyScalar(0.5));
      twoBone(b[s + 'Arm'], b[s + 'ForeArm'], b[s + 'Hand'], _t, pole, w);
      this.miss.hand = Math.max(this.miss.hand, b[s + 'Hand'].getWorldPosition(_a).distanceTo(_t));
    }
    if (this.hero) {
      if (K.sh) this.shieldTo(K.sh, w);
      if (K.bl) this.gripTo(K.bl, w);
    }
    // legs
    this.miss.foot = 0;
    for (const s of ['Left', 'Right']) {
      const f = K['f' + s[0]]; if (!f) continue;
      W(f, _t);
      b[s + 'UpLeg'].getWorldPosition(_s);
      const k = K['k' + s[0]] || [s === 'Left' ? 0.2 : -0.2, 0, 1];
      const pole = _c.copy(_s).add(_t).multiplyScalar(0.5).add(_o.set(k[0], k[1], k[2]).normalize().applyQuaternion(_G).multiplyScalar(0.6));
      twoBone(b[s + 'UpLeg'], b[s + 'Leg'], b[s + 'Foot'], _t, pole, w);
      this.miss.foot = Math.max(this.miss.foot, b[s + 'Foot'].getWorldPosition(_a).distanceTo(_t));
      eq(K['y' + s[0]], K['t' + s[0]], 0, _part);
      this._set(b[s + 'Foot'], _q.copy(_G).multiply(_part).multiply(Q[s + 'Foot']), w);
    }
    ch.model.updateMatrixWorld(true);
  }
  // sword hand: the fist closes around the grip so the blade leaves it along bl (thumb side)
  gripTo(bl, w) {
    const H = this.a.rig.right, b = this.b;
    const A = _a.set(bl[0], bl[1], bl[2]).normalize().applyQuaternion(_G).negate();     // across axis = -blade
    const fa = _b.subVectors(b.RightHand.getWorldPosition(_s), b.RightForeArm.getWorldPosition(_t)).normalize();
    const F = _c.copy(fa).addScaledVector(A, -fa.dot(A));
    if (F.lengthSq() < 0.09) { F.copy(fa).add(_o.set(0, -0.8, 0)); F.addScaledVector(A, -F.dot(A)); }
    F.normalize();
    const C = _o.crossVectors(F, A).normalize();
    const fl = H.fingerL, al = _p.copy(H.acrossL).addScaledVector(fl, -H.acrossL.dot(fl)).normalize();
    const cl2 = new THREE.Vector3().crossVectors(fl, al);
    _m.makeBasis(F, A, C); _m2.makeBasis(fl, al, cl2).transpose();
    _m.multiply(_m2);
    const qd = new THREE.Quaternion().setFromRotationMatrix(_m);
    // forearm takes most of the roll so the wrist does not candy-wrap
    const q0 = b.RightHand.getWorldQuaternion(new THREE.Quaternion());
    const d = qd.clone().multiply(q0.invert());
    const dot = d.x * fa.x + d.y * fa.y + d.z * fa.z;
    const tw = new THREE.Quaternion(fa.x * dot, fa.y * dot, fa.z * dot, d.w).normalize();
    turnWorld(b.RightForeArm, _q.identity().slerp(tw, 0.6 * w));
    this._set(b.RightHand, qd, w);
  }
  // shield arm: roll the forearm so the strapped shield faces sh
  shieldTo(sh, w) {
    const rig = this.a.rig, b = this.b;
    if (!rig.shieldLocal) return;
    const fa = b.LeftForeArm;
    const ax = _a.subVectors(b.LeftHand.getWorldPosition(_s), fa.getWorldPosition(_t)).normalize();
    fa.updateMatrixWorld(true);
    _m.multiplyMatrices(fa.matrixWorld, rig.shieldLocal);
    const n = _b.set(0, 1, 0).transformDirection(_m);
    const d = _c.set(sh[0], sh[1], sh[2]).normalize().applyQuaternion(_G);
    n.addScaledVector(ax, -n.dot(ax)); d.addScaledVector(ax, -d.dot(ax));
    if (n.lengthSq() < 1e-6 || d.lengthSq() < 1e-6) return;
    n.normalize(); d.normalize();
    const ang = Math.atan2(_o.crossVectors(n, d).dot(ax), n.dot(d));
    turnWorld(fa, _q.setFromAxisAngle(ax, ang * w));
  }
}

// ------------------------------------------------------------------ hero (1.53 m, arm 0.40 m)
const A = 0.105;
export const HS = {
  hips: [0, 0.77, 0], hy: -20, hp: 5, hr: 0, cy: 8, cp: 6, cr: 0, ny: 12, np: -6,
  fL: [0.12, A, 0.17], fR: [-0.18, A, -0.15], yL: -10, yR: -40, tL: 0, tR: 0, kL: [0.25, 0, 1], kR: [-0.45, 0, 1],
  hR: [-0.03, -0.2, 0.27], hL: [-0.23, -0.12, 0.26], eR: [-0.7, -0.6, -0.2], eL: [0.9, -0.15, 0.4],
  bl: [0.22, 1, 0.42], sh: [0.2, 0.05, 1],
};
// idle guard: breathing, weight shifting
export function heroIdle() {
  const L = []; const n = 8, T = 3.2;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T, a = (i / n) * Math.PI * 2;
    L.push([t, { hips: [0.012 * Math.sin(a), 0.77 - 0.008 * Math.sin(a * 2), 0], cp: 6 + 1.5 * Math.sin(a * 2), hR: [-0.03, -0.2 + 0.012 * Math.sin(a * 2 + 0.6), 0.27], hL: [-0.17, -0.1 + 0.01 * Math.sin(a * 2 + 0.3), 0.26], bl: [0.22 + 0.03 * Math.sin(a), 1, 0.42] }]);
  }
  return { keys: seq(HS, L), dur: T, loop: true };
}

// a sword (or shield) attack: stance -> wind-up (hold) -> contact -> follow-through -> stance moved by adv.
// The front (left) foot steps in on the strike, the back foot follows in the recovery.
function attack(name, [w, h, s, r], adv, P, o = {}) {
  const T1 = w, T2 = w + h, Th = w + h + s * 0.5, T3 = w + h + s, T4 = T3 + r;
  const hz = (k, z) => { const x = cl(k); x.hips = [x.hips ? x.hips[0] : 0, x.hips ? x.hips[1] : HS.hips[1], z]; return x; };
  const fl = HS.fL, fr = HS.fR;
  const air = o.hop || 0;
  // a long lunge starts with a gathering step of the back foot during the wind-up
  const g = Math.max(0, adv - 0.45), gz = g * 0.5, drop = Math.min(0.06, g * 0.12);
  const frg = [fr[0], A, fr[2] + g];
  const L = [
    [0, {}],
    [T1 * 0.5, Object.assign(lerpKey(HS, P.wind, 0.55), { hips: [0, (HS.hips[1] + (P.wind.hips?.[1] ?? HS.hips[1])) / 2, gz * 0.5 - 0.02], fR: g ? [fr[0], A + 0.07, fr[2] + g * 0.5] : fr.slice(), tR: g ? 15 : 0 })],
    [T1, Object.assign(hz(P.wind, gz - 0.04), { fR: frg.slice(), tR: 0 }), true],
    [T2, Object.assign(hz(P.hold || P.wind, gz - 0.05), { fL: [fl[0], A + 0.06 + air, fl[2] + adv * 0.35], fR: air ? [fr[0], A + air * 0.7, fr[2] + g + (adv - g) * 0.2] : frg.slice(), tL: 0 }), true],
  ];
  if (air) L.push([T2 + (Th - T2) * 0.55, Object.assign(lerpKey(P.hold || P.wind, P.hit, 0.5), { hips: [0, (P.hit.hips?.[1] ?? 0.72) + air, adv * 0.45], fL: [fl[0], A + air + 0.08, fl[2] + adv * 0.8], fR: [fr[0], A + air, fr[2] + adv * 0.45] })]);
  L.push(
    [Th, Object.assign(hz(P.hit, g + (adv - g) * 0.62), { fL: [fl[0], A, fl[2] + adv], fR: air ? [fr[0], A, fr[2] + g + (adv - g) * 0.5] : frg.slice() })],
    [T3, hz(P.fol, g + (adv - g) * 0.72)],
    [T3 + r * 0.35, Object.assign(lerpKey(P.fol, HS, 0.45), { hips: [0, (HS.hips[1] + (P.fol.hips?.[1] ?? HS.hips[1])) / 2, adv * 0.86], fR: [fr[0], A + 0.06, fr[2] + adv * 0.55], tR: 15 })],
    [T3 + r * 0.7, Object.assign(lerpKey(P.fol, HS, 0.85), { hips: [0, HS.hips[1], adv * 0.97], fR: [fr[0], A, fr[2] + adv], tR: 0 })],
    [T4, shiftKeys([cl(HS)], 0, adv)[0]],
  );
  const keys = seq(HS, L);
  if (!air) for (const k of keys) if (k.t >= Th) k.fL = [fl[0], A, fl[2] + adv];
  for (const k of keys) if (k.t >= T2 - 1e-3 && k.t <= T3 + 1e-3) k.hips[1] -= drop;
  return { name, keys, dur: T4, hit: Th, adv: [0, adv], src: o.src || 'blade', heavy: !!o.heavy, kick: !!o.kick, ph: [w, h, s, r] };
}
function lerpKey(a, b, w) { const o = {}; for (const f of [...VEC, ...SCA]) { const x = a[f] ?? HS[f], y = b[f] ?? x; if (x == null) continue; o[f] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * w) : x + (y - x) * w; } return o; }

// timings (s): wind-up, hold, strike, recovery (tuning.gd hero_moves)
const HDEF = {
  l1: ['Удар наискось', [0.46, 0.12, 0.13, 0.58], 0.5, {
    wind: { hips: [0, 0.76, 0], hy: -38, cy: -30, cp: -2, ny: 34, hR: [-0.1, 0.3, -0.13], eR: [-0.7, 0.35, -0.3], bl: [0.1, 0.8, -0.6], hL: [-0.17, -0.1, 0.26], sh: [0.35, 0, 1] },
    hold: { hips: [0, 0.76, 0], hy: -40, cy: -34, cp: -3, ny: 36, hR: [-0.12, 0.31, -0.15], eR: [-0.7, 0.4, -0.3], bl: [0.08, 0.75, -0.66] },
    hit: { hips: [0, 0.72, 0], hy: -6, hp: 10, cy: 16, cp: 12, ny: 8, hR: [0.05, 0.05, 0.36], eR: [-0.6, -0.4, 0.1], bl: [0.22, -0.1, 0.97], hL: [-0.11, -0.16, 0.24], sh: [0.5, 0, 0.9] },
    fol: { hips: [0, 0.71, 0], hy: 6, hp: 10, cy: 34, cp: 14, ny: -4, hR: [0.28, -0.22, 0.2], eR: [-0.3, -0.7, 0.3], bl: [0.85, -0.5, -0.1], hL: [-0.09, -0.2, 0.18] },
  }],
  l2: ['Выпад', [0.42, 0.1, 0.12, 0.58], 0.75, {
    wind: { hips: [0, 0.74, 0], hy: -42, cy: -26, cp: 0, ny: 38, hR: [-0.08, -0.02, -0.17], eR: [-0.6, -0.2, -0.7], bl: [0.04, 0.18, 1], hL: [-0.12, -0.1, 0.26], sh: [0.35, 0, 1] },
    hold: { hips: [0, 0.73, 0], hy: -44, cy: -28, ny: 40, hR: [-0.09, -0.01, -0.21], eR: [-0.6, -0.2, -0.7] },
    hit: { hips: [0, 0.66, 0], hy: -16, hp: 16, cy: -2, cp: 14, ny: 14, np: -14, hR: [0.06, 0.02, 0.37], eR: [-0.7, -0.4, 0.1], bl: [0.06, 0.1, 1], hL: [-0.05, -0.22, 0.12], sh: [0.7, 0, 0.6] },
    fol: { hips: [0, 0.66, 0], hy: -14, hp: 16, cy: 0, cp: 14, ny: 12, np: -14, hR: [0.05, 0.0, 0.36], bl: [0.08, 0.04, 1] },
  }],
  l3: ['Удар сверху', [0.52, 0.16, 0.13, 0.72], 0.55, {
    wind: { hips: [0, 0.79, 0], hy: -16, hp: -2, cy: -8, cp: -12, ny: 18, np: -16, hR: [0.0, 0.35, -0.06], eR: [-0.75, 0.5, 0], bl: [0.04, 0.35, -1], hL: [-0.17, -0.1, 0.26] },
    hold: { hips: [0, 0.8, 0], hy: -16, hp: -3, cy: -9, cp: -15, ny: 18, np: -18, hR: [0.0, 0.36, -0.09], eR: [-0.75, 0.55, 0], bl: [0.03, 0.2, -1] },
    hit: { hips: [0, 0.71, 0], hy: -10, hp: 12, cy: 0, cp: 16, ny: 10, np: -10, hR: [0.1, 0.13, 0.33], eR: [-0.6, 0, 0], bl: [0.06, -0.05, 1] },
    fol: { hips: [0, 0.68, 0], hy: -8, hp: 16, cy: 2, cp: 24, ny: 8, np: -4, hR: [0.1, -0.22, 0.27], eR: [-0.6, -0.4, 0], bl: [0.02, -0.6, 0.8] },
  }],
  l4: ['Горизонтальный слева', [0.44, 0.1, 0.14, 0.56], 0.55, {
    wind: { hips: [0, 0.75, 0], hy: -2, cy: 34, cp: 4, ny: -14, hR: [0.31, -0.02, 0.12], eR: [-0.2, -0.4, 0.7], bl: [0.85, 0.12, -0.5], hL: [-0.11, -0.2, 0.18], sh: [0.7, 0, 0.7] },
    hold: { hips: [0, 0.75, 0], hy: 0, cy: 40, cp: 4, ny: -18, hR: [0.32, -0.02, 0.08], eR: [-0.2, -0.4, 0.7], bl: [0.82, 0.1, -0.56] },
    hit: { hips: [0, 0.71, 0], hy: -22, hp: 10, cy: -12, cp: 8, ny: 18, hR: [-0.02, 0.0, 0.37], eR: [-0.7, -0.3, 0.1], bl: [0.12, 0.06, 1], hL: [-0.07, -0.2, 0.2], sh: [0.5, 0, 0.9] },
    fol: { hips: [0, 0.71, 0], hy: -30, hp: 10, cy: -38, cp: 8, ny: 30, hR: [-0.33, -0.05, 0.12], eR: [-0.6, -0.5, -0.3], bl: [-0.95, 0.0, 0.25] },
  }],
  l5: ['Удар в прыжке', [0.52, 0.16, 0.14, 0.74], 0.7, {
    wind: { hips: [0, 0.68, 0], hy: -24, hp: 14, cy: -14, cp: -6, ny: 22, np: -18, hR: [-0.04, 0.34, -0.1], eR: [-0.75, 0.5, -0.1], bl: [0.04, 0.4, -1], hL: [-0.12, -0.12, 0.26], kL: [0.3, 0, 1] },
    hold: { hips: [0, 0.67, 0], hy: -26, hp: 16, cy: -16, cp: -10, ny: 24, np: -20, hR: [-0.03, 0.36, -0.12], bl: [0.03, 0.25, -1] },
    hit: { hips: [0, 0.7, 0], hy: -8, hp: 14, cy: 0, cp: 18, ny: 8, np: -8, hR: [0.1, 0.13, 0.33], eR: [-0.6, 0, 0], bl: [0.05, -0.1, 1] },
    fol: { hips: [0, 0.64, 0], hy: -6, hp: 18, cy: 2, cp: 28, ny: 6, hR: [0.1, -0.24, 0.25], eR: [-0.6, -0.4, 0], bl: [0.0, -0.65, 0.76] },
  }, { hop: 0.2, heavy: 1 }],
  heavy: ['Тяжёлый сверху', [0.8, 0.32, 0.15, 0.9], 0.8, {
    wind: { hips: [0, 0.8, 0], hy: -22, hp: -4, cy: -12, cp: -16, ny: 24, np: -18, hR: [-0.02, 0.36, -0.1], eR: [-0.75, 0.55, -0.1], bl: [0.02, 0.15, -1], hL: [-0.13, -0.12, 0.26] },
    hold: { hips: [0, 0.8, 0], hy: -24, hp: -6, cy: -14, cp: -20, ny: 26, np: -20, hR: [-0.03, 0.36, -0.13], eR: [-0.75, 0.6, -0.1], bl: [0.02, -0.05, -1] },
    hit: { hips: [0, 0.68, 0], hy: -8, hp: 14, cy: 2, cp: 18, ny: 8, np: -8, hR: [0.1, 0.13, 0.33], eR: [-0.6, 0, 0], bl: [0.05, -0.08, 1] },
    fol: { hips: [0, 0.62, 0], hy: -6, hp: 20, cy: 4, cp: 28, ny: 6, hR: [0.1, -0.25, 0.24], eR: [-0.6, -0.4, 0], bl: [0.0, -0.66, 0.75] },
  }, { heavy: 1 }],
  heavyb: ['Тяжёлый снизу вверх', [0.85, 0.3, 0.16, 0.9], 0.9, {
    wind: { hips: [0, 0.64, 0], hy: -40, hp: 20, cy: -30, cp: 8, ny: 40, np: -24, hR: [-0.16, -0.32, -0.08], eR: [-0.8, -0.3, 0.2], bl: [-0.25, -0.5, -0.85], hL: [-0.11, -0.12, 0.26], sh: [0.4, 0, 1] },
    hold: { hips: [0, 0.62, 0], hy: -42, hp: 22, cy: -32, cp: 10, ny: 42, np: -26, hR: [-0.17, -0.31, -0.11], bl: [-0.25, -0.4, -0.9] },
    hit: { hips: [0, 0.74, 0], hy: -10, hp: 4, cy: 8, cp: 0, ny: 10, np: -14, hR: [0.06, 0.12, 0.36], eR: [-0.7, -0.3, 0], bl: [0.2, 0.6, 0.8] },
    fol: { hips: [0, 0.79, 0], hy: 0, hp: -4, cy: 14, cp: -10, ny: 0, np: -20, hR: [0.1, 0.36, 0.06], eR: [-0.6, 0.5, 0], bl: [0.1, 0.9, -0.4] },
  }, { heavy: 1 }],
  dash: ['Удар с разбега', [0.3, 0.08, 0.14, 0.62], 0.9, {
    wind: { hips: [0, 0.72, 0], hy: -36, hp: 14, cy: -28, cp: 4, ny: 34, hR: [-0.1, 0.28, -0.14], eR: [-0.7, 0.35, -0.3], bl: [0.1, 0.7, -0.7], hL: [-0.15, -0.1, 0.26] },
    hit: { hips: [0, 0.68, 0], hy: -6, hp: 14, cy: 16, cp: 12, ny: 8, hR: [0.05, 0.05, 0.36], eR: [-0.6, -0.4, 0.1], bl: [0.22, -0.1, 0.97], hL: [-0.11, -0.16, 0.24], sh: [0.5, 0, 0.9] },
    fol: { hips: [0, 0.67, 0], hy: 8, hp: 12, cy: 36, cp: 14, ny: -4, hR: [0.28, -0.22, 0.2], eR: [-0.3, -0.7, 0.3], bl: [0.85, -0.5, -0.1] },
  }, { heavy: 1 }],
  bash: ['Толчок щитом', [0.36, 0.08, 0.14, 0.5], 0.5, {
    wind: { hips: [0, 0.74, 0], hy: -44, hp: 6, cy: -18, ny: 40, hL: [-0.21, -0.08, 0.1], sh: [0.4, 0, 1], eL: [0.7, -0.5, -0.3], hR: [-0.05, -0.24, 0.02], bl: [0.05, 0.75, 0.6] },
    hit: { hips: [0, 0.7, 0], hy: -50, hp: 14, cy: -8, ny: 44, hL: [-0.27, -0.03, 0.26], sh: [0.15, 0.05, 1], eL: [0.8, -0.3, 0], hR: [-0.05, -0.25, 0.04] },
    fol: { hips: [0, 0.71, 0], hy: -48, hp: 12, cy: -8, ny: 42, hL: [-0.27, -0.05, 0.26] },
  }, { kick: 1, src: 'shield' }],
};
export function heroMove(id, adv) {
  if (id === 'jkick') return HERO.jkick;
  const d = HDEF[id]; return attack(d[0], d[1], adv ?? d[2], d[3], d[4] || {});
}
export const HERO = {};
for (const id in HDEF) HERO[id] = heroMove(id);

// jumping front kick (right leg)
HERO.jkick = (() => {
  const L = [
    [0, {}],
    [0.28, { hips: [0, 0.66, 0.04], hp: 12, cy: -4, ny: 14, hR: [-0.1, -0.12, 0.1], bl: [0.25, 1, 0.3], hL: [-0.17, -0.08, 0.24] }, true],
    [0.4, { hips: [0, 0.68, 0.08] }, true],
    [0.5, { hips: [0, 0.95, 0.35], hp: -6, hy: -10, fL: [0.12, 0.42, 0.42], kL: [0.2, 0.3, 1], fR: [-0.12, 0.42, 0.3], kR: [-0.2, 0.4, 1], tL: 30, tR: 20 }],
    [0.6, { hips: [0, 1.0, 0.52], hp: -20, hy: -6, cp: -4, fL: [0.12, 0.6, 0.45], fR: [-0.06, 0.92, 1.2], kR: [-0.1, 0.5, 1], tR: -30, hR: [-0.18, -0.05, -0.05], hL: [-0.02, -0.02, 0.2] }],
    [0.68, { hips: [0, 0.97, 0.5], fR: [-0.06, 0.88, 1.18] }],
    [0.86, { hips: [0, 0.8, 0.5], hp: 6, hy: -16, fL: [0.12, A + 0.04, 0.62], fR: [-0.14, 0.35, 0.5], kR: [-0.2, 0.2, 1], tL: 0, tR: 0 }],
    [1.04, { hips: [0, 0.68, 0.5], hp: 10, fL: [0.12, A, 0.7], fR: [-0.18, A, 0.38], kL: [0.25, 0, 1], kR: [-0.45, 0, 1] }],
    [1.6, shiftKeys([cl(HS)], 0, 0.55)[0]],
  ];
  return { name: 'Удар ногой в прыжке', keys: seq(HS, L), dur: 1.6, hit: 0.62, adv: [0, 0.55], src: 'footR', kick: true };
})();
// two short steps back to open the distance again
export function heroStepBack(d = 0.5) {
  const fl = HS.fL, fr = HS.fR;
  const L = [[0, {}],
    [0.2, { hips: [0, 0.77, -d * 0.3], fR: [fr[0], A + 0.06, fr[2] - d * 0.6], tR: 10 }],
    [0.35, { hips: [0, 0.76, -d * 0.55], fR: [fr[0], A, fr[2] - d], tR: 0 }],
    [0.55, { hips: [0, 0.77, -d * 0.85], fL: [fl[0], A + 0.06, fl[2] - d * 0.6] }],
    [0.7, shiftKeys([cl(HS)], 0, -d)[0]],
  ];
  return { keys: seq(HS, L), dur: 0.7, adv: [0, -d] };
}

// defence and reactions
export const HGUARD = {
  block: { name: 'Блок щитом', pose: { hips: [0, 0.71, 0], hy: -24, hp: 10, cy: 6, cp: 10, ny: 18, np: -10, hL: [-0.21, 0.05, 0.26], sh: [0.12, 0.08, 1], eL: [0.8, -0.3, -0.1], hR: [-0.06, -0.16, 0.06], bl: [0.15, 0.95, 0.25], eR: [-0.7, -0.6, -0.4] } },
};
export function heroBlock(tUp, tHit, tDown, push = 0.3, hard = false) {
  const B = HGUARD.block.pose, fr = HS.fR, fl = HS.fL;
  const L = [[0, {}], [tUp, B, true], [tHit - 0.02, B, true],
    [tHit + 0.08, { hips: [0, 0.69, -0.14], hp: hard ? -10 : 0, cp: hard ? -6 : 4, np: -2, hL: [-0.19, 0.07, 0.19], ny: 22 }],
    [tHit + 0.24, { hips: [0, 0.7, -push * 0.6], hp: 6, cp: 8, hL: [-0.21, 0.05, 0.26], fR: [fr[0], A + 0.05, fr[2] - push * 0.7] }],
    [tHit + 0.4, { hips: [0, 0.71, -push], fR: [fr[0], A, fr[2] - push], fL: [fl[0], A + 0.05, fl[2] - push * 0.6] }],
    [Math.max(tDown, tHit + 0.55), Object.assign(cl(B), { hips: [0, 0.71, -push], fL: [fl[0], A, fl[2] - push], fR: [fr[0], A, fr[2] - push] }), true],
  ];
  const te = Math.max(tDown, tHit + 0.55) + 0.35;
  L.push([te, shiftKeys([cl(HS)], 0, -push)[0]]);
  return { keys: seq(HS, L), dur: te, adv: [0, -push] };
}
export function heroHold(pose, t0, t1, t2) {   // raise a guard pose, hold, lower (no step)
  return { keys: seq(HS, [[0, {}], [t0, pose, true], [t1, pose, true], [t2, {}]]), dur: t2, adv: [0, 0] };
}
// light hit / stumble back
export function heroHit(push = 0.35, big = false) {
  const fr = HS.fR, fl = HS.fL;
  const L = [[0, {}],
    [0.1, { hips: [0, 0.75, -0.1], hp: big ? -18 : -12, cp: -10, cy: -8, np: -18, hR: [-0.16, -0.12, 0.12], hL: [-0.09, -0.04, 0.2], bl: [0.3, 0.8, 0.3] }],
    [0.3, { hips: [0, 0.74, -push * 0.55], hp: -6, cp: -4, np: -8, fR: [fr[0], A + 0.06, fr[2] - push * 0.7], tR: 10 }],
    [0.48, { hips: [0, 0.74, -push * 0.9], hp: 2, fR: [fr[0], A, fr[2] - push], tR: 0, fL: [fl[0], A + 0.05, fl[2] - push * 0.6] }],
    [0.7, shiftKeys([cl(HS)], 0, -push)[0]],
  ];
  if (big) { L.splice(2, 0, [0.2, { hips: [0, 0.73, -0.2], hp: -16, np: -14 }]); }
  return { keys: seq(HS, L), dur: 0.7, adv: [0, -push] };
}
// knocked down on the back, lies, gets up (adv: where he ends up)
export function heroKnock(back = 0.75, lie = 0.7) {
  const T = 0.75 + lie;
  const L = [[0, {}],
    [0.1, { hips: [0, 0.76, -0.14], hp: -22, cp: -12, np: -20, hR: [-0.2, -0.02, 0.06], hL: [0.01, 0.0, 0.14], bl: [-0.2, 0.8, 0.4], sh: [0.3, 0.6, 0.6] }],
    [0.3, { hips: [0, 0.6, -back * 0.5], hp: -45, cp: -10, np: 0, fL: [0.12, A + 0.2, 0.05], kL: [0.2, 0.5, 1], fR: [-0.16, A, -back * 0.45], tR: 20 }],
    [0.5, { hips: [0, 0.2, -back * 0.9], hp: -75, cp: -6, np: 18, fL: [0.14, A + 0.08, -back * 0.35], fR: [-0.18, A + 0.04, -back * 0.4], kL: [0.2, 1, 0.3], kR: [-0.2, 1, 0.3], tR: 0, hR: [-0.3, -0.04, -0.12], hL: [0.3, -0.02, -0.12], eR: [-0.8, 0.2, -0.3], eL: [0.8, 0.2, -0.3], bl: [-0.6, 0.1, 0.8], sh: [0.3, 1, 0] }],
    [0.62, { hips: [0, 0.13, -back], hp: -84, cp: -4, np: 26, fL: [0.15, A, -back * 0.35], fR: [-0.2, A, -back * 0.4], hR: [-0.32, -0.1, -0.1], hL: [0.32, -0.1, -0.1], bl: [-0.7, 0.0, 0.7] }, true],
    [0.62 + lie, { np: 30, cp: -2 }, true],
    [0.62 + lie + 0.4, { hips: [0, 0.16, -back * 0.98], hp: -20, cp: 8, np: 6, hR: [-0.1, -0.28, -0.18], hL: [0.1, -0.28, -0.16], eR: [-0.6, 0, -0.5], eL: [0.6, 0, -0.5], fL: [0.15, A, -back * 0.5], fR: [-0.2, A, -back * 0.55], kL: [0.3, 0.6, 1], kR: [-0.3, 0.6, 1], bl: [-0.3, 0.3, 1], sh: [0.4, 0.3, 1] }],
    [0.62 + lie + 0.85, { hips: [0, 0.42, -back * 0.85], hp: 30, cp: 10, np: -14, fL: [0.13, A, -back * 0.62], fR: [-0.18, A + 0.02, -back * 1.05], kL: [0.25, 0.1, 1], kR: [-0.3, -0.3, 1], tR: 50, hR: [-0.04, -0.3, 0.12], hL: [-0.13, -0.2, 0.22], eR: [-0.7, -0.5, 0], bl: [0.1, 0.5, 1], sh: [0.2, 0.05, 1] }],
    [0.62 + lie + 1.3, shiftKeys([cl(HS)], 0, -back * 0.8)[0]],
  ];
  const keys = seq(HS, L);
  return { keys, dur: keys[keys.length - 1].t, adv: [0, -back * 0.8] };
}
// quick dodge: dx, dz in the hero frame (side hop or back hop)
export function heroDodge(dx, dz) {
  const fl = HS.fL, fr = HS.fR, ln = Math.hypot(dx, dz) || 1, sx = dx / ln, sz = dz / ln;
  const L = [[0, {}],
    [0.12, { hips: [sx * 0.05, 0.63, sz * 0.05], hp: 16 - sz * 10, hr: -sx * 12, cp: 10, np: -14, hR: [-0.08, -0.18, 0.14], hL: [-0.17, -0.1, 0.26] }],
    [0.3, { hips: [dx * 0.45, 0.88, dz * 0.45], hp: 8, hr: -sx * 6, fL: [fl[0] + dx * 0.3, A + 0.2, fl[2] + dz * 0.3], fR: [fr[0] + dx * 0.4, A + 0.22, fr[2] + dz * 0.4], kL: [0.25, 0.4, 1], kR: [-0.3, 0.4, 1], tL: 25, tR: 25 }],
    [0.48, { hips: [dx * 0.95, 0.62, dz * 0.95], hp: 18, hr: sx * 8, fL: [fl[0] + dx, A, fl[2] + dz], fR: [fr[0] + dx, A, fr[2] + dz], kL: [0.25, 0, 1], kR: [-0.45, 0, 1], tL: 0, tR: 0 }],
    [0.62, { hips: [dx, 0.66, dz], hp: 14, hr: 0 }],
    [1.0, shiftKeys([cl(HS)], dx, dz)[0]],
  ];
  return { keys: seq(HS, L), dur: 1.0, adv: [dx, dz] };
}
// duck under a swipe and answer with a low cut
export function heroDuck(tDown, tUp) {
  const fl = HS.fL, fr = HS.fR;
  const D = { hips: [0, 0.48, -0.06], hp: 34, cp: 20, ny: 10, np: -36, fL: [fl[0] + 0.06, A, fl[2] + 0.05], fR: [fr[0] - 0.06, A, fr[2] - 0.08], kL: [0.4, 0, 1], kR: [-0.6, 0, 1], tR: 25, hL: [-0.19, 0.25, 0.14], sh: [0.05, 1, 0.35], eL: [0.8, 0.3, 0], hR: [-0.12, -0.12, 0.05], bl: [-0.2, 0.2, 1] };
  const L = [[0, {}], [tDown, D, true], [tUp, Object.assign(cl(D), { hips: [0, 0.5, -0.06] }), true],
    [tUp + 0.18, { hips: [0, 0.56, 0.12], hy: -40, hp: 26, cy: -26, ny: 36, np: -20, hR: [-0.16, -0.12, -0.12], eR: [-0.8, 0, 0.2], bl: [-0.1, 0.1, -1], hL: [-0.13, -0.1, 0.26], sh: [0.4, 0, 1], tR: 10 }, true],
    [tUp + 0.32, { hips: [0, 0.6, 0.3], hy: 0, hp: 22, cy: 30, cp: 14, ny: 0, hR: [0.1, -0.12, 0.35], eR: [-0.6, -0.4, 0.2], bl: [0.4, -0.25, 0.9], fL: [fl[0], A, fl[2] + 0.35], tR: 0 }],
    [tUp + 0.44, { hips: [0, 0.62, 0.34], hy: 6, cy: 40, hR: [0.3, -0.2, 0.2], bl: [0.9, -0.35, -0.1] }],
    [tUp + 0.75, { hips: [0, 0.72, 0.12], hy: -10, cy: 10, hR: [0.05, -0.2, 0.25], bl: [0.3, 0.6, 0.7], fL: [fl[0], A + 0.05, fl[2] + 0.15] }],
    [tUp + 1.0, {}],
  ];
  return { keys: seq(HS, L), dur: tUp + 1.0, adv: [0, 0], hit: tUp + 0.32 };
}

// ------------------------------------------------------------------ Leshy (2.5 m, arm 0.65 m)
const LA = 0.21;
export const LS = {
  hips: [0, 1.03, -0.05], hy: 0, hp: 14, hr: 0, cy: 0, cp: 12, cr: 0, ny: 0, np: -24,
  fL: [0.3, LA, 0.12], fR: [-0.3, LA, -0.18], yL: 18, yR: -12, tL: 0, tR: 0, kL: [0.45, 0, 1], kR: [-0.45, 0, 1],
  hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3], eR: [-0.8, -0.1, -0.5], eL: [0.8, -0.1, -0.5],
};
export function leshyIdle() {
  const L = []; const n = 8, T = 3.6;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T, a = (i / n) * Math.PI * 2;
    L.push([t, { hips: [0.03 * Math.sin(a), 1.03 - 0.012 * Math.sin(a * 2), -0.05], hr: 2.5 * Math.sin(a), cp: 12 + 2.5 * Math.sin(a * 2), ny: 6 * Math.sin(a + 1), hR: [-0.18 + 0.02 * Math.sin(a), -0.5 + 0.02 * Math.sin(a * 2 + 1), 0.26], hL: [0.18 + 0.02 * Math.sin(a + 2), -0.48 + 0.02 * Math.sin(a * 2), 0.3] }]);
  }
  return { keys: seq(LS, L), dur: T, loop: true };
}
// a one-hand claw swipe from its right side (mirror for the left): game SWIPE_KEYS 0.75 / 1.0 / 1.25 / 1.9
function leshySwipe() {
  const fl = LS.fL, fr = LS.fR, adv = 0.5;
  const L = [[0, {}],
    [0.75, { hips: [0, 1.02, -0.12], hp: 6, hy: -18, cy: -34, cp: 6, ny: 16, np: -20, hR: [-0.42, 0.12, -0.36], eR: [-0.9, 0.3, -0.3], hL: [0.25, -0.3, 0.42], eL: [0.8, -0.3, 0] }, true],
    [1.0, { hips: [0, 1.0, -0.14], hy: -22, cy: -40, hR: [-0.44, 0.14, -0.4], fL: [fl[0], LA + 0.1, fl[2] + adv * 0.4] }, true],
    [1.1, { hips: [0, 0.96, adv * 0.6], hp: 18, hy: 4, cy: 12, cp: 10, ny: -4, np: -26, hR: [0.06, -0.06, 0.6], eR: [-0.9, 0.1, 0], hL: [0.3, -0.4, 0.2], fL: [fl[0], LA, fl[2] + adv] }],
    [1.25, { hips: [0, 0.95, adv * 0.7], hy: 14, cy: 40, hR: [0.42, -0.2, 0.3], eR: [-0.4, 0.2, 0.6], hL: [0.3, -0.45, 0.0] }],
    [1.55, { hips: [0, 0.98, adv * 0.85], hy: 6, cy: 18, hp: 18, hR: [0.0, -0.5, 0.3], hL: [0.2, -0.48, 0.2], fR: [fr[0], LA + 0.08, fr[2] + adv * 0.6], tR: 15 }],
    [1.9, shiftKeys([cl(LS)], 0, adv)[0]],
  ];
  return { keys: seq(LS, L), dur: 1.9, hit: 1.12, adv: [0, adv], src: 'clawR' };
}
const SWR = leshySwipe();
export const LESHY = {
  swipeR: SWR,
  swipeL: { ...SWR, keys: mirror(SWR.keys), src: 'clawL' },
  // both claws from overhead (SMASH_KEYS 0.95 / 1.2 / 1.35 / 2.2)
  smash: (() => {
    const fl = LS.fL, fr = LS.fR, adv = 0.55;
    const L = [[0, {}],
      [0.95, { hips: [0, 1.1, -0.12], hp: -4, cp: -10, np: -8, hR: [-0.12, 0.48, 0.12], hL: [0.12, 0.48, 0.12], eR: [-0.9, 0.4, -0.3], eL: [0.9, 0.4, -0.3], kL: [0.4, 0, 1] }, true],
      [1.2, { hips: [0, 1.11, -0.16], hp: -8, cp: -14, np: -4, hR: [-0.12, 0.52, 0.06], hL: [0.12, 0.52, 0.06], fL: [fl[0], LA + 0.12, fl[2] + adv * 0.4] }, true],
      [1.29, { hips: [0, 0.94, adv * 0.6], hp: 26, cp: 18, np: -30, hR: [-0.06, 0.0, 0.62], hL: [0.06, 0.0, 0.62], eR: [-0.9, 0.2, 0], eL: [0.9, 0.2, 0], fL: [fl[0], LA, fl[2] + adv] }],
      [1.35, { hips: [0, 0.88, adv * 0.66], hp: 34, cp: 26, hR: [-0.06, -0.4, 0.46], hL: [0.06, -0.4, 0.46] }],
      [1.7, { hips: [0, 0.92, adv * 0.75], hp: 30, cp: 20 }, true],
      [2.0, { hips: [0, 1.0, adv * 0.9], hp: 18, cp: 14, hR: [-0.15, -0.5, 0.3], hL: [0.15, -0.48, 0.32], fR: [fr[0], LA + 0.08, fr[2] + adv * 0.6], tR: 12 }],
      [2.2, shiftKeys([cl(LS)], 0, adv)[0]],
    ];
    return { keys: seq(LS, L), dur: 2.2, hit: 1.3, adv: [0, adv], src: 'claws' };
  })(),
  // ground slam, super (SLAM_KEYS 1.2 / 1.45 / 2.6)
  slam: (() => {
    const L = [[0, {}],
      [0.7, { hips: [0, 1.14, -0.1], hp: -8, cp: -16, np: -4, hR: [-0.3, 0.42, 0.08], hL: [0.3, 0.42, 0.08], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3], fL: [0.36, LA, 0.18], fR: [-0.36, LA, -0.18] }],
      [1.2, { hips: [0, 1.16, -0.14], hp: -12, cp: -20, np: 0, hR: [-0.3, 0.45, 0.0], hL: [0.3, 0.45, 0.0] }, true],
      [1.36, { hips: [0, 0.82, 0.1], hp: 40, cp: 28, np: -36, hR: [-0.1, -0.3, 0.5], hL: [0.1, -0.3, 0.5], eR: [-0.9, 0.2, 0], eL: [0.9, 0.2, 0], kL: [0.5, 0, 1], kR: [-0.5, 0, 1] }],
      [1.45, { hips: [0, 0.7, 0.16], hp: 52, cp: 30, np: -44, hR: [-0.1, -0.6, 0.34], hL: [0.1, -0.6, 0.34] }],
      [1.9, { hips: [0, 0.72, 0.15], hp: 50, cp: 30, np: -40 }, true],
      [2.6, {}],
    ];
    return { keys: seq(LS, L), dur: 2.6, hit: 1.45, adv: [0, 0], src: 'claws', ground: true };
  })(),
  // leap on all fours (POUNCE_KEYS 0.55 / 1.2 / 2.1)
  pounce: (() => {
    const adv = 1.3, fl = LS.fL, fr = LS.fR;
    const L = [[0, {}],
      [0.55, { hips: [0, 0.78, -0.12], hp: 38, cp: 18, np: -40, hR: [-0.2, -0.3, -0.25], hL: [0.2, -0.3, -0.25], eR: [-0.8, 0.3, -0.3], eL: [0.8, 0.3, -0.3], kL: [0.5, 0, 1], kR: [-0.5, 0, 1] }, true],
      [0.8, { hips: [0, 1.45, adv * 0.4], hp: 30, cp: 10, np: -36, fL: [fl[0], 0.75, fl[2] + adv * 0.3], fR: [fr[0], 0.6, fr[2] + adv * 0.2], kL: [0.4, 0.2, 1], kR: [-0.4, 0.2, 1], tL: 40, tR: 40, hR: [-0.08, -0.06, 0.6], hL: [0.08, -0.06, 0.6], eR: [-0.9, 0, 0], eL: [0.9, 0, 0] }],
      [1.05, { hips: [0, 1.08, adv * 0.85], hp: 36, cp: 14, np: -40, fL: [fl[0], 0.5, fl[2] + adv * 0.75], fR: [fr[0], 0.45, fr[2] + adv * 0.7], hR: [-0.12, -0.12, 0.6], hL: [0.12, -0.12, 0.6] }],
      [1.2, { hips: [0, 0.78, adv], hp: 56, cp: 24, np: -50, fL: [fl[0], LA, fl[2] + adv], fR: [fr[0], LA, fr[2] + adv], tL: 0, tR: 0, hR: [-0.14, -0.62, 0.34], hL: [0.14, -0.62, 0.34] }, true],
      [1.6, { hips: [0, 0.8, adv], hp: 52, cp: 22, np: -46 }, true],
      [2.1, shiftKeys([cl(LS)], 0, adv)[0]],
    ];
    return { keys: seq(LS, L), dur: 2.1, hit: 1.05, adv: [0, adv], src: 'claws' };
  })(),
  // reaches to grab with both claws
  reach: (() => {
    const adv = 0.45, fl = LS.fL, fr = LS.fR;
    const L = [[0, {}],
      [0.6, { hips: [0, 1.05, -0.08], hp: 8, cp: 4, np: -20, hR: [-0.5, -0.05, 0.1], hL: [0.5, -0.05, 0.1], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3] }, true],
      [1.0, { hips: [0, 0.96, adv * 0.7], hp: 26, cp: 14, np: -30, hR: [-0.2, 0.0, 0.6], hL: [0.2, 0.0, 0.6], eR: [-0.9, 0.1, 0], eL: [0.9, 0.1, 0], fL: [fl[0], LA, fl[2] + adv] }],
      [1.2, { hips: [0, 0.95, adv * 0.75], hR: [-0.06, -0.04, 0.6], hL: [0.06, -0.04, 0.6] }, true],
      [1.6, { hips: [0, 0.98, adv * 0.8], hp: 22 }, true],
      [2.1, { hips: [0, 1.02, adv * 0.9], hp: 16, hR: [-0.2, -0.5, 0.3], hL: [0.2, -0.48, 0.32], fR: [fr[0], LA + 0.08, fr[2] + adv * 0.6], tR: 12 }],
      [2.5, shiftKeys([cl(LS)], 0, adv)[0]],
    ];
    return { keys: seq(LS, L), dur: 2.5, hit: 1.1, adv: [0, adv], src: 'claws' };
  })(),
  roar: (() => {
    const L = [[0, {}],
      [0.55, { hips: [0, 0.98, 0], hp: 24, cp: 22, np: -10, hR: [-0.25, -0.45, 0.25], hL: [0.25, -0.45, 0.25] }, true],
      [0.9, { hips: [0, 1.12, -0.08], hp: -8, cp: -22, np: -38, hR: [-0.58, 0.1, 0.12], hL: [0.58, 0.1, 0.12], eR: [-0.6, -0.5, -0.4], eL: [0.6, -0.5, -0.4], fL: [0.36, LA, 0.12], fR: [-0.36, LA, -0.18] }],
      [1.9, { hips: [0, 1.1, -0.08], hp: -6, cp: -24, np: -40, hR: [-0.6, 0.12, 0.14], hL: [0.6, 0.12, 0.14] }, true],
      [2.4, {}],
    ];
    return { keys: seq(LS, L), dur: 2.4, hit: 0.9, adv: [0, 0] };
  })(),
  beat: (() => {
    const L = [[0, {}], [0.4, { hips: [0, 1.08, -0.08], hp: 0, cp: -10, np: -32, hR: [0.12, -0.26, 0.18], hL: [-0.12, -0.26, 0.18], eR: [-0.9, 0, 0], eL: [0.9, 0, 0] }]];
    for (let i = 0; i < 6; i++) {
      const t = 0.55 + i * 0.26, r = i % 2 === 0;
      L.push([t, { hR: r ? [0.2, -0.16, 0.07] : [0.06, -0.2, 0.3], hL: r ? [-0.06, -0.2, 0.3] : [-0.2, -0.16, 0.07], cy: r ? -6 : 6 }]);
    }
    L.push([2.4, {}]);
    return { keys: seq(LS, L), dur: 2.4, adv: [0, 0] };
  })(),
};
// reactions
export function leshyHit(side = 1, push = 0.14) {
  const L = [[0, {}],
    [0.12, { hips: [0, 1.03, -0.06], hp: 4, cp: 0, cy: 12 * side, np: -10, ny: 10 * side, hR: [-0.26, -0.4, 0.22], hL: [0.26, -0.4, 0.24] }],
    [0.3, { hips: [0, 1.03, -push], hp: 8, cp: 6 }],
    [0.6, shiftKeys([cl(LS)], 0, -push)[0]],
  ];
  return { keys: seq(LS, L), dur: 0.6, adv: [0, -push] };
}
export function leshyStagger(push = 0.45) {
  const fl = LS.fL, fr = LS.fR;
  const L = [[0, {}],
    [0.15, { hips: [0, 1.06, -0.12], hp: -6, cp: -12, np: -6, hr: 6, hR: [-0.4, -0.2, 0.15], hL: [0.42, -0.15, 0.2], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3] }],
    [0.45, { hips: [0, 1.0, -push * 0.6], hp: 2, hr: -6, fR: [fr[0], LA + 0.12, fr[2] - push * 0.8], tR: 15 }],
    [0.75, { hips: [0, 0.98, -push * 0.9], hp: 10, hr: 4, fR: [fr[0], LA, fr[2] - push], tR: 0, fL: [fl[0], LA + 0.1, fl[2] - push * 0.5] }],
    [1.05, { hips: [0, 0.98, -push], hp: 18, cp: 16, hr: -3, np: -16, fL: [fl[0], LA, fl[2] - push], hR: [-0.2, -0.52, 0.24], hL: [0.2, -0.5, 0.28] }, true],
    [1.6, { hp: 16 }, true],
    [2.0, shiftKeys([cl(LS)], 0, -push)[0]],
  ];
  return { keys: seq(LS, L), dur: 2.0, adv: [0, -push] };
}
// topples onto its back and stays down
export function leshyFall(back = 0.9) {
  const L = [[0, {}],
    [0.15, { hips: [0, 1.08, -0.15], hp: -12, cp: -16, np: -10, hR: [-0.45, 0.0, 0.1], hL: [0.45, 0.05, 0.12], eR: [-0.9, 0.3, -0.3], eL: [0.9, 0.3, -0.3] }],
    [0.45, { hips: [0, 0.95, -back * 0.4], hp: -30, cp: -14, fR: [LS.fR[0], LA, LS.fR[2] - back * 0.5] }],
    [0.85, { hips: [0, 0.5, -back * 0.85], hp: -70, cp: -8, np: 10, fL: [0.3, LA + 0.25, 0.0], kL: [0.4, 0.6, 1], fR: [-0.3, LA, -back * 0.4], kR: [-0.4, 0.6, 1], hR: [-0.6, 0.05, -0.1], hL: [0.6, 0.05, -0.1] }],
    [1.1, { hips: [0, 0.3, -back], hp: -86, cp: -4, np: 20, fL: [0.35, LA, -0.05], fR: [-0.3, LA, -0.1], kL: [0.4, 1, 0.3], kR: [-0.4, 1, 0.3], hR: [-0.6, -0.1, -0.2], hL: [0.6, -0.1, -0.2] }],
    [1.25, { hips: [0, 0.34, -back], hp: -82 }],
    [1.4, { hips: [0, 0.3, -back], hp: -86, np: 24 }, true],
    [2.6, { np: 26 }, true],
    [3.1, { hips: [0, 0.34, -back], hp: -18, cp: 10, np: -6, hR: [-0.3, -0.45, -0.25], hL: [0.3, -0.45, -0.25], eR: [-0.8, 0, -0.5], eL: [0.8, 0, -0.5], fL: [0.32, LA, -back + 0.75], fR: [-0.3, LA, -back + 0.7], kL: [0.4, 0.7, 1], kR: [-0.4, 0.7, 1] }],
    [3.6, { hips: [0, 0.66, -back + 0.1], hp: 30, cp: 20, np: -20, fL: [0.32, LA, -back + 0.55], kL: [0.45, 0.2, 1], fR: [-0.28, 0.24, -back - 0.35], tR: 60, kR: [-0.3, -0.6, 0.6], hR: [-0.1, -0.55, 0.15], hL: [0.05, -0.45, 0.3] }],
    [4.2, { hips: [0, 0.98, -back + 0.15], hp: 18, cp: 14, np: -22, fL: [0.3, LA, -back + 0.32], fR: [-0.3, LA, -back - 0.1], tR: 0, kL: [0.45, 0, 1], kR: [-0.45, 0, 1], hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3] }],
    [4.6, shiftKeys([cl(LS)], 0, -back + 0.2)[0]],
  ];
  return { keys: seq(LS, L), dur: 4.6, adv: [0, -back + 0.2] };
}
// stunned (sways, arms hang), then drops to one knee on the impact, then gets up
export function leshyFinisherVictim(tImpact, tUp, tEnd) {
  const S = { hips: [0, 0.98, -0.05], hp: 24, cp: 18, np: -6, hR: [-0.12, -0.58, 0.2], hL: [0.12, -0.58, 0.22], eR: [-0.6, -0.4, -0.5], eL: [0.6, -0.4, -0.5] };
  const K = { hips: [0, 0.7, -0.12], hp: 16, cp: 26, np: 10, ny: 0, fL: [0.3, LA, 0.32], kL: [0.4, 0.3, 1], fR: [-0.28, 0.24, -0.72], tR: 62, kR: [-0.3, -0.6, 0.6], hR: [-0.1, -0.6, 0.1], hL: [0.02, -0.48, 0.28], eR: [-0.6, -0.4, -0.5] };
  const L = [[0, {}], [0.4, S, true], [0.8, Object.assign(cl(S), { hr: 4 })], [1.2, Object.assign(cl(S), { hr: -4 })], [tImpact - 0.02, S],
    [tImpact + 0.08, Object.assign(cl(S), { hips: [0, 1.0, -0.12], hp: -6, cp: -12, np: -26, hR: [-0.3, -0.35, 0.1], hL: [0.3, -0.35, 0.1] })],
    [tImpact + 0.4, K, true], [tUp, Object.assign(cl(K), { np: 18 }), true],
    [tUp + 0.5, { hips: [0, 0.92, -0.1], hp: 22, cp: 16, np: -10, fL: [0.3, LA, 0.2], fR: [-0.3, LA, -0.3], tR: 0, kL: [0.45, 0, 1], kR: [-0.45, 0, 1], hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3], eR: [-0.8, -0.1, -0.5] }],
    [tEnd, {}],
  ];
  return { keys: seq(LS, L), dur: tEnd, adv: [0, 0] };
}

// hero finishers: runs in (clip), then these keys (in the hero frame, the victim is ahead at +Z)
export function heroThrustFin() {
  const L = [[0, { hips: [0, 0.74, 0], hp: 14, cy: -10, cp: 8, hR: [-0.1, -0.08, -0.12], bl: [0.05, 0.3, 1], eR: [-0.6, -0.2, -0.7] }],
    [0.3, { hips: [0, 0.72, 0.05], hy: -30, hp: 10, cy: -24, ny: 30, hR: [-0.1, -0.04, -0.2], bl: [0.04, 0.35, 1], eR: [-0.6, -0.2, -0.7], hL: [0.1, -0.08, 0.26], sh: [0.4, 0, 1] }, true],
    [0.45, { hips: [0, 0.76, 0.35], hy: -12, hp: 10, cy: 0, cp: 4, ny: 10, np: -24, hR: [0.06, 0.08, 0.36], eR: [-0.7, -0.4, 0.1], bl: [0.04, 0.35, 1], hL: [0.14, -0.18, 0.12], sh: [0.7, 0, 0.6], fL: [HS.fL[0], A, HS.fL[2] + 0.4] }],
    [1.3, { hips: [0, 0.75, 0.37], np: -26, hR: [0.06, 0.1, 0.35] }, true],
    [1.55, { hips: [0, 0.76, 0.2], hp: 4, hR: [0.0, 0.0, 0.18], bl: [0.1, 0.35, 1], fL: [HS.fL[0], A, HS.fL[2] + 0.4] }],
    [1.9, { hips: [0, 0.77, -0.15], fL: [HS.fL[0], A + 0.05, HS.fL[2] + 0.05], fR: [HS.fR[0], A, HS.fR[2] - 0.3] }],
    [2.3, shiftKeys([cl(HS)], 0, -0.3)[0]],
  ];
  return { keys: seq(HS, L), dur: 2.3, hit: 0.45, adv: [0, -0.3] };
}
export function heroRisingFin() {
  const fl = HS.fL;
  const L = [[0, { hips: [0, 0.7, 0], hp: 16, hR: [-0.12, -0.2, 0.05], bl: [-0.1, -0.2, 1] }],
    [0.4, { hips: [0, 0.58, 0.1], hy: -44, hp: 24, cy: -34, cp: 10, ny: 44, np: -30, hR: [-0.16, -0.32, -0.08], eR: [-0.8, -0.3, 0.2], bl: [-0.25, -0.45, -0.85], hL: [0.06, -0.12, 0.27], sh: [0.4, 0, 1], fL: [fl[0], A, fl[2] + 0.25] }, true],
    [0.52, { hips: [0, 0.72, 0.32], hy: -12, hp: 4, cy: 6, cp: 0, ny: 10, np: -26, hR: [0.06, 0.14, 0.36], eR: [-0.7, -0.3, 0], bl: [0.2, 0.62, 0.78], fL: [fl[0], A, fl[2] + 0.4] }],
    [0.66, { hips: [0, 0.86, 0.38], hy: 0, hp: -6, cy: 14, cp: -12, ny: 0, np: -30, hR: [0.1, 0.36, 0.06], eR: [-0.6, 0.5, 0], bl: [0.1, 0.9, -0.4], fR: [HS.fR[0], A + 0.08, HS.fR[2] + 0.2], tR: 30 }],
    [1.3, { hips: [0, 0.8, 0.4], hp: 0, tR: 0, fR: [HS.fR[0], A, HS.fR[2] + 0.25] }, true],
    [1.7, { hips: [0, 0.77, 0.1], hR: [-0.03, -0.2, 0.27], bl: [0.12, 0.6, 1], eR: [-0.7, -0.6, -0.2], fL: [fl[0], A, fl[2] + 0.1], fR: [HS.fR[0], A, HS.fR[2] - 0.05] }],
    [2.2, shiftKeys([cl(HS)], 0, -0.05)[0]],
  ];
  return { keys: seq(HS, L), dur: 2.2, hit: 0.52, adv: [0, -0.05] };
}
