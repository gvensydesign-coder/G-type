// Виды превращения Лешего. Каждый сценарий — набор функций времени t (детерминированно, таймлайн мотается):
//   tau(t)     — «время превращения» классики (0 тело … TAU_HOLD всё в вихре): распад, когда растёт, сборка, когда убывает;
//   center(t)  — путь вихря, dir(t) — куда он летит; fk/lineK/endK — сжатие в клубок, вытягивание ауры в линию, рассеивание;
//   leshy(t)   — где стоит тело и как двигается (переставляется, пока всё в вихре);
//   hero(t)    — богатырь (только в захвате), cam(t, view) — камера.
// Листья, ленты и аура берут всё из одного ведущего (LeafVortex.state), как в «Улёте».
import * as THREE from 'three';
import { T, TAU_HOLD, ramp } from './leafvortex.js';
import { pose, blend, stack } from './pose.js';

const V3 = THREE.Vector3;
const bump = (t, a, b, c, d) => ramp(t, a, b) - ramp(t, c, d);
const lerp = THREE.MathUtils.lerp;
const yawOf = (dx, dz) => Math.atan2(dx, dz);

// ломаная с длиной дуги; за концами продолжается по касательной
export class Path {
  constructor(pts) {
    this.p = pts; this.c = [0];
    for (let i = 1; i < pts.length; i++) this.c.push(this.c[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.len = this.c[this.c.length - 1];
  }
  at(s, out = new V3(), tan) {
    const p = this.p, c = this.c, n = p.length;
    let i;
    if (s <= 0) i = 0; else if (s >= this.len) i = n - 2;
    else { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; } i = lo; }
    this._i = i;
    const seg = c[i + 1] - c[i] || 1e-6, f = (s - c[i]) / seg;
    out.copy(p[i]).lerp(p[i + 1], f);
    if (tan) tan.subVectors(p[i + 1], p[i]).setY(0).normalize();
    return out;
  }
  // то же, но касательная в 3D (для змеи, которая спускается с неба)
  at3(s, out, tan) {
    this.at(s, out);
    const i = this._i;
    if (tan) tan.subVectors(this.p[i + 1], this.p[i]).normalize();
    return out;
  }
}

// Катмулл-Ром через опорные точки, равномерно по 0,1 м
function smoothPath(ctrl) {
  const out = [];
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const steps = Math.max(2, Math.ceil(p1.distanceTo(p2) / 0.1));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push(new V3(f(p0.x, p1.x, p2.x, p3.x), 0, f(p0.z, p1.z, p2.z, p3.z)));
    }
  }
  out.push(ctrl[ctrl.length - 1].clone());
  return new Path(out);
}

// путь сквозь лес: A* по сетке 0,5 м, держится в просветах между стволами и петляет «змейкой»
export function forestPath(solids, from, to) {
  const trees = solids.filter((s) => s.kind === 'circle');
  const x0 = Math.min(from.x, to.x) - 7, x1 = Math.max(from.x, to.x) + 7, z0 = Math.min(from.z, to.z) - 7, z1 = Math.max(from.z, to.z) + 7;
  const h = 0.5, W = Math.ceil((x1 - x0) / h) + 1, H = Math.ceil((z1 - z0) / h) + 1;
  const cost = new Float32Array(W * H);
  const L = from.distanceTo(to), dx = (to.x - from.x) / L, dz = (to.z - from.z) / L;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = x0 + i * h, z = z0 + j * h;
    let clear = 9;
    for (const t of trees) clear = Math.min(clear, Math.hypot(x - t.x, z - t.z) - t.r);
    // змейка: волна поперёк прямой, гаснет к поляне
    const u = ((x - from.x) * dx + (z - from.z) * dz), side = (x - from.x) * -dz + (z - from.z) * dx;
    const fade = Math.max(0, Math.min(1, (L - u) / 6));
    const want = Math.sin(u / 7.5 * Math.PI * 2) * 2.2 * fade;
    cost[j * W + i] = clear < 0.85 ? Infinity : 1 + 3.5 * Math.exp(-(clear - 0.85) / 0.6) + 0.18 * (side - want) ** 2;
  }
  const id = (p) => Math.round((p.z - z0) / h) * W + Math.round((p.x - x0) / h);
  const s = id(from), g = id(to);
  const dist = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), done = new Uint8Array(W * H);
  dist[s] = 0;
  const open = [s];
  const hx = (k) => Math.hypot((k % W) - (g % W), Math.floor(k / W) - Math.floor(g / W)) * h;
  while (open.length) {
    let bi = 0, bv = Infinity;
    for (let q = 0; q < open.length; q++) { const v = dist[open[q]] + hx(open[q]); if (v < bv) { bv = v; bi = q; } }
    const k = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (done[k]) continue; done[k] = 1;
    if (k === g) break;
    const ki = k % W, kj = Math.floor(k / W);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (!a && !b) continue;
      const ni = ki + a, nj = kj + b;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (done[nk] || !Number.isFinite(cost[nk])) continue;
      const nd = dist[k] + h * Math.hypot(a, b) * (cost[k] + cost[nk]) * 0.5;
      if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; open.push(nk); }
    }
  }
  const pts = [];
  for (let k = g; k >= 0; k = prev[k]) pts.push(new V3(x0 + (k % W) * h, 0, z0 + Math.floor(k / W) * h));
  pts.reverse();
  if (pts.length < 2) return smoothPath([from.clone(), to.clone()]);
  // опорные точки через 2 м, сглаживание
  const ctrl = [from.clone()];
  for (let i = 4; i < pts.length - 2; i += 4) ctrl.push(pts[i]);
  ctrl.push(to.clone());
  return smoothPath(ctrl);
}

