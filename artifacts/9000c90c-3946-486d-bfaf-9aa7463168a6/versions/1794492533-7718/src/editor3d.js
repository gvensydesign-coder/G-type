// 3D-редактор: тот же Редактор (классы → роли → листы → слои по цветам → кисти), но холст — 3D-сцена.
// Штрих кистью становится лентой в пространстве (Paint3D); лист хранит 3D-штрихи по слоям.
// Библиотека отдельная: db sheets3d/<id>, params3d/<класс>. Координаты — метры, предмет класса стоит в начале координат.
import * as THREE from 'three';
import { Editor } from './editor.js';
import { Preview, STYLES } from './preview3d.js';
import { Paint3D } from './paint3d.js';
import { drawStroke, KIT } from './brushkit.js';
import { CLS } from './library.js';

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null) e.setAttribute(k, v); } for (const k of kids) e.append(k); return e; };
const M_PER_PX = 0.004; // толщина кисти: 10 «пикселей» листа = 4 см ленты

export class Editor3D extends Editor {
  constructor(root, lib, opts) {
    super(root, lib, opts);
    this.lib2d = opts.lib2d; this.atl = opts.atl; this.scene = 'stand';
    this.init3d();
  }
  bindPad() { /* ввод ведёт Paint3D */ }

  build() {
    super.build();
    // центр: вместо листа — 3D-окно и своя панель инструментов
    this.view = el('div', { class: 'pad3d' });
    this.padWrap.replaceWith(this.view); this.padWrap = this.view;
    const tb = this.C.querySelector('.toolbar');
    // отражение/масштаб/поворот работают в 3D; фон листа заменяем выбором сцены
    tb.querySelector('select').replaceWith(this.sceneSel = el('select', { 'aria-label': 'Сцена', onchange: (e) => { this.scene = e.target.value; this.applyScene(); } },
      ...[['stand', 'Сцена: предмет класса'], ['empty', 'Сцена: пусто'], ['ref_entrance', 'Сцена: подъезд (реф.)'], ['ref_night', 'Сцена: двор ночью (реф.)']].map(([v, t]) => el('option', { value: v }, t))));
    const seg = (id, items, set) => el('div', { class: 'row seg', id }, ...items.map(([k, t]) => el('button', { 'data-k': k, onclick: () => { set(k); this.syncTools(); } }, t)));
    this.tools = el('div', { class: 'toolbar t3' },
      seg('e3Where', [['surface', 'По предметам'], ['air', 'В воздухе']], (k) => { this.paint.where = k; }),
      seg('e3Face', [['camera', 'Линия к камере'], ['ribbon', 'Лист в плоскости']], (k) => { this.paint.face = k; }),
      el('label', { class: 'sl mini' }, el('span', {}, 'Глубина'), el('input', { type: 'range', min: -3, max: 3, step: 0.1, value: 0, 'aria-label': 'Глубина в воздухе', oninput: (e) => { this.paint.depth = +e.target.value; } })),
      seg('e3Live', [['boil', 'Кипение'], ['react', 'Отклик'], ['grow', 'Прорисовка']], (k) => { this.paint.live[k] = this.paint.live[k] ? 0 : 1; }),
      el('label', { class: 'sl mini' }, el('span', {}, 'Колыхание'), el('input', { type: 'range', min: 0, max: 3, step: 0.1, value: 0.6, 'aria-label': 'Колыхание', oninput: (e) => { this.paint.live.sway = +e.target.value; } })),
      el('button', { title: 'Новая живость — всем штрихам слоя', onclick: () => this.liveToLayer() }, 'Живость → слой'),
      seg('e3Tool', [['draw', 'Рисовать'], ['erase', 'Стирать штрих']], (k) => { this.paint.tool = k; }));
    tb.after(this.tools);
    // замечание к 3D-листу — сразу окном, с привязкой к листу
    this.noteBtn.onclick = () => { const sh = this.sheet(); this.notes.ask(sh ? { where: 'sheet', sheet: sh.id, cls: sh.cls, role: sh.role, p: [0.5, 0.5], label: `3D · ${CLS[sh.cls]?.name ?? sh.cls} · ${sh.name}` } : { where: 'general', label: '3D-редактор' }); };
  }
  renderBrushes() { super.renderBrushes(); const h = this.C.querySelector('#brushHint'); if (h) h.textContent = KIT[this.brushT].hint + '  3D: левая кнопка рисует, правая вращает, колесо — ближе/дальше, [ ] — толщина, Ctrl+Z — отмена.'; }
  init3d() {
    this.pv = new Preview(this.view, this.lib2d, this.atl, this.notes);
    this.pv.setStyle('lair'); this.pv.setFlag('aura', false);
    this.paint = new Paint3D(this.pv, {
      getBrush: () => ({ b: { ...this.brush, t: this.brushT } }), getColor: () => this.layer()?.color ?? '#0c0e16',
      sceneKey: () => 'ed', db: null, keys: false,
      width: () => Math.max(0.004, this.size * M_PER_PX * this.thick()),
      onStroke: (s) => this.addStroke(s), onErase: (id) => this.eraseStroke(id),
    });
    this.pv.paint = this.paint; this.paint.setOn(true);
    this.styleSel = el('select', { 'aria-label': 'Стиль сцены', onchange: (e) => { this.pv.setStyle(e.target.value); this.pv.setFlag('aura', false); } }, ...Object.entries(STYLES).map(([k, t]) => el('option', { value: k }, 'Стиль: ' + t.name)));
    this.sceneSel.after(this.styleSel);
    this.applyScene(); this.syncTools(); this.drawPad();
  }
  start() { this.pv.start(); }
  stop() { this.pv.stop(); }
  applyScene() {
    const v = this.scene; const pv = this.pv;
    if (v.startsWith('ref_')) { pv.setStyle(v === 'ref_night' ? 'night' : 'entrance'); pv.setMode('ref'); this.styleSel.value = pv.style; }
    else { pv.setMode(v === 'empty' ? 'empty' : 'one'); pv.setClass(this.cls); }
    pv.setFlag('aura', false);
  }
  select(o) { super.select(o); if (this.pv && this.scene === 'stand') this.pv.setClass(this.cls); }
  syncTools() {
    const P = this.paint; if (!P) return; const tog = (id, v) => this.tools.querySelectorAll(`#${id} button`).forEach((b) => b.classList.toggle('on', typeof v === 'function' ? v(b.dataset.k) : b.dataset.k === v));
    tog('e3Where', P.where); tog('e3Face', P.face); tog('e3Tool', P.tool); tog('e3Live', (k) => !!P.live[k]);
  }

