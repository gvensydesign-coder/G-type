// Отладка для проверки: «Показать преграды» (контуры коллизий поверх сцены) и «Масштаб-линейка» (метровая линейка и высоты в метрах).
import * as THREE from 'three';
import { heightAt } from './terrain.js';

const RED = new THREE.Color(0xff4a3a), ORANGE = new THREE.Color(0xffa030), GREEN = new THREE.Color(0x4dff9a), BLUE = new THREE.Color(0x5ab4ff);
const MAXV = 90000;

export class ObstacleView {
  constructor(app) {
    this.app = app; this.on = false; this.acc = 0; this.n = 0;
    this.pos = new Float32Array(MAXV * 3); this.colr = new Float32Array(MAXV * 3);
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage); this.ca = new THREE.BufferAttribute(this.colr, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca); g.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
    this.mesh.renderOrder = 997; this.mesh.frustumCulled = false; this.mesh.visible = false;
    app.stage.scene.add(this.mesh);
  }
  set(on) { this.on = on; this.mesh.visible = on; this.acc = 1; }
  // полоска шириной 2w вдоль отрезка на земле
  seg(ax, az, bx, bz, c, w = 0.07) {
    if (this.n + 6 > MAXV) return;
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, px = (-dz / l) * w, pz = (dx / l) * w;
    const ya = heightAt(ax, az) + 0.14, yb = heightAt(bx, bz) + 0.14;
    const P = [[ax - px, ya, az - pz], [ax + px, ya, az + pz], [bx + px, yb, bz + pz], [bx - px, yb, bz - pz]];
    for (const k of [0, 1, 2, 0, 2, 3]) { const i = this.n++; this.pos[i * 3] = P[k][0]; this.pos[i * 3 + 1] = P[k][1]; this.pos[i * 3 + 2] = P[k][2]; this.colr[i * 3] = c.r; this.colr[i * 3 + 1] = c.g; this.colr[i * 3 + 2] = c.b; }
  }
  ring(x, z, r, c, w) { const N = Math.max(12, Math.min(28, Math.round(r * 18))); let px = x + r, pz = z; for (let k = 1; k <= N; k++) { const a = (k / N) * Math.PI * 2, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r; this.seg(px, pz, qx, qz, c, w); px = qx; pz = qz; } }
  rect(o, c) {
    const co = [[-o.hw, -o.hd], [o.hw, -o.hd], [o.hw, o.hd], [-o.hw, o.hd]];
    const W = co.map(([lx, lz]) => [o.cx + lx * o.c + lz * o.s, o.cz - lx * o.s + lz * o.c]);
    for (let k = 0; k < 4; k++) {
      const a = W[k], b = W[(k + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.6));
      for (let q = 0; q < n; q++) this.seg(a[0] + (b[0] - a[0]) * q / n, a[1] + (b[1] - a[1]) * q / n, a[0] + (b[0] - a[0]) * (q + 1) / n, a[1] + (b[1] - a[1]) * (q + 1) / n, c);
    }
  }
  build() {
    const app = this.app, h = app.hero, S = app.world.solids; this.n = 0;
    const extra = h.extraColliders || [];
    for (const it of S.around(h.pos.x, h.pos.z, 26, null)) {
      const col = it.tag === 'ствол' ? ORANGE : (it.tag === 'стена избы' || it.tag === 'внутри избы' || it.tag === 'створка двери') ? BLUE : RED;
      if (it.r != null) this.ring(it.x, it.z, it.r, col, it.tag === 'ствол' ? 0.05 : 0.07); else this.rect(it, col);
    }
    for (const e of extra) { if (e.r != null) { if (e.r > 0.01) this.ring(e.x, e.z, e.r, RED, 0.07); } else if (e.hw != null) this.rect(e, RED); }
    // тела героя и жителей: круги радиуса 0,34 м
    this.ring(h.pos.x, h.pos.z, h.radius || 0.34, GREEN, 0.05);
    if (app.tab && app.tab.npcs) for (const n of app.tab.npcs) if (n.h.group.visible) this.ring(n.h.pos.x, n.h.pos.z, 0.34, GREEN, 0.05);
    this.mesh.geometry.setDrawRange(0, this.n); this.pa.needsUpdate = true; this.ca.needsUpdate = true;
  }
  update(dt) { if (!this.on) return; this.acc += dt; if (this.acc > 0.1) { this.acc = 0; this.build(); } }
}

