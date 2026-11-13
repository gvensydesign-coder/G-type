// Тестовый участок 60x60 м: холм, ручей с бродом, лужа-пруд, дорога, берег, лес по краям. Высоты, зоны, свет.
import { clamp, lerp, smooth, fbm, hash2 } from './kit.js';

export const HALF = 30;            // участок -30..30 по x и z (z+ = юг, к камере)
export const WATER_Y = -0.2;
export const pond = { x: 4.4, z: 12.5, r: 3.5 };
export const village = { x: -9, z: 6 };
export const pad = { x0: 14, x1: 28, z0: -13, z1: 11 };   // площадка стройки (вкладка 3)
export const hill = { x: -17, z: -15 };
export const ruin = { x: -23, z: 19 };

export const riverCx = (z) => 9 + 3.4 * Math.sin(z * 0.13 + 0.5);
export const riverW = (z) => 1.7 + 0.45 * Math.sin(z * 0.3);
export const ROAD = [[-36, 24], [-23, 18], [-13, 11.5], [-4, 4.5], [3, 0.8], [9.5, -1], [17, -1.5], [26, -5], [36, -8]];

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az; const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
export function roadDist(x, z) {
  let d = 1e9;
  for (let i = 0; i < ROAD.length - 1; i++) d = Math.min(d, segDist(x, z, ROAD[i][0], ROAD[i][1], ROAD[i + 1][0], ROAD[i + 1][1]));
  return d;
}
const flat = (h, x, z, cx, cz, r, y, soft = 4) => lerp(h, y, smooth(r + soft, r, Math.hypot(x - cx, z - cz)));
const flatBox = (h, x, z, x0, x1, z0, z1, y, soft = 3.5) => {
  const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
  return lerp(h, y, smooth(soft, 0, Math.hypot(dx, dz)));
};

export function heightAt(x, z) {
  let h = 0.22 * Math.sin(x * 0.11 + 1) * Math.cos(z * 0.09) + 0.16 * Math.sin(x * 0.27 + z * 0.2) + 0.3;
  h += 5.2 * Math.exp(-(((x - hill.x) ** 2) + ((z - hill.z) ** 2)) / (2 * 6.8 * 6.8));
  const r = Math.max(Math.abs(x), Math.abs(z));
  h += 7 * smooth(30, 54, r) * (0.65 + 0.35 * Math.sin(x * 0.2 + z * 0.17));
  h = flat(h, x, z, village.x, village.z + 1, 9, 0.35, 5);
  h = flatBox(h, x, z, pad.x0, pad.x1, pad.z0, pad.z1, 0.38);
  h = flat(h, x, z, -3, -6, 7, 0.4, 4);   // роща для рубки
  // ручей
  const cx = riverCx(z), w = riverW(z), d = Math.abs(x - cx);
  const bed = -0.78 + 0.5 * Math.exp(-((z + 1) ** 2) / 7);   // брод у дороги
  h = lerp(h, bed, smooth(w + 2.3, w - 0.3, d));
  // лужа
  const dp = Math.hypot(x - pond.x, z - pond.z);
  h = lerp(h, -0.62, smooth(pond.r + 1.8, pond.r - 0.6, dp));
  return h;
}

// граница леса: >0 — поляна, <0 — внутри леса
export function forestEdge(x, z) {
  const rim = 23.5 + 1.8 * Math.sin(x * 0.3 + z * 0.21) + 1.2 * Math.sin(z * 0.43 - x * 0.1) - Math.max(Math.abs(x), Math.abs(z));
  const ne = Math.hypot(x - 22, z + 21) - 6.5;
  const nw = Math.hypot(x + 24, z + 4) - 5.5;
  return Math.min(rim, ne, nw);
}

export function slopeAt(x, z) {
  const e = 0.5;
  return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
}

export const ZONES = ['ground', 'slope', 'shore', 'shallow', 'water', 'border', 'road'];
export function zoneAt(x, z) {
  const h = heightAt(x, z);
  if (h < -0.48) return 'water';
  if (roadDist(x, z) < 1.35 && Math.abs(x) < 34 && Math.abs(z) < 34) return 'road';
  if (h < WATER_Y) return 'shallow';
  if (h < 0.1) return 'shore';
  if (slopeAt(x, z) > 0.33) return 'slope';
  if (forestEdge(x, z) < 3.2) return 'border';
  return 'ground';
}

// мягкая земля (следы): берег, ил у воды, пятна грязи
export function softAt(x, z) {
  const h = heightAt(x, z);
  if (h < WATER_Y - 0.05) return 1;
  if (h < 0.22 && roadDist(x, z) > 1.0) return 1;
  const n = fbm(x * 0.35 + 7, z * 0.35 - 3);
  if (n > 0.64 && roadDist(x, z) > 1.4 && slopeAt(x, z) < 0.3) return 0.8;
  return 0;
}

// тень/свет в точке: shade 0..1 (лес, кроны), fire 0..1 (свет костра)
export const FIRE = { x: -9, z: 6 };
export function lightAt(x, z, trees) {
  let shade = smooth(1.5, -3.5, forestEdge(x, z)) * 0.8;
  if (trees) for (const t of trees) { const d = Math.hypot(x - t.x, z - t.z); if (d < t.r * 2.2) shade = Math.max(shade, 0.85 * (1 - d / (t.r * 2.2))); }
  const fire = smooth(9, 1.5, Math.hypot(x - FIRE.x, z - FIRE.z));
  return { shade: clamp(shade - fire * 0.5, 0, 1), fire };
}

// места, где деревья не растут (сбор ресурсов, роща для рубки)
export const KEEP_CLEAR = [{ x: -3, z: -6, r: 7.2 }, { x: -13, z: -3, r: 4.5 }, { x: -9.5, z: -19, r: 4.5 }, { x: 4.5, z: -9.5, r: 3.5 }, { x: 5.2, z: -6.5, r: 3 }, { x: -12.6, z: 1.6, r: 2.5 }, { x: -6.4, z: 2.2, r: 2.5 }];
export const inWater = (x, z) => heightAt(x, z) < WATER_Y;
export const inPlot = (x, z) => Math.abs(x) <= HALF && Math.abs(z) <= HALF;

// цвета земли (sRGB hex) для меша и для схемы
export const ZONE_COL3D = { ground: 0x4a5f3a, slope: 0x5d5a40, shore: 0x6f6a4a, shallow: 0x4b5a4c, water: 0x2a4a50, border: 0x2c4130, road: 0x7b6b4e };
export const ZONE_COL2D = { ground: '#6f9150', slope: '#a28a54', shore: '#d3bd7c', shallow: '#68bdd0', water: '#2f78ad', border: '#2f6340', road: '#b8905c' };
export const ZONE_NAME = { ground: 'Земля', slope: 'Склон', shore: 'Берег', shallow: 'Мелководье', water: 'Вода', border: 'Граница леса', road: 'Дорога' };
export { hash2 };
