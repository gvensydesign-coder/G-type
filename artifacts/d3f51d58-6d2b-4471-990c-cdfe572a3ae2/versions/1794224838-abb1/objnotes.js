// Пометки прямо по предметам: Michael рисует поверх объекта в 3D (как красным карандашом по скриншоту),
// у каждой пометки есть часть предмета, тема правила и подпись. Хранится в db: notes/<материал>, без db — в браузере.
// Я читаю эти пометки и превращаю их в правила штрихов, шейдеров и материалов.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export const CATS = [
  ['contour', 'Контур и аура'], ['shadowMarks', 'Штрихи в тени'], ['lightMarks', 'Штрихи на свету'], ['glint', 'Блик и линии из блика'],
  ['texture', 'Фактура материала'], ['fringe', 'Колосья, травинки, ворс'], ['color', 'Цвет и свет'], ['shape', 'Форма и силуэт'], ['other', 'Другое'],
];
const COLORS = ['#ff3b30', '#ffd23c', '#f4ead2', '#1a1210', '#4ad0ff'];
const uid = () => Math.random().toString(36).slice(2, 9);

export class ObjNotes {
  constructor({ scene, camera, renderer, canvas, controls, anchors, getMat, db }) {
    Object.assign(this, { scene, camera, renderer, canvas, controls, anchors, getMat });
    this.overlay = new THREE.Scene(); this.lines = new Map(); this.data = {}; this.dirty = new Set();
    this.active = null; this.on = false; this.visible = true; this.w = 4; this.color = COLORS[0]; this.cat = 'contour'; this.erase = false;
    this.ray = new THREE.Raycaster(); this.res = new THREE.Vector2(innerWidth, innerHeight);
    for (const k in anchors) this.data[k] = { notes: [], rule: '' };
    this.history = [];
    this.bind();
  }
  // предметы, по которым можно рисовать: меши с userData.matKind этого материала
  pickables(kind) {
    const out = [];
    this.scene.traverse((o) => {
      if (!(o.isMesh || o.isInstancedMesh) || o.userData.lineAura || !o.visible || !o.userData.part) return;
      if (o.userData.matKind === kind) out.push(o);
    });
    return out;
  }
  async load(db) {
    this.db = db;
    for (const k in this.anchors) {
      let d = null;
      if (db) { try { const s = await Promise.race([db.doc('notes/' + k).get(), new Promise((r) => setTimeout(() => r(null), 6000))]); if (s?.exists) d = s.data(); } catch { d = null; } }
      if (!d) { try { const s = localStorage.getItem('on_' + k); if (s) d = JSON.parse(s); } catch { d = null; } }
      if (d?.notes) this.data[k] = { notes: d.notes, rule: d.rule ?? '' };
      for (const n of this.data[k].notes) this.build(k, n);
    }
  }
  // ------------------------------------------------ рисование
  ndc(e) { const r = this.canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  hit(e) {
    this.camera.updateMatrixWorld(); this.ray.setFromCamera(this.ndc(e), this.camera);
    const hs = this.ray.intersectObjects(this.pickables(this.getMat()), false);
    return hs[0] ?? null;
  }
  bind() {
    const c = this.canvas; let st = null;
    c.addEventListener('pointerdown', (e) => {
      if (!this.on || e.button !== 0) return;
      e.preventDefault(); e.stopImmediatePropagation(); c.setPointerCapture(e.pointerId);
      const kind = this.getMat(); const a = this.anchors[kind];
      if (this.erase) { st = { erase: true }; this.eraseAt(e); return; }
      const h = this.hit(e);
      // точка на поверхности, а мимо предмета — на плоскости через предмет лицом к камере (так рисуется аура вокруг силуэта)
      const n = new THREE.Vector3(); this.camera.getWorldDirection(n);
      const p0 = h ? h.point.clone() : (() => { const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, new THREE.Vector3(a.x, a.y, a.z)); this.ray.setFromCamera(this.ndc(e), this.camera); return this.ray.ray.intersectPlane(pl, new THREE.Vector3()); })();
      if (!p0) return;
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p0);
      let note = this.active && this.data[kind].notes.find((x) => x.id === this.active);
      if (!note) { note = { id: uid(), part: h?.object.userData.part ?? 'Вокруг предмета', cat: this.cat, text: '', strokes: [] }; this.data[kind].notes.push(note); this.active = note.id; }
      const s = { c: this.color, w: this.w, pts: [] }; note.strokes.push(s);
      this.history.push({ kind, id: note.id });
      st = { kind, note, s, plane, a }; this.addPt(st, h ? h.point.addScaledVector(h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : n.clone().negate(), 0.008) : p0);
      this.onChange?.();
    }, { capture: true });
    c.addEventListener('pointermove', (e) => {
      if (!st) return; if (st.erase) { this.eraseAt(e); return; }
      const h = this.hit(e); let p;
      if (h) p = h.point.addScaledVector(h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(), 0.008);
      else { this.ray.setFromCamera(this.ndc(e), this.camera); p = this.ray.ray.intersectPlane(st.plane, new THREE.Vector3()); }
      if (!p) return;
      const P = st.s.pts, k = P.length; const q = new THREE.Vector3(p.x - st.a.x, p.y - st.a.y, p.z - st.a.z);
      if (k && Math.hypot(q.x - P[k - 3], q.y - P[k - 2], q.z - P[k - 1]) < 0.006) return;
      this.addPt(st, p);
    }, { capture: true });
    const end = () => { if (!st) return; const was = st; st = null; if (!was.erase) { this.dirty.add(was.kind); this.onChange?.(); } };
    c.addEventListener('pointerup', end, { capture: true }); c.addEventListener('pointercancel', end, { capture: true });
  }
  addPt(st, p) { st.s.pts.push(+(p.x - st.a.x).toFixed(4), +(p.y - st.a.y).toFixed(4), +(p.z - st.a.z).toFixed(4)); this.build(st.kind, st.note); }
  eraseAt(e) {
    const kind = this.getMat(); const a = this.anchors[kind]; const m = this.ndc(e); const v = new THREE.Vector3(); let changed = false;
    for (const n of this.data[kind].notes) {
      const keep = n.strokes.filter((s) => { for (let i = 0; i < s.pts.length; i += 3) { v.set(s.pts[i] + a.x, s.pts[i + 1] + a.y, s.pts[i + 2] + a.z).project(this.camera); if (Math.hypot(v.x - m.x, (v.y - m.y) * innerHeight / innerWidth) < 0.02) return false; } return true; });
      if (keep.length !== n.strokes.length) { n.strokes = keep; changed = true; this.build(kind, n); }
    }
    if (changed) { this.data[kind].notes = this.data[kind].notes.filter((n) => n.strokes.length || n.text); this.dirty.add(kind); this.onChange?.(); }
  }
  undo() {
    const h = this.history.pop(); if (!h) return; const n = this.data[h.kind].notes.find((x) => x.id === h.id); if (!n) return;
    n.strokes.pop(); if (!n.strokes.length && !n.text) this.remove(h.kind, n.id); else this.build(h.kind, n);
    this.dirty.add(h.kind); this.onChange?.();
  }
  remove(kind, id) {
    this.data[kind].notes = this.data[kind].notes.filter((x) => x.id !== id);
    const g = this.lines.get(id); if (g) { this.overlay.remove(g); g.traverse((o) => o.geometry?.dispose()); this.lines.delete(id); }
    if (this.active === id) this.active = null; this.dirty.add(kind);
  }
  // ------------------------------------------------ показ: толстые линии поверх картинки (после пост-обработки, не размываются)
  build(kind, note) {
    let g = this.lines.get(note.id); if (g) { this.overlay.remove(g); g.traverse((o) => o.geometry?.dispose()); }
    g = new THREE.Group(); g.userData.kind = kind; this.lines.set(note.id, g); this.overlay.add(g);
    const a = this.anchors[kind];
    for (const s of note.strokes) {
      if (s.pts.length < 3) continue;
      const pos = []; for (let i = 0; i < s.pts.length; i += 3) pos.push(s.pts[i] + a.x, s.pts[i + 1] + a.y, s.pts[i + 2] + a.z);
      if (pos.length === 3) pos.push(pos[0] + 0.002, pos[1] + 0.002, pos[2]);
      const geo = new LineGeometry(); geo.setPositions(pos);
      const mat = new LineMaterial({ color: s.c, linewidth: s.w, worldUnits: false, depthTest: false, transparent: true });
      mat.resolution.copy(this.res); const l = new Line2(geo, mat); l.computeLineDistances(); g.add(l);
    }
    this.highlight();
  }
  highlight() { for (const [id, g] of this.lines) g.traverse((o) => { if (o.material) o.material.opacity = !this.active || id === this.active || !this.on ? 1 : 0.55; }); }
  render() {
    if (!this.visible || !this.overlay.children.length) return;
    this.renderer.getDrawingBufferSize(this.res);
    this.overlay.traverse((o) => o.material?.resolution?.copy(this.res));
    const ac = this.renderer.autoClear; this.renderer.autoClear = false; this.renderer.setRenderTarget(null);
    this.renderer.clearDepth(); this.renderer.render(this.overlay, this.camera); this.renderer.autoClear = ac;
  }
  async save() {
    let ok = true;
    for (const k of [...this.dirty]) {
      const d = this.data[k];
      try { localStorage.setItem('on_' + k, JSON.stringify(d)); } catch { /* браузер не дал */ }
      if (this.db) { try { await this.db.doc('notes/' + k).set(d); } catch { ok = false; } }
    }
    this.dirty.clear(); return ok;
  }
  // ------------------------------------------------ панель
  mount(root, { onSaved }) {
    this.root = root;
    root.innerHTML = `
      <p class="hm-hint">Рисуй мышью или пальцем прямо по предмету в сцене, как карандашом по скриншоту. Можно рисовать и мимо предмета, вокруг силуэта. Каждая пометка — правило для меня: выбери тему и допиши словами, что хочешь.</p>
      <div class="grp"><b>Тема пометки</b><div class="row" id="onCats"></div></div>
      <div class="row on-pen"><span class="on-sw" id="onCols"></span><label class="hm-sl">Толщина <input id="onW" type="range" min="1.5" max="12" step="0.5" value="4"></label></div>
      <div class="row"><button id="onNew" class="aura">Новая пометка</button><button id="onErase">Ластик</button><button id="onUndo">Отменить</button></div>
      <div class="grp"><b>Подпись к пометке</b><textarea id="onText" rows="2" placeholder="Например: колосья торчат вверх, обвести их светлым контуром"></textarea></div>
      <div class="grp"><b>Пометки этого предмета</b><div id="onList" class="on-list"></div></div>
      <div class="grp"><b>Общее правило для материала</b><textarea id="onRule" rows="3" placeholder="Например: сено пушистое, по краю торчат острые соломинки, тени тёплые"></textarea></div>
      <div class="row on-save"><button id="onSave" class="aura">Сохранить пометки</button><label class="ck"><input type="checkbox" id="onShow" checked> Показывать пометки</label></div>
      <p class="hm-hint" id="onSaved"></p>`;
    const $ = (s) => root.querySelector(s);
    for (const [k, n] of CATS) { const b = document.createElement('button'); b.textContent = n; b.dataset.k = k; b.onclick = () => { this.cat = k; const nt = this.note(); if (nt) { nt.cat = k; this.dirty.add(this.getMat()); } this.renderUI(); }; $('#onCats').appendChild(b); }
    for (const c of COLORS) { const b = document.createElement('button'); b.className = 'on-c'; b.style.background = c; b.title = 'Цвет'; b.dataset.c = c; b.onclick = () => { this.color = c; this.renderUI(); }; $('#onCols').appendChild(b); }
    $('#onW').oninput = (e) => { this.w = +e.target.value; };
    $('#onNew').onclick = () => { this.active = null; this.highlight(); this.renderUI(); };
    $('#onErase').onclick = () => { this.erase = !this.erase; this.renderUI(); };
    $('#onUndo').onclick = () => this.undo();
    $('#onText').oninput = (e) => { let n = this.note(); const kind = this.getMat();
      if (!n) { n = { id: uid(), part: 'Весь предмет', cat: this.cat, text: '', strokes: [] }; this.data[kind].notes.push(n); this.active = n.id; }
      n.text = e.target.value; this.dirty.add(kind); this.renderList(); this.renderSaved(); };
    $('#onRule').oninput = (e) => { this.data[this.getMat()].rule = e.target.value; this.dirty.add(this.getMat()); this.renderSaved(); };
    $('#onShow').onchange = (e) => { this.visible = e.target.checked; };
    $('#onSave').onclick = async () => { const ok = await this.save(); $('#onSaved').textContent = ok ? (this.db ? 'Сохранено. Я прочитаю пометки и переведу их в правила штрихов и материалов.' : 'Сохранено в этом браузере (общее хранилище недоступно).') : 'Не удалось сохранить в общее хранилище, копия осталась в браузере.'; onSaved?.(); };
    this.onChange = () => this.renderUI();
    this.renderUI();
  }
  note() { return this.active ? this.data[this.getMat()].notes.find((x) => x.id === this.active) : null; }
  renderSaved() { const el = this.root?.querySelector('#onSaved'); if (el) el.textContent = this.dirty.size ? 'Есть несохранённые пометки.' : ''; }
  renderUI() {
    if (!this.root) return; const $ = (s) => this.root.querySelector(s); const n = this.note();
    if (n) this.cat = n.cat;
    $('#onCats').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === this.cat));
    $('#onCols').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === this.color));
    $('#onErase').classList.toggle('on', this.erase);
    if (document.activeElement !== $('#onText')) $('#onText').value = n?.text ?? '';
    if (document.activeElement !== $('#onRule')) $('#onRule').value = this.data[this.getMat()].rule ?? '';
    this.renderList(); this.renderSaved(); this.highlight();
  }
  renderList() {
    const L = this.root.querySelector('#onList'); L.innerHTML = ''; const kind = this.getMat(); const notes = this.data[kind].notes;
    if (!notes.length) { L.innerHTML = '<p class="hm-hint">Пока пусто.</p>'; return; }
    notes.forEach((n, i) => {
      const row = document.createElement('div'); row.className = 'on-item' + (n.id === this.active ? ' on' : '');
      const cat = CATS.find((c) => c[0] === n.cat)?.[1] ?? '';
      row.innerHTML = `<span class="on-dot" style="background:${n.strokes[0]?.c ?? '#888'}"></span><span class="on-t"><b>${i + 1}. ${cat}</b> · ${n.part}<br><i></i></span><button title="Удалить">×</button>`;
      row.querySelector('i').textContent = n.text || 'без подписи';
      row.onclick = () => { this.active = n.id; this.renderUI(); };
      row.querySelector('button').onclick = (e) => { e.stopPropagation(); this.remove(kind, n.id); this.renderUI(); };
      L.appendChild(row);
    });
  }
}
