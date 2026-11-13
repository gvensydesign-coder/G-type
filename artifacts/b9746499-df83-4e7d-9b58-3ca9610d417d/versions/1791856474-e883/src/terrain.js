// Земля из MapGrid в том же рисованном шейдере + вода + окрестности в тумане + небо.
import * as THREE from 'three';
import { makeToonMaterial, makeFlatShader, G } from './toon.js';
import { PAT } from './kit.js';

const ZONE_LOOK = { // zone key -> [цвет, фактура]
  border: [0x46503c, PAT.grass], water: [0x3a4a42, PAT.earth], shallow: [0x5a5a44, PAT.road], shore: [0x8a7a58, PAT.road],
  ground: [0x5f7444, PAT.grass], slope: [0x6e5a44, PAT.earth], road: [0x7a6248, PAT.road], bridge: [0x7a6248, PAT.road],
};

// Земля: цвет зоны в вершине (дорога берёт цвет луга — её рисует шейдер), веса дороги и голой земли
// в aRange (x — дорога, y — земля), чтобы шейдер смешивал их рваной кромкой, а не ступеньками клеток.
// map.trample (если есть) — утоптанная земля у построек, добавляется к весу земли.
const EARTHY = { slope: 1, shore: 0.85, shallow: 1, water: 1 };
export function buildTerrain(map) {
  const W = map.width, H = map.height, cs = map.cellSize;
  const nv = (W + 1) * (H + 1);
  const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), info = new Float32Array(nv * 4), uv = new Float32Array(nv * 2), rng = new Float32Array(nv * 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  g.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aRange', new THREE.BufferAttribute(rng, 2));
  const c = new THREE.Color();
  const fill = (i0, j0, i1, j1) => {
    for (let j = Math.max(0, j0); j <= Math.min(H, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(W, i1); i++) {
      const k = j * (W + 1) + i;
      let hs = 0, n = 0, zr = 0, zg = 0, zb = 0, road = 0, earth = 0, tr = 0;
      for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
        if (!map.inBounds(a, b)) continue;
        hs += map.heightAtCell(a, b); n++;
        const z = map.zoneAtCell(a, b), key = z.key === 'road' || z.key === 'bridge' ? 'ground' : z.key, look = ZONE_LOOK[key] ?? ZONE_LOOK.ground;
        c.setHex(look[0]); zr += c.r; zg += c.g; zb += c.b;
        if (z.key === 'road' || z.key === 'bridge') road++;
        earth += EARTHY[z.key] ?? 0;
        if (map.trample) tr += map.trample[b * W + a];
      }
      n = Math.max(n, 1);
      const x = map.origin.x + i * cs, z = map.origin.z + j * cs, y = hs / n;
      pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
      const t = 0.92 + 0.12 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.sin(z * 0.06 + x * 0.02);
      col[k * 3] = zr / n * t; col[k * 3 + 1] = zg / n * t; col[k * 3 + 2] = zb / n * t;
      info[k * 4] = PAT.grass; info[k * 4 + 1] = 0; info[k * 4 + 2] = 0; info[k * 4 + 3] = 0.3;
      uv[k * 2] = x; uv[k * 2 + 1] = z;
      rng[k * 2] = road / n; rng[k * 2 + 1] = Math.min(1, earth / n + tr / n);
    }
  };
  fill(0, 0, W, H);
  const idx = new Uint32Array(W * H * 6);
  let o = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const a = j * (W + 1) + i, b = a + 1, d = a + W + 1, e = d + 1;
    idx.set([a, d, b, b, d, e], o); o += 6;
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, makeToonMaterial({ side: THREE.FrontSide, terrain: true }));
  m.name = 'terrain';
  // пересчитать кусок земли после подсыпки/срезки или утаптывания (клетки x0..x1, z0..z1)
  m.userData.update = (x0, z0, x1, z1) => {
    fill(x0 - 1, z0 - 1, x1 + 2, z1 + 2);
    for (const a of ['position', 'color', 'aRange']) g.attributes[a].needsUpdate = true;
    g.computeVertexNormals(); g.computeBoundingSphere();
  };
  return m;
}

