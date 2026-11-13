// Редактор листа: класс → роль → лист (вариант) → слои по цветам → штрихи кистями brushkit.
import { GROUPS, KIT, KNOBS, MODES, brushOf, drawStroke } from './brushkit.js';
import { CLASSES, CLS, ROLES, ROLE, newSheet, newLayer, renderSheet, roleColor } from './library.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null) e.setAttribute(k, v); } for (const k of kids) e.append(k); return e; };
const PAD = 768;
const BG = { shadow: ['#1b1d33', '#2a2c4c'], lit: ['#a9a089', '#c8bfa4'], aura: ['#14201c', '#14201c'], glint: ['#1a2226', '#1a2226'], mask: ['#808080', '#808080'] };
const BASE_SW = ['#0c0e16', '#d8e0c4', '#ffffff', '#000000', '#33335f', '#0e1220', '#fff0c0', '#cfffc0', '#ff9a40', '#ffc27a', '#58d8ff', '#7dff9a', '#c8382a', '#8cff00', '#ff9500', '#c752bd', '#493212', '#e8c890'];

export class Editor {
  constructor(root, lib, { notes, onChange }) {
    this.root = root; this.lib = lib; this.notes = notes; this.onChange = onChange ?? (() => {});
    this.cls = 'stone'; this.role = 'shadow'; this.sheetId = null; this.layerId = null;
    this.brushT = 'ink'; this.brush = brushOf('ink'); this.size = KIT.ink.size; this.smooth = 0.15; this.bgMode = 'role';
    this.undo = []; this.redo = []; this.noteMode = false;
    try { const s = JSON.parse(localStorage.getItem('ss-brush') ?? 'null'); if (s?.t && KIT[s.t]) { this.brushT = s.t; this.brush = { ...brushOf(s.t), ...s.b }; this.size = s.size ?? KIT[s.t].size; } } catch { /* нет */ }
    this.build();
    lib.on((w) => { if (w === 'sheets') { this.ensureSheet(); this.renderAll(); } });
  }

  // ---------- состояние ----------
  sheet() { return this.lib.sheets.get(this.sheetId); }
  layer() { const s = this.sheet(); return s?.layers.find((l) => l.id === this.layerId) ?? s?.layers[s.layers.length - 1]; }
  ensureSheet() {
    const list = this.lib.sheetsOf(this.cls, this.role);
    if (!list.find((s) => s.id === this.sheetId)) this.sheetId = list[0]?.id ?? null;
    const s = this.sheet(); if (s && !s.layers.find((l) => l.id === this.layerId)) this.layerId = s.layers[s.layers.length - 1]?.id ?? null;
  }
  thick() { return this.lib.params(this.cls, this.role).thick ?? 1; }
  snapshot() { const s = this.sheet(); if (!s) return; this.undo.push({ id: s.id, d: JSON.stringify(s.layers) }); if (this.undo.length > 60) this.undo.shift(); this.redo = []; }
  changed(full = true) { const s = this.sheet(); if (s) this.lib.touch(s.id); this.onChange(this.cls); if (full) this.renderSheets(); this.drawPad(); this.renderLayers(); }
  select({ cls, role, sheetId } = {}) { if (cls) this.cls = cls; if (role) this.role = role; if (sheetId) this.sheetId = sheetId; this.ensureSheet(); this.renderAll(); }

