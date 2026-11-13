// Вкладка 3. «Соединение»: аудит правил (таблица с фильтром по классам), свободная стройка с подсказкой «будет соединено»
// и кнопка «Показать пример» у каждой пары с анимацией слияния.
import * as THREE from 'three';
import { clamp } from './kit.js';
import { heightAt } from './terrain.js';
import { toonMat } from './core.js';
import { CLASSES, RULES, NOJOIN } from './rules.js';
import { StoneMod } from './j_stone.js';
import { GraphMod, BRIDGES_CFG, FENCES_CFG, ROADS_CFG } from './j_graph.js';
import { PlantMod } from './j_plant.js';
import { BldMod } from './j_bld.js';
import { PlotMod, PropMod } from './j_misc.js';

// ---------------------------------------------------------------- примеры: список шагов {t, ...} для модуля класса
const S = (k, x, z, extra = {}) => ({ pc: { k, x, z, ...extra } });
const at = (t, s) => ({ t, ...s });
const seg = (t, a, b, c, d, st, grow) => at(t, { seg: [a, b, c, d, st, grow] });
const abs = (t, a, b, c, d, st) => at(t, { absSeg: [a, b, c, d, st] });
const FORK_ARMS = [[5.0, 19.4, 9.6, 20.8], [15.2, 17.4, 9.6, 20.8], [11.9, 24.0, 9.6, 20.8]];
export const EX = {
  st_double: [at(0, S('boulder', -1.2, 0)), at(1.0, S('boulder', 0.35, 0.2, { from: [4.8, 0], dur: 1.8 }))],
  st_ridge: [-3.0, -1.5, 0, 1.5, 3.0].map((x, i) => at(i * 0.9, S('boulder', x, (i % 2 ? 0.25 : -0.15), { from: [0, 3.5], dur: 1.3 }))),
  st_slab: [[-1.4, 0], [-0.2, 0.7], [1.0, 0], [-0.1, -0.8]].map(([x, z], i) => at(i * 0.9, S('slab', x, z, { from: [0, 3], dur: 1.2 }))),
  st_block: [[-1.2, 0], [0.2, 0], [1.2, 0.1], [0.55, 0.05]].map(([x, z], i) => at(i * 0.9, S('block', x, z, { from: [0, 3], dur: 1.2 }))),
  st_rune: [0, 1, 2, 3, 4, 5].map((i) => at(i * 0.55, S('rune', Math.cos(i * Math.PI / 3) * 2.0, Math.sin(i * Math.PI / 3) * 2.0, { from: [0, -3], dur: 1.0 }))),
  st_runepair: [at(0, S('rune', -1.3, 0, { from: [-3, 0], dur: 1.6 })), at(0.3, S('rune', 1.3, 0, { from: [3, 0], dur: 1.6 }))],
  st_cobble: [[-0.5, -0.2], [0.3, 0.1], [-0.1, 0.6], [0.8, -0.5], [-0.9, 0.4]].map(([x, z], i) => at(i * 0.5, S('cobble', x, z, { from: [0, 2.5], dur: 1.0 }))),
  st_mix: [at(0, S('boulder', -0.9, 0)), at(1.0, S('slab', 0.6, 0.1, { from: [3, 0], dur: 1.2 })), at(2.2, S('block', -0.1, -1.1, { from: [0, -3], dur: 1.2 }))],

  br_line: [abs(0, 22, 18.4, 22, 22.0, 'most'), abs(1.5, 22, 22.0, 22, 26.4, 'most')],
  br_diag: [abs(0, 21, 18.4, 21.5, 22.2, 'most'), abs(1.5, 21.5, 22.2, 24.6, 26.4, 'most')],
  br_T: [abs(0, 22, 18.4, 22, 26.4, 'most'), abs(1.8, 22, 22.4, 27.5, 22.4, 'most')],
  br_Y: [abs(0, ...FORK_ARMS[0], 'most'), abs(1.5, ...FORK_ARMS[1], 'most'), abs(3.0, ...FORK_ARMS[2], 'most')],
  br_X: [abs(0, 22, 18.4, 22, 26.4, 'most'), abs(1.8, 14.6, 22.1, 29.4, 22.3, 'most')],
  br_mostki: [abs(0, 15.5, 16.9, 22, 18.6, 'mostki'), abs(1.4, 22, 18.6, 22, 26.4, 'most')],
  br_gorb: [abs(0, 22, 18.4, 22, 26.4, 'gorb')],

  fe_line: [seg(0, -6, 0, 0, 0, 'pal', 1), seg(1.6, 0, 0, 6, 0, 'pal', 1)],
  fe_corner: [seg(0, -5, -3, 2, -3, 'pal', 1), seg(1.6, 2, -3, 2, 3, 'pal', 1)],
  fe_T: [seg(0, -6, -2, 6, -2, 'pal', 1), seg(1.8, 0, 4, 0, -2, 'pal', 1)],
  fe_gate: [seg(0, -7, 0, 7, 0, 'pal', 1), at(2.6, { gate: [0, 0] })],
  fe_tower: [seg(0, -5, -3, 3, -3, 'pal', 1), seg(1.4, 3, -3, 3, 3, 'pal', 1), at(3.0, { tower: [-5, -3] }), at(3.6, { tower: [3, -3] }), at(4.2, { tower: [3, 3] })],
  fe_kpp: [seg(0, -8, 0, 8, 0, 'pal', 1), at(2.8, { kpp: [0, 0] })],
  fe_ring: [seg(0, -3, -3, 3, -3, 'pal', 1), seg(0.9, 3, -3, 3, 3, 'pal', 1), seg(1.8, 3, 3, -3, 3, 'pal', 1), seg(2.7, -3, 3, -3, -3, 'pal', 1)],

  pl_fern: [[-1.2, 0], [0.3, 0.4], [1.5, -0.2], [0.2, -1.1]].map(([x, z], i) => at(i * 0.8, S('fern', x, z))),
  pl_moss: [[-1.2, 0], [0.2, 0.3], [1.3, -0.1]].map(([x, z], i) => at(i * 0.8, S('moss', x, z))),
  pl_bush: [[-1.0, 0], [0.4, 0.5], [1.3, -0.3]].map(([x, z], i) => at(i * 0.8, S('bush', x, z))),
  pl_shrub: [[-1.2, 0], [0.3, 0.2], [1.6, -0.1]].map(([x, z], i) => at(i * 0.8, S('shrub', x, z))),
  pl_flower: [['meadow', -1.4, 0], ['fireweed', -0.2, 0.4], ['meadow', 1.0, -0.2], ['fireweed', 0.1, -1.0]].map(([k, x, z], i) => at(i * 0.8, S(k, x, z))),
  pl_mix: [['fern', -1.3, 0], ['moss', -0.2, 0.5], ['bush', 1.1, -0.1], ['moss', 0.0, -0.9], ['fern', 0.8, 0.9]].map(([k, x, z], i) => at(i * 0.7, S(k, x, z))),
  pl_mush: [0, 1, 2, 3, 4].map((i) => at(i * 0.6, S('mushroom', Math.cos(i * 1.256) * 1.2, Math.sin(i * 1.256) * 1.2))),
  pl_vine: [at(0, S('vine', -0.5, -3.4)), at(2.0, S('vine', -0.5, -3.4, { extend: true })), at(3.6, S('vine', -0.5, -3.4, { extend: true }))],
  pl_curtain: [-2.7, -1.6, -0.5, 0.6, 1.7].map((x, i) => at(i * 0.9, S('vine', x, -3.4, { len: 1.4 + (i % 2) * 0.6 }))),

  bd_seni: [at(0, S('izba', 0, 0)), at(1.4, S('seni', 2, 0))],
  bd_klet: [at(0, S('izba', 0, 0)), at(1.4, S('klet', 2, 1))],
  bd_hlev: [at(0, S('izba', 0, 0)), at(1.4, S('hlev', 0, 2))],
  bd_terem: [at(0, S('terem', 0, 0)), at(1.4, S('krylco', 1, 2))],
  bd_krylco: [at(0, S('izba', 0, 0)), at(1.2, S('krylco', 0, 2)), at(2.6, S('krylco', 1, 2)), at(4.0, S('krylco', 2, 2)), at(5.4, S('krylco', 2, 1))],
  bd_market: [-3, -1.05, 0.9, 2.85].map((x, i) => at(i * 0.9, S('bench', x, 0))),
  bd_well: [at(0, S('kolodec', 0, 0)), at(1.8, S('naves', 0, 0))],

  rd_join: [seg(0, -8, -2, 0, 0, 'road', 1), seg(1.4, 0, 0, 8, -2, 'road', 1)],
  rd_T: [seg(0, -8, 0, 8, 0, 'road', 1), seg(1.6, 0, 6, 0, 0, 'road', 1)],
  rd_X: [seg(0, -8, 0, 8, 0, 'road', 1), seg(1.6, 0, -6, 0, 6, 'road', 1)],
  rd_mostki: [seg(0, -7, 2, 0, 2, 'mostki', 1), seg(1.4, 0, 2, 7, 4.5, 'mostki', 1)],
  rd_apron: [seg(0, -8, 0, -1, 0, 'road', 1), seg(1.4, -1, 0, 7, 0, 'mostki', 1)],

  pg_merge: [at(0, S('ogorod', 0, 0)), at(1.4, S('ogorod', 2, 0)), at(2.8, S('ogorod', 0, 2))],
  pg_gate: [at(0, S('ogorod', 0, 0)), at(1.4, S('kalitka', 0, 2.2))],
  pg_scare: [at(0, S('ogorod', 0, 0)), at(1.4, S('pugalo', 0, 0))],

  pr_crate: [[0, 0], [0.74, 0], [0, 0.74], [0.74, 0.74], [0, 0], [0.74, 0], [0, 0]].map(([x, z], i) => at(i * 0.6, S('crate', x, z))),
  pr_barrel: [[-0.8, 0], [0, 0], [0.8, 0], [-0.4, 0], [0.4, 0]].map(([x, z], i) => at(i * 0.7, S('barrel', x, z))),
  pr_wood: [at(0, S('woodpile', -1.8, 0)), at(1.0, S('woodpile', 0, 0)), at(2.0, S('woodpile', 1.8, 0))],
  pr_hay: [at(0, S('stog', -0.8, 0)), at(1.4, S('stog', 0.7, 0.2))],
  pr_cart: [at(0, S('cart', 0, 0)), at(1.2, S('stog', 0.1, 0.1)), at(2.2, S('stog', 0.1, 0.1))],
};
export const EXCAM = { br_Y: { x: 10, z: 21, dist: 12.5, pitch: 0.78, yaw: -0.6 }, br_line: { x: 22, z: 22, dist: 14, pitch: 0.85, yaw: -0.45 }, br_diag: { x: 22.5, z: 22, dist: 14, pitch: 0.85, yaw: -0.45 }, br_T: { x: 23, z: 22, dist: 14, pitch: 0.85, yaw: -0.45 }, br_X: { x: 22, z: 22, dist: 16, pitch: 0.85, yaw: -0.45 }, br_mostki: { x: 20, z: 21, dist: 15, pitch: 0.85, yaw: -0.45 }, br_gorb: { x: 22, z: 22, dist: 13, pitch: 0.75, yaw: 0.4 }, pl_vine: { x: 21, z: 0.6, dist: 8, pitch: 0.5, yaw: -0.2 }, pl_curtain: { x: 21, z: 0.6, dist: 8.5, pitch: 0.5, yaw: -0.2 }, fe_line: { dist: 15 }, fe_kpp: { dist: 17, pitch: 0.55, yaw: -0.35 }, fe_gate: { dist: 15, pitch: 0.55, yaw: -0.35 }, fe_tower: { dist: 15, pitch: 0.6 } };
const EXMOD = { st: 'stones', br: 'bridges', fe: 'fences', pl: 'plants', bd: 'bld', rd: 'roads', pg: 'plots', pr: 'props' };
const PLANTS_ON = { stones: ['grass', 'meadow', 'reeds', 'lily'], plants: ['grass', 'reeds', 'lily'], default: ['grass', 'meadow', 'reeds', 'fireweed', 'fern', 'moss', 'bush', 'lily'] };

