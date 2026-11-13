// Разметка зон на модели: кистью по поверхности, один цвет = одно место (глаза, рот, волосы…).
// Точка хранится как (меш, треугольник, барицентрические координаты) — это не зависит от позы и масштаба,
// поэтому по разметке потом точно ставятся шейдеры лица, свечение и т. п. Сохраняется в общую базу окна
// (db: zones/<модель>) и в браузер как запас.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const ZONES = [
  { k: 'eyes', name: 'Глаза / глазницы', color: '#ff2a2a' },
  { k: 'brows', name: 'Брови, надбровья', color: '#ff9a1a' },
  { k: 'mouth', name: 'Рот', color: '#2a6bff' },
  { k: 'hair', name: 'Волосы, борода, мох', color: '#ffe02a' },
  { k: 'glow', name: 'Что светится', color: '#2aff6b' },
  { k: 'detail', name: 'Мелкие детали', color: '#c04aff' },
];
const MAXP = 12000;

export class ZoneEditor {
  constructor({ renderer, canvas, models, names, onExit }) {
    Object.assign(this, { renderer, canvas, models, names, onExit });
    this.active = false; this.zone = 'eyes'; this.radius = 0.012; this.erase = false;
    this.points = []; this.stroke = 0; this.dirty = false;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.enableDamping = true; this.controls.enabled = false;
    this.ray = new THREE.Raycaster();
    this.zoneColor = Object.fromEntries(ZONES.map((z) => [z.k, new THREE.Color(z.color)]));
    this._ui();
    this._onDown = (e) => this._down(e); this._onMove = (e) => this._move(e); this._onUp = () => this._up();
    this._onKey = (e) => { if (this.active && (e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); this.undo(); } };
    this.db = null;
    (async () => { try { this.db = window.claude?.use ? await window.claude.use('db') : null; } catch { this.db = null; } this._status(); })();
  }

  // ------------------------------------------------------------ интерфейс
  _ui() {
    const el = document.createElement('div'); el.id = 'zoneUi'; el.hidden = true;
    el.innerHTML = `
      <h2>Разметка зон</h2>
      <p class="muted">ЛКМ рисует по модели. ПКМ вращает, колёсико приближает, средняя кнопка сдвигает. Ctrl+Z отменяет мазок.</p>
      <div class="row" id="zModel"></div>
      <h2>Зона (цвет)</h2>
      <div id="zZones" style="display:grid;gap:4px"></div>
      <div class="row" style="margin-top:6px"><button id="zErase">Ластик</button><button id="zClear">Стереть зону</button></div>
      <div class="sl"><span>Кисть, см</span><input id="zRad" type="range" min="0.3" max="6" step="0.1" value="1.2"><output id="zRadO">1.2</output></div>
      <h2>Сохранить</h2>
      <div class="row"><button id="zSave">Сохранить разметку</button><button id="zCopy">Копировать JSON</button></div>
      <p id="zStat" class="muted"></p>
      <div class="row" style="margin-top:10px"><button id="zExit">Готово, вернуться</button></div>`;
    document.body.appendChild(el); this.el = el;
    const $ = (s) => el.querySelector(s);
    for (const n of this.names) {
      const b = document.createElement('button'); b.textContent = n.label; b.dataset.k = n.key;
      b.onclick = () => this.open(n.key); $('#zModel').appendChild(b);
    }
    for (const z of ZONES) {
      const b = document.createElement('button'); b.dataset.k = z.k; b.style.textAlign = 'left';
      b.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${z.color};margin-right:8px;vertical-align:-1px"></span>${z.name} <span class="muted" data-c="${z.k}"></span>`;
      b.onclick = () => { this.zone = z.k; this.erase = false; this._sync(); }; $('#zZones').appendChild(b);
    }
    $('#zErase').onclick = () => { this.erase = !this.erase; this._sync(); };
    $('#zClear').onclick = () => { this.points = this.points.filter((p) => p.z !== this.zone); this.dirty = true; this._rebuild(); };
    $('#zRad').oninput = (e) => { this.radius = +e.target.value / 100; $('#zRadO').value = e.target.value; };
    $('#zSave').onclick = () => this.save();
    $('#zCopy').onclick = () => { navigator.clipboard?.writeText(JSON.stringify(this._data())).then(() => this._status('JSON скопирован'), () => this._status('Не удалось скопировать')); };
    $('#zExit').onclick = () => this.close();
    this.$ = $;
  }
  _sync() {
    this.el.querySelectorAll('#zZones button').forEach((b) => b.classList.toggle('on', !this.erase && b.dataset.k === this.zone));
    this.$('#zErase').classList.toggle('on', this.erase);
    this.el.querySelectorAll('#zModel button').forEach((b) => b.classList.toggle('on', b.dataset.k === this.model));
    const cnt = {}; for (const p of this.points) cnt[p.z] = (cnt[p.z] ?? 0) + 1;
    this.el.querySelectorAll('[data-c]').forEach((s) => { s.textContent = cnt[s.dataset.c] ? `· ${cnt[s.dataset.c]}` : ''; });
  }
  _status(msg) {
    const base = this.db ? 'Сохраняется в окно: Claude увидит разметку сам.' : 'База окна недоступна: сохраняю только в этом браузере, пришли JSON в чат.';
    if (this.$) this.$('#zStat').textContent = (msg ? msg + '. ' : (this.dirty ? 'Есть несохранённые мазки. ' : '')) + base;
  }

