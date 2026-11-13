/**
 * Новые модели для лоуполи-кита «Русской хтони».
 *
 * Каждая модель регистрируется в window.LPK_MODELS и строится функцией build(K),
 * где K = window.LPK — те же функции и параметры, что у стенда v3:
 *   K.part(geo, hex, { m, jitter, vary, moss, mossHex, ao, base, side, tex, axis })
 *   K.M(x, y, z, rx, ry, rz, s) — матрица детали
 *   K.facetGroup(list, { wind }) — меши по видам росписи
 *   K.glassMesh(list), K.addGlowLight(group, x, y, z, intensity, distance) — ночные огни
 *   K.rock / K.tuft / K.fern / K.mushrooms / K.logWithRings — мелочь окружения
 *   K.PAL — палитра, K.rand() — детерминированный шум (seed задаётся полем seed)
 *
 * Координаты модели: метры, footprint от (0,0,0) до (width,0,depth), Y вверх.
 * Кит сам ставит подставку, сдвигает модель на 0,5 м и ставит человека 1,75 м.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);

  // ---------- ритуальный столб: 1 × 1 м, высота 2,2 м, явная хтонь ----------
  models.push({
    id: 'ritual',
    name: 'Капище',
    footprint: [1, 1],
    heightM: 2.2,
    seed: 41,
    build(K) {
      const { T, PAL, M, part, rand } = K;
      const g = new T.Group();
      const L = [], G = [];
      const cx = 0.5, cz = 0.5;
      // гранёный столб-идол, заострённый верх, лёгкий наклон
      L.push(part(new T.CylinderGeometry(0.15, 0.18, 1.85, 7), PAL.wood, { m: M(cx, 0.92, cz, 0.03, 0.2, -0.02), moss: 0.3, tex: 'wood', axis: [0, 1, 0] }));
      L.push(part(new T.ConeGeometry(0.16, 0.36, 7), PAL.wood, { m: M(cx + 0.03, 2.02, cz, 0.03, 0.2, -0.02), tex: 'wood', axis: [0, 1, 0] }));
      // резной «лик»: две глазницы и рот — тёмные вставки
      for (const dx of [-0.06, 0.06]) L.push(part(new T.BoxGeometry(0.06, 0.04, 0.03), '#1d1a17', { m: M(cx + dx, 1.55, cz + 0.165), jitter: 0, ao: false }));
      L.push(part(new T.BoxGeometry(0.14, 0.035, 0.03), '#1d1a17', { m: M(cx, 1.4, cz + 0.165), jitter: 0, ao: false }));
      // железный обруч и красные ленты
      L.push(part(new T.CylinderGeometry(0.19, 0.19, 0.07, 7), PAL.iron, { m: M(cx, 1.2, cz), jitter: 0.004 }));
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + rand() * 0.5, len = 0.35 + rand() * 0.3;
        L.push(part(new T.BoxGeometry(0.07, len, 0.02), PAL.red, {
          m: M(cx + Math.cos(a) * 0.2, 1.17 - len / 2, cz + Math.sin(a) * 0.2, (rand() - 0.5) * 0.3, -a, (rand() - 0.5) * 0.3), jitter: 0.006,
        }));
      }
      // череп животного: многогранник-кость + рога-конусы
      L.push(part(new T.IcosahedronGeometry(0.09, 0), '#a89d85', { m: M(cx, 1.86, cz + 0.19, 0, 0, 0, new T.Vector3(1, 0.8, 1.2)), jitter: 0.01, ao: false }));
      for (const s of [-1, 1]) L.push(part(new T.ConeGeometry(0.028, 0.24, 4), '#a89d85', { m: M(cx + s * 0.12, 1.98, cz + 0.18, 0, 0, -s * 0.9), jitter: 0.004, ao: false }));
      // камень у подножия со свечами (ночью горят)
      L.push(part(new T.IcosahedronGeometry(1, 0), PAL.stone, { m: M(cx + 0.28, 0.1, cz + 0.3, 0.4, 1.1, 0.2, new T.Vector3(0.26, 0.14, 0.22)), jitter: 0.03, moss: 0.4, tex: 'stone', ao: false }));
      for (const [dx, dz, h] of [[0.2, 0.26, 0.14], [0.33, 0.34, 0.1], [0.3, 0.22, 0.08]]) {
        L.push(part(new T.CylinderGeometry(0.025, 0.03, h, 6), PAL.bone, { m: M(cx + dx, 0.2 + h / 2, cz + dz), jitter: 0, ao: false }));
        G.push(part(new T.ConeGeometry(0.018, 0.05, 4), '#1b2024', { m: M(cx + dx, 0.2 + h + 0.03, cz + dz), jitter: 0 }));
      }
      K.rock(L, 0.15, 0, 0.8, 0.16, PAL.stoneDark);
      K.tuft(L, 0.2, 0, 0.25, 4, 0.35);
      K.tuft(L, 0.85, 0, 0.7, 3, 0.3);
      g.add(K.facetGroup(L));
      g.add(K.glassMesh(G));
      K.addGlowLight(g, cx + 0.28, 0.45, cz + 0.45, 0.7, 3);
      return g;
    },
  });

  // ---------- угол частокола: столб + пролёты по X и по Z, высота 2,4–2,8 м ----------
  models.push({
    id: 'palisade',
    name: 'Частокол',
    footprint: [3, 3],
    heightM: 2.8,
    seed: 23,
    build(K) {
      const { T, PAL, M, part, rand } = K;
      const L = [];
      const log = (x, z, h, r) => {
        L.push(part(new T.CylinderGeometry(r, r * 1.08, h, 7), rand() < 0.4 ? PAL.log : PAL.wood, { m: M(x, h / 2, z, (rand() - 0.5) * 0.05, rand() * 3, (rand() - 0.5) * 0.05), moss: 0.25, tex: 'wood', axis: [0, 1, 0] }));
        L.push(part(new T.ConeGeometry(r * 1.02, 0.34, 7), PAL.wood, { m: M(x, h + 0.17, z, 0, rand() * 3, 0), tex: 'wood', axis: [0, 1, 0] }));
      };
      // угловой столб в подклетке (0,0): толще и выше
      log(0.5, 0.5, 2.45, 0.17);
      L.push(part(new T.CylinderGeometry(0.19, 0.19, 0.08, 7), PAL.iron, { m: M(0.5, 1.7, 0.5), jitter: 0.004 }));
      // пролёты: по 4 бревна на метр, от центра подклетки к центру соседней
      for (const axis of ['x', 'z']) {
        for (let k = 1; k <= 8; k++) {
          const t = 0.5 + k * 0.25;
          const h = 2.05 + (rand() - 0.5) * 0.18;
          axis === 'x' ? log(t, 0.5, h, 0.12) : log(0.5, t, h, 0.12);
        }
        // поперечная жердь и верёвка
        const len = 2.1, mid = 0.5 + len / 2;
        L.push(part(new T.BoxGeometry(len, 0.1, 0.1), PAL.woodDark, { m: axis === 'x' ? M(mid, 1.35, 0.5 + 0.14) : M(0.5 + 0.14, 1.35, mid, 0, Math.PI / 2, 0), tex: 'wood', axis: [1, 0, 0] }));
        L.push(part(new T.BoxGeometry(len, 0.05, 0.05), '#6b5a3e', { m: axis === 'x' ? M(mid, 0.75, 0.5 + 0.13) : M(0.5 + 0.13, 0.75, mid, 0, Math.PI / 2, 0), jitter: 0.004 }));
      }
      for (let i = 0; i < 6; i++) K.tuft(L, 0.3 + rand() * 2.3, 0, 0.8 + rand() * 0.2, 3, 0.35);
      K.rock(L, 1.6, 0, 0.95, 0.18);
      return K.facetGroup(L);
    },
  });
})();
