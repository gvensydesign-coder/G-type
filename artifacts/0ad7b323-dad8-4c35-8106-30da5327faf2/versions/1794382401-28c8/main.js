import * as THREE from 'three';
import { SKY_FRAG, SKY_VERT, OBJ_FRAG, OBJ_VERT } from './skyglsl.js';
import { STROKES } from './strokes.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// Цвета суток — из игры (world_light.gd TOD_PNT, линейные). Добавлены только производные: пояс Венеры, свечение горизонта, кайма.
const TOD = [
  { name: 'Утро', sun: [-0.8, 0.3, 0.35], sunCol: [1.3, .95, .68], top: [.09, .13, .24], mid: [.38, .32, .36], hor: [.8, .5, .32], glow: [1, .72, .48],
    cLit: [.9, .62, .48], cSh: [.3, .26, .36], cDeep: [.12, .12, .2], rim: [1, .8, .6], fog: [.2, .2, .24], belt: [.62, .4, .5], horGlow: [1, .62, .42], night: 0, exp: 1.0, cover: .55, rays: .8 },
  { name: 'День', sun: [-0.5, 0.75, 0.45], sunCol: [1.25, 1.15, .95], top: [.12, .22, .4], mid: [.36, .46, .56], hor: [.66, .66, .6], glow: [1, .94, .8],
    cLit: [.95, .9, .82], cSh: [.42, .44, .56], cDeep: [.2, .22, .34], rim: [1, .95, .85], fog: [.36, .42, .46], belt: [.6, .55, .62], horGlow: [.9, .82, .62], night: 0, exp: .95, cover: .6, rays: .55 },
  { name: 'Вечер', sun: [0.8, 0.22, -0.45], sunCol: [1.4, .78, .48], top: [.04, .05, .12], mid: [.3, .14, .16], hor: [.9, .38, .16], glow: [1, .6, .32],
    cLit: [.9, .45, .28], cSh: [.24, .12, .2], cDeep: [.08, .05, .12], rim: [1, .65, .42], fog: [.12, .08, .1], belt: [.55, .25, .4], horGlow: [1, .7, .3], night: 0, exp: 1.1, cover: .6, rays: 1 },
  { name: 'Ночь', sun: [0.8, -0.35, -0.45], sunCol: [.8, .95, 1.7], top: [.006, .004, .02], mid: [.02, .012, .045], hor: [.07, .035, .1], glow: [.7, .75, 1],
    cLit: [.06, .05, .14], cSh: [.02, .015, .06], cDeep: [.01, .008, .03], rim: [.6, .7, 1], fog: [.018, .012, .035], belt: [.05, .03, .08], horGlow: [.12, .2, .07], night: 1, exp: 3.2, cover: .55, rays: 0 },
];
const MOON = [0.32, 0.5, -0.8];
const LOCS = {
  vod: { name: 'Логово Водяного', sun: [0.8, -0.35, -0.45], sunCol: [.7, .9, 1.6], top: [.004, .008, .025], mid: [.012, .03, .06], hor: [.04, .09, .12], glow: [.6, .8, 1],
    cLit: [.05, .09, .16], cSh: [.015, .03, .06], cDeep: [.005, .01, .025], rim: [.5, .75, 1], fog: [.02, .04, .06], belt: [.03, .05, .08], horGlow: [.06, .16, .12], night: 1, exp: 3.0, cover: .62, rays: 0 },
  cult: { name: 'Капище', sun: [0.55, 0.32, 0.6], sunCol: [1.3, 1.25, 1.15], top: [.5, .5, .52], mid: [.68, .66, .62], hor: [.84, .8, .72], glow: [1.15, 1.1, 1.0],
    cLit: [.95, .93, .88], cSh: [.55, .53, .52], cDeep: [.3, .28, .3], rim: [1, .98, .92], fog: [.75, .73, .7], belt: [.72, .66, .66], horGlow: [.9, .8, .7], night: 0, exp: .95, cover: .38, rays: 1, noHalftone: true },
};
const LAYERS = [
  ['f0x', 'Градиент от солнца', 'Небо светлеет от светила, а не только снизу вверх; пояс Венеры напротив низкого солнца'],
  ['f3w', 'Кисть', 'Небо из длинных косых мазков: стыки с обрывом цвета, рваный край щетиной, полоски щетины, линии-растр у горизонта'],
  ['f3y', 'Полосы ступенями', 'Градиент 7 ступенями с рваным краем, как мазки'],
  ['f0y', 'Цветовые поля', 'Крупные пятна соседних цветов'],
  ['f0z', 'Мазки', 'Лучами от низкого солнца, почти горизонтально днём'],
  ['f0w', 'Облака', '4 слоя: перистые, дальняя и ближняя гряды, полоса у горизонта'],
  ['f1x', 'Ветер', 'Слои идут с разной скоростью шагами 6/8 к/с'],
  ['f3z', 'Подсветка облаков', 'Кайма к солнцу, серебро у солнца, подчёркивание снизу'],
  ['f1y', 'Края росчерками', 'Края облаков — почеркушки Michael (контур, дым), кипят у трети клеток'],
  ['f1z', 'Штриховка', 'Почеркушки «штриховка» в тени облаков'],
  ['f1w', 'Лучи-линии', 'Длинные линии иксами и шипы у ядра; нажим из почеркушек «свет»'],
  ['f2x', 'Кольца-наброски', 'Рваные круги вокруг солнца и луны'],
  ['f2y', 'Свечение горизонта', 'Полоса дополнительного цвета с рваным верхом'],
  ['f2z', 'Растр', 'Точки только в переходах полос и на краях облаков'],
  ['f2w', 'Слияние горизонта', 'Даль берёт цвет неба в том же направлении, три плана, кайма цвета неба'],
  ['f3x', 'Звёзды', 'Ночью, мигают шагами'],
  ['f5w', 'Переходы штрихом', 'Края облаков размыты масками: дальняя гряда и перистые — маркером, ближняя — пером, у горизонта — тушью'],
  ['f5y', 'Солнце почеркушками', 'Ореолы ступенями с рваным краем, ядро с брызгами и шипами; край проходит через почеркушки «свет», «дым», «штриховка»'],
  ['f5z', 'Луна почеркушками', 'Край луны рвётся петлями «контура» и «дыма» в обе стороны, кратеры каракулями, тёплое кольцо из петель'],
  ['f4x', 'Лёгкий шум', 'Зерно кадра шагом 8 к/с и пятна «бумаги», ±3–4% тона, на небе и на предметах'],
  ['f4y', 'Петли в облаках', 'Почеркушки «дым» и «контур» внутри облаков (как в TMNT): в тени темнее, на свету светлее'],
  ['f5x', 'Подчёркивание облаков', 'Росчерк дополнительного цвета по низу облаков: зелёный ночью, тёплый вечером'],
  ['f4z', 'Свободные росчерки', 'Редкие почеркушки «свет» и «штриховка» по чистому небу вдоль мазков'],
  ['f4w', 'Карандашные царапины', 'Короткие тонкие косые штрихи светлее и темнее, треть меняется шагом 6 к/с'],
];
const flags = Object.fromEntries(LAYERS.map(l => [l[0], 1]));