const ghostMat = () => toonMat({ color: 0x66e0c8, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });

export class Tab3 {
  constructor(app, el) {
    this.app = app; this.el = el; this.world = app.world; this.rot = 0; this.cls = 'stones'; this.filter = 'stones'; this.kindOf = {};
    this.group = new THREE.Group(); this.group.visible = false; app.stage.scene.add(this.group);
    this.ghost = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat()); this.ghost.renderOrder = 8; this.ghost.frustumCulled = false; this.ghost.visible = false; this.group.add(this.ghost);
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe0a64a, depthTest: false, transparent: true })); this.lines.renderOrder = 9; this.lines.frustumCulled = false; this.group.add(this.lines);
    this.mods = {
      stones: new StoneMod(this), bridges: new GraphMod(this, BRIDGES_CFG), fences: new GraphMod(this, FENCES_CFG), plants: new PlantMod(this),
      bld: new BldMod(this), roads: new GraphMod(this, ROADS_CFG), plots: new PlotMod(this), props: new PropMod(this),
    };
    this.timeline = []; this.clock = 0; this.hover = null; this.maskT = 0; this.maskDirty = false; this.demoTitle = null;
    this.buildUI();
  }
  get mod() { return this.mods[this.cls]; }
  // ---------------------------------------------------------------- интерфейс
  buildUI() {
    const el = this.el;
    el.innerHTML = `
      <h2>Соединение объектов</h2>
      <p>Правила слияния, выведенные из каталога Godot. Выберите класс, ставьте объекты щелчком: призрак покажет, что получится, и подпишет «будет соединено». У каждой пары есть пример с анимацией.</p>
      <div class="row" id="t3chips" role="group" aria-label="Класс объектов"></div>
      <h3>Ставить <span class="note" id="t3cls"></span></h3>
      <div class="pal" id="t3pal"></div>
      <div class="row"><button class="btn" id="t3rot" type="button">Повернуть (R)</button><button class="btn" id="t3undo" type="button">Отменить</button><button class="btn" id="t3clear" type="button">Очистить</button><button class="btn" id="t3end" type="button" hidden>Закончить линию</button></div>
      <h3>Таблица соединений <span class="note" id="t3count"></span></h3>
      <ul class="rl" id="t3rules"></ul>
      <h3>Что не соединяется</h3>
      <ul class="rl nj" id="t3nj"></ul>`;
    const chips = el.querySelector('#t3chips'); this.chipEls = {};
    const mk = (id, name) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => this.setFilter(id)); chips.appendChild(b); this.chipEls[id] = b; };
    for (const c of CLASSES) mk(c.id, c.short);
    mk('all', 'все');
    this.palEl = el.querySelector('#t3pal'); this.rulesEl = el.querySelector('#t3rules'); this.njEl = el.querySelector('#t3nj');
    el.querySelector('#t3rot').addEventListener('click', () => this.onRotate());
    el.querySelector('#t3undo').addEventListener('click', () => { const e = this.mod.undo(); if (e) this.app.toast(e); this.updateGhost(); });
    el.querySelector('#t3clear').addEventListener('click', () => { this.mod.clear(); this.timeline = []; this.updateGhost(); });
    this.endBtn = el.querySelector('#t3end'); this.endBtn.addEventListener('click', () => { this.mod.cancel && this.mod.cancel(); this.updateGhost(); });
    // карточки правил строятся один раз
    this.cardEls = {};
    for (const r of RULES) {
      const li = document.createElement('li'); li.className = 'rule'; li.dataset.cls = r.cls; li.dataset.id = r.id;
      li.innerHTML = `<div class="rt"><b>${r.a} + ${r.b}</b><span class="arrow">→</span><span class="res">${r.res}</span></div><div class="rs">${r.how}</div><details><summary>Как в Godot, ограничения</summary><div class="rd"><p><b>Приём.</b> ${r.tech}</p><p><b>Ограничения.</b> ${r.lim}</p></div></details><div class="rb"><button class="btn" type="button" data-demo="${r.id}">Показать пример</button></div>`;
      li.querySelector('[data-demo]').addEventListener('click', () => this.demo(r.id));
      this.rulesEl.appendChild(li); this.cardEls[r.id] = li;
    }
    for (const n of NOJOIN) { const li = document.createElement('li'); li.className = 'rule nj'; li.dataset.cls = n.cls; li.innerHTML = `<div class="rt"><b>${n.a} + ${n.b}</b><span class="arrow">✕</span></div><div class="rs">${n.why}</div>`; this.njEl.appendChild(li); }
    this.setFilter('stones', true);
  }
  setFilter(f, silent) {
    this.filter = f;
    for (const k in this.chipEls) this.chipEls[k].setAttribute('aria-pressed', String(k === f));
    let shown = 0;
    for (const li of this.rulesEl.children) { const on = f === 'all' || li.dataset.cls === f; li.hidden = !on; if (on) shown++; }
    for (const li of this.njEl.children) li.hidden = !(f === 'all' || li.dataset.cls === f);
    this.el.querySelector('#t3count').textContent = shown + ' пар';
    if (f !== 'all') this.setClass(f, silent);
  }
  setClass(c, silent) {
    if (this.mods[this.cls] && this.cls !== c && this.entered) this.mods[this.cls].leave();
    this.cls = c; const m = this.mod; this.timeline = [];
    for (const k in this.mods) this.mods[k].group.visible = false;
    this.palEl.innerHTML = ''; this.palBtns = {};
    this.kindOf[c] = this.kindOf[c] || m.kinds[0].id;
    for (const k of m.kinds) { const b = document.createElement('button'); b.type = 'button'; b.textContent = k.name; b.setAttribute('aria-pressed', String(k.id === this.kindOf[c])); b.addEventListener('click', () => this.setKind(k.id)); this.palEl.appendChild(b); this.palBtns[k.id] = b; }
    this.el.querySelector('#t3cls').textContent = CLASSES.find((x) => x.id === c).name.toLowerCase();
    this.endBtn.hidden = !(m instanceof GraphMod);
    if (this.entered) { m.enter(); this.focusCamera(); this.setPlantSet(); this.treeClear(); this.maskDirty = true; }
    this.updateGhost();
  }
  setKind(id) { this.kindOf[this.cls] = id; for (const k in this.palBtns) this.palBtns[k].setAttribute('aria-pressed', String(k === id)); if (this.mod.cancel) this.mod.cancel(); this.updateGhost(); }
  get kind() { return this.kindOf[this.cls]; }
  onRotate() { this.rot = (this.rot + 1) % 4; this.updateGhost(); }
  onEscape() { this.mod.cancel && this.mod.cancel(); this.updateGhost(); }
  onDigit(n) { const k = this.mod.kinds[n - 1]; if (k) this.setKind(k.id); }
  // ---------------------------------------------------------------- служебное для модулей
  toast(t) { this.app.toast(t, 2400); }
  burst(x, z) { const fx = this.app.fx; for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.283; fx.glow.emit(x + Math.cos(a) * 0.8, heightAt(x, z) + 0.4, z + Math.sin(a) * 0.8, Math.cos(a) * 1.2, 1.2, Math.sin(a) * 1.2, 0x66e0c8, 0.14, 0.9, 1.5, 1.0, 0.9); } }
  pulse(x, z) { this.burst(x, z); }
  changed() { this.maskDirty = true; }
  setPlantSet() { this.app.setPlants(PLANTS_ON[this.cls] || PLANTS_ON.default); }
  treeClear() { const w = this.world, s = this.mod.site; w.restoreTrees(); if (this.cls === 'bridges') { w.hideTrees(14, 21, 16); w.hideTrees(25, 22, 9); } else w.hideTrees(s.x, s.z, 9); }
  focusCamera() {
    const s = this.mod.site, c = this.app.cam; c.setOrbit(new THREE.Vector3(s.x, heightAt(s.x, s.z) + 0.3, s.z), s.yaw, s.pitch, s.dist); c.auto = false;
  }
  // ---------------------------------------------------------------- примеры
  demo(id) {
    const r = RULES.find((q) => q.id === id), steps = EX[id]; if (!r || !steps) { this.app.toast('Для этой пары пример не нужен'); return; }
    const cls = r.cls;
    if (this.filter !== 'all' && this.filter !== cls) this.setFilter(cls); else if (this.cls !== cls) this.setClass(cls);
    if (this.filter === 'all' && this.cls !== cls) this.setClass(cls);
    const m = this.mod; m.clear(); if (m.cancel) m.cancel(); this.focusCamera(); { const cc = EXCAM[id], c = this.app.cam; if (cc) { if (cc.x != null) c.center.set(cc.x, heightAt(cc.x, cc.z) + 0.3, cc.z); if (cc.dist) c.dist = cc.dist; if (cc.pitch) c.pitch = cc.pitch; if (cc.yaw != null) c.yaw = cc.yaw; } }
    this.timeline = steps.map((s) => ({ ...s, done: false })); this.clock = -0.4; this.demoTitle = r.a + ' + ' + r.b + ' → ' + r.res; this.demoEnd = Math.max(...steps.map((s) => s.t)) + 3.2;
    for (const k in this.cardEls) this.cardEls[k].classList.toggle('on', k === id);
    const lab = this.app.$('label3'); lab.textContent = 'Пример: ' + this.demoTitle; lab.classList.add('on'); lab.style.borderColor = 'var(--accent)';
    this.ghost.visible = false; this.lines.visible = false;
  }
  // ---------------------------------------------------------------- указатель
  ground(e) {
    const app = this.app, r = app.canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, app.stage.camera);
    const o = ray.ray.origin, d = ray.ray.direction; if (d.y > -0.02) return null;
    let t = (0.3 - o.y) / d.y; if (!(t > 0)) return null;
    for (let k = 0; k < 6; k++) { const x = o.x + d.x * t, z = o.z + d.z * t; t = (Math.max(heightAt(x, z), -0.2) - o.y) / d.y; }
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  }
  onPointerMove(e) { if (e.pointerType === 'touch' && !this.app.drag) return; const p = this.ground(e); if (!p) return; this.hover = p; this.updateGhost(); }
  onClick(e) {
    const p = this.ground(e); if (!p) return;
    if (e.pointerType === 'touch' && (!this.hover || Math.hypot(this.hover.x - p.x, this.hover.z - p.z) > 1.0)) { this.hover = p; this.updateGhost(); return; }
    this.hover = p; this.place();
  }
  place() {
    if (!this.hover) return; this.timeline = [];
    const err = this.mod.click(this.kind, this.hover, this.rot); if (err) this.app.toast('Нельзя здесь: ' + err);
    this.updateGhost();
  }
  updateGhost() {
    const lab = this.app.$('label3');
    if (this.timeline.length) return;
    if (!this.hover || !this.entered) { this.ghost.visible = false; this.lines.visible = false; return; }
    const m = this.mod; const info = m.hover(this.kind, this.hover, this.rot);
    for (const k in this.cardEls) this.cardEls[k].classList.toggle('on', !!info && info.rule === k && !info.err);
    if (!info) { this.ghost.visible = false; this.lines.visible = false; lab.classList.remove('on'); return; }
    const old = this.ghost.geometry; this.ghost.geometry = info.geo || new THREE.BufferGeometry(); if (old !== info.geo && old !== this.lastGeo) old.dispose(); this.lastGeo = info.geo;
    this.ghost.visible = !!info.geo;
    this.ghost.material.color.set(!info.ok ? 0xe0704a : info.text ? 0xe0c04a : 0x66e0c8);
    // нити к партнёрам
    const pts = []; if (info.ok && info.parts) for (const q of info.parts) { pts.push(this.hover.x, heightAt(this.hover.x, this.hover.z) + 1.0, this.hover.z, q[0], heightAt(q[0], q[1]) + 1.0, q[1]); }
    this.lines.geometry.dispose(); this.lines.geometry = new THREE.BufferGeometry(); this.lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); this.lines.visible = pts.length > 0;
    if (!info.ok) { lab.textContent = 'Нельзя: ' + info.err; lab.style.borderColor = 'var(--danger)'; lab.classList.add('on'); }
    else if (info.text) { lab.textContent = info.text.startsWith('будет') ? info.text[0].toUpperCase() + info.text.slice(1) : 'Будет соединено: ' + info.text; lab.style.borderColor = 'var(--accent)'; lab.classList.add('on'); }
    else { const nm = this.mod.kinds.find((k) => k.id === this.kind)?.name || ''; lab.textContent = nm + ': рядом нет объектов для соединения'; lab.style.borderColor = 'var(--line)'; lab.classList.add('on'); }
  }
  // ---------------------------------------------------------------- жизненный цикл
  enter() {
    const app = this.app; this.entered = true;
    app.hero.group.visible = false; app.hero.item && (app.hero.item.visible = false);
    this.group.visible = true; this.hideGL = false;
    for (const k in this.mods) this.mods[k].group.visible = false;
    this.mod.enter(); this.setPlantSet(); this.focusCamera(); this.treeClear();
    app.hint('Перетащите, чтобы повернуть камеру. Колесо меняет масштаб. WASD сдвигает камеру. <span class="kbd">R</span> поворот, <span class="kbd">Esc</span> конец линии, цифры выбирают объект.');
    app.setTouch(false);
    const mini = app.$('mini'); mini.classList.add('on'); mini.innerHTML = '<button class="btn" id="mRot" type="button">Повернуть</button><button class="btn primary" id="mPut" type="button">Поставить</button>';
    mini.querySelector('#mRot').onclick = () => this.onRotate(); mini.querySelector('#mPut').onclick = () => this.place();
    this.maskDirty = true; this.updateGhost();
  }
  leave() {
    const app = this.app; this.entered = false; this.group.visible = false; for (const k in this.mods) this.mods[k].group.visible = false; this.world.decks.length = 0;
    app.$('mini').classList.remove('on'); app.$('label3').classList.remove('on'); this.ghost.visible = false; this.lines.visible = false;
    app.dig.mask.setBuild(() => false); this.world.restoreTrees();
  }
  focus() { return this.app.cam.center; }
  update(dt, t) {
    const app = this.app, k = app.keys, c = app.cam;
    const ix = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), iz = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0);
    if (ix || iz) { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), sp = 14 * dt * (c.dist / 33); c.center.x = clamp(c.center.x + (fx * iz - fz * ix) * sp, -28, 28); c.center.z = clamp(c.center.z + (fz * iz + fx * ix) * sp, -28, 28); }
    c.update(dt, c.center);
    // пример
    if (this.timeline.length) {
      this.clock += dt;
      for (const s of this.timeline) if (!s.done && this.clock >= s.t) { s.done = true; this.mod.step(s); }
      if (this.clock > this.demoEnd) { this.timeline = []; const lab = this.app.$('label3'); lab.classList.remove('on'); this.updateGhost(); }
    }
    this.mod.update(dt, t);
    this.maskT += dt; if (this.maskDirty && this.maskT > 0.3) { this.maskT = 0; this.maskDirty = false; const m = this.mod; app.dig.mask.setBuild((x, z) => m.occupies(x, z)); }
    if (this.ghost.visible) this.ghost.material.opacity = 0.55 + 0.1 * Math.sin(t * 6);
  }
}
