// Физика сцены (всё на процессоре, дёшево):
// ходьба героев по петлям, трава приминается и распрямляется, лианы-верёвки (Верле) с касанием героев,
// листья падают, ложатся на землю и разлетаются от шагов, шаги Лешего трясут землю и подбрасывают камешки,
// мягкие тени касания под героями, порывы ветра.
import * as THREE from 'three';
import { G, paintMat, vineMat, leafMat } from './materials.js';
import { M, groundY, clumpGeo, clumpMesh, rnd, addOutlineTo } from './world.js';
import { streamZ, streamDist } from './stream.js';

const rr = (a, b) => a + (b - a) * rnd();
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpM = new THREE.Matrix4(), tmpS = new THREE.Vector3();

// ---------- петли ходьбы ----------
// fwd: в какую сторону смотрит модель (-1: вперёд по -z, как у Богатыря; +1: по +z, как у Лешего)
export const WALK = {
  bogatyr: { c: [-8.3, 7.0], r: [1.8, 1.5], speed: 1.15, fwd: -1, body: [[0.45, 0.3], [0.9, 0.32], [1.3, 0.3]], push: 0.65 },
  leshy: { c: [3.6, 5.9], r: [1.9, 1.2], speed: 0.85, fwd: 1, body: [[0.9, 0.7], [1.9, 0.8], [2.9, 0.75]], push: 1.4, heavy: true },
};

