// Стихии и ауры в рисованном стиле (дополнение к paintfx.js).
//   PaintedAura  — активация ауры персонажа: оболочки-языки по силуэту (кольцами: ядро, середина, край, тушь),
//                  вспышка-звезда за спиной, ударное кольцо по земле, взлетающие штрихи, искры или листья, свет.
//   PaintedFire  — костёр: языки пламени тонами с тушевой кромкой, отрывающиеся капли, дым клубами, угли, мерцающий свет.
//   PaintedRiver — река: полосы глубины, рваная пена у берега, мазки течения, рябь бликами, отражение источника.
//   PaintedFall  — водопад: струи полосами, пена клубами у подножия.
// Всё живёт шагами (как рисованная анимация), а не плавно. Кромки и тушь пишут альфу 0,5,
// поэтому Кувахара их не размывает (так же защищены линии эмоций).
import * as THREE from 'three';
import { GLSL_NOISE } from './paintfx.js';

const col = (v) => new THREE.Color(v);

// ---------------------------------------------------------------- пресеты
export const AURA_PRESETS = {
  grace: { name: 'Благодать (Богатырь)', core: '#fffbe6', mid: '#ffd35a', edge: '#e8862a', ink: '#4a1c06', light: '#ffc060',
    push: 0.085, lift: 0.22, particles: 'spark', burst: '#fff2b0' },
  forest: { name: 'Дух леса (Леший)', core: '#eafff0', mid: '#6dff96', edge: '#1f9a52', ink: '#06210f', light: '#6dff96',
    push: 0.1, lift: 0.3, particles: 'leaf', burst: '#c8ffd8' },
  rage: { name: 'Ярость', core: '#fff0e0', mid: '#ff6a3a', edge: '#b0141e', ink: '#2a0406', light: '#ff5030',
    push: 0.095, lift: 0.26, particles: 'spark', burst: '#ffd0a0' },
  frost: { name: 'Иней', core: '#ffffff', mid: '#9ee8ff', edge: '#3a78d0', ink: '#0a1a3a', light: '#8ad8ff',
    push: 0.08, lift: 0.18, particles: 'spark', burst: '#e0f8ff' },
};
export const FIRE_PRESETS = {
  hearth: { name: 'Костёр', out: '#d8401c', mid: '#ff8a2a', core: '#ffd25a', hot: '#fff6d0', ink: '#3a0c06', smoke: '#4a4048', smokeHi: '#7a6a70', light: '#ff9a40' },
  witch: { name: 'Колдовской (Леший)', out: '#127a46', mid: '#3fd06a', core: '#b8ff7a', hot: '#f0ffe0', ink: '#04200f', smoke: '#2a3a34', smokeHi: '#4a6a58', light: '#70ff90' },
  spirit: { name: 'Синий дух', out: '#2a3ab8', mid: '#3a8aff', core: '#9ae0ff', hot: '#f0fbff', ink: '#0a0a30', smoke: '#30304a', smokeHi: '#56567a', light: '#70b0ff' },
};
export const WATER_PRESETS = {
  stream: { name: 'Ручей (день)', deep: '#1c4a5a', mid: '#2f7c86', shallow: '#62b0a8', foam: '#f2fbf4', sky: '#bfe6ec', ink: '#0c2228', glint: '#fffbe8' },
  night: { name: 'Ночная вода', deep: '#0e1a34', mid: '#1c3458', shallow: '#3a6080', foam: '#d8e8ff', sky: '#8aa8e0', ink: '#050a18', glint: '#ffe8b0' },
  swamp: { name: 'Болотная', deep: '#1a2a12', mid: '#34502a', shallow: '#5e7a3a', foam: '#d8e8b0', sky: '#a8c090', ink: '#0a1206', glint: '#f0ffc0' },
};

// ---------------------------------------------------------------- общее
// Шаговые часы: каждый эффект живёт своей частотой (огонь 12 к/с, аура 10, вода 6).
class StepClock {
  constructor(fps) { this.fps = fps; this.t = 0; this.u = { value: 0 }; }
  tick(dt) { this.t += dt; const s = Math.floor(this.t * this.fps); const n = s !== this.u.value; this.u.value = s; return n; }
}
// Картинка на холсте → текстура (искра-ромб, лист, мазок).
function canvasTex(draw, w = 64, h = 64) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX = {};
function sparkTex() {
  return TEX.spark ??= canvasTex((g, w, h) => {
    g.translate(w / 2, h / 2);
    const rh = (k, c) => { g.beginPath(); g.moveTo(0, -h * .46 * k); g.lineTo(w * .2 * k, 0); g.lineTo(0, h * .46 * k); g.lineTo(-w * .2 * k, 0); g.closePath(); g.fillStyle = c; g.fill(); };
    rh(1, '#3a1a08'); rh(.8, '#ffffff'); rh(.42, '#fff8e0');
  });
}
function leafTex() {
  return TEX.leaf ??= canvasTex((g, w, h) => {
    g.translate(w / 2, h / 2); g.rotate(-0.5);
    const leaf = (k) => { g.beginPath(); g.moveTo(0, -h * .44 * k); g.quadraticCurveTo(w * .36 * k, -h * .1 * k, 0, h * .42 * k); g.quadraticCurveTo(-w * .36 * k, -h * .1 * k, 0, -h * .44 * k); g.closePath(); };
    leaf(1); g.fillStyle = '#06210f'; g.fill();
    leaf(.82); g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = '#7a9a80'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -h * .32); g.lineTo(0, h * .36); g.stroke();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(0, i * h * .1); g.lineTo(w * .14, i * h * .1 - h * .08); g.moveTo(0, i * h * .1); g.lineTo(-w * .14, i * h * .1 - h * .08); g.lineWidth = 1.5; g.stroke(); }
  });
}
// Спрайт с защитой от Кувахары: чёткий край (alphaTest), альфа 0,5 в буфере.
function protSprite(map, color) {
  const m = new THREE.SpriteMaterial({ map, color, alphaTest: 0.4, depthWrite: false, transparent: false, fog: false });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.a = .5;'); };
  const s = new THREE.Sprite(m); s.userData.pfMark = true; s.renderOrder = 3; return s;
}

// Плоскость, повёрнутая к камере вокруг вертикали (языки огня и штрихи остаются стоячими).
const BB_VERT = /* glsl */`
uniform vec2 uSize; uniform vec3 uOff;
varying vec2 vP;
void main(){
  vP = position.xy;
  vec3 C = (modelMatrix * vec4(uOff, 1.)).xyz;
  vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); R.y = 0.; R = normalize(R + vec3(1e-5, 0., 0.));
  vec3 W = C + R * position.x * uSize.x + vec3(0., 1., 0.) * position.y * uSize.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(W, 1.);
}`;
// Полностью повёрнутая к камере (вспышка-звезда).
const BB_FULL_VERT = /* glsl */`
uniform vec2 uSize; uniform vec3 uOff; uniform float uPush;
varying vec2 vP;
void main(){
  vP = position.xy;
  vec4 C = viewMatrix * modelMatrix * vec4(uOff, 1.);
  C.xyz += normalize(C.xyz) * uPush;            // отодвинуть за персонажа
  C.xy += position.xy * uSize;
  gl_Position = projectionMatrix * C;
}`;
function bbGeo(y0 = 0) { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5 - y0, 0); return g; }

// ---------------------------------------------------------------- языки пламени (общий шейдер)
// Поле f: >0 внутри языка. Тоны режутся жёстко: тушь по краю, наружный, средний, ядро, белое горячее.
const FLAME_FRAG = /* glsl */`
uniform float uStep, uSeed, uAmt; uniform vec4 uK;        // x: дикость, y: тушь, z: отрыв капель, w: высота ядра
uniform vec3 cOut, cMid, cCore, cHot, cInk;
varying vec2 vP;
${GLSL_NOISE}
void main(){
  vec2 p = vP; p.x *= 1.6; float y = p.y; float st = uStep;              // пламя занимает середину плоскости
  float sway = (pfNoise(vec2(y * 2.1 - st * .41, uSeed)) - .5) * .26 * y;
  float x = p.x - sway;
  float w = .36 * pow(max(1. - y, 0.), .7) * smoothstep(-.02, .16, y) * uAmt;
  float f = 1. - abs(x) / max(w, 1e-3);
  float n = pfNoise(vec2(x * 5.2, y * 3.1 - st * .93) + uSeed * 7.1);
  float n2 = pfNoise(vec2(x * 11., y * 6.3 - st * 1.71) + uSeed * 3.7);
  f -= (n * .6 + n2 * .28) * (.12 + y * 1.15) * uK.x;
  f += .3 * (1. - y);
  // оторвавшиеся капли над языком
  vec2 dq = vec2(x * 3.2, y * 2.4 - st * .55 + uSeed);
  vec2 di = floor(dq); vec2 df = fract(dq) - .5;
  vec2 dc = (pfH22(di + uSeed) - .5) * .5;
  // ворс кисти вдоль языка
  f += (pfNoise(vec2(x * 22., y * 2.6 - st * .6) + uSeed) - .5) * .1;
  float dm = step(.72, pfH21(di * 1.3 + uSeed)) * smoothstep(.45, .8, y) * (1. - smoothstep(.12, .26, abs(x))) * uK.z;
  if (dm > .01) f = max(f, (.3 - length((df - dc) * vec2(1., .75))) * 3. * dm);
  if (f <= 0.) discard;
  float coreF = f - y * uK.w;
  vec3 c = cOut;
  if (f < .07 * uK.y) c = cInk;
  else if (coreF > .78) c = cHot;
  else if (coreF > .52) c = cCore;
  else if (f > .28) c = cMid;
  gl_FragColor = vec4(c, .5);
}`;
// Клубы (дым, пена): кружки, всплывающие шагами, два тона и тушь.
const PUFF_FRAG = /* glsl */`
uniform float uStep, uSeed, uAmt; uniform vec4 uK;        // x: число клубов, y: скорость подъёма, z: тушь, w: расход в стороны
uniform vec3 cA, cB, cInk;
varying vec2 vP;
${GLSL_NOISE}
void main(){
  vec2 p = vP; float best = -1.; float shade = 0.;
  for (int i = 0; i < 7; i++) {
    float fi = float(i); if (fi >= uK.x) break;
    float ph = fract(uStep * uK.y * .01 + fi / uK.x + pfH11(fi + uSeed) * .3);
    vec2 c = vec2((pfH11(fi * 3.1 + uSeed) - .5) * .3 + (pfNoise(vec2(ph * 3., fi)) - .5) * uK.w * ph, ph * .85 + .06);
    float r = (.08 + ph * .22) * (1. - smoothstep(.75, 1., ph)) * uAmt;
    vec2 d = p - c;
    float edge = (pfNoise(vec2(atan(d.y, d.x) * 2.5 + fi, uStep * .3)) - .5) * .05;
    float f = (r + edge - length(d * vec2(1., 1.15))) / max(r, 1e-3);
    if (f > best) { best = f; shade = dot(normalize(d + vec2(1e-4)), normalize(vec2(-.6, .8))); }
  }
  if (best <= 0.) discard;
  vec3 c = shade > .15 ? cB : cA;
  if (best < .12 * uK.z) c = cInk;
  gl_FragColor = vec4(c, .5);
}`;

