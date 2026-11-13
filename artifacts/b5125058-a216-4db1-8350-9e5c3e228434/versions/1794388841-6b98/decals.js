// Линии на предметах логова: тушь в месте контакта, руны и резьба знаками Michael, графичная тень с контактом.
// Шейдерная часть — в matfx.js (DECAL_U, bkDirShadow, «ЛИНИИ 1/2»); здесь карта пола, атлас рун, расстановка и пятна теней героев.
import * as THREE from 'three';
import { DECAL_U, NDEC, setAuraView } from './matfx.js';
import { groundAt, segDist, segT, WATER_Y } from './lair/lair.js';
import { pressureProfile } from './handdrawn.js';

const RUNE_KINDS = { wood: 0, oak: 2, stone: 1, cloth: 1 };   // вид рисунка по материалу: 0 резьба, 1 охра, 2 сурик
const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// образцы класса из scribbles/<класс>.json: [[{ w, p: [[x, y, нажим], ...] }, ...], ...]
async function scrib(cls) {
  try {
    const r = await fetch('scribbles/' + cls + '.json'); if (!r.ok) return [];
    const d = await r.json();
    return Object.keys(d.slots ?? {}).sort().map((k) => (d.slots[k].s ?? []).map((a) => { const p = []; for (let i = 1; i < a.length; i += 3) p.push([a[i], a[i + 1], a[i + 2]]); return { w: a[0], p }; })).filter((s) => s.length);
  } catch { return []; }
}

