// Витрина «Рисованного» стиля: шары материалов, огонь и вода, Богатырь и Леший,
// сутки по палитрам игры (TOD_PNT + PNT_PAL из world_light.gd) и аура.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PaintStyle, PaintPost, PaintedSky, PRESETS, GLSL_NOISE } from './paintfx.js';
import { FaceMarks, EmotionMarks } from './emotions.js';
import { loadScribbles, applyHandDrawn, HandGlow, sampleAtlas } from './handdrawn.js';
import { PaintedAura, PaintedTufts, ArcStrokes, elementHand, addShell, LampFX, PaintedFire } from './elementfx.js';
import { loadZones, zonePoints, zoneSides, ZoneGlow } from './zones.js';
import { kindMaterial, WORLD } from './matfx.js';

const $ = (s) => document.querySelector(s);
const errBox = $('#err');
window.addEventListener('error', (e) => { errBox.textContent += (e.message || e) + '\n'; });

const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 900);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = 1.5; controls.minDistance = 3; controls.maxDistance = 24;
const style = new PaintStyle(PRESETS.rus.params);
const post = new PaintPost(renderer, style);
const marks = new EmotionMarks(style);
const clock = new THREE.Clock();
const scene = new THREE.Scene();

// ------------------------------------------------------------ палитры игры (линейные цвета, как в world_light.gd)
const V = (x, y, z) => [x, y, z];
const TOD = {
  morning: { sun: V(-0.8, 0.3, 0.35), sunCol: V(1.3, 0.95, 0.68), pExp: 0.85, pSh: V(0.027, 0.042, 0.065), pDeep: V(0.0044, 0.0052, 0.0069), ambSky: V(0.12, 0.13, 0.17),
    fog: V(0.2, 0.2, 0.24), pHaze: V(0.16, 0.17, 0.22), skyTop: V(0.09, 0.13, 0.24), skyMid: V(0.38, 0.32, 0.36), skyHor: V(0.8, 0.5, 0.32), glowC: V(1.0, 0.72, 0.48),
    cLit: V(0.9, 0.62, 0.48), cSh: V(0.3, 0.26, 0.36), night: 0.2, rimCol: V(1.0, 0.8, 0.6) },
  day: { sun: V(-0.5, 0.75, 0.45), sunCol: V(1.25, 1.15, 0.95), pExp: 1.0, pSh: V(0.027, 0.042, 0.065), pDeep: V(0.0044, 0.0052, 0.0069), ambSky: V(0.18, 0.22, 0.27),
    fog: V(0.36, 0.42, 0.46), pHaze: V(0.3, 0.36, 0.4), skyTop: V(0.12, 0.22, 0.4), skyMid: V(0.36, 0.46, 0.56), skyHor: V(0.66, 0.66, 0.6), glowC: V(1.0, 0.94, 0.8),
    cLit: V(0.95, 0.9, 0.82), cSh: V(0.42, 0.44, 0.56), night: 0.0, rimCol: V(1.0, 0.95, 0.85) },
  evening: { sun: V(0.8, 0.22, -0.45), sunCol: V(1.4, 0.78, 0.48), pExp: 0.74, pSh: V(0.05, 0.02, 0.07), pDeep: V(0.006, 0.003, 0.009), ambSky: V(0.08, 0.07, 0.12),
    fog: V(0.12, 0.08, 0.1), pHaze: V(0.1, 0.08, 0.12), skyTop: V(0.04, 0.05, 0.12), skyMid: V(0.3, 0.14, 0.16), skyHor: V(0.9, 0.38, 0.16), glowC: V(1.0, 0.6, 0.32),
    cLit: V(0.9, 0.45, 0.28), cSh: V(0.24, 0.12, 0.2), night: 0.5, rimCol: V(1.0, 0.65, 0.42) },
  night: { sun: V(0.224, 0.894, -0.403), sunCol: V(0.8, 0.95, 1.7), pExp: 0.42, pSh: V(0.043, 0.009, 0.08), pDeep: V(0.0033, 0.0018, 0.006), ambSky: V(0.05, 0.045, 0.11),
    fog: V(0.018, 0.012, 0.035), pHaze: V(0.07, 0.045, 0.13), skyTop: V(0.006, 0.004, 0.02), skyMid: V(0.02, 0.012, 0.045), skyHor: V(0.07, 0.035, 0.1), glowC: V(0.7, 0.75, 1.0),
    cLit: V(0.06, 0.05, 0.14), cSh: V(0.02, 0.015, 0.06), night: 1.0, rimCol: V(0.6, 0.7, 1.0) },
};
const PAL_NAMES = ['Как было', 'Мульт', 'Мульт 2'];
const PAL = [{}, {
  morning: { sunCol: V(1.45, 0.9, 0.78), ambSky: V(0.16, 0.12, 0.24), cLit: V(1.0, 0.66, 0.6), cSh: V(0.36, 0.25, 0.52), pSh: V(0.1317, 0.0878, 0.2633), pDeep: V(0.0192, 0.0128, 0.0448),
    skyTop: V(0.2, 0.2, 0.5), skyMid: V(0.72, 0.34, 0.55), skyHor: V(1.0, 0.6, 0.45), fog: V(0.3, 0.22, 0.32), pHaze: V(0.26, 0.18, 0.3), glowC: V(1.0, 0.7, 0.62), rimCol: V(1.0, 0.76, 0.72) },
  day: { sunCol: V(1.35, 1.15, 0.8), ambSky: V(0.12, 0.2, 0.38), cLit: V(1.0, 0.92, 0.7), cSh: V(0.22, 0.32, 0.64), pSh: V(0.0585, 0.117, 0.3219), pDeep: V(0.0096, 0.016, 0.0512),
    skyTop: V(0.06, 0.22, 0.65), skyMid: V(0.25, 0.55, 0.9), skyHor: V(0.75, 0.9, 1.0), fog: V(0.38, 0.5, 0.66), pHaze: V(0.3, 0.42, 0.6), glowC: V(1.0, 0.95, 0.75) },
  evening: { sunCol: V(1.5, 0.66, 0.36), ambSky: V(0.12, 0.06, 0.2), cLit: V(1.0, 0.5, 0.28), cSh: V(0.3, 0.1, 0.42), pSh: V(0.1756, 0.0439, 0.2926), pDeep: V(0.0256, 0.0064, 0.0512),
    skyTop: V(0.08, 0.03, 0.2), skyMid: V(0.5, 0.1, 0.25), skyHor: V(1.0, 0.42, 0.14), fog: V(0.14, 0.06, 0.13), pHaze: V(0.13, 0.05, 0.14), glowC: V(1.0, 0.55, 0.3) },
  night: { sunCol: V(0.6, 0.78, 1.8), ambSky: V(0.03, 0.04, 0.14), cLit: V(0.06, 0.06, 0.17), cSh: V(0.015, 0.025, 0.09), pSh: V(0.0293, 0.0585, 0.2926), pDeep: V(0.0048, 0.0064, 0.0384),
    skyTop: V(0.015, 0.004, 0.035), skyMid: V(0.07, 0.01, 0.07), skyHor: V(0.16, 0.02, 0.05), fog: V(0.025, 0.01, 0.04), pHaze: V(0.09, 0.03, 0.12), glowC: V(0.75, 0.7, 1.0), rimCol: V(0.55, 0.65, 1.0) },
}, {
  morning: { sunCol: V(1.3, 1.0, 0.9), ambSky: V(0.14, 0.15, 0.26), cLit: V(0.95, 0.82, 0.78), cSh: V(0.28, 0.32, 0.56), pSh: V(0.0878, 0.117, 0.2926), pDeep: V(0.0128, 0.016, 0.0448),
    skyTop: V(0.16, 0.2, 0.5), skyMid: V(0.55, 0.4, 0.66), skyHor: V(1.0, 0.72, 0.7), fog: V(0.3, 0.27, 0.4), pHaze: V(0.26, 0.22, 0.38), glowC: V(1.0, 0.78, 0.6) },
  day: { sunCol: V(1.3, 1.2, 1.0), ambSky: V(0.1, 0.24, 0.28), cLit: V(1.0, 0.96, 0.82), cSh: V(0.16, 0.42, 0.5), pSh: V(0.0351, 0.1463, 0.1902), pDeep: V(0.0064, 0.0224, 0.032),
    skyTop: V(0.04, 0.35, 0.6), skyMid: V(0.3, 0.7, 0.78), skyHor: V(0.82, 1.0, 0.85), fog: V(0.4, 0.6, 0.6), pHaze: V(0.32, 0.52, 0.52), glowC: V(1.0, 0.95, 0.78) },
  evening: { sunCol: V(1.5, 0.75, 0.38), ambSky: V(0.05, 0.12, 0.16), cLit: V(1.0, 0.58, 0.3), cSh: V(0.1, 0.28, 0.34), pSh: V(0.0293, 0.1463, 0.1902), pDeep: V(0.0064, 0.0224, 0.032),
    skyTop: V(0.05, 0.15, 0.32), skyMid: V(0.6, 0.28, 0.2), skyHor: V(1.0, 0.62, 0.26), fog: V(0.1, 0.16, 0.18), pHaze: V(0.09, 0.16, 0.18), glowC: V(1.0, 0.62, 0.32) },
  night: { sunCol: V(0.7, 0.6, 1.8), ambSky: V(0.025, 0.035, 0.12), cLit: V(0.05, 0.1, 0.12), cSh: V(0.012, 0.02, 0.08), pSh: V(0.0351, 0.0439, 0.2633), pDeep: V(0.0048, 0.0058, 0.0352),
    skyTop: V(0.01, 0.004, 0.03), skyMid: V(0.05, 0.01, 0.08), skyHor: V(0.2, 0.02, 0.1), fog: V(0.015, 0.01, 0.04), pHaze: V(0.05, 0.03, 0.12), glowC: V(0.6, 1.0, 0.8), rimCol: V(0.6, 1.0, 0.85) },
}];
const TOD_RU = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };
// линейный цвет игры → цвет three (sRGB-хранение): цвета уже линейные, Color.setRGB по умолчанию берёт sRGB → конвертируем
const lin = (v) => new THREE.Color().setRGB(v[0], v[1], v[2], THREE.LinearSRGBColorSpace);
const mixV = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function target(tod, pal) {
  const e = { ...TOD[tod], ...(PAL[pal][tod] ?? {}) };
  const m = Math.max(...e.sunCol);
  return {
    sunDir: new THREE.Vector3(...e.sun).normalize(),
    sunCol: lin(e.sunCol.map((x) => x / m)), sunI: m * (0.2 + e.pExp) * 1.2 * (1 - 0.55 * e.night),
    hemiSky: lin(e.ambSky.map((x) => Math.min(1, x * 3.2))), hemiGnd: lin(mixV(e.pDeep, e.cSh, 0.25).map((x) => Math.min(1, x * 2))), hemiI: 0.3 + 0.6 * e.pExp,
    cShadow: lin(e.pSh.map((x) => Math.min(1, x * 1.7))), cDeep: lin(e.pDeep.map((x) => Math.min(1, x * 2.4))), cRim: lin(e.rimCol ?? e.glowC), cHaze: lin(e.pHaze),
    skyTop: lin(e.skyTop), skyMid: lin(e.skyMid), skyLow: lin(e.skyHor), cloud: lin(mixV(e.skyHor, e.glowC, 0.4)), cloudShade: lin(mixV(e.skyMid, e.cSh, 0.5)),
    fog: lin(e.fog), lit: lin(e.cLit), night: e.night, mist: { morning: 0.85, day: 0.15, evening: 0.55, night: 0.4 }[tod], exposure: 1.0 + 0.25 * e.pExp,
  };
}

