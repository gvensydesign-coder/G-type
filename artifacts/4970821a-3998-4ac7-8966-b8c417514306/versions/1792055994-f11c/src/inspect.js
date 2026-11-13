// Осмотр постройки: проверка опор (та же логика, что tools/float.mjs) и наглядная разметка.
// supportCheck(def, opts) → { grounded: [Box3], floating: [{ box, where }], parts }
// makeSupportOverlay(res) → THREE.Group (рамки в локальных координатах постройки: зелёные — стоят на земле, красные — висят)
import * as THREE from 'three';
import { Kit } from './kit.js';
import { buildGeometry } from './buildings.js';
import { makeFlatShader } from './toon.js';

const TOL = 0.05, GROUND = 0.07;

export function supportCheck(def, opts) {
  let res = null;
  const prevD = Kit.debug, prevB = Kit.onBuild;
  Kit.debug = true;
  Kit.onBuild = (parts) => {
    const P = parts.filter(p => p.dbg && p.kind !== 1 && p.kind !== 2 && !p.float);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), sc = new THREE.Vector3();
    const S = P.map(p => {
      const a = p.g.attributes.position, pts = [], n = a.count, stepT = Math.max(1, Math.floor(n / 3 / 120)) * 3;
      for (let t = 0; t + 2 < n; t += stepT) for (let k = 0; k < 3; k++) {
        A.fromBufferAttribute(a, t + k); B.fromBufferAttribute(a, t + (k + 1) % 3);
        for (const f of [0, 0.25, 0.5, 0.75]) pts.push(A.clone().lerp(B, f));
      }
      const bb = new THREE.Box3().setFromBufferAttribute(a);
      const inv = p.dbg.M.clone().invert();
      p.dbg.M.decompose(new THREE.Vector3(), new THREE.Quaternion(), sc);
      const lb = p.dbg.lb.clone().expandByScalar(TOL / Math.max(1e-3, Math.min(sc.x, sc.y, sc.z)));
      return { p, pts, bb, inv, lb };
    });
    const q0 = new THREE.Vector3();
    const inside = (pt, s) => s.lb.containsPoint(q0.copy(pt).applyMatrix4(s.inv));
    const N = S.length, adj = Array.from({ length: N }, () => []), ground = [];
    for (let i = 0; i < N; i++) if (S[i].bb.min.y <= GROUND) ground.push(i);
    const eb = new THREE.Box3();
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = S[i], b = S[j];
      if (!eb.copy(a.bb).expandByScalar(TOL).intersectsBox(b.bb)) continue;
      if (a.pts.some(q => inside(q, b)) || b.pts.some(q => inside(q, a))) { adj[i].push(j); adj[j].push(i); }
    }
    const seen = new Uint8Array(N), st = [...ground]; ground.forEach(i => seen[i] = 1);
    while (st.length) { const i = st.pop(); for (const j of adj[i]) if (!seen[j]) { seen[j] = 1; st.push(j); } }
    res = {
      parts: N,
      grounded: ground.map(i => S[i].bb),
      floating: S.filter((s, i) => !seen[i]).map(s => ({ box: s.bb, where: s.p.dbg.where })),
    };
  };
  try { buildGeometry(def, opts); } finally { Kit.debug = prevD; Kit.onBuild = prevB; }
  return res;
}

const EDGES = [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
function boxLines(boxes, grow) {
  const pos = [];
  for (const b of boxes) {
    const lo = b.min.clone().subScalar(grow), hi = b.max.clone().addScalar(grow);
    const c = [0, 1, 2, 3, 4, 5, 6, 7].map(i => [i & 1 ? hi.x : lo.x, i & 4 ? hi.y : lo.y, i & 2 ? hi.z : lo.z]);
    for (const [a, z] of EDGES) pos.push(...c[a], ...c[z]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
function lineMat(col, onTop) {
  return makeFlatShader(`uniform vec3 uCol; uniform float uTime; void main(){ oColor = vec4(uCol * (.85 + .15 * sin(uTime * 5.)), 1.); oNormal = vec4(.5, .5, 1., .5); }`,
    `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    { uCol: { value: new THREE.Color(col) } }, { depthTest: !onTop, depthWrite: false, transparent: onTop });
}
export function makeSupportOverlay(res) {
  const grp = new THREE.Group(); grp.name = 'supportOverlay';
  if (res.grounded.length) grp.add(new THREE.LineSegments(boxLines(res.grounded, 0.02), lineMat(0x7fd36a, false)));
  if (res.floating.length) grp.add(new THREE.LineSegments(boxLines(res.floating.map(f => f.box), 0.06), lineMat(0xff3a2a, true)));
  grp.traverse(o => { o.raycast = () => {}; o.renderOrder = 10; o.frustumCulled = false; });
  return grp;
}