// ---------- мягкая тень касания: тёмное пятно под ногами, чтобы герой не висел над землёй ----------
function contactBlob(sx, sz) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    uniforms: { uOp: { value: 0.5 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uOp; varying vec2 vP; void main(){ float r = length(vP);
      float a = (1.0 - smoothstep(0.15, 1.0, r)) * uOp; a = mix(a, step(0.5, a) * uOp * 0.8, 0.3);  // мягко, с лёгкой «нарисованной» ступенькой
      gl_FragColor = vec4(0.04, 0.10, 0.10, a);
      #include <colorspace_fragment>
    }`,
  }));
  m.rotation.x = -Math.PI / 2; m.scale.set(sx, sz, 1); m.renderOrder = 1;
  return m;
}

export class Physics {
  constructor(scene, heroes, dust) {
    this.scene = scene; this.dust = dust; this.t = 0;
    this.walk = true; this.quake = 0; this.walkers = [];
    this.onStep = []; this.onStomp = []; this.onReady = []; // подписчики: следы, птицы, крошки мха (extras.js)
    this.trail = []; this.trailTimer = 0;
    heroes.ready.then((list) => {
      list.forEach((h, i) => {
        if (!h) return;
        const key = i === 0 ? 'bogatyr' : 'leshy';
        const cfg = WALK[key];
        const blob = contactBlob(cfg.heavy ? 1.25 : 0.55, cfg.heavy ? 0.95 : 0.42); scene.add(blob);
        h.root.visible = this.heroesVisible !== false; blob.visible = h.root.visible;
        const w = { key, cfg, h, s: i * 2.1, wgt: 0, blob, pos: new THREE.Vector3(), prevPhase: 0, moving: 0, home: h.root.position.clone(), homeRot: h.root.rotation.y };
        this.walkers.push(w);
      });
      this.onReady.forEach((f) => f(this.walkers));
    });
    this.makeRopes();
    this.makeLeaves();
    this.makePebbles();
  }

  // ---------- ветка над тропой Богатыря и лианы-верёвки ----------
  makeRopes() {
    const A = new THREE.Vector3(-10.4, 7.4, 8.55), B = new THREE.Vector3(-6.2, 6.4, 5.0); // от ствола (-11, 9) над тропой Богатыря
    const dir = B.clone().sub(A); const len = dir.length();
    const bg = new THREE.CylinderGeometry(0.09, 0.24, len, 9, 6);
    const p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 1.3) * 0.06); p.setZ(i, p.getZ(i) + Math.sin(y * 0.8 + 1) * 0.08 - (y / len + 0.5) ** 2 * 0.0); }
    bg.computeVertexNormals();
    const branch = new THREE.Mesh(bg, M.bark);
    branch.position.copy(A).addScaledVector(dir, 0.5);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize()); // толстый конец у ствола
    branch.castShadow = branch.receiveShadow = true; this.scene.add(branch); addOutlineTo(branch);
    // листва на конце ветки и мох по верху
    const lg = [];
    for (let i = 0; i < 5; i++) { const q = A.clone().lerp(B, rr(0.75, 1.05)); lg.push(clumpGeo(q.x + rr(-0.5, 0.5), q.y + rr(0.1, 0.6), q.z + rr(-0.5, 0.5), rr(0.6, 1.0), 0.7)); }
    this.extrasObjs = [branch]; const lm = clumpMesh(lg, M.leaves); this.extrasObjs.push(lm); this.scene.add(lm);
    const mg = [];
    for (let i = 0; i < 9; i++) { const q = A.clone().lerp(B, rr(0.05, 0.8)); const r = 0.22 - 0.13 * (q.distanceTo(A) / len); mg.push(clumpGeo(q.x, q.y + r * 0.7, q.z, rr(0.14, 0.24), 0.55)); }
    const mm = clumpMesh(mg, M.moss); this.extrasObjs.push(mm); this.scene.add(mm);

    // где ветка проходит над петлёй Богатыря: туда и вешаем верёвки, чтобы он их задевал
    const c = WALK.bogatyr.c, r = WALK.bogatyr.r;
    const ell = (x, z) => ((x - c[0]) / r[0]) ** 2 + ((z - c[1]) / r[1]) ** 2;
    const anchors = [];
    let prev = ell(A.x, A.z);
    for (let t = 0.02; t <= 1; t += 0.01) {
      const q = A.clone().lerp(B, t); const e = ell(q.x, q.z);
      if ((prev - 1) * (e - 1) <= 0) anchors.push(t);
      prev = e;
    }
    const ts = [];
    for (const t of anchors) ts.push(t - 0.05, t, t + 0.04);
    ts.push(0.5, 0.62);
    this.ropes = [];
    const mat = vineMat({ rope: true });
    for (const t of ts) {
      const top = A.clone().lerp(B, t); top.y -= 0.12;
      const L = top.y - rr(0.55, 1.1);  // низ лианы — на уровне груди или пояса героя
      this.ropes.push(this.makeRope(top, L, mat));
    }
    this.branch = { A, B };
  }
  makeRope(top, L, mat) {
    const N = 16, seg = L / (N - 1);
    const pts = [], old = [];
    for (let i = 0; i < N; i++) { pts.push(new THREE.Vector3(top.x, top.y - i * seg, top.z)); old.push(pts[i].clone()); }
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 2 * 3), uv = new Float32Array(N * 2 * 2), info = new Float32Array(N * 2 * 2);
    const idx = [];
    const seed = rnd() * 10;
    for (let i = 0; i < N; i++) {
      const v = 1 - i / (N - 1);
      uv.set([0, v, 1, v], i * 4); info.set([L, seed, L, seed], i * 4);
      if (i < N - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 2));
    g.setIndex(idx);
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; this.scene.add(mesh);
    return { pts, old, seg, mesh, N, width: 0.62 };
  }
  stepRopes(dt, camera) {
    const wind = G.uWind.value;
    const bodies = [];
    for (const w of this.walkers) for (const [y, r] of w.cfg.body) bodies.push(w.pos.x, w.pos.y + y, w.pos.z, r);
    for (const R of this.ropes) {
      const { pts, old, seg, N } = R;
      for (let i = 1; i < N; i++) { // Верле: инерция + тяжесть + ветер
        const p = pts[i], o = old[i];
        const vx = (p.x - o.x) * 0.985, vy = (p.y - o.y) * 0.985, vz = (p.z - o.z) * 0.985;
        o.copy(p);
        const k = i / N;
        p.x += vx + (wind * 1.4 + Math.sin(this.t * 1.7 + i * 0.4) * 0.35) * k * dt * dt * 4;
        p.y += vy - 9.8 * dt * dt;
        p.z += vz + Math.cos(this.t * 1.3 + i * 0.3) * 0.25 * k * dt * dt * 4;
      }
      for (let it = 0; it < 10; it++) {
        for (let i = 0; i < N - 1; i++) { // длина звеньев постоянна, верх прибит к ветке
          const a = pts[i], b = pts[i + 1];
          tmpV.subVectors(b, a); const d = tmpV.length() || 1e-6; const diff = (d - seg) / d;
          if (i === 0) b.addScaledVector(tmpV, -diff);
          else { a.addScaledVector(tmpV, diff * 0.5); b.addScaledVector(tmpV, -diff * 0.5); }
        }
        for (let i = 1; i < N; i++) { // тело героя отталкивает лиану
          const p = pts[i];
          for (let b = 0; b < bodies.length; b += 4) {
            const dx = p.x - bodies[b], dy = p.y - bodies[b + 1], dz = p.z - bodies[b + 2], r = bodies[b + 3] + 0.06;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < r * r) { const d = Math.sqrt(d2) || 1e-4; const k = (r - d) / d; p.x += dx * k; p.y += dy * k; p.z += dz * k; }
          }
          const gy = groundY(p.x, p.z) + 0.05; if (p.y < gy) p.y = gy;
        }
      }
      // лента лицом к камере
      const pos = R.mesh.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
        const t = tmpV.subVectors(b, a).normalize();
        const toCam = tmpS.subVectors(camera.position, pts[i]).normalize();
        const side = toCam.cross(t).normalize().multiplyScalar(R.width * 0.5 * (1 - 0.5 * i / N));
        pos.setXYZ(i * 2, pts[i].x - side.x, pts[i].y - side.y, pts[i].z - side.z);
        pos.setXYZ(i * 2 + 1, pts[i].x + side.x, pts[i].y + side.y, pts[i].z + side.z);
      }
      pos.needsUpdate = true;
    }
  }

  // ---------- листья: падают, кружатся, ложатся, разлетаются от шагов ----------
  makeLeaves(N = 320) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geo, leafMat(), N);
    const seed = new Float32Array(N), fade = new Float32Array(N).fill(1);
    for (let i = 0; i < N; i++) seed[i] = rnd();
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    this.leafFade = new THREE.InstancedBufferAttribute(fade, 1); geo.setAttribute('aFade', this.leafFade);
    mesh.frustumCulled = false; this.scene.add(mesh);
    this.leafMesh = mesh;
    this.leaves = [];
    for (let i = 0; i < N; i++) {
      const L = { p: new THREE.Vector3(), v: new THREE.Vector3(), rot: new THREE.Vector3(rnd() * 6, rnd() * 6, rnd() * 6), spin: new THREE.Vector3(), s: 0.2 + seed[i] * 0.2, ph: rnd() * 50, state: 0, life: 0 };
      this.spawnLeaf(L, true);
      if (rnd() < 0.35) { L.p.y = groundY(L.p.x, L.p.z) + 0.02; this.land(L); L.life = rr(0, 30); }
      this.leaves.push(L);
    }
  }
  spawnLeaf(L, anyHeight = false) {
    L.p.set(rr(-15, 15), anyHeight ? rr(1, 17) : rr(14, 19), rr(-7, 16));
    L.v.set(0, -0.5, 0); L.state = 0; L.life = 0; L.fade = 1;
    L.spin.set(rr(1.5, 3.5), rr(1, 2.5), rr(1, 3));
  }
  land(L) {
    if (streamDist(L.p.x, L.p.z) < -0.15) { L.state = 2; L.v.set(0, 0, 0); L.spin.set(0, 0, rr(-0.6, 0.6)); L.rot.set(-Math.PI / 2, 0, rnd() * 6); return; } // упал в ручей — плывёт
    L.state = 1; L.life = 0; L.v.set(0, 0, 0);
    L.rot.set(-Math.PI / 2 + rr(-0.15, 0.15), 0, rnd() * Math.PI * 2); L.spin.set(0, 0, 0);
  }
  stepLeaves(dt) {
    const wind = G.uWind.value; const t = this.t;
    for (let i = 0; i < this.leaves.length; i++) {
      const L = this.leaves[i];
      if (L.state === 0) { // в воздухе: тяжесть, сопротивление воздуха, порхание и ветер
        L.v.y = Math.max(L.v.y - 3.2 * dt, -0.55 - L.s);
        const fx = Math.sin(t * 1.7 + L.ph) * 0.9 + wind * 1.6, fz = Math.cos(t * 1.3 + L.ph * 1.3) * 0.7;
        L.v.x += (fx - L.v.x) * Math.min(1, dt * 1.5); L.v.z += (fz - L.v.z) * Math.min(1, dt * 1.5);
        L.p.addScaledVector(L.v, dt);
        L.rot.addScaledVector(L.spin, dt);
        const gy = groundY(L.p.x, L.p.z) + 0.02;
        if (L.p.y <= gy) { L.p.y = gy; this.land(L); }
        if (Math.abs(L.p.x) > 30 || L.p.z > 28 || L.p.z < -20) this.spawnLeaf(L);
      } else if (L.state === 2) { // плывёт по течению, держится середины русла
        L.p.x += (0.7 + Math.sin(t * 0.7 + L.ph) * 0.15) * dt;
        L.p.z += (streamZ(L.p.x) - L.p.z) * 0.4 * dt + Math.sin(t * 1.3 + L.ph) * 0.05 * dt;
        L.p.y = groundY(L.p.x, L.p.z) + 0.075 + Math.sin(t * 3 + L.ph) * 0.008;
        L.rot.z += L.spin.z * dt;
        if (L.p.x > 40) this.spawnLeaf(L);
      } else { // на земле: лежит, потом истаивает, и сверху падает новый
        L.life += dt;
        if (L.life > 34) { L.fade = Math.max(0, 1 - (L.life - 34) / 2); if (L.fade <= 0) this.spawnLeaf(L); }
        for (const w of this.walkers) { // шаг рядом подбрасывает лист
          if (w.moving < 0.3) continue;
          const dx = L.p.x - w.pos.x, dz = L.p.z - w.pos.z, d = Math.hypot(dx, dz), R = w.cfg.heavy ? 1.6 : 0.75;
          if (d < R) {
            const k = 1 - d / R;
            L.state = 0; L.v.set(dx / (d + 0.01) * (1 + k * 2) * (0.6 + rnd()), 0.8 + k * 2.2 * (0.5 + rnd()), dz / (d + 0.01) * (1 + k * 2) * (0.6 + rnd()));
            L.spin.set(rr(3, 7), rr(2, 5), rr(2, 6)); L.p.y += 0.05; L.fade = 1;
          }
        }
      }
      tmpE.set(L.rot.x, L.rot.y, L.rot.z); tmpQ.setFromEuler(tmpE);
      tmpM.compose(L.p, tmpQ, tmpS.set(L.s, L.s, L.s));
      this.leafMesh.setMatrixAt(i, tmpM);
      this.leafFade.array[i] = L.fade;
    }
    this.leafMesh.instanceMatrix.needsUpdate = true; this.leafFade.needsUpdate = true;
  }
  kickLeaves(p, R, power) {
    for (const L of this.leaves) {
      if (L.state !== 1) continue;
      const dx = L.p.x - p.x, dz = L.p.z - p.z, d = Math.hypot(dx, dz);
      if (d > R) continue;
      const k = 1 - d / R;
      L.state = 0; L.v.set(dx / (d + 0.01) * k * power, (0.6 + k * 1.8) * power * (0.5 + rnd()), dz / (d + 0.01) * k * power); L.spin.set(rr(3, 7), rr(2, 5), rr(2, 6)); L.p.y += 0.05;
    }
  }

  // ---------- камешки у тропы Лешего: подпрыгивают от его шагов ----------
  makePebbles(N = 40) {
    const mat = paintMat({ base: '#77706a', strokeAmt: 0.1, break: 0.2, rim: 0.3, brush: 0.4, grime: 0.6,
      patchB: { col: '#5f7570', scale: 3, th: 0.62, amt: 0.8 } });
    const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, N);
    mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh);
    this.pebMesh = mesh; this.pebbles = [];
    const c = WALK.leshy.c;
    for (let i = 0; i < N; i++) {
      const a = rnd() * Math.PI * 2, d = rr(0.5, 4.2);
      const x = c[0] + Math.cos(a) * d * 1.2, z = c[1] + Math.sin(a) * d * 0.9;
      const s = rr(0.03, 0.085);
      const P = { p: new THREE.Vector3(x, groundY(x, z) + s * 0.6, z), v: new THREE.Vector3(), r: s, rot: new THREE.Vector3(rnd() * 6, rnd() * 6, rnd() * 6), spin: new THREE.Vector3(), air: false, sc: new THREE.Vector3(s * rr(1, 1.5), s * rr(0.6, 0.9), s) };
      this.pebbles.push(P);
    }
  }
  stomp(p) {
    this.quake = Math.min(1.2, this.quake + 0.9);
    for (const P of this.pebbles) {
      const d = Math.hypot(P.p.x - p.x, P.p.z - p.z); if (d > 3.8) continue;
      const k = 1 - d / 3.8;
      P.air = true; P.v.set((P.p.x - p.x) * 0.3 * k + rr(-0.3, 0.3), (1.4 + rnd() * 1.4) * k / (P.r * 6 + 0.4), (P.p.z - p.z) * 0.3 * k + rr(-0.3, 0.3));
      P.spin.set(rr(-8, 8), rr(-8, 8), rr(-8, 8));
    }
    this.kickLeaves(p, 3.0, 1.1);
  }
  stepPebbles(dt) {
    for (let i = 0; i < this.pebbles.length; i++) {
      const P = this.pebbles[i];
      if (P.air) {
        P.v.y -= 9.8 * dt; P.p.addScaledVector(P.v, dt); P.rot.addScaledVector(P.spin, dt);
        const gy = groundY(P.p.x, P.p.z) + P.r * 0.6;
        if (P.p.y < gy) { P.p.y = gy; if (Math.abs(P.v.y) > 0.6) { P.v.y *= -0.3; P.v.x *= 0.6; P.v.z *= 0.6; P.spin.multiplyScalar(0.5); } else P.air = false; }
      }
      // Леший не наступает сквозь камни: отодвигает их ступнёй
      for (const w of this.walkers) {
        if (!w.cfg.heavy) continue;
        const dx = P.p.x - w.pos.x, dz = P.p.z - w.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.55) { P.p.x = w.pos.x + dx / (d + 1e-4) * 0.55; P.p.z = w.pos.z + dz / (d + 1e-4) * 0.55; P.p.y = groundY(P.p.x, P.p.z) + P.r * 0.6; }
      }
      tmpE.set(P.rot.x, P.rot.y, P.rot.z); tmpQ.setFromEuler(tmpE);
      this.pebMesh.setMatrixAt(i, tmpM.compose(P.p, tmpQ, P.sc));
    }
    this.pebMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- ходьба ----------
  stepWalkers(dt) {
    const push = G.uPush.value;
    this.walkers.forEach((w, wi) => {
      const { cfg, h } = w;
      const target = this.walk ? 1 : 0;
      w.wgt += (target - w.wgt) * Math.min(1, dt * 2.5);
      const walkA = h.actions.Walk, idleA = h.actions.Idle;
      if (walkA) { walkA.setEffectiveWeight(w.wgt); idleA?.setEffectiveWeight(1 - w.wgt); }
      const v = cfg.speed * w.wgt;
      const per = Math.PI * Math.sqrt(2 * (cfg.r[0] ** 2 + cfg.r[1] ** 2)); // длина петли
      w.s += v * dt / per * Math.PI * 2;
      const x = cfg.c[0] + Math.cos(w.s) * cfg.r[0], z = cfg.c[1] + Math.sin(w.s) * cfg.r[1];
      const dx = -Math.sin(w.s) * cfg.r[0], dz = Math.cos(w.s) * cfg.r[1];
      const heading = cfg.fwd > 0 ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
      w.pos.set(x, groundY(x, z), z);
      if (w.wgt > 0.02) {
        h.root.position.lerpVectors(w.home, w.pos, Math.min(1, w.wgt * 1.5));
        // поворот по кратчайшей дуге
        let dr = heading - h.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        h.root.rotation.y += dr * Math.min(1, dt * 6 * w.wgt + w.wgt * 0.2);
      }
      w.pos.copy(h.root.position);
      w.moving = w.wgt;
      w.blob.position.set(w.pos.x, groundY(w.pos.x, w.pos.z) + 0.03, w.pos.z);
      w.blob.rotation.z = h.root.rotation.y;
      push[wi].set(w.pos.x, 1, w.pos.z, cfg.push);
      // шаги: два касания за цикл анимации ходьбы
      if (walkA && w.wgt > 0.5) {
        const D = walkA.getClip().duration, ph = (walkA.time % D) / D;
        const crossed = (w.prevPhase < 0.5 && ph >= 0.5) || ph < w.prevPhase;
        if (crossed) { w.side = -(w.side || 1); this.onStep.forEach((f) => f(w, w.side)); }
        if (crossed && cfg.heavy) { this.stomp(w.pos); this.onStomp.forEach((f) => f(w.pos)); }
        w.prevPhase = ph;
      }
    });
    // след в траве: каждые 0,3 с запоминаем точку, она распрямляется за 5 с
    this.trailTimer -= dt;
    if (this.trailTimer < 0 && this.walkers.length) {
      this.trailTimer = 0.3;
      for (const w of this.walkers) if (w.moving > 0.3) this.trail.push({ x: w.pos.x, z: w.pos.z, r: w.cfg.push * 0.9, t: 0 });
      while (this.trail.length > 8) this.trail.shift();
    }
    for (let i = 0; i < 8; i++) {
      const T = this.trail[i]; const P = push[2 + i];
      if (!T) { P.set(0, 0, -999, 0.1); continue; }
      T.t += dt; P.set(T.x, Math.max(0, 0.75 * (1 - T.t / 5)), T.z, T.r);
    }
  }

  // для шторки сравнения: убрать всё, чего нет в кадрах видео
  setExtrasVisible(v) {
    this.extrasObjs.forEach((o) => (o.visible = v)); this.ropes.forEach((r) => (r.mesh.visible = v)); this.pebMesh.visible = v;
  }
  setHeroesVisible(v) {
    this.heroesVisible = v;
    for (const w of this.walkers) { w.h.root.visible = v; w.blob.visible = v; }
  }
  update(dt, camera) {
    this.t += dt;
    // порывы ветра: медленная волна, иногда сильнее
    const g = 0.5 + 0.5 * Math.sin(this.t * 0.23) * Math.sin(this.t * 0.61 + 1.3);
    G.uWind.value = THREE.MathUtils.clamp(g * 1.5 - 0.45, 0, 1);
    this.stepWalkers(dt);
    this.stepRopes(Math.min(dt, 1 / 30), camera);
    this.stepLeaves(dt);
    this.stepPebbles(dt);
    this.quake *= Math.exp(-dt * 5);
  }
  // дрожь камеры от шагов Лешего: слабее, чем дальше камера
  shake(camera) {
    const l = this.walkers.find((w) => w.cfg.heavy);
    if (!l || this.quake < 0.01) return 0;
    const d = camera.position.distanceTo(l.pos);
    const k = this.quake * THREE.MathUtils.clamp(1.4 - d / 25, 0, 1);
    return k;
  }
}
