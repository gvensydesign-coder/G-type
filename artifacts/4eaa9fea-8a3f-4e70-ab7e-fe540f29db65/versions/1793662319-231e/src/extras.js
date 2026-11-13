// Дополнения к физике (v5): следы и примятая тропа, плащ Богатыря, фонарь в руке, свет иллюминатора,
// птицы на плечах стража взлетают от топота Лешего, крошки мха сыплются с плеч, дождь с каплями с листвы.
import * as THREE from 'three';
import { G, paintMat } from './materials.js';
import { NOISE, GLOBAL_DECL, HAZE_FN } from './glsl.js';
import { groundY, rnd } from './world.js';

const rr = (a, b) => a + (b - a) * rnd();
const V = () => new THREE.Vector3();
const sanitize = (n) => THREE.PropertyBinding.sanitizeNodeName(n);

// ---------- карта тропы: R — вытоптано (держится долго), G — свежие следы (гаснут за ~30 с) ----------
class TrailMap {
  constructor() {
    this.W = 384; this.H = 240; // 32 × 20 м, клетка ~8 см
    this.data = new Uint8Array(this.W * this.H * 2);
    this.tex = new THREE.DataTexture(this.data, this.W, this.H, THREE.RGFormat, THREE.UnsignedByteType);
    this.tex.magFilter = this.tex.minFilter = THREE.LinearFilter; this.tex.needsUpdate = true;
    G.uTrail.value = this.tex;
    this.dirty = false; this.decayT = 0; this.upT = 0;
  }
  // эллипс: центр, полуоси вдоль и поперёк, угол направления, канал, сила
  stamp(x, z, a, b, ang, ch, val) {
    const sx = this.W / 32, sz = this.H / 20;
    const cx = (x + 16) * sx, cz = (z + 4) * sz, R = Math.max(a, b) * Math.max(sx, sz) + 1;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let j = Math.max(0, Math.floor(cz - R)); j <= Math.min(this.H - 1, Math.ceil(cz + R)); j++) {
      for (let i = Math.max(0, Math.floor(cx - R)); i <= Math.min(this.W - 1, Math.ceil(cx + R)); i++) {
        const dx = (i - cx) / sx, dz = (j - cz) / sz;
        const u = (dx * ca + dz * sa) / a, v = (-dx * sa + dz * ca) / b;
        const d = u * u + v * v; if (d > 1) continue;
        const k = j * this.W * 2 + i * 2 + ch;
        const add = val * (1 - d) * 255;
        this.data[k] = Math.min(255, Math.max(this.data[k], ch === 1 ? add : this.data[k] + add));
      }
    }
    this.dirty = true;
  }
  update(dt) {
    this.decayT += dt; this.upT += dt;
    if (this.decayT > 0.5) {
      const d = this.data, fG = Math.pow(0.985, this.decayT / 0.5), fR = Math.pow(0.9993, this.decayT / 0.5);
      for (let k = 0; k < d.length; k += 2) { if (d[k]) d[k] = Math.floor(d[k] * fR); if (d[k + 1]) d[k + 1] = Math.floor(d[k + 1] * fG); }
      this.decayT = 0; this.dirty = true;
    }
    if (this.dirty && this.upT > 0.15) { this.tex.needsUpdate = true; this.dirty = false; this.upT = 0; }
  }
}

