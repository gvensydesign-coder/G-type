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
    const seg = c[i + 1] - c[i] || 1e-6, f = (s - c[i]) / seg;
    out.copy(p[i]).lerp(p[i + 1], f);
    if (tan) tan.subVectors(p[i + 1], p[i]).setY(0).normalize();
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
      o.rot = blend(ID, LP.lean, lean * (run ? 0.6 : 1));
    },
    cam(t, view, out) {
      const c = out.center;
      out.pos.copy(camBase).lerp(c, view === 'close' ? 0.35 : 0); out.pos.y = view === 'close' ? 1.7 : 2.3;
      out.look.copy(c); out.look.y = 1.1;
    },
  };
}

// ------------------------------------------------------------------ 2. Появление сквозь деревья
export function forestScenario(ctx) {
  const A = new V3(9.0, 0, -1.0);
  const out = new V3().subVectors(A, ctx.heroPos).setY(0).normalize();
  const S = A.clone().addScaledVector(out, 21).addScaledVector(new V3(-out.z, 0, out.x), -3);
  const path = forestPath(ctx.solids, S, A);
  const v0 = 6.5, te = 3.0, Dd = 1.3, tb = te - Dd;
  const remain = (t) => t >= te ? 0 : t > tb ? v0 * (te - t) ** 2 / (2 * Dd) : v0 * Dd / 2 + v0 * (tb - t);
  const sAt = (t) => path.len - remain(t);
  const yaw = yawOf(ctx.heroPos.x - A.x, ctx.heroPos.z - A.z);
  const k = { dn0: 3.25, dn1: 4.95, len: 6.4 };
  const tmp = new V3();
  return {
    name: 'forest', len: k.len, focus: A, path,
    phases: [['Сквозь лес', 0, 2.5], ['Вихрь', 2.5, k.dn0 + 0.3], ['Сборка', k.dn0 + 0.3, k.dn1], ['Леший', k.dn1, k.len]],
    tau: (t) => TAU_HOLD * (1 - ramp(t, k.dn0, k.dn1)),
    fk: (t) => 1 - ramp(t, 2.3, 3.4),
    lineK: (t) => 0.6 * (1 - ramp(t, 1.9, 3.1)),
    endK: () => 0,
    hFly: 1.45, rFly: 0.55, taper: 0.8,
    center(t, o) {
      path.at(sAt(t), o);
      o.y = 0.1 * (1 - ramp(t, 2.4, 3.2)) * (1 + Math.sin(t * 5.5));   // чуть подпрыгивает над корнями
      return o;
    },
    dir(t, o) { path.at(sAt(t), tmp, o); return o; },
    yawAt: () => yaw,
    anchorD: A, anchorA: A, groundUse: 0.55, groundScale: 0.8,
    strag: [0.15, 2.4, 0.45],
    leshy(t, o) {
      o.pos.copy(A); o.yaw = yaw; o.loco = { Idle: 1 }; o.locoDist = 0;
      // как в «Улёте»: тело собирается в позе рыка и опускает лапы
      const tau = this.tau(t), x = Math.min(1, tau / T.roar);
      o.clip = { name: 'L_Roar', frac: (1 - (1 - x) * (1 - x)) * 0.7, w: ramp(tau, 0, 0.45) };
      o.rot = null;
    },
    cam(t, view, o) {
      const c = o.center, back = out;
      if (view === 'close') {
        o.pos.copy(A).addScaledVector(back, -5.2).addScaledVector(new V3(-back.z, 0, back.x), 2.2); o.pos.y = 1.7;
        o.look.copy(A).lerp(c, 0.6); o.look.y = 1.3;
      } else {
        o.pos.copy(ctx.heroPos).addScaledVector(back, -3.0).addScaledVector(new V3(-back.z, 0, back.x), 1.6); o.pos.y = 2.3;
        o.look.copy(A).lerp(c, 0.55); o.look.y = 1.2;
      }
    },
  };
}

