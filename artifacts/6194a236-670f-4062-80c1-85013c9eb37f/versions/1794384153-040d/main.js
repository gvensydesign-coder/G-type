// Рисованные нормали: прототип. Режимы нормали: как сейчас в игре / А мазок в шейдере / Б рисованная карта в UV / гладко.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STROKES } from './strokes.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200);

// ---------------------------------------------------------------- общие юниформы
const G = {
  uMode: { value: 1 }, uLook: { value: 0 }, uAmt: { value: 0.85 },
  uL: { value: new THREE.Vector3(0.6, 0.6, 0.5).normalize() },
  uVar: { value: 0 }, uFl: { value: new THREE.Vector4(1, 1, 1, 1) }, uGrain: { value: 1 },
  uStep: { value: 0 }, uAtlas: { value: null },
};

// ---------------------------------------------------------------- атлас почеркушек Michael (как в небе v2)
function buildAtlas() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  ['light', 'outline', 'smoke', 'hatch'].forEach((cls, row) => {
    (STROKES[cls] || []).slice(0, 4).forEach((drw, col) => {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      drw.forEach(s => { for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
      const sc = (S - 24) / Math.max(x1 - x0, y1 - y0, .05);
      const ox = col * S + 12 + ((S - 24) - (x1 - x0) * sc) / 2, oy = (3 - row) * S + 12 + ((S - 24) - (y1 - y0) * sc) / 2;
      drw.forEach(s => { for (let i = 3; i < s.length; i += 3) {
        g.lineWidth = 4 + 10 * (s[i + 2] || .5);
        g.beginPath(); g.moveTo(ox + (s[i - 3] - x0) * sc, oy + (s[i - 2] - y0) * sc); g.lineTo(ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc); g.stroke(); } });
    });
  });
  g.filter = 'blur(3px)'; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.drawImage(cv, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
G.uAtlas.value = buildAtlas();

// ---------------------------------------------------------------- шейдеры
const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv; varying vec3 vObjN, vObjP, vW, vN, vSk0, vSk1, vSk2;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vUv = uv; vObjN = normal; vObjP = position;
  mat3 Sk = mat3(1.0);
  #ifdef USE_SKINNING
    Sk = mat3(skinMatrix);
  #endif
  mat3 M = mat3(modelMatrix) * Sk; vSk0 = M[0]; vSk1 = M[1]; vSk2 = M[2];
  vec4 w = modelMatrix * vec4(transformed, 1.0); vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * objectNormal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const NOISE = /* glsl */`
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
`;

const FRAG = /* glsl */`
uniform int uMode, uLook; uniform float uRelD, uAmt, uVar, uGrain, uStep, uHasMap, uHasBake, uUnit, uR, uStrokeK, uRelK, uIsGround;
uniform vec3 uL, uColor; uniform vec4 uFl;
uniform sampler2D uMap, uP0, uP1, uP2, uAtlas;
varying vec2 vUv; varying vec3 vObjN, vObjP, vW, vN, vSk0, vSk1, vSk2;
${NOISE}
vec3 toW(vec3 b){ return normalize(mat3(vSk0, vSk1, vSk2) * b); }

// 3D Вороной: ближайшая точка (в пространстве s), её клетка, расстояния до первой и второй
void vor3(vec3 s, float seed, out vec3 fp, out vec3 id, out float d1, out float d2){
  vec3 i = floor(s); d1 = 9.; d2 = 9.; fp = s; id = i;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 c = i + vec3(x, y, z); vec3 q = c + .15 + .7 * h33(c + seed); float d = length(s - q);
    if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d;
  }
}
mat3 rotT(){ float a = .38, b = .22; mat3 rz = mat3(cos(a), sin(a), 0., -sin(a), cos(a), 0., 0., 0., 1.);
  mat3 rx = mat3(1., 0., 0., 0., cos(b), sin(b), 0., -sin(b), cos(b)); return rz * rx; }

// А: мазок как плоскость. Клетки — «лепёшки» в координатах модели (длинные поперёк тела, узкие по высоте),
// нормаль берётся в центре мазка (для выпуклой формы n(c) ≈ n + (c − p)/R), плюс наклон мазка и щетина вдоль него.
vec3 strokeA(vec3 p, vec3 n, float seed, out float edge){
  vec3 w = p + (vec3(n3(p * 7. + seed), n3(p * 7. + 11. + seed), n3(p * 7. + 23. + seed)) - .5) * .045;
  vec3 S = vec3(1. / .095, 1. / .036, 1. / .095) * uStrokeK; mat3 R = rotT();
  vec3 s = (R * w) * S; vec3 fp, id; float d1, d2; vor3(s, seed, fp, id, d1, d2);
  edge = d2 - d1;
  vec3 c = transpose(R) * (fp / S);
  vec3 r = c - p; r -= n * dot(r, n);
  vec3 nc = normalize(n + r / uR + (h33(id + 5.1 + seed) - .5) * .32);
  // щетина: полосы вдоль мазка — лёгкий наклон поперёк
  float br = n3(vec3(s.x * .5, (s.y - fp.y) * 10., s.z * .5) + id * 3.1);
  vec3 up = transpose(R) * vec3(0., 1., 0.);
  nc = normalize(nc + (up - n * dot(up, n)) * (br - .5) * .22);
  return nc;
}
// как сейчас в игре (pnt_light): Вороной в мировых координатах, случайный наклон нормали клетки
vec3 strokeWorld(vec3 pw, vec3 N, float seed){
  vec3 fp, id; float d1, d2; vor3(pw * 7. + (vec3(n3(pw * 5.), n3(pw * 5. + 9.), 0.) - .5) * .8, seed, fp, id, d1, d2);
  return normalize(N + (h33(id + seed) - .5) * .75);
}

// почеркушки Michael из атласа, редкими клетками по UV; утолщение выборкой крестом
float scrib(vec2 uv, float k, float salt, float dens){
  vec2 g = uv * k; vec2 ci = floor(g); vec2 f = fract(g);
  float hh = h21(ci + salt); if (hh > dens) return 0.;
  float idx = floor(h21(ci + salt + 7.) * 16.);
  vec2 cell = vec2(mod(idx, 4.), floor(idx / 4.));
  float a = (h21(ci + salt + 3.) - .5) * 1.2; f = mat2(cos(a), sin(a), -sin(a), cos(a)) * (f - .5) * 1.1 + .5;
  if (any(lessThan(f, vec2(0.))) || any(greaterThan(f, vec2(1.)))) return 0.;
  vec2 au = (cell + f) / 4.; float e = 1.2 / 1024.;
  float v = texture2D(uAtlas, au).r;
  v = max(v, max(texture2D(uAtlas, au + vec2(e, 0)).r, texture2D(uAtlas, au - vec2(e, 0)).r));
  v = max(v, max(texture2D(uAtlas, au + vec2(0, e)).r, texture2D(uAtlas, au - vec2(0, e)).r));
  return v;
}

void main(){
  vec3 nB = normalize(vObjN);
  vec3 N = normalize(vN);
  float seed = uFl.x > .5 ? uVar * 17.3 : 0.;
  vec3 pM = vObjP * uUnit;
  float edge = 1.;
  if (uMode == 0) {
    N = normalize(mix(N, strokeWorld(vW, N, seed), uAmt));
  } else if (uMode == 1 || (uMode == 2 && uHasBake < .5)) {
    vec3 nc = strokeA(pM, nB, seed, edge);
    N = toW(normalize(mix(nB, nc, uAmt)));
  } else if (uMode == 2) {
    float k = uFl.x > .5 ? uVar : 0.;
    vec3 nb = (k < .5 ? texture2D(uP0, vUv).xyz : k < 1.5 ? texture2D(uP1, vUv).xyz : texture2D(uP2, vUv).xyz) * 2. - 1.;
    N = toW(normalize(mix(nB, normalize(nb), uAmt)));
  }
  if (!gl_FrontFacing) N = -N;

  // почеркушки рельефом: высота из атласа → наклон нормали (как bump)
  float relH = 0.;
  if (uFl.y > .5) {
    relH = scrib(vUv, uRelK, 3. + seed, uRelD);
    vec3 dpx = dFdx(vW), dpy = dFdy(vW); float dhx = dFdx(relH), dhy = dFdy(relH);
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    N = normalize(abs(det) * N - grad * .28);
  }

  if (uLook == 2) { gl_FragColor = vec4(N * .5 + .5, 1.); return; }

  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(uL);
  float d = dot(N, L);
  // свет ступенями; переход в тень точками (точки сидят в координатах модели)
  float lit = step(0., d);
  if (uFl.z > .5) {
    vec3 g = pM * 30. + vec3(0., 0., seed); vec3 ci = floor(g);
    vec3 q = ci + .2 + .6 * h33(ci); float dd = length(g - q);
    float t = smoothstep(-.22, .05, d);
    float dotR = .62 * t * (.75 + .5 * h31(ci + 2.));
    lit = d > .05 ? 1. : (dd < dotR ? 1. : 0.);
    if (d > .05 && d < .16 && dd < .16 * (1. - smoothstep(.05, .16, d))) lit = 0.;
  }
  float tone = lit * (.52 + .48 * floor(clamp(d, 0., .999) * 4.) / 3.);
  vec3 alb = uHasMap > .5 ? texture2D(uMap, vUv).rgb * uColor : uColor;
  if (uLook == 1) alb = vec3(.52, .48, .42);
  vec3 lightC = vec3(1.0, .80, .58) * 1.25;
  vec3 shadC = vec3(.20, .20, .40) * .75 + vec3(.04, .06, .08) * max(N.y, 0.);
  vec3 col = alb * mix(shadC, lightC, tone);
  // тонкая кромка: в тени холодная, на свету тёплая
  float fr = pow(1. - max(dot(N, V), 0.), 5.);
  col += mix(vec3(.30, .42, .62), vec3(1., .78, .5), lit) * fr * .35 * (1. - uIsGround);
  // мел в цвете: почеркушки цветом поверх кожи (без рельефа)
  if (uFl.w > .5 && uLook == 0) {
    float ch = scrib(vUv + .37, uRelK * .62, 19. + seed, uRelD * .35);
    col = mix(col, lit > .5 ? vec3(1., .72, .42) * 1.2 : vec3(.30, .42, .85) * .45, ch * .4);
  }
  // зерно бумаги 8 к/с
  if (uGrain > .5) col *= 1. + (h21(floor(gl_FragCoord.xy * .7) + uStep * 13.1) - .5) * .07 + (n2(gl_FragCoord.xy * .02) - .5) * .05;
  gl_FragColor = linearToOutputTexel(vec4(col, 1.));
}`;

const BLACK = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); BLACK.needsUpdate = true;
function makeMat(o = {}) {
  return new THREE.ShaderMaterial({
    name: o.name || 'pn',
    uniforms: {
      ...G,
      uMap: { value: o.map || BLACK }, uHasMap: { value: o.map ? 1 : 0 }, uColor: { value: new THREE.Color(o.color ?? '#ffffff') },
      uP0: { value: BLACK }, uP1: { value: BLACK }, uP2: { value: BLACK }, uHasBake: { value: 0 },
      uUnit: { value: o.unit ?? 1 }, uR: { value: o.R ?? .14 }, uStrokeK: { value: o.strokeK ?? 1 }, uRelK: { value: o.relK ?? 9 }, uRelD: { value: o.relD ?? .3 },
      uIsGround: { value: o.ground ? 1 : 0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: o.side ?? THREE.FrontSide,
    extensions: { derivatives: true },
  });
}

// контур тушью: оболочка, вывернутая наружу (тот же скелет)
const OL_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
uniform float uW;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vec3 nv = normalize(normalMatrix * objectNormal);
  mv.xyz += nv * uW * clamp(-mv.z, 1., 12.) * .0032;
  gl_Position = projectionMatrix * mv;
}`;
const outlineMat = new THREE.ShaderMaterial({
  name: 'ink', uniforms: { uW: { value: 1 } }, vertexShader: OL_VERT,
  fragmentShader: 'void main(){ gl_FragColor = vec4(0.047, 0.055, 0.086, 1.); }', side: THREE.BackSide,
});

// ---------------------------------------------------------------- запекание рисованной карты (Б)
const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.Camera();
const QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
function rt(S) { return new THREE.WebGLRenderTarget(S, S, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }); }
function pass(mat, target) {
  const m = new THREE.Mesh(quadGeo, mat); m.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(m);
  renderer.setRenderTarget(target); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
}
function bakePainted(geo, S = 1024) {
  const A = rt(S), B = rt(S);
  // 1) нормали модели в UV
  const nm = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normal; gl_Position = vec4(uv * 2. - 1., 0., 1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }',
    side: THREE.DoubleSide, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, nm); mesh.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(mesh);
  renderer.setRenderTarget(A); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
  // 2) расширение островов UV (чтобы шов не темнел)
  const dil = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t; uniform float px; varying vec2 vUv;
    void main(){ vec4 c = texture2D(t, vUv); if (c.a > .5) { gl_FragColor = c; return; }
      vec4 s = vec4(0.); for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec4 q = texture2D(t, vUv + vec2(x, y) * px); if (q.a > .5) s += vec4(q.rgb, 1.); }
      gl_FragColor = s.a > 0. ? vec4(s.rgb / s.a, 1.) : vec4(0.); }` });
  let src = A, dst = B;
  for (let i = 0; i < 6; i++) { dil.uniforms.t.value = src.texture; pass(dil, dst); [src, dst] = [dst, src]; }
  const base = src; const spare = dst;
  // 3) мазки: два слоя вытянутых клеток в UV; нормаль мазка = нормаль в центре мазка (плоскость), щетина вдоль, рваный край
  const paint = new THREE.ShaderMaterial({ uniforms: { t: { value: base.texture }, seed: { value: 0 }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t; uniform float seed, px; varying vec2 vUv;
    ${NOISE}
    vec3 dec(vec4 c){ return normalize(c.rgb * 2. - 1.); }
    vec3 layer(vec2 uv, vec3 n0, float ang, vec2 sc, float sd, out float e){
      mat2 R = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
      vec2 w = uv + (vec2(n2(uv * 40. + sd), n2(uv * 40. + sd + 9.)) - .5) * .012;
      vec2 s = (R * w) * sc; vec2 i = floor(s); float d1 = 9., d2 = 9.; vec2 fp = s, id = i;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 c = i + vec2(x, y); vec2 q = c + .1 + .8 * h22(c + sd); float d = length(s - q); if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d; }
      e = d2 - d1;
      vec2 cu = transpose(R) * (fp / sc);
      vec4 cc = texture2D(t, cu); vec3 nc = dec(cc);
      if (cc.a < .5 || dot(nc, n0) < .55) nc = n0;            // центр на другом острове UV — берём свою нормаль
      nc = normalize(nc + (h33(vec3(id, sd)) - .5) * .3);
      float br = n2(vec2((s.y - fp.y) * 14., s.x * .6) + id * 3.7);   // щетина вдоль мазка
      vec3 tl = normalize(cross(n0, vec3(.3, .9, .2)));
      return normalize(nc + tl * (br - .5) * .25);
    }
    void main(){
      vec4 c = texture2D(t, vUv); if (c.a < .5) { gl_FragColor = c; return; }
      vec3 n0 = dec(c); float e1, e2;
      vec3 a = layer(vUv, n0, .5, vec2(34., 92.), seed, e1);
      vec3 b = layer(vUv + .013, n0, -.35, vec2(52., 130.), seed + 41., e2);
      float m = smoothstep(.45, .6, n2(vUv * 26. + seed * 3.) + (n2(vUv * 160. + seed) - .5) * .35);   // маска щетины: где ложится второй слой
      vec3 n = normalize(mix(a, b, m));
      gl_FragColor = vec4(n * .5 + .5, 1.);
    }` });
  const outs = [];
  for (let k = 0; k < 3; k++) { const o = rt(S); paint.uniforms.seed.value = k * 13.7; pass(paint, o); outs.push(o.texture); }
  spare.dispose(); nm.dispose(); dil.dispose(); paint.dispose();
  return { base: base.texture, painted: outs };
}

// ---------------------------------------------------------------- сцена: небо, земля, изба, камни
function skyTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#16303a'); gr.addColorStop(.45, '#2e5a52'); gr.addColorStop(.62, '#7a6a52'); gr.addColorStop(.72, '#c9874e'); gr.addColorStop(1, '#183a30');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { const y = r() * 512, x = r() * 512; g.globalAlpha = .06 + r() * .08; g.fillStyle = r() > .5 ? '#0e1220' : '#e8b080';
    g.save(); g.translate(x, y); g.rotate(-.18 + r() * .1); g.fillRect(-40 - r() * 60, -3 - r() * 4, 90 + r() * 120, 5 + r() * 7); g.restore(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
scene.background = skyTexture();
scene.fog = new THREE.Fog('#183a30', 18, 60);

const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 64), makeMat({ name: 'ground', color: '#1e3a1c', R: .5, strokeK: .55, relK: 2, relD: .12, ground: true }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

const hut = new THREE.Group(); hut.position.set(0.6, 0, -4.6); hut.rotation.y = -0.35; scene.add(hut);
{
  const wood = makeMat({ name: 'wood', color: '#5e4128', R: .16, strokeK: 1.1, relK: 3, relD: .15 });
  const W = 3.4, D = 2.8, r = .15, rows = 9;
  const logGeo = (len) => new THREE.CylinderGeometry(r, r, len, 20, 1);
  for (let i = 0; i < rows; i++) {
    const y = r + i * r * 1.85;
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(logGeo(W + .5), wood); a.rotation.z = Math.PI / 2; a.position.set(0, y + (i % 2 ? 0 : r * .9), s * D / 2); hut.add(a);
      const b = new THREE.Mesh(logGeo(D + .5), wood); b.rotation.x = Math.PI / 2; b.position.set(s * W / 2, y + (i % 2 ? r * .9 : 0), 0); hut.add(b);
    }
  }
  const top = r + rows * r * 1.85;
  const roofM = makeMat({ name: 'hay', color: '#7e6432', R: .3, strokeK: .8, relK: 2, relD: .2 });
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(W + 1, .14, D * .78, 8, 1, 8), roofM);
    p.position.set(0, top + .55, s * D * .3); p.rotation.x = s * .72; hut.add(p);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.3, .1), makeMat({ name: 'door', color: '#2a1c12', R: .3, strokeK: 1.4, relD: .1 }));
  door.position.set(-.5, .7, D / 2 + .2); hut.add(door);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.55, 64, 40), makeMat({ name: 'ball', color: '#cbbfa6', R: .55, strokeK: .7, relK: 5, relD: .3 }));
  ball.position.set(-2.9, .55, 2.4); hut.add(ball);
  const stoneM = makeMat({ name: 'stone', color: '#6a6e64', R: .22, strokeK: 1.2, relK: 4, relD: .25 });
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (const [x, z, s] of [[-2.6, 1.2, .45], [-3.1, .3, .3], [2.7, 1.6, .5], [3.4, .7, .32], [-1.8, 2.6, .25], [1.4, 3.1, .3]]) {
    const st = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), stoneM);
    st.scale.set(s * (1 + rnd() * .5), s * .62, s); st.rotation.y = rnd() * 3; st.position.set(x, s * .3, z + 2.5); scene.add(st);
  }
}

// ---------------------------------------------------------------- персонажи
const loader = new GLTFLoader();
async function loadModel(name) {
  const r = await fetch(`models/${name}.b64.txt`); if (!r.ok) throw new Error(name + ': ' + r.status);
  const b64 = (await r.text()).trim();
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  return new Promise((res, rej) => loader.parse(buf, '', res, rej));
}
function fitHeight(obj, h) {
  const box = new THREE.Box3().setFromObject(obj); const s = h / (box.max.y - box.min.y);
  obj.scale.multiplyScalar(s); const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
}
// клипы на месте: убрать проход бёдер по горизонтали
function inPlace(clip) {
  const c = clip.clone();
  for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; } }
  return c;
}
const chars = [];
const blobGeo = new THREE.CircleGeometry(1, 32);
const blobMat = new THREE.MeshBasicMaterial({ color: '#0c0e16', transparent: true, opacity: .55, depthWrite: false });
async function addChar(name, h, pos, rotY) {
  const gltf = await loadModel(name);
  const obj = gltf.scene; fitHeight(obj, h);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.position.copy(pos); wrap.rotation.y = rotY; scene.add(wrap);
  let skinned = null; obj.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  const src = skinned.material; const map = src.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
  const mat = makeMat({ name, map, color: src.color ? '#' + src.color.getHexString() : '#fff', unit: h, R: name === 'leshy' ? .2 : .16, strokeK: name === 'leshy' ? .32 : .42, relK: 11, relD: .28, side: THREE.DoubleSide });
  skinned.material = mat; skinned.frustumCulled = false;
  const ol = new THREE.SkinnedMesh(skinned.geometry, outlineMat);
  ol.bindMode = skinned.bindMode; ol.bind(skinned.skeleton, skinned.bindMatrix);
  ol.position.copy(skinned.position); ol.quaternion.copy(skinned.quaternion); ol.scale.copy(skinned.scale); ol.frustumCulled = false;
  skinned.parent.add(ol);
  const blob = new THREE.Mesh(blobGeo, blobMat); blob.rotation.x = -Math.PI / 2; blob.position.y = .012; blob.scale.set(h * .24, h * .2, 1); wrap.add(blob);
  const mixer = new THREE.AnimationMixer(obj);
  const clips = Object.fromEntries(gltf.animations.map(a => [a.name, inPlace(a)]));
  const ch = { name, h, wrap, obj, skinned, mat, outline: ol, mixer, clips, action: null, home: pos.clone(), homeRot: rotY };
  chars.push(ch); return ch;
}
function playClip(ch, name) {
  const clip = ch.clips[name] || ch.clips.Idle; const a = ch.mixer.clipAction(clip);
  if (ch.action && ch.action !== a) ch.action.fadeOut(.25);
  a.reset().fadeIn(.25).play(); ch.action = a;
}

// ---------------------------------------------------------------- интерфейс
const MODES = [
  [0, 'Как сейчас в игре', 'Мазки в мировых координатах со случайным наклоном. Пустите героев по кругу: узор плывёт по телу'],
  [1, 'А: мазок в шейдере', 'Нормаль выравнивается по плоскости мазка прямо в шейдере. Мазки в координатах модели, без текстур, подходит и окружению'],
  [2, 'Б: рисованная карта', 'Карта нормалей запечена в UV и прорисована мазками, три варианта для кипения. Изба и камни берут А'],
  [3, 'Гладко, без мазков', 'Обычная нормаль модели, для сравнения'],
];
const LAYERS = [
  ['x', 'Кипение мазков 8 к/с', 'Три варианта карты (или зерна мазков) сменяются шагами, как перерисованные кадры'],
  ['y', 'Почеркушки рельефом', 'Штрихи Michael выдавлены в нормаль: на свету бликуют, в тени пропадают'],
  ['z', 'Тень точками', 'Граница света и тени рассыпается точками, точки сидят на теле'],
  ['w', 'Мел в цвете', 'Цветные почеркушки поверх кожи: тёплые на свету, холодные в тени'],
  ['ol', 'Контур тушью', 'Оболочка на том же скелете'],
  ['gr', 'Зерно бумаги', 'Шум кадра шагом 8 к/с'],
];
const LOOKS = [[0, 'Итог'], [1, 'Только свет'], [2, 'Нормали']];
const ANIMS = [['Idle', 'Стоят'], ['Walk', 'Шаг на месте'], ['circle', 'Идут по кругу'], ['Attack', 'Удар']];
const VIEWS = [
  ['all', 'Общий план', () => new THREE.Vector3(0.1, 1.0, -0.6), 8.2, 0.12, 0.13],
  ['bog', 'Богатырь крупно', () => charPos(0).add(new THREE.Vector3(0, 1.2, 0)), 1.9, 0.25, 0.08],
  ['les', 'Леший крупно', () => charPos(1).add(new THREE.Vector3(0, 1.75, 0)), 3.0, -0.3, 0.06],
  ['ball', 'Шар-образец', () => new THREE.Vector3(-2.95, .55, -3.34), 2.6, 0.35, 0.12],
  ['hut', 'Изба и камни', () => new THREE.Vector3(0.4, 1.0, -2.4), 6.4, 0.55, 0.2],
];
const flags = { x: 1, y: 1, z: 1, w: 1, ol: 1, gr: 1 };
let view = VIEWS[0], yawOff = 0, distK = 1, anim = 'Idle', lightA = -0.35, lightAuto = true;
function charPos(i) { const ch = chars.find(c => c.name === (i ? 'leshy' : 'bogatyr')); return ch ? ch.wrap.position.clone() : new THREE.Vector3(); }

function btn(parent, html, on) { const b = document.createElement('button'); b.innerHTML = html; b.onclick = on; parent.appendChild(b); return b; }
function radio(list, i) { [...list.children].forEach((b, k) => b.classList.toggle('on', k === i)); }
const modesEl = document.getElementById('modes');
MODES.forEach(([v, t, s], i) => btn(modesEl, `${t}<small>${s}</small>`, () => setMode(v)));
const layersEl = document.getElementById('layers');
LAYERS.forEach(([k, t, s]) => {
  const l = document.createElement('label'); l.className = 'chk';
  l.innerHTML = `<input type="checkbox" checked><span>${t}<small>${s}</small></span>`;
  l.querySelector('input').onchange = (e) => { flags[k] = e.target.checked ? 1 : 0; applyFlags(); };
  layersEl.appendChild(l);
});
const lookEl = document.getElementById('look');
LOOKS.forEach(([v, t], i) => btn(lookEl, t, () => { G.uLook.value = v; radio(lookEl, i); }));
const animsEl = document.getElementById('anims');
ANIMS.forEach(([k, t], i) => btn(animsEl, t, () => setAnim(k)));
const viewsEl = document.getElementById('views');
VIEWS.forEach((v, i) => btn(viewsEl, v[1], () => setView(v[0])));
document.getElementById('lightAuto').onchange = e => lightAuto = e.target.checked;
const lightIn = document.getElementById('lightAng');
lightIn.oninput = () => { lightA = +lightIn.value; lightAuto = false; document.getElementById('lightAuto').checked = false; };
const amtIn = document.getElementById('amt'); amtIn.oninput = () => G.uAmt.value = +amtIn.value;
const panel = document.getElementById('panel');
document.getElementById('toggle').onclick = () => panel.classList.toggle('hide');
if (innerWidth < 760) panel.classList.add('hide');

const HINTS = {
  0: 'Так мазки считаются сейчас: в мире. Включите «Идут по кругу» и смотрите на руки и ноги: узор света скользит по телу.',
  1: 'Каждый мазок — плоская грань, как у скульптуры из видео. Мазки приклеены к телу, свет ходит по ним, форма мазка остаётся.',
  2: 'Рисованная карта: мазки лежат в текстуре, их можно дорисовать рукой. Три варианта сменяются шагами 8 к/с.',
  3: 'Гладкая нормаль модели: свет ложится мягко, без мазков. Для сравнения.',
};
function setMode(v) { G.uMode.value = v; radio(modesEl, MODES.findIndex(m => m[0] === v)); document.getElementById('hint').textContent = HINTS[v]; }
function setAnim(k) {
  anim = k; radio(animsEl, ANIMS.findIndex(a => a[0] === k));
  for (const ch of chars) {
    playClip(ch, k === 'circle' ? 'Walk' : k);
    if (k !== 'circle') { ch.wrap.position.copy(ch.home); ch.wrap.rotation.y = ch.homeRot; }
  }
}
function setView(id) { view = VIEWS.find(v => v[0] === id); yawOff = 0; distK = 1; radio(viewsEl, VIEWS.indexOf(view)); }
function applyFlags() {
  G.uFl.value.set(flags.x, flags.y, flags.z, flags.w); G.uGrain.value = flags.gr;
  for (const ch of chars) ch.outline.visible = !!flags.ol;
}
addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') yawOff -= .12; else if (e.key === 'ArrowRight') yawOff += .12;
  else if (e.key === 'ArrowUp') distK = Math.max(.35, distK * .9); else if (e.key === 'ArrowDown') distK = Math.min(2.5, distK / .9); else return;
  e.preventDefault();
});

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- цикл
const fpsEl = document.getElementById('fps');
let last = performance.now(), acc = 0, t = 0, fr = 0, fpsT = 0, frames = 0, circT = 0, lightStepT = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; t += dt;
  // всё анимированное шагами: персонажи 12 к/с, кипение и зерно 8 к/с, свет 8 к/с
  acc += dt;
  if (acc >= 1 / 12) {
    for (const ch of chars) ch.mixer.update(acc);
    if (anim === 'circle') {
      circT += acc * .55;
      chars.forEach((ch, i) => {
        const a = circT + i * Math.PI, R = 2.0;
        ch.wrap.position.set(Math.cos(a) * R + .1, 0, Math.sin(a) * R + .6);
        ch.wrap.rotation.y = -a;   // лицом по ходу
      });
    }
    acc = 0;
  }
  const st = Math.floor(t * 8); G.uStep.value = st % 997; G.uVar.value = st % 3;
  if (lightAuto && Math.floor(t * 8) !== lightStepT) { lightStepT = Math.floor(t * 8); lightA += .035; lightIn.value = (((lightA % 6.283) + 6.283) % 6.283).toFixed(2); }
  G.uL.value.set(Math.cos(lightA), .48, Math.sin(lightA)).normalize();
  // камера
  const tgt = view[2](); const yaw = view[4] + yawOff, pitch = view[5], dist = view[3] * distK;
  camera.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist + .15, tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(tgt);
  renderer.render(scene, camera);
  frames++; fr++; fpsT += dt; if (fpsT > .5) { fpsEl.textContent = `${Math.round(fr / fpsT)} к/с`; fr = 0; fpsT = 0; }
  window.__pn.frames = frames;
  requestAnimationFrame(frame);
}

window.__pn = { frames: 0, G, flags, setMode, setView, setAnim, applyFlags, chars, setLight: (a) => { lightA = a; lightAuto = false; } };

(async () => {
  try {
    const [b, l] = await Promise.all([addChar('bogatyr', 1.8, new THREE.Vector3(-1.0, 0, .6), .35), addChar('leshy', 2.6, new THREE.Vector3(1.35, 0, .3), -.4)]);
    for (const ch of [b, l]) {
      const bk = bakePainted(ch.skinned.geometry);
      const u = ch.mat.uniforms; u.uP0.value = bk.painted[0]; u.uP1.value = bk.painted[1]; u.uP2.value = bk.painted[2]; u.uHasBake.value = 1;
      ch.bake = bk;
    }
    setAnim('Idle');
  } catch (e) { console.error(e); document.getElementById('loading').innerHTML = 'Не удалось загрузить модели<small>' + e.message + '</small>'; return; }
  document.getElementById('loading').remove();
  setMode(1); setView('all'); radio(lookEl, 0); applyFlags();
  requestAnimationFrame(t0 => { last = t0; frame(t0); });
})();
