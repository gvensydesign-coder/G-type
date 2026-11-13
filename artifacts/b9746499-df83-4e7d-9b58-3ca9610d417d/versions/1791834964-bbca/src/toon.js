// Рисованный материал «как у ауры»: 3 тона, растровая точка, штриховка, процедурные фактуры,
// своя жёсткая тень, режим эскиза (призрак) и этапы стройки. Плюс пост-эффект: чернильный контур
// по глубине и нормалям, бумажное зерно, виньетка. Все материалы пишут 2 цели (цвет + нормаль).
import * as THREE from 'three';

// Общие для всех материалов значения (одна ссылка — меняются разом)
export const G = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.5, 0.75, 0.35).normalize() },
  uSunCol: { value: new THREE.Color(1.0, 0.86, 0.66) },
  uShadeCol: { value: new THREE.Color(0.36, 0.38, 0.55) },
  uDeepCol: { value: new THREE.Color(0.16, 0.16, 0.28) },
  uSkyCol: { value: new THREE.Color(0.55, 0.68, 0.7) },
  uFogCol: { value: new THREE.Color(0.32, 0.42, 0.44) },
  uFogNear: { value: 120 }, uFogFar: { value: 420 },
  uNight: { value: 0.5 },          // 0 день … 1 ночь: свет окон, огня
  uChthon: { value: 0 },           // 0..1 хтонь: красноватый туман и тени
  uShadowMap: { value: null }, uShadowMat: { value: new THREE.Matrix4() }, uShadowOn: { value: 0 },
  uRes: { value: new THREE.Vector2(1, 1) }, uPx: { value: 1 },
  uDepthPass: { value: 0 },
  // межа и сетка (используются только землёй, uTerrain = 1)
  uOwn: { value: null }, uOwnRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uOwnOn: { value: 0 }, uExpand: { value: 0 },
  uCursor: { value: new THREE.Vector3(0, -999, 0) }, uGridOn: { value: 0 },
  // точечные огни (окна, костры), выбираются рядом с камерой каждый кадр
  uPL: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, -999, 0, 1)) },
  uPLc: { value: Array.from({ length: 16 }, () => new THREE.Color(0, 0, 0)) },
  uPLn: { value: 0 }, uLightK: { value: 0.3 },
  uMist: { value: 0 },             // низовой туман (утро, ночь)
  uFormGain: { value: 1.4 },
  uBounce: { value: new THREE.Color(0.5, 0.42, 0.2) },   // тёплый отражённый свет от земли в тенях
};

