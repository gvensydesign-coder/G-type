// Демо механики стройки «Межевое»: сцена, камера, интерфейс, стартовая деревня.
import * as THREE from 'three';
import { MapGrid, OuterTerrain } from './mapgrid.js';
import { G, InkPost, ShadowPass, makeToonMaterial } from './toon.js';
import { buildTerrain, buildOuter, buildWater, buildSky } from './terrain.js';
import { Vegetation, PLANTS, PLANT_IDS } from './vegetation.js';
import { FX } from './fx.js';
import { BuildSystem, RES_NAMES, ROT_NAMES, SECTOR } from './buildsys.js';
import { Forest } from './forest.js';
import { supportCheck, makeSupportOverlay } from './inspect.js';
import { BUILDINGS, BY_ID, CATEGORIES, TIERS, buildGeometry } from './buildings.js';

const $ = (id) => document.getElementById(id);
const STAGES = ['Разметка', 'Основание', 'Стены', 'Кровля', 'Готово'];
const TEST = location.search.includes('test');

// ---------- освещение ----------
const TOD = {
  // lightK — сила огней окон и костров (на 30% мягче, чем было); cloud — тени облаков; wind — [x, z, сила]
  morning: { sun: [0.85, 0.3, -0.35], sunCol: [1.0, 0.8, 0.62], shade: [0.44, 0.41, 0.66], deep: [0.2, 0.17, 0.36], sky: [0.74, 0.7, 0.82], fog: [0.7, 0.64, 0.7], night: 0.15, near: 80, far: 560, mist: 0.65, lightK: 0.175, gain: 1.6, vign: 0.5, desat: 0, sat: 1.2, bounce: [0.6, 0.45, 0.2], ink: [0.03, 0.02, 0.03], cloud: 0.2, wind: [0.8, 0.35, 0.7] },
  day:     { sun: [0.4, 0.85, 0.35], sunCol: [1.0, 0.95, 0.84], shade: [0.34, 0.46, 0.74], deep: [0.14, 0.2, 0.42], sky: [0.6, 0.76, 0.86], fog: [0.62, 0.72, 0.78], night: 0.0, near: 180, far: 1050, mist: 0.0, lightK: 0.056, gain: 1.4, vign: 0.45, desat: 0, sat: 1.12, bounce: [0.5, 0.48, 0.2], ink: [0.02, 0.014, 0.018], cloud: 0.26, wind: [0.8, 0.35, 1.0] },
  night:   { sun: [-0.45, 0.55, 0.6], sunCol: [0.26, 0.32, 0.48], shade: [0.08, 0.09, 0.2], deep: [0.03, 0.03, 0.08], sky: [0.035, 0.05, 0.08], fog: [0.035, 0.048, 0.065], night: 1, near: 35, far: 300, mist: 0.6, lightK: 0.875, gain: 1.4, vign: 1.25, desat: 0, sat: 0.75, bounce: [0.1, 0.08, 0.05], ink: [0.0, 0.0, 0.0], cloud: 0.0, wind: [0.6, 0.5, 0.55] },
};
let tod = 'morning';
function applyTod(name) {
  const t = TOD[name]; tod = name;
  G.uSunDir.value.set(...t.sun).normalize(); G.uSunCol.value.setRGB(...t.sunCol); G.uShadeCol.value.setRGB(...t.shade);
  G.uDeepCol.value.setRGB(...t.deep); G.uSkyCol.value.setRGB(...t.sky); G.uFogCol.value.setRGB(...t.fog);
  G.uNight.value = t.night; G.uFogNear.value = t.near; G.uFogFar.value = t.far;
  G.uMist.value = t.mist; G.uBounce.value.setRGB(...t.bounce); G.uLightK.value = t.lightK; G.uFormGain.value = t.gain;
  G.uCloud.value = t.cloud; G.uWind.value.set(...t.wind);
  if (typeof post !== 'undefined') { const u = post.quad.material.uniforms; u.uVign.value = t.vign; u.uDesat.value = t.desat; u.uSat.value = t.sat; u.uPN.value = t.near * 0.9; u.uPF.value = t.near * 0.9 + 170; u.uInk.value.setRGB(...t.ink); }
  document.querySelectorAll('[data-tod]').forEach(b => b.classList.toggle('on', b.dataset.tod === name));
}

// ---------- старт ----------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
renderer.setClearColor(0x000000, 0);
renderer.autoClear = true;
const PX_MAX = Math.min(window.devicePixelRatio || 1, 1.5);
let PX = PX_MAX;
const post = new InkPost(renderer);
const shadow = new ShadowPass(2048);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 6000);
camera.layers.enableAll();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(PX); renderer.setSize(w, h, false);
  post.setSize(w, h, PX);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const msg = (t) => { $('loadmsg').textContent = t; };
await document.fonts.load('400 20px "Ruslan Display"').catch(() => {});
msg('Читаем межевую карту…');
const [map, outer] = await Promise.all([MapGrid.load('./data/village-map.json'), OuterTerrain.load('./data/village-outer.json').catch(() => null)]);
const mapRect = { x0: map.origin.x, z0: map.origin.z, x1: map.origin.x + map.width, z1: map.origin.z + map.height };
applyTod('morning');

const terrain = buildTerrain(map); scene.add(terrain);
if (outer) scene.add(buildOuter(outer, mapRect));
// остров с горящей башней: у его берегов прибивает мусор
const isleLm = map.landmarks.find(l => /Остров/.test(l.name));
scene.add(buildWater(6000, map.waterLevel, map, isleLm ? { x: map.origin.x + isleLm.x, z: map.origin.z + isleLm.z, r: 18 } : null));
const sky = buildSky(); scene.add(sky);
const fx = new FX(scene);
const sys = new BuildSystem({ map, scene, fx });
const forest = new Forest(sys, scene); sys.forest = forest;
const veg = new Vegetation(scene, map, sys);
forest.onCleared = (x0, z0, w, d) => { veg.removeOnTrees(x0, z0, w, d); veg.update(); };
// земляные работы под постройкой: пересчитать землю, деревья и растения в этом месте
sys.onTerrain = (x0, z0, x1, z1) => {
  terrain.userData.update(x0, z0, x1, z1);
  const s0x = Math.max(0, Math.floor(x0 / SECTOR)), s1x = Math.min(sys.SX - 1, Math.floor(x1 / SECTOR)), s0z = Math.max(0, Math.floor(z0 / SECTOR)), s1z = Math.min(sys.SZ - 1, Math.floor(z1 / SECTOR));
  if (forest.trees.size) for (let a = s0x; a <= s1x; a++) for (let b = s0z; b <= s1z; b++) forest.rebuildChunk(a, b);
  veg.clearCells(x0, z0, x1, z1); veg.update();
};

