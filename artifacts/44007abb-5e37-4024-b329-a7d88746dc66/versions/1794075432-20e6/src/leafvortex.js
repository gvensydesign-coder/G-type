// «Вихрь Лешего»: Леший рассыпается в листву, листья с аурой закручиваются в вихрь, вихрь улетает в лес.
// По разбору видео Leafborn: тело из тысяч листьев, переход тело → поток/шар → тело, листья отстают и осыпаются.
// Всё положение листьев — чистая функция времени t (детерминированно), поэтому таймлайн можно
// мотать в обе стороны: проигрыш вперёд = превращение и улёт, назад = вихрь возвращается и Леший собирается.
//
// Фазы (с): 0–1,2 «Зов»: рык, на теле прорастают листья, ветер поднимает палую листву;
//           1,1–2,5 «Распад»: тело тает снизу вверх (шейдер с кромкой), листья срываются в вихрь;
//           2,4–3,4 «Вихрь»: воронка крутится на месте, аура вытягивается;
//           3,4–6,6 «Улёт»: воронка сжимается в летящий клубок и уходит над лесом, часть листьев осыпается.
import * as THREE from 'three';

export const T = { roar: 1.5, sprout0: 0.15, sprout1: 1.1, cut0: 1.1, cut1: 2.4, form0: 1.0, form1: 2.6, fly: 3.4, flyDur: 3.2, end: 6.6, len: 7.4 };
export const PHASES = [['Зов', 0, 1.1], ['Распад', 1.1, 2.5], ['Вихрь', 2.5, T.fly], ['Улёт', T.fly, T.end], ['Тишина', T.end, T.len]];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const fract = (x) => x - Math.floor(x);
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// лист: заострённый овал с черешком, сложен по средней жилке
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(0.34, -0.3, 0.36, 0.18, 0, 0.5);
  s.bezierCurveTo(-0.36, 0.18, -0.34, -0.3, 0, -0.5);
  const g = new THREE.ShapeGeometry(s, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.abs(x) * 0.45 - (y * y) * 0.12);   // сгиб по жилке и лёгкая дуга
  }
  g.computeVertexNormals();
  // черешок
  const st = new THREE.PlaneGeometry(0.035, 0.16); st.translate(0, -0.56, 0);
  const merged = new THREE.BufferGeometry();
  const a = g.toNonIndexed(), b = st.toNonIndexed();
  const pos = new Float32Array(a.attributes.position.count * 3 + b.attributes.position.count * 3);
  pos.set(a.attributes.position.array); pos.set(b.attributes.position.array, a.attributes.position.array.length);
  const nor = new Float32Array(pos.length);
  nor.set(a.attributes.normal.array); nor.set(b.attributes.normal.array, a.attributes.normal.array.length);
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return merged;
}

export function toonRamp(steps = [0.32, 0.62, 1]) {
  const d = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { d.set([v * 255, v * 255, v * 255, 255], i * 4); });
  const t = new THREE.DataTexture(d, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
}

const PALETTE = [
  ['#4e7a2a', 22], ['#6b9a34', 20], ['#86ad3f', 12], ['#3a5f22', 16], ['#2c4419', 8],
  ['#a7b84a', 6], ['#c08a2a', 7], ['#a9552a', 5], ['#7d3f22', 4],
];
function pickColor(r) {
  const tot = PALETTE.reduce((s, p) => s + p[1], 0);
  let x = r * tot;
  for (const [c, w] of PALETTE) { if ((x -= w) <= 0) return new THREE.Color(c); }
  return new THREE.Color(PALETTE[0][0]);
}

// растворение тела: снизу вверх по высоте над землёй + шум, яркая кромка
export function patchDissolve(material, U) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; uniform float uCut; uniform float uBase; uniform vec3 uEdge;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float dz = vWP.y - uBase + (n3(vWP * 7.0) * 0.6 + n3(vWP * 19.0) * 0.4 - 0.5) * 0.42;
if (dz < uCut) discard;
float edgeK = 1.0 - smoothstep(0.0, 0.09, dz - uCut);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * edgeK * 2.2;');
  };
  material.needsUpdate = true;
}

