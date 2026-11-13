// Материалы логова Лешего в стиле из видео (как в material-lab и в игре): свет тремя тонами с рваной границей,
// мазок кисти вдоль формы, тёплый свет / холодная тень, ближние огни полосами (окна, костёр, факелы),
// мох пятнами и потёками, дымка. Общая тема U.uTheme: 0 — обычный лес, 1 — логово (всё уходит в зелень и мрак).
import * as THREE from 'three';

export const lin = (h) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };
export const MAXL = 20;
export const WATER_LVL = -0.18;

// общие uniform'ы: свет, туман, огни, тема
export const U = {
  uSunDir: { value: new THREE.Vector3(-0.5, 0.62, 0.6).normalize() },
  uSunCol: { value: new THREE.Vector3(1.06, 1.0, 0.9) },
  uShadeCol: { value: new THREE.Vector3(0.56, 0.64, 0.78) },
  uFogCol: { value: lin('#c9d4c2') },
  uFogDen: { value: 0.006 },
  uFogLow: { value: 0.0 },     // туман у воды и земли (в логове густой)
  uLowCol: { value: lin('#5f8a54') },
  uTime: { value: 0 },
  uTheme: { value: 0 },
  uL: { value: Array.from({ length: MAXL }, () => new THREE.Vector4(0, -999, 0, 1)) },  // (позиция, радиус)
  uLC: { value: Array.from({ length: MAXL }, () => new THREE.Vector3()) },             // цвет × сила
  uLN: { value: 0 },
  uRimCol: { value: new THREE.Vector3(1.0, 0.85, 0.6) },
  uMoonRim: { value: new THREE.Vector4(0, 0, 0, 0) },   // (центр xyz, радиус): лунная кромка по верхним граням рядом с главным зданием

  uBrushTex: { value: null },
  uWaterY: { value: -0.18 },
  // вода: зеркальная картинка, карта глубины (x0, z0, ширина, длина), круги от шагов (x, z, время рождения, сила)
  uRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 },
  uDepth: { value: null }, uDepthBox: { value: new THREE.Vector4(0, 0, 1, 1) },
  uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -99, 0)) },
  // кто раздвигает траву: богатырь и Леший (позиция, радиус)
  uPush: { value: [new THREE.Vector4(0, -99, 0, 1), new THREE.Vector4(0, -99, 0, 1)] },
};

export const NOISE = /* glsl */`
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x), mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x), mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y), f.z); }
float vnoise2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,4.1); a*=0.5; } return s/0.9375; }
float fbm2(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise2(p); p=p*2.01+vec2(5.3,1.7); a*=0.5; } return s/0.9375; }
`;

// волна воды: одна и та же в шейдере воды и у плавучих вещей (кувшинки, цветы, огоньки в них) — едут вместе с поверхностью
export const WAVE_GLSL = /* glsl */`
float waveH(vec2 w){ return sin(w.x * 0.45 + uTime * 0.9) * sin(w.y * 0.38 - uTime * 0.7) * 0.035 + sin(w.y * 0.55 - uTime * 0.9) * 0.012
  + sin(w.x * 1.3 - w.y * 0.9 + uTime * 1.7) * 0.008 + sin((w.x + w.y) * 2.1 + uTime * 2.4) * 0.004; }
// плавучее: подъём с волной + медленный снос течением и покачивание по кругу (на масштабе листа почти одинаково — лист не мнётся)
vec3 floatOff(vec2 w){
  float h = waveH(w);
  vec2 dr = vec2(sin(uTime * 0.31 + w.y * 0.17 + w.x * 0.06), cos(uTime * 0.27 + w.x * 0.15 - w.y * 0.05)) * 0.07;
  vec2 orb = vec2(cos(w.x * 0.45 + uTime * 0.9), cos(w.y * 0.38 - uTime * 0.7)) * 0.025;
  return vec3(dr.x + orb.x, h, dr.y + orb.y);
}
`;
export const DECL = /* glsl */`
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uShadeCol; uniform vec3 uFogCol; uniform float uFogDen; uniform float uFogLow;
uniform vec3 uLowCol; uniform float uTime; uniform float uTheme; uniform vec4 uL[${MAXL}]; uniform vec3 uLC[${MAXL}]; uniform int uLN;
uniform vec3 uRimCol; uniform float uWaterY; uniform vec4 uMoonRim;
`;

export const FOG_FN = /* glsl */`
// свечение болота снизу: пятна зелёного и голубого, медленно плывут
vec3 swampGlow(vec2 xz){
  float g = fbm2(xz * 0.11 + vec2(uTime * 0.025, -uTime * 0.018));
  float h = vnoise2(xz * 0.05 + 3.0);
  float m = smoothstep(0.48, 0.74, g);
  return mix(vec3(0.22, 0.62, 0.78), vec3(0.3, 0.52, 0.9), smoothstep(0.35, 0.7, h)) * (0.2 + 0.6 * m);
}
vec3 applyFog(vec3 col, vec3 w){
  vec3 d = w - cameraPosition; float dist = length(d);
  float hf = exp(-max(0.5 * (w.y + cameraPosition.y), 0.0) * 0.03);
  float k = 1.0 - exp(-dist * uFogDen * hf);
  // туман у земли и воды: слоями, рвётся по шуму, медленно ползёт
  float n = fbm2(w.xz * 0.06 + vec2(uTime * 0.03, -uTime * 0.02));
  float low = exp(-max(w.y + 0.3, 0.0) * 0.55) * smoothstep(0.3, 0.75, n) * smoothstep(4.0, 22.0, dist) * uFogLow;
  vec3 c = mix(col, uFogCol, clamp(k, 0.0, 0.96));
  // воздушная перспектива в логове: дальние скалы и верх уступов светлее и синее, планы читаются слоями
  float ap = smoothstep(16.0, 70.0, dist) * (0.55 + 0.45 * smoothstep(2.0, 24.0, w.y)) * uTheme;
  c = mix(c, uFogCol * 2.1 + vec3(0.006, 0.014, 0.02), clamp(ap * 0.55, 0.0, 0.6));
  return mix(c, uLowCol, clamp(low, 0.0, 0.85));
}
// ближние огни: свет полосами с рваным краем (как в игре: террейн и постройки)
vec3 nearLights(vec3 w, vec3 N, float dr){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${MAXL}; i++){
    if (i >= uLN) break;
    vec3 dl = uL[i].xyz - w; float dist = length(dl); float a = 1.0 - dist / uL[i].w;
    if (a <= 0.0) continue;
    float nd = clamp((dot(N, dl / max(dist, 0.01)) + 0.3) / 1.3, 0.0, 1.0);
    float k = a * a * nd + (dr - 0.5) * 0.08;
    float lv = 0.34 * smoothstep(0.03, 0.05, k) + 0.3 * smoothstep(0.14, 0.16, k) + 0.36 * smoothstep(0.34, 0.37, k);
    acc += uLC[i] * lv;
  }
  return acc;
}
`;