// ------------------------------------------------------------ модели
const loader = new GLTFLoader();
async function loadModel(name) {
  const r = await fetch(`models/${name}.b64.txt`);
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  const b64 = (await r.text()).trim();
  const buf = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  return new Promise((res, rej) => loader.parse(buf, '', res, rej));
}
function fitHeight(obj, h) {
  const box = new THREE.Box3().setFromObject(obj); obj.scale.multiplyScalar(h / (box.max.y - box.min.y));
  const b2 = new THREE.Box3().setFromObject(obj); obj.position.y -= b2.min.y;
}
const FACE_CFG = {
  bogatyr: { design: 'bogatyr', kind: 'stern', frame: { f: [0.99, 0.08, -0.06] }, eyes: [[0.0412, 0.0264, 0.0154], [0.0376, 0.0261, -0.0204]], spanK: 3.6, depthK: 0.5 },
  leshy: { design: 'leshy', kind: 'glow', frame: { f: [0.6, 0.6, -0.5] }, eyes: [[0.0429, 0.0303, -0.002], [0.0101, 0.0334, -0.0374]], spanK: 4.2, depthK: 0.6 },
};
const ZONE_GLOW = { bogatyr: { color: '#ffc870', intensity: 1.2 }, leshy: { color: '#6dff96', intensity: 1.5 } };
function faceFromZones(obj, data, frameF) {
  let bone = null; obj.traverse((b) => { if (!bone && b.isBone && /head$/i.test(b.name)) bone = b; });
  if (!bone) return {};
  obj.updateMatrixWorld(true);
  const O = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const bq = bone.getWorldQuaternion(new THREE.Quaternion());
  const F = new THREE.Vector3(...frameF).normalize().applyQuaternion(bq);
  const Sx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), F).normalize();
  const eyes = zonePoints(obj, data, 'eyes'); if (eyes.length < 4) return {};
  const E = zoneSides(eyes, bone, O, Sx); if (!E.L || !E.R) return {};
  const ws = bone.getWorldScale(new THREE.Vector3()).x;
  const glow = zonePoints(obj, data, 'glow');
  const near = (C) => { const g = glow.filter((p) => p.w.distanceTo(C) < 0.04 * ws / 2); return g.length >= 2 ? g.reduce((a, p) => a.add(p.w), new THREE.Vector3()).multiplyScalar(1 / g.length) : C; };
  const Lw = near(E.L), Rw = near(E.R);
  const half = (side, C) => { const xs = eyes.filter((p) => (p.w.clone().sub(O).dot(Sx) < 0) === side).map((p) => p.w.clone().sub(C).dot(Sx)); return xs.length ? (Math.max(...xs) - Math.min(...xs)) / 2 : 0.015; };
  const out = { eyes: [bone.worldToLocal(Lw.clone()).toArray(), bone.worldToLocal(Rw.clone()).toArray()], eyeHalfW: (half(true, E.L) + half(false, E.R)) / 2 / ws };
  const mouth = zonePoints(obj, data, 'mouth');
  if (mouth.length >= 3) {
    const M = mouth.reduce((a, p) => a.add(p.w), new THREE.Vector3()).multiplyScalar(1 / mouth.length);
    const xs = mouth.map((p) => p.w.clone().sub(M).dot(Sx));
    out.mouthB = bone.worldToLocal(M.clone()).toArray(); out.mouthHalfW = (Math.max(...xs) - Math.min(...xs)) / 2 / ws;
  }
  return out;
}

