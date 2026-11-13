// Материалы с характером поверх рисованного стиля (paintfx.js): у каждого вида свой край тени, блик,
// фактура и ответ на свет; общие «шейдеры мира»: отсвет земли и неба, дымка и дым у огня, контакт с землёй.
import * as THREE from 'three';

export const KINDS = { stone: 1, wood: 2, hay: 3, moss: 4, metal: 5, cloth: 6 };

// Рисунки Michael по материалам: атлас 4 варианта × 4 слоя (в тени, на свету, аура, блик), 256 px на клетку.
// uMkN: сколько вариантов в слоях; uMkS/uMkL: плотность, знаков на метр, поворот, сила; uMkCS/uMkCL: свой цвет (a=1 включён)
const EMPTY_MK = new THREE.DataTexture(new Uint8Array(4), 1, 1); EMPTY_MK.needsUpdate = true;
export const HAND_U = {};
export const NDAB = 32;
export function handU(kind) {
  return HAND_U[kind] ??= { uMk: { value: EMPTY_MK }, uMkN: { value: new THREE.Vector4() }, uMkS: { value: new THREE.Vector4(0.5, 8, 0.3, 1) }, uMkL: { value: new THREE.Vector4(0.5, 8, 0.3, 1) },
    uMkCS: { value: new THREE.Vector4() }, uMkCL: { value: new THREE.Vector4() }, uMkA: { value: new THREE.Vector4(0.2, 0.1, 6, 1) },
    // маска перехода тени: плитка (вкл, плиток на метр, сдвиг края, мягкость) и мазки кистью прямо по предмету (мир xyz, радиус) + (сдвиг, мягкость)
    uMkM: { value: new THREE.Vector4() }, uMkMask: { value: EMPTY_MK }, uDabN: { value: 0 },
    uDab: { value: Array.from({ length: NDAB }, () => new THREE.Vector4()) }, uDabV: { value: Array.from({ length: NDAB }, () => new THREE.Vector4()) } };
}

// общие для всех материалов параметры мира (обновлять каждый кадр)
export const WORLD = {
  uSunW: { value: new THREE.Vector3(0, 1, 0) }, uSkyC: { value: new THREE.Color('#9ab') }, uSkyTop: { value: new THREE.Color('#468') },
  uGroundC: { value: new THREE.Color('#563') }, uHazeC: { value: new THREE.Color('#888') }, uMist: { value: 0 },
  uFireP: { value: new THREE.Vector4(0, 0, 0, 3) }, uFireC: { value: new THREE.Color('#ff9a40') }, uWind: { value: new THREE.Vector2(0.8, 0.3) }, uSmoke: { value: 1 },
};

// сколько каждый вид берёт от мира: x отсвет земли снизу, y заливка неба сверху, z сажа у огня, w тень дыма
const WORLD_K = { 1: [0.5, 0.35, 0.8, 1], 2: [0.45, 0.3, 1, 1], 3: [0.6, 0.25, 0.6, 1], 4: [0.9, 0.2, 0.3, 0.8], 5: [0, 0, 0.5, 0.6], 6: [0.5, 0.3, 0.7, 1] };


