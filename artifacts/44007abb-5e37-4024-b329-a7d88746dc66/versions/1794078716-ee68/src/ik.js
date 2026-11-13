// Inverse kinematics helpers for the mixamo rigs: two-bone limbs with a pole, world-space bone turns,
// and the foot placement layer (ground following, pelvis drop, foot locking against sliding).
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _t = new THREE.Vector3();
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _k = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();

// turn a bone by a world-space rotation q (keeps its children attached)
export function turnWorld(bone, q) {
  bone.getWorldQuaternion(_q2);
  bone.parent.getWorldQuaternion(_pq);
  _q2.premultiply(q);
  bone.quaternion.copy(_pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

// set the world orientation of a bone directly
export function setWorldQuat(bone, q) {
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(q));
  bone.updateMatrixWorld(true);
}

// rotate bone so that the direction bone->child points along dir (world), weighted
export function aimBone(bone, child, dir, w = 1) {
  bone.getWorldPosition(_a); child.getWorldPosition(_b);
  _u.subVectors(_b, _a).normalize();
  _q.setFromUnitVectors(_u, _v.copy(dir).normalize());
  if (w < 1) _q.slerp(_q2.identity(), 1 - w);
  turnWorld(bone, _q);
}

// Two-bone IK: a (upper) -> b (lower) -> c (end). target and pole are world points. w blends with the input pose.
export function twoBone(a, b, c, target, pole, w = 1) {
  if (w <= 0.001) return;
  a.getWorldPosition(_a); b.getWorldPosition(_b); c.getWorldPosition(_c);
  const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
  _t.copy(_c).lerp(target, w);
  _d.subVectors(_t, _a);
  let dist = _d.length();
  if (dist < 1e-5) return;
  _d.divideScalar(dist);
  dist = THREE.MathUtils.clamp(dist, Math.abs(la - lb) + 1e-3, (la + lb) * 0.9995);
  // bend direction: towards the pole (or keep the current knee side)
  if (pole) _p.subVectors(pole, _a); else _p.subVectors(_b, _a);
  _p.addScaledVector(_d, -_p.dot(_d));
  if (_p.lengthSq() < 1e-8) { _p.subVectors(_b, _a).addScaledVector(_d, -_d.dot(_v.subVectors(_b, _a))); }
  _p.normalize();
  const x = (la * la - lb * lb + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, la * la - x * x));
  _k.copy(_a).addScaledVector(_d, x).addScaledVector(_p, h);
  // upper bone: current b -> desired knee
  _u.subVectors(_b, _a).normalize(); _v.subVectors(_k, _a).normalize();
  _q.setFromUnitVectors(_u, _v); turnWorld(a, _q);
  // lower bone: current c -> target
  b.getWorldPosition(_b); c.getWorldPosition(_c);
  _u.subVectors(_c, _b).normalize(); _v.subVectors(_t.copy(_a).addScaledVector(_d, dist), _b).normalize();
  _q.setFromUnitVectors(_u, _v); turnWorld(b, _q);
}

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (x) => x * x * (3 - 2 * x);

// Foot placement for a Character (see character.js). ground(x, z, maxY) -> { y, n } in world space.
export class FootIK {
  constructor(ch) {
    this.ch = ch;
    const B = (n) => ch.model.getObjectByName('mixamorig' + n);
    this.legs = ['Left', 'Right'].map((s) => ({
      s, up: B(s + 'UpLeg'), lo: B(s + 'Leg'), foot: B(s + 'Foot'), toe: B(s + 'ToeBase'),
      lock: new THREE.Vector3(), lockW: 0, contact: 0, off: 0, n: new THREE.Vector3(0, 1, 0), tgt: new THREE.Vector3(), gy: 0,
    }));
    this.hips = B('Hips');
    this.pelvis = 0;
    this.enabled = true;
    this.lockOn = true;
    this.weight = 1;          // overall (0 in the air, during clips that own the feet)
    this.w = 0;
    ch.model.updateMatrixWorld(true);
    const s = ch.scale;
    // ankle height and leg length measured in the rest pose
    const f = this.legs[0].foot.getWorldPosition(new THREE.Vector3());
    const r = ch.group.position.y;
    this.ankle = Math.max(0.03, f.y - r - ch.model.position.y * 0 );
    this.legLen = this.legs[0].up.getWorldPosition(new THREE.Vector3()).distanceTo(f);
    this.maxDrop = this.legLen * 0.42;
  }

