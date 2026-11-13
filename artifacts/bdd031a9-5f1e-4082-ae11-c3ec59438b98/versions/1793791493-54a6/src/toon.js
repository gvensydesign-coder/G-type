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
  uBrushTex: { value: null },
  uWaterY: { value: -0.18 },
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

const DECL = /* glsl */`
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uShadeCol; uniform vec3 uFogCol; uniform float uFogDen; uniform float uFogLow;
uniform vec3 uLowCol; uniform float uTime; uniform float uTheme; uniform vec4 uL[${MAXL}]; uniform vec3 uLC[${MAXL}]; uniform int uLN;
uniform vec3 uRimCol; uniform float uWaterY;
`;

export const FOG_FN = /* glsl */`
// свечение болота снизу: пятна зелёного и голубого, медленно плывут
vec3 swampGlow(vec2 xz){
  float g = fbm2(xz * 0.11 + vec2(uTime * 0.025, -uTime * 0.018));
  float h = vnoise2(xz * 0.05 + 3.0);
  float m = smoothstep(0.48, 0.74, g);
  return mix(vec3(0.16, 0.95, 0.42), vec3(0.18, 0.62, 1.0), smoothstep(0.35, 0.7, h)) * (0.25 + 0.75 * m);
}
vec3 applyFog(vec3 col, vec3 w){
  vec3 d = w - cameraPosition; float dist = length(d);
  float hf = exp(-max(0.5 * (w.y + cameraPosition.y), 0.0) * 0.03);
  float k = 1.0 - exp(-dist * uFogDen * hf);
  // туман у земли и воды: слоями, рвётся по шуму, медленно ползёт
  float n = fbm2(w.xz * 0.06 + vec2(uTime * 0.03, -uTime * 0.02));
  float low = exp(-max(w.y + 0.3, 0.0) * 0.55) * smoothstep(0.3, 0.75, n) * smoothstep(4.0, 22.0, dist) * uFogLow;
  vec3 c = mix(col, uFogCol, clamp(k, 0.0, 0.96));
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

const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
#ifdef VCOL
attribute vec3 color; varying vec3 vCol;
#endif
#ifdef SWAY
uniform float uTime; uniform float uSway;
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
    float sw = sin(uTime * 1.1 + worldPosition.x * 0.4 + worldPosition.z * 0.3) * uSway * (0.4 + 0.6 * sin(uTime * 0.37 + worldPosition.y));
    worldPosition.x += sw * 0.06; worldPosition.z += sw * 0.03;
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
uniform float uDrip; uniform float uWet;
#ifdef HAS_MAP
uniform sampler2D uMap; uniform vec2 uMapRep; uniform float uMapGain;
#endif
varying vec3 vWPos; varying vec3 vWN; varying vec3 vOPos; varying vec2 vUv;
#ifdef VCOL
varying vec3 vCol;
#endif
void main(){
  vec3 N = normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 L = normalize(uSunDir);
  vec3 alb = uBase;
  #ifdef VCOL
    alb *= vCol;
  #endif
  #ifdef HAS_MAP
    alb *= texture2D(uMap, vUv * uMapRep).rgb * uMapGain;
  #endif
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
  col += alb * mix(vec3(0.05, 0.045, 0.035), vec3(0.05, 0.12, 0.08), uTheme) * (max(N.y, 0.0) * 0.8 + 0.2);
  col += alb * mix(vec3(0.0, 0.025, 0.01), vec3(0.02, 0.09, 0.04), uTheme) * max(-N.y, 0.0);
  // свет болота снизу: у воды предметы подсвечены зелёным и голубым
  float nearW = exp(-max(vWPos.y - uWaterY, 0.0) * 0.9) * step(uWaterY - 0.4, vWPos.y);
  col += alb * swampGlow(vWPos.xz) * nearW * (0.25 + 0.75 * max(-N.y, 0.0) + 0.35 * (1.0 - abs(N.y))) * (0.12 + 0.55 * uTheme);
  // мокрое: блик кистью
  if (uWet > 0.0){
    vec3 H = normalize(L + V);
    col += uSunCol * step(0.93 - 0.04 * st, dot(N, H)) * 0.12 * uWet * sh;
  }
  // огни рядом
  float dr = vnoise(vWPos * 3.7);
  col += alb * nearLights(vWPos, N, dr) * 2.1;
  // кромка со стороны света
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  float side = step(0.32 + (vnoise(vWPos * 7.0) - 0.5) * 0.12, fr * max(dot(N, L) * 0.8 + 0.2, 0.0));
  col += uRimCol * side * (0.08 + 0.4 * uHero) * uRim * (0.4 + 0.6 * sh);
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
      uSway: { value: p(o.sway, 0) },
    }),
    vertexShader: VERT, fragmentShader: FRAG,
  });
  m.defines = {};
  if (o.map) { m.defines.HAS_MAP = 1; m.uniforms.uMap = { value: o.map }; m.uniforms.uMapRep = { value: new THREE.Vector2(...(o.mapRep || [1, 1])) }; m.uniforms.uMapGain = { value: p(o.mapGain, 1) }; }
  if (o.vcol) m.defines.VCOL = 1;
  if (o.sway) m.defines.SWAY = 1;
  return m;
}

// светящееся: окна, огонь, руны. Мерцает, чуть рябит мазком; вдали тонет в тумане слабее
export function glow(col, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCol: { value: C(col) }, uK: { value: o.k || 1 }, uFlick: { value: o.flick || 0 }, uSeed: { value: o.seed || 0 } }),
    side: o.side || THREE.FrontSide,
    vertexShader: /* glsl */`varying vec3 vWPos; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0);
      #ifdef USE_INSTANCING
        w = modelMatrix * instanceMatrix * vec4(position, 1.0);
      #endif
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
    vertexShader: /* glsl */`uniform float uTime; varying vec3 vWPos; varying float vH;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0);
        float h = sin(w.x * 0.45 + uTime * 0.9) * sin(w.z * 0.38 - uTime * 0.7) * 0.035
                + sin(w.x * 1.3 - w.z * 0.9 + uTime * 1.7) * 0.012 + sin((w.x + w.z) * 2.1 + uTime * 2.4) * 0.006;
        w.y += h; vH = h; vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform vec4 uBoil[6]; varying vec3 vWPos; varying float vH;
      float boilAt(vec2 p){ float b = 0.0; for (int i = 0; i < 6; i++){ float d = length(p - uBoil[i].xy); b = max(b, uBoil[i].w * smoothstep(uBoil[i].z, 0.0, d)); } return b; }
      void main(){
        vec2 xz = vWPos.xz;
        vec3 V = normalize(cameraPosition - vWPos);
        float n = fbm2(xz * 0.35 + vec2(uTime * 0.05, uTime * 0.03));
        float fres = pow(1.0 - max(V.y, 0.0), 3.0);
        vec3 deep = mix(vec3(0.05, 0.075, 0.06), vec3(0.01, 0.035, 0.03), uTheme);
        vec3 sky = mix(uFogCol * 0.9, uFogCol * 0.7 + vec3(0.0, 0.035, 0.02), uTheme);
        vec3 c = mix(deep, sky, clamp(fres * 0.8 + (n - 0.5) * 0.2 + vH * 3.0, 0.0, 0.9));
        // свет из глубины: пятна плывут, три тона (как мазками)
        vec3 sg = swampGlow(xz);
        float gl = dot(sg, vec3(0.33));
        float band = floor(clamp(gl * 3.2, 0.0, 2.99)) / 3.0;
        c += sg * (0.03 + band * 0.22) * (0.35 + 0.65 * uTheme) * (1.0 - fres * 0.6);
        // ряска: пятна, медленно дрейфуют
        vec2 dq = xz + vec2(sin(uTime * 0.05) * 0.6, cos(uTime * 0.04) * 0.5);
        float duck = smoothstep(0.6, 0.64, fbm2(dq * 0.2 + 7.0) + (vnoise2(dq * 3.0) - 0.5) * 0.12);
        c = mix(c, mix(vec3(0.22, 0.3, 0.12), vec3(0.11, 0.2, 0.07), uTheme) + sg * 0.03, duck * 0.85);
        // бурление: пузыри всплывают и лопаются, от них расходятся кольца; в очагах гуще
        float boil = boilAt(xz);
        vec2 cellSz = vec2(1.3);
        vec2 ci = floor(xz / cellSz);
        float ring = 0.0, foam = 0.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
          vec2 cc = ci + vec2(float(i), float(j));
          float h = hash12(cc * 1.37 + 0.5);
          float dens = 0.06 + boil * 0.85;
          if (h > dens) continue;
          float rate = 0.35 + hash12(cc + 9.1) * 0.5;
          float ph = fract(uTime * rate + hash12(cc + 3.3) * 7.0);
          vec2 ctr = (cc + 0.2 + 0.6 * vec2(hash12(cc + 1.1), hash12(cc + 2.2))) * cellSz;
          float d = length(xz - ctr);
          float r = ph * (0.5 + 0.5 * h / max(dens, 0.01)) * 0.9;
          ring += smoothstep(0.045, 0.0, abs(d - r)) * (1.0 - ph) * (1.0 - ph);
          foam += smoothstep(0.12, 0.0, d) * smoothstep(0.25, 0.0, ph);
        }
        vec3 rc = mix(vec3(0.5, 0.6, 0.5), vec3(0.45, 1.0, 0.65), uTheme);
        c += rc * ring * 0.22 * (1.0 - duck * 0.7) + rc * foam * 0.35;
        // мутная зелень над очагами (газ)
        c += vec3(0.08, 0.25, 0.12) * boil * (0.5 + 0.5 * sin(uTime * 2.0 + xz.x)) * 0.25 * uTheme;
        // блики огней: вытянутая к камере полоса
        vec2 vd = normalize(cameraPosition.xz - xz + 1e-4);
        for (int i = 0; i < ${MAXL}; i++){
          if (i >= uLN) break;
          vec2 q = xz - uL[i].xz;
          float along = dot(q, vd), lat = abs(q.x * vd.y - q.y * vd.x);
          float aa = 1.0 - length(q) / (uL[i].w * 1.6);
          float stk = (1.0 - smoothstep(0.0, 0.3 + 0.12 * abs(along), lat)) * smoothstep(-0.5, 1.5, along) * smoothstep(0.0, 0.5, aa)
            * (0.45 + 0.55 * smoothstep(0.45, 0.65, vnoise2(vec2(along * 4.0, xz.x * 1.5 + uTime * 0.6))));
          c += uLC[i] * stk * 0.5 * (1.0 - duck);
        }
        // светлая рябь
        c += vec3(0.06, 0.08, 0.06) * step(0.82, vnoise2(xz * vec2(2.0, 9.0) + uTime * 0.3)) * (1.0 - duck) * (1.0 - uTheme * 0.4);
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
      vec3 n = normalize(mat3(modelMatrix) * nrm);
      float d = length(cameraPosition - w.xyz); vD = d;
      float k = 0.55 + 0.9 * (0.5 + 0.5 * sin(w.x * 2.3 + sin(w.y * 3.1) * 1.7 + w.z * 1.9));
      k *= mix(1.5, 0.6, smoothstep(5.0, 45.0, d));
      w.xyz += n * uW * d * k;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */`uniform vec3 uFogCol; uniform float uTheme; varying float vD;
    void main(){ vec3 c = mix(vec3(0.16, 0.13, 0.17), vec3(0.03, 0.06, 0.045), uTheme);
      c = mix(c, uFogCol * 0.7, smoothstep(14.0, 70.0, vD) * 0.8);
      gl_FragColor = vec4(c, 1.0); }`,
});
