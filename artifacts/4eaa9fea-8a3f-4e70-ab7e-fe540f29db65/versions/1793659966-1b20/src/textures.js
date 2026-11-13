// Нарисованные текстуры, которые генерируются при загрузке (без файлов):
// 1) набор отпечатков кисти 4×4: мазки с ворсом, сужением концов и неровной кромкой;
// 2) зерно бумаги: волокна и мелкие поры, накладывается на весь кадр.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function makeBrushAtlas(size = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const r = rng(91);
  const cell = size / 4;
  for (let k = 0; k < 16; k++) {
    const cx = (k % 4) * cell, cy = Math.floor(k / 4) * cell;
    g.save(); g.beginPath(); g.rect(cx, cy, cell, cell); g.clip();
    // мазок: ворсинки вдоль x, у каждой своя длина, прозрачность и лёгкий изгиб
    const len = cell * (0.6 + r() * 0.32), wid = cell * (0.24 + r() * 0.2);
    const x0 = cx + (cell - len) / 2, y0 = cy + cell / 2, bend = (r() - 0.5) * wid * 0.8;
    const hairs = 40 + Math.floor(r() * 24);
    for (let h = 0; h < hairs; h++) {
      const off = (h / (hairs - 1) - 0.5) * wid;
      const a = 0.35 + r() * 0.65;
      const s0 = r() * len * 0.18, s1 = len - r() * len * 0.3; // рваное начало и сухой хвост
      g.strokeStyle = `rgba(255,255,255,${a})`;
      g.lineWidth = 0.8 + r() * 1.8;
      g.beginPath();
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = x0 + s0 + (s1 - s0) * t;
        const taper = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.5; // к концам мазок сужается
        const y = y0 + off * taper + bend * Math.sin(t * Math.PI) + (r() - 0.5) * 0.6;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
  return tex;
}

export function makePaper(size = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size); const d = img.data;
  const r = rng(7);
  for (let i = 0; i < size * size; i++) { const v = 128 + (r() - 0.5) * 34; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  // волокна: короткие светлые и тёмные штрихи в разные стороны
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, l = 3 + r() * 14;
    g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.08 + r() * 0.12})` : `rgba(0,0,0,${0.06 + r() * 0.1})`;
    g.lineWidth = 0.6 + r() * 0.8;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