const MKFUNCS = /* glsl */`

// почеркушка: короткий зигзаг из 3–5 колен, линия тонкая в пикселях (не тонет под Кувахарой), клетки редкие
float mkZig(vec2 p, float dens, float seed){
  vec2 cell = floor(p); vec2 f = fract(p) - .5;
  vec3 h = pfH32(cell + seed);
  if (h.z > dens) return 0.;
  vec2 q = pfRot(f - (h.xy - .5) * .2, (h.x - .5) * 1.4);
  float k = 2. + floor(h.y * 3.);                       // сколько колен
  float tri = abs(fract(q.x * k * .9 + h.z) - .5) * 2. - .5;
  float y = tri * .22;
  float slope = .22 * 2. * k * .9;
  float d = abs(q.y - y) / sqrt(1. + slope * slope);
  float fw = max(fwidth(p.x) + fwidth(p.y), 1e-4) * .5;
  float w = fw * (1.7 + 1.2 * h.y);
  return (1. - smoothstep(w, w + fw, d)) * (1. - smoothstep(.36, .42, abs(q.x)));
}
// знак из рисунка: клетки, в каждой случайный вариант, поворот и лёгкая дрожь шагами
float mkHand(vec2 p, float row, float nv, vec4 prm){
  p *= prm.y;
  vec2 cell = floor(p); vec2 f = fract(p) - .5;
  vec3 h = pfH32(cell + row * 17.3);
  if (h.z > prm.x) return 0.;
  float v = floor(h.x * nv * .999);
  vec2 q = pfRot(f - (h.xy - .5) * .15, (h.y - .5) * prm.z * 6.2832);
  vec2 uv = q * 1.1 + .5 + (pfH22(cell + floor(pfStep * .5)) - .5) * .025;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return 0.;
  return texture2D(uMk, vec2((v + uv.x) / 4., (3. - row + uv.y) / 4.)).a * prm.w;
}
float mkDash(vec2 p, float ang, float jit, float len, float dens, float seed){
  vec2 cell = floor(p); vec2 f = fract(p) - .5;
  vec3 h = pfH32(cell + seed);
  if (h.z > dens) return 0.;
  float a = ang + (h.x - .5) * jit;
  vec2 d = pfRot(f - (h.xy - .5) * .35, -a);
  d.y += sin(d.x * 7. + h.z * 9.) * .035;                 // штрих чуть кривой, рукой
  float fw = max(fwidth(p.x) + fwidth(p.y), 1e-4) * .5;
  float w = fw * (1.6 + 1.4 * h.y);
  float hl = len * (.6 + .4 * h.x) * .5;
  return (1. - smoothstep(w, w + fw, abs(d.y))) * (1. - smoothstep(hl - .06, hl, abs(d.x)));
}
`;

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
    // маска Michael: плитка сдвигает край тени и задаёт мягкость, мазки по предмету правят переход на месте
    if (uMkM.x > .5 || uDabN > .5) {
      float shift = 0., sAdd = 0., wD = 0., sf = .03;
      if (uMkM.x > .5) {
        vec3 an = pow(abs(normalize(vPfObjN)), vec3(4.)); an /= an.x + an.y + an.z;
        vec3 q = op * uMkM.y;
        float mv = texture2D(uMkMask, q.zy).r * an.x + texture2D(uMkMask, q.xz).r * an.y + texture2D(uMkMask, q.xy).r * an.z;
        shift = (mv - .5) * uMkM.z; sf = uMkM.w; wD = 1.;
      }
      for (int i = 0; i < ${NDAB}; i++) {
        if (float(i) >= uDabN) break;
        float d = length(vPfWorld - uDab[i].xyz) / uDab[i].w; float f = 1. - smoothstep(.35, 1., d);
        shift += uDabV[i].x * f; sAdd += uDabV[i].y * f; wD = max(wD, f);
      }
      float s = max(.003, sf + sAdd);
      float Lm = L + shift;
      b1 = mix(b1, smoothstep(pfFill.y - s, pfFill.y + s, Lm), wD);
      b0 = mix(b0, smoothstep(pfFill.x - s * .7, pfFill.x + s * .7, Lm), wD);
      b2 = mix(b2, b2 * smoothstep(pfFill.z * .8 - s, pfFill.z * .8 + s, Lm + .2), wD);
    }
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
    float topK = step(.8, up) * uBase.w;                                      // срез с кольцами только у пней и чурбаков (uBase.w = 1)
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


    // ---------- ручные штрихи: в тени тёмные, на свету светлые, у каждого материала свой знак; кипят 6 к/с
    {
      vec3 an = abs(normalize(vPfObjN));
      vec2 tp = an.x > an.y && an.x > an.z ? op.zy : (an.y > an.z ? op.xz : op.xy);
      tp += (pfH22(vec2(floor(pfStep * .5), 5.)) - .5) * .012;
      float dk = 0., lk = 0.;
    #if MK == 1
      dk = mkZig(tp * 6., .85, 3.) * smoothstep(.15, .6, shd) + mkZig(tp * 7. + 4., .5, 13.) * (1. - shd);   // почеркушки зигзагом
      dk = max(dk, mkDash(tp * 8., .7, 1.4, .8, .35, 11.) * (.25 + .75 * shd));                          // сколы-чёрточки
      lk = mkZig(tp * 5. + 7., .5, 9.) * b1 * smoothstep(.2, .7, up + .3);                               // светлые каракули сверху
    #elif MK == 2
      vec2 wp = vec2(op.y * 6., atan(op.z, op.x) * 1.8);
      dk = mkDash(wp, 0., .25, .9, .8, 21.) * (.3 + .7 * shd);                 // вдоль волокна
      lk = mkDash(wp * 1.3 + 3., 0., .3, .7, .5, 23.) * b1;
    #elif MK == 3
      dk = mkDash(tp * 14., .3, 3., .85, .5, 31.) * (.2 + .8 * shd);             // соломинки во все стороны
      lk = mkDash(tp * 11. + 2., 1.2, 3., .9, .45, 33.) * b1;
    #elif MK == 4
      dk = mkDash(tp * 24., 1.5, 1.6, .55, .55, 41.) * (.2 + .8 * shd);          // ворс-галочки
      lk = step(.93, pfH21(floor(tp * 36.) + floor(pfStep * .5))) * b1;          // светлые точки
    #elif MK == 5
      dk = pfHatch(pfRot(tp * 50., .5), 7.) * smoothstep(.3, .8, shd) * .8;      // редкая гравюрная штриховка
    #elif MK == 6
      dk = (pfHatch(pfRot(tp * 70., .8), 3.) + pfHatch(pfRot(tp * 70., -.7), 5.) * step(.6, shd)) * smoothstep(.25, .8, shd);
      lk = mkDash(tp * 30., 0., .4, .8, .25, 61.) * b1 * .7;                    // нитки
    #endif
      if (uMkN.x > .5) dk = mkHand(tp, 0., uMkN.x, uMkS) * smoothstep(.08, .5, shd);
      if (uMkN.y > .5) lk = mkHand(tp + 3.7, 1., uMkN.y, uMkL) * b1;
      dk = clamp(dk, 0., 1.); lk = clamp(lk, 0., 1.);
      // в тени знаки светлые (маркер по тёмному, как в кадрах TMNT), на свету — тёмный карандаш
      vec3 shMark = c * 2.2 + base * .22 + pfCShadow * .25 + .04;
      vec3 ltMark = mix(c * .42, pfCPencil, .35);
      float inSh = smoothstep(.3, .7, shd);
      float sfC = pfLuma(c) / max(lb, .04);
      vec3 dkC = uMkCS.w > .5 ? uMkCS.rgb * mix(.5, 1.3, b1) * clamp(sfC, .3, 1.6) : mix(ltMark, shMark, inSh);
      vec3 lkC = uMkCL.w > .5 ? uMkCL.rgb * mix(.5, 1.3, b1) * clamp(sfC, .3, 1.6) : mix(ltMark, shMark, inSh * .5);
      c = mix(c, dkC, min(1., dk * 1.2));
      c = mix(c, lkC, min(1., lk * (uMkN.y > .5 ? 1. : .75)));
      gPfProt = max(gPfProt, max(dk, lk));                                   // не смазывать Кувахарой
    }
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
  const uBase = { value: new THREE.Vector4(base[0], base[1], base[2], base[3] ?? 0) };
  const k = WORLD_K[mk];
  m.onBeforeCompile = (sh) => {
    style._patch(sh, m);
    Object.assign(sh.uniforms, WORLD, { uBase }, handU(kind));
    const decl = `#define MK ${mk}\nuniform sampler2D uMk; uniform vec4 uMkN, uMkS, uMkL, uMkCS, uMkCL;\nuniform vec4 uMkM; uniform sampler2D uMkMask; uniform float uDabN; uniform vec4 uDab[${NDAB}]; uniform vec4 uDabV[${NDAB}];\nuniform vec3 uSunW, uSkyC, uSkyTop, uGroundC, uHazeC, uFireC; uniform float uMist, uSmoke; uniform vec4 uFireP, uBase; uniform vec2 uWind;\nconst vec4 WK = vec4(${k.map((x) => x.toFixed(3)).join(',')});\n`;
    sh.fragmentShader = decl + sh.fragmentShader
      .replace('if (pfHi.z < 2.5) b0 = 1.;', BANDS)
      .replace('void main() {', MKFUNCS + '\nvoid main() {')
      .replace('outgoingLight = c + totalEmissiveRadiance;', RESPONSE);
  };
  m.customProgramCacheKey = () => 'paintfx1_k' + mk;
  m.userData.uBase = uBase; m.userData.mk = kind;
  return m;
}


