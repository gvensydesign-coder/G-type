// Угловатая подсветка (angular rim light) для three.js.
// Рисованная кромка света на стороне силуэта, обращённой к источнику: неровная, «рубленая»,
// с осколками и рваным ореолом за силуэтом. Работает со SkinnedMesh и материалами
// MeshStandard / Physical / Lambert / Phong / Toon. Зависимость одна: three.
//
//   const rim = new AngularRim({ params: PRESETS.moon.params });
//   rim.attach(character.model);            // патчит материалы, добавляет ореол
//   rim.addLight(pointLight);                // Point / Spot / Directional, до 4
//   // каждый кадр, до основного рендера:
//   rim.update(dt, camera, renderer, scene);
//
// Как работает: персонажи с подсветкой рисуются отдельным проходом в текстуру глубины.
// Пиксель тела светится, если в нескольких пикселях от него в сторону источника (на экране)
// персонажа уже нет или там поверхность заметно дальше: это и есть край, обращённый к свету.
// Длина этой пробы зависит от клеточного шума, привязанного к модели, поэтому кромка
// рубленая, с уступами, и не плывёт по телу. Ореол — раздутая копия меша с шипами,
// светится только снаружи освещённого края.
import * as THREE from 'three';

export const MAX_LIGHTS = 4;
export const MASK_LAYER = 30;

// key, label, min, max, step, group
export const PARAM_DEFS = [
  ['intensity', 'Яркость', 0, 8, 0.05, 'light'],
  ['lightMix', 'Цвет от источника', 0, 1, 0.01, 'light'],
  ['range', 'Дальность света, м', 1, 30, 0.1, 'light'],
  ['tint', 'Окраска тела светом', 0, 1.5, 0.01, 'light'],
  ['width', 'Толщина, см', 0.5, 25, 0.1, 'shape'],
  ['minPx', 'Минимум толщины, px', 0, 6, 0.1, 'shape'],
  ['facing', 'Только сторона к свету', 0, 1, 0.01, 'shape'],
  ['spread', 'Охват (порог)', -1, 1, 0.01, 'shape'],
  ['inner', 'Яркость внутренних краёв', 0, 1, 0.01, 'shape'],
  ['smooth', 'Сгладить силуэт, px', 0, 16, 1, 'shape'],
  ['core', 'Яркая сердцевина', 0, 1, 0.01, 'shape'],
  ['rough', 'Неровность', 0, 1.5, 0.01, 'jag'],
  ['angular', 'Угловатость', 0, 1, 0.01, 'jag'],
  ['cell', 'Размер граней, см', 1, 40, 0.5, 'jag'],
  ['detail', 'Мелкая рвань', 0, 1, 0.01, 'jag'],
  ['gaps', 'Разрывы', 0, 1, 0.01, 'jag'],
  ['chips', 'Осколки', 0, 1, 0.01, 'chips'],
  ['chipSize', 'Размер осколков', 0.1, 1, 0.01, 'chips'],
  ['halo', 'Ореол за силуэтом, см', 0, 12, 0.1, 'chips'],
  ['haloRough', 'Шипы ореола', 0, 1, 0.01, 'chips'],
  ['haloAlpha', 'Яркость ореола', 0, 2, 0.01, 'chips'],
  ['boil', 'Дрожь (кипение)', 0, 1, 0.01, 'anim'],
  ['stepFps', 'Кадров дрожи, к/с', 0, 24, 1, 'anim'],
];
export const PARAM_GROUPS = { light: 'Свет', shape: 'Форма кромки', jag: 'Неровность и углы', chips: 'Осколки и ореол', anim: 'Анимация' };
export const COLOR_DEFS = [['cRim', 'Кромка'], ['cCore', 'Сердцевина']];

const BASE = {
  intensity: 1.5, lightMix: 0.25, range: 9, tint: 0.3,
  width: 12, minPx: 1.5, facing: 0.35, spread: -0.3, inner: 0.35, smooth: 8, core: 0.22,
  rough: 1, angular: 0.9, cell: 10, detail: 0.45, gaps: 0.08,
  chips: 0.3, chipSize: 0.45, halo: 5, haloRough: 0.7, haloAlpha: 1,
  boil: 0, stepFps: 8,
  cRim: '#2f8dff', cCore: '#a8e2ff',
};

