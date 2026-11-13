// Взрывы и дым в рисованном 2D-стиле, но объёмные: работают в 3D-сцене с любого ракурса.
// Импорт только three. Вся анимация считается на GPU из времени рождения частицы,
// CPU пишет атрибуты один раз при запуске эффекта. Поэтому эффект можно перематывать
// (fx.setTime) и замедлять без потерь.
//
//   const fx = new SmokeFX();            scene.add(fx.group);
//   fx.spawn('blast', position, { ...PRESETS.blast.params, color: '#8fd0ff' });
//   каждый кадр: fx.update(dt, camera);
//
// Слои (каждый = 1 draw call на все эффекты сразу):
//   puffs    объёмные пузыри дыма: инстансинг сферы, toon-свет в 2-3 тона, растворение дырами,
//            предпроход глубины, чтобы полупрозрачное облако читалось одним силуэтом;
//   spikes   3D-шипы взрыва (4-гранные конусы);
//   rings    ударные волны: плоские кольца в мировой плоскости (земля или наклон);
//   ribbons  ленты-завитки и линии скорости: кривая в 3D, ширина развёрнута к камере;
//   sprites  вспышки и искры-звёздочки: billboard, у света нет объёма.

import * as THREE from 'three';

// ---------------------------------------------------------------- GLSL

const GLSL_COMMON = /* glsl */`
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ return vnoise(p) * 0.55 + vnoise(p * 2.03 + 7.1) * 0.3 + vnoise(p * 4.1 + 3.3) * 0.15; }
float easeOutBack(float x, float o){ x -= 1.0; return 1.0 + (o + 1.0) * x * x * x + o * x * x; }
float easeOutExpo(float x){ return x >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x); }
float stepT(float t, float fps){ return fps > 0.5 ? floor(t * fps) / fps : t; }
void basisFrom(vec3 a, out vec3 t1, out vec3 t2){
  vec3 r = abs(a.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  t1 = normalize(cross(r, a)); t2 = cross(a, t1);
}
#define HIDE { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
`;

const PUFF_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iOrigin;
attribute vec3 iVel;
attribute vec4 iTime;    // birth, life, inFrac, outFrac
attribute vec4 iSize;    // s0, peak, end, growFrac
attribute vec4 iMotion;  // drag, buoyancy, squashY, seed
attribute vec4 iExtra;   // overshoot, core, dissolve, sway
attribute vec4 iCenter;  // swirl center xyz, angular speed
attribute vec4 iStyle;   // alpha, edgeAlpha, wobble, stepFps
attribute vec3 iColA;    // light tone
attribute vec3 iColB;    // shadow tone
attribute vec3 iColC;    // core / accent
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
varying float vAlpha; varying float vDiss; varying float vCore; varying float vFade;
varying vec3 vA; varying vec3 vB; varying vec3 vC;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iStyle.w);
  float life = iTime.y;
  if (t < 0.0 || t > life) HIDE
  float k = t / life;
  float g = iSize.w;
  float s = k < g ? mix(iSize.x, iSize.y, easeOutBack(k / g, iExtra.x))
                  : mix(iSize.y, iSize.z, pow(smoothstep(g, 1.0, k), 1.4));
  s = max(s, 0.0);
  float d = iMotion.x;
  vec3 c = iOrigin + iVel * (d > 0.001 ? (1.0 - exp(-d * t)) / d : t);
  c.y += 0.5 * iMotion.y * t * t;
  float ph = iMotion.w * 6.2831;
  c.xz += vec2(sin(t * 1.7 + ph), cos(t * 1.3 + ph * 1.7)) * iExtra.w * t;
  if (abs(iCenter.w) > 0.0001) {
    vec2 rel = c.xz - iCenter.xz; float a = iCenter.w * t; float cs = cos(a), sn = sin(a);
    c.xz = iCenter.xz + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);
  }
  float wob = (vnoise(normal * 1.7 + iMotion.w * 17.0 + vec3(0.0, t * 0.7, 0.0)) - 0.5) * iStyle.z * 2.0;
  vec3 lp = position * (1.0 + wob);
  lp.y *= iMotion.z;
  vObj = position + iMotion.w * 13.0;
  vec3 wp = c + lp * s;
  vW = wp;
  vN = normalize(vec3(normal.x, normal.y / max(iMotion.z, 0.25), normal.z));
  float aIn = mix(iStyle.y, 1.0, smoothstep(0.0, iTime.z, k));
  float ko = smoothstep(1.0 - iTime.w, 1.0, k);
  float aOut = mix(1.0, iStyle.y, ko) * (1.0 - smoothstep(0.9, 1.0, k));
  vFade = min(aIn, aOut);
  vAlpha = iStyle.x * vFade;
  vDiss = ko * iExtra.z;
  vCore = iExtra.y * (1.0 - smoothstep(0.0, 0.35, k));
  vA = iColA; vB = iColB; vC = iColC;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const PUFF_FRAG_BODY = /* glsl */`
  if (vAlpha <= 0.003) discard;
  float n = vnoise(vObj * 1.6) * 0.8 + vnoise(vObj * 3.7 + 5.0) * 0.2;
  if (vDiss > 0.0 && n < vDiss * 1.1 - 0.06) discard;
`;

