// Линии и знаки эмоций для рисованного стиля (дополнение к paintfx.js). Зависимость: three.
//
// FaceMarks — линии эмоций, нарисованные прямо по поверхности модели: рисунок проецируется с лица
//   в шейдере рисованного материала (как анимированная текстура), лежит на шлеме/черепе, освещается
//   вместе с моделью и не размывается Кувахарой. Свой дизайн на персонажа: у Богатыря светлые щели глаз
//   в тени шлема и красные штрихи, у Лешего зелёный свет в глазницах (с лёгким зелёным светом вокруг).
//   Рисунок меняется 6–7 раз в секунду (3 варианта от руки).
// EmotionMarks — знаки у самой головы (гнев, «!», «?» …): часть сцены, проходят бумагу, зерно и свечение,
//   стоят шагами 6 раз в секунду, размер в метрах от головы.
//
//   const face = new FaceMarks(style, heroModel, { design: 'bogatyr', kind: 'stern' });  // после расстановки
//   const marks = new EmotionMarks(style); scene.add(marks.group);
//   marks.show(heroModel, 'anger', { duration: 2.5, side: 1 });
//   // каждый кадр: face.update(dt); marks.update(dt, camera);
import * as THREE from 'three';

// ---------------------------------------------------------------- кисть на canvas
function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Мазок кистью по ломаной: ширина с нажимом (сужение к концам), рваный край, дрожь.
function brush(ctx, pts, w, color, r, o = {}) {
  const jit = o.jitter ?? 0.12, t0 = o.taperIn ?? 0.35, t1 = o.taperOut ?? 0.6;
  const P = pts.map(([x, y]) => [x + (r() - 0.5) * w * jit * 2, y + (r() - 0.5) * w * jit * 2]);
  // сгладить: по 6 точек на отрезок (Catmull-Rom)
  const S = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t;
      S.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  S.push(P[P.length - 1]);
  const n = S.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (n - 1);
    const prof = Math.min(1, t / t0, (1 - t) / t1) ** 0.7;
    const ww = w * 0.5 * Math.max(0.04, prof) * (1 + (r() - 0.5) * 0.25);
    L.push([S[i][0] - dy * ww, S[i][1] + dx * ww]); R.push([S[i][0] + dy * ww, S[i][1] - dx * ww]);
  }
  ctx.beginPath(); ctx.moveTo(...L[0]);
  for (const p of L) ctx.lineTo(...p);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(...R[i]);
  ctx.closePath();
  if (o.outline) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.outline; ctx.lineWidth = o.outlineW ?? w * 0.35; ctx.stroke(); }
  ctx.fillStyle = color; ctx.fill();
}
function dot(ctx, x, y, rad, color, r) {
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 2; const rr = rad * (0.85 + r() * 0.3); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); }
  ctx.fillStyle = color; ctx.fill();
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- линии эмоций на лице
// Холст 256×128 = лицо шириной width (м). Глаза в точках (128 ± eyeSep, eyeY).
const P = (o) => o;
export const FACE_DESIGNS = {
  bogatyr: {
    name: 'Богатырь', glowK: 0.35, farBoost: 4, light: null,
    kinds: {
      stern: { name: 'Суров', draw: (c, r, o) => { socket(c, r, o, 0.18, 0.5); slits(c, r, o, -0.18, 4.5); ticks(c, r, o, 2); mouth(c, r, o, -0.2, 3.5); } },
      angry: { name: 'Гнев', draw: (c, r, o) => { socket(c, r, o, 0.34, 0.65); slits(c, r, o, -0.36, 3.2); ticks(c, r, o, 3); crease(c, r, o); mouth(c, r, o, -1, 5); } },
      calm: { name: 'Спокоен', draw: (c, r, o) => { socket(c, r, o, 0.05, 0.4); slits(c, r, o, 0.0, 6); mouth(c, r, o, 0.15, 2.6); } },
      hurt: { name: 'Ранен', draw: (c, r, o) => { socket(c, r, o, -0.2, 0.5); slits(c, r, o, 0.28, 4); ticks(c, r, o, 1); scratch(c, r, o); mouth(c, r, o, -0.4, 3, 1.6); } },
    },
  },
  leshy: {
    name: 'Леший', glowK: 1.6, farBoost: 0.6, light: { color: '#8dffa8', intensity: 0.22, range: 0.9 },
    kinds: {
      glow: { name: 'Зелёный свет', draw: (c, r, o) => { greenEyes(c, r, o, 1, '#7dff9a', '#e8ffe0', 3); } },
      rage: { name: 'Ярость', draw: (c, r, o) => { greenEyes(c, r, o, 1.25, '#b8ff50', '#ffffe0', 7); } },
      dim: { name: 'Тлеет', draw: (c, r, o) => { greenEyes(c, r, o, 0.75, '#4ad070', '#b8ffc8', 0); } },
    },
  },
};
// тёмная масса над глазами (тень шлема/бровей), как тёмная повязка на кадрах из фото
function socket(c, r, o, tilt, alpha) {
  c.globalAlpha = alpha;
  for (const s of [-1, 1]) {
    const x = 128 + s * o.eyeSep, y = o.eyeY - 6;
    brush(c, [[x - s * 26, y - 6 + tilt * 22], [x, y - 10], [x + s * 26, y - 6 - tilt * 14]], 20, o.ink, r, { taperIn: 0.25, taperOut: 0.4, jitter: 0.15 });
  }
  c.globalAlpha = 1;
}
// глаза: узкие светлые щели (без зрачков), наклон даёт настроение
function slits(c, r, o, tilt, h) {
  for (const s of [-1, 1]) {
    // по разметке глаз лежит у самой кромки шлема: прорезь чуть ниже центра, чтобы попасть на кожу, а не под козырёк
    const x = 128 + s * o.eyeSep, y = o.eyeY + (o.eyeW ? 6 : 2);
    const L = o.eyeW ? Math.max(o.eyeW * 1.4, 13) : 15; h = o.eyeW ? h * 1.5 : h;
    brush(c, [[x - s * L * 0.95, y + tilt * 10], [x, y - h * 0.4], [x + s * L, y - tilt * 8]], h, o.eye, r, { taperIn: 0.45, taperOut: 0.45, jitter: 0.06 });
  }
}
function ticks(c, r, o, n) {   // красные штрихи у внешнего края глаз
  for (const s of [-1, 1]) for (let k = 0; k < n; k++) {
    const x = 128 + s * (o.eyeSep + 20 + k * 5), y = o.eyeY - 4 + k * 7;
    brush(c, [[x, y], [x + s * 7, y - 6]], 2.6, o.accent, r, { jitter: 0.2 });
  }
}
// рот: короткий рваный мазок тушью по размеченному месту; изгиб задаёт настроение
function mouth(c, r, o, bend, wid, wave = 0) {
  const m = o.mouth; if (!m) return;
  const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6 - 0.5; pts.push([m.x + t * 2 * m.w * 0.9, m.y - bend * (1 - 4 * t * t) * 6 + Math.sin(t * 18) * wave]); }
  brush(c, pts, wid, o.ink, r, { taperIn: 0.35, taperOut: 0.35, jitter: 0.12 });
}
function crease(c, r, o) {
  for (let k = 0; k < 2; k++) brush(c, [[124 + k * 8, o.eyeY - 22], [125 + k * 6, o.eyeY - 8]], 2.6, o.ink, r);
}
function scratch(c, r, o) {
  brush(c, [[128 + o.eyeSep + 6, o.eyeY + 12], [128 + o.eyeSep - 10, o.eyeY + 34]], 3, o.accent, r);
}
// зелёный свет в глазницах: мягкий ореол, яркое ядро и короткие мазки-лучики
function greenEyes(c, r, o, k, col, core, rays) {
  for (const s of [-1, 1]) {
    const x = 128 + s * o.eyeSep, y = o.eyeY;
    const g = c.createRadialGradient(x, y, 1, x, y, 22 * k);
    g.addColorStop(0, core); g.addColorStop(0.3, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - 26 * k, y - 26 * k, 52 * k, 52 * k);
    brush(c, [[x - 8 * k, y + 1], [x, y - 3 * k], [x + 8 * k, y]], 5 * k, core, r, { taperIn: 0.4, taperOut: 0.4 });
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + r() * 0.6, r0 = 9 * k, r1 = r0 + (6 + r() * 8) * k;
      brush(c, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8]], 2.2, col, r, { jitter: 0.25 });
    }
  }
}

