// Мастерская знаков: Michael рисует свои каракули по материалам и слоям, предметы в сцене обновляются сразу.
// Рисунки хранятся векторно (линии точками 0..1) в db: marks/<материал>, без db — в браузере.
import * as THREE from 'three';
import { handU, LINE_AURAS } from './matfx.js';

export const MATS = [
  { k: 'stone', name: 'Камень' }, { k: 'wood', name: 'Дерево' }, { k: 'hay', name: 'Сено' }, { k: 'moss', name: 'Мох и трава' },
  { k: 'metal', name: 'Железо' }, { k: 'cloth', name: 'Ткань' }, { k: 'water', name: 'Вода' },
];
// слой: ряд в атласе, подсказка, настройки
const LAYERS = [
  { k: 'shadow', row: 0, name: 'Знаки в тени', hint: 'Рисуй один знак на клетку: он разойдётся по теневой стороне предмета. В тени знак светлый, если не задан свой цвет.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.5], ['size', 'Размер знака, см', 3, 40, 1, 12], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 1], ['thick', 'Толщина линии', 0.5, 4, 0.1, 1.6]] },
  { k: 'light', row: 1, name: 'Знаки на свету', hint: 'Знаки для освещённой стороны. На свету они тёмные, как карандаш, если не задан свой цвет.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.4], ['size', 'Размер знака, см', 3, 40, 1, 12], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 1], ['thick', 'Толщина линии', 0.5, 4, 0.1, 1.6]] },
  { k: 'aura', row: 2, name: 'Аура по краю', hint: 'Рисуй полосу слева направо через середину: она ляжет лентой вокруг предмета с зазором от силуэта. Края полосы — внутренняя и внешняя граница ленты.',
    params: [['w', 'Ширина ленты', 0.05, 0.45, 0.01, 0.2], ['off', 'Отрыв от края', 0, 3, 0.05, 1], ['rep', 'Повторов по кругу', 1, 16, 1, 6], ['str', 'Сила', 0.3, 1.5, 0.01, 1], ['thick', 'Толщина линии', 0.5, 4, 0.1, 1.4]] },
  { k: 'glint', row: 3, name: 'Линии из блика', hint: 'Центр клетки — сам блик. Рисуй кривые линии, выходящие из центра наружу; за край клетки они ведут за силуэт предмета.',
    params: [['thick', 'Толщина линии', 0.5, 4, 0.1, 1.4]] },
];
const LAYERS_FOR = (k) => k === 'water' ? ['glint'] : k === 'metal' ? ['shadow', 'light', 'aura', 'glint'] : ['shadow', 'light', 'aura'];
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
      const L = this.data[kind].layers[ly.k]; const th = L.p.thick ?? 1.5;
      L.vars.filter((st) => st.length).forEach((strokes, v) => {
        for (const s of strokes) {
          const pts = s.pts; if (pts.length < 2) continue;
          g.lineWidth = Math.max(1.5, s.w * CELL * th);
          const X = (i) => v * CELL + pts[i] * CELL, Y = (i) => ly.row * CELL + pts[i + 1] * CELL;
          if (pts.length === 2) { g.beginPath(); g.arc(X(0), Y(0), g.lineWidth / 2, 0, 6.283); g.fill(); continue; }
          g.beginPath(); g.moveTo(X(0), Y(0)); for (let i = 2; i < pts.length; i += 2) g.lineTo(X(i), Y(i)); g.stroke();
        }
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
    const a = L.aura.p; H.uMkA.value.set(a.w, a.off, a.rep, 1 / Math.max(0.3, a.str) * 0.45 / 0.45);
    for (const U of LINE_AURAS) if (U.kind === kind) U.uOff.value = U.off0 * a.off;
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
        <label class="hm-sl">Кисть <input id="hmBrush" type="range" min="2" max="28" step="1" value="9"></label>
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
    $('#hmErase').onclick = (e) => { this.erase = !this.erase; e.target.classList.toggle('on', this.erase); };
    $('#hmColOn').onchange = () => { this.layer().color = $('#hmColOn').checked ? $('#hmCol').value : null; this.changed(); };
    $('#hmCol').oninput = () => { if ($('#hmColOn').checked) { this.layer().color = $('#hmCol').value; this.changed(); } };
    this.pad = $('#hmPad'); this.bindPad();
    this.select({});
  }
  layer() { return this.data[this.cur.mat].layers[this.cur.layer]; }
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
    const vs = $('#hmVars'); vs.innerHTML = '';
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
    const colRow = $('.hm-color'); colRow.hidden = !(this.cur.layer === 'shadow' || this.cur.layer === 'light');
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
    g.strokeStyle = '#f2e6c8'; g.fillStyle = '#f2e6c8'; g.lineCap = 'round'; g.lineJoin = 'round';
    const th = this.layer().p.thick ?? 1.5;
    for (const s of strokes) {
      const p = s.pts; g.lineWidth = Math.max(1, s.w * S * (guides ? 1 : th));
      if (p.length === 2) { g.beginPath(); g.arc(p[0] * S, p[1] * S, g.lineWidth / 2, 0, 6.283); g.fill(); continue; }
      g.beginPath(); g.moveTo(p[0] * S, p[1] * S); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] * S, p[i + 1] * S); g.stroke();
    }
  }
  drawPad() { this.drawStrokes(this.pad, this.layer().vars[this.cur.v], this.pad.width, true); }
  bindPad() {
    const pad = this.pad; let cur = null;
    const pos = (e) => { const r = pad.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
    pad.onpointerdown = (e) => {
      pad.setPointerCapture(e.pointerId); const L = this.layer(); const [x, y] = pos(e);
      this.history.push({ v: this.cur.v, prev: L.vars[this.cur.v].slice() }); if (this.history.length > 40) this.history.shift();
      if (this.erase) { cur = { erase: true }; this.eraseAt(x, y); return; }
      cur = { w: +this.root.querySelector('#hmBrush').value / 512, pts: [+x.toFixed(4), +y.toFixed(4)] }; L.vars[this.cur.v].push(cur); this.drawPad();
    };
    pad.onpointermove = (e) => {
      if (!cur) return; const [x, y] = pos(e);
      if (cur.erase) { this.eraseAt(x, y); return; }
      const n = cur.pts.length; if (Math.hypot(x - cur.pts[n - 2], y - cur.pts[n - 1]) < 0.006) return;
      cur.pts.push(+x.toFixed(4), +y.toFixed(4)); this.drawPad();
    };
    const end = () => { if (!cur) return; cur = null; this.changed(); this.renderAll(); };
    pad.onpointerup = end; pad.onpointercancel = end;
  }
  eraseAt(x, y) {
    const L = this.layer(); const r = 0.035;
    L.vars[this.cur.v] = L.vars[this.cur.v].filter((s) => { for (let i = 0; i < s.pts.length; i += 2) if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - y) < r) return false; return true; });
    this.drawPad();
  }
  open() { this.root.hidden = false; document.body.classList.add('drawing'); this.select({ mat: this.cur.mat }); }
  close() { this.root.hidden = true; document.body.classList.remove('drawing'); this.onClose?.(); }
}
