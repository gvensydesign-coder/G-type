// Рисованный стиль «Живопись поверх 3D» для three.js (r170+). Зависимость одна: three.
// Повторяет приёмы из разбора (ANALYSIS.md): плоская заливка в 2–3 тона, цветные тени,
// мазки кисти по поверхности (Вороной → нормаль), карандашная штриховка, неровный контур
// с нажимом и разрывами, рваный контровый свет, мазки-карточки на модели (как Hatchix),
// светящийся проём с мазками, рисованное небо и пост-обработка (Кувахара, бумага, зерно,
// аберрация, bloom, виньетка, набросок контуров по глубине). Линии «кипят» шагами.
//
//   const style = new PaintStyle(PRESETS.mayhem.params);
//   const mat = style.material({ color: '#6e4d35', flow: 'wrap', flowDir: [0,0,1] });
//   style.paintObject(gltf.scene);               // заменить материалы модели на рисованные
//   style.addOutline(gltf.scene);                // неровный контур (оболочка)
//   const cards = new StrokeCards(style, gltf.scene, { density: 900 }); // мазки-карточки
//   const post = new PaintPost(renderer, style);
//   // каждый кадр:
//   style.update(dt, camera); cards.update(dt);
//   post.render(scene, camera);
import * as THREE from 'three';

// ---------------------------------------------------------------- параметры
// key, label, min, max, step, group
export const PARAM_DEFS = [
  ['bands', 'Тонов в заливке (2–3)', 2, 3, 1, 'fill'],
  ['t0', 'Порог глубокой тени', -0.3, 0.6, 0.01, 'fill'],
  ['t1', 'Порог света', 0, 1.2, 0.01, 'fill'],
  ['t2', 'Порог блика', 0.4, 2.5, 0.01, 'fill'],
  ['soft', 'Мягкость границ', 0, 0.3, 0.005, 'fill'],
  ['wrap', 'Обтекание светом', 0, 1, 0.01, 'fill'],
  ['exposure', 'Сила света', 0.2, 3, 0.01, 'fill'],
  ['litValue', 'Яркость света', 0.5, 1.6, 0.01, 'fill'],
  ['lightTint', 'Окраска светом', 0, 1, 0.01, 'fill'],
  ['highlight', 'Блик', 0, 1, 0.01, 'fill'],
  ['hiTint', 'Блик цветом света', 0, 1, 0.01, 'fill'],
  ['shadowValue', 'Яркость тени', 0.1, 1, 0.01, 'shadow'],
  ['shadowTint', 'Цвет тени (сдвиг тона)', 0, 1, 0.01, 'shadow'],
  ['deepTint', 'Цвет глубокой тени', 0, 1, 0.01, 'shadow'],
  ['ambient', 'Подсветка окружением', 0, 2, 0.01, 'shadow'],
  ['shadowKeep', 'Тень хранит цвет предмета', 0, 1, 0.01, 'shadow'],
  ['coreSat', 'Насыщенная полоса света', 0, 1, 0.01, 'shadow'],
  ['strokeAmt', 'Мазки: сила', 0, 1, 0.01, 'stroke'],
  ['strokeSize', 'Мазки: размер, см', 2, 60, 0.5, 'stroke'],
  ['strokeLen', 'Мазки: длина', 0.4, 1.4, 0.01, 'stroke'],
  ['strokeJitter', 'Мазки: разброс угла', 0, 1, 0.01, 'stroke'],
  ['strokeTilt', 'Мазки: излом нормали', 0, 1.2, 0.01, 'stroke'],
  ['strokeLight', 'Мазки: рвут границу тени', 0, 0.6, 0.01, 'stroke'],
  ['strokeValue', 'Мазки: разброс цвета', 0, 0.6, 0.01, 'stroke'],
  ['strokeHue', 'Мазки: цветные', 0, 1, 0.01, 'stroke'],
  ['strokeDry', 'Мазки: сухая кисть', 0, 1, 0.01, 'stroke'],
  ['strokeFacet', 'Мазки: грани-пятна с жёстким краем (вкл)', 0, 1, 1, 'stroke'],
  ['strokeInner', 'Мазки: свет внутри мазка', 0, 0.4, 0.01, 'stroke'],
  ['hatchAmt', 'Карандаш в тени', 0, 1, 0.01, 'pencil'],
  ['hatchScale', 'Карандаш: шаг, px', 2, 16, 0.1, 'pencil'],
  ['hatchAngle', 'Карандаш: угол, °', -90, 90, 1, 'pencil'],
  ['hatchCross', 'Карандаш: перекрёст в глубокой', 0, 1, 0.01, 'pencil'],
  ['hatchObject', 'Карандаш по объекту (не по экрану)', 0, 1, 1, 'pencil'],
  ['scribble', 'Каракули маркером в тени', 0, 1, 0.01, 'pencil'],
  ['scribbleScale', 'Каракули: размер, px', 8, 60, 1, 'pencil'],
  ['scratch', 'Процарапы на свету', 0, 1, 0.01, 'pencil'],
  ['rimAmt', 'Контровый свет', 0, 3, 0.01, 'rim'],
  ['rimWidth', 'Кромка: ширина', 0.05, 0.9, 0.01, 'rim'],
  ['rimRag', 'Кромка: рваность', 0, 1, 0.01, 'rim'],
  ['lineW', 'Контур: толщина, px', 0, 8, 0.1, 'line'],
  ['linePressure', 'Контур: нажим', 0, 1, 0.01, 'line'],
  ['lineGaps', 'Контур: разрывы', 0, 0.8, 0.01, 'line'],
  ['lineFromBase', 'Контур цветом предмета', 0, 1, 0.01, 'line'],
  ['lineNoise', 'Контур: частота неровности', 0.5, 20, 0.1, 'line'],
  ['backlit', 'Силуэт против света', 0, 1, 0.01, 'sketch2'],
  ['lightLines', 'Эскизные линии света', 0, 1, 0.01, 'sketch2'],
  ['lightLineCount', 'Линий света: сколько', 1, 8, 1, 'sketch2'],
  ['lightLineThr', 'Линии света: порог яркости', 0.3, 2.5, 0.01, 'sketch2'],
  ['lightLineReach', 'Линии света: дальность', 0.2, 1, 0.01, 'sketch2'],
  ['lightLineBreak', 'Линии света: разрывы', 0, 1, 0.01, 'sketch2'],
  ['sketchCopies', 'Набросок: линий в пучке', 1, 4, 1, 'sketch2'],
  ['accent', 'Акцентные линии на мелких деталях', 0, 1, 0.01, 'sketch2'],
  ['accentLight', 'Акценты: светлые на свету', 0, 1, 0.01, 'sketch2'],
  ['accentWidth', 'Акценты: чувствительность', 0.2, 3, 0.01, 'sketch2'],
  ['boil', 'Кипение линий и мазков', 0, 1, 0.01, 'anim'],
  ['stepFps', 'Кадров кипения, к/с', 0, 24, 1, 'anim'],
  ['animFps', 'Движение персонажей, к/с (0 = плавно)', 0, 30, 1, 'anim'],
  // пост-обработка
  ['kuwahara', 'Кувахара: радиус, px', 0, 7, 1, 'post'],
  ['kuwaAniso', 'Кувахара: вытянутость мазка', 1, 4, 0.05, 'post'],
  ['warp', 'Дрожь краёв (кисть)', 0, 4, 0.05, 'post'],
  ['sketch', 'Набросок по глубине', 0, 1, 0.01, 'post'],
  ['sketchOver', 'Перелёт линий, px', 0, 12, 0.1, 'post'],
  ['colorEdge', 'Линии по цвету', 0, 1, 0.01, 'post'],
  ['paper', 'Бумага', 0, 1, 0.01, 'post'],
  ['paperScale', 'Бумага: масштаб', 0.3, 3, 0.01, 'post'],
  ['grain', 'Зерно', 0, 0.3, 0.005, 'post'],
  ['aberration', 'Аберрация, px', 0, 6, 0.05, 'post'],
  ['bloom', 'Свечение (bloom)', 0, 2, 0.01, 'post'],
  ['bloomThreshold', 'Свечение: порог', 0.3, 3, 0.01, 'post'],
  ['vignette', 'Виньетка', 0, 1.5, 0.01, 'post'],
  ['saturation', 'Насыщенность', 0, 2, 0.01, 'post'],
  ['contrast', 'Контраст', 0.5, 1.6, 0.01, 'post'],
  ['postExposure', 'Экспозиция', 0.3, 3, 0.01, 'post'],
  ['grade2', 'Цветокор v2: без чёрных провалов, белые блики', 0, 1, 1, 'post'],
  ['satDark', 'Насыщенность в тёмном (v2)', 0, 1.5, 0.01, 'post'],
  ['sharpen', 'Резкость после Кувахары', 0, 0.6, 0.01, 'post'],
  ['silChip', 'Сколы силуэта (прямые срезы)', 0, 1, 0.01, 'post'],
  ['bloomSat', 'Свечение: насыщенность ореола', 0, 2, 0.01, 'post'],
  // планы: передний — подробный рисунок, дальний — крупный мазок и шум (примеры Michael, 2026-11-08)
  ['depthDetail', 'Планы: сила (вблизи рисунок, вдали мазок)', 0, 1, 0.01, 'depth'],
  ['detailNear', 'Планы: подробный рисунок до, м', 1, 30, 0.5, 'depth'],
  ['detailFar', 'Планы: крупный мазок с, м', 8, 150, 1, 'depth'],
  ['farStroke', 'Планы: мазок вдали крупнее в', 1, 4, 0.05, 'depth'],
  ['nearInk', 'Планы: карандаш вблизи', 0, 1, 0.01, 'depth'],
  ['farSketch', 'Планы: светлые эскизные линии вдали', 0, 1, 0.01, 'depth'],
  ['farNoise', 'Планы: шум и пятна вдали', 0, 1, 0.01, 'depth'],
  ['worldVary', 'Разнообразие тона по миру', 0, 1, 0.01, 'depth'],
  // слои по картам прозрачности и почеркушки (кадры TMNT, Michael 2026-11-08)
  ['layerRag', 'Слои: рваные края света и тени (карта прозрачности)', 0, 1, 0.01, 'layers'],
  ['shadowScribble', 'Почеркушки в тени: зигзаги и штрих-заплатки', 0, 1, 0.01, 'layers'],
  ['lightHatch', 'Штрихи от света огней и ауры', 0, 1, 0.01, 'layers'],
  ['auraDrama', 'Аура: тени черней и чётче, больше штрихов', 0, 1, 0.01, 'layers'],
  ['haze', 'Дымка ступенями между планами', 0, 1, 0.01, 'depth'],
  ['hazeFar', 'Дымка: полная на, м', 10, 200, 1, 'depth'],
  ['hazeSteps', 'Дымка: ступеней', 1, 8, 1, 'depth'],
];
export const PARAM_GROUPS = {
  fill: 'Заливка и свет', shadow: 'Цветные тени', stroke: 'Мазки кисти', pencil: 'Карандаш',
  rim: 'Контровый свет', line: 'Контур', sketch2: 'Эскизные линии и акценты', anim: 'Кипение', post: 'Пост-обработка', depth: 'Планы: близко и далеко', layers: 'Слои и почеркушки',
};
export const COLOR_DEFS = [
  ['cShadow', 'Цвет тени'], ['cDeep', 'Глубокая тень'], ['cStroke', 'Цвет мазков'],
  ['cPencil', 'Карандаш'], ['cRim', 'Кромка'], ['cLine', 'Контур'], ['cLightLine', 'Линии света'], ['cAccent', 'Акцентные линии'],
  ['cPaper', 'Бумага'], ['cLift', 'Тени кадра (lift)'], ['cGain', 'Свет кадра (gain)'], ['cHaze', 'Дымка планов'],
];

// Слои, которые можно включать по отдельности (для разбора «как это сложено»).
export const LAYERS = [
  ['fill', 'Заливка тонами'], ['shadow', 'Цветные тени'], ['stroke', 'Мазки по форме'],
  ['cards', 'Мазки-карточки'], ['pencil', 'Карандаш'], ['rim', 'Контровый свет'],
  ['line', 'Контур'], ['accent', 'Акцентные линии'], ['kuwahara', 'Кувахара'], ['sketch', 'Набросок'], ['lightlines', 'Линии света'],
  ['paper', 'Бумага и зерно'], ['bloom', 'Свечение'], ['lens', 'Аберрация и виньетка'],
  ['face', 'Линии эмоций'], ['marks', 'Знаки эмоций'],
];

const BASE = {
  bands: 3, t0: 0.06, t1: 0.32, t2: 1.15, soft: 0.04, wrap: 0.25, exposure: 1, litValue: 1, lightTint: 0.55,
  highlight: 0.5, hiTint: 0.3,
  shadowValue: 0.45, shadowTint: 0.6, deepTint: 0.6, ambient: 0.35,
  strokeAmt: 0.8, strokeSize: 14, strokeLen: 1.05, strokeJitter: 0.35, strokeTilt: 0.45, strokeLight: 0.22,
  strokeValue: 0.24, strokeHue: 0.25, strokeDry: 0.3,
  hatchAmt: 0.45, hatchScale: 7, hatchAngle: 35, hatchCross: 0.5, hatchObject: 0, scratch: 0.2, scribble: 0.55, scribbleScale: 26,
  rimAmt: 1.2, rimWidth: 0.42, rimRag: 0.6,
  lineW: 2.2, linePressure: 0.7, lineGaps: 0.18, lineFromBase: 0.45, lineNoise: 4,
  lightLines: 0.85, lightLineCount: 6, lightLineThr: 0.6, lightLineReach: 0.18, lightLineBreak: 0.4, sketchCopies: 3,
  accent: 0.55, accentLight: 0.5, accentWidth: 1,
  boil: 0.5, stepFps: 10, animFps: 12, backlit: 0.6,
  kuwahara: 3, kuwaAniso: 2, warp: 1.2, sketch: 0.5, sketchOver: 4, colorEdge: 0.25,
  paper: 0.45, paperScale: 1, grain: 0.05, aberration: 1.2, bloom: 0.7, bloomThreshold: 0.95,
  vignette: 0.55, saturation: 1.05, contrast: 1.05, postExposure: 1,
  strokeFacet: 0, strokeInner: 0, shadowKeep: 0, coreSat: 0, grade2: 0, satDark: 1, sharpen: 0, silChip: 0, bloomSat: 1,
  depthDetail: 0, detailNear: 6, detailFar: 45, farStroke: 2.5, nearInk: 0, farSketch: 0, farNoise: 0, worldVary: 0, layerRag: 0, shadowScribble: 0, lightHatch: 0, auraDrama: 0, haze: 0, hazeFar: 60, hazeSteps: 4, cHaze: '#283844',
  cShadow: '#5a2f3a', cDeep: '#140a08', cStroke: '#d8d2a0', cPencil: '#2a1a12', cRim: '#e8f0a8',
  cLine: '#20120c', cLightLine: '#f4eec0', cAccent: '#3a1410', cPaper: '#efe6cf', cLift: '#1a0f0c', cGain: '#fff6e0',
};
const P = (o) => ({ ...BASE, ...o });

// Слой камеры для источников, от которых рисуются эскизные линии света (диск проёма, луна, лампы).
export const LIGHT_LAYER = 3;
export function markLightSource(obj) { obj.traverse((o) => o.layers.enable(LIGHT_LAYER)); }

