// Огонь как механика («Сказанье о Тени», превью 2026-11-12).
// Модуль поверх одобренного «Живого огня» (fx/firefx.js не меняется):
//   FireField   — чтение огня: жар в точке, центр огня рядом, подогрев узлов (поджог).
//   HeldTorch   — факел в руке: горит одним огнём (Torch), поджигает то, к чему его поднесли,
//                 сам занимается от огня рядом, гаснет по кнопке.
//   BodyFire    — горящее тело (Леший, богатырь): языки на костях, свет, искры, тело поджигает траву на бегу.
//   paintCharacter — рисованный материал персонажа (луна двумя ступенями, пятна огня ступенями, тушь-оболочка, уголь).
//   TreeFall    — горящее дерево валится по ветру, ложится на крону, бьёт тех, на кого упало.
// Узлы, топливо, ветер и нагрев — те же, что в firefx.js. Новые виды топлива: хвоя и листва.
import * as THREE from 'three';
import { FUELS, SHARED, NOISE, FIRE, prepGeo, toonMesh, toonMaterial, Torch } from '../fx/firefx.js';

// ---------------------------------------------------------------- настройки механики (всё в одном месте)
export const FM = {
  torch: { reach: .5, heatRate: 3.4, swingBoost: 2.2, catchHeat: 1.1, size: .8 },  // поджог: радиус у навершия, тепло в секунду (сено ~0,15 с, доска ~0,5 с); на замахе ×2,2 и шире
  body: { heatRate: .9, reach: .45, dps: 9 },                      // горящее тело: поджигает траву у ног и рук, урон в секунду
  fear: {                                                          // страх Лешего
    torchR: 6, torchK: 1.6, facingMin: .35,                      // факел ближе 6 м пугает, сильнее, если богатырь смотрит на Лешего
    fireR: 3.2, fireK: .16, decay: .3, rise: 3,                            // жар рядом
    keep: .55, recoil: 1.0,                                        // держит дистанцию / отшатывается
  },
  burn: { igniteHeat: 1.15, dur: 3.6, fieldDps: 6, heroIgnite: 1.6, heroDur: 1.6 },
  tree: { fallDmg: 38, fallR: .75 },
};

Object.assign(FUELS, {
  needles: { name: 'Хвоя', heat: 1.5, heatCap: .75, fuel: 16, flame: 1.15, spark: 1.3, shrink: .4, cool: .5 },
  leaves: { name: 'Листва', heat: 1.15, heatCap: 1.05, fuel: 13, flame: .95, spark: .8, shrink: .35, cool: .6 },
});

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// ---------------------------------------------------------------- чтение огня
export class FireField {
  constructor(fire) { this.fire = fire; }
  // жар в точке: сумма горящих узлов в радиусе r (по высоте ×0,6), ~1 = рядом с языком, 5+ = в огне
  heat(x, y, z, r = 1) {
    const F = this.fire; let h = 0;
    F.grid.query(x, y, z, r, (j) => { const n = F.nodes[j]; if (!n || n.state !== 1) return;
      const dx = n.wp.x - x, dy = (n.wp.y - y) * .6, dz = n.wp.z - z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < r) { const f = 1 - d / r; h += n.I * n.F.flame * f * f; } });
    return h;
  }
  // центр огня рядом (взвешенный), out.w = вес; null, если не горит
  center(x, y, z, r, out = new THREE.Vector4()) {
    const F = this.fire; out.set(0, 0, 0, 0);
    F.grid.query(x, y, z, r, (j) => { const n = F.nodes[j]; if (!n || n.state !== 1) return;
      const d = Math.hypot(n.wp.x - x, n.wp.z - z); if (d > r) return; const k = n.I * (1 - d / r);
      out.x += n.wp.x * k; out.y += n.wp.y * k; out.z += n.wp.z * k; out.w += k; });
    if (out.w < 1e-3) return null; out.x /= out.w; out.y /= out.w; out.z /= out.w; return out;
  }
  // подогреть несгоревшие узлы рядом с точкой (поджог факелом, горящим телом)
  warm(p, r, rate, dt) {
    const F = this.fire; let n = 0;
    F.grid.query(p.x, p.y, p.z, r, (j) => { const m = F.nodes[j]; if (!m || m.state !== 0) return;
      const d = m.wp.distanceTo(p); if (d > r) return; m.temp += rate * (1 - d / r * .6) * dt; n++; });
    return n;
  }
}

