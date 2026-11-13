// Вкладка 1. Схема растительности: вид сверху с зонами и точками видов, подсказки, переход в 3D.
import * as THREE from 'three';
import { PLANTS, PLANT_IDS, GROUPS, DEFAULT_ON, zoneGrid, hGrid, N, CELL } from './plants.js';
import { ZONES, ZONE_COL2D, ZONE_NAME, HALF, pad, village, ruin, FIRE, pond, ROAD } from './terrain.js';
import { clamp } from './kit.js';

const SHAPES = {
  dot: (c, r) => { c.arc(0, 0, r, 0, 6.283); },
  ring: (c, r) => { c.arc(0, 0, r, 0, 6.283); c.moveTo(r * 0.45, 0); c.arc(0, 0, r * 0.45, 0, 6.283, true); },
  tri: (c, r) => { c.moveTo(0, -r * 1.15); c.lineTo(r * 1.05, r * 0.8); c.lineTo(-r * 1.05, r * 0.8); c.closePath(); },
  sq: (c, r) => { c.rect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); },
  dia: (c, r) => { c.moveTo(0, -r * 1.25); c.lineTo(r * 1.0, 0); c.lineTo(0, r * 1.25); c.lineTo(-r * 1.0, 0); c.closePath(); },
  plus: (c, r) => { const t = r * 0.36; c.rect(-t, -r, t * 2, r * 2); c.rect(-r, -t, r * 2, t * 2); },
  x: (c, r) => { const t = r * 0.34, d = r * 0.9; c.moveTo(-d, -d + t); c.lineTo(-d + t, -d); c.lineTo(0, -t); c.lineTo(d - t, -d); c.lineTo(d, -d + t); c.lineTo(t, 0); c.lineTo(d, d - t); c.lineTo(d - t, d); c.lineTo(0, t); c.lineTo(-d + t, d); c.lineTo(-d, d - t); c.lineTo(-t, 0); c.closePath(); },
  star: (c, r) => { for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283, rr = i % 2 ? r * 0.5 : r * 1.25; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); },
};
function glyph(ctx, shape, x, y, r, color, alpha = 1, outline = true) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); SHAPES[shape](ctx, r);
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  if (outline) { ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(4,10,12,0.85)'; ctx.stroke(); }
  ctx.fill('evenodd'); ctx.restore();
}
function svgGlyph(shape, color) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const c = cv.getContext('2d'); glyph(c, shape, 8, 8, 5.4, color, 1, true);
  return `<img alt="" width="16" height="16" src="${cv.toDataURL()}">`;
}
const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class Tab1 {
  constructor(app, el) {
    this.app = app; this.el = el; this.mode = 'schema';
    this.on = new Set(['reeds', 'lily', 'fireweed', 'mushroom', 'bush', 'boulder', 'fern']);
    this.zonesOn = new Set(ZONES); this.sel = 'fireweed'; this.hover = null;
    this.cv = app.$('schema'); this.ctx = this.cv.getContext('2d');
    this.areas = {};
    for (const id of PLANT_IDS) { let a = 0; for (let k = 0; k < zoneGrid.length; k++) if (PLANTS[id].zones.includes(zoneGrid[k])) a += CELL * CELL; this.areas[id] = a; }
    this.build();
    this.cv.addEventListener('pointermove', (e) => this.onMove(e));
    this.cv.addEventListener('pointerleave', () => { this.hover = null; app.$('tip').style.display = 'none'; this.draw(); });
    this.cv.addEventListener('click', (e) => this.onTap(e));
  }
  build() {
    const el = this.el;
    el.innerHTML = `
      <h2>Схема растительности</h2>
      <p>Вид сверху на тестовый участок 60 × 60 м. Цветные заливки показывают зоны, значки показывают, где и как густо вырастет каждый вид. Нажмите на вид, чтобы включить его и прочитать описание.</p>
      <div class="row"><button class="btn primary" id="t1to3d" type="button">Показать в 3D</button><button class="btn" id="t1all" type="button">Все виды</button><button class="btn" id="t1none" type="button">Скрыть все</button></div>
      <h3>Зоны</h3><div class="row" id="t1zones"></div>
      <div id="t1groups"></div>
      <div class="card" id="t1info"></div>`;
    const zrow = el.querySelector('#t1zones');
    for (const z of ZONES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip zoneChip'; b.setAttribute('aria-pressed', 'true');
      b.innerHTML = `<i style="background:${ZONE_COL2D[z]}"></i>${ZONE_NAME[z]}`;
      b.addEventListener('click', () => { if (this.zonesOn.has(z)) this.zonesOn.delete(z); else this.zonesOn.add(z); b.setAttribute('aria-pressed', String(this.zonesOn.has(z))); this.draw(); });
      zrow.appendChild(b);
    }
    const gs = el.querySelector('#t1groups'); this.chips = {};
    for (const [title, ids] of GROUPS) {
      const h = document.createElement('h3'); h.textContent = title; gs.appendChild(h);
      const row = document.createElement('div'); row.className = 'row'; gs.appendChild(row);
      for (const id of ids) {
        const P = PLANTS[id]; const b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
        b.innerHTML = `${svgGlyph(P.shape, P.color)}${P.name}<small>${this.app.pts[id].length}</small>`;
        b.addEventListener('click', () => this.toggle(id));
        row.appendChild(b); this.chips[id] = b;
      }
    }
    el.querySelector('#t1to3d').addEventListener('click', () => this.set3D(true));
    el.querySelector('#t1all').addEventListener('click', () => { PLANT_IDS.forEach((i) => this.on.add(i)); this.refreshChips(); this.draw(); this.apply3D(); });
    el.querySelector('#t1none').addEventListener('click', () => { this.on.clear(); this.refreshChips(); this.draw(); this.apply3D(); });
    this.refreshChips(); this.info();
  }
  toggle(id) {
    if (this.on.has(id)) this.on.delete(id); else this.on.add(id);
    this.sel = id; this.refreshChips(); this.info(); this.draw(); this.apply3D();
  }
  refreshChips() { for (const id in this.chips) { this.chips[id].setAttribute('aria-pressed', String(this.on.has(id))); this.chips[id].classList.toggle('sel', this.sel === id); } }
  info() {
    const id = this.sel, box = this.el.querySelector('#t1info');
    if (!id) { box.innerHTML = '<span style="color:var(--muted)">Выберите вид, чтобы увидеть описание.</span>'; return; }
    const P = PLANTS[id], n = this.app.pts[id].length;
    const per100 = P.hang ? null : (n / Math.max(1, this.areas[id])) * 100;
    const zones = P.zones.length ? P.zones.map((z) => ZONE_NAME[z]).join(', ') : 'на деревьях и стенах построек';
    box.innerHTML = `<b>${P.name}</b><div>${P.desc}</div>
      <div class="kv"><span>Зоны</span><span>${zones}</span><span>Где больше</span><span>${P.prefer}</span><span>Плотность</span><span>${P.dens} (параметр dens), на участке ≈ ${per100 == null ? 'по объектам' : per100.toFixed(1) + ' на 100 м² допустимых зон'}</span><span>Размер</span><span>${P.s[0]}–${P.s[1]} м</span><span>Точек здесь</span><span>${n}</span></div>`;
  }
  apply3D() { if (this.mode === '3d') this.app.setPlants([...this.on]); }
  set3D(on) {
    const app = this.app; this.mode = on ? '3d' : 'schema';
    this.cv.hidden = on; this.hideGL = !on;
    const b = app.$('tabs3d'); b.classList.toggle('on', on);
    if (on) {
      app.hero.group.visible = false; app.setPlants([...this.on]);
      app.cam.setOrbit(new THREE.Vector3(0, 1, 2), 0.55, 0.95, 34); app.cam.auto = true; this.fogSave = [app.stage.scene.fog.near, app.stage.scene.fog.far]; app.stage.scene.fog.near = 40; app.stage.scene.fog.far = 200;
      b.innerHTML = '<button class="btn primary" id="back2d" type="button">Назад к схеме</button><button class="btn" id="spin" type="button" aria-pressed="true">Вращение</button>';
      b.querySelector('#back2d').onclick = () => this.set3D(false);
      b.querySelector('#spin').onclick = (e) => { app.cam.auto = !app.cam.auto; e.currentTarget.setAttribute('aria-pressed', String(app.cam.auto)); };
      app.hint('Тяните, чтобы вращать. Колесо или щипок меняет масштаб. Включайте виды справа, они появятся на местности.');
      app.stage.pr = Math.min(window.devicePixelRatio || 1, 1.25);
    } else {
      this.restoreFog(); app.hint('Нажмите на значок на схеме, чтобы узнать вид и его зоны.'); this.draw();
    }
    app.$('view').dispatchEvent(new Event('resize'));
    const r = app.view.getBoundingClientRect(); app.stage.resize(r.width, r.height); this.resize(r.width, r.height);
  }
  restoreFog() { const f = this.app.stage.scene.fog; if (this.fogSave) { f.near = this.fogSave[0]; f.far = this.fogSave[1]; this.fogSave = null; } }
  enter() {
    const app = this.app; this.restoreFog();
    app.hero.group.visible = false; app.hero.item && (app.hero.item.visible = false);
    this.mode = 'schema'; this.cv.hidden = false; this.hideGL = true; this.app.cam.auto = false;
    app.$('tabs3d').classList.remove('on'); app.setTouch(false);
    app.hint('Нажмите на значок на схеме, чтобы узнать вид и его зоны.');
    this.refreshChips(); this.info(); this.resize(); this.draw();
  }
  leave() {
    const app = this.app; this.restoreFog(); this.hideGL = false; this.cv.hidden = true; app.$('tabs3d').classList.remove('on'); app.$('tip').style.display = 'none';
    app.hero.group.visible = true; app.setPlants(DEFAULT_ON); app.cam.auto = false;
    app.stage.pr = Math.min(window.devicePixelRatio || 1, 1.5);
  }
  focus() { return this.app.cam.center; }
  resize() {
    const r = this.app.view.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr); this.dpr = dpr; this.W = r.width; this.H = r.height;
    this.base = null; this.draw();
  }
  update(dt) {
    if (this.mode === '3d') { this.app.cam.update(dt, this.app.cam.center); }
  }
  layout() {
    const m = this.W < 560 ? 26 : 40; const k = Math.min((this.W - m * 2) / 60, (this.H - m * 2) / 60);
    this.k = k; this.ox = (this.W - 60 * k) / 2; this.oz = (this.H - 60 * k) / 2;
  }
  X(x) { return this.ox + (x + HALF) * this.k; }
  Z(z) { return this.oz + (z + HALF) * this.k; }
  baseImage() {
    const sel = this.sel && PLANTS[this.sel];
    const key = [...this.zonesOn].join() + '|' + (sel ? sel.zones.join() : '');
    if (this.base && this.baseKey === key) return this.base;
    const cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'); const im = c.createImageData(N, N);
    const cols = {}; for (const z of ZONES) cols[z] = hexRGB(ZONE_COL2D[z]);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, z = zoneGrid[k];
      let [r, g, b] = cols[z];
      const hx = (hGrid[j * N + Math.min(N - 1, i + 1)] - hGrid[j * N + Math.max(0, i - 1)]), hz = (hGrid[Math.min(N - 1, j + 1) * N + i] - hGrid[Math.max(0, j - 1) * N + i]);
      let sh = 1 + clamp((-hx * 0.7 - hz * 0.7) * 0.35, -0.28, 0.28);
      const hh = hGrid[k]; if (hh > -0.2 && Math.abs(hh - Math.round(hh * 1) / 1) < 0.045) sh *= 0.9; // горизонтали через 1 м
      let a = 1;
      if (!this.zonesOn.has(z)) { r = 24; g = 36; b = 40; sh = 1; }
      else if (sel && !sel.zones.includes(z)) { sh *= 0.42; }
      im.data[k * 4] = clamp(r * sh, 0, 255); im.data[k * 4 + 1] = clamp(g * sh, 0, 255); im.data[k * 4 + 2] = clamp(b * sh, 0, 255); im.data[k * 4 + 3] = 255;
    }
    c.putImageData(im, 0, 0); this.base = cv; this.baseKey = key; return cv;
  }
  draw() {
    if (this.mode !== 'schema' || this.cv.hidden) return;
    const c = this.ctx, dpr = this.dpr || 1; if (!this.W) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#080f11'; c.fillRect(0, 0, this.W, this.H);
    this.layout();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(this.baseImage(), this.ox, this.oz, 60 * this.k, 60 * this.k);
    // сетка 10 м
    c.strokeStyle = 'rgba(210,235,228,0.16)'; c.lineWidth = 1; c.fillStyle = 'rgba(210,235,228,0.55)'; c.font = '11px "Golos Text", system-ui, sans-serif';
    for (let v = -30; v <= 30; v += 10) {
      c.beginPath(); c.moveTo(this.X(v), this.Z(-30)); c.lineTo(this.X(v), this.Z(30)); c.moveTo(this.X(-30), this.Z(v)); c.lineTo(this.X(30), this.Z(v)); c.stroke();
    }
    c.strokeStyle = 'rgba(210,235,228,0.5)'; c.strokeRect(this.X(-30), this.Z(-30), 60 * this.k, 60 * this.k);
    // ориентиры
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,0.45)'; c.setLineDash([5, 4]); c.strokeRect(this.X(pad.x0), this.Z(pad.z0), (pad.x1 - pad.x0) * this.k, (pad.z1 - pad.z0) * this.k); c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('площадка стройки', this.X(pad.x0) + 5, this.Z(pad.z0) + 14);
    const mark = (x, z, label, color = '#fff') => { c.beginPath(); c.arc(this.X(x), this.Z(z), 4, 0, 6.283); c.fillStyle = '#0a1012'; c.fill(); c.lineWidth = 2; c.strokeStyle = color; c.stroke(); c.fillStyle = color; c.fillText(label, this.X(x) + 8, this.Z(z) + 4); };
    for (const h of this.app.world.huts) { c.save(); c.translate(this.X(h.x), this.Z(h.z)); c.fillStyle = h.ruin ? '#4a3a2a' : '#7a5a34'; c.strokeStyle = '#1a1208'; c.lineWidth = 1.5; c.fillRect(-2 * this.k, -2 * this.k, 4 * this.k, 4 * this.k); c.strokeRect(-2 * this.k, -2 * this.k, 4 * this.k, 4 * this.k); c.restore(); }
    mark(FIRE.x, FIRE.z, 'костёр', '#ffb050');
    c.fillStyle = 'rgba(8,16,18,0.7)'; c.font = '11px "Golos Text", system-ui, sans-serif';
    const lab = (x, z, t) => { c.fillStyle = 'rgba(235,245,240,0.8)'; c.fillText(t, this.X(x), this.Z(z)); };
    lab(-26, -21, 'холм'); lab(10, -14, 'ручей'); lab(ruin.x - 4, ruin.z - 3.2, 'заброшенная изба'); lab(-9 - 5, 16.8, 'деревня'); lab(5.7, 13.2, 'пруд'); lab(-31 + 1, 30 - 1.5, 'дорога');
    // масштаб и север
    const sx = this.X(-30), sy = this.Z(-30) - 9;
    c.fillStyle = 'rgba(235,245,240,0.9)'; c.fillRect(sx, sy - 4, 10 * this.k, 3); c.fillText('10 м', sx + 10 * this.k + 6, sy);
    c.fillText('С ↑', this.X(30) - 26, this.Z(-30) + 15);
    // точки
    const sel = this.sel;
    for (const id of PLANT_IDS) {
      if (!this.on.has(id) || id === sel) continue;
      const P = PLANTS[id], dim = sel ? 0.55 : 0.95;
      for (const p of this.app.pts[id]) glyph(c, P.shape, this.X(p.x), this.Z(p.z), this.rad(P, p), P.color, dim, true);
    }
    if (sel && this.on.has(sel)) {
      const P = PLANTS[sel];
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const p of this.app.pts[sel]) { const g = c.createRadialGradient(this.X(p.x), this.Z(p.z), 0, this.X(p.x), this.Z(p.z), this.k * 2.4); g.addColorStop(0, P.color + '38'); g.addColorStop(1, P.color + '00'); c.fillStyle = g; c.fillRect(this.X(p.x) - this.k * 2.4, this.Z(p.z) - this.k * 2.4, this.k * 4.8, this.k * 4.8); }
      c.restore();
      for (const p of this.app.pts[sel]) glyph(c, P.shape, this.X(p.x), this.Z(p.z), this.rad(P, p) * 1.25, P.color, 1, true);
    }
    if (this.hover) { const p = this.hover; c.beginPath(); c.arc(this.X(p.x), this.Z(p.z), 11, 0, 6.283); c.lineWidth = 2; c.strokeStyle = '#e0a64a'; c.stroke(); }
  }
  rad(P, p) { return (2.3 + 2.3 * clamp(p.s / P.s[1], 0, 1)) * clamp(this.k / 10, 0.7, 1.25); }
  nearest(mx, my) {
    let best = null, bd = 12;
    for (const id of this.on) for (const p of this.app.pts[id]) { const d = Math.hypot(this.X(p.x) - mx, this.Z(p.z) - my); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  onMove(e) {
    const r = this.cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const p = this.nearest(mx, my); const tip = this.app.$('tip');
    if (p !== this.hover) { this.hover = p; this.draw(); }
    if (p) { const P = PLANTS[p.id]; tip.style.display = 'block'; tip.textContent = `${P.name}, ${(p.s).toFixed(1)} м`; tip.style.left = Math.min(r.width - 150, mx + 14) + 'px'; tip.style.top = Math.max(4, my - 30) + 'px'; this.cv.style.cursor = 'pointer'; }
    else { tip.style.display = 'none'; this.cv.style.cursor = 'crosshair'; }
  }
  onTap(e) {
    const r = this.cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const p = this.nearest(mx, my);
    if (p) { this.sel = p.id; this.refreshChips(); this.info(); this.draw(); this.app.toast(`${PLANTS[p.id].name}: ${PLANTS[p.id].desc}`, 3500); }
  }
}
