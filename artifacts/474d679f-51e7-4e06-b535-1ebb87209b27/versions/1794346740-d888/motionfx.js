// Движение в бою: линии скорости, кадры-смазы и вспышки удара.
// Референсы: vid2/a f_006 — ложка за один кадр вытягивается светлым хвостом и держится 1–2 кадра;
// vid2/b — реакции жёстким кадром на бит, шаги 12 к/с; TMNT MM — смаз оружия светлой дугой с тёмной кромкой.
// Все формы — штрихи Michael (почеркушки env/aura/brush/glow, handlib metal glint); процедурные — только если класс пуст.
// Пишем альфу 0,5 (защита от Кувахары), глубину не пишем: тело персонажа перекрывает начало линий, линейная аура цела.
import * as THREE from 'three';
import { strokeAtlas, sampleAtlas } from './handdrawn.js';

const STEP = 12;                                   // перерисовка шагами, как в видео
const C = {
  ink: '#17130f', light: '#f2ead2', air: '#dfeee0', hot: '#fffbe8',
  hero: { core: '#ffe6c8', acc: '#c8382a' },       // богатыря ранили: тёплая вспышка, красные черты
  leshy: { core: '#f4ffd8', acc: '#7ad86a' },      // удар по Лешему: светлая, зелёные черты
  fin: { core: '#fff4c8', acc: '#ffc04a' },        // добивающий / под аурой: золото благодати
  block: { core: '#e6f6ff', acc: '#9fd4ff' },      // удар в щит: холодный металлический блик
};
const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lin = (h) => new THREE.Color(h);

const VERT = /* glsl */`
attribute vec4 aC; attribute float aCell;
varying vec2 vUv; varying vec4 vC; varying float vCell;
void main(){ vUv = uv; vC = aC; vCell = aCell; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`;
const FRAG = /* glsl */`
uniform sampler2D tA; uniform vec3 uA;
varying vec2 vUv; varying vec4 vC; varying float vCell;
void main(){
  float i = mod(floor(vCell + .5), uA.z); float cl = mod(i, uA.x); float rw = floor(i / uA.x);
  vec2 q = clamp(vUv, .01, .99);
  vec2 uv = vec2((cl + q.x) / uA.x, 1. - (rw + 1. - q.y) / uA.y);
  float al = texture2D(tA, uv).a * vC.a;
  // полупрозрачное — зерном, без размытия (как наклейки elementfx)
  float th = .3 + .45 * fract(sin(dot(floor(gl_FragCoord.xy * .5), vec2(12.9898, 78.233))) * 43758.5453);
  if (al < th) discard;
  gl_FragColor = vec4(vC.rgb, .5);
}`;

