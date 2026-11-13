// Богатырь: загрузка bogatyr.glb (Mixamo), toon-материал с контровым светом, управление, реакции на окружение.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Character } from '../lib/character.js';
import { WeaponRig } from '../lib/weapons.js';
import { pose } from '../lib/pose.js';
import { toonMat, U } from './core.js';
import { heightAt, zoneAt, softAt, roadDist, lightAt, WATER_Y, FIRE, HALF } from './terrain.js';
import { clamp, lerp, smooth } from './kit.js';

export async function loadBogatyr(url, onProgress) {
  const loader = new GLTFLoader();
  try {
    return await new Promise((res, rej) => loader.load(url, res, (e) => onProgress && e.total && onProgress(e.loaded / e.total), rej));
  } catch (e) {
    // запасной путь: та же модель, зашитая в модуль (base64)
    console.warn('модель не загрузилась по ссылке, берём встроенную', e);
    const b64 = (await import('./model_b64.js')).default;
    const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return await new Promise((res, rej) => loader.parse(buf.buffer, '', res, rej));
  }
}

// заменить материалы персонажа на toon (с текстурой) и вернуть список
export function toonify(ch, { rim = 1.1, flat = null } = {}) {
  const mats = [];
  ch.model.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    let m;
    if (flat) {
      m = toonMat({ color: 0xffffff, side: THREE.DoubleSide }, { rim, tint: true });
      m.userData.flat = flat;
      m.onBeforeCompile = ((orig) => (sh) => {
        orig(sh);
        sh.uniforms.uLegs = { value: new THREE.Color(flat.legs) }; sh.uniforms.uCoat = { value: new THREE.Color(flat.coat) }; sh.uniforms.uSkin = { value: new THREE.Color(flat.skin) };
        sh.uniforms.uBox = { value: new THREE.Vector2(flat.minY, flat.maxY) };
        sh.vertexShader = 'varying float vBY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vBY = position.y;');
        sh.fragmentShader = 'varying float vBY; uniform vec3 uLegs, uCoat, uSkin; uniform vec2 uBox;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          { float hy = (vBY - uBox.x) / (uBox.y - uBox.x);
            vec3 cc = mix(uLegs, uCoat, smoothstep(0.46, 0.5, hy));
            cc = mix(cc, uSkin, smoothstep(0.84, 0.865, hy));
            cc = mix(cc, uLegs * 0.6, smoothstep(0.5, 0.485, hy) * smoothstep(0.43, 0.45, hy) * 0.8);
            diffuseColor.rgb = cc; }`);
      })(m.onBeforeCompile);
    } else {
      m = toonMat({ map: old.map, color: 0xffffff, side: THREE.DoubleSide }, { rim, tint: true });
      if (old.map) old.map.colorSpace = THREE.SRGBColorSpace;
    }
    m.emissive = new THREE.Color(0); m.emissiveIntensity = 1;
    o.material = m; o.castShadow = true; o.receiveShadow = true;
    mats.push(m);
  });
  ch.materials = mats;
  return mats;
}

const SIT = { Spine: [4, 0, 0], Spine1: [3, 0, 0], RightUpLeg: [-82, -4, -3], LeftUpLeg: [-82, 4, 3], RightLeg: [84, 0, 0], LeftLeg: [84, 0, 0], RightArm: [18, 0, -3], LeftArm: [18, 0, 3], RightForeArm: [-52, 0, 0], LeftForeArm: [-52, 0, 0], Head: [-4, 0, 0] };
const SIT_POSE = () => pose(SIT);
export class Hero {
  constructor(gltf, world, fx, { flat = null, height = 1.85, isHero = true, name = 'Богатырь' } = {}) {
    this.world = world; this.fx = fx; this.isHero = isHero; this.name = name;
    let g2 = gltf;
    if (!isHero) {
      // клон исходной модели: сбросить масштаб и сдвиг героя, иначе рост считается от уже увеличенной модели
      const sc = SkeletonUtils.clone(gltf.scene); sc.scale.set(1, 1, 1); sc.position.set(0, 0, 0); sc.quaternion.identity(); sc.updateMatrixWorld(true);
      g2 = { scene: sc, animations: gltf.animations, parser: gltf.parser };
    }
    this.ch = new Character(g2, { height, name });
    if (flat) {
      // нормированная высота по ограничивающему боксу позы покоя (в единицах позиции вершин)
      const box = new THREE.Box3();
      this.ch.model.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox); } });
      flat.minY = box.min.y; flat.maxY = box.max.y;
    }
    toonify(this.ch, { rim: isHero ? 1.15 : 0.7, flat });
    this.rig = new WeaponRig(this.ch, new THREE.Group(), new THREE.Group());
    this.item = null; this.itemMul = 1;
    this.pos = this.ch.group.position; this.yaw = 0; this.vel = new THREE.Vector2(); this.vy = 0; this.grounded = true;
    this.speed = 0; this.stepDist = 0; this.stepSide = 1;
    this.act = null; this.locked = false;
    this.shade = 0; this.fire = 0; this.tintMul = new THREE.Color(1, 1, 1); this.tintAdd = new THREE.Color(0, 0, 0); this.rimK = 1;
    this.inWater = false; this.onRoad = false;
    this.input = { x: 0, z: 0, run: false };
    this.trSlot = 0;
    this.carry = null; // 'hang' предметы
    this.sit = null; this.pose = null;
    this.ch.group.updateMatrixWorld(true);
    { const v = new THREE.Vector3(); this.ch.bones.Hips.getWorldPosition(v); this.hipH = v.y - this.ch.group.position.y; }
  }
  // сесть на сиденье высотой seatY; поза ног накладывается поверх Idle
  sitDown(seatY, yaw) { this.sit = { y: seatY }; this.yaw = yaw; this.ch.yaw = yaw; this.pose = SIT_POSE(); this.vel.set(0, 0); this.ai = { mx: 0, mz: 0 }; }
  standUp() { this.sit = null; this.pose = null; }
  get group() { return this.ch.group; }
  teleport(x, z, yaw = 0) { this.pos.set(x, heightAt(x, z), z); this.yaw = yaw; this.ch.yaw = yaw; this.vel.set(0, 0); this.act = null; this.ch.stopAll(0.01); }
  equip(item) {
    if (this.item && this.item.parent) this.item.parent.remove(this.item);
    this.item = item;
    if (item) { this.rig.sword = item; this.world.group.parent.add(item); }
  }
  // сыграть одноразовый клип по времени игры: dur — длительность, keys — [[tGame, tClip]] (по умолчанию линейно)
  playAct(name, { rate = 1, from = 0, to = null, events = [], onEnd = null, fade = 0.15, lock = false, hold = false } = {}) {
    const h = this.ch.play(name, fade);
    const dur = h.duration; const end = to ?? dur;
    this.act = { h, name, t: from, end, rate, events: events.map((e) => ({ ...e, done: from > e.t })), onEnd, lock, hold, dur: (end - from) / rate };
    this.ch.setTime(h, from);
    return this.act;
  }
  cancelAct() { if (this.act) { this.ch.stop(this.act.h, 0.2); this.act = null; } }
  update(dt, camYaw, t) {
    const world = this.world, ch = this.ch, inp = this.input;
    // ---- движение
    let mx = 0, mz = 0;
    const busy = this.locked || (this.act && this.act.lock);
    if (this.ai) { mx = this.ai.mx; mz = this.ai.mz; }
    else if (!busy && this.isHero) {
      const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
      mx = fx * inp.z + rx * inp.x; mz = fz * inp.z + rz * inp.x;
      const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    }
    const want = Math.hypot(mx, mz);
    this.inWater = heightAt(this.pos.x, this.pos.z) < WATER_Y - 0.03 && this.grounded;
    const base = (inp.run ? ch.runSpeed * 0.95 : ch.walkSpeed * 1.05) * (this.speedK || 1);
    let target = want * base * (this.inWater ? 0.62 : 1);
    const cur = this.vel.length();
    const nv = lerp(cur, target, 1 - Math.exp(-dt * (target > cur ? 7 : 10)));
    if (want > 0.05) {
      const tyaw = Math.atan2(mx, mz);
      let d = tyaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-dt * 11));
      this.vel.set(Math.sin(tyaw), Math.cos(tyaw)).multiplyScalar(nv);
    } else this.vel.multiplyScalar(nv / Math.max(cur, 1e-4) || 0);
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.y * dt;
    if (this.sit) { nx = this.pos.x; nz = this.pos.z; } else [nx, nz] = world.collide(nx, nz, this.radius || 0.34, this.extraColliders || []);
    nx = clamp(nx, -HALF + 0.5, HALF - 0.5); nz = clamp(nz, -HALF + 0.5, HALF - 0.5);
    if (heightAt(nx, nz) < -0.56 && this.grounded) { // глубоко: не заходим
      if (heightAt(nx, this.pos.z) >= -0.56) nz = this.pos.z; else if (heightAt(this.pos.x, nz) >= -0.56) nx = this.pos.x; else { nx = this.pos.x; nz = this.pos.z; }
    }
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx; this.pos.z = nz;
    this.speed = moved / Math.max(dt, 1e-4);
    // ---- высота и прыжок
    let gy = heightAt(this.pos.x, this.pos.z); { const fl = world.floorAt(this.pos.x, this.pos.z); if (fl != null) gy = Math.max(gy, fl); }
    if (this.sit) { gy = this.sit.y + 0.11 - this.hipH; this.pos.y = gy; }
    else if (this.grounded) { this.pos.y = lerp(this.pos.y, gy, 1 - Math.exp(-dt * 18)); if (Math.abs(this.pos.y - gy) < 0.01) this.pos.y = gy; }
    else { this.vy -= 11 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gy) { this.pos.y = gy; this.grounded = true; this.vy = 0; this.landed(); } }
    // ---- анимация
    ch.yaw = this.yaw;
    ch.setSpeed(this.speed, false);
    if (this.act) {
      const a = this.act; a.t += dt * a.rate;
      for (const e of a.events) if (!e.done && a.t >= e.t) { e.done = true; e.fn && e.fn(); }
      this.ch.setTime(a.h, a.t);
      if (a.t >= a.end - 1e-3) { const cb = a.onEnd; this.ch.stop(a.h, a.hold ? 0.01 : 0.25); this.act = null; cb && cb(); }
    }
    ch.group.updateMatrixWorld(true);
    ch.update(dt, this.pose);
    if (this.item) {
      this.rig.sword = this.item; this.rig.update(null);
      this.item.visible = true;
    }
    // ---- реакции на среду
    this.fxStep(dt, t);
    this.tint(dt);
    // трава приминается от ног (слот 0 — у героя)
    const tr = U.uTr.value[this.trSlot];
    tr.set(this.pos.x, this.pos.z, this.isHero ? 1.15 : 0.85, clamp(this.speed / 2, 0, 1));
  }
  landed() {
    if (this.act && this.act.name === 'Jump') { /* клип доиграет сам */ }
    if (heightAt(this.pos.x, this.pos.z) < WATER_Y) this.fx.splash(this.pos.x, this.pos.z, 1.5);
    else this.fx.dust(this.pos.x, this.pos.y, this.pos.z, 0, 0, 4);
  }
  jump() {
    if (!this.grounded || this.locked || (this.act && this.act.lock)) return;
    this.grounded = false; this.vy = 4.4;
    this.playAct('Jump', { rate: 1.25, from: 0.36, to: 1.45, onEnd: null });
  }
  fxStep(dt, t) {
    const x = this.pos.x, z = this.pos.z, fx = this.fx;
    const inW = heightAt(x, z) < WATER_Y;
    if (this.speed > 0.2 && this.grounded) {
      this.stepDist += this.speed * dt;
      const stride = this.speed > this.ch.walkSpeed * 1.5 ? 1.05 : 0.72;
      if (this.stepDist > stride) {
        this.stepDist = 0; this.stepSide *= -1;
        const sx = x + Math.cos(this.yaw) * 0.13 * this.stepSide, sz = z - Math.sin(this.yaw) * 0.13 * this.stepSide;
        const gy = heightAt(sx, sz);
        if (inW) fx.splash(sx, sz, this.speed > 2 ? 1.1 : 0.7);
        else {
          const soft = softAt(sx, sz);
          if (soft > 0.5 && this.isHero) fx.print(sx, gy, sz, this.yaw, this.stepSide);
          const rd = roadDist(sx, sz) < 1.5;
          if (rd && Math.abs(sx) < 33) fx.dust(sx, gy, sz, this.vel.x, this.vel.y, this.speed > 2 ? 4 : 2, 0x9a8c68);
          else if (soft > 0.5) fx.dust(sx, gy, sz, this.vel.x, this.vel.y, 1, 0x3c3226);
        }
      }
    } else this.stepDist = 0;
    this.onRoad = roadDist(x, z) < 1.4; this.inWater = inW && this.grounded;
    if (this.inWater && this.speed < 0.15 && Math.random() < dt * 0.9) fx.ring(x + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 0.4, 0.8, 1.6);
  }
  tint(dt) {
    const L = lightAt(this.pos.x, this.pos.z, this.world.treeCircles);
    this.shade = lerp(this.shade, L.shade, 1 - Math.exp(-dt * 4)); this.fire = lerp(this.fire, L.fire, 1 - Math.exp(-dt * 4));
    const s = this.shade, f = this.fire;
    // свет: чуть светлее и холоднее; тень: тёмная сине-зелёная; костёр: тёплый
    const mul = new THREE.Color(1.5, 1.55, 1.5).lerp(new THREE.Color(0.7, 0.9, 1.25), s).lerp(new THREE.Color(1.4, 1.05, 0.8), f * 0.8);
    const add = new THREE.Color(0, 0.004, 0.004).lerp(new THREE.Color(0.0, 0.012, 0.03), s).lerp(new THREE.Color(0.07, 0.025, 0.0), f * 0.8);
    const rim = lerp(1.3, 0.45, s) * (1 - f * 0.4);
    for (const m of this.ch.materials) { const u = m.userData.uni; u.uMul.value.copy(mul); u.uAdd.value.copy(add); u.uRimK.value = rim * (this.isHero ? 1 : 0.6); }
    this.tintMul.copy(mul);
  }
}
