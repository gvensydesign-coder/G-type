// Вкладка 4. Рубка и сбор: топор и кирка в руках, щепки, падение дерева, брёвна, ягоды, камень, грибы, вода, колода и ящик.
import * as THREE from 'three';
import { G, rng, clamp, lerp, smooth } from './kit.js';
import { heightAt, WATER_Y } from './terrain.js';
import { obb } from './solids.js';
import { vcMat } from './core.js';
import { treeGeo } from './world.js';
import { plantGeometry, wDist } from './plants.js';
import { makeAxe, makePick, stump, crate } from './buildings.js';
import { driveHero } from './tab2.js';

const CHOP = ['Attack3', 'Attack', 'Attack4'];
const LABEL = { logs: 'брёвна', stone: 'камень', berry: 'ягоды', mush: 'грибы', water: 'вода', wood: 'дрова' };

export class Tab4 {
  constructor(app, el) {
    this.app = app; this.el = el; this.t = 0;
    this.res = { logs: 0, stone: 0, berry: 0, mush: 0, water: 0, wood: 0 }; this.crateLogs = 0;
    this.group = new THREE.Group(); app.stage.scene.add(this.group); this.group.visible = false;
    this.mat = vcMat({ side: THREE.DoubleSide });
    this.axe = makeAxe(); this.pick = makePick();
    this.trees = []; this.bushes = []; this.deposits = []; this.mush = []; this.logs = []; this.colliders = []; this.falling = [];
    this.build();
    this.populate();
    el.innerHTML = `
      <h2>Рубка и сбор</h2>
      <p>Подойдите к дереву и нажмите <span class="kbd">E</span>. Богатырь берёт топор, бьёт тремя ударами по клипам Attack, дерево падает и превращается в брёвна. Так же собираются ягоды, камень, грибы и вода.</p>
      <h3>Что есть на сцене</h3>
      <ul class="live" id="t4list"></ul>
      <h3>Запасы</h3>
      <div class="card"><div class="kv" id="t4res"></div></div>
      <h3>Новые объекты</h3>
      <p style="font-size:13px"><b>Колода</b> у деревни: положите на неё брёвна, и топор раскалывает их на дрова. <b>Ящик</b> рядом: в нём остаются брёвна, взятые на склад.</p>
      <div class="row"><button class="btn" id="t4tp1" type="button">К роще</button><button class="btn" id="t4tp2" type="button">К кустам</button><button class="btn" id="t4tp3" type="button">К камню</button><button class="btn" id="t4tp4" type="button">К колоде и ящику</button></div>`;
    const list = el.querySelector('#t4list');
    for (const t of ['Дерево: топор, 3 удара', 'Ягодный куст: собрать ягоды', 'Каменная жила: кирка, 3 удара', 'Гриб: сорвать', 'Вода: набрать у берега', 'Колода: расколоть брёвна', 'Ящик: сложить брёвна']) { const li = document.createElement('li'); li.innerHTML = `<i></i><span>${t}</span>`; list.appendChild(li); }
    this.resEl = el.querySelector('#t4res');
    const tp = (x, z, yaw) => () => { app.hero.teleport(x, z, yaw); app.cam.yaw = yaw; app.cam.inited = false; };
    el.querySelector('#t4tp1').onclick = tp(-3, -2.5, 3.14); el.querySelector('#t4tp2').onclick = tp(-11, -0.5, 1.2);
    el.querySelector('#t4tp3').onclick = tp(-8.5, -15, 3.14); el.querySelector('#t4tp4').onclick = tp(-9.5, 3, 1.57);
    this.updateRes();
  }
  build() { }
  populate() {
    const r = rng(91), g = this.group, add = (m) => { g.add(m); return m; };
    // ---- деревья для рубки
    const spots = [[-6.5, -9, 'pine', 1.15], [-2.4, -10.6, 'spruce', 1.1], [1.6, -8.6, 'pine', 1.25], [-8.4, -4.4, 'spruce', 1.0], [3.4, -4.2, 'pine', 1.1], [-0.6, -13.2, 'spruce', 1.2]];
    for (const [x, z, kind, s] of spots) {
      const gy = heightAt(x, z);
      const geo = treeGeo(kind, 3 + this.trees.length);
      const grp = new THREE.Group(); grp.position.set(x, gy, z);
      const m = new THREE.Mesh(geo, this.mat); m.castShadow = true; m.receiveShadow = true; m.scale.setScalar(s); grp.add(m);
      this.group.add(grp);
      const col = { x, z, r: 0.2 * s + 0.1 };
      this.colliders.push(col);
      this.trees.push({ x, z, kind, s, grp, mesh: m, hp: 3, alive: true, shake: 0, col, name: kind === 'pine' ? 'сосну' : 'ель' });
    }
    // ---- ягодные кусты
    const bm = new THREE.MeshToonMaterial({ color: 0xd04a5e });
    for (const [x, z] of [[-13.2, -2.2], [-14.6, -4.2], [-11.6, -5.2]]) {
      const gy = heightAt(x, z), s = 1.0 + r() * 0.2;
      const body = new THREE.Mesh(plantGeometry('shrub'), this.mat); body.position.set(x, gy, z); body.scale.setScalar(s * 0.85); body.castShadow = true; body.receiveShadow = true; this.group.add(body);
      const berries = new THREE.Group(); berries.position.set(x, gy, z);
      const bg = new THREE.IcosahedronGeometry(0.055, 0);
      for (let k = 0; k < 16; k++) { const a = r() * 6.28, d = 0.35 + r() * 0.35, b = new THREE.Mesh(bg, bm); b.position.set(Math.cos(a) * d * s, 0.35 + r() * 0.65, Math.sin(a) * d * s); berries.add(b); }
      this.group.add(berries);
      const col = { x, z, r: 0.55 }; this.colliders.push(col);
      this.bushes.push({ x, z, berries, ready: true, t: 0, col });
    }
    // ---- каменные жилы
    const sg = new G(14); sg.jit = 0.06;
    sg.blob(0, 0.45, 0, 0.9, 0x4e5660, { sy: 0.8, detail: 1, noise: 0.2, seed: 5, top: 0x8794a0 });
    sg.blob(0.8, 0.3, 0.3, 0.55, 0x565e68, { sy: 0.8, detail: 1, noise: 0.2, seed: 6, top: 0x8f9ba6 });
    sg.blob(-0.5, 0.28, 0.7, 0.45, 0x4a525c, { sy: 0.8, detail: 1, noise: 0.2, seed: 7, top: 0x7e8a96 });
    sg.blob(0.2, 0.9, -0.1, 0.35, 0x5a626c, { sy: 0.8, detail: 1, noise: 0.15, seed: 8, top: 0x9aa6b2 });
    for (let k = 0; k < 6; k++) { const a = k * 1.1; sg.blob(Math.cos(a) * 0.75, 0.45 + (k % 3) * 0.2, Math.sin(a) * 0.75, 0.07, 0x7ae8ff, { detail: 0, noise: 0.1, seed: k, top: 0xc8f6ff }); }
    const sgeo = sg.build();
    for (const [x, z] of [[-8.5, -18.2], [-11.2, -20.4]]) {
      const gy = heightAt(x, z); const m = new THREE.Mesh(sgeo, this.mat); m.position.set(x, gy - 0.05, z); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
      const col = { x, z, r: 1.0 }; this.colliders.push(col);
      this.deposits.push({ x, z, mesh: m, hp: 3, ready: true, t: 0, col, big: 1 });
    }
    // ---- грибы
    const mg = plantGeometry('mushroom');
    for (const [x, z] of [[4.0, -9.8], [5.2, -11.0], [3.1, -11.4], [5.9, -8.6]]) {
      const m = new THREE.Mesh(mg, this.mat); m.position.set(x, heightAt(x, z), z); m.scale.setScalar(1.7); m.castShadow = true; this.group.add(m);
      this.mush.push({ x, z, mesh: m, ready: true, t: 0 });
    }
    // ---- колода и ящик
    {
      const x = -6.4, z = 2.2, gy = heightAt(x, z);
      const sg2 = new G(3); stump(sg2, 0, 0, 0, 1.5, 2);
      const m = new THREE.Mesh(sg2.build(), this.mat); m.position.set(x, gy, z); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
      // топор воткнут сверху
      const ax = makeAxe(); ax.position.set(x + 0.1, gy + 0.78, z); ax.rotation.set(0, 0.5, 2.7); this.group.add(ax); this.blockAxe = ax;
      this.block = { x, z, col: { x, z, r: 0.55 }, pile: new THREE.Group() }; this.colliders.push(this.block.col);
      this.block.pile.position.set(x, gy, z); this.group.add(this.block.pile);
    }
    {
      const x = -12.6, z = 1.6, gy = heightAt(x, z);
      const bodyG = new G(4); bodyG.box(0, 0.4, 0, 1.2, 0.8, 0.9, 0x6a4e2e, 0, 0x7e6038);
      for (const k of [-0.5, 0, 0.5]) bodyG.box(k, 0.4, 0, 0.1, 0.84, 0.94, 0x4a3822);
      bodyG.box(0, 0.12, 0, 1.24, 0.1, 0.94, 0x4a3822); bodyG.box(0, 0.7, 0, 1.24, 0.1, 0.94, 0x4a3822);
      const body = new THREE.Mesh(bodyG.build(), this.mat); body.position.set(x, gy, z); body.castShadow = true; body.receiveShadow = true; this.group.add(body);
      const lidG = new G(5); lidG.box(0, 0.04, -0.0, 1.3, 0.1, 1.0, 0x7a5a38, 0, 0x8e6c42);
      const lid = new THREE.Mesh(lidG.build(), this.mat); lid.position.set(x, gy + 0.82, z - 0.5); const pv = new THREE.Group(); pv.position.set(x, gy + 0.82, z - 0.5); lid.position.set(0, 0, 0.5); pv.add(lid); lid.castShadow = true; this.group.add(pv);
      const inner = new THREE.Group(); inner.position.set(x, gy + 0.5, z); this.group.add(inner);
      this.crate = { x, z, lid: pv, open: 0, openT: 0, inner, col: obb(x, z, 0.64, 0.49, 0) }; this.colliders.push(this.crate.col);
    }
  }
  updateRes() {
    this.resEl.innerHTML = Object.keys(LABEL).map((k) => `<span>${LABEL[k][0].toUpperCase() + LABEL[k].slice(1)}</span><span>${this.res[k]}</span>`).join('') + `<span>В ящике</span><span>${this.crateLogs} бр.</span>`;
    const c = this.app.$('counters');
    c.innerHTML = ['logs', 'stone', 'berry', 'mush', 'water', 'wood'].map((k) => `<div>${LABEL[k][0].toUpperCase() + LABEL[k].slice(1)} <b>${this.res[k]}</b></div>`).join('');
  }
  enter() {
    const app = this.app, h = app.hero;
    this.group.visible = true; h.group.visible = true; h.locked = false; h.extraColliders = this.colliders; app.cam.extraTrees = this.trees;
    if (!this.started) { this.started = true; h.teleport(-3, -2.4, 3.14); app.cam.yaw = 3.14; }
    app.cam.setFollow(5.6, 0.36); app.cam.height = 1.4;
    app.$('counters').classList.add('on'); this.updateRes();
    app.hint('<span class="kbd">E</span> действие рядом с деревом, кустом, камнем, грибом, водой, колодой и ящиком · <span class="kbd">WASD</span> ходьба');
    app.setTouch(true);
  }
  leave() {
    const h = this.app.hero; this.app.cam.extraTrees = null; this.group.visible = false; h.extraColliders = null; h.cancelAct(); h.equip(null); h.locked = false; this.app.$('counters').classList.remove('on'); this.busy = false;
  }
  focus() { return this.app.hero.pos; }
  // ---- что рядом
  target() {
    const h = this.app.hero, p = h.pos; let best = null, bd = 1e9;
    const consider = (o, x, z, r, text, fn) => { const d = Math.hypot(p.x - x, p.z - z); if (d < r && d < bd) { bd = d; best = { o, text, fn, x, z }; } };
    for (const t of this.trees) if (t.alive) consider(t, t.x, t.z, 2.3, `E: рубить ${t.name} (${t.hp} уд.)`, () => this.chop(t));
    for (const l of this.logs) if (!l.taken) consider(l, l.x, l.z, 1.7, 'E: подобрать брёвна', () => this.pickLogs(l));
    for (const b of this.bushes) if (b.ready) consider(b, b.x, b.z, 1.9, 'E: собрать ягоды', () => this.pickBerries(b));
    for (const d of this.deposits) if (d.ready) consider(d, d.x, d.z, 2.4, `E: добыть камень киркой (${d.hp} уд.)`, () => this.mine(d));
    for (const m of this.mush) if (m.ready) consider(m, m.x, m.z, 1.5, 'E: сорвать гриб', () => this.pickMush(m));
    consider(this.block, this.block.x, this.block.z, 1.9, this.res.logs > 0 ? 'E: расколоть брёвна на колоде' : 'Колода: нужны брёвна', () => this.split());
    consider(this.crate, this.crate.x, this.crate.z, 2.0, this.res.logs > 0 ? 'E: сложить брёвна в ящик' : 'Ящик: пока пусто, брёвна можно сложить', () => this.store());
    if (!best && wDist(p.x, p.z) < 1.5 && h.pos.y < 0.4) consider('water', p.x, p.z, 5, 'E: набрать воды', () => this.drink());
    return best;
  }
  onInteract() { if (this.busy || this.app.hero.act) return; const t = this.target(); if (t && t.fn) t.fn(); }
  face(x, z) { const h = this.app.hero; h.yaw = Math.atan2(x - h.pos.x, z - h.pos.z); h.ch.yaw = h.yaw; h.vel.set(0, 0); this.app.cam.yawTo = h.yaw + 0.5; }
  equip(item) { const h = this.app.hero; h.equip(item); clearTimeout(this.unT); this.unT = setTimeout(() => { if (!this.busy) h.equip(null); }, 5000); }
  swing(clip, onHit, onEnd, rate = 1.15) {
    const h = this.app.hero;
    h.playAct(clip, { rate, from: 0.2, to: 1.3, lock: true, events: [{ t: 0.7, fn: onHit }], onEnd });
  }
  // ---- рубка дерева
  chop(t) {
    const h = this.app.hero; this.busy = true; this.face(t.x, t.z); this.equip(this.axe);
    let n = 0;
    const next = () => {
      if (!t.alive) { this.busy = false; return; }
      const clip = CHOP[n % 3]; n++;
      this.swing(clip, () => this.hitTree(t), () => { if (t.hp > 0) next(); else this.busy = false; });
    };
    // шаг к дереву, если далеко
    next();
  }
  hitTree(t) {
    const h = this.app.hero, fx = this.app.fx;
    t.hp--; t.shake = 1;
    const dx = h.pos.x - t.x, dz = h.pos.z - t.z, d = Math.hypot(dx, dz) || 1;
    const hy = heightAt(t.x, t.z) + 1.1;
    for (let k = 0; k < 14; k++) fx.soft.emit(t.x + dx / d * 0.3 + (Math.random() - 0.5) * 0.2, hy + (Math.random() - 0.5) * 0.3, t.z + dz / d * 0.3 + (Math.random() - 0.5) * 0.2, dx / d * (1 + Math.random() * 2) + (Math.random() - 0.5), 1.2 + Math.random() * 2.2, dz / d * (1 + Math.random() * 2) + (Math.random() - 0.5), Math.random() < 0.7 ? 0xcfb27c : 0x8a6a40, 0.03 + Math.random() * 0.03, 0.7 + Math.random() * 0.4, 9, 0.5, 1);
    for (let k = 0; k < 12; k++) fx.soft.emit(t.x + (Math.random() - 0.5) * 2, hy + 3 + Math.random() * 2.5, t.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1, -0.2, (Math.random() - 0.5) * 1, Math.random() < 0.5 ? 0x3f7a48 : 0x6a9a4a, 0.09, 1.8 + Math.random(), 0.7, 1.2, 0.95);
    if (t.hp <= 0) this.fell(t, -dx / d, -dz / d);
  }
  fell(t, fx_, fz_) {
    t.alive = false; t.col.r = 0.3; this.falling.push({ t, f: [fx_, fz_], p: 0 });
    this.stumpAt(t);
  }
  stumpAt(t) {
    const g = new G(8); stump(g, 0, 0, 0, 0.9, 1);
    const m = new THREE.Mesh(g.build(), this.mat); m.position.set(t.x, heightAt(t.x, t.z), t.z); m.castShadow = true; m.receiveShadow = true; this.group.add(m); t.stump = m;
  }
  spawnLogs(t, f) {
    const fx = this.app.fx; const logs = [];
    const gy0 = heightAt(t.x, t.z);
    for (let k = 0; k < 3; k++) {
      const dist = 1.6 + k * 1.55, x = t.x + f[0] * dist, z = t.z + f[1] * dist; const gy = heightAt(x, z);
      const ang = Math.atan2(f[0], f[1]) + (k - 1) * 0.25;
      const g = new G(20 + k); g.jit = 0.05; const dx = Math.sin(ang) * 0.75, dz = Math.cos(ang) * 0.75;
      g.prism([-dx, 0, -dz], [dx, 0, dz], 0.19, 0x5c4128, 8, 1, 0x6e5034, false);
      g.prism([dx, 0, dz], [dx + Math.sin(ang) * 0.002, 0, dz + Math.cos(ang) * 0.002], 0.17, 0xc8aa78, 8, 1, 0xd8ba88, true);
      g.prism([-dx, 0, -dz], [-dx - Math.sin(ang) * 0.002, 0, -dz - Math.cos(ang) * 0.002], 0.17, 0xc8aa78, 8, 1, 0xd8ba88, true);
      const m = new THREE.Mesh(g.build(), this.mat); m.position.set(x, gy + 0.19, z); m.castShadow = true; m.receiveShadow = true; m.scale.setScalar(0.01); this.group.add(m);
      this.logs.push({ x, z, mesh: m, taken: false, grow: 0, y: gy + 0.19, group: logs }); logs.push(this.logs[this.logs.length - 1]);
      for (let q = 0; q < 8; q++) fx.dust(x, gy, z, 0, 0, 1, 0x4a5a40);
    }
  }
  pickLogs(l) {
    const h = this.app.hero; this.busy = true; this.face(l.x, l.z);
    const grp = l.group.filter((o) => !o.taken && Math.hypot(o.x - l.x, o.z - l.z) < 6);
    h.playAct('PickUp', { rate: 1.5, from: 0.25, to: 2.3, lock: true, events: [{ t: 1.25, fn: () => { for (const o of grp) { o.taken = true; o.fly = 0; } this.res.logs += grp.length; this.updateRes(); this.app.toast(`+${grp.length} брёвна`); } }], onEnd: () => { this.busy = false; } });
  }
  pickBerries(b) {
    const h = this.app.hero; this.busy = true; this.face(b.x, b.z);
    h.playAct('PickUp', { rate: 1.5, from: 0.25, to: 2.2, lock: true, events: [{ t: 1.25, fn: () => { b.ready = false; b.t = 0; b.berries.visible = false; b.col.r = 0.5; this.res.berry += 4; this.updateRes(); this.app.toast('+4 ягоды'); for (let k = 0; k < 8; k++) this.app.fx.soft.emit(b.x + (Math.random() - 0.5), heightAt(b.x, b.z) + 0.9, b.z + (Math.random() - 0.5), 0, 0.4, 0, 0x4f8a44, 0.08, 1.2, 0.5, 1, 0.9); } }], onEnd: () => { this.busy = false; } });
  }
  pickMush(m) {
    const h = this.app.hero; this.busy = true; this.face(m.x, m.z);
    h.playAct('PickUp', { rate: 1.5, from: 0.25, to: 2.2, lock: true, events: [{ t: 1.25, fn: () => { m.ready = false; m.t = 0; m.mesh.visible = false; this.res.mush += 1; this.updateRes(); this.app.toast('+1 гриб'); this.app.fx.dust(m.x, heightAt(m.x, m.z), m.z, 0, 0, 3, 0x6a5a48); } }], onEnd: () => { this.busy = false; } });
  }
  mine(d) {
    const h = this.app.hero; this.busy = true; this.face(d.x, d.z); this.equip(this.pick);
    const next = () => {
      if (!d.ready) { this.busy = false; return; }
      this.swing('Attack4', () => {
        d.hp--; d.shake = 1; const fx = this.app.fx, y = heightAt(d.x, d.z) + 0.9;
        for (let k = 0; k < 14; k++) fx.soft.emit(d.x + (h.pos.x - d.x) * 0.3 + (Math.random() - 0.5) * 0.5, y + Math.random() * 0.3, d.z + (h.pos.z - d.z) * 0.3 + (Math.random() - 0.5) * 0.5, (h.pos.x - d.x) * 0.6 + (Math.random() - 0.5) * 2, 1.2 + Math.random() * 2, (h.pos.z - d.z) * 0.6 + (Math.random() - 0.5) * 2, Math.random() < 0.6 ? 0x8a94a0 : 0x5a626c, 0.05 + Math.random() * 0.05, 0.7, 9, 0.5, 1);
        for (let k = 0; k < 6; k++) fx.glow.emit(d.x + (h.pos.x - d.x) * 0.35, y, d.z + (h.pos.z - d.z) * 0.35, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, 0xffd890, 0.05, 0.4, 8, 0.5, 1);
        if (d.hp <= 0) { d.ready = false; d.t = 0; d.mesh.scale.setScalar(0.45); d.col.r = 0.5; this.res.stone += 2; this.updateRes(); this.app.toast('+2 камня'); }
      }, () => { if (d.ready) next(); else this.busy = false; }, 1.2);
    };
    next();
  }
  drink() {
    const h = this.app.hero; this.busy = true;
    h.playAct('Crouch', { rate: 1.4, from: 0.3, to: 2.3, lock: true, events: [{ t: 1.2, fn: () => { this.res.water += 1; this.updateRes(); this.app.toast('+1 вода'); this.app.fx.splash(h.pos.x + Math.sin(h.yaw) * 0.8, h.pos.z + Math.cos(h.yaw) * 0.8, 0.6); } }], onEnd: () => { this.busy = false; } });
  }
  split() {
    if (this.res.logs < 1) { this.app.toast('Нужны брёвна'); return; }
    const h = this.app.hero; this.busy = true; this.face(this.block.x, this.block.z); this.equip(this.axe);
    this.res.logs--; this.updateRes();
    this.swing('Attack3', () => {
      const fx = this.app.fx, y = heightAt(this.block.x, this.block.z) + 0.7;
      this.res.wood += 2; this.updateRes(); this.app.toast('+2 дров');
      for (let k = 0; k < 12; k++) fx.soft.emit(this.block.x + (Math.random() - 0.5) * 0.3, y, this.block.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 3, 0xcfb27c, 0.06, 0.8, 9, 0.5, 1);
      this.block.kick = 1;
    }, () => { this.busy = false; });
  }
  store() {
    if (this.res.logs < 1) { this.app.toast('В ящик нечего класть'); return; }
    const h = this.app.hero; this.busy = true; this.face(this.crate.x, this.crate.z);
    this.crate.openT = 1;
    h.playAct('PickUp', { rate: 1.5, from: 0.25, to: 2.2, lock: true, events: [{ t: 1.25, fn: () => { this.crateLogs += this.res.logs; this.addCrateLogs(); this.res.logs = 0; this.updateRes(); this.app.toast('Брёвна в ящике'); } }], onEnd: () => { this.busy = false; setTimeout(() => { this.crate.openT = 0; }, 900); } });
  }
  addCrateLogs() {
    const inner = this.crate.inner; while (inner.children.length) inner.remove(inner.children[0]);
    const n = Math.min(6, this.crateLogs);
    for (let k = 0; k < n; k++) { const g = new G(40 + k); g.prism([-0.45, 0, 0], [0.45, 0, 0], 0.11, 0x5c4128, 7, 1, 0x6e5034, true); const m = new THREE.Mesh(g.build(), this.mat); m.position.set(((k % 3) - 1) * 0.28, (k >> 1) * 0.0 + Math.floor(k / 3) * 0.2, (k % 2) * 0.1 - 0.05); m.rotation.y = 1.57; inner.add(m); }
  }
  // ---- кадр
  update(dt, t) {
    const app = this.app, h = app.hero; this.t = t;
    driveHero(app, dt, t);
    // качка деревьев
    for (const tr of this.trees) if (tr.alive && tr.shake > 0) { tr.shake = Math.max(0, tr.shake - dt * 1.6); tr.grp.rotation.z = Math.sin(t * 40) * 0.025 * tr.shake; tr.grp.rotation.x = Math.cos(t * 33) * 0.02 * tr.shake; }
    for (const d of this.deposits) if (d.shake > 0) { d.shake = Math.max(0, d.shake - dt * 3); d.mesh.position.x = d.x + Math.sin(t * 60) * 0.04 * d.shake; }
    // падение
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i]; f.p += dt / 1.5;
      const tr = f.t; const th = Math.min(1, f.p); const ang = 1.46 * Math.pow(th, 2.3);
      const axis = new THREE.Vector3(f.f[1], 0, -f.f[0]);
      tr.grp.quaternion.setFromAxisAngle(axis, ang);
      if (!f.hit && f.p >= 1) { f.hit = true; for (let k = 0; k < 18; k++) app.fx.dust(tr.x + f.f[0] * (1 + Math.random() * 5), heightAt(tr.x, tr.z), tr.z + f.f[1] * (1 + Math.random() * 5), 0, 0, 1, 0x4a5a40); for (let k = 0; k < 24; k++) app.fx.soft.emit(tr.x + f.f[0] * (2 + Math.random() * 5), heightAt(tr.x, tr.z) + 0.6, tr.z + f.f[1] * (2 + Math.random() * 5), (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, Math.random() < 0.5 ? 0x3f7a48 : 0x6a9a4a, 0.1, 1.6, 4, 1, 0.95); }
      if (f.p >= 1.45) { tr.mesh.visible = false; tr.grp.visible = false; this.spawnLogs(tr, f.f); this.falling.splice(i, 1); }
    }
    // брёвна: появление и полёт к герою
    for (const l of this.logs) {
      if (l.grow < 1 && !l.taken) { l.grow = Math.min(1, l.grow + dt * 3); l.mesh.scale.setScalar(Math.max(0.01, l.grow)); }
      if (l.taken && l.fly != null) { l.fly += dt * 2.2; const k = Math.min(1, l.fly); l.mesh.position.set(lerp(l.x, h.pos.x, k * k), lerp(l.y, h.pos.y + 1.1, k) + Math.sin(k * 3.14) * 0.6, lerp(l.z, h.pos.z, k * k)); l.mesh.scale.setScalar(1 - k * 0.8); if (k >= 1) { l.mesh.visible = false; l.fly = null; } }
    }
    // отрастание
    for (const b of this.bushes) if (!b.ready) { b.t += dt; if (b.t > 40) { b.ready = true; b.berries.visible = true; } }
    for (const d of this.deposits) if (!d.ready) { d.t += dt; if (d.t > 45) { d.ready = true; d.hp = 3; d.mesh.scale.setScalar(1); d.col.r = 1.0; } }
    for (const m of this.mush) if (!m.ready) { m.t += dt; if (m.t > 40) { m.ready = true; m.mesh.visible = true; } }
    // колода: топор подпрыгивает при ударе; ящик: крышка
    if (this.block.kick > 0) { this.block.kick = Math.max(0, this.block.kick - dt * 3); this.blockAxe.position.y = heightAt(this.block.x, this.block.z) + 0.62 + Math.sin(this.block.kick * 3) * 0.05; }
    const c = this.crate; c.open += (c.openT - c.open) * (1 - Math.exp(-dt * 8)); c.lid.rotation.x = -c.open * 1.7;
    // подсказка
    const tg = this.busy || h.act ? null : this.target();
    app.prompt(tg ? tg.text : null);
    // снять инструмент после простоя
  }
}
