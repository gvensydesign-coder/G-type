// Леший-босс: фазы боя, шкала ярости, реакция на огонь.
// Модуль самостоятельный: BOSS (все числа в одном месте), BossDirector (логика фаз и ярости, без three.js),
// FireKit (факел Богатыря, головни, огненные пятна, горящий Леший; визуал из fx-library/living-fire).
// Перенос в Godot: см. ../README.md, раздел «Перенос».
import * as THREE from 'three';
import { WildFire, Torch, toonMaterial, toonMesh, SHARED } from 'fx/living-fire/firefx.js';

// ---------------------------------------------------------------- настройки
export const BOSS = {
  // from — доля здоровья, ниже которой начинается фаза. fire — как Леший реагирует на огонь.
  phases: [
    { id: 1, name: 'Хозяин чащи', from: 1.0, fire: 'fear', burnMul: 1.6, walk: 1.0, tempo: 1.0, dmg: 1.0, chain: 0.3, cd: [0.9, 1.7], superCd: [9, 13],
      moves: ['claw', 'backhand', 'throw', 'roots', 'volley'] },
    { id: 2, name: 'Гнев чащи', from: 0.65, fire: 'anger', burnMul: 1.2, walk: 1.08, tempo: 1.06, dmg: 1.08, chain: 0.45, cd: [0.7, 1.4], superCd: [7, 10],
      moves: ['claw', 'backhand', 'throw', 'roots', 'volley', 'leap', 'grab', 'douse', 'stomp'] },
    { id: 3, name: 'Ярость леса', from: 0.30, fire: 'frenzy', burnMul: 1.0, walk: 1.15, tempo: 1.12, dmg: 1.15, chain: 0.6, cd: [0.5, 1.15], superCd: [5.5, 8],
      moves: ['claw', 'backhand', 'throw', 'roots', 'volley', 'leap', 'grab', 'stomp'] },
  ],
  rage: {
    max: 100,
    perDmg: 0.3,          // за единицу урона от меча
    perBlocked: 5,        // богатырь закрылся щитом или парировал
    perFire: [3, 12, 16], // ожог по фазам
    onPhase: 40,          // рёв перехода фазы сразу наполняет
    decay: 3.5,           // в секунду, пока не разъярён
    enragedDur: 7,        // «Разъярён»: быстрее, сильнее, не вздрагивает от ударов, длинные серии
    spentDur: 2.8,        // потом «Выдохся»: медленный, легко оглушить
    walk: 1.2, tempo: 1.1, dmg: 1.15, cdMul: 0.55, chainAdd: 0.3,
    spentWalk: 0.55, spentTempo: 0.85, spentCdMul: 2.0, spentPoise: 2.0,
    lastStand: 0.15,      // ниже 15% здоровья в 3-й фазе ярость больше не спадает
  },
  fire: {
    torchLen: 0.62,       // от кулака до огня
    sweepDur: 0.6, sweepHit: [0.2, 0.38], sweepCost: 12, sweepDmg: 9, sweepReach: 2.4, sweepCone: 0.9,
    heatRange: 3.0,       // факел ближе — Леший 1-й фазы пятится
    brands: 3, brandRecharge: 10, brandCost: 8, brandDmg: 12, brandRange: 9,
    patchLife: 11, patchR: 1.3, patchDps: 7,
    fearCd: 4.5, fearDur: 1.3,
    douseCd: 9, douseR: 2.4, stompR: 3.6, stompCd: 6, stompSeek: 4.5,
    burnDur: 6, burnDps: 5, burnWalk: 1.12, burnDmg: 1.1,
    relight: 0.9,
  },
};

