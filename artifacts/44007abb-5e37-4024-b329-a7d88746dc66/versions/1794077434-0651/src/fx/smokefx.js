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
//   sprites  вспышки, блики, искры-штрихи, угольки: billboard (у света нет объёма), с гравитацией и сопротивлением;
//   shards   3D-осколки и камни: летят по баллистике, вращаются, ложатся на землю;
//   shells   сфера импульса: расходящийся контур ударной волны в воздухе.
// Импульс: fx.addEventListener('impulse', e => ...) и SmokeFX.impulseAt(e, point) для толчка предметов,
// fx.forceAt(point) для длительных сил (вихрь).

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
vec3 ballistic(vec3 v0, float d, float g, float t){
  float F = d > 0.001 ? (1.0 - exp(-d * t)) / d : t;
  float G = d > 0.001 ? (t - F) / d : 0.5 * t * t;
  return v0 * F - vec3(0.0, g * G, 0.0);
}
vec3 ballisticVel(vec3 v0, float d, float g, float t){
  float e = exp(-d * t);
  return v0 * e - vec3(0.0, g * (d > 0.001 ? (1.0 - e) / d : t), 0.0);
}
vec3 rotAxis(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
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
attribute vec4 iLook;    // cool (остывание к тени), rim, lobes (дольки), innerGlow
attribute vec4 iFlow;    // churn (перекат поверхности), pulse (набухание долек), -, -
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
varying float vAlpha; varying float vDiss; varying float vCore; varying float vFade;
varying float vCool; varying float vRim; varying float vOcc; varying vec3 vCenter; varying float vGlow; varying float vLift;
varying vec3 vA; varying vec3 vB; varying vec3 vC;
${GLSL_COMMON}
// Пузырь из долек: 7 сферических «шапок» разного размера, радиус = max по долькам.
// Между дольками остаются складки (зубчатый силуэт и щели для затенения).
// Параметры долек считаются один раз на вершину и переиспользуются для трёх точек нормали.
vec3 LD[7]; float LC[7]; float LA[7];
// pulse: дольки набухают и опадают каждая в своём ритме (сильнее, пока в клубке есть энергия)
void lobeSetup(float seed, float t, float pulse){
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec3 h = vec3(hash13(vec3(seed * 17.1, fi, 1.3)), hash13(vec3(seed * 9.7, fi, 4.1)), hash13(vec3(seed * 5.3, fi, 7.9)));
    LD[i] = normalize(h * 2.0 - 1.0 + vec3(0.0, 0.35, 0.0));
    float R = 0.5 + 0.45 * hash13(vec3(seed * 3.1, fi, 9.2));
    LC[i] = cos(R);
    float w = 2.0 + 3.5 * h.x, ph = h.y * 6.2831;
    LA[i] = (0.1 + 0.2 * hash13(vec3(seed * 7.7, fi, 2.6))) * (1.0 + pulse * sin(t * w + ph));
  }
}
// n: направление на сфере (куда ставим вершину), q: то же направление в «прокрученной» системе клубка (где лежат дольки)
vec3 lobePos(vec3 n, vec3 q, float amt, out float occ){
  float f = 0.0, second = 0.0;
  for (int i = 0; i < 7; i++) {
    float t = clamp((dot(q, LD[i]) - LC[i]) / (1.0 - LC[i]), 0.0, 1.0);
    float h = LA[i] * sqrt(t * (2.0 - t));
    if (h > f) { second = f; f = h; } else if (h > second) second = h;
  }
  occ = 1.0 - smoothstep(0.0, 0.07, f - second);   // две дольки почти равны = складка между ними
  return n * (1.0 + amt * (f - 0.14));
}
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
  vec3 n0 = normalize(position);
  // Перекат: поверхность клубка всё время прокручивается, как у настоящего клуба дыма.
  // Ось перпендикулярна направлению от центра эффекта (клубы выворачиваются наружу и вверх),
  // угол растёт с пройденным путём (относительно размера) и с собственным кипением, пока есть энергия.
  vec3 rad = c - iCenter.xyz; float rl = length(rad);
  vec3 rdir = rl > 0.02 ? rad / rl : vec3(0.0, 1.0, 0.0);
  vec3 ax = cross(vec3(0.0, 1.0, 0.0), rdir);
  float al = length(ax);
  float sa = iMotion.w * 6.2831;
  ax = al > 0.15 ? ax / al : normalize(vec3(cos(sa), 0.25, sin(sa)));
  float travel = length(c - iOrigin) / max(s, 0.04);
  float roll = iFlow.x * (travel * 0.45 + t * (0.9 - 0.5 * k) + iMotion.w * 3.0);
  vec3 q0 = rotAxis(n0, ax, -roll);
  float pulse = iFlow.y * (1.0 - smoothstep(0.0, 0.8, k));
  float wob = (vnoise(q0 * 1.7 + iMotion.w * 17.0 + vec3(0.0, t * 0.7, 0.0)) - 0.5) * iStyle.z * 2.0;
  float occ = 0.0, o1, o2;
  vec3 lp = position * (1.0 + wob);
  vec3 Nl = normal;
  if (iLook.z > 0.01) {
    // нормаль долек через конечные разности по сфере
    vec3 t1, t2; basisFrom(n0, t1, t2);
    float e = 0.035;
    lobeSetup(iMotion.w, t, pulse);
    vec3 n1 = normalize(n0 + t1 * e), n2 = normalize(n0 + t2 * e);
    vec3 P0 = lobePos(n0, q0, iLook.z, occ);
    vec3 P1 = lobePos(n1, rotAxis(n1, ax, -roll), iLook.z, o1);
    vec3 P2 = lobePos(n2, rotAxis(n2, ax, -roll), iLook.z, o2);
    Nl = normalize(cross(P1 - P0, P2 - P0)); if (dot(Nl, n0) < 0.0) Nl = -Nl;
    lp = P0 * (1.0 + wob);
  }
  lp.y *= iMotion.z;
  vObj = q0 + iMotion.w * 13.0;   // пятна шума едут вместе с перекатом
  // свет от положения: верхние клубы светлее, нижние в тени; пока есть энергия, клубок ярче
  vLift = clamp((c.y - iCenter.y) / max(s * 3.0, 0.3), -1.0, 1.0) * 0.07 + 0.08 * (1.0 - smoothstep(0.0, 0.4, k)) * iFlow.y;
  vec3 wp = c + lp * s;
  vW = wp;
  vN = normalize(vec3(Nl.x, Nl.y / max(iMotion.z, 0.25), Nl.z));
  vOcc = occ * min(iLook.z * 1.5, 1.0);
  vCenter = iCenter.xyz;
  vGlow = iLook.w * (1.0 - smoothstep(0.05, 0.45, k));
  float aIn = mix(iStyle.y, 1.0, smoothstep(0.0, iTime.z, k));
  float ko = smoothstep(1.0 - iTime.w, 1.0, k);
  float aOut = mix(1.0, iStyle.y, ko) * (1.0 - smoothstep(0.9, 1.0, k));
  vFade = min(aIn, aOut);
  vAlpha = iStyle.x * vFade;
  vDiss = ko * iExtra.z;
  vCore = iExtra.y * (1.0 - smoothstep(0.0, 0.35, k));
  vA = iColA; vB = iColB; vC = iColC;
  vCool = iLook.x * smoothstep(0.15, 1.0, k) * 0.6; vRim = iLook.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const PUFF_FRAG_BODY = /* glsl */`
  if (vAlpha <= 0.003) discard;
  float n = vnoise(vObj * 1.6) * 0.8 + vnoise(vObj * 3.7 + 5.0) * 0.2;
  if (vDiss > 0.0 && n < vDiss * 1.1 - 0.06) discard;
`;