// ------------------------------------------------------------ персонаж: анимации, ходьба по кругу, реакции
class Hero {
  constructor(name, src, h, home, opts) {
    this.name = name; this.h = h; this.home = home.clone(); this.o = opts;
    const obj = SkeletonUtils.clone(src.scene);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    fitHeight(obj, h);
    this.obj = obj; this.wrap = new THREE.Group(); this.wrap.add(obj);
    style.paintObject(obj, { flow: 'wrap', flowDir: [0, 1, 0], strokeScale: 0.55, rimScale: 1.2, hero: true });
    style.addOutline(obj, { widthScale: 1 });
    this.mixer = new THREE.AnimationMixer(obj);
    this.a = {}; for (const c of src.animations) this.a[c.name] = this.mixer.clipAction(c);
    this.cur = null; this.loopName = 'Idle'; this.busy = false;
    this.mixer.addEventListener('finished', () => { this.busy = false; this.play(this.loopName); });
    this.ang = opts.ang0; this.rad = opts.rad; this.mode = 'idle'; this.modeT = 2 + Math.random() * 2; this.auto = true; this.seq = 0;
    this.place(); this.wrap.rotation.y = opts.face; this.faceTo = opts.face;
    this.play('Idle');
  }
  place() { this.wrap.position.set(this.home.x + Math.cos(this.ang) * this.rad, 0, this.home.z + Math.sin(this.ang) * this.rad); }
  play(n, { once = false, ts = 1, fade = 0.18 } = {}) {
    const a = this.a[n]; if (!a) return;
    if (!once) { this.loopName = n; if (this.busy) return; }
    if (this.cur === a && !once) { a.timeScale = ts; return; }
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.timeScale = ts; a.setEffectiveWeight(1); a.play();
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    this.cur = a; if (once) this.busy = true;
  }
  act(n, ts = 1) { this.play(n, { once: true, ts }); }
  setMode(m) {
    this.mode = m; this.modeT = m === 'idle' ? 2.5 + Math.random() * 2 : 4 + Math.random() * 2;
    this.play(m === 'walk' ? 'Walk' : m === 'run' ? 'Run' : 'Idle');
  }
  update(dt, ad) {
    if (ad) this.mixer.update(ad);
    if (this.auto && !this.busy) {
      this.modeT -= dt;
      if (this.modeT <= 0) {
        const plan = this.o.plan; const step = plan[this.seq++ % plan.length];
        if (step === 'idle' || step === 'walk' || step === 'run') this.setMode(step);
        else { this.mode = 'idle'; this.play('Idle'); this.act(step); this.modeT = 0.5; }
      }
    }
    const moving = !this.busy && (this.mode === 'walk' || this.mode === 'run');
    if (moving) {
      const v = this.mode === 'run' ? this.o.run : this.o.walk;
      this.ang += this.o.dir * v / this.rad * dt; this.place();
      this.faceTo = Math.atan2(-Math.sin(this.ang) * this.o.dir, Math.cos(this.ang) * this.o.dir);
    } else if (!this.busy) this.faceTo = this.o.face;
    let d = this.faceTo - this.wrap.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.wrap.rotation.y += d * Math.min(1, dt * 5);
  }
}

