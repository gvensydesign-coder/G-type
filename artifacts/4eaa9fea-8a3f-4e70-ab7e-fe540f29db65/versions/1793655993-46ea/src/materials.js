// Материалы в стиле референс-видео: «нарисованный» свет в 3 тона, пятнистые материалы,
// тёплый свет / холодная тень, воздушная перспектива, листва пятнами с крапчатым краем.
import * as THREE from 'three';
import { NOISE, GLOBAL_DECL, HAZE_FN } from './glsl.js';
import { SIGIL_GLSL, RUNE_GLSL } from './sigils.js';

const C = (h) => new THREE.Color(h);
const lin = (h) => new THREE.Color(h); // ColorManagement конвертирует sRGB → linear при set()

// ---------- Глобальные параметры света и воздуха (общие для всех материалов) ----------
export const G = {
  uSunDir: { value: new THREE.Vector3(-0.55, 0.62, 0.56).normalize() },
  uGlowDir: { value: new THREE.Vector3(-0.12, 0.30, -0.95).normalize() },
  uSunCol: { value: new THREE.Vector3(1.06, 1.00, 0.90) },
  uShadeCol: { value: new THREE.Vector3(0.56, 0.64, 0.78) },
  uHazeWarm: { value: lin('#fbe4bb') },
  uHazeCool: { value: lin('#bcd0c0') },
  uHazeDen: { value: 0.0065 },
  uHazeMax: { value: 0.95 },
  uHazeOn: { value: 1.0 },
  uTime: { value: 0 },
  uGroundFog: { value: 1.0 },
  uTint: { value: new THREE.Vector3(1, 1, 1) },
  uCloudSh: { value: 1.0 },
  uWind: { value: 0.0 },
  uBrushTex: { value: null },  // набор отпечатков кисти (textures.js)
  // кто приминает траву: (x, сила, z, радиус); первые — герои, дальше след, который распрямляется
  uPush: { value: Array.from({ length: 10 }, () => new THREE.Vector4(0, 0, -999, 0.1)) },
  uRain: { value: 0 },
  uLamp0: { value: new THREE.Vector4(0, -100, 0, 1) }, uLamp1: { value: new THREE.Vector4(0, -100, 0, 1) },
  uLampC0: { value: new THREE.Vector3() }, uLampC1: { value: new THREE.Vector3() },
  uTrail: { value: null },
  uRuneK: { value: 0 }, uRuneC: { value: new THREE.Vector3(0.55, 1.0, 0.85) },
};

const LIGHTS = THREE.UniformsLib.lights;

function withGlobals(u) {
  return Object.assign({}, THREE.UniformsUtils.clone(LIGHTS), G, u);
}

