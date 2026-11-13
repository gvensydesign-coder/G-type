// 3D-превью: предмет каждого класса в рисованном стиле, почеркушки из библиотеки ложатся по свету и тени.
// Орбита мышью здесь можно — это лаборатория, не игра.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CLASSES, CLS } from './library.js';
import { buildEntrance, buildNight, RefPost, gradientTex } from './refscene.js';
import { shared, scribMaterial, auraMaterial, inkMaterial, cellSprite, STEP_FPS } from './scribmat.js';

export const TIMES = {
  morning: { name: 'Утро', sun: [-0.8, 0.3, 0.35], col: [1.3, 0.95, 0.68], amb: [0.12, 0.13, 0.17], fog: '#3a3a48', sky: '#5a5068' },
  day: { name: 'День', sun: [0.45, 0.75, 0.35], col: [1.2, 1.1, 0.92], amb: [0.16, 0.2, 0.25], fog: '#4a5e66', sky: '#4a6e7a' },
  evening: { name: 'Вечер', sun: [0.8, 0.22, -0.45], col: [1.4, 0.78, 0.48], amb: [0.08, 0.07, 0.12], fog: '#2a1c24', sky: '#4a2a34' },
  night: { name: 'Ночь (логово)', sun: [0.25, 0.85, -0.45], col: [0.68, 0.78, 0.58], amb: [0.05, 0.06, 0.1], fog: '#183a30', sky: '#2e5a52' },
};

// стили сцены. «Логово» — наш одобренный вид (время суток кнопками). Остальные — по референсам ivanponivanov (refs/ivanov, REF-ANALYSIS.md):
// без туши, тень одним жёстким пятном, свет одной краской, линия света только у силуэта со стороны фонаря.
export const STYLES = {
  lair: { name: 'Логово (наш)', time: true, ink: 1, inkC: '#0c0e16', soft: 1, rimW: 0, gradeK: 0, aura: true },
  entrance: { name: 'Подъезд днём (реф.)', sun: [-0.55, 0.5, 0.65], col: [1.0, 0.9, 0.74], amb: [0.2, 0.15, 0.12], shadow: '#7a5646', fog: '#d9b88a', sky: '#efe0b4',
    ink: 0, soft: 0.22, rimW: 0, gradeC: '#f2c48e', gradeK: 0.25, aura: false, ground: 'floor' },
  night: { name: 'Двор, синяя ночь (реф.)', sun: [0.65, 0.45, -0.35], col: [0.6, 0.68, 0.92], amb: [0.18, 0.24, 0.44], shadow: '#2b3b7c', fog: '#2c4f98', sky: '#2b509a',
    ink: 0, soft: 0.25, rimW: 0.2, rimC: '#f2a03c', gradeC: '#5f8ad6', gradeK: 0.55, aura: false, ground: 'snow' },
};

function rockGeo(seed = 1, r = 0.8) {
  const g = new THREE.IcosahedronGeometry(r, 3); const p = g.attributes.position; const v = new THREE.Vector3();
  const H = (x) => { const s = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); const k = 1 + 0.12 * Math.sin(n.x * 5 + seed) * Math.cos(n.z * 4) + 0.08 * Math.sin(n.y * 9 + seed * 2) + (H(Math.round(n.x * 6) + Math.round(n.y * 6) * 7 + Math.round(n.z * 6) * 13) - 0.5) * 0.12; v.copy(n).multiplyScalar(r * k); v.y *= 0.75; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function clothGeo() {
  const g = new THREE.PlaneGeometry(1.6, 1.8, 32, 36); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const sag = (0.9 - y) / 1.8; p.setZ(i, Math.sin(x * 9) * 0.07 * sag + Math.sin(x * 3.1 + y * 2) * 0.05 * sag); }
  g.computeVertexNormals(); return g;
}

