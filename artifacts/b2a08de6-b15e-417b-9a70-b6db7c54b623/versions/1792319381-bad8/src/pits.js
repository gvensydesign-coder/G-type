// Ямы и рвы: ловушки (колья, маскировка, падение и оглушение), настил через ров, вкладка 6 «Ямы».
import * as THREE from 'three';
import { G, clamp, lerp, hash2 } from './kit.js';
import { dig, DIG_N, DIG_C, HALF, heightAt, baseHeight, WATER_Y, pond } from './terrain.js';
import { vcMat, toonMat } from './core.js';
import { Hero } from './hero.js';
import { makeShovel } from './buildings.js';

const N = DIG_N, nx = (i) => -HALF + i * DIG_C;
const wood = [0x6a5233, 0x7a6040, 0x5d472c, 0x70573a];

// ================================================================= ловушки, настилы
export class PitProps {
  constructor(app) {
    this.app = app; this.dig = app.dig; this.world = app.world; this.world.pits = this;
    this.group = new THREE.Group(); app.stage.scene.add(this.group);
    this.mat = vcMat({ side: THREE.DoubleSide });
    this.traps = []; this.bridges = []; this.nid = 1; this.log = null;
  }
  // связная яма вокруг точки: узлы с рукотворной глубиной > minD
  findPit(x, z, minD = 0.45) {
    const d = this.dig, n0 = d._node(x, z); if (d.depthDug(nx(n0 % N), nx((n0 / N) | 0)) < minD) return null;
    const seen = new Set([n0]), st = [n0], nodes = [];
    while (st.length && nodes.length < 3000) {
      const n = st.pop(); nodes.push(n); const i = n % N, j = (n / N) | 0;
      for (const m of [i > 0 ? n - 1 : -1, i < N - 1 ? n + 1 : -1, j > 0 ? n - N : -1, j < N - 1 ? n + N : -1]) { if (m < 0 || seen.has(m)) continue; if (-dig.H[m] >= minD * 0.55) { seen.add(m); st.push(m); } }
    }
    let cx = 0, cz = 0; for (const n of nodes) { cx += nx(n % N); cz += nx((n / N) | 0); } cx /= nodes.length; cz /= nodes.length;
    let r = 0; for (const n of nodes) r = Math.max(r, Math.hypot(nx(n % N) - cx, nx((n / N) | 0) - cz));
    return { nodes, cx, cz, r, set: seen };
  }
  trapAt(x, z) { const n = this.dig._node(x, z); return this.traps.find((t) => t.set.has(n)); }
  getTrap(pit) {
    let t = this.traps.find((q) => q.set.has(pit.nodes[0]));
    if (!t) { t = { id: this.nid++, set: pit.set, nodes: pit.nodes, cx: pit.cx, cz: pit.cz, r: pit.r, stakes: [], camo: false, mesh: null, camoMesh: null, camoBorn: 0, born: 0 }; this.traps.push(t); }
    else { t.set = pit.set; t.nodes = pit.nodes; t.cx = pit.cx; t.cz = pit.cz; t.r = pit.r; }
    return t;
  }
  addStakes(x, z) {
    const pit = this.findPit(x, z, 0.6); if (!pit) return 'колья ставят в яму глубже 0,6 м';
    const wet = pit.nodes.some((n) => this.dig.ws[n] > -50); if (wet) return 'в яме вода: колья не держатся';
    const t = this.getTrap(pit); t.stakes.length = 0; t.born = this.app.t;
    for (const n of pit.nodes) { const i = n % N, j = (n / N) | 0; if (-dig.H[n] < 0.55 || (i + j) % 2) continue; const h = hash2(i * 3.7, j * 5.1); if (h < 0.18) continue; t.stakes.push({ x: nx(i) + (h - 0.5) * 0.22, z: nx(j) + (hash2(j, i) - 0.5) * 0.22, tx: (hash2(i, 9) - 0.5) * 0.18, tz: (hash2(9, j) - 0.5) * 0.18, h: 0.5 + hash2(i + j, 3) * 0.35 }); }
    this.buildTrap(t); return null;
  }
  addCamo(x, z) {
    const pit = this.findPit(x, z, 0.6); if (!pit) return 'маскировать можно яму глубже 0,6 м';
    if (pit.nodes.some((n) => this.dig.ws[n] > -50)) return 'в яме вода: маскировка не держится';
    if (pit.nodes.length > 600) return 'слишком широкая яма: настил не удержится (до 12 м²)';
    const t = this.getTrap(pit); t.camo = true; t.camoBorn = this.app.t; this.buildTrap(t); return null;
  }
  // уровень маскировки над ямой (для ног): ровная трава поверх хвороста
  camoAt(x, z) { for (const t of this.traps) { if (!t.camo) continue; const n = this.dig._node(x, z); if (t.set.has(n)) return baseHeight(x, z) + 0.05; } return null; }
  buildTrap(t) {
    if (t.mesh) { this.group.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh = null; }
    if (t.camoMesh) { this.group.remove(t.camoMesh); t.camoMesh.geometry.dispose(); t.camoMesh = null; }
    if (t.stakes.length) {
      const g = new G(t.id * 7); g.jit = 0.04;
      for (const s of t.stakes) { const y = heightAt(s.x, s.z); g.prism([s.x, y - 0.1, s.z], [s.x + s.tx, y + s.h, s.z + s.tz], 0.05, 0x6a5233, 5, 0.12, 0xd8c9a0, false); }
      t.mesh = new THREE.Mesh(g.build(), this.mat); t.mesh.castShadow = true; this.group.add(t.mesh);
    }
    if (t.camo) {
      const g = new G(t.id * 3); g.jit = 0.05;
      for (const n of t.nodes) {
        const i = n % N, j = (n / N) | 0, x = nx(i), z = nx(j), y = baseHeight(x, z) + 0.05, h = hash2(i * 1.3, j * 2.1);
        const c = h < 0.5 ? 0x4a5f3a : h < 0.8 ? 0x55703f : 0x3d5232, e = 0.27;
        g.quad([x - e, y, z - e], [x + e, y, z - e], [x + e, y, z + e], [x - e, y, z + e], c);
        if (h > 0.3) for (let k = 0; k < 3; k++) { const bx = x + (hash2(i + k, 7) - 0.5) * 0.4, bz = z + (hash2(k, j) - 0.5) * 0.4; g.prism([bx, y, bz], [bx + (h - 0.5) * 0.2, y + 0.28 + h * 0.2, bz], 0.018, 0x3a5a28, 3, 0.3, 0x86a85a, false); }
      }
      t.camoMesh = new THREE.Mesh(g.build(), this.mat); t.camoMesh.receiveShadow = true; this.group.add(t.camoMesh);
    }
  }
  // настил через ров: направление поперёк рва
  bridgeAt(x, z) {
    const d = this.dig; if (d.depthDug(x, z) < 0.35 && d.depthAt(x, z) < 0.2) return 'настил кладут на ров или яму';
    let best = null;
    for (let a = 0; a < 12; a++) {
      const an = a / 12 * Math.PI, ux = Math.cos(an), uz = Math.sin(an); let lo = 0, hi = 0;
      const wet = (s) => d.depthDug(x + ux * s, z + uz * s) > 0.3 || d.depthAt(x + ux * s, z + uz * s) > 0.15;
      while (wet(hi + 0.25) && hi < 9) hi += 0.25; while (wet(lo - 0.25) && lo > -9) lo -= 0.25;
      const w = hi - lo; if (!best || w < best.w) best = { w, an, lo, hi, ux, uz };
    }
    if (best.w > 8) return 'ров шире 8 м: настил не уложить';
    const a = [x + best.ux * (best.lo - 0.9), z + best.uz * (best.lo - 0.9)], b = [x + best.ux * (best.hi + 0.9), z + best.uz * (best.hi + 0.9)];
    const ya = heightAt(a[0], a[1]) + 0.14, yb = heightAt(b[0], b[1]) + 0.14, y = Math.max(ya, yb);
    const br = { ax: a[0], az: a[1], bx: b[0], bz: b[1], y, w: 1.5, t: 0 }; this.bridges.push(br); this.buildBridge(br);
    this.world.decks.push({ ax: br.ax, az: br.az, bx: br.bx, bz: br.bz, ya: y, yb: y, hw: 0.75, pit: true });
    return null;
  }
  buildBridge(br) {
    const g = new G(11); g.jit = 0.05; const L = Math.hypot(br.bx - br.ax, br.bz - br.az), ux = (br.bx - br.ax) / L, uz = (br.bz - br.az) / L, nxn = -uz, nzn = ux, y = br.y;
    const P = (s, o, dy = 0) => [br.ax + ux * s + nxn * o, y + dy, br.az + uz * s + nzn * o];
    const n = Math.round(L / 0.3);
    for (let k = 0; k < n; k++) { const s0 = L * k / n, s1 = L * (k + 1) / n - 0.03, m = P(s0, 0); const c = wood[Math.floor(hash2(m[0] * 5, m[2] * 5) * 4) % 4]; g.beam(P(s0, 0, -0.04), P(s1, 0, -0.04), br.w, 0.07, c, 0x8a7048); }
    for (const sd of [-1, 1]) { g.beam(P(0, sd * 0.55, -0.2), P(L, sd * 0.55, -0.2), 0.16, 0.2, 0x4c3a24, 0x5a4630); }
    for (const sd of [-1, 1]) for (const s of [0.3, L * 0.5, L - 0.3]) { const p = P(s, sd * (br.w / 2 - 0.05)); g.prism([p[0], y - 0.1, p[2]], [p[0], y + 0.9, p[2]], 0.05, 0x5a4630, 5, 1, 0x7a6040, true); }
    for (const sd of [-1, 1]) g.beam(P(0.3, sd * (br.w / 2 - 0.05), 0.85), P(L - 0.3, sd * (br.w / 2 - 0.05), 0.85), 0.07, 0.07, 0x5a4630, 0x7a6040);
    br.mesh = new THREE.Mesh(g.build(), this.mat); br.mesh.castShadow = br.mesh.receiveShadow = true; this.group.add(br.mesh);
  }
  reset() {
    for (const t of this.traps) { if (t.mesh) this.group.remove(t.mesh); if (t.camoMesh) this.group.remove(t.camoMesh); } this.traps.length = 0;
    for (const b of this.bridges) this.group.remove(b.mesh); this.bridges.length = 0; this.world.decks.length = 0;
  }
  update(dt) {
    const d = this.dig; if (!this.traps.length) return;
    for (const w of d.walkers) {
      if (!w.group.visible || w.trap || !w.grounded) continue;
      for (const t of this.traps) {
        if (!t.camo) continue; const n = d._node(w.pos.x, w.pos.z);
        if (t.set.has(n) && -dig.H[n] > 0.6) { this.fall(w, t); break; }
      }
    }
  }
  fall(w, t) {
    const x = w.pos.x, z = w.pos.z, stun = t.stakes.length ? 8 : 5;
    t.camo = false; if (t.camoMesh) { this.group.remove(t.camoMesh); t.camoMesh.geometry.dispose(); t.camoMesh = null; }
    for (let k = 0; k < 18; k++) { const a = Math.random() * 6.28; this.app.fx.soft.emit(x + Math.cos(a) * 0.6, baseHeight(x, z) + 0.1, z + Math.sin(a) * 0.6, Math.cos(a) * 1.4, 1.5 + Math.random() * 1.5, Math.sin(a) * 1.4, k % 2 ? 0x4a5f3a : 0x6a5233, 0.16, 0.9, 6, 0.6, 0.9); }
    w.trapFall(heightAt(x, z), stun, d_exit(this.dig, x, z));
    this.log && this.log(w, t, stun);
  }
}
const d_exit = (d, x, z) => d.exitFrom(x, z);

