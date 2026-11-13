// Растительность кистями: трава, разнотравье, папоротник, мох, грибы, камыш, иван-чай, черничник,
// камни, кувшинки. Каждый вид — InstancedMesh со своим многослойным шейдером (тёмный низ, средний тон,
// светлые кончики, растровые переходы, качание на ветру, тени от солнца и облаков).
// Кисть: paint(тип, точка, радиус) / erase(точка, радиус). Есть автозасев «как в природе».
// Зависит только от three и общих uniform-ов toon.js (G).
import * as THREE from 'three';
import { G, NOISE } from './toon.js';
import { lumpify } from './kit.js';

const PI = Math.PI;

// Виды: где растут (зоны карты), сколько максимум, размер, плотность кисти (шт/м²), отбрасывает ли тень
export const PLANTS = {
  grass:    { name: 'Трава',        type: 0, max: 42000, s: [0.45, 0.85], dens: 2.2, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0.16, outline: false, surf: true, desc: 'Кустики травы: тёмный низ, светлые кончики, сухие травинки' },
  meadow:   { name: 'Разнотравье',  type: 1, max: 14000, s: [0.5, 0.95], dens: 1.2, zones: ['ground', 'slope', 'border'], cast: false, sway: 0.18, outline: false, surf: true, desc: 'Трава с цветами: ромашки, васильки, лютики, клевер' },
  reeds:    { name: 'Камыш',        type: 2, max: 7000, s: [1.4, 2.3], dens: 1.6, zones: ['shore', 'shallow', 'water', 'ground'], cast: false, sway: 0.1, outline: false, water: true, desc: 'Камыш и рогоз у воды, бурые початки' },
  fireweed: { name: 'Иван-чай',     type: 3, max: 5000, s: [1.0, 1.6], dens: 0.7, zones: ['ground', 'slope', 'border'], cast: false, sway: 0.12, outline: false, surf: true, desc: 'Высокие розовые свечи на гарях и у заброшенных изб' },
  fern:     { name: 'Папоротник',   type: 4, max: 9000, s: [0.6, 1.25], dens: 0.6, zones: ['ground', 'slope', 'border'], cast: true, sway: 0.12, outline: true, surf: true, desc: 'Розетка резных вай, светлые кончики' },
  moss:     { name: 'Мох',          type: 5, max: 7000, s: [0.4, 1.3], dens: 0.8, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0, outline: false, surf: true, desc: 'Моховые подушки с искрами спор' },
  mushroom: { name: 'Грибы',        type: 6, max: 4000, s: [0.6, 1.5], dens: 0.9, zones: ['ground', 'slope', 'border'], cast: true, sway: 0, outline: true, cluster: 4, surf: true, desc: 'Мухоморы, боровики, лисички, бледные поганки — гнёздами' },
  bush:     { name: 'Черничник',    type: 9, max: 5000, s: [0.6, 1.2], dens: 0.5, zones: ['ground', 'slope', 'border'], cast: true, sway: 0.05, outline: true, surf: true, desc: 'Низкие кусты с ягодой' },
  stones:   { name: 'Камни',        type: 7, max: 4000, s: [0.15, 0.7], dens: 0.35, zones: ['ground', 'slope', 'shore', 'border', 'shallow'], cast: true, sway: 0, outline: true, surf: true, desc: 'Валуны и галька, мох на макушке' },
  // тусклые, старые, ядовитые и тухлые виды (look — вариант рисунка того же типа)
  deadgrass: { name: 'Пожухлая трава', type: 0, look: 1, max: 20000, s: [0.4, 0.8], dens: 2.0, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0.12, outline: false, surf: true, desc: 'Сухая серо-бурая трава с обломанными стеблями' },
  belena:   { name: 'Белена',       type: 1, look: 1, max: 6000, s: [0.55, 0.95], dens: 0.9, zones: ['ground', 'slope', 'border'], cast: false, sway: 0.12, outline: false, surf: true, desc: 'Ядовитая: сизые листья, грязно-жёлтые цветы с лиловым зевом' },
  hemlock:  { name: 'Болиголов',    type: 3, look: 1, max: 5000, s: [1.0, 1.7], dens: 0.6, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0.1, outline: false, desc: 'Ядовитый: пятнистые стебли, плоские белёсые зонтики' },
  toadstool: { name: 'Поганки',     type: 6, look: 1, max: 4000, s: [0.5, 1.3], dens: 0.9, zones: ['ground', 'slope', 'border'], cast: true, sway: 0, outline: true, cluster: 5, surf: true, desc: 'Бледные поганки и ложные опята, тонкие ножки с юбкой' },
  trutovik: { name: 'Трутовики',    type: 10, max: 3000, s: [0.35, 0.8], dens: 0.7, zones: ['ground', 'slope', 'border'], cast: true, sway: 0, outline: true, surf: true, shelf: true, desc: 'Древесные грибы-полки на старых брёвнах и пнях' },
  lichen:   { name: 'Лишайник',     type: 5, look: 1, max: 6000, s: [0.25, 0.8], dens: 1.0, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0, outline: false, surf: true, desc: 'Серо-зелёная и охристая корка на старом дереве и камне' },
  mold:     { name: 'Плесень, гниль', type: 5, look: 2, max: 6000, s: [0.3, 0.9], dens: 1.0, zones: ['ground', 'slope', 'shore', 'border'], cast: false, sway: 0, outline: false, surf: true, desc: 'Тухлая чёрно-зелёная гниль с белёсым пушком' },
  lily:     { name: 'Кувшинки',     type: 8, max: 3000, s: [0.35, 0.7], dens: 0.8, zones: ['water', 'shallow'], cast: false, sway: 0, outline: false, onWater: true, desc: 'Листья на воде, белые цветы' },
};
export const PLANT_IDS = Object.keys(PLANTS);

