// Живой огонь «Сказанья о Тени» (прототип v1).
//   WildFire — дикий огонь: узлы горения на поверхностях и гранях предметов, нагрев соседей
//              (вверх и по ветру сильнее), топливо по материалу, искры поджигают через зазоры,
//              раскаление подложки (трещины, ступени жара), обугливание, оседание сена,
//              падение прогоревших досок и жердей (простая физика твёрдого тела).
//   Torch    — огонь факела: один огонь, один источник включения (зажечь / погасить), не распространяется.
//   Пламя рисуется тремя формами (как в референсе: 3 формы + 2 волновых искажения + свечение + тень),
//   но формы всех языков сливаются в одну массу: сначала тушь всех языков, затем наружный тон, середина, ядро.
//   Всё видимое меняется шагами 12 к/с.
import * as THREE from 'three';
import { RISE, FLICK, BURST } from './firestrokes.js';
THREE.ColorManagement.enabled = false;   // палитра идёт в кадр как есть (renderer.outputColorSpace = Linear)

export const FIRE = {
  ink: '#3a0c06', out: '#d8401c', mid: '#ff8a2a', core: '#ffd25a', hot: '#fff6d0',
  light: '#ff9a40', rim: '#ffc27a', deep: '#7a1a0a',
  smoke: '#4a4048', smokeHi: '#7a6a70', smokeInk: '#1c1418', steam: '#9fb0aa', steamHi: '#dfe8e2',
  char: '#15110e', ash: '#52504a',
};
// heatCap — сколько тепла нужно, чтобы вспыхнуть; fuel — секунд горения; flame — высота языков;
// spark — сколько искр; shrink — оседание при прогорании; cool — остывание.
export const FUELS = {
  hay:   { name: 'Сено',        heat: 1.2, heatCap: .5,  fuel: 14, flame: 1.05, spark: 1.6, shrink: .55, cool: .5 },
  wood:  { name: 'Доски',       heat: 1, heatCap: 1.8, fuel: 32, flame: .8,  spark: .55, shrink: .02, cool: .4 },
  log:   { name: 'Поленья',     heat: 1, heatCap: 2.6, fuel: 50, flame: .85, spark: .7,  shrink: .04, cool: .35 },
  grass: { name: 'Сухая трава', heat: 2.4, heatCap: .32, fuel: 4, flame: .85, spark: .35, shrink: 0,   cool: .7 },
  cloth: { name: 'Ткань',       heat: 1, heatCap: .6,  fuel: 10, flame: .7,  spark: .4,  shrink: .15, cool: .6 },
};
// Как материал раскаляется (вершины): скорость нагрева и остывания.
const HEAT_RATE = { wood: [2.2, .5], log: [1.6, .3], hay: [2.6, .7], grass: [2.5, .6], cloth: [2.5, .6], stone: [.35, .07], ground: [1.2, .2] };

export const NOISE = /* glsl */`
float pfH11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float pfH21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 pfH22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float pfNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(pfH21(i), pfH21(i + vec2(1, 0)), u.x), mix(pfH21(i + vec2(0, 1)), pfH21(i + vec2(1, 1)), u.x), u.y); }
`;

const c3 = (h) => new THREE.Color(h);
const STEP_FPS = 12;

// ---------------------------------------------------------------- общие униформы света сцены
export const SHARED = {
  uFireP: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
  uFireC: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uFireN: { value: 0 },
  uMoonDir: { value: new THREE.Vector3(-.45, .8, .35).normalize() },
  uMoonCol: { value: new THREE.Color(.68, .78, .58) },
  uAmb: { value: new THREE.Color('#1a2a30') },
  uShade: { value: c3('#33335f') },
  uFog: { value: c3('#183a30') },
  uFogD: { value: .03 },
  uStep: { value: 0 },
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector3() },
  uRim: { value: c3(FIRE.rim) },
  cDeep: { value: c3(FIRE.deep) }, cOut: { value: c3(FIRE.out) }, cMid: { value: c3(FIRE.mid) }, cCore: { value: c3(FIRE.core) }, cHot: { value: c3(FIRE.hot) },
  cChar: { value: c3(FIRE.char) }, cAsh: { value: c3(FIRE.ash) },
};

// ---------------------------------------------------------------- материал мира (toon + жар + уголь)
const TOON_VERT = /* glsl */`
attribute float aHeat; attribute float aChar; attribute float aMix;
uniform float uShrink, uHull, uFlag, uTime; uniform vec3 uWind;
varying vec3 vW, vN, vL; varying float vHeat, vChar, vMix;
void main(){
  vec3 p = position;
  p = p * (1. - aChar * uShrink) - vec3(0., aChar * uShrink * .45, 0.);   // прогорая, оседает к низу
  if (uFlag > 0.) {                    // полотнище флага: x вдоль, колышется по ветру шагами
    float s = length(uWind); float x = position.x;
    float t = floor(uTime * 10.) / 10.;
    p.z += sin(x * 7. - t * (4. + 8. * s)) * x * (.05 + .1 * s);
    p.y -= (1. - min(s * 1.6, 1.)) * x * x * .5;
  }
  #ifdef HULL
  p += normal * uHull;
  #endif
  vec4 w = modelMatrix * vec4(p, 1.);
  vW = w.xyz; vL = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vHeat = aHeat; vChar = aChar; vMix = aMix;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const TOON_FRAG = /* glsl */`
