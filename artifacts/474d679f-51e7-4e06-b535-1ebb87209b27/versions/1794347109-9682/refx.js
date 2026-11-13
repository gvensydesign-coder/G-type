// Приёмы из референсов (2026-11-10): 14 пунктов поверх рисованного стиля логова, сравнение «до / после».
// Материалы: дописка в конец PaintStyle._patch (флаги refF[14]); пост: цветной сдвиг по краям и эскиз дальнего плана;
// «волоски» — отдельные плоскости у грибов и оберега. Кадр рисуется дважды: слева без приёмов, справа с ними.
import * as THREE from 'three';
import { SHROOM_SPOTS } from './lair/kit.js';

export const REF_ITEMS = [
  ['Металл гранями', 'Отражение режется на 4 плоских тона: земля, тёплый отсвет, светлая линия горизонта, небо. Меч, умбон и обод щита, железо дверей.', 'hero'],
  ['Блики чёрточками', 'Блик рвётся на короткие штрихи вдоль изгиба металла.', 'hero'],
  ['Светлая кромка по рёбрам', 'Тонкая светлая линия внутри контура на рёбрах клинка, обода, оковки и досок рядом с героем.', 'hero'],
  ['Вторая кромка', 'Кромка в противоположном цвете на теневой стороне героя: холодное получает тёплую, тёплое — холодную.', 'heroShade'],
  ['Цветные тени', 'Ткань, листва и мох уходят в насыщенный тёмный своего цвета, а не в общий серо-фиолетовый.', 'wide'],
  ['Ядро тени', 'Узкая самая тёмная полоса у границы света и тени.', 'hut'],
  ['Растр в полутени', 'Точки растут к тени. Сильнее на постройках и среднем плане, у героя слабее.', 'hut'],
  ['Штрихи по постройкам', 'Линии туши вдоль брёвен и досок, с разрывами, гуще в тени.', 'hut'],
  ['Эскиз на дальнем плане', 'Двойная дрожащая линия по краям и линии построения с перелётом вдаль.', 'far'],
  ['Линии стыков', 'Стыки досок щита и дверей, пластин железа: тёмная щель и светлый край.', 'hero'],
  ['Цветной сдвиг по краям', 'Розово-голубое смещение 2–3 px только на краях силуэтов.', 'wide'],
  ['«Волоски» у волшебного', 'Тонкие лучистые штрихи у светящихся грибов и оберега героя, дрожат шагами 12 к/с.', 'shroom'],
  ['Мазки по форме', 'По дереву мазки вдоль волокна; ткань трёхтонными пятнами с рваным краем.', 'hut'],
  ['Обмотка блоками', 'Рукоять меча отдельными витками с тенью между ними.', 'hero'],
];

export const REF_U = {
  refF: { value: new Array(14).fill(0) }, refSun: { value: new THREE.Vector3(0.25, 0.85, -0.45).normalize() },
  refMisc: { value: new THREE.Vector4(1, 0, 0, 0) },
};

const DECL = /* glsl */`
uniform float refF[14]; uniform vec3 refSun; uniform vec4 refMisc; uniform float refKind, refWrap;
float refH(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float refN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(refH(i), refH(i + vec2(1., 0.)), f.x), mix(refH(i + vec2(0., 1.)), refH(i + vec2(1., 1.)), f.x), f.y); }
`;