// ---------- стартовая деревня ----------
const START_OWNED = []; for (let sz = 5; sz <= 7; sz++) for (let sx = 2; sx <= 4; sx++) START_OWNED.push(sx + ',' + sz);
function tryPlace(id, cx, cz, o = {}) {
  const def = BY_ID[id];
  const r0 = o.rot ?? 0;
  // сначала заданный поворот, потом остальные; радиус поиска растёт
  for (const R of [9, 16]) for (const rot of [r0, (r0 + 2) % 4, (r0 + 1) % 4, (r0 + 3) % 4]) {
    const [w, d] = sys.footprint(def, rot, o.size);
    for (let r = 0; r < R; r++) for (let a = 0; a < Math.max(1, r * 8); a++) {
      const ang = a / Math.max(1, r * 8) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(ang) * r), z = Math.round(cz + Math.sin(ang) * r);
      const x0 = x - Math.floor(w / 2), z0 = z - Math.floor(d / 2);
      const ck = sys.checkRect(def, x0, z0, w, d);
      // o.slope: на холме разрешаем несколько клеток откоса — подсыпка выровняет площадку
      const ok = ck.ok || (o.slope && [...ck.reasons].every(t => t === 'крутой склон') && ck.cells.filter(q => q.s === 2).length <= o.slope);
      if (ok) return sys.add(id, { x0, z0, rot, v: o.v ?? 0, ab: o.ab, stage: o.stage ?? 4, size: o.size });
    }
  }
  console.warn('не встало', id, cx, cz); return null;
}
function seedWorld() {
  sys.free = true;
  sys.owned = new Set(START_OWNED);
  // живая часть деревни у торга
  tryPlace('ryady', 100, 193, { rot: 0, v: 0 });
  tryPlace('izba', 118, 186, { rot: 1, v: 0 });
  tryPlace('izba', 86, 203, { rot: 0, v: 2 });
  tryPlace('pyatistenok', 132, 206, { rot: 3, v: 3 });
  tryPlace('kolodec', 111, 202);
  tryPlace('izba', 142, 188, { rot: 1, v: 1, stage: 2.35 });
  tryPlace('chasovnya', 122, 172, { rot: 0, v: 0 });
  tryPlace('sklad', 74, 186, { rot: 1 });
  tryPlace('ogorod', 92, 216, { size: [10, 7] });
  // заброшенное
  tryPlace('izba', 76, 224, { rot: 0, ab: true, v: 1 });
  tryPlace('ambar', 94, 230, { rot: 0, ab: true });
  tryPlace('banya', 136, 168, { rot: 2, ab: true });
  tryPlace('zhalnik', 152, 220, { ab: true });
  tryPlace('kuznya', 150, 198, { rot: 3, ab: true });
  // у ворот: тотемы и знак, как на картине
  tryPlace('totem', 121, 236, { v: 0 });
  tryPlace('totem', 135, 236, { v: 3, ab: true });
  tryPlace('znak', 138, 241, { rot: 0 });
  sys.add('chastokol', { a: { cx: 112, cz: 232 }, b: { cx: 123, cz: 232 }, stage: 4 });
  sys.add('chastokol', { a: { cx: 134, cz: 232 }, b: { cx: 150, cz: 230 }, stage: 4, ab: true });
  // за межой: церковь на холме, колокольня, терем — заброшены; на острове капище живо
  forest.clearRect(80, 52, 30, 24); // поляна под церковью на холме
  tryPlace('cerkov', 94, 63, { rot: 1, ab: true, v: 2, slope: 16 });
  tryPlace('kolokolnya', 98, 75, { ab: true });
  tryPlace('terem', 62, 100, { rot: 1, ab: true, v: 2 });
  tryPlace('kapishe', 224, 50, {});
  tryPlace('totem', 214, 44, { v: 2 });
  tryPlace('krug', 40, 40, { ab: true });
  tryPlace('kurgan', 40, 150, {});
  sys.free = false;
  sys.res = { silver: 220, wood: 160, stone: 40 };
  forest.plant(7, [{ x: 112, z: 200, r: 48 }, { x: 94, z: 68, r: 22 }, { x: 140, z: 290, r: 10 }, { x: 150, z: 330, r: 8 }]);
  sys._updateOwnTex(); sys.economy(); sys.newCards.clear();
}

// ---------- камера ----------
const cam = { x: map.origin.x + 112, z: map.origin.z + 205, y: 0, yaw: 0.35, yawT: 0.35, dist: 75, distT: 75, pitch: 0.62, pitchT: 0.62, orbit: false };
const keys = new Set();
const insp = { it: null, saved: null, tod: null, overlay: null };   // режим осмотра постройки
function updateCamera(dt) {
  const sp = cam.dist * 0.9 * dt;
  const fx_ = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let mx = 0, mz = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) { mx += fx_; mz += fz; }
  if (keys.has('KeyS') || keys.has('ArrowDown')) { mx -= fx_; mz -= fz; }
  if (keys.has('KeyD') || keys.has('ArrowRight')) { mx += rx; mz += rz; }
  if (keys.has('KeyA') || keys.has('ArrowLeft')) { mx -= rx; mz -= rz; }
  cam.x += mx * sp; cam.z += mz * sp;
  cam.x = Math.max(mapRect.x0, Math.min(mapRect.x1, cam.x)); cam.z = Math.max(mapRect.z0, Math.min(mapRect.z1, cam.z));
  if (keys.has('KeyQ')) cam.yawT += dt * 1.6;
  if (keys.has('KeyE')) cam.yawT -= dt * 1.6;
  if (keys.has('KeyZ')) cam.pitchT += dt * 0.9;
  if (keys.has('KeyX')) cam.pitchT -= dt * 0.9;
  if (cam.orbit) cam.yawT += dt * (insp.it ? 0.22 : 0.12);
  cam.pitchT = Math.max(0.12, Math.min(1.45, cam.pitchT));
  const k = 1 - Math.exp(-dt * 8);
  cam.yaw += (cam.yawT - cam.yaw) * k; cam.dist += (cam.distT - cam.dist) * k; cam.pitch += (cam.pitchT - cam.pitch) * k;
  cam.y += (Math.max(map.waterLevel, map.heightAt(cam.x, cam.z)) - cam.y) * (1 - Math.exp(-dt * 4));
  const pitch = cam.pitch;
  camera.position.set(cam.x + Math.sin(cam.yaw) * Math.cos(pitch) * cam.dist, cam.y + Math.sin(pitch) * cam.dist, cam.z + Math.cos(cam.yaw) * Math.cos(pitch) * cam.dist);
  camera.lookAt(cam.x, cam.y + 1.5, cam.z);
  const minY = map.heightAt(camera.position.x, camera.position.z) + 2;
  if (camera.position.y < minY) camera.position.y = minY;
  sky.position.copy(camera.position);
  forest.update(cam);   // подробные деревья вокруг точки, куда смотрит камера
}

