// Finisher (добивание) as a reusable mechanic.
//
// A finisher is a short choreographed scene played in the victim's frame of reference: every track
// (hero position, hero clip time, victim pose weight, camera position / target / lens) is keyed in the
// victim's local space (+Z = where the victim faces, +X = the victim's left, +Y up). The same timeline
// works wherever the fight happens; the host only maps local -> world and applies the values.
//
//   const f = new Finisher(FINISHERS.leapCleave);
//   f.start(victimPos, victimYaw, heroPos);          // when the player presses the key on a stunned enemy
//   const s = f.update(dt);                         // every frame: s.hero, s.victim, s.cam, s.events
//   if (f.done) ...                                 // hand control back
//
// Events fire once, in order: 'go', 'whoosh', 'impact', 'land', 'rise', 'end'.
import * as THREE from 'three';

const EASE = {
  lin: (x) => x,
  io: (x) => x * x * (3 - 2 * x),
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
};

// keys: [[t, value, ease]]; value is a number or an [x, y, z] triple. The ease belongs to the segment
// that ends at the key. A value of null means "where the track was when the scene started".
function sample(keys, t, start) {
  const val = (k) => (k[1] === null ? start : k[1]);
  if (t <= keys[0][0]) return val(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const u = (EASE[b[2] || 'io'])((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
      const va = val(a), vb = val(b);
      if (typeof va === 'number') return va + (vb - va) * u;
      return [va[0] + (vb[0] - va[0]) * u, va[1] + (vb[1] - va[1]) * u, va[2] + (vb[2] - va[2]) * u];
    }
  }
  return val(keys[keys.length - 1]);
}

export const FINISHERS = {
  // The hero runs in, crouches, leaps and cleaves down into the giant's shoulder with both hands.
  // The giant drops to one knee, the hero lands and hops back while the giant rises.
  leapCleave: {
    dur: 3.4,
    impact: 1.3,
    damage: 0.15, // share of the victim's max HP
    // time scale over the scene (light slow motion on the leap, near freeze on impact)
    timeScale: [[0, 1], [0.7, 1], [0.8, 0.7], [1.25, 0.6], [1.3, 0.12, 'out'], [1.42, 0.2], [1.75, 1, 'in'], [3.4, 1]],
    hero: {
      // position in the victim's frame
      pos: [[0, null], [0.42, [0, 0, 2.25], 'io'], [0.75, [0, 0, 2.05], 'out'], [1.2, [0, 1.05, 1.38], 'out'], [1.32, [0, 0.55, 1.22], 'in'], [1.5, [0, 0, 1.22], 'in'], [1.85, [0, 0, 1.3]], [2.3, [0.25, 0, 2.7], 'out'], [3.4, [0.25, 0, 2.7]]],
      // overhead two-handed strike clip (game time -> clip time): wind-up, hold at the top, strike, recovery
      clip: 'Attack3',
      clipT: [[0, 0], [0.42, 0.12], [0.75, 0.42, 'io'], [1.2, 0.58, 'out'], [1.32, 0.82, 'lin'], [2.2, 1.333, 'out'], [3.4, 1.333]],
      run: [[0, 1], [0.38, 1], [0.45, 0]],           // locomotion weight (running in)
      crouch: [[0, 0], [0.45, 0], [0.72, 1, 'out'], [0.8, 0, 'in'], [1.32, 0], [1.42, 1, 'out'], [1.75, 0, 'io'], [3.4, 0]],
      tuck: [[0, 0], [0.75, 0], [0.9, 1, 'out'], [1.2, 0.6], [1.32, 0, 'in'], [3.4, 0]],
      hop: [[0, 0], [1.85, 0], [2.0, 1, 'out'], [2.3, 0, 'in'], [3.4, 0]],
    },
    victim: {
      kneel: [[0, 0], [1.3, 0], [1.48, 1, 'out'], [2.55, 1], [3.3, 0, 'io']],
      recoil: [[0, 0], [1.3, 0], [1.36, 1, 'out'], [1.9, 0.25, 'io'], [3.4, 0]],
    },
    cam: {
      // low three-quarter from the victim's left (the hero's sword side) while the hero runs in
      pos: [[0, [3.0, 1.0, 4.4]], [0.7, [3.2, 0.9, 3.6], 'io'],
        // crane up into a side profile as the hero takes off: both silhouettes, the blade in the gap
        [1.15, [3.7, 1.9, 1.35], 'io'],
        // push in on the blow
        [1.32, [3.6, 1.7, 1.15], 'out'], [1.75, [3.4, 1.6, 1.25], 'io'],
        // pull back to show the giant on one knee and the hero stepping away
        [2.6, [4.2, 2.0, 3.6], 'io'], [3.4, [4.4, 2.1, 4.2]]],
      look: [[0, [0, 1.3, 1.9]], [0.7, [0, 1.3, 1.6]], [1.15, [0, 1.95, 0.75], 'io'], [1.32, [0, 1.4, 0.65], 'out'], [1.75, [0, 1.25, 0.7]], [2.6, [0, 1.2, 1.3], 'io'], [3.4, [0, 1.2, 1.5]]],
      fov: [[0, 46], [0.75, 44], [1.15, 42], [1.32, 36, 'out'], [1.75, 38], [2.6, 48, 'io'], [3.4, 50]],
    },
    events: [[0, 'go'], [0.78, 'whoosh'], [1.3, 'impact'], [1.5, 'land'], [2.6, 'rise'], [3.4, 'end']],
  },
};

export class Finisher {
  constructor(def) { this.def = def; this.done = true; this.t = 0; }

  get active() { return !this.done; }

  // victimPos / victimYaw: the anchor; heroPos: where the hero starts (world)
  start(victimPos, victimYaw, heroPos) {
    this.anchor = victimPos.clone(); this.yaw = victimYaw;
    this.startLocal = this.toLocal(heroPos);
    this.t = 0; this.done = false; this.fired = 0;
  }

  toLocal(p) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const dx = p.x - this.anchor.x, dz = p.z - this.anchor.z;
    return [dx * c - dz * s, p.y - this.anchor.y, dx * s + dz * c];
  }
  toWorld(l, out = new THREE.Vector3()) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    return out.set(this.anchor.x + l[0] * c + l[2] * s, this.anchor.y + l[1], this.anchor.z - l[0] * s + l[2] * c);
  }

  // time scale the host should apply to the world while the scene plays
  timeScale() { return this.done ? 1 : sample(this.def.timeScale, this.t); }

  // dt: game time (already scaled by timeScale())
  update(dt) {
    const d = this.def;
    this.t = Math.min(d.dur, this.t + dt);
    const t = this.t, H = d.hero, V = d.victim, C = d.cam;
    const events = [];
    while (this.fired < d.events.length && d.events[this.fired][0] <= t) events.push(d.events[this.fired++][1]);
    if (t >= d.dur) this.done = true;
    const heroLocal = sample(H.pos, t, this.startLocal);
    return {
      t, events,
      hero: {
        pos: this.toWorld(heroLocal),
        yaw: Math.atan2(this.anchor.x - this.toWorld(heroLocal).x, this.anchor.z - this.toWorld(heroLocal).z),
        clip: H.clip, clipT: sample(H.clipT, t), run: sample(H.run, t),
        crouch: sample(H.crouch, t), tuck: sample(H.tuck, t), hop: sample(H.hop, t),
      },
      victim: { kneel: sample(V.kneel, t), recoil: sample(V.recoil, t) },
      cam: { pos: this.toWorld(sample(C.pos, t)), look: this.toWorld(sample(C.look, t)), fov: sample(C.fov, t) },
    };
  }
}