// ---------------------------------------------------------------- аура предметов линиями «на отрыве»
// Оболочка чуть больше предмета: видна только её кромка — рваная линия по периметру с зазором от силуэта.
const AURA_VERT = /* glsl */`
uniform float uOff; varying vec3 vN; varying vec3 vV; varying vec3 vO; varying vec3 vWp;
void main(){ vec3 p = position + normal * uOff; vO = position; vec4 w = modelMatrix * vec4(p, 1.); vWp = w.xyz;
  vec4 mv = viewMatrix * w; vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const AURA_FRAG = /* glsl */`
uniform float uStep, uW, uSeed, uK, uDash, uSkip; uniform vec3 uCol; uniform sampler2D uMk; uniform vec4 uMkN, uMkA; varying vec3 vN; varying vec3 vV; varying vec3 vO; varying vec3 vWp;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y); }
void main(){
  float st = floor(uStep * .5);
  float fres = 1. - abs(dot(normalize(vN), normalize(vV)));
  float a = atan(vO.z, vO.x);
  float t = a * 5. + vO.y * 6.;
  if (uMkN.z > .5) {
    // своя линия ауры: рисунок задаёт узор вдоль кромки (где есть линия, где разрыв) и толщину ленты в каждом месте
    float seg = (a / 6.2832 + .5) * uMkA.z + vO.y * .8; float sid = floor(seg);
    if (h21(vec2(sid * 1.73, uSeed + 2.)) < uSkip * .9) discard;             // плотность: часть повторов пропускаем
    float v = floor(h21(vec2(sid, uSeed + st * .0)) * uMkN.z * .999);
    float x = (v + fract(seg)) / 4.; float th = 0., cen = 0., cnt = 0.;
    for (int k = 0; k < 12; k++) { float y = (float(k) + .5) / 12.; float al = texture2D(uMk, vec2(x, (1. + y) / 4.)).a; if (al > .3) { th += 1.; cen += y; cnt += 1.; } }
    if (cnt < .5) discard;
    cen /= cnt;                                                             // где по высоте клетки линия: выше — дальше от предмета
    float w = uMkA.x * (.35 + th / 12. * 1.6) * uMkA.w;
    float edge = 1. - w * (.6 + .8 * (1. - cen));
    if (fres < edge) discard;
  } else {
  float w = uW * (.55 + .9 * n2(vec2(t * 1.3 + st * 1.7, uSeed)));        // нажим меняется по ходу линии
  if (fres < 1. - w) discard;
  float dash = n2(vec2(t * 2.2 + uSeed, st * .9));                           // разрывы
  if (dash < uDash) discard;
  }
  if (vWp.y < .04) discard;
  gl_FragColor = vec4(uCol * uK, .5);
  #include <colorspace_fragment>
}`;
export const LINE_AURAS = [];
export function addLineAura(mesh, { off = 0.05, w = 0.12, color = '#fff0c0', dash = 0.38, seed = Math.random() * 9, kind = null } = {}) {
  const U = { uOff: { value: off }, uW: { value: w }, uCol: { value: new THREE.Color(color) }, uStep: { value: 0 }, uSeed: { value: seed }, uK: { value: 1 }, uDash: { value: dash }, uSkip: { value: 0.4 } };
  U.w0 = w; U.dash0 = dash; U.col0 = color;
  const H = handU(kind ?? 'none'); U.uMk = H.uMk; U.uMkN = H.uMkN; U.uMkA = H.uMkA; U.off0 = off; U.kind = kind;
  const m = new THREE.Mesh(mesh.geometry, new THREE.ShaderMaterial({ uniforms: U, vertexShader: AURA_VERT, fragmentShader: AURA_FRAG, blending: THREE.NoBlending, depthWrite: false }));
  m.userData.pfSkip = true; m.userData.lineAura = true; m.renderOrder = 2; mesh.add(m); LINE_AURAS.push(U); return m;
}

// ---------------------------------------------------------------- линии из блика: кривые лучи выходят из пятна и за силуэт
const GLINT_FRAG = /* glsl */`
uniform float uStep, uSeed, uK; uniform vec3 uCol; uniform sampler2D uMk; uniform vec4 uMkN; varying vec2 vUv;
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main(){
  vec2 p = vUv * 2. - 1.; float r = length(p); float a = atan(p.y, p.x);
  float st = floor(uStep * .67);
  float m = 0.;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ai = uSeed + fi * 1.047 + (h11(fi + uSeed) - .5) * .8 + (h11(fi * 3.1 + st) - .5) * .12;
    float bend = (h11(fi * 7.3 + uSeed) - .5) * 2.4;
    float r0 = .22 + h11(fi * 5.1) * .08; float r1 = r0 + .25 + .45 * h11(fi * 2.7 + st * .3);
    float da = a - ai - bend * (r - r0) * (r - r0); da = mod(da + 3.14159, 6.28318) - 3.14159;
    float d = abs(da) * r;
    float wdt = .014 * (1. - smoothstep(r0, r1, r)) + .003;
    m = max(m, (1. - smoothstep(wdt, wdt + .012, d)) * step(r0, r) * (1. - step(r1, r)));
  }
  if (uMkN.w > .5) {
    // свой рисунок блика: вариант и поворот меняются шагами
    float v = floor(h11(st + uSeed) * uMkN.w * .999);
    vec2 q = p; float ra = (h11(st * 1.7 + 3.) - .5) * .5; q = vec2(cos(ra) * q.x - sin(ra) * q.y, sin(ra) * q.x + cos(ra) * q.y);
    vec2 uv = q * .5 + .5;
    m = (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? 0. : texture2D(uMk, vec2((v + uv.x) / 4., uv.y / 4.)).a;
  }
  if (m < .5 || uK < .02) discard;
  gl_FragColor = vec4(uCol * (.6 + .6 * uK), .5);
  #include <colorspace_fragment>
}`;
export class GlintLines {
  constructor({ size = 0.6, color = '#ffffff', seed = Math.random() * 6, kind = 'metal' } = {}) {
    const H = handU(kind);
    this.U = { uStep: { value: 0 }, uSeed: { value: seed }, uK: { value: 1 }, uCol: { value: new THREE.Color(color) }, uMk: H.uMk, uMkN: H.uMkN };
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({ uniforms: this.U, blending: THREE.NoBlending, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLINT_FRAG }));
    this.mesh.userData.pfSkip = true; this.mesh.renderOrder = 3;
  }
  // точка блика на «шаре» центр/радиус (ry — вытянутость по вертикали), sun — направление на свет
  update(step, camera, center, radius, sun, k = 1, ry = 1) {
    const V = camera.position.clone().sub(center).normalize();
    const H = sun.clone().normalize().add(V).normalize();
    const p = center.clone().add(new THREE.Vector3(H.x * radius, H.y * radius * ry, H.z * radius));
    this.mesh.position.copy(p).addScaledVector(V, 0.02); this.mesh.quaternion.copy(camera.quaternion);
    this.U.uStep.value = step; this.U.uK.value = k * Math.max(0, Math.min(1, sun.y * 3 + 0.3)) * (H.dot(V) > 0.2 ? 1 : 0);
  }
}