const BODY = /* glsl */`
{
  float rk = refKind;
#ifdef MK
  if (rk < 0.) rk = float(MK);
  if (refKind < 0. && abs(rk - 5.) < .5) rk = 1.;   // серое мокрое (доски, камни) по эвристике не металл; железо логова — refKind 5
#endif
  float isS = 1. - step(.5, abs(rk - 1.)), isW = 1. - step(.5, abs(rk - 2.)), isMo = 1. - step(.5, abs(rk - 4.));
  float isM = 1. - step(.5, abs(rk - 5.)), isC = 1. - step(.5, abs(rk - 6.)), isBody = pfHero * step(rk, -.5);
  vec3 c = gl_FragColor.rgb; vec3 alb = max(diffuseColor.rgb, vec3(.001));
  vec3 Nw = normalize(vPfWN); if (!gl_FrontFacing) Nw = -Nw;
  vec3 Vw = normalize(cameraPosition - vPfWorld); vec3 Ls = normalize(refSun);
  float nl = dot(Nw, Ls); float camD = length(cameraPosition - vPfWorld); float hd = length(vPfWorld - pfFocus.xyz);
  float lc = dot(c, vec3(.299, .587, .114)); float la = max(dot(alb, vec3(.299, .587, .114)), .02);
  float near = 1. - smoothstep(9., 18., camD);
  float prot = 0.;
  vec3 fireP = vec3(0., -999., 0.); float fireR = 1.; vec3 fireC = vec3(1., .55, .2);
  if (pfBounceN > 0) { fireP = pfBounceP[0].xyz; fireR = pfBounceP[0].w; fireC = pfBounceC[0].rgb; }
  vec3 Fd = fireP - vPfWorld; float fd = length(Fd); vec3 FL = Fd / max(fd, .001);
  float fnl = dot(Nw, FL); float fat = clamp(1. - fd / (fireR * 1.6), 0., 1.);
  vec2 fc = gl_FragCoord.xy / refMisc.x;
  vec3 an = abs(Nw); float vert = 1. - smoothstep(.6, .85, an.y);
  float along = an.y > .75 ? vPfWorld.x : (an.x > an.z ? vPfWorld.z : vPfWorld.x);
  float crs = an.y > .75 ? vPfWorld.z : vPfWorld.y;
  float curv = length(fwidth(Nw)) / max(length(fwidth(vPfWorld)), 1e-4);
  float flatK = 1. - smoothstep(.6, 2.5, curv);
  float fr = 1. - max(dot(Nw, Vw), 0.);
  // 1. металл гранями
  if (isM > .5) {
    vec3 R = reflect(-Vw, Nw); float y = R.y + (refN(vPfObjPos.xy * 6.) - .5) * .14;
    float sh = mix(.5, 1., smoothstep(-.2, .1, nl));
    vec3 e = mix(c * .3, c * .8 * vec3(1.15, .95, .75), step(-.3, y));
    e = mix(e, max(c * 2.3, vec3(.42, .48, .34)), step(-.02, y));
    e = mix(e, c * 1.1 * vec3(.85, 1.05, 1.08), step(.1, y));
    c = mix(c, e * sh, refF[0] * .85);
    // 2. блики чёрточками вдоль изгиба
    vec3 H = normalize(Ls + Vw); float sp = pow(max(dot(Nw, H), 0.), 10.) + pow(max(dot(Nw, normalize(FL + Vw)), 0.), 8.) * fat;
    vec2 q = vec2(vPfObjPos.x + vPfObjPos.z, vPfObjPos.y) * vec2(70., 16.);
    float dash = step(.45, fract(q.y + refH(vec2(floor(q.x), 1.)))) * step(fract(q.x), .55);
    float hk = step(.4, sp) * dash * refF[1];
    c = mix(c, mix(vec3(.9, .95, .82), fireC * 1.3 + .15, clamp(fat * 2., 0., 1.)), hk); prot += hk;
  }
  // 3. светлая кромка по рёбрам (внутри контура)
  {
    float crease = smoothstep(.25, .6, length(fwidth(Nw)) / refMisc.x);
    float band = smoothstep(.62, .68, fr) * (1. - smoothstep(.78, .84, fr));
    float side = max(step(-.1, nl), step(0., fnl) * step(.05, fat));
    vec3 eC = mix(vec3(.62, .72, .5), fireC * 1.1 + .06, step(nl, -.1) * step(.05, fat));
    float tgt = clamp(isM + isW * max(pfHero, 1. - smoothstep(3., 7., hd)), 0., 1.);
    float ek = refF[2] * tgt * side * clamp(crease + band * .75, 0., 1.) * near;
    c = mix(c, eC, ek * .8); prot += ek;
  }
  // 4. вторая кромка в противоположном цвете (только герой)
  {
    float sat = max(alb.r, max(alb.g, alb.b)) - min(alb.r, min(alb.g, alb.b));
    vec3 comp = mix(vec3(1., .5, .16), vec3(.3, .62, 1.), step(0., alb.r - alb.b));
    float k4 = refF[3] * pfHero * smoothstep(.5, .72, fr) * smoothstep(.15, -.25, nl) * smoothstep(.03, .1, sat / max(la, .05) * .3);
    c = mix(c, comp * .5, k4 * .8); prot += k4;
  }
  // 5. цветные тени
  {
    vec3 own = alb / max(max(alb.r, max(alb.g, alb.b)), .001);
    own = clamp(mix(vec3(dot(own, vec3(.333))), own, 1.7), 0., 1.);
    vec3 cs = own * lc / max(dot(own, vec3(.299, .587, .114)), .08);
    float shd = smoothstep(.1, -.25, nl);
    c = mix(c, cs, refF[4] * shd * clamp(isC + isMo + isBody * .7, 0., 1.) * .7);
  }
  // 6. ядро тени
  {
    float core = smoothstep(-.34, -.22, nl) * (1. - smoothstep(-.13, -.05, nl));
    c = mix(c, c * .45, core * refF[5] * (1. - isM) * (1. - isMo * .6));
  }
  // 7. растр в полутени
  {
    vec2 rp = mat2(.7071, -.7071, .7071, .7071) * fc / 6.; float dd = length(fract(rp) - .5);
    float rr = .5 * smoothstep(.42, -.2, nl);
    float dots = 1. - smoothstep(rr - .07, rr + .07, dd);
    float hk = smoothstep(1.5, 5., hd) * (1. - smoothstep(25., 50., camD)) * mix(1., .3, pfHero) * step(-.25, nl) * (1. - isM) * (1. - isMo * .5);
    float dk = dots * hk * refF[6];
    c = mix(c, mix(c * .5, pfCShadow, .3), dk * .8); prot += dk;
  }
  // 8. штрихи по постройкам, 13. мазки вдоль волокна
  if (isW > .5 && pfHero < .5) {
    float s = crs * 12.; float id = floor(s); float f = fract(s);
    float ln = 1. - smoothstep(.06, .14, abs(f - .5));
    float o = refH(vec2(id, 2.)) * 3.; float seg = floor(along * 1.6 + o); float part = fract(along * 1.6 + o);
    float keep = step(.3, refH(vec2(id, seg))) * step(.1, part) * step(part, .85);
    float shade = smoothstep(.2, -.2, nl); float dens = step(.5, refH(vec2(id, 9.)));
    float hl = ln * keep * mix(.4 * (1. - dens), .85, shade) * (1. - smoothstep(25., 45., camD)) * refF[7];
    c = mix(c, pfCPencil, hl * .8); prot += hl;
    float s13 = refN(vec2(along * 1.3, crs * 26.));
    c *= mix(1., .86 + .28 * s13, refF[12]);
  }
  // 13. ткань трёхтонными пятнами с рваным краем
  if (isC > .5) {
    float tq = lc / la; float nz = (refN(vPfWorld.xy * 7. + vPfWorld.z * 3.) - .5) * .4;
    float q3 = mix(.3, mix(.62, 1., step(.8 + nz, tq)), step(.42 + nz, tq));
    c = mix(c, c * q3 / max(tq, .05), refF[12] * .85);
  }
  // 10. линии стыков: доски (плоское дерево), щит, железо
  {
    float jc = pfHero > .5 ? vPfObjPos.x * 9. : along * 3.2;
    jc = mix(jc, vPfObjPos.y * 11., isM);
    float jf = fract(jc + (refN(vec2(jc, crs * 3.)) - .5) * .08);
    float jl = 1. - smoothstep(.0, .035, min(jf, 1. - jf));
    float lip = smoothstep(.035, .06, jf) * (1. - smoothstep(.06, .11, jf));
    float jk = refF[9] * clamp(isM + isW * flatK * vert * max(pfHero, 1.), 0., 1.) * near;
    c = mix(c, c * .22, jl * jk); c += c * lip * .7 * jk * step(-.1, nl); prot += jl * jk;
  }
  // 14. обмотка блоками
  if (refWrap > .5) {
    float s = vPfObjPos.y * 95. + vPfObjPos.x * 22.; float f = fract(s);
    float gap = 1. - smoothstep(.0, .2, min(f, 1. - f));
    c *= mix(1., mix(.7, 1.25, f) * (1. - gap * .8), refF[13]); prot += refF[13];
  }
  gl_FragColor.rgb = c;
  if (prot > .3) gl_FragColor.a = min(gl_FragColor.a, .5);
}
`;