export class FaceMarks {
  // model: корень персонажа (со скелетом и рисованными материалами из PaintStyle).
  // opts: design ('bogatyr' | 'leshy' | свой объект), kind, up/side (м) — центр лица от кости головы,
  // width (м), depth (м, глубина проекции), eyeSep/eyeY (px холста 256×128), цвета ink/eye/accent, fps.
  constructor(style, model, opts = {}) {
    this.style = style;
    const design = typeof opts.design === 'object' ? opts.design : (FACE_DESIGNS[opts.design ?? 'bogatyr'] ?? FACE_DESIGNS.bogatyr);
    this.design = design;
    this.o = {
      kind: Object.keys(design.kinds)[0], up: 0.05, side: 0, width: 0.26, depth: 0.09, eyeSep: 32, eyeY: 64, fps: 6, variants: 3,
      ink: '#160c08', eye: '#f2ecd2', accent: '#b8382a', boneName: /head$/i, glowK: design.glowK, ...opts,
    };
    this.bone = null;
    model.traverse((b) => { if (!this.bone && b.isBone && this.o.boneName.test(b.name)) this.bone = b; });
    this.mats = [];
    model.traverse((m) => { if (m.isMesh && !m.userData.pfSkip) for (const mm of [].concat(m.material)) if (mm.userData?.pf?.pfFaceMat) this.mats.push(mm.userData.pf); });
    this.anchor = new THREE.Object3D();
    this.tex = {}; this.t = 0; this.step = -1; this.variant = 0; this.on = true;
    this._inv = new THREE.Matrix4(); this._n = new THREE.Vector3(); this._wp = new THREE.Vector3();
    if (this.bone && this.o.eyes) {
      // точная привязка: глазницы заданы в координатах кости головы (замер по геометрии модели),
      // кадр лица (вперёд f, вверх u) тоже в осях кости, поэтому рисунок не съезжает при любой позе и масштабе
      const bone = this.bone; model.updateMatrixWorld(true);
      const L = new THREE.Vector3(...this.o.eyes[0]), R = new THREE.Vector3(...this.o.eyes[1]);
      const f = new THREE.Vector3(...this.o.frame.f).normalize();
      const x = R.clone().sub(L); x.addScaledVector(f, -x.dot(f)).normalize();
      const y = new THREE.Vector3().crossVectors(f, x).normalize();
      const M = new THREE.Matrix4().makeBasis(x, y, f).setPosition(L.clone().add(R).multiplyScalar(0.5));
      bone.add(this.anchor); M.decompose(this.anchor.position, this.anchor.quaternion, new THREE.Vector3());
      this.anchor.updateMatrixWorld(true);
      const ws = new THREE.Vector3(); bone.getWorldScale(ws);
      const dist = L.distanceTo(R) * ws.x;                        // расстояние между глазами, м
      this.o.width = dist * (this.o.spanK ?? 3.6);
      this.o.depth = dist * (this.o.depthK ?? 0.5);
      this.o.eyeSep = 128 / (this.o.spanK ?? 3.6);                 // px холста от центра до глаза
      // холст квадратный: глаза по центру, ниже помещается рот (если размечен)
      this.o.texH = 256; this.o.eyeY = 128; this.o.mouth = null;
      const pxm = 256 / this.o.width;                               // px холста на метр
      if (this.o.eyeHalfW) this.o.eyeW = Math.max(8, this.o.eyeHalfW * ws.x * pxm);
      if (this.o.mouthB) {
        const mw = bone.localToWorld(new THREE.Vector3(...this.o.mouthB)); const ml = this.anchor.worldToLocal(mw.clone());
        const sc = this.anchor.getWorldScale(new THREE.Vector3()).x; ml.multiplyScalar(sc);
        const my = 128 - ml.y * pxm, mx = 128 + ml.x * pxm;
        if (my > 140 && my < 250) this.o.mouth = { x: mx, y: my, w: Math.max(10, (this.o.mouthHalfW ?? 0.02) * ws.x * pxm) };
      }
    } else if (this.bone) {
      model.updateMatrixWorld(true);
      const Pb = new THREE.Vector3().setFromMatrixPosition(this.bone.matrixWorld);
      const q = new THREE.Quaternion(); model.getWorldQuaternion(q);
      const F = new THREE.Vector3(0, 0, 1).applyQuaternion(q), U = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      // лицо ищем лучом спереди: центр проекции ложится на поверхность (шлем, борода, череп)
      const C = Pb.clone().addScaledVector(U, this.o.up).addScaledVector(S, this.o.side);
      const ray = new THREE.Raycaster(C.clone().addScaledVector(F, 1.5), F.clone().negate(), 0, 3);
      const targets = []; model.traverse((m) => { if (m.isMesh && !m.userData.pfSkip && !m.userData.pfOutline) targets.push(m); });
      const hit = ray.intersectObjects(targets, false)[0];
      this.anchor.position.copy(hit ? hit.point : C.addScaledVector(F, 0.12));
      this.anchor.quaternion.copy(q);
      this.anchor.updateMatrixWorld(true);
      this.bone.attach(this.anchor);
    }
    if (this.bone) {
      if (design.light) {
        this.light = new THREE.PointLight(design.light.color, design.light.intensity, design.light.range, 2);
        this.light.position.set(0, 0, 0.06 / Math.max(1e-6, this.anchor.getWorldScale(new THREE.Vector3()).x));
        this.anchor.add(this.light);
      }
    }
    for (const u of this.mats) { u.pfFaceSize.value.set(this.o.width, this.o.width * (this.o.texH ?? 128) / 256); u.pfFaceK.value.set(1, this.o.glowK, this.o.depth, 0.15); }
    this.setKind(this.o.kind);
  }
  _variants(kind) {
    if (this.tex[kind]) return this.tex[kind];
    const K = this.design.kinds[kind] ?? Object.values(this.design.kinds)[0];
    const arr = [];
    for (let v = 0; v < this.o.variants; v++) { const r = rng(1000 + v * 37 + kind.length * 11); arr.push(canvasTex(256, this.o.texH ?? 128, (c) => K.draw(c, r, this.o))); }
    return (this.tex[kind] = arr);
  }
  setKind(kind) { this.kind = kind; const t = this._variants(kind)[0]; for (const u of this.mats) u.pfFaceTex.value = t; }
  set visible(v) { this.on = v; for (const u of this.mats) u.pfFaceK.value.x = v ? 1 : 0; if (this.light) this.light.visible = v; }
  update(dt, camera) {
    this.t += dt;
    if (!this.bone) return;
    // издали рисунок мельче пикселя: подсвечиваем сильнее (farBoost), чтобы глаза читались и на общем плане
    if (camera && this.on) {
      const d = camera.position.distanceTo(this._wp.setFromMatrixPosition(this.anchor.matrixWorld));
      const b = THREE.MathUtils.smoothstep(d, 2.5, 9) * (this.design.farBoost ?? 0);
      for (const u of this.mats) u.pfFaceK.value.y = this.o.glowK * (1 + b);
    }
    this.anchor.updateWorldMatrix(true, false);
    this._inv.copy(this.anchor.matrixWorld).invert();
    // масштаб кости убираем: проекция в метрах
    const sc = new THREE.Vector3(); this.anchor.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
    const m = new THREE.Matrix4().compose(new THREE.Vector3().setFromMatrixPosition(this.anchor.matrixWorld), new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(this.anchor.matrixWorld)), new THREE.Vector3(1, 1, 1));
    this._inv.copy(m).invert();
    this._n.set(0, 0, 1).transformDirection(this.anchor.matrixWorld);
    for (const u of this.mats) { u.pfFaceMat.value.copy(this._inv); u.pfFaceN.value.copy(this._n); }
    const st = Math.floor(this.t * this.o.fps);
    if (st !== this.step) {
      this.step = st; const a = this._variants(this.kind);
      this.variant = (this.variant + 1 + Math.floor(Math.random() * (a.length - 1))) % a.length;
      for (const u of this.mats) u.pfFaceTex.value = a[this.variant];
      if (this.light) this.light.intensity = this.design.light.intensity * (0.85 + Math.random() * 0.3);
    }
  }
}