// Карта высот как текстура (для воды: глубина, отмели, пена у берега)
export function heightTexture(map) {
  const t = new THREE.DataTexture(new Float32Array(map.heights), map.width, map.height, THREE.RedFormat, THREE.FloatType);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
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

// Вода: глубина из карты высот — отмель тёплая и светлая, глубина синяя; 3 тона с растровыми переходами,
// отражение неба под скользящим углом, мазки ряби по ветру, бегущая пена у берега, блики солнца точками.
export function buildWater(size = 3000, level = 0, map = null) {
  const g = new THREE.PlaneGeometry(size, size, 1, 1); g.rotateX(-Math.PI / 2);
  const hm = map ? heightTexture(map) : null;
  const m = makeFlatShader(`
    in vec3 vW; in float vZ;
    uniform float uTime, uFogNear, uFogFar, uNight, uChthon, uPx, uWL, uHOn, uCloud; uniform vec3 uFogCol, uSkyCol, uSunCol, uSunDir, uShadeCol, uWind;
    uniform sampler2D uHMap; uniform vec4 uHRect;
    void main(){
      vec2 q = vW.xz;
      vec2 huv = (q - uHRect.xy) / uHRect.zw;
      float th = uHOn > .5 && huv.x > 0. && huv.y > 0. && huv.x < 1. && huv.y < 1. ? texture(uHMap, huv).r : uWL - 6.;
      float depth = max(uWL - th, 0.);
      vec2 fc = gl_FragCoord.xy / uPx;
      vec2 dc = fract(mat2(.707, -.707, .707, .707) * fc / 4.5) - .5; float dotR = length(dc);
      #define HT(t) ((t) <= 0. ? 0. : (t) >= 1. ? 1. : step(dotR, sqrt(t) * .72))
      float n = fbm(q * .05 + uWind.xy * uTime * .015);
      float dd = depth + (n - .5) * 1.1;
      vec3 shallowC = vec3(.42, .56, .46), midC = vec3(.2, .38, .4), deepC = vec3(.08, .17, .24);
      vec3 c = mix(deepC, midC, HT(clamp((2.6 - dd) / .8, 0., 1.)));
      c = mix(c, shallowC, HT(clamp((.9 - dd) / .5, 0., 1.)));
      // дно просвечивает на отмели: песок и камешки
      c = mix(c, vec3(.55, .5, .36), (1. - smoothstep(.0, .45, depth)) * .45 * (.7 + .3 * vnoise(q * 3.)));
      // отражение неба
      vec3 V = normalize(cameraPosition - vW);
      float fr = pow(1. - max(V.y, 0.), 2.5);
      c = mix(c, mix(uSkyCol, uSunCol, .15) * .95, fr * .6);
      // тень облаков
      float cl = clamp((fbm(q * .0105 + vec2(uTime * .012, uTime * .005)) - .5) / .1, 0., 1.);
      c *= 1. - uCloud * .35 * HT(cl);
      // мазки ряби: короткие штрихи вдоль ветра, тянутся и гаснут
      vec2 wd = normalize(uWind.xy + 1e-4); vec2 wp = vec2(dot(q, wd), dot(q, vec2(-wd.y, wd.x)));
      float row = floor(wp.y / 1.3);
      float r = fract((wp.x + hash12(vec2(row, 1.)) * 20. - uTime * (.5 + .3 * hash12(vec2(row, 2.)))) / (3.5 + 3. * hash12(vec2(row, 3.))));
      float strokeOn = step(.55, vnoise(vec2(wp.x * .08 - uTime * .1, row * .7)));
      float lineY = abs(fract(wp.y / 1.3) - .5);
      float w = step(lineY, .06 * (1. - abs(r - .5) * 1.6)) * step(r, .75) * strokeOn;
      vec3 hi = mix(uSkyCol, uSunCol, .45) * 1.15;
      c = mix(c, hi, w * .75 * (1. - uNight * .5));
      c = mix(c, deepC * .7, step(lineY, .05) * step(.8, r) * strokeOn * .4);
      // пена у берега: две бегущие полосы и кромка
      float shore = 1. - smoothstep(.0, .9, depth);
      float foam = inkLine(depth / .45 - uTime * .25 + n * 1.5, 1.6) * shore * step(.35, vnoise(q * .8 + uTime * .1));
      c = mix(c, vec3(.92, .9, .82), max(foam * .8, (1. - smoothstep(.04, .12, depth)) * .85 * uHOn));
      // блики солнца растровой точкой
      vec3 Hh = normalize(normalize(uSunDir) + V);
      float spec = pow(max(Hh.y, 0.), 60.) * step(.62, vnoise(q * 1.3 + uTime * .3));
      c += uSunCol * step(dotR, spec * .6) * (1. - uNight);
      // огни ночью
      c += vec3(1., .6, .25) * uNight * .03 * step(.7, fbm(q * .3));
      float fog = smoothstep(uFogNear, uFogFar, vZ);
      c = mix(c, uFogCol * mix(vec3(1.), vec3(1.2, .8, .8), uChthon * .6), fog);
      oColor = vec4(c, .95);
      oNormal = vec4(.5, 1., .5, 0.);
    }`, `out vec3 vW; out float vZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    { uHMap: { value: hm }, uHOn: { value: hm ? 1 : 0 }, uWL: { value: level }, uHRect: { value: map ? new THREE.Vector4(map.origin.x, map.origin.z, map.width * map.cellSize, map.height * map.cellSize) : new THREE.Vector4(0, 0, 1, 1) } },
    { transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(g, m); mesh.position.y = level - 0.25; mesh.renderOrder = 1; mesh.layers.set(1);
  return mesh;
}

// Небо: градиент + рисованные кучевые облака в 3 тона (освещённый край к солнцу, тёмное брюхо), тонкий
// контур, растровый переход; облака плывут по ветру, дальние медленнее (два слоя).
export function buildSky() {
  const g = new THREE.SphereGeometry(4000, 32, 16);
  const m = makeFlatShader(`
    in vec3 vD;
    uniform float uTime, uChthon, uNight, uPx; uniform vec3 uFogCol, uSkyCol, uSunCol, uSunDir, uShadeCol, uWind;
    float cloud(vec2 q, float t){ return fbm(q + uWind.xy * t) * .75 + vnoise(q * 3.1 + uWind.xy * t * 1.4) * .25; }
    void main(){
      vec3 d = normalize(vD);
      float h = clamp(d.y, -.1, 1.);
      vec3 top = mix(uSkyCol * .55, uSkyCol * .25, uNight);
      vec3 c = mix(uFogCol, top, smoothstep(0., .45, h));
      vec2 fc = gl_FragCoord.xy / uPx;
      vec2 dc = fract(mat2(.707, -.707, .707, .707) * fc / 4.5) - .5; float dotR = length(dc);
      #define HT(t) ((t) <= 0. ? 0. : (t) >= 1. ? 1. : step(dotR, sqrt(t) * .72))
      vec2 sd = normalize(uSunDir.xz + 1e-4);
      for (int L = 0; L < 2; L++) {
        float fl = float(L);
        vec2 q = d.xz / max(d.y + .12, .04) * (1.1 + fl * .9) + fl * 13.;
        float t = uTime * (.045 - fl * .02);
        float n = cloud(q, t);
        float thr = .54 + fl * .04;
        if (n < thr - .05) continue;
        float lit = cloud(q + sd * .09, t);             // сдвиг к солнцу: где плотность падает — освещённая кромка
        float shade = clamp((n - lit) * 9. + .5, 0., 1.);
        vec3 cLit = mix(c, uSunCol * .95 + uSkyCol * .15, .85 - uNight * .5);
        vec3 cMid = mix(c, mix(uSkyCol, uSunCol, .3) * .85, .8);
        vec3 cSh = mix(c, uShadeCol * 1.25 + uSkyCol * .2, .85);
        vec3 cc = mix(cLit, cMid, HT(clamp((shade - .35) / .2, 0., 1.)));
        cc = mix(cc, cSh, HT(clamp((shade - .62) / .2, 0., 1.)));
        float a = HT(clamp((n - thr + .05) / .06, 0., 1.)) * smoothstep(.0, .12, h) * (1. - fl * .25);
        float edge = (1. - smoothstep(.0, .012, abs(n - thr))) * .5;
        c = mix(c, cc, a);
        c = mix(c, c * .6, edge * smoothstep(.0, .15, h));
      }
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