export const PRESETS = {
  mayhem: { name: 'Тоннель (как на фото)', params: P({}) },
  pastel: { name: '2.5D закат (видео)', params: P({
    shadowValue: 0.46, contrast: 1.12, shadowTint: 0.75, cShadow: '#5b4fa8', cDeep: '#2a2050', deepTint: 0.5,
    lightTint: 0.7, highlight: 0.7, hiTint: 0.45, strokeSize: 10, strokeAmt: 0.65, hatchAmt: 0.12, scratch: 0.1,
    rimAmt: 1.6, cRim: '#ffd9a0', lineW: 1.6, cLine: '#3a2440', lineFromBase: 0.7,
    kuwahara: 3, paper: 0.35, grain: 0.05, bloom: 1.1, bloomThreshold: 0.85, vignette: 0.35, saturation: 1.25,
    cPaper: '#fff1d8', cLift: '#2a1c3a', cGain: '#fff0d0', cStroke: '#ffe2b0',
  }) },
  neon: { name: 'Неоновая ночь (видео)', params: P({
    shadowValue: 0.32, shadowTint: 0.8, cShadow: '#3a1850', cDeep: '#0b0612', deepTint: 0.8, ambient: 0.5,
    lightTint: 0.85, highlight: 0.8, hiTint: 0.7, strokeSize: 16, strokeLight: 0.28, hatchAmt: 0.25, cPencil: '#140a1e',
    rimAmt: 2.2, cRim: '#7fd8ff', rimWidth: 0.38, lineW: 2, cLine: '#0e0714', lineFromBase: 0.35,
    kuwahara: 4, warp: 1.6, paper: 0.3, grain: 0.06, aberration: 2.2, bloom: 1.0, bloomThreshold: 0.85,
    vignette: 0.8, saturation: 1.2, cPaper: '#d8d0e8', cLift: '#180a24', cGain: '#e8f4ff', cStroke: '#c0b0ff',
  }) },
  pencil: { name: 'Карандашный набросок', params: P({
    bands: 2, shadowValue: 0.7, shadowTint: 0.25, cShadow: '#6a6458', deepTint: 0.3, strokeAmt: 0.35, strokeValue: 0.08,
    strokeHue: 0, hatchAmt: 0.95, hatchScale: 4, hatchCross: 0.9, scratch: 0.05, rimAmt: 0.4,
    lineW: 1.6, linePressure: 0.9, lineGaps: 0.3, lineFromBase: 0.1, boil: 0.8, stepFps: 8,
    kuwahara: 1, sketch: 0.9, sketchOver: 7, colorEdge: 0.6, paper: 0.9, grain: 0.06, aberration: 0, bloom: 0.2,
    vignette: 0.35, saturation: 0.35, contrast: 1.15, cPaper: '#f2ead6', cLift: '#2a2620', cGain: '#fffaf0',
  }) },
  rus: { name: 'Русь, масло (для игры)', params: P({
    shadowValue: 0.48, shadowTint: 0.6, cShadow: '#2e3a4a', cDeep: '#0e1014', deepTint: 0.55,
    lightTint: 0.5, highlight: 0.45, strokeSize: 18, strokeAmt: 0.85, strokeTilt: 0.55, strokeDry: 0.6,
    hatchAmt: 0.25, cPencil: '#1c1812', rimAmt: 1, cRim: '#ffd890', lineW: 2, cLine: '#16110c', lineFromBase: 0.55,
    kuwahara: 4, paper: 0.5, grain: 0.07, aberration: 0.8, bloom: 0.6, vignette: 0.6, saturation: 0.95,
    cPaper: '#eadfc4', cLift: '#141418', cGain: '#fff2d8', cStroke: '#cdbf96',
  }) },
  lair: { name: 'Логово, зелёный мрак', params: P({
    // по замерам видео a_iwaac: тени в сине-фиолетовый дополнительный, пол кадра приподнят, зелень только у ауры и огоньков
    shadowValue: 0.4, shadowTint: 0.55, cShadow: '#2e3658', cDeep: '#0e1220', deepTint: 0.6, ambient: 0.4,
    exposure: 1.2, litValue: 1.15, lightTint: 0.35, t1: 0.3, t2: 1.0, soft: 0.02, highlight: 0.65, hiTint: 0.5,
    strokeSize: 18, strokeAmt: 0.85, strokeTilt: 0.55, strokeDry: 0.2, strokeFacet: 1, strokeLen: 1.2, strokeJitter: 0.15, strokeInner: 0.12, strokeLight: 0.32,
    shadowKeep: 0.8, coreSat: 0.5, hatchAmt: 0.2, scribble: 0.2, cPencil: '#0c1018',
    rimAmt: 1.8, rimWidth: 0.32, cRim: '#cfeeff', lineW: 1.4, cLine: '#0c0e16', lineFromBase: 0.6, lineGaps: 0.3, boil: 0.12, stepFps: 12,
    kuwahara: 3, colorEdge: 0.35, paper: 0.2, grain: 0.03, aberration: 0.6, bloom: 0.9, bloomThreshold: 0.8, bloomSat: 1.6, vignette: 0.35,
    saturation: 1.0, contrast: 1.3, grade2: 1, satDark: 0.55, sharpen: 0.25, silChip: 0.5, backlit: 0.4,
    depthDetail: 0.85, detailNear: 6, detailFar: 34, farStroke: 2.6, nearInk: 0.6, farSketch: 0.5, farNoise: 0.6, worldVary: 0.5, layerRag: 0.7, shadowScribble: 0.6, lightHatch: 0.8, auraDrama: 1, haze: 0.4, hazeFar: 55, hazeSteps: 3, cHaze: '#3d5e5a',
    cPaper: '#d8e0c4', cLift: '#0e1220', cGain: '#fff4e2', cStroke: '#a8b4c8',
  }) },
  iwaac: { name: '2.5D по видео a_iwaac', params: P({
    // грани-пятна вместо мягких мазков, тень хранит цвет и уходит к фону, белые блики, резкость после Кувахары, почти без кипения
    bands: 3, t1: 0.3, t2: 1.0, soft: 0.02, exposure: 1.15, litValue: 1.1, lightTint: 0.4, highlight: 0.65, hiTint: 0.5,
    shadowValue: 0.5, shadowTint: 0.6, cShadow: '#3c2850', cDeep: '#1b1523', deepTint: 0.5, ambient: 0.5, shadowKeep: 0.85, coreSat: 0.55,
    strokeAmt: 0.9, strokeSize: 16, strokeFacet: 1, strokeLen: 1.25, strokeJitter: 0.15, strokeTilt: 0.6, strokeLight: 0.35, strokeValue: 0.22, strokeInner: 0.12, strokeHue: 0.15, strokeDry: 0,
    hatchAmt: 0.1, scribble: 0, scratch: 0.15, rimAmt: 1.6, rimWidth: 0.3, rimRag: 0.4, cRim: '#bfe8ff',
    lineW: 1.4, linePressure: 0.6, lineGaps: 0.35, lineFromBase: 0.65, cLine: '#1a1020', lightLines: 0.3, accent: 0.3,
    boil: 0.1, stepFps: 12, animFps: 12, backlit: 0.4,
    kuwahara: 4, kuwaAniso: 2.2, warp: 0.5, sketch: 0.3, colorEdge: 0.3, paper: 0.25, grain: 0.03, aberration: 0.7,
    bloom: 0.9, bloomThreshold: 0.85, bloomSat: 1.6, vignette: 0.3, saturation: 1.0, contrast: 1.12, grade2: 1, satDark: 0.5, sharpen: 0.28, silChip: 0.6,
    cPaper: '#e6dccb', cLift: '#1b1523', cGain: '#fff6ea', cStroke: '#c8b8d8',
  }) },
  khton: { name: 'Хтонь, уголь', params: P({
    bands: 2, shadowValue: 0.36, shadowTint: 0.7, cShadow: '#2c3328', cDeep: '#07080a', deepTint: 0.8,
    lightTint: 0.3, highlight: 0.2, strokeSize: 22, strokeAmt: 0.9, strokeHue: 0.1, strokeDry: 0.8,
    hatchAmt: 0.7, hatchScale: 6, hatchCross: 0.8, cPencil: '#050605', scratch: 0.35, rimAmt: 0.7, cRim: '#b8c4a0',
    lineW: 3, linePressure: 0.9, lineGaps: 0.35, lineFromBase: 0.15, boil: 0.7, stepFps: 8,
    kuwahara: 5, warp: 2, sketch: 0.75, sketchOver: 8, paper: 0.7, grain: 0.1, aberration: 0.5, bloom: 0.3,
    vignette: 1, saturation: 0.55, contrast: 1.2, cPaper: '#cfcbb8', cLift: '#0a0c0a', cGain: '#e8ecd8', cStroke: '#8a9078',
  }) },
};

// ---------------------------------------------------------------- общий GLSL
export const GLSL_NOISE = /* glsl */`
float pfH11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float pfH21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 pfH22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 pfH32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
float pfH31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float pfNoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(pfH21(i), pfH21(i + vec2(1, 0)), u.x), mix(pfH21(i + vec2(0, 1)), pfH21(i + vec2(1, 1)), u.x), u.y); }
float pfNoise3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3. - 2. * f);
  float a = mix(mix(pfH31(i), pfH31(i + vec3(1,0,0)), u.x), mix(pfH31(i + vec3(0,1,0)), pfH31(i + vec3(1,1,0)), u.x), u.y);
  float b = mix(mix(pfH31(i + vec3(0,0,1)), pfH31(i + vec3(1,0,1)), u.x), mix(pfH31(i + vec3(0,1,1)), pfH31(i + vec3(1,1,1)), u.x), u.y);
  return mix(a, b, u.z); }
float pfFbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * pfNoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
vec2 pfRot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
float pfLuma(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
`;

// Поле мазков в 2D: клетки Вороного, в каждой один мазок своей длины, ширины, угла.
// Верхним считается мазок с наибольшим «порядком» (как слои краски).
// x: смещение тона (-1..1), y: покрытие 0..1, z: номер мазка 0..1, w: поперечная координата.
export const GLSL_STROKES = /* glsl */`
uniform vec4 pfDepthD, pfDepthE, pfLayer;   // pfLayer: рваность слоёв, почеркушки в тени, штрихи от света, драма ауры (0..1 сейчас)
   // планы: сила, ближе, дальше, мазок вдали | эскиз вдали, карандаш вблизи, шум вдали
uniform vec4 pfStyle2;   // грани-пятна, свет внутри мазка, тень хранит цвет, насыщенная полоса
// грани-пятна (a_iwaac): клетки Вороного, вытянутые вдоль мазка; клетка = одно плоское пятно с жёстким краем
vec4 pfFacet(vec2 p, vec2 dir, float len, float seed){
  vec2 q = vec2(dot(p, dir) / max(len, .3), dot(p, vec2(-dir.y, dir.x)));
  vec2 ip = floor(q), fp = fract(q); float d1 = 9., d2 = 9.; vec2 id1 = vec2(0.); vec2 c1 = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 id = ip + g + seed; vec2 c = g + .15 + .7 * pfH22(id) - fp;
    float d = dot(c, c); if (d < d1) { d2 = d1; d1 = d; id1 = id; c1 = c; } else if (d < d2) d2 = d;
  }
  return vec4(pfH21(id1 + 5.3) * 2. - 1., 1., pfH21(id1 + 11.7), clamp(-c1.y * 2., -1., 1.));
}
vec4 pfStroke(vec2 p, vec2 dir, float len, float jitter, float dry, float seed){
  if (pfStyle2.x > .5) return pfFacet(p, dir, len, seed);
  vec2 ip = floor(p), fp = fract(p);
  vec4 best = vec4(0.); float bestZ = -1.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 id = ip + g + seed;
    vec2 c = g + pfH22(id) - fp;
    float a = (pfH21(id * 1.37) - .5) * jitter * 3.1416;
    vec2 d = pfRot(dir, a);
    vec2 q = vec2(dot(-c, d), dot(-c, vec2(-d.y, d.x)));
    float L = len * (.65 + .7 * pfH21(id + 7.1));
    float W = .36 * (.7 + .6 * pfH21(id + 3.3));
    float u = q.x / L; float w = 1. - .5 * u * u; float v = q.y / (W * max(w, .15));
    float m = (1. - smoothstep(.82, 1., abs(u))) * (1. - smoothstep(.72, 1., abs(v)));
    // ворс: продольные полосы, у хвоста мазка кисть «сохнет» и рвётся
    float br = pfNoise(vec2(u * 1.6, v * 3.2) + id * 13.1);
    float dryT = smoothstep(-.3, 1., u) * dry;
    m *= smoothstep(dryT - .12, dryT + .12, br);
    float z = pfH21(id + 11.7);
    if (m > .35 && z > bestZ) { bestZ = z; best = vec4(pfH21(id + 5.3) * 2. - 1., m, z, v); }
  }
  return best;
}
vec2 pfPlaneDir(vec3 D, int axis){
  vec2 d = axis == 0 ? D.zy : (axis == 1 ? D.xz : D.xy);
  return dot(d, d) < 1e-3 ? vec2(1., 0.) : normalize(d);
}
// трипланарно в координатах объекта (метры)
vec4 pfTriStroke(vec3 p, vec3 n, vec3 D, float sc, float len, float jitter, float dry, float seed){
  vec3 w = pow(abs(n), vec3(8.)); w /= max(dot(w, vec3(1.)), 1e-4);
  // смешиваем только тон и покрытие; номер мазка берём у главной проекции (иначе хеш от смеси даёт рябь)
  vec4 s = vec4(0.); float wm = -1.;
  if (w.x > .02) { vec4 t = pfStroke(p.zy * sc, pfPlaneDir(D, 0), len, jitter, dry, seed); s.xy += w.x * t.xy; if (w.x > wm) { wm = w.x; s.zw = t.zw; } }
  if (w.y > .02) { vec4 t = pfStroke(p.xz * sc, pfPlaneDir(D, 1), len, jitter, dry, seed + 31.); s.xy += w.y * t.xy; if (w.y > wm) { wm = w.y; s.zw = t.zw; } }
  if (w.z > .02) { vec4 t = pfStroke(p.xy * sc, pfPlaneDir(D, 2), len, jitter, dry, seed + 67.); s.xy += w.z * t.xy; if (w.z > wm) { wm = w.z; s.zw = t.zw; } }
  return s;
}
float pfHatch(vec2 p, float seed){
  // p: в единицах шага штриховки; ширина линии ~1 px независимо от шага
  float row = floor(p.y);
  float r = pfH11(row * 1.7 + seed);
  float wob = (pfNoise(vec2(p.x * .18, row + seed)) - .5) * .35;
  float d = abs(fract(p.y + wob) - .5);
  float fw = max(fwidth(p.y), 1e-4);
  float w = fw * (.55 + .7 * r);
  float line = 1. - smoothstep(w, w + fw, d);
  float seg = pfNoise(vec2(p.x * .07 + r * 10., row * .37 + seed));
  return line * smoothstep(.4, .52, seg) * (.55 + .45 * r);
}
float pfScribble(vec2 p, float seed){
  // каракули маркером: короткие зигзаги туда-обратно пятнами, как быстрая закраска тени
  vec2 cs = vec2(3., 1.);
  vec2 cell = floor(p / cs); vec2 q = p - cell * cs;
  float r = pfH11(dot(cell, vec2(1.7, 9.3)) + seed);
  float k = 2.2 + r * 1.6;                       // сколько петель в пятне
  float zz = abs(fract(q.x * k * .5 + r) - .5) * 2.;
  float y = .14 + .72 * zz + (pfNoise(q * 2.3 + seed + cell) - .5) * .16;
  float slope = .72 * k;
  float d = abs(q.y - y) / sqrt(1. + slope * slope);
  float fw = max(fwidth(d), 1e-4);
  float w = .12 + .05 * r;                       // маркер толще карандаша: 3–4 px при размере 26
  float line = 1. - smoothstep(w, w + fw * 1.5, d);
  float patchM = smoothstep(.38, .62, pfNoise(cell * .61 + seed * 1.3)) * smoothstep(.1, .5, q.x) * (1. - smoothstep(2.3 - r, 2.9, q.x));
  float grain = .65 + .35 * pfNoise(p * 9. + seed);
  return line * patchM * grain;
}
`;

function col(v) { return new THREE.Color(v); }
const EMPTY_TEX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); EMPTY_TEX.needsUpdate = true;

