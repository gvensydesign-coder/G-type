/**
 * Конструктор мира — вид «Конструктор» в ките.
 *
 * Карта — сетка клеток 1×1 м (16…48 клеток по стороне). У каждой клетки высота (шаг 0,5 м, от −1 до 6 м)
 * и покрытие: трава, тропа, брусчатка, грязь, песок, вода. Перепады высот дают каменные уступы, край карты —
 * срез диорамы. На землю ставятся любые ассеты библиотеки: модели кита, объекты Лесовика, природа,
 * камни и утварь v5, часовня, алтарь.
 *
 * Инструменты: выбор/перенос, поставить, покрытие, поднять, опустить, выровнять, рассыпать, ластик.
 * Сохранение: общая база артефакта (capability db, коллекция `worlds`), черновик в браузере,
 * экспорт/импорт JSON, скачивание сцены в .glb (кнопка кита «Скачать модель»).
 *
 * Формат сцены (JSON): { v:1, name, n, h: строка высот (символ = 'a' + уровень + 2), t: строка покрытий (цифры),
 *   objs: [[uid, assetId, x, z, поворот°, масштаб, подъём], …] }.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);
  const ID = 'builder';
  const HS = 0.5, HMIN = -2, HMAX = 12, BASE = -1.6;
  const TYPES = [
    { key: 'grass', name: 'Трава', tex: 'grass' },
    { key: 'dirt', name: 'Тропа', tex: 'dirt' },
    { key: 'stone', name: 'Брусчатка', tex: 'cliff' },
    { key: 'mud', name: 'Грязь', tex: 'dirt' },
    { key: 'sand', name: 'Песок', tex: 'dirt' },
    { key: 'water', name: 'Вода', tex: 'dirt' },
  ];
  const WATER = 5;
  const TOOLS = [
    { key: 'select', name: 'Выбор', hint: 'Клик — выбрать, тянуть — перенести. R — поворот, Del — удалить, Ctrl+D — копия' },
    { key: 'place', name: 'Поставить', hint: 'Выберите ассет в библиотеке и кликайте по земле. R — повернуть до установки, Alt — без привязки к сетке' },
    { key: 'paint', name: 'Покрытие', hint: 'Рисуйте покрытие кистью' },
    { key: 'raise', name: 'Поднять', hint: 'Каждый мазок поднимает землю на 0,5 м' },
    { key: 'lower', name: 'Опустить', hint: 'Каждый мазок опускает землю на 0,5 м' },
    { key: 'flatten', name: 'Выровнять', hint: 'Выравнивает до высоты клетки, с которой начат мазок' },
    { key: 'scatter', name: 'Рассыпать', hint: 'Рассыпает выбранный ассет кистью со случайным поворотом и размером' },
    { key: 'erase', name: 'Ластик', hint: 'Удаляет объекты под кистью' },
  ];
  const MODEL_CAT = {
    ritual: 'Хтонь', palisade: 'Утварь', bogatyr: 'Персонажи', chicken_hut: 'Постройки', bone_totem: 'Хтонь', watchtower: 'Постройки',
    ritual_circle: 'Хтонь', spruce_grove: 'Природа', birch_grove: 'Природа', outhouse: 'Постройки', well: 'Постройки', yard_table: 'Утварь',
    stove: 'Постройки', fallen_tree: 'Природа', broken_fence: 'Утварь', cursed_tree: 'Хтонь', ritual_post: 'Хтонь',
  };
  const CATS = ['Постройки', 'Природа', 'Камни', 'Хтонь', 'Утварь', 'Персонажи'];

  function buildBuilder(K) {
    const { T, PAL } = K;
    const holder = new T.Group();
    const world = new T.Group(), terrainG = new T.Group(), decorG = new T.Group(), objectsG = new T.Group(), helpers = new T.Group();
    world.add(terrainG, decorG, objectsG);
    holder.add(world, helpers);
    // большая ровная гладь отражает небо целиком и выглядит белёсой — вода конструктора темнее и матовее, чем в «Болоте»
    const waterMat = new T.MeshStandardMaterial({ color: K.lin('#173a38'), roughness: 0.42, metalness: 0, envMapIntensity: 0.22, transparent: true, opacity: 0.88, flatShading: true });

    // =================================================================
    // БИБЛИОТЕКА
    // =================================================================
    const LIB = [];
    const NAT = () => window.LPK_NATURE(K);
    const addStand = (id, name, cat, fp, center, dyn, make) => LIB.push({ id, name, cat, fp, center, dyn, seed: 1, make });
    addStand('hut', 'Изба', 'Постройки', [6, 6], false, true, () => { const h = K.buildHut(); const a = new T.Object3D(); a.position.copy(h.smoke); h.group.add(a); return { obj: h.group, smokes: [a] }; });
    addStand('spruce_l', 'Ель большая', 'Природа', [2, 2], true, false, () => ({ obj: K.buildSpruce(12, 3) }));
    addStand('spruce_m', 'Ель средняя', 'Природа', [2, 2], true, false, () => ({ obj: K.buildSpruce(9, 5) }));
    addStand('spruce_s', 'Ель малая', 'Природа', [1.5, 1.5], true, false, () => ({ obj: K.buildSpruce(5.5, 7) }));
    addStand('birch_l', 'Берёза', 'Природа', [2, 2], true, false, () => ({ obj: NAT().birch(9, 2) }));
    addStand('birch_s', 'Берёза молодая', 'Природа', [1.5, 1.5], true, false, () => ({ obj: NAT().birch(6.5, 4) }));
    addStand('sapling', 'Ёлочка-подрост', 'Природа', [1, 1], true, false, () => { const L = []; NAT().sapling(L, 0, 0, 0, 1.8); return { obj: K.facetGroup(L) }; });
    addStand('fern', 'Папоротник', 'Природа', [1, 1], true, false, () => { const L = []; K.fern(L, 0, 0, 0, 1); return { obj: K.facetGroup(L) }; });
    addStand('leafplant', 'Лопухи', 'Природа', [1, 1], true, false, () => { const L = []; NAT().leafPlant(L, 0, 0, 0, 1.1); return { obj: K.facetGroup(L) }; });
    addStand('mushrooms', 'Мухоморы', 'Природа', [1, 1], true, false, () => { const L = []; K.mushrooms(L, 0, 0, 0); return { obj: K.facetGroup(L) }; });
    addStand('reeds', 'Камыш', 'Природа', [1, 1], true, false, () => { const L = []; NAT().reeds(L, 0, 0, 0, 7, 1.3); return { obj: K.facetGroup(L, { wind: { phase: 3, h: 1.5 } }) }; });
    addStand('lantern', 'Фонарный столб', 'Утварь', [1.5, 1], true, true, () => ({ obj: K.buildLanternPost() }));
    addStand('woodpile', 'Поленница', 'Утварь', [2, 1], false, false, () => ({ obj: K.buildWoodpile() }));
    (window.LPK_ASSETS || []).forEach((a) => LIB.push({ id: a.id, name: a.name, cat: a.cat, fp: a.footprint, center: false, dyn: null, seed: a.seed,
      make: () => { const out = a.build(K); return out.isObject3D ? { obj: out } : { obj: out.group, update: out.update, smokes: out.smokes }; } }));
    models.filter((d) => MODEL_CAT[d.id]).forEach((d) => LIB.push({ id: d.id, name: d.name, cat: MODEL_CAT[d.id], fp: d.footprint || [2, 2], center: false, dyn: null, seed: d.seed ?? 1,
      make: () => { const out = d.build(K); const o = out && out.isObject3D ? { obj: out } : { obj: out.group, update: out.update, smokes: out.smokes || [] };
        if (out && out.smoke) { const a = new T.Object3D(); a.position.copy(out.smoke); o.obj.add(a); o.smokes = [...(o.smokes || []), a]; }
        return o; } }));
    const byId = Object.fromEntries(LIB.map((e) => [e.id, e]));

    // шаблоны: статичные ассеты клонируются, «живые» (анимация, огни, дым) строятся заново
    const templates = {};
    const lightCount = { n: 0 };
    const origGlow = K.addGlowLight;
    function buildEntry(e) {
      K.setSeed(e.seed);
      lightCount.n = 0;
      K.addGlowLight = (...a) => { lightCount.n++; return origGlow(...a); };
      let out;
      try { out = e.make(); } finally { K.addGlowLight = origGlow; }
      if (e.dyn === null) e.dyn = !!(out.update || (out.smokes && out.smokes.length) || lightCount.n);
      return out;
    }
    function template(e) { return (templates[e.id] ||= buildEntry(e)); }
    function makeInstance(e) {
      if (e.dyn === null) template(e); // узнать, «живой» ли ассет
      if (e.dyn) return buildEntry(e);
      return { obj: template(e).obj.clone(true) };
    }

    // =================================================================
    // СОСТОЯНИЕ
    // =================================================================
    let NX = 32, NZ = 32, H = new Int8Array(NX * NZ), TY = new Uint8Array(NX * NZ);
    const MAXDIM = 4096; // мягкий предел роста карты — берегёт память при неограниченном расширении
    const objs = new Map(); // uid → { rec: {uid, id, x, z, r, s, y}, wrap, inst }
    let uidSeq = 1;
    const cellAt = (i, j) => j * NX + i;
    const inMap = (i, j) => i >= 0 && j >= 0 && i < NX && j < NZ;
    const topY = (i, j) => { if (!inMap(i, j)) return BASE; const k = cellAt(i, j); return H[k] * HS - (TY[k] === WATER ? 0.35 : 0); };
    const groundY = (x, z) => { const i = Math.floor(x), j = Math.floor(z); if (!inMap(i, j)) return 0; const k = cellAt(i, j); return H[k] * HS - (TY[k] === WATER ? 0.3 : 0); };
    const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

    // =================================================================
    // ЗЕМЛЯ
    // =================================================================
    const nz = (x, z) => Math.sin(x * 0.55 + Math.sin(z * 0.4) * 1.3) * 0.55 + Math.sin(z * 0.62 - x * 0.31 + 1.7) * 0.45;
    const cGrass = K.lin(PAL.grass), cGrassL = K.lin(PAL.grassLight), cMoss = K.lin(PAL.moss), cDirt = K.lin(PAL.dirt), cMud = K.lin('#3c3a33');
    const cStone = K.lin(PAL.stone), cSand = K.lin('#9c8a62'), cCliff = K.lin(PAL.rock), cCliffD = K.lin(PAL.stoneDark), cSoil = K.lin(PAL.soil);
    function colorOf(t, x, z) {
      const c = new T.Color();
      if (t === 0) { c.copy(cGrass).lerp(cGrassL, Math.max(0, Math.min(1, 0.35 + nz(x, z) * 0.45))); const n2 = nz(z * 1.7 + 11, x * 1.7 - 5); if (n2 > 0.55) c.lerp(cMoss, Math.min(1, (n2 - 0.55) * 2.5) * 0.6); }
      else if (t === 1) c.copy(cDirt).lerp(cMud, Math.max(0, nz(x * 1.3, z * 1.3)) * 0.4);
      else if (t === 2) c.copy(cStone).multiplyScalar(0.9 + hash(x, z) * 0.15);
      else if (t === 3) c.copy(cMud);
      else if (t === 4) c.copy(cSand).lerp(cDirt, Math.max(0, nz(x, z)) * 0.3);
      else c.copy(cMud).multiplyScalar(0.8);
      return c;
    }
    // уголок клетки чуть «дышит» по высоте: дрожание зависит только от (x,z), не от y —
    // поэтому вершина угла у ровной клетки и у стыкующегося с ней уступа совпадает точь-в-точь, без щели
    const cornerJit = (x, z) => (hash(x * 3.1, z * 2.7) - 0.5) * 0.05;
    const cornerY = (x, z, y) => y + cornerJit(x, z);
    function rebuildTerrain() {
      terrainG.children.slice().forEach((m) => { terrainG.remove(m); m.traverse((o) => o.geometry && o.geometry.dispose()); });
      const B = {}; // tex → [pos, col]
      const W = [];
      const tri = (tex, a, b, c, col) => { const bk = (B[tex] ||= [[], []]); for (const v of [a, b, c]) { bk[0].push(v[0], v[1], v[2]); bk[1].push(col.r, col.g, col.b); } };
      const quad = (tex, a, b, c, d, col, col2) => { tri(tex, a, b, c, col); tri(tex, a, c, d, col2 || col); };
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = cellAt(i, j), t = TY[k], y = topY(i, j);
        const p = (x, z) => [x, cornerY(x, z, y), z];
        const c1 = colorOf(t, i + 0.3, j + 0.3).multiplyScalar(0.97 + hash(i, j) * 0.06), c2 = colorOf(t, i + 0.7, j + 0.7).multiplyScalar(0.97 + hash(j, i) * 0.06);
        const ao = 0.62 + 0.38 * Math.min(1, Math.max(0, (y + 1) / 1.2));
        c1.multiplyScalar(ao); c2.multiplyScalar(ao);
        quad(TYPES[t].tex, p(i, j), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j), c1, c2);
        if (t === WATER) { const wy = H[k] * HS - 0.08; W.push(i, wy, j, i, wy, j + 1, i + 1, wy, j + 1, i, wy, j, i + 1, wy, j + 1, i + 1, wy, j); }
        // уступы к более низким соседям и к краю карты
        for (const [di, dj, a0, a1] of [[1, 0, [i + 1, j], [i + 1, j + 1]], [-1, 0, [i, j + 1], [i, j]], [0, 1, [i + 1, j + 1], [i, j + 1]], [0, -1, [i, j], [i + 1, j]]]) {
          const ny = inMap(i + di, j + dj) ? topY(i + di, j + dj) : BASE;
          if (ny >= y - 0.001) continue;
          const steps = Math.max(1, Math.round((y - ny) / 0.5));
          for (let s = 0; s < steps; s++) {
            const yt = y - (y - ny) * s / steps, yb = y - (y - ny) * (s + 1) / steps;
            const cc = (s === 0 && t === 0 ? cGrass.clone().multiplyScalar(0.7) : ((s + i + j) % 2 ? cCliff : cCliffD).clone()).multiplyScalar(0.8 + hash(i + s, j) * 0.25);
            const top0 = s === 0 ? cornerY(a0[0], a0[1], y) : yt, top1 = s === 0 ? cornerY(a1[0], a1[1], y) : yt;
            // нижний край последней ступени должен точно совпасть с «дышащим» углом соседней клетки на высоте ny,
            // иначе между низом уступа и землёй соседа остаётся тонкая щель (видна как пропавшая грань при взгляде вдоль стены)
            const bot0 = s === steps - 1 ? cornerY(a0[0], a0[1], ny) : yb, bot1 = s === steps - 1 ? cornerY(a1[0], a1[1], ny) : yb;
            quad('cliff', [a0[0], top0, a0[1]], [a0[0], bot0, a0[1]], [a1[0], bot1, a1[1]], [a1[0], top1, a1[1]], cc);
          }
        }
      }
      // диагональные стыки: если клетки сходятся в одной точке сетки по диагонали (не по стороне), уступы по 4
      // направлениям её не строят — латаем тонким столбиком, чтобы в самом стыке ничего не «просвечивало»
      for (let j = 1; j < NZ; j++) for (let i = 1; i < NX; i++) {
        const hNW = topY(i - 1, j - 1), hNE = topY(i, j - 1), hSW = topY(i - 1, j), hSE = topY(i, j);
        const top = Math.max(hNW, hNE, hSW, hSE), bot = Math.min(hNW, hNE, hSW, hSE);
        if (top - bot > 0.05) {
          const cc = cCliff.clone().multiplyScalar(0.8 + hash(i, j) * 0.25), w = 0.05;
          quad('cliff', [i - w, top, j - w], [i - w, bot, j - w], [i + w, bot, j + w], [i + w, top, j + w], cc);
          quad('cliff', [i - w, top, j + w], [i - w, bot, j + w], [i + w, bot, j - w], [i + w, top, j - w], cc);
        }
      }
      const geos = [];
      Object.entries(B).forEach(([tex, [P, Cc]]) => {
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
        geo.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
        geo.computeVertexNormals();
        K.finalize(geo, null);
        geo.userData.tex = tex;
        geos.push(geo);
      });
      // дно-подложка под картой
      geos.push(K.part(new T.BoxGeometry(NX, 0.4, NZ, Math.ceil(NX / 4), 1, Math.ceil(NZ / 4)), PAL.soil, { m: K.M(NX / 2, BASE - 0.2, NZ / 2), jitter: 0.03, tex: 'cliff', ao: false, vary: 0.08 }));
      const fg = K.facetGroup(geos);
      fg.traverse((o) => {
        if (!o.isMesh) return;
        o.userData.ground = true;
        // земля и уступы — процедурная геометрия по клеткам, часть граней смотрит внутрь земли;
        // с односторонним материалом под некоторыми ракурсами камеры грань пропадает и видно
        // подложку/пустоту внутри — создаём отдельный двусторонний материал через paintMaterial,
        // чтобы сохранить onBeforeCompile (clone() его не копирует) и не менять общий кэш
        if (o.material && o.material.side !== T.DoubleSide) {
          const tex = o.material.userData.tex || 'plain';
          o.material = K.paintMaterial(tex, { mat: { side: T.DoubleSide } });
          K.trackLum(o.material, o.geometry);
        }
      });
      terrainG.add(fg);
      if (W.length) {
        const wg = new T.BufferGeometry();
        wg.setAttribute('position', new T.Float32BufferAttribute(W, 3));
        wg.computeVertexNormals();
        const wm = new T.Mesh(wg, waterMat);
        wm.receiveShadow = true;
        wm.userData.ground = true;
        terrainG.add(wm);
      }
      objects.forEach((o) => placeWrap(o));
    }
    // детали земли: трава на лугу, галька на тропе, камыш у воды
    let decorOn = true;
    const decorCache = new Map();
    function rebuildDecor() {
      decorG.children.slice().forEach((m) => { decorG.remove(m); m.traverse((o) => o.geometry && o.geometry.dispose()); });
      if (!decorOn) return;
      const L = [], Wd = [];
      const nearWater = (i, j) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inMap(i + a, j + b) && TY[cellAt(i + a, j + b)] === WATER);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = cellAt(i, j), t = TY[k], y = topY(i, j);
        if (t === 2 || t === WATER || occupied(i + 0.5, j + 0.5)) continue;
        const nw = t === 0 && nearWater(i, j);
        // детали клетки собираются один раз и кэшируются: пересборка — только склейка готовых граней
        const key = i + ',' + j + ',' + t + ',' + y + ',' + (nw ? 1 : 0);
        let c = decorCache.get(key);
        if (!c) {
          const r = hash(i * 1.3, j * 0.7), cl = [], cw = [];
          K.setSeed(1 + Math.abs((i * 73856093) ^ (j * 19349663)) % 2147483000);
          if (t === 0) {
            if (r < 0.45) K.tuft(cl, i + 0.2 + hash(j, i) * 0.6, y, j + 0.2 + hash(i, j * 2) * 0.6, 3, 0.25 + r * 0.3);
            if (r > 0.93) NAT().daisy(cl, i + 0.5, y, j + 0.5, 0.25);
            if (nw && r > 0.4) NAT().reeds(cw, i + 0.5, y, j + 0.5, 4, 1.1);
          } else if (t === 1 || t === 4) {
            if (r < 0.2) K.rock(cl, i + hash(j, i), y - 0.02, j + hash(i, j), 0.06 + r * 0.2, PAL.stoneDark);
          } else if (t === 3 && r < 0.25) K.tuft(cl, i + 0.5, y, j + 0.5, 3, 0.3);
          c = { l: cl, w: cw };
          decorCache.set(key, c);
        }
        for (const g of c.l) L.push(g);
        for (const g of c.w) Wd.push(g);
      }
      if (L.length) decorG.add(K.facetGroup(L));
      if (Wd.length) decorG.add(K.facetGroup(Wd)); // без ветра: материал с ветром компилировался бы заново при каждой пересборке
    }

    // =================================================================
    // ОБЪЕКТЫ
    // =================================================================
    const objects = objs; // alias для placeWrap
    function placeWrap(o) {
      const { rec, wrap } = o;
      wrap.position.set(rec.x, groundY(rec.x, rec.z) + (rec.y || 0), rec.z);
      wrap.rotation.y = rec.r * Math.PI / 180;
      wrap.scale.setScalar(rec.s || 1);
    }
    function occupied(x, z) {
      for (const { rec } of objs.values()) { const e = byId[rec.id]; if (!e) continue; const r = Math.max(e.fp[0], e.fp[1]) * 0.5 * (rec.s || 1); if (Math.abs(x - rec.x) < r && Math.abs(z - rec.z) < r) return true; }
      return false;
    }
    let lightsDirty = false, decorDirty = false;
    function spawn(rec) {
      const e = byId[rec.id];
      if (!e) return null;
      const inst = makeInstance(e);
      const wrap = new T.Group();
      const inner = inst.obj;
      if (!e.center) inner.position.set(-e.fp[0] / 2, 0, -e.fp[1] / 2);
      wrap.add(inner);
      wrap.userData.uid = rec.uid;
      objectsG.add(wrap);
      const o = { rec, wrap, inst };
      objs.set(rec.uid, o);
      placeWrap(o);
      (inst.smokes || []).forEach((a) => K.view && K.view.addSmoke(ID, a));
      if (e.dyn) lightsDirty = true;
      decorDirty = true;
      return o;
    }
    function despawn(uid) {
      const o = objs.get(uid);
      if (!o) return;
      objectsG.remove(o.wrap);
      objs.delete(uid);
      if (o.inst.smokes && o.inst.smokes.length && K.view) K.view.removeSmokes(ID, (a) => o.inst.smokes.includes(a));
      if (byId[o.rec.id] && byId[o.rec.id].dyn) lightsDirty = true;
      decorDirty = true;
      if (sel === uid) select(null);
    }
    function addObject(id, x, z, r = 0, s = 1, y = 0) {
      const rec = { uid: uidSeq++, id, x: +x.toFixed(2), z: +z.toFixed(2), r: Math.round(r), s: +s.toFixed(2), y: +y.toFixed(2) };
      return spawn(rec);
    }

    // =================================================================
    // СЕРИАЛИЗАЦИЯ, ИСТОРИЯ, ЧЕРНОВИК
    // =================================================================
    function serialize(name) {
      let h = '', t = '';
      for (let k = 0; k < NX * NZ; k++) { h += String.fromCharCode(97 + H[k] - HMIN); t += TY[k]; }
      const list = [...objs.values()].map(({ rec }) => [rec.uid, rec.id, rec.x, rec.z, rec.r, rec.s, rec.y]);
      return { v: 1, name: name || worldName, n: Math.max(NX, NZ), nx: NX, nz: NZ, h, t, objs: list };
    }
    function apply(data, { reframe = false } = {}) {
      const nx = Math.max(8, Math.min(MAXDIM, (data.nx || data.n) | 0));
      const nz = Math.max(8, Math.min(MAXDIM, (data.nz || data.n) | 0));
      const resized = nx !== NX || nz !== NZ;
      NX = nx; NZ = nz; H = new Int8Array(NX * NZ); TY = new Uint8Array(NX * NZ);
      for (let k = 0; k < NX * NZ; k++) { H[k] = Math.max(HMIN, Math.min(HMAX, (data.h ? data.h.charCodeAt(k) - 97 : -HMIN) + HMIN)); TY[k] = Math.min(TYPES.length - 1, +(data.t ? data.t[k] : 0) || 0); }
      // объекты: сохранить совпадающие, остальное пересоздать
      const want = new Map((data.objs || []).map((a) => [a[0], { uid: a[0], id: a[1], x: a[2], z: a[3], r: a[4] || 0, s: a[5] || 1, y: a[6] || 0 }]));
      for (const uid of [...objs.keys()]) { const o = objs.get(uid), w = want.get(uid); if (!w || w.id !== o.rec.id) despawn(uid); }
      want.forEach((rec, uid) => { const o = objs.get(uid); if (o) { o.rec = rec; } else spawn(rec); uidSeq = Math.max(uidSeq, uid + 1); });
      if (data.name) worldName = data.name;
      rebuildTerrain();
      decorDirty = true; lightsDirty = true;
      if (resized || reframe) reframeView();
      syncUi();
    }
    // расширение карты в любую сторону без ограничения размера (мягкий предел MAXDIM — беречь память)
    function expandMap(dir, amt = 8) {
      const addX0 = dir === 'w' ? amt : 0, addX1 = dir === 'e' ? amt : 0, addZ0 = dir === 'n' ? amt : 0, addZ1 = dir === 's' ? amt : 0;
      const nx2 = NX + addX0 + addX1, nz2 = NZ + addZ0 + addZ1;
      if (nx2 > MAXDIM || nz2 > MAXDIM) { note('Карта уже у предела роста'); return; }
      const H2 = new Int8Array(nx2 * nz2), TY2 = new Uint8Array(nx2 * nz2);
      const oldNX = NX, oldInMap = (i, j) => i >= 0 && j >= 0 && i < oldNX && j < NZ;
      for (let j = 0; j < nz2; j++) for (let i = 0; i < nx2; i++) {
        const oi = i - addX0, oj = j - addZ0, k = j * nx2 + i;
        if (oldInMap(oi, oj)) { H2[k] = H[oj * oldNX + oi]; TY2[k] = TY[oj * oldNX + oi]; }
      }
      NX = nx2; NZ = nz2; H = H2; TY = TY2;
      if (addX0 || addZ0) objs.forEach((o) => { o.rec.x += addX0; o.rec.z += addZ0; });
      decorCache.clear();
      objs.forEach((o) => placeWrap(o));
      terrainDirty = true; decorDirty = true; lightsDirty = true;
      reframeView(); commit(); syncUi();
      note('Карта расширена: ' + NX + '×' + NZ + ' м');
    }

    const hist = [], redoS = [];
    let lastSnap = null;
    function commit() {
      const s = JSON.stringify(serialize());
      if (s === lastSnap) return;
      if (lastSnap) { hist.push(lastSnap); if (hist.length > 60) hist.shift(); }
      redoS.length = 0;
      lastSnap = s;
      scheduleDraft();
    }
    function undo() { if (!hist.length) return; redoS.push(lastSnap); lastSnap = hist.pop(); apply(JSON.parse(lastSnap)); scheduleDraft(); }
    function redo() { if (!redoS.length) return; hist.push(lastSnap); lastSnap = redoS.pop(); apply(JSON.parse(lastSnap)); scheduleDraft(); }
    let draftTimer = 0;
    const DRAFT = 'lpk-builder-draft-v1';
    function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(() => { try { localStorage.setItem(DRAFT, lastSnap); } catch (e) { /* черновик — только удобство */ } }, 800); }

    // =================================================================
    // КАРТА ПО УМОЛЧАНИЮ — небольшая деревня у леса
    // =================================================================
    function demoWorld() {
      NX = 32; NZ = 32; H = new Int8Array(NX * NZ); TY = new Uint8Array(NX * NZ);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = cellAt(i, j);
        if (i >= 21 && j <= 11) H[k] = i >= 25 && j <= 6 ? 4 : 2; // холм
        const pd = Math.abs(j - 17 - Math.sin(i * 0.35) * 1.5);
        if (pd < 1.1) TY[k] = 1; // тропа
        if (i === 14 && j > 9 && j < 17) TY[k] = 1;
        if (Math.hypot(i - 7.5, j - 25) < 3.6) { TY[k] = WATER; H[k] = 0; }
        if (i >= 11 && i <= 17 && j >= 9 && j <= 10) TY[k] = 2;
        if (i >= 21 && j <= 11 && (i === 21 || j === 11) && H[k] > 0 && hash(i, j) < 0.3) TY[k] = 3;
      }
      const put = [
        ['hut', 14, 5.5, 0], ['well', 19.5, 14.5, 0], ['lantern', 12.5, 15.3, 90], ['woodpile', 10, 6.5, 90], ['yard_table', 17.5, 20.5, 0],
        ['rune_menhir', 27.5, 3.5, 20], ['rock_spire', 29.5, 8.5, 0], ['standing_stones', 25.5, 9.5, 10], ['ritual_post', 23, 3, 0],
        ['barrels_stack', 10.5, 10.5, 0], ['crate', 11, 12, 30], ['chest_rune', 17, 11.5, 180], ['stump_mushroom', 5, 19, 0],
        ['rock_cluster', 11, 25.5, 0], ['boulder_pile', 3, 20.5, 0], ['firewood_axe', 8, 10.5, 0], ['bush_green', 3, 12.5, 0], ['bush_dry', 20, 27, 0],
        ['tree_small', 16, 26.5, 0], ['ox_skull', 22.5, 7.5, 200],
      ];
      [[2, 2, 'spruce_l'], [5, 1.5, 'spruce_m'], [1.5, 6, 'spruce_m'], [8.5, 1.5, 'spruce_s'], [1.5, 10, 'spruce_l'], [2, 29, 'spruce_l'], [6, 30, 'spruce_m'],
        [29.5, 14.5, 'spruce_l'], [30, 19.5, 'spruce_m'], [29.5, 24.5, 'spruce_l'], [30, 29.5, 'spruce_m'], [25.5, 30, 'spruce_s'],
        [21, 23, 'birch_l'], [23.5, 25, 'birch_s'], [20.5, 26.5, 'birch_s'], [12.5, 29.5, 'birch_l'], [27.5, 12.5, 'spruce_s']].forEach(([x, z, id]) => put.push([id, x, z, (hash(x, z) * 360) | 0]));
      objs.forEach((_, uid) => despawn(uid));
      put.forEach(([id, x, z, r]) => addObject(id, x, z, r, 1, 0));
    }

    // =================================================================
    // КУРСОР, ВЫДЕЛЕНИЕ
    // =================================================================
    const cursorMat = new T.LineBasicMaterial({ color: 0xe3a653, transparent: true, opacity: 0.9, depthTest: false });
    const cursor = new T.LineSegments(new T.BufferGeometry(), cursorMat);
    cursor.renderOrder = 10; cursor.visible = false;
    helpers.add(cursor);
    let selBox = null, sel = null;
    function select(uid) {
      sel = uid;
      if (selBox) { helpers.remove(selBox); selBox = null; }
      const o = uid != null && objs.get(uid);
      if (o) { selBox = new T.BoxHelper(o.wrap, 0xe3a653); selBox.material.depthTest = false; selBox.renderOrder = 11; helpers.add(selBox); }
      syncSel();
    }
    function setCursorBrush(i, j) {
      const r = brush - 1, pts = [];
      const x0 = i - r, x1 = i + r + 1, z0 = j - r, z1 = j + r + 1;
      const y = (x, z) => groundY(Math.min(NX - 0.01, Math.max(0, x)), Math.min(NZ - 0.01, Math.max(0, z))) + 0.06;
      const seg = (ax, az, bx, bz) => { for (let s = 0; s < 4; s++) { const t0 = s / 4, t1 = (s + 1) / 4; const p0 = [ax + (bx - ax) * t0, az + (bz - az) * t0], p1 = [ax + (bx - ax) * t1, az + (bz - az) * t1]; pts.push(p0[0], y(p0[0], p0[1]), p0[1], p1[0], y(p1[0], p1[1]), p1[1]); } };
      seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
      cursor.geometry.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      cursor.geometry.computeBoundingSphere();
      cursor.visible = true;
    }
    function setCursorBox(e, x, z, rot) {
      const w = e.fp[0] * (e.center ? 1 : 1), d = e.fp[1];
      const y = groundY(x, z) + 0.05, c = Math.cos(rot), s = Math.sin(rot);
      const P = (u, v, yy) => [x + u * c + v * s, yy, z - u * s + v * c];
      const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      const pts = [];
      for (let k = 0; k < 4; k++) { const a = corners[k], b = corners[(k + 1) % 4]; pts.push(...P(a[0], a[1], y), ...P(b[0], b[1], y)); pts.push(...P(a[0], a[1], y), ...P(a[0], a[1], y + 0.6)); }
      pts.push(...P(0, d / 2, y), ...P(0, d / 2 + 0.5, y)); // куда смотрит «перед»
      cursor.geometry.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      cursor.geometry.computeBoundingSphere();
      cursor.visible = true;
    }

    // =================================================================
    // ВВОД
    // =================================================================
    let tool = 'place', brush = 2, paintType = 0, current = 'spruce_m', placeRot = 0, worldName = 'Мой мир', builderTop = false;
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const groundHit = (e) => {
      const v = K.view, r = v.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, v.cam);
      const hits = ray.intersectObjects(terrainG.children, true).filter((h) => h.object.userData.ground || h.object.parent && h.object.parent.userData);
      return hits.length ? hits[0].point : null;
    };
    const objectHit = (e) => {
      const v = K.view, r = v.canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, v.cam);
      const hits = ray.intersectObjects(objectsG.children, true);
      for (const h of hits) { let o = h.object; while (o && o.userData.uid == null) o = o.parent; if (o) return o.userData.uid; }
      return null;
    };
    const snap = (v, free) => (free ? v : Math.round(v * 2) / 2);
    let drag = null; // { kind: 'stroke'|'move'|'pan', ... }
    const keys = {};

    function brushCells(i, j) { const r = brush - 1, out = []; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (di * di + dj * dj <= r * r + r && inMap(i + di, j + dj)) out.push(cellAt(i + di, j + dj)); return out; }
    let terrainDirty = false;
    function strokeAt(p) {
      const i = Math.floor(p.x), j = Math.floor(p.z);
      if (!inMap(i, j)) return;
      if (tool === 'erase') { for (const [uid, o] of [...objs]) if (Math.hypot(o.rec.x - p.x, o.rec.z - p.z) < brush * 0.8) despawn(uid); return; }
      if (tool === 'scatter') { scatterAt(p); return; }
      for (const k of brushCells(i, j)) {
        if (drag.done.has(k)) continue;
        drag.done.add(k);
        if (tool === 'paint') { TY[k] = paintType; }
        else if (tool === 'raise') H[k] = Math.min(HMAX, H[k] + 1);
        else if (tool === 'lower') H[k] = Math.max(HMIN, H[k] - 1);
        else if (tool === 'flatten') H[k] = drag.level;
      }
      terrainDirty = true; decorDirty = true;
    }
    function scatterAt(p) {
      const e = byId[current];
      if (!e) return;
      const step = Math.max(e.fp[0], e.fp[1]) * 0.85;
      if (drag.last && Math.hypot(p.x - drag.last.x, p.z - drag.last.z) < step) return;
      drag.last = { x: p.x, z: p.z };
      const n = Math.max(1, Math.round(brush * brush * 0.6));
      for (let k = 0; k < n; k++) {
        const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * brush * 0.9;
        const x = p.x + Math.cos(a) * rr, z = p.z + Math.sin(a) * rr;
        if (x < 0.3 || z < 0.3 || x > NX - 0.3 || z > NZ - 0.3) continue;
        if ([...objs.values()].some(({ rec }) => Math.hypot(rec.x - x, rec.z - z) < step * 0.7)) continue;
        addObject(current, x, z, Math.random() * 360, 0.8 + Math.random() * 0.4, 0);
      }
    }
    const input = {
      down(e) {
        if (K.view.state.view !== ID) return false;
        if (e.button === 1 || (e.button === 0 && keys.Space)) { drag = { kind: 'pan', x: e.clientX, y: e.clientY }; return true; }
        if (e.button !== 0) return false;
        if (tool === 'select') {
          const uid = objectHit(e);
          select(uid);
          if (uid == null) return false; // пустое место — вращаем камеру
          const p = groundHit(e), o = objs.get(uid);
          drag = { kind: 'move', uid, dx: p ? o.rec.x - p.x : 0, dz: p ? o.rec.z - p.z : 0, moved: false };
          return true;
        }
        const p = groundHit(e);
        if (!p) return false;
        if (tool === 'place') {
          if (!byId[current]) return true;
          const o = addObject(current, snap(p.x, e.altKey), snap(p.z, e.altKey), placeRot, 1, 0);
          if (o && byId[current].dyn) K.view.refreshLights(ID);
          commit();
          return true;
        }
        drag = { kind: 'stroke', done: new Set(), level: H[cellAt(Math.floor(p.x), Math.floor(p.z))] || 0 };
        strokeAt(p);
        return true;
      },
      move(e, active) {
        if (K.view.state.view !== ID) return;
        if (active && drag) {
          if (drag.kind === 'pan') { pan(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; return; }
          const p = groundHit(e);
          if (!p) return;
          if (drag.kind === 'move') {
            const o = objs.get(drag.uid);
            if (!o) return;
            o.rec.x = +snap(p.x + drag.dx, e.altKey).toFixed(2); o.rec.z = +snap(p.z + drag.dz, e.altKey).toFixed(2);
            placeWrap(o); if (selBox) selBox.update(); drag.moved = true;
          } else if (drag.kind === 'stroke') { strokeAt(p); setCursorBrush(Math.floor(p.x), Math.floor(p.z)); }
          return;
        }
        const p = groundHit(e);
        if (!p) { cursor.visible = false; return; }
        if (tool === 'place' && byId[current]) setCursorBox(byId[current], snap(p.x, e.altKey), snap(p.z, e.altKey), placeRot * Math.PI / 180);
        else if (tool !== 'select') setCursorBrush(Math.floor(p.x), Math.floor(p.z));
        else cursor.visible = false;
      },
      up() {
        if (!drag) return;
        if (drag.kind === 'move' && drag.moved) { decorDirty = true; commit(); }
        if (drag.kind === 'stroke') { if (tool === 'scatter' || tool === 'erase') K.view.refreshLights(ID); commit(); }
        drag = null;
      },
    };
    function pan(dx, dy) {
      const st = K.view.state, c = K.view.canvas;
      const upp = (st.size / st.zoom) / Math.max(1, c.clientHeight); // метров на пиксель
      const a = st.az * Math.PI / 180, el = st.el * Math.PI / 180;
      const right = new T.Vector3(Math.cos(a), 0, -Math.sin(a)), fwd = new T.Vector3(-Math.sin(a), 0, -Math.cos(a));
      st.target.addScaledVector(right, -dx * upp).addScaledVector(fwd, dy * upp / Math.max(0.3, Math.sin(el)));
      K.view.placeCamera();
    }
    function reframeView() {
      const v = K.view && K.view.views[ID];
      if (!v) return;
      v.fog = { center: [NX / 2, NZ / 2], clear: Math.max(NX, NZ) * 0.46, falloff: Math.max(4, Math.max(NX, NZ) * 0.12), height: 1.7, top: 9, ground: 0, density: 0.5 };
      v.box = new T.Box3().set(new T.Vector3(0, BASE, 0), new T.Vector3(NX, 6, NZ));
      if (K.view.state.view === ID) K.view.setView(ID);
    }

    window.addEventListener('keydown', (e) => {
      if (!K.view || K.view.state.view !== ID) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      keys[e.code] = true;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (ctrl && e.code === 'KeyY') { e.preventDefault(); redo(); return; }
      if (ctrl && e.code === 'KeyD') { e.preventDefault(); duplicate(); return; }
      if (e.code === 'KeyR') { const d = e.shiftKey ? -15 : 45; if (tool === 'select' && sel != null) rotateSel(d); else placeRot = (placeRot + d + 360) % 360; return; }
      if ((e.code === 'Delete' || e.code === 'Backspace') && sel != null) { despawn(sel); commit(); return; }
      if (e.code === 'Escape') { select(null); setTool('select'); return; }
      if (e.code === 'BracketRight') { brush = Math.min(7, brush + 1); syncUi(); }
      if (e.code === 'BracketLeft') { brush = Math.max(1, brush - 1); syncUi(); }
      const pk = { KeyW: [0, 40], KeyS: [0, -40], KeyA: [40, 0], KeyD: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40], ArrowLeft: [40, 0], ArrowRight: [-40, 0] }[e.code];
      if (pk && !ctrl) { e.preventDefault(); pan(pk[0], pk[1]); }
      if (e.code === 'KeyQ' || e.code === 'KeyE') { const st = K.view.state; st.az = (st.az + (e.code === 'KeyQ' ? -45 : 45) + 360) % 360; K.view.placeCamera(); }
      const num = { Digit1: 'select', Digit2: 'place', Digit3: 'paint', Digit4: 'raise', Digit5: 'lower', Digit6: 'flatten', Digit7: 'scatter', Digit8: 'erase' }[e.code];
      if (num) setTool(num);
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    function rotateSel(d) { const o = objs.get(sel); if (!o) return; o.rec.r = (o.rec.r + d + 360) % 360; placeWrap(o); selBox && selBox.update(); commit(); }
    function scaleSel(f) { const o = objs.get(sel); if (!o) return; o.rec.s = +Math.max(0.3, Math.min(3, o.rec.s * f)).toFixed(2); placeWrap(o); selBox && selBox.update(); commit(); }
    function liftSel(d) { const o = objs.get(sel); if (!o) return; o.rec.y = +(o.rec.y + d).toFixed(2); placeWrap(o); selBox && selBox.update(); commit(); }
    function duplicate() { const o = objs.get(sel); if (!o) return; const n = addObject(o.rec.id, o.rec.x + 1, o.rec.z + 1, o.rec.r, o.rec.s, o.rec.y); if (n) { select(n.rec.uid); K.view.refreshLights(ID); commit(); } }

    // =================================================================
    // ПАНЕЛЬ
    // =================================================================
    const css = document.createElement('style');
    css.textContent = `
      .wb { position: fixed; left: 16px; top: calc(16px + env(safe-area-inset-top, 0px)); width: 300px; max-height: calc(100% - 32px); overflow: auto; box-sizing: border-box;
        background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px; backdrop-filter: blur(6px); display: flex; flex-direction: column; gap: 12px; z-index: 5; }
      .wb[hidden] { display: none; }
      .wb h2 { font: 600 22px/1.05 "Cormorant Garamond", Georgia, serif; margin: 0; }
      .wb .row { display: flex; flex-wrap: wrap; gap: 4px; }
      .wb .chip { font: 500 12px/1 "IBM Plex Sans", system-ui, sans-serif; color: var(--muted); background: var(--chip); border: 1px solid transparent; border-radius: 6px; padding: 7px 8px; cursor: pointer; }
      .wb .chip[aria-pressed="true"] { color: var(--bone); border-color: var(--amber); background: rgba(227,166,83,.1); }
      .wb .chip:disabled { opacity: .45; cursor: default; }
      .wb .lbl { font-size: 11px; color: var(--muted); letter-spacing: .04em; text-transform: uppercase; display: flex; justify-content: space-between; }
      .wb .hint { font-size: 12px; color: var(--muted); margin: 0; }
      .wb .lib { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 300px; overflow: auto; padding-right: 2px; }
      .wb .item { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px; border-radius: 8px; border: 1px solid transparent; background: var(--chip); color: var(--bone); cursor: pointer; font: 11px/1.2 "IBM Plex Sans", system-ui, sans-serif; text-align: center; }
      .wb .item[aria-pressed="true"] { border-color: var(--amber); background: rgba(227,166,83,.12); }
      .wb .item canvas, .wb .item .ph { width: 72px; height: 72px; border-radius: 6px; background: #16211e; }
      .wb input[type=text], .wb input[type=search], .wb select { width: 100%; box-sizing: border-box; background: rgba(0,0,0,.25); color: var(--bone); border: 1px solid var(--line); border-radius: 6px; padding: 7px 8px; font: 13px "IBM Plex Sans", system-ui, sans-serif; }
      .wb .saves { display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow: auto; }
      .wb .save { display: flex; gap: 6px; align-items: center; font-size: 12px; }
      .wb .save span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wb .toggle { position: absolute; right: 10px; top: 10px; }
      .wb .note { font-size: 12px; color: var(--amber); min-height: 1em; margin: 0; }
      .wb-mini { position: fixed; left: 16px; top: 16px; z-index: 5; }
      @media (max-width: 720px) { .wb { width: calc(100% - 32px); max-height: 45%; top: auto; bottom: 16px; } }
    `;
    document.head.appendChild(css);
    const ui = document.createElement('div');
    ui.className = 'wb'; ui.hidden = true;
    ui.innerHTML = `
      <h2>Конструктор мира</h2>
      <div><div class="lbl">Инструмент</div><div class="row" data-r="tools"></div><p class="hint" data-r="hint"></p><p class="hint" data-r="perf" style="opacity:.7"></p></div>
      <div data-r="brushBox"><div class="lbl"><span>Кисть</span><output data-r="bsOut"></output></div><input type="range" min="1" max="7" step="1" data-r="bs" aria-label="Размер кисти"></div>
      <div data-r="typesBox"><div class="lbl">Покрытие</div><div class="row" data-r="types"></div></div>
      <div data-r="selBox" hidden><div class="lbl">Выбрано: <span data-r="selName"></span></div>
        <div class="row"><button class="chip" data-a="rl">⟲ 45°</button><button class="chip" data-a="rr">⟳ 45°</button><button class="chip" data-a="sm">−</button><button class="chip" data-a="sp">+</button><button class="chip" data-a="dn">↓</button><button class="chip" data-a="up">↑</button><button class="chip" data-a="dup">Копия</button><button class="chip" data-a="del">Удалить</button></div></div>
      <div><div class="lbl"><span>Библиотека</span><span data-r="libCount"></span></div>
        <div class="row" data-r="cats" style="margin:6px 0"></div>
        <input type="search" placeholder="Поиск ассета" data-r="q" aria-label="Поиск ассета">
        <div class="lib" data-r="lib" style="margin-top:6px"></div></div>
      <div><div class="lbl"><span>Карта</span><span data-r="dims"></span></div>
        <div class="row"><select data-r="size" aria-label="Размер карты" style="width:auto"><option value="16">16×16</option><option value="24">24×24</option><option value="32" selected>32×32</option><option value="48">48×48</option></select>
          <button class="chip" data-a="new">Новая</button><button class="chip" data-a="demo">Пример</button><button class="chip" data-a="undo">Отменить</button><button class="chip" data-a="redo">Вернуть</button></div>
        <div class="lbl" style="margin-top:8px">Расширить карту (без предела)</div>
        <div class="row"><button class="chip" data-a="exp-n">⬆ Север</button><button class="chip" data-a="exp-s">⬇ Юг</button><button class="chip" data-a="exp-w">⬅ Запад</button><button class="chip" data-a="exp-e">➡ Восток</button></div>
        <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:6px"><input type="checkbox" data-r="decor" checked> Трава и галька на земле</label></div>
      <div><div class="lbl">Вид</div>
        <div class="row"><button class="chip" data-a="topview">Сверху / орбита</button></div></div>
      <div><div class="lbl">Освещение</div>
        <div class="row"><label style="display:flex;gap:6px;align-items:center;font-size:12px">Тепло солнца<input type="range" min="0" max="1" step="0.05" data-r="lightWarm"></label></div>
        <div class="row"><label style="display:flex;gap:6px;align-items:center;font-size:12px">Яркость неба<input type="range" min="0" max="2" step="0.05" data-r="lightSky"></label></div>
        <div class="row"><label style="display:flex;gap:6px;align-items:center;font-size:12px">Общая яркость<input type="range" min="0.3" max="2" step="0.05" data-r="lightExp"></label></div>
        <div class="row"><button class="chip" data-a="lightReset">Сбросить</button></div></div>
      <div><div class="lbl">Лучи света в дымке</div>
        <div class="row"><label style="display:flex;gap:6px;align-items:center;font-size:12px">Сила лучей<input type="range" min="0" max="1" step="0.05" data-r="rays"></label></div>
        <p class="hint">Видны только там, где есть дымка (ползунок «Дымка» справа).</p></div>
      <div><div class="lbl">Сохранение</div>
        <input type="text" data-r="name" aria-label="Название мира" maxlength="60">
        <div class="row" style="margin-top:6px"><button class="chip" data-a="save">Сохранить</button><button class="chip" data-a="saveas">Как новый</button><button class="chip" data-a="export">JSON ↓</button><button class="chip" data-a="import">JSON ↑</button></div>
        <input type="file" accept="application/json,.json" data-r="file" hidden>
        <p class="note" data-r="note"></p>
        <div class="saves" data-r="saves"></div></div>
      <p class="hint">Правая кнопка — поворот камеры, колесо — масштаб, средняя кнопка или пробел + мышь — сдвиг. Q/E — поворот на 45°, WASD — сдвиг, [ ] — кисть, 1–8 — инструменты, Ctrl+Z — отмена. Сцену в .glb скачивает кнопка «Скачать модель» справа.</p>`;
    document.body.appendChild(ui);
    const $ = (r) => ui.querySelector(`[data-r="${r}"]`);
    // контекстное меню не мешает вращать камеру правой кнопкой
    const hookCanvas = () => { if (K.view && K.view.canvas && !hookCanvas.done) { hookCanvas.done = true; K.view.canvas.addEventListener('contextmenu', (e) => { if (K.view.state.view === ID) e.preventDefault(); }); } };

    function setTool(t) { tool = t; if (t !== 'select') select(null); syncUi(); }
    TOOLS.forEach((t, i) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t.name; b.title = `${t.hint} (${i + 1})`; b.dataset.tool = t.key; b.onclick = () => setTool(t.key); $('tools').appendChild(b); });
    TYPES.forEach((t, i) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = t.name; b.dataset.type = i; b.onclick = () => { paintType = i; setTool('paint'); }; $('types').appendChild(b); });
    $('bs').addEventListener('input', (e) => { brush = +e.target.value; syncUi(); });
    let cat = 'Все', q = '';
    ['Все', ...CATS].forEach((c) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = c; b.dataset.cat = c; b.onclick = () => { cat = c; renderLib(); }; $('cats').appendChild(b); });
    $('q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); renderLib(); });
    $('decor').addEventListener('change', (e) => { decorOn = e.target.checked; decorDirty = true; });
    $('name').addEventListener('change', (e) => { worldName = e.target.value.trim() || 'Мой мир'; });

    const thumbs = {}; // id → dataURL
    const thumbQueue = [];
    function renderLib() {
      const list = LIB.filter((e) => (cat === 'Все' || e.cat === cat) && (!q || e.name.toLowerCase().includes(q)));
      $('lib').innerHTML = '';
      $('libCount').textContent = list.length + ' из ' + LIB.length;
      list.forEach((e) => {
        const b = document.createElement('button');
        b.className = 'item'; b.dataset.id = e.id; b.setAttribute('aria-pressed', String(e.id === current));
        const im = document.createElement(thumbs[e.id] ? 'img' : 'div');
        if (thumbs[e.id]) { im.src = thumbs[e.id]; im.width = 72; im.height = 72; im.alt = ''; im.style.cssText = 'border-radius:6px;background:#16211e'; } else { im.className = 'ph'; if (!thumbQueue.includes(e.id)) thumbQueue.push(e.id); }
        const s = document.createElement('span'); s.textContent = e.name;
        b.append(im, s);
        b.onclick = () => { current = e.id; if (tool !== 'scatter') setTool('place'); renderLib(); };
        $('lib').appendChild(b);
      });
      ui.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    }
    function syncUi() {
      ui.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
      ui.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.type === paintType)));
      const tdef = TOOLS.find((t) => t.key === tool);
      $('hint').textContent = tdef ? tdef.hint : '';
      $('bs').value = brush; $('bsOut').textContent = brush * 2 - 1 + ' м';
      $('brushBox').hidden = tool === 'select' || tool === 'place';
      $('typesBox').hidden = tool !== 'paint';
      $('name').value = worldName;
      $('size').value = String([16, 24, 32, 48].includes(NX) && NX === NZ ? NX : 32);
      $('dims').textContent = NX + '×' + NZ + ' м';
      ui.querySelector('[data-a="undo"]').disabled = !hist.length;
      ui.querySelector('[data-a="redo"]').disabled = !redoS.length;
      syncSel();
    }
    function syncSel() {
      const o = sel != null && objs.get(sel);
      $('selBox').hidden = !o;
      if (o) $('selName').textContent = (byId[o.rec.id] || {}).name || o.rec.id;
    }
    const note = (s) => { $('note').textContent = s; };
    ui.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      const act = a.dataset.a;
      if (act === 'rl') rotateSel(-45); if (act === 'rr') rotateSel(45);
      if (act === 'sm') scaleSel(1 / 1.15); if (act === 'sp') scaleSel(1.15);
      if (act === 'dn') liftSel(-0.1); if (act === 'up') liftSel(0.1);
      if (act === 'dup') duplicate();
      if (act === 'del' && sel != null) { despawn(sel); commit(); }
      if (act === 'undo') undo(); if (act === 'redo') redo();
      if (act === 'new') { const n = +$('size').value; apply({ n, h: '', t: '', objs: [], name: 'Новый мир' }, { reframe: true }); commit(); currentDoc = null; }
      if (act === 'demo') { demoWorld(); rebuildTerrain(); reframeView(); worldName = 'Деревня у леса'; commit(); syncUi(); currentDoc = null; }
      if (act === 'export') exportJson();
      if (act === 'import') $('file').click();
      if (act === 'save') saveCloud(false);
      if (act === 'saveas') saveCloud(true);
      if (act === 'exp-n') expandMap('n');
      if (act === 'exp-s') expandMap('s');
      if (act === 'exp-w') expandMap('w');
      if (act === 'exp-e') expandMap('e');
      if (act === 'topview' && K.view.toggleTop) { K.view.toggleTop(); builderTop = !builderTop; }
      if (act === 'lightReset') { $('lightWarm').value = 0.5; $('lightSky').value = 1; $('lightExp').value = 1; syncLight(); }
    });
    function syncLight() {
      if (K.view.setLighting) K.view.setLighting({ warm: +$('lightWarm').value, sky: +$('lightSky').value, exposure: +$('lightExp').value });
    }
    ['lightWarm', 'lightSky', 'lightExp'].forEach((r) => $(r).addEventListener('input', syncLight));
    $('rays').addEventListener('input', (e) => { if (K.view.setRays) K.view.setRays(+e.target.value); });
    $('file').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try { const data = JSON.parse(await f.text()); if (!data || !data.n) throw new Error('bad'); apply(data, { reframe: true }); commit(); note('Мир загружен из файла'); currentDoc = null; }
      catch (err) { note('Не удалось прочитать файл: это не сцена конструктора'); }
      e.target.value = '';
    });
    function exportJson() {
      const blob = new Blob([JSON.stringify(serialize(), null, 0)], { type: 'application/json' });
      const fn = (worldName || 'world').replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.json';
      K.view.saveFile(fn, blob).then(() => note('Файл сохранён'), () => note('Сохранение файла отменено'));
    }

    // ---- общая база артефакта: коллекция worlds ----
    let db = null, currentDoc = null;
    const slug = (s) => (s || 'world').toLowerCase().replace(/[^a-z0-9а-яё_-]+/gi, '-').replace(/[^a-z0-9_-]/g, (ch) => 'x' + ch.charCodeAt(0).toString(36)).slice(0, 40) || 'world';
    async function initDb() {
      try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
      if (!db) { $('saves').innerHTML = '<p class="hint">Общее хранилище недоступно — сохраняйте в JSON. Черновик хранится в этом браузере.</p>'; ui.querySelector('[data-a="save"]').disabled = true; ui.querySelector('[data-a="saveas"]').disabled = true; return; }
      db.collection('worlds').orderBy('updated', 'desc').limit(100).onSnapshot((snap) => renderSaves(snap.docs), () => { $('saves').innerHTML = '<p class="hint">Список сохранений недоступен</p>'; });
    }
    function renderSaves(docs) {
      $('saves').innerHTML = '';
      if (!docs.length) { $('saves').innerHTML = '<p class="hint">Сохранённых миров пока нет</p>'; return; }
      docs.forEach((d) => {
        const data = d.data() || {};
        const row = document.createElement('div'); row.className = 'save';
        const s = document.createElement('span'); s.textContent = (data.name || d.id) + ' · ' + (data.n || '?') + '×' + (data.n || '?') + ' · ' + (data.count ?? '?') + ' объектов';
        const ld = document.createElement('button'); ld.className = 'chip'; ld.textContent = 'Открыть';
        ld.onclick = () => { try { apply(JSON.parse(data.scene), { reframe: true }); currentDoc = d.id; worldName = data.name || worldName; commit(); syncUi(); note('Открыт мир «' + (data.name || d.id) + '»'); } catch (e) { note('Сохранение повреждено'); } };
        const del = document.createElement('button'); del.className = 'chip'; del.textContent = '×'; del.title = 'Удалить сохранение'; del.setAttribute('aria-label', 'Удалить сохранение ' + (data.name || d.id));
        del.onclick = async () => { if (!confirmDel(del)) return; try { await db.doc('worlds/' + d.id).delete(); if (currentDoc === d.id) currentDoc = null; note('Сохранение удалено'); } catch (e) { note('Не удалось удалить'); } };
        row.append(s, ld, del);
        $('saves').appendChild(row);
      });
    }
    function confirmDel(btn) { if (btn.dataset.armed) return true; btn.dataset.armed = '1'; btn.textContent = 'Точно?'; setTimeout(() => { delete btn.dataset.armed; btn.textContent = '×'; }, 2500); return false; }
    let saving = false;
    async function saveCloud(asNew) {
      if (!db || saving) return;
      worldName = ($('name').value || '').trim() || 'Мой мир';
      const data = serialize(worldName);
      const scene = JSON.stringify(data);
      if (scene.length > 240000) { note('Мир слишком большой для общего хранилища — сохраните в JSON'); return; }
      const id = !asNew && currentDoc ? currentDoc : slug(worldName) + '-' + Date.now().toString(36);
      saving = true; note('Сохраняю…');
      try { await db.doc('worlds/' + id).set({ name: worldName, updated: Date.now(), n: Math.max(NX, NZ), count: objs.size, scene }); currentDoc = id; note('Сохранено: «' + worldName + '»'); }
      catch (e) { note(e && e.code === 'quota_exceeded' ? 'Хранилище заполнено — удалите старые миры' : 'Не удалось сохранить (' + ((e && e.code) || 'ошибка') + ')'); }
      saving = false;
    }

    // ---- миниатюры библиотеки: рисуются по одной за кадр в углу холста до основного прохода ----
    const thumbScene = new T.Scene();
    const thumbCam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    thumbScene.add(new T.HemisphereLight(0xdfe6d8, 0x2a2a22, 0.9));
    const tdl = new T.DirectionalLight(0xfff0d8, 1.8); tdl.position.set(-4, 8, 5); thumbScene.add(tdl);
    const tcv = document.createElement('canvas'); tcv.width = tcv.height = 144;
    function makeThumb(id) {
      const e = byId[id], r = K.view && K.view.renderer;
      if (!e || !r) return;
      let obj;
      try { obj = template(e).obj; } catch (err) { thumbs[id] = ''; return; }
      const prevParent = obj.parent;
      thumbScene.environment = K.view.scene.environment;
      thumbScene.add(obj);
      const box = new T.Box3().setFromObject(obj), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3());
      const rad = Math.max(0.5, sz.length() * 0.5);
      const a = 45 * Math.PI / 180, el = 35 * Math.PI / 180;
      thumbCam.position.set(c.x + 60 * Math.cos(el) * Math.sin(a), c.y + 60 * Math.sin(el), c.z + 60 * Math.cos(el) * Math.cos(a));
      thumbCam.lookAt(c);
      thumbCam.left = -rad; thumbCam.right = rad; thumbCam.top = rad; thumbCam.bottom = -rad; thumbCam.updateProjectionMatrix();
      const S = 144, pr = r.getPixelRatio(), vp = new T.Vector4(), sc = new T.Vector4();
      r.getViewport(vp); r.getScissor(sc); const st = r.getScissorTest(), ac = r.autoClear, cc = r.getClearColor(new T.Color()), ca = r.getClearAlpha();
      r.setRenderTarget(null);
      r.setViewport(0, 0, S / pr, S / pr); r.setScissor(0, 0, S / pr, S / pr); r.setScissorTest(true);
      r.setClearColor(0x16211e, 1); r.clear(); r.render(thumbScene, thumbCam);
      const g = tcv.getContext('2d'); g.clearRect(0, 0, S, S);
      g.drawImage(r.domElement, 0, r.domElement.height - S, S, S, 0, 0, S, S);
      r.setViewport(vp); r.setScissor(sc); r.setScissorTest(st); r.autoClear = ac; r.setClearColor(cc, ca);
      thumbScene.remove(obj);
      if (prevParent) prevParent.add(obj);
      try { thumbs[id] = tcv.toDataURL('image/png'); } catch (err) { thumbs[id] = ''; }
      const b = $('lib').querySelector(`[data-id="${id}"] .ph`);
      if (b && thumbs[id]) { const im = document.createElement('img'); im.src = thumbs[id]; im.width = 72; im.height = 72; im.alt = ''; im.style.cssText = 'border-radius:6px;background:#16211e'; b.replaceWith(im); }
    }

    // =================================================================
    // СТАРТ
    // =================================================================
    let started = false;
    function start() {
      if (started) return;
      started = true;
      hookCanvas();
      let loaded = false;
      try { const d = localStorage.getItem(DRAFT); if (d) { apply(JSON.parse(d)); loaded = true; } } catch (e) { /* нет черновика */ }
      if (!loaded) { demoWorld(); worldName = 'Деревня у леса'; rebuildTerrain(); }
      lastSnap = JSON.stringify(serialize());
      reframeView();
      $('lightWarm').value = 0.5; $('lightSky').value = 1; $('lightExp').value = 1; $('rays').value = 0;
      renderLib(); syncUi(); initDb();
      K.view.refreshLights(ID);
    }
    // карта строится сразу (нужен размер вида), интерфейс — при первом открытии
    demoWorld(); rebuildTerrain(); rebuildDecor();

    let lightTimer = 0, thumbTimer = 0;
    const perf = { t: 0, d: 0 };
    // время пересборки — видно, если конструктор тормозит на слабой машине
    const perfShow = () => { $('perf').textContent = `Пересборка: земля ${Math.round(perf.t)} мс, детали ${Math.round(perf.d)} мс · объектов ${objs.size}`; };
    function update(dt, t) {
      const active = K.view && K.view.state.view === ID;
      ui.hidden = !active;
      if (!active) return;
      if (!started) start();
      if (terrainDirty) { terrainDirty = false; const t0 = performance.now(); rebuildTerrain(); perf.t = performance.now() - t0; perfShow(); }
      if (decorDirty && !drag) { decorDirty = false; const t0 = performance.now(); rebuildDecor(); perf.d = performance.now() - t0; perfShow(); }
      if (lightsDirty && (lightTimer += dt) > 0.3) { lightsDirty = false; lightTimer = 0; K.view.refreshLights(ID); }
      for (const o of objs.values()) if (o.inst.update) o.inst.update(dt, t);
      // миниатюры строят шаблоны ассетов (часовня, алтарь — сотни мс): не чаще раза в 0,15 с и не во время мазка
      if (thumbQueue.length && !drag && (thumbTimer += dt) > 0.15) { thumbTimer = 0; makeThumb(thumbQueue.shift()); }
      if (selBox) selBox.update();
    }
    return {
      group: holder, update, input, keepCamera: true,
      onShow: (on) => { ui.hidden = !on; if (!on) { K.view.setLighting && K.view.setLighting({ warm: 0.5, sky: 1, exposure: 1 }); K.view.setRays && K.view.setRays(0); if (builderTop) { K.view.toggleTop(); builderTop = false; } } },
      exportFn: (save) => new T.GLTFExporter().parse(world, save, { binary: true }),
    };
  }

  models.push({ id: ID, name: 'Конструктор', footprint: [32, 32], heightM: 10, seed: 1, noPlate: true, noHuman: true, zoom: 1,
    fog: { center: [16, 16], clear: 14.7, falloff: 4, height: 1.7, top: 9, ground: 0, density: 0.5 }, build: buildBuilder });
})();
