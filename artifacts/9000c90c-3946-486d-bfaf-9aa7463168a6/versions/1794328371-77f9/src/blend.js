// Окно «Смешение»: два материала на одной земле, граница рвётся маской и прорисовывается почеркушками шва.
// Michael красит, где какой материал (кисть A/B), и сам рисует шов любой кистью из редактора.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CLASSES, CLS, ROW, ROLES } from './library.js';
import { shared, STEP_FPS } from './scribmat.js';
import { drawStroke } from './brushkit.js';

const AREA = 10;              // метров по стороне участка
const MS = 256, SS = 1024;    // маска и шов, px
export const PAIRS = [['earth', 'grass', 'Земля → трава'], ['stone', 'grass', 'Камень → мох'], ['wood', 'metal', 'Дерево → оковка'], ['water', 'earth', 'Вода → берег'], ['earth', 'hay', 'Земля → сено'], ['stone', 'earth', 'Камень → земля']];

const FS = /* glsl */`
uniform sampler2D uA, uB, uE, uMask, uSeam;
uniform vec4 uCntA, uCntB, uSA, uLA, uFA, uMA, uSB, uLB, uFB, uMB, uEP;
uniform vec3 uBaseA, uBaseB, uShadowC, uSunDir, uSunCol, uAmb, uFogC;
uniform float uStep, uBoil, uMarks, uECnt, uRag, uSoft, uShowMask;
varying vec3 vW; varying vec3 vN;
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 h2(vec2 p){ return vec2(h1(p), h1(p + 17.31)); }
const float ROWS = ${ROLES.length}.0;
vec4 atlasAt(sampler2D A, float row, float v, vec2 uv){ return texture(A, vec2((v + uv.x) / 4.0, 1.0 - (row + uv.y) / ROWS)); }
vec4 marks(sampler2D A, vec2 uv, float row, float cnt, vec4 P, float seed, float w){
  if (cnt < 0.5 || P.w * w <= 0.001) return vec4(0.0);
  uv *= P.y; vec2 c0 = floor(uv); vec4 acc = vec4(0.0); float st = floor(uStep) * uBoil;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = c0 + vec2(float(i), float(j)); if (h1(c + seed + 3.1) > P.x) continue;
    vec2 r = h2(c + seed); vec2 jit = (h2(c + seed + 7.7) - 0.5) * 0.5 + (h2(c + st * 1.31) - 0.5) * 0.04 * uBoil;
    float ang = (r.x - 0.5) * P.z * 3.14159 + (h1(c + st * 2.7) - 0.5) * 0.07 * uBoil; float sc = 0.9 + 0.45 * r.y;
    vec2 l = (uv - (c + 0.5 + jit)) / sc; float cs = cos(ang), sn = sin(ang); l = mat2(cs, -sn, sn, cs) * l; vec2 t = l + 0.5;
    if (t.x < 0.0 || t.y < 0.0 || t.x > 1.0 || t.y > 1.0) continue;
    vec4 a = atlasAt(A, row, mod(floor(h1(c + seed + 11.0) * cnt), cnt), vec2(t.x, 1.0 - t.y));
    acc.rgb = a.rgb * a.a + acc.rgb * (1.0 - a.a); acc.a = a.a + acc.a * (1.0 - a.a);
  }
  return acc;
}
vec2 proj(vec3 p, vec3 n){ vec3 a = abs(n); if (a.x > a.y && a.x > a.z) return vec2(p.z * sign(n.x), p.y); if (a.y > a.z) return vec2(p.x, -p.z); return vec2(-p.x * sign(n.z), p.y); }
vec3 put(vec3 col, vec4 m, float w){ if (m.a > 0.001) col = mix(col, m.rgb / m.a, clamp(m.a * w, 0.0, 1.0)); return col; }
float maskD(sampler2D A, vec4 cnt, vec4 M, vec2 uv){ if (cnt.w < 0.5) return 0.0; vec2 tu = fract(uv * M.y); vec4 m = atlasAt(A, ${ROW.mask}.0, 0.0, vec2(tu.x, 1.0 - tu.y)); return (dot(m.rgb, vec3(0.333)) - 0.5) * 2.0 * m.a; }
vec3 shadeMat(sampler2D A, vec3 base, vec4 cnt, vec4 S, vec4 L, vec4 F, vec4 M, vec2 uv, float ndl, float seed){
  float t = ndl + maskD(A, cnt, M, uv) * M.x * 0.8; float lit = smoothstep(-M.z - 0.015, M.z + 0.015, t);
  vec3 col = mix(base * (uShadowC * 1.5 + uAmb), base * uSunCol * (0.8 + 0.2 * step(0.6, ndl)) + base * uAmb, lit);
  if (uMarks > 0.5) { col = put(col, marks(A, uv, ${ROW.fill}.0, cnt.z, F, 9.7 + seed, 1.0), 1.0); col = put(col, marks(A, uv, ${ROW.shadow}.0, cnt.x, S, 1.3 + seed, 1.0), S.w * (1.0 - lit)); col = put(col, marks(A, uv, ${ROW.light}.0, cnt.y, L, 5.1 + seed, 1.0), L.w * lit); }
  return col;
}
void main(){
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec2 uv = proj(vW, N); float ndl = dot(N, uSunDir);
  vec2 muv = vW.xz / ${AREA}.0 + 0.5;
  float m = texture(uMask, muv).r;
  float rag = maskD(uB, uCntB, uMB, uv * 1.7) * 0.6 + maskD(uA, uCntA, uMA, uv * 1.3) * 0.4;
  m += rag * uRag * 0.35;
  float k = smoothstep(0.5 - uSoft, 0.5 + uSoft, m);
  vec3 cA = shadeMat(uA, uBaseA, uCntA, uSA, uLA, uFA, uMA, uv, ndl, 0.0);
  vec3 cB = shadeMat(uB, uBaseB, uCntB, uSB, uLB, uFB, uMB, uv, ndl, 3.3);
  vec3 col = mix(cA, cB, k);
  // шов: почеркушки вдоль границы (роль «Шов смешения»)
  float band = 1.0 - smoothstep(0.0, uEP.x, abs(m - 0.5));
  if (uMarks > 0.5 && band > 0.0) col = put(col, marks(uE, uv, ${ROW.edge}.0, uECnt, vec4(uEP.y, uEP.z, 0.6, 1.0), 21.0, 1.0), uEP.w * band);
  vec4 sm = texture(uSeam, muv); col = mix(col, sm.rgb, sm.a * smoothstep(0.25, 0.55, N.y)); // шов сверху: на отвесных стенах не тянется полосой
  if (uShowMask > 0.5) col = mix(col, mix(vec3(0.9, 0.4, 0.2), vec3(0.2, 0.8, 1.0), m), 0.45);
  float d = length(cameraPosition - vW); col = mix(col, uFogC, clamp((d - 18.0) / 60.0, 0.0, 0.7));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;
const VS = 'varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }';

function terrain() {
  const g = new THREE.PlaneGeometry(AREA, AREA, 80, 80); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 0.7) * 0.18 + Math.cos(z * 0.9 + x * 0.3) * 0.15 + Math.sin(x * 1.9 + z * 1.4) * 0.05); }
  g.computeVertexNormals(); return g;
}
const v4 = (p) => new THREE.Vector4(p.dens ?? 0.5, 100 / Math.max(1, p.size ?? 20), p.rot ?? 0.2, p.str ?? 0.5);

export class Blend {
  constructor(root, lib, atl, notes, editor) {
    this.root = root; this.lib = lib; this.atl = atl; this.notes = notes; this.editor = editor;
    this.a = 'earth'; this.b = 'grass'; this.tool = 'B'; this.rad = 0.6; this.soft = 0.5; this.noteMode = false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); this.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); root.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = shared.uFogC.value; this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200); this.camera.position.set(0, 7.5, 8.5);
    this.ctl = new OrbitControls(this.camera, this.renderer.domElement); this.ctl.target.set(0, 0, 0.3); this.ctl.enableDamping = true; this.ctl.maxPolarAngle = 1.45;
    this.ctl.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    // маска и шов
    this.mask = document.createElement('canvas'); this.mask.width = this.mask.height = MS;
    this.maskSoft = document.createElement('canvas'); this.maskSoft.width = this.maskSoft.height = MS; // размытая копия: у шва есть ширина
    this.seam = document.createElement('canvas'); this.seam.width = this.seam.height = SS;
    this.maskTex = new THREE.CanvasTexture(this.maskSoft); this.seamTex = new THREE.CanvasTexture(this.seam); this.seamTex.colorSpace = THREE.SRGBColorSpace;
    // строка холста = координата z участка; без этого рисунок ложился зеркально (выше/ниже курсора)
    this.maskTex.flipY = false; this.seamTex.flipY = false;
    this.seamStrokes = [];
    this.u = {
      uA: { value: null }, uB: { value: null }, uE: { value: null }, uMask: { value: this.maskTex }, uSeam: { value: this.seamTex },
      uCntA: { value: new THREE.Vector4() }, uCntB: { value: new THREE.Vector4() }, uSA: { value: new THREE.Vector4() }, uLA: { value: new THREE.Vector4() }, uFA: { value: new THREE.Vector4() }, uMA: { value: new THREE.Vector4() },
      uSB: { value: new THREE.Vector4() }, uLB: { value: new THREE.Vector4() }, uFB: { value: new THREE.Vector4() }, uMB: { value: new THREE.Vector4() }, uEP: { value: new THREE.Vector4() },
      uBaseA: { value: new THREE.Color() }, uBaseB: { value: new THREE.Color() }, uECnt: { value: 0 }, uRag: { value: 1 }, uSoft: { value: 0.04 }, uShowMask: { value: 0 },
      uShadowC: shared.uShadowC, uSunDir: shared.uSunDir, uSunCol: shared.uSunCol, uAmb: shared.uAmb, uFogC: shared.uFogC, uStep: shared.uStep, uBoil: shared.uBoil, uMarks: shared.uMarks,
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VS, fragmentShader: FS });
    this.ground = new THREE.Mesh(terrain(), mat); this.scene.add(this.ground);
    // предметы на участке — на них тоже ложится смешение (маска сверху)
    const ink = new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * 0.02, 1.0); }', fragmentShader: 'void main(){ gl_FragColor = vec4(0.047,0.055,0.086,1.0); }' });
    this.paintables = [this.ground];
    const put = (geo, pos, rot = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); const o = new THREE.Mesh(geo, ink); m.add(o); this.scene.add(m); this.paintables.push(m); return m; };
    const rock = new THREE.IcosahedronGeometry(0.9, 3); { const p = rock.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize(); v.copy(n).multiplyScalar(0.9 * (1 + 0.12 * Math.sin(n.x * 5) * Math.cos(n.z * 4) + 0.07 * Math.sin(n.y * 9))); v.y *= 0.7; p.setXYZ(i, v.x, v.y, v.z); } rock.computeVertexNormals(); }
    put(rock, [1.6, 0.35, -0.6]);
    put(new THREE.BoxGeometry(2.4, 1.1, 0.35, 12, 6, 2), [-1.8, 0.5, -1.6], [0, 0.35, 0]);
    put(new THREE.CylinderGeometry(0.3, 0.33, 2.2, 20, 6), [-0.4, 0.38, 1.6], [0, 0.9, Math.PI / 2]);
    this.defaultMask();
    new ResizeObserver(() => this.resize()).observe(root);
    this.bindPaint();
    this.clock = new THREE.Clock(); this.running = false;
  }
  key() { return this.a + '__' + this.b; }
  start() { if (this.running) return; this.running = true; this.resize(); const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); }; loop(); }
  stop() { this.running = false; }
  resize() { const w = this.root.clientWidth, h = this.root.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  defaultMask() {
    const g = this.mask.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, MS, MS);
    // пятно B неровной формы посередине + язык к краю
    g.fillStyle = '#fff'; g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283; const r = MS * (0.26 + 0.05 * Math.sin(a * 3) + 0.03 * Math.sin(a * 7 + 1)); const x = MS * 0.55 + Math.cos(a) * r, y = MS * 0.5 + Math.sin(a) * r * 0.85; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.fill(); g.fillRect(MS * 0.7, MS * 0.38, MS * 0.3, MS * 0.22);
    this.softMask();
    this.seamStrokes = []; this.redrawSeam();
  }
  setPair(a, b) { this.save(); this.a = a; this.b = b; this.refresh(); this.loadPair(); }
  refresh() {
    const A = this.atl.get(this.a), B = this.atl.get(this.b);
    const u = this.u; u.uA.value = A.tex; u.uB.value = B.tex;
    const cnt = (a) => new THREE.Vector4(a.counts.shadow ?? 0, a.counts.light ?? 0, a.counts.fill ?? 0, a.counts.mask ?? 0);
    u.uCntA.value.copy(cnt(A)); u.uCntB.value.copy(cnt(B));
    const P = (c, r) => this.lib.params(c, r);
    u.uSA.value.copy(v4(P(this.a, 'shadow'))); u.uLA.value.copy(v4(P(this.a, 'light'))); u.uFA.value.copy(v4(P(this.a, 'fill')));
    u.uSB.value.copy(v4(P(this.b, 'shadow'))); u.uLB.value.copy(v4(P(this.b, 'light'))); u.uFB.value.copy(v4(P(this.b, 'fill')));
    const mk = (c) => { const m = P(c, 'mask'); return new THREE.Vector4(m.amp ?? 0.35, 100 / Math.max(1, m.size ?? 40), m.soft ?? 0.05, 0); };
    u.uMA.value.copy(mk(this.a)); u.uMB.value.copy(mk(this.b));
    u.uBaseA.value.set(CLS[this.a].base); u.uBaseB.value.set(CLS[this.b].base);
    // шов: свой у B, иначе у A, иначе общий из «Прочее» (контуры Michael)
    const src = [this.b, this.a, 'other'].find((c) => (this.atl.get(c).counts.edge ?? 0) > 0) ?? this.b;
    const E = this.atl.get(src); u.uE.value = E.tex; u.uECnt.value = E.counts.edge ?? 0; this.edgeSrc = src;
    const ep = P(src, 'edge'); u.uEP.value.set(ep.w ?? 0.12, ep.dens ?? 0.8, 100 / Math.max(1, ep.size ?? 24), ep.str ?? 0.9);
    this.onInfo?.();
  }
  // ---------- рисование ----------
  bindPaint() {
    const ray = new THREE.Raycaster(); const m = new THREE.Vector2(); const cv = this.renderer.domElement;
    // кольцо-курсор на земле: видно, куда ляжет кисть
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe0b0, transparent: true, opacity: 0.8, depthTest: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 10; this.ring.visible = false; this.scene.add(this.ring);
    const hitUV = (e) => {
      const r = cv.getBoundingClientRect(); m.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(m, this.camera);
      const h = ray.intersectObjects(this.paintables, false)[0]; if (!h) return null;
      return { uv: [h.point.x / AREA + 0.5, h.point.z / AREA + 0.5], p: h.point };
    };
    const ringAt = (h) => {
      if (!h) { this.ring.visible = false; return; }
      const rad = this.tool === 'A' || this.tool === 'B' ? this.rad : Math.max(0.1, this.editor.size / 768 * 0.35 * AREA / 2);
      this.ring.visible = true; this.ring.position.set(h.p.x, h.p.y + 0.02, h.p.z); this.ring.scale.setScalar(rad);
    };
    // перерисовка не чаще кадра; шов рисуется с отдельного холста-основы (быстрее, чем getImageData/putImageData)
    let cur = null; let raf = 0; let pendDab = []; let lastUV = null;
    const base = document.createElement('canvas'); base.width = base.height = SS;
    const flush = () => {
      raf = 0;
      if (pendDab.length) { for (const uv of pendDab) this.dab(uv, false); pendDab = []; this.softMask(); }
      if (cur && !cur.mask && cur.pts.length >= 4) {
        const g = this.seam.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.drawImage(base, 0, 0); g.restore();
        drawStroke(g, cur, SS, cur.c, { live: true }); this.seamTex.needsUpdate = true;
      }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(flush); };
    // мазок маски — с шагом в четверть радиуса, чтобы при быстрой руке не было дыр
    const addDab = (uv) => {
      if (lastUV) { const st = this.rad / AREA / 4; const d = Math.hypot(uv[0] - lastUV[0], uv[1] - lastUV[1]); const n = Math.min(60, Math.floor(d / st)); for (let i = 1; i <= n; i++) pendDab.push([lastUV[0] + (uv[0] - lastUV[0]) * i / (n + 1), lastUV[1] + (uv[1] - lastUV[1]) * i / (n + 1)]); }
      pendDab.push(uv); lastUV = uv; kick();
    };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerleave', () => { if (!cur) this.ring.visible = false; });
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; const h = hitUV(e); if (!h) return;
      if (this.noteMode) { this.noteMode = false; this.onNoteDone?.(); this.notes.ask({ where: 'blend', pair: this.key(), p: h.p.toArray().map((x) => +x.toFixed(2)), label: `${CLS[this.a].name} → ${CLS[this.b].name}` }); return; }
      cv.setPointerCapture(e.pointerId); cv.focus?.({ preventScroll: true });
      if (this.tool === 'A' || this.tool === 'B') { lastUV = null; cur = { mask: true }; addDab(h.uv); return; }
      const ed = this.editor; const bg = base.getContext('2d'); bg.clearRect(0, 0, SS, SS); bg.drawImage(this.seam, 0, 0);
      cur = { pts: [h.uv[0], h.uv[1]], pr: [0.8], w: ed.size / 768 * 0.35, b: { ...ed.brush }, sd: Math.floor(Math.random() * 1e5), c: ed.layer()?.color ?? '#0c0e16' };
      if (this.tool === 'erase') cur.b = { t: 'eraser', o: 1, pr: 0.5, tp: 0, hd: 0.8 };
    });
    cv.addEventListener('pointermove', (e) => {
      const evs = cur ? (e.getCoalescedEvents?.() ?? [e]) : [e];
      let h = null;
      for (const ev of evs) {
        h = hitUV(ev); if (!h || !cur) continue;
        if (cur.mask) { addDab(h.uv); continue; }
        const lx = cur.pts[cur.pts.length - 2], ly = cur.pts[cur.pts.length - 1]; if (Math.hypot(h.uv[0] - lx, h.uv[1] - ly) < 0.0008) continue;
        cur.pts.push(+h.uv[0].toFixed(5), +h.uv[1].toFixed(5)); cur.pr.push(0.8); kick();
      }
      ringAt(h);
    });
    const end = () => {
      if (!cur) return; cancelAnimationFrame(raf); flush();
      if (!cur.mask && cur.pts.length >= 4) {
        this.seamStrokes.push(cur);
        const g = this.seam.getContext('2d'); g.save(); g.globalCompositeOperation = 'copy'; g.drawImage(base, 0, 0); g.restore(); drawStroke(g, cur, SS, cur.c); this.seamTex.needsUpdate = true;
      }
      cur = null; lastUV = null; this.saveSoon();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  dab([u, v], soft = true) {
    const g = this.mask.getContext('2d'); const r = this.rad / AREA * MS; const x = u * MS, y = v * MS;
    const gr = g.createRadialGradient(x, y, r * (1 - this.soft), x, y, r); const c = this.tool === 'B' ? '255,255,255' : '0,0,0';
    gr.addColorStop(0, `rgba(${c},0.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); if (soft) this.softMask();
  }
  softMask() { const g = this.maskSoft.getContext('2d'); g.filter = 'none'; g.fillStyle = '#000'; g.fillRect(0, 0, MS, MS); g.filter = 'blur(8px)'; g.drawImage(this.mask, 0, 0); g.filter = 'none'; this.maskTex.needsUpdate = true; }
  redrawSeam() { const g = this.seam.getContext('2d'); g.clearRect(0, 0, SS, SS); for (const s of this.seamStrokes) drawStroke(g, s, SS, s.c); this.seamTex.needsUpdate = true; }
  undoSeam() { this.seamStrokes.pop(); this.redrawSeam(); this.saveSoon(); }
  clearSeam() { this.seamStrokes = []; this.redrawSeam(); this.saveSoon(); }
  // ---------- хранение: blend/<A__B> = маска 256 png + штрихи шва ----------
  saveSoon() { clearTimeout(this._t); this._t = setTimeout(() => this.save(), 1500); }
  async save() {
    clearTimeout(this._t);
    const doc = { key: this.key(), a: this.a, b: this.b, mask: this.mask.toDataURL('image/png'), seam: this.seamStrokes, t: Date.now() };
    try { localStorage.setItem('ss-blend-' + doc.key, JSON.stringify(doc)); } catch { /* нет */ }
    if (this.lib.db) try { await this.lib.db.doc('blend/' + doc.key).set(doc); } catch (e) { console.warn('blend save', e); }
  }
  async loadPair() {
    let d = null;
    if (this.lib.db) try { const s = await this.lib.db.doc('blend/' + this.key()).get(); if (s.exists) d = s.data(); } catch { /* нет */ }
    if (!d) try { d = JSON.parse(localStorage.getItem('ss-blend-' + this.key()) ?? 'null'); } catch { d = null; }
    if (!d) { this.defaultMask(); return; }
    this.seamStrokes = d.seam ?? []; this.redrawSeam();
    if (d.mask) { const im = new Image(); im.onload = () => { const g = this.mask.getContext('2d'); g.clearRect(0, 0, MS, MS); g.drawImage(im, 0, 0, MS, MS); this.softMask(); }; im.src = d.mask; }
  }
  frame() {
    this.ctl.update(); const t = this.clock.getElapsedTime(); shared.uStep.value = shared.uBoil.value ? Math.floor(t * STEP_FPS) : 0;
    this.renderer.render(this.scene, this.camera);
  }
}
