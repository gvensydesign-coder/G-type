// Материалы по референсам ivanponivanov (подъезд днём, двор синей ночью) — разбор в REF-ANALYSIS.md.
// Всё нарисовано обычными штрихами кистей мастерской, поэтому каждый лист можно открыть и перерисовать.
import { newLayer, uid } from './library.js';

export const REF_SRC = 'ref-ivanov';

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const B = (t, o = {}) => ({ t, o: 1, pr: 0.6, tp: 0.5, hd: 1, gr: 0, jt: 0.05, fl: 1, bl: 0, sc: 1, ...o });
// штрих из точек [[x,y,нажим]]
function st(P, w, b, sd) { const pts = [], pr = []; for (const [x, y, p] of P) { pts.push(+x.toFixed(4), +y.toFixed(4)); pr.push(+(p ?? 0.7).toFixed(2)); } return { pts, pr, w, b, sd }; }
function line(x0, y0, x1, y1, n = 8, bend = 0, r = Math.random, p0 = 0.5, p1 = 0.9) {
  const P = []; for (let i = 0; i <= n; i++) { const u = i / n; const b = Math.sin(u * Math.PI) * bend; P.push([x0 + (x1 - x0) * u - (y1 - y0) * b, y0 + (y1 - y0) * u + (x1 - x0) * b, p0 + (p1 - p0) * Math.sin(u * Math.PI)]); } return P;
}
function arc(cx, cy, rx, ry, a0, a1, n = 12) { const P = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0.4 + 0.5 * Math.sin(i / n * Math.PI)]); } return P; }
function sheet(cls, role, name, layers, ord) { return { id: uid('s'), cls, role, name, src: REF_SRC, ord: 5000 + ord, t: Date.now(), layers }; }
function layer(color, name, strokes, o = 1, mode = 'source-over') { const L = newLayer(color, name); L.strokes = strokes; L.o = o; L.mode = mode; return L; }