const PUFF_FRAG = /* glsl */`
uniform vec3 uLight; uniform float uShadowCut; uniform float uHighlight; uniform float uGlobalAlpha;
uniform float uRealism; uniform float uAO;
varying vec3 vN; varying vec3 vW; varying vec3 vObj;
varying float vAlpha; varying float vDiss; varying float vCore;
varying vec3 vA; varying vec3 vB; varying vec3 vC;
varying float vCool; varying float vRim; varying float vOcc; varying vec3 vCenter; varying float vGlow; varying float vLift;
${GLSL_COMMON}
void main(){
  ${PUFF_FRAG_BODY}
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float lam = dot(N, uLight);
  float ndl = lam * 0.5 + 0.5 + (vnoise(vObj * 1.2 + 9.0) - 0.5) * 0.18;
  ndl -= vOcc * uAO * 0.35;
  ndl += vLift;                          // складки между дольками уходят в тень
  vec3 A = mix(vA, vB, vCool);                       // клуб остывает к тону тени
  vec3 col = ndl < uShadowCut ? vB : (ndl < uShadowCut + 0.06 ? mix(A, vB, 0.5) : A);   // 3 тона: тень, полутон, свет
  if (ndl > 0.93 && uHighlight > 0.0) col = mix(A, vec3(1.0), uHighlight);
  float facing = dot(N, V);
  if (vRim > 0.0 && facing < 0.3 && ndl > uShadowCut + 0.12) col = mix(col, vec3(1.0), 0.3 * vRim);   // контровой блик по силуэту
  if (vOcc * uAO > 0.55 && ndl < uShadowCut + 0.1) col = vB * 0.82;   // глубокие щели темнее тени
  // реализм: мягкий градиент внутри тона, отражённый свет снизу, небольшой глянцевый блик
  if (uRealism > 0.0) {
    float sh = clamp(lam * 0.5 + 0.5, 0.0, 1.0);
    col *= mix(1.0, 0.8 + 0.4 * sh, uRealism);
    col *= mix(1.0, 1.0 - 0.35 * vOcc, uRealism * uAO);
    col += vB * max(-N.y, 0.0) * 0.35 * uRealism;                    // отражённый от земли свет на нижних дольках
    vec3 H = normalize(uLight + V);
    col += vec3(1.0) * pow(max(dot(N, H), 0.0), 14.0) * 0.16 * uRealism * step(uShadowCut, ndl);   // мягкий матовый блик, не пластик
    col = mix(col, A * 1.08, pow(1.0 - max(facing, 0.0), 3.0) * 0.25 * uRealism);   // воздушная дымка по краю
  }
  // свет ядра изнутри: дольки, смотрящие к центру взрыва, и щели вспыхивают цветом акцента
  vec3 Lc = normalize(vCenter - vW);
  float inner = vGlow * (smoothstep(0.1, 0.6, dot(N, Lc)) * 0.8 + vOcc * 0.9);
  if (inner > 0.66) col = mix(col, vC, 0.9); else if (inner > 0.48) col = mix(col, vC, 0.45);
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
attribute vec4 iPhys;   // drag, gravity, flicker, stretch
attribute vec3 iColA; attribute vec3 iColB;
varying vec2 vUv; varying float vAlpha; varying float vShape; varying vec3 vA; varying vec3 vB; varying float vK;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iMisc.z);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float g = iTime.z;
  float s = k < g ? easeOutBack(k / g, iMisc.w) : 1.0 - pow(smoothstep(g, 1.0, k), 1.3);
  vec3 c = iPos + ballistic(iVel, iPhys.x, iPhys.y, t);
  c += normalize(cameraPosition - c) * iTime.w;
  if (iSize.w > 4.5) s = 0.45 + 0.55 * sqrt(k);   // дымка: расползается всю жизнь
  float sz = iSize.x * max(s, 0.0);
  vAlpha = iMisc.x * mix(iMisc.y, 1.0, smoothstep(0.0, g * 0.8 + 0.001, k));
  if (iSize.w > 4.5) vAlpha = iMisc.x * smoothstep(0.0, 0.25, k) * (1.0 - smoothstep(0.45, 1.0, k));
  if (iPhys.z > 0.0) vAlpha *= mix(1.0, 0.55 + 0.45 * sin(t * 37.0 + iSize.y * 11.0) * sin(t * 13.0 + iSize.y * 3.0), iPhys.z);
  vShape = iSize.w; vA = iColA; vB = iColB; vK = k;
  if (iSize.w > 2.5 && iSize.w < 3.5) {        // искра-штрих: вытянута вдоль экранной скорости
    vec3 v = ballisticVel(iVel, iPhys.x, iPhys.y, t);
    vec4 cv = viewMatrix * vec4(c, 1.0);
    vec2 dv = (viewMatrix * vec4(v, 0.0)).xy; float sp = length(dv);
    vec2 dir = sp > 1e-4 ? dv / sp : vec2(1.0, 0.0);
    float len = sz * (1.0 + iPhys.w * min(sp, 14.0) * 0.12);
    cv.xy += dir * position.x * len + vec2(-dir.y, dir.x) * position.y * sz * 0.2;
    vUv = position.xy;
    gl_Position = projectionMatrix * cv;
    return;
  }
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float r = iSize.y + iSize.z * t; float cs = cos(r), sn = sin(r);
  vUv = vec2(cs * position.x - sn * position.y, sn * position.x + cs * position.y);
  vec3 wp = c + (right * position.x + up * position.y) * sz;
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
  } else if (vShape < 2.5) {     // расходящееся кольцо-ореол
    float r = length(vUv); float hole = mix(0.45, 0.9, vK); float band = mix(0.14, 0.03, vK);
    if (r < hole || r > hole + band) discard;
    outer = r; inner = (r - hole) / (band * 0.45);
  } else if (vShape < 3.5) {     // искра-штрих (ромб вдоль скорости)
    float d = abs(vUv.x) + abs(vUv.y);
    outer = d; inner = d / 0.55;
  } else if (vShape < 4.5) {     // уголёк / пылинка
    float r = length(vUv);
    outer = r; inner = r / 0.62;
  } else {                       // мягкая дымка / свечение: размытое пятно без жёсткой кромки
    float r = length(vUv);
    if (r > 1.0) discard;
    float a = pow(1.0 - r, 1.7) * (0.85 + 0.15 * sin(vUv.x * 5.0 + vUv.y * 3.0 + vK * 4.0));
    gl_FragColor = vec4(mix(vA, vB, smoothstep(0.0, 0.85, r)), vAlpha * a * uGlobalAlpha);
    #include <colorspace_fragment>
    return;
  }
  if (outer > 1.0) discard;
  vec3 col = inner < 1.0 ? vA : vB;
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const SHARD_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iOrigin; attribute vec3 iVel;
attribute vec4 iTime;    // birth, life, inFrac, outFrac
attribute vec4 iPhys;    // drag, gravity, groundY, -
attribute vec4 iSpin;    // axis xyz, angular speed
attribute vec4 iSize;    // size, stretch, seed, stepFps
attribute vec4 iCenter;  // swirl center xyz, angular speed
attribute vec4 iMisc;    // alpha, edgeAlpha, glow, -
attribute vec3 iColA; attribute vec3 iColB;
varying vec3 vN; varying float vAlpha; varying vec3 vA; varying vec3 vB; varying float vGlow;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iSize.w);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float sz = iSize.x * smoothstep(0.0, max(iTime.z, 0.001), k) * (1.0 - smoothstep(1.0 - iTime.w, 1.0, k));
  vec3 c = iOrigin + ballistic(iVel, iPhys.x, iPhys.y, t);
  float floorY = iPhys.z + iSize.x * 0.45;
  float landed = c.y < floorY ? 1.0 : 0.0;
  c.y = max(c.y, floorY);
  if (abs(iCenter.w) > 0.0001) {
    vec2 rel = c.xz - iCenter.xz; float a = iCenter.w * t; float cs = cos(a), sn = sin(a);
    c.xz = iCenter.xz + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);
  }
  vec3 ax = normalize(iSpin.xyz);
  float ang = iSpin.w * t * (1.0 - 0.85 * landed) + iSize.z * 6.28;
  vec3 lp = position * vec3(1.0, iSize.y, 1.0);
  vec3 wp = c + rotAxis(lp, ax, ang) * sz;
  vN = rotAxis(normal, ax, ang);
  vAlpha = iMisc.x * mix(iMisc.y, 1.0, smoothstep(0.0, 0.12, k));
  vA = iColA; vB = iColB; vGlow = iMisc.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SHARD_FRAG = /* glsl */`
