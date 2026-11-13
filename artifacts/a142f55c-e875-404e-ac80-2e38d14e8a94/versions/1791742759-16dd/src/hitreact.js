// Hit reactions as a reusable mechanic.
//
// HitReactor: physically driven body reaction layered on top of any animation (additive, so the
// character keeps attacking / walking while the torso, head and arms recoil from the blow).
//   • the blow is an impulse on damped springs: torso pitch / roll / twist;
//   • the head and the arms are secondary springs that chase the torso with a lag (whiplash, arm flail);
//   • the root gets a short slide in the push direction.
// Rig contract: Mixamo-like bone names (Spine, Spine1, Spine2, Neck, Head, LeftArm, RightArm, Hips)
// and the pose layer of pose.js (root-space rotations, model faces +Z, +X is the character's left).
//
// HitDebris: bark chips that bounce and settle, leaves that flutter down, glowing wounds stuck to bones.
//
// Usage (see main.js):
//   const react = new HitReactor(LESHY_REACT);
//   react.hit(localImpactPoint, localPushDir, power);   // on every hit
//   rot = react.apply(rot, dt);                          // every frame, before ch.update(dt, rot)
//   ch.position.add(react.slide(dt, yaw));               // root push
import * as THREE from 'three';

const D = THREE.MathUtils.DEG2RAD;