function flameMat(p, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: new THREE.Vector2(o.w ?? 0.9, o.h ?? 1.4) }, uOff: { value: new THREE.Vector3(...(o.off ?? [0, 0, 0])) },
      uStep: o.step, uSeed: { value: o.seed ?? 0 }, uAmt: { value: 1 }, uK: { value: new THREE.Vector4(o.wild ?? 1, o.ink ?? 1, o.drops ?? 1, o.coreH ?? .55) },
      cOut: { value: col(p.out) }, cMid: { value: col(p.mid) }, cCore: { value: col(p.core) }, cHot: { value: col(p.hot) }, cInk: { value: col(p.ink) },
    },
    vertexShader: BB_VERT, fragmentShader: FLAME_FRAG, side: THREE.DoubleSide,
  });
}
function puffMat(cA, cB, cInk, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: new THREE.Vector2(o.w ?? 1, o.h ?? 2) }, uOff: { value: new THREE.Vector3(...(o.off ?? [0, 0, 0])) },
      uStep: o.step, uSeed: { value: o.seed ?? 0 }, uAmt: { value: 1 }, uK: { value: new THREE.Vector4(o.n ?? 6, o.speed ?? 2.5, o.ink ?? 1, o.spread ?? .4) },
      cA: { value: col(cA) }, cB: { value: col(cB) }, cInk: { value: col(cInk) },
    },
    vertexShader: BB_VERT, fragmentShader: PUFF_FRAG, side: THREE.DoubleSide,
  });
}
function fxMesh(mat, geo = bbGeo()) { const m = new THREE.Mesh(geo, mat); m.userData.pfSkip = true; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; return m; }

// ---------------------------------------------------------------- рисованные линии: почеркушки или процедурные
// Классы почеркушек для стихий. Пока Michael их не нарисовал, работают процедурные образцы
// в том же формате ({w, p: [[x, y, нажим]]}, 0..1, y вниз), поэтому замена — без правок кода.
export const ELEMENT_CLASSES = ['fire', 'water', 'splash', 'smoke', 'aura', 'runes', 'env'];
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function poly(f, n = 28, w = 0.014, pr = (t) => 0.35 + 0.65 * Math.sin(Math.PI * t)) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; const [x, y] = f(t); p.push([x, y, pr(t)]); } return { w, p }; }
const seg = (a, b, w = 0.02) => poly((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], 6, w, () => 0.8);
const PROC = {
  // языки: S-образные линии снизу вверх с крючком на кончике
  fire: (r) => Array.from({ length: 6 }, (_, i) => Array.from({ length: 2 + (i % 2) }, (_, j) => {
    const ph = r() * 6, a = 0.08 + r() * 0.1, x0 = 0.35 + j * 0.15 + r() * 0.06;
    return poly((t) => [x0 + Math.sin(t * 5 + ph) * a * (0.3 + t) + (t > 0.85 ? (t - 0.85) * 0.8 : 0), 0.95 - t * (0.7 + r() * 0.0 + j * 0.06)], 30, 0.016);
  })),
  // рябь: дуги-«чайки», двойные волны
  water: (r) => Array.from({ length: 6 }, (_, i) => {
    const out = [poly((t) => [0.15 + t * 0.7, 0.5 + Math.sin(t * Math.PI * (i % 3 ? 1 : 2)) * 0.12], 24, 0.02)];
    if (i % 2) out.push(poly((t) => [0.3 + t * 0.4, 0.68 + Math.sin(t * Math.PI) * 0.07], 16, 0.014));
    return out;
  }),
  // капли и короны брызг
  splash: (r) => Array.from({ length: 6 }, (_, i) => i % 2
    ? [poly((t) => { const a = t * Math.PI * 2; const k = Math.pow(Math.sin(a / 2), 1.5); return [0.5 + Math.sin(a) * 0.16 * k, 0.62 - Math.cos(a) * 0.22 * (0.5 + 0.5 * k) - 0.05]; }, 30, 0.018, () => 0.8)]
    : Array.from({ length: 4 }, (_, j) => { const a = -Math.PI / 2 + (j - 1.5) * 0.45; return seg([0.5 + Math.cos(a) * 0.1, 0.8 + Math.sin(a) * 0.1], [0.5 + Math.cos(a) * (0.32 + r() * 0.1), 0.8 + Math.sin(a) * (0.42 + r() * 0.1)], 0.018); })),
  // завитки дыма и пара
  smoke: (r) => Array.from({ length: 6 }, (_, i) => { const dir = i % 2 ? 1 : -1, ph = r() * 6; return [poly((t) => { const a = t * Math.PI * 3.2 + ph; const rr = 0.04 + 0.2 * (1 - t); return [0.5 + Math.cos(a) * rr * dir, 0.45 + Math.sin(a) * rr - t * 0.15]; }, 40, 0.016)]; }),
  // линии ауры: высокие языки, 2–3 рядом
  aura: (r) => Array.from({ length: 6 }, (_, i) => Array.from({ length: 2 + (i % 2) }, (_, j) => {
    const ph = r() * 6, x0 = 0.38 + j * 0.12;
    return poly((t) => [x0 + Math.sin(t * 4 + ph) * 0.06 * t, 0.96 - t * (0.85 - j * 0.12)], 30, 0.018, (t) => 0.3 + 0.7 * Math.sin(Math.PI * Math.min(1, t * 1.2)));
  })),
  // знаки для круга под ногами (руны из прямых, солнечный круг, завиток)
  runes: () => {
    const c = (cx, cy, rr, w = 0.02) => poly((t) => [cx + Math.cos(t * 6.283) * rr, cy + Math.sin(t * 6.283) * rr], 32, w, () => 0.8);
    return [
      [seg([0.5, 0.1], [0.5, 0.9]), seg([0.5, 0.3], [0.78, 0.12]), seg([0.5, 0.5], [0.78, 0.32])],
      [seg([0.5, 0.15], [0.5, 0.9]), seg([0.5, 0.15], [0.25, 0.4]), seg([0.5, 0.15], [0.75, 0.4])],
      [seg([0.25, 0.15], [0.75, 0.85]), seg([0.75, 0.15], [0.25, 0.85])],
      [seg([0.5, 0.1], [0.8, 0.5]), seg([0.8, 0.5], [0.5, 0.9]), seg([0.5, 0.9], [0.2, 0.5]), seg([0.2, 0.5], [0.5, 0.1])],
      [c(0.5, 0.5, 0.3), seg([0.5, 0.2], [0.5, 0.8]), seg([0.2, 0.5], [0.8, 0.5])],
      [seg([0.35, 0.1], [0.35, 0.9]), seg([0.35, 0.1], [0.7, 0.3]), seg([0.7, 0.3], [0.35, 0.5]), seg([0.35, 0.5], [0.7, 0.9])],
      [seg([0.5, 0.15], [0.85, 0.8]), seg([0.85, 0.8], [0.15, 0.8]), seg([0.15, 0.8], [0.5, 0.15]), c(0.5, 0.6, 0.05)],
      [poly((t) => { const a = t * Math.PI * 3; const rr = 0.04 + 0.3 * t; return [0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr]; }, 40, 0.02, () => 0.8)],
    ];
  },
  // наброски окружения: длинные линии с перелётом, иногда двойные, с петлёй на конце
  env: (r) => Array.from({ length: 6 }, (_, i) => {
    const bow = (r() - 0.5) * 0.25, y0 = 0.45 + r() * 0.1;
    const out = [poly((t) => [0.02 + t * 0.96, y0 + Math.sin(t * Math.PI) * bow], 30, 0.01, (t) => 0.2 + 0.8 * Math.sin(Math.PI * t))];
    if (i % 2) out.push(poly((t) => [0.12 + t * 0.8, y0 + 0.05 + Math.sin(t * Math.PI) * bow * 0.9], 26, 0.008));
    if (i % 3 === 0) out.push(poly((t) => { const a = t * 5.5; return [0.88 + Math.cos(a) * 0.05, y0 + Math.sin(a) * 0.05]; }, 20, 0.008));
    return out;
  }),
};
// Атласы: lib — почеркушки из loadScribbles(); пустой класс берётся процедурным.
export function elementHand(lib = {}, sampleAtlas) {
  const out = {};
  ELEMENT_CLASSES.forEach((c, i) => {
    const hand = !!lib[c]?.length; const samples = hand ? lib[c] : PROC[c](rng(11 + i * 7));
    const o = { fire: [0.8, 1.6], aura: [1.2, 2], env: [1.1, 1.8], smoke: [1.3, 2] }[c] ?? [1.6, 2.2];
    out[c] = { samples, hand, A: sampleAtlas(samples, { wK: o[0], minW: o[1] }) };
  });
  return out;
}
function handOf(style, c) { return style?.handEl?.[c]?.A ?? null; }

