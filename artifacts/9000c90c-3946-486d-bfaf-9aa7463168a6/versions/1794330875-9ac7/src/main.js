// Сборка окна: библиотека → редактор, 3D-превью, смешение, обмен; замечания и «Передать Claude».
import { Library, CLASSES, CLS, ROLES, ROLE, bakeAtlas, FORMAT, VERSION, CELL, COLS } from './library.js';
import { Editor } from './editor.js';
import { Notes } from './notes.js';
import { Atlases, shared } from './scribmat.js';
import { Preview, TIMES, STYLES } from './preview3d.js';
import { refSheets, REF_PARAMS, REF_KEEP, REF_SRC, REF_VER } from './refmats.js';
import { Blend, PAIRS } from './blend.js';

const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v != null) e.setAttribute(k, v); } for (const k of kids) e.append(k); return e; };
const toast = (t) => { const d = $('#toast'); d.textContent = t; d.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { d.style.display = 'none'; }, 3500); };

const lib = new Library();
const atl = new Atlases(lib);
let preview = null, blend = null, tab = 'Ed';
const notes = new Notes(lib, { onJump: jump, onChange: () => { const n = notes.openCount(); $('#notesBtn').textContent = n ? `Замечания · ${n}` : 'Замечания'; editor?.renderPins(); } });
let pend = new Set(); let pendT = 0;
const editor = new Editor($('#ed'), lib, { notes, onChange: (cls) => { pend.add(cls); clearTimeout(pendT); pendT = setTimeout(flush, 250); } });
function flush() { for (const c of pend) atl.invalidate(c); pend.clear(); preview?.refresh(); blend?.refresh(); }

// статус хранения
lib.on((w) => {
  const s = $('#status'); s.classList.remove('err');
  if (w === 'saving') s.textContent = 'Сохраняю…';
  else if (w === 'saved' || w === 'status') s.textContent = lib.db ? 'Сохранено в окне — Claude видит' : 'Сохранено только в этом браузере';
  else if (w === 'error') { s.textContent = 'Не сохранилось, повторю'; s.classList.add('err'); }
});