// ------------------------------------------------------------------ позы (из боя v2: та же модель Лешего)
const ID = pose({});
export const LP = {
  prep: pose({ Spine: [-6, 0, 0], RightArm: [-25, 0, -55], LeftArm: [-25, 0, 55], RightForeArm: [-30, 0, 0], LeftForeArm: [-30, 0, 0], RightUpLeg: [-22, 0, 0], LeftUpLeg: [-22, 0, 0], RightLeg: [38, 0, 0], LeftLeg: [38, 0, 0] }),
  reach: pose({ Spine: [26, 0, 0], Spine1: [8, 0, 0], RightArm: [-88, -18, -8], LeftArm: [-88, 18, 8], RightForeArm: [-12, 0, 0], LeftForeArm: [-12, 0, 0], LeftUpLeg: [-30, 0, 0], LeftLeg: [30, 0, 0] }),
  face: pose({ Spine: [4, 0, 0], Spine1: [4, -8, 0], Neck: [8, -18, 0], Head: [6, -16, 12], RightArm: [-118, 12, -6], RightForeArm: [-32, 0, 0], LeftArm: [-40, 0, 40], LeftForeArm: [-45, 0, 0] }),
  roar: pose({ Spine: [6, 0, 0], Neck: [12, 0, -4], Head: [10, 0, -6] }),
  lean: pose({ Spine: [14, 0, 0], Spine1: [6, 0, 0] }),
  lift: pose({ Spine: [-12, 0, 0], Spine1: [-8, 0, 0], Neck: [-14, 0, 0], RightArm: [-182, 0, -10], RightForeArm: [-4, 0, 0], LeftArm: [-45, 0, 45], LeftForeArm: [-40, 0, 0] }),
  // приземление с неба: глубокий присед, корпус вперёд, лапы к земле
  land: pose({ Spine: [30, 0, 0], Spine1: [12, 0, 0], Neck: [-18, 0, 0], RightArm: [-40, 0, -30], LeftArm: [-40, 0, 30], RightForeArm: [-20, 0, 0], LeftForeArm: [-20, 0, 0], RightUpLeg: [-55, 0, 0], LeftUpLeg: [-40, 0, 0], RightLeg: [85, 0, 0], LeftLeg: [70, 0, 0] }),
};
// богатырь: закрывается от вихря, висит в лапе
const HP = {
  cover: pose({ Spine: [14, 0, 0], Spine1: [6, 0, 0], Neck: [12, 0, 0], RightArm: [-75, -30, 0], RightForeArm: [-95, 0, 0], LeftArm: [-75, 30, 0], LeftForeArm: [-95, 0, 0] }),
};
function hangPose(t) {
  const k = Math.sin(t * 9), k2 = Math.sin(t * 7.3 + 1);
  return pose({
    Spine: [-8, 0, 0], Neck: [-12, 0, 0],
    RightArm: [-140, -10, 0], RightForeArm: [-45, 0, 0], LeftArm: [-135, 10, 0], LeftForeArm: [-50, 0, 0],
    RightUpLeg: [-18 + 16 * k, 0, 0], RightLeg: [28 + 12 * k, 0, 0], LeftUpLeg: [-8 - 16 * k2, 0, 0], LeftLeg: [36 - 10 * k2, 0, 0],
  });
}

