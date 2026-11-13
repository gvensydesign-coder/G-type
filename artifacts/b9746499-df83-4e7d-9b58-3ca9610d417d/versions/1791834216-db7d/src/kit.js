// Kit: набор процедурных деталей для зданий. Каждая деталь несёт цвет, фактуру, этап стройки
// и вид (обычная / леса / разметка), а в конце всё сливается в одну BufferGeometry.
// Оси здания: x вправо, z к фасаду (фасад смотрит на +z), y вверх, (0,0,0) = центр пятна на земле.
import * as THREE from 'three';

// Фактуры (номер передаётся в шейдер, см. toon.js)
export const PAT = {
  plain: 0, logs: 1, planks: 2, shingles: 3, stone: 4, thatch: 5, glow: 6, gold: 7,
  cloth: 8, logEnds: 9, grass: 10, road: 11, earth: 12, bone: 13, rune: 14, fire: 15, dark: 16,
  bark: 17, rings: 18, carved: 19, scales: 20,
};
// Виды деталей
export const KIND = { normal: 0, scaffold: 1, marking: 2, finish: 3 };

// Палитра (линейные цвета подбираются в шейдере, здесь sRGB-hex)
export const COL = {
  log: 0x8a5a36, logOld: 0x6b5442, logDark: 0x4a3426, plank: 0x9a6a42, plankOld: 0x6f6152,
  shingle: 0x5c4c44, shingleOld: 0x4a4744, shingleBlue: 0x4c5560, thatch: 0x9c8452,
  stone: 0x8a8378, stoneDark: 0x5e5a55, white: 0xd8cdb4, gold: 0xd0a040, lead: 0x7d8a94,
  red: 0xa8322a, redDark: 0x6e2420, cloth: 0xb5462e, bone: 0xd8ccb0, glow: 0xffb54a,
  iron: 0x3a3a40, fire: 0xff7a22, rope: 0xc8b48a, chalk: 0xe8e0c8, moss: 0x5a6a3a, earth: 0x5a4632,
  green: 0x4f6b3a, blood: 0x8c1c1c, teal: 0x3e7c78,
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

export class Kit {
  constructor(seed = 1) {
    this.parts = [];
    this.seed = seed >>> 0 || 1;
    this.stage = 1;          // этап по умолчанию для следующих деталей
    this.kind = KIND.normal;
    this.decay = 0;          // >0: заброшенное, детали получают случайный наклон и выпадения
    this.jitter = 0;         // случайный перекос деталей (рад): постройка «рукотворная», не по линейке
  }
  // детерминированный случайный поток
  rand() { let t = (this.seed += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  rr(a, b) { return a + (b - a) * this.rand(); }
  pick(arr) { return arr[Math.floor(this.rand() * arr.length) % arr.length]; }

  // Добавить геометрию (в локальных координатах детали) с матрицей и свойствами.
  add(geom, matrix, o = {}) {
    const g = geom.index ? geom.toNonIndexed() : geom.clone();
    g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const jit = (o.jitter ?? this.jitter);
    if (jit > 0) {
      g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3());
      const m = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
      m.premultiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(this.rr(-jit, jit), this.rr(-jit, jit) * 0.5, this.rr(-jit, jit))));
      m.premultiply(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z));
      g.applyMatrix4(m);
    }
    let capAxis = null;
    if (o.cap) capAxis = (o.capLocal ?? new THREE.Vector3(1, 0, 0)).clone().transformDirection(matrix);
    this.parts.push({ capAxis,
      g, color: new THREE.Color(o.color ?? COL.log), pat: o.pat ?? PAT.plain,
      stage: o.stage ?? this.stage, kind: o.kind ?? this.kind, uvScale: o.uvScale ?? 1,
      flatUv: o.flatUv ?? true,
    });
    geom.dispose?.();
    return this;
  }
  mat(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ'));
    return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  }

  // ---------- примитивы ----------
  // Брус: основание на высоте y, центр (x, z).
  box(x, y, z, w, h, d, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), o);
  }
  // Цилиндр вертикальный (бревно-столб), основание на y.
  cyl(x, y, z, r, h, o = {}) {
    const g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 8, 1, false);
    g.translate(0, h / 2, 0);
    const lg = (o.pat ?? PAT.plain) === PAT.logs && r < 0.4;
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), lg ? { ...o, pat: PAT.bark, cap: true, capLocal: new THREE.Vector3(0, 1, 0), flatUv: false } : o);
  }
  // Бревно лежащее вдоль оси x (центр), длина len.
  log(x, y, z, r, len, o = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, o.seg ?? 7);
    g.rotateZ(Math.PI / 2);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), { pat: PAT.bark, cap: true, flatUv: false, ...o });
  }
  cone(x, y, z, r, h, o = {}) {
    const g = new THREE.ConeGeometry(r, h, o.seg ?? 8);
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0), o);
  }
  sphere(x, y, z, r, o = {}) {
    const g = new THREE.SphereGeometry(r, o.seg ?? 8, Math.max(4, (o.seg ?? 8) >> 1));
    return this.add(g, this.mat(x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx ?? 1, o.sy ?? 1, o.sz ?? 1), o);
  }

  // Двускатная кровля: конёк вдоль x. w — длина по коньку, d — глубина (по z), h — высота конька над y.
  // Скаты — толстые плиты, щипцы (треугольники) — отдельно, доской.
  gable(x, y, z, w, d, h, o = {}) {
    const over = o.over ?? 0.45, th = o.th ?? 0.14, ry = o.ry ?? 0;
    const half = d / 2 + over, ang = Math.atan2(h, d / 2), slope = Math.hypot(half, h * half / (d / 2));
    const sag = o.sag ?? 0; // провис для заброшенных
    const roofO = { color: o.color ?? COL.shingle, pat: o.pat ?? PAT.shingles, stage: o.stage, kind: o.kind };
    const hole = o.hole ?? 0; // доля выпавшей кровли
    const mk = (side) => {
      const segs = hole > 0 ? 4 : 1;
      for (let i = 0; i < segs; i++) {
        if (hole > 0 && this.rand() < hole) continue;
        const sw = (w + over * 2) / segs, cx = -(w / 2 + over) + sw * (i + 0.5);
        const g = new THREE.BoxGeometry(sw * (hole > 0 ? 0.98 : 1), th, slope);
        // плита: центр на середине ската
        const t = side * ang + (sag ? side * this.rr(-sag, sag) : 0);
        g.rotateX(t);
        const mzc = side * (half / 2), myc = h - (h * half / (d / 2)) / 2 + th * 0.5;
        g.translate(cx, myc, mzc);
        this.add(g, this.mat(x, y, z, 0, ry, 0), roofO);
      }
    };
    mk(1); mk(-1);
    // свес: тёс разной длины — рваный, живой край кровли
    if (o.eaves !== false && hole < 0.5) for (const side of [1, -1]) {
      const n = Math.round((w + over * 2) / 0.27), eY = h - h * half / (d / 2);
      for (let i = 0; i < n; i++) {
        if (hole > 0 && this.rand() < hole * 0.8) continue;
        const cx = -(w / 2 + over) + (i + 0.5) * (w + over * 2) / n, L = this.rr(0.3, 0.62);
        const g = new THREE.BoxGeometry(0.25, 0.05, L).translate(0, 0, side * (L / 2 - 0.12)).rotateX(side * ang + this.rr(-0.04, 0.04) + (sag ? side * 0.1 : 0));
        g.translate(cx, eY + th * 0.9, side * half);
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: roofO.color, pat: PAT.planks, stage: o.stage, kind: o.kind });
      }
    }
    // конёк — бревно-охлупень
    if (o.ridge !== false) this.add(new THREE.CylinderGeometry(0.13, 0.13, w + over * 2, 6).rotateZ(Math.PI / 2).translate(0, h + th, 0), this.mat(x, y, z, 0, ry, 0), { color: o.ridgeColor ?? COL.logDark, pat: PAT.logs, stage: o.stage, kind: o.kind });
    // щипцы
    if (o.gables !== false) {
      for (const sx of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(-d / 2, 0); shape.lineTo(d / 2, 0); shape.lineTo(0, h); shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
        g.rotateY(Math.PI / 2); g.translate(sx * w / 2 - (sx > 0 ? 0.12 : 0), 0, 0);
        this.add(g, this.mat(x, y, z, 0, ry, 0), { color: o.gableColor ?? COL.plank, pat: PAT.planks, stage: o.stage, kind: o.kind });
      }
    }
    return this;
  }

  // Шатёр / пирамида (n граней), основание на y.
  tent(x, y, z, r, h, o = {}) {
    const g = new THREE.ConeGeometry(r, h, o.seg ?? 8, 1, false, o.rot ?? Math.PI / (o.seg ?? 8));
    g.translate(0, h / 2, 0);
    return this.add(g, this.mat(x, y, z, 0, o.ry || 0, 0, 1, 1, o.sz ?? 1), { color: COL.shingle, pat: PAT.shingles, ...o });
  }

  // Луковичная глава на барабане: основание на y, радиус r.
  onion(x, y, z, r, o = {}) {
    const pts = [];
    const prof = [[0, 0], [0.82, 0.02], [1.0, 0.32], [0.96, 0.62], [0.72, 0.95], [0.38, 1.25], [0.14, 1.52], [0.05, 1.75], [0, 1.82]];
    for (const [a, b] of prof) pts.push(new THREE.Vector2(a * r, b * r));
    const g = new THREE.LatheGeometry(pts, o.seg ?? 12);
    this.add(g, this.mat(x, y, z, o.tilt || 0, 0, o.tiltZ || 0), { color: o.color ?? COL.gold, pat: o.pat ?? PAT.scales, flatUv: false, stage: o.stage, kind: o.kind });
    if (o.cross !== false) this.cross(x, y + 1.78 * r, z, r * 0.9, { stage: o.stage, kind: o.kind, color: o.crossColor, tilt: o.tilt });
    return this;
  }
  // Крест (восьмиконечный упрощённо)
  cross(x, y, z, s, o = {}) {
    const c = { color: o.color ?? COL.gold, pat: PAT.gold, stage: o.stage, kind: o.kind };
    const t = 0.07 * s / 0.9 + 0.03;
    this.box(x, y, z, t, s * 1.3, t, { ...c, rz: o.tilt || 0 });
    this.box(x, y + s * 0.85, z, s * 0.7, t, t, c);
    this.box(x, y + s * 1.08, z, s * 0.36, t * 0.8, t, c);
    this.box(x, y + s * 0.42, z, s * 0.46, t * 0.8, t, { ...c, rz: 0.35 });
    return this;
  }

  // Сруб: четыре стены из бревна (фактура венцов) с выпусками на углах.
  // w по x, d по z, h высота. Возвращает ничего. Окна/двери добавляются отдельно поверх.
  srub(x, y, z, w, d, h, o = {}) {
    if (o.logs !== false && !(o.t && o.t < 0.25)) return this.srubLogs(x, y, z, w, d, h, o);
    const t = o.t ?? 0.3, col = o.color ?? COL.log, ry = o.ry ?? 0;
    const st = { stage: o.stage, kind: o.kind };
    const put = (lx, lz, bw, bd) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      this.box(x + lx * c + lz * s, y, z - lx * s + lz * c, bw, h, bd, { color: col, pat: PAT.logs, ry, ...st });
    };
    put(0, d / 2 - t / 2, w, t); put(0, -d / 2 + t / 2, w, t);
    put(w / 2 - t / 2, 0, t, d - 2 * t); put(-w / 2 + t / 2, 0, t, d - 2 * t);
    if (o.corners !== false) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const c = Math.cos(ry), s = Math.sin(ry), lx = sx * (w / 2 + 0.02), lz = sz * (d / 2 + 0.02);
        this.box(x + lx * c + lz * s, y, z - lx * s + lz * c, t + 0.22, h, t + 0.22, { color: o.endColor ?? col, pat: PAT.logEnds, ry, ...st });
      }
    }
    return this;
  }

  // Настоящий сруб «в обло»: бревна венцами, торцы выступают на углах, боковые стены сдвинуты на полвенца.
  srubLogs(x, y, z, w, d, h, o = {}) {
    const r = o.r ?? 0.15, col = o.color ?? COL.log, ry = o.ry ?? 0;
    // боковые стены кончаются ровно на высоте h, фасадные — на полвенца выше (под щипец)
    const n = Math.max(1, Math.round((h - 2 * r) / (r * 1.72) + 0.5));
    const step = (h - 2 * r) / Math.max(0.5, n - 0.5);
    const st = { stage: o.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const over = o.corners === false ? 0.02 : 0.3;
    const lc = new THREE.Color(col);
    for (let i = 0; i <= n; i++) {
      const yy = y + i * step + r;
      for (const sz of [-1, 1]) {
        if (i === n && o.topFront === false) continue;
        if (o.gap && o.gap(i, sz)) continue;
        const [px, pz] = P(this.rr(-0.06, 0.06), sz * (d / 2 - r));
        const tint = lc.clone().offsetHSL(0, 0, this.rr(-0.05, 0.04)).getHex();
        this.log(px, yy, pz, r * this.rr(0.9, 1.08), w + 2 * over * this.rr(0.75, 1.15), { color: tint, ry, ...st, seg: 7 });
      }
      for (const sx of [-1, 1]) {
        if (i === n || (i === n - 1 && o.topSides === false)) continue;
        const [px, pz] = P(sx * (w / 2 - r), this.rr(-0.06, 0.06));
        const tint = lc.clone().offsetHSL(0, 0, this.rr(-0.05, 0.04)).getHex();
        this.log(px, yy + step / 2, pz, r * this.rr(0.9, 1.08), d + 2 * over * this.rr(0.75, 1.15), { color: tint, ry: ry + Math.PI / 2, ...st, seg: 7 });
      }
    }
    // внутренняя «пазуха», чтобы между бревнами не просвечивало
    this.box(x, y, z, w - 2 * r, n * step, d - 2 * r, { color: 0x2a1c14, pat: PAT.dark, ry, ...st, jitter: 0 });
    return this;
  }

  // Подзор / резная доска: кружевная полоса (сквозная резьба) от (x0,z0) до (x1,z1)
  lace(x0, y, z0, x1, z1, h, o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    return this.box((x0 + x1) / 2, y - h, (z0 + z1) / 2, len, h, 0.04, { color: o.color ?? COL.white, pat: PAT.carved, ry: -ang, stage: o.stage, kind: o.kind, jitter: 0.004 });
  }

  // Окно с наличником на стене фасада (+z) или любой: (x, y, z) центр низа окна, ry поворот стены.
  window(x, y, z, ry = 0, o = {}) {
    const w = o.w ?? 0.6, h = o.h ?? 0.7, st = { stage: o.stage ?? this.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const [ax, az] = P(0, 0.02);
    if (o.boarded) {
      this.box(ax, y, az, w, h, 0.06, { color: COL.logDark, pat: PAT.dark, ry, ...st });
      for (let i = 0; i < 2; i++) { const [bx, bz] = P(0, 0.07); this.box(bx, y + h * (0.25 + i * 0.4), bz, w * 1.25, 0.12, 0.05, { color: COL.plankOld, pat: PAT.planks, ry, rz: this.rr(-0.4, 0.4), ...st }); }
    } else {
      this.box(ax, y, az, w, h, 0.06, { color: COL.glow, pat: o.dark ? PAT.dark : PAT.glow, ry, ...st });
      const [mx, mz] = P(0, 0.06); // переплёт
      this.box(mx, y, mz, 0.05, h, 0.03, { color: COL.logDark, pat: PAT.plain, ry, ...st });
      this.box(mx, y + h / 2 - 0.025, mz, w, 0.05, 0.03, { color: COL.logDark, pat: PAT.plain, ry, ...st });
    }
    // наличник: верх с «кокошником», низ, боковины
    const nc = o.nal ?? COL.white;
    const [nx, nz] = P(0, 0.06);
    this.box(nx, y - 0.12, nz, w + 0.3, 0.12, 0.08, { color: nc, pat: PAT.planks, ry, ...st });
    this.box(nx, y + h, nz, w + 0.3, 0.14, 0.09, { color: nc, pat: PAT.planks, ry, ...st });
    const g = new THREE.CylinderGeometry(0.01, (w + 0.3) / 2, 0.28, 3, 1).rotateY(Math.PI / 6 + Math.PI / 2).scale(1, 1, 0.25);
    g.translate(0, 0.14, 0);
    this.add(g, this.mat(nx, y + h + 0.14, nz, 0, ry, 0), { color: nc, pat: PAT.plain, ...st });
    for (const sx of [-1, 1]) { const [px, pz] = P(sx * (w / 2 + 0.08), 0.06); this.box(px, y, pz, 0.1, h, 0.08, { color: nc, pat: PAT.planks, ry, ...st }); }
    if (o.shutters && !o.boarded) for (const sx of [-1, 1]) { const [px, pz] = P(sx * (w * 0.75 + 0.14), 0.1); this.box(px, y, pz, w / 2, h, 0.05, { color: o.shutterColor ?? COL.red, pat: PAT.planks, ry, ...st }); }
    return this;
  }

  // Дверь: центр низа, поворот стены.
  door(x, y, z, ry = 0, o = {}) {
    const w = o.w ?? 0.9, h = o.h ?? 1.7, st = { stage: o.stage ?? this.stage, kind: o.kind };
    const c = Math.cos(ry), s = Math.sin(ry);
    this.box(x + 0.03 * s, y, z + 0.03 * c, w, h, 0.08, { color: o.color ?? COL.logDark, pat: PAT.planks, ry, ...st });
    this.box(x + 0.07 * s, y + h, z + 0.07 * c, w + 0.3, 0.16, 0.1, { color: COL.logDark, pat: PAT.plain, ry, ...st });
    return this;
  }

  // Строительные леса вокруг прямоугольника (вид scaffold): стойки, настилы, раскосы.
  scaffold(x, y, z, w, d, h, ry = 0) {
    const sk = this.kind; this.kind = KIND.scaffold;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const W = w / 2 + 0.7, D = d / 2 + 0.7, nx = Math.max(2, Math.round(w / 2.4)), nz = Math.max(2, Math.round(d / 2.4));
    const posts = [];
    for (let i = 0; i <= nx; i++) { posts.push([-W + 2 * W * i / nx, -D]); posts.push([-W + 2 * W * i / nx, D]); }
    for (let i = 1; i < nz; i++) { posts.push([-W, -D + 2 * D * i / nz]); posts.push([W, -D + 2 * D * i / nz]); }
    for (const [lx, lz] of posts) { const [px, pz] = P(lx, lz); this.cyl(px, y - 0.4, pz, 0.06, h + 0.8, { color: COL.plank, pat: PAT.logs, seg: 5, rz: this.rr(-0.03, 0.03) }); }
    for (let lv = 1.4; lv < h; lv += 1.6) {
      for (const sz of [-1, 1]) { const [px, pz] = P(0, sz * D); this.box(px, y + lv, pz, 2 * W + 0.2, 0.06, 0.5, { color: COL.plankOld, pat: PAT.planks, ry }); }
      for (const sx of [-1, 1]) { const [px, pz] = P(sx * W, 0); this.box(px, y + lv, pz, 0.5, 0.06, 2 * D + 0.2, { color: COL.plankOld, pat: PAT.planks, ry }); }
    }
    // раскосы на фасаде
    for (let i = 0; i < nx; i++) {
      const lx = -W + 2 * W * (i + 0.5) / nx, [px, pz] = P(lx, D + 0.06), len = Math.hypot(2 * W / nx, Math.min(h, 3));
      this.box(px, y + 0.2, pz, 0.06, len, 0.06, { color: COL.plank, pat: PAT.plain, ry, rz: (i % 2 ? 1 : -1) * Math.atan2(2 * W / nx, Math.min(h, 3)) });
    }
    this.kind = sk;
    return this;
  }

  // Разметка: колышки и верёвка (вид marking)
  marking(x, y, z, w, d, ry = 0) {
    const sk = this.kind; this.kind = KIND.marking;
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [a, b] of cs) { const [px, pz] = P(a * w / 2, b * d / 2); this.cyl(px, y - 0.1, pz, 0.05, 0.7, { color: COL.plank, pat: PAT.plain, seg: 5, stage: 0 }); this.cone(px, y + 0.6, pz, 0.06, 0.12, { color: COL.red, seg: 5, stage: 0 }); }
    for (let i = 0; i < 4; i++) {
      const [a, b] = cs[i], [e, f] = cs[(i + 1) % 4], lx = (a + e) / 2 * w / 2, lz = (b + f) / 2 * d / 2, len = (a !== e ? w : d);
      const [px, pz] = P(lx, lz);
      this.box(px, y + 0.45, pz, a !== e ? len : 0.03, 0.03, a !== e ? 0.03 : len, { color: COL.rope, pat: PAT.plain, ry, stage: 0 });
    }
    this.kind = sk;
    return this;
  }

  // ---------- слияние ----------
  build() {
    let n = 0;
    for (const p of this.parts) n += p.g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3),
      uv = new Float32Array(n * 2), info = new Float32Array(n * 4), rng = new Float32Array(n * 2);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(),
      T = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Color();
    let o = 0;
    const box = new THREE.Box3();
    for (const p of this.parts) {
      const P = p.g.attributes.position, N = p.g.attributes.normal, cnt = P.count;
      let ymin = Infinity, ymax = -Infinity;
      for (let i = 0; i < cnt; i++) { const y = P.getY(i); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
      const seed = this.rand();
      const pc = new THREE.Vector3(); { const bb = new THREE.Box3().setFromBufferAttribute(P); bb.getCenter(pc); }
      const sz3 = new THREE.Box3().setFromBufferAttribute(P).getSize(new THREE.Vector3());
      const R = Math.max(0.05, p.capAxis ? Math.min(sz3.x, sz3.y, sz3.z) / 2 : Math.max(sz3.x, sz3.z) / 2);
      // лёгкий разброс тона детали — «мазок»
      tmp.copy(p.color).offsetHSL(this.rr(-0.012, 0.012), this.rr(-0.04, 0.04), this.rr(-0.035, 0.035));
      for (let i = 0; i < cnt; i += 3) {
        a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
        fn.subVectors(c, b).cross(a.clone().sub(b)).normalize();
        const isCap = p.capAxis && Math.abs(fn.dot(p.capAxis)) > 0.85;
        if (Math.abs(fn.y) > 0.92) { T.set(1, 0, 0); B.set(0, 0, fn.y > 0 ? -1 : 1); }
        else { B.copy(up).addScaledVector(fn, -fn.y).normalize(); T.crossVectors(B, fn).normalize(); }
        // круглые детали (луковицы, бревна): u — по дуге вокруг оси, без шва внутри треугольника
        let a0 = null;
        const axis = p.capAxis ?? up;
        for (let k = 0; k < 3; k++) {
          const j = o + i + k, v = k === 0 ? a : k === 1 ? b : c;
          pos.set([v.x, v.y, v.z], j * 3);
          nor.set([N.getX(i + k), N.getY(i + k), N.getZ(i + k)], j * 3);
          col.set([tmp.r, tmp.g, tmp.b], j * 3);
          let pat = p.pat, u = v.dot(T) * p.uvScale, w = v.dot(B) * p.uvScale;
          if (isCap) {
            const dv = v.clone().sub(pc); dv.addScaledVector(p.capAxis, -dv.dot(p.capAxis));
            const t1 = Math.abs(p.capAxis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const t2 = new THREE.Vector3().crossVectors(p.capAxis, t1);
            u = dv.dot(t1); w = dv.dot(t2); pat = PAT.rings;
          } else if (!p.flatUv) {
            const dv = v.clone().sub(pc);
            const along = dv.dot(axis); dv.addScaledVector(axis, -along);
            const e1 = Math.abs(axis.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const e2 = new THREE.Vector3().crossVectors(axis, e1);
            let ang = Math.atan2(dv.dot(e2), dv.dot(e1));
            if (a0 === null) a0 = ang; else { while (ang - a0 > Math.PI) ang -= 2 * Math.PI; while (ang - a0 < -Math.PI) ang += 2 * Math.PI; }
            if (p.capAxis) { u = along; w = ang * R; } else { u = ang * R; w = v.y; }
          }
          uv[j * 2] = u; uv[j * 2 + 1] = w;
          info.set([pat, p.stage, p.kind, seed], j * 4);
          rng[j * 2] = ymin; rng[j * 2 + 1] = ymax;
        }
      }
      o += cnt;
      p.g.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
    g.setAttribute('aRange', new THREE.BufferAttribute(rng, 2));
    g.computeBoundingBox(); g.computeBoundingSphere();
    this.parts = [];
    return g;
  }
}