// вкладки
document.querySelectorAll('nav.tabs button').forEach((b) => { b.onclick = () => show(b.dataset.tab); });
function show(t) {
  tab = t; document.querySelectorAll('nav.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  for (const k of ['Ed', 'Pv', 'Bl', 'Ex']) $('#pane' + k).hidden = k !== t;
  if (t === 'Pv') { ensurePreview(); preview.setClass(editor.cls); syncPv(); preview.start(); } else preview?.stop();
  if (t === 'Bl') { ensureBlend(); blend.refresh(); blend.start(); } else blend?.stop();
  if (t === 'Ex') renderEx();
  if (t === 'Ed') editor.drawPad();
}
function jump(n) {
  if (n.where === 'sheet') { const s = lib.sheets.get(n.sheet); if (s) { show('Ed'); editor.select({ cls: s.cls, role: s.role, sheetId: s.id }); } }
  if (n.where === 'preview') { show('Pv'); preview.setMode('one'); if (n.time) { preview.setTime(n.time); } editor.cls = n.cls; preview.setClass(n.cls); if (n.cam) preview.camera.position.set(...n.cam); syncPv(); }
  if (n.where === 'blend') { show('Bl'); const [a, b] = n.pair.split('__'); blend.setPair(a, b); syncBl(); }
}

// ---------- панель 3D ----------
function ensurePreview() {
  if (preview) return;
  preview = new Preview($('#pv'), lib, atl, notes);
  preview.onNoteDone = () => { $('#pv').classList.remove('noting'); syncPv(); };
  preview.setStyle('lair');
  const P = $('#pvPanel');
  const sel = el('select', { 'aria-label': 'Класс', onchange: (e) => { editor.select({ cls: e.target.value }); preview.setClass(e.target.value); } }, ...CLASSES.map((c) => el('option', { value: c.k }, c.name)));
  P.append(el('h3', {}, 'Сцена'),
    el('div', { class: 'row' }, el('button', { id: 'pvOne', onclick: () => { preview.setMode('one'); syncPv(); } }, 'Один класс'), el('button', { id: 'pvAll', onclick: () => { preview.setMode('all'); syncPv(); } }, 'Все классы'), el('button', { id: 'pvRef', onclick: () => { preview.setMode('ref'); syncPv(); } }, 'Сцена по референсу')),
    el('div', { class: 'row', style: 'margin-top:6px' }, sel),
    el('h3', {}, 'Стиль'), el('div', { class: 'row', id: 'pvStyles' }, ...Object.entries(STYLES).map(([k, t]) => el('button', { 'data-k': k, onclick: () => { preview.setStyle(k); syncPv(); } }, t.name))),
    el('h3', {}, 'Время суток'), el('div', { class: 'row', id: 'pvTimes' }, ...Object.entries(TIMES).map(([k, t]) => el('button', { 'data-k': k, onclick: () => { preview.setTime(k); syncPv(); } }, t.name))),
    el('h3', {}, 'Слои'), el('div', { class: 'row', id: 'pvFlags' }, ...[['marks', 'Почеркушки'], ['ink', 'Контур'], ['aura', 'Аура'], ['boil', 'Кипение 8 к/с']].map(([k, t]) => el('button', { 'data-k': k, onclick: () => { preview.setFlag(k, !preview.flags[k]); syncPv(); } }, t))),
    el('p', { class: 'hint' }, 'Выключи «Почеркушки», чтобы сравнить с голой формой.'),
    el('h3', {}, 'Как ложится (класс)'), el('div', { id: 'pvPar' }),
    el('h3', {}, 'Замечание'), el('button', { id: 'pvNote', onclick: () => { preview.noteMode = !preview.noteMode; $('#pv').classList.toggle('noting', preview.noteMode); syncPv(); } }, '✎ Кликни по предмету'),
    el('button', { style: 'margin-top:6px', onclick: () => { editor.select({ cls: preview.cls }); show('Ed'); } }, '← Рисовать этот класс'));
  P.querySelector('select').id = 'pvCls';
}
function syncPv() {
  if (!preview) return; $('#pvCls').value = preview.cls;
  $('#pvOne').classList.toggle('on', preview.mode === 'one'); $('#pvAll').classList.toggle('on', preview.mode === 'all'); $('#pvRef').classList.toggle('on', preview.mode === 'ref');
  document.querySelectorAll('#pvStyles button').forEach((b) => b.classList.toggle('on', b.dataset.k === (preview.style ?? 'lair')));
  document.querySelectorAll('#pvTimes button').forEach((b) => { b.classList.toggle('on', b.dataset.k === preview.time); b.disabled = (preview.style ?? 'lair') !== 'lair'; });
  document.querySelectorAll('#pvFlags button').forEach((b) => b.classList.toggle('on', !!preview.flags[b.dataset.k]));
  $('#pvNote').classList.toggle('on', preview.noteMode);
  // быстрые ручки: плотность и размер знаков тени/света
  const c = preview.cls; const box = $('#pvPar'); box.replaceChildren();
  for (const role of ['shadow', 'light', 'fill']) {
    const p = lib.params(c, role); const n = lib.sheetsOf(c, role).filter((s) => !s.off).length;
    box.append(el('p', { class: 'hint' }, `${ROLE[role].name}: листов ${Math.min(4, n)}${n > 4 ? ` (из ${n})` : ''}`));
    for (const [k, name, mn, mx, st] of ROLE[role].params.filter(([k]) => ['dens', 'size', 'str'].includes(k))) {
      const out = el('output', {}, String(p[k]));
      box.append(el('label', { class: 'sl' }, el('span', {}, name), el('input', { type: 'range', min: mn, max: mx, step: st, value: p[k], oninput: (e) => { lib.setParam(c, role, k, +e.target.value); out.textContent = e.target.value; preview.refresh(); } }), out));
    }
  }
}

// ---------- панель смешения ----------
function ensureBlend() {
  if (blend) return; ensurePreview();
  blend = new Blend($('#bl'), lib, atl, notes, editor);
  blend.onNoteDone = () => { $('#bl').classList.remove('noting'); syncBl(); };
  blend.onInfo = () => { const i = $('#blEdge'); if (i) i.textContent = `Шов рисуется листами «Шов смешения» класса «${CLS[blend.edgeSrc]?.name}».`; };
  const P = $('#blPanel');
  const mk = (id, v) => el('select', { id, 'aria-label': id === 'blA' ? 'Материал A' : 'Материал B', onchange: () => { blend.setPair($('#blA').value, $('#blB').value); syncBl(); } }, ...CLASSES.map((c) => el('option', { value: c.k }, c.name)));
  const sl = (name, mn, mx, st, get, set) => { const out = el('output', {}, String(get())); return el('label', { class: 'sl' }, el('span', {}, name), el('input', { type: 'range', min: mn, max: mx, step: st, value: get(), oninput: (e) => { set(+e.target.value); out.textContent = e.target.value; } }), out); };
  P.append(el('h3', {}, 'Стиль'), el('div', { class: 'row', id: 'blStyles' }, ...Object.entries(STYLES).map(([k, t]) => el('button', { 'data-k': k, onclick: () => { ensurePreview(); preview.setStyle(k); syncBl(); } }, t.name))),
    el('h3', {}, 'Примеры'), el('div', { class: 'row' }, ...PAIRS.map(([a, b, t]) => el('button', { 'data-p': a + '__' + b, onclick: () => { blend.setPair(a, b); syncBl(); } }, t))),
    el('h3', {}, 'Свои материалы'), el('div', { class: 'row' }, el('span', {}, 'A'), mk('blA'), el('span', {}, 'B'), mk('blB')),
    el('h3', {}, 'Рисовать'), el('div', { class: 'row', id: 'blTools' }, ...[['B', 'Кисть B'], ['A', 'Кисть A'], ['seam', 'Шов кистью'], ['erase', 'Стереть шов']].map(([k, t]) => el('button', { 'data-k': k, onclick: () => { blend.tool = k; syncBl(); } }, t))),
    el('p', { class: 'hint' }, '«Шов кистью» рисует текущей кистью и цветом из редактора прямо по земле и предметам.'),
    sl('Радиус кисти A/B, м', 0.1, 2.5, 0.05, () => blend.rad, (v) => { blend.rad = v; }),
    sl('Мягкость кисти', 0, 1, 0.05, () => blend.soft, (v) => { blend.soft = v; }),
    el('h3', {}, 'Граница'),
    sl('Рваность (маски)', 0, 3, 0.05, () => blend.u.uRag.value, (v) => { blend.u.uRag.value = v; }),
    sl('Мягкость перехода', 0, 0.3, 0.005, () => blend.u.uSoft.value, (v) => { blend.u.uSoft.value = v; }),
    el('p', { class: 'hint', id: 'blEdge' }),
    el('div', { class: 'row' }, el('button', { id: 'blMask', onclick: () => { blend.u.uShowMask.value = 1 - blend.u.uShowMask.value; syncBl(); } }, 'Показать маску'), el('button', { onclick: () => blend.undoSeam() }, 'Отменить штрих шва'), el('button', { onclick: () => blend.clearSeam() }, 'Очистить шов'), el('button', { onclick: () => { blend.defaultMask(); blend.save(); } }, 'Маска заново')),
    el('h3', {}, 'Замечание'), el('button', { id: 'blNote', onclick: () => { blend.noteMode = !blend.noteMode; $('#bl').classList.toggle('noting', blend.noteMode); syncBl(); } }, '✎ Кликни по месту'));
  blend.setPair(blend.a, blend.b); syncBl();
}
function syncBl() {
  $('#blA').value = blend.a; $('#blB').value = blend.b;
  document.querySelectorAll('#blStyles button').forEach((b) => b.classList.toggle('on', b.dataset.k === (preview?.style ?? 'lair')));
  document.querySelectorAll('#blPanel [data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === blend.key()));
  document.querySelectorAll('#blTools button').forEach((b) => b.classList.toggle('on', b.dataset.k === blend.tool));
  $('#blMask').classList.toggle('on', !!blend.u.uShowMask.value); $('#blNote').classList.toggle('on', blend.noteMode); blend.onInfo();
}

// ---------- обмен ----------
async function save(filename, data) {
  try {
    const dl = await claudeUse('downloads');
    if (dl) { await dl.save({ filename, data }); toast('Файл передан: ' + filename); return; }
  } catch (e) { if (e?.code === 'declined') return; console.warn(e); }
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click(); a.remove();
}
const uses = {};
function claudeUse(name) { if (!window.claude?.use) return Promise.resolve(null); return uses[name] ??= Promise.race([window.claude.use(name), new Promise((r) => setTimeout(() => r(null), 10000))]).catch(() => null); }
function atlasBlob(cls) { return new Promise((r) => bakeAtlas(lib, cls).canvas.toBlob(r, 'image/png')); }
function godotPack() {
  const d = lib.exportData(); d.atlases = {}; d.layout = {};
  for (const c of CLASSES) { const { canvas, counts } = bakeAtlas(lib, c.k); d.atlases[c.k] = canvas.toDataURL('image/png'); d.layout[c.k] = counts; }
  return d;
}
function renderEx() {
  const box = $('#ex'); const counts = CLASSES.map((c) => [c, lib.sheetsOf(c.k).length]);
  const clsSel = el('select', { 'aria-label': 'Класс для атласа' }, ...CLASSES.map((c) => el('option', { value: c.k }, c.name))); clsSel.value = editor.cls;
  const impCls = el('select', { 'aria-label': 'Класс для старого файла' }, ...CLASSES.map((c) => el('option', { value: c.k }, c.name)));
  const file = el('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Файл библиотеки', onchange: async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); const n = lib.importData(j, { cls: impCls.value }); atl.invalidate(); flush(); editor.renderAll(); toast(n ? `Добавлено листов: ${n}` : 'В файле не нашлось листов'); renderEx(); } catch (err) { toast('Не прочитал файл: ' + err.message); }
    e.target.value = '';
  } });
  const roleRows = ROLES.map((r, i) => el('tr', {}, el('td', {}, String(i)), el('td', {}, el('code', {}, r.k)), el('td', {}, r.name), el('td', {}, r.params.map((p) => p[0]).join(', '))));
  box.replaceChildren(el('div', { class: 'wrap' },
    el('div', { class: 'card' }, el('h2', {}, 'Как мы обмениваемся'),
      el('p', {}, 'Всё, что ты рисуешь, и все замечания сохраняются в этом окне сами (строка «Сохранено в окне» вверху). Я читаю их отсюда напрямую — файлы пересылать не нужно. Когда готов набор, нажми «Передать Claude» и напиши, что сделать: доработать, перенести в игру, сделать новый класс.'),
      el('p', { class: 'hint' }, 'Путь в игру: лист → атлас класса (4 варианта × 7 ролей, клетка 256 px) + настройки → data/pnt/hand в проекте Godot. Переношу только после твоего одобрения.'),
      el('div', { class: 'stat' }, ...counts.map(([c, n]) => el('div', {}, el('b', {}, String(n)), c.name)))),
    el('div', { class: 'card' }, el('h2', {}, 'Скачать'),
      el('div', { class: 'row' }, el('button', { onclick: () => save('pochirkushki-biblioteka.json', JSON.stringify(lib.exportData())) }, 'Вся библиотека (.json)'),
        el('button', { onclick: () => save(`pochirkushki-${editor.cls}.json`, JSON.stringify(lib.exportData((s) => s.cls === editor.cls))) }, 'Только текущий класс (.json)'),
        el('button', { onclick: () => save('pochirkushki-godot.json', JSON.stringify(godotPack())) }, 'Набор для Godot (.json с атласами)')),
      el('div', { class: 'row', style: 'margin-top:8px' }, clsSel, el('button', { onclick: async () => save(`atlas-${clsSel.value}.png`, await atlasBlob(clsSel.value)) }, 'Атлас класса (.png)'))),
    el('div', { class: 'card' }, el('h2', {}, 'Загрузить'),
      el('p', { class: 'hint' }, 'Понимает файлы этого окна, старые наборы мастерской знаков (hand-library/marks/*.json — выбери класс) и старые «Почеркушки» (scribbles/*.json). Листы добавляются, ничего не стирается.'),
      el('div', { class: 'row' }, el('span', {}, 'Класс для старого набора:'), impCls, file),
      el('p', { class: 'hint' }, 'Материалы по референсам подъезда и двора (стена, панель, крошка, стекло, снег, шерсть, кожа, куртка, пепельница) добавлены сами. Если удалил и хочешь вернуть — кнопка ниже, листы добавятся копией.'),
      el('div', { class: 'row' }, el('button', { onclick: () => { const n = addRef(true); toast(`Добавлено листов: ${n}`); renderEx(); } }, 'Добавить материалы по референсу'))),
    el('div', { class: 'card' }, el('h2', {}, 'Формат «' + FORMAT + '» v' + VERSION),
      el('p', {}, 'Лист = класс + роль + слои по цветам. Слой = цвет, прозрачность, наложение, штрихи. Штрих = точки 0..1 ', el('code', {}, 'pts'), ', нажим ', el('code', {}, 'pr'), ', толщина ', el('code', {}, 'w'), ' (доля листа), кисть ', el('code', {}, 'b {t, o, pr, tp, an, hd, gr, jt, fl, bl, sc}'), ', зерно ', el('code', {}, 'sd'), '. Совместимо со старыми рисунками.'),
      el('p', {}, `Атлас класса: ${COLS} столбца (варианты) × ${ROLES.length} рядов (роли), клетка ${CELL} px. Берутся первые 4 включённых листа роли.`),
      el('table', {}, el('tr', {}, el('th', {}, 'Ряд'), el('th', {}, 'Ключ'), el('th', {}, 'Роль'), el('th', {}, 'Настройки')), ...roleRows))));
}

