// Рисунки от руки (раздел «Почеркушки») → текстуры для стиля.
//  hatch   → плитка каракулей в тенях (материал)
//  brush   → форма мазков-карточек (каждый штрих отдельно, вытянут по своей оси)
//  outline → ритм нажима и разрывов контура (профиль вдоль линии)
//  light   → ритм нажима и разрывов эскизных линий света
//  glow    → нарисованные лучи у центров свечения (спрайты, шагами)
//  fx      → искры и пыль от свечения
import * as THREE from 'three';
import { renderStroke } from './brushes.js';

export const HAND_CLASSES = ['light', 'outline', 'hatch', 'brush', 'glow', 'fx', 'eyes', 'marks', 'fire', 'water', 'splash', 'smoke', 'aura', 'runes', 'env'];

export async function loadScribbles({ base = 'scribbles/' } = {}) {
  const out = {};
  let db = null;
  try { db = window.claude?.use ? await Promise.race([window.claude.use('db'), new Promise((r) => setTimeout(() => r(null), 4000))]) : null; } catch { db = null; }
  await Promise.all(HAND_CLASSES.map(async (c) => {
    let d = null;
    if (db) { try { const s = await Promise.race([db.doc('scribbles/' + c).get(), new Promise((r) => setTimeout(() => r(null), 6000))]); if (s?.exists) d = s.data(); } catch { d = null; } }
    if (!d) { try { const s = localStorage.getItem('pfScrib_' + c); if (s) d = JSON.parse(s); } catch { d = null; } }
    if (!d) { try { const r = await fetch(base + c + '.json'); if (r.ok) d = await r.json(); } catch { d = null; } }
    const samples = Object.keys(d?.slots ?? {}).sort().map((k) => (d.slots[k].s ?? []).map((a, i) => ({ ...unpack(a), b: d.slots[k].b?.[i] ?? null }))).filter((s) => s.length);
    if (samples.length) out[c] = samples;
  }));
  return out;
}
function unpack(a) { const p = []; for (let i = 1; i < a.length; i += 3) p.push([a[i], a[i + 1], a[i + 2]]); return { w: a[0], p }; }

// кисть по точкам: тип кисти, нажим, прозрачность — общая с редактором (brushes.js)
function drawStroke(ctx, st, map, wK = 1, minW = 0.8) {
  if (st.p.length < 2) return;
  renderStroke(ctx, st.p.map((q) => [...map(q), q[2]]), st.w * wK, st.b, ctx.strokeStyle, { minW });
}
function canvasTex(w, h, fn, { srgb = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  fn(ctx); const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}

// Атлас целых образцов (клетка = образец как нарисован): для плитки каракулей, лучей, искр
export function sampleAtlas(samples, { cell = 256, wK = 1, minW = 1, color = '#fff' } = {}) {
  const n = samples.length; const cols = Math.ceil(Math.sqrt(n)); const rows = Math.ceil(n / cols);
  const tex = canvasTex(cols * cell, rows * cell, (ctx) => {
    ctx.strokeStyle = color;
    samples.forEach((s, i) => {
      const ox = (i % cols) * cell, oy = Math.floor(i / cols) * cell;
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, cell, cell); ctx.clip();
      for (const st of s) drawStroke(ctx, st, (q) => [ox + q[0] * cell, oy + q[1] * cell], cell * wK, minW);
      ctx.restore();
    });
  });
  return { tex, n, cols, rows };
}

