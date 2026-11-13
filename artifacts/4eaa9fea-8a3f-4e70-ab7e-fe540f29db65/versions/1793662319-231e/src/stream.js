// Ручей за стражем: вода с отражением неба и кромки леса, рябь по течению, блики солнца и луны, пена у берегов,
// круги от капель в дождь; по берегам мокрые камни с бликом. Формулы русла те же, что в glsl.js (streamZ, streamW).
import * as THREE from 'three';
import { G, paintMat } from './materials.js';
import { NOISE, GLOBAL_DECL, HAZE_FN } from './glsl.js';

export const streamZ = (x) => -9.5 + 2.2 * Math.sin(x * 0.11 + 0.6) + 0.8 * Math.sin(x * 0.27);
export const streamW = (x) => 1.25 + 0.4 * Math.sin(x * 0.19 + 1.0);
export const streamDist = (x, z) => Math.abs(z - streamZ(x)) - streamW(x);

export function makeStream(scene, groundY, rnd) {
  const x0 = -60, x1 = 60, step = 0.5, n = Math.round((x1 - x0) / step) + 1, across = 5;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step, zc = streamZ(x), w = streamW(x) + 0.25;
    for (let j = 0; j < across; j++) {
      const v = j / (across - 1), z = zc + (v - 0.5) * 2 * w;
      pos.push(x, groundY(x, z) + 0.06, z); uv.push(x, v);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < across - 1; j++) {
    const a = i * across + j, b = a + across;
    idx.push(a, a + 1, b, b, a + 1, b + 1); // лицом вверх
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: Object.assign({ uDeep: { value: new THREE.Color('#1f4a48') }, uShallow: { value: new THREE.Color('#5f8f7c') }, uSkyTop: { value: new THREE.Color('#9fc0c6') } }, G),
    vertexShader: `varying vec2 vUv; varying vec3 vWPos; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: GLOBAL_DECL + NOISE + HAZE_FN + /* glsl */`
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSkyTop;
      varying vec2 vUv; varying vec3 vWPos;
      float ripplesW(vec2 p, float t){
        vec2 c = floor(p), f = fract(p) - 0.5; float h = hash12(c); float ph = fract(t * 0.8 + h);
        float r = length(f - (vec2(hash12(c + 3.1), hash12(c + 7.7)) - 0.5) * 0.4);
        return smoothstep(0.04, 0.0, abs(r - ph * 0.42)) * (1.0 - ph) * step(0.3, h);
      }
      void main(){
        float acrossV = abs(vUv.y - 0.5) * 2.0;          // 0 середина, 1 берег
        float flow = uTime * 0.9;
        vec2 fp = vec2(vUv.x - flow, vWPos.z);
        // рябь: шум, бегущий по течению, наклоняет нормаль
        float n1 = fbm2(vec2(fp.x * 0.9, fp.y * 2.2)), n2 = vnoise2(vec2(fp.x * 3.5, fp.y * 6.0));
        vec3 N = normalize(vec3((n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.18, 1.0, (n2 - 0.5) * 0.3));
        vec3 V = normalize(cameraPosition - vWPos);
        vec3 R = reflect(-V, N);
        float fres = 0.15 + 0.85 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        // отражение: небо и дымка, по краю — тёмная кромка леса (полосой, ступенькой, как нарисовано)
        vec3 sky = mix(hazeColor(R), uSkyTop, smoothstep(0.15, 0.7, R.y));
        float treeLine = step(R.y, 0.18 + (fbm2(vec2(atan(R.x, -R.z) * 9.0, 1.0)) - 0.5) * 0.22);
        sky = mix(sky, sky * vec3(0.38, 0.5, 0.45) * uTint, treeLine * 0.85);
        sky = mix(sky, waterRefl(vWPos, N.xz, sky) * vec3(0.78, 0.86, 0.88), 0.9);                 // настоящее отражение стража и стволов
        // толща слоями: дно (песок, галька, каустика) видно на мели, глубже вода поглощает его и темнеет к бирюзе.
        // Границы слоёв рваные, по ним тонкие светлые линии, как обводка кистью.
        float depth = (1.0 - acrossV * acrossV) * (0.7 + 0.6 * fbm2(vec2(vWPos.x * 0.22, vWPos.z * 0.5)));
        float dq = depth + (vnoise2(vWPos.xz * 2.6) - 0.5) * 0.12 + (vnoise2(vWPos.xz * 9.0) - 0.5) * 0.04;
        float L1 = step(0.22, dq), L2 = step(0.5, dq), L3 = step(0.78, dq);
        vec2 bp = vWPos.xz + N.xz * 0.5 * depth;                       // преломление: дно сдвигается рябью
        float peb = step(0.55, vnoise2(bp * 3.2)) , peb2 = step(0.7, vnoise2(bp * 7.0 + 3.0));
        vec3 sand = vec3(0.58, 0.52, 0.38), stoneC = vec3(0.34, 0.37, 0.33), mossC = vec3(0.3, 0.42, 0.26);
        vec3 bottom = mix(sand, stoneC, peb); bottom = mix(bottom, mossC, peb2 * 0.6);
        bottom *= mix(uShadeCol, uSunCol, 0.6);
        float cau = smoothstep(0.07, 0.0, abs(vnoise2(bp * 1.8 + flow * 0.25) - vnoise2(bp * 2.1 - flow * 0.2 + 5.0)));
        bottom += uSunCol * vec3(1.0, 0.95, 0.75) * cau * 0.35 * (1.0 - L2);
        vec3 under = mix(bottom, uShallow * mix(uShadeCol, uSunCol, 0.7), 0.3 + 0.3 * L1);
        under = mix(under, uDeep * mix(uShadeCol, uSunCol, 0.6), L2 * 0.7);
        under = mix(under, uDeep * 0.62 * mix(uShadeCol, uSunCol, 0.5), L3 * 0.6);
        float lines = (1.0 - smoothstep(0.0, 0.016, abs(dq - 0.22))) * 0.5 + (1.0 - smoothstep(0.0, 0.013, abs(dq - 0.5))) * step(0.4, vnoise2(vWPos.xz * 4.0)) * 0.35;
        under = mix(under, under * 1.25 + 0.04, lines);
        vec3 col = mix(under * uTint, sky * vec3(0.84, 0.9, 0.92), clamp(fres * (0.3 + 0.3 * L1 + 0.2 * L2), 0.0, 0.8));
        // полосы течения: светлые короткие мазки
        float streak = step(0.72, vnoise2(vec2(fp.x * 1.4, fp.y * 9.0)));
        col = mix(col, sky * 1.08, streak * 0.25);
        // блики солнца или луны: искры там, где отражение смотрит на светило
        float gl = dot(R, uGlowDir) + (n2 - 0.5) * 0.05;
        col += uSunCol * vec3(1.0, 0.95, 0.85) * step(0.985, gl) * 1.6;
        col += uSunCol * 0.25 * step(0.94, gl);
        // пена и светлая кромка у берегов
        float foam = step(0.84 + (vnoise2(vec2(fp.x * 2.0, vUv.y * 9.0)) - 0.5) * 0.18, acrossV);
        col = mix(col, vec3(0.92, 0.94, 0.88) * uTint, foam * 0.6);
        // ночные огни отражаются
        col += lampLight(vWPos + vec3(0.0, 0.4, 0.0), R) * 0.6;
        // дождь: круги от капель
        if (uRain > 0.0) col += sky * (ripplesW(vWPos.xz * 2.5, uTime) + ripplesW(vWPos.xz * 2.5 + 9.0, uTime * 1.2)) * uRain * 0.6;
        col = applyHaze(col, vWPos);
        float a = smoothstep(1.0, 0.9, acrossV);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(g, mat); water.renderOrder = 1; water.receiveShadow = false;
  scene.add(water);

  // мокрые камни по берегам и в воде: тёмные, с бликом и зеленью снизу
  const stoneMat = paintMat({ base: '#7d7b84', litTint: [1.1, 1.0, 0.86], shadeTint: [0.95, 1.0, 1.1], gloss: 1, grime: 1, wear: 0.6, crack: 0.5,
    patchB: { col: '#5d7d6c', scale: 1.6, th: 0.6, edge: 0.5, amt: 0.9 }, strokeAmt: 0.14, break: 0.2, rim: 0.4 });
  const N = 46;
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + 0.12 * Math.sin(v.x * 4 + v.y * 3) * Math.sin(v.z * 5); p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  geo.computeVertexNormals();
  const stones = new THREE.InstancedMesh(geo, stoneMat, N);
  stones.castShadow = stones.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const x = -26 + rnd() * 52; const side = rnd() < 0.5 ? -1 : 1;
    const inWater = rnd() < 0.3;
    const z = streamZ(x) + side * (inWater ? rnd() * streamW(x) * 0.8 : streamW(x) + rnd() * 0.6);
    const r = 0.18 + rnd() * (inWater ? 0.32 : 0.45);
    s.set(r * (1 + rnd() * 0.5), r * (0.45 + rnd() * 0.25), r * (0.9 + rnd() * 0.4));
    q.setFromEuler(e.set(rnd() * 0.3, rnd() * Math.PI * 2, rnd() * 0.3));
    m.compose(new THREE.Vector3(x, groundY(x, z) + s.y * 0.35, z), q, s); // каменья наполовину в земле
    stones.setMatrixAt(i, m);
  }
  scene.add(stones);
  return { water, stones };
}
