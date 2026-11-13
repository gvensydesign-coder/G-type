// Procedurally built sword and round shield, driven each frame from the hero's hand and forearm bones.
import * as THREE from 'three';

function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeSword() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd4d8de, metalness: 0.9, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3430, metalness: 0.6, roughness: 0.45 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.85 });
  // origin = middle of the grip, blade along +Y, flat of the blade faces Z
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.2, 10), leather);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), dark);
  pommel.position.y = -0.11;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.028, 0.04), dark);
  guard.position.y = 0.11;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.025, 0); bladeShape.lineTo(0.025, 0); bladeShape.lineTo(0.02, 0.84); bladeShape.lineTo(0, 0.92); bladeShape.lineTo(-0.02, 0.84); bladeShape.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 1 }), steel);
  blade.position.set(0, 0.12, -0.004);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.6, 0.018), dark);
  fuller.position.y = 0.45;
  for (const m of [grip, pommel, guard, blade, fuller]) { m.castShadow = true; g.add(m); }
  g.userData.base = 0.12;
  g.userData.tip = 1.04;
  return g;
}

export function makeShield() {
  const g = new THREE.Group();
  const face = tex(256, 256, (x, w, h) => {
    const planks = ['#6b4526', '#5e3c20', '#734b2a', '#61401f', '#6e4724'];
    for (let i = 0; i < 6; i++) { x.fillStyle = planks[i % planks.length]; x.fillRect(i * (w / 6), 0, w / 6, h); }
    x.strokeStyle = 'rgba(20,10,5,.6)'; x.lineWidth = 2;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(i * w / 6, 0); x.lineTo(i * w / 6, h); x.stroke(); }
    // painted wolf-grey band and red quarters
    x.fillStyle = 'rgba(150,28,22,.85)';
    x.beginPath(); x.moveTo(w / 2, h / 2); x.arc(w / 2, h / 2, w / 2, -Math.PI / 2, 0); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(w / 2, h / 2); x.arc(w / 2, h / 2, w / 2, Math.PI / 2, Math.PI); x.closePath(); x.fill();
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
  });
  const wood = new THREE.MeshStandardMaterial({ map: face, roughness: 0.8 });
  const side = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x55575c, metalness: 0.8, roughness: 0.4 });
  // disc normal along +Y (front face is +Y)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 40), [side, wood, wood]);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.018, 8, 48), iron);
  rim.rotation.x = Math.PI / 2;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), iron);
  boss.position.y = 0.015;
  for (const m of [disc, rim, boss]) { m.castShadow = true; g.add(m); }
  return g;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Place the sword in the right hand. The blade direction comes from the hand bone (calibrated in the
// rest pose, see Character.grip), so wrist turns in the clips swing the blade; a little of the forearm
// line is mixed in to keep chops readable.
const _q = new THREE.Quaternion();
export function poseSword(sword, ch, out) {
  ch.worldBone('RightForeArm', _a);
  ch.worldBone('RightHand', _b);
  ch.bones.RightHand.getWorldQuaternion(_q);
  const arm = _x.subVectors(_b, _a).normalize();
  _y.copy(ch.grip.blade).applyQuaternion(_q).addScaledVector(arm, 0.35).normalize();
  _z.copy(ch.grip.edge).applyQuaternion(_q);
  _x.crossVectors(_y, _z);
  if (_x.lengthSq() < 1e-4) _x.set(1, 0, 0);
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_z, _y, _x.negate());
  sword.quaternion.setFromRotationMatrix(_m);
  sword.position.copy(_b).addScaledVector(arm, 0.07).addScaledVector(_y, -0.02);
  if (out) {
    out.base.copy(sword.position).addScaledVector(_y, sword.userData.base);
    out.tip.copy(sword.position).addScaledVector(_y, sword.userData.tip);
  }
}

// Strap the shield to the left forearm, facing away from the body.
export function poseShield(shield, ch) {
  ch.worldBone('LeftForeArm', _a);
  ch.worldBone('LeftHand', _b);
  const arm = _y.subVectors(_b, _a).normalize();
  const fwd = _z.set(Math.sin(ch.yaw), 0, Math.cos(ch.yaw));
  const left = _x.set(Math.cos(ch.yaw), 0, -Math.sin(ch.yaw));
  // outward normal: forward + a bit to the left, made perpendicular to the forearm
  const n = fwd.multiplyScalar(1).addScaledVector(left, 0.45);
  n.addScaledVector(arm, -n.dot(arm)).normalize();
  shield.quaternion.setFromUnitVectors(_b.set(0, 1, 0), n);
  shield.position.lerpVectors(_a, ch.worldBone('LeftHand', new THREE.Vector3()), 0.55).addScaledVector(n, 0.1);
}