// ---------------------------------------------------------------- масштаб-линейка
const fmt = (v) => String(+v.toFixed(2)).replace('.', ',');
export class ScaleTool {
  constructor(app) {
    this.app = app; this.on = false;
    this.root = new THREE.Group(); this.root.visible = false; app.stage.scene.add(this.root);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.amber = new THREE.MeshBasicMaterial({ color: 0xe0a64a, depthTest: false, transparent: true, opacity: 0.95 });
    this.rulers = [this.makeRuler(), this.makeRuler()];
    this.lines = []; this.items = []; this.stKey = null;
    this.layer = document.getElementById('rulers'); this.spans = [];
    const W = app.world;
    const door = ([x, z, r]) => { const a = r * Math.PI / 2; return { x: x + Math.sin(a) * 2.1, z: z + Math.cos(a) * 2.1, h: 2.05, t: 'дверь 2,05 × 1,0 м', y: W.huts.find((q) => q.x === x).y + 0.2 }; };
    this.static = {
      all: [
        door([-15.2, 5.0, 1]), door([-9, 12.9, 2]), door([-2.6, 7.4, 3]),
        { x: -17.2, z: 3.0, h: 2.5, t: 'стена избы 2,5 м' },
        { x: -9, z: 3.5, h: 0.45, t: 'лавка: сиденье 0,45 м, длина 1,8 м' }, { x: -6.2, z: 6.2, h: 0.45, t: 'лавка 0,45 м' }, { x: -11.9, z: 6.2, h: 0.45, t: 'лавка 0,45 м' },
        { x: -3.8, z: 14.2, h: 2.5, t: 'колодец: навес 2,5 м' }, { x: -18.2, z: 2.0, h: 0.9, t: 'бочка 0,9 м' }, { x: -12.8, z: 13.2, h: 1.95, t: 'стог 1,95 м' },
        { x: -17.6, z: 9.8, h: 1.1, t: 'поленница 1,1 м' }, { x: -14.4, z: 9.6, h: 0.55, t: 'колода 0,55 м' }, { x: -9, z: 6, h: 0.4, t: 'кольцо костра 0,4 м' },
      ],
      4: [{ x: -6.4, z: 2.2, h: 0.75, t: 'колода 0,75 м' }, { x: -12.6, z: 1.6, h: 0.8, t: 'ящик 0,8 × 1,2 м' }, { x: -2.4, z: -10.6, h: 8.5, t: 'ель около 8,5 м' }],
      3: [{ x: 24, z: -9, h: 2.6, t: 'ворота 3,2 × 2,6 м' }, { x: 15, z: -9, h: 2.35, t: 'частокол 2,2–2,5 м' }, { x: 22, z: -2, h: 2.5, t: 'изба: стена 2,5 м' }, { x: 5, z: -9, h: 0.95, t: 'мост: перила 0,95 м' }],
    };
  }
  makeRuler() {
    const g = new THREE.Group();
    const pos = [], col = [];
    const box = (cx, cy, cz, sx, sy, sz, c) => {
      const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      const f = [[x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], [x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0], [x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0], [x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1], [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0]];
      const cc = new THREE.Color(c);
      for (const q of f) for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k * 3], q[k * 3 + 1], q[k * 3 + 2]); col.push(cc.r, cc.g, cc.b); }
    };
    for (let i = 0; i < 22; i++) box(0, 0.05 + i * 0.1, 0, 0.05, 0.1, 0.05, i % 2 ? 0x2a2218 : 0xf2e6c4);
    for (let k = 0; k <= 4; k++) box(0.13, k * 0.5, 0, k % 2 ? 0.14 : 0.26, 0.022, 0.03, 0xe0a64a);
    for (let i = 0; i < 10; i++) box(0.05 + i * 0.1, 0.012, 0.09, 0.1, 0.022, 0.07, i % 2 ? 0x2a2218 : 0xf2e6c4);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.Mesh(geo, this.mat));
    const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 0.02), this.amber); top.renderOrder = 998; g.add(top); g.userData.top = top;
    g.visible = false; this.root.add(g);
    return g;
  }
  setOn(on) { this.on = on; this.root.visible = on; this.layer.hidden = !on; if (!on) for (const s of this.spans) s.style.display = 'none'; }
  span(i) { while (this.spans.length <= i) { const s = document.createElement('span'); this.layer.appendChild(s); this.spans.push(s); } return this.spans[i]; }
  ensureStatics(ti) {
    if (this.stKey === ti) return;
    this.stKey = ti;
    for (const l of this.lines) this.root.remove(l);
    this.lines = [];
    this.items = [...this.static.all, ...(this.static[ti] || [])];
    for (const it of this.items) {
      const y0 = it.y != null ? it.y : heightAt(it.x, it.z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, it.h, 0.025), this.amber); m.position.set(it.x, y0 + it.h / 2, it.z); m.renderOrder = 998;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.025), this.amber); cap.position.set(0, it.h / 2, 0); cap.renderOrder = 998; m.add(cap); m.userData.cap = cap;
      this.root.add(m); this.lines.push(m); it.mesh = m; it.y0 = y0;
    }
  }
  update() {
    if (!this.on) return;
    const app = this.app, cam = app.stage.camera, h = app.hero, ti = app.tabs.indexOf(app.tab) + 1;
    const rc = app.view.getBoundingClientRect(), W = rc.width, H = rc.height;
    this.ensureStatics(ti);
    const v = new THREE.Vector3(); let si = 0;
    const put = (x, y, z, text, cls) => {
      v.set(x, y, z).project(cam); if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
      const s = this.span(si++); s.style.display = ''; if (s.textContent !== text) s.textContent = text; s.className = cls || '';
      s.style.left = ((v.x + 1) / 2 * W) + 'px'; s.style.top = ((1 - v.y) / 2 * H) + 'px';
    };
    // линейки у героя и ближайшего жителя
    const ents = [{ name: 'Богатырь', p: h.pos, hh: h.ch.height, vis: h.group.visible }];
    if (app.tab && app.tab.npcs) {
      let best = null, bd = 1e9;
      for (const n of app.tab.npcs) { const d = Math.hypot(n.h.pos.x - h.pos.x, n.h.pos.z - h.pos.z); if (d < bd && n.h.group.visible) { bd = d; best = n; } }
      if (best && bd < 9) ents.push({ name: 'Житель ' + best.P.name, p: best.h.pos, hh: best.h.ch.height, vis: true });
    }
    this.rulers.forEach((r, i) => {
      const e = ents[i]; if (!e || !e.vis || ti === 3 || ti === 1) { r.visible = false; return; }
      const yaw = app.cam.yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const off = i === 0 ? 1.0 : -1.0;
      const x = e.p.x + rx * off, z = e.p.z + rz * off, y = heightAt(x, z);
      const th = Math.atan2(cam.position.x - x, cam.position.z - z);
      r.visible = true; r.position.set(x, y, z); r.rotation.y = th;
      // отметка роста от линейки к человеку (локальная ось X группы = (cos th, -sin th))
      const lx = -off * (rx * Math.cos(th) - rz * Math.sin(th));
      const top = r.userData.top; top.scale.set(Math.max(0.05, Math.abs(lx)), 1, 1); top.position.set(lx / 2, e.hh + (e.p.y - y), 0);
      put(x, y + 2.3, z, `${e.name} ${fmt(e.hh)} м`, 'big');
      const ox = Math.cos(th) * 0.3, oz = -Math.sin(th) * 0.3;
      for (const k of [0.5, 1, 1.5, 2]) put(x + ox, y + k, z + oz, k === 1 ? '1 м' : fmt(k), 'tick');
      if (i === 0) put(x + Math.cos(th) * 0.5, y + 0.05, z - Math.sin(th) * 0.5, 'линейка 1 м', 'tick');
    });
    // высоты объектов рядом
    const fx = h.pos.x, fz = h.pos.z;
    for (const it of this.items) {
      const near = Math.hypot(it.x - fx, it.z - fz) < (ti === 3 ? 60 : 15);
      it.mesh.visible = near; if (!near) continue;
      it.mesh.userData.cap.rotation.y = Math.atan2(cam.position.x - it.x, cam.position.z - it.z);
      put(it.x, it.y0 + it.h + 0.12, it.z, it.t, it.h < 1 ? 'low' : '');
    }
    for (let k = si; k < this.spans.length; k++) this.spans[k].style.display = 'none';
  }
}
