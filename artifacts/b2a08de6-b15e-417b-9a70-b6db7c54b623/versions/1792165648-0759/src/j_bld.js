// Соединение зданий на сетке 2 м: изба + сени, клеть, хлев; терем + крыльцо; колодец + навес; скамьи в торговый ряд.
// Соседние постройки: у владельца стена получает проём (open), у соседа стена пропускается (skip), свесы кровли на стыке убираются (flush).
import * as THREE from 'three';
import { G, clamp, lerp, hash2 } from './kit.js';
import { heightAt, WATER_Y, slopeAt } from './terrain.js';
import { vcMat } from './core.js';
import { placeHut, well, bench } from './buildings.js';

const CX = (i) => -29 + 2 * i, CZ = (j) => -29 + 2 * j;
const SIDES = ['S', 'E', 'N', 'W'];
const SIDE_ARR = { S: ['S', 'E', 'N', 'W'], E: ['E', 'N', 'W', 'S'], N: ['N', 'W', 'S', 'E'], W: ['W', 'S', 'E', 'N'] };
const worldToLocal = (ws, rot) => { for (const L of SIDES) if (SIDE_ARR[L][rot] === ws) return L; };
const OPP = { E: 'W', W: 'E', S: 'N', N: 'S' };

export const BLD = {
  izba: { name: 'Изба', cw: 2, cd: 2, big: true, dwell: true },
  terem: { name: 'Терем', cw: 3, cd: 2, big: true, dwell: true },
  seni: { name: 'Сени', cw: 1, cd: 1 },
  klet: { name: 'Клеть', cw: 1, cd: 1 },
  hlev: { name: 'Хлев', cw: 2, cd: 1 },
  krylco: { name: 'Крыльцо', cw: 1, cd: 1 },
  kolodec: { name: 'Колодец', cw: 1, cd: 1, solo: true },
  naves: { name: 'Навес', cw: 1, cd: 1, solo: true },
  bench: { name: 'Лавка', bench: true },
};
export const BLD_KINDS = Object.entries(BLD).map(([id, k]) => ({ id, name: k.name }));
const ATTACH = new Set(['seni', 'klet', 'hlev', 'krylco']);

const rectOf = (o) => { const k = BLD[o.k], sw = o.rot % 2 === 1; const w = sw ? k.cd : k.cw, d = sw ? k.cw : k.cd; return { x0: o.i, x1: o.i + w, z0: o.j, z1: o.j + d, w, d }; };
const centerOf = (o) => { const r = rectOf(o); return [-30 + (r.x0 + r.x1), -30 + (r.z0 + r.z1)]; };
const cellsOf = (o) => { const r = rectOf(o), out = []; for (let j = r.z0; j < r.z1; j++) for (let i = r.x0; i < r.x1; i++) out.push([i, j]); return out; };

function hutOpts(o) {
  const s = o.seed;
  switch (o.k) {
    case 'izba': return { w: 4, d: 4, wallH: 2.5, roofH: 1.45, chimney: true, seed: s };
    case 'terem': return { w: 6, d: 4, wallH: 3.3, roofH: 2.1, chimney: true, seed: s };
    case 'seni': return { w: 2, d: 2, wallH: 2.3, roofH: 0.9, noWindow: true, seed: s };
    case 'klet': return { w: 2, d: 2, wallH: 2.05, roofH: 0.95, noWindow: true, door: 'none', seed: s };
    case 'hlev': return { w: 4, d: 2, wallH: 1.9, roofH: 0.75, noWindow: true, seed: s };
  }
}

