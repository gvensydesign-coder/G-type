// Бой: a library of combat scenes, hero and Leshy together, built from the game's own timings
// (godot-export scripts/combat/tuning.gd: hero_moves, EM, SWIPE/SMASH/SLAM/POUNCE_KEYS; finisher.gd DEFS).
// A scene is a timeline: per actor a list of clip segments (clip + game-time -> clip-time warp), position and
// yaw keys in the duel frame, procedural pose weights (guard / block), plus hits (spark, flash, shake),
// a time-scale curve and, for finishers, the cinematic camera.
// Duel frame: the Leshy stands at the origin facing -Z, the hero at negative Z facing +Z.
import * as THREE from 'three';
import { warp } from './character.js';

// ------------------------------------------------------------------ game timings
const PH = [0.0, 0.52, 0.6, 0.82, 1.333];          // CLIP_PH for the model's Attack / Attack3 / Attack4
function swing(clip, ph, o) {
  const [w, h, s, r] = ph;
  return { clip, keys: [[0, PH[0]], [w, PH[1], 'io'], [w + h, PH[2], 'in'], [w + h + s, PH[3], 'lin'], [w + h + s + r, PH[4], 'out']], dur: w + h + s + r, hit: w + h + s * 0.5, w, ...o };
}
function mswing(clip, hit, dur, ph, o) {
  const [w, h, s, r] = ph;
  const c = [0, Math.max(0.05, hit - 0.2), hit - 0.07, Math.min(dur - 0.05, hit + 0.12), dur];
  return { clip, keys: [[0, c[0]], [w, c[1], 'io'], [w + h, c[2], 'in'], [w + h + s, c[3], 'lin'], [w + h + s + r, c[4], 'out']], dur: w + h + s + r, hit: w + h + s * 0.5, w, ...o };
}
export const HM = {
  l1: swing('Attack', [0.46, 0.12, 0.13, 0.58], { lunge: 0.55, name: 'Удар наискось' }),
  l2: swing('Attack4', [0.42, 0.1, 0.12, 0.58], { lunge: 0.8, name: 'Выпад' }),
  l3: swing('Attack3', [0.52, 0.16, 0.13, 0.72], { lunge: 0.6, name: 'Удар сверху', poise: 1 }),
  l4: mswing('Sw_C', 0.767, 1.267, [0.44, 0.1, 0.14, 0.56], { lunge: 0.6, name: 'Горизонтальный' }),
  l5: mswing('Sw_B', 0.7, 1.267, [0.52, 0.16, 0.14, 0.74], { lunge: 0.7, name: 'Удар сверху (мокап)', heavy: 1 }),
  l1b: mswing('Sw_A', 0.767, 1.367, [0.46, 0.12, 0.14, 0.58], { lunge: 0.55, name: 'Рубящий наискось' }),
  l2b: mswing('Sw_E', 0.667, 1.167, [0.4, 0.1, 0.12, 0.55], { lunge: 0.95, name: 'Укол' }),
  l3b: mswing('Sw_D', 0.7, 1.167, [0.5, 0.14, 0.13, 0.68], { lunge: 0.6, name: 'Обратный', poise: 1 }),
  l4b: mswing('Sw_K', 0.633, 1.267, [0.44, 0.1, 0.14, 0.56], { lunge: 0.6, name: 'Связка' }),
  l5b: mswing('Sw_G', 0.567, 1.067, [0.5, 0.16, 0.14, 0.7], { lunge: 0.75, name: 'Добивающий', heavy: 1 }),
  heavy: swing('Attack3', [0.8, 0.32, 0.15, 0.9], { lunge: 0.85, heavy: 1, name: 'Тяжёлый сверху' }),
  heavyb: mswing('Sw_Crouch', 0.9, 1.767, [0.85, 0.3, 0.16, 0.9], { lunge: 1.1, heavy: 1, name: 'Тяжёлый снизу вверх' }),
  dash: mswing('Sw_H', 0.6, 1.233, [0.3, 0.08, 0.14, 0.62], { lunge: 2.4, heavy: 1, name: 'Удар с разбега' }),
  kick: mswing('Kick', 0.733, 1.367, [0.36, 0.08, 0.14, 0.5], { lunge: 0.5, kick: 1, name: 'Пинок щитом' }),
  jkick: mswing('JumpKick', 0.733, 1.633, [0.4, 0.12, 0.16, 0.9], { lunge: 0.9, kick: 1, name: 'Удар ногой в прыжке' }),
};
for (const k of ['F', 'I', 'J', 'L', 'M']) HM['sw' + k] = mswing('Sw_' + k, k === 'F' ? 0.633 : 0.7, k === 'F' ? 1.133 : 1.267, [0.44, 0.12, 0.14, 0.6], { lunge: 0.6, name: 'Запасной ' + k });
const SWIPE_KEYS = [[0, 0], [0.75, 0.55, 'io'], [1.0, 0.72, 'in'], [1.25, 0.95, 'lin'], [1.9, 1.267, 'out']];
const SMASH_KEYS = [[0, 0], [0.95, 0.5, 'io'], [1.2, 0.68, 'in'], [1.35, 0.8, 'lin'], [2.2, 1.267, 'out']];
const SLAM_KEYS = [[0, 0], [1.2, 0.85, 'io'], [1.45, 1.25, 'in'], [2.6, 1.867, 'out']];
const POUNCE_KEYS = [[0, 0], [0.55, 0.45, 'io'], [1.2, 1.1, 'lin'], [2.1, 1.767, 'out']];
const STAGGER_KEYS = [[0, 0], [0.25, 0.3, 'out'], [2.3, 2.267, 'io']];
const ROAR_KEYS = [[0, 0], [0.75, 0.55, 'io'], [2.4, 1.767]];

