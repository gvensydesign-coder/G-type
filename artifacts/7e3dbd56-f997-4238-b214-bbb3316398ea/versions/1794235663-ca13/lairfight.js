// Логово Лешего в рисованном стиле + бой богатыря с Лешим с новой аурой.
// Геометрия — из превью «Логово Лешего» (lair/*.js, без изменений), материалы построек, земли, деревьев
// заменяются на рисованные (style.material), свои шейдеры логова (вода, свечение, туман, дым) остаются.
// Бой — упрощённый из «Богатыря против Лешего»: удары сериями, блок щитом, уклон, аура благодати,
// у Лешего — удар лапой, прыжок с ударом о землю (фиолетовый круг: блоком не удержать), ярость с аурой.
import * as THREE from 'three';
import { buildLair, groundAt, segDist, segT } from './lair/lair.js';
import { buildLife } from './lair/life.js';
import { U, MAXL, inkMat, lin } from './lair/toon.js';
import { makeBrushAtlas } from './lair/textures.js';
import { makeSword, makeShield } from './lair/weapons.js';
import { WaterFX } from './lair/waterfx.js';
import { PaintedAura, PaintedFire, FIRE_PRESETS, ShardBurst, FlameRibbon, addShell, PaintedCloudBank, LampFX } from './elementfx.js';
import { kindMaterial, WORLD, addLineAura, LINE_AURAS, deriveHand, handU } from './matfx.js';
import { HandMarks } from './handmarks.js';
import { PaintedSkyBrush, LightShafts, HazeBands, HAZE_PRESETS, CLOUD_LAYERS_HAZY, CLOUD_ORDER_HAZY } from './skyfx.js';

const HERO_H = 1.53, LESHY_H = 2.5;          // рост как в логове: двери 1,95 м
const v3 = (a) => new THREE.Vector3(...a);
const LAIR_THEME = {
  sunDir: v3([0.25, 0.85, -0.45]).normalize(), sunCol: v3([0.68, 0.78, 0.58]), shadeCol: v3([0.15, 0.21, 0.22]),
  fog: lin('#183a30'), fogDen: 0.0085, fogLow: 0.42, low: lin('#3a6a4a'), rim: v3([0.6, 1.0, 0.65]),
};
const turn = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k); };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };

// ---------------------------------------------------------------- материалы логова → рисованные
// Новая система: каждый материал логова получает тип (камень, дерево, сено, мох, железо, ткань) со своей
// реакцией на свет, краем тени, почеркушками Michael (handlib), миром (отсвет земли, дымка, мох у земли) и
// линейной аурой «на отрыве» у заметных предметов.
function kindOf(m, u, col, big) {
  const BY_NAME = { wood: 'wood', woodDark: 'wood', plank: 'wood', plankOld: 'wood', log: 'wood', gable: 'wood', door: 'wood', bark: 'oak',
    roof: 'hay', rope: 'hay', cloth: 'cloth', bone: 'stone', stalk: 'stone', stone: 'stone', iron: 'metal', moss: 'moss', vine: 'bush', leaf: 'bush', dark: null,
    ground: 'ground', needleMat: 'fir', needleMatS: 'fir', sprMat: 'fir', pineMat: 'fir', pineBark: 'wood', birchBark: 'wood',
    birchLeaf: 'bush', leafMat: 'bush', bm: 'bush', oakLeaf: 'bush', oakLeaf2: 'bush', ivy: 'bush', fern: 'fern',
    reedMat: 'grass', grassMat: 'grass', stemMat: 'grass', padMat: 'moss', mossMat: 'moss', mossMat2: 'moss', amCap: 'cloth', boCap: 'cloth' };
  if (m.name in BY_NAME) return BY_NAME[m.name];
  if (big) return null;                                                      // прочее огромное (дальний лес): прежний рисованный материал
  const map = !!(m.defines?.HAS_MAP && u.uMap?.value); const g = (k) => u[k]?.value ?? 0;
  const sw = g('uSway'), moss = g('uMossAmt'), drip = g('uDrip'), gain = g('uMapGain') || 1, wood = g('uWood');
  if (wood > 0) return 'wood';
  if (map) {
    if (sw > 0 && m.side === THREE.DoubleSide && gain >= 2) return 'moss';  // хвоя
    if (sw > 0) return 'cloth';                                              // рунные полотна
    if (Math.abs(drip - 0.25) < 0.01) return 'hay';                          // соломенные кровли
    if (gain > 1.3 && drip > 0.7) return 'wood';                             // кора дуба
    if (gain > 1.3) return 'stone';
    if (moss > 0.1 && moss < 0.15) return 'wood';                            // берёза
    return 'wood';                                                           // двери, фронтоны
  }
  const r = col.r, gg = col.g, b = col.b, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
  if (m.defines?.VCOL || sw > 0) return 'moss';                              // трава, листва, кусты
  if (gg > r * 1.08 && gg > b) return 'moss';
  if (mx - mn < 0.08 * Math.max(mx, 0.05) + 0.02) return g('uRim') > 1.3 && g('uWet') > 0 ? 'metal' : 'stone';  // кости и камень; мокрое тёмное железо
  if (r > gg && gg >= b) return 'wood';                                     // доски, брёвна, сваи
  return 'stone';
}
// контурная подсветка по типам: листва и хвоя ловят свет краем сильнее, земля чуть-чуть
const RIM = { ground: 0.25, moss: 0.6, fir: 0.7, bush: 0.8, fern: 0.9, grass: 0.8, oak: 0.9, wood: 0.75, stone: 0.7, hay: 0.9, cloth: 0.6, metal: 1.1 };
// аура по типам: какие сборные меши получают линию «на отрыве» (трава и земля — нет: слишком много геометрии и шума)
const AURA_K = { oak: { off: 0.06, w: 0.22 }, fir: { off: 0.10, w: 0.22 }, bush: { off: 0.07, w: 0.2 }, fern: { off: 0.05, w: 0.2 },
  wood: { off: 0.04, w: 0.18 }, hay: { off: 0.07, w: 0.22 }, stone: { off: 0.04, w: 0.18 }, cloth: { off: 0.03, w: 0.18 }, moss: { off: 0.05, w: 0.18 } };
