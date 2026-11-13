// Набор кистей мастерской почеркушек.
// Старые кисти (перо, тушь, маркер, карандаш, сухая кисть…) рисует прежний brushes.js без изменений,
// новые (акварель, фломастер, скошенный маркер, уголь, спрей, гуашь, ластик) — здесь.
// Поверх любой кисти работают общие ручки: прозрачность, резкость (размытие края), зерно бумаги, дрожь руки, масштаб узора.
//
// Штрих (совместим с hand-library): { pts: [x,y,...] 0..1, pr: [нажим], w: толщина (доля листа), b: кисть, sd: зерно случайности }
// Кисть b: { t: тип, o: прозрачность, pr: влияние нажима, tp: сужение, an: угол,
//            hd: резкость 0..1, gr: зерно 0..1, jt: дрожь 0..1, fl: поток/плотность 0..1, bl: растекание 0..1, sc: масштаб узора 0.3..3 }
import { renderStroke as oldStroke } from './brushes.js';

export const GROUPS = [
  { name: 'Жидкие', list: ['water', 'ink', 'pen', 'nib', 'gouache'] },
  { name: 'Маркеры', list: ['marker', 'chisel', 'felt'] },
  { name: 'Сухие', list: ['pencil', 'charcoal', 'dry', 'brush'] },
  { name: 'Спрей и фактура', list: ['spray', 'speck', 'scratch', 'hatch', 'tuft', 'shard', 'flat'] },
  { name: 'Служебные', list: ['eraser'] },
];

