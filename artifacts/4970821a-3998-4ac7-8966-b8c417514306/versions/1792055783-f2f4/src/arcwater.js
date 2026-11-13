// Вода нового стиля: плоское зеркало с настоящим отражением сцены (виртуальная камера), которое рвётся горизонтальными мазками,
// глубина тремя ступенями, штрихи ряби и точки, пена мазком у кромки и тёплое свечение огней на воде.
// Хозяин сцены зовёт water.reflect(renderer, scene, camera) один раз за кадр перед основным проходом.
import * as THREE from 'three';
import { G, makeFlatShader } from './toon.js';
import { heightTexture } from './terrain.js';

export function makeArcWater(map, level) {
  const W = map.width * map.cellSize, H = map.height * map.cellSize;
  const g = new THREE.PlaneGeometry(W, H, 1, 1); g.rotateX(-Math.PI / 2);
  const rt = new THREE.WebGLRenderTarget(4, 4, { count: 2, type: THREE.HalfFloatType, depthBuffer: true });
  rt.textures[0].minFilter = rt.textures[0].magFilter = THREE.LinearFilter;
  const uniforms = {
    uHMap: { value: heightTexture(map) }, uHRect: { value: new THREE.Vector4(map.origin.x, map.origin.z, W, H) }, uWL: { value: level },
    tRefl: { value: rt.textures[0] }, uReflM: { value: new THREE.Matrix4() }, uReflK: { value: 1 },
  };
  const m = makeFlatShader(`
    in vec3 vW; in float vZ;
    uniform float uTime, uFogNear, uFogFar, uNight, uPx, uWL, uReflK, uBrushK; uniform vec3 uFogCol, uSkyCol, uSunCol, uShadeCol, uWind;
    uniform sampler2D uHMap, tRefl; uniform vec4 uHRect; uniform mat4 uReflM;
    uniform vec4 uPL[16]; uniform vec3 uPLc[16]; uniform float uPLn;
    float depthAt(vec2 q){ vec2 huv = (q - uHRect.xy) / uHRect.zw; return max(uWL - texture(uHMap, huv).r, 0.); }
    void main(){
      vec2 q = vW.xz;
      float depth = depthAt(q);
      vec2 fc = gl_FragCoord.xy / uPx;
      vec3 V = normalize(cameraPosition - vW);
      float nB = fbm(q * .09 + uWind.xy * uTime * .02);
      // ---- толща: три тона глубины с рваной границей (мазками), у берега — зелёная муть
      float dd = depth + (nB - .5) * .9 + (vnoise(q * 2.2) - .5) * .12;
      vec3 cS = vec3(.045, .1, .085), cM = vec3(.02, .055, .06), cD = vec3(.008, .022, .03);
      vec3 col = dd < .55 ? cS : dd < 1.6 ? cM : cD;
      col = mix(col, vec3(.07, .09, .035), smoothstep(.5, .65, fbm(q * .05 + 3.)) * step(dd, 1.1) * .8);   // заводи с ряской
      // ---- слои воды. Нижний: мутная толща — зелёно-бурая взвесь, мягкие тёмные пятна глубины, плывут медленно
      float wt = uTime;
      vec2 wd = normalize(uWind.xy + 1e-4), wn = vec2(-wd.y, wd.x);
      float murkN = fbm(q * .22 + wd * wt * .03);
      vec3 murk = mix(vec3(.05, .075, .045), vec3(.035, .06, .06), smoothstep(.4, .65, murkN));
      col = mix(col, murk, .38 + .25 * smoothstep(.3, 2.2, depth));
      col *= .86 + .28 * smoothstep(.35, .7, fbm(q * .6 - wd * wt * .05 + 5.));               // размытые тёмные и светлые пятна внутри толщи
      // средний слой: мелкая взвесь — слабые точки, дрейфуют
      float dust = step(.965, vnoise(q * 15. + wd * wt * .15)) * (.3 + .7 * smoothstep(.3, .6, murkN));
      col += vec3(.03, .045, .035) * dust * (1. - uNight * .5);
      // ---- отражение: размытое двумя слоями (мелкое и широкое), слабое, подмешано к мути, без полос
      vec2 wq = q * .55 + .7 * vec2(vnoise(q * .5 + wt * .11), vnoise(q * .5 + 7. - wt * .09));
      float wf = fbm(wq * .8 + vec2(wt * .05, -wt * .04)) * 11.;
      float dx = (vnoise(vec2(q.x * 1.1 + wt * .2, q.y * 3.)) - .5) * .012 + sin(q.y * 6. + wt * 1.5 + nB * 6.) * .002;
      float dy = (vnoise(vec2(q.x * .6 + wt * .08, q.y * 2.)) - .5) * .01;
      vec4 rp = uReflM * vec4(vW, 1.);
      vec2 ruv = rp.xy / rp.w + vec2(dx, dy) * (.5 + 1.2 * clamp(1. - V.y, 0., 1.));
      vec3 rcS = vec3(0.), rcW = vec3(0.);
      for (int i = 0; i < 6; i++) {
        float a = float(i) * 1.047 + hash12(fc * .5) * .6;
        vec2 o = vec2(cos(a), sin(a));
        rcS += texture(tRefl, ruv + o * .006).rgb;
        rcW += texture(tRefl, ruv + o * .026 * vec2(1., 1.6)).rgb;
      }
      rcS /= 6.; rcW /= 6.;
      float fres = .12 + .4 * pow(1. - max(V.y, 0.), 2.4);
      float rl = dot(rcS, vec3(.3, .55, .15));
      vec3 reflS = mix(vec3(rl), rcS, .75) * .6 + vec3(.004, .01, .012);
      vec3 reflW = mix(vec3(dot(rcW, vec3(.3, .55, .15))), rcW, .7) * .55;
      col = mix(col, mix(reflW, reflS, .55), clamp(fres * uReflK, 0., 1.) * (.8 - .25 * murkN));
      // ---- поверхностный слой: тонкие рваные штрихи ряби вдоль ветра — линии 1 px, короткие, прерывистые; мягкие широкие блики
      vec2 sq = vec2(dot(q, wd) * .3, dot(q, wn) * 1.15) + .5 * vec2(vnoise(q * .8 + wt * .1), vnoise(q * .8 - wt * .12));
      float sf = fbm(sq * .9 + vec2(wt * .04, 0.)) * 14.;
      float brk = smoothstep(.52, .64, vnoise(q * 2.4 + vec2(wt * .15, 3.))) * smoothstep(.4, .6, vnoise(q * .35 + 8.));
      float strokeL = inkLine(sf, .55) * brk;
      float strokeD = inkLine(sf + .5, .45) * brk * .6;
      float rm = 1. - smoothstep(25., 110., vZ);
      vec3 hiC = uSkyCol * 1.4 + vec3(.02, .035, .035);
      col = mix(col, col * 1.35 + hiC * .22, strokeL * rm * .32 * (1. - uNight * .3));
      col = mix(col, col * .75, strokeD * rm * .3);
      float broad = fbm(wq * .5 + vec2(wt * .03, wt * .02));
      float hl = smoothstep(.54, .68, broad);
      col = mix(col, col * 1.12 + hiC * .08, hl * rm * .4);
      vec2 rcell = floor(q / 5.5), rf = fract(q / 5.5) - .5;
      float rh0 = hash12(rcell + 3.);
      float rph = fract(wt * (.1 + .06 * hash12(rcell + 9.)) + rh0);
      vec2 rctr = (vec2(hash12(rcell + 1.), hash12(rcell + 2.)) - .5) * .5;
      float rdist = length((rf - rctr) * 5.5);
      float ring = (1. - smoothstep(.0, .022 + .02 * rph, abs(rdist - rph * 1.9))) * (1. - rph) * step(.6, rh0) * rm * smoothstep(.45, .6, vnoise(q * 3. + rph * 4.));
      col = mix(col, col * 1.5 + hiC * .25, ring * .3);
      float slope = clamp(abs(fract(wf) - .5) * 2., 0., 1.);
      float spk = step(.96, vnoise(q * 8. + vec2(0., wt * .6))) * step(.6, slope) * rm;
      col += hiC * spk * .22;
      vec2 dg = fract(mat2(.707, -.707, .707, .707) * fc / 6.) - .5;
      col += uSkyCol * step(length(dg), .2) * step(.72, vnoise(q * .4 + 9.)) * .18 * fres;
      // ---- свечение огней на воде: три рваных ступени, вытянутых вдоль взгляда, и золотые черточки
      vec3 vdir = normalize(vec3(vW.x - cameraPosition.x, 0., vW.z - cameraPosition.z) + 1e-4);
      for (int i = 0; i < 16; i++) {
        if (float(i) >= uPLn) break;
        vec2 dq = q - uPL[i].xz;
        float aa = 1. - length(dq) / (uPL[i].w * 1.5); if (aa <= 0.) continue;
        float along = dot(dq, vdir.xz), lat = dq.x * vdir.z - dq.y * vdir.x;
        float kk = aa * aa * (.8 + .4 * (nB - .5) * 2.) * (1. - smoothstep(.0, 1.8 + abs(along) * .3, abs(lat)) * .5);
        kk += (vnoise(vec2(along * 3., lat * 1.2 + uTime * .15)) - .5) * .08;
        float gv = .5 * smoothstep(.03, .05, kk) + .3 * smoothstep(.12, .14, kk) + .25 * smoothstep(.3, .32, kk);
        col += uPLc[i] * gv * .16;
        float latc = lat * 5. + (vnoise(vec2(along * .9, lat * .7 + uTime * .1)) - .5) * 2.2;
        float tick = step(.68, vnoise(vec2(along * 9. + uTime * .6, floor(latc) * 4.))) * step(abs(fract(latc) - .5), .035) * step(.5, vnoise(vec2(along * 2.5, lat * 2.))) * smoothstep(-.5, 1.5, along) * smoothstep(.0, .3, aa);
        col += uPLc[i] * tick * .8 * (.5 + aa);
      }
      // ---- пена: накат с несколькими отступающими полосами, кружево из пузырьков и колец, тонкая светлая кромка
      float swell = .5 + .5 * sin(wt * .7 + nB * 8. + q.x * .2);
      float dsh = depth + (vnoise(q * 3.5) - .5) * .12;
      float edgeL = 1. - smoothstep(.02, .06 + .05 * swell, dsh);
      float b1 = (1. - smoothstep(.0, .035, abs(dsh - (.16 + .22 * swell)))) * step(.35, vnoise(q * 2.6 + 3.));
      float b2 = (1. - smoothstep(.0, .03, abs(dsh - (.42 + .3 * swell)))) * step(.5, vnoise(q * 3.1 + 9.)) * .8;
      vec4 bv = vor(q * 7. + vec2(0., wt * .12));
      float bub = (1. - smoothstep(.05, .09, bv.x)) * .8 + (1. - smoothstep(.0, .02, abs(bv.x - .13))) * .6;
      float zone = (1. - smoothstep(.1, .75, dsh)) * step(.4, vnoise(q * 1.3 - wt * .04));
      float lace = bub * zone * (1. - edgeL);
      vec3 foamC = mix(vec3(.2, .3, .28), vec3(.55, .66, .62), .4) * (1. - uNight * .45) + uSkyCol * .35;
      float fo = clamp(edgeL + b1 * .8 + b2 * .6 + lace * .7, 0., 1.);
      col = mix(col, col * .62, (1. - smoothstep(.0, .5, dsh)) * (1. - fo) * .5);   // мокрый тёмный берег под пеной
      col = mix(col, foamC, fo * .85);
      float fog = smoothstep(uFogNear, uFogFar, vZ);
      col = mix(col, uFogCol, fog);
      oColor = vec4(col, 1.);
      oNormal = vec4(.5, 1., .5, .5);
    }`, `out vec3 vW; out float vZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
  uniforms, { side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(map.origin.x + W / 2, level, map.origin.z + H / 2); mesh.frustumCulled = false; mesh.layers.set(1); mesh.name = 'arc-water';

  // ---- зеркальная камера ----
  const vcam = new THREE.PerspectiveCamera(); vcam.layers.enableAll();
  const tm = new THREE.Matrix4(), bias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4();
  const box = new THREE.Box3(new THREE.Vector3(map.origin.x, level - 3, map.origin.z), new THREE.Vector3(map.origin.x + W, level + .5, map.origin.z + H));
  function setSize(w, h) { rt.setSize(Math.max(2, Math.round(w * .5)), Math.max(2, Math.round(h * .5))); }
  function reflect(renderer, scene, camera) {
    // вода видна? (если кадр её не касается — зеркало не рисуем)
    camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    if (!frustum.intersectsBox(box) || camera.position.y < level + .05) { mesh.visible = false; return false; }
    mesh.visible = true;
    camera.updateMatrixWorld();
    _a.setFromMatrixPosition(camera.matrixWorld);
    _b.set(0, 0, -1).transformDirection(camera.matrixWorld);            // вперёд
    _c.set(0, 1, 0).transformDirection(camera.matrixWorld);             // вверх
    vcam.position.set(_a.x, 2 * level - _a.y, _a.z);
    vcam.up.set(_c.x, -_c.y, _c.z);
    vcam.lookAt(_a.x + _b.x, 2 * level - (_a.y + _b.y), _a.z + _b.z);
    vcam.projectionMatrix.copy(camera.projectionMatrix); vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    vcam.updateMatrixWorld(); vcam.matrixWorldInverse.copy(vcam.matrixWorld).invert();
    tm.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
    uniforms.uReflM.value.copy(tm);
    mesh.visible = false;
    G.uClipOn.value = 1; G.uClipY.value = level - .02;
    const old = renderer.getRenderTarget(), sc = renderer.getScissorTest(), vp = renderer.getViewport(new THREE.Vector4());
    renderer.setScissorTest(false);
    renderer.setRenderTarget(rt); renderer.setViewport(0, 0, rt.width, rt.height); renderer.clear();
    renderer.render(scene, vcam);
    renderer.setRenderTarget(old); renderer.setScissorTest(sc); renderer.setViewport(vp);
    G.uClipOn.value = 0;
    mesh.visible = true;
    return true;
  }
  return { mesh, rt, setSize, reflect, uniforms };
}