  // ---------- разметка ----------
  build() {
    const R = this.root; R.innerHTML = '';
    this.L = el('aside', { class: 'ed-left' });
    this.C = el('section', { class: 'ed-center' });
    this.Rt = el('aside', { class: 'ed-right' });
    R.append(this.L, this.C, this.Rt);
    // левая колонка
    this.clsBox = el('div', { class: 'chips' });
    this.roleBox = el('div', { class: 'roles' });
    this.sheetBox = el('div', { class: 'sheets' });
    this.parBox = el('div', { class: 'params' });
    this.L.append(el('h3', {}, 'Класс'), this.clsBox, el('h3', {}, 'Куда ляжет'), this.roleBox, el('p', { class: 'hint', id: 'roleHint' }),
      el('h3', {}, 'Листы'), this.sheetBox,
      el('div', { class: 'row' }, el('button', { onclick: () => this.addSheet() }, '+ Новый лист'), el('button', { onclick: () => this.dupSheet() }, 'Копия'), el('button', { onclick: () => this.delSheet() }, 'Удалить')),
      el('h3', {}, 'Как ложится на предмет'), this.parBox);
    // центр
    this.padWrap = el('div', { class: 'pad' });
    this.cv = el('canvas', { width: PAD, height: PAD, 'aria-label': 'Лист для рисования' });
    this.ov = el('canvas', { width: PAD, height: PAD, class: 'ov', tabindex: '0' });
    this.pins = el('div', { class: 'pins' });
    this.padWrap.append(this.cv, this.ov, this.pins);
    this.nameIn = el('input', { class: 'name', 'aria-label': 'Имя листа', onchange: () => { const s = this.sheet(); if (s) { s.name = this.nameIn.value; this.lib.touch(s.id); this.renderSheets(); } } });
    const bgSel = el('select', { 'aria-label': 'Фон', onchange: (e) => { this.bgMode = e.target.value; this.drawPad(); } },
      ...[['role', 'Фон: как на предмете'], ['paper', 'Фон: бумага'], ['dark', 'Фон: тёмный'], ['clear', 'Фон: прозрачный']].map(([v, t]) => el('option', { value: v }, t)));
    this.noteBtn = el('button', { class: 'note-btn', onclick: () => { this.noteMode = !this.noteMode; this.noteBtn.classList.toggle('on', this.noteMode); this.padWrap.classList.toggle('noting', this.noteMode); } }, '✎ Замечание');
    this.C.append(
      el('div', { class: 'toolbar' }, this.nameIn,
        el('button', { title: 'Отменить (Ctrl+Z)', onclick: () => this.doUndo() }, '↶'), el('button', { title: 'Вернуть (Ctrl+Y)', onclick: () => this.doRedo() }, '↷'),
        el('button', { title: 'Отразить слой', onclick: () => this.xform('mx') }, '⇋'), el('button', { title: 'Перевернуть слой', onclick: () => this.xform('my') }, '⇵'),
        el('button', { title: 'Слой крупнее', onclick: () => this.xform('up') }, '＋'), el('button', { title: 'Слой мельче', onclick: () => this.xform('dn') }, '－'),
        el('button', { title: 'Повернуть слой на 15°', onclick: () => this.xform('rot') }, '⟳'),
        el('button', { title: 'Очистить слой', onclick: () => this.clearLayer() }, 'Очистить'), bgSel, this.noteBtn),
      this.padWrap, el('p', { class: 'hint', id: 'brushHint' }));
    // правая колонка
    this.brBox = el('div', { class: 'brushes' });
    this.knobBox = el('div', { class: 'knobs' });
    this.swBox = el('div', { class: 'swatches' });
    this.colorIn = el('input', { type: 'color', 'aria-label': 'Цвет слоя', oninput: (e) => { const L = this.layer(); if (L) { L.color = e.target.value; this.changed(false); } } });
    this.layBox = el('div', { class: 'layers' });
    this.Rt.append(el('h3', {}, 'Кисть'), this.brBox, this.knobBox,
      el('h3', {}, 'Цвета'), el('p', { class: 'hint' }, 'Клик по цвету — слой этим цветом (есть — выберется, нет — появится новый).'),
      el('div', { class: 'row' }, this.colorIn, el('span', { class: 'hint' }, 'цвет текущего слоя')), this.swBox,
      el('h3', {}, 'Слои'), this.layBox, el('div', { class: 'row' }, el('button', { onclick: () => this.addLayer() }, '+ Слой'), el('button', { onclick: () => this.mergeDown() }, 'Слить вниз')));
    this.bindPad();
    // горячие клавиши по физической кнопке (e.code), чтобы работали и в русской раскладке
    document.addEventListener('keydown', (e) => {
      if (!this.root.offsetParent) return;
      const typing = e.target.matches?.('textarea, input:not([type]), input[type=text], select') || e.target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'KeyZ' && !typing) { e.preventDefault(); e.shiftKey ? this.doRedo() : this.doUndo(); return; }
      if (mod && e.code === 'KeyY' && !typing) { e.preventDefault(); this.doRedo(); return; }
      if (typing || mod) return;
      if (e.code === 'BracketLeft') { this.size = Math.max(1, this.size - 2); this.renderKnobs(); }
      if (e.code === 'BracketRight') { this.size = Math.min(120, this.size + 2); this.renderKnobs(); }
    }, true);
  }
  renderAll() { this.ensureSheet(); this.renderClasses(); this.renderRoles(); this.renderSheets(); this.renderParams(); this.renderBrushes(); this.renderKnobs(); this.renderSwatches(); this.renderLayers(); this.drawPad(); }

  renderClasses() {
    this.clsBox.replaceChildren(...CLASSES.map((c) => {
      const n = this.lib.sheetsOf(c.k).length;
      const b = el('button', { class: 'chip' + (c.k === this.cls ? ' on' : ''), onclick: () => this.select({ cls: c.k }) }, el('i', { style: `background:${c.base}` }), c.name, n ? el('small', {}, String(n)) : '');
      return b;
    }));
  }
  renderRoles() {
    this.roleBox.replaceChildren(...ROLES.map((r) => {
      const n = this.lib.sheetsOf(this.cls, r.k).length;
      return el('button', { class: 'role' + (r.k === this.role ? ' on' : ''), onclick: () => this.select({ role: r.k }) }, r.name, el('small', {}, n ? String(n) : '·'));
    }));
    $('#roleHint', this.L).textContent = ROLE[this.role].hint;
  }
  renderSheets() {
    const list = this.lib.sheetsOf(this.cls, this.role);
    this.sheetBox.replaceChildren(...list.map((s, i) => {
      const c = el('canvas', { width: 96, height: 96 }); this.paintThumb(c, s);
      const b = el('button', { class: 'sheet' + (s.id === this.sheetId ? ' on' : '') + (s.off ? ' off' : ''), title: s.name + (i >= 4 ? ' (в игру идут первые 4 включённых)' : ''), onclick: () => this.select({ sheetId: s.id }) }, c,
        el('span', {}, s.name), el('label', { class: 'use', title: 'Брать в игру', onclick: (e) => e.stopPropagation() }, Object.assign(el('input', { type: 'checkbox' }), { checked: !s.off, onchange: (e) => { s.off = !e.target.checked; this.lib.touch(s.id); this.onChange(this.cls); this.renderSheets(); } })));
      return b;
    }), list.length ? '' : el('p', { class: 'hint' }, 'Здесь пока пусто — нажми «+ Новый лист».'));
    const s = this.sheet(); this.nameIn.value = s?.name ?? ''; this.nameIn.disabled = !s;
  }
  paintThumb(c, s) {
    const g = c.getContext('2d'); const [a] = BG[ROLE[s.role].bg] ?? BG.lit; g.fillStyle = a; g.fillRect(0, 0, 96, 96);
    renderSheet(g, s, 96, { wMul: this.lib.params(s.cls, s.role).thick ?? 1 });
  }
  renderParams() {
    const p = this.lib.params(this.cls, this.role);
    this.parBox.replaceChildren(...ROLE[this.role].params.map(([k, name, mn, mx, st]) => {
      const out = el('output', {}, String(p[k]));
      const inp = el('input', { type: 'range', min: mn, max: mx, step: st, value: p[k], 'aria-label': name, oninput: (e) => { const v = +e.target.value; out.textContent = String(v); this.lib.setParam(this.cls, this.role, k, v); this.onChange(this.cls); if (k === 'thick' || k === 'blur') { this.drawPad(); this.renderSheets(); } } });
      return el('label', { class: 'sl' }, el('span', {}, name), inp, out);
    }));
  }
  renderBrushes() {
    this.brBox.replaceChildren(...GROUPS.map((g) => el('div', { class: 'bgroup' }, el('small', {}, g.name), el('div', { class: 'row' }, ...g.list.map((t) =>
      el('button', { class: 'br' + (t === this.brushT ? ' on' : ''), onclick: () => { this.brushT = t; this.brush = brushOf(t); this.size = KIT[t].size; this.saveBrush(); this.renderBrushes(); this.renderKnobs(); } }, KIT[t].name))))));
    $('#brushHint', this.C).textContent = KIT[this.brushT].hint + '  Колесо/[ ] — толщина. Ctrl+Z — отмена.';
  }
  renderKnobs() {
    const B = this.brush;
    const rows = KNOBS.filter(([k]) => k !== 'an' || B.an != null).map(([k, name, mn, mx, st]) => {
      const val = k === 'size' ? this.size : (B[k] ?? 0);
      const out = el('output', {}, (+val).toFixed(st < 1 ? 2 : 0));
      const inp = el('input', { type: 'range', min: mn, max: mx, step: st, value: val, 'aria-label': name, oninput: (e) => { const v = +e.target.value; if (k === 'size') this.size = v; else B[k] = v; out.textContent = v.toFixed(st < 1 ? 2 : 0); this.saveBrush(); this.drawSample(); } });
      return el('label', { class: 'sl' }, el('span', {}, name), inp, out);
    });
    const sm = el('input', { type: 'range', min: 0, max: 0.9, step: 0.01, value: this.smooth, oninput: (e) => { this.smooth = +e.target.value; } });
    const mode = el('select', { 'aria-label': 'Наложение штриха', onchange: (e) => { B.m = e.target.value || undefined; this.saveBrush(); this.drawSample(); } }, el('option', { value: '' }, 'Наложение: как у кисти'), ...MODES.map(([v, t]) => el('option', { value: v }, t)));
    mode.value = B.m ?? '';
    this.sample = el('canvas', { width: 280, height: 56, class: 'sample' });
    this.knobBox.replaceChildren(this.sample, ...rows, el('label', { class: 'sl' }, el('span', {}, 'Сглаживание руки'), sm, el('output', {}, '')), mode,
      el('button', { onclick: () => { this.brush = brushOf(this.brushT); this.size = KIT[this.brushT].size; this.saveBrush(); this.renderKnobs(); } }, 'Сбросить кисть'));
    this.drawSample();
  }
  drawSample() {
    const c = this.sample; if (!c) return; const g = c.getContext('2d'); g.fillStyle = '#c8bfa4'; g.fillRect(0, 0, c.width, c.height);
    const pts = [], pr = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(0.06 + u * 0.88, (0.5 + Math.sin(u * 6.28) * 0.22) * c.height / c.width); pr.push(0.3 + 0.7 * Math.sin(u * 3.14)); }
    const L = this.layer();
    drawStroke(g, { pts, pr, w: this.size / PAD, b: { ...this.brush }, sd: 7 }, c.width, L?.color ?? '#0c0e16', { sy: c.width });
  }
  saveBrush() { try { localStorage.setItem('ss-brush', JSON.stringify({ t: this.brushT, b: this.brush, size: this.size })); } catch { /* нет */ } }
  renderSwatches() {
    const C = CLS[this.cls]; const set = [...new Set([C.base, C.aura, roleColor(this.cls, this.role), ...BASE_SW])];
    this.swBox.replaceChildren(...set.map((c) => el('button', { class: 'sw', style: `background:${c}`, title: c, 'aria-label': 'Цвет ' + c, onclick: () => this.pickColor(c) })));
  }
  pickColor(c) {
    const s = this.sheet(); if (!s) return;
    let L = s.layers.find((l) => l.color.toLowerCase() === c.toLowerCase());
    if (!L) { this.snapshot(); L = newLayer(c, 'Цвет ' + c); s.layers.push(L); }
    this.layerId = L.id; this.changed(false);
  }
  renderLayers() {
    const s = this.sheet(); if (!s) { this.layBox.replaceChildren(); return; }
    const cur = this.layer(); this.colorIn.value = /^#[0-9a-f]{6}$/i.test(cur?.color ?? '') ? cur.color : '#000000';
    this.layBox.replaceChildren(...[...s.layers].reverse().map((L) => {
      const i = s.layers.indexOf(L);
      const name = el('input', { value: L.name, 'aria-label': 'Имя слоя', onchange: (e) => { L.name = e.target.value; this.lib.touch(s.id); } });
      const op = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: L.o ?? 1, title: 'Прозрачность слоя', 'aria-label': 'Прозрачность слоя', oninput: (e) => { L.o = +e.target.value; this.changed(false); } });
      const md = el('select', { 'aria-label': 'Наложение слоя', onchange: (e) => { L.mode = e.target.value; this.changed(false); } }, ...MODES.filter(([v]) => v !== 'destination-out').map(([v, t]) => el('option', { value: v }, t))); md.value = L.mode ?? 'source-over';
      const row = el('div', { class: 'layer' + (L === cur ? ' on' : ''), onclick: (e) => { if (e.target.closest('input,select,button')) return; this.layerId = L.id; this.renderLayers(); this.drawSample(); } },
        el('button', { class: 'eye', title: 'Показать/скрыть', onclick: () => { L.vis = L.vis === false; this.changed(false); } }, L.vis === false ? '◌' : '●'),
        el('i', { class: 'swc', style: `background:${L.color}` }), name, el('small', {}, String(L.strokes.length)),
        el('button', { title: 'Выше', onclick: () => { if (i < s.layers.length - 1) { this.snapshot(); [s.layers[i], s.layers[i + 1]] = [s.layers[i + 1], s.layers[i]]; this.changed(); } } }, '▲'),
        el('button', { title: 'Ниже', onclick: () => { if (i > 0) { this.snapshot(); [s.layers[i], s.layers[i - 1]] = [s.layers[i - 1], s.layers[i]]; this.changed(); } } }, '▼'),
        el('button', { title: 'Удалить слой', onclick: () => { if (s.layers.length < 2) return; this.snapshot(); s.layers.splice(i, 1); this.changed(); } }, '✕'),
        el('div', { class: 'lrow2' }, op, md));
      return row;
    }));
  }

  // ---------- действия ----------
  addSheet() { const s = newSheet(this.cls, this.role, `${ROLE[this.role].name} ${this.lib.sheetsOf(this.cls, this.role).length + 1}`); s.ord = Date.now(); this.lib.add(s); this.sheetId = s.id; this.layerId = s.layers[0].id; this.onChange(this.cls); this.renderAll(); }
  dupSheet() { const s = this.sheet(); if (!s) return; const d = JSON.parse(JSON.stringify(s)); d.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); d.name = s.name + ' (копия)'; d.ord = Date.now(); delete d.src; this.lib.add(d); this.sheetId = d.id; this.onChange(this.cls); this.renderAll(); }
  delSheet() { const s = this.sheet(); if (!s) return; if (!confirm(`Удалить лист «${s.name}»?`)) return; this.lib.remove(s.id); this.sheetId = null; this.onChange(this.cls); this.renderAll(); }
  addLayer() { const s = this.sheet(); if (!s) return; this.snapshot(); const L = newLayer(this.layer()?.color ?? '#0c0e16', 'Слой ' + (s.layers.length + 1)); s.layers.push(L); this.layerId = L.id; this.changed(); }
  mergeDown() {
    const s = this.sheet(); const L = this.layer(); const i = s?.layers.indexOf(L); if (!s || !(i > 0)) return; this.snapshot();
    const D = s.layers[i - 1]; for (const k of L.strokes) D.strokes.push(k.c ? k : { ...k, c: L.color }); s.layers.splice(i, 1); this.layerId = D.id; this.changed();
  }
  clearLayer() { const L = this.layer(); if (!L?.strokes.length) return; this.snapshot(); L.strokes = []; this.changed(); }
  xform(kind) {
    const L = this.layer(); if (!L?.strokes.length) return; this.snapshot();
    const a = kind === 'rot' ? Math.PI / 12 : 0; const k = kind === 'up' ? 1.1 : kind === 'dn' ? 1 / 1.1 : 1;
    for (const s of L.strokes) {
      for (let i = 0; i < s.pts.length; i += 2) {
        let x = s.pts[i] - 0.5, y = s.pts[i + 1] - 0.5;
        if (kind === 'mx') x = -x; if (kind === 'my') y = -y;
        if (a) { const c = Math.cos(a), sn = Math.sin(a); [x, y] = [x * c - y * sn, x * sn + y * c]; }
        s.pts[i] = 0.5 + x * k; s.pts[i + 1] = 0.5 + y * k;
      }
      if (k !== 1) s.w *= k;
    }
    this.changed();
  }
  doUndo() { const u = this.undo.pop(); if (!u) return; const s = this.lib.sheets.get(u.id); if (!s) return; this.redo.push({ id: s.id, d: JSON.stringify(s.layers) }); s.layers = JSON.parse(u.d); this.select({ cls: s.cls, role: s.role, sheetId: s.id }); this.changed(); }
  doRedo() { const u = this.redo.pop(); if (!u) return; const s = this.lib.sheets.get(u.id); if (!s) return; this.undo.push({ id: s.id, d: JSON.stringify(s.layers) }); s.layers = JSON.parse(u.d); this.select({ cls: s.cls, role: s.role, sheetId: s.id }); this.changed(); }

  // ---------- лист ----------
  drawBg(g, S) {
    const r = ROLE[this.role]; let [a, b] = BG[r.bg] ?? BG.lit;
    if (this.bgMode === 'paper') a = b = '#d8e0c4'; if (this.bgMode === 'dark') a = b = '#101418';
    if (this.bgMode === 'clear') { for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) { g.fillStyle = ((x + y) / 32) % 2 ? '#3a3a3a' : '#2a2a2a'; g.fillRect(x, y, 32, 32); } return; }
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    // подсказки
    g.save(); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.setLineDash([6, 8]); g.lineWidth = 1;
    if (r.k === 'aura') { g.strokeRect(0.5, S * 0.25, S - 1, S * 0.5); g.fillStyle = 'rgba(255,255,255,0.25)'; g.font = '14px system-ui'; g.fillText('к предмету', 8, S * 0.25 - 8); g.fillText('наружу', 8, S * 0.75 + 20); }
    if (r.k === 'glint') { g.beginPath(); g.arc(S / 2, S / 2, S * 0.04, 0, 6.283); g.fillStyle = 'rgba(255,255,240,0.5)'; g.fill(); }
    if (r.k === 'shadow' || r.k === 'light' || r.k === 'fill') { g.strokeRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8); }
    g.restore();
  }
  drawPad() {
    const g = this.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    this.drawBg(g, PAD);
    const s = this.sheet();
    if (!s) { g.fillStyle = 'rgba(255,255,255,0.4)'; g.font = '20px system-ui'; g.fillText('Нет листа — «+ Новый лист» слева', 40, PAD / 2); }
    else {
      const p = this.lib.params(this.cls, this.role);
      renderSheet(g, s, PAD, { wMul: this.thick(), blur: ROLE[this.role].mask ? (p.blur ?? 0) * PAD / 256 : 0 });
    }
    this.renderPins();
  }
  renderPins() {
    const s = this.sheet(); const list = s ? this.notes.list().filter((n) => n.where === 'sheet' && n.sheet === s.id) : [];
    this.pins.replaceChildren(...list.map((n) => el('button', { class: 'pin' + (n.status === 'done' ? ' done' : '') + (n.reply ? ' replied' : ''), style: `left:${n.p[0] * 100}%;top:${n.p[1] * 100}%`, title: n.text, onclick: () => this.notes.open(n.id) }, String(n.num ?? '•'))));
  }
  bindPad() {
    const cv = this.ov; let cur = null; let last = null; let lastT = 0; let sm = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    const press = (e, d) => {
      if (e.pointerType === 'pen' && e.pressure > 0) return e.pressure;
      // мышь: нажим от скорости (быстро — тоньше), как живая рука
      const sp = d ?? 0; return Math.max(0.25, Math.min(1, 0.95 - sp * 25));
    };
    // живой штрих: последняя точка — сам курсор (без сглаживания), конец не сужается; перерисовка не чаще кадра
    let raw = null; let raf = 0;
    const drawNow = () => {
      raf = 0; const g = this.ov.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, PAD, PAD);
      if (!cur) return;
      const v = raw ? { ...cur, pts: [...cur.pts, raw[0], raw[1]], pr: [...cur.pr, cur.pr[cur.pr.length - 1]] } : cur;
      if (v.pts.length >= 4) { const L = this.layer(); drawStroke(g, v, PAD, L?.color ?? '#000', { wMul: this.thick(), live: true }); }
    };
    const drawCur = (now) => { if (now) { cancelAnimationFrame(raf); drawNow(); } else if (!raf) raf = requestAnimationFrame(drawNow); };
    cv.addEventListener('pointerdown', (e) => {
      // штрих гасит обычный фокус (preventDefault), поэтому фокус ставим сами — иначе Ctrl+Z уходит мимо окна
      cv.focus({ preventScroll: true }); try { window.focus(); } catch { /* нет */ }
      const s = this.sheet(); if (!s) return;
      const [x, y] = pos(e);
      if (this.noteMode) { this.notes.ask({ where: 'sheet', sheet: s.id, cls: s.cls, role: s.role, p: [x, y], label: `${CLS[s.cls].name} · ${s.name}` }); this.noteMode = false; this.noteBtn.classList.remove('on'); this.padWrap.classList.remove('noting'); return; }
      if (!this.layer()) return;
      cv.setPointerCapture(e.pointerId); e.preventDefault();
      sm = [x, y]; last = [x, y]; lastT = performance.now(); raw = null;
      cur = { pts: [+x.toFixed(4), +y.toFixed(4)], pr: [press(e, 0)], w: this.size / PAD / this.thick(), b: { ...this.brush }, sd: Math.floor(Math.random() * 1e5) };
      if (cur.b.m === undefined) delete cur.b.m;
      if (cur.b.m) { cur.m = cur.b.m; delete cur.b.m; }
      if (this.brushT === 'eraser') cur.m = 'destination-out';
      drawCur(true);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!cur) return; const evs = e.getCoalescedEvents?.() ?? [e];
      for (const ev of evs) {
        const [x, y] = pos(ev); raw = [x, y]; const k = this.smooth; sm = [sm[0] * k + x * (1 - k), sm[1] * k + y * (1 - k)];
        const d = Math.hypot(sm[0] - last[0], sm[1] - last[1]); if (d < 0.0025) continue;
        const now = performance.now(); const sp = d / Math.max(1, now - lastT) ; lastT = now; last = sm;
        cur.pts.push(+sm[0].toFixed(4), +sm[1].toFixed(4)); cur.pr.push(+press(ev, sp).toFixed(2));
      }
      drawCur();
    });
    const end = () => {
      if (!cur) return; const s = this.sheet(); const L = this.layer();
      // штрих заканчивается там, где отпустил кнопку
      if (raw) { const lx = cur.pts[cur.pts.length - 2], ly = cur.pts[cur.pts.length - 1]; if (Math.hypot(raw[0] - lx, raw[1] - ly) > 0.0005) { cur.pts.push(+raw[0].toFixed(4), +raw[1].toFixed(4)); cur.pr.push(cur.pr[cur.pr.length - 1]); } }
      raw = null;
      if (s && L && cur.pts.length >= 2) { this.snapshot(); if (cur.pts.length === 2) { cur.pts.push(cur.pts[0] + 0.001, cur.pts[1] + 0.001); cur.pr.push(cur.pr[0]); } L.strokes.push(cur); }
      cur = null; drawCur(true); this.changed();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.size = Math.max(1, Math.min(120, this.size * (e.deltaY > 0 ? 0.9 : 1.1))); this.renderKnobs(); this.saveBrush(); }, { passive: false });
  }
}
