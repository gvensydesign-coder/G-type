// Procedural pose layer on top of skeletal animation.
// Rotations are expressed in the character's root space (model faces +Z, +X is the character's LEFT, +Y up)
// and applied on top of whatever the AnimationMixer produced this frame.
import * as THREE from 'three';

const D = THREE.MathUtils.DEG2RAD;

// Parents must come before children.
export const BONES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightUpLeg', 'RightLeg', 'LeftUpLeg', 'LeftLeg',
];

const IDENT = new THREE.Quaternion();

// Euler [x, y, z] in degrees, order YXZ: rotate around Z first (raise sideways), then X (raise forward), then Y (sweep).
export function pose(def) {
  const p = {};
  for (const k in def) {
    const e = def[k];
    p[k] = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * D, e[1] * D, e[2] * D, 'YXZ'));
  }
  return p;
}

export function mirrorDef(def) {
  const out = {};
  for (const k in def) {
    const n = k.startsWith('Right') ? 'Left' + k.slice(5) : k.startsWith('Left') ? 'Right' + k.slice(4) : k;
    const e = def[k];
    out[n] = [e[0], -e[1], -e[2]];
  }
  return out;
}

export function blend(a, b, w, out = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const q = out[k] || (out[k] = new THREE.Quaternion());
    q.slerpQuaternions(a[k] || IDENT, b[k] || IDENT, w);
  }
  return out;
}

// Multiply pose b on top of pose a (b applied after a), weighted.
export function stack(a, b, w = 1) {
  const tmp = new THREE.Quaternion();
  for (const k in b) {
    tmp.slerpQuaternions(IDENT, b[k], w);
    if (a[k]) a[k].premultiply(tmp); else a[k] = tmp.clone();
  }
  return a;
}

const ease = (x) => x * x * (3 - 2 * x);

// Keyframed clip of poses: keys = [[t(0..1), poseObject], ...]
export class PoseClip {
  constructor(duration, keys, opts = {}) {
    this.duration = duration;
    this.keys = keys;
    Object.assign(this, opts);
  }
  sample(n, out = {}) {
    const k = this.keys;
    if (n <= k[0][0]) return blend(k[0][1], k[0][1], 0, out);
    for (let i = 0; i < k.length - 1; i++) {
      if (n <= k[i + 1][0]) {
        const a = (n - k[i][0]) / Math.max(1e-6, k[i + 1][0] - k[i][0]);
        return blend(k[i][1], k[i + 1][1], ease(a), out);
      }
    }
    const last = k[k.length - 1][1];
    return blend(last, last, 0, out);
  }
}

const _rootQ = new THREE.Quaternion();
const _rootQi = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _pqi = new THREE.Quaternion();
const _rw = new THREE.Quaternion();

// Apply root-space rotations to bones (call right after mixer.update()).
export function applyPose(root, bones, rot) {
  root.updateMatrixWorld(true);
  root.getWorldQuaternion(_rootQ);
  _rootQi.copy(_rootQ).invert();
  for (const name of BONES) {
    const q = rot[name];
    const bone = bones[name];
    if (!q || !bone) continue;
    _rw.copy(_rootQ).multiply(q).multiply(_rootQi);
    bone.parent.getWorldQuaternion(_pq);
    _pqi.copy(_pq).invert();
    bone.quaternion.premultiply(_pqi.multiply(_rw).multiply(_pq));
    bone.updateMatrixWorld(true);
  }
}
