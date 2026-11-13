// «Рука по стене»: процедурное касание стены кистью (по разбору видео «Procedural Hands on Wall»).
// Схема как в Unity Animation Rigging (Two Bone IK Constraint + луч от плеча), только своим кодом:
//  1. От плеча каждой руки веером бьют горизонтальные лучи вбок (и чуть вперёд) в стены.
//  2. Если стена ближе досягаемости руки и почти вертикальна, вес касания плавно растёт 0 → 1.
//  3. Цель кисти: точка на стене чуть впереди плеча (луч-«щуп» по нормали стены), ладонь в сантиметре от поверхности.
//     Цель скользит за героем (режим «скольжение») или ладонь стоит и перехватывается шагами (режим «перехват»).
//  4. Двухзвенный IK (плечо → предплечье → кисть) с полюсом локтя вниз-назад, ладонь разворачивается к стене,
//     пальцы вперёд-вверх; корпус чуть наклоняется к стене, голова косится на руку.
//  5. Нет стены (проём, конец забора, бег) — вес плавно уходит в 0, рука возвращается в анимацию.
// Хост даёт: Character (кости mixamo), список мешей стен, скорость героя. Вызывать после анимации и IK стоп.
import * as THREE from 'three';
import { twoBone, turnWorld, setWorldQuat } from './ik.js';

export const WALL_DEFAULTS = {
  enabled: true,
  reachK: 0.92,      // доля длины руки, на которой стена «досягаема» (вход)
  releaseK: 1.02,    // выход (гистерезис)
  height: -0.12,     // высота ладони от плечевого сустава, м (на рост 1,53; рука богатыря всего ~0,40 м)
  lead: 0.15,        // насколько впереди плеча ладонь при ходьбе, м
  leadIdle: 0.07,    // стоя
  palm: 0.028,       // зазор ладонь-стена, м
  blendIn: 0.32,     // с, рука тянется к стене
  blendOut: 0.24,    // с, рука уходит
  follow: 16,        // жёсткость следования цели (скольжение)
  mode: 'slide',     // 'slide' скольжение | 'step' перехват
  stepLen: 0.42,     // перехват: ладонь отстала на столько → новый шаг рукой
  stepTime: 0.22,
  lean: 4.5,         // наклон корпуса к стене, град.
  look: 0.35,        // взгляд на руку
  maxSpeed: 2.7,     // на беге не касается
  fan: [-12, 8, 26, 44], // веер лучей от «вбок» к «вперёд», град.
  bothHands: true,
};

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _o = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
const smooth = (x) => x * x * (3 - 2 * x);