const SWAY_GLSL = /* glsl */`
    // вес качания: у корня/точки подвеса 0, к свободному концу 1 — ничего не отрывается от опоры
    // режимы uSwayM.x: 0 — по локальной высоте (пучки, камыш), 1 — по высоте в мире (кроны), 2 — подвес по uv.x, 3 — полотно по 1-uv.y
    float sh = uSwayM.x < 0.5 ? smoothstep(uSwayM.y, uSwayM.y + uSwayM.z, position.y)
             : uSwayM.x < 1.5 ? smoothstep(uSwayM.y, uSwayM.y + uSwayM.z, worldPosition.y)
             : uSwayM.x < 2.5 ? clamp(uv.x, 0.0, 1.0) : clamp(1.0 - uv.y, 0.0, 1.0);
    sh = sh * sh * (uSwayM.x > 1.5 ? 1.0 : 1.6);
    float gust = 0.55 + 0.45 * sin(uTime * 0.23 + worldPosition.x * 0.05) * sin(uTime * 0.31 - worldPosition.z * 0.04);
    float sw = sin(uTime * 1.1 + worldPosition.x * 0.4 + worldPosition.z * 0.3) * uSway * (0.4 + 0.6 * sin(uTime * 0.37 + worldPosition.y * 0.3)) * gust;
    float sw2 = sin(uTime * 2.7 + worldPosition.y * 1.3 + worldPosition.x) * uSway * 0.25;
    worldPosition.x += (sw + sw2) * 0.06 * sh; worldPosition.z += (sw * 0.5 - sw2) * 0.05 * sh;
`;
const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
#ifdef VCOL
attribute vec3 color; varying vec3 vCol;
#endif
#ifdef SWAY
uniform float uTime; uniform float uSway; uniform vec3 uSwayM;
#endif
#ifdef PUSH
uniform vec4 uPush[2];
#endif
#ifdef BOB
uniform vec4 uRip[8];
#ifndef SWAY
uniform float uTime;
#endif
${WAVE_GLSL}
#endif
void main(){
  vec3 transformed = position; vec3 objectNormal = normal;
  #ifdef USE_SKINNING
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <skinning_vertex>
  #endif
  vec4 lp = vec4(transformed, 1.0); vec3 nrm = objectNormal;
  vOPos = position; vUv = uv;
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp; nrm = mat3(instanceMatrix) * nrm;
  #endif
  vec4 worldPosition = modelMatrix * lp;
  #ifdef SWAY
${SWAY_GLSL}  #endif
  #ifdef PUSH
  {
    // трава, камыш, папоротник гнутся от идущего: чем выше над корнем, тем сильнее
    vec4 org = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    #ifdef USE_INSTANCING
      org = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    #endif
    float hw = clamp((worldPosition.y - org.y) / 0.9, 0.0, 1.0);
    for (int i = 0; i < 2; i++){
      vec2 d = org.xz - uPush[i].xz; float dist = length(d);
      float k = (1.0 - smoothstep(uPush[i].w * 0.35, uPush[i].w, dist)) * step(abs(org.y - uPush[i].y), 1.6) * hw * hw;
      vec2 dir = dist > 1e-3 ? d / dist : vec2(1.0, 0.0);
      worldPosition.xz += dir * k * 0.55; worldPosition.y -= k * 0.3 * (worldPosition.y - org.y);
    }
  }
  #endif
  #ifdef BOB
  {
    // кувшинки едут на волне вместе с водой, их сносит и покачивает; плюс круги от шагов
    vec3 fo = floatOff(worldPosition.xz); worldPosition.xz += fo.xz;
    float b = fo.y;
    for (int i = 0; i < 8; i++){
      float age = uTime - uRip[i].z; if (age < 0.0 || age > 4.0) continue;
      float dd = length(worldPosition.xz - uRip[i].xy), r = age * 1.25;
      b += sin((dd - r) * 7.0) * exp(-abs(dd - r) * 2.5) * exp(-age * 1.1) * uRip[i].w * 0.05;
    }
    worldPosition.y += b;
  }
  #endif
  #ifdef VCOL
    vCol = color;
  #endif
  vWPos = worldPosition.xyz; vWN = normalize(mat3(modelMatrix) * nrm);
  vec3 transformedNormal = normalMatrix * nrm;
  #include <shadowmap_vertex>
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const FRAG = /* glsl */`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${DECL}
${NOISE}
${FOG_FN}
uniform vec3 uBase; uniform vec3 uMoss; uniform float uMossAmt; uniform vec3 uStroke; uniform float uStrokeAmt; uniform float uBreak;
uniform float uRim; uniform vec3 uEmit; uniform float uHero; uniform float uWood; uniform vec3 uLitT; uniform vec3 uShadeT;
uniform float uDrip; uniform float uWet; uniform float uVary;
#ifdef HAS_MAP
uniform sampler2D uMap; uniform vec2 uMapRep; uniform float uMapGain;
#endif
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
#ifdef VCOL
varying vec3 vCol;
#endif
void main(){
  #ifdef NOFLIP
  vec3 N = normalize(vWN);
  #else
  vec3 N = normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0);
  #endif
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 L = normalize(uSunDir);
  vec3 alb = uBase;
  #ifdef VCOL
    alb *= vCol;
  #endif
  #ifdef HAS_MAP
    alb *= texture2D(uMap, vUv * uMapRep).rgb * uMapGain;
  #endif
  // камень/земля: тон гуляет крупными пятнами (охра ↔ сизый), тёмные щели, у воды сырой и темнее
  if (uVary > 0.0){
    float vn = fbm(vWPos * 0.45 + 7.0), vc = vnoise(vWPos * 2.3 + 1.7);
    alb *= mix(vec3(1.0), vec3(1.2, 1.04, 0.82), smoothstep(0.45, 0.72, vn) * uVary);
    alb *= mix(vec3(1.0), vec3(0.8, 0.92, 1.05), smoothstep(0.42, 0.2, vn) * uVary);
    alb *= 1.0 - smoothstep(0.62, 0.78, vc) * 0.4 * uVary;
    alb *= 1.0 - 0.38 * uVary * exp(-max(vWPos.y - uWaterY, 0.0) * 1.4) * step(uWaterY - 0.5, vWPos.y);
  }
  // мазок кисти вдоль формы: тон чуть гуляет полосами
  vec3 sd = length(uStroke) > 0.0 ? normalize(uStroke) : vec3(0.0, 1.0, 0.0);
  vec3 q = vWPos - sd * dot(vWPos, sd);
  float st = vnoise(q * 6.0 + sd * dot(vWPos, sd) * 0.7) * 0.6 + vnoise(q * 17.0) * 0.4;
  alb *= 1.0 + (st - 0.5) * uStrokeAmt * 2.0;
  // дерево: волокна и тёмные щели досок
  if (uWood > 0.0){
    float g = vnoise(vec3(vOPos.x * 2.0, vOPos.y * 0.25, vOPos.z * 2.0) * 3.0);
    alb *= mix(1.0, 0.82 + 0.3 * g, uWood);
    float crack = step(0.86, vnoise(vec3(vOPos.x * 7.0, vOPos.y * 0.6, vOPos.z * 7.0)));
    alb *= 1.0 - crack * 0.35 * uWood;
  }
  // мох: пятна на верхних гранях и у земли, потёки вниз
  float mossN = fbm(vWPos * 0.9 + 3.1);
  float up = smoothstep(-0.1, 0.7, N.y);
  float m = smoothstep(0.52, 0.6, mossN * 0.75 + up * 0.35 + exp(-max(vWPos.y, 0.0) * 0.9) * 0.25) * uMossAmt;
  float drip = smoothstep(0.62, 0.7, vnoise(vec3(vWPos.x * 3.0, vWPos.y * 0.35, vWPos.z * 3.0))) * uDrip * (1.0 - up);
  m = max(m, drip);
  vec3 mossC = uMoss * (0.8 + 0.4 * vnoise(vWPos * 6.0));
  alb = mix(alb, mossC, m);
  // свет: три тона, рваная граница, тени солнца
  float sh = getShadowMask();
  float jit = (fbm(vWPos * 1.6) - 0.5) * uBreak + (vnoise(vWPos * 9.0) - 0.5) * uBreak * 0.4;
  float t = max(dot(N, L), 0.0) * sh + jit;
  float tone = t > 0.42 ? 2.0 : (t > 0.06 ? 1.0 : 0.0);
  vec3 shade = alb * uShadeCol * uShadeT * (0.8 + 0.12 * N.y) + 0.012;
  vec3 lit = alb * uSunCol * uLitT;
  vec3 mid = mix(shade, lit, 0.58);
  vec3 col = tone > 1.5 ? lit : (tone > 0.5 ? mid : shade);
  // подсвет неба сверху и отсвет болота снизу (в логове зелёный)
  col += alb * mix(vec3(0.05, 0.045, 0.035), vec3(0.05, 0.075, 0.1), uTheme) * (max(N.y, 0.0) * 0.8 + 0.2);
  col += alb * mix(vec3(0.0, 0.025, 0.01), vec3(0.02, 0.06, 0.08), uTheme) * max(-N.y, 0.0);
  // свет болота снизу: у воды предметы подсвечены зелёным и голубым
  float nearW = exp(-max(vWPos.y - uWaterY, 0.0) * 0.9) * step(uWaterY - 0.4, vWPos.y);
  col += alb * swampGlow(vWPos.xz) * nearW * (0.25 + 0.75 * max(-N.y, 0.0) + 0.35 * (1.0 - abs(N.y))) * (0.12 + 0.55 * uTheme);
  // отсвет ряби на камнях и сваях у воды: светлая сетка ползёт (каустика), только в логове
  {
    vec2 cq = vWPos.xz * 1.7 + vec2(0.0, vWPos.y * 0.8);
    float ca = 1.0 - abs(vnoise2(cq + vec2(uTime * 0.31, -uTime * 0.17)) - vnoise2(cq * 1.37 + vec2(-uTime * 0.23, uTime * 0.29)));
    ca = smoothstep(0.86, 0.97, ca);
    float band = smoothstep(uWaterY - 0.05, uWaterY + 0.1, vWPos.y) * exp(-max(vWPos.y - uWaterY, 0.0) * 1.3);
    col += alb * vec3(0.35, 0.8, 0.95) * ca * band * (0.3 + 0.7 * (1.0 - abs(N.y))) * 0.9 * uTheme;
  }
  // мокрое: блик кистью
  if (uWet > 0.0){
    vec3 H = normalize(L + V);
    float gl = vnoise(vWPos * 5.0 + vec3(uTime * 0.35, 0.0, -uTime * 0.27));   // блик дрожит и ползёт
    col += uSunCol * step(0.93 - 0.04 * st - 0.03 * gl, dot(N, H)) * (0.08 + 0.1 * gl) * uWet * sh;
  }
  // огни рядом
  float dr = vnoise(vWPos * 3.7);
  col += alb * nearLights(vWPos, N, dr) * 2.1;
  // отсвет фонарей мазками: по краю формы со стороны огня — вытянутые рваные мазки (на стволах, рамах фонарей, столбах)
  {
    float edgeL = pow(1.0 - max(dot(N, V), 0.0), 1.3);
    float strk = vnoise(vec3(vWPos.x * 2.2, vWPos.y * 0.55, vWPos.z * 2.2) + vec3(0.0, uTime * 0.03, 0.0));
    float brk = step(0.42, vnoise(vec3(vWPos.x * 1.3, vWPos.y * 3.1, vWPos.z * 1.3)));
    vec3 acc = vec3(0.0);
    for (int i = 0; i < ${MAXL}; i++){
      if (i >= uLN) break;
      vec3 dl = uL[i].xyz - vWPos; float dist = length(dl); float a = 1.0 - dist / (uL[i].w * 0.8);
      if (a <= 0.0) continue;
      float facing = dot(N, dl / max(dist, 0.01));
      float k = edgeL * smoothstep(-0.05, 0.35, facing) * a + (strk - 0.5) * 0.4;
      acc += uLC[i] * step(0.17, k) * (0.6 + 0.4 * step(0.34, k));
    }
    col += (alb * 0.7 + 0.2) * min(acc, vec3(1.5)) * brk * uTheme * 0.9;
  }
  // кромка со стороны света
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float side = step(0.32 + (vnoise(vWPos * 7.0) - 0.5) * 0.12, fr * max(dot(N, L) * 0.8 + 0.2, 0.0));
  col += uRimCol * side * (0.08 + 0.4 * uHero) * uRim * (0.4 + 0.6 * sh);
  // лунный контур по верхним граням (терем и предметы рядом): тонкая холодная кромка, рвётся мазком, тает к краю зоны
  if (uMoonRim.w > 0.0){
    float zone = smoothstep(uMoonRim.w, uMoonRim.w * 0.6, length(vWPos.xz - uMoonRim.xz)) * smoothstep(uMoonRim.y - 1.0, uMoonRim.y + 0.5, vWPos.y);
    float topF = smoothstep(0.15, 0.5, N.y) * smoothstep(0.95, 0.78, N.y) * smoothstep(0.0, 0.35, dot(N, L));   // кромки, не плоская земля
    float edgeF = pow(1.0 - max(dot(N, V), 0.0), 1.6);
    float mr = step(0.34 + (vnoise(vWPos * 6.0) - 0.5) * 0.2, edgeF * topF);
    col += mix(vec3(0.0), vec3(0.42, 0.6, 0.78), uTheme) * mr * zone * min(uRim, 1.0) * (0.5 + 0.5 * sh) * 0.4;
  }
  col += uEmit;
  gl_FragColor = vec4(applyFog(col, vWPos), 1.0);
}`;

function base() { return Object.assign({}, THREE.UniformsUtils.clone(THREE.UniformsLib.lights), U); }
const C = (h) => { const c = new THREE.Color(h); return new THREE.Vector3(c.r, c.g, c.b); };

/** Рисованный материал: base, moss, mossAmt, stroke [x,y,z], strokeAmt, break, rim, wood, drip, wet, map, vcol, emit, hero, side */
export function paint(o = {}) {
  const p = (x, d) => (x === undefined ? d : x);
  const m = new THREE.ShaderMaterial({
    lights: true,
    side: o.side || THREE.FrontSide,
    uniforms: Object.assign(base(), {
      uBase: { value: C(o.base || '#7a6a58') },
      uMoss: { value: C(o.moss || '#5c7a34') }, uMossAmt: { value: p(o.mossAmt, 0) },
      uStroke: { value: new THREE.Vector3(...(o.stroke || [0, 1, 0])) }, uStrokeAmt: { value: p(o.strokeAmt, 0.14) },
      uBreak: { value: p(o.break, 0.22) }, uRim: { value: p(o.rim, 1) }, uEmit: { value: new THREE.Vector3(...(o.emit || [0, 0, 0])) },
      uHero: { value: p(o.hero, 0) }, uWood: { value: p(o.wood, 0) }, uDrip: { value: p(o.drip, 0) }, uWet: { value: p(o.wet, 0) },
      uLitT: { value: new THREE.Vector3(...(o.litT || [1, 1, 1])) }, uShadeT: { value: new THREE.Vector3(...(o.shadeT || [1, 1, 1])) },
      uVary: { value: p(o.vary, 0) }, uSway: { value: p(o.sway, 0) }, uSwayM: { value: new THREE.Vector3(...(o.swayM || [0, 0, 0.5])) },
    }),
    vertexShader: VERT, fragmentShader: FRAG,
  });
  m.defines = {};
  if (o.map) { m.defines.HAS_MAP = 1; m.uniforms.uMap = { value: o.map }; m.uniforms.uMapRep = { value: new THREE.Vector2(...(o.mapRep || [1, 1])) }; m.uniforms.uMapGain = { value: p(o.mapGain, 1) }; }
  if (o.vcol) m.defines.VCOL = 1;
  if (o.sway) m.defines.SWAY = 1;
  if (o.noFlip) m.defines.NOFLIP = 1;
  if (o.push) { m.defines.PUSH = 1; }
  if (o.bob) { m.defines.BOB = 1; }
  return m;
}

// светящееся: окна, огонь, руны. Мерцает, чуть рябит мазком; вдали тонет в тумане слабее
export function glow(col, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCol: { value: C(col) }, uK: { value: o.k || 1 }, uFlick: { value: o.flick || 0 }, uSeed: { value: o.seed || 0 } }),
    side: o.side || THREE.FrontSide,
    vertexShader: /* glsl */`varying vec3 vWPos; varying vec2 vUv; ${o.bob ? 'uniform float uTime; ' + WAVE_GLSL : ''} void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0);
      #ifdef USE_INSTANCING
        w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      #endif
      ${o.bob ? 'w.xyz += floatOff(w.xz);' : ''}
      vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform vec3 uCol; uniform float uK; uniform float uFlick; uniform float uSeed; varying vec3 vWPos; varying vec2 vUv;
      void main(){ float f = 1.0 - uFlick * 0.25 * (0.5 + 0.5 * sin(uTime * 9.0 + uSeed * 7.0) * sin(uTime * 3.7 + uSeed));
        float frame = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        vec3 c = uCol * uK * f * (0.75 + 0.25 * vnoise(vWPos * 5.0)) * mix(0.55, 1.0, frame);
        vec3 fc = applyFog(c, vWPos);
        gl_FragColor = vec4(mix(fc, c, 0.55), 1.0); }`,
  });
}