// ------------------------------------------------------------------ 1. Рывок на ходу/бегу
export function dashScenario(ctx, gait) {
  const run = gait === 'run';
  // дуга по краю поляны (прямой не хватает на бег): от рощи у камня на юг и к избам, богатырь внутри дуги в стороне
  const C = new V3(7.5, 0, -0.5), R = 6.5, a0 = 0.75, a1 = -2.6, pts = [];
  for (let i = 0; i <= 80; i++) { const a = a0 + (a1 - a0) * i / 80; pts.push(new V3(C.x + Math.cos(a) * R, 0, C.z + Math.sin(a) * R)); }
  const path = new Path(pts);
  const v = run ? ctx.leshy.runSpeed : ctx.leshy.walkSpeed;
  const k = run
    ? { up0: 0.55, up1: 1.2, dn0: 1.45, dn1: 2.3, g0: 0.75, g1: 1.6, len: 2.9, J: 6.5 }
    : { up0: 1.4, up1: 2.4, dn0: 2.6, dn1: 3.8, g0: 1.8, g1: 2.95, len: 5.4, J: 6.5 };
  const J = Math.max(3, Math.min(k.J, path.len - v * k.len - 0.6));
  const s0 = 0.3, tp = (k.up1 + k.dn0) / 2;   // тело переставляется, пока всё в вихре
  const bodyS = (t) => s0 + v * t + (t >= tp ? J : 0);
  const anchorD = path.at(s0 + v * k.up0), anchorA = path.at(s0 + v * k.dn1 + J);
  const tan = new V3(), tmp = new V3();
  const yawAt = (t) => { path.at(bodyS(t), tmp, tan); return yawOf(tan.x, tan.z); };
  const ha = Math.atan2(ctx.heroPos.z - C.z, ctx.heroPos.x - C.x);
  const camBase = new V3(C.x + Math.cos(ha) * 1.6, 0, C.z + Math.sin(ha) * 1.6);   // камера в середине поляны, у богатыря за спиной
  const cS = (t) => s0 + v * t + J * ramp(t, k.g0, k.g1);
  return {
    name: 'dash', len: k.len, focus: C,
    phases: [['Ход', 0, k.up0], ['Распад', k.up0, k.g0 + 0.15], ['Рывок', k.g0 + 0.15, k.dn0 + 0.2], ['Сборка', k.dn0 + 0.2, k.dn1], [run ? 'Бег' : 'Ход', k.dn1, k.len]],
    tau: (t) => TAU_HOLD * (ramp(t, k.up0, k.up1) - ramp(t, k.dn0, k.dn1)),
    fk: (t) => bump(t, k.g0 - 0.15, k.g0 + 0.2, k.g1 - 0.3, k.g1 + 0.1),
    lineK: (t) => 0.8 * bump(t, k.g0 - 0.05, k.g0 + 0.25, k.g1 - 0.35, k.g1),
    endK: () => 0,
    hFly: 1.6, rFly: 0.5, taper: 1,
    center: (t, out) => path.at(cS(t), out),
    dir: (t, out) => { path.at(cS(t), tmp, out); return out; },
    yawAt,
    anchorD, anchorA, groundUse: 0.35, groundScale: 0.55,
    strag: [k.g0, k.g1, 0.5],
    leshy(t, o) {
      path.at(bodyS(t), o.pos); o.yaw = yawAt(t);
      o.loco = run ? { Run: 1 } : { Walk: 1 };
      o.locoDist = v * t;
      // наклон вперёд на срыве и на приземлении
      const lean = Math.max(ramp(t, k.up0 - 0.15, k.up0 + 0.2), 1 - ramp(t, k.dn1 - 0.3, k.dn1 + 0.35));
      const r = blend(ID, LP.lean, lean * (run ? 0.6 : 1));
      // замах: короткий присед перед срывом; приземление: колени гасят рывок
      const dip = 0.55 * bump(t, k.up0 - 0.32, k.up0 - 0.08, k.up0 + 0.05, k.up0 + 0.25) + 0.45 * bump(t, k.dn1 - 0.45, k.dn1 - 0.15, k.dn1 + 0.1, k.dn1 + 0.45);
      o.rot = dip > 0.001 ? blend(r, LP.prep, dip) : r;
    },
    cam(t, view, out) {
      const c = out.center;
      out.pos.copy(camBase).lerp(c, view === 'close' ? 0.35 : 0); out.pos.y = view === 'close' ? 1.7 : 2.3;
      out.look.copy(c); out.look.y = 1.1;
    },
  };
}