// Атлас отдельных штрихов, каждый повёрнут по своей главной оси и вписан в клетку 3:1 — для мазков-карточек
export function strokeAtlas(samples, { cw = 192, ch = 64, cols = 8, bodyK = 0.42 } = {}) {
  const strokes = samples.flat().filter((st) => st.p.length > 3);
  const n = Math.min(strokes.length, 64); const rows = Math.ceil(n / cols);
  const tex = canvasTex(cols * cw, rows * ch, (ctx) => {
    ctx.strokeStyle = '#fff';
    strokes.slice(0, n).forEach((st, i) => {
      const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch;
      const a = st.p[0], b = st.p[st.p.length - 1]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const cs = Math.cos(-ang), sn = Math.sin(-ang);
      const R = st.p.map((q) => [q[0] * cs - q[1] * sn, q[0] * sn + q[1] * cs]);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [x, y] of R) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const sx = (cw * 0.9) / Math.max(x1 - x0, 1e-3); const sy = Math.min(sx, (ch * 0.55) / Math.max(y1 - y0, 1e-3));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const map = (q) => { const x = q[0] * cs - q[1] * sn, y = q[0] * sn + q[1] * cs; return [ox + cw / 2 + (x - cx) * sx, oy + ch / 2 + (y - cy) * sy]; };
      // тело мазка не тоньше bodyK высоты клетки: линия пера становится мазком кисти, форма и нажим — его
      ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, cw, ch); ctx.clip();
      drawStroke(ctx, { w: Math.max(st.w * sx, (ch * bodyK) / 1.25), p: st.p, b: st.b }, map, 1, 2);
      ctx.restore();
    });
  });
  return { tex, n, cols, rows };
}