export const PRESETS = {
  moon: { name: 'Лунный дух', swatch: '#2f8dff', params: { ...BASE } },
  witch: { name: 'Колдовской огонь', swatch: '#46f07a', params: { ...BASE, cRim: '#1ed760', cCore: '#e4ffd2', rough: 0.95, gaps: 0.25, chips: 0.45, boil: 0.4, stepFps: 10, halo: 4.5, haloRough: 0.85, intensity: 2.4 } },
  ember: { name: 'Костёр', swatch: '#ff8a2a', params: { ...BASE, cRim: '#ff6a1a', cCore: '#ffe0a0', width: 14, rough: 0.6, angular: 0.6, cell: 13, chips: 0.2, boil: 0.25, stepFps: 12, tint: 0.5, lightMix: 0.4, halo: 2.4 } },
  frost: { name: 'Ледяная кромка', swatch: '#8cf3ff', params: { ...BASE, cRim: '#4fe0ff', cCore: '#ffffff', width: 10, rough: 1.1, angular: 1, cell: 7, detail: 0.7, gaps: 0.3, chips: 0.6, chipSize: 0.38, halo: 3.5, haloRough: 1, core: 0.6 } },
  hex: { name: 'Тёмная магия', swatch: '#a35cff', params: { ...BASE, cRim: '#8a3dff', cCore: '#f0c8ff', width: 15, rough: 1, cell: 15, chips: 0.35, boil: 0.5, stepFps: 8, halo: 6, haloRough: 0.9, haloAlpha: 1.1, tint: 0.45 } },
  soft: { name: 'Мягкий контур', swatch: '#d7e6ff', params: { ...BASE, cRim: '#9cc4ff', cCore: '#ffffff', width: 8, rough: 0.25, angular: 0.3, cell: 20, detail: 0.1, gaps: 0, chips: 0, halo: 1.2, haloRough: 0.2, haloAlpha: 0.5, intensity: 1.6, core: 0.3 } },
};

// ---------------------------------------------------------------- GLSL

const GLSL_UNIFORMS = /* glsl */`
uniform vec3 uRimColor;
uniform vec3 uCoreColor;
uniform float uIntensity, uLightMix, uRange, uTint;
uniform float uWidth, uMinPx, uFacing, uSpread, uInner, uCore;
uniform float uRough, uAngular, uCell, uDetail, uGaps;
uniform float uChips, uChipSize;
uniform float uHalo, uHaloRough, uHaloAlpha;
uniform float uBoil, uStep, uObjScale;
uniform sampler2D uMask, uRaw;
uniform float uNear, uFar;
uniform vec2 uRes;
uniform float uProjY;
uniform int uLightCount;
uniform vec4 uLightPos[${MAX_LIGHTS}];
uniform vec4 uLightCol[${MAX_LIGHTS}];
varying vec3 vRimRest;
`;

const GLSL_NOISE = /* glsl */`
vec3 rimHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float rimHash1(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
// Voronoi: x = random value of the nearest cell (flat steps -> straight polygonal edges),
// y = manhattan distance to its seed (diamond flecks)
vec2 rimVoro(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d1 = 9.0, id = 0.0, m1 = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 r = g + rimHash3(i + g) - f;
    float d = dot(r, r);
    if (d < d1) { d1 = d; id = rimHash1(i + g); m1 = abs(r.x) + abs(r.y) + abs(r.z); }
  }
  return vec2(id, m1);
}
float rimValue(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rimHash1(i), rimHash1(i + vec3(1,0,0)), f.x), mix(rimHash1(i + vec3(0,1,0)), rimHash1(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rimHash1(i + vec3(0,0,1)), rimHash1(i + vec3(1,0,1)), f.x), mix(rimHash1(i + vec3(0,1,1)), rimHash1(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 rimP(vec3 rest, float cellMul) {
  vec3 p = rest * uObjScale * 100.0 / max(uCell * cellMul, 0.1);
  return p + (rimHash3(vec3(uStep, uStep * 1.7, 3.1)) - 0.5) * 6.0 * uBoil;
}
// signed jag noise ~[-0.5, 0.5]: smooth value noise blended into stepped cell values
float rimJag(vec3 p) {
  float a = mix(rimValue(p * 1.3), rimVoro(p).x, uAngular);
  float b = mix(rimValue(p * 3.6 + 5.0), rimVoro(p * 2.9 + 17.0).x, uAngular);
  return mix(a, a * 0.55 + b * 0.45, uDetail) - 0.5;
}
`;