// ------------------------------------------------------------ шары: огонь и вода своими шейдерами
const FIRE_VERT = /* glsl */`varying vec3 vN, vP, vW; void main(){ vN = normalize(normalMatrix * normal); vP = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FIRE_FRAG = /* glsl */`
uniform float uStep; uniform vec3 cOut, cMid, cCore, cHot, cInk;
varying vec3 vN, vP, vW;
${GLSL_NOISE}
void main(){
  float st = uStep;                                  // 12 к/с, кадр держится
  vec3 p = normalize(vP);
  float fr = clamp(dot(vN, vec3(0., 0., 1.)), 0., 1.); // к зрителю — ядро
  // языки ползут вверх: шум по широте и долготе со сдвигом по шагам
  float lon = atan(p.z, p.x), lat = p.y;
  float n = pfNoise(vec2(lon * 2.2 + st * .37, lat * 3. - st * .55)) * .65 + pfNoise(vec2(lon * 5. - st * .21, lat * 7. - st * .9)) * .35;
  float heat = fr * .9 + n * .55 - (lat * .35 + .2) * .5;
  // ступени тонов, как в рисованном огне
  vec3 c = cOut;
  c = mix(c, cMid, step(.38, heat));
  c = mix(c, cCore, step(.62, heat));
  c = mix(c, cHot, step(.86, heat));
  // тушевая кромка по краю и рваные «языки» дырами по контуру
  float rim = 1. - fr;
  float tongue = pfNoise(vec2(lon * 6. + st * .3, st * .2 + lat * 2.));
  if (rim > .78 + tongue * .2 && lat > -.2) discard;
  c = mix(c, cInk, smoothstep(.62, .72, rim + tongue * .08) * (1. - step(.8, rim + tongue * .1)) * .9);
  // мелкие точки-искры на поверхности
  vec2 g = vec2(lon * 9., lat * 9. - st * .8); vec2 id = floor(g);
  float sp = step(.93, pfH21(id + floor(st * .5))) * step(length(fract(g) - .5), .12);
  c = mix(c, cHot, sp);
  gl_FragColor = vec4(c * 1.15, 1.);
  #include <colorspace_fragment>
}`;
const WATER_FRAG = /* glsl */`
uniform float uStep; uniform vec3 cDeep, cMid, cShal, cFoam, cSky, cInk, cGlint, uSun;
varying vec3 vN, vP, vW;
${GLSL_NOISE}
void main(){
  float st = uStep;
  vec3 p = normalize(vP); vec3 vd = normalize(cameraPosition - vW); vec3 N = normalize(vN);
  float facing = clamp(dot(N, vec3(0., 0., 1.)), 0., 1.);
  float lon = atan(p.z, p.x), lat = p.y;
  // полосы глубины: светлее к верху, рябь двигает границы шагами
  float w = pfNoise(vec2(lon * 3. + st * .25, lat * 4. + st * .12));
  float depth = lat * .55 + .45 + (w - .5) * .35;
  vec3 c = cDeep;
  c = mix(c, cMid, step(.35, depth));
  c = mix(c, cShal, step(.68, depth));
  // отражение неба на скользящих углах полосами
  float refl = pow(1. - facing, 2.2);
  float band = step(.5, fract(lat * 7. + pfNoise(vec2(lon * 2., st * .1)) * .6));
  c = mix(c, cSky, step(.5, refl) * mix(.55, .9, band));
  // штрихи ряби: короткие горизонтальные чёрточки
  vec2 g = vec2(lon * 7., lat * 22.); vec2 id = floor(g); vec2 f = fract(g);
  float h = pfH21(id + floor(st * .5) * 7.1);
  float dash = step(.72, h) * step(abs(f.y - .5), .14) * step(abs(f.x - .5), .34);
  c = mix(c, mix(cShal, cFoam, .5), dash * .8);
  // блик от солнца: пятно из точек
  vec3 R = reflect(-vd, p);
  float s = max(dot(R, normalize(uSun)), 0.);
  float glint = step(.9, s) * step(.5, pfH21(floor(vec2(lon, lat) * 30.) + floor(st)));
  c = mix(c, cGlint, glint);
  // рваная пена по контуру и тушевая кромка
  float rim = 1. - facing;
  float foam = step(.86 - pfNoise(vec2(lon * 8. + st * .4, lat * 3.)) * .12, rim);
  c = mix(c, cFoam, foam * .9);
  c = mix(c, cInk, step(.965, rim) * .9);
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;
const stepU = { value: 0 };   // общий шаг 12 к/с для огня и воды
const fireU = { uStep: stepU, cOut: { value: new THREE.Color('#d8401c') }, cMid: { value: new THREE.Color('#ff8a2a') }, cCore: { value: new THREE.Color('#ffd25a') }, cHot: { value: new THREE.Color('#fff6d0') }, cInk: { value: new THREE.Color('#3a0c06') } };
const waterU = { uStep: stepU, cDeep: { value: new THREE.Color() }, cMid: { value: new THREE.Color() }, cShal: { value: new THREE.Color() }, cFoam: { value: new THREE.Color('#f2fbf4') }, cSky: { value: new THREE.Color() }, cInk: { value: new THREE.Color('#0c2228') }, cGlint: { value: new THREE.Color('#fffbe8') }, uSun: { value: new THREE.Vector3(0, 1, 0) } };

// ------------------------------------------------------------ сцена
const sky = new PaintedSky(style, { colors: { top: '#3a5a90', mid: '#90a8c0', low: '#e0c8a0', cloud: '#fff0e0', cloudShade: '#a0a8c0', stroke: 0.85, clouds: 0.75 } });
scene.add(sky.mesh);
const sun = new THREE.DirectionalLight('#fff', 2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
{ const c = sun.shadow.camera; c.left = -10; c.right = 10; c.top = 10; c.bottom = -10; c.near = 0.5; c.far = 80; }
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight('#8090b0', '#201820', 0.8); scene.add(hemi);
function pmesh(geo, opts) { const m = new THREE.Mesh(geo, style.material({ rimScale: 0.6, ...opts })); m.castShadow = opts.cast ?? true; m.receiveShadow = true; return m; }
const ground = pmesh(new THREE.CircleGeometry(60, 72), { color: '#56603a', flow: 'fixed', flowDir: [1, 0, 0.2], strokeScale: 1.4, cast: false, rimScale: 0 });
ground.rotation.x = -Math.PI / 2; scene.add(ground);
// вытоптанная площадка у героев
const path = pmesh(new THREE.CircleGeometry(3.1, 40), { color: '#7a6448', flow: 'fixed', flowDir: [1, 0, 0.6], strokeScale: 1.1, cast: false, rimScale: 0 });
path.rotation.x = -Math.PI / 2; path.position.set(1.9, 0.01, 0.0); scene.add(path);
// дальние холмы и ельник силуэтами: свет и тени у них тоже из палитры
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
for (let i = 0; i < 9; i++) {
  const a = -2.35 + i * 0.36 + rnd() * 0.1; const r = 30 + rnd() * 8;
  const m = pmesh(new THREE.SphereGeometry(1, 20, 12), { color: i % 2 ? '#405838' : '#4a5c40', flow: 'fixed', flowDir: [1, 0, 0], strokeScale: 3, rimScale: 0.4, cast: false });
  m.scale.set(9 + rnd() * 5, 3 + rnd() * 3, 6); m.position.set(Math.cos(a) * r, -0.5, Math.sin(a) * r); scene.add(m);
}
for (let i = 0; i < 26; i++) {
  const a = -2.7 + rnd() * 2.2; const r = 20 + rnd() * 10;
  const t = pmesh(new THREE.ConeGeometry(0.8 + rnd() * 0.4, 3 + rnd() * 2, 7), { color: '#2f4a32', flow: 'wrap', flowDir: [0, 1, 0], strokeScale: 1.2, rimScale: 0.9 });
  t.position.set(Math.cos(a) * r, 1.5, Math.sin(a) * r); scene.add(t);
}
// пучки травы
const tuftItems = [];
for (let i = 0; tuftItems.length < 110 && i < 2000; i++) {
  const x = (rnd() - 0.5) * 22, z = 4 - rnd() * 13;
  if (Math.hypot(x - 2.6, z + 0.6) < 3.4) continue;
  if (x > -6.4 && x < 0.2 && z > -3.9 && z < 2.0) continue;
  tuftItems.push({ p: [x, 0, z], s: i < 10 ? 0.5 + rnd() * 0.3 : 0.2 + rnd() * 0.2, bush: i < 10 });
}
const tufts = new PaintedTufts(style, tuftItems); scene.add(tufts.mesh);

// материалы: у каждого своя форма, размер, фактура, ответ на свет и контакт с землёй (matfx.js)
const labels = [];
function label(text, pos) { const d = document.createElement('div'); d.className = 'lbl'; d.textContent = text; $('#labels').appendChild(d); labels.push({ d, p: pos.clone() }); }
const KM = (kind, opts, base) => kindMaterial(style, kind, { rimScale: 0.6, ...opts }, base);
const kmesh = (geo, kind, opts, base, cast = true) => { const m = new THREE.Mesh(geo, KM(kind, opts, base)); m.castShadow = cast; m.receiveShadow = true; return m; };
const hsh = (x, y, z) => { const t = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return t - Math.floor(t); };
const lumpy = (g, amp, f = 6) => { const P = g.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const n = Math.sin(v.x * f + 1.3) * Math.cos(v.z * f * 0.9) * Math.sin(v.y * f * 1.1 + 2.) + (hsh(+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)) - 0.5) * 0.6; v.multiplyScalar(1 + amp * n); P.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
const matTicks = [];
const contactTufts = [];
const ringTufts = (x, z, r, n, s = 0.22) => { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd() * 0.5; const rr = r * (0.95 + rnd() * 0.25); contactTufts.push({ p: [x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr], s: s * (0.7 + rnd() * 0.6), bush: false }); } };

// 1. Камень: крупный валун гранями, лишайник сверху, мох поднимается от земли
{
  const x = -5.2, z = -2.6;
  const g = lumpy(new THREE.IcosahedronGeometry(0.62, 2), 0.13, 4.5); g.scale(1, 0.72, 0.9);
  const m = kmesh(g, 'stone', { color: '#8a7c72', flow: 'wrap', strokeScale: 0.9, rimScale: 0.7 }, [0, 1, 0.4]);
  m.position.set(x, 0.36, z); m.rotation.y = 0.5; scene.add(m);
  ringTufts(x, z, 0.62, 9, 0.24); label('Камень', new THREE.Vector3(x, 0.02, z + 0.75));
}
// 2. Дерево: пень с корой бороздами и годичными кольцами на срезе, рядом щепа
{
  const x = -3.75, z = -2.9;
  const g = new THREE.CylinderGeometry(0.3, 0.38, 0.78, 40, 12);
  { const P = g.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (Math.abs(v.y) > 0.385 && Math.hypot(v.x, v.z) < 0.29) continue; const a = Math.atan2(v.z, v.x); const k = 1 + 0.07 * Math.sin(a * 9 + Math.sin(v.y * 3) * 0.8) + 0.03 * Math.sin(a * 23 + v.y * 5); v.x *= k; v.z *= k; if (v.y < -0.2) { const f = (-0.2 - v.y) * 0.6; v.x *= 1 + f; v.z *= 1 + f; } P.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); }
  const m = kmesh(g, 'wood', { color: '#6a4630', flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.4, rimScale: 0.8 }, [0, 0.8, 0.3]);
  m.position.set(x, 0.39, z); scene.add(m);
  for (let i = 0; i < 5; i++) { const c = kmesh(new THREE.BoxGeometry(0.16, 0.03, 0.05), 'wood', { color: '#b88a58', flow: 'along', flowDir: [1, 0, 0], strokeScale: 0.3 }, [0, 0, 0]); c.position.set(x + 0.45 + rnd() * 0.3, 0.015, z + 0.2 + rnd() * 0.3); c.rotation.y = rnd() * 3; scene.add(c); }
  ringTufts(x, z, 0.42, 8, 0.2); label('Дерево', new THREE.Vector3(x, 0.02, z + 0.6));
}
// 3. Сено: стог, тёплый и пушистый, соломинки торчат и шевелятся на ветру
{
  const x = -2.3, z = -2.7;
  const g = lumpy(new THREE.SphereGeometry(0.62, 48, 32), 0.06, 9); g.scale(1, 0.95, 1);
  { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { let y = P.getY(i); if (y < -0.1) P.setY(i, -0.1 + (y + 0.1) * 0.25); } g.computeVertexNormals(); }
  const m = kmesh(g, 'hay', { color: '#d4a64e', flow: 'fixed', flowDir: [0.2, 1, 0], strokeScale: 0.3, rimScale: 1.2 }, [0, 0.15, 0.5]);
  m.position.set(x, 0.12, z); scene.add(m);
  const N = 420; const straw = new THREE.CylinderGeometry(0.004, 0.006, 1, 3); straw.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(straw, KM('hay', { color: '#e0b860', flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.2, rimScale: 1.5 }, [0, 0, 0]), N);
  inst.castShadow = true; const data = [];
  const q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), M4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const th = rnd() * 6.283, ph = Math.acos(1 - rnd() * 1.15);
    const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.95, Math.sin(ph) * Math.sin(th));
    const pos = n.clone().multiplyScalar(0.6).add(new THREE.Vector3(x, 0.12, z));
    const dir = n.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).multiplyScalar(1.4)).normalize();
    data.push({ pos, dir, len: 0.08 + rnd() * 0.22, ph: rnd() * 6.28, k: 0.5 + rnd() });
  }
  let acc = 0; const wind = new THREE.Vector3();
  const set = (t) => { for (let i = 0; i < N; i++) { const d = data[i]; wind.set(Math.sin(t * 1.7 + d.ph) * 0.18 * d.k + 0.12, 0, Math.cos(t * 1.3 + d.ph) * 0.1 * d.k); const dd = d.dir.clone().add(wind).normalize(); q.setFromUnitVectors(up, dd); s3.set(1, d.len, 1); M4.compose(d.pos, q, s3); inst.setMatrixAt(i, M4); } inst.instanceMatrix.needsUpdate = true; };
  set(0); scene.add(inst);
  matTicks.push((dt, t) => { acc += dt; if (acc < 1 / 8) return; acc = 0; set(t); });
  ringTufts(x, z, 0.64, 10, 0.2); label('Сено', new THREE.Vector3(x, 0.02, z + 0.85));
}
// 4. Мох и трава: кочка на камне, ворс пучками по поверхности (пушистый силуэт), матовая
{
  const x = -0.75, z = -2.95;
  const rock = kmesh(lumpy(new THREE.IcosahedronGeometry(0.42, 2), 0.12, 5), 'stone', { color: '#7a746c', flow: 'wrap', strokeScale: 0.8 }, [0, 1, 0.2]);
  rock.scale.set(1.1, 0.6, 1); rock.position.set(x, 0.18, z); scene.add(rock);
  const cap = kmesh(lumpy(new THREE.SphereGeometry(0.44, 40, 24, 0, 6.283, 0, 1.25), 0.08, 7), 'moss', { color: '#5e8a2e', flow: 'wrap', strokeScale: 0.3, rimScale: 0.3, side: THREE.DoubleSide }, [0, 0, 0]);
  cap.scale.set(1.12, 0.62, 1.02); cap.position.set(x, 0.22, z); scene.add(cap);
  const N = 520; const blade = new THREE.ConeGeometry(0.018, 1, 4); blade.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(blade, KM('moss', { color: '#6a9a34', flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.2, rimScale: 0.2 }, [0, 0, 0]), N);
  const q = new THREE.Quaternion(), M4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0); const data = [];
  for (let i = 0; i < N; i++) {
    const th = rnd() * 6.283, ph = Math.acos(1 - rnd() * 0.68);
    const n = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    const pos = new THREE.Vector3(n.x * 0.44 * 1.12, n.y * 0.44 * 0.62, n.z * 0.44 * 1.02).add(new THREE.Vector3(x, 0.22, z));
    const dir = n.clone().add(new THREE.Vector3(rnd() - 0.5, 0.6, rnd() - 0.5)).normalize();
    data.push({ pos, dir, len: 0.04 + rnd() * 0.07 + (i < 60 ? 0.12 : 0), ph: rnd() * 6.28 });
  }
  const set = (t) => { for (let i = 0; i < N; i++) { const d = data[i]; const w = new THREE.Vector3(Math.sin(t * 2 + d.ph) * 0.12, 0, 0); q.setFromUnitVectors(up, d.dir.clone().add(w).normalize()); M4.compose(d.pos, q, new THREE.Vector3(1, d.len, 1)); inst.setMatrixAt(i, M4); } inst.instanceMatrix.needsUpdate = true; };
  set(0); scene.add(inst); let acc = 0;
  matTicks.push((dt, t) => { acc += dt; if (acc < 1 / 6) return; acc = 0; set(t); });
  ringTufts(x, z, 0.55, 12, 0.26); label('Мох и трава', new THREE.Vector3(x, 0.02, z + 0.7));
}
// 5. Железо: шелом на чурбаке, гладкий, отражает небо и огонь, жёсткий блик
{
  const x = 0.55, z = -2.6;
  const block = kmesh(new THREE.CylinderGeometry(0.22, 0.25, 0.5, 24, 4), 'wood', { color: '#6a4630', flow: 'along', flowDir: [0, 1, 0], strokeScale: 0.35 }, [0, 0.6, 0.3]);
  block.position.set(x, 0.25, z); scene.add(block);
  const mat = KM('metal', { color: '#9aa2ae', flow: 'wrap', flowDir: [0, 1, 0], strokeScale: 0.12, rimScale: 1.3 }, [0.5, 0, 0.15]);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 24, 0, 6.283, 0, 1.6), mat); dome.scale.set(1, 1.22, 1); dome.position.set(x, 0.52, z); dome.castShadow = true; dome.receiveShadow = true; scene.add(dome);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 16), mat); spike.position.set(x, 0.52 + 0.26 * 1.22 + 0.09, z); spike.castShadow = true; scene.add(spike);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.022, 10, 48), mat); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.53, z); scene.add(rim);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.02), mat); nose.position.set(x, 0.47, z + 0.27); scene.add(nose);
  ringTufts(x, z, 0.33, 7, 0.18); label('Железо', new THREE.Vector3(x, 0.02, z + 0.5));
}
// 6. Ткань: полотно на ящике, складки, бархатный отлив, свисающие края колышутся на ветру
{
  const x = 1.85, z = -3.3, bw = 0.5, bh = 0.42;
  const box = kmesh(new THREE.BoxGeometry(bw * 2, bh, bw * 2 * 0.8), 'wood', { color: '#7a5436', flow: 'along', flowDir: [1, 0, 0], strokeScale: 0.4 }, [0, 0.5, 0.4]);
  box.position.set(x, bh / 2, z); scene.add(box);
  const S = 48, W = 2.0; const g = new THREE.PlaneGeometry(W, W, S, S); g.rotateX(-Math.PI / 2);
  const P = g.attributes.position; const rest = P.array.slice();
  const drape = (t) => {
    for (let i = 0; i < P.count; i++) {
      const px = rest[i * 3], pz = rest[i * 3 + 2];
      const ox = Math.max(0, Math.abs(px) - bw), oz = Math.max(0, Math.abs(pz) - bw * 0.8);
      const out = Math.hypot(ox, oz);
      let y = bh + 0.01 - out * 2.2 + (Math.sin(px * 13 + pz * 2) * 0.5 + Math.sin(pz * 17 - px * 3) * 0.5) * (out > 0 ? 0.05 : 0.008);
      y = Math.max(y, 0.02);
      const fl = out > 0 ? Math.sin(t * 3 + px * 6 + pz * 4) * 0.04 * out * 3 : 0;
      const k = out > 0 ? 1 - Math.min(out, 0.2) * 0.6 : 1;
      P.setXYZ(i, px * k + fl * Math.sign(px), y, pz * k + fl * 0.5 * Math.sign(pz));
    }
    P.needsUpdate = true; g.computeVertexNormals();
  };
  drape(0);
  const cloth = new THREE.Mesh(g, KM('cloth', { color: '#a8302a', flow: 'wrap', flowDir: [1, 0, 0], strokeScale: 0.45, side: THREE.DoubleSide, rimScale: 0.4 }, [0, 0, 0.6]));
  cloth.position.set(x, 0, z); cloth.castShadow = true; cloth.receiveShadow = true; scene.add(cloth);
  let acc = 0; matTicks.push((dt, t) => { acc += dt; if (acc < 1 / 12) return; acc = 0; drape(t); });
  ringTufts(x, z, 0.75, 9, 0.2); label('Ткань', new THREE.Vector3(x, 0.02, z + 0.75));
}
const baseTufts = new PaintedTufts(style, contactTufts); scene.add(baseTufts.mesh);
// огонь: шар в каменной чаше, языки и угли сверху, свет на всё вокруг
const firePos = new THREE.Vector3(-6.6, 0, -2.4);
const bowl = pmesh(new THREE.CylinderGeometry(0.55, 0.38, 0.32, 9, 1, true), { color: '#5e5650', flow: 'wrap', strokeScale: 0.6, side: THREE.DoubleSide }); bowl.position.set(firePos.x, 0.16, firePos.z); scene.add(bowl);
const fireBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 24), new THREE.ShaderMaterial({ uniforms: fireU, vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG }));
fireBall.position.set(firePos.x, 0.78, firePos.z); fireBall.userData.pfSkip = true; scene.add(fireBall);
const flames = new PaintedFire(style, { size: 0.6, preset: 'hearth', logs: false, embers: 7 }); flames.group.position.set(firePos.x, 0.95, firePos.z); scene.add(flames.group);
const lamp = new LampFX(style, { size: 1.6, preset: 'torch', seed: 2.2 }); lamp.group.position.set(firePos.x, 0.85, firePos.z); scene.add(lamp.group);
const arcs = new ArcStrokes(style, { center: [firePos.x, 0, firePos.z], r0: 0.7, r1: 2.0, count: 34 }); scene.add(arcs.group);
label('Огонь', new THREE.Vector3(firePos.x, 0, firePos.z + 0.9));
// вода: шар в лужице, рябь, пена, отражение неба из палитры
const waterPos = new THREE.Vector3(3.3, 0, -3.1);
const puddle = pmesh(new THREE.CircleGeometry(0.9, 28), { color: '#3a5a6a', flow: 'fixed', strokeScale: 0.6, cast: false, rimScale: 0 }); puddle.rotation.x = -Math.PI / 2; puddle.position.set(waterPos.x, 0.015, waterPos.z); scene.add(puddle);
const waterBall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), new THREE.ShaderMaterial({ uniforms: waterU, vertexShader: FIRE_VERT, fragmentShader: WATER_FRAG }));
waterBall.position.set(waterPos.x, 0.62, waterPos.z); waterBall.userData.pfSkip = true; waterBall.castShadow = true; scene.add(waterBall);
label('Вода', new THREE.Vector3(waterPos.x, 0, waterPos.z + 1.0));