// ---------- атлас почеркушек Michael
function buildAtlas() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  ['light', 'outline', 'smoke', 'hatch'].forEach((cls, row) => {
    (STROKES[cls] || []).slice(0, 4).forEach((drw, col) => {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      drw.forEach(s => { for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
      const sc = (S - 24) / Math.max(x1 - x0, y1 - y0, .05);
      const ox = col * S + 12 + ((S - 24) - (x1 - x0) * sc) / 2, oy = (3 - row) * S + 12 + ((S - 24) - (y1 - y0) * sc) / 2;
      drw.forEach(s => { for (let i = 3; i < s.length; i += 3) {
        g.lineWidth = 2 + 7 * (s[i + 2] || .5);
        g.beginPath(); g.moveTo(ox + (s[i - 3] - x0) * sc, oy + (s[i - 2] - y0) * sc); g.lineTo(ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc); g.stroke(); } });
    });
  });
  const t = new THREE.CanvasTexture(cv); t.flipY = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// петли и каракули (ref5 TMNT): в почеркушках Michael петель нет, поэтому набор рисуется здесь рукой-алгоритмом:
// 0 — петли вдоль строки, 1 — клубок кругов, 2 — зигзаг-штриховка, 3 — тонкие двойные петли; нажим и дрожь от строки к строке
function buildLoops() {
  const S = 256, cv = document.createElement('canvas'); cv.width = S * 4; cv.height = S;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const path = (pts, w0, w1) => { for (let i = 1; i < pts.length; i++) { const t = i / pts.length; g.lineWidth = w0 + (w1 - w0) * Math.sin(t * Math.PI) * (.7 + .3 * rnd()); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } };
  // 0 петли
  { const p = []; for (let t = 0; t <= 1; t += .004) { const w = t * Math.PI * 2 * 5.5; p.push([14 + t * 228 + 26 * Math.sin(w) + (rnd() - .5) * 2, 128 + 52 * Math.cos(w) * (.8 + .2 * Math.sin(t * 9)) + 18 * Math.sin(t * 4) + (rnd() - .5) * 2]); } path(p, 7, 20); }
  // 1 клубок
  { for (let k = 0; k < 3; k++) { const p = []; const cx = 128 + (rnd() - .5) * 30, cy = 128 + (rnd() - .5) * 30, R = 70 + rnd() * 40; for (let t = 0; t <= 1.15; t += .006) { const a = t * Math.PI * 2 + k; const r = R * (1 + .12 * Math.sin(a * 3 + k) + (rnd() - .5) * .03); p.push([cx + r * Math.cos(a), cy + r * .8 * Math.sin(a)]); } path(p, 5, 16); } }
  // 2 зигзаг
  { const p = []; for (let i = 0; i <= 14; i++) p.push([16 + i * 16 + (rnd() - .5) * 6, i % 2 ? 60 + rnd() * 20 : 190 - rnd() * 20]); path(p, 6, 16); }
  // 3 двойные тонкие петли
  { for (let k = 0; k < 2; k++) { const p = []; for (let t = 0; t <= 1; t += .004) { const w = t * Math.PI * 2 * 4; p.push([20 + t * 216 + 22 * Math.sin(w + k), 128 + k * 14 + 40 * Math.cos(w + k) + (rnd() - .5) * 2]); } path(p, 4, 12); } }
  const t = new THREE.CanvasTexture(cv); t.flipY = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// нажим вдоль линии: росчерки «свет» выпрямлены (длина по дуге, нажим, разрывы между штрихами)
function buildPress() {
  const W = 256, data = new Uint8Array(W * 4 * 4);
  const L = STROKES.light || [];
  for (let r = 0; r < 4; r++) {
    const drw = L[r % L.length] || [];
    const seq = [];
    drw.forEach((s, si) => { let len = 0; for (let i = 3; i < s.length; i += 3) len += Math.hypot(s[i] - s[i - 3], s[i + 1] - s[i - 2]); seq.push({ s, len: Math.max(len, .02) }); });
    const total = seq.reduce((a, b) => a + b.len + .04, 0) || 1;
    let pos = 0;
    seq.forEach(({ s, len }) => {
      const n = s.length / 3;
      const a = Math.floor(pos / total * W), b = Math.floor((pos + len) / total * W);
      for (let x = a; x < b && x < W; x++) { const k = Math.min(n - 1, Math.floor((x - a) / Math.max(1, b - a) * n)); const p = s[k * 3 + 2] ?? .5; const v = Math.round(255 * Math.min(1, .25 + p));
        const o = (r * W + x) * 4; data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255; }
      pos += len + .04;
    });
  }
  const t = new THREE.DataTexture(data, W, 4); t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

// ---------- сцена
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .5, 4000);
camera.position.set(0, 2.2, 0);

const U = {
  uSun: { value: new THREE.Vector3() }, uMoon: { value: V(MOON).normalize() }, uNight: { value: 0 }, uExp: { value: 1 }, uTime: { value: 0 }, uWind: { value: 1 },
  uCover: { value: .55 }, uRays: { value: 1 }, uRit: { value: 0 },
  uTop: { value: new THREE.Vector3() }, uMid: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() },
  uBelt: { value: new THREE.Vector3() }, uHorGlow: { value: new THREE.Vector3() }, uCLit: { value: new THREE.Vector3() }, uCSh: { value: new THREE.Vector3() },
  uCDeep: { value: new THREE.Vector3() }, uRim: { value: new THREE.Vector3() }, uFog: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Vector3() },
  uF0: { value: new THREE.Vector4() }, uF1: { value: new THREE.Vector4() }, uF2: { value: new THREE.Vector4() }, uF3: { value: new THREE.Vector4() }, uF4: { value: new THREE.Vector4() }, uF5: { value: new THREE.Vector4() },
  uAtlas: { value: buildAtlas() }, uLoops: { value: buildLoops() }, uPress: { value: buildPress() },
};
const skyMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, extensions: { derivatives: true } });
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 96, 48), skyMat);
sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);

