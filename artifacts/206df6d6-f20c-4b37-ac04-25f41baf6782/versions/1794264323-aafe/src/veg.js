// Растительность логова слоями (2026-11-07, правило R6 «Сказанья»): куст = тёмное ядро + ветки + веточки с листьями
// в три оболочки (внутренняя в тени, внешняя светлая), мох = подушка с лопастями, бугорками и стебельками,
// папоротник = вайи с перышками, ива = свисающие пряди узких листьев. Палитра прежняя: меняется форма, не цвет.
// Своя последовательность случайных чисел: раскладка логова (общий rnd из kit.js) не сдвигается.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
let _s = 1;
const rn = () => ((_s = (_s * 16807) % 2147483647) / 2147483647);
const rg = (a, b) => a + (b - a) * rn();
const seed = (s) => { _s = (s * 7919 + 13) % 2147483647 || 1; };
const col = (c, dl = 0) => new THREE.Color(c).offsetHSL(0, 0, dl);

// сборщик: треугольники с цветом вершин и «объёмной» нормалью (от центра растения, чуть вверх)
class VB {
  constructor(center = V(0, 0, 0), up = 0.55) { this.p = []; this.n = []; this.uv = []; this.c = []; this.C = center; this.up = up; }
  vert(v, u, c, nrm) {
    this.p.push(v.x, v.y, v.z); this.uv.push(u[0], u[1]); this.c.push(c.r, c.g, c.b);
    let n = nrm;
    if (!n) { n = v.clone().sub(this.C); n.y = Math.max(n.y, 0) + this.up * (n.length() + 0.05); n.normalize(); }
    this.n.push(n.x, n.y, n.z);
  }
  tri(a, b, c, ua, ub, uc, ca, cb = ca, cc = ca, n) { this.vert(a, ua, ca, n); this.vert(b, ub, cb, n); this.vert(c, uc, cc, n); }
  // лист: черешок -> два края -> кончик, сложен по жилке (края приподняты вдоль f); две половинки разного тона
  leaf(base, dir, side, L, W, cA, cB, fold = 0.25) {
    const f = dir.clone().cross(side).normalize();
    const mid = base.clone().addScaledVector(dir, L * 0.42);
    const l = mid.clone().addScaledVector(side, W).addScaledVector(f, W * fold), r = mid.clone().addScaledVector(side, -W).addScaledVector(f, W * fold);
    const tip = base.clone().addScaledVector(dir, L);
    this.tri(base, l, tip, [0.5, 1], [0, 0.55], [0.5, 0], cA);
    this.tri(base, tip, r, [0.5, 1], [0.5, 0], [1, 0.55], cB);
  }
  // трёхгранная палочка (ветка, черешок)
  stick(a, b, ra, rb, c) {
    const d = b.clone().sub(a).normalize(), s = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    const u = d.clone().cross(s).normalize(), w = d.clone().cross(u).normalize();
    const ring = (o, r) => [0, 1, 2].map((k) => { const t = k / 3 * 6.283; return o.clone().addScaledVector(u, Math.cos(t) * r).addScaledVector(w, Math.sin(t) * r); });
    const A = ring(a, ra), B = ring(b, rb);
    for (let k = 0; k < 3; k++) { const k2 = (k + 1) % 3, nn = A[k].clone().add(A[k2]).multiplyScalar(0.5).sub(a).normalize();
      this.tri(A[k], A[k2], B[k2], [0, 0], [1, 0], [1, 1], c, c, c, nn); this.tri(A[k], B[k2], B[k], [0, 0], [1, 1], [0, 1], c, c, c, nn); }
  }
  geo(withColor = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (withColor) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}
const randDir = () => { for (;;) { const d = V(rg(-1, 1), rg(-1, 1), rg(-1, 1)); const l = d.length(); if (l > 0.1 && l < 1) return d.multiplyScalar(1 / l); } };
const perp = (d) => { const s = Math.abs(d.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0); return d.clone().cross(s).normalize(); };

// веточка с листьями от точки a к b: листья парами вдоль, на конце один
function spray(b, a, z, n, L, W, tone, droop = 0.2) {
  const d = z.clone().sub(a), len = d.length(); d.normalize();
  b.stick(a, z, 0.012, 0.005, tone.twig);
  for (let i = 0; i < n; i++) {
    const t = 0.35 + 0.65 * (i + 0.5) / n, q = a.clone().addScaledVector(d, len * t);
    const sd = (i % 2 ? 1 : -1), side = perp(d).applyAxisAngle(d, rg(-0.6, 0.6));
    const dir = d.clone().multiplyScalar(0.55).addScaledVector(side, sd * 0.8).add(V(0, -droop * rg(0.3, 1), 0)).add(randDir().multiplyScalar(0.25)).normalize();
    const lk = rg(0.8, 1.15), c = tone.leaf(rg(-0.04, 0.04));
    b.leaf(q, dir, perp(dir), L * lk, W * lk, c, c.clone().offsetHSL(0, 0, 0.035 * sd));
  }
  const c = tone.leaf(rg(-0.03, 0.05));
  b.leaf(z, d.clone().add(V(0, 0.15, 0)).normalize(), perp(d), L, W, c, c.clone().offsetHSL(0, 0, 0.03));
}

// ---------- куст: размер как у прежнего комка (радиус ~1, высота ~0.8, низ на -0.2) ----------
export function bushGeo(sd = 1, berries = false) {
  seed(sd);
  const b = new VB(V(0, -0.25, 0), 0.5);
  const core = col('#22361e'), bark = col('#3a2b1d');
  // ядро: тёмная бугристая масса, чтобы сквозь листья не было просвета
  const ico = new THREE.IcosahedronGeometry(1, 1), p = ico.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const t = [0, 1, 2].map((k) => { const v = V(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); const kk = 0.52 + 0.12 * Math.sin(v.x * 5.1 + v.z * 3.7); return V(v.x * kk, Math.max(v.y, -0.3) * kk * 0.62, v.z * kk); });
    b.tri(t[0], t[1], t[2], [0, 0], [1, 0], [0, 1], core);
  }
  // ветки от корня наружу
  const tips = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * 6.283 + rg(-0.3, 0.3), r = rg(0.6, 0.85), tip = V(Math.cos(a) * r, rg(0.15, 0.55), Math.sin(a) * r);
    const mid = V(Math.cos(a) * r * 0.45, rg(0.05, 0.25), Math.sin(a) * r * 0.45);
    b.stick(V(Math.cos(a) * 0.08, -0.2, Math.sin(a) * 0.08), mid, 0.045, 0.03, bark); b.stick(mid, tip, 0.03, 0.012, bark);
    tips.push(tip);
  }
  // три оболочки веточек: внутренняя тёмная, средняя основная, внешняя светлая
  const shells = [
    { r: 0.62, n: 18, L: 0.26, W: 0.1, leaf: (dl) => col('#2a4224', dl), twig: bark },
    { r: 0.82, n: 24, L: 0.27, W: 0.1, leaf: (dl) => col('#36502c', dl), twig: bark },
    { r: 1.0, n: 26, L: 0.25, W: 0.09, leaf: (dl) => col('#4e6e2c', dl), twig: col('#4a3a26') },
  ];
  for (const sh of shells) for (let k = 0; k < sh.n; k++) {
    const a = rg(0, 6.283), el = Math.asin(rg(-0.15, 0.97)), rr = sh.r * rg(0.9, 1.08);
    const z = V(Math.cos(a) * Math.cos(el) * rr, Math.sin(el) * rr * 0.9 - 0.02, Math.sin(a) * Math.cos(el) * rr);
    const from = z.clone().multiplyScalar(rg(0.55, 0.7)); from.y -= 0.05;
    spray(b, from, z, 5, sh.L, sh.W, sh, 0.15);
  }
  // ягоды (черника/шиповник) по внешней оболочке
  if (berries) for (let k = 0; k < 9; k++) {
    const a = rg(0, 6.283), el = rg(0.1, 1.0), q = V(Math.cos(a) * Math.cos(el) * 0.98, Math.sin(el) * 0.74, Math.sin(a) * Math.cos(el) * 0.98), c = col('#2b2f52', rg(-0.03, 0.05)), rr = 0.035;
    b.tri(q.clone().add(V(0, rr, 0)), q.clone().add(V(rr, -rr * 0.5, 0)), q.clone().add(V(-rr * 0.5, -rr * 0.5, rr)), [0, 0], [1, 0], [0, 1], c);
    b.tri(q.clone().add(V(0, rr, 0)), q.clone().add(V(-rr * 0.5, -rr * 0.5, -rr)), q.clone().add(V(rr, -rr * 0.5, 0)), [0, 0], [1, 0], [0, 1], c);
  }
  return b.geo();
}