// ------------------------------------------------------------ состояние суток
let tod = 'day', pal = 1;
let T = target(tod, pal); const C = target(tod, pal);
function lerpState(k) {
  for (const key of ['sunCol', 'hemiSky', 'hemiGnd', 'cShadow', 'cDeep', 'cRim', 'cHaze', 'skyTop', 'skyMid', 'skyLow', 'cloud', 'cloudShade', 'fog', 'lit']) C[key].lerp(T[key], k);
  C.sunDir.lerp(T.sunDir, k).normalize();
  for (const key of ['sunI', 'hemiI', 'night', 'exposure', 'mist']) C[key] += (T[key] - C[key]) * k;
}
const hex = (c) => '#' + c.getHexString();
function applyState() {
  sun.color.copy(C.sunCol); sun.intensity = C.sunI;
  sun.position.copy(C.sunDir).multiplyScalar(20).add(new THREE.Vector3(-1, 0, 0)); sun.target.position.set(-1, 0, 0);
  hemi.color.copy(C.hemiSky); hemi.groundColor.copy(C.hemiGnd); hemi.intensity = C.hemiI;
  style.set({ cShadow: hex(C.cShadow), cDeep: hex(C.cDeep), cRim: hex(C.cRim), cHaze: hex(C.cHaze), exposure: C.exposure });
  sky.setColors({ top: hex(C.skyTop), mid: hex(C.skyMid), low: hex(C.skyLow), cloud: hex(C.cloud), cloudShade: hex(C.cloudShade) });
  // вода берёт небо и тени палитры
  waterU.cSky.value.copy(C.skyLow).lerp(C.skyMid, 0.35);
  waterU.cDeep.value.set('#123848').lerp(C.cDeep, 0.45);
  waterU.cMid.value.set('#2a7080').lerp(C.cShadow, 0.35);
  waterU.cShal.value.set('#62b0a8').lerp(C.lit, 0.25);
  waterU.cFoam.value.set('#f2fbf4').lerp(C.lit, 0.2);
  waterU.uSun.value.copy(C.sunDir);
  renderer.setClearColor(C.fog);
  WORLD.uSunW.value.copy(C.sunDir); WORLD.uSkyC.value.copy(C.skyLow).lerp(C.skyMid, 0.4); WORLD.uSkyTop.value.copy(C.skyTop);
  WORLD.uGroundC.value.set('#6a7a34').multiply(C.sunCol).multiplyScalar(Math.min(1.2, C.sunI * 0.35)).lerp(C.hemiGnd, 0.3);
  WORLD.uHazeC.value.copy(C.cHaze).lerp(C.fog, 0.4); WORLD.uMist.value = C.mist;
  WORLD.uFireP.value.set(firePos.x, 0, firePos.z, 3.2);
  lamp.U && (lamp.U.uK.value = 0.55 + 0.75 * C.night);
}