const PUFF_FRAG = /* glsl */`
uniform vec3 uLight; uniform float uShadowCut; uniform float uHighlight; uniform float uGlobalAlpha;
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
varying float vAlpha; varying float vDiss; varying float vCore;
varying vec3 vA; varying vec3 vB; varying vec3 vC;
${GLSL_COMMON}
void main(){
  ${PUFF_FRAG_BODY}
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, uLight) * 0.5 + 0.5 + (vnoise(vObj * 1.2 + 9.0) - 0.5) * 0.18;
  vec3 col = ndl < uShadowCut ? vB : vA;
  if (ndl > 0.93 && uHighlight > 0.0) col = mix(vA, vec3(1.0), uHighlight);
  float facing = dot(N, V);
  float core = vCore * smoothstep(0.15, 0.85, facing) * (0.65 + n * 0.7);
  if (core > 0.62) col = vC; else if (core > 0.5) col = mix(col, vC, 0.5);
  if (vDiss > 0.0 && n < vDiss * 1.1 - 0.02) col = vB;   // тёмная кайма вокруг дыр
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const PUFF_DEPTH_FRAG = /* glsl */`
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
varying float vAlpha; varying float vDiss; varying float vCore; varying float vFade;
varying vec3 vA; varying vec3 vB; varying vec3 vC;
${GLSL_COMMON}
void main(){
  ${PUFF_FRAG_BODY}
  if (vFade < 0.28) discard;   // почти прозрачные пузыри не перекрывают соседей
  gl_FragColor = vec4(0.0);
}`;

const SPIKE_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iOrigin; attribute vec3 iDir;
attribute vec4 iTime;   // birth, life, outFrac, holdFrac
attribute vec4 iShape;  // length, width, offset, stepFps
attribute vec4 iMisc;   // alpha, edgeAlpha, tipGlow, -
attribute vec3 iColA; attribute vec3 iColB;
varying float vY; varying vec3 vN; varying float vAlpha; varying vec3 vA; varying vec3 vB; varying float vGlow;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iShape.w);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float ext = easeOutExpo(min(k / iTime.z, 1.0));
  float slide = smoothstep(iTime.w, 1.0, k);
  float base = iShape.z + iShape.x * slide * 0.9;
  float tip = iShape.z + iShape.x * ext * (1.0 + slide * 0.25);
  float L = max(tip - base, 0.0);
  float w = iShape.y * (1.0 - slide * 0.85) * (0.4 + 0.6 * ext);
  vec3 Y = normalize(iDir), X, Z; basisFrom(Y, X, Z);
  vec3 wp = iOrigin + Y * (base + position.y * L) + (X * position.x + Z * position.z) * w;
  vY = position.y;
  vN = normalize(X * normal.x + Y * normal.y + Z * normal.z);
  vAlpha = iMisc.x * mix(iMisc.y, 1.0, smoothstep(0.0, 0.15, k)) * (1.0 - smoothstep(0.75, 1.0, k));
  vA = iColA; vB = iColB; vGlow = iMisc.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SPIKE_FRAG = /* glsl */`