// ---------------------------------------------------------------- hand rig
// Weapons sit in the actual fist: the fingers are curled around the grip every frame (the clips open
// and close the hands freely), the grip centre and blade axis are taken from the finger bones, and the
// shield is fixed to the forearm bone, so nothing slides or floats whatever the body does.
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
// curl per joint (degrees) for a closed fist around a ~4 cm grip; the pinky closes a little more
const CURL = { Index: [52, 78, 50], Middle: [58, 82, 52], Ring: [62, 84, 52], Pinky: [68, 86, 52] };
const THUMB_CURL = [18, 26, 30];
const _wq = new THREE.Quaternion(), _wq2 = new THREE.Quaternion(), _inv = new THREE.Matrix4(), _p = new THREE.Vector3(), _p2 = new THREE.Vector3();

export class HandRig {
  // must be built while the model is still in its rest pose (before the first mixer update)
  constructor(ch, side) {
    this.ch = ch; this.side = side;
    const get = (n) => ch.model.getObjectByName('mixamorig' + side + n);
    this.hand = get('Hand');
    this.chains = FINGERS.map((f) => ({ name: f, bones: [1, 2, 3].map((i) => get('Hand' + f + i)) }));
    this.thumb = [1, 2, 3].map((i) => get('HandThumb' + i));
    ch.model.updateMatrixWorld(true);
    _inv.copy(this.hand.matrixWorld).invert();
    const local = (b) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(_inv);
    const I = local(this.chains[0].bones[0]), M = local(this.chains[1].bones[0]), P = local(this.chains[3].bones[0]);
    const tip = local(get('HandMiddle4'));
    // hand-local frame: along the fingers, across the knuckles (pinky -> index), palm normal
    this.fingerL = M.clone().normalize();
    this.acrossL = I.clone().sub(P);
    this.acrossL.addScaledVector(this.fingerL, -this.acrossL.dot(this.fingerL)).normalize();
    this.palmL = new THREE.Vector3().crossVectors(this.fingerL, this.acrossL).normalize();
    // the relaxed rest pose curls slightly towards the palm: use it to pick the palm side
    if (tip.sub(M).dot(this.palmL) < 0) this.palmL.negate();
    // flex axis of every finger joint in its own frame (+ sign that closes towards the palm)
    this.hand.getWorldQuaternion(_wq);
    const acrossW = this.acrossL.clone().applyQuaternion(_wq);
    const fingerW = this.fingerL.clone().applyQuaternion(_wq);
    const palmW = this.palmL.clone().applyQuaternion(_wq);
    const setup = (b, axisW) => {
      b.getWorldQuaternion(_wq2);
      return { b, rest: b.quaternion.clone(), axis: axisW.clone().applyQuaternion(_wq2.clone().invert()) };
    };
    for (const c of this.chains) c.j = c.bones.map((b) => setup(b, acrossW));
    this.thumbJ = this.thumb.map((b) => setup(b, fingerW));
    this.fSign = this._sign(this.chains[1].j[0], get('HandMiddle4'), palmW);
    this.tSign = this._sign(this.thumbJ[0], get('HandThumb4'), palmW);
    this.amount = 1;
  }
  _sign(j, tipBone, palmW) {
    const a = tipBone.getWorldPosition(new THREE.Vector3());
    j.b.quaternion.copy(j.rest).multiply(_wq.setFromAxisAngle(j.axis, 0.4));
    j.b.updateMatrixWorld(true);
    const d = tipBone.getWorldPosition(new THREE.Vector3()).sub(a).dot(palmW);
    j.b.quaternion.copy(j.rest); j.b.updateMatrixWorld(true);
    return d >= 0 ? 1 : -1;
  }
  // close the fist (amount 0..1); call after the character's pose has been applied
  grip(amount = this.amount) {
    const D2R = Math.PI / 180;
    for (const c of this.chains) c.j.forEach((j, i) => j.b.quaternion.copy(j.rest).multiply(_wq.setFromAxisAngle(j.axis, this.fSign * CURL[c.name][i] * D2R * amount)));
    this.thumbJ.forEach((j, i) => j.b.quaternion.copy(j.rest).multiply(_wq.setFromAxisAngle(j.axis, this.tSign * THUMB_CURL[i] * D2R * amount)));
    this.hand.updateMatrixWorld(true);
  }
  // world frame of the fist: centre of the hole the fingers close around, axis through it, palm normal
  fist(out) {
    this.hand.getWorldQuaternion(_wq);
    out.finger.copy(this.fingerL).applyQuaternion(_wq);
    out.across.copy(this.acrossL).applyQuaternion(_wq);
    out.palm.copy(this.palmL).applyQuaternion(_wq);
    // centre: between the knuckles and the curled middle phalanges of index..ring
    out.center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) {
      const c = this.chains[k];
      out.center.add(c.bones[0].getWorldPosition(_p)).add(c.bones[2].getWorldPosition(_p2));
    }
    out.center.multiplyScalar(1 / 6);
    return out;
  }
}
const newFist = () => ({ center: new THREE.Vector3(), finger: new THREE.Vector3(), across: new THREE.Vector3(), palm: new THREE.Vector3() });