// крыльцо: площадка на 0,6 м, лестница наружу, два столба и скат кровли над дверью; локально стена здания на севере (−z)
function porchLocal(g) {
  const y0 = -0.05;
  g.box(0, y0 + 0.28, -0.05, 1.9, 0.14, 1.7, 0x6a5233, 0, 0x8a7048);
  for (const x of [-0.8, 0.8]) g.box(x, y0 + 0.1, -0.05, 0.14, 0.4, 1.5, 0x4c3a24);
  for (let k = 0; k < 3; k++) g.box(0, y0 + 0.5 - 0.2 * (k + 1) * 0.9 - 0.02 + 0.02, 0.9 + k * 0.3, 1.5, 0.08, 0.3, 0x7a6040, 0, 0x9a8056);
  for (const x of [-0.85, 0.85]) { g.prism([x, 0.3, 0.75], [x, 2.35, 0.75], 0.09, 0x5a4630, 7, 1, 0x7a6040, true); g.beam([x, 1.0, 0.75], [x, 1.0, 1.55 * 0 + 0.0 - 0.8], 0.06, 0.06, 0x4c3a24); }
  for (const s of [-1, 1]) g.beam([s * 0.85, 1.05, 0.75], [s * 0.85, 1.05, 1.5], 0.07, 0.07, 0x5a4630);
  g.beam([-1.0, 2.35, 0.75], [1.0, 2.35, 0.75], 0.12, 0.14, 0x4c3a24, 0x6a5233);
  for (const s of [-1, 1]) g.quad([s * 1.1, 2.3, 1.0], [0, 2.3 + 0.0, 1.0], [0, 2.95, -0.9], [s * 1.1, 2.55, -0.9], 0x3b3a2c, 0x403c2e, 0x33342a, 0x2e3328);
  g.blob(0, 2.55, 0.1, 0.1, 0x4a3822, { sy: 0.8, detail: 0, noise: 0.05, seed: 2, top: 0x6a5233 });
}
function wellRing(g, x, y, z) {
  const STONE = [0x4e5660, 0x59626b, 0x464e58];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; g.blob(x + Math.cos(a) * 0.62, y + 0.2, z + Math.sin(a) * 0.62, 0.24, STONE[i % 3], { sy: 0.8, detail: 1, noise: 0.12, seed: i, top: 0x7e8a96 }); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28 + 0.25; g.blob(x + Math.cos(a) * 0.62, y + 0.55, z + Math.sin(a) * 0.62, 0.22, STONE[(i + 1) % 3], { sy: 0.8, detail: 1, noise: 0.12, seed: i + 20, top: 0x7e8a96 }); }
  g.quad([x - 0.5, y + 0.52, z - 0.5], [x + 0.5, y + 0.52, z - 0.5], [x + 0.5, y + 0.52, z + 0.5], [x - 0.5, y + 0.52, z + 0.5], 0x050a0b);
}
function wellRoofed(g, x, y, z) {
  wellRing(g, x, y, z);
  for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) g.prism([x + dx, y - 0.2, z + dz], [x + dx, y + 2.75, z + dz], 0.13, 0x5c4128, 7, 1, 0x664a2e, true);
  for (let i = 0; i < 4; i++) { const [ax, az] = [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]][i], [bx, bz] = [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]][(i + 1) % 4]; g.beam([x + ax, y + 2.7, z + az], [x + bx, y + 2.7, z + bz], 0.16, 0.16, 0x4c3a24, 0x6a5233); }
  const apex = [x, y + 3.9, z], cs = [0x3b3a2c, 0x33342a, 0x403c2e, 0x2e3328];
  const q = [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]];
  for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4]; g.tri([x + a[0], y + 2.65, z + a[1]], [x + b[0], y + 2.65, z + b[1]], apex, cs[i], cs[i], cs[(i + 1) % 4]); g.tri([x + b[0], y + 2.6, z + b[1]], [x + a[0], y + 2.6, z + a[1]], apex, 0x1d1c16); }
  // ворот с вёдрами
  g.prism([x - 0.9, y + 2.2, z], [x + 0.9, y + 2.2, z], 0.1, 0x5a4026, 8, 1, 0x6a4e2e, true);
  g.prism([x + 0.9, y + 2.2, z], [x + 1.15, y + 2.2, z], 0.2, 0x4a3822, 8, 1, 0x4a3822, true);
  g.prism([x, y + 2.15, z], [x, y + 0.9, z], 0.012, 0x2a2018, 3, 1, 0x2a2018, false);
  g.prism([x, y + 0.9, z], [x, y + 0.6, z], 0.15, 0x5a4026, 8, 0.85, 0x6a4e2e);
}
function benchRowCover(g, list, ang) {
  // навес над рядом лавок: направление ряда — ось лавок
  const ux = Math.cos(ang), uz = -Math.sin(ang), nx = uz, nz = -ux; // вдоль и поперёк
  const cx = list.reduce((s, b) => s + b.x, 0) / list.length, cz = list.reduce((s, b) => s + b.z, 0) / list.length;
  let mn = 1e9, mx = -1e9; for (const b of list) { const s = (b.x - cx) * ux + (b.z - cz) * uz; mn = Math.min(mn, s - 0.9); mx = Math.max(mx, s + 0.9); }
  mn -= 0.4; mx += 0.4;
  const P = (s, t, y) => { const x = cx + ux * s + nx * t, z = cz + uz * s + nz * t; return [x, heightAt(x, z) + y, z]; };
  const np = Math.max(2, Math.round((mx - mn) / 1.9) + 1);
  for (let k = 0; k < np; k++) { const s = lerp(mn, mx, k / (np - 1)); for (const t of [-1.0, 1.0]) { const a = P(s, t, -0.2), b = P(s, t, 2.35); g.prism(a, b, 0.07, 0x5a4630, 6, 1, 0x7a6040, true); } g.beam(P(s, -1.0, 2.35), P(s, 1.0, 2.35), 0.1, 0.12, 0x4c3a24, 0x6a5233); }
  g.beam(P(mn, 0, 2.95), P(mx, 0, 2.95), 0.1, 0.12, 0x4c3a24, 0x6a5233);
  const stripes = [0x6a3a2c, 0x3b3a2c, 0x7a6040, 0x3b3a2c]; const ns = Math.max(4, Math.round((mx - mn) / 0.7));
  for (let k = 0; k < ns; k++) { const s0 = lerp(mn, mx, k / ns), s1 = lerp(mn, mx, (k + 1) / ns), c = stripes[k % stripes.length]; for (const t of [-1, 1]) g.quad(P(s0, t * 1.25, 2.3), P(s1, t * 1.25, 2.3), P(s1, 0, 3.0), P(s0, 0, 3.0), c); }
  // вывеска
  const a = P(mn + 0.3, 1.0, 1.95), b = P(mn + 0.3, 1.0, 2.3); g.box(a[0], a[1] + 0.2, a[2], 0.1, 0.5, 0.9, 0x6a5233, Math.atan2(ux, uz), 0x7a6040);
}