// ---------------------------------------------------------------- знаки эмоций над головой
// Рисунок 256×256, центр знака в (128,128).
export const MARK_KINDS = {
  anger: { name: 'Гнев', draw: (c, r) => {   // «венка»: четыре изогнутые скобки
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4; const ca = Math.cos(a), sa = Math.sin(a);
      const p = (u, v) => [128 + ca * u - sa * v, 128 + sa * u + ca * v];
      brush(c, [p(50, -56), p(36, -14), p(92, 0), p(36, 14), p(50, 56)], 30, '#c8382a', r, { outline: '#1a0c08', outlineW: 8, taperIn: 0.2, taperOut: 0.2 });
    }
  } },
  exclaim: { name: '«!»', draw: (c, r) => {
    brush(c, [[130, 30], [126, 100], [124, 160]], 40, '#c8382a', r, { outline: '#1a0c08', outlineW: 7, taperIn: 0.1, taperOut: 0.95 });
    dot(c, 122, 205, 20, '#c8382a', r); c.lineWidth = 6; c.strokeStyle = '#1a0c08'; c.stroke();
  } },
  question: { name: '«?»', draw: (c, r) => {
    brush(c, [[80, 80], [100, 40], [150, 34], [176, 70], [150, 108], [128, 128], [126, 160]], 30, '#c8382a', r, { outline: '#1a0c08', outlineW: 6, taperIn: 0.15, taperOut: 0.5 });
    dot(c, 124, 204, 17, '#c8382a', r); c.lineWidth = 6; c.strokeStyle = '#1a0c08'; c.stroke();
  } },
  interrobang: { name: '«?!»', draw: (c, r) => {
    brush(c, [[40, 90], [56, 52], [96, 48], [112, 80], [92, 108], [80, 124], [80, 150]], 22, '#c8382a', r, { outline: '#1a0c08', outlineW: 5 });
    dot(c, 78, 196, 13, '#c8382a', r);
    brush(c, [[176, 30], [172, 100], [168, 158]], 30, '#c8382a', r, { outline: '#1a0c08', outlineW: 6, taperIn: 0.1, taperOut: 0.95 });
    dot(c, 166, 200, 15, '#c8382a', r);
  } },
  shock: { name: 'Шок (лучи)', size: 2.2, draw: (c, r) => {   // короткие резкие штрихи вокруг головы
    const n = 14;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.2; if (Math.sin(a) < -0.55) continue;
      const r0 = 78 + r() * 10, r1 = r0 + 26 + r() * 22;
      brush(c, [[128 + Math.cos(a) * r0, 128 - Math.sin(a) * r0], [128 + Math.cos(a) * r1, 128 - Math.sin(a) * r1]], 9, '#1a0a08', r, { taperIn: 0.05, taperOut: 0.9 });
    }
  } },
  sweat: { name: 'Пот', draw: (c, r) => {
    brush(c, [[128, 40], [100, 120], [110, 170], [146, 170], [156, 120], [128, 40]], 30, '#9fd8ff', r, { outline: '#102030', outlineW: 6, taperIn: 0.1, taperOut: 0.1 });
    brush(c, [[118, 120], [116, 150]], 9, '#ffffff', r);
  } },
  sparkle: { name: 'Искры', draw: (c, r) => {
    for (const [x, y, s] of [[90, 100, 1], [170, 70, 0.7], [160, 170, 0.55]]) {
      for (const a of [0, Math.PI / 2]) {
        const dx = Math.cos(a) * 46 * s, dy = Math.sin(a) * 46 * s;
        brush(c, [[x - dx, y - dy], [x, y], [x + dx, y + dy]], 16 * s, '#ffe070', r, { outline: '#3a2006', outlineW: 4, taperIn: 0.5, taperOut: 0.5 });
      }
    }
  } },
  swirl: { name: 'Вихрь (растерян)', draw: (c, r) => {
    const pts = []; for (let i = 0; i <= 26; i++) { const a = i * 0.48, rr = 8 + i * 3.6; pts.push([128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr * 0.75]); }
    brush(c, pts, 12, '#2a1a40', r, { taperIn: 0.05, taperOut: 0.3 });
  } },
  spark: { name: 'Молния (ярость)', draw: (c, r) => {
    brush(c, [[150, 20], [100, 110], [150, 118], [96, 230]], 26, '#c8382a', r, { outline: '#1a0c08', outlineW: 6, taperIn: 0.1, taperOut: 0.7, jitter: 0.05 });
  } },
  sleep: { name: 'Сон «z»', draw: (c, r) => {
    for (const [x, y, s] of [[90, 170, 1], [150, 110, 0.75], [195, 60, 0.55]]) {
      brush(c, [[x - 26 * s, y - 24 * s], [x + 26 * s, y - 24 * s], [x - 26 * s, y + 24 * s], [x + 26 * s, y + 24 * s]], 13 * s, '#e8e0ff', r, { outline: '#20183a', outlineW: 4, jitter: 0.08 });
    }
  } },
};

