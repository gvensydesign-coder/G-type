// Aura FX: a 2D-styled (cel / halftone / ink) smoke aura that lives in a 3D scene.
//
// How it works
//  • Several camera-facing layers (billboards whose "up" stays the world up) sit at the
//    character's feet, some behind the body and some in front. Because every layer always
//    faces the camera, the drawing is never seen edge-on or stretched: from any angle it
//    reads as a flat 2D illustration, like a hand-painted FX sprite.
//  • The shape is not a fixed texture: it is a procedural field (domain-warped noise,
//    S-shaped swirl, flame envelope) plus a screen-space silhouette of the character
//    (SilhouetteMask), dilated in the shader. So the smoke hugs whatever pose and view
//    the character has right now.
//  • The field is posterized into 1–4 flat tones, with optional ink outline, inner lines,
//    halftone dots, punched "holes" and ghost skulls.
//  • Shards are GPU points (diamonds) orbiting in real 3D around the body, so they give
//    parallax while still being drawn flat.
//  • Everything is in world units and multiplied by `scale`, so the aura can be resized
//    per character; all params can be tweened (preset → preset) and the aura has
//    appear / disappear animations.
//
// Usage:
//   const mask = new SilhouetteMask(renderer);
//   const aura = new Aura({ channel: 0, params: PRESETS.spirit.params });
//   scene.add(aura.group);
//   character meshes: mask.register(characterRoot, 0)
//   every frame: mask.render(renderer, scene, camera); aura.update(dt, camera, feetPosition, mask);
//   aura.appear(); aura.disappear(); aura.transitionTo(params, seconds);

import * as THREE from 'three';

/* ------------------------------------------------------------------ params */

export const PARAM_GROUPS = [
  ['size', 'Масштаб и размер'],
  ['shape', 'Форма'],
  ['motion', 'Движение'],
  ['style', '2D-стиль'],
  ['holes', 'Пятна и черепа'],
  ['particles', 'Частицы'],
  ['reveal', 'Появление и исчезновение'],
  ['env', 'Свечение окружения'],
  ['color', 'Цвета'],
];

// [key, label, group, min, max, step, unit]
export const PARAM_DEFS = [
  ['scale', 'Общий масштаб', 'size', 0.3, 3, 0.01, '×'],
  ['radius', 'Радиус', 'size', 0.2, 2, 0.01, 'м'],
  ['height', 'Высота', 'size', 0.6, 4.5, 0.01, 'м'],
  ['thick', 'Толщина вокруг тела', 'size', 0, 1, 0.01, 'м'],
  ['power', 'Накал (состояние)', 'size', 0, 1, 0.01, ''],
  ['layers', 'Слоёв', 'shape', 1, 6, 1, ''],
  ['front', 'Из них перед телом', 'shape', 0, 2, 1, ''],
  ['frontOpacity', 'Прозрачность переднего слоя', 'shape', 0, 1, 0.01, ''],
  ['frontCover', 'Перекрытие тела', 'shape', 0, 1, 0.01, ''],
  ['depth', 'Разнос слоёв по глубине', 'shape', 0, 1, 0.01, 'м'],
  ['column', 'Столб дыма', 'shape', 0, 1.5, 0.01, ''],
  ['hug', 'Облегание силуэта', 'shape', 0, 2, 0.01, ''],
  ['tongues', 'Языки сверху', 'shape', 0, 2, 0.01, ''],
  ['speed', 'Скорость', 'motion', 0, 3, 0.01, ''],
  ['turb', 'Турбулентность', 'motion', 0, 1.6, 0.01, ''],
  ['warp', 'Перетекание форм', 'motion', 0, 2.5, 0.01, ''],
  ['noiseScale', 'Размер клубов', 'motion', 0.15, 1.5, 0.01, 'м'],
  ['swirl', 'S-завихрение', 'motion', 0, 2, 0.01, ''],
  ['swirlFreq', 'Частота завихрения', 'motion', 0.2, 3, 0.01, ''],
  ['stepFps', 'Кадров в секунду (0 = плавно)', 'motion', 0, 30, 1, 'fps'],
  ['levels', 'Тоновых уровней', 'style', 1, 4, 1, ''],
  ['soft', 'Мягкость градиента', 'style', 0, 1, 0.01, ''],
  ['core', 'Глубина ядра', 'style', 0.2, 2, 0.01, ''],
  ['lineW', 'Контур', 'style', 0, 4, 0.1, 'px'],
  ['innerLine', 'Линии между тонами', 'style', 0, 1, 0.01, ''],
  ['halfAmt', 'Полутон (растр)', 'style', 0, 1.5, 0.01, ''],
  ['halfSize', 'Шаг растра', 'style', 1, 10, 0.1, 'см'],
  ['halfSpread', 'Ореол растра', 'style', 0, 1, 0.01, ''],
  ['opacity', 'Непрозрачность', 'style', 0, 1, 0.01, ''],
  ['glow', 'Подсветка персонажа', 'style', 0, 3, 0.01, ''],
  ['ground', 'Пятно на земле', 'style', 0, 1, 0.01, ''],
  ['envGlow', 'Свет на окружение', 'env', 0, 4, 0.01, ''],
  ['envRadius', 'Радиус света', 'env', 1, 12, 0.1, 'м'],
  ['envPool', 'Световое пятно на полу', 'env', 0, 2, 0.01, ''],
  ['envFlicker', 'Мерцание', 'env', 0, 1, 0.01, ''],
  ['holeAmt', 'Пятна-дыры', 'holes', 0, 1, 0.01, ''],
  ['holeSize', 'Размер пятен', 'holes', 0.05, 0.6, 0.01, 'м'],
  ['holeClear', 'Пятна: тёмные → сквозные', 'holes', 0, 1, 0.01, ''],
  ['skulls', 'Черепа в дыму', 'holes', 0, 1, 0.01, ''],
  ['skullSize', 'Размер черепов', 'holes', 0.15, 1, 0.01, ''],
  ['pDensity', 'Плотность', 'particles', 0, 1, 0.01, ''],
  ['pSize', 'Размер осколков', 'particles', 0.02, 0.3, 0.005, 'м'],
  ['pStretch', 'Вытянутость', 'particles', 1, 5, 0.1, ''],
  ['pSpeed', 'Скорость подъёма', 'particles', 0, 2, 0.01, ''],
  ['pSpread', 'Разлёт', 'particles', 0.3, 2.5, 0.01, ''],
  ['pSwirl', 'Кружение', 'particles', 0, 2, 0.01, ''],
  ['revealDur', 'Длительность', 'reveal', 0.2, 4, 0.05, 'с'],
];