// атлас рун 4×2 клетки: линии Michael как нарисованы, толще (резьба должна пережить Кувахару), нажим меняет ширину
function runeAtlas(samples) {
  const C = 256, c = document.createElement('canvas'); c.width = C * 4; c.height = C * 2; const g = c.getContext('2d');
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  samples.slice(0, 8).forEach((s, i) => {
    const ox = (i % 4) * C, oy = Math.floor(i / 4) * C;
    // вписываем знак в клетку с полем
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0; for (const st of s) for (const q of st.p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const k = 0.78 / Math.max(x1 - x0, y1 - y0, 0.05); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const M = (q) => [ox + C * (0.5 + (q[0] - cx) * k), oy + C * (0.5 + (q[1] - cy) * k)];
    g.save(); g.beginPath(); g.rect(ox, oy, C, C); g.clip();
    for (const st of s) {
      for (let j = 1; j < st.p.length; j++) {
        const a = M(st.p[j - 1]), b = M(st.p[j]); const pr = st.p[j][2] ?? 0.6;
        g.lineWidth = C * (0.045 + 0.04 * pr); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
    }
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
  return { tex: t, n: Math.min(8, samples.length) };
}

// карта пола: r = земля или вода (что выше), g = мостки (там, где их нет, — та же земля)
function floorMap(world, x0, z0, size, N) {
  const data = new Float32Array(N * N * 4); const st = size / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = x0 + (i + 0.5) * st, z = z0 + (j + 0.5) * st; const y = Math.max(groundAt(x, z), WATER_Y); const o = (j * N + i) * 4;
    data[o] = y; data[o + 1] = y; data[o + 2] = 0; data[o + 3] = 1;
  }
  for (const w of world.walks) {
    const ax = Math.min(w.a[0], w.b[0]) - w.w, bx = Math.max(w.a[0], w.b[0]) + w.w, az = Math.min(w.a[1], w.b[1]) - w.w, bz = Math.max(w.a[1], w.b[1]) + w.w;
    const i0 = Math.max(0, Math.floor((ax - x0) / st)), i1 = Math.min(N - 1, Math.ceil((bx - x0) / st)), j0 = Math.max(0, Math.floor((az - z0) / st)), j1 = Math.min(N - 1, Math.ceil((bz - z0) / st));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + (i + 0.5) * st, z = z0 + (j + 0.5) * st; if (segDist(x, z, w) > w.w * 0.5) continue;
      const wy = w.ramp ? w.ya + (w.yb - w.ya) * segT(x, z, w) : w.y; const o = (j * N + i) * 4;
      if (wy > data[o + 1] || data[o + 1] === data[o]) data[o + 1] = Math.max(wy, data[o]);
    }
  }
  // half float: в WebGL2 фильтруется линейно всегда — линия контакта без ступенек
  const hd = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) hd[i] = THREE.DataUtils.toHalfFloat(data[i]);
  const t = new THREE.DataTexture(hd, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

// пятно-тень героя: цельная форма с резким краем и плотным ядром у ступней, вытянута от луны
const SPOT_FRAG = /* glsl */`
uniform vec2 uDir; uniform float uLen, uK; varying vec2 vUv;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
void main(){
  vec2 p = vUv * 2. - 1.;
  vec2 d = vec2(dot(p, uDir), dot(p, vec2(-uDir.y, uDir.x)));
  float a = atan(p.y, p.x);
  float wob = (n2(vec2(a * 2.2, 1.)) - .5) * .12;
  float core = length(vec2(d.x * 1.15, d.y * 1.3)) - .42 + wob;                       // ядро под ногами
  float tail = length(vec2((d.x - uLen * .35) / (1. + uLen * .5), d.y * 1.25)) - .5 + wob * 1.4; // хвост от луны
  float sh = 1. - smoothstep(-.02, .02, min(core, tail));
  float ink = 1. - smoothstep(-.02, .02, core + .18);                                  // плотная тушь у контакта
  float al = max(sh * .5, ink * .85) * uK;
  if (al < .01) discard;
  gl_FragColor = vec4(vec3(.02, .03, .03), al);
}`;

export class LairDecals {
  constructor(lf) {
    this.lf = lf; const world = lf.world; this.queue = []; this.list = []; this.t = 0;
    // 1) пол для туши контакта: 140 м вокруг логова, 0.25 м на тексель
    const X0 = -70, Z0 = -75, S = 140, N = 560;
    DECAL_U.uFloor.value = floorMap(world, X0, Z0, S, N); DECAL_U.uFloorB.value.set(X0, Z0, 1 / S, 1);
    DECAL_U.uInkK.value.set(1, 0.05, 1.8, 34);
    DECAL_U.uShK.value.set(0.85, 0.22, 0.9, 0.22);
    // 2) нажим и разрывы туши из обводок Michael, руны из «Знаков круга ауры»
    { const d = new Uint8Array(4 * 4).fill(255); const t = new THREE.DataTexture(d, 4, 1); t.needsUpdate = true; DECAL_U.uInkProf.value = t; DECAL_U.uInkProfN.value = 1; }   // пока рисунки не пришли — ровная линия
    scrib('outline').then((s) => { if (s.length) { const P = pressureProfile(s); DECAL_U.uInkProf.value = P.tex; DECAL_U.uInkProfN.value = P.n; } });
    scrib('runes').then((s) => { if (!s.length) return; const A = runeAtlas(s); DECAL_U.uDecTex.value = A.tex; this.nRunes = A.n; this.plan(); });
    // отладка: ?bview=door — камера перед дверью Лешего (проверка рун, туши и ауры вблизи)
    try { const D = world.anim.doorLeshy; if (D && new URLSearchParams(location.search).get('bview') === 'door') {
      const ox = Math.sin(D.yaw), oz = Math.cos(D.yaw), tx = oz, tz = -ox; const by = lf.floorAt(D.x, D.z);
      const P = new THREE.Vector3(D.x + ox * 3.5 + tx * 1.8, by + 1.7, D.z + oz * 3.5 + tz * 1.8), T = new THREE.Vector3(D.x - ox * 2.2, by + 1.5, D.z - oz * 2.2);
      lf.scene.onBeforeRender = (r, sc, cam) => { cam.position.copy(P); cam.lookAt(T); cam.updateMatrixWorld(); };
    } } catch { /* нет location */ }
    // 3) пятна под героями: та же тень, но цельной формой с ядром туши
    this.spotU = lf.spots.map((m, i) => {
      const U = { uDir: { value: new THREE.Vector2(1, 0) }, uLen: { value: 0.9 }, uK: { value: 1 } };
      const R = i ? 1.5 : 0.95;
      m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry(R * 2, R * 2);
      m.material = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: SPOT_FRAG });
      return U;
    });
  }
  // кандидаты: дверь Лешего (сурик по раме и дубу), столбы и камни вокруг поля боя (резьба и охра)
  plan() {
    const lf = this.lf, w = lf.world, D = w.anim.doorLeshy; const q = this.queue;
    if (D) {
      const ox = Math.sin(D.yaw), oz = Math.cos(D.yaw), tx = oz, tz = -ox; const by = lf.floorAt(D.x, D.z);
      for (const [s, h] of [[-2.0, 1.1], [2.0, 1.5], [-1.3, 2.6], [1.4, 2.4], [-2.6, 0.7], [0, 3.3]]) {
        const o = new THREE.Vector3(D.x + tx * s, by + h, D.z + tz * s); q.push({ o, d: new THREE.Vector3(-ox, 0, -oz), door: true });
      }
    }
    const c = lf.hero.pos.clone().lerp(lf.leshy.pos, 0.35);
    const sol = w.solids.filter((s) => s.r < 2.5 && Math.hypot(s.x - c.x, s.z - c.z) < 24).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z)).slice(0, 26);
    sol.forEach((s, i) => {
      const fy = lf.floorAt(s.x, s.z, 99); const dir = new THREE.Vector3(s.x - c.x, 0, s.z - c.z); const L = dir.length(); if (L < 1) return; dir.normalize();
      const o = new THREE.Vector3(s.x, fy + 0.5 + H(i) * 0.9, s.z).addScaledVector(dir, -(s.r + 1.5)); q.push({ o, d: dir });
    });
    this.targets = []; lf.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.lineAura && RUNE_KINDS[o.material?.userData?.kind] !== undefined) this.targets.push(o); });
    this.ray = new THREE.Raycaster(); this.ray.far = 4; try { this._dbg = new URLSearchParams(location.search).has('bdbg'); } catch { /* */ } if (this._dbg) console.info('bplan', q.length, this.targets.length);
  }
  // по одному лучу в кадр: без долгой паузы на старте (сборные меши проверяются целиком)
  step() {
    if (!this.queue.length || this.list.length >= NDEC || !this.targets) return;
    const c = this.queue.shift(); this.ray.set(c.o, c.d);
    const hit = this.ray.intersectObjects(this.targets, false)[0]; if (this._dbg) console.info('bray', c.door ? 'door' : 'sol', c.o.toArray().map((v) => v.toFixed(1)).join(','), hit ? hit.object.material.userData.kind + ' d' + hit.distance.toFixed(2) + ' ny' + hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y.toFixed(2) : 'miss'); if (!hit?.face) return;
    const kind = hit.object.material.userData.kind; let style = RUNE_KINDS[kind]; if (c.door) style = 2;
    const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if (Math.abs(n.y) > 0.6) return;
    if (this.list.some((e) => e.p.distanceTo(hit.point) < (c.door ? 0.9 : 1.6))) return;
    const i = this.list.length; const r = Math.floor(H(i * 3.7 + 1) * (this.nRunes || 1));
    const hs = (c.door ? 0.28 : 0.17) + H(i * 5.1) * 0.06;
    this.list.push({ p: hit.point.clone() });
    DECAL_U.uDecP.value[i].set(hit.point.x, hit.point.y, hit.point.z, hs);
    DECAL_U.uDecQ.value[i].set(n.x, n.y, n.z, 0.1);
    DECAL_U.uDecS.value[i].set(r, style, (H(i * 9.3) - 0.5) * 0.35, style ? 0.85 : 1);
    DECAL_U.uDecN.value = this.list.length;
  }
  update(dt) {
    this.t += dt;
    // лучи в пределах ~8 мс на кадр; если кадры и так медленные (> 0.2 с) — все сразу
    { const t0 = performance.now(); const slow = this._last !== undefined && t0 - this._last > 200; this._last = t0;
      do this.step(); while (this.queue.length && this.list.length < NDEC && (slow || performance.now() - t0 < 8)); this._last = performance.now(); }
    this._n = (this._n ?? 0) + 1; if (this._dbg && this._n < 40) console.info('bdec', this._n, performance.now().toFixed(0), this.list.length);
    const lf = this.lf, cam = lf.ctx.camera; setAuraView(cam, lf.ctx.canvas?.clientHeight || 720);
    // тень героев от луны: направление от света по земле
    const s = lf.moon ? lf.moon.position.clone().sub(lf.moon.target.position) : new THREE.Vector3(-0.4, 1, -0.8);
    const dir = new THREE.Vector2(-s.x, -s.z); const k = dir.length(); dir.normalize();
    const len = THREE.MathUtils.clamp(k / Math.max(s.y, 0.2) * 0.6, 0.3, 0.8);
    lf.spots.forEach((m, i) => { const U = this.spotU[i]; U.uDir.value.set(dir.x, -dir.y); /* плоскость лежит: v растёт к −z */ U.uLen.value = len; m.rotation.z = 0; U.uK.value = (i ? lf.leshy : lf.hero).state === 'dead' ? 0.6 : 1; });
  }
}