// вода болота: живая — медленно колышется, бурлит пузырями (кольца расходятся), снизу светится пятнами
// зелёного и голубого, ряска плывёт, огни дают дорожки бликов. uBoil — очаги бурления (x, z, радиус, сила).
export const BOIL = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0));
export function water() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uBoil: { value: BOIL } }),
    vertexShader: /* glsl */`uniform float uTime; varying vec3 vWPos; varying float vH; ${WAVE_GLSL}
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0);
        float h = waveH(w.xz);
        w.y += h; vH = h; vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform vec4 uBoil[6]; uniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflOn;
      uniform sampler2D uDepth; uniform vec4 uDepthBox; uniform vec4 uRip[8];
      varying vec3 vWPos; varying float vH;
      float boilAt(vec2 p){ float b = 0.0; for (int i = 0; i < 6; i++){ float d = length(p - uBoil[i].xy); b = max(b, uBoil[i].w * smoothstep(uBoil[i].z, 0.0, d)); } return b; }
      void main(){
        vec2 xz = vWPos.xz;
        vec3 V = normalize(cameraPosition - vWPos);
        float camD = length(cameraPosition - vWPos);
        // глубина под водой (м): у берега мелко и светлее, дальше тёмная толща
        vec2 duv = (xz - uDepthBox.xy) / uDepthBox.zw;
        float dep = texture2D(uDepth, duv).r * 3.0;
        dep += (vnoise2(xz * 1.7) - 0.5) * 0.08;
        // рябь: мелкая кисть + круги от шагов -> наклон поверхности
        vec2 nxz = vec2(vnoise2(xz * vec2(1.6, 0.7) + uTime * vec2(0.25, 0.1)) - 0.5, vnoise2(xz * vec2(0.7, 1.6) - uTime * vec2(0.1, 0.22)) - 0.5) * 0.6;
        float rip = 0.0;
        for (int i = 0; i < 8; i++){
          float age = uTime - uRip[i].z; if (age < 0.0 || age > 4.0) continue;
          vec2 q = xz - uRip[i].xy; float dd = length(q);
          for (int j = 0; j < 3; j++){
            float r = (age - float(j) * 0.22) * 1.25; if (r < 0.0) continue;
            float ring = smoothstep(0.07, 0.0, abs(dd - r)) * exp(-age * 1.1) * uRip[i].w * (1.0 - float(j) * 0.3);
            rip += ring; nxz += q / max(dd, 1e-3) * ring * 0.5;
          }
        }
        float fres = pow(1.0 - max(V.y, 0.0), 3.0);
        // слои толщи: мелко (ил, бурое), середина (зелёное), глубь (почти чёрная), границы зубчатые, как мазком
        float bandN = (vnoise2(xz * 2.3) - 0.5) * 0.12;
        vec3 shallow = mix(vec3(0.16, 0.15, 0.08), vec3(0.06, 0.1, 0.12), uTheme);
        vec3 midC = mix(vec3(0.08, 0.11, 0.07), vec3(0.025, 0.055, 0.075), uTheme);
        vec3 deep = mix(vec3(0.035, 0.055, 0.05), vec3(0.008, 0.02, 0.034), uTheme);
        float l1 = smoothstep(0.18, 0.2, dep + bandN), l2 = smoothstep(0.6, 0.63, dep + bandN * 2.0);
        vec3 c = mix(shallow, midC, l1); c = mix(c, deep, l2);
        // ил и тина на мелком: пятна
        float silt = smoothstep(0.55, 0.62, fbm2(xz * 0.8 + 4.0)) * (1.0 - l1);
        c = mix(c, mix(vec3(0.22, 0.2, 0.11), vec3(0.09, 0.11, 0.1), uTheme), silt * 0.6);
        // небо и отражение: ближе к горизонту сильнее; картинка рвётся рябью
        vec3 sky = mix(uFogCol * 0.9, uFogCol * 0.7 + vec3(0.0, 0.015, 0.03), uTheme);
        vec3 refl = sky;
        if (uReflOn > 0.5){
          // мутное отражение: картинка дрожит волной, размыта и вытянута вниз (мазками), уходит в цвет толщи воды
          vec2 wob = nxz * 0.045 + vec2(sin(xz.y * 1.7 + uTime * 1.1), 0.0) * 0.004;
          vec4 pr = uReflMat * vec4(vWPos.x, uWaterY, vWPos.z, 1.0); vec2 ruv = pr.xy / pr.w + wob;
          vec2 px = vec2(0.006, 0.0), py = vec2(0.0, 0.012);
          vec3 rc = texture2D(uRefl, ruv).rgb * 0.26
                  + (texture2D(uRefl, ruv + px).rgb + texture2D(uRefl, ruv - px).rgb) * 0.13
                  + (texture2D(uRefl, ruv + py).rgb + texture2D(uRefl, ruv - py).rgb) * 0.12
                  + (texture2D(uRefl, ruv - py * 2.2).rgb + texture2D(uRefl, ruv + py * 2.0).rgb) * 0.12;
          // мазки: отражение рвётся поперечными полосами ряби
          float strk = step(0.3, vnoise2(vec2(xz.x * 0.9, xz.y * 4.5) + uTime * vec2(0.05, 0.3)));
          vec3 murk = mix(vec3(0.1, 0.12, 0.08), vec3(0.04, 0.08, 0.1), uTheme);
          refl = mix(murk, rc * 1.15, 0.8) * (0.8 + 0.2 * strk);
        }
        float rk = clamp(0.5 + fres * 0.5 + (vnoise2(xz * vec2(0.8, 3.0)) - 0.5) * 0.12, 0.0, 0.9);
        c = mix(c, refl * mix(0.9, 0.85, uTheme), rk);
        // свет из глубины: пятна плывут, три тона
        vec3 sg = swampGlow(xz);
        float gl = dot(sg, vec3(0.33));
        float band = floor(clamp(gl * 3.2, 0.0, 2.99)) / 3.0;
        c += sg * (0.02 + band * 0.18) * (0.3 + 0.7 * uTheme) * (1.0 - fres * 0.6) * (0.5 + 0.5 * l1);
        // ряска: пятна дрейфуют, у берега гуще, рвутся следом рябью
        vec2 dq = xz + vec2(sin(uTime * 0.05) * 0.6, cos(uTime * 0.04) * 0.5) + nxz * 0.4;
        float duck = smoothstep(0.7, 0.74, fbm2(dq * 0.2 + 7.0) + (vnoise2(dq * 3.0) - 0.5) * 0.12 + (1.0 - l2) * 0.06 - rip * 0.3);
        float dots = step(0.55, vnoise2(dq * 9.0));
        c = mix(c, mix(vec3(0.24, 0.32, 0.12), vec3(0.1, 0.16, 0.11), uTheme) * (0.85 + 0.25 * dots) + sg * 0.03, duck * 0.88);
        // пена и кромка у самого берега: рваная светлая полоска, дышит
        float edge = 1.0 - smoothstep(0.0, 0.07 + 0.03 * sin(uTime * 0.8 + xz.x * 0.3), dep + (vnoise2(xz * 4.0 + uTime * 0.2) - 0.5) * 0.05);
        float foamN = step(0.45, vnoise2(xz * vec2(6.0, 6.0) + uTime * 0.15));
        c = mix(c, mix(vec3(0.5, 0.52, 0.42), vec3(0.36, 0.44, 0.5), uTheme), edge * foamN * 0.55);
        // бурление: пузыри всплывают и лопаются, от них расходятся кольца
        float boil = boilAt(xz);
        vec2 cellSz = vec2(1.3);
        vec2 ci = floor(xz / cellSz);
        float ring = 0.0, foam = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
          vec2 cc = ci + vec2(float(i), float(j));
          float h = hash12(cc * 1.37 + 0.5);
          float dens = 0.05 + boil * 0.85;
          if (h > dens) continue;
          float rate = 0.35 + hash12(cc + 9.1) * 0.5;
          float ph = fract(uTime * rate + hash12(cc + 3.3) * 7.0);
          vec2 ctr = (cc + 0.2 + 0.6 * vec2(hash12(cc + 1.1), hash12(cc + 2.2))) * cellSz;
          float d = length(xz - ctr);
          float r = ph * (0.5 + 0.5 * h / max(dens, 0.01)) * 0.9;
          ring += smoothstep(0.045, 0.0, abs(d - r)) * (1.0 - ph) * (1.0 - ph);
          foam += smoothstep(0.12, 0.0, d) * smoothstep(0.25, 0.0, ph);
        }
        vec3 rc2 = mix(vec3(0.5, 0.6, 0.5), vec3(0.5, 0.8, 0.95), uTheme);
        c += rc2 * ring * 0.2 * (1.0 - duck * 0.7) + rc2 * foam * 0.3;
        c += vec3(0.08, 0.18, 0.25) * boil * (0.5 + 0.5 * sin(uTime * 2.0 + xz.x)) * 0.25 * uTheme;
        // круги от шагов: светлые кольца, на ряске слабее
        c += mix(vec3(0.42, 0.45, 0.38), vec3(0.36, 0.5, 0.6), uTheme) * min(rip, 1.0) * 0.35 * (1.0 - duck * 0.6);
        // блики огней: вытянутая к камере полоса, ломается рябью
        vec2 vd = normalize(cameraPosition.xz - xz + 1e-4);
        for (int i = 0; i < ${MAXL}; i++){
          if (i >= uLN) break;
          vec2 q = xz - uL[i].xz;
          float along = dot(q, vd), zz = (fract(along * 0.9 + uTime * 0.35) - 0.5) * 2.0, lat = abs(q.x * vd.y - q.y * vd.x + nxz.x * 0.4 + (abs(zz) - 0.5) * 0.5 * smoothstep(0.3, 3.0, along));
          float aa = 1.0 - length(q) / (uL[i].w * 1.6);
          float stk = (1.0 - smoothstep(0.0, 0.3 + 0.12 * abs(along), lat)) * smoothstep(-0.5, 1.5, along) * smoothstep(0.0, 0.5, aa)
            * (0.45 + 0.55 * smoothstep(0.45, 0.65, vnoise2(vec2(along * 4.0, xz.x * 1.5 + uTime * 0.6))));
          c += uLC[i] * stk * 0.5 * (1.0 - duck);
        }
        // рябь мазками: короткие светлые штрихи поперёк взгляда, вблизи заметнее
        vec2 sp = vec2(dot(xz, vec2(vd.y, -vd.x)), dot(xz, vd));
        float strk = step(0.8, vnoise2(sp * vec2(1.6, 10.0) + vec2(uTime * 0.25, 0.0))) * smoothstep(40.0, 6.0, camD);
        c += vec3(0.07, 0.09, 0.1) * strk * (1.0 - duck) * (1.0 - uTheme * 0.3);
        // лунные искры: мелкие блики мерцают и бегут по ряби, гуще по лунной дорожке
        { vec2 gq = xz * vec2(7.0, 2.6) + vec2(uTime * 0.6, uTime * 0.21) + nxz * 3.0;
          float sp2 = step(0.965, vnoise2(gq)) * step(0.5, vnoise2(xz * 0.9 - uTime * 0.05));
          vec3 Hm = normalize(normalize(uSunDir) + normalize(cameraPosition - vWPos));
          float path = smoothstep(0.75, 0.98, Hm.y);
          c += uSunCol * sp2 * (0.12 + 0.6 * path) * (1.0 - duck) * smoothstep(55.0, 5.0, camD); }
        // живая вода: пологие волны бегут от водопадов к югу, гребни — тонкие лунные линии, рвутся пятнами
        float wph = xz.y * 0.55 + vnoise2(xz * 0.12) * 5.0 - uTime * 0.9;
        float crest = smoothstep(0.86, 0.97, sin(wph)) * smoothstep(0.35, 0.6, vnoise2(xz * vec2(0.6, 0.25) + uTime * 0.05));
        c += vec3(0.16, 0.22, 0.28) * crest * (0.35 + 0.65 * fres) * (1.0 - duck) * uTheme * 0.45;
        gl_FragColor = vec4(applyFog(c, vWPos), 1.0);
      }`,
  });
}

