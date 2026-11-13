// Каталог построек «Сказанья»: древняя Русь и хтонь. Каждая постройка — функция-строитель,
// которая складывает детали в Kit по этапам (1 основание, 2 стены, 3 кровля, finish — детали готового)
// и знает свой заброшенный вид (c.ab). Фасад смотрит на +z. Правила реализма:
// всё на что-то опирается (валуны, столбы, стулья), у каждой двери косяки, порог и ручка,
// к каждому входу можно подойти, кровля сидит на стенах, трубы и главы выходят из кровли.
import * as THREE from 'three';
import { Kit, PAT, KIND, COL } from './kit.js';
import { Props as F } from './props.js';

const PI = Math.PI;

// Категории нижней панели
export const CATEGORIES = [
  { id: 'home', name: 'Жильё', icon: '⌂' },
  { id: 'craft', name: 'Хозяйство', icon: '⚒' },
  { id: 'yard', name: 'Двор', icon: '⚱' },
  { id: 'trade', name: 'Торг', icon: '⚖' },
  { id: 'faith', name: 'Вера', icon: '☦' },
  { id: 'chthon', name: 'Хтонь и обряды', icon: '☉' },
  { id: 'defense', name: 'Оборона и пути', icon: '⛫' },
];

// Уровни развития: пороги по жителям/вере, что открывают
export const TIERS = [
  { id: 0, name: 'Хутор', need: {} },
  { id: 1, name: 'Деревня', need: { people: 20 } },
  { id: 2, name: 'Село', need: { people: 50, faith: 10 } },
  { id: 3, name: 'Посад', need: { people: 100, faith: 25 } },
];

// ---------- общие куски ----------
function roofLook(c, def = 0) {
  const v = (c.v + def) % 4;
  if (c.ab) return { color: COL.shingleOld, pat: v === 1 ? PAT.thatch : PAT.shingles };
  return [{ color: COL.shingle, pat: PAT.shingles }, { color: COL.thatch, pat: PAT.thatch }, { color: COL.shingleBlue, pat: PAT.shingles }, { color: 0x6a5040, pat: PAT.planks }][v];
}
const nalCol = (c) => c.ab ? COL.plankOld : [COL.white, COL.white, 0x6f93a8, COL.red][c.v % 4];
const logCol = (c) => c.ab ? COL.logOld : [COL.log, 0x7d5232, 0x93633c, 0x845838][c.v % 4];
const stoneCol = (k) => new THREE.Color(COL.stone).offsetHSL(k.rr(-0.02, 0.02), k.rr(-0.05, 0.03), k.rr(-0.06, 0.04)).getHex();

// Запустение: бурьян, крапива, упавшее бревно, обломки
function weeds(k, c, w, d, n = 8) {
  const st = k.stage; k.stage = 1;
  for (let i = 0; i < n; i++) {
    const side = k.rand() < 0.5, x = side ? k.rr(-w / 2, w / 2) : k.pick([-1, 1]) * (w / 2 + k.rr(0, 0.6)), z = side ? k.pick([-1, 1]) * (d / 2 + k.rr(0, 0.6)) : k.rr(-d / 2, d / 2);
    k.lumpBox(x, -0.05, z, k.rr(0.5, 1.1), k.rr(0.35, 0.9), k.rr(0.5, 1.0), { color: k.pick([0x55683a, 0x4a5a34, 0x6a7040, 0x5c5a32]), pat: PAT.leaf, amp: 0.12, cell: 0.25, sway: 0.03, swayBase: 0 });
  }
  k.log(k.rr(-w / 3, w / 3), 0.15, d / 2 + 0.9, 0.14, k.rr(1.5, 3), { color: COL.logOld, ry: k.rr(-0.6, 0.6) });
  for (let i = 0; i < 3; i++) k.box(k.rr(-w / 2, w / 2), 0.02, k.rr(-d / 2, d / 2) + d * 0.6, k.rr(0.8, 1.6), 0.04, 0.22, { color: COL.plankOld, pat: PAT.planks, ry: k.rr(0, PI), rz: k.rr(-0.1, 0.1) });
  k.stage = st;
}
// Печная труба: плинфа, кривая кладка, расширение-«дымник» сверху, лёгкий завал
function chimney(k, c, x, y, z, h) {
  const hh = c.ab ? h * 0.6 : h, lean = k.rr(-0.04, 0.04);
  k.lumpBox(x, y, z, 0.62, hh, 0.62, { color: c.ab ? 0x6a5a50 : 0x8a5a44, pat: PAT.plinfa, stage: 3, amp: 0.025, cell: 0.3, rz: lean });
  if (!c.ab) {
    k.lumpBox(x - Math.sin(lean) * hh, y + hh, z, 0.8, 0.14, 0.8, { color: 0x7a5040, pat: PAT.plinfa, stage: 3, amp: 0.02, rz: lean });
    k.lumpBox(x - Math.sin(lean) * hh, y + hh + 0.14, z, 0.5, 0.18, 0.5, { color: 0x6a4434, pat: PAT.plinfa, stage: 3, amp: 0.02, rz: lean });
    c.fx.push({ t: 'smoke', x: x - Math.sin(lean) * hh, y: y + hh + 0.4, z });
  }
}
function windowsRow(k, c, xs, y, z, ry = 0, o = {}) {
  for (const x of xs) {
    const lit = !c.ab && k.rand() < 0.75;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const yy = y + k.rr(-0.04, 0.04);  // окна врезаны «на глаз»
    k.window(x * cs + z * sn, yy, -x * sn + z * cs, ry, { nal: nalCol(c), boarded: c.ab && k.rand() < 0.7, dark: !lit, shutters: o.shutters ?? (c.v % 2 === 1), ...o });
    if (lit) c.fx.push({ t: 'glow', x: x * cs + (z + 0.4) * sn, y: yy + 0.35, z: -x * sn + (z + 0.4) * cs, r: 1.0 });
  }
}
// Охлупень с конской головой на фасадном щипце (конёк вдоль z)
function konyok(k, c, z, y) {
  const st = { stage: 3, color: c.ab ? COL.logOld : COL.logDark, pat: PAT.bark };
  k.box(0, y - 0.1, z - 0.3, 0.22, 0.5, 0.8, { ...st, rx: -0.55 });
  k.box(0, y + 0.22, z + 0.08, 0.2, 0.42, 0.24, { ...st, rx: -0.25 });
  k.box(0, y + 0.52, z + 0.2, 0.18, 0.16, 0.36, st);            // морда
  for (const s of [-1, 1]) k.box(s * 0.05, y + 0.6, z + 0.04, 0.04, 0.14, 0.05, st); // уши
}
// Крыльцо у боковой стены: площадка на столбах с валунами, лестница с тетивами до земли, перила
// с балясинами, кровелька на двух резных столбах, дверь с косяками. side: +1 — стена +x.
function porch(k, c, wallX, z, base, side = 1, o = {}) {
  const st0 = k.stage; k.stage = 2;
  const pd = o.pd ?? 1.4, pw = o.pw ?? 1.9, R = (lx) => wallX + side * lx;
  const plank = c.ab ? COL.plankOld : COL.plank;
  // столбы-стулья под площадкой на валунах
  for (const lx of [0.15, pd - 0.12]) for (const lz of [-pw / 2 + 0.12, pw / 2 - 0.12]) {
    k.rock(R(lx), 0.02, z + lz, 0.2, { color: stoneCol(k), stage: 1 });
    k.cyl(R(lx), 0.05, z + lz, 0.09, base - 0.1, { color: COL.logDark, pat: PAT.logs, seg: 6 });
  }
  k.box(R(pd / 2), base - 0.14, z, pd, 0.14, pw, { color: plank, pat: PAT.planks, ry: PI / 2 });
  // лестница наружу, ступени на тетивах, последняя на земле
  const n = Math.max(1, Math.round(base / 0.19)), rise = base / (n + 0.0001), run = 0.3;
  for (let i = 0; i < n; i++) {
    const y = base - (i + 1) * rise;
    k.box(R(pd + i * run + run / 2), Math.max(0, y - 0.05), z, run + 0.04, 0.07, pw - 0.5, { color: plank, pat: PAT.planks, ry: PI / 2 });
  }
  const sl = Math.hypot(n * run, base);
  for (const lz of [-(pw - 0.5) / 2, (pw - 0.5) / 2]) k.box(R(pd + n * run), 0, z + lz, 0.06, sl, 0.22, { color: COL.logDark, pat: PAT.planks, rz: side * Math.atan2(n * run, base), jitter: 0, stage: 2 }); // тетива: от земли к площадке
  // перила с балясинами на сторонах площадки
  for (const lz of [-pw / 2 + 0.05, pw / 2 - 0.05]) {
    for (let i = 0; i <= 4; i++) k.cyl(R(0.15 + (pd - 0.25) * i / 4), base, z + lz, 0.035, 0.8, { color: nalCol(c), pat: PAT.plain, seg: 5, stage: 3 });
    k.box(R(pd / 2), base + 0.8, z + lz, pd, 0.07, 0.09, { color: nalCol(c), pat: PAT.planks, ry: PI / 2, stage: 3 });
  }
  k.door(wallX + side * 0.03, base, z, side * PI / 2, { w: o.dw ?? 0.85, h: o.dh ?? 1.75, nal: nalCol(c), open: c.ab ? 0.6 : (o.open ?? 0) });
  // кровелька: два резных столба на площадке, конёк от стены наружу
  k.stage = 3;
  for (const lz of [-pw / 2 + 0.12, pw / 2 - 0.12]) {
    k.cyl(R(pd - 0.12), base, z + lz, 0.08, 2.15, { color: COL.logDark, pat: PAT.logs, seg: 6 });
    k.cyl(R(pd - 0.12), base + 0.9, z + lz, 0.12, 0.35, { color: COL.logDark, pat: PAT.plain, seg: 8, r2: 0.06 }); // «кубышка» на столбе
  }
  k.gable(R(pd / 2 - 0.05), base + 2.15, z, pd + 0.2, pw + 0.1, 0.7, { ry: PI / 2 * side + (side > 0 ? 0 : PI), ...roofLook(c), over: 0.15, th: 0.08, hole: c.ab ? 0.4 : 0, ridge: false, gableColor: nalCol(c), eaves: false });
  k.stage = st0;
}

// Изба: сруб на валунах, завалинка, щипец из «самцов» на улицу, курицы и потоки, наличники, причелины
// и полотенце, печная труба или дымник, крыльцо с лестницей, двор за избой.
function izba(k, c, o = {}) {
  const W = o.W ?? 5, D = o.D ?? 5, H = o.H ?? 2.6, base = o.base ?? 0.5, RH = o.RH ?? 2.3;
  const lc = logCol(c);
  if (!o.noFooting) { k.stage = 1; k.footing(0, 0, 0, W, D, base); }
  k.stage = 2;
  k.srub(0, base, 0, W, D, H, { color: lc, gap: c.ab ? (i, sz) => i > 5 && k.rand() < 0.35 : null });
  // завалинка: земляной вал в дощатой обшивке, местами осел
  if (!o.noZaval) for (const [zx, zz, ww, rr] of [[0, D / 2 + 0.22, W - 0.2, 0], [0, -D / 2 - 0.22, W - 0.2, PI], [-W / 2 - 0.22, 0, D - 0.2, -PI / 2]])
    k.lumpBox(zx, 0, zz, ww, base + 0.3, 0.42, { color: c.ab ? COL.plankOld : 0x7a5638, pat: PAT.planks, ry: rr, rx: -0.2, amp: 0.03, cell: 0.4 });
  windowsRow(k, c, o.wins ?? [-1.25, 0, 1.25], base + 1.05, D / 2 + 0.05);
  windowsRow(k, c, [-0.8], base + 1.05, W / 2, PI / 2);
  k.stage = 3;
  const rl = roofLook(c);
  k.gable(0, base + H, 0, D + 0.7, W, RH, { ry: PI / 2, ...rl, hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.1 : 0, logGable: lc, gableAt: D / 2 - 0.15, kuricy: !c.ab && rl.pat !== PAT.thatch });
  // светёлка в щипце
  k.window(0, base + H + 0.5, D / 2 + 0.02, 0, { w: 0.45, h: 0.5, nal: nalCol(c), boarded: c.ab, dark: c.ab, stage: 3 });
  // причелины от свеса к коньку и полотенце
  for (const s of [-1, 1]) k.box(s * (W / 2 + 0.3), base + H - 0.14, D / 2 + 0.4, 0.22, Math.hypot(W / 2 + 0.3, RH + 0.14), 0.06, { color: nalCol(c), pat: PAT.carved, rz: s * Math.atan2(W / 2 + 0.3, RH + 0.14), stage: 3 });
  if (!c.ab || k.rand() < 0.5) konyok(k, c, D / 2 + 0.55, base + H + RH + 0.1);
  const eaveY = base + H - RH * 0.45 / (W / 2) + 0.05;
  for (const sx of [-1, 1]) if (!c.ab || k.rand() < 0.5) k.lace(sx * (W / 2 + 0.38), eaveY, -D / 2 - 0.4, sx * (W / 2 + 0.38), D / 2 + 0.4, 0.26, { color: nalCol(c), stage: 3 });
  k.box(0, base + H + RH - 1.05, D / 2 + 0.44, 0.32, 0.95, 0.05, { color: nalCol(c), pat: PAT.carved, stage: 3 });
  if (c.v % 2 === 0) chimney(k, c, -W * 0.18, base + H * 0.5, -D * 0.12, RH + 1.4);
  else { // курная изба: дымник на коньке
    k.box(0, base + H + RH - 0.1, -D * 0.2, 0.6, 0.55, 0.6, { color: COL.logDark, pat: PAT.planks, stage: 3 });
    k.gable(0, base + H + RH + 0.45, -D * 0.2, 0.9, 0.9, 0.35, { ...roofLook(c), over: 0.1, th: 0.05, gables: false, ridge: false, eaves: false, stage: 3 });
    if (!c.ab) c.fx.push({ t: 'smoke', x: 0, y: base + H + RH + 0.6, z: -D * 0.2 });
  }
  if (!o.noPorch) porch(k, c, W / 2, -D * 0.18, base);
  // двор: поленница у задней стены, колода, бочка под водостоком, лавка у окон, утварь, стог, плетень
  k.stage = 4; k.kind = KIND.finish;
  if (!c.ab) {
    F.woodpile(k, -0.4, 0, -D / 2 - 0.5, { len: W - 1.4, h: 1.2, dep: 0.45 });
    F.barrel(k, W / 2 + 0.15, 0, D / 2 + 0.45, { r: 0.3, h: 0.78 });
    F.bench(k, -0.8, 0, D / 2 + 0.62, { len: 1.6 });
    F.chopBlock(k, -W / 2 - 0.9, 0, -D / 2 - 0.5);
    F.tool(k, -W / 2 - 0.25, 0, D / 2 - 1.2, { ry: -PI / 2, lean: 0.22, type: k.pick(['rake', 'fork']) });
    if (o.yard !== false) {
      F.haystack(k, -W / 2 - 0.95, 0, D / 2 - 0.6, { r: 0.75, h: 2.2 });
      k.pleten(-W / 2 - 1.85, D / 2 + 0.6, -W / 2 - 1.85, -D / 2 - 1.3, 1.0);
      k.pleten(-W / 2 - 1.85, -D / 2 - 1.3, W / 2 - 0.4, -D / 2 - 1.3, 1.0);
      for (let i = 0; i < 3; i++) F.pot(k, -W / 2 - 1.85, 1.12 + 0.1 * (i % 2), D / 2 - 0.6 - i * 1.1, { type: 'krinka', rx: PI, s: 0.9 }); // кринки сушатся на кольях
    }
    F.bucket(k, W / 2 + 0.6, 0, D / 2 + 0.1);
  } else {
    F.barrel(k, W / 2 + 0.4, 0, D / 2 + 0.8, { r: 0.3, h: 0.78, lying: true, ry: 0.6 });
    k.pleten(-W / 2 - 1.85, D / 2 + 0.6, -W / 2 - 1.85, -D / 2 - 1.3, 0.9, { broken: 0.45 });
  }
  k.kind = KIND.normal;
  if (c.ab) weeds(k, c, W, D, 10);
}

