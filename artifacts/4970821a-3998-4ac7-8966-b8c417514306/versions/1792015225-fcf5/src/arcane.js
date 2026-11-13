// Новый стиль «нарисованный и мрачный»: палитры по времени суток, небо с мазками и движущимися узорами,
// пост-обработка (живопись, тонкие линии, свечение, слои дымки, цветокоррекция) и новые пучки мха и травы.
// Освещение, огонь, лужи и узоры на земле живут в общем шейдере toon.js под переключателем G.uArc.
import * as THREE from 'three';
import { G, makeFlatShader, makeToonMaterial, NOISE } from './toon.js';
import { Kit, PAT, COL, lumpify } from './kit.js';

// ---------- палитры ----------
// Нынешний стиль: как в игре (утро / день / ночь). Новый: сумерки с кострами / ночь / хмурый день. Цвета линейные.
export const STYLES = {
  old: {
    dusk:  { sun: [0.85, 0.3, -0.35], sunCol: [1.0, 0.8, 0.62], shade: [0.44, 0.41, 0.66], deep: [0.2, 0.17, 0.36], sky: [0.74, 0.7, 0.82], fog: [0.7, 0.64, 0.7], night: 0.15, near: 80, far: 560, lightK: 0.175, gain: 1.6, vign: 0.5, desat: 0, sat: 1.2, bounce: [0.6, 0.45, 0.2], ink: [0.03, 0.02, 0.03], cloud: 0.2, wind: [0.8, 0.35, 0.7] },
    day:   { sun: [0.4, 0.85, 0.35], sunCol: [1.0, 0.95, 0.84], shade: [0.34, 0.46, 0.74], deep: [0.14, 0.2, 0.42], sky: [0.6, 0.76, 0.86], fog: [0.62, 0.72, 0.78], night: 0.0, near: 180, far: 1050, lightK: 0.056, gain: 1.4, vign: 0.45, desat: 0, sat: 1.12, bounce: [0.5, 0.48, 0.2], ink: [0.02, 0.014, 0.018], cloud: 0.26, wind: [0.8, 0.35, 1.0] },
    night: { sun: [-0.45, 0.55, 0.6], sunCol: [0.26, 0.32, 0.48], shade: [0.08, 0.09, 0.2], deep: [0.03, 0.03, 0.08], sky: [0.035, 0.05, 0.08], fog: [0.035, 0.048, 0.065], night: 1, near: 35, far: 300, lightK: 0.875, gain: 1.4, vign: 1.25, desat: 0, sat: 0.75, bounce: [0.1, 0.08, 0.05], ink: [0, 0, 0], cloud: 0, wind: [0.6, 0.5, 0.55] },
  },
  new: {
    dusk:  { sun: [-0.5, 0.5, 0.55], sunCol: [0.36, 0.48, 0.5], shade: [0.085, 0.145, 0.19], deep: [0.03, 0.05, 0.065], sky: [0.16, 0.23, 0.23], fog: [0.05, 0.075, 0.078], night: 0.8, near: 26, far: 280, lightK: 1.1, gain: 1.5, bounce: [0.1, 0.09, 0.05], cloud: 0.1, wind: [0.8, 0.35, 0.8], skyScale: 1.0, haze: [0.05, 0.085, 0.085], hazeHi: [0.1, 0.12, 0.1], bloom: 0.5, vign: 0.62, sat: 0.9, contrast: 1.12, grain: 0.018 },
    night: { sun: [-0.45, 0.55, 0.6], sunCol: [0.24, 0.34, 0.4], shade: [0.07, 0.11, 0.17], deep: [0.025, 0.04, 0.06], sky: [0.07, 0.1, 0.11], fog: [0.025, 0.036, 0.042], night: 1, near: 22, far: 220, lightK: 1.5, gain: 1.4, bounce: [0.08, 0.06, 0.04], cloud: 0, wind: [0.6, 0.5, 0.55], skyScale: 0.5, haze: [0.025, 0.045, 0.05], hazeHi: [0.05, 0.07, 0.07], bloom: 0.65, vign: 0.8, sat: 0.85, contrast: 1.15, grain: 0.02 },
    day:   { sun: [0.4, 0.85, 0.35], sunCol: [0.78, 0.88, 0.82], shade: [0.2, 0.3, 0.33], deep: [0.065, 0.1, 0.12], sky: [0.34, 0.44, 0.43], fog: [0.12, 0.16, 0.16], night: 0.3, near: 40, far: 420, lightK: 0.55, gain: 1.4, bounce: [0.2, 0.2, 0.1], cloud: 0.2, wind: [0.8, 0.35, 1.0], skyScale: 1.9, haze: [0.1, 0.14, 0.14], hazeHi: [0.18, 0.2, 0.17], bloom: 0.3, vign: 0.5, sat: 0.9, contrast: 1.08, grain: 0.015 },
  },
};