const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for(int i=0;i<4;i++){ s += a*vnoise(p); p = p*2.03 + 7.1; a *= .5; } return s; }
`;

const VERT = /* glsl */`
in vec4 aInfo; in vec2 aUv; in vec2 aRange;
out vec3 vCol; out vec3 vN; out vec3 vWorld; out vec3 vLocal; out vec2 vUv; out vec4 vInfo; out vec2 vRange; out vec3 vViewN; out float vViewZ;
uniform float uLift, uWobble, uSeed; uniform vec2 uHalf;
void main(){
  vCol = color; vInfo = aInfo; vUv = aUv; vRange = aRange; vLocal = position;
  vec3 p = position;
  if (uWobble > 0.) {
    // «живой» сруб: лёгкий завал стен, волна по венцам, провисший конёк
    float h = max(p.y, 0.);
    float s1 = fract(uSeed * 7.13) - .5, s2 = fract(uSeed * 3.71) - .5;
    p.x += (s1 * .028 * h + .035 * sin(p.y * 1.3 + uSeed * 9. + p.z * .7)) * uWobble;
    p.z += (s2 * .024 * h + .035 * sin(p.y * 1.1 + uSeed * 5. + p.x * .8)) * uWobble;
    p.y += .05 * sin(p.x * .9 + uSeed * 3.) * sin(p.z * .8 + uSeed * 7.) * uWobble * smoothstep(.5, 2.5, h);
    if (aInfo.y > 2.5 && aInfo.z < .5) {
      vec2 q = clamp(p.xz / max(uHalf, vec2(.5)), -1., 1.);
      p.y -= .16 * uWobble * (1. - q.x * q.x) * (1. - q.y * q.y) * smoothstep(1., 3., h);
    }
  }
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vViewN = normalize(normalMatrix * normal);
  vec4 mv = viewMatrix * w;
  vViewZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
precision highp float;
layout(location = 0) out vec4 oColor;
layout(location = 1) out vec4 oNormal;
in vec3 vCol; in vec3 vN; in vec3 vWorld; in vec3 vLocal; in vec2 vUv; in vec4 vInfo; in vec2 vRange; in vec3 vViewN; in float vViewZ;
uniform float uTime, uFogNear, uFogFar, uNight, uChthon, uShadowOn, uPx, uDepthPass;
uniform vec3 uSunDir, uSunCol, uShadeCol, uDeepCol, uSkyCol, uFogCol;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat;
uniform float uStage;     // прогресс стройки: целая часть — этап, дробная — доля этапа (4 = готово)
uniform float uSketch;    // 1 = эскиз-призрак
uniform vec3 uTint;       // оттенок эскиза (зелёный/красный) или подсветки
uniform float uSelect;    // подсветка выбранного
uniform float uAbandon;   // 0..1 заброшенность (выцветание, мох, грязь)
uniform float uSeed, uTerrain;
uniform sampler2D uOwn; uniform vec4 uOwnRect; uniform float uOwnOn, uExpand, uGridOn; uniform vec3 uCursor;
uniform vec4 uPL[16]; uniform vec3 uPLc[16]; uniform float uPLn, uLightK, uMist, uFormGain; uniform vec3 uBounce;
vec3 satC(vec3 c, float k){ float l = dot(c, vec3(.3, .55, .15)); return max(mix(vec3(l), c, k), 0.); }
${NOISE}

float shadowAt(vec3 wp, float ndl){
  if (uShadowOn < .5) return 1.;
  vec4 sc = uShadowMat * vec4(wp, 1.);
  vec3 c = sc.xyz / sc.w * .5 + .5;
  if (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.;
  float bias = .0015 + .004 * (1. - clamp(ndl, 0., 1.));
  vec2 tx = 1. / vec2(textureSize(uShadowMap, 0));
  float s = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)); s += step(c.z - bias, texture(uShadowMap, c.xy + o * tx * 1.6).r); }
  return s / 9.;
}
// линия постоянной толщины (в пикселях) по координате t, период 1
float lineAA(float t, float wpx){ float d = abs(fract(t) - .5); float fw = fwidth(t); return 1. - smoothstep(.5 - wpx * fw, .5 - (wpx - 1.) * fw, d); }
float inkLine(float t, float wpx){ float d = min(fract(t), 1. - fract(t)); float fw = max(fwidth(t), 1e-4); return 1. - smoothstep(wpx * .5 * fw, (wpx * .5 + 1.) * fw, d); }