// ---------- геометрия: единичный кустик каждого вида ----------
function cards(n, w = 1, h = 1) {
  const pos = [], uv = [], nor = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * PI, c = Math.cos(a) * w / 2, s = Math.sin(a) * w / 2;
    const fn = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.35).add(new THREE.Vector3(0, 0.9, 0)).normalize();
    const P = [[-c, 0, -s], [c, 0, s], [c, h, s], [-c, h, -s]], U = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const t of [0, 1, 2, 0, 2, 3]) { pos.push(...P[t]); uv.push(...U[t]); nor.push(fn.x, fn.y, fn.z); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
function fernGeo() {
  const pos = [], uv = [], nor = [], N = 9, S = 8;
  for (let f = 0; f < N; f++) {
    const a = f / N * PI * 2 + (f % 2) * 0.2, L = 0.85 + 0.25 * ((f * 37) % 7) / 7, rise = 0.65 + 0.2 * ((f * 13) % 5) / 5;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const pt = (t) => dir.clone().multiplyScalar(t * L).setY(rise * (t * 1.25 - t * t * 1.05));
    for (let i = 0; i < S; i++) {
      const t0 = i / S, t1 = (i + 1) / S, w0 = 0.2 * Math.sin(PI * Math.min(1, t0 * 1.15 + 0.05)), w1 = 0.2 * Math.sin(PI * Math.min(1, t1 * 1.15 + 0.05));
      const p0 = pt(t0), p1 = pt(t1);
      const q = [p0.clone().addScaledVector(side, -w0), p0.clone().addScaledVector(side, w0), p1.clone().addScaledVector(side, w1), p1.clone().addScaledVector(side, -w1)];
      const U = [[-1, t0], [1, t0], [1, t1], [-1, t1]];
      const n = new THREE.Vector3().subVectors(p1, p0).cross(side).normalize(); if (n.y < 0) n.negate(); n.lerp(new THREE.Vector3(0, 1, 0), 0.4).normalize();
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k].x, q[k].y, q[k].z); uv.push(...U[k]); nor.push(n.x, n.y, n.z); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
function withUv(g, f) {
  const P = g.attributes.position, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { const r = f(P.getX(i), P.getY(i), P.getZ(i)); uv[i * 2] = r[0]; uv[i * 2 + 1] = r[1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function mossGeo() {
  const g = new THREE.SphereGeometry(1, 12, 6, 0, PI * 2, 0, PI / 2);
  g.scale(1, 0.22, 1); lumpify(g, 0.12, 2.0, 3.3, false);
  return withUv(g.toNonIndexed(), (x, y, z) => [x, z]);
}
function mushroomGeo() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.045, 0.06, 0.24, 8, 1).translate(0, 0.12, 0).toNonIndexed();
  withUv(stem, (x, y) => [0, y / 0.24 * 0.3]); parts.push(stem);
  const cap = new THREE.LatheGeometry([[0.0, 0.33], [0.07, 0.325], [0.13, 0.3], [0.17, 0.25], [0.18, 0.21], [0.16, 0.2], [0.09, 0.22], [0.04, 0.23]].map(([r, y]) => new THREE.Vector2(r, y)), 12).toNonIndexed();
  withUv(cap, (x, y, z) => [Math.atan2(z, x), 0.4 + (y - 0.2) / 0.13 * 0.6]); parts.push(cap);
  return merge(parts);
}
function stoneGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1); lumpify(g, 0.22, 1.4, 7.1, false); g.scale(1, 0.62, 1); g.translate(0, 0.25, 0);
  const n = g; n.computeVertexNormals();
  return withUv(n, (x, y, z) => [x + z * 0.5, y]);
}
function lilyGeo() {
  const g = new THREE.CircleGeometry(1, 14, 0.3, PI * 2 - 0.6).rotateX(-PI / 2).toNonIndexed();
  return withUv(g, (x, y, z) => [x, z]);
}
function bushGeo() {
  const parts = [];
  for (const [x, y, z, r] of [[0, 0.3, 0, 0.42], [0.3, 0.22, 0.12, 0.3], [-0.28, 0.2, -0.1, 0.32], [0.05, 0.2, -0.32, 0.28], [-0.1, 0.18, 0.3, 0.27]]) {
    const s = new THREE.IcosahedronGeometry(r, 1); lumpify(s, r * 0.25, 3.0, x * 9 + z, false); s.scale(1, 0.8, 1); s.translate(x, y, z);
    const n = s; n.computeVertexNormals(); parts.push(withUv(n, (a, b, c) => [a * 2 + c, b * 2 + c * 0.5]));
  }
  return merge(parts);
}
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of list) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// трутовики: 3 полки-копытца, растут от стены (z = 0) наружу по +z; uv.x — расстояние от стены (кольца), uv.y — верх/низ
function shelfGeo() {
  const parts = [];
  for (const [y, r, x] of [[0.0, 0.34, 0.0], [0.17, 0.25, 0.14], [-0.12, 0.2, -0.17]]) {
    const g = new THREE.SphereGeometry(r, 12, 6, 0, PI, 0, PI);  // полусфера по +z
    lumpify(g, r * 0.12, 4.0, x * 13 + y * 7, false);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const yy = P.getY(i); P.setY(i, yy > 0 ? yy * 0.42 : yy * 0.16); P.setZ(i, Math.max(P.getZ(i), 0)); }
    g.translate(x, y, -0.02); g.computeVertexNormals();
    parts.push(withUv(g.toNonIndexed(), (a, b, c) => [Math.hypot(a - x, c) / r, b - y]));
  }
  return merge(parts);
}
const GEO = {
  0: () => cards(3), 1: () => cards(3), 2: () => cards(2), 3: () => cards(2), 4: fernGeo, 5: mossGeo,
  6: mushroomGeo, 7: stoneGeo, 8: lilyGeo, 9: bushGeo, 10: shelfGeo,
};