export const COLOR_DEFS = [
  ['cEdge', 'Край / тень'],
  ['cMid', 'Середина'],
  ['cCore', 'Ядро'],
  ['cLine', 'Контур'],
  ['cHalf', 'Растр'],
  ['cP1', 'Осколки'],
  ['cP2', 'Блик осколков'],
];

export const REVEAL_MODES = [
  ['rise', 'Подъём от земли'],
  ['dissolve', 'Растворение'],
  ['burst', 'Вспышка из центра'],
];

const BASE = {
  scale: 1, radius: 0.7, height: 2.15, thick: 0.32, power: 0.85,
  layers: 4, front: 1, frontOpacity: 0.45, frontCover: 0.12, depth: 0.35,
  column: 0.8, hug: 0.95, tongues: 1.0,
  speed: 0.6, turb: 0.75, warp: 1.1, noiseScale: 0.45, swirl: 0.8, swirlFreq: 1.1, stepFps: 0,
  levels: 3, soft: 0, core: 1.05, lineW: 0, innerLine: 0, halfAmt: 0.55, halfSize: 3.2, halfSpread: 0.22,
  opacity: 1, glow: 1, ground: 0.8,
  envGlow: 1.3, envRadius: 5, envPool: 0.8, envFlicker: 0.35,
  holeAmt: 0.42, holeSize: 0.27, holeClear: 0, skulls: 0, skullSize: 0.45,
  pDensity: 0.55, pSize: 0.08, pStretch: 2.6, pSpeed: 0.55, pSpread: 1.1, pSwirl: 0.6,
  revealDur: 1.3, revealIn: 'rise', revealOut: 'dissolve',
  cEdge: '#0b2a6b', cMid: '#1f6dff', cCore: '#86e6ff', cLine: '#020b26', cHalf: '#2f86ff', cP1: '#45b4ff', cP2: '#e2f8ff',
};

export const PRESETS = {
  spirit: { name: 'Дух леса', params: { ...BASE } },
  plague: { name: 'Чумной дым', params: { ...BASE,
    radius: 0.62, height: 2.5, thick: 0.22, column: 0.85, hug: 0.55, tongues: 1.25, layers: 3, front: 1, frontOpacity: 0.45,
    speed: 0.5, turb: 0.85, warp: 1.6, noiseScale: 0.55, swirl: 0.9, swirlFreq: 0.8,
    levels: 3, soft: 0.5, core: 1.0, lineW: 1.6, innerLine: 0.35, halfAmt: 0.15, halfSpread: 0.2,
    holeAmt: 0.12, holeSize: 0.16, holeClear: 1, skulls: 0.85, skullSize: 0.5,
    pDensity: 0.3, pSize: 0.06, pStretch: 1.6, pSpeed: 0.4, revealIn: 'rise', revealOut: 'rise',
    cEdge: '#3f4f08', cMid: '#a3bf19', cCore: '#fff47a', cLine: '#161c03', cHalf: '#8aa612', cP1: '#d6f04a', cP2: '#fffbd0' } },
  rage: { name: 'Ярость', params: { ...BASE,
    radius: 0.78, height: 2.55, thick: 0.38, column: 0.6, hug: 1.1, tongues: 1.5, layers: 4, front: 1,
    speed: 1.35, turb: 1.0, warp: 0.9, noiseScale: 0.35, swirl: 0.35, swirlFreq: 1.6, stepFps: 12,
    levels: 4, soft: 0, core: 1.0, lineW: 1.2, innerLine: 0, halfAmt: 0.3, halfSize: 2.6, halfSpread: 0.2,
    holeAmt: 0.25, holeSize: 0.14, holeClear: 0.3, glow: 1.6, envGlow: 1.4, envRadius: 6, envFlicker: 0.7,
    pDensity: 0.9, pSize: 0.07, pStretch: 3.2, pSpeed: 1.4, pSpread: 1.2, pSwirl: 0.25, revealIn: 'burst', revealOut: 'dissolve',
    cEdge: '#4a0707', cMid: '#d9341a', cCore: '#ffd166', cLine: '#1a0202', cHalf: '#ff5a2a', cP1: '#ff8a3d', cP2: '#fff1c2' } },
  shadow: { name: 'Тень', params: { ...BASE,
    radius: 0.75, height: 2.3, thick: 0.4, column: 0.4, hug: 1.2, tongues: 0.8, layers: 5, front: 2, frontOpacity: 0.5, frontCover: 0.35,
    speed: 0.4, turb: 0.8, warp: 1.6, swirl: 1.2, swirlFreq: 0.9, stepFps: 8,
    levels: 3, core: 1.0, lineW: 0, halfAmt: 0.45, halfSize: 3.8, halfSpread: 0.28,
    holeAmt: 0.55, holeSize: 0.24, holeClear: 0.65, skulls: 0.25, skullSize: 0.38, glow: 0.7, envGlow: 0.9, envRadius: 4, envFlicker: 0.2,
    pDensity: 0.5, pSize: 0.09, pStretch: 2.2, pSpeed: 0.35, pSwirl: 1.1, revealIn: 'dissolve', revealOut: 'dissolve',
    cEdge: '#07040d', cMid: '#3b1d5e', cCore: '#b58cff', cLine: '#000000', cHalf: '#6b3fa8', cP1: '#9a6bff', cP2: '#f0e6ff' } },
  frost: { name: 'Иней', params: { ...BASE,
    radius: 0.6, height: 2.0, thick: 0.28, column: 0.45, hug: 1.0, tongues: 0.4, layers: 3,
    speed: 0.3, turb: 0.55, warp: 0.7, noiseScale: 0.6, swirl: 0.3,
    levels: 2, soft: 0, core: 0.7, lineW: 2.2, innerLine: 0.6, halfAmt: 0.45, halfSize: 2.2, halfSpread: 0.3,
    holeAmt: 0.2, holeSize: 0.3, holeClear: 0, glow: 0.8, envGlow: 1.1, envFlicker: 0.1,
    pDensity: 0.7, pSize: 0.11, pStretch: 4, pSpeed: 0.25, pSpread: 1.4, pSwirl: 0.2, revealIn: 'burst', revealOut: 'dissolve',
    cEdge: '#18394d', cMid: '#7fc6dd', cCore: '#ffffff', cLine: '#06141c', cHalf: '#a9e6f5', cP1: '#bdf0ff', cP2: '#ffffff' } },
  holy: { name: 'Благодать', params: { ...BASE,
    radius: 0.55, height: 2.6, thick: 0.25, column: 0.8, hug: 0.6, tongues: 0.3, layers: 3, front: 0,
    speed: 0.45, turb: 0.4, warp: 0.5, noiseScale: 0.7, swirl: 0.15,
    levels: 4, soft: 0.25, core: 1.2, lineW: 0, halfAmt: 0.8, halfSize: 2.4, halfSpread: 0.35,
    holeAmt: 0, skulls: 0, glow: 1.4, envGlow: 2.0, envRadius: 6.5, envPool: 1.1, envFlicker: 0.1,
    pDensity: 0.45, pSize: 0.05, pStretch: 1.2, pSpeed: 0.7, pSpread: 0.8, pSwirl: 0.4, revealIn: 'rise', revealOut: 'rise',
    cEdge: '#6b4a10', cMid: '#e2a52b', cCore: '#fff6d8', cLine: '#2a1a02', cHalf: '#ffd36b', cP1: '#ffe08a', cP2: '#ffffff' } },
};

