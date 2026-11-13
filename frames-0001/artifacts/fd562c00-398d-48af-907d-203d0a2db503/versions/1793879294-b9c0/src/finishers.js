// Epic finishers: three for the hero (the stunned Leshy is the victim) and three for the Leshy (the exhausted hero).
// Each is one long procedural pose track per actor (combat.js PoseRig), plus a shot list for the camera,
// time-scale keys (slow motion and hit-stop), effect events and blade / claw trails.
// Frames: the hero's keys are in the hero frame (+Z towards the Leshy), the Leshy's in its own frame (+Z towards the hero).
// The Leshy stands at the duel origin facing -Z; the hero is placed at (X, -D) facing +Z from probes, never guessed.
import { seq, sample, HS, LS } from './combat.js';

const A = 0.105, LA = 0.21, D2R = Math.PI / 180;
const cl = (o) => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; return r; };
const mix = (a, b) => Object.assign(cl(a), cl(b));
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// pitch a vector of the hero frame by hp (forward lean +): up -> (0, cos, sin), forward -> (0, -sin, cos)
const pitch = (v, hp) => { const c = Math.cos(hp * D2R), s = Math.sin(hp * D2R); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };

// ------------------------------------------------------------------ shared poses
// hero exhausted on one knee, leaning on the planted sword, shield arm hanging
const HK = {
  hips: [0, 0.45, -0.08], hy: -8, hp: 22, hr: 0, cy: -6, cp: 14, cr: 0, ny: 4, np: 26,
  fL: [0.13, A, 0.26], kL: [0.25, 0.1, 1], yL: -5, tL: 0, fR: [-0.17, 0.12, -0.42], tR: 60, kR: [-0.2, -0.7, 0.5], yR: -20,
  hR: [0.0, -0.12, 0.3], eR: [-0.7, -0.5, 0], bl: [0.05, -0.62, 0.78], hL: [0.04, -0.33, 0.1], eL: [0.7, -0.5, -0.2], sh: [0.6, -0.2, 0.6],
};
// hero lying on his back, head away from the Leshy (z: where the pelvis lies)
const HLIE = (z) => ({
  hips: [0, 0.13, z], hy: 0, hp: -84, hr: 0, cy: 0, cp: -4, cr: 0, ny: 10, np: 26,
  fL: [0.15, A, z + 0.62], fR: [-0.2, A, z + 0.58], kL: [0.2, 1, 0.3], kR: [-0.2, 1, 0.3], tL: 0, tR: 0, yL: -10, yR: -30,
  hR: [-0.32, -0.1, -0.1], hL: [0.32, -0.1, -0.1], eR: [-0.8, 0.2, -0.3], eL: [0.8, 0.2, -0.3], bl: [-0.7, 0.0, 0.7], sh: [0.3, 1, 0],
});
// Leshy: stunned standing, one knee, both knees, lying on its back, dead kneel
const LST = { hips: [0, 0.98, -0.05], hp: 24, cp: 18, np: -6, hR: [-0.12, -0.58, 0.2], hL: [0.12, -0.58, 0.22], eR: [-0.6, -0.4, -0.5], eL: [0.6, -0.4, -0.5] };
const LK1 = { hips: [0, 0.7, -0.12], hp: 16, cp: 26, np: 18, ny: 0, fL: [0.3, LA, 0.32], kL: [0.4, 0.3, 1], fR: [-0.28, 0.24, -0.72], tR: 62, kR: [-0.3, -0.6, 0.6], hR: [-0.1, -0.6, 0.1], hL: [0.02, -0.48, 0.28], eR: [-0.6, -0.4, -0.5], eL: [0.6, -0.4, -0.5] };
const LK2 = (z) => ({ hips: [0, 0.66, z], hp: 8, cp: 16, np: 4, ny: 0, fL: [0.3, 0.24, z - 0.6], tL: 62, kL: [0.3, -0.6, 0.6], fR: [-0.3, 0.24, z - 0.6], tR: 62, kR: [-0.3, -0.6, 0.6], yL: 10, yR: -10, hR: [-0.2, -0.6, 0.05], hL: [0.2, -0.6, 0.07], eR: [-0.7, -0.3, -0.5], eL: [0.7, -0.3, -0.5] });
const LLIE = (z) => ({ hips: [0, 0.3, z], hp: -86, hr: 0, cp: -4, cy: 0, np: 20, ny: 0, fL: [0.38, LA, z + 0.9], fR: [-0.34, LA, z + 0.82], kL: [0.4, 1, 0.3], kR: [-0.4, 1, 0.3], tL: 0, tR: 0, hR: [-0.6, -0.1, -0.2], hL: [0.6, -0.1, -0.2], eR: [-0.9, 0.3, -0.3], eL: [0.9, 0.3, -0.3] });
const LROAR = { hp: -8, cp: -24, np: -40, hR: [-0.58, 0.12, 0.14], hL: [0.58, 0.12, 0.14], eR: [-0.6, -0.5, -0.4], eL: [0.6, -0.5, -0.4] };

// the Leshy topples onto its back from a kneel
function fallBack(L, t, z0, z1) {
  L.push([t + 0.3, { hips: [0, 0.56, z0 - 0.35], hp: -40, cp: -12, np: -4, hR: [-0.55, 0.0, 0.0], hL: [0.55, 0.05, 0.0], eR: [-0.9, 0.3, -0.3], eL: [0.9, 0.3, -0.3], tR: 30, tL: 20, fL: [0.34, LA + 0.1, z0 - 0.1] }]);
  L.push([t + 0.62, LLIE(z1)]);
  L.push([t + 0.76, { hips: [0, 0.35, z1], hp: -82, np: 14 }]);
  L.push([t + 0.92, LLIE(z1), true]);
  return t + 0.92;
}

