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
      // дорога утоплена в траву (~12 см), утоптанная тропа чуть меньше: видно с низкой камеры, кромку дорисовывает шейдер
      const x = map.origin.x + i * cs, z = map.origin.z + j * cs, y = hs / n - 0.12 * road / n - 0.04 * Math.min(1, tr / n);
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
  // half float: линейная фильтрация есть везде (float32 без расширения фильтруется «ступеньками» — кромка воды рвётся)
  const h = new Uint16Array(map.heights.length);
  for (let i = 0; i < h.length; i++) h[i] = THREE.DataUtils.toHalfFloat(map.heights[i]);
  const t = new THREE.DataTexture(h, map.width, map.height, THREE.RedFormat, THREE.HalfFloatType);
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

// Вода: глубина из карты высот, настоящая прозрачность по глубине (видно дно и толщу), слои под водой с параллаксом
// (дно с бликами каустики, водоросли, рыбы на разной глубине), зоны: чистая, застоявшаяся зелёная с ряской и
// кувшинками, полосы пены по течению, мусор (ветки, листья) у берегов и острова; волны набегают на берег и откатываются.
export function buildWater(size = 3000, level = 0, map = null, isle = null) {
  const g = new THREE.PlaneGeometry(size, size, 1, 1); g.rotateX(-Math.PI / 2);
  const hm = map ? heightTexture(map) : null;
  const m = makeFlatShader(`
    in vec3 vW; in float vZ;
    uniform float uTime, uFogNear, uFogFar, uNight, uChthon, uPx, uWL, uHOn, uCloud, uWDetail; uniform vec3 uFogCol, uSkyCol, uSunCol, uSunDir, uShadeCol, uWind;
    uniform sampler2D uHMap; uniform vec4 uHRect, uIsle;
    in float vSurf;
    float depthAt(vec2 q){ vec2 huv = (q - uHRect.xy) / uHRect.zw;   // глубина под зеркалом воды (не под уровнем карты)
      return uHOn > .5 && huv.x > 0. && huv.y > 0. && huv.x < 1. && huv.y < 1. ? max(vSurf - texture(uHMap, huv).r, 0.) : 6.; }
    // расстояние до берега (м, до 2.4): доля суши на кольце вокруг точки -> d = R cos(pi * доля); берега тут крутые, глубина не годится
    float landM(vec2 q){ vec2 huv = (q - uHRect.xy) / uHRect.zw; return uHOn > .5 ? clamp((texture(uHMap, huv).r - vSurf) / .12 + .5, 0., 1.) : 0.; }
    float shoreDist(vec2 q){
      float d = 2.4;
      for (int k = 0; k < 2; k++) {
        float R = k == 0 ? .9 : 2.4, cov = 0.;
        for (int i = 0; i < 12; i++) { float a = float(i) * .5236 + float(k) * .26; cov += landM(q + vec2(cos(a), sin(a)) * R); }
        cov /= 12.;
        if (cov > .01) d = min(d, R * cos(3.1416 * min(cov, .5)));
      }
      return d;
    }
    // рыба сверху: тёмное веретено с хвостом; p — точка в системе рыбы (x вдоль тела)
    float fishShape(vec2 p, float L){ float body = length(vec2(p.x / L, p.y / (L * .28))) ; float tail = step(-L * 1.35, p.x) * step(p.x, -L * .85) * step(abs(p.y), (-p.x - L * .85) * .9);
      return max(1. - smoothstep(.85, 1., body), tail); }
    void main(){
      vec2 q = vW.xz;
      float depth = depthAt(q);
      vec2 fc = gl_FragCoord.xy / uPx;
      vec2 dc = fract(mat2(.707, -.707, .707, .707) * fc / 4.5) - .5; float dotR = length(dc);
      #define HT(t) ((t) <= .1 ? 0. : (t) >= .9 ? 1. : step(dotR, sqrt(((t) - .1) / .8) * .75))   // мёртвые зоны: без одиночных точек на почти ровном тоне
      vec3 V = normalize(cameraPosition - vW);
      vec2 par = -V.xz / max(V.y, .25) * .75;                  // смещение точки на глубине 1 м (с преломлением ~0.75)
      vec2 wd = normalize(uWind.xy + 1e-4), wn = vec2(-wd.y, wd.x);
      float n = fbm(q * .05 + uWind.xy * uTime * .015);
      float sd = depth < .01 ? 0. : shoreDist(q);
      float near = max(1. - smoothstep(.0, 2.5, depth), 1. - smoothstep(.0, 2.4, sd));   // близость берега
      // ---- зоны: застоявшаяся (тихие заводи у берега), чистая; у острова и в заводях — мусор ----
      float isle = uIsle.w > 0. ? 1. - smoothstep(uIsle.w * .7, uIsle.w * 1.6, length(q - uIsle.xy)) : 0.;
      float stag = smoothstep(.5, .66, fbm(q * .013 + 4.2) + near * .18 - (1. - near) * .1);
      float debrisZ = clamp(smoothstep(.55, .7, fbm(q * .03 + 11.)) * near + isle * (1. - smoothstep(.2, 1.6, depth)), 0., 1.);
      float dd = depth + (n - .5) * 1.1;
      // ---- толща: цвет поглощения по глубине, 4 тона с растровыми переходами ----
      vec3 clearS = vec3(.46, .62, .52), clearM = vec3(.2, .44, .46), clearD = vec3(.07, .2, .28), clearX = vec3(.04, .11, .18);
      vec3 stagS = vec3(.42, .5, .24), stagM = vec3(.26, .36, .18), stagD = vec3(.12, .2, .12);
      vec3 sC = mix(clearS, stagS, stag), mC = mix(clearM, stagM, stag), dC = mix(clearD, stagD, stag), xC = mix(clearX, stagD * .7, stag);
      vec3 c = mix(xC, dC, HT(clamp((4.6 - dd) / 1.2, 0., 1.)));
      c = mix(c, mC, HT(clamp((2.4 - dd) / .8, 0., 1.)));
      c = mix(c, sC, HT(clamp((.9 - dd) / .5, 0., 1.)));
      c *= 1. - uNight * (1. - smoothstep(.3, 2.4, dd)) * .45;   // ночью светлая отмель гаснет, без светящегося кольца у берега
      // прозрачность: на отмели видно настоящее дно (земля под водой), дальше толща густеет; застой мутнее
      float clarity = mix(1.15, .55, stag);
      float alpha = clamp(1. - exp(-(depth + .08) * 1.15 / clarity), .32, .97);
      // ---- слои под водой (параллакс: чем глубже, тем сильнее сдвиг при повороте камеры) ----
      float under = 1. - uNight * .6;
      if (uWDetail > .5) {
        // дно: каустика — светлая сетка бликов, бежит по ветру
        vec2 qb = q + par * depth;
        vec4 cv = vor(qb * .9 + wd * uTime * .25 + vec2(sin(uTime * .7 + qb.y * .3), cos(uTime * .6 + qb.x * .3)) * .12);
        float caus = (1. - smoothstep(.04, .12, cv.x)) * (1. - smoothstep(.2, 1.6, depth)) * step(.05, depth) * (1. - stag * .7);
        c = mix(c, mix(c, uSunCol * 1.05, .55), caus * under * (1. - uCloud * .3) * (1. - alpha * .4));
        // водоросли на глубине 0.4–2.5 м: тёмные ленты вдоль течения, колышутся
        float dw = min(depth * .85, 1.8);
        vec2 qw = q + par * dw;
        vec2 wp = vec2(dot(qw, wd), dot(qw, wn));
        float cellW = floor(wp.y / .45);
        float on = step(.62, vnoise(vec2(wp.x * .12, wp.y * .2) + 3.)) * smoothstep(.35, .7, depth) * (1. - smoothstep(2., 3.2, depth));
        float ph = wp.x * 1.2 + hash12(vec2(cellW, 5.)) * 6.;
        float off = sin(ph + uTime * 1.3) * .08 * smoothstep(0., 3., fract(wp.x * .25 + hash12(vec2(cellW, 6.))) * 3.);
        float frond = 1. - smoothstep(.03, .07, abs(fract(wp.y / .45) - .5 - off));
        frond *= step(.35, fract(wp.x * .25 + hash12(vec2(cellW, 7.))));
        c = mix(c, mix(dC, vec3(.18, .3, .14), .5 + stag * .3), frond * on * .55 * under);
        // рыбы: стайки ходят кругами на глубине ~0.7–1.4 м
        for (int f = 0; f < 2; f++) {
          float ff = float(f);
          float df = .7 + ff * .6;
          vec2 qf = q + par * df;
          float cs = 7. + ff * 4.;
          vec2 cell = floor(qf / cs);
          float h = hash12(cell + ff * 31.);
          if (h > .55 && depthAt((cell + .5) * cs) > df + .5) {
            float sp = (.25 + .2 * hash12(cell + 7.)) * (hash12(cell + 9.) > .5 ? 1. : -1.);
            float a = uTime * sp + h * 40.;
            vec2 ctr = (cell + .5) * cs + vec2(cos(a), sin(a)) * cs * .28;
            vec2 dir = vec2(-sin(a), cos(a)) * sign(sp);
            for (int k = 0; k < 3; k++) {
              float fk = float(k);
              vec2 o = ctr - dir * fk * .55 + vec2(-dir.y, dir.x) * (hash12(cell + fk) - .5) * .7;
              vec2 r = qf - o; vec2 pf = vec2(dot(r, dir), dot(r, vec2(-dir.y, dir.x)));
              pf.y += sin(pf.x * 6. + uTime * 9. + fk) * .025;          // изгиб тела при плавании
              float L = .17 + .08 * hash12(cell + fk + 3.);
              float fs = fishShape(pf, L);
              c = mix(c, mix(c, xC * .6, .7), fs * under * (1. - stag * .5) * smoothstep(df, df + .6, depth));
            }
          }
        }
      }
      // ---- поверхность ----
      float fr = pow(1. - max(V.y, 0.), 2.5);
      c = mix(c, mix(uSkyCol, uSunCol, .15) * .95, fr * .6);
      alpha = mix(alpha, 1., fr * .5);
      float cl = clamp((fbm(q * .0105 + vec2(uTime * .012, uTime * .005)) - .5) / .1, 0., 1.);
      c *= 1. - uCloud * .35 * HT(cl);
      // мазки ряби: короткие штрихи вдоль ветра, в застое почти нет
      vec2 wp = vec2(dot(q, wd), dot(q, wn));
      float row = floor(wp.y / 1.3);
      float r = fract((wp.x + hash12(vec2(row, 1.)) * 20. - uTime * (.5 + .3 * hash12(vec2(row, 2.)))) / (4.5 + 3. * hash12(vec2(row, 3.))));
      float strokeOn = step(.66, vnoise(vec2(wp.x * .08 - uTime * .1, row * .7))) * (1. - stag * .8) * (.4 + .6 * smoothstep(.3, 1.5, depth));
      float lineY = abs(fract(wp.y / 1.3) - .5);
      float w = step(lineY, .06 * (1. - abs(r - .5) * 1.6)) * step(r, .45) * strokeOn;
      vec3 hi = mix(uSkyCol, uSunCol, .45) * 1.15;
      c = mix(c, hi, w * .75 * (1. - uNight * .5)); alpha = max(alpha, w * .9);
      c = mix(c, dC * .7, step(lineY, .05) * step(.8, r) * strokeOn * .4);
      // ряска: мелкая зелёная крупа пятнами в застое
      float duck = stag * smoothstep(.5, .62, fbm(q * .35 + wd * uTime * .01)) * step(.3, vnoise(q * 9.));
      c = mix(c, vec3(.52, .62, .22) * (.9 + .2 * vnoise(q * 4.)) * (1. - uNight * .7), duck * .9);   // ночью ряска не светится alpha = max(alpha, duck);
      // полосы пены по течению: остатки от волн, медленно дрейфуют и рвутся
      vec2 fq = vec2(dot(q, wd) - uTime * .35, dot(q, wn));
      float fil = abs(vnoise(vec2(fq.x * .06, fq.y * .9) + 2.) - .5) + (vnoise(fq * 2.2) - .5) * .03;   // тонкие кружевные нити пены
      float streak = (1. - smoothstep(.012, .022, fil)) * step(.52, vnoise(fq * vec2(.35, .8) + 9.)) * (1. - stag) * smoothstep(.3, 1.2, depth) * (1. - smoothstep(3., 6., depth));
      // волны набегают на берег: полосы идут к мелководью, у кромки — накат и откат
      float wave = inkLine(sd / .6 + uTime * .35 + n * .8, 1.8) * (1. - smoothstep(.6, 2.3, sd)) * step(.3, vnoise(q * .7 - uTime * .08));   // гребни бегут к берегу
      float swash = .18 + .14 * sin(uTime * .9 + n * 6.);      // накат и откат кромки
      float edge = 1. - smoothstep(swash, swash + .07, sd);
      vec4 bub = vor(q * 5. + vec2(0., uTime * .15));             // кружево пены — пузырьки по ячейкам
      float lace = (1. - smoothstep(swash + .1, swash + .5, sd)) * (1. - smoothstep(.05, .12, bub.x)) * (1. - edge);
      float wet = (1. - smoothstep(.0, .25 + swash, sd)) * (1. - edge);  // мокрая полоса у кромки
      c = mix(c, c * .78, wet * .5 * uHOn);
      vec3 foamC = vec3(.97, .96, .9) * (1. - uNight * .62);
      float foam = max(max(wave * .8, streak * .7), max(edge, lace * .8)) * uHOn * (1. - stag * .3);
      c = mix(c, mix(foamC, vec3(.8, .8, .62) * (1. - uNight * .65), stag * .7), foam); alpha = max(alpha, foam);
      float fline = (1. - smoothstep(.0, .035, abs(sd - swash - .08))) * uHOn * (1. - smoothstep(25., 60., vZ));   // рисованный контур наката
      c = mix(c, dC * .9, fline * .45); alpha = max(alpha, fline * .6);
      // мусор у берегов и острова: ветки, бурые листья, щепа — покачиваются на месте
      if (debrisZ > .02) {
        vec2 dq = q + vec2(sin(uTime * .5 + q.y), cos(uTime * .43 + q.x)) * .03;
        vec2 dcell = floor(dq * 1.6); vec2 df = fract(dq * 1.6) - .5;
        float hh = hash12(dcell + 3.);
        float ang = hash12(dcell) * 6.283; vec2 ax = vec2(cos(ang), sin(ang));
        vec2 dp = vec2(dot(df, ax), dot(df, vec2(-ax.y, ax.x)));
        float stick = step(hh, debrisZ * .45) * step(abs(dp.y), .035) * step(abs(dp.x), .38 * hash12(dcell + 5.) + .1);
        float leaf = step(1. - debrisZ * .5, hh) * (1. - smoothstep(.8, 1., length(vec2(dp.x / .14, dp.y / .08))));
        vec3 lc = mix(vec3(.62, .38, .14), vec3(.5, .46, .18), hash12(dcell + 8.));
        c = mix(c, vec3(.28, .2, .13), stick); c = mix(c, lc, leaf);
        alpha = max(alpha, max(stick, leaf));
        // бурая муть и тина вдоль кромки
        c = mix(c, vec3(.32, .3, .18), debrisZ * near * .35 * smoothstep(.45, .6, vnoise(q * 1.2)));
      }
      // листья и травинки плывут по течению по всей воде, медленно вращаясь
      {
        vec2 lq = q - wd * uTime * .22;
        vec2 lc = floor(lq / 2.6); vec2 lf = fract(lq / 2.6) - .5;
        float lh = hash12(lc + 21.);
        if (lh > .78 && depth > .15) {
          vec2 lo = (vec2(hash12(lc + 22.), hash12(lc + 23.)) - .5) * .6;
          float la = hash12(lc + 24.) * 6.283 + uTime * (hash12(lc + 25.) - .5) * .4; vec2 lax = vec2(cos(la), sin(la));
          vec2 lp = (lf - lo) * 2.6; lp = vec2(dot(lp, lax), dot(lp, vec2(-lax.y, lax.x)));
          float leafS = 1. - smoothstep(.8, 1., length(vec2(lp.x / .13, lp.y / .065)));
          float vein = step(abs(lp.y), .008) * step(abs(lp.x), .12);
          vec3 lcol = mix(vec3(.72, .5, .16), vec3(.6, .3, .12), hash12(lc + 26.));
          c = mix(c, mix(lcol, lcol * .6, vein), leafS * (1. - uNight * .4)); alpha = max(alpha, leafS);
        }
      }
      // блики солнца растровой точкой
      vec3 Hh = normalize(normalize(uSunDir) + V);
      float spec = pow(max(Hh.y, 0.), 60.) * step(.62, vnoise(q * 1.3 + uTime * .3)) * (1. - stag * .6);
      c += uSunCol * step(dotR, spec * .6) * (1. - uNight);
      c += vec3(1., .6, .25) * uNight * .03 * step(.7, fbm(q * .3));
      float fog = smoothstep(uFogNear, uFogFar, vZ);
      c = mix(c, uFogCol * mix(vec3(1.), vec3(1.2, .8, .8), uChthon * .6), fog);
      oColor = vec4(c, mix(alpha, 1., fog));
      oNormal = vec4(.5, 1., .5, 0.);
    }`, `out vec3 vW; out float vZ; out float vSurf; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vSurf = w.y; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
    { uHMap: { value: hm }, uHOn: { value: hm ? 1 : 0 }, uWL: { value: level }, uWDetail: { value: 1 },
      uIsle: { value: isle ? new THREE.Vector4(isle.x, isle.z, 0, isle.r) : new THREE.Vector4(0, 0, 0, 0) },
      uHRect: { value: map ? new THREE.Vector4(map.origin.x, map.origin.z, map.width * map.cellSize, map.height * map.cellSize) : new THREE.Vector4(0, 0, 1, 1) } },
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
      #define HT(t) ((t) <= .1 ? 0. : (t) >= .9 ? 1. : step(dotR, sqrt(((t) - .1) / .8) * .75))   // мёртвые зоны: без одиночных точек на почти ровном тоне
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