// ------------------------------------------------------------ персонажи, ауры, лица
let heroes = {}; const faces = []; const glows = []; const auras = {};
const REACT = {
  morning: { bogatyr: ['Point', 'sparkle', 'Богатырь встречает утро'], leshy: ['Crouch', 'sleep', 'Леший уходит спать'] },
  day: { bogatyr: ['Talk', 'exclaim', 'Богатырь бодр'], leshy: ['Crouch', 'sleep', 'Леший днём спит'] },
  evening: { bogatyr: ['Point', 'question', 'Богатырь настороже'], leshy: ['Wave', 'swirl', 'Леший просыпается'] },
  night: { bogatyr: ['Hit', 'interrobang', 'Богатырь вздрогнул и зажёг ауру'], leshy: ['Attack', 'anger', 'Леший в ярости, аура'] },
};
let reactOn = true, autoTod = false, autoTodT = 0;
function react() {
  if (!reactOn || !heroes.bogatyr) return;
  const r = REACT[tod]; const txt = [];
  for (const k of ['bogatyr', 'leshy']) {
    const h = heroes[k]; const [anim, mark, say] = r[k];
    h.act(anim); h.modeT = 3; marks.show(h.obj, mark, { duration: 2.6, side: k === 'leshy' ? -1 : 1, up: k === 'leshy' ? 0.32 : 0.22 });
    txt.push(say);
    if (tod === 'night') setTimeout(() => auras[k]?.activate(), k === 'leshy' ? 350 : 900);
    else if (tod === 'morning' || tod === 'day') auras[k]?.deactivate();
  }
  $('#say').textContent = txt.join(' · ');
}
function setTod(t, silent) {
  tod = t; T = target(tod, pal);
  document.querySelectorAll('#tod button').forEach((b) => b.classList.toggle('on', b.dataset.k === t));
  if (!silent) react();
}
function setPal(p) {
  pal = p; T = target(tod, pal);
  document.querySelectorAll('#pal button').forEach((b) => b.classList.toggle('on', +b.dataset.k === p));
}
function toggleAura(k) { auras[k]?.toggle(); }

