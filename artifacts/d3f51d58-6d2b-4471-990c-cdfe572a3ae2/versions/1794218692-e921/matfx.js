// Материалы с характером поверх рисованного стиля (paintfx.js): у каждого вида свой край тени, блик,
// фактура и ответ на свет; общие «шейдеры мира»: отсвет земли и неба, дымка и дым у огня, контакт с землёй.
import * as THREE from 'three';

export const KINDS = { stone: 1, wood: 2, hay: 3, moss: 4, metal: 5, cloth: 6 };

// общие для всех материалов параметры мира (обновлять каждый кадр)
export const WORLD = {
  uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSkyC: { value: new THREE.Color('#9ab') }, uSkyTop: { value: new THREE.Color('#468') },
  uGroundC: { value: new THREE.Color('#563') }, uHazeC: { value: new THREE.Color('#888') }, uMist: { value: 0 },
  uFireP: { value: new THREE.Vector4(0, 0, 0, 3) }, uFireC: { value: new THREE.Color('#ff9a40') }, uWind: { value: new THREE.Vector2(0.8, 0.3) }, uSmoke: { value: 1 },
};

// сколько каждый вид берёт от мира: x отсвет земли снизу, y заливка неба сверху, z сажа у огня, w тень дыма
const WORLD_K = { 1: [0.5, 0.35, 0.8, 1], 2: [0.45, 0.3, 1, 1], 3: [0.6, 0.25, 0.6, 1], 4: [0.9, 0.2, 0.3, 0.8], 5: [0, 0, 0.5, 0.6], 6: [0.5, 0.3, 0.7, 1] };

const BANDS = /* glsl */`
  if (pfHi.z < 2.5) b0 = 1.;
  {
    vec3 op = vPfObjPos;
  #if MK == 5
    // металл: край тени резкий, как у вырезанной формы
    b0 = step(pfFill.x, L); b1 = step(pfFill.y, L); b2 = step(pfFill.z * .8, L);
  #elif MK == 4
    // мох: край тени мягкий и пушистый, пятнами
    float fz = pfNoise(op.xy * 34. + op.z * 19.) * .6 + pfNoise(op.zy * 85.) * .4;
    b1 = smoothstep(pfFill.y - .2, pfFill.y + .2, L + (fz - .5) * .4);
    b0 = smoothstep(pfFill.x - .1, pfFill.x + .1, L + (fz - .5) * .25); b2 = 0.;
  #elif MK == 3
    // сено: край тени рвётся по соломинкам
    float fa = pfNoise(op.xz * 3.) * 1.4; vec2 fr = pfRot(op.xy + op.zz * .5, fa);
    float fib = pfH11(floor(fr.x * 70.)) ;
    b1 = smoothstep(pfFill.y - .05, pfFill.y + .05, L + (fib - .5) * .45);
    b0 = smoothstep(pfFill.x - .04, pfFill.x + .04, L + (fib - .5) * .2); b2 = 0.;
  #elif MK == 2
    // дерево: тень идёт по бороздам коры
    float ang = atan(op.z, op.x);
    float gr = pfNoise(vec2(ang * 9., op.y * 1.3)) * .7 + pfNoise(vec2(ang * 23., op.y * 4.)) * .3;
    b1 = smoothstep(pfFill.y - .04, pfFill.y + .04, L + (gr - .5) * .35);
    b2 *= .4;
  #elif MK == 6
    // ткань: мягкий широкий переход
    b1 = smoothstep(pfFill.y - .14, pfFill.y + .14, L); b2 = 0.;
  #elif MK == 1
    // камень: гранями, со сколами
    float ch = pfH31(floor(op * 9.));
    b1 = smoothstep(pfFill.y - .02, pfFill.y + .02, L + (ch - .5) * .18);
  #endif
  }
`;

