// Кисти для «Почеркушек»: одна функция рисует штрих и в редакторе, и в атласах для стиля,
// поэтому то, что нарисовано пером, тушью или маркером, так же выглядит в эффектах.
// Штрих: { w (толщина, доля поля), p: [[x, y, нажим]], b: { t, o, pr, tp, an } }
//   t  — тип кисти, o — непрозрачность, pr — влияние нажима, tp — сужение кончиков, an — угол плоского пера (рад).

export const BRUSHES = {
  pen:    { name: 'Перо',          o: 1,    pr: 0.8, tp: 0.8, size: 5,  hint: 'Обычная линия с нажимом и сужением.' },
  ink:    { name: 'Тушь',          o: 1,    pr: 1,   tp: 1,   size: 7,  hint: 'Сильный нажим, острые кончики, капля туши в начале.' },
  nib:    { name: 'Плоское перо',  o: 1,    pr: 0.5, tp: 0.6, size: 10, an: 0.6, hint: 'Каллиграфия: толщина зависит от направления.' },
  marker: { name: 'Маркер',        o: 0.7,  pr: 0,   tp: 0,   size: 12, hint: 'Ровная ширина, полупрозрачный, без накладок внутри штриха.' },
  brush:  { name: 'Широкая кисть', o: 0.9,  pr: 0.6, tp: 0.5, size: 26, hint: 'Ворс: видны полосы от волосков, рваные концы.' },
  dry:    { name: 'Сухая кисть',   o: 0.85, pr: 0.5, tp: 0.4, size: 22, hint: 'Ворс с пропусками, как почти пустая кисть.' },
  pencil: { name: 'Карандаш',      o: 0.8,  pr: 0.7, tp: 0.3, size: 3,  hint: 'Тонкая зернистая линия.' },
};
// у старых штрихов кисти нет: рисуются как раньше (полный нажим и сужение)
export const DEFAULT_BRUSH = { t: 'pen', o: 1, pr: 1, tp: 1, an: 0.6 };

const H = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let tmp = null;
function tmpFor(ctx) {
  const c = ctx.canvas; if (!tmp) tmp = document.createElement('canvas');
  if (tmp.width !== c.width || tmp.height !== c.height) { tmp.width = c.width; tmp.height = c.height; }
  const t = tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, tmp.width, tmp.height); t.setTransform(ctx.getTransform()); return t;
}

// P — точки в пикселях [[x, y, нажим]], wPx — толщина в пикселях. b — кисть (см. выше).
export function renderStroke(ctx, P, wPx, b, color, { minW = 0.6 } = {}) {
  if (P.length < 2) return;
  // ворс и карандаш — по частым точкам, иначе волоски рубятся на отрезки
  if (['brush', 'dry', 'pencil'].includes(b?.t)) P = resample(P, Math.max(3, Math.min(6, wPx * 0.25)));
  const n = P.length;
  const B = { ...DEFAULT_BRUSH, ...(b ?? {}) }; const t = B.t in BRUSHES ? B.t : 'pen';
  const o = Math.max(0.05, Math.min(1, B.o ?? 1));
  // непрозрачная — прямо; полупрозрачная — через временный холст, чтобы стыки внутри штриха не темнели
  const g = o < 0.999 ? tmpFor(ctx) : ctx;
  g.save(); g.fillStyle = color; g.strokeStyle = color; g.globalAlpha = 1;
  const seed = Math.floor((P[0][0] * 7.3 + P[0][1] * 3.1) * 100);
  const L = []; let acc = 0; for (let i = 0; i < n; i++) { if (i) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(acc); }
  const total = acc || 1;
  const k = t === 'ink' ? 4 : 6;
  const width = (i) => {
    const u = L[i] / total; const pf = 1 - B.pr + B.pr * (0.35 + 0.9 * P[i][2]);
    const taper = 1 - B.tp + B.tp * Math.min(1, Math.min(u, 1 - u) * k + 0.25);
    return Math.max(minW, wPx * pf * taper);
  };
  const dir = (i) => { const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)]; const dx = c[0] - a[0], dy = c[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  if (t === 'marker') {
    g.lineCap = 'square'; g.lineJoin = 'round'; g.lineWidth = Math.max(minW, wPx);
    g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) g.lineTo(P[i][0], P[i][1]); g.stroke();
  } else if (t === 'nib') {
    const an = B.an ?? 0.6; const nx = Math.cos(an), ny = Math.sin(an);
    for (let i = 1; i < n; i++) {
      const w0 = width(i - 1) / 2, w1 = width(i) / 2; const a = P[i - 1], c = P[i];
      g.beginPath(); g.moveTo(a[0] + nx * w0, a[1] + ny * w0); g.lineTo(c[0] + nx * w1, c[1] + ny * w1); g.lineTo(c[0] - nx * w1, c[1] - ny * w1); g.lineTo(a[0] - nx * w0, a[1] - ny * w0); g.closePath(); g.fill();
    }
  } else if (t === 'brush' || t === 'dry') {
    // ворс: волоски поперёк штриха, у каждого свой нажим, длина и пропуски
    const N = t === 'dry' ? 11 : 8; const dry = t === 'dry' ? 0.42 : 0.03;
    g.lineCap = 'round';
    for (let j = 0; j < N; j++) {
      const off = (j / (N - 1) - 0.5) * (t === 'dry' ? 1.0 : 0.9); const s0 = H(seed + j * 3.1) * 0.12, s1 = 1 - H(seed + j * 5.7) * 0.15;
      const hair = 0.45 + 0.55 * H(seed + j * 1.3);
      for (let i = 1; i < n; i++) {
        const u = L[i] / total; if (u < s0 || u > s1) continue;
        if (H(seed + j * 17 + Math.floor(L[i] / (wPx * 1.2 + 1))) < dry * (0.6 + u)) continue;
        const w = width(i), d = dir(i); const px = -d[1], py = d[0];
        const ow = off * w; g.lineWidth = Math.max(minW, (w / N) * 1.7 * hair);
        g.beginPath(); g.moveTo(P[i - 1][0] + px * ow, P[i - 1][1] + py * ow); g.lineTo(P[i][0] + px * ow, P[i][1] + py * ow); g.stroke();
      }
    }
  } else if (t === 'pencil') {
    g.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const w = width(i); g.globalAlpha = 0.45 + 0.55 * H(seed + i * 1.7);
      const jx = (H(seed + i * 2.3) - 0.5) * w * 0.5, jy = (H(seed + i * 4.1) - 0.5) * w * 0.5;
      g.lineWidth = w; g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0] + jx, P[i][1] + jy); g.stroke();
    }
    g.globalAlpha = 1;
  } else {
    g.lineCap = 'round';
    for (let i = 1; i < n; i++) { g.lineWidth = width(i); g.beginPath(); g.moveTo(P[i - 1][0], P[i - 1][1]); g.lineTo(P[i][0], P[i][1]); g.stroke(); }
    if (t === 'ink') { const w = width(Math.min(2, n - 1)); g.beginPath(); g.arc(P[0][0], P[0][1], w * 0.75, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  if (g !== ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = o; ctx.drawImage(g.canvas, 0, 0); ctx.restore(); }
}

function resample(P, step) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], c = P[i]; const d = Math.hypot(c[0] - a[0], c[1] - a[1]); const k = Math.max(1, Math.ceil(d / step));
    for (let j = 1; j <= k; j++) { const t = j / k; out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]); }
  }
  return out;
}