export class BldMod {
  constructor(host) {
    this.host = host; this.id = 'bld'; this.name = 'Здания'; this.kinds = BLD_KINDS;
    this.site = { x: 21, z: 4, dist: 15, yaw: -0.5, pitch: 0.7 };
    this.group = new THREE.Group(); this.group.visible = false; host.group.add(this.group);
    this.pieces = []; this.nid = 1; this.hist = []; this.dirty = true;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), vcMat({ side: THREE.DoubleSide })); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false; this.group.add(this.mesh);
    this.base = [25, 16];
  }
  enter() { this.group.visible = true; }
  leave() { this.group.visible = false; }
  occupies(x, z) { return this.pieces.some((p) => (p.k === 'bench' ? Math.hypot(p.x - x, p.z - z) < 1.6 : cellsOf(p).some(([i, j]) => Math.hypot(CX(i) - x, CZ(j) - z) < 3.1))); }
  clear() { this.pieces.length = 0; this.hist.length = 0; this.sync(); }
  undo() { const id = this.hist.pop(); if (id == null) return 'Нечего отменять'; this.pieces = this.pieces.filter((p) => p.id !== id); this.sync(); return null; }
  sync() { this.dirty = true; this.host.changed(); }
  cellAt(kind, x, z) {
    const k = BLD[kind]; if (k.bench) return [x, z];
    const i = Math.round((x + 30) / 2 - k.cw / 2), j = Math.round((z + 30) / 2 - k.cd / 2); return [i, j];
  }
  mk(kind, i, j, rot) { return { id: -1, k: kind, i, j, rot, seed: Math.floor(hash2(i * 3.1, j * 7.7) * 1e5) + 1, drop: 1, flash: 0 }; }
  // допустимость
  valid(o, list) {
    if (o.k === 'bench') {
      const x = o.x, z = o.z;
      if (Math.abs(x - this.site.x) > 12 || Math.abs(z - this.site.z) > 10) return 'за площадкой';
      if (heightAt(x, z) < WATER_Y + 0.1) return 'здесь вода';
      for (const p of list) { if (p === o) continue; if (p.k === 'bench') { if (Math.hypot(p.x - x, p.z - z) < 0.45) return 'место занято'; } else if (cellsOf(p).some(([i, j]) => Math.abs(CX(i) - x) < 1.3 && Math.abs(CZ(j) - z) < 1.3)) return 'место занято зданием'; }
      return null;
    }
    const occ = new Map(); for (const p of list) { if (p === o || p.k === 'bench') continue; for (const [i, j] of cellsOf(p)) occ.set(i + ',' + j, p); }
    for (const [i, j] of cellsOf(o)) {
      const x = CX(i), z = CZ(j);
      if (Math.abs(x - this.site.x) > 12 || Math.abs(z - this.site.z) > 10) return 'за площадкой';
      if (o.k === 'naves') { const w = occ.get(i + ',' + j); if (!w || w.k !== 'kolodec') return 'навес ставят только над колодцем'; continue; }
      if (occ.has(i + ',' + j)) return 'клетка занята';
      if (heightAt(x, z) < WATER_Y + 0.1) return 'здесь вода';
      if (slopeAt(x, z) > 0.5) return 'слишком крутой склон';
    }
    // избы и терема не сливаются: между ними проход
    if (BLD[o.k].dwell) {
      const r = rectOf(o);
      for (const p of list) { if (p === o || p.k === 'bench' || !BLD[p.k].dwell) continue; const q = rectOf(p); if (r.x0 <= q.x1 && q.x0 <= r.x1 && r.z0 <= q.z1 && q.z0 <= r.z1) return 'избы не соединяются: оставьте проход в клетку'; }
    }
    for (const p of list) if (p.k === 'bench' && cellsOf(o).some(([i, j]) => Math.abs(CX(i) - p.x) < 1.3 && Math.abs(CZ(j) - p.z) < 1.3)) return 'скамья мешает';
    return null;
  }
  // анализ связей
  analyze(list) {
    const an = new Map(); const blds = list.filter((p) => p.k !== 'bench' && p.k !== 'kolodec' && p.k !== 'naves');
    for (const o of list) an.set(o, { skip: {}, open: {}, flush: {}, partners: [], covered: false, face: null });
    for (let x = 0; x < blds.length; x++) for (let y = x + 1; y < blds.length; y++) {
      const A = blds[x], B = blds[y]; if (!(ATTACH.has(A.k) || ATTACH.has(B.k))) continue;
      const ra = rectOf(A), rb = rectOf(B);
      let side = null, ov0, ov1;
      if (ra.x1 === rb.x0 || rb.x1 === ra.x0) { ov0 = Math.max(ra.z0, rb.z0); ov1 = Math.min(ra.z1, rb.z1); if (ov1 > ov0) side = ra.x1 === rb.x0 ? 'E' : 'W'; }
      if (!side && (ra.z1 === rb.z0 || rb.z1 === ra.z0)) { ov0 = Math.max(ra.x0, rb.x0); ov1 = Math.min(ra.x1, rb.x1); if (ov1 > ov0) side = ra.z1 === rb.z0 ? 'S' : 'N'; }
      if (!side) continue;
      const opp = OPP[side], mid = -30 + 2 * ((ov0 + ov1) / 2);
      // владелец: больший (изба, терем), иначе крыльцо проигрывает, иначе меньший id
      const rank = (p) => (BLD[p.k].big ? 3 : p.k === 'krylco' ? 0 : p.k === 'hlev' ? 2 : 1);
      const owner = rank(A) > rank(B) ? A : rank(B) > rank(A) ? B : (A.id < B.id ? A : B), other = owner === A ? B : A;
      const wsOwner = owner === A ? side : opp, wsOther = owner === A ? opp : side;
      const lo = worldToLocal(wsOwner, owner.rot), lt = worldToLocal(wsOther, other.rot);
      const [ocx, ocz] = centerOf(owner); const th = owner.rot * Math.PI / 2; const xL = [Math.cos(th), -Math.sin(th)], zL = [Math.sin(th), Math.cos(th)];
      const v = (wsOwner === 'E' || wsOwner === 'W') ? [0, mid - ocz] : [mid - ocx, 0];
      const off = (lo === 'S' || lo === 'N') ? v[0] * xL[0] + v[1] * xL[1] : v[0] * zL[0] + v[1] * zL[1];
      const a1 = an.get(owner), a2 = an.get(other);
      a1.open[lo] = clamp(off, -1.0, 1.0); a1.flush[lo] = true;
      if (other.k === 'krylco') a2.face = OPP[wsOther]; else { a2.skip[lt] = true; a2.flush[lt] = true; }
      if (other.k === 'krylco') { a2.faceOwner = wsOther; }
      a1.partners.push(other); a2.partners.push(owner);
    }
    for (const p of list) if (p.k === 'naves') { const w = list.find((q) => q.k === 'kolodec' && q.i === p.i && q.j === p.j); if (w) { an.get(p).partners.push(w); an.get(w).partners.push(p); an.get(w).covered = true; } }
    // крыльца без соседа остаются отдельными; с соседом — лицом наружу
    // ряды скамей
    const bs = list.filter((p) => p.k === 'bench'), seen = new Set(), rows = [];
    for (const b of bs) {
      if (seen.has(b)) continue; const comp = [], st = [b]; seen.add(b);
      while (st.length) { const c = st.pop(); comp.push(c); for (const q of bs) { if (seen.has(q)) continue; if ((q.rot % 2) !== (c.rot % 2)) continue; const al = q.rot % 2 === 0 ? [q.x - c.x, q.z - c.z] : [q.z - c.z, q.x - c.x]; if (Math.abs(al[0]) < 2.3 && Math.abs(al[1]) < 0.55) { seen.add(q); st.push(q); } } }
      rows.push(comp);
    }
    an.rows = rows;
    return an;
  }
  describe(list, an, o) {
    const a = an.get(o); const names = [];
    if (o.k === 'bench') { const row = an.rows.find((r) => r.includes(o)); if (row && row.length > 1) return { text: 'торговый ряд из ' + row.length + ' лавок с общим навесом', rule: 'bd_market', parts: row.filter((r) => r !== o).map((r) => [r.x, r.z]) }; return null; }
    if (!a.partners.length) return null;
    const ps = a.partners; const all = [o, ...ps];
    const has = (k) => all.some((p) => p.k === k);
    let text, rule;
    if (has('naves') && has('kolodec')) { text = 'колодец с навесом'; rule = 'bd_well'; }
    else if (has('krylco')) { text = has('terem') ? 'терем с красным крыльцом' : 'изба с крыльцом'; rule = 'bd_terem'; }
    else if (has('hlev')) { text = 'изба с хлевом'; rule = 'bd_hlev'; }
    else if (has('klet')) { text = 'изба с клетью'; rule = 'bd_klet'; }
    else if (has('seni')) { text = 'изба с сенями'; rule = 'bd_seni'; }
    else { text = all.map((p) => BLD[p.k].name.toLowerCase()).join(' + '); rule = 'bd_seni'; }
    return { text, rule, parts: ps.map((p) => centerOf(p)) };
  }
  buildPiece(g, o, a) {
    if (o.k === 'bench') { bench(g, o.x, heightAt(o.x, o.z), o.z, o.rot % 2 === 0 ? 0 : Math.PI / 2); return; }
    const [x, z] = centerOf(o), y = heightAt(x, z) - 0.05;
    if (o.k === 'kolodec') { if (a.covered) wellRoofed(g, x, y, z); else well(g, x, y, z); return; }
    if (o.k === 'naves') return;
    if (o.k === 'krylco') {
      const face = a.face || 'S'; const r = SIDE_ARR['S'].indexOf(face);
      const s0 = g.count; porchLocal(g);
      g.transformFrom(s0, new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(r * Math.PI / 2)));
      return;
    }
    const ho = hutOpts(o); placeHut(g, { ...ho, skip: a.skip, open: a.open, roofFlush: a.flush }, x, y, z, o.rot);
  }
  rebuild(list, an, ghostSet) {
    const g = new G(31); g.jit = 0.05;
    for (const o of list) {
      if (ghostSet && !ghostSet.has(o)) continue;
      const a = an.get(o), s0 = g.count; this.buildPiece(g, o, a);
      const e = 1 - Math.pow(1 - clamp(o.drop, 0, 1), 3), lift = (1 - e) * 1.4, hl = o.flash;
      if (lift > 0.001) for (let i = s0 * 3; i < g.p.length; i += 3) g.p[i + 1] -= lift;
      if (hl > 0.01) for (let i = s0 * 3; i < g.c.length; i += 3) { g.c[i] += hl * 0.1; g.c[i + 1] += hl * 0.33; g.c[i + 2] += hl * 0.3; }
    }
    // навесы рядов
    const rows = an.rows || [];
    for (const r of rows) { if (r.length < 2) continue; if (ghostSet && !r.some((b) => ghostSet.has(b))) continue; const ang = r[0].rot % 2 === 0 ? 0 : Math.PI / 2; benchRowCover(g, r, ang); }
    return g;
  }
  click(kind, p, rot) {
    const o = this.candidate(kind, p, rot); const err = this.valid(o, this.pieces); if (err) return err;
    o.id = this.nid++; o.drop = 0; o.flash = 1; this.pieces.push(o); this.hist.push(o.id); this.sync();
    const an = this.analyze(this.pieces), d = this.describe(this.pieces, an, o);
    if (d) { this.host.toast('Соединено: ' + d.text); const [x, z] = o.k === 'bench' ? [o.x, o.z] : centerOf(o); this.host.burst(x, z); for (const q of an.get(o).partners) q.flash = 1; }
    return null;
  }
  candidate(kind, p, rot) {
    if (BLD[kind].bench) { const x = Math.round(p.x * 2) / 2, z = Math.round(p.z * 2) / 2; let sx = x, sz = z; const b = { id: -1, k: 'bench', x: sx, z: sz, rot: rot % 2, drop: 1, flash: 0, seed: 1 };
      // притяжение к ряду: к ближайшей лавке той же ориентации — по шагу 1,95 м
      let best = null, bd = 2.6; for (const q of this.pieces) if (q.k === 'bench' && q.rot % 2 === b.rot) { const d = Math.hypot(q.x - sx, q.z - sz); if (d < bd) { bd = d; best = q; } }
      if (best) { if (b.rot === 0) { sx = best.x + Math.sign(sx - best.x || 1) * 1.95; sz = best.z; } else { sz = best.z + Math.sign(sz - best.z || 1) * 1.95; sx = best.x; } b.x = sx; b.z = sz; }
      return b; }
    if (kind === 'naves') { const w = this.pieces.find((q) => q.k === 'kolodec' && Math.hypot(CX(q.i) - p.x, CZ(q.j) - p.z) < 2.6); if (w) return { ...this.mk('naves', w.i, w.j, 0) }; }
    const [i, j] = this.cellAt(kind, p.x, p.z); return this.mk(kind, i, j, rot);
  }
  hover(kind, p, rot) {
    const o = this.candidate(kind, p, rot); const err = this.valid(o, this.pieces);
    const list = this.pieces.concat([o]); const an = this.analyze(list), d = this.describe(list, an, o);
    const set = new Set([o, ...an.get(o).partners]); if (o.k === 'bench') { const row = an.rows.find((r) => r.includes(o)); if (row) row.forEach((r) => set.add(r)); }
    const g = this.rebuild(list, an, set);
    return { ok: !err, err, text: d ? 'будет соединено: ' + d.text : null, geo: g.count ? g.build() : null, parts: d ? d.parts : [], rule: d ? d.rule : null };
  }
  step(s) {
    if (s.pc) { const [bi, bj] = this.base; const o = s.pc.k === 'bench' ? { id: this.nid++, k: 'bench', x: this.site.x + s.pc.x, z: this.site.z + s.pc.z, rot: s.pc.rot || 0, drop: 0, flash: 1, seed: 1 } : { ...this.mk(s.pc.k, bi + s.pc.x, bj + s.pc.z, s.pc.rot || 0), id: this.nid++, drop: 0, flash: 1 };
      const err = this.valid(o, this.pieces); if (err) return; this.pieces.push(o); this.hist.push(o.id); this.sync(); const an = this.analyze(this.pieces); for (const q of an.get(o).partners) q.flash = 1; }
  }
  update(dt) {
    let anim = this.dirty;
    for (const o of this.pieces) { if (o.drop < 1) { o.drop = Math.min(1, o.drop + dt * 2.4); anim = true; } if (o.flash > 0) { o.flash = Math.max(0, o.flash - dt * 0.9); anim = true; } }
    if (!anim) return; this.dirty = false;
    const an = this.analyze(this.pieces); const g = this.rebuild(this.pieces, an); const old = this.mesh.geometry; this.mesh.geometry = g.count ? g.build() : new THREE.BufferGeometry(); old.dispose();
  }
}
