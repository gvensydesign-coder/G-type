// Преграды: круги (стволы, камни, бочки), повёрнутые прямоугольники (лавки, стены изб, поленницы).
// Герой и жители представлены кругом на земле (вид сверху капсулы), выталкиваются из преграды и скользят вдоль неё.
import { clamp } from './kit.js';

const CELL = 4;

// ось X локальной системы в мире: (cos a, -sin a), ось Z: (sin a, cos a) — как у поворота вокруг Y в three.js
export class Solids {
  constructor() { this.items = []; this.grid = new Map(); this.off = {}; this.version = 0; }
  _reg(it, x0, x1, z0, z1) {
    it.bb = [x0, x1, z0, z1];
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) {
      const k = i + ',' + j; let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(it);
    }
    this.items.push(it); this.version++;
    return it;
  }
  circle(x, z, r, tag = '', h = 1.5, grp = null) { return this._reg({ x, z, r, tag, h, grp }, x - r, x + r, z - r, z + r); }
  box(cx, cz, hw, hd, ang = 0, tag = '', h = 1.0, grp = null) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const ex = Math.abs(c) * hw + Math.abs(s) * hd, ez = Math.abs(s) * hw + Math.abs(c) * hd;
    return this._reg({ cx, cz, hw, hd, c, s, tag, h, grp, ang }, cx - ex, cx + ex, cz - ez, cz + ez);
  }
  // стена из локальных координат избы: центр (x,z), поворот rot*90°, прямоугольник вдоль локальных осей
  localBox(ox, oz, ang, lx, lz, hw, hd, tag, h) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return this.box(ox + lx * c + lz * s, oz - lx * s + lz * c, hw, hd, ang, tag, h);
  }
  setGroup(grp, on) { this.off[grp] = !on; }
  active(it) { return !it.off && !(it.grp && this.off[it.grp]); }

  // вытолкнуть круг (x,z,rad) из преград; extra — динамические преграды вкладки (круги {x,z,r} или коробки)
  resolve(x, z, rad, extra) {
    const near = [];
    const i0 = Math.floor((x - rad - 0.2) / CELL), i1 = Math.floor((x + rad + 0.2) / CELL), j0 = Math.floor((z - rad - 0.2) / CELL), j1 = Math.floor((z + rad + 0.2) / CELL);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const a = this.grid.get(i + ',' + j); if (a) for (const it of a) if (near.indexOf(it) < 0 && this.active(it)) near.push(it); }
    if (extra) for (const e of extra) near.push(e);
    for (let it = 0; it < 3; it++) {
      let moved = false;
      for (const o of near) {
        if (o.r != null) {
          const dx = x - o.x, dz = z - o.z, m = o.r + rad, d2 = dx * dx + dz * dz;
          if (d2 < m * m) { const d = Math.sqrt(d2); if (d > 1e-5) { x = o.x + (dx / d) * m; z = o.z + (dz / d) * m; } else { x = o.x + m; } moved = true; }
        } else if (o.hw != null) {
          const rx = x - o.cx, rz = z - o.cz;
          const lx = rx * o.c - rz * o.s, lz = rx * o.s + rz * o.c;
          const px = clamp(lx, -o.hw, o.hw), pz = clamp(lz, -o.hd, o.hd);
          const dx = lx - px, dz = lz - pz, d2 = dx * dx + dz * dz;
          let nx = lx, nz = lz, hit = false;
          if (d2 < rad * rad) {
            hit = true;
            if (d2 > 1e-10) { const d = Math.sqrt(d2); nx = px + (dx / d) * rad; nz = pz + (dz / d) * rad; }
            else { const a = o.hw - Math.abs(lx), b = o.hd - Math.abs(lz); if (a < b) nx = Math.sign(lx || 1) * (o.hw + rad); else nz = Math.sign(lz || 1) * (o.hd + rad); }
          }
          if (hit) { x = o.cx + nx * o.c + nz * o.s; z = o.cz - nx * o.s + nz * o.c; moved = true; }
        } else if (o.x0 != null) {
          const px = clamp(x, o.x0, o.x1), pz = clamp(z, o.z0, o.z1), dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
          if (d < rad) { if (d > 1e-5) { x = px + (dx / d) * rad; z = pz + (dz / d) * rad; } else { const l = x - o.x0, r2 = o.x1 - x, t = z - o.z0, b = o.z1 - z, mm = Math.min(l, r2, t, b); if (mm === l) x = o.x0 - rad; else if (mm === r2) x = o.x1 + rad; else if (mm === t) z = o.z0 - rad; else z = o.z1 + rad; } moved = true; }
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }
  // свободно ли место круга
  free(x, z, rad, extra) { const [nx, nz] = this.resolve(x, z, rad, extra); return Math.abs(nx - x) < 1e-4 && Math.abs(nz - z) < 1e-4; }
  // для отладочной отрисовки: преграды рядом с точкой
  around(x, z, R, extra) {
    const out = [];
    for (const it of this.items) { if (!this.active(it)) continue; const b = it.bb; if (b[1] < x - R || b[0] > x + R || b[3] < z - R || b[2] > z + R) continue; out.push(it); }
    if (extra) for (const e of extra) out.push(e);
    return out;
  }
}

// динамическая преграда-коробка для вкладок (то же устройство, что у Solids.box)
export function obb(cx, cz, hw, hd, ang = 0) { return { cx, cz, hw, hd, c: Math.cos(ang), s: Math.sin(ang), ang }; }