// ------------------------------------------------------------------ 2. Появление сквозь деревья: змея с неба
export function forestScenario(ctx) {
  const A = new V3(9.0, 0, -1.0);
  const out = new V3().subVectors(A, ctx.heroPos).setY(0).normalize();
  const sideV = new V3(-out.z, 0, out.x);
  const S = A.clone().addScaledVector(out, 20).addScaledVector(sideV, -3);
  const p2 = forestPath(ctx.solids, S, A);
  // высота: из неба между крон вниз (первые 9 м), волна над корнями, у поляны подскок и удар в землю
  const L2 = p2.len, pts = [];
  for (let s = 0; s <= L2 + 1e-6; s += 0.2) {
    const q = p2.at(Math.min(s, L2));
    const sky = 12.5 * (1 - ramp(s, 0, 9));
    const wave = 0.35 * Math.sin(s * 0.85) * ramp(s, 6, 9) * (1 - ramp(s, L2 - 5, L2 - 3));
    const base = 1.0 + sky + wave, land = ramp(s, L2 - 2.2, L2);
    q.y = base * (1 - land) + 0.9 * Math.sin(Math.PI * land) * (1 - land);
    pts.push(q);
  }
  const path = new Path(pts);
  const v = 10, t0 = 0.3, tHit = t0 + path.len / v;
  const yaw = yawOf(ctx.heroPos.x - A.x, ctx.heroPos.z - A.z);
  const k = { dn0: tHit - 0.05, dn1: tHit + 0.95, up: tHit + 1.0, len: tHit + 3.4 };
  const tmp = new V3(), head = (t) => v * (t - t0);
  return {
    name: 'forest', len: k.len, focus: A, path, flip: true,
    phases: [['Из воздуха', 0, 1.0], ['Сквозь лес', 1.0, tHit - 0.3], ['Удар о землю', tHit - 0.3, k.up], ['Встаёт', k.up, k.up + 0.6], ['Рык', k.up + 0.6, k.len]],
    snake: { at: (s, o, tan) => path.at3(Math.min(Math.max(s, -5), path.len), o, tan), head, len: 7, rad: 0.42, twist: 1.1, v, tHit },
    // в полёте аура — тонкая линия вдоль змеи (общий код); у земли не пламя, а короткая вспышка-столб и кольцо по земле
    aura(t) {
      if (t < tHit - 0.08) return null;
      const hit = 1 - ramp(t, tHit + 0.15, tHit + 0.75);
      const roar = bump(t, k.up + 0.1, k.up + 0.3, k.up + 1.6, k.up + 2.4);
      return { rev: Math.max(hit, 0.45 * roar), p: { power: 0.35 + 0.4 * hit, height: 2.4 + 1.6 * hit, radius: 0.22 + 0.25 * (1 - hit), thick: 0.08 + 0.08 * (1 - hit), swirl: 0.4, swirlFreq: 1.0, hug: 1.1, ground: 0.9 * hit, envPool: 0.9 * hit, pSwirl: 0.3, pDensity: 0.25, opacity: 0.7, frontOpacity: 0.05, glow: 1.2, envGlow: 1.6 * hit + 0.4 } };
    },
    tau: (t) => TAU_HOLD * (1 - ramp(t, k.dn0, k.dn1)),
    fk: (t) => 1 - ramp(t, tHit, tHit + 0.4),
    lineK: (t) => 1 - ramp(t, tHit - 0.1, tHit + 0.3),
    endK: () => 0,
    center(t, o) { return path.at(Math.min(Math.max(head(t), 0), path.len), o); },
    dir(t, o) { path.at(Math.min(Math.max(head(t), 0), path.len), tmp, o); return o; },
    yawAt: () => yaw,
    anchorD: A, anchorA: A, groundUse: 0.55, groundScale: 0.85,
    strag: [0.8, tHit - 0.2, 0.4],
    leshy(t, o) {
      o.pos.copy(A); o.yaw = yaw; o.loco = { Idle: 1 }; o.locoDist = 0;
      // собирается снизу вверх в глубоком приседе, резко встаёт и рычит
      o.rot = blend(ID, LP.land, 1 - ramp(t, k.up, k.up + 0.2));
      o.clip = { name: 'L_Roar', frac: 0.7 * ramp(t, k.up + 0.15, k.up + 0.6), w: bump(t, k.up + 0.1, k.up + 0.25, k.up + 1.7, k.up + 2.3) };
    },
    cam(t, view, o) {
      const c = o.center, back = out;
      const settle = ramp(t, tHit - 1.0, tHit + 0.2);
      if (view === 'close') {
        o.pos.copy(A).addScaledVector(back, -5.2).addScaledVector(sideV, 2.2); o.pos.y = 1.7 + 1.5 * (1 - settle);
      } else {
        // ближе к поляне, лицом к лесу: змея летит из неба навстречу кадру
        o.pos.copy(A).addScaledVector(back, -7.5).addScaledVector(sideV, 3.2); o.pos.y = 2.0 + 2.6 * (1 - settle);
      }
      o.look.copy(c).lerp(tmp.copy(A).setY(1.2), settle);
    },
  };
}

