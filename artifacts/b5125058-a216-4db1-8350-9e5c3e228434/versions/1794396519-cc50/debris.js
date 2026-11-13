// Мелочь на земле и следы: листья, веточки, камешки, хвоя, кусочки коры; следы сапог богатыря и
// корневые следы Лешего; трещина от его удара о землю. (Видео t007 и t020: на полу разбросаны мелкие
// плоские предметы, каждый — одно пятно цвета с тонким краем.) Каждая штука — плоская наклейка на
// землю: заливка своим цветом, свет логова (луна + огни из U), тонкая светлая линия «на отрыве» только
// со стороны света (линия — твоими штрихами, защищена от Кувахары). Следы исчезают кусками, шагами.
import * as THREE from 'three';
import { groundAt, WATER_Y } from './lair/lair.js';
import { U, MAXL } from './lair/toon.js';
import { loadHand, rimPoly, rng, canvas, packTex, fillPoly, ribbon, leaf, bez } from './foreground.js';

const N = 4, CS = 256, AW = N * CS;   // атлас 4×4 клеток по 256
const CELL = { birch: 0, willow: 1, oak: 2, curl: 3, twig: 4, fork: 5, pebbles: 6, stone: 7, needles: 8, bark: 9, boot: 10, claw: 11, crack: 12, pile: 13 };