// ------------------------------------------------------------ панель
for (const k of ['morning', 'day', 'evening', 'night']) { const b = document.createElement('button'); b.textContent = TOD_RU[k]; b.dataset.k = k; b.onclick = () => { autoTod = false; $('#autoTod').checked = false; setTod(k); }; $('#tod').appendChild(b); }
PAL_NAMES.forEach((n, i) => { const b = document.createElement('button'); b.textContent = n; b.dataset.k = i; b.onclick = () => setPal(i); $('#pal').appendChild(b); });
$('#auB').onclick = () => toggleAura('bogatyr'); $('#auL').onclick = () => toggleAura('leshy');
const ACTS = [['idle', 'Стоит'], ['walk', 'Идёт'], ['run', 'Бежит'], ['Attack', 'Удар'], ['Hit', 'Задело'], ['Jump', 'Прыжок']];
for (const k of ['bogatyr', 'leshy']) {
  const box = $('#act_' + k);
  for (const [a, n] of ACTS) {
    const b = document.createElement('button'); b.textContent = n;
    b.onclick = () => { const h = heroes[k]; if (!h) return; h.auto = false; $('#autoMove').checked = false; if (a === 'idle' || a === 'walk' || a === 'run') { h.busy = false; h.setMode(a); h.modeT = 1e9; } else h.act(a); };
    box.appendChild(b);
  }
}
$('#autoMove').onchange = (e) => { for (const k in heroes) { heroes[k].auto = e.target.checked; heroes[k].modeT = 0.2; } };
$('#react').onchange = (e) => { reactOn = e.target.checked; };
$('#autoTod').onchange = (e) => { autoTod = e.target.checked; autoTodT = 0; };
addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') toggleAura('bogatyr'); else if (e.code === 'KeyG') toggleAura('leshy');
  else if (e.code === 'KeyP') setPal((pal + 1) % 3);
  else if (/^Digit[1-4]$/.test(e.code)) { autoTod = false; $('#autoTod').checked = false; setTod(['morning', 'day', 'evening', 'night'][+e.code.slice(5) - 1]); }
});
$('#hide').onclick = () => { document.body.classList.toggle('clean'); $('#hide').textContent = document.body.classList.contains('clean') ? 'Показать панель' : 'Скрыть панель'; resize(); };