// Наклейка из атласа: клетка = образец, меняется шагами. flat — лежит на земле/воде, иначе к камере.
const ATLAS_VERT = /* glsl */`
uniform vec2 uSize; uniform vec3 uOff; uniform float uRot, uPush;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec2 q = position.xy; float c = cos(uRot), s = sin(uRot); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
#ifdef FLAT
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(uOff + vec3(q.x * uSize.x, 0., -q.y * uSize.y), 1.);
#else
  vec4 C = viewMatrix * modelMatrix * vec4(uOff, 1.);
  C.xyz += normalize(C.xyz) * uPush;
  C.xy += q * uSize;
  gl_Position = projectionMatrix * C;
#endif
}`;
const ATLAS_FRAG = /* glsl */`
uniform sampler2D tA; uniform vec3 uA; uniform float uCell, uOn; uniform vec3 cA;
varying vec2 vUv;
void main(){
  if (uOn < .5) discard;
  float i = mod(uCell, uA.z); float cl = mod(i, uA.x); float rw = floor(i / uA.x);
  vec2 uv = vec2((cl + vUv.x) / uA.x, 1. - (rw + 1. - vUv.y) / uA.y);
  if (texture2D(tA, uv).a < .4) discard;
  gl_FragColor = vec4(cA, .5);
}`;
function decal(A, color, { flat = false, w = 1, h = 1, push = 0 } = {}) {
  const U = { tA: { value: A.tex }, uA: { value: new THREE.Vector3(A.cols, A.rows, A.n) }, uCell: { value: 0 }, uOn: { value: 1 }, cA: { value: col(color) },
    uSize: { value: new THREE.Vector2(w, h) }, uOff: { value: new THREE.Vector3() }, uRot: { value: 0 }, uPush: { value: push } };
  const m = fxMesh(new THREE.ShaderMaterial({ uniforms: U, vertexShader: ATLAS_VERT, fragmentShader: ATLAS_FRAG, side: THREE.DoubleSide, defines: flat ? { FLAT: '' } : {} }), new THREE.PlaneGeometry(1, 1));
  m.renderOrder = 6; m.userData.U = U; return m;
}
const sd = (m, o) => { const U = m.userData.U; if (o.p) U.uOff.value.set(...o.p); if (o.cell != null) U.uCell.value = o.cell; if (o.rot != null) U.uRot.value = o.rot; if (o.w != null) U.uSize.value.set(o.w, o.h ?? o.w); if (o.on != null) U.uOn.value = o.on ? 1 : 0; if (o.c) U.cA.value.set(o.c); };
// звёздочка-блёстка (4 луча) и искра-штрих
function starTex() {
  return TEX.star ??= canvasTex((g, w, h) => {
    g.translate(w / 2, h / 2);
    const st = (k, c) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = (i % 2 ? .1 : .48) * w * k; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fillStyle = c; g.fill(); };
    st(1, '#2a1406'); st(.78, '#ffffff');
  });
}
function streakTex() {
  return TEX.streak ??= canvasTex((g, w, h) => {
    g.fillStyle = '#2a1406'; g.beginPath(); g.moveTo(w / 2, 2); g.lineTo(w / 2 + 5, h * .75); g.lineTo(w / 2, h - 2); g.lineTo(w / 2 - 5, h * .75); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2 + 3, h * .75); g.lineTo(w / 2, h - 6); g.lineTo(w / 2 - 3, h * .75); g.closePath(); g.fill();
  }, 32, 128);
}

// Аддитивное свечение без порчи альфы (Кувахара и защита линий остаются как были)
const ADD = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
// Ореол источника: две ступени света и лучи-чёрточки (как лампа в видео)
const HALO_FRAG = /* glsl */`
uniform float uStep, uAmt; uniform vec3 cA, cB; varying vec2 vP;
${GLSL_NOISE}
void main(){
  vec2 p = vP * 2.; float r = length(p); float a = atan(p.y, p.x);
  float e = (pfNoise(vec2(a * 5., uStep * .5)) - .5) * .12;
  vec3 c = vec3(0.);
  if (r + e < .5) c = cB; else if (r + e < .85) c = cA;
  float k = 44.; float sa = a * k / 6.2832; float ci = floor(sa); float fa = fract(sa);
  float s2 = floor(uStep * .5);
  float r0 = .45 + pfH11(ci * 3.1 + s2) * .3, len = .1 + pfH11(ci * 7.7 + s2) * .22;
  float ray = step(abs(fa - .5), .09) * step(r0, r) * step(r, r0 + len) * step(.4, pfH11(ci * 1.7 + floor(uStep / 3.)));
  c += cB * ray * 1.3;
  if (dot(c, c) < 1e-6) discard;
  gl_FragColor = vec4(c * uAmt, 0.);
}`;
// Пятно света на земле: ступени и радиальные мазки
const POOL_FRAG = /* glsl */`
uniform float uStep, uAmt; uniform vec3 cA, cB; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p); float a = atan(p.y, p.x);
  float e = (pfNoise(vec2(a * 4., uStep * .4)) - .5) * .16 + (pfNoise(vec2(a * 17., 2.)) - .5) * .06;
  float br = pfNoise(vec2(a * 9., r * 1.5)) ;
  vec3 c = r + e < .32 ? cB : r + e < .7 ? cA : vec3(0.);
  if (r + e > .7 && r + e < .95 && br > .62) c = cA * .6;                 // рваные мазки за краем
  c *= .75 + .5 * step(.5, br);
  if (dot(c, c) < 1e-6) discard;
  gl_FragColor = vec4(c * uAmt, 0.);
}`;
// Пена вокруг камня в воде: рваное кольцо с тушью и пунктир снаружи
const FOAMRING_FRAG = /* glsl */`
uniform float uStep; uniform vec3 cA, cInk; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = (vUv - .5) * 2.; p.x *= .8; float r = length(p); float a = atan(p.y, p.x);
  float e = (pfNoise(vec2(a * 6., uStep * .6)) - .5) * .14 + (pfNoise(vec2(a * 21., uStep * .3)) - .5) * .06;
  float d = r + e;
  vec3 c;
  if (d > .5 && d < .7) c = cA;
  else if (d >= .7 && d < .74) c = cInk;
  else if (abs(d - .86) < .022 && pfNoise(vec2(a * 9., uStep)) > .5) c = cA;
  else discard;
  gl_FragColor = vec4(c, .5);
}`;
// Расходящийся круг на воде пунктиром
const RINGLINE_FRAG = /* glsl */`
uniform float uStep, uT, uSeed; uniform vec3 cA; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  if (uT <= 0. || uT >= 1.) discard;
  vec2 p = (vUv - .5) * 2.; float r = length(p); float a = atan(p.y, p.x);
  float R = .15 + .8 * uT; float wdt = .05 * (1. - uT) + .012;
  if (abs(r - R + (pfNoise(vec2(a * 5., uSeed)) - .5) * .06) > wdt) discard;
  if (pfNoise(vec2(a * 7. + uSeed, uStep * .3)) < .25 + uT * .5) discard;
  gl_FragColor = vec4(cA, .5);
}`;
// Круг со знаками под ногами: текстура из образцов «Знаки», проявляется по кругу и поворачивается шагами
const SIGIL_FRAG = /* glsl */`
uniform sampler2D tS; uniform float uReveal, uRot, uStep; uniform vec3 cA, cInk; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = vUv - .5; float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  p += (pfH22(vec2(uStep, 2.)) - .5) * .004;
  float a = fract(atan(p.y, p.x) / 6.2832 + .25);
  if (a > uReveal) discard;
  vec4 t = texture2D(tS, p + .5);
  if (t.a < .4) discard;
  gl_FragColor = vec4(t.r > .5 ? cA : cInk, .5);
}`;
function flatMat(frag, U, add = false) {
  return new THREE.ShaderMaterial({ uniforms: U, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: frag, side: THREE.DoubleSide, ...(add ? ADD : {}) });
}
function flatQuad(frag, U, size, add = false) { const m = fxMesh(flatMat(frag, U, add), new THREE.PlaneGeometry(size, size)); m.rotation.x = -Math.PI / 2; return m; }

