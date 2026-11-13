// Эффекты: частицы (пыль, брызги, щепки, листья, искры), круги на воде, следы на мягкой земле.
import * as THREE from 'three';
import { Particles } from './core.js';
import { WATER_Y } from './terrain.js';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.soft = new Particles(900);                // обычное смешивание: пыль, брызги, щепки, листья
    this.glow = new Particles(300, { additive: true }); // искры, огонь
    scene.add(this.soft.points, this.glow.points);
    // круги на воде
    this.rings = [];
    const rg = new THREE.RingGeometry(0.78, 1, 40); rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x9fd4cc, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false; m.renderOrder = 3; scene.add(m);
      this.rings.push({ m, age: 9, life: 1, r0: 0.1, r1: 1 });
    }
    this.ri = 0;
    // следы
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
    const c = cv.getContext('2d'); c.clearRect(0, 0, 64, 128);
    c.fillStyle = '#fff';
    c.beginPath(); c.ellipse(32, 38, 15, 30, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(32, 98, 12, 18, 0, 0, 7); c.fill();
    const tex = new THREE.CanvasTexture(cv);
    const N = 70; this.dn = N; this.di = 0;
    const geo = new THREE.PlaneGeometry(0.2, 0.42); geo.rotateX(-Math.PI / 2);
    this.dAlpha = new Float32Array(N);
    geo.setAttribute('aA', new THREE.InstancedBufferAttribute(this.dAlpha, 1));
    this.decals = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { tMap: { value: tex } },
      vertexShader: 'attribute float aA; varying float vA; varying vec2 vUv; void main(){ vA = aA; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tMap; varying float vA; varying vec2 vUv; void main(){ float a = texture2D(tMap, vUv).a; gl_FragColor = vec4(0.012, 0.016, 0.012, a * vA * 0.75); }',
    }), N);
    this.decals.frustumCulled = false; this.decals.renderOrder = 1;
    this.dAge = new Float32Array(N).fill(99);
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) this.decals.setMatrixAt(i, z);
    scene.add(this.decals);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._p = new THREE.Vector3();
  }
  ring(x, z, r1 = 1.1, life = 1.1, r0 = 0.12) {
    const o = this.rings[this.ri]; this.ri = (this.ri + 1) % this.rings.length;
    o.age = 0; o.life = life; o.r0 = r0; o.r1 = r1; o.m.position.set(x, WATER_Y + 0.025, z); o.m.visible = true;
  }
  splash(x, z, power = 1) {
    this.ring(x, z, 0.9 + power * 0.5, 1.1);
    const n = Math.floor(7 + power * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, sp = (0.4 + Math.random() * 1.1) * power;
      this.soft.emit(x, WATER_Y + 0.05, z, Math.cos(a) * sp, 1.6 + Math.random() * 1.8 * power, Math.sin(a) * sp, 0xb6e0da, 0.06 + Math.random() * 0.05, 0.55 + Math.random() * 0.3, 9, 0.4, 0.9);
    }
  }
  print(x, y, z, yaw, side) {
    const i = this.di; this.di = (this.di + 1) % this.dn;
    this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this._p.set(x, y + 0.025, z);
    this._m.compose(this._p, this._q, this._s);
    this.decals.setMatrixAt(i, this._m); this.decals.instanceMatrix.needsUpdate = true;
    this.dAge[i] = 0; this.dAlpha[i] = 1; this.decals.geometry.attributes.aA.needsUpdate = true;
  }
  dust(x, y, z, vx, vz, n = 3, color = 0x8a7c5c) {
    for (let i = 0; i < n; i++) this.soft.emit(x + (Math.random() - 0.5) * 0.25, y + 0.05, z + (Math.random() - 0.5) * 0.25, vx * 0.2 + (Math.random() - 0.5) * 0.5, 0.35 + Math.random() * 0.5, vz * 0.2 + (Math.random() - 0.5) * 0.5, color, 0.22 + Math.random() * 0.2, 0.9 + Math.random() * 0.6, -0.15, 1.6, 0.42, 1.4);
  }
  update(dt, camera, h) {
    this.soft.update(dt, camera, h); this.glow.update(dt, camera, h);
    for (const o of this.rings) {
      if (!o.m.visible) continue;
      o.age += dt; const t = o.age / o.life;
      if (t >= 1) { o.m.visible = false; continue; }
      const r = o.r0 + (o.r1 - o.r0) * (1 - (1 - t) * (1 - t));
      o.m.scale.setScalar(r); o.m.material.opacity = (1 - t) * 0.55;
    }
    let dirty = false;
    for (let i = 0; i < this.dn; i++) {
      if (this.dAge[i] > 40) continue;
      this.dAge[i] += dt;
      const a = this.dAge[i] < 22 ? 1 : Math.max(0, 1 - (this.dAge[i] - 22) / 12);
      this.dAlpha[i] = a; dirty = true;
      if (this.dAge[i] > 34) this.dAge[i] = 99;
    }
    if (dirty) this.decals.geometry.attributes.aA.needsUpdate = true;
  }
}