// пузыри: полусферы всплывают, раздуваются и лопаются (инстансы; фаза и скорость в атрибуте)
export function bubbleMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    vertexShader: /* glsl */`uniform float uTime; attribute vec2 aPh; varying vec3 vWPos; varying vec3 vN; varying float vA;
      void main(){ float ph = fract(uTime * aPh.y + aPh.x);
        float s = sqrt(sin(clamp(ph / 0.9, 0.0, 1.0) * 3.14159)) * step(ph, 0.9);
        vec3 p = position * s;
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vWPos = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vA = s;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} varying vec3 vWPos; varying vec3 vN; varying float vA;
      void main(){ if (vA < 0.02) discard;
        vec3 V = normalize(cameraPosition - vWPos); float fr = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.0);
        vec3 c = mix(vec3(0.16, 0.26, 0.2), vec3(0.55, 1.0, 0.7), step(0.5, fr)) + swampGlow(vWPos.xz) * 0.2;
        c += vec3(0.8, 1.0, 0.85) * step(0.93, dot(normalize(vN), normalize(vec3(0.3, 1.0, 0.2)))) * 0.5;
        gl_FragColor = vec4(applyFog(c, vWPos), 1.0); }`,
  });
}

// светлячки и болотные огоньки: точки, плывут по кругам и мигают (аддитивно)
export function sparkMat(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uSize: { value: o.size || 6 }, uPr: { value: 1 } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; uniform float uSize; uniform float uPr; uniform float uTheme;
      attribute vec4 aP; attribute vec3 aCol; varying vec3 vCol; varying float vK;
      void main(){ float t = uTime * aP.y + aP.x * 6.28;
        vec3 p = position + vec3(sin(t) * aP.z, sin(t * 1.7 + aP.x * 3.0) * aP.z * 0.35, cos(t * 0.8) * aP.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float blink = smoothstep(0.2, 0.9, sin(uTime * (1.3 + aP.w) + aP.x * 40.0) * 0.5 + 0.5);
        vK = blink * (0.25 + 0.75 * uTheme);
        vCol = aCol; gl_PointSize = uSize * uPr * (0.6 + 0.6 * aP.w) * 18.0 / max(-mv.z, 1.0);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying vec3 vCol; varying float vK;
      void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
        float core = smoothstep(0.18, 0.08, d), halo = smoothstep(0.5, 0.1, d) * 0.35;
        float a = (core + halo) * vK; if (a < 0.01) discard;
        gl_FragColor = vec4(vCol * a, 1.0); }`,
  });
}

// туман слоями: мягкие листы с рваным краем (рисуются в сцене, поэтому проходят «краску» кадра)
export function mist(col, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCol: { value: C(col) }, uA: { value: o.a || 0.5 }, uSeed: { value: o.seed || 0 }, uThemeOnly: { value: o.themeOnly ? 1 : 0 } }),
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vWPos; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0);
      #ifdef USE_INSTANCING
        w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      #endif
      vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform vec3 uCol; uniform float uA; uniform float uSeed; uniform float uThemeOnly; varying vec2 vUv; varying vec3 vWPos;
      void main(){ vec2 p = vUv - 0.5;
        float n = fbm2(vec2(vUv.x * 3.0 + uTime * 0.04 + uSeed, vUv.y * 2.0 - uTime * 0.02));
        float sh = 1.0 - length(p * vec2(1.6, 2.4));
        float a = smoothstep(0.0, 0.25, sh + (n - 0.5) * 0.7);
        float band = floor(a * 3.0) / 3.0;   // слоями, как кистью
        float k = mix(1.0, uTheme, uThemeOnly);
        gl_FragColor = vec4(uCol * (0.8 + 0.3 * n), band * uA * k); }`,
  });
}