// ---------------------------------------------------------------- костёр
export class PaintedFire {
  constructor(style, opts = {}) {
    this.o = { size: 1, preset: 'hearth', smoke: true, embers: 9, light: true, logs: true, ...opts };
    this.style = style; this.clock = new StepClock(this.o.fps ?? 12); this.smokeClock = new StepClock(6);
    this.group = new THREE.Group(); this.group.userData.pfFire = true;
    const p = FIRE_PRESETS[this.o.preset] ?? FIRE_PRESETS.hearth; this.p = p;
    const S = this.o.size; const st = this.clock.u;
    // три языка: задний широкий тёмный, средний, передний узкий — объём без 3D
    this.flames = [
      fxMesh(flameMat(p, { step: st, seed: 1.3, w: 1.45 * S, h: 1.25 * S, off: [-.08 * S, 0, -.06 * S], wild: 1.1, coreH: .8 })),
      fxMesh(flameMat(p, { step: st, seed: 4.7, w: 1.25 * S, h: 1.55 * S, off: [.06 * S, 0, 0], wild: 1, coreH: .6 })),
      fxMesh(flameMat(p, { step: st, seed: 8.9, w: .8 * S, h: .95 * S, off: [-.03 * S, 0, .08 * S], wild: .9, coreH: .4, drops: .5 })),
    ];
    this.flames.forEach((f, i) => { f.renderOrder = 4 + i; this.group.add(f); });
    if (this.o.smoke) {
      this.smoke = fxMesh(puffMat(p.smoke, p.smokeHi, p.ink, { step: this.smokeClock.u, seed: 2.2, w: .8 * S, h: 1.4 * S, off: [0, 1.05 * S, -.1 * S], n: 4, speed: 4, spread: .6 }));
      this.group.add(this.smoke);
    }
    this.embers = [];
    for (let i = 0; i < this.o.embers; i++) {
      const s = protSprite(sparkTex(), i % 3 ? p.core : p.hot); s.userData.ph = Math.random(); s.userData.a = Math.random() * 6.28;
      this.group.add(s); this.embers.push(s);
    }
    if (this.o.light) {
      this.light = new THREE.PointLight(p.light, 14 * S, 9 * S, 1.6); this.light.position.set(0, .55 * S, 0); this.group.add(this.light);
      this.baseI = this.light.intensity;
    }
    if (this.o.logs && style) this.addLogs(S);
    // --- рисованные слои поверх языков ---
    const add = (m) => { this.group.add(m); return m; };
    // ореол за огнём (ступени + лучи-чёрточки) и пятно света на земле
    this.haloU = { uSize: { value: new THREE.Vector2(2.2 * S, 2.2 * S) }, uOff: { value: new THREE.Vector3(0, .62 * S, 0) }, uPush: { value: .35 * S }, uStep: st, uAmt: { value: 1 },
      cA: { value: col(p.out).multiplyScalar(.07) }, cB: { value: col(p.mid).multiplyScalar(.16) } };
    this.halo = add(fxMesh(new THREE.ShaderMaterial({ uniforms: this.haloU, vertexShader: BB_FULL_VERT, fragmentShader: HALO_FRAG, side: THREE.DoubleSide, ...ADD }), new THREE.PlaneGeometry(1, 1)));
    this.halo.renderOrder = 2;
    this.poolU = { uStep: st, uAmt: { value: 1 }, cA: { value: col(p.out).multiplyScalar(.16) }, cB: { value: col(p.mid).multiplyScalar(.24) } };
    this.pool = add(flatQuad(POOL_FRAG, this.poolU, 4.2 * S, true)); this.pool.position.y = .015; this.pool.renderOrder = 1;
    // угли под шалашом: мерцают тонами огня
    this.coals = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.045 * S * (0.7 + (i % 3) * .3)), new THREE.MeshBasicMaterial({ color: p.core }));
      const a = i * 2.4, r = (.05 + (i % 4) * .05) * S; m.position.set(Math.cos(a) * r, .02 * S, Math.sin(a) * r); m.scale.y = .6; m.userData.pfSkip = true;
      add(m); this.coals.push(m);
    }
    // линии внутри языков: тёмные и светлые, из почеркушек «Огонь»
    const FA = handOf(style, 'fire');
    this.lines = FA ? [[p.ink, .62, .95, -.12], [p.hot, .5, .75, -.2], [p.ink, .5, .8, -.16]].map(([c, w, h, push], i) => {
      const m = add(decal(FA, c, { w: w * S, h: h * S, push: push * S })); m.userData.base = [(i - 1) * .06 * S, (h * .5 + .04) * S, 0]; sd(m, { p: m.userData.base }); m.renderOrder = 8; return m;
    }) : [];
    // жар над огнём: завитки «Дым и пар» тёплым светлым
    const SA = handOf(style, 'smoke');
    this.heat = SA ? Array.from({ length: 3 }, (_, i) => { const m = add(decal(SA, i % 2 ? p.core : p.mid, { w: .32 * S, h: .32 * S })); m.userData.ph = i / 3; return m; }) : [];
    this.curls = SA && this.o.smoke ? Array.from({ length: 2 }, (_, i) => { const m = add(decal(SA, p.ink, { w: .5 * S, h: .5 * S, push: -.05 })); m.userData.ph = i / 2; return m; }) : [];
    // искры-штрихи и звёздочки
    this.streaks = Array.from({ length: 8 }, () => { const s = protSprite(streakTex(), p.hot); s.userData.ph = Math.random(); this.group.add(s); return s; });
    this.stars = Array.from({ length: 4 }, () => { const s = protSprite(starTex(), p.hot); s.visible = false; this.group.add(s); return s; });
  }
  addLogs(S) {
    const wood = style2(this.style, '#5a3a22'); const stone = style2(this.style, '#6e6a62');
    for (let i = 0; i < 4; i++) {
      const g = new THREE.CylinderGeometry(.06 * S, .075 * S, .75 * S, 7); const m = new THREE.Mesh(g, wood);
      const a = i * Math.PI / 2 + .4;
      // бревно опирается на землю нижним концом и сходится к центру шалашом
      const foot = new THREE.Vector3(Math.cos(a) * .34 * S, .04 * S, Math.sin(a) * .34 * S), top = new THREE.Vector3(Math.cos(a) * .04 * S, .5 * S, Math.sin(a) * .04 * S);
      m.position.copy(foot).add(top).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
      m.scale.y = top.distanceTo(foot) / (.75 * S);
      m.castShadow = true; this.group.add(m);
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.1 * S * (0.8 + (i % 3) * .15)), stone);
      m.position.set(Math.cos(a) * .48 * S, .05 * S, Math.sin(a) * .48 * S); m.rotation.set(i, i * 2, 0); m.scale.y = .7; this.group.add(m);
    }
  }
  setPreset(k) {
    const p = FIRE_PRESETS[k]; if (!p) return; this.p = p;
    for (const f of this.flames) { const U = f.material.uniforms; U.cOut.value.set(p.out); U.cMid.value.set(p.mid); U.cCore.value.set(p.core); U.cHot.value.set(p.hot); U.cInk.value.set(p.ink); }
    if (this.smoke) { const U = this.smoke.material.uniforms; U.cA.value.set(p.smoke); U.cB.value.set(p.smokeHi); U.cInk.value.set(p.ink); }
    this.embers.forEach((s, i) => s.material.color.set(i % 3 ? p.core : p.hot));
    if (this.light) this.light.color.set(p.light);
    this.haloU.cA.value.set(p.out).multiplyScalar(.07); this.haloU.cB.value.set(p.mid).multiplyScalar(.16);
    this.poolU.cA.value.set(p.out).multiplyScalar(.16); this.poolU.cB.value.set(p.mid).multiplyScalar(.24);
    this.lines.forEach((m, i) => sd(m, { c: i === 1 ? p.hot : p.ink }));
    this.heat.forEach((m, i) => sd(m, { c: i % 2 ? p.core : p.mid })); this.curls.forEach((m) => sd(m, { c: p.ink }));
    for (const s of [...this.streaks, ...this.stars]) s.material.color.set(p.hot);
  }
  set amount(v) { for (const f of this.flames) f.material.uniforms.uAmt.value = v; if (this.smoke) this.smoke.material.uniforms.uAmt.value = Math.min(1, v); }
  update(dt) {
    const nw = this.clock.tick(dt); this.smokeClock.tick(dt);
    const S = this.o.size;
    if (nw) {
      const st = this.clock.u.value;
      if (this.light) this.light.intensity = this.baseI * (0.8 + 0.4 * hash(st * 1.7));
      for (const s of this.embers) {
        const life = (this.clock.t * 0.45 + s.userData.ph) % 1;
        if (life < 0.1) { s.userData.a = Math.random() * 6.28; s.userData.r = Math.random() * .25; }
        const a = s.userData.a + life * 2.5; const r = (s.userData.r ?? .1) * S + life * .25 * S;
        s.position.set(Math.cos(a) * r, (.35 + life * 2.1) * S, Math.sin(a) * r);
        s.scale.set(.05 * S * (1 - life * .6), .09 * S * (1 - life * .6), 1);
        s.material.rotation = (hash(st + a) - .5) * 1.2;
        s.visible = life < 0.9 && hash(st * 3.1 + a) > .15;
      }
      const fl = 0.85 + 0.3 * hash(st * 2.3);
      this.haloU.uAmt.value = fl; this.poolU.uAmt.value = fl;
      const P = this.p, tones = [P.hot, P.core, P.mid, P.out];
      this.coals.forEach((m, i) => m.material.color.set(tones[Math.floor(hash(st * .5 + i * 3.7) * 3.2)]));
      // линии в языках сменяются каждые 2 шага, чуть дрожат
      this.lines.forEach((m, i) => { const b = m.userData.base; sd(m, { cell: Math.floor(st / 2) * 3 + i * 5, p: [b[0] + (hash(st + i) - .5) * .04 * S, b[1], b[2]], rot: (hash(st * 1.3 + i) - .5) * .12 }); });
      this.heat.forEach((m, i) => { const life = (this.clock.t * .5 + m.userData.ph) % 1; sd(m, { p: [(hash(i * 9 + Math.floor(this.clock.t * .5 + m.userData.ph)) - .5) * .4 * S, (1.35 + life * .8) * S, 0], cell: st + i * 3, rot: (hash(st + i) - .5) * .6, w: .34 * S * (1 - life * .4), on: life < .8 }); });
      this.curls.forEach((m, i) => { const life = (this.smokeClock.t * .18 + m.userData.ph) % 1; sd(m, { p: [(i - .5) * .25 * S, (1.6 + life * 1.1) * S, 0], cell: Math.floor(this.smokeClock.t * 2) + i * 2, on: life < .75 }); });
      for (const s of this.streaks) {
        const life = (this.clock.t * .7 + s.userData.ph) % 1;
        if (life < .1 || !s.userData.v) s.userData.v = [(Math.random() - .5) * 1.4, 2 + Math.random() * 1.5, (Math.random() - .5) * .6];
        const v = s.userData.v, t = life * .9;
        s.position.set(v[0] * t * S, (.4 + v[1] * t - 1.6 * t * t) * S, v[2] * t * S);
        const vy = v[1] - 3.2 * t; s.material.rotation = Math.atan2(-v[0], vy);
        s.scale.set(.025 * S, .16 * S * (1 - life * .5), 1); s.visible = life < .85;
      }
      for (const s of this.stars) {
        if (s.visible && hash(st * 7.1 + s.id) < .55) { s.visible = false; continue; }
        if (!s.visible && hash(st * 3.3 + s.id) > .82) { s.visible = true; s.position.set((hash(st + s.id) - .5) * .7 * S, (.5 + hash(st * 2 + s.id) * 1.1) * S, .1 * S); const k = (.06 + hash(st * 5 + s.id) * .07) * S; s.scale.set(k, k, 1); }
      }
    }
  }
}
function style2(style, c) { return style ? style.material({ color: c, rimScale: 0, strokeScale: .4 }) : new THREE.MeshStandardMaterial({ color: c }); }
function hash(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------------------------------------------------------------- аура персонажа
// Аура рисуется по экранному силуэту: персонаж отдельно рендерится белой маской (1/2 разрешения),
// плоскость за его спиной ищет расстояние до силуэта в 40 точках. Сэмплы сдвинуты шумом вниз —
// поэтому языки тянутся вверх; шум меняется шагами. Расстояние режется на кольца тонов:
// ядро у тела → середина → край → тушь. Тело всегда перед плоскостью, ауру видно только вокруг.
const AURA_FRAG = /* glsl */`
uniform sampler2D tMask; uniform vec2 uRes; uniform float uStep, uSeed, uAmt, uW, uLift;
uniform vec3 cCore, cMid, cEdge, cInk;
varying vec2 vP;
${GLSL_NOISE}
float m(vec2 px){ return texture2D(tMask, px / uRes).r; }
void main(){
  if (uAmt < .01) discard;
  vec2 fc = gl_FragCoord.xy;
  if (m(fc) > .5) discard;
  float st = uStep;
  float W = uW * uAmt;                                         // ширина ауры, px
  vec2 q = fc / max(uW, 1.);
  // языки: точку опускаем на величину шума — силуэт «вытягивается» вверх
  float n1 = pfNoise(vec2(q.x * 2.3 + uSeed, q.y * .9 - st * .55));
  float n2 = pfNoise(vec2(q.x * 5.1 - uSeed, q.y * 2.1 - st * .9));
  float tong = smoothstep(.42, .95, n1) * 1.2 + n2 * .15;     // редкие длинные языки, между ними — короткие
  vec2 o = vec2((n2 - .5) * W * .3, -tong * uLift * uAmt);
  vec2 p = fc + o;
  // ближайший силуэт: 5 колец × 8 направлений
  float d = 99.;
  for (int r = 1; r <= 5; r++) {
    float rr = float(r) / 5. * W;
    for (int k = 0; k < 8; k++) {
      float a = float(k) * .785398 + float(r) * .4;
      if (m(p + vec2(cos(a), sin(a)) * rr) > .5) d = min(d, rr);
    }
  }
  if (m(p) > .5) d = 0.;
  float t = d / max(W, 1.);
  t += (pfNoise(fc * .08 + st * 1.3) - .5) * .12;              // рваная граница тонов
  if (t > 1.) discard;
  vec3 c = t < .16 ? cCore : t < .44 ? cMid : t < .86 ? cEdge : cInk;
  // штриховка по краю и светлые процарапы по середине — как карандаш поверх заливки
  if (t >= .44 && t < .86 && fract((fc.x + fc.y) * .09) > .78 && pfNoise(fc * .02 + st * .9) > .4) c = cInk;
  if (t >= .16 && t < .44 && fract((fc.x - fc.y * .4) * .07) > .9 && pfNoise(fc * .03 - st * .7) > .5) c = cCore;
  gl_FragColor = vec4(c, .5);
}`;
// Ударное кольцо по земле.
const RING_FRAG = /* glsl */`
uniform float uStep, uT, uR; uniform vec3 cA, cB, cInk;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = (vUv - .5) * 2.; float r = length(p) * uR; float a = atan(p.y, p.x);
  float t = uT; if (t <= 0. || t >= 1.) discard;
  float R = uR * .95 * (1. - pow(1. - t, 3.));
  float wdt = .22 * (1. - t) + .03;
  float e = (pfNoise(vec2(a * 6., uStep * .5)) - .5) * .12 + (pfNoise(vec2(a * 23., 3.)) - .5) * .05;
  float d = (r - R + e) / wdt;                     // 0 = фронт, <0 внутри
  if (d > 0. || d < -1.) discard;
  // зазубренные «осколки» за фронтом
  float shard = step(.45 + t * .4, pfNoise(vec2(a * 14., floor(uStep * .5))));
  if (d < -.55 && shard < .5) discard;
  vec3 c = d > -.18 ? cA : cB;
  if (d > -.06) c = cInk;
  gl_FragColor = vec4(c, .5);
}`;
// Вспышка-звезда за спиной в момент активации.
const BURST_FRAG = /* glsl */`
uniform float uStep, uT; uniform vec3 cA, cB, cInk;
varying vec2 vP;
${GLSL_NOISE}
void main(){
  if (uT <= 0. || uT >= 1.) discard;
  vec2 p = vP * 2.; float r = length(p); float a = atan(p.y, p.x);
  float k = 14.; float sa = a * k / 6.2832;
  float ci = floor(sa + .5); float fa = abs(sa - ci) * 2.;
  float len = .45 + .55 * pfH11(ci * 7.3 + floor(uStep * .5));
  float grow = smoothstep(0., .25, uT) * (1. - smoothstep(.55, 1., uT));
  float spike = (1. - fa) * len * grow - r * .95;
  float core = (.32 * grow - r);
  float f = max(spike, core);
  // линии-удары (как в манге): тонкие радиальные штрихи за лучами
  float sb = a * 70. / 6.2832; float cb = floor(sb); float fb = fract(sb); float s2 = floor(uStep * .5);
  float r0 = .55 + pfH11(cb * 5.3 + s2) * .25, l0 = .12 + pfH11(cb * 2.1 + s2) * .3;
  float sl = step(abs(fb - .5), .04 + .08 * clamp(1. - (r - r0) / max(l0, .01), 0., 1.)) * step(r0, r) * step(r, r0 + l0) * step(.45, pfH11(cb * 9.1 + s2)) * step(uT, .8);
  if (f <= 0. && sl > .5) { gl_FragColor = vec4(mod(cb, 3.) < .5 ? cA : cInk, .5); return; }
  if (f <= 0.) discard;
  vec3 c = f > .12 ? cA : cB;
  if (f < .03) c = cInk;
  gl_FragColor = vec4(c, .5);
}`;
// Взлетающие штрихи вокруг персонажа.
const STREAK_FRAG = /* glsl */`
uniform float uStep, uSeed, uAmt; uniform vec3 cA, cInk;
varying vec2 vP;
${GLSL_NOISE}
void main(){
  float y = vP.y; float x = vP.x * 2.;
  float ph = fract(uStep * .045 + uSeed);
  float y0 = ph * 1.4 - .4, y1 = y0 + .25 + .25 * pfH11(uSeed * 9.);
  float tap = smoothstep(y0, y0 + .08, y) * (1. - smoothstep(y1 - .12, y1, y));
  float wob = (pfNoise(vec2(y * 5., uSeed * 4. + floor(uStep * .5))) - .5) * .4;
  float d = abs(x - wob) - tap * .55;
  if (d > 0. || uAmt < .05 || tap < .05) discard;
  gl_FragColor = vec4(d > -.15 ? cInk : cA, .5);
}`;

// Текстура круга: два кольца, засечки, 8 знаков по кругу, внутреннее кольцо с точками.
// Белое — цвет ауры, тёмное — тушь (обводка под линиями для читаемости).
function sigilTex(samples, N = 512) {
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.translate(N / 2, N / 2); g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (fn) => { g.strokeStyle = '#141414'; g.lineWidth = 9; fn(); g.strokeStyle = '#ffffff'; g.lineWidth = 4; fn(); };
  const circ = (r) => { g.beginPath(); for (let i = 0; i <= 90; i++) { const a = i / 90 * 6.2832; const rr = r * (1 + Math.sin(a * 7) * .006); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); };
  pass(() => { circ(N * .47); circ(N * .41); circ(N * .19); });
  pass(() => { for (let i = 0; i < 48; i++) { const a = i / 48 * 6.2832, l = i % 6 ? .02 : .045; g.beginPath(); g.moveTo(Math.cos(a) * N * .41, Math.sin(a) * N * .41); g.lineTo(Math.cos(a) * N * (.41 + l), Math.sin(a) * N * (.41 + l)); g.stroke(); } });
  const S = samples.length ? samples : PROC.runes();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * 6.2832; const sm = S[i % S.length];
    g.save(); g.rotate(a + Math.PI / 2); g.translate(0, -N * .3); const sc = N * .13;
    pass(() => { for (const st of sm) { g.beginPath(); st.p.forEach((q, j) => { const x = (q[0] - .5) * sc, y = (q[1] - .5) * sc; j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); } });
    g.restore();
  }
  pass(() => { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; g.beginPath(); g.arc(Math.cos(a) * N * .14, Math.sin(a) * N * .14, 3, 0, 6.2832); g.stroke(); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}

export class PaintedAura {
  // root — персонаж (Object3D с SkinnedMesh), h — рост, м
  constructor(style, root, opts = {}) {
    this.o = { preset: 'grace', h: 1.8, streaks: 10, particles: 14, fps: 10, ...opts };
    this.root = root; this.style = style;
    this.clock = new StepClock(this.o.fps); const st = this.clock.u;
    this.p = { ...(AURA_PRESETS[this.o.preset] ?? AURA_PRESETS.grace), ...(opts.colors ?? {}) };
    const k = this.o.h / 1.8; this.k = k;
    this.amt = 0; this.state = 'off'; this.t = 0; this.burstT = 0;
    // маска силуэта: только меши персонажа на своём слое
    this.maskLayer = opts.maskLayer ?? (6 + (PaintedAura.n = ((PaintedAura.n ?? -1) + 1) % 20));
    root.traverse((m) => { if (m.isMesh && !m.userData.pfSkip && !m.userData.pfOutline) m.layers.enable(this.maskLayer); });
    this.mask = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
    this.maskMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.auraU = { tMask: { value: this.mask.texture }, uRes: { value: new THREE.Vector2(4, 4) }, uStep: st, uSeed: { value: Math.random() * 9 }, uAmt: { value: 0 },
      uW: { value: 20 }, uLift: { value: 30 }, uSize: { value: new THREE.Vector2(2.8 * k, 3.2 * k) }, uOff: { value: new THREE.Vector3(0, 1.25 * k, 0) }, uPush: { value: .55 * k },
      cCore: { value: col(this.p.core) }, cMid: { value: col(this.p.mid) }, cEdge: { value: col(this.p.edge) }, cInk: { value: col(this.p.ink) } };
    this.sheet = fxMesh(new THREE.ShaderMaterial({ uniforms: this.auraU, vertexShader: BB_FULL_VERT, fragmentShader: AURA_FRAG, side: THREE.DoubleSide }), new THREE.PlaneGeometry(1, 1));
    this.sheet.renderOrder = -2; this.sheet.visible = false;
    // земля, вспышка, штрихи, частицы, свет — в группе у ног (группа кладётся в сцену рядом с персонажем)
    this.group = new THREE.Group(); this.group.userData.pfAura = true;
    const ringU = { uStep: st, uT: { value: 0 }, uR: { value: 2.4 * k }, cA: { value: col(this.p.mid) }, cB: { value: col(this.p.edge) }, cInk: { value: col(this.p.ink) } };
    this.ring = fxMesh(new THREE.ShaderMaterial({ uniforms: ringU, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: RING_FRAG, side: THREE.DoubleSide }),
      new THREE.PlaneGeometry(4.8 * k, 4.8 * k));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.02; this.group.add(this.ring);
    this.burst = fxMesh(new THREE.ShaderMaterial({
      uniforms: { uSize: { value: new THREE.Vector2(3.2 * k, 3.2 * k) }, uOff: { value: new THREE.Vector3(0, 1.05 * k, 0) }, uPush: { value: .7 * k }, uStep: st, uT: { value: 0 },
        cA: { value: col(this.p.burst) }, cB: { value: col(this.p.mid) }, cInk: { value: col(this.p.ink) } },
      vertexShader: BB_FULL_VERT, fragmentShader: BURST_FRAG, side: THREE.DoubleSide,
    }), new THREE.PlaneGeometry(1, 1));
    this.burst.renderOrder = -5; this.group.add(this.burst, this.sheet);
    this.streaks = [];
    for (let i = 0; i < this.o.streaks; i++) {
      const a = i / this.o.streaks * Math.PI * 2 + Math.random() * .4; const r = (.38 + Math.random() * .22) * k;
      const m = fxMesh(new THREE.ShaderMaterial({
        uniforms: { uSize: { value: new THREE.Vector2(.07 * k, 2.3 * k) }, uOff: { value: new THREE.Vector3(Math.cos(a) * r, .05, Math.sin(a) * r) }, uStep: st, uSeed: { value: Math.random() },
          uAmt: { value: 0 }, cA: { value: col(i % 2 ? this.p.core : this.p.mid) }, cInk: { value: col(this.p.edge) } },
        vertexShader: BB_VERT, fragmentShader: STREAK_FRAG, side: THREE.DoubleSide,
      }));
      this.group.add(m); this.streaks.push(m);
    }
    this.parts = [];
    const tex = this.p.particles === 'leaf' ? leafTex() : sparkTex();
    for (let i = 0; i < this.o.particles; i++) {
      const s = protSprite(tex, this.p.particles === 'leaf' ? (i % 2 ? this.p.mid : this.p.edge) : (i % 3 ? this.p.mid : this.p.core));
      s.userData.ph = Math.random(); s.userData.a = Math.random() * 6.28; s.visible = false; this.group.add(s); this.parts.push(s);
    }
    this.light = new THREE.PointLight(this.p.light, 0, 6 * k, 1.5); this.light.position.set(0, 1.0 * k, .3 * k); this.group.add(this.light);
    // круг со знаками под ногами, рисованные языки ауры, у Лешего завитки
    this.sigilU = { tS: { value: sigilTex(style?.handEl?.runes?.samples ?? PROC.runes()) }, uReveal: { value: 0 }, uRot: { value: 0 }, uStep: st, cA: { value: col(this.p.mid) }, cInk: { value: col(this.p.ink) } };
    this.sigil = flatQuad(SIGIL_FRAG, this.sigilU, 2.1 * k); this.sigil.position.y = .025; this.sigil.renderOrder = 1; this.group.add(this.sigil); this.reveal = 0;
    const AA = handOf(style, 'aura');
    this.hlines = AA ? Array.from({ length: 9 }, (_, i) => { const m = decal(AA, i % 3 ? this.p.mid : this.p.core, { w: .42 * k, h: .75 * k, push: .35 * k }); m.userData.ph = i / 9; m.userData.a = i / 9 * 6.283; this.group.add(m); return m; }) : [];
    const SA = handOf(style, 'smoke');
    this.curls = SA && this.p.particles === 'leaf' ? Array.from({ length: 5 }, (_, i) => { const m = decal(SA, i % 2 ? this.p.mid : this.p.core, { w: .34 * k, h: .34 * k, push: .2 * k }); m.userData.ph = i / 5; this.group.add(m); return m; }) : [];
    this.follow = root;
  }
  // Включить: собирается (0,3 с), вспышка и ударное кольцо, потом держится.
  activate() { if (this.state === 'on' || this.state === 'charge') return; this.state = 'charge'; this.t = 0; this.onChange?.(true); }
  deactivate() { if (this.state === 'off' || this.state === 'release') return; this.state = 'release'; this.t = 0; this.onChange?.(false); }
  toggle() { (this.state === 'on' || this.state === 'charge') ? this.deactivate() : this.activate(); }
  get active() { return this.state === 'on' || this.state === 'charge'; }
  update(dt) {
    const nw = this.clock.tick(dt); this.t += dt;
    const k = this.k;
    // кривая силы: сбор → удар с перелётом → ровно → гаснет
    let a = this.amt;
    if (this.state === 'charge') { a = Math.min(.35, this.t / .3 * .35); if (this.t >= .3) { this.state = 'on'; this.t = 0; this.burstT = 0.0001; } }
    else if (this.state === 'on') { const b = Math.max(0, 1 - this.t / .5); a = 1 + .7 * b * b; }
    else if (this.state === 'release') { a = Math.max(0, 1 - this.t / .45); if (a <= 0) this.state = 'off'; }
    else a = 0;
    // сила меняется только на шаге — как рисованные фазы
    if (nw || this.state === 'off') this.amt = Math.round(a * 8) / 8;
    if (this.burstT > 0) { this.burstT += dt / .7; if (this.burstT >= 1) this.burstT = 0; }
    const st = this.clock.u.value;
    this.auraU.uAmt.value = this.amt * (0.92 + 0.16 * hash(st * 1.3));
    this.sheet.visible = this.amt > 0;
    // группа у ног персонажа
    this.follow.getWorldPosition(this.group.position);
    if (this.group.parent) this.group.parent.worldToLocal(this.group.position);
    const qT = Math.floor(this.burstT * 10) / 10;
    this.ring.material.uniforms.uT.value = qT; this.burst.material.uniforms.uT.value = qT;
    const on = Math.min(1, this.amt);
    for (const m of this.streaks) m.material.uniforms.uAmt.value = on;
    this.light.intensity = (this.amt * 9 + (this.burstT > 0 ? 25 * (1 - this.burstT) : 0)) * k * (nw || true ? 0.9 + 0.2 * hash(st) : 1);
    if (nw) {
      const leaf = this.p.particles === 'leaf';
      for (const s of this.parts) {
        const life = (this.clock.t * (leaf ? .3 : .5) + s.userData.ph) % 1;
        if (life < .08) { s.userData.a = Math.random() * 6.28; s.userData.r = (.35 + Math.random() * .35) * k; }
        const ang = s.userData.a + life * (leaf ? 4.5 : 1.5); const r = (s.userData.r ?? .5 * k) * (1 + life * (leaf ? .6 : .2));
        s.position.set(Math.cos(ang) * r, (.1 + life * (leaf ? 2.4 : 2.1)) * k, Math.sin(ang) * r);
        const sz = (leaf ? .12 : .06) * k * (1 - life * .5);
        s.scale.set(sz, leaf ? sz : sz * 1.9, 1);
        s.material.rotation = leaf ? ang * 2 + life * 6 : (hash(st + ang) - .5) * .8;
        s.visible = on > .1 && life < .92;
      }
      this.hlines.forEach((m, i) => { const d = m.userData; const life = (this.clock.t * .55 + d.ph) % 1; const a = d.a + life * .6; const r = .45 * k;
        sd(m, { p: [Math.cos(a) * r, (.15 + life * 1.7) * k, Math.sin(a) * r], cell: st + i * 2, rot: (hash(st + i) - .5) * .25, on: on > .1 && life < .85 }); });
      this.curls.forEach((m, i) => { const d = m.userData; const life = (this.clock.t * .3 + d.ph) % 1; const a = d.ph * 6.283 + life * 3;
        sd(m, { p: [Math.cos(a) * .55 * k, (.3 + life * 2) * k, Math.sin(a) * .55 * k], cell: Math.floor(st / 2) + i, rot: life * 3, on: on > .1 && life < .9 }); });
      this.sigilU.uRot.value += .045;
    }
    // круг проявляется по ходу часовой стрелки шагами, гаснет обратно
    this.reveal = Math.max(0, Math.min(1, this.reveal + dt * (this.amt > 0 && this.state !== 'release' ? 1.6 : -2.2)));
    this.sigilU.uReveal.value = Math.ceil(this.reveal * 16) / 16 * (this.reveal > 0 ? 1 : 0);
    this.sigil.visible = this.reveal > 0;
  }
  // Маска силуэта: вызывать перед кадром (renderer, scene, camera). Ширина ауры в пикселях — по росту на экране.
  renderMask(renderer, scene, camera) {
    if (!this.sheet.visible) return;
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(4, Math.round(s.x / 2)), h = Math.max(4, Math.round(s.y / 2));
    if (this.mask.width !== w || this.mask.height !== h) this.mask.setSize(w, h);
    this.auraU.uRes.value.set(s.x, s.y);
    // метры → пиксели у персонажа
    const c = new THREE.Vector3(); this.follow.getWorldPosition(c); c.y += this.o.h * .5;
    const dist = c.distanceTo(camera.position);
    const pxPerM = s.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * dist);
    this.auraU.uW.value = this.p.push * 1.6 * this.o.h / 1.8 * pxPerM;
    this.auraU.uLift.value = this.p.lift * this.o.h / 1.8 * pxPerM;
    const keep = { bg: scene.background, fog: scene.fog, ov: scene.overrideMaterial, rt: renderer.getRenderTarget(), mask: camera.layers.mask, cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), tm: renderer.toneMapping };
    scene.background = null; scene.fog = null; scene.overrideMaterial = this.maskMat; camera.layers.set(this.maskLayer); renderer.toneMapping = THREE.NoToneMapping;
    const sh = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.mask); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, false);
    renderer.render(scene, camera); renderer.shadowMap.autoUpdate = sh;
    scene.background = keep.bg; scene.fog = keep.fog; scene.overrideMaterial = keep.ov; camera.layers.mask = keep.mask; renderer.toneMapping = keep.tm;
    renderer.setRenderTarget(keep.rt); renderer.setClearColor(keep.cc, keep.ca);
  }
  dispose() {
    this.root.traverse((m) => m.layers?.disable(this.maskLayer));
    this.mask.dispose(); this.group.parent?.remove(this.group);
  }
}

