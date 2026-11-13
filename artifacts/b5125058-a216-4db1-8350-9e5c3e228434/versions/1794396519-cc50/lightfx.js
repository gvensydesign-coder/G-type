// Свет и цвет логова поверх утверждённой сцены (агент A):
//  1) пятна света на земле под огнями, фонарями и в просветах луны — плоские ступени тона (как TMNT), край и фактура
//     мазками Michael (scribbles/brush.json), за краем — тёмная кайма (свет «вырезан» из темноты);
//  2) кольца-ореолы вокруг огня — концентрические линии из «Линий света» Michael (scribbles/light.json),
//     согнутые по кругу; кадры сменяются шагами, чуть дышат; на земле — те же кольца плашмя;
//  3) разделение по тону у главных фигур: за богатырём и Лешим — мягкая холодная тень-подложка (множение),
//     фигура в тёплом свете читается на более тёмном и холодном фоне. Общий цвет кадра не трогаем.
// Тонкие линии пишут альфу .5 (Кувахара их не размывает), мягкие пятна альфу не трогают.
import * as THREE from 'three';
import { WATER_Y } from './lair/lair.js';

const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lin = (c) => new THREE.Color(c);

// ---------------------------------------------------------------- рисунки Michael
// формат почеркушек: штрих = [w, x, y, нажим, x, y, нажим, ...] (0..1 поля)
const SCRIB = { light: null, brush: null };
async function loadScrib(k) {
  try { const r = await fetch('scribbles/' + k + '.json'); if (!r.ok) return null; const d = await r.json(); return Object.values(d.slots ?? {}).map((v) => v.s ?? []).filter((s) => s.length); } catch { return null; }
}
// запасной штрих, пока рисунки не загрузились: дуга с нажимом
const FALLBACK = [[[0.012, ...Array.from({ length: 12 }, (_, i) => [i / 11, 0.5 + Math.sin(i / 11 * 3.1) * 0.04, 0.5 + 0.5 * Math.sin(i / 11 * 3.1)]).flat()]]];
function slotBox(slot) {
  let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
  for (const s of slot) for (let i = 1; i + 2 < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); }
  return { x0, x1, y0, y1, w: Math.max(1e-3, x1 - x0), h: Math.max(1e-3, y1 - y0) };
}
// штрих (или пучок) Michael, согнутый по окружности: x → угол, y → отступ по радиусу
function bentSlot(g, slot, cx, cy, R, a0, span, band, wPx, flip = 1) {
  const b = slotBox(slot); const ym = (b.y0 + b.y1) / 2; const sy = band / Math.max(b.w, b.h);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const s of slot) {
    const P = []; for (let i = 1; i + 2 < s.length; i += 3) { const a = a0 + (s[i] - b.x0) / b.w * span * flip; const r = R + (s[i + 1] - ym) * sy; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, s[i + 2]]); }
    for (let i = 1; i < P.length; i++) { g.lineWidth = Math.max(1, wPx * (0.35 + 0.75 * P[i][2])); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
  }
}

