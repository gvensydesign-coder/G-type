// Вкладка 5. Жители: 8 манекенов-болванок ходят по деревне и занимаются делами, с ними можно поговорить (E).
import * as THREE from 'three';
import { G, rng, clamp, lerp } from './kit.js';
import { heightAt, FIRE } from './terrain.js';
import { Hero } from './hero.js';
import { makeAxe, makeBroom, makeBucket, stump } from './buildings.js';
import { vcMat, U } from './core.js';
import { driveHero } from './tab2.js';

const FLAT = [
  { coat: 0x7b4a3a, legs: 0x2b2f31, skin: 0xb59676 }, { coat: 0x3f6068, legs: 0x23282c, skin: 0xb59676 }, { coat: 0x6c5c3a, legs: 0x2e2a24, skin: 0xa88868 },
  { coat: 0x59406a, legs: 0x26242c, skin: 0xb59676 }, { coat: 0x4b6c4b, legs: 0x252b24, skin: 0xa88868 }, { coat: 0x7d6c48, legs: 0x2c2822, skin: 0xb59676 },
  { coat: 0x6c3b4b, legs: 0x2a2428, skin: 0xa88868 }, { coat: 0x4b5c7c, legs: 0x23262c, skin: 0xb59676 },
];

const PEOPLE = [
  { id: 'water', name: 'Ратмир', role: 'водонос', doing: 'носит воду от колодца к избам', say: 'Вода сегодня холодная, как в январе. Колодец глубокий, ведро идёт долго.', talk: ['Руки мёрзнут, зато знаю каждую избу по шагам.', 'Если нужна вода, набирай у ручья, там чище, чем у пруда.'], news: 'Говорят, в заброшенной избе у дальнего края снова горит огонёк. Я бы не ходил.', trade: 'Вёдра беру только деревянные. Железные звенят, а я люблю тишину.' },
  { id: 'wood', name: 'Горыня', role: 'дровосек', doing: 'колет дрова у поленницы', say: 'Не стой за спиной, топор не разбирает, кто свой.', talk: ['Берёза горит жарко, ель стреляет. Знай, что в печь кладёшь.', 'К зиме надо вдвое больше, чем в прошлый год.'], news: 'В роще у холма три сосны подмыло ручьём. Я хотел свалить, да ты, похоже, быстрее.', trade: 'Дрова за камень, камень за дрова. Деньги не ем.' },
  { id: 'sweep', name: 'Ждана', role: 'метельщица', doing: 'метёт двор перед избой', say: 'Только подмела, а ты опять с грязью на сапогах. Ладно, проходи.', talk: ['Пыль на дороге летит до самой избы. Мету с утра, а к вечеру опять.', 'У меня метла от прабабки. Новую не хочу, она знает, где сор.'], news: 'Вечером у костра будет разговор про волков. Приходи, послушаешь.', trade: 'Метёлки вяжу сама. Одна за пучок сухой травы.' },
  { id: 'sit1', name: 'Велимир', role: 'старик у костра', doing: 'сидит у костра и греет руки', say: 'Садись, погрейся. Огонь не любит спешки.', talk: ['Я этот костёр помню с тех пор, как здесь была одна избушка.', 'Лес слушает, если не шуметь. Попробуй.'], news: 'Туман над ручьём ложится раньше обычного. К перемене, говорю тебе.', trade: 'Торговать нечем. Могу рассказать историю, но это за хлеб.' },
  { id: 'sit2', name: 'Яра', role: 'охотница', doing: 'сидит у костра, чинит лук', say: 'Тише. Я слушаю лес. Что тебе?', talk: ['Следы у ручья свежие. Кто-то крупный пил воду ночью.', 'Лук хорош, пока тетива сухая. Туман её губит.'], news: 'На северной опушке видели оленя с белым пятном. Не стреляй, это к беде.', trade: 'Стрелы у меня свои. Могу отдать пару за шкуру или за ягоды.' },
  { id: 'talk1', name: 'Добрыня', role: 'кузнец', doing: 'разговаривает с Любавой', say: 'А, богатырь. Мы тут о железе спорим. Ты как думаешь, сталь нужна или лучше бронза?', talk: ['Железо в этих краях плохое, ржавеет за неделю.', 'Если принесёшь камень с синими прожилками, скую тебе хороший наконечник.'], news: 'Камень со светящимися прожилками нашли у подножия холма. Говорят, он поёт.', trade: 'Гвозди и скобы есть. За работу беру камнем или брёвнами.' },
  { id: 'talk2', name: 'Любава', role: 'травница', doing: 'разговаривает с Добрыней', say: 'Не вмешивайся, сами разберёмся. Хотя... что нового в лесу?', talk: ['Иван-чай уже зацвёл у заброшенной избы. Скоро будет мёд.', 'Белену и болиголов не трогай. Красивые, а вреда от них больше.'], news: 'Грибы пошли у опушки, гнёздами. Ищи по тени.', trade: 'Отвары и сушёные травы. Заплати ягодами, лучше черникой.' },
  { id: 'patrol', name: 'Мирослав', role: 'дозорный', doing: 'обходит деревню дозором', say: 'Стой. Свой? Ладно, проходи. Но по ночам лучше не шуметь.', talk: ['Обхожу от колодца до околицы. Десять кругов за вечер.', 'Тишина у ручья мне не нравится. Слишком ровная.'], news: 'Дорога у брода размыта. Если пойдёшь на восток, держись левее.', trade: 'Я при деле. Бери что нужно у других, а мне только сказать, если что.' },
];

