// 3D-материал «почеркушки поверх формы»: 2D-листы из атласа класса раскладываются клетками по поверхности
// (проекция по главной оси), тень/свет решает освещение + маска перехода; аура — лента за силуэтом; всё дрожит шагами 8 к/с.
import * as THREE from 'three';
import { bakeAtlas, CLS, ROLES, ROW } from './library.js';

export const STEP_FPS = 8;
export const shared = { uStep: { value: 0 }, uBoil: { value: 1 }, uSunDir: { value: new THREE.Vector3(0.45, 0.75, 0.35).normalize() }, uSunCol: { value: new THREE.Color(1.0, 0.92, 0.78) }, uAmb: { value: new THREE.Color(0.12, 0.14, 0.2) }, uShadowC: { value: new THREE.Color('#33335f') }, uFogC: { value: new THREE.Color('#16242a') }, uMarks: { value: 1 },
  // стиль сцены (пресеты в preview3d.js STYLES): мягкость края тени, линия света со стороны источника, общий тон, тушь
  uSoftK: { value: 1 }, uRimLC: { value: new THREE.Color('#ffc27a') }, uRimLW: { value: 0 }, uGradeC: { value: new THREE.Color('#ffffff') }, uGradeK: { value: 0 }, uInkC: { value: new THREE.Color('#0c0e16') }, uInkK: { value: 1 } };

// атласы классов: перепекаются, когда меняется лист или настройка
export class Atlases {
  constructor(lib) { this.lib = lib; this.map = {}; }
  get(cls) {
    let a = this.map[cls];
    if (!a) {
      const cv = document.createElement('canvas'); const tex = new THREE.CanvasTexture(cv);
      tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
      a = this.map[cls] = { cv, tex, counts: {}, dirty: true, users: [] };
    }
    if (a.dirty) { const r = bakeAtlas(this.lib, cls, a.cv); a.counts = r.counts; a.tex.needsUpdate = true; a.dirty = false; for (const u of a.users) u(); }
    return a;
  }
  invalidate(cls) { if (cls) { if (this.map[cls]) this.map[cls].dirty = true; } else for (const k in this.map) this.map[k].dirty = true; }
}

const GLSL_COMMON = /* glsl */`
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h2(vec2 p){ return vec2(h1(p), h1(p + 17.31)); }
const float ROWS = ${ROLES.length}.0;
vec4 atlasAt(sampler2D A, float row, float v, vec2 uv){ return texture(A, vec2((v + uv.x) / 4.0, 1.0 - (row + uv.y) / ROWS)); }
// клетки со знаками: P = (плотность, клеток на метр, разброс поворота, сила); результат — цвет с альфой (premultiplied)
vec4 marks(sampler2D A, vec2 uv, float row, float cnt, vec4 P, float seed, float stp, float boil){
  if (cnt < 0.5 || P.w <= 0.001) return vec4(0.0);
  uv *= P.y; vec2 c0 = floor(uv); vec4 acc = vec4(0.0);
  float st = floor(stp) * boil;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(float(i), float(j));
    if (h1(c + seed + 3.1) > P.x) continue;
    vec2 r = h2(c + seed);
    vec2 jit = (h2(c + seed + 7.7) - 0.5) * 0.5 + (h2(c + st * 1.31) - 0.5) * 0.04 * boil;
    float ang = (r.x - 0.5) * P.z * 3.14159 + (h1(c + st * 2.7) - 0.5) * 0.07 * boil;
    float sc = 0.9 + 0.45 * r.y;
    vec2 l = (uv - (c + 0.5 + jit)) / sc;
    float cs = cos(ang), sn = sin(ang); l = mat2(cs, -sn, sn, cs) * l;
    vec2 t = l + 0.5; if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) continue;
    float v = mod(floor(h1(c + seed + 11.0) * cnt), cnt);
    vec4 a = atlasAt(A, row, v, vec2(t.x, 1.0 - t.y));
    acc.rgb = a.rgb * a.a + acc.rgb * (1.0 - a.a); acc.a = a.a + acc.a * (1.0 - a.a);
  }
  return acc;
}
vec2 proj(vec3 p, vec3 n){ vec3 a = abs(n); if (a.x > a.y && a.x > a.z) return vec2(p.z * sign(n.x), p.y); if (a.y > a.z) return vec2(p.x, -p.z); return vec2(-p.x * sign(n.z), p.y); }
vec4 put(vec4 col, vec4 m, float w){ if (m.a > 0.001) col.rgb = mix(col.rgb, m.rgb / m.a, clamp(m.a * w, 0.0, 1.0)); return col; }
`;