// ---------------------------------------------------------------- текстуры
// пятно света: R — свет (две ступени), G — тёмная кайма за краем. Два варианта рядом (кадры «кипения»).
function poolCanvas(c, brush) {
  const S = 256; c.width = S * 2; c.height = S; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
  const lay = (draw) => { const t = document.createElement('canvas'); t.width = S; t.height = S; const q = t.getContext('2d'); q.fillStyle = q.strokeStyle = '#fff'; draw(q); return q.getImageData(0, 0, S, S).data; };
  for (let v = 0; v < 2; v++) {
    const sd = v * 17.3; const cx = S / 2, cy = S / 2;
    // свет: ровная заливка + мазки по кругу рвут край (кисть Michael поперёк края)
    const ring = (q, R, n, wPx, band) => {
      q.beginPath(); q.arc(cx, cy, R * 0.92, 0, 6.2832); q.fill();
      for (let i = 0; i < n; i++) { const sl = brush[Math.floor(H(i * 3.1 + sd) * brush.length)]; const a = i / n * 6.2832 + H(i + sd) * 0.4; bentSlot(q, sl, cx, cy, R * (0.9 + H(i * 7 + sd) * 0.12), a, 0.9 + H(i * 5 + sd) * 0.5, band, wPx, H(i * 9 + sd) > 0.5 ? 1 : -1); }
    };
    const outer = lay((q) => ring(q, S * 0.36, 11, S * 0.05, S * 0.1));
    const inner = lay((q) => ring(q, S * 0.17, 7, S * 0.04, S * 0.06));
    // фактура внутри: несколько светлых и тёмных мазков вдоль круга
    const tex = lay((q) => { for (let i = 0; i < 9; i++) { const sl = brush[Math.floor(H(i * 4.7 + sd + 3) * brush.length)]; bentSlot(q, sl, cx, cy, S * (0.08 + H(i * 2.3 + sd) * 0.24), H(i * 1.9 + sd) * 6.28, 0.8, S * 0.05, S * 0.025); } });
    const dark = lay((q) => { q.globalAlpha = 0.8; for (let i = 0; i < 12; i++) { const sl = brush[Math.floor(H(i * 5.3 + sd + 1) * brush.length)]; bentSlot(q, sl, cx, cy, S * (0.43 + H(i * 3.7 + sd) * 0.03), i / 12 * 6.28 + H(i + sd), 0.85, S * 0.08, S * 0.07); } });
    const out = g.createImageData(S, S); const o = out.data;
    for (let p = 0; p < S * S * 4; p += 4) {
      const ou = outer[p] / 255, inn = inner[p] / 255, tx = tex[p] / 255, dk = dark[p] / 255;
      const L = Math.max(ou * 0.5, inn) * (1 - 0.25 * tx * (inn > 0.5 ? 1 : -1.2));
      o[p] = Math.min(255, L * 255); o[p + 1] = dk * (1 - ou) * 255; o[p + 2] = 0; o[p + 3] = 255;
    }
    g.putImageData(out, v * S, 0);
  }
}
// кольца ореола: R, G, B — внутреннее, среднее, внешнее кольцо; три кадра в ряд
function ringCanvas(c, light) {
  const S = 512; c.width = S * 3; c.height = S; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'lighter';
  const RINGS = [[0.36, '#ff0000', 0.03], [0.6, '#00ff00', 0.024], [0.84, '#0000ff', 0.018]];
  for (let f = 0; f < 3; f++) {
    g.save(); g.beginPath(); g.rect(f * S, 0, S, S); g.clip();
    RINGS.forEach(([r, col, w], k) => {
      g.strokeStyle = col; const n = 3 + (k === 2 ? 1 : 0);                       // дуги-пучки по кругу с разрывами
      for (let i = 0; i < n; i++) {
        const sl = light[Math.floor(H(f * 31 + k * 7 + i * 3.3) * light.length)];
        const a0 = i / n * 6.2832 + H(f * 13 + k * 5 + i) * 0.9; const span = 6.2832 / n * (0.55 + H(f * 3 + k + i * 11) * 0.3);
        bentSlot(g, sl, f * S + S / 2, S / 2, r * S / 2, a0, span, S * 0.035, S * w, H(i * 2 + k + f) > 0.5 ? 1 : -1);
      }
    });
    g.restore();
  }
}
// подложка-тень за фигурой: мягкое пятно, край мазками
function cardCanvas(c, brush) {
  const S = 256; c.width = S; c.height = S; const g = c.getContext('2d'); g.clearRect(0, 0, S, S);
  const gr = g.createRadialGradient(S / 2, S * 0.5, S * 0.08, S / 2, S * 0.5, S * 0.46); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 10; i++) { const sl = brush[Math.floor(H(i * 2.9 + 5) * brush.length)]; bentSlot(g, sl, S / 2, S / 2, S * 0.4, i / 10 * 6.28, 0.7, S * 0.08, S * 0.06); }
}
function canvasTex(draw) { const c = document.createElement('canvas'); draw(c); const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }

// ---------------------------------------------------------------- шейдеры
const FLAT_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
// свет прибавляется, тёмная кайма умножает фон: src + dst·(1 − a); альфа кадра не меняется
const POOL_FRAG = /* glsl */`
uniform sampler2D tP; uniform vec3 uCol; uniform float uAmt, uDark, uFrame, uRot; varying vec2 vUv;
void main(){
  vec2 p = vUv - .5; float c = cos(uRot), s = sin(uRot); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + .5;
  if (p.x < .004 || p.x > .996 || p.y < .004 || p.y > .996) discard;
  vec4 t = texture2D(tP, vec2((p.x + uFrame) * .5, p.y));
  float L = t.r * uAmt, D = t.g * uDark;
  if (L < .004 && D < .004) discard;
  gl_FragColor = vec4(uCol * L, D);
}`;
const POOL_BLEND = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
// кольца: экранный лист у источника (или плашмя на земле)
const RING_BB_VERT = /* glsl */`uniform float uSize, uPush; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0., 0., 0., 1.); mv.xyz += normalize(mv.xyz) * uPush; mv.xy += position.xy * uSize; gl_Position = projectionMatrix * mv; }`;
const RING_FRAG = /* glsl */`
uniform sampler2D tR; uniform vec3 cA, cB, cC; uniform float uAmt, uFrame, uScale; varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) / uScale + .5;
  if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) discard;
  vec3 t = texture2D(tR, vec2((p.x + uFrame) / 3., p.y)).rgb;
  vec3 c = (cA * t.r + cB * t.g + cC * t.b) * uAmt;
  float m = max(t.r, max(t.g, t.b));
  if (m < .12) discard;
  gl_FragColor = vec4(c, .5);
}`;
// кольца: свет прибавляется, альфа .5 там, где линия (защита от Кувахары, как у LampFX)
const RING_BLEND = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.ZeroFactor };
const CARD_FRAG = /* glsl */`
uniform sampler2D tC; uniform vec3 uTint; uniform float uK; varying vec2 vUv;
void main(){
  float a = texture2D(tC, vUv).a * uK * smoothstep(.0, .3, vUv.y);       // у земли сходит на нет: нет шва по полу
  if (a < .004) discard;
  gl_FragColor = vec4(mix(vec3(1.), uTint, a), 1.);
}`;
const CARD_BLEND = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

function skip(m) { m.userData.pfSkip = true; m.frustumCulled = false; m.castShadow = m.receiveShadow = false; return m; }
// лист, лежащий по земле/настилу (сетка 12×12 по высоте поверхности)
function drape(size, cx, cz, surf, lift = 0.04) {
  const g = new THREE.PlaneGeometry(size, size, 12, 12); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setY(i, surf(x, z) + lift); }
  g.translate(cx, 0, cz); p.needsUpdate = true; g.computeBoundingSphere(); return g;
}