// тонкие узоры на фоне (как на концепте): круги-печати с бусинами и засечками, штриховка лесенкой, длинные линии;
// еле видны, каждая фигура сама проявляется (прорисовывается по кругу) и гаснет; только в теме логова
export function glyphMat(o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uSize: { value: new THREE.Vector2(o.w || 100, o.h || 50) }, uA: { value: o.a ?? 0.1 }, uSeed: { value: o.seed || 0 }, uCol: { value: C(o.col || '#9cc0d0') } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    extensions: { derivatives: true },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vWPos; varying vec3 vN; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; vN = normalize((modelMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform vec2 uSize; uniform float uA; uniform float uSeed; uniform vec3 uCol; varying vec2 vUv; varying vec3 vWPos; varying vec3 vN;
      float LW;
      float ln(float d){ return 1.0 - smoothstep(LW * 0.6, LW * 1.6, abs(d)); }
      float h1(float x){ return fract(sin(x * 127.1 + uSeed * 31.7) * 43758.5453); }
      // жизнь фигуры: проявилась, постояла, погасла, пауза
      float life(float ph, out float draw){ float t = fract(uTime * 0.021 + ph); draw = smoothstep(0.0, 0.28, t); return smoothstep(0.0, 0.08, t) * smoothstep(0.72, 0.5, t); }
      void main(){
        vec2 p = vUv * uSize;
        LW = length(fwidth(p)) * 1.1;
        float acc = 0.0;
        // круги-печати
        for (int i = 0; i < 6; i++) {
          float fi = float(i), dr;
          float vis = life(h1(fi + 0.3), dr);
          if (vis <= 0.001) continue;
          vec2 c = vec2(mix(0.08, 0.92, h1(fi + 1.1)), mix(0.35, 0.85, h1(fi + 2.3))) * uSize;
          float R = mix(4.5, 12.0, h1(fi + 3.7));
          vec2 q = p - c; float r = length(q), an = atan(q.y, q.x) + 3.14159, a0 = h1(fi + 9.1) * 6.283;
          float shown = step(fract((an - a0) / 6.283), dr);           // прорисовка по кругу
          float f = ln(r - R) + ln(r - R * 0.84) * 0.8 + ln(r - R * 0.35) * 0.6 * step(0.5, h1(fi + 4.4));
          // засечки между кольцами
          float nt = floor(mix(12.0, 36.0, h1(fi + 5.2)));
          float tk = abs(fract(an / 6.283 * nt) - 0.5) * 6.283 / nt * r; f += ln(tk) * step(R * 0.84, r) * step(r, R) * 0.7;
          // бусины на внешнем кольце
          float nb = floor(mix(3.0, 8.0, h1(fi + 6.6)));
          float ba = (floor((an - a0) / 6.283 * nb) + 0.5) / nb * 6.283 + a0; vec2 bp = c + vec2(cos(ba - 3.14159), sin(ba - 3.14159)) * R;
          float bd = length(p - bp); f += ln(bd - R * 0.07) + (1.0 - smoothstep(0.0, LW * 2.0, bd - R * 0.022)) * 0.6;
          // вписанный треугольник и касательная линия через всю плоскость
          float tri = 1e3; for (int k = 0; k < 3; k++) { float a1 = a0 + float(k) * 2.094, a2 = a1 + 2.094; vec2 e1 = vec2(cos(a1), sin(a1)) * R * 0.84, e2 = vec2(cos(a2), sin(a2)) * R * 0.84; vec2 ed = e2 - e1; float tt = clamp(dot(q - e1, ed) / dot(ed, ed), 0.0, 1.0); tri = min(tri, length(q - e1 - ed * tt)); }
          f += ln(tri) * 0.6 * step(0.45, h1(fi + 7.7));
          float ta = a0 + 1.3; vec2 tn = vec2(cos(ta), sin(ta)); float tl = abs(dot(q, tn)) - R; f += ln(tl) * 0.55 * smoothstep(R * 5.0, R, abs(dot(q, vec2(-tn.y, tn.x))));
          acc += f * vis * shown;
        }
        // штриховка лесенкой (ступенчатые панели, как на концепте справа)
        for (int i = 0; i < 3; i++) {
          float fi = float(i) + 20.0, dr;
          float vis = life(h1(fi + 0.7), dr);
          if (vis <= 0.001) continue;
          vec2 c = vec2(mix(0.1, 0.9, h1(fi + 1.3)), mix(0.3, 0.75, h1(fi + 2.9))) * uSize;
          float ang = mix(-0.9, 0.9, h1(fi + 3.1)); vec2 ax = vec2(cos(ang), sin(ang)), ay = vec2(-ax.y, ax.x);
          vec2 q = vec2(dot(p - c, ax), dot(p - c, ay)); vec2 hs = vec2(mix(5.0, 10.0, h1(fi + 4.1)), mix(4.0, 9.0, h1(fi + 5.3)));
          float inside = step(abs(q.x), hs.x) * step(abs(q.y), hs.y) * step(q.x + hs.x, dr * 2.0 * hs.x);
          float stair = step(q.y, (floor((q.x + hs.x) / 2.6) * 2.6 / (2.0 * hs.x) - 0.5) * 2.0 * hs.y + 1.3);   // ступенчатый срез
          float hatch = ln((fract((q.y + q.x * 0.35) / 1.1) - 0.5) * 1.1);
          float frame = ln(abs(q.x) - hs.x) * step(abs(q.y), hs.y) + ln(abs(q.y) - hs.y) * step(abs(q.x), hs.x);
          acc += (hatch * inside * stair * 0.7 + frame * 0.5 * step(q.x + hs.x, dr * 2.0 * hs.x)) * vis;
        }
        // длинные тонкие линии наискосок
        for (int i = 0; i < 4; i++) {
          float fi = float(i) + 40.0, dr;
          float vis = life(h1(fi + 0.9), dr);
          float ang = mix(-1.2, 1.2, h1(fi + 1.9)); vec2 n = vec2(-sin(ang), cos(ang));
          vec2 c = vec2(h1(fi + 2.2), mix(0.3, 0.9, h1(fi + 3.3))) * uSize;
          float along = dot(p - c, vec2(n.y, -n.x));
          acc += ln(dot(p - c, n)) * vis * 0.6 * step(along, mix(-uSize.x, uSize.x, dr)) ;
        }
        // рвётся, как рисованная тушью
        acc *= 0.5 + 0.5 * smoothstep(0.22, 0.42, vnoise2(p * vec2(0.9, 2.3) + uSeed));
        // края плоскости, низ, вид сбоку и вблизи — гаснет
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.05, 0.3, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        vec3 V = cameraPosition - vWPos; float dist = length(V);
        float face = smoothstep(0.15, 0.55, abs(dot(V / dist, vN))) * smoothstep(14.0, 30.0, dist);
        float a = clamp(acc, 0.0, 1.0) * edge * face * uA * uTheme * (0.8 + 0.2 * sin(uTime * 0.5 + uSeed));
        gl_FragColor = vec4(uCol * a, a); }`,
  });
}

// луч света сверху (в логове — зелёный столб над дубом): аддитивный, рваный край
export function beam(col, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCol: { value: C(col) }, uA: { value: o.a || 0.35 } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform vec3 uCol; uniform float uA; varying vec2 vUv;
      void main(){ float x = abs(vUv.x - 0.5) * 2.0;
        float n = vnoise2(vec2(vUv.x * 14.0, vUv.y * 1.5 - uTime * 0.15));
        float a = (1.0 - smoothstep(0.35, 1.0, x + (n - 0.5) * 0.4)) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        a = floor(a * 3.0 + 0.3) / 3.0;
        gl_FragColor = vec4(uCol * a * uA * uTheme, 1.0); }`,
  });
}

