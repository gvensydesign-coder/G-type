import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { BONES, applyPose } from './pose.js';

// A rigged humanoid: yaw group -> pivot (for rolls/falls) -> skinned model.
export class Character {
  constructor(gltf, { scale = 1, surface = 0x9a9a9a, joints = 0x333333, emissive = 0x000000 } = {}) {
    this.scale = scale;
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    this.model = SkeletonUtils.clone(gltf.scene);
    this.model.scale.setScalar(scale);
    this.pivot.add(this.model);

    this.materials = [];
    this.model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material.clone();
        const isJoint = /Joints/i.test(m.name);
        m.color.setHex(isJoint ? joints : surface);
        m.emissive = new THREE.Color(emissive);
        m.roughness = isJoint ? 0.45 : 0.6;
        m.metalness = isJoint ? 0.5 : 0.1;
        o.material = m;
        this.materials.push(m);
      }
    });

    this.bones = {};
    for (const n of BONES) this.bones[n] = this.model.getObjectByName('mixamorig' + n);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of gltf.animations) {
      if (!['idle', 'walk', 'run'].includes(clip.name)) continue;
      const a = this.mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(clip.name === 'idle' ? 1 : 0);
      this.actions[clip.name] = a;
    }
    this.weights = { idle: 1, walk: 0, run: 0 };
    this.target = { idle: 1, walk: 0, run: 0 };
    this._flash = 0;
    this._glow = new THREE.Color(0, 0, 0);
  }

  get position() { return this.group.position; }
  get yaw() { return this.group.rotation.y; }
  set yaw(v) { this.group.rotation.y = v; }

  setLoco(name, timeScale = 1) {
    for (const k in this.target) this.target[k] = k === name ? 1 : 0;
    if (this.actions[name]) this.actions[name].timeScale = timeScale;
  }

  // Rotate around the point (0, h, 0) in the yaw group's frame.
  setPivot(rx, rz, h, lift = 0) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz, 'XYZ'));
    const c = new THREE.Vector3(0, h, 0);
    this.pivot.quaternion.copy(q);
    this.pivot.position.copy(c).sub(c.clone().applyQuaternion(q));
    this.pivot.position.y += lift;
  }

  flash(t = 0.12) { this._flash = t; }

  setGlow(hex, strength) { this._glow.setHex(hex).multiplyScalar(strength); }

  update(dt, rot) {
    const k = 1 - Math.exp(-dt * 10);
    for (const n in this.actions) {
      this.weights[n] += (this.target[n] - this.weights[n]) * k;
      this.actions[n].setEffectiveWeight(this.weights[n]);
    }
    this.mixer.update(dt);
    if (rot) applyPose(this.model, this.bones, rot);
    this._flash = Math.max(0, this._flash - dt);
    for (const m of this.materials) {
      if (this._flash > 0) m.emissive.setRGB(0.9, 0.9, 0.9);
      else m.emissive.copy(this._glow);
    }
  }

  worldBone(name, out = new THREE.Vector3()) {
    return this.bones[name].getWorldPosition(out);
  }
}