// ---------------------------------------------------------------- стиль (общие uniform)
export class PaintStyle {
  constructor(params = {}) {
    this.params = { ...BASE, ...params };
    this.layers = Object.fromEntries(LAYERS.map(([k]) => [k, true]));
    this.time = 0;
    this.materials = new Set();
    this.outlines = [];
    this.u = {
      pfTime: { value: 0 }, pfStep: { value: 0 }, pfStyle2: { value: new THREE.Vector4() }, pfDepthD: { value: new THREE.Vector4(0, 6, 45, 2.5) }, pfDepthE: { value: new THREE.Vector4() }, pfLayer: { value: new THREE.Vector4() },
      // рисунки от руки (handdrawn.js): атлас каракулей и профиль нажима контура; пусто = процедурные
      pfHandHatch: { value: EMPTY_TEX }, pfHandHatchN: { value: new THREE.Vector4() },
      pfHandLine: { value: EMPTY_TEX }, pfHandLineN: { value: 0 },
      pfFill: { value: new THREE.Vector4() },     // t0, t1, t2, soft
      pfLight: { value: new THREE.Vector4() },    // wrap, exposure, litValue, lightTint
      pfHi: { value: new THREE.Vector4() },       // highlight, hiTint, bands, -
      pfShadow: { value: new THREE.Vector4() },   // shadowValue, shadowTint, deepTint, ambient
      pfStrokeA: { value: new THREE.Vector4() },  // amt, scale(1/m), len, jitter
      pfStrokeB: { value: new THREE.Vector4() },  // tilt, light, value, hue
      pfStrokeC: { value: new THREE.Vector4() },  // dry, boil, -, -
      pfHatchA: { value: new THREE.Vector4() },   // amt, scale px, angle rad, cross
      pfHatchB: { value: new THREE.Vector4() },   // object, scratch, scribble, scribble px
      pfRim: { value: new THREE.Vector4() },      // amt, width, rag, -
      pfCShadow: { value: new THREE.Color() }, pfCDeep: { value: new THREE.Color() },
      pfCStroke: { value: new THREE.Color() }, pfCPencil: { value: new THREE.Color() },
      pfCRim: { value: new THREE.Color() },
      // контур
      pfAccent: { value: new THREE.Vector4() },   // amt, light, sensitivity, -
      pfCAccent: { value: new THREE.Color() }, pfCLightLine: { value: new THREE.Color() },
      pfLine: { value: new THREE.Vector4() },     // width px, pressure, gaps, fromBase
      pfLineB: { value: new THREE.Vector4() },    // noise freq, boil, -, -
      pfCLine: { value: new THREE.Color() },
      pfRes: { value: new THREE.Vector2(1920, 1080) },
      // отсвет окружения (огонь, аура): до 4 источников, xyz + радиус, цвет + сила
      pfBounceP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, pfBounceC: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, pfBounceN: { value: 0 },
    };
    this.set(this.params);
  }

  // драма ауры 0..1: тени черней и чётче, штриховки больше (сила — параметр auraDrama)
  setDrama(k) { this.drama = k; this.u.pfLayer.value.w = (this.params.auraDrama ?? 0) * k; }
  set(p) {
    Object.assign(this.params, p);
    const q = this.params, L = this.layers, u = this.u;
    const fillOn = L.fill;
    u.pfFill.value.set(q.t0, q.t1, fillOn ? q.t2 : 99, fillOn ? q.soft : 0.6);
    u.pfLight.value.set(q.wrap, q.exposure, q.litValue, q.lightTint);
    u.pfHi.value.set(fillOn ? q.highlight : 0, q.hiTint, q.bands, 0);
    u.pfShadow.value.set(q.shadowValue, L.shadow ? q.shadowTint : 0, L.shadow ? q.deepTint : 0, q.ambient);
    u.pfStrokeA.value.set(L.stroke ? q.strokeAmt : 0, 100 / q.strokeSize, q.strokeLen, q.strokeJitter);
    u.pfStrokeB.value.set(q.strokeTilt, q.strokeLight, q.strokeValue, q.strokeHue);
    u.pfStrokeC.value.set(q.strokeDry, q.boil, 0, 0);
    u.pfStyle2.value.set(L.stroke ? q.strokeFacet : 0, L.stroke ? q.strokeInner : 0, L.shadow ? q.shadowKeep : 0, q.coreSat);
    u.pfDepthD.value.set(q.depthDetail ?? 0, q.detailNear ?? 6, q.detailFar ?? 45, q.farStroke ?? 2.5);
    u.pfDepthE.value.set(q.farSketch ?? 0, L.pencil ? (q.nearInk ?? 0) : 0, q.farNoise ?? 0, q.worldVary ?? 0);
    u.pfLayer.value.set(q.layerRag ?? 0, L.pencil ? (q.shadowScribble ?? 0) : 0, L.pencil ? (q.lightHatch ?? 0) : 0, (q.auraDrama ?? 0) * (this.drama ?? 0));
    u.pfHatchA.value.set(L.pencil ? q.hatchAmt : 0, q.hatchScale, q.hatchAngle * Math.PI / 180, q.hatchCross);
    u.pfHatchB.value.set(q.hatchObject, L.pencil ? q.scratch : 0, L.pencil ? q.scribble : 0, q.scribbleScale);
    u.pfRim.value.set(L.rim ? q.rimAmt : 0, q.rimWidth, q.rimRag, 0);
    u.pfCShadow.value.set(q.cShadow); u.pfCDeep.value.set(q.cDeep); u.pfCStroke.value.set(q.cStroke);
    u.pfCPencil.value.set(q.cPencil); u.pfCRim.value.set(q.cRim);
    u.pfLine.value.set(q.lineW, q.linePressure, q.lineGaps, q.lineFromBase);
    u.pfLineB.value.set(q.lineNoise, q.boil, 0, 0);
    u.pfCLine.value.set(q.cLine);
    u.pfAccent.value.set(L.accent ? q.accent : 0, q.accentLight, q.accentWidth, 0);
    u.pfCAccent.value.set(q.cAccent); u.pfCLightLine.value.set(q.cLightLine);
    for (const o of this.outlines) o.visible = L.line && q.lineW > 0.01;
  }

  setLayer(key, on) { this.layers[key] = on; this.set({}); }
  // Отсвет окружения: [{ pos: Vector3, color, radius, k }], до 4. Вызывать каждый кадр (или при изменении).
  setBounce(list = []) {
    const P = this.u.pfBounceP.value, C = this.u.pfBounceC.value; const n = Math.min(4, list.length); const c = new THREE.Color();
    for (let i = 0; i < n; i++) { const b = list[i]; P[i].set(b.pos.x, b.pos.y, b.pos.z, b.radius ?? 4); c.set(b.color); C[i].set(c.r, c.g, c.b, b.k ?? 1); }
    this.u.pfBounceN.value = n;
  }

  // Анимация «через кадр»: персонажи двигаются шагами animFps (как в рисованном кино ~12 к/с),
  // а камера, свет и эффекты остаются плавными. Отдавайте результат в mixer.update(); 0 = кадр держится.
  animDelta(dt) {
    const f = this.params.animFps;
    if (!(f > 0)) return dt;
    this._animAcc = (this._animAcc ?? 0) + dt;
    if (this._animAcc < 1 / f) return 0;
    const d = this._animAcc; this._animAcc = 0; return d;
  }

  update(dt, renderer) {
    this.time += dt;
    this.u.pfTime.value = this.time;
    const fps = this.params.stepFps;
    this.u.pfStep.value = fps > 0 ? Math.floor(this.time * fps) : 0;
    if (renderer) {
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      this.u.pfRes.value.copy(s);
    }
  }

  // Рисованный материал. opts: color, map, emissive, emissiveIntensity, flow ('fixed'|'wrap'|'along'),
  // flowDir [x,y,z] в координатах объекта, strokeScale (множитель размера мазка), vertexColors, side.
  material(opts = {}) {
    const m = new THREE.MeshToonMaterial({
      color: opts.color ?? '#ffffff', map: opts.map ?? null,
      emissive: opts.emissive ?? '#000000', emissiveIntensity: opts.emissiveIntensity ?? 1,
      emissiveMap: opts.emissiveMap ?? null,
      vertexColors: !!opts.vertexColors, side: opts.side ?? THREE.FrontSide,
      transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    });
    const flowMode = { fixed: 0, wrap: 1, along: 2 }[opts.flow ?? 'wrap'] ?? 1;
    const fd = opts.flowDir ?? [0, 1, 0];
    m.userData.pf = {
      pfFlow: { value: new THREE.Vector4(fd[0], fd[1], fd[2], flowMode) },
      pfMatK: { value: new THREE.Vector4(opts.strokeScale ?? 1, opts.seed ?? Math.random() * 50, opts.rimScale ?? 1, opts.hatchScale ?? 1) },
      pfFaceMat: { value: new THREE.Matrix4() }, pfFaceTex: { value: EMPTY_TEX }, pfFaceK: { value: new THREE.Vector4(0, 0, 0.1, 0.2) },
      pfFaceN: { value: new THREE.Vector3(0, 0, 1) }, pfFaceSize: { value: new THREE.Vector2(0.26, 0.13) },
      pfZoneC: { value: new THREE.Color('#ffd27a') }, pfZoneK: { value: 0 },
      pfGlowP: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, pfGlowN: { value: 0 },
    };
    m.onBeforeCompile = (sh) => this._patch(sh, m);
    m.customProgramCacheKey = () => 'paintfx1';
    m.userData.paintfx = true;
    this.materials.add(m);
    return m;
  }

