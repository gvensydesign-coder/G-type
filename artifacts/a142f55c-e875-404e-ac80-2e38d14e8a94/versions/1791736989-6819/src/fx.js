// Game-side visual helpers: sword trail, ground telegraphs, thrown objects.
// The heavy effects (aura, explosions, smoke) come from the shared fx-library modules.
import * as THREE from 'three';

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SHADOW_TEX = radialTexture([[0, 'rgba(0,0,0,0.85)'], [0.55, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);

// ---------------------------------------------------------------- sword trail
// A ribbon between the last N blade base/tip samples, fading with age.
export class SwordTrail {
  constructor(n = 22, color = 0xfff0d0) {
    this.n = n;
    this.base = []; this.tip = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 2 * 3);
    this.alpha = new Float32Array(n * 2);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: 0 } },
      vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; uniform float uK; varying float vA; void main(){ gl_FragColor = vec4(uColor, vA * uK); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.k = 0;
  }
  // on: whether the blade is in a swing; intensity fades in / out smoothly
  push(base, tip, on, dt) {
    this.k += ((on ? 1 : 0) - this.k) * (1 - Math.exp(-dt * (on ? 30 : 10)));
    this.base.unshift(base.clone()); this.tip.unshift(tip.clone());
    if (this.base.length > this.n) { this.base.pop(); this.tip.pop(); }
    const m = this.base.length;
    for (let i = 0; i < this.n; i++) {
      const j = Math.min(i, m - 1);
      const b = this.base[j], t = this.tip[j];
      // the trail hugs the outer part of the blade
      this.pos[i * 6 + 0] = b.x + (t.x - b.x) * 0.35; this.pos[i * 6 + 1] = b.y + (t.y - b.y) * 0.35; this.pos[i * 6 + 2] = b.z + (t.z - b.z) * 0.35;
      this.pos[i * 6 + 3] = t.x; this.pos[i * 6 + 4] = t.y; this.pos[i * 6 + 5] = t.z;
      const a = Math.pow(1 - i / this.n, 1.6);
      this.alpha[i * 2] = a * 0.0; this.alpha[i * 2 + 1] = a * 0.38;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.alpha.needsUpdate = true;
    this.mat.uniforms.uK.value = this.k;
    this.mesh.visible = this.k > 0.01;
  }
}

// ---------------------------------------------------------------- ground telegraph
// Danger circle on the ground: thin outer ring + a disc that fills inward as impact approaches.
const MARK_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
const MARK_FS = `
uniform vec3 uColor; uniform float uFill; uniform float uAlpha; uniform float uTime;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  if (r > 1.0) discard;
  float ring = smoothstep(0.86, 0.92, r) * (1.0 - smoothstep(0.97, 1.0, r));
  float fill = step(r, uFill) * 0.32 + smoothstep(uFill - 0.06, uFill, r) * step(r, uFill) * 0.5;
  float pulse = 0.75 + 0.25 * sin(uTime * 14.0);
  float a = (ring * pulse + fill) * uAlpha;
  gl_FragColor = vec4(uColor, a);
}`;
export class GroundMarker {
  constructor(scene, pos, radius, duration, color = 0xff5a1a) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uFill: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 } },
      vertexShader: MARK_VS, fragmentShader: MARK_FS, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(pos.x, 0.03, pos.z);
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
    this.scene = scene; this.t = 0; this.duration = duration; this.done = false;
  }
  update(dt) {
    this.t += dt;
    const u = Math.min(1, this.t / this.duration);
    this.mat.uniforms.uFill.value = u;
    this.mat.uniforms.uTime.value = this.t;
    this.mat.uniforms.uAlpha.value = Math.min(1, this.t / 0.15) * (u >= 1 ? Math.max(0, 1 - (this.t - this.duration) / 0.15) : 1);
    if (this.t > this.duration + 0.15) this.dispose();
  }
  dispose() { if (this.done) return; this.done = true; this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}

// Soft dark blob under an airborne object: grows and darkens as it comes down.
export function makeShadowBlob(size = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

// ---------------------------------------------------------------- thrown objects
// No lights here on purpose: adding lights at runtime makes three.js recompile every material.
// 'rot': a lump of rotten glowing wood with moss; 'wisp': a swamp-fire seed pod.
export function makeThrowable(kind) {
  const g = new THREE.Group();
  if (kind === 'wisp') {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: 0x1f3b1a, emissive: 0x7dff9a, emissiveIntensity: 1.6, roughness: 0.4, flatShading: true }));
    g.add(core);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), new THREE.MeshStandardMaterial({ color: 0x2c2414, roughness: 0.9 }));
      const d = new THREE.Vector3().randomDirection();
      s.position.copy(d).multiplyScalar(0.2);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      g.add(s);
    }
  } else {
    const geo = new THREE.DodecahedronGeometry(0.34, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + Math.random() * 0.4), p.getY(i) * (0.7 + Math.random() * 0.3), p.getZ(i) * (0.8 + Math.random() * 0.4));
    geo.computeVertexNormals();
    const wood = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a3a26, roughness: 0.95, flatShading: true, emissive: 0x3a5a10, emissiveIntensity: 0.5 }));
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0x5f7a22, roughness: 1, flatShading: true }));
    moss.position.set(0.12, 0.16, 0.05);
    const glow = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xd8ff6a }));
    glow.position.set(-0.14, 0.05, 0.16);
    g.add(wood, moss, glow);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
