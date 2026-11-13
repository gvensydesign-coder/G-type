/**
 * Природа и бытовые объекты окружения — по референсам «хвойная группа», «берёзовая куртина»
 * и листу «Функциональные объекты» (2026-09-24).
 *
 *   spruce_grove  — ельник: 4 ели разной высоты, серые гранёные валуны с пятнами мха, папоротники, валежник
 *   birch_grove   — березняк: 5 берёз (белый ствол, чёрные чечевички, лиственные кроны), подлесок, ромашки, пень
 *   outhouse      — уличный туалет: дощатая будка, односкатная крыша во мху, вырез на двери, крестик-навершие, ёлочка
 *   well          — колодец: тёмный замшелый сруб на каменных плитах, стойки, ворот, зелёная двускатная крыша, красная тряпица
 *   yard_table    — лавка и стол: стол на козлах, лавка, пень-сиденье, бочка, кувшин, камни
 *   stove         — уличная печь: каменная, горящий зев (светится и днём), сужающаяся труба с дымом, ящик и дрова
 *   fallen_tree   — упавшее дерево: замшелый ствол с корневищем и сломом, красная верёвка, кол с черепом
 *   swamp         — болотце: бирюзовая вода в низине, камыш, рогоз, кувшинки, коряга
 *   broken_fence  — сломанная изгородь: кривые столбы, выпавшие и повисшие жерди, камни
 *   cursed_tree   — проклятое дерево: корявый сухой ствол, красные тряпки, подвешенные узелки, красный знак
 *   clearing      — сцена «Опушка» 20×20 м: всё вместе, с дымкой по краю
 *
 * Правила росписи: ровные большие плоскости, мягкие пятна мха, узкий разброс тона граней —
 * см. kb/11-nature-props.md.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);
  const LES = () => window.LPK_LES;

  const C = {
    birch: '#d8d3c4', birchShade: '#bdb7a6', birchMark: '#2b2926',
    leaf: '#5f7d36', leafDark: '#4a6630', leafLight: '#8fa84e', leafTip: '#a5b861',
    daisy: '#ece8dc', daisyEye: '#d9b23a', cattail: '#5a3b26', reed: '#6f7a45', reedDry: '#8a8450',
    water: '#24524f', mudWet: '#3c3a33', clay: '#7a5a3e', sack: '#6b5a44', deadBark: '#5d4c3d',
    innerWood: '#a58a62', rope: '#8a2e24', mossGreen: '#6f8a3c', iron: '#2d2c2a',
  };

  // =====================================================================
  // общие природные детали
  // =====================================================================
  function nature(K) {
    const { T, PAL, M, part, rand } = K;
    const H = LES().kitHelpers(K);
    const { V, stick } = H;

    /** Серый гранёный валун с цельными пятнами мха сверху. */
    function boulder(L, x, y, z, s, o = {}) {
      const sc = V(s * (0.9 + rand() * 0.4), s * (0.55 + rand() * 0.25), s * (0.8 + rand() * 0.4));
      L.push(part(new T.IcosahedronGeometry(1, 1), o.hex || (rand() < 0.3 ? PAL.stoneDark : PAL.stone), { // v4: 80 граней
        m: M(x, y + sc.y * 0.5, z, (rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4, sc), jitter: 0.08 * s,
        moss: o.moss ?? 0.55, mossHex: PAL.moss, ao: false, vary: 0.1, tex: 'stone',
      }));
    }
    /** Мшистая кочка: приплюснутый ком, тёмно-оливковый с плавным светлым верхом. */
    function mossLump(L, x, y, z, r) {
      L.push(K.tint(part(new T.IcosahedronGeometry(1, 0), rand() < 0.5 ? '#5f6e32' : '#6a7836', { m: M(x, y, z, 0, rand() * 6, 0, V(r * 1.3, r * 0.4, r)), jitter: r * 0.12, tex: 'grass', ao: false, vary: 0.06 }),
        (vx, vy) => (vy - y) / (r * 0.4) * 0.5 + 0.1, PAL.mossLight));
    }
    /** Ёлочка-подрост: 4 яруса плоских конусов, светлые кончики. */
    function sapling(L, x, y, z, h = 1.8) {
      L.push(part(new T.CylinderGeometry(0.02, 0.045, h * 0.4, 5), PAL.bark, { m: M(x, y + h * 0.2, z), jitter: 0, ao: false, tex: 'bark' }));
      for (let t = 0; t < 4; t++) {
        const f = t / 3, R = h * (0.34 - f * 0.22), yy = y + h * (0.18 + f * 0.62), hh = h * (0.32 - f * 0.06);
        L.push(K.tint(part(new T.ConeGeometry(R, hh, 7), t % 2 ? PAL.needleMid : PAL.needle, { m: M(x, yy + hh / 2, z, 0, rand() * 3, 0), jitter: 0.02, tex: 'needles', ao: false, vary: 0.08 }),
          (vx, vy, vz) => Math.min(1, Math.hypot(vx - x, vz - z) / R) * 0.55, PAL.needleLight));
      }
    }
    /** Широколиственное растение подлеска: 5–8 листьев-лодочек, светлые кончики. */
    function leafPlant(L, x, y, z, s = 1) {
      const n = 5 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand() * 0.5, len = (0.42 + rand() * 0.2) * s;
        const d = V(Math.cos(a), 0.75 + rand() * 0.35, Math.sin(a)).normalize();
        const xA = new T.Vector3().crossVectors(d, V(0, 1, 0)).normalize(), zA = new T.Vector3().crossVectors(xA, d);
        const geo = new T.ConeGeometry(0.2 * s, len, 4);
        geo.applyMatrix4(new T.Matrix4().makeScale(1, 1, 0.18));
        const p = geo.attributes.position; // лист шире в середине
        for (let k = 0; k < p.count; k++) if (Math.abs(p.getY(k)) < len * 0.1) p.setX(k, p.getX(k) * 1.3);
        const bx = x + d.x * len * 0.5, by = y + d.y * len * 0.5, bz = z + d.z * len * 0.5;
        const m = new T.Matrix4().makeBasis(xA, d, zA).setPosition(bx, by, bz);
        L.push(K.tint(part(geo, rand() < 0.5 ? C.leaf : C.leafDark, { m, jitter: 0.008, ao: false, vary: 0.1, tex: 'leaves', axis: [0, 1, 0] }),
          (vx, vy, vz) => ((vx - x) * d.x + (vy - y) * d.y + (vz - z) * d.z) / len * 0.55, C.leafLight));
      }
    }
    /** Ромашка: стебель, белые лепестки диском, жёлтая серединка. */
    function daisy(L, x, y, z, h = 0.3) {
      L.push(part(new T.CylinderGeometry(0.008, 0.01, h, 3), PAL.grass, { m: M(x, y + h / 2, z), jitter: 0, ao: false, vary: 0 }));
      const tilt = (rand() - 0.5) * 0.5;
      L.push(part(new T.CylinderGeometry(0.055, 0.045, 0.012, 7), C.daisy, { m: M(x, y + h, z, tilt, rand() * 3, 0), jitter: 0, ao: false, vary: 0.04 }));
      L.push(part(new T.IcosahedronGeometry(0.02, 0), C.daisyEye, { m: M(x, y + h + 0.012, z), jitter: 0, ao: false, vary: 0 }));
    }
    /** Сухая ветка на земле с сучками. */
    function fallenBranch(L, x, y, z, len, ry) {
      const a = V(x, y + 0.05, z), b = V(x + Math.cos(ry) * len, y + 0.04, z + Math.sin(ry) * len);
      stick(L, a, b, 0.04, PAL.woodDark, { tex: 'bark', moss: 0.2, seg: 5, taper: 0.5 });
      for (let i = 0; i < 3; i++) {
        const p = a.clone().lerp(b, 0.25 + i * 0.22), s = (i % 2 ? 1 : -1);
        stick(L, p, p.clone().add(V(Math.cos(ry + s * 0.9) * 0.3, 0.06 + rand() * 0.1, Math.sin(ry + s * 0.9) * 0.3)), 0.016, PAL.woodDark, { tex: 'bark', moss: 0, seg: 4, taper: 0.3, jitter: 0 });
      }
    }
    /** Сломанный пень: зубчатый верх, корни. */
    function stump(L, x, y, z, r = 0.3, h = 0.6) {
      L.push(part(new T.CylinderGeometry(r * 0.9, r * 1.1, h, 8), PAL.bark, { m: M(x, y + h / 2, z, 0, rand() * 3, 0), tex: 'bark', axis: [0, 1, 0], jitter: 0.02, moss: 0.4 }));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 6.28 + rand() * 0.6, hh = 0.15 + rand() * 0.35;
        L.push(part(new T.ConeGeometry(r * 0.35, hh, 3), k % 2 ? C.innerWood : PAL.bark, { m: M(x + Math.cos(a) * r * 0.55, y + h + hh / 2 - 0.02, z + Math.sin(a) * r * 0.55, (rand() - 0.5) * 0.3, rand() * 3, (rand() - 0.5) * 0.3), jitter: 0.01, ao: false, vary: 0.08 }));
      }
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.28 + rand();
        stick(L, V(x + Math.cos(a) * r * 0.8, y + 0.12, z + Math.sin(a) * r * 0.8), V(x + Math.cos(a) * r * 2.2, y - 0.04, z + Math.sin(a) * r * 2.2), r * 0.3, PAL.bark, { tex: 'bark', moss: 0.35, taper: 0.4, seg: 5 });
      }
    }
    /** Камыш и рогоз пучком. */
    function reeds(L, x, y, z, n = 6, hMax = 1.3) {
      for (let k = 0; k < n; k++) {
        const h = hMax * (0.5 + rand() * 0.5), px = x + (rand() - 0.5) * 0.35, pz = z + (rand() - 0.5) * 0.35;
        const rx = (rand() - 0.5) * 0.22, rz = (rand() - 0.5) * 0.22;
        L.push(part(new T.ConeGeometry(0.022, h, 3), rand() < 0.3 ? C.reedDry : C.reed, { m: M(px, y + h / 2, pz, rx, rand() * 3, rz), jitter: 0, ao: false, vary: 0.1 }));
        if (rand() < 0.25) L.push(part(new T.CylinderGeometry(0.038, 0.038, 0.18, 6), C.cattail, { m: M(px + rz * -h * 0.8 * 0, y + h * 0.78, pz, rx, 0, rz), jitter: 0, ao: false, vary: 0.05 }));
      }
    }
    /** Берёза: белый ствол с чёрными чечевичками, редкие ветви, лиственная крона из мягких комьев. */
    function birch(h = 9, sd = 1) {
      K.setSeed(500 + sd * 13);
      const L = [], LV = [];
      const r0 = 0.1 + h * 0.012, lean = V((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5);
      const at = (t) => V(lean.x * t * t * h * 0.12, t * h, lean.z * t * t * h * 0.12);
      const segs = 4;
      for (let i = 0; i < segs; i++) {
        const t0 = (i / segs) * 0.86, t1 = ((i + 1) / segs) * 0.86;
        stick(L, at(t0), at(t1), r0 * (1 - t0 * 0.7), C.birch, { tex: 'birch', moss: 0, seg: 7, taper: (1 - t1 * 0.7) / (1 - t0 * 0.7), jitter: 0.008, vary: 0.05 });
      }
      // тёмный низ ствола и чечевички
      L.push(part(new T.CylinderGeometry(r0 * 1.02, r0 * 1.15, 0.5, 7), C.birchMark, { m: M(0, 0.25, 0), jitter: 0.01, ao: false, vary: 0.06 }));
      const nMarks = Math.round(h * 1.4); // остальные чечевички даёт текстура бересты
      for (let k = 0; k < nMarks; k++) {
        const t = 0.07 + rand() * 0.75, c = at(t), rr = r0 * (1 - t * 0.7) + 0.004, a = rand() * Math.PI * 2;
        const w = (0.06 + rand() * 0.12) * (r0 / 0.2), hh = 0.025 + rand() * 0.05;
        L.push(part(new T.BoxGeometry(w, hh, 0.02), C.birchMark, { m: M(c.x + Math.cos(a) * rr, c.y, c.z + Math.sin(a) * rr, 0, -a - Math.PI / 2, (rand() - 0.5) * 0.3), jitter: 0, ao: false, vary: 0.08 }));
      }
      // ветви и крона
      // крона лёгкая и узкая: ствол виден почти до верха, листва — небольшие комья по концам ветвей
      const top = at(0.9), crownY = h * 0.55;
      const tips = [top];
      for (let b = 0; b < 6; b++) {
        const t = 0.55 + b * 0.06 + rand() * 0.04, p = at(t), a = b * 2.4 + rand();
        const reach = h * (0.1 - b * 0.008);
        const tip = p.clone().add(V(Math.cos(a) * reach, h * (0.07 + rand() * 0.05), Math.sin(a) * reach));
        stick(L, p, tip, r0 * 0.3, C.birchShade, { tex: 'plain', moss: 0, seg: 5, taper: 0.4, jitter: 0 });
        tips.push(tip);
      }
      const leafCols = [C.leaf, C.leafDark, C.leaf];
      tips.forEach((tp, i) => {
        const nb = i < 4 ? 3 : 2;
        for (let k = 0; k < nb; k++) {
          const r = h * (0.05 + rand() * 0.022), cx = tp.x + (rand() - 0.5) * r * 1.4, cy = tp.y + (rand() - 0.3) * r * 0.9, cz = tp.z + (rand() - 0.5) * r * 1.4;
          LV.push(K.tint(part(new T.IcosahedronGeometry(1, 1), leafCols[k % 3], { m: M(cx, cy, cz, rand() * 3, rand() * 3, rand() * 3, V(r, r * 0.72, r)), jitter: 0.07 * r, tex: 'leaves', ao: false, vary: 0.1 }),
            (x, y) => (y - cy) / r * 0.7 + 0.15, C.leafTip));
        }
      });
      const g = new T.Group();
      g.add(K.facetGroup(L, { wind: { phase: sd * 1.3, h: h * 1.6 } }), K.facetGroup(LV, { wind: { phase: sd * 1.3, h } }));
      g.userData.crownY = crownY;
      return g;
    }
    /** Сухое корявое дерево: ствол из колен, ветви рекурсивно; возвращает концы ветвей. */
    function gnarled(L, base, h, r, hex = C.deadBark) {
      const trunk = H.crooked(L, base, base.clone().add(V((rand() - 0.5) * 0.4, h, (rand() - 0.5) * 0.4)), r, hex, 0.35, 4, { tex: 'bark', moss: 0.25 });
      const tips = [];
      const branch = (p, dir, len, rr, depth) => {
        const end = p.clone().add(dir.clone().multiplyScalar(len)).add(V((rand() - 0.5) * 0.2, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.2));
        const mid = p.clone().lerp(end, 0.5).add(V((rand() - 0.5) * len * 0.25, (rand() - 0.5) * len * 0.15, (rand() - 0.5) * len * 0.25));
        stick(L, p, mid, rr, hex, { tex: 'bark', moss: 0.1, seg: 5, taper: 0.8 });
        stick(L, mid, end, rr * 0.8, hex, { tex: 'bark', moss: 0, seg: 5, taper: depth ? 0.7 : 0.25 });
        if (!depth) { tips.push(end); return; }
        const nd = end.clone().sub(mid).normalize();
        for (let k = 0; k < 2 + (rand() < 0.4 ? 1 : 0); k++) {
          const q = new T.Quaternion().setFromEuler(new T.Euler((rand() - 0.5) * 1.3, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.3));
          const d2 = nd.clone().applyQuaternion(q);
          d2.y = Math.max(d2.y, -0.35);
          branch(end, d2.normalize(), len * 0.66, rr * 0.62, depth - 1);
        }
      };
      const n = trunk.length;
      for (let k = 0; k < 4; k++) {
        const p = trunk[Math.min(n - 1, 2 + (k % (n - 2)))], a = k * 1.7 + rand();
        branch(p, V(Math.cos(a), 0.55 + rand() * 0.4, Math.sin(a)).normalize(), h * 0.38, r * 0.55, 2);
      }
      tips.push(trunk[n - 1]);
      // корни-наплывы
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 6.28 + rand() * 0.5;
        stick(L, base.clone().add(V(Math.cos(a) * r * 0.6, 0.3, Math.sin(a) * r * 0.6)), base.clone().add(V(Math.cos(a) * r * 2.6, -0.05, Math.sin(a) * r * 2.6)), r * 0.45, hex, { tex: 'bark', moss: 0.35, taper: 0.35, seg: 5 });
      }
      return { tips, trunk };
    }
    /** Узелок-подвеска: мешочек из ткани на верёвке. */
    function bundle(L, p, drop = 0.35) {
      stick(L, p, p.clone().add(V(0, -drop, 0)), 0.01, H.rope ? '#6b5a3e' : '#6b5a3e', { tex: 'plain', moss: 0, ao: false, seg: 3, jitter: 0 });
      L.push(part(new T.IcosahedronGeometry(0.1, 0), C.sack, { m: M(p.x, p.y - drop - 0.08, p.z, rand(), rand(), rand(), V(0.9, 1.25, 0.9)), jitter: 0.01, ao: false, vary: 0.08 }));
      L.push(part(new T.ConeGeometry(0.05, 0.09, 5), C.sack, { m: M(p.x, p.y - drop + 0.03, p.z), jitter: 0.004, ao: false }));
    }
    return { H, V, stick, mossLump, sapling, boulder, leafPlant, daisy, fallenBranch, stump, reeds, birch, gnarled, bundle };
  }

  /** Земля-диорама: сетка 0,5 м, мягкие пятна тона, тропы, мокрые низины, срез почвы. */
  function groundGeos(K, N, hgt, dirtF = () => 0, wetF = () => 0, depth = 1.1) {
    const { T, PAL, M, part, rand } = K;
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const nz = (x, z) => Math.sin(x * 0.55 + Math.sin(z * 0.4) * 1.3) * 0.55 + Math.sin(z * 0.62 - x * 0.31 + 1.7) * 0.45;
    const grassAt = (x, z) => {
      const n1 = nz(x, z), n2 = nz(z * 1.7 + 11, x * 1.7 - 5);
      const c = K.lin(PAL.grass).lerp(K.lin(PAL.grassLight), Math.max(0, Math.min(1, 0.35 + n1 * 0.45)));
      return n2 > 0.55 ? c.lerp(K.lin(PAL.moss), Math.min(1, (n2 - 0.55) * 2.5) * 0.6) : c;
    };
    const B = { grass: [[], []], dirt: [[], []], cliff: [[], []] };
    const tri = (bk, a, b, c, col) => { const [P, Cc] = B[bk]; for (const v of [a, b, c]) { P.push(v.x, v.y, v.z); Cc.push(col.r, col.g, col.b); } };
    const S = 0.5, n = Math.round(N / S);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const P = (a, b) => V(a * S, hgt(a * S, b * S), b * S);
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      for (const [p, q, r] of [[a, c, b], [a, d, c]]) {
        const cx = (p.x + q.x + r.x) / 3, cz = (p.z + q.z + r.z) / 3, cy = (p.y + q.y + r.y) / 3;
        let bk = 'grass', col = grassAt(cx, cz);
        const wet = wetF(cx, cz), dirt = dirtF(cx, cz);
        if (wet > 0.5 || cy < -0.12) { bk = 'dirt'; col = K.lin(C.mudWet); }
        else if (dirt > 0) { // край тропы размыт: трава плавно переходит в землю
          const dc = K.lin(PAL.dirt).lerp(K.lin(PAL.mud), Math.max(0, nz(cx * 1.3, cz * 1.3)) * 0.5);
          if (dirt > 0.55) { bk = 'dirt'; col = dc; } else col = col.lerp(dc, dirt * 0.8);
        }
        tri(bk, p, q, r, col.multiplyScalar((0.97 + rand() * 0.06) * (0.62 + 0.38 * Math.min(1, Math.max(0, (cy + 0.45) / 0.5)))));
      }
    }
    const skirt = (x0, z0, x1, z1) => {
      const a = V(x0, hgt(x0, z0), z0), b = V(x1, hgt(x1, z1), z1), c = V(x1, -depth, z1), d = V(x0, -depth, z0);
      tri('cliff', a, d, c, K.lin(PAL.rock).multiplyScalar(0.95 + rand() * 0.1)); tri('cliff', a, c, b, K.lin(PAL.stoneDark).multiplyScalar(0.95 + rand() * 0.1));
    };
    for (let i = 0; i < n; i++) { skirt(N, i * S, N, (i + 1) * S); skirt((i + 1) * S, N, i * S, N); skirt(0, (i + 1) * S, 0, i * S); skirt(i * S, 0, (i + 1) * S, 0); }
    const out = [];
    Object.entries(B).forEach(([tex, [P, Cc]]) => {
      if (!P.length) return;
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
      geo.computeVertexNormals();
      K.finalize(geo, null);
      geo.userData.tex = tex;
      out.push(geo);
    });
    out.push(part(new T.BoxGeometry(N, 0.6, N, Math.ceil(N / 2), 1, Math.ceil(N / 2)), PAL.soil, { m: M(N / 2, -depth - 0.3, N / 2), jitter: 0.05, tex: 'cliff', ao: false, vary: 0.1 }));
    return out;
  }

  function waterMaterial(K) {
    return new K.T.MeshStandardMaterial({ color: K.lin(C.water), roughness: 0.24, metalness: 0, envMapIntensity: 0.6, transparent: true, opacity: 0.92, flatShading: true });
  }
  function rippler(meshes) {
    const list = meshes.map((w) => ({ p: w.geometry.attributes.position, base: Float32Array.from(w.geometry.attributes.position.array) }));
    return (t) => {
      for (const { p, base } of list) {
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 2.1 + t * 1.3) * 0.01 + Math.cos(base[i * 3 + 1] * 1.7 + t * 1.1) * 0.01);
        p.needsUpdate = true;
      }
    };
  }

  // =====================================================================
  // ЕЛЬНИК И БЕРЕЗНЯК
  // =====================================================================
  function buildSpruceGrove(K, ox = 0, oz = 0, gy = () => 0) {
    const { T, PAL, rand } = K;
    const Nn = nature(K);
    const g = new T.Group();
    const L = [];
    [[3.4, 3.2, 9.5, 41], [1.6, 4.9, 7.2, 42], [5.1, 1.8, 6.0, 43], [2.2, 1.6, 4.2, 44]].forEach(([x, z, h, s]) => {
      const t = K.buildSpruce(h, s);
      t.position.set(ox + x, gy(ox + x, oz + z), oz + z);
      t.rotation.y = s;
      g.add(t);
    });
    K.setSeed(61);
    for (const [x, z, s] of [[4.9, 4.4, 0.75], [5.7, 3.6, 0.45], [0.9, 2.9, 0.55], [4.1, 5.8, 0.4], [1.3, 6.1, 0.9]]) Nn.boulder(L, ox + x, gy(ox + x, oz + z) - 0.08, oz + z, s);
    for (const [x, z] of [[4.6, 2.6], [2.6, 5.9], [0.7, 4.1], [5.9, 5.2], [3.2, 0.8]]) K.fern(L, ox + x, gy(ox + x, oz + z), oz + z, 0.9 + rand() * 0.3);
    for (const [x, z, len, ry] of [[3.6, 5.3, 1.6, 0.4], [0.6, 1.0, 1.2, 2.2], [5.4, 0.7, 1.0, -0.9]]) Nn.fallenBranch(L, ox + x, gy(ox + x, oz + z), oz + z, len, ry);
    for (let k = 0; k < 30; k++) { const x = 0.3 + rand() * 6.4, z = 0.3 + rand() * 6.4; K.tuft(L, ox + x, gy(ox + x, oz + z), oz + z, 3, 0.28 + rand() * 0.2); }
    g.add(K.facetGroup(L));
    return g;
  }

  function buildBirchGrove(K, ox = 0, oz = 0, gy = () => 0) {
    const { T, rand } = K;
    const Nn = nature(K);
    const g = new T.Group();
    [[1.8, 2.0, 9.5, 1], [3.6, 1.2, 8.2, 2], [4.9, 3.1, 9.8, 3], [2.4, 4.4, 7.4, 4], [5.6, 5.4, 6.8, 5]].forEach(([x, z, h, s]) => {
      const t = Nn.birch(h, s);
      t.position.set(ox + x, gy(ox + x, oz + z), oz + z);
      g.add(t);
    });
    K.setSeed(71);
    const L = [];
    for (const [x, z, s] of [[0.8, 5.6, 0.7], [6.1, 1.2, 0.5], [3.9, 6.2, 0.45]]) Nn.boulder(L, ox + x, gy(ox + x, oz + z) - 0.08, oz + z, s, { moss: 0.65 });
    Nn.stump(L, ox + 4.2, gy(ox + 4.2, oz + 4.6), oz + 4.6, 0.26, 0.55);
    for (const [x, z] of [[1.0, 3.3], [3.0, 3.0], [4.4, 5.6], [6.0, 3.9], [2.8, 5.8], [1.1, 1.0], [5.2, 2.0], [0.6, 4.6]]) Nn.leafPlant(L, ox + x, gy(ox + x, oz + z), oz + z, 0.9 + rand() * 0.4);
    for (const [x, z] of [[3.3, 4.8], [6.3, 6.2], [0.5, 2.2], [4.9, 0.5]]) K.fern(L, ox + x, gy(ox + x, oz + z), oz + z, 0.8 + rand() * 0.3);
    for (let k = 0; k < 28; k++) { const x = 0.4 + rand() * 6.2, z = 0.4 + rand() * 6.2; Nn.daisy(L, ox + x, gy(ox + x, oz + z), oz + z, 0.22 + rand() * 0.14); }
    for (let k = 0; k < 30; k++) { const x = 0.3 + rand() * 6.4, z = 0.3 + rand() * 6.4; K.tuft(L, ox + x, gy(ox + x, oz + z), oz + z, 3, 0.3 + rand() * 0.22); }
    g.add(K.facetGroup(L));
    return g;
  }

  // =====================================================================
  // УЛИЧНЫЙ ТУАЛЕТ
  // =====================================================================
  function buildOuthouse(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const g = new T.Group();
    const L = [], R = [];
    const x0 = 0.4, x1 = 1.6, z0 = 0.35, z1 = 1.5, hF = 2.15, hB = 1.85;
    const hAt = (z) => hB + (hF - hB) * (z - z0) / (z1 - z0);
    const plankCol = () => (rand() < 0.2 ? PAL.woodDark : rand() < 0.2 ? PAL.woodLight : PAL.wood);
    // лаги на камнях
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) Nn.boulder(L, x, -0.05, z, 0.16, { moss: 0.4 });
    for (const z of [z0 + 0.05, z1 - 0.05]) stick(L, V(x0 - 0.1, 0.12, z), V(x1 + 0.1, 0.12, z), 0.07, PAL.log, { moss: 0.3 });
    // угловые столбы
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) L.push(part(new T.BoxGeometry(0.1, hAt(z), 0.1), PAL.woodDark, { m: M(x, hAt(z) / 2 + 0.1, z), tex: 'wood', axis: [0, 1, 0], jitter: 0.008 }));
    // стены из вертикальных досок: боковые и задняя
    const plankRow = (a, b, face) => {
      const len = a.distanceTo(b), n = Math.round(len / 0.19), dir = b.clone().sub(a).normalize();
      for (let i = 0; i < n; i++) {
        const p = a.clone().add(dir.clone().multiplyScalar((i + 0.5) * len / n));
        const h = hAt(p.z) - 0.05 + (rand() - 0.5) * 0.06;
        L.push(part(new T.BoxGeometry(len / n - 0.018, h, 0.035), plankCol(),
          { m: M(p.x + face.x * 0.05, 0.1 + h / 2, p.z + face.z * 0.05, 0, Math.atan2(dir.z, dir.x) * -1, (rand() - 0.5) * 0.03), tex: 'wood', axis: [0, 1, 0], jitter: 0.006, moss: 0.1, vary: 0.1 }));
      }
    };
    plankRow(V(x0, 0, z0), V(x1, 0, z0), V(0, 0, -1));
    plankRow(V(x0, 0, z0), V(x0, 0, z1), V(-1, 0, 0));
    plankRow(V(x1, 0, z0), V(x1, 0, z1), V(1, 0, 0));
    // передняя стена: узкие доски по бокам и дверь
    for (const x of [x0 + 0.12, x1 - 0.12]) L.push(part(new T.BoxGeometry(0.2, hF - 0.05, 0.035), plankCol(), { m: M(x, 0.1 + (hF - 0.05) / 2, z1 + 0.05), tex: 'wood', axis: [0, 1, 0], jitter: 0.006 }));
    L.push(part(new T.BoxGeometry(1.25, 0.12, 0.05), PAL.woodDark, { m: M((x0 + x1) / 2, hF - 0.02, z1 + 0.06), tex: 'wood', axis: [1, 0, 0], jitter: 0.006 }));
    const dx = (x0 + x1) / 2 + 0.02, dW = 0.74, dH = 1.78;
    for (let i = 0; i < 4; i++) L.push(part(new T.BoxGeometry(dW / 4 - 0.012, dH - (i === 2 ? 0.04 : 0), 0.04), i % 2 ? PAL.wood : PAL.woodLight,
      { m: M(dx - dW / 2 + (i + 0.5) * dW / 4, 0.14 + dH / 2, z1 + 0.09, 0, 0, (rand() - 0.5) * 0.02), tex: 'wood', axis: [0, 1, 0], jitter: 0.005, vary: 0.08 }));
    for (const y of [0.45, 1.55]) L.push(part(new T.BoxGeometry(dW - 0.04, 0.1, 0.03), PAL.woodDark, { m: M(dx, y, z1 + 0.12), tex: 'wood', axis: [1, 0, 0], jitter: 0.004 }));
    L.push(part(new T.BoxGeometry(0.08, 1.2, 0.03), PAL.woodDark, { m: M(dx, 1.0, z1 + 0.12, 0, 0, -0.52), tex: 'wood', axis: [0, 1, 0], jitter: 0.004 }));
    L.push(part(new T.BoxGeometry(0.11, 0.11, 0.03), '#141210', { m: M(dx, 1.72, z1 + 0.115, 0, 0, Math.PI / 4), jitter: 0, ao: false, vary: 0 })); // вырез-ромбик
    stick(L, V(dx + 0.28, 1.0, z1 + 0.15), V(dx + 0.28, 1.2, z1 + 0.15), 0.02, PAL.iron, { tex: 'plain', moss: 0, jitter: 0, seg: 4 });
    // односкатная крыша во мху с навесом
    const rz0 = z0 - 0.3, rz1 = z1 + 0.42, ry0 = hAt(rz0) + 0.16, ry1 = hAt(rz1) + 0.16, pitch = Math.atan2(ry1 - ry0, rz1 - rz0), rl = Math.hypot(rz1 - rz0, ry1 - ry0);
    for (let i = 0; i < 8; i++) {
      const x = x0 - 0.28 + (i + 0.5) * (x1 - x0 + 0.56) / 8;
      L.push(part(new T.BoxGeometry((x1 - x0 + 0.56) / 8 - 0.01, 0.05, rl + (rand() - 0.5) * 0.12), PAL.roof,
        { m: M(x, (ry0 + ry1) / 2 + (rand() - 0.5) * 0.02, (rz0 + rz1) / 2, -pitch, 0, (rand() - 0.5) * 0.04), tex: 'roof', axis: [0, 0, 1], moss: 0.75, mossHex: PAL.moss, jitter: 0.012, vary: 0.12 }));
      if (rand() < 0.75) { // мшистые кочки поверх досок
        const off = rl * (rand() - 0.5) * 0.8;
        Nn.mossLump(L, x, (ry0 + ry1) / 2 + 0.03 + Math.sin(pitch) * off, (rz0 + rz1) / 2 + Math.cos(pitch) * off, 0.1 + rand() * 0.08);
      }
    }
    for (let i = 0; i < 9; i++) { // мох свисает с переднего свеса
      const x = x0 - 0.2 + rand() * (x1 - x0 + 0.4);
      L.push(part(new T.ConeGeometry(0.06, 0.18 + rand() * 0.2, 3), '#4f5f33', { m: M(x, ry1 - 0.12, rz1 - 0.03, Math.PI, rand() * 3, 0), jitter: 0.01, ao: false, vary: 0.1 }));
    }
    // навершие-крестик на фронтоне
    const cy = ry1 + 0.05;
    stick(L, V((x0 + x1) / 2, cy - 0.1, rz1 - 0.2), V((x0 + x1) / 2 + 0.03, cy + 0.55, rz1 - 0.2), 0.03, PAL.woodDark, { moss: 0, seg: 5 });
    stick(L, V((x0 + x1) / 2 - 0.2, cy + 0.36, rz1 - 0.2), V((x0 + x1) / 2 + 0.22, cy + 0.39, rz1 - 0.2), 0.025, PAL.woodDark, { moss: 0, seg: 5 });
    H.rag(R, V((x0 + x1) / 2 + 0.17, cy + 0.38, rz1 - 0.2), 0.3, 0.07, 0);
    // ёлочка, камни, трава
    K.setSeed(92);
    Nn.sapling(L, 1.9, 0, 0.45, 1.9);
    Nn.boulder(L, 0.2, 0, 1.75, 0.22);
    Nn.boulder(L, 1.85, 0, 1.6, 0.14);
    for (let k = 0; k < 10; k++) K.tuft(L, rand() * 2, 0, rand() * 2, 3, 0.3 + rand() * 0.2);
    g.add(K.facetGroup(L), K.facetGroup(R, { wind: { phase: 2.3, h: 3 } }));
    return { group: g };
  }

  // =====================================================================
  // КОЛОДЕЦ
  // =====================================================================
  function buildWell(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const g = new T.Group();
    const L = [], R = [];
    const c = 1.5, half = 0.62, rowH = 0.17, rows = 5, r = 0.095, logCol = '#4a3a2b';
    // каменные плиты вокруг
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * 6.28 + rand() * 0.3, rr = 1.02 + rand() * 0.22;
      L.push(part(new T.DodecahedronGeometry(1, 0), rand() < 0.35 ? PAL.stoneDark : PAL.stone,
        { m: M(c + Math.cos(a) * rr, 0.03, c + Math.sin(a) * rr, 0, rand() * 3, 0, V(0.3 + rand() * 0.12, 0.07, 0.24 + rand() * 0.1)), jitter: 0.02, tex: 'stone', moss: 0.45, ao: false, vary: 0.1 }));
    }
    // сруб: бревна с выпуском по углам, тёмные и замшелые
    for (let k = 0; k < rows; k++) {
      const y = 0.1 + k * rowH + (k % 2) * rowH * 0.5;
      const alongX = k % 2 === 0;
      for (const s of [-1, 1]) {
        const off = s * half;
        const a = alongX ? V(c - half - 0.14, y, c + off) : V(c + off, y, c - half - 0.14);
        const b = alongX ? V(c + half + 0.14, y + (rand() - 0.5) * 0.02, c + off) : V(c + off, y + (rand() - 0.5) * 0.02, c + half + 0.14);
        stick(L, a, b, r, rand() < 0.3 ? PAL.woodDark : logCol, { tex: 'wood', moss: 0.55, seg: 7, taper: 0.95 });
      }
    }
    const topY = 0.1 + rows * rowH;
    L.push(part(new T.BoxGeometry(half * 2 - 0.12, 0.02, half * 2 - 0.12), '#0d1716', { m: M(c, topY - 0.25, c), jitter: 0, ao: false, vary: 0 }));
    // стойки, ворот с рукоятью
    const px = half + 0.2;
    for (const s of [-1, 1]) H.crooked(L, V(c + s * px, -0.1, c), V(c + s * px + (rand() - 0.5) * 0.05, 2.25, c), 0.075, PAL.woodDark, 0.05, 2, { moss: 0.25 });
    stick(L, V(c - px, 1.32, c), V(c + px, 1.32, c), 0.085, PAL.wood, { moss: 0.1, seg: 8, taper: 1 });
    stick(L, V(c + px, 1.32, c), V(c + px + 0.22, 1.32, c), 0.025, PAL.iron, { tex: 'plain', moss: 0, jitter: 0, seg: 4, taper: 1 });
    stick(L, V(c + px + 0.22, 1.32, c), V(c + px + 0.22, 1.08, c + 0.06), 0.022, PAL.iron, { tex: 'plain', moss: 0, jitter: 0, seg: 4, taper: 1 });
    stick(L, V(c + px + 0.22, 1.08, c + 0.06), V(c + px + 0.36, 1.08, c + 0.06), 0.03, PAL.woodLight, { moss: 0, jitter: 0, seg: 5, taper: 1 });
    for (let i = 0; i < 4; i++) L.push(part(new T.TorusGeometry(0.1, 0.018, 4, 8), '#6b5a3e', { m: M(c - 0.2 + i * 0.07, 1.32, c, 0, Math.PI / 2, 0), jitter: 0, ao: false }));
    stick(L, V(c + 0.1, 1.25, c + 0.06), V(c + 0.12, topY + 0.28, c + 0.08), 0.012, '#6b5a3e', { tex: 'plain', moss: 0, jitter: 0, seg: 3 });
    L.push(part(new T.CylinderGeometry(0.13, 0.1, 0.22, 8), PAL.wood, { m: M(c + 0.12, topY + 0.16, c + 0.08), tex: 'wood', axis: [0, 1, 0], jitter: 0.005 }));
    L.push(part(new T.TorusGeometry(0.125, 0.012, 3, 8), PAL.iron, { m: M(c + 0.12, topY + 0.2, c + 0.08, Math.PI / 2, 0, 0), jitter: 0, ao: false }));
    // двускатная крыша, густо заросшая зелёным мхом
    const ridge = 2.52, span = 0.82, eave = 1.95, pitch = Math.atan2(ridge - eave, span), sl = Math.hypot(span, ridge - eave) + 0.08, rw = px * 2 + 0.5;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const x = c - rw / 2 + (i + 0.5) * rw / 7;
        L.push(part(new T.BoxGeometry(rw / 7 - 0.01, 0.05, sl + (rand() - 0.5) * 0.1), PAL.roof,
          { m: M(x, (ridge + eave) / 2 + (rand() - 0.5) * 0.015, c + s * span / 2, s * pitch, 0, (rand() - 0.5) * 0.04), tex: 'roof', axis: [0, 0, 1], moss: 0.95, mossHex: C.mossGreen, jitter: 0.012, vary: 0.1 }));
        // мох на крыше колодца — сплошные кочки: крыша читается зелёной
        for (let k = 0; k < 3; k++) {
          if (rand() < 0.2) continue;
          const off = sl * (k / 2 - 0.5) * 0.75 + (rand() - 0.5) * 0.12;
          Nn.mossLump(L, x, (ridge + eave) / 2 + 0.035 - Math.sin(pitch) * off, c + s * (span / 2 + off * Math.cos(pitch)), 0.13 + rand() * 0.07);
        }
      }
      for (let i = 0; i < 6; i++) L.push(part(new T.ConeGeometry(0.06, 0.16 + rand() * 0.18, 3), '#4f6a33', { m: M(c - rw / 2 + rand() * rw, eave - 0.1, c + s * (span + 0.02), Math.PI, rand() * 3, 0), jitter: 0.01, ao: false, vary: 0.1 }));
      // фронтоны-треугольники
      const tri = new T.CylinderGeometry(0, 0.8, 0.5, 3, 1);
      L.push(part(tri, PAL.woodDark, { m: M(c + s * (rw / 2 - 0.08), ridge - 0.26, c, 0, 0, 0, V(0.07, 1, 1.2)).multiply(new T.Matrix4().makeRotationY(Math.PI / 2)), tex: 'wood', jitter: 0.008 }));
    }
    stick(L, V(c - rw / 2 - 0.08, ridge + 0.02, c), V(c + rw / 2 + 0.08, ridge + 0.02, c), 0.07, PAL.log, { moss: 0.7, seg: 7 });
    for (const s of [-1, 1]) stick(L, V(c + s * px, 2.2, c), V(c + s * px, ridge - 0.02, c), 0.05, PAL.woodDark, { moss: 0 });
    // красная тряпица на стойке, ведро на плите, трава
    H.rag(R, V(c - px - 0.08, 1.8, c + 0.02), 0.45, 0.1, 0.3);
    L.push(part(new T.CylinderGeometry(0.14, 0.11, 0.26, 8), PAL.wood, { m: M(c + 1.05, 0.2, c + 0.55, 0.1, 0, 0.08), tex: 'wood', axis: [0, 1, 0], jitter: 0.005 }));
    K.setSeed(95);
    for (let k = 0; k < 14; k++) { const a = rand() * 6.28, rr = 1.3 + rand() * 0.25; K.tuft(L, c + Math.cos(a) * rr, 0, c + Math.sin(a) * rr, 3, 0.3 + rand() * 0.2); }
    K.fern(L, c - 1.25, 0, c + 1.1, 0.8);
    g.add(K.facetGroup(L), K.facetGroup(R, { wind: { phase: 1.1, h: 3 } }));
    return { group: g };
  }

  // =====================================================================
  // ЛАВКА И СТОЛ
  // =====================================================================
  function buildYardTable(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick } = Nn;
    const g = new T.Group();
    const L = [];
    const cx = 1.55, cz = 1.0, tl = 1.75, top = 0.78;
    // столешница из четырёх досок
    for (let i = 0; i < 4; i++) L.push(part(new T.BoxGeometry(tl + (rand() - 0.5) * 0.06, 0.05, 0.19), i % 2 ? PAL.wood : PAL.woodLight,
      { m: M(cx + (rand() - 0.5) * 0.04, top + (rand() - 0.5) * 0.01, cz - 0.3 + i * 0.2, 0, (rand() - 0.5) * 0.02, 0), tex: 'wood', axis: [1, 0, 0], jitter: 0.006, moss: 0.05, vary: 0.08 }));
    // козлы крест-накрест
    for (const s of [-1, 1]) {
      const x = cx + s * (tl / 2 - 0.22);
      stick(L, V(x, 0, cz - 0.36), V(x, top - 0.03, cz + 0.3), 0.04, PAL.woodDark, { moss: 0.15, seg: 5 });
      stick(L, V(x, 0, cz + 0.36), V(x, top - 0.03, cz - 0.3), 0.04, PAL.woodDark, { moss: 0.15, seg: 5 });
    }
    stick(L, V(cx - tl / 2 + 0.22, 0.38, cz), V(cx + tl / 2 - 0.22, 0.38, cz), 0.03, PAL.woodDark, { moss: 0.1, seg: 5 });
    // лавка за столом
    const bz = cz - 0.72;
    L.push(part(new T.BoxGeometry(1.6, 0.06, 0.3), PAL.wood, { m: M(cx, 0.45, bz, 0, 0.02, 0.01), tex: 'wood', axis: [1, 0, 0], jitter: 0.008, moss: 0.1 }));
    for (const s of [-1, 1]) L.push(part(new T.BoxGeometry(0.07, 0.43, 0.26), PAL.woodDark, { m: M(cx + s * 0.62, 0.21, bz, 0, 0, s * 0.04), tex: 'wood', axis: [0, 1, 0], jitter: 0.008 }));
    // пень-сиденье с кольцами на срезе
    L.push(part(new T.CylinderGeometry(0.24, 0.28, 0.46, 9), PAL.bark, { m: M(cx - tl / 2 - 0.35, 0.23, cz + 0.05), tex: 'bark', axis: [0, 1, 0], jitter: 0.012, moss: 0.3 }));
    // бочка: клёпки, выпуклый бок, три обруча, крышка
    {
      const geo = new T.CylinderGeometry(0.29, 0.29, 0.78, 10, 4);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), f = 1 + 0.1 * (1 - (y / 0.39) ** 2); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
      const bx = cx + tl / 2 + 0.42, bzz = cz - 0.05;
      L.push(part(geo, PAL.wood, { m: M(bx, 0.39, bzz), tex: 'wood', axis: [0, 1, 0], jitter: 0.004, vary: 0.1 }));
      for (const y of [0.1, 0.39, 0.68]) L.push(part(new T.TorusGeometry(y === 0.39 ? 0.32 : 0.3, 0.018, 3, 10), PAL.iron, { m: M(bx, y, bzz, Math.PI / 2, 0, 0), jitter: 0, ao: false }));
      L.push(part(new T.CylinderGeometry(0.27, 0.27, 0.03, 10), PAL.woodDark, { m: M(bx, 0.785, bzz), tex: 'wood', axis: [1, 0, 0], jitter: 0 }));
    }
    // кувшин, миска, кружка
    L.push(part(new T.SphereGeometry(0.11, 7, 5), C.clay, { m: M(cx + 0.45, top + 0.12, cz + 0.05, 0, 0, 0, V(1, 1.15, 1)), jitter: 0.004, ao: false, vary: 0.06 }));
    L.push(part(new T.CylinderGeometry(0.045, 0.07, 0.12, 7), C.clay, { m: M(cx + 0.45, top + 0.27, cz + 0.05), jitter: 0, ao: false }));
    L.push(part(new T.CylinderGeometry(0.13, 0.08, 0.06, 8), PAL.woodLight, { m: M(cx - 0.2, top + 0.055, cz - 0.1), jitter: 0, ao: false }));
    L.push(part(new T.CylinderGeometry(0.045, 0.04, 0.1, 6), PAL.woodDark, { m: M(cx + 0.1, top + 0.075, cz + 0.2), jitter: 0, ao: false }));
    K.setSeed(97);
    for (const [x, z, s] of [[0.2, 1.8, 0.2], [2.9, 1.8, 0.16], [0.4, 0.25, 0.14]]) Nn.boulder(L, x, 0, z, s);
    for (let k = 0; k < 12; k++) K.tuft(L, rand() * 3.2, 0, rand() * 2, 3, 0.3 + rand() * 0.2);
    g.add(K.facetGroup(L));
    return { group: g };
  }

  // =====================================================================
  // УЛИЧНАЯ ПЕЧЬ
  // =====================================================================
  function buildStove(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick } = Nn;
    const g = new T.Group();
    const L = [], F = [];
    const cx = 1.3, cz = 1.2, w = 1.3, d = 1.1, h = 0.95;
    // ядро и облицовка камнем
    L.push(part(new T.BoxGeometry(w, h, d, 2, 2, 2), PAL.stoneDark, { m: M(cx, h / 2, cz), jitter: 0.03, tex: 'stone', moss: 0.2, vary: 0.1 }));
    const clad = (n, fn) => { for (let i = 0; i < n; i++) { const [x, y, z, sx, sy, sz] = fn(i); L.push(part(new T.DodecahedronGeometry(1, 0), rand() < 0.4 ? PAL.stoneDark : PAL.stone, { m: M(x, y, z, 0, rand() * 0.5, 0, V(sx, sy, sz)), jitter: 0.015, tex: 'stone', moss: 0.35, ao: false, vary: 0.1 })); } };
    for (let row = 0; row < 4; row++) {
      const y = 0.12 + row * 0.24;
      clad(5, (i) => [cx - w / 2 + 0.13 + i * 0.26 + (row % 2) * 0.1, y, cz + d / 2 + 0.01, 0.14, 0.11, 0.06]); // лицо
      clad(4, (i) => [cx + w / 2 + 0.01, y, cz - d / 2 + 0.14 + i * 0.27 + (row % 2) * 0.08, 0.06, 0.11, 0.14]); // бок
    }
    // купол
    const dome = new T.SphereGeometry(0.72, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    L.push(part(dome, PAL.stone, { m: M(cx, h - 0.05, cz, 0, 0.2, 0, V(0.95, 0.62, 0.8)), jitter: 0.03, tex: 'stone', moss: 0.45, vary: 0.1 }));
    // зев: тёмная ниша, арка из камней, огонь и угли
    const fz = cz + d / 2 + 0.03, fy = 0.52;
    L.push(part(new T.BoxGeometry(0.52, 0.4, 0.06), '#120d0a', { m: M(cx, fy, fz + 0.01), jitter: 0, ao: false, vary: 0 }));
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * (i / 6);
      L.push(part(new T.DodecahedronGeometry(1, 0), PAL.stone, { m: M(cx + Math.cos(a) * 0.36, fy + 0.12 + Math.sin(a) * 0.26, fz + 0.04, 0, 0, a, V(0.085, 0.1, 0.07)), jitter: 0.008, tex: 'stone', ao: false, vary: 0.08 }));
    }
    L.push(part(new T.BoxGeometry(0.72, 0.08, 0.3), PAL.stoneDark, { m: M(cx, 0.3, fz + 0.1), jitter: 0.012, tex: 'stone', vary: 0.08 })); // шесток
    for (let k = 0; k < 5; k++) F.push(part(new T.ConeGeometry(0.06 + rand() * 0.04, 0.16 + rand() * 0.14, 4), '#ff8a2a', { m: M(cx - 0.16 + k * 0.08, fy - 0.08, fz + 0.035, 0, rand() * 3, (rand() - 0.5) * 0.3), jitter: 0.01, ao: false, vary: 0 }));
    for (let k = 0; k < 7; k++) F.push(part(new T.IcosahedronGeometry(0.035, 0), '#ff5a1a', { m: M(cx - 0.2 + rand() * 0.4, fy - 0.16, fz + 0.04 + rand() * 0.03), jitter: 0, ao: false, vary: 0 }));
    for (let k = 0; k < 3; k++) stick(L, V(cx - 0.18 + k * 0.1, fy - 0.17, fz - 0.02), V(cx - 0.12 + k * 0.1, fy - 0.15, fz + 0.14), 0.03, PAL.woodDark, { moss: 0, seg: 5, jitter: 0 });
    // сужающаяся труба из камня, чуть кривая
    const chx = cx + 0.18, chz = cz - 0.28;
    let y = h + 0.2;
    for (let s = 0; s < 5; s++) {
      const wS = 0.46 - s * 0.05, hS = 0.3;
      L.push(part(new T.BoxGeometry(wS, hS, wS), s % 2 ? PAL.stone : PAL.stoneDark, { m: M(chx + s * 0.012, y + hS / 2, chz - s * 0.008, 0, (rand() - 0.5) * 0.2, (rand() - 0.5) * 0.04), jitter: 0.02, tex: 'stone', moss: 0.2, vary: 0.1 }));
      y += hS - 0.02;
    }
    L.push(part(new T.BoxGeometry(0.34, 0.05, 0.34), PAL.stoneDark, { m: M(chx + 0.06, y + 0.03, chz - 0.04), jitter: 0.01, tex: 'stone' }));
    const smoke = new T.Object3D();
    smoke.position.set(chx + 0.06, y + 0.12, chz - 0.04);
    g.add(smoke);
    // ящик-лавка и дрова
    const bx = cx + w / 2 + 0.55, bz = cz + 0.5;
    for (let i = 0; i < 3; i++) L.push(part(new T.BoxGeometry(0.62, 0.12, 0.04), PAL.wood, { m: M(bx, 0.08 + i * 0.13, bz + 0.22), tex: 'wood', axis: [1, 0, 0], jitter: 0.004 }));
    for (let i = 0; i < 3; i++) L.push(part(new T.BoxGeometry(0.62, 0.12, 0.04), PAL.wood, { m: M(bx, 0.08 + i * 0.13, bz - 0.22), tex: 'wood', axis: [1, 0, 0], jitter: 0.004 }));
    for (const s of [-1, 1]) L.push(part(new T.BoxGeometry(0.04, 0.4, 0.46), PAL.woodDark, { m: M(bx + s * 0.3, 0.2, bz), tex: 'wood', axis: [0, 1, 0], jitter: 0.004 }));
    L.push(part(new T.BoxGeometry(0.66, 0.04, 0.5), PAL.woodLight, { m: M(bx, 0.42, bz, 0, 0.03, 0), tex: 'wood', axis: [1, 0, 0], jitter: 0.004 }));
    for (let row = 0; row < 2; row++) for (let i = 0; i < 3 - row; i++) K.logWithRings(L, cx - w / 2 - 0.3, 0.1 + row * 0.18, cz - 0.3 + i * 0.2 + row * 0.1, 0.6, 0.085, Math.PI / 2, rand() < 0.5 ? PAL.woodLight : PAL.wood);
    K.setSeed(99);
    for (const [x, z, s] of [[0.2, 2.2, 0.18], [2.6, 0.25, 0.16]]) Nn.boulder(L, x, 0, z, s);
    for (let k = 0; k < 10; k++) K.tuft(L, rand() * 3, 0, rand() * 2.5, 3, 0.3 + rand() * 0.2);
    g.add(K.facetGroup(L));
    // огонь светится всегда: днём слабее, ночью ярче, с мерцанием
    const fireMat = new T.MeshStandardMaterial({ color: K.lin('#3a1a08'), emissive: K.lin('#ff6a1a'), emissiveIntensity: 2, roughness: 1, metalness: 0, flatShading: true });
    g.add(new T.Mesh(K.merge(F), fireMat));
    const light = K.addGlowLight(g, cx, fy + 0.05, fz + 0.35, 1.6, 6);
    light.color = 0xff8a3a;
    light.prio = 1;
    const flick = (t) => 1 + Math.sin(t * 9.1) * 0.12 + Math.sin(t * 23.3 + 1.1) * 0.08 + Math.sin(t * 3.7) * 0.06;
    light.dyn = (glow, t) => (0.45 + glow * 1.2) * 1.6 * flick(t + 0.4);
    function update(dt, t) {
      const n = K.view ? Math.max(0, (K.view.state.time - 0.25) / 0.75) : 0.4;
      fireMat.emissiveIntensity = (1.4 + n * 1.6) * flick(t);
    }
    return { group: g, update, smokes: [smoke], fire: { update } };
  }

  // =====================================================================
  // УПАВШЕЕ ДЕРЕВО
  // =====================================================================
  function buildFallenTree(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const les = LES();
    const g = new T.Group();
    const L = [], R = [], E = [];
    const a = V(0.9, 0.34, 1.0), b = V(4.6, 0.24, 1.25);
    // ствол из трёх колен, толстый мох по верху
    const pts = [a, a.clone().lerp(b, 0.35).add(V(0, 0.04, -0.08)), a.clone().lerp(b, 0.7).add(V(0, -0.02, 0.06)), b];
    for (let i = 0; i < 3; i++) stick(L, pts[i], pts[i + 1], 0.3 - i * 0.04, PAL.bark, { tex: 'bark', moss: 0.8, seg: 9, taper: 0.88 });
    // слом: светлая щепа
    const dir = b.clone().sub(a).normalize();
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * 6.28, off = V(0, Math.cos(ang) * 0.13, Math.sin(ang) * 0.13), hh = 0.18 + rand() * 0.25;
      L.push(part(new T.ConeGeometry(0.06, hh, 3), k % 2 ? C.innerWood : PAL.bark, { m: M(b.x + hh / 2 - 0.02, b.y + off.y, b.z + off.z, 0, 0, -Math.PI / 2 + (rand() - 0.5) * 0.4), jitter: 0.01, ao: false, vary: 0.06 }));
    }
    // корневище: земляной диск и корни
    L.push(part(new T.CylinderGeometry(0.75, 0.7, 0.22, 9), PAL.dirt, { m: M(a.x - 0.18, 0.62, a.z, 0, 0, Math.PI / 2 - 0.12), jitter: 0.06, tex: 'dirt', vary: 0.1, ao: false, moss: 0.4, mossHex: PAL.grass }));
    for (let k = 0; k < 9; k++) {
      const ang = (k / 9) * 6.28 + rand() * 0.4, p0 = V(a.x - 0.2, 0.62 + Math.sin(ang) * 0.35, a.z + Math.cos(ang) * 0.35);
      stick(L, p0, p0.clone().add(V(-0.25 - rand() * 0.2, Math.sin(ang) * 0.55, Math.cos(ang) * 0.55)), 0.05, PAL.bark, { tex: 'bark', moss: 0.1, taper: 0.3, seg: 5 });
    }
    Nn.boulder(L, a.x - 0.3, 0.35, a.z + 0.2, 0.14, { moss: 0.2 });
    // сучья-обрубки
    for (const [f, s] of [[0.3, 1], [0.55, -1], [0.78, 1]]) {
      const p = a.clone().lerp(b, f).add(V(0, 0.2, 0));
      stick(L, p, p.clone().add(V(0.15, 0.45, s * 0.3)), 0.05, PAL.bark, { tex: 'bark', moss: 0.2, taper: 0.4, seg: 5 });
    }
    // красная верёвка обмоткой с хвостами
    for (let k = 0; k < 3; k++) {
      const p = a.clone().lerp(b, 0.46 + k * 0.035);
      R.push(part(new T.TorusGeometry(0.27, 0.022, 4, 10), C.rope, { m: M(p.x, p.y, p.z, 0, Math.PI / 2 - Math.atan2(dir.z, dir.x) + 0.15 * (k - 1), 0), jitter: 0.004, ao: false, vary: 0.05 }));
    }
    const kn = a.clone().lerp(b, 0.5).add(V(0, -0.05, 0.28));
    H.rag(R, kn, 0.4, 0.05, 0.4);
    H.rag(R, kn.clone().add(V(0.08, 0, 0)), 0.3, 0.04, 1.1);
    // кол с черепом
    const st = V(2.95, 0, 2.05);
    stick(L, st.clone().setY(-0.1), st.clone().setY(1.15), 0.05, PAL.woodDark, { moss: 0.1, seg: 6 });
    L.push(part(new T.ConeGeometry(0.05, 0.16, 6), PAL.woodDark, { m: M(st.x, 1.23, st.z), jitter: 0 }));
    H.placeSkull(L, E, st.x, 1.18, st.z + 0.02, 0.5, 0.9, 0.55);
    H.rag(R, V(st.x - 0.04, 0.92, st.z + 0.05), 0.45, 0.08, 0.2);
    // мелочь вокруг
    K.setSeed(103);
    for (const [x, z] of [[1.6, 1.8], [3.9, 0.5], [0.4, 0.3]]) K.fern(L, x, 0, z, 0.8);
    for (let k = 0; k < 14; k++) K.tuft(L, rand() * 5, 0, rand() * 2.4, 3, 0.3 + rand() * 0.22);
    K.mushrooms(L, 2.2, 0, 0.62);
    g.add(K.facetGroup(L), K.facetGroup(R, { wind: { phase: 3.3, h: 3 } }));
    const red = les.redMesh(K, E, 3);
    g.add(red.mesh);
    les.redLight(K, g, st.x, 1.2, st.z + 0.3, 0.9, 3.5);
    return { group: g, update: (dt, t) => les.updateRed(K, t) };
  }

  // =====================================================================
  // БОЛОТЦЕ
  // =====================================================================
  /** Вода, камыш, рогоз, кувшинки, коряга вокруг центра (cx, cz), радиус R. Земля — снаружи. */
  function swampParts(K, g, cx, cz, R, gy) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick } = Nn;
    const L = [], W = [];
    const water = new T.Mesh(new T.CircleGeometry(R, 20), waterMaterial(K));
    { const p = water.geometry.attributes.position; for (let i = 1; i < p.count; i++) { const f = 0.9 + 0.12 * Math.sin(i * 1.7) + rand() * 0.05; p.setX(i, p.getX(i) * f); p.setY(i, p.getY(i) * f * 0.85); } }
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, -0.1, cz);
    water.receiveShadow = true;
    g.add(water);
    for (let i = 0; i < 22; i++) {
      const a = rand() * 6.28, r = R * (0.8 + rand() * 0.35), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.85;
      Nn.reeds(W, x, Math.max(-0.2, gy(x, z)), z, 4 + Math.floor(rand() * 4), 1.0 + rand() * 0.6);
    }
    for (let i = 0; i < 7; i++) {
      const a = rand() * 6.28, r = R * rand() * 0.7, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
      L.push(part(new T.CylinderGeometry(0.16 + rand() * 0.06, 0.16, 0.015, 7, 1, false, 0.3, 5.7), rand() < 0.5 ? C.leaf : C.leafDark, { m: M(x, -0.085, z, 0, rand() * 6, 0), jitter: 0, ao: false, vary: 0.06 }));
    }
    for (let i = 0; i < 6; i++) { const a = rand() * 6.28, r = R * (1.0 + rand() * 0.15), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.85; Nn.boulder(L, x, gy(x, z) - 0.1, z, 0.14 + rand() * 0.14, { moss: 0.6 }); }
    // коряга из воды
    stick(L, V(cx + R * 0.35, -0.3, cz - R * 0.2), V(cx + R * 0.55, 0.55, cz - R * 0.3), 0.07, C.deadBark, { tex: 'bark', moss: 0.3, seg: 5, taper: 0.5 });
    stick(L, V(cx + R * 0.5, 0.35, cz - R * 0.28), V(cx + R * 0.72, 0.62, cz - R * 0.12), 0.035, C.deadBark, { tex: 'bark', moss: 0, seg: 4, taper: 0.4 });
    g.add(K.facetGroup(L), K.facetGroup(W, { wind: { phase: 6.1, h: 1.6 } }));
    return rippler([water]);
  }
  function buildSwamp(K) {
    const { T } = K;
    const g = new T.Group();
    const N = 6, cx = 3, cz = 3, R = 1.9;
    const hgt = (x, z) => {
      const d = Math.hypot(x - cx, (z - cz) / 0.85);
      let h = Math.sin(x * 1.3 + z * 0.7) * 0.03;
      h -= 0.3 * (1 - Math.min(1, Math.max(0, (d - R * 0.5) / (R * 0.75))));
      return h;
    };
    g.add(K.facetGroup(groundGeos(K, N, hgt, () => 0, (x, z) => (Math.hypot(x - cx, (z - cz) / 0.85) < R * 1.02 ? 1 : 0), 0.7)));
    const ripple = swampParts(K, g, cx, cz, R, hgt);
    K.setSeed(111);
    const L = [];
    for (let k = 0; k < 40; k++) { const x = 0.3 + K.rand() * 5.4, z = 0.3 + K.rand() * 5.4; if (Math.hypot(x - cx, (z - cz) / 0.85) > R + 0.2) K.tuft(L, x, hgt(x, z), z, 3, 0.3 + K.rand() * 0.2); }
    g.add(K.facetGroup(L));
    return { group: g, update: (dt, t) => ripple(t) };
  }

  // =====================================================================
  // СЛОМАННАЯ ИЗГОРОДЬ
  // =====================================================================
  function buildBrokenFence(K, into) {
    const { T, PAL, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const g = new T.Group();
    const L = into || [], R = [];
    const posts = [[0.3, 1.05, 0.05, 1.15], [1.35, 0.95, -0.12, 1.2], [2.4, 1.1, 0.22, 1.0], [3.35, 0.9, -0.05, 1.25], [3.85, 1.2, 0.35, 0.75]];
    const tops = posts.map(([x, z, lean, h]) => {
      const top = V(x + lean * h * 0.5, h, z + (rand() - 0.5) * 0.1);
      stick(L, V(x, -0.15, z), top, 0.065, rand() < 0.5 ? PAL.wood : PAL.woodLight, { moss: 0.3, seg: 6 });
      L.push(K.part(new T.ConeGeometry(0.06, 0.1, 5), PAL.woodDark, { m: K.M(top.x, top.y + 0.04, top.z, 0, 0, lean * 0.5), jitter: 0.01, ao: false }));
      return { x, z, lean, h };
    });
    const at = (i, y) => { const p = tops[i]; return V(p.x + p.lean * y * 0.5, y, p.z); };
    // целые пролёты
    for (const y of [0.4, 0.8]) H.crooked(L, at(0, y), at(1, y + (rand() - 0.5) * 0.08), 0.035, PAL.wood, 0.05, 2, { moss: 0.15 });
    H.crooked(L, at(1, 0.42), at(2, 0.38), 0.035, PAL.wood, 0.05, 2, { moss: 0.15 });
    // повисшая жердь: верхний конец на столбе, нижний на земле
    stick(L, at(1, 0.82), V(2.2, 0.05, 1.25), 0.034, PAL.wood, { moss: 0.2, seg: 5 });
    // сломанная жердь: обломок торчит из столба
    stick(L, at(2, 0.8), at(2, 0.8).add(V(0.38, -0.06, 0.02)), 0.034, PAL.wood, { moss: 0.1, seg: 5, taper: 0.5 });
    H.crooked(L, at(2, 0.4), at(3, 0.45), 0.035, PAL.wood, 0.05, 2, { moss: 0.15 });
    stick(L, at(3, 0.8), at(4, 0.62), 0.034, PAL.wood, { moss: 0.1, seg: 5 });
    // выпавшая жердь в траве и щепки
    stick(L, V(2.7, 0.04, 1.55), V(3.9, 0.05, 1.7), 0.034, PAL.wood, { moss: 0.3, seg: 5 });
    stick(L, V(0.8, 0.03, 1.6), V(1.1, 0.04, 1.75), 0.03, PAL.woodDark, { moss: 0.1, seg: 4, taper: 0.4 });
    H.rag(R, at(0, 1.0).add(V(0.05, 0, 0.04)), 0.4, 0.07, 0.2);
    K.setSeed(117);
    for (const [x, z, s] of [[0.7, 0.4, 0.2], [2.9, 0.5, 0.15], [4.2, 1.6, 0.24], [1.9, 1.7, 0.12]]) Nn.boulder(L, x, 0, z, s);
    for (let k = 0; k < 18; k++) K.tuft(L, rand() * 4.2, 0, rand() * 2, 3, 0.3 + rand() * 0.25);
    if (!into) g.add(K.facetGroup(L));
    g.add(K.facetGroup(R, { wind: { phase: 2.9, h: 3 } }));
    return { group: g };
  }

  // =====================================================================
  // ПРОКЛЯТОЕ ДЕРЕВО
  // =====================================================================
  function buildCursedTree(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const les = LES();
    const g = new T.Group();
    const L = [], R = [], E = [];
    const c = V(2, 0, 2);
    H.mound(L, c.x, c.z, 1.3, 1.1, 0.22);
    const { tips, trunk } = Nn.gnarled(L, c.clone().setY(0.02), 3.0, 0.26);
    // красные тряпки и узелки на ветвях
    tips.sort((p, q) => q.y - p.y);
    tips.forEach((p, i) => {
      if (p.y < 1.1) return;
      if (i % 4 === 1) Nn.bundle(L, p, 0.25 + rand() * 0.25);
      else if (i % 4 !== 3) H.rag(R, p, 0.45 + rand() * 0.5, 0.08 + rand() * 0.05, rand() * 3);
    });
    // красный знак на стволе — светится ночью
    const tp = trunk[1].clone().lerp(trunk[2], 0.3), rr = 0.24, zf = tp.z + rr;
    E.push(part(new T.BoxGeometry(0.04, 0.42, 0.02), '#ff3a22', { m: M(tp.x, tp.y, zf), jitter: 0, ao: false, vary: 0 }));
    for (const s of [-1, 1]) E.push(part(new T.BoxGeometry(0.035, 0.22, 0.02), '#ff3a22', { m: M(tp.x + s * 0.07, tp.y + 0.1, zf - 0.01, 0, 0, s * 0.7), jitter: 0, ao: false, vary: 0 }));
    E.push(part(new T.BoxGeometry(0.18, 0.035, 0.02), '#ff3a22', { m: M(tp.x, tp.y - 0.14, zf), jitter: 0, ao: false, vary: 0 }));
    // кости и камни у корней
    H.boneBit(L, c.x + 0.7, 0.05, c.z + 0.5, 0.3, 0.6);
    H.boneBit(L, c.x - 0.5, 0.05, c.z + 0.75, 0.25, 2.0);
    H.placeSkull(L, E, c.x + 0.55, 0.12, c.z + 0.85, 0.9, 0.55, 0);
    K.setSeed(121);
    for (const [x, z, s] of [[0.6, 2.9, 0.22], [3.3, 1.1, 0.26], [3.4, 3.2, 0.16]]) Nn.boulder(L, x, 0, z, s);
    for (let k = 0; k < 14; k++) K.tuft(L, rand() * 4, 0, rand() * 4, 3, 0.28 + rand() * 0.2);
    g.add(K.facetGroup(L, { wind: { phase: 0.7, h: 14 } }), K.facetGroup(R, { wind: { phase: 1.9, h: 5 } }));
    const red = les.redMesh(K, E, 2.5);
    g.add(red.mesh);
    les.redLight(K, g, tp.x, tp.y, zf + 0.5, 1.0, 4);
    return { group: g, update: (dt, t) => les.updateRed(K, t) };
  }

  // =====================================================================
  // СЦЕНА «ОПУШКА» 20×20 м
  // =====================================================================
  function buildClearing(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick } = Nn;
    const N = 20, g = new T.Group();
    const SW = [14.8, 15.6, 2.1];
    const FLAT = [[7.6, 7.6, 10.6, 10.6], [2.0, 10.4, 4.6, 12.8], [11.4, 8.6, 15.2, 11.2], [15.4, 11.4, 18.8, 14.4], [4.4, 14.2, 9.8, 16.8], [16.0, 2.0, 20, 7.5], [7.4, 2.4, 11.6, 6.6]];
    const flatF = (x, z) => { let f = 1; for (const [ax, az, bx, bz] of FLAT) { const dx = Math.max(ax - x, 0, x - bx), dz = Math.max(az - z, 0, z - bz); f = Math.min(f, Math.min(1, Math.hypot(dx, dz) / 0.8)); } return f; };
    const PATHS = [[[9.1, 10.6], [9.4, 13.0], [9.6, 16.5], [9.8, 20]], [[9.1, 9.1], [5.2, 11.6], [3.4, 12.4]], [[10.6, 9.1], [12.9, 10.2]], [[12.9, 10.2], [16.5, 12.4]]];
    const segDist = (x, z, a, b) => { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t); };
    const pathD = (x, z) => { let d = 99; for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i], p[i + 1])); return d; };
    const swD = (x, z) => Math.hypot(x - SW[0], (z - SW[1]) / 0.85);
    const HUM = [[5.5, 6.0, 1.0, 0.22], [13.0, 5.5, 0.8, 0.18], [18.0, 17.5, 1.2, 0.26], [1.5, 17.0, 0.9, 0.2], [12.2, 17.8, 0.7, 0.15], [6.8, 18.6, 0.8, 0.2]];
    const hgt = (x, z) => {
      let h = (Math.sin(x * 0.8 + z * 0.35) * 0.5 + Math.sin(z * 1.1 - x * 0.6) * 0.35) * 0.07;
      for (const [hx, hz, r, hh] of HUM) { const d = Math.hypot(x - hx, z - hz); if (d < r) h += hh * (1 - (d / r) ** 2); }
      const pd = pathD(x, z);
      if (pd < 0.65) h = h * (pd / 0.65) - 0.035 * (1 - pd / 0.65);
      h *= flatF(x, z);
      const d = swD(x, z);
      h -= 0.3 * (1 - Math.min(1, Math.max(0, (d - SW[2] * 0.5) / (SW[2] * 0.75))));
      return h;
    };
    g.add(K.facetGroup(groundGeos(K, N, hgt, (x, z) => Math.max(0, Math.min(1, (0.85 - pathD(x, z)) / 0.45)), (x, z) => (swD(x, z) < SW[2] * 1.02 ? 1 : 0))));
    const place = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); return o; };
    const smokes = [];
    // лес: ельник слева-сзади, березняк справа-сзади, ели за краями уходят в дымку
    K.setSeed(201); g.add(buildSpruceGrove(K, 0.2, 0.2, hgt));
    K.setSeed(202); g.add(buildBirchGrove(K, 12.2, -1.0, (x, z) => (z < 0 ? -0.3 : hgt(x, z))));
    [[-1.5, 3, 14], [-2, 8, 12], [-1.4, 12.5, 15], [-2.1, 17, 13], [3, -1.8, 13], [7.5, -2.2, 16], [-3, -2.5, 16], [0.8, 9.2, 9], [0.6, 14.5, 8]].forEach(([x, z, h], i) => {
      const t = K.buildSpruce(h, 60 + i);
      t.position.set(x, x < 0 || z < 0 ? -0.6 : hgt(x, z), z);
      g.add(t);
    });
    [[17.5, -1.8, 10, 11], [20.8, 1.5, 9, 12], [21.4, 6.5, 8.5, 13], [20.9, 10.8, 9.5, 14]].forEach(([x, z, h, s]) => { const t = Nn.birch(h, s); t.position.set(x, -0.5, z); g.add(t); });
    // бытовые объекты
    K.setSeed(211); place(buildWell(K).group, 7.6, 7.6);
    K.setSeed(212); place(buildOuthouse(K).group, 2.2, 10.6, Math.PI / 2 * 0);
    K.setSeed(213); place(buildYardTable(K).group, 11.6, 8.8);
    K.setSeed(214); const stove = buildStove(K); place(stove.group, 15.6, 11.5); smokes.push(...stove.smokes);
    K.setSeed(215); const fallen = buildFallenTree(K); place(fallen.group, 4.6, 14.4);
    K.setSeed(216); place(buildBrokenFence(K).group, 16.2, 16.6, -Math.PI / 2 * 0.3);
    K.setSeed(217); const cursed = buildCursedTree(K); place(cursed.group, 7.6, 2.6);
    K.setSeed(218); const ripple = swampParts(K, g, SW[0], SW[1], SW[2], hgt);
    // мелочь по правилу детализации
    K.setSeed(219);
    const D = [];
    for (const [x, z, s] of [[6.2, 12.4, 0.35], [13.5, 13.8, 0.3], [18.8, 9.2, 0.45], [1.0, 19.0, 0.5], [11.4, 19.0, 0.35], [19.2, 19.2, 0.4]]) Nn.boulder(D, x, hgt(x, z) - 0.06, z, s);
    for (const [x, z] of [[1.2, 8.0], [5.8, 17.8], [12.4, 15.2], [18.8, 8.2], [10.8, 6.8], [2.4, 18.8]]) K.fern(D, x, hgt(x, z), z, 0.9 + rand() * 0.3);
    for (const [x, z] of [[13.2, 6.8], [11.2, 12.6], [17.8, 15.0], [6.6, 19.2], [1.8, 15.6]]) Nn.leafPlant(D, x, hgt(x, z), z, 1.0);
    for (let k = 0; k < 40; k++) { const x = 11 + rand() * 8.5, z = 0.4 + rand() * 7.5; if (flatF(x, z) < 1) continue; Nn.daisy(D, x, hgt(x, z), z, 0.22 + rand() * 0.14); }
    for (let k = 0; k < 20; k++) { const x = 0.4 + rand() * 19, z = 12 + rand() * 7.6; if (swD(x, z) < SW[2] + 0.3 || pathD(x, z) < 0.6) continue; Nn.daisy(D, x, hgt(x, z), z, 0.2 + rand() * 0.12); }
    for (let k = 0; k < 200; k++) {
      const x = 0.3 + rand() * 19.4, z = 0.3 + rand() * 19.4;
      if (swD(x, z) < SW[2] || pathD(x, z) < 0.5 || flatF(x, z) < 0.5) continue;
      K.tuft(D, x, hgt(x, z), z, 3 + Math.floor(rand() * 2), 0.28 + rand() * 0.25);
    }
    for (const [x, z, len, ry] of [[12.8, 14.4, 1.3, 0.3], [2.4, 7.8, 1.1, 2.0], [18.4, 13.6, 1.0, -1.2]]) Nn.fallenBranch(D, x, hgt(x, z), z, len, ry);
    g.add(K.facetGroup(D));
    function update(dt, t) {
      stove.update(dt, t);
      LES().updateRed(K, t);
      ripple(t);
    }
    return { group: g, update, smokes };
  }


  // =====================================================================
  // РИТУАЛЬНЫЙ СТОЛБ (референс v4): брус с расколотой макушкой, красная обмотка с рваными концами,
  // кость на верёвке, красная руна, замшелые камни, камень со свечой и оплывшим воском
  // =====================================================================
  function buildRitualPost(K) {
    const { T, PAL, M, part, rand } = K;
    const Nn = nature(K), { V, stick, H } = Nn;
    const les = LES();
    const g = new T.Group();
    const L = [], R = [], E = [], G = [];
    const cx = 1.2, cz = 1.1, Hh = 3.1, pw = 0.36;
    // брус с фасками, чуть наклонён; расколотая пирамидальная макушка
    const tilt = 0.035;
    const bar = new T.Shape();
    { const x = pw / 2, c = 0.06; bar.moveTo(-x + c, -x); bar.lineTo(x - c, -x); bar.lineTo(x, -x + c); bar.lineTo(x, x - c); bar.lineTo(x - c, x); bar.lineTo(-x + c, x); bar.lineTo(-x, x - c); bar.lineTo(-x, -x + c); }
    const bg = new T.ExtrudeGeometry(bar, { depth: Hh, bevelEnabled: false, steps: 8 });
    bg.rotateX(-Math.PI / 2);
    { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y / Hh * 0.12)); p.setZ(i, p.getZ(i) * (1 - y / Hh * 0.12)); } }
    L.push(part(bg, PAL.wood, { m: M(cx, -0.1, cz, tilt, 0.15, -tilt), tex: 'wood', axis: [0, 1, 0], moss: 0.15, jitter: 0.012, vary: 0.1 }));
    const top = Hh - 0.1;
    for (const [dx, sc, h] of [[-0.045, 0.52, 0.5], [0.06, 0.42, 0.38]]) { // две половины раскола
      L.push(part(new T.ConeGeometry(pw * sc, h, 4), dx < 0 ? PAL.wood : PAL.woodLight, { m: M(cx + dx, top + h / 2, cz, 0, Math.PI / 4 + 0.15, dx * 2), tex: 'wood', axis: [0, 1, 0], jitter: 0.008 }));
    }
    L.push(part(new T.BoxGeometry(0.03, 0.55, pw * 0.8), PAL.woodDark, { m: M(cx + 0.005, top + 0.05, cz, 0, 0.15, 0), jitter: 0 })); // щель
    for (const [y, rz] of [[1.2, 0.2], [0.7, -0.15], [2.2, 0.1]]) L.push(part(new T.BoxGeometry(0.025, 0.36, 0.03), PAL.woodDark, { m: M(cx + 0.06, y, cz + pw / 2 - 0.01, 0, 0.15, rz), jitter: 0 }));
    // красная обмотка: три кольца-бинта и рваные свисающие концы
    const ragC = ['#8f3527', '#7b3526', '#a13d2c'];
    for (let k = 0; k < 3; k++) {
      const y = 2.05 + k * 0.17, r = pw * 0.62 + 0.02;
      const band = new T.CylinderGeometry(r, r * 1.02, 0.15, 8, 1, true);
      L.push(part(band, ragC[k], { m: M(cx + 0.02, y, cz, (rand() - 0.5) * 0.16, rand() * 3, (rand() - 0.5) * 0.16), jitter: 0.015, tex: 'cloth', ao: false, vary: 0.08 }));
    }
    for (let k = 0; k < 7; k++) {
      const a = -0.9 + k * 0.45 + (rand() - 0.5) * 0.2, r = pw * 0.62;
      H.rag(R, V(cx + Math.cos(a) * r, 2.05 + rand() * 0.25, cz + Math.sin(a) * r), 0.5 + rand() * 0.7, 0.1 + rand() * 0.06, -a + Math.PI / 2);
    }
    // кость на верёвке
    stick(L, V(cx + 0.02, 2.28, cz + pw * 0.62), V(cx + 0.08, 1.98, cz + pw * 0.66), 0.012, '#6b5a3e', { tex: 'plain', moss: 0, jitter: 0, seg: 3 });
    H.boneBit(L, cx + 0.1, 1.82, cz + pw * 0.68, 0.34, 0, 0.12);
    // красная руна: светится ночью (общая настройка красного свечения)
    const rx = cx + 0.04, ry = 1.25, rzf = cz + pw * 0.5 + 0.012;
    E.push(part(new T.BoxGeometry(0.035, 0.5, 0.02), '#ff3a22', { m: M(rx, ry, rzf), jitter: 0, ao: false, vary: 0 }));
    for (const [dy, a] of [[0.12, 0.7], [0.12, -0.7], [-0.1, 0.7], [-0.1, -0.7]]) E.push(part(new T.BoxGeometry(0.03, 0.2, 0.02), '#ff3a22', { m: M(rx + Math.sin(a) * 0.06, ry + dy, rzf, 0, 0, a), jitter: 0, ao: false, vary: 0 }));
    // камни с мхом у основания
    for (const [x, z, s] of [[0.45, 1.55, 0.36], [0.75, 2.0, 0.3], [1.3, 1.95, 0.26], [0.55, 0.75, 0.24], [1.75, 0.55, 0.2]]) Nn.boulder(L, x, -0.05, z, s, { moss: 0.7 });
    // камень со свечой: оплывший воск, верёвка с косточкой
    const sx = 1.95, sz = 1.55;
    L.push(part(new T.IcosahedronGeometry(1, 1), PAL.stone, { m: M(sx, 0.32, sz, 0, 0.4, 0, V(0.34, 0.42, 0.3)), jitter: 0.03, tex: 'stone', moss: 0.45, vary: 0.1 }));
    L.push(part(new T.CylinderGeometry(0.3, 0.32, 0.08, 7), PAL.stone, { m: M(sx, 0.7, sz, 0, 0.3, 0), jitter: 0.02, tex: 'stone', moss: 0.2 }));
    const wax = '#e8dcc0';
    L.push(part(new T.CylinderGeometry(0.075, 0.09, 0.2, 7), wax, { m: M(sx, 0.84, sz), jitter: 0.006, ao: false, vary: 0.05 }));
    L.push(part(new T.CylinderGeometry(0.13, 0.16, 0.04, 8), wax, { m: M(sx + 0.02, 0.75, sz + 0.01), jitter: 0.01, ao: false, vary: 0.05 }));
    for (let k = 0; k < 6; k++) { // потёки воска по краю камня
      const a = rand() * 6.28, len = 0.08 + rand() * 0.22;
      L.push(part(new T.CylinderGeometry(0.018, 0.028, len, 5), wax, { m: M(sx + Math.cos(a) * 0.27, 0.72 - len / 2, sz + Math.sin(a) * 0.25), jitter: 0.004, ao: false, vary: 0.05 }));
      L.push(part(new T.IcosahedronGeometry(0.024, 0), wax, { m: M(sx + Math.cos(a) * 0.27, 0.72 - len, sz + Math.sin(a) * 0.25), jitter: 0, ao: false }));
    }
    L.push(part(new T.CylinderGeometry(0.006, 0.006, 0.05, 3), '#1d1a17', { m: M(sx, 0.965, sz), jitter: 0, ao: false }));
    stick(L, V(sx + 0.3, 0.6, sz + 0.05), V(sx + 0.36, 0.3, sz + 0.1), 0.012, '#6b5a3e', { tex: 'plain', moss: 0, jitter: 0, seg: 3 });
    H.boneBit(L, sx + 0.37, 0.22, sz + 0.12, 0.18, 0.4, 0.2);
    // пламя свечи: светится всегда, мерцает
    const flame = new T.MeshStandardMaterial({ color: K.lin('#3a1a08'), emissive: K.lin('#ffb24a'), emissiveIntensity: 3, roughness: 1, metalness: 0, flatShading: true });
    const F = [part(new T.ConeGeometry(0.035, 0.13, 5), '#ffb24a', { m: M(sx, 1.05, sz), jitter: 0, ao: false, vary: 0 }),
      part(new T.IcosahedronGeometry(0.03, 0), '#ffb24a', { m: M(sx, 1.0, sz), jitter: 0, ao: false, vary: 0 })];
    const flameMesh = new T.Mesh(K.merge(F), flame);
    const light = K.addGlowLight(g, sx, 1.1, sz + 0.1, 1.1, 4.5);
    light.color = 0xffa04a;
    light.prio = 1;
    const flick = (t) => 1 + Math.sin(t * 11.3) * 0.12 + Math.sin(t * 27.1 + 0.7) * 0.07;
    light.dyn = (glow, t) => (0.35 + glow) * 1.1 * flick(t);
    // трава, мох
    K.setSeed(131);
    for (let k = 0; k < 14; k++) K.tuft(L, 0.2 + rand() * 2.2, 0, 0.2 + rand() * 2.2, 3, 0.3 + rand() * 0.2);
    K.fern(L, 0.3, 0, 2.2, 0.7);
    g.add(K.facetGroup(L), K.facetGroup(R, { wind: { phase: 3.7, h: 3 } }), flameMesh);
    const red = les.redMesh(K, E, 2.2);
    g.add(red.mesh);
    les.redLight(K, g, rx, ry, rzf + 0.45, 0.8, 3.5);
    function update(dt, t) {
      const n = K.view ? Math.max(0, (K.view.state.time - 0.25) / 0.75) : 0.4;
      flame.emissiveIntensity = (2.2 + n * 2) * flick(t);
      les.updateRed(K, t);
    }
    return { group: g, update };
  }

  // природные детали и земля — для assets.js и конструктора
  window.LPK_NATURE = nature;
  window.LPK_GROUND = groundGeos;
  window.LPK_WATER = waterMaterial;

  // ---------- регистрация ----------
  const reg =(id, name, footprint, heightM, seed, fn, extra = {}) => models.push({
    id, name, footprint, heightM, seed, ...extra,
    build(K) {
      const out = fn(K);
      const o = out.isObject3D ? { group: out } : out;
      if (extra.redPanel) o.panel = LES().makePanel(id);
      return o;
    },
  });
  reg('spruce_grove', 'Ельник', [7, 7], 9.5, 201, (K) => buildSpruceGrove(K));
  reg('birch_grove', 'Березняк', [7, 7], 9.8, 202, (K) => buildBirchGrove(K));
  reg('outhouse', 'Туалет', [2, 2], 2.9, 212, (K) => buildOuthouse(K));
  reg('well', 'Колодец', [3, 3], 2.6, 211, (K) => buildWell(K));
  reg('yard_table', 'Стол', [3.4, 2], 1.1, 213, (K) => buildYardTable(K), { humanGap: 1.0 });
  reg('stove', 'Печь', [3, 2.5], 2.6, 214, (K) => buildStove(K));
  reg('fallen_tree', 'Валежина', [5, 2.4], 1.4, 215, (K) => buildFallenTree(K), { redPanel: true });
  reg('swamp', 'Болото', [6, 6], 1.6, 218, (K) => buildSwamp(K), { noPlate: true, humanAt: [6.6, 0, 3.2] });
  reg('broken_fence', 'Изгородь', [4.2, 2], 1.3, 216, (K) => buildBrokenFence(K));
  reg('cursed_tree', 'Сухое древо', [4, 4], 4.4, 217, (K) => buildCursedTree(K), { redPanel: true });
  reg('ritual_post', 'Столб', [2.6, 2.4], 3.6, 231, (K) => buildRitualPost(K), { redPanel: true });
  reg('clearing', 'Опушка', [20, 20], 12, 2, (K) => buildClearing(K), { noPlate: true, humanAt: [10.2, 0, 12.2], zoom: 1.2, redPanel: true,
    fog: { center: [10, 10.5], clear: 7.6, falloff: 3.4, height: 1.7, top: 9, ground: 0, density: 0.62 } });
})();