export function applyStyle(style, S, c) {
  const { G, post, skyOld, skyNew, extras, fx, waterOld, water, air } = c;
  const T = STYLES[style][S.tod], isNew = style === 'new';
  G.uSunDir.value.set(...T.sun).normalize(); G.uSunCol.value.setRGB(...T.sunCol); G.uShadeCol.value.setRGB(...T.shade);
  G.uDeepCol.value.setRGB(...T.deep); G.uSkyCol.value.setRGB(...T.sky); G.uFogCol.value.setRGB(...T.fog);
  G.uNight.value = T.night; G.uFogNear.value = T.near; G.uFogFar.value = T.far;
  G.uMist.value = isNew ? 0 : (S.tod === 'day' ? 0 : 0.6); G.uBounce.value.setRGB(...T.bounce); G.uLightK.value = T.lightK; G.uFormGain.value = T.gain;
  G.uCloud.value = T.cloud; G.uWind.value.set(...T.wind);
  G.uArc.value = isNew ? 1 : 0;
  G.uDotK.value = isNew ? (S.opt.dots ? 1 : 0.22) : 1;
  G.uSig.value = isNew && S.opt.sigils ? 1 : 0;
  G.uAir.value = isNew ? 0 : 1;
  skyOld.visible = !isNew; skyNew.visible = isNew;
  G.uBrushK.value = isNew && S.opt.brush ? 1 : 0;
  if (waterOld) waterOld.visible = !isNew;
  if (water) water.mesh.visible = isNew;
  if (air) air.group.visible = isNew && !!S.opt.sigils;
  extras.group.visible = isNew; extras.oldVeg.visible = !isNew;
  const u = post.quad.material.uniforms;
  if (isNew) {
    skyNew.material.uniforms.uSigK.value = S.opt.sigils ? 1 : 0; skyNew.material.uniforms.uSkyScale.value = T.skyScale;
    u.uHaze.value = S.opt.haze ? 1 : 0; u.uBloom.value = S.opt.bloom ? T.bloom : 0; u.uVign.value = T.vign; u.uSat.value = T.sat; u.uContrast.value = T.contrast; u.uGrain.value = T.grain;
    u.uHazeLo.value.setRGB(...T.haze); u.uHazeHi.value.setRGB(...T.hazeHi); u.uSig.value = S.opt.sigils ? 1 : 0;
  } else {
    u.uVign.value = T.vign; u.uDesat.value = T.desat; u.uSat.value = T.sat; u.uPN.value = T.near * 0.9; u.uPF.value = T.near * 0.9 + 170; u.uInk.value.setRGB(...T.ink);
  }
  fx.night = S.tod === 'day' ? 0 : 0.7;
}

