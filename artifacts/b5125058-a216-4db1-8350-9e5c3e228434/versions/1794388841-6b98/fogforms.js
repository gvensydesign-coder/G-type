// Туман и пыль формами: не дымка, а нарисованные пласты с обводкой (видео t022/t024: туман слоями с
// чёткой кромкой и светлой полосой по верху; TMNT: дым — пятна с контуром). Пласт = союз «клубов»-кругов,
// заливка полупрозрачная (её сглаживает Кувахара), светлая полоса по верху, контур — твоими штрихами
// (scribbles/outline + handlib, защищён alpha .5).
// Пыль: клубы у ног при уклоне богатыря и при ударе Лешего о землю, растворяются кусками шагами 12 к/с.
import * as THREE from 'three';
import { groundAt, WATER_Y } from './lair/lair.js';
import { loadHand, handRun, rng, canvas, packTex } from './foreground.js';

const AW = 1024, AH = 1280;           // атлас: 3 пласта 1024×320, внизу 3 клуба пыли 320×320
const BANK = (i) => [0, i * 320, 1024, 320];
const PUFF = (i) => [i * 340, 960, 320, 320];
const uvCell = ([x, y, w, h]) => new THREE.Vector4(x / AW, 1 - (y + h) / AH, w / AW, h / AH);

export function drawForm(gf, gt, gl, cell, r, { bank }) {
  const [ox, oy, cw, ch] = cell; const C = [];
  if (bank) {
    const n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const end = Math.min(u, 1 - u) < 0.12 ? 0.6 : 1;
      C.push([ox + cw * (0.06 + 0.88 * u + (r() - 0.5) * 0.04), oy + ch * (0.6 + (r() - 0.5) * 0.14), ch * (0.2 + r() * 0.16) * end]); }
  } else {
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + r(); const d = i ? cw * 0.16 : 0; C.push([ox + cw / 2 + Math.cos(a) * d, oy + ch * 0.55 + Math.sin(a) * d * 0.7, cw * (i ? 0.17 + r() * 0.06 : 0.24)]); }
  }
  const rect = bank ? [C[0][0], Math.min(...C.map((c) => c[1])), C[C.length - 1][0], oy + ch] : null;
  const shape = (g, dy = 0) => { g.beginPath(); for (const [x, y, rr] of C) { g.moveTo(x + rr, y + dy); g.arc(x, y + dy, rr, 0, 6.2832); } if (rect) g.rect(rect[0], rect[1] + dy, rect[2] - rect[0], rect[3] - rect[1]); g.fill(); };
  gf.save(); gf.beginPath(); gf.rect(ox, oy, cw, ch); gf.clip(); gf.fillStyle = '#fff'; shape(gf);
  if (bank) { const gr = gf.createLinearGradient(0, oy + ch * 0.7, 0, oy + ch * 0.98); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gf.globalCompositeOperation = 'destination-in'; gf.fillStyle = gr; gf.fillRect(ox, oy, cw, ch); }
  gf.restore();
  // светлая полоса по верху: форма минус её сдвиг вниз
  gt.save(); gt.beginPath(); gt.rect(ox, oy, cw, ch); gt.clip(); gt.fillStyle = '#fff'; shape(gt);
  gt.globalCompositeOperation = 'destination-out'; shape(gt, bank ? 16 : 22); gt.restore();
  // контур союза кругов (верх и бока; у пласта низ уходит в воду без линии)
  const inside = (x, y, j) => C.some((c, k) => k !== j && Math.hypot(x - c[0], y - c[1]) < c[2] - 1) || (rect && x > rect[0] && x < rect[2] && y > rect[1] + 1);
  for (let j = 0; j < C.length; j++) {
    const [x, y, rr] = C[j]; let run = [];
    const flush = () => { if (run.length > 3) handRun(gl, run, bank ? 3.6 : 3, '#fff', r, { len0: 30, len1: 90, gap0: 3, gap1: 9, jit: 0.02 }); run = []; };
    for (let i = 0; i <= 96; i++) { const a = Math.PI + i / 96 * Math.PI * 2; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (inside(px, py, j) || (bank && py > oy + ch * 0.74) || px < ox + 2 || px > ox + cw - 2 || py < oy + 2) flush(); else run.push([px, py]); }
    flush();
  }
}

