// Линии и знаки эмоций для рисованного стиля (дополнение к paintfx.js). Зависимость: three.
//
// FaceMarks — рисованные линии на лице, привязанные к кости головы: брови, блики в глазах,
//   румянец штрихами, складки, светящиеся глаза с лучиками. Кипят с низким фпс (3 варианта рисунка).
// EmotionMarks — знаки над головой (гнев, «!», «?», «?!», шок, пот, искры, вихрь, сон), рисуются
//   поверх готового кадра (post.overlay), обновляются шагами 6–8 раз в секунду, как от руки.
//
//   const face = new FaceMarks(style, hero, { kind: 'angry', fwd: 0.11, up: 0.07, width: 0.22 });
//   const marks = new EmotionMarks(style);  post.overlay = marks.scene;
//   marks.show(hero, 'anger', { duration: 2.5, side: 1 });
//   // каждый кадр: face.update(dt); marks.update(dt, camera);
import * as THREE from 'three';

// Слой камеры для линий эмоций: PaintPost рисует его поверх готового кадра (после Кувахары, иначе тонкие линии съедаются).
export const FACE_LAYER = 2;

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
// Рисунок в координатах 512×256: глаза в точках (256 ± eyeSep, eyeY).
export const FACE_KINDS = {
  calm: { name: 'Спокойно', draw: (c, r, o) => { eyesGlints(c, r, o); brows(c, r, o, 0.05, 16); } },
  angry: { name: 'Гнев', draw: (c, r, o) => { brows(c, r, o, -0.34, 26); eyesGlints(c, r, o); creases(c, r, o); } },
  shy: { name: 'Смущение', draw: (c, r, o) => { brows(c, r, o, 0.22, 15); eyesGlints(c, r, o); blush(c, r, o); } },
  sad: { name: 'Грусть', draw: (c, r, o) => { brows(c, r, o, 0.38, 16); eyesGlints(c, r, o); tear(c, r, o); } },
  glow: { name: 'Светящиеся глаза', glow: true, draw: (c, r, o) => { glowEyes(c, r, o); } },
  glowAngry: { name: 'Глаза + гнев', glow: true, draw: (c, r, o) => { glowEyes(c, r, o); glowBrows(c, r, o); } },
};
function eyesGlints(c, r, o) {
  for (const s of [-1, 1]) {
    const x = 256 + s * o.eyeSep, y = o.eyeY;
    dot(c, x - 6 + r() * 4, y - 4, 12, '#ffffff', r);
    dot(c, x + 10, y + 8, 6, '#ffffff', r);
    brush(c, [[x - 34, y - 18], [x, y - 30], [x + 34, y - 20]], 15, o.ink, r, { jitter: 0.2 });   // ресницы верхнего века
    for (let k = 0; k < 3; k++) brush(c, [[x + s * (24 + k * 6), y - 20 + k * 6], [x + s * (38 + k * 7), y - 32 + k * 6]], 8, o.ink, r);
  }
}
function brows(c, r, o, tilt, w) {
  for (const s of [-1, 1]) {
    const x = 256 + s * o.eyeSep, y = o.eyeY - 52;
    const inner = [x - s * 34, y + tilt * -60], outer = [x + s * 38, y - tilt * -40];
    brush(c, [inner, [x, y - 6], outer], w, o.ink, r, { taperIn: 0.15, taperOut: 0.5 });
  }
}
function creases(c, r, o) {
  for (let k = 0; k < 2; k++) brush(c, [[248 + k * 16, o.eyeY - 70], [250 + k * 13, o.eyeY - 44]], 8, o.ink, r);
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {   // «венка»-штрихи у виска
    const x = 256 + s * (o.eyeSep + 62), y = o.eyeY - 70 + k * 12;
    brush(c, [[x, y], [x + s * 22, y - 12]], 9, o.accent, r);
  }
}
function blush(c, r, o) {
  for (const s of [-1, 1]) {
    const x = 256 + s * (o.eyeSep + 6), y = o.eyeY + 52;
    c.globalAlpha = 0.35; dot(c, x, y, 34, o.blush, r); c.globalAlpha = 1;
    for (let k = 0; k < 3; k++) brush(c, [[x - 22 + k * 15, y + 16], [x - 10 + k * 15, y - 14]], 10, o.accent, r);
  }
}
function tear(c, r, o) {
  const x = 256 + o.eyeSep + 18, y = o.eyeY + 34;
  brush(c, [[x, y - 14], [x - 5, y + 6], [x, y + 14], [x + 6, y + 4], [x, y - 14]], 7, '#bfe6ff', r, { outline: o.ink, outlineW: 3 });
}
function glowEyes(c, r, o) {
  for (const s of [-1, 1]) {
    const x = 256 + s * o.eyeSep, y = o.eyeY;
    const g = c.createRadialGradient(x, y, 2, x, y, 46); g.addColorStop(0, o.glowCore); g.addColorStop(0.35, o.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - 50, y - 50, 100, 100);
    brush(c, [[x - 22, y + 2], [x, y - 8], [x + 22, y + 1]], 16, o.glowCore, r, { taperIn: 0.4, taperOut: 0.4 });
    // лучики: короткие штрихи вокруг глаза, как линии эмоций в видео
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.5; const r0 = 22 + r() * 6, r1 = r0 + 14 + r() * 16;
      brush(c, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8]], 7, o.glow, r, { jitter: 0.25 });
    }
  }
}
function glowBrows(c, r, o) {
  for (const s of [-1, 1]) {
    const x = 256 + s * o.eyeSep, y = o.eyeY - 30;
    brush(c, [[x - s * 26, y + 12], [x + s * 30, y - 12]], 8, o.glow, r);
  }
}