// ---------- шейдер ----------
const VERT = /* glsl */`
in vec4 iVar;          // x: зерно, y: оттенок, z: подвид, w: —
out vec2 vUv; out vec3 vN; out vec3 vW; out vec4 vVar; out float vH; out vec3 vViewN; out float vViewZ;
uniform float uTime, uSwayK, uFadeFar; uniform vec3 uWind;
void main(){
  vUv = uv; vVar = iVar; vH = position.y;
  mat4 M = modelMatrix * instanceMatrix;
  // растение может стоять на стене или кровле: высота и угасание считаются по его собственной оси «вверх»
  vec4 mv0 = viewMatrix * (M * vec4(position, 1.));
  float fade = 1. - smoothstep(uFadeFar * .7, uFadeFar, -mv0.z);
  vec3 p = position; p.y *= fade; p.xz *= mix(.3, 1., fade);
  vec4 w = M * vec4(p, 1.);
  float h = max(p.y, 0.) * length(M[1].xyz);
  float ph = dot(w.xz, vec2(.21, .17)) + iVar.x * 6.;
  float s = (sin(uTime * 2.1 + ph) * .7 + sin(uTime * 4.3 + ph * 1.7) * .3) * (.6 + .4 * sin(uTime * .45 + ph * .2)) * uWind.z;
  w.xz += normalize(uWind.xy + 1e-4) * s * h * h * uSwayK + vec2(-uWind.y, uWind.x) * sin(uTime * 3.1 + ph) * h * uSwayK * .25;
  vW = w.xyz;
  vN = normalize(mat3(M) * normal);
  vViewN = normalize((viewMatrix * vec4(vN, 0.)).xyz);
  vec4 mv = viewMatrix * w; vViewZ = -mv.z;
  gl_Position = fade <= 0. ? vec4(0., 0., 2., 1.) : projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
in vec2 vUv; in vec3 vN; in vec3 vW; in vec4 vVar; in float vH; in vec3 vViewN; in float vViewZ;
uniform float uLook, uAir, uTime, uType, uPx, uDepthPass, uShadowOn, uFogNear, uFogFar, uNight, uChthon, uMist, uCast, uOutline, uCloud, uPLn, uLightK;
uniform vec3 uSunDir, uSunCol, uShadeCol, uDeepCol, uSkyCol, uFogCol, uBounce;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat;
uniform vec4 uPL[16]; uniform vec3 uPLc[16];
vec3 satC(vec3 c, float k){ float l = dot(c, vec3(.3, .55, .15)); return max(mix(vec3(l), c, k), 0.); }
float shadowAt(vec3 wp, float ndl){
  if (uShadowOn < .5) return 1.;
  vec4 sc = uShadowMat * vec4(wp, 1.); vec3 c = sc.xyz / sc.w * .5 + .5;
  if (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1. || c.z > 1.) return 1.;
  float bias = .002 + .004 * (1. - clamp(ndl, 0., 1.)); vec2 tx = 1. / vec2(textureSize(uShadowMap, 0)); float s = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) s += step(c.z - bias, texture(uShadowMap, c.xy + vec2(float(i), float(j)) * tx * 1.6).r);
  return s / 9.;
}
// травинки на карточке: n штук, у каждой свой изгиб, высота и ширина. Возвращает высоту по травинке (0..1) или -1
float blades(vec2 uv, float seed, float n, float wid, out float id){
  float best = -1.; id = 0.;
  for (int i = 0; i < 9; i++) {
    float fi = float(i); if (fi >= n) break;
    float hgt = .4 + .6 * hash12(vec2(seed * 13. + fi, 2.));
    float x0 = .12 + .76 * hash12(vec2(seed * 7. + fi, 1.));
    float lean = (hash12(vec2(seed + fi, 5.)) - .5) * .7;
    float v = uv.y / hgt; if (v > 1.) continue;
    float cx = x0 + lean * v * v;
    float w = wid * (1. - v * .92) * (.7 + .6 * hash12(vec2(fi, seed)));
    if (abs(uv.x - cx) < w) { if (v > best) { best = v; id = fi; } }
  }
  return best;
}
void main(){
  int T = int(uType + .5);
  float seed = vVar.x, sub = vVar.z;
  vec3 base; float hgt = 0., ink = 0., emis = 0.; vec3 N = normalize(vN) * (gl_FrontFacing ? 1. : -1.);
  vec2 fc = gl_FragCoord.xy / uPx;
  vec2 sp = mat2(.707, -.707, .707, .707) * fc; float dotR = length(fract(sp / 4.5) - .5);
  #define HT(t) ((t) <= 0. ? 0. : (t) >= 1. ? 1. : step(dotR, sqrt(t) * .72))
  vec3 tint = vec3(1. + vVar.y * .25, 1., 1. - vVar.y * .3);
  if (T <= 3) {
    // карточки: трава / разнотравье / камыш / иван-чай
    float face = floor((atan(vN.z, vN.x) + 3.2) * 2.);
    float sd = seed * 31. + face * 3.7;
    float id; float n = T == 2 ? 4. : T == 3 ? 3. : 7.;
    float wid = T == 2 ? .05 : T == 3 ? .035 : .055;
    float v = blades(vUv, sd, n, wid, id);
    // цветы и початки: кружки у верхушек
    float flower = 0.; vec3 fcol = vec3(1.);
    if (T == 1 || T == 2 || T == 3) {
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float hgt2 = .4 + .6 * hash12(vec2(sd * 13. + fi, 2.)), x0 = .12 + .76 * hash12(vec2(sd * 7. + fi, 1.)), lean = (hash12(vec2(sd + fi, 5.)) - .5) * .7;
        vec2 c = vec2(x0 + lean, hgt2);
        if (T == 1 && uLook > .5 && hash12(vec2(sd, fi + 9.)) < .5) {
          // белена: грязно-жёлтый колокольчик с лиловыми жилками и чёрно-лиловым зевом
          vec2 d = (vUv - c) * vec2(1., 1.2); float r = length(d);
          if (r < .07) { flower = 1.; fcol = r < .028 ? vec3(.2, .08, .16) : mix(vec3(.72, .68, .44), vec3(.42, .26, .36), step(.85, abs(sin(atan(d.y, d.x) * 5.)))); }
        } else if (T == 1 && uLook < .5 && hash12(vec2(sd, fi + 9.)) < .55) {
          float r = length((vUv - c) * vec2(1., 1.2));
          float k = hash12(vec2(sd, fi + 3.));
          vec3 pc = k < .35 ? vec3(.97, .95, .88) : k < .6 ? vec3(.35, .5, .95) : k < .85 ? vec3(1., .82, .2) : vec3(.86, .4, .6);
          if (r < .075) { flower = 1.; fcol = r < .03 && k < .35 ? vec3(1., .8, .2) : pc; }
        } else if (T == 2 && fi < 2. && hash12(vec2(sd, fi + 4.)) < .6) {
          vec2 d = vUv - c + vec2(0., .08); if (abs(d.x) < .028 && abs(d.y) < .09) { flower = 1.; fcol = vec3(.36, .2, .12) * (.8 + .4 * step(.0, d.x)); }
        } else if (T == 3 && uLook > .5 && fi < 3.) {
          // болиголов: плоский зонтик из мелких белёсых точек
          vec2 d = vUv - c + vec2(0., .02);
          if (abs(d.y) < .04 - d.x * d.x * 2.2 && abs(d.x) < .12) { flower = 1.; fcol = mix(vec3(.8, .8, .7), vec3(.58, .6, .48), step(.55, hash12(floor(vUv * 36.))) * .8 + step(d.y, -.015) * .4); }
        } else if (T == 3 && fi < 3.) {
          vec2 d = vUv - c + vec2(0., .14); float w = .05 * (1. - clamp((d.y + .14) / .3, 0., 1.));
          if (abs(d.x) < w + .02 && d.y > -.16 && d.y < .14) { flower = 1.; fcol = mix(vec3(.82, .3, .58), vec3(.95, .55, .78), step(.5, hash12(floor(vUv * 40.)))); }
        }
      }
    }
    if (v < 0. && flower < .5) discard;
    hgt = flower > .5 ? 1. : v;
    // слои травинки: корень тёмный, середина, кончик светлый тёплый; каждая пятая — сухая
    float dry = step(.82, hash12(vec2(sd, id + 11.)));
    vec3 c0 = T == 2 ? vec3(.2, .3, .16) : vec3(.12, .24, .14), c1 = T == 2 ? vec3(.42, .52, .26) : vec3(.3, .48, .22), c2 = T == 2 ? vec3(.72, .7, .42) : vec3(.62, .72, .3);
    c1 = mix(c1, vec3(.62, .55, .3), dry); c2 = mix(c2, vec3(.85, .75, .45), dry);
    if (uLook > .5) {
      if (T == 0) {        // пожухлая: серо-бурая, у половины обломан кончик, редкие зелёные
        if (hgt > .55 + .45 * hash12(vec2(sd, id + 21.))) discard;
        float alive = step(.85, hash12(vec2(sd, id + 31.)));
        c0 = vec3(.2, .18, .13); c1 = mix(vec3(.46, .4, .28), vec3(.3, .38, .22), alive); c2 = mix(vec3(.66, .6, .46), vec3(.5, .55, .32), alive);
      } else if (T == 1) { c0 = vec3(.14, .18, .14); c1 = vec3(.32, .38, .28); c2 = vec3(.5, .55, .44); }          // белена: сизая
      else if (T == 3) {   // болиголов: бледный стебель с багровыми крапинами
        c0 = vec3(.16, .22, .14); c1 = vec3(.4, .48, .3); c2 = vec3(.56, .6, .42);
        float spot = step(.78, hash12(floor(vec2(vUv.x * 70., vUv.y * 26.)))); c1 = mix(c1, vec3(.36, .14, .16), spot); c2 = mix(c2, vec3(.4, .16, .18), spot);
      }
    }
    base = mix(c0, c1, HT(clamp((hgt - .2) / .2, 0., 1.)));
    base = mix(base, c2, HT(clamp((hgt - .62) / .2, 0., 1.)));
    base *= tint;
    if (flower > .5) base = fcol;
    ink = (1. - smoothstep(.0, .06, hgt)) * .3;
  } else if (T == 4) {
    // папоротник: вайя с пёрышками-долями, жилка, тёмная середина розетки, светлые концы
    float t = vUv.y, u = vUv.x;
    float pin = abs(fract(t * 15. + abs(u) * 1.4) - .5) * 2.;
    float edge = (1. - t * .85) * (.45 + .55 * (1. - pin));
    if (abs(u) > edge + .08) discard;
    if (abs(u) > .12 && pin > .82) discard;
    hgt = t;
    base = mix(vec3(.08, .2, .12), vec3(.22, .44, .2), HT(clamp((t - .15) / .25, 0., 1.)));
    base = mix(base, vec3(.55, .7, .3), HT(clamp((t - .62) / .25, 0., 1.)));
    base *= tint;
    ink = max(step(abs(u), .045) * .5, (1. - smoothstep(.0, .12, edge - abs(u))) * .35);
  } else if (T == 5) {
    // мох: подушки (Вороной), щели тёмные, искры спор
    vec4 vr = vor(vUv * 6. + seed * 9.);
    float bump = clamp(dot(-vr.zw, vec2(-.4, .9)) * 1.6, -1., 1.);
    hgt = clamp(vH / .22, 0., 1.);
    base = mix(vec3(.13, .22, .1), vec3(.27, .4, .16), .5 + .5 * bump) * (.8 + .35 * vr.y);
    base = mix(base, vec3(.62, .68, .26), step(.93, hash12(floor(vUv * 40.))) * .7);
    ink = (1. - smoothstep(.02, .07, vr.x)) * .4;
    if (uLook > .5 && uLook < 1.5) {   // лишайник: серо-зелёные и охристые розетки с кольцами, плоская корка
      float f = fbm(vUv * 3.2 + seed * 5.), ring = abs(fract(length(vr.zw) * 3. + f * 1.5) - .5);
      base = mix(vec3(.36, .4, .33), vec3(.48, .43, .28), smoothstep(.4, .7, f)) * (.8 + .22 * vr.y);
      base = mix(base, vec3(.32, .36, .3), step(ring, .08) * .7);
      ink = (1. - smoothstep(.01, .04, vr.x)) * .25;
    } else if (uLook > 1.5) {          // плесень и гниль: чёрно-зелёная мокрая масса, белёсый пушок пятнами, жёлтые споры
      float f = fbm(vUv * 4. + seed * 3.);
      base = mix(vec3(.07, .09, .06), vec3(.18, .22, .1), .5 + .5 * bump) * (.8 + .3 * vr.y);
      base = mix(base, vec3(.7, .72, .62), smoothstep(.62, .78, f) * .8);
      base = mix(base, vec3(.7, .66, .2), step(.95, hash12(floor(vUv * 55.))) * .8);
      ink = (1. - smoothstep(.02, .06, vr.x)) * .5;
    }
    base *= tint;
    float r = length(vUv); if (r > .97 - .1 * vnoise(vUv * 6.) - (uLook > .5 ? .3 * vnoise(vUv * 3.5 + seed * 11.) : 0.)) discard;
    if (uLook > .5 && fbm(vUv * 5. + seed * 7.) < .3) discard;   // лишайник и плесень — рваные пятна с просветами
  } else if (T == 6) {
    // грибы: ножка светлая, шляпка по подвиду, у мухомора белые крапинки, пластинки под шляпкой тёмные
    float part = step(.35, vUv.y);
    float k = sub;
    vec3 cap = k < .25 ? vec3(.78, .14, .08) : k < .5 ? vec3(.42, .26, .14) : k < .75 ? vec3(.92, .6, .16) : vec3(.82, .8, .66);
    vec3 stem = k < .25 ? vec3(.92, .9, .8) : k < .5 ? vec3(.82, .76, .6) : k < .75 ? vec3(.92, .64, .22) : vec3(.86, .86, .76);
    base = mix(stem, cap, part);
    if (part > .5 && N.y < -.1) base = stem * .55;  // пластинки
    if (k < .25 && part > .5) { vec2 q = vec2(vUv.x * 2.2, vUv.y * 9.); float d = length(fract(q) - .5); base = mix(base, vec3(.96, .94, .86), step(d, .2) * step(.4, hash12(floor(q)))); }
    if (uLook > .5) {   // поганки: бледно-оливковые шляпки (бледная поганка) или серо-рыжие (ложный опёнок), юбка на ножке
      cap = k < .5 ? mix(vec3(.66, .7, .5), vec3(.82, .82, .68), vUv.y) : vec3(.62, .5, .3);
      stem = k < .5 ? vec3(.86, .87, .78) : vec3(.72, .66, .48);
      base = mix(stem, cap, part);
      if (part > .5 && N.y < -.1) base = stem * (k < .5 ? .8 : .45);
      if (part < .5 && abs(vUv.y - .24) < .025) base = stem * 1.05 + .04;
    }
    hgt = .4 + .6 * part;
    ink = 0.;
  } else if (T == 10) {
    // трутовик: годовые кольца от стены наружу, светлая кромка, тёмный низ с порами
    float r = vUv.x, ring = abs(fract(r * 5. + fbm(vUv * 6.) * .4) - .5);
    vec3 top = sub < .5 ? mix(vec3(.28, .2, .14), vec3(.6, .44, .24), r) : mix(vec3(.3, .3, .28), vec3(.55, .52, .44), r);
    top = mix(top, top * .65, step(ring, .1));
    top = mix(top, vec3(.85, .78, .6), smoothstep(.86, .95, r));
    base = N.y < -.2 ? vec3(.72, .66, .5) * (.75 + .25 * step(.5, hash12(floor(vUv * 60.)))) : top;
    hgt = .6; ink = smoothstep(.95, 1., r) * .4;
  } else if (T == 7) {
    // камни: крап, трещины, мох на макушке, лишайник
    base = vec3(.5, .48, .45) * (.82 + .26 * fbm(vUv * 3. + seed * 5.)) * tint;
    ink = step(.9, vnoise(vUv * vec2(3., 11.) + seed)) * .5;
    float mos = smoothstep(.45, .85, N.y) * smoothstep(.4, .7, fbm(vUv * 1.7 + seed * 3.));
    base = mix(base, vec3(.28, .4, .18), mos * .85);
    base = mix(base, vec3(.75, .72, .45), step(.94, vnoise(vUv * 13. + seed)) * .6);
    hgt = .5 + .5 * N.y;
  } else if (T == 8) {
    // кувшинки: лист с прожилками, у части белый цветок с жёлтой серединой
    float r = length(vUv);
    base = mix(vec3(.18, .36, .2), vec3(.34, .52, .24), .5 + .5 * sin(atan(vUv.y, vUv.x) * 9.));
    if (sub > .65 && r < .38) { base = mix(vec3(.96, .94, .88), vec3(.98, .8, .25), step(r, .14)); emis = .1; }
    ink = (1. - smoothstep(.9, .96, r)) * 0. + smoothstep(.9, .97, r) * .6;
    hgt = .6;
  } else {
    // черничник: листва (Вороной) и ягоды-точки
    vec4 vr = vor(vUv * 3.5 + seed * 7.);
    float bump = clamp(dot(-vr.zw, vec2(-.4, .9)) * 1.6, -1., 1.);
    base = mix(vec3(.12, .26, .16), vec3(.3, .48, .22), .5 + .5 * bump) * (.8 + .3 * vr.y) * tint;
    float berry = step(.86, hash12(floor(vUv * 18.))) * step(length(fract(vUv * 18.) - .5), .3);
    base = mix(base, sub > .5 ? vec3(.18, .2, .45) : vec3(.75, .12, .14), berry);
    ink = (1. - smoothstep(.02, .06, vr.x)) * .45;
    hgt = clamp(vH / .7, 0., 1.);
  }
  if (uDepthPass > .5) { if (uCast < .5) discard; oColor = vec4(1.); oNormal = vec4(0.); return; }

  // свет: форма + тень + облака, 3 тона с растровыми переходами (как у построек)
  float ndl = dot(N, uSunDir);
  float sh = shadowAt(vW + vec3(0., .12, 0.), ndl);
  if (uCloud > 0.) { float cl = clamp((cloudShade(vW.xz, uTime) - .5) / .1, 0., 1.); sh *= 1. - uCloud * HT(cl); }
  float form = T <= 5 || T == 8 ? clamp(.35 + hgt * .55 + ndl * .25, 0., 1.) : clamp(ndl * 1.3 + .1, 0., 1.);
  float v = form * mix(.22, 1., sh);
  vec3 lit = satC(base, 1.12) * uSunCol * 1.14;
  vec3 mid = satC(base, 1.2) * mix(uShadeCol, uSunCol, .55) * 1.02;
  vec3 shade = satC(base * uShadeCol, 1.4) * 1.05 + base * uBounce * .22 + base * uSkyCol * .08;
  vec3 c = mix(shade, mid, HT(clamp((v - .22) / .14, 0., 1.)));
  c = mix(c, lit, HT(clamp((v - .52) / .14, 0., 1.)));
  c = mix(c, satC(base * uDeepCol, 1.5), ink);
  c += base * emis;
  vec3 pl = vec3(0.);
  for (int i = 0; i < 16; i++) {
    if (float(i) >= uPLn) break;
    vec3 d = uPL[i].xyz - vW; float dist = length(d); float a = 1. - dist / uPL[i].w; if (a <= 0.) continue;
    float k = a * a; pl += uPLc[i] * (k > .38 ? .9 : k > .16 ? .55 : k > .05 ? .25 : 0.);
  }
  c += base * pl * uLightK;
  if (uAir > 0.) {   // воздушная перспектива, как у построек
    float farA = smoothstep(30., 280., vViewZ) * uAir * (1. - .7 * uNight), nearA = (1. - smoothstep(3., 26., vViewZ)) * uAir;   // ночью дали не белеют
    float lumc = dot(c, vec3(.3, .55, .15));
    c = mix(vec3(lumc), c, 1. + .04 * nearA - .1 * farA);
    c = (c - .2) * (1. + .06 * nearA - .1 * farA) + .2;
    c = max(mix(c, uFogCol * .85 + c * .15, farA * .05), 0.);
  }
  float fog = smoothstep(uFogNear, uFogFar, vViewZ);
  float mist = (1. - smoothstep(0., 7., vW.y)) * uMist * smoothstep(15., 110., vViewZ);
  fog = max(fog, mist);
  c = mix(c, mix(uFogCol, uFogCol * vec3(1.25, .75, .75), uChthon * .6), fog);
  oColor = vec4(c, 1.);
  // трава и мох пишут нормаль «как земля» — без чернильного контура вокруг каждой травинки
  vec3 vn = uOutline > .5 ? vViewN * (gl_FrontFacing ? 1. : -1.) : normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz);
  oNormal = vec4(vn * .5 + .5, uOutline > .5 ? 1. : .5);
}`;