// ---------- моховая подушка: лопастной край, бугорки сверху, стебельки-звёздочки; радиус 1, высота 1 ----------
// lite: для статики (крыши, сваи, основания) — не тяжелее прежней полусферы
export function mossGeo(sd = 1, lite = false) {
  seed(sd + 50);
  const b = new VB(V(0, -0.3, 0), 0.3);
  const lo = col('#ffffff', -0.32), hi = col('#ffffff', 0), tip = col('#ffffff', 0.08);   // множители к цвету материала
  const S = lite ? 9 : 12, R = lite ? 3 : 4, ph = rg(0, 6), ph2 = rg(0, 6);
  const rim = (a) => 0.82 + 0.16 * Math.sin(a * 3 + ph) + 0.09 * Math.sin(a * 5 + ph2);
  const pt = (i, j) => {
    const a = i / S * 6.283, th = j / R * Math.PI / 2, r = Math.cos(th) * rim(a), bump = 1 + 0.12 * Math.sin(a * 4 + j * 1.7 + ph) * Math.sin(th * 2);
    return V(Math.cos(a) * r * bump, Math.sin(th) * (0.85 + 0.15 * Math.sin(a * 2 + ph2)) * bump, Math.sin(a) * r * bump);
  };
  const cc = (v) => lo.clone().lerp(hi, Math.min(1, v.y * 1.4 + 0.15));
  for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) {
    const A = pt(i, j), B = pt(i + 1, j), C = pt(i + 1, j + 1), D = pt(i, j + 1);
    if (j < R - 1) { b.tri(A, B, C, [0, 0], [1, 0], [1, 1], cc(A), cc(B), cc(C)); b.tri(A, C, D, [0, 0], [1, 1], [0, 1], cc(A), cc(C), cc(D)); }
    else b.tri(A, B, C, [0, 0], [1, 0], [0.5, 1], cc(A), cc(B), cc(C));
  }
  // бугорки — подушечки поменьше поверх главной
  if (!lite) for (let k = 0; k < 3; k++) {
    const a = rg(0, 6.283), d = rg(0.25, 0.55), c0 = V(Math.cos(a) * d, 0, Math.sin(a) * d), top = pt(Math.round(a / 6.283 * S) % S, 1).y;
    const r = rg(0.25, 0.38), h = rg(0.18, 0.3), y0 = top * 0.75;
    for (let i = 0; i < 6; i++) {
      const a0 = i / 6 * 6.283, a1 = (i + 1) / 6 * 6.283;
      const P0 = V(c0.x + Math.cos(a0) * r, y0, c0.z + Math.sin(a0) * r), P1 = V(c0.x + Math.cos(a1) * r, y0, c0.z + Math.sin(a1) * r);
      const M0 = V(c0.x + Math.cos(a0) * r * 0.6, y0 + h * 0.75, c0.z + Math.sin(a0) * r * 0.6), M1 = V(c0.x + Math.cos(a1) * r * 0.6, y0 + h * 0.75, c0.z + Math.sin(a1) * r * 0.6), T = V(c0.x, y0 + h, c0.z);
      b.tri(P0, P1, M1, [0, 0], [1, 0], [1, 1], hi, hi, tip); b.tri(P0, M1, M0, [0, 0], [1, 1], [0, 1], hi, tip, tip); b.tri(M0, M1, T, [0, 0], [1, 0], [0.5, 1], tip);
    }
  }
  // юбка (2026-11-07, Michael: «мох кусками, без мягкого перехода»): плоское кольцо от края кочки наружу, рваный край,
  // цвет к краю буреет до тона болотной земли — кочка не стоит на земле отдельным камнем, а растекается по ней
  { const earth = col('#ffffff', -0.32).multiply(new THREE.Color(0.78, 0.62, 0.46)), K = 22;
    for (let i = 0; i < K; i++) {
      const a0 = i / K * 6.283, a1 = (i + 1) / K * 6.283;
      const r0 = (a) => rim(a) * 0.92, r1 = (a) => rim(a) * (1.25 + 0.22 * Math.sin(a * 7 + ph) + 0.12 * Math.sin(a * 13 + ph2));
      const A = V(Math.cos(a0) * r0(a0), 0.02, Math.sin(a0) * r0(a0)), B = V(Math.cos(a1) * r0(a1), 0.02, Math.sin(a1) * r0(a1));
      const C = V(Math.cos(a1) * r1(a1), -0.01, Math.sin(a1) * r1(a1)), D = V(Math.cos(a0) * r1(a0), -0.01, Math.sin(a0) * r1(a0));
      b.tri(A, C, B, [0, 0], [1, 1], [1, 0], lo, earth, lo); b.tri(A, D, C, [0, 0], [0, 1], [1, 1], lo, earth, earth);
    } }
  // стебельки: трёхгранные «звёздочки» по верху (ворс) и бахрома по краю — много мелких, чтобы кочка читалась пушистой
  const n = lite ? 16 : 56;
  for (let k = 0; k < n; k++) {
    const edge = k % 3 === 0, a = rg(0, 6.283), j = edge ? 0.35 : rg(0.6, 2.2) * (R / 4), q = pt(a / 6.283 * S, Math.min(j, R - 0.5));
    const out = edge ? V(Math.cos(a), 0.9, Math.sin(a)).normalize() : V(rg(-0.3, 0.3), 1, rg(-0.3, 0.3)).normalize(), h = rg(0.1, 0.22), w = 0.03;
    const top = q.clone().addScaledVector(out, h), s1 = perp(out), s2 = out.clone().cross(s1).normalize();
    const bs = [0, 1, 2].map((m) => q.clone().addScaledVector(s1, Math.cos(m * 2.094) * w).addScaledVector(s2, Math.sin(m * 2.094) * w));
    for (let m = 0; m < 3; m++) b.tri(bs[m], bs[(m + 1) % 3], top, [0, 1], [1, 1], [0.5, 0], hi, hi, tip);
  }
  return b.geo(!lite);
}

