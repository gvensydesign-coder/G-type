// Земля из MapGrid в том же рисованном шейдере + вода + окрестности в тумане + небо.
import * as THREE from 'three';
import { makeToonMaterial, makeFlatShader, G } from './toon.js';
import { PAT } from './kit.js';

const ZONE_LOOK = { // zone key -> [цвет, фактура]
  border: [0x46503c, PAT.grass], water: [0x3a4a42, PAT.earth], shallow: [0x5a5a44, PAT.road], shore: [0x8a7a58, PAT.road],
  ground: [0x5f7444, PAT.grass], slope: [0x6e5a44, PAT.earth], road: [0x7a6248, PAT.road], bridge: [0x7a6248, PAT.road],
};

export function buildTerrain(map) {
  const W = map.width, H = map.height, cs = map.cellSize;
  const nv = (W + 1) * (H + 1);
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), info = new Float32Array(nv * 4), uv = new Float32Array(nv * 2), rng = new Float32Array(nv * 2);
  const c = new THREE.Color();
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    const k = j * (W + 1) + i;
    let hs = 0, n = 0, zr = 0, zg = 0, zb = 0, pat = PAT.grass, road = 0;
    for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
      if (!map.inBounds(a, b)) continue;
      hs += map.heightAtCell(a, b); n++;
      const z = map.zoneAtCell(a, b), look = ZONE_LOOK[z.key] ?? ZONE_LOOK.ground;
      c.setHex(look[0]); zr += c.r; zg += c.g; zb += c.b;
      if (look[1] === PAT.road) road++;
      if (look[1] === PAT.earth) pat = PAT.earth;
    }
    n = Math.max(n, 1);
    const x = map.origin.x + i * cs, z = map.origin.z + j * cs, y = hs / n;
    pos.set([x, y, z], k * 3);
    col.set([zr / n, zg / n, zb / n], k * 3);
    // лёгкая разница тона по шуму — пятна луга
    const t = 0.92 + 0.12 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.sin(z * 0.06 + x * 0.02);
    col[k * 3] *= t; col[k * 3 + 1] *= t; col[k * 3 + 2] *= t;
    info.set([road >= 2 ? PAT.road : pat, 0, 0, 0.3], k * 4);
    uv.set([x, z], k * 2); rng.set([-100, 100], k * 2);
  }
  const idx = new Uint32Array(W * H * 6);
  let o = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const a = j * (W + 1) + i, b = a + 1, d = a + W + 1, e = d + 1;
    idx.set([a, d, b, b, d, e], o); o += 6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aRange', new THREE.BufferAttribute(rng, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, makeToonMaterial({ side: THREE.FrontSide, terrain: true }));
  m.name = 'terrain';
  return m;
}

export function buildOuter(outer, mapRect) {
  const group = new THREE.Group();
  const levels = outer.levels.slice(0, 2);
  levels.forEach((L, li) => {
    const inner = li === 0 ? mapRect : levels[li - 1];
    const ix0 = li === 0 ? inner.x0 + 1 : inner.x0 + L.cellSize, ix1 = li === 0 ? inner.x1 - 1 : inner.x1 - L.cellSize;
    const iz0 = li === 0 ? inner.z0 + 1 : inner.z0 + L.cellSize, iz1 = li === 0 ? inner.z1 - 1 : inner.z1 - L.cellSize;
    const nx = L.nx, nz = L.nz, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), info = new Float32Array(nx * nz * 4), uv = new Float32Array(nx * nz * 2), rng = new Float32Array(nx * nz * 2);
    const cc = new THREE.Color();
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = L.x0 + (i + 0.5) * L.cellSize, z = L.z0 + (j + 0.5) * L.cellSize, y = L.heights[k];
      pos.set([x, y, z], k * 3);
      const rock = Math.min(1, Math.max(0, (y - 60) / 200));
      cc.setHex(0x4c5e40).lerp(new THREE.Color(0x6a6660), rock);
      if (y > 420) cc.lerp(new THREE.Color(0xd8dcd8), Math.min(1, (y - 420) / 120));
      col.set([cc.r, cc.g, cc.b], k * 3);
      info.set([y > 60 ? PAT.earth : PAT.grass, 0, 0, 0.5], k * 4); uv.set([x * 0.2, z * 0.2], k * 2); rng.set([-1e4, 1e4], k * 2);
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const x = L.x0 + (i + 1) * L.cellSize, z = L.z0 + (j + 1) * L.cellSize;
      if (x > ix0 && x < ix1 && z > iz0 && z < iz1) continue;
      const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
    g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aRange', new THREE.BufferAttribute(rng, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, makeToonMaterial({ side: THREE.FrontSide }));
    m.position.y = -0.05 * (li + 1);
    group.add(m);
  });
  return group;
}