  _patch(sh, m) {
    Object.assign(sh.uniforms, this.u, m.userData.pf);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPfObjPos;\nvarying vec3 vPfObjN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPfObjPos = position * length(modelMatrix[0].xyz);\nvPfObjN = normal;\nvPfWN = normalize(mat3(modelMatrix) * objectNormal);\n#ifdef USE_INSTANCING\nvPfWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n#endif')
      .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvPfWorld = (modelMatrix * vec4(transformed, 1.)).xyz;\n#ifdef USE_INSTANCING\nvPfWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;\n#endif')
      .replace('#include <common>', '#include <common>\nvarying vec3 vPfWorld;\nvarying vec3 vPfWN;');
    const pars = /* glsl */`
      varying vec3 vPfObjPos; varying vec3 vPfObjN; varying vec3 vPfWorld; varying vec3 vPfWN;
      uniform mat4 pfFaceMat; uniform sampler2D pfFaceTex; uniform vec4 pfFaceK; uniform vec3 pfFaceN; uniform vec2 pfFaceSize;
      float gPfProt;
      uniform vec3 pfZoneC; uniform float pfZoneK; uniform vec4 pfGlowP[8]; uniform int pfGlowN;
      uniform sampler2D pfHandHatch; uniform vec4 pfHandHatchN;
      uniform vec4 pfBounceP[4]; uniform vec4 pfBounceC[4]; uniform int pfBounceN;
      uniform float pfTime, pfStep;
      uniform vec4 pfFill, pfLight, pfHi, pfShadow, pfStrokeA, pfStrokeB, pfStrokeC, pfHatchA, pfHatchB, pfRim, pfFlow, pfMatK;
      uniform vec3 pfCShadow, pfCDeep, pfCStroke, pfCPencil, pfCRim, pfCAccent, pfCLightLine;
      uniform vec4 pfAccent;
      ${GLSL_NOISE}
      ${GLSL_STROKES}
      vec3 gPfLC; vec3 gPfRim; vec3 gPfAmb; vec4 gPfS; float gPfDT; float gPfSk;
      varying vec3 vViewPosition;
      struct ToonMaterial { vec3 diffuseColor; };
      void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
        float nl = dot(geometryNormal, directLight.direction);
        float w = pfLight.x;
        float lam = clamp((nl + w) / (1. + w), 0., 1.);
        gPfLC += directLight.color * lam;
        float back = clamp(dot(directLight.direction, -geometryViewDir), 0., 1.);
        float side = 1. - abs(nl);
        gPfRim += directLight.color * (back * .8 + .2) * smoothstep(-.35, .2, nl) * (.4 + .6 * side);
      }
      void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
        gPfAmb += irradiance;
      }
      #define RE_Direct RE_Direct_Toon
      #define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
    `;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_toon_pars_fragment>', pars)
      .replace('#include <normal_fragment_maps>', /* glsl */`#include <normal_fragment_maps>
        gPfLC = vec3(0.); gPfRim = vec3(0.); gPfAmb = vec3(0.);
        {
          float boilK = pfStrokeC.y;
          vec2 bj = (pfH22(vec2(pfStep, 3.7)) - .5) * boilK * .35;
          vec3 D = pfFlow.xyz; vec3 on = normalize(vPfObjN);
          if (pfFlow.w > .5 && pfFlow.w < 1.5) D = cross(on, normalize(pfFlow.xyz));
          float sc = pfStrokeA.y / pfMatK.x;
          // планы: вблизи мазки мельче (подробный рисунок), вдали крупнее
          gPfDT = pfDepthD.x * smoothstep(pfDepthD.y, pfDepthD.z, length(vViewPosition));
          sc *= (1. + .45 * pfDepthD.x * (1. - smoothstep(pfDepthD.y * .5, pfDepthD.y * 1.5, length(vViewPosition)))) * mix(1., 1. / pfDepthD.w, gPfDT);
          gPfS = pfStrokeA.x > 0. ? pfTriStroke(vPfObjPos + vec3(bj, bj.x), on, D, sc, pfStrokeA.z, pfStrokeA.w, pfStrokeC.x, pfMatK.y) : vec4(0.);
          gPfS.y *= pfStrokeA.x;
          // Вороной → нормаль: у каждого мазка свой наклон, как у плоского мазка краски
          vec3 tilt = (pfH32(vec2(gPfS.z * 91.7, gPfS.z * 13.3)) - .5) * 2.;
          normal = normalize(normal + tilt * pfStrokeB.x * gPfS.y);
        }
      `)
      .replace('#include <opaque_fragment>', /* glsl */`
        {
          vec3 base = diffuseColor.rgb;
          float sv = gPfS.x * gPfS.y;
          base *= 1. + sv * pfStrokeB.z;
          base *= 1. + pfStyle2.y * gPfS.w * gPfS.y;
          base = mix(base, pfCStroke * pfLuma(base) * 1.6, pfStrokeB.w * gPfS.y * max(gPfS.x, 0.) * .5);
          float Lraw = pfLuma(gPfLC) * pfLight.y;
          vec3 lightHue = gPfLC / max(max(gPfLC.r, max(gPfLC.g, gPfLC.b)), 1e-3);
          float L = (Lraw + sv * pfStrokeB.y) * (1. - .3 * pfLayer.w);
          float soft = pfFill.w + .002;
          float b0 = smoothstep(pfFill.x - soft, pfFill.x + soft, L);
          float b1 = smoothstep(pfFill.y - soft, pfFill.y + soft, L);
          float b2 = smoothstep(pfFill.z - soft, pfFill.z + soft, L);
          // слои по картам прозрачности: у света и у тени своя рваная карта (мазки кисти), край не повторяет друг друга;
          // свет кладётся полупрозрачно поверх заливки — сквозь него видна заливка, как лессировка
          float dr = pfLayer.w; float omL = 1., omS = 1.;
          if (pfLayer.x > 0. || dr > 0.) {
            vec3 op3 = vPfObjPos;
            omL = pfNoise(op3.xy * 3.1 + op3.z * 1.7) * .55 + pfNoise(op3.zy * 7.3 + 3.) * .3 + gPfS.x * .15;
            omS = pfNoise(op3.xz * 2.6 + op3.y * 2.1 + 11.) * .55 + pfNoise(op3.xy * 6.1 + 7.) * .3 + gPfS.y * .15;
            float s2 = soft * (1. - .9 * dr) + .001;
            b0 = smoothstep(pfFill.x - s2, pfFill.x + s2, L + (omS - .5) * pfLayer.x * .45);
            b1 = smoothstep(pfFill.y - s2, pfFill.y + s2, L + (omL - .5) * pfLayer.x * .5);
            b2 = smoothstep(pfFill.z - s2, pfFill.z + s2, L + (omL - .5) * pfLayer.x * .4);
          }
          if (pfHi.z < 2.5) b0 = 1.;
          float lb = pfLuma(base);
          vec3 shadowC = mix(base * pfShadow.x, pfCShadow * lb * 2.2, pfShadow.y);
          if (pfStyle2.z > 0.) {
            // тень хранит свой цвет предмета, тон уходит к цвету фона и теряет насыщенность (замеры a_iwaac)
            vec3 tintN = pfCShadow / max(pfLuma(pfCShadow), .02);
            vec3 keepC = base * pfShadow.x * mix(vec3(1.), clamp(tintN, 0., 3.), pfShadow.y * .6);
            keepC = mix(keepC, vec3(pfLuma(keepC)), .3) + pfCShadow * .12;
            shadowC = mix(shadowC, keepC, pfStyle2.z);
          }
          shadowC += base * gPfAmb * pfShadow.w * .25;
          if (dr > 0.) shadowC *= 1. - .5 * dr;               // аура: тени черней
          vec3 deepC = mix(shadowC * .42, pfCDeep, pfShadow.z);
          deepC = mix(deepC, pfCDeep * .25, dr * .7);
          vec3 litC = base * mix(vec3(1.), lightHue, pfLight.w) * pfLight.z * (.85 + .15 * min(Lraw, 2.));
          vec3 hiC = mix(litC * 1.28, lightHue * max(lb * 1.6, .6), pfHi.y);
          vec3 c = mix(deepC, shadowC, b0);
          c = mix(c, litC, b1 * (1. - pfLayer.x * .3 * (1. - omL)));
          c = mix(c, hiC, b2 * pfHi.x);
          if (pfStyle2.w > 0.) { float core = b1 * (1. - b2); c = max(mix(vec3(pfLuma(c)), c, 1. + pfStyle2.w * core * .9), 0.); }
          // планы вдали: крупные пятна тона и шум, цвет проще; светлые эскизные линии по стенам и кронам
          float pfNearK = 1.; gPfSk = 0.;
          if (pfDepthD.x > 0.) {
            float tD = gPfDT;
            pfNearK = (1. + pfDepthE.y * 1.6 * (1. - smoothstep(0., .35, tD))) * (1. - .8 * tD);
            if (pfDepthE.w > 0.) {
              // разнообразие: крупные тёплые и холодные пятна по миру (не один тон на всё)
              float wv = pfNoise(vPfWorld.xz * .07 + 13.) * .7 + pfNoise(vPfWorld.xz * .21 + vPfWorld.y * .15) * .3;
              c *= mix(vec3(1.), mix(vec3(1.14, 1.0, .8), vec3(.84, .97, 1.14), smoothstep(.3, .7, wv)), pfDepthE.w);
              c *= 1. + (pfNoise(vPfWorld.xz * .11 + 5.) - .5) * .35 * pfDepthE.w;
            }
            if (pfDepthE.z > 0.) {
              float bn = pfNoise(vPfWorld.xz * .16 + vPfWorld.y * .09) * .65 + pfNoise(vPfWorld.xz * .55 + vPfWorld.y * .3 + 7.) * .35;
              c *= 1. + (bn - .5) * .7 * tD * pfDepthE.z;
              c = mix(c, vec3(pfLuma(c)), .3 * tD * pfDepthE.z);
            }
            if (pfDepthE.x > 0.) {
              vec3 an = abs(normalize(vPfWN));
              vec2 wp = an.y > .75 ? vPfWorld.xz : (an.x > an.z ? vPfWorld.zy : vPfWorld.xy);
              float ang = an.y > .75 ? .6 : (pfH11(floor(wp.x * .4) + floor(wp.y * .3) * 7.) > .5 ? 0. : 1.5708);
              float sk = pfHatch(pfRot(wp * 1.4, ang + .04), 21.) + pfHatch(pfRot(wp * .9 + 3., ang + 1.5708), 23.) * .6;
              float zone = smoothstep(.12, .55, tD) * (1. - b2 * .7);
              float ska = clamp(sk, 0., 1.) * zone * pfDepthE.x;
              c = mix(c, c * 1.5 + pfCLightLine * (.06 + .1 * pfLuma(c)), min(1., ska * 1.1));
              gPfSk = ska;   // линии держим чёткими поверх крупного мазка (без Кувахары)
            }
          }
          // карандаш: штриховка в тени, перекрёст в глубокой, процарапы на свету
          if (pfHatchA.x > 0. || pfHatchB.y > 0.) {
            vec2 hp;
            if (pfHatchB.x > .5) {
              vec3 an = abs(normalize(vPfObjN));
              vec2 op = an.x > an.y && an.x > an.z ? vPfObjPos.zy : (an.y > an.z ? vPfObjPos.xz : vPfObjPos.xy);
              hp = op * (90. / pfHatchA.y) / pfMatK.w;
            } else hp = gl_FragCoord.xy / pfHatchA.y;
            hp += (pfH22(vec2(pfStep, 9.1)) - .5) * pfStrokeC.y * 2.;
            float sh = 1. - b1;
            float h1 = pfHatch(pfRot(hp, pfHatchA.z), pfMatK.y);
            float h2 = pfHatch(pfRot(hp * 1.07, pfHatchA.z + 1.25), pfMatK.y + 7.);
            float hm = h1 * smoothstep(.15, .7, sh) + h2 * (1. - b0) * pfHatchA.w;
            float hk = pfNearK * (1. + 2.5 * dr);   // аура: штриховки в тени втрое больше
            c = mix(c, mix(c * .45, pfCPencil, .6), clamp(hm * hk, 0., 1.) * min(1., pfHatchA.x * hk));
            float h3 = pfHatch(pfRot(hp * .8, pfHatchA.z - .5), pfMatK.y + 3.);
            c = mix(c, c * 1.25 + .04, h3 * b1 * pfHatchB.y);
          }
          if (pfHatchB.z > 0.) {
            vec2 sp = gl_FragCoord.xy / pfHatchB.w + (pfH22(vec2(pfStep, 3.3)) - .5) * 1.7;
            float scr;
            if (pfHandHatchN.x > 0.) {
              // каракули из рисунков Michael: плитка образцов, каждая клетка — свой образец, отражение и сдвиг шагами
              vec2 tp = pfRot(sp, pfHatchA.z * .3) / 4.5;
              vec2 cell = floor(tp); vec2 f = fract(tp);
              vec2 hh = pfH22(cell + pfMatK.y * .13 + floor(pfStep * .5) * .71);
              float id = floor(hh.x * pfHandHatchN.x);
              if (hh.y > .5) f.x = 1. - f.x;
              vec2 auv = (vec2(mod(id, pfHandHatchN.y), floor(id / pfHandHatchN.y)) + vec2(f.x, f.y)) / pfHandHatchN.yz;
              auv.y = 1. - auv.y;
              float patchH = smoothstep(.3, .55, pfNoise(cell * .53 + pfMatK.y));
              scr = texture2D(pfHandHatch, auv).a * patchH;
            } else scr = pfScribble(pfRot(sp, pfHatchA.z + .55), pfMatK.y + 11.);
            float shd = smoothstep(.2, .85, 1. - b1);
            c = mix(c, mix(c * .5, deepC, .45), clamp(scr * shd, 0., 1.) * pfHatchB.z);
          }
          // почеркушки в тени: светлые зигзаги маркером, тёмные штрих-заплатки «///», как на стенах в кадрах TMNT
          if (pfLayer.y > 0.) {
            vec3 an = abs(normalize(vPfWN));
            vec2 wp = an.y > .75 ? vPfWorld.xz : (an.x > an.z ? vPfWorld.zy : vPfWorld.xy);
            float dist = length(vViewPosition);
            float shd = (1. - b1) * (1. + dr);
            // вдали клетки крупнее ступенями (×2 на каждое удвоение дальности): почеркушки на фоне видны, а не тонут в пикселях
            float band = exp2(floor(log2(max(1., dist / 7.))));
            wp /= band;
            float sz = pfScribble(wp * 2.4 + 5., 41. + band);
            vec2 pc = floor(wp * vec2(.9, 1.6) + .3);
            float pm = step(.62, pfH21(pc + 17.)) * smoothstep(.05, .2, fract(wp.x * .9 + .3)) * (1. - smoothstep(.75, .95, fract(wp.x * .9 + .3)));
            float hp = pfHatch(pfRot(wp * 9., .8 + pfH21(pc) * .4), 43.) * pm * (1. - smoothstep(14., 40., dist));
            vec3 lightScr = c * 2.6 + c / max(pfLuma(c), .02) * .05 + .015;
            vec3 darkScr = mix(c * .4, pfCPencil, .55);
            float a1 = clamp(sz * shd, 0., 1.) * pfLayer.y, a2 = clamp(hp * (.35 + .65 * shd), 0., 1.) * pfLayer.y * .85;
            c = mix(c, lightScr, a1); c = mix(c, darkScr, a2);
            gPfSk = max(gPfSk, max(a1, a2));
          }
          // контровый свет: рваная кромка с освещённой стороны
          // акцентные линии: где нормаль резко меняется (складки, пряди, мелкие детали)
          if (pfAccent.x > 0.) {
            vec3 gn = normalize(vNormal);
            float cr = length(fwidth(gn)) * 2.2 * pfAccent.z;
            float an = pfNoise(gl_FragCoord.xy * .08 + pfStep * 1.7);
            float am = smoothstep(.35, .75, cr + (an - .5) * .3) * smoothstep(.25, .45, an + .2);
            vec3 darkA = mix(pfCAccent, c * .35, .35);
            vec3 lightA = mix(c * 1.35 + .05, pfCLightLine, .45);
            c = mix(c, mix(darkA, lightA, b1 * pfAccent.y), am * pfAccent.x);
          }
          vec3 vd = normalize(vViewPosition);
          float fres = 1. - clamp(dot(normal, vd), 0., 1.);
          float rm = smoothstep(1. - pfRim.y - .03, 1. - pfRim.y + .03, fres + gPfS.x * gPfS.y * .2 * pfRim.z
                     + (pfNoise(gl_FragCoord.xy * .05 + pfStep * 3.1) - .5) * .12 * pfRim.z);
          vec3 rimL = gPfRim * pfLight.y;
          float rimS = pfLuma(rimL);
          vec3 rimC = mix(pfCRim, pfCRim * (rimL / max(max(rimL.r, max(rimL.g, rimL.b)), 1e-3)), .5);
          c += rimC * rm * smoothstep(.05, .6, rimS) * pfRim.x * pfMatK.z * mix(1., lb * 2., .3);
          // отсвет окружения ступенями: цветное пятно со стороны источника, тёплые тени рядом,
          // и рваная контровая кромка, когда источник за предметом (как силуэты перед проёмом)
          if (pfBounceN > 0) {
            vec3 Nw = normalize(vPfWN); vec3 Vw = normalize(cameraPosition - vPfWorld);
            float frw = 1. - clamp(dot(Nw, Vw), 0., 1.);
            float rag = (pfNoise(gl_FragCoord.xy * .06 + pfStep * 2.3) - .5) * .25 + gPfS.x * gPfS.y * .25;
            for (int i = 0; i < 4; i++) {
              if (i >= pfBounceN) break;
              vec3 d = pfBounceP[i].xyz - vPfWorld; float dist = length(d); vec3 Ld = d / max(dist, 1e-3);
              float att = 1. - dist / pfBounceP[i].w; if (att <= 0.) continue;
              float nl = dot(Nw, Ld); float e = nl * att * 1.6 + rag;
              float lit = step(.12, e) * .5 + step(.5, e) * .5;
              vec3 bc = pfBounceC[i].rgb * pfBounceC[i].w;
              c += base * bc * lit * .55;
              c = mix(c, c * (.6 + bc * .8), (1. - b1) * att * .35);
              float backness = clamp(dot(-Vw, Ld), 0., 1.);
              float rimB = step(.6 - .15 * rag, frw) * step(-.15, nl) * step(.25, backness) * step(.06, att);
              c = mix(c, bc * 1.15 + base * .25, rimB * .85 * pfMatK.z);
              // штрихи от света: со стороны источника светлые штрихи его цветом, с теневой — тёмная техническая штриховка;
              // огонь и аура «прорисовывают» фактуру вокруг себя
              if (pfLayer.z > 0.) {
                vec3 an2 = abs(Nw); vec2 wq = an2.y > .75 ? vPfWorld.xz : (an2.x > an2.z ? vPfWorld.zy : vPfWorld.xy);
                float lh = pfHatch(pfRot(wq * 11., .9 + float(i) * .7), 51. + float(i));
                float lz = pfScribble(wq * 4. + float(i) * 3., 57. + float(i));
                float k = clamp(att * 1.5, 0., 1.) * pfLayer.z * min(1., pfBounceC[i].w * 1.3) * smoothstep(.7, 1.4, dist);   // носителя ауры не штрихуем
                float la = clamp(lh * lit, 0., 1.) * k, da = clamp(lh * (1. - lit) * step(-.3, nl), 0., 1.) * k * .9, za = clamp(lz * lit, 0., 1.) * k * .6;
                c = mix(c, bc * 1.3 + base * .4, la);
                c = mix(c, mix(c * .35, pfCPencil, .6), da);
                c = mix(c, bc * 1.2 + .05, za);
                gPfSk = max(gPfSk, max(la, max(da, za)));
              }
            }
          }
          // линии эмоций, нарисованные по самой поверхности (проекция с лица; меняются шагами)
          gPfProt = gPfSk > .3 ? .5 : 0.;
          // рисованное свечение по зоне разметки: не гладкий градиент, а 3 ступени краски
          // (ореол мазками, плотный цвет, белое ядро) с рваными краями и короткими штрихами-лучами;
          // края и штрихи перескакивают шагами вместе с кипением стиля
          if (pfZoneK > 0. && pfGlowN > 0) {
            // близость к центрам свечения (точки из разметки, едут с костями): xyz — центр, w — радиус
            float vPfZone = 0.;
            for (int i = 0; i < 8; i++) { if (i >= pfGlowN) break; vPfZone = max(vPfZone, 1. - length(vPfWorld - pfGlowP[i].xyz) / pfGlowP[i].w); }
            vPfZone = clamp(vPfZone, 0., 1.);
            vec2 gq = gl_FragCoord.xy;
            float gn = pfNoise(gq * .09 + pfStep * 2.37) - .5;
            float gn2 = pfNoise(gq * .23 + 7. + pfStep * 1.71) - .5;
            float gz = vPfZone + (gn * .22 + gn2 * .08) * smoothstep(.0, .1, vPfZone);   // шум только внутри зоны
            float gOut = smoothstep(.06, .1, gz);                 // ореол: рваное пятно
            float gMid = smoothstep(.34, .38, gz);                // плотный цвет
            float gCore = smoothstep(.66, .7, gz + gn2 * .1);     // ядро
            // штрихи-лучи по ореолу: вытянутые мазки под случайным углом на каждом шаге
            float ga = pfH11(pfStep * 3.1) * 6.283;
            vec2 gd = vec2(cos(ga), sin(ga));
            float gs = pfNoise(vec2(dot(gq, gd) * .045, dot(gq, vec2(-gd.y, gd.x)) * .6) + pfStep * 5.3);
            float gRay = smoothstep(.62, .7, gs) * gOut * (1. - gMid);
            float gFl = .85 + .3 * pfH11(pfStep * 1.3);
            vec3 gC = pfZoneC * pfZoneK * gFl;
            c = mix(c, mix(c, pfZoneC * .9, .55), gOut * .6);    // окраска кости вокруг
            c = mix(c, pfZoneC * 1.1, gMid);
            c = mix(c, mix(pfZoneC, vec3(1.), .75) * 1.3, gCore);
            totalEmissiveRadiance += gC * (gOut * .25 + gRay * .7 + gMid * .9 + gCore * 1.6);
            gPfProt = max(gPfProt, gMid);                        // ступени держим чёткими (без Кувахары)
          }
          if (pfFaceK.x > 0.) {
            vec3 fp = (pfFaceMat * vec4(vPfWorld, 1.)).xyz;
            vec2 fuv = fp.xy / pfFaceSize + .5;
            float inside = step(0., fuv.x) * step(fuv.x, 1.) * step(0., fuv.y) * step(fuv.y, 1.)
                         * step(abs(fp.z), pfFaceK.z) * smoothstep(pfFaceK.w, pfFaceK.w + .2, dot(normalize(vPfWN), pfFaceN));
            vec4 ft = texture2D(pfFaceTex, fuv);
            float fa = ft.a * inside * pfFaceK.x;
            c = mix(c, ft.rgb * mix(1., .6 + .5 * min(Lraw, 1.5), .5), fa);
            totalEmissiveRadiance += ft.rgb * fa * pfFaceK.y;
            gPfProt = max(gPfProt, fa);
          }
          outgoingLight = c + totalEmissiveRadiance;
        }
        #include <opaque_fragment>
        if (gPfProt > .35) gl_FragColor.a = .5;`);
  }

  // Заменяет материалы в объекте на рисованные (цвет и текстура берутся из старых).
  paintObject(root, opts = {}) {
    root.traverse((o) => {
      if (!o.isMesh || o.userData.pfSkip) return;
      const conv = (old) => {
        if (old.userData?.paintfx) return old;
        const m = this.material({
          color: old.color ?? '#ffffff', map: old.map ?? null, emissive: old.emissive ?? '#000000',
          emissiveMap: old.emissiveMap ?? null, emissiveIntensity: old.emissiveIntensity ?? 1,
          vertexColors: old.vertexColors, side: old.side, ...opts,
        });
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        o.userData.pfPlain = o.userData.pfPlain ?? old;
        return m;
      };
      o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
    });
  }