const GLSL_FRAG = GLSL_NOISE + /* glsl */`
// uMask.r = distance along -z (metres) of the closest rim-lit surface, gaps closed; 1e4 = empty
float rimMaskZ(vec2 q) { return texture2D(uMask, q).r; }
// raw depth of the rim-lit characters (no gap closing), metres along -z; 1e4 = empty
float rimRawZ(vec2 q) {
  float d = texture2D(uRaw, q).r;
  return d >= 0.99999 ? 1e4 : (uNear * uFar) / (uFar - (uFar - uNear) * d);
}
// 0 = still on the character, 1 = a surface well behind (inner edge), 2 = empty (silhouette)
float rimOutK(vec2 px, float selfZ, float gap) {
  vec2 q = px / uRes;
  if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) return 2.0;
  float z = rimMaskZ(q);
  return z > 5e3 ? 2.0 : ((z + selfZ) > gap ? 1.0 : 0.0);
}
bool rimOut(vec2 px, float selfZ, float gap) { return rimOutK(px, selfZ, gap) > 0.5; }
// screen-space direction toward light i and how strongly it reads as a side/back light
vec3 rimLightDir(int i, vec3 viewPos, vec3 N, out float att, out vec3 L) {
  vec4 lp = uLightPos[i];
  att = 1.0;
  if (lp.w > 0.5) {
    vec3 d = lp.xyz - viewPos;
    float dist = length(d);
    L = d / max(dist, 1e-4);
    float k = dist / max(uRange, 0.01);
    att = clamp(1.0 - k * k, 0.0, 1.0);
    att *= att;
  } else L = normalize(lp.xyz);
  float lat = length(L.xy);
  // backlight straight behind: spread outward along the surface normal
  vec2 dir = L.xy + N.xy * (1.0 - clamp(lat * 2.5, 0.0, 1.0)) * step(L.z, 0.0) * 0.8;
  float side = clamp(lat * 2.2 + max(-L.z, 0.0) * 1.5, 0.0, 1.0);
  return vec3(normalize(dir + vec2(1e-5)), side);
}
`;

const GLSL_BODY = /* glsl */`
// returns rim radiance for a body pixel; tintOut gets a soft light wash
vec3 angularRim(vec3 N, vec3 viewPos, out vec3 tintOut) {
  tintOut = vec3(0.0);
  vec2 uv0 = gl_FragCoord.xy;
  float selfZ = viewPos.z;
  float pxPerM = uProjY * 0.5 * uRes.y / max(-selfZ, 0.05);
  vec3 p = rimP(vRimRest, 1.0);
  float n = rimJag(p);
  float gapN = rimVoro(p * 0.6 + 41.0).x;
  vec2 vc = rimVoro(rimP(vRimRest, 0.4) + 31.0);
  float gap = step(gapN, uGaps * 0.6);
  float widthPx = max(uWidth * 0.01 * pxPerM, uMinPx);
  float depthGap = 0.3;
  // the low-res mask may already read empty on the silhouette pixel itself
  bool selfOut = rimOut(uv0, selfZ, depthGap);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    float att; vec3 L;
    vec3 ld = rimLightDir(i, viewPos, N, att, L);
    if (att <= 0.0 || ld.z <= 0.0) continue;
    float ndl = dot(N, L);
    float face = mix(1.0, smoothstep(uSpread - 0.25, uSpread + 0.25, ndl + n * 0.6), uFacing);
    float reach = widthPx * max(0.0, 1.0 + n * uRough * 2.0) * ld.z * face;
    // march toward the light; first sample that leaves the character (or drops far behind) = edge
    float span = max(reach, 0.0) * 2.2;
    float exitD = 1e5, lastIn = 0.0, kind = 2.0;
    // on the far (unlit) silhouette the step back away from the light is empty too: skip
    if (selfOut && rimOut(uv0 - ld.xy * 3.0, selfZ, depthGap)) continue;
    for (int s = 1; s <= 8; s++) {
      float t = float(s) / 8.0 * span;
      float k = rimOutK(uv0 + ld.xy * t, selfZ, depthGap);
      if (k > 0.5) { exitD = t; kind = k; break; }
      lastIn = t;
    }
    // refine the crossing for a clean, anti-aliased edge
    if (exitD < 1e4) for (int k = 0; k < 3; k++) {
      float mid = 0.5 * (lastIn + exitD);
      if (rimOut(uv0 + ld.xy * mid, selfZ, depthGap)) exitD = mid; else lastIn = mid;
    }
    float band = 1.0 - smoothstep(reach - 0.75, reach + 0.75, exitD);
    band *= 1.0 - gap;
    float core = (1.0 - smoothstep(reach * mix(0.12, 0.6, uCore) - 0.6, reach * mix(0.12, 0.6, uCore) + 0.6, exitD)) * step(0.001, uCore) * band;
    // detached diamond flecks just behind the band
    float near = (1.0 - band) * (1.0 - smoothstep(reach * 2.2, reach * 2.2 + 1.0, exitD));
    float fleck = step(1.0 - uChips, vc.x) * (1.0 - smoothstep(uChipSize * 0.7, uChipSize * 0.75, vc.y)) * near;
    vec3 lc = uLightCol[i].rgb;
    float li = uLightCol[i].a * att;
    vec3 rimC = mix(uRimColor, lc * dot(uRimColor, vec3(0.333)) * 1.6, uLightMix);
    vec3 coreC = mix(uCoreColor, mix(uCoreColor, lc, 0.5), uLightMix * 0.6);
    float m = max(band, fleck);
    float k = kind > 1.5 ? 1.0 : uInner;
    sum += (rimC * m + (coreC - rimC) * core) * li * k;
    tintOut += rimC * li * pow(clamp(ndl * 0.5 + 0.5, 0.0, 1.0), 3.0);
  }
  return sum * uIntensity;
}
`;

