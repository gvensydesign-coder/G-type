// Рисованные частицы: дым из труб, огонь, пыль стройки, вороны (альфа-смешение) и
// ореолы света растровой точкой (сложение). Всё — billboard-квадраты одним InstancedMesh.
import * as THREE from 'three';
import { makeFlatShader } from './toon.js';

const MAX = 3000;
const T = { smoke: 0, fire: 1, dust: 2, crow: 3, spark: 4, mist: 5, wisp: 6 };

const VERT = `
in vec3 iPos; in vec4 iData; in vec3 iCol;   // iData: size, type, alpha, seed
out vec2 vQ; out vec4 vData; out vec3 vCol; out float vZ;
void main(){
  vQ = position.xy; vData = iData; vCol = iCol;
  vec4 mv = viewMatrix * vec4(iPos, 1.);
  float rot = iData.w * 6.28;
  vec2 p = position.xy * iData.x;
  if (iData.y > 2.5 && iData.y < 3.5 || iData.y > 4.5) rot = 0.;
  if (iData.y > 4.5 && iData.y < 5.5) p.y *= .45;                    // туман стелется: плоский
  if (iData.y > .5 && iData.y < 1.5) rot = (iData.w - .5) * .25;   // язык пламени стоит вертикально (раньше крутился во все стороны — «магия»)
  if (iData.y > .5 && iData.y < 1.5) { p.x *= .62; p.y = p.y * 1.25 + iData.x * .45; }   // узкий высокий язык растёт от основания вверх
  mv.xy += mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * p;
  vZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
in vec2 vQ; in vec4 vData; in vec3 vCol; in float vZ;
uniform float uTime, uFogNear, uFogFar, uPx, uNight; uniform vec3 uFogCol, uSunCol, uShadeCol;
void main(){
  float type = floor(vData.y + .5), a = vData.z, seed = vData.w;
  vec2 q = vQ * 2.;
  vec3 c; float alpha;
  if (type == 0. || type == 2.) {          // клуб дыма / пыли: круг с бугристым краем, 3 тона, контур
    float ang = atan(q.y, q.x);
    float r = length(q) * (1. + .12 * sin(ang * 5. + seed * 20.) + .06 * sin(ang * 9. - seed * 7.));
    if (r > 1.) discard;
    vec2 l = normalize(vec2(-.6, .8));
    float sh = dot(q, l) * .6 + .5 - r * .2;
    vec3 base = vCol;
    c = sh > .55 ? base * mix(vec3(1.), uSunCol, .4) * 1.1 : sh > .25 ? base * .85 : base * uShadeCol * 1.2;
    float ring = smoothstep(.8, .86, r);
    c = mix(c, vec3(.12, .1, .12), ring * .8);
    alpha = a;
    // растровое растворение при исчезании
    vec2 fc = gl_FragCoord.xy / uPx; vec2 dc = fract(mat2(.707,-.707,.707,.707) * fc / 4.) - .5;
    if (length(dc) > a * .9 + .1 && a < .9) discard;
    alpha = 1.;
  } else if (type == 1.) {                 // огонь: язык пламени — рваный, с отрывающимися верхушками, без пересвета
    float y01 = (q.y + 1.) * .5, t = uTime;
    vec2 p = q;
    p.x += (vnoise(vec2(p.y * 2.2 - t * 5., seed * 20.)) - .5) * .55 * y01;   // колышется сильнее к верху
    float n = vnoise(vec2(p.x * 3.2, p.y * 2.6 - t * 7.) + seed * 13.);
    float w = pow(max(1. - y01, 0.), .8) * sqrt(smoothstep(-.05, .3, y01)) * (.9 - .1 * sin(t * 15. + seed * 40.));   // капля: круглый низ, острый верх
    float d = abs(p.x) / max(w * (.7 + .5 * n), .01);
    if (d > 1. || y01 > .97) discard;
    if (y01 > .5 && n < (y01 - .5) * 1.5) discard;            // верхушка рвётся на отдельные языки
    // жар: языки из середины костра светлые, крайние — оранжевые и красные; к концу жизни язык темнеет
    float heat = vCol.r;
    float core = d * .75 + y01 * .6 + (1. - a) * .35 + (1. - heat) * .3;
    c = core < .62 ? vec3(1., .93, .66) : core < .98 ? vec3(1., .66, .2) : core < 1.28 ? vec3(.9, .33, .08) : vec3(.6, .17, .05);
    if (d > .9 && y01 < .55) c *= .8;                           // тонкий тёмный край только у основания
    c *= 1.12; alpha = 1.;
  } else if (type == 5.) {                 // ночной туман хтони: плоская рваная пелена, редкая растровая точка, без контура
    float r = length(q) * (1. + .2 * (fbm(q * 1.4 + seed * 9. + uTime * .05) - .5));
    if (r > 1.) discard;
    float dens = (1. - smoothstep(.2, 1., r)) * a;
    vec2 fc = gl_FragCoord.xy / uPx; vec2 dc = fract(mat2(.707,-.707,.707,.707) * fc / 3.5) - .5;
    if (length(dc) > sqrt(dens) * .62) discard;
    c = vCol * (1. + .15 * sin(uTime * .7 + seed * 6.)); alpha = 1.;
  } else if (type == 6.) {                 // блуждающий огонёк: яркое ядро и бледный венчик
    float r = length(q);
    if (r > 1.) discard;
    c = r < .45 ? vec3(.85, 1., .9) : vCol; alpha = 1.;
  } else if (type == 3.) {                 // ворон: силуэт «птичка» со взмахом
    float flap = sin(uTime * 10. + seed * 40.) * .35;
    vec2 p = q; p.x = abs(p.x);
    float wing = abs(p.y - (p.x * (.5 + flap) - .1) + p.x * p.x * .3) - .09 * (1. - p.x);
    float body = length(p * vec2(1.8, 1.)) - .22;
    if (min(wing, body) > 0. || p.x > .95) discard;
    c = vec3(.06, .05, .07); alpha = 1.;
  } else {                                 // искра
    if (length(q) > 1.) discard;
    if (fract(seed * 7. + uTime * 3.) < .25) discard;           // искра мигает
    c = vec3(1., .62, .25) * 1.3; alpha = 1.;
  }
  float fog = smoothstep(uFogNear, uFogFar, vZ);
  c = mix(c, uFogCol, fog * (type == 1. || type == 6. ? .3 : 1.));
  oColor = vec4(c, alpha);
  oNormal = vec4(.5, .5, 1., type == 1. || type == 4. || type == 6. ? .25 : .5);   // .25 — светится сам (пост не гасит насыщенность); .5 — без контура от соседей (у клубов свой)   // .25 — светится сам (пост не гасит насыщенность)
}`;