// контур пером (вывернутая оболочка), как у героев в material-lab и в игре
export const inkMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: Object.assign({ uW: { value: 0.0042 } }, U),
  vertexShader: /* glsl */`
    #include <common>
    #include <skinning_pars_vertex>
    uniform float uW; varying float vD;
    #ifdef SWAY
    uniform float uTime; uniform float uSway; uniform vec3 uSwayM;
    #endif
    void main(){
      vec3 transformed = position; vec3 objectNormal = normal;
      #ifdef USE_SKINNING
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <skinning_vertex>
      #endif
      vec4 lp = vec4(transformed, 1.0); vec3 nrm = objectNormal;
      #ifdef USE_INSTANCING
        lp = instanceMatrix * lp; nrm = mat3(instanceMatrix) * nrm;
      #endif
      vec4 w = modelMatrix * lp;
      #ifdef SWAY
      { vec4 worldPosition = w;
${SWAY_GLSL}
        w = worldPosition; }
      #endif
      vec3 n = normalize(mat3(modelMatrix) * nrm);
      float d = length(cameraPosition - w.xyz); vD = d;
      float k = 0.55 + 0.9 * (0.5 + 0.5 * sin(w.x * 2.3 + sin(w.y * 3.1) * 1.7 + w.z * 1.9));
      k *= mix(1.5, 0.6, smoothstep(5.0, 45.0, d));
      k *= mix(0.7, 0.5, smoothstep(6.0, 40.0, d));   // контур тоньше: вблизи −30 %, вдали −50 % (просьба Michael)
      w.xyz += n * uW * d * k;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */`uniform vec3 uFogCol; uniform float uTheme; varying float vD;
    void main(){ vec3 c = mix(vec3(0.16, 0.13, 0.17), vec3(0.03, 0.06, 0.045), uTheme);
      c = mix(c, uFogCol * 0.7, smoothstep(14.0, 70.0, vD) * 0.8);
      gl_FragColor = vec4(c, 1.0); }`,
});

// ---------- v3: объёмный дым, световые столбы, ореолы, паутина ----------
// дым как в деревне: клубы-сферы с тоновым светом (свет / полутень / тень) и тёмной кромкой, поднимаются,
// растут, сносятся ветром и растворяются по шуму. aSrc: источник (xyz) и высота подъёма; aP: фаза, скорость, размер, сид;
// aT: тёплая подсветка снизу (у костра), 0..1
export function puffMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uWind: { value: new THREE.Vector2(0.7, -0.35) } }),
    vertexShader: /* glsl */`uniform float uTime; uniform vec2 uWind; attribute vec4 aSrc; attribute vec4 aP; attribute float aT;
      varying vec3 vWPos; varying vec3 vN; varying float vLife; varying float vSeed; varying float vT;
      void main(){ float life = fract(uTime * aP.y + aP.x); vLife = life; vSeed = aP.w; vT = aT;
        float H = aSrc.w;
        float sp = (0.15 + life * 0.9); vec3 c = aSrc.xyz + vec3(uWind.x * life * life * H * 0.55 + sin(aP.w * 37.0 + life * 2.0) * sp, life * H * (0.8 + 0.4 * fract(aP.w * 7.3)), uWind.y * life * life * H * 0.55 + cos(aP.w * 23.0 + life * 1.7) * sp);
        float s = aP.z * (0.3 + 1.15 * sqrt(life)) * smoothstep(0.0, 0.08, life);
        vec3 p = position * (1.0 + 0.16 * sin(position.x * 3.1 + aP.w * 9.0 + uTime * 0.7) * sin(position.y * 2.7 + aP.w * 5.0));
        vec3 w = c + p * s; vWPos = w; vN = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} varying vec3 vWPos; varying vec3 vN; varying float vLife; varying float vSeed; varying float vT;
      void main(){
        float n = fbm(vWPos * 0.9 + vec3(0.0, -uTime * 0.3, vSeed * 13.0));
        if (n < smoothstep(0.45, 1.0, vLife) * 0.95 + 0.04) discard;            // растворяется по шуму
        vec3 V = normalize(cameraPosition - vWPos);
        float ndl = dot(vN, normalize(uSunDir)) + (n - 0.5) * 0.5;
        float band = ndl > 0.35 ? 1.0 : (ndl > -0.15 ? 0.7 : 0.45);
        vec3 lit = mix(vec3(0.8, 0.79, 0.76), vec3(0.18, 0.22, 0.2), uTheme);
        vec3 shade = mix(vec3(0.42, 0.46, 0.53), vec3(0.08, 0.14, 0.13), uTheme);
        vec3 col = mix(shade, lit * uSunCol, smoothstep(0.3, 1.0, band));
        col += vec3(1.0, 0.45, 0.15) * vT * pow(1.0 - vLife, 3.0) * smoothstep(0.2, -0.6, vN.y) * 0.9;   // снизу подсвечен огнём
        col += min(nearLights(vWPos, vN, 0.5), vec3(1.2)) * 0.07;
        col *= mix(1.0, 0.72, uTheme);
        float fr = 1.0 - abs(dot(vN, V));
        col *= 1.0 - smoothstep(0.82, 0.95, fr) * 0.25;                            // кромка клуба чуть темнее
        gl_FragColor = vec4(applyFog(col, vWPos), 1.0); }`,
  });
}

// световой столб (сквозь ветви дуба, из окон): мягкие края по углу к камере, пыль течёт вдоль луча, концы гаснут
export function shaftMat(col, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCol: { value: C(col) }, uA: { value: o.a || 0.3 }, uThemeK: { value: o.themeK === undefined ? 1 : o.themeK }, uSeed: { value: o.seed || 0 }, uFlow: { value: o.flow || 0.06 }, uSide: { value: o.side ? 1 : 0 } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform vec3 uCol; uniform float uA; uniform float uThemeK; uniform float uSeed; uniform float uFlow; uniform float uSide; varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN;
      void main(){ vec3 V = normalize(cameraPosition - vWPos);
        float edge = pow(abs(dot(normalize(vWN), V)), 1.6);
        float n = vnoise2(vec2(vUv.x * 9.0 + uSeed, vUv.y * 3.0 - uTime * uFlow));
        float dust = smoothstep(0.82, 0.95, vnoise2(vec2(vUv.x * 40.0 + uSeed, vUv.y * 22.0 - uTime * uFlow * 4.0)));
        float a = edge * (0.55 + 0.6 * n) * smoothstep(0.0, 0.18, vUv.y) * mix(smoothstep(1.0, 0.55, vUv.y), smoothstep(0.7, 0.2, vUv.y), 1.0 - uSide) + dust * 0.5 * edge;
        a *= mix(1.0, pow(max(sin(vUv.x * 3.1416), 0.0), 1.5), uSide); a = max(a, 0.0);
        a = mix(a, floor(a * 5.0 + 0.4) / 5.0, 0.4);
        float k = mix(1.0, uTheme, uThemeK);
        float dist = length(cameraPosition - vWPos);
        gl_FragColor = vec4(uCol * a * uA * k * smoothstep(1.0, 4.0, dist), 1.0); }`,
  });
}