export class EmotionMarks {
  constructor(style, opts = {}) {
    this.style = style;
    this.o = { fps: 6, size: 0.3, variants: 3, ...opts };   // size: метры
    this.group = new THREE.Group();
    this.scene = this.group;   // совместимость с v2
    this.tex = {};
    this.active = [];
    this.t = 0;
  }
  _variants(kind) {
    if (this.tex[kind]) return this.tex[kind];
    const K = MARK_KINDS[kind];
    const arr = [];
    for (let v = 0; v < this.o.variants; v++) { const r = rng(500 + v * 91 + kind.length * 7); arr.push(canvasTex(256, 256, (c) => K.draw(c, r))); }
    return (this.tex[kind] = arr);
  }
  // model: корень персонажа; opts: duration (с), side (-1 слева, 1 справа, 0 над макушкой), up (м над костью головы), size (м)
  show(model, kind, opts = {}) {
    if (!MARK_KINDS[kind]) return null;
    let bone = null; model.traverse((b) => { if (!bone && b.isBone && /head$/i.test(b.name)) bone = b; });
    const K = MARK_KINDS[kind];
    // знак — часть сцены: глубина с головой, бумага/зерно/свечение общие; от Кувахары защищён (альфа 0.5 в кадре)
    const mat = new THREE.SpriteMaterial({ map: this._variants(kind)[0], alphaTest: 0.5, transparent: false, toneMapped: false });
    mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n\tgl_FragColor.a = .5;'); };
    mat.customProgramCacheKey = () => 'pfMark';
    const sp = new THREE.Sprite(mat); sp.userData.pfSkip = true; sp.userData.pfMark = true;
    this.group.add(sp);
    const shock = kind === 'shock';
    const m = { kind, bone, model, sp, mat, t: 0, dur: opts.duration ?? 2.4, side: opts.side ?? (shock ? 0 : 1),
      up: opts.up ?? (shock ? 0.06 : 0.2), size: (opts.size ?? this.o.size) * (K.size ?? 1), step: -1, v: 0 };
    this.active.push(m);
    return m;
  }
  clear() { for (const m of this.active) { this.group.remove(m.sp); m.mat.dispose(); } this.active = []; }
  set visible(v) { this.group.visible = v; }
  update(dt, camera) {
    this.t += dt;
    const st = Math.floor(this.t * this.o.fps);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    const P = new THREE.Vector3();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i]; m.t += dt;
      if (m.t > m.dur) { this.group.remove(m.sp); m.mat.dispose(); this.active.splice(i, 1); continue; }
      if (st === m.step) continue;              // знак живёт шагами: позиция, размер и рисунок меняются 6 раз в секунду
      m.step = st;
      const arr = this._variants(m.kind); m.v = (m.v + 1) % arr.length; m.mat.map = arr[m.v];
      if (m.bone) P.setFromMatrixPosition(m.bone.matrixWorld); else m.model.getWorldPosition(P).add(new THREE.Vector3(0, 1.7, 0));
      const k = m.t;
      const pop = k < 0.17 ? 0.5 + k / 0.17 * 0.75 : (k < 0.34 ? 1.25 - (k - 0.17) / 0.17 * 0.25 : 1);
      const out = m.dur - k < 0.34 ? Math.max(0.2, (m.dur - k) / 0.34) : 1;
      const j = () => (Math.random() - 0.5) * 0.012;
      m.sp.position.copy(P).addScaledVector(right, m.side * 0.2 + j()).add(new THREE.Vector3(0, m.up + Math.sin(k * 6) * 0.012 + j(), 0));
      m.sp.scale.setScalar(m.size * pop * out);
      m.mat.rotation = (Math.random() - 0.5) * 0.14 - m.side * 0.12;
    }
  }
}