// Пачка четырёхугольников с клетками атласа: одна отрисовка на атлас
class QuadBatch {
  constructor(A, max, order) {
    this.A = A; this.max = max; this.n = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 12); this.uv = new Float32Array(max * 8); this.col = new Float32Array(max * 16); this.cell = new Float32Array(max * 4);
    const idx = []; for (let i = 0; i < max; i++) { const o = i * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aC', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCell', new THREE.BufferAttribute(this.cell, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({ uniforms: { tA: { value: A.tex }, uA: { value: new THREE.Vector3(A.cols, A.rows, A.n) } }, vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthWrite: false, transparent: false });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = order;
    this.mesh.userData.pfSkip = true; this.mesh.castShadow = false; this.mesh.receiveShadow = false; this.mesh.visible = false;
  }
  begin() { this.n = 0; }
  // углы: a — начало/низ, b — конец/низ, c — конец/верх, d — начало/верх; u0..u1 — участок клетки вдоль штриха
  quad(a, b, c, d, cell, color, al = 1, u0 = 0, u1 = 1) {
    if (this.n >= this.max) return; const i = this.n++;
    [a, b, c, d].forEach((p, k) => { this.pos.set([p.x, p.y, p.z], i * 12 + k * 3); });
    this.uv.set([u0, 0, u1, 0, u1, 1, u0, 1], i * 8);
    for (let k = 0; k < 4; k++) { this.col.set([color.r, color.g, color.b, al], i * 16 + k * 4); this.cell[i * 4 + k] = cell; }
  }
  end() {
    const g = this.mesh.geometry;
    for (const k of ['position', 'uv', 'aC', 'aCell']) g.attributes[k].needsUpdate = true;
    g.setDrawRange(0, this.n * 6); this.mesh.visible = this.n > 0;
  }
}

const _v = new THREE.Vector3(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
// линия к камере: от A к B, толщина w0 → w1 (м)
function strip(B, A, P, w0, w1, cam, cell, color, al, u0 = 0, u1 = 1) {
  _v.subVectors(P, A); _s.subVectors(cam.position, A).cross(_v); if (_s.lengthSq() < 1e-10) return; _s.normalize();
  _a.copy(A).addScaledVector(_s, -w0 / 2); _d.copy(A).addScaledVector(_s, w0 / 2);
  _b.copy(P).addScaledVector(_s, -w1 / 2); _c.copy(P).addScaledVector(_s, w1 / 2);
  B.quad(_a, _b, _c, _d, cell, color, al, u0, u1);
}
// ломаная к камере, клетка тянется по всей длине (штрих ложится по дуге)
function polyStrip(B, pts, w, cam, cell, color, al) {
  let L = 0; const acc = [0]; for (let i = 1; i < pts.length; i++) { L += pts[i].distanceTo(pts[i - 1]); acc.push(L); }
  if (L < 1e-4) return;
  for (let i = 1; i < pts.length; i++) strip(B, pts[i - 1], pts[i], w, w, cam, cell, color, al, acc[i - 1] / L, acc[i] / L);
}
// квадрат к камере вокруг P (вспышка), поворот rot
function card(B, P, R, cam, rot, cell, color, al) {
  const r = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), u = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
  const c = Math.cos(rot), s = Math.sin(rot); const X = r.clone().multiplyScalar(c).addScaledVector(u, s).multiplyScalar(R), Y = u.clone().multiplyScalar(c).addScaledVector(r, -s).multiplyScalar(R);
  B.quad(P.clone().sub(X).sub(Y), P.clone().add(X).sub(Y), P.clone().add(X).add(Y), P.clone().sub(X).add(Y), cell, color, al);
}

// ---------------------------------------------------------------- образцы штрихов
const len2 = (st) => { const a = st.p[0], b = st.p[st.p.length - 1]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
// процедурная замена, если класса нет: чуть изогнутые штрихи с нажимом
function procLines(n = 12) {
  return Array.from({ length: n }, (_, i) => [{ w: 0.012, b: { t: 'pen' }, p: Array.from({ length: 12 }, (_, k) => { const t = k / 11; return [0.1 + 0.8 * t, 0.5 + 0.06 * Math.sin(t * 3 + i) * (H(i) - 0.5), Math.sin(t * Math.PI) * 0.8 + 0.2]; }) }]);
}
function handlibSamples(d, layer) {
  return (d?.layers?.[layer]?.vars ?? []).map((v) => v.map((st) => { const p = []; for (let i = 0; i < st.pts.length; i += 2) p.push([st.pts[i], st.pts[i + 1], st.pr?.[i / 2] ?? 0.6]); return { w: st.w, p, b: st.b ?? null }; }).filter((st) => st.p.length > 1)).filter((s) => s.length);
}

export class MotionFX {
  constructor(fight, scene) {
    this.f = fight; const style = fight.ctx.style; const el = style.handEl ?? {};
    // тонкие длинные штрихи: «наброски окружения» и «линии ауры» Michael (длинные, с нажимом и сужением)
    const longs = [...(el.env?.samples ?? []), ...(el.aura?.samples ?? [])].map((s) => s.filter((st) => st.p.length > 3 && len2(st) > 0.22)).filter((s) => s.length);
    this.thin = strokeAtlas(longs.length ? longs : procLines(), { cw: 256, ch: 32, cols: 4, bodyK: 0.3 });
    // толстые мазки (кисть Michael) — тело смаза
    this.fat = style.handBrush ?? strokeAtlas(longs.length ? longs : procLines(), { cw: 192, ch: 64, cols: 8, bodyK: 0.42 });
    // вспышка — нарисованные лучи свечения (класс glow)
    this.glow = style.handGlow ?? null;
    this.B = { fat: new QuadBatch(this.fat, 96, 7), thin: new QuadBatch(this.thin, 160, 8) };
    if (this.glow) this.B.glow = new QuadBatch(this.glow, 24, 9);
    this.scene = scene; for (const k in this.B) scene.add(this.B[k].mesh);
    // блик металла (handlib/metal, слой glint) — для удара в щит
    fetch('handlib/metal.json').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const s = handlibSamples(d, 'glint'); if (!s.length) return;
      this.glint = sampleAtlas(s, { wK: 2.2, minW: 4 }); this.B.glint = new QuadBatch(this.glint, 8, 9); this.scene.add(this.B.glint.mesh);
    }).catch(() => {});
    this.cols = {}; const C2 = (h) => (this.cols[h] ??= lin(h));
    this.c = C2; this.t = 0; this.st = -1;
    this.dodge = null; this.flashes = []; this.hist = []; this.smear = null; this.hold = false;
    if (typeof window !== 'undefined') window.__motionfx = this;
  }

