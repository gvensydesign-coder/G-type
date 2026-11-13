// Небо v2 (одобрено 2026-11-11) и его свет в логове + рисованные нормали по материалам. Окно-проверка «как будет в игре».
import * as THREE from 'three';
import { SKY_FRAG, SKY_VERT } from './skyglsl.js';
import { STROKES } from './strokes.js';
import { U as TU } from './lair/toon.js';
import { WORLD } from './matfx.js';
import { PN_PROFILES, pnSetByMaterial } from './pnprofiles.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// цвета суток — те же, что в одобренном небе v2 (из игры, world_light.gd TOD_PNT, линейные)
const TOD = [
  { name: 'Утро', sun: [-0.8, 0.3, 0.35], sunCol: [1.3, .95, .68], top: [.09, .13, .24], mid: [.38, .32, .36], hor: [.8, .5, .32], glow: [1, .72, .48],
    cLit: [.9, .62, .48], cSh: [.3, .26, .36], cDeep: [.12, .12, .2], rim: [1, .8, .6], fog: [.2, .2, .24], belt: [.62, .4, .5], horGlow: [1, .62, .42], night: 0, exp: 1.0, cover: .55, rays: .8, sunI: 2.1, hemi: .55 },
  { name: 'День', sun: [-0.5, 0.75, 0.45], sunCol: [1.25, 1.15, .95], top: [.12, .22, .4], mid: [.36, .46, .56], hor: [.66, .66, .6], glow: [1, .94, .8],
    cLit: [.95, .9, .82], cSh: [.42, .44, .56], cDeep: [.2, .22, .34], rim: [1, .95, .85], fog: [.36, .42, .46], belt: [.6, .55, .62], horGlow: [.9, .82, .62], night: 0, exp: .95, cover: .6, rays: .55, sunI: 2.4, hemi: .7 },
  { name: 'Вечер', sun: [0.8, 0.22, -0.45], sunCol: [1.4, .78, .48], top: [.04, .05, .12], mid: [.3, .14, .16], hor: [.9, .38, .16], glow: [1, .6, .32],
    cLit: [.9, .45, .28], cSh: [.24, .12, .2], cDeep: [.08, .05, .12], rim: [1, .65, .42], fog: [.12, .08, .1], belt: [.55, .25, .4], horGlow: [1, .7, .3], night: 0, exp: 1.1, cover: .6, rays: 1, sunI: 2.0, hemi: .45 },
  { name: 'Ночь', sun: [0.8, -0.35, -0.45], sunCol: [.8, .95, 1.7], top: [.006, .004, .02], mid: [.02, .012, .045], hor: [.07, .035, .1], glow: [.7, .75, 1],
    cLit: [.06, .05, .14], cSh: [.02, .015, .06], cDeep: [.01, .008, .03], rim: [.6, .7, 1], fog: [.018, .012, .035], belt: [.05, .03, .08], horGlow: [.12, .2, .07], night: 1, exp: 3.2, cover: .55, rays: 0, sunI: 1.25, hemi: .35 },
];
const MOON = [0.32, 0.5, -0.8];