// ================================================================= манекен
const OUTFIT = { enemy: { coat: 0x7b3a3a, legs: 0x2b2224, skin: 0xb59676 }, villager: { coat: 0x3f6068, legs: 0x23282c, skin: 0xb59676 } };
class Dummy {
  constructor(app, kind, slot) {
    this.app = app; this.kind = kind; this.goal = null; this.stuck = 0; this.name = kind === 'enemy' ? 'Манекен-враг' : 'Житель';
    this.h = new Hero(app.gltf, app.world, app.fx, { flat: { ...OUTFIT[kind] }, height: kind === 'enemy' ? 1.78 : 1.68, isHero: false, name: this.name });
    this.h.speedK = kind === 'enemy' ? 0.85 : 0.75; this.h.trSlot = slot; this.h.ai = { mx: 0, mz: 0 }; this.h.noDeep = false;
    app.stage.scene.add(this.h.group);
  }
  place(x, z) { this.h.teleport(x, z, 0); this.goal = null; this.h.group.visible = true; }
  update(dt, t) {
    const h = this.h; let note = null;
    if (!h.trap && this.goal) {
      const dx = this.goal[0] - h.pos.x, dz = this.goal[1] - h.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { h.ai.mx = h.ai.mz = 0; this.goal = null; } else { h.ai.mx = dx / d; h.ai.mz = dz / d; if (h.speed < 0.15) this.stuck += dt; else this.stuck = 0; if (this.stuck > 1.6) note = 'преграда'; }
    } else { h.ai.mx = h.ai.mz = 0; this.stuck = 0; }
    h.update(dt, 0, t); return note;
  }
}