// Вода: плоская, рисованная — полосы ряби, светлая кромка у берега (по глубине из карты высот).
export function buildWater(size = 3000, level = 0) {
  const g = new THREE.PlaneGeometry(size, size, 1, 1); g.rotateX(-Math.PI / 2);
  const m = makeFlatShader(`
    in vec3 vW; in float vZ;
    uniform float uTime, uFogNear, uFogFar, uNight, uChthon, uPx; uniform vec3 uFogCol, uSkyCol, uSunCol;
    void main(){
      vec2 q = vW.xz;
      float n = fbm(q * .05 + vec2(uTime * .02, 0.));
      vec3 deep = vec3(.09, .16, .18), mid = vec3(.18, .3, .32), hi = mix(uSkyCol, uSunCol, .3) * .9;
      vec3 c = mix(deep, mid, step(.48, n));
      // штрихи ряби постоянной толщины
      float r = fract((q.y + sin(q.x * .2 + uTime * .5) * .6 + n * 6.) / 2.4);
      float w = step(.92, r) * step(.55, fbm(q * .12 + uTime * .05));
      c = mix(c, hi, w * .8);
      // отражение огней ночью
      c += vec3(1., .6, .25) * uNight * .03 * step(.7, fbm(q * .3));
      float fog = smoothstep(uFogNear, uFogFar, vZ);
      c = mix(c, uFogCol * mix(vec3(1.), vec3(1.2, .8, .8), uChthon * .6), fog);
      oColor = vec4(c, .93);
      oNormal = vec4(.5, 1., .5, 0.);
    }`, `out vec3 vW; out float vZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    {}, { transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(g, m); mesh.position.y = level - 0.25; mesh.renderOrder = 1; mesh.layers.set(1);
  return mesh;
}

export function buildSky() {
  const g = new THREE.SphereGeometry(4000, 32, 16);
  const m = makeFlatShader(`
    in vec3 vD;
    uniform float uTime, uChthon, uNight; uniform vec3 uFogCol, uSkyCol, uSunCol, uSunDir;
    void main(){
      vec3 d = normalize(vD);
      float h = clamp(d.y, -.1, 1.);
      vec3 top = mix(uSkyCol * .55, uSkyCol * .25, uNight);
      vec3 c = mix(uFogCol, top, smoothstep(0., .45, h));
      // мазки облаков: постеризованный шум
      vec2 q = d.xz / max(d.y + .15, .05) * 1.4;
      float n = fbm(q * .7 + vec2(uTime * .006, 0.));
      float band = step(.55, n) * .5 + step(.68, n) * .5;
      c = mix(c, mix(c * .7, uSunCol * .75 + c * .3, step(.68, n)), band * smoothstep(.02, .2, h) * .6);
      // солнце/луна
      float s = dot(d, normalize(uSunDir));
      c += uSunCol * smoothstep(.9975, .998, s) * .8;
      c = mix(c, c * vec3(1.2, .7, .7), uChthon * .4);
      oColor = vec4(c, 1.);
      oNormal = vec4(0.);
    }`, `out vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    {}, { side: THREE.BackSide, depthWrite: false });
  const mesh = new THREE.Mesh(g, m); mesh.layers.set(1); mesh.renderOrder = -1; mesh.frustumCulled = false;
  return mesh;
}
