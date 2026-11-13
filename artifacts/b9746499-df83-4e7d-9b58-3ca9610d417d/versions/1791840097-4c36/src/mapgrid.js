// MapGrid: чтение и правка сетки местности (формат map-grid/1). Без зависимостей.
// Клетка (cx, cz): cx на восток, cz на юг. 1 клетка = cellSize метров.
// Мир: x на восток, z на юг, y вверх (как в three.js). Угол клетки (0, 0) лежит в точке origin
// (по умолчанию карта по центру). playable: многоугольник проходимой области в клетках.
// Высота хранится в метрах (в JSON в дециметрах), уровень воды waterLevel.

export class MapGrid {
  constructor(json) {
    if (json.format !== 'map-grid/1') throw new Error('Неизвестный формат карты: ' + json.format);
    this.name = json.name;
    this.width = json.width;
    this.height = json.height;
    this.cellSize = json.cellSize ?? 1;
    this.waterLevel = json.waterLevel ?? 0;
    this.origin = json.origin ?? { x: -this.width / 2 * this.cellSize, z: -this.height / 2 * this.cellSize };
    this.playable = json.playable ?? [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]];
    this.zones = json.zones;
    this.landmarks = json.landmarks ?? [];
    this.meta = { axes: json.axes };
    const n = this.width * this.height;
    const k = json.heightUnit === 'dm' ? 0.1 : 1;
    this.heights = new Float32Array(n);
    for (let i = 0; i < n; i++) this.heights[i] = json.heights[i] * k;
    this.zone = new Uint8Array(n);
    json.zoneRows.forEach((row, z) => {
      for (let x = 0; x < this.width; x++) this.zone[z * this.width + x] = row.charCodeAt(x) - 48;
    });
    this.zoneById = Object.fromEntries(this.zones.map(z => [z.id, z]));
    this.zoneByKey = Object.fromEntries(this.zones.map(z => [z.key, z]));
  }

  static async load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Не удалось загрузить карту ' + url + ': ' + r.status);
    return new MapGrid(await r.json());
  }

  // ---- клетки ----
  inBounds(cx, cz) { return cx >= 0 && cz >= 0 && cx < this.width && cz < this.height; }
  index(cx, cz) { return cz * this.width + cx; }
  heightAtCell(cx, cz) {
    cx = Math.min(this.width - 1, Math.max(0, cx | 0));
    cz = Math.min(this.height - 1, Math.max(0, cz | 0));
    return this.heights[cz * this.width + cx];
  }
  zoneAtCell(cx, cz) { return this.inBounds(cx, cz) ? this.zoneById[this.zone[this.index(cx, cz)]] : this.zoneByKey.border; }
  isWalkableCell(cx, cz) { return !!this.zoneAtCell(cx, cz).walk; }
  isWaterCell(cx, cz) { const k = this.zoneAtCell(cx, cz).key; return k === 'water' || k === 'shallow'; }

  // ---- мир <-> клетка ----
  worldToCell(x, z) {
    return { cx: Math.floor((x - this.origin.x) / this.cellSize), cz: Math.floor((z - this.origin.z) / this.cellSize) };
  }
  cellToWorld(cx, cz) {
    return { x: this.origin.x + (cx + 0.5) * this.cellSize, z: this.origin.z + (cz + 0.5) * this.cellSize };
  }
  // Высота поверхности в мировой точке (билинейно по центрам клеток).
  heightAt(x, z) {
    const fx = (x - this.origin.x) / this.cellSize - 0.5;
    const fz = (z - this.origin.z) / this.cellSize - 0.5;
    const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const h = (a, b) => this.heightAtCell(a, b);
    return (h(x0, z0) * (1 - tx) + h(x0 + 1, z0) * tx) * (1 - tz) +
           (h(x0, z0 + 1) * (1 - tx) + h(x0 + 1, z0 + 1) * tx) * tz;
  }
  zoneAt(x, z) { const c = this.worldToCell(x, z); return this.zoneAtCell(c.cx, c.cz); }
  isWalkable(x, z) { return !!this.zoneAt(x, z).walk; }
  waterDepthAt(x, z) { return Math.max(0, this.waterLevel - this.heightAt(x, z)); }

  // Сектор вида «C4» (буква = столбец, число = ряд), size в клетках.
  sectorName(cx, cz, size = 16) {
    const col = Math.floor(cx / size), row = Math.floor(cz / size);
    let s = '', c = col;
    do { s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26) - 1; } while (c >= 0);
    return s + (row + 1);
  }

  // ---- правка ----
  setHeightCell(cx, cz, h) { if (this.inBounds(cx, cz)) this.heights[this.index(cx, cz)] = h; }
  setZoneCell(cx, cz, id) { if (this.inBounds(cx, cz)) this.zone[this.index(cx, cz)] = id; }
  snapshot() { return { h: this.heights.slice(), z: this.zone.slice() }; }
  restore(s) { this.heights.set(s.h); this.zone.set(s.z); }

  toJSON() {
    const rows = [];
    for (let z = 0; z < this.height; z++) {
      let r = '';
      for (let x = 0; x < this.width; x++) r += String.fromCharCode(48 + this.zone[z * this.width + x]);
      rows.push(r);
    }
    return {
      format: 'map-grid/1', name: this.name, width: this.width, height: this.height,
      cellSize: this.cellSize, waterLevel: this.waterLevel, axes: this.meta.axes,
      origin: this.origin, playable: this.playable,
      heightUnit: 'dm', zones: this.zones, landmarks: this.landmarks,
      heights: Array.from(this.heights, v => Math.round(v * 10)), zoneRows: rows,
    };
  }
}