// пост: 11 — цветной сдвиг по краям силуэтов, 9 — эскиз дальнего плана (двойная дрожащая линия и линии построения)
const POST_DECL = 'uniform vec4 refP;\n';
const POST_BODY = /* glsl */`
  if (refP.x > 0.) {
    vec2 j = (pfH22(floor(vUv * pfRes / 14.) + pfStep * 1.7) - .5) * 2.;
    vec2 u2 = vUv + j * px * 2.2;
    float a0 = linD(u2), ax = linD(u2 + vec2(px.x * 1.5, 0.)), ay = linD(u2 + vec2(0., px.y * 1.5));
    float e2 = max(abs(ax - a0), abs(ay - a0)) / max(min(a0, min(ax, ay)), .5);
    float fk = smoothstep(26., 45., min(a0, min(ax, ay)));
    float ln2 = smoothstep(.05, .12, e2) * fk;
    float ext = 0.;
    for (int k = 1; k <= 4; k++) {
      float fk2 = float(k);
      for (int sgn = -1; sgn <= 1; sgn += 2) {
        vec2 u3 = vUv + vec2(float(sgn) * fk2 * 7. * px.x, (pfH22(vec2(fk2, pfStep)).x - .5) * px.y);
        float b0 = linD(u3), b1 = linD(u3 + vec2(0., px.y * 1.5));
        float eh = abs(b1 - b0) / max(min(b0, b1), .5);
        ext = max(ext, smoothstep(.05, .12, eh) * smoothstep(26., 45., min(b0, b1)) * (1. - fk2 / 5.));
      }
    }
    c = mix(c, c * .45, clamp(ln2 * .75 + ext * .45, 0., 1.) * refP.x);
  }
  if (refP.y > 0.) {
    float d0 = linD(vUv); vec2 o = px * 2.;
    vec2 g = vec2(linD(vUv + vec2(o.x, 0.)) - linD(vUv - vec2(o.x, 0.)), linD(vUv + vec2(0., o.y)) - linD(vUv - vec2(0., o.y)));
    float e = smoothstep(.06, .2, length(g) / max(d0, .5)) * (1. - smoothstep(40., 90., d0));
    vec2 dir = normalize(g + 1e-6) * px * 2.5;
    vec3 k0 = max(texture2D(tK, vUv).rgb, vec3(.002));
    vec3 s = c * vec3(texture2D(tK, vUv + dir).r / k0.r, 1., texture2D(tK, vUv - dir).b / k0.b);
    s += mix(vec3(-.005, .01, .03), vec3(.03, -.004, .02), step(0., dot(g, vec2(1., .3))));
    c = mix(c, clamp(s, 0., 1.5), e * .9 * refP.y);
  }
`;

