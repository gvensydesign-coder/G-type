// Логово Водяного (по концепту Michael): горное озеро в чаше скал, четыре водопада, посреди — каменный остров,
// на нём большой восьмигранный терем Водяного под конусной кровлей в ракушках, морских звёздах и костяных шипах.
// Центр озера (0, -4). Богатырь приходит с юга по ущелью, к острову — бродом по колено, наверх — каменной лестницей.
// Водяной 3,0 м (Леший 2,5 м, богатырь 1,53 м): дверь 3,3 м, стены 4,6 м, ступени 0,24 м.
import * as THREE from 'three';
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
const RC = 5.4, AP = RC * Math.cos(Math.PI / 8);           // восьмигранник: радиус углов и апофема (по оси брёвен)
const LOG_R = 0.2, LOG_STEP = 0.38, ROWS = 12;
export const WALL_TOP = FLOOR_Y + LOG_R + (ROWS - 1) * LOG_STEP + LOG_R;   // ≈ 8,13
const CONE_H = 7.5, CONE_K = CONE_H / RC, APEX = WALL_TOP + CONE_H, EAVE_R = 7.2;
const coneY = (r) => APEX - CONE_K * r;
const DOOR_W = 1.9, DOOR_H = 3.3;
const PORCH = { front: 8.6, half: 2.3, ridge: 8.45, eave: 6.85 };   // крыльцо: вынос, полуширина, конёк, свес (выше головы Водяного 6,55)
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
  { a: -1.97, w: 5.6, ledge: 0.5 }, { a: -1.7, w: 3.2, ledge: 0 }, { a: -1.18, w: 6.4, ledge: 0.44 }, { a: -0.8, w: 4.0, ledge: 0 },
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
  cliff: paint({ base: '#59645e', moss: '#3e5a3c', mossAmt: 0.5, strokeAmt: 0.2, stroke: [0, 1, 0], break: 0.3, map: stoneTex, mapRep: [0.35, 0.35], mapGain: 1.5, drip: 0.6 }),
  stone: paint({ base: '#5f6660', moss: '#46623a', mossAmt: 0.6, strokeAmt: 0.14, map: stoneTex, mapRep: [1, 1], mapGain: 1.4, wet: 0.3 }),
  step: paint({ base: '#6a6c62', moss: '#4a6638', mossAmt: 0.45, strokeAmt: 0.12, map: stoneTex, mapRep: [1.2, 1.2], mapGain: 1.3, wet: 0.4 }),
  log: paint({ base: '#3f4a3c', moss: '#3e5a32', mossAmt: 0.35, stroke: [1, 0, 0], strokeAmt: 0.16, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.45 }),
  post: paint({ base: '#33392f', moss: '#3e5a32', mossAmt: 0.4, stroke: [0, 1, 0], strokeAmt: 0.14, map: MAT.log.uniforms.uMap.value, mapRep: [1 / 1.5, 1 / 0.4], mapGain: 1.4 }),
  thatch: paint({ base: '#36403e', moss: '#46564a', mossAmt: 0.25, stroke: [0, 1, 0], strokeAmt: 0.42, break: 0.36, side: THREE.DoubleSide, drip: 0.4, rim: 0.8 }),
  thatchDark: paint({ base: '#202a24', strokeAmt: 0.2, stroke: [0, 1, 0], side: THREE.DoubleSide, rim: 0.2 }),
  shell: paint({ base: '#d8c8b4', strokeAmt: 0.12, stroke: [1, 0, 0], rim: 1.4, break: 0.2, side: THREE.DoubleSide, emit: [0.03, 0.04, 0.045] }),
  shellPink: paint({ base: '#c89c94', strokeAmt: 0.12, stroke: [1, 0, 0], rim: 1.4, break: 0.2, side: THREE.DoubleSide, emit: [0.03, 0.03, 0.04] }),
  star: paint({ base: '#b84a2a', strokeAmt: 0.15, rim: 1.2, break: 0.25, emit: [0.06, 0.015, 0.0] }),
  bone: paint({ base: '#cfc4a8', strokeAmt: 0.1, break: 0.18, rim: 1.3, moss: '#5a7a4a', mossAmt: 0.15 }),
  bronze: paint({ base: '#8a6a34', strokeAmt: 0.08, rim: 1.6, wet: 0.6, moss: '#3f7a5a', mossAmt: 0.3 }),
  iron: MAT.iron, dark: MAT.dark,
  rope: MAT.rope,
  ropeRed: paint({ base: '#8a2a1e', strokeAmt: 0.2, stroke: [1, 0, 0], rim: 0.8 }),
  pad: paint({ base: '#2c4c40', strokeAmt: 0.2, rim: 0.5, wet: 0.8, bob: true, moss: '#577a3a', mossAmt: 0.3 }),
  lotus: paint({ base: '#a67ad8', strokeAmt: 0.15, stroke: [0, 1, 0], rim: 1.6, emit: [0.16, 0.07, 0.24], side: THREE.DoubleSide, bob: true }),
  lotusIn: glow('#e8b8ff', { k: 1.25, flick: 0.1 }),
  winRed: glow('#ff6a3a', { k: 2.3, flick: 0.5 }),
  inRed: glow('#ff5a2a', { k: 0.85, flick: 0.5 }),
  lampRed: glow('#ff4a2a', { k: 2.6, flick: 0.6 }),
  lampGreen: glow('#5affd6', { k: 2.2, flick: 0.35 }),
  amulet: glow('#ffc65a', { k: 2.4, flick: 0.25 }),
  rune: glow('#6af0d8', { k: 1.9, flick: 0.3 }),
  eye: glow('#7affe0', { k: 2.6, flick: 0.2 }),
  candle: MAT.candle,
  wood: MAT.wood, woodDark: MAT.woodDark, plank: MAT.plank, plankOld: MAT.plankOld, moss: MAT.moss, bark: MAT.bark, leaf: MAT.leaf,
};
M.mossDark = paint({ base: '#2c4232', strokeAmt: 0.25, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.0, rim: 0.3, break: 0.3 });
M.leafTeal = paint({ base: '#2f4a3a', strokeAmt: 0.3, stroke: [0, 1, 0], side: THREE.DoubleSide, sway: 1.4, rim: 0.9, break: 0.35 });
for (const k of ['rope', 'ropeRed', 'moss', 'mossDark', 'leaf', 'leafTeal', 'thatchDark']) M[k].userData.noInk = true;

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
        vec3 deep = vec3(0.05, 0.17, 0.19), mid = vec3(0.2, 0.46, 0.5), hi = vec3(0.62, 0.88, 0.88);
        float tone = n * 0.6 + s * 0.5 + (1.0 - edge) * -0.25;
        vec3 c = tone > 0.62 ? hi : (tone > 0.38 ? mid : deep);
        c = mix(c, hi, step(0.78, s2) * 0.8);
        float foam = smoothstep(0.12, 0.0, y + (n - 0.5) * 0.06); c = mix(c, hi * 1.1, foam);
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
const _up = new THREE.Vector3(0, 0, 1);
// плоская вещь лицом по нормали n, с поворотом вокруг нормали
function onSurface(pack, mat, geo, p, n, spin, s) {
  const q = new THREE.Quaternion().setFromUnitVectors(_up, n.clone().normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(_up, spin));
  pack.add(mat, geo, new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, s, s)));
}
// фонарь «летучая мышь»: поддон, стекло светится, четыре прута, колпак, кольцо
function lamp(P, PG, x, y, z, s, glowMat) {
  P.add(M.iron, new THREE.CylinderGeometry(0.15 * s, 0.17 * s, 0.06 * s, 10), M4(x, y - 0.2 * s, z));
  PG.add(glowMat, new THREE.CylinderGeometry(0.11 * s, 0.13 * s, 0.32 * s, 10), M4(x, y - 0.01 * s, z));
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; beam(P, M.iron, V(x + Math.cos(a) * 0.145 * s, y - 0.2 * s, z + Math.sin(a) * 0.145 * s), V(x + Math.cos(a) * 0.12 * s, y + 0.17 * s, z + Math.sin(a) * 0.12 * s), 0.012 * s, 4); }
  P.add(M.iron, new THREE.CylinderGeometry(0.06 * s, 0.17 * s, 0.14 * s, 10), M4(x, y + 0.23 * s, z));
  P.add(M.iron, new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.06 * s, 6), M4(x, y + 0.33 * s, z));
  P.add(M.iron, new THREE.TorusGeometry(0.07 * s, 0.012 * s, 4, 10), M4(x, y + 0.42 * s, z));
  return V(x, y, z);
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
function idol(P, PG, x, z, h, rotY, o = {}) {
  const y0 = groundAt(x, z) - 0.5;
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const fw = (lz) => V(x + s * lz, 0, z + c * lz);
  for (let k = 0; k < 5; k++) { const a = k * 1.3, r = rr(0.45, 0.7); P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.22, 0.34), 0), M4(x + Math.cos(a) * r, y0 + 0.55, z + Math.sin(a) * r, rr(0, 3), rr(0, 3), 0, 1, 0.7, 1)); }
  box(P, M.post, 0.5, h + 0.5, 0.5, M4(x, y0 + (h + 0.5) / 2, z, 0, rotY, 0));
  const faces = o.faces || 2;
  for (let k = 0; k < faces; k++) {
    const fy = y0 + 0.5 + h * (0.3 + 0.36 * k);
    box(P, M.woodDark, 0.6, 0.12, 0.6, M4(x, fy - 0.42, z, 0, rotY, 0));
    box(P, M.woodDark, 0.56, 0.5, 0.12, M4(...fw(0.27).toArray().map((v, i) => (i === 1 ? fy : v)), 0, rotY, 0));     // лоб-маска
    for (const sd of [-1, 1]) { const p = fw(0.34); PG.add(M.eye, new THREE.SphereGeometry(0.045, 6, 4), M4(p.x + c * sd * 0.12, fy + 0.04, p.z - s * sd * 0.12)); }
    box(P, M.dark, 0.26, 0.06, 0.04, M4(...fw(0.34).toArray().map((v, i) => (i === 1 ? fy - 0.14 : v)), 0, rotY, 0));  // рот
    // руны по бокам
    for (const sd of [-1, 1]) PG.add(M.rune, new THREE.PlaneGeometry(0.06, 0.32), M4(x + c * sd * 0.255, fy - 0.05, z - s * sd * 0.255, 0, rotY + sd * Math.PI / 2, 0));
  }
  const top = y0 + h + 0.5;
  box(P, M.woodDark, 0.66, 0.1, 0.66, M4(x, top + 0.05, z, 0, rotY, 0));
  fishSkull(P, PG, x, top + 0.38, z, 0.75, rotY, true);
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
// большой рыбий скелет: хребет дугой, рёбра, голова, хвост
function fishSkeleton(P, PG, a, b, s = 1) {
  const d = b.clone().sub(a), L = d.length(); d.normalize();
  const side = V(-d.z, 0, d.x).normalize();
  const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(a.clone().lerp(b, t).add(V(0, Math.sin(t * Math.PI) * 0.5 * s, 0))); }
  tube(P, M.bone, pts, 0.12 * s, 7, 18);
  const curve = new THREE.CatmullRomCurve3(pts);
  for (let k = 1; k < 15; k++) {
    const t = 0.1 + k / 15 * 0.72, p = curve.getPoint(t), rl = (1.5 - Math.abs(t - 0.4) * 1.6) * s;
    for (const sd of [-1, 1]) {
      const o = side.clone().multiplyScalar(sd);
      tube(P, M.bone, [p, p.clone().addScaledVector(o, rl * 0.55).add(V(0, rl * 0.45, 0)), p.clone().addScaledVector(o, rl * 0.85).add(V(0, rl * 0.05, 0)), p.clone().addScaledVector(o, rl * 0.8).add(V(0, -rl * 0.45, 0))], 0.045 * s, 5, 6);
    }
    if (k % 2) beam(P, M.bone, p, p.clone().add(V(0, 0.55 * s, 0)), 0.03 * s, 4);   // остистые
  }
  const yaw = Math.atan2(-d.x, -d.z);
  fishSkull(P, PG, a.x - d.x * 0.6 * s, a.y + 0.35 * s, a.z - d.z * 0.6 * s, 1.9 * s, yaw, false);
  for (const sd of [-1, 1]) tube(P, M.bone, [b, b.clone().addScaledVector(d, 0.8 * s).add(V(0, sd * 0.7 * s, 0)), b.clone().addScaledVector(d, 1.3 * s).add(V(0, sd * 1.1 * s, 0))], 0.05 * s, 5, 6);
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
    const cMud = new THREE.Color('#2c3428'), cMoss = new THREE.Color('#3d5a34'), cRock = new THREE.Color('#4c5550'), cRockD = new THREE.Color('#333c3a'), cNeedle = new THREE.Color('#3c3a2c'), cGrass = new THREE.Color('#4f6c3c');
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundAt(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), ny = nrm.getY(i);
      const wet = ss(0.25, -0.4, y), steep = ss(0.82, 0.55, ny);
      const c = cNeedle.clone().lerp(cMoss, 0.5 + n2(x * 2.3, z * 2.3) * 0.45).lerp(cGrass, ss(0.2, 0.9, n2(x * 0.7 + 3, z * 0.7)) * 0.5).lerp(cMud, wet).lerp(n2(x * 1.9, y * 1.3) > 0 ? cRock : cRockD, steep);
      const di = Math.hypot(x - ISLE.x, z - ISLE.z); if (di < 18) c.lerp(cRockD, 0.45 * ss(18, 9, di) * (0.6 + 0.4 * n2(x * 3.1, z * 2.7)));
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
    const inFall = (a, e, pad) => FALLS.some((f) => { const [fx, fz] = ellP(f.a, e), [px, pz] = ellP(a, e); return Math.hypot(fx - px, fz - pz) < f.w * 0.5 + pad; });
    for (let a = -3.35; a < 0.25; a += rr(0.06, 0.1)) {
      const north = ss(0.25, -0.75, Math.sin(a));
      if (north < 0.3) continue;
      // передний ряд — низкие уступы у воды
      if (!inFall(a, 1.05, 1.2)) {
        const [x, z] = ellP(a, rr(1.03, 1.07)), H = cliffH(x, z).h, w = rr(2.6, 5), h = Math.max(2.5, rr(0.25, 0.6) * 24 * north) + 2.2, yaw = Math.atan2(BASIN.x - x, BASIN.z - z);
        front.push(M4(x, -2 + h / 2, z, rr(-0.05, 0.05), yaw + rr(-0.25, 0.25), rr(-0.06, 0.06), w, h, rr(2.5, 4.5)));
        if (rnd() < 0.5) ledges.push([x, -2 + h + 0.05, z, yaw]);
      }
      // задний ряд — стена до верха и выше
      if (!inFall(a, 1.14, 0.9)) {
        const [x, z] = ellP(a, rr(1.12, 1.18)), top = cliffH(...ellP(a, 1.22)).h, w = rr(3, 6), h = top + rr(-1, 4) + 2, yaw = Math.atan2(BASIN.x - x, BASIN.z - z);
        back.push(M4(x, -2 + h / 2, z, rr(-0.04, 0.04), yaw + rr(-0.2, 0.2), rr(-0.05, 0.05), w, h, rr(4, 6)));
        if (rnd() < 0.6) ledges.push([x, -2 + h + 0.02, z, yaw]);
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
      const segs = f.ledge ? [[top, top.clone().lerp(bot, 0.5).add(V(0, (f.ledge - 0.5) * (top.y - bot.y), 0)).addScaledVector(f.n, 0.8)], null] : [[top, bot]];
      if (f.ledge) { const mid = segs[0][0].clone(); mid.y = lerp(bot.y, top.y, f.ledge); const m2 = mid.clone().addScaledVector(f.n, 1.6); segs[0][1] = mid.clone().addScaledVector(f.n, 0.2); segs[1] = [m2, bot.clone().addScaledVector(f.n, 0.6)];
        // полка: широкая плита под первым ярусом, вода с неё срывается
        box(P, M.cliff, f.w + 3.2, 1.6, 3.2, M4(mid.x + f.n.x * 0.8, mid.y - 0.85, mid.z + f.n.z * 0.8, 0, Math.atan2(f.n.x, f.n.z), 0));
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(f.w + 1.0, 2.2, 6, 3), fallsMat(i * 7.1 + 3, 0.35)); pool.rotation.set(-Math.PI / 2, 0, Math.atan2(f.n.x, f.n.z)); pool.position.set(mid.x + f.n.x * 0.9, mid.y + 0.02, mid.z + f.n.z * 0.9); scene.add(pool);
        mists.push(addMist(scene, V(m2.x, mid.y + 0.6, m2.z), f.w * 1.3, 2.2, '#6ec8c0', 0.14, i * 3));
      }
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
      mists.push(addMist(scene, V(base.x, 0.9, base.z), f.w * 2.0, 3.0, '#6ec8c0', 0.16, i * 5 + 1));
      mists.push(addMist(scene, V(base.x + f.n.x * 2.5, 2.4, base.z + f.n.z * 2.5), f.w * 2.6, 4.5, '#3f8e88', 0.1, i * 5 + 2));
      for (let k = 0; k < 6; k++) { const q = base.clone().addScaledVector(f.t, rr(-f.w * 0.6, f.w * 0.6)).addScaledVector(f.n, rr(-0.5, 1.5)); P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.4, 0.9), 0), M4(q.x, WATER_Y - 0.15, q.z, rr(0, 3), rr(0, 3), 0, 1, 0.55, 1)); }
      addLight(V(base.x + f.n.x * 1.5, 1.6, base.z + f.n.z * 1.5), CYAN, 8 + f.w, 0.15, 1);
      halos.push({ p: V(base.x, 1.2, base.z), col: [0.4, 0.95, 1.0], s: f.w * 0.3 });
      anim.smoke.push({ falls: true, x: base.x, y: 0.2, z: base.z, w: f.w });
    });
  }

  // ---------- остров: валуны по склону, лестница, причал ----------
  {
    const rock = new THREE.DodecahedronGeometry(1, 0); { const p = rock.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.72); rock.computeVertexNormals(); }
    const boulders = [];
    for (let ring = 0; ring < 3; ring++) {
      const n = [46, 40, 30][ring];
      for (let k = 0; k < n; k++) {
        const a = k / n * 6.283 + rr(-0.05, 0.05) + ring * 0.3, rt = rTop(a), d = rt + [0.5, 2.6, 4.8][ring] + rr(-0.3, 0.3);
        const x = ISLE.x + Math.cos(a) * d, z = ISLE.z + Math.sin(a) * d;
        const [s, l] = stairLocal(x, z);
        if (s > -1.2 && s < ST_LEN + LANDING.len + 0.8 && Math.abs(l) < ST_W / 2 + 0.5) continue;
        const sc = [rr(0.6, 1.1), rr(1.0, 1.8), rr(0.9, 1.6)][ring];
        boulders.push(M4(x, footY(x, z, sc * 0.6, 'валун') + sc * 0.25, z, rr(-0.3, 0.3), rr(0, 6), rr(-0.3, 0.3), sc * rr(1, 1.5), sc, sc * rr(1, 1.4)));

      }
    }
    // борта лестницы: каменные глыбы вдоль, по ним мох; ступени — плиты с выщербленным краем
    for (let j = 0; j < ST_N; j++) {
      const s0 = j * ST_RUN, sc = s0 + ST_RUN / 2, yTop = stepTop(sc);
      const cx = ST_TOP[0] + SD[0] * sc, cz = ST_TOP[1] + SD[1] * sc;
      box(P, M.step, ST_W + rr(-0.06, 0.06), 0.7, ST_RUN + 0.08, M4(cx, yTop - 0.35, cz, rr(-0.01, 0.01), STAIR_YAW + rr(-0.02, 0.02), rr(-0.015, 0.015)));
      if (rnd() < 0.5) P.add(M.moss, MOSS_LITE, M4(cx + SP[0] * rr(-1, 1), yTop + 0.01, cz + SP[1] * rr(-1, 1), 0, rr(0, 6), 0, rr(0.2, 0.4), 0.08, rr(0.15, 0.3)));
      for (const sd of [-1, 1]) if (j % 2 === 0) { const x = cx + SP[0] * sd * (ST_W / 2 + 0.55), z = cz + SP[1] * sd * (ST_W / 2 + 0.55); boulders.push(M4(x, yTop - 0.1, z, rr(-0.2, 0.2), rr(0, 6), rr(-0.2, 0.2), rr(0.6, 0.85), rr(0.7, 1.0), rr(0.7, 0.9))); }
    }
    walks.push({ a: [ST_TOP[0] + SD[0] * (ST_LEN + 0.15), ST_TOP[1] + SD[1] * (ST_LEN + 0.15)], b: [ST_TOP[0] - SD[0] * 0.1, ST_TOP[1] - SD[1] * 0.1], w: ST_W * 0.95, ya: 0.1, yb: PLAT_Y, y: PLAT_Y, ramp: true });
    // причальная плита на камнях, у неё сваи с канатом и зелёные фонари
    { const cx = LANDING.x, cz = LANDING.z;
      box(P, M.step, ST_W + 1.0, 0.5, LANDING.len, M4(cx, LANDING.y - 0.25, cz, 0, STAIR_YAW, 0));
      for (const sd of [-1, 1]) for (const fw of [-1, 1]) { const x = cx + SP[0] * sd * 1.5 + SD[0] * fw * 1.0, z = cz + SP[1] * sd * 1.5 + SD[1] * fw * 1.0; boulders.push(M4(x, groundAt(x, z) + 0.2, z, rr(0, 1), rr(0, 6), 0, 0.9, 0.8, 0.9)); }
      walks.push({ a: [cx - SD[0] * 1.2, cz - SD[1] * 1.2], b: [cx + SD[0] * 1.2, cz + SD[1] * 1.2], w: ST_W + 0.8, y: LANDING.y });
      // ступень из воды на плиту: со стороны брода
      { const fx = SHORE[0] - cx, fz = SHORE[1] - cz, fl = Math.hypot(fx, fz), ux = fx / fl, uz = fz / fl, yaw = Math.atan2(ux, uz);
        for (let k = 0; k < 2; k++) { const d = 1.75 + k * 0.5, sx = cx + ux * d, sz = cz + uz * d, top = -0.14 - k * 0.2; box(P, M.step, 2.4, 0.5, 0.55, M4(sx, top - 0.25, sz, 0, yaw, 0)); walks.push({ a: [sx - ux * 0.25, sz - uz * 0.25], b: [sx + ux * 0.25, sz + uz * 0.25], w: 2.3, y: top }); } }
      for (const sd of [-1, 1]) {
        const x = cx + SP[0] * sd * 1.75 + SD[0] * 1.15, z = cz + SP[1] * sd * 1.75 + SD[1] * 1.15, top = 1.7;
        beam(P, M.post, V(x, groundAt(x, z) - 0.3, z), V(x + rr(-0.05, 0.05), top, z), 0.13, 7);
        lashing(P, x, 0.55, z, 0.13); lashing(P, x, 1.15, z, 0.13);
        beam(P, M.iron, V(x, top - 0.25, z), V(x + SD[0] * 0.45, top - 0.25, z + SD[1] * 0.45), 0.018, 4);
        const lp = lamp(P, PG, x + SD[0] * 0.42, top - 0.67, z + SD[1] * 0.42, 1.1, M.lampGreen);
        beam(P, M.iron, V(lp.x, top - 0.25, lp.z), V(lp.x, lp.y + 0.45, lp.z), 0.01, 4);
        addLight(V(lp.x, lp.y, lp.z), GREEN, 4.5, 0.35); halos.push({ p: lp, col: [0.4, 1.0, 0.7], s: 0.5 });
      }
      rope(P, V(cx + SP[0] * 1.75 + SD[0] * 1.15, 0.55, cz + SP[1] * 1.75 + SD[1] * 1.15), V(cx - SP[0] * 1.75 + SD[0] * 1.15, 0.55, cz - SP[1] * 1.75 + SD[1] * 1.15), 0.35);
    }
    mk(rock, M.stone, boulders);
    // мох по кромке площадки и на валунах
    for (let k = 0; k < 34; k++) { const a = rr(0, 6.28), d = rTop(a) + rr(-0.6, 0.6), x = ISLE.x + Math.cos(a) * d, z = ISLE.z + Math.sin(a) * d; const [s, l] = stairLocal(x, z); if (Math.abs(l) < ST_W / 2 + 0.3 && s > -0.8 && s < ST_LEN) continue; P.add(M.mossDark, MOSS_LITE, M4(x, groundAt(x, z) + 0.02, z, 0, rr(0, 6), 0, rr(0.4, 0.8), rr(0.1, 0.2), rr(0.35, 0.7))); if (rnd() < 0.3) mossStrand(P, x, groundAt(x, z) + 0.05, z, rr(0.6, 1.6), 0.4, a + Math.PI / 2); }
  }

  // ---------- терем Водяного ----------
  const rot = FACE, cs = Math.cos(rot), sn = Math.sin(rot);
  const L = (lx, lz) => [ISLE.x + lx * cs + lz * sn, ISLE.z - lx * sn + lz * cs];
  const LV = (lx, y, lz) => { const [x, z] = L(lx, lz); return V(x, y, z); };
  const LP = (phi, r, y) => LV(Math.sin(phi) * r, y, Math.cos(phi) * r);      // локальные полярные: phi от оси двери
  {
    const sideLen = 2 * RC * Math.sin(Math.PI / 8);
    const corner = (k) => -Math.PI / 8 + k * Math.PI / 4;
    // цоколь из каменных блоков и пол
    for (let k = 0; k < 8; k++) {
      const phi = k * Math.PI / 4, p = LP(phi, AP + 0.1, 0);
      box(P, M.step, sideLen + 0.7, FLOOR_Y - PLAT_Y + 0.45, 1.0, M4(p.x, (FLOOR_Y + PLAT_Y - 0.45) / 2 - 0.02, p.z, 0, rot + phi, 0));
    }
    P.add(M.plank, new THREE.CylinderGeometry(RC, RC, 0.12, 8), M4(ISLE.x, FLOOR_Y - 0.05, ISLE.z, 0, rot + Math.PI / 8, 0));
    // проёмы по граням: [t0, t1, h0, h1] от середины грани, высоты от пола
    const opens = { 0: [[-DOOR_W / 2, DOOR_W / 2, 0, DOOR_H]], 1: [[-0.55, 0.55, 1.35, 2.75]], 7: [[-0.55, 0.55, 1.35, 2.75]], 2: [[-0.45, 0.45, 1.5, 2.6]], 6: [[-0.45, 0.45, 1.5, 2.6]], 4: [[-0.4, 0.4, 1.6, 2.5]] };
    for (let k = 0; k < 8; k++) {
      const a0 = LP(corner(k), RC, 0), a1 = LP(corner(k + 1), RC, 0), u = a1.clone().sub(a0).normalize();
      const s0 = a0.clone().addScaledVector(u, 0.24), s1 = a1.clone().addScaledVector(u, -0.24), len = s0.distanceTo(s1);
      for (let r = 0; r < ROWS; r++) {
        const y = FLOOR_Y + LOG_R + r * LOG_STEP;
        let iv = [[0, len]];
        for (const [o0, o1, h0, h1] of opens[k] || []) {
          if (y + LOG_R * 0.6 < FLOOR_Y + h0 || y - LOG_R * 0.6 > FLOOR_Y + h1) continue;
          const b0 = o0 + len / 2, b1 = o1 + len / 2;
          iv = iv.flatMap(([p, q]) => (b1 <= p || b0 >= q ? [[p, q]] : [[p, b0], [b1, q]].filter(([m, n]) => n - m > 0.12)));
        }
        for (const [p, q] of iv) beam(P, M.log, s0.clone().addScaledVector(u, p).setY(y), s0.clone().addScaledVector(u, q).setY(y + rr(-0.015, 0.015)), LOG_R * rr(0.95, 1.04), 8);
      }
      // угловой столб с резным навершием
      const c = LP(corner(k), RC, 0);
      beam(P, M.post, V(c.x, FLOOR_Y - 0.05, c.z), V(c.x, WALL_TOP + 0.05, c.z), 0.25, 4, true);
      for (const hy of [0.6, 2.2, 3.8]) box(P, M.woodDark, 0.62, 0.12, 0.62, M4(c.x, FLOOR_Y + hy, c.z, 0, rot + corner(k), 0));
    }
    // венец-обвязка поверх стен и потолок
    for (let k = 0; k < 8; k++) { const a0 = LP(corner(k), RC + 0.05, WALL_TOP - 0.05), a1 = LP(corner(k + 1), RC + 0.05, WALL_TOP - 0.05); beam(P, M.post, a0, a1, 0.2, 4, true); }
    P.add(M.dark, new THREE.CylinderGeometry(RC - 0.1, RC - 0.1, 0.1, 8), M4(ISLE.x, WALL_TOP - 0.2, ISLE.z, 0, rot + Math.PI / 8, 0));
    // внутри: тёплый красный свет на стенах (видно в окна и в открытую дверь)
    for (let k = 0; k < 8; k++) { const phi = k * Math.PI / 4, p = LP(phi, AP - 0.32, FLOOR_Y + 2.2); PG.add(k === 0 ? M.dark : M.inRed, new THREE.PlaneGeometry(sideLen - 0.3, 4.2), M4(p.x, p.y, p.z, 0, rot + phi + Math.PI, 0)); }
    // окна: рама, переплёт, ставня; красный свет, лучи наружу
    for (const [k, w, h0, h1] of [[1, 1.1, 1.35, 2.75], [7, 1.1, 1.35, 2.75], [2, 0.9, 1.5, 2.6], [6, 0.9, 1.5, 2.6], [4, 0.8, 1.6, 2.5]]) {
      const phi = k * Math.PI / 4, p = LP(phi, AP + 0.02, FLOOR_Y + (h0 + h1) / 2), wy = rot + phi;
      windowLit(P, PG, M.winRed, p.x, p.y, p.z, wy, w, h1 - h0, { sill: true });
      const out = V(Math.sin(wy), -0.25, Math.cos(wy));
      shafts.push({ p: p.clone().addScaledVector(out, 0.2), d: out, w: w * 0.9, h: (h1 - h0) * 0.9, len: 3.4, col: [1.0, 0.4, 0.2], a: 0.24 });
      addLight(p.clone().addScaledVector(out, 1.3), RED, 6.0, 0.45);
      halos.push({ p: p.clone().addScaledVector(out, 0.15), col: [1.0, 0.4, 0.2], s: 0.9 });
    }
    // дверь: косяки, притолока с резьбой, порог; полотно на петлях (открывается внутрь)
    { const dz = AP;
      for (const sd of [-1, 1]) box(P, M.post, 0.26, DOOR_H + 0.3, 0.55, M4(...L(sd * (DOOR_W / 2 + 0.13), dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + (DOOR_H + 0.3) / 2])), 0, rot, 0));
      box(P, M.post, DOOR_W + 0.9, 0.34, 0.6, M4(...L(0, dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + DOOR_H + 0.17])), 0, rot, 0));
      for (let k = 0; k < 7; k++) { const lx = -DOOR_W / 2 - 0.2 + k * (DOOR_W + 0.4) / 6; PG.add(M.rune, new THREE.PlaneGeometry(0.1, 0.16), M4(...L(lx, dz + 0.31).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + DOOR_H + 0.17])), 0, rot, 0)); }
      box(P, M.step, DOOR_W + 0.4, 0.1, 0.7, M4(...L(0, dz).flatMap((v, i) => (i ? [v] : [v, FLOOR_Y + 0.02])), 0, rot, 0));
      const hinge = LV(-DOOR_W / 2, FLOOR_Y + 0.04, dz - 0.05);
      const DP = new Pack(), DG = new Pack();
      for (let k = 0; k < 5; k++) box(DP, k % 2 ? M.woodDark : M.post, DOOR_W / 5 - 0.01, DOOR_H - 0.06, 0.12, M4(DOOR_W / 10 + k * DOOR_W / 5, DOOR_H / 2, 0));
      for (const hy of [0.45, 1.55, 2.85]) { box(DP, M.iron, DOOR_W - 0.1, 0.09, 0.03, M4(DOOR_W / 2, hy, 0.075)); for (let k = 0; k < 6; k++) DP.add(M.iron, new THREE.SphereGeometry(0.025, 5, 3), M4(0.12 + k * (DOOR_W - 0.24) / 5, hy, 0.095)); }
      // оберег на двери: золотое солнце-колесо с волнами
      DG.add(M.amulet, new THREE.TorusGeometry(0.4, 0.045, 6, 28), M4(DOOR_W / 2, 2.05, 0.11));
      DG.add(M.amulet, new THREE.TorusGeometry(0.22, 0.03, 6, 22), M4(DOOR_W / 2, 2.05, 0.11));
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; DG.add(M.amulet, new THREE.BoxGeometry(0.035, 0.18, 0.03), M4(DOOR_W / 2 + Math.cos(a) * 0.31, 2.05 + Math.sin(a) * 0.31, 0.11, 0, 0, a - Math.PI / 2)); }
      DG.add(M.amulet, new THREE.CircleGeometry(0.1, 12), M4(DOOR_W / 2, 2.05, 0.12));
      DP.add(M.iron, new THREE.TorusGeometry(0.1, 0.018, 5, 12), M4(DOOR_W - 0.25, 1.3, 0.1));
      const g = new THREE.Group(); g.add(DP.build(true, true), DG.build(false, false)); g.position.copy(hinge); g.rotation.y = rot; scene.add(g);
      anim.door = { g, rot, x: L(0, dz + 2.2)[0], z: L(0, dz + 2.2)[1], ix: L(0, dz - 1.4)[0], iz: L(0, dz - 1.4)[1], yaw: rot };
      halos.push({ p: LV(0, FLOOR_Y + 2.05, dz + 0.25), col: [1.0, 0.75, 0.35], s: 0.8 });
      addLight(LV(0, FLOOR_Y + 2.1, dz + 1.0), GOLD, 5.0, 0.2, 1);
    }
    // крыльцо: каменное основание, настил, резные столбы, обвязка, двускатная кровля, фронтон с оберегом
    {
      const z0 = AP + 0.2, z1 = PORCH.front - 0.3, hw = PORCH.half - 0.15;
      const [bx, bz] = L(0, (z0 + z1) / 2);
      box(P, M.step, hw * 2 + 0.2, FLOOR_Y - PLAT_Y + 0.45, z1 - z0 + 0.1, M4(bx, (FLOOR_Y + PLAT_Y - 0.45) / 2 - 0.06, bz, 0, rot, 0));
      const npl = Math.round((hw * 2) / 0.3);
      for (let k = 0; k < npl; k++) { const lx = -hw + (k + 0.5) * hw * 2 / npl; const [x, z] = L(lx, (z0 + z1) / 2); plank(P, rnd() < 0.3 ? M.plankOld : M.plank, x, FLOOR_Y - 0.02, z, z1 - z0, 0.28, rot + Math.PI / 2, 0.08); }
      walks.push({ a: L(0, z0), b: L(0, z1), w: hw * 2, y: FLOOR_Y + 0.02 });
      // ступени с крыльца на площадку
      for (let k = 0; k < 2; k++) { const [x, z] = L(0, z1 + 0.25 + k * 0.38); box(P, M.step, 2.6 - k * 0.2, 0.2, 0.42, M4(x, FLOOR_Y - 0.17 - k * 0.2 - 0.1, z, 0, rot, 0)); }
      walks.push({ a: L(0, z1), b: L(0, z1 + 1.0), w: 2.4, ya: FLOOR_Y, yb: PLAT_Y, y: FLOOR_Y, ramp: true });
      const roofY = (ax) => PORCH.ridge - Math.abs(ax) * (PORCH.ridge - PORCH.eave) / PORCH.half;
      // столбы-идолы на крыльце
      for (const sd of [-1, 1]) {
        const lx = sd * (PORCH.half - 0.35), p = LV(lx, 0, z1 - 0.1), topY = roofY(lx) - 0.22;
        box(P, M.post, 0.34, topY - FLOOR_Y + 0.02, 0.34, M4(p.x, (topY + FLOOR_Y) / 2, p.z, 0, rot, 0));
        for (const hy of [0.25, 1.6, 2.6]) box(P, M.woodDark, 0.46, 0.14, 0.46, M4(p.x, FLOOR_Y + hy, p.z, 0, rot, 0));
        fishSkull(P, PG, p.x + sn * 0.25, FLOOR_Y + 2.2, p.z + cs * 0.25, 0.4, rot, false);
        // обвязка вдоль крыльца: от стены к столбу, на ней лежит кровля
        beam(P, M.post, LV(lx, topY + 0.07, AP - 0.1), LV(lx, topY + 0.07, PORCH.front), 0.12, 4, true);
        for (const lz of [AP + 0.5, (AP + z1) / 2]) beam(P, M.woodDark, LV(lx, topY - 0.9, z1 - 0.1), LV(lx, topY - 0.02, lz), 0.07, 4, true);   // подкос
      }
      const tieY = roofY(PORCH.half - 0.35) - 0.08;
      beam(P, M.post, LV(-PORCH.half + 0.2, tieY, z1 - 0.1), LV(PORCH.half - 0.2, tieY, z1 - 0.1), 0.12, 4, true);
      // скаты кровли крыльца: толстая соломенная плита, свес 0,3
      const half = PORCH.half + 0.3, drop = (PORCH.ridge - PORCH.eave) / PORCH.half, slope = Math.hypot(half, half * drop), ang = Math.atan(drop);
      for (const sd of [-1, 1]) {
        const lz0 = AP - 0.3, lz1 = PORCH.front + 0.35, cxl = sd * half / 2, cyl = PORCH.ridge - (half / 2) * drop + 0.09;
        const g = new THREE.BoxGeometry(slope, 0.26, lz1 - lz0, 3, 1, 4);
        const m = new THREE.Matrix4().makeTranslation(...L(cxl, (lz0 + lz1) / 2).flatMap((v, i) => (i ? [v] : [v, cyl]))).multiply(new THREE.Matrix4().makeRotationY(rot)).multiply(new THREE.Matrix4().makeRotationZ(-sd * ang));
        P.add(M.thatch, boxUV(g, slope, 0.26, lz1 - lz0), m);
        // ракушки и звёзды на скатах
        for (let k = 0; k < 9; k++) { const ax = sd * rr(0.3, half - 0.3), lz = rr(lz0 + 1.0, lz1 - 0.2), y = PORCH.ridge - Math.abs(ax) * drop + 0.23; const n = V(sd * Math.sin(ang), Math.cos(ang), 0).applyAxisAngle(V(0, 1, 0), rot); onSurface(P, rnd() < 0.5 ? M.shell : M.shellPink, SHELL, LV(ax, y, lz), n, rr(-0.5, 0.5) + Math.PI, rr(0.22, 0.32)); }
      }
      beam(P, M.post, LV(0, PORCH.ridge + 0.2, AP - 0.3), LV(0, PORCH.ridge + 0.2, PORCH.front + 0.4), 0.13, 6);      // конёк
      // фронтон: доски, резные причелины крест-накрест с рогами, оберег-круг
      { const fz = z1 - 0.05, gy0 = tieY + 0.12, gh = roofY(0) - gy0 - 0.05, gw = (PORCH.half - 0.35) * 2;
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([-gw / 2, 0, 0, gw / 2, 0, 0, 0, gh, 0], 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); gg.setIndex([0, 1, 2]); gg.computeVertexNormals();
        P.add(M.woodDark, gg, M4(...L(0, fz).flatMap((v, i) => (i ? [v] : [v, gy0])), 0, rot, 0));
        P.add(M.woodDark, gg.clone(), M4(...L(0, fz - 0.06).flatMap((v, i) => (i ? [v] : [v, gy0])), 0, rot + Math.PI, 0));
        const cc = LV(0, gy0 + gh * 0.4, fz + 0.06);
        PG.add(M.rune, new THREE.TorusGeometry(0.34, 0.035, 5, 24), M4(cc.x, cc.y, cc.z, 0, rot, 0));
        for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + Math.PI / 2; PG.add(M.rune, new THREE.BoxGeometry(0.03, 0.3, 0.02), M4(cc.x + Math.cos(rot) * Math.cos(a) * 0.16, cc.y + Math.sin(a) * 0.16, cc.z - Math.sin(rot) * Math.cos(a) * 0.16, 0, rot, a - Math.PI / 2)); }
        halos.push({ p: cc, col: [0.4, 1.0, 0.85], s: 0.6 });
        for (const sd of [-1, 1]) {
          beam(P, M.post, LV(sd * (half + 0.05), PORCH.ridge - half * drop + 0.05, PORCH.front + 0.45), LV(-sd * 0.9, PORCH.ridge + 0.95, PORCH.front + 0.45), 0.08, 4, true);
          tube(P, M.bone, [LV(-sd * 0.85, PORCH.ridge + 0.92, PORCH.front + 0.45), LV(-sd * 1.25, PORCH.ridge + 1.35, PORCH.front + 0.5), LV(-sd * 1.1, PORCH.ridge + 1.85, PORCH.front + 0.55)], 0.06, 6, 6);
        }
        fishSkull(P, PG, ...LV(0, PORCH.ridge + 0.75, PORCH.front + 0.55).toArray(), 0.65, rot, false);
      }
      // фонарь у двери на кованом кронштейне, справа
      { const p = LV(DOOR_W / 2 + 0.7, FLOOR_Y + 3.05, AP + 0.3); beam(P, M.iron, LV(DOOR_W / 2 + 0.45, FLOOR_Y + 3.05, AP + 0.25), LV(DOOR_W / 2 + 0.45, FLOOR_Y + 3.05, AP + 0.95), 0.025, 4); chain(P, LV(DOOR_W / 2 + 0.45, FLOOR_Y + 3.0, AP + 0.92), 0.3);
        const lp = lamp(P, PG, ...LV(DOOR_W / 2 + 0.45, FLOOR_Y + 2.32, AP + 0.92).toArray(), 1.05, M.lampRed); addLight(lp.clone().add(V(0, 0, 0)), RED, 6.5, 0.6, 1); halos.push({ p: lp, col: [1.0, 0.3, 0.15], s: 0.75 }); void p; }
      solids.push({ x: L(0, AP + 0.2)[0], z: L(0, AP + 0.2)[1], r: 0.01 });
    }
    solids.push({ x: ISLE.x, z: ISLE.z, r: AP + 0.3, y0: PLAT_Y - 1, y1: WALL_TOP });

    // кровля: конус ярусами соломы (снизу рваная кромка), над крыльцом вырез, сверху шпиль с рыбьим черепом и рогами
    const TIERS = [[0.0, 2.7, 0.3], [2.2, 4.6, 0.2], [4.1, 6.2, 0.1], [5.7, EAVE_R, 0.0]];
    const cut = (lx, lz) => Math.abs(lx) < PORCH.half - 0.05 && lz > AP + 0.3;
    TIERS.forEach(([r0, r1, off], ti) => {
      const NA = 120, NR = 6, pos = [], idx = [], uvs = [];
      for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
        const phi = j / NA * Math.PI * 2, r = lerp(r0, r1, i / NR);
        const jag = i === NR ? (0.12 + 0.18 * Math.abs(Math.sin(phi * 23 + ti)) + 0.08 * Math.sin(phi * 7)) : 0;
        const rr2 = r + jag * 0.3, y = coneY(r) + off - jag + (i === NR ? -0.08 : 0);
        pos.push(Math.sin(phi) * rr2, y, Math.cos(phi) * rr2); uvs.push(phi * 4, r);
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
        const a = i * (NA + 1) + j, b = a + NA + 1;
        const ph = (j + 0.5) / NA * Math.PI * 2, rm = lerp(r0, r1, (i + 0.5) / NR);
        if (cut(Math.sin(ph) * rm, Math.cos(ph) * rm)) continue;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
      P.add(M.thatch, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
      // толщина кромки: тёмный подбой изнутри и валик по низу
      const g2 = g.clone(); g2.translate(0, -0.14, 0); P.add(M.thatchDark, g2, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
    });
    // подбой: от стены до свеса снизу, тёмный
    { const pos = [], idx = []; const NA = 64;
      for (let j = 0; j <= NA; j++) { const phi = j / NA * Math.PI * 2; for (const [r, y] of [[RC - 0.05, WALL_TOP - 0.02], [EAVE_R - 0.4, coneY(EAVE_R - 0.4) - 0.22]]) pos.push(Math.sin(phi) * r, y, Math.cos(phi) * r); }
      for (let j = 0; j < NA; j++) { const ph = (j + 0.5) / NA * Math.PI * 2; if (cut(Math.sin(ph) * 6, Math.cos(ph) * 6)) continue; const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      P.add(M.thatchDark, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0)); }
    // щёки над крыльцом: закрывают щель между скатами крыльца и вырезом конуса
    for (const sd of [-1, 1]) {
      const lx = sd * (PORCH.half - 0.05), pts = [];
      for (let k = 0; k <= 8; k++) { const lz = lerp(AP + 0.25, PORCH.front, k / 8), r = Math.hypot(lx, lz); pts.push([lz, Math.max(coneY(Math.min(r, EAVE_R)) + 0.05, PORCH.eave)]); }
      const pos = [], idx = [];
      pts.forEach(([lz, yT]) => { pos.push(lx, PORCH.eave - 0.1, lz, lx, yT, lz); });
      for (let k = 0; k < 8; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const mat = paint({ base: '#3a4436', strokeAmt: 0.2, stroke: [0, 1, 0], side: THREE.DoubleSide, rim: 0.5, moss: '#4f6a3a', mossAmt: 0.3 });
      P.add(mat, g, M4(ISLE.x, 0, ISLE.z, 0, rot, 0));
    }
    // ракушки, морские звёзды и костяные шипы по кровле
    const coneN = (phi) => V(Math.sin(phi) * CONE_K, 1, Math.cos(phi) * CONE_K).normalize();
    const onCone = (phi, r, lift = 0.12) => { const lx = Math.sin(phi) * r, lz = Math.cos(phi) * r; const tier = TIERS.findIndex(([a, b]) => r >= a && r <= b); const off = tier >= 0 ? TIERS[tier][2] : 0; return { p: LV(lx, coneY(r) + off + lift, lz), n: coneN(phi).applyAxisAngle(V(0, 1, 0), rot), bad: cut(lx, lz) }; };
    for (let k = 0; k < 330; k++) {
      const phi = rr(0, 6.283), r = Math.sqrt(rr(0.04, 1)) * (EAVE_R - 0.5); const q = onCone(phi, r); if (q.bad) continue;
      onSurface(P, rnd() < 0.6 ? M.shell : M.shellPink, SHELL, q.p, q.n, phi + Math.PI + rr(-0.4, 0.4), rr(0.3, 0.55));
    }
    for (let k = 0; k < 14; k++) { const phi = rr(-1.4, 1.4) + (k % 3 === 0 ? Math.PI : 0), r = rr(1.5, 6.4); const q = onCone(phi, r, 0.13); if (q.bad) continue; onSurface(P, M.star, STAR, q.p, q.n, rr(0, 6.28), rr(0.75, 1.15)); }
    for (let k = 0; k < 48; k++) {
      const phi = rr(0, 6.283), r = rr(1.2, 6.6); const q = onCone(phi, r, 0.05); if (q.bad) continue;
      const out = q.n.clone().multiplyScalar(0.7).add(V(Math.sin(rot + phi), 0.7, Math.cos(rot + phi)).normalize().multiplyScalar(0.5)).normalize();
      const len = rr(0.5, 1.4); P.add(M.bone, new THREE.ConeGeometry(0.06 * len + 0.02, len, 6), new THREE.Matrix4().compose(q.p.clone().addScaledVector(out, len * 0.42), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), out), V(1, 1, 1)));
    }
    // шпиль: столб, рыбий череп с рогами, скрещённые остроги, на них колокольцы
    { const ax = ISLE.x, az = ISLE.z;
      beam(P, M.post, V(ax, APEX - 1.0, az), V(ax, APEX + 1.3, az), 0.16, 6);
      lashing(P, ax, APEX + 0.2, az, 0.17);
      fishSkull(P, PG, ax, APEX + 1.7, az, 1.15, rot, true);
      for (const sd of [-1, 1]) { const a = V(ax, APEX - 0.4, az), b = LV(sd * 1.6, APEX + 3.2, -0.3); beam(P, M.wood, a, b, 0.05, 5); P.add(M.iron, new THREE.ConeGeometry(0.09, 0.45, 4), new THREE.Matrix4().compose(b.clone().add(b.clone().sub(a).normalize().multiplyScalar(0.2)), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1))); bell(P, a.clone().lerp(b, 0.72).add(V(0, -0.05, 0)), 0.55, 0.3); }
      perches.push({ x: ax, y: APEX + 2.35, z: az, ry: rot });
      leafSrc.push(V(ax, APEX, az)); }
    // стяги под свесом (на перекладине, перекладина на верёвках к стропилам)
    for (const phi of [-0.78, 0.82, 1.9, -1.95]) {
      const r = EAVE_R - 0.75, y = coneY(r) - 0.06, p = LP(phi, r, y), yaw = rot + phi;
      const tx = Math.cos(yaw), tz = -Math.sin(yaw);
      for (const sd of [-1, 1]) rope(P, V(p.x + tx * sd * 0.45, y, p.z + tz * sd * 0.45), V(p.x + tx * sd * 0.42, y + 0.3, p.z + tz * sd * 0.42), 0.0, 0.015);
      bannerBar(P, Math.abs(phi) < 1 ? clothCream : clothRed, p.x, y, p.z, 0.85, rr(1.6, 2.1), yaw);
    }
    // капель с кромки соломы
    for (let k = 0; k < 18; k++) { const phi = rr(0, 6.28), q = onCone(phi, EAVE_R - 0.05, -0.2); if (!q.bad) drips.push(q.p); }
    // мох по нижнему венцу и у цоколя
    for (let k = 0; k < 26; k++) { const phi = rr(0, 6.28), p = LP(phi, AP + 0.55, FLOOR_Y - 0.25); if (Math.abs(Math.sin(phi) * (AP + 0.5)) < PORCH.half + 0.2 && Math.cos(phi) > 0) continue; P.add(M.moss, MOSS_LITE, M4(p.x, PLAT_Y + 0.02, p.z, 0, rr(0, 6), 0, rr(0.4, 0.8), rr(0.12, 0.25), rr(0.3, 0.6))); mossStrand(P, p.x, FLOOR_Y + 0.1, p.z, rr(0.4, 0.9), 0.4, rot + phi + Math.PI / 2); }
  }

  // ---------- двор на острове: идолы, шесты со стягами, сети, свечи ----------
  {
    const spots = [[-6.6, 3.6, 4.2, 0.4], [-4.6, 7.4, 3.4, 0.2], [6.8, 4.4, 3.8, -0.4], [-8.2, -1.0, 3.0, 0.9]];
    for (const [lx, lz, h, ry] of spots) {
      const [x, z] = L(lx, lz); const top = idol(P, PG, x, z, h, rot + ry, { faces: h > 3.5 ? 3 : 2 });
      perches.push({ x, y: top + 0.9, z, ry: rot + ry });
      // свечи у подножия
      for (let k = 0; k < 4; k++) { const a = rr(0, 6.28), cx = x + Math.cos(a) * 0.75, cz = z + Math.sin(a) * 0.75, cy = groundAt(cx, cz), ch = rr(0.12, 0.3); P.add(paint({ base: '#d8ccb0', strokeAmt: 0.05, rim: 0.8 }), new THREE.CylinderGeometry(0.035, 0.04, ch, 6), M4(cx, cy + ch / 2, cz)); PG.add(M.candle, new THREE.SphereGeometry(0.03, 5, 4), M4(cx, cy + ch + 0.04, cz, 0, 0, 0, 1, 1.8, 1)); }
      addLight(V(x, groundAt(x, z) + 0.6, z), GOLD, 3.0, 0.8);
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
    const tree = (root, pts, rad, branches) => {
      const y = groundAt(root[0], root[1]);
      const tp = pts.map(([x, yy, z]) => V(x, yy, z)); tp.unshift(V(root[0], y - 0.8, root[1]));
      tube(P, M.bark, tp, rad, 10, 16);
      for (let j = 0; j < 7; j++) { const a = j / 7 * 6.28 + rr(-0.2, 0.2), rl = rr(1.6, 3.2); tube(P, M.bark, [V(root[0], y + 1.0, root[1]), V(root[0] + Math.cos(a) * rl * 0.6, y + 0.5, root[1] + Math.sin(a) * rl * 0.6), V(root[0] + Math.cos(a) * rl, Math.min(y, groundAt(root[0] + Math.cos(a) * rl, root[1] + Math.sin(a) * rl)) - 0.5, root[1] + Math.sin(a) * rl)], rad * rr(0.25, 0.4), 6, 6); }
      solids.push({ x: root[0], z: root[1], r: rad + 0.4 }); bases.push([root[0], root[1], rad * 2]);
      for (const br of branches) {
        const bp = br.pts.map(([x, yy, z]) => V(x, yy, z));
        tube(P, M.bark, bp, br.r, 8, 14);
        const curve = new THREE.CatmullRomCurve3(bp);
        for (let k = 0; k < (br.twigs || 6); k++) { const t = rr(0.35, 1), s = curve.getPoint(t), tip = s.clone().add(V(rr(-2, 2), rr(-0.3, 1.5), rr(-2, 2))); tube(P, M.bark, [s, s.clone().lerp(tip, 0.5).add(V(0, 0.3, 0)), tip], br.r * 0.3, 5, 5); canopy.push(tip); }
        for (let k = 0; k < 8; k++) { const s = curve.getPoint(rr(0.2, 1)); mossStrand(P, s.x, s.y - br.r * 0.7, s.z, rr(0.6, 2.2), 0.35, rr(0, 6)); if (rnd() < 0.4) vine(P, s, rr(1.5, 4.5), rr(0, 6), 0.15); }
        perches.push({ x: bp[bp.length - 1].x, y: bp[bp.length - 1].y + br.r, z: bp[bp.length - 1].z, ry: rr(0, 6) });
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
      const s = br.curve.getPoint(t); const top = V(s.x, s.y - br.r * 0.8, s.z);
      P.add(M.iron, new THREE.TorusGeometry(br.r + 0.03, 0.025, 4, 12), M4(s.x, s.y, s.z, 0, rr(0, 3), Math.PI / 2));   // хомут на ветви
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
    // камни вдоль брода и шесты с зелёными фонарями
    const ax = LANDING.x, az = LANDING.z, bx = SHORE[0], bz = SHORE[1], fl = Math.hypot(bx - ax, bz - az), fx = (bx - ax) / fl, fz = (bz - az) / fl;
    for (let t = 1.8; t < fl - 1; t += rr(1.4, 2.4)) for (const sd of [-1, 1]) if (rnd() < 0.7) { const x = ax + fx * t + fz * sd * rr(2.3, 3.0), z = az + fz * t - fx * sd * rr(2.3, 3.0); P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.35, 0.6), 1), M4(x, WATER_Y - 0.05, z, rr(0, 3), rr(0, 3), 0, 1, 0.45, 1)); }
    for (const [t, sd] of [[6, 1], [12.5, -1], [18.5, 1]]) {
      const x = ax + fx * t + fz * sd * 2.4, z = az + fz * t - fx * sd * 2.4, top = 2.1;
      beam(P, M.post, V(x, groundAt(x, z) - 0.4, z), V(x, top, z), 0.08, 6); lashing(P, x, 0.3, z, 0.08);
      beam(P, M.post, V(x, top - 0.1, z), V(x - fz * sd * 0.6, top + 0.05, z + fx * sd * 0.6), 0.04, 5);
      const hx = x - fz * sd * 0.55, hz = z + fx * sd * 0.55;
      chain(P, V(hx, top, hz), 0.2); const lp = lamp(P, PG, hx, top - 0.65, hz, 1.0, M.lampGreen);
      addLight(lp.clone(), GREEN, 6, 0.35); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.6 });
    }
    // левый средний берег: скальный выступ, две жерди с перекладиной и стягом, фонарь
    { const x = -23, z = 4.5, y = groundAt(x, z);
      for (let k = 0; k < 6; k++) P.add(M.stone, new THREE.DodecahedronGeometry(rr(0.8, 1.6), 1), M4(x + rr(-2.5, 2.5), footY(x, z, 1, 'камень') + 0.2, z + rr(-2, 2), rr(0, 3), rr(0, 3), 0, 1, 0.7, 1));
      const p1 = V(x + 1.2, 0, z + 1.5), p2 = V(x + 2.4, 0, z + 0.2); for (const p of [p1, p2]) { p.y = groundAt(p.x, p.z); beam(P, M.post, V(p.x, p.y - 0.4, p.z), V(p.x, p.y + 3.2, p.z), 0.1, 6); }
      const yb = Math.min(p1.y, p2.y) + 3.0; beam(P, M.wood, V(p1.x, yb, p1.z), V(p2.x, yb, p2.z), 0.06, 5);
      cloth(P, clothCream, (p1.x + p2.x) / 2, yb - 0.05, (p1.z + p2.z) / 2, 1.1, 2.0, Math.atan2(-(p2.z - p1.z), p2.x - p1.x));
      const lp = lamp(P, PG, x + 3.2, groundAt(x + 3.2, z + 1.8) + 0.25, z + 1.8, 1.2, M.lampGreen); addLight(lp.clone(), GREEN, 6, 0.3); halos.push({ p: lp, col: [0.35, 1.0, 0.7], s: 0.7 });
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
      if (Math.hypot(x - ISLE.x, z - ISLE.z) < RC + 4.2) continue;                   // у терема и крыльца чисто (двор)
      { const [lx, lz] = [(x - ISLE.x) * cs - (z - ISLE.z) * sn, (x - ISLE.x) * sn + (z - ISLE.z) * cs]; if (Math.abs(lx) < 3 && lz > 0 && lz < 12) continue; }
      if (solids.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 0.3)) continue;
      const s = rr(0.6, 1.4);
      if (onIsle && Math.hypot(x - ISLE.x, z - ISLE.z) > rTop(Math.atan2(z - ISLE.z, x - ISLE.x)) - 0.5) continue;
      if (onIsle || rnd() < 0.75) ferns.push(M4(x, y, z, 0, rr(0, 6), 0, s, s * rr(0.8, 1.2), s)); else bushes.push(M4(x, y, z, 0, rr(0, 6), 0, s * rr(1, 1.5), s, s * rr(1, 1.5)));
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
    flowers.forEach(([x, z, s], i) => { if (i % 4 === 0) addLight(V(x, 0.5, z), VIOLET, 3.2, 0.1); if (i % 2 === 0) halos.push({ p: V(x, WATER_Y + 0.15, z), col: [0.7, 0.45, 1.0], s: 0.35 * s }); });
    // крупные лотосы на переднем плане (как на концепте)
    for (const [x, z, s] of [[-12.5, 19.5, 2.4], [-4.5, 17.0, 1.9], [3.5, 19.8, 1.6], [9.2, 15.6, 1.7], [12.6, 18.2, 2.1], [-1.5, 11.5, 1.5]]) {
      if (groundAt(x, z) > WATER_Y - 0.1) continue;
      P.add(M.pad, pad, M4(x, WATER_Y + 0.02, z, 0, rr(0, 6), 0, s * 1.6, 1, s * 1.6));
      for (const g of LP.parts.get(M.lotus)) P.add(M.lotus, g, M4(x, WATER_Y + 0.05, z, 0, rr(0, 6), 0, s * 0.85, s * 0.85, s * 0.85));
      PG.add(M.lotusIn, new THREE.SphereGeometry(0.06, 6, 4), M4(x, WATER_Y + 0.12 * s, z, 0, 0, 0, s, s, s));
      addLight(V(x, 0.6, z), VIOLET, 3.5, 0.1); halos.push({ p: V(x, WATER_Y + 0.2, z), col: [0.7, 0.45, 1.0], s: 0.5 * s });
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
      const m = new THREE.Mesh(g, shaftMat(i % 3 ? '#9ff6e8' : '#d6fff4', { a: rr(0.045, 0.06), seed: i * 3.7, flow: 0.05 }));
      m.position.set(hx, WATER_Y, hz); m.quaternion.copy(q); m.renderOrder = 3; scene.add(m);
      // пятно света на воде
      halos.push({ p: V(hx, WATER_Y + 0.15, hz), col: [0.5, 0.95, 0.9], s: rad * 1.8 });
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
export const AP_R = RC * Math.cos(Math.PI / 8);
export function houseLocal(lx, lz) { const c = Math.cos(FACE), s = Math.sin(FACE); return [ISLE.x + lx * c + lz * s, ISLE.z - lx * s + lz * c]; }
export const STAIR = { top: ST_TOP, dir: SD, len: ST_LEN, w: ST_W };
export const PORCH_FRONT = PORCH.front;
