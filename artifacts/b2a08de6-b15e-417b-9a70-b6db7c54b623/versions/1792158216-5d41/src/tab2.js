// Вкладка 2. Богатырь на тестовой сцене: ходьба, камера-автослед, реакции на окружение.
import * as THREE from 'three';
import { heightAt, softAt, roadDist, WATER_Y, pond, riverCx, FIRE, lightAt } from './terrain.js';
import { clamp } from './kit.js';

// общий кадр героя: камера мягко разворачивается за направлением движения (без мыши)
export function driveHero(app, dt, t) {
  const h = app.hero, cam = app.cam;
  const dragging = app.drag && app.drag.moved > 6;
  if (!app.dialogOpen && h.speed > 0.4 && !dragging) {
    const dot = Math.sin(h.yaw) * Math.sin(cam.yaw) + Math.cos(h.yaw) * Math.cos(cam.yaw);
    if (dot > -0.35) { let d = h.yaw - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * (1 - Math.exp(-dt * 0.95)); }
  }
  if (cam.yawTo != null) { let d = cam.yawTo - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * (1 - Math.exp(-dt * 3)); if (Math.abs(d) < 0.04 || dragging) cam.yawTo = null; }
  h.update(dt, cam.yaw, t);
  cam.update(dt, h.pos, heightAt);
}

export class Tab2 {
  constructor(app, el) {
    this.app = app; this.el = el; this.live = {}; this.last = {};
    el.innerHTML = `
      <h2>Богатырь на тестовой сцене</h2>
      <p>Ходите по сцене и смотрите, как мир отвечает герою. Стиль «Аркейн, мрачный»: плоские тона в четыре ступени, холодные тени, контровой свет, дымка.</p>
      <h3>Управление</h3>
      <div class="kv"><span><span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span></span><span>ходьба, камера идёт следом</span><span><span class="kbd">Shift</span></span><span>бег</span><span><span class="kbd">Пробел</span></span><span>прыжок</span><span>Мышь</span><span>можно перетащить, чтобы повернуть камеру</span></div>
      <h3>Реакции на окружение</h3>
      <ul class="live" id="t2live"></ul>
      <h3>Перейти к месту</h3>
      <div class="row" id="t2go"></div>
      <div class="card"><div class="kv"><span>Освещённость</span><span id="t2light">—</span><span>Под ногами</span><span id="t2ground">—</span></div></div>`;
    const live = el.querySelector('#t2live');
    for (const [id, txt] of [['grass', 'Трава приминается и качается от ног'], ['water', 'Брызги и круги в луже и ручье'], ['prints', 'Следы на мягкой земле у воды'], ['tint', 'Тонировка при входе в тень и на свет'], ['dust', 'Пыль на дороге']]) {
      const li = document.createElement('li'); li.innerHTML = `<i></i><span>${txt}</span>`; live.appendChild(li); this.live[id] = li;
    }
    const go = el.querySelector('#t2go');
    const spots = [['Луг', -1, 3, 0], ['Лужа', pond.x - 4.8, pond.z - 0.5, 1.57], ['Ручей и брод', 5.5, -1, 1.57], ['Дорога', -6, 5.2, -1.0], ['Тень леса', -2, -19, 0], ['У костра', -9, 3, 3.14]];
    for (const [n, x, z, yaw] of spots) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = n; b.onclick = () => this.tp(x, z, yaw); go.appendChild(b); }
    this.lightEl = el.querySelector('#t2light'); this.groundEl = el.querySelector('#t2ground');
  }
  tp(x, z, yaw) { const app = this.app; app.hero.teleport(x, z, yaw); app.cam.yaw = yaw; app.cam.inited = false; }
  enter() {
    const app = this.app, h = app.hero;
    h.group.visible = true; h.equip(null); h.locked = false;
    if (!this.started) { this.started = true; this.tp(-1, 3, 0.3); }
    app.cam.setFollow(5.4, 0.34); app.cam.height = 1.4;
    app.hint('<span class="kbd">WASD</span> ходьба · <span class="kbd">Shift</span> бег · <span class="kbd">Пробел</span> прыжок');
    app.setTouch(true);
  }
  leave() { }
  focus() { return this.app.hero.pos; }
  update(dt, t) {
    const app = this.app, h = app.hero;
    driveHero(app, dt, t);
    const x = h.pos.x, z = h.pos.z, now = t;
    const mark = (k, on) => { if (on) this.last[k] = now; this.live[k].classList.toggle('on', now - (this.last[k] ?? -9) < 0.8); };
    const zone = this.zoneName(x, z);
    mark('grass', h.speed > 0.3 && (zone === 'Трава' || zone === 'Склон'));
    mark('water', h.inWater && h.speed > 0.2 || (h.inWater && now - (this.last.water ?? -9) < 1.6));
    mark('prints', h.speed > 0.3 && softAt(x, z) > 0.5 && !h.inWater);
    const L = lightAt(x, z, app.world.treeCircles);
    mark('tint', L.shade > 0.35 || L.fire > 0.4);
    mark('dust', h.onRoad && h.speed > 0.3);
    this.lightEl.textContent = L.fire > 0.35 ? 'у костра, тёплый свет' : L.shade > 0.4 ? 'в тени, холодная тонировка' : 'на свету';
    this.groundEl.textContent = zone;
    app.prompt(null);
  }
  zoneName(x, z) {
    if (heightAt(x, z) < WATER_Y) return 'Вода';
    if (roadDist(x, z) < 1.4) return 'Дорога';
    if (softAt(x, z) > 0.5) return 'Мягкая земля';
    return 'Трава';
  }
}