// ---------- небо: тёмное, мазками, с рваными светлыми пятнами и узорами, которые проступают, вращаются и дрейфуют ----------
export function makeArcSky() {
  const g = new THREE.SphereGeometry(4000, 32, 16);
  const m = makeFlatShader(`
    in vec3 vD;
    uniform float uTime, uSigK, uSkyScale, uPx; uniform vec2 uRes;
    float hatch(vec2 p, float a, float f){ vec2 r = sgRot(a) * p; return smoothstep(.35, .5, abs(fract(r.y * f) - .5) * 2.) * (.6 + .4 * h21(floor(r * f * vec2(.3, 1.)))); }
    float skySigil(vec3 rd, float az, float el, float R, float seed, float t){
      vec3 a = vec3(cos(el) * sin(az), sin(el), -cos(el) * cos(az));
      vec3 e1 = normalize(cross(vec3(0., 1., 0.), a)), e2 = cross(a, e1);
      float dz = max(dot(rd, a), .25);
      vec2 uv = vec2(dot(rd, e1), dot(rd, e2)) / dz / tan(R);
      float m = sigil(uv, seed, t, fwidth(uv.x) * 1.0 + .0015);
      return m * smoothstep(.3, .5, dot(rd, a));
    }
    void main(){
      vec3 rd = normalize(vD);
      float h = rd.y, t = uTime;
      vec3 hor = vec3(.1, .115, .085), mid = vec3(.045, .058, .056), top = vec3(.014, .02, .022);
      vec3 c = mix(hor, mid, smoothstep(.0, .25, h)); c = mix(c, top, smoothstep(.2, .9, h));
      vec3 wd = normalize(vec3(.22, .1, -1.));
      float wa = acos(clamp(dot(rd, wd), -1., 1.));
      float win = (1. - smoothstep(.1, .6, wa)) * (1. - smoothstep(.0, .5, h));
      // рваные облака: широкий плоский мазок, домен-варп; 3–4 тона без размытия
      vec2 q = rd.xz / (abs(h) + .17);
      vec2 p = sgRot(.42) * q * vec2(.85, 1.8) + vec2(t * .012, 0.);
      p += .35 * vec2(fbm(p * 1.3 + t * .01), fbm(p * 1.3 + 9. - t * .012));
      float n = fbm(p) + (vnoise(p * 7.) - .5) * .12;
      vec3 cD = vec3(.013, .02, .02), cB = vec3(.04, .052, .05), cP = vec3(.07, .1, .09), cK = vec3(.1, .13, .11);
      vec3 cl = n < .44 ? cD : n < .6 ? cB : n < .76 ? cP : cK;
      cl *= 1. + 1.6 * win;
      // сухая кисть: перекрёстные штрихи в левой части неба
      float hm = hatch(p * 2.2, -.6, 9.) * .6 + hatch(p * 2.2, .8, 11.) * .4;
      cl *= 1. + (hm - .45) * .35 * step(.52, fbm(p * .5 + 3.));
      float amt = smoothstep(.0, .18, h);
      c = mix(c, cl, amt * .92);
      c += vec3(.1, .17, .16) * win * (1. - amt * .6);
      float dark = (n < .44 ? 1. : n < .6 ? .35 : 0.);
      // узоры: один большой над окном света и поменьше правее; лежат под облаками, в просвете виднее, на свету гаснут
      float sg = skySigil(rd, -.12 + t * .004, .62 + .04 * sin(t * .03), .52, 3.7, t + 25.);
      sg = max(sg, skySigil(rd, .85 - t * .003, .36, .22, 7.3, t + 31.) * .85);
      sg *= (1. - .85 * dark) * (1. - .9 * win) * smoothstep(.02, .2, h);
      c += vec3(.07, .1, .095) * sg * uSigK;
      // цифровая живопись: диагональная штриховка с шагом ~6 px (сильнее слева и на тёмном), мозаика из плиток 9 px в свечении, редкие светлые царапины кистью
      vec2 fcs = gl_FragCoord.xy / uPx;
      float hs = smoothstep(.3, .5, abs(fract(dot(fcs, vec2(.62, .78)) / 6.4) - .5) * 2.);
      float hz = .55 + .9 * (1. - fcs.x * uPx / uRes.x);
      c *= 1. + (hs - .5) * .13 * hz * (.45 + .55 * step(.3, fbm(fcs * .012 + 3.)));
      c += (hash12(floor(fcs / 9.)) - .5) * .008 * (win * 3. + .3);
      c += vec3(.012, .02, .019) * step(.955, vnoise(vec2(fcs.x * .8 + fcs.y * .16, fcs.y * .032 + 2.))) * (1. - win);
      c *= uSkyScale;
      oColor = vec4(c, 1.);
      oNormal = vec4(0.);
    }`, `out vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    { uSigK: { value: 1 }, uSkyScale: { value: 1 } }, { side: THREE.BackSide, depthWrite: false });
  const mesh = new THREE.Mesh(g, m); mesh.layers.set(1); mesh.renderOrder = -1; mesh.frustumCulled = false;
  return mesh;
}

// ---------- пост-обработка: живопись, тонкие линии, свечение, слои дымки, цвет ----------
export function makeArcPost(renderer) {
  const post = {};
  post.renderer = renderer;
  post.rt = new THREE.WebGLRenderTarget(4, 4, { count: 2, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) });
  post.rt.textures[0].name = 'color'; post.rt.textures[1].name = 'normal';
  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
  const bA = new THREE.WebGLRenderTarget(4, 4, rtOpts), bB = new THREE.WebGLRenderTarget(4, 4, rtOpts), bC = new THREE.WebGLRenderTarget(4, 4, rtOpts), bD = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  const VS = `out vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  const mk = (frag, uniforms) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, uniforms, vertexShader: VS, fragmentShader: `precision highp float;\nlayout(location = 0) out vec4 oColor; in vec2 vUv;\n${frag}` });
  const mBright = mk(`uniform sampler2D tCol, tNor; uniform vec2 uTexel; uniform float uThr;
    void main(){ vec3 s = vec3(0.); float em = 0.;
      for (int i = 0; i < 4; i++) { vec2 o = (vec2(float(i & 1), float(i >> 1)) - .5) * uTexel; s += texture(tCol, vUv + o).rgb; em = max(em, step(.1, texture(tNor, vUv + o).a) * step(texture(tNor, vUv + o).a, .35)); }
      s *= .25; float l = dot(s, vec3(.3, .55, .15));
      float k = max(smoothstep(uThr, uThr * 2.4, l), em * .6);
      oColor = vec4(s * k, 1.); }`, { tCol: { value: null }, tNor: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: .14 } });
  const mBlur = mk(`uniform sampler2D tSrc; uniform vec2 uDir;
    void main(){ vec3 s = texture(tSrc, vUv).rgb * .227; 
      s += (texture(tSrc, vUv + uDir * 1.385).rgb + texture(tSrc, vUv - uDir * 1.385).rgb) * .316;
      s += (texture(tSrc, vUv + uDir * 3.23).rgb + texture(tSrc, vUv - uDir * 3.23).rgb) * .07;
      oColor = vec4(s, 1.); }`, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
  const mDown = mk(`uniform sampler2D tSrc; void main(){ oColor = vec4(texture(tSrc, vUv).rgb, 1.); }`, { tSrc: { value: null } });
  const final = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, vertexShader: VS,
    uniforms: {
      tCol: { value: post.rt.textures[0] }, tNor: { value: post.rt.textures[1] }, tDep: { value: post.rt.depthTexture }, tB1: { value: bA.texture }, tB2: { value: bC.texture },
      uRes: G.uRes, uPx: G.uPx, uNear: { value: 1 }, uFar: { value: 1000 }, uTime: G.uTime,
      uInvP: { value: new THREE.Matrix4() }, uCamW: { value: new THREE.Matrix4() },
      uHaze: { value: 1 }, uBloom: { value: .5 }, uVign: { value: .6 }, uSat: { value: .9 }, uContrast: { value: 1.1 }, uGrain: { value: .018 }, uPaint: { value: 1 }, uSig: { value: 1 },
      uHazeLo: { value: new THREE.Color(.05, .085, .085) }, uHazeHi: { value: new THREE.Color(.1, .12, .1) }, uInk: { value: new THREE.Color(.01, .02, .022) },
    },
    fragmentShader: `precision highp float; layout(location = 0) out vec4 oColor; in vec2 vUv;
      uniform sampler2D tCol, tNor, tDep, tB1, tB2; uniform vec2 uRes; uniform float uPx, uNear, uFar, uTime, uHaze, uBloom, uVign, uSat, uContrast, uGrain, uPaint, uSig;
      uniform mat4 uInvP, uCamW; uniform vec3 uHazeLo, uHazeHi, uInk;
      ${NOISE}
      float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
      vec3 satC(vec3 c, float k){ float l = dot(c, vec3(.3, .55, .15)); return max(mix(vec3(l), c, k), 0.); }
      void main(){
        vec2 fc = gl_FragCoord.xy / uPx;
        vec4 n0 = texture(tNor, vUv);
        float rawD = texture(tDep, vUv).r;
        float dC = lin(rawD);
        bool isSky = rawD > .99999;
        float emitF = step(.1, n0.a) * step(n0.a, .35);
        vec3 col = texture(tCol, vUv).rgb;
        // ---- живопись: усреднение самого ровного квадранта (мазок), сильнее вдали; огонь не размываем
        float pa = uPaint * (1. - emitF) * (isSky ? 0. : 1.);
        if (pa > .01) {
          float r = mix(1.1, 2.6, smoothstep(10., 90., dC)) * uPx; vec2 tx = r / uRes;
          vec3 m[4]; float v[4];
          for (int q = 0; q < 4; q++) {
            vec2 dir = vec2(q == 0 || q == 3 ? -1. : 1., q < 2 ? -1. : 1.);
            vec3 sum = vec3(0.), sq = vec3(0.);
            for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) { vec3 cc = texture(tCol, vUv + dir * vec2(float(i), float(j)) * tx * .5).rgb; sum += cc; sq += cc * cc; }
            m[q] = sum / 9.; vec3 vv = sq / 9. - m[q] * m[q]; v[q] = vv.r + vv.g + vv.b;
          }
          vec3 kc = m[0]; float best = v[0];
          for (int q = 1; q < 4; q++) if (v[q] < best) { best = v[q]; kc = m[q]; }
          col = mix(col, kc, .75 * pa);
          // мазок широкой плоской кистью: вытянутые полосы чуть меняют яркость
          vec2 bq = sgRot(.5) * fc;
          float stroke = vnoise(vec2(bq.x * .035, bq.y * .5)) * .6 + vnoise(vec2(bq.x * .09 + 4., bq.y * 1.1)) * .4;
          col *= 1. + (stroke - .5) * .16 * pa;
        }
        // ---- тонкие линии только на мелочи и острых сгибах: цвет — тёмная краска, а не чёрный
        float edge = 0.;
        if (n0.a > .75 && !isSky) {
          vec2 px = vec2(.9 * uPx) / uRes;
          vec2 offs[4] = vec2[](vec2(px.x, 0.), vec2(-px.x, 0.), vec2(0., px.y), vec2(0., -px.y));
          for (int i = 0; i < 4; i++) {
            vec4 n1 = texture(tNor, vUv + offs[i]); float d1 = lin(texture(tDep, vUv + offs[i]).r);
            if (n1.a > .25 && n1.a < .75) continue;
            float dn = n1.a > .5 ? (1. - dot(n0.xyz * 2. - 1., n1.xyz * 2. - 1.)) : 1.;
            float dd = abs(d1 - dC) / max(dC, 1.);
            edge = max(edge, max(smoothstep(.3, .6, dn) * .8, smoothstep(.02, .045, dd)));
          }
          edge *= 1. - smoothstep(60., 220., dC) * .8;
        }
        col = mix(col, satC(col, 1.4) * .22 + uInk, edge * .6);
        // ---- слои дымки: по расстоянию тремя ступенями, гуще у земли, рваные края; чёрное поднимается к цвету дымки
        vec4 vp = uInvP * vec4(vUv * 2. - 1., rawD * 2. - 1., 1.); vp /= vp.w;
        vec3 wp = (uCamW * vp).xyz;
        if (!isSky && uHaze > .01) {
          vec3 camP = uCamW[3].xyz; float dist = length(wp - camP);
          float hf = exp(-max(wp.y, 0.) * .2);
          float nz = fbm(wp.xz * .08 + vec2(uTime * .012, 0.)) + fbm(wp.xz * .23 - uTime * .01) * .4;
          float lay = smoothstep(26., 48., dist) * .3 + smoothstep(48., 80., dist) * .34 + smoothstep(80., 150., dist) * .3;
          float k = lay * (.3 + .7 * hf) * smoothstep(.35, .75, nz + .35 * hf);
          k = clamp(k, 0., .85) * uHaze;
          vec3 hz = mix(uHazeLo, uHazeHi, clamp(wp.y * .08, 0., 1.));
          col = mix(col, hz, k) + hz * k * .25;
          // узоры в дымке: круги плывут и растягиваются по ветру, видны только в густых клубах
          if (uSig > .01 && k > .05) {
            vec2 u = wp.xz * .16 - vec2(.5, .2) * uTime * .04; u += .05 * vec2(sin(u.y * 3. + uTime * .3), cos(u.x * 3. - uTime * .25)); u.x *= .5;
            vec2 cell = floor(u * .5), f = fract(u * .5) * 2. - 1.; float sd = h21(cell);
            float fs = sd < .45 ? 0. : sigil(f * 1.1, sd * 10., uTime, fwidth(f.x) * 1.3 + .004);
            col += vec3(.1, .2, .19) * fs * k * uSig * .9;
          }
        }
        // ---- свечение огня и окон
        if (uBloom > .001) col += (texture(tB1, vUv).rgb * .55 + texture(tB2, vUv).rgb * .95) * uBloom * vec3(1.05, .95, .85);
        // ---- цвет: кривая контраста, холодные тени и тёплые света, сатурация, виньетка, зерно
        vec3 g = pow(max(col, 0.), vec3(1. / 2.2));
        g = clamp((g - .025) / .82, 0., 1.);
        g = mix(g, g * g * (3. - 2. * g), .35 * (uContrast - 1.) * 4. + .15);
        float lum = dot(g, vec3(.3, .55, .15));
        g += vec3(-.01, .02, .03) * (1. - smoothstep(.0, .35, lum)) + vec3(.045, .02, -.02) * smoothstep(.45, .9, lum);
        g = satC(g, mix(uSat, uSat * 1.25, emitF));
        vec2 q = vUv - .5; g *= 1. - smoothstep(.1, .75, dot(q, q) * 2.4) * uVign;
        g += (hash12(fc + fract(uTime) * 61.) - .5) * uGrain * (1. - .6 * float(isSky));
        oColor = vec4(g, 1.);
      }`,
  });
  post.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), final);
  post.scene = new THREE.Scene(); post.scene.add(post.quad);
  post.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pq = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const pscene = new THREE.Scene(); pscene.add(pq);
  const pass = (mat, target) => { pq.material = mat; renderer.setRenderTarget(target); renderer.render(pscene, post.cam); };
  post.setSize = (w, h, px) => {
    const W = Math.round(w * px), H = Math.round(h * px);
    post.rt.setSize(W, H);
    bA.setSize(Math.max(2, W >> 1), Math.max(2, H >> 1)); bB.setSize(Math.max(2, W >> 1), Math.max(2, H >> 1));
    bC.setSize(Math.max(2, W >> 2), Math.max(2, H >> 2)); bD.setSize(Math.max(2, W >> 2), Math.max(2, H >> 2));
    G.uRes.value.set(W, H); G.uPx.value = px;
  };
  post.render = (scene, camera, target = null) => {
    const r = renderer, U = final.uniforms;
    U.uNear.value = camera.near; U.uFar.value = camera.far;
    U.uInvP.value.copy(camera.projectionMatrixInverse); U.uCamW.value.copy(camera.matrixWorld);
    r.setRenderTarget(post.rt); r.clear(); r.render(scene, camera);
    if (U.uBloom.value > .001) {
      mBright.uniforms.tCol.value = post.rt.textures[0]; mBright.uniforms.tNor.value = post.rt.textures[1]; mBright.uniforms.uTexel.value.set(1 / post.rt.width, 1 / post.rt.height);
      pass(mBright, bA);
      const blur = (a, b, w, h, k) => { mBlur.uniforms.tSrc.value = a.texture; mBlur.uniforms.uDir.value.set(k / w, 0); pass(mBlur, b); mBlur.uniforms.tSrc.value = b.texture; mBlur.uniforms.uDir.value.set(0, k / h); pass(mBlur, a); };
      blur(bA, bB, bA.width, bA.height, 1.4);
      mDown.uniforms.tSrc.value = bA.texture; pass(mDown, bC);
      blur(bC, bD, bC.width, bC.height, 2.2); blur(bC, bD, bC.width, bC.height, 3.4);
    }
    r.setRenderTarget(target); r.render(post.scene, post.cam);
  };
  post.dispose = () => {};
  return post;
}

