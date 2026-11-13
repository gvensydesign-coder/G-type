// Рисованные нормали: прототип. Режимы нормали: как сейчас в игре / А мазок в шейдере / Б рисованная карта в UV / гладко.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STROKES } from './strokes.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200);

// ---------------------------------------------------------------- общие юниформы
const G = {
  uMode: { value: 1 }, uLook: { value: 0 }, uAmt: { value: 0.85 },
  uL: { value: new THREE.Vector3(0.6, 0.6, 0.5).normalize() },
  uVar: { value: 0 }, uFl: { value: new THREE.Vector4(1, 1, 1, 1) }, uGrain: { value: 1 },
  uStep: { value: 0 }, uAtlas: { value: null }, uColK: { value: 1 },
  uLC: { value: new THREE.Vector3(1.25, 1.0, .72) }, uSC: { value: new THREE.Vector3(.15, .15, .3) }, uSharp: { value: .45 },
};

// ---------------------------------------------------------------- атлас почеркушек Michael (как в небе v2)
function buildAtlas() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  ['light', 'outline', 'smoke', 'hatch'].forEach((cls, row) => {
    (STROKES[cls] || []).slice(0, 4).forEach((drw, col) => {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      drw.forEach(s => { for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
      const sc = (S - 24) / Math.max(x1 - x0, y1 - y0, .05);
      const ox = col * S + 12 + ((S - 24) - (x1 - x0) * sc) / 2, oy = (3 - row) * S + 12 + ((S - 24) - (y1 - y0) * sc) / 2;
      drw.forEach(s => { for (let i = 3; i < s.length; i += 3) {
        g.lineWidth = 4 + 10 * (s[i + 2] || .5);
        g.beginPath(); g.moveTo(ox + (s[i - 3] - x0) * sc, oy + (s[i - 2] - y0) * sc); g.lineTo(ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc); g.stroke(); } });
    });
  });
  g.filter = 'blur(3px)'; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.drawImage(cv, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
G.uAtlas.value = buildAtlas();

// ---------------------------------------------------------------- шейдеры
const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv; varying vec3 vObjN, vObjP, vW, vN, vSk0, vSk1, vSk2;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vUv = uv; vObjN = normal; vObjP = position;
  mat3 Sk = mat3(1.0);
  #ifdef USE_SKINNING
    Sk = mat3(skinMatrix);
  #endif
  mat3 M = mat3(modelMatrix) * Sk; vSk0 = M[0]; vSk1 = M[1]; vSk2 = M[2];
  vec4 w = modelMatrix * vec4(transformed, 1.0); vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * objectNormal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const NOISE = /* glsl */`
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
`;

const FRAG = /* glsl */`
uniform int uMode, uLook; uniform float uSharp, uTilt, uBris, uSoft, uStr, uBump, uDots, uDotK, uToneSoft, uRelD, uAmt, uVar, uGrain, uStep, uHasMap, uHasBake, uUnit, uR, uStrokeK, uRelK, uIsGround;
uniform vec3 uL, uColor, uSz, uLC, uSC; uniform vec4 uFl; uniform sampler2D uPaintC; uniform float uHasPaint;
uniform sampler2D uMap, uP0, uP1, uP2, uAtlas, uC0, uC1, uC2; uniform float uColK;
varying vec2 vUv; varying vec3 vObjN, vObjP, vW, vN, vSk0, vSk1, vSk2;
${NOISE}
vec3 toW(vec3 b){ return normalize(mat3(vSk0, vSk1, vSk2) * b); }

// 3D Вороной: ближайшая точка (в пространстве s), её клетка, расстояния до первой и второй
void vor3(vec3 s, float seed, out vec3 fp, out vec3 id, out float d1, out float d2){
  vec3 i = floor(s); d1 = 9.; d2 = 9.; fp = s; id = i;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 c = i + vec3(x, y, z); vec3 q = c + .15 + .7 * h33(c + seed); float d = length(s - q);
    if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d;
  }
}
mat3 rotT(){ float a = .38, b = .22; mat3 rz = mat3(cos(a), sin(a), 0., -sin(a), cos(a), 0., 0., 0., 1.);
  mat3 rx = mat3(1., 0., 0., 0., cos(b), sin(b), 0., -sin(b), cos(b)); return rz * rx; }

// А: мазок как плоскость. Клетки — «лепёшки» в координатах модели (длинные поперёк тела, узкие по высоте),
// нормаль берётся в центре мазка (для выпуклой формы n(c) ≈ n + (c − p)/R), плюс наклон мазка и щетина вдоль него.
float gStrokeH = .5;
vec3 strokeA(vec3 p, vec3 n, float seed, out float fade){
  float wm = min(uSz.x, min(uSz.y, uSz.z));
  vec3 w = p + (vec3(n3(p / wm * .7 + seed), n3(p / wm * .7 + 11. + seed), n3(p / wm * .7 + 23. + seed)) - .5) * wm * 1.1;
  vec3 S = 1. / uSz; mat3 R = rotT();
  vec3 s = (R * w) * S; vec3 fp, id; float d1, d2; vor3(s, seed, fp, id, d1, d2);
  // мелкие на экране мазки гаснут: меньше ~6 px поперёк — к гладкой нормали (нет ряби вдали)
  float fw = length(fwidth(s));
  fade = 1. - smoothstep(.10, .30, fw);
  gStrokeH = h31(id + 2.7 + seed);
  vec3 c = transpose(R) * (fp / S);
  vec3 r = c - p; r -= n * dot(r, n);
  vec3 nc = normalize(n + r / uR + (h33(id + 5.1 + seed) - .5) * uTilt);
  // щетина: полосы вдоль мазка — лёгкий наклон поперёк (гаснет раньше самих мазков)
  float br = n3(vec3(s.x * .5, (s.y - fp.y) * 8., s.z * .5) + id * 3.1);
  vec3 up = transpose(R) * vec3(0., 1., 0.);
  nc = normalize(nc + (up - n * dot(up, n)) * (br - .5) * uBris * (1. - smoothstep(.05, .14, fw)));
  // край мазка: мягкость материала × общая резкость; на краю нормаль уходит к гладкой
  float sw = uSoft * mix(1.6, .15, uSharp);
  nc = normalize(mix(n, nc, smoothstep(0., sw + .001, d2 - d1)));
  return nc;
}
// как сейчас в игре (pnt_light): Вороной в мировых координатах, случайный наклон нормали клетки
vec3 strokeWorld(vec3 pw, vec3 N, float seed){
  vec3 fp, id; float d1, d2; vor3(pw * 7. + (vec3(n3(pw * 5.), n3(pw * 5. + 9.), 0.) - .5) * .8, seed, fp, id, d1, d2);
  return normalize(N + (h33(id + seed) - .5) * .75);
}

// почеркушки Michael из атласа, редкими клетками по UV; утолщение выборкой крестом
float scrib(vec2 uv, float k, float salt, float dens){
  vec2 g = uv * k; vec2 ci = floor(g); vec2 f = fract(g);
  float hh = h21(ci + salt); if (hh > dens) return 0.;
  float idx = floor(h21(ci + salt + 7.) * 16.);
  vec2 cell = vec2(mod(idx, 4.), floor(idx / 4.));
  float a = (h21(ci + salt + 3.) - .5) * 1.2; f = mat2(cos(a), sin(a), -sin(a), cos(a)) * (f - .5) * 1.1 + .5;
  if (any(lessThan(f, vec2(0.))) || any(greaterThan(f, vec2(1.)))) return 0.;
  vec2 au = (cell + f) / 4.; float e = 1.2 / 1024.;
  float v = texture2D(uAtlas, au).r;
  v = max(v, max(texture2D(uAtlas, au + vec2(e, 0)).r, texture2D(uAtlas, au - vec2(e, 0)).r));
  v = max(v, max(texture2D(uAtlas, au + vec2(0, e)).r, texture2D(uAtlas, au - vec2(0, e)).r));
  return v;
}

void main(){
  vec3 nB = normalize(vObjN);
  vec3 N = normalize(vN);
  float seed = uFl.x > .5 ? uVar * 17.3 : 0.;
  vec3 pM = vObjP * uUnit;
  float edge = 1.; float strokeFade = 0.; float bakeK = -1.;
  if (uMode == 0) {
    N = normalize(mix(N, strokeWorld(vW, N, seed), uAmt));
  } else if (uMode == 1 || (uMode == 2 && uHasBake < .5)) {
    float fade; vec3 nc = strokeA(pM, nB, seed, fade);
    N = toW(normalize(mix(nB, nc, uAmt * uStr * fade)));
    strokeFade = fade;
  } else if (uMode == 2) {
    float k = uFl.x > .5 ? uVar : 0.; bakeK = k;
    vec3 nb = (k < .5 ? texture2D(uP0, vUv).xyz : k < 1.5 ? texture2D(uP1, vUv).xyz : texture2D(uP2, vUv).xyz) * 2. - 1.;
    float fade = 1. - smoothstep(.06, .2, length(fwidth(vUv * 40.)));
    N = toW(normalize(mix(nB, normalize(nb), uAmt * uStr * fade)));
  }
  if (!gl_FrontFacing) N = -N;

  // почеркушки рельефом: высота из атласа → наклон нормали (как bump)
  float relH = 0.;
  if (uFl.y > .5) {
    float rf = 1. - smoothstep(.04, .12, length(fwidth(vUv * uRelK)));
    relH = uRelD > 0. && rf > 0. ? scrib(vUv, uRelK, 3. + seed, uRelD) * rf : 0.;
    vec3 dpx = dFdx(vW), dpy = dFdy(vW); float dhx = dFdx(relH), dhy = dFdy(relH);
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    N = normalize(abs(det) * N - grad * uBump * mix(.5, 1., uSharp));
  }

  if (uLook == 2) { gl_FragColor = vec4(N * .5 + .5, 1.); return; }

  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uL);
  float d = dot(N, L);
  // свет ступенями; переход в тень точками (точки сидят в координатах модели)
  float tw = uToneSoft * mix(.16, .015, uSharp);
  float lit = smoothstep(-tw, tw, d);
  vec3 g = pM * uDotK + vec3(0., 0., seed);
  float dotFade = 1. - smoothstep(.15, .35, length(fwidth(g)));
  if (uFl.z > .5 && uDots * dotFade > .5) { vec3 ci = floor(g);
    vec3 q = ci + .2 + .6 * h33(ci); float dd = length(g - q);
    float t = smoothstep(-.22, .05, d);
    float dotR = .62 * t * (.75 + .5 * h31(ci + 2.));
    lit = d > .05 ? 1. : (dd < dotR ? 1. : 0.);
    if (d > .05 && d < .16 && dd < .16 * (1. - smoothstep(.05, .16, d))) lit = 0.;
  }
  float q = clamp(d, 0., .999) * 3.;
  float tone = lit * (.52 + .48 * clamp((floor(q) + smoothstep(1. - tw * 6., 1., fract(q))) / 3., 0., 1.));
  vec3 alb = uHasMap > .5 ? texture2D(uMap, vUv).rgb * uColor : uColor;
  // цвет теми же мазками, что и свет (автор видео: «каждый ввод цвета — ровно там же, где ввод нормали»)
  if (uColK > .5) {
    if (bakeK >= 0. && uHasMap > .5) { float cf = 1. - smoothstep(.06, .2, length(fwidth(vUv * 40.)));
      vec3 cb = bakeK < .5 ? texture2D(uC0, vUv).rgb : bakeK < 1.5 ? texture2D(uC1, vUv).rgb : texture2D(uC2, vUv).rgb; alb = mix(alb, cb * uColor, cf * uAmt); }
    else if (strokeFade > 0.) alb *= 1. + (gStrokeH - .5) * .3 * strokeFade * uAmt;
  }
  if (uLook == 1) alb = vec3(.52, .48, .42);
  // кисть рукой: цвет лежит там же, где нарисована нормаль
  if (uHasPaint > .5 && uLook != 1) { vec4 pc = texture2D(uPaintC, vUv); alb = mix(alb, pc.rgb, pc.a * .85); }
  vec3 lightC = uLC;
  vec3 shadC = uSC + uSC * .25 * max(N.y, 0.);
  vec3 col = alb * mix(shadC, lightC, tone);
  // тонкая кромка: в тени холодная, на свету тёплая
  float fr = pow(1. - max(dot(N, V), 0.), 5.);
  col += mix(vec3(.30, .42, .62), vec3(1., .78, .5), lit) * fr * .35 * (1. - uIsGround);
  // мел в цвете: почеркушки цветом поверх кожи (без рельефа)
  if (uFl.w > .5 && uLook == 0) {
    float ch = uRelD > 0. ? scrib(vUv + .37, uRelK * .62, 19. + seed, uRelD * .3) * (1. - smoothstep(.04, .12, length(fwidth(vUv * uRelK * .62)))) : 0.;
    col = mix(col, lit > .5 ? vec3(1., .72, .42) * 1.15 : vec3(.30, .42, .85) * .5, ch * .25);
  }
  // зерно бумаги 8 к/с
  if (uGrain > .5) col *= 1. + (h21(floor(gl_FragCoord.xy * .7) + uStep * 13.1) - .5) * .04 + (n2(gl_FragCoord.xy * .02) - .5) * .04;
  gl_FragColor = linearToOutputTexel(vec4(col, 1.));
}`;

const BLACK = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); BLACK.needsUpdate = true;
// Профили материалов: размер мазка (м, по осям объекта до наклона), наклон граней, щетина, мягкость края,
// сила, кривизна R, рельеф почеркушек, точки в тени, мягкость ступеней света. Иерархия: герой чётче всех,
// предметы спокойнее, земля почти гладкая — объекты не спорят по детальности.
const PROFILES = {
  cloth:  { t: 'Ткань и кожа (Богатырь)', d: 'Средние мазки, мягкий край, лёгкая щетина, точки у границы тени', sz: [.16, .06, .16], tilt: .22, bris: .08, soft: .5, str: .75, R: .16, relD: .1, bump: .18, dots: 1, dotK: 26, toneSoft: .7 },
  bark:   { t: 'Кора и мох (Леший)', d: 'Мазки длиннее по высоте, щетина бороздами, край средний', sz: [.12, .2, .12], tilt: .28, bris: .3, soft: .4, str: .75, R: .2, relD: .08, bump: .18, dots: 1, dotK: 20, toneSoft: .6 },
  clay:   { t: 'Глина (шар-образец)', d: 'Чистые плоскости, как у скульптуры из видео', sz: [.14, .06, .14], tilt: .3, bris: .1, soft: .3, str: 1, R: .55, relD: .12, bump: .15, dots: 1, dotK: 24, toneSoft: .5 },
  stone:  { t: 'Камень', d: 'Крупные резкие грани, почти без щетины, сколы почеркушками', sz: [.2, .12, .2], tilt: .45, bris: .03, soft: .18, str: .9, R: .22, relD: .1, bump: .22, dots: 1, dotK: 16, toneSoft: .35 },
  wood:   { t: 'Дерево (брёвна, дверь)', d: 'Узкие длинные мазки вдоль волокна, борозды щетиной, без точек', sz: [.06, .45, .06], tilt: .14, bris: .35, soft: .5, str: .6, R: .15, relD: .05, bump: .12, dots: 0, dotK: 12, toneSoft: .8 },
  hay:    { t: 'Сено (крыша)', d: 'Короткие мазки вниз по скату, мягкие, без рельефа', sz: [.07, .05, .3], tilt: .3, bris: .25, soft: .7, str: .45, R: .4, relD: 0, bump: 0, dots: 0, dotK: 10, toneSoft: 1.1 },
  ground: { t: 'Земля и мох', d: 'Большие мягкие пятна, слабее всего, без рельефа и точек', sz: [.8, .45, .8], tilt: .16, bris: 0, soft: 1, str: .35, R: 1.2, relD: 0, bump: 0, dots: 0, dotK: 8, toneSoft: 1.4 },
};
const SAME = PROFILES.cloth;   // «один мазок на всё» — для сравнения
const allMats = [];
function applyProfile(m, P) {
  const u = m.uniforms; u.uSz.value.set(...P.sz); u.uTilt.value = P.tilt; u.uBris.value = P.bris; u.uSoft.value = P.soft; u.uStr.value = P.str;
  u.uR.value = P.R; u.uRelD.value = P.relD; u.uBump.value = P.bump; u.uDots.value = P.dots; u.uDotK.value = P.dotK; u.uToneSoft.value = P.toneSoft;
}
function makeMat(o = {}) {
  const P = PROFILES[o.kind || 'cloth'];
  const m = new THREE.ShaderMaterial({
    name: o.name || 'pn',
    uniforms: {
      ...G,
      uMap: { value: o.map || BLACK }, uHasMap: { value: o.map ? 1 : 0 }, uColor: { value: new THREE.Color(o.color ?? '#ffffff') },
      uP0: { value: BLACK }, uP1: { value: BLACK }, uP2: { value: BLACK }, uHasBake: { value: 0 }, uC0: { value: BLACK }, uC1: { value: BLACK }, uC2: { value: BLACK }, uPaintC: { value: BLACK }, uHasPaint: { value: 0 },
      uUnit: { value: o.unit ?? 1 }, uR: { value: o.R ?? .14 }, uStrokeK: { value: o.strokeK ?? 1 }, uRelK: { value: o.relK ?? 9 }, uRelD: { value: o.relD ?? .3 },
      uIsGround: { value: o.ground ? 1 : 0 },
      uSz: { value: new THREE.Vector3() }, uTilt: { value: 0 }, uBris: { value: 0 }, uSoft: { value: 0 }, uStr: { value: 1 }, uBump: { value: 0 },
      uDots: { value: 1 }, uDotK: { value: 20 }, uToneSoft: { value: 1 },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: o.side ?? THREE.FrontSide,
    extensions: { derivatives: true },
  });
  m.userData.kind = o.kind || 'cloth'; applyProfile(m, P); allMats.push(m);
  return m;
}
function setProfiles(on) { for (const m of allMats) applyProfile(m, on ? PROFILES[m.userData.kind] : SAME); }

// контур тушью: оболочка, вывернутая наружу (тот же скелет)
const OL_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
uniform float uW;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vec3 nv = normalize(normalMatrix * objectNormal);
  mv.xyz += nv * uW * clamp(-mv.z, 1., 12.) * .0032;
  gl_Position = projectionMatrix * mv;
}`;
const outlineMat = new THREE.ShaderMaterial({
  name: 'ink', uniforms: { uW: { value: 1 } }, vertexShader: OL_VERT,
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.047, 0.055, 0.086, 1.); }', side: THREE.BackSide,
});

// ---------------------------------------------------------------- запекание рисованной карты (Б)
const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.Camera();
const QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
function rt(S) { return new THREE.WebGLRenderTarget(S, S, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }); }
function pass(mat, target) {
  const m = new THREE.Mesh(quadGeo, mat); m.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(m);
  renderer.setRenderTarget(target); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
}
function bakePainted(geo, albMap, S = 1024) {
  const A = rt(S), B = rt(S);
  // 1) нормали модели в UV
  const nm = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normal; gl_Position = vec4(uv * 2. - 1., 0., 1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }',
    side: THREE.DoubleSide, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, nm); mesh.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(mesh);
  renderer.setRenderTarget(A); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
  // 2) расширение островов UV (чтобы шов не темнел)
  const dil = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t; uniform float px; varying vec2 vUv;
    void main(){ vec4 c = texture2D(t, vUv); if (c.a > .5) { gl_FragColor = c; return; }
      vec4 s = vec4(0.); for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec4 q = texture2D(t, vUv + vec2(x, y) * px); if (q.a > .5) s += vec4(q.rgb, 1.); }
      gl_FragColor = s.a > 0. ? vec4(s.rgb / s.a, 1.) : vec4(0.); }` });
  let src = A, dst = B;
  for (let i = 0; i < 6; i++) { dil.uniforms.t.value = src.texture; pass(dil, dst); [src, dst] = [dst, src]; }
  const base = src; const spare = dst;
  // 3) мазки: два слоя вытянутых клеток в UV; нормаль мазка = нормаль в центре мазка (плоскость), щетина вдоль, рваный край
  const paint = new THREE.ShaderMaterial({ uniforms: { t: { value: base.texture }, alb: { value: albMap || BLACK }, cmode: { value: 0 }, seed: { value: 0 }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t, alb; uniform float seed, px, cmode; varying vec2 vUv;
    ${NOISE}
    vec3 dec(vec4 c){ return normalize(c.rgb * 2. - 1.); }
    vec3 layer(vec2 uv, vec3 n0, float ang, vec2 sc, float sd, out float e, out vec2 cuo){
      mat2 R = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
      vec2 w = uv + (vec2(n2(uv * 40. + sd), n2(uv * 40. + sd + 9.)) - .5) * .012;
      vec2 s = (R * w) * sc; vec2 i = floor(s); float d1 = 9., d2 = 9.; vec2 fp = s, id = i;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 c = i + vec2(x, y); vec2 q = c + .1 + .8 * h22(c + sd); float d = length(s - q); if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d; }
      e = d2 - d1;
      vec2 cu = transpose(R) * (fp / sc);
      vec4 cc = texture2D(t, cu); vec3 nc = dec(cc);
      cuo = cu; if (cc.a < .5 || dot(nc, n0) < .55) { nc = n0; cuo = uv; }            // центр на другом острове UV — берём свою нормаль и свой цвет
      nc = normalize(nc + (h33(vec3(id, sd)) - .5) * .3);
      float br = n2(vec2((s.y - fp.y) * 14., s.x * .6) + id * 3.7);   // щетина вдоль мазка
      vec3 tl = normalize(cross(n0, vec3(.3, .9, .2)));
      return normalize(nc + tl * (br - .5) * .25);
    }
    void main(){
      vec4 c = texture2D(t, vUv); if (c.a < .5) { gl_FragColor = c; return; }
      vec3 n0 = dec(c); float e1, e2; vec2 ca, cb;
      vec3 a = layer(vUv, n0, .5, vec2(22., 60.), seed, e1, ca);
      vec3 b = layer(vUv + .013, n0, -.35, vec2(34., 90.), seed + 41., e2, cb);
      float m = smoothstep(.45, .6, n2(vUv * 26. + seed * 3.) + (n2(vUv * 160. + seed) - .5) * .35);   // маска щетины: где ложится второй слой
      if (cmode > .5) {   // цвет теми же мазками: внутри мазка цвет из его центра (как у автора видео: цвет и нормаль в одних местах)
        vec2 cu = m > .5 ? cb : ca; vec3 ac = texture2D(alb, cu).rgb, ao = texture2D(alb, vUv).rgb;
        gl_FragColor = vec4(mix(ac, ao, .25), 1.); return;
      }
      vec3 n = normalize(mix(a, b, m));
      gl_FragColor = vec4(n * .5 + .5, 1.);
    }` });
  const outs = [];
  const rts = [];
  for (let k = 0; k < 3; k++) { const o = rt(S); paint.uniforms.seed.value = k * 13.7; pass(paint, o); outs.push(o.texture); rts.push(o); }
  const cols = [];
  if (albMap) { paint.uniforms.cmode.value = 1; for (let k = 0; k < 3; k++) { const o = rt(S); paint.uniforms.seed.value = k * 13.7; pass(paint, o); cols.push(o.texture); } }
  spare.dispose(); nm.dispose(); dil.dispose(); paint.dispose();
  return { base: base.texture, painted: outs, colors: cols, rts, S };
}

// ---------------------------------------------------------------- сцена: небо, земля, изба, камни
function skyTexture(st) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  st = st || [[0, '#16303a'], [.45, '#2e5a52'], [.62, '#7a6a52'], [.72, '#c9874e'], [1, '#183a30']];
  for (const [o, c] of st) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { const y = r() * 512, x = r() * 512; g.globalAlpha = .06 + r() * .08; g.fillStyle = r() > .5 ? '#0e1220' : '#e8b080';
    g.save(); g.translate(x, y); g.rotate(-.18 + r() * .1); g.fillRect(-40 - r() * 60, -3 - r() * 4, 90 + r() * 120, 5 + r() * 7); g.restore(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = skyTexture();
scene.fog = new THREE.Fog('#183a30', 18, 60);

const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 64), makeMat({ name: 'ground', kind: 'ground', color: '#1e3a1c', relK: 2, ground: true }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

let BALL = null;
const hut = new THREE.Group(); hut.position.set(0.6, 0, -4.6); hut.rotation.y = -0.35; scene.add(hut);
{
  const wood = makeMat({ name: 'wood', kind: 'wood', color: '#5e4128', relK: 3 });
  const W = 3.4, D = 2.8, r = .15, rows = 9;
  const logGeo = (len) => new THREE.CylinderGeometry(r, r, len, 20, 1);
  for (let i = 0; i < rows; i++) {
    const y = r + i * r * 1.85;
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(logGeo(W + .5), wood); a.rotation.z = Math.PI / 2; a.position.set(0, y + (i % 2 ? 0 : r * .9), s * D / 2); hut.add(a);
      const b = new THREE.Mesh(logGeo(D + .5), wood); b.rotation.x = Math.PI / 2; b.position.set(s * W / 2, y + (i % 2 ? r * .9 : 0), 0); hut.add(b);
    }
  }
  const top = r + rows * r * 1.85;
  const roofM = makeMat({ name: 'hay', kind: 'hay', color: '#7e6432', relK: 2 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(W + 1, .14, D * .78, 8, 1, 8), roofM);
    p.position.set(0, top + .55, s * D * .3); p.rotation.x = s * .72; hut.add(p);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.3, .1), makeMat({ name: 'door', kind: 'wood', color: '#2a1c12', relK: 10 }));
  door.position.set(-.5, .7, D / 2 + .2); hut.add(door);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.55, 64, 40), makeMat({ name: 'ball', kind: 'clay', color: '#cbbfa6', relK: 5 }));
  ball.position.set(-2.9, .55, 2.4); hut.add(ball); BALL = ball;
  const stoneM = makeMat({ name: 'stone', kind: 'stone', color: '#6a6e64', relK: 4 });
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (const [x, z, s] of [[-2.6, 1.2, .45], [-3.1, .3, .3], [2.7, 1.6, .5], [3.4, .7, .32], [-1.8, 2.6, .25], [1.4, 3.1, .3]]) {
    const st = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), stoneM);
    st.scale.set(s * (1 + rnd() * .5), s * .62, s); st.rotation.y = rnd() * 3; st.position.set(x, s * .3, z + 2.5); scene.add(st);
  }
}

// ---------------------------------------------------------------- персонажи
const loader = new GLTFLoader();
async function loadModel(name) {
  const r = await fetch(`models/${name}.b64.txt`); if (!r.ok) throw new Error(name + ': ' + r.status);
  const b64 = (await r.text()).trim();
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  return new Promise((res, rej) => loader.parse(buf, '', res, rej));
}
function fitHeight(obj, h) {
  const box = new THREE.Box3().setFromObject(obj); const s = h / (box.max.y - box.min.y);
  obj.scale.multiplyScalar(s); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
}
// клипы на месте: убрать проход бёдер по горизонтали
function inPlace(clip) {
  const c = clip.clone();
  for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } }
  return c;
}
const chars = [];
const blobGeo = new THREE.CircleGeometry(1, 32);
const blobMat = new THREE.MeshBasicMaterial({ color: '#0c0e16', transparent: true, opacity: .55, depthWrite: false });
async function addChar(name, h, pos, rotY) {
  const gltf = await loadModel(name);
  const obj = gltf.scene; fitHeight(obj, h);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.position.copy(pos); wrap.rotation.y = rotY; scene.add(wrap);
  let skinned = null; obj.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  const src = skinned.material; const map = src.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
  const mat = makeMat({ name, map, color: src.color ? '#' + src.color.getHexString() : '#fff', unit: h, kind: name === 'leshy' ? 'bark' : 'cloth', relK: 11, side: THREE.DoubleSide });
  skinned.material = mat; skinned.frustumCulled = false;
  const ol = new THREE.SkinnedMesh(skinned.geometry, outlineMat);
  ol.bindMode = skinned.bindMode; ol.bind(skinned.skeleton, skinned.bindMatrix);
  ol.position.copy(skinned.position); ol.quaternion.copy(skinned.quaternion); ol.scale.copy(skinned.scale); ol.frustumCulled = false;
  skinned.parent.add(ol);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .012; blob.scale.set(h * .24, h * .2, 1); wrap.add(blob);
  const mixer = new THREE.AnimationMixer(obj);
  const clips = Object.fromEntries(gltf.animations.map(a => [a.name, inPlace(a)]));
  const ch = { name, h, wrap, obj, skinned, mat, outline: ol, mixer, clips, action: null, home: pos.clone(), homeRot: rotY };
  chars.push(ch); return ch;
}
function playClip(ch, name) {
  const clip = ch.clips[name] || ch.clips.Idle; const a = ch.mixer.clipAction(clip);
  if (ch.action && ch.action !== a) ch.action.fadeOut(.25);
  a.reset().fadeIn(.25).play(); ch.action = a;
}

// ---------------------------------------------------------------- интерфейс
const MODES = [
  [0, 'Как сейчас в игре', 'Мазки в мировых координатах со случайным наклоном. Пустите героев по кругу: узор плывёт по телу'],
  [1, 'А: мазок в шейдере', 'Нормаль выравнивается по плоскости мазка прямо в шейдере. Мазки в координатах модели, без текстур, подходит и окружению'],
  [2, 'Б: рисованная карта', 'Карта нормалей запечена в UV и прорисована мазками, три варианта для кипения. Изба и камни берут А'],
  [3, 'Гладко, без мазков', 'Обычная нормаль модели, для сравнения'],
];
const LAYERS = [
  ['x', 'Кипение мазков 8 к/с', 'Три варианта карты (или зерна мазков) сменяются шагами, как перерисованные кадры'],
  ['y', 'Почеркушки рельефом', 'Штрихи Michael выдавлены в нормаль: на свету бликуют, в тени пропадают'],
  ['z', 'Тень точками', 'Граница света и тени рассыпается точками, точки сидят на теле'],
  ['w', 'Мел в цвете', 'Цветные почеркушки поверх кожи: тёплые на свету, холодные в тени'],
  ['ol', 'Контур тушью', 'Оболочка на том же скелете'],
  ['gr', 'Зерно бумаги', 'Шум кадра шагом 8 к/с'],
  ['c', 'Цвет в тех же мазках', 'Как у автора видео: цвет кладётся теми же мазками, что и свет. В карте Б внутри мазка цвет из его центра, в А — свой оттенок у каждого мазка'],
];
const LOOKS = [[0, 'Итог'], [1, 'Только свет'], [2, 'Нормали']];
const ANIMS = [['Idle', 'Стоят'], ['Walk', 'Шаг на месте'], ['circle', 'Идут по кругу'], ['Attack', 'Удар']];
const VIEWS = [
  ['all', 'Общий план', () => new THREE.Vector3(0.1, 1.0, -0.6), 8.2, 0.12, 0.13],
  ['bog', 'Богатырь крупно', () => charPos(0).add(new THREE.Vector3(0, 1.2, 0)), 1.9, 0.25, 0.08],
  ['les', 'Леший крупно', () => charPos(1).add(new THREE.Vector3(0, 1.75, 0)), 3.0, -0.3, 0.06],
  ['ball', 'Шар-образец', () => new THREE.Vector3(-2.95, .55, -3.34), 2.6, 0.35, 0.12],
  ['hut', 'Изба и камни', () => new THREE.Vector3(0.4, 1.0, -2.4), 6.4, 0.55, 0.2],
];
const flags = { x: 1, c: 1, y: 1, z: 1, w: 1, ol: 1, gr: 1 };
let view = VIEWS[0], yawOff = 0, distK = 1, anim = 'Idle', lightA = -0.35, lightAuto = true;
function charPos(i) { const ch = chars.find(c => c.name === (i ? 'leshy' : 'bogatyr')); return ch ? ch.wrap.position.clone() : new THREE.Vector3(); }

function btn(parent, html, on) { const b = document.createElement('button'); b.innerHTML = html; b.onclick = on; parent.appendChild(b); return b; }
function radio(list, i) { [...list.children].forEach((b, k) => b.classList.toggle('on', k === i)); }
const modesEl = document.getElementById('modes');
MODES.forEach(([v, t, s], i) => btn(modesEl, `${t}<small>${s}</small>`, () => setMode(v)));
const layersEl = document.getElementById('layers');
LAYERS.forEach(([k, t, s]) => {
  const l = document.createElement('label'); l.className = 'chk';
  l.innerHTML = `<input type="checkbox" checked><span>${t}<small>${s}</small></span>`;
  l.querySelector('input').onchange = (e) => { flags[k] = e.target.checked ? 1 : 0; applyFlags(); };
  layersEl.appendChild(l);
});
const lookEl = document.getElementById('look');
LOOKS.forEach(([v, t], i) => btn(lookEl, t, () => { G.uLook.value = v; radio(lookEl, i); }));
const animsEl = document.getElementById('anims');
ANIMS.forEach(([k, t], i) => btn(animsEl, t, () => setAnim(k)));
const viewsEl = document.getElementById('views');
VIEWS.forEach((v, i) => btn(viewsEl, v[1], () => setView(v[0])));
document.getElementById('lightAuto').onchange = e => lightAuto = e.target.checked;
const lightIn = document.getElementById('lightAng');
lightIn.oninput = () => { lightA = +lightIn.value; lightAuto = false; document.getElementById('lightAuto').checked = false; };
const amtIn = document.getElementById('amt'); amtIn.oninput = () => G.uAmt.value = +amtIn.value;
const sharpIn = document.getElementById('sharp'); sharpIn.oninput = () => G.uSharp.value = +sharpIn.value;
const matsEl = document.getElementById('mats');
for (const k of Object.keys(PROFILES)) { const P = PROFILES[k]; const d = document.createElement('div'); d.className = 'mat'; d.innerHTML = `<b>${P.t}</b><small>${P.d}</small>`; matsEl.appendChild(d); }
document.getElementById('prof').onchange = e => setProfiles(e.target.checked);
const panel = document.getElementById('panel');
document.getElementById('toggle').onclick = () => panel.classList.toggle('hide');
if (innerWidth < 760) panel.classList.add('hide');

const HINTS = {
  0: 'Так мазки считаются сейчас: в мире. Включите «Идут по кругу» и смотрите на руки и ноги: узор света скользит по телу.',
  1: 'Каждый мазок — плоская грань, как у скульптуры из видео. Мазки приклеены к телу, свет ходит по ним, форма мазка остаётся.',
  2: 'Рисованная карта: мазки лежат в текстуре, их можно дорисовать рукой. Три варианта сменяются шагами 8 к/с.',
  3: 'Гладкая нормаль модели: свет ложится мягко, без мазков. Для сравнения.',
};
function setMode(v) { G.uMode.value = v; radio(modesEl, MODES.findIndex(m => m[0] === v)); document.getElementById('hint').textContent = HINTS[v]; }
function setAnim(k) {
  anim = k; radio(animsEl, ANIMS.findIndex(a => a[0] === k));
  for (const ch of chars) {
    playClip(ch, k === 'circle' ? 'Walk' : k);
    if (k !== 'circle') { ch.wrap.position.copy(ch.home); ch.wrap.rotation.y = ch.homeRot; }
  }
}
function setView(id) { view = VIEWS.find(v => v[0] === id); yawOff = 0; distK = 1; radio(viewsEl, VIEWS.indexOf(view)); }
function applyFlags() {
  G.uFl.value.set(flags.x, flags.y, flags.z, flags.w); G.uGrain.value = flags.gr; G.uColK.value = flags.c;
  for (const ch of chars) ch.outline.visible = !!flags.ol;
}
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') yawOff -= .12; else if (e.key === 'ArrowRight') yawOff += .12;
  else if (e.key === 'ArrowUp') distK = Math.max(.35, distK * .9); else if (e.key === 'ArrowDown') distK = Math.min(2.5, distK / .9); else return;
  e.preventDefault();
});

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- цикл
const fpsEl = document.getElementById('fps');
let last = performance.now(), acc = 0, t = 0, fr = 0, fpsT = 0, frames = 0, circT = 0, lightStepT = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; t += dt;
  // всё анимированное шагами: персонажи 12 к/с, кипение и зерно 8 к/с, свет 8 к/с
  acc += dt;
  if (acc >= 1 / 12) {
    for (const ch of chars) ch.mixer.update(acc);
    if (anim === 'circle') {
      circT += acc * .55;
      chars.forEach((ch, i) => {
        const a = circT + i * Math.PI, R = 2.0;
        ch.wrap.position.set(Math.cos(a) * R + .1, 0, Math.sin(a) * R + .6);
        ch.wrap.rotation.y = -a;   // лицом по ходу
      });
    }
    acc = 0;
  }
  const st = Math.floor(t * 8); G.uStep.value = st % 997; G.uVar.value = st % 3;
  if (lightAuto && Math.floor(t * 8) !== lightStepT) { lightStepT = Math.floor(t * 8); lightA += .035; lightIn.value = (((lightA % 6.283) + 6.283) % 6.283).toFixed(2); }
  G.uL.value.set(Math.cos(lightA), lightEl, Math.sin(lightA)).normalize();
  // камера
  const tgt = view[2](); const yaw = view[4] + yawOff, pitch = view[5], dist = view[3] * distK;
  camera.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist + .15, tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(tgt);
  renderer.render(scene, camera);
  frames++; fr++; fpsT += dt; if (fpsT > .5) { fpsEl.textContent = `${Math.round(fr / fpsT)} к/с`; fr = 0; fpsT = 0; }
  window.__pn.frames = frames;
  requestAnimationFrame(frame);
}


// ---------------------------------------------------------------- свет суток нового неба (v2, цвета из игры TOD_PNT)
const TODS = [
  { name: 'Как было', el: .48, lc: [1.25, 1.0, .72], sc: [.15, .15, .3], fog: '#183a30', sky: null },
  { name: 'Утро', el: .3, sunCol: [1.3, .95, .68], cSh: [.3, .26, .36], exp: 1, fog: '#4a3e44', sky: [[0, '#2a3450'], [.45, '#7a6470'], [.65, '#d09070'], [.74, '#f0b080'], [1, '#2a3030']] },
  { name: 'День', el: .75, sunCol: [1.25, 1.15, .95], cSh: [.42, .44, .56], exp: .95, fog: '#8a98a0', sky: [[0, '#3a5a90'], [.45, '#7a98b4'], [.68, '#b4b8b0'], [.74, '#d8d4c4'], [1, '#3a4a3a']] },
  { name: 'Вечер', el: .22, sunCol: [1.4, .78, .48], cSh: [.24, .12, .2], exp: 1.1, fog: '#3a2428', sky: [[0, '#141a34'], [.42, '#5a2a34'], [.62, '#c4602e'], [.72, '#f0a050'], [1, '#1e1418']] },
  { name: 'Ночь', el: .5, sunCol: [.8, .95, 1.7], cSh: [.02, .015, .06], exp: 3.2, fog: '#0c0a14', sky: [[0, '#04030c'], [.45, '#0e0a1e'], [.65, '#241634'], [.74, '#2a3a24'], [1, '#08080c']] },
];
let lightEl = .48;
function setTod(i) {
  const T = TODS[i];
  if (T.lc) { G.uLC.value.set(...T.lc); G.uSC.value.set(...T.sc); }
  else {
    const m = Math.max(...T.sunCol); const k = i === 4 ? .6 : 1.3;
    G.uLC.value.set(T.sunCol[0] / m * k, T.sunCol[1] / m * k, T.sunCol[2] / m * k);
    G.uSC.value.set(...T.cSh).multiplyScalar(T.exp * (i === 4 ? 1.6 : 1.05));
  }
  lightEl = T.el; scene.background = skyTexture(T.sky); scene.fog.color.set(T.fog);
  radio(document.getElementById('tods'), i);
}

// ---------------------------------------------------------------- кисть: рисовать нормали рукой (как автор видео)
// Мазок кисти пишет в карту нормалей Б выбранное направление и, если выбран цвет, — цвет в то же место.
const brush = { on: false, tool: 'plane', col: null, size: .025, objs: [] };
const STAMP_V = QUAD_V;
const stampN = new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Vector2() }, dir: { value: new THREE.Vector2(1, 0) }, r: { value: .02 }, nrm: { value: new THREE.Vector3(0, 0, 1) }, base: { value: null }, erase: { value: 0 }, seed: { value: 0 } },
  vertexShader: STAMP_V, transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  fragmentShader: `uniform vec2 c, dir; uniform float r, erase, seed; uniform vec3 nrm; uniform sampler2D base; varying vec2 vUv;
  ${NOISE}
  float brushMask(){ vec2 p = vUv - c; vec2 pr = vec2(-dir.y, dir.x);
    float a = dot(p, dir) / (r * 1.7), b = dot(p, pr) / r;
    float d = length(vec2(a, b)) + (n2(vUv / r * 1.3 + seed) - .5) * .35;
    float m = 1. - smoothstep(.75, 1., d);
    m *= .78 + .22 * step(.35, n2(vec2(b * 9., a * .8) + seed));   // щетина вдоль мазка
    return m; }
  void main(){ float m = brushMask(); if (m <= .001) discard;
    vec3 n = erase > .5 ? texture2D(base, vUv).rgb : nrm * .5 + .5; gl_FragColor = vec4(n, m); }` });
const stampC = new THREE.ShaderMaterial({ uniforms: { ...stampN.uniforms, col: { value: new THREE.Color() } },
  vertexShader: STAMP_V, transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  fragmentShader: stampN.fragmentShader.replace('uniform sampler2D base;', 'uniform sampler2D base; uniform vec3 col;').replace(/void main\(\)\{[\s\S]*\}$/, 'void main(){ float m = brushMask(); if (m <= .001) discard; gl_FragColor = erase > .5 ? vec4(0., 0., 0., m) : vec4(col, m * .75); }') });
// стирание цвета: альфа уменьшается
const stampCE = stampC.clone(); stampCE.uniforms = stampC.uniforms; stampCE.blendSrcAlpha = THREE.ZeroFactor; stampCE.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
function stampInto(mat, target) {
  const m = new THREE.Mesh(quadGeo, mat); m.frustumCulled = false; const sc = new THREE.Scene(); sc.add(m);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(target); renderer.render(sc, quadCam); renderer.setRenderTarget(null); renderer.autoClear = ac;
}
function paintable(mesh, mat, bk, k = 1) {
  const pc = rt(bk.S); renderer.setRenderTarget(pc); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.setRenderTarget(null);
  mat.uniforms.uPaintC.value = pc.texture; mat.uniforms.uHasPaint.value = 1;
  brush.objs.push({ mesh, mat, bk, pc, k });
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let stroke = null;
function hit(e) {
  const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hs = ray.intersectObjects(brush.objs.map(o => o.mesh), false);
  if (!hs.length || !hs[0].uv) return null;
  const o = brush.objs.find(b => b.mesh === hs[0].object); return { o, h: hs[0] };
}
function stampAt(o, uv, dir, n0) {
  const u = stampN.uniforms; u.c.value.copy(uv); u.dir.value.copy(dir); u.r.value = brush.size * o.k; u.seed.value = Math.random() * 50;
  u.erase.value = brush.tool === 'erase' ? 1 : 0; u.base.value = o.bk.base;
  // направление нормали в координатах модели: свет — к свету, тень — от света, плоскость — одна грань на весь мазок
  const inv = new THREE.Matrix3().setFromMatrix4(o.mesh.matrixWorld).invert();
  const Lo = G.uL.value.clone().applyMatrix3(inv).normalize();
  let n = n0.clone();
  if (brush.tool === 'light') n.addScaledVector(Lo, 1.1).normalize();
  else if (brush.tool === 'shadow') n.addScaledVector(Lo, -1.1).normalize();
  u.nrm.value.copy(n);
  for (const t of o.bk.rts) stampInto(stampN, t);
  if (brush.col || brush.tool === 'erase') { stampC.uniforms.col.value.set(brush.col || '#000'); stampInto(brush.tool === 'erase' ? stampCE : stampC, o.pc); }
}
canvas.addEventListener('pointerdown', e => {
  if (!brush.on) return; const H = hit(e); if (!H) return;
  if (G.uMode.value !== 2) setMode(2);
  canvas.setPointerCapture(e.pointerId);
  stroke = { o: H.o, uv: H.h.uv.clone(), n0: H.h.face.normal.clone(), dir: new THREE.Vector2(1, 0) };
  stampAt(stroke.o, stroke.uv, stroke.dir, stroke.n0);
});
canvas.addEventListener('pointermove', e => {
  if (!stroke) return; const H = hit(e); if (!H || H.o !== stroke.o) return;
  const uv = H.h.uv, d = uv.clone().sub(stroke.uv), L = d.length(), bs = brush.size * stroke.o.k; if (L < bs * .45) return;
  if (L > .25 * stroke.o.k) { stroke.uv.copy(uv); return; }   // перескок через шов UV
  stroke.dir.copy(d).normalize();
  const n0 = brush.tool === 'plane' ? stroke.n0 : H.h.face.normal;
  const steps = Math.ceil(L / (bs * .45));
  for (let i = 1; i <= steps; i++) stampAt(stroke.o, stroke.uv.clone().lerp(uv, i / steps), stroke.dir, n0);
  stroke.uv.copy(uv);
});
const endStroke = () => { stroke = null; };
canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);
function rebake(o) {
  const bk = bakePainted(o.mesh.geometry, o.mat.uniforms.uHasMap.value > .5 ? o.mat.uniforms.uMap.value : null);
  const u = o.mat.uniforms; u.uP0.value = bk.painted[0]; u.uP1.value = bk.painted[1]; u.uP2.value = bk.painted[2];
  if (bk.colors.length) { u.uC0.value = bk.colors[0]; u.uC1.value = bk.colors[1]; u.uC2.value = bk.colors[2]; }
  renderer.setRenderTarget(o.pc); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.setRenderTarget(null);
  return bk;
}
{
  const tods = document.getElementById('tods'); TODS.forEach((T, i) => btn(tods, T.name, () => setTod(i)));
  const tools = document.getElementById('btools');
  [['plane', 'Плоскость', 'одна грань на весь мазок, как стамеской'], ['light', 'Свет', 'нормаль к свету: блик там, где его нет'], ['shadow', 'Тень', 'нормаль от света: тень без причины'], ['erase', 'Стереть', 'вернуть нормаль модели']]
    .forEach(([k, t, d], i) => { const b = btn(tools, t, () => { brush.tool = k; radio(tools, i); }); b.title = d; });
  radio(tools, 0);
  const cols = document.getElementById('bcols');
  [[null, 'Без цвета'], ['#ffc890', 'Тёплый'], ['#6a7ad8', 'Холодный'], ['#c89a48', 'Охра'], ['#b8302a', 'Кровь'], ['#e8e0c8', 'Мел']]
    .forEach(([c, t], i) => { const b = btn(cols, t, () => { brush.col = c; radio(cols, i); }); if (c) b.style.borderLeft = `6px solid ${c}`; });
  radio(cols, 0);
  const bOn = document.getElementById('bOn');
  bOn.onclick = () => { brush.on = !brush.on; bOn.classList.toggle('on', brush.on); bOn.textContent = brush.on ? 'Кисть включена: рисуйте мышью' : 'Включить кисть';
    canvas.style.cursor = brush.on ? 'crosshair' : ''; if (brush.on) { lightAuto = false; document.getElementById('lightAuto').checked = false; if (view[0] === 'all') setView('ball'); } };
  const bs = document.getElementById('bSize'); bs.oninput = () => brush.size = +bs.value;
  document.getElementById('bClear').onclick = () => { for (const o of brush.objs) o.bk = rebake(o); };
}

window.__pn = { frames: 0, brush, stampAt, setTod, hitTest: hit, G, flags, setProfiles, PROFILES, setMode, setView, setAnim, applyFlags, chars, setLight: (a) => { lightA = a; lightAuto = false; } };

(async () => {
  try {
    const [b, l] = await Promise.all([addChar('bogatyr', 1.8, new THREE.Vector3(-1.0, 0, .6), .35), addChar('leshy', 2.6, new THREE.Vector3(1.35, 0, .3), -.4)]);
    for (const ch of [b, l]) {
      const bk = bakePainted(ch.skinned.geometry, ch.mat.uniforms.uMap.value);
      const u = ch.mat.uniforms; u.uP0.value = bk.painted[0]; u.uP1.value = bk.painted[1]; u.uP2.value = bk.painted[2]; u.uHasBake.value = 1;
      if (bk.colors.length) { u.uC0.value = bk.colors[0]; u.uC1.value = bk.colors[1]; u.uC2.value = bk.colors[2]; }
      ch.bake = bk; paintable(ch.skinned, ch.mat, bk, .3);
    }
    { const bk = bakePainted(BALL.geometry, null); const u = BALL.material.uniforms; u.uP0.value = bk.painted[0]; u.uP1.value = bk.painted[1]; u.uP2.value = bk.painted[2]; u.uHasBake.value = 1; paintable(BALL, BALL.material, bk); }
    setAnim('Idle');
  } catch (e) { console.error(e); document.getElementById('loading').innerHTML = 'Не удалось загрузить модели<small>' + e.message + '</small>'; return; }
  document.getElementById('loading').remove();
  setMode(1); setView('all'); radio(lookEl, 0); applyFlags(); setTod(0);
  requestAnimationFrame(t0 => { last = t0; frame(t0); });
})();