// Damped spring around 0 (or around a moving target for secondary motion).
class Spring {
  constructor(freq, damp) { this.w = 2 * Math.PI * freq; this.z = damp; this.x = 0; this.v = 0; }
  step(dt, target = 0) {
    // semi-implicit Euler with substeps: stable for any frame time
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (this.w * this.w * (target - this.x) - 2 * this.z * this.w * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

export const REACT_PRESETS = {
  // 2.5 m wooden giant: slow, heavy sway, small root push
  giant: { freq: 2.6, damp: 0.42, pitch: 30, roll: 22, twist: 26, head: 1.5, arms: 1.3, secFreq: 1.9, secDamp: 0.35, slide: 0.55, maxDeg: 34 },
  // human-sized: quicker, snappier
  human: { freq: 4.2, damp: 0.38, pitch: 26, roll: 18, twist: 22, head: 1.3, arms: 1.0, secFreq: 3.0, secDamp: 0.4, slide: 0.9, maxDeg: 30 },
};

export class HitReactor {
  constructor(opts = REACT_PRESETS.human) {
    this.o = { ...REACT_PRESETS.human, ...opts };
    const { freq, damp, secFreq, secDamp } = this.o;
    this.pitch = new Spring(freq, damp); this.roll = new Spring(freq, damp); this.twist = new Spring(freq * 0.85, damp);
    this.headP = new Spring(secFreq, secDamp); this.headR = new Spring(secFreq, secDamp);
    this.armL = new Spring(secFreq * 0.9, secDamp * 0.8); this.armR = new Spring(secFreq * 0.9, secDamp * 0.8);
    this.low = 0; // share of the reaction that goes into the hips (low hits)
    this.push = new THREE.Vector2();
    this._q = {};
    this._e = new THREE.Euler();
    this.energy = 0;
  }

  // point: impact point in character space (metres, +Z forward, +X left, +Y up)
  // dir: push direction in character space (where the blow drives the body), any length
  // power: 0..1+ (light hit ~0.45, heavy ~1)
  hit(point, dir, power = 0.5, height = 2) {
    const o = this.o;
    const d = new THREE.Vector3(dir.x, 0, dir.z);
    if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
    d.normalize();
    const h = THREE.MathUtils.clamp(point.y / height, 0, 1);
    const up = 0.55 + 0.6 * h; // high hits rock the torso more
    // impulses are velocities in deg/s scaled by the spring frequency, so the peak angle ~ the preset angle
    const k = power * this.pitch.w;
    this.pitch.v += d.z * o.pitch * up * k * D;     // pushed back -> lean back (negative X)
    this.roll.v += -d.x * o.roll * up * k * D;       // pushed to the left -> tilt left
    // twist = torque around the vertical axis: (r x F).y
    const torque = THREE.MathUtils.clamp(point.z * d.x - point.x * d.z, -1, 1);
    this.twist.v += torque * o.twist * k * D * 1.6;
    this.low = Math.max(this.low * 0.5, 1 - h);
    this.push.x += d.x * o.slide * power; this.push.y += d.z * o.slide * power;
  }

  // Layer the reaction on top of a pose (object of quaternions, may be null). Returns the pose to apply.
  apply(rot, dt) {
    const o = this.o;
    const lim = o.maxDeg * D;
    const P = THREE.MathUtils.clamp(this.pitch.step(dt), -lim, lim);
    const R = THREE.MathUtils.clamp(this.roll.step(dt), -lim, lim);
    const Y = THREE.MathUtils.clamp(this.twist.step(dt), -lim, lim);
    // the head lags behind the torso and overshoots; arms flail opposite to the torso tilt
    const hp = this.headP.step(dt, P * o.head), hr = this.headR.step(dt, R * o.head);
    const al = this.armL.step(dt, -R * o.arms + Math.abs(P) * 0.6), ar = this.armR.step(dt, -R * o.arms - Math.abs(P) * 0.6);
    this.low *= Math.exp(-dt * 1.5);
    this.energy = Math.abs(P) + Math.abs(R) + Math.abs(Y) + Math.abs(this.pitch.v) * 0.1;
    if (this.energy < 0.002 && Math.abs(hp) < 0.002 && Math.abs(al) + Math.abs(ar) < 0.004) return rot;

    const out = rot ? rot : {};
    const lo = this.low * 0.35;
    this._add(out, 'Spine', P * (0.4 + lo), Y * 0.35, R * (0.4 + lo));
    this._add(out, 'Spine1', P * 0.32, Y * 0.35, R * 0.32);
    this._add(out, 'Spine2', P * 0.25, Y * 0.3, R * 0.25);
    this._add(out, 'Neck', (hp - P) * 0.6, 0, (hr - R) * 0.6);
    this._add(out, 'Head', (hp - P) * 0.5, -Y * 0.25, (hr - R) * 0.4);
    this._add(out, 'LeftArm', -Math.abs(al) * 0.4, 0, al * 0.9);
    this._add(out, 'RightArm', -Math.abs(ar) * 0.4, 0, ar * 0.9);
    return out;
  }

  // Root slide for this frame, in world space (the push decays quickly: a heavy body barely moves).
  slide(dt, yaw, out = new THREE.Vector3()) {
    const k = Math.exp(-dt * 6);
    const sx = this.push.x * (1 - k) , sz = this.push.y * (1 - k);
    this.push.multiplyScalar(k);
    // character space -> world: forward = (sin yaw, cos yaw), left = (cos yaw, -sin yaw)
    const s = Math.sin(yaw), c = Math.cos(yaw);
    return out.set(sx * c + sz * s, 0, -sx * s + sz * c);
  }

  reset() { for (const s of [this.pitch, this.roll, this.twist, this.headP, this.headR, this.armL, this.armR]) s.x = s.v = 0; this.push.set(0, 0); this.low = 0; }

  _add(out, bone, x, y, z) {
    const q = this._q[bone] || (this._q[bone] = new THREE.Quaternion());
    q.setFromEuler(this._e.set(x, y, z, 'YXZ'));
    if (out[bone]) out[bone] = out[bone].clone().premultiply(q);
    else out[bone] = q.clone();
  }
}

// World point / direction -> character space for a character with root at pos and yaw.
export function toLocal(pos, yaw, worldPoint, out = new THREE.Vector3()) {
  const dx = worldPoint.x - pos.x, dz = worldPoint.z - pos.z;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  return out.set(dx * c - dz * s, worldPoint.y - pos.y, dx * s + dz * c);
}
export function dirToLocal(yaw, worldDir, out = new THREE.Vector3()) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  return out.set(worldDir.x * c - worldDir.z * s, worldDir.y, worldDir.x * s + worldDir.z * c);
}

// ---------------------------------------------------------------- debris & wounds
function chipGeometry() {
  // a thin splinter: stretched, slightly bent box
  const g = new THREE.BoxGeometry(0.035, 0.025, 0.16, 1, 1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i); p.setY(i, p.getY(i) + z * z * 0.8); }
  g.computeVertexNormals();
  return g;
}
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.07); s.quadraticCurveTo(0.05, -0.01, 0, 0.07); s.quadraticCurveTo(-0.05, -0.01, 0, -0.07);
  return new THREE.ShapeGeometry(s, 3);
}
function slashTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.25, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, 16); g.quadraticCurveTo(64, 2, 128, 16); g.quadraticCurveTo(64, 26, 0, 16); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class HitDebris {
  constructor(scene, { maxChips = 90, maxLeaves = 90, maxWounds = 8, bark = 0x5a4228, leaf = [0x6f8f2a, 0x9aa83a, 0xb88a2e, 0x4f6f22], wound = 0xb8ff6a } = {}) {
    this.scene = scene;
    const mk = (geo, mat, n) => {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0; m.frustumCulled = false; m.castShadow = true;
      scene.add(m); return m;
    };
    this.chipMesh = mk(chipGeometry(), new THREE.MeshStandardMaterial({ color: bark, roughness: 0.95, flatShading: true }), maxChips);
    this.leafMesh = mk(leafGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), maxLeaves);
    this.leafMesh.castShadow = false;
    this.leafColors = leaf.map((c) => new THREE.Color(c));
    this.chips = []; this.leaves = []; this.maxChips = maxChips; this.maxLeaves = maxLeaves;
    this.wounds = []; this.maxWounds = maxWounds;
    this.woundTex = slashTexture(); this.woundColor = new THREE.Color(wound);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
  }

  // at: world point; dir: world push direction; power 0..1
  spawn(at, dir, power = 0.5) {
    const d = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const nChips = Math.round(5 + 10 * power), nLeaves = Math.round(4 + 12 * power);
    for (let i = 0; i < nChips; i++) {
      if (this.chips.length >= this.maxChips) this.chips.shift();
      const v = d.clone().multiplyScalar(1.5 + Math.random() * 3 * (0.6 + power))
        .add(new THREE.Vector3(Math.random() - 0.5, 0.6 + Math.random() * 1.4, Math.random() - 0.5).multiplyScalar(2.2));
      this.chips.push({ p: at.clone(), v, r: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new THREE.Vector3().randomDirection().multiplyScalar(14 + Math.random() * 10), s: 0.9 + Math.random() * 1.2, life: 0, rest: false });
    }
    for (let i = 0; i < nLeaves; i++) {
      if (this.leaves.length >= this.maxLeaves) this.leaves.shift();
      const v = d.clone().multiplyScalar(0.8 + Math.random() * 2).add(new THREE.Vector3(Math.random() - 0.5, 0.8 + Math.random() * 1.6, Math.random() - 0.5).multiplyScalar(1.6));
      this.leaves.push({ p: at.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.2)), v, ph: Math.random() * 6.28, spin: 2 + Math.random() * 4, s: 1.0 + Math.random() * 1.0, c: this.leafColors[(Math.random() * this.leafColors.length) | 0], life: 0, rest: false });
    }
  }

  // A glowing slash stuck to the nearest bone; faces the attacker, fades over `life` seconds.
  wound(ch, at, dir, boneNames = ['Spine', 'Spine1', 'Spine2', 'Neck', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'Hips'], life = 7) {
    let best = null, bd = 1e9; const tmp = new THREE.Vector3();
    for (const n of boneNames) { const b = ch.bones[n]; if (!b) continue; const dd = b.getWorldPosition(tmp).distanceToSquared(at); if (dd < bd) { bd = dd; best = b; } }
    if (!best) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.1), new THREE.MeshBasicMaterial({ map: this.woundTex, color: this.woundColor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.copy(at).addScaledVector(dir, -0.04);
    m.lookAt(tmp.copy(m.position).sub(dir));
    m.rotateZ((Math.random() - 0.5) * 1.6);
    this.scene.add(m);
    best.attach(m); // keeps the world transform, follows the bone from now on
    this.wounds.push({ m, life, t: 0 });
    if (this.wounds.length > this.maxWounds) this._dropWound(this.wounds.shift());
  }
  _dropWound(w) { w.m.removeFromParent(); w.m.geometry.dispose(); w.m.material.dispose(); }

  update(dt) {
    const m = this._m, q = this._q, s = this._s, e = this._e;
    let i = 0;
    for (const c of this.chips) {
      c.life += dt;
      if (!c.rest) {
        c.v.y -= 9.8 * dt;
        c.p.addScaledVector(c.v, dt);
        c.r.addScaledVector(c.w, dt);
        if (c.p.y < 0.02) {
          c.p.y = 0.02;
          if (Math.abs(c.v.y) > 1.2) { c.v.y *= -0.3; c.v.x *= 0.5; c.v.z *= 0.5; c.w.multiplyScalar(0.5); }
          else { c.rest = true; c.r.x = Math.PI / 2 * Math.round(c.r.x / (Math.PI / 2)); c.r.z = 0; }
        }
      }
      const fade = c.life > 6 ? Math.max(0, 1 - (c.life - 6) / 1.5) : 1;
      q.setFromEuler(e.set(c.r.x, c.r.y, c.r.z));
      m.compose(c.p, q, s.setScalar(c.s * fade));
      this.chipMesh.setMatrixAt(i++, m);
    }
    this.chips = this.chips.filter((c) => c.life < 7.5);
    this.chipMesh.count = i; this.chipMesh.instanceMatrix.needsUpdate = true;

    i = 0;
    for (const l of this.leaves) {
      l.life += dt;
      if (!l.rest) {
        // strong air drag: a burst first, then a slow swaying fall
        l.v.multiplyScalar(Math.exp(-dt * 3.2));
        l.v.y -= 2.2 * dt;
        l.v.y = Math.max(l.v.y, -0.7);
        l.ph += dt * l.spin;
        l.p.addScaledVector(l.v, dt);
        l.p.x += Math.sin(l.ph) * 0.5 * dt; l.p.z += Math.cos(l.ph * 0.7) * 0.5 * dt;
        if (l.p.y < 0.015) { l.p.y = 0.015; l.rest = true; }
      }
      const fade = l.life > 8 ? Math.max(0, 1 - (l.life - 8) / 2) : 1;
      if (l.rest) q.setFromEuler(e.set(-Math.PI / 2, l.ph, 0));
      else q.setFromEuler(e.set(Math.sin(l.ph) * 1.1, l.ph * 0.6, Math.cos(l.ph * 1.3) * 0.8));
      m.compose(l.p, q, s.setScalar(l.s * fade));
      this.leafMesh.setMatrixAt(i, m);
      this.leafMesh.setColorAt(i++, l.c);
    }
    this.leaves = this.leaves.filter((l) => l.life < 10);
    this.leafMesh.count = i; this.leafMesh.instanceMatrix.needsUpdate = true;
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;

    for (const w of this.wounds) {
      w.t += dt;
      const flare = w.t < 0.15 ? 1 + 2 * (1 - w.t / 0.15) : 1;
      w.m.material.opacity = Math.max(0, 1 - w.t / w.life) * 0.9 * flare * (0.85 + 0.15 * Math.sin(w.t * 5));
    }
    for (const w of this.wounds.filter((w) => w.t >= w.life)) this._dropWound(w);
    this.wounds = this.wounds.filter((w) => w.t < w.life);
  }

  clear() {
    this.chips.length = 0; this.leaves.length = 0;
    for (const w of this.wounds) this._dropWound(w);
    this.wounds.length = 0;
    this.chipMesh.count = 0; this.leafMesh.count = 0;
  }
}