export class Preview {
  constructor(root, lib, atl, notes) {
    this.root = root; this.lib = lib; this.atl = atl; this.notes = notes;
    this.cls = 'stone'; this.mode = 'one'; this.time = 'night'; this.flags = { marks: true, ink: true, aura: true, boil: true }; this.noteMode = false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    root.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 300); this.camera.position.set(3.2, 2.2, 4.2);
    this.ctl = new OrbitControls(this.camera, this.renderer.domElement); this.ctl.target.set(0, 0.6, 0); this.ctl.enableDamping = true; this.ctl.maxPolarAngle = 1.5; this.ctl.minDistance = 1.5; this.ctl.maxDistance = 40;
    this.mats = []; this.auras = []; this.sprites = []; this.items = []; this.pickables = [];
    this.pins = document.createElement('div'); this.pins.className = 'pins3d'; root.append(this.pins);
    this.build();
    this.setTime(this.time);
    new ResizeObserver(() => this.resize()).observe(root);
    const ray = new THREE.Raycaster(); const m = new THREE.Vector2();
    this.renderer.domElement.addEventListener('click', (e) => {
      if (!this.noteMode || this.paint?.on) return; const r = this.renderer.domElement.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(m, this.camera); const hit = ray.intersectObjects(this.pickables, false)[0]; if (!hit) return;
      let st = hit.object; while (st && !st.userData.stand) st = st.parent;
      const cls = st ? st.userData.cls : hit.object.userData.cls; this.noteMode = false; this.onNoteDone?.();
      const pt = st ? st.worldToLocal(hit.point.clone()) : hit.point;
      this.notes.ask({ where: 'preview', cls, local: !!st, p: pt.toArray().map((x) => +x.toFixed(3)), cam: this.camera.position.toArray().map((x) => +x.toFixed(2)), time: this.time, label: `${CLS[cls]?.name ?? cls} · ${TIMES[this.time].name}` });
    });
    this.clock = new THREE.Clock(); this.running = false;
  }
  start() { if (this.running) return; this.running = true; this.resize(); const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); }; loop(); }
  stop() { this.running = false; }
  resize() { const w = this.root.clientWidth, h = this.root.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  mat(cls, o = {}) { const m = scribMaterial(this.atl, this.lib, cls, o); this.mats.push(m); return m; }
  // меш класса: сам предмет + контур + аура
  add(parent, geo, cls, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, ink = 0.018, aura = true, metal = false, base, shade, emis, flat, worldK, side, rim = true, marks = true } = {}) {
    const m = this.mat(cls, { metal, base, shade, emis, flat, worldK, marks }); if (side) m.side = side; if (!rim) m.uniforms.uRimC.value.set(0x000000);
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(...pos); mesh.rotation.set(...rot); mesh.scale.setScalar(scale); mesh.userData.cls = cls; parent.add(mesh); this.pickables.push(mesh);
    if (ink) { const im = new THREE.Mesh(geo, inkMaterial(ink / scale)); im.userData.ink = true; mesh.add(im); }
    if (aura) { const am = auraMaterial(this.atl, this.lib, cls, 0.5 / scale); const a = new THREE.Mesh(geo, am); a.userData.aura = true; a.renderOrder = 2; mesh.add(a); this.auras.push({ mesh, mat: am }); }
    return mesh;
  }
  sprite(parent, cls, role, pos, size, o = {}) { const s = cellSprite(this.atl, cls, role, o); s.position.set(...pos); s.scale.set(size, size, 1); parent.add(s); this.sprites.push(s); return s; }

  stand(k) {
    const g = new THREE.Group(); g.userData.cls = k; g.userData.stand = true;
    const C = CLS[k];
    if (k === 'metal') {
      const prof = []; for (let i = 0; i <= 16; i++) { const t = i / 16; prof.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI) * 0.55 + t * 0.05, t * 0.95)); }
      this.add(g, new THREE.LatheGeometry(prof, 40), k, { pos: [0, 0.05, 0], metal: true });
      this.add(g, new THREE.TorusGeometry(0.42, 0.04, 10, 40), k, { pos: [0, 1.0, 0], rot: [Math.PI / 2, 0, 0], metal: true, aura: false });
      this.add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.05, 40), k, { pos: [0.95, 0.5, 0.2], rot: [0, 0.4, Math.PI / 2.2], metal: true });
    } else if (k === 'wood') {
      this.add(g, new THREE.CylinderGeometry(0.32, 0.36, 1.9, 24, 6), k, { pos: [0, 0.34, 0], rot: [0, 0.3, Math.PI / 2] });
      this.add(g, new THREE.BoxGeometry(0.5, 1.4, 0.12, 4, 8, 1), k, { pos: [0.4, 0.75, -0.6], rot: [0.08, -0.4, 0.05] });
    } else if (k === 'stone') {
      this.add(g, rockGeo(1, 0.8), k, { pos: [0, 0.5, 0] }); this.add(g, rockGeo(4, 0.38), k, { pos: [0.95, 0.24, 0.35] });
    } else if (k === 'earth') {
      const geo = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); this.add(g, geo, k, { pos: [0, -0.05, 0], scale: 1, ink: 0.012 }); g.children[0].scale.set(1.2, 0.5, 1);
    } else if (k === 'grass') {
      for (const [x, y, z, r] of [[0, 0.45, 0, 0.55], [0.5, 0.35, 0.2, 0.42], [-0.45, 0.32, 0.15, 0.4], [0.1, 0.75, -0.1, 0.38], [0.2, 0.3, -0.45, 0.35]]) this.add(g, new THREE.IcosahedronGeometry(r, 3), k, { pos: [x, y, z], ink: 0.012 });
    } else if (k === 'hay') {
      this.add(g, new THREE.CylinderGeometry(0.75, 0.85, 0.7, 28, 4), k, { pos: [0, 0.35, 0], aura: false });
      this.add(g, new THREE.ConeGeometry(0.8, 0.9, 28, 4), k, { pos: [0, 1.15, 0] });
    } else if (k === 'cloth') {
      this.add(g, new THREE.CylinderGeometry(0.04, 0.04, 2.0, 10), 'wood', { pos: [0, 1.85, 0], rot: [0, 0, Math.PI / 2], aura: false });
      this.add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10), 'wood', { pos: [-0.95, 0.95, 0], aura: false }); this.add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.9, 10), 'wood', { pos: [0.95, 0.95, 0], aura: false });
      this.add(g, clothGeo(), k, { pos: [0, 0.92, 0], side: THREE.DoubleSide, ink: 0 });
    } else if (k === 'water') {
      this.add(g, new THREE.CircleGeometry(1.3, 48), k, { pos: [0, 0.03, 0], rot: [-Math.PI / 2, 0, 0], ink: 0, aura: false, rim: false });
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; this.add(g, rockGeo(i + 3, 0.2 + (i % 3) * 0.05), 'stone', { pos: [Math.cos(a) * 1.4, 0.08, Math.sin(a) * 1.4], aura: false, ink: 0.01 }); }
      for (let i = 0; i < 4; i++) this.sprite(g, k, 'glint', [Math.cos(i * 1.7) * 0.7, 0.08, Math.sin(i * 2.3) * 0.6], 0.45, { additive: true });
      this.sprite(g, k, 'fill', [0, 0.06, 0], 1.6, { opacity: 0.8 });
    } else if (k === 'sky') {
      this.add(g, new THREE.SphereGeometry(0.9, 40, 24), k, { pos: [0, 1.0, 0], flat: true });
      this.sprite(g, k, 'fill', [0, 1.0, 0.95], 1.4, { opacity: 0.9 });
    } else if (k === 'light') {
      this.add(g, new THREE.CylinderGeometry(0.05, 0.07, 1.5, 10), 'wood', { pos: [0, 0.75, 0], aura: false });
      this.add(g, new THREE.SphereGeometry(0.2, 24, 16), k, { pos: [0, 1.62, 0], emis: '#ffd890', aura: true });
      this.sprite(g, k, 'light', [0, 1.62, 0.05], 1.5, { additive: true }); this.sprite(g, k, 'fill', [0, 1.62, 0.1], 1.0, { additive: true });
      this.sprite(g, k, 'shadow', [0, 0.04, 0.05], 1.8, { opacity: 0.8 });
    } else if (k === 'fire') {
      for (let i = 0; i < 4; i++) this.add(g, new THREE.CylinderGeometry(0.07, 0.08, 0.9, 10), 'wood', { pos: [0, 0.12, 0], rot: [Math.PI / 2.4, i * Math.PI / 2, 0], aura: false });
      this.sprite(g, k, 'fill', [0, 0.65, 0.05], 1.3, { additive: true }); this.sprite(g, k, 'light', [0, 0.85, 0.08], 1.7, { additive: true });
      this.sprite(g, k, 'shadow', [0, 0.04, 0.05], 2.2, { opacity: 0.8 });
    } else if (k === 'smoke') {
      for (const [x, y, z, r] of [[0, 0.5, 0, 0.45], [0.35, 1.0, 0.1, 0.38], [-0.2, 1.4, -0.1, 0.33], [0.15, 1.85, 0, 0.27]]) this.add(g, new THREE.IcosahedronGeometry(r, 3), k, { pos: [x, y, z], ink: 0.01 });
      this.sprite(g, k, 'fill', [0.1, 1.3, 0.5], 1.6, { opacity: 0.85 });
    } else if (k === 'wall' || k === 'panel') {
      // стена подъезда: верх охра, низ зелёная панель (класс стенда — на своей половине)
      this.add(g, new THREE.BoxGeometry(2.4, k === 'wall' ? 1.3 : 1.0, 0.2, 12, 6, 1), k, { pos: [0, k === 'wall' ? 1.65 : 0.5, 0], ink: 0.012, aura: false });
      this.add(g, new THREE.BoxGeometry(2.4, k === 'wall' ? 1.0 : 1.3, 0.2, 12, 6, 1), k === 'wall' ? 'panel' : 'wall', { pos: [0, k === 'wall' ? 0.5 : 1.65, 0], ink: 0.012, aura: false });
    } else if (k === 'floor') {
      for (let i = 0; i < 4; i++) this.add(g, new THREE.BoxGeometry(1.8, 0.17, 0.3, 8, 1, 2), k, { pos: [0, 0.085 + i * 0.17, 0.45 - i * 0.3], ink: 0.01, aura: false });
      this.add(g, new THREE.BoxGeometry(1.8, 0.04, 1.2, 8, 1, 6), k, { pos: [0, 0.02, 1.2], ink: 0.01, aura: false });
    } else if (k === 'glass') {
      for (const [x, y, w, h] of [[0, 0.1, 1.5, 0.08], [0, 1.9, 1.5, 0.08], [-0.75, 1.0, 0.08, 1.88], [0.75, 1.0, 0.08, 1.88], [0, 1.0, 0.06, 1.88], [0, 1.35, 1.5, 0.06]]) this.add(g, new THREE.BoxGeometry(w, h, 0.1), 'wood', { pos: [x, y, 0], ink: 0.008, aura: false });
      this.add(g, new THREE.PlaneGeometry(1.42, 1.72), k, { pos: [0, 1.0, -0.02], flat: true, ink: 0, aura: false });
    } else if (k === 'snow') {
      const geo = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); const m = this.add(g, geo, k, { ink: 0.01 }); m.scale.set(1.3, 0.45, 1.0);
      this.add(g, new THREE.BoxGeometry(1.6, 0.08, 0.5), 'wood', { pos: [0.2, 0.62, 0.1], aura: false }); this.add(g, new THREE.BoxGeometry(1.6, 0.06, 0.5), k, { pos: [0.2, 0.7, 0.1], aura: false });
    } else if (k === 'fur') {
      for (const [x, y, z, r] of [[0, 0.55, 0, 0.38], [0.42, 0.62, 0, 0.26], [-0.4, 0.5, 0, 0.3], [0.62, 0.78, 0, 0.18]]) this.add(g, new THREE.IcosahedronGeometry(r, 3), k, { pos: [x, y, z], ink: 0.01 });
      for (const x of [-0.35, -0.15, 0.2, 0.4]) this.add(g, new THREE.CylinderGeometry(0.05, 0.04, 0.4, 8), k, { pos: [x, 0.2, 0.08], aura: false, ink: 0.008 });
    } else if (k === 'skin') {
      const head = this.add(g, new THREE.SphereGeometry(0.5, 40, 28), k, { pos: [0, 1.0, 0] }); head.scale.set(0.85, 1, 0.9);
      this.add(g, new THREE.CylinderGeometry(0.22, 0.26, 0.5, 20), k, { pos: [0, 0.45, 0], aura: false });
    } else {
      this.add(g, new THREE.TorusKnotGeometry(0.45, 0.16, 140, 18), k, { pos: [0, 0.85, 0] });
    }
    for (const role of ['glint']) if (k === 'metal' || k === 'other') { const s = this.sprite(g, k, role, [0, 0, 0], 0.7, { additive: true }); s.userData.glintOf = g.children.find((c) => c.isMesh); }
    return g;
  }

  build() {
    // небо (класс «небо», плоский свет, мазки крупно) и земля (класс «земля»)
    this.sky = this.add(this.scene, new THREE.SphereGeometry(80, 48, 24), 'sky', { flat: true, worldK: 0.04, ink: 0, aura: false, side: THREE.BackSide });
    this.pickables.pop();
    this.ground = this.add(this.scene, new THREE.CircleGeometry(16, 64), 'earth', { rot: [-Math.PI / 2, 0, 0], ink: 0, aura: false, rim: false });
    this.ground.userData.cls = 'earth';
    this.stands = {};
    CLASSES.forEach((c, i) => { const g = this.stand(c.k); this.stands[c.k] = g; this.scene.add(g); });
    // сцены по референсу (подъезд, двор ночью) — режим «Сцена по референсу»
    this.refs = { entrance: buildEntrance(this), night: buildNight(this) };
    for (const g of Object.values(this.refs)) { g.visible = false; this.scene.add(g); }
    this.beams = []; this.scene.traverse((o) => { if (o.renderOrder === 5) this.beams.push(o); });
    this.post = new RefPost(this.renderer);
    this.layout();
  }
  refKey() { return this.style === 'night' ? 'night' : 'entrance'; }
  applyRef() {
    const ref = this.mode === 'ref'; const k = this.refKey();
    for (const [kk, g] of Object.entries(this.refs)) g.visible = ref && kk === k;
    this.ground.visible = !ref; if (ref) this.sky.visible = false; else this.sky.visible = !!STYLES[this.style ?? 'lair'].time;
    if (!ref) { shared.uPaintK.value = 0; shared.uPoolK.value = 0; if (this.camera.fov !== 40) { this.camera.fov = 40; this.camera.updateProjectionMatrix(); } return; }
    const L = this.refs[k].userData.look, C = this.refs[k].userData.cam;
    shared.uSunDir.value.set(...L.sun).normalize(); shared.uPaintK.value = L.paint; shared.uPool.value.set(...L.pool); shared.uPoolC.value.set(L.poolC); shared.uPoolK.value = L.poolK;
    this.scene.background = gradientTex(L.bg); this.post.setLook(L);
    this.camera.fov = C.fov; this.camera.updateProjectionMatrix();
    if (this._refCam !== k) { this._refCam = k; this.camera.position.set(...C.pos); this.ctl.target.set(...C.target); }
  }
  layout() {
    const n = CLASSES.length;
    if (this.mode !== 'ref') this._refCam = null;
    CLASSES.forEach((c, i) => {
      const g = this.stands[c.k];
      if (this.mode === 'ref' || this.mode === 'empty') { g.visible = false; return; }
      if (this.mode === 'one') { g.visible = c.k === this.cls; g.position.set(0, 0, 0); g.scale.setScalar(1); }
      else { g.visible = true; const per = Math.ceil(n / 3); const row = Math.floor(i / per); const col = i % per; const nn = Math.min(per, n - row * per); g.position.set((col - (nn - 1) / 2) * 2.6, 0, -row * 2.8); g.rotation.y = 0; g.scale.setScalar(0.85); }
    });
    this.applyRef(); if (this.mode === 'ref') return;
    if (this.mode === 'all') { this.camera.position.set(-2.2, 8, 14); this.ctl.target.set(-2.2, 0.5, -2.8); }
    else if (this.camera.position.length() > 12) { this.camera.position.set(3.2, 2.2, 4.2); this.ctl.target.set(0, 0.6, 0); }
  }
  setMode(m) { this.mode = m; if (m === 'ref' && (this.style ?? 'lair') === 'lair') this.setStyle('entrance'); this.layout(); }
  setClass(k) { this.cls = k; if (this.mode === 'one') this.layout(); }
  setTime(k) {
    this.time = k; if (this.style && this.style !== 'lair') return; const T = TIMES[k];
    shared.uSunDir.value.set(...T.sun).normalize(); shared.uSunCol.value.setRGB(...T.col, THREE.SRGBColorSpace); shared.uAmb.value.setRGB(...T.amb, THREE.SRGBColorSpace);
    shared.uFogC.value.set(T.fog); shared.uShadowC.value.set('#33335f'); this.scene.background = new THREE.Color(T.fog);
    this.sky.material.uniforms.uBase.value.set(T.sky);
  }
  setStyle(k) {
    this.style = k; const S = STYLES[k];
    shared.uSoftK.value = S.soft; shared.uRimLW.value = S.rimW ?? 0; if (S.rimC) shared.uRimLC.value.set(S.rimC);
    shared.uGradeK.value = S.gradeK ?? 0; if (S.gradeC) shared.uGradeC.value.set(S.gradeC);
    shared.uInkK.value = S.ink; if (S.inkC) shared.uInkC.value.set(S.inkC);
    this.setFlag('ink', S.ink > 0); this.setFlag('aura', !!S.aura);
    // земля по стилю (пол подъезда, снег двора); небо в референсе ровное, без мазков
    const gk = S.ground || 'earth'; this.groundMats ??= { earth: this.ground.material };
    if (!this.groundMats[gk]) { const m = this.mat(gk, {}); m.uniforms.uRimC.value.set(0x000000); this.groundMats[gk] = m; }
    this.ground.material = this.groundMats[gk]; this.ground.userData.cls = gk; this.sky.visible = !!S.time;
    if (S.time) { this.setTime(this.time); if (this.refs) this.applyRef(); return; }
    shared.uSunDir.value.set(...S.sun).normalize(); shared.uSunCol.value.setRGB(...S.col, THREE.SRGBColorSpace); shared.uAmb.value.setRGB(...S.amb, THREE.SRGBColorSpace);
    shared.uShadowC.value.set(S.shadow); shared.uFogC.value.set(S.fog); this.scene.background = new THREE.Color(S.fog); this.sky.material.uniforms.uBase.value.set(S.sky);
    if (this.refs) this.applyRef();
  }
  setFlag(k, v) {
    this.flags[k] = v; shared.uMarks.value = this.flags.marks ? 1 : 0; shared.uBoil.value = this.flags.boil ? 1 : 0;
    this.scene.traverse((o) => { if (o.userData.ink) o.visible = this.flags.ink; if (o.userData.aura) o.visible = this.flags.aura; });
  }
  refresh(cls) { for (const m of this.mats) m.userData.refresh(); for (const a of this.auras) a.mat.userData.refresh(); }

  frame() {
    const dt = this.clock.getDelta(); const t = this.clock.elapsedTime; this.ctl.update();
    const step = Math.floor(t * STEP_FPS); shared.uStep.value = this.flags.boil ? step : 0;
    const W = this.renderer.domElement.width, H = this.renderer.domElement.height; const v = new THREE.Vector3();
    for (const a of this.auras) {
      if (!a.mesh.visible) continue; a.mesh.getWorldPosition(v); v.project(this.camera);
      a.mat.uniforms.uCenter.value.set((v.x * 0.5 + 0.5) * W, (v.y * 0.5 + 0.5) * H);
    }
    for (const s of this.sprites) {
      s.userData.frame(this.flags.boil ? Math.floor(t * (s.userData.role === 'glint' ? 3 : STEP_FPS)) : 0);
      const m = s.userData.glintOf;
      if (m) { // блик там, где отражается солнце (по сфере, описанной вокруг предмета)
        m.geometry.computeBoundingSphere(); const bs = m.geometry.boundingSphere; const c = m.localToWorld(bs.center.clone());
        const V = this.camera.position.clone().sub(c).normalize(); const Hh = V.add(shared.uSunDir.value).normalize();
        s.parent.worldToLocal(s.position.copy(c).addScaledVector(Hh, bs.radius * m.scale.x * 0.92));
      }
    }
    this.paint?.frame(t);
    if (this.mode === 'ref') { this.post.u.uTime.value = t; this.post.render(this.scene, this.camera, [...this.beams, ...this.sprites, ...(this.paint ? [this.paint.group] : [])]); }
    else this.renderer.render(this.scene, this.camera);
    this.drawPins();
  }
  drawPins() {
    const list = this.notes.list().filter((n) => n.where === 'preview' && n.p);
    const r = this.renderer.domElement; const w = r.clientWidth, h = r.clientHeight; const v = new THREE.Vector3();
    if (this.pins.childElementCount !== list.length) this.pins.replaceChildren(...list.map((n) => { const b = document.createElement('button'); b.className = 'pin'; b.onclick = () => this.notes.open(n.id); return b; }));
    list.forEach((n, i) => {
      const b = this.pins.children[i]; const st = n.local ? this.stands[n.cls] : null; const vis = st ? st.visible : true;
      v.set(...n.p); if (st) v.applyMatrix4(st.matrixWorld); v.project(this.camera);
      const on = vis && v.z < 1; b.style.display = on ? '' : 'none'; b.style.left = ((v.x * 0.5 + 0.5) * w) + 'px'; b.style.top = ((-v.y * 0.5 + 0.5) * h) + 'px';
      b.textContent = String(n.num ?? ''); b.title = n.text; b.classList.toggle('done', n.status === 'done'); b.classList.toggle('replied', !!n.reply);
    });
  }
}
