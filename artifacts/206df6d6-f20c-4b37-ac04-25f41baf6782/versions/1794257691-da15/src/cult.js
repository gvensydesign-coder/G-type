// Логово культистов: туманная выжженная пустошь, пепельная земля, горелые деревья и обрубки, кости.
// Посреди — кривое каменное возвышение (капище) в несколько метров, к нему ~20 ступеней из кривых камней.
// Наверху круг из стоячих камней в крови, тотемы-чуры с черепами, в центре выцарапан круг с рунами — из него
// идёт красный свет, пульсирует и сыплет искрами. У подножия шесты со стягами, лужи и потёки крови, разбитые бочки.
// Небо белое с редкими облаками, солнце чисто белое, слепит; горизонта не видно — всё тонет в пепельном тумане.
// Мир древнерусский: капище с чурами, солнечные кресты-коловраты на шестах, обережные резы, рогатый череп лося,
// красные ленты-обвязки, бочки на обручах, тележное колесо, сторожевая вышка на холме.
import * as THREE from 'three';
import { paint, glow, U, inkFor, NOISE, DECL, FOG_FN, lin } from './toon.js';
import { Pack, M4, V, beam, tube, box, rope, lashing, rnd, rr, setSeed, cylUV, stoneTex, MAT } from './kit.js';
import { lumpStone, cloth, taper, swell } from './vod.js';

const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function n2(x, z) { return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 1.3) * 0.5 + Math.sin(z * 0.13 + Math.sin(x * 0.05) * 1.7) * 0.35 + Math.sin((x + z) * 0.31) * 0.15; }
function n3(x, z) { return Math.sin(x * 0.53 + Math.sin(z * 0.41) * 1.1) * 0.5 + Math.sin(z * 0.61 + x * 0.17) * 0.5; }

// ---------- размеры ----------
export const WATER_Y = -60;                    // воды нет
export const REFL_Y = 0.02;                    // уровень луж крови: в них отражается капище
export const ISLE = { x: 0, z: 0 };            // центр круга
export const PLAT_Y = 4.4;                     // верх возвышения: 20 ступеней по ~0,22 м
export const FLOOR_Y = PLAT_Y;
export const BASIN = { x: 0, z: 0, rx: 30, rz: 30 };   // ближе 34 м — «у круга», дальше 48 м — «пустошь»
export const FACE = 0, AP_R = 0;
export const H_VOD = 3.0, H_LESHY = 2.5, H_HERO = 1.53;
export const MOON_DIR = new THREE.Vector3(-0.193, 0.375, -0.907).normalize();   // солнце за капищем (смотрим с юга)
const rTop = (a) => 9.6 + 0.85 * Math.sin(3 * a + 0.4) + 0.5 * Math.sin(5 * a + 2.0) + 0.25 * Math.sin(9 * a + 1.0);   // кривой край
const polar = (x, z) => Math.atan2(z, x);
// лестница: с юга (+z), ось чуть виляет; ступени j = 0..19, верх ступени j = PLAT − (j+1)·rise
const ST_N = 20, ST_RUN = 0.46, ST_W = 3.2, ST_RISE = PLAT_Y / ST_N, ST_LEN = ST_N * ST_RUN;
const ST_Z0 = rTop(Math.PI / 2) - 0.5;
const XO = (s) => 0.55 * Math.sin(s * 0.32 + 0.4) - 0.2;
const STJ = Array.from({ length: ST_N }, (_, j) => (j < ST_N - 1 ? Math.sin(j * 12.9898) * 0.035 : 0));
const stepTop = (j) => Math.max(0.0, PLAT_Y - (j + 1) * ST_RISE + STJ[j]);
export const pathX = (z) => XO(z - ST_Z0) * 0.5 + Math.sin(z * 0.045) * 2.5;
// лужи крови: центр, радиус (под ними земля вдавлена до REFL_Y − 0,05)
const POOLS = [[XO(ST_LEN) + 0.3, ST_Z0 + ST_LEN + 1.8, 2.4, 1.6], [-3.2, ST_Z0 + ST_LEN + 0.6, 1.4, 1.0], [4.6, ST_Z0 + ST_LEN + 2.9, 1.7, 1.2],
  [-8.5, 15.5, 1.9, 1.3], [9.5, 14.2, 2.2, 1.4], [-13.5, 6.5, 1.6, 1.1], [14.6, 4.0, 1.4, 1.0], [-5.5, 22.5, 1.2, 0.8], [6.8, 25.0, 1.8, 1.2], [1.8, 29.5, 1.3, 0.9], [-11.5, 19.8, 1.0, 0.7]];

const TOWER = [-36, -44];   // горелая вышка на холме
function baseGround(x, z) {
  const d = Math.hypot(x, z);
  let h = 0.12 + n2(x * 1.6, z * 1.6) * 0.1 + n3(x * 0.7, z * 0.7) * 0.06 + n3(x * 2.3, z * 2.1) * 0.025;
  // колеи и рытвины от телег
  h -= 0.08 * Math.exp(-Math.pow((x - pathX(z)) * 0.9, 2)) * ss(18, 24, z);
  // дальние холмы (тонут в тумане), на одном — горелая вышка
  h += ss(38, 90, d) * (2.0 + 6.0 * (0.5 + 0.5 * n2(x * 0.35, z * 0.35))) + ss(70, 160, d) * 8.0 * (0.5 + 0.5 * Math.sin(Math.atan2(z, x) * 3 + 1));
  h += 5.0 * Math.exp(-(Math.pow(x - TOWER[0], 2) + Math.pow(z - TOWER[1], 2)) / 260);
  return h;
}
export function groundAt(x, z) {
  // лестница: ступенями
  const s = z - ST_Z0, lat = x - XO(s);
  if (s >= 0 && s < ST_LEN && Math.abs(lat) < ST_W / 2 + 0.25) return stepTop(Math.floor(s / ST_RUN));
  const d = Math.hypot(x, z), a = polar(x, z), rt = rTop(a);
  let h = baseGround(x, z);
  // возвышение: плоский кривой верх, крутые бока, у подножия осыпь
  if (d < rt + 7) {
    const top = PLAT_Y + (d > 7.5 ? n3(x * 1.7, z * 1.7) * 0.04 : 0);
    const t = (d - rt) / 2.4, wall = d < rt ? top : PLAT_Y * Math.pow(1 - ss(0, 1, t), 1.3);
    h = Math.max(h, wall, 0.9 * ss(rt + 6.5, rt + 1.2, d) + h * 0);
  }
  // осыпь вдоль лестницы
  if (s > -0.5 && s < ST_LEN + 1.5) { const k = ss(ST_W / 2 + 2.6, ST_W / 2 + 0.25, Math.abs(lat)); const st = stepTop(Math.min(ST_N - 1, Math.max(0, Math.floor(s / ST_RUN)))) - 0.3; h = Math.max(h, lerp(h, st, k)); }
  // лужи
  for (const [px, pz, rx, rz] of POOLS) { const q = Math.hypot((x - px) / rx, (z - pz) / rz); if (q < 1.35) h = lerp(REFL_Y - 0.05, h, ss(0.85, 1.35, q)); }
  return h;
}
export function gmin(x, z, r) { let m = groundAt(x, z); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; m = Math.min(m, groundAt(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
export function segDist(x, z, w) { const ax = w.a[0], az = w.a[1], dx = w.b[0] - ax, dz = w.b[1] - az, L2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); }
export function segT(x, z, w) { const ax = w.a[0], az = w.a[1], dx = w.b[0] - ax, dz = w.b[1] - az, L2 = dx * dx + dz * dz; return Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1))); }
export const houseLocal = (lx, lz) => [lx, lz];
export const STAIR = { top: [XO(0), ST_Z0], dir: [0, 1], len: ST_LEN, w: ST_W };
export const LANDING = { x: XO(ST_LEN), z: ST_Z0 + ST_LEN, y: 0, len: 1 };
export const PORCH_FRONT = 0, SHORE = [pathX(40), 40];

export const SHOT_CAMS = {
  whole: { pos: [-2.5, 1.7, 33], look: [0, 6.2, 0] },
  stair: { pos: [5.2, 2.3, 24.5], look: [0, 3.4, 12] },
  circle: { pos: [-6.5, PLAT_Y + 2.0, 6.8], look: [0.5, PLAT_Y + 2.6, -1.0] },
  totem: { pos: [2.6, PLAT_Y + 1.5, 4.2], look: [0, PLAT_Y + 6.2, 0] },
  foot: { pos: [9.5, 1.5, 22.5], look: [1.5, 0.8, 15.5] },
  waste: { pos: [14, groundAt(14, 62) + 2.2, 62], look: [0, 4, 0] },
  top: { pos: [42, 62, 60], look: [0, 0, 2] },
};
export const SHOT_LIST = {
  whole: { name: 'Капище целиком (как концепт)', fov: 45, theme: 1, hero: [-0.8, 0, 27.5, Math.PI - 0.1] },
  stair: { name: 'Лестница в крови', fov: 52, theme: 1, hero: [1.0, 0, 21.0, Math.PI + 0.2] },
  circle: { name: 'Круг с рунами и тотемы', fov: 58, theme: 1 },
  totem: { name: 'Главный чур с черепом лося', fov: 60, theme: 1 },
  foot: { name: 'Подножие: лужи, бочки, кости', fov: 54, theme: 1 },
  waste: { name: 'Пустошь издали', fov: 50, theme: 0, hero: [pathX(55), 0, 55, Math.PI] },
  top: { name: 'Сверху: размер капища', fov: 46, theme: 1 },
};
export const THEMES = (() => {
  const v3 = (a) => new THREE.Vector3(...a);
  return {
    forest: {   // пустошь: белёсый день, пепельная мгла
      sunDir: MOON_DIR.clone(), sunCol: v3([1.02, 1.0, 0.97]), shadeCol: v3([0.36, 0.36, 0.38]),
      fog: lin('#c4c2be'), fogDen: 0.0105, fogLow: 0.4, low: lin('#b8b5b0'), rim: v3([1.0, 1.0, 1.0]),
      skyTop: lin('#a9a7a4'), skyHor: lin('#c4c2be'),
      lo: [0.03, 0.028, 0.028], hi: [0.98, 0.97, 0.95], expo: 1.0, sat: 0.82, bloomTh: 0.88, rays: 0.4,
    },
    lair: {     // у круга: туман гуще и чуть в кровь, тени темнее, красное сочнее
      sunDir: MOON_DIR.clone(), sunCol: v3([1.0, 0.97, 0.94]), shadeCol: v3([0.3, 0.27, 0.28]),
      fog: lin('#bcb5b1'), fogDen: 0.012, fogLow: 0.45, low: lin('#b2a5a1'), rim: v3([1.0, 0.95, 0.93]),
      skyTop: lin('#a8a4a1'), skyHor: lin('#bcb5b1'),
      lo: [0.035, 0.022, 0.024], hi: [0.98, 0.96, 0.95], expo: 1.02, sat: 0.95, bloomTh: 0.82, rays: 0.55,
    },
  };
})();
export const THEME_NAMES = ['пустошь', 'капище'];
export const INFO = {
  title: 'Логово культистов',
  sub: 'Выжженная пустошь в пепельном тумане, посреди — капище на кривом каменном возвышении. WASD — идти, Shift — бег, стрелки — чуть повернуть камеру, цифры — ракурсы, F — свободный полёт. Мышь камерой не управляет (кроме полёта).',
  themes: ['Авто', 'Пустошь', 'Капище'],
  sizes: [
    'Возвышение кривое, ~19–21 м по верху, высота 4,4 м; бока из кривых глыб, у подножия осыпь.',
    'Лестница: 20 кривых каменных ступеней по ~0,22 м, проступь 0,46 м, ширина ~3,2 м, ось чуть виляет.',
    'Круг из 11 стоячих камней 1,6–2,8 м; выцарапанный круг с рунами Ø ~12,6 м; главный чур ~8,5 м, вокруг 6 чуров 4–5,5 м; богатырь 1,53 м.',
  ],
  scene: [
    'Пепельная серая земля, горелые деревья и острые обрубки, поваленные стволы, скелеты людей, кости, черепа.',
    'Наверху: стоячие камни в крови, чуры с черепами, главный — с рогатым черепом лося; между чурами верёвки с красными лоскутами.',
    'В центре выцарапан круг: кольца, резы-руны, коловорот; из борозд красный свет пульсирует и сыплет искрами.',
    'У подножия: шесты со стягами и солнечными крестами, копья, лужи и потёки крови (кровь течёт по ступеням), разбитые бочки, тележное колесо.',
    'Небо белое, редкие облака, солнце чисто белое и слепит; горизонта нет — пустошь тонет в тумане. Лёгкий ветер: стяги и ленты качаются, тотемы чуть ходят, летит пепел.',
  ],
  sound: 'Звук ветра',
};

