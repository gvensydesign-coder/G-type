// Ближнее окружение героя (правки Michael 2026-11-09):
// 1) Растения и ветки в тени рядом с героем — тем же рисунком, что силуэты ближнего плана (foreground.js):
//    плоская тёмная заливка, лёгкий тон к свету и тонкая светлая линия «на отрыве» твоими штрихами.
//    Это не рамка экрана: они стоят на земле в мире, появляются ступенями, когда герой рядом и место в тени,
//    и не заслоняют героя от камеры.
// 2) Цветные лучи-палочки у светящихся грибов: короткие штрихи из твоих «Свечение»/«Аура» почеркушек,
//    шевелятся покадрово (8 к/с), только когда герой рядом — вне кадра не мелькают.
import * as THREE from 'three';
import { groundAt, WATER_Y } from './lair/lair.js';
import { SHROOM_SPOTS } from './lair/kit.js';
import { loadHand, silhouette, grassShapes, burdockShapes, rng, ribbon, leaf, bez } from './foreground.js';

const H1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- растения в тени
// молодая поросль: несколько стеблей-веток из земли, листья вверх-в стороны (свет сверху)
function sproutShapes(r) {
  const S = []; const W = 768, H = 768;
  for (let i = 0; i < 5; i++) {
    const x0 = W * (0.4 + r() * 0.2), lean = (r() - 0.5) * 520, h = 380 + r() * 330;
    const C = bez([x0, H + 10], [x0 + lean * 0.05, H - h * 0.4], [x0 + lean * 0.5, H - h * 0.8], [x0 + lean, H - h], 24);
    S.push({ poly: ribbon(C, (t) => 16 * (1 - t) + 3), rw: 3.5 });
    for (let k = 0; k < 6; k++) {
      const p = C[Math.floor((0.3 + 0.7 * r()) * (C.length - 1))]; const sd = r() < 0.5 ? -1 : 1;
      const len = 70 + r() * 90; S.push({ poly: leaf(p[0], p[1], -Math.PI / 2 + sd * (0.5 + r() * 0.9), len, len * (0.24 + r() * 0.1), sd * 0.2) });
    }
  }
  return S;
}
const PLANT_DEFS = [
  { id: 'grass', W: 1024, H: 512, build: grassShapes, lit: [-0.2, -1], seed: 51, h: [0.55, 1.1] },
  { id: 'burdock', W: 1024, H: 512, build: burdockShapes, lit: [0.3, -1], seed: 63, h: [0.45, 0.8] },
  { id: 'sprout', W: 768, H: 768, build: sproutShapes, lit: [0.1, -1], seed: 77, h: [0.8, 1.5] },
];
const PL_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const PL_FRAG = /* glsl */`
uniform sampler2D uTex; uniform vec3 uDark, uLift, uRim; uniform float uK, uCut; varying vec2 vUv;
void main(){
  vec4 m = texture2D(uTex, vUv);
  if (m.a < uCut) discard;                                                    // появление/уход кусками
  if (m.g > .42) { gl_FragColor = vec4(uRim * uK, .5); }                      // линия на отрыве, защищена от Кувахары
  else if (m.r > .5) { gl_FragColor = vec4(mix(uDark, uLift, m.b * .8), 1.); }
  else discard;
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- лучи-палочки у грибов
const RAY_FRAG = /* glsl */`
uniform sampler2D uTex; uniform vec3 uCol; uniform float uFrame; varying vec2 vUv;
void main(){
  float m = texture2D(uTex, vec2((vUv.x + uFrame) / 3., vUv.y)).r;
  if (m < .5) discard;
  gl_FragColor = vec4(uCol, .5);                                              // .5 — без Кувахары, как линейная аура
  #include <colorspace_fragment>
}`;
async function loadScrib(k) {
  try { const r = await fetch('scribbles/' + k + '.json'); if (!r.ok) return []; const d = await r.json(); return Object.values(d.slots ?? {}).map((v) => v.s ?? []).filter((s) => s.length); } catch { return []; }
}
// из каждого рисунка — самый длинный штрих: [[x, y, нажим]]
function longest(slot) {
  let best = null, bl = 0;
  for (const a of slot) { const P = []; for (let i = 1; i + 2 < a.length; i += 3) P.push([a[i], a[i + 1], a[i + 2]]); let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (L > bl && P.length > 2) { bl = L; best = P; } }
  return best;
}
function rayCanvas(strokes) {
  const S = 256; const c = document.createElement('canvas'); c.width = S * 3; c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let f = 0; f < 3; f++) {
    const cx = S * f + S / 2, cy = S / 2; const n = 11;
    for (let i = 0; i < n; i++) {
      const sd = f * 31.7 + i * 7.3;
      const a = (i / n) * 6.2832 + (H1(sd) - 0.5) * 0.35; if (Math.sin(a) > 0.55) continue;   // снизу (в землю) лучей нет
      const r0 = S * (0.2 + H1(sd + 1) * 0.05), len = S * (0.1 + H1(sd + 2) * 0.12);
      const P = strokes.length ? strokes[Math.floor(H1(sd + 3) * strokes.length)] : [[0, 0.5, 0.6], [0.5, 0.52, 0.9], [1, 0.5, 0.4]];
      // штрих Michael: x вдоль луча, y — дрожь поперёк (в долях длины)
      let x0 = 9, x1 = -9, ym = 0; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); ym += p[1] / P.length; }
      const ax = Math.cos(a), ay = Math.sin(a), wx = Math.max(1e-3, x1 - x0);
      // направление штриха по хорде (первая → последняя точка)
      const flip = P[P.length - 1][0] < P[0][0];
      for (let k = 1; k < P.length; k++) {
        const q = (p) => { const u = flip ? (x1 - p[0]) / wx : (p[0] - x0) / wx; const v = (p[1] - ym) / wx * 0.35; const rr = r0 + u * len; return [cx + ax * rr - ay * v * len, cy + ay * rr + ax * v * len]; };
        const A = q(P[k - 1]), B = q(P[k]); g.lineWidth = Math.max(2, 5.5 * (0.4 + 0.8 * P[k][2])); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t;
}

export class NearFX {
  // fight — LairFight; opts: { plants: true, rays: true }
  constructor(fight, opts = {}) {
    this.f = fight; this.cam = fight.ctx.camera; this.o = { plants: true, rays: true, ...opts };
    this.group = new THREE.Group(); this.group.userData.pfSkip = true; fight.scene.add(this.group);
    this.plants = []; this.rays = []; this.cands = []; this._st = -1;
    if (this.o.plants) loadHand().then(() => this.buildPlants()).catch((e) => console.warn('nearfx plants', e));
    if (this.o.rays) Promise.all([loadScrib('glow'), loadScrib('aura')]).then(([a, b]) => this.buildRays([...a, ...b])).catch((e) => console.warn('nearfx rays', e));
  }
  // в тени: дальше от костра и фонарей, на сухой земле, не на настиле и не под ним
  shade(x, z) {
    const F = this.f.firePos; if (Math.hypot(x - F.x, z - F.z) < 6) return false;
    for (const l of this.f.world.lights ?? []) { const d = Math.hypot(x - l.pos.x, z - l.pos.z); if (d < Math.max(1.6, l.r * 0.55)) return false; }
    return true;
  }
  buildPlants() {
    this.tex = PLANT_DEFS.map((d) => { const t = silhouette(d.W, d.H, d.build, d.lit, d.seed); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t; });
    // кандидаты: случайные места вокруг боя (сид), отбор по тени и суше
    const r = rng(4242); const C = this.f.hero.pos; const lf = this.f;
    for (let i = 0; i < 2600 && this.cands.length < 420; i++) {
      const x = C.x + (r() - 0.5) * 110, z = C.z + (r() - 0.5) * 110; const g = groundAt(x, z);
      if (g < WATER_Y + 0.06) continue;
      if (lf.floorAt && lf.floorAt(x, z) - g > 0.06) continue;
      if (!this.shade(x, z)) continue;
      const t = Math.floor(r() * PLANT_DEFS.length); const d = PLANT_DEFS[t];
      this.cands.push({ x, z, y: g - 0.04, t, h: d.h[0] + r() * (d.h[1] - d.h[0]), flip: r() < 0.5, ph: r() * 6.28, on: 0, it: null });
    }
    // пул билбордов (плоскость стоит на нижнем крае и поворачивается к камере вокруг вертикали)
    for (let i = 0; i < 12; i++) {
      const U = { uTex: { value: this.tex[0] }, uDark: { value: new THREE.Color('#070d0b') }, uLift: { value: new THREE.Color('#16241c') }, uRim: { value: new THREE.Color('#d6e6b4') }, uK: { value: 0.6 }, uCut: { value: 1 } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), new THREE.ShaderMaterial({ uniforms: U, vertexShader: PL_VERT, fragmentShader: PL_FRAG, side: THREE.DoubleSide }));
      m.userData.pfSkip = true; m.visible = false; m.renderOrder = 3; m.frustumCulled = false; this.group.add(m); this.plants.push({ m, U, c: null });
    }
  }
  buildRays(slots) {
    const strokes = slots.map(longest).filter(Boolean);
    this.rayTex = rayCanvas(strokes);
    for (let i = 0; i < 10; i++) {
      const U = { uTex: { value: this.rayTex }, uCol: { value: new THREE.Color() }, uFrame: { value: 0 } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: U, vertexShader: PL_VERT, fragmentShader: RAY_FRAG, depthWrite: false }));
      m.userData.pfSkip = true; m.visible = false; m.renderOrder = 4; m.frustumCulled = false; this.group.add(m); this.rays.push({ m, U, s: null, on: 0 });
    }
  }
  update(dt) {
    const st = Math.floor(this.f.t * 12); if (st === this._st) return; this._st = st;   // всё живёт шагами 12 к/с
    const cam = this.cam, H = this.f.hero.pos; const camP = cam.position;
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const hv = H.clone().setY(H.y + 1).project(cam); const hd = H.distanceTo(camP);
    const yaw = Math.atan2(camP.x - H.x, camP.z - H.z);
    if (this.plants.length) {
      // кто ближе 6,5 м к герою, в кадре и не перед ним
      const want = [];
      const v = new THREE.Vector3();
      for (const c of this.cands) {
        const d = Math.hypot(c.x - H.x, c.z - H.z); if (d < 1.4 || d > 6.5) { c.want = false; continue; }
        v.set(c.x, c.y + c.h * 0.5, c.z); const dc = v.distanceTo(camP); v.project(cam);
        const block = dc < hd - 0.4 && Math.abs(v.x - hv.x) < 0.3 && v.y < hv.y + 0.4;
        c.want = !block && Math.abs(v.x) < 1.15 && v.z < 1; if (c.want) want.push([d, c]);
      }
      want.sort((a, b) => a[0] - b[0]); const keep = new Set(want.slice(0, this.plants.length).map((w) => w[1]));
      for (const c of this.cands) if (!keep.has(c)) c.want = false;
      // освобождаем ушедших, раздаём новым
      for (const p of this.plants) if (p.c && !p.c.want && p.c.on <= 0) { p.c.it = null; p.c = null; p.m.visible = false; }
      for (const c of keep) if (!c.it) { const p = this.plants.find((q) => !q.c); if (!p) break; p.c = c; c.it = p; c.on = 0; p.U.uTex.value = this.tex[c.t]; }
      for (const p of this.plants) {
        const c = p.c; if (!c) continue;
        c.on = Math.max(0, Math.min(1, c.on + (c.want ? 0.34 : -0.34)));           // три шага — вырастает или рассыпается кусками
        p.m.visible = c.on > 0;
        const d = PLANT_DEFS[c.t]; const asp = d.W / d.H; const sw = Math.sin(st * 0.45 + c.ph) * 0.03;
        p.m.position.set(c.x, c.y, c.z); p.m.rotation.set(0, yaw + sw * 0.5, sw);
        p.m.scale.set(c.h * asp * (c.flip ? -1 : 1) * (0.85 + 0.15 * c.on), c.h * (0.7 + 0.3 * c.on), 1);
        p.U.uCut.value = 1 - c.on * 0.999;
      }
    }
    if (this.rays.length) {
      const near = [];
      for (const s of SHROOM_SPOTS) { const d = Math.hypot(s.x - H.x, s.z - H.z); if (d < 7.5) near.push([d, s]); }
      near.sort((a, b) => a[0] - b[0]); const keep = new Set(near.slice(0, this.rays.length).map((n) => n[1]));
      for (const r of this.rays) if (r.s && !keep.has(r.s)) { r.on -= 0.5; if (r.on <= 0) { r.s = null; r.m.visible = false; } }
      for (const s of keep) if (!this.rays.some((r) => r.s === s)) { const r = this.rays.find((q) => !q.s); if (r) { r.s = s; r.on = 0; r.U.uCol.value.set(s.col).multiplyScalar(1.15); } }
      const fr = Math.floor(this.f.t * 8);
      for (const r of this.rays) {
        if (!r.s) continue; const s = r.s; const d = Math.hypot(s.x - H.x, s.z - H.z);
        if (keep.has(s)) r.on = Math.min(1, r.on + 0.5) * (d > 6.5 ? Math.max(0.5, (7.5 - d)) : 1);
        r.m.visible = r.on > 0.2;
        r.m.position.set(s.x, s.y + (s.up ? 0.16 : 0.05) * s.s, s.z); r.m.quaternion.copy(cam.quaternion);
        const k = 0.95 * s.s * (0.75 + 0.25 * r.on); r.m.scale.set(k, k, 1);
        r.U.uFrame.value = (fr + Math.floor(s.x * 3)) % 3; r.m.rotateZ((H1(fr + s.z) - 0.5) * 0.25);   // покадрово шевелятся
      }
    }
  }
  dispose() { this.f.scene.remove(this.group); }
}