uniform vec3 uBase, uBase2, uShade, uAmb, uFog, uInk, uRim, uMoonCol, uMoonDir;
uniform vec3 cDeep, cOut, cMid, cCore, cHot, cChar, cAsh;
uniform float uFogD, uKind, uStep;
uniform vec3 uFireP[8]; uniform vec4 uFireC[8]; uniform int uFireN;
varying vec3 vW, vN, vL; varying float vHeat, vChar, vMix;
${NOISE}
float crack(vec3 p, vec3 n){
  vec2 q = abs(n.y) > .6 ? p.xz : (abs(n.x) > abs(n.z) ? p.zy : p.xy);
  q *= uKind < .5 || abs(uKind - 5.) < .5 ? vec2(7., 3.) : vec2(3.4);
  vec2 ip = floor(q), fp = fract(q); float d1 = 9., d2 = 9.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 r = g + pfH22(ip + g) - fp; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
void main(){
  float dist = length(vW - cameraPosition);
  float fogK = 1. - exp(-pow(dist * uFogD, 2.));
#ifdef HULL
  vec3 ink = mix(uInk, vec3(.227, .047, .024), clamp(vHeat * 1.4, 0., 1.));
  gl_FragColor = vec4(mix(ink, uFog, fogK * .9), 1.);
  return;
#endif
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 V = normalize(cameraPosition - vW);
  vec3 base = uBase;
  int k = int(uKind + .5);
  if (k == 0) {        // доски: волокно вдоль, мазками
    float g = pfNoise(vec2(vL.x * 16. + vL.z * 16., vL.y * 1.3));
    base *= .84 + .3 * step(.56, g) - .12 * step(g, .25);
  } else if (k == 1) { // сено: соломины
    float g = pfNoise(vec2((vL.x + vL.z) * 22., vL.y * 3.2 + vL.x * 4.));
    base *= .8 + .38 * step(.5, g);
  } else if (k == 2) { // камень: грани-пятна
    float g = pfNoise(vW.xz * 2.2 + vW.y * 2.6);
    base *= .78 + .34 * step(.5, g);
  } else if (k == 3) { // земля: крупные пятна и сухой пал
    float g = pfNoise(vW.xz * .7); float g2 = pfNoise(vW.xz * 5.3 + 9.);
    base = mix(uBase, uBase2, step(.5, vMix + (g2 - .5) * .35));
    base *= .88 + .2 * step(.55, g) + .08 * step(.6, g2);
  } else if (k == 5) { // поленья: торец кольцами только на торцах
    float g = pfNoise(vec2(vL.y * 14., vL.x * 1.2 + vL.z * 1.2));
    base *= .84 + .28 * step(.55, g);
  }
  // луна: две ступени и холодная тень
  float m = dot(n, uMoonDir);
  float mb = m > .3 ? 1. : (m > -.15 ? .6 : .36);
  vec3 col = base * (uAmb + uMoonCol * mb * .62);
  col = mix(col, col * uShade * 2.2, (1. - mb) * .45);
  // огонь: пятна света ступенями с тёмной каймой
  vec3 fl = vec3(0.); float fs = 0.;
  for (int i = 0; i < 8; i++) {
    if (i >= uFireN) break;
    vec3 L = uFireP[i] - vW; float d = length(L);
    float a = clamp(1. - d / uFireC[i].w, 0., 1.); a *= a;
    float nd = max(dot(n, L / max(d, 1e-3)), 0.) * .75 + .25;
    float e = a * nd; fl += uFireC[i].rgb * e; fs += e * (uFireC[i].r + uFireC[i].g) * .5;
  }
  float fb = fs > .85 ? 1. : (fs > .38 ? .62 : (fs > .11 ? .3 : 0.));
  float kem = (fs > .085 && fs < .11) ? .78 : 1.;
  vec3 fc = fs > 1e-4 ? fl / max(fl.r, 1e-3) : vec3(0.);
  col = col * kem + base * fc * fb * 1.35 + fc * fb * .035;
  // линия со стороны огня
  float fr = 1. - max(dot(n, V), 0.);
  if (fr > .62 && fb > .25) col = mix(col, uRim, .5 * fb);
  // уголь
  float ch = vChar;
  if (ch > .22) col *= .5;
  if (ch > .55) {
    float ash = step(.74, pfNoise(vW.xz * 17. + vW.y * 9.));
    col = mix(cChar * (.7 + .9 * fb), cAsh * (.55 + .5 * fb), ash * .55);
    // штрихи тушью по углю (рваные, наискось)
    float hl = fract((vW.x + vW.z) * 8. + vW.y * 8. + pfNoise(vW.xz * 2. + vW.y) * 1.6);
    float brk = step(.4, pfNoise(vW.xz * 5. + vW.y * 4.));
    col = mix(col, vec3(.035, .028, .024), step(.82, hl) * brk * .85);
  }
  // раскаление: тон подложки и трещины ступенями
  float h = vHeat; if (k == 3) h = min(h, .98);
  if (h > .18) {
    float cr = crack(vW, n);
    float lineW = .035 + .035 * min(h, 1.2) + (ch > .55 ? .03 : 0.);
    float edge = step(cr, lineW);
    vec3 tint = h > 1.05 ? cMid : (h > .75 ? cOut : (h > .45 ? cDeep : cDeep * .55));
    float tk = h > 1.05 ? .45 : (h > .75 ? .32 : (h > .45 ? .22 : .12));
    if (k == 2) tk *= .5;                     // камень калится трещинами, а не целиком
    col = mix(col, tint, tk);
    vec3 cc = h > 1.05 ? cHot : (h > .75 ? cCore : (h > .45 ? cMid : cOut));
    col = mix(col, cc, edge * (h > .3 ? 1. : .5));
  }
  col = mix(col, uFog, fogK * .88);
  gl_FragColor = vec4(col, 1.);
}`;

export function toonMaterial(o = {}) {
  const mk = (hull) => new THREE.ShaderMaterial({
    uniforms: {
      ...SHARED,
      uBase: { value: c3(o.color ?? '#5a4026') }, uBase2: { value: c3(o.color2 ?? o.color ?? '#5a4026') },
      uKind: { value: o.kind ?? 0 }, uShrink: { value: o.shrink ?? 0 }, uHull: { value: o.hull ?? .022 },
      uFlag: { value: o.flag ? 1 : 0 }, uInk: { value: c3(o.ink ?? '#0c0e16') },
    },
    defines: hull ? { HULL: 1 } : {},
    vertexShader: TOON_VERT, fragmentShader: TOON_FRAG,
    side: hull ? THREE.BackSide : (o.doubleSide ? THREE.DoubleSide : THREE.FrontSide),
  });
  const m = mk(false); m.userData.hull = o.outline === false ? null : mk(true); m.name = o.name ?? 'toon';
  return m;
}
// Подготовить геометрию: атрибуты жара и угля.
export function prepGeo(g) {
  const n = g.attributes.position.count;
  if (!g.attributes.aHeat) g.setAttribute('aHeat', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  if (!g.attributes.aChar) g.setAttribute('aChar', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  if (!g.attributes.aMix) g.setAttribute('aMix', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
// Меш с контуром-оболочкой.
export function toonMesh(geo, mat) {
  prepGeo(geo);
  const m = new THREE.Mesh(geo, mat);
  if (mat.userData.hull) { const h = new THREE.Mesh(geo, mat.userData.hull); h.renderOrder = -1; m.add(h); }
  return m;
}

// ---------------------------------------------------------------- пламя (3 формы, 4 прохода)
const FLAME_VERT = /* glsl */`
attribute vec3 aBase; attribute vec3 aLean; attribute vec4 aP; attribute vec3 aN;   // aP: ширина, высота, сид, сила; aN: нормаль опоры
varying vec2 vP; varying float vSeed, vAmt, vVert;
void main(){
  vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); R.y = 0.; R = normalize(R + vec3(1e-5, 0., 0.));
  float y = position.y, x = position.x;
  vec3 W = aBase + R * x * aP.x + vec3(0., 1., 0.) * y * aP.y + aLean * aP.y * y * y;
  // основание лежит в плоскости опоры: низ языка наклонён как поверхность, к верху выпрямляется
  vec3 n = length(aN) > .1 ? normalize(aN) : vec3(0., 1., 0.);
  float slope = clamp(-dot(n, R) / max(abs(n.y), .25) * sign(n.y + 1e-4), -1.6, 1.6);
  slope *= smoothstep(.12, .4, abs(n.y));            // у отвесных стен язык просто прижат к стене
  W.y += slope * x * aP.x * (1. - y) * (1. - y);
  W += normalize(cameraPosition - aBase) * .05;
  vP = vec2(x, y); vSeed = aP.z; vAmt = aP.w; vVert = 1. - smoothstep(.3, .75, abs(n.y));
  gl_Position = projectionMatrix * viewMatrix * vec4(W, 1.);
}`;
const FLAME_FRAG = /* glsl */`
uniform float uLayer, uStep; uniform vec3 cInk, cOut, cMid, cCore, cHot;
varying vec2 vP; varying float vSeed, vAmt, vVert;
${NOISE}
// язык: две волны (синус, прижат снизу) + рваный край шумом
float tongue(vec2 p, float wid, float s, float st){
  float y = p.y;
  float x = p.x + sin(y * 6.5 - st * 1.7 + s * 6.) * .075 * y + sin(y * 15. - st * 2.9 + s * 3.) * .03 * y;
  float w = wid * pow(max(1. - y, 0.), .78) * (.7 + .3 * smoothstep(0., .14, y));
  w *= mix(1., .1 + .9 * smoothstep(0., .32, y), vVert);   // на отвесной опоре язык растёт из узкого корня у самой поверхности
  float f = 1. - abs(x) / max(w, 1e-3);
  f -= (pfNoise(vec2(x * 7., y * 3.6 - st * .95) + s * 13.) - .5) * (.25 + y * 1.1);
  f += .22 * (1. - y);
  return f;
}
void main(){
  vec2 p = vP; float st = uStep + vSeed * 11.;
  int L = int(uLayer + .5);
  float f;
  if (L <= 1) {
    f = tongue(p, .4, vSeed, st);
    // оторвавшиеся капли над языком
    vec2 dq = vec2(p.x * 3.4, p.y * 2.3 - st * .5 + vSeed * 5.);
    vec2 di = floor(dq); vec2 df = fract(dq) - .5; vec2 dc = (pfH22(di + vSeed) - .5) * .45;
    float dm = step(.86, pfH21(di * 1.3 + vSeed)) * smoothstep(.5, .85, p.y) * (1. - smoothstep(.1, .24, abs(p.x)));
    if (dm > .01) f = max(f, (.26 - length((df - dc) * vec2(1., .8))) * 3.);
    if (L == 0) { if (f <= -.12) discard; gl_FragColor = vec4(cInk, 1.); return; }
    if (f <= 0.) discard;
    gl_FragColor = vec4(cOut, 1.); return;
  }
  if (L == 2) {
    if (vSeed > .8) discard;
    f = tongue(vec2(p.x * 1.15, p.y * 1.45), .3, vSeed + 1.7, st);
    if (f <= 0.) discard;
    // росчерки внутри языка: тёмные штрихи вдоль пламени, гнутся той же волной
    float sx = p.x + sin(p.y * 6.5 - st * 1.7 + vSeed * 6.) * .075 * p.y;
    float ln = fract(sx * 7.5 + vSeed * 3. + pfNoise(vec2(p.y * 3., vSeed * 9.)) * .6);
    bool streak = ln < .1 && p.y > .12 && p.y < .78 && f < .6;
    gl_FragColor = vec4(streak ? cOut : cMid, 1.); return;
  }
  if (vSeed > .36 || vAmt < .5) discard;
  f = tongue(vec2(p.x * 1.1, p.y * 2.3), .22, vSeed + 3.1, st);
  if (f <= 0.) discard;
  gl_FragColor = vec4(f > .55 ? cHot : cCore, 1.);
}`;

// Свечение-ореол: кольца ступенями, смешивание по максимуму (не пересвечивается от наложения).
const AURA_VERT = /* glsl */`
attribute vec3 aBase; attribute vec2 aA;   // радиус, сила
varying vec2 vP; varying float vI;
void main(){
  vec4 C = viewMatrix * vec4(aBase + vec3(0., aA.x * .22, 0.), 1.);
  C.xyz += normalize(-C.xyz) * aA.x * .55;
  C.xy += position.xy * aA.x * 2.;
  vP = position.xy; vI = aA.y;
  gl_Position = projectionMatrix * C;
}`;
const AURA_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uStep;
varying vec2 vP; varying float vI;
${NOISE}
void main(){
  float r = length(vP) * 2.;
  float a = atan(vP.y, vP.x);
  r += (pfNoise(vec2(a * 2.2, uStep * .7)) - .5) * .08;   // рваный край колец
  float v = (1. - r) * vI;
  float l = v > .55 ? .42 : (v > .3 ? .25 : (v > .1 ? .12 : 0.));
  if (l <= 0.) discard;
  gl_FragColor = vec4(uCol * l, 1.);
}`;
const HAZE_FRAG = /* glsl */`
varying vec2 vP; varying float vI;
void main(){ float r = length(vP * vec2(1., .7)) * 2.; float v = max(1. - r, 0.); v *= v * vI * .6; gl_FragColor = vec4(v, v, v, 1.); }`;

// Дым и пар: клубы двумя тонами с тушью, тают дырами.
const PUFF_VERT = /* glsl */`
attribute vec3 aPos; attribute vec4 aS;   // радиус, сид, тон (0 дым, 1 пар), возраст 0..1
varying vec2 vP; varying vec4 vS;
void main(){
  vec4 C = viewMatrix * vec4(aPos, 1.);
  C.xy += position.xy * aS.x * 2.;
  vP = position.xy; vS = aS;
  gl_Position = projectionMatrix * C;
}`;
const PUFF_FRAG = /* glsl */`
uniform vec3 cA, cB, cInk, cWarm, cSA, cSB; uniform float uStep;
varying vec2 vP; varying vec4 vS;
${NOISE}
void main(){
  vec2 p = vP * 2.; float r = length(p);
  float a = atan(p.y, p.x);
  float edge = (pfNoise(vec2(a * 1.6 + vS.y * 9., uStep * .25 + vS.y)) - .5) * .14;
  float f = 1. - r + edge;
  float hole = pfNoise(p * 2.3 + vS.y * 17.);
  if (f <= vS.w * .6) discard;
  float lit = dot(normalize(p + 1e-4), normalize(vec2(-.55, .83)));
  bool steam = vS.z > .5;
  vec3 c = lit > .1 ? (steam ? cSB : cB) : (steam ? cSA : cA);
  if (!steam && vS.w < .3 && lit < -.35) c = cWarm;   // низ клуба подсвечен огнём
  if (f < .1) c = steam ? cSA * .6 : cInk;
  gl_FragColor = vec4(c, 1.);
}`;
// Искры.
const EMBER_VERT = /* glsl */`
attribute vec2 aE; varying float vH;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = aE.y * 260. / -mv.z; vH = aE.x; gl_Position = projectionMatrix * mv; }`;
const EMBER_FRAG = /* glsl */`
uniform vec3 cHot, cCore, cMid, cDeep; varying float vH;
void main(){ vec2 q = abs(gl_PointCoord - .5); if (q.x + q.y > .5) discard;
  vec3 c = vH > .75 ? cHot : (vH > .5 ? cCore : (vH > .25 ? cMid : cDeep)); gl_FragColor = vec4(c, 1.); }`;
