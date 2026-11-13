// Логово Водяного (по концепту Michael): горное озеро в чаше скал, четыре водопада, посреди — каменный остров,
// на нём большой восьмигранный терем Водяного под конусной кровлей в ракушках, морских звёздах и костяных шипах.
// Центр озера (0, -4). Богатырь приходит с юга по ущелью, к острову — бродом по колено, наверх — каменной лестницей.
// Водяной 3,0 м (Леший 2,5 м, богатырь 1,53 м): дверь 3,3 м, стены 4,6 м, ступени 0,24 м.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { spruceGeo, pineGeo, needleTex } from './trees.js';
import { bushGeo, mossGeo, fernGeo as vegFern, willowGeo } from './veg.js';
import { paint, glow, water, mist, inkMat, BOIL, U, puffMat, shaftMat, haloMat, flameMat, emberMat, dripMat, backdropMat, DECL, NOISE, FOG_FN } from './toon.js';
import { Pack, MAT, M4, V, beam, tube, box, plank, mossStrand, vine, chain, windowLit, rope, lashing, rnd, rr, setSeed, mergeGeometries, boxUV, cylUV, canvasTex, stoneTex } from './kit.js';

const MOSS_LITE = mossGeo(7, true), WILLOW = [willowGeo(1), willowGeo(2)];
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function n2(x, z) {
  return Math.sin(x * 0.11 + Math.sin(z * 0.07) * 1.3) * 0.5 + Math.sin(z * 0.13 + Math.sin(x * 0.05) * 1.7) * 0.35 + Math.sin((x + z) * 0.31) * 0.15;
}
const dir = (a) => [Math.sin(a), Math.cos(a)];        // курс: 0 — на юг (+z), к зрителю концепта

// ---------- главные размеры ----------
export const WATER_Y = -0.18;
export const BASIN = { x: 0, z: -4, rx: 36, rz: 30 };      // озеро 72×60 м
export const ISLE = { x: 9, z: -3 };                    // остров и терем
export const PLAT_Y = 3.0;                                // верх острова
export const FLOOR_Y = PLAT_Y + 0.55;                     // пол терема (цоколь)
export const FACE = -0.245;                               // дверь смотрит на южный берег (на зрителя)
export const H_VOD = 3.0, H_LESHY = 2.5, H_HERO = 1.53;
const RC = 5.4, NSIDE = 12;                                 // кривой двенадцатигранник: средний радиус углов
const HRAD = (ph) => RC + 0.22 * Math.sin(3 * ph + 0.7) + 0.12 * Math.sin(5 * ph + 2);
const APO = (k) => (HRAD(-Math.PI / NSIDE + k * 2 * Math.PI / NSIDE) + HRAD(Math.PI / NSIDE + k * 2 * Math.PI / NSIDE)) / 2 * Math.cos(Math.PI / NSIDE);   // апофема грани k
const AP0 = APO(0);                                         // грань с дверью
const WALL_H = 4.0;
export const WALL_TOP = FLOOR_Y + WALL_H;
const CONE_H = 6.0, APEX = WALL_TOP + 0.35 + CONE_H, EAVE_R = 6.4;
const domeY = (r) => APEX - CONE_H * Math.pow(Math.max(0, r) / RC, 1.65);   // купол выпуклый, кромка свисает ниже верха стен
const DOOR_W = 1.9, DOOR_H = 3.3;
const GATE = { half: 1.75, eave: FLOOR_Y + 3.6, ridge: FLOOR_Y + 4.7, front: AP0 + 1.9 };   // вход-шалашик: свес 3,6 м над полом (Водяной 3,0 проходит)
const rTop = (a) => 10.5 + 1.0 * Math.sin(3 * a + 1) + 0.6 * Math.sin(5 * a + 2);
const polar = (x, z) => Math.atan2(z - ISLE.z, x - ISLE.x);

// лестница острова: от края площадки вниз к причальной плите
const STAIR_YAW = FACE - 0.5;
const SD = dir(STAIR_YAW), SP = [SD[1], -SD[0]];
const ST_N = 12, ST_RUN = 0.42, ST_W = 2.4, ST_LEN = ST_N * ST_RUN;
const ST_RISE = (PLAT_Y - 0.1) / ST_N;
const sAng = Math.atan2(SD[1], SD[0]);
const ST_TOP = [ISLE.x + SD[0] * (rTop(sAng) - 0.4), ISLE.z + SD[1] * (rTop(sAng) - 0.4)];
export const LANDING = { x: ST_TOP[0] + SD[0] * (ST_LEN + 1.3), z: ST_TOP[1] + SD[1] * (ST_LEN + 1.3), y: 0.1, len: 2.6 };
const stairLocal = (x, z) => { const dx = x - ST_TOP[0], dz = z - ST_TOP[1]; return [dx * SD[0] + dz * SD[1], dx * SP[0] + dz * SP[1]]; };
const stepTop = (s) => (s < 0 ? PLAT_Y : s >= ST_LEN ? 0.1 : PLAT_Y - (Math.floor(s / ST_RUN) + 1) * ST_RISE);
export const SHORE = [0.6, 26];                            // начало брода у южного берега
export const pathX = (z) => 0.6 + Math.sin(z * 0.06) * 2.0;

// водопады: угол на эллипсе, ширина, ярусы (доля высоты, на которой полка)
const FALLS = [
  { a: -1.97, w: 5.6, ledge: [0.66, 0.36] }, { a: -1.7, w: 3.2, ledge: [0.5] }, { a: -1.18, w: 6.4, ledge: [0.7, 0.44, 0.2] }, { a: -0.8, w: 4.0, ledge: [0.48] },
];
const ellP = (a, e) => [BASIN.x + Math.cos(a) * BASIN.rx * e, BASIN.z + Math.sin(a) * BASIN.rz * e];

// ---------- рельеф ----------
function cliffH(x, z) {
  const dx = (x - BASIN.x) / BASIN.rx, dz = (z - BASIN.z) / BASIN.rz, e = Math.hypot(dx, dz) || 1e-6;
  const sn = dz / e;                                       // -1 север, +1 юг
  const north = ss(0.25, -0.75, sn);
  let Hc = 4 + 27 * north + n2(x * 0.6, z * 0.6) * 3 * north + Math.max(0, n2(x * 0.3 + 9, z * 0.3)) * 4 * (1 - north);
  if (z > 14) Hc *= 1 - 0.85 * ss(10, 3.5, Math.abs(x - pathX(z)));   // ущелье с тропой на юге
  const steep = ss(1.04, 1.2, e), soft = ss(1.0, 1.75, e);
  return { e, north, h: 0.35 + Hc * lerp(soft, steep, north) + Math.max(0, e - 1.25) * 6 * north + Math.max(0, e - 2.2) * 18 };
}
for (const f of FALLS) {                                    // кромка водопада (до прорези русла)
  const [lx, lz] = ellP(f.a, 1.2), [bx, bz] = ellP(f.a, 1.03);
  f.lip = V(lx, cliffH(lx, lz).h, lz); f.bot = V(bx, WATER_Y, bz);
  const n = V(BASIN.x - lx, 0, BASIN.z - lz).normalize(); f.n = n; f.t = V(-n.z, 0, n.x);
}
export function groundAt(x, z) {
  const c = cliffH(x, z), e = c.e;
  // дно озера: глубоко посередине, к берегу поднимается
  const bottom = -2.4 + n2(x * 1.3, z * 1.3) * 0.25;
  let h = e < 1.0 ? lerp(bottom, 0.35, ss(0.8, 1.0, e)) : c.h;
  // брод от южного берега к причальной плите — по колено
  { const ax = LANDING.x, az = LANDING.z, bx = SHORE[0], bz = SHORE[1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < 4.5) h = Math.max(h, lerp(WATER_Y - 0.4 + 0.27 * ss(4.0, 0.8, t * Math.sqrt(L2)) + n2(x * 4, z * 4) * 0.03, h, ss(2.0, 4.5, d))); }
  // остров: плоский верх, каменистый склон в воду
  { const d = Math.hypot(x - ISLE.x, z - ISLE.z);
    if (d < 20) {
      const a = polar(x, z), rt = rTop(a);
      const k = ss(rt, rt + 5.5, d);
      let hi = lerp(PLAT_Y + n2(x * 3, z * 3) * 0.03, -1.8, Math.pow(k, 0.8)) + Math.sin(k * 9 + a * 3) * 0.18 * k * (1 - k) * 4;
      h = Math.max(h, hi);
      // лестница врезана в склон: под ступенями грунт чуть ниже ступени
      const [s, l] = stairLocal(x, z);
      if (s > -0.6 && s < ST_LEN + LANDING.len + 0.4) {
        const cut = stepTop(Math.max(0, s)) - 0.35, kk = ss(ST_W / 2 + 1.4, ST_W / 2 + 0.25, Math.abs(l));
        if (s > 0) h = lerp(h, Math.min(h, cut), kk);
      }
    } }
  // русло над водопадом
  for (const f of FALLS) {
    const dx = x - f.lip.x, dz = z - f.lip.z, along = -(dx * f.n.x + dz * f.n.z), lat = Math.abs(dx * f.t.x + dz * f.t.z);
    if (along > -0.6 && along < 14 && lat < f.w * 0.5 + 1.6) h = lerp(h, Math.min(h, f.lip.y - 0.55), ss(f.w * 0.5 + 1.6, f.w * 0.5 + 0.3, lat) * ss(-0.6, 0.4, along));
  }
  return h;
}

// ракурсы (вдоль них ничего случайного не ставим)
const HL = (lx, y, lz) => { const c = Math.cos(FACE), s = Math.sin(FACE); return [ISLE.x + lx * c + lz * s, y, ISLE.z - lx * s + lz * c]; };
const IP = (a, d) => [ISLE.x + Math.cos(a) * d, ISLE.z + Math.sin(a) * d];
export const BONES = { a: IP(0.78, 15.2), b: IP(0.18, 16.4) };
const STM = [ST_TOP[0] + SD[0] * ST_LEN * 0.5, ST_TOP[1] + SD[1] * ST_LEN * 0.5];
export const SHOT_CAMS = {
  whole: { pos: [0.6, 2.4, 30.5], look: [5.6, 6.3, -6] },
  terem: { pos: HL(-3.5, 4.4, 20.5), look: HL(0, 7.8, 0) },
  stair: { pos: [STM[0] + SD[0] * 9 - SP[0] * 7.5, 1.6, STM[1] + SD[1] * 9 - SP[1] * 7.5], look: [STM[0], 1.7, STM[1]] },
  scale: { pos: HL(0.2, 5.0, 14.2), look: HL(0.2, 5.3, 6.4) },
  bridge: { pos: [-3, 3.2, 24], look: [2, 1.5, 8] },
  falls: { pos: [-1, 2.4, 9], look: [-6, 12, -36] },
  roof: { pos: HL(-8, 12.5, 12), look: HL(0, 11.5, 0) },
  idols: { pos: HL(-12.5, 4.8, 12.5), look: HL(-5.5, 4.6, 3.5) },
  bones: { pos: [BONES.a[0] + 5.5, 1.6, BONES.a[1] + 9], look: [(BONES.a[0] + BONES.b[0]) / 2, 0.6, (BONES.a[1] + BONES.b[1]) / 2] },
  rays: { pos: [-1.2, 1.2, 27.2], look: [2.5, 6.5, 12] },
  top: { pos: [46, 118, 86], look: [2, 0, -2] },
};
function sightDist(x, z) {
  let m = 1e9;
  for (const k in SHOT_CAMS) {
    if (k === 'top') continue;
    const s = SHOT_CAMS[k], ax = s.pos[0], az = s.pos[2], bx = s.look[0], bz = s.look[2];
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    if (t * L > 18) continue;
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}
const kept = (x, z, r) => Object.values(SHOT_CAMS).some((s) => Math.hypot(x - s.pos[0], z - s.pos[2]) < r) || sightDist(x, z) < 2.2;

// ---------- материалы этой локации ----------
const runeTex = (bg, ink, seed) => canvasTex(128, 512, (g, w, h) => {
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 8); }
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'square';
  g.lineWidth = 7; g.strokeRect(10, 10, w - 20, h * 0.86);
  g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h * 0.86 - 16);
  // руна-оберег: ствол, ветви, глаз-круг, волна снизу
  g.lineWidth = 9; const cx = w / 2;
  g.beginPath(); g.moveTo(cx, 70); g.lineTo(cx, 330); g.stroke();
  g.beginPath(); g.moveTo(cx, 120); g.lineTo(cx - 34, 84); g.moveTo(cx, 120); g.lineTo(cx + 34, 84); g.moveTo(cx, 240); g.lineTo(cx - 36, 280); g.moveTo(cx, 240); g.lineTo(cx + 36, 280); g.stroke();
  g.beginPath(); g.arc(cx, 180, 22, 0, 6.29); g.stroke();
  g.beginPath(); for (let k = 0; k < 4; k++) { const x0 = 22 + k * 22; g.moveTo(x0, 372); g.quadraticCurveTo(x0 + 11, 356, x0 + 22, 372); } g.stroke();
  // бахрома
  g.fillStyle = bg; for (let x = 0; x < w; x += 10) g.fillRect(x, h * 0.88, 6, h * 0.12 * (0.4 + r() * 0.6));
}, true);
const clothCream = paint({ base: '#ffffff', map: runeTex('#cdbb94', '#6a2a1c', 7), strokeAmt: 0.1, side: THREE.DoubleSide, sway: 1, rim: 0.5 });
const clothRed = paint({ base: '#ffffff', map: runeTex('#8e2a1e', '#e8d9b8', 11), strokeAmt: 0.1, side: THREE.DoubleSide, sway: 1, rim: 0.5 });
clothCream.userData.noInk = clothRed.userData.noInk = true;
const M = {
  cliff: paint({ base: '#55616a', moss: '#3c5244', mossAmt: 0.5, strokeAmt: 0.2, stroke: [0, 1, 0], break: 0.3, map: stoneTex, mapRep: [0.35, 0.35], mapGain: 1.5, drip: 0.6 }),
  stone: paint({ base: '#5a636a', moss: '#42583e', mossAmt: 0.6, strokeAmt: 0.14, map: stoneTex, mapRep: [1, 1], mapGain: 1.4, wet: 0.3 }),
  step: paint({ base: '#62686a', moss: '#465c3c', mossAmt: 0.45, strokeAmt: 0.12, map: stoneTex, mapRep: [1.2, 1.2], mapGain: 1.3, wet: 0.4 }),
  log: paint({ base: '#3f4a3c', moss: '#3e5a32', mossAmt: 0.35, stroke: [1, 0, 0], strokeAmt: 0.16, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.45 }),
  post: paint({ base: '#33392f', moss: '#3e5a32', mossAmt: 0.4, stroke: [0, 1, 0], strokeAmt: 0.14, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.4 }),
  thatch: paint({ base: '#5c6458', moss: '#4e5a4c', mossAmt: 0.3, stroke: [0, 1, 0], strokeAmt: 0.5, break: 0.36, side: THREE.DoubleSide, drip: 0.4, rim: 0.8 }),
  thatchDark: paint({ base: '#202a24', strokeAmt: 0.2, stroke: [0, 1, 0], side: THREE.DoubleSide, rim: 0.2 }),
  mould: paint({ base: '#7e8e7c', strokeAmt: 0.25, break: 0.4, side: THREE.DoubleSide, rim: 0.4 }),
  mossPad: paint({ base: '#34483e', moss: '#405a46', mossAmt: 0.6, strokeAmt: 0.3, stroke: [0, 1, 0], break: 0.4, side: THREE.DoubleSide, rim: 0.6 }),
  grass: paint({ base: '#4a6248', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.2, rim: 1.0, push: true }),
  grassDry: paint({ base: '#6a6448', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.2, rim: 1.0, push: true }),
  barkOld: paint({ base: '#3c3530', moss: '#38483e', mossAmt: 0.3, stroke: [0, 1, 0], strokeAmt: 0.32, drip: 0.6, break: 0.3, rim: 0.9, map: MAT.bark.uniforms.uMap.value, mapRep: [1 / 3.0, 1 / 1.6], mapGain: 1.5 }),
  drift: paint({ base: '#5a5a52', moss: '#3e5244', mossAmt: 0.35, stroke: [0, 1, 0], strokeAmt: 0.32, break: 0.32, rim: 1.0, wet: 0.4, map: MAT.bark.uniforms.uMap.value, mapRep: [1 / 3.0, 1 / 1.6], mapGain: 1.3 }),
  fringe: paint({ base: '#6a6e5c', strokeAmt: 0.3, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 0.6, rim: 0.6 }),
  shellDim: paint({ base: '#9a948a', strokeAmt: 0.12, stroke: [1, 0, 0], rim: 0.8, side: THREE.DoubleSide }),
  shell: paint({ base: '#b8b0a4', strokeAmt: 0.14, stroke: [1, 0, 0], rim: 0.7, break: 0.25, side: THREE.DoubleSide }),
  shellPink: paint({ base: '#a88680', strokeAmt: 0.14, stroke: [1, 0, 0], rim: 0.7, break: 0.25, side: THREE.DoubleSide }),
  star: paint({ base: '#a85a34', strokeAmt: 0.15, rim: 0.8, break: 0.25 }),
  bone: paint({ base: '#b4ab96', strokeAmt: 0.12, break: 0.22, rim: 0.75, moss: '#5a7a4a', mossAmt: 0.15 }),
  bronze: paint({ base: '#8a6a34', strokeAmt: 0.08, rim: 1.6, wet: 0.6, moss: '#3f7a5a', mossAmt: 0.3 }),
  iron: MAT.iron, dark: MAT.dark,
  rope: MAT.rope,
  ropeRed: paint({ base: '#8a2a1e', strokeAmt: 0.2, stroke: [1, 0, 0], rim: 0.8 }),
  pad: paint({ base: '#2a4644', strokeAmt: 0.2, rim: 0.5, wet: 0.8, bob: true, moss: '#577a3a', mossAmt: 0.3 }),
  lotus: paint({ base: '#9a86c8', strokeAmt: 0.15, stroke: [0, 1, 0], rim: 1.2, emit: [0.07, 0.05, 0.12], side: THREE.DoubleSide, bob: true }),
  lotusIn: glow('#d8c8ff', { k: 0.9, flick: 0.1 }),
  winRed: glow('#ff7a3a', { k: 1.5, flick: 0.5 }),
  inRed: glow('#ff5a2a', { k: 0.55, flick: 0.5 }),
  lampRed: glow('#ff4a2a', { k: 2.6, flick: 0.6 }),
  lampGreen: glow('#5affd6', { k: 2.2, flick: 0.35 }),
  amulet: glow('#ffc65a', { k: 1.8, flick: 0.25 }),
  rune: glow('#6aa8b8', { k: 0.5, flick: 0.3 }),
  eye: glow('#9ae0e8', { k: 1.2, flick: 0.2 }),
  candle: MAT.candle,
  wood: MAT.wood, woodDark: MAT.woodDark, plank: MAT.plank, plankOld: MAT.plankOld, moss: MAT.moss, bark: MAT.bark, leaf: MAT.leaf,
};
M.mossDark = paint({ base: '#2c4232', strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.0, rim: 0.3, break: 0.3 });
M.leafTeal = paint({ base: '#2f4a3a', strokeAmt: 0.3, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.4, rim: 0.9, break: 0.35 });
for (const k of ['rope', 'ropeRed', 'moss', 'mossDark', 'leaf', 'leafTeal', 'thatchDark', 'mould', 'mossPad', 'grass', 'grassDry', 'fringe']) M[k].userData.noInk = true;