const COLOR_KEYS = COLOR_DEFS.map((d) => d[0]);
const INT_KEYS = new Set(['layers', 'front', 'levels', 'stepFps']);
const STR_KEYS = new Set(['revealIn', 'revealOut']);

export function lerpParams(a, b, u) {
  const out = {};
  for (const k in b) {
    if (STR_KEYS.has(k)) out[k] = u < 0.5 ? a[k] : b[k];
    else if (COLOR_KEYS.includes(k)) out[k] = '#' + new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), u).getHexString();
    else if (INT_KEYS.has(k)) out[k] = Math.round(a[k] + (b[k] - a[k]) * u);
    else out[k] = a[k] + (b[k] - a[k]) * u;
  }
  return out;
}

/* ------------------------------------------------------------------ GLSL */

const NOISE = /* glsl */`
vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float hash1(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  vec2 a = hash2(i)*2.0-1.0, b = hash2(i+vec2(1,0))*2.0-1.0, c = hash2(i+vec2(0,1))*2.0-1.0, d = hash2(i+vec2(1,1))*2.0-1.0;
  return mix(mix(dot(a,f), dot(b,f-vec2(1,0)), u.x), mix(dot(c,f-vec2(0,1)), dot(d,f-vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ s += a*gnoise(p); p = mat2(1.6,1.2,-1.2,1.6)*p; a *= 0.5; }
  return s*0.9 + 0.5; // ~0..1
}
float worley(vec2 p){
  vec2 i = floor(p), f = fract(p); float m = 9.0;
  for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++){
    vec2 g = vec2(float(x),float(y)); vec2 o = hash2(i+g);
    m = min(m, length(g + o - f));
  }
  return m;
}
float smin(float a, float b, float k){ float h = clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p)-b; return length(max(d,0.0)) + min(max(d.x,d.y),0.0); }
`;

// Shared "ink" styling: posterized tones, outline, inner lines, halftone, holes.
const STYLE = /* glsl */`
uniform float uLevels, uSoft, uCore, uLineW, uInnerLine, uHalfAmt, uHalfSize, uHalfSpread, uOpacity;
uniform vec3 uCEdge, uCMid, uCCore, uCLine, uCHalf;
vec3 ramp(float g){ return g < 0.5 ? mix(uCEdge, uCMid, g*2.0) : mix(uCMid, uCCore, g*2.0-1.0); }
// f: signed field (>0 inside). p: local metres (unit scale) for halftone grid. n: noise 0..1.
// hole: 0..1 punch mask, holeClear: 0 dark spot .. 1 see-through.
vec4 inkStyle(float f, vec2 p, float n, float hole, float holeClear){
  float af = max(fwidth(f), 1e-4);
  float inside = smoothstep(-af, af, f);
  float g = clamp(f / uCore, 0.0, 1.0);
  float lv = max(uLevels, 1.0);
  float k = g*lv; float idx = min(floor(k), lv-1.0); float fr = k - floor(k);
  float ak = max(fwidth(k), 1e-4);
  if (idx < lv-1.0) idx += smoothstep(1.0-ak, 1.0, fr);
  float gp = lv > 1.0 ? idx/(lv-1.0) : 0.35;
  float gg = mix(gp, g, uSoft);
  vec3 col = ramp(gg);
  // holes (only inside, not on the rim)
  float h = hole * smoothstep(0.08, 0.25, g);
  col = mix(col, uCEdge*0.55, h*(1.0-holeClear));
  float a = inside * (1.0 - h*holeClear);
  // halftone grid, rotated 45°
  float cell = uHalfSize*0.01;
  vec2 hp = mat2(0.7071,0.7071,-0.7071,0.7071)*p / cell;
  float dd = length(fract(hp)-0.5);
  float ad = max(fwidth(dd), 1e-4);
  // dots inside the outer tone (darker texture)
  float covIn = clamp(1.0 - g*2.2, 0.0, 1.0) * uHalfAmt * 0.55 * (0.4 + n);
  float dotIn = 1.0 - smoothstep(sqrt(covIn)*0.5-ad, sqrt(covIn)*0.5+ad, dd);
  col = mix(col, uCEdge*0.45, dotIn*inside*(1.0-h));
  // dots outside: halftone halo
  float covOut = smoothstep(-uHalfSpread, 0.0, f) * uHalfAmt * (0.25 + n*1.1);
  float dotOut = (1.0 - smoothstep(sqrt(covOut)*0.55-ad, sqrt(covOut)*0.55+ad, dd)) * (1.0-inside);
  dotOut *= step(0.001, covOut);
  col = mix(col, uCHalf, dotOut); a = max(a, dotOut);
  // inner lines between tones
  if (lv > 1.0 && uInnerLine > 0.0){
    float kk = clamp(floor(k+0.5), 1.0, lv-1.0);
    float db = abs(k-kk)/ak;
    float il = (1.0 - smoothstep(max(uLineW,1.0)*0.5, max(uLineW,1.0)*0.5+1.0, db)) * uInnerLine * inside;
    col = mix(col, uCLine, il);
  }
  // outer ink outline (constant pixel width → 2D look at any distance)
  if (uLineW > 0.0){
    float dpx = abs(f)/af;
    float ol = 1.0 - smoothstep(uLineW*0.5, uLineW*0.5+1.0, dpx);
    col = mix(col, uCLine, ol); a = max(a, ol);
  }
  return vec4(col, a*uOpacity);
}
`;

