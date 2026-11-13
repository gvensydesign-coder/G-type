// Рисованные частицы: дым из труб, огонь, пыль стройки, вороны (альфа-смешение) и
// ореолы света растровой точкой (сложение). Всё — billboard-квадраты одним InstancedMesh.
import * as THREE from 'three';
import { makeFlatShader } from './toon.js';

const MAX = 3000;
const T = { smoke: 0, fire: 1, dust: 2, crow: 3, spark: 4 };

const VERT = `
in vec3 iPos; in vec4 iData; in vec3 iCol;   // iData: size, type, alpha, seed
out vec2 vQ; out vec4 vData; out vec3 vCol; out float vZ;
void main(){
  vQ = position.xy; vData = iData; vCol = iCol;
  vec4 mv = viewMatrix * vec4(iPos, 1.);
  float rot = iData.w * 6.28;
  vec2 p = position.xy * iData.x;
  if (iData.y > 2.5 && iData.y < 3.5) rot = 0.;
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
  } else if (type == 1.) {                 // огонь: язык пламени, 3 тона
    vec2 p = q; p.x += sin(p.y * 3. + uTime * 9. + seed * 30.) * .12 * (p.y + 1.);
    float w = (1. - (p.y + 1.) * .5); w = w * w * (1.2 - .2 * w);
    float d = abs(p.x) / max(w, .01);
    if (d > 1. || p.y > .95) discard;
    float core = d + (p.y + 1.) * .25;
    c = core < .45 ? vec3(1., .93, .6) : core < .8 ? vec3(1., .6, .15) : vec3(.85, .22, .06);
    c *= 1.6; alpha = 1.;
  } else if (type == 3.) {                 // ворон: силуэт «птичка» со взмахом
    float flap = sin(uTime * 10. + seed * 40.) * .35;
    vec2 p = q; p.x = abs(p.x);
    float wing = abs(p.y - (p.x * (.5 + flap) - .1) + p.x * p.x * .3) - .09 * (1. - p.x);
    float body = length(p * vec2(1.8, 1.)) - .22;
    if (min(wing, body) > 0. || p.x > .95) discard;
    c = vec3(.06, .05, .07); alpha = 1.;
  } else {                                 // искра
    if (length(q) > 1.) discard;
    c = vec3(1., .7, .3) * 2.; alpha = 1.;
  }
  float fog = smoothstep(uFogNear, uFogFar, vZ);
  c = mix(c, uFogCol, fog * (type == 1. ? .3 : 1.));
  oColor = vec4(c, alpha);
  oNormal = vec4(0.);
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
  float k = 1. - r;                       // 3 ступени + точки на краю
  float step3 = k > .6 ? 1. : k > .3 ? .55 : 0.;
  float dots = step(length(dc), k * 1.4) * .4;
  float v = max(step3, dots) * a * mix(.25, 1., uNight);
  v *= 1. - smoothstep(uFogNear, uFogFar * 1.2, vZ) * .7;
  oColor = vec4(vCol * v * .55, 1.);
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
    : { transparent: true, depthWrite: true });
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
      if (e.t === 'fire' && e.acc > 0.09) { e.acc = 0; const s = e.s ?? 0.5; this.spawn({ type: T.fire, x: e.x + (Math.random() - 0.5) * s * 0.6, y: e.y, z: e.z + (Math.random() - 0.5) * s * 0.6, vx: 0, vy: 1.4 * s + 0.4, vz: 0, life: 0.55, size: s * 1.4, grow: -0.6 * s, col: [1, 1, 1] });
        if (Math.random() < 0.15) this.spawn({ type: T.spark, x: e.x, y: e.y + s, z: e.z, vx: (Math.random() - 0.5), vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5), life: 1.2, size: 0.07, grow: 0, col: [1, 1, 1], wind: 1 });
        if (s > 0.8 && Math.random() < 0.12) this.spawn({ type: T.smoke, x: e.x, y: e.y + s * 1.4, z: e.z, vx: 0, vy: 1.3, vz: 0, life: 4, size: 0.8, grow: 0.8, col: [0.32, 0.3, 0.34], wind: 1 }); }
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
      const alpha = p.type === T.smoke || p.type === T.dust ? (1 - t) : 1;
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
    A.g.instanceCount = n; A.pos.needsUpdate = A.dat.needsUpdate = A.col.needsUpdate = true;
    // ореолы
    const G = this.add; let m = 0;
    for (const e of this.emitters) {
      if (e.t !== 'glow' && e.t !== 'fire') continue;
      if (m >= MAX) break;
      const r = e.t === 'fire' ? (e.s ?? 0.5) * 5 : (e.r ?? 1.5) * 2;
      G.pos.array.set([e.x, e.y, e.z], m * 3);
      G.dat.array.set([r, 0, e.t === 'fire' ? 1 : 0.8, e.seed ?? (e.seed = Math.random())], m * 4);
      const red = e.red;
      G.col.array.set(red ? [1.0, 0.25, 0.15] : [1.0, 0.62, 0.25], m * 3); m++;
    }
    G.g.instanceCount = m; G.pos.needsUpdate = G.dat.needsUpdate = G.col.needsUpdate = true;
  }
}