// ореол вокруг фонаря/окна: экранный квадрат, свет кольцами (как кистью), чуть дышит
export function haloMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; attribute vec3 aPos; attribute vec3 aCol; attribute vec2 aS; varying vec2 vQ; varying vec3 vCol; varying float vK; varying float vSeed;
      void main(){ vQ = position.xy * 2.0; vCol = aCol; vSeed = aS.y;
        float br = 1.0 + 0.07 * sin(uTime * (1.3 + aS.y) + aS.y * 17.0);
        vec4 mv = viewMatrix * vec4(aPos, 1.0); mv.xy += position.xy * aS.x * 2.0 * br;
        vK = smoothstep(1.2, 3.5, -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uTheme; uniform float uTime; varying vec2 vQ; varying vec3 vCol; varying float vK; varying float vSeed; ${NOISE}
      void main(){ float d = length(vQ); if (d > 1.0) discard;
        float a = pow(max(1.0 - d, 0.0), 3.0); a = floor(a * 4.0 + 0.5) / 4.0 * 0.5 + a * 0.5;
        // по бокам огня — два-три рваных мазка света (как кистью по воздуху): вытянуты вверх, рвутся поперёк, медленно дышат
        float st = 0.0;
        for (int i = 0; i < 2; i++) { float sd = float(i) * 2.0 - 1.0, ph = vSeed * 7.3 + sd * 3.1;
          vec2 c = vec2(sd * (0.44 + 0.05 * sin(uTime * 0.7 + ph)), 0.04 * sin(uTime * 0.5 + ph));
          vec2 q = (vQ - c) / vec2(0.13 + 0.03 * sin(ph), 0.42);
          float e = 1.0 - length(q); e += (vnoise2(vec2(vQ.x * 9.0, vQ.y * 3.0) + ph) - 0.5) * 0.5;
          float brk = step(0.36, vnoise2(vec2(vQ.y * 5.5 + ph, uTime * 0.25 + sd)));
          st += step(0.0, e) * (0.55 + 0.45 * step(0.35, e)) * brk; }
        a += st * 0.75 * smoothstep(1.0, 0.75, d);
        gl_FragColor = vec4(vCol * a * 0.45 * vK * (0.35 + 0.65 * uTheme), 1.0); }`,
  });
}

// паутина: тонкие линии, видны на просвет, чуть дрожат
export function webMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; varying vec3 vWPos; void main(){ vec3 p = position; p += vec3(0.0, 0.0, 0.015) * sin(uTime * 2.0 + p.x * 3.0 + p.y * 5.0); vec4 w = modelMatrix * vec4(p, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`uniform float uTheme; uniform float uTime; varying vec3 vWPos;
      void main(){ float d = length(cameraPosition - vWPos); float a = smoothstep(26.0, 6.0, d) * (0.32 + 0.12 * sin(vWPos.x * 7.0 + vWPos.y * 9.0 + uTime));
        gl_FragColor = vec4(vec3(0.62, 0.78, 0.66) * a, 1.0); }`,
  });
}

// живой огонь: плоский лист к камере, языки рисуются шумом, бегущим вверх; три тона (красная кромка, оранжевый, кремовая сердцевина),
// верхние языки отрываются и гаснут, весь огонь дышит. Аддитивно, яркое ловит свечение (bloom)
export function flameMat(seed = 0, k = 1) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uSeed: { value: seed }, uK: { value: k } }),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; uniform float uSeed; varying vec2 vUv; varying vec3 vWPos;
      void main(){ vUv = uv;
        vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float sx = length(modelMatrix[0].xyz), sy = length(modelMatrix[1].xyz);
        vec3 toC = cameraPosition - c; toC.y = 0.0; toC = normalize(toC + vec3(1e-4));
        vec3 rt = vec3(toC.z, 0.0, -toC.x);
        float sway = (sin(uTime * 3.1 + uSeed) * 0.5 + sin(uTime * 7.3 + uSeed * 2.0) * 0.25) * position.y * position.y * 0.18;
        vec3 w = c + rt * (position.x + sway) * sx + vec3(0.0, position.y * sy, 0.0) + toC * 0.02;
        vWPos = w; gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform float uSeed; uniform float uK; varying vec2 vUv; varying vec3 vWPos;
      void main(){
        float x = (vUv.x - 0.5) * 2.0, y = vUv.y;
        float t = uTime * 2.2;
        // силуэт: капля, шире у основания; кромка рвётся бегущим вверх шумом -> языки
        float w = pow(max(1.0 - y, 0.0), 0.75) * smoothstep(0.0, 0.12, y) * 0.95 + 0.04;
        float n = fbm2(vec2(x * 2.2 + uSeed, y * 2.6 - t)) ;
        float n2 = vnoise2(vec2(x * 5.0 - uSeed, y * 5.5 - t * 1.6));
        float d = abs(x) / max(w * (0.55 + 0.75 * n), 1e-3);
        // отрывающиеся языки наверху: пятна шума выше силуэта
        float lick = step(0.62, n2) * smoothstep(0.35, 0.7, y) * smoothstep(1.0, 0.8, y) * step(abs(x), 0.55);
        float body = 1.0 - step(1.0, d);
        float a = max(body, lick * (1.0 - body));
        if (a < 0.5) discard;
        float core = step(d, 0.42 - y * 0.3 + (n2 - 0.5) * 0.15) * body;
        float mid = step(d, 0.75) * body;
        vec3 c = vec3(0.85, 0.2, 0.05);
        c = mix(c, vec3(1.0, 0.52, 0.12), mid);
        c = mix(c, vec3(1.0, 0.88, 0.55), core);
        float br = 0.85 + 0.25 * sin(uTime * 11.0 + uSeed * 3.0) * sin(uTime * 4.7 + uSeed);
        gl_FragColor = vec4(c * uK * br * (lick > 0.5 && body < 0.5 ? 0.7 : 1.0), 1.0); }`,
  });
}

