// Мастерская знаков: Michael рисует свои каракули по материалам и слоям, предметы в сцене обновляются сразу.
// Рисунки хранятся векторно (линии точками 0..1) в db: marks/<материал>, без db — в браузере.
import * as THREE from 'three';
import { handU, LINE_AURAS } from './matfx.js';
import { BRUSHES, renderStroke } from './brushes.js';

// кисти мастерской: тип из brushes.js (свой рисунок ворса, зерна, нажима), у штриха b = { t, o, pr, tp, an }
const PEN_LIST = ['marker', 'pen', 'ink', 'nib', 'pencil', 'brush', 'dry', 'speck', 'scratch', 'hatch'];
// один штрих на холст: точки 0..1 (pts), нажим pr[], толщина w (доля клетки)
function strokeTo(g, s, S, ox, oy, color, wMul = 1) {
  const p = s.pts; const n = p.length / 2;
  if (s.b && n >= 2) {
    const P = []; for (let i = 0; i < n; i++) P.push([ox + p[i * 2] * S, oy + p[i * 2 + 1] * S, s.pr?.[i] ?? 0.6]);
    renderStroke(g, P, Math.max(1, s.w * S * wMul), s.b, color, { minW: 0.8 }); return;
  }
  g.strokeStyle = color; g.fillStyle = color; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(1, s.w * S * wMul);
  if (n === 1) { g.beginPath(); g.arc(ox + p[0] * S, oy + p[1] * S, g.lineWidth / 2, 0, 6.283); g.fill(); return; }
  g.beginPath(); g.moveTo(ox + p[0] * S, oy + p[1] * S); for (let i = 1; i < n; i++) g.lineTo(ox + p[i * 2] * S, oy + p[i * 2 + 1] * S); g.stroke();
}