const VS = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vL;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = /* glsl */`
uniform sampler2D uAtlas; uniform vec4 uCnt; uniform vec4 uS, uL, uF, uM;
uniform vec3 uBase, uShadowC, uSunDir, uSunCol, uAmb, uRimC, uFogC, uEmis, uRimLC, uGradeC;
uniform float uSoftK, uRimLW, uGradeK;
uniform float uStep, uBoil, uWorldK, uMarks, uMetal, uFlat;
varying vec3 vW; varying vec3 vN; varying vec3 vL;
${GLSL_COMMON}
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  vec3 wp = vW * uWorldK;
  vec2 uv = proj(wp, N);
  float ndl = dot(N, uSunDir);
  float md = 0.0;
  if (uCnt.w > 0.5 && uM.x > 0.0) { vec2 tu = fract(uv * uM.y); vec4 m = atlasAt(uAtlas, ${ROW.mask}.0, 0.0, vec2(tu.x, 1.0 - tu.y)); md = (dot(m.rgb, vec3(0.333)) - 0.5) * 2.0 * m.a; }
  float t = ndl + md * uM.x * 0.8;
  float sk = (uM.z + 0.015) * uSoftK + 0.002; float lit = smoothstep(-sk, sk, t);
  vec3 sh = uBase * (uShadowC * 1.5 + uAmb);
  vec3 li = uBase * uSunCol * (0.8 + 0.2 * step(0.6, ndl)) + uBase * uAmb;
  if (uMetal > 0.5) { vec3 R = reflect(-V, N); li = mix(li, mix(uFogC * 0.5, uFogC * 1.6 + uSunCol * 0.15, step(0.0, R.y)), 0.3); }
  if (uFlat > 0.5) { lit = 1.0; li = uBase; }
  vec4 col = vec4(mix(sh, li, lit) + uEmis, 1.0);
  if (uMarks > 0.5) {
    col = put(col, marks(uAtlas, uv, ${ROW.fill}.0, uCnt.z, uF, 9.7, uStep, uBoil), 1.0);
    col = put(col, marks(uAtlas, uv, ${ROW.shadow}.0, uCnt.x, uS, 1.3, uStep, uBoil), uS.w * (1.0 - lit));
    col = put(col, marks(uAtlas, uv, ${ROW.light}.0, uCnt.y, uL, 5.1, uStep, uBoil), uL.w * lit);
  }
  float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col.rgb += uRimC * fr * 0.22 * lit * (1.0 - uFlat);
  // общий тон кадра: монохром с одной краской (синяя ночь, тёплая охра)
  if (uGradeK > 0.001) { float lum = dot(col.rgb, vec3(0.3, 0.59, 0.11)); col.rgb = mix(col.rgb, uGradeC * lum * 1.7, uGradeK); }
  // линия света по краю силуэта со стороны источника (как оранжевая кромка у собаки под фонарём)
  if (uRimLW > 0.001 && uFlat < 0.5 && dot(uRimC, vec3(1.0)) > 0.0) { float f1 = 1.0 - max(dot(N, V), 0.0); float rl = smoothstep(1.0 - uRimLW - 0.03, 1.0 - uRimLW + 0.01, f1) * smoothstep(-0.05, 0.3, dot(N, uSunDir)); col.rgb = mix(col.rgb, uRimLC, rl); }
  float d = length(cameraPosition - vW); col.rgb = mix(col.rgb, uFogC, clamp((d - 18.0) / 60.0, 0.0, 0.7) * (1.0 - uFlat));
  gl_FragColor = vec4(col.rgb, 1.0);
  #include <colorspace_fragment>
}`;

function v4(p, kD, kS, kR, kW) { return new THREE.Vector4(p[kD] ?? 0.5, 100 / Math.max(1, p[kS] ?? 20), p[kR] ?? 0.2, p[kW] ?? 0.5); }

export function scribMaterial(atl, lib, cls, { base, worldK = 1, metal = false, emis = null, flat = false } = {}) {
  const C = CLS[cls];
  const u = {
    uAtlas: { value: null }, uCnt: { value: new THREE.Vector4() }, uS: { value: new THREE.Vector4() }, uL: { value: new THREE.Vector4() }, uF: { value: new THREE.Vector4() }, uM: { value: new THREE.Vector4() },
    uBase: { value: new THREE.Color(base ?? C.base) }, uRimC: { value: new THREE.Color(C.aura) }, uWorldK: { value: worldK }, uMetal: { value: metal ? 1 : 0 }, uEmis: { value: new THREE.Color(emis ?? 0x000000) }, uFlat: { value: flat ? 1 : 0 },
    uStep: shared.uStep, uBoil: shared.uBoil, uSunDir: shared.uSunDir, uSunCol: shared.uSunCol, uAmb: shared.uAmb, uShadowC: shared.uShadowC, uFogC: shared.uFogC, uMarks: shared.uMarks, uSoftK: shared.uSoftK, uRimLC: shared.uRimLC, uRimLW: shared.uRimLW, uGradeC: shared.uGradeC, uGradeK: shared.uGradeK,
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS });
  mat.userData.cls = cls;
  mat.userData.refresh = () => {
    const a = atl.get(cls); u.uAtlas.value = a.tex;
    u.uCnt.value.set(a.counts.shadow ?? 0, a.counts.light ?? 0, a.counts.fill ?? 0, a.counts.mask ?? 0);
    const S = lib.params(cls, 'shadow'), L = lib.params(cls, 'light'), F = lib.params(cls, 'fill'), M = lib.params(cls, 'mask');
    u.uS.value.copy(v4(S, 'dens', 'size', 'rot', 'str')); u.uL.value.copy(v4(L, 'dens', 'size', 'rot', 'str')); u.uF.value.copy(v4(F, 'dens', 'size', 'rot', 'str'));
    u.uM.value.set(M.amp ?? 0.35, 100 / Math.max(1, M.size ?? 40), M.soft ?? 0.05, 0);
  };
  mat.userData.refresh();
  return mat;
}