// ---------- каталог ----------
export const BUILDINGS = [
  // ===== Жильё =====
  {
    id: 'zemlyanka', name: 'Полуземлянка', cat: 'home', size: [6, 6], tier: 0, cost: { silver: 10, wood: 6 }, effect: { people: 3 }, time: 8, H: 2,
    desc: 'Сруб, врытый в землю, кровля дёрном. Вход по земляным ступеням. Первое жильё хутора.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.3, 0, 4.6, 0.55, 4.6, { color: COL.earth, pat: PAT.earth, amp: 0.1, cell: 0.4 });
      k.stage = 2; k.srub(0, 0, 0, 3.8, 3.8, 0.9, { color: logCol(c) });
      k.door(0, 0, 1.92, 0, { h: 0.95, w: 0.75, carved: false, open: c.ab ? 0.7 : 0 });
      for (const s of [-1, 1]) k.lumpBox(s * 0.85, 0, 2.5, 0.6, 0.5, 1.4, { color: COL.earth, pat: PAT.earth, amp: 0.08 });
      k.stage = 3;
      k.gable(0, 0.9, 0, 4.4, 4.0, 1.7, { ry: PI / 2, color: c.ab ? 0x4e5236 : 0x5c6a3a, pat: PAT.moss, over: 0.5, th: 0.3, hole: c.ab ? 0.4 : 0, gableColor: logCol(c), eaves: false });
      for (let i = 0; i < 6; i++) k.lumpBox(k.rr(-1.5, 1.5), 1.3 + k.rr(0, 0.6), k.rr(-1.5, 1.5), 0.6, 0.25, 0.5, { color: 0x56683a, pat: PAT.moss, amp: 0.08, stage: 3 });
      if (!c.ab) { c.fx.push({ t: 'smoke', x: 0.6, y: 2.7, z: -0.4 }, { t: 'glow', x: 0, y: 0.6, z: 2.3, r: 0.8 }); k.kind = KIND.finish; k.stage = 4; F.woodpile(k, -2.6, 0, 0, { len: 2.4, h: 0.9, ry: PI / 2, roof: false }); F.chopBlock(k, 2.4, 0, 1.6); k.kind = 0; }
      else weeds(k, c, 4, 4, 8);
    },
  },
  {
    id: 'izba', name: 'Изба', cat: 'home', size: [9, 8], tier: 0, cost: { silver: 25, wood: 20 }, effect: { people: 5 }, time: 12, H: 3.2,
    desc: 'Рубленая изба на валунах, щипец на улицу, курицы и потоки, резные наличники, крыльцо, двор с поленницей.',
    build(k, c) { izba(k, c); },
  },
  {
    id: 'pyatistenok', name: 'Изба-пятистенок', cat: 'home', size: [11, 10], tier: 1, cost: { silver: 45, wood: 34, stone: 6 }, effect: { people: 9 }, time: 16, H: 4.4,
    desc: 'Большая изба на бутовом подклете с продухами, пятая стена выведена наружу, высокое крыльцо.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, 0, 0, 7.3, 1.2, 6.3, { color: stoneCol(k), pat: PAT.stone, amp: 0.05, cell: 0.35 });
      for (const x of [-2.4, 0, 2.4]) { k.box(x, 0.35, 3.13, 0.5, 0.35, 0.1, { color: 0x100a08, pat: PAT.dark }); k.box(x, 0.32, 3.16, 0.62, 0.06, 0.12, { color: COL.stoneDark, pat: PAT.plain }); }
      izba(k, c, { W: 7, D: 6, H: 3, base: 1.2, RH: 2.9, wins: [-2.4, -1.2, 1.2, 2.4], noFooting: true, noZaval: true, yard: false });
      k.stage = 2; for (let i = 0; i < 9; i++) k.log(0, 1.2 + 0.16 + i * 0.33, 3.0 - 0.0, 0.15, 0.6, { color: logCol(c), ry: PI / 2 }); // торцы пятой стены
      if (!c.ab) { k.stage = 4; k.kind = KIND.finish; F.cart(k, -4.0, 0, 4.25, { ry: PI + 0.08, load: 'sacks' }); F.haystack(k, -4.3, 0, -3.9, { r: 0.95, h: 2.6 }); k.kind = 0; }
    },
  },
  {
    id: 'terem', name: 'Терем', cat: 'home', size: [12, 12], maxSlope: 2.5, tier: 2, cost: { silver: 120, wood: 70, stone: 20 }, effect: { people: 14, faith: 1 }, time: 26, H: 9,
    desc: 'Двухъярусный терем на бутовом подклете, гульбище с балясинами, всходная лестница, шатровая башенка.',
    build(k, c) {
      const lc = logCol(c), rl = roofLook(c, 2);
      k.stage = 1; k.lumpBox(0, 0, 0, 7.4, 1.2, 7.4, { color: stoneCol(k), pat: PAT.stone, amp: 0.05 });
      for (const x of [-2.4, 0, 2.4]) k.box(x, 0.4, 3.73, 0.5, 0.35, 0.1, { color: 0x100a08, pat: PAT.dark });
      k.stage = 2;
      k.srub(0, 1.2, 0, 7, 7, 3, { color: lc });
      // гульбище на выпущенных бревнах-консолях
      for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) { k.log(i * 1.5, 4.1, s * 3.6, 0.12, 1.5, { color: COL.logDark, ry: PI / 2 }); k.log(s * 3.6, 4.1, i * 1.5, 0.12, 1.5, { color: COL.logDark }); }
      k.box(0, 4.2, 0, 8.4, 0.18, 8.4, { color: COL.plank, pat: PAT.planks });
      for (const s of [-1, 1]) for (let i = -8; i <= 8; i++) { if (s > 0 && i >= -4 && i <= -2) continue; k.cyl(i * 0.5, 4.38, s * 4.1, 0.045, 0.75, { color: COL.white, pat: PAT.plain, seg: 5 }); k.cyl(s * 4.1, 4.38, i * 0.5, 0.045, 0.75, { color: COL.white, pat: PAT.plain, seg: 5 }); }
      for (const s of [-1, 1]) { k.box(0, 5.12, s * 4.1, 8.4, 0.08, 0.12, { color: COL.white, pat: PAT.planks }); k.box(s * 4.1, 5.12, 0, 0.12, 0.08, 8.4, { color: COL.white, pat: PAT.planks }); }
      k.srub(0, 4.4, 0, 5, 5, 2.6, { color: lc });
      windowsRow(k, c, [-2.2, -0.8, 0.8, 2.2], 2.2, 3.5, 0, { shutters: true });
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5);
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5, PI / 2);
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5, -PI / 2);
      k.door(0, 4.4, 2.53, 0, { w: 0.9, h: 1.8, nal: nalCol(c) });
      // всходная лестница с земли на гульбище вдоль фасада: ступени на двух тетивах, столбы под ними
      const n = 19, rise = 4.4 / n, run = 0.29, x0 = -1.8;
      for (let i = 0; i < n; i++) k.box(x0 + (i + 1) * run, 4.4 - (i + 1) * rise, 4.75, run + 0.03, 0.07, 1.1, { color: COL.plank, pat: PAT.planks });
      for (const z of [4.22, 5.28]) k.box(x0 + run * (n + 0.6), 0, z, 0.08, Math.hypot(run * n, 4.4), 0.2, { color: COL.logDark, pat: PAT.planks, rz: Math.atan2(run * n, 4.4), jitter: 0 });
      for (let i = 0; i < 3; i++) { const x = x0 + 0.6 + i * 1.6, h = 4.4 * (x0 + run * n - x) / (run * n) - 0.1; k.cyl(x, 0, 5.28, 0.08, h, { color: COL.logDark, pat: PAT.logs, seg: 6 }); k.rock(x, 0, 5.28, 0.18, { color: stoneCol(k) }); }
      k.stage = 3;
      k.gable(0, 4.2, 0, 8.4, 8.4, 0.01, { ...rl, gables: false, ridge: false, over: 0, th: 0.12, eaves: false });
      k.gable(0, 7.0, 0, 6.0, 6.0, 0.01, { ...rl, gables: false, ridge: false, over: 0.2, th: 0.1, eaves: false });
      k.tent(0, 7.0, 0, 4.1, 3.8, { seg: 4, ...rl });
      k.srub(0, 10.3, 0, 1.3, 1.3, 1.0, { color: lc, corners: false, r: 0.1 });
      k.tent(0, 11.25, 0, 1.15, 1.9, { seg: 8, ...rl });
      k.onion(0, 13.1, 0, 0.35, { color: c.ab ? 0x5a6068 : COL.lead, pat: PAT.scales, stage: 3, cross: !c.ab });
      chimney(k, c, -1.6, 7.0, -1.2, 2.4);
      porch(k, c, 3.5, -1.5, 1.2);
      if (c.ab) weeds(k, c, 8, 8, 14);
      else { k.stage = 4; k.kind = KIND.finish; F.cart(k, -4.6, 0, -3.2, { ry: PI / 2 - 0.2, load: 'hay' }); F.barrel(k, 4.2, 0, 3.6); F.barrel(k, 4.8, 0, 3.2, { r: 0.28 }); k.kind = 0; }
    },
  },

  // ===== Хозяйство =====
  {
    id: 'kolodec', name: 'Колодец-журавль', cat: 'craft', size: [4, 4], tier: 0, cost: { silver: 8, wood: 6, stone: 2 }, effect: { people: 1 }, time: 6, H: 2, plinth: false,
    desc: 'Сруб колодца на валунах, журавль на рогатине, бадья на верёвке, колода-поилка.',
    build(k, c) {
      k.stage = 1; for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; k.rock(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, k.rr(0.2, 0.3), { color: stoneCol(k) }); }
      k.stage = 2; k.srub(0, 0, 0, 1.3, 1.3, 0.85, { color: logCol(c), r: 0.11 });
      k.box(0, 0.6, 0, 0.9, 0.05, 0.9, { color: 0x10222a, pat: PAT.dark });
      k.stage = 3;
      // рогатина
      k.cyl(-1.2, 0, -0.7, 0.13, 2.9, { color: COL.logDark, pat: PAT.logs, rz: 0.02 });
      for (const s of [-1, 1]) k.box(-1.2 + s * 0.08, 2.85, -0.7, 0.07, 0.45, 0.08, { color: COL.logDark, pat: PAT.bark, rz: -s * 0.25 });
      // журавль: ось на рогатине, длинное плечо к колодцу, противовес-камень на коротком
      const tilt = c.ab ? -0.18 : 0.42, ang = 0.52, L1 = 3.4, L2 = 2.1, px = -1.2, py = 3.15, pz = -0.7;
      const dx = Math.cos(ang), dz = Math.sin(ang);
      k.log(px + dx * (L1 - L2) / 2 * Math.cos(tilt), py + Math.sin(tilt) * (L1 - L2) / 2, pz + dz * (L1 - L2) / 2 * Math.cos(tilt), 0.06, L1 + L2, { color: COL.plank, rz: tilt, ry: -ang });
      const ex = px + dx * L1 * Math.cos(tilt), ey = py + Math.sin(tilt) * L1, ez = pz + dz * L1 * Math.cos(tilt);
      k.rock(px - dx * L2 * Math.cos(tilt), py - Math.sin(tilt) * L2 - 0.15, pz - dz * L2 * Math.cos(tilt), 0.25, { color: stoneCol(k) });
      const ropeBot = Math.max(0.95, ey - 2.3);
      k.cyl(ex, ropeBot + 0.32, ez, 0.012, ey - ropeBot - 0.32, { color: COL.rope, seg: 3, sway: 0.03, swayBase: ey });
      k.lathe(ex, ropeBot, ez, [[0, 0.02], [0.16, 0], [0.19, 0.34], [0.17, 0.34], [0.14, 0.03], [0, 0.03]], { color: 0x7a5a3a, pat: PAT.planks, seg: 10, sway: 0.03, swayBase: ey });
      if (!c.ab) { k.stage = 4; k.kind = KIND.finish; F.trough(k, 1.2, 0, 1.3, { len: 1.6, ry: 0.6 }); F.bucket(k, 0.55, 0.85, 0.4); k.kind = 0; }
      else weeds(k, c, 1.6, 1.6, 4);
    },
  },
  {
    id: 'ambar', name: 'Амбар', cat: 'craft', size: [7, 7], tier: 0, cost: { silver: 15, wood: 16 }, effect: { store: 40 }, time: 10, H: 4,
    desc: 'Житница на стульях-столбах с плитами от мышей, навес над входом на помочах, всходни, замок.',
    build(k, c) {
      k.stage = 1; for (const x of [-2.1, 0, 2.1]) for (const z of [-1.6, 1.6]) { k.rock(x, 0, z, 0.3, { color: stoneCol(k) }); k.cyl(x, 0.05, z, 0.18, 0.65, { color: COL.logDark, pat: PAT.logs, seg: 7 }); k.lumpBox(x, 0.68, z, 0.6, 0.07, 0.6, { color: COL.stoneDark, pat: PAT.rock, amp: 0.03 }); }
      k.stage = 2; k.srub(0, 0.75, 0, 5, 4, 2.2, { color: logCol(c) });
      k.door(0, 0.8, 2.0, 0, { w: 1.2, h: 1.6, lock: !c.ab, open: c.ab ? 0.9 : 0, carved: false });
      // всходни: наклонный дощатый настил с набитыми планками
      k.box(0, 0, 2.95, 1.3, 0.06, 1.75, { color: COL.plank, pat: PAT.planks, rx: Math.atan2(0.75, 1.6) });
      for (let i = 0; i < 4; i++) k.box(0, 0.12 + i * 0.17, 3.6 - i * 0.36, 1.3, 0.04, 0.05, { color: COL.logDark, rx: Math.atan2(0.75, 1.6) });
      k.stage = 3;
      k.gable(0, 2.95, 0.4, 5.6, 4.8, 1.6, { ...roofLook(c), hole: c.ab ? 0.4 : 0, sag: c.ab ? 0.1 : 0, logGable: logCol(c), gableAt: 2.35, over: 0.4 });
      for (const s of [-1, 1]) k.box(s * 1.8, 2.6, 2.2, 0.16, 0.16, 1.0, { color: COL.logDark, pat: PAT.bark, rx: -0.15 }); // помочи
      if (!c.ab) { k.stage = 4; k.kind = KIND.finish; for (let i = 0; i < 3; i++) F.sack(k, -2.3 + i * 0.55, 0, 3.0, { s: 0.9 }); F.crate(k, 2.4, 0, 3.0, { fill: 0xc8a050 }); k.kind = 0; }
      else weeds(k, c, 5, 4, 8);
    },
  },
  {
    id: 'banya', name: 'Баня', cat: 'craft', size: [6, 6], tier: 0, cost: { silver: 12, wood: 12, stone: 2 }, effect: { people: 1 }, time: 8, H: 3,
    desc: 'Баня по-чёрному с предбанником, каменка, кадка с водой, веники сушатся. Банник не любит ночных гостей.',
    build(k, c) {
      k.stage = 1; k.footing(0, 0, -0.4, 3.6, 3, 0.3);
      k.stage = 2; k.srub(0, 0.3, -0.4, 3.6, 3, 1.9, { color: logCol(c) });
      k.door(-0.7, 0.3, 1.1, 0, { h: 1.35, w: 0.7, carved: false, open: c.ab ? 0.8 : 0.25 });
      k.window(0.9, 1.25, 1.1, 0, { w: 0.35, h: 0.3, nal: nalCol(c), dark: true, boarded: c.ab });
      // предбанник: дощатый пол на чурках, два столба, лавка
      for (const x of [-1.6, 0, 1.6]) k.cyl(x, 0, 1.9, 0.12, 0.3, { color: COL.logDark, pat: PAT.logs, seg: 6 });
      k.box(0, 0.3, 1.7, 3.8, 0.1, 1.2, { color: COL.plank, pat: PAT.planks });
      for (const x of [-1.75, 1.75]) k.cyl(x, 0.4, 2.2, 0.08, 1.75, { color: COL.logDark, pat: PAT.logs, seg: 6 });
      k.stage = 3; k.gable(0, 2.2, 0.15, 3.9, 4.6, 1.3, { ...roofLook(c, 1), hole: c.ab ? 0.4 : 0, logGable: logCol(c), gableAt: 1.65 });
      if (!c.ab) {
        c.fx.push({ t: 'smoke', x: 0.6, y: 3.6, z: -0.4 }, { t: 'smoke', x: -0.7, y: 1.6, z: 1.3 });
        k.stage = 4; k.kind = KIND.finish;
        F.tub(k, 1.3, 0.4, 1.6, { r: 0.32, h: 0.5, water: true }); F.bench(k, -0.4, 0.4, 1.95, { len: 1.2 });
        F.line(k, -1.75, 2.0, 2.2, 1.75, 2.0, 2.2, { type: 'venik', n: 6 });
        for (let i = 0; i < 7; i++) k.rock(2.3 + k.rr(-0.3, 0.3), 0, -1.2 + k.rr(-0.4, 0.4), k.rr(0.12, 0.2), { color: 0x6a6460 });
        F.woodpile(k, -2.35, 0, -0.4, { len: 2.6, h: 1.0, dep: 0.4, ry: PI / 2 });
        k.kind = 0;
      } else weeds(k, c, 3.6, 3, 6);
    },
  },
  {
    id: 'kuznya', name: 'Кузница', cat: 'craft', size: [8, 7], tier: 1, cost: { silver: 30, wood: 18, stone: 10 }, effect: { silver: 2 }, time: 14, H: 4,
    desc: 'Открытая кузня: каменный горн с трубой, кожаные мехи, наковальня на колоде, кадка для закалки, уголь.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.1, 0, 6.6, 0.25, 5.4, { color: 0x4a3c30, pat: PAT.earth, amp: 0.04 });
      k.stage = 2;
      k.footing(0, 0, -1.3, 6, 2.6, 0.3);
      k.srub(0, 0.3, -1.3, 6, 2.6, 2.3, { color: logCol(c) });
      for (const x of [-2.8, 0, 2.8]) { k.rock(x, 0, 2.2, 0.22, { color: stoneCol(k) }); k.cyl(x, 0.1, 2.2, 0.14, 2.55, { color: COL.logDark, pat: PAT.logs }); }
      for (const x of [-1.4, 1.4]) k.box(x, 2.0, 2.2, 0.1, 0.9, 0.1, { color: COL.logDark, pat: PAT.bark, rz: x > 0 ? 0.8 : -0.8 }); // подкосы
      // горн: бутовый короб, жаровня, зонт-дымник
      k.lumpBox(-1.4, 0.1, -0.6, 1.7, 0.95, 1.3, { color: COL.stoneDark, pat: PAT.stone, amp: 0.05 });
      k.box(-1.4, 1.05, -0.6, 1.0, 0.08, 0.7, { color: c.ab ? COL.stoneDark : COL.fire, pat: c.ab ? PAT.dark : PAT.fire });
      k.tent(-1.4, 1.9, -0.7, 0.9, 0.9, { seg: 4, color: 0x6a5040, pat: PAT.plinfa });
      // мехи: кожаный клин, доски-щёки, рычаг
      k.lumpBox(-2.6, 0.7, -0.6, 0.9, 0.3, 0.7, { color: 0x4a3024, pat: PAT.cloth, amp: 0.05, rz: 0.15 });
      k.box(-2.6, 1.0, -0.6, 1.0, 0.05, 0.75, { color: COL.plankOld, pat: PAT.planks, rz: 0.22 });
      k.box(-3.0, 1.1, -0.6, 0.06, 1.2, 0.06, { color: COL.logDark, rz: 0.9 });
      // наковальня на колоде, кадка, уголь, инструмент
      k.cyl(0.9, 0.1, 0.6, 0.32, 0.6, { color: COL.logDark, pat: PAT.logs, seg: 9 });
      k.box(0.9, 0.7, 0.6, 0.55, 0.18, 0.24, { color: COL.iron, pat: PAT.iron });
      k.cone(1.27, 0.76, 0.6, 0.1, 0.32, { color: COL.iron, pat: PAT.iron, seg: 4, rz: -PI / 2 });
      k.box(0.9, 0.88, 0.6, 0.7, 0.07, 0.28, { color: 0x4a4a52, pat: PAT.iron });
      F.tub(k, 2.0, 0.1, 0.0, { r: 0.35, h: 0.5, water: true });
      for (let i = 0; i < 10; i++) k.rock(-0.2 + k.rr(-0.5, 0.5), 0.1, -2.0 + k.rr(-0.3, 0.3), k.rr(0.08, 0.14), { color: 0x1c1a1c });
      for (let i = 0; i < 4; i++) k.box(1.0 + i * 0.35, 1.0, -2.55, 0.05, 0.6, 0.04, { color: COL.iron, pat: PAT.iron, rz: k.rr(-0.1, 0.1) });
      k.stage = 3; k.gable(0, 2.7, 0, 6.6, 5.6, 1.7, { ...roofLook(c), hole: c.ab ? 0.4 : 0, gables: false });
      chimney(k, c, -1.4, 2.4, -0.7, 2.9);
      if (!c.ab) c.fx.push({ t: 'fire', x: -1.4, y: 1.15, z: -0.6, s: 0.5 }, { t: 'glow', x: -1.4, y: 1.3, z: -0.3, r: 2.6 });
      else weeds(k, c, 6, 5, 8);
    },
  },
  {
    id: 'sklad', name: 'Лесной склад', cat: 'craft', size: [10, 8], tier: 0, cost: { silver: 15, wood: 4 }, effect: { wood: 3 }, time: 10, H: 3,
    desc: 'Навес на подкосах, штабеля брёвен на подкладках с клиньями, козлы с пилой, щепа. Даёт брёвна.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.1, 0, 8.6, 0.15, 6.6, { color: 0x5a4632, pat: PAT.earth, amp: 0.03 });
      k.stage = 2;
      for (const x of [-3, 0, 3]) for (const z of [-2.5, 0]) { k.rock(x, 0, z, 0.2, { color: stoneCol(k) }); k.cyl(x, 0.08, z, 0.12, 2.55, { color: COL.logDark, pat: PAT.logs, rz: c.ab ? k.rr(-0.1, 0.1) : 0 }); }
      for (const x of [-3, 0, 3]) for (const s of [-1, 1]) k.box(x + s * 0.1, 2.0, -1.25, 0.09, 0.9, 0.09, { color: COL.logDark, pat: PAT.bark, rx: s * 0.75 });
      // штабель: подкладки, бревна, клинья
      for (const x of [-3.6, -1.8, 0]) k.log(x, 0.1, 2.2, 0.1, 2.2, { color: COL.logDark, ry: PI / 2 });
      const n = c.ab ? 2 : 4;
      for (let r = 0; r < n; r++) for (let i = 0; i < 5 - r; i++) k.log(-1.8 + (r % 2) * 0.1 + k.rr(-0.15, 0.15), 0.36 + r * 0.33, 1.4 + i * 0.4 + r * 0.2, 0.17, k.rr(3.9, 4.4), { color: new THREE.Color(COL.log).offsetHSL(0, 0, k.rr(-0.05, 0.05)).getHex() });
      for (const z of [1.2, 3.2]) k.box(-1.8 + 2.2, 0.2, z, 0.18, 0.3, 0.18, { color: COL.plank, rz: 0.3 });
      k.stage = 3; k.gable(0, 2.55, -1.25, 6.8, 3.4, 0.9, { ...roofLook(c, 3), gables: false, hole: c.ab ? 0.5 : 0 });
      if (!c.ab) { k.stage = 4; k.kind = KIND.finish; F.sawhorse(k, 2.8, 0, 2.2, { ry: 0.3 }); F.chopBlock(k, 2.6, 0, -0.9); F.woodpile(k, -2, 0, -1.2, { len: 3.2, h: 1.0, roof: false }); k.kind = 0; }
      else weeds(k, c, 8, 6, 10);
    },
  },
  {
    id: 'kamen', name: 'Каменотёсня', cat: 'craft', size: [9, 8], tier: 1, cost: { silver: 25, wood: 14 }, effect: { stone: 2 }, time: 12, H: 4,
    desc: 'Грубые глыбы, тёсаные блоки, ворот-треножник с цепью, навес с инструментом, крошка. Даёт камень.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.1, 0, 7.4, 0.15, 6.4, { color: 0x6a645a, pat: PAT.earth, amp: 0.03 });
      for (let i = 0; i < 40; i++) k.rock(k.rr(-3.4, 3.4), 0, k.rr(-3, 3), k.rr(0.05, 0.12), { color: 0x8a847a });
      k.stage = 2;
      for (let i = 0; i < 6; i++) k.rock(k.rr(-3.2, -0.6), 0.15, k.rr(-2.2, 2.4), k.rr(0.45, 0.8), { color: stoneCol(k), sy: 0.75 });
      for (let i = 0; i < 4; i++) k.lumpBox(-2.6 + i * 0.85, 0, 2.5, 0.7, 0.5, 0.5, { color: stoneCol(k), pat: PAT.stone, amp: 0.02, ry: k.rr(-0.1, 0.1) });
      // треножник с воротом и цепью над блоком
      for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2 + 0.3; k.box(2 + Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3, 0.14, 3.9, 0.14, { color: COL.logDark, pat: PAT.bark, rz: Math.cos(a) * 0.32, rx: -Math.sin(a) * 0.32 }); }
      k.cyl(2, 1.4, 0, 0.02, 2.3, { color: COL.iron, pat: PAT.iron, seg: 3 });
      k.lumpBox(2, 0.6, 0, 0.9, 0.7, 0.9, { color: stoneCol(k), pat: PAT.stone, amp: 0.03 });
      k.stage = 3; k.gable(-1.5, 2.3, -2.3, 3.6, 2.4, 0.8, { ...roofLook(c, 3), gables: false });
      for (const x of [-3.1, 0.1]) k.cyl(x, 0, -2.3, 0.1, 2.3, { color: COL.logDark, pat: PAT.logs, stage: 2 });
      F.tool(k, -0.4, 0, -2.6, { type: 'fork' }); F.bucket(k, 0.8, 0, 1.6);
      if (c.ab) weeds(k, c, 7, 6, 10);
    },
  },
  {
    id: 'melnica', name: 'Мельница', cat: 'craft', size: [9, 9], tier: 2, cost: { silver: 60, wood: 40, stone: 6 }, effect: { silver: 3, people: 1 }, time: 20, H: 10,
    desc: 'Мельница-столбовка: козлы из брусьев на камнях, амбар на стояке, крылья-решётки с парусиной, водило с лестницей.',
    build(k, c) {
      k.stage = 1;
      for (const a of [0, PI / 2]) { k.box(0, 0.25, 0, 6.2, 0.35, 0.35, { color: COL.logDark, pat: PAT.bark, ry: a }); for (const s of [-1, 1]) k.rock(Math.cos(a) * s * 2.9, 0, -Math.sin(a) * s * 2.9, 0.38, { color: stoneCol(k) }); }
      for (let i = 0; i < 4; i++) { const a = i * PI / 2; k.box(Math.cos(a) * 2.6, 0.5, Math.sin(a) * 2.6, 0.18, 3.6, 0.18, { color: COL.logDark, pat: PAT.bark, rz: Math.cos(a) * 0.6, rx: -Math.sin(a) * 0.6 }); }
      k.stage = 2; k.cyl(0, 0.3, 0, 0.32, 4.4, { color: COL.logDark, pat: PAT.logs });
      k.srub(0, 4.4, 0, 3.2, 3.6, 3.0, { color: logCol(c), corners: false, r: 0.12 });
      windowsRow(k, c, [0.7], 5.6, 1.8);
      k.door(-0.6, 4.4, -1.81, PI, { w: 0.8, h: 1.6, carved: false });
      // крутая лестница к двери и водило, упёртое в камень — им мельницу поворачивают на ветер
      const lz0 = -4.3, run = 2.4, ladL = Math.hypot(run, 4.4);
      for (const s2 of [-1, 1]) k.box(-0.6 + s2 * 0.38, 0, lz0, 0.08, ladL, 0.14, { color: COL.plank, pat: PAT.planks, rx: Math.atan2(run, 4.4), jitter: 0 });
      for (let i = 1; i < 15; i++) { const t = i / 15; k.box(-0.6, 4.4 * t, lz0 + run * t, 0.8, 0.05, 0.22, { color: COL.plankOld, pat: PAT.planks }); }
      k.box(0.55, 0.15, -4.4, 0.2, Math.hypot(2.6, 4.3), 0.2, { color: COL.logDark, pat: PAT.bark, rx: Math.atan2(2.6, 4.3), jitter: 0 });
      k.rock(0.55, 0, -4.4, 0.32, { color: stoneCol(k) });
      k.stage = 3; k.gable(0, 7.4, 0, 3.8, 3.2, 1.6, { ...roofLook(c), ry: PI / 2, hole: c.ab ? 0.4 : 0, gableColor: logCol(c) });
      const rot = c.ab ? 0.35 : k.rr(0, 1.5), sails = c.ab ? 2 : 4;
      k.cyl(0, 6.9, 1.9, 0.22, 0.5, { color: COL.logDark, pat: PAT.logs, rx: PI / 2, seg: 8 });
      for (let i = 0; i < sails; i++) {
        const a = rot + i * PI / 2, sa = Math.sin(a), ca = Math.cos(a), hy = 6.9, hz = 2.2;
        const P = (along, side) => [sa * along + ca * side, hy + ca * along - sa * side];
        k.box(0, hy, hz, 0.12, 5.4, 0.1, { color: COL.logDark, pat: PAT.bark, rz: -a, jitter: 0 });
        // решётка: две продольные рейки и поперечины, на ней парусина (у заброшенной — клочья)
        for (const off of [0.25, 0.95]) { const [x, y] = P(1.1, off); k.box(x, y, hz + 0.06, 0.04, 4.1, 0.04, { color: COL.plankOld, rz: -a, jitter: 0 }); }
        for (let j = 0; j < 7; j++) { const [x, y] = P(1.2 + j * 0.62, 0.6); k.box(x, y, hz + 0.07, 0.9, 0.035, 0.035, { color: COL.plankOld, rz: -a, jitter: 0 }); }
        if (!c.ab || k.rand() < 0.5) { const [x, y] = P(1.15, 0.6); k.box(x, y, hz + 0.1, 0.75, c.ab ? 1.6 : 3.8, 0.02, { color: c.ab ? 0x8a8070 : 0xd8c8a0, pat: PAT.cloth, rz: -a, jitter: 0 }); }
      }
      if (c.ab) weeds(k, c, 5, 5, 8);
      else { k.stage = 4; k.kind = KIND.finish; for (let i = 0; i < 4; i++) F.sack(k, 2.2 + (i % 2) * 0.5, 0, -2.4 + Math.floor(i / 2) * 0.5, { s: 0.9 }); F.cart(k, 2.6, 0, 2.2, { ry: -0.5 }); k.kind = 0; }
    },
  },
  {
    id: 'ogorod', name: 'Огород', cat: 'craft', area: { min: [4, 4], max: [16, 14] }, size: [8, 6], tier: 0, cost: { silver: 4 }, costPer: { silver: 0.15 }, effect: { people: 0 }, effectPer: { silver: 0.04 }, time: 6, H: 1.5, plinth: false,
    desc: 'Тянется мышью: грядки с капустой и луком, плетень с калиткой, пугало, кринки на кольях. Цена и доход по площади.',
    build(k, c) {
      const [w, d] = c.size;
      k.stage = 1;
      k.lumpBox(0, -0.15, 0, w - 0.4, 0.22, d - 0.4, { color: COL.earth, pat: PAT.earth, amp: 0.03, cell: 0.6 });
      k.stage = 2;
      for (let x = -w / 2 + 0.9; x < w / 2 - 0.5; x += 0.9) k.lumpBox(x, 0.02, 0, 0.55, 0.16, d - 1.2, { color: 0x4a3828, pat: PAT.earth, amp: 0.03, cell: 0.4 });
      if (!c.ab) { k.stage = 3; let row = 0; for (let x = -w / 2 + 0.9; x < w / 2 - 0.5; x += 0.9, row++) for (let z = -d / 2 + 1; z < d / 2 - 0.8; z += 0.55) {
        if (row % 3 === 1) k.cone(x + k.rr(-0.05, 0.05), 0.16, z, 0.08, 0.38, { color: 0x6a8a3a, pat: PAT.leaf, seg: 4, sway: 0.08, swayBase: 0.16 });          // лук
        else k.sphere(x + k.rr(-0.05, 0.05), 0.3, z, k.rr(0.17, 0.22), { color: k.pick([0x7a9a5a, 0x6a8a4a, 0x8aa868]), pat: PAT.leaf, seg: 7, sy: 0.85 }); } } // капуста
      k.stage = 2;
      const P = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      for (let i = 0; i < 4; i++) {
        const [ax, az] = P[i], [bx, bz] = P[(i + 1) % 4];
        if (i === 2) { const g = Math.min(1.2, (w - 1) / 2); k.pleten(ax, az, (ax + bx) / 2 + g / 2, az, 0.95, { broken: c.ab ? 0.4 : 0 }); k.pleten((ax + bx) / 2 - g / 2, az, bx, bz, 0.95, { broken: c.ab ? 0.4 : 0 }); if (!c.ab) k.box((ax + bx) / 2 + g / 2 - 0.05, 0.05, az + 0.4, 0.06, 0.9, 0.8, { color: 0x7a6040, pat: PAT.straw, ry: 0.5 }); continue; }
        k.pleten(ax, az, bx, bz, 0.95, { broken: c.ab ? 0.4 : 0 });
      }
      if (!c.ab) for (let i = 0; i < 3; i++) F.pot(k, -w / 2, 1.08, -d / 2 + 1 + i * 0.55, { type: 'krinka', rx: PI, s: 0.85 });
      // пугало
      k.stage = 3;
      k.cyl(w / 4, 0, 0, 0.05, 1.9, { color: COL.logDark, seg: 4 });
      k.box(w / 4, 1.4, 0, 1.3, 0.06, 0.06, { color: COL.logDark, rz: c.ab ? 0.4 : 0 });
      k.box(w / 4, 0.85, 0, 0.62, 0.8, 0.3, { color: c.ab ? 0x5a5048 : COL.cloth, pat: PAT.cloth, sway: 0.05, swayBase: 1.6 });
      for (const s of [-1, 1]) k.box(w / 4 + s * 0.5, 1.05, 0, 0.3, 0.38, 0.05, { color: c.ab ? 0x5a5048 : 0xb5462e, pat: PAT.cloth, sway: 0.12, swayBase: 1.4 });
      k.sphere(w / 4, 1.95, 0, 0.2, { color: c.ab ? COL.bone : 0xc8b080, pat: c.ab ? PAT.bone : PAT.cloth });
      k.cone(w / 4, 2.05, 0, 0.32, 0.35, { color: 0x6a5030, pat: PAT.straw });
    },
  },

  // ===== Двор =====
  {
    id: 'drova', name: 'Поленница', cat: 'yard', size: [4, 2], tier: 0, cost: { wood: 4 }, effect: { wood: 0.3 }, time: 4, H: 1.5, plinth: false,
    desc: 'Колотые дрова торцами наружу под дощатой крышкой, колода с топором.',
    build(k, c) { k.stage = 2; F.woodpile(k, 0, 0, -0.2, { len: 3.0, h: 1.3, dep: 0.5 }); k.stage = 3; F.chopBlock(k, 1.2, 0, 0.6); },
  },
  {
    id: 'telega', name: 'Телега', cat: 'yard', size: [4, 3], tier: 0, cost: { silver: 6, wood: 4 }, effect: { silver: 0.2 }, time: 4, H: 1.5, plinth: false,
    desc: 'Телега со спицевыми колёсами, оглобли на земле. Варианты: пустая, с сеном, с мешками.',
    build(k, c) { k.stage = 2; F.cart(k, 0.5, 0, 0, { load: ['none', 'hay', 'sacks', 'hay'][c.v % 4] }); },
  },
  {
    id: 'paseka', name: 'Пасека', cat: 'yard', size: [5, 5], tier: 0, cost: { silver: 8, wood: 6 }, effect: { silver: 0.6, people: 0.5 }, time: 6, H: 1.4, plinth: false,
    desc: 'Колоды-ульи под крышками, лавка пасечника, дымарь.',
    build(k, c) { k.stage = 2; for (let i = 0; i < 5; i++) F.beehive(k, -1.6 + i * 0.8 + k.rr(-0.1, 0.1), 0, k.rr(-0.6, 0.6) + (i % 2) * 0.9 - 0.4, { ry: k.rr(-0.3, 0.3) }); k.stage = 3; F.bench(k, 0, 0, 1.8, { len: 1.4 }); F.bucket(k, 1.2, 0, 1.7); },
  },
  {
    id: 'stog', name: 'Стог сена', cat: 'yard', size: [3, 3], tier: 0, cost: { silver: 2 }, effect: { people: 0.3 }, time: 3, H: 3, plinth: false,
    desc: 'Стог на остожье с жердями-ветреницами, грабли рядом.',
    build(k, c) { k.stage = 2; F.haystack(k, 0, 0, 0, { r: 1.15, h: 2.8 }); k.stage = 3; F.tool(k, 1.3, 0, 0.6, { ry: 0.4, type: 'rake' }); },
  },
  {
    id: 'sushilo', name: 'Сушило для сетей', cat: 'yard', size: [6, 3], tier: 0, cost: { wood: 4 }, effect: { silver: 0.4 }, time: 4, H: 2.4, plinth: false,
    desc: 'Жерди с сетями и вяленой рыбой, перевёрнутая лодка-долблёнка.',
    build(k, c) {
      k.stage = 2; for (const x of [-2.4, 0, 2.4]) k.cyl(x, 0, -0.6, 0.07, 2.2, { color: COL.logDark, pat: PAT.bark, seg: 5, rz: k.rr(-0.05, 0.05) });
      k.box(0, 2.05, -0.6, 5.2, 0.07, 0.07, { color: COL.logDark });
      k.box(-1.2, 0.2, -0.6, 2.3, 1.85, 0.02, { color: 0x7a7258, pat: PAT.straw, sway: 0.05, swayBase: 2.05 });
      k.stage = 3; F.line(k, 0.1, 1.95, -0.62, 2.4, 1.95, -0.62, { type: 'fish', n: 7 });
      const g = new THREE.CylinderGeometry(0.4, 0.4, 3.6, 10, 1, false, 0, PI).rotateZ(PI / 2).scale(1, 0.7, 1);
      k.add(g, k.mat(0.4, 0.02, 0.9, 0, 0.1, 0), { color: 0x5a4430, pat: PAT.planks, flatUv: false });
    },
  },
  {
    id: 'bochki', name: 'Бочки и кадки', cat: 'yard', size: [3, 3], tier: 0, cost: { wood: 3 }, effect: { store: 6 }, time: 3, H: 1.2, plinth: false,
    desc: 'Бочки, кадки с водой, вёдра и мешки — запас на зиму.',
    build(k, c) {
      k.stage = 2; F.barrel(k, -0.6, 0, -0.5); F.barrel(k, 0.2, 0, -0.7, { r: 0.28 }); F.barrel(k, -0.2, 0, 0.5, { lying: true, ry: 1.2 });
      F.tub(k, 0.9, 0, 0.4, { water: true }); F.bucket(k, 1.0, 0, -0.4); F.sack(k, -1.0, 0, 0.7, { s: 0.8 });
    },
  },

  // ===== Торг =====
  {
    id: 'ryady', name: 'Торговые ряды', cat: 'trade', size: [14, 9], tier: 0, cost: { silver: 30, wood: 24 }, effect: { silver: 4 }, time: 14, H: 3.4,
    desc: 'Ряд лавок под общей кровлей: бревенчатая задняя стена, дощатые перегородки, прилавки с товаром, пологи на шестах, ворота с вывеской.',
    build(k, c) {
      const L = 13, cloth = [0xa8322a, 0x3e6a78, 0xb08a3a, 0x6a3a5a];
      // настил на чурках
      k.stage = 1;
      for (let x = -6; x <= 6; x += 2) for (const z of [-2.5, -0.5, 1.4]) { k.rock(x, 0, z, 0.2, { color: stoneCol(k) }); k.cyl(x, 0.05, z, 0.13, 0.2, { color: COL.logDark, pat: PAT.logs, seg: 6 }); }
      k.box(0, 0.25, -0.5, L, 0.12, 4.4, { color: c.ab ? COL.plankOld : COL.plank, pat: PAT.planks });
      k.stage = 2;
      // задняя стена — бревно, торцы на углах
      k.srubLogs(0, 0.37, -2.55, L, 0.4, 2.4, { color: logCol(c), corners: false, r: 0.13 });
      // перегородки между лавками и торцевые стены — доски до кровли
      for (let i = 0; i <= 4; i++) { const x = -L / 2 + 0.06 + i * (L - 0.12) / 4; k.box(x, 0.37, -1.2, 0.1, 2.25, 2.6, { color: c.ab ? COL.plankOld : 0x8a6440, pat: PAT.planks, rz: c.ab ? k.rr(-0.05, 0.05) : 0 }); }
      // передние столбы, держат свес
      for (let i = 0; i <= 4; i++) k.cyl(-L / 2 + 0.1 + i * (L - 0.2) / 4, 0.37, 1.35, 0.11, 2.1, { color: COL.logDark, pat: PAT.logs, seg: 7 });
      k.box(0, 2.42, 1.35, L, 0.18, 0.2, { color: COL.logDark, pat: PAT.bark });            // прогон
      for (let i = 0; i < 4; i++) {
        const x = -L / 2 + (i + 0.5) * L / 4;
        k.box(x, 0.37, 0.75, 2.8, 0.85, 0.5, { color: 0x7a5434, pat: PAT.planks });           // прилавок
        k.box(x, 1.22, 0.78, 3.0, 0.06, 0.62, { color: 0x9a6a42, pat: PAT.planks });
      }
      // односкатная кровля: с задней стены (2.9) на прогон (2.55)
      k.stage = 3;
      const back = { y: 2.85, z: -2.75 }, front = { y: 2.5, z: 1.65 };
      const sl = Math.hypot(front.z - back.z, front.y - back.y), ang = Math.atan2(back.y - front.y, front.z - back.z);
      const rl = roofLook(c);
      for (let i = 0; i < 4; i++) {
        if (c.ab && k.rand() < 0.35) continue;
        const g = new THREE.BoxGeometry(L / 4 + 0.02, 0.12, sl + 0.5).rotateX(ang);
        k.add(g, k.mat(-L / 2 + (i + 0.5) * L / 4, (back.y + front.y) / 2 + 0.06, (back.z + front.z) / 2 + 0.2, 0, 0, 0), { ...rl });
      }
      // пологи: от прогона к шестам, шесты на растяжках к колышкам
      for (let i = 0; i < 4; i++) {
        const x = -L / 2 + (i + 0.5) * L / 4;
        if (c.ab && k.rand() < 0.5) continue;
        const a = { y: 2.45, z: 1.4 }, b = { y: 2.0, z: 3.1 }, len = Math.hypot(b.z - a.z, b.y - a.y);
        const g = new THREE.BoxGeometry(2.9, 0.03, len).rotateX(Math.atan2(a.y - b.y, b.z - a.z) * 1);
        k.add(g, k.mat(x, (a.y + b.y) / 2, (a.z + b.z) / 2, 0, 0, 0), { color: c.ab ? 0x6a6058 : cloth[(i + c.v) % 4], pat: PAT.cloth, sway: 0.03, swayBase: 2.4 });
        for (const s of [-1, 1]) {
          k.cyl(x + s * 1.4, 0, 3.1, 0.045, 2.05, { color: COL.logDark, seg: 5, rz: s * 0.04 });
          k.box(x + s * 1.65, 0, 3.55, 0.02, 2.1, 0.02, { color: COL.rope, rx: -0.22, rz: -s * 0.12 });
          k.cyl(x + s * 1.65, -0.1, 3.6, 0.03, 0.25, { color: COL.logDark, seg: 4 });
        }
      }
      // товар: горшки, хлеб, мешки, бочки, ткани, связки рыбы и лаптей под прогоном, фонари
      if (!c.ab) {
        k.stage = 4; k.kind = KIND.finish;
        for (let i = 0; i < 4; i++) {
          const x = -L / 2 + (i + 0.5) * L / 4, kind = (i + c.v) % 4;
          if (kind === 0) for (let j = 0; j < 5; j++) F.pot(k, x - 1.1 + j * 0.5, 1.28, 0.75 + k.rr(-0.1, 0.1));
          else if (kind === 1) { for (let j = 0; j < 4; j++) k.sphere(x - 0.9 + j * 0.55, 1.36, 0.78, 0.2, { color: 0xb07a3a, pat: PAT.clay, sy: 0.6 }); F.sack(k, x + 1.0, 0.37, -0.2, { s: 0.85 }); }
          else if (kind === 2) { for (let j = 0; j < 3; j++) k.box(x - 0.8 + j * 0.8, 1.28, 0.8, 0.6, 0.18, 0.4, { color: k.pick([0xa8322a, 0x3e6a78, 0xd8c8a0]), pat: PAT.cloth }); k.box(x, 0.4, -1.7, 1.8, 1.6, 0.04, { color: 0x8a3a2a, pat: PAT.cloth }); }
          else { F.barrel(k, x - 0.8, 0.37, -0.6); F.barrel(k, x + 0.3, 0.37, -0.9, { r: 0.28 }); F.crate(k, x + 0.9, 1.28, 0.78, { w: 0.5, h: 0.3, d: 0.4, fill: 0x8a3a2a }); }
          F.lantern(k, x, 2.0, 1.35);
          c.fx.push({ t: 'glow', x, y: 2.1, z: 1.4, r: 1.1 });
        }
        F.line(k, -L / 2 + 0.2, 2.35, 1.38, -L / 2 + 3.0, 2.35, 1.38, { type: 'fish', n: 6 });
        F.line(k, L / 2 - 3.0, 2.35, 1.38, L / 2 - 0.2, 2.35, 1.38, { type: 'venik', n: 5 });
        F.cart(k, -3.5, 0, 4.0, { ry: 0.15, load: 'sacks' });
        k.kind = 0;
      }
      // ворота с вывеской на верёвках
      k.stage = 2;
      for (const s of [-1, 1]) { k.rock(s * 2.2 + 3.3, 0, 4.0, 0.3, { color: stoneCol(k) }); k.cyl(s * 2.2 + 3.3, 0, 4.0, 0.18, 3.6, { color: COL.logDark, pat: PAT.logs }); }
      k.stage = 3;
      k.log(3.3, 3.3, 4.0, 0.16, 5.6, { color: COL.logDark });
      k.gable(3.3, 3.45, 4.0, 5.8, 0.9, 0.5, { ...roofLook(c), gables: false, over: 0.2, th: 0.08 });
      for (const s of [-1, 1]) k.box(3.3 + s * 1.1, 2.75, 4.05, 0.02, 0.5, 0.02, { color: COL.rope, sway: 0.03, swayBase: 3.3 });
      k.box(3.3, 2.1, 4.08, 2.6, 0.7, 0.08, { color: 0x5a4030, pat: PAT.planks, rz: c.ab ? 0.12 : 0, sway: 0.025, swayBase: 3.2 });
      c.signs.push({ text: 'ТОРГОВЫЕ РЯДЫ', x: 3.3, y: 2.45, z: 4.14, w: 2.5, h: 0.62, rz: c.ab ? 0.12 : 0 });
      if (!c.ab) c.fx.push({ t: 'fire', x: 1.1, y: 3.75, z: 4.0, s: 0.25 }, { t: 'fire', x: 5.5, y: 3.75, z: 4.0, s: 0.25 });
      if (c.ab) weeds(k, c, 13, 5, 14);
    },
  },
  {
    id: 'korchma', name: 'Корчма', cat: 'trade', size: [12, 10], tier: 1, cost: { silver: 55, wood: 40, stone: 8 }, effect: { silver: 4, people: 2 }, time: 18, H: 6,
    desc: 'Длинная изба на бутовом цоколе, гульбище с лавками и бочками, вывеска на кронштейне, коновязь. Тут говорят о хтони шёпотом.',
    build(k, c) {
      const lc = logCol(c);
      k.stage = 1; k.lumpBox(0, 0, -0.5, 9.8, 0.55, 6.4, { color: stoneCol(k), pat: PAT.stone, amp: 0.05 });
      k.stage = 2; k.srub(0, 0.55, -0.5, 9.4, 6, 3, { color: lc });
      windowsRow(k, c, [-3.4, -2, 2, 3.4], 1.55, 2.5, 0, { shutters: true });
      k.door(0, 0.55, 2.52, 0, { w: 1.1, h: 1.9, nal: nalCol(c), open: c.ab ? 0.7 : 0.35 });
      // гульбище: настил на чурках, ступени, столбы, перила
      for (const x of [-4.4, -1.5, 1.5, 4.4]) { k.rock(x, 0, 4.1, 0.2, { color: stoneCol(k) }); k.cyl(x, 0.05, 4.1, 0.1, 0.45, { color: COL.logDark, seg: 6 }); }
      k.box(0, 0.42, 3.35, 9.4, 0.12, 1.65, { color: COL.plank, pat: PAT.planks });
      for (let i = 0; i < 2; i++) k.box(0, 0.42 - (i + 1) * 0.2, 4.35 + i * 0.3, 1.6, 0.07, 0.32, { color: COL.plank, pat: PAT.planks });
      for (const x of [-4.4, -1.5, 1.5, 4.4]) k.cyl(x, 0.54, 4.1, 0.1, 2.3, { color: COL.logDark, pat: PAT.logs, seg: 6 });
      for (const s of [-1, 1]) k.box(s * 3.0, 1.2, 4.1, 2.6, 0.07, 0.08, { color: nalCol(c), pat: PAT.planks });
      k.stage = 3;
      k.gable(0, 3.55, -0.5, 10, 6, 2.6, { ...roofLook(c), hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.1 : 0, logGable: lc, gableAt: 4.55, kuricy: !c.ab });
      // навес гульбища: от стены к прогону
      const sl = Math.hypot(1.8, 0.55), g = new THREE.BoxGeometry(9.8, 0.08, sl + 0.3).rotateX(Math.atan2(0.55, 1.8));
      k.add(g, k.mat(0, 2.85 + 0.27, 3.35, 0, 0, 0), { ...roofLook(c) });
      k.box(0, 2.78, 4.1, 9.4, 0.14, 0.16, { color: COL.logDark, pat: PAT.bark });
      chimney(k, c, 2.8, 3.0, -1.6, 3.6);
      // вывеска на кованом кронштейне, качается
      k.box(-2.9, 2.5, 4.3, 0.06, 0.06, 1.0, { color: COL.iron, pat: PAT.iron });
      for (const s of [-1, 1]) k.box(-2.9 + s * 0.6, 2.05, 4.75, 0.02, 0.45, 0.02, { color: COL.iron, sway: 0.03, swayBase: 2.5 });
      k.box(-2.9, 1.55, 4.75, 1.6, 0.52, 0.06, { color: 0x5a4030, pat: PAT.planks, rz: c.ab ? -0.2 : 0, sway: 0.03, swayBase: 2.5 });
      c.signs.push({ text: 'КОРЧМА', x: -2.9, y: 1.81, z: 4.8, w: 1.5, h: 0.45, rz: c.ab ? -0.2 : 0 });
      if (!c.ab) {
        k.stage = 4; k.kind = KIND.finish;
        for (let i = 0; i < 3; i++) F.barrel(k, 3.4 + (i % 2) * 0.62, 0.48 + Math.floor(i / 2) * 0.0, 3.3 - Math.floor(i / 2) * 0.0 + (i === 2 ? 0 : 0), i === 2 ? { lying: true, ry: 0 } : {});
        F.bench(k, -1.5, 0.48, 2.85, { len: 2.2 }); F.bench(k, 1.6, 0.48, 2.85, { len: 1.6 });
        F.lantern(k, -1.5, 2.3, 4.1); F.lantern(k, 1.5, 2.3, 4.1);
        // коновязь
        for (const s of [-1, 1]) k.cyl(-6.1 + s * 0.0, 0, 3.0 + s * 1.0, 0.08, 1.1, { color: COL.logDark, seg: 5 });
        k.log(-6.1, 1.0, 3.0, 0.06, 2.2, { color: COL.logDark, ry: PI / 2 });
        F.trough(k, -6.6, 0, 3.0, { len: 1.6, ry: PI / 2 });
        k.kind = 0;
        c.fx.push({ t: 'glow', x: -1.5, y: 2.1, z: 4.2, r: 1.6 }, { t: 'glow', x: 1.5, y: 2.1, z: 4.2, r: 1.6 });
      } else weeds(k, c, 9, 7, 14);
    },
  },

  // ===== Вера =====
  {
    id: 'chasovnya', name: 'Часовня', cat: 'faith', size: [6, 7], tier: 0, cost: { silver: 20, wood: 14 }, effect: { faith: 3 }, time: 10, H: 6,
    desc: 'Рубленая часовенка на валунах, крылечко с кровелькой, киот над дверью, главка на барабане из коньковой бочки.',
    build(k, c) {
      const lc = logCol(c), rl = roofLook(c);
      k.stage = 1; k.footing(0, 0, -0.4, 3.4, 3.4, 0.4);
      k.stage = 2; k.srub(0, 0.4, -0.4, 3.4, 3.4, 2.6, { color: lc });
      k.door(0, 0.4, 1.31, 0, { w: 0.85, h: 1.75, nal: nalCol(c), open: c.ab ? 0.8 : 0 });
      windowsRow(k, c, [-0.3], 1.75, 1.7, PI / 2, { w: 0.35, h: 0.55, nal: COL.white });
      windowsRow(k, c, [0.3], 1.75, 1.7, -PI / 2, { w: 0.35, h: 0.55, nal: COL.white });
      // крылечко: площадка на чурках, две ступени, столбы, кровелька
      for (const x of [-0.75, 0.75]) { k.rock(x, 0, 2.2, 0.17, { color: stoneCol(k) }); k.cyl(x, 0.05, 2.2, 0.08, 0.32, { color: COL.logDark, seg: 6 }); }
      k.box(0, 0.3, 1.75, 1.8, 0.1, 1.0, { color: COL.plank, pat: PAT.planks });
      k.box(0, 0.12, 2.42, 1.4, 0.08, 0.32, { color: COL.plank, pat: PAT.planks });
      for (const x of [-0.75, 0.75]) k.cyl(x, 0.4, 2.15, 0.07, 1.95, { color: COL.logDark, pat: PAT.logs, seg: 6 });
      k.stage = 3;
      k.gable(0, 2.35, 1.8, 1.9, 1.3, 0.6, { ry: PI / 2, ...rl, over: 0.15, th: 0.07, ridge: false, gableColor: nalCol(c), eaves: false, hole: c.ab ? 0.4 : 0 });
      // киот над дверью
      k.box(0, 2.3, 1.35, 0.42, 0.5, 0.08, { color: COL.logDark, pat: PAT.planks });
      k.box(0, 2.35, 1.4, 0.3, 0.38, 0.03, { color: c.ab ? 0x5a5048 : COL.gold, pat: PAT.gold });
      // кровля с щипцами из самцов, бочка на коньке и главка на барабане, выходящем из кровли
      k.gable(0, 3.0, -0.4, 4.2, 3.4, 2.1, { ry: PI / 2, ...rl, hole: c.ab ? 0.3 : 0, logGable: lc, gableAt: 1.55, kuricy: !c.ab && rl.pat !== PAT.thatch });
      k.cyl(0, 4.75, -0.4, 0.38, 1.2, { color: lc, pat: PAT.logs, seg: 10 });
      k.cyl(0, 5.95, -0.4, 0.5, 0.12, { color: COL.logDark, pat: PAT.plain, seg: 10 });
      if (!c.ab) k.onion(0, 6.05, -0.4, 0.48, { color: [COL.lead, 0x9a8a6a, COL.teal, COL.lead][c.v], pat: PAT.scales });
      else k.onion(0, 6.05, -0.4, 0.48, { color: 0x5a6068, pat: PAT.scales, tilt: 0.25, crossColor: COL.iron });
      for (const s of [-1, 1]) k.box(0, 2.95, -0.4 + s * 2.05, 0.06, 0.06, 0.1, { color: COL.logDark });
      if (c.ab) weeds(k, c, 3.4, 3.4, 8);
      else { c.fx.push({ t: 'glow', x: 0, y: 2.0, z: 1.8, r: 0.9 }); k.stage = 4; k.kind = KIND.finish; for (let i = 0; i < 3; i++) F.candle(k, -0.25 + i * 0.25, 0.4, 1.95); F.bench(k, 1.9, 0, 1.2, { len: 1.2, ry: PI / 2 }); k.kind = 0; }
    },
  },
  {
    id: 'kolokolnya', name: 'Колокольня', cat: 'faith', size: [6, 6], tier: 1, cost: { silver: 40, wood: 30, stone: 4 }, effect: { faith: 4 }, time: 16, H: 12,
    desc: 'Шатровая звонница: четверик на валунах, открытый звон на восьми столбах с колоколами на матице, полица и шатёр с главкой.',
    build(k, c) {
      const lc = logCol(c), rl = roofLook(c, 2);
      k.stage = 1; k.footing(0, 0, 0, 3.6, 3.6, 0.45);
      k.stage = 2; k.srub(0, 0.45, 0, 3.6, 3.6, 4.2, { color: lc });
      k.door(0, 0.45, 1.81, 0, { w: 0.85, h: 1.75, nal: nalCol(c), open: c.ab ? 0.8 : 0 });
      k.gable(0, 2.45, 2.0, 1.5, 0.6, 0.35, { ...rl, gables: false, ridge: false, over: 0.1, th: 0.06 }); // козырёк над дверью
      for (const [ry, x] of [[PI / 2, 0.6], [-PI / 2, -0.6], [PI, 0.4]]) windowsRow(k, c, [x], 3.0, 1.82, ry, { w: 0.22, h: 0.5, nal: COL.white, shutters: false });
      // площадка звона: выпущенные бревна-консоли и настил
      for (const s of [-1, 1]) for (const t of [-1.2, 0, 1.2]) { k.log(t, 4.75, s * 1.95, 0.11, 1.0, { color: COL.logDark, ry: PI / 2 }); k.log(s * 1.95, 4.75, t, 0.11, 1.0, { color: COL.logDark }); }
      k.box(0, 4.85, 0, 4.5, 0.16, 4.5, { color: COL.plank, pat: PAT.planks });
      // восемь столбов звона, парапет из досок
      const R8 = 1.85, top = 7.0;
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * PI * 2; k.cyl(Math.cos(a) * R8, 5.0, Math.sin(a) * R8, 0.1, top - 5.0, { color: COL.logDark, pat: PAT.logs, seg: 6 }); }
      for (let i = 0; i < 8; i++) {
        const a0 = (i + 0.5) / 8 * PI * 2, a1 = (i + 1.5) / 8 * PI * 2, mx = (Math.cos(a0) + Math.cos(a1)) / 2 * R8, mz = (Math.sin(a0) + Math.sin(a1)) / 2 * R8;
        const len = 2 * R8 * Math.sin(PI / 8), ang = Math.atan2(mz, mx);
        k.box(mx, 5.0, mz, len, 0.7, 0.07, { color: c.ab ? COL.plankOld : 0x8a6440, pat: PAT.planks, ry: -ang + PI / 2 });
        k.box(mx, top - 0.35, mz, len, 0.12, 0.12, { color: COL.logDark, pat: PAT.bark, ry: -ang + PI / 2 }); // обвязка
        k.lace(Math.cos(a0) * R8, top - 0.42, Math.sin(a0) * R8, Math.cos(a1) * R8, Math.sin(a1) * R8, 0.25, { color: nalCol(c), stage: 3 });
      }
      // матица с колоколами и верёвками
      k.stage = 3;
      k.log(0, 6.55, 0, 0.13, 3.8, { color: COL.logDark });
      if (!c.ab || k.rand() < 0.4) F.bell(k, 0, 6.42, 0, { s: 0.62 });
      for (const x of [-1.1, 1.1]) if (!c.ab) F.bell(k, x, 6.42, 0.0, { s: 0.3 });
      if (!c.ab) for (const x of [-0.25, 0.2]) k.box(x, 5.0, 0.3, 0.015, 1.45, 0.015, { color: COL.rope, sway: 0.04, swayBase: 6.4 });
      // полица (юбка кровли) и шатёр, основание шатра под полицей — без щели
      k.cyl(0, top - 0.1, 0, R8 + 0.12, 0.3, { color: lc, pat: PAT.logs, seg: 8 });
      k.tent(0, top + 0.15, 0, 2.75, 0.75, { seg: 8, ...rl });
      const tb = top + 0.15 + 0.75 * (1 - 1.7 / 2.75) - 0.12;
      k.tent(0, tb, 0, 1.7, 4.6, { seg: 8, ...rl, color: c.ab ? COL.shingleOld : 0x6a5a4a, pat: PAT.scales });
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 8; k.gable(Math.cos(a) * 1.15, tb + 1.2, Math.sin(a) * 1.15, 0.5, 0.45, 0.35, { ry: -a + PI / 2, ...rl, over: 0.05, th: 0.04, eaves: false, ridge: false, gableColor: nalCol(c) }); } // слухи
      const tt = tb + 4.6 * (1 - 0.22 / 1.7);
      k.cyl(0, tt - 0.1, 0, 0.22, 0.65, { color: lc, pat: PAT.logs, seg: 8 });
      k.onion(0, tt + 0.55, 0, 0.42, { color: c.ab ? 0x5a6068 : COL.lead, pat: PAT.scales, tilt: c.ab ? 0.3 : 0, crossColor: c.ab ? COL.iron : undefined });
      if (c.ab) weeds(k, c, 3.6, 3.6, 8);
    },
  },
  {
    id: 'cerkov', name: 'Церковь', cat: 'faith', size: [13, 19], maxSlope: 3, tier: 1, cost: { silver: 120, wood: 90, stone: 20 }, effect: { faith: 12 }, time: 30, H: 16,
    desc: 'Шатровая деревянная церковь на бутовом цоколе: четверик, восьмерик, шатёр, трапезная с гульбищем, алтарь, паперть со ступенями, главы в лемехе.',
    build(k, c) {
      const lc = logCol(c), rl = roofLook(c, 2);
      k.stage = 1; k.lumpBox(0, 0, 0, 11, 0.7, 16, { color: stoneCol(k), pat: PAT.stone, amp: 0.06 });
      k.stage = 2;
      k.srub(0, 0.7, -1, 7, 7, 5, { color: lc });                       // четверик
      k.cyl(0, 5.7, -1, 3.1, 3, { seg: 8, color: lc, pat: PAT.logs });   // восьмерик
      k.srub(0, 0.7, 5, 6, 5, 3.4, { color: lc });                      // трапезная
      k.srub(0, 0.7, -6.3, 4.4, 3.6, 3.6, { color: lc });               // алтарь
      k.box(0, 0.7, 8.4, 3.2, 0.14, 1.6, { color: COL.plank, pat: PAT.planks }); // паперть
      for (let i = 0; i < 3; i++) k.box(0, 0.7 - (i + 1) * 0.22, 9.3 + i * 0.3, 2.4, 0.08, 0.34, { color: COL.plank, pat: PAT.planks });
      k.door(0, 0.7, 7.52, 0, { w: 1.2, h: 2.2, nal: nalCol(c), open: c.ab ? 0.6 : 0 });
      windowsRow(k, c, [-1.6, 1.6], 2, 7.5, 0, { w: 0.45, h: 0.8, nal: COL.white });
      windowsRow(k, c, [-1.6, 1.6], 2.4, 3.5, PI / 2, { w: 0.45, h: 0.9 });
      windowsRow(k, c, [-1.6, 1.6], 2.4, 3.5, -PI / 2, { w: 0.45, h: 0.9 });
      k.stage = 3;
      k.gable(0, 4.1, 5, 5.6, 6, 1.8, { ...rl, hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.06 : 0, logGable: lc, gableAt: 2.35 });
      for (const sx of [-1, 1]) k.lace(sx * 3.35, 4.0, 2.0, sx * 3.35, 8.0, 0.3, { color: c.ab ? COL.plankOld : COL.white, stage: 3 });
      k.stage = 2;
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { k.cyl(sx * 4.1, 0.7, 2.8 + i * 1.5, 0.08, 2.6, { color: COL.logDark, pat: PAT.logs, seg: 6 }); }
      for (const sx of [-1, 1]) { for (let i = 0; i < 12; i++) k.cyl(sx * 4.1, 0.82, 2.6 + i * 0.42, 0.035, 0.68, { color: COL.white, seg: 5 }); k.box(sx * 4.1, 1.5, 5, 0.08, 0.08, 4.6, { color: COL.white, pat: PAT.planks }); k.box(sx * 3.7, 0.7, 5, 1.0, 0.12, 5.2, { color: COL.plank, pat: PAT.planks }); }
      k.stage = 3;
      for (const sx of [-1, 1]) { const g = new THREE.BoxGeometry(1.3, 0.08, 5.6).rotateZ(-sx * 0.35); k.add(g, k.mat(sx * 3.75, 3.45, 5, 0, 0, 0), { ...rl }); }
      k.gable(0, 4.3, -6.3, 4.4, 4.4, 1.5, { ...rl, hole: c.ab ? 0.3 : 0, logGable: lc, gableAt: 2.05 });
      k.tent(0, 5.7, -1, 4.3, 0.9, { seg: 4, ...rl });                  // повал четверика
      k.tent(0, 8.7, -1, 3.4, 0.6, { seg: 8, ...rl });
      const tb = 8.7 + 0.6 * (1 - 2.6 / 3.4) - 0.08;
      k.tent(0, tb, -1, 2.6, 6.2, { seg: 8, ...rl, color: c.ab ? COL.shingleOld : 0x6a5a4a, pat: PAT.scales });
      const dome = c.ab ? 0x5a6068 : [COL.lead, 0x9a8a6a, COL.lead, COL.teal][c.v];
      const tt = tb + 6.2 * (1 - 0.32 / 2.6);
      k.cyl(0, tt - 0.1, -1, 0.32, 0.9, { color: lc, pat: PAT.logs, seg: 8 });
      k.onion(0, tt + 0.8, -1, 0.75, { color: dome, pat: PAT.scales, tilt: c.ab ? 0.2 : 0, crossColor: c.ab ? COL.iron : undefined });
      k.cyl(0, 5.55, 5, 0.25, 0.85, { color: lc, pat: PAT.logs, seg: 8 });
      k.onion(0, 6.4, 5, 0.45, { color: dome, pat: PAT.scales, cross: !c.ab });
      if (c.v >= 2) for (const x of [-2.6, 2.6]) for (const z of [-3.6, 1.6]) { k.cyl(x, 5.6, z, 0.22, 0.6, { color: lc, pat: PAT.logs, seg: 8 }); k.onion(x, 6.2, z, 0.38, { color: dome, pat: PAT.scales, cross: false }); }
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 1.6, z: 8.4, r: 1.6 }, { t: 'glow', x: 3.8, y: 3, z: -1, r: 1.4 }, { t: 'glow', x: -3.8, y: 3, z: -1, r: 1.4 });
      else weeds(k, c, 10, 15, 22);
    },
  },

  // ===== Хтонь и обряды =====
  {
    id: 'totem', name: 'Тотем', cat: 'chthon', size: [3, 3], tier: 0, cost: { silver: 6, wood: 4 }, effect: { chthon: 1, faith: -0.5 }, time: 6, H: 6, plinth: false,
    desc: 'Резной столб с ликами и солнечным венцом, обвязан лентами, у подножия подношения и свечи. Варианты: лики, солнце, ворон, череп.',
    build(k, c) {
      const wood = c.ab ? 0x4e4238 : 0x5e4632;
      k.stage = 1; for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; k.rock(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62, k.rr(0.2, 0.3), { color: stoneCol(k) }); }
      k.stage = 2;
      const H = 4.2;
      k.cyl(0, -0.3, 0, 0.36, H + 0.3, { color: wood, pat: PAT.logs, seg: 9, r2: 0.3, rz: c.ab ? 0.08 : 0 });
      for (let j = 0; j < 3; j++) {
        const y = 0.8 + j * 1.15, ry = (j % 2) * PI / 4;
        k.box(0, y + 0.5, 0.31, 0.6, 0.1, 0.12, { color: wood, pat: PAT.plain, ry });
        k.box(0, y + 0.15, 0.36, 0.12, 0.35, 0.14, { color: wood, pat: PAT.plain, ry });
        for (const s of [-1, 1]) k.box(s * 0.15, y + 0.33, 0.3, 0.12, 0.08, 0.06, { color: c.ab ? COL.dark : (j === 2 ? COL.blood : COL.dark), pat: j === 2 && !c.ab ? PAT.rune : PAT.dark });
        k.box(0, y - 0.08, 0.31, 0.32, 0.07, 0.06, { color: COL.dark, pat: PAT.dark });
        k.box(0, y - 0.25, 0, 0.8, 0.08, 0.8, { color: 0x4a3426, pat: PAT.plain, ry: PI / 4 });
      }
      k.stage = 3;
      const kind = c.v % 4;
      if (kind === 0 || kind === 1) {
        k.cyl(0, H + 0.15, 0.05, 0.75, 0.16, { color: wood, pat: PAT.planks, rx: PI / 2, seg: 12 });
        k.sphere(0, H + 0.15, 0.2, 0.4, { color: c.ab ? COL.plankOld : 0xb08850, pat: PAT.bone, sz: 0.4, seg: 10 });
        for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; k.cone(Math.cos(a) * 0.75, H + 0.15 + Math.sin(a) * 0.75, 0.05, 0.12, 0.85, { color: wood, rz: a - PI / 2, seg: 4 }); }
      } else if (kind === 2) {
        k.box(0, H, 0, 0.5, 0.35, 0.9, { color: 0x1c1a20, pat: PAT.plain });
        k.cone(0, H + 0.2, 0.55, 0.12, 0.45, { color: 0x2a2620, rx: PI / 2, seg: 4 });
        for (const s of [-1, 1]) k.box(s * 0.5, H + 0.15, 0, 0.7, 0.06, 0.6, { color: 0x1c1a20, rz: s * 0.5 });
      } else {
        k.sphere(0, H + 0.25, 0.1, 0.32, { color: COL.bone, pat: PAT.bone, sy: 1.15, seg: 8 });
        for (const s of [-1, 1]) { k.box(s * 0.12, H + 0.3, 0.38, 0.1, 0.1, 0.05, { color: COL.dark, pat: PAT.dark }); k.cone(s * 0.45, H + 0.4, 0.1, 0.07, 0.8, { color: COL.bone, pat: PAT.bone, rz: -s * 1.1, seg: 5 }); }
      }
      const rib = c.ab ? 0x5a4a44 : COL.red;
      for (let i = 0; i < 5; i++) k.box(Math.cos(i * 1.3) * 0.38, H - 0.9 - k.rr(0, 0.6), Math.sin(i * 1.3) * 0.38, 0.08, k.rr(0.7, 1.3), 0.02, { color: i % 2 ? rib : 0xd8c8a0, pat: PAT.cloth, rz: k.rr(-0.25, 0.25), ry: i * 1.3, sway: 0.12, swayBase: H - 0.2 });
      if (!c.ab) {
        k.stage = 4; k.kind = KIND.finish;
        for (let i = 0; i < 4; i++) F.candle(k, k.rr(-0.5, 0.5), 0, 0.75 + k.rr(0, 0.25));
        F.pot(k, 0.55, 0, 0.55, { type: 'gorshok' }); k.sphere(-0.5, 0.12, 0.7, 0.15, { color: 0xb07a3a, pat: PAT.clay, sy: 0.6 });
        k.kind = 0;
        c.fx.push({ t: 'glow', x: 0, y: 3.2, z: 0.6, r: 1.0, red: true });
      } else weeds(k, c, 1.2, 1.2, 4);
    },
  },
  {
    id: 'znak', name: 'Знак «Хтонь рядом»', cat: 'chthon', size: [3, 1], tier: 0, cost: { silver: 2, wood: 2 }, effect: { chthon: 0.2 }, time: 4, H: 2, plinth: false,
    desc: 'Предостерегающая доска на кольях с охранным знаком, вбитых в обложенную камнями землю.',
    build(k, c) {
      k.stage = 1; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.rock(s * 1.1 + k.rr(-0.2, 0.2), 0, k.rr(-0.2, 0.2), k.rr(0.1, 0.16), { color: stoneCol(k) });
      k.stage = 2; for (const s of [-1, 1]) k.cyl(s * 1.1, -0.3, 0, 0.09, 2.4, { color: COL.logDark, pat: PAT.logs, seg: 6, rz: c.ab ? s * 0.06 : k.rr(-0.02, 0.02) });
      k.stage = 3; k.box(0, 0.9, 0.08, 2.6, 1.0, 0.08, { color: 0x4a3a2e, pat: PAT.planks, rz: c.ab ? 0.08 : 0.03 });
      for (const s of [-1, 1]) for (const y of [1.0, 1.75]) k.box(s * 1.1, y, 0.13, 0.05, 0.05, 0.04, { color: COL.iron, pat: PAT.iron });
      for (const s of [-1, 1]) k.cone(s * 1.1, 2.05, 0, 0.1, 0.25, { color: COL.logDark, seg: 5 });
      k.box(0.6, 1.95, 0.0, 0.03, 0.4, 0.02, { color: COL.red, pat: PAT.cloth, sway: 0.15, swayBase: 2.05 });
      c.signs.push({ text: 'ОСТОРОЖНО\nХТОНЬ РЯДОМ', x: 0, y: 1.4, z: 0.13, w: 2.5, h: 0.95, rz: c.ab ? 0.08 : 0.03, rune: true });
    },
  },
  {
    id: 'krug', name: 'Обрядовый круг', cat: 'chthon', size: [11, 11], maxSlope: 1.6, tier: 1, cost: { silver: 30, stone: 24 }, effect: { chthon: 4, faith: -2 }, time: 14, H: 3, plinth: false,
    desc: 'Кольцо стоячих камней с рунами, кострище в камнях с золой, шесты с черепами, свечи и ленты.',
    build(k, c) {
      k.stage = 1;
      k.cyl(0, -0.05, 0, 4.6, 0.1, { color: 0x3a3028, pat: PAT.rune, seg: 24 });
      k.cyl(0, -0.02, 0, 2.2, 0.1, { color: 0x4a3a2e, pat: PAT.earth, seg: 18 });
      k.stage = 2;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = i / n * PI * 2, r = 4.6, h = k.rr(1.6, 2.8) * (c.ab && k.rand() < 0.3 ? 0.4 : 1);
        k.lumpBox(Math.cos(a) * r, -0.3, Math.sin(a) * r, k.rr(0.6, 0.9), h + 0.3, k.rr(0.4, 0.6), { color: stoneCol(k), pat: c.ab ? PAT.rock : PAT.rune, ry: -a, rz: k.rr(-0.1, 0.1) + (c.ab ? k.rr(-0.3, 0.3) : 0), amp: 0.07, cell: 0.3 });
        k.rock(Math.cos(a) * (r + 0.5), 0, Math.sin(a) * (r + 0.5), k.rr(0.12, 0.22), { color: stoneCol(k) });
      }
      k.stage = 3;
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; k.rock(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9, k.rr(0.18, 0.26), { color: 0x5a5450 }); }
      k.cyl(0, 0, 0, 0.75, 0.04, { color: 0x2a2624, pat: PAT.dark, seg: 12 });
      for (let i = 0; i < 5; i++) k.log(0, 0.2, 0, 0.1, 1.4, { color: 0x2a2018, ry: i * 0.63, rz: 0.4 });
      for (const a of [0.35, 2.45, 4.55]) {
        const x = Math.cos(a) * 3.2, z = Math.sin(a) * 3.2;
        k.cyl(x, -0.2, z, 0.06, 2.6, { color: COL.logDark, seg: 5 });
        F.skull(k, x, 2.4, z);
        k.box(x, 2.0, z, 0.03, 0.6, 0.02, { color: COL.red, pat: PAT.cloth, sway: 0.15, swayBase: 2.3 });
      }
      if (!c.ab) {
        for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.3; F.candle(k, Math.cos(a) * 3.9, 0, Math.sin(a) * 3.9); }
        c.fx.push({ t: 'fire', x: 0, y: 0.35, z: 0, s: 1.0 }, { t: 'glow', x: 0, y: 1.2, z: 0, r: 5.5, red: true }, { t: 'crows', x: 0, y: 9, z: 0 });
      } else weeds(k, c, 9, 9, 12);
    },
  },
  {
    id: 'kapishe', name: 'Капище', cat: 'chthon', size: [11, 11], tier: 2, cost: { silver: 50, wood: 30, stone: 10 }, effect: { chthon: 6, faith: -3 }, time: 20, H: 6, plinth: false,
    desc: 'Тын из кольев с черепами, четырёхликий идол на валунах, жертвенный камень, огни в железных чашах.',
    build(k, c) {
      k.stage = 1; k.cyl(0, -0.05, 0, 4.7, 0.12, { color: 0x403428, pat: PAT.earth, seg: 24 });
      k.stage = 2;
      const n = 36;
      for (let i = 0; i < n; i++) {
        const a = i / n * PI * 2; if (Math.abs(((a + PI / 2) % (PI * 2)) - PI) < 0.25) continue;
        if (c.ab && k.rand() < 0.3) continue;
        const r = 4.6, h = k.rr(1.6, 2.1), x = Math.cos(a) * r, z = Math.sin(a) * r, tl = c.ab ? k.rr(-0.3, 0.3) : k.rr(-0.04, 0.04);
        k.cyl(x, -0.3, z, 0.14, h + 0.2, { color: c.ab ? COL.logOld : 0x5a4232, pat: PAT.logs, seg: 6, rz: tl });
        k.cone(x - Math.sin(tl) * h, h - 0.1, z, 0.14, 0.35, { color: 0x4a3426, seg: 6, rz: tl });
        if (i % 6 === 0) F.skull(k, x - Math.sin(tl) * h, h + 0.2, z);
      }
      k.log(0, 1.4, 4.6, 0.08, 4.2 * 0.3, { color: COL.logDark }); // перекладина у прохода
      k.stage = 3;
      const wood = c.ab ? 0x4a4038 : 0x4e3a2a;
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; k.rock(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7, 0.3, { color: stoneCol(k) }); }
      k.cyl(0, -0.3, 0, 0.55, 4.9, { color: wood, pat: PAT.logs, seg: 4, rz: c.ab ? 0.12 : 0 });
      for (let f = 0; f < 4; f++) {
        const a = f * PI / 2, cs = Math.cos(a), sn = Math.sin(a), y = 3.4;
        k.box(sn * 0.42, y, cs * 0.42, 0.14, 0.4, 0.14, { color: wood, ry: a });
        for (const s of [-1, 1]) k.box(sn * 0.4 + cs * s * 0.18, y + 0.3, cs * 0.4 - sn * s * 0.18, 0.13, 0.08, 0.05, { color: COL.blood, pat: c.ab ? PAT.dark : PAT.rune, ry: a });
        k.box(sn * 0.4, y - 0.15, cs * 0.4, 0.34, 0.07, 0.05, { color: COL.dark, pat: PAT.dark, ry: a });
      }
      k.cyl(0, 4.6, 0, 0.7, 0.35, { color: wood, pat: PAT.planks, seg: 8 });
      k.cone(0, 4.95, 0, 0.6, 0.7, { color: wood, seg: 8 });
      k.lumpBox(0, 0, 2.2, 1.6, 0.6, 0.9, { color: stoneCol(k), pat: PAT.rock, amp: 0.08 });
      if (!c.ab) { k.box(0, 0.6, 2.2, 0.9, 0.04, 0.5, { color: COL.blood, pat: PAT.rune }); F.pot(k, 0.5, 0.62, 2.1, { type: 'gorshok', s: 0.8 }); }
      for (const s of [-1, 1]) { k.cyl(s * 1.6, 0, 3, 0.08, 1.4, { color: COL.logDark, seg: 5 }); k.cyl(s * 1.6, 1.4, 3, 0.2, 0.2, { color: COL.iron, pat: PAT.iron, seg: 6, r2: 0.12 }); if (!c.ab) c.fx.push({ t: 'fire', x: s * 1.6, y: 1.65, z: 3, s: 0.4 }); }
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 2, z: 2, r: 4.5, red: true }, { t: 'crows', x: 0, y: 11, z: 0 });
      else weeds(k, c, 9, 9, 14);
    },
  },
  {
    id: 'zhalnik', name: 'Жальник', cat: 'chthon', size: [10, 9], tier: 0, cost: { silver: 8, wood: 10 }, effect: { chthon: 2, faith: 1 }, time: 10, H: 2, plinth: false,
    desc: 'Старый погост: осевшие холмики, кресты-голбцы под кровельками, валуны, жердяная ограда с воротцами.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.12, 0, 8.6, 0.15, 7.6, { color: 0x4a4434, pat: PAT.earth, amp: 0.03 });
      k.stage = 2;
      for (let i = 0; i < 9; i++) {
        const x = -3 + (i % 3) * 3 + k.rr(-0.4, 0.4), z = -2.4 + Math.floor(i / 3) * 2.4 + k.rr(-0.3, 0.3), tl = k.rr(-0.15, 0.15) * (c.ab ? 2.5 : 1);
        k.lumpBox(x, -0.05, z + 0.65, 0.75, 0.3, 1.4, { color: 0x4e4434, pat: PAT.moss, amp: 0.08, cell: 0.3 });
        const r = k.rand();
        if (r < 0.45) {
          k.box(x, -0.2, z, 0.22, 1.7, 0.22, { color: COL.logOld, pat: PAT.logs, rz: tl });
          k.gable(x - Math.sin(tl) * 1.5, 1.45, z, 0.45, 0.75, 0.3, { color: COL.shingleOld, pat: PAT.planks, over: 0.05, th: 0.05, gables: false, ridge: false, eaves: false, stage: 2 });
        } else if (r < 0.8) k.cross(x, -0.2, z, 0.95, { color: COL.logOld, tilt: tl });
        else k.rock(x, 0, z, 0.45, { color: stoneCol(k), sy: 1.1 });
        if (!c.ab && k.rand() < 0.4) F.candle(k, x + 0.2, 0, z + 0.3);
      }
      for (const [x, z, w, d] of [[0, -3.8, 8.6, 0.1], [-2.5, 3.8, 3.6, 0.1], [2.5, 3.8, 3.6, 0.1], [-4.3, 0, 0.1, 7.6], [4.3, 0, 0.1, 7.6]]) {
        if (c.ab && k.rand() < 0.5) continue;
        k.box(x, 0.6, z, w, 0.08, d, { color: COL.logOld, pat: PAT.logs, rz: c.ab ? k.rr(-0.06, 0.06) : 0 });
        for (let t = -0.5; t <= 0.5; t += 0.25) k.cyl(x + t * w * 0.98, -0.2, z + t * d * 0.98, 0.05, 1.1, { color: COL.logDark, seg: 4 });
      }
      for (const s of [-1, 1]) k.cyl(s * 0.65, -0.2, 3.8, 0.08, 1.8, { color: COL.logDark, seg: 5 });
      k.gable(0, 1.6, 3.8, 1.6, 0.6, 0.35, { color: COL.shingleOld, pat: PAT.planks, over: 0.1, th: 0.05, gables: false, ridge: false, eaves: false });
      k.stage = 3;
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 0.6, z: 0, r: 3, red: true }, { t: 'crows', x: 0, y: 7, z: 0 });
    },
  },
  {
    id: 'kurgan', name: 'Курган', cat: 'chthon', size: [11, 11], tier: 1, cost: { silver: 20, stone: 12 }, effect: { chthon: 3 }, time: 12, H: 3, plinth: false,
    desc: 'Насыпь над древней могилой, кольцо валунов, вход заложен плитой, камень-навершие. Лучше не раскапывать.',
    build(k, c) {
      k.stage = 1;
      k.lathe(0, -0.2, 0, [[0, 0], [4.7, 0], [4.4, 0.5], [3.6, 1.4], [2.3, 2.1], [0.8, 2.4], [0, 2.45]], { color: 0x56603a, pat: PAT.moss, seg: 18 });
      k.stage = 2;
      for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; k.rock(Math.cos(a) * 4.8, 0, Math.sin(a) * 4.8, k.rr(0.3, 0.45), { color: stoneCol(k) }); }
      k.lumpBox(0, -0.1, 3.7, 1.7, 1.5, 0.9, { color: stoneCol(k), pat: PAT.rock, amp: 0.06 });
      k.lumpBox(0, 0, 4.15, 0.8, 0.95, 0.12, { color: COL.dark, pat: c.ab ? PAT.dark : PAT.rune, amp: 0.03 });
      k.stage = 3;
      k.lumpBox(0, 2.0, 0, 0.8, 2.1, 0.5, { color: stoneCol(k), pat: PAT.rune, rz: c.ab ? 0.3 : 0.05, amp: 0.06 });
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 1, z: 4.6, r: 2, red: true });
    },
  },

  // ===== Оборона и пути =====
  {
    id: 'chastokol', name: 'Частокол', cat: 'defense', line: { step: 0.32 }, size: [1, 1], tier: 0, cost: { wood: 1 }, costPer: { wood: 1 }, effect: {}, time: 6, H: 3, plinth: false,
    desc: 'Тянется линией: заострённые колья, вкопанные в вал, изнутри обвязка и подкосы. Цена за метр.',
    build(k, c) {
      const L = c.size[0];
      k.stage = 1; k.lumpBox(0, -0.2, 0, L, 0.35, 0.8, { color: COL.earth, pat: PAT.earth, amp: 0.06, cell: 0.4 });
      k.stage = 2;
      for (let x = -L / 2 + 0.16; x < L / 2; x += 0.32) {
        if (c.ab && k.rand() < 0.25) continue;
        const h = 2.4 + k.rr(-0.18, 0.18), tl = c.ab ? k.rr(-0.25, 0.25) : k.rr(-0.025, 0.025);
        k.cyl(x, -0.3, 0, 0.15 * k.rr(0.85, 1.1), h + 0.1, { color: logCol(c), pat: PAT.logs, seg: 6, rz: tl });
        k.cone(x - Math.sin(tl) * h, h - 0.2, 0, 0.15, 0.45, { color: COL.logDark, seg: 6, rz: tl, stage: 3 });
      }
      k.stage = 3; k.box(0, 1.6, -0.2, L, 0.14, 0.1, { color: COL.logDark, pat: PAT.logs });
      for (let x = -L / 2 + 0.6; x < L / 2; x += 2.4) k.box(x, 0, -0.9, 0.12, 2.0, 0.12, { color: COL.logDark, pat: PAT.bark, rx: 0.45 });
    },
  },
  {
    id: 'mostki', name: 'Мостки', cat: 'defense', line: { step: 1, water: true }, size: [1, 2], tier: 0, cost: { wood: 0.5 }, costPer: { wood: 0.5 }, effect: {}, time: 4, H: 0.6, plinth: false,
    desc: 'Тянется линией: дощатый настил на сваях. Можно класть через мелководье и топь.',
    build(k, c) {
      const L = c.size[0];
      k.stage = 1; for (let x = -L / 2 + 0.5; x < L / 2; x += 2) for (const z of [-0.8, 0.8]) k.cyl(x, -c.found - 0.5, z, 0.1, c.found + 0.9, { color: COL.logDark, pat: PAT.logs, seg: 5, rz: k.rr(-0.04, 0.04) });
      k.stage = 2;
      for (let x = -L / 2 + 0.15; x < L / 2; x += 0.3) { if (c.ab && k.rand() < 0.2) continue; k.box(x, 0.25, 0, 0.26, 0.08, 1.9 * k.rr(0.92, 1.04), { color: c.ab ? COL.plankOld : new THREE.Color(COL.plank).offsetHSL(0, 0, k.rr(-0.06, 0.04)).getHex(), pat: PAT.planks, rz: c.ab ? k.rr(-0.08, 0.08) : k.rr(-0.015, 0.015) }); }
      for (const z of [-0.8, 0.8]) k.box(0, 0.1, z, L, 0.15, 0.15, { color: COL.logDark, pat: PAT.logs });
    },
  },
  {
    id: 'vorota', name: 'Ворота', cat: 'defense', size: [8, 4], tier: 1, cost: { silver: 20, wood: 26 }, effect: {}, time: 12, H: 6, plinth: false,
    desc: 'Проезжие ворота: два сруба-тура, кровелька, резной знак, створы на жиковинах с засовом.',
    build(k, c) {
      k.stage = 1; k.lumpBox(0, -0.15, 0, 7.2, 0.2, 2.8, { color: COL.earth, pat: PAT.earth, amp: 0.04 });
      for (const s of [-1, 1]) k.footing(s * 2.6, 0, 0, 1.6, 1.6, 0.3);
      k.stage = 2;
      for (const s of [-1, 1]) k.srub(s * 2.6, 0.3, 0, 1.6, 1.6, 3.9, { color: logCol(c), r: 0.12 });
      k.stage = 3;
      k.log(0, 4.4, 0, 0.2, 7, { color: COL.logDark });
      k.gable(0, 4.5, 0, 7.2, 2.4, 1.3, { ...roofLook(c), hole: c.ab ? 0.35 : 0, logGable: logCol(c), gableAt: 3.45 });
      k.cyl(0, 3.6, 0.95, 0.4, 0.12, { color: c.ab ? COL.plankOld : COL.red, pat: PAT.rune, rx: PI / 2, seg: 10 });
      for (const s of [-1, 1]) {
        const ry = c.ab ? s * 0.9 : s * 0.12, cx = s * 0.9;
        k.box(cx, 0.05, 0.1, 1.7, 3.2, 0.12, { color: COL.plank, pat: PAT.planks, ry, rz: c.ab && s > 0 ? 0.1 : 0 });
        for (const y of [0.4, 2.6]) k.box(cx, y, 0.18, 1.6, 0.14, 0.05, { color: COL.plankOld, pat: PAT.planks, ry });
        for (const y of [0.45, 2.65]) k.box(cx + s * 0.4, y, 0.22, 0.8, 0.06, 0.02, { color: COL.iron, pat: PAT.iron, ry });
      }
      if (!c.ab) k.box(0, 1.6, 0.25, 1.2, 0.12, 0.08, { color: COL.logDark, pat: PAT.bark });
      if (!c.ab) c.fx.push({ t: 'fire', x: -1.75, y: 3.2, z: 0.95, s: 0.28 }, { t: 'fire', x: 1.75, y: 3.2, z: 0.95, s: 0.28 }, { t: 'glow', x: 0, y: 2.5, z: 1.4, r: 2 });
      for (const s of [-1, 1]) k.cyl(s * 1.75, 2.7, 0.95, 0.04, 0.5, { color: COL.iron, seg: 4, stage: 3 });
    },
  },
  {
    id: 'vyshka', name: 'Сторожевая вышка', cat: 'defense', size: [6, 6], tier: 1, cost: { silver: 15, wood: 22 }, effect: { faith: 0.5 }, time: 12, H: 9, plinth: false,
    desc: 'Дозорная вышка на четырёх ногах в валунах, раскосы, площадка с ограждением, лестница, било, шатровая кровелька.',
    build(k, c) {
      k.stage = 1; for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) { k.rock(x, 0, z, 0.38, { color: stoneCol(k) }); k.rock(x + 0.3, 0, z - 0.25, 0.2, { color: stoneCol(k) }); }
      k.stage = 2;
      for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(x, -0.3, z, 0.15, 6.7, { color: logCol(c), pat: PAT.logs, seg: 6, rz: -x * 0.03, rx: z * 0.03 });
      for (const y of [0.4, 2.4]) for (const s of [-1, 1]) { k.box(0, y, s * 1.55, 0.1, Math.hypot(3.2, 2), 0.1, { color: COL.logDark, pat: PAT.bark, rz: Math.atan2(3.2, 2) * (s > 0 ? 1 : -1) }); k.box(s * 1.55, y, 0, 0.1, Math.hypot(3.2, 2), 0.1, { color: COL.logDark, pat: PAT.bark, rx: Math.atan2(3.2, 2) * (s > 0 ? -1 : 1) }); }
      k.box(0, 6, 0, 3.8, 0.18, 3.8, { color: COL.plank, pat: PAT.planks, rz: c.ab ? 0.06 : 0 });
      for (const s of [-1, 1]) { k.box(0, 6.2, s * 1.85, 3.8, 0.9, 0.08, { color: COL.plank, pat: PAT.planks }); k.box(s * 1.85, 6.2, 0, 0.08, 0.9, 3.8, { color: COL.plank, pat: PAT.planks }); }
      // лестница: тетивы и перекладины
      const ladL = Math.hypot(6, 1.9);
      for (const s of [-1, 1]) k.box(s * 0.3, 0, 2.6, 0.07, ladL, 0.1, { color: COL.plank, pat: PAT.planks, rx: -Math.atan2(1.9, 6) });
      for (let i = 1; i < 20; i++) { const t = i / 20; k.box(0, 6 * t, 2.6 - 1.9 * t, 0.6, 0.05, 0.06, { color: COL.plankOld }); }
      k.stage = 3;
      for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(x, 6.2, z, 0.08, 1.8, { color: COL.logDark, seg: 5 });
      k.tent(0, 8, 0, 3.1, 1.8, { seg: 4, ...roofLook(c), rz: c.ab ? 0.1 : 0 });
      k.box(1.0, 7.2, 1.0, 0.02, 0.5, 0.02, { color: COL.rope }); k.box(0.85, 6.7, 1.0, 0.4, 0.5, 0.04, { color: COL.iron, pat: PAT.iron, sway: 0.05, swayBase: 7.2 }); // било
      if (!c.ab) c.fx.push({ t: 'fire', x: 1.4, y: 6.4, z: 1.4, s: 0.3 }, { t: 'glow', x: 0, y: 6.6, z: 0, r: 2.5 });
    },
  },
];

