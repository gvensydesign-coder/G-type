// Небо, дымка и дальний план мазками (референсы Michael refs/sky, кадры TMNT, 2026-11-08).
// PaintedSkyBrush — небо крупными горизонтальными/косыми мазками кисти (постер ref5) с луной и эскизными кругами.
// LightShafts — объёмный свет широкими полупрозрачными полосами с рваными краями и штрихами внутри (ref1).
// HazeBands — кольца дымки между планами: дальний план тонет, контраст падает с расстоянием (ref3).
// Спокойно: перепад тона внутри неба 5–8%, мазки читаются формой, не шумом.
import * as THREE from 'three';
import { GLSL_NOISE, SKY_PRESETS } from './paintfx.js';

const col = (v) => new THREE.Color(v);
class StepClock {
  constructor(fps) { this.fps = fps; this.t = 0; this.u = { value: 0 }; }
  tick(dt) { this.t += dt; this.u.value = Math.floor(this.t * this.fps); }
}

// ---------------------------------------------------------------- небо мазками
export const SKY_BRUSH_PRESETS = {
  // top/mid/low — градиент, как в SKY_PRESETS; accA/accB — оттенки мазков (холоднее/зеленее); tone — перепад яркости мазков,
  // hue — сколько мазок уходит в оттенок, tilt — общий наклон мазков (рад), moonLit — мазки у луны светлее
  lair: { top: '#14202c', mid: '#1d3236', low: '#3a6656', accA: '#1f3c56', accB: '#2f5a4a', tone: 0.11, hue: 0.6, tilt: 0.06, moonLit: 0.6 },
  sunset: { ...SKY_PRESETS.sunset, accA: '#8a7ad8', accB: '#ffb090', tone: 0.06, hue: 0.3, tilt: 0.05, moonLit: 0 },
  night: { ...SKY_PRESETS.night, accA: '#2a1238', accB: '#5a2040', tone: 0.07, hue: 0.3, tilt: 0.06, moonLit: 0.4 },
  poster: { top: '#0e2a6a', mid: '#1a5aa0', low: '#38b0a8', accA: '#2440a0', accB: '#2a8ab0', tone: 0.08, hue: 0.4, tilt: 0.08, moonLit: 0 },
};