// ---------- луч в землю ----------
const ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
function groundAt(clientX, clientY) {
  ndc.set(clientX / window.innerWidth * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let t = 0, prev = 0;
  const below = (t) => { const x = o.x + d.x * t, z = o.z + d.z * t; return o.y + d.y * t < Math.max(map.heightAt(x, z), map.waterLevel - 0.3); };
  while (t < 2500) { const step = Math.max(0.4, t * 0.012); prev = t; t += step; if (below(t)) break; }
  if (t >= 2500) return null;
  let a = prev, b = t;
  for (let i = 0; i < 18; i++) { const m = (a + b) / 2; if (below(m)) b = m; else a = m; }
  const p = new THREE.Vector3().copy(o).addScaledVector(d, b);
  return p;
}
function pickItem(clientX, clientY) {
  ndc.set(clientX / window.innerWidth * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera); ray.layers.set(0);
  const hits = ray.intersectObjects(sys.group.children, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.item) o = o.parent; if (o?.userData.item) return o.userData.item; }
  const p = groundAt(clientX, clientY); if (!p) return null;
  const c = map.worldToCell(p.x, p.z); return sys.itemAtCell(c.cx, c.cz);
}

// ---------- миниатюры для карточек ----------
const thumbs = {};
function makeThumbs() {
  const W = 180, H = 150;
  const tp = new InkPost(renderer); tp.setSize(W, H, 1);
  tp.quad.material.uniforms.uGrain.value = 0.6;
  const out = new THREE.WebGLRenderTarget(W, H);
  const ts = new THREE.Scene(), tc = new THREE.PerspectiveCamera(30, W / H, 0.5, 500); tc.layers.enableAll();
  const buf = new Uint8Array(W * H * 4), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d'), img = g2.createImageData(W, H);
  const thumbMat = makeToonMaterial({ stage: 4 });
  const keepTod = tod; applyTod('day'); G.uPLn.value = 0; G.uFogNear.value = 1e4; G.uFogFar.value = 2e4; G.uShadowOn.value = 0;
  renderer.setClearColor(0xcfc2a2, 1);
  for (const def of BUILDINGS) {
    const size = def.line ? [6, def.size[1]] : def.area ? def.size : def.size;
    const { geometry } = buildGeometry(def, { v: 0, size, seed: 2 });
    const m = new THREE.Mesh(geometry, thumbMat);
    ts.add(m);
    geometry.computeBoundingSphere();
    const bs = geometry.boundingSphere, r = Math.max(bs.radius, 1.5);
    tc.position.set(bs.center.x + r * 1.55, bs.center.y + r * 1.25, bs.center.z + r * 2.6);
    tc.lookAt(bs.center.x, bs.center.y * 0.85, bs.center.z);
    tp.render(ts, tc, out);
    renderer.readRenderTargetPixels(out, 0, 0, W, H, buf);
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    g2.putImageData(img, 0, 0);
    thumbs[def.id] = cv.toDataURL('image/png');
    ts.remove(m); geometry.dispose();
  }
  // растения: гнездо из нескольких кустиков
  for (const id of PLANT_IDS) {
    const K = veg.kinds[id], P = PLANTS[id], n = P.type === 7 ? 4 : 9;
    const geo = K.mesh.geometry.clone(), arr = geo.attributes.iVar.array;
    const im = new THREE.InstancedMesh(geo, K.mesh.material, n), M = new THREE.Matrix4();
    const sc = (P.s[0] + P.s[1]) / 2;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = i === 0 ? 0 : sc * (0.45 + 0.3 * (i % 3));
      M.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a * 1.7, 0)), new THREE.Vector3().setScalar(sc * (0.8 + 0.3 * ((i * 7) % 5) / 5)));
      im.setMatrixAt(i, M); arr[i * 4] = i * 0.137 + 0.1; arr[i * 4 + 1] = ((i * 5) % 7) / 7 - 0.5; arr[i * 4 + 2] = ((i * 3) % 4) / 4 + 0.1;
    }
    ts.add(im);
    const R = sc * 1.6, hgt = P.type === 2 || P.type === 3 ? sc * 0.9 : sc * 0.35;
    tc.position.set(R * 1.5, hgt + R * 1.25, R * 2.6); tc.lookAt(0, hgt * 0.8, 0);
    tp.render(ts, tc, out);
    renderer.readRenderTargetPixels(out, 0, 0, W, H, buf);
    for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    g2.putImageData(img, 0, 0);
    thumbs['plant:' + id] = cv.toDataURL('image/png');
    ts.remove(im); geo.dispose();
  }
  renderer.setClearColor(0x000000, 0);
  applyTod(keepTod); thumbMat.dispose();
  post.setSize(window.innerWidth, window.innerHeight, PX);
  tp.rt.dispose(); out.dispose();
}