const GLSL_HALO = /* glsl */`
vec3 angularHalo(vec3 N, vec3 viewPos) {
  vec2 uv0 = gl_FragCoord.xy;
  float selfZ = viewPos.z;
  float pxPerM = uProjY * 0.5 * uRes.y / max(-selfZ, 0.05);
  float reach = max(uHalo * 0.01 * pxPerM, 1.0) * 1.4;
  vec3 sum = vec3(0.0);
  // only outside the (gap-closed) silhouette
  if (rimRawZ(uv0 / uRes) < 5e3 || rimMaskZ(uv0 / uRes) < 5e3) return sum;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightCount) break;
    float att; vec3 L;
    vec3 ld = rimLightDir(i, viewPos, N, att, L);
    if (att <= 0.0 || ld.z <= 0.0) continue;
    // this pixel is outside the body; light it if the body is just behind it, away from the light
    float hitD = 1e5;
    for (int s = 1; s <= 6; s++) {
      float t = float(s) / 6.0 * reach;
      vec2 q = (uv0 - ld.xy * t) / uRes;
      float z = rimRawZ(q);
      if (z < 5e3 && abs(z + selfZ) < 0.8) { hitD = t; break; }
    }
    float m = 1.0 - smoothstep(reach * 0.55, reach, hitD);
    vec3 lc = uLightCol[i].rgb;
    float li = uLightCol[i].a * att * ld.z;
    vec3 rimC = mix(uRimColor, lc * dot(uRimColor, vec3(0.333)) * 1.6, uLightMix);
    sum += rimC * m * li;
  }
  return sum * uIntensity * uHaloAlpha;
}
`;

const POST_FRAG = /* glsl */`
uniform sampler2D tDepth, tSrc;
uniform int uMode;
uniform vec2 uDir;
uniform float uR, uNear, uFar;
varying vec2 vUv;
float lin(vec2 q) {
  float d = texture2D(tDepth, q).r;
  if (d >= 0.99999) return 1e4;
  return (uNear * uFar) / (uFar - (uFar - uNear) * d);
}
void main() {
  float v = uMode == 2 ? -1.0 : 1e4;
  if (uMode == 0) v = lin(vUv);
  else v = texture2D(tSrc, vUv).r;
  for (int i = -8; i <= 8; i++) {
    if (abs(float(i)) > uR || i == 0) continue;
    vec2 q = vUv + uDir * float(i);
    float s = uMode == 0 ? lin(q) : texture2D(tSrc, q).r;
    if (uMode == 2) {
      // erode: grow empty space back, but only into pixels that were filled by the dilation
      v = max(v, s);
    } else v = min(v, s);
  }
  gl_FragColor = vec4(v, 0.0, 0.0, 1.0);
}
`;

const KEY = 'angular-rim-3';