// finishers (finisher.gd), hero track and camera in the victim's frame (+Z = where the victim faces)
const FIN = {
  thrust: {
    dur: 2.8, impact: 1.0, ts: [[0, 1], [0.8, 1], [0.95, 0.5], [1.0, 0.1, 'out'], [1.16, 0.25], [1.45, 1, 'in'], [2.8, 1]],
    pos: [[0, null], [0.55, [0.15, 0, 1.75], 'io'], [1.0, [0.1, 0, 1.45], 'out'], [1.9, [0.1, 0, 1.5]], [2.3, [0.35, 0, 2.7], 'out'], [2.8, [0.35, 0, 2.7]]],
    clip: 'Sw_E', clipT: [[0, 0], [0.5, 0.3], [0.95, 0.6, 'io'], [1.0, 0.667, 'in'], [1.12, 0.72, 'out'], [1.9, 0.8], [2.4, 1.167, 'out'], [2.8, 1.167]],
    run: 0.5, kneel: [[0, 0], [1.0, 0], [1.2, 0.8, 'in'], [1.4, 0.7, 'out'], [1.95, 0.75], [2.7, 0, 'io']],
    cam: [[0, [3.4, 1.4, 4.0]], [0.6, [2.8, 1.3, 3.2], 'io'], [0.98, [2.2, 1.55, 1.9], 'io'], [1.15, [2.1, 1.5, 1.8], 'out'], [1.9, [2.6, 1.6, 2.3], 'io'], [2.8, [4.2, 2.0, 4.0], 'io']],
    look: [[0, [0, 1.3, 1.6]], [0.6, [0, 1.35, 1.4]], [0.98, [0, 1.6, 0.9], 'io'], [1.15, [0, 1.55, 0.85], 'out'], [1.9, [0, 1.3, 1.2]], [2.8, [0, 1.2, 1.5], 'io']],
    fov: [[0, 46], [0.9, 40], [1.0, 34, 'out'], [1.6, 38], [2.8, 50, 'io']],
  },
  rising: {
    dur: 3.0, impact: 1.12, ts: [[0, 1], [0.9, 1], [1.05, 0.55], [1.12, 0.1, 'out'], [1.3, 0.25], [1.6, 1, 'in'], [3.0, 1]],
    pos: [[0, null], [0.6, [-0.2, 0, 2.1], 'io'], [1.12, [-0.15, 0, 1.4], 'out'], [2.0, [-0.15, 0, 1.45]], [2.45, [-0.4, 0, 2.6], 'out'], [3.0, [-0.4, 0, 2.6]]],
    clip: 'Sw_Crouch', clipT: [[0, 0], [0.55, 0.3], [1.05, 0.82, 'io'], [1.12, 0.9, 'in'], [1.25, 1.0, 'out'], [2.3, 1.767, 'out'], [3.0, 1.767]],
    run: 0.55, kneel: [[0, 0], [1.12, 0], [1.3, 1.1, 'in'], [1.45, 0.92, 'out'], [1.6, 1, 'io'], [2.3, 1], [2.95, 0, 'io']],
    cam: [[0, [-3.2, 1.0, 4.2]], [0.7, [-3.0, 0.8, 3.2], 'io'], [1.1, [-2.4, 0.55, 2.0], 'io'], [1.3, [-2.3, 0.6, 1.9], 'out'], [2.1, [-2.8, 1.2, 2.6], 'io'], [3.0, [-4.2, 2.0, 4.0], 'io']],
    look: [[0, [0, 1.3, 1.8]], [0.7, [0, 1.2, 1.5]], [1.1, [0, 1.7, 0.8], 'io'], [1.3, [0, 1.8, 0.7], 'out'], [2.1, [0, 1.3, 1.1]], [3.0, [0, 1.2, 1.5], 'io']],
    fov: [[0, 46], [1.0, 42], [1.12, 34, 'out'], [1.7, 38], [3.0, 50, 'io']],
  },
};