  // Неровный контур-оболочка с нажимом, разрывами и кипением. Работает со SkinnedMesh.
  addOutline(root, opts = {}) {
    const made = [];
    const meshes = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.pfOutline && !o.userData.pfSkip) meshes.push(o); });
    for (const o of meshes) {
      const g = o.geometry;
      if (!g.attributes.pfSmoothN) smoothNormalsForOutline(g);
      const srcMat = Array.isArray(o.material) ? o.material[0] : o.material;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...this.u,
          pfBase: { value: (srcMat.color ?? new THREE.Color(0.3, 0.3, 0.3)).clone() },
          pfWidthK: { value: opts.widthScale ?? 1 },
        },
        vertexShader: OUTLINE_VERT, fragmentShader: OUTLINE_FRAG,
        side: THREE.BackSide,
      });
      const ol = o.isSkinnedMesh ? new THREE.SkinnedMesh(g, mat) : new THREE.Mesh(g, mat);
      if (o.isSkinnedMesh) ol.bind(o.skeleton, o.bindMatrix);
      ol.userData.pfOutline = true; ol.userData.pfSkip = true;
      ol.frustumCulled = o.frustumCulled;
      ol.castShadow = false; ol.receiveShadow = false;
      ol.renderOrder = o.renderOrder;
      o.add(ol);
      if (o.isSkinnedMesh) {
        // SkinnedMesh-ребёнок: положение берётся из скелета, поэтому без смещения от родителя
        ol.matrixAutoUpdate = false;
        ol.onBeforeRender = () => { ol.matrixWorld.copy(o.matrixWorld); };
      }
      made.push(ol); this.outlines.push(ol);
    }
    this.set({});
    return made;
  }
}

// Сглаженные нормали для оболочки: у вершин в одной точке одна нормаль, иначе контур рвётся на углах.
export function smoothNormalsForOutline(g) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const out = new Float32Array(pos.count * 3);
  const map = new Map();
  const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let a = map.get(k); if (!a) { a = [0, 0, 0]; map.set(k, a); }
    if (nor) { a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); }
  }
  for (let i = 0; i < pos.count; i++) {
    const a = map.get(key(i)); const l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  g.setAttribute('pfSmoothN', new THREE.BufferAttribute(out, 3));
}

const OUTLINE_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
attribute vec3 pfSmoothN;
uniform vec4 pfLine, pfLineB; uniform vec2 pfRes; uniform float pfStep, pfWidthK; uniform sampler2D pfHandLine; uniform float pfHandLineN;
varying float vPfK;
${GLSL_NOISE}
void main(){
  vec3 objectNormal = pfSmoothN;
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vec3 op = position * length(modelMatrix[0].xyz);
  vec3 bj = vec3(pfH22(vec2(pfStep, 1.3)), pfH11(pfStep * 1.7)) * pfLineB.y * 3.;
  float n = pfNoise3(op * pfLineB.x + bj);
  float n2 = pfNoise3(op * pfLineB.x * .6 + 13.1 + bj * .7);
  float w = pfLine.x * pfWidthK * mix(1., .25 + 1.6 * n, pfLine.y);
  w *= smoothstep(pfLine.z, pfLine.z + .1, n2);
  if (pfHandLineN > 0.) {
    // нажим и разрывы — по линиям Michael: путь вдоль контура берём из объектных координат, строку (образец) — по месту
    float row = floor(pfNoise3(op * pfLineB.x * .25 + 5.) * pfHandLineN);
    float tl = (op.x * .7 + op.y + op.z * .6) * pfLineB.x * .35 + pfNoise3(op * pfLineB.x * .5) * .8 + bj.x * .15;
    float pv = texture2D(pfHandLine, vec2(fract(tl), (row + .5) / pfHandLineN)).r;
    w = pfLine.x * pfWidthK * mix(1., .2 + 1.5 * pv, pfLine.y) * mix(1., smoothstep(.03, .12, pv), clamp(pfLine.z * 3., 0., 1.));
  }
  vPfK = n;
  vec3 vn = normalize(normalMatrix * objectNormal);
  vec4 cn = projectionMatrix * vec4(vn, 0.);
  vec2 d = cn.xy; float dl = length(d);
  d = dl > 1e-5 ? d / dl : vec2(0.);
  float distK = clamp(6. / max(gl_Position.w, .1), .35, 1.4);
  gl_Position.xy += d * w * distK * 2. / pfRes * gl_Position.w;
  gl_Position.z += .0004 * gl_Position.w;
}`;
const OUTLINE_FRAG = /* glsl */`
uniform vec4 pfLine; uniform vec3 pfCLine, pfBase; varying float vPfK;
void main(){
  vec3 c = mix(pfCLine, pfBase * .28, pfLine.w);
  c *= .85 + .3 * vPfK;
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- мазки-карточки (как Hatchix)
// Плоские мазки, разбросанные по поверхности меша и лежащие вдоль формы. Цвет берётся из
// текстуры/цвета модели в этой точке и освещается тем же светом в 2–3 тона. grow 0→1 «дорисовывает».
export class StrokeCards {
  constructor(style, root, opts = {}) {
    this.style = style;
    this.o = {
      density: 700, max: 30000, size: 0.06, aspect: 3.2, lift: 0.004, flow: 'wrap', flowDir: [0, 1, 0],
      jitter: 0.5, lightDir: [0.4, 0.8, 0.5], lightColor: '#fff2d0', backDir: [0, 0.3, -1], backColor: '#e8f0a8',
      shadowColor: null, ...opts,
    };
    this.group = new THREE.Group();
    this.meshes = [];
    this.uniforms = {
      ...style.u,
      pcGrow: { value: 1 }, pcSize: { value: this.o.size }, pcAspect: { value: this.o.aspect }, pcLift: { value: this.o.lift },
      pcLightDir: { value: new THREE.Vector3(...this.o.lightDir).normalize() }, pcLightCol: { value: col(this.o.lightColor) },
      pcBackDir: { value: new THREE.Vector3(...this.o.backDir).normalize() }, pcBackCol: { value: col(this.o.backColor) },
      pcAlpha: { value: 1 }, pcHand: { value: EMPTY_TEX }, pcHandN: { value: new THREE.Vector4() },
    };
    const meshes = [];
    root.traverse((m) => { if (m.isMesh && !m.userData.pfSkip) meshes.push(m); });
    for (const m of meshes) this._build(m);
    if (style.handBrush) this.setHandBrush(style.handBrush);
  }

  _build(src) {
    const g = src.geometry; const pos = g.attributes.position; const nor = g.attributes.normal; const uv = g.attributes.uv;
    const idx = g.index ? g.index.array : null;
    const triCount = idx ? idx.length / 3 : pos.count / 3;
    const sc = new THREE.Vector3(); src.getWorldScale(sc); const s = (sc.x + sc.y + sc.z) / 3;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
    const areas = new Float32Array(triCount); let total = 0;
    const vi = (t, k) => (idx ? idx[t * 3 + k] : t * 3 + k);
    for (let t = 0; t < triCount; t++) {
      A.fromBufferAttribute(pos, vi(t, 0)); B.fromBufferAttribute(pos, vi(t, 1)); C.fromBufferAttribute(pos, vi(t, 2));
      const a = t1.subVectors(B, A).cross(t2.subVectors(C, A)).length() * 0.5 * s * s;
      total += a; areas[t] = total;
    }
    const n = Math.min(this.o.max, Math.max(16, Math.round(total * this.o.density)));
    const center = new Float32Array(n * 4 * 3), normal = new Float32Array(n * 4 * 3), tang = new Float32Array(n * 4 * 3);
    const corner = new Float32Array(n * 4 * 2), seed = new Float32Array(n * 4 * 4), uvs = new Float32Array(n * 4 * 2);
    const skI = src.isSkinnedMesh ? new Float32Array(n * 4 * 4) : null, skW = src.isSkinnedMesh ? new Float32Array(n * 4 * 4) : null;
    const index = new Uint32Array(n * 6);
    const N = new THREE.Vector3(), F = new THREE.Vector3(...this.o.flowDir).normalize(), T = new THREE.Vector3(), P = new THREE.Vector3();
    const na = new THREE.Vector3(), nb = new THREE.Vector3(), nc = new THREE.Vector3();
    const rnd = mulberry(1234 + this.meshes.length * 77);
    const CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < n; i++) {
      const r = rnd() * total; let lo = 0, hi = triCount - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < r) lo = mid + 1; else hi = mid; }
      const t = lo; const i0 = vi(t, 0), i1 = vi(t, 1), i2 = vi(t, 2);
      let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v;
      A.fromBufferAttribute(pos, i0); B.fromBufferAttribute(pos, i1); C.fromBufferAttribute(pos, i2);
      P.set(0, 0, 0).addScaledVector(A, w).addScaledVector(B, u).addScaledVector(C, v);
      if (nor) {
        na.fromBufferAttribute(nor, i0); nb.fromBufferAttribute(nor, i1); nc.fromBufferAttribute(nor, i2);
        N.set(0, 0, 0).addScaledVector(na, w).addScaledVector(nb, u).addScaledVector(nc, v).normalize();
      } else N.subVectors(B, A).cross(t2.subVectors(C, A)).normalize();
      if (this.o.flow === 'wrap') T.crossVectors(N, F); else T.copy(F).addScaledVector(N, -N.dot(F));
      if (T.lengthSq() < 1e-4) T.set(1, 0, 0).addScaledVector(N, -N.x);
      T.normalize().applyAxisAngle(N, (rnd() - 0.5) * this.o.jitter * Math.PI);
      const dom = w >= u && w >= v ? i0 : (u >= v ? i1 : i2);
      const sd = [rnd(), rnd(), rnd(), 0.6 + rnd() * 0.8];
      let tu = 0, tv = 0;
      if (uv) { tu = uv.getX(i0) * w + uv.getX(i1) * u + uv.getX(i2) * v; tv = uv.getY(i0) * w + uv.getY(i1) * u + uv.getY(i2) * v; }
      for (let k = 0; k < 4; k++) {
        const j = i * 4 + k;
        center.set([P.x, P.y, P.z], j * 3); normal.set([N.x, N.y, N.z], j * 3); tang.set([T.x, T.y, T.z], j * 3);
        corner.set(CORN[k], j * 2); seed.set(sd, j * 4); uvs.set([tu, tv], j * 2);
        if (skI) {
          const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
          skI.set([si.getX(dom), si.getY(dom), si.getZ(dom), si.getW(dom)], j * 4);
          skW.set([sw.getX(dom), sw.getY(dom), sw.getZ(dom), sw.getW(dom)], j * 4);
        }
      }
      index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(center, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geo.setAttribute('pcTangent', new THREE.BufferAttribute(tang, 3));
    geo.setAttribute('pcCorner', new THREE.BufferAttribute(corner, 2));
    geo.setAttribute('pcSeed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (skI) { geo.setAttribute('skinIndex', new THREE.BufferAttribute(skI, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(skW, 4)); }
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    const srcMat = Array.isArray(src.material) ? src.material[0] : src.material;
    const plain = src.userData.pfPlain ?? srcMat;
    const map = plain.map ?? srcMat.map ?? null;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        pcMap: { value: map }, pcColor: { value: (plain.color ?? new THREE.Color(1, 1, 1)).clone() },
        pcScale: { value: 1 / s },
      },
      defines: map ? { PC_MAP: '' } : {},
      vertexShader: CARD_VERT, fragmentShader: CARD_FRAG,
      side: THREE.DoubleSide, alphaToCoverage: true, transparent: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const mesh = src.isSkinnedMesh ? new THREE.SkinnedMesh(geo, mat) : new THREE.Mesh(geo, mat);
    if (src.isSkinnedMesh) mesh.bind(src.skeleton, src.bindMatrix);
    mesh.frustumCulled = false; mesh.userData.pfSkip = true;
    src.add(mesh);
    if (src.isSkinnedMesh) { mesh.matrixAutoUpdate = false; mesh.onBeforeRender = () => mesh.matrixWorld.copy(src.matrixWorld); }
    this.meshes.push(mesh);
  }

  set grow(v) { this.uniforms.pcGrow.value = v; }
  get grow() { return this.uniforms.pcGrow.value; }
  set visible(v) { for (const m of this.meshes) m.visible = v; }
  // форма мазков из рисунков (handdrawn.js strokeAtlas); null — процедурная
  setHandBrush(A) {
    this.uniforms.pcHand.value = A?.tex ?? EMPTY_TEX;
    this.uniforms.pcHandN.value.set(A?.n ?? 0, A?.cols ?? 1, A?.rows ?? 1, 0);
  }
  setOptions(o) {
    if (o.size != null) this.uniforms.pcSize.value = o.size;
    if (o.aspect != null) this.uniforms.pcAspect.value = o.aspect;
    if (o.alpha != null) this.uniforms.pcAlpha.value = o.alpha;
    if (o.lightDir) this.uniforms.pcLightDir.value.set(...o.lightDir).normalize();
    if (o.lightColor) this.uniforms.pcLightCol.value.set(o.lightColor);
    if (o.backDir) this.uniforms.pcBackDir.value.set(...o.backDir).normalize();
    if (o.backColor) this.uniforms.pcBackCol.value.set(o.backColor);
  }
  dispose() { for (const m of this.meshes) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); } this.meshes = []; }
}