export const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

// Собрать сетку постройки. opts: { v, ab, size:[w,d], found (глубина основания), seed }
export function buildGeometry(def, opts = {}) {
  const k = new Kit((opts.seed ?? 7) * 7919 + (opts.v ?? 0) * 131 + (opts.ab ? 17 : 0));
  k.jitter = opts.ab ? 0.035 : 0.012;
  const size = opts.size ?? def.size;
  const c = { v: opts.v ?? 0, ab: !!opts.ab, size, found: opts.found ?? 0, fx: [], signs: [] };
  const [w, d] = size;
  if (def.plinth !== false && c.found > 0.05) {
    k.stage = 1;
    k.lumpBox(0, -c.found - 0.3, 0, w - 0.6, c.found + 0.35, d - 0.6, { color: COL.stoneDark, pat: PAT.stone });
  }
  k.marking(0, 0, 0, w - 0.2, d - 0.2);
  if (!def.line && def.H > 1.5 && def.cat !== 'yard') k.scaffold(0, 0, 0, Math.max(1.5, w - 2.6), Math.max(1.5, d - 2.6), Math.min(def.H, 9));
  k.stage = 1;
  def.build(k, c);
  return { geometry: k.build(), fx: c.fx, signs: c.signs };
}

// Вывеска: текст на доске (CanvasTexture), рисованный шрифт
export function makeSignTexture(text, w, h, rune) {
  const cv = document.createElement('canvas'); cv.width = Math.round(256 * w / h); cv.height = 256;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  const lines = text.split('\n');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.min(cv.height / lines.length * 0.72, cv.width / Math.max(...lines.map(l => l.length)) * 1.5);
  g.font = `700 ${fs}px "Ruslan Display", "Georgia", serif`;
  lines.forEach((l, i) => {
    const y = cv.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.05;
    g.fillStyle = 'rgba(20,12,8,.6)'; g.fillText(l, cv.width / 2 + 3, y + 4);
    g.fillStyle = '#d8c8a4'; g.fillText(l, cv.width / 2, y);
  });
  if (rune) { g.strokeStyle = 'rgba(170,30,30,.75)'; g.lineWidth = 7; const cx = cv.width * 0.5, cy = cv.height * 0.55, r = cv.height * 0.32; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); g.globalCompositeOperation = 'destination-over'; }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