uniform vec3 uLight; uniform float uGlobalAlpha;
varying float vY; varying vec3 vN; varying float vAlpha; varying vec3 vA; varying vec3 vB; varying float vGlow;
void main(){
  vec3 col = mix(vA, vB, smoothstep(0.25, 0.8, vY));
  if (dot(normalize(vN), uLight) < 0.05) col = mix(col, vA * 0.55, 0.55 * (1.0 - vGlow));
  if (vGlow > 0.0 && vY > 0.55) col = mix(col, vec3(1.0), vGlow);
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const RING_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iCenter; attribute vec3 iNormal;
attribute vec4 iTime;   // birth, life, seed, stepFps
attribute vec4 iRad;    // r0, r1, w0, w1
attribute vec4 iMisc;   // alpha, edgeAlpha, breakup, -
attribute vec3 iColA; attribute vec3 iColB;
varying vec2 vP; varying float vR; varying float vWd; varying float vAlpha; varying float vSeed; varying float vBreak;
varying vec3 vA; varying vec3 vB;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iTime.w);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float R = mix(iRad.x, iRad.y, 1.0 - pow(1.0 - k, 3.0));
  float W = mix(iRad.z, iRad.w, smoothstep(0.0, 1.0, k));
  float outer = R + W;
  vec3 T1, T2; vec3 Nn = normalize(iNormal); basisFrom(Nn, T1, T2);
  vec3 wp = iCenter + (T1 * position.x + T2 * position.z) * outer;
  vP = position.xz * outer; vR = R; vWd = W; vSeed = iTime.z; vBreak = iMisc.z * (0.6 + 0.6 * k);
  vAlpha = iMisc.x * mix(iMisc.y, 1.0, smoothstep(0.0, 0.1, k)) * (1.0 - smoothstep(0.55, 1.0, k));
  vA = iColA; vB = iColB;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const RING_FRAG = /* glsl */`
uniform float uGlobalAlpha;
varying vec2 vP; varying float vR; varying float vWd; varying float vAlpha; varying float vSeed; varying float vBreak;
varying vec3 vA; varying vec3 vB;
${GLSL_COMMON}
void main(){
  float d = length(vP);
  float a = atan(vP.y, vP.x);
  float n = vnoise(vec3(cos(a) * 2.2, sin(a) * 2.2, vSeed * 11.0));
  float wf = smoothstep(vBreak - 0.08, vBreak + 0.2, n);
  float hw = vWd * 0.5 * wf;
  float off = d - vR;
  if (abs(off) > hw || hw < 0.002) discard;
  vec3 col = off < -hw * 0.2 ? vB : vA;
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const RIBBON_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iCenter; attribute vec3 iAxis;
attribute vec4 iTime;    // birth, draw, lag, life
attribute vec4 iCurve;   // r0, r1, h0, h1
attribute vec4 iCurve2;  // a0, turns, spin, expand
attribute vec4 iStyle;   // width, alpha, edgeAlpha, stepFps
attribute vec3 iCol;
varying float vAlpha; varying vec3 vCol; varying float vSide;
${GLSL_COMMON}
vec3 T1, T2;
vec3 curveP(float u, float t){
  float a = iCurve2.x + u * iCurve2.y * 6.2831853 + iCurve2.z * t;
  float r = mix(iCurve.x, iCurve.y, u) * (1.0 + iCurve2.w * t);
  float h = mix(iCurve.z, iCurve.w, u);
  return iCenter + (cos(a) * T1 + sin(a) * T2) * r + iAxis * h;
}
void main(){
  float t = stepT(uTime - iTime.x, iStyle.w);
  if (t < 0.0 || t > iTime.w) HIDE
  basisFrom(normalize(iAxis), T1, T2);
  float head = clamp(t / iTime.y, 0.0, 1.0);
  float tail = clamp((t - iTime.z) / iTime.y, 0.0, 1.0);
  float span = head - tail;
  if (span < 0.002) HIDE
  float u = mix(tail, head, position.x);
  vec3 P = curveP(u, t);
  vec3 Tn = curveP(min(u + 0.01, 1.0), t) - curveP(max(u - 0.01, 0.0), t);
  vec3 V = normalize(cameraPosition - P);
  vec3 side = cross(Tn, V);
  side = length(side) > 1e-5 ? normalize(side) : vec3(0.0, 1.0, 0.0);
  float s = position.x;
  float w = iStyle.x * pow(sin(3.14159 * clamp(s * 0.85 + 0.08, 0.0, 1.0)), 0.8) * min(span * 4.0, 1.0);
  P += side * position.y * w;
  float k = t / iTime.w;
  vAlpha = iStyle.y * mix(iStyle.z, 1.0, smoothstep(0.0, 0.2, k)) * (1.0 - smoothstep(0.7, 1.0, k) * (1.0 - iStyle.z));
  vCol = iCol; vSide = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;

const RIBBON_FRAG = /* glsl */`
uniform float uGlobalAlpha;
varying float vAlpha; varying vec3 vCol; varying float vSide;
void main(){
  vec3 col = vSide < -0.35 ? vCol * 0.78 : vCol;
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const SPRITE_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iPos; attribute vec3 iVel;
attribute vec4 iTime;   // birth, life, growFrac, pull
attribute vec4 iSize;   // size, rot, rotSpeed, shape
attribute vec4 iMisc;   // alpha, edgeAlpha, stepFps, overshoot
attribute vec3 iColA; attribute vec3 iColB;
varying vec2 vUv; varying float vAlpha; varying float vShape; varying vec3 vA; varying vec3 vB; varying float vK;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iMisc.z);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float g = iTime.z;
  float s = k < g ? easeOutBack(k / g, iMisc.w) : 1.0 - pow(smoothstep(g, 1.0, k), 1.3);
  vec3 c = iPos + iVel * t;
  c += normalize(cameraPosition - c) * iTime.w;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float r = iSize.y + iSize.z * t; float cs = cos(r), sn = sin(r);
  vUv = vec2(cs * position.x - sn * position.y, sn * position.x + cs * position.y);
  vec3 wp = c + (right * position.x + up * position.y) * iSize.x * max(s, 0.0);
  vAlpha = iMisc.x * mix(iMisc.y, 1.0, smoothstep(0.0, g * 0.8 + 0.001, k));
  vShape = iSize.w; vA = iColA; vB = iColB; vK = k;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SPRITE_FRAG = /* glsl */`
uniform float uGlobalAlpha;
varying vec2 vUv; varying float vAlpha; varying float vShape; varying vec3 vA; varying vec3 vB; varying float vK;
void main(){
  float inner, outer;
  if (vShape < 0.5) {            // звёздочка-блик (астроида)
    vec2 q = sqrt(abs(vUv)); float d = q.x + q.y;
    outer = d; inner = d / 0.62;
  } else if (vShape < 1.5) {     // рваная вспышка-звезда
    float a = atan(vUv.y, vUv.x); float r = length(vUv);
    float edge = 0.3 + 0.7 * pow(abs(cos(a * 4.0)), 5.0) * (0.6 + 0.4 * sin(a * 3.0 + 1.3));
    edge = max(edge, 0.42 + 0.08 * sin(a * 9.0));
    outer = r / edge; inner = r / (edge * mix(0.72, 0.35, vK));
  } else {                       // расходящееся кольцо-ореол
    float r = length(vUv); float hole = mix(0.45, 0.9, vK); float band = mix(0.14, 0.03, vK);
    if (r < hole || r > hole + band) discard;
    outer = r; inner = (r - hole) / (band * 0.45);
  }
  if (outer > 1.0) discard;
  vec3 col = inner < 1.0 ? vA : vB;
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- инстанс-слой

class Layer {
  constructor(baseGeo, defs, capacity, materials, renderOrders) {
    this.capacity = capacity;
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = baseGeo.index;
    for (const k of Object.keys(baseGeo.attributes)) this.geo.setAttribute(k, baseGeo.attributes[k]);
    this.attrs = {};
    for (const [name, size] of Object.entries(defs)) {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      this.attrs[name] = a; this.geo.setAttribute(name, a);
    }
    this.geo.instanceCount = 0;
    this.death = new Float32Array(capacity).fill(-1e9);
    this.birth = new Float32Array(capacity).fill(1e9);
    this.cursor = 0; this.dirtyMin = Infinity; this.dirtyMax = -1;
    this.meshes = materials.map((m, i) => {
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.frustumCulled = false; mesh.renderOrder = renderOrders[i];
      return mesh;
    });
    this.live = 0;
  }
  alloc(now) {
    // ищем мёртвый слот от курсора; если всё занято, перезаписываем самый старый по кольцу
    for (let n = 0; n < this.capacity; n++) {
      const i = (this.cursor + n) % this.capacity;
      if (this.death[i] < now || this.birth[i] > now + 60) { this.cursor = (i + 1) % this.capacity; return i; }
    }
    const i = this.cursor; this.cursor = (i + 1) % this.capacity; return i;
  }
  write(i, birth, death, values) {
    for (const [name, v] of Object.entries(values)) {
      const a = this.attrs[name]; const s = a.itemSize; const arr = a.array;
      if (typeof v === 'number') arr[i * s] = v;
      else if (v.isColor) { arr[i * s] = v.r; arr[i * s + 1] = v.g; arr[i * s + 2] = v.b; }
      else if (v.isVector3) { arr[i * s] = v.x; arr[i * s + 1] = v.y; arr[i * s + 2] = v.z; }
      else for (let j = 0; j < s; j++) arr[i * s + j] = v[j] ?? 0;
    }
    this.birth[i] = birth; this.death[i] = death;
    this.dirtyMin = Math.min(this.dirtyMin, i); this.dirtyMax = Math.max(this.dirtyMax, i);
  }
  flush(now) {
    if (this.dirtyMax >= 0) {
      for (const a of Object.values(this.attrs)) {
        a.clearUpdateRanges();
        a.addUpdateRange(this.dirtyMin * a.itemSize, (this.dirtyMax - this.dirtyMin + 1) * a.itemSize);
        a.needsUpdate = true;
      }
      this.dirtyMin = Infinity; this.dirtyMax = -1;
    }
    // рисуем только до последнего живого слота: мёртвые хвосты не тратят вершинный шейдер
    let hi = -1, live = 0;
    for (let i = 0; i < this.capacity; i++) if (this.death[i] >= now && this.birth[i] < now + 60) { hi = i; if (this.birth[i] <= now) live++; }
    this.geo.instanceCount = hi + 1; this.live = live;
    for (const m of this.meshes) m.visible = hi >= 0;
  }
  clear() {
    this.death.fill(-1e9); this.birth.fill(1e9); this.cursor = 0;
    const a = this.attrs.iTime; a.array.fill(0);
    for (let i = 0; i < this.capacity; i++) a.array[i * 4] = -1e9;   // рождение в далёком прошлом: шейдер прячет
    a.clearUpdateRanges(); a.needsUpdate = true;
    this.geo.instanceCount = 0;
  }
}

// ---------------------------------------------------------------- параметры и пресеты

export const PARAM_DEFS = {
  scale:     { label: 'Масштаб', min: 0.25, max: 3, step: 0.05 },
  duration:  { label: 'Длительность', min: 0.3, max: 3, step: 0.05, hint: 'множитель времени' },
  intensity: { label: 'Интенсивность', min: 0.3, max: 2, step: 0.05, hint: 'число частиц, скорость, свет' },
  snap:      { label: 'Резкость', min: 0, max: 1, step: 0.01, hint: '0 мягко, 1 резко' },
  opacity:   { label: 'Непрозрачность', min: 0.2, max: 1, step: 0.01 },
  edgeAlpha: { label: 'Прозрачность на входе и выходе', min: 0, max: 1, step: 0.01, hint: 'альфа в момент появления и исчезновения' },
  dissolve:  { label: 'Растворение дырами', min: 0, max: 1.5, step: 0.05 },
  wobble:    { label: 'Бугристость', min: 0, max: 0.4, step: 0.01 },
  stepFps:   { label: 'Кадров в секунду', min: 0, max: 24, step: 1, hint: '0 плавно, 8-12 рисованная анимация' },
  flash:     { label: 'Вспышка', min: 0, max: 1.5, step: 0.05 },
  spikes:    { label: 'Шипы', min: 0, max: 16, step: 1 },
  sparkles:  { label: 'Блики', min: 0, max: 12, step: 1 },
  light:     { label: 'Свет на окружение', min: 0, max: 2, step: 0.05 },
};

export const COLOR_DEFS = {
  color:  'Основной',
  shadow: 'Тень',
  accent: 'Ядро / акцент',
  cFlash: 'Вспышка и шипы',
};

const BASE = { scale: 1, duration: 1, intensity: 1, snap: 0.5, opacity: 1, edgeAlpha: 0.4, dissolve: 1, wobble: 0.05, stepFps: 0, flash: 0, spikes: 0, sparkles: 0, light: 0.6 };

export const PRESETS = {
  blast: {
    name: 'Взрыв', recipe: 'blast', tempo: 'резкий',
    params: { ...BASE, snap: 0.75, sparkles: 2, light: 0.7, color: '#86c8ec', shadow: '#6a8da3', accent: '#e8f0a0', cFlash: '#ffffff' },
  },
  magic: {
    name: 'Взрыв со вспышкой', recipe: 'blast', tempo: 'самый резкий',
    params: { ...BASE, snap: 0.95, flash: 1, spikes: 9, sparkles: 5, light: 1.2, edgeAlpha: 0.5, color: '#4a3fc4', shadow: '#2a2380', accent: '#ff5fd2', cFlash: '#ff4fc8' },
  },
  toxic: {
    name: 'Ядовитый пых', recipe: 'blast', tempo: 'резкий старт, вязкий хвост',
    params: { ...BASE, snap: 0.6, duration: 1.3, spikes: 3, sparkles: 4, light: 0.4, color: '#b4c45a', shadow: '#7d8c3b', accent: '#f6e46a', cFlash: '#9fb04a' },
  },
  fire: {
    name: 'Огненный взрыв', recipe: 'blast', tempo: 'резкий',
    params: { ...BASE, snap: 0.85, flash: 0.7, spikes: 5, sparkles: 2, light: 1.5, color: '#8a8590', shadow: '#4c4652', accent: '#ffae3a', cFlash: '#ff7a2a' },
  },
  smoke: {
    name: 'Лёгкий дым', recipe: 'smoke', tempo: 'мягкий, медленный',
    params: { ...BASE, snap: 0.15, opacity: 0.88, edgeAlpha: 0.3, light: 0, dissolve: 0.7, wobble: 0.05, color: '#f2f2f0', shadow: '#bfc3c9', accent: '#ffffff', cFlash: '#ffffff' },
  },
  ground: {
    name: 'Стелющийся дым с волной', recipe: 'ground', tempo: 'резкий удар, медленное оседание',
    params: { ...BASE, snap: 0.7, flash: 0.6, light: 1, dissolve: 1.15, color: '#a6e8d2', shadow: '#b2a888', accent: '#f4fff8', cFlash: '#e8fff6' },
  },
  whirl: {
    name: 'Вихрь', recipe: 'whirl', tempo: 'мягкий, непрерывный',
    params: { ...BASE, snap: 0.3, edgeAlpha: 0.3, light: 0, color: '#eef3f6', shadow: '#a9b8c4', accent: '#ffffff', cFlash: '#ffffff' },
  },
  dash: {
    name: 'Шлейф рывка', recipe: 'dash', tempo: 'резкий старт, мягкий хвост',
    params: { ...BASE, snap: 0.8, edgeAlpha: 0.35, light: 0, dissolve: 1.1, color: '#e9e1d2', shadow: '#b39f86', accent: '#ffffff', cFlash: '#ffffff' },
  },
};

// Тень из основного цвета: темнее, чуть менее насыщенная, с лёгким сдвигом тона (как на референсах).
export function deriveShadow(hex) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
  const warm = hsl.h > 0.35 && hsl.h < 0.55;          // мятный и бирюзовый уходят в хаки
  const h = warm ? hsl.h - 0.33 : hsl.h + 0.02;
  c.setHSL((h + 1) % 1, hsl.s * (warm ? 0.3 : 0.8), hsl.l * 0.66, THREE.SRGBColorSpace);
  return '#' + c.getHexString();
}

// ---------------------------------------------------------------- рецепты

const R = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
function randDir(yScale = 1, yBias = 0) {
  const u = R(-1, 1), a = R(0, TAU), s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(a) * s, u * yScale + yBias, Math.sin(a) * s).normalize();
}

// Каждый рецепт: (ctx) => фазы [[название, t0, t1], ...] в секундах при duration = 1.
export const RECIPES = {
  blast(c) {
    const p = c.p;
    const nCore = c.count(16);
    for (let i = 0; i < nCore; i++) {
      const dir = randDir(0.8, 0.15), r0 = R(0, 0.35);
      c.puff({ p: dir.clone().multiplyScalar(r0), v: dir.clone().multiplyScalar(R(3, 6.5)), drag: R(5, 7.5),
        birth: R(0, 0.04), life: R(1.3, 1.9), s0: 0.08, peak: R(0.38, 0.72) * (1 - r0 * 0.8), end: R(0.15, 0.3),
        grow: 0.14, over: 1.3, buoy: 0.5, squash: 0.92, core: 1.1 - r0 * 2, inF: 0.08, outF: 0.5 });
    }
    const nSec = c.count(10);
    for (let i = 0; i < nSec; i++) {
      const dir = randDir(0.7, 0.1);
      c.puff({ p: dir.clone().multiplyScalar(0.75), v: dir.clone().multiplyScalar(R(2, 3.2)), drag: 4,
        birth: R(0.05, 0.2), life: R(1.0, 1.5), s0: 0.05, peak: R(0.2, 0.36), end: 0.08, grow: 0.16, over: 1.2,
        buoy: 0.4, core: 0.25, inF: 0.12, outF: 0.5 });
    }
    const nRise = c.count(4);
    for (let i = 0; i < nRise; i++) {
      c.puff({ p: [R(-0.3, 0.3), 0.55, R(-0.3, 0.3)], v: [R(-0.2, 0.2), R(0.6, 1.0), R(-0.2, 0.2)], drag: 1,
        birth: R(0.25, 0.5), life: R(1.5, 2.1), s0: 0.1, peak: R(0.28, 0.42), end: 0.12, grow: 0.35, over: 0.4,
        buoy: 0.5, sway: 0.08, inF: 0.2, outF: 0.55 });
    }
    const nBits = c.count(4);
    for (let i = 0; i < nBits; i++) {
      const dir = randDir(0.6, 0.35);
      c.puff({ p: dir.clone().multiplyScalar(0.4), v: dir.clone().multiplyScalar(R(4, 6)), drag: 3.5,
        birth: R(0.02, 0.06), life: R(0.8, 1.2), s0: 0.04, peak: R(0.09, 0.16), end: 0.03, grow: 0.12, over: 1,
        buoy: -0.3, inF: 0.1, outF: 0.45 });
    }
    if (p.flash > 0) {
      c.sprite({ p: [0, 0, 0], size: 1.7 * p.flash, birth: 0, life: 0.26, grow: 0.15, over: 0.6, pull: 1.0, shape: 1, rot: R(0, TAU), colA: c.white, colB: c.flashCol, crisp: true });
      c.sprite({ p: [0, 0, 0], size: 2.2 * p.flash, birth: 0.03, life: 0.3, grow: 0.05, over: 0, pull: 1.2, shape: 2, colA: c.white, colB: c.flashCol, crisp: true });
    }
    const nSp = Math.round(p.spikes * Math.min(1.4, 0.6 + 0.4 * p.intensity));
    for (let i = 0; i < nSp; i++) {
      const dir = randDir(0.75, 0.1);
      c.spike({ dir, len: R(1.3, 2.5), width: R(0.09, 0.16), offset: 0.3, birth: R(0, 0.04), life: R(0.4, 0.55), outF: 0.14, hold: 0.42 });
    }
    for (let i = 0; i < Math.round(p.sparkles); i++) {
      const dir = randDir(0.8, 0.2);
      c.sprite({ p: dir.multiplyScalar(R(0.3, 0.8)), size: R(0.2, 0.34), birth: R(0.12, 0.5), life: R(0.25, 0.4), grow: 0.3, over: 1.5,
        pull: 0.75, shape: 0, rot: 0, rotSpeed: R(-2, 2), colA: c.white, colB: c.accentCol });
    }
    c.light({ birth: 0, life: 0.7, power: 1, color: p.flash > 0 ? c.flashCol : c.accentCol });
    return [['Вспышка', 0, 0.08], ['Разлёт', 0.02, 0.25], ['Клубы', 0.25, 0.8], ['Рассеивание', 0.8, 2.1]];
  },

  smoke(c) {
    const n = c.count(22), span = 2.2;
    for (let i = 0; i < n; i++) {
      c.puff({ p: [R(-0.15, 0.15), R(0, 0.1), R(-0.15, 0.15)], v: [R(-0.25, 0.25), R(1.0, 1.4), R(-0.25, 0.25)], drag: 0.35,
        birth: (i / n) * span + R(0, 0.08), life: R(2.2, 3.0), s0: 0.08, peak: R(0.35, 0.5), end: R(0.6, 0.8),
        grow: 0.8, over: 0, buoy: 0.15, sway: 0.22, squash: 0.95, inF: 0.25, outF: 0.6 });
    }
    for (let i = 0; i < 2; i++) {
      c.ribbon({ r0: 0.08, r1: R(0.3, 0.45), h0: 0.3, h1: R(2.2, 2.7), a0: R(0, TAU), turns: R(1.1, 1.5) * (i ? 1 : -1), spin: 0.6, expand: 0.15,
        width: 0.055, birth: 0.4 + i * 0.9, draw: 1.3, lag: 0.8, col: c.colA });
    }
    return [['Зарождение', 0, 0.6], ['Подъём', 0.6, 2.2], ['Рассеивание', 2.2, 4.8]];
  },

  ground(c) {
    const p = c.p;
    c.ring({ center: [0, 0.03, 0], r0: 0.3, r1: 4.2, w0: 0.45, w1: 0.05, birth: 0, life: 0.75, breakup: 0.3, colA: c.colA, colB: c.colB });
    c.ring({ center: [0, 0.03, 0], r0: 0.2, r1: 3.1, w0: 0.22, w1: 0.03, birth: 0.08, life: 0.9, breakup: 0.45, colA: c.colB, colB: c.colB, alpha: 0.7 });
    if (p.flash > 0) c.sprite({ p: [0, 0.4, 0], size: 1.4 * p.flash, birth: 0, life: 0.18, grow: 0.25, over: 0.5, pull: 0.6, shape: 1, rot: R(0, TAU), colA: c.white, colB: c.flashCol });
    const nStem = c.count(8);
    for (let i = 0; i < nStem; i++) {
      const v = 2.6 + i * 0.35;
      c.puff({ p: [R(-0.15, 0.15), 0.1, R(-0.15, 0.15)], v: [R(-0.15, 0.15), v, R(-0.15, 0.15)], drag: 2.2,
        birth: i * 0.025, life: R(2.4, 3.0), s0: 0.1, peak: R(0.35, 0.5) * (1 - i * 0.03), end: 0.2, grow: 0.22, over: 0.8,
        buoy: 0.15, core: i < 3 ? 0.8 : 0, inF: 0.1, outF: 0.5 });
    }
    const nCap = c.count(12);
    for (let i = 0; i < nCap; i++) {
      const a = (i / nCap) * TAU + R(-0.2, 0.2), d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      c.puff({ p: [d.x * 0.3, 2.0, d.z * 0.3], v: [d.x * R(2.2, 3.2), R(0.3, 0.8), d.z * R(2.2, 3.2)], drag: 3,
        birth: R(0.14, 0.28), life: R(2.5, 3.1), s0: 0.08, peak: R(0.42, 0.62), end: 0.18, grow: 0.25, over: 0.9,
        buoy: 0.2, squash: 0.72, inF: 0.12, outF: 0.5 });
    }
    for (let i = 0; i < c.count(4); i++) {
      c.puff({ p: [R(-0.2, 0.2), 2.1, R(-0.2, 0.2)], v: [R(-0.3, 0.3), R(1.2, 1.7), R(-0.3, 0.3)], drag: 2.5,
        birth: R(0.12, 0.2), life: R(2.6, 3.1), s0: 0.1, peak: R(0.55, 0.72), end: 0.2, grow: 0.28, over: 0.7,
        buoy: 0.2, squash: 0.85, inF: 0.12, outF: 0.5 });
    }
    const nSkirt = c.count(26);
    for (let i = 0; i < nSkirt; i++) {
      const a = R(0, TAU), d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), r = R(0.2, 0.5);
      c.puff({ p: [d.x * r, 0.1, d.z * r], v: [d.x * R(4.5, 9), R(0, 0.4), d.z * R(4.5, 9)], drag: 3.2,
        birth: R(0.02, 0.14), life: R(2.3, 3.4), s0: 0.06, peak: R(0.3, 0.62), end: 0.12, grow: 0.22, over: 0.8,
        buoy: 0.03, squash: 0.55, sway: 0.04, inF: 0.1, outF: 0.55, diss: 1.15 });
    }
    for (let i = 0; i < 2; i++) {
      c.ribbon({ r0: 1.0, r1: 1.0, h0: 1.45 - i * 0.35, h1: 1.45 - i * 0.35, a0: R(0, TAU), turns: R(0.7, 0.85), spin: i ? 1.2 : -1.2, expand: 1.1,
        width: 0.075, birth: 0.18 + i * 0.07, draw: 0.38, lag: 0.55, col: c.colA });
    }
    for (let i = 0; i < 6; i++) {
      c.ribbon({ r0: R(0.7, 1.0), r1: R(1.8, 2.6), h0: 0.05, h1: R(0.3, 0.6), a0: R(0, TAU), turns: R(0.08, 0.16) * (Math.random() < 0.5 ? -1 : 1), spin: 0, expand: 0.6,
        width: 0.05, birth: R(0.05, 0.2), draw: 0.25, lag: 0.3, col: c.colB });
    }
    c.light({ birth: 0, life: 0.6, power: 0.45, color: c.flashCol, y: 1.0 });
    return [['Удар', 0, 0.1], ['Волна', 0.05, 0.75], ['Гриб', 0.1, 1.2], ['Оседание', 1.2, 3.4]];
  },

  whirl(c) {
    // две спиральные «руки» из пузырей: каждая волна рождается снизу вверх и крутится вокруг оси
    const waves = 4, arms = 2, per = c.count(10), span = 1.8;
    for (let w = 0; w < waves; w++) for (let j = 0; j < arms; j++) for (let i = 0; i < per; i++) {
      const u = i / per, h = 0.15 + u * 2.5, r = 0.3 + h * 0.3, a = j * Math.PI + u * 1.6 * TAU + w * 0.9;
      c.puff({ p: [Math.cos(a) * r, h, Math.sin(a) * r], v: [Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1], drag: 0.4,
        birth: w * (span / waves) + u * 0.35 + R(0, 0.05), life: R(0.9, 1.2), s0: 0.05, peak: R(0.2, 0.3) * (0.75 + h * 0.15), end: 0.08,
        grow: 0.25, over: 0.4, squash: 0.85, spin: 4.2, inF: 0.25, outF: 0.55, diss: 0.9 });
    }
    for (let i = 0; i < c.count(10); i++) {
      const a = R(0, TAU);
      c.puff({ p: [Math.cos(a) * 0.9, 0.08, Math.sin(a) * 0.9], v: [Math.cos(a) * 0.6, 0.05, Math.sin(a) * 0.6], drag: 1,
        birth: R(0, span), life: R(1.0, 1.5), s0: 0.05, peak: R(0.2, 0.3), end: 0.05, grow: 0.3, over: 0.3,
        squash: 0.5, spin: 3, inF: 0.25, outF: 0.55 });
    }
    for (let i = 0; i < c.count(7); i++) {
      c.ribbon({ r0: 0.3, r1: R(0.95, 1.2), h0: 0.1, h1: R(2.3, 2.8), a0: R(0, TAU), turns: R(1.5, 2.1), spin: 4, expand: 0.1,
        width: R(0.045, 0.075), birth: R(0, span + 0.2), draw: 0.5, lag: 0.45, col: c.colA });
    }
    return [['Раскрутка', 0, 0.6], ['Вихрь', 0.6, 2.0], ['Затухание', 2.0, 3.3]];
  },

  dash(c) {
    const n = c.count(14);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      c.puff({ p: [-u * 2.4, R(0.15, 0.4), R(-0.25, 0.25)], v: [-R(0.5, 1.3), R(0.2, 0.5), R(-0.4, 0.4)], drag: 2,
        birth: (1 - u) * 0.18, life: R(0.9, 1.4), s0: 0.05, peak: R(0.24, 0.42) * (1 - u * 0.4), end: R(0.3, 0.45),
        grow: 0.18, over: 0.5, buoy: 0.2, squash: 0.7, sway: 0.05, inF: 0.12, outF: 0.6 });
    }
    for (let i = 0; i < 3; i++) {
      c.puff({ p: [0.2, 0.08, R(-0.3, 0.3)], v: [R(1.5, 2.5), R(0.4, 0.9), R(-0.6, 0.6)], drag: 3,
        birth: 0.16, life: R(0.8, 1.1), s0: 0.05, peak: R(0.25, 0.35), end: 0.2, grow: 0.12, over: 1, squash: 0.6, outF: 0.6 });
    }
    for (let i = 0; i < c.count(6); i++) {
      c.ribbon({ center: [R(0, 0.4), 0, R(-0.35, 0.35)], r0: 0.1, r1: R(2.0, 3.0), h0: R(0.15, 1.3), h1: 0, a0: c.yawBack + R(-0.06, 0.06), turns: 0,
        spin: 0, expand: 0, width: R(0.03, 0.05), birth: R(0, 0.1), draw: 0.14, lag: 0.16, col: c.colA, flat: true });
    }
    return [['Рывок', 0, 0.18], ['Шлейф', 0.1, 0.7], ['Рассеивание', 0.7, 1.4]];
  },
};

// ---------------------------------------------------------------- система

export class SmokeFX {
  constructor({ maxPuffs = 3000, maxSpikes = 256, maxRings = 64, maxRibbons = 256, maxSprites = 512, lights = 3 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'SmokeFX';
    this.time = 0;
    this.uniforms = {
      uTime: { value: 0 }, uLight: { value: new THREE.Vector3(0.3, 1, 0.3).normalize() },
      uShadowCut: { value: 0.5 }, uHighlight: { value: 0.18 }, uGlobalAlpha: { value: 1 },
    };
    this.style = { lightFollow: 0.35, shadowCut: 0.52, highlight: 0.15 };
    const U = this.uniforms;
    const mk = (vs, fs, extra = {}) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, ...extra });

    const sphere = new THREE.SphereGeometry(1, 20, 14);
    this.puffs = new Layer(sphere,
      { iOrigin: 3, iVel: 3, iTime: 4, iSize: 4, iMotion: 4, iExtra: 4, iCenter: 4, iStyle: 4, iColA: 3, iColB: 3, iColC: 3 },
      maxPuffs,
      [ // предпроход глубины: облако становится полупрозрачным одним силуэтом, без просвечивающих внутренних пузырей
        new THREE.ShaderMaterial({ uniforms: U, vertexShader: PUFF_VERT, fragmentShader: PUFF_DEPTH_FRAG, colorWrite: false }),
        mk(PUFF_VERT, PUFF_FRAG, { depthFunc: THREE.LessEqualDepth }),
      ], [0, 10]);

    const cone = new THREE.ConeGeometry(1, 1, 4, 1); cone.translate(0, 0.5, 0);
    this.spikes = new Layer(cone, { iOrigin: 3, iDir: 3, iTime: 4, iShape: 4, iMisc: 4, iColA: 3, iColB: 3 }, maxSpikes,
      [mk(SPIKE_VERT, SPIKE_FRAG)], [11]);

    const quad = new THREE.PlaneGeometry(2, 2); quad.rotateX(-Math.PI / 2);
    this.rings = new Layer(quad, { iCenter: 3, iNormal: 3, iTime: 4, iRad: 4, iMisc: 4, iColA: 3, iColB: 3 }, maxRings,
      [mk(RING_VERT, RING_FRAG, { side: THREE.DoubleSide })], [5]);

    this.ribbons = new Layer(makeStrip(40), { iCenter: 3, iAxis: 3, iTime: 4, iCurve: 4, iCurve2: 4, iStyle: 4, iCol: 3 }, maxRibbons,
      [mk(RIBBON_VERT, RIBBON_FRAG, { side: THREE.DoubleSide })], [12]);

    this.sprites = new Layer(new THREE.PlaneGeometry(2, 2), { iPos: 3, iVel: 3, iTime: 4, iSize: 4, iMisc: 4, iColA: 3, iColB: 3 }, maxSprites,
      [mk(SPRITE_VERT, SPRITE_FRAG)], [13]);

    this.layers = [this.puffs, this.spikes, this.rings, this.ribbons, this.sprites];
    for (const l of this.layers) for (const m of l.meshes) this.group.add(m);

    this.lightEvents = [];
    this.lights = [];
    for (let i = 0; i < lights; i++) {
      const L = new THREE.PointLight(0xffffff, 0, 8, 2); this.lights.push(L); this.group.add(L);
    }
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
  }

  get stats() {
    return { puffs: this.puffs.live, spikes: this.spikes.live, rings: this.rings.live, ribbons: this.ribbons.live, sprites: this.sprites.live };
  }

  setTime(t) { this.time = t; }
  clear() { for (const l of this.layers) l.clear(); this.lightEvents.length = 0; }

  // Запуск эффекта. recipe: ключ RECIPES; origin: Vector3 в мире; params: см. PRESETS[...].params.
  // opts.yaw: поворот направленных эффектов (рывок) вокруг вертикали, радианы.
  spawn(recipe, origin, params = {}, opts = {}) {
    const p = { ...BASE, color: '#ffffff', shadow: null, accent: '#ffffff', cFlash: '#ffffff', ...params };
    const fn = RECIPES[recipe];
    if (!fn) throw new Error('SmokeFX: нет рецепта ' + recipe);
    const ctx = new Ctx(this, origin.clone(), p, opts.yaw || 0);
    const phases = fn(ctx).map(([name, a, b]) => ({ name, t0: a * p.duration, t1: b * p.duration }));
    const t0 = this.time;
    return { t0, phases, length: Math.max(...phases.map(f => f.t1)), recipe };
  }

  update(dt, camera) {
    this.time += dt;
    const U = this.uniforms;
    U.uTime.value = this.time;
    U.uShadowCut.value = this.style.shadowCut; U.uHighlight.value = this.style.highlight;
    if (camera) {
      // свет: смесь «солнца» в мире и света от камеры, чтобы освещённая сторона читалась с любого ракурса
      const fwd = camera.getWorldDirection(this._v);
      const right = this._w.crossVectors(fwd, camera.up).normalize();
      const camL = new THREE.Vector3(0, 0.9, 0).addScaledVector(right, -0.3).addScaledVector(fwd, -0.6).normalize();
      const sunL = new THREE.Vector3(0.35, 1, 0.25).normalize();
      U.uLight.value.copy(sunL).lerp(camL, this.style.lightFollow).normalize();
    }
    for (const l of this.layers) l.flush(this.time);
    this._updateLights();
  }

  _updateLights() {
    const t = this.time;
    this.lightEvents = this.lightEvents.filter(e => e.birth + e.life > t - 30);
    const active = [];
    for (const e of this.lightEvents) {
      const k = (t - e.birth) / e.life;
      if (k < 0 || k > 1) continue;
      const env = Math.min(1, k / 0.06) * Math.pow(1 - k, 2);
      active.push({ e, v: env * e.power });
    }
    active.sort((a, b) => b.v - a.v);
    this.lights.forEach((L, i) => {
      const a = active[i];
      if (!a) { L.intensity = 0; return; }
      L.position.copy(a.e.pos); L.color.copy(a.e.color); L.distance = a.e.radius; L.intensity = a.v;
    });
  }
}

function makeStrip(seg) {
  const g = new THREE.BufferGeometry();
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) { const u = i / seg; pos.push(u, -1, 0, u, 1, 0); }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

// Контекст запуска: переводит описание частиц рецепта (метры при scale = 1, секунды при duration = 1)
// в мировые атрибуты с учётом масштаба, длительности, интенсивности и резкости.
class Ctx {
  constructor(fx, origin, p, yaw) {
    this.fx = fx; this.o = origin; this.p = p; this.yaw = yaw;
    this.yawBack = Math.atan2(-Math.cos(yaw), Math.sin(yaw)); // направление «назад» для ribbon (угол 0 = +Z)
    this.S = p.scale; this.D = p.duration; this.T = fx.time;
    this.colA = new THREE.Color(p.color);
    this.colB = new THREE.Color(p.shadow || deriveShadow(p.color));
    this.accentCol = new THREE.Color(p.accent);
    this.flashCol = new THREE.Color(p.cFlash);
    this.white = new THREE.Color(1, 1, 1);
    this.growMul = Math.pow(2, (0.5 - p.snap) * 2.2);
    this.overAdd = (p.snap - 0.5) * 1.4;
    this.speedMul = 0.85 + 0.15 * p.intensity;
    this._q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  }
  count(n) { return Math.max(1, Math.round(n * this.p.intensity)); }
  vec(a) { return (a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2])).applyQuaternion(this._q); }
  pos(a) { return this.vec(a).multiplyScalar(this.S).add(this.o); }

  puff(o) {
    const { S, D, p } = this, L = this.fx.puffs;
    const birth = this.T + (o.birth || 0) * D, life = o.life * D;
    const grow = Math.min(((o.grow ?? 0.15) * this.growMul) / o.life, 0.9);
    const i = L.alloc(this.T);
    const ov = Math.max(0, (o.over ?? 1) + this.overAdd);
    L.write(i, birth, birth + life, {
      iOrigin: this.pos(o.p), iVel: this.vec(o.v || [0, 0, 0]).multiplyScalar(S * this.speedMul / D),
      iTime: [birth, life, o.inF ?? 0.15, o.outF ?? 0.45],
      iSize: [(o.s0 ?? 0.05) * S, o.peak * S, (o.end ?? 0.1) * S, grow],
      iMotion: [(o.drag ?? 3) / D, (o.buoy ?? 0) * S / (D * D), o.squash ?? 1, Math.random()],
      iExtra: [ov, o.core ?? 0, (o.diss ?? 1) * p.dissolve, (o.sway ?? 0) * S / D],
      iCenter: [this.o.x, this.o.y, this.o.z, (o.spin ?? 0) / D],
      iStyle: [(o.alpha ?? 1) * p.opacity, p.edgeAlpha, p.wobble, p.stepFps],
      iColA: o.colA || this.colA, iColB: o.colB || this.colB, iColC: o.colC || this.accentCol,
    });
  }
  spike(o) {
    const { S, D, p } = this, L = this.fx.spikes;
    const birth = this.T + o.birth * D, life = o.life * D;
    const i = L.alloc(this.T);
    L.write(i, birth, birth + life, {
      iOrigin: this.o, iDir: this.vec(o.dir), iTime: [birth, life, o.outF, o.hold],
      iShape: [o.len * S, o.width * S, o.offset * S, p.stepFps], iMisc: [p.opacity, p.edgeAlpha, p.flash > 0 ? 0.8 : 0, 0],
      iColA: p.flash > 0 ? this.flashCol : this.colB, iColB: p.flash > 0 ? this.flashCol : this.flashCol,
    });
  }
  ring(o) {
    const { S, D, p } = this, L = this.fx.rings;
    const birth = this.T + o.birth * D, life = o.life * D;
    const i = L.alloc(this.T);
    L.write(i, birth, birth + life, {
      iCenter: this.pos(o.center), iNormal: [0, 1, 0], iTime: [birth, life, Math.random(), p.stepFps],
      iRad: [o.r0 * S, o.r1 * S, o.w0 * S, o.w1 * S], iMisc: [(o.alpha ?? 1) * p.opacity, p.edgeAlpha, o.breakup ?? 0.3, 0],
      iColA: o.colA, iColB: o.colB,
    });
  }
  ribbon(o) {
    const { S, D, p } = this, L = this.fx.ribbons;
    const birth = this.T + o.birth * D, draw = o.draw * D, lag = o.lag * D, life = draw + lag;
    const i = L.alloc(this.T);
    L.write(i, birth, birth + life, {
      iCenter: this.pos(o.center || [0, 0, 0]), iAxis: [0, 1, 0], iTime: [birth, draw, lag, life],
      iCurve: [o.r0 * S, o.r1 * S, o.h0 * S, o.h1 * S], iCurve2: [o.a0 + (o.flat ? 0 : this.yaw), o.turns, o.spin / D, o.expand / D],
      iStyle: [o.width * S, p.opacity, p.edgeAlpha, p.stepFps], iCol: o.col,
    });
  }
  sprite(o) {
    const { S, D, p } = this, L = this.fx.sprites;
    const birth = this.T + o.birth * D, life = o.life * D;
    const i = L.alloc(this.T);
    L.write(i, birth, birth + life, {
      iPos: this.pos(o.p), iVel: this.vec(o.v || [0, 0, 0]).multiplyScalar(S / D),
      iTime: [birth, life, Math.min((o.grow ?? 0.2) * Math.sqrt(this.growMul), 0.8), (o.pull ?? 0.5) * S],
      iSize: [o.size * S, o.rot ?? 0, (o.rotSpeed ?? 0) / D, o.shape],
      iMisc: [(o.alpha ?? 1) * p.opacity, o.crisp ? 1 : p.edgeAlpha, p.stepFps, Math.max(0, (o.over ?? 1) + this.overAdd)],
      iColA: o.colA, iColB: o.colB,
    });
  }
  light(o) {
    const { S, D, p } = this;
    if (p.light <= 0) return;
    this.fx.lightEvents.push({
      birth: this.T + o.birth * D, life: o.life * D, power: o.power * p.light * p.intensity * 30 * S * S,
      color: o.color.clone(), pos: this.o.clone().add(new THREE.Vector3(0, (o.y ?? 0.4) * S, 0)), radius: 7 * S,
    });
  }
}