function patchBodyMaterial(mat, uniforms) {
  if (mat.userData.angularRim) return; // shared between meshes: patch once
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRimRest;\nvarying vec3 vRimView;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRimRest = position;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRimView = -mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_UNIFORMS + 'varying vec3 vRimView;\n' + GLSL_FRAG + GLSL_BODY)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      {
        vec3 rimTint;
        #ifdef FLAT_SHADED
          vec3 rimN = normalize(cross(dFdx(-vRimView), dFdy(-vRimView)));
        #else
          vec3 rimN = normal;
        #endif
        vec3 rimE = angularRim(rimN, -vRimView, rimTint);
        totalEmissiveRadiance += rimE + diffuseColor.rgb * rimTint * uTint;
      }`);
  };
  const prevKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () => (prevKey ? prevKey.call(mat) : '') + KEY;
  mat.userData.angularRim = { prev, prevKey };
  mat.needsUpdate = true;
}

function unpatchBodyMaterial(mat) {
  const u = mat.userData.angularRim;
  if (!u) return;
  mat.onBeforeCompile = u.prev || (() => {});
  if (u.prevKey) mat.customProgramCacheKey = u.prevKey; else delete mat.customProgramCacheKey;
  delete mat.userData.angularRim;
  mat.needsUpdate = true;
}

function makeHaloMaterial(uniforms) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_UNIFORMS + GLSL_NOISE + 'varying vec3 vRimView;\nvarying vec3 vRimN;')
      // skinned meshes get objectNormal from three's skinning chunks; plain meshes need it declared
      .replace('#include <begin_vertex>', '#ifndef USE_SKINNING\nvec3 objectNormal = vec3(normal);\n#endif\n#include <begin_vertex>\nvRimRest = position;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          // per-cell inflation: hull triangles stretch between cells into angular spikes
          float cv = rimVoro(rimP(position, 1.6)).x;
          float spike = mix(1.0, 0.1 + 1.8 * cv * cv, uHaloRough);
          vec3 hn = normalize(normalMatrix * objectNormal);
          mvPosition.xyz += hn * uHalo * 0.01 * spike;
          gl_Position = projectionMatrix * mvPosition;
          vRimView = -mvPosition.xyz;
          vRimN = hn;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_UNIFORMS + 'varying vec3 vRimView;\nvarying vec3 vRimN;\n' + GLSL_FRAG + GLSL_HALO)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      gl_FragColor = vec4(angularHalo(normalize(vRimN), -vRimView), 1.0);`);
  };
  mat.customProgramCacheKey = () => KEY + '-halo';
  return mat;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _c = new THREE.Color();
const _size = new THREE.Vector2();