const objMat = (base) => new THREE.ShaderMaterial({ uniforms: { ...U, uBase: { value: V(base) } }, vertexShader: OBJ_VERT, fragmentShader: OBJ_FRAG });
const mGround = objMat([.09, .14, .07]), mTree = objMat([.06, .11, .06]), mTrunk = objMat([.12, .08, .05]), mHut = objMat([.24, .16, .1]), mRoof = objMat([.16, .12, .08]), mHill = objMat([.08, .12, .08]);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1800, 64), mGround); ground.rotation.x = -Math.PI / 2; scene.add(ground);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cone = new THREE.ConeGeometry(1, 1, 7), cyl = new THREE.CylinderGeometry(.12, .16, 1, 6), box = new THREE.BoxGeometry(1, 1, 1);
const roofG = new THREE.CylinderGeometry(.75, .75, 1, 3); roofG.rotateZ(Math.PI / 2);
function tree(x, z, h) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(cyl, mTrunk); t.scale.set(h * .1, h * .3, h * .1); t.position.y = h * .15; g.add(t);
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(cone, mTree); const s = h * (.42 - i * .1); c.scale.set(s, h * .42, s); c.position.y = h * (.32 + i * .22); g.add(c); }
  g.position.set(x, 0, z); scene.add(g);
}
function hut(x, z, s, ry) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(box, mHut); b.scale.set(4 * s, 2.6 * s, 3.2 * s); b.position.y = 1.3 * s; g.add(b);
  const r = new THREE.Mesh(roofG, mRoof); r.scale.set(4.6 * s, 2.4 * s, 3.4 * s); r.position.y = 2.6 * s + .8 * s; g.add(r);
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
}
// планы: ближний 25–45 м, средний 80–130, дальний 180–260, даль 320–600 (лес и холмы)
for (let i = 0; i < 60; i++) { const a = rnd() * 6.283, r = 25 + rnd() * 20; if (rnd() < .3) hut(Math.cos(a) * r, Math.sin(a) * r, 1, rnd() * 3); else tree(Math.cos(a) * r, Math.sin(a) * r, 7 + rnd() * 6); }
for (let i = 0; i < 110; i++) { const a = rnd() * 6.283, r = 80 + rnd() * 50; if (rnd() < .2) hut(Math.cos(a) * r, Math.sin(a) * r, 1.4, rnd() * 3); else tree(Math.cos(a) * r, Math.sin(a) * r, 12 + rnd() * 10); }
for (let i = 0; i < 160; i++) { const a = rnd() * 6.283, r = 180 + rnd() * 80; tree(Math.cos(a) * r, Math.sin(a) * r, 18 + rnd() * 14); }
for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283 + rnd() * .2, r = 380 + rnd() * 220; const h = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, 6.283, 0, Math.PI / 2), mHill); h.scale.set(60 + rnd() * 80, 18 + rnd() * 30, 50 + rnd() * 60); h.position.set(Math.cos(a) * r, -2, Math.sin(a) * r); scene.add(h); }

