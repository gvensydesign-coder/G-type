// Бой: a library of combat scenes, hero and Leshy together. Every move is a procedural full-body pose track
// (combat.js) timed like the game (godot-export scripts/combat/tuning.gd hero_moves, SWIPE/SMASH/SLAM/POUNCE_KEYS;
// finisher.gd). Distances are not guessed: each scene asks ctx where the blade / shield / claws really are at the
// hit time and places the actors so the strike lands on the body (or on the shield).
// Duel frame: the Leshy starts at the origin facing -Z, the hero at negative Z facing +Z.
import { heroStepBack, heroMove, heroIdle, leshyIdle, LESHY, heroBlock, heroHold, HGUARD, heroHit, heroKnock, heroDodge, heroDuck,
  leshyHit, leshyStagger, leshyFall, leshyFinisherVictim, heroThrustFin, heroRisingFin } from './combat.js';
import { warp } from './character.js';

const RL = 0.14;            // how far behind the Leshy's front the blade point sits (it cuts into the body a little)
const YAW = { hero: 0, leshy: Math.PI };
let HI, LI;

class B {
  constructor(name) {
    this.name = name;
    this.seg = { hero: [], leshy: [] }; this.pos = { hero: [[0, [0, -2]]], leshy: [[0, [0, 0]]] };
    this.yaw = { hero: [[0, 0]], leshy: [[0, Math.PI]] };
    this.org = { hero: [0, -2], leshy: [0, 0] };
    this.pend = { hero: null, leshy: null };
    this.hits = []; this.notes = []; this.ts = null; this.cam = null; this.dur = 0;
  }
  place(who, x, z) { this.org[who] = [x, z]; this.pos[who] = [[0, [x, z]]]; }
  _flush(who, t) {                 // the previous move's root step happens when it ends (or is cut)
    const p = this.pend[who]; if (!p) return;
    const tt = Math.min(t, p.t), y = YAW[who], [ax, az] = p.adv;
    const dx = ax * Math.cos(y) + az * Math.sin(y), dz = -ax * Math.sin(y) + az * Math.cos(y);
    const o = this.org[who];
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
      this.pos[who].push([tt - 1e-4, o.slice(), 'lin'], [tt, [o[0] + dx, o[1] + dz], 'lin']);
      this.org[who] = [o[0] + dx, o[1] + dz];
    }
    this.pend[who] = null;
  }
  pose(who, t, mv, fade = 0.14) {
    this._flush(who, t);
    this.seg[who].push({ t, mv, fade });
    if (!mv.loop && mv.adv) this.pend[who] = { t: t + mv.dur, adv: mv.adv };
    return t + (mv.hit ?? 0);
  }
  idle(who, t) { this._flush(who, t); this.seg[who].push({ t, mv: who === 'hero' ? HI : LI, fade: 0.2 }); }
  clip(who, t, clip, keys, fade = 0.12) { this._flush(who, t); this.seg[who].push({ t, clip, keys, fade }); }
  move(who, t, x, z, ease = 'lin') { this.pos[who].push([t, [x, z], ease]); this.org[who] = [x, z]; }
  hit(t, who, kind = 'light', src = 'blade') { this.hits.push({ t, who, kind, src }); }
  note(t, text) { this.notes.push([t, text]); }
  done(t) {
    for (const w of ['hero', 'leshy']) {
      this._flush(w, 1e9);
      const L = this.seg[w].sort((a, b) => a.t - b.t), add = [];
      for (let i = 0; i < L.length; i++) {      // idle stance after every finished move
        const s = L[i]; if (!s.mv || s.mv.loop) continue;
        const end = s.t + s.mv.dur, nx = L[i + 1];
        if (!nx || nx.t > end + 1e-3) add.push({ t: end, mv: w === 'hero' ? HI : LI, fade: 0.05 });
      }
      this.seg[w].push(...add); this.seg[w].sort((a, b) => a.t - b.t);
      if (!this.seg[w].length || this.seg[w][0].t > 0) this.seg[w].unshift({ t: 0, mv: w === 'hero' ? HI : LI, fade: 0 });
      this.pos[w].sort((a, b) => a[0] - b[0]);
    }
    this.hits.sort((a, b) => a.t - b.t);
    this.dur = t; return this;
  }
}