// Ореол растровой точкой: сложение, без записи глубины
const GLOW_FRAG = `
in vec2 vQ; in vec4 vData; in vec3 vCol; in float vZ;
uniform float uTime, uPx, uNight, uFogNear, uFogFar;
void main(){
  float r = length(vQ * 2.);
  if (r > 1.) discard;
  float a = vData.z * (.8 + .2 * sin(uTime * 5. + vData.w * 30.));
  vec2 fc = gl_FragCoord.xy / uPx;
  vec2 dc = fract(mat2(.707,-.707,.707,.707) * fc / 5.) - .5;
  float k = 1. - r;                       // мягкий спад: плотное ядро, затем редеющая растровая точка, без резкого диска
  float fall = k * k * (3. - 2. * k);
  float core = smoothstep(.62, .8, k);
  float dots = step(length(dc), sqrt(fall) * .62) * fall * .55;
  float v = max(core * .85, dots) * a * mix(.08, 1., uNight);
  v *= 1. - smoothstep(uFogNear, uFogFar * 1.2, vZ) * .7;
  oColor = vec4(vCol * v * .385, 1.);   // на 30% мягче прежнего
  oNormal = vec4(0.);
}`;

function makeLayer(frag, blending) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.attributes.position = quad.attributes.position;
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const dat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const col = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iPos', pos); g.setAttribute('iData', dat); g.setAttribute('iCol', col);
  g.instanceCount = 0;
  const m = makeFlatShader(frag, VERT, {}, blending === 'add'
    ? { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }
    : { transparent: true, depthWrite: true, blending: THREE.NoBlending });   // частицы непрозрачные (растровое растворение), без смешения: метка в цели нормалей доходит до поста как есть
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.set(1);
  return { mesh, pos, dat, col, g };
}