const LAYER_VS = /* glsl */`
uniform vec3 uOrigin, uRight, uUp; uniform vec2 uSize; uniform float uYMin;
varying vec2 vP;
void main(){
  vec2 lp = vec2(position.x*2.0*uSize.x, mix(uYMin, uSize.y, position.y+0.5));
  vP = lp;
  vec3 wp = uOrigin + uRight*lp.x + uUp*lp.y;
  // the part of the sheet that would sink under the floor is laid flat on it instead
  wp.y = max(wp.y, uOrigin.y + 0.02);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const LAYER_FS = /* glsl */`
uniform float uTime, uScale, uRadius, uHeight, uThick, uColumn, uHug, uTongues;
uniform float uTurb, uWarp, uSwirl, uSwirlFreq, uSpeed, uNoiseScale;
uniform float uHoleAmt, uHoleSize, uHoleClear, uSkulls, uSkullSize;
uniform float uReveal, uRevealMode, uFrontCover;
uniform sampler2D uMask; uniform vec4 uChan; uniform vec2 uRes, uPx;
uniform float uSeed, uLayerK, uFront, uSkullOn, uMirror, uLayerAlpha, uLayerR;
uniform vec2 uSize; uniform float uYMin;
varying vec2 vP;
${NOISE}
${STYLE}
float maskAt(vec2 s){ return dot(texture2D(uMask, s), uChan); }
float silField(vec2 s0, float rad){
  float acc = maskAt(s0)*1.5; float ws = 1.5;
  for (int i = 0; i < 8; i++){
    float a = float(i)*0.7853982 + 0.39;
    vec2 d = vec2(cos(a), sin(a));
    acc += maskAt(s0 + d*rad*0.45*uPx) * 1.0;
    acc += maskAt(s0 + d*rad*uPx) * 0.6;
    ws += 1.6;
  }
  return acc/ws;
}
vec2 skull(vec2 p){
  float cran = length((p - vec2(0.0,0.12))*vec2(1.0,1.08)) - 0.5;
  float cheek = length(vec2(abs(p.x)-0.2, p.y+0.12)) - 0.22;
  float jaw = sdBox(p - vec2(0.0,-0.33), vec2(0.24,0.14)) - 0.07;
  float head = smin(min(cran, cheek), jaw, 0.12);
  // drooping smoke tail under the chin
  float ty = clamp(-(p.y+0.35), 0.0, 2.2);
  float tail = abs(p.x + sin(p.y*2.5 + uTime*uSpeed*2.0)*0.18*ty) - 0.32*(1.0 - ty/2.2);
  tail = max(tail, p.y + 0.35);
  head = smin(head, max(tail, -(p.y+2.55)), 0.15);
  vec2 e = vec2(abs(p.x)-0.19, p.y-0.03);
  e = mat2(0.94,-0.34,0.34,0.94)*e;
  float eye = length(e*vec2(1.0,1.35)) - 0.13;
  float nose = length(vec2(p.x*1.7, (p.y+0.18)*1.1)) - 0.06;
  float teeth = max(abs(fract(p.x*8.0+0.5)-0.5)/8.0 - 0.012, abs(p.y+0.37)-0.06);
  teeth = max(teeth, abs(p.x)-0.2);
  return vec2(head, min(min(eye, nose), teeth));
}
void main(){
  vec2 p = vP / uScale;
  p.x *= uMirror;
  float t = uTime*uSpeed;
  float H = uHeight, R = uRadius*uLayerR;
  // reveal: "burst" scales the whole drawing out of the chest
  float r = clamp(uReveal, 0.0, 1.0);
  if (uRevealMode > 1.5){
    float e = 1.0 - pow(1.0-r, 3.0);
    vec2 c = vec2(0.0, H*0.5);
    p = c + (p - c) / max(e*1.06, 0.03);
  }
  float h = p.y / H;
  // S-shaped swirl that travels upward
  p.x += sin(h*uSwirlFreq*6.2831 - t*1.7 + uSeed*5.0) * uSwirl * R * 0.35 * smoothstep(-0.1, 0.5, h);
  vec2 q = vec2(p.x, p.y - t*0.7)/uNoiseScale + uSeed*13.1;
  vec2 w = vec2(fbm(q*0.6 + vec2(0.0, t*0.2)), fbm(q*0.6 + vec2(5.2,1.3) - vec2(0.0, t*0.15)));
  float n = fbm(q + uWarp*2.0*(w-0.5));
  // flame envelope
  float prof = mix(1.0, 0.3, smoothstep(0.45, 1.15, h)) * mix(0.75, 1.0, smoothstep(-0.15, 0.3, h));
  float env = 1.0 - abs(p.x)/(R*prof);
  env -= smoothstep(0.75, 1.3, h)*2.0;
  env -= smoothstep(0.0, -0.25, h)*1.6;
  // silhouette of the character (screen space), jittered by the warp field so it wisps
  vec2 s0 = gl_FragCoord.xy/uRes + (w-0.5)*uThick*uScale*1.4*uPx;
  float sil = uHug > 0.0 ? silField(s0, max(uThick*uScale, 0.01)) : 0.0;
  float silFade = smoothstep(1.35, 0.9, h);
  float turbTop = 1.0 + uTongues*smoothstep(0.35, 1.2, h)*2.0;
  float f = uColumn*env + uHug*1.3*sil*silFade + (n-0.5)*uTurb*turbTop - 0.12;
  // ghost skulls rising in the smoke
  if (uSkullOn > 0.5 && uSkulls > 0.0){
    for (int i = 0; i < 4; i++){
      float fi = float(i);
      float ph = uTime*uSpeed*0.09 + fi*0.25 + uSeed*0.37;
      float life = fract(ph); float id = floor(ph);
      float hx = hash1(vec2(id, fi));
      float show = step(hash1(vec2(fi, id+7.0)), uSkulls);
      float side = mod(fi, 2.0) < 0.5 ? -1.0 : 1.0;
      vec2 c = vec2(side*(0.35 + 0.5*hx)*R, mix(0.45, 1.3, life)*H);
      c.x += sin(life*5.0 + fi)*0.12*R;
      float sz = uSkullSize*R*(0.75 + 0.5*hash1(vec2(fi, id+3.0)));
      float vis = smoothstep(0.0, 0.18, life)*smoothstep(1.0, 0.7, life)*show;
      vec2 sp = (p - c)/sz + (w-0.5)*0.35;
      vec2 sk = skull(sp);
      float body = -sk.x*3.0*vis - (1.0-vis)*2.0;
      float headIn = smoothstep(0.05, -0.05, sk.x)*vis;
      f = max(f, body);
      f = mix(f, min(f, sk.y*6.0), headIn);
    }
  }
  // appear / disappear
  if (uRevealMode < 0.5){
    float front = r*1.55 - 0.25;
    f -= smoothstep(-0.06, 0.06, h - front + (n-0.5)*0.35) * 3.0;
  } else if (uRevealMode < 1.5){
    f -= (1.0 - r)*(0.5 + 1.6*n);
  } else {
    f -= (1.0 - r)*0.4;
  }
  // keep everything (halftone halo included) inside the layer's quad
  f -= smoothstep(0.78, 1.0, max(max(abs(vP.x)/uSize.x, vP.y/uSize.y), vP.y/uYMin))*3.0;
  // punched spots
  float wv = worley(vec2(p.x, p.y - t*0.55)/uHoleSize + uSeed*7.0);
  float hr = uHoleAmt*0.55;
  float aw = max(fwidth(wv), 1e-4);
  float hole = (1.0 - smoothstep(hr-aw, hr+aw, wv)) * step(0.001, uHoleAmt);
  vec4 c = inkStyle(f, p, n, hole, uHoleClear);
  // burst flash
  if (uRevealMode > 1.5) c.rgb = mix(c.rgb, uCCore, (1.0-r)*0.7*c.a);
  // back layers never cover the body (even when a tilted sheet passes through it);
  // front layers only veil it, so the character stays readable
  float body = maskAt(gl_FragCoord.xy/uRes);
  c.a *= mix(1.0, mix(0.0, uFrontCover, uFront), body);
  c.a *= uLayerAlpha;
  if (c.a < 0.003) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;

const GROUND_VS = /* glsl */`
uniform vec3 uOrigin; uniform float uR;
varying vec2 vP;
void main(){
  vP = position.xy * uR * 2.0;
  vec3 wp = uOrigin + vec3(vP.x, 0.0, -vP.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const GROUND_FS = /* glsl */`
uniform float uTime, uScale, uRadius, uSpeed, uReveal, uGround, uTurb;
varying vec2 vP;
${NOISE}
${STYLE}
void main(){
  vec2 p = vP / uScale;
  float t = uTime*uSpeed;
  float rr = length(p);
  float cs = cos(t*0.15), sn = sin(t*0.15);
  vec2 q = mat2(cs, -sn, sn, cs)*p*2.2;
  float n = fbm(q + vec2(0.0, -t*0.2) + fbm(q*0.7 - t*0.1));
  float R = uRadius*1.25*max(uReveal, 0.001);
  float f = (1.0 - rr/R)*0.9 + (n-0.5)*uTurb*0.9 - 0.3;
  vec4 c = inkStyle(f, p, n, 0.0, 0.0);
  c.a *= uGround*0.85;
  if (c.a < 0.003) discard;
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;

// Light thrown on the floor: a flat, banded (cel) pool with a halftone rim, added on top.
const POOL_FS = /* glsl */`
uniform float uTime, uAmt, uHalfSize, uScale; uniform vec3 uColor; uniform float uR;
varying vec2 vP;
${NOISE}
void main(){
  float d = length(vP)/uR;
  float n = fbm(vP/uScale*0.9 + vec2(uTime*0.25, -uTime*0.2));
  float I = pow(clamp(1.0 - d + (n-0.5)*0.18, 0.0, 1.0), 1.7);
  float k = I*3.0; float ak = max(fwidth(k), 1e-4);
  float band = (floor(k) + smoothstep(1.0-ak, 1.0, fract(k)))/3.0;
  float cell = uHalfSize*0.02*uScale;
  vec2 hp = mat2(0.7071,0.7071,-0.7071,0.7071)*vP/cell;
  float dd = length(fract(hp)-0.5); float ad = max(fwidth(dd), 1e-4);
  float cov = clamp(I*3.0, 0.0, 1.0) * step(k, 1.0);
  float dots = 1.0 - smoothstep(sqrt(cov)*0.5-ad, sqrt(cov)*0.5+ad, dd);
  vec3 col = uColor*(band*0.55 + dots*0.22)*uAmt;
  if (max(col.r, max(col.g, col.b)) < 0.002) discard;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const PART_VS = /* glsl */`
attribute vec4 aA; attribute vec4 aB; attribute float aIdx;
uniform float uTime, uScale, uRadius, uHeight, uPSpeed, uPSize, uPSpread, uPSwirl, uDensity, uReveal, uResY, uSpinDir;
uniform vec3 uOrigin;
varying float vAlpha, vRot, vHi;
void main(){
  float on = step(aIdx, uDensity);
  float life = mix(1.4, 3.4, aA.x);
  float age = fract(uTime*max(uPSpeed,0.001)/life + aA.y);
  float ang = aA.z*6.2831 + age*uPSwirl*(0.5+aA.w)*2.5*(abs(uSpinDir) > 0.5 ? sign(uSpinDir) : sign(aA.w-0.5)); // spinDir: все частицы в одну сторону
  float r = uRadius*uPSpread*(0.35 + 0.85*aB.x)*(1.0 + age*0.35);
  float y = mix(-0.05, 1.25*(0.65+0.55*aB.y), age)*uHeight;
  vec3 wp = uOrigin + vec3(cos(ang)*r, y, sin(ang)*r)*uScale;
  wp.x += sin(age*9.0 + aB.z*20.0)*0.05*uScale;
  vec4 mv = viewMatrix*vec4(wp, 1.0);
  gl_Position = projectionMatrix*mv;
  float size = uPSize*(0.45 + aB.w)*uScale;
  gl_PointSize = on * size * projectionMatrix[1][1] * uResY * 0.5 / max(-mv.z, 0.01);
  vAlpha = smoothstep(0.0, 0.1, age)*smoothstep(1.0, 0.55, age)*uReveal;
  vRot = aB.z*6.2831 + uTime*(aA.w-0.5)*3.0;
  vHi = step(0.8, aB.y);
}`;

const BURST_VS = /* glsl */`
attribute vec4 aA; attribute vec4 aB; attribute float aIdx;
uniform float uT, uScale, uRadius, uHeight, uPSize, uResY, uDir;
uniform vec3 uOrigin;
varying float vAlpha, vRot, vHi;
void main(){
  float a = aA.z*6.2831;
  vec3 dir = vec3(cos(a), 0.0, sin(a));
  vec3 start = vec3(dir.x*uRadius*0.25, (0.15 + 0.8*aA.x)*uHeight, dir.z*uRadius*0.25);
  float spd = (1.5 + 2.5*aA.w)*uRadius;
  float tt = uT*(0.8 + 0.4*aB.x);
  vec3 off = dir*spd*(1.0 - exp(-3.0*tt))/3.0 + vec3(0.0, (0.4 + aB.y)*tt*uDir, 0.0);
  vec3 wp = uOrigin + (start + off)*uScale;
  vec4 mv = viewMatrix*vec4(wp, 1.0);
  gl_Position = projectionMatrix*mv;
  float life = clamp(tt/1.3, 0.0, 1.0);
  float size = uPSize*1.3*(0.5 + aB.w)*(1.0-life*0.6)*uScale;
  gl_PointSize = step(aIdx, 0.999) * size * projectionMatrix[1][1] * uResY * 0.5 / max(-mv.z, 0.01);
  vAlpha = 1.0 - life;
  vRot = aB.z*6.2831 + tt*(aA.w-0.5)*8.0;
  vHi = step(0.6, aB.y);
}`;

const PART_FS = /* glsl */`
uniform vec3 uC1, uC2; uniform float uPStretch;
varying float vAlpha, vRot, vHi;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float cs = cos(vRot), sn = sin(vRot);
  c = mat2(cs, -sn, sn, cs)*c;
  float d = abs(c.x)*2.0*uPStretch + abs(c.y)*2.0;
  if (d > 1.0 || vAlpha < 0.01) discard;
  vec3 col = mix(uC1, uC2, max(step(d, 0.28), vHi*0.6));
  gl_FragColor = vec4(col, vAlpha);
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------------ mask */

// Renders registered characters as flat colours (R, G, B = channel 0, 1, 2) into a
// half-resolution target. Aura shaders read it in screen space to hug the silhouette.
export class SilhouetteMask {
  constructor(renderer, { resolution = 0.5 } = {}) {
    this.res = resolution;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
    this.mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.entries = [];
    this.size = new THREE.Vector2();
    renderer.getDrawingBufferSize(this.size);
    this.setSize(this.size.x, this.size.y);
  }
  get texture() { return this.rt.texture; }
  setSize(w, h) { this.rt.setSize(Math.max(4, Math.round(w * this.res)), Math.max(4, Math.round(h * this.res))); }
  // Uses camera layers 10..12 so it renders only the characters.
  register(root, channel) {
    const layer = 10 + channel;
    root.traverse((o) => { if (o.isMesh) o.layers.enable(layer); });
    this.entries.push({ root, channel, layer });
  }
  render(renderer, scene, camera) {
    renderer.getDrawingBufferSize(this.size);
    const w = Math.max(4, Math.round(this.size.x * this.res)), h = Math.max(4, Math.round(this.size.y * this.res));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    const prev = { rt: renderer.getRenderTarget(), bg: scene.background, fog: scene.fog, ov: scene.overrideMaterial, mask: camera.layers.mask, ac: renderer.autoClear };
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);
    renderer.autoClear = false;
    scene.background = null; scene.fog = null; scene.overrideMaterial = this.mat;
    for (const e of this.entries) {
      if (!e.root.visible) continue;
      this.mat.color.setRGB(e.channel === 0 ? 1 : 0, e.channel === 1 ? 1 : 0, e.channel === 2 ? 1 : 0);
      camera.layers.set(e.layer);
      renderer.render(scene, camera);
    }
    camera.layers.mask = prev.mask;
    scene.background = prev.bg; scene.fog = prev.fog; scene.overrideMaterial = prev.ov;
    renderer.autoClear = prev.ac;
    renderer.setClearColor(cc, ca);
    renderer.setRenderTarget(prev.rt);
  }
}

/* ------------------------------------------------------------------ aura */

const MAX_LAYERS = 6, MAX_PARTS = 700, BURST_PARTS = 140;
const v3 = new THREE.Vector3();

function pointsGeometry(n, seed) {
  const g = new THREE.BufferGeometry();
  const rnd = mulberry(seed);
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4), I = new Float32Array(n), P = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 4; j++) { A[i * 4 + j] = rnd(); B[i * 4 + j] = rnd(); }
    I[i] = i / n;
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aA', new THREE.BufferAttribute(A, 4));
  g.setAttribute('aB', new THREE.BufferAttribute(B, 4));
  g.setAttribute('aIdx', new THREE.BufferAttribute(I, 1));
  return g;
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export class Aura {
  constructor({ channel = 0, params = PRESETS.spirit.params, seed = 1, visible = true } = {}) {
    this.channel = channel;
    this.seed = seed;
    this.params = { ...params };
    this.group = new THREE.Group();
    this.group.name = 'aura';
    this.time = 0;
    this.reveal = visible ? 1 : 0;
    this.revealTarget = this.reveal;
    this.revealMode = 'rise';
    this.tween = null;
    this.burstT = 99; this.burstDir = 1;
    this.glowColor = new THREE.Color();

    const col = () => ({ value: new THREE.Color() });
    this.u = {
      uTime: { value: 0 }, uScale: { value: 1 }, uRadius: { value: 1 }, uHeight: { value: 2 }, uThick: { value: 0.3 },
      uColumn: { value: 0.5 }, uHug: { value: 1 }, uTongues: { value: 1 }, uTurb: { value: 1 }, uWarp: { value: 1 },
      uSwirl: { value: 0.5 }, uSwirlFreq: { value: 1 }, uSpeed: { value: 1 }, uNoiseScale: { value: 0.4 },
      uHoleAmt: { value: 0 }, uHoleSize: { value: 0.2 }, uHoleClear: { value: 0 }, uSkulls: { value: 0 }, uSkullSize: { value: 0.4 },
      uReveal: { value: 1 }, uRevealMode: { value: 0 }, uFrontCover: { value: 0.3 },
      uLevels: { value: 3 }, uSoft: { value: 0 }, uCore: { value: 1 }, uLineW: { value: 0 }, uInnerLine: { value: 0 },
      uHalfAmt: { value: 0.5 }, uHalfSize: { value: 3 }, uHalfSpread: { value: 0.3 }, uOpacity: { value: 1 },
      uCEdge: col(), uCMid: col(), uCCore: col(), uCLine: col(), uCHalf: col(),
      uMask: { value: null }, uChan: { value: new THREE.Vector4() }, uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: new THREE.Vector2(1, 1) },
      uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uSize: { value: new THREE.Vector2(1, 2) }, uYMin: { value: -0.3 },
      uGround: { value: 1 },
    };
    this.u.uChan.value.set(channel === 0 ? 1 : 0, channel === 1 ? 1 : 0, channel === 2 ? 1 : 0, 0);

    const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
    const sheet = new THREE.PlaneGeometry(1, 1, 1, 16);
    this.layers = [];
    for (let i = 0; i < MAX_LAYERS; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...this.u, uOrigin: { value: new THREE.Vector3() }, uSeed: { value: seed * 3.17 + i * 1.731 }, uLayerK: { value: 0 },
          uFront: { value: 0 }, uSkullOn: { value: 0 }, uMirror: { value: i % 2 ? -1 : 1 }, uLayerAlpha: { value: 1 }, uLayerR: { value: 1 } },
        vertexShader: LAYER_VS, fragmentShader: LAYER_FS,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(sheet, mat);
      m.frustumCulled = false;
      this.layers.push(m);
      this.group.add(m);
    }

    this.ground = new THREE.Mesh(plane, new THREE.ShaderMaterial({
      uniforms: { ...this.u, uOrigin: { value: new THREE.Vector3() }, uR: { value: 1 } },
      vertexShader: GROUND_VS, fragmentShader: GROUND_FS, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    this.ground.frustumCulled = false;
    this.ground.renderOrder = -1;
    this.group.add(this.ground);

    this.pu = {
      uTime: this.u.uTime, uScale: this.u.uScale, uRadius: this.u.uRadius, uHeight: this.u.uHeight, uOrigin: { value: new THREE.Vector3() },
      uPSpeed: { value: 1 }, uPSize: { value: 0.1 }, uSpinDir: { value: 0 }, uPSpread: { value: 1 }, uPSwirl: { value: 1 }, uPStretch: { value: 2 }, uDensity: { value: 0.5 },
      uReveal: { value: 1 }, uResY: { value: 800 }, uC1: col(), uC2: col(),
    };
    this.points = new THREE.Points(pointsGeometry(MAX_PARTS, seed * 7 + 1), new THREE.ShaderMaterial({
      uniforms: this.pu, vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false,
    }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.group.add(this.points);

    this.bu = { ...this.pu, uT: { value: 99 }, uDir: { value: 1 } };
    this.burst = new THREE.Points(pointsGeometry(BURST_PARTS, seed * 11 + 5), new THREE.ShaderMaterial({
      uniforms: this.bu, vertexShader: BURST_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false,
    }));
    this.burst.frustumCulled = false;
    this.burst.renderOrder = 3;
    this.burst.visible = false;
    this.group.add(this.burst);

    this.light = new THREE.PointLight(0xffffff, 0, 6, 1.6);
    this.group.add(this.light);
    // second, wider light low over the ground: lights floor, props and neighbours
    this.envLight = new THREE.PointLight(0xffffff, 0, 5, 1.2);
    this.group.add(this.envLight);
    this.pool = new THREE.Mesh(plane, new THREE.ShaderMaterial({
      uniforms: { uOrigin: { value: new THREE.Vector3() }, uR: { value: 4 }, uTime: this.u.uTime, uScale: this.u.uScale,
        uAmt: { value: 1 }, uHalfSize: this.u.uHalfSize, uColor: { value: new THREE.Color() } },
      vertexShader: GROUND_VS, fragmentShader: POOL_FS, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }));
    this.pool.frustumCulled = false;
    this.pool.renderOrder = -2;
    this.group.add(this.pool);
  }

  get visibleAmount() { return this.reveal; }

  set(params) { Object.assign(this.params, params); this.tween = null; }

  transitionTo(params, seconds = 1.2) {
    if (seconds <= 0) return this.set(params);
    this.tween = { from: { ...this.params }, to: { ...this.params, ...params }, t: 0, dur: seconds };
  }

  appear(mode) {
    this.revealMode = mode || this.params.revealIn;
    this.revealTarget = 1;
    this.burstT = 0; this.burstDir = 1;
  }

  disappear(mode) {
    this.revealMode = mode || this.params.revealOut;
    this.revealTarget = 0;
    if (this.revealMode !== 'rise') { this.burstT = 0; this.burstDir = 1.6; }
  }

  toggle() { this.revealTarget > 0.5 ? this.disappear() : this.appear(); }

  // feet: world position of the character's feet.
  update(dt, camera, feet, mask, renderer) {
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const x = Math.min(tw.t / tw.dur, 1);
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      this.params = lerpParams(tw.from, tw.to, e);
      if (x >= 1) this.tween = null;
    }
    const P = this.params;
    const dur = Math.max(P.revealDur, 0.05);
    this.reveal += Math.sign(this.revealTarget - this.reveal) * Math.min(Math.abs(this.revealTarget - this.reveal), dt / dur);
    this.burstT += dt;

    this.time += dt;
    const ts = P.stepFps > 0 ? Math.floor(this.time * P.stepFps) / P.stepFps : this.time;

    // "power" is the in-game state knob: calm (0) → full (1)
    const pw = P.power;
    const height = P.height * (0.6 + 0.55 * pw);
    const radius = P.radius * (0.8 + 0.25 * pw);
    const speed = P.speed * (0.45 + 0.75 * pw);
    const turb = P.turb * (0.7 + 0.45 * pw);

    const u = this.u;
    u.uTime.value = ts % 1000;
    u.uScale.value = P.scale; u.uRadius.value = radius; u.uHeight.value = height; u.uThick.value = P.thick;
    u.uColumn.value = P.column; u.uHug.value = P.hug; u.uTongues.value = P.tongues;
    u.uTurb.value = turb; u.uWarp.value = P.warp; u.uSwirl.value = P.swirl; u.uSwirlFreq.value = P.swirlFreq;
    u.uSpeed.value = speed; u.uNoiseScale.value = P.noiseScale;
    u.uHoleAmt.value = P.holeAmt; u.uHoleSize.value = P.holeSize; u.uHoleClear.value = P.holeClear;
    u.uSkulls.value = P.skulls; u.uSkullSize.value = P.skullSize;
    u.uLevels.value = P.levels; u.uSoft.value = P.soft; u.uCore.value = P.core; u.uLineW.value = P.lineW; u.uInnerLine.value = P.innerLine;
    u.uHalfAmt.value = P.halfAmt; u.uHalfSize.value = P.halfSize; u.uHalfSpread.value = P.halfSpread; u.uOpacity.value = P.opacity;
    u.uFrontCover.value = P.frontCover; u.uGround.value = P.ground;
    u.uCEdge.value.set(P.cEdge); u.uCMid.value.set(P.cMid); u.uCCore.value.set(P.cCore); u.uCLine.value.set(P.cLine); u.uCHalf.value.set(P.cHalf);
    const modeIdx = { rise: 0, dissolve: 1, burst: 2 }[this.revealMode] ?? 0;
    u.uRevealMode.value = modeIdx;
    u.uReveal.value = this.reveal;
    u.uMask.value = mask ? mask.texture : null;
    if (!mask) u.uHug.value = 0;

    // camera-facing basis that keeps world-up
    const camPos = camera.getWorldPosition(v3).clone();
    const center = feet.clone(); center.y += height * 0.5 * P.scale;
    const view = center.clone().sub(camPos).normalize();
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(view, -view.y);
    if (up.lengthSq() < 1e-4) up.set(0, 0, -1);
    up.normalize();
    const right = new THREE.Vector3().crossVectors(up, view.clone().negate()).normalize();
    u.uRight.value.copy(right); u.uUp.value.copy(up);
    const halfW = (radius * 1.25 + P.thick * 1.6 + 0.35 + P.swirl * radius * 0.35) * P.scale;
    u.uSize.value.set(halfW, height * 1.45 * P.scale);
    u.uYMin.value = -0.4 * P.scale;

    // screen-uv per metre at the aura's distance (for silhouette sampling)
    if (renderer) renderer.getDrawingBufferSize(u.uRes.value);
    const dist = camPos.distanceTo(center);
    const py = 1 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5) * Math.max(dist, 0.01));
    u.uPx.value.set(py / camera.aspect, py);

    // layers: back → front
    const n = Math.max(1, Math.round(P.layers));
    const nf = Math.min(Math.round(P.front), n - 1);
    const nb = n - nf;
    const hv = new THREE.Vector3(view.x, 0, view.z);
    if (hv.lengthSq() < 1e-6) hv.set(0, 0, -1);
    hv.normalize();
    for (let i = 0; i < MAX_LAYERS; i++) {
      const m = this.layers[i];
      m.visible = i < n && this.reveal > 0.001;
      if (!m.visible) continue;
      const lu = m.material.uniforms;
      const isFront = i >= nb;
      const k = isFront ? (i - nb + 1) / Math.max(nf, 1) : i / Math.max(nb - 1, 1);
      const depth = isFront ? -(0.15 + 0.3 * k) * P.depth : (1 - k * 0.8) * P.depth + 0.05;
      lu.uOrigin.value.copy(feet).addScaledVector(hv, depth * P.scale * radius);
      lu.uFront.value = isFront ? 1 : 0;
      lu.uLayerAlpha.value = isFront ? P.frontOpacity : 1;
      lu.uLayerR.value = isFront ? 0.85 : 1.12 - 0.25 * (i / Math.max(nb - 1, 1));
      lu.uSkullOn.value = !isFront && i === Math.max(0, nb - 1) ? 1 : 0;
      m.renderOrder = 1 + i;
    }

    // ground pool
    this.ground.visible = P.ground > 0.01 && this.reveal > 0.001;
    this.ground.material.uniforms.uOrigin.value.copy(feet).y += 0.015;
    this.ground.material.uniforms.uR.value = radius * 1.6 * P.scale;

    // particles
    const pu = this.pu;
    pu.uOrigin.value.copy(feet);
    pu.uPSpeed.value = P.pSpeed * (0.5 + 0.7 * pw); pu.uPSize.value = P.pSize; pu.uPSpread.value = P.pSpread;
    pu.uPSwirl.value = P.pSwirl; pu.uPStretch.value = P.pStretch; pu.uSpinDir.value = P.spinDir || 0;
    pu.uDensity.value = P.pDensity * (0.35 + 0.65 * pw);
    pu.uReveal.value = Math.min(1, this.reveal * 1.5);
    pu.uResY.value = u.uRes.value.y;
    pu.uC1.value.set(P.cP1); pu.uC2.value.set(P.cP2);
    this.points.visible = this.reveal > 0.001 && P.pDensity > 0;

    this.burst.visible = this.burstT < 1.6;
    this.bu.uT.value = this.burstT;
    this.bu.uDir.value = this.burstDir;

    // light + glow the character can use (emissive)
    this.glowColor.set(P.cCore).lerp(new THREE.Color(P.cMid), 0.4);
    const g = P.glow * this.reveal * (0.4 + 0.6 * pw);
    this.light.color.copy(this.glowColor);
    this.light.intensity = g * 2.5 * P.scale * P.scale;
    this.light.distance = 5 * P.scale;
    this.light.position.copy(feet); this.light.position.y += height * 0.45 * P.scale;
    this.light.position.addScaledVector(hv, -0.4 * P.scale);
    this.glowStrength = g;

    // glow on the surroundings
    const tf = ts * (0.6 + speed);
    const flick = 1 + P.envFlicker * 0.5 * (0.5 * Math.sin(tf * 7.3) + 0.3 * Math.sin(tf * 13.1 + 1.3) + 0.2 * Math.sin(tf * 2.3 + 0.4));
    const eg = P.envGlow * this.reveal * (0.45 + 0.55 * pw) * flick;
    const er = P.envRadius * P.scale * (0.85 + 0.15 * pw);
    this.envLight.color.copy(this.glowColor);
    this.envLight.intensity = eg * 7 * P.scale * P.scale;
    this.envLight.distance = er;
    this.envLight.position.copy(feet); this.envLight.position.y += 0.7 * P.scale;
    this.pool.visible = P.envPool > 0.01 && eg > 0.001;
    const pm = this.pool.material.uniforms;
    pm.uOrigin.value.copy(feet).y += 0.01;
    pm.uR.value = er * 0.62;
    pm.uAmt.value = P.envPool * eg * 0.32;
    pm.uColor.value.copy(this.glowColor);
    this.envStrength = eg;
  }

  dispose() {
    this.group.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); });
  }
}