// ---------- материалы по референсам ----------
function addRef(force = false) {
  const old = [...lib.sheets.values()].filter((s) => s.src === REF_SRC); const ver = lib.par._ref?.done?.v ?? (old.length ? 1 : 0);
  if (ver >= REF_VER && !force) return 0;
  if (ver < REF_VER) for (const s of old) lib.remove(s.id); // прежняя версия листов по референсу заменяется
  const list = refSheets(); for (const s of list) lib.add(s);
  for (const [c, roles] of Object.entries(REF_PARAMS)) for (const [r, p] of Object.entries(roles)) { if (REF_KEEP.has(c) && r !== 'fill') continue; for (const [k, v] of Object.entries(p)) lib.setParam(c, r, k, v); }
  lib.par._ref = { done: { v: REF_VER } }; lib.touch('par:_ref');
  atl.invalidate(); flush(); editor.renderAll(); return list.length;
}

// ---------- передать Claude ----------
$('#notesBtn').onclick = () => notes.toggle();
$('#handBtn').onclick = () => {
  const by = CLASSES.map((c) => [c.name, lib.sheetsOf(c.k).length]).filter(([, n]) => n).map(([n, k]) => `${n} ${k}`).join(', ');
  $('#handSum').textContent = `Сейчас в библиотеке: ${by}. Открытых замечаний: ${notes.openCount()}.`;
  $('#handText').value = ''; $('#handDlg').showModal(); $('#handText').focus();
};
$('#handGo').onclick = async () => {
  const text = $('#handText').value.trim(); $('#handDlg').close();
  const sum = { sheets: lib.sheets.size, byClass: Object.fromEntries(CLASSES.map((c) => [c.k, lib.sheetsOf(c.k).length])), openNotes: notes.openCount(), current: { cls: editor.cls, role: editor.role, sheet: editor.sheetId } };
  await lib.save();
  const ok = await notes.handoff(text || '(без текста)', sum).catch(() => false);
  if (ok) toast('Передано. Напиши мне в треде «посмотри мастерскую» — я прочитаю.');
  else { await save('pochirkushki-dlya-claude.json', JSON.stringify({ note: text, ...lib.exportData() })); toast('Окно без хранилища: скачал файл — пришли его мне.'); }
};

// Ctrl+Z в окне смешения — отмена штриха шва
addEventListener('keydown', (e) => { if (tab === 'Bl' && blend && (e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.target.matches?.('textarea, input:not([type]), input[type=text]')) { e.preventDefault(); blend.undoSeam(); } });

// ---------- старт ----------
(async () => {
  editor.renderAll();
  await lib.connect();
  await lib.load('data/seed.json');
  await notes.load();
  addRef();
  editor.renderAll();
  $('#status').textContent = lib.db ? 'Сохранено в окне — Claude видит' : 'Сохранено только в этом браузере';
  window.__ss = { lib, editor, atl, get preview() { return preview; }, get blend() { return blend; }, show, notes, shared };
})();