function makeMat(P) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.DoubleSide,
    uniforms: { ...G, uType: { value: P.type }, uLook: { value: P.look ?? 0 }, uSwayK: { value: P.sway }, uFadeFar: { value: P.cast ? 260 : P.type <= 3 ? 150 : 200 }, uCast: { value: P.cast ? 1 : 0 }, uOutline: { value: P.outline ? 1 : 0 } },
    vertexShader: VERT,
    fragmentShader: `precision highp float;\nlayout(location = 0) out vec4 oColor;\nlayout(location = 1) out vec4 oNormal;\n${NOISE}\n${FRAG}`,
  });
}

// ---------- система ----------
export class Vegetation {
  constructor(scene, map, sys) {
    this.map = map; this.sys = sys; this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'vegetation'; scene.add(this.group);
    this.kinds = {};
    for (const id of PLANT_IDS) {
      const P = PLANTS[id];
      const geo = GEO[P.type]();
      const mesh = new THREE.InstancedMesh(geo, makeMat(P), P.max);
      mesh.count = 0; mesh.frustumCulled = false; mesh.raycast = () => {};
      const varA = new THREE.InstancedBufferAttribute(new Float32Array(P.max * 4), 4); varA.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iVar', varA);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (!P.cast) mesh.layers.set(1);   // в карту теней не попадает
      this.group.add(mesh);
      this.kinds[id] = { P, mesh, varA, list: [], dirty: true };
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3(); this._e = new THREE.Euler();
    this.seed = 12345;
  }
  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  // можно ли сюда посадить
  canGrow(id, x, z) {
    const P = PLANTS[id], m = this.map, c = m.worldToCell(x, z);
    if (!m.inBounds(c.cx, c.cz)) return false;
    const zone = m.zoneAtCell(c.cx, c.cz).key;
    if (!P.zones.includes(zone)) return false;
    if (zone === 'road' || zone === 'bridge') return false;
    const oc = this.sys.occ[c.cz * m.width + c.cx];
    if (oc > 0) return false;
    if (P.onWater && m.heightAtCell(c.cx, c.cz) > m.waterLevel - 0.25) return false;
    if ((id === 'grass' || id === 'meadow' || id === 'fireweed') && m.trample && m.trample[c.cz * m.width + c.cx] > 0.45) return false;
    return true;
  }
  add(id, x, z, o = {}) {
    const K = this.kinds[id]; if (!K || K.list.length >= K.P.max) return false;
    const P = K.P, y = P.onWater ? this.map.waterLevel - 0.22 : this.map.heightAt(x, z);
    const s = o.s ?? P.s[0] + (P.s[1] - P.s[0]) * this.rand();
    K.list.push({ x, y: o.y ?? y, z, ry: this.rand() * PI * 2, s, seed: this.rand(), hue: this.rand() * 2 - 1, sub: o.sub ?? this.rand(), n: o.n });
    K.dirty = true; return true;
  }
  // ---------- по объектам: мох, лишайник, грибы, трава на стенах, кровлях, брёвнах ----------
  // Треугольники меша рядом с точкой (в локальных координатах меша) — чтобы мазок не перебирал весь дом.
  _nearTris(mesh, pw, R) {
    const inv = this._inv || (this._inv = new THREE.Matrix4()); inv.copy(mesh.matrixWorld).invert();
    const pl = pw.clone().applyMatrix4(inv), g = mesh.geometry, P = g.attributes.position, I = g.index, n = I ? I.count : P.count;
    const out = [], R2 = (R + 0.6) ** 2, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) {
      const ia = I ? I.getX(i) : i, ib = I ? I.getX(i + 1) : i + 1, ic = I ? I.getX(i + 2) : i + 2;
      a.fromBufferAttribute(P, ia); b.fromBufferAttribute(P, ib); c.fromBufferAttribute(P, ic);
      const cx = (a.x + b.x + c.x) / 3 - pl.x, cy = (a.y + b.y + c.y) / 3 - pl.y, cz = (a.z + b.z + c.z) / 3 - pl.z;
      const ext = Math.max(a.distanceToSquared(b), b.distanceToSquared(c), c.distanceToSquared(a));
      if (cx * cx + cy * cy + cz * cz > R2 + ext) continue;
      out.push(new THREE.Triangle(a.clone(), b.clone(), c.clone()));
    }
    return { tris: out, M: mesh.matrixWorld, inv };
  }
  _rayTris(T, o, d) {   // ближайшее попадание луча (локальные координаты) в набор треугольников
    let best = null, bt = 1e9; const r = this._ray || (this._ray = new THREE.Ray()), hit = new THREE.Vector3();
    r.set(o, d);
    for (const t of T) { if (!r.intersectTriangle(t.a, t.b, t.c, false, hit)) continue; const dt = hit.distanceTo(o); if (dt < bt) { bt = dt; best = { p: hit.clone(), t }; } }
    return best;
  }
  // мазок по поверхности объекта: hit = { point, normal (мир), object }
  paintSurface(id, hit, r, strength = 1) {
    const P = PLANTS[id]; if (!P || !P.surf) return 0;
    const near = this._nearTris(hit.object, hit.point, r), nm = new THREE.Matrix3().getNormalMatrix(near.M);
    const n0 = hit.normal.clone().normalize(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
    t1.set(Math.abs(n0.y) < 0.9 ? 0 : 1, Math.abs(n0.y) < 0.9 ? 1 : 0, 0).cross(n0).normalize(); t2.crossVectors(n0, t1);
    const area = PI * r * r, want = Math.max(1, Math.round(area * P.dens * (P.type === 5 ? 1.6 : 0.7) * strength));   // по объектам — мелкие частые пятна
    const nL = n0.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(near.inv)).normalize();
    const o = new THREE.Vector3(), d = nL.clone().negate(), q = new THREE.Vector3(), nW = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < want * 3 && n < want; i++) {
      const a = this.rand() * PI * 2, dd = Math.sqrt(this.rand()) * r;
      q.copy(hit.point).addScaledVector(t1, Math.cos(a) * dd).addScaledVector(t2, Math.sin(a) * dd).applyMatrix4(near.inv);
      o.copy(q).addScaledVector(nL, 0.7);
      const h = this._rayTris(near.tris, o, d); if (!h || h.p.distanceTo(o) > 1.6) continue;
      h.t.getNormal(nW); if (nW.dot(d) > 0) nW.negate();
      nW.applyMatrix3(nm).normalize();
      if (nW.dot(n0) < 0.25) continue;
      // пятно целиком должно лежать на поверхности: по краю 4 пробы, иначе пятно мельче или пропуск
      const nLh = nW.clone(); h.t.getNormal(nLh); if (nLh.dot(d) > 0) nLh.negate();
      const b1 = new THREE.Vector3(Math.abs(nLh.y) < 0.9 ? 0 : 1, Math.abs(nLh.y) < 0.9 ? 1 : 0, 0).cross(nLh).normalize(), b2 = new THREE.Vector3().crossVectors(nLh, b1);
      const rad = P.type === 5 ? 0.55 : P.type === 10 ? 0.25 : P.type <= 4 ? 0.35 : 0.2;
      let fit = 0;
      for (const k of [1, 0.6, 0.35]) {
        const R0 = rad * P.s[1] * k; let ok = true;
        for (let e = 0; e < 4 && ok; e++) { const ang = e * PI / 2 + 0.4; const oo = h.p.clone().addScaledVector(b1, Math.cos(ang) * R0).addScaledVector(b2, Math.sin(ang) * R0).addScaledVector(nLh, 0.25); const hh = this._rayTris(near.tris, oo, nLh.clone().negate()); if (!hh || hh.p.distanceTo(oo) > 0.45) ok = false; }
        if (ok) { fit = k; break; }
      }
      if (!fit) continue;
      const pw = h.p.applyMatrix4(near.M).addScaledVector(nW, -0.015);
      if (this._crowded3(id, pw, (P.type === 5 ? 0.45 : 1) / Math.sqrt(P.dens * 1.4))) continue;
      const nn = [nW.x, nW.y, nW.z];
      if (P.cluster) { const sub = this.rand(), k = 1 + Math.floor(this.rand() * Math.min(3, P.cluster)); for (let j = 0; j < k; j++) { const e = (this.rand() - 0.5) * 0.35, f = (this.rand() - 0.5) * 0.35; t1.set(Math.abs(nW.y) < 0.9 ? 0 : 1, Math.abs(nW.y) < 0.9 ? 1 : 0, 0).cross(nW).normalize(); t2.crossVectors(nW, t1); const pp = pw.clone().addScaledVector(t1, e).addScaledVector(t2, f); if (this.add(id, pp.x, pp.z, { y: pp.y, n: nn, sub, s: P.s[0] + (P.s[1] - P.s[0]) * this.rand() * 0.7 })) n++; } }
      else if (this.add(id, pw.x, pw.z, { y: pw.y, n: nn, s: (P.s[0] + (P.s[1] - P.s[0]) * this.rand()) * fit })) n++;
      t1.set(Math.abs(n0.y) < 0.9 ? 0 : 1, Math.abs(n0.y) < 0.9 ? 1 : 0, 0).cross(n0).normalize(); t2.crossVectors(n0, t1);
    }
    return n;
  }
  _crowded3(id, p, minD) {
    const L = this.kinds[id].list, d2 = minD * minD;
    for (let i = L.length - 1, c = 0; i >= 0 && c < 600; i--, c++) { const q = L[i]; if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 + (q.z - p.z) ** 2 < d2) return true; }
    return false;
  }
  // постройку снесли или пересобрали — растения на её поверхностях убрать
  removeInBox(box) {
    for (const id of PLANT_IDS) {
      const K = this.kinds[id], before = K.list.length;
      K.list = K.list.filter(p => !p.n || !box.containsPoint(this._p.set(p.x, p.y, p.z)));
      if (K.list.length !== before) K.dirty = true;
    }
  }
  // старая постройка обрастает: мох и лишайник на кровле и нижних венцах, гниль у земли, трутовики на брёвнах
  overgrow(it, rich = 1) {
    const box = new THREE.Box3().setFromObject(it.group), meshes = []; it.group.traverse(o => { if (o.isMesh && o.layers.test(this._lay || (this._lay = new THREE.Layers()))) meshes.push(o); });
    if (!meshes.length) return;
    const rc = new THREE.Raycaster(), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const shoot = (from, dir) => { rc.set(from, dir.normalize()); const h = rc.intersectObjects(meshes, false)[0]; if (!h) return null; const nW = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (nW.dot(dir) > 0) nW.negate(); return { point: h.point, normal: nW, object: h.object }; };
    const K = (a, b) => a + (b - a) * this.rand();
    for (let i = 0; i < 16 * rich; i++) {   // сверху: кровля
      const h = shoot(new THREE.Vector3(K(box.min.x, box.max.x), box.max.y + 2, K(box.min.z, box.max.z)), new THREE.Vector3(0, -1, 0)); if (!h || h.point.y < box.min.y + 0.5) continue;
      this.paintSurface(this.rand() < 0.45 ? 'moss' : this.rand() < 0.6 ? 'lichen' : 'deadgrass', h, K(0.6, 1.4), 0.9);
    }
    for (let i = 0; i < 20 * rich; i++) {   // сбоку: нижние венцы, у земли
      const a = this.rand() * PI * 2, dir = new THREE.Vector3(-Math.cos(a), 0, -Math.sin(a)), R = Math.max(sz.x, sz.z);
      const h = shoot(new THREE.Vector3(c.x + Math.cos(a) * R, box.min.y + K(0.1, Math.min(1.6, sz.y * 0.4)), c.z + Math.sin(a) * R), dir); if (!h) continue;
      const r = this.rand();
      this.paintSurface(r < 0.3 ? 'mold' : r < 0.55 ? 'lichen' : r < 0.75 ? 'moss' : r < 0.9 ? 'trutovik' : 'toadstool', h, K(0.4, 0.9), 0.8);
    }
  }
  // мазок кисти: n растений в круге (с проверкой места и густоты)
  paint(id, x, z, r, strength = 1) {
    const P = PLANTS[id]; if (!P) return 0;
    const area = PI * r * r, want = Math.max(1, Math.round(area * P.dens * 0.25 * strength));
    let n = 0;
    for (let i = 0; i < want * 3 && n < want; i++) {
      const a = this.rand() * PI * 2, d = Math.sqrt(this.rand()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (!this.canGrow(id, px, pz)) continue;
      if (this._crowded(id, px, pz, 1 / Math.sqrt(P.dens * 1.4))) continue;
      if (P.cluster) { const sub = this.rand(); const k = 1 + Math.floor(this.rand() * P.cluster); for (let j = 0; j < k; j++) if (this.add(id, px + (this.rand() - 0.5) * 0.5, pz + (this.rand() - 0.5) * 0.5, { sub })) n++; }
      else if (this.add(id, px, pz)) n++;
    }
    return n;
  }
  _crowded(id, x, z, minD) {
    const L = this.kinds[id].list, d2 = minD * minD;
    for (let i = L.length - 1, c = 0; i >= 0 && c < 400; i--, c++) { const p = L[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < d2) return true; }
    return false;
  }
  erase(x, z, r, only = null, y = null) {
    let n = 0;
    for (const id of PLANT_IDS) {
      if (only && only !== id) continue;
      const K = this.kinds[id], before = K.list.length;
      K.list = K.list.filter(p => (p.x - x) ** 2 + (p.z - z) ** 2 + (y === null ? 0 : (p.y - y) ** 2) > r * r);
      if (K.list.length !== before) { K.dirty = true; n += before - K.list.length; }
    }
    return n;
  }
  // убрать растения с клеток (постройка встала) и пересадить по высоте вокруг (земляные работы)
  clearCells(x0, z0, x1, z1) {
    const m = this.map, ox = m.origin.x, oz = m.origin.z;
    for (const id of PLANT_IDS) {
      const K = this.kinds[id]; let ch = false;
      K.list = K.list.filter(p => {
        const cx = Math.floor(p.x - ox), cz = Math.floor(p.z - oz);
        if (p.n || cx < x0 - 6 || cx > x1 + 6 || cz < z0 - 6 || cz > z1 + 6) return true;
        ch = true;
        if (this.sys.occ[cz * m.width + cx] > 0) return false;
        if (!K.P.onWater) p.y = m.heightAt(p.x, p.z);
        return true;
      });
      if (ch) K.dirty = true;
    }
  }
  update() {
    for (const id of PLANT_IDS) {
      const K = this.kinds[id]; if (!K.dirty) continue; K.dirty = false;
      const L = K.list, mesh = K.mesh, arr = K.varA.array;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        if (p.n && K.P.shelf && Math.abs(p.n[1]) < 0.7) this._q.setFromEuler(this._e.set(0, Math.atan2(p.n[0], p.n[2]), 0));   // полка растёт от стены
        else if (p.n) { this._up = this._up || new THREE.Vector3(0, 1, 0); this._nv = (this._nv || new THREE.Vector3()).fromArray(p.n); this._q.setFromUnitVectors(this._up, this._nv); this._q2 = (this._q2 || new THREE.Quaternion()).setFromEuler(this._e.set(0, p.ry, 0)); this._q.multiply(this._q2); }
        else this._q.setFromEuler(this._e.set(0, p.ry, 0));
        const s = p.s * (p.n ? (K.P.type <= 4 ? 0.7 : K.P.type === 5 ? 0.55 : 1) : 1);   // на стенах и кровлях трава, папоротник и мох мельче
        this._m.compose(this._p.set(p.x, p.y, p.z), this._q, this._s.set(s, s, s));
        mesh.setMatrixAt(i, this._m);
        arr[i * 4] = p.seed; arr[i * 4 + 1] = p.hue; arr[i * 4 + 2] = p.sub; arr[i * 4 + 3] = 0;
      }
      mesh.count = L.length;
      mesh.instanceMatrix.needsUpdate = true; K.varA.needsUpdate = true;
    }
  }
  count() { let n = 0; for (const id of PLANT_IDS) n += this.kinds[id].list.length; return n; }

  // Засев «как в природе»: трава по лугу (гуще у заборов и опушек, реже на утоптанном), разнотравье пятнами,
  // в лесу папоротник, мох, грибы, черничник; камыш и кувшинки у воды; иван-чай на гарях и у заброшенного.
  autoScatter(forest) {
    const m = this.map, W = m.width, H = m.height, ox = m.origin.x, oz = m.origin.z;
    const nz = (x, z, f, o = 0) => Math.sin(x * f + o) * Math.sin(z * f * 1.13 + o * 1.7) * 0.5 + Math.sin(x * f * 2.3 - z * f * 1.9 + o) * 0.25;
    const treeNear = (cx, cz, r) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (m.inBounds(cx + dx, cz + dz) && this.sys.occ[(cz + dz) * W + cx + dx] === -1) return true; return false; };
    for (let cz = 1; cz < H - 1; cz += 2) for (let cx = 1; cx < W - 1; cx += 2) {
      const x = ox + cx + this.rand() * 2, z = oz + cz + this.rand() * 2, zone = m.zoneAtCell(cx, cz).key;
      const forestHere = treeNear(cx, cz, 2), shoreHere = zone === 'shore' || zone === 'shallow';
      const meadow = nz(x, z, 0.035, 3) > 0.12, n2 = nz(x, z, 0.09, 7);
      if (zone === 'ground' || zone === 'slope' || zone === 'border') {
        if (forestHere) {
          if (this.rand() < 0.45) this.paint('fern', x, z, 1.2, 0.8);
          if (this.rand() < 0.25) this.paint('moss', x, z, 1.0, 0.7);
          if (this.rand() < 0.12) this.paint('mushroom', x, z, 0.8, 0.6);
          if (this.rand() < 0.15) this.paint('bush', x, z, 1.0, 0.7);
          if (this.rand() < 0.3) this.paint('grass', x, z, 1.0, 0.6);
        } else {
          if (this.rand() < (0.55 + 0.35 * n2)) this.paint('grass', x, z, 1.1, 0.75);
          if (meadow && this.rand() < 0.5) this.paint('meadow', x, z, 1.1, 0.8);
          if (n2 > 0.32 && this.rand() < 0.12) this.paint('fireweed', x, z, 1.0, 0.7);
          if (this.rand() < 0.03) this.paint('stones', x, z, 1.2, 0.8);
          if (this.rand() < 0.02) this.paint('moss', x, z, 0.8, 0.6);
        }
        if (zone === 'slope' && this.rand() < 0.08) this.paint('stones', x, z, 1.4, 1);
      }
      if (shoreHere || zone === 'water') {
        if ((shoreHere || m.heightAtCell(cx, cz) > m.waterLevel - 0.9) && this.rand() < (shoreHere ? 0.5 : 0.25)) this.paint('reeds', x, z, 1.3, 1);
        if (this.rand() < 0.05) this.paint('stones', x, z, 1, 0.8);
        if (n2 > 0.1 && this.rand() < 0.25) this.paint('lily', x, z, 1.4, 1);
      }
    }
    // у заброшенных построек — иван-чай и бурьян, вдоль фундаментов — высокая трава, на северной стороне мох
    for (const it of this.sys.items.values()) {
      if (it.line) continue;
      const c = it.group.position, w = it.fw, d = it.fd;
      for (let i = 0; i < (it.ab ? 14 : 6); i++) {
        const side = this.rand() < 0.5, x = c.x + (side ? (this.rand() - 0.5) * w : (this.rand() < 0.5 ? -1 : 1) * (w / 2 + 0.4)), z = c.z + (side ? (this.rand() < 0.5 ? -1 : 1) * (d / 2 + 0.4) : (this.rand() - 0.5) * d);
        this.paint(it.ab ? (this.rand() < 0.5 ? 'fireweed' : 'grass') : 'grass', x, z, 0.8, 1.2);
      }
      if (it.ab) { this.paint('moss', c.x, c.z - d / 2 - 0.5, 1.5, 1); this.overgrow(it, 1); }
    }
    this.update();
  }
  // сохранение: компактно, в base64 (x,z — сантиметры от начала карты; масштаб, зерно, подвид — байты)
  toJSON() {
    const out = {};
    for (const id of PLANT_IDS) {
      const L = this.kinds[id].list, P = this.kinds[id].P; if (!L.length) continue;
      // запись 13 байт: x, z (см), масштаб, зерно, подвид, флаги (1 — на объекте), высота (см от −50 м), нормаль ×127
      const R = 13, buf = new DataView(new ArrayBuffer(L.length * R));
      L.forEach((p, i) => {
        const o = i * R;
        buf.setUint16(o, Math.round((p.x - this.map.origin.x) * 100)); buf.setUint16(o + 2, Math.round((p.z - this.map.origin.z) * 100));
        buf.setUint8(o + 4, Math.round((p.s - P.s[0]) / (P.s[1] - P.s[0] || 1) * 255)); buf.setUint8(o + 5, Math.round(p.seed * 255)); buf.setUint8(o + 6, Math.round(p.sub * 255));
        buf.setUint8(o + 7, p.n ? 1 : 0); buf.setUint16(o + 8, Math.max(0, Math.min(65535, Math.round((p.y + 50) * 100))));
        const nn = p.n || [0, 1, 0]; buf.setInt8(o + 10, Math.round(nn[0] * 127)); buf.setInt8(o + 11, Math.round(nn[1] * 127)); buf.setInt8(o + 12, Math.round(nn[2] * 127));
      });
      let s = ''; const u8 = new Uint8Array(buf.buffer); for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192));
      out[id] = btoa(s);
    }
    return { format: 'vegetation/2', kinds: out };
  }
  load(j) {
    if (!j || (j.format !== 'vegetation/1' && j.format !== 'vegetation/2')) return false;
    const R = j.format === 'vegetation/2' ? 13 : 7;   // старые сохранения (/1) читаются как раньше
    for (const id of PLANT_IDS) {
      const K = this.kinds[id]; K.list = []; K.dirty = true;
      const b = j.kinds[id]; if (!b) continue;
      const bin = atob(b), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const dv = new DataView(u8.buffer), P = K.P;
      for (let i = 0; i + R <= u8.length; i += R) {
        const x = this.map.origin.x + dv.getUint16(i) / 100, z = this.map.origin.z + dv.getUint16(i + 2) / 100;
        const s = P.s[0] + dv.getUint8(i + 4) / 255 * (P.s[1] - P.s[0]), seed = dv.getUint8(i + 5) / 255, sub = dv.getUint8(i + 6) / 255;
        const onObj = R === 13 && (dv.getUint8(i + 7) & 1);
        const n = onObj ? (() => { const v = new THREE.Vector3(dv.getInt8(i + 10), dv.getInt8(i + 11), dv.getInt8(i + 12)).normalize(); return [v.x, v.y, v.z]; })() : undefined;
        const y = onObj ? dv.getUint16(i + 8) / 100 - 50 : P.onWater ? this.map.waterLevel - 0.22 : this.map.heightAt(x, z);
        K.list.push({ x, z, y, ry: seed * PI * 2, s, seed, hue: seed * 2 - 1, sub, n });
      }
    }
    this.update();
    return true;
  }
}