// искры и угольки: крошечные точки взлетают от огня, петляют, краснеют и гаснут (инстансы, всё в шейдере)
export function emberMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; attribute vec4 aSrc; attribute vec4 aP; varying vec2 vQ; varying float vL;
      void main(){ vQ = position.xy * 2.0;
        float ph = fract(uTime * aP.y + aP.x); vL = ph;
        float s = aSrc.w;
        vec3 p = aSrc.xyz + vec3(sin(ph * 7.0 + aP.z * 6.0) * 0.25 * ph * s + ph * ph * 0.4 * s * cos(aP.z * 9.0), ph * (1.4 + aP.w) * s * 1.6, cos(ph * 6.0 + aP.z * 4.0) * 0.25 * ph * s);
        vec4 mv = viewMatrix * vec4(p, 1.0); mv.xy += position.xy * (0.022 + 0.018 * aP.w) * (1.0 - ph * 0.6);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying vec2 vQ; varying float vL;
      void main(){ if (length(vQ) > 1.0) discard;
        vec3 c = mix(vec3(1.0, 0.85, 0.45), vec3(0.9, 0.22, 0.04), smoothstep(0.2, 0.8, vL));
        gl_FragColor = vec4(c * 2.2 * (1.0 - smoothstep(0.7, 1.0, vL)), 1.0); }`,
  });
}

// капель: капля набухает на краю кровли, срывается и падает до земли или воды (инстансы, всё в шейдере)
export function dripMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uTime; attribute vec4 aSrc; attribute vec2 aP; varying vec2 vQ; varying float vA;
      void main(){ vQ = position.xy * 2.0;
        float per = aP.y, ph = fract(uTime / per + aP.x) * per;
        float hang = per * 0.7, fall = sqrt(2.0 * max(aSrc.y - aSrc.w, 0.1) / 9.8);
        float tt = max(ph - hang, 0.0), y = aSrc.y - 0.5 * 9.8 * tt * tt;
        float grow = smoothstep(0.0, hang, ph);
        vA = tt > fall ? 0.0 : (tt > 0.0 ? 1.0 : grow * 0.8);
        vec4 mv = viewMatrix * vec4(aSrc.x, max(y, aSrc.w), aSrc.z, 1.0);
        float st = tt > 0.0 ? 1.0 + min(tt * 9.8 * 0.035, 3.0) : 1.0;
        mv.xy += position.xy * vec2(0.012, 0.012 * st) * (0.6 + 0.4 * grow);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`uniform float uTheme; varying vec2 vQ; varying float vA;
      void main(){ if (length(vQ) > 1.0 || vA < 0.01) discard;
        gl_FragColor = vec4(mix(vec3(0.55, 0.6, 0.6), vec3(0.35, 0.7, 0.55), uTheme) * vA * 0.9, 1.0); }`,
  });
}

// дальний лес слоями: кольца-кулисы с силуэтом ельника, каждое дальше — светлее и тонет в тумане; низом стелется полоса тумана
export function backdropMat(tex, layer) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uTex: { value: tex }, uLayer: { value: layer } }),
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vWPos; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE} uniform sampler2D uTex; uniform float uLayer; varying vec2 vUv; varying vec3 vWPos;
      void main(){
        float m = texture2D(uTex, vUv).r;
        float fogBand = smoothstep(0.42, 0.0, vUv.y) * (0.55 + 0.45 * fbm2(vec2(vUv.x * 40.0 + uTime * 0.01 * (1.0 + uLayer), vUv.y * 3.0)));
        if (m < 0.5 && fogBand < 0.05) discard;
        vec3 tree = mix(mix(vec3(0.12, 0.17, 0.15), vec3(0.015, 0.05, 0.04), uTheme), uFogCol, 0.38 + uLayer * 0.22);
        vec3 c = mix(tree, uFogCol * (1.02 + 0.04 * uLayer), clamp(fogBand * (0.8 + uLayer * 0.1), 0.0, 1.0));
        float a = max(step(0.5, m), fogBand * 0.85);
        gl_FragColor = vec4(c, a); }`,
  });
}

// метка вида материала для запекания в Godot (src/bake.js)
{
  const T = (f, k) => (...a) => { const m = f(...a); m.userData.kind = k; return m; };
  paint = T(paint, 'paint'); glow = T(glow, 'glow'); water = T(water, 'water'); bubbleMat = T(bubbleMat, 'bubble'); sparkMat = T(sparkMat, 'spark');
  mist = T(mist, 'mist'); beam = T(beam, 'beam'); puffMat = T(puffMat, 'puff'); shaftMat = T(shaftMat, 'shaft'); haloMat = T(haloMat, 'halo');
  webMat = T(webMat, 'web'); flameMat = T(flameMat, 'flame'); emberMat = T(emberMat, 'ember'); dripMat = T(dripMat, 'drip'); backdropMat = T(backdropMat, 'backdrop');
  inkMat.userData.kind = 'ink';
}

// контур для качающегося материала: та же оболочка, качается вместе с ним (общие uSway/uSwayM)
const _inkSw = new Map();
export function inkFor(mat) {
  if (!mat.defines || !mat.defines.SWAY) return inkMat;
  if (!_inkSw.has(mat)) { const m = inkMat.clone(); m.uniforms = Object.assign({}, inkMat.uniforms, { uSway: mat.uniforms.uSway, uSwayM: mat.uniforms.uSwayM }); m.defines = { SWAY: 1 }; _inkSw.set(mat, m); }
  return _inkSw.get(mat);
}