const SKYB_VERT = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`;
const SKYB_FRAG = /* glsl */`
uniform vec3 sbTop, sbMid, sbLow, sbAccA, sbAccB; uniform vec4 sbK; uniform vec4 sbK2; uniform float pfStep;
uniform vec4 psMoon, psM2; uniform vec3 psMoonC, psRingC;
varying vec3 vDir;
${GLSL_NOISE}
vec3 grad(float e){
  vec3 c = mix(sbLow, sbMid, smoothstep(-.05, .24, e));
  return mix(c, sbTop, smoothstep(.28, .75, e));
}
// один слой мазков: сетка клеток (N по кругу, периодично), в клетке один мазок; мазки кладутся поверх друг друга
// p: (азимут, угол возвышения) в радианах. cw/ch: размер клетки; amp: сила слоя; prob: доля клеток с мазком
vec3 brushLayer(vec3 c, vec2 p, float N, float ch, float seed, float amp, float prob, vec3 mo){
  float cw = 6.28318 / N;
  vec2 g = p / vec2(cw, ch); vec2 ip = floor(g);
  float fw = max(fwidth(p.y), 1e-4) * 1.5;
  for (int j = -1; j <= 1; j++) for (int i = -2; i <= 2; i++) {
    vec2 cl = ip + vec2(float(i), float(j));
    vec2 hc = vec2(mod(cl.x, N), cl.y) + seed;                       // периодично по азимуту, без шва
    vec3 h = pfH32(hc); vec3 h2 = pfH32(hc + 31.7);
    if (h2.z > prob) continue;
    vec2 ctr = (cl + .5 + (h.xy - .5) * vec2(.7, .5)) * vec2(cw, ch);
    float ang = sbK.z + (h.z - .5) * .32;
    vec2 d = p - ctr; float ca = cos(ang), sa = sin(ang); d = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);
    float L = cw * (.75 + .6 * h2.x), W = ch * (.5 + .35 * h2.y);
    float s = d.y / W;                                               // поперёк мазка -1..1
    // рваный край вдоль мазка и «сухая кисть» на концах: щетинки разной длины
    float rag = pfNoise(vec2(d.x / L * 6. + h.x * 40., h.y * 9.)) - .5;
    float bristle = pfNoise(vec2(s * 5. + h.y * 50., h.z * 7.));
    float taper = 1. - .45 * pow(clamp(abs(d.x) / L, 0., 1.), 3.);
    float Wr = W * taper * (1. + rag * .45);
    float Lr = L * (.72 + .4 * bristle) * (d.x > 0. ? 1. : .9 + .2 * h.x);
    float cov = (1. - smoothstep(-fw, fw, abs(d.y) - Wr)) * (1. - smoothstep(-fw * 3., fw * 3., abs(d.x) - Lr));
    if (cov < .005) continue;
    // цвет мазка: градиент на высоте центра (мазок не ломает общий переход), сдвиг тона и оттенка
    vec3 sc = grad(sin(ctr.y));
    sc = mix(sc, h.x > .5 ? sbAccA : sbAccB, h2.x * sbK.y * amp);
    sc *= 1. + (h.y - .5) * 2. * sbK.x * amp;
    // светлее у луны — целым мазком (свет пятном, не градиентом)
    vec3 cd = vec3(cos(ctr.y) * cos(ctr.x), sin(ctr.y), cos(ctr.y) * sin(ctr.x));
    float ml = smoothstep(.8, .985, dot(cd, mo)) * sbK.w;
    sc = mix(sc, psMoonC * .55 + sc * .5, ml * .35);
    // штрихи щетины внутри мазка, вдоль него, едва заметно
    float br = pfNoise(vec2(s * 7. + h.z * 20., d.x / L * 1.2 + h.x * 9.));
    sc *= 1. + (br - .5) * .07 * amp;
    c = mix(c, sc, cov * mix(.75, 1., h2.y) * smoothstep(1.35, 1.0, ctr.y));
  }
  return c;
}
void main(){
  vec3 d = normalize(vDir);
  float az = atan(d.z, d.x); float elA = asin(clamp(d.y, -1., 1.));
  vec3 mo = normalize(psMoon.xyz);
  // большие спокойные массы: градиент чуть волной (как облачные гряды мазками)
  float wv = (pfNoise(vec2(az * 1.6, elA * 3.) + 7.) - .5) * .06;
  vec3 c = grad(d.y + wv);
  vec2 p = vec2(az, elA);
  c = brushLayer(c, p, 15., .11, 1.3, 1., .95, mo);                  // крупные мазки
  c = brushLayer(c, p + vec2(.07, .03), 28., .055, 7.9, .6, .55, mo); // средние, реже и тише
  if (psMoon.w > 0.) {
    float r = psMoon.w; float st = floor(pfStep);
    vec3 t1 = normalize(cross(mo, vec3(0., 1., 0.))); vec3 t2 = cross(t1, mo);
    float dm = dot(d, mo);
    vec2 q = vec2(dot(d, t1), dot(d, t2)) / max(dm, .05); float a = dm > 0. ? length(q) : 9.;
    float qa = atan(q.y, q.x);
    float h2 = 1. - smoothstep(r * 2.35, r * 2.4, a + (pfNoise(vec2(qa * 5., st * .7)) - .5) * r * .5);
    float h1 = 1. - smoothstep(r * 1.65, r * 1.7, a + (pfNoise(vec2(qa * 7. + 3., st * .9)) - .5) * r * .3);
    c = mix(c, mix(c, psMoonC, .1), h2 * psM2.y); c = mix(c, mix(c, psMoonC, .45), h1 * psM2.y);
    float disk = 1. - smoothstep(r * .97, r * 1.0, a + (pfNoise(vec2(qa * 9., st)) - .5) * r * .05);
    float shade = pfFbm(q / r * 1.3 + 4.);
    c = mix(c, psMoonC * (1.05 + .15 * shade), disk);
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float tl = -.5 + fk * .45 + (pfH11(st * .3 + fk) - .5) * .06;
      vec2 qr = mat2(cos(tl), -sin(tl), sin(tl), cos(tl)) * q;
      float el = length(qr * vec2(1., 1.5 + fk * .35));
      float rr = r * (1.35 + fk * .42) + (pfNoise(vec2(qa * 2. + fk * 5., st * .5)) - .5) * r * .12;
      float fw = max(fwidth(el), 1e-5);
      float ln = 1. - smoothstep(fw * .6, fw * 1.8, abs(el - rr));
      float brk = smoothstep(.35, .5, pfNoise(vec2(atan(qr.y, qr.x) * 2.2 + fk * 7., st * .2 + fk)));
      c = mix(c, psRingC, ln * brk * psM2.x * (.75 - fk * .1) * step(0., dm));
    }
  }
  gl_FragColor = vec4(c * sbK2.x, 1.);
}`;

export class PaintedSkyBrush {
  // style: PaintStyle (берём pfStep — шаг анимации круги луны); opts: { preset|colors, moon, radius, brightness }
  constructor(style, opts = {}) {
    const p = { ...SKY_BRUSH_PRESETS[opts.preset ?? 'lair'], ...(opts.colors ?? {}) };
    this.uniforms = {
      pfStep: style?.u?.pfStep ?? { value: 0 },
      sbTop: { value: col(p.top) }, sbMid: { value: col(p.mid) }, sbLow: { value: col(p.low) }, sbAccA: { value: col(p.accA) }, sbAccB: { value: col(p.accB) },
      sbK: { value: new THREE.Vector4(p.tone, p.hue, p.tilt, p.moonLit) }, sbK2: { value: new THREE.Vector4(opts.brightness ?? 1, 0, 0, 0) },
      psMoon: { value: new THREE.Vector4(0, 0.3, -1, 0) }, psMoonC: { value: col('#e8fff4') }, psRingC: { value: col('#a8d8d0') }, psM2: { value: new THREE.Vector4(1, 1, 0, 0) },
    };
    if (opts.moon) this.setMoon(opts.moon);
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(opts.radius ?? 400, 48, 24), new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: SKYB_VERT, fragmentShader: SKYB_FRAG, side: THREE.BackSide, depthWrite: false,
    }));
    this.mesh.userData.pfSkip = true; this.mesh.renderOrder = -10; this.mesh.frustumCulled = false;
  }
  setMoon({ dir = [0, 0.3, -1], r = 0.08, color = '#e8fff4', ring = '#a8d8d0', rings = 1, halo = 1 } = {}) {
    const d = new THREE.Vector3(...dir).normalize(); this.uniforms.psMoon.value.set(d.x, d.y, d.z, r);
    this.uniforms.psMoonC.value.copy(col(color)); this.uniforms.psRingC.value.copy(col(ring)); this.uniforms.psM2.value.set(rings, halo, 0, 0);
  }
  get moonDir() { const m = this.uniforms.psMoon.value; return new THREE.Vector3(m.x, m.y, m.z); }
  setColors(p) {
    const U = this.uniforms;
    for (const [k, u] of [['top', 'sbTop'], ['mid', 'sbMid'], ['low', 'sbLow'], ['accA', 'sbAccA'], ['accB', 'sbAccB']]) if (p[k]) U[u].value.set(p[k]);
    for (const [k, i] of [['tone', 'x'], ['hue', 'y'], ['tilt', 'z'], ['moonLit', 'w']]) if (p[k] != null) U.sbK.value[i] = p[k];
  }
  update() {}
}

// ---------------------------------------------------------------- объёмный свет мазками-лучами
// Лист вдоль оси луча, развёрнутый к камере вокруг оси. Полоса = 2–3 широких мазка с рваными краями,
// внутри штрихи вдоль луча. Сложение; на штрихах альфа .5 (Кувахара их не размывает), тело полосы — под Кувахару.
const SHAFT_VERT = /* glsl */`
uniform vec3 uBase, uDir; uniform float uLen, uW;
varying vec2 vP; varying float vFade;
void main(){
  float v = uv.y; vec3 P = uBase + uDir * (v * uLen);
  vec3 toCam = normalize(cameraPosition - P);
  vec3 side = normalize(cross(uDir, toCam));
  P += side * position.x * uW * (1. + v * .35);
  vP = vec2(position.x * 2., v);
  float face = 1. - abs(dot(uDir, toCam));                       // строго вдоль луча гасим (иначе веер к луне — оставляем)
  vFade = smoothstep(.004, .03, face) * smoothstep(3., 10., length(cameraPosition - P));
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.);
}`;
const SHAFT_FRAG = /* glsl */`
uniform vec3 uCol; uniform float uK, uSeed, uStep; uniform float uLen, uW;
varying vec2 vP; varying float vFade;
${GLSL_NOISE}
void main(){
  float u = vP.x, v = vP.y; float st = floor(uStep);
  float along = v * uLen / max(uW, .1);                           // длина в ширинах полосы
  float body = 0.;
  // 3 мазка-полосы рядом, разной ширины и яркости, края рвутся вдоль луча
  for (int k = 0; k < 3; k++) {
    float fk = float(k); vec3 h = pfH32(vec2(uSeed * 3.1 + fk, 5.7));
    float c0 = (h.x - .5) * .9, w0 = .22 + .3 * h.y;
    float rag = (pfNoise(vec2(along * 1.4 + fk * 9. + uSeed, st * .3)) - .5) * .22
              + (pfNoise(vec2(along * 5. + fk * 3., uSeed)) - .5) * .08;
    float m = 1. - smoothstep(-.03, .03, abs(u - c0 - rag * .5) - w0 * (1. + rag));
    body += m * (.45 + .45 * h.z);
  }
  body = min(body, 1.2);
  // штрихи вдоль луча: тонкие светлые линии разной длины (как ref1)
  float lane = u * 9. + uSeed; float li = floor(lane);
  float lh = pfH11(li * 1.37 + uSeed);
  float lx = abs(fract(lane) - .5);
  float seg = pfNoise(vec2(li * 3.3, along * .35 + uSeed));
  float streak = (1. - smoothstep(.06, .14, lx)) * step(.55, lh) * smoothstep(.5, .62, seg);
  // вдоль: гаснет у земли и вверху, ярче в верхней трети
  float lenF = smoothstep(0., .05, v) * (1. - smoothstep(.45, 1., v)) * (.7 + .3 * smoothstep(.1, .35, v));
  float edgeF = 1. - smoothstep(.75, 1., abs(u));
  float a = (body * .55 + streak * .6 * step(.05, body)) * lenF * edgeF * vFade;
  a = mix(a, floor(a * 5. + .4) / 5., .35);                       // ступени, как краской
  if (a < .004) discard;
  float prot = streak * lenF * vFade > .08 ? .5 : 1.;              // штрихи защищены от Кувахары
  gl_FragColor = vec4(uCol * a * uK, prot);
}`;
export class LightShafts {
  // shafts: [{ p: [x,y,z] точка у земли, w ширина, len длина, k яркость }]; dir — к источнику (луна)
  constructor(style, { shafts = [], dir = [-0.4, 0.42, -0.82], color = '#cfffc0', k = 0.12, seed = 0 } = {}) {
    this.group = new THREE.Group(); this.clock = new StepClock(3);
    const D = new THREE.Vector3(...dir).normalize(); this.dir = D;
    const geo = new THREE.PlaneGeometry(1, 1, 1, 24); geo.translate(0, 0.5, 0);
    this.items = shafts.map((s, i) => {
      const U = {
        uBase: { value: new THREE.Vector3(...s.p) }, uDir: { value: D }, uLen: { value: s.len ?? 50 }, uW: { value: s.w ?? 4 },
        uCol: { value: col(s.color ?? color) }, uK: { value: (s.k ?? 1) * k }, uSeed: { value: seed + i * 4.17 + 1 }, uStep: this.clock.u,
      };
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
        uniforms: U, vertexShader: SHAFT_VERT, fragmentShader: SHAFT_FRAG, side: THREE.DoubleSide,
        transparent: true, depthWrite: false, blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.SrcAlphaFactor,
      }));
      m.userData.pfSkip = true; m.frustumCulled = false; m.renderOrder = 3; this.group.add(m);
      return U;
    });
  }
  set k(v) { for (const U of this.items) U.uK.value = v; }
  update(dt) { this.clock.tick(dt); }
}

// ---------------------------------------------------------------- дымка между планами
// Кольца вокруг сцены: плотная внизу, кверху тает мазками (горизонтальные языки), цвет к дальним ближе к низу неба.
export const HAZE_PRESETS = {
  // r радиус, y0 низ, h высота, a плотность, c цвет низа, top цвет верха, o renderOrder (между кулисами леса r310/245/192 и облаками); от дальнего к ближнему
  swamp: [
    { r: 285, y0: -4, h: 46, a: 0.82, c: '#3a6656', top: '#2c5046', o: -2.5 },
    { r: 222, y0: -4, h: 34, a: 0.62, c: '#33604f', top: '#284a40', o: -1.5 },
    { r: 172, y0: -3, h: 22, a: 0.5, c: '#2c5646', top: '#22423a', o: -0.8 },
    { r: 95, y0: -2, h: 12, a: 0.4, c: '#244a3c', top: '#1c3a32', o: -0.5 },
  ],
};
const HAZE_VERT = /* glsl */`varying vec2 vQ; uniform float uR, uH; void main(){ vQ = vec2(uv.x * 6.2832 * uR, uv.y * uH); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const HAZE_FRAG = /* glsl */`
uniform float uH, uA, uSeed, uStep; uniform vec3 cLow, cTop;
varying vec2 vQ;
${GLSL_NOISE}
void main(){
  float x = vQ.x, y = vQ.y / uH; float st = floor(uStep);
  // верхний край — длинные горизонтальные языки мазков (меняются медленно, шагами)
  float tongue = (pfNoise(vec2(x * .012 + uSeed, st * .05)) - .5) * .35 + (pfNoise(vec2(x * .05 + uSeed * 2., 1.)) - .5) * .12;
  float streak = pfNoise(vec2(x * .006 + uSeed * 3., y * 7.));      // слои дымки полосами
  float top = .55 + tongue;
  float a = 1. - smoothstep(top - .3, top + .05, y + (streak - .5) * .18);
  a *= smoothstep(0., .06, y);
  a = mix(a, floor(a * 4. + .5) / 4., .4) * uA;
  if (a < .01) discard;
  gl_FragColor = vec4(mix(cLow, cTop, smoothstep(.1, .8, y)), a);
}`;
export class HazeBands {
  constructor(style, { layers = HAZE_PRESETS.swamp, center = [0, 0, -6] } = {}) {
    this.group = new THREE.Group(); this.group.position.set(...center); this.clock = new StepClock(1);
    layers.forEach((L, i) => {
      const U = { uR: { value: L.r }, uH: { value: L.h }, uA: { value: L.a }, uSeed: { value: i * 3.7 + 0.4 }, uStep: this.clock.u, cLow: { value: col(L.c) }, cTop: { value: col(L.top ?? L.c) } };
      const g = new THREE.CylinderGeometry(L.r, L.r, L.h, 96, 1, true); g.translate(0, L.y0 + L.h / 2, 0);
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: HAZE_VERT, fragmentShader: HAZE_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false }));
      // рисуем после задников-лесов логова (renderOrder -3..-1), дальние раньше ближних
      m.renderOrder = L.o ?? (-2.5 + i * 0.6); m.userData.pfSkip = true; m.frustumCulled = false; this.group.add(m);
    });
  }
  update(dt) { this.clock.tick(dt); }
}

// облака логова тише: ближняя гряда не чёрная, дальние тонут в дымке (для PaintedCloudBank)
export const CLOUD_LAYERS_HAZY = [
  { r: 70, y0: -1, h: 7, lump: 5, top: '#1c3a30', body: '#14302a', under: '#102822', a: 0.85 },
  { r: 110, y0: 6, h: 12, lump: 8, top: '#2e5a4c', body: '#24483e', under: '#1c3c34', a: 0.6 },
  { r: 160, y0: 14, h: 18, lump: 12, top: '#4a7a66', body: '#3a6656', under: '#2e5a4c', a: 0.45 },
];
// порядок отрисовки слоёв облаков вперемешку с дымкой (дальнее раньше ближнего)
export const CLOUD_ORDER_HAZY = [-0.4, -0.6, -0.7];