// Росчерки (ленты по почеркушкам) и чёрточки искр.
const RIB_VERT = /* glsl */`attribute vec3 aC; varying vec3 vC; void main(){ vC = aC; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`;
const RIB_FRAG = /* glsl */`varying vec3 vC; void main(){ gl_FragColor = vec4(vC, 1.); }`;
// Пепел: плоские хлопья, кувыркаются (ширина ступенями), горячие с оранжевой каймой.
const ASH_VERT = /* glsl */`
attribute vec4 aA; varying vec4 vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = aA.y * 300. / -mv.z; vA = aA; gl_Position = projectionMatrix * mv; }`;
const ASH_FRAG = /* glsl */`
uniform vec3 cA, cB, cHotA, cHotB; varying vec4 vA;
void main(){
  vec2 q = gl_PointCoord - .5; float c = cos(vA.x), s = sin(vA.x); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float wk = .2 + .8 * abs(cos(vA.x * 1.7));
  if (abs(q.x) > .46 * wk || abs(q.y) > .22 - q.x * .15) discard;
  vec3 col = vA.w > .5 ? cA : cB;
  if (vA.z > .2) col = cHotB; if (vA.z > .55) col = cHotA;
  if (vA.z > .2 && abs(q.y) < .1) col = mix(col, vA.w > .5 ? cA : cB, .5);
  gl_FragColor = vec4(col, 1.);
}`;
const NODE_VERT = /* glsl */`
attribute vec3 aC; varying vec3 vC;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = max(2.5, 70. / -mv.z); vC = aC; gl_Position = projectionMatrix * mv; }`;
const NODE_FRAG = /* glsl */`varying vec3 vC; void main(){ if (length(gl_PointCoord - .5) > .5) discard; gl_FragColor = vec4(vC, 1.); }`;

function quadGeo(y0 = 0, segY = 1) {
  const base = new THREE.PlaneGeometry(1, 1, 1, segY); base.translate(0, .5 - y0, 0);
  const g = new THREE.InstancedBufferGeometry(); g.setIndex(base.index); g.setAttribute('position', base.attributes.position);
  g.instanceCount = 0; return g;
}
function iattr(g, name, size, n) { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; }

// ---------------------------------------------------------------- хэш-сетка
class Grid {
  constructor(cell, size = 16384) { this.cell = cell; this.size = size; this.start = new Int32Array(size + 1); this.items = new Int32Array(0); this.key = new Int32Array(0); }
  h(ix, iy, iz) { return (((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) >>> 0) & (this.size - 1); }
  build(n, px, py, pz, filter) {
    if (this.key.length < n) { this.key = new Int32Array(n); this.items = new Int32Array(n); }
    const s = this.start; s.fill(0); const c = this.cell; let cnt = 0;
    for (let i = 0; i < n; i++) {
      if (filter && !filter(i)) { this.key[i] = -1; continue; }
      const k = this.h(Math.floor(px[i] / c), Math.floor(py[i] / c), Math.floor(pz[i] / c)); this.key[i] = k; s[k + 1]++; cnt++;
    }
    for (let k = 0; k < this.size; k++) s[k + 1] += s[k];
    const fill = new Int32Array(this.size); for (let i = 0; i < n; i++) { const k = this.key[i]; if (k < 0) continue; this.items[s[k] + fill[k]++] = i; }
  }
  query(x, y, z, r, cb) {
    const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c), z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) for (let iz = z0; iz <= z1; iz++) {
      const k = this.h(ix, iy, iz); for (let j = this.start[k]; j < this.start[k + 1]; j++) cb(this.items[j]);
    }
  }
}

const rnd = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();

// ---------------------------------------------------------------- дикий огонь
export class WildFire {
  constructor(scene, camera, opts = {}) {
    this.scene = scene; this.camera = camera;
    this.o = { spacing: .26, spread: 1, maxFlames: 1400, maxSparks: 420, maxSmoke: 320, ...opts };
    this.objects = []; this.nodes = [];
    this.wind = { angle: 0, strength: .35, gusts: true, dir: new THREE.Vector3(1, 0, 0), cur: 0 };
    this.t = 0; this.acc = 0; this.stepAcc = 0; this.step = 0;
    this.extraFlames = []; this.extraLights = []; this.extraAura = [];
    this.grid = new Grid(.8); this.bgrid = new Grid(1.0, 4096);
    this.stats = { burning: 0, smoulder: 0, burnt: 0, total: 0 };
    this.showNodes = false;
    this._buildRender();
  }