export function buildScenes(ctx) {
  HI = heroIdle(); LI = leshyIdle();
  const S = {};
  // forward distance of the striking point at the hit time, and how it grows with the lunge
  const fitCache = {};
  const fit = (id) => {
    if (fitCache[id]) return fitCache[id];
    const a = ctx.heroPoint(heroMove(id, 0)), b = ctx.heroPoint(heroMove(id, 1));
    return (fitCache[id] = { r0: a.z, k: id === 'jkick' ? 0 : Math.max(0.3, b.z - a.z), y: a.y });
  };
  const advFor = (id, D) => { const f = fit(id); if (!f.k) return 0.8; return Math.min(1.15, Math.max(0.12, (D - RL - f.r0) / f.k)); };

  { const b = new B('Стойки: Богатырь и Леший'); b.place('hero', 0, -2.3); b.note(0, 'Боевая стойка: щит вперёд, меч у бедра; Леший сгорблен, когти вниз'); S.stance = b.done(4.2); }

  // ---------------------------------------------------------------- hero attacks
  const series = (ids, title, opt = {}) => {
    const b = new B(title); let t = 0.5, D = null;
    ids.forEach((id, i) => {
      let mv;
      if (D == null) { mv = heroMove(id); const f = fit(id); D = f.r0 + f.k * mv.adv[1] + RL; b.place('hero', 0, -D); }
      else mv = heroMove(id, advFor(id, D));
      const th = b.pose('hero', t, mv, 0.16);
      b.note(t, mv.name);
      const last = i === ids.length - 1;
      if (opt.fall && last) {
        b.hit(th, 'leshy', 'heavy', mv.src); b.pose('leshy', th, leshyFall(0.9), 0.06);
      } else {
        const heavy = mv.heavy || mv.kick, push = heavy ? 0.45 : 0.12;
        b.hit(th, 'leshy', heavy ? 'heavy' : 'light', mv.src);
        b.pose('leshy', th, heavy ? leshyStagger(push) : leshyHit(i % 2 ? -1 : 1, push), 0.06);
        D = D - mv.adv[1] + push;
      }
      // the next swing starts in this one's recovery (the game's combo window)
      t += last ? mv.dur : mv.ph ? mv.ph[0] + mv.ph[1] + mv.ph[2] + mv.ph[3] * 0.45 : mv.dur;
    });
    if (!opt.fall && D < 1.7) { b.pose('hero', t + 0.2, heroStepBack(Math.min(0.8, 1.75 - D)), 0.1); t += 0.9; }
    return b.done(t + (opt.fall ? 4.9 : 0.8));
  };
  S.series = series(['l1', 'l2', 'l3', 'l4', 'l5'], 'Серия из пяти ударов');
  S.fall = series(['l1', 'l4', 'heavyb'], 'Серия и удар снизу: Леший падает', { fall: true });
  for (const id of ['l1', 'l2', 'l3', 'l4', 'l5', 'heavy', 'heavyb', 'bash', 'jkick']) S['m_' + id] = series([id], heroMove(id).name);
  { // strike from a run
    const id = 'dash', mv = heroMove(id), f = fit(id), D = f.r0 + f.k * mv.adv[1] + RL;
    const b = new B(mv.name), run = 1.9, tA = 0.6, v = run / tA;
    b.place('hero', 0, -D - run);
    b.clip('hero', 0, 'Run', [[0, 0], [tA + 0.3, (tA + 0.3) * v / ctx.runSpeed]], 0.05);
    b.move('hero', 0, 0, -D - run); b.move('hero', tA, 0, -D);
    const th = b.pose('hero', tA, mv, 0.12); b.note(0, 'Разбег и удар наискось');
    b.hit(th, 'leshy', 'heavy', 'blade'); b.pose('leshy', th, leshyStagger(0.45), 0.06);
    S.m_dash = b.done(tA + mv.dur + 0.8);
  }

  // ---------------------------------------------------------------- Leshy attacks and answers
  // zc: how far ahead of the Leshy the claws are at the hit; the hero stands where they should land
  const L = (title, mv, place, fn, tail = 1.2) => {
    const b = new B(title), t0 = 0.5;
    const zc = mv.hit != null ? ctx.leshyPoint(mv).z : 0;
    b.place('hero', 0, -(zc + place));
    const th = b.pose('leshy', t0, mv, 0.2);
    fn(b, th, zc);
    return b.done(t0 + mv.dur + tail);
  };
  S.swBlock = L('Размах лапой → блок щитом', LESHY.swipeR, 0.34, (b, h) => {
    b.note(0.5, 'Красное свечение: удар можно держать щитом');
    b.pose('hero', h - 0.55, heroBlock(0.22, 0.55, 0.9, 0.3)); b.hit(h, 'hero', 'block', 'shield');
  });
  S.swDuck = L('Размах другой лапой → нырок и ответ', LESHY.swipeL, 0.1, (b, h) => {
    const mv = heroDuck(0.24, 0.62), t0 = h - 0.42; b.pose('hero', t0, mv);
    b.note(t0, 'Нырок под лапу и низкий ответный удар');
    b.hit(t0 + mv.hit, 'leshy', 'light', 'blade'); b.pose('leshy', t0 + mv.hit, leshyHit(1, 0.4), 0.06);
  });
  S.swHit = L('Размах → пропустил удар', LESHY.swipeR, 0.08, (b, h) => {
    b.hit(h, 'hero', 'heavy', 'clawR'); b.pose('hero', h, heroHit(0.5, true), 0.05);
  });
  S.smBlock = L('Удар обеими сверху → блок, отброшен', LESHY.smash, 0.34, (b, h) => {
    b.pose('hero', h - 0.6, heroBlock(0.24, 0.6, 0.95, 0.55, true)); b.hit(h, 'hero', 'block', 'shield');
  });
  S.smDodge = L('Удар обеими → уклон в сторону', LESHY.smash, 0.1, (b, h) => {
    b.pose('hero', h - 0.42, heroDodge(-1.1, -0.15)); b.note(h - 0.42, 'Уклон вправо в последний момент');
  });
  S.slam = L('Удар оземь (супер) → сбит волной', LESHY.slam, 1.1, (b, h) => {
    b.note(0.5, 'Оранжевое свечение: блок не держит'); b.hit(h, 'ground', 'leap', 'claws');
    b.hit(h + 0.1, 'hero', 'heavy', 'body'); b.pose('hero', h + 0.1, heroKnock(0.8, 0.8), 0.05);
  }, 2.4);
  S.slamDodge = L('Удар оземь → отпрыгнул назад', LESHY.slam, 1.1, (b, h) => {
    b.hit(h, 'ground', 'leapS', 'claws'); b.pose('hero', h - 0.5, heroDodge(0, -1.4)); b.note(h - 0.5, 'Отскок назад из-под волны');
  });
  S.pounce = L('Бросок на четвереньках → сбит с ног', LESHY.pounce, 0.12, (b, h) => {
    b.note(0.5, 'Супер: Леший прыгает на героя'); b.hit(h, 'hero', 'heavy', 'claws'); b.pose('hero', h, heroKnock(0.95, 0.9), 0.05);
  }, 2.2);
  S.pounceDodge = L('Бросок → уход в сторону', LESHY.pounce, 0.12, (b, h) => {
    b.pose('hero', h - 0.5, heroDodge(1.2, 0.1)); b.note(h - 0.5, 'Уклон влево');
  });
  S.reach = L('Тянется схватить → отскок', LESHY.reach, 0.15, (b, h) => {
    b.pose('hero', h - 0.45, heroDodge(0, -1.3)); b.note(h - 0.45, 'Отскок назад от хватки');
  });
  S.taunt = L('Угроза: бьёт себя в грудь', LESHY.beat, 2.0, (b) => { b.pose('hero', 0.6, heroHold(HGUARD.block.pose, 0.3, 2.0, 2.4)); }, 0.8);
  S.roar = L('Рёв ярости (вторая фаза)', LESHY.roar, 2.0, (b, h) => {
    b.hit(h, 'ground', 'roar', 'body'); b.pose('hero', h - 0.3, heroBlock(0.2, 0.32, 1.3, 0.3)); b.hit(h + 0.02, 'hero', 'block', 'shield');
  }, 0.8);

  // ---------------------------------------------------------------- finishers (the Leshy is stunned)
  const FIN = {
    thrust: { title: 'Добивание: укол в грудь', mv: heroThrustFin(), slow: 0.5,
      cam: [[0, [3.4, 1.4, 4.0]], [0.6, [2.8, 1.3, 3.2], 'io'], [0.98, [2.0, 1.45, 1.9], 'io'], [1.15, [1.9, 1.4, 1.8], 'out'], [1.9, [2.6, 1.6, 2.3], 'io'], [2.8, [4.2, 2.0, 4.0], 'io']],
      look: [[0, [0, 1.2, 1.6]], [0.6, [0, 1.2, 1.4]], [0.98, [0, 1.25, 0.9], 'io'], [1.15, [0, 1.25, 0.85], 'out'], [1.9, [0, 1.2, 1.2]], [2.8, [0, 1.2, 1.5], 'io']] },
    rising: { title: 'Добивание: снизу вверх', mv: heroRisingFin(), slow: 0.55,
      cam: [[0, [-3.2, 1.0, 4.2]], [0.7, [-3.0, 0.8, 3.2], 'io'], [1.1, [-2.3, 0.6, 2.0], 'io'], [1.3, [-2.2, 0.7, 1.9], 'out'], [2.1, [-2.8, 1.2, 2.6], 'io'], [3.0, [-4.2, 2.0, 4.0], 'io']],
      look: [[0, [0, 1.2, 1.8]], [0.7, [0, 1.1, 1.5]], [1.1, [0, 1.4, 0.8], 'io'], [1.3, [0, 1.5, 0.7], 'out'], [2.1, [0, 1.2, 1.1]], [3.0, [0, 1.2, 1.5], 'io']] },
  };
  for (const id of ['thrust', 'rising']) {
    const F = FIN[id], b = new B(F.title);
    const tRun = 1.2, tImp = tRun + F.mv.hit, tEnd = tRun + F.mv.dur + 0.6;
    const vic = leshyFinisherVictim(tImp, tEnd - 0.9, tEnd + 0.3);
    b.pose('leshy', 0, vic, 0.1);
    const D = ctx.finDistance(F.mv, vic, tImp);
    const run = 3.0, v = run / tRun;
    b.place('hero', 0, -D - run);
    b.clip('hero', 0, 'Run', [[0, 0], [tRun + 0.4, (tRun + 0.4) * v / ctx.runSpeed]], 0.05);
    b.move('hero', 0, 0, -D - run); b.move('hero', tRun, 0, -D);
    b.pose('hero', tRun, F.mv, 0.12);
    b.hit(tImp, 'leshy', 'finisher', 'blade');
    b.note(0, 'Леший оглушён, падает на колено; разбег и удар');
    b.ts = [[0, 1], [tImp - 0.15, 1], [tImp - 0.03, F.slow], [tImp, 0.12, 'out'], [tImp + 0.16, 0.25], [tImp + 0.45, 1, 'in'], [tEnd + 1, 1]];
    const vf = (a) => [-a[0], a[1], -a[2]];
    b.cam = { t0: tImp - 1.0, pos: F.cam.map(([t, p, e]) => [t, vf(p), e]), look: F.look.map(([t, p, e]) => [t, vf(p), e]), fov: [[0, 46], [0.9, 40], [1.0, 34, 'out'], [1.6, 38], [2.8, 50, 'io']], dur: 2.8 };
    S[id] = b.done(tEnd + 0.4);
  }
  return S;
}

