// Узоры в воздухе: тонкие круги и лучи висят среди сцены (не на земле), за предметами по глубине, и каждые несколько секунд
// гаснут и проступают в другом месте: за холмом, в далёкой дымке, над костром и его отражением в озере, за заброшенной избой, меж деревьев.
import * as THREE from 'three';
import { G, makeFlatShader } from './toon.js';

export function makeAirSigils({ scene, map, rnd }) {
  const group = new THREE.Group(); group.name = 'air-sigils';
  const hy = (x, z) => map.heightAt(x, z);
  // якоря: p — центр, R — радиус узора, a — яркость, warm — тёплый (огонь), name — для проверки
  const hill = (x, z, up = -1.5) => ({ x, z, y: hy(x, z) + up });
  const ANCH = [
    { name: 'hill', ...hill(-8, -66, 1.0), R: 9, a: .95 },
    { name: 'hill2', ...hill(30, -62, .5), R: 7, a: .85 },
    { name: 'ruin', x: 15, z: -17, y: 5.5, R: 5.2, a: 1 },
    { name: 'trees', x: -21, z: -26, y: 8.5, R: 6.5, a: .9 },
    { name: 'trees2', x: 26, z: -30, y: 9.5, R: 7, a: .85 },
    { name: 'fog', x: 6, z: -86, y: 15, R: 17, a: .6 },
    { name: 'fog2', x: -40, z: -78, y: 12, R: 13, a: .55 },
    { name: 'fire-lake', x: -3, z: -29, y: 5.8, R: 5.4, a: 1.1, warm: 1 },
    { name: 'fire-lake2', x: 3, z: -32, y: 4.2, R: 3.6, a: .9, warm: 1 },
    { name: 'forest-w', x: -52, z: -8, y: 9, R: 8, a: .8 },
    { name: 'forest-e', x: 55, z: -12, y: 10, R: 8.5, a: .8 },
    { name: 'forest-w2', x: -48, z: 24, y: 7.5, R: 6, a: .7 },
  ];
  const SLOTS = 3;
  const DAYOK = new Set(['trees', 'trees2', 'hill', 'hill2', 'fog', 'fog2', 'forest-w', 'forest-e', 'forest-w2']);
  const COLS = [[.11, .22, .2], [.15, .23, .13], [.11, .14, .25], [.2, .17, .09], [.17, .12, .2]];
  const quad = new THREE.PlaneGeometry(2, 2);
  const slots = [];
  const mkMat = () => makeFlatShader(`
    in vec2 vP; in float vZ;
    uniform float uA, uSeed, uT, uSig, uFogNear, uFogFar, uNight, uKind, uW; uniform vec3 uCol; uniform float uTime;
    float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
    // пять разных форм узора: круг с лучами, звезда-многоугольник, спираль, ромб с квадратом, цветок из дуг, дробные кольца
    float variant(vec2 p, float kind, float seed, float t, float px){
      if (kind < .5) return sigil(p, seed, t, px);
      float r = length(p), m = 0.;
      vec2 q = sgRot(h11(seed) * 6.28 + t * .01) * p;
      float ang = atan(q.y, q.x);
      if (kind < 1.5) {
        float n = 5. + floor(h11(seed + 2.) * 4.), k = floor(2. + h11(seed + 5.) * (n * .5 - 1.5));
        m = max(m, sgRing(r, .92, px));
        if (h11(seed + 9.) > .5) m = max(m, sgRing(r, .36, px));
        for (int i = 0; i < 9; i++) {
          if (float(i) >= n) break;
          float a0 = float(i) / n * 6.2832, a1 = (float(i) + k) / n * 6.2832;
          vec2 v0 = .92 * vec2(cos(a0), sin(a0)), v1 = .92 * vec2(cos(a1), sin(a1));
          m = max(m, smoothstep(px, 0., segD(q, v0, v1)));
          m = max(m, smoothstep(.04, .0, length(q - v0)) * .8);
        }
      } else if (kind < 2.5) {
        float turns = 3. + floor(h11(seed + 3.) * 3.), f = r * turns - ang / 6.2832 - t * .01;
        float d = min(fract(f), 1. - fract(f)) / turns;
        m = max(m, smoothstep(px, 0., d) * step(r, .96) * step(.05, r));
        for (int i = 0; i < 8; i++) { float a = float(i) * .785 + h11(seed) * 6.; m = max(m, smoothstep(.035, .0, length(q - .97 * vec2(cos(a), sin(a)))) * .9); }
        m = max(m, sgRing(r, .99, px * .8) * step(.5, fract(ang * 1.9 + h11(seed + 4.))));
      } else if (kind < 3.5) {
        float dm = abs(abs(q.x) + abs(q.y) - .85) * .707, sq = abs(max(abs(q.x), abs(q.y)) - .55);
        m = max(m, smoothstep(px, 0., dm)); m = max(m, smoothstep(px, 0., sq) * .9);
        float cr = min(abs(q.x), abs(q.y));
        m = max(m, smoothstep(px, 0., cr) * step(r, .95) * step(.5, fract(r * 5. + .2)));
        for (int i = 0; i < 4; i++) { float a = float(i) * 1.5708; m = max(m, sgRing(length(q - .85 * vec2(cos(a), sin(a))), .09, px)); }
        m = max(m, sgRing(r, .98, px) * step(.5, fract(ang * 1.6)));
      } else if (kind < 4.5) {
        float n = 6. + floor(h11(seed + 6.) * 3.);
        for (int i = 0; i < 9; i++) { if (float(i) >= n) break; float a = float(i) / n * 6.2832; m = max(m, smoothstep(px, 0., abs(length(q - .48 * vec2(cos(a), sin(a))) - .48)) * step(r, 1.)); }
        m = max(m, sgRing(r, .1, px)); m = max(m, sgRing(r, .99, px * .8));
      } else {
        for (int i = 0; i < 5; i++) {
          float fi = float(i), R = .25 + fi * .17;
          float win = step(fract(ang / 6.2832 + h11(seed + fi * 3.)), .45 + .35 * h11(seed + fi));
          m = max(m, sgRing(r, R, px * (1. + .5 * h11(seed + fi))) * win);
        }
        m = max(m, sgTicks(ang, 18., r, .95, .08, px));
      }
      return clamp(m, 0., 1.) * (.8 + .2 * h21(vec2(floor(t * 6.), seed)));
    }
    void main(){
      float pxw = (fwidth(vP.x) * 1.15 + .004) * uW;
      float m = variant(vP, uKind, uSeed, uT, pxw);
      float halo = variant(vP, uKind, uSeed, uT, pxw * 9.);   // аура: толстые размытые линии ступенями
      m = max(m, (halo > .55 ? .13 : halo > .22 ? .06 : 0.));
      // ластик: линии местами стёрты кистью
      float er = smoothstep(.3, .55, fbm(vP * 4.5 + uSeed * 9. + uTime * .03));
      m *= mix(.35, 1., er);
      m *= 1. - smoothstep(.85, 1.1, length(vP));
      float fog = smoothstep(uFogNear, uFogFar * 1.5, vZ);
      float a = m * uA * (1. - fog * .55);
      oColor = vec4(uCol * a, 1.);
      oNormal = vec4(0.);
    }`, `
    uniform vec3 uC; uniform float uS; out vec2 vP; out float vZ;
    void main(){
      vP = position.xy;
      vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec3 w = uC + (r * position.x + u * position.y) * uS * 1.2;
      vP *= 1.2;
      vec4 mv = viewMatrix * vec4(w, 1.); vZ = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
    { uKind: { value: 0 }, uW: { value: 1 }, uA: { value: 0 }, uSeed: { value: 1 }, uT: { value: 0 }, uCol: { value: new THREE.Color(.1, .2, .19) }, uC: { value: new THREE.Vector3() }, uS: { value: 1 } },
    { transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < SLOTS; i++) {
    const mat = mkMat();
    const mesh = new THREE.Mesh(quad, mat); mesh.frustumCulled = false; mesh.layers.set(1); mesh.renderOrder = 2.5; mesh.visible = false;
    group.add(mesh);
    slots.push({ mesh, mat, a: null, t: rnd() * 6 + i * 2.2, life: 8 + rnd() * 5, seed: rnd() * 10, tOff: 0, anchor: null, drift: [rnd() - .5, rnd() - .5] });
  }
  scene.add(group);
  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), v3 = new THREE.Vector3();
  const used = new Set();
  function pick(slot, camera, tgt, tod) {
    // предпочитаем то, что попадает в кадр и не занято
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    const cand = [];
    for (const an of ANCH) {
      if (used.has(an)) continue;
      if (tod === 'day' && !DAYOK.has(an.name)) continue;
      if (Math.hypot(an.x - tgt.x, an.z - tgt.z) < 40) continue;   // только вдали от игрока
      v3.set(an.x, an.y, an.z);
      const d = v3.distanceTo(camera.position);
      const vis = fr.containsPoint(v3) || (v3.set(an.x, an.y - an.R * .6, an.z), fr.containsPoint(v3));
      if (vis && d > 8) cand.push(an);
    }
    const arr = cand.length ? cand : ANCH.filter(a => !used.has(a) && (tod !== 'day' || DAYOK.has(a.name)) && Math.hypot(a.x - tgt.x, a.z - tgt.z) >= 40);
    if (!arr.length) return null;
    return arr[Math.floor(rnd() * arr.length)];
  }
  function begin(s, camera, tgt, tod) {
    if (s.anchor) used.delete(s.anchor);
    s.anchor = pick(s, camera, tgt, tod); if (s.anchor) used.add(s.anchor);
    s.t = -(2 + rnd() * 5); s.life = 9 + rnd() * 6; s.seed = rnd() * 10; s.tOff = (Math.PI / 2 - s.seed * 6.28318) / .15;
    s.drift = [(rnd() - .5) * .6, (rnd() - .5) * .35];
    const u = s.mat.uniforms; u.uSeed.value = s.seed;
    if (!s.anchor) { s.t = -3; return; }
    u.uKind.value = Math.floor(rnd() * 6); u.uW.value = .8 + rnd() * 1.1;
    s.mat.uniforms.uCol.value.setRGB(...(s.anchor.warm ? [1.0, .5, .17] : COLS[Math.floor(rnd() * COLS.length)]));
  }
  let first = true;
  function update(dt, camera, on = true, tod = 'dusk', tgt = { x: 0, z: 0 }) {
    if (!on) return;
    const active = tod === 'day' ? 1 : tod === 'dusk' ? 2 : 3;
    for (const s of slots) {
      if (slots.indexOf(s) >= active) { s.mesh.visible = false; continue; }
      if (!s.anchor) { begin(s, camera, tgt, tod); if (first) s.t = slots.indexOf(s) === 0 ? s.life * .3 * rnd() : -rnd() * 4; }
      if (!s.anchor) { s.mesh.visible = false; continue; }
      s.t += dt;
      if (s.t > s.life || (s.anchor && tod === 'day' && !DAYOK.has(s.anchor.name))) begin(s, camera, tgt, tod);
      if (s.t < 0) { s.mesh.visible = false; continue; }
      const k = s.t, fadeIn = Math.min(1, k / .9), fadeOut = Math.min(1, (s.life - k) / .8);
      const al = Math.max(0, Math.min(fadeIn, fadeOut)); const e = al * al * (3 - 2 * al);
      const an = s.anchor, u = s.mat.uniforms;
      const flick = an.warm ? .85 + .15 * Math.sin(k * 13 + s.seed * 30) : 1;
      const nf = Math.min(1, Math.max(0, (Math.hypot(an.x - tgt.x, an.z - tgt.z) - 26) / 32));   // рядом с игроком гаснут
      u.uA.value = e * an.a * flick * (an.warm ? .75 : 1) * nf * (tod === 'day' ? .5 : 1) * (1 + Math.min(1.6, Math.hypot(an.x - tgt.x, an.z - tgt.z) / 50));   // чем дальше, тем ярче: дымка съедает
      u.uT.value = s.tOff + k * .6;
      u.uC.value.set(an.x + s.drift[0] * k * .5, an.y + s.drift[1] * k * .5, an.z);
      u.uS.value = an.R;
      s.mesh.visible = e > .002;
    }
    first = false;
  }
  return { group, update, slots, ANCH };
}
