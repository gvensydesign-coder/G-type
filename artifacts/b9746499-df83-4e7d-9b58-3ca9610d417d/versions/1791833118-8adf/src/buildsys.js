// BuildSystem: механика стройки поверх MapGrid. Призрак-эскиз с проверкой каждой клетки,
// поворот и варианты, растягиваемые участки и линии, этапы стройки, заброшенные постройки
// и восстановление, межа (наделы 32×32 м) и её расширение, ресурсы и уровни поселения.
// Зависит только от three, MapGrid, каталога buildings.js, FX и материала toon.js.
import * as THREE from 'three';
import { BUILDINGS, BY_ID, TIERS, buildGeometry, makeSignTexture } from './buildings.js';
import { makeToonMaterial, makeFlatShader, G } from './toon.js';

export const SECTOR = 32;
const RES = ['silver', 'wood', 'stone'];
export const RES_NAMES = { silver: 'серебро', wood: 'брёвна', stone: 'камень' };
const ROT_NAMES = ['юг', 'восток', 'север', 'запад'];
export { ROT_NAMES };

const CELL_OK = 0, CELL_FOUND = 1, CELL_BAD = 2;

export class BuildSystem extends EventTarget {
  constructor({ map, scene, fx, ownTexHolder }) {
    super();
    this.map = map; this.scene = scene; this.fx = fx;
    this.W = map.width; this.H = map.height;
    this.occ = new Int32Array(this.W * this.H);
    this.items = new Map(); this.nextId = 1;
    this.res = { silver: 220, wood: 160, stone: 40 };
    this.stats = { people: 0, faith: 0, chthon: 0 };
    this.tier = 0; this.seenTier = 0; this.newCards = new Set();
    this.speed = 1; this.free = false; this.placeAbandoned = false;
    this.SX = Math.ceil(this.W / SECTOR); this.SZ = Math.ceil(this.H / SECTOR);
    this.owned = new Set(); this.boughtCount = 0;
    this.tool = null;           // {def, v, rot, mode:'place'|'move'|'expand', moving, dragStart}
    this.selected = null;
    this.tick = 0;
    this.group = new THREE.Group(); this.group.name = 'buildings'; scene.add(this.group);
    this._buildOwnTex();
    this._buildOverlay();
  }