  // ---------- регистрация
  // mesh: toonMesh; fuel: ключ FUELS или null (не горит, но калится); kindHeat: ключ HEAT_RATE
  // phys: null | { type: 'topple', dir: Vector3 } | { type: 'fall' }
  addObject(mesh, fuel, o = {}) {
    mesh.updateWorldMatrix(true, true);
    const geo = mesh.geometry; prepGeo(geo);
    const ob = {
      mesh, fuel, F: fuel ? FUELS[fuel] : null, heatKind: o.heatKind ?? fuel ?? 'stone', phys: o.phys ?? null,
      n0: this.nodes.length, nN: 0, wpos: null, dirty: true, moving: false, fallen: false,
      init: { p: mesh.position.clone(), q: mesh.quaternion.clone() }, box: new THREE.Box3(), shrink: mesh.material.uniforms?.uShrink?.value ?? 0,
    };
    if (fuel) this._sampleNodes(ob, o.spacing ?? this.o.spacing);
    if (ob.phys) {
      geo.computeBoundingBox(); ob.lbox = geo.boundingBox.clone();
      ob.v = new THREE.Vector3(); ob.w = new THREE.Vector3(); ob.theta = 0; ob.thDot = 0; ob.sleep = 0;
    }
    this.objects.push(ob); this._cacheVerts(ob); this._updateNodeWorld(ob); return ob;
  }
  // Земля: сетка вершин, раскаляется и чернеет; узлы сухой травы там, где mask(x,z) > .5.
  addGround(mesh, mask, o = {}) {
    const ob = this.addObject(mesh, null, { heatKind: 'ground' });
    ob.ground = true;
    const sp = o.spacing ?? .3, b = o.bounds ?? [-10, 10, -10, 10];
    for (let x = b[0]; x <= b[1]; x += sp) for (let z = b[2]; z <= b[3]; z += sp) {
      const jx = x + (rnd() - .5) * sp * .7, jz = z + (rnd() - .5) * sp * .7;
      if (mask(jx, jz) < .5) continue;
      this._addNode(ob, new THREE.Vector3(jx, .03, jz), new THREE.Vector3(0, 1, 0), 'grass', false, true);
    }
    return ob;
  }
  _addNode(ob, lp, ln, fuel, edge, worldFixed = false) {
    const F = FUELS[fuel];
    this.nodes.push({ ob, lp, ln, wp: lp.clone(), wn: ln.clone(), F, fuel0: F.fuel * (.8 + rnd() * .4), fuel: 0, temp: 0, state: 0, I: 0, age: 0, emb: 0,
      edge, seed: rnd(), heatCap: F.heatCap * (edge ? .75 : 1), fixed: worldFixed, ground: worldFixed });
    const nd = this.nodes[this.nodes.length - 1]; nd.fuel = nd.fuel0; ob.nN++;
  }
  // Узлы: сначала по рёбрам (огонь держится граней), потом по площади, с минимальным расстоянием.
  _sampleNodes(ob, sp) {
    const g = ob.mesh.geometry.index ? ob.mesh.geometry.toNonIndexed() : ob.mesh.geometry;
    const P = g.attributes.position; const pts = [];
    const ok = (p) => { for (const q of pts) if (q.p.distanceToSquared(p) < sp * sp * .8) return false; return true; };
    const eg = new THREE.EdgesGeometry(ob.mesh.geometry, 35); const E = eg.attributes.position;
    const tri = []; let area = 0; const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.count; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
      n.subVectors(b, a).cross(_v.subVectors(c, a)); const ar = n.length() / 2; if (ar < 1e-6) continue;
      area += ar; tri.push({ a: a.clone(), b: b.clone(), c: c.clone(), n: n.clone().normalize(), ar, acc: area });
    }
    // нормаль ребра: среднее нормалей ближайших граней (наружу)
    const nearN = (p) => { const r = new THREE.Vector3(); for (const t of tri) { const d = _v.copy(t.a).add(t.b).add(t.c).multiplyScalar(1 / 3).distanceTo(p); if (d < sp * 2.5) r.addScaledVector(t.n, 1 / (d + .05)); } return r.lengthSq() > 0 ? r.normalize() : new THREE.Vector3(0, 1, 0); };
    for (let i = 0; i < E.count; i += 2) {
      a.fromBufferAttribute(E, i); b.fromBufferAttribute(E, i + 1); const L = a.distanceTo(b); const k = Math.max(1, Math.round(L / sp));
      for (let j = 0; j <= k; j++) { const p = a.clone().lerp(b, j / k); if (ok(p)) pts.push({ p, n: null, edge: true }); }
    }
    const tries = Math.ceil(area / (sp * sp) * 3);
    for (let t = 0; t < tries; t++) {
      const r = rnd() * area; let lo = 0, hi = tri.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (tri[m].acc < r) lo = m + 1; else hi = m; }
      const T = tri[lo]; let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
      const p = T.a.clone().addScaledVector(_v.subVectors(T.b, T.a), u).addScaledVector(_n.subVectors(T.c, T.a), v);
      if (ok(p)) pts.push({ p, n: T.n.clone(), edge: false });
    }
    // нормали треугольников из PlaneGeometry/Box смотрят наружу при обходе a,b,c против часовой — проверка по центру
    ob.mesh.geometry.computeBoundingBox(); const ctr = ob.mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
    for (const q of pts) {
      if (!q.n) q.n = nearN(q.p);
      // ширина опоры поперёк узла: язык не шире предмета, иначе низ висит в воздухе
      { const S = ob.mesh.geometry.boundingBox.getSize(new THREE.Vector3()); const n = q.n;
        if (Math.abs(n.y) < .7) { const t = new THREE.Vector3(-n.z, 0, n.x).normalize(); q.sw = Math.abs(t.x) * S.x + Math.abs(t.z) * S.z; }
        else q.sw = Math.max(S.x, S.z); }
      if (q.n.dot(_v.subVectors(q.p, ctr)) < -1e-3 && !ob.mesh.material.side) q.n.negate();
      this._addNode(ob, q.p, q.n, ob.fuel, q.edge); this.nodes[this.nodes.length - 1].sw = Math.max(.1, q.sw);
      // ближайшая вершина: узел садится туда же, куда её сдвигает оседание (языки не висят в воздухе)
      const VP = ob.mesh.geometry.attributes.position; let bi = 0, bd = 1e9;
      for (let i = 0; i < VP.count; i++) { const d = _v.fromBufferAttribute(VP, i).distanceToSquared(q.p); if (d < bd) { bd = d; bi = i; } }
      this.nodes[this.nodes.length - 1].vi = bi;
    }
    eg.dispose(); if (g !== ob.mesh.geometry) g.dispose();
  }
  _cacheVerts(ob) {
    const P = ob.mesh.geometry.attributes.position; if (!ob.wpos) ob.wpos = new Float32Array(P.count * 3);
    ob.mesh.updateWorldMatrix(true, true); const M = ob.mesh.matrixWorld;
    for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).applyMatrix4(M); ob.wpos[i * 3] = _v.x; ob.wpos[i * 3 + 1] = _v.y; ob.wpos[i * 3 + 2] = _v.z; }
    ob.box.setFromBufferAttribute(P).applyMatrix4(M);
    ob.vHeat = ob.vHeat ?? new Float32Array(P.count);
  }
  _updateNodeWorld(ob) {
    const M = ob.mesh.matrixWorld; _m3.getNormalMatrix(M);
    for (let i = ob.n0; i < ob.n0 + ob.nN; i++) {
      const nd = this.nodes[i]; if (nd.fixed) continue;
      const c = ob.shrink > 0 && nd.vi !== undefined ? ob.mesh.geometry.attributes.aChar.array[nd.vi] : 0;
      nd.wp.copy(nd.lp).multiplyScalar(1 - c * ob.shrink).add(_n.set(0, -c * ob.shrink * .45, 0)).applyMatrix4(M);
      nd.wn.copy(nd.ln).applyMatrix3(_m3).normalize();
    }
  }

  // ---------- управление
  setWind(angleDeg, strength) { this.wind.angle = angleDeg; this.wind.strength = strength; }
  ignite(p, r = .45, power = 2.2) {
    let hit = 0; this.nodes.forEach((nd) => { if (nd.state === 0 && nd.wp.distanceTo(p) < r) { nd.temp += power * nd.heatCap; hit++; } });
    for (let k = 0; k < 14; k++) this._spark(p, 1.2, .9);
    return hit;
  }
  douse(p, r = 1.6) {
    let n = 0;
    this.nodes.forEach((nd) => {
      if (nd.wp.distanceTo(p) > r) return;
      if (nd.state === 1) { nd.state = nd.fuel > nd.fuel0 * .15 ? 0 : 2; nd.I = 0; nd.emb = 0; n++; if (rnd() < .25) this._puff(nd.wp, 1, .16 + rnd() * .08); }
      if (nd.state === 2) { if (nd.emb > 0) n++; nd.emb = 0; }
      nd.temp = -3 * nd.heatCap;
    });
    for (const ob of this.objects) { if (ob.box.distanceToPoint(p) > r) continue;
      const W = ob.wpos; for (let i = 0; i < ob.vHeat.length; i++) { const dx = W[i * 3] - p.x, dy = W[i * 3 + 1] - p.y, dz = W[i * 3 + 2] - p.z; if (dx * dx + dy * dy + dz * dz < r * r) { if (ob.vHeat[i] > .3 && rnd() < .006) this._puff(_v.set(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]), 1, .16); ob.vHeat[i] *= .15; } } }
    for (let k = 0; k < Math.min(24, 6 + n * .3); k++) this._puff(_v.set(p.x + (rnd() - .5) * r, p.y + rnd() * .4, p.z + (rnd() - .5) * r), 1, .14 + rnd() * .14);
    this.sparks.forEach((s) => { if (s.life > 0 && _v.set(s.x, s.y, s.z).distanceTo(p) < r) s.life = 0; });
    return n;
  }
  reset() {
    for (const nd of this.nodes) { nd.state = 0; nd.temp = 0; nd.I = 0; nd.age = 0; nd.emb = 0; nd.fuel = nd.fuel0; }
    for (const ob of this.objects) {
      ob.mesh.position.copy(ob.init.p); ob.mesh.quaternion.copy(ob.init.q); ob.moving = false; ob.fallen = false; ob.theta = 0; ob.thDot = 0; ob.v?.set(0, 0, 0); ob.w?.set(0, 0, 0);
      ob.mesh.updateMatrixWorld(true); this._cacheVerts(ob); this._updateNodeWorld(ob); ob.vHeat.fill(0);
      const g = ob.mesh.geometry; g.attributes.aHeat.array.fill(0); g.attributes.aChar.array.fill(0); g.attributes.aHeat.needsUpdate = g.attributes.aChar.needsUpdate = true;
    }
    for (const s of this.sparks) s.life = 0; for (const s of this.smoke) s.life = 0; for (const s of this.ash) s.life = 0; this.marks.length = 0;
  }

  // ---------- кадр
  update(dt) {
    dt = Math.min(dt, .1); this.t += dt; SHARED.uTime.value = this.t;
    const w = this.wind; const gust = w.gusts ? .65 + .7 * (Math.sin(this.t * .63) * .5 + .5) * (Math.sin(this.t * 1.71 + 1.3) * .35 + .65) : 1;
    w.cur = w.strength * gust; const a = w.angle * Math.PI / 180; w.dir.set(Math.cos(a), 0, Math.sin(a));
    SHARED.uWind.value.copy(w.dir).multiplyScalar(w.cur);
    this.acc += dt; const SIM = 1 / 15;
    while (this.acc >= SIM) { this.acc -= SIM; this._sim(SIM); }
    this._physics(dt);
    this._sparksUpdate(dt); this._ashUpdate(dt);
    this.stepAcc += dt;
    if (this.stepAcc >= 1 / STEP_FPS) { this.stepAcc %= 1 / STEP_FPS; this.step++; SHARED.uStep.value = this.step; this._render(1 / STEP_FPS); }
  }

  _sim(dt) {
    const N = this.nodes.length; const px = this._px ??= new Float32Array(N), py = this._py ??= new Float32Array(N), pz = this._pz ??= new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = this.nodes[i].wp; px[i] = p.x; py[i] = p.y; pz[i] = p.z; }
    this.grid.build(N, px, py, pz);
    const W = this.wind, wd = W.dir, ws = W.cur, rate = .3 * this.o.spread;
    let burning = 0, smoulder = 0, burnt = 0;
    for (let i = 0; i < N; i++) this.nodes[i].recv = 0;
    for (let i = 0; i < N; i++) {
      const nd = this.nodes[i];
      if (nd.state === 1) {
        burning++;
        nd.age += dt; nd.fuel -= dt * (1 + ws * .6);
        const ramp = Math.min(1, nd.age / .7), tail = Math.min(1, nd.fuel / (nd.fuel0 * .3) + .12);
        nd.I = ramp * tail * (1 + ws * .25);
        if (nd.fuel <= 0) { nd.state = 2; nd.emb = 1; nd.I = 0; continue; }
        // нагрев соседей: вверх и по ветру сильнее, против ветра слабее
        const R = .75, I = nd.I * nd.F.heat * rate;
        const reach = 1 + .9 + ws * 1.2;
        this.grid.query(nd.wp.x, nd.wp.y, nd.wp.z, R * reach, (j) => {
          if (j === i) return; const m = this.nodes[j]; if (m.state !== 0) return;
          const dx = m.wp.x - nd.wp.x, dy = m.wp.y - nd.wp.y, dz = m.wp.z - nd.wp.z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4;
          const up = Math.max(0, dy / d), wdot = (dx * wd.x + dz * wd.z) / d;
          const rr = R * (1 + .9 * up + ws * 1.2 * Math.max(0, wdot));
          if (d > rr) return; const f = 1 - d / rr;
          const k = I * f * f * (1 + 2.6 * up) * Math.max(.12, 1 + 2.2 * ws * wdot) * (m.ob !== nd.ob ? .8 : 1);
          m.recv += k * dt;
        });
        // искры, пепел и дым
        if (rnd() < nd.I * dt * (nd.F.spark > 1 ? 1.1 : .5)) this._ashSpawn(nd.wp, .9);
        if (rnd() < nd.I * nd.F.spark * dt * .9) this._spark(nd.wp, .6 + nd.I * .6, nd.F.spark > 1 ? .9 : .6);
        if (rnd() < nd.I * dt * (.3 + (1 - nd.fuel / nd.fuel0) * .5) * .09) this._puff(_v.copy(nd.wp).addScaledVector(nd.wn, .1).add(_n.set(0, 1.3 * nd.F.flame, 0)), 0, .12 + rnd() * .1);
      } else if (nd.state === 0) {
        if (nd.temp >= nd.heatCap) { nd.state = 1; nd.age = 0; continue; }
        nd.temp -= nd.temp * nd.F.cool * dt;
      } else {
        burnt++;
        if (nd.emb > 0) { smoulder++; nd.emb -= dt / (nd.F.fuel * .35 + 2); if (rnd() < nd.emb * dt * .06) this._puff(nd.wp, 0, .09); if (rnd() < nd.emb * dt * .05) this._ashSpawn(nd.wp, .4); }
      }
    }
    for (let i = 0; i < N; i++) { const m = this.nodes[i]; if (m.state === 0 && m.recv > 0) m.temp += Math.min(m.recv, m.heatCap * 1.2 * dt); }
    this.stats.burning = burning; this.stats.smoulder = smoulder; this.stats.burnt = burnt; this.stats.total = N;
  }

  // ---------- физика прогоревших досок и жердей
  _physics(dt) {
    for (const ob of this.objects) {
      if (ob.phys?.type === 'settle') { this._settle(ob, dt); continue; }
      if (!ob.phys || ob.fallen && !ob.moving) continue;
      if (!ob.moving) {
        // проверить прочность: сколько прогорело в нижней трети (доска) или с любого конца (жердь)
        let low = 0, lowB = 0, all = 0, allB = 0; const lb = ob.lbox;
        for (let i = ob.n0; i < ob.n0 + ob.nN; i++) { const nd = this.nodes[i]; const b = nd.state === 2 || (nd.state === 1 && nd.fuel < nd.fuel0 * .5) ? 1 : 0; all++; allB += b;
          if (ob.phys.type === 'topple' ? nd.lp.y < lb.min.y + (lb.max.y - lb.min.y) * .33 : (nd.lp.x < lb.min.x + (lb.max.x - lb.min.x) * .25 || nd.lp.x > lb.max.x - (lb.max.x - lb.min.x) * .25)) { low++; lowB += b; } }
        if (low && lowB / low > .5 || allB / Math.max(all, 1) > .6) { ob.moving = true; ob.fallen = true; ob.thDot = .4; if (ob.phys.type === 'fall') ob.w.set((rnd() - .5) * .6, (rnd() - .5) * .4, (rnd() - .5) * 1.2); }
        continue;
      }
      const sub = 3, h = dt / sub;
      for (let s = 0; s < sub; s++) {
        if (ob.phys.type === 'topple') {
          const L = ob.lbox.max.y - ob.lbox.min.y;
          ob.thDot += 1.5 * 9.8 / L * Math.sin(Math.max(ob.theta, .02)) * h; ob.theta += ob.thDot * h;
          if (ob.theta >= 1.5) { ob.theta = 1.5; if (ob.thDot > .6) { ob.thDot *= -.25; for (let k = 0; k < 6; k++) this._spark(ob.mesh.position.clone().addScaledVector(ob.phys.dir, L * .7), 1.5, .7); this._puff(ob.mesh.position.clone().addScaledVector(ob.phys.dir, L * .6), 0, .5); } else { ob.thDot = 0; ob.moving = false; } }
          const axis = _v.set(0, 1, 0).cross(ob.phys.dir).normalize();
          ob.mesh.quaternion.copy(ob.init.q).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ob.theta));
        } else {
          ob.v.y -= 9.8 * h; ob.mesh.position.addScaledVector(ob.v, h);
          const wl = ob.w.length(); if (wl > 1e-5) ob.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(_n.copy(ob.w).divideScalar(wl), wl * h));
          ob.mesh.updateMatrixWorld(true);
          // контакт углов коробки с землёй
          const lb = ob.lbox, m = 1, Iner = Math.max(.05, (lb.max.x - lb.min.x) ** 2 / 12);
          let pen = 0;
          for (let c = 0; c < 8; c++) {
            const cp = _v.set(c & 1 ? lb.max.x : lb.min.x, c & 2 ? lb.max.y : lb.min.y, c & 4 ? lb.max.z : lb.min.z).applyMatrix4(ob.mesh.matrixWorld);
            if (cp.y >= 0) continue; pen = Math.max(pen, -cp.y);
            const r = cp.sub(ob.mesh.position); const vc = _n.copy(ob.w).cross(r).add(ob.v);
            if (vc.y < 0) {
              const rn = new THREE.Vector3().crossVectors(r, new THREE.Vector3(0, 1, 0)); const denom = 1 / m + rn.lengthSq() / Iner;
              const j = -(1 + .2) * vc.y / denom; ob.v.y += j / m; ob.w.add(new THREE.Vector3().crossVectors(r, new THREE.Vector3(0, j, 0)).divideScalar(Iner));
              ob.v.x *= .9; ob.v.z *= .9;
            }
          }
          if (pen > 0) { ob.mesh.position.y += pen; ob.w.multiplyScalar(.97); }
          if (ob.v.lengthSq() + ob.w.lengthSq() < .01 && pen > 0) { ob.sleep += h; if (ob.sleep > .4) ob.moving = false; } else ob.sleep = 0;
        }
      }
      ob.mesh.updateMatrixWorld(true); this._cacheVerts(ob); this._updateNodeWorld(ob);
    }
  }

  // Лежит на других предметах: когда опора оседает или сгорает, опускается вслед (падает с ускорением).
  _settle(ob, dt) {
    let bottom = 1e9, cx = 0, cz = 0, n = 0;
    for (let i = ob.n0; i < ob.n0 + ob.nN; i++) { const p = this.nodes[i].wp; bottom = Math.min(bottom, p.y); cx += p.x; cz += p.z; n++; }
    if (!n) return; cx /= n; cz /= n;
    const hx = ob.phys.hx ?? .45, hz = ob.phys.hz ?? .35; let sup = 0;
    this.grid.query(cx, bottom, cz, Math.max(hx, hz) + .3, (j) => { const m = this.nodes[j]; if (m.ob === ob || m.ground) return;
      if (Math.abs(m.wp.x - cx) < hx && Math.abs(m.wp.z - cz) < hz && m.wp.y < bottom + .12 && m.wp.y > sup) sup = m.wp.y; });
    const gap = bottom - sup;
    if (gap > .04) { ob.v.y -= 9.8 * dt; const dy = Math.max(ob.v.y * dt, -gap); ob.mesh.position.y += dy; ob.moving = true; }
    else { if (ob.moving && ob.v.y < -1.5) { for (let k = 0; k < 6; k++) this._spark(_v.set(cx, bottom, cz), 1.3, .8); this._puff(_v.set(cx, bottom + .2, cz), 0, .2); } ob.v.y = 0; ob.moving = false; return; }
    ob.mesh.updateMatrixWorld(true); this._cacheVerts(ob); this._updateNodeWorld(ob);
  }

  // ---------- искры: летят вверх и по ветру, падая, поджигают
  _spark(p, power = 1, hot = .8) {
    const s = this.sparks.find((q) => q.life <= 0); if (!s) return;
    s.x = p.x + (rnd() - .5) * .15; s.y = p.y + .1; s.z = p.z + (rnd() - .5) * .15;
    s.vx = (rnd() - .5) * 1.2 * power; s.vy = (1.2 + rnd() * 2.2) * power; s.vz = (rnd() - .5) * 1.2 * power;
    s.life = s.life0 = 1.2 + rnd() * 2.4; s.hot = hot; s.size = .03 + rnd() * .035; s.landed = false;
  }
  _sparksUpdate(dt) {
    const wd = this.wind.dir, ws = this.wind.cur;
    for (const s of this.sparks) {
      if (s.life <= 0) continue; s.life -= dt;
      if (s.landed) { if (s.life <= 0) this._sparkLand(s, .3); continue; }
      const lift = 2.2 * Math.max(0, s.life / s.life0 - .45);
      s.vy += (lift - 3.2) * dt;
      s.vx += (wd.x * ws * 4.5 - s.vx) * dt * 1.4; s.vz += (wd.z * ws * 4.5 - s.vz) * dt * 1.4;
      s.vx += (rnd() - .5) * 3 * dt; s.vz += (rnd() - .5) * 3 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y <= .02) { s.y = .02; s.landed = true; s.life = Math.min(s.life, .6 + rnd() * 1.2); this._sparkLand(s, 1); }
      else if (s.vy < 0 && rnd() < dt * 4) this._sparkLand(s, .35);   // задела что-то по пути
    }
  }
  _ashSpawn(p, hot) {
    const a = this.ash.find((q) => q.life <= 0); if (!a) return;
    a.x = p.x + (rnd() - .5) * .2; a.y = p.y + .2; a.z = p.z + (rnd() - .5) * .2; a.vy = .8 + rnd() * 1.6; a.vx = (rnd() - .5) * .4; a.vz = (rnd() - .5) * .4;
    a.life = a.life0 = 5 + rnd() * 5; a.rot = rnd() * 6.28; a.spin = (rnd() - .5) * 7; a.size = .055 + rnd() * .05; a.hot = hot * (.6 + rnd() * .4); a.tone = rnd(); a.seed = rnd() * 50; a.landed = false;
  }
  _ashUpdate(dt) {
    const wd = this.wind.dir, ws = this.wind.cur, t = this.t;
    for (const a of this.ash) {
      if (a.life <= 0) continue; a.life -= dt; a.hot = Math.max(0, a.hot - dt * .45);
      if (a.landed) continue;
      a.vy += (-.32 - a.vy) * dt * .7;                         // всплывает с жаром, потом медленно оседает
      a.vx += (wd.x * ws * 2.6 - a.vx) * dt * 1.2; a.vz += (wd.z * ws * 2.6 - a.vz) * dt * 1.2;
      const fl = Math.sin(t * 2.6 + a.seed) * .35;               // кружит
      a.x += (a.vx + fl * Math.cos(a.seed)) * dt; a.y += a.vy * dt; a.z += (a.vz + fl * Math.sin(a.seed)) * dt; a.rot += a.spin * dt;
      if (a.y <= .015) { a.y = .015; a.landed = true; a.rot = Math.round(a.rot / 1.57) * 1.57 + .3; a.life = Math.min(a.life, 2 + rnd() * 3); }
    }
  }
  _mark(kind, p, size, col, life) {
    if (this.marks.length >= 46) return;
    const src = kind === 'rise' ? RISE : kind === 'flick' ? FLICK : BURST;
    this.marks.push({ kind, x: p.x, y: p.y, z: p.z, size, col: c3(col), life, life0: life, data: src[Math.floor(rnd() * src.length)], flip: rnd() < .5 ? -1 : 1 });
  }
  _sparkLand(s, k) {
    const r = .32; this.grid.query(s.x, s.y, s.z, r, (i) => { const nd = this.nodes[i]; if (nd.state !== 0) return; const d = Math.hypot(nd.wp.x - s.x, nd.wp.y - s.y, nd.wp.z - s.z); if (d < r) nd.temp += s.hot * k * (1 - d / r) * .9; });
  }
  _puff(p, tone, r) {
    const s = this.smoke.find((q) => q.life <= 0); if (!s) return;
    s.x = p.x; s.y = p.y; s.z = p.z; s.r = r; s.r0 = r; s.tone = tone; s.seed = rnd(); s.life = s.life0 = tone ? 1.4 + rnd() : 1.8 + rnd() * 1.4;
    s.vy = tone ? 1.1 : .7 + rnd() * .5;
  }

  // ---------- сборка буферов (шагами)
  _buildRender() {
    const scene = this.scene, MF = this.o.maxFlames;
    // пламя: 4 прохода по одной геометрии
    const fg = quadGeo(0, 8);
    this.fA = { base: iattr(fg, 'aBase', 3, MF), lean: iattr(fg, 'aLean', 3, MF), p: iattr(fg, 'aP', 4, MF), n: iattr(fg, 'aN', 3, MF) };
    this.flameGeo = fg; this.flameMeshes = [];
    for (let L = 0; L < 4; L++) {
      const mat = new THREE.ShaderMaterial({ uniforms: { uLayer: { value: L }, uStep: SHARED.uStep, cInk: { value: c3(FIRE.ink) }, cOut: SHARED.cOut, cMid: SHARED.cMid, cCore: SHARED.cCore, cHot: SHARED.cHot },
        vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, side: THREE.DoubleSide, depthWrite: false, transparent: true });
      const m = new THREE.Mesh(fg, mat); m.frustumCulled = false; m.renderOrder = 20 + L; scene.add(m); this.flameMeshes.push(m);
    }
    // ореол
    const MA = 700; const ag = quadGeo(.5);
    this.aA = { base: iattr(ag, 'aBase', 3, MA), a: iattr(ag, 'aA', 2, MA) }; this.auraGeo = ag; this.maxAura = MA;
    this.aura = new THREE.Mesh(ag, new THREE.ShaderMaterial({ uniforms: { uCol: { value: c3(FIRE.light) }, uStep: SHARED.uStep }, vertexShader: AURA_VERT, fragmentShader: AURA_FRAG,
      depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    this.aura.frustumCulled = false; this.aura.renderOrder = 10; scene.add(this.aura);
    // марево (отдельная сцена-маска)
    this.hazeScene = new THREE.Scene();
    this.haze = new THREE.Mesh(ag, new THREE.ShaderMaterial({ vertexShader: AURA_VERT, fragmentShader: HAZE_FRAG, depthWrite: false, depthTest: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.haze.frustumCulled = false; this.hazeScene.add(this.haze);
    // дым
    const MS = this.o.maxSmoke; const sg = quadGeo(.5);
    this.sA = { pos: iattr(sg, 'aPos', 3, MS), s: iattr(sg, 'aS', 4, MS) }; this.smokeGeo = sg;
    this.smokeMesh = new THREE.Mesh(sg, new THREE.ShaderMaterial({ uniforms: { uStep: SHARED.uStep, cA: { value: c3('#2e2a32') }, cB: { value: c3(FIRE.smoke) }, cInk: { value: c3(FIRE.smokeInk) }, cWarm: { value: c3('#8a3a22') }, cSA: { value: c3(FIRE.steam) }, cSB: { value: c3(FIRE.steamHi) } },
      vertexShader: PUFF_VERT, fragmentShader: PUFF_FRAG }));
    this.smokeMesh.frustumCulled = false; this.smokeMesh.renderOrder = 30; scene.add(this.smokeMesh);
    this.smoke = Array.from({ length: MS }, () => ({ life: 0 }));
    // искры
    const MK = this.o.maxSparks; this.sparks = Array.from({ length: MK }, () => ({ life: 0 }));
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MK * 3), 3).setUsage(THREE.DynamicDrawUsage)); eg.setAttribute('aE', new THREE.BufferAttribute(new Float32Array(MK * 2), 2).setUsage(THREE.DynamicDrawUsage));
    this.embers = new THREE.Points(eg, new THREE.ShaderMaterial({ uniforms: { cHot: SHARED.cHot, cCore: SHARED.cCore, cMid: SHARED.cMid, cDeep: SHARED.cDeep }, vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG }));
    this.embers.frustumCulled = false; this.embers.renderOrder = 31; scene.add(this.embers);
    // росчерки
    const MV = 48000; const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MV * 3), 3).setUsage(THREE.DynamicDrawUsage));
    rg.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(MV * 3), 3).setUsage(THREE.DynamicDrawUsage)); rg.setDrawRange(0, 0);
    this.rib = new THREE.Mesh(rg, new THREE.ShaderMaterial({ vertexShader: RIB_VERT, fragmentShader: RIB_FRAG, side: THREE.DoubleSide, depthWrite: false, transparent: true }));
    this.rib.frustumCulled = false; this.rib.renderOrder = 26; scene.add(this.rib); this.ribMax = MV; this.marks = [];
    // пепел
    const MA2 = 360; this.ash = Array.from({ length: MA2 }, () => ({ life: 0 }));
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MA2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(MA2 * 4), 4).setUsage(THREE.DynamicDrawUsage));
    this.ashPts = new THREE.Points(hg, new THREE.ShaderMaterial({ uniforms: { cA: { value: c3('#8e8a80') }, cB: { value: c3('#3e3a36') }, cHotA: { value: c3(FIRE.mid) }, cHotB: { value: c3(FIRE.deep) } }, vertexShader: ASH_VERT, fragmentShader: ASH_FRAG }));
    this.ashPts.frustumCulled = false; this.ashPts.renderOrder = 32; scene.add(this.ashPts);
    // отладка: узлы
    this.nodePts = null;
  }
  _ensureNodePts() {
    if (this.nodePts) return; const N = this.nodes.length; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.nodePts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, depthTest: true }));
    this.nodePts.frustumCulled = false; this.nodePts.renderOrder = 40; this.scene.add(this.nodePts);
  }

  _render(dt) {
    const N = this.nodes.length, W = this.wind, ws = W.cur, wd = W.dir, st = this.step;
    // --- языки
    const fb = this.fA.base.array, fl = this.fA.lean.array, fp = this.fA.p.array, fn = this.fA.n.array; let nf = 0;
    const auraB = this.aA.base.array, auraA = this.aA.a.array; let na = 0;
    const pushFlame = (x, y, z, lx, ly, lz, w, h, seed, amt, n) => {
      if (nf >= this.o.maxFlames) return; fn[nf * 3] = n ? n.x : 0; fn[nf * 3 + 1] = n ? n.y : 1; fn[nf * 3 + 2] = n ? n.z : 0; fb[nf * 3] = x; fb[nf * 3 + 1] = y; fb[nf * 3 + 2] = z; fl[nf * 3] = lx; fl[nf * 3 + 1] = ly; fl[nf * 3 + 2] = lz;
      fp[nf * 4] = w; fp[nf * 4 + 1] = h; fp[nf * 4 + 2] = seed; fp[nf * 4 + 3] = amt; nf++;
    };
    const pushAura = (p, r, i) => { if (na >= this.maxAura) return; auraB[na * 3] = p.x; auraB[na * 3 + 1] = p.y; auraB[na * 3 + 2] = p.z; auraA[na * 2] = r; auraA[na * 2 + 1] = i; na++; };
    const cells = new Map();
    for (let i = 0; i < N; i++) {
      const nd = this.nodes[i];
      if (nd.state === 1 && nd.I > .03) {
        const drawF = !(nd.wn.y < -.55 || (!nd.edge && nd.seed > .5 && !nd.ground) || (nd.edge && nd.seed > .8));
        const flick = .82 + .36 * hash(nd.seed * 97 + st * .37);
        const h = (.28 + .72 * nd.I) * nd.F.flame * (nd.edge ? 1.2 : 1) * flick * (.55 + hash(nd.seed * 71.3) * 1.);
        const turb = (hash(nd.seed * 31 + st * .21) - .5) * .35;
        const lean = ws * (1.15 + nd.seed * .5);
        const bx = nd.wp.x + nd.wn.x * .025, by = nd.wp.y - .03, bz = nd.wp.z + nd.wn.z * .025;   // основание языка врезано в поверхность
        // на стене пламя прижато к поверхности и загибается от неё вверх
        const wallK = (1 - Math.abs(nd.wn.y)) * .35;
        if (drawF) pushFlame(bx, by, bz, wd.x * lean + nd.wn.x * wallK + turb * wd.z, 0, wd.z * lean + nd.wn.z * wallK - turb * wd.x, Math.min(h * .62, (nd.sw ?? 9) * 1.3 + .08), h, nd.seed, nd.I, nd.wn);
        if (nd.seed < .45 || nd.edge) pushAura(nd.wp, .55 + nd.I * .9 * nd.F.flame, .55 + .45 * nd.I);
        const ck = `${Math.floor(nd.wp.x / 2.4)},${Math.floor(nd.wp.z / 2.4)}`; let c = cells.get(ck);
        if (!c) { c = { x: 0, y: 0, z: 0, s: 0 }; cells.set(ck, c); }
        const wgt = nd.I * nd.F.flame; c.x += nd.wp.x * wgt; c.y += nd.wp.y * wgt; c.z += nd.wp.z * wgt; c.s += wgt;
      } else if (nd.state === 2 && nd.emb > .25 && nd.seed < .3) pushAura(nd.wp, .35 * nd.emb, .45 * nd.emb);
    }
    for (const f of this.extraFlames) pushFlame(f.x, f.y, f.z, f.lx, f.ly, f.lz, f.w, f.h, f.seed, f.amt, f.n);
    for (const a of this.extraAura) pushAura(a.p, a.r, a.i);
    for (const at of Object.values(this.fA)) { at.needsUpdate = true; at.clearUpdateRanges?.(); }
    this.flameGeo.instanceCount = nf; this.aA.base.needsUpdate = this.aA.a.needsUpdate = true; this.auraGeo.instanceCount = na;
    this.flameCount = nf;
    // --- свет: кластеры по сетке 2,4 м, до 8 источников, мерцание шагами
    const L = [...this.extraLights];
    const cl = [...cells.values()].sort((a, b) => b.s - a.s);
    for (const c of cl) { if (L.length >= 8) break; L.push({ x: c.x / c.s, y: c.y / c.s + .7, z: c.z / c.s, i: Math.min(2.2, .45 + c.s * .055), r: Math.min(10, 3 + Math.sqrt(c.s) * 1.1) }); }
    const P = SHARED.uFireP.value, C = SHARED.uFireC.value, lc = c3(FIRE.light);
    L.forEach((l, k) => { const fk = .86 + .28 * hash(k * 13.7 + st * .53); P[k].set(l.x, l.y, l.z); C[k].set(lc.r * l.i * fk, lc.g * l.i * fk, lc.b * l.i * fk, l.r * (.95 + .1 * fk)); });
    SHARED.uFireN.value = L.length;
    // --- росчерки: жар над огнём, чёрточки у языков, вспышки-лучи (почеркушки Michael), шагами
    for (const c of cl) {
      if (c.s < .6) continue; const cx = c.x / c.s, cy = c.y / c.s, cz = c.z / c.s;
      if (rnd() < Math.min(.55, c.s * .03)) this._mark('rise', _v.set(cx + (rnd() - .5) * Math.min(2, .4 + c.s * .04), cy + .9 + rnd() * .7 + Math.min(1.2, c.s * .02), cz + (rnd() - .5) * .5), .32 + rnd() * .35, rnd() < .55 ? FIRE.ink : FIRE.core, .7 + rnd() * .5);
      if (c.s > 6 && rnd() < .05) this._mark('burst', _v.set(cx, cy + .7, cz), Math.min(3.2, 1.5 + Math.sqrt(c.s) * .18), FIRE.rim, .42);
    }
    for (let k = 0; k < 3; k++) { const nd = this.nodes[Math.floor(rnd() * N)]; if (nd.state === 1 && nd.I > .45 && rnd() < .5)
      this._mark('flick', _v.copy(nd.wp).add(_n.set((rnd() - .5) * .3, .45 + nd.I * .6 * nd.F.flame, (rnd() - .5) * .3)), .22 + rnd() * .2, rnd() < .5 ? FIRE.hot : FIRE.ink, .3 + rnd() * .2); }
    this._buildRibbons(dt);
    // --- пепел
    { const ap = this.ashPts.geometry.attributes.position.array, aa = this.ashPts.geometry.attributes.aA.array; let k = 0;
      for (const a of this.ash) { if (a.life <= 0) { aa[k * 4 + 1] = 0; ap[k * 3 + 1] = -99; k++; continue; }
        ap[k * 3] = a.x; ap[k * 3 + 1] = a.y; ap[k * 3 + 2] = a.z; aa[k * 4] = Math.round(a.rot * 2) / 2; aa[k * 4 + 1] = a.size * Math.min(1, a.life * 1.5); aa[k * 4 + 2] = a.hot; aa[k * 4 + 3] = a.tone; k++; }
      this.ashPts.geometry.attributes.position.needsUpdate = this.ashPts.geometry.attributes.aA.needsUpdate = true; }
    for (const ob of this.objects) if (ob.shrink > 0 && ob.hot && !ob.moving) this._updateNodeWorld(ob);
    // --- раскаление и уголь вершин
    const burnPts = []; for (let i = 0; i < N; i++) { const nd = this.nodes[i]; if (nd.state === 1 && nd.I > .03) burnPts.push(nd.wp.x, nd.wp.y, nd.wp.z, nd.I * nd.F.flame, nd.ob.mesh.id); else if (nd.state === 2 && nd.emb > 0) burnPts.push(nd.wp.x, nd.wp.y, nd.wp.z, nd.emb * .55, nd.ob.mesh.id); }
    for (const e of this.extraAura) if (e.heat) burnPts.push(e.p.x, e.p.y - .25, e.p.z, e.heat, -1);
    const nb = burnPts.length / 5; const bx = new Float32Array(nb), by = new Float32Array(nb), bz = new Float32Array(nb);
    for (let i = 0; i < nb; i++) { bx[i] = burnPts[i * 5]; by[i] = burnPts[i * 5 + 1]; bz[i] = burnPts[i * 5 + 2]; }
    this.bgrid.build(nb, bx, by, bz);
    const R = 1.25, ownR = .38;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < nb; i++) { x0 = Math.min(x0, bx[i]); x1 = Math.max(x1, bx[i]); y0 = Math.min(y0, by[i]); y1 = Math.max(y1, by[i]); z0 = Math.min(z0, bz[i]); z1 = Math.max(z1, bz[i]); }
    x0 -= R; x1 += R; y0 -= R; y1 += R; z0 -= R; z1 += R;
    for (const ob of this.objects) {
      const g = ob.mesh.geometry, aH = g.attributes.aHeat, aC = g.attributes.aChar, Wp = ob.wpos, vh = ob.vHeat;
      const [up, down] = HEAT_RATE[ob.heatKind] ?? HEAT_RATE.stone; const near = nb > 0 && this._boxNear(ob.box, bx, by, bz, nb, R);
      if (!near && !ob.hot) continue;
      let any = false; const n = vh.length; const flam = !!ob.F || ob.ground; const id = ob.mesh.id;
      for (let i = 0; i < n; i++) {
        let tgt = 0, own = 0; const x = Wp[i * 3], y = Wp[i * 3 + 1], z = Wp[i * 3 + 2];
        if (near && x > x0 && x < x1 && y > y0 && y < y1 && z > z0 && z < z1) this.bgrid.query(x, y, z, R, (j) => {
          const dx = bx[j] - x, dy = (by[j] - y) * (by[j] < y ? 1.6 : .8), dz = bz[j] - z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d >= R) return;
          const f = 1 - d / R; tgt += burnPts[j * 5 + 3] * f * f * 1.1; if (d < ownR && (burnPts[j * 5 + 4] === id || ob.ground)) own += burnPts[j * 5 + 3] * (1 - d / ownR);
        });
        tgt = 1.3 * (1 - Math.exp(-tgt * .85));
        const hv = vh[i]; const nh = hv + (tgt - hv) * Math.min(1, (tgt > hv ? up : down) * dt);
        vh[i] = nh; if (nh > .02) any = true;
        aH.array[i] = nh;
        if (flam && own > 0) aC.array[i] = Math.min(1, aC.array[i] + own * dt * (ob.ground ? .5 : 6 / (ob.F?.fuel ?? 6)));
        else if (ob.ground && tgt > .7) aC.array[i] = Math.min(1, aC.array[i] + (tgt - .7) * dt * .25);
      }
      ob.hot = any; aH.needsUpdate = true; aC.needsUpdate = true;
    }
    // --- искры
    const ep = this.embers.geometry.attributes.position.array, ee = this.embers.geometry.attributes.aE.array; let k = 0;
    for (const s of this.sparks) { if (s.life <= 0) { ee[k * 2 + 1] = 0; ep[k * 3 + 1] = -99; k++; continue; } if (!s.landed) { ee[k * 2 + 1] = 0; ep[k * 3 + 1] = -99; k++; continue; } const a = s.life / s.life0; ep[k * 3] = s.x; ep[k * 3 + 1] = s.y; ep[k * 3 + 2] = s.z; ee[k * 2] = s.landed ? .2 + .2 * (s.life > .3) : a * s.hot + .15; ee[k * 2 + 1] = s.size * (s.landed ? .8 : 1); k++; }
    this.embers.geometry.attributes.position.needsUpdate = this.embers.geometry.attributes.aE.needsUpdate = true;
    // --- дым (позиции шагами)
    const sp = this.sA.pos.array, ss = this.sA.s.array; let ns = 0;
    for (const s of this.smoke) {
      if (s.life <= 0) continue; s.life -= dt; if (s.life <= 0) continue;
      const age = 1 - s.life / s.life0; s.y += s.vy * dt; s.vy *= .985;
      const drift = ws * (1.2 + age * 2.2); s.x += wd.x * drift * dt + Math.sin(s.seed * 40 + this.t) * .05 * dt; s.z += wd.z * drift * dt;
      s.r = s.r0 * (1 + age * 2.);
      sp[ns * 3] = s.x; sp[ns * 3 + 1] = s.y; sp[ns * 3 + 2] = s.z; ss[ns * 4] = s.r; ss[ns * 4 + 1] = s.seed; ss[ns * 4 + 2] = s.tone; ss[ns * 4 + 3] = age; ns++;
    }
    this.smokeGeo.instanceCount = ns; this.sA.pos.needsUpdate = this.sA.s.needsUpdate = true;
    // --- отладка узлов
    if (this.showNodes) {
      this._ensureNodePts(); this.nodePts.visible = true; const p = this.nodePts.geometry.attributes.position.array, c = this.nodePts.geometry.attributes.aC.array;
      for (let i = 0; i < N; i++) { const nd = this.nodes[i]; p[i * 3] = nd.wp.x + nd.wn.x * .03; p[i * 3 + 1] = nd.wp.y + nd.wn.y * .03; p[i * 3 + 2] = nd.wp.z + nd.wn.z * .03;
        let col; if (nd.state === 1) col = [1, .25, .1]; else if (nd.state === 2) col = nd.emb > 0 ? [.6, .2, .1] : [.15, .15, .15]; else { const t = Math.max(0, Math.min(1, nd.temp / nd.heatCap)); col = nd.temp < 0 ? [.3, .6, 1] : [.4 + .6 * t, .8 + .1 * t, .5 - .4 * t]; if (nd.edge && t < .05) col = [.9, .9, .5]; }
        c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2]; }
      this.nodePts.geometry.attributes.position.needsUpdate = this.nodePts.geometry.attributes.aC.needsUpdate = true;
    } else if (this.nodePts) this.nodePts.visible = false;
  }
  _buildRibbons(dt) {
    const cam = this.camera; cam.updateMatrixWorld(); const e = cam.matrixWorld.elements;
    const R = _v.set(e[0], e[1], e[2]).clone(), U = _n.set(e[4], e[5], e[6]).clone();
    const P = this.rib.geometry.attributes.position.array, C = this.rib.geometry.attributes.aC.array; let nv = 0; const max = this.ribMax;
    const wd = this.wind.dir, ws = this.wind.cur;
    const quad = (ax, ay, az, bx, by, bz, nx, ny, nz, w0, w1, col) => {
      if (nv + 6 > max) return;
      const v = [ax + nx * w0, ay + ny * w0, az + nz * w0, ax - nx * w0, ay - ny * w0, az - nz * w0, bx + nx * w1, by + ny * w1, bz + nz * w1, bx - nx * w1, by - ny * w1, bz - nz * w1];
      for (const i of [0, 1, 2, 2, 1, 3]) { P[nv * 3] = v[i * 3]; P[nv * 3 + 1] = v[i * 3 + 1]; P[nv * 3 + 2] = v[i * 3 + 2]; C[nv * 3] = col.r; C[nv * 3 + 1] = col.g; C[nv * 3 + 2] = col.b; nv++; }
    };
    const stroke = (pts, ox, oy, oz, S, flip, W, col, from, to) => {
      const n = pts.length / 3; const i0 = Math.floor(from * (n - 1)), i1 = Math.ceil(to * (n - 1));
      for (let i = i0; i < i1; i++) {
        const x0 = pts[i * 3] * flip, y0 = pts[i * 3 + 1], x1 = pts[i * 3 + 3] * flip, y1 = pts[i * 3 + 4];
        let dx = x1 - x0, dy = y1 - y0; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const nx = (R.x * -dy + U.x * dx), ny = (R.y * -dy + U.y * dx), nz = (R.z * -dy + U.z * dx);
        const tp = (k) => Math.sin(Math.PI * Math.min(1, Math.max(0, k / (n - 1)))) * .7 + .3;
        const w0 = W * (.35 + .65 * pts[i * 3 + 2]) * tp(i), w1 = W * (.35 + .65 * pts[i * 3 + 5]) * tp(i + 1);
        quad(ox + (R.x * x0 + U.x * y0) * S, oy + (R.y * x0 + U.y * y0) * S, oz + (R.z * x0 + U.z * y0) * S, ox + (R.x * x1 + U.x * y1) * S, oy + (R.y * x1 + U.y * y1) * S, oz + (R.z * x1 + U.z * y1) * S, nx, ny, nz, w0, w1, col);
      }
    };
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i]; m.life -= dt; if (m.life <= 0) { this.marks.splice(i, 1); continue; }
      const age = m.life0 - m.life;
      if (m.kind === 'rise') { m.y += .9 * dt; m.x += wd.x * ws * 1.4 * dt; m.z += wd.z * ws * 1.4 * dt; }
      const reveal = Math.min(1, Math.ceil(age / .08) / 3);                       // прорисовка за 3 шага
      const cut = m.life < m.life0 * .4 ? 1 - m.life / (m.life0 * .4) : 0;        // хвост тает с начала
      const W = m.kind === 'burst' ? .018 : m.kind === 'flick' ? .026 : .022;
      if (m.kind === 'burst') for (const pts of m.data) stroke(pts, m.x, m.y, m.z, m.size, m.flip, W, m.col, Math.min(cut, .95), reveal);
      else stroke(m.data, m.x, m.y, m.z, m.size, m.flip, W, m.col, Math.min(cut, .95), reveal);
    }
    // искры чёрточками вдоль полёта
    const hotC = c3(FIRE.hot), coreC = c3(FIRE.core), midC = c3(FIRE.mid);
    for (const s of this.sparks) {
      if (s.life <= 0 || s.landed) continue; const a = s.life / s.life0 * s.hot; const col = a > .6 ? hotC : a > .35 ? coreC : midC;
      const L = .045 + Math.min(.12, Math.hypot(s.vx, s.vy, s.vz) * .03);
      const sp = Math.hypot(s.vx, s.vy, s.vz) || 1; const tx = s.vx / sp, ty = s.vy / sp, tz = s.vz / sp;
      const sx = tx * R.x + ty * R.y + tz * R.z, sy = tx * U.x + ty * U.y + tz * U.z; const sl = Math.hypot(sx, sy) || 1;
      const nx = (R.x * -sy + U.x * sx) / sl, ny = (R.y * -sy + U.y * sx) / sl, nz = (R.z * -sy + U.z * sx) / sl, w = s.size * .45;
      quad(s.x, s.y, s.z, s.x - tx * L, s.y - ty * L, s.z - tz * L, nx, ny, nz, w, w * .3, col);
    }
    this.rib.geometry.setDrawRange(0, nv); this.rib.geometry.attributes.position.needsUpdate = this.rib.geometry.attributes.aC.needsUpdate = true;
  }
  _boxNear(box, bx, by, bz, n, R) {
    const mn = box.min, mx = box.max;
    for (let i = 0; i < n; i++) if (bx[i] > mn.x - R && bx[i] < mx.x + R && by[i] > mn.y - R && by[i] < mx.y + R && bz[i] > mn.z - R && bz[i] < mx.z + R) return true;
    return false;
  }
}
function hash(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------------------------------------------------------------- факел: один огонь, один источник включения
export class Torch {
  // fire: WildFire (общие буферы пламени, света, искр); anchor: Object3D (точка над навершием); head: toonMesh навершия
  constructor(fire, anchor, head, o = {}) {
    this.fire = fire; this.anchor = anchor; this.head = head; this.o = { size: 1, ...o };
    this.state = 'off'; this.k = 0; this.t = 0; this.heat = 0;
    this.flames = Array.from({ length: 4 }, (_, i) => ({ seed: .13 + i * .21, x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, w: 0, h: 0, amt: 1 }));
    this.light = { x: 0, y: 0, z: 0, i: 0, r: 6 }; this.aura = { p: new THREE.Vector3(), r: 0, i: 0, heat: 0 };
    if (head) { prepGeo(head.geometry); head.geometry.attributes.aChar.array.fill(.3); head.geometry.attributes.aChar.needsUpdate = true; }
  }
  get lit() { return this.state === 'lit' || this.state === 'catch'; }
  toggle() { if (this.state === 'off' || this.state === 'out') this.ignite(); else this.extinguish(); }
  ignite() { this.state = 'strike'; this.t = 0; }
  extinguish() { if (this.state === 'off') return; this.state = 'out'; this.t = 0; const p = this.anchor.getWorldPosition(new THREE.Vector3()); for (let i = 0; i < 4; i++) this.fire._puff(p.clone().add(new THREE.Vector3(0, .15 + i * .12, 0)), 0, .14 + i * .04); }
  update(dt) {
    this.t += dt; const F = this.fire; const p = this.anchor.getWorldPosition(new THREE.Vector3());
    // кривая силы ступенями: удар-искра → занимается (3 шага) → горит → гаснет (3 шага)
    let k = 0;
    if (this.state === 'strike') { if (Math.random() < dt * 40) F._spark(p, .5, 1); if (this.t > .3) { this.state = 'catch'; this.t = 0; } }
    else if (this.state === 'catch') { k = Math.min(1, Math.ceil(this.t / .12) / 4); if (this.t > .5) { this.state = 'lit'; } }
    else if (this.state === 'lit') k = 1;
    else if (this.state === 'out') { k = Math.max(0, 1 - Math.ceil(this.t / .1) / 3); if (k <= 0) this.state = 'off'; }
    this.k = k;
    this.heat += ((k > 0 ? 1.15 : 0) - this.heat) * Math.min(1, dt * (k > 0 ? 2 : .25));
    if (this.head) { const a = this.head.geometry.attributes.aHeat; a.array.fill(this.heat); a.needsUpdate = true; }
    const remove = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); };
    remove(F.extraFlames, this.flames[0]); remove(F.extraFlames, this.flames[1]); remove(F.extraFlames, this.flames[2]); remove(F.extraFlames, this.flames[3]);
    remove(F.extraLights, this.light); remove(F.extraAura, this.aura);
    if (this.heat > .05) { this.aura.p.copy(p); this.aura.r = 0; this.aura.i = 0; this.aura.heat = this.heat * .6; F.extraAura.push(this.aura); }
    if (k <= 0) return;
    const W = F.wind, S = this.o.size, st = F.step;
    this.flames.forEach((f, i) => {
      const fk = .85 + .3 * hash(f.seed * 50 + st * .41);
      const h = S * k * (i === 0 ? .78 : .5 + .12 * i) * fk, w = h * (i === 0 ? .62 : .55);
      const ox = (i === 0 ? 0 : Math.cos(i * 2.1) * .06 * S), oz = (i === 0 ? 0 : Math.sin(i * 2.1) * .06 * S);
      f.x = p.x + ox; f.y = p.y - .04 * S; f.z = p.z + oz; f.w = w; f.h = h; f.amt = k;
      const lean = W.cur * 1.4, tb = (hash(f.seed * 9 + st * .3) - .5) * .25;
      f.lx = W.dir.x * lean + tb; f.ly = 0; f.lz = W.dir.z * lean - tb;
      F.extraFlames.push(f);
    });
    this.light.x = p.x + W.dir.x * W.cur * .3; this.light.y = p.y + .35 * S; this.light.z = p.z + W.dir.z * W.cur * .3; this.light.i = 1.35 * k; this.light.r = 6.5 * S;
    F.extraLights.push(this.light);
    this.aura.r = .75 * S * k; this.aura.i = .95 * k; this.aura.p.copy(p).add(new THREE.Vector3(0, .15 * S, 0));
    if (this.state === 'lit' && Math.random() < dt * 2.2) F._spark(p.clone().add(new THREE.Vector3(0, .3 * S, 0)), .45, .75);
    if (this.state === 'lit' && Math.random() < dt * 1.4) F._mark(Math.random() < .5 ? 'flick' : 'rise', p.clone().add(new THREE.Vector3((Math.random() - .5) * .2, .55 * S + Math.random() * .3, 0)), .16 + Math.random() * .12, Math.random() < .5 ? FIRE.hot : FIRE.ink, .35);
    if (this.state === 'lit' && Math.random() < dt * .9) F._puff(p.clone().add(new THREE.Vector3(W.dir.x * .2, .9 * S, W.dir.z * .2)), 0, .1);
  }
}