uniform vec3 uLight; uniform float uGlobalAlpha;
varying vec3 vN; varying float vAlpha; varying vec3 vA; varying vec3 vB; varying float vGlow;
void main(){
  float l = dot(normalize(vN), uLight);
  vec3 col = l > 0.15 ? vA : vB;
  if (l > 0.7) col = mix(col, vec3(1.0), 0.25 + 0.5 * vGlow);
  gl_FragColor = vec4(col, vAlpha * uGlobalAlpha);
  #include <colorspace_fragment>
}`;

const SHELL_VERT = /* glsl */`
uniform float uTime;
attribute vec3 iCenter;
attribute vec4 iTime;    // birth, life, seed, stepFps
attribute vec4 iRad;     // r0, r1, thickness, squashY
attribute vec4 iMisc;    // alpha, fill, -, -
attribute vec3 iColA; attribute vec3 iColB;
varying vec3 vN; varying vec3 vW; varying float vAlpha; varying float vThick; varying float vFill; varying vec3 vA; varying vec3 vB; varying vec3 vObj;
${GLSL_COMMON}
void main(){
  float t = stepT(uTime - iTime.x, iTime.w);
  if (t < 0.0 || t > iTime.y) HIDE
  float k = t / iTime.y;
  float R = mix(iRad.x, iRad.y, 1.0 - pow(1.0 - k, 3.0));
  vec3 lp = position * R; lp.y *= iRad.w;
  vec3 wp = iCenter + lp;
  vN = normalize(vec3(normal.x, normal.y / iRad.w, normal.z)); vW = wp; vObj = position * 3.0 + iTime.z * 9.0;
  vThick = iRad.z * (1.0 - 0.75 * k);
  vAlpha = iMisc.x * (1.0 - smoothstep(0.35, 1.0, k));
  vFill = iMisc.y; vA = iColA; vB = iColB;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const SHELL_FRAG = /* glsl */`
uniform float uGlobalAlpha;
varying vec3 vN; varying vec3 vW; varying float vAlpha; varying float vThick; varying float vFill; varying vec3 vA; varying vec3 vB; varying vec3 vObj;
${GLSL_COMMON}
void main(){
  float rim = 1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW)));
  float n = vnoise(vObj);
  float th = vThick * (0.6 + 0.8 * n);              // рваный край волны
  vec3 col; float a;
  if (rim > 1.0 - th) { col = rim > 1.0 - th * 0.45 ? vA : vB; a = vAlpha; }
  else if (rim > 1.0 - th * 2.2) { col = vB; a = vAlpha * vFill * 2.0; }
  else { col = vB; a = vAlpha * vFill; }
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a * uGlobalAlpha);
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
  impulse:   { label: 'Сила импульса', min: 0, max: 2.5, step: 0.05, hint: 'ударная сфера, толчок предметов, тряска камеры' },
  debris:    { label: 'Частицы', min: 0, max: 2.5, step: 0.05, hint: 'осколки, искры, кометы со шлейфом' },
  minis:     { label: 'Мини-эффекты', min: 0, max: 2.5, step: 0.05, hint: 'хлопки, колечки, клочки, растворяющиеся в воздухе' },
  embers:    { label: 'Угольки', min: 0, max: 40, step: 1 },
  bubbles:   { label: 'Всплывающие пузыри', min: 0, max: 24, step: 1 },
  cool:      { label: 'Остывание цвета', min: 0, max: 1, step: 0.01, hint: 'светлый тон уходит в тень к концу жизни' },
  rim:       { label: 'Контровой блик', min: 0, max: 1, step: 0.01 },
  haze:      { label: 'Дымка распада', min: 0, max: 2, step: 0.05, hint: 'мягкий газ и размытие там, где тают пузыри' },
  glow:      { label: 'Подсветка', min: 0, max: 2, step: 0.05, hint: 'свечение ядра и рассеянный свет в газе' },
  wind:      { label: 'Порывы ветра', min: 0, max: 2.5, step: 0.05, hint: 'дуги-штрихи и пыль вокруг эффекта' },
  churn:     { label: 'Перекат светотени', min: 0, max: 2.5, step: 0.05, hint: 'свет, полутень и тень катятся по клубку вслед за движением' },
  pulse:     { label: 'Набухание долек', min: 0, max: 0.8, step: 0.01, hint: 'дольки растут и опадают, пока в клубке есть энергия' },
  lobes:     { label: 'Сложность формы', min: 0, max: 1.5, step: 0.01, hint: 'дольки-шарики на каждом пузыре' },
  innerGlow: { label: 'Свет ядра изнутри', min: 0, max: 1.5, step: 0.01, hint: 'дольки к центру и щели светятся акцентом' },
};

export const COLOR_DEFS = {
  color:  'Основной',
  shadow: 'Тень',
  accent: 'Ядро / акцент',
  cFlash: 'Вспышка и шипы',
};

const BASE = { scale: 1, duration: 1, intensity: 1, snap: 0.5, opacity: 1, edgeAlpha: 0.4, dissolve: 1, wobble: 0.05, stepFps: 0, flash: 0, spikes: 0, sparkles: 0, light: 0.6,
  impulse: 0.8, debris: 1, minis: 1, embers: 0, bubbles: 0, cool: 0.3, rim: 0.6, lobes: 0.9, innerGlow: 0.6, haze: 1, glow: 0.8, wind: 1, churn: 1, pulse: 0.3 };

export const PRESETS = {
  blast: {
    name: 'Взрыв', recipe: 'blast', tempo: 'резкий',
    params: { ...BASE, snap: 0.75, sparkles: 2, light: 0.7, impulse: 0.8, color: '#86c8ec', shadow: '#6a8da3', accent: '#e8f0a0', cFlash: '#ffffff' },
  },
  magic: {
    name: 'Взрыв со вспышкой', recipe: 'blast', tempo: 'самый резкий',
    params: { ...BASE, snap: 0.95, flash: 1, spikes: 9, sparkles: 5, light: 1.2, edgeAlpha: 0.5, impulse: 1.1, minis: 1.2, cool: 0.15, glow: 1.2, color: '#4a3fc4', shadow: '#2a2380', accent: '#ff5fd2', cFlash: '#ff4fc8' },
  },
  toxic: {
    name: 'Ядовитый пых', recipe: 'blast', tempo: 'резкий старт, вязкий хвост',
    params: { ...BASE, snap: 0.6, duration: 1.3, spikes: 3, sparkles: 4, light: 0.4, impulse: 0.35, debris: 0.7, minis: 1.3, bubbles: 10, cool: 0.4, haze: 1.4, glow: 0.6, color: '#b4c45a', shadow: '#7d8c3b', accent: '#f6e46a', cFlash: '#9fb04a' },
  },
  fire: {
    name: 'Огненный взрыв', recipe: 'blast', tempo: 'резкий',
    params: { ...BASE, snap: 0.85, flash: 0.7, spikes: 5, sparkles: 2, light: 1.5, impulse: 1.3, debris: 1.2, embers: 18, cool: 0.6, innerGlow: 1.1, glow: 1.3, haze: 1.2, color: '#8a8590', shadow: '#4c4652', accent: '#ffae3a', cFlash: '#ff7a2a' },
  },
  smoke: {
    name: 'Лёгкий дым', recipe: 'smoke', tempo: 'мягкий, медленный',
    params: { ...BASE, snap: 0.15, opacity: 0.92, edgeAlpha: 0.6, light: 0, dissolve: 0.7, impulse: 0, debris: 0.6, cool: 0, rim: 0.4, haze: 1.3, glow: 0, wind: 0.7, wobble: 0.05, color: '#f4f4f2', shadow: '#c9cfd6', accent: '#ffffff', cFlash: '#ffffff' },
  },
  ground: {
    name: 'Стелющийся дым с волной', recipe: 'ground', tempo: 'резкий удар, медленное оседание',
    params: { ...BASE, snap: 0.7, flash: 0.6, light: 1, dissolve: 1.15, impulse: 1.6, debris: 1.2, wind: 1.4, haze: 1.2, color: '#a6e8d2', shadow: '#b2a888', accent: '#f4fff8', cFlash: '#e8fff6' },
  },
  whirl: {
    name: 'Вихрь', recipe: 'whirl', tempo: 'мягкий, непрерывный',
    params: { ...BASE, snap: 0.3, edgeAlpha: 0.3, light: 0, impulse: 1, cool: 0.1, wind: 1.8, glow: 0, color: '#eef3f6', shadow: '#a9b8c4', accent: '#ffffff', cFlash: '#ffffff' },
  },
  dash: {
    name: 'Шлейф рывка', recipe: 'dash', tempo: 'резкий старт, мягкий хвост',
    params: { ...BASE, snap: 0.8, edgeAlpha: 0.35, light: 0, dissolve: 1.1, impulse: 0.5, cool: 0.2, wind: 1.4, glow: 0, color: '#e9e1d2', shadow: '#b39f86', accent: '#ffffff', cFlash: '#ffffff' },
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

    // импульс: сила зависит от пресета (p.impulse), сфера-контур и толчок предметов
    c.impulse({ radius: 4.4, force: 1, y: 0 });
    const glowy = p.flash > 0;
    // подсветка: вспышка света в ядре и тёплое свечение, которое гаснет вместе с ядром
    c.glow({ size: 3.4, life: 0.35, alpha: 0.7, colA: c.white, colB: glowy ? c.flashCol : c.accentCol });
    c.glow({ size: 2.6, birth: 0.05, life: 1.1, alpha: 0.35, colA: c.accentCol, colB: c.colA });
    c.gusts({ count: 4, r0: 1.8, r1: 3.0, b0: 0.08, b1: 0.6 });
    // осколки: у магии вытянутые светящиеся кристаллы, у остальных тёмные комки
    for (let i = 0; i < c.countD(9); i++) {
      const dir = randDir(0.7, 0.35);
      c.shard({ p: dir.clone().multiplyScalar(0.3), v: dir.multiplyScalar(R(5, 9)), drag: 1.1, grav: 9.8, birth: R(0, 0.05), life: R(1.3, 2.0),
        size: R(0.05, 0.1), stretch: glowy ? 2.4 : R(0.9, 1.4), spin: R(6, 14), glow: glowy ? 0.6 : 0,
        colA: glowy ? c.flashCol : c.colB, colB: glowy ? c.colB : c.colB.clone().multiplyScalar(0.5) });
    }
    // искры-штрихи: быстрые, тормозят в воздухе и гаснут
    for (let i = 0; i < c.countD(glowy ? 18 : 9); i++) {
      const dir = randDir(0.8, 0.15);
      c.spark({ p: dir.clone().multiplyScalar(0.25), v: dir.multiplyScalar(R(9, 16)), drag: 4, grav: 4, birth: R(0, 0.06), life: R(0.3, 0.55),
        size: R(0.08, 0.13), stretch: 1.8, colA: c.white, colB: glowy ? c.flashCol : c.accentCol });
    }
    // кометы со шлейфом мелких клубов
    for (let i = 0; i < c.countD(3); i++) {
      c.comet({ dir: randDir(0.5, 0.55), speed: R(6, 8), drag: 1.3, grav: 7, birth: R(0.02, 0.08), life: R(0.55, 0.75),
        size: 0.12, trailSize: R(0.09, 0.12), step: 0.06, trailA: c.colA, trailB: c.colB, headCol: glowy ? c.flashCol : c.accentCol });
    }
    // мини-хлопки по краю облака: появляются поздно и тают
    for (let i = 0; i < c.countM(7); i++) {
      const dir = randDir(0.7, 0.2);
      c.poof({ p: dir.clone().multiplyScalar(R(0.9, 1.35)), v: dir.multiplyScalar(0.4), birth: R(0.35, 1.0), size: R(0.13, 0.22),
        ring: Math.random() < 0.4, star: Math.random() < 0.5, ringCol: glowy ? c.flashCol : c.colA });
    }
    // мерцающие звёздочки, разлетающиеся и тающие
    for (let i = 0; i < c.countM(glowy ? 10 : 4); i++) {
      const dir = randDir(0.8, 0.2);
      c.sprite({ p: dir.clone().multiplyScalar(0.6), v: dir.multiplyScalar(R(1.5, 3)), phys: [2.2, -0.4, 0.6, 0], birth: R(0.1, 0.5), life: R(0.5, 0.9),
        size: R(0.1, 0.18), grow: 0.25, over: 1.2, pull: 0.5, shape: 0, rotSpeed: R(-4, 4), colA: c.white, colB: glowy ? c.flashCol : c.accentCol, crisp: true });
    }
    // угольки (огонь): поднимаются, мерцают
    for (let i = 0; i < Math.round(p.embers * p.intensity); i++) {
      const dir = randDir(0.6, 0.5);
      c.spark({ p: dir.clone().multiplyScalar(R(0.3, 0.8)), v: dir.multiplyScalar(R(1.5, 4)), drag: 1.6, grav: -1.2, birth: R(0.05, 0.7), life: R(1.0, 1.9),
        size: R(0.05, 0.09), shape: 4, flicker: 0.8, colA: c.white, colB: c.accentCol });
    }
    // пузыри газа (яд): всплывают, покачиваются, лопаются колечком
    for (let i = 0; i < Math.round(p.bubbles * p.intensity); i++) {
      const b = R(0.3, 1.2), life = R(0.9, 1.5), pp = [R(-0.8, 0.8), R(-0.3, 0.5), R(-0.8, 0.8)], vv = [R(-0.3, 0.3), R(0.6, 1.1), R(-0.3, 0.3)];
      const pop = c.trail(pp, vv, 0.6, 0, life).sub(c.o).divideScalar(c.S);
      c.puff({ p: pp, v: vv, drag: 0.6, birth: b, life, s0: 0.02, peak: R(0.07, 0.13), end: 0.13,
        grow: 0.2, over: 0.6, sway: 0.25, inF: 0.2, outF: 0.12, diss: 0, colA: c.accentCol, colB: c.colA, rim: 1 });
      c.sprite({ p: pop, size: 0.32, birth: b + life - 0.02, life: 0.25, grow: 0.05, over: 0, pull: 0.1, shape: 2,
        colA: c.white, colB: c.accentCol, crisp: true, alpha: 0.9 });
    }
    // подпалина на земле
    if (c.groundLocal > -3) c.scorch({ radius: 1.5, life: 3.5, alpha: glowy ? 0.4 : 0.5 });
    return [['Вспышка', 0, 0.08], ['Разлёт', 0.02, 0.25], ['Клубы', 0.25, 0.8], ['Рассеивание', 0.8, 2.1]];
  },

  smoke(c) {
    const n = c.count(22), span = 2.2;
    for (let i = 0; i < n; i++) {
      c.puff({ p: [R(-0.15, 0.15), R(0, 0.1), R(-0.15, 0.15)], v: [R(-0.25, 0.25), R(1.0, 1.4), R(-0.25, 0.25)], drag: 0.35,
        birth: (i / n) * span + R(0, 0.08), life: R(2.2, 3.0), s0: 0.08, peak: R(0.35, 0.5), end: R(0.6, 0.8),
        grow: 0.8, over: 0, buoy: 0.15, sway: 0.22, squash: 0.95, inF: 0.25, outF: 0.45 });
    }
    for (let i = 0; i < 2; i++) {
      c.ribbon({ r0: 0.08, r1: R(0.3, 0.45), h0: 0.3, h1: R(2.2, 2.7), a0: R(0, TAU), turns: R(1.1, 1.5) * (i ? 1 : -1), spin: 0.6, expand: 0.15,
        width: 0.055, birth: 0.4 + i * 0.9, draw: 1.3, lag: 0.8, col: c.colA });
    }
    // клочки, отрывающиеся от столба и тающие в стороне
    for (let i = 0; i < c.countM(7); i++) {
      const side = randDir(0.2, 0);
      c.puff({ p: [side.x * 0.3, R(1.2, 2.4), side.z * 0.3], v: [side.x * R(0.4, 0.8), R(0.2, 0.5), side.z * R(0.4, 0.8)], drag: 0.6,
        birth: R(0.9, 3.0), life: R(1.0, 1.6), s0: 0.04, peak: R(0.12, 0.2), end: 0.08, grow: 0.4, over: 0, sway: 0.3, inF: 0.3, outF: 0.7, diss: 1.0 });
    }
    // пылинки, медленно всплывающие
    for (let i = 0; i < c.countD(8); i++) {
      c.spark({ p: [R(-0.4, 0.4), R(0.2, 1.0), R(-0.4, 0.4)], v: [R(-0.3, 0.3), R(0.3, 0.7), R(-0.3, 0.3)], drag: 0.5, grav: -0.1,
        birth: R(0.2, 2.5), life: R(1.5, 2.4), size: R(0.03, 0.05), shape: 4, flicker: 0.3, colA: c.white, colB: c.colA });
    }
    c.gusts({ count: 3, r0: 1.0, r1: 2.0, b0: 0.5, b1: 3.0 });
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

    // самый сильный импульс: сплюснутая волна по земле
    c.impulse({ radius: 4.6, force: 1, y: 0.2, squash: 0.45, col: c.colA });
    c.glow({ p: [0, 0.5, 0], size: 4, life: 0.5, alpha: 0.55, colA: c.white, colB: c.flashCol });
    c.glow({ p: [0, 2.1, 0], birth: 0.15, size: 3, life: 1.2, alpha: 0.25, colA: c.accentCol, colB: c.colA });
    c.gusts({ count: 6, r0: 2.4, r1: 4.2, b0: 0.1, b1: 1.2 });
    // камни, выбитые из земли: дуга, падение, остаются лежать и исчезают
    for (let i = 0; i < c.countD(16); i++) {
      const a = R(0, TAU), d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      c.shard({ p: [d.x * 0.4, 0.15, d.z * 0.4], v: [d.x * R(3, 7), R(3, 7), d.z * R(3, 7)], drag: 0.5, grav: 9.8, birth: R(0, 0.08), life: R(1.8, 2.8),
        size: R(0.06, 0.15), stretch: R(0.7, 1.2), spin: R(5, 12), colA: c.colB, colB: c.colB.clone().multiplyScalar(0.5), outF: 0.2 });
    }
    // кометы из шляпки
    for (let i = 0; i < c.countD(4); i++) {
      c.comet({ dir: randDir(0.4, 0.35), speed: R(5, 7), drag: 0.9, grav: 6, birth: R(0.18, 0.3), life: R(0.7, 0.9), size: 0.12,
        trailSize: R(0.1, 0.13), trailA: c.colA, trailB: c.colB, headCol: c.accentCol, step: 0.06 });
    }
    // хлопки пыли там, где падают камни
    for (let i = 0; i < c.countM(10); i++) {
      const a = R(0, TAU), r = R(1.8, 3.6);
      c.poof({ p: [Math.cos(a) * r, 0.12, Math.sin(a) * r], v: [Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3], birth: R(0.45, 1.1), size: R(0.15, 0.25), ring: Math.random() < 0.3 });
    }
    // пылинки, висящие в воздухе при оседании
    for (let i = 0; i < c.countM(18); i++) {
      const a = R(0, TAU), r = R(0.5, 3.5);
      c.spark({ p: [Math.cos(a) * r, R(0.1, 1.8), Math.sin(a) * r], v: [R(-0.3, 0.3), R(0.1, 0.4), R(-0.3, 0.3)], drag: 0.8, grav: -0.05,
        birth: R(0.5, 1.6), life: R(1.4, 2.4), size: R(0.03, 0.06), shape: 4, flicker: 0.4, colA: c.white, colB: c.colA });
    }
    c.scorch({ radius: 2.3, life: 4, alpha: 0.4 });
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
    // импульс-воронка: тянет предметы по кругу и вверх всё время вращения
    c.impulse({ radius: 4.4, force: 1, kind: 'vortex', dur: 2.3 });
    c.gusts({ count: 6, r0: 1.4, r1: 2.6, b0: 0, b1: 2.0 });
    // листья и мусор, кружащие в воронке
    for (let i = 0; i < c.countD(16); i++) {
      const a = R(0, TAU), r = R(0.5, 1.3);
      c.shard({ p: [Math.cos(a) * r, R(0.1, 0.6), Math.sin(a) * r], v: [0, R(0.8, 1.6), 0], drag: 0.3, grav: 0, birth: R(0, 1.6), life: R(1.2, 1.8),
        size: R(0.05, 0.09), stretch: 0.35, spin: R(8, 16), orbit: R(4, 5.5), colA: c.colA, colB: c.colB, inF: 0.15, outF: 0.35 });
    }
    // клочки, срывающиеся с верхушки по касательной
    for (let i = 0; i < c.countM(10); i++) {
      const a = R(0, TAU), r = 1.1;
      c.puff({ p: [Math.cos(a) * r, R(2.2, 2.7), Math.sin(a) * r], v: [-Math.sin(a) * 2.2 + Math.cos(a) * 0.6, 0.4, Math.cos(a) * 2.2 + Math.sin(a) * 0.6], drag: 1.2,
        birth: R(0.4, 2.0), life: R(0.7, 1.0), s0: 0.03, peak: R(0.12, 0.2), end: 0.06, grow: 0.15, over: 0.6, inF: 0.2, outF: 0.7, diss: 1.3 });
    }
    return [['Раскрутка', 0, 0.6], ['Вихрь', 0.6, 2.0], ['Затухание', 2.0, 3.3]];
  },

  // фоновый порыв ветра (для сцены): длинные пологие дуги вдоль направления yaw, пыль, сорванные клочки
  gust(c) {
    const col = c.colA.clone().lerp(c.white, 0.4);
    for (let i = 0; i < c.count(4); i++) {
      const Rr = R(5, 9), z = R(-1.5, 1.5), h = R(0.2, 2.4), b = R(0, 0.5);
      c.ribbon({ center: [R(-1, 1), 0, z + Rr], r0: Rr, r1: Rr * R(0.92, 0.98), h0: h, h1: h + R(-0.2, 0.5), a0: Math.PI, turns: -R(0.06, 0.1), spin: -R(0.25, 0.4), expand: 0,
        width: R(0.02, 0.035), birth: b, draw: R(0.5, 0.8), lag: R(0.4, 0.6), col, alpha: 0.55 });
      if (Math.random() < 0.6) c.ribbon({ center: [R(1, 2.5), 0, z + 0.35], r0: 0.35, r1: 0.12, h0: h, h1: h + 0.1, a0: Math.PI, turns: -R(0.8, 1.1), spin: 0, expand: 0,
        width: 0.025, birth: b + 0.45, draw: 0.3, lag: 0.3, col, alpha: 0.5 });   // завиток на конце порыва
    }
    for (let i = 0; i < c.count(10); i++) {
      c.spark({ p: [R(-2.5, 0), R(0.1, 2), R(-1.5, 1.5)], v: [R(3.5, 6), R(-0.2, 0.4), R(-0.4, 0.4)], drag: 0.6, grav: 0.2, birth: R(0, 0.8), life: R(0.6, 1.1),
        size: R(0.025, 0.045), stretch: 1.5, colA: c.white, colB: col, alpha: 0.7 });
    }
    for (let i = 0; i < c.count(2); i++) {
      c.puff({ p: [R(-2, 0), R(0.1, 0.4), R(-1, 1)], v: [R(2, 3.5), 0.3, 0], drag: 1.2, birth: R(0.1, 0.6), life: R(0.7, 1), s0: 0.03, peak: R(0.1, 0.16), end: 0.05,
        grow: 0.2, over: 0.4, squash: 0.6, inF: 0.2, outF: 0.7, diss: 1.3, lobes: 0.6 });
    }
    return [['Порыв', 0, 0.4], ['Пронос', 0.4, 1.2], ['Затухание', 1.2, 1.6]];
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
    // направленный импульс вперёд по ходу рывка
    c.impulse({ radius: 3.2, force: 1, kind: 'directional', dir: [1, 0.2, 0], y: 0.4 });
    c.gusts({ count: 3, r0: 1.2, r1: 2.2, b0: 0.05, b1: 0.4 });
    // камешки и искры из-под ног, летят назад
    for (let i = 0; i < c.countD(7); i++) {
      c.shard({ p: [R(-0.2, 0.2), 0.1, R(-0.25, 0.25)], v: [-R(2, 4.5), R(1.5, 3), R(-1.2, 1.2)], drag: 0.8, grav: 9.8, birth: R(0, 0.15), life: R(0.9, 1.3),
        size: R(0.04, 0.08), spin: R(8, 14), colA: c.colB, colB: c.colB.clone().multiplyScalar(0.5) });
    }
    for (let i = 0; i < c.countD(8); i++) {
      c.spark({ p: [R(-0.1, 0.3), 0.08, R(-0.25, 0.25)], v: [-R(5, 9), R(0.5, 2), R(-1.5, 1.5)], drag: 4, grav: 5, birth: R(0, 0.12), life: R(0.25, 0.4),
        size: R(0.06, 0.09), stretch: 1.6, colA: c.white, colB: c.accentCol });
    }
    // мелкие хлопки вдоль следа
    for (let i = 0; i < c.countM(6); i++) {
      c.poof({ p: [-R(0.3, 2.2), R(0.1, 0.4), R(-0.4, 0.4)], v: [-0.5, 0.4, 0], birth: R(0.15, 0.5), size: R(0.12, 0.2) });
    }
    return [['Рывок', 0, 0.18], ['Шлейф', 0.1, 0.7], ['Рассеивание', 0.7, 1.4]];
  },
};

// ---------------------------------------------------------------- система

export class SmokeFX extends THREE.EventDispatcher {
  constructor({ maxPuffs = 4000, maxSpikes = 256, maxRings = 96, maxRibbons = 256, maxSprites = 2048, maxShards = 768, maxShells = 64, maxGlows = 512, maxHazes = 1536, lights = 3 } = {}) {
    super();
    this.group = new THREE.Group();
    this.group.name = 'SmokeFX';
    this.time = 0;
    this.uniforms = {
      uTime: { value: 0 }, uLight: { value: new THREE.Vector3(0.3, 1, 0.3).normalize() },
      uShadowCut: { value: 0.5 }, uHighlight: { value: 0.18 }, uGlobalAlpha: { value: 1 },
      uRealism: { value: 0.25 }, uAO: { value: 0.8 },
    };
    // realism: 0 чистый toon, 0.25 по умолчанию (мягкий градиент, блик, отражённый свет), 1 почти объёмный рендер
    this.style = { lightFollow: 0.35, shadowCut: 0.52, highlight: 0.15, realism: 0.25, ao: 0.8 };
    const U = this.uniforms;
    const mk = (vs, fs, extra = {}) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, ...extra });

    const sphere = new THREE.SphereGeometry(1, 32, 20); sphere.deleteAttribute('uv');
    this.puffs = new Layer(sphere,
      { iOrigin: 3, iVel: 3, iTime: 4, iSize: 4, iMotion: 4, iExtra: 4, iCenter: 4, iStyle: 4, iColA: 3, iColB: 3, iColC: 3, iLook: 4, iFlow: 4 },
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

    this.sprites = new Layer(new THREE.PlaneGeometry(2, 2), { iPos: 3, iVel: 3, iTime: 4, iSize: 4, iMisc: 4, iPhys: 4, iColA: 3, iColB: 3 }, maxSprites,
      [mk(SPRITE_VERT, SPRITE_FRAG)], [13]);

    const gem = new THREE.OctahedronGeometry(1, 0);   // неиндексированная: плоские грани для двух тонов
    this.shards = new Layer(gem, { iOrigin: 3, iVel: 3, iTime: 4, iPhys: 4, iSpin: 4, iSize: 4, iCenter: 4, iMisc: 4, iColA: 3, iColB: 3 }, maxShards,
      [mk(SHARD_VERT, SHARD_FRAG, { depthWrite: true })], [9]);

    this.shells = new Layer(new THREE.SphereGeometry(1, 32, 20), { iCenter: 3, iTime: 4, iRad: 4, iMisc: 4, iColA: 3, iColB: 3 }, maxShells,
      [mk(SHELL_VERT, SHELL_FRAG)], [14]);

    // подсветка: те же спрайты, но аддитивно (свет складывается, а не перекрывает)
    this.glows = new Layer(new THREE.PlaneGeometry(2, 2), { iPos: 3, iVel: 3, iTime: 4, iSize: 4, iMisc: 4, iPhys: 4, iColA: 3, iColB: 3 }, maxGlows,
      [mk(SPRITE_VERT, SPRITE_FRAG, { blending: THREE.AdditiveBlending })], [15]);
    // дымка распада: мягкие пятна газа в обычном смешивании, рисуются после пузырей
    this.hazes = new Layer(new THREE.PlaneGeometry(2, 2), { iPos: 3, iVel: 3, iTime: 4, iSize: 4, iMisc: 4, iPhys: 4, iColA: 3, iColB: 3 }, maxHazes,
      [mk(SPRITE_VERT, SPRITE_FRAG)], [12]);

    this.layers = [this.puffs, this.spikes, this.rings, this.ribbons, this.sprites, this.shards, this.shells, this.glows, this.hazes];
    this.impulses = [];
    for (const l of this.layers) for (const m of l.meshes) this.group.add(m);

    this.lightEvents = [];
    this.lights = [];
    for (let i = 0; i < lights; i++) {
      const L = new THREE.PointLight(0xffffff, 0, 8, 2); this.lights.push(L); this.group.add(L);
    }
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
  }

  get stats() {
    return { puffs: this.puffs.live, spikes: this.spikes.live, rings: this.rings.live, ribbons: this.ribbons.live, sprites: this.sprites.live, shards: this.shards.live, shells: this.shells.live, glows: this.glows.live, hazes: this.hazes.live };
  }

  setTime(t) { this.time = t; }
  clear() { for (const l of this.layers) l.clear(); this.lightEvents.length = 0; this.impulses.length = 0; }

  // Толчок от импульса в точке: вектор скорости (м/с), который стоит добавить предмету. 0, если точка вне радиуса.
  static impulseAt(e, point, out = new THREE.Vector3()) {
    out.subVectors(point, e.position);
    const d = out.length();
    if (d > e.radius || e.kind === 'vortex') return out.set(0, 0, 0);
    const fall = Math.pow(1 - d / e.radius, 1.5);
    if (d < 1e-4) out.set(0, 1, 0); else out.multiplyScalar(1 / d);
    out.y = Math.max(out.y, 0) + 0.55;
    if (e.kind === 'directional') out.lerp(e.direction, 0.75);
    return out.normalize().multiplyScalar(e.force * 9 * fall);
  }

  // Длительные силы (вихрь) в точке на текущее время: ускорение м/с².
  forceAt(point, out = new THREE.Vector3()) {
    out.set(0, 0, 0);
    for (const e of this.impulses) {
      if (e.kind !== 'vortex') continue;
      const u = (this.time - e.time) / e.duration;
      if (u < 0 || u > 1) continue;
      const dx = point.x - e.position.x, dz = point.z - e.position.z, d = Math.hypot(dx, dz);
      if (d > e.radius || d < 1e-3) continue;
      const f = e.force * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - d / e.radius);
      out.x += (-dz / d * 14 - dx / d * 5) * f;
      out.z += (dx / d * 14 - dz / d * 5) * f;
      out.y += 18 * f * (point.y < e.position.y + 2.8 ? 1 : 0);
    }
    return out;
  }

  // Запуск эффекта. recipe: ключ RECIPES; origin: Vector3 в мире; params: см. PRESETS[...].params.
  // opts.yaw: поворот направленных эффектов (рывок) вокруг вертикали, радианы.
  spawn(recipe, origin, params = {}, opts = {}) {
    const p = { ...BASE, color: '#ffffff', shadow: null, accent: '#ffffff', cFlash: '#ffffff', ...params };
    const fn = RECIPES[recipe];
    if (!fn) throw new Error('SmokeFX: нет рецепта ' + recipe);
    const ctx = new Ctx(this, origin.clone(), p, opts.yaw || 0, opts.groundY ?? 0);
    const phases = fn(ctx).map(([name, a, b]) => ({ name, t0: a * p.duration, t1: b * p.duration }));
    const t0 = this.time;
    return { t0, phases, length: Math.max(...phases.map(f => f.t1)), recipe };
  }

  update(dt, camera) {
    this.time += dt;
    const U = this.uniforms;
    U.uTime.value = this.time;
    U.uShadowCut.value = this.style.shadowCut; U.uHighlight.value = this.style.highlight;
    U.uRealism.value = this.style.realism; U.uAO.value = this.style.ao;
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
    // события импульса: срабатывают, когда время доходит до момента удара (и снова после перемотки назад)
    this.impulses = this.impulses.filter(e => e.time + e.duration > this.time - 30);
    for (const e of this.impulses) {
      if (e.time > this.time) e.fired = false;
      else if (!e.fired && this.time - e.time < 0.5) { e.fired = true; this.dispatchEvent({ type: 'impulse', impulse: e }); }
    }
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
  constructor(fx, origin, p, yaw, groundY) {
    this.fx = fx; this.o = origin; this.p = p; this.yaw = yaw; this.groundY = groundY;
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
  countD(n) { return Math.round(n * this.p.intensity * this.p.debris); }   // частицы
  countM(n) { return Math.round(n * this.p.intensity * this.p.minis); }    // мини-эффекты
  // высота земли относительно точки эффекта, в единицах рецепта (scale = 1)
  get groundLocal() { return (this.groundY - this.o.y) / this.S; }
  vec(a) { return (a.isVector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2])).applyQuaternion(this._q); }
  pos(a) { return this.vec(a).multiplyScalar(this.S).add(this.o); }

  puff(o) {
    const { S, D, p } = this, L = this.fx.puffs;
    const birth = this.T + (o.birth || 0) * D, life = o.life * D;
    const grow = Math.min(((o.grow ?? 0.15) * this.growMul) / o.life, 0.9);
    const i = L.alloc(this.T);
    const ov = Math.max(0, (o.over ?? 1) + this.overAdd);
    L.write(i, birth, birth + life, {
      iOrigin: o.world ? o.p : this.pos(o.p), iVel: this.vec(o.v || [0, 0, 0]).multiplyScalar(S * this.speedMul / D),
      iTime: [birth, life, o.inF ?? 0.15, o.outF ?? 0.45],
      iSize: [(o.s0 ?? 0.05) * S, o.peak * S, (o.end ?? 0.1) * S, grow],
      iMotion: [(o.drag ?? 3) / D, (o.buoy ?? 0) * S / (D * D), o.squash ?? 1, Math.random()],
      iExtra: [ov, o.core ?? 0, (o.diss ?? 1) * p.dissolve, (o.sway ?? 0) * S / D],
      iCenter: [this.o.x, this.o.y, this.o.z, (o.spin ?? 0) / D],
      iStyle: [(o.alpha ?? 1) * p.opacity, p.edgeAlpha, p.wobble, p.stepFps],
      iColA: o.colA || this.colA, iColB: o.colB || this.colB, iColC: o.colC || this.accentCol,
      iLook: [o.cool ?? p.cool, o.rim ?? p.rim, (o.lobes ?? 1) * p.lobes, (o.glow ?? 1) * p.innerGlow],
      iFlow: [(o.churn ?? 1) * p.churn / D, (o.pulse ?? 1) * p.pulse, 0, 0],
    });
    // распад: на месте тающего пузыря расползается мягкая дымка газа, часть её светится (рассеянный свет)
    if (p.haze > 0 && !o.world && !o.spin && o.peak >= 0.16 && Math.random() < Math.min(1, 0.6 * p.haze)) {
      const outF = o.outF ?? 0.45, td = o.life * (1 - outF);
      const at = this.trail(o.p, o.v || [0, 0, 0], o.drag ?? 3, -(o.buoy ?? 0) * 0.5, td).sub(this.o).divideScalar(S);
      const v0 = o.v ? (o.v.isVector3 ? o.v.toArray() : o.v) : [0, 0, 0];
      const hz = { p: at.applyQuaternion(this._q.clone().invert()), v: [v0[0] * 0.12, v0[1] * 0.12 + 0.25, v0[2] * 0.12], phys: [0.6, -0.15, 0, 0],
        birth: (o.birth || 0) + td * 0.85, life: o.life * outF * 1.8 + 0.5, size: o.peak * 3.2, shape: 5, pull: 0, crisp: true };
      this.sprite({ ...hz, layer: 'haze', alpha: 0.28 * p.haze, colA: (o.colA || this.colA).clone().lerp(this.white, 0.2), colB: o.colB || this.colB });
      if (p.glow > 0 && Math.random() < 0.35)
        this.sprite({ ...hz, layer: 'glow', size: o.peak * 2.2, alpha: 0.16 * p.glow, colA: this.accentCol, colB: o.colA || this.colA });
    }
  }
  // мягкое свечение (аддитивно): ядро взрыва, засветка газа
  glow(o) {
    if (this.p.glow <= 0) return;
    this.sprite({ p: o.p || [0, 0, 0], v: o.v, phys: o.v ? [1, 0, 0, 0] : null, birth: o.birth ?? 0, life: o.life, size: o.size, shape: 5, pull: o.pull ?? 0.3,
      layer: 'glow', alpha: (o.alpha ?? 0.5) * this.p.glow, colA: o.colA || this.accentCol, colB: o.colB || this.flashCol, crisp: true });
  }
  // порывы ветра вокруг эффекта: дуги-штрихи, которые проносятся и закручиваются, и пылинки по ходу ветра
  gusts(o = {}) {
    const p = this.p, n = Math.round((o.count ?? 5) * p.wind * Math.sqrt(p.intensity));
    const col = this.colA.clone().lerp(this.white, 0.55);
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1, r = R(o.r0 ?? 1.6, o.r1 ?? 3.2), b = R(o.b0 ?? 0.05, o.b1 ?? 0.7);
      this.ribbon({ r0: r, r1: r * R(0.55, 0.85), h0: R(0.15, 2.2), h1: R(0.3, 2.6), a0: R(0, TAU), turns: R(0.15, 0.32) * dir, spin: dir * R(1.2, 2.2), expand: 0.25,
        width: R(0.022, 0.04), birth: b, draw: R(0.3, 0.45), lag: R(0.3, 0.45), col, alpha: 0.6 });
      for (let j = 0; j < 3; j++) {
        const a = R(0, TAU), rr = r * R(0.8, 1.1);
        this.spark({ p: [Math.cos(a) * rr, R(0.2, 2), Math.sin(a) * rr], v: [-Math.sin(a) * dir * R(2.5, 4), R(0.1, 0.5), Math.cos(a) * dir * R(2.5, 4)],
          drag: 1.4, grav: -0.1, birth: b + R(0, 0.3), life: R(0.5, 0.8), size: R(0.03, 0.05), stretch: 1.3, colA: this.white, colB: col, alpha: 0.8 });
      }
    }
  }
  // мировая позиция частицы, летящей по баллистике (те же формулы, что в шейдерах), t в секундах рецепта
  trail(p0, v, drag, grav, t) {
    const { S, D } = this, d = drag, F = d > 1e-3 ? (1 - Math.exp(-d * t)) / d : t, G = d > 1e-3 ? (t - F) / d : 0.5 * t * t;
    const vv = this.vec(v);
    return this.pos(p0).add(new THREE.Vector3(vv.x * F, vv.y * F - grav * G, vv.z * F).multiplyScalar(S * this.speedMul));
  }
  shard(o) {
    const { S, D, p } = this, L = this.fx.shards;
    const birth = this.T + (o.birth || 0) * D, life = o.life * D;
    const i = L.alloc(this.T);
    const ax = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    L.write(i, birth, birth + life, {
      iOrigin: this.pos(o.p), iVel: this.vec(o.v).multiplyScalar(S * this.speedMul / D),
      iTime: [birth, life, o.inF ?? 0.05, o.outF ?? 0.3],
      iPhys: [(o.drag ?? 0.8) / D, (o.grav ?? 9.8) * S * this.speedMul / (D * D), this.groundY, 0],
      iSpin: [ax.x, ax.y, ax.z, (o.spin ?? 10) / D],
      iSize: [o.size * S, o.stretch ?? 1, Math.random(), p.stepFps],
      iCenter: [this.o.x, this.o.y, this.o.z, (o.orbit ?? 0) / D],
      iMisc: [p.opacity, p.edgeAlpha, o.glow ?? 0, 0],
      iColA: o.colA || this.colB, iColB: o.colB || this.colB.clone().multiplyScalar(0.55),
    });
  }
  // искра-штрих, уголёк или пылинка (sprite с физикой)
  spark(o) {
    this.sprite({ ...o, shape: o.shape ?? 3, phys: [o.drag ?? 3, o.grav ?? 3, o.flicker ?? 0, o.stretch ?? 1.5], crisp: true });
  }
  // маленький хлопок: пузырь с перелётом, который сразу растворяется дырами
  poof(o) {
    const sz = o.size ?? 0.16;
    this.puff({ p: o.p, v: o.v || [0, 0.3, 0], drag: 2, birth: o.birth, life: o.life ?? 0.55, s0: 0.02, peak: sz, end: sz * 0.7,
      grow: 0.07, over: 1.6, buoy: 0.2, inF: 0.1, outF: 0.75, diss: 1.4, world: o.world, colA: o.colA, colB: o.colB, colC: o.colC, alpha: o.alpha });
    if (o.ring) this.sprite({ p: o.world ? o.p.clone().sub(this.o).divideScalar(this.S) : o.p, size: sz * 2.4, birth: o.birth + 0.02, life: 0.35, grow: 0.05, over: 0,
      pull: sz * 1.2, shape: 2, colA: this.white, colB: o.ringCol || this.colA, crisp: true });
    if (o.star) this.sprite({ p: o.world ? o.p.clone().sub(this.o).divideScalar(this.S) : o.p, size: sz * 1.6, birth: o.birth + 0.03, life: 0.3, grow: 0.3, over: 1.5,
      pull: sz * 1.5, shape: 0, rotSpeed: 3, colA: this.white, colB: o.starCol || this.accentCol, crisp: true });
  }
  // комета: голова (уголёк) по дуге и шлейф мелких клубов, которые растворяются в воздухе
  comet(o) {
    const dir = o.dir.clone().normalize(), v = dir.multiplyScalar(o.speed);
    const drag = o.drag ?? 1.2, grav = o.grav ?? 7, birth = o.birth ?? 0, life = o.life ?? 0.9;
    this.spark({ p: [0, 0, 0], v: [v.x, v.y, v.z], drag, grav, birth, life, size: (o.size ?? 0.16) * 1.4, shape: 0, flicker: 0.3, rotSpeed: 9,
      colA: this.white, colB: o.headCol || this.accentCol, pull: 0.05 });
    // шлейф: клубы перекрываются, растут после пролёта головы и тают; к концу дуги тоньше
    const step = o.step ?? 0.045;
    for (let t = 0.05; t < life * 0.8; t += step * R(0.7, 1.3)) {
      const k = t / life, j = 0.04;
      const at = this.trail([0, 0, 0], [v.x, v.y, v.z], drag, grav, t).add(new THREE.Vector3(R(-j, j), R(-j, j), R(-j, j)).multiplyScalar(this.S));
      this.puff({ p: at, world: true, v: [R(-0.2, 0.2), 0.35, R(-0.2, 0.2)], drag: 1.5,
        birth: birth + t, life: R(0.45, 0.7) * (1 - k * 0.35), s0: 0.03, peak: (o.trailSize ?? 0.12) * (1.25 - k * 0.7) * R(0.85, 1.25), end: 0.05,
        grow: 0.12, over: 0.3, inF: 0.15, outF: 0.6, diss: 1.25, colA: o.trailA, colB: o.trailB, cool: 0.5 });
    }
  }
  // подпалина на земле: тёмное рваное пятно, медленно гаснет
  scorch(o) {
    const r = o.radius;
    this.ring({ center: [0, this.groundLocal + 0.012 / this.S, 0], r0: r * 0.3, r1: r * 0.5, w0: r * 0.6, w1: r, birth: o.birth ?? 0, life: o.life ?? 3.5,
      breakup: 0.15, colA: o.col || this.colB.clone().multiplyScalar(0.35), colB: o.col2 || this.colB.clone().multiplyScalar(0.22), alpha: o.alpha ?? 0.5 });
  }
  // импульс: расходящаяся сфера-контур в воздухе + событие для физики сцены
  impulse(o) {
    const { S, D, p } = this;
    const f = (o.force ?? 1) * p.impulse;
    if (f <= 0.01) return;
    const pos = this.pos([0, o.y ?? 0, 0]);
    const radius = o.radius * S * (0.75 + 0.25 * f);
    const dir = o.dir ? this.vec(o.dir).normalize() : new THREE.Vector3(0, 1, 0);
    this.fx.impulses.push({ time: this.T + (o.birth ?? 0) * D, position: pos, radius, force: f * Math.sqrt(S), kind: o.kind || 'radial',
      direction: dir, duration: (o.dur ?? 0.2) * D, fired: false, color: this.flashCol.clone() });
    if (o.kind === 'vortex') return;
    const L = this.fx.shells, lifeBase = (0.2 + 0.08 * f) * D;
    const shells = f > 0.9 ? 2 : 1;
    for (let j = 0; j < shells; j++) {
      const birth = this.T + ((o.birth ?? 0) + j * 0.07) * D, life = lifeBase * (j ? 1.3 : 1);
      const i = L.alloc(this.T);
      L.write(i, birth, birth + life, {
        iCenter: pos, iTime: [birth, life, Math.random(), p.stepFps],
        iRad: [0.15 * S, radius * (j ? 0.6 : 0.85), Math.min(0.42, 0.18 + 0.1 * f) * (j ? 0.6 : 1), o.squash ?? 1],
        iMisc: [Math.min(1, 0.45 + 0.3 * f) * p.opacity * (j ? 0.7 : 1), 0.03, 0, 0],
        iColA: this.white, iColB: o.col || this.flashCol,
      });
    }
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
      iStyle: [o.width * S, p.opacity * (o.alpha ?? 1), p.edgeAlpha, p.stepFps], iCol: o.col,
    });
  }
  sprite(o) {
    const { S, D, p } = this, L = o.layer === 'glow' ? this.fx.glows : o.layer === 'haze' ? this.fx.hazes : this.fx.sprites;
    const birth = this.T + o.birth * D, life = o.life * D;
    const i = L.alloc(this.T);
    L.write(i, birth, birth + life, {
      iPos: this.pos(o.p), iVel: this.vec(o.v || [0, 0, 0]).multiplyScalar(S * (o.phys ? this.speedMul : 1) / D),
      iTime: [birth, life, Math.min((o.grow ?? 0.2) * Math.sqrt(this.growMul), 0.8), (o.pull ?? 0.5) * S],
      iSize: [o.size * S, o.rot ?? 0, (o.rotSpeed ?? 0) / D, o.shape],
      iMisc: [(o.alpha ?? 1) * p.opacity, o.crisp ? 1 : p.edgeAlpha, p.stepFps, Math.max(0, (o.over ?? 1) + this.overAdd)],
      iPhys: o.phys ? [o.phys[0] / D, o.phys[1] * S * this.speedMul / (D * D), o.phys[2], o.phys[3]] : [0, 0, 0, 0],
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