const RESPONSE = /* glsl */`
  {
    vec3 Nw = normalize(vPfWN); vec3 Vw = normalize(cameraPosition - vPfWorld); vec3 op = vPfObjPos;
    float up = Nw.y; float shd = 1. - b1; float fres = 1. - clamp(dot(Nw, Vw), 0., 1.);
    vec3 sunD = normalize(uSunW);
  #if MK == 5
    // МЕТАЛЛ: гладкий (мазок мелкий), отражает небо и землю с резкой линией горизонта,
    // жёсткий блик формой, тёмная кромка по контуру, огонь отражается пятном
    vec3 R = reflect(-Vw, Nw);
    float hor = R.y + (pfNoise(vec2(atan(R.z, R.x) * 2.5, 3.)) - .5) * .12;
    vec3 env = hor > 0. ? mix(uSkyC * 1.05, uSkyTop, smoothstep(0., .7, hor)) : mix(uGroundC * .8, uGroundC * .22, smoothstep(0., -.45, hor));
    env = mix(env, uSkyC * 1.5 + .05, step(abs(hor), .03));
    vec3 tint = base / max(lb, .05);
    c = mix(c * .55, env * mix(vec3(1.), tint, .3), .72) * mix(.5, 1., b1);
    float sp = dot(R, sunD);
    float hs = step(.955 + (pfNoise(Nw.xz * 7. + 2.) - .5) * .03, sp);
    c = mix(c, lightHue * 1.5 + .25, hs * b0);
    vec3 Fd = uFireP.xyz + vec3(0., .7, 0.) - vPfWorld; float fd = length(Fd);
    float fs = step(.93, dot(R, Fd / fd)) * (1. - smoothstep(1., uFireP.w * 1.6, fd));
    c = mix(c, uFireC * 1.4 + .1, fs);
    c = mix(c, c * .3, step(.86, fres) * .7);
  #elif MK == 4
    // МОХ И ТРАВА: матовые, без блика; в тени тёплые жёлтые рефлексы снизу, свечение у границы света
    c = min(c, litC * 1.0);
    vec3 warm = vec3(1., .8, .28);
    float rf = shd * (.35 + .65 * clamp(.5 - up * .5, 0., 1.));
    c = mix(c, c * .55 + base * warm * 1.25 + warm * .025, rf * .5);
    float term = 1. - smoothstep(0., .16, abs(L - pfFill.y));
    c += warm * base * term * .7;
    float spk = step(.8, pfH31(floor(op * 60.)));
    c = mix(c, c * 1.3 + vec3(.03, .03, 0.), spk * b1 * .5);
    c = mix(c, c * .7, step(.82, pfH31(floor(op * 47.) + 3.)) * shd * .6);
  #elif MK == 3
    // СЕНО: тёплое, тени бурые, соломинки светлые и тёмные линии между ними, пушистая кромка
    vec3 warmSh = vec3(.62, .36, .12);
    c = mix(c, base * warmSh * 1.35 + c * .3, shd * .6);
    float fa = pfNoise(op.xz * 3.) * 1.4; vec2 fr = pfRot(op.xy + op.zz * .5, fa);
    float cell = floor(fr.x * 70.); float fx = fract(fr.x * 70.);
    float gap = step(.35, pfNoise(vec2(cell, fr.y * 6.)));
    float dl = step(.86, fx) * gap; float ll = step(fx, .3) * step(.55, pfH11(cell + 7.));
    c = mix(c, c * .42, dl * .7);
    c = mix(c, c * 1.3 + vec3(.06, .045, 0.), ll * b1 * .6);
    float fz = step(.72 + (pfNoise(op.xy * 40. + pfStep * .3) - .5) * .2, fres);
    c = mix(c, base * lightHue * 1.3 + .04, fz * b0 * .55);
  #elif MK == 2
    // ДЕРЕВО: кора бороздами, в бороздах почти чёрное, гребни ловят свет; срез с годичными кольцами
    float ang = atan(op.z, op.x);
    float gr = pfNoise(vec2(ang * 9., op.y * 1.3)) * .7 + pfNoise(vec2(ang * 23., op.y * 4.)) * .3;
    float crev = smoothstep(.56, .72, gr);
    float ridge = 1. - smoothstep(.22, .42, gr);
    float topK = step(.8, up);
    c = mix(c, base * vec3(.22, .16, .12), crev * .85 * (1. - topK));
    c = mix(c, c * 1.3 + lightHue * .04, ridge * b1 * .7 * (1. - topK));
    float r = length(op.xz) + (pfNoise(op.xz * 8.) - .5) * .02;
    float ring = step(.6, fract(r * 30.));
    vec3 cut = mix(vec3(.86, .64, .4), vec3(.62, .42, .25), ring) * mix(.45, 1., b1) * (gPfLC * pfLight.y * .5 + .5);
    c = mix(c, cut, topK);
  #elif MK == 1
    // КАМЕНЬ: сколы светлыми гранями, лишайник жёлто-зелёными пятнами сверху, холодная тень
    float ch = pfH31(floor(op * 9.));
    c = mix(c, c * 1.18, step(.75, ch) * b1);
    c = mix(c, c * .78, step(ch, .18) * .6);
    float lich = smoothstep(.7, .74, pfNoise(op.xz * 5. + op.y * 2.)) * smoothstep(.3, .7, up);
    float sfL = pfLuma(c) / max(lb, .04);
    c = mix(c, vec3(.5, .5, .2) * sfL, lich * .7);
    c = mix(c, c * .3, step(.88, pfH31(floor(op * 70.))) * .5);
  #elif MK == 6
    // ТКАНЬ: бархатный отлив на краях со стороны света, складки темнее, ворс мелкими точками
    float sheen = pow(fres, 2.2) * (.4 + .6 * b0);
    c += base * lightHue * sheen * .9;
    float fold = length(fwidth(Nw)) * 6.;
    c = mix(c, c * .55, smoothstep(.25, .8, fold) * .7);
    c *= 1. + (pfH31(floor(op * 120.)) - .5) * .12;
  #endif

    // ---------- МИР 1: свет и отражения окружения
    // снизу отсвет земли (тёплый зелёный от травы), сверху в тени заливка неба
    c += base * uGroundC * clamp(-up * .8 + .2, 0., 1.) * shd * WK.x;
    c = mix(c, c + base * uSkyC * .45, clamp(up, 0., 1.) * shd * WK.y);

    // ---------- МИР 2: дымка, туман у земли, дым и сажа у огня
    float dist = length(cameraPosition - vPfWorld);
    float low = 1. - smoothstep(0., .55, vPfWorld.y);
    c = mix(c, uHazeC, clamp(low * uMist * .45 + smoothstep(9., 45., dist) * .6 * uMist, 0., .75));
    vec3 fp = vPfWorld - uFireP.xyz;
    float nearF = 1. - smoothstep(.4, uFireP.w, length(fp.xz));
    vec2 sq = vPfWorld.xz * 1.2 - uWind * floor(pfTime * 6.) / 6. * .35 + vPfWorld.y * .5;
    float smk = pfNoise(sq) * .65 + pfNoise(sq * 2.3 + 5.) * .35;
    c *= 1. - nearF * smoothstep(.48, .7, smk) * .4 * uSmoke * WK.w;
    float faceF = clamp(dot(Nw, normalize(-fp + vec3(0., .5, 0.))), 0., 1.);
    c = mix(c, c * vec3(.5, .4, .34), nearF * (1. - faceF) * .35 * WK.z * clamp(vPfWorld.y, 0., 1.));

    // ---------- МИР 3: контакт с природой у земли
    float h = vPfWorld.y - uBase.x;
    float ao = 1. - smoothstep(0., .2, h);
    c *= 1. - ao * .5;
    c = mix(c, c * .72, step(h, .05) * .6);                                  // сырая полоса у земли
    float creep = (pfNoise(op.xz * 7. + vPfWorld.y * 3.) - .5) * .22 + (pfNoise(vec2(atan(op.z, op.x) * 4., 1.)) - .5) * .25;
    float mossZ = step(h + creep * .6, uBase.y * .16);
    float sfM = pfLuma(c) / max(lb, .04);
    vec3 mossC = vec3(.26, .36, .12) * sfM + vec3(.12, .09, .02) * shd * sfM;
    c = mix(c, mossC, mossZ * step(.01, uBase.y) * .9);
    float dirt = step(.84, pfH31(floor(vPfWorld * 38.))) * (1. - smoothstep(.0, .28, h)) * uBase.z;
    c = mix(c, vec3(.24, .17, .1) * mix(.5, 1., b1), dirt * .8);
  }
  outgoingLight = c + totalEmissiveRadiance;`;

// материал вида kind поверх style.material; base: [высота опоры, мох, грязь]
export function kindMaterial(style, kind, opts = {}, base = [0, 0, 0]) {
  const mk = KINDS[kind];
  const m = style.material(opts);
  const uBase = { value: new THREE.Vector4(base[0], base[1], base[2], 0) };
  const k = WORLD_K[mk];
  m.onBeforeCompile = (sh) => {
    style._patch(sh, m);
    Object.assign(sh.uniforms, WORLD, { uBase });
    const decl = `#define MK ${mk}\nuniform vec3 uSunW, uSkyC, uSkyTop, uGroundC, uHazeC, uFireC; uniform float uMist, uSmoke; uniform vec4 uFireP, uBase; uniform vec2 uWind;\nconst vec4 WK = vec4(${k.map((x) => x.toFixed(3)).join(',')});\n`;
    sh.fragmentShader = decl + sh.fragmentShader
      .replace('if (pfHi.z < 2.5) b0 = 1.;', BANDS)
      .replace('outgoingLight = c + totalEmissiveRadiance;', RESPONSE);
  };
  m.customProgramCacheKey = () => 'paintfx1_k' + mk;
  m.userData.uBase = uBase;
  return m;
}