// ---------- папоротник: 7 вай, у каждой стержень и перышки парами, кончик загнут; радиус ~0.75 ----------
export function fernGeo(sd = 1) {
  seed(sd + 100);
  const b = new VB(V(0, -0.2, 0), 0.9);
  const stem = col('#34501f'), base = col('#3a5826'), tipC = col('#4e6e2c');
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * 6.283 + rg(-0.2, 0.2), ca = Math.cos(a), sa = Math.sin(a), lk = rg(0.85, 1.1), arch = rg(2.1, 2.7);
    const at = (t) => { const r = t * 0.75 * lk, y = Math.sin(t * arch) * 0.45 * lk - (t > 0.8 ? (t - 0.8) * 0.4 : 0); return V(ca * r, y, sa * r); };
    const sideV = V(-sa, 0, ca);
    const N = 7;
    for (let i = 0; i < N; i++) { const A = at(i / N), B = at((i + 1) / N), w = 0.012 * (1 - i / N) + 0.004;
      b.tri(A.clone().addScaledVector(sideV, -w), A.clone().addScaledVector(sideV, w), B, [0, 1], [1, 1], [0.5, 0], stem); }
    // перышки: от основания к кончику длина по синусу, каждое из двух треугольников с зубцом
    for (let i = 1; i < 11; i++) {
      const t = 0.12 + i / 11 * 0.82, q = at(t), dn = at(Math.min(1, t + 0.04)).sub(q).normalize();
      const len = (0.17 * Math.sin(Math.min(1, t * 1.15) * Math.PI) + 0.03) * lk, w = len * 0.32;
      for (const sd2 of [-1, 1]) {
        const out = sideV.clone().multiplyScalar(sd2).addScaledVector(dn, 0.55).add(V(0, -0.18, 0)).normalize();
        const c = base.clone().lerp(tipC, t).offsetHSL(0, 0, rg(-0.03, 0.03) + sd2 * 0.015);
        const m1 = q.clone().addScaledVector(out, len * 0.45).addScaledVector(dn, w), m2 = q.clone().addScaledVector(out, len * 0.6).addScaledVector(dn, -w * 0.4);
        const tp = q.clone().addScaledVector(out, len).add(V(0, -0.02, 0)), q2 = q.clone().addScaledVector(dn, w * 1.2);
        b.tri(q, m1, tp, [0.5, 1], [0, 0.5], [0.5, 0], c); b.tri(q, tp, m2, [0.5, 1], [0.5, 0], [1, 0.5], c.clone().offsetHSL(0, 0, -0.03)); b.tri(q, q2, m1, [0.5, 1], [0.4, 0.9], [0, 0.5], c);
      }
    }
  }
  return b.geo();
}

