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
    { name: 'ruin2', x: 9, z: -15, y: 4.6, R: 3.6, a: .9 },
    { name: 'trees', x: -21, z: -26, y: 8.5, R: 6.5, a: .9 },
    { name: 'trees2', x: 26, z: -30, y: 9.5, R: 7, a: .85 },
    { name: 'fog', x: 6, z: -86, y: 15, R: 17, a: .6 },
    { name: 'fog2', x: -40, z: -78, y: 12, R: 13, a: .55 },
    { name: 'fire-lake', x: -3, z: -29, y: 5.8, R: 5.4, a: 1.1, warm: 1 },
    { name: 'fire-lake2', x: 3, z: -32, y: 4.2, R: 3.6, a: .9, warm: 1 },
    { name: 'fire-yard', x: -6.5, z: 6, y: 4.6, R: 2.8, a: 1, warm: 1 },
    { name: 'fire-yard2', x: 7.3, z: 10.5, y: 4.2, R: 2.5, a: 1, warm: 1 },
  ];
  const SLOTS = 3;
  const quad = new THREE.PlaneGeometry(2, 2);
  const slots = [];
  const mkMat = () => makeFlatShader(`
    in vec2 vP; in float vZ;
    uniform float uA, uSeed, uT, uSig, uFogNear, uFogFar, uNight; uniform vec3 uCol; uniform float uTime;
    void main(){
      float pxw = fwidth(vP.x) * 1.15 + .004;
      float m = sigil(vP, uSeed, uT, pxw);
      float halo = sigil(vP, uSeed, uT, pxw * 9.);   // аура: толстые размытые линии ступенями
      m = max(m, (halo > .55 ? .3 : halo > .22 ? .14 : 0.));
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
    { uA: { value: 0 }, uSeed: { value: 1 }, uT: { value: 0 }, uCol: { value: new THREE.Color(.1, .2, .19) }, uC: { value: new THREE.Vector3() }, uS: { value: 1 } },
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
  function pick(slot, camera) {
    // предпочитаем то, что попадает в кадр и не занято
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
    const cand = [];
    for (const an of ANCH) {
      if (used.has(an)) continue;
      v3.set(an.x, an.y, an.z);
      const d = v3.distanceTo(camera.position);
      const vis = fr.containsPoint(v3) || (v3.set(an.x, an.y - an.R * .6, an.z), fr.containsPoint(v3));
      if (vis && d > 8) cand.push(an);
    }
    const arr = cand.length ? cand : ANCH.filter(a => !used.has(a));
    return arr[Math.floor(rnd() * arr.length)];
  }
  function begin(s, camera) {
    if (s.anchor) used.delete(s.anchor);
    s.anchor = pick(s, camera) ?? ANCH[0]; used.add(s.anchor);
    s.t = -(2 + rnd() * 5); s.life = 9 + rnd() * 6; s.seed = rnd() * 10; s.tOff = (Math.PI / 2 - s.seed * 6.28318) / .15;
    s.drift = [(rnd() - .5) * .6, (rnd() - .5) * .35];
    const u = s.mat.uniforms; u.uSeed.value = s.seed;
    s.mat.uniforms.uCol.value.setRGB(...(s.anchor.warm ? [1.0, .5, .17] : [.11, .22, .2]));
  }
  let first = true;
  function update(dt, camera, on = true) {
    if (!on) return;
    for (const s of slots) {
      if (!s.anchor) { begin(s, camera); if (first) s.t = slots.indexOf(s) === 0 ? s.life * .3 * rnd() : -rnd() * 4; }
      s.t += dt;
      if (s.t > s.life) begin(s, camera);
      if (s.t < 0) { s.mesh.visible = false; continue; }
      const k = s.t, fadeIn = Math.min(1, k / .9), fadeOut = Math.min(1, (s.life - k) / .8);
      const al = Math.max(0, Math.min(fadeIn, fadeOut)); const e = al * al * (3 - 2 * al);
      const an = s.anchor, u = s.mat.uniforms;
      const flick = an.warm ? .85 + .15 * Math.sin(k * 13 + s.seed * 30) : 1;
      u.uA.value = e * an.a * flick * (an.warm ? .75 : 1);
      u.uT.value = s.tOff + k * .6;
      u.uC.value.set(an.x + s.drift[0] * k * .5, an.y + s.drift[1] * k * .5, an.z);
      u.uS.value = an.R;
      s.mesh.visible = e > .002;
    }
    first = false;
  }
  return { group, update, slots, ANCH };
}