// ------------------------------------------------------------------ 3. Быстрое нападение и захват богатыря
export function grabScenario(ctx) {
  const Hp = ctx.heroPos.clone(), G0 = new V3(12.0, 0, -1.0);
  const u = new V3().subVectors(G0, Hp).setY(0).normalize();
  const GP = Hp.clone().addScaledVector(u, 0.95);                 // где Леший соберётся: вплотную перед богатырём
  const yaw0 = yawOf(Hp.x - G0.x, Hp.z - G0.z), yawG = yawOf(Hp.x - GP.x, Hp.z - GP.z);
  // хватает, когда собраны голова и лапы, а ноги ещё листва; аура вспыхивает только после захвата
  const k = { up0: 0.35, up1: 1.1, g0: 0.6, g1: 1.35, tp: 1.2, dn0: 1.3, dn1: 2.55, m0: 1.25, m1: 1.9, grab: 1.95, lift: 2.3, len: 5.2 };
  const side = new V3(-u.z, 0, u.x);
  const mid = Hp.clone().lerp(G0, 0.5);
  const tmp = new V3(), hold = new V3();
  return {
    name: 'grab', len: k.len, focus: mid,
    phases: [['Замах', 0, k.up0], ['Распад', k.up0, k.g0 + 0.2], ['Бросок', k.g0 + 0.2, k.g1], ['Сборка', k.g1, k.grab], ['Захват', k.grab, k.lift], ['В воздух', k.lift, k.lift + 0.8], ['Рык', k.lift + 0.8, k.len]],
    tau: (t) => TAU_HOLD * (ramp(t, k.up0, k.up1) - ramp(t, k.dn0, k.dn1)),
    fk: (t) => bump(t, k.g0 - 0.1, k.g0 + 0.2, k.g1 - 0.15, k.g1 + 0.25),
    lineK: (t) => 0.75 * bump(t, k.g0 - 0.05, k.g0 + 0.25, k.g1 - 0.3, k.g1),
    endK: () => 0,
    rK: (t) => 1 + 0.35 * bump(t, k.g1 - 0.1, k.g1 + 0.2, k.grab - 0.2, k.grab + 0.3),   // обхватывает богатыря
    hFly: 1.5, rFly: 0.55, taper: 1,
    center(t, o) {
      const g = ramp(t, k.g0, k.g1);
      o.copy(G0).lerp(Hp, g); o.y = 0.45 * Math.sin(Math.PI * g);
      return o.lerp(GP, ramp(t, k.m0, k.m1));
    },
    dir(t, o) {   // разворот хвоста плавно, через бок (резкий флип дёргал все листья)
      const a = ramp(t, k.m0 - 0.2, k.m0 + 0.3), c = Math.cos(Math.PI * a), sn = Math.sin(Math.PI * a);
      return o.set(-u.x * c + side.x * sn, 0, -u.z * c + side.z * sn);
    },
    yawAt: (t) => t < k.tp ? yaw0 : yawG,
    anchorD: G0, anchorA: GP, groundUse: 0.35, groundScale: 0.6,
    strag: [k.g1, k.grab, 0.4],
    // аура: нет при броске; вспыхивает в момент захвата и держит Лешего, пока он поднимает и рычит
    aura(t) {
      const on = ramp(t, k.grab, k.grab + 0.3), pw = 0.35 + 0.65 * ramp(t, k.grab, k.lift + 0.4);
      // тонкая, прижатая к силуэту: Леший и поднятый богатырь должны читаться сквозь неё
      return { rev: on * (0.75 - 0.25 * ramp(t, k.lift + 1.2, k.len)), p: { power: pw * 0.7, height: 2.3, radius: 0.5, thick: 0.16, swirl: 0.8, swirlFreq: 1.1, hug: 1.1, ground: 0.5 * on, envPool: 0.5 * on, pSwirl: 0.6, pDensity: 0.35, opacity: 0.6, frontOpacity: 0.06, frontCover: 0.04, glow: 0.8, envGlow: 1.0 } };
    },
    leshy(t, o) {
      o.loco = { Idle: 1 }; o.locoDist = 0; o.clip = null;
      if (t < k.tp) {
        o.pos.copy(G0); o.yaw = yaw0;
        o.rot = blend(ID, LP.prep, ramp(t, 0, 0.3));         // замах: присел перед броском
      } else {
        o.pos.copy(GP); o.yaw = yawG;
        // собирается с вытянутыми лапами → рывком к себе → вскидывает богатыря над головой → рык
        const r = blend(LP.reach, LP.face, ramp(t, k.grab, k.grab + 0.25));
        const up = ramp(t, k.lift, k.lift + 0.55);
        const r2 = up > 0 ? blend(r, LP.lift, up * 0.85) : r;
        stack(r2, LP.roar, bump(t, k.lift + 0.75, k.lift + 1.0, k.lift + 2.0, k.lift + 2.5));
        o.rot = r2;
      }
    },
    hero(t, o, hand) {
      // стоит, вихрь бьёт в лицо, закрывается, его хватают и поднимают в воздух
      o.clip = { name: 'Hit', time: Math.max(0, t - (k.g1 - 0.05)), w: bump(t, k.g1 - 0.1, k.g1 + 0.05, k.grab - 0.1, k.grab + 0.2) };
      const cover = bump(t, k.g1 + 0.15, k.g1 + 0.4, k.grab, k.grab + 0.25);
      const hang = ramp(t, k.grab, k.grab + 0.3);
      const r = blend(ID, HP.cover, cover);
      if (hang > 0) { const hp = hangPose(t); for (const n in hp) r[n] = (r[n] || new THREE.Quaternion()).clone().slerp(hp[n], hang); }
      o.rot = r;
      // в лапе: корень под кистью, болтается
      const lift = ramp(t, k.grab, k.grab + 0.25);
      const away = tmp.subVectors(hand, GP).setY(0); if (away.lengthSq() < 1e-4) away.copy(u).negate(); away.normalize();
      // держит перед собой (между Лешим и камерой сбоку видно обоих), за ворот: ступни над землёй
      const fx = GP.x - u.x * 0.62, fz = GP.z - u.z * 0.62;
      hold.set(THREE.MathUtils.lerp(hand.x, fx, 0.7) + away.x * 0.1, Math.max(0, hand.y - 0.95), THREE.MathUtils.lerp(hand.z, fz, 0.7) + away.z * 0.1);
      o.pos.copy(Hp).lerp(hold, lift);
      o.yaw = yawOf(GP.x - o.pos.x, GP.z - o.pos.z);
      o.pivot = [lift * (0.15 + Math.sin(t * 7) * 0.05), lift * Math.sin(t * 5) * 0.06, 1.3];
    },
    cam(t, view, o) {
      const c = o.center;
      const close = ramp(t, k.g1 - 0.2, k.grab + 0.3), rise = ramp(t, k.lift, k.lift + 0.8);
      const focus = tmp.copy(mid).lerp(c, 0.4).lerp(Hp.clone().lerp(GP, 0.5), close);
      const d = (view === 'close' ? 6 : 9) - close * (view === 'close' ? 2.0 : 3.0);
      o.look.copy(focus); o.look.y = 1.2 + close * 0.35 + rise * 0.9;
      o.pos.copy(focus).addScaledVector(side, d).addScaledVector(u, -close * 1.2); o.pos.y = 2.4 - close * 0.7;
    },
  };
}