const CARD_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
attribute vec3 pcTangent; attribute vec2 pcCorner; attribute vec4 pcSeed;
uniform float pcGrow, pcSize, pcAspect, pcLift, pcScale, pfStep; uniform vec4 pfStrokeC;
varying vec2 vC; varying vec4 vSeed; varying vec3 vN; varying vec2 vUv; varying float vShow; varying vec3 vWN;
${GLSL_NOISE}
void main(){
  vec3 objectNormal = normal;
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 tg = pcTangent;
  #ifdef USE_SKINNING
    tg = (skinMatrix * vec4(tg, 0.)).xyz;
  #endif
  vec3 transformed = position;
  #include <skinning_vertex>
  float appear = clamp((pcGrow * 1.25 - pcSeed.x) / .25, 0., 1.);
  vShow = appear;
  vec3 n = normalize(objectNormal); vec3 t = normalize(tg - n * dot(tg, n)); vec3 b = cross(n, t);
  float sz = pcSize * pcScale * pcSeed.w;
  float lenK = sz * pcAspect * (.4 + .6 * appear);
  vec2 bj = (pfH22(vec2(pfStep, pcSeed.y * 91.)) - .5) * pfStrokeC.y;
  vec3 p = transformed + t * (pcCorner.x * lenK + bj.x * sz) + b * (pcCorner.y * sz * .5 + bj.y * sz * .3) + n * pcLift * pcScale * (1. + pcSeed.z);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mvPosition;
  vC = pcCorner; vSeed = pcSeed; vUv = uv;
  vWN = normalize((modelMatrix * vec4(n, 0.)).xyz);
}`;
const CARD_FRAG = /* glsl */`
uniform vec3 pcColor, pcLightDir, pcLightCol, pcBackDir, pcBackCol, pfCShadow, pfCDeep, pfCStroke;
uniform vec4 pfFill, pfShadow, pfLight, pfStrokeB, pfStrokeC; uniform float pcAlpha, pfStep;
#ifdef PC_MAP
uniform sampler2D pcMap;
#endif
uniform sampler2D pcHand; uniform vec4 pcHandN;
varying vec2 vC; varying vec4 vSeed; varying vec2 vUv; varying float vShow; varying vec3 vWN;
${GLSL_NOISE}
void main(){
  float u = vC.x, v = vC.y;
  float w = 1. - .45 * u * u;
  float m = (1. - smoothstep(.8, 1., abs(u))) * (1. - smoothstep(.6, 1., abs(v) / max(w, .1)));
  float br = pfNoise(vec2(u * 2.2, v * 6.) + vSeed.xy * 40.);
  float dryT = smoothstep(-.2, 1., u) * pfStrokeC.x;
  m *= smoothstep(dryT - .1, dryT + .1, br);
  if (pcHandN.x > 0.) {
    // форма мазка — штрих Michael (каждая карточка берёт свой штрих из атласа)
    float id = floor(fract(vSeed.w * 7.31 + vSeed.x) * pcHandN.x);
    vec2 cuv = (vec2(mod(id, pcHandN.y), floor(id / pcHandN.y)) + vec2(u * .5 + .5, 1. - (v * .5 + .5))) / pcHandN.yz;
    cuv.y = 1. - cuv.y;
    m = texture2D(pcHand, cuv).a;
  }
  m *= step(u * .5 + .5, vShow * 1.02);        // дорисовка вдоль мазка
  if (m * pcAlpha < .5) discard;
  vec3 base = pcColor;
  #ifdef PC_MAP
    base *= texture2D(pcMap, vUv).rgb;
  #endif
  base *= 1. + (vSeed.y - .5) * pfStrokeB.z * 2.;
  base = mix(base, pfCStroke * pfLuma(base) * 1.6, pfStrokeB.w * step(.7, vSeed.z) * .5);
  vec3 n = normalize(vWN) * (gl_FrontFacing ? 1. : -1.);
  float nl = dot(n, pcLightDir);
  float L = clamp((nl + pfLight.x) / (1. + pfLight.x), 0., 1.) * pfLuma(pcLightCol) * pfLight.y + (vSeed.z - .5) * pfStrokeB.y;
  float soft = pfFill.w + .002;
  float b0 = smoothstep(pfFill.x - soft, pfFill.x + soft, L), b1 = smoothstep(pfFill.y - soft, pfFill.y + soft, L);
  float lb = pfLuma(base);
  vec3 sh = mix(base * pfShadow.x, pfCShadow * lb * 2.2, pfShadow.y);
  vec3 dp = mix(sh * .42, pfCDeep, pfShadow.z);
  vec3 lit = base * mix(vec3(1.), pcLightCol, pfLight.w) * pfLight.z;
  vec3 c = mix(mix(dp, sh, b0), lit, b1);
  float back = clamp(dot(n, pcBackDir) * -1., 0., 1.);
  c += pcBackCol * smoothstep(.55, .75, back + (vSeed.x - .5) * .3) * .35;
  gl_FragColor = vec4(c, 1.);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- светящийся проём
export const PORTAL_PRESETS = {
  sewer: { name: 'Проём тоннеля (фото)', cCore: '#eeeac4', cMid: '#cfc996', cStrokeA: '#9cb47c', cStrokeB: '#f2eecc', cShade: '#8a9070',
    cRim1: '#b8e070', cRim2: '#f2e890', cFringe: '#d0502a', cHalo: '#e0e8a0', cScribble: '#3a2416', glow: 1.0, halo: 1, strokes: 1, scribbles: 1 },
  moon: { name: 'Луна (ночь из видео)', cCore: '#ffffff', cMid: '#f0f4ff', cStrokeA: '#c8e8f0', cStrokeB: '#ffffff', cShade: '#b0c0d8',
    cRim1: '#a0f0e8', cRim2: '#ffffff', cFringe: '#7050c0', cHalo: '#c8d8ff', cScribble: '#2a1438', glow: 1.15, halo: 0.8, strokes: 0.6, scribbles: 0.3 },
  ember: { name: 'Колдовской огонь', cCore: '#fff0c0', cMid: '#ffb050', cStrokeA: '#ff8030', cStrokeB: '#fff0b0', cShade: '#c05020',
    cRim1: '#ff6020', cRim2: '#ffe070', cFringe: '#801030', cHalo: '#ff9040', cScribble: '#2a0a06', glow: 2, halo: 1.2, strokes: 1, scribbles: 0.6 },
  spirit: { name: 'Дух леса', cCore: '#e8fff0', cMid: '#a8e8c0', cStrokeA: '#70c890', cStrokeB: '#e0fff0', cShade: '#509878',
    cRim1: '#50e0a0', cRim2: '#d0fff0', cFringe: '#1a6040', cHalo: '#80f0b0', cScribble: '#0a2416', glow: 1.8, halo: 1, strokes: 1, scribbles: 0.7 },
};

export class GlowPortal {
  constructor(style, opts = {}) {
    this.style = style;
    const r = opts.radius ?? 3;
    const p = { ...PORTAL_PRESETS.sewer, ...(opts.colors ?? {}) };
    this.uniforms = {
      pfStep: style.u.pfStep, pfStrokeC: style.u.pfStrokeC,
      ppCore: { value: col(p.cCore) }, ppMid: { value: col(p.cMid) }, ppStrokeA: { value: col(p.cStrokeA) }, ppStrokeB: { value: col(p.cStrokeB) },
      ppShade: { value: col(p.cShade) }, ppRim1: { value: col(p.cRim1) }, ppRim2: { value: col(p.cRim2) }, ppFringe: { value: col(p.cFringe) },
      ppHalo: { value: col(p.cHalo) }, ppScribble: { value: col(p.cScribble) },
      ppK: { value: new THREE.Vector4(p.glow, p.halo, p.strokes, p.scribbles) },
      ppExt: { value: 1.45 },
    };
    const ext = this.uniforms.ppExt.value;
    // два меша: диск (непрозрачный, пишет глубину, чтобы набросок по глубине не видел, что за ним)
    // и ореол-кольцо (аддитивный, без глубины)
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.06, 96), new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, ppR: { value: 1.06 } }, vertexShader: PORTAL_VERT, fragmentShader: PORTAL_FRAG,
    }));
    this.halo = new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r * ext, 128, 1), new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, ppR: { value: ext } }, vertexShader: PORTAL_VERT, fragmentShader: PORTAL_FRAG, defines: { PP_HALO: '' },
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    this.mesh.userData.pfSkip = true; this.halo.userData.pfSkip = true;
    this.mesh.layers.enable(LIGHT_LAYER);
    this.halo.renderOrder = 2;
    this.group = new THREE.Group(); this.group.add(this.mesh, this.halo);
    if (opts.light !== false) {
      this.light = new THREE.PointLight(p.cHalo, opts.lightIntensity ?? 60, opts.lightRange ?? r * 8, 1.6);
      this.light.position.set(0, 0, r * 0.4);
      this.group.add(this.light);
    }
  }
  setColors(p) {
    const U = this.uniforms;
    const map = { cCore: 'ppCore', cMid: 'ppMid', cStrokeA: 'ppStrokeA', cStrokeB: 'ppStrokeB', cShade: 'ppShade', cRim1: 'ppRim1', cRim2: 'ppRim2', cFringe: 'ppFringe', cHalo: 'ppHalo', cScribble: 'ppScribble' };
    for (const k in map) if (p[k]) U[map[k]].value.set(p[k]);
    const K = U.ppK.value; if (p.glow != null) K.x = p.glow; if (p.halo != null) K.y = p.halo; if (p.strokes != null) K.z = p.strokes; if (p.scribbles != null) K.w = p.scribbles;
    if (this.light && p.cHalo) this.light.color.set(p.cHalo);
  }
}
const PORTAL_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const PORTAL_FRAG = /* glsl */`
uniform vec3 ppCore, ppMid, ppStrokeA, ppStrokeB, ppShade, ppRim1, ppRim2, ppFringe, ppHalo, ppScribble;
uniform vec4 ppK; uniform float ppR, pfStep; uniform vec4 pfStrokeC;
varying vec2 vUv;
${GLSL_NOISE}
${GLSL_STROKES}
void main(){
  vec2 p = (vUv - .5) * 2. * ppR;          // 1 = край проёма
  float r = length(p); float a = atan(p.y, p.x);
  vec2 bj = (pfH22(vec2(pfStep, 5.1)) - .5) * pfStrokeC.y * .12;
  float edgeN = (pfNoise(vec2(a * 9., pfStep * .37)) - .5) * .035 + (pfNoise(vec2(a * 40., 3.)) - .5) * .015;
  float re = r + edgeN;
  vec3 c = vec3(0.); float alpha = 0.;
#ifndef PP_HALO
  if (re >= 1.) discard;
#else
  if (re < 1.) discard;
#endif
  if (re < 1.) {
    // заливка: светлый центр, к краю плотнее
    c = mix(ppCore, ppMid, smoothstep(.1, .95, re));
    // мазки дугами по кругу и вертикальные (как на фото)
    vec2 tdir = normalize(vec2(-p.y, p.x) + 1e-4);
    vec4 s1 = pfStroke((p + bj) * 4.2, tdir, 1.15, .35, .55, 3.);
    vec4 s2 = pfStroke((p + bj) * 6.5 + 11., vec2(.15, 1.), 1.2, .5, .7, 9.);
    c = mix(c, mix(ppStrokeA, ppStrokeB, s1.z * s1.z), s1.y * .8 * ppK.z * smoothstep(.1, .45, re));
    c = mix(c, mix(ppStrokeB, ppStrokeA, s2.z), s2.y * .5 * ppK.z);
    // силуэты-тени снизу (дальние постройки), тоже мазками
    float sk = smoothstep(-.15, -.55, p.y + (pfNoise(vec2(p.x * 3., 1.)) - .5) * .5);
    c = mix(c, ppShade, sk * .45 * s2.y * ppK.z);
    // кромка: зелёная, жёлтая и тонкие красные нитки
    float ring = smoothstep(.8, .97, re);
    c = mix(c, ppRim1, ring * .7);
    c = mix(c, ppRim2, smoothstep(.9, .99, re) * (.4 + .6 * pfNoise(vec2(a * 30., 2.))));
    float fr = smoothstep(.006, 0., abs(re - .955 - (pfNoise(vec2(a * 14., 7.)) - .5) * .03)) * step(.45, pfNoise(vec2(a * 6., 4.)));
    c = mix(c, ppFringe, fr * .8);
    c *= ppK.x;
    alpha = 1.;
  } else {
    // ореол: свечение и радиальные «лучики»-штрихи
    float h = exp(-(re - 1.) * 4.2) * ppK.y;
    float rays = pfHatch(vec2(a * 55., re * 2.), 4.) * smoothstep(1.35, 1., re);
    c = ppHalo * (h * .55 + rays * .12 * ppK.y);
    alpha = 0.;
    // петлистые «перелёты» линий у края (карандаш поверх)
    float sc = 0.;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float a0 = 2.2 + fi * .22 + pfH11(fi + 3.) * .3;
      float rr = 1.06 + fi * .05 + sin(a * 3. + fi) * .02;
      float d = abs(r - rr);
      float span = smoothstep(.0, .05, a - a0 + .9) * smoothstep(.0, .05, a0 + .3 - a);
      sc = max(sc, smoothstep(.012, .003, d) * span);
    }
    float sa = sc * ppK.w;
    c = mix(c, ppScribble, sa); alpha = max(alpha, sa);
  }
  gl_FragColor = vec4(c, alpha);
}`;

// ---------------------------------------------------------------- рисованное небо / задник
export const SKY_PRESETS = {
  sewer: { name: 'Тоннель (тёмный)', top: '#1a0c08', mid: '#2a140c', low: '#3a1c10', cloud: '#4a2818', cloudShade: '#200e08', stroke: 0.6, clouds: 0 },
  sunset: { name: 'Закат (видео 2.5D)', top: '#6a7ad0', mid: '#f4b8a0', low: '#ffe0a0', cloud: '#fff0e0', cloudShade: '#d890a8', stroke: 0.8, clouds: 0.8 },
  night: { name: 'Ночь (видео)', top: '#1a0a24', mid: '#4a1834', low: '#7a3040', cloud: '#a04a48', cloudShade: '#2a1028', stroke: 0.9, clouds: 0.6 },
  lair: { name: 'Логово (зелёный мрак)', top: '#111b26', mid: '#1c3032', low: '#3c6a58', cloud: '#4a7a66', cloudShade: '#141e28', stroke: 0.9, clouds: 0.5 },
  overcast: { name: 'Хмурый день (Русь)', top: '#5a6670', mid: '#8a9490', low: '#c0bca8', cloud: '#d8d4c4', cloudShade: '#707a80', stroke: 0.7, clouds: 0.9 },
};
export class PaintedSky {
  constructor(style, opts = {}) {
    const p = { ...SKY_PRESETS.sunset, ...(opts.colors ?? {}) };
    this.uniforms = {
      pfStep: style.u.pfStep, pfStrokeC: style.u.pfStrokeC,
      psTop: { value: col(p.top) }, psMid: { value: col(p.mid) }, psLow: { value: col(p.low) },
      psCloud: { value: col(p.cloud) }, psCloudShade: { value: col(p.cloudShade) },
      psK: { value: new THREE.Vector4(p.stroke, p.clouds, opts.brightness ?? 1, 0) },
      // луна с ореолом ступенями и эскизными кругами вокруг (примеры Michael, 2026-11-08); r = 0 — без луны
      psMoon: { value: new THREE.Vector4(0, 0.3, -1, 0) }, psMoonC: { value: col('#e8fff4') }, psRingC: { value: col('#a8d8d0') }, psM2: { value: new THREE.Vector4(1, 1, 0, 0) },
    };
    if (opts.moon) this.setMoon(opts.moon);
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(opts.radius ?? 400, 48, 24), new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false,
    }));
    this.mesh.userData.pfSkip = true; this.mesh.renderOrder = -10; this.mesh.frustumCulled = false;
  }
  setMoon({ dir = [0, 0.3, -1], r = 0.08, color = '#e8fff4', ring = '#a8d8d0', rings = 1, halo = 1 } = {}) {
    const d = new THREE.Vector3(...dir).normalize(); this.uniforms.psMoon.value.set(d.x, d.y, d.z, r);
    this.uniforms.psMoonC.value.copy(col(color)); this.uniforms.psRingC.value.copy(col(ring)); this.uniforms.psM2.value.set(rings, halo, 0, 0);
  }
  setColors(p) {
    const U = this.uniforms;
    for (const [k, u] of [['top', 'psTop'], ['mid', 'psMid'], ['low', 'psLow'], ['cloud', 'psCloud'], ['cloudShade', 'psCloudShade']]) if (p[k]) U[u].value.set(p[k]);
    if (p.stroke != null) U.psK.value.x = p.stroke; if (p.clouds != null) U.psK.value.y = p.clouds;
  }
}
const SKY_VERT = /* glsl */`varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`;
const SKY_FRAG = /* glsl */`
uniform vec3 psTop, psMid, psLow, psCloud, psCloudShade; uniform vec4 psK; uniform float pfStep; uniform vec4 pfStrokeC;
uniform vec4 psMoon, psM2; uniform vec3 psMoonC, psRingC;
varying vec3 vDir;
${GLSL_NOISE}
${GLSL_STROKES}
void main(){
  vec3 d = normalize(vDir);
  float az = atan(d.z, d.x); float el = d.y;
  vec2 p = vec2(az * 6., el * 9.);
  vec2 bj = (pfH22(vec2(pfStep, 2.2)) - .5) * pfStrokeC.y * .15;
  // полосы-градиент, границы полос рвутся мазками (горизонтальные, как в видео)
  vec4 s = pfStroke((p + bj) * vec2(1.3, 2.2), vec2(1., .05), 1.3, .15, .6, 1.);
  float e = el + s.x * s.y * .06 * psK.x;
  vec3 c = mix(psLow, psMid, smoothstep(-.05, .22, e));
  c = mix(c, psTop, smoothstep(.25, .7, e));
  c *= 1. + s.x * s.y * .06 * psK.x;
  // облака: плоские пятна с тёмным низом
  float cl = pfFbm(vec2(az * 2.2, el * 7.) + vec2(3.1, 0.));
  float band = smoothstep(.0, .12, el) * smoothstep(.55, .2, el);
  float m = smoothstep(.55, .6, cl + s.x * s.y * .05) * band * psK.y;
  float lit = smoothstep(.5, .7, pfFbm(vec2(az * 2.2, el * 7. + .12) + vec2(3.1, 0.)) );
  c = mix(c, mix(psCloud, psCloudShade, lit * .8), m);
  if (psMoon.w > 0.) {
    vec3 mo = normalize(psMoon.xyz); float r = psMoon.w; float st = floor(pfStep);
    vec3 t1 = normalize(cross(mo, vec3(0., 1., 0.))); vec3 t2 = cross(t1, mo);
    float dm = dot(d, mo);
    vec2 q = vec2(dot(d, t1), dot(d, t2)) / max(dm, .05); float a = dm > 0. ? length(q) : 9.;
    float qa = atan(q.y, q.x);
    // ореол двумя ступенями с рваным краем
    float h2 = 1. - smoothstep(r * 2.35, r * 2.4, a + (pfNoise(vec2(qa * 5., st * .7)) - .5) * r * .5);
    float h1 = 1. - smoothstep(r * 1.65, r * 1.7, a + (pfNoise(vec2(qa * 7. + 3., st * .9)) - .5) * r * .3);
    c = mix(c, mix(c, psMoonC, .1), h2 * psM2.y); c = mix(c, mix(c, psMoonC, .45), h1 * psM2.y);
    float disk = 1. - smoothstep(r * .97, r * 1.0, a + (pfNoise(vec2(qa * 9., st)) - .5) * r * .05);
    float shade = pfFbm(q / r * 1.3 + 4.);
    c = mix(c, psMoonC * (1.05 + .15 * shade), disk);
    // эскизные круги: вытянутые эллипсы под разными углами, рвутся, перескакивают шагами
    for (int k = 0; k < 4; k++) {
      float fk = float(k);
      float tl = -.5 + fk * .45 + (pfH11(st * .3 + fk) - .5) * .06;
      vec2 qr = mat2(cos(tl), -sin(tl), sin(tl), cos(tl)) * q;
      float el = length(qr * vec2(1., 1.5 + fk * .35));
      float rr = r * (1.35 + fk * .42) + (pfNoise(vec2(qa * 2. + fk * 5., st * .5)) - .5) * r * .12;
      float fw = max(fwidth(el), 1e-5);
      float ln = 1. - smoothstep(fw * .6, fw * 1.8, abs(el - rr));
      float brk = smoothstep(.35, .5, pfNoise(vec2(atan(qr.y, qr.x) * 2.2 + fk * 7., st * .2 + fk)));
      c = mix(c, psRingC, ln * brk * psM2.x * (.75 - fk * .1) * step(0., dm));
    }
  }
  gl_FragColor = vec4(c * psK.z, 1.);
}`;