export class LeafVortex {
  constructor(ch, { count = 2300, ground = 650, seed = 7, groundR = 4.2 } = {}) {
    this.ch = ch;
    this.group = new THREE.Group();
    this.origin = new THREE.Vector3();
    this.dir = new THREE.Vector3(1, 0, 0);
    const R = rng(seed);
    this.R = R;
    // кожа Лешего
    ch.model.traverse((o) => { if (o.isSkinnedMesh && !this.skin) this.skin = o; });
    this.U = { uCut: { value: -9 }, uBase: { value: 0 }, uEdge: { value: new THREE.Color('#b8ff7a') } };
    for (const m of ch.materials) patchDissolve(m, this.U);
    const H = ch.height; this.H = H;
    ch.group.updateMatrixWorld(true);
    const pc = this.skin.geometry.attributes.position.count;
    const v = new THREE.Vector3();
    const n = count + ground;
    this.n = n; this.nBody = count;
    this.L = [];
    for (let i = 0; i < n; i++) {
      const body = i < count;
      const L = {
        body, vi: 0, h: 0,
        th0: R() * Math.PI * 2, w: 2.4 + R() * 2.4, ph: R(), up: 0.09 + R() * 0.12, lag: 0.03 + R() * 0.42,
        size: (0.1 + R() * 0.075) * (body ? 1 : 1.1), col: pickColor(R()), glow: R() < 0.28 ? 0.5 + R() * 0.5 : 0,
        rx: R() * 6.28, ry: R() * 6.28, rz: R() * 6.28, sx: (R() - 0.5) * 9, sy: (R() - 0.5) * 7, sz: (R() - 0.5) * 5,
        yaw: R() * 6.28, straggle: R() < 0.15, ts: 0, fl: R() * 6.28, wob: 0.08 + R() * 0.12,
        out: new THREE.Vector3(), gp: new THREE.Vector3(),
        qBody: new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 6.28, R() * 6.28, R() * 6.28)),
      };
      if (body) {
        L.vi = Math.floor(R() * pc);
        this.skin.getVertexPosition(L.vi, v); v.applyMatrix4(this.skin.matrixWorld);
        L.h = clamp01((v.y - ch.group.position.y) / H);
        L.sp = T.sprout0 + R() * (T.sprout1 - T.sprout0) * (0.4 + 0.6 * (1 - L.h)) ;
        L.td = T.cut0 + (T.cut1 - T.cut0) * L.h + R() * 0.14;
      } else {
        const a = R() * Math.PI * 2, r = 0.5 + Math.sqrt(R()) * (groundR - 0.5);
        L.gp.set(Math.cos(a) * r, 0.012 + R() * 0.01, Math.sin(a) * r);
        L.td = 0.35 + (r / groundR) * 1.6 + R() * 0.35;
      }
      L.ts = T.fly + 0.25 + R() * 2.3;
      this.L.push(L);
    }
    this.mesh = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshToonMaterial({ color: 0xffffff, side: THREE.DoubleSide, gradientMap: toonRamp() }), n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) this.mesh.setColorAt(i, this.L[i].col);
    this.group.add(this.mesh);
    this.glowCol = new THREE.Color('#d6ff8a');
    // ленты ветра вокруг воронки
    this.ribbons = [];
    for (let k = 0; k < 4; k++) {
      const seg = 48, g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((seg + 1) * 2 * 3), 3));
      g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array((seg + 1) * 2), 1));
      const idx = [];
      for (let j = 0; j < seg; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx);
      const m = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color(k % 2 ? '#eaffd2' : '#bff08a') } },
        vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 uCol; varying float vA; void main(){ if (vA < 0.02) discard; gl_FragColor = vec4(uCol, vA * 0.75); }',
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 4;
      this.group.add(mesh);
      this.ribbons.push({ mesh, seg, a0: k * 1.7, h0: 0.15 + k * 0.5, turns: 1.3 + (k % 2) * 0.4, birth: 1.4 + k * 0.25 });
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._c = new THREE.Vector3();
    this.flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  }

  setOrigin(p, dir) { this.origin.copy(p); this.dir.copy(dir).setY(0).normalize(); this.U.uBase.value = p.y; }

  // центр вихря во времени: на месте с лёгким блужданием, потом по кривой вверх и прочь
  center(t, out) {
    const o = this.origin, d = this.dir;
    const side = this._w.set(-d.z, 0, d.x);
    const wander = sm((t - 1.6) / 1.4) * 0.22;
    out.copy(o).addScaledVector(side, Math.sin(t * 2.3) * wander).addScaledVector(d, Math.sin(t * 1.7 + 1) * wander * 0.6);
    const f = clamp01((t - T.fly) / T.flyDur);
    if (f > 0) {
      const u = Math.pow(f, 1.45);
      // кубическая Безье: разгон низко над землёй, потом свечой над кронами
      const p1 = 3.5, p2 = 13, p3 = 30, y1 = 1.4, y2 = 7, y3 = 15;
      const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, e = u ** 3;
      out.addScaledVector(d, b * p1 + c * p2 + e * p3);
      out.y += b * y1 + c * y2 + e * y3;
      out.addScaledVector(side, Math.sin(u * 5.0) * 1.2 * u);
    }
    return out;
  }

  // точка листа i в вихре в момент t
  vortexPos(L, t, out) {
    const age = Math.max(0, t - L.td);
    const fk = sm((t - T.fly) / 0.9);
    const form = sm((t - T.form0) / (T.form1 - T.form0));
    this.center(t - L.lag * (0.3 + fk), out);
    const Hm = THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.5, 3.5, form), 1.35, fk);
    const Rm = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.55, 1.05, form), 0.5, fk);
    const th = L.th0 + L.w * age * (1 + 0.45 * Math.min(age, 3));
    const hf = fract(L.ph + L.up * age * (1 + fk));
    const r = (0.26 + 0.44 * hf + 0.34 * hf * hf) * Rm * (1 + 0.14 * Math.sin(3 * th + t * 5 + L.fl));
    out.x += Math.cos(th) * r; out.z += Math.sin(th) * r;
    out.y += 0.06 + hf * Hm + Math.sin(th * 2 + L.fl) * 0.05;
    // верх воронки отстаёт при полёте
    out.addScaledVector(this.dir, -hf * hf * 1.1 * fk);
    L.env = sm(hf / 0.07) * (1 - sm((hf - 0.88) / 0.12));
    return out;
  }

  // главный вызов: t — время таймлайна, dt — для мелочей. Возвращает состояние для ауры/камеры.
  sample(t) {
    const ch = this.ch, P = this._v, Q = this._q, S = this._s, m = this._m;
    const cutK = clamp01((t - T.cut0) / (T.cut1 - T.cut0 + 0.25));
    const cut = -0.25 + (this.H + 0.55) * cutK;
    this.U.uCut.value = cut;
    ch.group.visible = cutK < 0.999;
    ch.model.traverse((o) => { if (o.isMesh) o.castShadow = cutK < 0.05; });
    const fadeEnd = 1 - sm((t - (T.end - 1.3)) / 1.3);
    const glowK = sm((t - 0.6) / 1.4) * (1 - sm((t - T.fly - 1.2) / 1.6));
    const c = new THREE.Color();
    const needSkin = t < T.cut1 + 1.0;
    if (needSkin) ch.group.updateMatrixWorld(true);
    for (let i = 0; i < this.n; i++) {
      const L = this.L[i];
      let scale = L.size, q = Q, pos = P;
      // где лист был до вихря
      let pre, qPre, preS;
      if (L.body) {
        preS = sm((t - L.sp) / 0.35);
        if (preS > 0 && t < L.td + 0.8 && needSkin) { this.skin.getVertexPosition(L.vi, this._c); this._c.applyMatrix4(this.skin.matrixWorld); }
        else if (preS <= 0) this._c.copy(this.origin);
        pre = this._c; qPre = L.qBody;
      } else {
        pre = this._c.copy(this.origin).add(L.gp);
        // дрожь от ветра перед подъёмом
        const tr = sm((t - L.td + 0.6) / 0.6) * (t < L.td ? 1 : 0);
        pre.y += tr * Math.abs(Math.sin(t * 13 + L.fl)) * 0.04;
        qPre = this._q2.copy(this.flat).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw + tr * Math.sin(t * 9 + L.fl) * 0.4));
        preS = 1;
      }
      const k = sm((t - L.td) / 0.8);
      if (k <= 0) {
        pos = P.copy(pre); q = Q.copy(qPre); scale *= preS;
      } else {
        // в вихре (или на пути в него)
        const tv = L.straggle ? Math.min(t, L.ts) : t;
        this.vortexPos(L, tv, P);
        let env = L.env;
        this._e.set(L.rx + L.sx * t, L.ry + L.sy * t, L.rz + L.sz * t);
        Q.setFromEuler(this._e);
        if (k < 1) {
          const out = this._w.copy(pre).sub(this.origin); out.y = 0; out.normalize();
          P.lerp(pre, 1 - k).addScaledVector(out, Math.sin(Math.PI * k) * 0.45);
          P.y += Math.sin(Math.PI * k) * 0.3;
          Q.slerp(qPre, 1 - k);
          env = THREE.MathUtils.lerp(preS, env, k);
        }
        scale *= env;
        // отставшие листья осыпаются на землю и остаются лежать
        if (L.straggle && t > L.ts) {
          const p0 = P.clone();
          const v0 = this.vortexPos(L, L.ts - 0.03, new THREE.Vector3()).sub(p0).multiplyScalar(-1 / 0.03);
          v0.clampLength(0, 5);
          const fall = (tau) => {
            const e = (1 - Math.exp(-tau * 1.4)) / 1.4;
            return p0.y + v0.y * e - 0.72 * tau;
          };
          let tau = t - L.ts, landed = false;
          if (fall(tau) <= 0.015) {
            let lo = 0, hi = tau;
            for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (fall(mid) > 0.015) lo = mid; else hi = mid; }
            tau = hi; landed = true;
          }
          const e = (1 - Math.exp(-tau * 1.4)) / 1.4;
          P.set(p0.x + v0.x * e + Math.sin(tau * 3.3 + L.fl) * 0.35, landed ? 0.012 : fall(tau), p0.z + v0.z * e + Math.cos(tau * 2.7 + L.fl) * 0.35);
          if (landed) Q.copy(this.flat).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw));
          scale = L.size * (landed ? 1 : 0.6 + 0.4 * sm(tau / 0.3)) * (1 - sm((t - T.len + 0.2) / 0.2) * 0);
        } else {
          scale *= fadeEnd;
        }
      }
      S.setScalar(Math.max(0.0001, scale));
      m.compose(pos, q, S);
      this.mesh.setMatrixAt(i, m);
      c.copy(L.col);
      if (L.glow && k > 0 && !(L.straggle && t > L.ts)) c.lerp(this.glowCol, L.glow * glowK * 0.45);
      this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.updateRibbons(t);
    const ctr = this.center(t, new THREE.Vector3());
    return {
      center: ctr,
      fly: sm((t - T.fly) / 0.9),
      form: sm((t - T.form0) / (T.form1 - T.form0)),
      glow: glowK,
      cut: cutK,
      phase: PHASES.find((p) => t >= p[1] && t < p[2])?.[0] || PHASES[PHASES.length - 1][0],
    };
  }

  updateRibbons(t) {
    const fk = sm((t - T.fly) / 0.9), form = sm((t - T.form0) / (T.form1 - T.form0));
    const vis = sm((t - 1.3) / 0.8) * (1 - sm((t - T.end + 1.6) / 1.2));
    const c = new THREE.Vector3(), p = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (const r of this.ribbons) {
      const pos = r.mesh.geometry.attributes.position, al = r.mesh.geometry.attributes.alpha;
      r.mesh.visible = vis > 0.01;
      if (!r.mesh.visible) continue;
      const Hm = THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.6, 3.3, form), 1.4, fk);
      const Rm = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.6, 1.15, form), 0.6, fk);
      // лента «бежит» вверх по спирали: окно видимости скользит по параметру
      const head = fract((t - r.birth) * 0.55 + r.a0 * 0.1);
      for (let j = 0; j <= r.seg; j++) {
        const u = j / r.seg;
        const hf = THREE.MathUtils.clamp(r.h0 / 3.5 + u * 0.75, 0, 1);
        const a = r.a0 + u * r.turns * Math.PI * 2 + t * 4.2;
        this.center(t - u * 0.25 * (0.3 + fk), c);
        const rad = (0.3 + 0.5 * hf + 0.35 * hf * hf) * Rm * 1.12;
        p.set(c.x + Math.cos(a) * rad, c.y + 0.1 + hf * Hm, c.z + Math.sin(a) * rad).addScaledVector(this.dir, -hf * hf * 1.1 * fk);
        nrm.set(0, 1, 0);
        const w = 0.035 * (1 - Math.abs(u - 0.5) * 1.4);
        pos.setXYZ(j * 2, p.x, p.y + w, p.z); pos.setXYZ(j * 2 + 1, p.x, p.y - w, p.z);
        const d = fract(u - head + 1);
        const win = d < 0.45 ? Math.sin((d / 0.45) * Math.PI) : 0;
        al.setX(j * 2, win * vis); al.setX(j * 2 + 1, win * vis);
      }
      pos.needsUpdate = true; al.needsUpdate = true;
    }
  }
}