  // ---------- штрихи листа ↔ ленты в сцене ----------
  addStroke(s) {
    const L = this.layer(); if (!L) { this.paint.drop(s.id); return; }
    this.snapshot();
    const k = { id: s.id, pts: s.pts, ns: s.ns, pr: s.pr, w: s.w, b: s.b, sd: s.sd, face: s.face, live: s.live };
    if (k.b?.m) { k.m = k.b.m; delete k.b.m; }
    L.strokes.push(k); this.changed();
  }
  eraseStroke(id) { const s = this.sheet(); if (!s) return; for (const L of s.layers) { const i = L.strokes.findIndex((k) => k.id === id); if (i >= 0) { this.snapshot(); L.strokes.splice(i, 1); this.changed(); return; } } }
  liveToLayer() { const L = this.layer(); if (!L?.strokes.length) return; this.snapshot(); for (const k of L.strokes) k.live = { ...this.paint.live }; this.changed(); }
  // перестроить сцену под текущий лист: лишнее убрать, недостающее построить, цвет/прозрачность слоя — сразу
  drawPad() {
    if (!this.paint) return;
    const P = this.paint; const s = this.sheet(); const want = new Map();
    for (const L of s?.layers ?? []) for (const k of L.strokes) { if (!k.id) k.id = 'p' + Math.random().toString(36).slice(2, 10); if (k.pts.length % 3 === 0 && k.ns) want.set(k.id, { k, L }); }
    for (const id of [...P.items.keys()]) if (!want.has(id) && P.cur?.id !== id) P.drop(id);
    let order = 0;
    for (const [id, { k, L }] of want) {
      const c = k.c ?? L.color; const key = c + '|' + k.w + '|' + k.face + '|' + JSON.stringify(k.b) + '|' + k.pts.length + '|' + JSON.stringify(k.live);
      let it = P.items.get(id);
      if (it && it.key !== key) { P.drop(id); it = null; }
      if (!it) { P.build({ ...k, c, scene: 'ed', live: k.live ?? { boil: 1, sway: 0, react: 0, grow: 0 } }, false); it = P.items.get(id); it.key = key; }
      it.mesh.visible = L.vis !== false; it.mat.uniforms.uOp.value = L.o ?? 1; it.mesh.renderOrder = 6 + order++ * 0.001;
    }
  }
  renderPins() { /* булавки замечаний — общим списком, без точки на листе */ }

