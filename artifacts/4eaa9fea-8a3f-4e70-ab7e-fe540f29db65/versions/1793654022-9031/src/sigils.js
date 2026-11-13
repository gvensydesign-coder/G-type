// Светящиеся узоры и руны из стиля игры («Аркейн», style-lab/airsigils.js и arc_sigil.gdshaderinc), перенесены без изменений рисунка:
// 1) узоры в воздухе: круги с лучами, звёзды, спирали, ромбы, цветы из дуг, дробные кольца; висят меж деревьев и в дымке,
//    проступают, медленно вращаются и гаснут, затем появляются в другом месте;
// 2) узоры на небе (в skyMat, функция SIGIL_GLSL);
// 3) руны на камне стража: угловатые знаки поясом, ночью светятся.
// Цвет — бледный оттенок окружения (как в игре), днём узоры еле видны, утром и ночью ярче.
import * as THREE from 'three';
import { G } from './materials.js';
import { NOISE, GLOBAL_DECL } from './glsl.js';

export const SIGIL_GLSL = /* glsl */`
float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sgRing(float r, float R, float w){ return smoothstep(w, 0., abs(r - R)); }
float sgTicks(float a, float n, float r, float R, float len, float w){
  float s = abs(fract(a * n / 6.2831853 + .5) - .5) * 6.2831853 / n * r;
  return smoothstep(w, 0., s) * step(abs(r - R), len); }
mat2 sgRot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sigil(vec2 p, float seed, float t, float pxw){
  float px = pxw;
  float rr = length(p), m = 0.;
  vec2 q = p + 0.004 * vec2(sin(p.y * 40. + seed), cos(p.x * 37. + seed));
  float rs = h11(seed) * 6.28;
  vec2 a1 = sgRot(rs + t * .02) * q, a2 = sgRot(-t * .035 + rs) * q, a3 = sgRot(t * .008) * q;
  float r = length(q);
  m = max(m, sgRing(r, 1.0, px)); m = max(m, sgRing(r, .985, px * .8) * step(.5, h11(seed + 3.)));
  m = max(m, sgRing(r, .68, px));
  m = max(m, sgRing(r, .24, px)); m = max(m, sgRing(r, .15, px * 1.5));
  m = max(m, sgTicks(atan(a2.y, a2.x), 24., length(a2), .2, .025, px) * .9);
  m = max(m, sgTicks(atan(a3.y, a3.x), 72., length(a3), .68, .02, px) * step(.2, sin(atan(a3.y, a3.x) * 2. + seed)));
  float an = atan(a1.y, a1.x), sec = 6.2831853 / 14.;
  float id = floor(an / sec + .5), d = abs(an - id * sec) * r;
  float lg = step(mod(id + 14., 4.), .5);
  float ray = smoothstep(px * .8, 0., d) * step(.04, r) * step(r, mix(.7, 1.15, lg));
  m = max(m, ray * (.5 + .5 * step(.3, h21(vec2(id, seed)))));
  for (int i = 0; i < 3; i++) {
    float a = h11(seed + float(i) * 7.) * 6.28 + t * .01 * float(i + 1);
    float dd = length(q - vec2(cos(a), sin(a)) * .99);
    m = max(m, max(sgRing(dd, .06, px), smoothstep(.018, 0., dd)));
  }
  float flick = .75 + .25 * h21(vec2(id, floor(t * 8.) + seed));
  float life = smoothstep(.2, .5, sin(t * .15 + seed * 6.28) * .5 + .5);
  return clamp(m * flick * life * smoothstep(1.2, .95, rr), 0., 1.);
}
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
// шесть форм, как в игре: круг с лучами, звезда-многоугольник, спираль, ромб с квадратом, цветок из дуг, дробные кольца
float sigilVariant(vec2 p, float kind, float seed, float t, float px){
  if (kind < .5) return sigil(p, seed, t, px);
  float r = length(p), m = 0.;
  vec2 q = sgRot(h11(seed) * 6.28 + t * .01) * p;
  float ang = atan(q.y, q.x);
  if (kind < 1.5) {
    float n = 5. + floor(h11(seed + 2.) * 4.), k = floor(2. + h11(seed + 5.) * (n * .5 - 1.5));
    m = max(m, sgRing(r, .92, px));
    if (h11(seed + 9.) > .5) m = max(m, sgRing(r, .36, px));
    for (int i = 0; i < 9; i++) {
      if (float(i) >= n) break;
      float a0 = float(i) / n * 6.2832, a1 = (float(i) + k) / n * 6.2832;
      vec2 v0 = .92 * vec2(cos(a0), sin(a0)), v1 = .92 * vec2(cos(a1), sin(a1));
      m = max(m, smoothstep(px, 0., segD(q, v0, v1)));
      m = max(m, smoothstep(.04, .0, length(q - v0)) * .8);
    }
  } else if (kind < 2.5) {
    float turns = 3. + floor(h11(seed + 3.) * 3.), f = r * turns - ang / 6.2832 - t * .01;
    float d = min(fract(f), 1. - fract(f)) / turns;
    m = max(m, smoothstep(px, 0., d) * step(r, .96) * step(.05, r));
    for (int i = 0; i < 8; i++) { float a = float(i) * .785 + h11(seed) * 6.; m = max(m, smoothstep(.035, .0, length(q - .97 * vec2(cos(a), sin(a)))) * .9); }
    m = max(m, sgRing(r, .99, px * .8) * step(.5, fract(ang * 1.9 + h11(seed + 4.))));
  } else if (kind < 3.5) {
    float dm = abs(abs(q.x) + abs(q.y) - .85) * .707, sq = abs(max(abs(q.x), abs(q.y)) - .55);
    m = max(m, smoothstep(px, 0., dm)); m = max(m, smoothstep(px, 0., sq) * .9);
    float cr = min(abs(q.x), abs(q.y));
    m = max(m, smoothstep(px, 0., cr) * step(r, .95) * step(.5, fract(r * 5. + .2)));
    for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708; m = max(m, sgRing(length(q - .85 * vec2(cos(a), sin(a))), .09, px)); }
    m = max(m, sgRing(r, .98, px) * step(.5, fract(ang * 1.6)));
  } else if (kind < 4.5) {
    float n = 6. + floor(h11(seed + 6.) * 3.);
    for (int i = 0; i < 9; i++) { if (float(i) >= n) break; float a = float(i) / n * 6.2832; m = max(m, smoothstep(px, 0., abs(length(q - .48 * vec2(cos(a), sin(a))) - .48)) * step(r, 1.)); }
    m = max(m, sgRing(r, .1, px)); m = max(m, sgRing(r, .99, px * .8));
  } else {
    for (int i = 0; i < 5; i++) {
      float fi = float(i), R = .25 + fi * .17;
      float win = step(fract(ang / 6.2832 + h11(seed + fi * 3.)), .45 + .35 * h11(seed + fi));
      m = max(m, sgRing(r, R, px * (1. + .5 * h11(seed + fi))) * win);
    }
    m = max(m, sgTicks(ang, 18., r, .95, .08, px));
  }
  return clamp(m, 0., 1.) * (.8 + .2 * h21(vec2(floor(t * 6.), seed)));
}
`;