export class FX {
  constructor(scene) {
    this.parts = [];          // живые частицы
    this.emitters = new Set(); // постоянные источники: {t, x,y,z, s, owner}
    this.alpha = makeLayer(FRAG, 'alpha'); this.alpha.mesh.renderOrder = 3;
    this.add = makeLayer(GLOW_FRAG, 'add'); this.add.mesh.renderOrder = 4;
    scene.add(this.alpha.mesh, this.add.mesh);
    this.acc = 0;
    this.night = 0;           // 0..1, задаёт хозяин сцены (туман и огоньки хтони только ночью)
  }
  spawn(p) { if (this.parts.length < MAX - 10) this.parts.push({ age: 0, seed: Math.random(), ...p }); }
  // Облака пыли при переходе этапа стройки: кольцо клубов по периметру пятна
  dustBurst(center, w, d, h = 1, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, rx = Math.cos(a) * w * 0.55, rz = Math.sin(a) * d * 0.55;
      this.spawn({ type: T.dust, x: center.x + rx, y: center.y + Math.random() * h, z: center.z + rz,
        vx: rx * 0.25, vy: 0.6 + Math.random() * 0.8, vz: rz * 0.25, life: 1.1 + Math.random() * 0.8, size: 0.9 + Math.random() * 1.4, grow: 1.2,
        col: [0.86, 0.8, 0.68] });
    }
  }
  addEmitter(e) { this.emitters.add(e); return e; }
  removeEmitters(owner) { for (const e of [...this.emitters]) if (e.owner === owner) this.emitters.delete(e); }

  update(dt, time, wind = { x: 0.6, z: 0.2 }) {
    // источники
    for (const e of this.emitters) {
      e.acc = (e.acc ?? Math.random()) + dt;
      if (e.t === 'smoke' && e.acc > 0.35) { e.acc = 0; this.spawn({ type: T.smoke, x: e.x, y: e.y, z: e.z, vx: 0, vy: 1.0, vz: 0, life: 4.5, size: 0.5, grow: 0.55, col: [0.62, 0.62, 0.64], wind: 1 }); }
      // хтонь ночью: из заброшенных построек выползает низовой туман
      if (e.t === 'mist' && e.acc > 0.3) {
        e.acc = 0;
        if (this.night > 0.4 && Math.random() < this.night) {
          const a = Math.random() * Math.PI * 2, r0 = (e.r ?? 3) * 0.5 * Math.random(), sp = 0.18 + Math.random() * 0.2;
          this.spawn({ type: T.mist, x: e.x + Math.cos(a) * r0, y: e.y + 0.25 + Math.random() * 0.5, z: e.z + Math.sin(a) * r0, vx: Math.cos(a) * sp, vy: 0.01, vz: Math.sin(a) * sp, life: 8 + Math.random() * 5, size: 2 + Math.random() * 1.8, grow: 0.35, col: [0.42, 0.52, 0.54], fade: 1 });
        }
      }
      if (e.t === 'fire' && e.acc > 0.055) {
        // огонь: много коротких языков от основания (дрова/угли), дым над пламенем, редкие искры по ветру
        e.acc = 0; const s = e.s ?? 0.5, rr = Math.random;
        const ox = (rr() - 0.5) * s * 0.8, oz = (rr() - 0.5) * s * 0.8, off = Math.hypot(ox, oz) / (s * 0.57);
        const heat = 1 - off * 0.7, k = (0.55 + rr() * 0.6) * (1.15 - off * 0.45);   // в середине языки выше и светлее
        this.spawn({ type: T.fire, x: e.x + ox, y: e.y - s * 0.1, z: e.z + oz, vx: wind.x * 0.15, vy: (0.5 + rr() * 0.7) * s + 0.25, vz: wind.z * 0.15, life: 0.35 + rr() * 0.35, size: s * 1.15 * k, grow: -0.9 * s * k, col: [heat, 1, 1] });
        if (rr() < 0.06) this.spawn({ type: T.spark, x: e.x + (rr() - 0.5) * s * 0.4, y: e.y + s * 0.6, z: e.z, vx: (rr() - 0.5) * 0.6, vy: 1.2 + rr() * 1.6, vz: (rr() - 0.5) * 0.6, life: 0.8 + rr() * 0.8, size: 0.04 + rr() * 0.03, grow: -0.02, col: [1, 1, 1], wind: 1 });
        if (rr() < 0.05) this.spawn({ type: T.smoke, x: e.x, y: e.y + s * 1.4, z: e.z, vx: 0, vy: 0.7 + s * 0.4, vz: 0, life: 1.6 + s, size: 0.12 + s * 0.15, grow: 0.25 + s * 0.2, col: [0.36, 0.33, 0.32], wind: 1 });
      }
    }
    // частицы
    const A = this.alpha, P = this.parts;
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += dt;
      if (p.age > p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      const w = p.wind ? Math.min(1, p.age * 0.6) : 0;
      p.x += (p.vx + wind.x * w) * dt; p.y += p.vy * dt; p.z += (p.vz + wind.z * w) * dt;
      if (p.type === T.dust) { p.vx *= 0.96; p.vz *= 0.96; p.vy *= 0.97; }
    }
    // сортировка не нужна: клубы непрозрачные (растровое растворение)
    for (const p of P) {
      if (n >= MAX) break;
      const t = p.age / p.life;
      const size = Math.max(0.02, p.size + p.grow * p.age);
      const alpha = p.fade ? Math.sin(Math.PI * t) * 0.42 : p.type === T.smoke || p.type === T.dust || p.type === T.fire ? (1 - t) : 1;
      A.pos.array.set([p.x, p.y, p.z], n * 3);
      A.dat.array.set([size, p.type, alpha, p.seed], n * 4);
      A.col.array.set(p.col, n * 3);
      n++;
    }
    // вороны: кружат над источником
    for (const e of this.emitters) if (e.t === 'crows') for (let j = 0; j < 4; j++) {
      if (n >= MAX) break;
      const a = time * (0.35 + j * 0.06) + j * 1.7, r = 5 + j * 1.8;
      A.pos.array.set([e.x + Math.cos(a) * r, e.y + Math.sin(time * 0.7 + j) * 1.2 + j * 0.6, e.z + Math.sin(a) * r], n * 3);
      A.dat.array.set([0.9, T.crow, 1, j * 0.13 + 0.05], n * 4);
      A.col.array.set([0, 0, 0], n * 3); n++;
    }
    // блуждающие огоньки над жальником: ночью парят, медленно кружат, гаснут и вспыхивают
    for (const e of this.emitters) if (e.t === 'wisps' && this.night > 0.4) for (let j = 0; j < 5; j++) {
      if (n >= MAX) break;
      const ph = time * (0.13 + j * 0.03) + j * 2.4, r = 1.5 + (e.r ?? 4) * 0.5 * (0.5 + 0.5 * Math.sin(time * 0.21 + j * 1.7));
      const on = Math.max(0, Math.sin(time * 0.5 + j * 1.9)) ** 0.5;
      if (on < 0.05) continue;
      const wx = e.x + Math.cos(ph) * r, wy = e.y + 0.8 + 0.5 * Math.sin(time * 0.9 + j * 3.1) + j * 0.12, wz = e.z + Math.sin(ph * 1.3) * r;
      A.pos.array.set([wx, wy, wz], n * 3); A.dat.array.set([0.16 * on + 0.05, T.wisp, 1, j * 0.17], n * 4); A.col.array.set([0.45, 0.95, 0.75], n * 3); n++;
      (this._wisp ??= []).push([wx, wy, wz, on]);
    }
    A.g.instanceCount = n; A.pos.needsUpdate = A.dat.needsUpdate = A.col.needsUpdate = true;
    // ореолы
    const G = this.add; let m = 0;
    for (const e of this.emitters) {
      if (e.t !== 'glow' && e.t !== 'fire') continue;
      if (m >= MAX) break;
      const r = e.t === 'fire' ? (e.s ?? 0.5) * 3.6 : (e.r ?? 1.5) * 2;
      G.pos.array.set([e.x, e.y, e.z], m * 3);
      G.dat.array.set([r, 0, e.t === 'fire' ? 0.75 : 0.8, e.seed ?? (e.seed = Math.random())], m * 4);
      const red = e.red;
      G.col.array.set(red ? [1.0, 0.25, 0.15] : e.t === 'fire' ? [1.0, 0.5, 0.18] : [1.0, 0.62, 0.25], m * 3); m++;
    }
    for (const w of this._wisp ?? []) { if (m >= MAX) break; G.pos.array.set([w[0], w[1], w[2]], m * 3); G.dat.array.set([2.2 * w[3], 0, 1, 0.3], m * 4); G.col.array.set([0.35, 1.0, 0.7], m * 3); m++; }
    if (this._wisp) this._wisp.length = 0;
    G.g.instanceCount = m; G.pos.needsUpdate = G.dat.needsUpdate = G.col.needsUpdate = true;
  }
}
