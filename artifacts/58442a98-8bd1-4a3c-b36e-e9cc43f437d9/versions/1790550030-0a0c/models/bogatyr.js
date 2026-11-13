/**
 * character_bogatyr — «Русский хтонический богатырь-защитник».
 *
 * Персонаж собран теми же функциями кита, что изба и ель (part → грани → роспись),
 * но каждая деталь привязана к кости скелета: получается SkinnedMesh, который
 * экспортируется в .glb со скелетом, морфами эмоций и анимациями.
 *
 * Бинд-поза — T-поза, лицом к +Z, ноги в (0,0,0), 1 единица = 1 м.
 * Кости названы по схеме Unity Humanoid (Hips, Spine, Chest, Neck, Head,
 * LeftUpperArm…), плюс сокеты оружия и цепочка плаща.
 */
(() => {
  const models = (window.LPK_MODELS = window.LPK_MODELS || []);

  // ---------- палитра персонажа (снята с концепта, приведена к базе знаний) ----------
  const C = {
    skin: '#b08f74', hair: '#9a7440', hairLight: '#ad8a50', hairDark: '#7a5a32', brow: '#6e5230',
    eye: '#2b2520', mouth: '#3b2521',
    red: '#7b3526', redDark: '#5e2a20', gold: '#a6823f', bronze: '#8f6d35',
    steel: '#6d6f68', steelLight: '#8d8f88', steelDark: '#4f514b', mail: '#50524c',
    leather: '#5b3b26', leatherDark: '#43301f', strap: '#6a4128',
    trousers: '#8b8069', wraps: '#9a8f78', boot: '#5b3c27', bootCuff: '#6a4a30', bone: '#c4b89c',
  };

  // ---------- дополнительные рисованные текстуры (тот же приём, что у стенда: светлая база, бесшовные мазки) ----------
  function canvasTex(T, draw, size = 256, seed0 = 1) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    let s = seed0;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const wrap = (fn) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
    draw(g, size, r, wrap);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  const grey = (v, a) => `rgba(${v},${v},${v},${a})`;
  function blot(g, r, wrap, s, n, rad, dark, light, alpha) {
    for (let i = 0; i < n; i++) {
      const x = r() * s, y = r() * s, rr = rad[0] + r() * (rad[1] - rad[0]);
      const col = r() < 0.6 ? grey(dark, alpha * (0.6 + r())) : grey(light, alpha * (0.5 + r()));
      const pts = [];
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.283, q = rr * (0.7 + r() * 0.5); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
      wrap(() => { g.fillStyle = col; g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill(); });
    }
  }
  function strokes(g, r, wrap, s, n, len, w, dark, light, dir = 0, wob = 2) {
    for (let i = 0; i < n; i++) {
      const x = r() * s, y = r() * s, l = len[0] + r() * (len[1] - len[0]), lw = w[0] + r() * (w[1] - w[0]);
      const a = dir + (r() - 0.5) * 0.3;
      const col = r() < 0.6 ? grey(dark, 0.16 + r() * 0.2) : grey(light, 0.12 + r() * 0.14);
      const o = (r() - 0.5) * wob * 2;
      wrap(() => {
        g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * o, y + Math.sin(a) * l * 0.5 + Math.cos(a) * o, x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      });
    }
  }
  function installTextures(K) {
    const { T } = K;
    if (K.TEX.cloth) return;
    K.TEX.cloth = canvasTex(T, (g, s, r, wrap) => {
      g.fillStyle = grey(232, 1); g.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 4) { g.fillStyle = grey(r() < 0.5 ? 200 : 250, 0.18); g.fillRect(0, y, s, 1.5); }
      blot(g, r, wrap, s, 40, [8, 26], 90, 255, 0.12);
      strokes(g, r, wrap, s, 50, [30, 90], [1, 2.5], 70, 255, Math.PI / 2, 3);
    }, 256, 7);
    K.TEX.metal = canvasTex(T, (g, s, r, wrap) => {
      g.fillStyle = grey(228, 1); g.fillRect(0, 0, s, s);
      blot(g, r, wrap, s, 60, [6, 22], 80, 255, 0.15);
      strokes(g, r, wrap, s, 40, [10, 40], [0.8, 1.6], 60, 255, 0.4, 1);
      blot(g, r, wrap, s, 30, [1, 3], 50, 255, 0.35);
    }, 256, 13);
    K.TEX.leather = canvasTex(T, (g, s, r, wrap) => {
      g.fillStyle = grey(230, 1); g.fillRect(0, 0, s, s);
      blot(g, r, wrap, s, 70, [5, 20], 80, 255, 0.14);
      strokes(g, r, wrap, s, 30, [15, 50], [1, 2], 50, 255, 0, 4);
    }, 256, 19);
    K.TEX.hair = canvasTex(T, (g, s, r, wrap) => {
      g.fillStyle = grey(226, 1); g.fillRect(0, 0, s, s);
      strokes(g, r, wrap, s, 160, [40, 160], [1.5, 4], 60, 255, Math.PI / 2, 5);
    }, 256, 23);
    Object.assign(K.TEX_SCALE, { cloth: 2.2, metal: 2.6, leather: 2.4, hair: 3.0 });
  }

  // ---------- скелет ----------
  const BONES = [
    ['Root', null, [0, 0, 0]],
    ['Hips', 'Root', [0, 0.98, 0]],
    ['Spine', 'Hips', [0, 1.1, 0]],
    ['Chest', 'Spine', [0, 1.3, 0]],
    ['Neck', 'Chest', [0, 1.58, 0]],
    ['Head', 'Neck', [0, 1.66, 0]],
    ['Jaw', 'Head', [0, 1.69, 0.07]],
    ['BrowL', 'Head', [0.045, 1.8, 0.108]],
    ['BrowR', 'Head', [-0.045, 1.8, 0.108]],
    ['EyeL', 'Head', [0.043, 1.777, 0.106]],
    ['EyeR', 'Head', [-0.043, 1.777, 0.106]],
    ['Mouth', 'Head', [0, 1.7, 0.108]],
    ['MustL', 'Head', [0.005, 1.722, 0.118]],
    ['MustR', 'Head', [-0.005, 1.722, 0.118]],
    ['LeftShoulder', 'Chest', [0.1, 1.5, 0]],
    ['LeftUpperArm', 'LeftShoulder', [0.3, 1.5, 0]],
    ['LeftLowerArm', 'LeftUpperArm', [0.6, 1.5, 0]],
    ['LeftHand', 'LeftLowerArm', [0.86, 1.5, 0]],
    ['ShieldSocket', 'LeftHand', [0.98, 1.5, 0]],
    ['RightShoulder', 'Chest', [-0.1, 1.5, 0]],
    ['RightUpperArm', 'RightShoulder', [-0.3, 1.5, 0]],
    ['RightLowerArm', 'RightUpperArm', [-0.6, 1.5, 0]],
    ['RightHand', 'RightLowerArm', [-0.86, 1.5, 0]],
    ['WeaponSocket', 'RightHand', [-0.93, 1.5, 0]],
    ['Cloak1', 'Chest', [0, 1.45, -0.22]],
    ['Cloak2', 'Cloak1', [0, 1.0, -0.28]],
    ['Cloak3', 'Cloak2', [0, 0.55, -0.34]],
    ['LeftUpperLeg', 'Hips', [0.13, 0.94, 0]],
    ['LeftLowerLeg', 'LeftUpperLeg', [0.13, 0.52, 0]],
    ['LeftFoot', 'LeftLowerLeg', [0.13, 0.1, 0]],
    ['LeftToes', 'LeftFoot', [0.13, 0.03, 0.17]],
    ['RightUpperLeg', 'Hips', [-0.13, 0.94, 0]],
    ['RightLowerLeg', 'RightUpperLeg', [-0.13, 0.52, 0]],
    ['RightFoot', 'RightLowerLeg', [-0.13, 0.1, 0]],
    ['RightToes', 'RightFoot', [-0.13, 0.03, 0.17]],
  ];

  // ---------- эмоции: сдвиг/поворот/масштаб частей лица относительно их центра ----------
  // лицевые кости: BrowL/BrowR (+X — левая сторона персонажа), EyeL/EyeR, Mouth, MustL/MustR, Jaw (борода)
  const EMOTIONS = {
    'Решимость': { BrowL: { r: 0.18, t: [0, -0.004, 0] }, BrowR: { r: -0.18, t: [0, -0.004, 0] }, EyeL: { s: [1, 0.75, 1] }, EyeR: { s: [1, 0.75, 1] }, Mouth: { s: [0.85, 0.8, 1] } },
    'Ярость': { BrowL: { r: 0.36, t: [0, -0.01, 0] }, BrowR: { r: -0.36, t: [0, -0.01, 0] }, EyeL: { s: [1, 1.25, 1] }, EyeR: { s: [1, 1.25, 1] },
      Mouth: { s: [1.3, 4.5, 1], t: [0, -0.014, 0] }, MustL: { r: -0.18 }, MustR: { r: 0.18 }, Jaw: { t: [0, -0.028, 0.004] } },
    'Спокойствие': { BrowL: { r: -0.1, t: [0, 0.006, 0] }, BrowR: { r: 0.1, t: [0, 0.006, 0] }, EyeL: { s: [1, 0.45, 1] }, EyeR: { s: [1, 0.45, 1] }, MustL: { r: 0.06 }, MustR: { r: -0.06 } },
    'Скорбь': { BrowL: { r: -0.38, t: [0, 0.004, 0] }, BrowR: { r: 0.38, t: [0, 0.004, 0] }, EyeL: { s: [1, 0.6, 1] }, EyeR: { s: [1, 0.6, 1] },
      Mouth: { s: [0.8, 1, 1] }, MustL: { r: -0.3 }, MustR: { r: 0.3 } },
    'Радость': { BrowL: { r: -0.12, t: [0, 0.012, 0] }, BrowR: { r: 0.12, t: [0, 0.012, 0] }, EyeL: { s: [1, 0.55, 1] }, EyeR: { s: [1, 0.55, 1] },
      Mouth: { s: [1.45, 3.2, 1], t: [0, -0.008, 0] }, MustL: { r: 0.32 }, MustR: { r: -0.32 }, Jaw: { t: [0, -0.014, 0] } },
    'Насмешка': { BrowL: { r: -0.16, t: [0, 0.018, 0] }, BrowR: { r: -0.12, t: [0, -0.004, 0] }, EyeR: { s: [1, 0.6, 1] },
      Mouth: { s: [1.15, 1.8, 1], t: [0.01, 0, 0], r: 0.18 }, MustL: { r: 0.4 }, MustR: { r: 0.05 } },
    'Удивление': { BrowL: { r: -0.08, t: [0, 0.026, 0] }, BrowR: { r: 0.08, t: [0, 0.026, 0] }, EyeL: { s: [1.15, 1.8, 1] }, EyeR: { s: [1.15, 1.8, 1] },
      Mouth: { s: [0.9, 4.8, 1], t: [0, -0.016, 0] }, Jaw: { t: [0, -0.03, 0.004] } },
  };
  const EMOTION_NAMES = ['Нейтральный', ...Object.keys(EMOTIONS)];

  // ---------- позы (Эйлер XYZ относительно T-позы) ----------
  const GUARD = {
    Hips: [0, 0.12, 0],
    Spine: [0.03, -0.05, 0],
    Chest: [0.02, -0.08, 0],
    Neck: [0, 0.05, 0],
    Head: [-0.04, 0.05, 0],
    LeftShoulder: [0, 0, -0.1],
    LeftUpperArm: [-0.15, 0.3, -1.4],
    LeftLowerArm: [0, -1.4, 0],
    ShieldSocket: [0, 0, 0],
    LeftHand: [0, 0, 0],
    RightShoulder: [0, 0, 0.1],
    RightUpperArm: [-0.12, -0.1, 1.2],
    RightLowerArm: [0, 0.45, 0],
    RightHand: [0.9, 0, 0],
    WeaponSocket: [0, 0, 0],
    Cloak1: [0.06, 0, 0], Cloak2: [0.04, 0, 0], Cloak3: [0.03, 0, 0],
    LeftUpperLeg: [0.05, 0, 0.1], LeftLowerLeg: [0.05, 0, 0], LeftFoot: [-0.1, 0, -0.1],
    RightUpperLeg: [-0.12, 0, -0.1], RightLowerLeg: [0.12, 0, 0], RightFoot: [0, 0, 0.1],
  };
  const HIPS_Y = 0.98;

  models.push({
    id: 'bogatyr',
    name: 'Богатырь',
    footprint: [1, 1],
    heightM: 2.1,
    zoom: 1.5,
    humanGap: 1.3,
    seed: 777,
    build(K) {
      const { T, PAL, M, part, rand } = K;
      installTextures(K);
      const V3 = (x, y, z) => new T.Vector3(x, y, z);

      // кости
      const bones = {}, boneList = [], boneIndex = {};
      const root = new T.Group();
      root.name = 'character_bogatyr';
      for (const [name, parent, p] of BONES) {
        const b = new T.Bone();
        b.name = name;
        const pw = parent ? BONES.find((x) => x[0] === parent)[2] : [0, 0, 0];
        b.position.set(p[0] - pw[0], p[1] - pw[1], p[2] - pw[2]);
        (parent ? bones[parent] : root).add(b);
        bones[name] = b;
        boneIndex[name] = boneList.length;
        boneList.push(b);
      }
      const bw = (name) => BONES.find((x) => x[0] === name)[2];

      // детали: группа меша, геометрия, вес кости, роль для эмоций
      const P = { body: [], head: [], helmet: [], cloak: [], sword: [], shield: [] };
      function add(group, geo, hex, opt, skin) {
        const g = part(geo, hex, opt);
        const pos = g.attributes.position, n = pos.count;
        const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        const v = new T.Vector3();
        for (let i = 0; i < n; i++) {
          v.fromBufferAttribute(pos, i);
          let w = typeof skin === 'function' ? skin(v) : typeof skin === 'string' ? [[skin, 1]] : skin;
          let sum = 0;
          w = w.slice(0, 4);
          w.forEach(([, ww]) => (sum += ww));
          w.forEach(([bn, ww], k) => { si[i * 4 + k] = boneIndex[bn]; sw[i * 4 + k] = ww / sum; });
        }
        g.setAttribute('skinIndex', new T.BufferAttribute(si, 4));
        g.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
        P[group].push(g);
        return g;
      }
      const lerpW = (a, b, t) => (t <= 0 ? [[a, 1]] : t >= 1 ? [[b, 1]] : [[a, 1 - t], [b, t]]);
      const clamp01 = (x) => Math.max(0, Math.min(1, x));
      // торс: таз → поясница → грудь по высоте
      const torsoW = (v) => (v.y < 1.1 ? lerpW('Hips', 'Spine', clamp01((v.y - 1.0) / 0.1)) : lerpW('Spine', 'Chest', clamp01((v.y - 1.18) / 0.12)));
      // плащ: грудь → цепочка из трёх костей по высоте
      const cloakW = (v) => {
        if (v.y > 1.38) return [['Chest', 1]];
        if (v.y > 1.0) return lerpW('Cloak1', 'Chest', clamp01((v.y - 1.2) / 0.18));
        if (v.y > 0.55) return lerpW('Cloak2', 'Cloak1', clamp01((v.y - 0.55) / 0.45));
        return lerpW('Cloak3', 'Cloak2', clamp01((v.y - 0.25) / 0.3));
      };
      // подол брони: таз + ближняя нога
      const skirtW = (v) => {
        const side = v.x > 0.04 ? 'LeftUpperLeg' : v.x < -0.04 ? 'RightUpperLeg' : null;
        const low = clamp01((0.9 - v.y) / 0.22);
        return side ? [['Hips', 1 - 0.45 * low], [side, 0.45 * low]] : [['Hips', 1]];
      };

      // ================= НОГИ =================
      for (const s of [1, -1]) {
        const L = s > 0 ? 'Left' : 'Right', x = 0.13 * s;
        add('body', new T.CylinderGeometry(0.125, 0.105, 0.46, 7), C.trousers, { m: M(x, 0.74, 0, 0, 0.3, 0), tex: 'cloth', axis: [0, 1, 0], vary: 0.08 },
          (v) => (v.y > 0.9 ? [['Hips', 0.4], [L + 'UpperLeg', 0.6]] : v.y < 0.56 ? [[L + 'UpperLeg', 0.6], [L + 'LowerLeg', 0.4]] : [[L + 'UpperLeg', 1]]));
        // складки штанин над коленом
        add('body', new T.CylinderGeometry(0.118, 0.11, 0.1, 7), C.trousers, { m: M(x, 0.56, 0.01, 0.1, 0.1, 0), tex: 'cloth', vary: 0.1 }, [[L + 'UpperLeg', 0.5], [L + 'LowerLeg', 0.5]]);
        // онучи и обмотки
        add('body', new T.CylinderGeometry(0.098, 0.085, 0.3, 7), C.wraps, { m: M(x, 0.4, 0.01), tex: 'cloth', axis: [0, 1, 0] }, L + 'LowerLeg');
        for (const [y, r] of [[0.46, 0.35], [0.38, -0.35]]) {
          add('body', new T.BoxGeometry(0.2, 0.024, 0.02), C.leatherDark, { m: M(x, y, 0.095, 0, 0, r), jitter: 0.004 }, L + 'LowerLeg');
        }
        // сапоги с отворотом
        add('body', new T.CylinderGeometry(0.106, 0.1, 0.24, 7), C.boot, { m: M(x, 0.2, 0.01), tex: 'leather', axis: [0, 1, 0] },
          (v) => (v.y < 0.12 ? [[L + 'LowerLeg', 0.5], [L + 'Foot', 0.5]] : [[L + 'LowerLeg', 1]]));
        add('body', new T.CylinderGeometry(0.122, 0.116, 0.06, 7), C.bootCuff, { m: M(x, 0.33, 0.01), tex: 'leather' }, L + 'LowerLeg');
        add('body', new T.BoxGeometry(0.15, 0.1, 0.24, 1, 1, 2), C.boot, { m: M(x, 0.05, 0.05), tex: 'leather', axis: [0, 0, 1], jitter: 0.012 },
          (v) => (v.z > 0.12 ? [[L + 'Toes', 1]] : [[L + 'Foot', 1]]));
        add('body', new T.BoxGeometry(0.14, 0.075, 0.08), C.boot, { m: M(x, 0.04, 0.2, 0.15, 0, 0), tex: 'leather', jitter: 0.01 }, L + 'Toes');
        add('body', new T.BoxGeometry(0.16, 0.025, 0.28), C.leatherDark, { m: M(x, 0.01, 0.06), jitter: 0.006, ao: false }, [[L + 'Foot', 0.6], [L + 'Toes', 0.4]]);
      }

      // ================= ТАЗ, ПОЯС, ПОДОЛ =================
      add('body', new T.CylinderGeometry(0.2, 0.19, 0.18, 8), C.mail, { m: M(0, 0.97, 0, 0, 0, 0, V3(1, 1, 0.8)), tex: 'metal' }, 'Hips');
      add('body', new T.CylinderGeometry(0.22, 0.26, 0.3, 10, 1, true), C.mail, { m: M(0, 0.82, 0, 0, 0, 0, V3(1, 1, 0.82)), tex: 'metal', vary: 0.08 }, skirtW);
      // ламели подола: два ряда
      for (let row = 0; row < 2; row++) {
        const y = 0.9 - row * 0.1, rx = 0.245 + row * 0.015, rz = 0.205 + row * 0.012, n = 12;
        for (let i = 0; i < n; i++) {
          const a = ((i + row * 0.5) / n) * Math.PI * 2;
          add('body', new T.BoxGeometry(0.1, 0.11, 0.018), rand() < 0.3 ? C.steelDark : C.steel,
            { m: M(Math.sin(a) * rx, y, Math.cos(a) * rz, 0.06, a, 0), tex: 'metal', vary: 0.14, jitter: 0.006 }, skirtW);
        }
      }
      // красная кайма с костяным узором
      add('body', new T.CylinderGeometry(0.27, 0.275, 0.06, 12, 1, true), C.red, { m: M(0, 0.7, 0, 0, 0, 0, V3(1, 1, 0.84)), tex: 'cloth' }, skirtW);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add('body', new T.BoxGeometry(0.035, 0.022, 0.012), C.bone, { m: M(Math.sin(a) * 0.278, 0.7, Math.cos(a) * 0.236, 0, a, Math.PI / 4), jitter: 0, ao: false }, skirtW);
      }
      // пояс, заклёпки, пряжка-солнце, кошель
      add('body', new T.CylinderGeometry(0.218, 0.218, 0.08, 10), C.leather, { m: M(0, 1.03, 0, 0, 0, 0, V3(1, 1, 0.84)), tex: 'leather', axis: [1, 0, 0] }, 'Hips');
      for (let i = 0; i < 8; i++) {
        const a = ((i + 0.5) / 8) * Math.PI * 2;
        add('body', new T.BoxGeometry(0.022, 0.022, 0.012), C.bronze, { m: M(Math.sin(a) * 0.222, 1.03, Math.cos(a) * 0.188, 0, a, 0), jitter: 0 }, 'Hips');
      }
      add('body', new T.CylinderGeometry(0.068, 0.068, 0.03, 8), C.gold, { m: M(0, 1.03, 0.19, Math.PI / 2, 0, 0), tex: 'metal', jitter: 0.003 }, 'Hips');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, l = i % 2 ? 0.04 : 0.06;
        add('body', new T.ConeGeometry(0.012, l, 3), C.bronze, { m: M(Math.cos(a) * 0.035, 1.03 + Math.sin(a) * 0.035, 0.207, 0, 0, a - Math.PI / 2, V3(1, 1, 0.4)), jitter: 0 }, 'Hips');
      }
      add('body', new T.BoxGeometry(0.1, 0.12, 0.05), C.leatherDark, { m: M(0.17, 0.93, 0.12, 0, 0.6, 0), tex: 'leather', jitter: 0.008 }, [['Hips', 0.7], ['LeftUpperLeg', 0.3]]);
      add('body', new T.BoxGeometry(0.05, 0.05, 0.02), C.bronze, { m: M(0.188, 0.95, 0.145, 0, 0.6, 0), jitter: 0 }, 'Hips');

      // ================= ТОРС =================
      add('body', new T.CylinderGeometry(0.205, 0.2, 0.46, 8), C.mail, { m: M(0, 1.3, 0, 0, 0, 0, V3(1, 1, 0.8)), tex: 'metal' }, torsoW);
      // ламеллярный доспех: 5 рядов пластин
      for (let row = 0; row < 5; row++) {
        const y = 1.14 + row * 0.085, rx = 0.222 + (row === 4 ? -0.01 : 0), rz = 0.182, n = 14;
        for (let i = 0; i < n; i++) {
          const a = ((i + (row % 2) * 0.5) / n) * Math.PI * 2;
          if (row === 4 && Math.abs(Math.sin(a)) > 0.8) continue; // под мышками пусто
          add('body', new T.BoxGeometry(0.095, 0.1, 0.02), rand() < 0.3 ? C.steelDark : C.steel,
            { m: M(Math.sin(a) * rx, y, Math.cos(a) * rz, -0.05, a, 0), tex: 'metal', vary: 0.14, jitter: 0.005 }, torsoW);
        }
      }
      // бронзовая окантовка ворота и красная кайма
      add('body', new T.CylinderGeometry(0.19, 0.22, 0.05, 10, 1, true), C.red, { m: M(0, 1.53, 0, 0, 0, 0, V3(1, 1, 0.8)), tex: 'cloth' }, 'Chest');
      // перевязь через грудь (с правого плеча к левому бедру) и накладки
      add('body', new T.BoxGeometry(0.06, 0.8, 0.022), C.strap, { m: M(-0.01, 1.28, 0.195, 0.08, 0, 0.59), tex: 'leather', axis: [0, 1, 0], jitter: 0.006 }, torsoW);
      for (const t of [-0.25, 0, 0.25]) {
        add('body', new T.CylinderGeometry(0.022, 0.022, 0.015, 6), C.bronze, { m: M(-0.01 - Math.sin(0.59) * t, 1.28 + Math.cos(0.59) * t, 0.21, Math.PI / 2, 0, 0), jitter: 0 }, torsoW);
      }
      // шея
      add('body', new T.CylinderGeometry(0.068, 0.08, 0.14, 7), C.skin, { m: M(0, 1.6, 0.005), ao: false }, [['Neck', 0.6], ['Chest', 0.4]]);

      // ================= ОПЛЕЧЬЕ, ПЛЕЧИ, РУКИ =================
      add('cloak', new T.CylinderGeometry(0.2, 0.34, 0.17, 10, 1, true), C.red, { m: M(0, 1.52, -0.01, 0, 0, 0, V3(1, 1, 0.86)), tex: 'cloth', vary: 0.08 },
        (v) => (Math.abs(v.x) > 0.24 ? [['Chest', 0.6], [v.x > 0 ? 'LeftUpperArm' : 'RightUpperArm', 0.4]] : [['Chest', 1]]));
      for (const s of [1, -1]) {
        const L = s > 0 ? 'Left' : 'Right';
        // застёжки плаща
        add('body', new T.CylinderGeometry(0.048, 0.048, 0.025, 8), C.gold, { m: M(0.17 * s, 1.47, 0.165, Math.PI / 2 - 0.25, 0, 0), tex: 'metal', jitter: 0.003 }, 'Chest');
        // наплечники: два ряда пластин
        add('body', new T.IcosahedronGeometry(1, 0), C.steel, { m: M(0.3 * s, 1.55, 0, 0, 0, -0.35 * s, V3(0.13, 0.055, 0.125)), tex: 'metal', vary: 0.12, jitter: 0.006, ao: false },
          [['Chest', 0.3], [L + 'UpperArm', 0.7]]);
        add('body', new T.IcosahedronGeometry(1, 0), C.steelDark, { m: M(0.35 * s, 1.5, 0, 0, 0, -0.6 * s, V3(0.12, 0.05, 0.12)), tex: 'metal', vary: 0.12, jitter: 0.006, ao: false },
          [['Chest', 0.15], [L + 'UpperArm', 0.85]]);
        add('body', new T.CylinderGeometry(0.125, 0.125, 0.018, 8), C.bronze, { m: M(0.37 * s, 1.47, 0, 0, 0, -0.6 * s), jitter: 0.004 }, L + 'UpperArm');
        // плечо (кольчуга)
        add('body', new T.CylinderGeometry(0.078, 0.07, 0.3, 7), C.mail, { m: M(0.45 * s, 1.5, 0, 0, 0, Math.PI / 2), tex: 'metal', axis: [0, 1, 0] },
          (v) => (Math.abs(v.x) > 0.56 ? [[L + 'UpperArm', 0.6], [L + 'LowerArm', 0.4]] : [[L + 'UpperArm', 1]]));
        // наручи с бронзовыми кольцами
        add('body', new T.CylinderGeometry(0.074, 0.063, 0.26, 7), C.leather, { m: M(0.73 * s, 1.5, 0, 0, 0, Math.PI / 2), tex: 'leather', axis: [0, 1, 0] },
          (v) => (Math.abs(v.x) < 0.63 ? [[L + 'LowerArm', 0.7], [L + 'UpperArm', 0.3]] : [[L + 'LowerArm', 1]]));
        for (const xx of [0.64, 0.83]) {
          add('body', new T.CylinderGeometry(0.078, 0.078, 0.03, 7), C.bronze, { m: M(xx * s, 1.5, 0, 0, 0, Math.PI / 2), jitter: 0.003 }, L + 'LowerArm');
        }
        // кулак
        add('body', new T.BoxGeometry(0.11, 0.1, 0.11), C.skin, { m: M(0.925 * s, 1.49, 0.005), jitter: 0.008, ao: false }, L + 'Hand');
        add('body', new T.BoxGeometry(0.05, 0.04, 0.09), C.skin, { m: M(0.9 * s, 1.535, 0.02, 0, 0, 0.3 * s), jitter: 0.005, ao: false }, L + 'Hand');
      }

      // ================= ГОЛОВА И ЛИЦО =================
      add('head', new T.IcosahedronGeometry(1, 1), C.skin, { m: M(0, 1.755, 0, 0, 0, 0, V3(0.105, 0.13, 0.115)), jitter: 0.004, ao: false, vary: 0.06 }, 'Head');
      add('head', new T.ConeGeometry(0.028, 0.075, 4), C.skin, { m: M(0, 1.748, 0.122, 1.9, 0, 0), jitter: 0.002, ao: false }, 'Head');
      // скулы
      for (const s of [1, -1]) add('head', new T.BoxGeometry(0.05, 0.03, 0.03), C.skin, { m: M(0.058 * s, 1.742, 0.092, 0, 0.5 * s, 0), jitter: 0.003, ao: false }, 'Head');
      // глаза, брови, рот, усы, борода — с ролями для морфов
      for (const s of [1, -1]) {
        const side = s > 0 ? 'L' : 'R';
        add('head', new T.BoxGeometry(0.036, 0.016, 0.01), C.eye, { m: M(0.043 * s, 1.777, 0.106), jitter: 0, ao: false, vary: 0 }, 'Eye' + side);
        add('head', new T.BoxGeometry(0.072, 0.02, 0.028), C.brow, { m: M(0.045 * s, 1.8, 0.108, 0, 0, 0.2 * s), jitter: 0.002, ao: false, tex: 'hair', axis: [1, 0, 0] }, 'Brow' + side);
        add('head', new T.ConeGeometry(0.02, 0.11, 4), C.hair, { m: M(0.046 * s, 1.708, 0.113, 0, 0, -1.92 * s, V3(1, 1, 0.6)), jitter: 0.003, ao: false, tex: 'hair', axis: [0, 1, 0] },
          'Must' + side);
      }
      add('head', new T.BoxGeometry(0.056, 0.012, 0.02), C.mouth, { m: M(0, 1.7, 0.108), jitter: 0, ao: false, vary: 0 }, 'Mouth');
      // борода: основной объём, клин до груди, боковые пряди
      add('head', new T.IcosahedronGeometry(1, 0), C.hair, { m: M(0, 1.64, 0.078, 0.2, 0, 0, V3(0.12, 0.11, 0.07)), jitter: 0.006, ao: false, tex: 'hair', axis: [0, 1, 0], vary: 0.1 }, 'Jaw');
      add('head', new T.ConeGeometry(0.085, 0.22, 5), C.hairLight, { m: M(0, 1.52, 0.11, Math.PI - 0.25, 0, 0, V3(1, 1, 0.55)), jitter: 0.008, ao: false, tex: 'hair', axis: [0, 1, 0] }, [['Jaw', 0.75], ['Chest', 0.25]]);
      for (const s of [1, -1]) {
        add('head', new T.ConeGeometry(0.04, 0.16, 4), C.hair, { m: M(0.075 * s, 1.63, 0.06, Math.PI - 0.1, 0, 0.25 * s, V3(1, 1, 0.6)), jitter: 0.005, ao: false, tex: 'hair', axis: [0, 1, 0] }, 'Jaw');
      }
      // волосы из-под шлема до плеч: плоские пряди от виска через затылок, лицо открыто
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.42 + (i / 8) * Math.PI * 1.16;
        const len = 0.26 + rand() * 0.08;
        const col = [C.hair, C.hairLight, C.hairDark][i % 3];
        const geo = new T.ConeGeometry(0.05, len, 4);
        geo.rotateZ(Math.PI); // остриём вниз
        geo.scale(1, 1, 0.45); // плоская прядь по касательной к голове
        geo.rotateX(-0.25); // низ пряди отходит наружу
        const r = 0.112;
        add('head', geo, col, {
          m: M(Math.sin(a) * r, 1.8 - len / 2 + 0.03, Math.cos(a) * r - 0.01, 0, a, 0),
          jitter: 0.006, ao: false, tex: 'hair', axis: [0, 1, 0], vary: 0.08,
        }, (v) => (v.y < 1.62 ? [['Head', 0.6], ['Neck', 0.4]] : [['Head', 1]]));
      }

      // ================= ШЛЕМ-ШИШАК =================
      add('helmet', new T.CylinderGeometry(0.126, 0.13, 0.06, 8), C.bronze, { m: M(0, 1.83, -0.005), tex: 'metal', ao: false, jitter: 0.004 }, 'Head');
      add('helmet', new T.CylinderGeometry(0.1, 0.128, 0.08, 8), C.steel, { m: M(0, 1.9, -0.005), tex: 'metal', ao: false, jitter: 0.004 }, 'Head');
      add('helmet', new T.CylinderGeometry(0.05, 0.1, 0.07, 8), C.steelLight, { m: M(0, 1.975, -0.005), tex: 'metal', ao: false, jitter: 0.004 }, 'Head');
      add('helmet', new T.ConeGeometry(0.05, 0.09, 8), C.steelLight, { m: M(0, 2.055, -0.005), tex: 'metal', ao: false, jitter: 0.003 }, 'Head');
      add('helmet', new T.CylinderGeometry(0.008, 0.014, 0.06, 6), C.bronze, { m: M(0, 2.12, -0.005), jitter: 0, ao: false }, 'Head');
      add('helmet', new T.BoxGeometry(0.024, 0.1, 0.018), C.steel, { m: M(0, 1.775, 0.132, -0.08, 0, 0), jitter: 0.002, ao: false }, 'Head');
      add('helmet', new T.ConeGeometry(0.035, 0.06, 3), C.gold, { m: M(0, 1.842, 0.128, 0, 0, 0, V3(1, 1, 0.35)), jitter: 0, ao: false }, 'Head');

      // ================= ПЛАЩ =================
      {
        const geo = new T.BoxGeometry(0.62, 1.3, 0.025, 4, 8, 1);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), t = (0.65 - y) / 1.3; // 0 наверху, 1 внизу
          p.setX(i, x * (0.9 + t * 0.55));
          p.setZ(i, p.getZ(i) - Math.sin(t * Math.PI) * 0.02 + Math.cos((x / 0.31) * Math.PI) * 0.015 * t);
          if (t > 0.97) p.setY(i, y - rand() * 0.07); // рваный край
        }
        add('cloak', geo, C.red, { m: M(0, 0.87, -0.28, 0.123, 0, 0), tex: 'cloth', axis: [0, 1, 0], vary: 0.07, jitter: 0.01 }, cloakW);
        // края плаща по бокам
        for (const s of [1, -1]) {
          add('cloak', new T.BoxGeometry(0.2, 1.12, 0.022, 1, 5, 1), C.redDark, { m: M(0.33 * s, 0.93, -0.16, 0.08, 0.75 * s, 0), tex: 'cloth', axis: [0, 1, 0], vary: 0.07, jitter: 0.012 }, cloakW);
        }
        // золотая кайма по низу и знак солнца на спине
        const zAt = (y) => -0.28 - (y - 0.87) * -Math.tan(0.123) - 0.0145;
        add('cloak', new T.BoxGeometry(0.86, 0.035, 0.008), C.gold, { m: M(0, 0.33, zAt(0.33) - 0.004, 0.123, 0, 0), jitter: 0.004, ao: false }, cloakW);
        const ey = 1.03, ez = zAt(ey) - 0.006;
        add('cloak', new T.TorusGeometry(0.12, 0.012, 4, 12), C.gold, { m: M(0, ey, ez, 0.123, 0, 0), jitter: 0, ao: false }, cloakW);
        add('cloak', new T.CylinderGeometry(0.045, 0.045, 0.008, 8), C.gold, { m: M(0, ey, ez, Math.PI / 2 + 0.123, 0, 0), jitter: 0, ao: false }, cloakW);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2, long = i % 2 === 0, l = long ? 0.13 : 0.07, rr = long ? 0.2 : 0.16;
          add('cloak', new T.ConeGeometry(0.022, l, 3), C.gold, { m: M(Math.cos(a) * rr, ey + Math.sin(a) * rr * Math.cos(0.123), ez - Math.sin(a) * rr * Math.sin(0.123), 0.123, 0, a - Math.PI / 2, V3(1, 1, 0.25)), jitter: 0, ao: false }, cloakW);
        }
      }

      // ================= МЕЧ «ПРАВОСУДИЕ» (сокет правой руки, клинок вперёд по +Z) =================
      {
        const [hx, hy, hz] = bw('WeaponSocket');
        add('sword', new T.CylinderGeometry(0.021, 0.021, 0.17, 6), C.leatherDark, { m: M(hx, hy, hz, Math.PI / 2, 0, 0), tex: 'leather', axis: [0, 1, 0], jitter: 0 }, 'WeaponSocket');
        add('sword', new T.IcosahedronGeometry(0.036, 0), C.bronze, { m: M(hx, hy, hz - 0.105), jitter: 0 }, 'WeaponSocket');
        for (const s of [1, -1]) add('sword', new T.BoxGeometry(0.13, 0.034, 0.04), C.bronze, { m: M(hx + 0.06 * s, hy, hz + 0.1 + 0.012, 0, 0.18 * s, 0), jitter: 0 }, 'WeaponSocket');
        add('sword', new T.BoxGeometry(0.062, 0.014, 0.82), C.steelLight, { m: M(hx, hy, hz + 0.53), tex: 'metal', axis: [0, 0, 1], jitter: 0 }, 'WeaponSocket');
        add('sword', new T.BoxGeometry(0.014, 0.004, 0.6), C.steelDark, { m: M(hx, hy + 0.008, hz + 0.44), jitter: 0 }, 'WeaponSocket');
        add('sword', new T.ConeGeometry(0.031, 0.13, 4), C.steelLight, { m: M(hx, hy, hz + 1.005, Math.PI / 2, 0, 0, V3(1.4, 1, 0.32)), tex: 'metal', jitter: 0 }, 'WeaponSocket');
      }

      // ================= ЩИТ «ВЕРНЫЙ СТРАЖ» (круглый, центральная рукоять: кулак за умбоном) =================
      {
        const [sx, sy, sz] = bw('ShieldSocket');
        // локальная система щита: лицо по +Z, затем поворот на +90° вокруг Y — лицо смотрит вдоль предплечья (+X)
        const base = new T.Matrix4().makeTranslation(sx, sy, sz).multiply(new T.Matrix4().makeRotationY(Math.PI / 2));
        const SM = (x, y, z, rx = 0, ry = 0, rz = 0, sc = 1) => base.clone().multiply(M(x, y, z, rx, ry, rz, sc));
        const fz = 0.05;
        add('shield', new T.CylinderGeometry(0.36, 0.36, 0.04, 16), C.red, { m: SM(0, 0, fz, Math.PI / 2, 0, 0), tex: 'cloth', vary: 0.08, jitter: 0.004 }, 'ShieldSocket');
        add('shield', new T.TorusGeometry(0.36, 0.026, 4, 16), C.bronze, { m: SM(0, 0, fz), tex: 'metal', jitter: 0.003 }, 'ShieldSocket');
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          add('shield', new T.IcosahedronGeometry(0.013, 0), C.gold, { m: SM(Math.cos(a) * 0.325, Math.sin(a) * 0.325, fz + 0.024), jitter: 0, ao: false }, 'ShieldSocket');
        }
        add('shield', new T.TorusGeometry(0.14, 0.012, 4, 16), C.gold, { m: SM(0, 0, fz + 0.022), jitter: 0, ao: false }, 'ShieldSocket');
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + Math.PI / 2, long = i % 2 === 0, l = long ? 0.19 : 0.1, rr = long ? 0.245 : 0.195;
          add('shield', new T.ConeGeometry(long ? 0.034 : 0.024, l, 3), C.gold, { m: SM(Math.cos(a) * rr, Math.sin(a) * rr, fz + 0.024, 0, 0, a - Math.PI / 2, V3(1, 1, 0.3)), jitter: 0, ao: false }, 'ShieldSocket');
        }
        add('shield', new T.CylinderGeometry(0.085, 0.095, 0.05, 8), C.bronze, { m: SM(0, 0, fz + 0.04, Math.PI / 2, 0, 0), tex: 'metal', jitter: 0 }, 'ShieldSocket');
        add('shield', new T.ConeGeometry(0.075, 0.06, 8), C.gold, { m: SM(0, 0, fz + 0.09, Math.PI / 2, 0, 0), tex: 'metal', jitter: 0 }, 'ShieldSocket');
        // рукоять за умбоном и ремень через плечо (гужа) — с тыльной стороны
        add('shield', new T.BoxGeometry(0.2, 0.04, 0.03), C.leatherDark, { m: SM(0, 0, fz - 0.035, 0, 0, Math.PI / 2), jitter: 0.003 }, 'ShieldSocket');
        add('shield', new T.BoxGeometry(0.5, 0.035, 0.012), C.strap, { m: SM(0, 0.1, fz - 0.03, 0, 0, 0.3), jitter: 0.003 }, 'ShieldSocket');
      }

      // ---------- сборка SkinnedMesh по группам и видам росписи ----------
      root.updateMatrixWorld(true);
      const skeleton = new T.Skeleton(boneList);
      const ATTRS = [['position', 3], ['normal', 3], ['color', 3], ['aBary', 3], ['aMask', 3], ['aAxis', 3], ['aUv', 2], ['skinIndex', 4], ['skinWeight', 4]];
      const meshes = [];
      let tris = 0;
      const emoNames = Object.keys(EMOTIONS);
      Object.entries(P).forEach(([group, list]) => {
        const buckets = {};
        list.forEach((g) => (buckets[g.userData.tex] ||= []).push(g));
        Object.entries(buckets).forEach(([tex, geos]) => {
          let n = 0;
          geos.forEach((g) => (n += g.attributes.position.count));
          const out = new T.BufferGeometry();
          for (const [name, size] of ATTRS) {
            const arr = name === 'skinIndex' ? new Uint16Array(n * size) : new Float32Array(n * size);
            let o = 0;
            geos.forEach((g) => { arr.set(g.attributes[name].array, o * size); o += g.attributes[name].count; });
            out.setAttribute(name, new T.BufferAttribute(arr, size));
          }
          // роспись персонажа — обычная UV-развёртка той же проекцией, что в шейдере стенда:
          // вдоль оси волокон или трипланарно, масштаб = повторы текстуры на метр
          const map = K.TEX[tex] || null;
          if (map) {
            map.encoding = T.sRGBEncoding;
            const pos = out.attributes.position.array, nor = out.attributes.normal.array, ax = out.attributes.aAxis.array, col = out.attributes.color.array;
            const uv = new Float32Array((pos.length / 3) * 2), sc = K.TEX_SCALE[tex] || 1;
            const p = new T.Vector3(), nn = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3();
            for (let i = 0; i < pos.length / 3; i++) {
              p.fromArray(pos, i * 3); nn.fromArray(nor, i * 3); a.fromArray(ax, i * 3);
              let u, v;
              if (a.lengthSq() > 0.5 && Math.abs(nn.dot(a.normalize())) < 0.9) {
                b.crossVectors(nn, a).normalize();
                u = p.dot(a); v = p.dot(b);
              } else {
                const x = Math.abs(nn.x), y = Math.abs(nn.y), z = Math.abs(nn.z);
                if (y > Math.max(x, z)) { u = p.x; v = p.z; } else if (x > z) { u = p.z; v = p.y; } else { u = p.x; v = p.y; }
              }
              uv[i * 2] = u * sc; uv[i * 2 + 1] = v * sc;
            }
            out.setAttribute('uv', new T.BufferAttribute(uv, 2));
            for (let i = 0; i < col.length; i++) col[i] *= 1.25; // как ×1.3 в шейдере росписи
          }
          const mat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.93, metalness: 0, skinning: true, map });
          mat.name = group + '_' + tex;
          const mesh = new T.SkinnedMesh(out, mat);
          mesh.name = group + '_' + tex;
          mesh.castShadow = mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          root.add(mesh);
          mesh.bind(skeleton, new T.Matrix4());
          meshes.push(mesh);
          tris += n / 3;
        });
      });

      // ---------- анимации ----------
      const q = (e) => new T.Quaternion().setFromEuler(new T.Euler(e[0], e[1], e[2]));
      const merge = (over) => Object.assign({}, GUARD, over);
      function clip(name, dur, keys) {
        const times = keys.map((k) => k.t);
        const tracks = [];
        const poses = keys.map((k) => merge(k.p || {}));
        Object.keys(GUARD).forEach((bn) => {
          const vals = [];
          poses.forEach((p) => vals.push(...q(p[bn]).toArray()));
          tracks.push(new T.QuaternionKeyframeTrack(bn + '.quaternion', times, vals));
        });
        const hp = [];
        keys.forEach((k) => hp.push(0, HIPS_Y + (k.hy || 0), k.hz || 0));
        tracks.push(new T.VectorKeyframeTrack('Hips.position', times, hp));
        return new T.AnimationClip(name, dur, tracks);
      }
      const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
      const G = GUARD;
      const clips = {
        Idle: clip('Idle', 2.4, [
          { t: 0, p: {} },
          { t: 1.2, p: { Chest: add3(G.Chest, [-0.03, 0, 0]), Head: add3(G.Head, [0.02, -0.04, 0]), Cloak1: add3(G.Cloak1, [0.04, 0, 0.02]), Cloak3: add3(G.Cloak3, [0.05, 0, 0]),
            LeftUpperArm: add3(G.LeftUpperArm, [0.03, 0, 0.02]), RightUpperArm: add3(G.RightUpperArm, [0, 0, -0.03]) }, hy: 0.008 },
          { t: 2.4, p: {} },
        ]),
        Walk: clip('Walk', 1.0, [0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const L = [-0.5, 0, 0.4, 0.05, -0.5][i], R = [0.4, 0.05, -0.5, 0, 0.4][i];
          const LK = [0.12, 0.2, 0.25, 0.85, 0.12][i], RK = [0.25, 0.85, 0.12, 0.2, 0.25][i];
          const sw = [0.28, 0, -0.28, 0, 0.28][i];
          return {
            t,
            p: {
              LeftUpperLeg: [L, 0, 0.05], RightUpperLeg: [R, 0, -0.05], LeftLowerLeg: [LK, 0, 0], RightLowerLeg: [RK, 0, 0],
              LeftFoot: [-L * 0.4, 0, 0], RightFoot: [-R * 0.4, 0, 0],
              Hips: [0, 0.12 + sw * 0.25, 0], Chest: add3(G.Chest, [0.04, -sw * 0.3, 0]),
              RightUpperArm: add3(G.RightUpperArm, [sw * 1.1, 0, 0]),
              Cloak1: [0.16 + Math.abs(sw) * 0.1, 0, sw * 0.1], Cloak2: [0.1, 0, sw * 0.1], Cloak3: [0.08 + (1 - Math.abs(sw) * 3) * 0.04, 0, 0],
            },
            hy: [-0.03, 0.02, -0.03, 0.02, -0.03][i],
          };
        })),
        Attack: clip('Attack', 1.3, [
          { t: 0, p: {} },
          { t: 0.45, p: { Chest: [-0.12, 0.45, 0], Spine: [-0.05, 0.15, 0], RightUpperArm: [-0.4, 0.2, -1.0], RightLowerArm: [0, 1.4, 0], RightHand: [0.2, 0, 0],
            LeftUpperArm: add3(G.LeftUpperArm, [0.1, 0, 0.1]), RightUpperLeg: [0.15, 0, -0.1], Cloak1: [0.02, 0, 0] }, hy: -0.01 },
          { t: 0.62, p: { Chest: [0.25, -0.45, 0], Spine: [0.12, -0.15, 0], RightUpperArm: [-1.4, -0.3, 0.7], RightLowerArm: [0, 0.15, 0], RightHand: [0.5, 0, 0],
            LeftUpperLeg: [-0.45, 0, 0.1], LeftLowerLeg: [0.3, 0, 0], RightUpperLeg: [0.3, 0, -0.1], Cloak1: [0.25, 0, 0], Cloak2: [0.15, 0, 0] }, hy: -0.06, hz: 0.1 },
          { t: 0.85, p: { Chest: [0.22, -0.4, 0], Spine: [0.1, -0.12, 0], RightUpperArm: [-1.2, -0.3, 0.9], RightLowerArm: [0, 0.2, 0], RightHand: [0.6, 0, 0],
            LeftUpperLeg: [-0.4, 0, 0.1], LeftLowerLeg: [0.3, 0, 0], RightUpperLeg: [0.25, 0, -0.1] }, hy: -0.05, hz: 0.1 },
          { t: 1.3, p: {} },
        ]),
        Block: clip('Block', 1.2, [
          { t: 0, p: {} },
          { t: 0.22, p: { LeftUpperArm: [-0.9, 0.35, -1.0], LeftLowerArm: [0, -0.7, 0], LeftHand: [0, 0, 0], Chest: [0.15, -0.2, 0], Head: [0.1, 0, 0],
            LeftUpperLeg: [-0.45, 0, 0.12], LeftLowerLeg: [0.55, 0, 0], RightUpperLeg: [0.2, 0, -0.15], RightLowerLeg: [0.45, 0, 0], RightUpperArm: [0.1, -0.2, 1.1] }, hy: -0.1 },
          { t: 0.9, p: { LeftUpperArm: [-0.9, 0.35, -1.0], LeftLowerArm: [0, -0.7, 0], LeftHand: [0, 0, 0], Chest: [0.15, -0.2, 0], Head: [0.1, 0, 0],
            LeftUpperLeg: [-0.45, 0, 0.12], LeftLowerLeg: [0.55, 0, 0], RightUpperLeg: [0.2, 0, -0.15], RightLowerLeg: [0.45, 0, 0], RightUpperArm: [0.1, -0.2, 1.1] }, hy: -0.1 },
          { t: 1.2, p: {} },
        ]),
        BattleCry: clip('BattleCry', 1.8, [
          { t: 0, p: {} },
          { t: 0.4, p: { RightUpperArm: [0.1, 0.1, -1.25], RightLowerArm: [0, 0.35, 0], RightHand: [-0.6, 0, 0], Chest: [-0.2, 0, 0], Neck: [-0.15, 0, 0], Head: [-0.2, 0, 0],
            LeftUpperArm: [-0.2, 0.3, -1.25], LeftLowerArm: [0, -0.9, 0], Cloak1: [0.2, 0, 0] }, hy: 0.01 },
          { t: 1.3, p: { RightUpperArm: [0.1, 0.1, -1.35], RightLowerArm: [0, 0.25, 0], RightHand: [-0.6, 0, 0], Chest: [-0.24, 0, 0], Neck: [-0.18, 0, 0], Head: [-0.22, 0, 0],
            LeftUpperArm: [-0.2, 0.3, -1.25], LeftLowerArm: [0, -0.9, 0], Cloak1: [0.25, 0, 0] }, hy: 0.01 },
          { t: 1.8, p: {} },
        ]),
      };
      const FACE_CLIPS = [];
      const CLIP_UI = [['Idle', 'Покой'], ['Walk', 'Шаг'], ['Attack', 'Удар богатыря'], ['Block', 'Стена щитом'], ['BattleCry', 'Клич Отваги'], ['TPose', 'T-поза']];
      const CLIP_FACE = { Attack: 'Ярость', BattleCry: 'Ярость', Block: 'Решимость' };

      const mixer = new T.AnimationMixer(root);
      const actions = {};
      Object.entries(clips).forEach(([k, c]) => {
        actions[k] = mixer.clipAction(c);
        if (k !== 'Idle' && k !== 'Walk') { actions[k].setLoop(T.LoopOnce); actions[k].clampWhenFinished = false; }
      });
      // ---------- эмоции на лицевых костях: смесь поз по весам ----------
      const FACE = ['Jaw', 'BrowL', 'BrowR', 'EyeL', 'EyeR', 'Mouth', 'MustL', 'MustR'];
      const faceBind = {};
      FACE.forEach((f) => (faceBind[f] = bones[f].position.clone()));
      function applyFace(w) {
        FACE.forEach((f) => {
          let tx = 0, ty = 0, tz = 0, r = 0, sx = 1, sy = 1, sz = 1;
          emoNames.forEach((e) => {
            const d = EMOTIONS[e][f], k = w[e];
            if (!d || !k) return;
            if (d.t) { tx += d.t[0] * k; ty += d.t[1] * k; tz += d.t[2] * k; }
            if (d.r) r += d.r * k;
            if (d.s) { sx += (d.s[0] - 1) * k; sy += (d.s[1] - 1) * k; sz += (d.s[2] - 1) * k; }
          });
          const b = bones[f];
          b.position.copy(faceBind[f]).add(new T.Vector3(tx, ty, tz));
          b.rotation.set(0, 0, r);
          b.scale.set(sx, sy, sz);
        });
      }
      // лицевые клипы для движка: по одному на эмоцию, только кости лица
      Object.entries(EMOTIONS).forEach(([e, d]) => {
        const tracks = [];
        FACE.forEach((f) => {
          const x = d[f] || {};
          const p = faceBind[f].clone().add(new T.Vector3(...(x.t || [0, 0, 0])));
          tracks.push(new T.VectorKeyframeTrack(f + '.position', [0, 0.2], [...faceBind[f].toArray(), ...p.toArray()]));
          tracks.push(new T.QuaternionKeyframeTrack(f + '.quaternion', [0, 0.2], [0, 0, 0, 1, ...q([0, 0, x.r || 0]).toArray()]));
          tracks.push(new T.VectorKeyframeTrack(f + '.scale', [0, 0.2], [1, 1, 1, ...(x.s || [1, 1, 1])]));
        });
        FACE_CLIPS.push(new T.AnimationClip('Face_' + e, 0.2, tracks));
      });
      let current = null, emotion = 'Нейтральный', userEmotion = 'Нейтральный';
      const inf = {};
      emoNames.forEach((e) => (inf[e] = 0));

      // ---------- панель управления ----------
      const panel = document.createElement('div');
      panel.className = 'model-panel';
      panel.innerHTML = '<span class="lbl">Анимация</span><div class="chips" data-k="anim"></div><span class="lbl">Эмоция</span><div class="chips" data-k="emo"></div>'
        + '<span class="lbl">Камера</span><div class="chips" data-k="cam"><button type="button" data-v="portrait">Портрет</button><button type="button" data-v="game">Игровой ракурс</button></div>'
        + `<span class="lbl">Модель: ${Math.round(tris).toLocaleString('ru-RU')} треуг., ${boneList.length} костей, ${emoNames.length + 1} эмоций</span>`;
      const animBox = panel.querySelector('[data-k="anim"]'), emoBox = panel.querySelector('[data-k="emo"]');
      const mark = (box, val) => box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === val)));
      function setEmotion(name, fromUser) {
        emotion = name;
        if (fromUser) userEmotion = name;
        mark(emoBox, name);
      }
      function play(name) {
        mark(animBox, name);
        if (name === 'TPose') {
          mixer.stopAllAction();
          boneList.forEach((b) => b.quaternion.identity());
          bones.Hips.position.set(0, HIPS_Y, 0);
          current = null;
          return;
        }
        const a = actions[name];
        a.reset().play();
        if (current && current !== a) a.crossFadeFrom(current, 0.25, false);
        current = a;
        if (CLIP_FACE[name]) setEmotion(CLIP_FACE[name], false);
        else setEmotion(userEmotion, false);
      }
      mixer.addEventListener('finished', () => { play('Idle'); });
      CLIP_UI.forEach(([k, label]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.v = k; b.textContent = label;
        b.addEventListener('click', () => play(k));
        animBox.appendChild(b);
      });
      panel.querySelector('[data-k="cam"]').addEventListener('click', (ev) => {
        const v = ev.target.dataset && ev.target.dataset.v;
        const cam = K.view;
        if (!v || !cam) return;
        if (v === 'portrait') {
          const hp = new T.Vector3();
          bones.Head.getWorldPosition(hp);
          cam.state.target.copy(hp).add(new T.Vector3(0, 0.08, 0));
          Object.assign(cam.state, { az: 25, el: 8, zoom: 7 });
          cam.placeCamera();
        } else cam.setView('bogatyr');
        mark(panel.querySelector('[data-k="cam"]'), v);
      });
      EMOTION_NAMES.forEach((e) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.v = e; b.textContent = e;
        b.addEventListener('click', () => setEmotion(e, true));
        emoBox.appendChild(b);
      });
      play('Idle');

      function update(dt) {
        mixer.update(dt);
        const k = Math.min(1, dt * 10);
        emoNames.forEach((e) => (inf[e] += ((e === emotion ? 1 : 0) - inf[e]) * k));
        applyFace(inf);
      }

      // ---------- экспорт .glb: чистые атрибуты, стандартный материал, все клипы ----------
      function exportFn(save) {
        const saved = [];
        meshes.forEach((m) => {
          const g = m.geometry.clone();
          ['aBary', 'aMask', 'aAxis', 'aUv'].forEach((a) => g.deleteAttribute(a));
          saved.push([m, m.geometry, m.material]);
          m.geometry = g;
        });
        const prevPos = root.position.clone();
        root.position.set(0, 0, 0);
        root.updateMatrixWorld(true);
        new T.GLTFExporter().parse(root, (bin) => {
          saved.forEach(([m, g, mat]) => { m.geometry = g; m.material = mat; });
          root.position.copy(prevPos);
          save(bin);
        }, { binary: true, animations: [...Object.values(clips), ...FACE_CLIPS] });
      }

      window.__bogatyr = { root, bones, skeleton, clips, mixer, play, setEmotion, meshes, tris, GUARD,
        pose(over) { mixer.stopAllAction(); const p = merge(over); Object.keys(p).forEach((bn) => bones[bn].quaternion.copy(q(p[bn]))); } };

      root.position.set(0.5, 0, 0.5);
      const holder = new T.Group();
      holder.add(root);
      return { group: holder, update, panel, exportFn, api: { root, play, setEmotion, bones } };
    },
  });
})();