// Руны: угловатые знаки из 2–4 черт в клетке (ствол + ветви), как резьба. Возвращает маску линии.
export const RUNE_GLSL = /* glsl */`
float runeGlyph(vec2 f, vec2 cell, float w){
  float m = 0.;
  float h = hash12(cell);
  // ствол: вертикальная черта
  m = max(m, smoothstep(w, 0., segD(f, vec2(.5, .12), vec2(.5, .88))));
  for (int i = 0; i < 3; i++) {
    float hi = hash12(cell + float(i) * 3.1);
    if (hi < .25) continue;
    float y0 = .2 + floor(hi * 3.) * .25, side = hash12(cell + float(i) * 7.7) > .5 ? 1. : -1.;
    float y1 = y0 + (hash12(cell + float(i) * 5.3) - .5) * .5;
    m = max(m, smoothstep(w, 0., segD(f, vec2(.5, y0), vec2(.5 + side * .3, y1))));
  }
  if (h > .7) m = max(m, smoothstep(w, 0., abs(length(f - vec2(.5, .5)) - .22)) * step(.5, f.y)); // дуга
  return m;
}
`;

// ---------- узоры в воздухе ----------
export function makeAirSigils(scene, rnd) {
  // якоря вокруг поляны: меж деревьев, в дымке за стражем, над ручьём, в далёком лесу
  const ANCH = [
    { x: -21, z: -26, y: 8.5, R: 6.5, a: 0.9 }, { x: 26, z: -30, y: 9.5, R: 7, a: 0.85 },
    { x: 4, z: -62, y: 16, R: 15, a: 0.6 }, { x: -42, z: -55, y: 12, R: 12, a: 0.55 },
    { x: 38, z: -12, y: 9, R: 7.5, a: 0.8 }, { x: -34, z: 2, y: 8, R: 6.5, a: 0.8 },
    { x: 9, z: -16, y: 7.5, R: 4.5, a: 0.9 }, { x: -12, z: -14, y: 6, R: 4, a: 0.9 },
    { x: 0, z: -11, y: 2.6, R: 2.6, a: 0.8, low: true }, // над ручьём за стражем
    { x: 30, z: -48, y: 13, R: 10, a: 0.65 },
  ];
  const quad = new THREE.PlaneGeometry(2, 2);
  const mk = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: Object.assign({ uKind: { value: 0 }, uW: { value: 1 }, uA: { value: 0 }, uSeed: { value: 1 }, uT: { value: 0 }, uCol: { value: new THREE.Vector3(0.6, 0.9, 0.8) }, uC: { value: new THREE.Vector3() }, uS: { value: 1 } }, G),
    vertexShader: `uniform vec3 uC; uniform float uS; varying vec2 vP; varying float vZ;
      void main(){
        vP = position.xy * 1.2;
        vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 w = uC + (r * position.x + u * position.y) * uS * 1.2;
        vec4 mv = viewMatrix * vec4(w, 1.); vZ = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: GLOBAL_DECL + NOISE + SIGIL_GLSL + /* glsl */`
      varying vec2 vP; varying float vZ;
      uniform float uA, uSeed, uT, uKind, uW; uniform vec3 uCol;
      void main(){
        float pxw = (fwidth(vP.x) * 1.15 + .004) * uW;
        float m = sigilVariant(vP, uKind, uSeed, uT, pxw);
        float halo = sigilVariant(vP, uKind, uSeed, uT, pxw * 9.);   // аура: толстые размытые линии ступенями
        m = max(m, (halo > .55 ? .13 : halo > .22 ? .06 : 0.));
        float er = smoothstep(.3, .55, fbm2(vP * 4.5 + uSeed * 9. + uTime * .03));   // линии местами стёрты кистью
        m *= mix(.35, 1., er);
        m *= 1. - smoothstep(.85, 1.1, length(vP));
        gl_FragColor = vec4(uCol * m * uA, 1.);
      }`,
  });
  const group = new THREE.Group();
  const slots = [];
  for (let i = 0; i < 3; i++) {
    const mat = mk(); const mesh = new THREE.Mesh(quad, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 8; mesh.visible = false; group.add(mesh);
    slots.push({ mesh, mat, anchor: null, t: -i * 3.5, life: 9, seed: rnd() * 10, drift: [0, 0] });
  }
  scene.add(group);
  const used = new Set();
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), v = new THREE.Vector3();
  function begin(s, camera) {
    if (s.anchor) used.delete(s.anchor);
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    const free = ANCH.filter((a) => !used.has(a));
    const vis = free.filter((a) => fr.containsPoint(v.set(a.x, a.y, a.z)) && v.distanceTo(camera.position) > a.R * 1.6);
    const arr = vis.length ? vis : free;
    s.anchor = arr[Math.floor(rnd() * arr.length)]; used.add(s.anchor);
    s.t = -(2 + rnd() * 4); s.life = 8 + rnd() * 5; s.seed = rnd() * 10;
    s.drift = [(rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.35];
    const u = s.mat.uniforms; u.uSeed.value = s.seed; u.uKind.value = Math.floor(rnd() * 6); u.uW.value = 0.8 + rnd() * 1.1;
    s.tOff = (Math.PI / 2 - s.seed * 6.28318) / 0.15; // фаза «жизни» внутри sigil(): узор полностью проявлен
  }
  return {
    group, slots,
    // k: яркость от времени суток (день слабо, ночь ярко), col: оттенок окружения
    update(dt, camera, k, col, count) {
      slots.forEach((s, i) => {
        if (i >= count || k <= 0.001) { s.mesh.visible = false; return; }
        if (!s.anchor) begin(s, camera);
        s.t += dt;
        if (s.t > s.life) begin(s, camera);
        if (s.t < 0) { s.mesh.visible = false; return; }
        const fi = Math.min(1, s.t / 1.2), fo = Math.min(1, (s.life - s.t) / 1.0);
        const e = Math.max(0, Math.min(fi, fo)); const ee = e * e * (3 - 2 * e);
        const a = s.anchor, u = s.mat.uniforms;
        const d = Math.hypot(a.x - camera.position.x, a.z - camera.position.z);
        u.uA.value = ee * a.a * k * (1 + Math.min(1.4, d / 45)); // дальше — ярче: дымка съедает
        u.uT.value = s.tOff + s.t * 0.6;
        u.uC.value.set(a.x + s.drift[0] * s.t * 0.5, a.y + s.drift[1] * s.t * 0.5, a.z);
        u.uS.value = a.R; u.uCol.value.copy(col);
        s.mesh.visible = ee > 0.002;
      });
    },
  };
}