const HAIR_FRAG = /* glsl */`
uniform float uT, uSeed, uR0; uniform vec3 uC; varying vec2 vUv;
float h11(float x){ return fract(sin(x * 127.1) * 43758.5453); }
void main(){
  vec2 p = vUv * 2. - 1.; float r = length(p); float a = atan(p.y, p.x) / 6.28318 + .5; float N = 44.; float st = floor(uT * 12.);
  float id = floor(a * N); float fa = fract(a * N); float c = .5 + (h11(id * 1.7 + uSeed + st * 3.1) - .5) * .6;
  float len = uR0 + (.96 - uR0) * (.3 + .7 * h11(id * 5.3 + uSeed + st * .7)); float on = step(.35, h11(id * 9.1 + uSeed + floor(st / 2.) * 1.3));
  float d = abs(fa - c) / N * 6.28318 * r; float aa = fwidth(d); float ln = 1. - smoothstep(aa * .5, aa * 1.5, d);
  float m = step(uR0, r) * (1. - smoothstep(len - .05, len, r)); float al = ln * m * on * (1. - r * .55);
  if (al < .03) discard; gl_FragColor = vec4(uC * 1.4 * al * .6, .5);
}`;

export class RefFX {
  constructor({ style, post, renderer, camera }) {
    this.style = style; this.post = post; this.r = renderer; this.cam = camera;
    this.on = new Array(14).fill(true); this.sel = -1; this.mode = 0; this.split = 0.36; this.view = null; this.active = true;
    this.hairs = []; this.scene = null; this.fight = null; this.t = 0;
    // материалы: дописка после основного патча
    const orig = style._patch.bind(style);
    style._patch = (sh, m) => {
      orig(sh, m);
      const P = m.userData.pf ?? (m.userData.pf = {});
      P.refKind ??= { value: -1 }; P.refWrap ??= { value: 0 };
      Object.assign(sh.uniforms, REF_U, { refKind: P.refKind, refWrap: P.refWrap });
      sh.fragmentShader = DECL + sh.fragmentShader.replace('if (gPfProt > .35) gl_FragColor.a = .5;', 'if (gPfProt > .35) gl_FragColor.a = .5;\n' + BODY);
    };
    // пост
    const F = post.mFinal; F.uniforms.refP = { value: new THREE.Vector4() };
    F.fragmentShader = POST_DECL + F.fragmentShader.replace('  gl_FragColor = vec4(toSRGB(clamp(c, 0., 1.)), 1.);', POST_BODY + '  gl_FragColor = vec4(toSRGB(clamp(c, 0., 1.)), 1.);');
    F.needsUpdate = true;
    this._ui();
  }