// ---------- плащ: ткань Верле, верх пришит к плечам, тело и ноги отталкивают ----------
class Cloak {
  constructor(scene, hero) {
    this.h = hero; const root = hero.root;
    const B = (n) => root.getObjectByName(sanitize('mixamorig:' + n));
    this.b = { L: B('LeftArm'), R: B('RightArm'), S1: B('Spine1'), S2: B('Spine2'), Hp: B('Hips'), LU: B('LeftUpLeg'), RU: B('RightUpLeg'), LL: B('LeftLeg'), RL: B('RightLeg'), Nk: B('Neck') };
    this.ok = Object.values(this.b).every(Boolean);
    if (!this.ok) { console.warn('Плащ: не нашлись кости'); return; }
    this.Wn = 7; this.Hn = 10;
    const n = this.Wn * this.Hn;
    this.p = Array.from({ length: n }, V); this.o = Array.from({ length: n }, V);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = [], idx = [];
    for (let j = 0; j < this.Hn; j++) for (let i = 0; i < this.Wn; i++) uv.push(i / (this.Wn - 1), 1 - j / (this.Hn - 1));
    for (let j = 0; j < this.Hn - 1; j++) for (let i = 0; i < this.Wn - 1; i++) { const a = j * this.Wn + i; idx.push(a, a + this.Wn, a + 1, a + 1, a + this.Wn, a + this.Wn + 1); }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    this.mat = paintMat({ base: '#7c2b27', side: THREE.DoubleSide, litTint: [1.1, 0.98, 0.9], strokeDir: [0, 1.5, 0], strokeAmt: 0.25, brush: 0.8, break: 0.2, rim: 0.8,
      patchA: { col: '#5e1f1f', scale: 1.8, th: 0.6, edge: 0.6, amt: 0.8 }, patchB: { col: '#a8453a', scale: 2.2, th: 0.66, edge: 0.4, amt: 0.6 } });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.castShadow = true; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.init = false;
  }
  anchors() {
    const L = this.b.L.getWorldPosition(V()), R = this.b.R.getWorldPosition(V()), Nk = this.b.Nk.getWorldPosition(V());
    // спина по самому скелету: перед = (левое плечо - правое) x вверх, спина противоположна (не зависит от того, куда смотрит модель)
    const fwd = V().subVectors(L, R).cross(new THREE.Vector3(0, 1, 0)); fwd.y = 0;
    const back = fwd.lengthSq() > 1e-8 ? fwd.normalize().negate() : new THREE.Vector3(0, 0, -1).applyQuaternion(this.h.root.quaternion);
    const mid = L.clone().add(R).multiplyScalar(0.5); mid.y = mid.y * 0.6 + Nk.y * 0.4 - 0.02;
    const out = [];
    for (let i = 0; i < this.Wn; i++) {
      const t = i / (this.Wn - 1) - 0.5;
      const q = mid.clone().addScaledVector(R.clone().sub(L), t * 1.05).addScaledVector(back, 0.1 + 0.03 * (1 - Math.abs(t) * 2));
      out.push(q);
    }
    this.back = back;
    return out;
  }
  update(dt) {
    if (!this.ok) return;
    this.mesh.visible = this.h.root.visible;
    const A1 = this.anchors();
    // мелкие шаги по 1/60 с, верх плаща идёт от прошлого положения плеч к новому — ткань не «выстреливает» при рывке
    const steps = Math.min(10, Math.max(1, Math.ceil(dt * 60)));
    const A0 = this.prevA || A1;
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      this.sim(A1.map((a, i) => A0[i].clone().lerp(a, f)), dt / steps);
    }
    this.prevA = A1.map((a) => a.clone());
    const pos = this.mesh.geometry.attributes.position;
    for (let k = 0; k < this.p.length; k++) pos.setXYZ(k, this.p[k].x, this.p[k].y, this.p[k].z);
    pos.needsUpdate = true; this.mesh.geometry.computeVertexNormals(); this.mesh.geometry.computeBoundingSphere();
  }
  sim(A, dt) {
    const top = A[0].distanceTo(A[this.Wn - 1]) / (this.Wn - 1);
    const vs = 1.0 / (this.Hn - 1); // длина ~1 м: от плеч до икр
    if (!this.init) {
      for (let j = 0; j < this.Hn; j++) for (let i = 0; i < this.Wn; i++) { const k = j * this.Wn + i; this.p[k].copy(A[i]).addScaledVector(this.back, 0.05 * j).y -= j * vs; this.o[k].copy(this.p[k]); }
      this.init = true;
    }
    const h = dt, wind = G.uWind.value, t = performance.now() / 1000;
    for (let k = this.Wn; k < this.p.length; k++) {
      const p = this.p[k], o = this.o[k];
      const vx = (p.x - o.x) * 0.96, vy = (p.y - o.y) * 0.96, vz = (p.z - o.z) * 0.96;
      o.copy(p);
      p.x += vx + (wind * 2.0 + Math.sin(t * 2.1 + k) * 0.4) * h * h * 3;
      p.y += vy - 9.8 * h * h;
      p.z += vz + Math.cos(t * 1.7 + k * 0.7) * 0.3 * h * h * 3;
    }
    const spheres = [[this.b.S1, 0.2], [this.b.S2, 0.21], [this.b.Hp, 0.2], [this.b.LU, 0.12], [this.b.RU, 0.12], [this.b.LL, 0.1], [this.b.RL, 0.1]]
      .map(([b, r]) => [b.getWorldPosition(V()), r + 0.03]);
    const link = (a, b, rest) => {
      const pa = this.p[a], pb = this.p[b]; const d = V().subVectors(pb, pa); const len = d.length() || 1e-6; const k = (len - rest) / len;
      const fa = a < this.Wn ? 0 : 0.5, fb = b < this.Wn ? 0 : 0.5; const s = fa + fb || 1;
      pa.addScaledVector(d, k * fa / s); pb.addScaledVector(d, -k * fb / s);
    };
    for (let it = 0; it < 8; it++) {
      for (let i = 0; i < this.Wn; i++) this.p[i].copy(A[i]);
      for (let j = 0; j < this.Hn; j++) {
        const hs = top * (1 + 0.45 * j / (this.Hn - 1)); // плащ расширяется книзу
        for (let i = 0; i < this.Wn; i++) {
          const k = j * this.Wn + i;
          if (i < this.Wn - 1) link(k, k + 1, hs);
          if (j < this.Hn - 1) link(k, k + this.Wn, vs);
        }
      }
      for (let k = this.Wn; k < this.p.length; k++) {
        const p = this.p[k];
        for (const [c, r] of spheres) { const d = V().subVectors(p, c); const l = d.length(); if (l < r) p.addScaledVector(d, (r - l) / (l || 1e-4)); }
        const gy = groundY(p.x, p.z) + 0.03; if (p.y < gy) p.y = gy;
      }
    }
  }
}

