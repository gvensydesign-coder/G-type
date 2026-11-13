// Деревья: процедурные кривые стволы и ветви (трубки по ломаной с утолщениями), листва гроздьями с просветами,
// ели ярусами с острыми зубцами-лапами и шишками, дубы-великаны с раскидистыми сучьями, сосны с рыжим стволом,
// берёзы (часто в 2–3 ствола) с чёрными чечевичками, сухостой с обломанной вершиной, пни с корнями.
// buildTree(k, kind, x, y, z, s) — дерево в точке (x, y, z) мира, s — масштаб. Детали сливаются в Kit k.
import * as THREE from 'three';
import { PAT, lumpify } from './kit.js';

const I4 = new THREE.Matrix4();
// отдельный поток случайных чисел из одного числа потока Kit: дальний вид (k.lod) пропускает детали, не сбивая формы дерева
function sub(k) { let t = (k.rand() * 4294967296) >>> 0; const f = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; return (a = 0, b = 1) => a + (b - a) * f(); }
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// Трубка по ломаной pts с радиусами rads: аналитические нормали, кора вдоль оси, узлы-наплывы; вершина закрыта.
export function tube(k, pts, rads, o = {}) {
  const seg = k.lod ? Math.max(3, (o.seg ?? 6) - 2) : o.seg ?? 6, n = pts.length, P = pts.map(V), bump = o.bump ?? 0.12, sd = k.rand() * 50;
  const T = [], N = [], B = [];
  for (let i = 0; i < n; i++) T.push(P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize());
  let n0 = new THREE.Vector3(0, 1, 0).cross(T[0]); if (n0.lengthSq() < 1e-4) n0.set(1, 0, 0); N.push(n0.normalize());
  for (let i = 1; i < n; i++) { const m = N[i - 1].clone().addScaledVector(T[i], -N[i - 1].dot(T[i])); N.push(m.lengthSq() > 1e-8 ? m.normalize() : N[i - 1].clone()); }
  for (let i = 0; i < n; i++) B.push(new THREE.Vector3().crossVectors(T[i], N[i]));
  const pos = [], nor = [], uv = [], idx = [];
  let L = 0;
  for (let i = 0; i < n; i++) {
    if (i) L += P[i].distanceTo(P[i - 1]);
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const d = N[i].clone().multiplyScalar(ca).addScaledVector(B[i], sa);
      const bb = 1 + bump * (Math.sin(a * 3 + i * 1.7 + sd) * 0.5 + Math.sin(a * 5 - i * 2.3 + sd * 2) * 0.3);   // наплывы и рёбра коры
      const r = rads[i] * (i === n - 1 && o.tip !== false ? 0.35 : bb);
      const p = P[i].clone().addScaledVector(d, r);
      pos.push(p.x, p.y, p.z); nor.push(d.x, d.y, d.z); uv.push(L, a * (rads[0] * 0.8 + 0.02));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, e = c + 1;
    idx.push(a, c, b, b, c, e);
  }
  if (o.tip !== false) {   // закрыть кончик конусом
    const tp = P[n - 1].clone().addScaledVector(T[n - 1], rads[n - 1] * 0.8), ti = pos.length / 3;
    pos.push(tp.x, tp.y, tp.z); nor.push(T[n - 1].x, T[n - 1].y, T[n - 1].z); uv.push(L + rads[n - 1], 0);
    for (let j = 0; j < seg; j++) { const a = (n - 1) * (seg + 1) + j; idx.push(a, ti, a + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  k.add(g, I4, { pat: PAT.bark, flatUv: false, ownUv: [1, 1], jitter: 0, ...o });
  return { P, T, L };
}

// Кривая ветвь: шаги с отклонением (wob) и тягой вверх (up) или вниз (droop)
function path(k, start, dir, len, n, wob, up = 0) {
  const pts = [start.slice()], d = V(dir).normalize(), p = V(start);
  for (let i = 1; i <= n; i++) {
    d.x += k.rr(-wob, wob); d.y += k.rr(-wob, wob) * 0.6 + up; d.z += k.rr(-wob, wob); d.normalize();
    p.addScaledVector(d, len / n); pts.push([p.x, p.y, p.z]);
  }
  return pts;
}
const lerpPt = (pts, t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
const radsOf = (n, r0, r1) => Array.from({ length: n }, (_, i) => r0 + (r1 - r0) * Math.pow(i / (n - 1), 0.8));

// Сфера-многогранник со склеенными вершинами: после шума остаётся цельной, нормали гладкие (не гранёный камень)
function blob(r, detail) {
  const g = new THREE.IcosahedronGeometry(r, detail), P = g.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < P.count; i++) {
    const key = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4);
    let j = map.get(key); if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(P.getX(i), P.getY(i), P.getZ(i)); }
    idx.push(j);
  }
  g.dispose();
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setIndex(idx);
  return m;
}
// Гроздь листвы: бугристое «облако» (шум крупный + мелкий — рваный край), низ приплюснут
function clump(k, x, y, z, r, color, o = {}) {
  const g = blob(r, k.lod ? 0 : o.detail ?? 1);
  lumpify(g, r * (o.amp ?? 0.2), 1.3 / r, k.rand() * 10, false);
  if (!k.lod && o.fine !== false) lumpify(g, r * 0.09, 4.5 / r, k.rand() * 10, false); else k.rand();
  g.scale(o.sx ?? 1, o.sy ?? 0.78, o.sz ?? 1);
  g.computeVertexNormals();
  k.add(g, k.mat(x, y, z, k.rr(-0.3, 0.3), k.rand() * 6.28, k.rr(-0.3, 0.3)), { pat: PAT.leaf, color, sway: o.sway ?? 0.01, jitter: 0 });
}
// Гроздь из отдельных листьев (ромбики со сгибом) вокруг тёмного ядра: рваный силуэт, просветы, листья видны.
// Нормали листьев — от центра грозди (мягкая объёмная светотень всей грозди, а не рябь от каждого листка).
function leafClump(k, x, y, z, r, color, o = {}) {
  const core = o.core !== false;
  if (k.lod && core) { sub(k); return clump(k, x, y, z, r * 0.85, color, o); }
  const R = sub(k), far = k.lod ? 1 : 0, n = Math.round((o.n ?? 36) * (far ? 0.16 : 1)), ls = (o.leaf ?? 0.22) * (far ? 2.6 : 1), sy = o.sy ?? 0.8, droop = o.droop ?? 0;   // вдали — меньше, но крупнее листья
  if (core) clump(k, x, y, z, r * 0.64, tint(color, 0, -0.03), { ...o, sway: (o.sway ?? 0.01) * 0.8, amp: 0.22, fine: false, detail: o.core ?? 1 }); else { k.rand(); k.rand(); k.rr(0, 1); k.rr(0, 1); k.rr(0, 1); k.rand(); }
  const pos = [], nor = [], C = new THREE.Vector3(x, y, z);
  for (let i = 0; i < n; i++) {
    // точка на оболочке (с толщиной), обвисшие пряди тянутся вниз
    const u = R(-1, 1), a = R(0, 6.283), sq = Math.sqrt(1 - u * u), rr = r * (core ? 0.6 + 0.22 * Math.sqrt(R()) : 0.25 + 0.75 * Math.cbrt(R()));   // листья облегают ядро, редкие торчат
    const d = new THREE.Vector3(sq * Math.cos(a), u * sy, sq * Math.sin(a));
    const c = C.clone().addScaledVector(d, rr); c.y -= droop * Math.max(0, -u) * r;
    const nrm = d.clone().normalize();
    // плоскость листа: ось — наружу и вбок с наклоном вниз, ширина — поперёк
    const ax = new THREE.Vector3(R(-1, 1), R(-0.8, 0.2), R(-1, 1)).addScaledVector(nrm, 0.8).normalize();
    const w = new THREE.Vector3().crossVectors(ax, nrm).normalize();
    const L = ls * R(0.75, 1.25), W = L * R(0.35, 0.5), fold = nrm.clone().multiplyScalar(L * 0.12);
    const p0 = c.clone().addScaledVector(ax, -L * 0.5), p1 = c.clone().addScaledVector(ax, L * 0.5);
    const pl = c.clone().addScaledVector(w, -W).sub(fold), pr = c.clone().addScaledVector(w, W).sub(fold);   // края чуть отогнуты — лист «сложен» по жилке
    for (const q of [p0, pl, p1, p0, p1, pr]) { pos.push(q.x, q.y, q.z); const nn = q.clone().sub(C).normalize().lerp(nrm, 0.5).normalize(); nor.push(nn.x, nn.y, nn.z); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  k.add(g, I4, { pat: PAT.leafCard, color, sway: o.sway ?? 0.01, jitter: 0 });
}
// сдвиг тона и светлоты в sRGB (в линейном цвете тёмная зелень от -0.05 уходила в чёрное)
const _h = {};
const tint = (hex, h, l) => { const c = new THREE.Color(hex); c.getHSL(_h, THREE.SRGBColorSpace); return c.setHSL(_h.h + h, _h.s, Math.min(1, Math.max(0.02, _h.l + l)), THREE.SRGBColorSpace).getHex(); };

// Корни-лапы у комля: уходят в землю
function roots(k, x, y, z, r, n, col) {
  const R = sub(k);
  if (k.lod) return;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283 + R(-0.3, 0.3), L = r * R(2.2, 3.4);
    const p = [[x + Math.cos(a) * r * 0.5, y + r * 1.1, z + Math.sin(a) * r * 0.5], [x + Math.cos(a) * L * 0.55, y + r * 0.25, z + Math.sin(a) * L * 0.55], [x + Math.cos(a) * L, y - r * 0.4, z + Math.sin(a) * L]];
    tube(k, [p[0], p[2]], [r * 0.5, r * 0.16], { seg: 4, color: col, sway: 0, bump: 0.08 });
  }
}

// Ярус ели: «звезда» из острых лап — зубцы с ребром (два ската), кончики свисают; вернуть кончики (для шишек)
function sprTier(k, x, y, z, R, h, teeth, droop, color, rot) {
  const pos = [], tips = [], rr = sub(k);
  if (!teeth) { k.rand(); return tips; }
  const ap = [x, y + h, z];
  const nt = [], tp = [];
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i / teeth) * 6.283 + rr(-0.12, 0.12), an = rot + ((i + 0.5) / teeth) * 6.283;
    const rt = R * rr(0.82, 1.12), rn = R * rr(0.42, 0.55);
    tp.push([x + Math.cos(a) * rt, y - droop * rt * rr(0.7, 1.2), z + Math.sin(a) * rt]);
    nt.push([x + Math.cos(an) * rn, y + h * 0.18, z + Math.sin(an) * rn]);
  }
  for (let i = 0; i < teeth; i++) {
    const t = tp[i], np = nt[(i + teeth - 1) % teeth], nn = nt[i];
    pos.push(...ap, ...np, ...t, ...ap, ...t, ...nn);
    tips.push(t);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  k.add(g, I4, { pat: PAT.needles, color, sway: 0.006, jitter: 0 });
  k.rand();
  return tips;
}

export function buildTree(k, kind, x, y, z, s) {
  k.swayBase = y; k.sway = 0;
  if (kind === 'spruce') {
    const H = (7 + k.rr(0, 5)) * s, lean = [k.rr(-0.04, 0.04), 0, k.rr(-0.04, 0.04)];
    const trunk = [[x, y - 0.2, z], [x + lean[0] * H * 0.3, y + H * 0.35, z + lean[2] * H * 0.3], [x + lean[0] * H * 0.7, y + H * 0.75, z + lean[2] * H * 0.7]];
    tube(k, trunk, [0.24 * s, 0.15 * s, 0.05 * s], { seg: 6, color: 0x4a3628, sway: 0.002 });
    roots(k, x, y, z, 0.16 * s, 4, 0x4a3628);
    const g = k.pick([0x1f4a40, 0x245a48, 0x2c5a3c, 0x1d3f3a, 0x2f5a30]);
    // ярусы густо, внахлёст: нижние широкие и обвисшие, верхние короткие и задранные; вблизи — по две «звезды» на ярус
    const tiers = (k.lod ? 5 : 8) + Math.round(H / s / (k.lod ? 3 : 1.8)), y0 = y + k.rr(0.7, 1.2) * s;
    const top = [];
    for (let i = 0; i < tiers; i++) {
      const f = i / (tiers - 1), R = (1 - f * 0.88) * 2.5 * s * k.rr(0.9, 1.08) + 0.15 * s;
      const yy = y0 + Math.pow(f, 0.92) * (H - (y0 - y) - 1.0 * s), cx = x + lean[0] * (yy - y), cz = z + lean[2] * (yy - y);
      const col = tint(g, k.rr(-0.006, 0.006), (f - 0.5) * 0.12 + k.rr(-0.025, 0.025)), rot = k.rand() * 6.28, nT = k.lod ? 7 : Math.max(8, Math.round(8 + R / s * 2));
      const tips = sprTier(k, cx, yy, cz, R, R * 0.8, nT, 0.5 - f * 0.4, col, rot);
      const t2 = sprTier(k, cx, yy + R * 0.22, cz, R * 0.8, R * 0.7, k.lod ? 0 : nT, 0.42 - f * 0.35, tint(col, 0, 0.03), rot + Math.PI / nT);
      if (f > 0.5) top.push(...tips, ...t2);
    }
    // макушка-свеча
    const tx = x + lean[0] * H, tz = z + lean[2] * H;
    k.cone(tx, y + H - 0.95 * s, tz, 0.16 * s, 1.3 * s, { color: tint(g, 0, 0.04), pat: PAT.needles, seg: 5, sway: 0.008 });
    // шишки: висят гроздьями с кончиков верхних лап
    const cr = sub(k);
    if (!k.lod && cr() < 0.6) for (let i = 0, nn = 2 + Math.floor(cr() * 4); i < nn && top.length; i++) {
      const t = top[Math.floor(cr() * top.length)];
      k.lathe(t[0], t[1] - 0.24 * s, t[2], [[0.001, 0], [0.055 * s, 0.07 * s], [0.045 * s, 0.2 * s], [0.012 * s, 0.25 * s]], { seg: 5, color: [0x7a4a2a, 0x8a5630, 0x6a3e26][Math.floor(cr() * 3)], pat: PAT.scales, sway: 0.006 });
    }
  } else if (kind === 'pine') {
    // сосна: высокий кривой рыжий ствол, внизу серый, крона — плоские облака на сучьях наверху
    const H = (9 + k.rr(0, 5)) * s;
    const pts = path(k, [x, y - 0.2, z], [k.rr(-0.1, 0.1), 1, k.rr(-0.1, 0.1)], H, 7, 0.09, 0.02);
    const tr = tube(k, pts, radsOf(8, 0.24 * s, 0.07 * s), { seg: 7, color: 0xa25c34, sway: 0.003 });
    tube(k, pts.slice(0, 3), [0.255 * s, 0.215 * s, 0.17 * s], { seg: 7, color: 0x5a4a40, sway: 0.002, tip: false, bump: 0.18 });  // старая серая кора у комля
    roots(k, x, y, z, 0.17 * s, 4, 0x5a4a40);
    for (let i = 0; i < 3; i++) { const p = lerpPt(pts, k.rr(0.3, 0.55)), a = k.rand() * 6.28; tube(k, path(k, p, [Math.cos(a), 0.2, Math.sin(a)], k.rr(0.4, 0.8) * s, 2, 0.2), [0.03 * s, 0.012 * s, 0.006 * s], { seg: 4, color: 0x4a3426, sway: 0.004 }); }  // сухие сучки
    const nb = 4 + Math.floor(k.rand() * 3);
    for (let i = 0; i < nb; i++) {
      const t = 0.62 + i / nb * 0.34, p = lerpPt(pts, t), a = i * 2.4 + k.rr(-0.4, 0.4), L = (2.6 - t * 1.6) * s * k.rr(0.8, 1.2);
      const bp = path(k, p, [Math.cos(a), k.rr(0.15, 0.5), Math.sin(a)], L, 3, 0.25, 0.05);
      tube(k, bp, [0.08 * s, 0.05 * s, 0.03 * s, 0.015 * s], { seg: 5, color: 0x8a5030, sway: 0.006 });
      const e = bp[bp.length - 1];
      for (let j = 0; j < 3; j++) clump(k, e[0] + k.rr(-0.7, 0.7) * s, e[1] + 0.1 * s + j * 0.15 * s, e[2] + k.rr(-0.7, 0.7) * s, k.rr(0.9, 1.25) * s, tint(k.pick([0x2a4a34, 0x34583a, 0x2e5040]), 0, k.rr(-0.03, 0.03)), { sy: 0.5, sway: 0.008 });
    }
    const e = tr.P[tr.P.length - 1]; clump(k, e.x, e.y, e.z, 1.1 * s, 0x34583a, { sy: 0.6 });
  } else if (kind === 'oak') {
    // дуб: толстый кривой короткий ствол с наплывами, лапы-корни, раскидистые узловатые сучья, крона гроздьями с просветами
    const H = (3.2 + k.rr(0, 1.4)) * s, R0 = 0.55 * s;
    const pts = path(k, [x, y - 0.3, z], [k.rr(-0.15, 0.15), 1, k.rr(-0.15, 0.15)], H, 4, 0.18, 0);
    tube(k, pts, [R0 * 1.15, R0 * 0.9, R0 * 0.8, R0 * 0.72, R0 * 0.62], { seg: 9, color: 0x4e4236, sway: 0.001, bump: 0.22 });
    roots(k, x, y, z, R0 * 0.75, 5, 0x4e4236);
    const leafC = k.pick([0x3a5a2a, 0x46602c, 0x4a5a26, 0x3a5230]); k.rand();
    const nb = 5 + Math.floor(k.rand() * 3), top = pts[pts.length - 1];
    for (let i = 0; i < nb; i++) {
      const a = i / nb * 6.283 + k.rr(-0.35, 0.35), t = k.rr(0.65, 1), p = lerpPt(pts, t);
      const L = k.rr(3.2, 4.8) * s, up = k.rr(0.25, 0.75);
      const bp = path(k, p, [Math.cos(a), up, Math.sin(a)], L, 4, 0.32, -0.02);
      tube(k, bp, [R0 * 0.48, R0 * 0.36, R0 * 0.26, R0 * 0.16, R0 * 0.07], { seg: 6, color: 0x544638, sway: 0.003 });
      // ответвления и листва на концах — не сплошной шар: между гроздьями видно небо и сучья
      for (let j = 0; j < 2; j++) {
        const q = lerpPt(bp, k.rr(0.45, 0.8)), b2 = j ? a + k.rr(0.5, 1.1) : a - k.rr(0.5, 1.1);
        const sp = path(k, q, [Math.cos(b2), k.rr(0.2, 0.7), Math.sin(b2)], k.rr(1.2, 2) * s, 3, 0.35, 0.02);
        tube(k, sp, [R0 * 0.14, R0 * 0.09, R0 * 0.05, R0 * 0.025], { seg: 5, color: 0x544638, sway: 0.005 });
        const e = sp[sp.length - 1];
        if (k.rand() < 0.85) leafClump(k, e[0], e[1] + 0.2 * s, e[2], k.rr(0.9, 1.3) * s, tint(leafC, k.rr(-0.015, 0.02), k.rr(-0.05, 0.05)), { sway: 0.009, n: 60, leaf: 0.2 });
      }
      const e = bp[bp.length - 1];
      leafClump(k, e[0], e[1] + 0.25 * s, e[2], k.rr(1.2, 1.7) * s, tint(leafC, 0, k.rr(-0.04, 0.06)), { sway: 0.01, n: 90, leaf: 0.22 });
      const m = lerpPt(bp, 0.55);
      if (k.rand() < 0.5) leafClump(k, m[0], m[1] + 0.9 * s, m[2], k.rr(1, 1.4) * s, tint(leafC, 0, -0.05), { sway: 0.008, n: 64, leaf: 0.2 });
    }
    leafClump(k, top[0], top[1] + 1.4 * s, top[2], 1.6 * s, tint(leafC, 0, 0.04), { sway: 0.008, n: 96, leaf: 0.22 });
    // жёлуди-подсказки: пара ржавых листьев на траве под кроной не нужна — хватает трав рядом
  } else if (kind === 'birch') {
    // берёза: 1–3 тонких изогнутых ствола из одного корня, чёрные чечевички, плакучие пряди
    const nt = k.rand() < 0.45 ? 2 + Math.floor(k.rand() * 2) : 1;
    const col = k.pick([0xd9a23a, 0xe0b84a, 0xc8782e, 0xb8502a, 0x9aa03a, 0xd8c050]);
    for (let ti = 0; ti < nt; ti++) {
      const a = ti / nt * 6.283 + k.rr(0, 1), sp = nt > 1 ? 0.18 : 0.05, H = (5 + k.rr(0, 2.5)) * s * (ti ? 0.85 : 1);
      const pts = path(k, [x + Math.cos(a) * 0.08 * s, y - 0.2, z + Math.sin(a) * 0.08 * s], [Math.cos(a) * sp, 1, Math.sin(a) * sp], H, 6, 0.06, 0.01);
      const R = 0.12 * s * (ti ? 0.8 : 1);
      const tr = tube(k, pts, radsOf(7, R, R * 0.3), { seg: 6, color: 0xe2ded0, pat: PAT.bone, sway: 0.004, bump: 0.05 });
      // чечевички: тёмные дуги, плотно на коре (часть трубки чуть толще, по дуге 100–160°)
      const lr = sub(k);
      for (let i = 0, nl = k.lod ? 0 : 5; i < nl; i++) {
        const t = lr(0.05, 0.7), c = lerpPt(pts, t), d = lerpPt(pts, Math.min(1, t + 0.02));
        const rr = R * (1 - t * 0.6) * 1.06 + 0.004, a0 = lr() * 6.28, span = lr(1.6, 2.8), seg = 5;
        const ax = V(d).sub(V(c)).normalize(), ex = new THREE.Vector3(0, 1, 0).cross(ax); if (ex.lengthSq() < 1e-4) ex.set(1, 0, 0); ex.normalize(); const ey = new THREE.Vector3().crossVectors(ax, ex);
        const pos = [], hh = lr(0.025, 0.05) * s;
        for (let j = 0; j < seg; j++) {
          const a1 = a0 + span * j / seg, a2 = a0 + span * (j + 1) / seg;
          const p1 = V(c).addScaledVector(ex, Math.cos(a1) * rr).addScaledVector(ey, Math.sin(a1) * rr), p2 = V(c).addScaledVector(ex, Math.cos(a2) * rr).addScaledVector(ey, Math.sin(a2) * rr);
          const q1 = p1.clone().addScaledVector(ax, hh), q2 = p2.clone().addScaledVector(ax, hh * (0.4 + 0.6 * Math.sin((j + 1) / seg * 3.14)));
          pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, q1.x, q1.y, q1.z, q1.x, q1.y, q1.z, p2.x, p2.y, p2.z, q2.x, q2.y, q2.z);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
        k.add(g, I4, { pat: PAT.dark, color: 0x2a2624, sway: 0.004, jitter: 0 });
      }
      const nb = 4;
      for (let i = 0; i < nb; i++) {
        const t = 0.5 + i / nb * 0.45, p = lerpPt(pts, t), b = i * 2.3 + a;
        const bp = path(k, p, [Math.cos(b), 0.6, Math.sin(b)], k.rr(0.9, 1.6) * s, 3, 0.25, -0.06);
        tube(k, bp, [R * 0.35, R * 0.22, R * 0.12, R * 0.06], { seg: 4, color: 0x5a4a40, sway: 0.006 });
        for (let j = 0; j < 2; j++) { const e = lerpPt(bp, 0.55 + j * 0.4); leafClump(k, e[0], e[1] - (0.1 + j * 0.12) * s, e[2], k.rr(0.45, 0.7) * s * (ti ? 0.85 : 1), tint(col, k.rr(-0.02, 0.02), k.rr(-0.07, 0.07)), { sy: 1.25, sway: 0.012, n: 80, leaf: 0.14, droop: 0.6, core: false }); }   // плакучие пряди
      }
      const e = tr.P[tr.P.length - 1]; leafClump(k, e.x, e.y - 0.2 * s, e.z, 0.75 * s, tint(col, 0, 0.04), { sway: 0.012, n: 80, leaf: 0.14, core: false });
    }
  } else if (kind === 'dead') {
    // сухостой: кривой серый ствол с обломанной вершиной, голые сучья, кора отстаёт
    const H = (4.5 + k.rr(0, 2.5)) * s;
    const pts = path(k, [x, y - 0.2, z], [k.rr(-0.15, 0.15), 1, k.rr(-0.15, 0.15)], H, 5, 0.14, 0);
    tube(k, pts, radsOf(6, 0.22 * s, 0.11 * s), { seg: 6, color: 0x4a423a, sway: 0.002, bump: 0.2 });
    const e = pts[pts.length - 1], d = V(e).sub(V(pts[pts.length - 2])).normalize();
    // обломанный щепастый торец
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + k.rr(-0.3, 0.3); k.cone(e[0] + Math.cos(a) * 0.06 * s, e[1] - 0.05, e[2] + Math.sin(a) * 0.06 * s, 0.05 * s, k.rr(0.25, 0.55) * s, { color: 0x8a7a66, seg: 3, rx: d.z * 0.8 + k.rr(-0.2, 0.2), rz: -d.x * 0.8 + k.rr(-0.2, 0.2), sway: 0.002 }); }
    roots(k, x, y, z, 0.15 * s, 3, 0x4a423a);
    for (let i = 0; i < 5; i++) {
      const p = lerpPt(pts, k.rr(0.35, 0.85)), a = k.rand() * 6.28;
      const bp = path(k, p, [Math.cos(a), k.rr(-0.1, 0.6), Math.sin(a)], k.rr(0.8, 2) * s, 3, 0.35, 0.03);
      tube(k, bp, [0.06 * s, 0.04 * s, 0.025 * s, 0.01 * s], { seg: 4, color: 0x4a423a, sway: 0.004 });
    }
  } else {
    // пень с корнями и опятами, рядом бывает упавший ствол
    tube(k, [[x, y - 0.15, z], [x, y + 0.2 * s, z], [x + 0.02, y + 0.45 * s, z]], [0.36 * s, 0.32 * s, 0.3 * s], { seg: 9, color: 0x5a4434, tip: false, bump: 0.15 });
    k.cyl(x + 0.02, y + 0.42 * s, z, 0.29 * s, 0.04, { color: 0x8a6a48, pat: PAT.logs, seg: 9 });
    roots(k, x, y, z, 0.2 * s, 4, 0x5a4434);
    for (let i = 0; i < 5; i++) { const a = k.rr(-0.8, 0.8); k.lathe(x + Math.sin(a) * 0.33 * s, y + k.rr(0.05, 0.3) * s, z + Math.cos(a) * 0.33 * s, [[0.004, 0], [0.012, 0.06], [0.05, 0.075], [0.06, 0.09], [0.001, 0.11]], { seg: 6, color: 0xc89a5a, pat: PAT.clay }); }
    if (k.rand() < 0.35) { const a = k.rand() * 6.28, L = 3.2 * s; const p0 = [x + Math.cos(a) * 0.6, y + 0.16 * s, z + Math.sin(a) * 0.6]; tube(k, [p0, [p0[0] + Math.cos(a) * L * 0.5, y + 0.14 * s, p0[2] + Math.sin(a) * L * 0.5], [p0[0] + Math.cos(a) * L, y + 0.1 * s, p0[2] + Math.sin(a) * L]], [0.2 * s, 0.17 * s, 0.13 * s], { seg: 7, color: 0x5a4434 }); }
  }
}