// ---------- ива: шапка веточек и свисающие пряди узких листьев; масштаб как у прежнего комка (радиус 1) ----------
export function willowGeo(sd = 1) {
  seed(sd + 200);
  const b = new VB(V(0, 0.3, 0), 0.3);
  const tone = { leaf: (dl) => col('#ffffff', dl - 0.04), twig: col('#ffffff', -0.35) };   // без цвета вершин: цвет даёт MAT.leaf
  for (let k = 0; k < 8; k++) {
    const a = rg(0, 6.283), el = rg(0.1, 1.2), z = V(Math.cos(a) * Math.cos(el) * 0.9, Math.sin(el) * 0.55, Math.sin(a) * Math.cos(el) * 0.9);
    spray(b, z.clone().multiplyScalar(0.4), z, 3, 0.3, 0.06, tone, 0.3);
  }
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * 6.283 + rg(-0.3, 0.3), r = rg(0.35, 0.95), top = V(Math.cos(a) * r, rg(-0.1, 0.3), Math.sin(a) * r), len = rg(1.0, 2.0);
    const swing = V(rg(-0.15, 0.15), 0, rg(-0.15, 0.15));
    const at = (t) => top.clone().add(V(swing.x * t * t, -len * t, swing.z * t * t));
    b.stick(at(0), at(1), 0.01, 0.005, tone.twig);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, q = at(t), sd2 = i % 2 ? 1 : -1, ang = a + sd2 * 1.3 + rg(-0.4, 0.4);
      const dir = V(Math.cos(ang) * 0.55, -0.85, Math.sin(ang) * 0.55).normalize();
      b.leaf(q, dir, perp(dir), rg(0.26, 0.36), 0.035, col('#ffffff', rg(-0.06, 0.03)), col('#ffffff', rg(-0.03, 0.05)), 0.4);
    }
  }
  return b.geo(false);
}

// ---------- зелень на крыше: пучок веточек (вместо комка 0.25 м) ----------
export function sprigGeo(sd = 1) {
  seed(sd + 300);
  const b = new VB(V(0, -0.1, 0), 0.5);
  const tone = { leaf: (dl) => col('#ffffff', dl), twig: col('#ffffff', -0.35) };
  for (let k = 0; k < 6; k++) { const d = randDir(); d.y = Math.abs(d.y) * 0.8 + 0.1; d.normalize(); spray(b, V(0, -0.05, 0), d.multiplyScalar(0.24), 3, 0.11, 0.04, tone, 0.2); }
  return b.geo(false);
}