export class Tab5 {
  constructor(app, el) {
    this.app = app; this.el = el; this.npcs = []; this.mat = vcMat({ side: THREE.DoubleSide });
    this.group = new THREE.Group(); app.stage.scene.add(this.group); this.group.visible = false;
    this.dlg = { open: null };
    el.innerHTML = `
      <h2>Жители</h2>
      <p>Восемь манекенов-болванок занимаются делами в деревне. Подойдите к любому и нажмите <span class="kbd">E</span>, откроется диалог с вариантами ответа.</p>
      <h3>Кто чем занят</h3>
      <ul class="live" id="t5list" style="gap:6px"></ul>
      <p style="font-size:13px">Торговля здесь заглушка: показывает, как будет выглядеть диалог в Godot.</p>`;
    this.build();
  }
  build() {
    const app = this.app, W = app.world;
    // колода дровосека
    { const g = new G(3); stump(g, -14.4, heightAt(-14.4, 9.6), 9.6, 1.1, 4); const m = new THREE.Mesh(g.build(), this.mat); m.castShadow = true; m.receiveShadow = true; this.group.add(m); }
    const spawn = [
      [-5.2, 12.8], [-14.4, 8.5], [-11.5, 9.6], [-12.15, 6.2], [-6.0, 6.2], [-10.6, 2.3], [-9.2, 2.3], [2.0, 2.5],
    ];
    const items = { water: makeBucket(), wood: makeAxe(), sweep: makeBroom() };
    PEOPLE.forEach((P, i) => {
      const flat = { ...FLAT[i] };
      const h = new Hero(app.gltf, W, app.fx, { flat, height: 1.72 + (i % 3) * 0.06, isHero: false, name: P.name });
      h.speedK = 0.8; h.trSlot = 1 + i; h.ai = { mx: 0, mz: 0 };
      app.stage.scene.add(h.group); h.group.visible = false;
      h.teleport(spawn[i][0], spawn[i][1], 0);
      const npc = { P, h, state: 0, timer: Math.random() * 2, wp: 0, doing: P.doing, busy: false, item: items[P.id] || null, sweepN: 0 };
      this.npcs.push(npc);
    });
    // поза сидения: самый низкий таз в клипе Crouch
    this.sitT = this.findSit(this.npcs[3].h);
    this.bucket = items.water; this.bucket.visible = false; app.stage.scene.add(this.bucket);
    const li = this.el.querySelector('#t5list');
    this.liEls = this.npcs.map((n) => { const l = document.createElement('li'); l.style.cursor = 'pointer'; l.innerHTML = `<i></i><span><b>${n.P.name}</b>, ${n.P.role}.<br><span class="d" style="color:var(--muted)">${n.doing}</span></span>`; l.onclick = () => this.goTo(n); li.appendChild(l); return l; });
  }
  findSit(h) {
    const ch = h.ch; let best = 1.2, by = 1e9; const v = new THREE.Vector3();
    const act = ch.play('Crouch', 0.01);
    for (let t = 0.3; t < 2.8; t += 0.1) { ch.setTime(act, t); ch.oneShots.forEach((o) => { o.w = 1; o.action.setEffectiveWeight(1); }); ch.loco.Idle.action.setEffectiveWeight(0); ch.mixer.update(0); ch.model.updateMatrixWorld(true); ch.bones.Hips.getWorldPosition(v); if (v.y < by) { by = v.y; best = t; } }
    ch.stopAll(0.01); ch.oneShots.length = 0; ch.mixer.stopAllAction(); ch.mixer.uncacheClip && 0;
    // перезапустить локомоцию
    for (const n of ['Idle', 'Walk', 'Run']) { const L = ch.loco[n]; L.action.reset().play(); L.action.setEffectiveWeight(n === 'Idle' ? 1 : 0); L.w = n === 'Idle' ? 1 : 0; L.target = L.w; }
    return best;
  }
  goTo(n) { const app = this.app, h = app.hero; const a = n.h.yaw; h.teleport(n.h.pos.x + Math.sin(a) * 1.9, n.h.pos.z + Math.cos(a) * 1.9, a + Math.PI); app.cam.yaw = a + Math.PI; app.cam.inited = false; }
  enter() {
    const app = this.app, h = app.hero;
    this.group.visible = true; for (const n of this.npcs) n.h.group.visible = true;
    h.group.visible = true; h.equip(null); h.locked = false;
    if (!this.started) { this.started = true; h.teleport(-10.4, 8.6, 0.2); app.cam.yaw = 0.2; }
    app.cam.setFollow(7.2, 0.5); app.cam.height = 1.3;
    app.hint('Подойдите к жителю и нажмите <span class="kbd">E</span> · <span class="kbd">WASD</span> ходьба · <span class="kbd">Shift</span> бег');
    app.setTouch(true);
  }
  leave() {
    this.closeDlg(); this.group.visible = false;
    for (const n of this.npcs) { n.h.group.visible = false; if (n.h.item) n.h.item.visible = false; n.h.cancelAct(); n.busy = false; n.h.ai = { mx: 0, mz: 0 }; }
    this.bucket.visible = false;
    for (let i = 1; i < 9; i++) U.uTr.value[i].set(0, 0, 0, 0);
  }
  focus() { return this.app.hero.pos; }
  // ---- диалог
  nearest() {
    const p = this.app.hero.pos; let best = null, bd = 2.5;
    for (const n of this.npcs) { const d = Math.hypot(n.h.pos.x - p.x, n.h.pos.z - p.z); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  onInteract() { if (this.dlg.open) return; const n = this.nearest(); if (n) this.openDlg(n); }
  onEscape() { this.closeDlg(); }
  onDigit(k) { if (!this.dlg.open) return; const b = this.app.$('dialog').querySelectorAll('.opts button')[k - 1]; b && b.click(); }
  openDlg(n) {
    const app = this.app; this.dlg.open = n; app.dialogOpen = true; app.hero.locked = true; app.hero.vel.set(0, 0);
    n.h.cancelAct(); n.busy = false; n.pause = true;
    this.say(n, n.P.say);
    app.$('dialog').classList.add('on'); app.prompt(null);
  }
  say(n, text) {
    const d = this.app.$('dialog');
    d.innerHTML = `<div class="who"><span>${n.P.name}</span><small>${n.P.role}</small></div><div class="say"></div><div class="opts"></div>`;
    d.querySelector('.say').textContent = text;
    const opts = d.querySelector('.opts');
    const mk = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = `${opts.children.length + 1}. ${label}`; b.onclick = fn; opts.appendChild(b); return b; };
    mk('Поговорить', () => this.say(n, n.P.talk[Math.floor(Math.random() * n.P.talk.length)]));
    mk('Торговать (заглушка)', () => this.say(n, n.P.trade + ' (Окно торговли будет в Godot.)'));
    mk('Спросить новости', () => this.say(n, n.P.news));
    mk('Уйти', () => this.closeDlg());
    opts.firstChild.focus && opts.firstChild.focus({ preventScroll: true });
  }
  closeDlg() {
    const n = this.dlg.open; if (!n) return; this.dlg.open = null; n.pause = false;
    this.app.dialogOpen = false; this.app.hero.locked = false; this.app.$('dialog').classList.remove('on');
  }
  // ---- поведение
  face(h, x, z, dt, k = 6) { const t = Math.atan2(x - h.pos.x, z - h.pos.z); let d = t - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); h.yaw += d * (1 - Math.exp(-dt * k)); }
  walk(n, x, z, speed = 1) {
    const h = n.h, dx = x - h.pos.x, dz = z - h.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.22) { h.ai = { mx: 0, mz: 0 }; return true; }
    h.ai = { mx: (dx / d) * speed, mz: (dz / d) * speed }; return false;
  }
  act(n, clip, o, doneFn) { n.busy = true; n.h.playAct(clip, { ...o, onEnd: () => { n.busy = false; doneFn && doneFn(); } }); }
  chips(x, y, z, color = 0xcfb27c) { for (let k = 0; k < 8; k++) this.app.fx.soft.emit(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 2.4, 1.3 + Math.random() * 1.6, (Math.random() - 0.5) * 2.4, color, 0.05, 0.7, 9, 0.5, 1); }
  think(n, dt, t) {
    const h = n.h, id = n.P.id;
    if (n.pause) { this.face(h, this.app.hero.pos.x, this.app.hero.pos.z, dt, 5); h.ai = { mx: 0, mz: 0 }; return; }
    if (n.busy) return;
    n.timer -= dt;
    if (id === 'water') {
      const spots = [[-5.2, 12.8, 'well'], [-5.6, 7.4, 'hut'], [-5.2, 12.8, 'well'], [-9.0, 9.8, 'hut'], [-5.2, 12.8, 'well'], [-12.3, 5.0, 'hut']];
      const [x, z, kind] = spots[n.wp % spots.length];
      n.doing = kind === 'well' ? 'набирает воду у колодца' : 'несёт ведро к избе';
      this.bucketFull = true;
      if (this.walk(n, x, z, 1)) { if (kind === 'well') { n.doing = 'набирает воду у колодца'; this.face(h, -3.8, 14.2, dt); } else this.face(h, x, z - 2, dt); this.act(n, 'PickUp', { rate: 1.5, from: 0.25, to: 2.0, lock: true }, () => { n.wp++; }); }
    } else if (id === 'wood') {
      this.face(h, -14.4, 9.6, dt, 8);
      n.doing = 'колет дрова у поленницы';
      this.act(n, 'Attack3', { rate: 0.9, from: 0.2, to: 1.3, lock: true, events: [{ t: 0.7, fn: () => this.chips(-14.4, heightAt(-14.4, 9.6) + 0.55, 9.6) }] });
    } else if (id === 'sweep') {
      const pts = [[-11.2, 9.6], [-6.9, 9.6]]; const [x, z] = pts[n.wp % 2];
      if (n.sweepN > 0) { n.doing = 'метёт двор'; this.face(h, h.pos.x + (x > h.pos.x ? 1 : -1), z, dt); n.sweepN--; this.act(n, 'Attack4', { rate: 0.55, from: 0.25, to: 1.25, lock: true, events: [{ t: 0.75, fn: () => this.app.fx.dust(h.pos.x + Math.sin(h.yaw) * 0.9, heightAt(h.pos.x, h.pos.z), h.pos.z + Math.cos(h.yaw) * 0.9, Math.sin(h.yaw), Math.cos(h.yaw), 3, 0x7a6c4e) }] }); }
      else {
        n.doing = 'идёт мести дальше';
        const nx = h.pos.x + (x > h.pos.x ? 1 : -1) * 1.3; const reached = this.walk(n, Math.abs(x - h.pos.x) < 1.4 ? x : nx, z, 0.75);
        if (reached) { if (Math.abs(x - h.pos.x) < 1.5) n.wp++; n.sweepN = 2; }
        else if (Math.hypot(nx - h.pos.x, 0) < 0.3) n.sweepN = 2;
      }
    } else if (id === 'sit1' || id === 'sit2') {
      const face = id === 'sit1' ? [FIRE.x, FIRE.z] : [FIRE.x, FIRE.z]; this.face(h, face[0], face[1], dt, 6);
      n.doing = id === 'sit1' ? 'греет руки у костра' : 'сидит у костра, чинит лук';
      h.ai = { mx: 0, mz: 0 };
      n.busy = true; h.playAct('Crouch', { rate: 0, from: this.sitT, to: 99, hold: true, lock: true });
    } else if (id === 'talk1' || id === 'talk2') {
      const other = this.npcs.find((q) => q.P.id === (id === 'talk1' ? 'talk2' : 'talk1'));
      this.face(h, other.h.pos.x, other.h.pos.z, dt, 5); h.ai = { mx: 0, mz: 0 };
      n.doing = 'разговаривает с ' + other.P.name;
      const turn = id === 'talk1' ? 0 : 2.0;
      this.act(n, 'Talk', { rate: 0.85, from: 0.4 + turn, to: 3.6 + turn * 0.5, lock: true });
    } else if (id === 'patrol') {
      const pts = [[1.5, 2.2], [5.5, 2.2], [5.5, 9.5], [1.8, 9.5]]; const [x, z] = pts[n.wp % 4];
      n.doing = 'обходит деревню дозором';
      if (this.walk(n, x, z, 1)) { n.wp++; if (Math.random() < 0.5) this.act(n, 'Point', { rate: 1.2, from: 0.2, to: 1.9, lock: true }); }
    }
  }
  update(dt, t) {
    const app = this.app; driveHero(app, dt, t);
    for (const n of this.npcs) {
      this.think(n, dt, t);
      if (n.item && n.P.id !== 'water') { if (n.h.item !== n.item) n.h.equip(n.item); }
      n.h.update(dt, 0, t);
    }
    // ведро в руке водоноса
    const w = this.npcs[0]; this.bucket.visible = true;
    { const rig = w.h.rig; rig.right.grip(); const f = rig.right.fist(rig.fR); this.bucket.position.copy(f.center).add(new THREE.Vector3(0, -0.02, 0)); this.bucket.rotation.set(Math.sin(t * 3) * 0.08 * Math.min(1, w.h.speed), 0, Math.cos(t * 2.4) * 0.06 * Math.min(1, w.h.speed)); }
    // подсказка и список
    const near = this.dlg.open ? null : this.nearest();
    app.prompt(near ? `E: поговорить с ${near.P.name}, ${near.P.role}` : null);
    this.npcs.forEach((n, i) => { const d = this.liEls[i].querySelector('.d'); if (d.textContent !== n.doing) d.textContent = n.doing; this.liEls[i].classList.toggle('on', near === n); });
  }
}
