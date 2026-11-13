// Деревья как в деревне (порт trees.gd из Godot, стиль «Видео»): ель — ярусы-«звёзды» из острых лап с ребром,
// под каждым ярусом тёмная юбка из коротких лап и бахрома свисающих пучков хвои; хвоя — штрихами (текстура ёлочкой).
// Сосна — рыжий кривой ствол, крона плоскими подушками с веерами хвои. Берёза — белый ствол с чёрными чечевичками,
// крона из листовых карточек (жёлтая и зелёная). Всё в единицах «метры», дерево собирается один раз и ставится инстансами.
import * as THREE from 'three';
import { canvasTex, cylUV, mergeGeometries } from './kit.js';

let _s = 1;
const rnd = () => ((_s = (_s * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + (b - a) * rnd();
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// хвоя ёлочкой: от средней жилки (u = 0.5) к краям, к кончику (v = 0) гуще
export const needleTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = 'rgb(150,150,150)'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    const v = Math.random(), side = Math.random() < 0.5 ? -1 : 1;
    const x0 = w / 2 + side * Math.random() * 6, y0 = v * h;
    const L = 10 + Math.random() * 22, a = 0.55 + Math.random() * 0.35;
    const x1 = x0 + side * Math.sin(a) * L, y1 = y0 - Math.cos(a) * L;
    const lt = Math.random();
    g.strokeStyle = lt < 0.45 ? `rgba(60,60,60,${0.5 + Math.random() * 0.4})` : lt < 0.8 ? `rgba(215,215,215,${0.4 + Math.random() * 0.4})` : 'rgba(255,255,255,0.7)';
    g.lineWidth = 1 + Math.random() * 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.strokeStyle = 'rgba(70,55,40,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
});
export const birchTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#e6e1d2'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(30,28,26,${0.6 + Math.random() * 0.4})`; const y = Math.random() * h, x = Math.random() * w, L = 6 + Math.random() * 30; g.fillRect(x, y, L, 1.5 + Math.random() * 3); }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(150,140,120,0.35)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 8, 8 + Math.random() * 20); }
});