// ---------------------------------------------------------------- река
const RIVER_VERT = /* glsl */`
uniform float uStep;
varying vec2 vUv; varying vec3 vW;
${GLSL_NOISE}
void main(){
  vUv = uv; vec3 p = position;
  p.z += (pfNoise(vec2(uv.x * 9. - uStep * .5, uv.y * 3.)) - .5) * .03;
  vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const RIVER_FRAG = /* glsl */`
uniform float uStep, uFlow, uLen, uWid; uniform vec3 cDeep, cMid, cShallow, cFoam, cSky, cInk, cGlint, uLight;
uniform vec4 uK;   // x: пена, y: мазки течения, z: блики, w: тушь берега
varying vec2 vUv; varying vec3 vW;
${GLSL_NOISE}
void main(){
  float st = uStep;
  vec2 m = vec2(vUv.x * uLen, vUv.y * uWid);               // метры: x вдоль течения
  float flow = st * uFlow / 6.;                              // течение шагами
  // берег рваный: расстояние до кромки с шумом
  float bankN = (pfNoise(vec2(m.x * .9, vUv.y > .5 ? 3. : 9.)) - .5) * .5 + (pfNoise(vec2(m.x * 3.7, vUv.y > .5 ? 1. : 5.)) - .5) * .18;
  float e = min(vUv.y, 1. - vUv.y) * uWid + bankN;            // м от берега
  if (e < 0.) discard;
  // полосы глубины
  float depth = e + (pfNoise(m * .7 - vec2(flow * .3, 0.)) - .5) * .5;
  vec3 c = depth > 1.0 ? cDeep : depth > .45 ? cMid : cShallow;
  // небо в воде: широкие мазки по течению
  vec2 sq = vec2(m.x * .45 - flow * .6, m.y * 2.4);
  float sky = smoothstep(.58, .64, pfNoise(sq + floor(sq.y) * 3.1));
  c = mix(c, cSky, sky * .55);
  // мазки течения: вытянутые штрихи, бегут шагами
  vec2 fq = vec2(m.x * 1.6 - flow * 2.2, m.y * 6.);
  float row = floor(fq.y);
  float dash = smoothstep(.6, .7, pfNoise(vec2(fq.x * .7 + row * 5.3, row))) * (1. - smoothstep(.12, .38, abs(fract(fq.y) - .5)));
  c = mix(c, mix(cShallow, cSky, .5), dash * .8 * uK.y);
  // отражение источника: столб из коротких бликов к зрителю
  vec3 V = normalize(vW - cameraPosition);
  vec2 wob = (vec2(pfNoise(m * 2. + st * .7), pfNoise(m * 2. + 5. + st * .7)) - .5) * .35;
  vec3 N = normalize(vec3(wob.x, 1., wob.y));
  float spec = pow(max(dot(reflect(V, N), normalize(uLight - vW)), 0.), 22.);
  vec2 gq = vec2(m.x * 3. - flow * 1.5, m.y * 9.);
  float gr = floor(gq.y);
  float gd = smoothstep(.45, .55, pfNoise(vec2(gq.x * .8 + gr * 3.1, gr + st * .37)));
  float glint = step(.25, spec * gd) * uK.z;
  // пена у берега и вокруг камней: рваная полоса, обведённая тушью
  float fn = pfNoise(vec2(m.x * 2.4 - flow * 1.2, e * 4. + st * .2));
  float foamW = .16 + fn * .22;
  float foam = step(e, foamW) * uK.x;
  float foamDash = step(e, foamW + .2) * step(.68, pfNoise(vec2(m.x * 5. - flow * 3., e * 9.))) * uK.x;
  float a = 1.;
  if (glint > .5) { c = cGlint; a = .5; }
  if (foamDash > .5) { c = mix(cFoam, cSky, .3); a = .5; }
  if (foam > .5) { c = cFoam; a = .5; if (abs(e - foamW) < .035) c = cInk * 1.6; }
  if (e < .045 * uK.w) { c = cInk; a = .5; }
  gl_FragColor = vec4(c, a);
}`;
export class PaintedRiver {
  constructor(style, opts = {}) {
    this.o = { length: 24, width: 3.2, flow: 1, preset: 'stream', light: [0, 6, -20], ...opts };
    this.clock = new StepClock(this.o.fps ?? 8);
    const p = WATER_PRESETS[this.o.preset] ?? WATER_PRESETS.stream;
    this.uniforms = {
      uStep: this.clock.u, uFlow: { value: this.o.flow }, uLen: { value: this.o.length }, uWid: { value: this.o.width },
      cDeep: { value: col(p.deep) }, cMid: { value: col(p.mid) }, cShallow: { value: col(p.shallow) }, cFoam: { value: col(p.foam) },
      cSky: { value: col(p.sky) }, cInk: { value: col(p.ink) }, cGlint: { value: col(p.glint) },
      uLight: { value: new THREE.Vector3(...this.o.light) }, uK: { value: new THREE.Vector4(1, 1, 1, 1) },
    };
    const g = new THREE.PlaneGeometry(this.o.length, this.o.width, 96, 12);
    this.mesh = fxMesh(new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: RIVER_VERT, fragmentShader: RIVER_FRAG }), g);
    this.mesh.rotation.x = -Math.PI / 2;
    this.group = new THREE.Group(); this.group.add(this.mesh); this.p = p; this.style = style;
    // рябь линиями: «Вода: рябь и волны», плывёт по течению шагами
    const WA = handOf(style, 'water'); const L = this.o.length, W = this.o.width;
    this.ripples = WA ? Array.from({ length: this.o.ripples ?? 44 }, (_, i) => {
      const m = decal(WA, [p.foam, p.ink, p.sky, p.ink][i % 4], { flat: true });
      m.userData.ph = Math.random(); m.userData.k = .6 + Math.random() * .6; m.userData.seed = Math.random() * 99; this.group.add(m); return m;
    }) : [];
    this.twinkles = Array.from({ length: 7 }, () => { const s = protSprite(starTex(), p.glint); s.visible = false; this.group.add(s); return s; });
    this.rocks = [];
  }
  // камень в русле: пена кольцом и усы ряби ниже по течению
  addRock(x, z, r) {
    const U = { uStep: this.clock.u, cA: { value: col(this.p.foam) }, cInk: { value: col(this.p.ink) } };
    const ring = flatQuad(FOAMRING_FRAG, U, r * 3.2); ring.position.set(x, .02, z); this.group.add(ring);
    const WA = handOf(this.style, 'water'); const wakes = [];
    if (WA) for (let i = 0; i < 2; i++) { const m = decal(WA, this.p.foam, { flat: true, w: r * 2.6, h: r * 1.1 }); sd(m, { p: [x + r * (1.4 + i * 1.3), .02, z], rot: 0 }); this.group.add(m); wakes.push(m); }
    this.rocks.push({ ring, U, wakes }); return ring;
  }
  setPreset(k) { const p = WATER_PRESETS[k]; if (!p) return; const U = this.uniforms; this.p = p; this.ripples.forEach((m, i) => sd(m, { c: [p.foam, p.ink, p.sky, p.ink][i % 4] })); this.twinkles.forEach((s) => s.material.color.set(p.glint)); for (const r of this.rocks) { r.U.cA.value.set(p.foam); r.U.cInk.value.set(p.ink); r.wakes.forEach((m) => sd(m, { c: p.foam })); } for (const [a, b] of [['cDeep', 'deep'], ['cMid', 'mid'], ['cShallow', 'shallow'], ['cFoam', 'foam'], ['cSky', 'sky'], ['cInk', 'ink'], ['cGlint', 'glint']]) U[a].value.set(p[b]); this.fall?.setPreset(k); }
  get light() { return this.uniforms.uLight.value; }
  update(dt, camera) {
    const nw = this.clock.tick(dt); if (!nw) return;
    const st = this.clock.u.value, t = this.clock.t, L = this.o.length, W = this.o.width, fl = this.o.flow;
    for (const m of this.ripples) {
      const d = m.userData; const life = (t * .28 + d.ph) % 1; const gen = Math.floor(t * .28 + d.ph);
      const x0 = (hash(d.seed + gen * 1.7) - .5) * L * .9, z = (hash(d.seed * 3 + gen) - .5) * W * .7;
      sd(m, { p: [x0 + life * 1.6 * fl, .016, z], cell: Math.floor(st / 3) + Math.floor(d.seed), w: 1.1 * d.k, h: .45 * d.k, on: life > .05 && life < .85, rot: (hash(d.seed + st * .1) - .5) * .1 });
    }
    for (const r of this.rocks) r.wakes.forEach((m, i) => sd(m, { cell: Math.floor(st / 2) + i * 3 }));
    // блёстки на дорожке отражения: между камерой и светом
    if (camera) {
      const cam = this.group.worldToLocal(camera.position.clone()); const li = this.group.worldToLocal(this.light.clone());
      const dx = li.x - cam.x, dz = li.z - cam.z; const k = (0 - cam.z) / (dz || 1e-3);
      for (const s of this.twinkles) {
        if (s.visible && hash(st * 7.1 + s.id) < .5) { s.visible = false; continue; }
        if (!s.visible && hash(st * 3.3 + s.id) > .75) {
          const zz = (hash(st + s.id * 1.3) - .5) * W * .8; const kk = (zz - cam.z) / (dz || 1e-3);
          s.position.set(cam.x + dx * kk + (hash(st * 2 + s.id) - .5) * .8, .1, zz); const sc = .08 + hash(st * 5 + s.id) * .1; s.scale.set(sc, sc, 1); s.visible = Math.abs(zz) < W * .45 && k > 0;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- водопад
const FALL_FRAG = /* glsl */`
uniform float uStep; uniform vec3 cDeep, cMid, cFoam, cSky, cInk;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  float st = uStep; vec2 p = vUv;
  // рваные края струи
  float ex = (pfNoise(vec2(p.y * 6. + st * .9, 1.)) - .5) * .12;
  float side = min(p.x, 1. - p.x) + ex;
  if (side < 0.) discard;
  // струи: вертикальные полосы, бегут вниз шагами
  float col = floor(p.x * 9.);
  float run = pfNoise(vec2(col * 3.7, p.y * 2.2 + st * .9));
  vec3 c = run > .62 ? cSky : run > .4 ? cMid : cDeep;
  float streak = step(.82, pfNoise(vec2(p.x * 30., p.y * 1.5 + st * 1.4)));
  c = mix(c, cFoam, streak);
  // линии струй: тёмные по стыкам полос, светлые «нитки» бегут вниз, с разрывами
  float wig = (pfNoise(vec2(p.y * 4. + st * .7, col)) - .5) * .25;
  float fx = fract(p.x * 9. + wig);
  float inkL = step(fx, .06) * step(.35, pfNoise(vec2(col * 2.1, p.y * 3. + st * 1.1)));
  float liteL = step(abs(fx - .5), .025) * step(.55, pfNoise(vec2(col * 5.3, p.y * 5. + st * 1.6)));
  if (inkL > .5) c = cInk; if (liteL > .5) c = cFoam;
  // пенная кромка сверху
  float lip = step(1. - p.y, .06 + pfNoise(vec2(p.x * 12., st)) * .05);
  float a = 1.;
  if (lip > .5 || streak > .5 || inkL > .5 || liteL > .5) a = .5;
  if (lip > .5) c = cFoam;
  if (side < .03) { c = cInk; a = .5; }
  gl_FragColor = vec4(c, a);
}`;
export class PaintedFall {
  constructor(style, opts = {}) {
    this.o = { width: 1.4, height: 2.6, preset: 'stream', ...opts };
    this.clock = new StepClock(10); this.foamClock = new StepClock(8);
    const p = WATER_PRESETS[this.o.preset] ?? WATER_PRESETS.stream;
    this.uniforms = { uStep: this.clock.u, cDeep: { value: col(p.mid) }, cMid: { value: col(p.shallow) }, cFoam: { value: col(p.foam) }, cSky: { value: col(p.sky) }, cInk: { value: col(p.ink) } };
    // слегка выпуклая струя: верх выносится вперёд
    const g = new THREE.PlaneGeometry(this.o.width, this.o.height, 8, 16); const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / this.o.height + .5; pos.setZ(i, Math.pow(y, 2) * .35 - Math.abs(pos.getX(i)) * .1); }
    g.translate(0, this.o.height / 2, 0); g.computeVertexNormals();
    this.group = new THREE.Group();
    this.mesh = fxMesh(new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`, fragmentShader: FALL_FRAG, side: THREE.DoubleSide }), g);
    this.group.add(this.mesh);
    this.foam = [];
    for (let i = 0; i < 3; i++) {
      const f = fxMesh(puffMat(p.foam, p.sky, p.ink, { step: this.foamClock.u, seed: i * 3.3, w: this.o.width * (1.5 - i * .25), h: .9, off: [(i - 1) * .35, -.12, .3 + i * .05], n: 6, speed: 7, spread: 1.4 }));
      f.material.uniforms.cA.value.set(p.sky); f.material.uniforms.cB.value.set(p.foam);
      this.group.add(f); this.foam.push(f);
    }
    // туман у подножия, брызги дугами («Брызги и капли»), круги по воде
    this.mist = fxMesh(puffMat(p.mid, p.shallow, p.mid, { step: this.foamClock.u, seed: 9.1, w: this.o.width * 1.8, h: 1.2, off: [0, -.15, .05], n: 4, speed: 3, spread: 1.2, ink: 0 }));
    this.mist.renderOrder = -1; this.group.add(this.mist);
    const SP = handOf(style, 'splash');
    this.drops = SP ? Array.from({ length: 12 }, (_, i) => { const m = decal(SP, i % 3 ? p.foam : p.sky, { w: .24, h: .24 }); m.userData.ph = Math.random(); this.group.add(m); return m; }) : [];
    this.rings = Array.from({ length: 3 }, (_, i) => { const U = { uStep: this.foamClock.u, uT: { value: 0 }, uSeed: { value: i * 3.1 }, cA: { value: col(p.foam) } }; const m = flatQuad(RINGLINE_FRAG, U, this.o.width * 2.2); m.position.set((i - 1) * .3, .03, .55); m.userData.U = U; m.userData.ph = i / 3; this.group.add(m); return m; });
  }
  setPreset(k) {
    const p = WATER_PRESETS[k]; if (!p) return; const U = this.uniforms;
    U.cDeep.value.set(p.mid); U.cMid.value.set(p.shallow); U.cFoam.value.set(p.foam); U.cSky.value.set(p.sky); U.cInk.value.set(p.ink);
    for (const f of this.foam) { const V = f.material.uniforms; V.cA.value.set(p.sky); V.cB.value.set(p.foam); V.cInk.value.set(p.ink); }
    const M = this.mist.material.uniforms; M.cA.value.set(p.mid); M.cB.value.set(p.shallow); M.cInk.value.set(p.mid);
    this.drops.forEach((m, i) => sd(m, { c: i % 3 ? p.foam : p.sky })); this.rings.forEach((m) => m.userData.U.cA.value.set(p.foam));
  }
  update(dt) {
    this.clock.tick(dt); const nw = this.foamClock.tick(dt); if (!nw) return;
    const t = this.foamClock.t, st = this.foamClock.u.value, Wd = this.o.width;
    for (const m of this.rings) m.userData.U.uT.value = Math.floor(((t * .6 + m.userData.ph) % 1) * 12) / 12;
    for (const m of this.drops) {
      const d = m.userData; const life = (t * .9 + d.ph) % 1; const gen = Math.floor(t * .9 + d.ph);
      const vx = (hash(gen * 3.1 + d.ph * 9) - .5) * 2.2, vy = 1.4 + hash(gen * 1.7 + d.ph) * 1.6, x0 = (hash(gen + d.ph * 5) - .5) * Wd;
      const tt = life * .8; sd(m, { p: [x0 + vx * tt, .05 + vy * tt - 4.9 * tt * tt, .45], cell: gen + Math.floor(d.ph * 7), rot: Math.atan2(-vx, vy - 9.8 * tt) * .6, w: .28 * (1 - life * .4), on: vy * tt - 4.9 * tt * tt > -.02 });
    }
  }
}