// ---------- фонарь в левой руке: висит на дужке, качается; ночью светит ----------
class Lantern {
  constructor(scene, hero) {
    this.h = hero;
    this.hand = hero.root.getObjectByName(sanitize('mixamorig:LeftHand'));
    const g = new THREE.Group();
    const iron = paintMat({ base: '#3a3438', gloss: 0.8, strokeAmt: 0.1, break: 0.1, rim: 0.6, brush: 0.3 });
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 8), iron); cap.position.y = 0.085;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.025, 8), iron); base.position.y = -0.07;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 14), iron); ring.position.y = 0.135;
    g.add(cap, base, ring);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.15, 0.008), iron); const a = i * Math.PI / 2 + Math.PI / 4; b.position.set(Math.cos(a) * 0.058, 0.007, Math.sin(a) * 0.058); g.add(b); }
    this.glassMat = new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normal; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform float uK; varying vec3 vN; void main(){ vec3 off = vec3(0.32, 0.26, 0.16); vec3 on = vec3(3.2, 2.0, 0.85);
        gl_FragColor = vec4(mix(off, on, uK) * (0.85 + 0.15 * vN.y), 1.0);
        #include <colorspace_fragment>
      }`,
    });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.13, 10), this.glassMat); glass.position.y = 0.005;
    g.add(glass); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g); this.g = g;
    this.bob = V(); this.old = V(); this.init = false; this.len = 0.17;
  }
  update(dt, k) {
    if (!this.hand) return;
    this.g.visible = this.h.root.visible;
    const a = this.hand.getWorldPosition(V()).add(V().set(0, -0.03, 0));
    if (!this.init) { this.bob.copy(a).y -= this.len; this.old.copy(this.bob); this.init = true; }
    const h = Math.min(dt, 1 / 30);
    const v = V().subVectors(this.bob, this.old).multiplyScalar(0.94); this.old.copy(this.bob);
    this.bob.add(v).y -= 9.8 * h * h;
    const d = V().subVectors(this.bob, a); this.bob.copy(a).addScaledVector(d.normalize(), this.len);
    this.g.position.copy(this.bob);
    this.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V().subVectors(a, this.bob).normalize());
    this.glassMat.uniforms.uK.value = k * (0.92 + 0.08 * Math.sin(performance.now() * 0.013) * Math.sin(performance.now() * 0.0071)); // пламя чуть дрожит
    G.uLamp1.value.set(this.bob.x, this.bob.y, this.bob.z, 4.5);
    G.uLampC1.value.set(1.0, 0.66, 0.32).multiplyScalar(k * 0.5 * (this.h.root.visible ? 1 : 0));
  }
}

// ---------- птицы на плечах стража ----------
class Birds {
  constructor(scene, guardian) {
    this.g = guardian; this.list = [];
    const body = paintMat({ base: '#4a3b36', strokeAmt: 0.1, break: 0.15, rim: 0.8, brush: 0.3 });
    const wingMat = paintMat({ base: '#3b302d', strokeAmt: 0.1, break: 0.15, rim: 0.8, side: THREE.DoubleSide, brush: 0.2 });
    const ray = new THREE.Raycaster(); const targets = []; guardian.traverse((o) => { if (o.isMesh && !o.userData.isOutline) targets.push(o); });
    guardian.updateMatrixWorld(true);
    const spots = [[-3.0, 0.5], [-3.6, -0.4], [-2.7, -0.6], [3.1, 0.6], [3.5, -0.3], [2.6, 0.2], [0.3, -0.5]];
    for (const [x, z] of spots) {
      ray.set(new THREE.Vector3(x, 14, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(targets, false)[0]; if (!hit) continue;
      const grp = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), body); b.scale.set(0.055, 0.05, 0.1);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), body); head.position.set(0, 0.04, -0.085);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.035, 5), paintMat({ base: '#c08a3a', brush: 0 })); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.04, -0.13);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.08), body); tail.position.set(0, 0.01, 0.12); tail.rotation.x = -0.3;
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08).translate(-0.08, 0, 0), wingMat); wl.rotation.x = -Math.PI / 2;
      const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08).translate(0.08, 0, 0), wingMat); wr.rotation.x = -Math.PI / 2;
      const pl = new THREE.Group(); pl.add(wl); const pr = new THREE.Group(); pr.add(wr); pl.position.y = pr.position.y = 0.02;
      grp.add(b, head, beak, tail, pl, pr); grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      const perch = hit.point.clone(); perch.y += 0.05;
      grp.position.copy(perch); grp.rotation.y = rnd() * Math.PI * 2;
      scene.add(grp);
      this.list.push({ grp, pl, pr, perch, state: 0, t: 0, v: V(), ph: rnd() * 10, yaw: grp.rotation.y });
    }
  }
  scare() {
    for (const B of this.list) if (B.state === 0) { B.state = 1; B.t = -rr(0, 0.35); B.v.set(rr(-2, 2), rr(3, 5), rr(-2, 2)); }
  }
  update(dt, time) {
    for (const B of this.list) {
      B.t += dt;
      if (B.state === 0) { // сидит: изредка поворачивает голову, крылья сложены
        B.pl.rotation.z = 1.35; B.pr.rotation.z = -1.35;
        if (Math.sin(time * 0.7 + B.ph * 9) > 0.995) B.grp.rotation.y = B.yaw + rr(-0.6, 0.6);
        continue;
      }
      if (B.t < 0) continue;
      const p = B.grp.position;
      let desired;
      if (B.state === 1) { // летит прочь и кружит над поляной
        const c = new THREE.Vector3(0, 15 + Math.sin(B.ph) * 3, -4);
        const r = V().subVectors(p, c); r.y = 0; const dist = r.length() || 1;
        const tan = new THREE.Vector3(-r.z, 0, r.x).normalize();
        desired = tan.multiplyScalar(6).addScaledVector(r.normalize(), (14 - dist) * 0.6); desired.y = (c.y - p.y) * 0.8;
        if (B.t > 9 + B.ph % 4) { B.state = 2; }
      } else { // возвращается на своё место
        const d = V().subVectors(B.perch, p); const dist = d.length();
        desired = d.normalize().multiplyScalar(Math.min(6, dist * 1.6 + 0.3));
        if (dist < 0.06) { B.state = 0; p.copy(B.perch); B.grp.rotation.set(0, B.yaw, 0); continue; }
      }
      B.v.lerp(desired, Math.min(1, dt * 2.2));
      p.addScaledVector(B.v, dt);
      if (B.v.lengthSq() > 0.01) { const look = V().copy(p).sub(B.v); B.grp.lookAt(look); } // нос по ходу (-z вперёд)
      const flap = Math.sin(time * (B.state === 2 && B.v.length() < 2 ? 30 : 22) + B.ph) * 0.9;
      const glide = B.state === 1 && Math.sin(time * 0.8 + B.ph) > 0.6 ? 0.15 : 1;
      B.pl.rotation.z = flap * glide; B.pr.rotation.z = -flap * glide;
    }
  }
}

// ---------- крошки мха: сыплются с плеч стража (от топота и сами по себе) ----------
class Crumbs {
  constructor(scene) {
    this.N = 40;
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), paintMat({ base: '#6f8f55', brush: 0, strokeAmt: 0.1, rim: 0.4 }), this.N);
    this.mesh.castShadow = true; scene.add(this.mesh);
    this.items = Array.from({ length: this.N }, () => ({ p: V().set(0, -50, 0), v: V(), s: 0, life: 99, rot: rnd() * 6 }));
    this.i = 0; this.timer = 0;
  }
  spawn(n) {
    for (let k = 0; k < n; k++) {
      const it = this.items[this.i++ % this.N];
      const s = rnd() < 0.5 ? -1 : 1;
      it.p.set(s * rr(2.4, 4.2), 8.15, rr(-1.0, 1.1)); it.p.x += s * 0.0;
      it.v.set(s * rr(0.1, 0.6), rr(0, 0.6), rr(-0.3, 0.3)); it.s = rr(0.025, 0.06); it.life = 0;
      if (Math.abs(it.p.x) < 4.15) it.p.z = (rnd() < 0.5 ? -1.12 : 1.12); // с края плеча, а не сквозь камень
    }
  }
  update(dt) {
    this.timer -= dt; if (this.timer < 0) { this.timer = rr(2.5, 5); this.spawn(1); }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let k = 0; k < this.N; k++) {
      const it = this.items[k]; it.life += dt;
      if (it.life < 8) {
        it.v.y -= 9.8 * dt; it.p.addScaledVector(it.v, dt); it.rot += dt * 4;
        const gy = groundY(it.p.x, it.p.z) + it.s * 0.5;
        if (it.p.y < gy) { it.p.y = gy; it.v.multiplyScalar(0.2); it.v.y = Math.abs(it.v.y) > 0.5 ? -it.v.y * 0.3 : 0; }
      }
      const sc = it.life < 6 ? it.s : it.s * Math.max(0, 1 - (it.life - 6) / 2);
      q.setFromAxisAngle(new THREE.Vector3(1, 0.4, 0.2).normalize(), it.rot);
      this.mesh.setMatrixAt(k, m.compose(it.p, q, new THREE.Vector3(sc, sc, sc)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- дождь: косые штрихи вокруг камеры + редкие крупные капли с листвы и с плеч стража ----------
function makeRain(scene) {
  const N = 2200;
  const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
  const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
  const seed = new Float32Array(N * 4); for (let i = 0; i < seed.length; i++) seed[i] = rnd();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4)); g.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: Object.assign({}, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute vec4 aSeed; varying float vA; varying vec2 vUv; varying vec3 vWPos;
      void main(){
        vUv = uv;
        vec3 B = vec3(34.0, 20.0, 34.0);
        vec3 fall = normalize(vec3(-uWind * 0.35 - 0.08, -1.0, 0.05));
        vec3 p = aSeed.xyz * B + fall * uTime * (12.0 + aSeed.w * 5.0) * (-1.0) * -1.0;
        p = mod(p - cameraPosition, B) + cameraPosition - B * 0.5;
        vec3 toCam = normalize(cameraPosition - p);
        vec3 side = normalize(cross(fall, toCam));
        vec3 w = p + side * (position.x * 0.018) - fall * position.y * (0.45 + aSeed.w * 0.35);
        float d = length(p - cameraPosition);
        vA = smoothstep(1.2, 3.0, d) * smoothstep(17.0, 9.0, d) * uRain;
        vWPos = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      varying float vA; varying vec2 vUv; varying vec3 vWPos;
      void main(){
        float a = (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.3, vUv.y) * vA * 0.42;
        vec3 c = mix(hazeColor(vec3(0.0, 1.0, 0.0)) * 1.15, vec3(1.0), 0.3) + lampLight(vWPos, vec3(0.0, 1.0, 0.0)) * 0.6;
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  });
  const rain = new THREE.Mesh(g, mat); rain.frustumCulled = false; rain.renderOrder = 9;
  // крупные капли: из-под плеч стража, с ветки, с кромки крон — падают медленно и блестят
  const pts = [];
  const src = [];
  for (let i = 0; i < 26; i++) src.push([rnd() < 0.5 ? -rr(2.4, 4.1) : rr(2.4, 4.1), 7.35, rr(-1.0, 1.1)]);
  for (let i = 0; i < 20; i++) src.push([rr(-9.6, -6.6), rr(5.6, 6.6), rr(5.2, 8.0)]);
  for (let i = 0; i < 60; i++) { const a = rnd() * Math.PI * 2, d = rr(11, 15); src.push([Math.cos(a) * d, rr(11, 15), Math.sin(a) * d - 2]); }
  const sd = new Float32Array(src.length);
  for (const s of src) pts.push(...s);
  for (let i = 0; i < src.length; i++) sd[i] = rnd();
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); dg.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
  const dm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: Object.assign({}, G),
    vertexShader: GLOBAL_DECL + `attribute float seed; varying float vA;
      void main(){
        vec3 p = position; float h = p.y; float t = fract(uTime * (0.35 + seed * 0.2) + seed * 7.0);
        p.y = h - t * t * h;   // падает с ускорением до земли
        vA = uRain * smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.92, 1.0, t));
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(60.0 / -mv.z, 1.5, 5.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      gl_FragColor = vec4(vec3(0.92, 0.97, 1.0), vA * smoothstep(0.5, 0.2, d)); }`,
  });
  const drips = new THREE.Points(dg, dm); drips.frustumCulled = false; drips.renderOrder = 9;
  scene.add(rain, drips);
  return { rain, drips };
}

export class Extras {
  constructor(scene, physics, guardian) {
    this.trail = new TrailMap();
    this.birds = new Birds(scene, guardian);
    this.crumbs = new Crumbs(scene);
    this.rain = makeRain(scene);
    this.cloak = null; this.lantern = null; this.lampK = 0;
    this.time = 0;
    physics.onReady.push((walkers) => {
      const b = walkers.find((w) => w.key === 'bogatyr');
      if (b) { this.cloak = new Cloak(scene, b.h); this.lantern = new Lantern(scene, b.h); }
    });
    // каждый шаг оставляет след; Леший ещё и пугает птиц, и стряхивает мох
    physics.onStep.push((w, side) => {
      const heavy = !!w.cfg.heavy, ang = -w.h.root.rotation.y + Math.PI / 2;
      const perp = [Math.cos(w.h.root.rotation.y), -Math.sin(w.h.root.rotation.y)];
      const off = heavy ? 0.32 : 0.11;
      this.trail.stamp(w.pos.x + perp[0] * off * side, w.pos.z + perp[1] * off * side, heavy ? 0.36 : 0.13, heavy ? 0.22 : 0.07, ang, 1, 1);
    });
    physics.onStomp.push((p) => {
      if (p.distanceTo(guardian.position) < 30) this.birds.scare();
      this.crumbs.spawn(4);
    });
    this.physics = physics;
  }
  setLamps(k) { this.lampK = k; }
  update(dt) {
    this.time += dt;
    // тропа: где ходят — земля вытаптывается
    for (const w of this.physics.walkers) if (w.moving > 0.3) this.trail.stamp(w.pos.x, w.pos.z, w.cfg.heavy ? 0.7 : 0.38, w.cfg.heavy ? 0.7 : 0.38, 0, 0, 0.012 * dt * 30);
    this.trail.update(dt);
    this.cloak?.update(dt);
    this.lantern?.update(dt, this.lampK);
    // иллюминатор стража светит на поляну ночью
    // источник чуть впереди стекла: светит на траву и героев перед стражем, а не на его собственную грудь
    G.uLamp0.value.set(0, 5.6, 5.2, 10);
    G.uLampC0.value.set(1.0, 0.62, 0.26).multiplyScalar(this.lampK * 0.3);
    this.birds.update(dt, this.time);
    this.crumbs.update(dt);
  }
}