  // ---------- межа ----------
  sectorOf(cx, cz) { return [Math.floor(cx / SECTOR), Math.floor(cz / SECTOR)]; }
  key(sx, sz) { return sx + ',' + sz; }
  isOwnedCell(cx, cz) { const [sx, sz] = this.sectorOf(cx, cz); return this.free || this.owned.has(this.key(sx, sz)); }
  sectorPlayable(sx, sz) { // есть ли в наделе проходимая земля
    let ok = 0;
    for (let z = sz * SECTOR; z < Math.min(this.H, (sz + 1) * SECTOR); z += 4) for (let x = sx * SECTOR; x < Math.min(this.W, (sx + 1) * SECTOR); x += 4) if (this.map.zoneAtCell(x, z).key !== 'border') ok++;
    return ok > 6;
  }
  canBuy(sx, sz) {
    if (this.owned.has(this.key(sx, sz)) || sx < 0 || sz < 0 || sx >= this.SX || sz >= this.SZ) return false;
    if (!this.sectorPlayable(sx, sz)) return false;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => this.owned.has(this.key(sx + a, sz + b)));
  }
  sectorPrice() { return { silver: Math.round(40 * Math.pow(1.3, this.boughtCount)) }; }
  buySector(sx, sz) {
    if (!this.canBuy(sx, sz)) return false;
    const price = this.sectorPrice();
    if (!this.free && !this.afford(price)) { this.emit('toast', { text: 'Не хватает серебра на надел', bad: true }); return false; }
    if (!this.free) this.pay(price);
    this.owned.add(this.key(sx, sz)); this.boughtCount++;
    this._updateOwnTex();
    this.emit('toast', { text: `Межа расширена: надел ${this.map.sectorName(sx * SECTOR, sz * SECTOR, SECTOR)}` });
    this.emit('change');
    return true;
  }
  _buildOwnTex() {
    this.ownData = new Uint8Array(this.SX * this.SZ * 4);
    this.ownTex = new THREE.DataTexture(this.ownData, this.SX, this.SZ, THREE.RGBAFormat);
    this.ownTex.magFilter = this.ownTex.minFilter = THREE.NearestFilter;
    G.uOwn.value = this.ownTex;
    G.uOwnRect.value.set(this.map.origin.x, this.map.origin.z, this.SX * SECTOR, this.SZ * SECTOR);
    G.uOwnOn.value = 1;
  }
  _updateOwnTex(hover) {
    for (let sz = 0; sz < this.SZ; sz++) for (let sx = 0; sx < this.SX; sx++) {
      const i = (sz * this.SX + sx) * 4;
      this.ownData[i] = this.owned.has(this.key(sx, sz)) || this.free ? 255 : 0;
      this.ownData[i + 1] = this.canBuy(sx, sz) ? 255 : 0;
      this.ownData[i + 2] = hover && hover[0] === sx && hover[1] === sz ? 255 : 0;
      this.ownData[i + 3] = 255;
    }
    this.ownTex.needsUpdate = true;
  }

  // ---------- ресурсы ----------
  afford(cost) { return RES.every(r => (this.res[r] ?? 0) >= (cost[r] ?? 0) - 1e-6); }
  pay(cost, k = 1) { for (const r of RES) this.res[r] = Math.max(0, this.res[r] - (cost[r] ?? 0) * k); }
  gain(cost, k = 1) { for (const r of RES) this.res[r] += (cost[r] ?? 0) * k; }
  costOf(def, size) {
    const c = { ...def.cost };
    if (def.costPer && size) { const amount = def.line ? size[0] : size[0] * size[1]; for (const r of RES) if (def.costPer[r]) c[r] = Math.ceil((def.line ? 0 : (c[r] ?? 0)) + def.costPer[r] * amount); }
    for (const r of RES) if (c[r]) c[r] = Math.round(c[r]); else delete c[r];
    return c;
  }
  effectOf(def, size) {
    const e = { ...def.effect };
    if (def.effectPer && size) for (const [k, v] of Object.entries(def.effectPer)) e[k] = (e[k] ?? 0) + v * size[0] * size[1];
    return e;
  }
  tierOK(def) { return this.free || def.tier <= this.tier; }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  // ---------- инструмент ----------
  startPlace(def, v = 0) {
    this.cancelTool();
    this.tool = { mode: 'place', def, v, rot: this.tool?.rot ?? 0 };
    this.newCards.delete(def.id);
    this._makeGhost();
    this.emit('tool');
  }
  startMove(item) {
    this.cancelTool();
    this._setOcc(item, 0);
    item.group.visible = false;
    this.tool = { mode: 'move', def: item.def, v: item.v, rot: item.rot, moving: item, size: item.size };
    this._makeGhost();
    this.emit('tool');
  }
  startClear() { this.cancelTool(); this.tool = { mode: 'clear' }; this.emit('tool'); }
  startExpand() { this.cancelTool(); this.tool = { mode: 'expand' }; G.uExpand.value = 1; this._updateOwnTex(); this.emit('tool'); }
  cancelTool() {
    const t = this.tool;
    if (t?.mode === 'move' && t.moving) { this._setOcc(t.moving, t.moving.id); t.moving.group.visible = true; }
    this._clearGhost();
    G.uExpand.value = 0; G.uGridOn.value = 0;
    this.tool = null; this._updateOwnTex();
    this.overlay.visible = false;
    this.emit('tool');
  }
  rotate(d = 1) { if (!this.tool?.def) return; this.tool.rot = (this.tool.rot + d + 4) % 4; this._makeGhost(); this.lastHover && this.hover(this.lastHover); }
  variant(d = 1) { if (!this.tool?.def) return; this.tool.v = (this.tool.v + d + 4) % 4; this._makeGhost(); this.lastHover && this.hover(this.lastHover); }

  // размер пятна в клетках с учётом поворота
  footprint(def, rot, size) { const [w, d] = size ?? def.size; return rot % 2 ? [d, w] : [w, d]; }

  // Проверка пятна: прямоугольник (x0,z0,w,d) в клетках. Возвращает {cells:[{cx,cz,s}], ok, reasons, top, min}
  checkRect(def, x0, z0, w, d, ignoreId = 0) {
    const cells = []; const reasons = new Set();
    let top = -Infinity, min = Infinity;
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      const h = this.map.heightAtCell(x, z); top = Math.max(top, h); min = Math.min(min, h);
    }
    const maxSlope = def.maxSlope ?? (def.plinth === false ? 0.9 : 1.8);
    for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
      let s = CELL_OK, why = null;
      const zone = this.map.zoneAtCell(x, z).key;
      if (!this.map.inBounds(x, z) || zone === 'border') { s = CELL_BAD; why = 'граница карты'; }
      else if (zone === 'water' || zone === 'shallow') { if (!(def.line?.water && zone === 'shallow')) { s = CELL_BAD; why = 'вода'; } }
      else if (zone === 'slope') { s = CELL_BAD; why = 'крутой склон'; }
      else if ((zone === 'road' || zone === 'bridge') && !def.line?.water) { s = CELL_BAD; why = 'дорога'; }
      const oc = s !== CELL_BAD ? this.occ[z * this.W + x] : 0;
      if (oc === -1) { s = CELL_BAD; why = 'лес (сначала вырубить)'; }
      else if (oc && oc !== ignoreId) { s = CELL_BAD; why = 'занято'; }
      if (s !== CELL_BAD && !this.isOwnedCell(x, z)) { s = CELL_BAD; why = 'чужой надел (расширь межу)'; }
      if (s === CELL_OK && top - this.map.heightAtCell(x, z) > 0.35 && def.plinth !== false) s = CELL_FOUND;
      if (why) reasons.add(why);
      cells.push({ cx: x, cz: z, s });
    }
    if (top - min > maxSlope && !def.line?.water) { reasons.add(`перепад ${(top - min).toFixed(1)} м > ${maxSlope} м`); for (const c of cells) if (c.s !== CELL_BAD && top - this.map.heightAtCell(c.cx, c.cz) > maxSlope) c.s = CELL_BAD; }
    return { cells, ok: reasons.size === 0, reasons: [...reasons], top, min };
  }

  // Наведение курсора: p — точка на земле (мир). Обновляет призрак/подсветку.
  hover(p) {
    this.lastHover = p;
    const t = this.tool;
    const c = this.map.worldToCell(p.x, p.z);
    G.uCursor.value.set(p.x, p.y, p.z);
    if (!t) return null;
    if (t.mode === 'expand') {
      const [sx, sz] = this.sectorOf(c.cx, c.cz);
      this._updateOwnTex([sx, sz]);
      this.hoverSector = [sx, sz];
      const can = this.canBuy(sx, sz), price = this.sectorPrice();
      return { kind: 'sector', name: 'Надел ' + this.map.sectorName(sx * SECTOR, sz * SECTOR, SECTOR), can, owned: this.owned.has(this.key(sx, sz)), price, afford: this.free || this.afford(price) };
    }
    G.uGridOn.value = 1;
    if (t.mode === 'clear') {
      const a = t.dragStart ?? c;
      const x0 = Math.min(a.cx, c.cx), z0 = Math.min(a.cz, c.cz), w = Math.abs(c.cx - a.cx) + 1, d = Math.abs(c.cz - a.cz) + 1;
      const cells = [];
      for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) {
        const tree = this.occ[z * this.W + x] === -1;
        if (tree || (w * d < 400 && (x === x0 || z === z0 || x === x0 + w - 1 || z === z0 + d - 1))) cells.push({ cx: x, cz: z, s: tree ? (this.isOwnedCell(x, z) ? CELL_OK : CELL_BAD) : CELL_FOUND });
      }
      t.plan = { x0, z0, w, d };
      this._fillOverlay(cells);
      const cnt = this.forest ? this.forest.countRect(x0, z0, w, d) : { n: 0, own: 0 };
      return { kind: 'clear', w, d, ...cnt };
    }
    const def = t.def;
    let plan;
    if (def.line && t.dragStart) plan = this._planLine(t.dragStart, c);
    else if (def.line) plan = this._planLine(c, c);
    else if (def.area && t.dragStart) plan = this._planArea(t.dragStart, c);
    else {
      const [w, d] = this.footprint(def, t.rot, t.size);
      const x0 = c.cx - Math.floor(w / 2), z0 = c.cz - Math.floor(d / 2);
      plan = { kind: 'rect', x0, z0, w, d, size: t.size ?? def.size, ...this.checkRect(def, x0, z0, w, d) };
    }
    t.plan = plan;
    const cost = t.mode === 'move' ? {} : this.costOf(def, plan.size);
    plan.cost = cost; plan.afford = this.free || this.afford(cost); plan.tierOK = this.tierOK(def);
    plan.valid = plan.ok && plan.afford && plan.tierOK;
    this._showPlan(plan);
    return { kind: 'plan', def, plan, v: t.v, rot: t.rot, effect: this.effectOf(def, plan.size) };
  }

  _planArea(a, b) {
    const def = this.tool.def;
    const [mnW, mnD] = def.area.min, [mxW, mxD] = def.area.max;
    let w = Math.abs(b.cx - a.cx) + 1, d = Math.abs(b.cz - a.cz) + 1;
    w = Math.max(mnW, Math.min(mxW, w)); d = Math.max(mnD, Math.min(mxD, d));
    const x0 = b.cx >= a.cx ? a.cx : a.cx - w + 1, z0 = b.cz >= a.cz ? a.cz : a.cz - d + 1;
    return { kind: 'rect', area: true, x0, z0, w, d, size: [w, d], ...this.checkRect(def, x0, z0, w, d) };
  }
  _planLine(a, b) {
    const def = this.tool.def;
    const dx = b.cx - a.cx, dz = b.cz - a.cz;
    let L = Math.max(1, Math.hypot(dx, dz)); L = Math.min(L, 60);
    const ang = Math.atan2(dz, dx);
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const width = def.size[1];
    const cellsMap = new Map(); const reasons = new Set();
    let ok = true;
    // клетки вдоль линии (шаг 0.5 м, ширина width)
    for (let s = 0; s <= L; s += 0.5) for (let o = -(width - 1) / 2; o <= (width - 1) / 2 + 1e-6; o += 1) {
      const x = Math.round(a.cx + ux * s - uz * o), z = Math.round(a.cz + uz * s + ux * o);
      const k = x + ',' + z; if (cellsMap.has(k)) continue;
      const r = this.checkRect({ ...def, maxSlope: 99 }, x, z, 1, 1);
      r.reasons.forEach(x => reasons.add(x));
      cellsMap.set(k, { cx: x, cz: z, s: r.cells[0].s });
      if (!r.ok) ok = false;
    }
    // разбивка на сегменты по 3 м: высота каждого — по своему центру
    const segs = []; const n = Math.max(1, Math.round(L / 3));
    for (let i = 0; i < n; i++) {
      const s0 = L * i / n, s1 = L * (i + 1) / n, sm = (s0 + s1) / 2;
      const wx = this.map.origin.x + (a.cx + 0.5 + ux * sm), wz = this.map.origin.z + (a.cz + 0.5 + uz * sm);
      let y = this.map.heightAt(wx, wz), lo = y;
      for (const t of [s0, s1]) lo = Math.min(lo, this.map.heightAt(this.map.origin.x + a.cx + 0.5 + ux * t, this.map.origin.z + a.cz + 0.5 + uz * t));
      if (def.line.water) { y = Math.max(y, this.map.waterLevel + 0.2); }
      segs.push({ x: wx, z: wz, y, len: s1 - s0 + (def.line.water ? 0.05 : 0.02), found: Math.max(0, y - lo) });
    }
    return { kind: 'line', a, b, L, ang, segs, cells: [...cellsMap.values()], ok, reasons: [...reasons], size: [Math.round(L), width] };
  }

  // ---------- призрак ----------
  _makeGhost() {
    this._clearGhost();
    const t = this.tool; if (!t?.def || t.def.line) return; // у линии призрак строится по ходу
    const def = t.def;
    const { geometry } = buildGeometry(def, { v: t.v, ab: this.placeAbandoned, size: t.size ?? def.size, seed: 3 });
    const m = makeToonMaterial({ sketch: 1, stage: 4 });
    this.ghost = new THREE.Mesh(geometry, m);
    this.ghost.rotation.y = -t.rot * Math.PI / 2 * -1;
    this.scene.add(this.ghost);
  }
  _clearGhost() {
    if (this.ghost) { this.scene.remove(this.ghost); this.ghost.geometry.dispose(); this.ghost.material.dispose(); this.ghost = null; }
    if (this.ghostLine) { this.scene.remove(this.ghostLine); this.ghostLine.traverse(o => o.geometry?.dispose()); this.ghostLine = null; }
  }
  _showPlan(plan) {
    const t = this.tool, def = t.def;
    const tint = plan.valid ? new THREE.Color(0.75, 1.15, 0.8) : new THREE.Color(1.3, 0.65, 0.6);
    if (plan.kind === 'rect') {
      if (plan.area && (!this.ghost || this._ghostSize?.join() !== plan.size.join())) {
        this._clearGhost();
        const { geometry } = buildGeometry(def, { v: t.v, size: plan.size, seed: 3, ab: this.placeAbandoned });
        this.ghost = new THREE.Mesh(geometry, makeToonMaterial({ sketch: 1, stage: 4 }));
        this.scene.add(this.ghost); this._ghostSize = plan.size;
      }
      if (this.ghost) {
        const p = this.rectCenter(plan.x0, plan.z0, plan.w, plan.d);
        this.ghost.position.set(p.x, def.plinth === false ? this.avgHeight(plan) : plan.top, p.z);
        this.ghost.rotation.y = t.rot * Math.PI / 2;
        this.ghost.material.uniforms.uTint.value.copy(tint);
      }
    } else {
      // линия: пересобрать сегменты
      const sig = plan.a.cx + ',' + plan.a.cz + ',' + plan.b.cx + ',' + plan.b.cz + ',' + t.v;
      if (sig !== this._lineSig) {
        this._lineSig = sig;
        if (this.ghostLine) { this.scene.remove(this.ghostLine); this.ghostLine.traverse(o => o.geometry?.dispose()); }
        this.ghostLine = this._lineGroup(def, plan, t.v, false, makeToonMaterial({ sketch: 1, stage: 4 }));
        this.scene.add(this.ghostLine);
      }
      this.ghostLine.children.forEach(m => m.material.uniforms.uTint.value.copy(tint));
    }
    this._fillOverlay(plan.cells);
  }
  _lineGroup(def, plan, v, ab, material) {
    const g = new THREE.Group();
    plan.segs.forEach((s, i) => {
      const { geometry } = buildGeometry(def, { v, ab, size: [s.len, def.size[1]], found: s.found, seed: 11 + i });
      const m = new THREE.Mesh(geometry, material);
      m.position.set(s.x, s.y, s.z); m.rotation.y = -plan.ang;
      g.add(m);
    });
    return g;
  }
  rectCenter(x0, z0, w, d) { const cs = this.map.cellSize; return { x: this.map.origin.x + (x0 + w / 2) * cs, z: this.map.origin.z + (z0 + d / 2) * cs }; }
  avgHeight(plan) { let s = 0; for (const c of plan.cells) s += this.map.heightAtCell(c.cx, c.cz); return s / plan.cells.length; }

  // Подсветка клеток пятна (instanced квадраты)
  _buildOverlay() {
    const N = 4096;
    const quad = new THREE.PlaneGeometry(0.92, 0.92); quad.rotateX(-Math.PI / 2);
    const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position;
    this.ovPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iP', this.ovPos); g.instanceCount = 0;
    const m = makeFlatShader(`
      in float vS; in vec2 vQ; uniform float uTime, uPx;
      void main(){
        vec3 c = vS < .5 ? vec3(.45, .85, .45) : vS < 1.5 ? vec3(.95, .75, .3) : vec3(.95, .3, .25);
        float edge = max(abs(vQ.x), abs(vQ.y));
        float a = edge > .4 ? .85 : .28;
        if (vS > 1.5) { vec2 fc = gl_FragCoord.xy / uPx; a = max(a, step(.5, fract((fc.x + fc.y) / 8.)) * .4); }
        oColor = vec4(c, a); oNormal = vec4(0.);
      }`, `in vec4 iP; out float vS; out vec2 vQ;
      void main(){ vS = iP.w; vQ = position.xz / .92; gl_Position = projectionMatrix * viewMatrix * vec4(position + iP.xyz, 1.); }`,
      {}, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    this.overlay = new THREE.Mesh(g, m); this.overlay.frustumCulled = false; this.overlay.layers.set(1); this.overlay.renderOrder = 2;
    this.overlay.visible = false;
    this.scene.add(this.overlay);
  }
  _fillOverlay(cells) {
    const a = this.ovPos.array; let n = 0;
    for (const c of cells) {
      if (n >= 4096) break;
      const w = this.map.cellToWorld(c.cx, c.cz);
      a.set([w.x, this.map.heightAtCell(c.cx, c.cz) + 0.06, w.z, c.s], n * 4); n++;
    }
    this.overlay.geometry.instanceCount = n; this.ovPos.needsUpdate = true; this.overlay.visible = true;
  }

  // ---------- клик ----------
  pointerDown(p) {
    const t = this.tool; if (!t) return false;
    const c = this.map.worldToCell(p.x, p.z);
    if (t.mode === 'expand') { if (this.hoverSector) this.buySector(...this.hoverSector); return true; }
    if (t.mode === 'clear') { t.dragStart = c; this.hover(p); return true; }
    if ((t.def.line || t.def.area) && !t.dragStart) { t.dragStart = c; this.hover(p); return true; }
    return this.commit();
  }
  pointerUp(p) {
    const t = this.tool; if (!t?.dragStart) return false;
    const a = t.dragStart;
    if (t.mode === 'clear') {
      this.hover(p); const { x0, z0, w, d } = t.plan; t.dragStart = null;
      const n = this.forest ? this.forest.clearRect(x0, z0, w, d) : 0;
      if (n) { this.res.wood += n * 2; const cc = this.rectCenter(x0, z0, w, d); this.fx.dustBurst(new THREE.Vector3(cc.x, this.map.heightAt(cc.x, cc.z), cc.z), w, d, 2, Math.min(40, 6 + n)); this.emit('spent', { gain: { wood: n * 2 }, at: new THREE.Vector3(cc.x, this.map.heightAt(cc.x, cc.z) + 4, cc.z) }); this.emit('change'); }
      else this.emit('toast', { text: 'Здесь нечего рубить на своей меже', bad: true });
      this.hover(p);
      return true;
    }
    const c = this.map.worldToCell(p.x, p.z);
    if (a.cx === c.cx && a.cz === c.cz && t.def.line) return true; // ждём второго клика
    this.hover(p);
    const ok = this.commit();
    return ok;
  }
  commit(keep = true) {
    const t = this.tool; const plan = t?.plan; if (!plan) return false;
    if (!plan.valid) {
      const why = !plan.tierOK ? `откроется на уровне «${TIERS[t.def.tier].name}»` : !plan.afford ? 'не хватает ресурсов' : plan.reasons.join(', ');
      this.emit('toast', { text: 'Нельзя: ' + why, bad: true });
      if (t.dragStart) { t.dragStart = null; this._lineSig = null; }
      return false;
    }
    if (t.mode === 'move') {
      const it = t.moving;
      this._removeItemVisual(it);
      Object.assign(it, this._placement(t.def, plan, t.rot));
      it.size = plan.size;
      this._buildVisual(it);
      this._setOcc(it, it.id);
      this.fx.dustBurst(it.group.position, it.fw, it.fd, 1, 10);
      this.tool = null; this._clearGhost(); this.overlay.visible = false; G.uGridOn.value = 0;
      this.emit('tool'); this.emit('change');
      return true;
    }
    if (!this.free) this.pay(plan.cost);
    const it = this.add(t.def.id, { plan, rot: t.rot, v: t.v, ab: this.placeAbandoned, stage: this.placeAbandoned || this.instant ? 4 : 0 });
    this.emit('spent', { cost: plan.cost, at: it.group.position.clone().add(new THREE.Vector3(0, 3, 0)) });
    if (t.dragStart) { t.dragStart = null; this._lineSig = null; this._clearGhost(); }
    if (t.def.area) { this._clearGhost(); this._ghostSize = null; }
    this.emit('change');
    return true;
  }

  // Расчёт позиции по плану
  _placement(def, plan, rot) {
    if (plan.kind === 'line') return { line: { a: plan.a, b: plan.b, ang: plan.ang, segs: plan.segs, L: plan.L }, cells: plan.cells.map(c => [c.cx, c.cz]), rot: 0, fw: plan.L, fd: def.size[1] };
    const p = this.rectCenter(plan.x0, plan.z0, plan.w, plan.d);
    const y = def.plinth === false ? this.avgHeight(plan) : plan.top;
    const found = def.plinth === false ? 0 : plan.top - plan.min;
    return { x0: plan.x0, z0: plan.z0, w: plan.w, d: plan.d, pos: { x: p.x, y, z: p.z }, found, rot, cells: plan.cells.map(c => [c.cx, c.cz]), fw: plan.w, fd: plan.d };
  }

  // Добавить постройку (используется и при загрузке): opts {plan | x0,z0, rot, v, ab, stage, size}
  add(defId, o) {
    const def = BY_ID[defId];
    let plan = o.plan;
    if (!plan) {
      if (def.line) { this.tool = { def }; plan = this._planLine(o.a, o.b); this.tool = null; }
      else { const [w, d] = this.footprint(def, o.rot ?? 0, o.size); plan = { kind: 'rect', x0: o.x0, z0: o.z0, w, d, size: o.size ?? def.size, ...this.checkRect(def, o.x0, o.z0, w, d) }; }
    }
    const it = { id: this.nextId++, def, v: o.v ?? 0, ab: !!o.ab, stage: o.stage ?? 0, size: plan.size, ...this._placement(def, plan, o.rot ?? 0) };
    this.items.set(it.id, it);
    this._buildVisual(it);
    this._setOcc(it, it.id);
    return it;
  }
  _setOcc(it, val) { for (const [x, z] of it.cells) if (this.map.inBounds(x, z)) this.occ[z * this.W + x] = val; }

  _buildVisual(it) {
    const def = it.def;
    const mat = makeToonMaterial({ stage: it.stage, abandon: it.ab ? 1 : 0 });
    const group = new THREE.Group(); group.userData.item = it;
    let fx = [], signs = [];
    if (it.line) {
      const lg = this._lineGroup(def, it.line, it.v, it.ab, mat);
      lg.children.forEach(m => { m.userData.item = it; });
      group.add(...lg.children);
      const s0 = it.line.segs[Math.floor(it.line.segs.length / 2)];
      group.userData.center = new THREE.Vector3(s0.x, s0.y, s0.z);
    } else {
      const r = buildGeometry(def, { v: it.v, ab: it.ab, size: it.size, found: it.found, seed: it.id });
      const mesh = new THREE.Mesh(r.geometry, mat); mesh.userData.item = it;
      group.add(mesh);
      group.position.set(it.pos.x, it.pos.y, it.pos.z);
      group.rotation.y = it.rot * Math.PI / 2;
      if (it.ab) { group.rotation.z = (it.id % 2 ? 1 : -1) * 0.012; group.rotation.x = 0.01; }
      fx = r.fx; signs = r.signs;
      group.userData.center = group.position;
    }
    it.group = group; it.mat = mat; it.fxDefs = fx;
    it.signs = signs.map(s => this._sign(s));
    it.signs.forEach(m => group.add(m));
    this.group.add(group);
    group.updateMatrixWorld(true);
    if (it.stage >= 4) this._startFx(it);
  }
  _sign(s) {
    const tex = makeSignTexture(s.text, s.w, s.h, s.rune);
    const m = makeFlatShader(`in vec2 vUv; in float vZ; uniform sampler2D tMap; uniform float uFogNear, uFogFar, uNight; uniform vec3 uFogCol, uSunCol, uShadeCol;
      void main(){ vec4 t = texture(tMap, vUv); if (t.a < .4) discard; vec3 c = t.rgb * mix(uSunCol, uShadeCol, .45) * 1.1; c = mix(c, uFogCol, smoothstep(uFogNear, uFogFar, vZ)); oColor = vec4(pow(c, vec3(2.2)), 1.); oNormal = vec4(0.); }`,
      `out vec2 vUv; out float vZ; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
      { tMap: { value: tex } }, { transparent: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), m);
    mesh.position.set(s.x, s.y, s.z); mesh.rotation.z = s.rz ?? 0; mesh.layers.set(1);
    mesh.visible = false;
    return mesh;
  }
  _startFx(it) {
    this.fx.removeEmitters(it);
    it.signs.forEach(s => s.visible = true);
    if (it.ab) return;
    const v = new THREE.Vector3();
    for (const f of it.fxDefs) {
      v.set(f.x, f.y, f.z); it.group.localToWorld(v);
      this.fx.addEmitter({ ...f, x: v.x, y: v.y, z: v.z, owner: it });
    }
  }
  _removeItemVisual(it) {
    this.fx.removeEmitters(it);
    this.group.remove(it.group);
    it.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.(); } });
  }
  _rebuild(it) { this._removeItemVisual(it); this._buildVisual(it); }

  // ---------- действия над постройкой ----------
  demolish(it) {
    if (!this.free && !it.ab && it.stage >= 4) this.gain(this.costOf(it.def, it.size), 0.5);
    else if (!this.free && !it.ab) this.gain(this.costOf(it.def, it.size), 0.8 - 0.4 * it.stage / 4);
    this.fx.dustBurst(it.group.userData.center, it.fw, it.fd, 2, 26);
    this._setOcc(it, 0); this._removeItemVisual(it); this.items.delete(it.id);
    if (this.selected === it) this.select(null);
    this.emit('change');
  }
  restoreCost(it) { const c = this.costOf(it.def, it.size); for (const k in c) c[k] = Math.ceil(c[k] * 0.45); return c; }
  restore(it) {
    if (!it.ab) return;
    const cost = this.restoreCost(it);
    if (!this.free && !this.afford(cost)) { this.emit('toast', { text: 'Не хватает на восстановление', bad: true }); return; }
    if (!this.free) this.pay(cost);
    it.ab = false; it.stage = 2.6; this._rebuild(it);
    this.fx.dustBurst(it.group.userData.center, it.fw, it.fd, 2, 24);
    this.emit('toast', { text: `${it.def.name}: восстанавливаем` }); this.emit('change');
  }
  abandon(it) { it.ab = true; it.stage = 4; this._rebuild(it); this.emit('change'); }
  finishNow(it) { it.stage = 4; it.mat.uniforms.uStage.value = 4; this._startFx(it); this.fx.dustBurst(it.group.userData.center, it.fw, it.fd, 2, 16); this.emit('change'); }
  setVariant(it, d) { it.v = (it.v + d + 4) % 4; this._rebuild(it); this.emit('change'); }
  rotateItem(it) {
    if (it.line) return;
    const nr = (it.rot + 1) % 4; const [w, d] = this.footprint(it.def, nr, it.size);
    const cx = it.x0 + Math.floor(it.w / 2), cz = it.z0 + Math.floor(it.d / 2);
    const x0 = cx - Math.floor(w / 2), z0 = cz - Math.floor(d / 2);
    const r = this.checkRect(it.def, x0, z0, w, d, it.id);
    if (!r.ok) { this.emit('toast', { text: 'Не повернуть: ' + r.reasons.join(', '), bad: true }); return; }
    this._setOcc(it, 0);
    Object.assign(it, this._placement(it.def, { kind: 'rect', x0, z0, w, d, ...r }, nr));
    this._rebuild(it); this._setOcc(it, it.id); this.emit('change');
  }
  select(it) {
    if (this.selected?.mat) this.selected.mat.uniforms.uSelect.value = 0;
    this.selected = it;
    if (it) { it.mat.uniforms.uSelect.value = 1; it.mat.uniforms.uTint.value.set(1.0, 0.85, 0.5); }
    this.emit('select', it);
  }
  itemAtCell(cx, cz) { if (!this.map.inBounds(cx, cz)) return null; const id = this.occ[cz * this.W + cx]; return id ? this.items.get(id) : null; }

  // ---------- время ----------
  update(dt) {
    const sdt = dt * this.speed;
    for (const it of this.items.values()) {
      if (it.stage >= 4) continue;
      const prev = it.stage;
      it.stage = Math.min(4, it.stage + sdt * 4 / it.def.time);
      it.mat.uniforms.uStage.value = it.stage;
      if (Math.floor(it.stage) !== Math.floor(prev)) {
        this.fx.dustBurst(it.group.userData.center, it.fw, it.fd, Math.min(it.def.H, 4) * (it.stage / 4), it.stage >= 4 ? 30 : 14);
        if (it.stage >= 4) { this._startFx(it); this.emit('built', it); this.emit('change'); }
        else this.emit('stage', it);
      }
    }
    this.tick += sdt;
    if (this.tick > 2) { this.tick = 0; this.economy(); }
  }
  economy() {
    const s = { people: 0, faith: 0, chthon: 0 }; const inc = { silver: 0, wood: 0, stone: 0 };
    for (const it of this.items.values()) {
      if (it.ab || it.stage < 4) continue;
      const e = this.effectOf(it.def, it.size);
      s.people += e.people ?? 0; s.faith += e.faith ?? 0; s.chthon += e.chthon ?? 0;
      for (const r of RES) inc[r] += e[r] ?? 0;
    }
    // базовый доход: подать с жителей
    inc.silver += s.people * 0.12;
    for (const r of RES) this.res[r] += inc[r];
    this.stats = s; this.income = inc;
    // хтонь: на туман и тени (0..1)
    G.uChthon.value += (Math.min(1, Math.max(0, s.chthon - s.faith * 0.3) / 20) - G.uChthon.value) * 0.5;
    // уровень
    let t = 0;
    for (const T of TIERS) if (Object.entries(T.need).every(([k, v]) => (s[k] ?? 0) >= v)) t = T.id;
    if (t > this.tier) {
      const fresh = BUILDINGS.filter(b => b.tier > this.tier && b.tier <= t);
      fresh.forEach(b => this.newCards.add(b.id));
      this.tier = t;
      this.emit('tier', { tier: TIERS[t], fresh });
    }
    this.emit('economy');
  }

  // ---------- сохранение ----------
  toJSON() {
    return {
      format: 'building-layout/1', cellSize: this.map.cellSize, sector: SECTOR,
      res: this.res, tier: this.tier, owned: [...this.owned], bought: this.boughtCount,
      items: [...this.items.values()].map(it => it.line
        ? { type: it.def.id, line: { a: [it.line.a.cx, it.line.a.cz], b: [it.line.b.cx, it.line.b.cz] }, v: it.v, ab: it.ab, stage: +it.stage.toFixed(2) }
        : { type: it.def.id, x0: it.x0, z0: it.z0, rot: it.rot, size: it.size, v: it.v, ab: it.ab, stage: +it.stage.toFixed(2), pos: { x: +it.pos.x.toFixed(2), y: +it.pos.y.toFixed(2), z: +it.pos.z.toFixed(2) } }),
    };
  }
  load(j) {
    for (const it of [...this.items.values()]) { this._setOcc(it, 0); this._removeItemVisual(it); }
    this.items.clear();
    this.res = { ...j.res }; this.owned = new Set(j.owned); this.boughtCount = j.bought ?? 0; this.tier = j.tier ?? 0;
    for (const s of j.items) {
      if (!BY_ID[s.type]) continue;
      if (s.line) this.add(s.type, { a: { cx: s.line.a[0], cz: s.line.a[1] }, b: { cx: s.line.b[0], cz: s.line.b[1] }, v: s.v, ab: s.ab, stage: s.stage });
      else this.add(s.type, { x0: s.x0, z0: s.z0, rot: s.rot, size: s.size, v: s.v, ab: s.ab, stage: s.stage });
    }
    this._updateOwnTex(); this.economy(); this.emit('change');
  }
}
