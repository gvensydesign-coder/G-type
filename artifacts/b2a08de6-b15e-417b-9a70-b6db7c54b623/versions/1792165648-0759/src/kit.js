// Мини-набор для сборки плоскотоновых низкополигональных мешей с цветом в вершинах (все формы превью).
import * as THREE from 'three';

export const rng = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash2(ix, iz), hash2(ix + 1, iz), u), lerp(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), u), v);
}
export function fbm(x, z) { return vnoise(x, z) * 0.55 + vnoise(x * 2.1 + 5, z * 2.1 + 9) * 0.3 + vnoise(x * 4.3 + 1, z * 4.3 + 3) * 0.15; }

const _c = new THREE.Color();
const cache = new Map();
export function col(hex) {
  let c = cache.get(hex);
  if (!c) { c = new THREE.Color(hex); cache.set(hex, c); }
  return c;
}
export function mixCol(a, b, t) { return _c.copy(col(a)).lerp(col(b), t); }

export class G {
  constructor(seed = 1) { this.p = []; this.c = []; this.r = rng(seed); this.jit = 0.07; }
  _col(c, j = this.jit) {
    const k = 1 + (this.r() - 0.5) * 2 * j;
    const cc = typeof c === 'number' ? col(c) : c;
    return [cc.r * k, cc.g * k, cc.b * k];
  }
  // треугольник с цветами вершин (a, b, c — [x,y,z]; ca, cb, cc — THREE.Color или hex)
  tri(a, b, c, ca, cb = ca, cc = ca) {
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    const j = 1 + (this.r() - 0.5) * 2 * this.jit;
    for (const q of [ca, cb, cc]) { const x = typeof q === 'number' ? col(q) : q; this.c.push(x.r * j, x.g * j, x.b * j); }
  }
  quad(a, b, c, d, ca, cb = ca, cc = ca, cd = ca) { this.tri(a, b, c, ca, cb, cc); this.tri(a, c, d, ca, cc, cd); }
  // шестигранная (или n-гранная) призма от точки a до точки b, конусность t (радиус на конце b = r*t)
  prism(a, b, r, color, n = 6, t = 1, colTop = color, caps = true) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const ax = B.clone().sub(A); const len = ax.length(); if (len < 1e-5) return;
    ax.divideScalar(len);
    const up = Math.abs(ax.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(ax, up).normalize(), v = new THREE.Vector3().crossVectors(ax, u);
    const ring = (P, rad, k) => { const o = []; for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2 + 0.3; o.push([P.x + (u.x * Math.cos(an) + v.x * Math.sin(an)) * rad, P.y + (u.y * Math.cos(an) + v.y * Math.sin(an)) * rad, P.z + (u.z * Math.cos(an) + v.z * Math.sin(an)) * rad]); } return o; };
    const r0 = ring(A, r), r1 = ring(B, r * t);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(r0[i], r0[j], r1[j], r1[i], color, color, colTop, colTop); }
    if (caps) {
      if (t > 0.02) { for (let i = 1; i < n - 1; i++) this.tri(r1[0], r1[i], r1[i + 1], colTop); }
      for (let i = 1; i < n - 1; i++) this.tri(r0[0], r0[i + 1], r0[i], color);
    }
  }
  cone(base, h, r, color, n = 7, colTop = color) { this.prism(base, [base[0], base[1] + h, base[2]], r, color, n, 0.001, colTop, true); }
  box(cx, cy, cz, sx, sy, sz, color, ry = 0, colTop = color) {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
    this.quad(v[4], v[5], v[6], v[7], color, color, colTop, colTop);
    this.quad(v[1], v[0], v[3], v[2], color, color, colTop, colTop);
    this.quad(v[5], v[1], v[2], v[6], color, color, colTop, colTop);
    this.quad(v[0], v[4], v[7], v[3], color, color, colTop, colTop);
    this.quad(v[3], v[7], v[6], v[2], colTop);
    this.quad(v[0], v[1], v[5], v[4], color);
  }
  // произвольный параллелепипед между двумя точками (балка): ширина w по горизонтали, высота h
  beam(a, b, w, h, color, colTop = color) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const ax = B.clone().sub(A).normalize();
    let side = new THREE.Vector3().crossVectors(ax, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const up = new THREE.Vector3().crossVectors(side, ax).normalize();
    const pt = (P, s, u) => [P.x + side.x * s * w / 2 + up.x * u * h / 2, P.y + side.y * s * w / 2 + up.y * u * h / 2, P.z + side.z * s * w / 2 + up.z * u * h / 2];
    const a0 = pt(A, -1, -1), a1 = pt(A, 1, -1), a2 = pt(A, 1, 1), a3 = pt(A, -1, 1);
    const b0 = pt(B, -1, -1), b1 = pt(B, 1, -1), b2 = pt(B, 1, 1), b3 = pt(B, -1, 1);
    this.quad(a3, a2, b2, b3, colTop); this.quad(a0, b0, b1, a1, color);
    this.quad(a1, b1, b2, a2, color); this.quad(a0, a3, b3, b0, color);
    this.quad(a0, a1, a2, a3, color); this.quad(b1, b0, b3, b2, color);
  }
  // неровный «камень»/куст: икосфера с шумом, сплюснутая
  blob(cx, cy, cz, r, color, { sy = 1, sx = 1, sz = 1, detail = 1, noise = 0.18, seed = 1, top = color, flat = false } = {}) {
    const geo = new THREE.IcosahedronGeometry(1, detail);
    const pos = geo.attributes.position;
    const rr = rng(seed * 977 + 13);
    const dirs = new Map();
    const key = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    for (let i = 0; i < pos.count; i++) { const k = key(i); if (!dirs.has(k)) dirs.set(k, 1 + (rr() - 0.5) * 2 * noise); }
    for (let i = 0; i < pos.count; i += 3) {
      const t = [0, 1, 2].map((q) => { const k = key(i + q); const m = dirs.get(k); return [cx + pos.getX(i + q) * r * sx * m, cy + pos.getY(i + q) * r * sy * m, cz + pos.getZ(i + q) * r * sz * m, pos.getY(i + q)]; });
      const cc = (y) => mixCol(color, top, clamp(y * 0.5 + 0.5, 0, 1)).clone();
      this.tri(t[0], t[1], t[2], cc(t[0][3]), cc(t[1][3]), cc(t[2][3]));
    }
    geo.dispose();
  }
  // перенос/поворот уже накопленных вершин с индекса from
  transformFrom(from, m4) {
    const v = new THREE.Vector3();
    for (let i = from * 3; i < this.p.length; i += 3) { v.set(this.p[i], this.p[i + 1], this.p[i + 2]).applyMatrix4(m4); this.p[i] = v.x; this.p[i + 1] = v.y; this.p[i + 2] = v.z; }
  }
  get count() { return this.p.length / 3; }
  build(smoothN = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals();
    return g;
  }
}