// ---------------------------------------------------------------- фазы и ярость
export class BossDirector {
  constructor(cfg = BOSS) { this.cfg = cfg; this.reset(); }
  reset() { this.phase = 1; this.rage = 0; this.enraged = 0; this.spent = 0; this.lastStand = false; }
  get P() { return this.cfg.phases[this.phase - 1]; }
  // номер фазы, порог которой пройден, но рёв перехода ещё не прозвучал (0 — нет)
  due(hpFrac) {
    const ph = this.cfg.phases;
    for (let i = ph.length - 1; i > 0; i--) if (hpFrac <= ph[i].from && this.phase < ph[i].id) return ph[i].id;
    return 0;
  }
  enterPhase(id) { this.phase = id; if (this.enraged <= 0 && this.spent <= 0) this.rage = Math.max(this.rage, this.cfg.rage.onPhase); }
  allows(move) { return this.P.moves.includes(move); }
  // вернёт 'enrage', если шкала заполнилась
  addRage(x) {
    const R = this.cfg.rage;
    if (this.enraged > 0 || this.spent > 0 || x <= 0) return null;
    this.rage = Math.min(R.max, this.rage + x);
    if (this.rage >= R.max) { this.enraged = R.enragedDur; return 'enrage'; }
    return null;
  }
  // события: 'enrage' | 'spent' | 'calm' | 'lastStand'
  update(dt, hpFrac) {
    const R = this.cfg.rage;
    if (!this.lastStand && this.phase >= 3 && hpFrac <= R.lastStand && hpFrac > 0) {
      this.lastStand = true; this.spent = 0; this.enraged = Infinity; this.rage = R.max; return 'lastStand';
    }
    if (this.enraged > 0) {
      if (this.lastStand) return null;
      this.enraged -= dt; this.rage = R.max * Math.max(0, this.enraged) / R.enragedDur;
      if (this.enraged <= 0) { this.enraged = 0; this.spent = R.spentDur; this.rage = 0; return 'spent'; }
      return null;
    }
    if (this.spent > 0) { this.spent -= dt; if (this.spent <= 0) { this.spent = 0; return 'calm'; } return null; }
    this.rage = Math.max(0, this.rage - R.decay * dt);
    return null;
  }
  get isEnraged() { return this.enraged > 0; }
  get isSpent() { return this.spent > 0; }
  get walk() { const R = this.cfg.rage; return this.P.walk * (this.enraged > 0 ? R.walk : 1) * (this.spent > 0 ? R.spentWalk : 1); }
  get tempo() { const R = this.cfg.rage; return this.P.tempo * (this.enraged > 0 ? R.tempo : 1) * (this.spent > 0 ? R.spentTempo : 1); }
  get dmg() { return this.P.dmg * (this.enraged > 0 ? this.cfg.rage.dmg : 1); }
  get chain() { return Math.min(0.85, this.P.chain + (this.enraged > 0 ? this.cfg.rage.chainAdd : 0)); }
  get poiseMul() { return this.spent > 0 ? this.cfg.rage.spentPoise : 1; }
  cd() { const R = this.cfg.rage, [a, b] = this.P.cd; return (a + Math.random() * (b - a)) * (this.enraged > 0 ? R.cdMul : 1) * (this.spent > 0 ? R.spentCdMul : 1); }
  superCd() { const [a, b] = this.P.superCd; return (a + Math.random() * (b - a)) * (this.enraged > 0 ? 0.7 : 1); }
  get rageFrac() { return this.rage / this.cfg.rage.max; }
}

// ---------------------------------------------------------------- огонь
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

function makeTorchMesh() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.7, 7), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.95 }));
  pole.position.y = 0.1; pole.castShadow = true;
  // навершие: просмолённая пакля, калится (материал огня: aHeat/aChar)
  const headGeo = new THREE.CylinderGeometry(0.055, 0.04, 0.16, 8, 2);
  const head = toonMesh(headGeo, toonMaterial({ color: '#3a2a1c', color2: '#2a1d12', kind: 1 }));
  head.position.y = 0.47;
  const anchor = new THREE.Object3D(); anchor.position.y = 0.56;
  g.add(pole, head, anchor);
  return { group: g, head, anchor };
}

function makeBrandMesh() {
  const g = new THREE.Group();
  const log = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0x2a1d12, roughness: 1, emissive: 0x6a1e04, emissiveIntensity: 0.6 }));
  log.rotation.z = Math.PI / 2; log.castShadow = true;
  const anchor = new THREE.Object3D(); anchor.position.set(0.18, 0.03, 0);
  g.add(log, anchor);
  return { group: g, anchor };
}

export function makeMud() {
  const g = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(0.3, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 0.8 + Math.random() * 0.35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k); }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2b3322, roughness: 0.35, metalness: 0.0, flatShading: true })));
  const weed = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 10), new THREE.MeshStandardMaterial({ color: 0x51662a, roughness: 1 }));
  weed.rotation.x = 1.2; g.add(weed);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Пламя рисует WildFire из living-fire (общие буферы языков, искр, дыма); здесь только «точечные» огни: Torch.