// ---------------------------------------------------------------- пост-обработка
// Сцена рисуется в текстуру (MSAA + глубина), затем: дрожь краёв кистью и анизотропная Кувахара,
// bloom на четверти разрешения, набросок по глубине с перелётом, линии по цвету, бумага,
// зерно, аберрация, виньетка, цветокор. Выход в sRGB.
export class PaintPost {
  constructor(renderer, style, opts = {}) {
    this.r = renderer; this.style = style;
    this.enabled = true;
    this.splitX = 0;   // >0: левая часть экрана остаётся без пост-обработки (сравнение)
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const mk = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, ...o });
    this.rtScene = mk(size.x, size.y, { samples: opts.samples ?? 4, depthTexture: new THREE.DepthTexture(size.x, size.y) });
    this.rtK = mk(size.x, size.y);
    this.rtB1 = mk(size.x >> 2, size.y >> 2); this.rtB2 = mk(size.x >> 2, size.y >> 2);
    this.rtL1 = mk(size.x >> 2, size.y >> 2); this.rtL2 = mk(size.x >> 2, size.y >> 2);
    this.kickUntil = 0;        // кадр сдвига цвета на событии (удар, вспышка ауры): post.kick(мс)
    this.overlay = null;       // сцена поверх готового кадра (знаки эмоций): без пост-обработки
    this.overlayLayer = null;  // слой камеры основной сцены, который рисуется поверх кадра (линии эмоций, FACE_LAYER)
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    const common = { pfStep: style.u.pfStep, pfRes: { value: new THREE.Vector2(size.x, size.y) } };
    this.common = common;
    this.mKuwa = new THREE.ShaderMaterial({ uniforms: { ...common, tSrc: { value: null }, pk: { value: new THREE.Vector4() }, tDepth: { value: null }, pCam: { value: new THREE.Vector2(0.1, 100) }, pkD: { value: new THREE.Vector4() } }, vertexShader: Q_VERT, fragmentShader: KUWA_FRAG, depthTest: false, depthWrite: false });
    this.mLightSrc = new THREE.ShaderMaterial({ vertexShader: LSRC_VERT, fragmentShader: LSRC_FRAG, side: THREE.DoubleSide });
    this.mMask = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, pThr: { value: 1 } }, vertexShader: Q_VERT, fragmentShader: MASK_FRAG, depthTest: false, depthWrite: false });
    this.mBright = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, pThr: { value: 1 } }, vertexShader: Q_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false });
    this.mBlur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, pDir: { value: new THREE.Vector2() } }, vertexShader: Q_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false });
    this.mFinal = new THREE.ShaderMaterial({
      uniforms: {
        ...common, tK: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tLight: { value: null },
        pE: { value: new THREE.Vector4() }, pLightLine: { value: new THREE.Color() }, pLL: { value: new THREE.Vector2() },
        tHandLight: { value: EMPTY_TEX }, pHandLightN: { value: 0 },
        pA: { value: new THREE.Vector4() }, pB: { value: new THREE.Vector4() }, pC: { value: new THREE.Vector4() }, pD: { value: new THREE.Vector4() },
        pPaper: { value: new THREE.Color() }, pLift: { value: new THREE.Color() }, pGain: { value: new THREE.Color() }, pLine: { value: new THREE.Color() },
        pCam: { value: new THREE.Vector2(0.1, 100) }, pF: { value: new THREE.Vector4() }, pKick: { value: 0 },
        pDD: { value: new THREE.Vector4() }, pHz: { value: new THREE.Vector4() }, pHazeC: { value: new THREE.Color() },
      },
      vertexShader: Q_VERT, fragmentShader: FINAL_FRAG, depthTest: false, depthWrite: false,
    });
  }

  setSize(w, h) {
    this.rtScene.setSize(w, h); this.rtScene.depthTexture.image.width = w; this.rtScene.depthTexture.image.height = h;
    this.rtK.setSize(w, h);
    for (const t of [this.rtB1, this.rtB2, this.rtL1, this.rtL2]) t.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2));
    this.common.pfRes.value.set(w, h);
  }

  _pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.cam); }

  kick(ms = 85) { this.kickUntil = performance.now() + ms; }

  setHandLight(tex, n) { this.mFinal.uniforms.tHandLight.value = tex; this.mFinal.uniforms.pHandLightN.value = n; }

  render(scene, camera) {
    const r = this.r, q = this.style.params, L = this.style.layers;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    if (size.x !== this.rtScene.width || size.y !== this.rtScene.height) this.setSize(size.x, size.y);
    if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    const prevTM = r.toneMapping; r.toneMapping = THREE.NoToneMapping;
    const cc0 = r.getClearColor(new THREE.Color()), ca0 = r.getClearAlpha(); r.setClearColor(cc0, 1);   // альфа 1 = обычный пиксель; 0.5 = защищён от Кувахары
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera); r.setClearColor(cc0, ca0);
    // 1) Кувахара + дрожь кисти
    const kr = L.kuwahara ? q.kuwahara : 0;
    this.mKuwa.uniforms.tSrc.value = this.rtScene.texture;
    this.mKuwa.uniforms.pk.value.set(kr, q.kuwaAniso, L.kuwahara ? q.warp : 0, q.boil);
    this.mKuwa.uniforms.tDepth.value = this.rtScene.depthTexture; this.mKuwa.uniforms.pCam.value.set(camera.near, camera.far);
    this.mKuwa.uniforms.pkD.value.set(q.depthDetail ?? 0, q.detailNear ?? 6, q.detailFar ?? 45, Math.min(7, kr * (q.farStroke ?? 2.5) * 0.8));
    this._pass(this.mKuwa, this.rtK);
    // 2) bloom
    const bl = L.bloom ? q.bloom : 0;
    if (bl > 0) {
      this.mBright.uniforms.tSrc.value = this.rtK.texture; this.mBright.uniforms.pThr.value = q.bloomThreshold;
      this._pass(this.mBright, this.rtB1);
      for (let i = 0; i < 3; i++) {
        const s = 1 + i;
        this.mBlur.uniforms.tSrc.value = this.rtB1.texture; this.mBlur.uniforms.pDir.value.set(s / this.rtB1.width, 0); this._pass(this.mBlur, this.rtB2);
        this.mBlur.uniforms.tSrc.value = this.rtB2.texture; this.mBlur.uniforms.pDir.value.set(0, s / this.rtB1.height); this._pass(this.mBlur, this.rtB1);
      }
    }
    // 2б) карта близости к ярким местам: её изолинии = эскизные линии света вокруг источников
    const ll = L.lightlines ? q.lightLines : 0;
    const bk = L.lightlines ? q.backlit : 0;
    if (ll > 0 || bk > 0) {
      // маска рисуется только из источников (слой LIGHT_LAYER), без заслоняющих персонажей,
      // поэтому линии повторяют форму света, а не силуэты перед ним; в G — дальность источника
      const mask = camera.layers.mask, bg = scene.background, ov = scene.overrideMaterial;
      camera.layers.set(LIGHT_LAYER); scene.background = null; scene.overrideMaterial = this.mLightSrc;
      const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      r.setRenderTarget(this.rtL1); r.setClearColor(0x000000, 1); r.clear(); r.render(scene, camera); r.setClearColor(cc, ca);
      camera.layers.mask = mask; scene.background = bg; scene.overrideMaterial = ov;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const s = (1 + i * 1.6) * q.lightLineReach * 2;
        this.mBlur.uniforms.tSrc.value = this.rtL1.texture; this.mBlur.uniforms.pDir.value.set(s / this.rtL1.width, 0); this._pass(this.mBlur, this.rtL2);
        this.mBlur.uniforms.tSrc.value = this.rtL2.texture; this.mBlur.uniforms.pDir.value.set(0, s / this.rtL1.height); this._pass(this.mBlur, this.rtL1);
      }
    }
    // 3) сборка
    const U = this.mFinal.uniforms;
    U.tLight.value = this.rtL1.texture;
    U.pE.value.set(ll, q.lightLineCount, q.lightLineBreak, q.sketchCopies);
    U.pLightLine.value.set(q.cLightLine); U.pLL.value.set(q.lightLineThr, bk);
    U.tK.value = this.rtK.texture; U.tDepth.value = this.rtScene.depthTexture; U.tBloom.value = this.rtB1.texture;
    U.pA.value.set(L.sketch ? q.sketch : 0, q.sketchOver, L.sketch ? q.colorEdge : 0, L.paper ? q.paper : 0);
    U.pB.value.set(q.paperScale, L.paper ? q.grain : 0, L.lens ? q.aberration : 0, bl);
    U.pC.value.set(L.lens ? q.vignette : 0, q.saturation, q.contrast, q.postExposure);
    U.pD.value.set(q.boil, q.bloomSat ?? 1, 0, 0);
    U.pF.value.set(q.grade2 ?? 0, q.satDark ?? 1, L.kuwahara ? (q.sharpen ?? 0) : 0, q.silChip ?? 0);
    U.pKick.value = performance.now() < this.kickUntil ? 1 : 0;
    U.pPaper.value.set(q.cPaper); U.pLift.value.set(q.cLift); U.pGain.value.set(q.cGain); U.pLine.value.set(q.cLine);
    U.pCam.value.set(camera.near, camera.far);
    U.pDD.value.set(q.depthDetail ?? 0, q.detailNear ?? 6, q.detailFar ?? 45, q.farNoise ?? 0);
    U.pHz.value.set(q.haze ?? 0, q.hazeFar ?? 60, q.hazeSteps ?? 4, 0); U.pHazeC.value.set(q.cHaze ?? '#283844');
    this.quad.material = this.mFinal;
    r.setRenderTarget(null);
    if (this.splitX > 0) {
      r.setScissorTest(true);
      const w = r.domElement.width / r.getPixelRatio(), h = r.domElement.height / r.getPixelRatio();
      r.setScissor(w * this.splitX, 0, w * (1 - this.splitX), h);
    }
    r.render(this.qs, this.cam);
    if ((this.overlay && L.marks !== false) || (this.overlayLayer != null && L.face !== false)) {
      const ac = r.autoClear; r.autoClear = false; r.clearDepth();
      if (this.overlayLayer != null && L.face !== false) {
        const mask = camera.layers.mask, bg = scene.background, env = scene.environment; camera.layers.set(this.overlayLayer);
        scene.background = null; r.render(scene, camera); camera.layers.mask = mask; scene.background = bg;
      }
      if (this.overlay && L.marks !== false) r.render(this.overlay, camera);
      r.autoClear = ac;
    }
    r.setScissorTest(false);
    r.toneMapping = prevTM;
  }
  dispose() { for (const t of [this.rtScene, this.rtK, this.rtB1, this.rtB2, this.rtL1, this.rtL2]) t.dispose(); }
}

