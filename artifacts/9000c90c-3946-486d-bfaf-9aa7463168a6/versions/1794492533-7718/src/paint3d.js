// Рисование в 3D: штрих кистью мастерской становится лентой в пространстве сцены превью.
// Кисть, толщина и ручки — из редактора; текстура ленты — тот же штрих, нарисованный brushkit вдоль полосы.
// Ленты «живые»: кипят шагами 8 к/с, колышутся от закреплённого начала, расступаются у курсора, прорисовываются заново.
// Хранение: db paint3d/<id> (поле scene — к какой сцене превью относится); экспорт JSON для Godot (FORMAT.md, раздел «3D-штрихи»).
import * as THREE from 'three';
import { drawStroke } from './brushkit.js';
import { shared } from './scribmat.js';

const VS = /* glsl */`
attribute float aSide; attribute float aU; attribute vec3 aT; attribute vec3 aN;
uniform float uTime, uStep, uW, uLen, uBoil, uSway, uReact, uFace, uSeed; uniform vec3 uCursor; uniform float uCurOn;
varying vec2 vUv;
vec3 h3(float n){ return fract(sin(vec3(n, n + 1.7, n + 3.1) * 43758.5453)) - 0.5; }
void main(){
  vec3 P = position; vec3 T = normalize(aT);
  // колыхание: начало штриха закреплено, кончик ходит сильнее
  float k = aU * aU;
  P += vec3(sin(uTime * 1.6 + P.y * 1.3 + uSeed), 0.35 * sin(uTime * 2.1 + P.x * 1.7 + uSeed * 2.0), cos(uTime * 1.3 + P.x * 0.9 + uSeed)) * uSway * k * min(uLen, 2.0) * 0.08;
  // отклик на курсор: лента расступается вокруг точки под мышью
  if (uCurOn > 0.5 && uReact > 0.0) { vec3 d = P - uCursor; float r2 = dot(d, d); float f = uReact * exp(-r2 / 0.18); P += normalize(d + 1e-4) * f * 0.28 * (0.35 + aU); }
  // кипение шагами
  P += h3(floor(uStep) * 7.31 + aU * 23.0 + uSeed) * uBoil * uW * 0.35;
  vec3 V = normalize(cameraPosition - P);
  vec3 S = uFace > 0.5 ? normalize(cross(T, aN)) : normalize(cross(T, V));
  P += S * aSide * uW * 0.5;
  vUv = vec2(aU, aSide * 0.5 + 0.5);
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;
const FS = /* glsl */`
uniform sampler2D uMap; uniform float uGrow, uOp; varying vec2 vUv;
void main(){
  if (vUv.x > uGrow) discard;
  vec4 c = texture2D(uMap, vec2(0.03 + vUv.x * 0.94, vUv.y));
  if (c.a < 0.02) discard;
  gl_FragColor = vec4(c.rgb, c.a * uOp);
  #include <colorspace_fragment>
}`;

const uid = () => 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export class Paint3D {
  constructor(pv, { getBrush, getColor, sceneKey, db, onChange, onStroke, onErase, width, keys = true }) {
    this.onStroke = onStroke; this.onErase = onErase; this.widthFn = width;
    this.pv = pv; this.getBrush = getBrush; this.getColor = getColor; this.sceneKey = sceneKey; this.db = db; this.onChange = onChange ?? (() => {});
    this.group = new THREE.Group(); this.group.renderOrder = 6; pv.scene.add(this.group);
    this.items = new Map(); this.undo = [];
    this.on = false; this.where = 'surface'; this.face = 'camera'; this.width = 0.06; this.depth = 0;
    this.live = { boil: 1, sway: 0.6, react: 1, grow: 0 };
    this.tool = 'draw';
    this.cursor = { uCursor: { value: new THREE.Vector3() }, uCurOn: { value: 0 } };
    this.ray = new THREE.Raycaster(); this.m = new THREE.Vector2();
    const cv = pv.renderer.domElement;
    cv.addEventListener('pointerdown', (e) => this.down(e));
    cv.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    cv.addEventListener('pointerleave', () => { this.cursor.uCurOn.value = 0; });
    if (keys) document.addEventListener('keydown', (e) => { if (!this.on || this.pv.root.offsetParent === null) return; if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); e.stopPropagation(); this.undoLast(); } }, true);
  }
  setOn(v) {
    this.on = v; const c = this.pv.ctl;
    c.mouseButtons = v ? { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE } : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.pv.root.classList.toggle('painting', v);
  }
  // какие штрихи видны: только своей сцены превью
  sync() { const k = this.sceneKey(); for (const it of this.items.values()) it.mesh.visible = it.s.scene === k; }

  ndc(e) { const r = this.pv.renderer.domElement.getBoundingClientRect(); this.m.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); this.ray.setFromCamera(this.m, this.pv.camera); }
  hitSurface() {
    const objs = this.pv.pickables.filter((o) => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
    const h = this.ray.intersectObjects(objs, false)[0]; if (!h) return null;
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    return { p: h.point.clone().addScaledVector(n, 0.015 + this.width * 0.15), n };
  }
  // точка штриха по текущему правилу: по предметам / в воздухе (плоскость к камере)
  point(start) {
    // по предметам; если луч соскочил на дальний предмет (скачок больше 0,5 м), штрих продолжается в плоскости — без длинных перелётов
    if (this.where === 'surface') { const h = this.hitSurface(); if (h && (start || !this.last || h.p.distanceTo(this.last) < Math.max(0.5, this.width * 8))) { if (start) this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(this.pv.camera.getWorldDirection(new THREE.Vector3()).negate(), h.p); else this.plane.setFromNormalAndCoplanarPoint(this.plane.normal, h.p); return h; } }
    if (start || !this.plane) {
      const dir = this.pv.camera.getWorldDirection(new THREE.Vector3());
      const h = this.where === 'air' ? null : this.hitSurface();
      const anchor = h ? h.p : this.pv.ctl.target.clone().addScaledVector(dir, this.depth);
      if (this.where === 'air') anchor.copy(this.pv.ctl.target).addScaledVector(dir, this.depth);
      this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir.clone().negate(), anchor);
    }
    const p = new THREE.Vector3(); if (!this.ray.ray.intersectPlane(this.plane, p)) return null;
    return { p, n: this.plane.normal.clone() };
  }

  down(e) {
    if (!this.on || e.button !== 0) return; this.ndc(e);
    if (this.tool === 'erase' || this.getBrush().b.t === 'eraser') { this.eraseAt(e); return; }
    if (this.widthFn) this.width = this.widthFn();
    this.last = null; const q = this.point(true); if (!q) return;
    e.preventDefault(); this.pv.renderer.domElement.setPointerCapture?.(e.pointerId);
    const b = this.getBrush();
    this.cur = { id: uid(), scene: this.sceneKey(), pts: [...q.p.toArray()], ns: [...q.n.toArray()], pr: [e.pressure || 0.6], w: this.width, b: b.b, c: this.getColor(), face: this.face, live: { ...this.live }, sd: Math.floor(Math.random() * 1e5), t: Date.now() };
    this.last = q.p; this.n0 = 0;
  }
  move(e) {
    if (!this.on) return; this.ndc(e);
    const h = this.hitSurface(); if (h) { this.cursor.uCursor.value.copy(h.p); this.cursor.uCurOn.value = 1; }
    else { const p = new THREE.Vector3(); if (this.ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(this.pv.camera.getWorldDirection(new THREE.Vector3()).negate(), this.pv.ctl.target), p)) { this.cursor.uCursor.value.copy(p); this.cursor.uCurOn.value = 1; } }
    if (!this.cur) return;
    const q = this.point(false); if (!q) return;
    if (q.p.distanceTo(this.last) < Math.max(0.01, this.width * 0.3)) return;
    this.cur.pts.push(...q.p.toArray()); this.cur.ns.push(...q.n.toArray()); this.cur.pr.push(e.pressure || 0.6); this.last = q.p;
    if (++this.n0 % 3 === 0) this.build(this.cur, true);
  }
  up() {
    if (!this.cur) return; const s = this.cur; this.cur = null;
    if (s.pts.length < 6) { this.drop(s.id); return; }
    this.build(s, false);
    if (this.onStroke) { this.onStroke(s); return; }
    this.undo.push(s.id); this.persist(s); this.onChange();
  }

  // текстура ленты: штрих кистью вдоль полосы, длина полосы — по длине штриха
  texture(s, len) {
    const H = 64; const W = Math.max(128, Math.min(2048, Math.round(len / s.w * H * 0.9 / 32) * 32));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const n = s.pr.length; const pts = [], pr = [];
    const U = this.arc(s); for (let i = 0; i < n; i++) { pts.push(0.03 + U[i] * 0.94, 0.5); pr.push(s.pr[i]); }
    drawStroke(g, { pts, pr, w: (H * 0.62) / W, b: s.b, sd: s.sd }, W, s.c, { sy: H });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  arc(s) { const P = s.pts; const n = P.length / 3; const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(P[i * 3] - P[i * 3 - 3], P[i * 3 + 1] - P[i * 3 - 2], P[i * 3 + 2] - P[i * 3 - 1])); const tot = L[n - 1] || 1; return L.map((v) => v / tot).concat([tot]); }
  build(s, live) {
    const P = s.pts; const n = P.length / 3; if (n < 2) return;
    const U = this.arc(s); const len = U[n];
    const pos = [], side = [], au = [], at = [], an = [], idx = [];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const T = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]];
      for (const sd of [-1, 1]) { pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); side.push(sd); au.push(U[i]); at.push(...T); an.push(s.ns[i * 3], s.ns[i * 3 + 1], s.ns[i * 3 + 2]); }
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1)); g.setAttribute('aU', new THREE.Float32BufferAttribute(au, 1));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 3)); g.setAttribute('aN', new THREE.Float32BufferAttribute(an, 3)); g.setIndex(idx); g.computeBoundingSphere(); g.boundingSphere.radius += 1;
    let it = this.items.get(s.id);
    const tex = (!live || !it || it.n !== n) ? this.texture(s, len) : it.mat.uniforms.uMap.value;
    if (!it) {
            const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uMap: { value: tex }, uTime: { value: 0 }, uStep: shared.uStep, uW: { value: s.w }, uLen: { value: len }, uBoil: { value: s.live.boil }, uSway: { value: s.live.sway }, uReact: { value: s.live.react }, uFace: { value: s.face === 'ribbon' ? 1 : 0 }, uSeed: { value: (s.sd % 997) * 0.37 }, uGrow: { value: 1 }, uOp: { value: 1 }, ...this.cursor } });
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 6; this.group.add(mesh);
      it = { s, mesh, mat, n }; this.items.set(s.id, it);
    } else { const old = it.mesh.geometry; it.mesh.geometry = g; old.dispose(); if (tex !== it.mat.uniforms.uMap.value) { it.mat.uniforms.uMap.value.dispose(); it.mat.uniforms.uMap.value = tex; } it.n = n; it.s = s; }
    it.mat.uniforms.uLen.value = len; it.born = it.born ?? performance.now() / 1000;
  }
  frame(t) {
    for (const it of this.items.values()) {
      const u = it.mat.uniforms; u.uTime.value = t;
      // прорисовка: штрих заново «пишется» за 1,2 с и держится 2,5 с
      if (it.s.live.grow) { const c = (t + (it.s.sd % 50) * 0.07) % 3.7; u.uGrow.value = Math.min(1, c / 1.2); } else u.uGrow.value = 1;
    }
  }
  setLive(k, v) { this.live[k] = v; }
  // правка «живости» уже нарисованных штрихов текущей сцены
  applyLiveAll() { const k = this.sceneKey(); for (const it of this.items.values()) if (it.s.scene === k) { it.s.live = { ...this.live }; const u = it.mat.uniforms; u.uBoil.value = it.s.live.boil; u.uSway.value = it.s.live.sway; u.uReact.value = it.s.live.react; this.persist(it.s); } }

  eraseAt(e) {
    const r = this.pv.renderer.domElement.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const v = new THREE.Vector3();
    let best = null, bd = 18; const k = this.sceneKey();
    for (const it of this.items.values()) {
      if (it.s.scene !== k) continue; const P = it.s.pts;
      for (let i = 0; i < P.length; i += 3) { v.set(P[i], P[i + 1], P[i + 2]).project(this.pv.camera); const x = (v.x * 0.5 + 0.5) * r.width, y = (-v.y * 0.5 + 0.5) * r.height; const d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = it; } }
    }
    if (best) { if (this.onErase) { this.onErase(best.s.id); return; } this.remove(best.s.id); this.onChange(); }
  }
  undoLast() { const k = this.sceneKey(); for (let i = this.undo.length - 1; i >= 0; i--) { const it = this.items.get(this.undo[i]); if (it && it.s.scene === k) { this.undo.splice(i, 1); this.remove(it.s.id); this.onChange(); return; } } }
  clearScene() { const k = this.sceneKey(); for (const it of [...this.items.values()]) if (it.s.scene === k) this.remove(it.s.id); this.onChange(); }
  drop(id) { const it = this.items.get(id); if (!it) return; this.group.remove(it.mesh); it.mesh.geometry.dispose(); it.mat.uniforms.uMap.value.dispose(); it.mat.dispose(); this.items.delete(id); }
  remove(id) {
    this.drop(id);
    if (this.db) this.db.doc('paint3d/' + id).delete().catch((e) => console.warn(e)); else this.saveLocal();
  }
  count() { const k = this.sceneKey(); let n = 0; for (const it of this.items.values()) if (it.s.scene === k) n++; return n; }

  // хранение: компактно (мм), один штрих — один документ
  pack(s) { return { ...s, pts: s.pts.map((x) => Math.round(x * 1000) / 1000), ns: s.ns.map((x) => Math.round(x * 100) / 100), pr: s.pr.map((x) => Math.round(x * 100) / 100) }; }
  persist(s) { if (this.db) this.db.doc('paint3d/' + s.id).set(this.pack(s)).catch((e) => console.warn(e)); else this.saveLocal(); }
  saveLocal() { try { localStorage.setItem('ss-paint3d', JSON.stringify([...this.items.values()].map((it) => this.pack(it.s)))); } catch { /* нет */ } }
  async load() {
    let list = [];
    if (this.db) { try { const snap = await this.db.collection('paint3d').get(); for (const d of snap.docs ?? []) { const v = d.data(); if (v?.id) list.push(v); } } catch (e) { console.warn('paint3d', e); } }
    else { try { list = JSON.parse(localStorage.getItem('ss-paint3d') ?? '[]'); } catch { /* нет */ } }
    list.sort((a, b) => a.t - b.t); for (const s of list) this.build(s, false); this.sync(); this.onChange();
  }
  exportJSON() {
    return JSON.stringify({ format: 'skazanie-paint3d', version: 1, units: 'm', note: 'pts — точки ленты в мировых координатах сцены превью; w — ширина, м; face camera — лента к камере, ribbon — лента в плоскости рисования (ns — нормали); b — кисть мастерской; live — кипение/колыхание/отклик/прорисовка.', strokes: [...this.items.values()].filter((it) => it.s.scene === this.sceneKey()).map((it) => this.pack(it.s)) }, null, 1);
  }
}