// водопад: струи бегут вниз, по краям рвутся, у подножия пена; рисованными тонами
function fallsMat(seed, speed = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uSeed: { value: seed }, uSpeed: { value: speed } }),
    side: THREE.DoubleSide,
    vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vWPos; void main(){ vUv = uv; vec3 p = position; vec4 w = modelMatrix * vec4(p, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${DECL}${NOISE}${FOG_FN} uniform float uSeed; uniform float uSpeed; varying vec2 vUv; varying vec3 vWPos;
      void main(){ float x = vUv.x, y = vUv.y; float t = uTime * uSpeed;
        float n = vnoise2(vec2(x * 9.0 + uSeed, y * 2.5 + t * 1.3));
        float s = vnoise2(vec2(x * 34.0 + uSeed * 3.0, y * 1.1 + t * 2.2));
        float s2 = vnoise2(vec2(x * 70.0 - uSeed, y * 2.0 + t * 3.1));
        float edge = min(x, 1.0 - x) * 2.0;
        if (edge + (n - 0.5) * 0.5 < 0.12) discard;
        vec3 deep = vec3(0.05, 0.12, 0.17), mid = vec3(0.22, 0.4, 0.5), hi = vec3(0.68, 0.84, 0.9);
        float tone = n * 0.6 + s * 0.5 + (1.0 - edge) * -0.25;
        vec3 c = tone > 0.62 ? hi : (tone > 0.38 ? mid : deep);
        c = mix(c, hi, step(0.78, s2) * 0.8);
        // бегущие вниз «занавеси»: светлые рваные полосы поперёк струи
        float cur = smoothstep(0.82, 0.95, sin((y * 7.0 + t * 4.2 + vnoise2(vec2(x * 5.0 + uSeed, t * 0.3)) * 2.5) * 1.0)) * step(0.4, s);
        c = mix(c, hi, cur * 0.55);
        float foam = smoothstep(0.12, 0.0, y + (n - 0.5) * 0.06); c = mix(c, hi * 1.1, foam);
        float lip = smoothstep(0.93, 1.0, y + (n - 0.5) * 0.05); c = mix(c, hi, lip * 0.7);
        c *= 0.62 + 0.25 * uTheme;
        vec3 fc = applyFog(c, vWPos);
        gl_FragColor = vec4(mix(fc, c, 0.35), 1.0); }`,
  });
}

// ---------- мелкие сборки ----------
function shellGeo() {   // гребешок: веер с рёбрами, выпуклый
  const NR = 4, NT = 18, pos = [], idx = [], uv = [];
  pos.push(0, 0, 0.0); uv.push(0.5, 0);
  for (let i = 1; i <= NR; i++) for (let j = 0; j <= NT; j++) {
    const r = i / NR, th = -1.15 + 2.3 * j / NT;
    const rib = Math.abs(Math.sin(th * 4.5 * Math.PI / 2.3 * 2)) * 0.06 * r;
    pos.push(Math.sin(th) * r, Math.cos(th) * r * 0.95, 0.22 * (1 - r * r) + rib + 0.05); uv.push(j / NT, r);
  }
  for (let j = 0; j < NT; j++) idx.push(0, 1 + j, 2 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NT; j++) { const a = 1 + (i - 1) * (NT + 1) + j, b = a + NT + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // ушки у основания
  const ear = new THREE.BoxGeometry(0.5, 0.16, 0.04); ear.translate(0, -0.02, 0.04);
  return mergeGeometries([g.toNonIndexed(), boxUV(ear, 0.5, 0.16, 0.04).toNonIndexed()], false);
}
function starGeo() {
  const s = new THREE.Shape();
  for (let k = 0; k <= 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, r = k % 2 ? 0.16 : 0.42 * (0.9 + 0.2 * Math.sin(k * 3.3)); (k ? s.lineTo : s.moveTo).call(s, Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 1 });
  return g;
}
const SHELL = shellGeo(), STAR = starGeo();
// пучок соломы бахромы: 4 узких клина висят вниз от точки крепления
const FRINGE = (() => { const pos = [], idx = []; for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.1, l = 0.45 + ((i * 37) % 5) * 0.06, n = pos.length / 3; pos.push(x - 0.06, 0, 0.02 * i, x + 0.06, 0, 0.02 * i, x + 0.015 * (i - 1.5), -l, 0.03 * i + 0.04); idx.push(n, n + 1, n + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
const _up = new THREE.Vector3(0, 0, 1);
// плоская вещь лицом по нормали n, с поворотом вокруг нормали
function onSurface(pack, mat, geo, p, n, spin, s) {
  const q = new THREE.Quaternion().setFromUnitVectors(_up, n.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(_up, spin));
  pack.add(mat, geo, new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s)));
}
// фонарь «летучая мышь»: поддон, стекло светится, четыре прута, колпак, кольцо
// фонарь «летучая мышь»: широкая ступенчатая подошва, пузатое стекло в проволочной клетке, боковые трубки рамы,
// купол-колпак с вытяжкой, дужка через верх; кольцо подвеса — на y + 0,42·s (под цепь)
const LATHE = (pts, n = 12) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
const LAMP_BASE = LATHE([[0, -0.3], [0.17, -0.3], [0.19, -0.285], [0.19, -0.27], [0.15, -0.255], [0.16, -0.235], [0.12, -0.215], [0.08, -0.2], [0, -0.2]]);
const LAMP_GLASS = LATHE([[0.07, -0.2], [0.115, -0.15], [0.14, -0.06], [0.142, 0.03], [0.125, 0.12], [0.09, 0.18], [0.07, 0.2]]);
const LAMP_CAP = LATHE([[0.07, 0.195], [0.175, 0.215], [0.18, 0.232], [0.15, 0.245], [0.11, 0.29], [0.06, 0.315], [0.045, 0.33], [0.05, 0.36], [0.03, 0.375], [0, 0.375]]);
const GUARD = [[0.1, -0.2], [0.15, -0.13], [0.172, -0.04], [0.172, 0.05], [0.15, 0.14], [0.1, 0.2]];
function lamp(P, PG, x, y, z, s, glowMat) {
  const c = V(x, y, z), at = (a, r, h) => V(x + Math.cos(a) * r * s, y + h * s, z + Math.sin(a) * r * s);
  P.add(M.iron, LAMP_BASE, M4(x, y, z, 0, 0, 0, s, s, s));
  PG.add(glowMat, LAMP_GLASS, M4(x, y, z, 0, 0, 0, s, s, s));
  P.add(M.iron, LAMP_CAP, M4(x, y, z, 0, 0, 0, s, s, s));
  const a0 = rnd() * 6.28;
  for (let k = 0; k < 3; k++) for (const o of [0, Math.PI]) { const a = a0 + Math.PI / 2 + (k - 1) * 0.7 + o; tube(P, M.iron, GUARD.map(([r, h]) => at(a, r, h)), 0.007 * s, 4, 8); }
  P.add(M.iron, new THREE.TorusGeometry(0.168 * s, 0.01 * s, 4, 16), M4(x, y - 0.02 * s, z, Math.PI / 2, 0, 0));
  // боковые трубки рамы — главный признак «летучей мыши»
  for (const sd of [0, Math.PI]) { const a = a0 + sd; tube(P, M.iron, [at(a, 0.15, -0.24), at(a, 0.215, -0.19), at(a, 0.215, 0.15), at(a, 0.165, 0.225)], 0.016 * s, 5, 8); }
  // дужка через верх и кольцо подвеса
  P.add(M.iron, new THREE.TorusGeometry(0.205 * s, 0.01 * s, 4, 14, Math.PI), M4(x, y + 0.215 * s, z, 0, -a0, 0));
  P.add(M.iron, new THREE.TorusGeometry(0.035 * s, 0.01 * s, 4, 10), M4(x, y + 0.42 * s, z, 0, -a0, 0));
  return c;
}
// колокольчик: тело вращения, язычок, ушко
const BELL = (() => { const pts = [[0.0, 0.32], [0.06, 0.31], [0.1, 0.27], [0.12, 0.15], [0.15, 0.05], [0.2, 0.0], [0.19, -0.02], [0.0, 0.05]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 12); })();
function bell(P, top, s = 1, len = 0.5) {
  chain(P, top, len, rnd() * 3);
  const y = top.y - Math.round(len / 0.09) * 0.085 - 0.32 * s;
  P.add(M.bronze, BELL, M4(top.x, y, top.z, 0, 0, 0, s, s, s));
  P.add(M.iron, new THREE.SphereGeometry(0.04 * s, 6, 4), M4(top.x, y + 0.02 * s, top.z));
}
// полотно с руной
function cloth(P, mat, x, y, z, w, h, rotY) {
  const n = 7, pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pos.push(-w / 2, -h * t, 0, w / 2, -h * t - (i === n ? rr(0, 0.12) * h : 0), 0); uv.push(0, 1 - t, 1, 1 - t); }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  P.add(mat, g, M4(x, y, z, 0, rotY, 0));
}
// стяг на перекладине: палка, два шнура, полотно (висит на перекладине, перекладина привязана)
function bannerBar(P, mat, cx, cy, cz, w, h, rotY) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  beam(P, M.wood, V(cx - c * (w / 2 + 0.12), cy, cz + s * (w / 2 + 0.12)), V(cx + c * (w / 2 + 0.12), cy, cz - s * (w / 2 + 0.12)), 0.03, 5);
  cloth(P, mat, cx, cy - 0.03, cz, w, h, rotY);
}
// резной идол: столб, пояса, лики со светящимися глазами, навершие — рыбий череп с рогами
// тотемы по референсу: 0 — каменная стела с острым верхом, резным поясом и знаком; 1 — «стрельчатая» плита с арочной нишей;
// 2 — деревянный идол из распухших чурбаков с личинами и острой шапкой. У подножия гнездо глыб, мох, плесень, лиана.
function rune(PG, M2, f, y, s) {   // знак: ствол, две пары ветвей, круг — тонкими врезами (едва тлеют)
  const g = (sx, sy, lx, ly, rz) => PG.add(M.rune, new THREE.BoxGeometry(sx, sy, 0.02), M2.clone().multiply(M4(lx * s, y + ly * s, f, 0, 0, rz)));
  g(0.035 * s, 0.7 * s, 0, 0, 0); for (const sd of [-1, 1]) { g(0.03 * s, 0.28 * s, sd * 0.1, 0.22, sd * 0.7); g(0.03 * s, 0.24 * s, sd * 0.09, -0.2, -sd * 0.7); }
  PG.add(M.rune, new THREE.TorusGeometry(0.11 * s, 0.014 * s, 4, 14), M2.clone().multiply(M4(0, y + 0.02 * s, f)));
}
function idol(P, PG, x, z, h, rotY, o = {}) {
  const kind = o.kind ?? 0, y0 = groundAt(x, z), lean = [rr(-0.05, 0.05), rr(-0.05, 0.05)];
  const B = new THREE.Matrix4().makeTranslation(x, y0 - 0.3, z).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(new THREE.Matrix4().makeRotationX(lean[0])).multiply(new THREE.Matrix4().makeRotationZ(lean[1]));
  for (let k = 0; k < 4; k++) { const a = k * 1.6 + rr(-0.3, 0.3), r = rr(0.5, 0.75); lumpStone(P, M.stone, x + Math.cos(a) * r, y0 + 0.05, z + Math.sin(a) * r, rr(0.45, 0.7), rr(0.3, 0.45), rr(0.4, 0.6), rr(0, 6), k + 3); }
  let top;
  if (kind === 0) {
    // стела: четырёхгранный ствол сужается, пояс-валик, острая пирамида
    const wb = 0.62, wt = 0.46, g = new THREE.CylinderGeometry(wt * 0.7071, wb * 0.7071, h, 4, 3); g.rotateY(Math.PI / 4); g.translate(0, h / 2, 0);
    P.add(M.cliff, g, B.clone().multiply(M4(0, 0, 0)));
    P.add(M.cliff, new THREE.CylinderGeometry(wt * 0.78, wt * 0.82, 0.18, 4).rotateY(Math.PI / 4), B.clone().multiply(M4(0, h * 0.78, 0)));
    const pyr = new THREE.ConeGeometry(wt * 0.72, 0.75, 4); pyr.rotateY(Math.PI / 4); P.add(M.cliff, pyr, B.clone().multiply(M4(0, h + 0.37, 0)));
    for (let k = 0; k < 3; k++) box(P, M.dark, wt * 0.9 - k * 0.08, 0.04, 0.02, B.clone().multiply(M4(0, h * 0.25 + k * 0.08, (wb + wt) / 4 + 0.005)));
    rune(PG, B, (wb + wt) / 4 + 0.012, h * 0.52, 1.0);
    top = y0 - 0.3 + h + 0.75;
  } else if (kind === 1) {
    // стрельчатая плита: прямоугольник + два дуговых плеча в острие; ниша с аркой, в ниже знак
    const W = 0.9, T = 0.3, shape = new THREE.Shape(); shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2 * 0.92, h * 0.75);
    shape.quadraticCurveTo(W / 2 * 0.85, h * 0.95, 0, h * 1.08); shape.quadraticCurveTo(-W / 2 * 0.85, h * 0.95, -W / 2 * 0.92, h * 0.75); shape.lineTo(-W / 2, 0);
    const niche = new THREE.Path(); niche.moveTo(-0.22, h * 0.35); niche.lineTo(0.22, h * 0.35); niche.lineTo(0.22, h * 0.7); niche.quadraticCurveTo(0.2, h * 0.84, 0, h * 0.9); niche.quadraticCurveTo(-0.2, h * 0.84, -0.22, h * 0.7); niche.lineTo(-0.22, h * 0.35); shape.holes.push(niche);
    const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 8 }); g.translate(0, 0, -T / 2);
    P.add(M.cliff, g, B);
    box(P, M.dark, 0.44, h * 0.55, 0.06, B.clone().multiply(M4(0, h * 0.62, -0.02)));   // глубь ниши
    rune(PG, B, 0.02, h * 0.55, 0.8);
    for (const sd of [-1, 1]) box(P, M.dark, 0.03, h * 0.6, 0.02, B.clone().multiply(M4(sd * 0.33, h * 0.42, T / 2 + 0.045)));
    top = y0 - 0.3 + h * 1.08;
  } else {
    // деревянный идол: чурбаки друг на друге (распухшие), личины, острая шапка с бахромой
    const n = Math.max(2, Math.round(h / 1.2)), bh = h / n;
    for (let k = 0; k < n; k++) {
      const yb = k * bh, a = new THREE.Vector3(0, yb, 0).applyMatrix4(B), b2 = new THREE.Vector3(0, yb + bh - 0.06, 0).applyMatrix4(B);
      swell(P, k % 2 ? M.woodDark : M.post, a, b2, 0.3 - k * 0.02, 1.2, 8);
      const fy = yb + bh * 0.55, F = (sx, sy, sz, lx, ly, lz, mat = M.woodDark) => box(P, mat, sx, sy, sz, B.clone().multiply(M4(lx, ly, lz)));
      F(0.42, 0.1, 0.12, 0, fy + 0.12, 0.29); F(0.08, 0.2, 0.1, 0, fy - 0.02, 0.31);                // брови, нос
      for (const sd of [-1, 1]) { F(0.12, 0.07, 0.04, sd * 0.11, fy + 0.03, 0.3, M.dark); PG.add(M.eye, new THREE.SphereGeometry(0.025, 5, 4), B.clone().multiply(M4(sd * 0.11, fy + 0.03, 0.32))); }
      F(0.24, 0.05, 0.04, 0, fy - 0.17, 0.3, M.dark);
      if (k < n - 1) P.add(M.woodDark, new THREE.CylinderGeometry(0.36, 0.34, 0.08, 9), B.clone().multiply(M4(0, yb + bh - 0.04, 0)));
    }
    P.add(M.post, new THREE.ConeGeometry(0.38, 0.8, 7), B.clone().multiply(M4(0, h + 0.38, 0)));
    for (let k = 0; k < 10; k++) { const a = k * 0.63; P.add(M.fringe, FRINGE, B.clone().multiply(M4(Math.sin(a) * 0.36, h + 0.02, Math.cos(a) * 0.36, 0, a, 0, 0.8, 0.7, 1))); }
    top = y0 - 0.3 + h + 0.78;
  }
  // мох и плесень у основания, лиана с верха
  const qz = new THREE.Quaternion();
  for (let k = 0; k < 5; k++) { const a = rr(0, 6.28), p = new THREE.Vector3(Math.sin(a) * 0.36, rr(0.35, 1.2), Math.cos(a) * 0.36).applyMatrix4(B); qz.setFromUnitVectors(V(0, 0, 1), V(Math.sin(rotY + a), 0, Math.cos(rotY + a))); P.add(k % 2 ? M.mould : M.mossPad, PATCH, new THREE.Matrix4().compose(p, qz, V(rr(0.3, 0.55), rr(0.3, 0.6), 1))); }
  P.add(M.mossDark, MOSS_LITE, M4(x, y0 + 0.02, z, 0, rr(0, 6), 0, 0.6, 0.15, 0.6));
  if (o.vine) vine(P, V(x + rr(-0.2, 0.2), top - 0.6, z + rr(-0.2, 0.2)), rr(1.2, 2.2), rotY, 0.25);
  return top;
}
// рыбий череп: вытянутая голова, пасть с зубами, глазницы, рога (сомовий «водяной» знак)
function fishSkull(P, PG, x, y, z, s, rotY, horns = true) {
  const base = M4(x, y, z, 0, rotY, 0, s, s, s);
  const add = (mat, geo, m) => P.add(mat, geo, base.clone().multiply(m));
  add(M.bone, new THREE.SphereGeometry(0.3, 10, 7), M4(0, 0, 0, 0, 0, 0, 0.8, 0.7, 1.25));
  add(M.bone, new THREE.ConeGeometry(0.2, 0.5, 8), M4(0, -0.05, 0.48, Math.PI / 2, 0, 0, 1, 1, 0.55));
  add(M.bone, new THREE.BoxGeometry(0.3, 0.05, 0.4), M4(0, -0.2, 0.36, 0.25, 0, 0));
  for (let k = 0; k < 6; k++) add(M.bone, new THREE.ConeGeometry(0.02, 0.08, 4), M4(-0.11 + k * 0.045, -0.15, 0.5, Math.PI, 0, 0));
  for (const sd of [-1, 1]) add(M.dark, new THREE.SphereGeometry(0.075, 6, 4), M4(sd * 0.17, 0.06, 0.15, 0, 0, 0, 0.6, 1, 1));
  if (horns) for (const sd of [-1, 1]) {
    const P2 = new Pack(); tube(P2, M.bone, [V(sd * 0.15, 0.12, -0.05), V(sd * 0.42, 0.32, -0.1), V(sd * 0.5, 0.7, 0.02), V(sd * 0.36, 1.0, 0.12)], 0.045, 6, 8);
    for (const g of P2.parts.get(M.bone)) add(M.bone, g, new THREE.Matrix4());
  }
}
// сужающаяся кость по кривой (рёбра-серпы, шипы): радиус от r0 к r1
function taper(P, mat, pts, r0, r1, rs = 6, ts = 12) {
  const c = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(c, ts, 1, rs, false), p = g.attributes.position;
  for (let i = 0; i <= ts; i++) { const ctr = c.getPointAt(i / ts), r = lerp(r0, r1, Math.pow(i / ts, 0.8)); for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; _v.fromBufferAttribute(p, k).sub(ctr).multiplyScalar(r).add(ctr); p.setXYZ(k, _v.x, _v.y, _v.z); } }
  g.computeVertexNormals(); P.add(mat, g);
}
const _v = new THREE.Vector3();
// ---------- живые формы (раунд 3) ----------
// кривая глыба: округлая, с плоской стёртой верхушкой, сколами и буграми; вписана в куб [-0,5; 0,5] — ставится как box(sx, sy, sz)
function lumpGeo(seed, flat = 0.55) {
  let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g);
  const p = g.attributes.position, h = (x, y, z, k) => Math.sin(x * k + seed * 1.7) * Math.sin(y * k * 1.3 + seed) * Math.sin(z * k * 0.9 + seed * 2.3);
  const cuts = Array.from({ length: 3 }, (_, i) => { const a = seed * 2.1 + i * 2.2, b = 0.3 + 0.5 * Math.sin(seed + i); return [V(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.6, Math.sin(a) * Math.cos(b)).normalize(), 0.72 + 0.1 * Math.sin(seed * 3 + i)]; });
  for (let i = 0; i < p.count; i++) {
    _v.fromBufferAttribute(p, i);
    const d = _v.clone(); d.set(Math.sign(d.x) * Math.pow(Math.abs(d.x), 0.7), Math.sign(d.y) * Math.pow(Math.abs(d.y), 0.8), Math.sign(d.z) * Math.pow(Math.abs(d.z), 0.7));
    d.multiplyScalar(1 + 0.1 * h(_v.x, _v.y, _v.z, 2.3) + 0.045 * h(_v.x, _v.y, _v.z, 6.1));
    if (d.y > flat) d.y = flat + (d.y - flat) * 0.12 + 0.02 * h(_v.x, 0, _v.z, 5);
    for (const [n, o] of cuts) { const k = d.dot(n); if (k > o) d.addScaledVector(n, -(k - o) * 0.9); }
    p.setXYZ(i, d.x, d.y, d.z);
  }
  g.computeBoundingBox(); const bb = g.boundingBox, sz = bb.getSize(V()), c = bb.getCenter(V());
  g.translate(-c.x, -c.y, -c.z); g.scale(1 / sz.x, 1 / sz.y, 1 / sz.z);
  const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + p.getZ(i)) * 1.5; uv[i * 2 + 1] = p.getY(i) * 1.5; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}
const LUMP = [1, 2, 3, 4, 5, 6].map((k) => lumpGeo(k * 1.37, 0.45 + (k % 3) * 0.12));
const lumpStone = (P, mat, x, y, z, sx, sy, sz, ry = 0, k = 0) => P.add(mat, LUMP[k % LUMP.length], M4(x, y, z, rr(-0.04, 0.04), ry, rr(-0.04, 0.04), sx, sy, sz));
// распухшее бревно/столб: утолщения и перехваты по длине, лёгкий изгиб
function swell(P, mat, a, b, r, k = 1, rs = 7) {
  const d = b.clone().sub(a), L = d.length(), side = V(-d.z, 0, d.x).normalize().multiplyScalar(rr(-1, 1) * 0.06 * L * k);
  const ts = Math.max(6, Math.round(L * 3)), c = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(side), b]);
  const g = new THREE.TubeGeometry(c, ts, 1, rs, false), p = g.attributes.position, ph = rr(0, 6), fr = rr(2.5, 4.5);
  for (let i = 0; i <= ts; i++) { const t = i / ts, ctr = c.getPointAt(t), rad = r * (1 + k * (0.16 * Math.sin(t * Math.PI) + 0.1 * Math.sin(t * fr * 3.14 + ph) + 0.06 * Math.sin(t * 17 + ph * 2))); for (let j = 0; j <= rs; j++) { const q = i * (rs + 1) + j; _v.fromBufferAttribute(p, q).sub(ctr).multiplyScalar(rad * (1 + 0.06 * Math.sin(j * 2.1 + i))).add(ctr); p.setXYZ(q, _v.x, _v.y, _v.z); } }
  g.computeVertexNormals(); P.add(mat, g);
  for (const e of [a, b]) P.add(mat, new THREE.CircleGeometry(r * 0.95, rs), new THREE.Matrix4().compose(e, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), e === a ? d.clone().negate().normalize() : d.clone().normalize()), V(1, 1, 1)));
}
// пучок травы: 7–9 травинок веером, вершины гнутся
const TUFT = (() => { const pos = [], idx = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, l = 0.25 + (i * 37 % 7) * 0.05, lean = 0.12 + (i % 3) * 0.06, n = pos.length / 3, cx = Math.cos(a), cz = Math.sin(a), w = 0.025; pos.push(-cz * w, 0, cx * w, cz * w, 0, -cx * w, cx * lean * 0.5 - cz * w * 0.5, l * 0.55, cz * lean * 0.5 + cx * w * 0.5, cx * lean, l, cz * lean); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
// пятно плесени/мха: рваный плоский лоскут (кладётся на поверхность)
const PATCH = (() => { const n = 14, pos = [0, 0, 0], idx = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = 0.5 * (0.7 + 0.3 * Math.sin(a * 3 + 1) + 0.15 * Math.sin(a * 7)); pos.push(Math.cos(a) * r, Math.sin(a) * r, 0); if (i) idx.push(0, i, i + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();

// большой череп чудо-рыбы с раскрытой пастью: свод, глазницы, верхняя челюсть с клыками, нижняя опущена
function bigSkull(P, PG, x, y, z, s, yaw, open = 0.45) {
  const base = M4(x, y, z, 0, yaw, 0, s, s, s), add = (mat, geo, m) => P.add(mat, geo, base.clone().multiply(m));
  add(M.bone, new THREE.SphereGeometry(0.5, 12, 8), M4(0, 0.15, -0.2, 0, 0, 0, 0.9, 0.75, 1.1));
  add(M.bone, new THREE.ConeGeometry(0.4, 0.85, 8), M4(0, 0.08, 0.5, Math.PI / 2, 0, 0, 1, 1, 0.6));
  for (const sd of [-1, 1]) { add(M.dark, new THREE.SphereGeometry(0.13, 7, 5), M4(sd * 0.3, 0.25, 0.05, 0, 0, 0, 0.6, 1, 1.1)); add(M.bone, new THREE.TorusGeometry(0.15, 0.04, 5, 10), M4(sd * 0.33, 0.25, 0.05, 0, sd * 1.2, 0)); }
  for (let k = 0; k < 4; k++) add(M.bone, new THREE.ConeGeometry(0.06, 0.4 - k * 0.06, 5), M4(0, 0.55 - k * 0.05, -0.55 + k * 0.28, -0.5, 0, 0));   // гребень
  // верхние зубы
  for (let k = 0; k < 9; k++) { const t = k / 8, sd = k % 2 ? 1 : -1; add(M.bone, new THREE.ConeGeometry(0.035 + (k === 1 || k === 2 ? 0.02 : 0), 0.16 + (k === 1 || k === 2 ? 0.12 : 0), 4), M4(sd * 0.12 * (1 - t * 0.6), -0.12, 0.1 + t * 0.9, Math.PI, 0, 0)); }
  // нижняя челюсть — на шарнире у затылка, опущена
  const jaw = base.clone().multiply(M4(0, -0.18, -0.1, open, 0, 0));
  for (const sd of [-1, 1]) { const P2 = new Pack(); taper(P2, M.bone, [V(sd * 0.28, 0, 0), V(sd * 0.2, -0.05, 0.6), V(sd * 0.07, -0.02, 1.15)], 0.07, 0.04, 5, 8); for (const g of P2.parts.get(M.bone)) P.add(M.bone, g, jaw); }
  for (let k = 0; k < 8; k++) { const t = k / 7, sd = k % 2 ? 1 : -1; P.add(M.bone, new THREE.ConeGeometry(0.03, 0.14, 4), jaw.clone().multiply(M4(sd * (0.24 - t * 0.16), 0.08, 0.15 + t * 0.9))); }
}
// большой рыбий скелет, наполовину в иле: позвонки дисками, остистые, рёбра-серпы торчат из земли, хвостовой плавник
function fishSkeleton(P, PG, a, b, s = 1) {
  const d = b.clone().sub(a), L = d.length(); d.normalize();
  const side = V(-d.z, 0, d.x).normalize();
  const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(a.clone().lerp(b, t).add(V(0, Math.sin(t * Math.PI) * 0.35 * s + 0.1, 0))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  tube(P, M.bone, pts, 0.07 * s, 6, 18);
  const NV = Math.round(L / (0.34 * s));
  for (let k = 0; k <= NV; k++) {
    const t = k / NV, p = curve.getPoint(t), tg = curve.getTangent(t), r = (0.2 - 0.1 * t) * s;
    P.add(M.bone, new THREE.CylinderGeometry(r, r, 0.2 * s, 9), new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), tg), V(1, 1, 1)));
    if (k % 2 === 0) taper(P, M.bone, [p, p.clone().add(V(0, 0.5 * s, 0)).addScaledVector(d, -0.15 * s), p.clone().add(V(0, 0.85 * s * (1 - t * 0.5), 0)).addScaledVector(d, -0.35 * s)], 0.05 * s, 0.012 * s, 5, 6);
  }
  // рёбра: серпы дугой вверх и наружу, концы загнуты внутрь (самые высокие у головы)
  for (let k = 0; k < 9; k++) {
    const t = 0.1 + k / 9 * 0.62, p = curve.getPoint(t), h = (2.4 - t * 2.0) * s * (0.9 + 0.2 * Math.sin(k * 2.3));
    for (const sd of [-1, 1]) {
      if (rnd() < 0.12) continue;   // пара выломана
      const o = side.clone().multiplyScalar(sd), lean = rr(-0.1, 0.1);
      taper(P, M.bone, [p.clone().addScaledVector(o, 0.15 * s).add(V(0, -0.3 * s, 0)), p.clone().addScaledVector(o, 0.9 * s).add(V(0, h * 0.35, 0)), p.clone().addScaledVector(o, 0.85 * s).addScaledVector(d, lean).add(V(0, h * 0.75, 0)), p.clone().addScaledVector(o, 0.35 * s).addScaledVector(d, lean * 2).add(V(0, h, 0))], 0.1 * s, 0.015 * s, 6, 12);
    }
  }
  const yaw = Math.atan2(-d.x, -d.z);
  bigSkull(P, PG, a.x - d.x * 0.9 * s, a.y + 0.45 * s, a.z - d.z * 0.9 * s, 1.5 * s, yaw, 0.5);
  for (const sd of [-1, 1]) taper(P, M.bone, [b, b.clone().addScaledVector(d, 0.8 * s).add(V(0, sd * 0.5 * s + 0.4, 0)), b.clone().addScaledVector(d, 1.4 * s).add(V(0, sd * 0.9 * s + 0.6, 0))], 0.08 * s, 0.015 * s, 5, 8);
}
// коряга: выбеленный водой ствол с корневой лапой, корни-щупальца, обломанные сучья; kind 0 — лежит, 1 — торчит из воды
function snag(P, x, y, z, s, yaw, kind = 0) {
  const d = V(Math.sin(yaw), 0, Math.cos(yaw)), sd = V(d.z, 0, -d.x);
  const base = V(x, y, z);
  const tip = kind ? base.clone().addScaledVector(d, 1.0 * s).add(V(0, 2.6 * s, 0)) : base.clone().addScaledVector(d, 3.2 * s).add(V(0, 0.9 * s, 0));
  const mid = base.clone().lerp(tip, 0.5).addScaledVector(sd, 0.35 * s).add(V(0, kind ? 0 : 0.15 * s, 0));
  taper(P, M.drift, [base.clone().add(V(0, -0.2 * s, 0)), mid, tip], 0.26 * s, 0.05 * s, 7, 14);
  // корневая лапа у основания: корни веером, кривые, концы уходят в воду/землю
  const nR = 5 + Math.floor(rnd() * 3);
  for (let k = 0; k < nR; k++) {
    const a = yaw + Math.PI + (k / (nR - 1) - 0.5) * 2.6 + rr(-0.15, 0.15), dir = V(Math.sin(a), 0, Math.cos(a)), l = rr(0.9, 1.7) * s;
    taper(P, M.drift, [base.clone().add(V(0, 0.05 * s, 0)), base.clone().addScaledVector(dir, l * 0.45).add(V(0, rr(0.15, 0.5) * s, 0)), base.clone().addScaledVector(dir, l * 0.8).addScaledVector(sd, rr(-0.3, 0.3) * s).add(V(0, rr(0.05, 0.35) * s, 0)), base.clone().addScaledVector(dir, l).add(V(0, -0.3 * s, 0))], 0.12 * s, 0.02 * s, 5, 8);
  }
  // сучья: два-три обломка, один с загнутым концом
  for (let k = 0; k < 3; k++) {
    const t = rr(0.35, 0.85), p = new THREE.CatmullRomCurve3([base, mid, tip]).getPoint(t), side = k % 2 ? 1 : -1;
    const q1 = p.clone().addScaledVector(sd, side * rr(0.4, 0.8) * s).add(V(0, rr(0.3, 0.7) * s, 0)), q2 = q1.clone().addScaledVector(sd, side * rr(0.1, 0.4) * s).addScaledVector(d, rr(-0.3, 0.3) * s).add(V(0, rr(0.2, 0.5) * s, 0));
    taper(P, M.drift, [p, q1, q2], 0.07 * s, 0.012 * s, 5, 6);
  }
  P.add(M.drift, new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.1 * s, 7), M4(tip.x, tip.y, tip.z));
}
// канат обмотан вокруг столба спиралью (как на референсе)
function ropeWrap(P, x, y0, z, r, h, turns = 4, mat = M.rope) { const pts = []; const n = turns * 10; for (let i = 0; i <= n; i++) { const a = i / 10 * Math.PI * 2; pts.push(V(x + Math.cos(a) * (r + 0.03), y0 + h * i / n + Math.sin(a * 0.5) * 0.02, z + Math.sin(a) * (r + 0.03))); } tube(P, mat, pts, 0.028, 5, n * 2); }
// две длинные кости крест-накрест с узлами-мыщелками, перевязаны
function crossedBones(P, x, y, z, s, yaw) {
  for (const sd of [-1, 1]) {
    const a = V(x + Math.cos(yaw) * sd * 0.75 * s, y - 0.05, z - Math.sin(yaw) * sd * 0.75 * s), b = V(x - Math.cos(yaw) * sd * 0.75 * s + Math.sin(yaw) * 0.5 * s, y + 0.8 * s, z + Math.sin(yaw) * sd * 0.75 * s + Math.cos(yaw) * 0.5 * s);
    beam(P, M.bone, a, b, 0.07 * s, 6);
    for (const e of [a, b]) for (const k of [-1, 1]) P.add(M.bone, new THREE.SphereGeometry(0.1 * s, 7, 5), M4(e.x + Math.sin(yaw) * k * 0.06 * s, e.y, e.z + Math.cos(yaw) * k * 0.06 * s));
  }
  lashing(P, x + Math.sin(yaw) * 0.25 * s, y + 0.38 * s, z + Math.cos(yaw) * 0.25 * s, 0.09 * s);
}

export function buildLair(scene) {
  setSeed(23);
  const solids = [], lights = [], walks = [], perches = [], lilyPads = [], halos = [], shafts = [], drips = [], bases = [];
  const leafSrc = [];
  const anim = { flames: [], smoke: [], door: null };
  const P = new Pack(), PG = new Pack();
  const RED = [1.0, 0.3, 0.16], GREEN = [0.18, 0.7, 0.6], CYAN = [0.3, 0.85, 1.0], GOLD = [1.0, 0.72, 0.3], VIOLET = [0.7, 0.4, 1.0];
  const addLight = (pos, col, r, flick = 0.3, pri = 0) => lights.push({ pos, col, r, flick, pri });
  const propLog = [];
  const footY = (x, z, r, name = '') => { const g = [groundAt(x, z), groundAt(x + r, z), groundAt(x - r, z), groundAt(x, z + r), groundAt(x, z - r)]; const y = Math.min(...g); propLog.push({ name, x, z, r, y, top: Math.max(...g) }); return y; };
  const mk = (geo, mat, mats, shadow = true, ink = true, parent = scene) => {
    const im = new THREE.InstancedMesh(geo, mat, mats.length); mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = shadow; im.receiveShadow = true; parent.add(im);
    if (ink) { const o = new THREE.InstancedMesh(geo, inkMat, mats.length); o.instanceMatrix = im.instanceMatrix; parent.add(o); }
    return im;
  };

  // ---------- земля и вода ----------
  let waterMesh;
  {
    const S = 420, N = 300;
    const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 10);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const cMud = new THREE.Color('#2c3428'), cMoss = new THREE.Color('#3d5a34'), cRock = new THREE.Color('#4c5550'), cRockD = new THREE.Color('#333c3a'), cNeedle = new THREE.Color('#3c3a2c'), cGrass = new THREE.Color('#4f6c3c'); const cClay = new THREE.Color('#5c4c3c'), cClayL = new THREE.Color('#6e5c46'), cClayWet = new THREE.Color('#33291f'), cDry = new THREE.Color('#5a5640'), cMeadow = new THREE.Color('#46604e');
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundAt(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), ny = nrm.getY(i);
      const wet = ss(0.25, -0.4, y), steep = ss(0.82, 0.55, ny);
      const c = cNeedle.clone().lerp(cMoss, 0.5 + n2(x * 2.3, z * 2.3) * 0.45).lerp(cGrass, ss(0.2, 0.9, n2(x * 0.7 + 3, z * 0.7)) * 0.5).lerp(cMud, wet).lerp(n2(x * 1.9, y * 1.3) > 0 ? cRock : cRockD, steep);
      const di = Math.hypot(x - ISLE.x, z - ISLE.z); if (di < 18) c.lerp(cRockD, 0.45 * ss(18, 9, di) * (0.6 + 0.4 * n2(x * 3.1, z * 2.7)));
      // берег: у воды мокрый ил → глина с подтёками → бурая трава → сизо-зелёный луг (границы рваные)
      { const yN = y + n2(x * 1.3, z * 1.3) * 0.3 + n2(x * 5.1, z * 4.7) * 0.08, flat = 1 - steep;
        c.lerp(cMeadow, ss(1.1, 2.2, yN) * flat * 0.55 * (0.7 + 0.3 * n2(x * 0.4, z * 0.4)));
        c.lerp(cDry, ss(0.45, 0.8, yN) * ss(1.7, 1.0, yN) * flat * 0.7);
        c.lerp(n2(x * 2.6, z * 0.9) > 0.1 ? cClayL : cClay, ss(-0.55, -0.05, yN) * ss(0.75, 0.35, yN) * 0.9);
        c.lerp(cClayWet, ss(0.1, -0.35, yN) * 0.85); }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, paint({ base: '#ffffff', vcol: true, moss: '#3f5a30', mossAmt: 0.3, stroke: [0, 1, 0], strokeAmt: 0.24, break: 0.3, rim: 0, drip: 0.4 }));
    m.receiveShadow = true; scene.add(m);
    const gw = BASIN.rx * 2.25, gh = BASIN.rz * 2.25;
    const wg = new THREE.PlaneGeometry(gw, gh, 200, 170); wg.rotateX(-Math.PI / 2);
    const w = new THREE.Mesh(wg, water()); w.position.set(BASIN.x, WATER_Y, BASIN.z); w.receiveShadow = true; scene.add(w); waterMesh = w;
    const NX = 256, NZ = 214, d = new Uint8Array(NX * NZ * 4);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const x = BASIN.x - gw / 2 + (i + 0.5) / NX * gw, z = BASIN.z - gh / 2 + (j + 0.5) / NZ * gh; const v = Math.max(0, Math.min(1, (WATER_Y - groundAt(x, z)) / 3)); d[(j * NX + i) * 4] = v * 255; d[(j * NX + i) * 4 + 3] = 255; }
    const tx = new THREE.DataTexture(d, NX, NZ); tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearFilter; tx.needsUpdate = true;
    U.uDepth.value = tx; U.uDepthBox.value.set(BASIN.x - gw / 2, BASIN.z - gh / 2, gw, gh);
  }
  // бурлит под водопадами
  FALLS.forEach((f, i) => BOIL[i].set(f.bot.x + f.n.x * 1.5, f.bot.z + f.n.z * 1.5, f.w * 0.9 + 1.5, 1.0));

  // ---------- скалы чашей: вертикальные плиты в два ряда, полки ----------
  {
    const slab = new THREE.BoxGeometry(1, 1, 1, 2, 5, 2); { const p = slab.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.08 * Math.sin(x * 9 + y * 7 + z * 5) + 0.06 * Math.sin(y * 13 + x * 3); p.setXYZ(i, x * (1 + k), y, z * (1 + k * 0.7) + (y > 0.45 ? -0.08 * Math.sin(x * 6) : 0)); } slab.computeVertexNormals(); boxUV(slab, 1, 1, 1); }
    const front = [], back = [], ledges = [];
    // скала уступами (как на референсе): ярусы друг на друге, каждый выше — уже и отступает от воды, по кромке — полка
    const tiers = (out, x, z, yaw, w, h, d, n, pLedge) => {
      const ox = -Math.sin(yaw), oz = -Math.cos(yaw);   // от воды
      let y = -2, back = 0;
      for (let i = 0; i < n; i++) {
        const hi = i === n - 1 ? h - (y + 2) : h / n * rr(0.75, 1.2), wi = w * (1 - i * rr(0.06, 0.14)), di = d * (1 - i * 0.08);
        out.push(M4(x + ox * back, y + hi / 2, z + oz * back, rr(-0.03, 0.03), yaw + rr(-0.1, 0.1), rr(-0.04, 0.04), wi, hi, di));
        y += hi; const step = rr(0.5, 1.2);
        if (i < n - 1) { out.push(M4(x + ox * (back - di * 0.08), y - 0.25, z + oz * (back - di * 0.08), 0, yaw + rr(-0.15, 0.15), 0, wi * rr(1.0, 1.15), 0.5, di * 0.55)); if (rnd() < pLedge) ledges.push([x + ox * (back - di * 0.3), y + 0.02, z + oz * (back - di * 0.3), yaw]); }
        back += step;
      }
      if (rnd() < pLedge) ledges.push([x + ox * back, y + 0.02, z + oz * back, yaw]);
    };
    const inFall = (a, e, pad) => FALLS.some((f) => { const [fx, fz] = ellP(f.a, e), [px, pz] = ellP(a, e); return Math.hypot(fx - px, fz - pz) < f.w * 0.5 + pad; });
    for (let a = -3.35; a < 0.25; a += rr(0.06, 0.1)) {
      const north = ss(0.25, -0.75, Math.sin(a));
      if (north < 0.3) continue;
      // передний ряд — низкие уступы у воды
      if (!inFall(a, 1.05, 2.0)) {
        const [x, z] = ellP(a, rr(1.03, 1.07)), H = cliffH(x, z).h, w = rr(2.6, 5), h = Math.max(2.5, rr(0.25, 0.6) * 24 * north) + 2.2, yaw = Math.atan2(BASIN.x - x, BASIN.z - z);
        tiers(front, x, z, yaw + rr(-0.25, 0.25), w, h, rr(2.5, 4.5), h > 7 ? 2 : 1, 0.5);
      }
      // задний ряд — стена до верха и выше
      if (!inFall(a, 1.14, 1.6)) {
        const [x, z] = ellP(a, rr(1.12, 1.18)), top = cliffH(...ellP(a, 1.22)).h, w = rr(3, 6), h = top + rr(-1, 4) + 2, yaw = Math.atan2(BASIN.x - x, BASIN.z - z);
        tiers(back, x, z, yaw + rr(-0.2, 0.2), w, h, rr(4, 6), h > 18 ? 4 : h > 10 ? 3 : 2, 0.6);
      }
    }
    // боковые ниже: вдоль западного и восточного берега скалы пониже
    for (let a = 0.25; a < 2.85; a += rr(0.12, 0.2)) {
      const sn = Math.sin(a); if (sn > 0.55) continue;   // юг свободен (берег зрителя)
      const [x, z] = ellP(a, rr(1.05, 1.12)), H = cliffH(...ellP(a, 1.25)).h, w = rr(2.5, 4.5), h = H * rr(0.6, 1.0) + 2, yaw = Math.atan2(BASIN.x - x, BASIN.z - z);
      if (kept(x, z, 4)) continue;
      front.push(M4(x, -2 + h / 2, z, rr(-0.06, 0.06), yaw + rr(-0.3, 0.3), rr(-0.06, 0.06), w, h, rr(2.5, 4)));
    }
    mk(slab, M.cliff, front); mk(slab, M.cliff, back);
    // мох и папоротник на полках, свисающие лианы
    for (const [x, y, z, yaw] of ledges) { P.add(M.moss, MOSS_LITE, M4(x, y, z, 0, yaw, 0, rr(1.2, 2.2), rr(0.3, 0.6), rr(1, 1.8))); if (rnd() < 0.6) for (let k = 0; k < 3; k++) vine(P, V(x + rr(-1.5, 1.5), y, z + rr(-1.5, 1.5)), rr(2, 6), yaw, 0.1); }
  }

  // ---------- водопады ----------
  const mists = [];
  {
    FALLS.forEach((f, i) => {
      const top = f.lip.clone().addScaledVector(f.n, 0.4); top.y = f.lip.y - 0.35;
      const bot = f.bot.clone().addScaledVector(f.n, 0.9);
      // каскад: струя срывается с полки на полку (как на референсе), каждая следующая полка выдвинута к озеру
      // полки лежат на линии кромка → подножие (по склону скалы), чтобы струя не пряталась в рельеф
      const segs = []; let cur = top;
      f.ledge.forEach((fr, li) => {
        const mid = top.clone().lerp(bot, 1 - fr); mid.y = lerp(bot.y, top.y, fr);
        segs.push([cur, mid.clone().addScaledVector(f.n, 0.2).add(V(0, -0.3, 0))]);
        const shelfC = mid.clone().addScaledVector(f.n, -0.45), wv = f.w + 2.6 - li * 0.4, sh = Math.min(6, 1.4 + (mid.y - bot.y) * 0.5);
        box(P, M.cliff, wv, sh, 2.3, M4(shelfC.x, mid.y - sh / 2, shelfC.z, 0, Math.atan2(f.n.x, f.n.z), 0));
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(f.w + 0.6, 1.4, 6, 3), fallsMat(i * 7.1 + 3 + li, 0.35)); pool.rotation.set(-Math.PI / 2, 0, Math.atan2(f.n.x, f.n.z)); pool.position.set(mid.x + f.n.x * 0.1, mid.y + 0.03, mid.z + f.n.z * 0.1); scene.add(pool);
        mists.push(addMist(scene, V(mid.x + f.n.x * 1.0, mid.y + 0.4, mid.z + f.n.z * 1.0), f.w * 1.2, 1.8, '#7cb4c8', 0.12, i * 3 + li));
        for (let k = 0; k < 4; k++) { const q = shelfC.clone().addScaledVector(f.t, (k % 2 ? 1 : -1) * rr(f.w * 0.55, f.w * 0.5 + 1.2)); P.add(M.stone, LUMP[k % LUMP.length], M4(q.x, mid.y + 0.1, q.z, 0, rr(0, 6), 0, rr(0.7, 1.4), rr(0.4, 0.7), rr(0.7, 1.2))); }
        cur = mid.clone().addScaledVector(f.n, 0.75);
      });
      segs.push([cur, bot.clone().addScaledVector(f.n, 0.6)]);
      for (const [a, b] of segs) {
        const L = a.distanceTo(b), g = new THREE.PlaneGeometry(f.w, L, 4, Math.max(6, Math.round(L))), p = g.attributes.position;
        // струя чуть выпуклая и расширяется книзу
        for (let k = 0; k < p.count; k++) { const yy = p.getY(k) / L + 0.5; p.setX(k, p.getX(k) * (1 + (1 - yy) * 0.18)); p.setZ(k, Math.cos(p.getX(k) / f.w * 3.0) * 0.25 + (1 - yy) * 0.3); }
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, fallsMat(i * 7.1, 1.0));
        const up = a.clone().sub(b).normalize(), nn = f.n.clone(), xx = new THREE.Vector3().crossVectors(up, nn).normalize(); nn.crossVectors(xx, up).normalize();
        m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, up, nn)); m.position.copy(a).lerp(b, 0.5);
        scene.add(m);
      }
      // русло над кромкой
      { const g = new THREE.PlaneGeometry(f.w * 0.9, 13, 3, 8); const m = new THREE.Mesh(g, fallsMat(i * 3.3 + 1, 0.4)); m.rotation.set(-Math.PI / 2, 0, Math.atan2(-f.n.x, -f.n.z) + Math.PI); m.position.set(f.lip.x - f.n.x * 6.3, f.lip.y - 0.42, f.lip.z - f.n.z * 6.3); scene.add(m);
        for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { const p = f.lip.clone().addScaledVector(f.n, -k * 2.6 - 0.5).addScaledVector(f.t, sd * (f.w * 0.5 + rr(0.3, 0.9))); P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.6, 1.1), 0), M4(p.x, groundAt(p.x, p.z) + 0.1, p.z, rr(0, 3), rr(0, 3), 0, 1, 0.7, 1)); } }
      // подножие: пена, брызги, туман, голубой свет снизу
      const base = f.bot.clone().addScaledVector(f.n, 1.2);
      mists.push(addMist(scene, V(base.x, 0.9, base.z), f.w * 2.0, 3.0, '#7cb4c8', 0.16, i * 5 + 1));
      mists.push(addMist(scene, V(base.x + f.n.x * 2.5, 2.4, base.z + f.n.z * 2.5), f.w * 2.6, 4.5, '#4a7890', 0.1, i * 5 + 2));
      for (let k = 0; k < 6; k++) { const q = base.clone().addScaledVector(f.t, rr(-f.w * 0.6, f.w * 0.6)).addScaledVector(f.n, rr(-0.5, 1.5)); P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.4, 0.9), 0), M4(q.x, WATER_Y - 0.15, q.z, rr(0, 3), rr(0, 3), 0, 1, 0.55, 1)); }
      addLight(V(base.x + f.n.x * 1.5, 1.6, base.z + f.n.z * 1.5), CYAN, 6 + f.w * 0.6, 0.15, 1);
      halos.push({ p: V(base.x, 1.2, base.z), col: [0.4, 0.95, 1.0], s: f.w * 0.3 });
      anim.smoke.push({ falls: true, x: base.x, y: 0.2, z: base.z, w: f.w });
    });
  }

  // ---------- остров: валуны по склону, лестница, причал ----------
  {
    // каменные блоки (как на референсе): плоский верх, скошенные кромки, чуть кривые грани; швы сходятся (смещение — от координат)
    const rock = new THREE.BoxGeometry(1.5, 0.9, 1.25, 2, 1, 2); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 0.5; const top = y > 0; p.setXYZ(i, x * (top ? 0.88 : 1.0) + h * 0.07, y + (top ? h * 0.06 : 0), z * (top ? 0.86 : 1.0) + h * 0.06); } rock.computeVertexNormals(); boxUV(rock, 1.5, 0.9, 1.25); }
    const boulders = [];
    for (let ring = 0; ring < 3; ring++) {
      const n = [46, 40, 30][ring];
      for (let k = 0; k < n; k++) {
        const a = k / n * 6.283 + rr(-0.05, 0.05) + ring * 0.3, rt = rTop(a), d = rt + [0.5, 2.6, 4.8][ring] + rr(-0.3, 0.3);
        const x = ISLE.x + Math.cos(a) * d, z = ISLE.z + Math.sin(a) * d;
        const [s, l] = stairLocal(x, z);
        if (s > -1.2 && s < ST_LEN + LANDING.len + 0.8 && Math.abs(l) < ST_W / 2 + 0.5) continue;
        const sc = [rr(0.6, 1.1), rr(1.0, 1.8), rr(0.9, 1.6)][ring];
        boulders.push(M4(x, footY(x, z, sc * 0.6, 'валун') + sc * 0.2, z, rr(-0.1, 0.1), -a + rr(-0.3, 0.3), rr(-0.1, 0.1), sc * rr(0.9, 1.3), sc * rr(0.8, 1.1), sc * rr(0.9, 1.2)));

      }
    }
    // борта лестницы: каменные глыбы вдоль, по ним мох; ступени — плиты с выщербленным краем
    for (let j = 0; j < ST_N; j++) {
      const s0 = j * ST_RUN, sc = s0 + ST_RUN / 2, yTop = stepTop(sc);
      const cx = ST_TOP[0] + SD[0] * sc, cz = ST_TOP[1] + SD[1] * sc;
      { const sp = rr(-0.25, 0.25); for (const hs of [-1, 1]) { const w2 = ST_W / 2 + hs * sp + 0.18; lumpStone(P, M.step, cx + SP[0] * (hs * (ST_W / 2 - w2 / 2 + 0.05)), yTop - 0.36, cz + SP[1] * (hs * (ST_W / 2 - w2 / 2 + 0.05)), w2, 0.74, ST_RUN + 0.16, STAIR_YAW + rr(-0.06, 0.06), j * 2 + (hs > 0 ? 1 : 0)); } }
      if (rnd() < 0.5) P.add(M.moss, MOSS_LITE, M4(cx + SP[0] * rr(-1, 1), yTop + 0.01, cz + SP[1] * rr(-1, 1), 0, rr(0, 6), 0, rr(0.2, 0.4), 0.08, rr(0.15, 0.3)));
      for (const sd of [-1, 1]) if (j % 2 === 0) { const x = cx + SP[0] * sd * (ST_W / 2 + 0.55), z = cz + SP[1] * sd * (ST_W / 2 + 0.55); boulders.push(M4(x, yTop - 0.1, z, rr(-0.2, 0.2), rr(0, 6), rr(-0.2, 0.2), rr(0.6, 0.85), rr(0.7, 1.0), rr(0.7, 0.9))); }
    }
    walks.push({ a: [ST_TOP[0] + SD[0] * (ST_LEN + 0.15), ST_TOP[1] + SD[1] * (ST_LEN + 0.15)], b: [ST_TOP[0] - SD[0] * 0.1, ST_TOP[1] - SD[1] * 0.1], w: ST_W * 0.95, ya: 0.1, yb: PLAT_Y, y: PLAT_Y, ramp: true });
    // причальная плита на камнях, у неё сваи с канатом и зелёные фонари
    { const cx = LANDING.x, cz = LANDING.z;
      for (let k = 0; k < 3; k++) for (const hs of [-1, 1]) lumpStone(P, M.step, cx + SD[0] * (k - 1) * 0.85 + SP[0] * hs * 0.85, LANDING.y - 0.27, cz + SD[1] * (k - 1) * 0.85 + SP[1] * hs * 0.85, rr(1.75, 1.95), 0.56, rr(0.95, 1.1), STAIR_YAW + rr(-0.12, 0.12), k * 2 + hs + 2);
      for (const sd of [-1, 1]) for (const fw of [-1, 1]) { const x = cx + SP[0] * sd * 1.5 + SD[0] * fw * 1.0, z = cz + SP[1] * sd * 1.5 + SD[1] * fw * 1.0; boulders.push(M4(x, groundAt(x, z) + 0.2, z, rr(0, 1), rr(0, 6), 0, 0.9, 0.8, 0.9)); }
      walks.push({ a: [cx - SD[0] * 1.2, cz - SD[1] * 1.2], b: [cx + SD[0] * 1.2, cz + SD[1] * 1.2], w: ST_W + 0.8, y: LANDING.y });
      // мостик с южного берега к причальной плите: сваи парами, прогоны, кривые плахи, перила-канат на столбиках
      { const fx = SHORE[0] - cx, fz = SHORE[1] - cz, fl = Math.hypot(fx, fz), ux = fx / fl, uz = fz / fl, px = uz, pz = -ux, yaw = Math.atan2(ux, uz);
        let t1 = 4; while (t1 < fl && groundAt(cx + ux * t1, cz + uz * t1) < 0.3) t1 += 0.25;
        const t0 = 1.15, BW = 1.7, DY = 0.42;
        // мост старый: середина осела под воду (идти по щиколотку), там сваи завалены и обломаны, настил дырявый, перила оборваны
        const base = (t) => (t < t0 + 1.6 ? lerp(LANDING.y + 0.02, DY, ss(t0, t0 + 1.6, t)) : t > t1 - 1.2 ? lerp(DY, Math.max(DY, groundAt(cx + ux * t1, cz + uz * t1) + 0.04), ss(t1 - 1.2, t1, t)) : DY - 0.06 * Math.sin(Math.PI * (t - t0) / (t1 - t0)));
        const tm = lerp(t0, t1, 0.55), SY = WATER_Y - 0.24, sunk = (t) => ss(tm - 3.0, tm - 1.1, t) * ss(tm + 3.2, tm + 1.3, t);
        const deckY = (t) => lerp(base(t), SY, sunk(t)), roll = (t) => 0.14 * sunk(t);
        const at = (t, l, y) => V(cx + ux * t + px * l, y + l * Math.sin(roll(t)), cz + uz * t + pz * l);
        // сваи и ригели
        const piles = []; for (let t = t0 + 0.9; t < t1 - 0.4; t += rr(1.6, 2.0)) piles.push(t);
        piles.forEach((t, i) => { const sk = sunk(t); for (const sd of [-1, 1]) { const q = at(t, sd * (BW / 2 + 0.05), 0), gy = groundAt(q.x, q.z), tall = (sd > 0 && i % 3 === 1) || (sd < 0 && i % 2 === 0), broken = sk > 0.3 && rnd() < 0.6;
            const top = broken ? WATER_Y + rr(0.15, 0.55) : deckY(t) - 0.1 + (tall ? 1.05 : 0), tilt = V(rr(-1, 1), 0, rr(-1, 1)).multiplyScalar(0.015 + sk * 0.35);
            const tp = V(q.x + tilt.x * (top - gy), top, q.z + tilt.z * (top - gy));
            swell(P, M.post, V(q.x, gy - 0.5, q.z), tp, 0.11, 0.7, 6);
            if (broken) for (let j = 0; j < 4; j++) P.add(M.post, new THREE.ConeGeometry(0.035, rr(0.12, 0.3), 4), M4(tp.x + rr(-0.06, 0.06), tp.y + 0.08, tp.z + rr(-0.06, 0.06), rr(-0.3, 0.3), 0, rr(-0.3, 0.3)));   // щепа
            else if (tall) { P.add(M.post, new THREE.ConeGeometry(0.11, 0.18, 6), M4(tp.x, tp.y + 0.09, tp.z)); lashing(P, q.x + tilt.x * 0.8, deckY(t) + 0.35, q.z + tilt.z * 0.8, 0.11); }
            if (gy < WATER_Y) { const qz = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), V(px * sd, 0, pz * sd)); P.add(M.mossPad, PATCH, new THREE.Matrix4().compose(V(q.x + px * sd * 0.1, WATER_Y + 0.05, q.z + pz * sd * 0.1), qz, V(0.35, 0.25, 1))); }   // тина по ватерлинии
          }
          if (!(sk > 0.5 && i % 2)) beam(P, M.woodDark, at(t, -BW / 2 - 0.15, deckY(t) - 0.2), at(t, BW / 2 + 0.15, deckY(t) - 0.2), 0.08, 4, true); });
        for (const sd of [-1, 1]) for (let k = 0; k < 12; k++) { const ta = lerp(t0, t1, k / 12), tb = lerp(t0, t1, (k + 1) / 12); if (sd > 0 && k === 6) continue; beam(P, M.woodDark, at(ta, sd * BW * 0.38, deckY(ta) - 0.12), at(tb, sd * BW * 0.38, deckY(tb) - 0.12), 0.08, 4, true); }
        // плахи: покороблены, в просевшей части часто выбиты, местами обломок торчит вверх
        for (let t = t0 + 0.1; t < t1; t += 0.3) { const sk = sunk(t); if (rnd() < 0.06 + sk * 0.45 || (t > tm + 0.4 && t < tm + 1.3)) { if (rnd() < 0.3) { const q = at(t, rr(-0.5, 0.5), deckY(t) + 0.05); box(P, M.plankOld, BW * rr(0.35, 0.6), 0.06, 0.25, M4(q.x, q.y + 0.12, q.z, rr(-0.6, 0.6), yaw + rr(-0.4, 0.4), rr(-0.5, 0.5))); } continue; }
          const half = rnd() < 0.15 + sk * 0.3, wv = half ? BW * rr(0.45, 0.7) : BW * rr(0.9, 1.08), off = half ? (rnd() < 0.5 ? -1 : 1) * (BW - wv) / 2 : rr(-0.06, 0.06);
          const q = at(t, off, deckY(t) - 0.03); box(P, rnd() < 0.3 ? M.woodDark : M.plank, wv, 0.07, rr(0.24, 0.28), M4(q.x, q.y, q.z, rr(-0.04, 0.04), yaw + rr(-0.08, 0.08), roll(t) + rr(-0.05, 0.05))); }
        // перила: канат цел только там, где мост держится; на просевшей части обрывки свисают в воду
        for (const sd of [-1, 1]) { const tall = piles.filter((t, i) => (sd > 0 ? i % 3 === 1 : i % 2 === 0)); for (let i = 0; i + 1 < tall.length; i++) { const ta = tall[i], tb = tall[i + 1]; if (sunk(ta) < 0.3 && sunk(tb) < 0.3) rope(P, at(ta, sd * (BW / 2 + 0.05), deckY(ta) + 0.85), at(tb, sd * (BW / 2 + 0.05), deckY(tb) + 0.85), 0.25); else if (sunk(ta) < 0.3) { const a2 = at(ta, sd * (BW / 2 + 0.05), deckY(ta) + 0.85); rope(P, a2, a2.clone().add(V(ux * 0.7, -1.0, uz * 0.7)).setY(WATER_Y - 0.05), 0.1); } } }
        // по одному фонарю: на средней высокой свае слева
        { const tall = piles.filter((t, i) => i % 2 === 0 && sunk(t) < 0.05), t = tall[tall.length - 1], q = at(t, -(BW / 2 + 0.05), deckY(t) + 0.95);
          beam(P, M.iron, q, q.clone().add(V(-px * 0.4, 0, -pz * 0.4)), 0.015, 4); const hp = q.clone().add(V(-px * 0.4, 0, -pz * 0.4)); chain(P, hp, 0.15);
          const lp = lamp(P, PG, hp.x, hp.y - 0.65, hp.z, 0.9, M.lampGreen); addLight(lp.clone(), GREEN, 4.5, 0.35); halos.push({ p: lp, col: [0.4, 0.95, 0.8], s: 0.45 }); }
        // ходьба: пандус с плиты, настил кусками (прогиб), сход на берег
        const NSEG = 10; for (let k = 0; k < NSEG; k++) { const ta = lerp(t0 - 0.1, t1 + 0.3, k / NSEG), tb = lerp(t0 - 0.1, t1 + 0.3, (k + 1) / NSEG); walks.push({ a: [cx + ux * ta, cz + uz * ta], b: [cx + ux * tb, cz + uz * tb], w: BW - 0.1, ya: deckY(ta), yb: deckY(tb), y: Math.max(deckY(ta), deckY(tb)), ramp: true }); }
        // обломки моста и старых мостков в воде: плавают, торчат из ила, связка с канатом
        for (let k = 0; k < 34; k++) {
          const nearB = k < 16, x = nearB ? cx + ux * rr(t0, t1) + px * rr(-6, 6) : rr(-26, 26), z = nearB ? cz + uz * rr(t0, t1) + pz * rr(-6, 6) : rr(-20, 20), gy = groundAt(x, z);
          if (gy > WATER_Y - 0.12 || Math.abs((x - cx) * px + (z - cz) * pz) < BW / 2 + 0.4 && ((x - cx) * ux + (z - cz) * uz) > t0 - 1 && ((x - cx) * ux + (z - cz) * uz) < t1 + 1 || kept(x, z, 2)) continue;
          const len = rr(0.8, 2.2), yw = rr(0, 6.28);
          if (rnd() < 0.65) box(P, rnd() < 0.5 ? M.plankOld : M.woodDark, 0.26, 0.06, len, M4(x, WATER_Y + 0.0, z, rr(-0.06, 0.06), yw, rr(-0.08, 0.08)));
          else box(P, M.plankOld, 0.26, 0.06, len, M4(x, WATER_Y + len * 0.2, z, rr(0.5, 0.9), yw, rr(-0.2, 0.2)));   // торчит из ила
          if (rnd() < 0.25) rope(P, V(x, WATER_Y + 0.04, z), V(x + Math.sin(yw + 1) * 0.8, WATER_Y - 0.05, z + Math.cos(yw + 1) * 0.8), 0.05);
        }
        anim.bridge = { a: [cx + ux * t0, cz + uz * t0], b: [cx + ux * t1, cz + uz * t1], w: BW };
      }
      for (const sd of [-1, 1]) {
        const x = cx + SP[0] * sd * 1.75 + SD[0] * 1.15, z = cz + SP[1] * sd * 1.75 + SD[1] * 1.15, top = 1.7;
        beam(P, M.post, V(x, groundAt(x, z) - 0.3, z), V(x + rr(-0.05, 0.05), top, z), 0.13, 7);
        lashing(P, x, 0.55, z, 0.13); lashing(P, x, 1.15, z, 0.13);
        beam(P, M.iron, V(x, top - 0.25, z), V(x + SD[0] * 0.45, top - 0.25, z + SD[1] * 0.45), 0.018, 4);
        if (sd > 0) { const lp = lamp(P, PG, x + SD[0] * 0.42, top - 0.67, z + SD[1] * 0.42, 1.1, M.lampGreen);
          beam(P, M.iron, V(lp.x, top - 0.25, lp.z), V(lp.x, lp.y + 0.45, lp.z), 0.01, 4);
          addLight(V(lp.x, lp.y, lp.z), GREEN, 4.5, 0.35); halos.push({ p: lp, col: [0.4, 1.0, 0.7], s: 0.45 }); }
      }
      rope(P, V(cx + SP[0] * 1.75 + SD[0] * 1.15, 0.55, cz + SP[1] * 1.75 + SD[1] * 1.15), V(cx - SP[0] * 1.75 + SD[0] * 1.15, 0.55, cz - SP[1] * 1.75 + SD[1] * 1.15), 0.35);
    }
    LUMP.forEach((g, i) => mk(g, M.stone, boulders.filter((_, j) => j % LUMP.length === i).map((m) => m.multiply(new THREE.Matrix4().makeScale(1.6, 1.0, 1.4)))));
    // мох по кромке площадки и на валунах
    for (let k = 0; k < 34; k++) { const a = rr(0, 6.28), d = rTop(a) + rr(-0.6, 0.6), x = ISLE.x + Math.cos(a) * d, z = ISLE.z + Math.sin(a) * d; const [s, l] = stairLocal(x, z); if (Math.abs(l) < ST_W / 2 + 0.3 && s > -0.8 && s < ST_LEN) continue; P.add(M.mossDark, MOSS_LITE, M4(x, groundAt(x, z) + 0.02, z, 0, rr(0, 6), 0, rr(0.4, 0.8), rr(0.1, 0.2), rr(0.35, 0.7))); if (rnd() < 0.3) mossStrand(P, x, groundAt(x, z) + 0.05, z, rr(0.6, 1.6), 0.4, a + Math.PI / 2); }
  }

  // ---------- терем Водяного (по референсу): кривой круглый сруб из стоячих брёвен с поясами, купол соломы
  // с рваной бахромой, вход — двускатный шалашик на резных столбах с личинами, окно с решёткой, стяги на цепях,
  // на макушке череп и скрещённые остроги с колоколом и фонарём. Весь дом чуть завален и закручен кверху.
  const rot = FACE, cs = Math.cos(rot), sn = Math.sin(rot);
  const L = (lx, lz) => [ISLE.x + lx * cs + lz * sn, ISLE.z - lx * sn + lz * cs];
  const LV = (lx, y, lz) => { const [x, z] = L(lx, lz); return V(x, y, z); };
  const LP = (phi, r, y) => LV(Math.sin(phi) * r, y, Math.cos(phi) * r);
  const P0 = P, PG0 = PG;
  {
    const P = new Pack(), PG = new Pack();
    const n0 = { halos: halos.length, drips: drips.length, perches: perches.length, leafSrc: leafSrc.length };
    const NS = 12, cph = (k) => -Math.PI / NS + k * 2 * Math.PI / NS;
    const CL = Array.from({ length: NS }, (_, k) => { const ph = cph(k), r = HRAD(ph); return [Math.sin(ph) * r, Math.cos(ph) * r]; });
    // цоколь: каменные блоки по граням, пол
    for (let k = 0; k < NS; k++) {
      const [ax, az] = CL[k], [bx, bz] = CL[(k + 1) % NS], mx = (ax + bx) / 2, mz = (az + bz) / 2, len = Math.hypot(bx - ax, bz - az), ox = mx / Math.hypot(mx, mz), oz = mz / Math.hypot(mx, mz);
      const p = LV(mx + ox * 0.12, 0, mz + oz * 0.12), yaw = rot + Math.atan2(bx - ax, bz - az) + Math.PI / 2;
      // цоколь из кривых глыб: 2–3 на грань, верх неровно у пола, низ врос в площадку
      const nj = len > 2.9 ? 3 : 2;
      for (let j = 0; j < nj; j++) { const u = (j + 0.5) / nj - 0.5, hh = FLOOR_Y - PLAT_Y + 0.55 + rr(-0.05, 0.12); const q = LV(mx + ox * rr(0.1, 0.22) + (bx - ax) * u, 0, mz + oz * rr(0.1, 0.22) + (bz - az) * u); lumpStone(P, M.step, q.x, PLAT_Y - 0.5 + hh / 2, q.z, len / nj + 0.35, hh, rr(0.95, 1.25), yaw + rr(-0.15, 0.15), k * 3 + j); }
    }
    P.add(M.plank, new THREE.CylinderGeometry(RC + 0.15, RC + 0.15, 0.12, NS), M4(ISLE.x, FLOOR_Y - 0.05, ISLE.z, 0, rot + Math.PI / NS, 0));
    // проёмы по граням: [u0, u1, h0, h1] от середины грани
    const opens = { 0: [[-DOOR_W / 2 - 0.12, DOOR_W / 2 + 0.12, 0, DOOR_H + 0.15]], 1: [[-0.62, 0.62, 1.15, 2.4]], 11: [[-0.42, 0.42, 1.3, 2.15]], 3: [[-0.35, 0.35, 1.4, 2.1]], 9: [[-0.35, 0.35, 1.4, 2.1]], 6: [[-0.35, 0.35, 1.4, 2.1]] };
    for (let k = 0; k < NS; k++) {
      const [ax, az] = CL[k], [bx, bz] = CL[(k + 1) % NS], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      const n = Math.max(3, Math.round(len / 0.33));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n * len - len / 2, lx = (ax + bx) / 2 + ux * u, lz = (az + bz) / 2 + uz * u;
        const top = WALL_H + rr(-0.12, 0.22) + Math.sin(i * 1.7 + k) * 0.08;
        let spans = [[-0.05, top]];
        for (const [u0, u1, h0, h1] of opens[k] || []) if (u > u0 - 0.1 && u < u1 + 0.1) spans = spans.flatMap(([a, b]) => [[a, Math.min(b, h0)], [Math.max(a, h1), b]].filter(([c, d]) => d - c > 0.15));
        for (const [a, b] of spans) swell(P, M.log, LV(lx, FLOOR_Y + a, lz), LV(lx + rr(-0.06, 0.06), FLOOR_Y + b, lz + rr(-0.06, 0.06)), 0.16 * rr(0.85, 1.1), b - a > 1.5 ? 1 : 0.5, 7);
      }
      // пояса из колотых плах снаружи; над дверью и под окнами — свои
      const o = 0.2, ox = ((ax + bx) / 2) / Math.hypot((ax + bx) / 2, (az + bz) / 2) * o, oz = ((az + bz) / 2) / Math.hypot((ax + bx) / 2, (az + bz) / 2) * o;
      for (const hy of [0.3, 2.75, WALL_H - 0.2]) {
        if (k === 0 && hy < DOOR_H + 0.2) continue;
        beam(P, M.post, LV(ax + ox - ux * 0.15, FLOOR_Y + hy + rr(-0.04, 0.04), az + oz - uz * 0.15), LV(bx + ox + ux * 0.15, FLOOR_Y + hy + rr(-0.04, 0.04), bz + oz + uz * 0.15), 0.11, 4, true);
      }
      if (k % 2 === 0) { const p = LV(ax * 1.04, 0, az * 1.04); swell(P, M.post, V(p.x, FLOOR_Y - 0.15, p.z), V(p.x + rr(-0.08, 0.08), FLOOR_Y + WALL_H + 0.15, p.z + rr(-0.08, 0.08)), 0.22, 1.4, 7); }
    }
    P.add(M.dark, new THREE.CylinderGeometry(RC - 0.2, RC - 0.2, 0.1, NS), M4(ISLE.x, FLOOR_Y + WALL_H - 0.3, ISLE.z, 0, rot + Math.PI / NS, 0));
    // внутри: тусклый красный свет только там, где окна
    for (let k = 0; k < NS; k++) { const ph = k * 2 * Math.PI / NS, p = LP(ph, APO(k) - 0.35, FLOOR_Y + 1.9); PG.add(opens[k] && k !== 0 ? M.inRed : M.dark, new THREE.PlaneGeometry(2.8, 3.8), M4(p.x, p.y, p.z, 0, rot + ph + Math.PI, 0)); }
    // окна: большое справа от входа (решётка 2×3, наличник, полочка с горшками), малые по кругу
    for (const [k, w, h0, h1, big] of [[1, 1.2, 1.15, 2.4, 1], [11, 0.8, 1.3, 2.15, 0], [3, 0.65, 1.4, 2.1, 0], [9, 0.65, 1.4, 2.1, 0], [6, 0.65, 1.4, 2.1, 0]]) {
      const ph = k * 2 * Math.PI / NS, p = LP(ph, APO(k) + 0.05, FLOOR_Y + (h0 + h1) / 2), wy = rot + ph, h = h1 - h0;
      PG.add(M.winRed, new THREE.PlaneGeometry(w, h), M4(p.x - Math.sin(wy) * 0.06, p.y, p.z - Math.cos(wy) * 0.06, 0, wy, 0));
      const F = (sx, sy, sz, lx2, ly2, lz2) => box(P, M.post, sx, sy, sz, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationY(wy)).multiply(M4(lx2, ly2, lz2)));
      F(w + 0.36, 0.14, 0.3, 0, -h / 2 - 0.07, 0.08); F(w + 0.46, 0.16, 0.32, 0, h / 2 + 0.08, 0.08); F(0.14, h + 0.3, 0.26, -w / 2 - 0.07, 0, 0.06); F(0.14, h + 0.3, 0.26, w / 2 + 0.07, 0, 0.06);
      for (let i = 1; i < (big ? 3 : 2); i++) F(0.045, h, 0.05, -w / 2 + i * w / (big ? 3 : 2), 0, 0.02);
      for (let i = 1; i < (big ? 3 : 2); i++) F(w, 0.045, 0.05, 0, -h / 2 + i * h / (big ? 3 : 2), 0.02);
      if (big) { F(w + 0.6, 0.07, 0.45, 0, -h / 2 - 0.3, 0.25); for (const sx of [-1, 1]) F(0.06, 0.3, 0.06, sx * (w / 2 + 0.15), -h / 2 - 0.45, 0.4);
        for (let j = 0; j < 3; j++) { const q = new THREE.Vector3(-w / 2 + 0.2 + j * (w - 0.4) / 2, -h / 2 - 0.26, 0.28).applyAxisAngle(V(0, 1, 0), wy).add(p); P.add(paint({ base: '#6a4a34', strokeAmt: 0.12, rim: 1.0 }), new THREE.LatheGeometry([[0, 0], [0.08, 0.01], [0.1, 0.09], [0.06, 0.17], [0.07, 0.2]].map(([r, y]) => new THREE.Vector2(r, y)), 8), M4(q.x, q.y, q.z)); }
        // ракушки-обереги над окном
        for (let j = 0; j < 3; j++) { const q = new THREE.Vector3(-0.35 + j * 0.35, h / 2 + 0.3, 0.17).applyAxisAngle(V(0, 1, 0), wy).add(p); onSurface(P, M.shell, SHELL, q, V(Math.sin(wy), 0, Math.cos(wy)), Math.PI, 0.22); } }
      // ставни: две створки из покоробленных досок на кованых петлях, распахнуты неровно; у малых окон одна повисла на нижней петле
      { const WM = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(new THREE.Matrix4().makeRotationY(wy));
        for (const sx of [-1, 1]) {
          const lw = w / 2 + 0.12, sag = !big && sx > 0 && k % 2 ? 0.28 : rr(-0.04, 0.04), open = sx * (big ? rr(1.25, 1.45) : rr(0.9, 1.5));
          const H = WM.clone().multiply(M4(sx * (w / 2 + 0.16), 0, 0.16)).multiply(new THREE.Matrix4().makeRotationY(open)).multiply(new THREE.Matrix4().makeRotationZ(sx * sag));
          const nb = 3; for (let i = 0; i < nb; i++) box(P, i % 2 ? M.woodDark : M.post, lw / nb - 0.015, h + 0.28 - (i === nb - 1 ? rr(0, 0.12) : 0), 0.05, H.clone().multiply(M4(sx * (lw / nb) * (i + 0.5), rr(-0.03, 0.03), rr(-0.015, 0.015), 0, rr(-0.06, 0.06), rr(-0.03, 0.03))));
          for (const hy of [-h / 2 + 0.12, h / 2 - 0.12]) box(P, M.iron, lw, 0.05, 0.02, H.clone().multiply(M4(sx * lw / 2, hy, 0.035)));
          box(P, M.woodDark, 0.05, h * 0.9, 0.04, H.clone().multiply(M4(sx * lw * 0.5, 0, 0.03, 0, 0, sx * Math.atan2(lw * 0.8, h * 0.9))));   // раскос
        }
        if (big) for (let j = 0; j < 2; j++) { const q = new THREE.Vector3(-w / 2 + 0.05 + j * (w + 0.1), h / 2 + 0.3, 0.2).applyAxisAngle(V(0, 1, 0), wy).add(p); bigSkull(P, PG, q.x, q.y, q.z, 0.17, wy + rr(-0.4, 0.4), 0.3); }
      }
      halos.push({ p: p.clone().add(V(Math.sin(wy) * 0.1, 0, Math.cos(wy) * 0.1)), col: [1.0, 0.35, 0.18], s: big ? 0.7 : 0.4 });
    }
    // подпорки-костыли: кривые жерди с развилкой упираются в пояс стены, пята на камне (дом осел и его подпирают)
    for (const k of [2, 4, 8, 10]) {
      const ph = k * 2 * Math.PI / NS + rr(-0.12, 0.12), top = LP(ph, APO(k) + 0.32, FLOOR_Y + 2.75 + rr(-0.1, 0.2)), foot = LP(ph + rr(-0.1, 0.1), APO(k) + 2.0, 0); foot.y = groundAt(foot.x, foot.z) - 0.1;
      swell(P, M.post, foot, top, 0.11, 1.2, 6);
      const d = top.clone().sub(foot).normalize(), sd = V(-d.z, 0, d.x).normalize();
      for (const o of [-1, 1]) tube(P, M.post, [top.clone().addScaledVector(d, -0.25), top.clone().addScaledVector(sd, o * 0.16).add(V(0, 0.18, 0))], 0.05, 5, 3);
      lashing(P, top.x - d.x * 0.3, top.y - d.y * 0.3, top.z - d.z * 0.3, 0.12);
      lumpStone(P, M.stone, foot.x, foot.y + 0.05, foot.z, 0.55, 0.35, 0.5, rr(0, 6), k);
    }
    // дверь: резные косяки, притолока с рунами, порог; полотно на петлях с золотым оберегом
    { const dz = AP0;
      for (const sd of [-1, 1]) { box(P, M.post, 0.26, DOOR_H + 0.35, 0.42, M4(...L(sd * (DOOR_W / 2 + 0.13), dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + (DOOR_H + 0.35) / 2])), 0, rot, 0)); for (let j = 0; j < 4; j++) box(P, M.woodDark, 0.32, 0.08, 0.46, M4(...L(sd * (DOOR_W / 2 + 0.13), dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + 0.5 + j * 0.85])), 0, rot, 0)); }
      box(P, M.post, DOOR_W + 0.7, 0.3, 0.5, M4(...L(0, dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + DOOR_H + 0.15])), 0, rot, 0));
      for (let k = 0; k < 5; k++) PG.add(M.rune, new THREE.PlaneGeometry(0.08, 0.13), M4(...L(-0.8 + k * 0.4, dz + 0.26).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + DOOR_H + 0.15])), 0, rot, 0));
      box(P, M.step, DOOR_W + 0.5, 0.1, 0.7, M4(...L(0, dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + 0.02])), 0, rot, 0));
      const hinge = LV(-DOOR_W / 2, FLOOR_Y + 0.04, dz - 0.05);
      const DP = new Pack(), DG = new Pack();
      for (let k = 0; k < 6; k++) box(DP, k % 2 ? M.woodDark : M.post, DOOR_W / 6 - 0.01, DOOR_H - 0.06 - (k % 3) * 0.03, 0.12, M4(DOOR_W / 12 + k * DOOR_W / 6, DOOR_H / 2 - (k % 3) * 0.015, 0));
      for (const hy of [0.45, 1.3, 2.85]) { box(DP, M.iron, DOOR_W - 0.1, 0.09, 0.03, M4(DOOR_W / 2, hy, 0.075)); for (let k = 0; k < 6; k++) DP.add(M.iron, new THREE.SphereGeometry(0.025, 5, 3), M4(0.12 + k * (DOOR_W - 0.24) / 5, hy, 0.095)); }
      // оберег: золотое солнце с лучами-волнами и ликом посередине (как на референсе)
      const AY = 2.1;
      DG.add(M.amulet, new THREE.TorusGeometry(0.42, 0.04, 6, 30), M4(DOOR_W / 2, AY, 0.11));
      DG.add(M.amulet, new THREE.TorusGeometry(0.25, 0.03, 6, 24), M4(DOOR_W / 2, AY, 0.11));
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; DG.add(M.amulet, new THREE.ConeGeometry(0.045, 0.2 + (k % 2) * 0.08, 4), M4(DOOR_W / 2 + Math.cos(a) * (0.55 + (k % 2) * 0.04), AY + Math.sin(a) * (0.55 + (k % 2) * 0.04), 0.11, 0, 0, a - Math.PI / 2)); }
      DG.add(M.amulet, new THREE.CircleGeometry(0.13, 14), M4(DOOR_W / 2, AY, 0.12));
      DP.add(M.dark, new THREE.SphereGeometry(0.03, 5, 4), M4(DOOR_W / 2 - 0.05, AY + 0.03, 0.14)); DP.add(M.dark, new THREE.SphereGeometry(0.03, 5, 4), M4(DOOR_W / 2 + 0.05, AY + 0.03, 0.14));
      DP.add(M.iron, new THREE.TorusGeometry(0.1, 0.018, 5, 12), M4(DOOR_W - 0.25, 1.3, 0.1));
      const g = new THREE.Group(); g.add(DP.build(true, true), DG.build(false, false)); g.position.copy(hinge); g.rotation.y = rot; scene.add(g);
      anim.door = { g, rot, x: L(0, GATE.front + 0.6)[0], z: L(0, GATE.front + 0.6)[1], ix: L(0, dz - 1.4)[0], iz: L(0, dz - 1.4)[1], yaw: rot };
      halos.push({ p: LV(0, FLOOR_Y + AY, dz + 0.25), col: [1.0, 0.75, 0.35], s: 0.5 });
      addLight(LV(0, FLOOR_Y + 2.2, dz + 1.0), GOLD, 3.2, 0.2, 1);
    }
    // вход-шалашик: каменная площадка, два резных столба с личинами, двускатная соломенная кровля, фронтон, крест причелин
    {
      const z0 = AP0 + 0.15, z1 = GATE.front - 0.15, hw = GATE.half - 0.1;
      const [bx, bz] = L(0, (z0 + z1) / 2);
      // площадка входа: четыре кривые плиты, верх у пола, швы с мхом
      for (const hx of [-1, 1]) for (const hz of [0, 1]) { const q = LV(hx * hw / 2, 0, lerp(z0, z1, 0.25 + hz * 0.5)); lumpStone(P, M.step, q.x, FLOOR_Y - 0.5, q.z, hw + 0.25, 1.0, (z1 - z0) / 2 + 0.3, rot + rr(-0.08, 0.08), hx + hz * 2 + 7); }
      for (let k = 0; k < 4; k++) { const q = LV(rr(-hw, hw), FLOOR_Y + 0.01, lerp(z0, z1, rr(0.1, 0.9))); P.add(M.mossDark, MOSS_LITE, M4(q.x, q.y, q.z, 0, rr(0, 6), 0, rr(0.2, 0.4), 0.06, rr(0.15, 0.3))); }
      walks.push({ a: L(0, z0), b: L(0, z1), w: hw * 2, y: FLOOR_Y + 0.02 });
      for (let k = 0; k < 2; k++) for (const hx of [-1, 1]) { const q = LV(hx * rr(0.55, 0.7), 0, z1 + 0.27 + k * 0.4); lumpStone(P, M.step, q.x, FLOOR_Y - 0.17 - k * 0.2 - 0.3, q.z, rr(1.3, 1.55) - k * 0.1, 0.6, 0.5, rot + rr(-0.12, 0.12), k * 2 + hx + 12); }
      walks.push({ a: L(0, z1), b: L(0, z1 + 1.0), w: 2.4, ya: FLOOR_Y, yb: PLAT_Y, y: FLOOR_Y, ramp: true });
      const roofY = (ax) => GATE.ridge - Math.abs(ax) * (GATE.ridge - GATE.eave) / GATE.half;
      const POSTX = GATE.half - 0.32, POSTZ = GATE.front - 0.4;
      for (const sd of [-1, 1]) {
        const lx = sd * POSTX, p = LV(lx, 0, POSTZ), topY = roofY(lx) - 0.2;
        swell(P, M.post, V(p.x, FLOOR_Y - 0.2, p.z), V(p.x + rr(-0.05, 0.05), topY, p.z), 0.18, 1.5, 8);
        for (const hy of [0.2, 1.1, 2.9]) P.add(M.woodDark, new THREE.CylinderGeometry(0.22, 0.22, 0.12, 6), M4(p.x, FLOOR_Y + hy, p.z));
        // личина: левый — костяная маска с красной тряпицей, правый — резной лик с глазами
        const fp = LV(lx, FLOOR_Y + 2.1, POSTZ + 0.2);
        if (sd < 0) { fishSkull(P, PG, fp.x, fp.y, fp.z, 0.55, rot, false); cloth(P, clothRed, fp.x, fp.y - 0.25, fp.z, 0.3, 0.7, rot); }
        else { box(P, M.woodDark, 0.4, 0.55, 0.12, M4(fp.x, fp.y, fp.z, 0, rot, 0)); for (const ex of [-0.1, 0.1]) PG.add(M.eye, new THREE.SphereGeometry(0.035, 6, 4), M4(fp.x + cs * ex + sn * 0.07, fp.y + 0.07, fp.z - sn * ex + cs * 0.07)); box(P, M.dark, 0.18, 0.05, 0.03, M4(fp.x + sn * 0.07, fp.y - 0.12, fp.z + cs * 0.07, 0, rot, 0)); P.add(M.bone, new THREE.ConeGeometry(0.05, 0.3, 5), M4(fp.x, fp.y + 0.42, fp.z, 0, 0, sd * 0.4)); P.add(M.bone, new THREE.ConeGeometry(0.05, 0.3, 5), M4(fp.x, fp.y + 0.42, fp.z, 0, 0, -sd * 0.4)); }
        beam(P, M.post, LV(lx, topY + 0.06, AP0 - 0.1), LV(lx, topY + 0.06, GATE.front), 0.1, 4, true);
        beam(P, M.woodDark, LV(lx, topY - 0.8, POSTZ), LV(lx, topY - 0.02, POSTZ - 0.85), 0.06, 4, true);
      }
      const tieY = roofY(POSTX) - 0.08;
      beam(P, M.post, LV(-GATE.half + 0.15, tieY, POSTZ), LV(GATE.half - 0.15, tieY, POSTZ), 0.1, 4, true);
      const half = GATE.half + 0.3, drop = (GATE.ridge - GATE.eave) / GATE.half, slope = Math.hypot(half, half * drop), ang = Math.atan(drop);
      for (const sd of [-1, 1]) {
        const lz0 = AP0 - 0.3, lz1 = GATE.front + 0.3, cxl = sd * half / 2, cyl = GATE.ridge - (half / 2) * drop + 0.1;
        const g = new THREE.BoxGeometry(slope, 0.28, lz1 - lz0, 3, 1, 4);
        const m = new THREE.Matrix4().makeTranslation(...L(cxl, (lz0 + lz1) / 2).flatMap((v, i) => (i ? [v] : [v, cyl]))).multiply(new THREE.Matrix4().makeRotationY(rot)).multiply(new THREE.Matrix4().makeRotationZ(-sd * ang));
        P.add(M.thatch, boxUV(g, slope, 0.28, lz1 - lz0), m);
        // соломенная бахрома по нижнему краю ската
        for (let k = 0; k < 14; k++) { const lz = lerp(lz0 + 0.2, lz1, k / 13), p = LV(sd * (half - 0.02), GATE.ridge - half * drop - 0.02, lz); P.add(M.fringe, FRINGE, M4(p.x, p.y, p.z, rr(-0.1, 0.1), rot + sd * Math.PI / 2 + rr(-0.2, 0.2), sd * 0.2, rr(0.8, 1.2), rr(0.6, 1.3), 1)); }
        for (let k = 0; k < 3; k++) { const ax = sd * rr(0.3, half - 0.3), lz = rr(lz0 + 0.6, lz1 - 0.2), y = GATE.ridge - Math.abs(ax) * drop + 0.25; const nn = V(sd * Math.sin(ang), Math.cos(ang), 0).applyAxisAngle(V(0, 1, 0), rot); onSurface(P, M.shell, SHELL, LV(ax, y, lz), nn, Math.PI + rr(-0.4, 0.4), rr(0.3, 0.42)); }
      }
      beam(P, M.post, LV(0, GATE.ridge + 0.22, AP0 - 0.3), LV(0, GATE.ridge + 0.22, GATE.front + 0.35), 0.12, 6);
      // фронтон: доски, резной круг-оберег; причелины крест-накрест выше конька, на перекрестье — гребешок
      { const fz = POSTZ - 0.05, gy0 = tieY + 0.1, gh = roofY(0) - gy0 - 0.04, gw = POSTX * 2;
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([-gw / 2, 0, 0, gw / 2, 0, 0, 0, gh, 0], 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); gg.setIndex([0, 1, 2]); gg.computeVertexNormals();
        P.add(M.woodDark, gg, M4(...L(0, fz).flatMap((v, i) => (i ? [v] : [v, gy0])), 0, rot, 0));
        P.add(M.woodDark, gg.clone(), M4(...L(0, fz - 0.06).flatMap((v, i) => (i ? [v] : [v, gy0])), 0, rot + Math.PI, 0));
        const cc = LV(0, gy0 + gh * 0.38, fz + 0.06);
        PG.add(M.rune, new THREE.TorusGeometry(0.2, 0.025, 5, 20), M4(cc.x, cc.y, cc.z, 0, rot, 0));
        for (const sd of [-1, 1]) {
          beam(P, M.post, LV(sd * (half + 0.05), GATE.ridge - half * drop + 0.05, GATE.front + 0.38), LV(-sd * 0.55, GATE.ridge + 0.75, GATE.front + 0.38), 0.075, 4, true);
          tube(P, M.post, [LV(-sd * 0.5, GATE.ridge + 0.72, GATE.front + 0.38), LV(-sd * 0.8, GATE.ridge + 1.0, GATE.front + 0.4), LV(-sd * 0.62, GATE.ridge + 1.25, GATE.front + 0.42)], 0.05, 5, 6);
        }
        onSurface(P, M.shellPink, SHELL, LV(0, GATE.ridge + 0.62, GATE.front + 0.45), V(sn, 0, cs), Math.PI, 0.42);
      }
      // фонарь слева у входа на кованом кронштейне (красный, как на референсе)
      { const bp = LV(-POSTX - 0.2, FLOOR_Y + 2.75, POSTZ); beam(P, M.iron, LV(-POSTX, FLOOR_Y + 2.75, POSTZ), bp.clone().add(V(-cs * 0.3, 0, sn * 0.3)), 0.022, 4);
        const tip = bp.clone().add(V(-cs * 0.3, 0, sn * 0.3)); chain(P, tip, 0.25);
        const lp = lamp(P, PG, tip.x, tip.y - 0.85, tip.z, 1.1, M.lampRed); addLight(lp.clone(), RED, 5.0, 0.6, 1); halos.push({ p: lp, col: [1.0, 0.3, 0.15], s: 0.7 }); }
    }
    solids.push({ x: ISLE.x, z: ISLE.z, r: AP0 + 0.25, y0: PLAT_Y - 1, y1: FLOOR_Y + WALL_H });

    // купол соломы: ярусы с выпуклым профилем и рваной бахромой; вырез над входом, щёки
    const cut = (lx, lz) => Math.abs(lx) < GATE.half - 0.05 && lz > AP0 + 0.2;
    const eaveR = (ph) => EAVE_R + 0.42 * Math.sin(ph * 4 + 1) + 0.2 * Math.sin(ph * 7 + 0.3);
    // распухшая кровля: крупные бугры, мелкая рябь пучков, кромка провисает волнами (между «рёбрами» обрешётки)
    const lump = (ph, r) => 0.24 * Math.sin(ph * 5 + r * 1.1) * Math.min(1, r / 2) + 0.12 * Math.sin(ph * 9 - r * 1.7) + 0.05 * Math.sin(ph * 23 + r * 3.1)
      - 0.5 * ss(RC - 0.8, 6.9, r) * (0.55 + 0.45 * Math.sin(ph * 3 + 0.8));
    const TIERS = [[0.0, 2.4, 0.24], [2.0, 4.3, 0.14], [3.9, 5.5, 0.06], [5.1, 1, 0.0]];
    TIERS.forEach(([r0, r1x, off], ti) => {
      const NA = 132, NR = 6, pos = [], idx = [], uvs = [];
      for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
        const ph = j / NA * Math.PI * 2, r1 = ti === 3 ? eaveR(ph) : r1x, r = lerp(r0, r1, i / NR);
        const jag = i === NR ? (0.15 + 0.22 * Math.abs(Math.sin(ph * 23 + ti)) + 0.1 * Math.sin(ph * 9)) : 0;
        const y = domeY(r) + off + lump(ph, r) - jag - (i === NR ? 0.06 : 0);
        pos.push(Math.sin(ph) * (r + jag * 0.25), y, Math.cos(ph) * (r + jag * 0.25)); uvs.push(ph * 4, r);
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
        const a = i * (NA + 1) + j, b = a + NA + 1, ph = (j + 0.5) / NA * Math.PI * 2, rm = lerp(r0, ti === 3 ? eaveR(ph) : r1x, (i + 0.5) / NR);
        if (cut(Math.sin(ph) * rm, Math.cos(ph) * rm)) continue;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
      P.add(M.thatch, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
      const g2 = g.clone(); g2.translate(0, -0.16, 0); P.add(M.thatchDark, g2, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
    });
    // бахрома: пучки соломы свисают с кромки неровно
    for (let k = 0; k < 520; k++) {
      const ph = rr(0, 6.283), r = eaveR(ph) - 0.05, lx = Math.sin(ph) * r, lz = Math.cos(ph) * r; if (cut(lx, lz)) continue;
      const p = LV(lx, domeY(r) + lump(ph, r) - 0.25, lz);
      P.add(M.fringe, FRINGE, M4(p.x, p.y, p.z, rr(-0.15, 0.15), rot + ph + rr(-0.3, 0.3), rr(-0.15, 0.15), rr(0.8, 1.3), rr(0.7, 1.6), 1));
    }
    // подбой
    { const pos = [], idx = []; const NA = 72;
      for (let j = 0; j <= NA; j++) { const ph = j / NA * Math.PI * 2; for (const [r, y] of [[RC - 0.1, FLOOR_Y + WALL_H - 0.05], [eaveR(ph) - 0.45, domeY(eaveR(ph) - 0.45) - 0.28]]) pos.push(Math.sin(ph) * r, y, Math.cos(ph) * r); }
      for (let j = 0; j < NA; j++) { const ph = (j + 0.5) / NA * Math.PI * 2; if (cut(Math.sin(ph) * 6, Math.cos(ph) * 6)) continue; const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      P.add(M.thatchDark, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0)); }
    // щёки над входом
    for (const sd of [-1, 1]) {
      const lx = sd * (GATE.half - 0.05), pts = [];
      for (let k = 0; k <= 8; k++) { const lz = lerp(AP0 + 0.15, GATE.front, k / 8), r = Math.hypot(lx, lz), ph = Math.atan2(lx, lz); pts.push([lz, Math.max(r < eaveR(ph) ? domeY(r) + lump(ph, r) + 0.05 : GATE.eave, GATE.eave)]); }
      const pos = [], idx = [];
      pts.forEach(([lz, yT]) => { pos.push(lx, GATE.eave - 0.1, lz, lx, yT, lz); });
      for (let k = 0; k < 8; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      P.add(M.thatch, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
    }
    // убранство купола: крупные гребешки и звёзды (немного, как на референсе), мелкие ракушки, костяные шипы
    const domeN = (ph, r) => { const e = 0.05, d = (domeY(r - e) - domeY(r + e)) / (2 * e); return V(Math.sin(ph) * d, 1, Math.cos(ph) * d).normalize(); };
    const onDome = (ph, r, lift = 0.14) => { const lx = Math.sin(ph) * r, lz = Math.cos(ph) * r; const tier = TIERS.findIndex(([a, b], i) => r >= a && r <= (i === 3 ? 9 : b)); const off = tier >= 0 ? TIERS[tier][2] : 0; return { p: LV(lx, domeY(r) + off + lump(ph, r) + lift, lz), n: domeN(ph, r).applyAxisAngle(V(0, 1, 0), rot), bad: cut(lx, lz) }; };
    for (let k = 0; k < 34; k++) { const ph = rr(0, 6.283), r = Math.sqrt(rr(0.05, 1)) * (EAVE_R - 0.7); const q = onDome(ph, r); if (q.bad) continue; onSurface(P, k % 3 ? M.shell : M.shellPink, SHELL, q.p, q.n, ph + Math.PI + rr(-0.5, 0.5), rr(0.32, 0.55)); }
    // пучки соломы лежат по куполу рядами вниз по скату: поверхность рваная, как на референсе
    for (let k = 0; k < 900; k++) {
      const ph = rr(0, 6.283), r = Math.sqrt(rr(0.02, 1)) * (EAVE_R - 0.2), q = onDome(ph, r, 0.03); if (q.bad) continue;
      const down = V(Math.sin(rot + ph), 0, Math.cos(rot + ph)).addScaledVector(q.n, -V(Math.sin(rot + ph), 0, Math.cos(rot + ph)).dot(q.n)).normalize().addScaledVector(q.n, -0.25).normalize();
      const qq = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), down); qq.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rr(-0.4, 0.4)));
      P.add(k % 4 ? M.thatch : M.fringe, FRINGE, new THREE.Matrix4().compose(q.p, qq, V(rr(1.0, 1.6), rr(1.2, 2.0), 1)));
    }
    for (let k = 0; k < 70; k++) { const ph = rr(0, 6.283), r = Math.sqrt(rr(0.05, 1)) * (EAVE_R - 0.4); const q = onDome(ph, r, 0.1); if (q.bad) continue; onSurface(P, M.shellDim, SHELL, q.p, q.n, ph + Math.PI + rr(-0.6, 0.6), rr(0.16, 0.28)); }
    for (const [ph, r, s] of [[0.35, 2.6, 1.2], [0.75, 3.9, 1.35], [-0.5, 4.6, 1.0], [1.35, 1.6, 0.9], [-1.1, 2.9, 1.1], [2.6, 3.5, 1.1], [-2.4, 4.2, 1.0]]) { const q = onDome(ph, r, 0.16); if (!q.bad) onSurface(P, M.star, STAR, q.p, q.n, rr(0, 6.28), s); }
    for (let k = 0; k < 46; k++) {
      const ph = rr(0, 6.283), r = Math.pow(rnd(), 0.7) * (EAVE_R - 0.8); const q = onDome(ph, r, 0.05); if (q.bad) continue;
      const out = q.n.clone().multiplyScalar(0.75).add(V(Math.sin(rot + ph), 0.85, Math.cos(rot + ph)).normalize().multiplyScalar(0.4)).normalize();
      const len = rr(0.5, 1.4) * (r < 2.5 ? 1.3 : 1); P.add(M.bone, new THREE.ConeGeometry(0.06 * len + 0.02, len, 6), new THREE.Matrix4().compose(q.p.clone().addScaledVector(out, len * 0.42), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), out), V(1, 1, 1)));
    }
    // макушка: столб, большой рыбий череп, остроги крест-накрест (как мечи на референсе), на правой — фонарик, на левой — колокол
    { const ax = ISLE.x, az = ISLE.z, top = domeY(0) + TIERS[0][2];
      beam(P, M.post, V(ax, top - 0.8, az), V(ax, top + 1.0, az), 0.17, 6); lashing(P, ax, top + 0.1, az, 0.18);
      fishSkull(P, PG, ax, top + 1.4, az, 1.0, rot, true);
      for (const sd of [-1, 1]) {
        const a = LV(-sd * 0.9, top - 0.3, -0.25), b = LV(sd * 1.5, top + 3.4, 0.15), d = b.clone().sub(a).normalize();
        beam(P, M.wood, a, b, 0.055, 5);
        box(P, M.iron, 0.18, 0.06, 0.06, new THREE.Matrix4().compose(b.clone().addScaledVector(d, -0.15), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, 1, 1)));
        P.add(M.iron, new THREE.ConeGeometry(0.1, 0.7, 4), new THREE.Matrix4().compose(b.clone().addScaledVector(d, 0.33), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, 0.9, 0.35)));
        const hp = a.clone().lerp(b, 0.78);
        if (sd > 0) { chain(P, hp, 0.2); const lp = lamp(P, PG, hp.x, hp.y - 0.75, hp.z, 0.8, M.lampRed); halos.push({ p: lp, col: [1.0, 0.3, 0.15], s: 0.45 }); }
        else bell(P, hp, 0.65, 0.25);
      }
      perches.push({ x: ax, y: top + 2.0, z: az, ry: rot });
      leafSrc.push(V(ax, top, az)); }
    // стяги на цепях под кромкой: левее входа и справа у окна (кремовые с руной)
    for (const [ph, len] of [[-0.62, 0.9], [0.95, 0.7], [2.3, 0.6], [-2.2, 0.8]]) {
      const r = eaveR(ph) - 0.7, q = onDome(ph, r, -0.3), yaw = rot + ph;
      chain(P, q.p, len);
      const by = q.p.y - Math.round(len / 0.09) * 0.085 - 0.06;
      bannerBar(P, ph > 2 || ph < -2 ? clothRed : clothCream, q.p.x, by, q.p.z, 0.62, rr(1.1, 1.5), yaw);
    }
    // капель с кромки
    for (let k = 0; k < 18; k++) { const ph = rr(0, 6.28), q = onDome(ph, eaveR(ph) - 0.05, -0.35); if (!q.bad) drips.push(q.p); }
    // мох подушками и плесень пятнами по куполу; лианы свисают с кромки (как на референсе кровля «живая»)
    { const qz = new THREE.Quaternion();
      for (let k = 0; k < 170; k++) { const ph = rr(0, 6.283), r = Math.sqrt(rr(0.1, 1)) * (EAVE_R - 0.3), q = onDome(ph, r, 0.07); if (q.bad) continue; qz.setFromUnitVectors(V(0, 0, 1), q.n); const sc = rr(0.5, 1.4) * (r > 4 ? 1.3 : 1); P.add(k % 4 ? M.mossPad : M.mould, PATCH, new THREE.Matrix4().compose(q.p, qz, V(sc, sc * rr(0.6, 1), 1))); }
      for (let k = 0; k < 70; k++) { const ph = rr(0, 6.283), r = rr(3.5, EAVE_R - 0.4), q = onDome(ph, r, 0.0); if (q.bad) continue; P.add(M.mossDark, MOSS_LITE, M4(q.p.x, q.p.y, q.p.z, 0, rr(0, 6), 0, rr(0.3, 0.6), rr(0.12, 0.22), rr(0.3, 0.55))); }
      for (let k = 0; k < 30; k++) { const ph = rr(0, 6.283), q = onDome(ph, eaveR(ph) - 0.35, -0.3); if (q.bad) continue; vine(P, q.p, rr(0.8, 2.2), rot + ph, rr(0.15, 0.4)); }
    }
    // плесень по низу стен и по камням цоколя (бледные пятна), травинки в щелях
    { const qz = new THREE.Quaternion();
      for (let k = 0; k < 60; k++) { const kk = Math.floor(rr(0, NS)); if (kk === 0) continue; const ph = kk * 2 * Math.PI / NS + rr(-0.2, 0.2), p = LP(ph, APO(kk) + 0.2, FLOOR_Y + Math.pow(rnd(), 1.8) * 1.6 + 0.05); qz.setFromUnitVectors(V(0, 0, 1), V(Math.sin(rot + ph), rr(-0.1, 0.1), Math.cos(rot + ph)).normalize()); const sc = rr(0.3, 0.8); P.add(rnd() < 0.55 ? M.mould : M.mossPad, PATCH, new THREE.Matrix4().compose(p, qz, V(sc, sc * rr(0.5, 1), 1))); }
    }
    // мох у цоколя
    for (let k = 0; k < 22; k++) { const ph = rr(0, 6.28), p = LP(ph, AP0 + 0.55, PLAT_Y); if (Math.abs(Math.sin(ph) * (AP0 + 0.5)) < GATE.half + 0.3 && Math.cos(ph) > 0) continue; P.add(M.mossDark, MOSS_LITE, M4(p.x, PLAT_Y + 0.02, p.z, 0, rr(0, 6), 0, rr(0.3, 0.6), rr(0.1, 0.18), rr(0.25, 0.45))); mossStrand(P, p.x, FLOOR_Y + 0.1, p.z, rr(0.3, 0.7), 0.35, rot + ph + Math.PI / 2); }

    // кривизна: дом завален к востоку и чуть закручен кверху (сильнее к макушке), низ на месте
    const warp = (g) => {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = Math.max(0, y - FLOOR_Y);
        const tw = h * h * 0.0011, c = Math.cos(tw), s2 = Math.sin(tw), dx = x - ISLE.x, dz = z - ISLE.z;
        p.setXYZ(i, ISLE.x + dx * c - dz * s2 + h * h * 0.0042 * 0.8, y - h * h * 0.0012, ISLE.z + dx * s2 + dz * c + h * h * 0.0042 * 0.35);
      }
      g.computeVertexNormals();
    };
    for (const [pk, dst] of [[P, P0], [PG, PG0]]) for (const [mat, list] of pk.parts) for (const g of list) { warp(g); dst.add(mat, g); }
    const warpV = (v) => { const h = Math.max(0, v.y - FLOOR_Y), tw = h * h * 0.0011, c = Math.cos(tw), s2 = Math.sin(tw), dx = v.x - ISLE.x, dz = v.z - ISLE.z; v.x = ISLE.x + dx * c - dz * s2 + h * h * 0.0034; v.z = ISLE.z + dx * s2 + dz * c + h * h * 0.0015; v.y -= h * h * 0.0012; };
    for (const h of halos.slice(n0.halos)) warpV(h.p);
    for (const d of drips.slice(n0.drips)) warpV(d);
    for (const q of perches.slice(n0.perches)) warpV(q);
    for (const q of leafSrc.slice(n0.leafSrc)) warpV(q);
  }

  // ---------- двор на острове: идолы, шесты со стягами, сети, свечи ----------
  {
    const spots = [[-6.6, 3.6, 4.2, 0.4, 0], [-4.4, 7.0, 3.0, 0.2, 1], [6.8, 4.4, 3.8, -0.4, 2], [-8.2, -1.0, 3.0, 0.9, 2], [3.4, 8.2, 2.1, -0.2, 0], [8.4, 0.6, 2.6, -0.9, 1]];
    for (const [lx, lz, h, ry, kind] of spots) {
      const [x, z] = L(lx, lz); const top = idol(P, PG, x, z, h, rot + ry, { kind, vine: kind !== 1 });
      perches.push({ x, y: top + 0.9, z, ry: rot + ry });
      // свечи у подножия
      for (let k = 0; k < 4; k++) { const a = rr(0, 6.28), cx = x + Math.cos(a) * 0.75, cz = z + Math.sin(a) * 0.75, cy = groundAt(cx, cz), ch = rr(0.12, 0.3); P.add(paint({ base: '#d8ccb0', strokeAmt: 0.05, rim: 0.8 }), new THREE.CylinderGeometry(0.035, 0.04, ch, 6), M4(cx, cy + ch / 2, cz)); PG.add(M.candle, new THREE.SphereGeometry(0.03, 5, 4), M4(cx, cy + ch + 0.04, cz, 0, 0, 0, 1, 1.8, 1)); }
    }
    // шесты со стягами: левее терема, как на концепте
    for (const [lx, lz, h, red] of [[-5.6, -2.6, 6.2, 0], [-7.4, 1.8, 5.2, 1], [6.4, -3.6, 5.6, 1]]) {
      const [x, z] = L(lx, lz), y0 = groundAt(x, z);
      beam(P, M.post, V(x, y0 - 0.5, z), V(x, y0 + h, z), 0.09, 6);
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.3; P.add(M.stone, new THREE.DodecahedronGeometry(0.24, 0), M4(x + Math.cos(a) * 0.32, y0 + 0.08, z + Math.sin(a) * 0.32, rr(0, 3), rr(0, 3), 0)); }
      const yaw = rot + rr(-0.3, 0.3), c = Math.cos(yaw), s = Math.sin(yaw);
      beam(P, M.wood, V(x - c * 0.1, y0 + h - 0.35, z + s * 0.1), V(x + c * 0.95, y0 + h - 0.35, z - s * 0.95), 0.04, 5);
      cloth(P, red ? clothRed : clothCream, x + c * 0.5, y0 + h - 0.38, z - s * 0.5, 0.75, rr(1.8, 2.4), yaw);
      P.add(M.iron, new THREE.ConeGeometry(0.08, 0.5, 4), M4(x, y0 + h + 0.25, z));
      perches.push({ x, y: y0 + h + 0.5, z, ry: yaw });
    }
    // сети сушатся на двух жердях, на них рыба
    { const [ax, az] = L(7.6, 0.6), [bx, bz] = L(8.4, -2.4), ya = groundAt(ax, az), yb = groundAt(bx, bz);
      beam(P, M.post, V(ax, ya - 0.3, az), V(ax, ya + 2.4, az), 0.07, 5); beam(P, M.post, V(bx, yb - 0.3, bz), V(bx, yb + 2.4, bz), 0.07, 5);
      beam(P, M.wood, V(ax, ya + 2.3, az), V(bx, yb + 2.3, bz), 0.04, 5);
      const net = new THREE.PlaneGeometry(1, 1, 10, 8); const p = net.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3.1) * 0.12 * (0.5 - p.getY(i)));
      const netMat = paint({ base: '#6a6448', strokeAmt: 0.1, side: THREE.DoubleSide, rim: 0.6, sway: 0.6 }); netMat.wireframe = true; netMat.userData.noInk = true;
      const d = Math.hypot(bx - ax, bz - az);
      P.add(netMat, net, M4((ax + bx) / 2, (ya + yb) / 2 + 1.55, (az + bz) / 2, 0, Math.atan2(-(bz - az), bx - ax), 0, d - 0.1, 1.5, 1));
      for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.2, x = lerp(ax, bx, t), z = lerp(az, bz, t), y = lerp(ya, yb, t) + 2.28; rope(P, V(x, y, z), V(x, y - 0.4, z), 0, 0.01); P.add(paint({ base: '#7a8a80', strokeAmt: 0.1, rim: 1.2, wet: 0.8 }), new THREE.SphereGeometry(0.06, 7, 5), M4(x, y - 0.6, z, 0, 0, 0, 0.7, 2.8, 0.45)); } }
    // кувшины-подношения у крыльца
    for (const [lx, lz] of [[2.6, 8.8], [-2.8, 9.0], [3.0, 9.6]]) { const [x, z] = L(lx, lz), y = groundAt(x, z); P.add(paint({ base: '#7a4a2c', strokeAmt: 0.12, rim: 1.0, wet: 0.3 }), new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.22, 0.18], [0.18, 0.36], [0.08, 0.44], [0.1, 0.5]].map(([r, h]) => new THREE.Vector2(r, h)), 10), M4(x, y, z)); }
  }

  // ---------- кости большой рыбы у восточного подножия, лодка-долблёнка у причала ----------
  {
    const a = V(BONES.a[0], 0, BONES.a[1]), b = V(BONES.b[0], 0, BONES.b[1]);
    a.y = Math.max(groundAt(a.x, a.z), WATER_Y - 0.1) + 0.15; b.y = Math.max(groundAt(b.x, b.z), WATER_Y - 0.3);
    fishSkeleton(P, PG, a, b, 1.0);
    // кости крест-накрест у подножия лестницы (как на референсе) и россыпь мелких костей
    { const cx = ST_TOP[0] + SD[0] * (ST_LEN - 0.8) - SP[0] * (ST_W / 2 + 1.7), cz = ST_TOP[1] + SD[1] * (ST_LEN - 0.8) - SP[1] * (ST_W / 2 + 1.7); crossedBones(P, cx, Math.max(groundAt(cx, cz), WATER_Y), cz, 1.0, STAIR_YAW + 0.4); }
    for (let k = 0; k < 14; k++) { const t = rnd(), p = a.clone().lerp(b, t).add(V(rr(-2.5, 2.5), 0, rr(-2.5, 2.5))); const y = groundAt(p.x, p.z); if (y < WATER_Y - 0.3) continue; const l = rr(0.3, 0.8), ry = rr(0, 6); beam(P, M.bone, V(p.x, y + 0.05, p.z), V(p.x + Math.sin(ry) * l, y + 0.08, p.z + Math.cos(ry) * l), 0.035, 5); }
    // старые сваи с канатом рядом
    for (const [x, z, h] of [[BONES.a[0] - 1.6, BONES.a[1] + 2.4, 1.6], [BONES.a[0] - 3.0, BONES.a[1] + 3.2, 1.1]]) { const y = groundAt(x, z); beam(P, M.post, V(x, y - 0.4, z), V(x + rr(-0.15, 0.15), WATER_Y + h, z + rr(-0.15, 0.15)), 0.12, 6); lashing(P, x, WATER_Y + h * 0.6, z, 0.12); }
    // долблёнка у причала
    { const cx = LANDING.x + SP[0] * 2.4 + SD[0] * 0.6, cz = LANDING.z + SP[1] * 2.4 + SD[1] * 0.6, yaw = STAIR_YAW + 0.25;
      const hull = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hull.scale(0.55, 0.42, 2.4);
      P.add(M.woodDark, hull, M4(cx, WATER_Y + 0.28, cz, 0, yaw, 0));
      P.add(M.dark, new THREE.CircleGeometry(1, 14), M4(cx, WATER_Y + 0.22, cz, -Math.PI / 2, 0, -yaw, 0.48, 2.2, 1));
      beam(P, M.wood, V(cx - Math.sin(yaw) * 0.3, WATER_Y + 0.35, cz - Math.cos(yaw) * 0.3), V(cx + Math.sin(yaw) * 1.6 + 0.4, WATER_Y + 0.55, cz + Math.cos(yaw) * 1.6), 0.03, 5);
      rope(P, V(cx + Math.sin(yaw) * 2.2, WATER_Y + 0.4, cz + Math.cos(yaw) * 2.2), V(LANDING.x + SP[0] * 1.75 + SD[0] * 1.15, 0.55, LANDING.z + SP[1] * 1.75 + SD[1] * 1.15), 0.3); }
  }

  // ---------- рамка: два корявых дерева на южном берегу, ветви над водой, на них цепи, фонари, колокольцы, стяги ----------
  const canopy = [];
  {
    // корявое дерево: ствол скручен и в наплывах, сучья сужаются в острия и ветвятся вилкой, корни лапой с перекрутом
    const tree = (root, pts, rad, branches) => {
      const y = groundAt(root[0], root[1]);
      const tp = pts.map(([x, yy, z], i) => V(x + rr(-0.35, 0.35) * (i > 0), yy, z + rr(-0.35, 0.35) * (i > 0))); tp.unshift(V(root[0], y - 0.8, root[1])); tp.splice(1, 0, V(root[0] + rr(-0.3, 0.3), y + 1.2, root[1] + rr(-0.3, 0.3)));
      taper(P, M.barkOld, tp, rad * 1.25, rad * 0.62, 11, 22);
      const tc = new THREE.CatmullRomCurve3(tp);
      for (let k = 0; k < 6; k++) { const t = rr(0.15, 0.85), q = tc.getPoint(t), a = rr(0, 6.28), rr0 = rad * lerp(1.15, 0.65, t); P.add(M.barkOld, LUMP[k % LUMP.length], M4(q.x + Math.cos(a) * rr0 * 0.7, q.y, q.z + Math.sin(a) * rr0 * 0.7, rr(-0.5, 0.5), a, rr(-0.5, 0.5), rr0 * 1.1, rr0 * 1.4, rr0 * 1.0)); }   // наплывы
      for (let j = 0; j < 11; j++) {
        const a = j / 11 * 6.28 + rr(-0.2, 0.2), rl = rr(1.4, 3.4), tw = rr(-0.5, 0.5), P1 = (f, h) => { const aa = a + tw * f; return V(root[0] + Math.cos(aa) * rl * f, h, root[1] + Math.sin(aa) * rl * f); };
        const end = P1(1, 0); end.y = Math.min(y, groundAt(end.x, end.z)) - 0.4;
        taper(P, M.barkOld, [V(root[0], y + rr(0.9, 1.4), root[1]), P1(0.35, y + rr(0.5, 0.9)), P1(0.7, y + rr(0.05, 0.45)), end], rad * rr(0.32, 0.45), 0.03, 6, 12);
      }
      solids.push({ x: root[0], z: root[1], r: rad + 0.4 }); bases.push([root[0], root[1], rad * 2]);
      for (const br of branches) {
        const bp = br.pts.map(([x, yy, z], i) => V(x + (i ? rr(-0.3, 0.3) : 0), yy + (i ? rr(-0.3, 0.3) : 0), z + (i ? rr(-0.3, 0.3) : 0)));
        taper(P, M.barkOld, bp, br.r * 1.15, br.r * 0.32, 8, 18);
        const curve = new THREE.CatmullRomCurve3(bp), end = bp[bp.length - 1], dir = curve.getTangent(1);
        // вилка на конце: три острых сучка
        for (let k = 0; k < 3; k++) { const d2 = dir.clone().add(V(rr(-0.7, 0.7), rr(0.1, 0.9), rr(-0.7, 0.7))).normalize(), l = rr(1.2, 2.4), m = end.clone().addScaledVector(d2, l * 0.5).add(V(0, 0.2, 0)), tip = end.clone().addScaledVector(d2, l); taper(P, M.barkOld, [end, m, tip], br.r * 0.32, 0.012, 5, 8); canopy.push(tip); }
        for (let k = 0; k < (br.twigs || 6); k++) { const t = rr(0.3, 0.95), s0 = curve.getPoint(t), tip = s0.clone().add(V(rr(-1.8, 1.8), rr(0, 1.6), rr(-1.8, 1.8))), mid = s0.clone().lerp(tip, 0.5).add(V(rr(-0.3, 0.3), 0.35, rr(-0.3, 0.3))); taper(P, M.barkOld, [s0, mid, tip], br.r * 0.36, 0.01, 5, 8); if (rnd() < 0.5) { const t2 = mid.clone().add(V(rr(-0.8, 0.8), rr(0.2, 0.8), rr(-0.8, 0.8))); taper(P, M.barkOld, [mid, mid.clone().lerp(t2, 0.5), t2], br.r * 0.16, 0.008, 4, 5); } canopy.push(tip); }
        for (let k = 0; k < 6; k++) { const s0 = curve.getPoint(rr(0.2, 1)); vine(P, s0.clone().add(V(0, -br.r * 0.6, 0)), rr(1.0, 3.8), rr(0, 6), 0.12); }
        perches.push({ x: end.x, y: end.y + br.r * 0.4, z: end.z, ry: rr(0, 6) });
        br.curve = curve;
      }
      return branches;
    };
    // левое: ствол наклонён к воде, длинная ветвь аркой над переднем планом
    const LB = tree([-5.6, 25.2], [[-6.0, 3, 24.6], [-6.8, 7, 23.6], [-7.4, 10.5, 22.6]], 0.85, [
      { pts: [[-7.3, 10, 22.7], [-4.2, 12.0, 21.2], [-0.4, 12.6, 19.8], [2.6, 12.1, 18.6]], r: 0.34, twigs: 9 },
      { pts: [[-7.3, 9.6, 22.8], [-11, 12, 21.2], [-14.5, 13, 19]], r: 0.3 },
      { pts: [[-7.4, 10.5, 22.6], [-8.2, 14, 23.6], [-8.6, 17, 24.6]], r: 0.26 },
    ]);
    // правое
    const RB = tree([7.6, 24.8], [[8.0, 3, 24.2], [8.8, 7, 23.2], [9.4, 10.5, 22.2]], 0.8, [
      { pts: [[9.2, 10, 22.4], [6.4, 12.1, 20.8], [3.4, 12.8, 19.4], [0.8, 12.4, 18.2]], r: 0.32, twigs: 9 },
      { pts: [[9.3, 9.6, 22.4], [12.8, 12, 21], [16, 13, 18.6]], r: 0.3 },
      { pts: [[9.4, 10.5, 22.2], [10.2, 14, 23.2], [10.7, 17, 24.3]], r: 0.25 },
    ]);
    // листва клочьями (ива), падающий свет проходит между клочьями
    for (const tip of canopy) for (let q = 0; q < 2; q++) if (tip.y > 10.5) P.add(M.leafTeal, WILLOW[q % 2], M4(tip.x + rr(-0.8, 0.8), tip.y + rr(-0.3, 0.4), tip.z + rr(-0.8, 0.8), 0, rr(0, 3), 0, rr(1.0, 1.7), rr(0.8, 1.2), rr(1.0, 1.7)));
    for (const tip of canopy) leafSrc.push(tip);
    // подвесы: цепь от ветви вниз, на конце — фонарь (красный высоко), колокольцы, стяги на перекладинах
    const hang = (br, t, what, len) => {
      const s = br.curve.getPoint(t), lr = br.r * lerp(1.15, 0.32, Math.pow(t, 0.8)); const top = V(s.x, s.y - lr * 0.95, s.z);
      P.add(M.iron, new THREE.TorusGeometry(lr + 0.03, 0.025, 4, 12), M4(s.x, s.y, s.z, 0, rr(0, 3), Math.PI / 2));   // хомут на ветви
      if (what === 'red' || what === 'green') {
        chain(P, top, len, rr(0, 3));
        const ly = top.y - Math.round(len / 0.09) * 0.085 - 0.55;
        const lp = lamp(P, PG, top.x, ly, top.z, 1.6, what === 'red' ? M.lampRed : M.lampGreen);
        addLight(lp.clone(), what === 'red' ? RED : GREEN, 9, 0.5, 1); halos.push({ p: lp, col: what === 'red' ? [1.0, 0.3, 0.15] : [0.35, 1.0, 0.7], s: 1.2 });
      } else if (what === 'bell') bell(P, top, rr(0.9, 1.3), len);
      else { chain(P, top, len, rr(0, 3)); const by = top.y - Math.round(len / 0.09) * 0.085 - 0.05; bannerBar(P, what === 'cream' ? clothCream : clothRed, top.x, by, top.z, 0.95, rr(2.0, 2.6), Math.atan2(-(br.curve.getPoint(t + 0.05).z - s.z), br.curve.getPoint(t + 0.05).x - s.x)); }
    };
    hang(LB[0], 0.3, 'red', 5.6); hang(LB[0], 0.55, 'cream', 3.4); hang(LB[0], 0.8, 'bell', 1.4); hang(LB[0], 0.95, 'bell', 2.4); hang(LB[1], 0.55, 'cream', 2.6); hang(LB[1], 0.85, 'red', 4.0); hang(LB[1], 0.35, 'bell', 1.0);
    hang(RB[0], 0.3, 'red', 5.4); hang(RB[0], 0.55, 'red2', 3.0); hang(RB[0], 0.8, 'bell', 1.2); hang(RB[0], 0.93, 'bell', 2.6); hang(RB[1], 0.5, 'bell', 1.4); hang(RB[1], 0.8, 'red', 4.4);
    // зелёные фонари у корней: на пне слева, на столбике справа
    { const x = -3.9, z = 23.6, y = footY(x, z, 0.5, 'пень'); P.add(M.bark, cylUV(new THREE.CylinderGeometry(0.45, 0.6, 0.9, 9), 0.9, 0.5), M4(x, y + 0.35, z)); const lp = lamp(P, PG, x, y + 1.1, z, 1.7, M.lampGreen); addLight(lp.clone(), GREEN, 8, 0.35, 1); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.75 }); rope(P, V(x - 0.4, y + 0.6, z), V(x + 0.4, y + 0.65, z + 0.3), 0.05); }
    { const x = 5.6, z = 23.4, y = groundAt(x, z); beam(P, M.post, V(x, y - 0.4, z), V(x, y + 1.0, z), 0.16, 6); box(P, M.woodDark, 0.5, 0.08, 0.5, M4(x, y + 1.04, z)); const lp = lamp(P, PG, x, y + 1.42, z, 1.6, M.lampGreen); addLight(lp.clone(), GREEN, 5, 0.35, 1); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.75 }); lashing(P, x, y + 0.4, z, 0.16); }
  }

  // ---------- передний план и брод: сваи с канатом, камни-переходы, фонари на шестах в воде ----------
  {
    // сломанные сваи: одна с поперечиной и красным канатом (как на концепте справа), одна наклонена слева
    { const x = 3.4, z = 20.6, y = groundAt(x, z); beam(P, M.post, V(x, y - 0.6, z), V(x + 0.15, 1.6, z - 0.1), 0.2, 6); P.add(M.post, new THREE.ConeGeometry(0.2, 0.3, 6), M4(x + 0.16, 1.75, z - 0.1)); box(P, M.post, 1.3, 0.18, 0.18, M4(x + 0.1, 1.05, z - 0.06, 0, 0.3, 0.1)); for (let k = 0; k < 4; k++) P.add(M.ropeRed, new THREE.TorusGeometry(0.22, 0.035, 4, 10), M4(x + 0.1, 0.85 + k * 0.07, z - 0.06, Math.PI / 2 + rr(-0.2, 0.2), 0, rr(-0.1, 0.1))); }
    { const x = -3.6, z = 19.2, y = groundAt(x, z); beam(P, M.post, V(x, y - 0.6, z), V(x + 0.9, 1.9, z - 0.5), 0.22, 6); lashing(P, x + 0.45, 0.6, z - 0.25, 0.22); beam(P, M.post, V(x + 1.6, groundAt(x + 1.6, z + 0.6) - 0.5, z + 0.6), V(x + 1.4, 0.7, z + 0.4), 0.16, 6); rope(P, V(x + 0.6, 1.2, z - 0.33), V(x + 1.42, 0.55, z + 0.42), 0.2); }
    // коряги: в воде у берегов и у острова, на переднем плане у корней (как на референсе); мостик и брод не задеваем
    for (const [x, z, sc, yw, kind] of [[-7.2, 21.2, 1.0, 0.9, 0], [-10.5, 17.5, 1.2, 2.3, 1], [11.5, 19.5, 0.9, -0.6, 0], [15.8, 13.5, 1.1, -2.0, 1], [-14.5, 10.2, 1.0, 0.4, 0], [-6.5, 2.5, 0.8, -1.2, 1], [3.5, 12.2, 0.85, 2.6, 0], [20.5, 4.5, 1.0, 1.9, 0], [-19.5, -4.0, 1.1, 0.8, 1], [22.5, -9.5, 0.9, -2.4, 1]]) {
      if (walks.some((w) => segDistW(x, z, w) < w.w * 0.5 + 2.2) || kept(x, z, 2.5)) continue;
      const y = Math.max(groundAt(x, z), WATER_Y - 0.25); snag(P, x, y, z, sc, yw, kind); solids.push({ x, z, r: 0.6 * sc });
    }
    // передний план по референсу: сваи, обмотанные канатом, кол со стягом, обломки досок крест-накрест, фонарь на пне у воды
    { ropeWrap(P, 3.45, 0.35, 20.6, 0.2, 0.7, 5, M.ropeRed); ropeWrap(P, -3.15, 0.2, 18.95, 0.22, 0.5, 4);
      for (const [x, z, h, ry] of [[-9.6, 20.6, 2.6, 0.3], [11.8, 21.4, 2.2, -0.5]]) { const y = groundAt(x, z); swell(P, M.post, V(x, y - 0.5, z), V(x + 0.12, Math.max(y, WATER_Y) + h, z - 0.08), 0.13, 1.0, 6); ropeWrap(P, x + 0.03, Math.max(y, WATER_Y) + 0.2, z - 0.02, 0.14, 0.6, 4);
        const yb = Math.max(y, WATER_Y) + h - 0.25; beam(P, M.wood, V(x - Math.cos(ry) * 0.5, yb, z + Math.sin(ry) * 0.5), V(x + Math.cos(ry) * 0.5, yb, z - Math.sin(ry) * 0.5), 0.04, 5); bannerBar(P, ry > 0 ? clothCream : clothRed, x, yb - 0.04, z, 0.8, 1.4, ry); }
      for (const [x, z] of [[-6.4, 20.4], [8.6, 20.6]]) { const y = Math.max(groundAt(x, z), WATER_Y); for (const sd of [-1, 1]) box(P, M.plankOld, 0.24, 0.06, 2.0, M4(x, y + 0.35, z, sd * 0.5, sd * 0.7 + 0.3, 0)); lashing(P, x, y + 0.4, z, 0.08); }
      { const x = 9.6, z = 18.2, y = groundAt(x, z); { const Hs = Math.max(0.9, WATER_Y + 0.75 - y), topS = y - 0.2 + Hs; P.add(M.barkOld, cylUV(new THREE.CylinderGeometry(0.38, 0.5, Hs, 9), Hs, 0.45), M4(x, y - 0.2 + Hs / 2, z)); const lp = lamp(P, PG, x, topS + 0.3 * 1.3, z, 1.3, M.lampGreen); addLight(lp.clone(), GREEN, 5, 0.35); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.55 }); } }
    }
    // левый средний берег: скальный выступ, две жерди с перекладиной и стягом, фонарь
    { const x = -23, z = 4.5, y = groundAt(x, z);
      for (let k = 0; k < 6; k++) P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.8, 1.6), 1), M4(x + rr(-2.5, 2.5), footY(x, z, 1, 'камень') + 0.2, z + rr(-2, 2), rr(0, 3), rr(0, 3), 0, 1, 0.7, 1));
      const p1 = V(x + 1.2, 0, z + 1.5), p2 = V(x + 2.4, 0, z + 0.2); for (const p of [p1, p2]) { p.y = groundAt(p.x, p.z); beam(P, M.post, V(p.x, p.y - 0.4, p.z), V(p.x, p.y + 3.2, p.z), 0.1, 6); }
      const yb = Math.min(p1.y, p2.y) + 3.0; beam(P, M.wood, V(p1.x, yb, p1.z), V(p2.x, yb, p2.z), 0.06, 5);
      cloth(P, clothCream, (p1.x + p2.x) / 2, yb - 0.05, (p1.z + p2.z) / 2, 1.1, 2.0, Math.atan2(-(p2.z - p1.z), p2.x - p1.x));
      const lp = lamp(P, PG, x + 3.2, groundAt(x + 3.2, z + 1.8) + 0.25, z + 1.8, 1.2, M.lampGreen); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.4 });
      solids.push({ x, z, r: 2.6 }); }
  }

  // ---------- лес: сосны и ели по верху скал и по южным холмам; дальние горы кулисами ----------
  const forest = new THREE.Group();
  {
    const sprG = [spruceGeo(1, 0), spruceGeo(2, 0), spruceGeo(3, 1), spruceGeo(4, 2)], pines = [pineGeo(5), pineGeo(6)];
    const sprMat = paint({ base: '#ffffff', vcol: true, map: needleTex, mapGain: 2.3, sway: 0.35, rim: 0.9, strokeAmt: 0.16, break: 0.32, side: THREE.DoubleSide, noFlip: true });
    const pineMat = paint({ base: '#ffffff', vcol: true, map: needleTex, mapGain: 2.2, sway: 0.4, rim: 1.0, strokeAmt: 0.16, break: 0.32, side: THREE.DoubleSide, noFlip: true });
    const pineBark = paint({ base: '#7a4a2c', moss: '#3e5a24', mossAmt: 0.25, stroke: [0, 1, 0], strokeAmt: 0.3, break: 0.3, rim: 1.0 });
    const sprI = sprG.map(() => []), pineI = pines.map(() => []), sprT = [];
    const trunk = cylUV(new THREE.CylinderGeometry(0.035, 0.09, 1.12, 7), 1.1, 0.06); trunk.translate(0, 0.5, 0);
    let n = 0;
    for (let k = 0; k < 9000 && n < 650; k++) {
      const a = rr(-Math.PI, Math.PI), e = rr(1.2, 3.4), [x, z] = ellP(a, e);
      const c = cliffH(x, z), north = c.north;
      if (north < 0.3 && e < 1.25) continue;
      if (north > 0.5 && e < 1.42 && rnd() < 0.8) continue;
      if (z > 14 && Math.abs(x - pathX(z)) < 4.5) continue;
      if (FALLS.some((f) => Math.hypot(x - f.lip.x, z - f.lip.z) < f.w + 3 || (Math.hypot(x - f.lip.x, z - f.lip.z) < 16 && Math.abs((x - f.lip.x) * f.t.x + (z - f.lip.z) * f.t.z) < f.w * 0.5 + 2.5))) continue;
      if (kept(x, z, 6) || solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 1)) continue;
      const y = groundAt(x, z), h = rr(11, 22) * (e > 2.4 ? 1.2 : 1);
      if (rnd() < 0.45) { const j = Math.floor(rnd() * 2), s = h / 17; pineI[j].push(M4(x, y - 0.2, z, rr(-0.04, 0.04), rr(0, 6), rr(-0.04, 0.04), s, s, s)); }
      else { const j = Math.floor(rnd() * 4), g = sprG[j], s = h / g.userData.H; sprI[j].push(M4(x, y - 0.1, z, rr(-0.03, 0.03), rr(0, 6), rr(-0.03, 0.03), s, s, s)); sprT.push(M4(x, y - 0.2, z, 0, 0, 0, 3.6 * s, s * 12.5, 3.6 * s)); }
      n++;
      if (e < 1.5 && rnd() < 0.25) perches.push({ x, y: y + h * 0.95, z, ry: rr(0, 6) });
    }
    sprG.forEach((g, k) => { if (sprI[k].length) mk(g, sprMat, sprI[k], true, false, forest); });
    pines.forEach((g, k) => { if (pineI[k].length) { mk(g.needles, pineMat, pineI[k], true, false, forest); mk(g.bark, pineBark, pineI[k], true, false, forest); } });
    mk(trunk, MAT.bark, sprT, true, false, forest);
    // сухие сосенки на уступах скал
    const PD = new Pack(); tube(PD, MAT.bark, [V(0, 0, 0), V(0.03, 0.4, 0.01), V(0.08, 0.75, 0.04), V(0.1, 1.0, 0.02)], 0.03, 6, 6);
    for (let k = 0; k < 7; k++) { const y = rr(0.3, 0.92), a = rr(0, 6.28), l = rr(0.06, 0.2) * (1.1 - y); beam(PD, MAT.bark, V(0.03 * y, y, 0), V(Math.cos(a) * l, y + rr(-0.04, 0.08), Math.sin(a) * l), 0.008, 4); }
    const deadG = mergeGeometries([...PD.parts.values()].flat(), false), dead = [];
    for (let k = 0; k < 60; k++) { const a = rr(-3.0, -0.2), [x, z] = ellP(a, rr(1.05, 1.15)), y = groundAt(x, z); if (FALLS.some((f) => Math.hypot(x - f.bot.x, z - f.bot.z) < f.w + 2)) continue; if (y < 3) continue; const h = rr(3, 7); dead.push(M4(x, y - 0.2, z, rr(-0.3, 0.3), rr(0, 6), rr(-0.3, 0.3), h, h, h)); }
    mk(deadG, MAT.bark, dead, true, true, forest);
    scene.add(forest);
    // горы и ельник кулисами
    const ridge = (peaks) => canvasTex(2048, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h); let y = h * 0.5; for (let x = 0; x <= w; x += 8) { y += (Math.random() - 0.5) * 18 * peaks; y = Math.max(h * 0.08, Math.min(h * 0.8, y)); if (Math.random() < 0.04) y -= 40 * peaks; g.lineTo(x, y); } g.lineTo(w, h); g.fill();
      for (let x = 0; x < w; x += 4 + Math.random() * 6) { const th = h * (0.1 + Math.random() * 0.12), bw = 3 + Math.random() * 5, by = h * 0.9; g.beginPath(); g.moveTo(x - bw, by); g.lineTo(x, by - th); g.lineTo(x + bw, by); g.fill(); } }, false);
    [[150, 70, 0, 1.0], [210, 110, 1, 1.6], [290, 150, 2, 2.2]].forEach(([r, hh, Ly, pk], i) => {
      const t = ridge(pk); t.wrapS = THREE.RepeatWrapping;
      const cg = new THREE.CylinderGeometry(r, r, hh, 96, 1, true); cg.translate(0, hh / 2 - 6, 0);
      const uv = cg.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setX(j, uv.getX(j) * (3 + i) + i * 0.37);
      const m = new THREE.Mesh(cg, backdropMat(t, Ly)); m.position.set(0, 0, -4); m.renderOrder = -1 - i; m.frustumCulled = false; scene.add(m);
    });
  }

  // ---------- берег и вода: папоротник, кусты, камыш, кувшинки, лотосы, камни ----------
  {
    const inBasin = (x, z, k = 1) => { const ex = (x - BASIN.x) / BASIN.rx, ez = (z - BASIN.z) / BASIN.rz; return ex * ex + ez * ez < k; };
    const nearWalk = (x, z, d) => walks.some((w) => segDistW(x, z, w) < d);
    // камыш у берегов и у острова
    const blade = new THREE.PlaneGeometry(0.05, 1, 1, 3); blade.translate(0, 0.5, 0); { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 0.8) + y * y * 0.12); } }
    const reeds = [];
    for (let k = 0; k < 4200; k++) { const x = rr(-40, 40), z = rr(-36, 30), y = groundAt(x, z); if (y < WATER_Y - 0.5 || y > 0.4 || nearWalk(x, z, 1.4) || kept(x, z, 2.5)) continue; if (Math.hypot(x - ISLE.x, z - ISLE.z) > 22 && inBasin(x, z, 0.8)) continue; const s = rr(0.6, 1.6); reeds.push(M4(x, y, z, rr(-0.15, 0.15), rr(0, 6), rr(-0.15, 0.15), 1, s, 1)); }
    mk(blade, paint({ base: '#3e5a3a', stroke: [0, 1, 0], strokeAmt: 0.25, side: THREE.DoubleSide, sway: 1.5, rim: 1.2, push: true }), reeds, false, false);
    // папоротник и кусты на острове и по берегам
    const ferns = [], bushes = [];
    for (let k = 0; k < 2600; k++) {
      const onIsle = k < 900;
      let x, z; if (onIsle) { const a = rr(0, 6.28), d = Math.sqrt(rnd()) * (rTop(a) + 2); x = ISLE.x + Math.cos(a) * d; z = ISLE.z + Math.sin(a) * d; } else { const a = rr(-Math.PI, Math.PI), [px, pz] = ellP(a, rr(0.98, 1.5)); x = px; z = pz; }
      const y = groundAt(x, z); if (y < WATER_Y + 0.05 || kept(x, z, 1.6) || nearWalk(x, z, 1.0)) continue;
      if (Math.hypot(x - ISLE.x, z - ISLE.z) < RC + 2.4) continue;                   // у самых стен — трава и мох (ниже), папоротник дальше
      { const [lx, lz] = [(x - ISLE.x) * cs - (z - ISLE.z) * sn, (x - ISLE.x) * sn + (z - ISLE.z) * cs]; if (Math.abs(lx) < 3 && lz > 0 && lz < 12) continue; }
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 0.3)) continue;
      const s = rr(0.6, 1.4);
      if (onIsle && Math.hypot(x - ISLE.x, z - ISLE.z) > rTop(Math.atan2(z - ISLE.z, x - ISLE.x)) - 0.5) continue;
      if (onIsle || rnd() < 0.75) ferns.push(M4(x, y, z, 0, rr(0, 6), 0, s, s * rr(0.8, 1.2), s)); else bushes.push(M4(x, y, z, 0, rr(0, 6), 0, s * rr(1, 1.5), s, s * rr(1, 1.5)));
    }
    // трава пучками: вокруг дома и по двору, по склону острова, по берегу — от бурой у глины к сизо-зелёной на лугу
    { const tG = [], tD = [];
      const ok = (x, z, y) => !(y < WATER_Y + 0.08 || nearWalk(x, z, 0.75) || solids.some((s2) => (s2.y1 === undefined || s2.y1 > y) && Math.hypot(s2.x - x, s2.z - z) < s2.r + 0.05));
      for (let k = 0; k < 2600; k++) { const a = rr(0, 6.28), d = rr(AP0 + 0.35, rTop(a) + 2.5) * (k < 1500 ? 1 : 1), x = ISLE.x + Math.cos(a) * (k < 1500 ? Math.min(d, RC + 3.5) : d), z = ISLE.z + Math.sin(a) * (k < 1500 ? Math.min(d, RC + 3.5) : d), y = groundAt(x, z); if (!ok(x, z, y)) continue; const sc = rr(0.7, 1.5); (rnd() < 0.3 ? tD : tG).push(M4(x, y - 0.02, z, rr(-0.1, 0.1), rr(0, 6), rr(-0.1, 0.1), sc, sc * rr(0.8, 1.4), sc)); }
      for (let k = 0; k < 5200; k++) { const a = rr(-Math.PI, Math.PI), [x, z] = ellP(a, rr(0.9, 1.45)), y = groundAt(x, z); if (y > 3.5 || !ok(x, z, y) || kept(x, z, 1.2)) continue; const dry = ss(1.2, 0.2, y); const sc = rr(0.8, 1.7); (rnd() < dry * 0.8 ? tD : tG).push(M4(x, y - 0.02, z, rr(-0.1, 0.1), rr(0, 6), rr(-0.1, 0.1), sc, sc * rr(0.9, 1.6), sc)); }
      mk(TUFT, M.grass, tG, false, false); mk(TUFT, M.grassDry, tD, false, false);
    }
    mk(vegFern(1), paint({ base: '#ffffff', vcol: true, noFlip: true, moss: '#3e6a4a', mossAmt: 0.3, stroke: [0, 1, 0], strokeAmt: 0.3, side: THREE.DoubleSide, sway: 0.8, rim: 0.9, push: true }), ferns, false, false);
    { const bm = paint({ base: '#ffffff', vcol: true, noFlip: true, side: THREE.DoubleSide, sway: 0.5, stroke: [0, -1, 0.3], strokeAmt: 0.3, break: 0.4, rim: 0.9 }); mk(bushGeo(1), bm, bushes.filter((_, i) => i % 2 === 0), true, false); mk(bushGeo(2, true), bm, bushes.filter((_, i) => i % 2 === 1), true, false); }
    // камни по берегу
    const rock = new THREE.DodecahedronGeometry(1, 1); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.8 + 0.3 * Math.sin(i * 5.3); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.6, p.getZ(i) * k); } rock.computeVertexNormals(); }
    const rocks = [];
    for (let k = 0; k < 220; k++) { const a = rr(-Math.PI, Math.PI), [x, z] = ellP(a, rr(0.94, 1.3)); if (nearWalk(x, z, 1.5) || kept(x, z, 3) || (z > 14 && Math.abs(x - pathX(z)) < 3)) continue; const s = rr(0.4, 1.5); if (Math.abs(groundAt(x + s, z) - groundAt(x - s, z)) + Math.abs(groundAt(x, z + s) - groundAt(x, z - s)) > 1.2) continue; rocks.push(M4(x, footY(x, z, s * 0.6, 'камень') - s * 0.15, z, rr(0, 1), rr(0, 6), rr(0, 1), s, s, s)); }
    mk(rock, M.stone, rocks);
    // кувшинки: гуще на переднем плане и у острова; лотосы светятся сиреневым
    const pad = new THREE.CircleGeometry(0.34, 10, 0.3, 5.9); pad.rotateX(-Math.PI / 2);
    const pads = [], flowers = [];
    for (let k = 0; k < 2600; k++) {
      const x = rr(-34, 34), z = rr(-30, 26);
      if (groundAt(x, z) > WATER_Y - 0.1 || !inBasin(x, z, 0.96)) continue;
      const near = (z > 4 ? 1 : 0.35) + (Math.hypot(x - ISLE.x, z - ISLE.z) < 20 ? 0.4 : 0);
      if (rnd() > near * 0.6) continue;
      if (FALLS.some((f) => Math.hypot(x - f.bot.x, z - f.bot.z) < f.w + 4)) continue;
      const s = rr(0.7, 1.9); pads.push(M4(x, WATER_Y + 0.02, z, 0, rr(0, 6.28), 0, s, 1, s)); lilyPads.push([x, z]);
      if (rnd() < 0.09) flowers.push([x + 0.05, z, s]);
    }
    mk(pad, M.pad, pads, false, false);
    // лотос: внешние лепестки раскрыты, внутренние сомкнуты, в сердце свет
    const LP = new Pack();
    const petal = new THREE.SphereGeometry(0.5, 7, 5); petal.scale(0.32, 0.1, 1); petal.translate(0, 0, 0.5);
    for (let k = 0; k < 8; k++) LP.add(M.lotus, petal, M4(0, 0.03, 0, -0.35, k * Math.PI / 4, 0, 0.42, 0.42, 0.42));
    for (let k = 0; k < 6; k++) LP.add(M.lotus, petal, M4(0, 0.05, 0, -0.95, k * Math.PI / 3 + 0.3, 0, 0.32, 0.32, 0.32));
    const lotusGeo = mergeGeometries([...LP.parts.values()].flat(), false);
    const fm = flowers.map(([x, z, s]) => M4(x, WATER_Y + 0.05, z, 0, rr(0, 6), 0, s * 0.75, s * 0.75, s * 0.75));
    mk(lotusGeo, M.lotus, fm, false, false);
    mk(new THREE.SphereGeometry(0.06, 6, 4), M.lotusIn, flowers.map(([x, z, s]) => M4(x, WATER_Y + 0.11 * s, z, 0, 0, 0, s, s, s)), false, false);
    flowers.forEach(([x, z, s], i) => { if (i % 5 === 0) halos.push({ p: V(x, WATER_Y + 0.15, z), col: [0.6, 0.5, 1.0], s: 0.25 * s }); });
    // крупные лотосы на переднем плане (как на концепте)
    for (const [x, z, s] of [[-12.5, 19.5, 2.4], [-4.5, 17.0, 1.9], [3.5, 19.8, 1.6], [9.2, 15.6, 1.7], [12.6, 18.2, 2.1], [-1.5, 11.5, 1.5]]) {
      if (groundAt(x, z) > WATER_Y - 0.1) continue;
      P.add(M.pad, pad, M4(x, WATER_Y + 0.02, z, 0, rr(0, 6), 0, s * 1.6, 1, s * 1.6));
      for (const g of LP.parts.get(M.lotus)) P.add(M.lotus, g, M4(x, WATER_Y + 0.05, z, 0, rr(0, 6), 0, s * 0.85, s * 0.85, s * 0.85));
      PG.add(M.lotusIn, new THREE.SphereGeometry(0.06, 6, 4), M4(x, WATER_Y + 0.12 * s, z, 0, 0, 0, s, s, s));
      if (s >= 2.1) addLight(V(x, 0.6, z), VIOLET, 3.0, 0.1); halos.push({ p: V(x, WATER_Y + 0.2, z), col: [0.6, 0.5, 1.0], s: 0.32 * s });
    }
  }

  // ---------- туман над водой, брызги водопадов ----------
  {
    for (let k = 0; k < 34; k++) {
      const a = rr(0, 6.28), r = Math.sqrt(rnd()), x = BASIN.x + Math.cos(a) * BASIN.rx * r * 0.95, z = BASIN.z + Math.sin(a) * BASIN.rz * r * 0.95;
      if (kept(x, z, 5)) continue;
      mists.push(addMist(scene, V(x, rr(0.2, 1.4), z), rr(10, 22), rr(1.4, 3.2), k % 3 ? '#1f4a48' : '#2f6a62', rr(0.12, 0.22), k + 40, true));
    }
    // клубы брызг у подножий (тем же шейдером дыма, но белёсые и низко)
    { const A = [], Pp = [], Tt = [];
      for (const s of anim.smoke) if (s.falls) for (let k = 0; k < 16; k++) { A.push(s.x + rr(-s.w * 0.4, s.w * 0.4), s.y, s.z + rr(-0.5, 0.5), rr(3, 6)); Pp.push(k / 16 + rr(-0.03, 0.03), 1 / rr(4, 7), rr(0.8, 1.6), rnd()); Tt.push(0); }
      const g = new THREE.IcosahedronGeometry(1, 2); const im = new THREE.InstancedMesh(g, puffMat(), A.length / 4); im.geometry = g.clone();
      im.geometry.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); im.geometry.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 4)); im.geometry.setAttribute('aT', new THREE.InstancedBufferAttribute(new Float32Array(Tt), 1));
      im.material.uniforms.uWind.value.set(0.15, 0.1); im.frustumCulled = false; scene.add(im); anim.puffs = im; }
  }

  // ---------- лунные столбы: сквозь кроны рамки вниз, к центру сцены ----------
  {
    const sd = MOON_DIR.clone(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), sd);
    const hits = [[0, 14], [3, 15.5], [5.5, 12.5], [1.5, 10.5], [-2.2, 16.2]];
    hits.forEach(([hx, hz], i) => {
      const len = 34, rad = rr(0.35, 0.8);
      const g = new THREE.CylinderGeometry(rad * 0.55, rad * 1.35, len, 14, 1, true); g.translate(0, len / 2, 0);
      const m = new THREE.Mesh(g, shaftMat(i % 3 ? '#a8d4f0' : '#dceaff', { a: rr(0.04, 0.055), seed: i * 3.7, flow: 0.05 }));
      m.position.set(hx, WATER_Y, hz); m.quaternion.copy(q); m.renderOrder = 3; scene.add(m);
      // пятно света на воде
      halos.push({ p: V(hx, WATER_Y + 0.05, hz), col: [0.25, 0.34, 0.45], s: rad * 1.1 });
    });
    // из окон
    const mats = new Map();
    for (const sh of shafts) {
      const d = sh.d.clone().normalize(), side = V(-d.z, 0, d.x).normalize(), upv = new THREE.Vector3().crossVectors(side, d).normalize();
      const e = 2.0, pos = [], uv = [], idx = [], csq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const P0 = csq.map(([a, b]) => sh.p.clone().addScaledVector(side, a * sh.w / 2).addScaledVector(upv, b * sh.h / 2));
      const P1 = csq.map(([a, b]) => sh.p.clone().addScaledVector(d, sh.len).addScaledVector(side, a * sh.w * e / 2).addScaledVector(upv, b * sh.h * e / 2));
      for (let k = 0; k < 4; k++) { const o = pos.length / 3, k2 = (k + 1) % 4; for (const v of [P0[k], P0[k2], P1[k2], P1[k]]) pos.push(v.x, v.y, v.z); uv.push(0, 0.55, 1, 0.55, 1, 0, 0, 0); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const key = sh.col.join() + sh.a; if (!mats.has(key)) mats.set(key, { m: shaftMat(new THREE.Color(...sh.col), { a: sh.a * 0.45, seed: mats.size, flow: 0.02, side: true }), list: [] });
      mats.get(key).list.push(g);
    }
    for (const { m, list } of mats.values()) { const mesh = new THREE.Mesh(mergeGeometries(list, false), m); mesh.renderOrder = 3; scene.add(mesh); }
  }

  // ---------- ореолы, капель ----------
  {
    { const A = [], Pp = [];
      for (const d of drips) { const fl = Math.max(groundAt(d.x, d.z), WATER_Y); A.push(d.x, d.y, d.z, fl); Pp.push(rnd(), rr(1.6, 4.5)); }
      const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
      g.index = q.index; g.setAttribute('position', q.attributes.position);
      g.setAttribute('aSrc', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(Pp), 2));
      g.instanceCount = A.length / 4; const m = new THREE.Mesh(g, dripMat()); m.frustumCulled = false; m.renderOrder = 4; scene.add(m); }
    const g = new THREE.InstancedBufferGeometry(); const pl = new THREE.PlaneGeometry(1, 1);
    g.index = pl.index; g.setAttribute('position', pl.attributes.position);
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => [h.p.x, h.p.y, h.p.z])), 3));
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => h.col)), 3));
    g.setAttribute('aS', new THREE.InstancedBufferAttribute(new Float32Array(halos.flatMap((h) => [h.s, rnd() * 3])), 2));
    g.instanceCount = halos.length;
    const m = new THREE.Mesh(g, haloMat()); m.frustumCulled = false; m.renderOrder = 4; scene.add(m);
  }

  // мох у оснований (стволы, валуны), чтобы не было резкого входа в землю
  for (const [x, z, r] of bases) { const y = groundAt(x, z); if (y < WATER_Y) continue; P.add(M.mossDark, MOSS_LITE, M4(x, y + 0.02, z, 0, rr(0, 6), 0, Math.min(r, 1.2) * rr(0.4, 0.6), rr(0.1, 0.18), Math.min(r, 1.2) * rr(0.4, 0.6))); }

  scene.add(P.build(true, true));
  scene.add(PG.build(false, false));
  if (typeof window !== 'undefined') window.__lairPropAudit = { n: propLog.length, buried: propLog.filter((q) => q.top - q.y > 0.8).map((q) => q.name + '@' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ' ' + (q.top - q.y).toFixed(2)) };
  const base = PLAT_Y;
  return { solids, lights, walks, anim, mists, perches, lilyPads, waterMesh, TREE: ISLE, ISLE, base, groundAt, BASIN, leafSrc, FALLS, door: anim.door };
}

export const MOON_DIR = new THREE.Vector3(-0.22, 0.9, 0.38).normalize();

function addMist(scene, p, w, h, col, a, seed, themeOnly = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mist(col, { a, seed, themeOnly }));
  m.position.copy(p); m.scale.set(w, h, 1); m.renderOrder = 2; m.userData.rise = undefined; scene.add(m); return m;
}
function segDistW(x, z, w) {
  const ax = w.a[0], az = w.a[1], bx = w.b[0], bz = w.b[1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
export function segDist(x, z, w) { return segDistW(x, z, w); }
export function segT(x, z, w) {
  const ax = w.a[0], az = w.a[1], dx = w.b[0] - ax, dz = w.b[1] - az, L2 = dx * dx + dz * dz;
  return Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L2 || 1)));
}
// точка в осях терема: lx вправо, lz от центра к двери
export const AP_R = AP0;
export function houseLocal(lx, lz) { const c = Math.cos(FACE), s = Math.sin(FACE); return [ISLE.x + lx * c + lz * s, ISLE.z - lx * s + lz * c]; }
export const STAIR = { top: ST_TOP, dir: SD, len: ST_LEN, w: ST_W };
export const PORCH_FRONT = GATE.front;