// Профиль нажима вдоль линии: строка = образец, x = путь по линии (0..1), значение = толщина (0 = разрыв).
// Линии образца раскладываются по своей главной оси, промежутки между ними — разрывы.
export function pressureProfile(samples, { w = 256 } = {}) {
  const rows = samples.length; const data = new Uint8Array(w * rows * 4);
  samples.forEach((s, r) => {
    const all = s.flatMap((st) => st.p); if (!all.length) return;
    // ось образца: от первой до самой дальней точки
    let dx = 0, dy = 0; { const a = all[0]; let best = 0; for (const q of all) { const d = Math.hypot(q[0] - a[0], q[1] - a[1]); if (d > best) { best = d; dx = q[0] - a[0]; dy = q[1] - a[1]; } } }
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const proj = (q) => q[0] * dx + q[1] * dy;
    let t0 = Infinity, t1 = -Infinity; for (const q of all) { const t = proj(q); t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
    const span = Math.max(t1 - t0, 1e-3); let maxW = 1e-6; const prof = new Float32Array(w);
    for (const st of s) for (let i = 1; i < st.p.length; i++) {
      const a = (proj(st.p[i - 1]) - t0) / span, b = (proj(st.p[i]) - t0) / span; const t = i / (st.p.length - 1);
      const taper = Math.min(1, Math.min(t, 1 - t) * 6 + 0.25); const wv = st.w * (0.35 + 0.9 * st.p[i][2]) * taper;
      for (let x = Math.floor(Math.min(a, b) * (w - 1)); x <= Math.ceil(Math.max(a, b) * (w - 1)); x++) if (x >= 0 && x < w) prof[x] = Math.max(prof[x], wv);
      maxW = Math.max(maxW, wv);
    }
    for (let x = 0; x < w; x++) { const v = Math.round(255 * Math.min(1, prof[x] / maxW)); const o = (r * w + x) * 4; data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255; }
  });
  const t = new THREE.DataTexture(data, w, rows); t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return { tex: t, n: rows };
}

// Подключает рисунки к стилю, постобработке и карточкам. Возвращает то, что подключилось.
export function applyHandDrawn(lib, { style, post, cards = [] } = {}) {
  const used = [];
  if (lib.hatch && style) { const A = sampleAtlas(lib.hatch, { wK: 1.6, minW: 1.6 }); style.u.pfHandHatch.value = A.tex; style.u.pfHandHatchN.value.set(A.n, A.cols, A.rows, 1); used.push('hatch'); }
  if (lib.outline && style) { const P = pressureProfile(lib.outline); style.u.pfHandLine.value = P.tex; style.u.pfHandLineN.value = P.n; used.push('outline'); }
  if (lib.light && post) { const P = pressureProfile(lib.light); post.setHandLight(P.tex, P.n); used.push('light'); }
  if (lib.brush) { const A = strokeAtlas(lib.brush); style.handBrush = A; for (const c of cards) c?.setHandBrush?.(A); used.push('brush'); }
  if (lib.glow) { style.handGlow = sampleAtlas(lib.glow, { wK: 4, minW: 5 }); used.push('glow'); }
  if (lib.fx) { style.handFx = sampleAtlas(lib.fx, { wK: 4, minW: 6 }); used.push('fx'); }
  return used;
}

// ------------------------------------------------------------ лучи и искры у центров свечения
// Нарисованные лучи (класс glow) — спрайт у центра, образец меняется шагами, цвет свечения;
// искры (класс fx) взлетают от центра и гаснут. Пишут альфу 0,5, чтобы Кувахара их не размывала.
function protectSprite(map, color) {
  const m = new THREE.SpriteMaterial({ map, color, alphaTest: 0.35, depthWrite: false, transparent: false, fog: false });
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\ngl_FragColor.a = .5;'); };
  return m;
}
function atlasSprite(A, color) {
  const tex = A.tex.clone(); tex.needsUpdate = true; tex.repeat.set(1 / A.cols, 1 / A.rows);
  const s = new THREE.Sprite(protectSprite(tex, color)); s.userData.pfMark = true; s.userData.atlas = A; s.renderOrder = 3;
  return s;
}
function setCell(s, i) { const A = s.userData.atlas; const k = ((i % A.n) + A.n) % A.n; s.material.map.offset.set((k % A.cols) / A.cols, 1 - (Math.floor(k / A.cols) + 1) / A.rows); }

export class HandGlow {
  // anchors: [{a: Object3D, r: радиус м}], как у ZoneGlow
  constructor(style, anchors, { color = '#6dff96', rays = true, sparks = 5, size = 4.5, fps = 8 } = {}) {
    this.style = style; this.items = []; this.fps = fps; this.t = 0; this.step = -1;
    const G = style.handGlow, F = style.handFx;
    for (const x of anchors) {
      const it = { x, ray: null, sparks: [] };
      if (rays && G) { it.ray = atlasSprite(G, color); it.ray.scale.setScalar(x.r * size); x.a.parent.add(it.ray); }
      if (F) for (let i = 0; i < sparks; i++) { const s = atlasSprite(F, color); s.scale.setScalar(x.r * 1.2); s.userData.ph = Math.random(); x.a.parent.add(s); it.sparks.push(s); }
      this.items.push(it);
    }
    this.color = new THREE.Color(color); this.on = true;
  }
  set({ color, on } = {}) {
    if (color) this.color.set(color); if (on != null) this.on = on;
    for (const it of this.items) for (const s of [it.ray, ...it.sparks]) if (s) { s.material.color.copy(this.color); s.visible = this.on; }
  }
  update(dt) {
    this.t += dt; const st = Math.floor(this.t * this.fps); const newStep = st !== this.step; this.step = st;
    const w = new THREE.Vector3();
    for (const [j, it] of this.items.entries()) {
      it.x.a.getWorldPosition(w);
      const par = it.x.a.parent; const ps = par.getWorldScale(new THREE.Vector3()).x || 1;
      const local = par.worldToLocal(w.clone());
      if (it.ray) { it.ray.position.copy(local); if (newStep) { setCell(it.ray, st * 7 + j * 3); it.ray.material.rotation = (Math.random() - 0.5) * 0.6; } it.ray.scale.setScalar((it.x.r * 4.5 / ps) * (0.9 + 0.2 * Math.sin(st * 1.7 + j))); }
      for (const [k, s] of it.sparks.entries()) {
        const life = (this.t * 0.6 + s.userData.ph) % 1;
        if (newStep && life < 0.12) { s.userData.dir = new THREE.Vector3((Math.random() - 0.5) * 1.2, 1, (Math.random() - 0.5) * 1.2).normalize(); setCell(s, st + k * 5); }
        const d = s.userData.dir ?? new THREE.Vector3(0, 1, 0);
        // искра летит шагами (позиция обновляется только на шаге), как в рисованном кадре
        if (newStep) s.position.copy(local).addScaledVector(d, (it.x.r * 6 * life) / ps);
        s.scale.setScalar((it.x.r * 1.3 / ps) * (1 - life * 0.7));
        s.visible = this.on && life < 0.85;
      }
    }
  }
}