  // превью листа: вид спереди (x, y), штрихи той же кистью
  paintThumb(c, s) {
    const g = c.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, 96, 96);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const L of s.layers) for (const k of L.strokes) for (let i = 0; i < k.pts.length; i += 3) { x0 = Math.min(x0, k.pts[i]); x1 = Math.max(x1, k.pts[i]); y0 = Math.min(y0, k.pts[i + 1]); y1 = Math.max(y1, k.pts[i + 1]); }
    if (!isFinite(x0)) return; const sc = 0.8 / Math.max(0.2, x1 - x0, y1 - y0); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (const L of s.layers) { if (L.vis === false) continue; g.globalAlpha = L.o ?? 1; for (const k of L.strokes) {
      const pts = []; for (let i = 0; i < k.pts.length; i += 3) pts.push(0.5 + (k.pts[i] - cx) * sc, 0.5 - (k.pts[i + 1] - cy) * sc);
      drawStroke(g, { pts, pr: k.pr, w: Math.max(0.01, k.w * sc), b: k.b, sd: k.sd }, 96, k.c ?? L.color);
    } }
    g.globalAlpha = 1;
  }
  // отразить / перевернуть / крупнее / мельче / повернуть — слой вокруг его центра, в 3D
  xform(kind) {
    const L = this.layer(); if (!L?.strokes.length) return; this.snapshot();
    const c = new THREE.Vector3(); let n = 0; for (const k of L.strokes) for (let i = 0; i < k.pts.length; i += 3) { c.x += k.pts[i]; c.y += k.pts[i + 1]; c.z += k.pts[i + 2]; n++; } c.divideScalar(n);
    const sc = kind === 'up' ? 1.1 : kind === 'dn' ? 1 / 1.1 : 1; const a = kind === 'rot' ? Math.PI / 12 : 0; const ca = Math.cos(a), sa = Math.sin(a);
    const f = (x, y, z, isN) => { let X = isN ? x : x - c.x, Y = isN ? y : y - c.y, Z = isN ? z : z - c.z; if (kind === 'mx') X = -X; if (kind === 'my') Y = -Y; if (a) [X, Z] = [X * ca + Z * sa, -X * sa + Z * ca]; if (!isN) { X = c.x + X * sc; Y = c.y + Y * sc; Z = c.z + Z * sc; } return [X, Y, Z]; };
    for (const k of L.strokes) {
      for (let i = 0; i < k.pts.length; i += 3) [k.pts[i], k.pts[i + 1], k.pts[i + 2]] = f(k.pts[i], k.pts[i + 1], k.pts[i + 2], false).map((v) => +v.toFixed(4));
      if (k.ns) for (let i = 0; i < k.ns.length; i += 3) [k.ns[i], k.ns[i + 1], k.ns[i + 2]] = f(k.ns[i], k.ns[i + 1], k.ns[i + 2], true).map((v) => +v.toFixed(3));
      if (sc !== 1) k.w = +(k.w * sc).toFixed(4);
    }
    this.changed();
  }
}
