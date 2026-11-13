// Каталог построек «Сказанья»: древняя Русь и хтонь. Каждая постройка — функция-строитель,
// которая складывает детали в Kit по этапам (1 основание, 2 стены, 3 кровля, finish — детали готового)
// и знает свой заброшенный вид (c.ab). Фасад смотрит на +z.
import * as THREE from 'three';
import { Kit, PAT, KIND, COL } from './kit.js';

const PI = Math.PI;

// Категории нижней панели
export const CATEGORIES = [
  { id: 'home', name: 'Жильё', icon: '⌂' },
  { id: 'craft', name: 'Хозяйство', icon: '⚒' },
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

function weeds(k, c, w, d, n = 8) {
  const st = k.stage; k.stage = 1;
  for (let i = 0; i < n; i++) {
    const side = k.rand() < 0.5, x = side ? k.rr(-w / 2, w / 2) : k.pick([-1, 1]) * (w / 2 + k.rr(0, 0.6)), z = side ? k.pick([-1, 1]) * (d / 2 + k.rr(0, 0.6)) : k.rr(-d / 2, d / 2);
    k.sphere(x, 0.1, z, k.rr(0.25, 0.55), { color: k.pick([0x55683a, 0x4a5a34, 0x6a7040]), pat: PAT.thatch, sy: k.rr(0.6, 1.3), seg: 6 });
  }
  // упавшее бревно
  k.log(k.rr(-w / 3, w / 3), 0.15, d / 2 + 0.9, 0.14, k.rr(1.5, 3), { color: COL.logOld, ry: k.rr(-0.6, 0.6) });
  k.stage = st;
}
function chimney(k, c, x, y, z, h) {
  const hh = c.ab ? h * 0.65 : h;
  k.box(x, y, z, 0.6, hh, 0.6, { color: COL.stoneDark, pat: PAT.stone, stage: 3 });
  if (!c.ab) { k.box(x, y + hh, z, 0.75, 0.12, 0.75, { color: COL.stoneDark, pat: PAT.plain, stage: 3 }); c.fx.push({ t: 'smoke', x, y: y + hh + 0.2, z }); }
}
function windowsRow(k, c, xs, y, z, ry = 0, o = {}) {
  for (const x of xs) {
    const lit = !c.ab && k.rand() < 0.75;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    k.window(x * cs + z * sn, y, -x * sn + z * cs, ry, { nal: nalCol(c), boarded: c.ab && k.rand() < 0.7, dark: !lit, shutters: o.shutters ?? (c.v % 2 === 1), ...o });
    if (lit) c.fx.push({ t: 'glow', x: x * cs + (z + 0.4) * sn, y: y + 0.35, z: -x * sn + (z + 0.4) * cs, r: 1.2 });
  }
}
// причелины и «конёк» на щипце (ridge along z)
function konyok(k, c, z, y) {
  const st = { stage: 3, color: c.ab ? COL.logOld : COL.logDark };
  k.box(0, y, z, 0.22, 0.5, 0.9, { ...st, rx: -0.5 });
  k.box(0, y + 0.35, z + 0.4, 0.2, 0.35, 0.28, st);
}
// крыльцо сбоку (x = side * wall), дверь в боковой стене
function porch(k, c, wallX, z, base, side = 1) {
  k.stage = 2;
  const px = wallX + side * 0.8;
  k.box(px, 0, z, 1.5, base, 1.6, { color: COL.plank, pat: PAT.planks });
  for (let i = 0; i < 3; i++) k.box(px + side * (0.95 + i * 0.28), 0, z, 0.3, base * (1 - (i + 1) / 4), 1.2, { color: COL.plankOld, pat: PAT.planks });
  k.door(wallX + side * 0.02, base, z, side * PI / 2, { color: c.ab ? COL.logDark : COL.logDark });
  for (const dz of [-0.7, 0.7]) k.cyl(px + side * 0.6, base, z + dz, 0.07, 2.1, { color: COL.logDark, pat: PAT.plain, seg: 6, stage: 3 });
  k.gable(px, base + 2.1, z, 1.7, 1.7, 0.7, { ry: PI / 2, ...roofLook(c), over: 0.15, th: 0.08, stage: 3, hole: c.ab ? 0.4 : 0, ridge: false });
}

// Изба: сруб, двускатная кровля щипцом на улицу, три окна с наличниками, печная труба, крыльцо.
function izba(k, c, o = {}) {
  const W = o.W ?? 5, D = o.D ?? 5, H = o.H ?? 2.6, base = o.base ?? 0.5, RH = o.RH ?? 2.3;
  k.stage = 2;
  k.srub(0, base, 0, W, D, H, { color: logCol(c) });
  windowsRow(k, c, o.wins ?? [-1.25, 0, 1.25], base + 1.1, D / 2);
  windowsRow(k, c, [-0.8], base + 1.1, W / 2, PI / 2);
  k.stage = 3;
  const rl = roofLook(c);
  k.gable(0, base + H, 0, D + 0.6, W, RH, { ry: PI / 2, ...rl, hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.1 : 0, gableColor: logCol(c) });
  // светёлка (окошко в щипце) и причелины
  k.window(0, base + H + 0.45, D / 2 + 0.32, 0, { w: 0.45, h: 0.5, nal: nalCol(c), boarded: c.ab, dark: c.ab, stage: 3 });
  // причелины: от свеса до конька (box вращается вокруг основания)
  for (const s of [-1, 1]) k.box(s * (W / 2 + 0.25), base + H - 0.12, D / 2 + 0.36, 0.2, Math.hypot(W / 2 + 0.25, RH + 0.12), 0.07, { color: nalCol(c), pat: PAT.planks, rz: s * Math.atan2(W / 2 + 0.25, RH + 0.12), stage: 3 });
  if (!c.ab || k.rand() < 0.5) konyok(k, c, D / 2 + 0.45, base + H + RH + 0.05);
  chimney(k, c, W * 0.22, base + H * 0.6, -D * 0.15, RH + 1.4);
  porch(k, c, W / 2, -D * 0.2, base);
  // готовое: поленница, бочка, лавка
  k.stage = 4; k.kind = KIND.finish;
  if (!c.ab) {
    for (let i = 0; i < 4; i++) k.log(-W / 2 - 0.45, 0.12 + i * 0.22, -D / 2 + 1 + (i % 2) * 0.1, 0.11, 1.6, { color: COL.plank, ry: PI / 2 });
    k.cyl(W / 2 - 0.3, 0, D / 2 + 0.6, 0.3, 0.75, { color: COL.plank, pat: PAT.planks, r2: 0.27, seg: 10 });
    k.box(-0.8, 0, D / 2 + 0.55, 1.4, 0.45, 0.35, { color: COL.plank, pat: PAT.planks });
  }
  k.kind = KIND.normal;
  if (c.ab) weeds(k, c, W, D, 10);
}

// ---------- каталог ----------
export const BUILDINGS = [
  // ===== Жильё =====
  {
    id: 'zemlyanka', name: 'Полуземлянка', cat: 'home', size: [5, 5], tier: 0, cost: { silver: 10, wood: 6 }, effect: { people: 3 }, time: 8, H: 2,
    desc: 'Сруб, врытый в землю, кровля дёрном. Первое жильё хутора.',
    build(k, c) {
      k.stage = 1; k.box(0, -0.4, 0, 4.2, 0.6, 4.2, { color: COL.earth, pat: PAT.earth });
      k.stage = 2; k.srub(0, 0, 0, 3.8, 3.8, 0.9, { color: logCol(c) });
      k.door(0, 0, 1.92, 0, { h: 0.9, w: 0.8 });
      k.stage = 3;
      k.gable(0, 0.9, 0, 4.4, 4.0, 1.7, { ry: PI / 2, color: c.ab ? 0x4e5236 : 0x5c6a3a, pat: PAT.thatch, over: 0.5, th: 0.3, hole: c.ab ? 0.4 : 0, gableColor: logCol(c) });
      if (!c.ab) c.fx.push({ t: 'smoke', x: 0.6, y: 2.7, z: -0.4 }); else weeds(k, c, 4, 4, 8);
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 0.6, z: 2.3, r: 0.9 });
    },
  },
  {
    id: 'izba', name: 'Изба', cat: 'home', size: [7, 6], tier: 0, cost: { silver: 25, wood: 20 }, effect: { people: 5 }, time: 12, H: 3.2,
    desc: 'Рубленая изба на подклете, щипец на улицу, резные наличники.',
    build(k, c) { izba(k, c); },
  },
  {
    id: 'pyatistenok', name: 'Изба-пятистенок', cat: 'home', size: [9, 8], tier: 1, cost: { silver: 45, wood: 34, stone: 6 }, effect: { people: 9 }, time: 16, H: 4.4,
    desc: 'Большая изба на каменном подклете, с внутренней пятой стеной и высоким крыльцом.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 7.4, 1.2, 6.4, { color: COL.stone, pat: PAT.stone });
      for (const x of [-2.4, 0, 2.4]) k.window(x, 0.35, 3.21, 0, { w: 0.5, h: 0.4, dark: true, nal: COL.stoneDark, boarded: c.ab });
      izba(k, c, { W: 7, D: 6, H: 3, base: 1.2, RH: 2.9, wins: [-2.4, -1.2, 1.2, 2.4] });
      k.stage = 2; k.box(0, 1.2, 3.05, 0.35, 3, 0.25, { color: logCol(c), pat: PAT.logEnds });
    },
  },
  {
    id: 'terem', name: 'Терем', cat: 'home', size: [10, 10], maxSlope: 2.5, tier: 2, cost: { silver: 120, wood: 70, stone: 20 }, effect: { people: 14, faith: 1 }, time: 26, H: 9,
    desc: 'Двухъярусный терем с шатровой башенкой и гульбищем. Дом старосты.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 7.4, 1.2, 7.4, { color: COL.stone, pat: PAT.stone });
      k.stage = 2;
      k.srub(0, 1.2, 0, 7, 7, 3, { color: logCol(c) });
      k.box(0, 4.2, 0, 8.2, 0.2, 8.2, { color: COL.plank, pat: PAT.planks }); // гульбище
      for (const s of [-1, 1]) for (let i = -3; i <= 3; i++) { k.box(i * 1.2, 4.4, s * 4, 0.08, 0.8, 0.08, { color: COL.white, pat: PAT.plain }); k.box(s * 4, 4.4, i * 1.2, 0.08, 0.8, 0.08, { color: COL.white, pat: PAT.plain }); }
      for (const s of [-1, 1]) { k.box(0, 5.1, s * 4, 8.2, 0.1, 0.1, { color: COL.white }); k.box(s * 4, 5.1, 0, 0.1, 0.1, 8.2, { color: COL.white }); }
      k.srub(0, 4.4, 0, 5, 5, 2.6, { color: logCol(c) });
      windowsRow(k, c, [-2.2, -0.8, 0.8, 2.2], 2.2, 3.5, 0, { shutters: true });
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5);
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5, PI / 2);
      windowsRow(k, c, [-1.2, 1.2], 5.4, 2.5, -PI / 2);
      k.stage = 3;
      const rl = roofLook(c, 2);
      k.gable(0, 4.2, 0, 8.4, 8.4, 0.01, { ...rl, gables: false, ridge: false, over: 0, th: 0.12 });
      k.tent(0, 7, 0, 4.0, 4.4, { seg: 4, ...rl, sag: 0 });
      k.box(0, 10.8, 0, 1.2, 1.2, 1.2, { color: logCol(c), pat: PAT.logs });
      k.tent(0, 12, 0, 1.1, 1.9, { seg: 8, ...rl });
      if (!c.ab) k.onion(0, 13.7, 0, 0.35, { color: COL.lead, pat: PAT.gold, stage: 3 });
      chimney(k, c, -1.6, 6, -1.2, 2.6);
      porch(k, c, 3.5, 1.5, 1.2);
      if (c.ab) weeds(k, c, 8, 8, 14);
    },
  },

  // ===== Хозяйство =====
  {
    id: 'kolodec', name: 'Колодец-журавль', cat: 'craft', size: [3, 3], tier: 0, cost: { silver: 8, wood: 6, stone: 2 }, effect: { people: 1 }, time: 6, H: 2, plinth: false,
    desc: 'Сруб колодца и журавль с бадьёй.',
    build(k, c) {
      k.stage = 1; k.box(0, -0.2, 0, 1.6, 0.25, 1.6, { color: COL.stoneDark, pat: PAT.stone });
      k.stage = 2; k.srub(0, 0, 0, 1.3, 1.3, 0.85, { color: logCol(c), t: 0.2 });
      k.box(0, 0.6, 0, 0.9, 0.05, 0.9, { color: 0x1a2a30, pat: PAT.dark });
      k.stage = 3;
      k.cyl(-1.1, 0, -0.6, 0.12, 3.2, { color: COL.logDark, pat: PAT.logs });
      const tilt = c.ab ? -0.15 : 0.5;
      k.log(-1.1, 3.1, -0.6, 0.06, 6, { color: COL.plank, rz: tilt, ry: 0.5 });
      k.cyl(1.4, 3.1 + Math.sin(tilt) * 2.2 - 2.2, 0.6, 0.015, 2.2, { color: COL.rope, seg: 4 });
      k.cyl(1.4, Math.max(0.9, 3.1 + Math.sin(tilt) * 2.2 - 2.6), 0.6, 0.18, 0.35, { color: COL.plank, pat: PAT.planks, r2: 0.2 });
      if (c.ab) weeds(k, c, 1.6, 1.6, 4);
    },
  },
  {
    id: 'ambar', name: 'Амбар', cat: 'craft', size: [6, 5], tier: 0, cost: { silver: 15, wood: 16 }, effect: { store: 40 }, time: 10, H: 4,
    desc: 'Житница на стульях-столбах, чтобы мыши не добрались.',
    build(k, c) {
      k.stage = 1; for (const x of [-2, 0, 2]) for (const z of [-1.5, 1.5]) k.cyl(x, -0.2, z, 0.18, 0.9, { color: COL.logDark, pat: PAT.logs });
      k.stage = 2; k.srub(0, 0.7, 0, 5, 4, 2.2, { color: logCol(c) });
      k.door(0, 0.7, 2.01, 0, { w: 1.3, h: 1.6 });
      k.box(0, 0, 2.6, 1.6, 0.7, 1, { color: COL.plank, pat: PAT.planks, rx: 0.4 });
      k.stage = 3; k.gable(0, 2.9, 0, 5.6, 4, 1.6, { ...roofLook(c), hole: c.ab ? 0.4 : 0, sag: c.ab ? 0.1 : 0, gableColor: logCol(c), over: 0.55 });
      if (!c.ab) { k.stage = 4; k.kind = KIND.finish; for (let i = 0; i < 3; i++) k.sphere(-2 + i * 0.6, 0.35, 2.6, 0.35, { color: 0xb09868, pat: PAT.cloth, sy: 1.2 }); k.kind = 0; }
      else weeds(k, c, 5, 4, 8);
    },
  },
  {
    id: 'banya', name: 'Баня', cat: 'craft', size: [5, 4], tier: 0, cost: { silver: 12, wood: 12, stone: 2 }, effect: { people: 1, faith: 0 }, time: 8, H: 3,
    desc: 'Баня по-чёрному у воды. Банник не любит, когда моются ночью.',
    build(k, c) {
      k.stage = 2; k.srub(0, 0, 0, 3.6, 3, 1.9, { color: logCol(c) });
      k.door(-0.9, 0, 1.51, 0, { h: 1.3, w: 0.7 });
      k.window(0.8, 1, 1.51, 0, { w: 0.35, h: 0.3, nal: nalCol(c), dark: true, boarded: c.ab });
      k.box(0, 0, 2.2, 3.8, 0.15, 1.2, { color: COL.plank, pat: PAT.planks });
      k.stage = 3; k.gable(0, 1.9, 0.3, 3.8, 4.2, 1.3, { ...roofLook(c, 1), hole: c.ab ? 0.4 : 0, gableColor: logCol(c) });
      if (!c.ab) c.fx.push({ t: 'smoke', x: 0.6, y: 3.4, z: 0 }, { t: 'smoke', x: -0.9, y: 1.4, z: 1.7 });
      else weeds(k, c, 3.6, 3, 6);
    },
  },
  {
    id: 'kuznya', name: 'Кузница', cat: 'craft', size: [7, 6], tier: 1, cost: { silver: 30, wood: 18, stone: 10 }, effect: { silver: 2 }, time: 14, H: 4,
    desc: 'Открытая кузня: горн, наковальня, мехи. Кузнеца побаиваются и нечисть, и люди.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 6, 0.25, 5, { color: COL.earth, pat: PAT.earth });
      k.stage = 2;
      k.srub(0, 0.25, -1.2, 6, 2.6, 2.4, { color: logCol(c), corners: true });
      for (const x of [-2.8, 0, 2.8]) k.cyl(x, 0.25, 2.2, 0.14, 2.6, { color: COL.logDark, pat: PAT.logs });
      k.box(-1.4, 0.25, -0.6, 1.6, 0.9, 1.2, { color: COL.stoneDark, pat: PAT.stone }); // горн
      k.box(-1.4, 1.15, -0.6, 1.0, 0.08, 0.7, { color: c.ab ? COL.stoneDark : COL.fire, pat: c.ab ? PAT.dark : PAT.fire });
      k.box(1, 0.25, 0.7, 0.5, 0.55, 0.4, { color: COL.logDark, pat: PAT.logs });
      k.box(1, 0.8, 0.7, 0.7, 0.2, 0.25, { color: COL.iron, pat: PAT.plain });
      k.stage = 3; k.gable(0, 2.85, 0, 6.6, 5.6, 1.7, { ...roofLook(c), hole: c.ab ? 0.4 : 0, gableColor: logCol(c) });
      chimney(k, c, -1.4, 1.2, -1.4, 3.8);
      if (!c.ab) c.fx.push({ t: 'fire', x: -1.4, y: 1.3, z: -0.6, s: 0.6 }, { t: 'glow', x: -1.4, y: 1.4, z: -0.3, r: 3.5 });
      else weeds(k, c, 6, 5, 8);
    },
  },
  {
    id: 'sklad', name: 'Лесной склад', cat: 'craft', size: [9, 7], tier: 0, cost: { silver: 15, wood: 4 }, effect: { wood: 3 }, time: 10, H: 3,
    desc: 'Навес и штабеля брёвен. Даёт брёвна.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 8, 0.12, 6, { color: COL.earth, pat: PAT.earth });
      k.stage = 2;
      for (const x of [-3, 0, 3]) for (const z of [-2.5, 0]) k.cyl(x, 0, z, 0.12, 2.6, { color: COL.logDark, pat: PAT.logs, rz: c.ab ? k.rr(-0.1, 0.1) : 0 });
      const n = c.ab ? 2 : 4;
      for (let r = 0; r < n; r++) for (let i = 0; i < 5 - r; i++) k.log(-1.8 + (r % 2) * 0.1, 0.2 + r * 0.36, 1.6 + i * 0.4 - (5 - r) * 0.2, 0.18, 4.2, { color: COL.log, ry: 0 });
      k.box(2.5, 0, 2, 1.2, 0.5, 0.8, { color: COL.logDark, pat: PAT.logs }); // колода
      k.stage = 3; k.gable(0, 2.6, -1.25, 6.8, 3.4, 0.9, { ...roofLook(c, 3), gables: false, hole: c.ab ? 0.5 : 0 });
      if (c.ab) weeds(k, c, 8, 6, 10);
    },
  },
  {
    id: 'kamen', name: 'Каменотёсня', cat: 'craft', size: [8, 7], tier: 1, cost: { silver: 25, wood: 14 }, effect: { stone: 2 }, time: 12, H: 4,
    desc: 'Тёсаный камень, ворот для подъёма блоков. Даёт камень.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 7, 0.15, 6, { color: COL.stoneDark, pat: PAT.stone });
      k.stage = 2;
      for (let i = 0; i < 7; i++) k.box(k.rr(-3, 0), 0.15, k.rr(-2.5, 2.5), k.rr(0.6, 1.2), k.rr(0.4, 0.8), k.rr(0.6, 1.0), { color: COL.stone, pat: PAT.stone, ry: k.rr(-0.4, 0.4) });
      for (const z of [-1, 1]) k.box(2, 0.15, z, 0.2, 3.4, 0.2, { color: COL.logDark, pat: PAT.logs, rz: 0.2 * -1 });
      k.log(2.3, 3.4, 0, 0.12, 2.4, { ry: PI / 2, color: COL.logDark });
      k.box(2.3, 1.2, 0, 0.9, 0.7, 0.9, { color: COL.stone, pat: PAT.stone });
      k.stage = 3; k.gable(-1.5, 2.4, -2, 3.6, 2.6, 0.9, { ...roofLook(c, 3), gables: false });
      for (const x of [-3.1, 0.1]) k.cyl(x, 0.15, -2, 0.1, 2.3, { color: COL.logDark, pat: PAT.logs, stage: 2 });
      if (c.ab) weeds(k, c, 7, 6, 10);
    },
  },
  {
    id: 'melnica', name: 'Мельница', cat: 'craft', size: [7, 7], tier: 2, cost: { silver: 60, wood: 40, stone: 6 }, effect: { silver: 3, people: 1 }, time: 20, H: 10,
    desc: 'Мельница-столбовка. Мельник, говорят, водится с водяным.',
    build(k, c) {
      k.stage = 1; k.tent(0, 0, 0, 3, 3.2, { seg: 8, color: logCol(c), pat: PAT.logs });
      k.stage = 2; k.cyl(0, 3, 0, 0.3, 1.6, { color: COL.logDark, pat: PAT.logs });
      k.srub(0, 4.4, 0, 3.2, 3.6, 3.2, { color: logCol(c), corners: false });
      windowsRow(k, c, [0], 6, 1.8);
      k.box(0, 0, 3.4, 0.6, 4.6, 0.2, { color: COL.plank, pat: PAT.planks, rx: 0.65 }); // лестница
      k.stage = 3; k.gable(0, 7.6, 0, 3.8, 3.2, 1.6, { ...roofLook(c), ry: PI / 2, hole: c.ab ? 0.4 : 0, gableColor: logCol(c) });
      const rot = c.ab ? 0.35 : k.rr(0, 1.5);
      const sails = c.ab ? 2 : 4;
      for (let i = 0; i < sails; i++) {
        const a = rot + i * PI / 2;
        // ось в ступице (0, 7.2, 2.15); box() вращается вокруг своего основания
        k.box(0, 7.2, 2.15, 0.12, 5.2, 0.1, { color: COL.logDark, pat: PAT.plain, rz: -a, stage: 3 });
        k.box(Math.sin(a) * 1.2 + Math.cos(a) * 0.45, 7.2 + Math.cos(a) * 1.2 - Math.sin(a) * 0.45, 2.22, 0.8, 3.8, 0.04, { color: c.ab ? 0x8a8070 : 0xd8c8a0, pat: PAT.cloth, rz: -a, stage: 3 });
      }
      if (c.ab) weeds(k, c, 5, 5, 8);
    },
  },
  {
    id: 'ogorod', name: 'Огород', cat: 'craft', area: { min: [4, 4], max: [16, 14] }, size: [8, 6], tier: 0, cost: { silver: 4 }, costPer: { silver: 0.15 }, effect: { people: 0 }, effectPer: { silver: 0.04 }, time: 6, H: 1.5, plinth: false,
    desc: 'Тянется мышью: грядки, плетень, пугало. Цена и доход по площади.',
    build(k, c) {
      const [w, d] = c.size;
      k.stage = 1;
      k.box(0, -0.15, 0, w - 0.4, 0.25, d - 0.4, { color: COL.earth, pat: PAT.earth });
      k.stage = 2;
      for (let x = -w / 2 + 0.9; x < w / 2 - 0.5; x += 0.9) k.box(x, 0.05, 0, 0.5, 0.18, d - 1.2, { color: 0x4a3828, pat: PAT.earth });
      if (!c.ab) { k.stage = 3; for (let x = -w / 2 + 0.9; x < w / 2 - 0.5; x += 0.9) for (let z = -d / 2 + 1; z < d / 2 - 0.8; z += 0.6) k.sphere(x, 0.3, z, 0.18, { color: k.pick([0x5c7a3a, 0x6a8a40, 0x7a8a3a]), pat: PAT.thatch, seg: 5 }); }
      // плетень
      k.stage = 2;
      const P = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      for (let i = 0; i < 4; i++) {
        const [ax, az] = P[i], [bx, bz] = P[(i + 1) % 4], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 1.2);
        for (let j = 0; j < n; j++) { const t = j / n; if (c.ab && k.rand() < 0.3) continue; k.cyl(ax + (bx - ax) * t, 0, az + (bz - az) * t, 0.04, 0.9, { color: COL.logDark, seg: 4, rz: c.ab ? k.rr(-0.3, 0.3) : 0 }); }
        if (i === 2 && !c.ab) continue; // калитка
        k.box((ax + bx) / 2, 0.3, (az + bz) / 2, ax !== bx ? len : 0.08, 0.45, ax !== bx ? 0.08 : len, { color: 0x7a6040, pat: PAT.thatch });
      }
      // пугало
      k.stage = 3;
      k.cyl(w / 4, 0, 0, 0.05, 1.9, { color: COL.logDark, seg: 4 });
      k.box(w / 4, 1.4, 0, 1.3, 0.06, 0.06, { color: COL.logDark, rz: c.ab ? 0.4 : 0 });
      k.box(w / 4, 0.9, 0, 0.6, 0.8, 0.3, { color: c.ab ? 0x5a5048 : COL.cloth, pat: PAT.cloth });
      k.sphere(w / 4, 1.95, 0, 0.2, { color: c.ab ? COL.bone : 0xc8b080, pat: c.ab ? PAT.bone : PAT.thatch });
      k.cone(w / 4, 2.05, 0, 0.32, 0.35, { color: 0x6a5030, pat: PAT.thatch });
    },
  },

  // ===== Торг =====
  {
    id: 'ryady', name: 'Торговые ряды', cat: 'trade', size: [14, 7], tier: 0, cost: { silver: 30, wood: 24 }, effect: { silver: 4 }, time: 14, H: 3.4,
    desc: 'Лавки под навесами и ворота с вывеской. Даёт серебро от жителей.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, -0.5, 13, 0.2, 4.5, { color: COL.plank, pat: PAT.planks });
      const cloth = [0xa8322a, 0x3e6a78, 0xb08a3a, 0x6a3a5a];
      for (let i = 0; i < 4; i++) {
        const x = -4.8 + i * 3.2;
        k.stage = 2;
        k.srub(x, 0.2, -2, 3, 1.6, 2.4, { color: logCol(c), corners: false, t: 0.2 });
        k.box(x, 0.2, 0.1, 2.6, 0.9, 0.6, { color: COL.plank, pat: PAT.planks }); // прилавок
        for (const s of [-1, 1]) k.cyl(x + s * 1.4, 0.2, 1.4, 0.07, 2.4, { color: COL.logDark, seg: 6 });
        k.stage = 3;
        const hang = c.ab && k.rand() < 0.6;
        k.box(x, 2.3, 0.1, 3.0, 0.06, 3.2, { color: c.ab ? 0x6a6058 : cloth[(i + c.v) % 4], pat: PAT.cloth, rx: hang ? -0.6 : -0.22, rz: hang ? k.rr(-0.3, 0.3) : 0 });
        k.gable(x, 2.6, -2, 3.2, 1.8, 0.6, { ...roofLook(c), gables: false, ridge: false, over: 0.2, hole: c.ab ? 0.4 : 0 });
        if (!c.ab) { k.stage = 4; k.kind = KIND.finish;
          k.cyl(x - 0.7, 1.1, 0.1, 0.22, 0.45, { color: COL.plank, pat: PAT.planks, seg: 8 });
          k.sphere(x + 0.5, 1.25, 0.1, 0.25, { color: k.pick([0xc8a050, 0x8a3a2a, 0x6a8a3a]), pat: PAT.cloth, sy: 0.6 });
          k.box(x, 1.1, 1.0, 0.8, 0.5, 0.3, { color: 0xb09868, pat: PAT.cloth });
          k.kind = 0; c.fx.push({ t: 'glow', x, y: 1.8, z: 0.6, r: 1.8 }); }
      }
      // ворота с вывеской
      k.stage = 2;
      for (const s of [-1, 1]) k.cyl(s * 2.2, 0, 3.1, 0.18, 3.6, { color: COL.logDark, pat: PAT.logs });
      k.stage = 3;
      k.log(0, 3.3, 3.1, 0.16, 5.6, { color: COL.logDark });
      k.gable(0, 3.45, 3.1, 5.8, 0.9, 0.5, { ...roofLook(c), gables: false, over: 0.2, th: 0.08 });
      k.box(0, 2.45, 3.18, 2.6, 0.7, 0.08, { color: 0x5a4030, pat: PAT.planks, rz: c.ab ? 0.12 : 0 });
      c.signs.push({ text: 'ТОРГОВЫЕ РЯДЫ', x: 0, y: 2.8, z: 3.24, w: 2.5, h: 0.62, rz: c.ab ? 0.12 : 0 });
      if (!c.ab) c.fx.push({ t: 'fire', x: -2.2, y: 3.75, z: 3.1, s: 0.3 }, { t: 'fire', x: 2.2, y: 3.75, z: 3.1, s: 0.3 }, { t: 'glow', x: 0, y: 3, z: 3.4, r: 3 });
      if (c.ab) weeds(k, c, 13, 5, 14);
    },
  },
  {
    id: 'korchma', name: 'Корчма', cat: 'trade', size: [11, 9], tier: 1, cost: { silver: 55, wood: 40, stone: 8 }, effect: { silver: 4, people: 2 }, time: 18, H: 6,
    desc: 'Длинная изба с гульбой, бочками и фонарями. Тут говорят о хтони шёпотом.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 10, 0.5, 7, { color: COL.stone, pat: PAT.stone });
      k.stage = 2; k.srub(0, 0.5, -0.5, 9.4, 6, 3, { color: logCol(c) });
      windowsRow(k, c, [-3.4, -2, 2, 3.4], 1.5, 2.5, 0, { shutters: true });
      k.door(0, 0.5, 2.52, 0, { w: 1.2, h: 1.9 });
      k.box(0, 0, 3.4, 9.4, 0.5, 1.6, { color: COL.plank, pat: PAT.planks });
      for (const x of [-4.4, -1.5, 1.5, 4.4]) k.cyl(x, 0.5, 4.1, 0.1, 2.4, { color: COL.logDark, seg: 6 });
      k.stage = 3;
      k.gable(0, 3.5, -0.5, 10, 6, 2.6, { ...roofLook(c), hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.1 : 0, gableColor: logCol(c) });
      k.gable(0, 2.9, 3.4, 9.6, 1.8, 0.4, { ...roofLook(c), gables: false, ridge: false, over: 0.2, hole: c.ab ? 0.5 : 0, rx: 0 });
      chimney(k, c, 2.8, 3, -1.5, 3.6);
      k.box(-2.8, 2.6, 4.05, 1.6, 0.5, 0.06, { color: 0x5a4030, pat: PAT.planks, rz: c.ab ? -0.2 : 0 });
      c.signs.push({ text: 'КОРЧМА', x: -2.8, y: 2.85, z: 4.1, w: 1.5, h: 0.45, rz: c.ab ? -0.2 : 0 });
      if (!c.ab) {
        k.stage = 4; k.kind = KIND.finish;
        for (let i = 0; i < 3; i++) k.cyl(3.5 + (i % 2) * 0.6, 0.5 + Math.floor(i / 2) * 0.75, 3.6, 0.3, 0.75, { color: COL.plank, pat: PAT.planks, r2: 0.26, seg: 10 });
        k.kind = 0;
        c.fx.push({ t: 'fire', x: -1.5, y: 2.75, z: 4.2, s: 0.25 }, { t: 'glow', x: -1.5, y: 2.6, z: 4.4, r: 3 });
      } else weeds(k, c, 9, 7, 14);
    },
  },

  // ===== Вера =====
  {
    id: 'chasovnya', name: 'Часовня', cat: 'faith', size: [5, 5], tier: 0, cost: { silver: 20, wood: 14 }, effect: { faith: 3 }, time: 10, H: 6,
    desc: 'Рубленая часовенка с одной главкой на барабане.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 3.8, 0.4, 3.8, { color: COL.stone, pat: PAT.stone });
      k.stage = 2; k.srub(0, 0.4, 0, 3.4, 3.4, 2.6, { color: logCol(c) });
      k.door(0, 0.4, 1.71, 0, { w: 0.9, h: 1.8 });
      windowsRow(k, c, [0], 1.8, 1.7, PI / 2, { w: 0.35, h: 0.6, nal: COL.white });
      k.stage = 3;
      k.gable(0, 3, 0, 4, 3.6, 2.2, { ...roofLook(c), ry: PI / 2, hole: c.ab ? 0.3 : 0, gableColor: logCol(c) });
      k.cyl(0, 4.6, -0.6, 0.35, 0.9, { color: logCol(c), pat: PAT.logs, seg: 8 });
      if (!c.ab) k.onion(0, 5.5, -0.6, 0.5, { color: [COL.lead, COL.gold, COL.teal, COL.lead][c.v], pat: PAT.gold });
      else k.onion(0, 5.5, -0.6, 0.5, { color: 0x5a6068, pat: PAT.shingles, tilt: 0.25, crossColor: COL.iron });
      if (c.ab) weeds(k, c, 3.4, 3.4, 8);
      else c.fx.push({ t: 'glow', x: 0, y: 1.2, z: 2, r: 1.4 });
    },
  },
  {
    id: 'kolokolnya', name: 'Колокольня', cat: 'faith', size: [5, 5], tier: 1, cost: { silver: 40, wood: 30, stone: 4 }, effect: { faith: 4 }, time: 16, H: 12,
    desc: 'Шатровая звонница. Звон отгоняет нечисть на версту.',
    build(k, c) {
      k.stage = 1; k.box(0, 0, 0, 4, 0.5, 4, { color: COL.stone, pat: PAT.stone });
      k.stage = 2; k.srub(0, 0.5, 0, 3.6, 3.6, 5, { color: logCol(c) });
      k.door(0, 0.5, 1.81, 0);
      k.box(0, 5.5, 0, 4.6, 0.2, 4.6, { color: COL.plank, pat: PAT.planks });
      for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(x, 5.7, z, 0.12, 2.2, { color: COL.logDark, pat: PAT.logs, seg: 6 });
      k.stage = 3;
      if (!c.ab) k.sphere(0, 6.9, 0, 0.55, { color: 0x8a6a3a, pat: PAT.gold, sy: 1.1, seg: 10 });
      k.tent(0, 7.9, 0, 3.0, 0.6, { seg: 4, ...roofLook(c) });
      k.tent(0, 8.4, 0, 2.2, 4.2, { seg: 8, ...roofLook(c, 2), rz: c.ab ? 0.05 : 0 });
      k.onion(0, 12.4, 0, 0.42, { color: c.ab ? 0x5a6068 : COL.lead, tilt: c.ab ? 0.3 : 0, crossColor: c.ab ? COL.iron : undefined });
      if (c.ab) weeds(k, c, 3.6, 3.6, 8);
    },
  },
  {
    id: 'cerkov', name: 'Церковь', cat: 'faith', size: [12, 17], maxSlope: 3, tier: 1, cost: { silver: 120, wood: 90, stone: 20 }, effect: { faith: 12 }, time: 30, H: 16,
    desc: 'Шатровая деревянная церковь: четверик, восьмерик, шатёр, трапезная, алтарь, главы.',
    build(k, c) {
      const lc = logCol(c), rl = roofLook(c, 2);
      k.stage = 1; k.box(0, 0, 0, 11, 0.7, 16, { color: COL.stone, pat: PAT.stone });
      k.stage = 2;
      k.srub(0, 0.7, -1, 7, 7, 5, { color: lc });                       // четверик
      k.cyl(0, 5.7, -1, 3.1, 3, { seg: 8, color: lc, pat: PAT.logs });   // восьмерик
      k.srub(0, 0.7, 5, 6, 5, 3.4, { color: lc });                      // трапезная
      k.srub(0, 0.7, -6.3, 4.4, 3.6, 3.6, { color: lc });               // алтарь
      k.box(0, 0.7, 7.9, 3.2, 0.2, 1.6, { color: COL.plank, pat: PAT.planks }); // паперть
      k.door(0, 0.7, 7.52, 0, { w: 1.2, h: 2.2 });
      windowsRow(k, c, [-1.6, 1.6], 2, 7.5, 0, { w: 0.45, h: 0.8, nal: COL.white });
      windowsRow(k, c, [-1.6, 1.6], 2.4, 3.5, PI / 2, { w: 0.45, h: 0.9 });
      windowsRow(k, c, [-1.6, 1.6], 2.4, 3.5, -PI / 2, { w: 0.45, h: 0.9 });
      k.stage = 3;
      k.gable(0, 4.1, 5, 5.6, 6, 1.8, { ...rl, hole: c.ab ? 0.35 : 0, sag: c.ab ? 0.06 : 0, gableColor: lc });
      k.gable(0, 4.3, -6.3, 4.4, 4.4, 1.5, { ...rl, hole: c.ab ? 0.3 : 0, gableColor: lc });
      k.tent(0, 5.7, -1, 4.3, 0.9, { seg: 4, ...rl });                  // повал четверика
      k.tent(0, 8.7, -1, 3.4, 0.6, { seg: 8, ...rl, sag: 0 });
      k.tent(0, 9.2, -1, 2.6, 6.2, { seg: 8, ...rl, rz: c.ab ? 0.04 : 0 }); // шатёр
      // главы
      const dome = c.ab ? 0x5a6068 : [COL.lead, COL.gold, COL.lead, COL.teal][c.v];
      k.cyl(0, 15.2, -1, 0.35, 0.8, { color: lc, pat: PAT.logs, seg: 8 });
      k.onion(0, 15.9, -1, 0.75, { color: dome, tilt: c.ab ? 0.2 : 0, crossColor: c.ab ? COL.iron : undefined });
      k.cyl(0, 5.8, 5, 0.25, 0.6, { color: lc, pat: PAT.logs, seg: 8 });
      k.onion(0, 6.4, 5, 0.45, { color: dome, cross: !c.ab });
      if (c.v >= 2) for (const x of [-2.6, 2.6]) for (const z of [-3.6, 1.6]) { k.cyl(x, 5.7, z, 0.22, 0.5, { color: lc, pat: PAT.logs, seg: 8 }); k.onion(x, 6.2, z, 0.38, { color: dome, cross: false }); }
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 1.5, z: 8.2, r: 2.5 }, { t: 'glow', x: 3.8, y: 3, z: -1, r: 2 }, { t: 'glow', x: -3.8, y: 3, z: -1, r: 2 });
      else weeds(k, c, 10, 15, 22);
    },
  },

  // ===== Хтонь и обряды =====
  {
    id: 'totem', name: 'Тотем', cat: 'chthon', size: [2, 2], tier: 0, cost: { silver: 6, wood: 4 }, effect: { chthon: 1, faith: -0.5 }, time: 6, H: 6, plinth: false,
    desc: 'Резной столб с ликами и солнечным венцом, обвязан лентами. Варианты: лики, солнце, ворон, череп.',
    build(k, c) {
      const wood = c.ab ? 0x4e4238 : 0x5e4632;
      k.stage = 1; for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; k.box(Math.cos(a) * 0.7, -0.1, Math.sin(a) * 0.7, 0.35, 0.25, 0.3, { color: COL.stoneDark, pat: PAT.stone, ry: a }); }
      k.stage = 2;
      const H = 4.2;
      k.cyl(0, 0, 0, 0.36, H, { color: wood, pat: PAT.logs, seg: 8, r2: 0.3, rz: c.ab ? 0.08 : 0 });
      // лики: брови, нос, глазницы, рот — три яруса
      for (let j = 0; j < 3; j++) {
        const y = 0.8 + j * 1.15, ry = (j % 2) * PI / 4;
        k.box(0, y + 0.5, 0.31, 0.6, 0.1, 0.12, { color: wood, pat: PAT.plain, ry, stage: 2 });
        k.box(0, y + 0.15, 0.36, 0.12, 0.35, 0.14, { color: wood, pat: PAT.plain, ry, stage: 2 });
        for (const s of [-1, 1]) k.box(s * 0.15, y + 0.33, 0.3, 0.12, 0.08, 0.06, { color: c.ab ? COL.dark : (j === 2 ? COL.blood : COL.dark), pat: j === 2 && !c.ab ? PAT.rune : PAT.dark, stage: 2 });
        k.box(0, y - 0.08, 0.31, 0.32, 0.07, 0.06, { color: COL.dark, pat: PAT.dark, stage: 2 });
        k.box(0, y - 0.25, 0, 0.8, 0.08, 0.8, { color: 0x4a3426, pat: PAT.plain, ry: PI / 4, stage: 2 });
      }
      k.stage = 3;
      const kind = c.v % 4;
      if (kind === 0 || kind === 1) { // солнечный венец с лучами
        k.cyl(0, H + 0.15, 0.05, 0.75, 0.16, { color: wood, pat: PAT.planks, rx: PI / 2, seg: 12 });
        k.sphere(0, H + 0.15, 0.2, 0.4, { color: c.ab ? COL.plankOld : 0xb08850, pat: PAT.bone, sz: 0.4, seg: 10 });
        for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2; k.cone(Math.cos(a) * 0.75, H + 0.15 + Math.sin(a) * 0.75, 0.05, 0.12, 0.85, { color: wood, rz: a - PI / 2, seg: 4 }); }
      } else if (kind === 2) { // ворон
        k.box(0, H, 0, 0.5, 0.35, 0.9, { color: 0x1c1a20, pat: PAT.plain });
        k.cone(0, H + 0.2, 0.55, 0.12, 0.45, { color: 0x2a2620, rx: PI / 2, seg: 4 });
        for (const s of [-1, 1]) k.box(s * 0.5, H + 0.15, 0, 0.7, 0.06, 0.6, { color: 0x1c1a20, rz: s * 0.5 });
      } else { // рогатый череп
        k.sphere(0, H + 0.25, 0.1, 0.32, { color: COL.bone, pat: PAT.bone, sy: 1.15, seg: 8 });
        for (const s of [-1, 1]) { k.box(s * 0.12, H + 0.3, 0.38, 0.1, 0.1, 0.05, { color: COL.dark, pat: PAT.dark }); k.cone(s * 0.45, H + 0.4, 0.1, 0.07, 0.8, { color: COL.bone, pat: PAT.bone, rz: -s * 1.1, seg: 5 }); }
      }
      // ленты
      const rib = c.ab ? 0x5a4a44 : COL.red;
      for (let i = 0; i < 4; i++) k.box(Math.cos(i * 1.6) * 0.38, H - 0.9 - k.rr(0, 0.6), Math.sin(i * 1.6) * 0.38, 0.08, k.rr(0.7, 1.3), 0.02, { color: i % 2 ? rib : 0x8a6a40, pat: PAT.cloth, rz: k.rr(-0.25, 0.25), ry: i * 1.6 });
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 3.2, z: 0.6, r: 1.2, red: true });
      else weeds(k, c, 1.2, 1.2, 4);
    },
  },
  {
    id: 'znak', name: 'Знак «Хтонь рядом»', cat: 'chthon', size: [3, 1], tier: 0, cost: { silver: 2, wood: 2 }, effect: { chthon: 0.2 }, time: 4, H: 2, plinth: false,
    desc: 'Предостерегающая доска на кольях с охранным знаком.',
    build(k, c) {
      k.stage = 2; for (const s of [-1, 1]) k.cyl(s * 1.1, 0, 0, 0.09, 2.1, { color: COL.logDark, pat: PAT.logs, seg: 6, rz: c.ab ? s * 0.06 : 0 });
      k.stage = 3; k.box(0, 0.9, 0.08, 2.6, 1.0, 0.08, { color: 0x4a3a2e, pat: PAT.planks, rz: c.ab ? 0.08 : 0.03 });
      for (const s of [-1, 1]) k.cone(s * 1.1, 2.05, 0, 0.1, 0.25, { color: COL.logDark, seg: 5 });
      c.signs.push({ text: 'ОСТОРОЖНО\nХТОНЬ РЯДОМ', x: 0, y: 1.4, z: 0.13, w: 2.5, h: 0.95, rz: c.ab ? 0.08 : 0.03, rune: true });
    },
  },
  {
    id: 'krug', name: 'Обрядовый круг', cat: 'chthon', size: [11, 11], maxSlope: 1.6, tier: 1, cost: { silver: 30, stone: 24 }, effect: { chthon: 4, faith: -2 }, time: 14, H: 3, plinth: false,
    desc: 'Кольцо стоячих камней с рунами, кострище в центре, знак на земле. Сильно поднимает хтонь.',
    build(k, c) {
      k.stage = 1;
      k.cyl(0, -0.05, 0, 4.6, 0.1, { color: 0x3a3028, pat: PAT.rune, seg: 24 });
      k.cyl(0, -0.02, 0, 2.2, 0.1, { color: 0x4a3a2e, pat: PAT.earth, seg: 18 });
      k.stage = 2;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = i / n * PI * 2, r = 4.6, h = k.rr(1.6, 2.8) * (c.ab && k.rand() < 0.3 ? 0.4 : 1);
        k.box(Math.cos(a) * r, -0.2, Math.sin(a) * r, k.rr(0.6, 0.9), h, k.rr(0.4, 0.6), { color: COL.stone, pat: c.ab ? PAT.stone : PAT.rune, ry: -a, rz: k.rr(-0.1, 0.1) + (c.ab ? k.rr(-0.3, 0.3) : 0) });
      }
      k.stage = 3;
      for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; k.box(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9, 0.4, 0.3, 0.4, { color: COL.stoneDark, pat: PAT.stone, ry: a }); }
      for (let i = 0; i < 5; i++) k.log(0, 0.2, 0, 0.1, 1.4, { color: COL.logDark, ry: i * 0.63, rz: 0.4 });
      // шесты с черепами
      for (const a of [0.35, 2.45, 4.55]) {
        const x = Math.cos(a) * 3.2, z = Math.sin(a) * 3.2;
        k.cyl(x, 0, z, 0.06, 2.4, { color: COL.logDark, seg: 5 });
        k.sphere(x, 2.55, z, 0.22, { color: COL.bone, pat: PAT.bone, sy: 1.15 });
        k.box(x, 2.15, z, 0.03, 0.6, 0.02, { color: COL.red, pat: PAT.cloth });
      }
      if (!c.ab) c.fx.push({ t: 'fire', x: 0, y: 0.35, z: 0, s: 1.1 }, { t: 'glow', x: 0, y: 1.2, z: 0, r: 7, red: true }, { t: 'crows', x: 0, y: 9, z: 0 });
      else weeds(k, c, 9, 9, 12);
    },
  },
  {
    id: 'kapishe', name: 'Капище', cat: 'chthon', size: [10, 10], tier: 2, cost: { silver: 50, wood: 30, stone: 10 }, effect: { chthon: 6, faith: -3 }, time: 20, H: 6, plinth: false,
    desc: 'Тын из кольев с черепами, четырёхликий идол, жертвенник, огни.',
    build(k, c) {
      k.stage = 1; k.cyl(0, -0.05, 0, 4.7, 0.12, { color: 0x403428, pat: PAT.earth, seg: 24 });
      k.stage = 2;
      const n = 36;
      for (let i = 0; i < n; i++) {
        const a = i / n * PI * 2; if (Math.abs(((a + PI / 2) % (PI * 2)) - PI) < 0.25) continue; // проход на юг (+z)
        if (c.ab && k.rand() < 0.3) continue;
        const r = 4.6, h = k.rr(1.6, 2.1), x = Math.cos(a) * r, z = Math.sin(a) * r, tl = c.ab ? k.rr(-0.3, 0.3) : 0;
        k.cyl(x, -0.1, z, 0.14, h, { color: c.ab ? COL.logOld : 0x5a4232, pat: PAT.logs, seg: 6, rz: tl });
        k.cone(x, h - 0.1, z, 0.14, 0.35, { color: 0x4a3426, seg: 6 });
        if (i % 6 === 0) k.sphere(x, h + 0.35, z, 0.18, { color: COL.bone, pat: PAT.bone, sy: 1.2 });
      }
      // идол
      k.stage = 3;
      const wood = c.ab ? 0x4a4038 : 0x4e3a2a;
      k.box(0, 0, 0, 1.4, 0.4, 1.4, { color: COL.stoneDark, pat: PAT.stone });
      k.cyl(0, 0.4, 0, 0.55, 4.2, { color: wood, pat: PAT.logs, seg: 4, rz: c.ab ? 0.12 : 0 });
      for (let f = 0; f < 4; f++) {
        const a = f * PI / 2, cs = Math.cos(a), sn = Math.sin(a), y = 3.4;
        k.box(sn * 0.42, y, cs * 0.42, 0.14, 0.4, 0.14, { color: wood, ry: a });
        for (const s of [-1, 1]) k.box(sn * 0.4 + cs * s * 0.18, y + 0.3, cs * 0.4 - sn * s * 0.18, 0.13, 0.08, 0.05, { color: COL.blood, pat: c.ab ? PAT.dark : PAT.rune, ry: a });
        k.box(sn * 0.4, y - 0.15, cs * 0.4, 0.34, 0.07, 0.05, { color: COL.dark, pat: PAT.dark, ry: a });
      }
      k.cyl(0, 4.6, 0, 0.7, 0.35, { color: wood, pat: PAT.planks, seg: 8 }); // шапка
      k.cone(0, 4.95, 0, 0.6, 0.7, { color: wood, seg: 8 });
      k.box(0, 0, 2.2, 1.6, 0.6, 0.9, { color: COL.stone, pat: PAT.stone }); // жертвенник
      if (!c.ab) k.box(0, 0.6, 2.2, 0.9, 0.04, 0.5, { color: COL.blood, pat: PAT.rune });
      for (const s of [-1, 1]) { k.cyl(s * 1.6, 0, 3, 0.08, 1.4, { color: COL.logDark, seg: 5 }); k.cyl(s * 1.6, 1.4, 3, 0.2, 0.2, { color: COL.iron, seg: 6, r2: 0.12 }); if (!c.ab) c.fx.push({ t: 'fire', x: s * 1.6, y: 1.65, z: 3, s: 0.45 }); }
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 2, z: 2, r: 6, red: true }, { t: 'crows', x: 0, y: 11, z: 0 });
      else weeds(k, c, 9, 9, 14);
    },
  },
  {
    id: 'zhalnik', name: 'Жальник', cat: 'chthon', size: [9, 8], tier: 0, cost: { silver: 8, wood: 10 }, effect: { chthon: 2, faith: 1 }, time: 10, H: 2, plinth: false,
    desc: 'Старый погост: кресты-голбцы под крышками, камни, низкая ограда.',
    build(k, c) {
      k.stage = 1; k.box(0, -0.1, 0, 8.6, 0.15, 7.6, { color: 0x4a4434, pat: PAT.earth });
      k.stage = 2;
      for (let i = 0; i < 9; i++) {
        const x = -3 + (i % 3) * 3 + k.rr(-0.4, 0.4), z = -2.4 + Math.floor(i / 3) * 2.4 + k.rr(-0.3, 0.3), tl = k.rr(-0.15, 0.15) * (c.ab ? 2.5 : 1);
        k.box(x, 0.05, z + 0.6, 0.7, 0.25, 1.4, { color: 0x4e4434, pat: PAT.earth }); // холмик
        if (k.rand() < 0.5) { // голбец
          k.box(x, 0, z, 0.22, 1.5, 0.22, { color: COL.logOld, pat: PAT.logs, rz: tl });
          k.gable(x, 1.45, z, 0.4, 0.7, 0.3, { color: COL.shingleOld, pat: PAT.planks, over: 0.05, th: 0.05, gables: false, ridge: false, stage: 2 });
        } else if (k.rand() < 0.7) k.cross(x, 0, z, 0.9, { color: COL.logOld, tilt: tl });
        else k.box(x, 0, z, 0.6, 0.8, 0.3, { color: COL.stoneDark, pat: PAT.stone, rz: tl });
      }
      // ограда-жердины
      for (const [x, z, w, d] of [[0, -3.8, 8.6, 0.1], [0, 3.8, 8.6, 0.1], [-4.3, 0, 0.1, 7.6], [4.3, 0, 0.1, 7.6]]) {
        if (c.ab && k.rand() < 0.5) continue;
        k.box(x, 0.6, z, w, 0.08, d, { color: COL.logOld, pat: PAT.logs, rz: c.ab ? k.rr(-0.06, 0.06) : 0 });
        for (let t = -0.5; t <= 0.5; t += 0.25) k.cyl(x + t * w * 0.98, 0, z + t * d * 0.98, 0.05, 0.9, { color: COL.logDark, seg: 4 });
      }
      k.stage = 3;
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 0.6, z: 0, r: 4, red: true }, { t: 'crows', x: 0, y: 7, z: 0 });
    },
  },
  {
    id: 'kurgan', name: 'Курган', cat: 'chthon', size: [10, 10], tier: 1, cost: { silver: 20, stone: 12 }, effect: { chthon: 3 }, time: 12, H: 3, plinth: false,
    desc: 'Насыпь над древней могилой, камень-навершие, вход заложен. Лучше не раскапывать.',
    build(k, c) {
      k.stage = 1; k.sphere(0, -0.6, 0, 4.6, { color: 0x56603a, pat: PAT.grass, sy: 0.6, seg: 14 });
      k.stage = 2;
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; k.box(Math.cos(a) * 4.6, -0.2, Math.sin(a) * 4.6, 0.6, 0.6, 0.5, { color: COL.stoneDark, pat: PAT.stone, ry: a }); }
      k.box(0, -0.1, 3.9, 1.6, 1.4, 0.8, { color: COL.stone, pat: PAT.stone });
      k.box(0, 0, 4.3, 0.8, 0.9, 0.1, { color: COL.dark, pat: c.ab ? PAT.dark : PAT.rune });
      k.stage = 3;
      k.box(0, 2, 0, 0.8, 2, 0.5, { color: COL.stone, pat: PAT.rune, rz: c.ab ? 0.3 : 0.05 });
      if (!c.ab) c.fx.push({ t: 'glow', x: 0, y: 1, z: 4.6, r: 2.5, red: true });
    },
  },

  // ===== Оборона и пути =====
  {
    id: 'chastokol', name: 'Частокол', cat: 'defense', line: { step: 0.32 }, size: [1, 1], tier: 0, cost: { wood: 1 }, costPer: { wood: 1 }, effect: {}, time: 6, H: 3, plinth: false,
    desc: 'Тянется линией: заострённые колья. Цена за метр.',
    build(k, c) {
      const L = c.size[0];
      k.stage = 1; k.box(0, -0.1, 0, L, 0.15, 0.6, { color: COL.earth, pat: PAT.earth });
      k.stage = 2;
      for (let x = -L / 2 + 0.16; x < L / 2; x += 0.32) {
        if (c.ab && k.rand() < 0.25) continue;
        const h = 2.4 + k.rr(-0.15, 0.15), tl = c.ab ? k.rr(-0.25, 0.25) : k.rr(-0.02, 0.02);
        k.cyl(x, -0.2, 0, 0.15, h, { color: logCol(c), pat: PAT.logs, seg: 6, rz: tl });
        k.cone(x - Math.sin(tl) * h, h - 0.2, 0, 0.15, 0.45, { color: COL.logDark, seg: 6, rz: tl, stage: 3 });
      }
      k.stage = 3; k.box(0, 1.6, -0.2, L, 0.14, 0.1, { color: COL.logDark, pat: PAT.logs });
    },
  },
  {
    id: 'mostki', name: 'Мостки', cat: 'defense', line: { step: 1, water: true }, size: [1, 2], tier: 0, cost: { wood: 0.5 }, costPer: { wood: 0.5 }, effect: {}, time: 4, H: 0.6, plinth: false,
    desc: 'Тянется линией: дощатый настил на сваях. Можно класть через мелководье и топь.',
    build(k, c) {
      const L = c.size[0];
      k.stage = 1; for (let x = -L / 2 + 0.5; x < L / 2; x += 2) for (const z of [-0.8, 0.8]) k.cyl(x, -c.found - 0.5, z, 0.1, c.found + 0.9, { color: COL.logDark, pat: PAT.logs, seg: 5 });
      k.stage = 2;
      for (let x = -L / 2 + 0.15; x < L / 2; x += 0.3) { if (c.ab && k.rand() < 0.2) continue; k.box(x, 0.25, 0, 0.26, 0.08, 1.9, { color: c.ab ? COL.plankOld : COL.plank, pat: PAT.planks, rz: c.ab ? k.rr(-0.08, 0.08) : 0 }); }
      for (const z of [-0.8, 0.8]) k.box(0, 0.1, z, L, 0.15, 0.15, { color: COL.logDark, pat: PAT.logs });
    },
  },
  {
    id: 'vorota', name: 'Ворота', cat: 'defense', size: [7, 3], tier: 1, cost: { silver: 20, wood: 26 }, effect: {}, time: 12, H: 6, plinth: false,
    desc: 'Проезжие ворота: два столба-тура, кровелька, резной знак, створы.',
    build(k, c) {
      k.stage = 1; k.box(0, -0.1, 0, 6.8, 0.15, 2.6, { color: COL.earth, pat: PAT.earth });
      k.stage = 2;
      for (const s of [-1, 1]) k.srub(s * 2.6, 0, 0, 1.6, 1.6, 4.2, { color: logCol(c), t: 0.25 });
      k.stage = 3;
      k.log(0, 4.4, 0, 0.2, 7, { color: COL.logDark });
      k.gable(0, 4.5, 0, 7.2, 2.4, 1.3, { ...roofLook(c), hole: c.ab ? 0.35 : 0, gableColor: logCol(c) });
      k.cyl(0, 3.6, 0.95, 0.4, 0.12, { color: c.ab ? COL.plankOld : COL.red, pat: PAT.rune, rx: PI / 2, seg: 10 });
      for (const s of [-1, 1]) k.box(s * 0.9, 0, 0.1 + (c.ab ? 0 : 0), 1.7, 3.2, 0.12, { color: COL.plank, pat: PAT.planks, ry: c.ab ? s * 0.9 : s * 0.15, rz: c.ab && s > 0 ? 0.1 : 0 });
      if (!c.ab) c.fx.push({ t: 'fire', x: -1.75, y: 3.2, z: 0.95, s: 0.3 }, { t: 'fire', x: 1.75, y: 3.2, z: 0.95, s: 0.3 }, { t: 'glow', x: 0, y: 2.5, z: 1.4, r: 3 });
      for (const s of [-1, 1]) { k.cyl(s * 1.75, 2.7, 0.95, 0.04, 0.5, { color: COL.iron, seg: 4, stage: 3 }); }
    },
  },
  {
    id: 'vyshka', name: 'Сторожевая вышка', cat: 'defense', size: [5, 5], tier: 1, cost: { silver: 15, wood: 22 }, effect: { faith: 0.5 }, time: 12, H: 9, plinth: false,
    desc: 'Дозорная вышка на четырёх ногах, площадка с ограждением, шатровая кровелька.',
    build(k, c) {
      k.stage = 1; for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.box(x, -0.2, z, 0.6, 0.35, 0.6, { color: COL.stoneDark, pat: PAT.stone });
      k.stage = 2;
      for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(x, 0, z, 0.15, 6.4, { color: logCol(c), pat: PAT.logs, seg: 6, rz: -x * 0.03, rx: z * 0.03 });
      for (const y of [1.6, 3.6]) for (const s of [-1, 1]) { k.box(0, y, s * 1.55, 3.4, 0.1, 0.1, { color: COL.logDark, rz: 0.5 }); k.box(s * 1.55, y, 0, 0.1, 0.1, 3.4, { color: COL.logDark, rx: 0.5 }); }
      k.box(0, 6, 0, 3.8, 0.18, 3.8, { color: COL.plank, pat: PAT.planks, rz: c.ab ? 0.06 : 0 });
      for (const s of [-1, 1]) { k.box(0, 6.2, s * 1.85, 3.8, 0.9, 0.08, { color: COL.plank, pat: PAT.planks }); k.box(s * 1.85, 6.2, 0, 0.08, 0.9, 3.8, { color: COL.plank, pat: PAT.planks }); }
      k.box(0, 0, 2.2, 0.6, 6.2, 0.12, { color: COL.plank, pat: PAT.planks, rx: -0.3 });
      k.stage = 3;
      for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(x, 6.2, z, 0.08, 1.8, { color: COL.logDark, seg: 5 });
      k.tent(0, 8, 0, 3.1, 1.8, { seg: 4, ...roofLook(c), rz: c.ab ? 0.1 : 0 });
      if (!c.ab) c.fx.push({ t: 'fire', x: 1.4, y: 6.4, z: 1.4, s: 0.35 }, { t: 'glow', x: 0, y: 6.6, z: 0, r: 4 });
    },
  },
];

export const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

// Собрать сетку постройки. opts: { v, ab, size:[w,d], found (глубина основания), seed }
export function buildGeometry(def, opts = {}) {
  const k = new Kit((opts.seed ?? 7) * 7919 + (opts.v ?? 0) * 131 + (opts.ab ? 17 : 0));
  const size = opts.size ?? def.size;
  const c = { v: opts.v ?? 0, ab: !!opts.ab, size, found: opts.found ?? 0, fx: [], signs: [] };
  const [w, d] = size;
  if (def.plinth !== false && c.found > 0.05) {
    k.stage = 1;
    k.box(0, -c.found - 0.3, 0, w - 0.6, c.found + 0.35, d - 0.6, { color: COL.stoneDark, pat: PAT.stone });
  }
  k.marking(0, 0, 0, w - 0.2, d - 0.2);
  if (!def.line && def.H > 1.5) k.scaffold(0, 0, 0, Math.max(1.5, w - 1.8), Math.max(1.5, d - 1.8), Math.min(def.H, 9));
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