function repaint(root, style) {
  const cache = new Map(); const tcache = new Map(); const col = new THREE.Color(); const stat = {}; const auraCand = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m === inkMat) { o.userData.pfOutline = true; o.userData.pfSkip = true; return; }
    const u = m?.uniforms;
    if (!u?.uBase || !u.uStrokeAmt || o.userData.pfSkip) { o.userData.pfSkip = true; return; }
    const big = (o.geometry.boundingSphere ?? (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere)).radius > 100;
    let pm = cache.get(m);
    if (!pm) {
      const gain = u.uMapGain?.value ?? 1;
      col.setRGB(u.uBase.value.x * gain, u.uBase.value.y * gain, u.uBase.value.z * gain);
      let map = null;
      if (m.defines?.HAS_MAP && u.uMap?.value) {
        const r = u.uMapRep.value; const key = u.uMap.value.uuid + r.x + ',' + r.y;
        map = tcache.get(key);
        if (!map) { map = u.uMap.value.clone(); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(r.x, r.y); map.needsUpdate = true; tcache.set(key, map); }
      }
      const e = u.uEmit.value;
      const kind = kindOf(m, u, col, big);
      const opts = {
        color: col.clone(), map, emissive: new THREE.Color(e.x, e.y, e.z), vertexColors: !!m.defines?.VCOL, side: m.side,
        flow: big ? 'fixed' : kind === 'wood' ? 'along' : 'wrap', flowDir: big ? [1, 0, 0.3] : [0, 1, 0], strokeScale: kind === 'ground' ? 1.4 : big && !kind ? 1.6 : (kind === 'wood' || kind === 'oak' ? 0.6 : 0.8), rimScale: RIM[kind] ?? 0,
      };
      // uBase: высота земли (болото), мох у земли по старому mossAmt, грязь у подножия
      pm = kind ? kindMaterial(style, kind, opts, [-0.15, Math.min(1, (u.uMossAmt?.value ?? 0) * 1.0), 0.5]) : style.material(opts);
      pm.userData.kind = kind; cache.set(m, pm); stat[kind ?? 'plain'] = (stat[kind ?? 'plain'] ?? 0) + 1;
    }
    o.userData.pfPlain = m; o.material = pm;
    const k = pm.userData.kind; const R = o.geometry.boundingSphere.radius * o.getWorldScale(new THREE.Vector3()).x;
    if (k && k !== 'moss' && R > 0.35 && R < 4 && !o.isInstancedMesh && !o.isSkinnedMesh) auraCand.push({ o, k, R });
  });
  // линейная аура: по одному слою на материал логова (сборные меши и инстансы), узор по положению
  root.updateMatrixWorld(true); const wp = new THREE.Vector3(); let n = 0; const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.lineAura || !o.material?.userData) return; const k = o.material.userData.kind; const A = AURA_K[k]; if (!A) return;
    const verts = o.geometry.attributes.position.count * (o.isInstancedMesh ? o.count : 1); if (verts > 600000) return;
    addLineAura(o, { kind: k, off: A.off, w: A.w, color: '#e8f0c8', dash: 0.45, local: o.isInstancedMesh ? 0 : 1 }); n++; done.add(k);
  });
  console.info('lair kinds', JSON.stringify(stat), 'auras', n);
  window.__lairProbe = []; root.traverse((o) => { if (!o.isMesh) return; const bs = o.geometry.boundingSphere ?? (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere); o.getWorldPosition(wp);
    window.__lairProbe.push([o.name || o.parent?.name || '', o.material?.userData?.kind ?? (o.userData.pfSkip ? 'skip' : 'plain'), o.userData.pfPlain?.name ?? '', +bs.radius.toFixed(2), o.isInstancedMesh ? o.count : 0, o.material?.type, [+wp.x.toFixed(1), +wp.y.toFixed(1), +wp.z.toFixed(1)], o.geometry.attributes.position.count]); });
  return stat;
}

// ---------------------------------------------------------------- вспышка удара: рваная звезда тушью
let STAR = null;
function starTex() {
  if (STAR) return STAR;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const path = (R, r, n, j) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + (i % 3) * 0.05; const rad = (i % 2 ? r : R) * (1 - j * ((i * 7) % 5) / 10); g.lineTo(64 + Math.cos(a) * rad, 64 + Math.sin(a) * rad); } g.closePath(); };
  path(62, 22, 9, 0.6); g.fillStyle = '#1a0c06'; g.fill();
  path(54, 18, 9, 0.6); g.fillStyle = '#ffd24a'; g.fill();
  path(34, 12, 9, 0.4); g.fillStyle = '#fffbe6'; g.fill();
  STAR = new THREE.CanvasTexture(c); STAR.colorSpace = THREE.SRGBColorSpace; return STAR;
}

// ---------------------------------------------------------------- клипы: плавные переходы
class Anim {
  constructor(mixer, clips) { this.m = mixer; this.a = {}; for (const c of clips) this.a[c.name] = mixer.clipAction(c); this.cur = this.a.Idle; this.name = 'Idle'; }
  play(n, { once = false, ts = 1, fade = 0.12, clamp = false } = {}) {
    const a = this.a[n]; if (!a) return;
    if (this.cur === a && !once) { a.timeScale = ts; return; }
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = clamp; a.timeScale = ts; a.setEffectiveWeight(1); a.play();
    if (this.cur && this.cur !== a) this.cur.crossFadeTo(a, fade, false);
    this.cur = a; this.name = n;
  }
  loco(speed, walk, run) { if (speed < 0.15) this.play('Idle'); else if (speed < (walk + run) / 2) this.play('Walk', { ts: THREE.MathUtils.clamp(speed / walk, 0.6, 1.6) }); else this.play('Run', { ts: THREE.MathUtils.clamp(speed / run, 0.7, 1.4) }); }
}