export const MATS = [
  { k: 'stone', name: 'Камень' }, { k: 'wood', name: 'Дерево' }, { k: 'hay', name: 'Сено' }, { k: 'moss', name: 'Мох и трава' },
  { k: 'metal', name: 'Железо' }, { k: 'cloth', name: 'Ткань' }, { k: 'water', name: 'Вода' },
];
// слой: ряд в атласе, подсказка, настройки
const LAYERS = [
  { k: 'shadow', row: 0, name: 'Знаки в тени', hint: 'Рисуй один знак на клетку: он разойдётся по теневой стороне предмета. В тени знак светлый, если не задан свой цвет.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.75], ['size', 'Размер знака, см', 3, 40, 1, 8], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 1], ['thick', 'Толщина линии', 0.5, 4, 0.1, 2]] },
  { k: 'light', row: 1, name: 'Знаки на свету', hint: 'Знаки для освещённой стороны. На свету они тёмные, как карандаш, если не задан свой цвет.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.7], ['size', 'Размер знака, см', 3, 40, 1, 8], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 1], ['thick', 'Толщина линии', 0.5, 4, 0.1, 2]] },
  { k: 'aura', row: 2, name: 'Аура по краю', hint: 'Цвет, дальность, плотность и ширина работают и для моей ауры, и для твоей. Свой рисунок: рисуй полосу слева направо через середину, она ляжет лентой вокруг предмета. Верх и низ клетки — внутренняя и внешняя граница ленты.',
    params: [['off', 'Дальность от края', 0, 4, 0.05, 1], ['dens', 'Плотность', 0.05, 1, 0.01, 0.6], ['w', 'Ширина ленты', 0.05, 0.6, 0.01, 0.3], ['bright', 'Яркость', 0.2, 2, 0.05, 1], ['rep', 'Повторов рисунка по кругу', 1, 16, 1, 6], ['thick', 'Толщина линии', 0.5, 4, 0.1, 1.6]] },
  { k: 'glint', row: 3, name: 'Линии из блика', hint: 'Центр клетки — сам блик. Рисуй кривые линии, выходящие из центра наружу; за край клетки они ведут за силуэт предмета.',
    params: [['thick', 'Толщина линии', 0.5, 4, 0.1, 1.4]] },
  { k: 'mask', row: -1, name: 'Маска перехода тени', mask: true, hint: 'Серый фон ничего не меняет. Белая кисть отодвигает тень (там светлее), чёрная притягивает тень. Рисунок повторяется плиткой по предмету и рвёт или сглаживает край света и тени. Мягкость задаёт ширину перехода.',
    params: [['amp', 'Сдвиг края', 0, 1, 0.01, 0.35], ['size', 'Размер плитки, см', 5, 120, 1, 30], ['soft', 'Мягкость перехода', 0, 0.4, 0.005, 0.05], ['blur', 'Размытие кисти', 0, 30, 1, 6]] },
];
const LAYERS_FOR = (k) => k === 'water' ? ['glint'] : k === 'metal' ? ['shadow', 'light', 'aura', 'glint', 'mask'] : ['shadow', 'light', 'aura', 'mask'];
const NV = 4, CELL = 256;

function blank() {
  const L = {}; for (const ly of LAYERS) L[ly.k] = { vars: [[], [], [], []], p: Object.fromEntries(ly.params.map(([k, , , , , d]) => [k, d])), color: null };
  return { layers: L };
}

export class HandMarks {
  constructor({ onView, toast }) {
    this.onView = onView; this.toast = toast ?? (() => {});
    this.data = {}; this.tex = {}; this.db = null; this.dirty = new Set();
    for (const m of MATS) this.data[m.k] = blank();
    this.cur = { mat: 'stone', layer: 'shadow', v: 0 };
    this.history = [];
  }
  async load() {
    try {
      const claude = window.claude; this.db = claude?.use ? await Promise.race([claude.use('db'), new Promise((r) => setTimeout(() => r(null), 6000))]) : null;
    } catch { this.db = null; }
    for (const m of MATS) {
      let d = null;
      if (this.db) { try { const s = await Promise.race([this.db.doc('marks/' + m.k).get(), new Promise((r) => setTimeout(() => r(null), 6000))]); if (s?.exists) d = s.data(); } catch { d = null; } }
      if (!d) { try { const s = localStorage.getItem('hm_' + m.k); if (s) d = JSON.parse(s); } catch { d = null; } }
      if (d?.layers) { const b = blank(); for (const k in b.layers) if (d.layers[k]) { b.layers[k].vars = (d.layers[k].vars ?? b.layers[k].vars).slice(0, NV); while (b.layers[k].vars.length < NV) b.layers[k].vars.push([]); Object.assign(b.layers[k].p, d.layers[k].p ?? {}); b.layers[k].color = d.layers[k].color ?? null; } this.data[m.k] = b; }
      this.apply(m.k);
    }
  }
  // ------------------------------------------------ атлас и uniforms
  atlas(kind) {
    let t = this.tex[kind];
    if (!t) { const c = document.createElement('canvas'); c.width = NV * CELL; c.height = 4 * CELL; t = this.tex[kind] = new THREE.CanvasTexture(c); t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; }
    const c = t.image; const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const ly of LAYERS) {
      if (ly.mask) continue;
      const L = this.data[kind].layers[ly.k]; const th = L.p.thick ?? 1.5;
      L.vars.filter((st) => st.length).forEach((strokes, v) => {
        g.save(); g.beginPath(); g.rect(v * CELL, ly.row * CELL, CELL, CELL); g.clip();
        for (const s of strokes) if (s.pts.length >= 2) strokeTo(g, s, CELL, v * CELL, ly.row * CELL, '#ffffff', th);
        g.restore();
      });
    }
    t.needsUpdate = true; return t;
  }
  apply(kind) {
    const H = handU(kind); const L = this.data[kind].layers;
    const n = (k) => L[k].vars.filter((s) => s.length).length;
    // в атлас идут только непустые варианты (подряд), сами ячейки в данных не двигаются
    H.uMk.value = this.atlas(kind);
    H.uMkN.value.set(n('shadow'), n('light'), n('aura'), n('glint'));
    const sp = (p) => new THREE.Vector4(p.dens, 100 / p.size, p.rot, p.str);
    H.uMkS.value.copy(sp(L.shadow.p)); H.uMkL.value.copy(sp(L.light.p));
    const cl = (c) => { if (!c) return new THREE.Vector4(); const q = new THREE.Color(c); return new THREE.Vector4(q.r, q.g, q.b, 1); };
    H.uMkCS.value.copy(cl(L.shadow.color)); H.uMkCL.value.copy(cl(L.light.color));
    const a = L.aura.p; H.uMkA.value.set(a.w, a.off, a.rep, 1);
    for (const U of LINE_AURAS) if (U.kind === kind) {
      U.uOff.value = U.off0 * a.off; U.uW.value = U.w0 * a.w / 0.3; U.bright = a.bright;
      U.uDash.value = Math.min(0.95, Math.max(0, U.dash0 + (0.6 - a.dens) * 1.1)); U.uSkip.value = 1 - a.dens;
      U.uCol.value.set(L.aura.color ?? U.col0);
    }
    const M = L.mask; const mOn = M.vars[0].length > 0;
    if (mOn) H.uMkMask.value = this.maskTex(kind);
    H.uMkM.value.set(mOn ? 1 : 0, 100 / M.p.size, M.p.amp, M.p.soft);
  }
  maskTex(kind) {
    let t = this.mtex?.[kind]; this.mtex ??= {};
    if (!t) { const c = document.createElement('canvas'); c.width = c.height = 256; t = this.mtex[kind] = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; }
    this.paintMask(t.image, this.data[kind].layers.mask, 256); t.needsUpdate = true; return t;
  }
  // маска: серый фон, мазки белым/чёрным с размытием; рисуется 3×3, чтобы плитка стыковалась без шва
  paintMask(cv, M, S, guides) {
    const g = cv.getContext('2d'); g.save(); g.filter = 'none'; g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    g.filter = M.p.blur > 0 ? `blur(${M.p.blur * S / 256}px)` : 'none'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of M.vars[0]) {
      const col = s.val ? '#ffffff' : '#000000'; g.globalAlpha = s.a ?? 1;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) strokeTo(g, s, S, ox * S, oy * S, col);
    }
    g.restore();
    if (guides) { g.strokeStyle = 'rgba(255,138,60,.35)'; g.setLineDash([6, 6]); g.strokeRect(0.5, 0.5, S - 1, S - 1); g.setLineDash([]); }
  }
  async save() {
    const out = []; let ok = true;
    for (const k of this.dirty) {
      const d = this.data[k];
      try { localStorage.setItem('hm_' + k, JSON.stringify(d)); } catch { /* браузер не дал */ }
      if (this.db) { try { await this.db.doc('marks/' + k).set(d); out.push(k); } catch { ok = false; } }
    }
    this.dirty.clear(); this.renderSaved(ok);
    return ok;
  }
  // ------------------------------------------------ интерфейс
  mount(root) {
    this.root = root;
    root.innerHTML = `
      <div class="hm-head"><b>Мои каракули</b><button id="hmClose">Готово</button></div>
      <div class="hm-mats" id="hmMats"></div>
      <div class="hm-layers" id="hmLayers"></div>
      <p class="hm-hint" id="hmHint"></p>
      <div class="hm-vars" id="hmVars"></div>
      <div class="hm-pad"><canvas id="hmPad" width="512" height="512"></canvas></div>
      <div class="row hm-tools">
        <div class="hm-pens" id="hmPens"></div><p class="hm-hint" id="hmPenHint"></p>
        <label class="hm-sl">Размер <input id="hmBrush" type="range" min="2" max="40" step="1" value="9"></label>
        <label class="hm-sl">Нажим мыши <input id="hmPress" type="range" min="0.1" max="1" step="0.05" value="0.7"></label>
        <span id="hmMaskPen" class="row" hidden><button data-val="1" class="on">Белая: светлее</button><button data-val="0">Чёрная: темнее</button><label class="hm-sl">Нажим <input id="hmAlpha" type="range" min="0.1" max="1" step="0.05" value="0.6"></label></span>
        <button id="hmErase">Ластик</button><button id="hmUndo">Отменить</button><button id="hmClear">Стереть вариант</button>
      </div>
      <div class="hm-params" id="hmParams"></div>
      <div class="row hm-color"><label class="ck"><input type="checkbox" id="hmColOn"> Свой цвет</label><input type="color" id="hmCol" value="#f0e0b0"></div>
      <div class="row hm-save"><button id="hmSave" class="aura">Сохранить</button><button id="hmReset">Вернуть каракули Claude</button></div>
      <p class="hm-hint" id="hmSaved"></p>`;
    const $ = (s) => root.querySelector(s);
    for (const m of MATS) { const b = document.createElement('button'); b.textContent = m.name; b.dataset.k = m.k; b.onclick = () => this.select({ mat: m.k }); $('#hmMats').appendChild(b); }
    $('#hmClose').onclick = () => this.close();
    $('#hmSave').onclick = () => this.save();
    $('#hmReset').onclick = () => {
      const L = this.data[this.cur.mat].layers[this.cur.layer]; L.vars = [[], [], [], []]; L.color = null;
      this.changed(); this.renderAll();
    };
    $('#hmUndo').onclick = () => { const h = this.history.pop(); if (!h) return; const L = this.layer(); L.vars[h.v] = h.prev; this.changed(); this.renderAll(); };
    $('#hmClear').onclick = () => { const L = this.layer(); this.history.push({ v: this.cur.v, prev: L.vars[this.cur.v].slice() }); L.vars[this.cur.v] = []; this.changed(); this.renderAll(); };
    this.maskVal = 1; this.pen = 'ink';
    for (const t of PEN_LIST) { const b = document.createElement('button'); b.textContent = BRUSHES[t].name; b.title = BRUSHES[t].hint; b.dataset.t = t; b.onclick = () => { this.pen = t; $('#hmBrush').value = Math.min(40, BRUSHES[t].size + 3); this.renderPens(); }; $('#hmPens').appendChild(b); }
    this.renderPens();
    root.querySelectorAll('#hmMaskPen button').forEach((b) => { b.onclick = () => { this.maskVal = +b.dataset.val; root.querySelectorAll('#hmMaskPen button').forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('#hmErase').onclick = (e) => { this.erase = !this.erase; e.target.classList.toggle('on', this.erase); };
    $('#hmColOn').onchange = () => { this.layer().color = $('#hmColOn').checked ? $('#hmCol').value : null; this.changed(); };
    $('#hmCol').oninput = () => { if ($('#hmColOn').checked) { this.layer().color = $('#hmCol').value; this.changed(); } };
    this.pad = $('#hmPad'); this.bindPad();
    this.select({});
  }
  layer() { return this.data[this.cur.mat].layers[this.cur.layer]; }
  renderPens() { this.root.querySelectorAll('#hmPens button').forEach((b) => b.classList.toggle('on', b.dataset.t === this.pen)); const h = this.root.querySelector('#hmPenHint'); if (h) h.textContent = BRUSHES[this.pen].hint; }
  changed(full = true) { this.dirty.add(this.cur.mat); if (full) this.apply(this.cur.mat); this.renderSaved(null); }
  renderSaved(ok) {
    const el = this.root?.querySelector('#hmSaved'); if (!el) return;
    if (ok === null) el.textContent = this.dirty.size ? 'Есть несохранённые изменения.' : '';
    else el.textContent = ok ? (this.db ? 'Сохранено. Рисунки увидят все, кто откроет окно, и я смогу перенести их в игру.' : 'Сохранено в этом браузере (общее хранилище недоступно).') : 'Не удалось сохранить в общее хранилище, копия осталась в браузере.';
  }
  select({ mat, layer, v }) {
    if (mat) { this.cur.mat = mat; if (!LAYERS_FOR(mat).includes(this.cur.layer)) this.cur.layer = LAYERS_FOR(mat)[0]; this.onView?.(mat); }
    if (layer) this.cur.layer = layer;
    if (v != null) this.cur.v = v;
    this.history = this.history.filter((h) => h.v === this.cur.v);
    this.renderAll();
  }
  renderAll() {
    const $ = (s) => this.root.querySelector(s);
    $('#hmMats').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === this.cur.mat));
    const ly = $('#hmLayers'); ly.innerHTML = '';
    for (const k of LAYERS_FOR(this.cur.mat)) { const d = LAYERS.find((x) => x.k === k); const b = document.createElement('button'); b.textContent = d.name; b.classList.toggle('on', k === this.cur.layer); b.onclick = () => this.select({ layer: k }); ly.appendChild(b); }
    const D = LAYERS.find((x) => x.k === this.cur.layer); const L = this.layer();
    $('#hmHint').textContent = D.hint;
    const vs = $('#hmVars'); vs.innerHTML = ''; vs.hidden = !!D.mask; $('#hmMaskPen').hidden = !D.mask; if (D.mask) this.cur.v = 0;
    for (let i = 0; i < NV; i++) {
      const c = document.createElement('canvas'); c.width = c.height = 72; c.className = 'hm-thumb' + (i === this.cur.v ? ' on' : '');
      c.title = 'Вариант ' + (i + 1); c.onclick = () => this.select({ v: i }); this.drawStrokes(c, L.vars[i], 72, false); vs.appendChild(c);
    }
    const pp = $('#hmParams'); pp.innerHTML = '';
    for (const [k, name, mn, mx, st] of D.params) {
      const row = document.createElement('label'); row.className = 'hm-sl';
      row.innerHTML = `<span>${name}</span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${L.p[k]}"><output>${L.p[k]}</output>`;
      const inp = row.querySelector('input'); inp.oninput = () => { L.p[k] = +inp.value; row.querySelector('output').value = inp.value; this.changed(); };
      pp.appendChild(row);
    }
    const colRow = $('.hm-color'); colRow.hidden = !(this.cur.layer === 'shadow' || this.cur.layer === 'light' || this.cur.layer === 'aura'); colRow.querySelector('label').lastChild.textContent = this.cur.layer === 'aura' ? ' Свой цвет ауры' : ' Свой цвет';
    $('#hmColOn').checked = !!L.color; if (L.color) $('#hmCol').value = L.color;
    this.drawPad();
  }
  drawStrokes(cv, strokes, S, guides) {
    const g = cv.getContext('2d'); g.clearRect(0, 0, S, S); g.fillStyle = '#231a15'; g.fillRect(0, 0, S, S);
    if (guides) {
      g.strokeStyle = 'rgba(234,223,198,.18)'; g.lineWidth = 1; g.setLineDash([6, 6]);
      if (this.cur.layer === 'aura') { g.strokeRect(0.5, S * 0.25, S - 1, S * 0.5); }
      else if (this.cur.layer === 'glint') { g.beginPath(); g.arc(S / 2, S / 2, S * 0.1, 0, 6.283); g.stroke(); }
      else { g.beginPath(); g.arc(S / 2, S / 2, S * 0.45, 0, 6.283); g.stroke(); }
      g.setLineDash([]);
    }
    const th = this.layer().p.thick ?? 1.5;
    for (const s of strokes) if (s.pts.length >= 2) strokeTo(g, s, S, 0, 0, '#f2e6c8', guides ? 1 : th);
  }
  drawPad() { if (LAYERS.find((x) => x.k === this.cur.layer).mask) this.paintMask(this.pad, this.layer(), this.pad.width, true); else this.drawStrokes(this.pad, this.layer().vars[this.cur.v], this.pad.width, true); }
  bindPad() {
    const pad = this.pad; let cur = null;
    const pos = (e) => { const r = pad.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    pad.onpointerdown = (e) => {
      pad.setPointerCapture(e.pointerId); const L = this.layer(); const [x, y] = pos(e);
      this.history.push({ v: this.cur.v, prev: L.vars[this.cur.v].slice() }); if (this.history.length > 40) this.history.shift();
      if (this.erase) { cur = { erase: true }; this.eraseAt(x, y); return; }
      const B = BRUSHES[this.pen];
      cur = { w: +this.root.querySelector('#hmBrush').value / 512, pts: [+x.toFixed(4), +y.toFixed(4)], pr: [this.press(e, null)], b: { t: this.pen, o: B.o, pr: B.pr, tp: B.tp, ...(B.an != null ? { an: B.an } : {}) } };
      cur.t0 = performance.now();
      if (this.cur.layer === 'mask') { cur.val = this.maskVal; cur.a = +this.root.querySelector('#hmAlpha').value; cur.w *= 3; }
      L.vars[this.cur.v].push(cur); this.drawPad();
    };
    pad.onpointermove = (e) => {
      if (!cur) return; const [x, y] = pos(e);
      if (cur.erase) { this.eraseAt(x, y); return; }
      const n = cur.pts.length; if (Math.hypot(x - cur.pts[n - 2], y - cur.pts[n - 1]) < 0.006) return;
      cur.pts.push(+x.toFixed(4), +y.toFixed(4)); cur.pr.push(this.press(e, cur)); this.drawPad();
    };
    const end = () => { if (!cur) return; delete cur.t0; delete cur.lt; cur = null; this.changed(); this.renderAll(); };
    pad.onpointerup = end; pad.onpointercancel = end;
  }
  // нажим: перо/планшет дают свой, у мыши — ползунок «Нажим мыши» и скорость (быстрее — тоньше)
  press(e, cur) {
    if (e.pointerType === 'pen' && e.pressure > 0) return +e.pressure.toFixed(2);
    const base = +this.root.querySelector('#hmPress').value; if (!cur) return base;
    const now = performance.now(); const n = cur.pts.length; const d = Math.hypot(cur.pts[n - 2] - cur.pts[n - 4], cur.pts[n - 1] - cur.pts[n - 3]) || 0;
    const dt = Math.max(4, now - (cur.lt ?? cur.t0)); cur.lt = now; const sp = d / dt * 1000;
    const prev = cur.pr[cur.pr.length - 1] ?? base; const v = Math.max(0.15, Math.min(1, base * (1.25 - Math.min(0.8, sp * 0.35))));
    return +(prev * 0.6 + v * 0.4).toFixed(2);
  }
  eraseAt(x, y) {
    const L = this.layer(); const r = 0.035;
    L.vars[this.cur.v] = L.vars[this.cur.v].filter((s) => { for (let i = 0; i < s.pts.length; i += 2) if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < r) return false; return true; });
    this.drawPad();
  }
  open() { this.root.hidden = false; document.body.classList.add('drawing'); this.select({ mat: this.cur.mat }); }
  close() { this.root.hidden = true; document.body.classList.remove('drawing'); this.onClose?.(); }
}