  // ---------------------------------------------------------------- события
  onDodge() {
    const h = this.f.hero; this.dodge = { t: 0, dir: h.dodgeDir.clone(), seed: Math.random() * 100, lines: null, s: -1 };
  }
  // kind: 'leshy' | 'fin' | 'hero' | 'block'
  hit(p, kind = 'leshy', k = 1) {
    if (this.flashes.length > 3) this.flashes.shift();
    this.flashes.push({ p: p.clone(), kind, k, t: 0, seed: Math.random() * 100 });
  }

  // ---------------------------------------------------------------- кадр
  update(dt) {
    const cam = this.f.ctx.camera; if (!this.hold) this.t += dt;
    const st = Math.floor(this.t * STEP); const newStep = st !== this.st; this.st = st;
    this.sampleSword(newStep);
    for (const k in this.B) this.B[k].begin();
    this.drawSmear(cam);
    this.drawDodge(dt, cam);
    this.drawFlashes(dt, cam);
    for (const k in this.B) this.B[k].end();
  }

  // смаз меча: дуга от полклинка до острия за последние ~0,13 с, держится шагами (кадр-смаз, как ложка в видео)
  sampleSword(newStep) {
    const f = this.f, h = f.hero, sw = f.sword;
    if (h.state !== 'attack' || !sw) { this.hist.length = 0; if (newStep) this.smear = null; return; }
    const ud = sw.userData; sw.updateMatrixWorld(true);
    const tip = sw.localToWorld(new THREE.Vector3(0, ud.tip ?? 1.04, 0)), mid = sw.localToWorld(new THREE.Vector3(0, (ud.base ?? 0.12) + 0.42, 0));
    if (!this.hold) this.hist.push({ t: this.t, tip, mid });
    while (this.hist.length && this.t - this.hist[0].t > 0.13) this.hist.shift();
    if (!newStep) return;
    const H0 = this.hist; if (H0.length < 3) { this.smear = null; return; }
    const sp = H0[H0.length - 1].tip.distanceTo(H0[0].tip) / Math.max(1e-3, H0[H0.length - 1].t - H0[0].t);
    // только на быстрой части замаха; клетка мазка — своя на каждый удар серии
    this.smear = sp > 3.2 ? { pts: H0.map((q) => ({ tip: q.tip.clone(), mid: q.mid.clone() })), cell: (h.combo ?? 0) * 3 + (this.st % 2), sp } : null;
  }
  drawSmear(cam) {
    const S = this.smear; if (!S) return; const n = S.pts.length;
    const L = this.c(C.light), I = this.c(C.ink), W = this.c(C.hot);
    // тело смаза: поверхность, заметённая клинком; старый край — хвост мазка (сужение кончика)
    for (let i = 1; i < n; i++) {
      const a = S.pts[i - 1], b = S.pts[i];
      this.B.fat.quad(a.mid, b.mid, b.tip, a.tip, S.cell, L, 0.95, (i - 1) / (n - 1), i / (n - 1));
    }
    // тёмная кромка по острию и светлая жилка внутри: тонкие штрихи вдоль дуги
    polyStrip(this.B.thin, S.pts.map((q) => q.tip), 0.08, cam, S.cell + 1, I, 1);
    polyStrip(this.B.thin, S.pts.map((q) => q.mid.clone().lerp(q.tip, 0.7)), 0.045, cam, S.cell + 5, W, 0.9);
  }