// OuterTerrain: окрестности за картой (формат map-grid-outer/1), только для вида.
// Несколько уровней высот, от мелкой клетки к крупной; heightAt берёт самый подробный уровень.
export class OuterTerrain {
  constructor(json) {
    if (json.format !== 'map-grid-outer/1') throw new Error('Неизвестный формат окрестностей: ' + json.format);
    this.waterLevel = json.waterLevel ?? 0;
    this.mapRect = json.mapRect;
    const k = json.heightUnit === 'dm' ? 0.1 : 1;
    this.levels = json.levels.map(L => {
      const bin = atob(L.heights), dv = new DataView(new ArrayBuffer(bin.length));
      for (let i = 0; i < bin.length; i++) dv.setUint8(i, bin.charCodeAt(i));
      const n = L.nx * L.nz, heights = new Float32Array(n);
      for (let i = 0; i < n; i++) heights[i] = dv.getInt16(i * 2, true) * k;
      return { cellSize: L.cellSize, x0: L.x0, z0: L.z0, nx: L.nx, nz: L.nz, heights,
               x1: L.x0 + L.nx * L.cellSize, z1: L.z0 + L.nz * L.cellSize };
    });
  }
  static async load(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Не удалось загрузить окрестности ' + url + ': ' + r.status);
    return new OuterTerrain(await r.json());
  }
  levelAt(x, z) { return this.levels.find(L => x >= L.x0 && z >= L.z0 && x < L.x1 && z < L.z1) ?? null; }
  heightAt(x, z) {
    const L = this.levelAt(x, z); if (!L) return null;
    const fx = (x - L.x0) / L.cellSize - 0.5, fz = (z - L.z0) / L.cellSize - 0.5;
    const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
    const h = (i, j) => L.heights[Math.min(L.nz - 1, Math.max(0, j)) * L.nx + Math.min(L.nx - 1, Math.max(0, i))];
    return (h(x0, z0) * (1 - tx) + h(x0 + 1, z0) * tx) * (1 - tz) + (h(x0, z0 + 1) * (1 - tx) + h(x0 + 1, z0 + 1) * tx) * tz;
  }
}