export class LairFight {
  // ctx: { style, character, models, camera, controls, canvas }
  constructor(scene, ctx) {
    this.ctx = ctx; this.scene = scene; const style = ctx.style; this.t = 0;
    if (!U.uBrushTex.value) U.uBrushTex.value = makeBrushAtlas();
    const T = LAIR_THEME;
    U.uTheme.value = 1; U.uSunDir.value.copy(T.sunDir); U.uSunCol.value.copy(T.sunCol); U.uShadeCol.value.copy(T.shadeCol);
    U.uFogCol.value.copy(T.fog); U.uFogDen.value = T.fogDen; U.uFogLow.value = T.fogLow; U.uLowCol.value.copy(T.low); U.uRimCol.value.copy(T.rim); U.uReflOn.value = 0;

    // небо крупными мазками кисти с луной и эскизными кругами (skyfx.js, refs/sky ref5/ref6)
    const sky = new PaintedSkyBrush(style, { preset: 'lair', moon: { dir: [-0.4, 0.42, -0.82], r: 0.075, color: '#e4fff2', ring: '#8fd0c0' } }); scene.add(sky.mesh); this.sky = sky;
    scene.fog = new THREE.FogExp2('#1c2a34', 0.004);
    const world = buildLair(scene); this.world = world;
    this.life = buildLife(scene, world);
    this.kinds = repaint(scene, style);
    this.waterMats = []; scene.traverse((o) => { if (o.userData.bake === 'water' && o.material?.uniforms?.uMkW) this.waterMats.push(o.material); });
    this.hand = new HandMarks({});
    this.hand.load().then(() => {
      // твои почеркушки на производных видах: земля — реже и крупнее, хвоя и листва — мельче, дуб — крупная кора
      deriveHand('ground', 'moss', { dens: 0.4, size: 1.8, light: 0.6 });
      deriveHand('fir', 'moss', { dens: 0.9, size: 0.8, auraCol: '#a8e070' });
      deriveHand('bush', 'moss', { dens: 0.8, size: 0.7 });
      deriveHand('fern', 'moss', { dens: 0.8, size: 0.6 });
      deriveHand('grass', 'moss', { dens: 0.6, size: 0.6, mask: false });
      deriveHand('oak', 'wood', { dens: 1, size: 1.6, auraCol: '#e8c890' });
      // вода: блики твоими рисунками из слоя «Линии из блика» воды
      const W = handU('water'); for (const m of this.waterMats ?? []) { m.uniforms.uMkW.value = W.uMk.value; m.uniforms.uMkNW.value = W.uMkN.value.w; }
    }).catch(() => {});
    { const T = LAIR_THEME; WORLD.uSunW.value.copy(T.sunDir); WORLD.uSkyC.value.set('#2e5a52'); WORLD.uSkyTop.value.set('#16303a');
      WORLD.uGroundC.value.set('#1e3a1c'); WORLD.uHazeC.value.set('#183a30'); WORLD.uMist.value = 0.55; WORLD.uSmoke.value = 0.6;
      const F = world.FIRE; WORLD.uFireP.value.set(F.x, groundAt(F.x, F.z), F.z, 5); WORLD.uFireC.value.set('#ff9a40'); }

    // свет для рисованных материалов: мертвенно-зелёный столб сверху, бирюзовая заливка, тёплые огни рядом с героем
    scene.add(new THREE.HemisphereLight('#5a7a8a', '#0a0e14', 0.35));
    const moon = new THREE.DirectionalLight('#c8ecb0', 1.7); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 }); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.05;
    scene.add(moon, moon.target); this.moon = moon;
    this.pool = Array.from({ length: 5 }, () => { const l = new THREE.PointLight('#ff9a40', 0, 8, 1.15); scene.add(l); return l; });

    // костёр — новый рисованный огонь вместо старых языков
    const F = world.FIRE; const fy = groundAt(F.x, F.z);
    for (const f of world.anim.flames) { const p = f.getWorldPosition(new THREE.Vector3()); if (Math.hypot(p.x - F.x, p.z - F.z) < 1.6) f.visible = false; }
    this.fire = new PaintedFire(style, { size: 1.0, preset: 'hearth' }); this.fire.group.position.set(F.x, fy + 0.05, F.z); scene.add(this.fire.group);
    this.firePos = new THREE.Vector3(F.x, fy + 0.5, F.z);
    // фонари и факелы: пламя-лента (видео a_iwaac, свеча) вместо листов языков; угли остаются
    this.ribbons = []; this.lamps = [];
    world.anim.flames.forEach((f, i) => {
      if (!f.visible) return; const sc = f.userData.s || 0.5;
      f.children.forEach((c, j) => { if (j < 2) c.visible = false; });
      const r = new FlameRibbon(style, { h: 1.1 * sc, preset: 'torch', seed: i * 1.37 });
      r.group.position.set(f.position.x, f.position.y - 0.1 * sc, f.position.z); scene.add(r.group); r.ignite(0.4 + 0.15 * (i % 7)); this.ribbons.push(r);
      const lp = new LampFX(style, { size: 2.2 * sc, preset: 'torch', seed: i * 2.3, k: 0.6, rays: 0, arcs: 0.35, sparks: 3 }); lp.group.position.set(f.position.x, f.position.y + 0.35 * sc, f.position.z); scene.add(lp.group); this.lamps.push(lp);
    });
    // облака слоями за лесом (видео a_iwaac, город): ближние тёмные, дальние светлее
    // тише, вперемешку с дымкой: дальний план тонет (skyfx.js, refs/sky ref3)
    this.clouds = new PaintedCloudBank(style, { layers: CLOUD_LAYERS_HAZY, center: [0, 0, -6] }); scene.add(this.clouds.group);
    this.clouds.group.children.forEach((m, i) => { m.renderOrder = CLOUD_ORDER_HAZY[i] ?? m.renderOrder; });
    this.haze = new HazeBands(style, { layers: HAZE_PRESETS.swamp, center: [0, 0, -6] }); scene.add(this.haze.group);
    // объёмный свет от луны неба широкими мазками-лучами (refs/sky ref1)
    this.shafts = new LightShafts(style, { dir: [-0.4, 0.42, -0.82], color: '#cfffc0', k: 0.09, shafts: [
      { p: [-22, 0, -2], w: 4.5, len: 55 }, { p: [-29, 0, -9], w: 6, len: 60, k: 0.8 }, { p: [-15, 0, -13], w: 3.2, len: 50, k: 1.1 },
      { p: [-35, 0, 5], w: 3.5, len: 50, k: 0.7 }, { p: [-6, 0, -4], w: 5, len: 55, k: 0.9 }, { p: [6, 0, -14], w: 4, len: 55 }, { p: [10, 0, 6], w: 5, len: 55, k: 0.8 },
    ] }); scene.add(this.shafts.group);

    // герои
    const door = world.anim.doorLeshy; this.door = door;
    const hw = ctx.character('bogatyr', HERO_H, 'Idle'); scene.add(hw);
    const lw = ctx.character('leshy', LESHY_H, 'Idle'); scene.add(lw);
    this.hero = { w: hw, pos: new THREE.Vector3(-17.5, 0, 11), yaw: Math.PI, speed: 0, hp: 100, aura: 60, state: 'free', t: 0, cd: 0, blocking: false };
    this.leshy = { w: lw, pos: new THREE.Vector3(door.x, 0, door.z), yaw: door.yaw, speed: 0, hp: 320, state: 'wait', t: 0, atkCd: 1, superCd: 5, hits: 0, rage: false };
    for (const c of [this.hero, this.leshy]) {
      c.pos.y = this.floorAt(c.pos.x, c.pos.z, 3);
      const name = c === this.hero ? 'bogatyr' : 'leshy';
      c.anim = new Anim(c.w.userData.mixer, ctx.models[name].animations);
      c.w.traverse((o) => { if (o.isBone) { if (/RightHand$/.test(o.name)) c.rh = o; if (/LeftHand$/.test(o.name)) c.lh = o; if (/LeftForeArm$/.test(o.name)) c.lf = o; if (/RightHandIndex1$/.test(o.name)) c.i1 = o; if (/RightHandPinky1$/.test(o.name)) c.p1 = o; if (/RightHandMiddle1$/.test(o.name)) c.m1 = o; if (/Spine2$/.test(o.name)) c.chest = o; } });
    }
    { const d = this.hero.pos.clone().sub(this.leshy.pos); this.hero.yaw = Math.atan2(-d.x, -d.z); }
    // меч и щит в руках, рисованным материалом
    this.sword = makeSword(); this.shield = makeShield(); this.sword.scale.setScalar(0.85); this.shield.scale.setScalar(0.85);
    for (const w of [this.sword, this.shield]) { style.paintObject(w, { flow: 'wrap', strokeScale: 0.5, rimScale: 1, hero: true }); style.addOutline(w, { widthScale: 0.7 }); scene.add(w); }

    // ауры: у богатыря «Благодать» по кнопке R, у Лешего «Дух леса» в ярости
    this.auras = {
      bogatyr: new PaintedAura(style, hw, { preset: 'grace', h: HERO_H }),
      leshy: new PaintedAura(style, lw, { preset: 'forest', h: LESHY_H, particles: 18 }),
    };
    addShell(this.auras.bogatyr, 'grace'); addShell(this.auras.leshy, 'forest');   // оболочка силуэта (видео a_iwaac, гитара)
    for (const k in this.auras) scene.add(this.auras[k].group);
    // осколки-вспышки (видео a_iwaac): при зажигании ауры, ярости Лешего, тяжёлых ударах
    this.bursts = { bogatyr: new ShardBurst(style, { preset: 'grace' }), leshy: new ShardBurst(style, { preset: 'forest', count: 28 }), hit: new ShardBurst(style, { preset: 'hit', count: 12 }) };
    for (const k in this.bursts) scene.add(this.bursts[k].group);
    // тёмное пятно под ногами: персонаж «садится» на землю
    this.spots = [this.hero, this.leshy].map((c, i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(i ? 0.95 : 0.55, 20), new THREE.MeshBasicMaterial({ color: '#05080a', transparent: true, opacity: 0.45, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.userData.pfSkip = true; m.renderOrder = 1; scene.add(m); return m; });
    this.fov0 = ctx.camera.fov; this.fovKick = 0; this.fovT = 0;
    this.waterfx = new WaterFX(this);   // вода: отражения персонажей, аур, огней и кольца ряби

    // круг-предупреждение прыжка Лешего и волна удара о землю
    const ringMat = new THREE.MeshBasicMaterial({ color: '#a040ff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    this.warn = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48), ringMat); this.warn.rotation.x = -Math.PI / 2; this.warn.visible = false; this.warn.userData.pfSkip = true; scene.add(this.warn);
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: '#e8ffd8', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    this.wave.rotation.x = -Math.PI / 2; this.wave.visible = false; this.wave.userData.pfSkip = true; scene.add(this.wave);
    this.stars = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), transparent: true, depthTest: false })); s.visible = false; s.userData.pfMark = true; s.renderOrder = 9; scene.add(s); return s; });
    this.starI = 0;

    this.keys = {}; this.camYaw = 0; this.camPos = null; this.camLook = null; this.slow = 0;
    this._kd = (e) => { if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return; this.keys[e.code] = true; if (e.code === 'Space') { e.preventDefault(); this.dodge(); } if (e.code === 'KeyR') this.toggleAura(); if (e.code === 'KeyF') this.attack(); };
    this._ku = (e) => { this.keys[e.code] = false; };
    this._pd = (e) => { if (e.button === 0) this.attack(); if (e.button === 2) this.hero.blocking = true; };
    this._pu = (e) => { if (e.button === 2) this.hero.blocking = false; };
    this._cm = (e) => e.preventDefault();
    addEventListener('keydown', this._kd); addEventListener('keyup', this._ku);
    ctx.canvas.addEventListener('pointerdown', this._pd); addEventListener('pointerup', this._pu); ctx.canvas.addEventListener('contextmenu', this._cm);
    ctx.controls.enabled = false;
    this.hud();
  }

  // ---------------------------------------------------------------- пол и препятствия (как в превью логова)
  floorAt(x, z, curY = 99) {
    let y = groundAt(x, z);
    for (const w of this.world.walks) {
      if (segDist(x, z, w) > w.w * 0.5) continue;
      const wy = (w.ramp ? w.ya + (w.yb - w.ya) * segT(x, z, w) : w.y) + 0.035;
      if (wy <= curY + 0.5 && wy > y) y = wy;
    }
    return y;
  }
  collide(p, r) {
    for (const s of this.world.solids) {
      if ((s.y0 !== undefined && p.y < s.y0) || (s.y1 !== undefined && p.y > s.y1)) continue;
      const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), R = s.r + r;
      if (d < R && d > 1e-4) { p.x = s.x + dx / d * R; p.z = s.z + dz / d * R; }
    }
  }

  // ---------------------------------------------------------------- действия богатыря
  attack() {
    const h = this.hero; if (h.state === 'dead' || this.over) return;
    if (h.state === 'free') this.startAttack(0);
    else if (h.state === 'attack' && h.t > h.dur * 0.4 && h.combo < 2) h.queued = true;
  }
  startAttack(i) {
    const h = this.hero; h.state = 'attack'; h.combo = i; h.t = 0; h.dur = i === 2 ? 0.86 : 0.7; h.hitDone = false; h.queued = false;
    h.anim.play(['Attack', 'Attack3', 'Attack4'][i], { once: true, ts: 1.33 / h.dur });
    this.lockOn(h, 6);
  }
  lockOn(c, range) { const o = c === this.hero ? this.leshy : this.hero; const d = o.pos.clone().sub(c.pos); if (d.length() < range && o.state !== 'dead') c.yaw = turn(c.yaw, Math.atan2(d.x, d.z), 1); }
  dodge() {
    const h = this.hero; if (!['free', 'attack'].includes(h.state) || h.cd > 0 || this.over) return;
    const mv = this.moveDir(); h.dodgeDir = mv.lengthSq() > 0.01 ? mv.normalize() : new THREE.Vector3(-Math.sin(h.yaw), 0, -Math.cos(h.yaw));
    h.state = 'dodge'; h.t = 0; h.dur = 0.46; h.cd = 0.7; h.anim.play('Jump', { once: true, ts: 3.2 });
  }
  toggleAura() {
    const h = this.hero; const a = this.auras.bogatyr; if (h.state === 'dead' || this.over) return;
    if (a.active) { a.deactivate(); return; }
    if (h.aura < 35) { this.say('Аура не накоплена: бейте и держите удары', 1.6); return; }
    a.activate(); this.slow = 0.25; this.react('bogatyr');
  }
  // реакция как в видео: жёсткий кадр, осколки, сдвиг цвета, камера рывком ближе
  react(who, at) {
    const c = new THREE.Vector3();
    if (who === 'hit') { this.bursts.hit.fire(at, 0.55, { life: 0.5, pulseEvery: 0.25 }); }
    else { const ch = who === 'bogatyr' ? this.hero : this.leshy; ch.w.getWorldPosition(c); c.y += (who === 'bogatyr' ? HERO_H : LESHY_H) * 0.55; this.bursts[who].fire(c, who === 'bogatyr' ? 0.9 : 1.3, { life: 1.6, pulseEvery: 0.58 }); this.bursts[who].who = ch; }
    this.ctx.post?.kick(90); this.fovKick = who === 'hit' ? 0.05 : 0.08; this.fovT = 0;
  }
  moveDir() {
    const k = this.keys; const f = new THREE.Vector3(); this.ctx.camera.getWorldDirection(f); f.y = 0; f.normalize(); const r = new THREE.Vector3(-f.z, 0, f.x);
    const v = new THREE.Vector3();
    if (k.KeyW) v.add(f); if (k.KeyS) v.sub(f); if (k.KeyD) v.add(r); if (k.KeyA) v.sub(r);
    return v;
  }
  hurtHero(dmg, from, unblockable) {
    const h = this.hero; if (h.state === 'dead' || this.over) return false;
    if (h.state === 'dodge' && h.t < 0.36) { this.say('Уклон!', 0.6); return false; }
    const d = from.clone().sub(h.pos); const ang = angDiff(h.yaw, Math.atan2(d.x, d.z));
    const push = d.clone().setY(0).normalize().multiplyScalar(-1);
    if (h.blocking && !unblockable && ang < 1.4 && h.state !== 'attack') {
      dmg *= 0.15; h.pos.addScaledVector(push, 0.35); this.spark(this.shield.position, 0.5); h.aura = Math.min(100, h.aura + 4);
    } else {
      if (this.auras.bogatyr.active) dmg *= 0.7;
      h.state = 'hit'; h.t = 0; h.dur = 0.5; h.anim.play('Hit', { once: true, ts: 2.2 }); h.pos.addScaledVector(push, unblockable ? 1.4 : 0.7);
      this.spark(new THREE.Vector3(h.pos.x, h.pos.y + 1.1, h.pos.z), 0.7); h.aura = Math.min(100, h.aura + 6);
    }
    h.hp = Math.max(0, h.hp - dmg);
    if (h.hp <= 0) { h.state = 'dead'; h.anim.play('Death', { once: true, clamp: true, fade: 0.2 }); this.auras.bogatyr.deactivate(); this.end(false); }
    return true;
  }
  hurtLeshy(dmg, finisher) {
    const L = this.leshy; if (L.state === 'dead') return;
    const heroAura = this.auras.bogatyr.active; if (heroAura) dmg *= 1.6;
    L.hp = Math.max(0, L.hp - dmg); L.hits++; this.hero.aura = Math.min(100, this.hero.aura + 7);
    const c = new THREE.Vector3(); (L.chest ?? L.w).getWorldPosition(c); this.spark(c, finisher ? 1.3 : 0.9); this.slow = finisher ? 0.12 : 0.05;
    if (finisher || heroAura) this.react('hit', c);
    if (L.hp <= 0) { L.state = 'dead'; L.anim.play('Death', { once: true, clamp: true, fade: 0.2 }); this.auras.leshy.deactivate(); this.warn.visible = false; this.end(true); return; }
    if (L.state === 'wait') { L.state = 'chase'; }
    const canStagger = L.state === 'chase' || (L.state === 'swipe' && L.t < 0.35);
    if (canStagger && (finisher || heroAura)) { L.state = 'hit'; L.t = 0; L.anim.play('Hit', { once: true, ts: 1.6 }); }
    if (!L.rage && L.hp < 160) { L.state = 'roar'; L.t = 0; L.rage = true; L.anim.play('Wave', { once: true, ts: 1.4 }); this.auras.leshy.activate(); this.say('Леший в ярости', 1.8); this.slow = 0.3; this.react('leshy'); }
  }
  spark(p, s) { const st = this.stars[this.starI++ % this.stars.length]; st.position.copy(p); st.userData.t = 0; st.userData.s = s; st.material.rotation = Math.random() * 6; st.visible = true; }

  // ---------------------------------------------------------------- кадр
  update(rawDt) {
    if (this.slow > 0) this.slow -= rawDt;
    const dt = this.slow > 0 ? rawDt * 0.3 : rawDt; this.t += dt; U.uTime.value = this.t;
    this.updHero(dt); this.updLeshy(dt);
    // друг сквозь друга не проходят
    { const h = this.hero.pos, L = this.leshy.pos; const dx = h.x - L.x, dz = h.z - L.z, d = Math.hypot(dx, dz); if (d < 1.15 && d > 1e-3 && this.leshy.state !== 'dead') { h.x = L.x + dx / d * 1.15; h.z = L.z + dz / d * 1.15; } }
    for (const c of [this.hero, this.leshy]) { c.w.position.copy(c.pos); c.w.rotation.y = c.yaw; }
    this.updWeapons();
    for (const k in this.auras) this.auras[k].update(dt);
    { const st = Math.floor(this.t * 12); for (const L of LINE_AURAS) { L.uStep.value = st; L.uK.value = 0.75 * (L.bright ?? 1); } }
    for (const k in this.bursts) { const b = this.bursts[k]; if (b.who && b.group.visible) { const c = b.who.w.getWorldPosition(new THREE.Vector3()); c.y += (b.who === this.hero ? HERO_H : LESHY_H) * 0.55; b.follow(c); } b.update(dt, this.ctx.camera); }
    this.spots.forEach((m, i) => { const c = i ? this.leshy : this.hero; m.position.set(c.pos.x, c.pos.y + 0.03, c.pos.z); });
    this.fire.update(dt, this.ctx.camera);
    for (const r of this.ribbons) r.update(dt); for (const l of this.lamps) l.update(dt); this.clouds.update(dt); this.haze.update(dt); this.shafts.update(dt);
    // драма ауры: пока горит аура, тени черней и чётче, штриховки больше
    { let d = 0; for (const k in this.auras) d = Math.max(d, Math.min(1, this.auras[k].amt)); this.ctx.style.setDrama(d); }
    this.ctx.style.setFocus({ x: this.hero.pos.x, y: this.hero.pos.y + 1, z: this.hero.pos.z });
    this.updLights();
    this.waterfx.update(dt);
    this.updFx(dt);
    this.updCamera(rawDt);
    this.life.update(this.t, dt, 1);
    for (const m of this.world.mists) { if (m.userData.rise !== undefined) { const k = ((this.t * 0.25 + m.userData.rise * 0.1) % 1); m.position.y = m.userData.rise + k * 1.2; m.material.uniforms.uA.value = 0.16 * Math.sin(k * Math.PI); } m.lookAt(this.ctx.camera.position.x, m.position.y, this.ctx.camera.position.z); }
    // языки огней перерисовываются шагами 12 к/с, как у пламени свечи в видео
    { const st = Math.floor(this.t * 12); this.world.anim.flames.forEach((f, i) => { const hh = Math.sin((st + i * 17) * 127.1) * 43758.5; const k = 1 + 0.16 * ((hh - Math.floor(hh)) - 0.5) * 2; f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); }); }
    this.updHud();
  }
  updHero(dt) {
    const h = this.hero; h.t += dt; h.cd = Math.max(0, h.cd - dt);
    const a = this.auras.bogatyr;
    if (a.active) { h.aura = Math.max(0, h.aura - dt * 7); h.hp = Math.min(100, h.hp + dt * 2); if (h.aura <= 0) a.deactivate(); }
    let v = new THREE.Vector3();
    if (h.state === 'free') {
      const mv = this.moveDir(); const run = this.keys.ShiftLeft || this.keys.ShiftRight;
      const want = mv.lengthSq() > 0.01 ? (h.blocking ? 1.0 : run ? 4.6 : 2.0) : 0;
      if (want > 0) { mv.normalize(); if (h.blocking) this.lockOn(h, 12); else h.yaw = turn(h.yaw, Math.atan2(mv.x, mv.z), dt * 10); }
      h.speed += (want - h.speed) * Math.min(1, dt * 8);
      v = want > 0 ? mv.multiplyScalar(h.speed) : new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw)).multiplyScalar(h.speed * 0.5);
      if (h.blocking) { h.anim.play('Crouch', { ts: 0.6 }); if (want === 0) this.lockOn(h, 12); }
      else h.anim.loco(h.speed, 2.0, 4.6);
    } else if (h.state === 'attack') {
      const u = h.t / h.dur;
      if (u < 0.4) v.set(Math.sin(h.yaw), 0, Math.cos(h.yaw)).multiplyScalar(1.6 * (1 - u / 0.4));
      if (!h.hitDone && u > 0.42) {
        h.hitDone = true; const L = this.leshy; const d = L.pos.clone().sub(h.pos); const reach = h.combo === 2 ? 2.7 : 2.3;
        if (L.state !== 'dead' && d.length() < reach && angDiff(h.yaw, Math.atan2(d.x, d.z)) < 1.15) this.hurtLeshy([9, 11, 18][h.combo], h.combo === 2);
      }
      if (h.t >= h.dur) { if (h.queued) this.startAttack(h.combo + 1); else { h.state = 'free'; h.speed = 0; } }
    } else if (h.state === 'dodge') {
      const u = h.t / h.dur; v.copy(h.dodgeDir).multiplyScalar(7.5 * (1 - u));
      if (h.t >= h.dur) { h.state = 'free'; h.speed = 0; }
    } else if (h.state === 'hit') { if (h.t >= h.dur) h.state = 'free'; }
    h.pos.addScaledVector(v, dt); h.pos.y = Math.max(h.pos.y - 9 * dt, 0) ; this.collide(h.pos, 0.35); h.pos.y = this.floorAt(h.pos.x, h.pos.z, h.pos.y + 0.3);
    U.uPush.value[0].set(h.pos.x, h.pos.y, h.pos.z, 1.05);
  }
  updLeshy(dt) {
    const L = this.leshy, h = this.hero; L.t += dt; L.atkCd -= dt; L.superCd -= dt;
    const d = h.pos.clone().sub(L.pos); const dist = Math.hypot(d.x, d.z); const face = Math.atan2(d.x, d.z);
    const K = L.rage ? 1.3 : 1;
    let v = new THREE.Vector3();
    const fwd = () => new THREE.Vector3(Math.sin(L.yaw), 0, Math.cos(L.yaw));
    if (h.state === 'dead' && L.state !== 'dead') { L.state = 'idle'; }
    switch (L.state) {
      case 'wait':
        L.yaw = turn(L.yaw, face, dt * 2); L.anim.play('Idle');
        if (dist < 15 || this.started || this.t > 2.5) { L.state = 'chase'; this.say('Леший вышел из дуба', 1.6); }
        break;
      case 'idle': L.anim.play('Idle'); break;
      case 'chase': {
        L.yaw = turn(L.yaw, face, dt * 4);
        const want = dist > 2.5 ? (dist > 7 ? 3.6 : 1.9) * K : 0; L.speed += (want - L.speed) * Math.min(1, dt * 4);
        v = fwd().multiplyScalar(L.speed); L.anim.loco(L.speed, 1.9, 3.6);
        if (dist < 3.2 && L.atkCd <= 0 && h.state !== 'dead') {
          if (L.superCd <= 0 && (L.rage || L.hits > 4)) { L.state = 'slam'; L.t = 0; L.tgt = h.pos.clone(); L.from = L.pos.clone(); L.anim.play('Jump', { once: true, ts: 1.15 }); this.warn.visible = true; }
          else { L.state = 'swipe'; L.t = 0; L.done = false; L.anim.play('Attack', { once: true, ts: 1.0 * K }); }
        } else if (dist > 5 && dist < 9 && L.superCd <= 0 && (L.rage || L.hits > 4)) { L.state = 'slam'; L.t = 0; L.tgt = h.pos.clone(); L.from = L.pos.clone(); L.anim.play('Jump', { once: true, ts: 1.15 }); this.warn.visible = true; }
        break;
      }
      case 'swipe': {
        const T = 1 / K;
        if (L.t < 0.45 * T) L.yaw = turn(L.yaw, face, dt * 5);
        if (L.t > 0.35 * T && L.t < 0.6 * T) v = fwd().multiplyScalar(2.2);
        if (!L.done && L.t > 0.62 * T) { L.done = true; if (dist < 3.1 && angDiff(L.yaw, face) < 1.2) this.hurtHero(14 * K, L.pos, false); }
        if (L.t > 1.15 * T) { L.state = 'chase'; L.atkCd = (0.7 + Math.random() * 0.9) / K; }
        break;
      }
      case 'slam': {
        const u = L.t / 1.4; this.warn.position.set(L.tgt.x, this.floorAt(L.tgt.x, L.tgt.z, L.tgt.y + 0.3) + 0.06, L.tgt.z);
        const r = 3.0 * Math.min(1, 0.4 + u * 1.2); this.warn.scale.setScalar(r); this.warn.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(L.t * 14));
        L.yaw = turn(L.yaw, Math.atan2(L.tgt.x - L.pos.x, L.tgt.z - L.pos.z), dt * 6);
        if (u > 0.35 && u < 0.72) { const k = (u - 0.35) / 0.37; const end = L.tgt.clone().addScaledVector(L.tgt.clone().sub(L.from).setY(0).normalize(), -1.2); L.pos.lerpVectors(L.from, end, k * k * (3 - 2 * k)); }
        if (u >= 0.72 && !L.done2) {
          L.done2 = true; this.warn.visible = false; this.wave.position.copy(this.warn.position); this.wave.userData.t = 0; this.wave.visible = true; this.slow = 0.12;
          const hd = Math.hypot(h.pos.x - L.tgt.x, h.pos.z - L.tgt.z); if (hd < 3.0) this.hurtHero(22 * K, L.tgt, true);
          this.react('hit', this.warn.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
        }
        if (u >= 1) { L.state = 'chase'; L.done2 = false; L.superCd = L.rage ? 6 : 9; L.atkCd = 1.2; L.hits = 0; }
        break;
      }
      case 'hit': if (L.t > 0.6) { L.state = 'chase'; L.atkCd = Math.max(L.atkCd, 0.4); } break;
      case 'roar': if (L.t > 2.0) { L.state = 'chase'; L.atkCd = 0.3; L.superCd = 0.5; } break;
      default: break;
    }
    if (L.state !== 'slam') { L.pos.addScaledVector(v, dt); this.collide(L.pos, 0.6); }
    L.pos.y = this.floorAt(L.pos.x, L.pos.z, L.pos.y + 0.3);
    U.uPush.value[1].set(L.pos.x, L.pos.y, L.pos.z, 1.6);
  }
  // меч в кулаке: клинок идёт от мизинца к указательному, лезвие — по пальцам; щит на левом предплечье
  updWeapons() {
    const h = this.hero; if (!h.rh || !h.i1 || !h.p1) return;
    h.w.updateMatrixWorld(true);
    const P = (b) => b.getWorldPosition(new THREE.Vector3());
    const hand = P(h.rh), i1 = P(h.i1), p1 = P(h.p1), m1 = P(h.m1 ?? h.i1);
    const y = i1.clone().sub(p1).normalize(); const f = m1.clone().sub(hand).normalize();
    const x = new THREE.Vector3().crossVectors(y, f).normalize(); const z = new THREE.Vector3().crossVectors(x, y).normalize();
    this.sword.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    this.sword.position.copy(hand).lerp(m1, 0.55).addScaledVector(y, -0.02);
    if (h.lf && h.lh) {
      const a = P(h.lf), b = P(h.lh); const arm = b.clone().sub(a).normalize();
      const fw = new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw)); const left = new THREE.Vector3(Math.cos(h.yaw), 0, -Math.sin(h.yaw));
      const n = fw.addScaledVector(left, 0.45); n.addScaledVector(arm, -n.dot(arm)).normalize();
      this.shield.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      this.shield.position.lerpVectors(a, b, 0.55).addScaledVector(n, 0.09);
    }
  }
  updLights() {
    // ближайшие огни логова → пул рисованного света; остальным шейдерам логова — свой список
    const c = this.hero.pos; const F = this.firePos;
    const arr = this.world.lights.map((l) => [l.pos.distanceToSquared(c) * (l.pri ? 0.3 : 1), l]).sort((a, b) => a[0] - b[0]);
    const near = arr.filter(([, l]) => Math.hypot(l.pos.x - F.x, l.pos.z - F.z) > 1.6).slice(0, this.pool.length);
    near.forEach(([, l], i) => { const p = this.pool[i]; const sd = l.pos.x * 1.7 + l.pos.z; const fl = 1 - l.flick * 0.25 * (0.5 + 0.5 * Math.sin(this.t * 9 + sd)); p.position.copy(l.pos); p.color.setRGB(l.col[0], l.col[1], l.col[2]); p.intensity = 4.5 * fl; p.distance = Math.max(7, l.r * 1.4); p.decay = 1.0; });   // v17: пятно ~4 м с плавным спадом (lampPool), без засветки всей стены
    arr.slice(0, MAXL).forEach(([, l], i) => { U.uL.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.r); const k = 2.7; U.uLC.value[i].set(l.col[0] * k, l.col[1] * k, l.col[2] * k); });
    U.uLN.value = Math.min(MAXL, arr.length);
    this.moon.target.position.set(c.x, 0, c.z); this.moon.position.set(c.x + 10, 40, c.z - 18);
    // отсвет: костёр и включённые ауры
    const fk = 0.5 + 0.08 * Math.sin(Math.floor(this.t * 8) * 2.3);
    // свет локальный: отсвет костра до 4,5 м, ауры до 2,6 м (в видео ореол не шире 1,5 источника)
    const B = [{ pos: this.firePos, color: FIRE_PRESETS.hearth.light, radius: 4.5, k: fk }];
    // аура освещает и прорисовывает мир вокруг (штрихи, кромки) до ~6 м
    for (const k in this.auras) { const b = this.auras[k].bounce(this.ctx.camera); if (b) { b.radius = Math.min(b.radius * 1.7, 6); b.k = Math.min(b.k, 0.9); B.push(b); } }
    // ближайший фонарь тоже штрихует фактуру вокруг себя
    if (B.length < 4 && near.length) { const l = near[0][1]; B.push({ pos: l.pos, color: new THREE.Color(l.col[0], l.col[1], l.col[2]), radius: Math.min(3.5, l.r * 0.7), k: 0.4 }); }   // отсвет фонаря слабее: тёплое пятно уже даёт lampPool
    this.ctx.style.setBounce(B);
  }
  updFx(dt) {
    for (const s of this.stars) { if (!s.visible) continue; s.userData.t += dt; const u = s.userData.t / 0.22; if (u >= 1) { s.visible = false; continue; } const k = s.userData.s * (u < 0.3 ? u / 0.3 : 1 - (u - 0.3) * 0.6); s.scale.set(k, k, 1); }
    if (this.wave.visible) { const w = this.wave; w.userData.t += dt; const u = w.userData.t / 0.5; w.scale.setScalar(0.5 + u * 4.5); w.material.opacity = 0.9 * (1 - u); if (u >= 1) w.visible = false; }
  }
  updCamera(dt) {
    const h = this.hero, L = this.leshy, cam = this.ctx.camera;
    const k = this.keys; if (k.ArrowLeft) this.camYaw += dt * 1.6; if (k.ArrowRight) this.camYaw -= dt * 1.6;
    const fight = L.state !== 'wait' && L.state !== 'dead' && h.pos.distanceTo(L.pos) < 16;
    let back, look;
    if (fight) {
      // за спиной богатыря на линии к Лешему, чуть сбоку; смотрим между ними
      const d = h.pos.clone().sub(L.pos).setY(0).normalize(); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.32 + this.camYaw);
      back = h.pos.clone().addScaledVector(d, 5.6).add(new THREE.Vector3(0, 2.7, 0));
      look = h.pos.clone().lerp(L.pos, 0.42).add(new THREE.Vector3(0, 1.25, 0));
    } else {
      // вне боя камера «дышит»: ±3% расстояния за 10 с, шагами 12 к/с (как долли в видео города)
      const br = 1 + 0.03 * Math.cos(Math.floor(this.t * 12) / 12 * Math.PI * 2 / 10);
      const d = new THREE.Vector3(-Math.sin(h.yaw + this.camYaw), 0, -Math.cos(h.yaw + this.camYaw));
      back = h.pos.clone().addScaledVector(d, 5.2 * br).add(new THREE.Vector3(0, 2.4, 0));
      look = h.pos.clone().addScaledVector(d, -3).add(new THREE.Vector3(0, 1.2, 0));
    }
    // камера не уходит под землю
    back.y = Math.max(back.y, this.floorAt(back.x, back.z) + 1.2);
    if (!this.camPos) { this.camPos = back.clone(); this.camLook = look.clone(); }
    const s = 1 - Math.exp(-dt * (fight ? 3.2 : 2.2));
    this.camPos.lerp(back, s); this.camLook.lerp(look, 1 - Math.exp(-dt * 5));
    cam.position.copy(this.camPos); this.ctx.controls.target.copy(this.camLook); cam.lookAt(this.camLook);
    // рывок камеры на событии: сразу ближе, держится шаг, потом плавно назад
    if (this.fovKick > 0) { this.fovT += dt; const k = this.fovT < 0.09 ? 1 : Math.max(0, 1 - (this.fovT - 0.09) / 0.35); cam.fov = this.fov0 * (1 - this.fovKick * k); cam.updateProjectionMatrix(); if (k <= 0) this.fovKick = 0; }
  }

  // ---------------------------------------------------------------- экран боя
  hud() {
    const d = document.createElement('div'); d.id = 'lairHud';
    d.innerHTML = `<style>
      #lairHud{position:fixed;left:18px;bottom:18px;width:min(420px,calc(100vw - 36px));pointer-events:none;font:12px/1.3 system-ui,sans-serif;color:var(--bone)}
      #lairHud .bar{height:9px;background:rgba(10,8,6,.7);border:1px solid var(--line);margin:2px 0 7px;clip-path:polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)}
      #lairHud .bar i{display:block;height:100%;transition:width .15s}
      #lairHud .lb{display:flex;justify-content:space-between;font-size:11px;color:var(--boneDim)}
      #lairMsg{position:fixed;left:50%;top:22%;transform:translateX(-50%);font:28px/1.1 'Rub',Georgia,serif;color:var(--bone);text-shadow:0 2px 0 #000,0 0 12px #000;pointer-events:none;text-align:center}
      #lairMsg button{pointer-events:auto;font:14px system-ui;margin-top:10px}
    </style>
    <div class="lb"><span>Леший</span><span id="lhL"></span></div><div class="bar"><i id="lbL" style="background:#3fbf6a"></i></div>
    <div class="lb"><span>Богатырь</span><span id="lhH"></span></div><div class="bar"><i id="lbH" style="background:#c4302b"></i></div>
    <div class="lb"><span>Аура благодати (R)</span><span id="lhA"></span></div><div class="bar"><i id="lbA" style="background:#ffc04a"></i></div>`;
    document.body.appendChild(d); this.hudEl = d;
    const m = document.createElement('div'); m.id = 'lairMsg'; document.body.appendChild(m); this.msgEl = m; this.msgT = 0;
  }
  say(txt, t = 1.5) { this.msgEl.textContent = txt; this.msgT = t; }
  end(win) {
    this.over = true;
    this.msgEl.innerHTML = (win ? 'Леший повержен' : 'Богатырь пал') + '<br><button id="lairAgain">Ещё раз</button>'; this.msgT = 1e9;
    this.msgEl.querySelector('#lairAgain').onclick = () => this.reset();
  }
  reset() {
    const h = this.hero, L = this.leshy; this.over = false; this.started = false; this.msgEl.textContent = ''; this.msgT = 0;
    Object.assign(h, { hp: 100, aura: 60, state: 'free', t: 0, speed: 0, blocking: false }); h.pos.set(-17.5, 0, 11); h.pos.y = this.floorAt(h.pos.x, h.pos.z, 3); h.anim.play('Idle', { fade: 0.05 });
    Object.assign(L, { hp: 320, state: 'wait', t: 0, atkCd: 1, superCd: 5, hits: 0, rage: false, speed: 0 }); L.pos.set(this.door.x, 0, this.door.z); L.pos.y = this.floorAt(L.pos.x, L.pos.z, 3); L.yaw = this.door.yaw; L.anim.play('Idle', { fade: 0.05 });
    for (const k in this.auras) this.auras[k].deactivate();
    { const d = h.pos.clone().sub(L.pos); h.yaw = Math.atan2(-d.x, -d.z); }
    this.camPos = null; this.warn.visible = false;
  }
  updHud() {
    const h = this.hero, L = this.leshy, q = (id) => this.hudEl.querySelector(id);
    q('#lbL').style.width = (L.hp / 320 * 100) + '%'; q('#lhL').textContent = Math.ceil(L.hp) + (L.rage ? ' · ярость' : '');
    q('#lbH').style.width = h.hp + '%'; q('#lhH').textContent = Math.ceil(h.hp);
    q('#lbA').style.width = h.aura + '%'; q('#lhA').textContent = this.auras.bogatyr.active ? 'горит' : h.aura >= 35 ? 'готова' : Math.floor(h.aura);
    if (this.msgT > 0 && this.msgT < 1e8) { this.msgT -= 1 / 60; if (this.msgT <= 0) this.msgEl.textContent = ''; }
  }
  panel() {
    const d = document.createElement('div');
    d.innerHTML = '<h2>Бой в логове</h2><p style="font-size:12px;color:var(--boneDim);margin:0 0 8px">WASD — идти, Shift — бег, ЛКМ или F — удар (до 3 подряд), ПКМ — блок щитом, Space — уклон, R — аура благодати, ←/→ — повернуть камеру. Мышь камерой не управляет. Фиолетовый круг — прыжок Лешего: блоком не удержать, только уклон.</p>' +
      '<div class="row"><button id="lfStart">Позвать Лешего</button><button id="lfReset">Сначала</button></div>';
    d.querySelector('#lfStart').onclick = () => { this.started = true; };
    d.querySelector('#lfReset').onclick = () => this.reset();
    return d;
  }
  dispose() {
    LINE_AURAS.length = 0;
    removeEventListener('keydown', this._kd); removeEventListener('keyup', this._ku); removeEventListener('pointerup', this._pu);
    this.ctx.canvas.removeEventListener('pointerdown', this._pd); this.ctx.canvas.removeEventListener('contextmenu', this._cm);
    this.hudEl?.remove(); this.msgEl?.remove(); this.ctx.controls.enabled = true;
    this.ctx.camera.fov = this.fov0; this.ctx.camera.updateProjectionMatrix();
    for (const k in this.auras) this.auras[k].dispose?.();
    for (const r of this.ribbons || []) r.group.removeFromParent(); for (const l of this.lamps || []) l.group.removeFromParent(); this.ctx.style.setDrama?.(0); this.clouds?.group.removeFromParent(); this.haze?.group.removeFromParent(); this.shafts?.group.removeFromParent();
    U.uPush.value[0].set(0, -99, 0, 1); U.uPush.value[1].set(0, -99, 0, 1);
  }
}