export const DUEL_GROUPS = [
  ['Стойки', ['stance']],
  ['Удары Богатыря', ['series', 'm_l1', 'm_l2', 'm_l3', 'm_l4', 'm_l5', 'm_heavy', 'm_heavyb', 'm_dash', 'm_bash', 'm_jkick', 'fall']],
  ['Атаки Лешего и ответы', ['swBlock', 'swDuck', 'swHit', 'smBlock', 'smDodge', 'slam', 'slamDodge', 'pounce', 'pounceDodge', 'reach', 'taunt', 'roar']],
  ['Добивания', ['thrust', 'rising']],
];

// ------------------------------------------------------------------ evaluation helpers
const EASE = { lin: (x) => x, io: (x) => x * x * (3 - 2 * x), in: (x) => x * x, out: (x) => 1 - (1 - x) * (1 - x) };
export function keyAt(keys, t) {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = EASE[b[2] || 'io']((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
      if (Array.isArray(a[1])) return a[1].map((v, j) => v + (b[1][j] - v) * u);
      return a[1] + (b[1] - a[1]) * u;
    }
  }
  return keys[keys.length - 1][1];
}
export function activeSeg(list, t) { let s = null, p = null; for (const x of list) if (x.t <= t) { p = s; s = x; } if (s) s.prev = p; return s; }
export { warp };