// построитель: треугольники с нормалью «наружу и вверх», uv и цветом вершины
class TB {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  tri(a, b, c, ua, ub, uc, col, axis) {
    for (const [v, u] of [[a, ua], [b, ub], [c, uc]]) {
      this.p.push(v.x, v.y, v.z); this.uv.push(u[0], u[1]); this.c.push(col.r, col.g, col.b);
      const n = V(v.x - axis.x, 0, v.z - axis.z); const l = n.length() || 1; n.multiplyScalar(1 / l); n.y = 0.65; n.normalize();
      this.n.push(n.x, n.y, n.z);
    }
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}
const tint = (c, dl) => new THREE.Color(c).offsetHSL(0, 0, dl);

// ярус-«звезда»: зубцы с ребром, кончики свисают
function tier(b, x, y, z, R, h, teeth, droop, col, rot, axis) {
  const ap = V(x, y + h, z), tp = [], nt = [];
  for (let i = 0; i < teeth; i++) {
    const a = rot + i / teeth * 6.283 + rr(-0.12, 0.12), an = rot + (i + 0.5) / teeth * 6.283;
    const rt = R * rr(0.82, 1.12), rn = R * rr(0.42, 0.55);
    tp.push(V(x + Math.cos(a) * rt, y - droop * rt * rr(0.7, 1.2), z + Math.sin(a) * rt));
    nt.push(V(x + Math.cos(an) * rn, y + h * 0.18, z + Math.sin(an) * rn));
  }
  for (let i = 0; i < teeth; i++) {
    const t = tp[i], np = nt[(i + teeth - 1) % teeth], nn = nt[i], c = tint(col, rr(-0.02, 0.02));
    b.tri(ap, np, t, [0.5, 1], [0, 0.55], [0.5, 0], c, axis);
    b.tri(ap, t, nn, [0.5, 1], [0.5, 0], [1, 0.55], c, axis);
  }
  return tp;
}
// юбка: тёмные короткие лапы под ярусом и бахрома свисающих пучков на кончиках
function skirt(b, x, y, z, R, h, teeth, droop, col, rot, tips, axis) {
  const nt = teeth * 2, ap = V(x, y + h * 0.55, z), tp = [], nn = [];
  for (let i = 0; i < nt; i++) {
    const a = rot + (i + 0.5) / nt * 6.283 + rr(-0.1, 0.1), an = rot + (i + 1) / nt * 6.283;
    const rt = R * rr(0.78, 0.98), rn = R * rr(0.5, 0.62);
    tp.push(V(x + Math.cos(a) * rt, y - h * 0.12 - droop * rt * rr(0.9, 1.4), z + Math.sin(a) * rt));
    nn.push(V(x + Math.cos(an) * rn, y + h * 0.05, z + Math.sin(an) * rn));
  }
  const dc = tint(col, -0.06);
  for (let i = 0; i < nt; i++) {
    const t = tp[i], np = nn[(i + nt - 1) % nt], nx = nn[i];
    b.tri(ap, np, t, [0.5, 1], [0, 0.55], [0.5, 0], dc, axis); b.tri(ap, t, nx, [0.5, 1], [0.5, 0], [1, 0.55], dc, axis);
  }
  const fc = tint(col, 0.05);
  for (const t of tips) {
    const out = V(t.x - x, 0, t.z - z).normalize(), side = V(-out.z, 0, out.x);
    for (let j = 0; j < 2; j++) {
      const bq = t.clone().addScaledVector(out, -R * 0.08).addScaledVector(side, (j - 0.5) * R * 0.1);
      const tip = bq.clone().add(out.clone().multiplyScalar(0.35).add(V(0, -1, 0)).addScaledVector(side, rr(-0.3, 0.3)).normalize().multiplyScalar(R * rr(0.14, 0.24)));
      const wv = side.clone().multiplyScalar(R * 0.035);
      b.tri(bq.clone().sub(wv), bq.clone().add(wv), tip, [0, 1], [1, 1], [0.5, 0], fc, axis);
    }
  }
}

// ель высотой H (м); основание в (0,0,0). kind: 0 густая обвислая, 1 узкая высокая, 2 редкая старая
export function spruceGeo(seed, kind = 0) {
  _s = seed * 7919 + 13;
  const b = new TB(), axis = V(0, 0, 0);
  const H = kind === 1 ? 16 : 13, Rw = kind === 1 ? 2.2 : kind === 2 ? 2.9 : 3.1;
  const base = new THREE.Color([0x1f4a40, 0x245a48, 0x2c5a3c, 0x1d3f3a, 0x2f5a30][seed % 5]);
  const lean = [rr(-0.03, 0.03), rr(-0.03, 0.03)];
  const tiers = 9 + Math.round(H / 1.8);
  const y0 = rr(0.9, 1.4);
  for (let i = 0; i < tiers; i++) {
    if (kind === 2 && i > 1 && i < tiers - 3 && rnd() < 0.25) continue;      // старая ель: прорехи
    const f = i / (tiers - 1);
    const R = (1 - f * 0.88) * Rw * rr(0.9, 1.08) + 0.15;
    const yy = y0 + Math.pow(f, 0.92) * (H - y0 - 1.0);
    const cx = lean[0] * yy, cz = lean[1] * yy;
    const col = tint(base, (f - 0.5) * 0.1 + rr(-0.02, 0.02));
    const rot = rnd() * 6.28, nT = Math.max(8, Math.round(8 + R * 2.0));
    const droop = 0.5 - f * 0.4;
    const tips = tier(b, cx, yy, cz, R, R * 0.8, nT, droop, col, rot, V(cx, 0, cz));
    tier(b, cx, yy + R * 0.22, cz, R * 0.8, R * 0.7, nT, 0.42 - f * 0.35, tint(col, 0.03), rot + Math.PI / nT, V(cx, 0, cz));
    skirt(b, cx, yy, cz, R, R * 0.8, nT, droop, col, rot, tips, V(cx, 0, cz));
  }
  // макушка-свеча
  const tx = lean[0] * H, tz = lean[1] * H, tc = tint(base, 0.04);
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, a2 = (i + 1) / 5 * 6.283, r = 0.16; b.tri(V(tx, H + 0.3, tz), V(tx + Math.cos(a) * r, H - 1.0, tz + Math.sin(a) * r), V(tx + Math.cos(a2) * r, H - 1.0, tz + Math.sin(a2) * r), [0.5, 0], [0, 1], [1, 1], tc, V(tx, 0, tz)); }
  const g = b.geo(); g.userData = { H, R: Rw };
  return g;
}