// ---------------------------------------------------------------- система
export class LightFX {
  // lf — LairFight. o.pools / o.rings / o.cards — включение слоёв
  constructor(lf, o = {}) {
    this.lf = lf; this.o = { pools: true, rings: true, cards: true, ...o }; this.t = 0; this.st = -1;
    this.group = new THREE.Group(); this.group.name = 'lightfx'; lf.scene.add(this.group);
    this.texP = canvasTex((c) => poolCanvas(c, FALLBACK)); this.texR = canvasTex((c) => ringCanvas(c, FALLBACK)); this.texC = canvasTex((c) => cardCanvas(c, FALLBACK));
    this.texR.minFilter = THREE.LinearFilter; this.texR.generateMipmaps = false;   // тонкие линии без мип-размытия
    this.pools = []; this.rings = []; this.cards = [];
    const surf = (x, z, y = 99) => lf.floorAt(x, z, y);
    if (this.o.pools) this.buildPools(surf);
    if (this.o.rings) this.buildRings(surf);
    if (this.o.cards) this.buildCards();

    // рисунки Michael: перерисовать текстуры, когда загрузятся
    Promise.all([loadScrib('light'), loadScrib('brush')]).then(([L, B]) => {
      SCRIB.light = L?.length ? L : null; SCRIB.brush = B?.length ? B : null;
      if (SCRIB.brush) { poolCanvas(this.texP.image, SCRIB.brush); this.texP.needsUpdate = true; cardCanvas(this.texC.image, SCRIB.brush); this.texC.needsUpdate = true; }
      if (SCRIB.light) { ringCanvas(this.texR.image, SCRIB.light); this.texR.needsUpdate = true; }
    });
  }
  pool(x, z, y, R, color, k, dark, flick, seed) {
    const U = { tP: { value: this.texP }, uCol: { value: lin(color).multiplyScalar(k) }, uAmt: { value: 1 }, uDark: { value: dark }, uFrame: { value: 0 }, uRot: { value: 0 } };
    const m = skip(new THREE.Mesh(drape(R * 2, x, z, (a, b) => this.lf.floorAt(a, b, y)), new THREE.ShaderMaterial({ uniforms: U, vertexShader: FLAT_VERT, fragmentShader: POOL_FRAG, ...POOL_BLEND })));
    m.renderOrder = 1; this.group.add(m); this.pools.push({ m, U, flick, seed, k }); return m;
  }
  buildPools(surf) {
    const lf = this.lf, F = lf.firePos; const lights = lf.world.lights ?? [];
    // костёр: своё пятно вместо прежнего (тёплое ядро, ступень, тёмная кайма)
    if (lf.fire?.pool) lf.fire.pool.visible = false;
    this.firePool = this.pool(F.x, F.z, F.y, 2.5, '#ff9a48', 0.2, 0.3, 0.6, 1.3);
    // фонари и факелы: невысоко над землёй или настилом, не над водой
    let n = 0;
    for (const l of lights) {
      if (n >= 26) break;
      if (Math.hypot(l.pos.x - F.x, l.pos.z - F.z) < 1.6) continue;
      const y = surf(l.pos.x, l.pos.z, l.pos.y); const h = l.pos.y - y;
      if (h < 0.3 || h > 3.2 || y < WATER_Y + 0.05) continue;
      const c = new THREE.Color(l.col[0], l.col[1], l.col[2]); const warm = c.r > c.b;
      const R = THREE.MathUtils.clamp(l.r * 0.26, 1.0, 2.3) * (0.75 + 0.25 * Math.min(1, h / 2));
      this.pool(l.pos.x, l.pos.z, l.pos.y, R, '#' + c.getHexString(), warm ? 0.15 : 0.11, warm ? 0.22 : 0.12, l.flick, n * 2.7); n++;
    }
    // просветы луны: холодные бледные пятна там, где лучи падают на землю (холод против тёплых огней)
    for (const S of lf.shafts?.items ?? []) {
      const s = { p: [S.uBase.value.x, 0, S.uBase.value.z], w: S.uW.value, k: S.uK?.value ? S.uK.value / 0.09 : 1 }; const [x, , z] = s.p; const y = surf(x, z); if (y < WATER_Y + 0.05) continue;
      this.pool(x, z, y + 1, Math.min(3.2, s.w * 0.55), '#cfffc0', 0.07 * (s.k ?? 1), 0.12, 0, x + z);
    }
    this.nLamp = n;
  }
  ringMesh(size, U, flat, surf, at) {
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: flat ? FLAT_VERT : RING_BB_VERT, fragmentShader: RING_FRAG, side: THREE.DoubleSide, ...RING_BLEND });
    const m = skip(new THREE.Mesh(flat ? drape(size, at.x, at.z, surf, 0.05) : new THREE.PlaneGeometry(1, 1), mat));
    if (!flat) m.position.copy(at);
    m.renderOrder = flat ? 2 : 3; this.group.add(m); return m;
  }
  ringU(size, push, cols, k) {
    return { tR: { value: this.texR }, uSize: { value: size }, uPush: { value: push }, uAmt: { value: k }, uFrame: { value: 0 }, uScale: { value: 1 },
      cA: { value: lin(cols[0]).multiplyScalar(cols[3]) }, cB: { value: lin(cols[1]).multiplyScalar(cols[3]) }, cC: { value: lin(cols[2]).multiplyScalar(cols[3]) } };
  }
  buildRings(surf) {
    const lf = this.lf, F = lf.firePos;
    // костёр: прежний ореол тише — кольца берут его роль
    if (lf.fire?.haloU) { lf.fire.haloU.cA.value.multiplyScalar(0.5); lf.fire.haloU.cB.value.multiplyScalar(0.5); }
    const FC = ['#ffd27a', '#ff9a40', '#ff5a1e', 0.55];
    { const U = this.ringU(2.6, 0.35, FC, 1); this.ringMesh(1, U, false, surf, new THREE.Vector3(F.x, F.y + 0.25, F.z)); this.rings.push({ U, k: 1, seed: 0.7, ph: 0 }); }
    { const U = this.ringU(1, 0, ['#ffb060', '#ff7a30', '#c84a20', 0.28], 1); this.ringMesh(4.4, U, true, (a, b) => lf.floorAt(a, b, F.y), F); this.rings.push({ U, k: 1, seed: 2.1, ph: 1 }); }
    // факелы: два внутренних кольца, тише и мельче
    (lf.lamps ?? []).forEach((lp, i) => {
      const sz = lp.U?.uSize?.value ?? 1; const U = this.ringU(sz * 0.85, 0.12, ['#ffe0a0', '#ffa040', '#000000', 0.26], 1);
      this.ringMesh(1, U, false, surf, lp.group.position); this.rings.push({ U, k: 1, seed: i * 1.9 + 4, ph: i % 3 });
    });
  }
  buildCards() {
    const lf = this.lf;
    for (const [c, w, h, k] of [[lf.hero, 1.7, 2.3, 0.6], [lf.leshy, 2.6, 3.4, 0.55]]) {
      const U = { tC: { value: this.texC }, uTint: { value: new THREE.Color(0.62, 0.72, 0.8) }, uK: { value: k } };
      const g = new THREE.PlaneGeometry(w, h); g.translate(0, h * 0.5 - 0.1, 0);
      const m = skip(new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: FLAT_VERT, fragmentShader: CARD_FRAG, side: THREE.DoubleSide, ...CARD_BLEND })));
      m.renderOrder = 0; this.group.add(m); this.cards.push({ m, c, U, k });
    }
  }
  update(dt) {
    this.t += dt; const st = Math.floor(this.t * 12); const cam = this.lf.ctx.camera;
    if (st !== this.st) {
      this.st = st;
      // пятна: дрожат по силе шагами, рисунок переключается раз в ~0,5 с, поворот на волосок
      for (const P of this.pools) {
        const j = H(st * 0.37 + P.seed); P.U.uAmt.value = 1 - P.flick * 0.14 * j;
        if (st % 6 === 0) { P.U.uFrame.value = H(Math.floor(st / 6) + P.seed) > 0.5 ? 1 : 0; P.U.uRot.value = (H(st + P.seed * 3) - 0.5) * 0.08; }
      }
      // кольца: кадр раз в 3 шага (4 к/с), дыхание ±3% и мерцание силы
      for (const R of this.rings) {
        const s3 = Math.floor((st + R.ph) / 3); R.U.uFrame.value = Math.floor(H(s3 + R.seed) * 3) % 3;
        R.U.uScale.value = 0.97 + 0.06 * H(st * 1.3 + R.seed); R.U.uAmt.value = R.k * (0.8 + 0.3 * H(st * 0.71 + R.seed));
      }
    }
    // подложки: за фигурой относительно камеры, лицом к камере (по вертикали)
    for (const C of this.cards) {
      const p = C.c.pos; const d = new THREE.Vector3(p.x - cam.position.x, 0, p.z - cam.position.z); const L = d.length() || 1; d.divideScalar(L);
      C.m.position.set(p.x + d.x * 0.85, p.y, p.z + d.z * 0.85); C.m.rotation.set(0, Math.atan2(-d.x, -d.z), 0);
      C.m.visible = L > 1.6 && C.c.state !== 'dead';
      C.U.uK.value = C.k * THREE.MathUtils.clamp((L - 1.6) / 2, 0, 1);
    }
  }
  dispose() { this.group.removeFromParent(); }
}