// ---------------- Вершинный шейдер: инстансы + координаты теней ----------------
const VERT_COMMON = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
#ifdef FOLIAGE
attribute vec3 aCenter; varying vec3 vCN;
#endif
#ifdef SWAY
uniform float uSway; uniform float uTime;
#endif
#ifdef SHELL
uniform float uShellOff;
#endif
#ifdef PUSH
uniform vec4 uPush[10];
#endif
`;
const VERT_MAIN = /* glsl */`
  vec3 transformed = position; vec3 objectNormal = normal;
  #ifdef USE_SKINNING
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <skinning_vertex>
  #endif
  vec4 lp = vec4(transformed, 1.0);
  vec3 nrm = objectNormal;
  vOPos = position; vUv = uv;
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp; nrm = mat3(instanceMatrix) * nrm;
  #endif
  vec4 worldPosition = modelMatrix * lp;
  #ifdef SWAY
    float sw = sin(uTime*1.3 + worldPosition.x*0.35 + worldPosition.z*0.2) * uSway * max(worldPosition.y - 0.0, 0.0) * 0.02;
    worldPosition.x += sw; worldPosition.z += sw*0.5;
  #endif
  #ifdef SHELL
    worldPosition.xyz += normalize(mat3(modelMatrix) * nrm) * uShellOff; // пушистый слой мха над основным
  #endif
  #ifdef PUSH
    // ветки куста раздвигаются, когда герой проходит рядом (только живые герои: первые два)
    for (int i = 0; i < 2; i++) {
      vec2 d = worldPosition.xz - uPush[i].xz; float dist = length(d); float r = uPush[i].w * 1.6;
      float k = (1.0 - smoothstep(r * 0.3, r, dist)) * uPush[i].y * smoothstep(3.2, 0.3, worldPosition.y);
      worldPosition.xz += d / max(dist, 0.05) * k * 0.55; worldPosition.y -= k * 0.15;
    }
  #endif
  vWPos = worldPosition.xyz;
  vWN = normalize(mat3(modelMatrix) * nrm);
  #ifdef FOLIAGE
    vec4 cw = modelMatrix * vec4(aCenter, 1.0);
    vCN = normalize(worldPosition.xyz - cw.xyz);
  #endif
  vec3 transformedNormal = normalMatrix * nrm;
  #include <shadowmap_vertex>
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
`;
const VERT = VERT_COMMON + `void main(){` + VERT_MAIN + `}`;

const FRAG_HEAD = /* glsl */`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${GLOBAL_DECL}
${NOISE}
${HAZE_FN}
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
`;

// ======================= PaintMat: камень, металл, кора, земля =======================
// 3 плоских тона с рваной границей, пятна (ржавчина / лишайник / сирень), мазки, швы, контровой свет.
const PAINT_FRAG = FRAG_HEAD + /* glsl */`
uniform vec3 uBase;
uniform vec3 uPA; uniform vec4 uPAp;  // цвет пятна A, (масштаб, порог, рваность, сила)
uniform vec3 uPB; uniform vec4 uPBp;
uniform vec3 uPC; uniform vec4 uPCp;
uniform vec3 uStroke;  // направление мазка (растяжение шума), сила в длине вектора
uniform float uStrokeAmt;
uniform vec3 uSeam; uniform vec2 uSeamFreq; uniform float uSeamAmt;
uniform float uBreak;  // рваность границы света
uniform float uRim;
uniform vec3 uEmit;
uniform float uPattern; // 0 нет, 1 вертушка, 2 луг с цветами, 3 стекло иллюминатора
uniform float uLift;
uniform vec3 uLitT; uniform vec3 uShadeT;
uniform float uBrush;
uniform sampler2D uBrushTex;
uniform float uWear; uniform float uGrime; uniform float uGloss; uniform float uStreak;
uniform float uRunes; uniform float uRuneK; uniform vec3 uRuneC; uniform float uCrack; uniform float uGlint; uniform float uFur;
${SIGIL_GLSL}
${RUNE_GLSL}
// трещины: границы ячеек Вороного на плоскости, ближайшей к поверхности; только местами
float crackMask(vec3 w, vec3 N){
  vec3 an = abs(N); vec2 p = an.x > an.y && an.x > an.z ? w.zy : (an.y > an.z ? w.xz : w.xy);
  p = p * 1.3 + (vnoise(w * 3.0) - 0.5) * 0.25;
  vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 o = vec2(hash12(i + g), hash12(i + g + 19.1));
    float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return (1.0 - smoothstep(0.0, 0.045, d2 - d1)) * step(0.6, fbm(w * 0.7 + 5.0));
}
float ripples(vec2 p, float t){
  vec2 c = floor(p), f = fract(p) - 0.5; float h = hash12(c);
  float ph = fract(t * 0.8 + h);
  float r = length(f - (vec2(hash12(c + 3.1), hash12(c + 7.7)) - 0.5) * 0.4);
  return smoothstep(0.035, 0.0, abs(r - ph * 0.42)) * (1.0 - ph) * step(0.35, h);
}
// Отпечатки кисти: в каждой клетке свой мазок (номер, поворот, сдвиг), 2×2 соседних клетки — мазки перекрываются
float stamps(vec2 bp, float seed){
  vec2 base = floor(bp - 0.5); float acc = 0.0;
  vec2 gx = dFdx(bp), gy = dFdy(bp);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 cell = base + vec2(float(i), float(j));
    float h = hash12(cell + seed);
    vec2 ctr = cell + 0.5 + (vec2(hash12(cell + 3.7), hash12(cell + 9.1)) - 0.5) * 0.5;
    float a = h * 3.1416; mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 uv = rot * (bp - ctr) / 1.5 + 0.5;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) continue;
    float idx = floor(hash12(cell + 5.3) * 16.0);
    vec2 auv = (vec2(mod(idx, 4.0), floor(idx / 4.0)) + uv) / 4.0;
    // тело мазка (размытая выборка) + ворс (резкая): Кувахара в пост-обработке съедает тонкий ворс, тело остаётся
    float v = textureGrad(uBrushTex, auv, rot * gx * 0.7, rot * gy * 0.7).r * 1.6 + textureGrad(uBrushTex, auv, rot * gx / 6.0, rot * gy / 6.0).r * 0.4;
    acc += v * (hash12(cell + 7.7) > 0.45 ? 1.0 : -0.8);
  }
  return acc;
}
#ifdef HAS_MAP
uniform sampler2D uMap;
#endif
void main(){
  vec3 N = normalize(vWN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 L = uSunDir;
  vec3 alb = uBase;
  #ifdef HAS_MAP
    alb *= texture2D(uMap, vUv, 1.2).rgb;  // текстура модели как есть, чуть мягче (без мелкого шума)
  #endif

  // --- мазки: шум, растянутый вдоль направления мазка ---
  // вдали меньше деталей, как на аниме-фонах: мазки, швы и рваность пятен уходят
  float near = smoothstep(85.0, 22.0, length(cameraPosition - vWPos));
  vec3 sp = vWPos * (vec3(1.0) + uStroke * 8.0);
  float st = vnoise(sp * 2.2) * 0.65 + vnoise(sp * 6.0) * 0.35 * near;
  alb *= 1.0 + (st - 0.5) * uStrokeAmt * mix(0.4, 1.0, near);

  // --- пятна (как в видео: ржавчина, бирюзовый лишайник, сиреневые подтёки) ---
  // пятна: крупная форма + мелкая рваность; у сиреневых подтёков тёмная кромка, как в видео
  vec3 qa = vWPos * uPAp.x + 3.1, qb = vWPos * uPBp.x + 17.7, qc = vWPos * uPCp.x - 8.3;
  float nA = fbm(qa) + (vnoise(qa*7.0)-0.5)*uPAp.z + (vnoise(qa*23.0)-0.5)*uPAp.z*0.35*near;
  float nB = fbm(qb) + (vnoise(qb*7.0)-0.5)*uPBp.z + (vnoise(qb*23.0)-0.5)*uPBp.z*0.35*near;
  float nC = fbm(qc) + (vnoise(qc*7.0)-0.5)*uPCp.z + (vnoise(qc*23.0)-0.5)*uPCp.z*0.35*near;
  float mA = step(uPAp.y, nA) * uPAp.w, mB = step(uPBp.y, nB) * uPBp.w, mC = step(uPCp.y, nC) * uPCp.w;
  float eC = (1.0 - smoothstep(0.0, 0.018, abs(nC - uPCp.y))) * uPCp.w;
  float eA = (1.0 - smoothstep(0.0, 0.012, abs(nA - uPAp.y))) * uPAp.w * 0.6;
  alb = mix(alb, uPA, mA); alb = mix(alb, uPB, mB); alb = mix(alb, uPC, mC);
  alb *= 1.0 - max(eC * 0.38, eA * 0.3);
  // шерсть и кора Лешего: вертикальные пряди, тёмные корни, светлые кончики
  if (uFur > 0.0) {
    float hair = vnoise(vec3(vWPos.x * 38.0, vWPos.y * 2.6, vWPos.z * 38.0));
    alb *= 1.0 - step(0.62, hair) * 0.35 * uFur;
    alb = mix(alb, alb * vec3(1.25, 1.2, 0.95), step(hair, 0.18) * 0.6 * uFur);
  }

  // --- сколы и светлый износ на рёбрах: кривизна из того, как быстро меняется нормаль на экране ---
  float chipEdge = 0.0;
  if (uWear > 0.0) {
    float curv = length(fwidth(N)) / max(length(fwidth(vWPos)), 1e-4);
    float edge = smoothstep(0.7, 1.7, curv) * near;
    float cn = fbm(vWPos * 2.6 + 11.0) + (vnoise(vWPos * 14.0) - 0.5) * 0.28;
    float th = 0.66 - edge * 0.3;
    float chip = step(th, cn) * edge * uWear;
    chipEdge = (1.0 - smoothstep(0.0, 0.025, abs(cn - th))) * edge * uWear;
    alb = mix(alb, vec3(0.94, 0.89, 0.80), chip * 0.8);
  }
  // --- грязь и зелень гуще у земли ---
  if (uGrime > 0.0) {
    float gr = smoothstep(1.7, 0.05, vWPos.y + (fbm(vWPos * 1.1 + 3.0) - 0.5) * 1.5) * uGrime;
    alb = mix(alb, alb * vec3(0.42, 0.58, 0.40), gr * 0.9);
  }
  // --- заклёпки под швами и ржавые подтёки вниз от них ---
  float rivRing = 0.0, rivCap = 0.0;
  if (uStreak > 0.0) {
    float wob0 = (vnoise(vOPos * 3.0) - 0.5) * 0.06;
    float spc = 1.0 / uSeamFreq.y;
    float ry = fract(vOPos.y * uSeamFreq.y + wob0);
    float dy = (1.0 - ry) * spc;                       // метры вниз от шва
    float along = vOPos.x + vOPos.z;
    float cid = floor(along / 0.38);
    float dx = (fract(along / 0.38) - 0.5) * 0.38;
    float rv = length(vec2(dx, dy - 0.13));
    float rivet = (1.0 - smoothstep(0.032, 0.04, rv)) * step(0.3, hash12(vec2(cid, 2.0)));
    rivRing = smoothstep(0.022, 0.03, rv) * rivet; rivCap = rivet * (1.0 - rivRing) * step(dy, 0.125);
    float h = hash12(vec2(cid, floor(vOPos.y * uSeamFreq.y + wob0)));
    float slen = 0.2 + 1.0 * h * h;
    float k = clamp((dy - 0.15) / slen, 0.0, 1.0);
    float swob = (vnoise(vec3(vOPos.y * 4.0, cid, 1.0)) - 0.5) * 0.035;
    float streak = step(abs(dx + swob), 0.024 * (1.0 - k * 0.7)) * step(0.15, dy) * step(k, 0.999) * step(0.4, h);
    alb = mix(alb, uPA * 0.9, streak * (1.0 - k) * 0.85 * uStreak * near);
    rivRing *= uStreak * near; rivCap *= uStreak * near;
  }

  // --- трещины на камне ---
  float crack = 0.0;
  if (uCrack > 0.0) crack = crackMask(vWPos, N) * uCrack * near;
  // --- руны поясом посреди каждого камня: днём вырезаны, ночью светятся ---
  float rune = 0.0;
  if (uRunes > 0.0) {
    float by = vOPos.y / 0.42 + 0.5;
    if (by > 0.0 && by < 1.0) {
      float along = (vOPos.x + vOPos.z) / 0.3;
      vec2 cell = vec2(floor(along), floor(vOPos.y * 0.01) + 3.0);
      rune = runeGlyph(vec2(fract(along), by), cell, 0.06) * step(0.18, hash12(cell + 11.0)) * uRunes;
    }
  }
  // --- лужи и тропа на земле, мокрый берег ручья ---
  float puddle = 0.0;
  if (uPattern > 1.5 && uPattern < 2.5) {
    vec2 tr = trailAt(vWPos);
    alb = mix(alb, vec3(0.55, 0.47, 0.32), smoothstep(0.08, 0.5, tr.r) * 0.75);   // вытоптанная земля
    alb *= 1.0 - smoothstep(0.2, 0.7, tr.g) * 0.32;                                 // свежие следы темнее
    float sd = streamDist(vWPos);
    alb = mix(alb, alb * vec3(0.55, 0.62, 0.58), smoothstep(1.2, 0.0, sd) * 0.8);  // мокрый берег
    puddle = step(0.6, fbm(vWPos * 0.22 + 2.0) + tr.r * 0.3) * uRain;
  }
  alb *= 1.0 - 0.22 * uRain;  // в дождь всё темнее
  // --- узоры ---
  if (uPattern > 0.5 && uPattern < 1.5) { // вертушка: кремовый диск с оранжевыми лопастями
    vec2 q = vUv - 0.5; float a = atan(q.y, q.x); float r = length(q);
    float w = step(0.5, fract((a / 6.2831853) * 4.0 + r * 1.4));
    alb = mix(vec3(0.93, 0.82, 0.66), vec3(0.62, 0.20, 0.10), w * step(0.06, r));
    alb = mix(alb, vec3(0.30,0.27,0.30), step(0.46, r));
  }
  if (uPattern > 1.5 && uPattern < 2.5) { // луг: мелкие белые и сиреневые цветы, тёмные пучки
    vec2 cell = floor(vWPos.xz * 7.0); vec2 f = fract(vWPos.xz * 7.0) - 0.5;
    float h = hash12(cell);
    vec2 o = vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5;
    float d = length(f - o * 0.6);
    float bloom = step(0.93, h) * step(d, 0.13) * step(0.45, fbm(vWPos * 0.25));
    alb = mix(alb, mix(vec3(0.95,0.94,0.88), vec3(0.72,0.66,0.92), step(0.975, h)), bloom);
    float tuft = step(0.62, fbm(vWPos * 1.7 + 4.0));
    alb *= 1.0 - tuft * 0.22;
  }
  if (uPattern > 2.5) { // стекло иллюминатора: янтарь с бликом сверху
    alb = mix(vec3(0.62, 0.42, 0.18), vec3(0.85, 0.66, 0.36), smoothstep(-0.2, 0.4, vOPos.y));
  }

  // --- швы обшивки (тонкие рваные линии) ---
  float seam = 0.0;
  if (uSeamAmt > 0.0) {
    float wob = (vnoise(vOPos * 3.0) - 0.5) * 0.06;
    float sy = abs(fract(vOPos.y * uSeamFreq.y + wob) - 0.5);
    float sx = abs(fract((vOPos.x + vOPos.z) * uSeamFreq.x + wob) - 0.5);
    float lw = 0.022 + 0.03 * vnoise(vOPos * 2.1 + 5.0); // толщина линии гуляет, как у пера
    seam = max(step(0.5 - lw, sy), step(0.5 - lw * 0.8, sx) * step(0.4, vnoise(vOPos * 1.3)));
    seam *= step(0.3, vnoise(vOPos * 4.0 + 2.0)) * uSeamAmt;
  }

  // --- свет: 3 тона, рваная граница, тени из shadow map ---
  float sh = getShadowMask();
  sh *= canopyLight(vWPos); // пятна солнца сквозь листву
  sh *= cloudShade(vWPos);  // тени облаков бегут по земле
  float ndl = dot(N, L);
  float jit = (fbm(vWPos * 1.6) - 0.5) * uBreak + (vnoise(vWPos * 9.0) - 0.5) * uBreak * 0.4;
  float t = max(ndl, 0.0) * mix(0.0, 1.0, sh) + jit;
  float tone = t > 0.42 ? 2.0 : (t > 0.06 ? 1.0 : 0.0);
  vec3 shade = alb * uShadeCol * uShadeT * (0.80 + 0.12 * N.y) + uLift;
  vec3 lit = alb * uSunCol * uLitT;
  vec3 mid = mix(shade, lit, 0.58);
  vec3 col = tone > 1.5 ? lit : (tone > 0.5 ? mid : shade);

  // небесный подсвет сверху (тёплый кремовый) и отражённый от травы снизу (зелёный)
  col += alb * (vec3(0.05, 0.045, 0.03) * max(N.y, 0.0) + vec3(0.0, 0.03, 0.012) * max(-N.y, 0.0));

  // контровой свет: солнце за объектом подсвечивает край тёплым
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0) * max(dot(-V, uGlowDir), 0.0);
  col += uSunCol * vec3(1.0, 0.85, 0.55) * step(0.18, rim) * uRim * 0.55;

  col = mix(col, col * vec3(0.42, 0.36, 0.42), seam * mix(0.5, 1.0, near));
  col *= 1.0 - chipEdge * 0.4 - rivRing * 0.45;
  col = mix(col, col * vec3(0.32, 0.28, 0.33), crack * 0.85);
  col = mix(col, col * vec3(0.55, 0.5, 0.55), rune * (1.0 - uRuneK));
  // искры кольчуги: серые светлые места текстуры мерцают точками на свету
  if (uGlint > 0.0) {
    float lum = dot(alb, vec3(0.333)); float sat = max(alb.r, max(alb.g, alb.b)) - min(alb.r, min(alb.g, alb.b));
    float metal = step(sat, 0.12) * step(0.3, lum);
    float sp = hash13(floor(vWPos * 85.0) + floor(uTime * 5.0));
    col += uSunCol * step(0.94, sp) * step(0.55, dot(reflect(-L, N), V)) * metal * uGlint * 0.9;
  }
  col += rivCap * lit * 0.18;

  // блик металла: пятно с рваным краем, как положенное кистью, только на свету
  if (uGloss > 0.0) {
    vec3 R = reflect(-L, N);
    float s = dot(R, V) + (vnoise(vWPos * 3.5) - 0.5) * 0.14;
    float hl = step(0.8, s) * step(0.5, tone);
    float hl2 = step(0.55, s) * step(0.5, tone) * (1.0 - hl);
    col = mix(col, uSunCol * vec3(1.0, 0.97, 0.88) * 1.15, hl * uGloss);
    col += lit * 0.10 * hl2 * uGloss;
  }

  // мазки кистью: короткие штрихи, направление меняется пятнами (как на крупных планах видео)
  // отпечатки кисти с ворсом; трипланарно: три проекции смешаны по нормали, рисунок не тянется на склонах
  if (uBrush > 0.0 && near > 0.01) {
    vec3 w = pow(abs(N), vec3(4.0)); w /= (w.x + w.y + w.z);
    float b = 0.0;
    if (w.x > 0.05) b += stamps(vWPos.zy * 1.4, 1.0) * w.x;
    if (w.y > 0.05) b += stamps(vWPos.xz * 1.4, 2.0) * w.y;
    if (w.z > 0.05) b += stamps(vWPos.xy * 1.4, 3.0) * w.z;
    float pos = max(b, 0.0) * step(0.5, tone), neg = max(-b, 0.0);  // светлые мазки только на свету и в полутени
    col *= 1.0 + (pos * 0.2 - neg * 0.15) * uBrush * near;
  }
  col += uEmit;
  col += alb * lampLight(vWPos, N) * 1.4;                 // ночные огни
  col += uRuneC * rune * uRuneK * 1.6;                    // руны светятся
  // дождь: мокрый блеск отражает небо, лужи с рябью
  if (uRain > 0.0) {
    vec3 R = reflect(-V, N);
    vec3 sky = hazeColor(R) * (0.6 + 0.4 * uSunCol.g);
    float sp = dot(reflect(-L, N), V) + (vnoise(vWPos * 6.0) - 0.5) * 0.2;
    col = mix(col, sky, step(0.86, sp) * uRain * 0.3);
    if (puddle > 0.0) {
      float rp = ripples(vWPos.xz * 3.0, uTime) + ripples(vWPos.xz * 3.0 + 17.0, uTime * 1.3);
      col = mix(col, sky * 0.85 + lampLight(vWPos, vec3(0.0, 1.0, 0.0)) * 0.4, puddle * 0.7);
      col += sky * rp * puddle * 0.5;
    }
  }
  if (uPattern > 1.5 && uPattern < 2.5) { // столб солнца на поляне: тёплое пятно света
    float r = length(vWPos.xz - vec2(0.0, -1.0));
    col += vec3(0.50, 0.34, 0.10) * (uSunCol / 1.06) * (uSunCol / 1.06) * smoothstep(13.0, 3.0, r + (fbm(vWPos*0.3)-0.5)*4.0); // ночью — холодная лужица лунного света
  }
  col = applyHaze(col, vWPos);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function paintMat(o = {}) {
  const p = (x, d) => (x === undefined ? d : x);
  const pA = o.patchA || {}, pB = o.patchB || {}, pC = o.patchC || {};
  const m = new THREE.ShaderMaterial({
    lights: true,
    side: o.side || THREE.FrontSide,
    uniforms: withGlobals({
      uBase: { value: C(o.base || '#c8c0b8') },
      uPA: { value: C(pA.col || '#cc7149') }, uPAp: { value: new THREE.Vector4(p(pA.scale, 0.6), p(pA.th, 0.62), p(pA.edge, 0.5), p(pA.amt, 0)) },
      uPB: { value: C(pB.col || '#637d83') }, uPBp: { value: new THREE.Vector4(p(pB.scale, 0.45), p(pB.th, 0.6), p(pB.edge, 0.4), p(pB.amt, 0)) },
      uPC: { value: C(pC.col || '#8f7fa6') }, uPCp: { value: new THREE.Vector4(p(pC.scale, 1.1), p(pC.th, 0.66), p(pC.edge, 0.6), p(pC.amt, 0)) },
      uStroke: { value: new THREE.Vector3(...(o.strokeDir || [0, 0, 0])) },
      uStrokeAmt: { value: p(o.strokeAmt, 0.18) },
      uSeam: { value: new THREE.Vector3() }, uSeamFreq: { value: new THREE.Vector2(...(o.seamFreq || [0.5, 0.7])) },
      uSeamAmt: { value: p(o.seam, 0) },
      uBreak: { value: p(o.break, 0.22) },
      uRim: { value: p(o.rim, 1) },
      uEmit: { value: new THREE.Color(0, 0, 0) },
      uPattern: { value: p(o.pattern, 0) },
      uLift: { value: p(o.lift, 0.015) },
      uLitT: { value: new THREE.Vector3(...(o.litTint || [1, 1, 1])) },
      uShadeT: { value: new THREE.Vector3(...(o.shadeTint || [1, 1, 1])) },
      uBrush: { value: p(o.brush, 1) },
      uSway: { value: p(o.sway, 0) },
      uWear: { value: p(o.wear, 0) }, uGrime: { value: p(o.grime, 0) }, uGloss: { value: p(o.gloss, 0) }, uStreak: { value: p(o.streak, 0) },
      uRunes: { value: p(o.runes, 0) }, uCrack: { value: p(o.crack, 0) }, uGlint: { value: p(o.glint, 0) }, uFur: { value: p(o.fur, 0) },
    }),
    vertexShader: VERT,
    fragmentShader: PAINT_FRAG,
  });
  m.defines = {};
  if (o.sway) m.defines.SWAY = 1;
  if (o.map) { m.defines.HAS_MAP = 1; m.uniforms.uMap = { value: o.map }; }
  return m;
}

// ======================= FoliageMat: листва и мох пятнами =======================
const FOLIAGE_FRAG = FRAG_HEAD + /* glsl */`
varying vec3 vCN;
uniform vec3 uDark; uniform vec3 uMid; uniform vec3 uLight; uniform vec3 uHi;
uniform float uLeaf;    // масштаб «листового» шума
uniform float uSpeck;   // крапчатость края (0..1)
uniform float uFlowers;
uniform float uNAmp;
uniform float uWet;
#ifdef SHELL
uniform float uShellCut;
#endif
void main(){
  vec3 V = normalize(cameraPosition - vWPos);
  #ifdef SHELL
    // пушистый край: верхний слой мха остаётся только ворсинками
    if (vnoise(vWPos * uLeaf * 3.3) + (vnoise(vWPos * uLeaf * 9.0) - 0.5) * 0.4 < uShellCut) discard;
  #endif
  vec3 Ng = normalize(vWN);
  vec3 N = normalize(mix(Ng, vCN, 0.7));   // сферическая нормаль кома: мягкий объём как у аниме-деревьев
  vec3 L = uSunDir;

  // крапчатый край: на скользящих углах выбиваем пиксели «листьями»
  float fres = 1.0 - abs(dot(Ng, V));
  float leaf = vnoise(vWPos * uLeaf * 2.3);
  if (fres > 0.45 && leaf < (fres - 0.45) * 2.4 * uSpeck) discard;

  float sh = getShadowMask() * mix(0.35, 1.0, canopyLight(vWPos)) * cloudShade(vWPos);
  float near = smoothstep(90.0, 25.0, length(cameraPosition - vWPos));
  float l = (dot(N, L) * 0.5 + 0.5);
  l *= mix(0.45, 1.0, sh);
  float n = fbm(vWPos * uLeaf) - 0.5;
  float n2 = vnoise(vWPos * uLeaf * 3.1) - 0.5;
  float t = l + n * uNAmp + n2 * 0.25 * near;
  vec3 col = t < 0.38 ? uDark : (t < 0.62 ? uMid : (t < 0.86 ? uLight : uHi));
  col *= mix(vec3(0.92, 0.97, 1.05), vec3(1.0), sh); // в тени чуть холоднее

  // мелкие цветы на верхушках мха
  if (uFlowers > 0.0 && N.y > 0.35) {
    vec3 cp = vWPos * 6.0; vec3 cell = floor(cp); vec3 f = fract(cp) - 0.5;
    float h = hash13(cell);
    if (h > 1.0 - 0.06 * uFlowers && length(f) < 0.22) col = mix(vec3(0.97, 0.96, 0.9), vec3(0.74, 0.68, 0.95), step(0.5, fract(h * 37.0)));
  }
  // влажный мох: пятнами и ниже темнее, с холодными искрами-бликами
  if (uWet > 0.0) {
    float wet = smoothstep(0.52, 0.6, fbm(vWPos * 0.45 + 7.0) + smoothstep(5.0, 0.0, vWPos.y) * 0.25) * uWet;
    col = mix(col, col * vec3(0.66, 0.74, 0.76), wet);
    float s = dot(reflect(-L, N), V) + (vnoise(vWPos * 22.0) - 0.5) * 0.3;
    col = mix(col, vec3(0.92, 0.97, 0.9), step(0.9, s) * wet * sh * 0.7);
  }
  // листва на просвет: солнце за листьями — тёплый жёлто-зелёный свет сквозь них
  float trans = pow(max(dot(-V, L), 0.0), 3.0) * (1.0 - max(dot(N, L), 0.0) * 0.6) * sh;
  col += vec3(0.42, 0.5, 0.12) * step(0.22, trans + (n2) * 0.15) * 0.55 * uSunCol.g;
  // контровой: край кома светится тёплым, когда солнце сзади
  float rim = pow(fres, 2.5) * max(dot(-V, uGlowDir), 0.0);
  col += vec3(0.55, 0.48, 0.25) * step(0.25, rim) * 0.6;
  col *= uTint;
  col *= 1.0 - 0.18 * uRain;
  col += uMid * lampLight(vWPos, N) * 1.3;
  if (uRain > 0.0) col = mix(col, hazeColor(reflect(-V, N)), step(0.9, dot(reflect(-L, N), V) + (vnoise(vWPos * 14.0) - 0.5) * 0.4) * uRain * 0.4);
  col = applyHaze(col, vWPos);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
export const FOLIAGE_PALETTES = {
  forest: ['#2b4d47', '#5d815a', '#9bb16c', '#d9d48e'],
  moss: ['#46663f', '#82a04e', '#bccd5e', '#efe79c'], // светлее и желтее, как мох в видео
  canopy: ['#21483f', '#4f7f53', '#94b862', '#e0d98c'],
};
export function foliageMat(o = {}) {
  const pal = o.palette || FOLIAGE_PALETTES.forest;
  const m = new THREE.ShaderMaterial({
    lights: true,
    uniforms: withGlobals({
      uDark: { value: C(pal[0]) }, uMid: { value: C(pal[1]) }, uLight: { value: C(pal[2]) }, uHi: { value: C(pal[3]) },
      uLeaf: { value: o.leaf || 2.2 },
      uSpeck: { value: o.speck === undefined ? 1 : o.speck },
      uFlowers: { value: o.flowers || 0 },
      uNAmp: { value: o.nAmp || 0.55 },
      uSway: { value: o.sway || 0 },
      uWet: { value: o.wet || 0 },
      uShellOff: { value: o.shell || 0 }, uShellCut: { value: o.shellCut || 0.5 },
    }),
    vertexShader: VERT,
    fragmentShader: FOLIAGE_FRAG,
  });
  m.defines = { FOLIAGE: 1 };
  if (o.shell) m.defines.SHELL = 1;
  if (o.push) { m.defines.PUSH = 1; m.uniforms.uPush = G.uPush; }
  if (o.sway) m.defines.SWAY = 1;
  return m;
}

// ======================= Небо: градиент + солнечное сияние + мазки =======================
export function skyMat() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: Object.assign({
      uTop: { value: C('#9fc0c6') }, uMidC: { value: C('#f5e6c8') }, uHor: { value: C('#fbdcae') },
      uGlowC: { value: new THREE.Vector3(1.0, 0.93, 0.75) }, uDisc: { value: new THREE.Vector3(1.0, 0.98, 0.9) },
      uDiscSize: { value: 0.9995 }, uStars: { value: 0 }, uSigK: { value: 0 }, uSigC: { value: new THREE.Vector3(0.5, 0.8, 0.75) },
    }, G),
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: GLOBAL_DECL + NOISE + SIGIL_GLSL + /* glsl */`
      varying vec3 vDir; uniform vec3 uTop; uniform vec3 uMidC; uniform vec3 uHor;
      uniform vec3 uGlowC; uniform vec3 uDisc; uniform float uDiscSize; uniform float uStars; uniform float uSigK; uniform vec3 uSigC;
      // узор на небе, как в игре: круг, натянутый на купол в заданной точке
      float skySigil(vec3 rd, float az, float el, float R, float seed, float t){
        vec3 a = vec3(cos(el) * sin(az), sin(el), -cos(el) * cos(az));
        vec3 e1 = normalize(cross(vec3(0., 1., 0.), a)), e2 = cross(a, e1);
        float dz = max(dot(rd, a), .25);
        vec2 uv = vec2(dot(rd, e1), dot(rd, e2)) / dz / tan(R);
        float m = sigil(uv, seed, t, fwidth(uv.x) * 1.0 + .0015);
        return m * smoothstep(.3, .5, dot(rd, a));
      }
      void main(){
        vec3 d = normalize(vDir);
        float e = clamp(d.y, -0.2, 1.0);
        float sunAz = max(dot(normalize(vec3(d.x,0.0,d.z)), normalize(vec3(uGlowDir.x,0.0,uGlowDir.z))), 0.0);
        vec3 c = mix(uHor, uMidC, smoothstep(0.0, 0.12, e));
        c = mix(c, uTop, smoothstep(0.05 + 0.1*sunAz, 0.38, e));
        // горизонтальные мазки по небу
        float br = vnoise(vec3(d.x*30.0, d.y*240.0, d.z*30.0));
        c *= 0.985 + br*0.03;
        float s = max(dot(d, uGlowDir), 0.0);
        c += uGlowC * (pow(s, 40.0)*0.55 + pow(s, 6.0)*0.25 + pow(s, 2.5) * 0.16) + uGlowC * vec3(0.10,0.064,0.0) * pow(s, 2.0); // широкое тёплое сияние
        c = mix(c, uDisc, smoothstep(uDiscSize - 0.0002, uDiscSize + 0.0002, s));
        if (uSigK > 0.0) {
          float t = uTime;
          float sg = skySigil(d, -.12 + t * .004, .62 + .04 * sin(t * .03), .52, 3.7, t + 25.);
          sg = max(sg, skySigil(d, .85 - t * .003, .36, .22, 7.3, t + 31.) * .6);
          c += uSigC * sg * uSigK * smoothstep(.02, .2, e) * 0.35;
        }
        if (uStars > 0.0) { // звёзды: редкие точки, мерцают, у горизонта тонут в дымке
          vec3 sd = d * 160.0; vec3 cc = floor(sd); float h = hash13(cc);
          float st = step(0.988, h) * smoothstep(0.32, 0.05, length(fract(sd) - 0.5)) * smoothstep(0.04, 0.3, e);
          c += vec3(0.85, 0.9, 1.0) * st * uStars * (0.55 + 0.45 * sin(uTime * 2.3 + h * 70.0)) * (1.0 - pow(s, 3.0));
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Облака: полосы с розово-сиреневым низом =======================
export function cloudMat(seed = 0) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: Object.assign({
      uSeed: { value: seed }, uLitC: { value: C('#fde9d4') }, uShC: { value: C('#e9c6c2') }, uDeep: { value: C('#cdb8cf') },
    }, G),
    vertexShader: `varying vec2 vUv; varying vec3 vWPos; void main(){ vUv=uv; vec4 w = modelMatrix*vec4(position,1.0); vWPos=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLOBAL_DECL + NOISE + /* glsl */`
      varying vec2 vUv; varying vec3 vWPos; uniform float uSeed; uniform vec3 uLitC; uniform vec3 uShC; uniform vec3 uDeep;
      void main(){
        vec2 p = vUv; p.x += uTime*0.004;
        float n = fbm2(vec2(p.x*5.0 + uSeed, p.y*2.0));
        float body = n*1.15 - abs(vUv.y-0.5)*0.95 - pow(abs(vUv.x-0.5)*2.0, 3.0)*0.6;
        float edge = (vnoise2(vUv*vec2(140.0, 60.0)+uSeed)-0.5)*0.11;   // рваный «импасто» край
        float a = step(0.18, body + edge);
        if (a < 0.5) discard;
        // свет сверху, сиреневая тень снизу, граница волнистая
        float up = vUv.y - 0.5 + (fbm2(vec2(p.x*9.0+uSeed*2.0, 3.0))-0.5)*0.35;
        vec3 c = up > -0.02 ? uLitC : (up > -0.3 ? uShC : uDeep);
        float br = vnoise2(vec2(vUv.x*220.0, vUv.y*24.0)+uSeed);
        c *= 0.96 + br*0.07;
        // край, обращённый к солнцу, светлее
        c = mix(c, vec3(1.0,0.97,0.9), step(0.24, body+edge*0.5) * 0.0 + step(body+edge, 0.24)*0.35*step(-0.02, up));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Дальние планы: полосы леса и гор (нарисованные кулисы) =======================
// kind 0 — лиственная кромка, 1 — ели, 2 — гряда с искрящимся снегом/дымкой
export function backdropMat(o = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: Object.assign({
      uKind: { value: o.kind || 0 }, uSeed: { value: o.seed || 0 },
      uCol: { value: C(o.col || '#7fa07a') }, uCol2: { value: C(o.col2 || '#a9c19c') },
      uFreq: { value: o.freq || 6 }, uDist: { value: o.dist || 0.5 },
    }, G),
    vertexShader: `varying vec2 vUv; varying vec3 vWPos; void main(){ vUv=uv; vec4 w = modelMatrix*vec4(position,1.0); vWPos=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN.replace(/cameraPosition/g, 'cameraPosition') + /* glsl */`
      varying vec2 vUv; varying vec3 vWPos;
      uniform float uKind; uniform float uSeed; uniform vec3 uCol; uniform vec3 uCol2; uniform float uFreq; uniform float uDist;
      void main(){
        float x = vUv.x * uFreq + uSeed;
        float top;
        if (uKind < 0.5) { top = 0.55 + (fbm2(vec2(x, uSeed))-0.5)*0.5 + (vnoise2(vec2(x*6.0, 1.0))-0.5)*0.18; }
        else if (uKind < 1.5) { float c = fract(x*2.0); float h = hash12(vec2(floor(x*2.0), uSeed)); top = 0.35 + h*0.4 - abs(c-0.5)*(1.6+h); top += (vnoise2(vec2(x*40.0, 2.0))-0.5)*0.05; }
        else { top = 0.5 + (fbm2(vec2(x*0.5, uSeed))-0.5)*0.5; }
        float edgeN = (vnoise2(vUv*vec2(300.0, 120.0))-0.5) * 0.03;
        if (vUv.y > top + edgeN) discard;
        // объём кромок: светлые верхушки, тёмные низы, пятнами
        float k = clamp((top - vUv.y) * 3.0, 0.0, 1.0);
        float sp = vnoise2(vUv*vec2(uFreq*14.0, 40.0)+uSeed);
        vec3 c = mix(uCol2, uCol, step(0.25 + sp*0.5, k + (fbm2(vUv*vec2(uFreq*3.0, 6.0))-0.5)*0.6));
        if (uKind > 1.5) { c = mix(uCol, uCol2, step(0.62, sp + (1.0-k)*0.3)); }
        c *= uTint;
        c = applyHaze(c, vWPos);
        // туман снизу каждой кулисы (полоса молочной дымки)
        c = mix(c, hazeColor(normalize(vWPos-cameraPosition)), smoothstep(0.35, 0.0, vUv.y) * 0.85 * uGroundFog);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Дымка-пелена: мягкие полосы тумана =======================
export function hazeCardMat(o = {}) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: Object.assign({ uSeed: { value: o.seed || 0 }, uOp: { value: o.op || 0.7 }, uSpeed: { value: o.speed || 0.01 } }, G),
    vertexShader: `varying vec2 vUv; varying vec3 vWPos; void main(){ vUv=uv; vec4 w = modelMatrix*vec4(position,1.0); vWPos=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      varying vec2 vUv; varying vec3 vWPos; uniform float uSeed; uniform float uOp; uniform float uSpeed;
      void main(){
        vec2 p = vec2(vUv.x*3.0 + uTime*uSpeed + uSeed, vUv.y*1.2);
        float n = fbm2(p*1.6) ;
        float shape = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
        shape *= smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
        float a = smoothstep(0.32, 0.7, n * shape + shape*0.35) * uOp;
        // клубы с мягкой «нарисованной» ступенькой
        a = mix(a, step(0.45, a) * uOp * 0.9, 0.35);
        vec3 c = hazeColor(normalize(vWPos - cameraPosition));
        c = mix(c * vec3(0.93,0.95,1.0), c, smoothstep(0.2, 0.8, vUv.y)); // низ клуба чуть холоднее
        gl_FragColor = vec4(c, a * uGroundFog);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Трава переднего плана: тёмные силуэты =======================
export function grassMat() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: Object.assign({ uBase: { value: C('#030d0d') }, uTip: { value: C('#163629') }, uLitTip: { value: C('#8faa5a') }, uFlower: { value: 0.25 } }, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute vec3 offset; attribute vec2 hs; varying float vH; varying vec3 vWPos; varying float vSeed;
      uniform vec4 uPush[10];
      void main(){
        vec3 p = position; p.y *= hs.x; p.x *= hs.y;
        // вытоптанная тропа: трава ниже и лежит
        vec2 tuv = vec2((offset.x + 16.0) / 32.0, (offset.z + 4.0) / 20.0);
        float trod = (tuv.x > 0.0 && tuv.y > 0.0 && tuv.x < 1.0 && tuv.y < 1.0) ? texture2D(uTrail, tuv).r : 0.0;
        p.y *= 1.0 - trod * 0.65;
        float gust = 1.0 + uWind * (1.6 + sin(offset.x * 0.15 - uTime * 2.2) * 0.8);  // порыв идёт волной по полю
        float bend = sin(uTime*1.6 + offset.x*0.7 + offset.z*0.4) * 0.12 * p.y * gust + uWind * 0.12 * p.y * p.y;
        float ca = cos(hs.y*40.0), sa = sin(hs.y*40.0);
        p.xz = mat2(ca, -sa, sa, ca) * p.xz;
        p.x += bend + p.y*p.y*0.08*sin(hs.y*80.0);
        vec3 w = offset + p; vH = position.y; vSeed = hs.y;
        // герои приминают траву: стебли клонятся от них и ниже к земле, потом медленно встают (сила следа гаснет)
        for (int i = 0; i < 10; i++) {
          vec2 d = offset.xz - uPush[i].xz; float dist = length(d); float r = uPush[i].w;
          float k = (1.0 - smoothstep(r * 0.35, r, dist)) * uPush[i].y;
          w.xz += (d / max(dist, 0.05)) * k * p.y * 0.85;
          w.y -= k * p.y * 0.6;
        }
        vWPos = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      uniform vec3 uBase; uniform vec3 uTip; uniform vec3 uLitTip; uniform float uFlower; varying float vH; varying vec3 vWPos; varying float vSeed;
      void main(){
        vec3 c = mix(uBase, uTip, smoothstep(0.2, 1.0, vH));
        // головки цветов на части травинок: белые и сиреневые
        float fl = step(0.86, vH) * step(1.0 - 0.12 * uFlower, fract(vSeed * 53.7));
        c = mix(c, mix(vec3(0.95,0.94,0.88), vec3(0.74,0.68,0.94), step(0.5, fract(vSeed * 191.3))), fl);
        float back = max(dot(normalize(vWPos - cameraPosition), uGlowDir), 0.0);
        c = mix(c, uLitTip, step(0.9, vH) * step(0.55, fract(vSeed*91.0)) * 0.7 * (0.4 + back) * cloudShade(vWPos));
        c *= uTint * mix(0.78, 1.0, cloudShade(vWPos));
        c *= 1.0 - 0.2 * uRain;
        c += uLitTip * lampLight(vWPos, vec3(0.0, 1.0, 0.0)) * (0.4 + vH) * 1.2;
        c = applyHaze(c, vWPos);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Падающие листья (позиции и повороты считает физика, physics.js) =======================
export function leafMat() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: Object.assign({}, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute float aSeed; attribute float aFade; varying vec2 vUv; varying float vS; varying vec3 vWPos; varying float vLit;
      void main(){
        vUv = uv; vS = aSeed;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
        vLit = abs(dot(n, uSunDir));
        w.y -= (1.0 - aFade) * 0.05;   // лист уходит в землю, когда истаивает
        vWPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      varying vec2 vUv; varying float vS; varying vec3 vWPos; varying float vLit;
      void main(){
        vec2 q = vUv - 0.5; q.x *= 2.2;
        if (length(q) > 0.5 || abs(q.x) > 0.5*(1.0-pow(abs(q.y*2.0),2.0))) discard;
        vec3 g = vS > 0.6 ? vec3(0.62,0.42,0.16) : (vS > 0.3 ? vec3(0.40,0.47,0.20) : vec3(0.25,0.38,0.24));
        vec3 c = mix(g*0.62, g*1.15, step(0.5, vLit) * cloudShade(vWPos));
        c = mix(c, c*0.6, step(abs(q.x), 0.03));
        c *= uTint;
        c = applyHaze(c, vWPos);
        gl_FragColor = vec4(c,1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Пламя двигателя: конус градиентом + ореол =======================
export function flameMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: Object.assign({ uOn: { value: 0 } }, G),
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uTime;
      void main(){ vUv=uv; vec3 p = position; float fl = 1.0 + sin(uTime*40.0 + position.y*8.0)*0.04; p.xz *= fl;
        vec4 w = modelMatrix*vec4(p,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: NOISE + /* glsl */`varying vec2 vUv; varying vec3 vN; varying vec3 vV; uniform float uOn; uniform float uTime;
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float along = vUv.y;                     // 0 у сопла (основание конуса), 1 на острие
        float core = step(0.5, f + (1.0-along)*0.45);
        vec3 c = mix(vec3(1.0,0.48,0.12), vec3(1.0,0.84,0.46), core);   // оранжевый край, жёлто-кремовая середина
        float a = smoothstep(1.0, 0.45, along) * (0.5 + 0.4*core) * uOn * 0.7;
        a *= 0.85 + vnoise(vec3(vUv*vec2(6.0,20.0) - vec2(0.0, uTime*12.0), 0.0))*0.3;
        gl_FragColor = vec4(c*a, a);
      }`,
  });
}

// ======================= Пыль: плоский «нарисованный» клуб, 2 тона =======================
export function dustMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: Object.assign({ uLife: { value: 1 }, uSeed: { value: 0 }, uLitC: { value: C('#e4cdb2') }, uShC: { value: C('#b49aa0') } }, G),
    vertexShader: `varying vec3 vN; varying vec3 vWPos; varying vec3 vO; void main(){ vO = position; vec4 w = modelMatrix*vec4(position,1.0); vWPos=w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      varying vec3 vN; varying vec3 vWPos; varying vec3 vO; uniform float uLife; uniform float uSeed; uniform vec3 uLitC; uniform vec3 uShC;
      void main(){
        float n = fbm(vO*2.2 + uSeed);
        if (n < uLife) discard;   // растворение «рваными» краями
        float l = dot(normalize(vN), uSunDir)*0.5+0.5 + (n-0.5)*0.4;
        vec3 c = l > 0.55 ? uLitC : uShC;
        c *= uTint;
        c = applyHaze(c, vWPos);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ======================= Птицы вдали =======================
export function birdMat() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: Object.assign({ uCenter: { value: new THREE.Vector3() } }, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute vec4 seed; uniform vec3 uCenter; varying vec3 vWPos;
      void main(){
        float t = uTime*0.6 + seed.w*10.0;
        vec3 b = uCenter + vec3((seed.x-0.5)*120.0 + mod(uTime*6.0 + seed.x*300.0, 300.0) - 150.0, (seed.y-0.5)*40.0 + sin(t)*2.0, (seed.z-0.5)*30.0);
        vec3 p = position;
        float flap = sin(uTime*(8.0+seed.w*4.0) + seed.x*40.0);
        p.y += abs(p.x) * flap * 0.9;
        vec3 w = b + p * 0.9;
        vWPos = w;
        gl_Position = projectionMatrix*viewMatrix*vec4(w,1.0);
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + `varying vec3 vWPos; void main(){ vec3 c = vec3(0.17,0.13,0.12); c = mix(c, hazeColor(normalize(vWPos-cameraPosition)), 0.25); gl_FragColor=vec4(c,1.0);
      #include <colorspace_fragment>
    }`,
  });
}

// Тонкие тушевые линии по рёбрам (швы и силуэт): тёмно-сиреневые, полупрозрачные
export const inkLineMat = new THREE.LineBasicMaterial({ color: C('#3b3340'), transparent: true, opacity: 0.55 });

// ======================= Плакучие лианы: полосы листьев на карточках =======================
export function vineMat(o = {}) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide, defines: o.rope ? { ROPE: 1 } : {},
    uniforms: Object.assign({ uC0: { value: C('#16332f') }, uC1: { value: C('#2f5a47') }, uC2: { value: C('#5d8550') }, uC3: { value: C('#a3b56a') } }, G),
    vertexShader: GLOBAL_DECL + /* glsl */`
      attribute vec2 aInfo; varying vec2 vUv; varying vec2 vInfo; varying vec3 vWPos;
      void main(){
        vUv = uv; vInfo = aInfo;
        vec3 p = position;
        float hang = (1.0 - uv.y) * aInfo.x;           // метры от точки крепления
        p.x += sin(uTime*1.1 + aInfo.y*6.0) * 0.012 * hang * hang;
        p.z += cos(uTime*0.9 + aInfo.y*4.0) * 0.008 * hang * hang;
        #ifdef ROPE
          p = position;   // лиана-верёвка: форму считает физика на процессоре
        #endif
        vec4 w = modelMatrix*vec4(p,1.0); vWPos = w.xyz;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
      varying vec2 vUv; varying vec2 vInfo; varying vec3 vWPos;
      void main(){
        float L = vInfo.x; float seed = vInfo.y;
        vec2 p = vec2((vUv.x - 0.5) * 0.8, (1.0 - vUv.y) * L);   // y — вниз от крепления
        float sx = sin(p.y*1.4 + seed*5.0) * 0.05;
        float taper = mix(1.0, 0.35, smoothstep(0.0, L, p.y));
        float cell = 0.24; float row = floor(p.y / cell);
        float hit = 0.0; float shade = 0.0;
        for (int k = -1; k <= 1; k += 2) {
          float side = float(k);
          float r2 = row + (side > 0.0 ? 0.0 : 0.5);
          vec2 c = vec2(sx + side * 0.15 * taper, (floor(p.y / cell - (side > 0.0 ? 0.0 : 0.5)) + (side > 0.0 ? 0.5 : 1.0)) * cell);
          vec2 d = p - c;
          float a = side * 0.75; d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
          float hr = hash12(vec2(floor(p.y/cell), side + seed*3.0));
          float sz = 0.65 + 0.6 * hr;                                   // листья разного размера, часть пропущена
          float e = (d.x*d.x)/(0.15*0.15*taper*taper*sz*sz) + (d.y*d.y)/(0.055*0.055*sz*sz);
          if (e < 1.0 && hr > 0.12) { hit = 1.0; shade = d.y > 0.0 ? 1.0 : 0.0; shade += hash12(vec2(floor(p.y/cell), side + seed)) > 0.7 ? 1.0 : 0.0; }
        }
        if (abs(p.x - sx) < 0.012) { hit = 1.0; shade = 0.0; }
        if (p.y > L - 0.1) hit *= 0.0;
        if (hit < 0.5) discard;
        vec3 col = shade < 0.5 ? uC0 : (shade < 1.5 ? uC1 : uC2);
        float back = max(dot(normalize(vWPos - cameraPosition), uGlowDir), 0.0);
        if (shade > 1.5 && back > 0.5) col = uC3;
        col *= uTint;
        col = applyHaze(col, vWPos);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