export class AngularRim {
  constructor({ params = PRESETS.moon.params, halo = true, maskScale = 1, layer = MASK_LAYER } = {}) {
    this.params = { ...BASE, ...params };
    this.useHalo = halo;
    this.maskScale = maskScale; // mask resolution vs drawing buffer (0.5 = cheaper, softer)
    this.layer = layer;
    this.lights = [];
    this.meshes = [];
    this.halos = [];
    this.enabled = true;
    this.time = 0;
    this.objectScale = 1;
    this.mask = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
    this.mask.depthTexture = new THREE.DepthTexture(1, 1);
    this.mask.depthTexture.type = THREE.UnsignedIntType;
    this.depthMat = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
    this.depthMat.colorWrite = false;
    // closing (dilate + erode) of the linear depth fills small gaps (fur, strands, fingers)
    const rtOpt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.ping = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    this.pong = new THREE.WebGLRenderTarget(1, 1, rtOpt);
    this.post = new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: this.mask.depthTexture }, tSrc: { value: null }, uMode: { value: 0 }, uDir: { value: new THREE.Vector2() }, uR: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 100 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: POST_FRAG, depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    this.quad.frustumCulled = false;
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const lp = [], lc = [];
    for (let i = 0; i < MAX_LIGHTS; i++) { lp.push(new THREE.Vector4()); lc.push(new THREE.Vector4()); }
    this.uniforms = {
      uRimColor: { value: new THREE.Color() }, uCoreColor: { value: new THREE.Color() },
      uIntensity: { value: 0 }, uLightMix: { value: 0 }, uRange: { value: 1 }, uTint: { value: 0 },
      uWidth: { value: 0 }, uMinPx: { value: 0 }, uFacing: { value: 0 }, uSpread: { value: 0 }, uInner: { value: 0 }, uCore: { value: 0 },
      uRough: { value: 0 }, uAngular: { value: 0 }, uCell: { value: 1 }, uDetail: { value: 0 }, uGaps: { value: 0 },
      uChips: { value: 0 }, uChipSize: { value: 0 },
      uHalo: { value: 0 }, uHaloRough: { value: 0 }, uHaloAlpha: { value: 0 },
      uBoil: { value: 0 }, uStep: { value: 0 }, uObjScale: { value: 1 },
      uMask: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
      uProjY: { value: 1 }, uRaw: { value: this.mask.depthTexture }, uNear: { value: 0.1 }, uFar: { value: 100 },
      uLightCount: { value: 0 }, uLightPos: { value: lp }, uLightCol: { value: lc },
    };
    this.setParams(this.params);
  }

  // Patch every mesh under root. objectScale: metres per model unit (auto-detected when omitted).
  attach(root, { objectScale } = {}) {
    root.updateMatrixWorld(true);
    const found = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.angularRimHalo) found.push(o); });
    if (objectScale == null) {
      // rest-geometry height vs world height of the root gives the unit scale
      let hRest = 0;
      for (const m of found) { m.geometry.computeBoundingBox(); hRest = Math.max(hRest, m.geometry.boundingBox.max.y - m.geometry.boundingBox.min.y); }
      const box = new THREE.Box3().setFromObject(root, true);
      const hWorld = box.max.y - box.min.y;
      objectScale = hRest > 0 && hWorld > 0 ? hWorld / hRest : 1;
    }
    this.objectScale = objectScale;
    this.uniforms.uObjScale.value = objectScale;
    for (const mesh of found) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) patchBodyMaterial(m, this.uniforms);
      mesh.layers.enable(this.layer);
      this.meshes.push(mesh);
      if (this.useHalo) this._addHalo(mesh);
    }
    this._applyVisibility();
    return this;
  }

  detach() {
    for (const mesh of this.meshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) unpatchBodyMaterial(m);
      mesh.layers.disable(this.layer);
    }
    for (const h of this.halos) { h.parent?.remove(h); h.material.dispose(); }
    this.meshes = []; this.halos = [];
  }

  _addHalo(mesh) {
    const mat = makeHaloMaterial(this.uniforms);
    let h;
    if (mesh.isSkinnedMesh) {
      h = new THREE.SkinnedMesh(mesh.geometry, mat);
      h.bind(mesh.skeleton, mesh.bindMatrix);
      h.bindMode = mesh.bindMode;
    } else h = new THREE.Mesh(mesh.geometry, mat);
    h.userData.angularRimHalo = true;
    h.frustumCulled = false;
    h.castShadow = h.receiveShadow = false;
    h.renderOrder = (mesh.renderOrder || 0) + 1;
    h.position.copy(mesh.position); h.quaternion.copy(mesh.quaternion); h.scale.copy(mesh.scale);
    mesh.parent.add(h);
    this.halos.push(h);
  }

  _applyVisibility() {
    const on = this.enabled && this.params.halo > 0.01 && this.params.haloAlpha > 0.001;
    for (const h of this.halos) h.visible = on;
  }

  // Light: THREE.PointLight / SpotLight / DirectionalLight, or any Object3D (treated as a point).
  // weight scales its share of the rim; color defaults to the light's colour.
  addLight(light, { weight = 1, color = null } = {}) {
    if (this.lights.length >= MAX_LIGHTS) { console.warn('AngularRim: max ' + MAX_LIGHTS + ' lights'); return; }
    this.lights.push({ light, weight, color: color ? new THREE.Color(color) : null });
  }
  removeLight(light) { this.lights = this.lights.filter((l) => l.light !== light); }
  clearLights() { this.lights = []; }

  setParams(p) {
    Object.assign(this.params, p);
    const P = this.params, U = this.uniforms;
    U.uRimColor.value.set(P.cRim);
    U.uCoreColor.value.set(P.cCore);
    U.uIntensity.value = this.enabled ? P.intensity : 0;
    U.uLightMix.value = P.lightMix; U.uRange.value = P.range; U.uTint.value = this.enabled ? P.tint : 0;
    U.uWidth.value = P.width; U.uMinPx.value = P.minPx; U.uFacing.value = P.facing; U.uSpread.value = P.spread;
    U.uInner.value = P.inner; U.uCore.value = P.core;
    U.uRough.value = P.rough; U.uAngular.value = P.angular; U.uCell.value = P.cell; U.uDetail.value = P.detail; U.uGaps.value = P.gaps;
    U.uChips.value = P.chips; U.uChipSize.value = P.chipSize;
    U.uHalo.value = P.halo; U.uHaloRough.value = P.haloRough; U.uHaloAlpha.value = P.haloAlpha;
    U.uBoil.value = P.boil;
    this._applyVisibility();
  }

  setEnabled(on) { this.enabled = on; this.setParams({}); }

  // Call once per frame before the main render (camera matrices must be current).
  update(dt, camera, renderer, scene) {
    this.time += dt;
    const U = this.uniforms, P = this.params;
    U.uStep.value = P.stepFps > 0 ? Math.floor(this.time * P.stepFps) % 997 : 0;
    camera.updateMatrixWorld();
    const view = camera.matrixWorldInverse;
    let n = 0;
    for (const { light, weight, color } of this.lights) {
      if (n >= MAX_LIGHTS) break;
      if (light.visible === false || (light.isLight && light.intensity <= 0)) continue;
      const lp = U.uLightPos.value[n], lc = U.uLightCol.value[n];
      if (light.isDirectionalLight) {
        light.getWorldPosition(_v);
        light.target.getWorldPosition(_w);
        _v.sub(_w).transformDirection(view);
        lp.set(_v.x, _v.y, _v.z, 0);
      } else {
        light.getWorldPosition(_v).applyMatrix4(view);
        lp.set(_v.x, _v.y, _v.z, 1);
      }
      _c.copy(color || light.color || _c.set(1, 1, 1));
      lc.set(_c.r, _c.g, _c.b, weight);
      n++;
    }
    U.uLightCount.value = n;
    if (renderer && scene) this.renderMask(renderer, scene, camera);
  }

  // Depth of the rim-lit characters only, from the main camera.
  renderMask(renderer, scene, camera) {
    renderer.getDrawingBufferSize(_size);
    const w = Math.max(1, Math.floor(_size.x * this.maskScale)), h = Math.max(1, Math.floor(_size.y * this.maskScale));
    if (this.mask.width !== w || this.mask.height !== h) { this.mask.setSize(w, h); this.ping.setSize(w, h); this.pong.setSize(w, h); }
    const U = this.uniforms;
    // the body shader samples by gl_FragCoord, so uRes is the drawing buffer size scaled to the mask
    U.uRes.value.set(_size.x, _size.y);
    U.uProjY.value = camera.projectionMatrix.elements[5];
    U.uNear.value = camera.near; U.uFar.value = camera.far;
    if (!this.enabled || !this.meshes.length) return;
    const prev = {
      target: renderer.getRenderTarget(), override: scene.overrideMaterial, bg: scene.background,
      layers: camera.layers.mask, shadow: renderer.shadowMap.autoUpdate, autoClear: renderer.autoClear,
    };
    for (const h of this.halos) h.layers.disable(this.layer);
    scene.overrideMaterial = this.depthMat;
    scene.background = null;
    camera.layers.set(this.layer);
    renderer.shadowMap.autoUpdate = false;
    renderer.autoClear = true;
    renderer.setRenderTarget(this.mask);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    // linearize + closing: dilate (min) H, V then erode (max) H, V
    const P = this.post.uniforms, r = Math.min(8, Math.round(this.params.smooth * this.maskScale));
    P.uNear.value = camera.near; P.uFar.value = camera.far; P.uR.value = r;
    const pass = (mode, dx, dy, src, dst) => { P.uMode.value = mode; P.uDir.value.set(dx / w, dy / h); P.tSrc.value = src && src.texture; renderer.setRenderTarget(dst); renderer.render(this.quad, this.quadCam); };
    pass(0, 1, 0, null, this.ping);          // linearize + dilate H
    pass(1, 0, 1, this.ping, this.pong);     // dilate V
    pass(2, 1, 0, this.pong, this.ping);     // erode H
    pass(2, 0, 1, this.ping, this.pong);     // erode V
    U.uMask.value = this.pong.texture;
    renderer.setRenderTarget(prev.target);
    scene.overrideMaterial = prev.override;
    scene.background = prev.bg;
    camera.layers.mask = prev.layers;
    renderer.shadowMap.autoUpdate = prev.shadow;
    renderer.autoClear = prev.autoClear;
  }

  dispose() { this.detach(); for (const t of [this.mask, this.ping, this.pong]) t.dispose(); this.depthMat.dispose(); this.post.dispose(); }
}