// по умолчанию у каждой кисти свои ручки; bl — смесь режима наложения (multiply для прозрачных красок)
export const KIT = {
  water:   { name: 'Акварель',         size: 30, o: 0.55, pr: 0.6, tp: 0.5, hd: 0.55, gr: 0.35, jt: 0.1, fl: 0.7, bl: 0.5, sc: 1, mode: 'multiply', hint: 'Прозрачная заливка с тёмной кромкой и затёками. Растекание — насколько расползается край, зерно — грануляция пигмента.' },
  ink:     { name: 'Тушь',             size: 7,  o: 1,    pr: 1,   tp: 1,   hd: 1,    gr: 0,    jt: 0.05, fl: 1, bl: 0, sc: 1, hint: 'Сильный нажим, острые кончики, капля в начале. Основная кисть почерка Michael.' },
  pen:     { name: 'Перо',             size: 5,  o: 1,    pr: 0.8, tp: 0.8, hd: 1,    gr: 0,    jt: 0.05, fl: 1, bl: 0, sc: 1, hint: 'Обычная линия с нажимом и сужением.' },
  nib:     { name: 'Плоское перо',     size: 10, o: 1,    pr: 0.5, tp: 0.6, an: 0.6, hd: 1, gr: 0, jt: 0.05, fl: 1, bl: 0, sc: 1, hint: 'Каллиграфия: толщина зависит от направления. Угол — наклон пера.' },
  gouache: { name: 'Гуашь',            size: 22, o: 1,    pr: 0.5, tp: 0.3, hd: 0.9,  gr: 0.15, jt: 0.1, fl: 0.8, bl: 0, sc: 1, hint: 'Плотная кроющая краска: ровное пятно, к концу мазка краска кончается и рвётся.' },
  marker:  { name: 'Маркер круглый',   size: 12, o: 0.7,  pr: 0,   tp: 0,   hd: 0.95, gr: 0,    jt: 0, fl: 1, bl: 0, sc: 1, mode: 'multiply', hint: 'Ровная ширина, полупрозрачный; где штрихи перекрываются, тон темнеет.' },
  chisel:  { name: 'Маркер скошенный', size: 18, o: 0.65, pr: 0,   tp: 0,   an: 0.8, hd: 0.95, gr: 0.05, jt: 0, fl: 1, bl: 0, sc: 1, mode: 'multiply', hint: 'Плоский скошенный кончик: широкая полоса в одну сторону, узкая в другую. Перекрытия темнее.' },
  felt:    { name: 'Фломастер',        size: 6,  o: 0.92, pr: 0.15, tp: 0.1, hd: 0.9, gr: 0.1, jt: 0.05, fl: 0.8, bl: 0, sc: 1, hint: 'Ровная линия с капелькой в начале и конце, внутри чуть светлые полосы от войлока.' },
  pencil:  { name: 'Карандаш',         size: 3,  o: 0.85, pr: 0.7, tp: 0.3, hd: 0.9,  gr: 0.5,  jt: 0.1, fl: 1, bl: 0, sc: 1, hint: 'Тонкая зернистая линия.' },
  charcoal:{ name: 'Уголь',            size: 10, o: 0.9,  pr: 0.7, tp: 0.4, hd: 0.7,  gr: 0.65, jt: 0.2, fl: 0.7, bl: 0, sc: 1, hint: 'Мягкий рыхлый штрих из нескольких волокон, сильное зерно, обломанные края.' },
  dry:     { name: 'Сухая кисть',      size: 22, o: 0.85, pr: 0.5, tp: 0.4, hd: 1,    gr: 0.1,  jt: 0.05, fl: 1, bl: 0, sc: 1, hint: 'Ворс с пропусками, как почти пустая кисть.' },
  brush:   { name: 'Широкая кисть',    size: 26, o: 0.9,  pr: 0.6, tp: 0.5, hd: 1,    gr: 0,    jt: 0.05, fl: 1, bl: 0, sc: 1, hint: 'Ворс: видны полосы от волосков, рваные концы.' },
  spray:   { name: 'Спрей',            size: 24, o: 0.9,  pr: 0.5, tp: 0,   hd: 1,    gr: 0,    jt: 0, fl: 0.5, bl: 0, sc: 1, hint: 'Облако капель. Поток — сколько капель, масштаб — размер капли, растекание — потёки вниз.' },
  speck:   { name: 'Крапинки',         size: 4,  o: 0.9,  pr: 0.4, tp: 0,   hd: 1,    gr: 0,    jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Россыпь точек вдоль линии: крошки, пыль, фактура.' },
  scratch: { name: 'Царапина',         size: 2,  o: 1,    pr: 0.5, tp: 1,   hd: 1,    gr: 0,    jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Короткие изогнутые чёрточки-процарапы.' },
  hatch:   { name: 'Штриховка от края', size: 2, o: 1,    pr: 0.6, tp: 0.7, an: 1.57, hd: 1, gr: 0, jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Ведёте по ребру: от него отходят штрихи под углом и обрываются на разной длине.' },
  tuft:    { name: 'Пучок травы',      size: 3,  o: 1,    pr: 0.5, tp: 1,   an: -1.57, hd: 1, gr: 0, jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Вдоль линии растут пучки по 2–4 травинки.' },
  shard:   { name: 'Осколок',          size: 18, o: 1,    pr: 0,   tp: 0,   an: 0.5, hd: 1, gr: 0, jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Рваная лента со срезанными концами и полосками внутри.' },
  flat:    { name: 'Плоская грань',    size: 20, o: 1,    pr: 0.3, tp: 0,   hd: 1,    gr: 0,    jt: 0, fl: 1, bl: 0, sc: 1, hint: 'Плоское пятно с прямыми краями и светлой полосой со стороны света.' },
  eraser:  { name: 'Ластик',           size: 20, o: 1,    pr: 0.5, tp: 0,   hd: 0.8,  gr: 0,    jt: 0, fl: 1, bl: 0, sc: 1, mode: 'destination-out', hint: 'Стирает в текущем слое. Резкость и зерно тоже работают.' },
};
const OLD = new Set(['ink', 'pen', 'nib', 'marker', 'pencil', 'dry', 'brush', 'speck', 'scratch', 'hatch', 'tuft', 'shard', 'flat']);
const PATTERNED = new Set(['spray', 'speck', 'scratch', 'hatch', 'tuft', 'charcoal', 'felt', 'water']);
export const isPatterned = (t) => PATTERNED.has(t);

// ручки, общие для всех кистей (подписи для интерфейса)
export const KNOBS = [
  ['size', 'Толщина', 1, 120, 1],
  ['o', 'Прозрачность (кроет)', 0.05, 1, 0.01],
  ['hd', 'Резкость края', 0, 1, 0.01],
  ['pr', 'Нажим влияет', 0, 1, 0.01],
  ['tp', 'Сужение концов', 0, 1, 0.01],
  ['jt', 'Дрожь руки', 0, 1, 0.01],
  ['gr', 'Зерно бумаги', 0, 1, 0.01],
  ['fl', 'Поток / плотность', 0.05, 1, 0.01],
  ['bl', 'Растекание / потёки', 0, 1, 0.01],
  ['sc', 'Масштаб узора', 0.3, 3, 0.05],
  ['an', 'Угол пера', -3.14, 3.14, 0.01],
];
export const MODES = [['source-over', 'Обычно'], ['multiply', 'Умножение (темнее)'], ['screen', 'Экран (светлее)'], ['lighter', 'Сложение (свечение)'], ['destination-out', 'Стирание']];

export function brushOf(t, over = {}) {
  const K = KIT[t] ?? KIT.pen;
  const b = { t, o: K.o, pr: K.pr, tp: K.tp, hd: K.hd, gr: K.gr, jt: K.jt, fl: K.fl, bl: K.bl, sc: K.sc };
  if (K.an != null) b.an = K.an;
  return { ...b, ...over };
}

const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// --- бумага: зерно (тайл 256, белые ворсинки в альфе) ---
let grainCv = null;
function grainCanvas() {
  if (grainCv) return grainCv;
  const N = 256; grainCv = document.createElement('canvas'); grainCv.width = grainCv.height = N;
  const g = grainCv.getContext('2d'); const im = g.createImageData(N, N);
  // шум значений в 3 октавы + волокна по диагонали
  const lat = (s) => { const a = new Float32Array((s + 1) * (s + 1)); for (let i = 0; i < a.length; i++) a[i] = Math.random(); for (let i = 0; i <= s; i++) { a[i * (s + 1) + s] = a[i * (s + 1)]; a[s * (s + 1) + i] = a[i]; } return a; };
  const oct = [[8, 0.25], [32, 0.35], [128, 0.4]].map(([s, w]) => ({ s, w, a: lat(s) }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const o of oct) {
      const fx = x / N * o.s, fy = y / N * o.s; const ix = Math.floor(fx), iy = Math.floor(fy); const tx = fx - ix, ty = fy - iy; const r = o.s + 1;
      const a = o.a[iy * r + ix], b = o.a[iy * r + ix + 1], c = o.a[(iy + 1) * r + ix], d = o.a[(iy + 1) * r + ix + 1];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      v += o.w * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
    }
    const fib = 0.5 + 0.5 * Math.sin((x + y * 0.35) * 0.9 + Math.sin(y * 0.21) * 3);
    v = v * 0.85 + fib * 0.15;
    const a = clamp((v - 0.42) * 3.2, 0, 1);
    const i = (y * N + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = a * 255;
  }
  g.putImageData(im, 0, 0); return grainCv;
}

// --- вспомогательное ---
function resample(P, step) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], c = P[i]; const d = Math.hypot(c[0] - a[0], c[1] - a[1]); const k = Math.max(1, Math.ceil(d / step));
    for (let j = 1; j <= k; j++) { const t = j / k; out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]); }
  }
  return out;
}
function lengths(P) { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; }
function dirAt(P, i) { const n = P.length; const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)]; const dx = c[0] - a[0], dy = c[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
function widthFn(P, L, wPx, B, k = 6) {
  const total = L[L.length - 1] || 1;
  return (i) => { const u = L[i] / total; const pf = 1 - B.pr + B.pr * (0.35 + 0.9 * P[i][2]); const taper = 1 - B.tp + B.tp * Math.min(1, Math.min(u, B.live ? 1 : 1 - u) * k + 0.25); return Math.max(0.6, wPx * pf * taper); };
}
// дрожь руки: плавное смещение поперёк линии (детерминированно от зерна штриха)
function jitter(P, amt, wPx, seed) {
  if (amt <= 0 || P.length < 3) return P;
  const L = lengths(P); const A = amt * Math.max(1.5, wPx * 0.6);
  return P.map((p, i) => {
    const d = dirAt(P, i); const s = L[i] / Math.max(8, wPx * 3);
    const n = Math.sin(s * 1.7 + seed) * 0.6 + Math.sin(s * 4.3 + seed * 2.1) * 0.3 + (H(seed + i) - 0.5) * 0.3;
    return [p[0] - d[1] * n * A, p[1] + d[0] * n * A, p[2]];
  });
}
// контур ленты переменной ширины (для заливок)
function ribbon(g, P, half, wob = 0, seed = 0) {
  const n = P.length; const A = [], B = [];
  for (let i = 0; i < n; i++) {
    const d = dirAt(P, i); const h = half(i);
    const wa = wob ? 1 + (H(seed + i * 3.7) - 0.5) * wob + Math.sin(i * 0.7 + seed) * wob * 0.4 : 1;
    const wb = wob ? 1 + (H(seed + i * 5.1) - 0.5) * wob + Math.sin(i * 0.5 + seed * 1.3) * wob * 0.4 : 1;
    A.push([P[i][0] - d[1] * h * wa, P[i][1] + d[0] * h * wa]); B.push([P[i][0] + d[1] * h * wb, P[i][1] - d[0] * h * wb]);
  }
  g.beginPath(); g.moveTo(A[0][0], A[0][1]); for (let i = 1; i < n; i++) g.lineTo(A[i][0], A[i][1]);
  const e = P[n - 1], he = half(n - 1); const de = dirAt(P, n - 1); g.quadraticCurveTo(e[0] + de[0] * he * 1.2, e[1] + de[1] * he * 1.2, B[n - 1][0], B[n - 1][1]);
  for (let i = n - 2; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
  const s = P[0], hs = half(0); const ds = dirAt(P, 0); g.quadraticCurveTo(s[0] - ds[0] * hs * 1.2, s[1] - ds[1] * hs * 1.2, A[0][0], A[0][1]);
  g.closePath();
}

// --- новые кисти ---
function drawNew(g, P, wPx, B, color, seed) {
  const t = B.t; const L = lengths(P); const total = L[L.length - 1] || 1; const width = widthFn(P, L, wPx, B); const sc = B.sc ?? 1;
  g.fillStyle = color; g.strokeStyle = color;
  if (t === 'water') {
    // 4 прозрачных прохода с разным краем + тёмная кромка (пигмент собирается у края) + светлая середина
    const bl = B.bl ?? 0.5; const passes = 4;
    for (let k = 0; k < passes; k++) {
      g.globalAlpha = 0.32; ribbon(g, P, (i) => width(i) / 2 * (0.85 + k * 0.08 + bl * 0.25), 0.25 + bl * 0.9, seed + k * 13.1); g.fill();
    }
    g.globalAlpha = 0.5 + 0.3 * (1 - bl); g.lineWidth = Math.max(0.8, wPx * 0.06); g.lineJoin = 'round';
    ribbon(g, P, (i) => width(i) / 2 * (0.95 + bl * 0.2), 0.3 + bl * 0.8, seed + 2 * 13.1); g.stroke();
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.25 * (B.fl ?? 0.7);
    ribbon(g, P, (i) => width(i) / 2 * 0.45, 0.6, seed + 77); g.fill();
    g.globalCompositeOperation = 'source-over';
    // затёки-«цветная капуста» на концах
    if (bl > 0.2) {
      const nb = 2 + Math.floor(bl * 4);
      for (let k = 0; k < nb; k++) {
        const i = Math.floor(H(seed + k * 9.7) * (P.length - 1)); const d = dirAt(P, i); const side = H(seed + k * 3.3) > 0.5 ? 1 : -1;
        const r = width(i) * (0.2 + 0.35 * H(seed + k * 1.1)) * bl; const o = width(i) * 0.5 * side;
        g.globalAlpha = 0.28; g.beginPath(); g.arc(P[i][0] - d[1] * o, P[i][1] + d[0] * o, r, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
  } else if (t === 'gouache') {
    // кроющее пятно; к концу (u > fl) краска кончается: волоски с пропусками
    const fl = B.fl ?? 0.8; const n = P.length;
    let cut = n - 1; for (let i = 0; i < n; i++) if (L[i] / total > fl) { cut = i; break; }
    const Pa = P.slice(0, cut + 1);
    if (Pa.length > 1) { ribbon(g, Pa, (i) => width(i) / 2, 0.08, seed); g.fill(); }
    if (cut < n - 1) {
      const N = 9; g.lineCap = 'round';
      for (let j = 0; j < N; j++) {
        const off = (j / (N - 1) - 0.5) * 0.95; const stop = cut + (n - 1 - cut) * (0.3 + 0.7 * H(seed + j * 3.1));
        for (let i = Math.max(1, cut); i < stop; i++) {
          const d = dirAt(P, i); const w = width(i); g.lineWidth = Math.max(0.6, w / N * 1.6);
          g.beginPath(); g.moveTo(P[i - 1][0] - d[1] * off * w, P[i - 1][1] + d[0] * off * w); g.lineTo(P[i][0] - d[1] * off * w, P[i][1] + d[0] * off * w); g.stroke();
        }
      }
    }
  } else if (t === 'chisel') {
    const an = B.an ?? 0.8; const nx = Math.cos(an), ny = Math.sin(an);
    for (let i = 1; i < P.length; i++) {
      const w0 = width(i - 1) / 2, w1 = width(i) / 2; const a = P[i - 1], c = P[i];
      g.beginPath(); g.moveTo(a[0] + nx * w0, a[1] + ny * w0); g.lineTo(c[0] + nx * w1, c[1] + ny * w1); g.lineTo(c[0] - nx * w1, c[1] - ny * w1); g.lineTo(a[0] - nx * w0, a[1] - ny * w0); g.closePath(); g.fill();
    }
  } else if (t === 'felt') {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 1; i < P.length; i++) { g.lineWidth = width(i); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
    // капли на концах (краска собирается, пока перо стоит)
    const w0 = width(0), w1 = width(P.length - 1);
    g.beginPath(); g.arc(P[0][0], P[0][1], w0 * 0.62, 0, 6.283); g.fill(); g.beginPath(); g.arc(P[P.length - 1][0], P[P.length - 1][1], w1 * 0.6, 0, 6.283); g.fill();
    // светлые полосы войлока
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.22 * (1.2 - (B.fl ?? 0.8)); g.lineWidth = Math.max(0.5, wPx * 0.12 * sc);
    for (const off of [-0.22, 0.18]) {
      g.beginPath(); for (let i = 0; i < P.length; i++) { const d = dirAt(P, i); const w = width(i); const x = P[i][0] - d[1] * off * w, y = P[i][1] + d[0] * off * w; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  } else if (t === 'charcoal') {
    const N = 5 + Math.floor((B.fl ?? 0.7) * 6); g.lineCap = 'round';
    for (let j = 0; j < N; j++) {
      const off = (H(seed + j * 2.3) - 0.5) * 0.9; const s0 = H(seed + j * 4.1) * 0.15, s1 = 1 - H(seed + j * 6.7) * 0.2; const hw = 0.35 + 0.5 * H(seed + j);
      g.globalAlpha = 0.45 + 0.4 * H(seed + j * 8.8);
      for (let i = 1; i < P.length; i++) {
        const u = L[i] / total; if (u < s0 || u > s1) continue; if (H(seed + j * 31 + Math.floor(L[i] / (wPx * 0.8 * sc + 1))) < 0.18) continue;
        const d = dirAt(P, i); const w = width(i); const o = off * w; g.lineWidth = Math.max(0.6, w / N * 2.2 * hw);
        g.beginPath(); g.moveTo(P[i - 1][0] - d[1] * o, P[i - 1][1] + d[0] * o); g.lineTo(P[i][0] - d[1] * o + (H(seed + i + j) - 0.5) * w * 0.15, P[i][1] + d[0] * o); g.stroke();
      }
    }
    g.globalAlpha = 1;
  } else if (t === 'spray') {
    // капли с гауссовым разбросом; плотность от потока; размер капли от масштаба; потёки от растекания
    const fl = B.fl ?? 0.5; let next = 0; let k = 0; const step = Math.max(1, wPx * 0.25);
    const gauss = (s) => { let a = 0; for (let q = 0; q < 3; q++) a += H(s + q * 1.37); return (a / 3 - 0.5) * 2; };
    for (let i = 0; i < P.length; i++) {
      if (L[i] < next) continue; next = L[i] + step;
      const w = width(i); const cnt = Math.round(4 + fl * fl * w * 1.4);
      for (let q = 0; q < cnt; q++, k++) {
        const ang = H(seed + k * 1.91) * 6.283; const rad = Math.abs(gauss(seed + k * 3.7)) * w * 0.9;
        const r = Math.max(0.4, (0.35 + H(seed + k * 5.3) * 0.9) * sc * Math.max(0.6, wPx * 0.025));
        g.globalAlpha = 0.4 + 0.6 * H(seed + k * 2.2); g.beginPath(); g.arc(P[i][0] + Math.cos(ang) * rad, P[i][1] + Math.sin(ang) * rad, r, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
    const bl = B.bl ?? 0;
    if (bl > 0.05) {
      const nd = Math.ceil(bl * 6); g.lineCap = 'round';
      for (let q = 0; q < nd; q++) {
        const i = Math.floor(H(seed + q * 7.7) * P.length); const x = P[i][0] + (H(seed + q) - 0.5) * wPx * 0.8; const y = P[i][1]; const len = wPx * (1 + 4 * bl * H(seed + q * 2.9));
        g.lineWidth = Math.max(0.8, wPx * 0.06 * sc); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (H(seed + q * 4) - 0.5) * 2, y + len); g.stroke();
        g.beginPath(); g.arc(x, y + len, g.lineWidth * 0.9, 0, 6.283); g.fill();
      }
    }
  } else if (t === 'eraser') {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 1; i < P.length; i++) { g.lineWidth = width(i); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
  }
}

// холсты-заготовки для одного штриха (по рамке штриха, а не на весь лист)
const pool = [];
function scratch(i, w, h) {
  let c = pool[i]; if (!c) c = pool[i] = document.createElement('canvas');
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, w, h); return [c, g];
}

/**
 * Рисует штрих на ctx.
 * @param ctx  цель (лист или слой)
 * @param s    штрих {pts, pr, w, b, sd}
 * @param S    размер листа в пикселях (координаты 0..1 × S), ox/oy — сдвиг клетки
 * @param color цвет
 * @param opt  { wMul: множитель толщины, mode: режим наложения слоя по умолчанию }
 */
export function drawStroke(ctx, s, S, color, { ox = 0, oy = 0, wMul = 1, sy = S, live = false } = {}) {
  const p = s.pts; const n = p.length / 2; if (!n) return;
  const B = { ...brushOf(s.b?.t ?? 'pen'), ...(s.b ?? {}) }; if (!s.b) { B.pr = 1; B.tp = 1; } if (live) B.live = 1;
  const wPx = Math.max(0.8, s.w * S * wMul);
  const seed = s.sd ?? Math.floor((p[0] * 7.3 + p[1] * 3.1) * 1000);
  let P = []; for (let i = 0; i < n; i++) P.push([p[i * 2] * S, p[i * 2 + 1] * sy, s.pr?.[i] ?? 0.6]);
  if (n === 1) P.push([P[0][0] + 0.01, P[0][1] + 0.01, P[0][2]]);
  P = jitter(P, B.jt ?? 0, wPx, seed % 1000);
  // рамка
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of P) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const blur = (1 - clamp(B.hd ?? 1, 0, 1)) * wPx * 0.6;
  const pad = Math.ceil(wPx * (B.t === 'hatch' ? 16 : B.t === 'tuft' ? 16 : B.t === 'spray' ? 1.6 : 1.2) * Math.max(1, B.sc ?? 1) + blur * 3 + 4 + (B.t === 'spray' ? wPx * 6 * (B.bl ?? 0) : 0));
  const bx = Math.floor(x0 - pad), by = Math.floor(y0 - pad); const bw = Math.ceil(x1 - x0 + pad * 2), bh = Math.ceil(y1 - y0 + pad * 2);
  if (bw <= 0 || bh <= 0 || bw > 8192 || bh > 8192) return;
  for (const q of P) { q[0] -= bx; q[1] -= by; }
  const [c1, g1] = scratch(0, bw, bh);
  // форма штриха — непрозрачная, прозрачность целиком в конце (стыки внутри штриха не темнеют)
  if (OLD.has(B.t)) {
    // старый brushes.js: передаём кисть с o = 1
    let Q = P; if (B.sc && B.sc !== 1 && ['speck', 'scratch', 'hatch', 'tuft'].includes(B.t)) {
      // масштаб узора у старых кистей — рисуем в увеличенном масштабе и сжимаем толщину обратно
      g1.save(); g1.translate(0, 0); oldStroke(g1, Q, wPx * B.sc, { t: B.t, o: 1, pr: B.pr, tp: B.tp, an: B.an, live: B.live }, color); g1.restore();
    } else oldStroke(g1, Q, wPx, { t: B.t, o: 1, pr: B.pr, tp: B.tp, an: B.an, live: B.live }, color);
  } else {
    drawNew(g1, P, wPx, B, B.t === 'eraser' ? '#000' : color, seed % 1000);
  }
  let src = c1;
  if (blur > 0.3) { const [c2, g2] = scratch(1, bw, bh); g2.filter = `blur(${blur.toFixed(2)}px)`; g2.drawImage(c1, 0, 0); g2.filter = 'none'; src = c2; }
  const gr = B.gr ?? 0;
  if (gr > 0.01) {
    const g = src.getContext('2d'); const pat = g.createPattern(grainCanvas(), 'repeat');
    const k = Math.max(0.25, (B.sc ?? 1) * S / 1024); pat.setTransform?.(new DOMMatrix().translate(-bx, -by).scale(k, k));
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = Math.min(1, gr * 1.1); g.fillStyle = pat; g.fillRect(0, 0, bw, bh); g.restore();
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(B.o ?? 1, 0.02, 1);
  ctx.globalCompositeOperation = B.t === 'eraser' ? 'destination-out' : (s.m ?? KIT[B.t]?.mode ?? 'source-over');
  ctx.drawImage(src, 0, 0, bw, bh, bx + ox, by + oy, bw, bh);
  ctx.restore();
}

// маска перехода из старой витрины: {val 0/1, a, w, pts} — круглая линия белым/чёрным
export function drawMaskStroke(ctx, s, S, { ox = 0, oy = 0 } = {}) {
  const p = s.pts; const n = p.length / 2; if (!n) return;
  ctx.save(); ctx.strokeStyle = ctx.fillStyle = s.val ? '#fff' : '#000'; ctx.globalAlpha = s.a ?? 1; ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1, s.w * S);
  ctx.beginPath(); ctx.moveTo(ox + p[0] * S, oy + p[1] * S); for (let i = 1; i < n; i++) ctx.lineTo(ox + p[i * 2] * S, oy + p[i * 2 + 1] * S); ctx.stroke(); ctx.restore();
}