export class WeaponRig {
  constructor(ch, sword, shield) {
    this.ch = ch; this.sword = sword; this.shield = shield;
    this.right = new HandRig(ch, 'Right');
    this.left = new HandRig(ch, 'Left');
    this.fR = newFist(); this.fL = newFist();
    this.shieldLocal = null;
    this.tilt = 0.22;      // blade leans this much towards the fingertips (a natural sword grip)
    this.guardGap = 0.035; // grip centre sits this far towards the pommel from the fist centre
    this.stow = 0;         // 0..1, set by the game for rolls and tumbles
    this.floor = 0.03;     // ground height the blade tip must stay above
    this.clearance = 0.025; // shield offset off the forearm, along its face
  }
  // shield strapped to the forearm: measure its placement once in a reference pose (the block)
  calibrateShield(pose) {
    const ch = this.ch;
    ch.update(0, pose);
    poseShield(this.shield, ch);
    const fa = ch.bones.LeftForeArm;
    fa.updateMatrixWorld(true);
    const inv = fa.matrixWorld.clone().invert();
    this.shield.updateMatrix();
    this.shieldLocal = new THREE.Matrix4().multiplyMatrices(inv, this.shield.matrix);
    ch.update(0, null);
  }
  update(out) {
    this.right.grip(); this.left.grip();
    // sword: rigid in the fist
    const f = this.right.fist(this.fR);
    // the blade leaves the fist on the thumb side (measured: the knuckle axis of this rig points pinky-wards)
    const y = _y.copy(f.across).negate().addScaledVector(f.finger, this.tilt).normalize();
    // stow (rolls, being thrown): the wrist cocks so the blade lies back along the forearm
    if (this.stow > 0.001) {
      const back = _a.subVectors(this.ch.worldBone('RightForeArm', _p), this.ch.worldBone('RightHand', _p2)).normalize();
      y.lerp(back, this.stow).normalize();
    }
    // the blade never goes into the ground: it pivots in the fist and rests on the surface instead
    const reach = this.sword.userData.tip - this.guardGap;
    if (f.center.y + y.y * reach < this.floor) {
      const h = Math.hypot(y.x, y.z) || 1e-3;
      const vy = Math.max(-1, Math.min(0.95, (this.floor - f.center.y) / reach));
      const hs = Math.sqrt(1 - vy * vy);
      y.set((y.x / h) * hs, vy, (y.z / h) * hs);
    }
    const z = _z.copy(f.palm).addScaledVector(y, -f.palm.dot(y)).normalize();
    const x = _x.crossVectors(y, z).normalize();
    _m.makeBasis(x, y, z);
    this.sword.quaternion.setFromRotationMatrix(_m);
    this.sword.position.copy(f.center).addScaledVector(y, -this.guardGap);
    if (out) {
      out.base.copy(this.sword.position).addScaledVector(y, this.sword.userData.base);
      out.tip.copy(this.sword.position).addScaledVector(y, this.sword.userData.tip);
    }
    // shield: rigid on the forearm
    if (this.shieldLocal) {
      const fa = this.ch.bones.LeftForeArm;
      _m.multiplyMatrices(fa.matrixWorld, this.shieldLocal);
      _m.decompose(this.shield.position, this.shield.quaternion, _a);
      // a little extra clearance so the rim never brushes the hip on the arm swing
      this.shield.position.addScaledVector(_z.set(0, 1, 0).applyQuaternion(this.shield.quaternion), this.clearance);
    } else poseShield(this.shield, this.ch);
  }
}