// ---------- состояние и интерфейс
const st = { loc: 'village', tod: 2.0, wind: 1, auto: true, yaw: 0, pitch: .12, rit: false };
const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function preset() {
  if (st.loc !== 'village') return LOCS[st.loc];
  const t = Math.round(st.tod * 12) / 12;   // смена суток 12 ступенями между ключами
  const i = Math.min(2, Math.floor(t)), f = t - i;
  const a = TOD[i], b = TOD[i + 1], o = {};
  for (const k in a) o[k] = Array.isArray(a[k]) ? lerp3(a[k], b[k], f) : (typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * f : a[k]);
  o.night = f > .5 && i === 2 ? (f - .5) * 2 : (i === 3 ? 1 : 0);
  o.night = i === 2 ? Math.max(0, (f - .6) / .4) : o.night;
  return o;
}
function apply() {
  const p = preset();
  U.uSun.value.set(...p.sun).normalize();
  for (const [k, u] of [['top', 'uTop'], ['mid', 'uMid'], ['hor', 'uHor'], ['glow', 'uGlow'], ['belt', 'uBelt'], ['horGlow', 'uHorGlow'], ['cLit', 'uCLit'], ['cSh', 'uCSh'], ['cDeep', 'uCDeep'], ['rim', 'uRim'], ['fog', 'uFog'], ['sunCol', 'uSunCol']]) U[u].value.set(...p[k]);
  U.uNight.value = p.night; U.uExp.value = p.exp; U.uCover.value = p.cover; U.uRays.value = p.rays; U.uWind.value = st.wind;
  const F = (k) => flags[k] ? 1 : 0;
  U.uF0.value.set(F('f0x'), F('f0y'), F('f0z'), F('f0w'));
  U.uF1.value.set(F('f1x'), F('f1y'), F('f1z'), F('f1w'));
  U.uF2.value.set(F('f2x'), F('f2y'), p.noHalftone ? 0 : F('f2z'), F('f2w'));
  U.uF3.value.set(F('f3x'), F('f3y'), F('f3z'), F('f3w'));
  U.uF4.value.set(F('f4x'), F('f4y'), F('f4z'), F('f4w'));
  U.uF5.value.set(F('f5x'), F('f5y'), F('f5z'), F('f5w'));
  document.getElementById('todName').textContent = st.loc === 'village' ? (TOD[Math.round(st.tod)]?.name ?? '') : p.name;
}
const scenesEl = document.getElementById('scenes');
[['village', 'Деревня'], ['vod', 'Логово Водяного'], ['cult', 'Капище']].forEach(([id, ru]) => {
  const b = document.createElement('button'); b.textContent = ru; b.dataset.id = id;
  b.onclick = () => { st.loc = id; [...scenesEl.children].forEach(c => c.classList.toggle('on', c.dataset.id === id)); document.getElementById('todRow').style.display = id === 'village' ? '' : 'none'; document.getElementById('ritRow').style.display = id === 'cult' ? '' : 'none'; faceSun(); apply(); };
  scenesEl.appendChild(b);
});
scenesEl.children[0].classList.add('on');
const todIn = document.getElementById('tod'); todIn.value = st.tod;
todIn.oninput = () => { st.tod = +todIn.value; apply(); };
document.querySelectorAll('[data-tod]').forEach(b => b.onclick = () => { st.tod = +b.dataset.tod; todIn.value = st.tod; faceSun(); apply(); });
const windIn = document.getElementById('wind'); windIn.oninput = () => { st.wind = +windIn.value; document.getElementById('windOut').textContent = st.wind.toFixed(1); apply(); };
document.getElementById('rit').onchange = (e) => { st.rit = e.target.checked; };
const layEl = document.getElementById('layers');
LAYERS.forEach(([k, ru, tip]) => {
  const l = document.createElement('label'); l.title = tip; l.innerHTML = `<input type="checkbox" checked> ${ru}`;
  l.querySelector('input').onchange = (e) => { flags[k] = e.target.checked; apply(); };
  layEl.appendChild(l);
});
document.getElementById('allOn').onclick = () => { layEl.querySelectorAll('input').forEach((i, n) => { i.checked = true; flags[LAYERS[n][0]] = 1; }); apply(); };
document.getElementById('allOff').onclick = () => { layEl.querySelectorAll('input').forEach((i, n) => { i.checked = false; flags[LAYERS[n][0]] = 0; }); apply(); };
const autoB = document.getElementById('auto');
autoB.onclick = () => { st.auto = !st.auto; autoB.classList.toggle('on', st.auto); };
autoB.classList.add('on');
function faceSun() { const p = preset(); const s = p.night ? MOON : p.sun; st.yaw = Math.atan2(s[0], -s[2]); st.pitch = Math.min(.42, Math.max(.1, Math.asin(Math.min(1, s[1] / Math.hypot(s[0], s[1], s[2]))) * .8)); }
document.getElementById('face').onclick = faceSun;
document.getElementById('back').onclick = () => { st.yaw += Math.PI; };
addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') st.yaw -= .08; if (e.key === 'ArrowRight') st.yaw += .08;
  if (e.key === 'ArrowUp') st.pitch = Math.min(1.2, st.pitch + .05); if (e.key === 'ArrowDown') st.pitch = Math.max(-.2, st.pitch - .05);
});
document.getElementById('toggle').onclick = () => document.getElementById('panel').classList.toggle('hide');

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
faceSun(); apply();
document.getElementById('loading').remove();

let last = performance.now(), fpsAcc = 0, fpsN = 0, ritK = 0;
window.__sky = { st, apply, faceSun, U, flags, frames: 0 };
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  U.uTime.value += dt;
  if (st.auto) st.yaw += dt * .05;
  ritK += ((st.rit && st.loc === 'cult' ? 1 : 0) - ritK) * Math.min(1, dt * 1.5); U.uRit.value = ritK;
  camera.rotation.set(0, 0, 0); camera.rotateY(-st.yaw); camera.rotateX(st.pitch);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > .5) { document.getElementById('fps').textContent = Math.round(fpsN / fpsAcc) + ' к/с'; fpsAcc = 0; fpsN = 0; }
  window.__sky.frames++;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
