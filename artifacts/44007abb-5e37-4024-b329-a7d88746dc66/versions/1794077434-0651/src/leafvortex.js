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

// Фазы перекрываются: каждая начинается, пока предыдущая ещё не кончилась, без жёстких границ.
export const T = { roar: 2.6, sprout0: 0.2, sprout1: 1.6, cut0: 1.2, cut1: 3.0, form0: 1.1, form1: 3.5, fly: 4.1, flyDur: 3.8, compress: 1.7, end: 7.9, len: 8.8 };
export const PHASES = [['Зов', 0, 1.3], ['Распад', 1.3, 3.0], ['Вихрь', 3.0, T.fly], ['Улёт', T.fly, T.end], ['Тишина', T.end, T.len]];
// интеграл smoothstep: сколько «включённости» накопилось с момента a за время перехода d
function smInt(t, a, d) { const x = (t - a) / d; if (x <= 0) return 0; if (x < 1) return d * (x * x * x - x * x * x * x / 2); return d * 0.5 + (t - a - d); }
const wrapPi = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const W = 4.2;   // угловая скорость вихря в полную силу, рад/с
const lerp = (a, b, k) => a + (b - a) * k;
// обратная smoothstep: при каком x функция даёт y
function smInv(y) { let lo = 0, hi = 1; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; const v = m * m * (3 - 2 * m); if (v < y) lo = m; else hi = m; } return (lo + hi) / 2; }
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
    // тень тает вместе с телом (иначе тень пропадала скачком)
    ch.model.traverse((o) => { if (o.isMesh) { o.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); patchDissolve(o.customDepthMaterial, this.U); } });
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
        th0: R() * Math.PI * 2, w: 1.9 + R() * 1.7, ph: R(), up: 0.09 + R() * 0.12, lag: 0.03 + R() * 0.42,
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
        // лист срывается ровно тогда, когда до него доходит линия превращения
        L.td = T.cut0 + (T.cut1 - T.cut0) * smInv(clamp01((L.h * H + 0.25) / (H + 0.55))) + R() * 0.08;
        L.sp = Math.max(0.05, Math.min(L.sp, L.td - 0.6)); // лист успевает прорасти до отрыва
        L.ab0 = Math.atan2(v.z - ch.group.position.z, v.x - ch.group.position.x);
      } else {
        const a = R() * Math.PI * 2, r = 0.5 + Math.sqrt(R()) * (groundR - 0.5);
        L.gp.set(Math.cos(a) * r, 0.012 + R() * 0.01, Math.sin(a) * r);
        // палую листву подхватывает, когда накал бури доходит до её расстояния
        L.td = 0.1 + 2.4 * smInv(0.1 + 0.75 * Math.pow(r / groundR, 0.8)) + R() * 0.15;
        L.ab0 = a;
      }
      // лист входит в вихрь со своей стороны и на своей высоте: без перескоков через ось и сверху вниз
      L.th0 = L.ab0 + R() * 0.9;
      L.ph = body ? Math.min(0.62, L.h * 0.75) : R() * 0.25;
      L.tr = 0.9 + R() * 0.6;                         // своя длительность отрыва у каждого листа
      L.dth = ((L.th0 - L.ab0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); // доворот по ходу вихря
      L.vc = new THREE.Vector3();
      L.m = 0.88 + R() * 0.24;                        // все крутятся в одну сторону и почти вместе
      L.up = 0.1 + R() * 0.1;                         // подъём за один оборот
      L.thTd = this.state(L.td).theta;
      L.ts = T.fly + 0.7 + R() * 2.4;
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
      this.ribbons.push({ mesh, seg, a0: k * 1.7, h0: 0.15 + k * 0.5, turns: 1.3 + (k % 2) * 0.4, birth: 2.0 + k * 0.3 });
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._c = new THREE.Vector3();
    this.flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  }

  // ВЕДУЩИЙ: одно время → одна ось, одно вращение, одна линия превращения снизу вверх.
  // Из него берут всё: листья, ленты, аура, таяние тела, свечение, сжатие и улёт.
  state(t, o = {}) {
    o.s = sm((t - 0.1) / 2.4);                            // накал бури
    o.front = sm((t - T.cut0) / (T.cut1 - T.cut0));       // линия превращения: 0 ступни → 1 макушка
    o.fk = sm((t - T.fly) / T.compress);                  // сжатие в клубок
    o.endK = sm((t - T.end + 1.8) / 1.8);                 // рассеивание
    o.theta = W * (0.12 * t + 0.88 * smInt(t, 0.1, 2.4) + 0.5 * smInt(t, T.fly, T.compress)); // фаза вращения
    o.omega = W * (0.12 + 0.88 * o.s) * (1 + 0.5 * o.fk);
    o.cut = -0.25 + (this.H + 0.55) * o.front;            // высота линии над землёй
    o.Hm = lerp(lerp(0.35, 3.3, Math.max(o.front, 0.12 * o.s)), 1.45, o.fk); // вихрь растёт вместе с линией
    o.Rm = lerp(0.4 + 0.65 * o.s, 0.55, o.fk) * (1 + 1.6 * o.endK);
    return o;
  }

  setOrigin(p, dir) { this.origin.copy(p); this.dir.copy(dir).setY(0).normalize(); this.U.uBase.value = p.y; }

  // центр вихря во времени: на месте с лёгким блужданием, потом по кривой вверх и прочь
  center(t, out) {
    const o = this.origin, d = this.dir;
    const side = this._w.set(-d.z, 0, d.x);
    const wander = sm((t - 2.2) / 1.8) * 0.22;
    out.copy(o).addScaledVector(side, Math.sin(t * 2.3) * wander).addScaledVector(d, Math.sin(t * 1.7 + 1) * wander * 0.6);
    const f = clamp01((t - T.fly) / T.flyDur);
    if (f > 0) {
      const u = Math.pow(f, 1.7);   // очень мягкий отрыв
      // кубическая Безье: разгон низко над землёй, потом свечой над кронами
      const p1 = 3.0, p2 = 11, p3 = 24, y1 = 3.0, y2 = 9.5, y3 = 14;
      const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, e = u ** 3;
      out.addScaledVector(d, b * p1 + c * p2 + e * p3);
      out.y += b * y1 + c * y2 + e * y3;
      out.addScaledVector(side, Math.sin(u * 5.0) * 1.2 * u);
    }
    return out;
  }

  // точка листа i в вихре в момент t
  vortexPos(L, t, out) {
    const S = this.state(t, this._st || (this._st = {}));
    this.center(t - L.lag * (0.3 + 0.7 * S.fk), out);
    L.vc.copy(out);
    const turn = S.theta - L.thTd;                         // сколько вихрь провернулся с момента отрыва
    const th = L.th0 + L.m * turn;
    const hf = fract(L.ph + L.up * turn / (Math.PI * 2));  // подъём по спирали привязан к вращению
    const r = (0.26 + 0.44 * hf + 0.34 * hf * hf) * S.Rm * (1 + 0.1 * Math.sin(3 * th + L.fl));
    L.th = th; L.r = r;
    out.x += Math.cos(th) * r; out.z += Math.sin(th) * r;
    out.y += 0.06 + hf * S.Hm + Math.sin(th * 2 + L.fl) * 0.05;
    out.addScaledVector(this.dir, -hf * hf * 1.1 * S.fk); // верх воронки отстаёт при полёте
    L.env = sm(hf / 0.07) * (1 - sm((hf - 0.88) / 0.12)) * (1 - S.endK);
    return out;
  }

  // главный вызов: t — время таймлайна, dt — для мелочей. Возвращает состояние для ауры/камеры.
  sample(t) {
    const ch = this.ch, P = this._v, Q = this._q, S = this._s, m = this._m;
    const M = this.state(t, {});
    this.U.uCut.value = M.cut;
    ch.group.visible = M.front < 0.999;
    const glowK = M.s * (1 - 0.7 * M.fk);
    const c = new THREE.Color();
    const needSkin = t < T.cut1 + 1.7;
    if (needSkin) { ch.group.updateMatrixWorld(true); this.skin.skeleton.update(); }  // кости этого кадра, а не прошлого рендера
    for (let i = 0; i < this.n; i++) {
      const L = this.L[i];
      let scale = L.size, q = Q, pos = P;
      // где лист был до вихря
      let pre, qPre, preS;
      if (L.body) {
        preS = sm((t - L.sp) / 0.6);
        if (preS > 0 && t < L.td + L.tr && needSkin) { this.skin.getVertexPosition(L.vi, this._c); this._c.applyMatrix4(this.skin.matrixWorld); }
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
      const kl = clamp01((t - L.td) / L.tr), k = sm(kl);
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
          // отрыв по спирали вокруг оси вихря: угол, радиус и высота меняются плавно, без прямых «склеек»
          // ось отсчёта: от места Лешего плавно к оси вихря (блуждание оси не перекидывает угол)
          const cc = this._w.copy(this.origin).lerp(L.vc, k);
          const rx = pre.x - this.origin.x, rz = pre.z - this.origin.z;
          const ab = L.ab0 + wrapPi(Math.atan2(rz, rx) - L.ab0) * sm(Math.hypot(rx, rz) / 0.3);
          const rb = Math.hypot(rx, rz);
          const a = ab * (1 - k) + k * (L.ab0 + L.dth) + k * k * (L.th - L.th0);   // скорость кружения растёт по мере приближения к оси
          const kr = sm(kl * 1.15);                     // к радиусу вихря чуть раньше, чем по высоте
          const rr = THREE.MathUtils.lerp(rb, L.r, kr) + Math.sin(Math.PI * kl) * 0.25;
          const yy = THREE.MathUtils.lerp(pre.y, P.y, k) + Math.sin(Math.PI * kl) * 0.22;
          P.set(cc.x + Math.cos(a) * rr, yy, cc.z + Math.sin(a) * rr);
          Q.slerp(qPre, 1 - k);
          env = THREE.MathUtils.lerp(preS, env, k);
        }
        scale *= env;
        // отставшие листья осыпаются на землю и остаются лежать
        if (L.straggle && t > L.ts) {
          const p0 = P.clone(), envTs = env;
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
          // порхание начинается с нуля, чтобы лист не прыгал в момент отрыва
          const fl = sm(tau / 0.6);
          P.set(p0.x + v0.x * e + (Math.sin(tau * 3.3 + L.fl) - Math.sin(L.fl)) * 0.35 * fl, landed ? 0.012 : fall(tau),
            p0.z + v0.z * e + (Math.cos(tau * 2.7 + L.fl) - Math.cos(L.fl)) * 0.35 * fl);
          const tl = L.ts + tau;
          this._e.set(L.rx + L.sx * Math.min(t, tl), L.ry + L.sy * Math.min(t, tl), L.rz + L.sz * Math.min(t, tl));
          Q.setFromEuler(this._e);
          if (landed) Q.slerp(this.flat.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw)), sm((t - tl) / 0.35));
          scale = L.size * THREE.MathUtils.lerp(envTs, 1, sm((t - L.ts) / 0.5));
        }
      }
      S.setScalar(Math.max(0.0001, scale));
      m.compose(pos, q, S);
      this.mesh.setMatrixAt(i, m);
      c.copy(L.col);
      if (L.glow && k > 0) c.lerp(this.glowCol, L.glow * glowK * 0.45 * k * (L.straggle ? 1 - sm((t - L.ts) / 0.6) : 1));
      this.mesh.setColorAt(i, c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.updateRibbons(t);
    const ctr = this.center(t, new THREE.Vector3());
    return {
      ...M,
      center: ctr,
      fly: M.fk,
      glow: glowK,
      cut: M.front,
      phase: PHASES.find((p) => t >= p[1] && t < p[2])?.[0] || PHASES[PHASES.length - 1][0],
    };
  }

  updateRibbons(t) {
    const M = this.state(t, {});
    const vis = sm((M.s - 0.35) / 0.4) * (1 - 0.5 * M.fk) * (1 - M.endK);
    const c = new THREE.Vector3(), p = new THREE.Vector3(), S2 = {};
    for (const r of this.ribbons) {
      const pos = r.mesh.geometry.attributes.position, al = r.mesh.geometry.attributes.alpha;
      r.mesh.visible = vis > 0.01;
      if (!r.mesh.visible) continue;
      // лента — те же ось, вращение и высота, что у листьев
      const head = fract(M.theta / (Math.PI * 2) * 0.45 + r.a0 * 0.1);
      for (let j = 0; j <= r.seg; j++) {
        const u = j / r.seg;
        const tl = t - u * 0.25 * (0.3 + M.fk);
        const Sx = this.state(tl, S2);
        this.center(tl, c);
        const hf = THREE.MathUtils.clamp(r.h0 / 3.5 + u * 0.75, 0, 1);
        const a = r.a0 + u * r.turns * Math.PI * 2 + Sx.theta;
        const rad = (0.3 + 0.5 * hf + 0.35 * hf * hf) * Sx.Rm * 1.12;
        p.set(c.x + Math.cos(a) * rad, c.y + 0.1 + hf * Sx.Hm, c.z + Math.sin(a) * rad).addScaledVector(this.dir, -hf * hf * 1.1 * Sx.fk);
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