void main(){
  float pat = floor(vInfo.x + .5), stg = vInfo.y, kind = floor(vInfo.z + .5), seed = vInfo.w;
  // ---- этапы стройки ----
  float st = floor(uStage), fr = uStage - st;
  bool done = uStage >= 3.999;
  if (kind == 1. && (uStage < 1. || done)) discard;           // леса только во время стройки
  if (kind == 2. && uStage >= 2.) discard;                      // разметка до стен
  bool future = false;
  if (kind == 0. || kind == 3.) {
    if (kind == 3. && !done) future = true;
    if (stg > st + .5) future = true;
    else if (abs(stg - st) < .5 && !done) {
      float yRev = mix(vRange.x, vRange.y + .01, fr);
      if (vLocal.y > yRev) future = true;
    }
  }
  vec2 frag = gl_FragCoord.xy / uPx;
  if (future && uDepthPass > .5) discard;
  if (uDepthPass > .5) { oColor = vec4(1.); oNormal = vec4(0.); return; }

  vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
  vec3 base = vCol;
  float ink = 0.;      // доля чернил от фактуры
  float tone = 1.;     // множитель тона фактуры
  float emis = 0.;     // собственное свечение
  vec2 uv = vUv;
  float n1 = vnoise(uv * 1.7 + seed * 31.);

  if (pat == 1.) {           // бревенчатые венцы: полосы с тенью у шва, «круглость»
    float t = uv.y / .27 + seed * 3.;
    float f = fract(t);
    tone *= .78 + .3 * sin(f * 3.14159);
    ink = max(ink, inkLine(t, 1.4) * .85);
    // трещины и сучки
    float k = vnoise(vec2(uv.x * 1.3, floor(t)) * 3.1);
    tone *= .92 + .1 * k;
    ink = max(ink, step(.86, vnoise(vec2(uv.x * 6., floor(t) * 7.3))) * step(abs(f - .5), .12) * .6);
  } else if (pat == 2.) {    // доски: вертикальные швы
    float t = uv.x / .24 + seed * 2.;
    ink = max(ink, inkLine(t, 1.2) * .8);
    tone *= .9 + .14 * hash12(vec2(floor(t), 3.));
    tone *= .93 + .1 * vnoise(vec2(floor(t) * 3., uv.y * 4.));
  } else if (pat == 3.) {    // лемех/дранка: ряды со сдвигом, нижний край каждого ряда тёмный
    float r = uv.y / .3, row = floor(r);
    float t = uv.x / .26 + row * .5;
    float h = hash12(vec2(floor(t), row));
    tone *= .82 + .26 * h;
    tone *= mix(.72, 1., smoothstep(0., .45, fract(r)));
    ink = max(ink, inkLine(r, 1.3) * .9);
    ink = max(ink, inkLine(t, 1.) * .55 * step(.25, fract(r)));
  } else if (pat == 4.) {    // камень: неровная кладка
    float r = uv.y / .38, row = floor(r);
    float t = uv.x / .6 + hash12(vec2(row, 1.)) * 3.;
    tone *= .82 + .3 * hash12(vec2(floor(t), row));
    ink = max(ink, max(inkLine(r, 1.4), inkLine(t, 1.4)) * .85);
  } else if (pat == 5.) {    // солома: длинные штрихи вниз по скату
    float t = uv.x * 9. + vnoise(uv * vec2(2., .7)) * 3.;
    tone *= .8 + .3 * fract(t * .37 + hash12(vec2(floor(t), floor(uv.y * 1.5))));
    ink = max(ink, inkLine(t, 1.) * .35);
    ink = max(ink, inkLine(uv.y / .55, 1.6) * .6);
  } else if (pat == 6.) {    // светящееся окно
    float fl = .85 + .15 * sin(uTime * 7. + seed * 40.) * sin(uTime * 3.1 + seed * 13.);
    emis = mix(.25, 1.25, uNight) * fl;
    base = mix(vec3(.25, .2, .16), base, clamp(uNight * 1.4, .3, 1.));
  } else if (pat == 7.) {    // позолота/свинец: вертикальные блики-полосы
    float a = atan(vLocal.z - floor(vLocal.z), vLocal.x - floor(vLocal.x));
    tone *= .9 + .25 * step(.7, fract(uv.x * 2.2));
    ink = max(ink, inkLine(uv.x * 2.2, 1.) * .35);
  } else if (pat == 8.) {    // ткань: лёгкие складки
    tone *= .85 + .2 * sin(uv.x * 9. + vnoise(uv * 3.) * 2.);
  } else if (pat == 9.) {    // торцы брёвен: кольца
    vec2 q = vec2(uv.x / .3, uv.y / .27);
    vec2 c = fract(q) - .5; float d = length(c * vec2(1., 1.1));
    tone *= mix(1.15, .85, smoothstep(.1, .45, d));
    ink = max(ink, (1. - smoothstep(.38, .46, d)) * smoothstep(.34, .38, d) * .9);
    ink = max(ink, step(.47, d) * .7);
  } else if (pat == 10.) {   // трава (земля карты): штрихи-кустики
    vec2 q = vWorld.xz;
    float g = fbm(q * .08);
    tone *= .88 + .24 * g;
    // пятна луга: сухая золотая трава и сочная бирюзовая зелень, мелкие светлые цветы
    float pn = fbm(q * .022 + 3.1);
    base = mix(base, base * vec3(1.32, 1.18, .55), smoothstep(.52, .72, pn) * .6);
    base = mix(base, base * vec3(.72, 1.08, 1.02), smoothstep(.42, .22, pn) * .5);
    float fl = step(.965, hash12(floor(q * 2.3))) * step(.55, fbm(q * .05 + 9.)) * step(length(fract(q * 2.3) - .5), .2);
    base = mix(base, vec3(.95, .85, .55), fl * .7);
    vec2 cell = floor(q * .9); vec2 f = fract(q * .9) - .5;
    float h = hash12(cell);
    float tuft = step(.82, h) * (1. - smoothstep(.0, .06, abs(f.x + f.y * .3))) * step(-.3, f.y) * step(f.y, .1);
    ink = max(ink, tuft * .45);
  } else if (pat == 11.) {   // дорога: колеи и лужи
    vec2 q = vWorld.xz;
    tone *= .85 + .2 * fbm(q * .3);
    ink = max(ink, step(.78, fbm(q * .55)) * .35);
  } else if (pat == 12.) {   // голая земля
    tone *= .8 + .25 * fbm(uv * .8);
  } else if (pat == 13.) {   // кость: тонкие трещины
    tone *= .9 + .15 * vnoise(uv * 6.);
    ink = max(ink, step(.9, vnoise(uv * 9.)) * .5);
  } else if (pat == 14.) {   // руны: светящиеся знаки на камне/земле
    vec2 q = uv * 1.6;
    vec2 c = floor(q), f = fract(q) - .5;
    float h = hash12(c + seed * 7.);
    float sym = step(abs(f.x + (h - .5) * f.y * 2.), .05) + step(abs(f.y - (h - .5) * .5), .04) * step(abs(f.x), .25);
    float glow = clamp(sym, 0., 1.) * step(.35, h);
    tone *= .85 + .2 * fbm(uv * 2.);
    emis = glow * (.6 + .4 * sin(uTime * 2. + h * 9.)) * mix(.4, 1.3, uNight);
    base = mix(base, vec3(1., .25, .15), glow);
  } else if (pat == 15.) {   // огонь (плоский язык)
    float f = fbm(vec2(uv.x * 3., uv.y * 2. - uTime * 3.));
    emis = 1.4; base = mix(vec3(1., .35, .08), vec3(1., .85, .4), step(.55, f));
  } else if (pat == 16.) {   // тёмный проём
    tone *= .35;
  } else if (pat == 17.) {   // кора/волокна бревна вдоль оси
    float t = uv.y / .075 + vnoise(uv * vec2(.6, 3.)) * 1.5;
    tone *= .86 + .2 * vnoise(vec2(uv.x * .8, floor(t)));
    ink = max(ink, inkLine(t, 1.) * .35 * step(.45, vnoise(vec2(uv.x * 1.5, floor(t) * 3.))));
    ink = max(ink, step(.88, vnoise(uv * vec2(2.2, 9.))) * .55);
  } else if (pat == 18.) {   // торец бревна: годичные кольца, тёмная кора по краю
    float r = length(uv);
    tone *= 1.18 - r * 1.1;
    ink = max(ink, inkLine(r / .04 + vnoise(uv * 20.) * .6, 1.) * .4);
    ink = max(ink, smoothstep(.115, .135, r) * .8);
    base = mix(base, vec3(.85, .68, .45), .35);
  } else if (pat == 19.) {   // резьба: зубчики и сквозные дырочки (кружево подзора и причелин)
    float t = (vLocal.y - vRange.x) / max(vRange.y - vRange.x, .01);
    float fx = fract(uv.x / .2) - .5;
    float scal = length(vec2(fx * .2, t * (vRange.y - vRange.x) - 0.)) ;
    if (scal < .085) discard;
    if (length(vec2(fx * .2, (t - .62) * (vRange.y - vRange.x))) < .03) discard;
    ink = max(ink, (1. - smoothstep(.085, .1, scal)) * .9);
  } else if (pat == 20.) {   // лемех: осиновая чешуя глав
    float r = uv.y / .16, row = floor(r);
    vec2 f = vec2(fract(uv.x / .15 + row * .5), fract(r));
    float e = length(vec2((f.x - .5) * 1.1, f.y * .95));
    tone *= .78 + .35 * f.y * (1. - e * .5);
    ink = max(ink, (1. - smoothstep(.0, .09, abs(e - .55))) * .75 * step(f.y, .6));
    tone *= .9 + .2 * hash12(vec2(floor(uv.x / .15 + row * .5), row));
  }

  // ---- заброшенность: выцветание, грязные подтёки, мох снизу и на кровле ----
  if (uAbandon > 0.) {
    float lum = dot(base, vec3(.3, .55, .15));
    base = mix(base, vec3(lum) * vec3(.95, .92, .88), .45 * uAbandon);
    float streak = vnoise(vec2(vWorld.x * 3. + vWorld.z * 3., vWorld.y * .4));
    tone *= 1. - .25 * uAbandon * smoothstep(.55, .8, streak);
    float moss = smoothstep(.45, .75, fbm(vWorld.xz * .9 + vWorld.y * .5)) * (smoothstep(.3, .9, N.y) + smoothstep(.9, .1, vLocal.y) * .7);
    if (pat != 6.) base = mix(base, vec3(.32, .4, .2), clamp(moss, 0., 1.) * .75 * uAbandon);
    emis *= 1. - uAbandon;
    tone *= 1. - .18 * uAbandon;
  }
  base *= tone;
  // мазки: вытянутый шум вдоль поверхности, лёгкий сдвиг тона — как гуашь
  if (pat != 6. && pat != 15.) {
    vec2 bq = uTerrain > .5 ? vWorld.xz * .55 : uv * 2.2;
    float stroke = vnoise(vec2(dot(bq, vec2(.8, .6)) * .9, dot(bq, vec2(-.6, .8)) * 6.) + seed * 13.);
    base *= .92 + .16 * stroke;
    float hj = vnoise(bq * .35 + seed * 5.) - .5;
    base = mix(base, base.rgb * vec3(1.08, .96, .9) , hj * .5);
    base = mix(base, base.rgb * vec3(.9, 1.0, 1.1), -hj * .5);
  }

  // ---- освещение: слои — форма (3 ступени), падающая тень, затенение у земли и под свесами ----
  // точки только на переходах между слоями; ровный свет и ровная тень — чистым цветом
  float ndl = dot(N, uSunDir);
  float gain = uTerrain > .5 ? uFormGain * 1.8 : uFormGain;
  float form = clamp(ndl * gain + (uTerrain > .5 ? .3 : .06), 0., 1.);
  float sh = shadowAt(vWorld + N * .05, ndl);
  float sky = .5 + .5 * N.y;
  vec2 sp = mat2(.707, -.707, .707, .707) * frag;
  vec2 dc = fract(sp / 4.5) - .5;
  float dotR = length(dc);
  #define HT(t) ((t) <= 0. ? 0. : (t) >= 1. ? 1. : step(dotR, sqrt(t) * .72))
  // 6 тонов с цветовым сдвигом: блик тёплый и насыщенный, тени холодные и цветные, не серые
  vec3 hiC = satC(base, 1.2) * uSunCol * 1.34 + uSunCol * .03;
  vec3 lit = satC(base, 1.08) * uSunCol * 1.1;
  vec3 mid = satC(base, 1.15) * mix(uShadeCol, uSunCol, .55) * 1.02;
  vec3 shade = satC(base * uShadeCol, 1.38) * (.9 + .24 * sky) + base * uSkyCol * .1 * sky;
  vec3 castC = satC(base * uShadeCol * vec3(.88, .86, 1.04), 1.45) * .84 * (.9 + .15 * sky) + base * uSkyCol * .08 * sky;
  vec3 deep = satC(base * uDeepCol, 1.7);
  if (uTerrain < .5) { float bn = (1. - sky) * .5 + (1. - smoothstep(0., 2.5, vLocal.y)) * .5; shade += base * uBounce * bn * .3; castC += base * uBounce * bn * .22; }
  // слой 1: форма
  float t1 = clamp((form - .5) / .1, 0., 1.), t2 = clamp((form - .2) / .09, 0., 1.);
  vec3 c = mix(shade, mid, HT(t2));
  c = mix(c, lit, HT(t1));
  float t0 = clamp((form - .84) / .08, 0., 1.) * step(.9, sh);
  c = mix(c, hiC, HT(t0));
  // слой 2: падающая тень с растровой полутенью
  float tc = clamp((sh - .12) / .76, 0., 1.);
  vec3 cs = mix(castC, c, HT(tc));
  c = form < .2 ? mix(min(c, castC * 1.05), c, .0) : cs;
  if (form < .2) c = mix(c, castC * .95, 1. - HT(tc));
  // слой 3: затенение у земли и под свесами (только постройки)
  float ao = 1.;
  if (uTerrain < .5) {
    ao = mix(.55, 1., smoothstep(-.2, 1.2, vLocal.y)) * mix(.62, 1., smoothstep(.0, .45, sky));
  }
  float ta = clamp((ao - .55) / .3, 0., 1.);
  c = mix(mix(c, deep, .6), c, HT(ta));
  // штриховка в самых тёмных местах
  float darkK = (1. - ta) * .8 + (1. - HT(tc)) * (1. - t2) * .5;
  float hl = inkLine((frag.x + frag.y) / 6., 1.2);
  c = mix(c, deep * .8, hl * clamp(darkK, 0., 1.) * .5);
  float v = form * sh;
  c = mix(c, base * uDeepCol * .6, ink * .85);
  // хтонь: тени уходят в багровый
  c = mix(c, c * vec3(1.15, .7, .75), uChthon * (1. - v) * .5);
  c += base * emis;
  // тёплые огни рядом: 2 ступени + точки на краю пятна
  vec3 pl = vec3(0.);
  for (int i = 0; i < 16; i++) {
    if (float(i) >= uPLn) break;
    vec3 d = uPL[i].xyz - vWorld; float dist = length(d);
    float a = 1. - dist / uPL[i].w; if (a <= 0.) continue;
    float nd = clamp(dot(N, d / max(dist, .01)) * .65 + .35, 0., 1.);
    float k = a * a * nd;
    float lv = k > .3 ? 1. : k > .1 ? .5 : step(dotR, clamp((k - .03) / .07, 0., 1.) * .5) * .5;
    pl += uPLc[i] * lv;
  }
  c += base * pl * uLightK;

  // ---- эскиз (призрак): бумага, карандаш, штрихи по тени ----
  if (uSketch > .5) {
    float paper = .93 + .05 * hash12(floor(frag / 2.));
    vec3 pen = vec3(.33, .34, .4);
    vec3 s = vec3(paper);
    float hatch = (1. - smoothstep(.15, .5, v)) * inkLine((frag.x - frag.y) / 5., 1.);
    s = mix(s, pen, max(ink * .7, hatch * .45));
    s = mix(s, s * (.8 + .2 * v), .6);
    c = mix(s, s * uTint, .55);
    if (future) c = mix(c, vec3(paper), .5);
  } else if (future) {
    // ещё не построено: карандашный набросок — только линии фактуры и редкая штриховка
    float hatchF = inkLine((frag.x - frag.y) / 7., 1.) * step(v, .5);
    float keep = max(step(.35, ink), hatchF * .8);
    if (keep < .5) discard;
    c = mix(vec3(.93, .9, .82), vec3(.55, .58, .66), 1. - v);
  }
  if (uTerrain > .5) {
    if (uOwnOn > .5) {
      vec2 ts = vec2(textureSize(uOwn, 0));
      vec2 sp = (vWorld.xz - uOwnRect.xy) / 32.;
      vec2 cellS = floor(sp);
      vec4 o = texture(uOwn, (cellS + .5) / ts);
      if (o.r < .5) {
        float lum = dot(c, vec3(.3, .55, .15));
        c = mix(c, vec3(lum) * vec3(.9, .88, .95), .32) * .9;
        float hl2 = inkLine((vWorld.x + vWorld.z) / 2.2, 1.);
        c = mix(c, c * .72, hl2 * .4);
        if (uExpand > .5 && o.g > .5) c = mix(c, vec3(1., .78, .35), .22 + .3 * o.b + .08 * sin(uTime * 4.));
      }
      // линия межи: где сосед по другую сторону имеет другой статус
      vec2 f = fract(sp);
      float m = 32.;
      float bl = 0.;
      vec2 dirs[4] = vec2[](vec2(-1., 0.), vec2(1., 0.), vec2(0., -1.), vec2(0., 1.));
      float dist[4] = float[](f.x * m, (1. - f.x) * m, f.y * m, (1. - f.y) * m);
      for (int i = 0; i < 4; i++) {
        vec4 n = texture(uOwn, (cellS + dirs[i] + .5) / ts);
        float diff = abs(n.r - o.r);
        float pxw = fwidth(vWorld.x) + fwidth(vWorld.z);
        bl = max(bl, diff * (1. - smoothstep(pxw * 1.5, pxw * 2.5, dist[i])));
      }
      float dash = step(.4, fract((vWorld.x + vWorld.z) / 3.));
      c = mix(c, vec3(.95, .78, .4), bl * mix(.5, 1., dash));
    }
    if (uGridOn > .5) {
      float d = length(vWorld.xz - uCursor.xz);
      float k = 1. - smoothstep(6., 16., d);
      float gl = max(inkLine(vWorld.x, 1.), inkLine(vWorld.z, 1.));
      c = mix(c, vec3(.95, .92, .8), gl * k * .45);
    }
  }
  if (uSelect > 0.) c = mix(c, c * uTint * 1.5 + .05, uSelect * (.25 + .1 * sin(uTime * 6.)));

  // туман
  float fog = smoothstep(uFogNear, uFogFar, vViewZ);
  float mist = (1. - smoothstep(0., 7., vWorld.y)) * uMist * smoothstep(15., 110., vViewZ);
  mist *= .7 + .3 * fbm(vWorld.xz * .02 + uTime * .01);
  fog = max(fog, mist);
  vec3 fogC = mix(uFogCol, uFogCol * vec3(1.25, .75, .75), uChthon * .6);
  c = mix(c, fogC, fog * (pat == 6. || pat == 15. ? .4 : 1.));
  oColor = vec4(c, 1.);
  oNormal = vec4(normalize(vViewN * (gl_FrontFacing ? 1. : -1.)) * .5 + .5, 1.);
}`;

// Материал здания/земли. Свои uniform-ы на каждое здание (этап, эскиз, заброшенность), общие — из G.
export function makeToonMaterial(o = {}) {
  const m = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexColors: true,
    side: o.side ?? THREE.DoubleSide,
    uniforms: {
      ...G,
      uStage: { value: o.stage ?? 4 }, uSketch: { value: o.sketch ?? 0 }, uTint: { value: new THREE.Color(1, 1, 1) },
      uSelect: { value: 0 }, uAbandon: { value: o.abandon ?? 0 }, uSeed: { value: Math.random() }, uLift: { value: 0 }, uTerrain: { value: o.terrain ? 1 : 0 }, uWobble: { value: o.wobble ?? 0 }, uHalf: { value: new THREE.Vector2(3, 3) },
    },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  return m;
}

// ---------- простые «плоские» шейдеры для частиц, неба и воды (тоже пишут 2 цели) ----------
export function makeFlatShader(frag, vert, uniforms = {}, opts = {}) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, uniforms: { ...G, ...uniforms },
    vertexShader: vert, fragmentShader: `precision highp float;\nlayout(location = 0) out vec4 oColor;\nlayout(location = 1) out vec4 oNormal;\n${NOISE}\n${frag}`,
    ...opts,
  });
}
export { NOISE };

// ---------- тень ----------
export class ShadowPass {
  constructor(size = 2048) {
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthTexture: new THREE.DepthTexture(size, size), samples: 0 });
    this.rt.depthTexture.type = THREE.FloatType;
    this.cam = new THREE.OrthographicCamera(-80, 80, 80, -80, 1, 600);
    this.cam.layers.set(0);
    this.span = 80;
    G.uShadowMap.value = this.rt.depthTexture;
  }
  render(renderer, scene, center, span) {
    this.span = span;
    const d = G.uSunDir.value;
    this.cam.left = -span; this.cam.right = span; this.cam.top = span; this.cam.bottom = -span;
    // привязка к текселю, чтобы тени не дрожали при панораме
    const texel = (2 * span) / this.rt.width;
    const c = center.clone(); c.x = Math.round(c.x / texel) * texel; c.z = Math.round(c.z / texel) * texel;
    this.cam.position.copy(c).addScaledVector(d, 300);
    this.cam.lookAt(c);
    this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    G.uShadowMat.value.multiplyMatrices(this.cam.projectionMatrix, this.cam.matrixWorldInverse);
    G.uDepthPass.value = 1; G.uShadowOn.value = 0;
    this.dummy ??= new THREE.DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, THREE.RGBAFormat, THREE.FloatType);
    this.dummy.needsUpdate = true;
    G.uShadowMap.value = this.dummy;
    const bg = scene.background; scene.background = null;
    renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(scene, this.cam);
    scene.background = bg;
    G.uDepthPass.value = 0; G.uShadowOn.value = 1; G.uShadowMap.value = this.rt.depthTexture;
  }
}

// ---------- пост-эффект: контур, зерно, виньетка ----------
export class InkPost {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { count: 2, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) });
    this.rt.textures[0].name = 'color'; this.rt.textures[1].name = 'normal';
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
      uniforms: {
        tCol: { value: this.rt.textures[0] }, tNor: { value: this.rt.textures[1] }, tDep: { value: this.rt.depthTexture },
        uRes: G.uRes, uPx: G.uPx, uNear: { value: 1 }, uFar: { value: 1000 }, uInk: { value: new THREE.Color(0.018, 0.012, 0.016) },
        uLine: { value: 1.25 }, uTime: G.uTime, uGrain: { value: 1 }, uVign: { value: .55 }, uDesat: { value: 0 }, uSat: { value: 1.15 }, uPaint: { value: 1 }, uPN: { value: 90 }, uPF: { value: 260 },
      },
      vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `precision highp float; layout(location = 0) out vec4 oColor; in vec2 vUv;
      uniform sampler2D tCol, tNor, tDep; uniform vec2 uRes; uniform float uPx, uNear, uFar, uLine, uTime, uGrain, uVign, uDesat, uSat, uPaint, uPN, uPF; uniform vec3 uInk;
      float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      vec3 satC(vec3 c, float k){ float l = dot(c, vec3(.3, .55, .15)); return max(mix(vec3(l), c, k), 0.); }
      void main(){
        vec2 fc0 = gl_FragCoord.xy / uPx;
        // рисованная линия: толщина и положение «гуляют», как у пера
        float wob = vn(fc0 / 9.);
        vec2 px = uLine * (.7 + .7 * wob) * uPx / uRes;
        vec2 juv = vUv + (vec2(vn(fc0 / 14. + 3.), vn(fc0 / 14. + 7.)) - .5) * 1.4 * uPx / uRes;
        vec3 col = texture(tCol, vUv).rgb;
        vec4 n0 = texture(tNor, juv); float d0 = lin(texture(tDep, juv).r);
        float dC = lin(texture(tDep, vUv).r);
        // дальний план: живопись (Кувахара: среднее самого ровного квадранта) + размытие + шум
        float far = smoothstep(uPN, uPF, dC) * uPaint;
        if (far > .02) {
          float r = mix(1.2, 3.6, far) * uPx;
          vec2 tx = r / uRes;
          vec3 m[4]; float v[4];
          for (int q = 0; q < 4; q++) {
            vec2 dir = vec2(q == 0 || q == 3 ? -1. : 1., q < 2 ? -1. : 1.);
            vec3 sum = vec3(0.), sq = vec3(0.);
            for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) {
              vec3 cc = texture(tCol, vUv + dir * vec2(float(i), float(j)) * tx * .5).rgb;
              sum += cc; sq += cc * cc;
            }
            m[q] = sum / 9.; vec3 vv = sq / 9. - m[q] * m[q]; v[q] = vv.r + vv.g + vv.b;
          }
          vec3 kc = m[0]; float best = v[0];
          for (int q = 1; q < 4; q++) if (v[q] < best) { best = v[q]; kc = m[q]; }
          vec3 bl = (m[0] + m[1] + m[2] + m[3]) * .25;
          col = mix(col, mix(kc, bl, .3 + .3 * far), far);
          col += (h(fc0 + fract(uTime) * 61.) - .5) * .06 * far;
        }
        float edge = 0.;
        if (n0.a > .5) {
          vec2 offs[4] = vec2[](vec2(px.x, 0.), vec2(-px.x, 0.), vec2(0., px.y), vec2(0., -px.y));
          for (int i = 0; i < 4; i++){
            vec4 n1 = texture(tNor, vUv + offs[i]); float d1 = lin(texture(tDep, vUv + offs[i]).r);
            float dn = n1.a > .5 ? (1. - dot(n0.xyz * 2. - 1., n1.xyz * 2. - 1.)) : 1.;
            float dd = abs(d1 - d0) / max(d0, 1.);
            edge = max(edge, max(smoothstep(.18, .4, dn), smoothstep(.012, .03, dd)));
          }
          edge *= 1. - smoothstep(150., 400., d0) * .75;
          edge *= 1. - far * .6;
        }
        // цветная тушь: темнее самой поверхности, а не чёрная
        vec3 inkC = mix(uInk, satC(col, 1.6) * .28, .5);
        col = mix(col, inkC, edge * .9);
        col = satC(col, uSat);
        // бумага: зерно и лёгкие волокна
        vec2 fc = gl_FragCoord.xy / uPx;
        float g = h(floor(fc)) - .5; float fib = h(vec2(floor(fc.y / 3.), floor(fc.x / 40.))) - .5;
        col *= 1. + (g * .05 + fib * .025) * uGrain;
        // виньетка
        col = mix(col, vec3(dot(col, vec3(.3, .55, .15))), uDesat);
        vec2 q = vUv - .5; col *= 1. - dot(q, q) * uVign;
        oColor = vec4(pow(max(col, 0.), vec3(1. / 2.2)), 1.);
      }`,
    }));
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize(w, h, px) {
    this.rt.setSize(Math.round(w * px), Math.round(h * px));
    G.uRes.value.set(Math.round(w * px), Math.round(h * px)); G.uPx.value = px;
  }
  render(scene, camera, target = null) {
    const r = this.renderer;
    this.quad.material.uniforms.uNear.value = camera.near; this.quad.material.uniforms.uFar.value = camera.far;
    r.setRenderTarget(this.rt); r.clear(); r.render(scene, camera);
    r.setRenderTarget(target); r.render(this.scene, this.cam);
  }
}