// ------------------------------------------------------------------ scene builder
const H0 = -2.05;           // hero start z
const CONTACT = 1.35;       // closest hero-to-Leshy distance
class B {
  constructor(name) {
    this.name = name;
    this.seg = { hero: [], leshy: [] }; this.pos = { hero: [[0, [0, H0]]], leshy: [[0, [0, 0]]] };
    this.yaw = { hero: [[0, 0]], leshy: [[0, Math.PI]] };
    this.pose = { block: [[0, 0]] };
    this.hits = []; this.notes = []; this.ts = null; this.cam = null; this.dur = 0;
    this.hz = H0; this.lz = 0; this.hx = 0;
  }
  clip(who, t, clip, keys, fade = 0.12) { this.seg[who].push({ t, clip, keys, fade }); }
  idle(who, t) { this.seg[who].push({ t, clip: null }); }
  move(who, t, x, z, ease = 'io') { this.pos[who].push([t, [x, z], ease]); }
  turn(who, t, y, ease = 'io') { this.yaw[who].push([t, y, ease]); }
  hit(t, who, kind = 'light', at) { this.hits.push({ t, who, kind, at }); }
  note(t, text) { this.notes.push([t, text]); }
  // hero swing m starting at t: lunge forward, hit, Leshy reaction
  heroSwing(t, m, react = true) {
    this.clip('hero', t, m.clip, m.keys, 0.1);
    const z1 = Math.min(this.hz + m.lunge, this.lz - CONTACT);
    this.move('hero', t + m.w * 0.55, this.hx, this.hz); this.move('hero', t + m.hit + 0.05, this.hx, z1, 'out');
    this.hz = z1;
    const th = t + m.hit;
    this.hit(th, 'leshy', m.heavy ? 'heavy' : m.kick ? 'kick' : 'light');
    this.note(t, m.name);
    if (react) {
      const push = m.heavy ? 0.45 : m.kick ? 0.6 : 0.14;
      this.move('leshy', th, 0, this.lz); this.move('leshy', th + 0.3, 0, this.lz + push, 'out'); this.lz += push;
      if (m.heavy || m.kick) { this.clip('leshy', th, 'L_Stagger', STAGGER_KEYS, 0.08); this.idle('leshy', th + 2.0); }
      else { this.clip('leshy', th, 'Hit', [[0, 0.02], [0.12, 0.28, 'out'], [0.55, 0.62, 'io']], 0.06); this.idle('leshy', th + 0.5); }
    }
    return th;
  }
  done(t) { this.dur = t; return this; }
}
const blockOn = (b, t0, t1) => { b.pose.block.push([t0 - 0.18, 0], [t0, 1, 'out'], [t1, 1], [t1 + 0.3, 0, 'io']); };