// ------------------------------------------------------------ кадр
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  const narrow = innerWidth < 760; camera.fov = narrow ? 64 : (innerWidth - 300) / innerHeight < 1.4 ? 48 : 42;
  const panel = document.body.classList.contains('clean') ? 0 : narrow ? 0 : 300;
  if (narrow && !document.body.classList.contains('clean')) camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.2, innerWidth, innerHeight);
  else camera.setViewOffset(innerWidth, innerHeight, panel / 2, 0, innerWidth, innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const VIEWS = {
  all: { name: 'Общий план', pos: [-1.6, 2.9, 8.6], tgt: [-1.6, 0.8, -1.2] },
  mat1: { name: 'Огонь, камень, дерево, сено', pos: [-4.2, 1.5, 1.2], tgt: [-4.0, 0.45, -2.6] },
  mat2: { name: 'Мох, железо, ткань, вода', pos: [1.3, 1.5, 1.0], tgt: [1.2, 0.45, -2.9] },
  heroes: { name: 'Богатырь и Леший', pos: [2.0, 1.9, 5.6], tgt: [2.0, 1.1, -0.2] },
};
let viewT = null;
function setView(k) { const v = VIEWS[k]; viewT = { pos: new THREE.Vector3(...v.pos), tgt: new THREE.Vector3(...v.tgt) }; document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); }
for (const k in VIEWS) { const b = document.createElement('button'); b.textContent = VIEWS[k].name; b.dataset.k = k; b.onclick = () => setView(k); $('#views').appendChild(b); }
controls.addEventListener('start', () => { viewT = null; });
camera.position.set(...VIEWS.mat1.pos); controls.target.set(...VIEWS.mat1.tgt); setView('mat1'); controls.update();
const tmp = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  lerpState(1 - Math.exp(-dt * 2.2)); applyState();
  style.update(dt, renderer); stepU.value = Math.floor(style.time * 12);
  const ad = style.animDelta(dt);
  for (const k in heroes) heroes[k].update(dt, ad);
  for (const f of faces) f.update(dt, camera); for (const g of glows) g.update(dt);
  for (const k in auras) auras[k].update(dt);
  for (const f of matTicks) f(dt, style.time); baseTufts.update?.(dt, camera);
  flames.update(dt, camera); lamp.update(dt, camera); arcs.update?.(dt, camera); tufts.update?.(dt, camera);
  marks.update(dt, camera);
  if (autoTod) { autoTodT -= dt; if (autoTodT <= 0) { autoTodT = 9; setTod({ morning: 'day', day: 'evening', evening: 'night', night: 'morning' }[tod]); } }
  // отсвет: огонь всегда, ауры когда горят
  const fk = (0.85 + 0.1 * Math.sin(Math.floor(style.time * 8) * 2.3)) * (0.7 + 0.6 * C.night);
  const B = [{ pos: new THREE.Vector3(firePos.x, 0.8, firePos.z), color: '#ff9a40', radius: 4.5, k: fk }];
  for (const k in auras) { const b = auras[k].bounce(camera); if (b) B.push(b); }
  style.setBounce(B);
  if (heroes.bogatyr) style.setFocus(heroes.bogatyr.wrap.position.clone().lerp(heroes.leshy.wrap.position, 0.5).setY(1));
  if (viewT) { const k = 1 - Math.exp(-dt * 3); camera.position.lerp(viewT.pos, k); controls.target.lerp(viewT.tgt, k); if (camera.position.distanceTo(viewT.pos) < 0.01) viewT = null; }
  controls.update();
  for (const k in auras) auras[k].renderMask(renderer, scene, camera);
  post.render(scene, camera);
  for (const L of labels) {
    tmp.copy(L.p).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    L.d.style.display = vis ? '' : 'none';
    if (vis) L.d.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, 0)`;
  }
  requestAnimationFrame(frame);
}

(async () => {
  try {
    const [b, l] = await Promise.all([loadModel('bogatyr'), loadModel('leshy')]);
    const [zb, zl] = await Promise.all([loadZones('bogatyr'), loadZones('leshy')]);
    const zoneData = {}; if (zb) zoneData.bogatyr = zb; if (zl) zoneData.leshy = zl;
    try { const lib = await loadScribbles(); applyHandDrawn(lib, { style, post }); style.handEl = elementHand(lib, sampleAtlas); }
    catch { style.handEl = elementHand({}, sampleAtlas); }
    heroes.bogatyr = new Hero('bogatyr', b, 1.8, new THREE.Vector3(0.6, 0, 0.3), { rad: 0.9, ang0: Math.PI * 0.5, dir: 1, walk: 1.1, run: 2.6, face: 0.35,
      plan: ['walk', 'idle', 'Attack', 'idle', 'run', 'idle', 'Attack3', 'walk', 'idle', 'Jump'] });
    heroes.leshy = new Hero('leshy', l, 2.4, new THREE.Vector3(3.3, 0, -0.4), { rad: 1.0, ang0: Math.PI * 0.5, dir: -1, walk: 0.8, run: 2.0, face: -0.45,
      plan: ['idle', 'walk', 'idle', 'Attack', 'walk', 'Wave', 'idle', 'run', 'idle', 'Point'] });
    for (const k in heroes) {
      const h = heroes[k]; scene.add(h.wrap);
      h.mixer.update(0); h.wrap.updateMatrixWorld(true);
      let cfg = { ...FACE_CFG[k] };
      if (zoneData[k]) cfg = { ...cfg, ...faceFromZones(h.obj, zoneData[k], cfg.frame.f) };
      const zg = zoneData[k] ? new ZoneGlow(h.obj, zoneData[k], ZONE_GLOW[k]) : null; if (zg) glows.push(zg);
      const hg = zg && (style.handGlow || style.handFx) ? new HandGlow(style, zg.anchors, { color: ZONE_GLOW[k].color }) : null; if (hg) glows.push(hg);
      const f = new FaceMarks(style, h.obj, cfg); f.glow = zg; f.hand = hg; f.setKind(f.kind); h.face = f; faces.push(f);
      const a = new PaintedAura(style, h.wrap, { preset: k === 'leshy' ? 'forest' : 'grace', h: h.h, particles: k === 'leshy' ? 18 : 14 });
      addShell(a, k === 'leshy' ? 'forest' : 'grace'); scene.add(a.group); auras[k] = a;
      a.onChange = (on) => {
        f.setKind(on ? (k === 'leshy' ? 'rage' : 'angry') : (k === 'leshy' ? 'glow' : 'stern'));
        $(k === 'leshy' ? '#auL' : '#auB').classList.toggle('on', on);
        if (on) { h.act(k === 'leshy' ? 'Attack' : 'Attack4'); }
      };
    }
    scene.add(marks.group);
  } catch (e) { errBox.textContent = 'Модели не загрузились: ' + e.message; }
  setPal(1); setTod('day', true); Object.assign(C, target('day', 1)); for (const k of Object.keys(C)) if (C[k]?.clone) C[k] = C[k].clone();
  $('#loading').remove();
  frame();
})();
window.__show = { setView, jump(k) { const v = VIEWS[k]; camera.position.set(...v.pos); controls.target.set(...v.tgt); viewT = null; }, snap() { const t = target(tod, pal); for (const k in t) C[k] = t[k]?.clone ? t[k].clone() : t[k]; }, setTod, setPal, toggleAura, get heroes() { return heroes; }, auras, style };