// ---------------------------------------------------------------- рисованный материал персонажа
const CH_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
uniform float uHull;
varying vec3 vW, vN; varying vec2 vUv;
void main(){
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 w = modelMatrix * vec4(transformed, 1.);
  vN = normalize(mat3(modelMatrix) * objectNormal);
#ifdef HULL
  w.xyz += vN * uHull;
#endif
  vW = w.xyz; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const CH_FRAG = /* glsl */`
uniform sampler2D uMap;
uniform vec3 uShade, uAmb, uFog, uInk, uRim, uMoonCol, uMoonDir, uEdge, cChar, cOut, cCore, cDeep;
uniform float uFogD, uStep, uBurn, uChar, uFlash, uLit;
uniform vec3 uFireP[8]; uniform vec4 uFireC[8]; uniform int uFireN;
varying vec3 vW, vN; varying vec2 vUv;
${NOISE}
void main(){
  float dist = length(vW - cameraPosition);
  float fogK = 1. - exp(-pow(dist * uFogD, 2.));
#ifdef HULL
  vec3 ink = mix(uInk, vec3(.227, .047, .024), clamp(uBurn * 1.4, 0., 1.));
  gl_FragColor = vec4(mix(ink, uFog, fogK * .9), 1.);
  return;
#endif
  vec3 n = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  vec3 base = texture2D(uMap, vUv).rgb * uLit;
  float m = dot(n, uMoonDir);
  float mb = m > .3 ? 1. : (m > -.15 ? .6 : .36);
  vec3 col = base * (uAmb + uMoonCol * mb * .62) * 1.3;
  col = mix(col, col * uShade * 2.2, (1. - mb) * .45);
  vec3 fl = vec3(0.); float fs = 0.;
  for (int i = 0; i < 8; i++) {
    if (i >= uFireN) break;
    vec3 L = uFireP[i] - vW; float d = length(L);
    float a = clamp(1. - d / uFireC[i].w, 0., 1.); a *= a;
    float nd = max(dot(n, L / max(d, 1e-3)), 0.) * .75 + .25;
    float e = a * nd; fl += uFireC[i].rgb * e; fs += e * (uFireC[i].r + uFireC[i].g) * .5;
  }
  float fb = fs > .85 ? 1. : (fs > .38 ? .62 : (fs > .11 ? .3 : 0.));
  float kem = (fs > .085 && fs < .11) ? .78 : 1.;
  vec3 fc = fs > 1e-4 ? fl / max(fl.r, 1e-3) : vec3(0.);
  col = col * kem + base * fc * fb * 1.35 + fc * fb * .035;
  float fr = 1. - max(dot(n, V), 0.);
  if (fr > .62 && fb > .25) col = mix(col, uRim, .5 * fb);           // линия со стороны огня
  else if (fr > .8 && mb > .9) col = mix(col, uEdge, .22);            // холодная кромка от луны
  // уголь: пятна сажи растут от обгорания
  float cn = pfNoise(vW.xz * 5.5 + vW.y * 4.7);
  if (uChar > .02 && cn < uChar * .9) col = mix(col, cChar * 1.5, .72);
  // горит: тлеющие трещины шагами
  if (uBurn > .05) {
    float e = pfNoise(vec2(vW.x * 7. + vW.z * 5., vW.y * 9.) + floor(uStep * .5) * .37);
    if (e > .74 - uBurn * .1) col = mix(col, e > .86 ? cCore : cOut, .75 * uBurn);
    else col = mix(col, cDeep, .18 * uBurn);
  }
  col += uFlash * vec3(.3, .22, .16);
  col = mix(col, uFog, fogK * .88);
  gl_FragColor = vec4(col, 1.);
}`;

// Перекрасить персонажа (Character) рисованным материалом с тушевой оболочкой. Возвращает общие униформы.
export function paintCharacter(ch, o = {}) {
  const U = { uBurn: { value: 0 }, uChar: { value: 0 }, uFlash: { value: 0 }, uLit: { value: o.lit ?? 1 },
    uHull: { value: o.hull ?? .02 }, uInk: { value: new THREE.Color(o.ink ?? '#0c0e16') }, uEdge: { value: new THREE.Color('#cfeeff') } };
  const meshes = []; ch.model.traverse((m) => { if (m.isSkinnedMesh) meshes.push(m); });
  for (const m of meshes) {
    const map = m.material.map; if (map) map.colorSpace = THREE.NoColorSpace;
    const mk = (hull) => new THREE.ShaderMaterial({ uniforms: { ...SHARED, ...U, uMap: { value: map } }, vertexShader: CH_VERT, fragmentShader: CH_FRAG,
      defines: hull ? { HULL: 1 } : {}, side: hull ? THREE.BackSide : THREE.FrontSide });
    m.material = mk(false); m.material.name = 'character';
    const h = new THREE.SkinnedMesh(m.geometry, mk(true)); h.bind(m.skeleton, m.bindMatrix);
    h.position.copy(m.position); h.quaternion.copy(m.quaternion); h.scale.copy(m.scale); h.frustumCulled = false; h.renderOrder = -1;
    m.parent.add(h);
  }
  ch.materials = [];   // Character.update не трогает emissive у этих материалов
  return U;
}

// ---------------------------------------------------------------- факел в руке
export class HeldTorch {
  // ch: Character (кость RightHand и пальцы), fire: WildFire, field: FireField
  constructor(ch, fire, field, o = {}) {
    this.ch = ch; this.fire = fire; this.field = field; this.o = { ...FM.torch, ...o };
    const hand = ch.bones.RightHand; ch.model.updateMatrixWorld(true);
    // хват по пальцам в исходной позе: древко идёт поперёк ладони, навершие со стороны большого пальца
    const bone = (n) => ch.model.getObjectByName('mixamorig' + n);
    const inv = hand.matrixWorld.clone().invert();
    const loc = (b, fb) => (b ? b.getWorldPosition(new THREE.Vector3()) : fb.clone()).applyMatrix4(inv);
    const h0 = hand.getWorldPosition(new THREE.Vector3());
    const idx = loc(bone('RightHandIndex1'), h0.clone().add(new THREE.Vector3(0, 0, .05)));
    const pin = loc(bone('RightHandPinky1'), h0.clone().add(new THREE.Vector3(0, 0, -.05)));
    const mid = loc(bone('RightHandMiddle1'), h0.clone().add(new THREE.Vector3(.08, 0, 0)));
    const axis = idx.clone().sub(pin).normalize(), palm = mid.clone().normalize();
    axis.addScaledVector(palm, .22).normalize();
    const ws = hand.getWorldScale(new THREE.Vector3()).x;
    this.group = new THREE.Group(); hand.add(this.group);
    this.group.position.copy(mid).multiplyScalar(.62);
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    this.group.scale.setScalar(1 / ws);
    // древко и навершие (обмотка паклей) — те же материалы, что у факела на шесте
    const poleG = new THREE.CylinderGeometry(.026, .032, .78, 6, 4); poleG.translate(0, .17, 0);
    this.pole = toonMesh(poleG, toonMaterial({ color: '#3e2c1a', kind: 0, name: 'wood', hull: .012 }));
    const headG = new THREE.CylinderGeometry(.058, .045, .17, 9, 2); headG.translate(0, .62, 0);
    this.head = toonMesh(headG, toonMaterial({ color: '#5a4434', kind: 1, name: 'cloth', hull: .012 }));
    this.anchor = new THREE.Object3D(); this.anchor.position.set(0, .7, 0);
    this.group.add(this.pole, this.head, this.anchor);
    this.torch = new Torch(fire, this.anchor, this.head, { size: this.o.size });
    this.tip = new THREE.Vector3(); this.swing = false;   // swing: идёт замах (шире и жарче — сбивает искры на сено и хвою)
  }
  get lit() { return this.torch.lit; }
  get on() { return this.torch.state !== 'off' && this.torch.state !== 'out'; }
  toggle() { this.torch.toggle(); }
  ignite() { if (!this.on) this.torch.ignite(); }
  douse() { if (this.on) this.torch.extinguish(); }
  update(dt) {
    this.torch.update(dt);
    this.anchor.getWorldPosition(this.tip);
    // горящий факел поджигает то, к чему поднесён (сено, хвоя, трава, доски)
    if (this.lit) { const b = this.swing ? this.o.swingBoost : 1; this.field.warm(this.tip, this.o.reach * (this.swing ? 1.3 : 1), this.o.heatRate * b, dt); }
    // погасший факел занимается от огня рядом
    else if (!this.on && this.field.heat(this.tip.x, this.tip.y, this.tip.z, .7) > this.o.catchHeat) this.torch.ignite();
  }
}

// ---------------------------------------------------------------- горящее тело
const BODY_PTS = [['Head', .9, .05], ['Spine2', 1.15, 0], ['Spine', .9, .07], ['RightArm', .7, .1], ['LeftArm', .7, .1],
  ['RightForeArm', .65, .03], ['LeftForeArm', .65, .03], ['Hips', .8, 0], ['RightUpLeg', .55, .06], ['LeftUpLeg', .55, .06]];
export class BodyFire {
  constructor(ch, fire, field, o = {}) {
    this.ch = ch; this.fire = fire; this.field = field; this.o = { size: 1, ...o };
    this.t = 0; this.k = 0; this.U = null; this.char = 0;
    this.pts = BODY_PTS.map(([b, s, off], i) => ({ b: ch.bones[b], s, off, f: { seed: .07 + i * .113, x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, w: 0, h: 0, amt: 1 } })).filter((p) => p.b);
    this.feet = ['LeftFoot', 'RightFoot', 'LeftHand', 'RightHand'].map((n) => ch.bones[n] || ch.model.getObjectByName('mixamorig' + n)).filter(Boolean);
    this.light = { x: 0, y: 0, z: 0, i: 0, r: 6 }; this.aura = { p: new THREE.Vector3(), r: 0, i: 0 };
    this.vel = new THREE.Vector3(); this._last = null;
  }
  get burning() { return this.t > 0; }
  ignite(dur) { this.t = Math.max(this.t, dur); }
  douse() { this.t = 0; }
  update(dt) {
    const F = this.fire;
    const remove = (x) => { for (const arr of [F.extraFlames, F.extraLights, F.extraAura]) { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); } };
    for (const p of this.pts) remove(p.f); remove(this.light); remove(this.aura);
    const pos = this.ch.position; if (this._last) this.vel.subVectors(pos, this._last).divideScalar(Math.max(dt, 1e-3)); this._last = (this._last ?? new THREE.Vector3()).copy(pos);
    this.t = Math.max(0, this.t - dt);
    // сила ступенями: занимается за 3 шага, гаснет за 3 шага
    const target = this.t > 0 ? Math.min(1, this.t / .6) : 0;
    this.k += Math.sign(target - this.k) * Math.min(Math.abs(target - this.k), dt * 4);
    const k = Math.ceil(this.k * 4) / 4;
    if (this.k > .02) this.char = Math.min(.85, this.char + dt * .05);
    if (this.U) { this.U.uBurn.value = k; this.U.uChar.value = this.char; }
    if (k <= 0) return;
    const W = F.wind, S = this.o.size, st = F.step;
    const vx = -this.vel.x * .22, vz = -this.vel.z * .22;   // на бегу языки отлетают назад
    let cx = 0, cy = 0, cz = 0;
    for (const p of this.pts) {
      p.b.getWorldPosition(_v); const f = p.f;
      const fk = .8 + .4 * hash(f.seed * 50 + st * .41);
      const h = S * k * p.s * .62 * fk, w = h * .58;
      f.x = _v.x + (hash(f.seed * 7) - .5) * p.off * 2; f.y = _v.y - .06; f.z = _v.z + (hash(f.seed * 9) - .5) * p.off * 2;
      f.w = w; f.h = h; f.amt = k;
      const lean = W.cur * 1.3, tb = (hash(f.seed * 9 + st * .3) - .5) * .3;
      f.lx = W.dir.x * lean + vx + tb; f.ly = 0; f.lz = W.dir.z * lean + vz - tb;
      F.extraFlames.push(f); cx += _v.x; cy += _v.y; cz += _v.z;
    }
    const n = this.pts.length; cx /= n; cy /= n; cz /= n;
    this.light.x = cx; this.light.y = cy + .4; this.light.z = cz; this.light.i = 1.6 * k; this.light.r = 7 * S; F.extraLights.unshift(this.light);
    this.aura.p.set(cx, cy, cz); this.aura.r = 1.1 * S * k; this.aura.i = .9 * k; F.extraAura.push(this.aura);
    if (Math.random() < dt * 9 * k) F._spark(_w.set(cx, cy + .3, cz), .7, .85);
    if (Math.random() < dt * 2.5 * k) F._puff(_w.set(cx + W.dir.x * .3, cy + 1.1 * S, cz + W.dir.z * .3), 0, .16);
    if (Math.random() < dt * 1.8 * k) F._mark(Math.random() < .5 ? 'flick' : 'rise', _w.set(cx + (Math.random() - .5) * .5, cy + .8 * S, cz), .22, Math.random() < .5 ? FIRE.hot : FIRE.ink, .35);
    // горящее тело поджигает траву и всё, к чему прикасается
    for (const b of this.feet) { b.getWorldPosition(_v); this.field.warm(_v, FM.body.reach, FM.body.heatRate * k, dt); }
  }
}
const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- падение горящего дерева
// trunk: объект огня (addObject с phys topple); crowns: объекты крон (дети ствола).
// Падает по ветру, ложится на крону (без провала в землю), бьёт того, на кого упал.
export class TreeFall {
  constructor(fire, trunk, crowns, H) { this.fire = fire; this.trunk = trunk; this.crowns = crowns; this.H = H; this.hit = new Set(); this.landed = false; }
  reset() { this.hit.clear(); this.landed = false; }
  // до вызова fire.update: направление падения — по ветру (чуть в сторону от огня у корня)
  pre() {
    const t = this.trunk; if (t.moving || t.fallen) return;
    const W = this.fire.wind; if (W.cur > .05) t.phys.dir.set(W.dir.x, 0, W.dir.z).normalize();
  }
  // после fire.update: кроны следуют за стволом; остановить, когда крона коснулась земли
  post(onHit) {
    const t = this.trunk; if (!t.fallen || this.landed) return;
    const F = this.fire;
    const sync = () => { t.mesh.updateMatrixWorld(true); for (const c of this.crowns) { F._cacheVerts(c); F._updateNodeWorld(c); } };
    sync();
    let minY = 0; for (const c of this.crowns) { const W = c.wpos, ch = c.mesh.geometry.attributes.aChar.array; for (let i = 0; i < W.length / 3; i++) if (ch[i] < .9) minY = Math.min(minY, W[i * 3 + 1]); }
    if (minY < -.06) {
      const axis = _v.set(0, 1, 0).cross(t.phys.dir).normalize();
      let guard = 0;
      while (minY < -.06 && t.theta > .05 && guard++ < 40) {
        t.theta -= .02; t.mesh.quaternion.copy(t.init.q).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, t.theta)); sync();
        minY = 0; for (const c of this.crowns) { const W = c.wpos, ch = c.mesh.geometry.attributes.aChar.array; for (let i = 0; i < W.length / 3; i++) if (ch[i] < .9) minY = Math.min(minY, W[i * 3 + 1]); }
      }
      t.thDot = 0; t.moving = false; this.landed = true; F._cacheVerts(t); F._updateNodeWorld(t);
      const top = this.top(); for (let k = 0; k < 10; k++) F._spark(top, 1.6, .8); F._puff(top, 0, .6); F._puff(_w.copy(top).lerp(t.mesh.position, .5), 0, .5);
    } else if (!t.moving) this.landed = true;
    // удар падающего ствола
    if (t.moving && t.theta > .35 && onHit) onHit(this);
  }
  top(out = new THREE.Vector3()) { return out.set(0, this.H, 0).applyQuaternion(this.trunk.mesh.quaternion).add(this.trunk.mesh.position); }
  // расстояние от точки (по земле) до ствола
  distXZ(p) {
    const a = this.trunk.mesh.position, b = this.top(_w);
    const abx = b.x - a.x, abz = b.z - a.z, L2 = abx * abx + abz * abz + 1e-6;
    const s = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / L2));
    return Math.hypot(p.x - a.x - abx * s, p.z - a.z - abz * s);
  }
}