// ================================================================= вкладка 6
const PRESETS = [
  { id: 'stream', name: 'Ров к ручью' }, { id: 'copan', name: 'Копань у реки' }, { id: 'trap', name: 'Ловушка с кольями' },
  { id: 'moat', name: 'Ров вокруг деревни' }, { id: 'bridge', name: 'Настил через ров' },
];
const TOOLS = [
  { id: 'dig', name: 'Лопата', hint: 'Тяните по земле: ров или яма заданной ширины и глубины' },
  { id: 'fill', name: 'Засыпать', hint: 'Тяните по яме: земля возвращается' },
  { id: 'stakes', name: 'Колья', hint: 'Щелчок в сухой яме глубже 0,6 м' },
  { id: 'camo', name: 'Маскировка', hint: 'Щелчок по яме: хворост и дёрн, ловушка готова' },
  { id: 'bridge', name: 'Настил', hint: 'Щелчок по рву: настил ляжет поперёк' },
  { id: 'dummy', name: 'Манекен', hint: 'Щелчок: где встанет, второй щелчок: куда пойдёт' },
];

export class Tab6 {
  constructor(app, el) {
    this.app = app; this.el = el; this.world = app.world; this.dig = app.dig; this.pits = app.pits;
    this.tool = 'dig'; this.W = 2.0; this.D = 1.2; this.dummies = []; this.pending = null; this.hover = null; this.painting = false; this.last = null; this.timeline = []; this.clock = 0; this.statT = 0;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xe0a64a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide })); this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 9; this.ring.visible = false; app.stage.scene.add(this.ring);
    this.line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe0704a, depthTest: false, transparent: true })); this.line.renderOrder = 9; this.line.frustumCulled = false; this.line.visible = false; app.stage.scene.add(this.line);
    this.rainFx = null;
    el.innerHTML = `
      <h2>Ямы и рвы</h2>
      <p>Лопата тянется по земле: рельеф меняется, по краям встаёт отвал, камни и корни выкапываются. Если яма соединена с водой, вода идёт по ней волной и поднимается.</p>
      <h3>Инструмент <span class="note" id="t6hint"></span></h3>
      <div class="pal" id="t6pal"></div>
      <div class="sl"><label>Ширина <b id="t6wv">2,0 м</b><input id="t6w" type="range" min="1" max="3.5" step="0.1" value="2"></label><label>Глубина <b id="t6dv">1,2 м</b><input id="t6d" type="range" min="0.4" max="1.8" step="0.1" value="1.2"></label></div>
      <div class="row"><button class="btn" id="t6rain" type="button" aria-pressed="false">Дождь</button><button class="btn" id="t6spd" type="button">Время ×1</button><button class="btn" id="t6rst" type="button">Сбросить</button></div>
      <h3>Примеры</h3>
      <div class="row" id="t6pre"></div>
      <h3>Состояние</h3>
      <div class="card"><div class="kv"><span>Вынуто земли</span><span id="t6vol">0 м³</span><span>Насыпано в отвал</span><span id="t6spoil">0 м³</span><span>Заполнение водой</span><span id="t6fill">нет вод. ям</span><span>Последнее</span><span id="t6log">—</span></div></div>
      <h3>Правила</h3>
      <ul class="rl" id="t6rules"></ul>`;
    const pal = el.querySelector('#t6pal'); this.palBtns = {};
    for (const t of TOOLS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t.name; b.setAttribute('aria-pressed', String(t.id === this.tool)); b.onclick = () => this.setTool(t.id); pal.appendChild(b); this.palBtns[t.id] = b; }
    const pre = el.querySelector('#t6pre'); for (const p of PRESETS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = p.name; b.onclick = () => this.preset(p.id); pre.appendChild(b); }
    el.querySelector('#t6w').oninput = (e) => { this.W = +e.target.value; el.querySelector('#t6wv').textContent = this.W.toFixed(1).replace('.', ',') + ' м'; this.updateRing(); };
    el.querySelector('#t6d').oninput = (e) => { this.D = +e.target.value; el.querySelector('#t6dv').textContent = this.D.toFixed(1).replace('.', ',') + ' м'; };
    el.querySelector('#t6rain').onclick = (e) => { this.dig.rain = !this.dig.rain; e.currentTarget.setAttribute('aria-pressed', String(this.dig.rain)); this.setRain(); };
    this.spds = [1, 4, 12]; this.spi = 0; el.querySelector('#t6spd').onclick = (e) => { this.spi = (this.spi + 1) % 3; this.dig.speed = this.spds[this.spi]; e.currentTarget.textContent = 'Время ×' + this.dig.speed; };
    el.querySelector('#t6rst').onclick = () => this.reset();
    const rules = el.querySelector('#t6rules');
    for (const [a, b] of [['Яма у воды', 'вода идёт по рву волной со скоростью 1 м/с и поднимается до уровня источника'], ['Яма без воды', 'остаётся сухой, дождь наполняет её понемногу; рядом с рекой (до 5 м) вода просачивается через 6 с и больше'], ['Ловушка', 'колья + маскировка: наступивший проваливается и оглушён 5–8 с, потом выбирается'], ['Для героя', 'вода глубже 0,4 м не пускает, в сухую яму можно спуститься, ловушка роняет'], ['Деревья и избы', 'рядом с корнями и фундаментом копать нельзя'], ['Засыпка', 'возвращает землю, воду и ловушки убирает']]) { const li = document.createElement('li'); li.className = 'rule'; li.innerHTML = `<div class="rt"><b>${a}</b></div><div class="rs">${b}</div>`; rules.appendChild(li); }
    this.setTool('dig');
    this.pits.log = (w, t, stun) => { this.setLog((w.name || 'Фигура') + ' упал в ловушку: оглушён ' + stun + ' с'); app.toast((w.name || 'Фигура') + ' упал в ловушку, оглушён на ' + stun + ' с'); };
    app.dig.onFind = (k, n) => this.setLog(k === 'stone' ? 'Выкопан камень (лежит на отвале)' : 'Выкопаны корни (' + n + ')');
  }
  setLog(t) { const e = this.el.querySelector('#t6log'); if (e) e.textContent = t; }
  setTool(id) { this.tool = id; for (const k in this.palBtns) this.palBtns[k].setAttribute('aria-pressed', String(k === id)); this.el.querySelector('#t6hint').textContent = TOOLS.find((t) => t.id === id).hint; this.pending = null; this.updateRing(); }
  setRain() { const on = this.dig.rain; if (on && !this.rainFx) { this.rainFx = true; } }
  reset() { this.dig.reset(); this.pits.reset(); for (const d of this.dummies) { d.h.group.visible = false; } this.dig.walkers = []; this.dummies.length = 0; this.timeline = []; this.pending = null; this.dig.rain = false; this.el.querySelector('#t6rain').setAttribute('aria-pressed', 'false'); this.world.restoreTrees && 0; this.setLog('—'); }
  // ---- размеры и подсветка
  get R() { return this.tool === 'fill' ? Math.max(1.0, this.W / 2 + 0.3) : this.W / 2; }
  updateRing() { const r = this.tool === 'dig' || this.tool === 'fill' ? this.R : this.tool === 'dummy' ? 0.5 : 0.8; this.ring.scale.set(r, r, r); }
  ground(e) {
    const app = this.app, r = app.canvas.getBoundingClientRect(), ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, app.stage.camera); const o = ray.ray.origin, d = ray.ray.direction; if (d.y > -0.02) return null;
    let t = (0.3 - o.y) / d.y; if (!(t > 0)) return null; for (let k = 0; k < 6; k++) { const x = o.x + d.x * t, z = o.z + d.z * t; t = (Math.max(heightAt(x, z), WATER_Y) - o.y) / d.y; }
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  }
  noOrbit(d) { return (this.tool === 'dig' || this.tool === 'fill') && d.button === 0 && !this.camMode; }
  onPointerDown(e) {
    if ((this.tool === 'dig' || this.tool === 'fill') && e.button === 0 && !this.camMode) { const p = this.ground(e); if (!p) return; this.painting = true; this.last = null; this.paint(p); }
  }
  onPointerUp() { this.painting = false; this.last = null; }
  paint(p) {
    const lab = this.app.$('label3');
    let from = this.last || p; const dist = Math.hypot(p.x - from.x, p.z - from.z), step = Math.max(0.3, this.W * 0.3), n = Math.max(1, Math.ceil(dist / step));
    for (let k = 1; k <= n; k++) {
      const x = lerp(from.x, p.x, k / n), z = lerp(from.z, p.z, k / n);
      if (this.tool === 'fill') { this.dig.brush(x, z, this.R, 0, 'fill', 0.7); continue; }
      const err = this.dig.canDig(x, z, this.R); if (err) { lab.textContent = 'Нельзя копать: ' + err; lab.style.borderColor = 'var(--danger)'; lab.classList.add('on'); this.last = { x, z }; return; }
      lab.classList.remove('on');
      this.dig.stamp(x, z, this.R, this.D);
    }
    this.last = { x: p.x, z: p.z };
  }
  onPointerMove(e) {
    const p = this.ground(e); if (!p) return; this.hover = p;
    this.ring.visible = true; this.ring.position.set(p.x, heightAt(p.x, p.z) + 0.15, p.z);
    if (this.painting) this.paint(p);
    if (this.pending) { const a = [this.pending.h.pos.x, heightAt(this.pending.h.pos.x, this.pending.h.pos.z) + 0.4, this.pending.h.pos.z]; this.line.geometry.dispose(); this.line.geometry = new THREE.BufferGeometry(); this.line.geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, p.x, heightAt(p.x, p.z) + 0.4, p.z], 3)); this.line.visible = true; } else this.line.visible = false;
    if (this.tool === 'dig' || this.tool === 'fill') { const err = this.tool === 'dig' ? this.dig.canDig(p.x, p.z, this.R) : null; this.ring.material.color.set(err ? 0xe0704a : 0xe0a64a); const lab = this.app.$('label3'); if (err && !this.painting) { lab.textContent = 'Нельзя копать: ' + err; lab.style.borderColor = 'var(--danger)'; lab.classList.add('on'); } else if (!this.painting) lab.classList.remove('on'); }
  }
  onClick(e) {
    const p = this.ground(e); if (!p) return; const app = this.app;
    if (this.tool === 'stakes') { const er = this.pits.addStakes(p.x, p.z); app.toast(er ? 'Нельзя: ' + er : 'Колья поставлены на дно ямы'); }
    else if (this.tool === 'camo') { const er = this.pits.addCamo(p.x, p.z); app.toast(er ? 'Нельзя: ' + er : 'Яма замаскирована: ловушка готова'); }
    else if (this.tool === 'bridge') { const er = this.pits.bridgeAt(p.x, p.z); app.toast(er ? 'Нельзя: ' + er : 'Настил уложен поперёк рва'); }
    else if (this.tool === 'dummy') this.dummyClick(p);
  }
  dummyClick(p) {
    if (!this.pending) { const d = this.spawn(this.dummies.length % 2 === 0 ? 'enemy' : 'villager', p.x, p.z); this.pending = d; this.app.toast('Куда пойдёт? Щелчок по цели'); }
    else { this.pending.goal = [p.x, p.z]; this.pending = null; this.line.visible = false; }
  }
  spawn(kind, x, z) {
    let d = this.dummies.find((q) => q.kind === kind && !q.h.group.visible); if (!d) { d = new Dummy(this.app, kind, 1 + this.dummies.length % 2); this.dummies.push(d); }
    d.place(x, z); if (!this.dig.walkers.includes(d.h)) this.dig.walkers.push(d.h); return d;
  }
  // ---- примеры
  preset(id) {
    const app = this.app, dg = this.dig; this.reset(); this.camFor(id);
    const cut = (pts, r) => { for (const [x, z] of pts) this.world.cutTrees(x, z, r); };
    const T = [];
    if (id === 'stream') { const pts = [[9.2, -5.0], [14, -5.5], [19.5, -5.0]]; cut(pts, 2); T.push([0.4, () => dg.digPath(pts, 0.85, 1.1, 5.5)]); app.toast('Ров от ручья: вода идёт волной по мере копки', 3000); }
    else if (id === 'copan') { T.push([0.3, () => { for (const [x, z] of [[14.2, -2.5], [15.2, -2.0], [14.8, -3.2], [13.6, -2.0]]) dg.stamp(x, z, 1.5, 1.3); }]); app.toast('Копань у реки: вода просачивается через грунт, подъём медленный', 3000); }
    else if (id === 'trap') {
      T.push([0.3, () => { dg.stamp(20, 0.5, 1.15, 1.3); }]); T.push([1.8, () => this.pits.addStakes(20, 0.5)]); T.push([3.4, () => this.pits.addCamo(20, 0.5)]);
      T.push([4.8, () => { const d = this.spawn('enemy', 13, -3); d.goal = [27, 4.5]; app.toast('Манекен-враг идёт через замаскированную яму', 2500); }]);
    } else if (id === 'moat') {
      const C = [-9, 6], R = 12.2, pts = []; for (let k = 0; k <= 56; k++) { const a = k / 56 * Math.PI * 2 + 0.55; pts.push([C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R * 0.92]); }
      cut(pts, 2.2); for (const p of pts) dg.mask.hideCircle(p[0], p[1], 1.6);
      const feeder = [[pond.x - 3.6, pond.z - 0.4], [pts[0][0] + 0.2, pts[0][1] + 0.2]];
      T.push([0.3, () => dg.digPath(pts, 1.05, 1.25, 14)]); T.push([0.4, () => dg.digPath([[pond.x - 3.0, pond.z - 0.2], pts[0], pts[1]], 1.05, 1.25, 12)]);
      app.toast('Ров вокруг деревни: копается по кругу и соединяется с прудом', 3500);
    } else if (id === 'bridge') {
      T.push([0.3, () => dg.digPath([[18, -9], [18.4, 0], [18, 8]], 1.0, 1.3, 9)]); T.push([3.2, () => this.pits.bridgeAt(18.3, -1.5)]);
      T.push([4.4, () => { const d = this.spawn('villager', 12, -1.5); d.goal = [25, -1.5]; }]);
    }
    this.timeline = T.map(([t, fn]) => ({ t, fn, done: false })); this.clock = 0;
  }
  camFor(id) {
    const c = this.app.cam, V = THREE.Vector3;
    const s = { stream: [14, -5, 17, 0.7, 0.4], copan: [14.5, -2.5, 15, 0.7, 0.4], trap: [20, 1, 16, 0.7, -0.5], moat: [-9, 6, 42, 0.95, 0.2], bridge: [18, -1, 20, 0.8, 0.5] }[id] || [14, -4, 18, 0.7, 0.4];
    c.setOrbit(new V(s[0], 0, s[1]), s[4], s[3], s[2]); c.auto = false;
  }
  // ---- жизненный цикл
  enter() {
    const app = this.app; this.entered = true;
    app.hero.group.visible = false; app.hero.item && (app.hero.item.visible = false);
    this.camFor('stream'); this.updateRing();
    for (const d of this.dummies) if (d.h.visible) d.h.group.visible = true;
    app.hint('Тяните лопату по земле. Колесо меняет масштаб, WASD сдвигает камеру. С зажатой правой кнопкой или пальцем по кнопке «Камера» можно крутить вид.');
    app.setTouch(false);
    const mini = app.$('mini'); mini.classList.add('on'); mini.innerHTML = '<button class="btn" id="mCam" type="button" aria-pressed="false">Камера</button>'; mini.querySelector('#mCam').onclick = (e) => { this.camMode = !this.camMode; e.currentTarget.setAttribute('aria-pressed', String(this.camMode)); };
    this.dig.walkers = this.dummies.map((d) => d.h);
  }
  leave() {
    this.entered = false; const app = this.app; app.$('mini').classList.remove('on'); app.$('label3').classList.remove('on'); this.ring.visible = false; this.line.visible = false;
    for (const d of this.dummies) d.h.group.visible = false; this.dig.walkers = []; this.painting = false;
  }
  focus() { return this.app.cam.center; }
  update(dt, t) {
    const app = this.app, k = app.keys, c = app.cam;
    const ix = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0), iz = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0);
    if (ix || iz) { const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), sp = 14 * dt * (c.dist / 33); c.center.x = clamp(c.center.x + (fx * iz - fz * ix) * sp, -28, 28); c.center.z = clamp(c.center.z + (fz * iz + fx * ix) * sp, -28, 28); }
    c.update(dt, c.center);
    if (this.timeline.length) { this.clock += dt; for (const s of this.timeline) if (!s.done && this.clock >= s.t) { s.done = true; s.fn(); } if (this.timeline.every((s) => s.done)) this.timeline = []; }
    for (const d of this.dummies) { if (!d.h.group.visible) continue; const n = d.update(dt, t); if (n && !d.noted) { d.noted = true; this.setLog(d.name + ' упёрся в ров: нужен настил'); } if (!n && d.stuck === 0) d.noted = false; }
    this.rain(dt);
    this.statT += dt; if (this.statT > 0.3) { this.statT = 0; const d = this.dig; this.el.querySelector('#t6vol').textContent = d.volume.out.toFixed(1).replace('.', ',') + ' м³'; this.el.querySelector('#t6spoil').textContent = d.volume.spoil.toFixed(1).replace('.', ',') + ' м³'; this.el.querySelector('#t6fill').textContent = d.candCount ? d.fillPct() + ' %' : 'нет ям'; }
  }
  // дождь: полосы частиц над сценой
  rain(dt) {
    if (!this.dig.rain) return; const c = this.app.cam.center, fx = this.app.fx;
    for (let i = 0; i < 40 * dt * 30 / 30; i++) { const x = c.x + (Math.random() - 0.5) * 22, z = c.z + (Math.random() - 0.5) * 22, y = heightAt(x, z) + 7 + Math.random() * 3; fx.soft.emit(x, y, z, 0, -13, 0, 0x9ab8c0, 0.025, 0.65, 0, 0.1, 0.5, 0); }
  }
}