export function buildScenes() {
  const S = {};
  // ---- hero series
  const series = (ids, title) => {
    const b = new B(title); let t = 0.4;
    ids.forEach((id, i) => { const m = HM[id]; b.heroSwing(t, m); t += i < ids.length - 1 ? m.w + 0.33 + 0.12 : m.dur; });
    b.idle('hero', t); b.move('hero', t, 0, b.hz); b.move('hero', t + 0.8, 0, H0 + 0.2); return b.done(t + 1.4);
  };
  S.series = series(['l1', 'l2', 'l3', 'l4', 'l5'], 'Серия из пяти ударов');
  S.seriesb = series(['l1b', 'l2b', 'l3b', 'l4b', 'l5b'], 'Серия-двойник (мокап)');
  S.mixed = series(['l1b', 'l2', 'l3b', 'l4', 'l5b'], 'Смешанная серия, как в игре');
  for (const id of ['heavy', 'heavyb', 'kick', 'jkick', 'swF', 'swI', 'swJ', 'swL', 'swM']) {
    const m = HM[id]; const b = new B(m.name);
    b.heroSwing(0.4, m); b.idle('hero', 0.4 + m.dur); b.move('hero', 0.4 + m.dur + 0.2, 0, b.hz); b.move('hero', 0.4 + m.dur + 1.0, 0, H0);
    S[id] = b.done(0.4 + m.dur + 1.4);
  }
  { // dash: from a run
    const m = HM.dash, b = new B(m.name); b.hz = -5.2; b.pos.hero = [[0, [0, -5.2]]];
    b.clip('hero', 0, 'Run', [[0, 0], [0.9, 0.9]], 0.1); b.move('hero', 0.5, 0, -3.6, 'lin');
    b.heroSwing(0.5, m); b.idle('hero', 0.5 + m.dur); b.move('hero', 0.5 + m.dur + 1.0, 0, H0); S.dash = b.done(0.5 + m.dur + 1.4);
  }
  { // series that ends with the Leshy falling
    const b = new B('Серия и тяжёлый: Леший падает'); let t = 0.4;
    for (const id of ['l1b', 'l2', 'l3b']) { const m = HM[id]; b.heroSwing(t, m); t += m.w + 0.45; }
    const m = HM.heavyb; const th = b.heroSwing(t, m, false);
    b.clip('leshy', th, 'L_FallBack', [[0, 0], [2.4, 2.967, 'out']], 0.06); b.move('leshy', th, 0, b.lz); b.move('leshy', th + 1.2, 0, b.lz + 1.4, 'out');
    b.idle('hero', t + m.dur); S.fall = b.done(t + m.dur + 2.2);
  }
  // ---- Leshy attacks and hero answers
  const L = (title, clip, keys, hit, step, fn, dur) => {
    const b = new B(title); b.clip('leshy', 0.3, clip, keys, 0.2);
    if (step) { b.move('leshy', 0.3 + step[0], 0, 0); b.move('leshy', 0.3 + step[1], 0, -step[2]); b.lz = -step[2]; }
    b.idle('leshy', 0.3 + dur); fn(b, 0.3 + hit); return b.done(0.3 + dur + 1.3);
  };
  S.swBlock = L('Размах лапой → блок щитом', 'L_SwipeA', SWIPE_KEYS, 1.05, [0.5, 1.25, 0.5], (b, h) => {
    blockOn(b, h - 0.3, h + 0.35); b.hit(h, 'hero', 'block'); b.move('hero', h, 0, H0); b.move('hero', h + 0.25, 0, H0 - 0.35, 'out'); b.note(0.3, 'Красное свечение: можно блокировать');
  }, 1.9);
  S.swDuck = L('Размах левой → нырок и ответ', 'L_SwipeB', SWIPE_KEYS, 1.05, [0.5, 1.25, 0.5], (b, h) => {
    b.clip('hero', h - 0.5, 'Sw_Duck', [[0, 0.2], [0.5, 0.75, 'io'], [1.2, 1.25, 'in'], [1.6, 1.867, 'out']], 0.1);
    b.move('hero', h + 0.4, 0, H0); b.move('hero', h + 0.75, 0, -1.85, 'out');
    b.hit(h + 0.75, 'leshy', 'light'); b.clip('leshy', h + 0.75, 'Hit', [[0, 0.02], [0.12, 0.28, 'out'], [0.55, 0.62, 'io']], 0.06); b.idle('leshy', h + 1.3);
    b.idle('hero', h + 1.2);
  }, 1.9);
  S.swHit = L('Размах → пропустил удар', 'L_SwipeA', SWIPE_KEYS, 1.05, [0.5, 1.25, 0.5], (b, h) => {
    b.hit(h, 'hero', 'heavy'); b.clip('hero', h, 'Stumble', [[0, 0.1], [1.6, 2.2, 'out']], 0.06); b.move('hero', h, 0, H0); b.move('hero', h + 0.6, -0.2, H0 - 0.9, 'out'); b.idle('hero', h + 1.6);
  }, 1.9);
  S.smBlock = L('Удар обеими сверху → блок со сбивом', 'L_Smash', SMASH_KEYS, 1.22, [0.6, 1.25, 0.6], (b, h) => {
    blockOn(b, h - 0.35, h + 0.1); b.hit(h, 'hero', 'block'); b.hit(h, 'ground', 'root');
    b.clip('hero', h + 0.08, 'Stumble', [[0, 0.25], [1.3, 2.2, 'out']], 0.12); b.move('hero', h, 0, H0); b.move('hero', h + 0.5, 0, H0 - 0.8, 'out'); b.idle('hero', h + 1.35);
  }, 2.2);
  S.smRoll = L('Удар обеими → перекат в сторону', 'L_Smash', SMASH_KEYS, 1.22, [0.6, 1.25, 0.6], (b, h) => {
    b.turn('hero', h - 0.55, 0); b.turn('hero', h - 0.4, -Math.PI / 2, 'out');
    b.clip('hero', h - 0.4, 'Roll', [[0, 0], [0.75, 0.98, 'io'], [1.0, 1.2]], 0.06); b.move('hero', h - 0.4, 0, H0); b.move('hero', h + 0.45, -2.1, H0, 'io');
    b.hit(h, 'ground', 'root'); b.idle('hero', h + 0.6); b.turn('hero', h + 0.7, 0.75); b.turn('hero', h + 1.0, Math.atan2(2.1, -H0) * 0.9);
  }, 2.2);
  S.slam = L('Удар оземь (супер) → сбит волной', 'L_Slam', SLAM_KEYS, 1.45, null, (b, h) => {
    b.note(0.3, 'Оранжевое свечение: блок не держит'); b.hit(h, 'ground', 'leap'); b.hit(h + 0.12, 'hero', 'heavy');
    b.clip('hero', h + 0.12, 'FallBack', [[0, 0.15], [2.5, 2.967, 'out']], 0.06); b.move('hero', h + 0.12, 0, H0); b.move('hero', h + 1.2, 0, H0 - 1.3, 'out'); b.idle('hero', h + 2.6);
  }, 2.6);
  S.slamRoll = L('Удар оземь → увернулся прыжком', 'L_Slam', SLAM_KEYS, 1.45, null, (b, h) => {
    b.hit(h, 'ground', 'leap'); b.turn('hero', h - 0.7, Math.PI); b.clip('hero', h - 0.55, 'DiveRoll', [[0, 0.2], [1.6, 2.4, 'io'], [2.0, 2.667]], 0.08);
    b.move('hero', h - 0.55, 0, H0); b.move('hero', h + 0.6, 0, H0 - 2.2, 'io'); b.idle('hero', h + 1.4); b.turn('hero', h + 1.4, Math.PI); b.turn('hero', h + 1.9, 0);
  }, 2.6);
  S.pounce = L('Бросок на четвереньках → сбит лицом вниз', 'L_Pounce', POUNCE_KEYS, 1.15, [0.55, 1.15, 1.25], (b, h) => {
    b.note(0.3, 'Супер: Леший прыгает на героя'); b.hit(h, 'hero', 'heavy');
    b.clip('hero', h, 'FallFace', [[0, 0.3], [2.6, 3.4, 'out']], 0.06); b.move('hero', h, 0, H0); b.move('hero', h + 0.9, 0, H0 - 1.2, 'out'); b.idle('hero', h + 2.6);
  }, 2.1);
  S.pounceDodge = L('Бросок → кувырок в сторону', 'L_Pounce', POUNCE_KEYS, 1.15, [0.55, 1.15, 1.25], (b, h) => {
    b.turn('hero', h - 0.75, Math.PI / 2, 'out'); b.clip('hero', h - 0.65, 'DiveRoll', [[0, 0.25], [1.2, 2.2, 'io'], [1.6, 2.667]], 0.08);
    b.move('hero', h - 0.65, 0, H0); b.move('hero', h + 0.45, 2.3, H0 + 0.3, 'io'); b.idle('hero', h + 0.95); b.turn('hero', h + 1.0, Math.PI / 2); b.turn('hero', h + 1.5, -Math.PI * 0.6);
  }, 2.1);
  S.reach = L('Тянется схватить → отскок', 'L_Reach', [[0, 0], [2.5, 2.567]], 1.0, [0.3, 1.0, 0.5], (b, h) => {
    b.turn('hero', h - 0.5, 0); b.turn('hero', h - 0.35, Math.PI, 'out');
    b.clip('hero', h - 0.35, 'Roll', [[0, 0], [0.75, 0.98, 'io'], [1.0, 1.2]], 0.06); b.move('hero', h - 0.35, 0, H0); b.move('hero', h + 0.5, 0, H0 - 2.0, 'io');
    b.idle('hero', h + 0.65); b.turn('hero', h + 0.7, Math.PI); b.turn('hero', h + 1.1, 0);
  }, 2.5);
  S.taunt = L('Угроза: бьёт себя в грудь', 'L_Beat', [[0, 0], [2.4, 2.367]], 1.0, null, (b) => { blockOn(b, 0.6, 2.2); }, 2.4);
  S.roar = L('Рёв ярости (вторая фаза)', 'L_Roar', ROAR_KEYS, 0.9, null, (b, h) => { b.hit(h, 'ground', 'roar'); blockOn(b, h - 0.2, h + 1.1); b.move('hero', h, 0, H0); b.move('hero', h + 0.6, 0, H0 - 0.4, 'out'); }, 2.4);
  // ---- finishers (the Leshy is stunned)
  for (const [id, title] of [['thrust', 'Добивание: укол в грудь'], ['rising', 'Добивание: снизу вверх']]) {
    const F = FIN[id], b = new B(title);
    const start = [0.3, 0, 4.2];                      // hero start in the victim frame (in front of the Leshy)
    const T0 = 0.6;
    b.clip('leshy', 0, 'L_Stagger', [[0, 0.9], [T0 + F.impact, 1.0], [T0 + F.impact + 0.4, 1.35, 'out'], [T0 + F.dur, 1.6, 'io'], [T0 + F.dur + 0.6, 2.267]], 0.05);
    b.pos.hero = [[0, [-start[0], -start[2]]]];
    for (const [t, v, e] of F.pos) b.move('hero', T0 + t, v ? -v[0] : -start[0], v ? -v[2] : -start[2], e || 'io');
    b.clip('hero', 0, 'Run', [[0, 0], [2, 2]], 0.05); b.clip('hero', T0 + F.run, F.clip, F.clipT.map(([t, c, e]) => [t - F.run, c, e]), 0.1);
    b.idle('hero', T0 + F.dur);
    b.hit(T0 + F.impact, 'leshy', 'finisher');
    b.ts = F.ts.map(([t, v, e]) => [T0 + t, v, e]); b.ts.unshift([0, 1]);
    const vic = (a) => [-a[0], a[1], -a[2]];
    b.cam = { t0: T0, pos: F.cam.map(([t, v, e]) => [t, vic(v), e]), look: F.look.map(([t, v, e]) => [t, vic(v), e]), fov: F.fov, dur: F.dur };
    b.kneel = F.kneel.map(([t, v, e]) => [T0 + t, v, e]);
    S[id] = b.done(T0 + F.dur + 0.8);
  }
  return S;
}

export const DUEL_GROUPS = [
  ['Удары богатыря', ['series', 'seriesb', 'mixed', 'heavy', 'heavyb', 'dash', 'kick', 'jkick', 'fall']],
  ['Атаки Лешего и ответы', ['swBlock', 'swDuck', 'swHit', 'smBlock', 'smRoll', 'slam', 'slamRoll', 'pounce', 'pounceDodge', 'reach', 'taunt', 'roar']],
  ['Добивания', ['thrust', 'rising']],
  ['Запасные удары (мокап, ещё не в игре)', ['swF', 'swI', 'swJ', 'swL', 'swM']],
];

// ------------------------------------------------------------------ evaluation helpers
const EASE = { lin: (x) => x, io: (x) => x * x * (3 - 2 * x), in: (x) => x * x, out: (x) => 1 - (1 - x) * (1 - x) };
export function keyAt(keys, t) {           // numbers or arrays
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
export function activeSeg(list, t) { let s = null; for (const x of list) if (x.t <= t) s = x; return s; }
export { warp };