  // уклон: 2 шага смаза (светлые мазки от тела назад), потом 3 шага тонких линий скорости
  drawDodge(dt, cam) {
    const D = this.dodge; if (!D) return; if (!this.hold) D.t += dt;
    if (D.t > 0.42) { this.dodge = null; return; }
    const h = this.f.hero; const s = Math.floor(D.t * STEP);
    // путь проецируем на плоскость кадра: уклон прямо к камере или от неё иначе схлопнулся бы в точку
    const up = new THREE.Vector3(0, 1, 0), fw = new THREE.Vector3(), cr = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    cam.getWorldDirection(fw); const dir = D.dir.clone().addScaledVector(fw, -D.dir.dot(fw)); const radial = dir.length() < 0.4;
    dir.normalize(); const side = new THREE.Vector3().crossVectors(fw, dir).normalize();
    if (s !== D.s) {   // новая раскладка — раз в шаг
      D.s = s; const r = (k) => H(D.seed + s * 7.31 + k * 1.913);
      D.lines = [];
      if (s < 2) {
        for (let i = 0; i < 4; i++) D.lines.push({ fat: true, y: 0.3 + 0.95 * r(i), lat: (r(i + 9) - 0.5) * 0.4, back: 0.05, len: (1.3 + 0.6 * r(i + 3)) * (1 - s * 0.35), w: 0.12 + 0.08 * r(i + 5), cell: Math.floor(r(i + 7) * 64), col: C.light });
        for (let i = 0; i < 2; i++) D.lines.push({ y: 0.4 + 0.8 * r(i + 20), lat: (r(i + 21) - 0.5) * 0.5, back: 0.1, len: 1.4 * (1 - s * 0.3), w: 0.1, cell: Math.floor(r(i + 22) * 64), col: C.ink });
      } else {
        for (let i = 0; i < 5; i++) {
          const sd = r(i + 30) < 0.5 ? -1 : 1;
          D.lines.push({ y: 0.08 + 1.45 * r(i + 31), lat: sd * (0.42 + 0.2 * r(i + 32)), back: 0.3 + 0.3 * r(i + 33), len: (0.7 + 0.8 * r(i + 34)) * (1.6 - s * 0.25), w: 0.15 + 0.07 * r(i + 35), cell: Math.floor(r(i + 36) * 64), col: i % 3 === 1 ? C.ink : C.air });
        }
      }
    }
    for (const l of D.lines) {
      // начало у тела (тело перекрывает его по глубине — аура у края остаётся), конец — назад по пути
      let A, Bp;
      if (radial) {   // к камере / от камеры: линии расходятся от силуэта по кругу (как «наезд»)
        const an = l.y * 4.1 + l.lat * 7.3; const d = cr.clone().multiplyScalar(Math.cos(an)).addScaledVector(cu, Math.sin(an) * 1.4);
        A = h.pos.clone().addScaledVector(up, 0.8).addScaledVector(d, 0.3 + Math.abs(l.lat) * 0.5); Bp = A.clone().addScaledVector(d, l.len * 0.5);
      } else {
        A = h.pos.clone().addScaledVector(up, l.y).addScaledVector(side, l.lat).addScaledVector(dir, -l.back);
        Bp = A.clone().addScaledVector(dir, -l.len);
      }
      if (l.fat) strip(this.B.fat, A, Bp, l.w, l.w * 0.35, cam, l.cell, this.c(l.col), 0.95, 1, 0);
      else strip(this.B.thin, A, Bp, l.w, l.w * 0.6, cam, l.cell, this.c(l.col), 1, 1, 0);
    }
  }

  // вспышка удара: шаг 0 — крупные нарисованные лучи (тёмный подклад + светлое ядро) и черты удара от центра,
  // шаг 1 — меньше и другой образец, черты улетают, шаг 2 — только 3 короткие черты. Всего 0,25 с.
  drawFlashes(dt, cam) {
    const toCam = new THREE.Vector3();
    this.flashes = this.flashes.filter((F) => { if (!this.hold) F.t += dt; return F.t < 0.25; });
    for (const F of this.flashes) {
      const s = Math.floor(F.t * STEP); const P = C[F.kind] ?? C.leshy; const R = { leshy: 0.6, fin: 0.85, hero: 0.6, block: 0.4 }[F.kind] * F.k;
      toCam.subVectors(cam.position, F.p).normalize(); const p = F.p.clone().addScaledVector(toCam, 0.45);
      const r = (k) => H(F.seed + s * 5.17 + k * 2.31); const rot = r(1) * 6.28;
      const G = F.kind === 'block' && this.B.glint ? this.B.glint : this.B.glow;
      if (G && s < 2) {
        const cell = Math.floor(r(2) * G.A.n); const k = s ? 0.7 : 1;
        card(G, p, R * k * 1.12, cam, rot + 0.04, cell, this.c(C.ink), 1);
        card(G, p, R * k, cam, rot, cell, this.c(P.core), 1);
      }
      // черты удара: тонкие штрихи по радиусу, через одну — цвет удара
      const n = s === 0 ? 6 : s === 1 ? 5 : 3;
      const rr = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), uu = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      for (let i = 0; i < n; i++) {
        const a = rot + (i + 0.35 * r(i + 10)) / n * Math.PI * 2; const d = rr.clone().multiplyScalar(Math.cos(a)).addScaledVector(uu, Math.sin(a));
        const r0 = R * (0.35 + 0.35 * s), r1 = r0 + R * (0.55 + 0.3 * r(i + 20)) * (s === 2 ? 0.5 : 1);
        strip(this.B.thin, p.clone().addScaledVector(d, r0), p.clone().addScaledVector(d, r1), R * 0.08, R * 0.035, cam, Math.floor(r(i + 30) * 64), this.c(i % 2 ? P.acc : (s ? P.core : C.ink)), 1);
      }
    }
  }
  dispose() { for (const k in this.B) { const m = this.B[k].mesh; m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); } if (window.__motionfx === this) window.__motionfx = null; }
}