// ---------------------------------------------------------------- наброски окружения
// Свободные карандашные линии с перелётом у крупных форм (как над проёмом и по своду тоннеля на фото).
// items: [{p: [x, y, z], w, h, rot}] в координатах сцены. Линии «кипят» 4 раза в секунду.
export class EnvSketch {
  constructor(style, items, { color = '#1c1410', light = '#e8dcb8' } = {}) {
    this.group = new THREE.Group(); this.clock = new StepClock(4); this.items = [];
    const A = handOf(style, 'env'); if (!A) return;
    items.forEach((it, i) => {
      const m = decal(A, it.light ? light : color, { w: it.w ?? 2, h: it.h ?? 0.6, push: it.push ?? 0 });
      sd(m, { p: it.p, rot: it.rot ?? 0, cell: i * 3 }); m.userData.it = it; m.userData.i = i; this.group.add(m); this.items.push(m);
    });
  }
  update(dt) {
    if (!this.clock.tick(dt)) return; const st = this.clock.u.value;
    for (const m of this.items) { const it = m.userData.it, i = m.userData.i; sd(m, { cell: i * 3 + (st % 3), p: [it.p[0] + (hash(st + i) - .5) * .03, it.p[1] + (hash(st * 1.7 + i) - .5) * .03, it.p[2]], rot: (it.rot ?? 0) + (hash(st * 2.3 + i) - .5) * .03 }); }
  }
}
