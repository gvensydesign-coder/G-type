// Библиотека почеркушек: классы, роли листов, хранение (db окна → Claude читает; без db — браузер), импорт/экспорт, атласы.
// Формат обмена «skazanie.scribbles» v1 описан в FORMAT.md рядом с окном.
import { drawStroke, drawMaskStroke } from './brushkit.js';

export const FORMAT = 'skazanie.scribbles';
export const VERSION = 1;
export const CELL = 256;          // клетка атласа, px
export const COLS = 4;            // вариантов в ряд атласа

// классы — «что рисуем»; base — средний тон предмета, aura — цвет ауры (style-kb/02-palette), donor — от кого брать почерк
export const CLASSES = [
  { k: 'metal', name: 'Металл', base: '#5d6874', aura: '#fff0c0', obj: 'pot' },
  { k: 'wood', name: 'Дерево', base: '#6b4a30', aura: '#493212', obj: 'log' },
  { k: 'stone', name: 'Камень', base: '#6c6b62', aura: '#fff0c0', obj: 'rock' },
  { k: 'earth', name: 'Земля', base: '#4c3c29', aura: '#d6e6b4', obj: 'mound' },
  { k: 'grass', name: 'Трава и мох', base: '#3f6a2b', aura: '#8cff00', obj: 'bush' },
  { k: 'hay', name: 'Сено', base: '#b08a40', aura: '#ff9500', obj: 'stack' },
  { k: 'cloth', name: 'Ткань', base: '#6a3060', aura: '#c752bd', obj: 'drape' },
  { k: 'water', name: 'Вода', base: '#2a5a66', aura: '#cfffc0', obj: 'pond' },
  { k: 'sky', name: 'Небо', base: '#2e5a52', aura: '#cfffc0', obj: 'skyball' },
  { k: 'light', name: 'Свет', base: '#ffe3a0', aura: '#ffc27a', obj: 'lamp', sprite: true },
  { k: 'fire', name: 'Огонь', base: '#ff9a40', aura: '#ffc27a', obj: 'fire', sprite: true },
  { k: 'smoke', name: 'Дым и туман', base: '#5f726c', aura: '#d6e6b4', obj: 'smoke', sprite: true },
  // по референсам ivanponivanov (подъезд, двор ночью)
  { k: 'wall', name: 'Стена, охра', base: '#dca267', aura: '#fff0c0', obj: 'wall' },
  { k: 'panel', name: 'Стена, зелёная краска', base: '#4f6350', aura: '#fff0c0', obj: 'wall' },
  { k: 'floor', name: 'Пол, мраморная крошка', base: '#7d6853', aura: '#fff0c0', obj: 'stairs' },
  { k: 'glass', name: 'Стекло окна', base: '#efe7bf', aura: '#fff0c0', obj: 'window' },
  { k: 'snow', name: 'Снег', base: '#e6edf8', aura: '#f2a03c', obj: 'snow' },
  { k: 'fur', name: 'Шерсть', base: '#4a4236', aura: '#f2a03c', obj: 'fur' },
  { k: 'skin', name: 'Кожа, лицо', base: '#e8b08a', aura: '#fff0c0', obj: 'head' },
  { k: 'other', name: 'Прочее', base: '#7a6a5a', aura: '#fff0c0', obj: 'knot' },
];
export const CLS = Object.fromEntries(CLASSES.map((c) => [c.k, c]));

