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
  // кисти по видео a_iwaac (2.5D)
  flat:   { name: 'Плоская (грань)', o: 1,   pr: 0.3, tp: 0,   size: 20, hint: 'Плоское пятно с прямыми краями: ширина держится ступенями, внутри светлая полоса со стороны света.' },
  shard:  { name: 'Осколок',       o: 1,    pr: 0,   tp: 0,   size: 18, an: 0.5, hint: 'Рваная лента-осколок со срезанными концами и полосками «зебра» внутри (как у гитары).' },
  hatch:  { name: 'Штриховка от края', o: 1, pr: 0.6, tp: 0.7, size: 2, an: 1.57, hint: 'Ведёте по ребру: от него отходят штрихи под углом и обрываются на разной длине.' },
  tuft:   { name: 'Пучок травы',   o: 1,    pr: 0.5, tp: 1,   size: 3,  an: -1.57, hint: 'Вдоль линии растут пучки по 2–4 травинки, острые кончики.' },
  speck:  { name: 'Крапинки',      o: 0.9,  pr: 0.4, tp: 0,   size: 4,  hint: 'Россыпь точек вдоль линии: крошки, пыль, фактура.' },
  scratch:{ name: 'Царапина',      o: 1,    pr: 0.5, tp: 1,   size: 2,  hint: 'Короткие изогнутые чёрточки-процарапы.' },
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
  if (['flat', 'shard', 'hatch', 'tuft', 'speck', 'scratch'].includes(b?.t)) P = resample(P, Math.max(2, wPx * 0.5));
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
  } else if (t === 'flat') {
    // ширина держится ступенями (каждые 1,5 ширины новая), края прямые, светлая полоса с одной стороны
    g.lineJoin = 'miter'; const half = []; let cw = 1;
    for (let i = 0; i < n; i++) { if (i === 0 || Math.floor(L[i] / (wPx * 1.5)) !== Math.floor(L[i - 1] / (wPx * 1.5))) cw = 0.85 + 0.3 * H(seed + Math.floor(L[i] / (wPx * 1.5)) * 3.7); half.push(width(i) / 2 * cw); }
    const side = (k) => P.map((p, i) => { const d = dir(i); return [p[0] - d[1] * half[i] * k, p[1] + d[0] * half[i] * k]; });
    const A = side(1), Bs = side(-1); g.beginPath(); A.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); for (let i = n - 1; i >= 0; i--) g.lineTo(Bs[i][0], Bs[i][1]); g.closePath(); g.fill();
    // светлая полоса: вырезаем узкую ленту у верхнего края — в маске это просвет, на модели — свет внутри мазка
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.35;
    const C = side(0.55), D = side(0.25); g.beginPath(); C.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); for (let i = n - 1; i >= 0; i--) g.lineTo(D[i][0], D[i][1]); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  } else if (t === 'shard') {
    // осколок: рваные края (сколы на каждом шаге), концы срезаны наискось, внутри продольные полоски-просветы
    const half = P.map((p, i) => width(i) / 2);
    const edge = (k) => P.map((p, i) => { const d = dir(i); const j = 0.4 + 0.8 * H(seed + i * (k > 0 ? 2.1 : 4.3)); return [p[0] - d[1] * half[i] * j * k, p[1] + d[0] * half[i] * j * k]; });
    const A = edge(1), Bs = edge(-1); const cut = (B.an ?? 0.5) * wPx;
    const d0 = dir(0), d1 = dir(n - 1);
    A[0] = [A[0][0] + d0[0] * cut, A[0][1] + d0[1] * cut]; Bs[n - 1] = [Bs[n - 1][0] - d1[0] * cut, Bs[n - 1][1] - d1[1] * cut];
    g.beginPath(); A.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); for (let i = n - 1; i >= 0; i--) g.lineTo(Bs[i][0], Bs[i][1]); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'butt';
    const ns = 3 + Math.floor(H(seed + 9.1) * 4);
    for (let k = 0; k < ns; k++) {
      const off = (H(seed + k * 5.3) - 0.5) * 0.8; const a = H(seed + k * 7.1) * 0.6, b2 = a + 0.2 + H(seed + k * 2.9) * 0.4;
      g.lineWidth = Math.max(minW, wPx * 0.08); g.beginPath(); let on = false;
      for (let i = 0; i < n; i++) { const u = L[i] / total; if (u < a || u > b2) continue; const d = dir(i); const x = P[i][0] - d[1] * half[i] * off * 2, y = P[i][1] + d[0] * half[i] * off * 2; on ? g.lineTo(x, y) : g.moveTo(x, y); on = true; }
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  } else if (t === 'hatch') {
    // штрихи отходят от линии-ребра под углом an, длина 40–100%, сужаются к дальнему концу
    const an = B.an ?? 1.57; const len = wPx * 14; const gap = wPx * 2.2; g.lineCap = 'round';
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (L[i] < next) continue; next = L[i] + gap * (0.8 + 0.4 * H(seed + i));
      const d = dir(i); const ca = Math.cos(an), sa = Math.sin(an); const hx = d[0] * ca - d[1] * sa, hy = d[0] * sa + d[1] * ca;
      const l = len * (0.4 + 0.6 * H(seed + i * 3.3)); const w0 = width(i);
      for (let k = 0; k < 4; k++) { const u0 = k / 4, u1 = (k + 1) / 4; g.lineWidth = Math.max(minW, w0 * (u1 < 0.6 ? 1 : 1 - (u1 - 0.6) / 0.45)); g.beginPath(); g.moveTo(P[i][0] + hx * l * u0, P[i][1] + hy * l * u0); g.lineTo(P[i][0] + hx * l * u1, P[i][1] + hy * l * u1); g.stroke(); }
    }
  } else if (t === 'tuft') {
    // пучки травы: 2–4 изогнутые травинки, острые кончики
    const an = B.an ?? -1.57; let next = 0;
    for (let i = 0; i < n; i++) {
      if (L[i] < next) continue; next = L[i] + wPx * 4 * (0.7 + 0.6 * H(seed + i));
      const nb = 2 + Math.floor(H(seed + i * 1.9) * 3);
      for (let k = 0; k < nb; k++) {
        const a = an + (H(seed + i * 7 + k) - 0.5) * 0.9; const l = wPx * (6 + 8 * H(seed + i * 3 + k)); const bend = (H(seed + i * 5 + k) - 0.5) * 0.6 * l;
        const x0 = P[i][0] + (k - nb / 2) * wPx * 0.6, y0 = P[i][1]; const tx = x0 + Math.cos(a) * l, ty = y0 + Math.sin(a) * l;
        const cx = (x0 + tx) / 2 - Math.sin(a) * bend, cy = (y0 + ty) / 2 + Math.cos(a) * bend; const w = width(i) * 0.9;
        g.beginPath(); g.moveTo(x0 - Math.sin(a) * w, y0 + Math.cos(a) * w); g.quadraticCurveTo(cx, cy, tx, ty); g.quadraticCurveTo(cx, cy, x0 + Math.sin(a) * w, y0 - Math.cos(a) * w); g.closePath(); g.fill();
      }
    }
  } else if (t === 'speck') {
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (L[i] < next) continue; next = L[i] + wPx * 2;
      const d = dir(i); const m = 1 + Math.floor(H(seed + i) * 3);
      for (let k = 0; k < m; k++) { const o = (H(seed + i * 3 + k) - 0.5) * 3 * wPx; const r = Math.max(minW / 2, width(i) * (0.15 + 0.2 * H(seed + i * 5 + k))); g.beginPath(); g.arc(P[i][0] - d[1] * o + (H(seed + k + i * 9) - 0.5) * wPx, P[i][1] + d[0] * o, r, 0, Math.PI * 2); g.fill(); }
    }
  } else if (t === 'scratch') {
    // короткие изогнутые чёрточки вдоль линии
    g.lineCap = 'round'; let next = 0;
    for (let i = 1; i < n; i++) {
      if (L[i] < next) continue; const l = wPx * (3 + 3 * H(seed + i)); next = L[i] + l * 1.4;
      const d = dir(i); const bend = (H(seed + i * 2.7) - 0.5) * l * 0.5; const x0 = P[i][0], y0 = P[i][1]; const x1 = x0 + d[0] * l, y1 = y0 + d[1] * l;
      g.lineWidth = Math.max(minW, width(i)); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 - d[1] * bend, (y0 + y1) / 2 + d[0] * bend, x1, y1); g.stroke();
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