export class FaceMarks {
  // model: корень персонажа (Object3D со скелетом); opts: fwd/up/side (м) — смещение центра лица от кости головы,
  // width (м), kind, eyeSep/eyeY (в px холста 512×256), цвета ink/accent/blush/glow/glowCore, glowK (яркость для bloom).
  constructor(style, model, opts = {}) {
    this.style = style;
    this.o = {
      kind: 'calm', fwd: 0.11, up: 0.07, side: 0, width: 0.22, eyeSep: 70, eyeY: 120, fps: 7, variants: 3,
      ink: '#140a08', accent: '#c0302a', blush: '#ff7a80', glow: '#ffb040', glowCore: '#fff6d0', glowK: 2.6,
      boneName: /head$/i, ...opts,
    };
    this.bone = null;
    model.traverse((b) => { if (!this.bone && b.isBone && this.o.boneName.test(b.name)) this.bone = b; });
    this.tex = {};
    // без проверки глубины: рисунок лежит поверх лица, как дорисовка; когда голова отвернулась, он гаснет
    this.mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false, alphaTest: 0.04, toneMapped: false, side: THREE.DoubleSide });
    const h = this.o.width / 2;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.o.width, h), this.mat);
    this.mesh.userData.pfSkip = true; this.mesh.renderOrder = 5; this.mesh.frustumCulled = false;
    this.mesh.layers.set(FACE_LAYER);
    this.t = 0; this.step = -1; this.variant = 0;
    this.setKind(this.o.kind);
    if (!this.bone) return;
    model.updateMatrixWorld(true);
    const P = new THREE.Vector3().setFromMatrixPosition(this.bone.matrixWorld);
    const q = new THREE.Quaternion(); model.getWorldQuaternion(q);
    const F = new THREE.Vector3(0, 0, 1).applyQuaternion(q), U = new THREE.Vector3(0, 1, 0), S = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    // лицо ищем лучом спереди: плоскость ложится прямо на поверхность (шлем, борода, череп), чуть впереди неё
    const C = P.clone().addScaledVector(U, this.o.up).addScaledVector(S, this.o.side);
    const ray = new THREE.Raycaster(C.clone().addScaledVector(F, 1.5), F.clone().negate(), 0, 3);
    const targets = []; model.traverse((m) => { if (m.isMesh && !m.userData.pfSkip && !m.userData.pfOutline) targets.push(m); });
    const hit = ray.intersectObjects(targets, false).find((h) => h.distance < 1.5 + 0.05 + this.o.fwd * 3);
    this.mesh.position.copy(hit ? hit.point.addScaledVector(F, this.o.lift ?? 0.025) : C.addScaledVector(F, this.o.fwd));
    this.mesh.quaternion.copy(q);
    this.mesh.updateMatrixWorld(true);
    this.bone.attach(this.mesh);
  }
  _variants(kind) {
    if (this.tex[kind]) return this.tex[kind];
    const K = FACE_KINDS[kind] ?? FACE_KINDS.calm;
    const arr = [];
    for (let v = 0; v < this.o.variants; v++) {
      const r = rng(1000 + v * 37 + kind.length * 11);
      arr.push(canvasTex(512, 256, (c) => K.draw(c, r, this.o)));
    }
    return (this.tex[kind] = arr);
  }
  setKind(kind) {
    this.kind = kind; const K = FACE_KINDS[kind] ?? FACE_KINDS.calm;
    this.mat.blending = K.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.mat.color.setScalar(K.glow ? this.o.glowK : 1);
    this.mat.map = this._variants(kind)[0]; this.mat.needsUpdate = true;
  }
  set visible(v) { this.mesh.visible = v; }
  update(dt, camera) {
    this.t += dt;
    if (camera) {
      const n = new THREE.Vector3(0, 0, 1).transformDirection(this.mesh.matrixWorld);
      const to = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).sub(new THREE.Vector3().setFromMatrixPosition(this.mesh.matrixWorld)).normalize();
      this.mat.opacity = THREE.MathUtils.smoothstep(n.dot(to), 0.15, 0.45);
    }
    const st = Math.floor(this.t * this.o.fps);
    if (st !== this.step) { this.step = st; const a = this._variants(this.kind); this.variant = (this.variant + 1 + Math.floor(Math.random() * (a.length - 1))) % a.length; this.mat.map = a[this.variant]; }
  }
}