// ---------- интерфейс ----------
let curCat = null;
// кисть растений: { id: вид или 'erase', r: радиус }
let brush = null, brushR = 2.5, brushOnObj = true;
function setBrush(id) {
  if (id && sys.tool) sys.cancelTool();
  brush = id ? { id } : null;
  G.uBrush.value = brush ? brushR : 0;
  renderShelf(); renderPlacebar();
}
function fmtCost(cost, mine = true) {
  return Object.entries(cost).filter(([, v]) => v).map(([k, v]) => `<span class="cost ${mine && !sys.free && (sys.res[k] ?? 0) < v ? 'short' : ''}">${Math.round(v)} ${RES_NAMES[k]}</span>`).join(' · ') || 'даром';
}
const EFF_NAMES = { people: 'жители', faith: 'вера', chthon: 'хтонь', silver: 'серебро/такт', wood: 'брёвна/такт', stone: 'камень/такт', store: 'запас' };
function fmtEff(e) { return Object.entries(e).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${+v.toFixed(1)} ${EFF_NAMES[k] ?? k}`).join(', '); }

function renderCats() {
  const el = $('cats'); el.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button'); b.innerHTML = `<span class="ic">${c.icon}</span>${c.name}`;
    const fresh = BUILDINGS.some(d => d.cat === c.id && sys.newCards.has(d.id));
    if (fresh) b.innerHTML += ' <span style="color:var(--ember)">●</span>';
    b.classList.toggle('on', curCat === c.id);
    b.onclick = () => { curCat = curCat === c.id ? null : c.id; renderCats(); renderShelf(); };
    el.appendChild(b);
  }
  const sep = document.createElement('span'); sep.className = 'sep'; el.appendChild(sep);
  const bE = document.createElement('button'); bE.innerHTML = '<span class="ic">⌗</span>Межа'; bE.classList.toggle('on', sys.tool?.mode === 'expand');
  bE.onclick = () => { if (sys.tool?.mode === 'expand') sys.cancelTool(); else { curCat = null; setBrush(null); sys.startExpand(); } renderCats(); renderShelf(); };
  const bC = document.createElement('button'); bC.innerHTML = '<span class="ic">⚔</span>Вырубка'; bC.classList.toggle('on', sys.tool?.mode === 'clear');
  bC.onclick = () => { if (sys.tool?.mode === 'clear') sys.cancelTool(); else { curCat = null; setBrush(null); sys.startClear(); } renderCats(); renderShelf(); };
  const bN = document.createElement('button'); bN.innerHTML = '<span class="ic">❀</span>Природа'; bN.classList.toggle('on', curCat === 'nature');
  bN.onclick = () => { if (curCat === 'nature') { curCat = null; setBrush(null); } else { sys.cancelTool(); curCat = 'nature'; } renderCats(); renderShelf(); };
  el.append(bE, bC, bN);
}
function renderShelf() {
  const el = $('shelf');
  if (!curCat) { el.hidden = true; return; }
  el.hidden = false; el.innerHTML = '';
  if (curCat === 'nature') {
    for (const id of [...PLANT_IDS, 'erase']) {
      const P = PLANTS[id], b = document.createElement('button');
      b.className = 'card' + (brush?.id === id ? ' sel' : '');
      b.innerHTML = id === 'erase' ? `<span class="erase-ic">⌫</span><span class="nm">Стереть</span><span class="meta">убирает растения кистью</span><span class="eff">&nbsp;</span>`
        : `<img alt="" src="${thumbs['plant:' + id] ?? ''}"><span class="nm">${P.name}</span><span class="meta">${P.desc}</span><span class="eff">&nbsp;</span>`;
      b.onclick = () => setBrush(brush?.id === id ? null : id);
      el.appendChild(b);
    }
    return;
  }
  for (const def of BUILDINGS.filter(d => d.cat === curCat)) {
    const locked = !sys.tierOK(def);
    const b = document.createElement('button'); b.className = 'card' + (locked ? ' locked' : '') + (sys.tool?.def === def ? ' sel' : '');
    const size = def.line ? `линия, ${def.size[1]} м` : def.area ? `${def.area.min.join('×')}…${def.area.max.join('×')} м` : `${def.size[0]}×${def.size[1]} м`;
    b.innerHTML = `${locked ? `<span class="badge lock">${TIERS[def.tier].name}</span>` : sys.newCards.has(def.id) ? '<span class="badge">Новое</span>' : ''}
      <img alt="" src="${thumbs[def.id] ?? ''}"><span class="nm">${def.name}</span>
      <span class="meta num">${size} · ${fmtCost(def.cost)}${def.costPer ? (def.line ? '/м' : ' +/м²') : ''}</span>
      <span class="eff">${fmtEff(def.effect) || '&nbsp;'}</span>`;
    b.title = def.desc;
    b.onclick = () => { if (locked) { toast(`«${def.name}» откроется на уровне «${TIERS[def.tier].name}»`, true); return; } brush = null; G.uBrush.value = 0; sys.startPlace(def, 0); renderShelf(); };
    el.appendChild(b);
  }
}
function renderPlacebar() {
  const t = sys.tool, el = $('placebar');
  if (brush) {
    el.hidden = false;
    el.innerHTML = `<span class="nm">Кисть: ${brush.id === 'erase' ? 'Стереть' : PLANTS[brush.id].name}</span>
      <span class="row" style="gap:4px"><button id="br-">−</button><span class="num">${brushR.toFixed(1)} м</span><button id="br+">+</button></span>
      <label class="row" style="gap:4px"><input type="checkbox" id="brObj" ${brushOnObj ? 'checked' : ''}>по постройкам</label>
      <span class="hint">ЛКМ — рисовать (тяни), на стенах и кровлях тоже · [ ] — размер · ПКМ/Esc — убрать кисть</span>`;
    $('brObj').onchange = (e) => { brushOnObj = e.target.checked; };
    $('br-').onclick = () => { brushR = Math.max(0.5, brushR / 1.25); G.uBrush.value = brushR; renderPlacebar(); };
    $('br+').onclick = () => { brushR = Math.min(12, brushR * 1.25); G.uBrush.value = brushR; renderPlacebar(); };
    return;
  }
  if (!t) { el.hidden = true; return; }
  el.hidden = false;
  if (t.mode === 'expand') { el.innerHTML = `<span class="nm">Межа</span><span class="hint">золотые наделы можно купить · цена ${fmtCost(sys.sectorPrice())} · ПКМ — выйти</span>`; return; }
  if (t.mode === 'clear') { el.innerHTML = `<span class="nm">Вырубка</span><span class="hint">тяни рамку по лесу на своей меже · +2 брёвна за дерево · ПКМ — выйти</span>`; return; }
  const def = t.def;
  el.innerHTML = `<span class="nm">${t.mode === 'move' ? 'Перенос: ' : ''}${def.name}</span>
    <span class="row" style="gap:4px"><button id="pv-">‹</button><span class="num">вариант ${t.v + 1}/4</span><button id="pv+">›</button></span>
    ${def.line || def.area ? '' : `<button id="prot">фасад: ${ROT_NAMES[t.rot]} (R)</button>`}
    <span class="hint">${def.line ? 'тяни линию или 2 клика' : def.area ? 'тяни, чтобы задать размер' : 'ЛКМ — поставить'} · ПКМ/Esc — закончить</span>`;
  $('pv-').onclick = () => { sys.variant(-1); renderPlacebar(); };
  $('pv+').onclick = () => { sys.variant(1); renderPlacebar(); };
  $('prot') && ($('prot').onclick = () => { sys.rotate(1); renderPlacebar(); });
}
function renderHud() {
  const r = sys.res, inc = sys.income ?? {};
  const cell = (k, v, d) => `<div class="res"><span class="k">${k}</span><span class="v num">${Math.floor(v)}</span><span class="d num">${d ? (d > 0 ? '+' : '') + d.toFixed(1) : ''}</span></div>`;
  $('res').innerHTML = cell('Серебро', r.silver, inc.silver) + cell('Брёвна', r.wood, inc.wood) + cell('Камень', r.stone, inc.stone)
    + cell('Жители', sys.stats.people) + cell('Вера', sys.stats.faith);
  $('tierName').textContent = TIERS[sys.tier].name;
  const nx = TIERS[sys.tier + 1];
  $('tierNext').textContent = nx ? `до «${nx.name}»: ${Object.entries(nx.need).map(([k, v]) => `${k === 'people' ? 'жители' : 'вера'} ${Math.floor(sys.stats[k])}/${v}`).join(', ')}` : 'высший уровень';
  const ch = sys.stats.chthon; $('chthonTxt').textContent = ch.toFixed(1);
  $('chthon').firstElementChild.style.width = Math.min(100, G.uChthon.value * 100) + '%';
}
function renderInfo() {
  const it = sys.selected, el = $('info');
  if (!it || !sys.items.has(it.id)) { el.hidden = true; return; }
  el.hidden = false;
  const st = it.stage, building = st < 4;
  const state = it.ab ? '<span style="color:var(--blood)">Заброшено</span>' : building ? `<span style="color:var(--ember)">Строится: ${STAGES[Math.floor(st)]}</span>` : '<span style="color:var(--moss)">Готово</span>';
  el.innerHTML = `<h2>${it.def.name}</h2><div class="state">${state}</div>
    ${building ? `<div class="bar"><i style="width:${st / 4 * 100}%"></i></div><div class="stages">${STAGES.map((s, i) => `<span class="${i === Math.floor(st) ? 'cur' : ''}">${s}</span>`).join('')}</div>` : ''}
    <div class="desc">${it.def.desc}</div>
    <div class="desc num">${it.line ? `длина ${Math.round(it.line.L)} м` : `${it.fw}×${it.fd} м, фасад: ${ROT_NAMES[it.rot]}`} · вариант ${it.v + 1}/4${it.found > 0.3 ? ` · подклет ${it.found.toFixed(1)} м` : ''}</div>
    ${!it.ab ? `<div class="desc">${fmtEff(sys.effectOf(it.def, it.size)) || 'без дохода'}</div>` : ''}
    <div class="acts">
      ${it.ab ? `<button id="aRestore">Восстановить (${fmtCost(sys.restoreCost(it))})</button>` : ''}
      ${building && !it.ab ? '<button id="aFinish">Достроить сразу</button>' : ''}
      ${!it.line ? '<button id="aMove">Перенести</button><button id="aRot">Повернуть</button>' : ''}
      <button id="aV-">‹ вариант</button><button id="aV+">вариант ›</button>
      <button id="aInsp">Осмотр</button>
      ${!it.ab ? '<button id="aAb">Забросить</button>' : ''}
      <button id="aDel">Снести</button>
    </div>`;
  const on = (id, f) => { const b = $(id); if (b) b.onclick = () => { f(); renderInfo(); }; };
  on('aRestore', () => sys.restore(it)); on('aFinish', () => sys.finishNow(it));
  on('aMove', () => { sys.select(null); sys.startMove(it); }); on('aRot', () => sys.rotateItem(it));
  on('aV-', () => sys.setVariant(it, -1)); on('aV+', () => sys.setVariant(it, 1));
  on('aAb', () => sys.abandon(it)); on('aInsp', () => inspectStart(it)); on('aDel', () => sys.demolish(it));
}
function toast(text, bad = false, big = false, sub = '') {
  const t = document.createElement('div'); t.className = 'panel toast' + (bad ? ' bad' : '') + (big ? ' big' : '');
  t.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  $('toasts').appendChild(t); setTimeout(() => t.remove(), big ? 5200 : 2600);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
}
const floats = [];
function floatText(text, at, gain) {
  const el = document.createElement('div'); el.className = 'float' + (gain ? ' gain' : ''); el.textContent = text;
  document.body.appendChild(el); floats.push({ el, at: at.clone(), age: 0 });
}
function updateFloats(dt) {
  const v = new THREE.Vector3();
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.age += dt; f.at.y += dt * 2;
    v.copy(f.at).project(camera);
    f.el.style.left = (v.x * 0.5 + 0.5) * window.innerWidth + 'px'; f.el.style.top = (-v.y * 0.5 + 0.5) * window.innerHeight + 'px';
    f.el.style.opacity = String(Math.max(0, 1 - f.age / 1.8));
    if (f.age > 1.8) { f.el.remove(); floats.splice(i, 1); }
  }
}
function showTip(info, x, y) {
  const el = $('tip');
  if (!info) { el.hidden = true; return; }
  let h = '';
  if (info.kind === 'plan') {
    const p = info.plan, def = info.def;
    const size = p.kind === 'line' ? `${Math.round(p.L)} м` : `${p.w}×${p.d} м`;
    h = `<div class="t">${def.name}</div><div class="dim num">${size}${p.kind === 'rect' && p.top - p.min > 0.35 && def.plinth !== false ? ` · подклет ${(p.top - p.min).toFixed(1)} м` : ''}</div>`;
    if (sys.tool.mode !== 'move') h += `<div class="num">${fmtCost(p.cost)}</div>`;
    const ef = fmtEff(info.effect); if (ef) h += `<div class="ok">${ef}</div>`;
    if (!p.tierOK) h += `<div class="bad">Откроется: ${TIERS[def.tier].name}</div>`;
    if (p.reasons.length) h += `<div class="bad">Нельзя: ${p.reasons.join(', ')}</div>`;
    else if (!p.afford) h += `<div class="bad">Не хватает ресурсов</div>`;
    else if (p.valid) h += `<div class="ok">Можно ставить</div>`;
  } else if (info.kind === 'sector') {
    h = `<div class="t">${info.name}</div>` + (info.owned ? '<div class="ok">Твоя земля</div>' : info.can ? `<div class="num">${fmtCost(info.price)}</div><div class="${info.afford ? 'ok' : 'bad'}">${info.afford ? 'Клик — купить' : 'Не хватает серебра'}</div>` : '<div class="dim">Покупаются только соседние наделы</div>');
  } else if (info.kind === 'clear') {
    h = `<div class="t">Вырубка ${info.w}×${info.d} м</div><div class="num">деревьев: ${info.n}, на своей меже: ${info.own}</div><div class="ok">+${info.own * 2} брёвен</div>`;
  } else if (info.kind === 'item') {
    const it = info.item;
    h = `<div class="t">${it.def.name}</div><div class="${it.ab ? 'bad' : it.stage < 4 ? 'warn' : 'ok'}">${it.ab ? 'Заброшено · клик, чтобы восстановить' : it.stage < 4 ? 'Строится: ' + STAGES[Math.floor(it.stage)] : 'Готово'}</div>`;
  }
  el.innerHTML = h; el.hidden = false;
  const r = el.getBoundingClientRect();
  el.style.left = Math.min(x, window.innerWidth - r.width - 24) + 'px'; el.style.top = Math.min(y, window.innerHeight - r.height - 24) + 'px';
}

sys.addEventListener('toast', e => toast(e.detail.text, e.detail.bad));
sys.addEventListener('spent', e => {
  const { cost, gain, at } = e.detail;
  if (cost) { const s = Object.entries(cost).filter(([, v]) => v).map(([k, v]) => `−${Math.round(v)} ${RES_NAMES[k]}`).join('  '); if (s) floatText(s, at, false); }
  if (gain) floatText(Object.entries(gain).map(([k, v]) => `+${v} ${RES_NAMES[k]}`).join('  '), at, true);
});
sys.addEventListener('tier', e => { if (seeding) return; toast(`Теперь это ${e.detail.tier.name}`, false, true, e.detail.fresh.length ? `Новое в стройке: ${e.detail.fresh.map(b => b.name).join(', ')}. Новые карточки помечены.` : ''); renderCats(); renderShelf(); });
sys.addEventListener('built', e => { if (!seeding) toast(`${e.detail.def.name}: построено`); });
sys.addEventListener('change', () => { renderHud(); renderInfo(); if (!sys.tool) renderShelf(); autosave(); });
sys.addEventListener('economy', () => { renderHud(); if (sys.selected) renderInfo(); });
sys.addEventListener('select', () => renderInfo());
sys.addEventListener('tool', () => { renderPlacebar(); renderCats(); renderShelf(); if (!sys.tool) $('tip').hidden = true; });
sys.addEventListener('stage', e => { if (sys.selected === e.detail) renderInfo(); });

// ---------- ввод ----------
let drag = null, lastMove = { x: 0, y: 0 }, hoverT = 0;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: false, cx: cam.x, cz: cam.z, yaw0: cam.yawT, pitch0: cam.pitchT };
  if (e.button === 0 && sys.tool) { const p = groundAt(e.clientX, e.clientY); if (p) { sys.pointerDown(p); drag.tool = true; renderHud(); } }
  if (e.button === 0 && brush) { const b = brushAt(e.clientX, e.clientY); if (b) { brushStroke(b); drag.brush = b.p; } }
});
// куда попадает кисть: на постройку (стену, кровлю, бревно), если она ближе земли, иначе на землю
function brushAt(clientX, clientY) {
  const p = groundAt(clientX, clientY);
  if (!brushOnObj) return p ? { p } : null;
  ndc.set(clientX / window.innerWidth * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera); ray.layers.set(0);
  // постройки, деревья и пни (видимые куски леса: подробные вблизи или простые вдали)
  const fm = []; for (const m of forest.group.children) if (m.isMesh && m.visible) fm.push(m);
  const h = ray.intersectObjects([...sys.group.children, ...fm], true).find(h => h.object.isMesh && h.face);
  if (h && (!p || h.distance < camera.position.distanceTo(p) - 0.05)) {
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(ray.ray.direction) > 0) n.negate();
    return { p: h.point.clone(), hit: { point: h.point.clone(), normal: n, object: h.object, tree: fm.includes(h.object) } };
  }
  return p ? { p } : null;
}
function brushStroke(b) {
  const p = b.p;
  if (brush.id === 'erase') veg.erase(p.x, p.z, brushR, null, b.hit ? p.y : null);
  else if (b.hit) veg.paintSurface(brush.id, b.hit, Math.min(brushR, 3), 1);
  else { veg.paint(brush.id, p.x, p.z, brushR, 1); veg.coatStones(brush.id, p.x, p.z, brushR); }
  veg.update(); autosave();
}
sys.addEventListener('removed', e => { veg.removeInBox(e.detail.box); veg.update(); });
canvas.addEventListener('pointermove', e => {
  lastMove = { x: e.clientX, y: e.clientY };
  if (brush) { const b = brushAt(e.clientX, e.clientY); if (b) { const p = b.p; G.uCursor.value.set(p.x, p.y, p.z); if (drag?.brush && p.distanceTo(drag.brush) > Math.min(brushR, b.hit ? 3 : 99) * 0.4) { brushStroke(b); drag.brush = p; } } }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.brush) return;
    if (drag.moved && drag.btn === 2) {
      cam.yawT = drag.yaw0 - dx * 0.006; cam.pitchT = Math.max(0.12, Math.min(1.45, drag.pitch0 + dy * 0.004));
      $('tip').hidden = true; return;
    }
    if (drag.moved && !drag.tool && (drag.btn === 1 || (drag.btn === 0 && !sys.tool))) {
      const k = cam.dist / window.innerHeight * 1.6;
      const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx_ = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      cam.x = drag.cx - (dx * rx - dy * fx_) * k; cam.z = drag.cz - (dx * rz - dy * fz) * k;
      $('tip').hidden = true; return;
    }
  }
  hoverUpdate();
});
function hoverUpdate() {
  const { x, y } = lastMove;
  if (sys.tool) {
    const p = groundAt(x, y); if (!p) return;
    showTip(sys.hover(p), x, y);
  } else {
    const now = performance.now(); if (now - hoverT < 90) return; hoverT = now;
    const it = pickItem(x, y);
    if (it) { showTip({ kind: 'item', item: it }, x, y); canvas.style.cursor = 'pointer'; }
    else { $('tip').hidden = true; canvas.style.cursor = 'crosshair'; }
  }
}
canvas.addEventListener('pointerup', e => {
  const d = drag; drag = null; if (!d) return;
  if (d.btn === 2 && !d.moved) { if (brush) setBrush(null); else if (sys.tool) sys.cancelTool(); else sys.select(null); return; }
  if (d.brush) return;
  if (d.btn !== 0) return;
  if (d.tool) { const p = groundAt(e.clientX, e.clientY); if (p) sys.pointerUp(p); renderHud(); renderShelf(); return; }
  if (!d.moved && !sys.tool && !brush) { const it = pickItem(e.clientX, e.clientY); sys.select(it); }
});
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.distT = Math.max(14, Math.min(320, cam.distT * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
window.addEventListener('keydown', e => {
  if (insp.it && e.code === 'Escape') { inspectEnd(); return; }
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if (e.code === 'KeyR') { sys.rotate(1); renderPlacebar(); hoverUpdate(); }
  if (brush && (e.code === 'BracketRight' || e.code === 'BracketLeft')) { brushR = e.code === 'BracketRight' ? Math.min(12, brushR * 1.25) : Math.max(0.5, brushR / 1.25); G.uBrush.value = brushR; renderPlacebar(); return; }
  if (e.code === 'BracketRight' || e.code === 'Period') { sys.variant(1); renderPlacebar(); }
  if (e.code === 'BracketLeft' || e.code === 'Comma') { sys.variant(-1); renderPlacebar(); }
  if (e.code === 'Escape') { if (brush) setBrush(null); else if (sys.tool) sys.cancelTool(); else { sys.select(null); curCat = null; renderCats(); renderShelf(); } }
  if (e.code === 'Delete' && sys.selected) sys.demolish(sys.selected);
  if (e.code === 'Space') { e.preventDefault(); setSpeed(sys.speed ? 0 : 1); }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function setSpeed(s) { sys.speed = s; document.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', +b.dataset.speed === s)); }
document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
document.querySelectorAll('[data-tod]').forEach(b => b.onclick = () => applyTod(b.dataset.tod));
$('btnOrbit').onclick = () => { cam.orbit = !cam.orbit; $('btnOrbit').classList.toggle('on', cam.orbit); };
$('btnTop').onclick = () => { cam.pitchT = 1.4; cam.distT = Math.max(cam.distT, 140); };
$('btnLow').onclick = () => { cam.pitchT = 0.2; cam.distT = Math.min(cam.distT, 45); };
$('optFree').onchange = e => { sys.free = e.target.checked; sys._updateOwnTex(); renderShelf(); renderHud(); };
$('optAb').onchange = e => { sys.placeAbandoned = e.target.checked; if (sys.tool?.def) sys._makeGhost(); };
$('optInstant').onchange = e => { sys.instant = e.target.checked; };

// ---------- осмотр постройки: облёт вокруг, смена света, проверка опор ----------
const TOD_ORDER = ['morning', 'day', 'night'], TOD_RU = { morning: 'Утро', day: 'День', night: 'Ночь' };
function inspectStart(it) {
  if (insp.it) inspectEnd();
  const box = new THREE.Box3().setFromObject(it.group), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  insp.it = it; insp.tod = tod;
  insp.saved = { x: cam.x, z: cam.z, yawT: cam.yawT, distT: cam.distT, pitchT: cam.pitchT, orbit: cam.orbit };
  cam.x = c.x; cam.z = c.z; cam.orbit = true; cam.pitchT = 0.36;
  cam.distT = Math.max(12, Math.max(sz.x, sz.z, sz.y * 1.3) * 1.45 + 5);
  sys.select(null); setBrush(null);
  $('inspName').textContent = it.def.name; $('inspStat').innerHTML = '';
  $('btnInspSup').classList.remove('on'); $('btnInspOrbit').classList.add('on'); $('btnInspTod').textContent = 'Свет: ' + TOD_RU[tod];
  $('inspect').hidden = false; document.body.classList.add('inspecting');
}
function inspectSupports(show) {
  const it = insp.it; if (!it) return;
  if (insp.overlay) { insp.overlay.parent?.remove(insp.overlay); insp.overlay.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); insp.overlay = null; }
  $('btnInspSup').classList.toggle('on', show);
  if (!show) { $('inspStat').innerHTML = ''; return; }
  if (it.line) { $('inspStat').textContent = 'У линий (частокол, мостки) каждое звено стоит на земле само'; return; }
  const res = supportCheck(it.def, { v: it.v, ab: it.ab, size: it.size, found: it.found, seed: it.id });
  insp.overlay = makeSupportOverlay(res); insp.overlay.traverse(o => o.layers.set(1));
  it.group.add(insp.overlay);
  const fl = res.floating.length;
  $('inspStat').innerHTML = `деталей ${res.parts} · стоят на земле <span class="ok">${res.grounded.length}</span> (зелёные рамки) · ` +
    (fl ? `висят <span class="bad">${fl}</span> (красные рамки)` : '<span class="ok">висящих нет</span>, каждая деталь держится цепочкой касаний до земли');
}
function inspectEnd() {
  if (!insp.it) return;
  inspectSupports(false);
  Object.assign(cam, insp.saved); $('btnOrbit').classList.toggle('on', cam.orbit);
  applyTod(insp.tod);
  insp.it = null; $('inspect').hidden = true; document.body.classList.remove('inspecting');
}
$('btnInspExit').onclick = inspectEnd;
$('btnInspSup').onclick = () => inspectSupports(!insp.overlay && !$('btnInspSup').classList.contains('on'));
$('btnInspOrbit').onclick = () => { cam.orbit = !cam.orbit; $('btnInspOrbit').classList.toggle('on', cam.orbit); };
$('btnInspTod').onclick = () => { const n = TOD_ORDER[(TOD_ORDER.indexOf(tod) + 1) % 3]; applyTod(n); $('btnInspTod').textContent = 'Свет: ' + TOD_RU[n]; };

// ---------- качество: для слабых машин ----------
const QUALITY = {
  low:  { px: 0.75, shadow: false, bump: 0,   nearR: 0,  grass: 0.35 },
  mid:  { px: 1,    shadow: true,  bump: 0.6, nearR: 40, grass: 0.7 },
  high: { px: null, shadow: true,  bump: 1,   nearR: 70, grass: 1 },
};
let qual = 'high', shadowOn = true;
function setQuality(q) {
  const Q = QUALITY[q]; if (!Q) return; qual = q;
  PX = Q.px ?? PX_MAX; resize();
  shadowOn = Q.shadow; G.uBump.value = Q.bump; forest.nearR = Q.nearR; veg.setDensity(Q.grass);
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === q));
  try { localStorage.setItem('mezhevoe-quality', q); } catch {}
}
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => setQuality(b.dataset.q));

// сохранение: черновик в браузере (может быть недоступен — тогда просто не сохраняется)
const SAVE_KEY = 'mezhevoe-build-v2', VEG_KEY = 'mezhevoe-veg-v1';
let saveT = 0, seeding = true;
function saveAll() { localStorage.setItem(SAVE_KEY, JSON.stringify(sys.toJSON())); localStorage.setItem(VEG_KEY, JSON.stringify(veg.toJSON())); }
function autosave() { if (seeding) return; clearTimeout(saveT); saveT = setTimeout(() => { try { saveAll(); } catch {} }, 900); }
$('btnSave').onclick = () => { try { saveAll(); toast('Сохранено в этом браузере'); } catch { toast('Браузер не дал сохранить', true); } };
$('btnLoad').onclick = () => { try { const s = localStorage.getItem(SAVE_KEY); if (!s) { toast('Сохранения нет', true); return; } loadLayout(JSON.parse(s)); const v = localStorage.getItem(VEG_KEY); if (v) veg.load(JSON.parse(v)); toast('Загружено'); } catch { toast('Не удалось загрузить', true); } };
$('btnExport').onclick = () => { $('exportText').value = JSON.stringify({ ...sys.toJSON(), vegetation: veg.toJSON() }); $('exportBox').hidden = false; $('copyMsg').textContent = ''; };
$('btnCloseExport').onclick = () => { $('exportBox').hidden = true; };
$('btnCopy').onclick = () => { navigator.clipboard.writeText($('exportText').value).then(() => { $('copyMsg').textContent = 'Скопировано'; }, () => { $('exportText').select(); $('copyMsg').textContent = 'Выделено: нажми Ctrl+C'; }); };
let resetArm = 0;
$('btnReset').onclick = () => {
  if (Date.now() - resetArm > 3000) { resetArm = Date.now(); $('btnReset').textContent = 'Точно?'; setTimeout(() => { $('btnReset').textContent = 'Заново'; }, 3000); return; }
  $('btnReset').textContent = 'Заново'; resetArm = 0;
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(VEG_KEY); } catch {}
  location.reload();
};
function loadLayout(j) {
  // лес не сохраняем целиком: пересаживаем и убираем деревья под постройками
  sys.load(j);
  for (const it of sys.items.values()) for (const [x, z] of it.cells) { const i = z * map.width + x; if (forest.trees.has(i)) forest.trees.delete(i); sys.occ[i] = it.id; }
  for (let sz = 0; sz < sys.SZ; sz++) for (let sx = 0; sx < sys.SX; sx++) forest.rebuildChunk(sx, sz);
}

// ---------- цикл ----------
msg('Ставим избы…');
seedWorld();
try { const s = localStorage.getItem(SAVE_KEY); if (s && !TEST) loadLayout(JSON.parse(s)); } catch {}
msg('Сеем траву…');
let vegLoaded = false;
try { const s = localStorage.getItem(VEG_KEY); if (s && !TEST) vegLoaded = veg.load(JSON.parse(s)); } catch {}
if (!vegLoaded) veg.autoScatter(forest);
seeding = false;
msg('Рисуем карточки…');
resize();
makeThumbs();
renderCats(); renderHud(); renderPlacebar();
try { const q = localStorage.getItem('mezhevoe-quality'); if (q && !TEST) setQuality(q); } catch {}
$('loading').remove();

// ближайшие к центру вида огни → в шейдер (окна, костры, факелы)
const _cands = [];
function pickLights() {
  _cands.length = 0;
  for (const e of fx.emitters) {
    if (e.t !== 'fire' && e.t !== 'glow') continue;
    const d = (e.x - cam.x) ** 2 + (e.z - cam.z) ** 2;
    _cands.push([d, e]);
  }
  _cands.sort((a, b) => a[0] - b[0]);
  const n = Math.min(16, _cands.length);
  for (let i = 0; i < n; i++) {
    const e = _cands[i][1], fire = e.t === 'fire';
    const flick = fire ? 0.85 + 0.15 * Math.sin(G.uTime.value * 11 + i * 3) : 1;
    G.uPL.value[i].set(e.x, e.y, e.z, fire ? 4 + (e.s ?? 0.5) * 9 : (e.r ?? 1.5) * 2.6);
    if (e.red) G.uPLc.value[i].setRGB(1.0 * flick, 0.22, 0.12); else G.uPLc.value[i].setRGB(1.0 * flick, 0.6 * flick, 0.28);
  }
  G.uPLn.value = n;
}
// гниль хтони расползается от капищ: радиус растёт с хтонью (вера сдерживает)
function updateRot(dt) {
  let n = 0;
  const ch = Math.max(0, sys.stats.chthon - sys.stats.faith * 0.3);
  for (const it of sys.items.values()) {
    if (n >= 4) break;
    if (it.def.id !== 'kapishe' || it.stage < 4) continue;
    const R = 7 + Math.min(26, ch * 1.3);
    it._rotR = (it._rotR ?? 0) + (R - (it._rotR ?? 0)) * Math.min(1, dt * 0.25);
    const c = it.group.userData.center;
    G.uRot.value[n].set(c.x, c.z, it._rotR, Math.min(1, 0.5 + ch / 25)); n++;
  }
  G.uRotN.value = n;
}
const clock = new THREE.Clock();
let paused = false;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  G.uTime.value += dt;
  updateCamera(dt);
  sys.update(dt);
  fx.night = G.uNight.value; updateRot(dt);
  fx.update(dt * (sys.speed ? 1 : 0.3), G.uTime.value);
  updateFloats(dt);
  if (keys.size && sys.tool) hoverUpdate();
  pickLights();
  const span = Math.min(260, Math.max(50, cam.dist * 1.25));
  if (shadowOn) shadow.render(renderer, scene, new THREE.Vector3(cam.x, cam.y, cam.z), span); else G.uShadowOn.value = 0;
  post.render(scene, camera);
}
function loop() { if (!paused) frame(); requestAnimationFrame(loop); }
if (TEST) { window.__RC = THREE.Raycaster; window.__demo = { brushAt, brushStroke, camera, scene, fx, sys, cam, frame, applyTod, map, forest, veg, setBrush, inspectStart, inspectEnd, inspectSupports, setQuality, groundAt, BY_ID, G, toast, renderInfo, renderShelf, renderCats, setCat: (c) => { curCat = c; renderCats(); renderShelf(); } }; paused = location.search.includes('manual'); }
loop();