  // call after the animation pose is final. rootY = ground height the controller stands the character on.
  update(dt, ground, rootY) {
    const ch = this.ch;
    const wT = this.enabled ? this.weight : 0;
    this.w += (wT - this.w) * (1 - Math.exp(-dt * 14));
    if (this.w < 0.002) { for (const L of this.legs) { L.lockW = 0; L.contact = 0; } this.pelvis *= 0.8; return; }
    // 1. where the animation puts the feet, and the ground under them
    let minOff = 0;
    for (const L of this.legs) {
      L.foot.getWorldPosition(L.tgt);
      const h = L.tgt.y - rootY;                         // animated ankle height above the flat floor
      const g = ground(L.tgt.x, L.tgt.z, rootY + 0.55);
      L.gy = g.y; L.n.lerp(g.n, 1 - Math.exp(-dt * 18)).normalize();
      L.off = g.y - rootY;
      L.h = h;
      // contact: the clip keeps the ankle low
      const c = h < this.ankle * 1.6 + 0.02 ? 1 : 0;
      L.contactPrev = L.contact; L.contact = c;
      minOff = Math.min(minOff, L.off);
    }
    // 2. pelvis drops so the lower foot can reach (smoothed, a spring would overshoot on stairs)
    const want = Math.max(-this.maxDrop, minOff);
    this.pelvis += (want - this.pelvis) * (1 - Math.exp(-dt * 12));
    const drop = this.pelvis * this.w;
    this.hips.position.y += drop / ch.scale;            // model-space units (uniform scale, model is not rotated)
    ch.model.updateMatrixWorld(true);
    // 3. legs reach their targets, feet lie on the surface
    for (const L of this.legs) {
      _t.copy(L.tgt); _t.y = L.gy + Math.max(L.h, this.ankle * 0.92);
      // foot locking: a planted foot stays where it was put down
      if (this.lockOn && L.contact) {
        if (!L.contactPrev || L.lockW <= 0) L.lock.copy(_t);
        L.lockW = Math.min(1, L.lockW + dt / 0.06);
        if (Math.hypot(L.lock.x - _t.x, L.lock.z - _t.z) > 0.16 * ch.height / 1.53) L.contact = 0; // stretched too far: let it go
      } else L.lockW = Math.max(0, L.lockW - dt / 0.12);
      if (L.lockW > 0) { const k = smooth(L.lockW); _t.x += (L.lock.x - _t.x) * k; _t.z += (L.lock.z - _t.z) * k; }
      if (!L.contact && L.lockW > 0) L.lock.lerp(_t, 1 - Math.exp(-dt * 20));
      L.final = (L.final || new THREE.Vector3()).copy(_t);
      // knee pole: forward of the knee in the character's facing
      L.lo.getWorldPosition(_b);
      L.up.getWorldPosition(_a);
      const fw = _c.set(Math.sin(ch.yaw), 0, Math.cos(ch.yaw));
      const pole = _p.copy(_b).addScaledVector(fw, 0.5);
      twoBone(L.up, L.lo, L.foot, _t, pole, this.w);
      // align the sole with the ground normal (more when planted)
      const k = this.w * (0.35 + 0.65 * Math.max(L.contact, L.lockW)) * Math.max(0, 1 - Math.max(0, L.h - this.ankle) / (0.25 * ch.height));
      if (k > 0.01) {
        _q.setFromUnitVectors(UP, L.n);
        _q.slerp(_q2.identity(), 1 - k);
        turnWorld(L.foot, _q);
      }
    }
  }
}