// --- аура: лента почеркушек за силуэтом (оболочка задними гранями) ---
const AVS = /* glsl */`
uniform float uOff; varying vec3 vW; varying vec3 vN;
void main(){ vec3 p = position + normal * uOff; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const AFS = /* glsl */`
uniform sampler2D uAtlas; uniform float uCnt, uStep, uBright, uRep, uDens, uBand; uniform vec3 uCol; uniform vec2 uCenter; uniform vec2 uRes;
varying vec3 vW; varying vec3 vN;
${GLSL_COMMON}
void main(){
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float v = clamp(abs(dot(N, V)) / uBand, 0.0, 1.0);   // 0 — внешний край ленты, 1 — у самого предмета
  vec2 d = gl_FragCoord.xy - uCenter; float u = (atan(d.y, d.x) / 6.28318 + 0.5) * uRep;
  float seg = floor(u); if (h1(vec2(seg, 3.0)) > uDens) discard;
  vec4 a;
  if (uCnt > 0.5) { float k = mod(floor(uStep / 2.0) + seg, uCnt); a = atlasAt(uAtlas, ${ROW.aura}.0, k, vec2(fract(u), v)); }
  else { float line = 1.0 - smoothstep(0.0, 0.12, abs(v - 0.55)); a = vec4(uCol, line * step(0.3, h1(vec2(floor(u * 6.0), floor(uStep))))); }
  if (a.a < 0.02) discard;
  gl_FragColor = vec4(a.rgb * uBright, a.a);
  #include <colorspace_fragment>
}`;
export function auraMaterial(atl, lib, cls, size = 1) {
  const u = { uAtlas: { value: null }, uCnt: { value: 0 }, uStep: shared.uStep, uBright: { value: 1 }, uRep: { value: 6 }, uDens: { value: 0.6 }, uBand: { value: 0.35 }, uOff: { value: 0.05 }, uCol: { value: new THREE.Color(CLS[cls].aura) }, uCenter: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2() } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: AVS, fragmentShader: AFS, side: THREE.BackSide, transparent: true, depthWrite: false });
  mat.userData.refresh = () => {
    const a = atl.get(cls); u.uAtlas.value = a.tex; u.uCnt.value = a.counts.aura ?? 0;
    const p = lib.params(cls, 'aura'); u.uBright.value = p.bright ?? 1; u.uRep.value = Math.round(p.rep ?? 6); u.uDens.value = p.dens ?? 0.6;
    u.uOff.value = (0.03 + 0.06 * (p.off ?? 1)) * size + (p.w ?? 0.3) * 0.25 * size; u.uBand.value = 0.25 + (p.w ?? 0.3) * 0.8;
  };
  mat.userData.refresh();
  return mat;
}

// --- контур тушью (оболочка) ---
export function inkMaterial(w = 0.02) {
  return new THREE.ShaderMaterial({ uniforms: { uW: { value: w }, uInkK: shared.uInkK, uInkC: shared.uInkC }, side: THREE.BackSide,
    vertexShader: 'uniform float uW, uInkK; void main(){ vec3 p = position + normal * uW * uInkK; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 uInkC; void main(){ gl_FragColor = vec4(uInkC, 1.0); \n #include <colorspace_fragment>\n }' });
}

// --- спрайт из клетки атласа (блик, свет, огонь, дым): кадры меняются шагами ---
export function cellSprite(atl, cls, role, { additive = false, opacity = 1 } = {}) {
  const a = atl.get(cls); const tex = a.tex.clone(); tex.repeat.set(1 / 4, 1 / ROLES.length); tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity });
  const sp = new THREE.Sprite(mat); sp.userData = { cls, role, tex, phase: Math.random() * 10 | 0 };
  sp.userData.frame = (step) => {
    const at = atl.get(cls);
    const n = at.counts[role] ?? 0; sp.visible = n > 0; if (!n) return;
    const k = (step + sp.userData.phase) % n; tex.offset.set(k / 4, 1 - (ROW[role] + 1) / ROLES.length);
  };
  return sp;
}