// ---------------------------------------------------------------- знаки эмоций над головой
// Рисунок 256×256, центр знака в (128,128).
export const MARK_KINDS = {
  anger: { name: 'Гнев', draw: (c, r) => {   // «венка»: четыре изогнутые скобки
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4; const ca = Math.cos(a), sa = Math.sin(a);
      const p = (u, v) => [128 + ca * u - sa * v, 128 + sa * u + ca * v];
      brush(c, [p(50, -56), p(36, -14), p(92, 0), p(36, 14), p(50, 56)], 30, '#e8302a', r, { outline: '#2a0806', outlineW: 8, taperIn: 0.2, taperOut: 0.2 });
    }
  } },
  exclaim: { name: '«!»', draw: (c, r) => {
    brush(c, [[130, 30], [126, 100], [124, 160]], 40, '#f03a2a', r, { outline: '#200604', outlineW: 7, taperIn: 0.1, taperOut: 0.95 });
    dot(c, 122, 205, 20, '#f03a2a', r); c.lineWidth = 6; c.strokeStyle = '#200604'; c.stroke();
  } },
  question: { name: '«?»', draw: (c, r) => {
    brush(c, [[80, 80], [100, 40], [150, 34], [176, 70], [150, 108], [128, 128], [126, 160]], 30, '#f04a30', r, { outline: '#200604', outlineW: 6, taperIn: 0.15, taperOut: 0.5 });
    dot(c, 124, 204, 17, '#f04a30', r); c.lineWidth = 6; c.strokeStyle = '#200604'; c.stroke();
  } },
  interrobang: { name: '«?!»', draw: (c, r) => {
    brush(c, [[40, 90], [56, 52], [96, 48], [112, 80], [92, 108], [80, 124], [80, 150]], 22, '#f04a30', r, { outline: '#200604', outlineW: 5 });
    dot(c, 78, 196, 13, '#f04a30', r);
    brush(c, [[176, 30], [172, 100], [168, 158]], 30, '#f03a2a', r, { outline: '#200604', outlineW: 6, taperIn: 0.1, taperOut: 0.95 });
    dot(c, 166, 200, 15, '#f03a2a', r);
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
    brush(c, [[150, 20], [100, 110], [150, 118], [96, 230]], 26, '#f0302a', r, { outline: '#200604', outlineW: 6, taperIn: 0.1, taperOut: 0.7, jitter: 0.05 });
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
    this.o = { fps: 6, size: 0.11, variants: 3, ...opts };   // size: доля высоты экрана
    this.scene = new THREE.Scene();
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
  // model: корень персонажа; opts: duration (с), side (-1 слева, 1 справа, 0 над головой), up (м), size (м)
  show(model, kind, opts = {}) {
    if (!MARK_KINDS[kind]) return null;
    let bone = null; model.traverse((b) => { if (!bone && b.isBone && /head$/i.test(b.name)) bone = b; });
    const K = MARK_KINDS[kind];
    // размер на экране постоянный (как дорисовка поверх кадра), не зависит от дальности
    const mat = new THREE.SpriteMaterial({ map: this._variants(kind)[0], transparent: true, depthTest: false, depthWrite: false, toneMapped: false, sizeAttenuation: false });
    const sp = new THREE.Sprite(mat); sp.renderOrder = 100;
    this.scene.add(sp);
    const m = { kind, bone, model, sp, mat, t: 0, dur: opts.duration ?? 2.4, side: opts.side ?? (kind === 'shock' ? 0 : 1),
      up: opts.up ?? (kind === 'shock' ? 0.05 : 0.28), size: (opts.size ?? this.o.size) * (K.size ?? 1), step: -1, v: 0 };
    this.active.push(m);
    return m;
  }
  clear() { for (const m of this.active) { this.scene.remove(m.sp); m.mat.dispose(); } this.active = []; }
  update(dt, camera) {
    this.t += dt;
    const st = Math.floor(this.t * this.o.fps);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const P = new THREE.Vector3();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i]; m.t += dt;
      if (m.t > m.dur) { this.scene.remove(m.sp); m.mat.dispose(); this.active.splice(i, 1); continue; }
      if (st === m.step) continue;            // знаки живут шагами: позиция, размер и рисунок меняются 6 раз в секунду
      m.step = st;
      const arr = this._variants(m.kind); m.v = (m.v + 1) % arr.length; m.mat.map = arr[m.v];
      if (m.bone) P.setFromMatrixPosition(m.bone.matrixWorld); else m.model.getWorldPosition(P).add(new THREE.Vector3(0, 1.8, 0));
      const k = m.t;
      const pop = k < 0.17 ? 0.4 + k / 0.17 * 0.9 : (k < 0.34 ? 1.3 - (k - 0.17) / 0.17 * 0.3 : 1);
      const out = m.dur - k < 0.35 ? (m.dur - k) / 0.35 : 1;
      const bob = Math.sin(k * 7) * 0.02;
      const dist = Math.max(1, camera.position.distanceTo(P)); const off = Math.max(0.3, dist * 0.06);
      m.sp.position.copy(P).addScaledVector(right, m.side * off + (Math.random() - 0.5) * 0.015).add(new THREE.Vector3(0, m.up * Math.max(1, dist / 5) + bob + (Math.random() - 0.5) * 0.015, 0));
      m.sp.scale.setScalar(m.size * pop * (0.6 + 0.4 * out));
      m.mat.opacity = out;
      m.mat.rotation = (Math.random() - 0.5) * 0.12;
    }
  }
}
