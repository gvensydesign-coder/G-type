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
      // ---- рябь: поле волн из шума; отражение колышется плавно, строки мира лишь слегка сдвинуты (мазок)
      float wt = uTime;
      vec2 wq = q * .55 + .7 * vec2(vnoise(q * .5 + wt * .11), vnoise(q * .5 + 7. - wt * .09));
      float wf = fbm(wq * .8 + vec2(wt * .05, -wt * .04)) * 11.;
      float row = floor(q.y * 3.2 + nB * 2.);
      float rh = hash12(vec2(row, 5.));
      float dx = (vnoise(vec2(q.x * 1.3 + wt * .25, q.y * 5.)) - .5) * .014 + (rh - .5) * .004 + sin(q.y * 7. + wt * 1.7 + nB * 6.) * .0025;
      float dy = (vnoise(vec2(q.x * .6 + wt * .08, q.y * 2.)) - .5) * .012;
      vec4 rp = uReflM * vec4(vW, 1.);
      vec2 ruv = rp.xy / rp.w + vec2(dx, dy) * (.5 + 1.2 * clamp(1. - V.y, 0., 1.));
      vec3 rc = texture(tRefl, ruv).rgb;
      float fres = .3 + .6 * pow(1. - max(V.y, 0.), 2.2);
      vec3 refl = rc * (.66 + .2 * step(.5, rh)) + vec3(.004, .012, .014);
      col = mix(col, refl, clamp(fres * uReflK, 0., 1.));
      // рябь деликатно: широкие мягкие пятна света на гребнях (две ступени), редкие расходящиеся кольца от капель и точки-искры; линий нет
      float broad = fbm(wq * .5 + vec2(wt * .03, wt * .02));
      float hl = smoothstep(.52, .62, broad) * .6 + smoothstep(.6, .7, broad) * .4;
      float rm = 1. - smoothstep(30., 120., vZ);
      vec3 hiC = uSkyCol * 1.5 + vec3(.02, .04, .04);
      col = mix(col, col * 1.25 + hiC * .22, hl * rm * (.55 - uNight * .2));
      col = mix(col, col * .85, (1. - hl) * .15);
      vec2 rcell = floor(q / 5.5), rf = fract(q / 5.5) - .5;
      float rh0 = hash12(rcell + 3.);
      float rph = fract(wt * (.1 + .06 * hash12(rcell + 9.)) + rh0);
      vec2 rctr = (vec2(hash12(rcell + 1.), hash12(rcell + 2.)) - .5) * .5;
      float rdist = length((rf - rctr) * 5.5 * vec2(1., 1.));
      float rr = rph * 1.9;
      float ring = (1. - smoothstep(.0, .05 + .04 * rph, abs(rdist - rr))) * (1. - rph) * step(.55, rh0) * rm;
      col = mix(col, col * 1.7 + hiC * .45, ring * .45);
      float slope = clamp(abs(fract(wf) - .5) * 2., 0., 1.);
      float spk = step(.95, vnoise(q * 8. + vec2(0., wt * .6))) * step(.6, slope) * rm;
      col += hiC * spk * .3;
      vec2 fcd = fc;
      vec2 dg = fract(mat2(.707, -.707, .707, .707) * fcd / 6.) - .5;
      col += uSkyCol * step(length(dg), .2) * step(.72, vnoise(q * .4 + 9.)) * .35 * fres;
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
        float tick = step(.62, vnoise(vec2(along * 6. + uTime * .6, floor(lat * 3.2) * 4.))) * step(abs(fract(lat * 3.2) - .5), .09) * smoothstep(-.5, 1.5, along) * smoothstep(.0, .3, aa);
        col += uPLc[i] * tick * 1.1 * (.5 + aa);
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