// Освещение сцены (MeshStandard) — обычные PointLight: один у факела, два общих у пятен/горящего Лешего.
export class FireKit {
  constructor(scene, camera, o = {}) {
    this.scene = scene; this.cfg = o.cfg ?? BOSS.fire;
    SHARED.uFog.value.set(o.fog ?? 0x1a2120); SHARED.uFogD.value = 0.022;
    this.fire = new WildFire(scene, camera, { maxFlames: 260, maxSparks: 160, maxSmoke: 120 });
    this.fire.setWind(30, 0.22);
    // дыма меньше, чем у костра: на поляне много мелких очагов
    { const puff = this.fire._puff.bind(this.fire); this.fire._puff = (...a) => { if (Math.random() < 0.35) puff(...a); }; }
    // WildFire ждёт хотя бы один узел горения: незаметная щепка глубоко под землёй (никогда не загорится)
    const chip = toonMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), toonMaterial({ outline: false }));
    chip.position.set(0, -60, 0); chip.visible = false; scene.add(chip);
    this.fire.addObject(chip, 'log', { spacing: 0.3 });
    // факел богатыря
    const t = makeTorchMesh();
    this.torchMesh = t.group; this.torchMesh.visible = false; scene.add(this.torchMesh);
    this.torch = new Torch(this.fire, t.anchor, t.head, { size: 0.62 });
    this.torchLight = new THREE.PointLight(0xffa04a, 0, 9, 1.6); scene.add(this.torchLight);
    this.torchSign = 1;
    this.patches = []; this.brands = [];
    this.lights = [0, 1].map(() => { const l = new THREE.PointLight(0xff8a3a, 0, 10, 1.6); scene.add(l); return l; });
    // горящий Леший: три очага на костях
    this.burnBones = ['Spine2', 'LeftArm', 'RightArm', 'Head'];
    this.burn = this.burnBones.map((b, i) => { const a = new THREE.Object3D(); scene.add(a); return { bone: b, anchor: a, torch: new Torch(this.fire, a, null, { size: i === 0 ? 1.0 : 0.7 }) }; });
    this.burning = false;
    this.scorchMat = new THREE.MeshBasicMaterial({ color: 0x120c08, transparent: true, opacity: 0.55, depthWrite: false });
    this.scorchGeo = new THREE.CircleGeometry(1, 20); this.scorchGeo.rotateX(-Math.PI / 2);
    this.t = 0;
  }
  get torchLit() { return this.torchMesh.visible && this.torch.lit; }
  torchHead(out = new THREE.Vector3()) { return this.torch.anchor.getWorldPosition(out); }
  showTorch(on) {
    this.torchMesh.visible = on;
    if (on) this.torch.ignite(); else { this.torch.state = 'off'; this.torch.k = 0; }
  }
  // кулак левой руки: центр, ось древка (знак выбран один раз, чтобы огонь смотрел вверх в стойке)
  placeTorch(fist, calibrate = false) {
    const y = _v.copy(fist.across).multiplyScalar(this.torchSign);
    if (calibrate && y.y < 0) { this.torchSign *= -1; y.negate(); }
    y.addScaledVector(fist.finger, 0.15).normalize();
    _q.setFromUnitVectors(_up, y);
    this.torchMesh.quaternion.copy(_q);
    this.torchMesh.position.copy(fist.center).addScaledVector(y, -0.06);
    this.torchMesh.updateMatrixWorld(true);
  }
  douseTorch() { if (this.torch.lit) { this.torch.extinguish(); return true; } return false; }
  relight() { if (this.torchMesh.visible && !this.torch.lit && this.torch.state !== 'strike') this.torch.ignite(); }

  // огненное пятно на земле (3 языка + выжженный круг)
  spawnPatch(at, life = this.cfg.patchLife, r = this.cfg.patchR) {
    const p = { at: new THREE.Vector3(at.x, 0, at.z), r, life, t: 0, torches: [], out: false };
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Object3D();
      const ang = i * 2.1 + Math.random(), rr = i === 0 ? 0 : r * 0.45;
      a.position.set(p.at.x + Math.cos(ang) * rr, 0.06, p.at.z + Math.sin(ang) * rr);
      this.scene.add(a);
      const tr = new Torch(this.fire, a, null, { size: i === 0 ? 1.25 : 0.9 }); tr.ignite();
      p.torches.push({ a, tr });
    }
    p.scorch = new THREE.Mesh(this.scorchGeo, this.scorchMat); p.scorch.position.set(p.at.x, 0.02, p.at.z); p.scorch.scale.setScalar(0.01); this.scene.add(p.scorch);
    this.patches.push(p);
    this.fire.ignite(p.at, 0.5, 2);
    return p;
  }
  // залить: пятна в радиусе гаснут; возвращает число залитых
  douseAt(at, r) {
    let n = 0;
    for (const p of this.patches) if (!p.out && Math.hypot(p.at.x - at.x, p.at.z - at.z) < r + p.r * 0.6) { this.killPatch(p); n++; }
    return n;
  }
  killPatch(p) { if (p.out) return; p.out = true; p.life = Math.min(p.life, 0); for (const { tr } of p.torches) tr.extinguish(); }
  patchAt(pos, extra = 0) {
    for (const p of this.patches) if (!p.out && p.t > 0.25 && Math.hypot(p.at.x - pos.x, p.at.z - pos.z) < p.r + extra) return p;
    return null;
  }
  nearestPatch(pos, maxD) {
    let best = null, bd = maxD;
    for (const p of this.patches) { if (p.out) continue; const d = Math.hypot(p.at.x - pos.x, p.at.z - pos.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  // головня: летит по дуге; onHit(pos) проверяет попадание, onLand(pos) — где упала
  throwBrand(from, to, flight, hooks) {
    const m = makeBrandMesh();
    m.group.position.copy(from); this.scene.add(m.group);
    const tr = new Torch(this.fire, m.anchor, null, { size: 0.5 }); tr.state = 'lit'; tr.k = 1;
    this.brands.push({ m, tr, from: from.clone(), to: to.clone(), t: 0, flight, apex: 1.3 + from.distanceTo(to) * 0.08, hooks, spin: 7 + Math.random() * 4 });
  }
  setBurning(on) {
    if (on === this.burning) return;
    this.burning = on;
    for (const b of this.burn) on ? b.torch.ignite() : b.torch.extinguish();
  }
  reset() {
    for (const p of this.patches) { for (const { a, tr } of p.torches) { tr.state = 'off'; tr.update(0); this.scene.remove(a); } this.scene.remove(p.scorch); }
    this.patches.length = 0;
    for (const b of this.brands) { b.tr.state = 'off'; b.tr.update(0); this.scene.remove(b.m.group); }
    this.brands.length = 0;
    this.burning = false; for (const b of this.burn) { b.torch.state = 'off'; b.torch.update(0); }
    this.torch.state = 'off'; this.torch.update(0); this.torchMesh.visible = false;
    this.fire.reset();
  }
  update(dt, leshyCh) {
    this.t += dt;
    // головни
    for (let i = this.brands.length - 1; i >= 0; i--) {
      const b = this.brands[i];
      b.t += dt;
      const u = Math.min(1, b.t / b.flight);
      const g = b.m.group;
      g.position.lerpVectors(b.from, b.to, u);
      g.position.y = b.from.y * (1 - u) + 0.08 * u + 4 * b.apex * u * (1 - u);
      g.rotation.z += b.spin * dt; g.rotation.y += b.spin * 0.4 * dt;
      g.updateMatrixWorld(true);
      b.tr.update(dt);
      let done = u >= 1;
      if (!done && b.hooks?.onHit?.(g.position)) done = true;
      if (done) {
        if (u >= 1) b.hooks?.onLand?.(g.position);
        b.tr.state = 'off'; b.tr.update(0); this.scene.remove(b.m.group);
        this.brands.splice(i, 1);
      }
    }
    // пятна
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const p = this.patches[i];
      p.t += dt; p.life -= dt;
      p.scorch.scale.setScalar(p.r * Math.min(1, p.t / 0.6) * 1.1);
      if (p.life <= 0 && !p.out) this.killPatch(p);
      for (const { tr } of p.torches) tr.update(dt);
      if (p.out && p.torches.every(({ tr }) => tr.state === 'off')) {
        p.scorch.material = p.scorch.material === this.scorchMat ? this.scorchMat.clone() : p.scorch.material;
        p.fade = (p.fade ?? 1) - dt * 0.25;
        p.scorch.material.opacity = 0.55 * Math.max(0, p.fade);
        if (p.fade <= 0) { for (const { a } of p.torches) this.scene.remove(a); this.scene.remove(p.scorch); p.scorch.material.dispose(); this.patches.splice(i, 1); }
      }
    }
    // горящий Леший
    if (leshyCh) for (const b of this.burn) { leshyCh.worldBone(b.bone, b.anchor.position); if (b.bone === 'Head') b.anchor.position.y += 0.15; b.anchor.updateMatrixWorld(true); }
    for (const b of this.burn) b.torch.update(dt);
    // факел
    this.torch.update(dt);
    const head = this.torchHead(_v);
    const flick = 0.85 + 0.15 * Math.sin(this.t * 23) * Math.sin(this.t * 7.3);
    this.torchLight.position.copy(head).y += 0.15;
    this.torchLight.intensity = this.torchMesh.visible ? 5.5 * this.torch.k * flick : 0;
    // два общих света: самые яркие очаги
    const srcs = [];
    for (const p of this.patches) if (!p.out) srcs.push({ p: p.at, i: 7 * Math.min(1, p.t / 0.5) * Math.min(1, p.life / 1.5) });
    if (this.burning && leshyCh) srcs.push({ p: this.burn[0].anchor.position, i: 8 });
    srcs.sort((a, b) => b.i - a.i);
    this.lights.forEach((l, k) => {
      const s = srcs[k];
      if (!s) { l.intensity = 0; return; }
      l.position.set(s.p.x, s.p.y + 0.9, s.p.z);
      l.intensity = s.i * (0.85 + 0.15 * Math.sin(this.t * (17 + k * 5)));
    });
    // свет огня в шейдере — не больше 8 источников: оставляем самые яркие
    const XL = this.fire.extraLights;
    if (XL.length > 8) { XL.sort((a, b) => b.i - a.i); XL.length = 8; }
    this.fire.update(dt);
  }
}