export class WallTouch {
  constructor(ch, colliders, opts = {}) {
    this.ch = ch;
    this.colliders = colliders;
    this.o = { ...WALL_DEFAULTS, ...opts };
    this.ray = new THREE.Raycaster();
    this.ray.firstHitOnly = true;
    const B = (n) => ch.model.getObjectByName('mixamorig' + n);
    this.spine = B('Spine1'); this.neck = B('Neck');
    ch.model.updateMatrixWorld(true);
    this.sides = ['Left', 'Right'].map((s) => {
      const S = {
        s, sign: s === 'Left' ? 1 : -1,
        clav: B(s + 'Shoulder'), arm: B(s + 'Arm'), fore: B(s + 'ForeArm'), hand: B(s + 'Hand'),
        w: 0, wT: 0, miss: 0, have: false,
        tgt: new THREE.Vector3(), n: new THREE.Vector3(), surf: new THREE.Vector3(), dist: 9,
        plant: new THREE.Vector3(), from: new THREE.Vector3(), stepT: 1, slide: 0, prev: new THREE.Vector3(),
        rays: [],
      };
      const p = (b) => b.getWorldPosition(new THREE.Vector3());
      S.la = p(S.arm).distanceTo(p(S.fore)); S.lb = p(S.fore).distanceTo(p(S.hand));
      // оси ладони в системе кости кисти: пальцы (к среднему пальцу) и нормаль ладони (наружу от ладони)
      const hq = S.hand.getWorldQuaternion(new THREE.Quaternion()).invert();
      const finger = p(B(s + 'HandMiddle1')).sub(p(S.hand)).normalize();
      const lat = p(B(s + 'HandIndex1')).sub(p(B(s + 'HandPinky1'))).normalize();
      const palm = s === 'Left' ? new THREE.Vector3().crossVectors(finger, lat) : new THREE.Vector3().crossVectors(lat, finger);
      palm.addScaledVector(finger, -palm.dot(finger)).normalize();
      S.fL = finger.applyQuaternion(hq).normalize();
      S.pL = palm.applyQuaternion(hq).normalize();
      // базис покоя кисти: (пальцы, ладонь, третья ось) → для поворота «ладонью к стене»
      const x = S.fL, y = S.pL, z = new THREE.Vector3().crossVectors(x, y);
      S.restBasisInv = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(x, y, z)).invert();
      return S;
    });
    this.debug = null;
  }

  get scale() { return this.ch.height / 1.53; }

  // направление «вбок» для стороны (левая рука смотрит на +X модели)
  sideDir(S, out) { const y = this.ch.yaw; return out.set(Math.cos(y) * S.sign, 0, -Math.sin(y) * S.sign); }
  fwdDir(out) { const y = this.ch.yaw; return out.set(Math.sin(y), 0, Math.cos(y)); }

  cast(origin, dir, far) {
    this.ray.set(origin, dir); this.ray.far = far; this.ray.near = 0;
    const h = this.ray.intersectObjects(this.colliders, true);
    for (const x of h) {
      if (!x.face) continue;
      const n = x.face.normal.clone().transformDirection(x.object.matrixWorld);
      if (n.dot(dir) > 0) n.negate();
      if (Math.abs(n.y) > 0.55) continue;      // пол, крыша, верх бревна
      return { p: x.point.clone(), n, d: x.distance };
    }
    return null;
  }

  // dt, горизонтальная скорость героя (м/с)
  update(dt, speed) {
    const o = this.o, ch = this.ch, s = this.scale;
    const fwd = this.fwdDir(new THREE.Vector3());
    const moving = Math.min(1, speed / 0.8);
    for (const S of this.sides) {
      S.rays.length = 0;
      const reach = (S.la + S.lb);
      const sh = S.arm.getWorldPosition(new THREE.Vector3());
      const origin = _o.copy(sh); origin.y += o.height * s;
      const side = this.sideDir(S, new THREE.Vector3());
      // 1. веер лучей вбок
      let best = null;
      for (const ang of o.fan) {
        const a = THREE.MathUtils.degToRad(ang);
        const dir = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(fwd, Math.sin(a)).normalize();
        const h = this.cast(origin, dir, reach * 1.25);
        S.rays.push({ o: origin.clone(), e: h ? h.p : origin.clone().addScaledVector(dir, reach * 1.25), hit: !!h });
        if (h && (!best || h.d < best.d)) best = h;
      }
      S.dist = best ? best.d : 9;
      // 2. вход/выход с гистерезисом; на беге и спиной к стене не касаемся
      let want = false;
      if (o.enabled && best && speed < o.maxSpeed) {
        const lim = (S.wT > 0 ? o.releaseK : o.reachK) * reach;
        const facingWall = fwd.dot(best.n) < -0.75;            // идёт прямо в стену: рукой не ведём
        want = best.d < lim && !facingWall;
      }
      // 3. «щуп»: точка на стене чуть впереди плеча, по нормали стены
      let surf = null;
      if (want) {
        const n = best.n;
        const lead = THREE.MathUtils.lerp(o.leadIdle, o.lead, moving) * s;
        const P = _a.copy(origin).addScaledVector(fwd.clone().addScaledVector(n, -fwd.dot(n)).normalize(), lead);
        const probe = this.cast(_b.copy(P).addScaledVector(n, 0.35 * s), _c.copy(n).negate(), reach * 1.4 + 0.35 * s);
        if (probe && probe.p.distanceTo(sh) < reach * 1.08) surf = probe; // чуть далеко: IK дотянет сколько сможет
      }
      if (surf) { S.miss = 0; } else S.miss += dt;
      const on = !!surf || (S.wT > 0 && S.miss < 0.12);
      S.wT = on ? 1 : 0;
      S.w += (S.wT > S.w ? dt / o.blendIn : -dt / o.blendOut);
      S.w = THREE.MathUtils.clamp(S.w, 0, 1);
      if (surf) {
        S.n.lerp(surf.n, S.have ? 1 - Math.exp(-dt * 14) : 1).normalize();
        S.surf.copy(surf.p).addScaledVector(surf.n, o.palm * s);
        if (!S.have) { S.tgt.copy(S.surf); S.plant.copy(S.surf); S.stepT = 1; S.have = true; }
      }
      if (S.w <= 0) { S.have = false; continue; }
      // 4. движение цели
      S.prev.copy(S.tgt);
      if (o.mode === 'step') {
        if (S.stepT >= 1) {
          if (S.plant.distanceTo(S.surf) > o.stepLen * s * (0.4 + 0.6 * moving) || S.wT === 0 && false) {
            S.from.copy(S.plant); S.plant.copy(S.surf).addScaledVector(fwd, 0.08 * s); S.stepT = 0;
          }
          S.tgt.copy(S.plant);
        } else {
          S.stepT = Math.min(1, S.stepT + dt / o.stepTime);
          const k = smooth(S.stepT);
          S.tgt.lerpVectors(S.from, S.plant, k).addScaledVector(S.n, Math.sin(Math.PI * S.stepT) * 0.07 * s);
          S.tgt.y += Math.sin(Math.PI * S.stepT) * 0.03 * s;
        }
      } else {
        S.tgt.lerp(S.surf, 1 - Math.exp(-dt * o.follow));
      }
      S.slide = S.prev.distanceTo(S.tgt) / Math.max(dt, 1e-4);
    }
    // 5. поза: корпус и взгляд, потом руки
    const act = this.sides.filter((S) => S.w > 0.001);
    if (!act.length) return;
    let lean = 0, look = null, wl = 0;
    for (const S of act) {
      const w = smooth(S.w);
      lean += S.sign * w; if (w > wl) { wl = w; look = S; }
    }
    if (o.lean && this.spine) {
      const side = this.sideDir(this.sides[0], _d); // +X героя
      const tilt = THREE.MathUtils.degToRad(o.lean) * THREE.MathUtils.clamp(lean, -1, 1);
      _q.setFromUnitVectors(UP, _a.copy(UP).addScaledVector(side, Math.tan(tilt)).normalize());
      turnWorld(this.spine, _q);
    }
    if (o.look && this.neck && look) {
      const nk = this.neck.getWorldPosition(_a);
      const to = _b.copy(look.tgt).sub(nk); to.y = 0; to.normalize();
      const f = this.fwdDir(_c);
      _q.setFromUnitVectors(f, to); _q.slerp(_q2.identity(), 1 - o.look * smooth(look.w) * 0.6);
      turnWorld(this.neck, _q);
    }
    for (const S of act) {
      const w = smooth(S.w);
      const sh = S.arm.getWorldPosition(_a);
      // ладонь к стене, пальцы вперёд и вверх вдоль стены
      const palmW = _c.copy(S.n).negate();
      const fingerW = _d.copy(fwd).multiplyScalar(0.62).addScaledVector(UP, 0.78);
      fingerW.addScaledVector(palmW, -fingerW.dot(palmW)).normalize();
      // цель — центр ладони; запястье (кость кисти) ниже по пальцам и чуть от стены
      S.wrist = (S.wrist || new THREE.Vector3()).copy(S.tgt).addScaledVector(fingerW, -0.075 * s).addScaledVector(S.n, 0.018 * s);
      // локоть вниз-назад и чуть от стены
      const pole = _b.copy(sh).addScaledVector(UP, -0.55 * s).addScaledVector(fwd, -0.4 * s).addScaledVector(S.n, 0.15 * s);
      twoBone(S.arm, S.fore, S.hand, S.wrist, pole, w);
      const zW = new THREE.Vector3().crossVectors(fingerW, palmW);
      _q.setFromRotationMatrix(_m.makeBasis(fingerW, palmW, zW)).multiply(S.restBasisInv);
      S.hand.getWorldQuaternion(_q2);
      _q2.slerp(_q, w);
      setWorldQuat(S.hand, _q2);
    }
  }

  state() {
    return this.sides.map((S) => ({ side: S.s, w: S.w, dist: S.dist, slide: S.slide, tgt: S.tgt, n: S.n, rays: S.rays }));
  }
}