export function refSheets() {
  const out = []; let ord = 0; const add = (...a) => out.push(sheet(...a, ord++));
  // ---------- стена, охра: подтёки, полосы валика, грязь ----------
  { const r = rng(11); const S = [];
    for (let i = 0; i < 7; i++) { const x = 0.12 + i * 0.12 + (r() - 0.5) * 0.05; S.push(st(line(x, 0.08 + r() * 0.2, x + (r() - 0.5) * 0.03, 0.6 + r() * 0.35, 10, 0, r, 0.3, 0.8), 0.035 + r() * 0.03, B('dry', { o: 0.5, hd: 0.8, gr: 0.4 }), 100 + i)); }
    add('wall', 'fill', 'Полосы и подтёки', [layer('#b98250', 'Полосы', S, 0.7, 'multiply')]); }
  { const r = rng(12); const S = [];
    for (let i = 0; i < 4; i++) { const x = 0.15 + r() * 0.7, y = 0.15 + r() * 0.7; S.push(st(line(x, y, x + 0.12 + r() * 0.1, y + (r() - 0.5) * 0.08, 6, 0.1, r), 0.07, B('stain', { o: 0.5, fl: 0.6, bl: 0.4, gr: 0.3 }), 200 + i)); }
    add('wall', 'fill', 'Пятна грязи', [layer('#a26c42', 'Грязь', S, 0.6, 'multiply')]); }
  { const r = rng(13); const S = [];
    for (let i = 0; i < 3; i++) { const x = 0.2 + r() * 0.6, y = 0.2 + r() * 0.6; S.push(st(line(x, y, x + 0.25, y + 0.03, 6, 0.05, r), 0.05, B('stain', { o: 0.6, fl: 0.4, bl: 0.2 }), 300 + i)); }
    add('wall', 'shadow', 'Тень: пятна', [layer('#8a5a3a', 'Пятна', S, 0.55, 'multiply')]); }
  { // кромка зелёной краски: сухая кисть поперёк с капельными потёками вниз (для смешения охра → панель)
    const r = rng(14); const S = [];
    for (let i = 0; i < 3; i++) S.push(st(line(0.02, 0.45 + i * 0.04, 0.98, 0.47 + i * 0.03 + (r() - 0.5) * 0.04, 16, 0.02, r, 0.7, 1), 0.06, B('dry', { o: 0.95, hd: 0.9, gr: 0.2 }), 400 + i));
    for (let i = 0; i < 9; i++) { const x = 0.06 + r() * 0.88; S.push(st(line(x, 0.5, x + (r() - 0.5) * 0.01, 0.56 + r() * 0.1, 4, 0, r, 0.9, 0.4), 0.012, B('ink', { tp: 1 }), 450 + i)); }
    add('wall', 'edge', 'Кромка краски с потёками', [layer('#4f6350', 'Зелёная краска', S)]); }
  // ---------- зелёная панель: мазки валика, сколы ----------
  { const r = rng(21); const S = [];
    for (let i = 0; i < 6; i++) { const y = 0.12 + i * 0.14 + (r() - 0.5) * 0.04; S.push(st(line(0.05, y, 0.95, y + (r() - 0.5) * 0.06, 12, 0.01, r), 0.08, B('brush', { o: 0.5, gr: 0.3 }), 500 + i)); }
    add('panel', 'fill', 'Мазки валика', [layer('#5d7259', 'Светлее', S, 0.6)]); }
  { const r = rng(22); const S = [];
    for (let i = 0; i < 10; i++) { const x = r() * 0.85 + 0.05, y = r() * 0.85 + 0.05; S.push(st(line(x, y, x + 0.05 + r() * 0.08, y + (r() - 0.5) * 0.04, 4, 0.2, r), 0.006, B('scratch', { sc: 1.2 }), 600 + i)); }
    add('panel', 'light', 'Сколы краски', [layer('#9aa58a', 'Сколы', S)]); }
  { const r = rng(23); const S = [];
    for (let i = 0; i < 3; i++) { const x = 0.15 + r() * 0.6, y = 0.2 + r() * 0.6; S.push(st(line(x, y, x + 0.2, y + 0.05, 5, 0.1, r), 0.06, B('stain', { o: 0.6, fl: 0.5, bl: 0.4 }), 700 + i)); }
    add('panel', 'shadow', 'Тень: грязь', [layer('#2f3b30', 'Грязь', S, 0.5, 'multiply')]); }
  // ---------- пол, мраморная крошка: две краски крапинками ----------
  { const r = rng(31); const dark = [], light = [], mid = [];
    for (let i = 0; i < 14; i++) { const y = 0.05 + i * 0.065; dark.push(st(line(0.02, y, 0.98, y + (r() - 0.5) * 0.05, 14, 0.02, r), 0.03, B('speck', { sc: 1.0 + r() * 0.6 }), 800 + i)); }
    for (let i = 0; i < 12; i++) { const y = 0.08 + i * 0.075; light.push(st(line(0.02, y, 0.98, y + (r() - 0.5) * 0.05, 14, 0.02, r), 0.025, B('speck', { sc: 0.8 + r() * 0.5 }), 900 + i)); }
    for (let i = 0; i < 6; i++) { const x = r() * 0.8 + 0.1, y = r() * 0.8 + 0.1; mid.push(st(line(x, y, x + 0.06, y + 0.02, 3, 0, r), 0.04, B('stain', { o: 0.8, fl: 0.6, bl: 0.5 }), 950 + i)); }
    add('floor', 'fill', 'Крошка: тёмная и светлая', [layer('#3e3127', 'Тёмная крошка', dark), layer('#b9a48c', 'Светлая крошка', light), layer('#5e4a3a', 'Крупные пятна', mid, 0.7)]); }
  { const r = rng(32); const S = [];
    for (let i = 0; i < 8; i++) { const y = 0.1 + i * 0.1; S.push(st(line(0.05, y, 0.95, y + (r() - 0.5) * 0.04, 12, 0.02, r), 0.02, B('speck', { sc: 0.7 }), 1000 + i)); }
    add('floor', 'light', 'Блеск крошки', [layer('#e2d2b8', 'Блеск', S)]); }
  // ---------- стекло окна: печатный растр и косой блик ----------
  { const r = rng(41); const S = [];
    S.push(st(line(0.05, 0.25, 0.7, 0.2, 10, 0.05, r, 0.6, 1), 0.28, B('halftone', { o: 0.9, sc: 1, an: 0.785, fl: 0.8 }), 1100));
    S.push(st(line(0.3, 0.75, 0.95, 0.65, 10, -0.05, r, 0.4, 0.9), 0.22, B('halftone', { o: 0.9, sc: 1, an: 0.785, fl: 0.6 }), 1101));
    add('glass', 'fill', 'Растр точками', [layer('#bdbd92', 'Растр', S, 0.8)]); }
  { const r = rng(42); const S = [];
    S.push(st(line(0.15, 0.95, 0.85, 0.05, 8, 0, r, 0.8, 1), 0.16, B('marker', { o: 0.5, hd: 0.6 }), 1200));
    S.push(st(line(0.35, 0.98, 0.98, 0.25, 8, 0, r, 0.8, 1), 0.05, B('marker', { o: 0.5, hd: 0.6 }), 1201));
    add('glass', 'light', 'Косой блик', [layer('#fffbe6', 'Блик', S, 0.8, 'screen')]); }
  { const r = rng(43); const S = [];
    S.push(st(line(0.1, 0.4, 0.9, 0.55, 10, 0.08, r, 0.5, 0.9), 0.3, B('halftone', { o: 0.9, sc: 0.7, an: 0.4, fl: 0.9 }), 1300));
    add('glass', 'fill', 'Растр мелкий', [layer('#a8b088', 'Растр', S, 0.7)]); }
  // ---------- снег ночью: следы дугами, мягкие сугробы ----------
  { const r = rng(51); const S = [];
    for (let i = 0; i < 5; i++) { const x = 0.15 + r() * 0.65, y = 0.2 + r() * 0.6; S.push(st(arc(x, y, 0.09 + r() * 0.05, 0.035, Math.PI * 0.1, Math.PI * 0.95, 10), 0.016, B('ink', { tp: 1 }), 1400 + i)); }
    add('snow', 'shadow', 'Следы дугами', [layer('#3f5f9a', 'Следы', S)]); }
  { const r = rng(52); const S = [];
    for (let i = 0; i < 4; i++) { const y = 0.2 + i * 0.2; S.push(st(line(0.05, y, 0.95, y + (r() - 0.5) * 0.1, 12, 0.06, r), 0.07, B('marker', { o: 0.45, hd: 0.5 }), 1500 + i)); }
    add('snow', 'fill', 'Наметённые полосы', [layer('#c5d3ec', 'Полосы', S, 0.6)]); }
  { const r = rng(53); const S = [];
    for (let i = 0; i < 6; i++) { const x = 0.1 + r() * 0.8, y = 0.15 + r() * 0.7; S.push(st(line(x, y, x + 0.12, y + 0.02, 5, 0.15, r), 0.012, B('pen', { tp: 1 }), 1600 + i)); }
    add('snow', 'light', 'Искры наста', [layer('#f4f8ff', 'Искры', S)]); }
  // ---------- шерсть: веер заострённых прядей; кончики светом фонаря ----------
  const fan = (r, n, col, w, seedBase, len = 0.32) => { const S = []; for (let i = 0; i < n; i++) { const a = -2.2 + r() * 1.6; const x = 0.25 + r() * 0.5, y = 0.45 + r() * 0.35; const l = len * (0.6 + r() * 0.6); S.push(st(line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 6, (r() - 0.5) * 0.15, r, 1, 0.2), w, B('pen', { tp: 1, pr: 1 }), seedBase + i)); } return S; };
  { const r = rng(61); add('fur', 'fill', 'Пряди', [layer('#2a241c', 'Пряди', fan(r, 28, '#2a241c', 0.01, 1700))]); }
  { const r = rng(62); add('fur', 'light', 'Кончики в свете', [layer('#f2a03c', 'Свет фонаря', fan(r, 16, '#f2a03c', 0.007, 1800, 0.22))]); }
  { const r = rng(63); add('fur', 'shadow', 'Тёмные пряди', [layer('#15120e', 'Тень', fan(r, 20, '#15120e', 0.009, 1900))]); }
  { const r = rng(64); const S = [];
    S.push(st(line(0.03, 0.5, 0.97, 0.5, 20, 0, r, 0.8, 0.8), 0.006, B('tuft', { an: -1.57, sc: 1.4 }), 2000));
    add('fur', 'aura', 'Шерсть по краю (свет)', [layer('#f2a03c', 'Кромка', S)]); }
  // ---------- кожа: румянец акварелью, мягкая тень ----------
  { const r = rng(71); const S = [];
    for (let i = 0; i < 4; i++) { const x = 0.25 + r() * 0.4, y = 0.3 + r() * 0.4; S.push(st(line(x, y, x + 0.12, y + 0.06, 6, 0.2, r), 0.12, B('water', { o: 0.5, bl: 0.6 }), 2100 + i)); }
    add('skin', 'fill', 'Румянец', [layer('#e07a72', 'Румянец', S, 0.7, 'multiply')]); }
  { const r = rng(72); const S = [];
    for (let i = 0; i < 3; i++) { const x = 0.2 + r() * 0.5, y = 0.25 + r() * 0.5; S.push(st(line(x, y, x + 0.25, y + 0.1, 8, 0.1, r), 0.14, B('water', { o: 0.45, bl: 0.4 }), 2200 + i)); }
    add('skin', 'shadow', 'Тень акварелью', [layer('#a8644e', 'Тень', S, 0.7, 'multiply')]); }
  // ---------- тёмная куртка (класс «Ткань»): каракули маркером темнее основы ----------
  { const r = rng(81); const S = [];
    for (let i = 0; i < 5; i++) { const P = []; const x = 0.15 + r() * 0.6, y = 0.15 + r() * 0.6; for (let j = 0; j <= 14; j++) { const u = j / 14; P.push([x + u * 0.3 + Math.sin(u * 9 + i) * 0.04, y + Math.cos(u * 7 + i) * 0.05 + u * 0.1, 0.7]); } S.push(st(P, 0.03, B('marker', { o: 0.8, hd: 0.9 }), 2300 + i)); }
    add('cloth', 'fill', 'Куртка: каракули маркером', [layer('#18120f', 'Маркер', S, 0.7, 'multiply')]); }
  { const r = rng(82); const S = [];
    for (let i = 0; i < 4; i++) { const x = 0.15 + r() * 0.6, y = 0.2 + r() * 0.6; S.push(st(line(x, y, x + 0.3, y + 0.1, 6, 0.1, r), 0.06, B('chisel', { o: 0.75, an: 0.8 }), 2400 + i)); }
    add('cloth', 'shadow', 'Куртка: складки скошенным маркером', [layer('#0e0a09', 'Складки', S, 0.8, 'multiply')]); }
  // ---------- металл пепельницы: крап, тонкие светлые дуги ----------
  { const r = rng(91); const S = [];
    for (let i = 0; i < 8; i++) { const y = 0.1 + i * 0.11; S.push(st(line(0.05, y, 0.95, y + (r() - 0.5) * 0.05, 10, 0.02, r), 0.02, B('speck', { sc: 0.9 }), 2500 + i)); }
    add('metal', 'fill', 'Крап на краске', [layer('#2a2420', 'Крап', S, 0.8)]); }
  { const S = []; for (let i = 0; i < 3; i++) S.push(st(arc(0.5, 0.55, 0.38 - i * 0.07, 0.3 - i * 0.05, Math.PI * 1.1, Math.PI * 1.7, 12), 0.008, B('pen', { tp: 1 }), 2600 + i));
    add('metal', 'light', 'Светлые дуги ободка', [layer('#efd59a', 'Дуги', S)]); }
  return out;
}