// ------------------------------------------------------------------ 3. Быстрое нападение и захват богатыря
export function grabScenario(ctx) {
  const Hp = ctx.heroPos.clone(), G0 = new V3(12.0, 0, -1.0);
  const u = new V3().subVectors(G0, Hp).setY(0).normalize();
  const GP = Hp.clone().addScaledVector(u, 0.95);                 // где Леший соберётся: вплотную перед богатырём
  const yaw0 = yawOf(Hp.x - G0.x, Hp.z - G0.z), yawG = yawOf(Hp.x - GP.x, Hp.z - GP.z);
  const k = { up0: 0.3, up1: 1.2, g0: 0.65, g1: 1.5, dn0: 2.0, dn1: 3.1, m0: 2.0, m1: 2.95, tp: 1.6, grab: 2.9, len: 5.8 };
  const side = new V3(-u.z, 0, u.x);
  const mid = Hp.clone().lerp(G0, 0.5);
  const tmp = new V3(), hold = new V3();
  return {
    name: 'grab', len: k.len, focus: mid,
    phases: [['Замах', 0, k.up0], ['Распад', k.up0, k.g0 + 0.2], ['Бросок', k.g0 + 0.2, k.g1], ['Вихрь вокруг', k.g1, k.dn0 + 0.2], ['Сборка', k.dn0 + 0.2, k.grab], ['Захват', k.grab, k.len]],
    tau: (t) => TAU_HOLD * (ramp(t, k.up0, k.up1) - ramp(t, k.dn0, k.dn1)),
    fk: (t) => bump(t, k.g0 - 0.1, k.g0 + 0.2, k.g1 - 0.15, k.g1 + 0.3),
    lineK: (t) => 0.75 * bump(t, k.g0 - 0.05, k.g0 + 0.25, k.g1 - 0.3, k.g1),
    endK: () => 0,
    rK: (t) => 1 + 0.4 * bump(t, k.g1 - 0.1, k.g1 + 0.3, k.dn0, k.dn0 + 0.6),   // обхватывает богатыря
    hFly: 1.5, rFly: 0.55, taper: 1,
    center(t, o) {
      const g = ramp(t, k.g0, k.g1);
      o.copy(G0).lerp(Hp, g); o.y = 0.45 * Math.sin(Math.PI * g);
      return o.lerp(GP, ramp(t, k.m0, k.m1));
    },
    dir(t, o) { return t < k.m0 ? o.copy(u).negate() : o.copy(u); },
    yawAt: (t) => t < k.tp ? yaw0 : yawG,
    anchorD: G0, anchorA: GP, groundUse: 0.35, groundScale: 0.6,
    strag: [k.g1, k.dn0, 0.4],
    leshy(t, o) {
      o.loco = { Idle: 1 }; o.locoDist = 0; o.clip = null;
      if (t < k.tp) {
        o.pos.copy(G0); o.yaw = yaw0;
        o.rot = blend(ID, LP.prep, ramp(t, 0, 0.35));        // присел перед броском
      } else {
        o.pos.copy(GP); o.yaw = yawG;
        // собирается уже с вытянутыми лапами, хватает и поднимает к морде, рычит
        const r = blend(LP.reach, LP.face, ramp(t, k.grab, k.grab + 0.6));
        stack(r, LP.roar, bump(t, k.grab + 0.8, k.grab + 1.1, k.grab + 2.0, k.grab + 2.5));
        o.rot = r;
      }
    },
    hero(t, o, hand) {
      // стоит, получает вихрь в лицо, закрывается, его хватают и поднимают
      o.clip = { name: 'Hit', time: Math.max(0, t - (k.g1 - 0.05)), w: bump(t, k.g1 - 0.1, k.g1 + 0.05, k.g1 + 0.5, k.g1 + 0.9) };
      const cover = bump(t, k.g1 + 0.25, k.g1 + 0.6, k.grab, k.grab + 0.3);
      const hang = ramp(t, k.grab, k.grab + 0.35);
      const r = blend(ID, HP.cover, cover);
      if (hang > 0) { const hp = hangPose(t); for (const n in hp) r[n] = (r[n] || new THREE.Quaternion()).clone().slerp(hp[n], hang); }
      o.rot = r;
      // в лапе: корень под кистью, болтается
      const lift = ramp(t, k.grab, k.grab + 0.45);
      const away = tmp.subVectors(hand, GP).setY(0); if (away.lengthSq() < 1e-4) away.copy(u).negate(); away.normalize();
      hold.set(hand.x + away.x * 0.22, Math.max(0, hand.y - 1.12), hand.z + away.z * 0.22);
      o.pos.copy(Hp).lerp(hold, lift);
      o.yaw = yawOf(GP.x - o.pos.x, GP.z - o.pos.z);
      o.pivot = [lift * (0.15 + Math.sin(t * 7) * 0.05), lift * Math.sin(t * 5) * 0.06, 1.3];
    },
    cam(t, view, o) {
      const c = o.center;
      const close = ramp(t, k.dn0, k.grab + 0.4);
      const focus = tmp.copy(mid).lerp(c, 0.4).lerp(Hp.clone().lerp(GP, 0.5), close);
      const d = (view === 'close' ? 6 : 9) - close * (view === 'close' ? 2.2 : 3.2);
      o.look.copy(focus); o.look.y = 1.2 + close * 0.35;
      o.pos.copy(focus).addScaledVector(side, d).addScaledVector(u, -close * 1.2); o.pos.y = 2.4 - close * 0.6;
    },
  };
}
