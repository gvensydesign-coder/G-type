// Живность логова: вороны (сидят на черепах, коньках, сухостое; часть кружит над дубом), летучие мыши у кроны,
// совы в дуплах (глаза светятся, моргают), лягушки на кувшинках и корягах (раздувают горло, прыгают),
// рыба выпрыгивает и оставляет круги, светлячки роем, болотные огоньки плывут над водой и светят на всё вокруг.
// Всё инстансами: один меш на вид, матрицы обновляются каждый кадр. Движения «на двойках» (как в стиле видео).
import * as THREE from 'three';
import { paint, glow, inkMat, sparkMat, U } from './toon.js';
import { Pack, M4, V, rr, rnd, setSeed, mergeGeometries } from './kit.js';

const merge = (pack) => { const l = []; for (const a of pack.parts.values()) l.push(...a); return mergeGeometries(l, false); };
const ell = (pack, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => pack.add(mat, new THREE.SphereGeometry(1, 10, 7), M4(x, y, z, rx, ry, rz, sx, sy, sz));
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function setM(im, i, x, y, z, rx, ry, rz, s = 1, sy = s, sz = s, order = 'YXZ') {
  _e.set(rx, ry, rz, order); _q.setFromEuler(_e); _m.compose(_p.set(x, y, z), _q, _s.set(s, sy, sz)); im.setMatrixAt(i, _m);
}
function inst(scene, geo, mat, n, ink = false) {
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = true; scene.add(im);
  if (ink) { const o = new THREE.InstancedMesh(geo, inkMat, n); o.instanceMatrix = im.instanceMatrix; o.frustumCulled = false; scene.add(o); }
  return im;
}
const twos = (t) => Math.floor(t * 12) / 12;   // анимация «на двойках»

export function buildLife(scene, world) {
  setSeed(77);
  const { groundAt, TREE, base, BASIN } = world;
  const WY = -0.18;
  const feather = paint({ base: '#1d1d26', strokeAmt: 0.1, rim: 1.4, break: 0.2 });
  const fur = paint({ base: '#2a2220', strokeAmt: 0.1, rim: 1.0 });
  const owlMat = paint({ base: '#6b5640', strokeAmt: 0.2, stroke: [0, 1, 0], rim: 1.0, break: 0.3 });
  const frogMat = paint({ base: '#4f7a34', strokeAmt: 0.15, rim: 1.0, wet: 1.0, moss: '#2e4a22', mossAmt: 0.4 });
  const sacMat = paint({ base: '#c8c890', strokeAmt: 0.05, rim: 0.6, wet: 1.0 });
  const fishMat = paint({ base: '#7a8a70', strokeAmt: 0.1, rim: 1.4, wet: 1.0 });
  const eyeY = glow('#ffd84a', { k: 2.6, flick: 0.1 });
  const eyeG = glow('#b8ff60', { k: 1.6, flick: 0.1 });

  // ---------- вороны ----------
  const RB = new Pack();
  ell(RB, feather, 0, 0.13, 0, 0.11, 0.1, 0.2, -0.25);
  ell(RB, feather, 0, 0.25, 0.15, 0.075, 0.075, 0.085);
  RB.add(feather, new THREE.ConeGeometry(0.028, 0.11, 5), M4(0, 0.24, 0.26, Math.PI / 2 + 0.15, 0, 0));
  RB.add(feather, new THREE.BoxGeometry(0.1, 0.02, 0.2), M4(0, 0.1, -0.24, -0.35, 0, 0));
  for (const s of [-1, 1]) RB.add(feather, new THREE.CylinderGeometry(0.008, 0.008, 0.08), M4(s * 0.04, 0.03, 0.02));
  const ravenBody = merge(RB);
  const RW = new Pack(); ell(RW, feather, 0.15, 0, -0.02, 0.17, 0.016, 0.09); RW.add(feather, new THREE.BoxGeometry(0.12, 0.012, 0.07), M4(0.3, 0, -0.04, 0, -0.3, 0));
  const ravenWing = merge(RW);
  // сидят: выбираем места с разносом
  const perched = [];
  const per = world.perches.slice().sort(() => rnd() - 0.5);
  for (const p of per) { if (perched.length >= 30) break; if (perched.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 3)) continue; perched.push({ ...p, look: 0, next: rr(0, 4), caw: -9, s: rr(1.1, 1.45) }); }
  const NF = 9;  // кружат над дубом
  const flying = Array.from({ length: NF }, (_, i) => ({ r: rr(10, 20), h: base + rr(16, 26), w: rr(0.18, 0.32) * (i % 2 ? 1 : -1), a: rr(0, 6.28), ph: rr(0, 6), s: rr(1.2, 1.5) }));
  const nR = perched.length + NF;
  const rBody = inst(scene, ravenBody, feather, nR, true), rWL = inst(scene, ravenWing, feather, nR), rWR = inst(scene, ravenWing, feather, nR);

  // ---------- летучие мыши ----------
  const BB = new Pack(); ell(BB, fur, 0, 0, 0, 0.05, 0.045, 0.08); for (const s of [-1, 1]) BB.add(fur, new THREE.ConeGeometry(0.015, 0.04, 4), M4(s * 0.025, 0.05, 0.06));
  const bw = new THREE.BufferGeometry();
  bw.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.05, 0.28, 0.02, 0.0, 0.18, 0, -0.06, 0, 0, -0.05, 0.12, -0.01, -0.03], 3));
  bw.setIndex([0, 1, 2, 0, 2, 4, 0, 4, 3]); bw.computeVertexNormals();
  const batWingMat = paint({ base: '#3a2a26', strokeAmt: 0.05, side: THREE.DoubleSide, rim: 1.2 });
  const NB = 16;
  const bats = Array.from({ length: NB }, () => ({ r: rr(8, 16), h: base + rr(8, 18), w: rr(0.6, 1.1) * (rnd() < 0.5 ? 1 : -1), a: rr(0, 6.28), ph: rr(0, 6), s: rr(1.4, 2.0) }));
  const bBody = inst(scene, merge(BB), fur, NB), bWL = inst(scene, bw, batWingMat, NB), bWR = inst(scene, bw, batWingMat, NB);

  // ---------- совы в дуплах ----------
  const OB = new Pack();
  ell(OB, owlMat, 0, 0.2, 0, 0.17, 0.22, 0.15); ell(OB, owlMat, 0, 0.45, 0.02, 0.14, 0.12, 0.12);
  for (const s of [-1, 1]) OB.add(owlMat, new THREE.ConeGeometry(0.035, 0.1, 4), M4(s * 0.08, 0.56, 0.0, 0, 0, -s * 0.3));
  OB.add(owlMat, new THREE.ConeGeometry(0.02, 0.05, 4), M4(0, 0.42, 0.13, Math.PI / 2 + 0.6, 0, 0));
  const OE = new Pack(); for (const s of [-1, 1]) OE.add(eyeY, new THREE.SphereGeometry(0.035, 8, 6), M4(s * 0.055, 0.47, 0.11));
  const owls = (world.anim.owls || []).map((o) => ({ ...o, blink: rr(2, 6), turn: 0, next: rr(1, 5) }));
  const oBody = inst(scene, merge(OB), owlMat, owls.length, true), oEye = inst(scene, merge(OE), eyeY, owls.length);
  for (const o of owls) world.lights.push({ pos: V(o.x + Math.sin(o.ry) * 0.6, o.y + 0.45, o.z + Math.cos(o.ry) * 0.6), col: [0.9, 0.75, 0.25], r: 2.2, flick: 0.1 });

  // ---------- лягушки ----------
  const FB = new Pack(); ell(FB, frogMat, 0, 0.05, 0, 0.09, 0.055, 0.11, -0.2);
  for (const s of [-1, 1]) { ell(FB, frogMat, s * 0.07, 0.03, -0.05, 0.035, 0.03, 0.07); ell(FB, frogMat, s * 0.05, 0.025, 0.07, 0.02, 0.02, 0.04); }
  const FE = new Pack(); for (const s of [-1, 1]) FE.add(eyeG, new THREE.SphereGeometry(0.025, 7, 5), M4(s * 0.045, 0.1, 0.07));
  const frogs = [];
  const tryFrog = (x, z, y) => { if (frogs.length < 34) frogs.push({ x, z, y, ry: rr(0, 6.28), ph: rr(0, 6), jump: -1, jx: 0, jz: 0, next: rr(4, 16), s: rr(1.3, 1.9) }); };
  for (let k = 0; k < 400 && frogs.length < 34; k++) {
    const sp = world.lilyPads ? world.lilyPads[Math.floor(rnd() * world.lilyPads.length)] : null;
    const x = sp ? sp[0] : rr(-40, 40), z = sp ? sp[1] : rr(-40, 30);
    const g = groundAt(x, z);
    if (g > WY - 0.06 && g < 0.3) tryFrog(x, z, Math.max(g, WY) + 0.02); else if (g < WY - 0.06 && rnd() < 0.5) tryFrog(x, z, WY + 0.03);
  }
  const fBody = inst(scene, merge(FB), frogMat, frogs.length, true), fEye = inst(scene, merge(FE), eyeG, frogs.length);
  const fSac = inst(scene, new THREE.SphereGeometry(0.045, 8, 6), sacMat, frogs.length);

  // ---------- рыба и круги на воде ----------
  const FS = new Pack(); ell(FS, fishMat, 0, 0, 0, 0.06, 0.08, 0.26); FS.add(fishMat, new THREE.ConeGeometry(0.08, 0.14, 4), M4(0, 0, -0.3, -Math.PI / 2, 0, 0, 0.4, 1, 1));
  const fish = Array.from({ length: 3 }, () => ({ t: rr(-6, 0), x: 0, z: 0, ry: 0, dur: 1.0 }));
  const fMesh = inst(scene, merge(FS), fishMat, fish.length);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U), transparent: true, depthWrite: false,
    vertexShader: `attribute float aK; varying float vK; varying vec2 vUv; void main(){ vK = aK; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTheme; varying float vK; varying vec2 vUv; void main(){ float a = vK; if (a < 0.01) discard; gl_FragColor = vec4(mix(vec3(0.7, 0.8, 0.7), vec3(0.55, 1.0, 0.7), uTheme), a * 0.55); }`,
  });
  const ringGeo = new THREE.RingGeometry(0.9, 1.0, 28); ringGeo.rotateX(-Math.PI / 2);
  const NRG = 12; const rings = Array.from({ length: NRG }, () => ({ t: 99, x: 0, z: 0, s: 1 }));
  ringGeo.setAttribute('aK', new THREE.InstancedBufferAttribute(new Float32Array(NRG), 1));
  const rMesh = inst(scene, ringGeo, ringMat, NRG); rMesh.castShadow = false;
  let ringI = 0;
  const splash = (x, z, s = 1) => { for (let k = 0; k < 2; k++) { const r = rings[ringI++ % NRG]; r.t = -k * 0.35; r.x = x; r.z = z; r.s = s; } };

  // ---------- светлячки (рой) и болотные огоньки ----------
  const NFF = 460;
  const pos = new Float32Array(NFF * 3), aP = new Float32Array(NFF * 4), aCol = new Float32Array(NFF * 3);
  const yel = new THREE.Color('#b8e4ff'), cy = new THREE.Color('#8fd8ff'), wa = new THREE.Color('#ffd27a');
  for (let i = 0; i < NFF; i++) {
    let x, z, y;
    if (i < 110) { const a = rr(0, 6.28), r = rr(6, 18); x = TREE.x + Math.cos(a) * r; z = TREE.z + Math.sin(a) * r; y = base + rr(0.5, 14); }
    else { const a = rr(0, 6.28), r = Math.sqrt(rnd()) * 1.25; x = BASIN.x + Math.cos(a) * BASIN.rx * r; z = BASIN.z + Math.sin(a) * BASIN.rz * r; y = Math.max(groundAt(x, z), WY) + rr(0.3, 3.6); }
    pos.set([x, y, z], i * 3); aP.set([rnd(), rr(0.15, 0.5), rr(0.3, 1.6), rnd()], i * 4);
    const c = rnd() < 0.68 ? yel : rnd() < 0.6 ? cy : wa; aCol.set([c.r, c.g, c.b], i * 3);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('aP', new THREE.BufferAttribute(aP, 4)); fg.setAttribute('aCol', new THREE.BufferAttribute(aCol, 3));
  const ffMat = sparkMat({ size: 5.5 });
  const ff = new THREE.Points(fg, ffMat); ff.frustumCulled = false; ff.renderOrder = 4; scene.add(ff);
  // огоньки: светящийся шар + ореол, плавают по восьмёрке над водой, светят на окружение (свет в списке огней)
  const NW = 0;   // огоньки убраны: на референсе их нет, акцент — фонари
  const wispGeo = new THREE.SphereGeometry(0.12, 10, 8);
  const wisps = Array.from({ length: NW }, (_, i) => {
    const blue = true;
    let a = rr(0, 6.28), r = rr(6, 28); for (let q = 0; q < 30 && groundAt(Math.cos(a) * r, BASIN.z + Math.sin(a) * r * 0.85) > WY - 0.3; q++) { a = rr(0, 6.28); r = rr(6, 28); }
    const w = { cx: Math.cos(a) * r, cz: BASIN.z + Math.sin(a) * r * 0.85, rx: rr(3, 8), rz: rr(3, 8), sp: rr(0.08, 0.18), ph: rr(0, 6), h: rr(0.6, 2.2), blue };
    w.mesh = new THREE.Mesh(wispGeo, glow(blue ? '#8fd0ff' : '#b8ff8a', { k: 1.8, flick: 0.3, seed: i }));
    scene.add(w.mesh);
    w.light = { pos: V(0, -99, 0), col: blue ? [0.3, 0.75, 1.0] : [0.45, 1.0, 0.4], r: 4.5, flick: 0.25 };
    world.lights.push(w.light);
    return w;
  });
  const hpos = new Float32Array(NW * 3), hP = new Float32Array(NW * 4), hC = new Float32Array(NW * 3);
  wisps.forEach((w, i) => { hP.set([0, 0, 0, 1], i * 4); const c = new THREE.Color(w.blue ? '#7fe0ff' : '#b0ff80'); hC.set([c.r, c.g, c.b], i * 3); });
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hpos, 3)); hg.setAttribute('aP', new THREE.BufferAttribute(hP, 4)); hg.setAttribute('aCol', new THREE.BufferAttribute(hC, 3));
  const halo = new THREE.Points(hg, sparkMat({ size: 40 })); halo.frustumCulled = false; halo.renderOrder = 4; scene.add(halo);

  // ---------- падающая листва: срывается с кроны дуба и ив, кружит, ложится на воду и землю ----------
  const NLF = 90;
  const lsh = new THREE.Shape(); lsh.moveTo(0, -0.1);
  [[0.05, -0.04], [0.11, 0.02], [0.07, 0.07], [0.12, 0.13], [0.06, 0.18], [0.0, 0.24]].forEach(([x, y]) => lsh.lineTo(x, y));
  [[-0.06, 0.18], [-0.12, 0.13], [-0.07, 0.07], [-0.11, 0.02], [-0.05, -0.04]].forEach(([x, y]) => lsh.lineTo(x, y)); lsh.lineTo(0, -0.1);
  const lfG = new THREE.ShapeGeometry(lsh);
  const lfMats = [paint({ base: '#3e5a46', strokeAmt: 0.15, rim: 1.2, side: THREE.DoubleSide }), paint({ base: '#4a4a3c', strokeAmt: 0.15, rim: 0.8, side: THREE.DoubleSide })];
  const lfMesh = lfMats.map((m) => { const im = new THREE.InstancedMesh(lfG, m, NLF / 2); im.frustumCulled = false; scene.add(im); return im; });
  const spawnLeaf = (l, first) => {
    const src = world.leafSrc[Math.floor(rnd() * world.leafSrc.length)]; l.x = src.x + rr(-2, 2); l.z = src.z + rr(-2, 2); l.y = src.y + rr(-1, 1.5);
    if (first) l.y -= rr(0, 20);
    l.v = rr(0.45, 0.9); l.sw = rr(0.3, 0.9); l.ph = rr(0, 6.28); l.sp = rr(1.2, 2.6); l.land = -1; l.s = rr(0.9, 1.6);
  };
  const leaves = Array.from({ length: NLF }, () => { const l = {}; spawnLeaf(l, true); return l; });
  function updLeaves(t, dt) {
    leaves.forEach((l, i) => {
      const im = lfMesh[i & 1], j = i >> 1;
      if (l.land >= 0) { l.land += dt; if (l.land > 9) spawnLeaf(l, false); setM(im, j, l.x, l.y, l.z, -Math.PI / 2, l.ph, 0, l.s * Math.min(1, (9 - l.land) / 2)); return; }
      l.y -= l.v * dt * (0.8 + 0.4 * Math.sin(t * l.sp + l.ph));
      const sx = Math.sin(t * l.sp * 0.6 + l.ph) * l.sw, sz = Math.cos(t * l.sp * 0.45 + l.ph) * l.sw;
      l.x += (0.35 + sx) * dt * 0.5; l.z += (-0.15 + sz) * dt * 0.5;
      const g = Math.max(groundAt(l.x, l.z), WY) + 0.02;
      if (l.y <= g) { l.y = g; l.land = 0; }
      setM(im, j, l.x, l.y, l.z, Math.sin(t * l.sp + l.ph) * 1.2, t * l.sp * 0.7 + l.ph, Math.cos(t * l.sp * 1.3 + l.ph) * 0.9, l.s);
    });
    lfMesh[0].instanceMatrix.needsUpdate = lfMesh[1].instanceMatrix.needsUpdate = true;
  }

  function update(t, dt, pr = 1) {
    updLeaves(t, dt);
    ffMat.uniforms.uPr.value = pr; halo.material.uniforms.uPr.value = pr;
    const t2 = twos(t);
    // вороны сидят: поворот головы рывками, иногда каркают (раскрывают крылья)
    perched.forEach((p, i) => {
      if (t > p.next) { p.look = rr(-1.2, 1.2); p.next = t + rr(1.2, 4.5); if (rnd() < 0.25) p.caw = t; }
      const cw = Math.max(0, 1 - (t - p.caw) / 0.6);
      const bob = Math.sin(t2 * 2 + i) * 0.01;
      setM(rBody, i, p.x, p.y + bob, p.z, -cw * 0.3, p.ry + p.look * 0.5, 0, p.s);
      const fold = 1.35 - cw * 0.9 * (0.5 + 0.5 * Math.sin(t * 30));
      const c = Math.cos(p.ry + p.look * 0.5), s = Math.sin(p.ry + p.look * 0.5);
      for (const [im, sd] of [[rWR, 1], [rWL, -1]]) setM(im, i, p.x + c * sd * 0.07 * p.s, p.y + 0.16 * p.s + bob, p.z - s * sd * 0.07 * p.s, 0, p.ry + p.look * 0.5 + (sd > 0 ? -fold : Math.PI + fold), sd > 0 ? -0.2 : 0.2, p.s * 1, p.s, p.s);
    });
    // вороны кружат над дубом
    flying.forEach((f, j) => {
      const i = perched.length + j; f.a += f.w * dt;
      const x = TREE.x + Math.cos(f.a) * f.r, z = TREE.z + Math.sin(f.a) * f.r, y = f.h + Math.sin(t * 0.5 + f.ph) * 1.5;
      const ry = Math.atan2(-Math.sin(f.a) * Math.sign(f.w), Math.cos(f.a) * Math.sign(f.w)), bank = Math.sign(f.w) * 0.35;
      const flap = Math.sin(t2 * 9 + f.ph) * 0.8;
      setM(rBody, i, x, y, z, 0, ry, bank, f.s);
      const c = Math.cos(ry), s = Math.sin(ry);
      setM(rWR, i, x + c * 0.07 * f.s, y + 0.16 * f.s, z - s * 0.07 * f.s, 0, ry, bank - flap, f.s);
      setM(rWL, i, x - c * 0.07 * f.s, y + 0.16 * f.s, z + s * 0.07 * f.s, 0, ry + Math.PI, -bank - flap, f.s);
    });
    rBody.instanceMatrix.needsUpdate = rWL.instanceMatrix.needsUpdate = rWR.instanceMatrix.needsUpdate = true;
    // летучие мыши: рваный полёт
    bats.forEach((b, i) => {
      b.a += b.w * dt * (1 + 0.5 * Math.sin(t * 3 + b.ph));
      const r = b.r + Math.sin(t * 1.7 + b.ph) * 2.5;
      const x = TREE.x + Math.cos(b.a) * r, z = TREE.z + Math.sin(b.a) * r, y = b.h + Math.sin(t * 2.3 + b.ph) * 2;
      const ry = Math.atan2(-Math.sin(b.a) * Math.sign(b.w), Math.cos(b.a) * Math.sign(b.w));
      const flap = Math.sin(t * 22 + b.ph) * 1.0;
      setM(bBody, i, x, y, z, 0, ry, 0, b.s);
      setM(bWR, i, x, y, z, 0, ry - Math.PI / 2, -flap, b.s); setM(bWL, i, x, y, z, 0, ry + Math.PI / 2, flap, b.s, b.s, -b.s);
    });
    bBody.instanceMatrix.needsUpdate = bWL.instanceMatrix.needsUpdate = bWR.instanceMatrix.needsUpdate = true;
    // совы: поворот головы целиком (тело), моргание
    owls.forEach((o, i) => {
      if (t > o.next) { o.turn = rr(-0.9, 0.9); o.next = t + rr(2, 6); }
      const bl = (t % o.blink) < 0.15 ? 0.1 : 1;
      setM(oBody, i, o.x, o.y, o.z, 0, o.ry + twos(o.turn), 0, 1.6);
      setM(oEye, i, o.x, o.y, o.z, 0, o.ry + twos(o.turn), 0, bl < 1 ? 0.001 : 1.6);
    });
    oBody.instanceMatrix.needsUpdate = oEye.instanceMatrix.needsUpdate = true;
    // лягушки: горло раздувается, изредка прыжок
    frogs.forEach((f, i) => {
      if (f.jump < 0 && t > f.next) { f.jump = 0; const a = f.ry; f.jx = f.x + Math.sin(a) * rr(0.6, 1.4); f.jz = f.z + Math.cos(a) * rr(0.6, 1.4); f.x0 = f.x; f.z0 = f.z; }
      let x = f.x, z = f.z, y = f.y;
      if (f.jump >= 0) {
        f.jump += dt / 0.45; const k = Math.min(1, f.jump);
        x = f.x0 + (f.jx - f.x0) * k; z = f.z0 + (f.jz - f.z0) * k; y = f.y + Math.sin(k * Math.PI) * 0.35;
        if (k >= 1) { f.x = f.jx; f.z = f.jz; f.jump = -1; f.next = t + rr(6, 20); f.ry = rr(0, 6.28); const g = groundAt(f.x, f.z); f.y = Math.max(g, WY) + 0.03; if (g < WY) splash(f.x, f.z, 0.4); }
      }
      const sac = 0.4 + 0.6 * Math.max(0, Math.sin(t * 5 + f.ph)) * (Math.sin(t * 0.7 + f.ph) > 0.2 ? 1 : 0);
      setM(fBody, i, x, y, z, 0, f.ry, 0, f.s); setM(fEye, i, x, y, z, 0, f.ry, 0, f.s);
      setM(fSac, i, x + Math.sin(f.ry) * 0.1 * f.s, y + 0.03 * f.s, z + Math.cos(f.ry) * 0.1 * f.s, 0, 0, 0, f.s * sac);
    });
    fBody.instanceMatrix.needsUpdate = fEye.instanceMatrix.needsUpdate = fSac.instanceMatrix.needsUpdate = true;
    // рыба: прыжок дугой и круги
    fish.forEach((f, i) => {
      f.t += dt;
      if (f.t > f.dur) {
        if (f.t > f.dur + 0.01 && f.t < f.dur + dt * 1.5) splash(f.x + Math.sin(f.ry) * 0.8, f.z + Math.cos(f.ry) * 0.8, 0.8);
        if (f.t > f.dur + rr(3, 9)) { f.t = 0; let x, z, k = 0; do { x = rr(-30, 30); z = rr(-30, 22); k++; } while (groundAt(x, z) > WY - 0.15 && k < 30); f.x = x; f.z = z; f.ry = rr(0, 6.28); splash(x, z, 0.7); }
        setM(fMesh, i, 0, -50, 0, 0, 0, 0, 0.001); return;
      }
      const k = f.t / f.dur, d = (k - 0.5) * 0.9;
      setM(fMesh, i, f.x + Math.sin(f.ry) * (d + 0.4), WY + Math.sin(k * Math.PI) * 0.7, f.z + Math.cos(f.ry) * (d + 0.4), -(k - 0.5) * 2.4, f.ry, Math.sin(t * 30) * 0.2, 1.6);
    });
    fMesh.instanceMatrix.needsUpdate = true;
    const ak = rMesh.geometry.attributes.aK;
    rings.forEach((r, i) => { r.t += dt; const k = r.t / 2.2; const on = r.t > 0 && k < 1; setM(rMesh, i, r.x, WY + 0.03, r.z, 0, 0, 0, on ? (0.1 + k * 1.6) * r.s : 0.001); ak.setX(i, on ? (1 - k) * (1 - k) : 0); });
    rMesh.instanceMatrix.needsUpdate = true; ak.needsUpdate = true;
    // огоньки
    wisps.forEach((w, i) => {
      const a = t * w.sp + w.ph;
      const x = w.cx + Math.sin(a) * w.rx, z = w.cz + Math.sin(a * 2) * w.rz * 0.5, y = Math.max(groundAt(x, z), WY) + w.h + Math.sin(t * 1.3 + w.ph) * 0.25;
      w.mesh.position.set(x, y, z); w.light.pos.set(x, y, z); hpos.set([x, y, z], i * 3);
      const s = 1 + 0.15 * Math.sin(t * 6 + i); w.mesh.scale.setScalar(s);
    });
    hg.attributes.position.needsUpdate = true;
  }
  return { update, counts: { ravens: nR, bats: NB, owls: owls.length, frogs: frogs.length, fireflies: NFF, wisps: NW, leaves: NLF } };
}
