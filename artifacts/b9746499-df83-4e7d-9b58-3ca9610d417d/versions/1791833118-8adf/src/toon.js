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
uniform float uLift;
void main(){
  vCol = color; vInfo = aInfo; vUv = aUv; vRange = aRange; vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
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
${NOISE}

float shadowAt(vec3 wp, float ndl){
  if (uShadowOn < .5) return 1.;
  vec4 sc = uShadowMat * vec4(wp, 1.);
  vec3 c = sc.xyz / sc.w * .5 + .5;
  if (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.;
  float bias = .0015 + .004 * (1. - clamp(ndl, 0., 1.));
  vec2 tx = 1. / vec2(textureSize(uShadowMap, 0));
  float s = 0.;
  for (int i = 0; i < 4; i++){ vec2 o = vec2(float(i & 1), float(i >> 1)) - .5; s += step(c.z - bias, texture(uShadowMap, c.xy + o * tx * 1.2).r); }
  return s * .25;
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

  // ---- освещение: 3 тона + растровая точка + штриховка ----
  float ndl = dot(N, uSunDir);
  float sh = shadowAt(vWorld + N * .05, ndl);
  float v = clamp(ndl * 1.6, 0., 1.) * sh;
  float sky = .5 + .5 * N.y;
  // экранная растровая сетка (повёрнута на 45°)
  vec2 sp = mat2(.707, -.707, .707, .707) * frag;
  float cell = 5.;
  vec2 dc = fract(sp / cell) - .5;
  float dotR = length(dc);
  vec3 lit = base * uSunCol * 1.08;
  vec3 mid = base * mix(uShadeCol, uSunCol, .55) * 1.;
  vec3 shade = base * uShadeCol * (.85 + .25 * sky);
  vec3 deep = base * uDeepCol;
  vec3 c;
  if (v > .62) c = lit;
  else if (v > .3) c = mix(mid, lit, step(dotR, (v - .3) / .32 * .62));   // переход точками
  else if (v > .08) c = mix(shade, mid, step(dotR, (v - .08) / .22 * .5));
  else c = shade;
  // штриховка в глубокой тени и на нижних гранях
  float hatchK = (1. - smoothstep(.0, .12, v)) * (1. - sky * .6);
  float hl = inkLine((frag.x + frag.y) / 6., 1.2);
  c = mix(c, deep, hl * hatchK * .55);
  c = mix(c, base * uDeepCol * .6, ink * .85);
  // хтонь: тени уходят в багровый
  c = mix(c, c * vec3(1.15, .7, .75), uChthon * (1. - v) * .5);
  c += base * emis;

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
        c = mix(c, vec3(lum) * vec3(.82, .8, .86), .6);
        float hl2 = inkLine((vWorld.x + vWorld.z) / 2.2, 1.);
        c = mix(c, uDeepCol * .8, hl2 * .35);
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
      uSelect: { value: 0 }, uAbandon: { value: o.abandon ?? 0 }, uSeed: { value: Math.random() }, uLift: { value: 0 }, uTerrain: { value: o.terrain ? 1 : 0 },
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
        uLine: { value: 1.25 }, uTime: G.uTime, uGrain: { value: 1 },
      },
      vertexShader: `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `precision highp float; layout(location = 0) out vec4 oColor; in vec2 vUv;
      uniform sampler2D tCol, tNor, tDep; uniform vec2 uRes; uniform float uPx, uNear, uFar, uLine, uTime, uGrain; uniform vec3 uInk;
      float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec2 px = uLine * uPx / uRes;
        vec3 col = texture(tCol, vUv).rgb;
        vec4 n0 = texture(tNor, vUv); float d0 = lin(texture(tDep, vUv).r);
        float edge = 0.;
        if (n0.a > .5) {
          vec2 offs[4] = vec2[](vec2(px.x, 0.), vec2(-px.x, 0.), vec2(0., px.y), vec2(0., -px.y));
          for (int i = 0; i < 4; i++){
            vec4 n1 = texture(tNor, vUv + offs[i]); float d1 = lin(texture(tDep, vUv + offs[i]).r);
            float dn = n1.a > .5 ? (1. - dot(n0.xyz * 2. - 1., n1.xyz * 2. - 1.)) : 1.;
            float dd = abs(d1 - d0) / max(d0, 1.);
            edge = max(edge, max(smoothstep(.18, .4, dn), smoothstep(.012, .03, dd)));
          }
          edge *= 1. - smoothstep(180., 420., d0) * .7;
        }
        col = mix(col, uInk, edge * .9);
        // бумага: зерно и лёгкие волокна
        vec2 fc = gl_FragCoord.xy / uPx;
        float g = h(floor(fc)) - .5; float fib = h(vec2(floor(fc.y / 3.), floor(fc.x / 40.))) - .5;
        col *= 1. + (g * .05 + fib * .025) * uGrain;
        // виньетка
        vec2 q = vUv - .5; col *= 1. - dot(q, q) * .55;
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