// настройки, как это ложится (размеры в см — по масштабу кадров референса)
export const REF_PARAMS = {
  wall: { fill: { dens: 0.45, size: 70, rot: 0.05, str: 0.7 }, shadow: { dens: 0.3, size: 50, rot: 0.1, str: 0.6 }, edge: { w: 0.25, dens: 1, size: 45, str: 1 }, mask: { amp: 0, size: 40, soft: 0.01, blur: 2 } },
  panel: { fill: { dens: 0.7, size: 60, rot: 0.03, str: 0.6 }, light: { dens: 0.5, size: 40, rot: 0.2, str: 0.8 }, shadow: { dens: 0.3, size: 50, rot: 0.1, str: 0.6 } },
  floor: { fill: { dens: 1, size: 35, rot: 1, str: 1 }, light: { dens: 0.6, size: 30, rot: 1, str: 0.7 } },
  glass: { fill: { dens: 0.55, size: 90, rot: 0, str: 0.8 }, light: { dens: 0.5, size: 120, rot: 0, str: 0.7 } },
  snow: { shadow: { dens: 0.5, size: 70, rot: 0.15, str: 0.9 }, fill: { dens: 0.5, size: 120, rot: 0.05, str: 0.5 }, light: { dens: 0.4, size: 40, rot: 0.3, str: 0.8 } },
  fur: { fill: { dens: 1, size: 25, rot: 0.3, str: 1 }, light: { dens: 0.8, size: 22, rot: 0.3, str: 1 }, shadow: { dens: 1, size: 25, rot: 0.3, str: 1 }, aura: { off: 0.3, dens: 1, w: 0.25, bright: 1.2, rep: 10 } },
  skin: { fill: { dens: 0.5, size: 30, rot: 0.3, str: 0.8 }, shadow: { dens: 0.6, size: 35, rot: 0.3, str: 0.8 } },
  cloth: { fill: { dens: 0.7, size: 35, rot: 0.6, str: 0.8 } },
  metal: { fill: { dens: 0.8, size: 30, rot: 1, str: 0.6 } },
};
export const REF_KEEP = new Set(['cloth', 'metal']); // у этих классов настройки Michael не трогаем, добавляем только роль fill