// ---------- новые пучки мха и травы: клочья из лопастей и кисточки из листьев, с контуром; живут только в новом стиле ----------
export function makeArcExtras({ scene, map, sys, veg, rnd }) {
  const group = new THREE.Group(); group.name = 'arc-extras'; scene.add(group);
  const oldVeg = veg.group;
  const okSpot = (x, z) => { const c = map.worldToCell(x, z); if (!map.inBounds(c.cx, c.cz)) return false; return map.zoneAtCell(c.cx, c.cz).key === 'ground' && sys.occ[c.cz * map.width + c.cx] === 0; };
  const up = new THREE.Vector3(0, 1, 0);
  // клочок мха: 3–6 лопастей, вверху светлая лайм, ниже средняя и тёмная; лежит на поверхности с нормалью n
  const TONES = [[0x6f8f34, 0x628430, 0x587a2c], [0x35692a, 0x2e5e26, 0x275424], [0x17401c, 0x1b441e]];
  const kit = new Kit(4242); kit.stage = 1;
  function clump(x, y, z, r, n = up, o = {}) {
    const q = new THREE.Quaternion().setFromUnitVectors(up, n);
    const cnt = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < cnt; i++) {
      const a = rnd() * 6.28, d = (i === 0 ? 0 : r * (.35 + rnd() * .5)), rr = r * (i === 0 ? 1 : .45 + rnd() * .4);
      const lift = i === 0 ? r * .28 : r * (.05 + rnd() * .22);
      const tier = i === 0 ? 0 : rnd() < .45 ? 0 : rnd() < .6 ? 1 : 2;
      let g = new THREE.IcosahedronGeometry(rr, 1);
      lumpify(g, rr * .28, 1.2 / rr, rnd() * 10, false);
      g.scale(1, .62, 1); g = g.toNonIndexed(); g.computeVertexNormals();
      const off = new THREE.Vector3(Math.cos(a) * d, lift, Math.sin(a) * d).applyQuaternion(q).add(new THREE.Vector3(x, y, z)).addScaledVector(n, .02);
      const m = new THREE.Matrix4().compose(off, q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(up, rnd() * 6.28)), new THREE.Vector3(1, 1, 1));
      const hx = TONES[tier][Math.floor(rnd() * TONES[tier].length)];
      kit.add(g, m, { pat: PAT.plain, color: hx, jitter: 0 });
    }
  }
  // кисточка травы: 5–9 острых листьев в 2 тона с контуром
  const tp = [], tn = [], tc = [], ti = [], tu = [], tr = [], ts = [], tf = [];
  const C0 = new THREE.Color(0x14381a), C1 = new THREE.Color(0x6f9a2c), CT = new THREE.Color();
  function tuft(x, y, z, s) {
    const nb = 5 + Math.floor(rnd() * 5), seed = rnd();
    for (let b = 0; b < nb; b++) {
      const a = rnd() * 6.28, lean = .25 + rnd() * .55, h = s * (.45 + rnd() * .45), w = s * (.045 + rnd() * .03);
      const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, r0 = .03 * s;
      const SEG = 4, ring = [];
      for (let k = 0; k <= SEG; k++) {
        const t = k / SEG, hh = t * h, out = Math.sin(t * lean * 1.6) * h * .55 + r0;
        const cy = hh * Math.cos(t * lean * .8), ww = w * (1 - t * t * .95) * (k === SEG ? 0 : 1);
        ring.push({ t, c: [x + dx * out, y + cy, z + dz * out], w: ww });
      }
      const nrm = new THREE.Vector3(dx * .7, .75, dz * .7).normalize();
      CT.lerpColors(C0, C1, .0);
      for (let k = 0; k < SEG; k++) {
        const A = ring[k], B = ring[k + 1];
        const v = (R, side) => [R.c[0] + px * R.w * side, R.c[1], R.c[2] + pz * R.w * side];
        const quad = [[v(A, -1), 0, A.t], [v(A, 1), 1, A.t], [v(B, 1), 1, B.t], [v(B, -1), 0, B.t]];
        for (const idx of [0, 1, 2, 0, 2, 3]) {
          const [pp, ux, uy] = quad[idx];
          tp.push(...pp); tn.push(nrm.x, nrm.y, nrm.z);
          CT.lerpColors(C0, C1, Math.pow(uy, .8)); tc.push(CT.r, CT.g, CT.b);
          ti.push(34, 1, 0, seed); tu.push(ux, uy); tr.push(0, 1); ts.push(uy * uy * .5); tf.push(0, 0);
        }
      }
    }
  }
  // ---- расстановка ----
  const bound = [];
  for (const it of sys.items.values()) {
    if (it.line) continue;
    const bb = new THREE.Box3().setFromObject(it.group); bound.push({ it, bb });
  }
  const ray = new THREE.Raycaster(); ray.layers.set(0);
  for (const { it, bb } of bound) {
    const ab = it.ab, want = ab ? 90 : (it.def.id === 'izba' ? 8 : 4);
    if (it.def.id !== 'izba' && it.def.id !== 'kolodec') continue;
    let placed = 0;
    for (let a = 0; a < want * 8 && placed < want; a++) {
      const x = bb.min.x + rnd() * (bb.max.x - bb.min.x), z = bb.min.z + rnd() * (bb.max.z - bb.min.z);
      ray.set(new THREE.Vector3(x, bb.max.y + 3, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(it.group, true)[0]; if (!hit || !hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (n.y < .25 || hit.point.y < bb.min.y + 1.3) continue;
      clump(hit.point.x, hit.point.y, hit.point.z, .22 + rnd() * .3, n); placed++;
    }
    // у основания: клочья по земле вокруг
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, R = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
    for (let a = 0; a < (ab ? 22 : 5); a++) {
      const ang = rnd() * 6.28, d = R * (.8 + rnd() * .55), x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
      if (!okSpot(x, z)) continue; clump(x, map.heightAt(x, z), z, .3 + rnd() * .35);
    }
  }
  for (let i = 0; i < 40; i++) { const x = (rnd() - .5) * 64, z = (rnd() - .5) * 52; if (okSpot(x, z)) clump(x, map.heightAt(x, z), z, .3 + rnd() * .4); }
  for (let i = 0; i < 520; i++) {
    const x = (rnd() - .5) * 68, z = (rnd() - .5) * 56; if (!okSpot(x, z)) continue;
    tuft(x, map.heightAt(x, z), z, .8 + rnd() * .7);
  }
  const mossMesh = new THREE.Mesh(kit.build(), makeToonMaterial({ side: THREE.DoubleSide, wobble: 0 })); mossMesh.name = 'moss-clumps';
  group.add(mossMesh);
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tg.setAttribute('normal', new THREE.Float32BufferAttribute(tn, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3)); tg.setAttribute('aInfo', new THREE.Float32BufferAttribute(ti, 4));
  tg.setAttribute('aUv', new THREE.Float32BufferAttribute(tu, 2)); tg.setAttribute('aRange', new THREE.Float32BufferAttribute(tr, 2));
  tg.setAttribute('aSway', new THREE.Float32BufferAttribute(ts, 1)); tg.setAttribute('aFx', new THREE.Float32BufferAttribute(tf, 2));
  const tuftMesh = new THREE.Mesh(tg, makeToonMaterial({ side: THREE.DoubleSide, wobble: 0 })); tuftMesh.name = 'tufts'; tuftMesh.layers.set(1);
  group.add(tuftMesh);
  return { group, oldVeg, mossMesh, tuftMesh, update() {} };
}
