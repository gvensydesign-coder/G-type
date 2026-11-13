// Вода логова: каждый кадр собирает, что отражается и что волнует воду, и пишет в общие униформы U
// (их читает шейдер water() из toon.js). Отражения: персонажи — тёмные силуэты-полосы, ауры — их цветом,
// огни берутся из uL (их пишет updLights), небо, стена леса и луна — из констант ниже.
// Рябь: кольца от шагов в воде и у кромки (и на мостках над водой — слабее), от ударов, прыжка Лешего, зажигания ауры.
import * as THREE from 'three';
import { U, lin } from './toon.js';
import { groundAt, WATER_Y, BASIN } from './lair.js';

const DARK = new THREE.Color(0.004, 0.012, 0.011);   // силуэт в отражении: почти чёрный, чуть зеленее воды

export class WaterFX {
  // fight — LairFight (hero, leshy, auras, wave); opts: { moon: [x, y, z], sky: { top, low }, tree, treeH }
  constructor(fight, opts = {}) {
    this.f = fight; this.ri = 0;
    this.track = new Map();   // персонаж → { last: Vector3, acc, idle, hp, auraState }
    const moon = new THREE.Vector3(...(opts.moon ?? [-0.4, 0.42, -0.82])).normalize();
    U.uWMoon.value.set(moon.x, moon.y, moon.z, opts.moonR ?? 0.06);
    if (opts.sky?.top) U.uWSkyTop.value.copy(lin(opts.sky.top));
    if (opts.sky?.low) U.uWSkyLow.value.copy(lin(opts.sky.low));
    if (opts.tree) U.uWTree.value.copy(lin(opts.tree));
    U.uWBasin.value.set(BASIN.x, BASIN.z, BASIN.rx * 1.15, BASIN.rz * 1.15); U.uWTreeH.value = opts.treeH ?? 14;
    this._c = new THREE.Color();
  }
  // кольцо ряби: x, z, сила (1 — шаг в воде)
  ripple(x, z, k = 1) { U.uRip.value[this.ri++ % 8].set(x, z, Math.floor(U.uTime.value * 12) / 12, k); }
  // где вода рядом: сама точка (в воде или над водой) либо ближайшая точка кромки в радиусе r
  wetAt(x, z, y, r = 0.9) {
    const g = groundAt(x, z);
    if (g < WATER_Y - 0.02) return { x, z, k: y - WATER_Y > 0.3 ? 0.45 : 1 };            // по воде вброд или по мосткам
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (groundAt(px, pz) < WATER_Y - 0.02) return { x: px, z: pz, k: 0.55 }; }
    return null;
  }
  update(dt) {
    const F = this.f; const R = U.uWRf.value, H = U.uWRh.value, C = U.uWRc.value; let n = 0;
    const who = [[F.hero, 'bogatyr', 1.53, 0.26, 0.8], [F.leshy, 'leshy', 2.5, 0.5, 1.25]];
    who.forEach(([c, key, h, w, stride], idx) => {
      const a = F.auras?.[key];
      let tr = this.track.get(c);
      if (!tr) { tr = { last: c.pos.clone(), acc: 0, idle: 0, hp: c.hp, st: a?.state }; this.track.set(c, tr); }
      const vis = c.w?.visible !== false && c.state !== 'gone';
      // отражения: если горит аура — столб её цвета пошире, поверх — тёмный силуэт
      if (vis && a && a.amt > 0.02 && n < 6) {
        this._c.set(a.p.light); const k = Math.min(1, a.amt) * 0.95;
        R[n].set(c.pos.x, c.pos.z, w * 2.1, c.pos.y); H[n].set(c.pos.y + h * 1.2, 0.09, 0, 0); C[n].set(this._c.r, this._c.g, this._c.b, k); n++;
      }
      // силуэт после ауры: тёмная сердцевина внутри светлого столба
      if (vis && n < 6) { R[n].set(c.pos.x, c.pos.z, w, c.pos.y); H[n].set(c.pos.y + h, 0.035, 1, 0); C[n].set(DARK.r, DARK.g, DARK.b, 0.85); n++; }
      // волны от ауры
      const au = U.uWAu.value[idx];
      if (a && a.amt > 0.02) { au.set(c.pos.x, c.pos.z, Math.min(1, a.amt), h / 1.8); this._c.set(a.p.light); U.uWAuC.value[idx].set(this._c.r, this._c.g, this._c.b); }
      else au.z = 0;
      if (!vis) return;
      // кольца ряби: шаги, удары по персонажу, зажигание ауры, стояние в воде
      const moved = Math.hypot(c.pos.x - tr.last.x, c.pos.z - tr.last.z); tr.last.copy(c.pos);
      if (moved < 1) tr.acc += moved;                      // телепорт (сброс сцены) не считаем шагом
      const wet = this.wetAt(c.pos.x, c.pos.z, c.pos.y);
      if (wet) {
        if (tr.acc > stride) { tr.acc = 0; this.ripple(wet.x + (Math.random() - 0.5) * 0.2, wet.z + (Math.random() - 0.5) * 0.2, wet.k); }
        if ((c.hp ?? 0) < tr.hp - 0.5) this.ripple(wet.x, wet.z, Math.min(1.5, wet.k * 1.6));
        if (a && a.state === 'charge' && tr.st !== 'charge') this.ripple(wet.x, wet.z, 1.5);
        tr.idle += dt; if (moved < 0.01 && tr.idle > 1.7 && wet.k >= 1) { tr.idle = 0; this.ripple(c.pos.x, c.pos.z, 0.5); }
      } else tr.acc = 0;
      tr.hp = c.hp ?? 0; tr.st = a?.state;
    });
    U.uWRN.value = n;
    // прыжок Лешего: удар о землю — два сильных кольца
    const wv = F.wave;
    if (wv) { if (wv.visible && !this._wave) { const p = wv.position, wt = this.wetAt(p.x, p.z, p.y, 1.6); if (wt) { this.ripple(wt.x, wt.z, 1.6); this.ripple(wt.x + 0.4, wt.z - 0.3, 1.2); } } this._wave = wv.visible; }
  }
}