const Q_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const KUWA_FRAG = /* glsl */`
uniform sampler2D tSrc, tDepth; uniform vec4 pk, pkD; uniform vec2 pfRes, pCam; uniform float pfStep;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 px = 1. / pfRes;
  // дрожь краёв: сдвиг по полю мазков в экранных координатах, меняется шагами
  vec2 sp = vUv * pfRes / 26.;
  float st = pfStep * pk.w;
  vec2 wv = vec2(pfNoise(sp + st * .71), pfNoise(sp * 1.3 + 17. + st * .53)) - .5;
  vec4 src0 = texture2D(tSrc, vUv);
  if (src0.a < .75) { gl_FragColor = vec4(src0.rgb, 1.); return; }   // защищённые пиксели (линии эмоций, знаки): без Кувахары и дрожи
  // планы: вблизи радиус мал (рисунок чёткий), вдали растёт (крупный мазок), дрожь сильнее
  float tD = 0.;
  if (pkD.x > 0.) { float z = texture2D(tDepth, vUv).x; float dd = pCam.x * pCam.y / (pCam.y - z * (pCam.y - pCam.x)); tD = pkD.x * smoothstep(pkD.y, pkD.z, dd) * step(z, .99995); }
  vec2 uv = vUv + wv * pk.z * px * 2.2 * (1. + 1.6 * tD);
  int R = int(pk.x);
  if (pkD.x > 0. && pk.x > 0.) R = int(floor(mix(pk.x * (1. - .55 * pkD.x), pkD.w, tD) + .5));
  if (R <= 0) { gl_FragColor = vec4(texture2D(tSrc, uv).rgb, 1.); return; }
  // направление мазка по градиенту яркости
  float l1 = pfLuma(texture2D(tSrc, uv + vec2(px.x * 2., 0.)).rgb), l2 = pfLuma(texture2D(tSrc, uv - vec2(px.x * 2., 0.)).rgb);
  float l3 = pfLuma(texture2D(tSrc, uv + vec2(0., px.y * 2.)).rgb), l4 = pfLuma(texture2D(tSrc, uv - vec2(0., px.y * 2.)).rgb);
  vec2 g = vec2(l1 - l2, l3 - l4);
  float ang = length(g) > 1e-3 ? atan(g.y, g.x) + 1.5708 : (pfNoise(sp * .5) * 6.28);
  float an = pk.y;
  vec3 m[4]; vec3 s2[4];
  for (int k = 0; k < 4; k++) { m[k] = vec3(0.); s2[k] = vec3(0.); }
  float n = 0.;
  for (int j = 0; j <= 7; j++) {
    if (j > R) break;
    for (int i = 0; i <= 7; i++) {
      if (i > R) break;
      vec2 o = vec2(float(i), float(j));
      vec2 e = pfRot(vec2(o.x * an, o.y / an) * .75, ang) * px;
      vec2 f = pfRot(vec2(-o.y * an, o.x / an) * .75, ang) * px;
      vec3 c0 = texture2D(tSrc, uv + e).rgb, c1 = texture2D(tSrc, uv - e).rgb;
      vec3 c2 = texture2D(tSrc, uv + f).rgb, c3 = texture2D(tSrc, uv - f).rgb;
      m[0] += c0; s2[0] += c0 * c0; m[1] += c1; s2[1] += c1 * c1;
      m[2] += c2; s2[2] += c2 * c2; m[3] += c3; s2[3] += c3 * c3;
      n += 1.;
    }
  }
  vec3 best = m[0] / n; float bv = 1e9;
  for (int k = 0; k < 4; k++) {
    vec3 mu = m[k] / n; vec3 v = abs(s2[k] / n - mu * mu);
    float s = v.r + v.g + v.b;
    if (s < bv) { bv = s; best = mu; }
  }
  gl_FragColor = vec4(best, 1.);
}`;
const LSRC_VERT = /* glsl */`varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
const LSRC_FRAG = /* glsl */`varying float vD; void main(){ gl_FragColor = vec4(1., vD / 100., 0., 1.); }`;
const MASK_FRAG = /* glsl */`uniform sampler2D tSrc; uniform float pThr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(vec3(smoothstep(pThr * .85, pThr * 1.1, l)), 1.); }`;
const BRIGHT_FRAG = /* glsl */`uniform sampler2D tSrc; uniform float pThr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(pThr, pThr * 1.6, l), 1.); }`;
const BLUR_FRAG = /* glsl */`uniform sampler2D tSrc; uniform vec2 pDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb * .227;
  c += (texture2D(tSrc, vUv + pDir * 1.38).rgb + texture2D(tSrc, vUv - pDir * 1.38).rgb) * .316;
  c += (texture2D(tSrc, vUv + pDir * 3.23).rgb + texture2D(tSrc, vUv - pDir * 3.23).rgb) * .07;
  gl_FragColor = vec4(c, 1.); }`;
const FINAL_FRAG = /* glsl */`
uniform sampler2D tK, tDepth, tBloom, tLight, tHandLight; uniform float pHandLightN; uniform vec4 pA, pB, pC, pD, pE; uniform vec2 pLL; uniform vec3 pPaper, pLift, pGain, pLine, pLightLine;
uniform vec2 pfRes, pCam; uniform float pfStep; uniform vec4 pF; uniform float pKick; uniform vec4 pDD, pHz; uniform vec3 pHazeC;
varying vec2 vUv;
${GLSL_NOISE}
float linD(vec2 uv){ float z = texture2D(tDepth, uv).x; float n = pCam.x, f = pCam.y; return n * f / (f - z * (f - n)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main(){
  vec2 px = 1. / pfRes;
  // аберрация (радиально)
  vec2 dc = vUv - .5; vec2 ab = dc * length(dc) * pB.z * px * 6.;
  // сколы силуэта: у краёв по глубине кадр берётся со сдвигом, постоянным в клетке — края режутся прямыми гранями
  vec2 uv0 = vUv;
  if (pF.w > 0.) {
    float r = 2. + 4. * pF.w; float d0 = linD(vUv);
    float dd = max(max(abs(linD(vUv + vec2(px.x * r, 0.)) - d0), abs(linD(vUv - vec2(px.x * r, 0.)) - d0)), max(abs(linD(vUv + vec2(0., px.y * r)) - d0), abs(linD(vUv - vec2(0., px.y * r)) - d0)));
    float edge = smoothstep(.05, .15, dd / max(d0, .5));
    vec2 cp = vUv * pfRes / (10. + 14. * pF.w); vec2 ci = floor(cp + pfH22(floor(cp)) * .6);
    vec2 off = (pfH22(ci + 3.1) - .5) * 2.;
    uv0 = vUv + off * px * r * edge;
  }
  vec3 c = vec3(texture2D(tK, uv0 + ab).r, texture2D(tK, uv0).g, texture2D(tK, uv0 - ab).b);
  // кадр удара: резкий сдвиг цвета на 4–6 px, один шаг
  if (pKick > 0.) { vec2 kk = vec2(px.x * 5. * pKick, 0.); c = vec3(texture2D(tK, uv0 + kk).r, c.g, texture2D(tK, uv0 - kk).b); }
  // резкость после Кувахары (Diamond Sharpen): края мазков чёткие
  float zD = texture2D(tDepth, vUv).x; float dD = linD(vUv);
  float tDD = pDD.x * smoothstep(pDD.y, pDD.z, dD) * step(zD, .99995);
  if (pF.z > 0.) {
    float shK = pDD.x > 0. ? (1. + 1.3 * pDD.x * (1. - smoothstep(0., .3, tDD))) * (1. - .7 * tDD) : 1.;
    vec3 nb = texture2D(tK, uv0 + vec2(px.x, 0.)).rgb + texture2D(tK, uv0 - vec2(px.x, 0.)).rgb + texture2D(tK, uv0 + vec2(0., px.y)).rgb + texture2D(tK, uv0 - vec2(0., px.y)).rgb;
    c = max(c * (1. + 4. * pF.z * shK) - nb * pF.z * shK, 0.);
  }
  // набросок по глубине: неровная линия + перелёт (вторая копия сдвинута шумом)
  if (pA.x > 0.) {
    float st = pfStep * pD.x;
    vec2 jit = (vec2(pfNoise(vUv * pfRes / 40. + st), pfNoise(vUv * pfRes / 40. + 9. + st)) - .5) * 2.;
    float e = 0.;
    int nc = int(pE.w);
    for (int k = 0; k < 4; k++) {
      if (k >= nc) break;
      vec2 jk = jit; if (k > 0) jk = (vec2(pfNoise(vUv * pfRes / 55. + float(k) * 3.1 + st), pfNoise(vUv * pfRes / 55. + float(k) * 7.7 + st)) - .5) * 2.;
      vec2 uv = vUv + jk * px * (1.5 + float(k) * pA.y * .7);
      float d = linD(uv);
      float dx = abs(linD(uv + vec2(px.x, 0.)) - linD(uv - vec2(px.x, 0.)));
      float dy = abs(linD(uv + vec2(0., px.y)) - linD(uv - vec2(0., px.y)));
      float ed = smoothstep(.04, .12, (dx + dy) / max(d, .5));
      float press = .5 + .5 * pfNoise(uv * pfRes / 60. + float(k) * 5.);
      e = max(e, ed * press * (k == 0 ? 1. : .55 - float(k) * .08));
    }
    float nearL = pDD.x > 0. ? (1. + 1.2 * pDD.x * (1. - smoothstep(0., .3, tDD))) * (1. - .75 * tDD) : 1.;
    c = mix(c, pLine * .8 + c * .15, min(1., e * pA.x * nearL));
  }
  if (pA.z > 0.) {
    float l = pfLuma(c);
    float lx = pfLuma(texture2D(tK, vUv + vec2(px.x, 0.)).rgb) - pfLuma(texture2D(tK, vUv - vec2(px.x, 0.)).rgb);
    float ly = pfLuma(texture2D(tK, vUv + vec2(0., px.y)).rgb) - pfLuma(texture2D(tK, vUv - vec2(0., px.y)).rgb);
    float e = smoothstep(.06, .2, length(vec2(lx, ly)) / max(l + .15, .15));
    float nearC = pDD.x > 0. ? (1. + 1.4 * pDD.x * (1. - smoothstep(0., .3, tDD))) * (1. - .8 * tDD) : 1.;
    c = mix(c, c * .55, min(1., e * pA.z * nearC));
  }
  // дымка ступенями: каждый план своим тоном, края ступеней неровные (мазком)
  if (pHz.x > 0. && zD < .99995) {
    float hz = clamp(dD / pHz.y, 0., 1.);
    float jit = (pfNoise(vUv * pfRes / 34. + floor(pfStep * pD.x) * .3) - .5) * .5;
    float hs = clamp(floor(hz * pHz.z + .35 + jit) / pHz.z, 0., 1.);
    vec3 hzC = pHazeC + texture2D(tBloom, vUv).rgb * .35;   // воздух светится у огней
    c = mix(c, hzC + c * .25, hs * pHz.x * .85 * (1. - smoothstep(.35, .8, pfLuma(c))));   // огни сквозь дымку видны
  }
  vec4 Lm = texture2D(tLight, vUv);
  float B = Lm.r;
  float ld = Lm.g / max(B, 1e-4) * 100.;            // дальность источника рядом с пикселем
  float pd = linD(vUv);
  float onPlane = smoothstep(ld * .6, ld * .82, pd);  // линии живут на плане источника и за ним; всё, что ближе (персонажи), чистое
  // силуэт против света: всё, что стоит перед ярким проёмом, уходит в тёмное пятно, яркая кромка остаётся
  if (pLL.y > 0.) {
    float halo = smoothstep(.02, .3, B) * (1. - onPlane);
    float keep = smoothstep(.55, .9, pfLuma(c));
    vec3 sil = c * vec3(.36, .33, .3) + vec3(.01, .012, .006);
    c = mix(c, sil, halo * pLL.y * (1. - keep));
  }
  // эскизные линии света: пучок изолиний вокруг ярких мест, рвутся и дрожат шагами
  if (pE.x > 0.) {
    float st = pfStep * pD.x;
    vec2 sp = vUv * vec2(pfRes.x / pfRes.y, 1.);
    // кривизна руки: крупный изгиб + мелкая дрожь, меняются шагами
    float bend = (pfNoise(sp * 2.2 + st * .37) - .5) * 1.5 + (pfNoise(sp * 7. + 4. + st * .61) - .5) * .35;
    float x0 = B * pE.y * 1.6 + bend;
    float ang = atan(vUv.y - .5, (vUv.x - .5) * pfRes.x / pfRes.y);
    // у каждой линии свой изгиб: соседние линии не параллельны, сходятся и расходятся
    float x = x0 + (pfNoise(vec2(ang * 2.6 + floor(x0) * 5.3, floor(x0) * 1.7 + st * .3)) - .5) * .7;
    float lid = floor(x);
    float fw = max(fwidth(x), 1e-4);
    float press = pfNoise(vec2(ang * 5. + lid * 7.1, lid * 1.3 + st * .4));
    float handGap = 1.;
    if (pHandLightN > 0.) {
      // нажим и разрывы — по эскизным линиям Michael (у каждой изолинии свой образец)
      float row = floor(pfH11(lid * 3.7 + floor(st * .25)) * pHandLightN);
      float pv = texture2D(tHandLight, vec2(fract(ang * .32 + lid * .173 + st * .02), (row + .5) / pHandLightN)).r;
      press = pv; handGap = smoothstep(.04, .15, pv);
    }
    float w = fw * (.45 + 1.4 * press);                 // нажим гуляет вдоль линии
    float line = 1. - smoothstep(w, w + fw, abs(fract(x) - .5));
    float x2 = x + .08 + (pfH11(lid * 3.1) - .5) * .06;  // иногда второй штрих рядом, как повтор карандашом
    line = max(line, (1. - smoothstep(w * .7, w * .7 + fw, abs(fract(x2) - .5))) * step(.5, pfH11(lid * 5.7)) * .7);
    float band = smoothstep(.04, .16, B) * (1. - smoothstep(.62, .8, B));
    float brk = pfNoise(vec2(ang * 6. + lid * 3.7, lid + st * .5));
    line *= (pHandLightN > 0. ? handGap : smoothstep(pE.z * .8, pE.z * .8 + .1, brk)) * (.5 + .5 * pfH11(lid * 7.3));
    vec3 lc = mix(pLightLine, c * 1.6 + .1, .25);
    c = mix(c, lc, line * band * onPlane * pE.x);
  }
  // bloom (экран)
  vec3 bl = texture2D(tBloom, vUv).rgb * pB.w;
  bl = max(mix(vec3(pfLuma(bl)), bl, pD.y), 0.);
  // экспозиция и мягкое сжатие света
  c *= pC.w;
  float l;
  if (pF.x > .5) {
    // v2: плечо до белого (1.5 → белый), контраст в sRGB вокруг серого, потом lift/gain; тёмное не проваливается в ноль
    c = c * (1. + c / 2.25) / (1. + c);
    bl = bl / (1. + bl);
    c = 1. - (1. - c) * (1. - bl);
    vec3 sg = pow(max(c, 0.), vec3(1. / 2.2));
    sg = (sg - .42) * pC.z + .42;
    c = pow(max(sg, 0.), vec3(2.2));
    c = mix(pLift, pGain, c);
    l = pfLuma(c);
    c = max(mix(vec3(l), c, mix(pF.y, pC.y, smoothstep(.02, .25, l))), 0.);
  } else {
    c = 1. - exp(-c * 1.15);
    bl = 1. - exp(-bl);
    c = 1. - (1. - c) * (1. - bl);
    // цветокор: lift/gain, насыщенность, контраст
    c = mix(pLift, pGain, c) ;
    l = pfLuma(c);
    c = mix(vec3(l), c, pC.y);
    c = (c - .5) * pC.z + .5;
  }
  // бумага: волокна, плетение, пятна; сильнее на светлом
  if (pA.w > 0.) {
    vec2 pp = vUv * pfRes / (2.2 * pB.x);
    float fib = pfNoise(pp * vec2(.35, 2.2)) * .6 + pfNoise(pp * vec2(1.7, .3) + 7.) * .4;
    float weave = (sin(pp.x * 1.9) * sin(pp.y * 1.9)) * .5 + .5;
    float blot = pfFbm(vUv * vec2(pfRes.x / pfRes.y, 1.) * 3. / pB.x);
    float pap = (fib - .5) * .5 + (weave - .5) * .12 + (blot - .5) * .5;
    c *= 1. + pap * pA.w * .35 * (pF.x > .5 ? smoothstep(.05, .3, l) : 1.);
    c = mix(c, c * pPaper * 1.08, pA.w * .35 * smoothstep(.2, .9, l));
  }
  // зерно (шагами, сильнее в тенях)
  float gr = pfH21(floor(vUv * pfRes / 1.6) + mod(pfStep, 64.) * 13.1) - .5;
  c += gr * pB.y * (1. - .5 * tDD) * (pF.x > .5 ? (.6 + .2 * (1. - l)) : (.5 + .7 * (1. - l))) * (.4 + .6 * smoothstep(.0, .25, l));
  // виньетка
  float v = smoothstep(.85, .2, length(dc * vec2(1., .8)) * 1.25);
  c *= mix(1., v, pC.x * .7);
  gl_FragColor = vec4(toSRGB(clamp(c, 0., 1.)), 1.);
}`;

export function lerpParams(a, b, t) {
  const out = {};
  for (const k in b) {
    if (typeof b[k] === 'number' && typeof a[k] === 'number') out[k] = a[k] + (b[k] - a[k]) * t;
    else if (typeof b[k] === 'string' && b[k][0] === '#' && typeof a[k] === 'string') out[k] = '#' + new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t).getHexString();
    else out[k] = t < 0.5 ? a[k] : b[k];
  }
  return out;
}

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- лужа-слизь
// Плоская лужа (кислотная слизь, вода): мазки бликов вдоль ряби, отражение источника света вытянутой
// полосой к зрителю, тёмная рваная кромка. Мазки кипят шагами вместе со стилем. Лежит в плоскости XZ.
export class PaintedOoze {
  constructor(style, opts = {}) {
    const o = { radius: 1, cDeep: '#1f4a12', cMid: '#5fae22', cHi: '#d8ff7a', cRef: '#f4f6c0', cEdge: '#132408', light: [0, 0, -10], strokes: 1, reflect: 1, ...opts };
    this.uniforms = {
      pfStep: style.u.pfStep, pfTime: style.u.pfTime,
      poDeep: { value: col(o.cDeep) }, poMid: { value: col(o.cMid) }, poHi: { value: col(o.cHi) }, poRef: { value: col(o.cRef) }, poEdge: { value: col(o.cEdge) },
      poLight: { value: new THREE.Vector3(...o.light) }, poK: { value: new THREE.Vector4(o.strokes, o.reflect, 0, 0) },
    };
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(o.radius, 64), new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`varying vec3 vW; varying vec2 vL;
        void main(){ vL = position.xy; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float pfStep, pfTime; uniform vec3 poDeep, poMid, poHi, poRef, poEdge, poLight; uniform vec4 poK;
        varying vec3 vW; varying vec2 vL;
        ${GLSL_NOISE}
        void main(){
          float st = pfStep;
          float r = length(vL);
          float edgeN = (pfNoise(vL * 4. + st * .3) - .5) * .18 + (pfNoise(vL * 13.) - .5) * .06;
          if (r > .97 + edgeN) discard;                                   // рваный край
          vec3 V = normalize(vW - cameraPosition);
          // рябь шагами: нормаль чуть качается
          vec2 q = vW.xz * vec2(1.1, 2.6);
          vec2 wob = (vec2(pfNoise(q + st * .7), pfNoise(q + 5. + st * .7)) - .5) * .25;
          vec3 N = normalize(vec3(wob.x, 1., wob.y));
          vec3 R = reflect(V, N);
          vec3 Ld = normalize(poLight - vW);
          float spec = pow(max(dot(R, Ld), 0.), 18.);
          // отражение источника тянется к зрителю: полоса из горизонтальных мазков
          vec2 sp = vec2(vW.x * 2.2, vW.z * 7.);
          float row = floor(sp.y + pfNoise(sp * .3) * 1.5);
          float dash = smoothstep(.35, .6, pfNoise(vec2(sp.x * .8 + row * 3.1 + st * .9, row)));
          float band = 1. - smoothstep(.12, .42, abs(fract(sp.y) - .5));
          float refl = clamp(spec * 3., 0., 1.) * mix(.35, 1., dash * band) * poK.y;
          // мазки бликов по ряби (как короткие удары кисти)
          vec2 hp = vec2(vW.x * 3.3, vW.z * 9.) + st * vec2(.31, .17);
          float hcell = floor(hp.y);
          float hs = smoothstep(.62, .78, pfNoise(vec2(hp.x * .55 + hcell * 7.3, hcell))) * (1. - smoothstep(.15, .4, abs(fract(hp.y) - .5)));
          float body = pfNoise(vW.xz * 1.4 + 3.) * .6 + .4 * (1. - r);
          vec3 c = mix(poDeep, poMid, smoothstep(.2, .8, body));
          c = mix(c, poHi, hs * .75 * poK.x);
          c = mix(c, poRef * 1.4, refl);
          c = mix(c, poEdge, smoothstep(.7, .97 + edgeN, r) * .85);   // тёмная кромка
          gl_FragColor = vec4(c, 1.);
        }`,
    }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.userData.pfSkip = true;
    this.mesh.receiveShadow = false;
  }
  get light() { return this.uniforms.poLight.value; }
}