// рисунок клетки: R — заливка, G — линия на отрыве (вокруг, нужная сторона выбирается в шейдере), B — тон внутри
export function drawCells() {
  const cf = canvas(AW, AW), cr = canvas(AW, AW), cb = canvas(AW, AW); const r = rng(303);
  const [gf, gr, gb] = [cf, cr, cb].map((c) => { const g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; return g; });
  const cell = (i, fn) => {
    const ox = (i % N) * CS, oy = Math.floor(i / N) * CS;
    for (const g of [gf, gr, gb]) { g.save(); g.beginPath(); g.rect(ox, oy, CS, CS); g.clip(); g.translate(ox, oy); }
    const polys = fn(r) ?? [];
    for (const p of polys) if (p.rim !== false) rimPoly(gr, p.poly, [0, 0], 2.5, p.rw ?? 6, r, { th: -2, len0: 40, len1: 140, gap0: 4, gap1: 12, jit: 0.015 });
    gr.globalCompositeOperation = 'destination-out'; for (const p of polys) fillPoly(gr, p.poly); gr.globalCompositeOperation = 'source-over';
    for (const g of [gf, gr, gb]) g.restore();
  };
  const F = (P) => { fillPoly(gf, P); return { poly: P }; };
  const vein = (x0, y0, x1, y1, w = 3) => { gb.lineWidth = w; gb.lineCap = 'round'; gb.beginPath(); gb.moveTo(x0, y0); gb.lineTo(x1, y1); gb.stroke(); };
  // тень-полумесяц внутри: форма минус её сдвиг (объём камня, глубина следа)
  const shade = (P, dx, dy) => { gb.save(); fillPoly(gb, P); gb.globalCompositeOperation = 'destination-out'; gb.translate(dx, dy); fillPoly(gb, P); gb.restore(); };
  const blob = (cx, cy, R, j = 0.18, n = 18) => { const P = []; const ph = r() * 6; for (let i = 0; i < n; i++) { const a = i / n * 6.283; const k = 1 + j * (Math.sin(a * 3 + ph) * 0.6 + (r() - 0.5)); P.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k * 0.8]); } return P; };

  cell(CELL.birch, () => { const P = leaf(40, 200, -0.8, 200, 62); vein(40, 200, 175, 64); return [F(P)]; });
  cell(CELL.willow, () => { const P = leaf(30, 220, -0.75, 260, 30, 0.08); vein(30, 220, 210, 40, 2.5); return [F(P)]; });
  cell(CELL.oak, () => { const out = [F(leaf(60, 210, -0.9, 190, 50))]; for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.2; out.push(F(leaf(60 + 120 * t, 210 - 150 * t, -0.2 - i * 0.1, 55, 22))); out.push(F(leaf(60 + 120 * t, 210 - 150 * t, -1.9 + i * 0.1, 55, 22))); } vein(60, 210, 180, 60); return out; });
  cell(CELL.curl, () => { const P = leaf(40, 170, -0.5, 190, 55, 0.55); shade(P, 0, -14); return [F(P)]; });
  cell(CELL.twig, () => { const C = bez([20, 200], [90, 160], [160, 130], [236, 60], 24); for (const p of C) p[1] += (r() - 0.5) * 6; const out = [F(ribbon(C, (t) => 16 * (1 - t) + 6))]; const s = C[10]; out.push(F(ribbon(bez(s, [s[0] + 10, s[1] - 30], [s[0] + 10, s[1] - 50], [s[0] + 2, s[1] - 70], 10), (t) => 8 * (1 - t) + 3))); return out; });
  cell(CELL.fork, () => { const a = bez([30, 230], [80, 170], [110, 130], [120, 90], 16); const b = bez([120, 90], [120, 60], [100, 40], [80, 20], 10); const c = bez([120, 90], [150, 70], [190, 60], [230, 64], 12); return [F(ribbon(a, (t) => 14 - 4 * t)), F(ribbon(b, (t) => 9 * (1 - t) + 3)), F(ribbon(c, (t) => 9 * (1 - t) + 3))]; });
  cell(CELL.pebbles, () => [[80, 150, 46], [165, 120, 34], [150, 195, 26], [95, 78, 20]].map(([x, y, R]) => { const P = blob(x, y, R, 0.12); shade(P, -R * 0.25, -R * 0.3); return F(P); }));
  cell(CELL.stone, () => { const P = blob(128, 130, 92, 0.16, 22); shade(P, -20, -24); return [F(P)]; });
  cell(CELL.needles, () => { gf.lineCap = 'round'; for (let i = 0; i < 14; i++) { const a = r() * 6.283, l = 70 + r() * 70, x = 70 + r() * 110, y = 70 + r() * 110; gf.lineWidth = 4; gf.beginPath(); gf.moveTo(x, y); gf.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8); gf.stroke(); } return []; });
  cell(CELL.bark, () => { const P = [[40, 90], [200, 60], [222, 150], [60, 190]].map(([x, y]) => [x + (r() - 0.5) * 20, y + (r() - 0.5) * 20]); for (let i = 0; i < 5; i++) vein(60 + i * 30, 90, 70 + i * 32, 175, 4); return [F(P)]; });
  // след сапога: носок вверх клетки; B — протектор и пятка глубже
  cell(CELL.boot, () => { const toe = blob(128, 92, 52, 0.05, 24).map(([x, y]) => [x, 92 + (y - 92) * 1.45]); const heel = blob(128, 206, 40, 0.06, 18);
    for (let i = 0; i < 5; i++) { gb.fillRect(84, 52 + i * 22, 88, 8); } shade(heel, 0, 12); return [F(toe), F(heel)]; });
  // след Лешего: подушка и три корня-пальца с когтями, шпора назад
  cell(CELL.claw, () => { const out = [F(blob(128, 170, 50, 0.12, 22))];
    for (const [ex, ey] of [[50, 30], [128, 12], [206, 30]]) { const C = bez([128, 160], [128 + (ex - 128) * 0.3, 120], [ex, ey + 50], [ex, ey], 16); out.push(F(ribbon(C, (t) => 30 * (1 - t) + 4))); vein(ex, ey + 40, ex, ey + 6, 9); }
    out.push(F(ribbon(bez([128, 190], [126, 215], [120, 232], [112, 250], 8), (t) => 20 * (1 - t) + 4))); return out; });
  // трещина от удара: рваная воронка и лучи
  cell(CELL.crack, () => { const c = blob(128, 128, 44, 0.3, 20); const out = [F(c)]; shade(c, 0, 10);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + r() * 0.5; const C = [[128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30]]; let x = C[0][0], y = C[0][1], aa = a; const L = 50 + r() * 60;
      for (let k = 0; k < 7; k++) { aa += (r() - 0.5) * 0.7; x += Math.cos(aa) * L / 7; y += Math.sin(aa) * L / 7; C.push([x, y]); }
      out.push({ ...F(ribbon(C, (t) => 12 * (1 - t) + 1.5)), rim: false }); }
    return out; });
  cell(CELL.pile, () => { const out = []; for (let i = 0; i < 4; i++) { const P = leaf(50 + r() * 60, 150 + r() * 60, -0.3 - r() * 1.4, 130 + r() * 40, 38); out.push(F(P)); } return out; });
  return packTex([cf, cr, cb], { seed: 9, mip: true });
}

const VERT = /* glsl */`
attribute float aCell; attribute vec3 aCol; attribute float aLife;
varying vec2 vUv; varying vec3 vW; varying vec2 vDir; varying vec3 vCol; varying float vLife;
void main(){
  float c = aCell; vUv = (vec2(mod(c, 4.), 3. - floor(c / 4.)) + uv) / 4.;
  mat4 M = modelMatrix * instanceMatrix; vec4 w = M * vec4(position, 1.); vW = w.xyz;
  vDir = (mat3(M) * vec3(position.x, 0., position.z)).xz; vCol = aCol; vLife = aLife;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */`