const VERT = 'uniform vec4 uCell; varying vec2 vUv; varying vec3 vW; void main(){ vUv = uCell.xy + uv * uCell.zw; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const FILL = /* glsl */`
uniform sampler2D uTex; uniform vec3 uBody, uTop; uniform float uA, uDis, uNear; varying vec2 vUv; varying vec3 vW;
void main(){
  vec4 m = texture2D(uTex, vUv); float d = distance(vW, cameraPosition);
  float fade = smoothstep(uNear, uNear * 2.4, d) * (1. - smoothstep(55., 85., d));
  if (m.a < uDis) discard;
  float a = m.r * uA * fade; if (a < .02) discard;
  gl_FragColor = vec4(mix(uBody, uTop, m.g * .85), a);
  #include <colorspace_fragment>
}`;
const LINE = /* glsl */`
uniform sampler2D uTex; uniform vec3 uLine; uniform float uDis, uNear; varying vec2 vUv; varying vec3 vW;
void main(){
  vec4 m = texture2D(uTex, vUv); float d = distance(vW, cameraPosition);
  float fade = smoothstep(uNear, uNear * 2.4, d) * (1. - smoothstep(45., 75., d));
  if (m.b < .45 || m.a < uDis || m.a > fade) discard;       // вдали и вблизи контур растворяется кусками
  gl_FragColor = vec4(uLine, .5);
  #include <colorspace_fragment>
}`;

export class FogForms {
  // fight — LairFight; opts: { center: [x, z], n, body, top, line }
  constructor(fight, opts = {}) {
    this.f = fight; this.banks = []; this.puffs = []; this.pi = 0; this.t = 0;
    this.o = { center: [-13, -6], n: 7, body: '#3c6a58', top: '#7aa688', line: '#0b1d18', a: 0.6, ...opts };
    this._st = { slam: false, dodge: false };
    loadHand().then(() => this.build()).catch((e) => console.warn('fogforms', e));
  }
  mats(tex, cell, { body, top, line, a, near }) {
    const U = { uTex: { value: tex }, uCell: { value: uvCell(cell) }, uDis: { value: 0 }, uNear: { value: near } };
    const fill = new THREE.ShaderMaterial({ uniforms: { ...U, uBody: { value: new THREE.Color(body) }, uTop: { value: new THREE.Color(top) }, uA: { value: a } }, vertexShader: VERT, fragmentShader: FILL, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const ln = new THREE.ShaderMaterial({ uniforms: { ...U, uLine: { value: new THREE.Color(line) } }, vertexShader: VERT, fragmentShader: LINE, blending: THREE.NoBlending, depthWrite: false, side: THREE.DoubleSide });
    return [fill, ln, U];
  }
  build() {
    const cf = canvas(AW, AH), ct = canvas(AW, AH), cl = canvas(AW, AH); const r = rng(91);
    const [gf, gt, gl] = [cf, ct, cl].map((c) => c.getContext('2d'));
    for (let i = 0; i < 3; i++) drawForm(gf, gt, gl, BANK(i), r, { bank: true });
    for (let i = 0; i < 3; i++) drawForm(gf, gt, gl, PUFF(i), r, { bank: false });
    this.tex = packTex([cf, ct, cl], { seed: 5 });
    const sc = this.f.scene; const O = this.o;
    // пласты над открытой водой вокруг места боя
    const R = rng(17); const placed = [];
    // сначала — по линии взгляда от богатыря к двери Лешего (их видно в начале боя), потом вокруг
    const h = this.f.hero.pos, L = this.f.leshy.pos; const ux = L.x - h.x, uz = L.z - h.z, ul = Math.hypot(ux, uz) || 1;
    const pref = []; for (const t of [12, 17, 22]) for (const o of [-8, 8, -3, 3]) pref.push([h.x + ux / ul * t - uz / ul * o, h.z + uz / ul * t + ux / ul * o]);
    for (let k = 0; k < 400 + pref.length && placed.length < O.n; k++) {
      const a = R() * 6.283, rad = 14 + R() * 26; let x = O.center[0] + Math.cos(a) * rad, z = O.center[1] + Math.sin(a) * rad;
      if (k < pref.length) { if (placed.length >= 3) continue; [x, z] = pref[k]; }
      if (groundAt(x, z) > WATER_Y - 0.12 || placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 8)) continue;
      placed.push([x, z]);
    }
    placed.forEach(([x, z], i) => {
      const cell = BANK(i % 3); const [fill, ln] = this.mats(this.tex, cell, { ...O, near: 3.5 });
      const w = 8 + R() * 7; const g = new THREE.PlaneGeometry(1, 320 / 1024); g.translate(0, 160 / 1024, 0);
      const grp = new THREE.Group(); grp.position.set(x, WATER_Y - 0.25, z); grp.scale.setScalar(w);
      const mf = new THREE.Mesh(g, fill), ml = new THREE.Mesh(g, ln); mf.renderOrder = 3; ml.renderOrder = 4;
      for (const m of [mf, ml]) { m.userData.pfSkip = true; grp.add(m); }
      grp.userData.pfSkip = true; sc.add(grp); this.banks.push({ grp, x, z, ph: R() * 6.283, sp: 0.6 + R() * 0.8 });
    });
    // пыль: пул клубов
    for (let i = 0; i < 12; i++) {
      const [fill, ln, U] = this.mats(this.tex, PUFF(i % 3), { body: '#5e5a3e', top: '#a29c70', line: '#1a170c', a: 0.85, near: 0.6 });
      const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.35, 0);
      const grp = new THREE.Group(); const mf = new THREE.Mesh(g, fill), ml = new THREE.Mesh(g, ln); mf.renderOrder = 5; ml.renderOrder = 6;
      for (const m of [mf, ml]) { m.userData.pfSkip = true; grp.add(m); }
      grp.visible = false; grp.userData.pfSkip = true; sc.add(grp); this.puffs.push({ grp, U, t: 0, life: 1, k: 1, vx: 0, vz: 0 });
    }
  }
  // клуб пыли в точке (x, y, z), k — размер
  puff(x, y, z, k = 1, vx = 0, vz = 0) {
    if (!this.puffs.length) return; const p = this.puffs[this.pi++ % this.puffs.length];
    p.grp.position.set(x, y, z); p.t = 0; p.life = 0.8 + 0.4 * k; p.k = k; p.vx = vx; p.vz = vz; p.grp.visible = true; p.U.uDis.value = 0;
  }
  update(dt) {
    if (!this.tex) return; this.t += dt; const cam = this.f.ctx.camera; const st = Math.floor(this.t * 12) / 12;
    // пласты: медленно ползут вдоль берега и «дышат», шагами
    for (const b of this.banks) {
      const s = st * 0.05 * b.sp + b.ph; b.grp.position.x = b.x + Math.sin(s) * 2.5; b.grp.position.z = b.z + Math.cos(s * 0.7) * 1.5;
      b.grp.rotation.y = Math.atan2(cam.position.x - b.grp.position.x, cam.position.z - b.grp.position.z);
      b.grp.scale.y = b.grp.scale.x * (1 + 0.05 * Math.sin(st * 0.4 + b.ph));
    }
    // события боя: удар Лешего о землю, уклон богатыря
    const L = this.f.leshy, h = this.f.hero;
    if (L && L.done2 && !this._st.slam) { const c = this.f.wave.position; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.4; this.puff(c.x + Math.cos(a) * 1.6, c.y, c.z + Math.sin(a) * 1.6, 1.3, Math.cos(a) * 1.4, Math.sin(a) * 1.4); } }
    this._st.slam = !!L?.done2;
    if (h && h.state === 'dodge' && !this._st.dodge) { const d = h.dodgeDir ?? new THREE.Vector3(); for (let i = 0; i < 2; i++) this.puff(h.pos.x - d.x * (0.3 + i * 0.4) + (i - 0.5) * 0.3, h.pos.y, h.pos.z - d.z * (0.3 + i * 0.4), 0.6, -d.x * 0.6, -d.z * 0.6); }
    this._st.dodge = h?.state === 'dodge';
    for (const p of this.puffs) {
      if (!p.grp.visible) continue; p.t += dt; const u = p.t / p.life; if (u >= 1) { p.grp.visible = false; continue; }
      const us = Math.floor(u * p.life * 12) / (p.life * 12);    // шагами
      const s = p.k * (0.5 + 1.2 * (1 - Math.pow(1 - us, 2)));
      p.grp.scale.setScalar(s); p.grp.position.x += p.vx * dt * (1 - u); p.grp.position.z += p.vz * dt * (1 - u); p.grp.position.y += dt * 0.5 * (1 - u);
      p.grp.quaternion.copy(cam.quaternion);
      p.U.uDis.value = Math.max(0, (us - 0.35) / 0.65);               // растворяется кусками
    }
  }
}