// ---------- материалы ----------
const M = {
  stone: paint({ base: '#57524e', moss: '#5a110d', mossAmt: 0.32, map: stoneTex, mapRep: [1, 1], mapGain: 1.35, drip: 0.75, vary: 0.8, strokeAmt: 0.18, break: 0.3, rim: 0.7 }),
  stoneDark: paint({ base: '#3e3a37', moss: '#4e0e0b', mossAmt: 0.25, map: stoneTex, mapRep: [0.6, 0.6], mapGain: 1.4, drip: 0.6, vary: 0.7, strokeAmt: 0.2, stroke: [0, 1, 0], break: 0.3, rim: 0.6 }),
  step: paint({ base: '#5a5450', moss: '#6a120d', mossAmt: 0.5, map: stoneTex, mapRep: [1.2, 1.2], mapGain: 1.3, wet: 0.5, drip: 0.6, vary: 0.8, strokeAmt: 0.15, rim: 0.7 }),
  menhir: paint({ base: '#615b56', moss: '#6e130e', mossAmt: 0.42, map: stoneTex, mapRep: [0.8, 0.8], mapGain: 1.4, drip: 1.0, vary: 0.8, strokeAmt: 0.2, stroke: [0, 1, 0], rim: 0.8 }),
  char: paint({ base: '#2b2725', stroke: [0, 1, 0], strokeAmt: 0.34, break: 0.32, rim: 0.7, map: MAT.bark.uniforms.uMap.value, mapRep: [1 / 3.0, 1 / 1.6], mapGain: 1.25 }),
  charL: paint({ base: '#3d3733', stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.3, rim: 0.7, map: MAT.bark.uniforms.uMap.value, mapRep: [1 / 3.0, 1 / 1.6], mapGain: 1.3 }),
  totem: paint({ base: '#4c3e34', moss: '#5e0f0b', mossAmt: 0.38, drip: 0.9, stroke: [0, 1, 0], strokeAmt: 0.24, break: 0.26, rim: 0.8, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.4 }),
  totemD: paint({ base: '#2f2621', moss: '#5e0f0b', mossAmt: 0.3, drip: 0.8, stroke: [0, 1, 0], strokeAmt: 0.24, rim: 0.7, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.4 }),
  wood: paint({ base: '#4a3d33', stroke: [1, 0, 0], strokeAmt: 0.16, rim: 0.7, moss: '#5a120d', mossAmt: 0.2, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.4 }),
  bone: paint({ base: '#ddd0b2', strokeAmt: 0.12, break: 0.22, rim: 0.8, moss: '#6a1a12', mossAmt: 0.16 }),
  boneD: paint({ base: '#bcae93', strokeAmt: 0.14, break: 0.22, rim: 0.7, moss: '#5a1410', mossAmt: 0.25 }),
  dark: MAT.dark, iron: MAT.iron, rope: MAT.rope,
  ropeRed: paint({ base: '#8a1d15', strokeAmt: 0.2, stroke: [1, 0, 0], rim: 0.8 }),
  rag: paint({ base: '#8c1a14', side: THREE.DoubleSide, sway: 1.5, swayM: [3, 0, 1], strokeAmt: 0.16, break: 0.3, rim: 0.5, moss: '#3a0806', mossAmt: 0.25 }),
  ragD: paint({ base: '#5a1310', side: THREE.DoubleSide, sway: 1.5, swayM: [3, 0, 1], strokeAmt: 0.16, break: 0.3, rim: 0.4 }),
  ragG: paint({ base: '#5d5650', side: THREE.DoubleSide, sway: 1.4, swayM: [3, 0, 1], strokeAmt: 0.16, break: 0.3, rim: 0.4, moss: '#6a120d', mossAmt: 0.3 }),
  ember: glow('#ff3a1e', { k: 1.6, flick: 0.6 }),
  coal: glow('#ff5a1e', { k: 1.2, flick: 0.9 }),
  crow: paint({ base: '#1b1919', strokeAmt: 0.08, rim: 0.6, break: 0.2 }),
  clay: paint({ base: '#6a4834', strokeAmt: 0.16, rim: 0.7, moss: '#5a0d0a', mossAmt: 0.35, drip: 0.8 }),
  bloodS: paint({ base: '#6a0a07', wet: 1.0, rim: 1.2, strokeAmt: 0.05, emit: [0.04, 0.0, 0.0] }),
};
for (const k of ['rag', 'ragD', 'ragG', 'ropeRed', 'rope']) M[k].userData.noInk = true;
for (const k of Object.keys(M)) if (M[k] && M[k].userData && !M[k].userData.name) M[k].userData.name = k;

