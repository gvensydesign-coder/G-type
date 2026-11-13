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