// ------------------------------------------------------------------ scene assembly
export function buildFinishers(ctx, B, S) {
  const shot = (b, t0, t1, look, orbit) => b.shots.push({ t0, t1, look, orbit: orbit.map(([t, az, el, d, fov, e]) => [t, [az, el, d, fov], e]) });
  const fx = (b, t, kind, o = {}) => b.fx.push(Object.assign({ t, kind }, o));
  // a hero blade point (70% of the blade) in the hero frame, and a Leshy bone / claw in the Leshy frame
  const hp = (keys, t, src = 'blade') => ctx.point('hero', keys, t, src);
  const lp = (keys, t, src = 'Spine2') => ctx.point('leshy', keys, t, src);
  const runIn = (b, tRun, D, X, run) => {     // run clip from behind, arriving at (X, -D) at tRun
    const v = run / tRun;
    b.place('hero', X, -D - run);
    b.clip('hero', 0, 'Run', [[0, 0], [tRun + 0.4, (tRun + 0.4) * v / ctx.runSpeed]], 0.05);
    b.move('hero', 0, X, -D - run); b.move('hero', tRun, X, -D);
  };

  // ================================================================ HERO 1: «Небесный раскол» — leap and cleave
  {
    const tRun = 1.0, tH = 0.78, tI = tRun + tH;
    const fl = HS.fL, fr = HS.fR;
    const H = seq(HS, [
      [0, { hips: [0, 0.74, 0], hp: 16, cy: -6, hR: [-0.12, -0.25, -0.08], eR: [-0.8, -0.3, -0.3], bl: [-0.15, -0.3, -1] }],
      [0.16, { hips: [0, 0.54, 0.22], hy: -10, hp: 30, cp: 14, cy: -10, ny: 10, np: -24, fL: [fl[0], A, 0.4], kL: [0.3, 0, 1], fR: [fr[0], A, 0.0], tR: 25, kR: [-0.3, 0, 1], hR: [-0.14, -0.3, -0.12], bl: [-0.15, -0.25, -1], hL: [-0.05, -0.22, 0.25], sh: [0.3, 0, 1] }, true],
      [0.36, { hips: [0, 1.08, 0.5], hy: -6, hp: 4, cp: -6, cy: -4, np: -30, fL: [0.12, 0.6, 0.64], kL: [0.2, 0.4, 1], tL: 30, fR: [-0.15, 0.42, 0.3], tR: 45, kR: [-0.2, 0.3, 1], hR: [-0.04, 0.3, 0.0], eR: [-0.75, 0.5, -0.1], bl: [0.02, 0.85, -0.5], hL: [0.3, 0.02, 0.15], eL: [0.9, 0.1, 0], sh: [0.9, 0.2, 0.3] }],
      [0.56, { hips: [0, 1.38, 0.74], hy: -4, hp: -6, cp: -22, cy: -6, np: -18, fL: [0.12, 0.92, 0.9], fR: [-0.15, 0.76, 0.5], kL: [0.2, 0.2, 1], kR: [-0.2, 0.2, 1], tL: 20, tR: 30, hR: [-0.02, 0.37, -0.12], bl: [0.02, 0.05, -1], hL: [0.34, 0.05, 0.05] }],
      [0.68, { hips: [0, 1.36, 0.84], cp: -24, hR: [-0.02, 0.37, -0.14], bl: [0.02, -0.1, -1] }],
      [tH, { hips: [0, 1.08, 0.95], hy: -2, hp: 20, cp: 22, cy: 4, np: 0, hR: [0.08, 0.1, 0.34], eR: [-0.6, 0, 0], bl: [0.04, -0.2, 1], hL: [0.22, -0.15, -0.12], sh: [0.8, -0.2, -0.3], fL: [0.12, 0.6, 1.18], fR: [-0.15, 0.58, 0.82] }],
      [0.9, { hips: [0, 0.82, 1.0], hp: 26, cp: 30, hR: [0.1, -0.26, 0.25], eR: [-0.6, -0.4, 0], bl: [0.0, -0.72, 0.68], fL: [0.13, 0.24, 1.26], fR: [-0.16, 0.28, 0.84], tL: 10, tR: 10 }],
      [1.0, { hips: [0, 0.45, 1.0], hy: -6, hp: 30, cp: 22, cy: 0, ny: 6, np: -16, fL: [0.15, A, 1.3], kL: [0.3, 0.1, 1], tL: 0, fR: [-0.18, 0.12, 0.6], tR: 60, kR: [-0.2, -0.7, 0.5], hR: [-0.22, -0.28, -0.04], eR: [-0.9, -0.2, -0.2], bl: [-0.45, -0.22, -0.86], hL: [0.06, -0.33, 0.22], eL: [0.7, -0.5, 0], sh: [0.6, 0.3, 0.7] }],
      [1.1, { hips: [0, 0.43, 1.0] }, true],
      [2.5, { np: -10, ny: 10 }, true],
      [2.95, { hips: [0, 0.77, 0.98], hy: -20, hp: 6, cp: 6, cy: 8, ny: 12, np: -4, fL: [0.12, A, 1.15], fR: [-0.18, A, 0.83], tR: 0, kL: [0.25, 0, 1], kR: [-0.45, 0, 1], hR: [-0.28, -0.2, 0.18], eR: [-0.8, -0.4, 0.2], bl: [-0.7, -0.2, 0.68], hL: [-0.17, -0.1, 0.26], sh: [0.2, 0.05, 1] }],
      [3.12, { hR: [-0.33, -0.26, 0.02], bl: [-0.6, -0.7, -0.3] }],
      [3.7, { hips: [0, 0.77, 0.98], fL: [0.12, A, 1.15], fR: [-0.18, A, 0.83], hR: HS.hR, bl: HS.bl, eR: HS.eR, cy: HS.cy, hy: HS.hy, np: HS.np, ny: HS.ny }],
    ]);
    const mv = { keys: H, dur: 3.7, hit: tH, adv: [0, 0.98] };
    // the Leshy: already broken on one knee, looks up at the leap, takes the blow, falls back
    const Lk = [[0, LK1], [0.9, mix(LK1, { hr: 3, hips: [0, 0.69, -0.12] })], [1.4, mix(LK1, { hr: -2 })],
      [tI - 0.32, mix(LK1, { np: -24, cp: 14, hp: 10 })],
      [tI + 0.06, mix(LK1, { hips: [0, 0.74, -0.2], hp: -4, cp: -16, np: -30, ny: 24, hR: [-0.42, -0.3, 0.05], hL: [0.42, -0.25, 0.1], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3] })],
      [tI + 0.7, mix(LK1, { hips: [0, 0.72, -0.2], hp: 2, cp: -8, np: -24, ny: 26, hR: [-0.44, -0.32, 0.02], hL: [0.44, -0.28, 0.08] })],
      [tI + 1.4, mix(LK1, { hips: [0, 0.69, -0.2], hp: 18, cp: 34, np: 32, ny: 10 })]];
    const tEnd = fallBack(Lk, tI + 1.55, -0.2, -1.05);
    const vic = { keys: seq(LS, Lk), dur: 30, adv: [0, 0] };
    // place the hero so the blade meets the Leshy's left collarbone at the impact
    const bp = hp(H, tH), tg = lp(vic.keys, tI, 'LeftShoulder');
    const D = bp.z + tg.z + 0.08, X = -tg.x - bp.x;
    ctx.info.leap = { bladeY: +bp.y.toFixed(2), targetY: +tg.y.toFixed(2), D: +D.toFixed(2) };
    const b = new B('Небесный раскол');
    b.pose('leshy', 0, vic, 0);
    runIn(b, tRun, D, X, 3.4);
    b.pose('hero', tRun, mv, 0.12);
    b.hit(tI, 'leshy', 'finisher', 'blade');
    b.note(0, 'Леший рухнул на колено; разбег'); b.note(tRun, 'Прыжок над головой'); b.note(tI, 'Раскол сверху'); b.note(tI + 1.6, 'Леший повержен');
    b.ts = [[0, 1], [tRun + 0.4, 1], [tRun + 0.5, 0.32], [tI - 0.06, 0.32], [tI - 0.01, 0.05], [tI + 0.035, 0.05], [tI + 0.09, 0.22], [tRun + 1.02, 0.2], [tRun + 1.3, 0.4], [tRun + 1.9, 1]];
    const tL = tRun + 1.0;
    shot(b, 0, tRun + 0.14, { who: 'mid', bone: 'Spine2' }, [[0, 0.55, 0.16, 6.2, 34], [tRun + 0.14, 0.4, 0.12, 5.2, 36]]);
    shot(b, tRun + 0.14, tRun + 0.62, { who: 'hero', bone: 'Hips', off: [0, 0.2, 0] }, [[0, -1.62, -0.06, 3.6, 40], [0.48, -1.42, -0.1, 3.3, 34]]);
    shot(b, tRun + 0.62, tL + 0.12, { who: 'mid', bone: 'Neck', k: 0.55 }, [[0, -1.62, 0.04, 3.3, 36], [0.5, -1.7, 0.02, 3.0, 34]]);
    shot(b, tL + 0.12, tL + 2.0, { who: 'hero', bone: 'Hips', off: [0, 0.32, 0] }, [[0, -1.05, 0.08, 3.6, 36], [1.88, -1.4, 0.14, 4.0, 38]]);
    shot(b, tL + 2.0, tEnd + 1.6, { who: 'mid', bone: 'Hips' }, [[0, 2.3, 0.32, 5.6, 40], [tEnd + 1.6 - tL - 2.0, 2.65, 0.36, 6.4, 42]]);
    b.trail.push({ t0: tRun + 0.6, t1: tL, src: 'blade' });
    fx(b, tI, 'flash', { s: 0.7 }); fx(b, tI, 'chips', { who: 'leshy', bone: 'LeftShoulder', n: 46 });
    fx(b, tL, 'dust', { who: 'hero', bone: 'Hips', n: 14, r: 1.1 }); fx(b, tL, 'ring', { who: 'hero', bone: 'Hips', r: 1.8 }); fx(b, tL, 'shake', { s: 0.6 });
    fx(b, tEnd - 0.3, 'dust', { who: 'leshy', bone: 'Spine1', n: 20, r: 1.6 }); fx(b, tEnd - 0.3, 'shake', { s: 0.5 });
    b.cine = { t0: 0, t1: tEnd + 1.6, title: 'Небесный раскол', sub: 'добивание Богатыря' };
    S.finLeap = b.done(tEnd + 1.6);
  }

  // ================================================================ HERO 2: «Сквозь сердце» — shield bash, thrust, kick
  {
    const tRun = 0.9, tB = 0.4, tT = 1.35, tK = 2.72;
    const fl = HS.fL, fr = HS.fR;
    const H = seq(HS, [
      [0, { hips: [0, 0.74, 0], hp: 14 }],
      [0.24, { hips: [0, 0.73, 0.12], hy: -44, hp: 8, cy: -18, ny: 40, hL: [-0.21, -0.08, 0.1], sh: [0.4, 0, 1], eL: [0.7, -0.5, -0.3], hR: [-0.1, -0.22, -0.05], bl: [0.05, 0.6, 0.8], fR: [fr[0], A, 0.05], fL: [fl[0], A + 0.08, 0.35], tR: 10 }, true],
      [tB, { hips: [0, 0.71, 0.72], hy: -50, hp: 14, cy: -8, ny: 44, hL: [-0.27, 0.06, 0.28], sh: [0.15, 0.25, 1], eL: [0.8, -0.3, 0], fL: [fl[0], A, 0.98], fR: [fr[0], A, 0.3], tR: 0 }],
      [0.62, { hips: [0, 0.72, 0.7], hy: -44, hp: 10, cy: -8, ny: 40, hL: [-0.24, -0.02, 0.24] }],
      [0.85, { hips: [0, 0.69, 0.66], hy: -32, hp: 12, cy: -26, ny: 30, np: -14, hR: [-0.1, -0.04, -0.2], bl: [0.04, 0.2, 1], eR: [-0.6, -0.2, -0.7], hL: [0.1, -0.08, 0.24], sh: [0.4, 0, 1], fR: [fr[0], A + 0.06, 0.4], tR: 15 }],
      [1.05, { hips: [0, 0.68, 0.68], fR: [fr[0], A, 0.55], tR: 0, hR: [-0.1, -0.06, -0.22] }, true],
      [1.2, { hips: [0, 0.68, 0.68] }, true],
      [tT, { hips: [0, 0.72, 0.98], hy: -10, hp: 12, cy: 2, cp: 4, ny: 8, np: -22, hR: [0.06, -0.04, 0.37], eR: [-0.7, -0.4, 0.1], bl: [0.04, 0.1, 1], hL: [0.2, -0.12, 0.18], eL: [0.8, -0.2, 0], sh: [0.7, 0, 0.6], fL: [fl[0], A, 1.38], fR: [fr[0], A, 0.62] }],
      [tT + 0.12, { hips: [0, 0.71, 1.0] }, true],
      [2.0, { hips: [0, 0.71, 1.04], cy: 10, np: -26, hR: [0.08, 0.05, 0.37], bl: [0.18, 0.22, 1] }, true],
      [2.35, { hips: [0, 0.72, 1.02], cy: 12, bl: [0.2, 0.24, 1] }, true],
      [2.56, { hips: [0, 0.76, 0.86], hy: -16, hp: -8, cy: 4, np: -14, hR: [-0.08, -0.08, 0.04], bl: [0.05, 0.25, 1], fR: [-0.12, 0.5, 1.02], kR: [-0.2, 0.7, 1], tR: -20, fL: [fl[0], A, 1.32] }],
      [tK, { hips: [0, 0.8, 0.86], hp: -24, cp: -6, hR: [-0.12, -0.1, -0.02], fR: [-0.1, 0.62, 1.5], kR: [-0.2, 0.5, 1], tR: -35 }],
      [2.95, { hips: [0, 0.76, 0.86], hp: 2, fR: [-0.18, A + 0.1, 0.9], tR: 0, kR: [-0.45, 0, 1] }],
      [3.15, { hips: [0, 0.77, 0.86], fR: [-0.18, A, 0.72], hp: 4 }],
      [3.7, { hips: [0, 0.77, 0.86], hy: -16, hp: 4, cp: 2, cy: 2, ny: 4, np: 20, hR: [-0.06, -0.36, 0.06], eR: [-0.7, -0.6, -0.2], bl: [-0.15, -0.55, 0.82], hL: [0.02, -0.34, 0.06], sh: [0.5, -0.1, 0.8], fL: [fl[0], A, 1.05], fR: [fr[0], A, 0.72] }, true],
      [5.0, { np: 24 }, true],
      [5.6, { hips: [0, 0.77, 0.88], hy: HS.hy, hp: HS.hp, cp: HS.cp, cy: HS.cy, ny: HS.ny, np: HS.np, hR: HS.hR, eR: HS.eR, bl: HS.bl, hL: HS.hL, sh: HS.sh, fL: [fl[0], A, 1.05], fR: [fr[0], A, 0.73] }],
    ]);
    const mv = { keys: H, dur: 5.6, hit: tT, adv: [0, 0.88] };
    const aB = tRun + tB, aT = tRun + tT, aK = tRun + tK;
    const Lk = [[0, LST], [0.5, mix(LST, { hr: 4 })], [1.0, mix(LST, { hr: -3 })], [aB - 0.02, LST],
      [aB + 0.08, mix(LST, { hips: [0, 1.04, -0.2], hp: -8, cp: -14, np: -26, ny: -12, hR: [-0.42, -0.25, 0.1], hL: [0.42, -0.2, 0.15], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3] })],
      [aB + 0.36, mix(LST, { hips: [0, 0.98, -0.3], hp: 4, cp: 4, np: -10, fR: [-0.3, LA + 0.1, -0.5], tR: 15 })],
      [aB + 0.62, mix(LK2(-0.32), { hips: [0, 0.74, -0.32], hp: 14, cp: 22, np: 16 })],
      [aB + 0.8, LK2(-0.32)],
      [aT - 0.3, mix(LK2(-0.32), { np: -6, hR: [-0.25, -0.5, 0.15], hL: [0.25, -0.5, 0.17] })],
      [aT + 0.06, mix(LK2(-0.32), { hips: [0, 0.68, -0.36], hp: -8, cp: -18, np: -36, hR: [-0.12, -0.24, 0.42], hL: [0.12, -0.24, 0.44], eR: [-0.9, -0.2, -0.3], eL: [0.9, -0.2, -0.3] })],
      [aT + 0.5, mix(LK2(-0.32), { hips: [0, 0.68, -0.36], hp: -6, cp: -20, np: -40, hr: 2, hR: [-0.1, -0.22, 0.44], hL: [0.1, -0.22, 0.45] })],
      [aT + 0.9, mix(LK2(-0.32), { hips: [0, 0.68, -0.36], hp: -6, cp: -18, np: -38, hr: -2, hR: [-0.1, -0.26, 0.43], hL: [0.1, -0.26, 0.44] })],
      [aK - 0.2, mix(LK2(-0.32), { hips: [0, 0.67, -0.35], hp: 2, cp: 4, np: 10, hR: [-0.2, -0.45, 0.25], hL: [0.2, -0.45, 0.27] })],
      [aK + 0.06, mix(LK2(-0.32), { hips: [0, 0.7, -0.45], hp: -16, cp: -14, np: -20, hR: [-0.45, -0.15, 0.1], hL: [0.45, -0.12, 0.12] })]];
    const tEnd = fallBack(Lk, aK + 0.06, -0.45, -1.25);
    const vic = { keys: seq(LS, Lk), dur: 30, adv: [0, 0] };
    const bp = hp(H, tT), tg = lp(vic.keys, aT, 'Spine2');
    const D = bp.z + tg.z + 0.1, X = -tg.x - bp.x;
    ctx.info.heart = { bladeY: +bp.y.toFixed(2), targetY: +tg.y.toFixed(2), D: +D.toFixed(2) };
    const b = new B('Сквозь сердце');
    b.pose('leshy', 0, vic, 0);
    runIn(b, tRun, D, X, 2.6);
    b.pose('hero', tRun, mv, 0.12);
    b.hit(aB, 'leshy', 'heavy', 'shield'); b.hit(aT, 'leshy', 'finisher', 'blade'); b.hit(aK, 'leshy', 'kick', 'footR');
    b.note(0, 'Леший оглушён'); b.note(aB, 'Щитом в грудь — на колени'); b.note(aT - 0.4, 'Клинок в сердце'); b.note(aK, 'Пинком прочь');
    b.ts = [[0, 1], [aB - 0.03, 1], [aB, 0.12], [aB + 0.05, 0.3], [aB + 0.2, 1], [aT - 0.55, 1], [aT - 0.35, 0.45], [aT - 0.02, 0.45], [aT, 0.05], [aT + 0.05, 0.05], [aT + 0.14, 0.28], [aT + 0.9, 0.35], [aT + 1.15, 1], [aK - 0.03, 1], [aK, 0.3], [aK + 0.4, 0.5], [aK + 0.8, 1]];
    shot(b, 0, aB - 0.1, { who: 'hero', bone: 'Spine2' }, [[0, 0.32, 0.1, 6.6, 30], [aB - 0.1, 0.3, 0.08, 4.4, 34]]);
    shot(b, aB - 0.1, aT - 0.42, { who: 'mid', bone: 'Spine2', off: [0, -0.1, 0] }, [[0, -1.5, 0.08, 3.4, 38], [aT - 0.42 - aB + 0.1, -1.72, 0.05, 3.0, 36]]);
    shot(b, aT - 0.42, aT + 1.2, { who: 'mid', bone: 'Spine2', k: 0.6, off: [0, 0.1, 0] }, [[0, -1.85, 0.03, 2.2, 32], [1.62, -1.98, 0.0, 1.85, 30]]);
    shot(b, aT + 1.2, tEnd + 0.1, { who: 'leshy', bone: 'Hips' }, [[0, -1.3, 0.1, 4.6, 40], [tEnd + 0.1 - aT - 1.2, -1.18, 0.14, 5.0, 40]]);
    shot(b, tEnd + 0.1, tRun + 5.6 + 0.4, { who: 'hero', bone: 'Head', off: [0, -0.05, 0] }, [[0, 0.5, 0.0, 2.1, 34], [tRun + 6 - tEnd - 0.1, 0.72, 0.06, 2.8, 36]]);
    b.trail.push({ t0: aT - 0.2, t1: aT + 0.05, src: 'blade' }, { t0: aK - 0.08, t1: aK + 0.15, src: 'footR' });
    fx(b, aB, 'shake', { s: 0.35 });
    fx(b, aB + 0.62, 'dust', { who: 'leshy', bone: 'Hips', n: 12, r: 1.2 });
    fx(b, aT, 'flash', { s: 0.6 }); fx(b, aT, 'chips', { who: 'leshy', bone: 'Spine1', n: 40 });
    fx(b, aT + 0.5, 'chips', { who: 'leshy', bone: 'Spine1', n: 12 });
    fx(b, tEnd - 0.3, 'dust', { who: 'leshy', bone: 'Spine1', n: 20, r: 1.6 }); fx(b, tEnd - 0.3, 'shake', { s: 0.5 });
    b.cine = { t0: 0, t1: tRun + 6, title: 'Сквозь сердце', sub: 'добивание Богатыря' };
    S.finHeart = b.done(tRun + 6);
  }

  // ================================================================ HERO 3: «Перунов вихрь» — knee cut, spinning leap, neck cut
  {
    const tRun = 1.0, tC = 0.26, tW = 1.0;
    const fl = HS.fL, fr = HS.fR;
    const L = [
      [0, { hips: [0, 0.74, 0], hp: 14 }],
      [0.13, { hips: [0, 0.58, 0.3], hy: -40, hp: 26, cy: -30, ny: 36, np: -10, hR: [-0.16, -0.2, -0.12], eR: [-0.8, -0.2, 0.2], bl: [-0.3, -0.05, -0.95], fL: [0.14, A + 0.08, 0.7], fR: [fr[0], A, -0.05], tR: 15 }],
      [tC, { hips: [0, 0.5, 0.85], hy: -4, hp: 30, cy: 30, cp: 14, ny: -10, np: -8, hR: [0.08, -0.12, 0.3], eR: [-0.6, -0.4, 0.2], bl: [0.35, -0.05, 0.94], fL: [0.14, A, 1.2], fR: [fr[0], A, 0.05], tR: 25 }],
      [0.4, { hips: [0, 0.52, 0.88], hy: 10, cy: 40, hR: [0.3, -0.22, 0.18], eR: [-0.3, -0.7, 0.3], bl: [0.95, -0.25, -0.1] }],
      [0.56, { hips: [0, 0.54, 0.8], hy: -10, hp: 22, cy: -20, cp: 10, ny: 22, np: -16, hR: [-0.3, -0.12, -0.12], eR: [-0.8, -0.2, -0.2], bl: [-0.85, 0.1, -0.5], hL: [0.2, -0.1, 0.15], sh: [0.6, 0, 0.8], fL: [0.14, A, 1.2], fR: [-0.18, A, 0.6], tR: 0 }, true],
    ];
    // airborne spin to the right: the extended sword sweeps through the front at sp = -270
    const spin = [[0.66, -20, 0.6, 0.8], [0.74, -80, 0.8, 0.82], [0.82, -150, 0.93, 0.84], [0.9, -210, 0.96, 0.86], [tW, -270, 0.92, 0.88], [1.08, -320, 0.84, 0.9], [1.16, -360, 0.72, 0.92]];
    for (const [t, sp, y, z] of spin) {
      const tuck = Math.min(1, (y - 0.55) / 0.4);
      L.push([t, { sp, hips: [0, y, z], hy: 0, hp: 10, cy: 0, cp: 6, ny: 0, np: -6, hR: [-0.38, 0.02, 0.06], eR: [-0.9, 0, 0], bl: [-1, 0.06, 0.1], hL: [-0.08, -0.12, 0.2], eL: [0.8, -0.3, 0.2], sh: [0.4, 0, 1],
        fL: [0.12, Math.max(A, y - 0.66 + 0.24 * tuck), z + 0.12], fR: [-0.13, Math.max(A, y - 0.66 + 0.3 * tuck), z - 0.06], kL: [0.2, 0.3, 1], kR: [-0.2, 0.3, 1], tL: 20 * tuck, tR: 30 * tuck }]);
    }
    L.push(
      [1.3, { sp: -360, hips: [0, 0.5, 0.95], hy: -14, hp: 26, cy: -8, cp: 14, ny: 12, np: -12, fL: [0.14, A, 1.2], fR: [-0.2, A, 0.62], kL: [0.3, 0, 1], kR: [-0.45, 0, 1], tL: 0, tR: 20, hR: [-0.36, -0.14, -0.06], eR: [-0.9, -0.1, -0.1], bl: [-0.8, -0.22, -0.55], hL: [0.24, -0.08, 0.1], sh: [0.7, 0, 0.6] }],
      [1.4, { sp: -360, hips: [0, 0.48, 0.95] }, true],
      [2.7, { sp: -360, np: -16 }, true],
      [3.1, { sp: -360, hips: [0, 0.77, 0.95], hy: -20, hp: 5, cp: 6, cy: 8, ny: 12, np: -6, fL: [0.13, A, 1.12], fR: [-0.18, A, 0.8], tR: 0, hR: [-0.28, -0.2, 0.18], bl: [-0.7, -0.2, 0.68], eR: [-0.8, -0.4, 0.2], hL: [-0.17, -0.1, 0.26], sh: [0.2, 0.05, 1] }],
      [3.26, { sp: -360, hR: [-0.33, -0.26, 0.02], bl: [-0.6, -0.7, -0.3] }],
      [3.8, { sp: -360, hips: [0, 0.77, 0.95], fL: [0.13, A, 1.12], fR: [-0.18, A, 0.8], hR: HS.hR, bl: HS.bl, eR: HS.eR, hy: HS.hy, cy: HS.cy, ny: HS.ny, np: HS.np, hL: HS.hL }],
    );
    const H = seq(HS, L);
    const mv = { keys: H, dur: 3.8, hit: tW, adv: [0, 0.95] };
    const aC = tRun + tC, aW = tRun + tW;
    const Lk = [[0, LST], [0.5, mix(LST, { hr: -4 })], [1.0, mix(LST, { hr: 3 })], [aC - 0.02, LST],
      [aC + 0.08, mix(LST, { hips: [0, 0.92, -0.06], hp: 20, hr: 8, cp: 10, np: -24, fR: [-0.3, LA + 0.06, -0.3], tR: 30, hR: [-0.4, -0.3, 0.1], hL: [0.4, -0.3, 0.12] })],
      [aC + 0.42, LK1],
      [aW - 0.3, mix(LK1, { np: -18, cp: 16 })],
      [aW + 0.05, mix(LK1, { hips: [0, 0.72, -0.16], hp: 4, cy: -26, cr: -10, ny: -40, np: -18, hR: [-0.45, -0.25, 0.0], hL: [0.42, -0.2, 0.12], eR: [-0.9, 0.2, -0.3], eL: [0.9, 0.2, -0.3] })],
      [aW + 0.9, mix(LK1, { hips: [0, 0.71, -0.16], hp: 6, cy: -30, cr: -12, ny: -44, np: -14, hR: [-0.46, -0.28, 0.0], hL: [0.44, -0.24, 0.1] })],
      [aW + 1.6, mix(LK1, { hips: [0, 0.64, -0.2], hp: 36, cp: 40, cy: -8, cr: -4, ny: -10, np: 42, hR: [-0.14, -0.62, 0.26], hL: [0.12, -0.62, 0.3], eR: [-0.6, -0.4, -0.5] })],
      [aW + 1.85, mix(LK1, { hips: [0, 0.63, -0.2], hp: 38, cp: 42, cy: -8, cr: -4, ny: -10, np: 44, hR: [-0.14, -0.62, 0.27], hL: [0.12, -0.62, 0.31] }), true]];
    const vic = { keys: seq(LS, Lk), dur: 30, adv: [0, 0] };
    // place by the spinning cut: blade through the kneeling Leshy's neck
    const bp = hp(H, tW), tg = lp(vic.keys, aW, 'Neck');
    const D = bp.z + tg.z + 0.12, X = -tg.x - bp.x;
    const kc = hp(H, tC), kn = lp(vic.keys, aC, 'RightLeg');
    ctx.info.whirl = { bladeY: +bp.y.toFixed(2), neckY: +tg.y.toFixed(2), D: +D.toFixed(2), kneeCutY: +kc.y.toFixed(2), kneeY: +kn.y.toFixed(2), kneeGap: +(D - kc.z - kn.z).toFixed(2) };
    const b = new B('Перунов вихрь');
    b.pose('leshy', 0, vic, 0);
    runIn(b, tRun, D, X, 3.2);
    b.pose('hero', tRun, mv, 0.12);
    b.hit(aC, 'leshy', 'heavy', 'blade'); b.hit(aW, 'leshy', 'finisher', 'blade');
    b.note(0, 'Леший оглушён; разбег'); b.note(aC, 'Подсечка под колено'); b.note(tRun + 0.6, 'Вихрь в прыжке'); b.note(aW + 1.2, 'Леший замер на колене');
    b.ts = [[0, 1], [aC - 0.02, 1], [aC, 0.2], [aC + 0.06, 0.3], [aC + 0.2, 1], [tRun + 0.62, 1], [tRun + 0.7, 0.4], [aW - 0.05, 0.4], [aW - 0.01, 0.05], [aW + 0.035, 0.05], [aW + 0.1, 0.22], [tRun + 1.4, 0.25], [tRun + 1.9, 1]];
    shot(b, 0, aC + 0.25, { who: 'mid', bone: 'Hips' }, [[0, -1.3, 0.05, 6.0, 34], [aC + 0.25, -1.55, 0.02, 4.4, 36]]);
    shot(b, aC + 0.25, aW + 0.14, { who: 'hero', bone: 'Hips', off: [0, 0.25, 0] }, [[0, -2.0, -0.05, 3.1, 38], [aW + 0.14 - aC - 0.25, -3.5, 0.04, 2.9, 34, 'lin']]);
    shot(b, aW + 0.14, tRun + 2.3, { who: 'mid', bone: 'Neck' }, [[0, -1.9, 0.05, 3.2, 34], [tRun + 2.3 - aW - 0.14, -1.75, 0.08, 3.5, 36]]);
    shot(b, tRun + 2.3, tRun + 4.6, { who: 'mid', bone: 'Hips' }, [[0, 2.5, 0.2, 5.2, 38], [2.3, 2.85, 0.26, 6.0, 40]]);
    b.trail.push({ t0: aC - 0.12, t1: aC + 0.12, src: 'blade' }, { t0: tRun + 0.68, t1: tRun + 1.18, src: 'blade' });
    fx(b, aC, 'chips', { who: 'leshy', bone: 'RightLeg', n: 18 });
    fx(b, aC + 0.42, 'dust', { who: 'leshy', bone: 'RightLeg', n: 10, r: 1.0 });
    fx(b, aW, 'flash', { s: 0.65 }); fx(b, aW, 'chips', { who: 'leshy', bone: 'Neck', n: 44 });
    fx(b, tRun + 1.3, 'dust', { who: 'hero', bone: 'Hips', n: 12, r: 1.0 }); fx(b, tRun + 1.3, 'shake', { s: 0.35 });
    fx(b, aW + 1.6, 'dust', { who: 'leshy', bone: 'Hips', n: 8, r: 0.9 });
    b.cine = { t0: 0, t1: tRun + 4.6, title: 'Перунов вихрь', sub: 'добивание Богатыря' };
    S.finWhirl = b.done(tRun + 4.6);
  }

  // ================================================================ LESHY: shared stalk (two slow steps towards the kneeling hero)
  const stalk = () => [
    [0, {}],
    [0.45, { hips: [0.02, 1.0, 0.1], hr: -4, fR: [-0.3, LA + 0.14, 0.12], tR: 15, np: -20 }],
    [0.75, { hips: [0.0, 1.03, 0.24], hr: 0, fR: [-0.3, LA, 0.42], tR: 0 }],
    [1.1, { hips: [-0.02, 1.0, 0.4], hr: 4, fL: [0.3, LA + 0.14, 0.42], tL: 15 }],
    [1.4, { hips: [0, 1.03, 0.52], hr: 0, fL: [0.3, LA, 0.72], tL: 0 }],
  ];
  const heroKneel = (extra = []) => {
    const L = [[0, HK], [0.8, mix(HK, { hips: [0, 0.44, -0.08], np: 30 })], [1.6, mix(HK, { hips: [0, 0.455, -0.08], np: 24 })]];
    return L.concat(extra);
  };

  // ================================================================ LESHY 1: «Хватка чащи» — grab, lift, roar, slam
  {
    const tG = 1.85, tS = 4.35;
    const Lk = stalk().concat([
      [1.62, { hips: [0, 1.0, 0.46], hy: -10, hp: 10, cy: -30, np: -18, hR: [-0.45, 0.1, -0.25], eR: [-0.9, 0.3, -0.3], hL: [0.3, -0.35, 0.3] }, true],
      [tG, { hips: [0, 0.9, 0.74], hy: 0, hp: 32, cy: 10, cp: 16, np: -34, hR: [-0.02, -0.42, 0.46], eR: [-0.9, 0.0, -0.2], fL: [0.3, LA, 0.95], fR: [-0.3, LA + 0.05, 0.42], tR: 20 }],
      [2.15, { hips: [0, 0.98, 0.66], hp: 16, cy: 4, cp: 6, np: -24, hR: [-0.02, -0.12, 0.52], fR: [-0.3, LA, 0.48], tR: 0 }],
      [2.75, { hips: [0, 1.12, 0.58], hp: -4, cy: 0, cp: -14, np: -12, hR: [-0.02, 0.14, 0.5], eR: [-0.9, 0.0, -0.2], hL: [0.45, 0.0, 0.15], eL: [0.9, 0.2, -0.3] }],
      [3.0, { cp: -18, np: -20 }],
      [3.9, { hips: [0, 1.12, 0.58], cp: -16, np: -16, hR: [-0.02, 0.15, 0.5] }, true],
      [4.12, { hips: [0, 1.17, 0.5], hp: -10, cp: -20, np: -14, hR: [-0.02, 0.48, 0.16], hL: [0.5, 0.1, 0.0] }, true],
      [tS, { hips: [0, 0.78, 0.8], hp: 46, cp: 28, np: -40, hR: [-0.04, -0.45, 0.62], eR: [-0.9, 0.2, 0], hL: [0.35, -0.4, 0.3], fL: [0.32, LA, 1.06], kL: [0.5, 0, 1] }],
      [4.5, { hips: [0, 0.75, 0.82], hp: 50 }],
      [5.2, { hips: [0, 0.76, 0.82], hp: 48 }, true],
      [5.75, { hips: [0, 1.04, 0.72], hp: 14, cp: 10, np: -20, hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3], eR: [-0.8, -0.1, -0.5], fR: [-0.3, LA, 0.6] }],
      [6.2, Object.assign({ hips: [0, 1.12, 0.68] }, LROAR)],
      [7.4, Object.assign({ hips: [0, 1.11, 0.68] }, LROAR, { np: -42 }), true],
      [8.1, { hips: [0, 1.03, 0.7], hp: 14, cp: 12, np: -24, hR: LS.hR, hL: LS.hL, eR: LS.eR, eL: LS.eL }],
    ]);
    const lesh = { keys: seq(LS, Lk), dur: 30, hit: tG, adv: [0, 0] };
    // hero: kneels, looks up, lifts the sword weakly; then the claw carries him (keys follow the claw, sampled)
    const base = seq(HK, heroKneel([
      [1.45, mix(HK, { np: -8, ny: 0, cp: 4 })],
      [tG - 0.1, mix(HK, { np: -16, cp: 0, hR: [0.02, -0.02, 0.32], bl: [0.1, 0.55, 0.83] })],
      [tG + 0.15, { hips: [0, 0.6, -0.08], hp: 4, cp: -6, np: -24, hR: [0.06, 0.08, 0.3], bl: [0.25, 0.8, 0.5], hL: [-0.05, 0.08, 0.26], eL: [0.8, -0.2, 0], sh: [0.4, 0.2, 1], tR: 20, kR: [-0.2, 0, 1] }],
      [2.8, { hp: 2, cp: -10, np: -30, hR: [0.08, 0.14, 0.3], hL: [-0.06, 0.14, 0.26] }],
      [3.3, { hp: -2, np: -26, hR: [0.02, 0.2, 0.26], bl: [0.2, 0.9, 0.3] }],
      [3.9, { hp: 2, np: -28, hR: [0.08, 0.12, 0.3] }],
      [4.12, { hp: -10, cp: -14, np: -10, hR: [-0.22, 0.1, 0.1], hL: [0.24, 0.1, 0.1], bl: [-0.3, 0.8, 0.5] }],
      [tS, mix(HLIE(0), { hips: [0, 0.2, 0] })],
      [tS + 0.15, HLIE(0)],
      [8.1, HLIE(0), true],
    ]));
    // where the hero kneels: his chest under the claw at the grab
    const cg = lp(lesh.keys, tG, 'clawR'), ch = hp(base, tG, 'Spine2');
    const X = -cg.x - ch.x, Z = -cg.z - 0.1 - ch.z;
    const out = [];
    const tA = tG, tB = tS + 0.15, fill = (P, t) => { P.t = t; P.stop = false; out.push(P); };
    for (let t = 0; t <= 8.1 + 1e-6; t += 0.05) {
      const P = sample(base, t, {}); const k = {};
      for (const f in P) k[f] = Array.isArray(P[f]) ? P[f].slice() : P[f];
      if (t >= tA - 1e-6 && t <= tB + 1e-6) {
        const c = lp(lesh.keys, t, 'clawR'), cw = [-c.x - X, c.y, -c.z - Z];
        const w = Math.min(1, (t - tA) / 0.15), off = pitch([0, -0.42, -0.1], k.hp);
        const hz = add3(cw, off);
        k.hips = k.hips.map((v, i) => v + (hz[i] - v) * w);
        if (t < tS - 0.25) {       // dangling, kicking legs
          const ph = (t - tA) * 9, kick = 0.1 * Math.sin(ph) * w;
          const dl = pitch([0.12, -0.66, 0.06 + kick], k.hp), dr = pitch([-0.13, -0.64, 0.04 - kick], k.hp);
          const fLd = add3(k.hips, dl), fRd = add3(k.hips, dr);
          k.fL = k.fL.map((v, i) => v + (fLd[i] - v) * w); k.fR = k.fR.map((v, i) => v + (fRd[i] - v) * w);
          k.fL[1] = Math.max(A, k.fL[1]); k.fR[1] = Math.max(k.fR[1] > 0.11 ? A : 0.12, k.fR[1]);
          k.kL = [0.2, 0, 1]; k.kR = [-0.2, 0, 1]; k.tL = 30 * w; k.tR = (1 - w) * 60 + 30 * w;
        } else {
          const lie = Math.min(1, (t - (tS - 0.25)) / 0.4);
          const fLd = add3(k.hips, pitch([0.15, -0.6, 0.12], k.hp)), fRd = add3(k.hips, pitch([-0.18, -0.58, 0.1], k.hp));
          fLd[1] = Math.max(A, fLd[1]); fRd[1] = Math.max(A, fRd[1]);
          k.fL = fLd; k.fR = fRd; k.tL = 30 * (1 - lie); k.tR = 30 * (1 - lie); k.kL = [0.2, 1, 0.3]; k.kR = [-0.2, 1, 0.3];
        }
        k.hips[1] = Math.max(0.13, k.hips[1]);
      } else if (t > tB) {
        const last = out.find((o) => Math.abs(o.t - tB) < 0.026) || out[out.length - 1];
        const z = last.hips[2];
        Object.assign(k, HLIE(z), { hips: [last.hips[0], 0.13, z], fL: [last.hips[0] + 0.15, A, z + 0.6], fR: [last.hips[0] - 0.2, A, z + 0.56] });
        if (t > 6.0) k.np = 30;
      }
      fill(k, +t.toFixed(3));
    }
    const hero = { keys: out, dur: 30, adv: [0, 0] };
    const b = new B('Хватка чащи');
    b.place('hero', X, Z);
    b.pose('leshy', 0, lesh, 0); b.pose('hero', 0, hero, 0);
    b.hit(tG, 'hero', 'heavy', 'clawR'); b.hit(tS, 'ground', 'leap', 'claws'); b.hit(tS + 0.02, 'hero', 'heavy', 'body'); b.hit(3.0, 'ground', 'roar', 'body'); b.hit(6.3, 'ground', 'roar', 'body');
    b.note(0, 'Богатырь без сил на колене'); b.note(tG, 'Леший хватает его лапой'); b.note(2.8, 'Поднимает к морде и ревёт'); b.note(tS, 'Бросок оземь'); b.note(6.0, 'Рёв над поверженным');
    b.ts = [[0, 1], [tG - 0.03, 1], [tG, 0.25], [tG + 0.2, 1], [2.9, 1], [3.0, 0.5], [3.4, 1], [tS - 0.05, 1], [tS - 0.01, 0.05], [tS + 0.04, 0.05], [tS + 0.12, 0.3], [tS + 0.6, 0.4], [tS + 0.9, 1]];
    shot(b, 0, 1.55, { who: 'hero', bone: 'Head' }, [[0, Math.PI + 0.55, 0.02, 2.6, 34], [1.55, Math.PI + 0.42, 0.06, 2.3, 34]]);
    shot(b, 1.55, 2.45, { who: 'mid', bone: 'Spine2' }, [[0, -1.6, 0.1, 3.8, 38], [0.9, -1.45, 0.06, 3.5, 38]]);
    shot(b, 2.45, 3.95, { who: 'mid', bone: 'Head', k: 0.5 }, [[0, -1.9, -0.12, 2.6, 32], [1.5, -2.05, -0.16, 2.3, 30]]);
    shot(b, 3.95, 5.4, { who: 'mid', bone: 'Hips', k: 0.35 }, [[0, -1.9, 0.12, 4.6, 40], [1.45, -2.1, 0.2, 4.4, 40]]);
    shot(b, 5.4, 8.6, { who: 'hero', bone: 'Head', off: [0, 0.05, 0] }, [[0, Math.PI - 0.3, 0.08, 2.4, 36], [3.2, Math.PI - 0.5, 0.12, 3.0, 40]]);
    b.trail.push({ t0: tG - 0.2, t1: tG + 0.02, src: 'clawR' }, { t0: 4.15, t1: tS + 0.02, src: 'clawR' });
    fx(b, tG, 'shake', { s: 0.3 });
    fx(b, tS, 'flash', { s: 0.45, color: '#fff3d6' }); fx(b, tS, 'dust', { who: 'hero', bone: 'Spine2', n: 24, r: 1.6 }); fx(b, tS, 'shake', { s: 0.9 });
    b.cine = { t0: 0, t1: 8.6, title: 'Хватка чащи', sub: 'добивание Лешего' };
    S.lgGrab = b.done(8.6);
  }

  // ================================================================ LESHY 2: «Гнев бурелома» — overhead crush through the shield
  {
    const tS = 2.95;
    const Lk = stalk().concat([
      [1.9, { hips: [0, 1.14, 0.46], hp: -8, cp: -18, np: -30, hR: [-0.2, 0.52, 0.04], hL: [0.2, 0.52, 0.04], eR: [-0.9, 0.4, -0.3], eL: [0.9, 0.4, -0.3] }],
      [2.25, { hips: [0, 1.17, 0.44], hp: -12, cp: -24, np: -40, hR: [-0.16, 0.58, -0.04], hL: [0.16, 0.58, -0.04] }],
      [2.72, { hips: [0, 1.17, 0.43], hp: -12, cp: -26, np: -36, hR: [-0.14, 0.6, -0.08], hL: [0.14, 0.6, -0.08], fL: [0.3, LA + 0.1, 0.8], tL: 10 }, true],
      [tS, { hips: [0, 0.92, 0.74], hp: 30, cp: 22, np: -30, hR: [-0.07, 0.05, 0.56], hL: [0.07, 0.05, 0.56], eR: [-0.9, 0.2, 0], eL: [0.9, 0.2, 0], fL: [0.32, LA, 1.0], tL: 0 }],
      [3.05, { fL: [0.32, LA + 0.1, 1.1], tL: 10 }],
      [3.2, { fL: [0.32, LA, 1.2], tL: 0 }],
      [3.12, { hips: [0, 0.74, 0.98], hp: 48, cp: 30, np: -40, hR: [-0.08, -0.56, 0.42], hL: [0.08, -0.56, 0.42] }],
      [3.9, { hips: [0, 0.75, 0.98], hp: 47, cp: 30 }, true],
      [4.25, { hips: [0.12, 0.95, 0.95], hp: 22, cp: 8, np: -26, hR: [-0.32, 0.4, 0.08], eR: [-0.9, 0.4, -0.3], hL: [0.08, -0.5, 0.46] }, true],
      [4.42, { hips: [0.25, 0.76, 1.15], hp: 48, cp: 30, np: -42, hR: [0.15, -0.5, 0.62], eR: [-0.9, 0.2, 0], fL: [0.42, LA, 1.3], fR: [-0.2, LA, 0.75] }],
      [5.1, { hips: [0.25, 0.77, 1.15], hp: 46 }, true],
      [5.7, { hips: [0, 1.04, 0.8], hp: 14, cp: 10, np: -20, hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3], fR: [-0.3, LA, 0.62] }],
      [6.1, Object.assign({ hips: [0, 1.12, 0.68] }, LROAR)],
      [7.3, Object.assign({ hips: [0, 1.11, 0.68] }, LROAR, { np: -42 }), true],
      [8.0, { hips: [0, 1.03, 0.7], hp: 14, cp: 12, np: -24, hR: LS.hR, hL: LS.hL, eR: LS.eR, eL: LS.eL }],
    ]);
    const lesh = { keys: seq(LS, Lk), dur: 30, hit: tS, adv: [0, 0] };
    const SH = { hips: [0, 0.47, -0.06], hp: 6, cp: -4, np: -24, hL: [-0.06, 0.36, 0.12], sh: [0.05, 1, 0.3], eL: [0.85, 0.3, 0.2], hR: [-0.18, -0.2, -0.02], bl: [-0.35, -0.3, -0.88], eR: [-0.8, -0.4, -0.2] };
    const zl = -0.22;
    const H = seq(HK, heroKneel([
      [1.35, mix(HK, { np: -10, cp: 6 })],
      [1.8, mix(HK, SH)],
      [tS - 0.03, mix(HK, SH), true],
      [tS + 0.07, mix(HK, SH, { hips: [0, 0.36, -0.14], hp: 26, cp: 18, np: -4, hL: [-0.06, 0.22, 0.16] })],
      [tS + 0.2, mix(HLIE(zl), { hips: [0, 0.2, zl], hp: -70, hL: [-0.06, 0.25, 0.08], sh: [0.0, 1, -0.2] })],
      [tS + 0.32, mix(HLIE(zl), { hL: [-0.04, 0.22, 0.05], sh: [0, 1, -0.3], eL: [0.8, 0.2, 0] })],
      [3.9, mix(HLIE(zl), { hL: [-0.04, 0.2, 0.05], sh: [0, 1, -0.3], eL: [0.8, 0.2, 0], np: 18 }), true],
      [4.42, mix(HLIE(zl), { hips: [0, 0.11, zl], cp: 4, np: 12, hL: [0.3, -0.06, -0.06], sh: [0.3, 1, 0] })],
      [4.62, HLIE(zl)],
      [8.0, mix(HLIE(zl), { np: 30 }), true],
    ]));
    const hero = { keys: H, dur: 30, adv: [0, 0] };
    const cp = lp(lesh.keys, tS, 'claws'), sp = hp(H, tS, 'shield');
    const X = -cp.x - sp.x, Z = -cp.z - sp.z - 0.06;
    ctx.info.crush = { clawY: +cp.y.toFixed(2), shieldY: +sp.y.toFixed(2) };
    const b = new B('Гнев бурелома');
    b.place('hero', X, Z);
    b.pose('leshy', 0, lesh, 0); b.pose('hero', 0, hero, 0);
    b.hit(2.2, 'ground', 'roar', 'body'); b.hit(tS, 'hero', 'block', 'shield'); b.hit(3.12, 'ground', 'leap', 'claws'); b.hit(4.42, 'hero', 'heavy', 'clawR');
    b.note(0, 'Богатырь без сил'); b.note(1.8, 'Последний заслон: щит над головой'); b.note(tS, 'Удар бурелома'); b.note(4.42, 'Добивающий удар'); b.note(6.0, 'Рёв над поверженным');
    b.ts = [[0, 1], [2.6, 1], [2.75, 0.45], [tS - 0.02, 0.45], [tS, 0.05], [tS + 0.05, 0.05], [tS + 0.14, 0.3], [3.3, 0.4], [3.6, 1], [4.4, 1], [4.42, 0.2], [4.6, 1]];
    shot(b, 0, 1.75, { who: 'mid', bone: 'Spine2' }, [[0, -1.5, 0.12, 4.6, 38], [1.75, -1.35, 0.1, 4.2, 38]]);
    shot(b, 1.75, 3.4, { who: 'mid', bone: 'Spine2', k: 0.6, off: [0, 0.2, 0] }, [[0, Math.PI + 1.0, -0.12, 4.6, 40], [1.65, Math.PI + 0.85, -0.16, 4.2, 42]]);
    shot(b, 3.4, 5.3, { who: 'mid', bone: 'Hips' }, [[0, -1.75, 0.18, 3.6, 38], [1.9, -1.6, 0.2, 3.9, 38]]);
    shot(b, 5.3, 8.5, { who: 'leshy', bone: 'Head' }, [[0, Math.PI - 0.6, -0.25, 3.6, 40], [3.2, Math.PI - 0.8, -0.2, 4.2, 42]]);
    b.trail.push({ t0: 2.8, t1: 3.1, src: 'clawR' }, { t0: 2.8, t1: 3.1, src: 'clawL' }, { t0: 4.3, t1: 4.44, src: 'clawR' });
    fx(b, 2.2, 'shake', { s: 0.35 });
    fx(b, tS, 'flash', { s: 0.55, color: '#fff3d6' }); fx(b, tS, 'splinters', { who: 'hero', src: 'shield', n: 34 }); fx(b, tS, 'shake', { s: 0.8 });
    fx(b, 3.12, 'dust', { who: 'hero', bone: 'Spine2', n: 24, r: 1.8 });
    fx(b, 4.42, 'dust', { who: 'hero', bone: 'Spine2', n: 12, r: 1.0 }); fx(b, 4.42, 'shake', { s: 0.6 });
    b.cine = { t0: 0, t1: 8.5, title: 'Гнев бурелома', sub: 'добивание Лешего' };
    S.lgCrush = b.done(8.5);
  }

  // ================================================================ LESHY 3: «Звериная расправа» — pounce, pin, rake
  {
    const tP = 1.72;               // claws reach the hero
        const fl = HS.fL, fr = HS.fR;
    // hero: guard up, struck, thrown on his back; shield over the chest; then it is torn away
    const zl = -0.75;
    const lieShield = mix(HLIE(zl), { hL: [-0.1, 0.3, 0.02], eL: [0.8, 0.3, 0], sh: [0, 1, 0.15], hR: [-0.3, -0.06, 0.02] });
    const H = seq(HS, [
      [0, {}],
      [0.7, HSGUARD()],
      [tP - 0.02, HSGUARD(), true],
      [tP + 0.1, { hips: [0, 0.74, -0.16], hp: -24, cp: -14, np: -22, hL: [-0.1, 0.12, 0.2], sh: [0.1, 0.5, 1] }],
      [tP + 0.3, { hips: [0, 0.55, -0.42], hp: -52, cp: -8, np: 0, fL: [0.12, A + 0.18, 0.0], kL: [0.2, 0.5, 1], fR: [-0.16, A, -0.32], tR: 20 }],
      [tP + 0.48, mix(HLIE(zl), { hips: [0, 0.16, zl], hp: -80 })],
      [tP + 0.6, mix(HLIE(zl), { hips: [0, 0.14, zl] })],
      [2.45, lieShield, true],
      [2.86, mix(lieShield, { hips: [0, 0.12, zl], cp: 2, hL: [-0.08, 0.24, 0.0] })],
      [3.0, lieShield, true],
      [3.32, mix(HLIE(zl), { hips: [0, 0.12, zl], cp: 4, np: 14, hL: [0.36, 0.02, 0.0], sh: [1, 0.2, 0], hR: [-0.3, 0.1, 0.06] })],
      [3.5, mix(HLIE(zl), { hR: [-0.18, 0.2, 0.08], hL: [0.3, 0.0, 0.0], sh: [1, 0.3, 0], bl: [-0.4, 0.7, 0.6] })],
      [3.78, mix(HLIE(zl), { hips: [0, 0.11, zl], cp: 6, np: 10, hR: [-0.34, -0.06, -0.06], hL: [0.34, -0.06, -0.06], sh: [0.4, 1, 0] })],
      [4.0, HLIE(zl)],
      [7.4, mix(HLIE(zl), { np: 30 }), true],
    ]);
    function HSGUARD() { return { hips: [0, 0.71, 0], hy: -24, hp: 10, cy: 6, cp: 10, ny: 18, np: -14, hL: [-0.21, 0.05, 0.26], sh: [0.12, 0.08, 1], eL: [0.8, -0.3, -0.1], hR: [-0.06, -0.16, 0.06], bl: [0.15, 0.95, 0.25], eR: [-0.7, -0.6, -0.4], fL: fl.slice(), fR: fr.slice() }; }
    const hero = { keys: H, dur: 30, adv: [0, 0] };
    // the Leshy: crouch, spring, claws on the shoulders, lands on all fours over the body, three rakes, rises and roars
    const mk = (Pz) => {
      const s = (v) => [v[0], v[1], v[2] + Pz];
      const pin = { hp: 56, cp: 24, np: -44, kL: [0.5, 0, 1], kR: [-0.5, 0, 1] };
      return seq(LS, [
        [0, {}],
        [0.55, { hips: [0, 0.8, -0.1], hp: 36, cp: 18, np: -40, hR: [-0.22, -0.32, -0.2], hL: [0.22, -0.32, -0.2], eR: [-0.8, 0.3, -0.3], eL: [0.8, 0.3, -0.3], kL: [0.5, 0, 1], kR: [-0.5, 0, 1] }],
        [1.15, { hips: [0, 0.76, -0.14], hp: 40, np: -44 }, true],
        [1.4, { hips: [0, 1.3, Pz * 0.35], hp: 22, cp: 8, np: -34, fL: [0.3, 0.7, Pz * 0.25], fR: [-0.3, 0.62, Pz * 0.15], kL: [0.4, 0.2, 1], kR: [-0.4, 0.2, 1], tL: 40, tR: 40, hR: [-0.1, 0.05, 0.6], hL: [0.1, 0.05, 0.6], eR: [-0.9, 0, 0], eL: [0.9, 0, 0] }],
        [tP, { hips: [0, 1.12, Pz * 0.72], hp: 30, cp: 12, np: -38, fL: [0.32, 0.5, Pz * 0.6], fR: [-0.32, 0.45, Pz * 0.55], hR: [-0.12, -0.08, 0.6], hL: [0.12, -0.08, 0.6] }],
        [2.0, Object.assign({ hips: s([0, 0.84, 0]), fL: s([0.42, LA, -0.42]), fR: s([-0.42, LA, -0.48]), tL: 0, tR: 0, hR: [-0.16, -0.62, 0.36], hL: [0.16, -0.62, 0.36], eR: [-0.8, 0.3, -0.3], eL: [0.8, 0.3, -0.3] }, pin)],
        [2.1, { hips: s([0, 0.8, 0]) }],
        [2.45, { hips: s([0, 0.84, -0.02]), np: -36 }, true],
        [2.66, { hips: s([0, 0.98, -0.08]), hp: 34, cp: 4, cy: -20, np: -30, hR: [-0.3, 0.28, 0.14], eR: [-0.9, 0.4, -0.3] }],
        [2.86, { hips: s([0, 0.82, 0.02]), hp: 56, cp: 24, cy: 6, np: -46, hR: [-0.1, -0.6, 0.42], eR: [-0.8, 0.3, -0.3] }],
        [3.12, { hips: s([0, 0.96, -0.06]), hp: 36, cy: 22, np: -32, hL: [0.3, 0.28, 0.14], eL: [0.9, 0.4, -0.3] }],
        [3.32, { hips: s([0, 0.82, 0.02]), hp: 56, cy: -6, np: -46, hL: [0.1, -0.6, 0.42], eL: [0.8, 0.3, -0.3] }],
        [3.58, { hips: s([0, 1.04, -0.1]), hp: 22, cp: -6, cy: 0, np: -30, hR: [-0.18, 0.4, 0.1], hL: [0.18, 0.4, 0.1], eR: [-0.9, 0.4, -0.3], eL: [0.9, 0.4, -0.3] }, true],
        [3.78, { hips: s([0, 0.8, 0.04]), hp: 58, cp: 26, np: -48, hR: [-0.1, -0.6, 0.44], hL: [0.1, -0.6, 0.44] }],
        [4.4, { hips: s([0, 0.81, 0.03]), hp: 56 }, true],
        [5.0, { hips: s([0, 1.04, -0.12]), hp: 14, cp: 10, np: -20, hR: [-0.18, -0.5, 0.26], hL: [0.18, -0.48, 0.3], eR: [-0.8, -0.1, -0.5], eL: [0.8, -0.1, -0.5], fL: s([0.4, LA, -0.3]), fR: s([-0.4, LA, -0.45]) }],
        [5.4, Object.assign({ hips: s([0, 1.12, -0.14]) }, LROAR)],
        [6.6, Object.assign({ hips: s([0, 1.11, -0.14]) }, LROAR, { np: -42 }), true],
        [7.4, { hips: s([0, 1.03, -0.12]), hp: 14, cp: 12, np: -24, hR: LS.hR, hL: LS.hL, eR: LS.eR, eL: LS.eL }],
      ]);
    };
    // land the claws on the hero's chest: probe with the landing at 0, then shift
    const D0 = 3.2;
    const k0 = mk(0), c0 = lp(k0, 2.0, 'claws'), chest = hp(H, 2.4, 'Spine2');
    // hero at (X, -D0); his chest (world z) = -D0 + chest.z ; Leshy claws (world z) = -(c0.z + Pz)
    const Pz = D0 - chest.z - c0.z;
    const lesh = { keys: mk(Pz), dur: 30, hit: tP, adv: [0, 0] };
    const X = -c0.x - chest.x;
    ctx.info.maul = { Pz: +Pz.toFixed(2), clawY: +c0.y.toFixed(2), chestY: +chest.y.toFixed(2) };
    const b = new B('Звериная расправа');
    b.place('hero', X, -D0);
    b.pose('leshy', 0, lesh, 0); b.pose('hero', 0, hero, 0);
    b.hit(tP, 'hero', 'heavy', 'claws'); b.hit(2.86, 'hero', 'block', 'shield'); b.hit(3.32, 'hero', 'heavy', 'clawL'); b.hit(3.78, 'hero', 'heavy', 'claws'); b.hit(5.5, 'ground', 'roar', 'body');
    b.note(0, 'Леший припал к земле'); b.note(1.15, 'Прыжок'); b.note(2.0, 'Придавил к земле'); b.note(2.66, 'Рвёт когтями'); b.note(5.2, 'Рёв над поверженным');
    b.ts = [[0, 1], [1.3, 1], [1.4, 0.4], [tP - 0.02, 0.4], [tP, 0.08], [tP + 0.05, 0.08], [tP + 0.15, 0.5], [2.1, 1], [3.76, 1], [3.78, 0.05], [3.82, 0.05], [3.9, 0.3], [4.3, 1]];
    shot(b, 0, 1.3, { who: 'leshy', bone: 'Head' }, [[0, Math.PI + 1.0, 0.0, 3.0, 34], [1.3, Math.PI + 0.85, -0.04, 2.6, 32]]);
    shot(b, 1.3, 2.25, { who: 'mid', bone: 'Spine2' }, [[0, -1.57, 0.1, 4.6, 40], [0.95, -1.45, 0.12, 4.2, 38]]);
    shot(b, 2.25, 4.5, { who: 'mid', bone: 'Spine2', k: 0.4 }, [[0, Math.PI - 1.35, 0.22, 3.4, 40], [2.25, Math.PI - 1.5, 0.26, 3.2, 40]]);
    shot(b, 4.5, 7.9, { who: 'leshy', bone: 'Spine2' }, [[0, -1.2, -0.12, 5.0, 40], [3.4, -1.0, -0.06, 5.6, 42]]);
    b.trail.push({ t0: 2.7, t1: 2.88, src: 'clawR' }, { t0: 3.16, t1: 3.34, src: 'clawL' }, { t0: 3.6, t1: 3.8, src: 'clawR' }, { t0: 3.6, t1: 3.8, src: 'clawL' });
    fx(b, 2.0, 'dust', { who: 'leshy', bone: 'Hips', n: 16, r: 1.5 }); fx(b, 2.0, 'shake', { s: 0.6 });
    fx(b, 2.86, 'splinters', { who: 'hero', src: 'shield', n: 16 });
    fx(b, 3.78, 'flash', { s: 0.5, color: '#fff3d6' }); fx(b, 3.78, 'dust', { who: 'hero', bone: 'Spine2', n: 14, r: 1.2 }); fx(b, 3.78, 'shake', { s: 0.7 });
    b.cine = { t0: 0, t1: 7.9, title: 'Звериная расправа', sub: 'добивание Лешего' };
    S.lgMaul = b.done(7.9);
  }
}

export const FIN_SRC = { lgGrab: 'clawR', lgCrush: 'claws', lgMaul: 'claws' };