uniform sampler2D uTex; uniform vec3 uSunDir, uSunCol, uShadeCol, uFogCol, uRim; uniform float uFogDen, uGain, uRimK;
uniform vec4 uL[${MAXL}]; uniform vec3 uLC[${MAXL}]; uniform int uLN;
varying vec2 vUv; varying vec3 vW; varying vec2 vDir; varying vec3 vCol; varying float vLife;
void main(){
  vec4 m = texture2D(uTex, vUv); float d = distance(vW, cameraPosition);
  if (m.a < vLife) discard;                                         // след растворяется кусками
  if (m.a < smoothstep(26., 40., d)) discard;                        // вдали мелочь редеет (не пестрит)
  if (m.g > .45 && m.r < .5) {
    // линия «на отрыве» только со стороны света; вдали растворяется пятнами, как линейная аура
    vec2 sd = normalize(uSunDir.xz + vec2(1e-4)); float side = dot(normalize(vDir + vec2(1e-4)), sd);
    if (side < .05 || m.a > 1. - smoothstep(7., 16., d)) discard;
    gl_FragColor = vec4(uRim * uRimK, .5);
  } else if (m.r > .5) {
    vec3 lit = uShadeCol * .7 + uSunCol * .55 * max(uSunDir.y, 0.);
    for (int i = 0; i < ${MAXL}; i++) { if (i >= uLN) break; float a = 1. - distance(uL[i].xyz, vW) / uL[i].w; if (a <= 0.) continue; float k = a * a; lit += uLC[i] * (.34 * step(.04, k) + .3 * step(.15, k) + .36 * step(.35, k)); }
    vec3 col = vCol * (1. - .45 * m.b) * lit * uGain;
    col = mix(col, uFogCol, clamp(1. - exp(-d * uFogDen), 0., .96));
    gl_FragColor = vec4(col, 1.);
  } else discard;
  #include <colorspace_fragment>
}`;

const COLS = { birch: ['#a07a30', '#8a6a2a'], willow: ['#7a7a34', '#6a6a2c'], oak: ['#6e4a22', '#8a5a26'], curl: ['#7a5424', '#94702c'], twig: ['#4a3420', '#3a2a1a'], fork: ['#4a3420'],
  pebbles: ['#7d7a6a', '#6a685c'], stone: ['#6a685c', '#5a5a50'], needles: ['#5a4a2a', '#6a5430'], bark: ['#4e3a24'], pile: ['#8a6a2a', '#6e4a22'] };
const PICK = [['birch', 3], ['willow', 2], ['oak', 2], ['curl', 2], ['twig', 2], ['fork', 1], ['pebbles', 2], ['stone', 1], ['needles', 2], ['bark', 1], ['pile', 1]];
const SIZE = { birch: 0.2, willow: 0.22, oak: 0.24, curl: 0.18, twig: 0.45, fork: 0.42, pebbles: 0.32, stone: 0.26, needles: 0.3, bark: 0.22, pile: 0.42 };

export class Debris {
  // fight — LairFight; opts: { center: [x, z], radius, count, gain }
  constructor(fight, opts = {}) {
    this.f = fight; this.o = { center: [-13, -6], radius: 30, count: 170, gain: 1.0, ...opts };
    this.prints = []; this.pi = 0; this.track = new Map(); this.t = 0; this._slam = false;
    loadHand().then(() => this.build()).catch((e) => console.warn('debris', e));
  }
  material() {
    return new THREE.ShaderMaterial({
      uniforms: { uTex: { value: this.tex }, uSunDir: U.uSunDir, uSunCol: U.uSunCol, uShadeCol: U.uShadeCol, uFogCol: U.uFogCol, uFogDen: U.uFogDen, uL: U.uL, uLC: U.uLC, uLN: U.uLN,
        uGain: { value: this.o.gain }, uRim: { value: new THREE.Color('#e8f0c8') }, uRimK: { value: 0.6 } },
      vertexShader: VERT, fragmentShader: FRAG, blending: THREE.NoBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
  }
  mesh(n) {
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const A = (k, s) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * s), s); g.setAttribute(k, a); return a; };
    const m = new THREE.InstancedMesh(g, this.mat, n); m.userData.pfSkip = true; m.renderOrder = 1; m.frustumCulled = false;
    m.aCell = A('aCell', 1); m.aCol = A('aCol', 3); m.aLife = A('aLife', 1); this.f.scene.add(m); return m;
  }
  onWalk(x, z) { return this.f.floorAt(x, z) - groundAt(x, z) > 0.06; }
  build() {
    this.tex = drawCells(); this.mat = this.material();
    // россыпь: пятнами (где-то гуще, где-то пусто), только по суше, не на мостках
    const r = rng(77); const O = this.o; const items = []; const tot = PICK.reduce((s, p) => s + p[1], 0);
    const clump = (x, z) => { const s = Math.sin(x * 0.31 + Math.sin(z * 0.23) * 2) * Math.sin(z * 0.27 + Math.cos(x * 0.19) * 2); return s; };
    for (let k = 0; k < 6000 && items.length < O.count; k++) {
      const a = r() * 6.283, rad = Math.sqrt(r()) * O.radius; const x = O.center[0] + Math.cos(a) * rad, z = O.center[1] + Math.sin(a) * rad;
      const g = groundAt(x, z); if (g < WATER_Y + 0.05 || this.onWalk(x, z)) continue;
      if (r() > 0.15 + 0.85 * Math.max(0, clump(x, z))) continue;
      let q = r() * tot, kind = PICK[0][0]; for (const [kk, w] of PICK) { if ((q -= w) < 0) { kind = kk; break; } }
      items.push({ x, z, y: g, kind, s: SIZE[kind] * (0.75 + r() * 0.5), yaw: r() * 6.283, col: COLS[kind][Math.floor(r() * COLS[kind].length)] });
    }
    const m = this.mesh(items.length); const M = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    items.forEach((it, i) => {
      M.compose(new THREE.Vector3(it.x, it.y + 0.025, it.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.yaw), new THREE.Vector3(it.s, 1, it.s)); m.setMatrixAt(i, M);
      m.aCell.setX(i, CELL[it.kind]); c.set(it.col); m.aCol.setXYZ(i, c.r, c.g, c.b); m.aLife.setX(i, 0);
    });
    m.instanceMatrix.needsUpdate = true; this.scatter = m;
    // следы: пул, пока спрятаны (масштаб 0)
    this.pm = this.mesh(64); for (let i = 0; i < 64; i++) { this.pm.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); this.pm.aLife.setX(i, 1); this.prints.push({ t: 0, life: 0, on: false }); }
    console.info('debris', items.length);
  }
  // наклейка-след: клетка cell, точка, направление (dx, dz), размер, зеркально, время жизни
  print(cell, x, z, dx, dz, size, mirror, life, col) {
    if (!this.pm) return; const i = this.pi++ % this.prints.length; const y = groundAt(x, z);
    const M = new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.03, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dx, -dz)), new THREE.Vector3(size * (mirror ? -1 : 1), 1, size));
    this.pm.setMatrixAt(i, M); this.pm.instanceMatrix.needsUpdate = true;
    const c = new THREE.Color(col); this.pm.aCell.setX(i, cell); this.pm.aCol.setXYZ(i, c.r, c.g, c.b); this.pm.aCell.needsUpdate = this.pm.aCol.needsUpdate = true;
    Object.assign(this.prints[i], { t: 0, life, on: true });
  }
  // шаги: по пройденному пути, левый-правый по очереди; на воде, мостках и в прыжке следа нет
  steps(c, stride, off, size, cell, life) {
    let s = this.track.get(c); const p = c.pos;
    if (!s) { s = { x: p.x, z: p.z, acc: 0, side: 1 }; this.track.set(c, s); return; }
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz); s.x = p.x; s.z = p.z;
    if (d < 1e-4 || d > 2) return;
    s.acc += d; s.dx = dx / d; s.dz = dz / d; if (s.acc < stride) return; s.acc = 0; s.side = -s.side;
    const g = groundAt(p.x, p.z); if (g < WATER_Y + 0.03 || p.y - g > 0.08 || ['slam', 'dodge', 'dead'].includes(c.state)) return;
    const x = p.x - s.dz * off * s.side, z = p.z + s.dx * off * s.side;
    this.print(cell, x, z, s.dx, s.dz, size, s.side < 0, life, '#3a3018');
  }
  update(dt) {
    if (!this.pm) return; this.t += dt; const f = this.f;
    this.steps(f.hero, 0.78, 0.12, 0.5, CELL.boot, 14);
    if (f.leshy.state !== 'wait') this.steps(f.leshy, 1.35, 0.3, 0.95, CELL.claw, 18);
    // трещина от удара Лешего о землю
    if (f.leshy.done2 && !this._slam) { const w = f.wave.position; if (groundAt(w.x, w.z) > WATER_Y + 0.03) this.print(CELL.crack, w.x, w.z, 0, -1, 3.2, false, 16, '#2a2412'); }
    this._slam = !!f.leshy.done2;
    // время жизни: последние 35% растворяются кусками, шагами 12 к/с
    let ch = false;
    this.prints.forEach((p, i) => { if (!p.on) return; p.t += dt; const u = p.t / p.life; const v = u >= 1 ? 1.01 : Math.max(0, (u - 0.65) / 0.35); const vs = Math.floor(v * 12) / 12;
      if (u >= 1) { p.on = false; this.pm.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); this.pm.instanceMatrix.needsUpdate = true; }
      if (this.pm.aLife.getX(i) !== vs) { this.pm.aLife.setX(i, vs); ch = true; } });
    if (ch) this.pm.aLife.needsUpdate = true;
  }
}