  // ------------------------------------------------------------ сцена
  async open(key) {
    if (this.dirty && this.model && this.model !== key) await this.save();
    this.model = key;
    const src = this.models[key];
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#2b2622');
    this.scene.add(new THREE.HemisphereLight('#fff6e8', '#4a4038', 1.6));
    const d = new THREE.DirectionalLight('#ffffff', 1.4); d.position.set(1, 2, 3); this.scene.add(d);
    const obj = SkeletonUtils.clone(src.scene);
    this.meshes = [];
    obj.traverse((m) => {
      if (!m.isMesh) return;
      const om = [].concat(m.material)[0];
      m.material = new THREE.MeshLambertMaterial({ map: om.map ?? null, color: om.color ?? 0xffffff, side: THREE.DoubleSide, alphaTest: om.alphaTest || 0, transparent: false });
      m.frustumCulled = false; this.meshes.push(m);
    });
    // рост к 1,8 м (как в превью), позу не трогаем: опорная поза файла
    const box = new THREE.Box3().setFromObject(obj); const h = box.max.y - box.min.y;
    obj.scale.setScalar(1.8 / h); obj.position.y = -box.min.y * 1.8 / h;
    this.scene.add(obj); obj.updateMatrixWorld(true); this.obj = obj;
    let head = null; obj.traverse((b) => { if (!head && b.isBone && /head$/i.test(b.name)) head = b; });
    const hp = head ? head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 1.6, 0);
    this.camera.position.set(hp.x, hp.y + 0.05, hp.z + 0.9); this.controls.target.copy(hp); this.controls.update();
    this.dots = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14), new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }), MAXP);
    this.dots.count = 0; this.dots.frustumCulled = false; this.scene.add(this.dots);
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 0.8 }));
    this.cursor.renderOrder = 5; this.cursor.visible = false; this.scene.add(this.cursor);
    this.points = await this._load(key); this.dirty = false; this.stroke = this.points.reduce((a, p) => Math.max(a, p.s ?? 0), 0) + 1;
    this._rebuild(); this._status();
  }
  start(key) {
    this.active = true; this.el.hidden = false; this.controls.enabled = true;
    this.canvas.addEventListener('pointerdown', this._onDown); window.addEventListener('pointermove', this._onMove); window.addEventListener('pointerup', this._onUp);
    window.addEventListener('keydown', this._onKey);
    this.canvas.addEventListener('contextmenu', this._noCtx = (e) => e.preventDefault());
    return this.open(key ?? this.model ?? this.names[0].key);
  }
  async close() {
    if (this.dirty) await this.save();
    this.active = false; this.el.hidden = true; this.controls.enabled = false;
    this.canvas.removeEventListener('pointerdown', this._onDown); window.removeEventListener('pointermove', this._onMove); window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('keydown', this._onKey); this.canvas.removeEventListener('contextmenu', this._noCtx);
    this.onExit?.();
  }
  render() {
    const r = this.renderer, c = this.canvas;
    const w = c.clientWidth, h = c.clientHeight; const panel = window.innerWidth > 760 ? 340 : 0;
    this.camera.aspect = w / h; this.camera.setViewOffset(w, h, panel / 2, 0, w, h); this.camera.updateProjectionMatrix();
    this.controls.update();
    r.setRenderTarget(null); r.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------ кисть
  _hit(e) {
    const rc = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(p, this.camera);
    return this.ray.intersectObjects(this.meshes, false)[0] ?? null;
  }
  _down(e) {
    if (e.button !== 0 || !this.scene) return;
    this.painting = true; this.last = null; this.curStroke = this.stroke++;
    this._paintAt(e);
  }
  _move(e) {
    if (!this.active || !this.scene) return;
    const h = this._hit(e);
    if (h) {
      const n = this._normal(h);
      this.cursor.visible = true; this.cursor.position.copy(h.point).addScaledVector(n, 0.002);
      this.cursor.lookAt(h.point.clone().add(n)); this.cursor.scale.setScalar(this.radius);
      this.cursor.material.color.set(this.erase ? '#ffffff' : ZONES.find((z) => z.k === this.zone).color);
    } else this.cursor.visible = false;
    if (this.painting) this._paintAt(e, h);
  }
  _up() { if (this.painting) { this.painting = false; this._sync(); this._status(); } }
  _normal(h) {
    const g = h.object.geometry, f = h.face; const v = [f.a, f.b, f.c].map((i) => h.object.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(h.object.matrixWorld));
    const n = new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0])).normalize();
    if (n.dot(this.ray.ray.direction) > 0) n.negate();
    return n;
  }
  _paintAt(e, h = this._hit(e)) {
    if (!h) return;
    if (this.erase) {
      const r2 = this.radius * this.radius; const before = this.points.length;
      this.points = this.points.filter((p) => p.w.distanceToSquared(h.point) > r2);
      if (this.points.length !== before) { this.dirty = true; this._rebuild(); }
      return;
    }
    if (this.last && this.last.distanceTo(h.point) < this.radius * 0.4) return;
    if (this.points.length >= MAXP) { this._status('Достигнут предел точек'); return; }
    this.last = h.point.clone();
    const mi = this.meshes.indexOf(h.object);
    const b = h.barycoord ?? this._bary(h);
    const p = { z: this.zone, m: mi, f: h.faceIndex, b: [b.x, b.y, b.z], r: this.radius, s: this.curStroke };
    this._place(p); this.points.push(p); this.dirty = true; this._draw(this.points.length - 1);
    this.dots.count = this.points.length; this.dots.instanceMatrix.needsUpdate = true; if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
  }
  _bary(h) {
    const o = h.object; const f = h.face; const v = [f.a, f.b, f.c].map((i) => o.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(o.matrixWorld));
    return THREE.Triangle.getBarycoord(h.point, v[0], v[1], v[2], new THREE.Vector3());
  }
  // мировая точка и нормаль по (меш, треугольник, барицентрические)
  _place(p) {
    const o = this.meshes[p.m]; if (!o) return false;
    const g = o.geometry; const idx = g.index;
    const ia = idx ? idx.getX(p.f * 3) : p.f * 3, ib = idx ? idx.getX(p.f * 3 + 1) : p.f * 3 + 1, ic = idx ? idx.getX(p.f * 3 + 2) : p.f * 3 + 2;
    const v = [ia, ib, ic].map((i) => o.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(o.matrixWorld));
    p.w = v[0].clone().multiplyScalar(p.b[0]).addScaledVector(v[1], p.b[1]).addScaledVector(v[2], p.b[2]);
    p.n = new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0])).normalize();
    // нормаль к камере: точку видно с той стороны, где её рисовали
    if (p.n.dot(this.camera.position.clone().sub(p.w)) < 0) p.n.negate();
    // позиция в исходной геометрии (до скина): для переноса в шейдер и в Godot
    const pa = new THREE.Vector3().fromBufferAttribute(g.attributes.position, ia), pb = new THREE.Vector3().fromBufferAttribute(g.attributes.position, ib), pc = new THREE.Vector3().fromBufferAttribute(g.attributes.position, ic);
    p.g = pa.multiplyScalar(p.b[0]).addScaledVector(pb, p.b[1]).addScaledVector(pc, p.b[2]);
    p.vi = [ia, ib, ic];
    return true;
  }
  _draw(i) {
    const p = this.points[i]; const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.n);
    m.compose(p.w.clone().addScaledVector(p.n, 0.0008), q, new THREE.Vector3(p.r, p.r, p.r));
    this.dots.setMatrixAt(i, m); this.dots.setColorAt(i, this.zoneColor[p.z]);
  }
  _rebuild() {
    if (!this.dots) return;
    this.points = this.points.filter((p) => p.w || this._place(p));
    for (let i = 0; i < this.points.length; i++) this._draw(i);
    this.dots.count = this.points.length; this.dots.instanceMatrix.needsUpdate = true; if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;
    this._sync(); this._status();
  }
  undo() {
    if (!this.points.length) return;
    const s = Math.max(...this.points.map((p) => p.s ?? 0));
    this.points = this.points.filter((p) => (p.s ?? 0) !== s); this.dirty = true; this._rebuild();
  }

  // ------------------------------------------------------------ хранение
  _data() {
    const r4 = (x) => Math.round(x * 1e4) / 1e4;
    return {
      model: this.model, v: 1, savedAt: new Date().toISOString(),
      meshes: this.meshes.map((m) => m.name),
      zones: Object.fromEntries(ZONES.map((z) => [z.k, z.name])),
      // [зона, меш, треугольник, b0, b1, радиус см, мазок, x, y, z (исходная геометрия)]
      pts: this.points.map((p) => [p.z, p.m, p.f, r4(p.b[0]), r4(p.b[1]), Math.round(p.r * 1000) / 10, p.s ?? 0, r4(p.g.x), r4(p.g.y), r4(p.g.z)]),
    };
  }
  async save() {
    if (!this.model) return;
    let data = this._data(); let json = JSON.stringify(data);
    // документ базы не больше 256 КБ: сначала убираем xyz (их можно пересчитать), потом прореживаем мазки
    if (json.length > 240000) { data.pts = data.pts.map((a) => a.slice(0, 7)); json = JSON.stringify(data); }
    while (json.length > 240000) { data.pts = data.pts.filter((_, i) => i % 3 !== 1); json = JSON.stringify(data); }
    try { localStorage.setItem('pfZones_' + this.model, json); } catch { /* приватный режим */ }
    if (this.db) {
      try { await this.db.doc('zones/' + this.model).set(data); this.dirty = false; this._status(`Сохранено (${data.pts.length} точек)`); return; }
      catch (e) { this._status('Не сохранилось в окно (' + (e?.code || e?.message || 'ошибка') + '), осталось в браузере'); return; }
    }
    this.dirty = false; this._status(`Сохранено в браузере (${data.pts.length} точек)`);
  }
  async _load(key) {
    let data = null;
    if (this.db) {
      try {
        const snap = await Promise.race([this.db.doc('zones/' + key).get(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000))]);
        if (snap?.exists) data = snap.data();
      } catch { data = null; }
    }
    if (!data) { try { const s = localStorage.getItem('pfZones_' + key); if (s) data = JSON.parse(s); } catch { data = null; } }
    if (!data?.pts) return [];
    return data.pts.map((a) => ({ z: a[0], m: a[1], f: a[2], b: [a[3], a[4], 1 - a[3] - a[4]], r: a[5] / 100, s: a[6] }));
  }
}