// кровь бежит по ленте: uv.x поперёк (0..1), uv.y вдоль (метры); тёмная, по ней бегут светлые струйки и блики неба
function bloodFlowMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uSpeed: { value: 0.75 } }),
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vWPos; varying vec3 vN; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform float uSpeed; varying vec2 vUv; varying vec3 vWPos; varying vec3 vN;
      void main(){
        float t = uTime * uSpeed;
        float wv = vnoise2(vec2(vUv.y * 0.9, 3.0)) * 0.35;                    // лента шире-уже вдоль
        float e = 1.0 - abs(vUv.x * 2.0 - 1.0) + (vnoise2(vec2(vUv.x * 5.0, vUv.y * 2.5)) - 0.5) * 0.55 - wv * 0.6;
        float a = smoothstep(0.0, 0.18, e);
        if (a < 0.02) discard;
        float n = vnoise2(vec2(vUv.x * 3.0, vUv.y * 1.6 - t * 1.4));
        float n2 = vnoise2(vec2(vUv.x * 7.0 + 3.0, vUv.y * 3.5 - t * 2.3));
        vec3 c = vec3(0.2, 0.012, 0.012);
        c = mix(c, vec3(0.42, 0.03, 0.025), smoothstep(0.55, 0.62, n));           // струи посветлее
        c = mix(c, vec3(0.1, 0.004, 0.006), smoothstep(0.12, 0.0, e));             // кромка подсыхает, темнее
        vec3 V = normalize(cameraPosition - vWPos);
        float fr = pow(1.0 - max(dot(normalize(vN), V), 0.0), 3.0);
        float gl = step(0.78, n2) * (0.35 + 0.65 * fr);                              // блик белого неба бежит вниз
        c += vec3(0.75, 0.55, 0.55) * gl * 0.55;
        c += nearLights(vWPos, normalize(vN), 0.5) * 0.25;
        gl_FragColor = vec4(applyFog(c, vWPos), a * 0.96); }`,
  });
}
// лужа крови: зеркало (капище, небо), рябь от ветра, медленный водоворот, тёмная кромка
function poolMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U),
    transparent: true, depthWrite: true,
    vertexShader: /* glsl */`attribute float aEdge; varying vec3 vWPos; varying float vE; void main(){ vE = aEdge; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflOn; varying vec3 vWPos; varying float vE;
      void main(){
        vec2 xz = vWPos.xz;
        vec2 nxz = vec2(vnoise2(xz * vec2(2.2, 1.0) + uTime * vec2(0.5, 0.2)) - 0.5, vnoise2(xz * vec2(1.0, 2.2) - uTime * vec2(0.2, 0.45)) - 0.5);
        vec3 V = normalize(cameraPosition - vWPos);
        float fres = pow(1.0 - max(V.y, 0.0), 2.5);
        vec3 refl = uFogCol;
        if (uReflOn > 0.5){ vec4 pr = uReflMat * vec4(vWPos.x, ${'0.02'}, vWPos.z, 1.0); vec2 ruv = pr.xy / pr.w + nxz * 0.02;
          refl = texture2D(uRefl, ruv).rgb * 0.6 + texture2D(uRefl, ruv + vec2(0.0, 0.008)).rgb * 0.4; }
        vec3 deep = vec3(0.26, 0.01, 0.012);
        vec3 c = mix(deep, refl * vec3(0.9, 0.12, 0.1), 0.25 + fres * 0.5);        // отражение тонет в красном
        vec3 nn = normalize(vec3(nxz.x * 0.2, 1.0, nxz.y * 0.2));
        float gl = pow(max(dot(reflect(-V, nn), normalize(uSunDir)), 0.0), 60.0);   // блик белого солнца
        c += vec3(1.0, 0.62, 0.58) * gl * 0.9;
        float sw = vnoise2(xz * 1.3 + vec2(sin(uTime * 0.2), cos(uTime * 0.17)) * 0.8);
        c = mix(c, vec3(0.3, 0.02, 0.02), smoothstep(0.62, 0.7, sw) * 0.5);          // разводы
        float rip = step(0.9, vnoise2(xz * vec2(3.0, 9.0) + uTime * vec2(0.3, 1.1))); c += vec3(0.5, 0.35, 0.35) * rip * 0.18 * (0.4 + fres);
        c += nearLights(vWPos, vec3(0.0, 1.0, 0.0), 0.5) * 0.35;
        float edge = smoothstep(0.75, 1.0, vE + (vnoise2(xz * 4.0) - 0.5) * 0.25);
        c = mix(c, vec3(0.07, 0.01, 0.01), edge * 0.85);                                  // подсохшая кромка
        gl_FragColor = vec4(applyFog(c, vWPos), 1.0); }`,
  });
}
// выцарапанный круг: кольца, резы-руны, коловорот, трещины; из борозд красный свет, пульсирует
function runeMat() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uPulse: { value: 1 } }),
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    vertexShader: /* glsl */`varying vec2 vP; varying vec3 vWPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform float uPulse; varying vec2 vP; varying vec3 vWPos;
      float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
      void main(){
        vec2 p = vP; float r = length(p), an = atan(p.y, p.x);
        float W = 0.075 + 0.035 * vnoise2(p * 3.0);                    // борозда неровная, процарапана
        float d = 1e3;
        d = min(d, abs(r - 6.0)); d = min(d, abs(r - 5.35)); d = min(d, abs(r - 2.3)); d = min(d, abs(r - 1.55));
        // резы-руны между внешними кольцами: 28 знаков из 2–4 черт
        float N = 28.0, ci = floor((an + 3.14159) / 6.28318 * N), ca = (ci + 0.5) / N * 6.28318 - 3.14159;
        vec2 tg = vec2(-sin(ca), cos(ca)), rd = vec2(cos(ca), sin(ca)); vec2 q = vec2(dot(p, tg), dot(p, rd) - 5.675);   // локально: x вдоль круга, y поперёк
        float g = 1e3; float hs = 0.24;
        g = min(g, seg(q, vec2(0.0, -hs), vec2(0.0, hs)));                                         // ствол знака
        float k1 = h1(ci + 1.0), k2 = h1(ci + 2.0), k3 = h1(ci + 3.0);
        if (k1 > 0.3) g = min(g, seg(q, vec2(0.0, hs * 0.4), vec2((k2 - 0.5) * 0.36, hs * (k3 > 0.5 ? 0.9 : -0.1))));
        if (k2 > 0.4) g = min(g, seg(q, vec2(0.0, -hs * 0.2), vec2((k3 - 0.5) * 0.4, -hs * 0.8)));
        if (k3 > 0.6) g = min(g, seg(q, vec2(-0.12, hs * 0.1), vec2(0.12, hs * 0.1)));
        d = min(d, g);
        // коловорот: 8 загнутых лучей между кольцами 2,3 и 5,35
        float sp = an * 8.0 / 6.28318 + (r - 2.3) * 0.32;
        float ray = abs(fract(sp) - 0.5) * 6.28318 / 8.0 * r;
        d = min(d, mix(1e3, ray, step(2.3, r) * step(r, 5.35)));
        // трещины от круга к краю: рваные, светятся слабее
        float cr = 1e3; for (int i = 0; i < 7; i++) { float fi = float(i), a0 = h1(fi + 20.0) * 6.28318; vec2 dir = vec2(cos(a0), sin(a0)), nr = vec2(-dir.y, dir.x);
          float al = dot(p, dir), wob = (vnoise2(vec2(al * 1.7, fi * 3.1)) - 0.5) * 0.5; float c0 = abs(dot(p, nr) - wob); if (al > 5.9 && al < 6.0 + 1.6 + h1(fi) * 1.8) cr = min(cr, c0); }
        float line = 1.0 - smoothstep(W * 0.5, W * 1.4, d);
        float crk = (1.0 - smoothstep(0.02, 0.06, cr)) * 0.7;
        float spill = exp(-min(d, cr) * 9.0);                                                     // свет переливается за кромку
        float pulse = uPulse * (0.78 + 0.22 * sin(uTime * 2.2 + r * 0.9) + 0.06 * sin(uTime * 13.0 + an * 3.0));
        float lv = max(line, crk) * pulse;
        vec3 hot = mix(vec3(1.0, 0.08, 0.04), vec3(1.0, 0.42, 0.22), smoothstep(0.7, 1.0, line * vnoise2(p * 6.0 + uTime)));
        vec3 groove = vec3(0.08, 0.01, 0.01);
        vec3 c = mix(groove, hot * 2.4, clamp(lv, 0.0, 1.0)) + vec3(0.9, 0.05, 0.03) * spill * 0.5 * pulse;
        float a = clamp(max(line, crk) + spill * 0.45 * pulse, 0.0, 1.0) * smoothstep(6.6, 6.2, r + (al_dummy(0.0)));
        gl_FragColor = vec4(c, a); }
      `.replace('al_dummy(0.0)', '0.0'),
  });
}
// искры (из круга вверх) и пепел (сверху вниз, по ветру): квадраты к камере
function particleMat(kind) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uPulse: { value: 1 } }),
    transparent: true, depthWrite: false, blending: kind === 'spark' ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */`uniform float uTime; uniform float uPulse; attribute vec4 aSrc; attribute vec4 aP; varying vec2 vQ; varying float vL; varying float vK;
      void main(){ vQ = position.xy;
        float life = fract(uTime * aP.y + aP.x); vL = life;
        vec3 p = aSrc.xyz;
        ${kind === 'spark'
          ? 'p += vec3(sin(aP.w * 40.0 + uTime * 1.3) * 0.35 * life + 1.2 * life * life, life * aSrc.w, cos(aP.w * 23.0 + uTime) * 0.35 * life - 0.5 * life * life);'
          : 'p += vec3(1.0 * uTime * 0.0 + life * 9.0 + sin(uTime * 0.7 + aP.w * 9.0) * 0.6, -life * aSrc.w, -life * 4.0 + cos(uTime * 0.5 + aP.w * 7.0) * 0.6);'}
        vK = ${kind === 'spark' ? 'uPulse' : '1.0'};
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float sz = aP.z * ${kind === 'spark' ? '(1.0 - life * 0.7)' : '1.0'};
        mv.xy += vec2(position.x, position.y * ${kind === 'spark' ? '1.0' : '0.6'}) * sz;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying vec2 vQ; varying float vL; varying float vK;
      void main(){ float d = length(vQ) * 2.0; if (d > 1.0) discard;
        float a = smoothstep(1.0, 0.3, d) * smoothstep(0.0, 0.08, vL) * smoothstep(1.0, 0.65, vL);
        ${kind === 'spark'
          ? 'vec3 c = mix(vec3(1.0, 0.62, 0.3), vec3(1.0, 0.1, 0.04), vL) * 2.2 * vK; gl_FragColor = vec4(c * a, a);'
          : 'gl_FragColor = vec4(vec3(0.24, 0.23, 0.22), a * 0.75);'} }`,
  });
}

// ---------- мелкие сборки ----------
// человеческий череп: свод, скулы, глазницы, нос, челюсть с зубами
function skull(P, x, y, z, s, ry, rx = 0, jaw = true) {
  const B = M4(x, y, z, rx, ry, 0, s, s, s), add = (mat, g, m) => P.add(mat, g, B.clone().multiply(m));
  add(M.bone, new THREE.SphereGeometry(0.105, 10, 8), M4(0, 0.03, -0.01, 0, 0, 0, 1.0, 0.95, 1.15));
  add(M.bone, new THREE.BoxGeometry(0.15, 0.07, 0.1), M4(0, -0.045, 0.06));
  for (const sd of [-1, 1]) { add(M.dark, new THREE.SphereGeometry(0.03, 6, 5), M4(sd * 0.042, 0.0, 0.1, 0, 0, 0, 1, 0.9, 0.6)); add(M.bone, new THREE.BoxGeometry(0.03, 0.04, 0.06), M4(sd * 0.072, -0.03, 0.05)); }
  add(M.dark, new THREE.ConeGeometry(0.016, 0.035, 3), M4(0, -0.04, 0.108, Math.PI, 0, 0));
  for (let k = 0; k < 6; k++) add(M.bone, new THREE.BoxGeometry(0.014, 0.022, 0.012), M4(-0.035 + k * 0.014, -0.083, 0.098));
  if (jaw) add(M.boneD, new THREE.BoxGeometry(0.12, 0.035, 0.09), M4(0, -0.115, 0.055, 0.15, 0, 0));
}
// рогатый череп лося: вытянутый, с носовой костью, глазницы, рога лопатами с отростками
function elkSkull(P, x, y, z, s, ry) {
  const B = M4(x, y, z, -0.25, ry, 0, s, s, s), add = (mat, g, m) => P.add(mat, g, B.clone().multiply(m));
  add(M.bone, new THREE.SphereGeometry(0.2, 10, 8), M4(0, 0, 0, 0, 0, 0, 1.0, 0.85, 1.0));
  add(M.bone, new THREE.CylinderGeometry(0.07, 0.13, 0.62, 8), M4(0, -0.12, 0.33, Math.PI / 2 + 0.35, 0, 0));
  for (const sd of [-1, 1]) add(M.dark, new THREE.SphereGeometry(0.05, 6, 5), M4(sd * 0.13, 0.02, 0.12, 0, 0, 0, 0.8, 1, 0.7));
  add(M.dark, new THREE.BoxGeometry(0.06, 0.03, 0.2), M4(0, -0.05, 0.55, 0.35, 0, 0));
  for (const sd of [-1, 1]) {
    const P2 = new Pack(); const b0 = V(sd * 0.15, 0.14, -0.05), b1 = V(sd * 0.55, 0.45, -0.12), b2 = V(sd * 0.85, 0.95, -0.05), b3 = V(sd * 0.95, 1.45, 0.05);
    taper(P2, M.boneD, [b0, b1, b2, b3], 0.06, 0.025, 6, 12);
    for (const [t, l, dy, dx] of [[0.35, 0.35, 0.3, 0.15], [0.55, 0.42, 0.4, 0.25], [0.75, 0.38, 0.32, 0.3], [0.62, 0.3, 0.25, -0.12]]) {
      const c = new THREE.CatmullRomCurve3([b0, b1, b2, b3]).getPoint(t);
      taper(P2, M.boneD, [c, c.clone().add(V(sd * dx * 0.5, dy * 0.6, 0.04)), c.clone().add(V(sd * dx, dy + l * 0.4, 0.06))], 0.028, 0.01, 5, 6);
    }
    for (const [mat, list] of P2.parts) for (const g of list) add(mat, g, new THREE.Matrix4());
  }
}
// солнечный крест (коловрат-оберег) из кованого железа: обод и крест, на шесте
function sunCross(P, x, y, z, r, ry) {
  P.add(M.iron, new THREE.TorusGeometry(r, r * 0.07, 5, 18), M4(x, y, z, 0, ry, 0));
  for (const a of [0, Math.PI / 2]) box(P, M.iron, r * 2.15, r * 0.11, r * 0.1, M4(x, y, z, 0, ry, a));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; P.add(M.iron, new THREE.ConeGeometry(r * 0.08, r * 0.3, 4), M4(x + Math.cos(ry) * Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, z - Math.sin(ry) * Math.cos(a) * r * 1.1, 0, ry, a - Math.PI / 2)); }
}
// лежащий скелет: череп, позвоночник, рёбра дугами, таз, руки и ноги; поза — немного разбросан
function skeleton(P, x, z, yaw, y0, sc = 1, curl = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), L = (lx, lz, ly = 0) => V(x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c);
  const spine = []; for (let k = 0; k <= 8; k++) { const t = k / 8; spine.push(L(Math.sin(t * 2.0) * 0.08 * (1 + curl), -0.55 * sc + t * 1.05 * sc, 0.06 + 0.03 * Math.sin(t * 3.1))); }
  for (const q of spine) P.add(M.boneD, new THREE.SphereGeometry(0.03 * sc, 6, 4), M4(q.x, q.y, q.z, 0, 0, 0, 1.2, 0.8, 1.2));
  tube(P, M.boneD, spine, 0.016 * sc, 5, 12);
  const hd = spine[8].clone().add(L(0, 0.18 * sc).sub(L(0, 0))); skull(P, hd.x, y0 + 0.1 * sc, hd.z, sc, yaw + rr(-0.8, 0.8), -1.2 + rr(-0.3, 0.3), rnd() < 0.7);
  for (let k = 0; k < 7; k++) { const q = spine[3 + Math.min(4, Math.floor(k * 0.7))].clone(); const ly = -0.05 * k * sc; for (const sd of [-1, 1]) {
    const a = L(0, ly + 0.15 * sc, 0.08).add(V(0, 0, 0)), b = L(sd * 0.17 * sc, ly + 0.1 * sc, 0.13 - k * 0.006), e = L(sd * 0.2 * sc * (1 - k * 0.06), ly, 0.02 + rr(0, 0.05));
    a.x += q.x - x - 0; a.z += q.z - z; b.x += q.x - x; b.z += q.z - z; e.x += q.x - x; e.z += q.z - z; taper(P, M.bone, [a, b, e], 0.014 * sc, 0.008 * sc, 4, 6); } }
  P.add(M.boneD, new THREE.TorusGeometry(0.11 * sc, 0.035 * sc, 5, 10), (() => { const q = L(0, -0.58 * sc, 0.06); return M4(q.x, q.y, q.z, Math.PI / 2 - 0.3, 0, yaw); })());
  // руки и ноги: кость + кость, суставы шарами
  const limb = (a, b, e, r) => { taper(P, M.bone, [a, a.clone().lerp(b, 0.5), b], r, r * 0.8, 4, 4); taper(P, M.bone, [b, b.clone().lerp(e, 0.5), e], r * 0.9, r * 0.7, 4, 4); P.add(M.boneD, new THREE.SphereGeometry(r * 1.4, 5, 4), M4(b.x, b.y, b.z)); };
  for (const sd of [-1, 1]) {
    limb(L(sd * 0.2 * sc, 0.32 * sc, 0.05), L(sd * (0.38 + rr(0, 0.15)) * sc, 0.0 * sc + rr(-0.15, 0.15), 0.035), L(sd * (0.42 + rr(0, 0.25)) * sc, -0.3 * sc + rr(-0.2, 0.2), 0.03), 0.02 * sc);
    limb(L(sd * 0.1 * sc, -0.62 * sc, 0.05), L(sd * (0.16 + rr(0, 0.12)) * sc, -1.05 * sc + curl * 0.3, 0.045), L(sd * (0.2 + rr(0, 0.2)) * sc, -1.5 * sc + curl * 0.6, 0.035), 0.026 * sc);
  }
}
// разбитая бочка: клёпки по кругу (часть выбита и валяется рядом), два обруча; лежит на боку или стоит
function barrel(P, x, z, yaw, lying, broken) {
  const R = 0.34, H = 0.86, g = gmin(x, z, 0.5), n = 14;
  const B = lying ? M4(x, g + R * 0.92, z, 0, yaw, Math.PI / 2) : M4(x, g + H / 2 - 0.02, z, rr(-0.05, 0.05), yaw, 0);
  for (let k = 0; k < n; k++) {
    if (broken && (k % 5 === 1 || k === 7)) continue;
    const a = k / n * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), bulge = 1.08;
    const pts = [V(cs * R, -H / 2, sn * R), V(cs * R * bulge, 0, sn * R * bulge), V(cs * R, H / 2 * (broken && k % 3 === 0 ? rr(0.2, 0.8) : 1), sn * R)];
    const P2 = new Pack(); tube(P2, M.wood, pts, 0.035, 3, 4);
    for (const gg of P2.parts.get(M.wood)) P.add(M.wood, gg, B);
  }
  for (const yy of [-0.28, 0.28]) P.add(M.iron, new THREE.TorusGeometry(R * 1.05, 0.015, 4, 20), B.clone().multiply(M4(0, yy * H, 0, Math.PI / 2, 0, 0)));
  if (!broken) P.add(M.wood, new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.03, 14), B.clone().multiply(M4(0, H / 2 - 0.04, 0)));
  if (broken) for (let k = 0; k < 3; k++) { const a = rr(0, 6.28), d = rr(0.7, 1.4), sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d; box(P, M.wood, 0.09, 0.03, 0.82, M4(sx, gmin(sx, sz, 0.4) + 0.02, sz, rr(-0.1, 0.1), rr(0, 6), rr(-0.1, 0.1))); }
}
// тележное колесо: обод, спицы, ступица; лежит, частично сломано
function wheel(P, x, z, yaw, tilt) {
  const g = gmin(x, z, 0.7), B = M4(x, g + 0.62 * Math.cos(tilt) * 0.0 + 0.12, z, Math.PI / 2 - tilt, yaw, 0);
  const P2 = new Pack();
  P2.add(M.wood, new THREE.TorusGeometry(0.6, 0.05, 5, 22, Math.PI * 1.65), M4(0, 0, 0));
  P2.add(M.iron, new THREE.TorusGeometry(0.64, 0.015, 4, 22, Math.PI * 1.5), M4(0, 0, 0));
  P2.add(M.wood, new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8), M4(0, 0, 0, Math.PI / 2, 0, 0));
  for (let k = 0; k < 9; k++) { if (k === 6) continue; const a = k / 10 * Math.PI * 2; box(P2, M.wood, 0.05, 0.56, 0.04, M4(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0, 0, 0, a - Math.PI / 2)); }
  for (const [mat, list] of P2.parts) for (const gg of list) P.add(mat, gg, B);
}

// цепь: звенья-кольца по провисающей линии, через одно повёрнуты
function chain(P, a, b, sag = 0.2, L = 0.09) {
  const d = a.distanceTo(b), n = Math.max(3, Math.round(d / (L * 0.8))), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t); pts.push(p); }
  for (let i = 0; i < n; i++) { const p = pts[i].clone().lerp(pts[i + 1], 0.5), dir = pts[i + 1].clone().sub(pts[i]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), i % 2 ? Math.PI / 2 : 0));
    P.add(M.iron, new THREE.TorusGeometry(L * 0.5, L * 0.12, 4, 8).scale(0.7, 1.15, 1), new THREE.Matrix4().compose(p, q, V(1, 1, 1))); }
}
function chainRing(P, x, y, z, r) { const pts = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 2; pts.push(V(x + Math.cos(a) * r, y + Math.sin(a * 2 + 1) * 0.03 - (k > 9 ? 0.05 : 0), z + Math.sin(a) * r)); } for (let k = 0; k < 12; k++) chain(P, pts[k], pts[k + 1], 0.0); }
// ворон сидит: тело, голова с клювом, хвост, сложенные крылья
function crowSit(P, x, y, z, ry, s = 1, peck = 0) {
  const B = M4(x, y, z, 0, ry, 0, s, s, s), add = (g, m) => P.add(M.crow, g, B.clone().multiply(m));
  add(new THREE.SphereGeometry(0.11, 8, 6), M4(0, 0.13, 0, -0.35, 0, 0, 0.75, 0.8, 1.6));
  add(new THREE.SphereGeometry(0.068, 7, 5), M4(0, 0.25 - peck * 0.12, 0.15 + peck * 0.05, 0, 0, 0, 1, 1, 1.15));
  P.add(M.iron, new THREE.ConeGeometry(0.022, 0.1, 4), B.clone().multiply(M4(0, 0.24 - peck * 0.14, 0.24 + peck * 0.05, Math.PI / 2 + peck * 0.6, 0, 0)));
  add(new THREE.BoxGeometry(0.1, 0.02, 0.2), M4(0, 0.1, -0.2, 0.45, 0, 0));
  for (const sd of [-1, 1]) { add(new THREE.BoxGeometry(0.03, 0.09, 0.24), M4(sd * 0.075, 0.15, -0.03, -0.3, 0, sd * 0.15)); P.add(M.iron, new THREE.CylinderGeometry(0.008, 0.008, 0.08, 3), B.clone().multiply(M4(sd * 0.035, 0.03, 0.02))); }
}
// обрядовая чаша: глиняная, в ней кровь
function bowl(P, x, y, z, r) {
  const prof = [[0.0, 0], [r * 0.55, 0], [r * 0.85, r * 0.25], [r, r * 0.62], [r * 0.93, r * 0.66], [r * 0.78, r * 0.32], [0.0, r * 0.12]].map(([a, b]) => new THREE.Vector2(a, b));
  P.add(M.clay, new THREE.LatheGeometry(prof, 12), M4(x, y, z));
  P.add(M.bloodS, new THREE.CircleGeometry(r * 0.86, 12).rotateX(-Math.PI / 2), M4(x, y + r * 0.5, z));
}

export function buildLair(scene) {
  setSeed(4242);
  U.uWaterY.value = WATER_Y; U.uMoonRim.value.set(0, 0, 0, 0);
  const P = new Pack(), PG = new Pack();
  const solids = [], lights = [], walks = [], anim = { swing: [] }, mists = [];
  const addLight = (pos, col, r, flick = 0.3, pri = 0) => { const l = { pos, col: col.slice(), base: col.slice(), r, flick, pri }; lights.push(l); return l; };
  const mk = (geo, mat, mats, shadow = true, ink = true, parent = scene) => {
    const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = shadow; im.receiveShadow = true; parent.add(im);
    if (ink) { const o = new THREE.InstancedMesh(geo, inkFor(mat), mats.length); o.instanceMatrix = im.instanceMatrix; parent.add(o); }
    return im;
  };
  // качание вокруг шарнира (тотем от ветра, верёвка с лоскутами)
  const swingGroup = (pivot, build, o = {}) => {
    const SP = new Pack(), SG = new Pack(); build(SP, SG);
    const T = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    for (const pk of [SP, SG]) for (const list of pk.parts.values()) for (const g of list) g.applyMatrix4(T);
    const g = new THREE.Group(); if (SP.parts.size) g.add(SP.build(true, true)); if (SG.parts.size) g.add(SG.build(false, false));
    g.position.copy(pivot); scene.add(g);
    anim.swing.push({ g, glow: null, base: pivot.clone(), axis: o.axis || null, amp: o.amp ?? 0.05, w: o.w ?? 1.2, ph: rnd() * 6.28, follow: null });
    return g;
  };
  const kept = (x, z, r) => Object.values(SHOT_CAMS).some((s) => Math.hypot(x - s.pos[0], z - s.pos[2]) < r);
  const onStair = (x, z, pad = 0) => { const s = z - ST_Z0; return s > -0.8 && s < ST_LEN + 1.2 && Math.abs(x - XO(s)) < ST_W / 2 + pad; };
  const inPool = (x, z, pad = 0.3) => POOLS.some(([px, pz, rx, rz]) => Math.hypot((x - px) / (rx + pad), (z - pz) / (rz + pad)) < 1.15);

  // ---------- земля: пепел, гарь, у капища — тёмная земля и кровь ----------
  {
    const N = 320, S = 420;
    const g = new THREE.PlaneGeometry(2, 2, N, N); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i), v = pos.getZ(i); const x = Math.sign(u) * u * u * S / 2, z = Math.sign(v) * v * v * S / 2 + 8; pos.setXYZ(i, x, groundAt(x, z), z); }
    g.computeVertexNormals();
    const nrm = g.attributes.normal, col = new Float32Array(pos.count * 3);
    const cAsh = new THREE.Color('#77736d'), cAshL = new THREE.Color('#8e8a84'), cAshD = new THREE.Color('#55514c'), cChar = new THREE.Color('#2f2b28'), cSoil = new THREE.Color('#3f3833'), cBlood = new THREE.Color('#4a1310'), cStone = new THREE.Color('#4a4542');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), d = Math.hypot(x, z), steep = ss(0.8, 0.5, nrm.getY(i));
      const c = cAsh.clone().lerp(cAshL, ss(0.1, 0.6, n3(x * 0.9, z * 0.9)) * 0.6).lerp(cAshD, ss(0.2, 0.7, n2(x * 2.1 + 5, z * 2.1)) * 0.6);
      c.lerp(cChar, ss(0.55, 0.85, n3(x * 0.33 + 2, z * 0.37)) * 0.7);                  // выгоревшие пятна
      c.lerp(cSoil, ss(26, 12, d) * 0.55);                                                  // у капища земля темнее, вытоптана
      c.lerp(cStone, ss(0.5, 0.0, PLAT_Y - y) * ss(14, 9, d));                             // верх — камень
      c.lerp(cStone, steep * 0.6);
      // кровь: подтёки под луже, у подножия лестницы, по колеям
      let bl = 0; for (const [px, pz, rx, rz] of POOLS) { const q = Math.hypot((x - px) / rx, (z - pz) / rz); bl = Math.max(bl, ss(2.2, 1.0, q + (n3(x * 3, z * 3)) * 0.35)); }
      bl = Math.max(bl, ss(1.6, 0.3, Math.abs(x - XO(z - ST_Z0))) * ss(ST_Z0 - 2, ST_Z0 + ST_LEN + 3, z) * ss(ST_Z0 + ST_LEN + 6, ST_Z0 + ST_LEN, z) * 0.8);
      bl = Math.max(bl, ss(7, 3, d) * 0.55);
      c.lerp(cBlood, bl * 0.75);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, paint({ base: '#ffffff', vcol: true, stroke: [0, 1, 0], strokeAmt: 0.22, break: 0.3, rim: 0, moss: '#4a120e', mossAmt: 0.0, drip: 0.0 }));
    m.receiveShadow = true; scene.add(m);
  }

  // ---------- возвышение: кривые глыбы бортом в два яруса, плиты верха, осыпь ----------
  const stairA = Math.PI / 2;
  for (let a = -Math.PI; a < Math.PI; a += 0.0) {
    const rt = rTop(a), step = rr(0.9, 2.5) / rt;
    const da = Math.atan2(Math.sin(a - stairA), Math.cos(a - stairA));
    if (Math.abs(da) * rt > ST_W / 2 + 0.55) {
      const x = Math.cos(a) * (rt + 0.55), z = Math.sin(a) * (rt + 0.55), ry = -a - Math.PI / 2, w = step * rt + rr(0.15, 0.45);
      // нижний ярус: от земли до середины, верхний: до кромки (чуть выше верха, кривые)
      const gl = gmin(x + Math.cos(a) * 0.8, z + Math.sin(a) * 0.8, 1.2), midY = PLAT_Y * rr(0.32, 0.66);
      lumpStone(P, rnd() < 0.5 ? M.stoneDark : M.stone, x + Math.cos(a) * 0.35, (gl - 0.4 + midY + 0.15) / 2, z + Math.sin(a) * 0.35, w * 1.05, midY + 0.55 - gl, rr(2.0, 2.6), ry + rr(-0.12, 0.12), Math.floor(rnd() * 6));
      const topY = PLAT_Y + (rnd() < 0.22 ? rr(0.5, 1.1) : rr(0.0, 0.35));
      lumpStone(P, rnd() < 0.6 ? M.stone : M.stoneDark, x - Math.cos(a) * 0.1, (midY - 0.25 + topY) / 2, z - Math.sin(a) * 0.1, w * rr(0.72, 1.02), topY - midY + 0.25, rr(1.7, 2.2), ry + rr(-0.15, 0.15), Math.floor(rnd() * 6));
      if (rnd() < 0.3) lumpStone(P, M.stone, x + Math.cos(a) * 1.4, gmin(x + Math.cos(a) * 1.4, z + Math.sin(a) * 1.4, 0.6) + 0.1, z + Math.sin(a) * 1.4, rr(0.6, 1.3), rr(0.5, 0.9), rr(0.6, 1.1), rr(0, 6), Math.floor(rnd() * 6));   // упавший камень
      // щели между глыбами: тёмные мелкие камни в стыках, кое-где выпирает камень посередине
      lumpStone(P, M.stoneDark, Math.cos(a) * (rt + 1.25), midY + rr(-0.3, 0.3), Math.sin(a) * (rt + 1.25), rr(0.45, 0.8), rr(0.5, 0.9), rr(0.5, 0.8), rr(0, 6), Math.floor(rnd() * 6));
      if (rnd() < 0.35) lumpStone(P, rnd() < 0.5 ? M.stone : M.step, Math.cos(a + step * 0.5) * (rt + 1.45), PLAT_Y * rr(0.2, 0.7), Math.sin(a + step * 0.5) * (rt + 1.45), rr(0.7, 1.2), rr(0.5, 1.0), rr(0.6, 0.9), rr(0, 6), Math.floor(rnd() * 6));
      solids.push({ x: Math.cos(a) * (rt + 1.2), z: Math.sin(a) * (rt + 1.2), r: 1.35 });
    }
    a += step;
  }
  // плиты верха (кольцом за выцарапанным кругом), трещины между ними
  for (let k = 0; k < 160; k++) {
    const a = rr(-Math.PI, Math.PI), r = rr(6.5, rTop(a) - 0.4), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - XO(0), z - ST_Z0) < 2.0) continue;
    lumpStone(P, rnd() < 0.5 ? M.step : M.stone, x, PLAT_Y - 0.06, z, rr(0.9, 1.6), 0.2, rr(0.8, 1.4), rr(0, 6), Math.floor(rnd() * 6));
  }
  // ---------- лестница: 20 ступеней из кривых камней, по бокам глыбы-откосы ----------
  for (let j = 0; j < ST_N; j++) {
    const s = (j + 0.5) * ST_RUN, top = stepTop(j), cx = XO(s), cz = ST_Z0 + s, hh = ST_RISE + 0.55;
    const sp = rr(-0.3, 0.3);
    { const nS = rnd() < 0.5 ? 2 : 3, ws = Array.from({ length: nS }, () => rr(0.7, 1.3)), tot = ws.reduce((a, b) => a + b, 0), SM = [M.step, M.stone, M.stoneDark]; let xs = cx - ST_W / 2 - 0.12 + sp * 0.1;
      for (let i = 0; i < nS; i++) { const w = ws[i] * (ST_W + 0.24) / tot; lumpStone(P, SM[(j + i * 2) % 3], xs + w / 2, top + rr(-0.03, 0.03) + 0.01 - hh / 2, cz + rr(-0.05, 0.05), w - 0.09, hh, ST_RUN + 0.1, rr(-0.14, 0.14), j * 3 + i); xs += w; }
      box(P, M.dark, ST_W + 0.1, hh * 0.85, ST_RUN - 0.02, M4(cx, top - 0.08 - hh * 0.42, cz));   // тёмное в щелях и под носом ступени
      if (rnd() < 0.4) { const ox = rr(-1.2, 1.2); lumpStone(P, M.stoneDark, cx + ox, top + 0.05, cz + rr(-0.12, 0.12), rr(0.18, 0.32), 0.12, rr(0.15, 0.28), rr(0, 6), j); } }
    if (j % 2 === 0) for (const sd of [-1, 1]) { const x = cx + sd * (ST_W / 2 + 0.75), z = cz + rr(-0.2, 0.2), tp = top + rr(0.1, 0.45), bt = Math.min(tp - 0.7, gmin(x, z, 0.8) - 0.15); lumpStone(P, rnd() < 0.5 ? M.stoneDark : M.stone, x, (tp + bt) / 2, z, rr(1.0, 1.4), tp - bt, rr(0.9, 1.2), rr(-0.4, 0.4), j + sd + 3); }
  }
  walks.push({ a: [XO(0), ST_Z0 - 0.2], b: [XO(ST_LEN), ST_Z0 + ST_LEN + 0.2], w: 0.1, y: -99 });   // (для ракурсов; ходьба — по ступеням рельефа)

  // ---------- круг стоячих камней по кромке ----------
  const MEN = [];
  for (let k = 0; k < 11; k++) {
    const a = stairA + 0.42 + k / 11 * (Math.PI * 2 - 0.84), r = rTop(a) - 0.9, x = Math.cos(a) * r, z = Math.sin(a) * r, h = rr(2.4, 4.1);
    const ry = -a - Math.PI / 2 + rr(-0.2, 0.2), lx = rr(-0.08, 0.08), lz = rr(-0.1, 0.06);
    { const mg = new THREE.CylinderGeometry(0.26 + rr(0, 0.12), 0.5, h, 6, 5).translate(0, h / 2, 0); const mp = mg.attributes.position;
      for (let i = 0; i < mp.count; i++) { const y = mp.getY(i), j = 1 + (Math.sin(i * 12.9898 + k * 7.1) * 0.5) * 0.22 * Math.min(1, y / 0.6); mp.setX(i, mp.getX(i) * j); mp.setZ(i, mp.getZ(i) * j); if (y > h - 0.01) mp.setY(i, y + Math.sin(mp.getX(i) * 9 + k) * 0.18); }
      mg.computeVertexNormals(); P.add(M.menhir, mg.scale(1.5, 1, 0.75), M4(x, PLAT_Y - 0.3, z, lx, ry, lz)); }
    lumpStone(P, M.stoneDark, x, PLAT_Y - 0.05, z, rr(1.4, 1.9), 0.4, rr(1.0, 1.3), ry, k);
    // резы: обережный знак на лице камня (тлеет красным в бороздах)
    const nx = -Math.cos(a), nz = -Math.sin(a), fy = PLAT_Y - 0.3 + h * 0.55, fx = x + nx * 0.38, fz = z + nz * 0.38;
    for (const [w, hgt, ox, oy, rz] of [[0.035, 0.5, 0, 0, 0], [0.03, 0.22, 0.09, 0.12, 0.6], [0.03, 0.22, -0.09, 0.12, -0.6], [0.03, 0.2, 0.08, -0.14, -0.6], [0.03, 0.2, -0.08, -0.14, 0.6]]) PG.add(M.ember, new THREE.BoxGeometry(w, hgt, 0.02), M4(fx + Math.cos(ry) * ox, fy + oy, fz - Math.sin(ry) * ox, 0, ry, rz));
    MEN.push({ x, z, h, a });
    solids.push({ x, z, r: 0.75 });
  }

  // ---------- выцарапанный круг с рунами (свет из борозд) ----------
  const rune = runeMat();
  { const g = new THREE.CircleGeometry(6.7, 128); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, rune); m.position.y = PLAT_Y + 0.02; m.renderOrder = 3; scene.add(m); }
  const RED = [1.0, 0.14, 0.07];
  const pulseL = [addLight(V(0, PLAT_Y + 1.2, 0), [0.6, 0.08, 0.04], 11, 0.15, 1)];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; pulseL.push(addLight(V(Math.cos(a) * 5.6, PLAT_Y + 0.5, Math.sin(a) * 5.6), RED.map((x) => x * 0.55), 5.0, 0.4, 0.5)); }
  pulseL.push(addLight(V(XO(1.5), PLAT_Y - 0.2, ST_Z0 + 1.5), [0.8, 0.1, 0.06], 6, 0.3, 0.5));

  // ---------- главный чур: высокий столб с ликами, череп лося с рогами, черепа на колышках, красные ленты ----------
  const totems = [];
  const chur = (x, z, H, main) => {
    const y0 = PLAT_Y - 0.4, pivot = V(x, PLAT_Y, z), ry = Math.atan2(-x, ST_Z0 - z) * 0 + rr(-0.3, 0.3) + (main ? 0 : Math.atan2(XO(4) - x, ST_Z0 + 4 - z));
    swingGroup(pivot, (SP) => {
      const n = Math.max(2, Math.round(H / 1.7)), bh = H / n, r0 = main ? 0.42 : 0.24;
      for (let k = 0; k < n; k++) {
        const a = V(x, y0 + k * bh, z), b = V(x + Math.sin(k * 1.3) * 0.03, y0 + (k + 1) * bh - 0.05, z);
        swell(SP, k % 2 ? M.totemD : M.totem, a, b, r0 * (1 - k * 0.05), 1.15, 8);
        if (k < n - 1) SP.add(M.totemD, new THREE.CylinderGeometry(r0 * 1.12, r0 * 1.08, 0.1, 9), M4(x, b.y, z));
        // лик: брови, нос, глаза-дыры, рот (у главного на двух ярусах)
        if (k >= 1 && (main || k === n - 2)) { const fy = y0 + k * bh + bh * 0.55, F = (sx, sy, sz, lx, ly, mat = M.totemD) => box(SP, mat, sx, sy, sz, M4(x + Math.sin(ry) * (r0 * 0.95) + Math.cos(ry) * lx, fy + ly, z + Math.cos(ry) * (r0 * 0.95) - Math.sin(ry) * lx, 0, ry, 0));
          F(r0 * 1.3, 0.09, 0.1, 0, 0.14); F(0.07, 0.2, 0.1, 0, 0); for (const sd of [-1, 1]) F(0.1, 0.06, 0.05, sd * r0 * 0.4, 0.05, M.dark); F(r0 * 0.8, 0.05, 0.05, 0, -0.17, M.dark); }
      }
      const top = y0 + H;
      // обвязки красной лентой и верёвкой
      for (const t of main ? [0.32, 0.55, 0.78] : [0.45, 0.7]) for (let q = 0; q < 3; q++) SP.add(q === 1 ? M.rope : M.ropeRed, new THREE.TorusGeometry(r0 * 1.04 + 0.02, 0.022, 4, 14), M4(x, y0 + H * t + q * 0.05, z, Math.PI / 2 + rr(-0.08, 0.08), 0, rr(-0.08, 0.08)));
      if (main) {
        SP.add(M.totem, new THREE.ConeGeometry(r0 * 0.85, 0.6, 8), M4(x, top + 0.25, z));
        elkSkull(SP, x + Math.sin(ry) * 0.25, top - 0.15, z + Math.cos(ry) * 0.25, 1.35, ry);
        // черепа на колышках вокруг столба
        for (let k = 0; k < 4; k++) { const a = ry + (k - 1.5) * 1.1, hy = top - 1.2 - (k % 2) * 1.4, px = x + Math.sin(a) * (r0 + 0.25), pz = z + Math.cos(a) * (r0 + 0.25);
          beam(SP, M.wood, V(x + Math.sin(a) * r0 * 0.6, hy, z + Math.cos(a) * r0 * 0.6), V(px, hy + 0.06, pz), 0.03, 5); skull(SP, px + Math.sin(a) * 0.06, hy + 0.17, pz + Math.cos(a) * 0.06, 1.1, a + rr(-0.3, 0.3)); }
        // ленты: длинные, рваные, свисают с поясов
        for (let k = 0; k < 6; k++) { const a = ry + k * 1.05 + rr(-0.2, 0.2), ty = y0 + H * rr(0.45, 0.82), px = x + Math.sin(a) * (r0 + 0.03), pz = z + Math.cos(a) * (r0 + 0.03); cloth(SP, k % 3 ? M.rag : M.ragD, px, ty, pz, rr(0.2, 0.34), rr(1.2, 2.4), a + Math.PI / 2); }
      } else {
        SP.add(M.totem, new THREE.ConeGeometry(0.06, 0.45, 5), M4(x, top + 0.22, z));   // острие
        skull(SP, x, top + 0.13, z, 1.25, ry, 0.0, true);
        if (rnd() < 0.6) { const by = top - 0.6; beam(SP, M.wood, V(x - Math.cos(ry) * 0.6, by, z + Math.sin(ry) * 0.6), V(x + Math.cos(ry) * 0.6, by, z - Math.sin(ry) * 0.6), 0.04, 5); lashing(SP, x, by - 0.06, z, r0); cloth(SP, M.rag, x + Math.sin(ry) * 0.06, by - 0.02, z + Math.cos(ry) * 0.06, 1.0, rr(1.0, 1.6), ry); }
        else for (let k = 0; k < 3; k++) { const a = ry + k * 2.1, px = x + Math.sin(a) * (r0 + 0.02), pz = z + Math.cos(a) * (r0 + 0.02); cloth(SP, k ? M.rag : M.ragG, px, top - rr(0.3, 0.9), pz, 0.22, rr(0.8, 1.6), a + Math.PI / 2); }
      }
    }, { amp: main ? 0.006 : 0.012, w: rr(0.5, 0.8) });
    totems.push({ x, z, top: y0 + H });
    solids.push({ x, z, r: main ? 0.9 : 0.5 });
  };
  chur(0, -0.3, 8.5, true);
  for (let k = 0; k < 6; k++) { const a = stairA + 0.55 + k / 6 * (Math.PI * 2 - 1.1), r = rTop(a) - 2.4; chur(Math.cos(a) * r, Math.sin(a) * r, rr(4.0, 5.5), false); }
  // гора черепов и костей у главного чура, камни
  for (let k = 0; k < 26; k++) { const a = rr(0, 6.28), r = rr(0.6, 1.6), x = Math.cos(a) * r, z = -0.3 + Math.sin(a) * r, y = PLAT_Y + 0.05 + Math.max(0, 1.4 - r) * 0.25 * rnd();
    if (rnd() < 0.55) skull(P, x, y + 0.1, z, rr(0.9, 1.15), rr(0, 6.28), rr(-0.5, 0.5), rnd() < 0.5); else beam(P, M.boneD, V(x - 0.2, y + 0.03, z - 0.05), V(x + 0.22, y + 0.06, z + 0.07), 0.025, 5); }
  for (let k = 0; k < 7; k++) { const a = k * 0.9, x = Math.cos(a) * 1.15, z = -0.3 + Math.sin(a) * 1.15; lumpStone(P, M.stone, x, PLAT_Y + 0.05, z, rr(0.4, 0.7), rr(0.3, 0.5), rr(0.4, 0.6), rr(0, 6), k); }
  // верёвки с лоскутами между чурами (провисают, качаются)
  for (let i = 0; i < totems.length - 1; i++) {
    const A = totems[i === 0 ? 1 : i], B = totems[i === 0 ? totems.length - 1 : i + 1]; if (i === 0) continue;
    const a = V(A.x, A.top - 0.9, A.z), b = V(B.x, B.top - 0.9, B.z), sag = 0.6;
    swingGroup(a, (SP) => { rope(SP, a, b, sag, 0.02); const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
      for (let k = 1; k < 9; k++) { const t = k / 9, q = a.clone().lerp(b, t); q.y -= sag * 4 * t * (1 - t) * 0.95; cloth(SP, k % 3 ? M.rag : M.ragD, q.x, q.y, q.z, rr(0.16, 0.26), rr(0.3, 0.6), Math.atan2(-(b.z - a.z), b.x - a.x)); } },
      { axis: b.clone().sub(a).normalize(), amp: 0.12, w: rr(0.9, 1.3) });
  }

  // ---------- жертвенник: плита на двух камнях, чаши с кровью, цепи к кольцам в полу ----------
  const ALT = { x: 0.2, z: 3.3, y: PLAT_Y + 0.78, w: 2.0, d: 0.95, h: 0.26 };
  { const { x, z, y, w, d, h } = ALT;
    for (const sd of [-1, 1]) lumpStone(P, M.stoneDark, x + sd * 0.62, PLAT_Y + (y - h / 2 - PLAT_Y) / 2, z, 0.6, y - h / 2 - PLAT_Y + 0.12, 0.75, rr(-0.1, 0.1), sd > 0 ? 3 : 4);
    box(P, M.stone, w, h, d, M4(x, y, z, 0.0, 0.04, 0.02));
    bowl(P, x - 0.55, y + h / 2, z - 0.15, 0.17); bowl(P, x + 0.62, y + h / 2, z + 0.12, 0.13);
    bowl(P, x - 1.4, PLAT_Y + 0.02, z + 0.7, 0.2); bowl(P, x + 1.35, PLAT_Y + 0.02, z + 0.9, 0.15);
    for (const sd of [-1, 1]) { const a = V(x + sd * w / 2, y, z + d / 2 - 0.05), b = V(x + sd * (w / 2 + 0.9), PLAT_Y + 0.06, z + d / 2 + 0.55);
      chain(P, a, b, 0.12); P.add(M.iron, new THREE.TorusGeometry(0.08, 0.016, 4, 10), M4(b.x, b.y + 0.02, b.z, Math.PI / 2, 0, 0)); P.add(M.iron, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 5), M4(b.x, b.y - 0.02, b.z)); }
    for (let k = 0; k < 5; k++) skull(P, x + rr(-0.8, 0.8), PLAT_Y + 0.1, z - d / 2 - rr(0.2, 0.5), rr(0.85, 1.0), rr(0, 6.28), rr(-0.5, 0.3), rnd() < 0.5);
    solids.push({ x, z, r: 1.1 }); }
  // вороны: на стоячих камнях
  for (const k of [1, 4, 8]) { const m = MEN[k]; crowSit(P, m.x, PLAT_Y - 0.3 + m.h + 0.05, m.z, m.a + rr(-1, 1), 1.05); }

  // ---------- кострища у подножия: кольцо камней, головни, тлеющие угли ----------
  for (const [x, z] of [[-10.6, 23.2], [11.6, 18.8], [-15.6, 13.4]]) {
    const g = gmin(x, z, 1.0);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + rr(-0.1, 0.1); lumpStone(P, M.stoneDark, x + Math.cos(a) * 0.85, g + 0.06, z + Math.sin(a) * 0.85, rr(0.28, 0.42), 0.24, rr(0.25, 0.35), a, k); }
    for (let k = 0; k < 5; k++) { const a = k * 1.25 + rr(-0.3, 0.3), l = rr(0.7, 1.1); beam(P, k % 2 ? M.char : M.charL, V(x + Math.cos(a) * l * 0.6, g + 0.08, z + Math.sin(a) * l * 0.6), V(x - Math.cos(a) * 0.1, g + rr(0.12, 0.3), z - Math.sin(a) * 0.1), 0.06, 5); }
    PG.add(M.coal, new THREE.CircleGeometry(0.45, 10).rotateX(-Math.PI / 2), M4(x, g + 0.05, z));
    for (let k = 0; k < 7; k++) PG.add(M.coal, new THREE.IcosahedronGeometry(rr(0.05, 0.09), 0), M4(x + rr(-0.35, 0.35), g + 0.09, z + rr(-0.35, 0.35)));
    addLight(V(x, g + 0.4, z), [0.7, 0.2, 0.06], 3.2, 0.7);
    solids.push({ x, z, r: 0.9 });
  }

  // ---------- кровь: течёт от круга по верху к лестнице и вниз по ступеням; по бокам — потёки ----------
  const flowMat = bloodFlowMat();
  const ribbon = (pts, w0, w1) => {
    const pos = [], uv = [], idx = []; let acc = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)], t = V(q.x - o.x, 0, q.z - o.z).normalize(), nrm = V(-t.z, 0, t.x), w = lerp(w0, w1, i / (pts.length - 1)) * (0.75 + 0.35 * Math.sin(i * 0.7));
      if (i) acc += p.distanceTo(pts[i - 1]);
      pos.push(p.x - nrm.x * w / 2, p.y, p.z - nrm.z * w / 2, p.x + nrm.x * w / 2, p.y, p.z + nrm.z * w / 2); uv.push(0, acc, 1, acc);
      if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, flowMat); m.renderOrder = 2; scene.add(m);
  };
  const surf = (x, z) => groundAt(x, z) + 0.035;
  for (let k = 0; k < 4; k++) {
    const off = (k - 1.5) * 0.65 + rr(-0.15, 0.15), pts = [];
    for (let s = -4.5 - k * 0.6; s < ST_LEN + 1.2 + k * 0.4; s += 0.14) { const x = XO(Math.max(s, 0)) + off + 0.22 * Math.sin(s * 1.1 + k * 2) + (s < 0 ? (s / -4.5) * (k - 1.5) * 0.4 : 0), z = ST_Z0 + s; pts.push(V(x, surf(x, z), z)); }
    ribbon(pts, 0.12 + k * 0.04, 0.35 + rr(0, 0.25));
  }
  // от борозд круга к краю: потёки по верху и сливы с кромки вниз по глыбам
  for (let k = 0; k < 7; k++) {
    const a = stairA + 0.9 + k * 0.72 + rr(-0.15, 0.15), rt = rTop(a), pts = [];
    for (let r = 6.0; r < rt - 0.2; r += 0.15) { const x = Math.cos(a) * r + Math.sin(r * 1.3 + k) * 0.18, z = Math.sin(a) * r; pts.push(V(x, PLAT_Y + 0.13, z)); }
    if (pts.length > 3) ribbon(pts, 0.08, 0.22);
  }

  // ---------- лужи крови (зеркальные) ----------
  const poolGeo = [];
  for (const [px, pz, rx, rz] of POOLS) {
    const n = 40, pos = [px, REFL_Y, pz], edge = [0], idx = [];
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = 0.92 + 0.12 * Math.sin(a * 3 + px) + 0.07 * Math.sin(a * 7 + pz); pos.push(px + Math.cos(a) * rx * k, REFL_Y, pz + Math.sin(a) * rz * k); edge.push(1); if (i) idx.push(0, i + 1, i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx); poolGeo.push(g);
  }
  const pools = new THREE.Group(); for (const g of poolGeo) { const m = new THREE.Mesh(g, poolMat()); pools.add(m); } scene.add(pools);

  // ---------- у подножия: шесты со стягами и солнечными крестами, копья, ленты ----------
  const poles = [];
  for (let k = 0; k < 44; k++) {
    const a = rr(-Math.PI, Math.PI), r = rr(13.5, 28), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (onStair(x, z, 2.0) || inPool(x, z) || kept(x, z, 2.5) || Math.abs(x - pathX(z)) < 2.2 && z > 16) continue;
    const g = gmin(x, z, 0.3), H = rr(3.2, 5.8), lean = V(rr(-0.35, 0.35), 0, rr(-0.35, 0.35)), top = V(x + lean.x, g + H, z + lean.z), ry = Math.atan2(-x, -z) + rr(-0.6, 0.6);
    taper(P, M.char, [V(x, g - 0.5, z), V(x + lean.x * 0.5, g + H * 0.5, z + lean.z * 0.5), top], 0.08, 0.05, 6, 6);
    P.add(M.char, new THREE.ConeGeometry(0.05, 0.4, 5), M4(top.x, top.y + 0.18, top.z));
    const kind = k % 4;
    poles.push({ x, z, top, ry, kind });
    if (kind === 0 || k % 7 === 3) sunCross(P, top.x, top.y - 0.15, top.z, 0.32, ry);
    if (kind <= 1) { const by = top.y - 0.55, c = Math.cos(ry), s = Math.sin(ry); beam(P, M.char, V(top.x - c * 0.65, by, top.z + s * 0.65), V(top.x + c * 0.65, by, top.z - s * 0.65), 0.035, 5); lashing(P, top.x, by - 0.05, top.z, 0.06); cloth(P, rnd() < 0.7 ? M.rag : M.ragD, top.x, by - 0.03, top.z, 1.1, rr(1.6, 2.6), ry); }
    else if (kind === 2) { for (let q = 0; q < 3; q++) cloth(P, q ? M.rag : M.ragG, top.x - lean.x * 0.15 * q, top.y - 0.4 - q * 0.5, top.z - lean.z * 0.15 * q, rr(0.15, 0.25), rr(0.7, 1.3), ry + q * 1.7); lashing(P, top.x, top.y - 0.45, top.z, 0.06); }
    else { P.add(M.iron, new THREE.ConeGeometry(0.05, 0.42, 4), M4(top.x, top.y + 0.35, top.z)); cloth(P, M.rag, top.x, top.y - 0.05, top.z, 0.16, rr(0.9, 1.4), ry); }   // копьё с лентой
    solids.push({ x, z, r: 0.3 });
  }
  // верёвки с тряпьём между соседними шестами (как на референсе), качаются от ветра
  { let n = 0; for (let i = 0; i < poles.length && n < 12; i++) for (let k = i + 1; k < poles.length && n < 12; k++) {
    const A = poles[i], B = poles[k], d = Math.hypot(A.x - B.x, A.z - B.z); if (d < 2.6 || d > 7.5) continue;
    const a = V(A.top.x, A.top.y - rr(0.3, 0.9), A.top.z), b = V(B.top.x, B.top.y - rr(0.3, 0.9), B.top.z), sag = d * 0.12; n++;
    swingGroup(a, (SP) => { rope(SP, a, b, sag, 0.018); for (let q = 1; q < Math.round(d * 1.4); q++) { const t = q / Math.round(d * 1.4), p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t) * 0.95; cloth(SP, rnd() < 0.7 ? M.rag : (rnd() < 0.5 ? M.ragD : M.ragG), p.x, p.y, p.z, rr(0.14, 0.3), rr(0.35, 0.9), Math.atan2(-(b.z - a.z), b.x - a.x)); } },
      { axis: b.clone().sub(a).normalize(), amp: 0.1, w: rr(0.8, 1.3) });
  } }
  // скелеты, привязанные к столбам с перекладиной (лицом от капища), цепи на груди
  const crowSpots = [];
  for (const [x, z] of [[-7.6, 18.6], [-12.3, 9.4], [13.2, 15.8], [5.2, 28.6]]) {
    if (onStair(x, z, 0.8) || inPool(x, z, 0.4) || kept(x, z, 3)) continue;
    const g = gmin(x, z, 0.3), ry = Math.atan2(-x, -z), fx = -Math.sin(ry), fz = -Math.cos(ry), sx = Math.cos(ry), sz = -Math.sin(ry);
    const px = x - fx * 0.16, pz = z - fz * 0.16, sh = g + 2.25;
    taper(P, M.char, [V(px, g - 0.5, pz), V(px, g + 1.5, pz), V(px + rr(-0.05, 0.05), g + 3.0, pz)], 0.11, 0.08, 6, 4);
    beam(P, M.char, V(px - sx * 0.85, sh, pz - sz * 0.85), V(px + sx * 0.85, sh + rr(-0.08, 0.08), pz + sz * 0.85), 0.06, 5);
    lashing(P, px, sh - 0.05, pz, 0.1);
    const T = new Pack(); skeleton(T, 0, 0, 0, 0, 1.05, 0.15);
    const Mx = new THREE.Matrix4().makeTranslation(x, g + 1.75, z).multiply(new THREE.Matrix4().makeRotationY(ry)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    for (const [mat, list] of T.parts) for (const gg of list) P.add(mat, gg, Mx);
    chainRing(P, px, g + 1.55, pz, 0.24); chainRing(P, px, g + 0.75, pz, 0.2);
    cloth(P, M.ragD, px + sx * 0.6, sh - 0.04, pz + sz * 0.6, 0.18, rr(0.8, 1.3), ry);
    solids.push({ x, z, r: 0.45 }); crowSpots.push([px + sx * 0.75, sh + 0.06, pz + sz * 0.75, ry + Math.PI / 2]);
  }
  // копья и обломанные шесты, воткнутые как попало
  for (let k = 0; k < 26; k++) { const a = rr(-Math.PI, Math.PI), r = rr(11.5, 30), x = Math.cos(a) * r, z = Math.sin(a) * r; if (onStair(x, z, 1.5) || inPool(x, z) || kept(x, z, 2) || Math.abs(x - pathX(z)) < 1.8 && z > 16) continue;
    const g = gmin(x, z, 0.2), L = rr(1.2, 2.6), d = V(rr(-0.6, 0.6), 1, rr(-0.6, 0.6)).normalize(); beam(P, k % 3 ? M.char : M.wood, V(x, g - 0.3, z), V(x + d.x * L, g + d.y * L, z + d.z * L), 0.035, 5); if (k % 3 === 0) P.add(M.iron, new THREE.ConeGeometry(0.04, 0.3, 4), new THREE.Matrix4().compose(V(x + d.x * (L + 0.14), g + d.y * (L + 0.14), z + d.z * (L + 0.14)), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, 1, 1))); }

  // ---------- бочки, колесо, кости, скелеты ----------
  for (const [x, z, yaw, lying, broken] of [[4.6, 20.8, 0.6, true, true], [-4.4, 19.6, -1.0, true, false], [-6.0, 21.2, 0.3, false, true], [7.8, 16.5, 2.1, true, true], [-10.8, 12.5, 1.2, false, true], [12.5, 10.0, -0.4, true, true]]) { if (!onStair(x, z, 0.6)) { barrel(P, x, z, yaw, lying, broken); solids.push({ x, z, r: 0.5 }); } }
  wheel(P, 6.2, 22.4, 0.8, 1.35); wheel(P, -12.2, 15.0, -0.4, 1.45);
  for (const c of crowSpots) if (c) crowSit(P, c[0], c[1], c[2], c[3], 1.0);
  { let n = 0; for (const p of poles) { if (n >= 3 || p.kind > 1) continue; n++; const c = Math.cos(p.ry), s = Math.sin(p.ry), o = rr(0.2, 0.5) * (n % 2 ? 1 : -1); crowSit(P, p.top.x + c * o, p.top.y - 0.55 + 0.04, p.top.z - s * o, p.ry + Math.PI / 2, 1.0); } }
  for (const [x, z, yaw] of [[3.6, 17.9, 0.4], [9.3, 19.4, 2.0], [-8.6, 17.8, -1.2]]) crowSit(P, x, groundAt(x, z), z, yaw, 1.0, 1);
  for (const [x, z, yaw, curl] of [[3.0, 17.4, 2.2, 0.2], [-2.9, 21.5, -0.7, 0.6], [8.8, 19.0, 1.1, 0.0], [-9.0, 17.2, 2.8, 0.4], [12.0, 13.6, -1.6, 0.3], [-14.6, 9.6, 0.9, 0.1], [2.2, 27.0, 0.3, 0.5], [16.0, 6.5, -2.4, 0.2]]) { if (!onStair(x, z, 0.4) && !inPool(x, z, 0)) skeleton(P, x, z, yaw, groundAt(x, z) + 0.02, 1.0, curl); }
  // скелет, привалившийся к ступеням
  { const j = 12, s = (j + 0.5) * ST_RUN, x = XO(s) + ST_W / 2 - 0.5, z = ST_Z0 + s; skeleton(P, x, z, Math.PI * 0.5, stepTop(j) + 0.02, 0.95, 0.7); }
  for (let k = 0; k < 70; k++) { const a = rr(-Math.PI, Math.PI), r = rr(10.5, 34), x = Math.cos(a) * r, z = Math.sin(a) * r; if (onStair(x, z, 0.3) || inPool(x, z, 0)) continue; const g = groundAt(x, z);
    if (k % 4 === 0) skull(P, x, g + 0.07, z, rr(0.9, 1.1), rr(0, 6.28), rr(-1.4, 0.3)); else beam(P, rnd() < 0.5 ? M.bone : M.boneD, V(x, g + 0.025, z), V(x + rr(-0.35, 0.35), g + 0.03, z + rr(-0.35, 0.35)), 0.02, 4); }
  // камни и головёшки по пустоши
  for (let k = 0; k < 90; k++) { const a = rr(-Math.PI, Math.PI), r = rr(12, 60), x = Math.cos(a) * r, z = Math.sin(a) * r; if (onStair(x, z, 0.5) || inPool(x, z) || kept(x, z, 1.5)) continue; const s = rr(0.2, 0.9); lumpStone(P, rnd() < 0.5 ? M.stoneDark : M.stone, x, gmin(x, z, s * 0.5) + s * 0.15, z, s * rr(1, 1.6), s * 0.7, s * rr(1, 1.4), rr(0, 6), k); }

  // ---------- горелый лес: сухие стволы с острыми сломами, обрубки, поваленные ----------
  {
    const snag = (seed, H, nb, split) => { const P2 = new Pack(); setSeed(seed);
      const bd = rr(0.25, 0.7), bx = rr(-1, 1), bz = rr(-1, 1);
      const pts = [V(0, -0.3, 0), V(bx * bd * 0.25, H * 0.3, bz * bd * 0.25), V(-bz * bd * 0.5 + bx * bd * 0.4, H * 0.62, bx * bd * 0.5), V(bx * bd, H, bz * bd + rr(-0.3, 0.3))];
      taper(P2, M.char, pts, 0.32, split ? 0.1 : 0.06, 7, 12);
      const tp = pts[3];
      if (split) for (let q = 0; q < 2; q++) { const a = q * Math.PI + rr(-0.6, 0.6), L = rr(0.9, 2.4) * (q ? 0.6 : 1); taper(P2, M.char, [tp.clone().add(V(0, -0.5, 0)), tp.clone().add(V(Math.cos(a) * L * 0.25, L * 0.45, Math.sin(a) * L * 0.25)), tp.clone().add(V(Math.cos(a) * L * 0.45, L, Math.sin(a) * L * 0.45))], 0.11, 0.014, 5, 7); }   // расщеплённая верхушка
      for (let k = 0; k < 5; k++) P2.add(M.char, new THREE.ConeGeometry(rr(0.04, 0.08), rr(0.4, 1.3), 4), M4(tp.x + rr(-0.1, 0.1), tp.y + rr(0.1, 0.5), tp.z + rr(-0.1, 0.1), rr(-0.5, 0.5), 0, rr(-0.5, 0.5)));   // рваная щепа на сломе
      for (let k = 0; k < nb; k++) { const t = rr(0.3, 0.85), y = H * t, a = rr(0, 6.28), l = rr(0.4, 1.5) * (1.1 - t), c = new THREE.CatmullRomCurve3(pts).getPoint(t); taper(P2, M.char, [c, c.clone().add(V(Math.cos(a) * l * 0.5, l * 0.25, Math.sin(a) * l * 0.5)), c.clone().add(V(Math.cos(a) * l, l * rr(0.2, 0.7), Math.sin(a) * l))], 0.07 * (1.1 - t), 0.01, 4, 5); }   // обломанные сучья
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + rr(-0.3, 0.3); taper(P2, M.char, [V(Math.cos(a) * 0.15, 0.25, Math.sin(a) * 0.15), V(Math.cos(a) * 0.5, -0.05, Math.sin(a) * 0.5), V(Math.cos(a) * 0.85, -0.3, Math.sin(a) * 0.85)], 0.12, 0.04, 5, 5); }   // корни
      const g = P2.parts.get(M.char); return g.length > 1 ? mergeAll(g) : g[0]; };
    const mergeAll = (list) => { const BufferGeometryUtils = THREE.BufferGeometryUtils; let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nr = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0; for (const g of list) { pos.set(g.attributes.position.array, o * 3); nr.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; } const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m; };
    const kinds = [snag(11, 8, 3, 0), snag(23, 12, 4, 1), snag(37, 5, 1, 0), snag(51, 15, 5, 1), snag(67, 3.2, 0, 0), snag(79, 10, 2, 1), snag(91, 6.5, 3, 1), snag(103, 2.2, 1, 0), snag(117, 13, 3, 0)];
    setSeed(777);
    const inst = kinds.map(() => []);
    // группами (рощи сгорели купами) и редкими одиночками
    const spots = []; for (let c = 0; c < 70; c++) { const a = rr(-Math.PI, Math.PI), r = 22 + Math.pow(rnd(), 0.8) * 140, cx = Math.cos(a) * r, cz = Math.sin(a) * r, n = 2 + Math.floor(rnd() * 9); for (let q = 0; q < n; q++) { const aa = rr(0, 6.28), rq = rr(0.8, 6.5); spots.push([cx + Math.cos(aa) * rq, cz + Math.sin(aa) * rq]); } }
    for (let c = 0; c < 140; c++) { const a = rr(-Math.PI, Math.PI), r = 20 + Math.pow(rnd(), 0.8) * 150; spots.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (const [x, z] of spots) {
      if (inst.flat().length >= 470) break;
      const r = Math.hypot(x, z); if (r < 19.5) continue;
      if (Math.abs(x - pathX(z)) < 4 && z > 10 || kept(x, z, 5) || inPool(x, z, 1) || Math.hypot(x - TOWER[0], z - TOWER[1]) < 6.5) continue;
      const j = r < 30 ? [2, 4, 7][Math.floor(rnd() * 3)] : Math.floor(rnd() * kinds.length), s = rr(0.7, 1.3), g = gmin(x, z, 0.4);
      inst[j].push(M4(x, g, z, rr(-0.08, 0.08), rr(0, 6.28), rr(-0.08, 0.08), s, s * rr(0.85, 1.2), s));
      if (r < 40) solids.push({ x, z, r: 0.4 * s });
    }
    kinds.forEach((g, j) => { if (inst[j].length) mk(g, M.char, inst[j], true, true); });
    // поваленные стволы
    for (let k = 0; k < 22; k++) { const a = rr(-Math.PI, Math.PI), r = rr(16, 60), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x - pathX(z)) < 4 && z > 10 || kept(x, z, 3) || inPool(x, z, 1)) continue;
      const L = rr(4, 9), yw = rr(0, 6.28), dx = Math.cos(yw) * L, dz = Math.sin(yw) * L, g0 = gmin(x, z, 0.4), g1 = gmin(x + dx, z + dz, 0.3);
      taper(P, M.charL, [V(x, g0 + 0.25, z), V(x + dx * 0.5, (g0 + g1) / 2 + 0.2, z + dz * 0.5), V(x + dx, g1 + 0.12, z + dz)], 0.3, 0.12, 6, 8);
      for (let q = 0; q < 2; q++) { const t = rr(0.3, 0.8), px = x + dx * t, pz = z + dz * t, py = lerp(g0, g1, t) + 0.3; beam(P, M.char, V(px, py, pz), V(px + rr(-0.3, 0.3), py + rr(0.5, 1.1), pz + rr(-0.3, 0.3)), 0.04, 4); } }
  }
  // ---------- сторожевая вышка на холме (горелая) ----------
  { const cx = TOWER[0], cz = TOWER[1], g = groundAt(cx, cz), H = 13;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(P, M.char, V(cx + sx * 2.2, g - 0.5, cz + sz * 2.2), V(cx + sx * 1.3, g + H, cz + sz * 1.3), 0.16, 6);
    for (let y = 2.5; y < H; y += 3) for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) { const ka = 2.2 - y / H * 0.9; if (rnd() < 0.25) continue; beam(P, M.char, V(cx + a[0] * ka, g + y, cz + a[1] * ka), V(cx + b[0] * ka, g + y + 2.2, cz + b[1] * ka), 0.07, 4); }
    box(P, M.charL, 3.4, 0.2, 3.4, M4(cx, g + H, cz, 0.06, 0.2, -0.04));
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1]]) beam(P, M.char, V(cx + sx * 1.4, g + H, cz + sz * 1.4), V(cx + sx * 1.1, g + H + rr(1.0, 2.2), cz + sz * 1.1), 0.08, 4);
    cloth(P, M.ragD, cx + 1.2, g + H + 1.6, cz + 1.2, 0.6, 1.4, 0.3);
    // остаток кровли: два стропила и обломанные доски, свисающая доска
    beam(P, M.char, V(cx - 1.4, g + H + 0.1, cz - 1.2), V(cx - 0.1, g + H + 2.4, cz - 0.3), 0.08, 5); beam(P, M.char, V(cx + 1.3, g + H + 0.1, cz - 1.3), V(cx + 0.1, g + H + 2.2, cz - 0.4), 0.08, 5);
    for (let q = 0; q < 4; q++) box(P, M.charL, 0.22, 0.04, rr(0.9, 1.7), M4(cx - 0.8 + q * 0.32, g + H + 0.6 + q * 0.35, cz - 0.9, 0.9, 0.0, rr(-0.2, 0.2)));
    box(P, M.charL, 0.25, 2.2, 0.05, M4(cx + 1.75, g + H - 1.0, cz + 0.6, 0.15, 0.3, 0.25));
    solids.push({ x: cx, z: cz, r: 2.6 }); }

  // ---------- искры из круга и пепел над пустошью ----------
  const sparkM = particleMat('spark'), ashM = particleMat('ash');
  const quads = (mat, A, Pp) => { const g = new THREE.InstancedBufferGeometry(), q = new THREE.PlaneGeometry(1, 1); g.index = q.index; g.setAttribute('position', q.attributes.position);
    g.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 4)); g.instanceCount = A.length / 4;
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; scene.add(m); return m; };
  { const A = [], Pp = []; for (let k = 0; k < 260; k++) { const ring = [6.0, 5.35, 2.3, 1.55][k % 4], a = rr(0, 6.28), r = ring + rr(-0.05, 0.05) + (k % 9 === 0 ? rr(-3, 0) : 0); A.push(Math.cos(a) * r, PLAT_Y + 0.05, Math.sin(a) * r, rr(1.5, 5.0)); Pp.push(rnd(), rr(0.25, 0.6), rr(0.03, 0.08), rnd()); } quads(sparkM, A, Pp); }
  { const A = [], Pp = []; for (let k = 0; k < 500; k++) { const x = rr(-45, 40), z = rr(-40, 50); A.push(x, rr(6, 18), z, rr(8, 16)); Pp.push(rnd(), rr(0.03, 0.07), rr(0.04, 0.1), rnd()); } quads(ashM, A, Pp); }

  // ---------- вороны кружат над капищем ----------
  const birds = [];
  { const bm = paint({ base: '#1c1a1a', strokeAmt: 0.05, rim: 0.4, side: THREE.DoubleSide });
    const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.1, 0.55, 0.02, -0.12, 0, 0, 0.12, 0.55, 0.02, -0.12, 0.42, 0, 0.08], 3)); wingG.computeVertexNormals();
    for (let k = 0; k < 5; k++) { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4).scale(0.7, 0.6, 2.0), bm); g.add(body);
      const wl = new THREE.Mesh(wingG, bm), wr = new THREE.Mesh(wingG, bm); wr.scale.x = -1; g.add(wl, wr); scene.add(g);
      birds.push({ g, wl, wr, r: rr(9, 18), h: rr(12, 20), w: rr(0.18, 0.3) * (k % 2 ? 1 : -1), ph: rnd() * 6.28 }); } }

  const built = P.build(true, true); scene.add(built);
  scene.add(PG.build(false, false));

  // ---------- потёки крови по стенам возвышения и с жертвенника: лента по поверхности камней (луч к центру) ----------
  { built.updateMatrixWorld(true);
    const hitM = built.children.filter((m) => m.material && ['stone', 'stoneDark', 'step', 'menhir'].includes(m.material.userData.name));
    const rc = new THREE.Raycaster(), dirIn = V(), side = V();
    const drip = (pts, sd, w0, w1) => {
      const pos = [], uv = [], idx = []; let acc = 0;
      for (let i = 0; i < pts.length; i++) { const p = pts[i], w = lerp(w0, w1, i / (pts.length - 1)) * (0.8 + 0.3 * Math.sin(i * 1.3)); if (i) acc += p.distanceTo(pts[i - 1]);
        pos.push(p.x - sd.x * w / 2, p.y, p.z - sd.z * w / 2, p.x + sd.x * w / 2, p.y, p.z + sd.z * w / 2); uv.push(0, acc, 1, acc); if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, flowMat); m.renderOrder = 2; scene.add(m); };
    setSeed(5150);
    for (let k = 0; k < 42; k++) {
      const a0 = rr(-Math.PI, Math.PI), da = Math.atan2(Math.sin(a0 - stairA), Math.cos(a0 - stairA)); if (Math.abs(da) < 0.35) continue;
      const pts = []; let a = a0, last = null;
      for (let y = PLAT_Y + 0.9; y > -0.1; y -= 0.12) {
        a += Math.sin(y * 3.1 + k) * 0.004; dirIn.set(-Math.cos(a), 0, -Math.sin(a));
        rc.set(V(Math.cos(a) * 18, y, Math.sin(a) * 18), dirIn); rc.far = 20;
        const h = rc.intersectObjects(hitM, false)[0]; if (!h) { if (pts.length) break; else continue; }
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : dirIn.clone().negate();
        const q = h.point.clone().addScaledVector(n, 0.04); if (last && last.distanceTo(q) > 0.9) break; pts.push(q); last = q;
      }
      if (pts.length > 4) { side.set(-Math.sin(a0), 0, Math.cos(a0)); drip(pts, side, rr(0.26, 0.55), rr(0.08, 0.2)); }
    }
    // с жертвенника: по плите вперёд и вниз по передней грани
    for (const ox of [-0.35, 0.3, 0.75]) { const { x, z, y, d, h } = ALT, fz = z + d / 2 + 0.03, pts = [V(x + ox, y + h / 2 + 0.03, z - 0.1), V(x + ox, y + h / 2 + 0.03, fz - 0.05), V(x + ox, y + h / 2 - 0.02, fz)];
      for (let yy = y + h / 2 - 0.1; yy > PLAT_Y; yy -= 0.1) pts.push(V(x + ox + Math.sin(yy * 9 + ox) * 0.02, yy, fz + 0.01));
      for (let q = 1; q < 6; q++) pts.push(V(x + ox + q * 0.03, PLAT_Y + 0.05, fz + q * 0.12));
      drip(pts, V(1, 0, 0), rr(0.14, 0.22), rr(0.18, 0.3)); }
  }

  // ---------- туман пластами по земле: рваные формы с кромкой, медленно ползут; у капища редеет ----------
  const fogM = (hh) => new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uH: { value: hh } }), transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */`varying vec3 vWPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`${DECL}${NOISE}${FOG_FN} uniform float uH; varying vec3 vWPos;
      void main(){ vec2 p = vWPos.xz; float r = length(p);
        float n = fbm2(p * 0.045 + vec2(uTime * 0.018 + uH * 7.0, -uTime * 0.011)) * 0.72 + vnoise2(p * 0.16 + vec2(uTime * 0.04, uH)) * 0.28;
        float body = smoothstep(0.47, 0.5, n), core = smoothstep(0.58, 0.61, n), edge = body - smoothstep(0.5, 0.535, n);
        float fade = smoothstep(12.5, 19.0, r) * smoothstep(64.0, 44.0, r) * smoothstep(4.0, 16.0, distance(cameraPosition, vWPos));
        vec3 c = mix(uFogCol * 0.98, uFogCol * 1.08, core); c = mix(c, uFogCol * 0.78, edge * 0.5);
        gl_FragColor = vec4(applyFog(c, vWPos), (body * 0.16 + core * 0.12) * fade); }`,
  });
  for (const [hy, k] of [[0.55, 0], [1.25, 1]]) { const g = new THREE.RingGeometry(11.5, 66, 120, 6); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, fogM(k * 1.7)); m.position.y = hy; m.renderOrder = 4; scene.add(m); }

  // ---------- живое: пульс круга, свет, птицы ----------
  const update = (t, dt) => {
    const pulse = 0.78 + 0.22 * Math.sin(t * 2.2) + 0.08 * Math.sin(t * 7.3 + 1) * Math.sin(t * 3.1);
    rune.uniforms.uPulse.value = pulse; sparkM.uniforms.uPulse.value = pulse;
    for (const l of pulseL) { l.col[0] = l.base[0] * pulse; l.col[1] = l.base[1] * pulse; l.col[2] = l.base[2] * pulse; }
    for (const b of birds) { const a = t * b.w + b.ph; b.g.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.5 + b.ph) * 1.2, Math.sin(a) * b.r - 1); b.g.rotation.set(0, -a - (b.w > 0 ? 0 : Math.PI), (b.w > 0 ? 0.35 : -0.35));
      const f = Math.sin(t * 6 + b.ph) * 0.6 * (Math.sin(t * 0.7 + b.ph) > -0.3 ? 1 : 0.15); b.wl.rotation.z = f; b.wr.rotation.z = -f; }
  };
  const door = { g: new THREE.Group(), ix: 0, iz: 0, x: 0, z: 0, yaw: 0, rot: 0 };
  return { solids, lights, walks: [], anim, mists, perches: [], lilyPads: null, waterMesh: pools, TREE: ISLE, ISLE, base: PLAT_Y, groundAt, BASIN, leafSrc: [], FALLS: [], door, update, life: { update() {} } };
}