// ---------------------------------------------------------------- пост: марево над огнём + зерно бумаги
export class HeatPost {
  constructor(renderer, fire) {
    this.r = renderer; this.fire = fire;
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rt = new THREE.WebGLRenderTarget(s.x, s.y, { samples: 4 });
    this.mask = new THREE.WebGLRenderTarget(Math.max(1, s.x >> 2), Math.max(1, s.y >> 2), { depthBuffer: false });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.q = new THREE.Scene();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: this.rt.texture }, tMask: { value: this.mask.texture }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(s.x, s.y) }, uHaze: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: `uniform sampler2D tScene, tMask; uniform float uT, uHaze; uniform vec2 uRes; varying vec2 vUv;
${NOISE}
void main(){
  float m = min(texture2D(tMask, vUv).r, 1.) * uHaze;
  vec2 q = vUv * vec2(uRes.x / uRes.y, 1.);
  vec2 off = vec2(pfNoise(q * vec2(34., 20.) + vec2(0., -uT * 1.4)) - .5, pfNoise(q * vec2(26., 16.) + vec2(7., -uT * 1.1)) - .5) * .014 * m;
  vec3 c = texture2D(tScene, vUv + off).rgb;
  float gr = pfH21(floor(gl_FragCoord.xy / 2.) + floor(uT * 8.) * 7.31) - .5;
  float paper = pfNoise(q * 5.) - .5;
  c *= 1. + gr * .07 + paper * .05;
  gl_FragColor = vec4(c, 1.);
}`, depthTest: false, depthWrite: false,
    });
    this.q.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat));
  }
  setSize(w, h) { const s = this.r.getDrawingBufferSize(new THREE.Vector2()); this.rt.setSize(s.x, s.y); this.mask.setSize(Math.max(1, s.x >> 2), Math.max(1, s.y >> 2)); this.mat.uniforms.uRes.value.copy(s); }
  render(scene, camera) {
    const r = this.r; this.mat.uniforms.uT.value = Math.floor(performance.now() / 1000 * 8) / 8;
    // маска марева: те же ореолы, но выше и мягче
    r.setRenderTarget(this.mask); r.setClearColor(0x000000, 1); r.clear(); r.render(this.fire.hazeScene, camera);
    r.setRenderTarget(this.rt); r.setClearColor(scene.userData.clear ?? 0x16303a, 1); r.clear(); r.render(scene, camera);
    r.setRenderTarget(null); r.render(this.q, this.cam);
  }
}