// сосна: рыжий ствол (отдельно), плоские подушки хвои на сучьях наверху
export function pineGeo(seed) {
  _s = seed * 3571 + 7;
  const b = new TB(), bark = [];
  const H = rr(14, 18);
  const top = V(rr(-0.6, 0.6), H, rr(-0.6, 0.6));
  const pts = [V(0, -0.3, 0), V(top.x * 0.25, H * 0.35, top.z * 0.25), V(top.x * 0.7, H * 0.75, top.z * 0.7), top];
  const curve = new THREE.CatmullRomCurve3(pts);
  const tg = new THREE.TubeGeometry(curve, 12, 0.32, 7, false); { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 - y / H * 0.75; const c = curve.getPoint(Math.min(1, Math.max(0, y / H))); p.setX(i, c.x + (p.getX(i) - c.x) * k); p.setZ(i, c.z + (p.getZ(i) - c.z) * k); } tg.computeVertexNormals(); }
  bark.push(cylUV(tg, H, 0.3, true));
  const nb = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < nb; i++) {
    const t = 0.62 + i / nb * 0.34, p = curve.getPoint(t), a = i * 2.4 + rr(-0.4, 0.4), L = (2.6 - t * 1.6) * rr(0.9, 1.3);
    const e = p.clone().add(V(Math.cos(a) * L, rr(0.3, 0.9), Math.sin(a) * L));
    bark.push(cylUV(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().lerp(e, 0.5).add(V(0, 0.3, 0)), e]), 4, 0.07, 5, false), L, 0.07, true));
    for (let j = 0; j < 3; j++) {
      const C = e.clone().add(V(rr(-0.7, 0.7), 0.1 + j * 0.15, rr(-0.7, 0.7))), r = rr(0.9, 1.3);
      const col = tint(new THREE.Color([0x2a4a34, 0x34583a, 0x2e5040][Math.floor(rnd() * 3)]), rr(-0.03, 0.03));
      // подушка: плоский многоугольник-полка (две) + веер пучков хвои
      for (let s = 0; s < 2; s++) {
        const cy = C.y + 0.12 * r + s * 0.22 * r, n = 9, rs = r * rr(0.7, 0.85);
        for (let k = 0; k < n; k++) { const a1 = k / n * 6.283, a2 = (k + 1) / n * 6.283, q1 = rs * rr(0.8, 1.1), q2 = rs * rr(0.8, 1.1); b.tri(V(C.x, cy + 0.2 * r, C.z), V(C.x + Math.cos(a1) * q1, cy - 0.1 * r, C.z + Math.sin(a1) * q1), V(C.x + Math.cos(a2) * q2, cy - 0.1 * r, C.z + Math.sin(a2) * q2), [0.5, 1], [0, 0], [1, 0], tint(col, s * 0.04), C); }
      }
      for (let k = 0; k < 26; k++) {
        const a2 = rr(0, 6.28), up = rr(-0.5, 0.9);
        const bq = C.clone().add(V(Math.cos(a2) * r * rr(0.55, 0.85), up * r * 0.4, Math.sin(a2) * r * rr(0.55, 0.85)));
        let out = V(Math.cos(a2), 0.35 + up * 0.5, Math.sin(a2)).normalize(); if (up < -0.2) out = V(Math.cos(a2) * 0.6, -0.8, Math.sin(a2) * 0.6).normalize();
        const side = V(-Math.sin(a2), 0, Math.cos(a2)), L2 = r * rr(0.35, 0.6);
        for (let f = 0; f < 3; f++) { const dir = out.clone().addScaledVector(side, (f - 1) * 0.45).normalize(); const tip = bq.clone().addScaledVector(dir, L2); const wv = side.clone().multiplyScalar(L2 * 0.07); b.tri(bq.clone().sub(wv), bq.clone().add(wv), tip, [0, 1], [1, 1], [0.5, 0], tint(col, 0.04), C); }
      }
    }
  }
  return { needles: b.geo(), bark: mergeGeometries(bark, false) };
}

// берёза: белый ствол с чечевичками, крона — листовые карточки (часть жёлтая)
export function birchGeo(seed, autumn = 0.5) {
  _s = seed * 911 + 3;
  const b = new TB(), H = rr(9, 12);
  const top = V(rr(-0.8, 0.8), H, rr(-0.8, 0.8));
  const curve = new THREE.CatmullRomCurve3([V(0, -0.2, 0), V(top.x * 0.2, H * 0.4, top.z * 0.2), V(top.x * 0.7, H * 0.8, top.z * 0.7), top]);
  const trunk = cylUV(new THREE.TubeGeometry(curve, 10, 0.16, 7, false), H, 0.16, true);
  const green = new THREE.Color('#6a8a3a'), gold = new THREE.Color('#c99a2e');
  for (let i = 0; i < 9; i++) {
    const C = curve.getPoint(rr(0.45, 1)).add(V(rr(-1.6, 1.6), rr(-0.3, 1.2), rr(-1.6, 1.6))), r = rr(1.0, 1.6);
    for (let k = 0; k < 60; k++) {
      const d = V(rr(-1, 1), rr(-0.8, 0.7), rr(-1, 1)); if (d.length() > 1) continue;
      const q = C.clone().addScaledVector(d, r), ax = V(rr(-1, 1), rr(-1, -0.2), rr(-1, 1)).normalize(), w = V(-ax.z, 0, ax.x).normalize().multiplyScalar(0.07);
      const col = (rnd() < autumn ? gold : green).clone().offsetHSL(rr(-0.02, 0.02), 0, rr(-0.05, 0.05));
      b.tri(q.clone().sub(w), q.clone().add(w), q.clone().addScaledVector(ax, 0.22), [0, 1], [1, 1], [0.5, 0], col, C);
      b.tri(q.clone().add(w), q.clone().sub(w), q.clone().addScaledVector(ax, -0.08), [1, 1], [0, 1], [0.5, 0.6], col, C);
    }
  }
  return { leaves: b.geo(), trunk };
}