// ------------------------------------------------------------ разметка в игре/превью
// Загрузка: сначала база окна (свежая разметка), потом браузер, потом файл, что лежит рядом (zones/<модель>.json).
export async function loadZones(key, { url } = {}) {
  try {
    const db = window.claude?.use ? await Promise.race([window.claude.use('db'), new Promise((r) => setTimeout(() => r(null), 4000))]) : null;
    if (db) {
      const snap = await Promise.race([db.doc('zones/' + key).get(), new Promise((r) => setTimeout(() => r(null), 6000))]);
      if (snap?.exists) return snap.data();
    }
  } catch { /* нет базы — дальше */ }
  try { const s = localStorage.getItem('pfZones_' + key); if (s) return JSON.parse(s); } catch { /* приватный режим */ }
  try { const r = await fetch(url ?? `zones/${key}.json`); if (r.ok) return await r.json(); } catch { /* нет файла */ }
  return null;
}
// Мешы модели в том же порядке, что в редакторе (контуры и карточки стиля пропускаем).
function zoneMeshes(model) {
  const out = []; model.traverse((m) => { if (m.isMesh && !m.userData.pfOutline && !m.userData.pfSkip && !m.userData.pfCard) out.push(m); });
  return out;
}
function triVerts(o, f) {
  const idx = o.geometry.index;
  return [0, 1, 2].map((k) => (idx ? idx.getX(f * 3 + k) : f * 3 + k));
}
// Точки разметки на живой модели (в текущей позе), мировые координаты.
export function zonePoints(model, data, zone) {
  const meshes = zoneMeshes(model); model.updateMatrixWorld(true); const out = [];
  for (const a of data?.pts ?? []) {
    if (zone && a[0] !== zone) continue;
    const o = meshes[a[1]]; if (!o) continue;
    const v = triVerts(o, a[2]).map((i) => o.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(o.matrixWorld));
    const b2 = 1 - a[3] - a[4];
    out.push({ z: a[0], w: v[0].multiplyScalar(a[3]).addScaledVector(v[1], a[4]).addScaledVector(v[2], b2), r: a[5] / 100 });
  }
  return out;
}
// Центры зоны слева/справа от средней линии лица, в осях кости (bone-local). side: вектор «вправо» в мире.
export function zoneSides(points, bone, origin, side) {
  const acc = { L: [], R: [] };
  for (const p of points) acc[p.w.clone().sub(origin).dot(side) < 0 ? 'L' : 'R'].push(p.w);
  const c = (arr) => (arr.length ? arr.reduce((s, v) => s.add(v), new THREE.Vector3()).multiplyScalar(1 / arr.length) : null);
  const L = c(acc.L), R = c(acc.R);
  return { L, R, Lb: L && bone.worldToLocal(L.clone()), Rb: R && bone.worldToLocal(R.clone()), n: [acc.L.length, acc.R.length] };
}
// Зона «светится» → до 8 центров свечения, привязанных к ближайшим костям. Материал сам рисует
// ступенчатое свечение вокруг них (pfGlowP, pfZoneC, pfZoneK) — точно по разметке и без зависимости от сетки.
export class ZoneGlow {
  constructor(model, data, { zone = 'glow', color = '#ffd27a', intensity = 1.2, merge = 0.035, pad = 1.7 } = {}) {
    this.mats = []; model.traverse((m) => { if (m.isMesh && !m.userData.pfSkip) for (const mm of [].concat(m.material)) if (mm.userData?.pf?.pfGlowP) this.mats.push(mm.userData.pf); });
    const pts = zonePoints(model, data, zone);
    const bones = []; model.traverse((b) => { if (b.isBone) bones.push(b); });
    const sc = (() => { let h = null; model.traverse((b) => { if (!h && b.isBone && /head$/i.test(b.name)) h = b; }); return h ? h.getWorldScale(new THREE.Vector3()).x / 2 : 1; })();
    const M = merge * Math.max(sc, 0.5);
    // жадная кластеризация: точки ближе M сливаются
    const cl = [];
    for (const p of pts) {
      let best = null, bd = Infinity; for (const c of cl) { const d = c.c.distanceTo(p.w); if (d < bd) { bd = d; best = c; } }
      if (best && (bd < M || cl.length >= 8)) { best.p.push(p); best.c.multiplyScalar(best.p.length - 1).add(p.w).multiplyScalar(1 / best.p.length); }
      else cl.push({ c: p.w.clone(), p: [p] });
    }
    this.anchors = cl.map((c) => {
      let rad = 0; for (const p of c.p) rad = Math.max(rad, c.c.distanceTo(p.w) + p.r * Math.max(sc, 0.5));
      let nb = null, nd = Infinity; for (const b of bones) { const d = b.getWorldPosition(new THREE.Vector3()).distanceTo(c.c); if (d < nd) { nd = d; nb = b; } }
      const a = new THREE.Object3D(); a.position.copy(c.c); (nb ?? model).attach(a);
      return { a, r: Math.max(rad * pad, 0.006) };
    });
    this.color = color; this.k = intensity; this.on = true;
    this.set({});
    this.update();
  }
  set({ color, intensity, on } = {}) {
    if (color) this.color = color; if (intensity != null) this.k = intensity; if (on != null) this.on = on;
    for (const u of this.mats) { u.pfZoneC.value.set(this.color); u.pfZoneK.value = this.on ? this.k : 0; u.pfGlowN.value = this.anchors.length; }
  }
  update() {
    const v = new THREE.Vector3();
    this.anchors.forEach((x, i) => { x.a.getWorldPosition(v); for (const u of this.mats) u.pfGlowP.value[i].set(v.x, v.y, v.z, x.r); });
  }
}
