// Tiny synthesized sound effects (WebAudio, no external files).
let ctx = null;
export function resumeAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { ctx = null; }
}

function noise(dur) {
  const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = b;
  return s;
}
function env(node, t0, a, peak, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g).connect(ctx.destination);
  return g;
}
function filtered(type, freq, q, dur, peak, sweepTo) {
  const t = ctx.currentTime;
  const n = noise(dur);
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  n.connect(f);
  env(f, t, 0.01, peak, dur);
  n.start(t); n.stop(t + dur);
}
function tone(type, freq, dur, peak, to) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(o, t, 0.005, peak, dur);
  o.start(t); o.stop(t + dur);
}

export function sfx(name) {
  if (!ctx) return;
  switch (name) {
    case 'whoosh': filtered('bandpass', 500, 1.5, 0.22, 0.25, 2200); break;
    case 'hit': tone('sine', 160, 0.15, 0.7, 50); filtered('lowpass', 1800, 0.7, 0.1, 0.5); break;
    case 'hurt': tone('square', 120, 0.18, 0.25, 60); filtered('lowpass', 900, 0.7, 0.15, 0.5); break;
    case 'block': tone('triangle', 900, 0.25, 0.35, 700); filtered('highpass', 3000, 0.7, 0.08, 0.3); break;
    case 'parry': tone('triangle', 1400, 0.5, 0.4, 1100); tone('sine', 700, 0.5, 0.3); break;
    case 'slam': tone('sine', 70, 0.5, 0.9, 30); filtered('lowpass', 400, 0.7, 0.4, 0.7); break;
    case 'jump': filtered('bandpass', 300, 2, 0.12, 0.15, 800); break;
    case 'land': filtered('lowpass', 300, 0.7, 0.1, 0.25); break;
    case 'catch': tone('sine', 300, 0.08, 0.3, 200); break;
  }
}