function atlasTex() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 4;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  ['light', 'outline', 'smoke', 'hatch'].forEach((cls, row) => {
    (STROKES[cls] || []).slice(0, 4).forEach((drw, col) => {
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      drw.forEach(s => { for (let i = 0; i < s.length; i += 3) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); } });
      const sc = (S - 24) / Math.max(x1 - x0, y1 - y0, .05);
      const ox = col * S + 12 + ((S - 24) - (x1 - x0) * sc) / 2, oy = (3 - row) * S + 12 + ((S - 24) - (y1 - y0) * sc) / 2;
      drw.forEach(s => { for (let i = 3; i < s.length; i += 3) { g.lineWidth = 2 + 7 * (s[i + 2] || .5);
        g.beginPath(); g.moveTo(ox + (s[i - 3] - x0) * sc, oy + (s[i - 2] - y0) * sc); g.lineTo(ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc); g.stroke(); } });
    });
  });
  const t = new THREE.CanvasTexture(cv); t.flipY = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function loopsTex() {
  const S = 256, cv = document.createElement('canvas'); cv.width = S * 4; cv.height = S;
  const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const path = (pts, w0, w1) => { for (let i = 1; i < pts.length; i++) { const t = i / pts.length; g.lineWidth = w0 + (w1 - w0) * Math.sin(t * Math.PI) * (.7 + .3 * rnd()); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } };
  { const p = []; for (let t = 0; t <= 1; t += .004) { const w = t * Math.PI * 2 * 5.5; p.push([14 + t * 228 + 26 * Math.sin(w) + (rnd() - .5) * 2, 128 + 52 * Math.cos(w) * (.8 + .2 * Math.sin(t * 9)) + 18 * Math.sin(t * 4) + (rnd() - .5) * 2]); } path(p, 7, 20); }
  g.translate(S, 0); { for (let k = 0; k < 3; k++) { const p = []; const cx = 128 + (rnd() - .5) * 30, cy = 128 + (rnd() - .5) * 30, R = 70 + rnd() * 40; for (let t = 0; t <= 1.15; t += .006) { const a = t * Math.PI * 2 + k; const r = R * (1 + .12 * Math.sin(a * 3 + k) + (rnd() - .5) * .03); p.push([cx + r * Math.cos(a), cy + r * .8 * Math.sin(a)]); } path(p, 5, 16); } }
  g.translate(S, 0); { const p = []; for (let i = 0; i <= 14; i++) p.push([16 + i * 16 + (rnd() - .5) * 6, i % 2 ? 60 + rnd() * 20 : 190 - rnd() * 20]); path(p, 6, 16); }
  g.translate(S, 0); { for (let k = 0; k < 2; k++) { const p = []; for (let t = 0; t <= 1; t += .004) { const w = t * Math.PI * 2 * 4; p.push([20 + t * 216 + 22 * Math.sin(w + k), 128 + k * 14 + 40 * Math.cos(w + k) + (rnd() - .5) * 2]); } path(p, 4, 12); } }
  const t = new THREE.CanvasTexture(cv); t.flipY = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function pressTex() {
  const W = 256, data = new Uint8Array(W * 4 * 4); const L = STROKES.light || [];
  for (let r = 0; r < 4; r++) {
    const drw = L[r % L.length] || []; const seq = [];
    drw.forEach((s) => { let len = 0; for (let i = 3; i < s.length; i += 3) len += Math.hypot(s[i] - s[i - 3], s[i + 1] - s[i - 2]); seq.push({ s, len: Math.max(len, .02) }); });
    const total = seq.reduce((a, b) => a + b.len + .04, 0) || 1; let pos = 0;
    seq.forEach(({ s, len }) => { const n = s.length / 3; const a = Math.floor(pos / total * W), b = Math.floor((pos + len) / total * W);
      for (let x = a; x < b && x < W; x++) { const k = Math.min(n - 1, Math.floor((x - a) / Math.max(1, b - a) * n)); const p = s[k * 3 + 2] ?? .5; const v = Math.round(255 * Math.min(1, .25 + p)); const o = (r * W + x) * 4; data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255; }
      pos += len + .04; });
  }
  const t = new THREE.DataTexture(data, W, 4); t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

export class GameSkyPN {
  constructor(fight, scene, style, camera) {
    this.f = fight; this.scene = scene; this.style = style; this.camera = camera;
    this.st = { sky: 1, tod: 2, pn: 1, byMat: 1 };
    const S = this.U = {
      uSkyK: { value: 1.25 }, uSun: { value: new THREE.Vector3() }, uMoon: { value: V(MOON).normalize() }, uNight: { value: 0 }, uExp: { value: 1 }, uTime: { value: 0 }, uWind: { value: 1 },
      uCover: { value: .55 }, uRays: { value: 1 }, uRit: { value: 0 },
      uTop: { value: new THREE.Vector3() }, uMid: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector3() },
      uBelt: { value: new THREE.Vector3() }, uHorGlow: { value: new THREE.Vector3() }, uCLit: { value: new THREE.Vector3() }, uCSh: { value: new THREE.Vector3() },
      uCDeep: { value: new THREE.Vector3() }, uRim: { value: new THREE.Vector3() }, uFog: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Vector3() },
      uF0: { value: new THREE.Vector4(1, 1, 1, 1) }, uF1: { value: new THREE.Vector4(1, 1, 1, 1) }, uF2: { value: new THREE.Vector4(1, 1, 1, 1) },
      uF3: { value: new THREE.Vector4(1, 1, 1, 1) }, uF4: { value: new THREE.Vector4(1, 1, 1, 1) }, uF5: { value: new THREE.Vector4(1, 1, 1, 1) },
      uAtlas: { value: atlasTex() }, uLoops: { value: loopsTex() }, uPress: { value: pressTex() },
    };
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 96, 48), new THREE.ShaderMaterial({ uniforms: S, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, extensions: { derivatives: true } }));
    this.mesh.userData.pfSkip = true; this.mesh.renderOrder = -11; this.mesh.frustumCulled = false;
    this.mesh.onBeforeRender = (r, sc, cam) => this.mesh.position.copy(cam.position);
    scene.add(this.mesh);
    // одобренный свет логова — чтобы вернуть его кнопкой «Небо логова»
    const hemi = scene.children.find((o) => o.isHemisphereLight); this.hemi = hemi;
    this.orig = { hemiS: hemi.color.clone(), hemiG: hemi.groundColor.clone(), hemiI: hemi.intensity, moonC: fight.moon.color.clone(), moonI: fight.moon.intensity,
      fog: scene.fog.color.clone(), fogD: scene.fog.density, sunDir: TU.uSunDir.value.clone(), sunCol: TU.uSunCol.value.clone(), shade: TU.uShadeCol.value.clone(),
      tfog: TU.uFogCol.value.clone(), low: TU.uLowCol.value.clone(), rim: TU.uRimCol.value.clone(), wSun: WORLD.uSunW.value.clone(), wSky: WORLD.uSkyC.value.clone(),
      wTop: WORLD.uSkyTop.value.clone(), wHaze: WORLD.uHazeC.value.clone(), cSh: style.u.pfCShadow.value.clone(), cDeep: style.u.pfCDeep.value.clone() };
    // свет луны логова держим своим направлением после update боя
    const upd = fight.update.bind(fight);
    let first = true;
    fight.update = (dt) => { upd(dt); if (first) { first = false; this.apply(); } S.uTime.value += dt; this.placeLight(); };
    this.apply();
  }
  oldSky(vis) { const f = this.f; for (const o of [f.sky?.mesh, f.clouds?.group, f.haze?.group, f.shafts?.group]) if (o) o.visible = vis; }
  placeLight() {
    const m = this.f.moon; const t = m.target.position;
    if (this.st.sky) { const p = TOD[this.st.tod]; const d = V(p.night ? MOON : p.sun).normalize(); m.position.set(t.x + d.x * 45, t.y + d.y * 45, t.z + d.z * 45); }
  }
  apply() {
    const st = this.st, O = this.orig, f = this.f, sc = this.scene, s = this.style.u;
    pnSetByMaterial(!!st.byMat); s.pfPN.value.x = st.pn;
    if (!st.sky) {
      this.mesh.visible = false; this.oldSky(true);
      this.hemi.color.copy(O.hemiS); this.hemi.groundColor.copy(O.hemiG); this.hemi.intensity = O.hemiI; f.moon.color.copy(O.moonC); f.moon.intensity = O.moonI;
      sc.fog.color.copy(O.fog); sc.fog.density = O.fogD; TU.uSunDir.value.copy(O.sunDir); TU.uSunCol.value.copy(O.sunCol); TU.uShadeCol.value.copy(O.shade);
      TU.uFogCol.value.copy(O.tfog); TU.uLowCol.value.copy(O.low); TU.uRimCol.value.copy(O.rim); WORLD.uSunW.value.copy(O.wSun); WORLD.uSkyC.value.copy(O.wSky);
      WORLD.uSkyTop.value.copy(O.wTop); WORLD.uHazeC.value.copy(O.wHaze); s.pfCShadow.value.copy(O.cSh); s.pfCDeep.value.copy(O.cDeep);
      return;
    }
    this.mesh.visible = true; this.oldSky(false);
    const p = TOD[st.tod], U = this.U;
    U.uSun.value.set(...p.sun).normalize();
    for (const [k, u] of [['top', 'uTop'], ['mid', 'uMid'], ['hor', 'uHor'], ['glow', 'uGlow'], ['belt', 'uBelt'], ['horGlow', 'uHorGlow'], ['cLit', 'uCLit'], ['cSh', 'uCSh'], ['cDeep', 'uCDeep'], ['rim', 'uRim'], ['fog', 'uFog'], ['sunCol', 'uSunCol']]) U[u].value.set(...p[k]);
    U.uNight.value = p.night; U.uExp.value = p.exp; U.uCover.value = p.cover; U.uRays.value = p.rays;
    const lc = (a) => new THREE.Color().setRGB(a[0], a[1], a[2]);
    const mx = Math.max(...p.sunCol); const sunC = lc(p.sunCol.map((v) => v / mx));
    const dir = V(p.night ? MOON : p.sun).normalize();
    // солнце (ночью луна) — цвет и направление неба; заливка — середина неба сверху и глубокая тень снизу
    f.moon.color.copy(sunC); f.moon.intensity = p.sunI;
    this.hemi.color.copy(lc(p.mid).multiplyScalar(p.night ? 6 : 1.6)); this.hemi.groundColor.copy(lc(p.cDeep).multiplyScalar(p.night ? 4 : 1)); this.hemi.intensity = p.hemi;
    // туман дальнего плана — из того же градиента, что горизонт неба (слияние)
    const fogC = lc(p.fog).lerp(lc(p.hor), .35).multiplyScalar(p.night ? 3 : 1);
    sc.fog.color.copy(fogC); sc.fog.density = O.fogD;
    TU.uSunDir.value.copy(dir); TU.uSunCol.value.set(sunC.r * p.sunI * .55, sunC.g * p.sunI * .55, sunC.b * p.sunI * .55);
    TU.uShadeCol.value.set(...p.cSh).multiplyScalar(p.night ? 4 : 1.2); TU.uFogCol.value.set(fogC.r, fogC.g, fogC.b);
    TU.uLowCol.value.set(...p.cDeep).multiplyScalar(2); TU.uRimCol.value.set(...p.rim);
    WORLD.uSunW.value.copy(dir); WORLD.uSkyC.value.copy(lc(p.mid)); WORLD.uSkyTop.value.copy(lc(p.top)); WORLD.uHazeC.value.copy(fogC);
    // цветные тени стиля — тени суток игры (cSh/cDeep), ночью приподняты, иначе провал в чёрное
    s.pfCShadow.value.copy(lc(p.cSh).multiplyScalar(p.night ? 4 : 1)); s.pfCDeep.value.copy(lc(p.cDeep).multiplyScalar(p.night ? 4 : 1));
    this.placeLight();
  }
  panel() {
    const d = document.createElement('div');
    const btns = (id, list, key) => `<div class="row" id="${id}">` + list.map((t, i) => `<button data-v="${i}" class="${this.st[key] === i ? 'on' : ''}">${t}</button>`).join('') + '</div>';
    d.innerHTML = '<h2>Как будет в игре</h2><p class="muted" style="margin:0 0 6px">Одобренное логово: наши материалы, постройки, деревья, вода, огонь и герои. Сверху — новое небо v2 и его свет, и рисованные нормали по материалам.</p>' +
      '<h2>Небо и свет</h2>' + btns('gsSky', ['Небо логова (как сейчас)', 'Новое небо v2'], 'sky') +
      '<div style="height:6px"></div>' + btns('gsTod', TOD.map((t) => t.name), 'tod') +
      '<h2>Нормали</h2>' + btns('gsPn', ['Как сейчас (случайный наклон)', 'Рисованные по материалу'], 'pn') +
      '<label class="row" style="margin-top:6px;font-size:12px;gap:6px"><input id="gsByMat" type="checkbox" checked> Свой мазок у каждого материала</label>' +
      '<div class="sl"><span>Сила</span><input id="gsAmt" type="range" min="0" max="1" step="0.01" value="0.9"><output>0.90</output></div>' +
      '<div class="sl"><span>Резкость</span><input id="gsSharp" type="range" min="0" max="1" step="0.01" value="0.45"><output>0.45</output></div>' +
      '<label class="row" style="font-size:12px;gap:6px"><input id="gsBoil" type="checkbox" checked> Кипение мазков 8 к/с</label>' +
      '<p class="muted">Профили: ' + Object.values(PN_PROFILES).filter((p) => p.str > 0).map((p) => p.t).join(', ') + '. Герои чётче всех, зелень и земля почти гладкие; мелкие на экране мазки гаснут, чтобы не рябило.</p>';
    const radio = (id, key) => d.querySelectorAll(`#${id} button`).forEach((b) => b.onclick = () => { this.st[key] = +b.dataset.v; d.querySelectorAll(`#${id} button`).forEach((x) => x.classList.toggle('on', x === b)); if (key === 'tod' && !this.st.sky) { this.st.sky = 1; d.querySelectorAll('#gsSky button').forEach((x) => x.classList.toggle('on', x.dataset.v === '1')); } this.apply(); });
    radio('gsSky', 'sky'); radio('gsTod', 'tod'); radio('gsPn', 'pn');
    d.querySelector('#gsByMat').onchange = (e) => { this.st.byMat = e.target.checked ? 1 : 0; this.apply(); };
    const sl = (id, fn) => { const i = d.querySelector('#' + id), o = i.nextElementSibling; i.oninput = () => { o.textContent = (+i.value).toFixed(2); fn(+i.value); }; };
    sl('gsAmt', (v) => this.style.u.pfPN.value.z = v); sl('gsSharp', (v) => this.style.u.pfPN.value.w = v);
    d.querySelector('#gsBoil').onchange = (e) => this.style.u.pfPN.value.y = e.target.checked ? 1 : 0;
    return d;
  }
}