  _hair(col, size, r0, seed) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uSeed: { value: seed }, uR0: { value: r0 }, uC: { value: new THREE.Color(col) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: HAIR_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.ZeroFactor,
    }));
    m.userData.pfSkip = true; m.renderOrder = 5; m.frustumCulled = false; return m;
  }

  // сцена логова собрана: метки материалов оружия, «волоски»
  _setup(scene, fight) {
    this.scene = scene; this.fight = fight; this.hairs.forEach((h) => h.removeFromParent()); this.hairs = []; this._refresh?.();
    if (!fight) return;
    for (const w of [fight.sword, fight.shield]) w?.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const plain = o.userData.pfPlain; const pl = Array.isArray(plain) ? plain : [plain];
      mats.forEach((m, i) => {
        const P = m.userData.pf; if (!P) return; const src = pl[i] ?? pl[0];
        P.refKind ??= { value: -1 }; P.refWrap ??= { value: 0 };
        if (src?.metalness > 0.5) P.refKind.value = 5;
        else if (src?.map || (src?.color && src.color.getHex() === 0x4a2e18)) P.refKind.value = 2;
        else if (src?.color && src.color.getHex() === 0x4a2e1c) { P.refKind.value = 2; P.refWrap.value = 1; }
      });
    });
    const H = fight.hero.pos;
    const near = SHROOM_SPOTS.map((s) => [Math.hypot(s.x - H.x, s.z - H.z), s]).sort((a, b) => a[0] - b[0]).slice(0, 40);
    near.forEach(([, s], i) => { const h = this._hair(s.col, 1.5 * s.s, 0.16, i * 3.7); h.position.set(s.x, s.y + 0.18 * s.s, s.z); scene.add(h); this.hairs.push(h); });
    this.amulet = this._hair('#ffd27a', 0.7, 0.14, 9.1); scene.add(this.amulet); this.hairs.push(this.amulet);
  }

  _views() {
    const f = this.fight; if (!f) return null;
    const H = f.hero.pos, Lp = f.leshy.pos, sun = REF_U.refSun.value;
    const toL = Lp.clone().sub(H).setY(0).normalize(); const side = new THREE.Vector3(-toL.z, 0, toL.x);
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const s = SHROOM_SPOTS.map((q) => [Math.hypot(q.x - H.x, q.z - H.z), q]).sort((a, b) => a[0] - b[0])[0]?.[1];
    return {
      hero: [H.clone().addScaledVector(toL, 1.5).addScaledVector(side, 0.9).add(V3(0, 1.45, 0)), H.clone().add(V3(0, 1.05, 0))],
      heroShade: [H.clone().add(V3(-sun.x, 0, -sun.z).normalize().multiplyScalar(2.2)).add(V3(0, 1.4, 0)), H.clone().add(V3(0, 1.0, 0))],
      hut: [H.clone().addScaledVector(toL, 2).addScaledVector(side, 2.5).add(V3(0, 2.2, 0)), Lp.clone().add(V3(0, 1.6, 0))],
      far: [H.clone().add(V3(0, 4, 0)).addScaledVector(toL, -2), H.clone().addScaledVector(toL, -40).add(V3(0, 3, 0))],
      shroom: s ? [V3(s.x + 1.6, s.y + 1.1, s.z + 1.6), V3(s.x, s.y + 0.2, s.z)] : null,
      wide: null,
    };
  }

  _flags(f) {
    for (let i = 0; i < 14; i++) REF_U.refF.value[i] = f[i] ? 1 : 0;
    for (const h of this.hairs) h.visible = !!f[11];
    this.post.mFinal.uniforms.refP.value.set(f[8] ? 1 : 0, f[10] ? 1 : 0, 0, 0);
  }

  // вызывать вместо post.render
  render(scene, camera, dt, fight) {
    if (scene !== this.scene) this._setup(scene, fight);
    this.t += dt; const T = Math.floor(this.t * 12) / 12;
    REF_U.refMisc.value.x = this.r.getPixelRatio();
    scene.traverse((o) => { if (o.isDirectionalLight) { const d = o.position.clone().sub(o.target.position); if (d.lengthSq() > 0) REF_U.refSun.value.copy(d.normalize()); } });
    if (this.view && this.fight) { const v = this._views()?.[this.view]; if (v) { const k = this.snap ? 1 : 1 - Math.exp(-dt * 4); this._camP = (this._camP ?? camera.position.clone()).lerp(v[0], k); this._look = (this._look ?? v[1].clone()).lerp(v[1], k); camera.position.copy(this._camP); camera.lookAt(this._look); } }
    for (const h of this.hairs) { h.material.uniforms.uT.value = T; h.quaternion.copy(camera.quaternion); }
    if (this.amulet && this.fight?.hero?.chest) { const c = this.fight.hero.chest; c.updateWorldMatrix(true, false); this.amulet.position.setFromMatrixPosition(c.matrixWorld); const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion())); this.amulet.position.addScaledVector(fw, 0.14).y += 0.05; }
    const OFF = new Array(14).fill(false);
    if (this.mode === 1) { this._flags(OFF); this.post.splitX = 0; this.post.render(scene, camera); return; }
    if (this.mode === 2) { this._flags(this.on); this.post.splitX = 0; this.post.render(scene, camera); return; }
    this._flags(OFF); this.post.splitX = 0; this.post.render(scene, camera);
    this._flags(this.on); this.post.splitX = this.split; this.post.render(scene, camera);
  }

  _ui() {
    const css = document.createElement('style');
    css.textContent = `#rsplit{position:fixed;top:0;bottom:0;width:2px;background:#eadfc6;cursor:ew-resize;z-index:2;touch-action:none}
#rsplit::before{content:'';position:absolute;left:-14px;right:-14px;top:0;bottom:0}
#rsplit i{position:absolute;top:50%;left:-15px;width:30px;height:30px;margin-top:-15px;border-radius:50%;background:rgba(18,12,10,.85);border:1.5px solid #eadfc6;display:grid;place-items:center;font-style:normal;font-size:13px}
.rtag{position:fixed;top:118px;z-index:2;padding:3px 9px;border:1px solid rgba(234,223,198,.4);background:rgba(18,12,10,.8);font:600 12px system-ui;letter-spacing:.08em;pointer-events:none}
#rbox .ri{display:grid;grid-template-columns:20px 1fr auto;gap:2px 6px;align-items:start;padding:6px 4px;border-top:1px solid rgba(234,223,198,.12)}
#rbox .ri.sel{background:rgba(255,138,60,.12)}#rbox .ri input{margin:2px 0 0;accent-color:#ff8a3c}
#rbox .ri .d{grid-column:2/4;color:#a99b80;font-size:11.5px}#rbox .ri button{padding:2px 8px;font-size:11.5px}
#rbox .seg{display:flex;gap:4px;margin:6px 0}#rbox .seg button{flex:1;padding:5px 4px;font-size:12px}`;
    document.head.appendChild(css);
    const sp = document.createElement('div'); sp.id = 'rsplit'; sp.innerHTML = '<i>⇆</i>'; document.body.appendChild(sp);
    const tA = document.createElement('div'); tA.className = 'rtag'; tA.textContent = 'ДО'; document.body.appendChild(tA);
    const tB = document.createElement('div'); tB.className = 'rtag'; tB.textContent = 'ПОСЛЕ'; document.body.appendChild(tB);
    const place = () => {
      const show = this.mode === 0; sp.style.display = show ? '' : 'none'; sp.style.left = `${this.split * 100}%`;
      tA.style.display = this.mode === 2 ? 'none' : ''; tB.style.display = this.mode === 1 ? 'none' : '';
      tA.style.left = '18px'; tB.style.right = (document.querySelector('#panel')?.classList.contains('hide') ? 18 : 358) + 'px';
    };
    let drag = false;
    sp.addEventListener('pointerdown', (e) => { drag = true; sp.setPointerCapture(e.pointerId); e.stopPropagation(); });
    sp.addEventListener('pointermove', (e) => { if (drag) { this.split = Math.min(0.97, Math.max(0.03, e.clientX / innerWidth)); place(); } });
    sp.addEventListener('pointerup', () => { drag = false; });
    const box = document.createElement('div'); box.id = 'rbox';
    box.innerHTML = `<h2>Приёмы референсов: до / после</h2><p class="muted">Слева логово как сейчас, справа с приёмами. Тяните светлую линию. «Пример» ставит камеру и оставляет справа только этот приём.</p>
<div class="seg" id="rmode"><button data-m="0" class="on">Сравнение</button><button data-m="1">Только до</button><button data-m="2">Только после</button></div>
<div class="seg"><button id="rall">Все приёмы</button><button id="rnone">Снять все</button><button id="rfree">Камера боя</button></div><div id="rlist"></div>`;
    const panel = document.querySelector('#panel'); panel.insertBefore(box, panel.firstChild);
    const list = box.querySelector('#rlist');
    const refresh = () => {
      [...list.children].forEach((d, i) => { d.querySelector('input').checked = this.on[i]; d.classList.toggle('sel', i === this.sel); });
      const cap = document.querySelector('#caption');
      if (cap) cap.innerHTML = this.sel >= 0 ? `<b>${this.sel + 1}. ${REF_ITEMS[this.sel][0]}.</b> ${REF_ITEMS[this.sel][1]}` : `<b>Приёмы референсов.</b> Справа включено ${this.on.filter(Boolean).length} из 14. Слева логово без них.`;
    };
    REF_ITEMS.forEach((it, i) => {
      const d = document.createElement('div'); d.className = 'ri';
      d.innerHTML = `<input type="checkbox" checked aria-label="${it[0]}"><div>${i + 1}. ${it[0]}</div><button>Пример</button><div class="d">${it[1]}</div>`;
      d.querySelector('input').onchange = (e) => { this.on[i] = e.target.checked; this.sel = -1; refresh(); };
      d.querySelector('button').onclick = () => { this.on.fill(false); this.on[i] = true; this.sel = i; this.view = it[2] === 'wide' ? null : it[2]; refresh(); };
      list.appendChild(d);
    });
    box.querySelector('#rall').onclick = () => { this.on.fill(true); this.sel = -1; refresh(); };
    box.querySelector('#rnone').onclick = () => { this.on.fill(false); this.sel = -1; refresh(); };
    box.querySelector('#rfree').onclick = () => { this.view = null; this._camP = this._look = null; if (this.fight) this.fight.camPos = null; };
    box.querySelectorAll('#rmode button').forEach((b) => b.onclick = () => { this.mode = +b.dataset.m; box.querySelectorAll('#rmode button').forEach((x) => x.classList.toggle('on', x === b)); place(); });
    document.querySelector('#toggle')?.addEventListener('click', () => setTimeout(place, 300));
    this._refresh = refresh; this._place = place; place(); setTimeout(refresh, 0);
  }
}