// роли листа — куда ляжет рисунок на предмете. Настройки те же, что в прошлой мастерской (handmarks.js) + новые роли.
export const ROLES = [
  { k: 'shadow', name: 'Знаки в тени', color: '#d8e0c4', bg: 'shadow', hint: 'Один знак на лист: разойдётся по теневой стороне предмета. В тени знак обычно светлый.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.75], ['size', 'Размер знака, см', 3, 60, 1, 18], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 0.8], ['thick', 'Толщина линий', 0.3, 4, 0.1, 1.6]] },
  { k: 'light', name: 'Знаки на свету', color: '#0c1018', bg: 'lit', hint: 'Знаки для освещённой стороны. На свету они тёмные, как карандаш.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.6], ['size', 'Размер знака, см', 3, 60, 1, 22], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.25], ['str', 'Сила', 0, 1, 0.01, 0.6], ['thick', 'Толщина линий', 0.3, 4, 0.1, 1.6]] },
  { k: 'aura', name: 'Аура по краю', color: null, bg: 'aura', hint: 'Рисуй полосу слева направо через середину: она ляжет лентой вокруг силуэта. Верх листа — внутренний край, низ — внешний.',
    params: [['off', 'Дальность от края', 0, 4, 0.05, 1], ['dens', 'Плотность', 0.05, 1, 0.01, 0.6], ['w', 'Ширина ленты', 0.05, 0.6, 0.01, 0.3], ['bright', 'Яркость', 0.2, 2, 0.05, 1], ['rep', 'Повторов по кругу', 1, 16, 1, 6], ['thick', 'Толщина линий', 0.3, 4, 0.1, 1.4]] },
  { k: 'glint', name: 'Линии из блика', color: '#fffbe8', bg: 'glint', hint: 'Центр листа — сам блик. Рисуй линии из центра наружу.',
    params: [['size', 'Размер блика, см', 5, 120, 1, 40], ['str', 'Сила', 0, 1, 0.01, 0.9], ['thick', 'Толщина линий', 0.3, 4, 0.1, 1.4]] },
  { k: 'mask', name: 'Маска перехода тени', color: '#ffffff', bg: 'mask', mask: true, hint: 'Серый ничего не меняет. Белое отодвигает тень, чёрное притягивает. Рисунок плиткой рвёт край света и тени.',
    params: [['amp', 'Сдвиг края', 0, 1, 0.01, 0.35], ['size', 'Размер плитки, см', 5, 160, 1, 40], ['soft', 'Мягкость перехода', 0, 0.4, 0.005, 0.05], ['blur', 'Размытие', 0, 30, 1, 4]] },
  { k: 'fill', name: 'Фактура по всей форме', color: null, bg: 'lit', hint: 'Мазки, которые лежат везде (дерево волокнами, небо облаками, вода рябью). Для света, огня и дыма — кадры живого спрайта.',
    params: [['dens', 'Плотность', 0.05, 1, 0.01, 0.5], ['size', 'Размер знака, см', 3, 200, 1, 40], ['rot', 'Разброс поворота', 0, 1, 0.01, 0.15], ['str', 'Сила', 0, 1, 0.01, 0.5], ['thick', 'Толщина линий', 0.3, 4, 0.1, 1.2]] },
  { k: 'edge', name: 'Шов смешения', color: '#0c0e16', bg: 'mask', hint: 'Почеркушки, которыми рисуется граница, когда этот материал встречается с другим (окно «Смешение»).',
    params: [['w', 'Ширина шва', 0.02, 0.45, 0.01, 0.22], ['dens', 'Плотность', 0.05, 1, 0.01, 0.8], ['size', 'Размер знака, см', 3, 80, 1, 24], ['str', 'Сила', 0, 1, 0.01, 0.9]] },
];
export const ROLE = Object.fromEntries(ROLES.map((r) => [r.k, r]));
export const ROW = Object.fromEntries(ROLES.map((r, i) => [r.k, i]));

let idc = 0;
export const uid = (p = 's') => p + Date.now().toString(36) + (idc++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);
export const roleColor = (cls, role) => ROLE[role].color ?? (role === 'aura' ? CLS[cls]?.aura : role === 'fill' ? '#0c0e16' : '#ffffff');

export function newLayer(color, name) { return { id: uid('l'), name: name ?? 'Слой', color, o: 1, mode: 'source-over', vis: true, strokes: [] }; }
export function newSheet(cls, role, name) {
  return { id: uid('s'), cls, role, name: name ?? ROLE[role].name, layers: [newLayer(roleColor(cls, role), 'Штрихи')], t: Date.now() };
}
export function defaultParams(role) { return Object.fromEntries(ROLE[role].params.map((p) => [p[0], p[5]])); }

// ---------- рендер листа ----------
const layerCv = document.createElement('canvas');
/** Рисует лист в ctx (S×S, сдвиг ox,oy). opts: wMul (толщина), only (id слоя), skipHidden */
export function renderSheet(ctx, sheet, S, { ox = 0, oy = 0, wMul = 1, blur = 0 } = {}) {
  for (const L of sheet.layers) {
    if (L.vis === false || !L.strokes.length) continue;
    if (layerCv.width !== S || layerCv.height !== S) { layerCv.width = S; layerCv.height = S; }
    const g = layerCv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, S, S);
    for (const s of L.strokes) {
      if (s.val != null && !s.b) drawMaskStroke(g, s, S); else drawStroke(g, s, S, s.c ?? L.color, { wMul });
    }
    ctx.save(); ctx.globalAlpha = L.o ?? 1; ctx.globalCompositeOperation = L.mode ?? 'source-over';
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(layerCv, ox, oy); ctx.restore();
  }
}

// ---------- атлас класса: 4 варианта × 7 ролей (ROLES), клетка 256 ----------
export function bakeAtlas(lib, cls, cv) {
  const W = CELL * COLS, Hh = CELL * ROLES.length;
  cv = cv ?? document.createElement('canvas'); if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
  const g = cv.getContext('2d'); g.clearRect(0, 0, W, Hh);
  const counts = {};
  for (const r of ROLES) {
    const list = lib.sheetsOf(cls, r.k).filter((s) => !s.off).slice(0, COLS); counts[r.k] = list.length;
    const p = lib.params(cls, r.k);
    list.forEach((s, i) => {
      const ox = i * CELL, oy = ROW[r.k] * CELL;
      if (r.mask) { g.fillStyle = '#808080'; g.fillRect(ox, oy, CELL, CELL); }
      g.save(); g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();
      renderSheet(g, s, CELL, { ox, oy, wMul: p.thick ?? 1, blur: r.mask ? (p.blur ?? 0) * CELL / 256 : 0 });
      g.restore();
    });
  }
  return { canvas: cv, counts };
}

// ---------- хранение ----------
const LS = 'scribble-studio-v1';
export class Library {
  // coll/parColl/ls — где хранить (2D-библиотека: sheets/params; 3D-редактор: sheets3d/params3d)
  constructor({ coll = 'sheets', parColl = 'params', ls = LS } = {}) { this.coll = coll; this.parColl = parColl; this.ls = ls; this.sheets = new Map(); this.par = {}; this.db = null; this.dirty = new Set(); this.listeners = new Set(); this.status = 'local'; this.lastSave = 0; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(what) { for (const f of this.listeners) f(what); }
  sheetsOf(cls, role) { return [...this.sheets.values()].filter((s) => s.cls === cls && (!role || s.role === role)).sort((a, b) => (a.ord ?? a.t) - (b.ord ?? b.t)); }
  params(cls, role) { return { ...defaultParams(role), ...(this.par[cls]?.[role] ?? {}) }; }
  setParam(cls, role, k, v) { (this.par[cls] ??= {})[role] ??= {}; this.par[cls][role][k] = v; this.touch('par:' + cls); }
  add(sheet) { this.sheets.set(sheet.id, sheet); this.touch(sheet.id); return sheet; }
  remove(id) { this.sheets.delete(id); this.dirty.add('del:' + id); this.scheduleSave(); this.emit('sheets'); }
  touch(id) { this.dirty.add(id); const s = this.sheets.get(id); if (s) s.t = Date.now(); this.scheduleSave(); }
  scheduleSave() { clearTimeout(this._t); this._t = setTimeout(() => this.save(), 1200); }

  async connect() {
    try {
      const c = window.claude; const p = c?.use ? c.use('db') : null;
      this.db = p ? await Promise.race([p, new Promise((r) => setTimeout(() => r(null), 10000))]) : null;
    } catch { this.db = null; }
    this.status = this.db ? 'db' : 'local'; this.emit('status');
    return !!this.db;
  }
  async load(seedUrl) {
    let got = false;
    if (this.db) {
      try {
        const snap = await Promise.race([this.db.collection(this.coll).limit(1000).get(), new Promise((_, j) => setTimeout(() => j(new Error('timeout')), 10000))]);
        snap.forEach?.((d) => { const v = d.data(); if (v?.id) { this.sheets.set(v.id, unpack(v)); got = true; } });
        if (!snap.forEach) for (const d of snap.docs ?? []) { const v = d.data(); if (v?.id) { this.sheets.set(v.id, unpack(v)); got = true; } }
        const ps = await this.db.collection(this.parColl).get();
        for (const d of ps.docs ?? []) { const v = d.data(); if (v?.cls) this.par[v.cls] = v.p ?? {}; }
      } catch (e) { console.warn('db load', e); this.status = 'local'; this.db = null; this.emit('status'); }
    }
    if (!got) {
      try { const j = JSON.parse(localStorage.getItem(this.ls) ?? 'null'); if (j?.sheets?.length) { this.importData(j, { silent: true }); got = true; } } catch { /* нет хранилища */ }
    }
    if (!got && seedUrl) {
      try { const j = await (await fetch(seedUrl)).json(); if (j.seed) { for (const [c, d] of Object.entries(j.hand ?? {})) this.importData(d, { cls: c, silent: true }); for (const d of Object.values(j.scrib ?? {})) this.importData(d, { silent: true }); } else this.importData(j, { silent: true }); for (const id of this.sheets.keys()) this.dirty.add(id); for (const c in this.par) this.dirty.add('par:' + c); this.scheduleSave(); } catch (e) { console.warn('seed', e); }
    }
    this.emit('sheets');
  }
  async save() {
    const ids = [...this.dirty]; this.dirty.clear(); if (!ids.length) return;
    try { localStorage.setItem(this.ls, JSON.stringify(this.exportData())); } catch { /* переполнено — не страшно */ }
    if (!this.db) { this.lastSave = Date.now(); this.emit('saved'); return; }
    this.emit('saving');
    for (const id of ids) {
      try {
        if (id.startsWith('del:')) await this.db.doc(this.coll + '/' + id.slice(4)).delete();
        else if (id.startsWith('par:')) { const c = id.slice(4); await this.db.doc(this.parColl + '/' + c).set({ cls: c, p: this.par[c] ?? {} }); }
        else { const s = this.sheets.get(id); if (s) await this.db.doc(this.coll + '/' + id).set(pack(s)); }
      } catch (e) { console.warn('save', id, e); this.dirty.add(id); this.emit('error'); }
    }
    this.lastSave = Date.now(); this.emit('saved');
    if (this.dirty.size) this.scheduleSave();
  }

  exportData(filter) {
    const sheets = [...this.sheets.values()].filter((s) => !filter || filter(s)).map(pack);
    return { format: FORMAT, version: VERSION, saved: new Date().toISOString(), cell: CELL, cols: COLS, roles: ROLES.map((r) => r.k), classes: CLASSES.map((c) => ({ k: c.k, name: c.name, base: c.base, aura: c.aura })), params: this.par, sheets };
  }
  // принимает: наш формат; hand-library ({layers:{role:{vars,color,p}}}, нужен cls); scribbles/<класс>.json ({cls, slots})
  importData(j, { cls, silent } = {}) {
    let n = 0;
    if (j?.format === FORMAT) {
      for (const s of j.sheets ?? []) { const u = unpack(s); this.sheets.set(u.id, u); this.dirty.add(u.id); n++; }
      for (const c in j.params ?? {}) { this.par[c] = { ...(this.par[c] ?? {}), ...j.params[c] }; this.dirty.add('par:' + c); }
    } else if (j?.layers && cls) {
      for (const [role, L] of Object.entries(j.layers)) {
        if (!ROLE[role]) continue;
        if (L.p) { (this.par[cls] ??= {})[role] = { ...L.p }; this.dirty.add('par:' + cls); }
        (L.vars ?? []).forEach((v, i) => {
          if (!v?.length) return;
          const sh = newSheet(cls, role, `${ROLE[role].name} ${i + 1}`); sh.ord = i; sh.src = 'hand-library';
          if (role === 'mask') {
            const white = newLayer('#ffffff', 'Белое (свет)'), black = newLayer('#000000', 'Чёрное (тень)');
            for (const s of v) (s.val ? white : black).strokes.push({ ...s });
            sh.layers = [black, white].filter((l) => l.strokes.length);
          } else { sh.layers[0].color = L.color ?? roleColor(cls, role); sh.layers[0].strokes = v.map((s) => ({ ...s })); }
          this.sheets.set(sh.id, sh); this.dirty.add(sh.id); n++;
        });
      }
    } else if (j?.slots) {
      const map = SCRIB_MAP[j.cls] ?? ['other', 'fill'];
      Object.entries(j.slots).forEach(([k, v], i) => {
        if (!v?.s?.length) return;
        const sh = newSheet(map[0], map[1], `${SCRIB_NAME[j.cls] ?? j.cls} ${k}`); sh.ord = 100 + i; sh.src = 'scribbles/' + j.cls;
        sh.layers[0].strokes = v.s.map((a) => { const w = a[0]; const pts = [], pr = []; for (let q = 1; q + 2 < a.length; q += 3) { pts.push(a[q], a[q + 1]); pr.push(a[q + 2] ?? 0.6); } return { w, pts, pr, b: v.b ?? undefined }; });
        this.sheets.set(sh.id, sh); this.dirty.add(sh.id); n++;
      });
    }
    if (!silent) { this.scheduleSave(); this.emit('sheets'); }
    return n;
  }
}
// куда ложатся классы эффектов из прошлого раздела «Почеркушки»
const SCRIB_MAP = { light: ['light', 'light'], glow: ['light', 'fill'], smoke: ['smoke', 'fill'], splash: ['water', 'fill'], fx: ['fire', 'fill'], hatch: ['other', 'shadow'], outline: ['other', 'edge'], env: ['sky', 'fill'], brush: ['earth', 'fill'], aura: ['other', 'aura'], runes: ['other', 'light'], fire: ['fire', 'fill'], water: ['water', 'fill'] };
const SCRIB_NAME = { light: 'Линии света', glow: 'Свечение', smoke: 'Дым', splash: 'Брызги', fx: 'Искры, пыль', hatch: 'Штрих в тени', outline: 'Контур', env: 'Наброски окружения', brush: 'Мазки кисти', aura: 'Линии ауры', runes: 'Знаки круга', fire: 'Огонь', water: 'Вода' };

// упаковка: координаты до 4 знаков (меньше места в db, 256 КиБ на документ)
const r4 = (x) => Math.round(x * 1e4) / 1e4;
function pack(s) {
  return { id: s.id, cls: s.cls, role: s.role, name: s.name, t: s.t ?? 0, ord: s.ord ?? null, off: !!s.off, src: s.src ?? null,
    layers: s.layers.map((L) => ({ id: L.id, name: L.name, color: L.color, o: L.o ?? 1, mode: L.mode ?? 'source-over', vis: L.vis !== false,
      strokes: L.strokes.map((k) => { const o = { pts: k.pts.map(r4), w: r4(k.w) }; if (k.pr) o.pr = k.pr.map((x) => Math.round(x * 100) / 100); if (k.b) o.b = k.b; if (k.sd != null) o.sd = k.sd; if (k.c) o.c = k.c; if (k.m) o.m = k.m; if (k.val != null) { o.val = k.val; o.a = k.a; } if (k.gen) o.gen = 1; if (k.id) o.id = k.id; if (k.ns) o.ns = k.ns.map((x) => Math.round(x * 1000) / 1000); if (k.face) o.face = k.face; if (k.live) o.live = k.live; return o; }) })) };
}
function unpack(v) { const s = JSON.parse(JSON.stringify(v)); s.layers ??= []; for (const L of s.layers) { L.strokes ??= []; L.vis = L.vis !== false; } if (s.ord === null) delete s.ord; return s; }
export { pack };
