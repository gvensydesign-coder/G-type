// Пост-обработка как в видео: «краска» (фильтр Кувахары), свечение, лучи от солнца,
// мягкая глубина резкости, цветокоррекция (бирюзовые тени, кремовые света, низкий контраст),
// виньетка снизу и по углам, плёночное зерно.
import * as THREE from 'three';
import { makePaper } from './textures.js';

const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    const ht = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace };
    this.rtScene = new THREE.WebGLRenderTarget(4, 4, { ...ht, samples: 4 });
    this.rtScene.depthTexture = new THREE.DepthTexture(4, 4);
    this.rtA = new THREE.WebGLRenderTarget(4, 4, ht);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, ht);
    this.rtW = new THREE.WebGLRenderTarget(4, 4, ht); this.rtW2 = new THREE.WebGLRenderTarget(4, 4, ht); this.rtE = new THREE.WebGLRenderTarget(4, 4, ht);
    this.rtK = new THREE.WebGLRenderTarget(4, 4, ht); this.rtP = new THREE.WebGLRenderTarget(4, 4, ht);
    this.qPaint = true; this.qRays = true; // ограничения от уровня качества
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene = new THREE.Scene(); this.scene.add(this.quad);

    this.bright = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTh: { value: 1.0 } },
      vertexShader: FS_VERT,
      fragmentShader: `uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722));
          gl_FragColor = vec4(c * smoothstep(uTh, uTh + 0.35, l), 1.0); }`,
    });
    this.blur = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: FS_VERT,
      fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
        void main(){ vec3 s = texture2D(tSrc, vUv).rgb * 0.227;
          s += (texture2D(tSrc, vUv + uDir*1.385).rgb + texture2D(tSrc, vUv - uDir*1.385).rgb) * 0.316;
          s += (texture2D(tSrc, vUv + uDir*3.231).rgb + texture2D(tSrc, vUv - uDir*3.231).rgb) * 0.070;
          gl_FragColor = vec4(s, 1.0); }`,
    });

    // «Краска»: 1) Кувахара заливает мелочь плоскими пятнами; 2) рука художника: мазок смазывает цвет вдоль формы,
    // на границах цвета заходят друг в друга «пальцами» штрихов, края силуэтов рвутся и смазываются, ворс кисти.
    this.kuwa = new THREE.ShaderMaterial({
      uniforms: { tScene: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uR: { value: 3 } },
      vertexShader: FS_VERT,
      fragmentShader: `uniform sampler2D tScene; uniform vec2 uRes; uniform float uR; varying vec2 vUv;
        // Кувахара 4 сектора: заливает мелкие детали плоскими мазками, держит края
        vec3 kuwahara(vec2 uv, float r){
          vec2 px = 1.0 / uRes;
          vec3 m[4]; vec3 s[4];
          for (int k=0;k<4;k++){ m[k]=vec3(0.0); s[k]=vec3(0.0); }
          for (int j=0;j<=3;j++) for (int i=0;i<=3;i++){
            vec2 o = vec2(float(i), float(j)) * r / 3.0;
            vec3 a = texture2D(tScene, uv + vec2(-o.x,-o.y)*px).rgb; m[0]+=a; s[0]+=a*a;
            vec3 b = texture2D(tScene, uv + vec2( o.x,-o.y)*px).rgb; m[1]+=b; s[1]+=b*b;
            vec3 c = texture2D(tScene, uv + vec2(-o.x, o.y)*px).rgb; m[2]+=c; s[2]+=c*c;
            vec3 d = texture2D(tScene, uv + vec2( o.x, o.y)*px).rgb; m[3]+=d; s[3]+=d*d;
          }
          float best = 1e9; vec3 res = vec3(0.0);
          for (int k=0;k<4;k++){ vec3 mu = m[k]/16.0; vec3 v = abs(s[k]/16.0 - mu*mu); float sv = v.r+v.g+v.b; if (sv < best){ best = sv; res = mu; } }
          return res;
        }

        void main(){ gl_FragColor = vec4(kuwahara(vUv, uR), 1.0); }`,
    });
    this.brush = new THREE.ShaderMaterial({
      uniforms: { tK: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPr: { value: 1 }, uAmt: { value: 1 },
        uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uFocal: { value: 500 }, uNear: { value: 0.3 }, uFar: { value: 2000 }, uAnchor: { value: 1 } },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`#include <packing>
        uniform sampler2D tK; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uPr; uniform float uAmt; varying vec2 vUv;
        uniform mat4 uProjInv; uniform mat4 uViewInv; uniform float uFocal; uniform float uNear; uniform float uFar; uniform float uAnchor;
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(h12(i), h12(i+vec2(1.0,0.0)), f.x), mix(h12(i+vec2(0.0,1.0)), h12(i+1.0), f.x), f.y); }
        float lum(vec3 c){ return dot(sqrt(max(c, 0.0)), vec3(0.3, 0.55, 0.15)); }
        void main(){
          vec2 px = 1.0 / uRes, uv = vUv;
          vec3 c0 = texture2D(tK, uv).rgb;
          float s = 3.0 * uPr;
          vec2 gr = vec2(lum(texture2D(tK, uv + vec2(s, 0.0) * px).rgb) - lum(texture2D(tK, uv - vec2(s, 0.0) * px).rgb),
                         lum(texture2D(tK, uv + vec2(0.0, s) * px).rgb) - lum(texture2D(tK, uv - vec2(0.0, s) * px).rgb));
          float e = length(gr);
          vec2 fc = gl_FragCoord.xy / uPr;
          // Мазки привязаны к предметам: координаты штриха берём с поверхности в мире (по глубине), размер штриха
          // держим примерно постоянным на экране, смешивая две октавы по расстоянию. Направление по поверхности:
          // по земле лёжа, по стволам, ногам стража и лианам стоя. Небо — по экрану, по диагонали.
          float dd = texture2D(tDepth, uv).x;
          bool sky = dd > 0.99999 || uAnchor < 0.5;
          vec2 sc0 = fc, sc1 = fc + 17.0; float oct = 0.0; float vert = 0.5;
          if (!sky) {
            vec4 vp = uProjInv * vec4(uv * 2.0 - 1.0, dd * 2.0 - 1.0, 1.0); vp /= vp.w;
            vec3 w = (uViewInv * vp).xyz; float z = -vp.z;
            vec3 nW = normalize(cross(dFdx(w), dFdy(w)));
            vert = 1.0 - smoothstep(0.55, 0.85, abs(nW.y));
            vec3 tH = normalize(cross(vec3(0.0, 1.0, 0.0), nW + vec3(1e-4)));
            vec3 camR = normalize((uViewInv * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
            vec2 gnd = vec2(dot(w.xz, normalize(camR.xz + 1e-4)), dot(w.xz, normalize(vec2(-camR.z, camR.x) + 1e-4)));
            vec2 wal = vec2(dot(w, tH), w.y);
            vec2 wm = vert > 0.5 ? wal : gnd;                                  // метры на поверхности
            float lz = log2(max(z, 0.5)); float z0 = exp2(floor(lz)); oct = fract(lz);
            sc0 = wm * uFocal / z0; sc1 = wm * uFocal / (z0 * 2.0) + 17.0;     // «пиксели» при ближней и дальней октаве
          }
          // своя рука: в каждой «клетке» мазка свой наклон; на земле лёжа, на стоячих поверхностях стоя
          vec2 cell = floor(sc0 / vec2(26.0, 15.0) + vec2(0.5 * floor(sc0.y / 15.0), 0.0));
          float baseA = sky ? 0.85 : mix(0.12, 1.5, vert);
          float ang = baseA + (h12(cell) - 0.5) * (sky ? 1.1 : 0.6);
          vec2 hand = vec2(cos(ang), sin(ang));
          vec2 tng = e > 1e-4 ? vec2(-gr.y, gr.x) / e : hand;
          tng *= sign(dot(tng, hand) + 1e-4);
          float ew = smoothstep(0.02, 0.12, e);
          vec2 dir = normalize(mix(hand, tng, ew)), nrm = vec2(-dir.y, dir.x);
          // координаты штриха в двух октавах (на стоячих поверхностях вдоль = вверх)
          vec2 d2 = sky ? dir : normalize(mix(vec2(1.0, 0.0), vec2(0.0, 1.0), vert) + (dir - hand) * 0.5);
          vec2 n2 = vec2(-d2.y, d2.x);
          float al0 = dot(sc0, d2), ac0 = dot(sc0, n2), al1 = dot(sc1, d2), ac1 = dot(sc1, n2);
          float along = al0, across = ac0;
          // 1) смаз вдоль мазка, длина своя у каждого штриха
          float Ls = mix(3.0, 9.0, mix(vn(vec2(ac0 * 0.15, al0 * 0.02)), vn(vec2(ac1 * 0.15, al1 * 0.02)), oct)) * uPr;
          vec3 acc = vec3(0.0); float ws = 0.0;
          for (int i = -3; i <= 3; i++) { float f = float(i) / 3.0; float w = 1.0 - abs(f) * 0.6; acc += texture2D(tK, uv + dir * f * Ls * px).rgb * w; ws += w; }
          vec3 sm = acc / ws;
          // 2) слияние цветов на границе: длинные тонкие штрихи заходят на соседний цвет и обратно
          float fing0 = vn(vec2(al0 / 24.0, ac0 / 2.4)) * 0.75 + vn(vec2(al0 / 9.0, ac0 / 1.3)) * 0.25;
          float fing1 = vn(vec2(al1 / 24.0, ac1 / 2.4)) * 0.75 + vn(vec2(al1 / 9.0, ac1 / 1.3)) * 0.25;
          float push = (mix(fing0, fing1, oct) - 0.5) * 2.0;
          vec2 gn = e > 1e-4 ? gr / e : nrm;
          vec3 bl = texture2D(tK, uv + gn * push * 4.5 * uPr * px).rgb;
          float bleedK = ew * smoothstep(0.2, 0.55, abs(push));
          vec3 c = mix(c0, sm, 0.3 + 0.45 * ew);
          c = mix(c, bl, bleedK * 0.65);
          // тонкие тёмные линии (контуры, спицы, швы) кисть не размывает: перо поверх краски
          float keep = smoothstep(0.06, 0.18, lum(sm) - lum(c0));
          c = mix(c, c0, keep * 0.75);
          // 3) сухая кисть: ворс вдоль мазка чуть светлее и темнее
          float bristle = mix(vn(vec2(al0 / 38.0, ac0 / 1.1)), vn(vec2(al1 / 38.0, ac1 / 1.1)), oct);
          c *= 1.0 + (bristle - 0.5) * 0.07;
          gl_FragColor = vec4(mix(c0, c, uAmt), 1.0);
        }`,
    });
    this.copy = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: FS_VERT,
      fragmentShader: `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }` });
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tDepth: { value: null }, tPaint: { value: null }, tWide: { value: null }, tEnv: { value: null }, uHalo: { value: 1 }, uAO: { value: 1 },
        uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
        uSun: { value: new THREE.Vector2(0.5, 0.6) }, uSunVis: { value: 1 },
        uNear: { value: 0.1 }, uFar: { value: 2000 },
        uPaint: { value: 1 }, uBloom: { value: 1 }, uRays: { value: 1 }, uGrade: { value: 1 },
        uVig: { value: 1 }, uGrain: { value: 1 }, uDof: { value: 0 }, uFocus: { value: 10 },
        uSat: { value: 1.1 }, uCon: { value: 1.3 }, uPivot: { value: 0.45 }, uCurve: { value: 0.6 }, uCool: { value: 0.08 }, uExpo: { value: 0.76 },
        uLo: { value: new THREE.Vector3(0.03, 0.075, 0.08) }, uHi: { value: new THREE.Vector3(0.975, 0.985, 0.95) },
        uSatTod: { value: 1 }, uRaysTod: { value: 1 }, uExpoK: { value: 1 }, uConK: { value: 1 },
        tPaper: { value: makePaper() }, uPaper: { value: 1 }, uLines: { value: 1 }, uLineTh: { value: 0.012 }, uPr: { value: 1 },
        uDots: { value: 1 }, uDotK: { value: 1 }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() },
      },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth; uniform sampler2D tPaint; uniform sampler2D tWide; uniform sampler2D tEnv; uniform float uHalo; uniform float uAO;
        uniform vec2 uRes; uniform float uTime; uniform vec2 uSun; uniform float uSunVis;
        uniform float uNear; uniform float uFar;
        uniform float uPaint; uniform float uBloom; uniform float uRays; uniform float uGrade;
        uniform float uVig; uniform float uGrain; uniform float uDof; uniform float uFocus;
        uniform float uSat; uniform float uCon; uniform float uPivot; uniform float uCurve; uniform float uCool; uniform float uExpo;
        uniform vec3 uLo; uniform vec3 uHi; uniform float uSatTod; uniform float uRaysTod; uniform float uExpoK; uniform float uConK;
        uniform sampler2D tPaper; uniform float uPaper; uniform float uLines; uniform float uLineTh; uniform float uPr;
        uniform float uDots; uniform float uDotK; uniform mat4 uProjInv; uniform mat4 uViewInv;
        varying vec2 vUv;
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        float linDepth(vec2 uv){ float d = texture2D(tDepth, uv).x; return perspectiveDepthToViewZ(d, uNear, uFar) * -1.0; }
        vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }

        // Внутренние линии по сгибам формы: вторая производная 1/z (на плоскости она ноль, на сгибе и ступеньке — нет).
        // Перо дрожит: точка выборки чуть смещается шумом, толщина гуляет.
        float inkLines(vec2 uv){
          float z0 = linDepth(uv);
          if (z0 > 45.0) return 0.0;
          vec2 px = uPr / uRes * mix(2.2, 1.0, smoothstep(4.0, 18.0, z0));   // вблизи перо шире
          vec2 j = (vec2(h12(floor(uv * uRes / 6.0)), h12(floor(uv * uRes / 6.0) + 7.0)) - 0.5) * px * 0.8;
          uv += j;
          float w0 = 1.0 / z0;
          float zl = linDepth(uv - vec2(px.x, 0.0)), zr = linDepth(uv + vec2(px.x, 0.0));
          float zd = linDepth(uv - vec2(0.0, px.y)), zu = linDepth(uv + vec2(0.0, px.y));
          float ex = abs(1.0/zl + 1.0/zr - 2.0*w0) / w0, ey = abs(1.0/zd + 1.0/zu - 2.0*w0) / w0;
          // слишком «шумные» места (трава, листва) пропускаем: там скачки глубины во все стороны
          float jump = max(max(abs(zl - z0), abs(zr - z0)), max(abs(zd - z0), abs(zu - z0))) / z0;
          float e = max(ex, ey);
          return smoothstep(uLineTh, uLineTh * 2.2, e) * (1.0 - smoothstep(0.04, 0.12, jump)) * smoothstep(45.0, 18.0, z0);
        }


        // Наш эффект точек из стиля игры (style-lab/toon.js): растр под 45°, закреплён на экране, точки только на переходе
        // света в тень (ровный свет и ровная тень остаются чистым цветом), пятнами по миру; цвет точки — не чёрный,
        // а сдвиг к бирюзовой тени палитры. На дальней дымке редкие пятна мельче и бледнее, как на референсе 5.
        float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          float a = h12(i.xy + i.z*17.0), b = h12(i.xy + vec2(1.0,0.0) + i.z*17.0), c = h12(i.xy + vec2(0.0,1.0) + i.z*17.0), d = h12(i.xy + 1.0 + i.z*17.0);
          float e = h12(i.xy + (i.z+1.0)*17.0), f2 = h12(i.xy + vec2(1.0,0.0) + (i.z+1.0)*17.0), g = h12(i.xy + vec2(0.0,1.0) + (i.z+1.0)*17.0), h = h12(i.xy + 1.0 + (i.z+1.0)*17.0);
          return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f2,f.x), mix(g,h,f.x), f.y), f.z); }
        vec3 worldAt(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uProjInv * vec4(uv*2.0-1.0, d*2.0-1.0, 1.0); v /= v.w; return (uViewInv * v).xyz; }
        vec3 halftoneDots(vec3 g, vec2 uv){
          float d = texture2D(tDepth, uv).x; if (d > 0.99999) return g;          // небо без точек
          float z = linDepth(uv); vec3 w = worldAt(uv);
          float far = smoothstep(40.0, 70.0, z);
          float cell = mix(4.5, 3.5, far) * uPr;
          vec2 sp = mat2(0.707, -0.707, 0.707, 0.707) * gl_FragCoord.xy;
          float dotR = length(fract(sp / cell) - 0.5);
          // пятна, привязанные к миру; рваный край пятна мельчит точки (полутоновый спад)
          float n = vn3(w * 0.32 + 3.0) * 0.65 + vn3(w * 1.1) * 0.35;
          float patchK = smoothstep(0.47, 0.6, n);
          // переход света в тень по тону кадра: мёртвые зоны снизу и сверху
          float l = dot(g, vec3(0.3, 0.55, 0.15));
          float cov = clamp(1.0 - (l - 0.2) / 0.42, 0.0, 1.0);
          float band = smoothstep(0.1, 0.22, cov) * (1.0 - smoothstep(0.8, 0.92, cov));
          float r = sqrt(cov) * 0.5 * mix(0.55, 1.0, patchK);
          float dt = 1.0 - smoothstep(r - 0.06, r + 0.06, dotR);
          // главное — граница света и тени: перепад тона рядом (радиус ~7 px); на ровном тоне только слабый след пятна
          vec2 o = 7.0 * uPr / uRes; float l0 = 1e3, l1 = -1e3;
          for (int i = 0; i < 6; i++) { float a = float(i) * 1.047 + 0.3; vec3 s6 = texture2D(tScene, uv + vec2(cos(a), sin(a)) * o).rgb;
            float ls = dot(sqrt(max(s6, 0.0)), vec3(0.3, 0.55, 0.15)); l0 = min(l0, ls); l1 = max(l1, ls); }
          float trans = smoothstep(0.08, 0.2, l1 - l0);
          float k = dt * band * patchK * mix(0.1, 1.0, max(trans, far * 0.8)) * smoothstep(120.0, 70.0, z) * uDotK;
          vec3 dc = uLo + (g - uLo) * mix(0.66, 0.8, far);                      // к тени палитры, а не в чёрное
          return mix(g, dc, k * mix(0.68, 0.45, far));
        }


        // Тень в стыках и под мхом: по глубине ищем соседей ближе к камере (в пределах ~0,6 м). Результат ступенями
        // и цветом тени палитры, как прописанная кистью, а не серая грязь.
        float contactAO(vec2 uv){
          float z0 = linDepth(uv); if (z0 > 60.0) return 0.0;
          float rad = clamp(0.55 / z0, 0.004, 0.06);
          float occ = 0.0;
          for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.785 + h12(uv * uRes) * 0.6; float rr = rad * (0.45 + 0.55 * fract(float(i) * 0.618));
            vec2 o = vec2(cos(a), sin(a) * uRes.x / uRes.y) * rr;
            float zs = linDepth(uv + o);
            float dz = z0 - zs;
            occ += smoothstep(0.03, 0.15, dz) * (1.0 - smoothstep(0.6, 1.4, dz));
          }
          return occ / 8.0;
        }
        void main(){
          vec2 uv = vUv;
          vec3 c = texture2D(tScene, uv).rgb;
          // мягкая глубина резкости (только на крупных планах)
          if (uDof > 0.0) {
            float z = linDepth(uv);
            float coc = clamp(abs(z - uFocus) / max(uFocus, 0.1) - 0.15, 0.0, 1.0) * uDof * 7.0;
            if (coc > 0.3) {
              vec3 acc = c; float w = 1.0;
              for (int i=0;i<12;i++){ float a = float(i)*2.39996; float r = sqrt(float(i)+0.5)/3.5*coc;
                vec2 o = vec2(cos(a), sin(a)) * r / uRes; acc += texture2D(tScene, uv+o).rgb; w += 1.0; }
              c = acc / w;
            }
          }
          if (uPaint > 0.0) c = mix(c, texture2D(tPaint, uv).rgb, 0.85);
          if (uLines > 0.0) {
            float zl0 = linDepth(uv);
            vec3 lc = mix(c * vec3(0.30, 0.26, 0.32), c * vec3(0.6, 0.72, 0.7), smoothstep(10.0, 38.0, zl0));  // вдали линия цветная и светлая
            c = mix(c, lc, inkLines(uv) * 0.75 * uLines);
          }
          if (uAO > 0.0) {
            float ao = contactAO(uv);
            float aq = step(0.22, ao) * 0.5 + step(0.45, ao) * 0.5;               // две ступени
            c = mix(c, c * vec3(0.52, 0.6, 0.62), aq * 0.55 * uAO);
          }

          // свечение
          vec3 bl = texture2D(tBloom, uv).rgb;
          c += bl * 0.35 * uBloom;
          // Свет слоями: вокруг яркого — широкий ореол ступенями. Ближняя ступень белее, средняя в цвет источника,
          // дальняя перенимает цвет окружения (зелень мха, тёплую землю, бирюзу неба), как отсвет в воздухе.
          if (uHalo > 0.0 && uBloom > 0.0) {
            vec3 wd = texture2D(tWide, uv).rgb; float wl = dot(wd, vec3(0.3, 0.55, 0.15));
            vec3 env = texture2D(tEnv, uv).rgb; float el = dot(env, vec3(0.3, 0.55, 0.15));
            vec3 envT = env / max(el, 0.02); envT = clamp(envT, 0.0, 2.0);
            vec3 srcT = wd / max(wl, 1e-4);
            float n = (h12(floor(uv * uRes / (5.0 * uPr))) - 0.5) * 0.25 + (sin(uv.x * 40.0 + uv.y * 23.0) * 0.5) * 0.1;
            float lv = wl * (1.0 + n);
            float b1 = smoothstep(0.02, 0.028, lv), b2 = smoothstep(0.06, 0.07, lv), b3 = smoothstep(0.15, 0.17, lv);
            vec3 outerC = mix(srcT, envT, 0.7), midC = srcT, innerC = mix(srcT, vec3(1.0, 0.97, 0.9), 0.55);
            c += (outerC * b1 * 0.08 + midC * b2 * 0.09 + innerC * b3 * 0.12) * uHalo * uBloom;
            c += wd * mix(vec3(1.0), envT, 0.5) * 0.25 * uHalo * uBloom;   // мягкая подложка под ступенями
          }
          // лучи: радиальное размытие яркого к солнцу
          if (uRays > 0.0 && uSunVis > 0.0) {
            vec2 d = (uv - uSun) / 28.0; vec2 p = uv; float decay = 1.0; vec3 acc = vec3(0.0);
            for (int i=0;i<28;i++){ p -= d; acc += texture2D(tBloom, p).rgb * decay; decay *= 0.965; }
            c += acc / 28.0 * 0.9 * uRays * uRaysTod * uSunVis * vec3(1.0, 0.95, 0.82);
          }

          vec3 g = toSRGB(c * mix(1.0, uExpo * uExpoK, uGrade));
          if (uGrade > 0.0) {
            vec3 g0 = g;
            float l = dot(g, vec3(0.299,0.587,0.114));
            g = mix(vec3(l), g, uSat * uSatTod);                      // насыщенность (видео ~60–70 из 255)
            g = clamp((g - uPivot) * uCon * uConK + uPivot, 0.0, 1.0);
            g = mix(g, g*g*(3.0-2.0*g), uCurve);              // S-кривая: глубокие тени, светлая дымка
            // тёплые яркие огни не тонут в общей зелени: оранжевое и жёлтое уходит в мягкий крем-оранж, а не в зелёный
            float warm = smoothstep(0.08, 0.3, g0.r - g0.b) * smoothstep(0.35, 0.8, max(g0.r, g0.g)) * smoothstep(0.0, 0.12, g0.r - g0.g * 0.85);
            vec3 gW = mix(uLo, vec3(1.0, 0.86, 0.66), g);
            g = mix(mix(uLo, uHi, g), gW, warm * 0.85);  // тени — тёмная бирюза, света — крем (утром и ночью свои)
            g += vec3(-0.012, 0.010, 0.0) * (1.0 - abs(l - 0.5) * 2.0); // средние тона чуть зеленее
            g.b += uCool * (1.0 - g.b);                        // убрать жёлтый налёт: в видео синий канал почти как красный
            g = mix(g0, g, uGrade);
          }
          if (uDots > 0.0) g = mix(g, halftoneDots(g, uv), uDots);
          if (uVig > 0.0) {
            vec2 q = (uv - 0.5) * vec2(1.0, 1.15);
            float v = smoothstep(0.42, 0.95, length(q));
            float bottom = smoothstep(0.26, 0.0, uv.y);
            g = mix(g, vec3(0.012, 0.035, 0.04), clamp(v*0.6 + bottom*0.85, 0.0, 0.93) * uVig);  // снизу кадр уходит почти в черноту, как в видео
          }
          if (uGrain > 0.0) g += (h12(uv*uRes + fract(uTime*7.13)*100.0) - 0.5) * 0.045 * uGrain;
          // зерно бумаги: неподвижное, сильнее на светлом (как акварель на бумаге)
          if (uPaper > 0.0) { float pp = texture2D(tPaper, uv * uRes / (256.0 * uPr)).r - 0.5; g *= 1.0 + pp * 0.11 * uPaper * (0.4 + 0.6 * dot(g, vec3(0.333))); }
          gl_FragColor = vec4(g, 1.0);
        }`,
    });
  }
  setSize(w, h, pr) {
    const W = Math.floor(w * pr), H = Math.floor(h * pr);
    this.rtScene.setSize(W, H);
    this.rtK.setSize(W, H); this.rtP.setSize(W, H);
    this.kuwa.uniforms.uRes.value.set(W, H); this.brush.uniforms.uRes.value.set(W, H); this.brush.uniforms.uPr.value = pr;
    this.rtW.setSize(W >> 4, H >> 4); this.rtW2.setSize(W >> 4, H >> 4); this.rtE.setSize(W >> 4, H >> 4);
    this.rtA.setSize(W >> 2, H >> 2); this.rtB.setSize(W >> 2, H >> 2);
    this.comp.uniforms.uRes.value.set(W, H); this.comp.uniforms.uPr.value = pr;
  }
  render(scene, camera, sunWorld, t) {
    const r = this.r;
    r.setRenderTarget(this.rtScene); r.render(scene, camera);
    // яркое → размытие
    this.quad.material = this.bright; this.bright.uniforms.tSrc.value = this.rtScene.texture;
    r.setRenderTarget(this.rtA); r.render(this.scene, this.cam);
    for (let i = 0; i < 2; i++) {
      this.quad.material = this.blur;
      this.blur.uniforms.tSrc.value = this.rtA.texture; this.blur.uniforms.uDir.value.set((1.5 + i) / this.rtA.width, 0);
      r.setRenderTarget(this.rtB); r.render(this.scene, this.cam);
      this.blur.uniforms.tSrc.value = this.rtB.texture; this.blur.uniforms.uDir.value.set(0, (1.5 + i) / this.rtA.height);
      r.setRenderTarget(this.rtA); r.render(this.scene, this.cam);
    }
    // широкий ореол (1/16) и цвет окружения (размытая сцена 1/16)
    this.quad.material = this.copy; this.copy.uniforms.tSrc.value = this.rtA.texture;
    r.setRenderTarget(this.rtW); r.render(this.scene, this.cam);
    this.copy.uniforms.tSrc.value = this.rtScene.texture;
    r.setRenderTarget(this.rtE); r.render(this.scene, this.cam);
    this.quad.material = this.blur;
    const bl2 = (A, B, k) => {
      this.blur.uniforms.tSrc.value = A.texture; this.blur.uniforms.uDir.value.set(k / A.width, 0); r.setRenderTarget(B); r.render(this.scene, this.cam);
      this.blur.uniforms.tSrc.value = B.texture; this.blur.uniforms.uDir.value.set(0, k / A.height); r.setRenderTarget(A); r.render(this.scene, this.cam);
    };
    bl2(this.rtW, this.rtW2, 1.5); bl2(this.rtW, this.rtW2, 2.5);
    bl2(this.rtE, this.rtW2, 1.5); bl2(this.rtE, this.rtW2, 2.5);
    const u = this.comp.uniforms;
    u.tWide.value = this.rtW.texture; u.tEnv.value = this.rtE.texture;
    const sp = sunWorld.clone().project(camera);
    u.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    const inFront = sp.z < 1 && sp.z > -1;
    const edge = Math.max(Math.abs(sp.x), Math.abs(sp.y));
    u.uSunVis.value = inFront ? THREE.MathUtils.clamp(1.6 - edge, 0, 1) : 0;
    u.tScene.value = this.rtScene.texture; u.tBloom.value = this.rtA.texture; u.tDepth.value = this.rtScene.depthTexture;
    u.uProjInv.value.copy(camera.projectionMatrixInverse); u.uViewInv.value.copy(camera.matrixWorld);
    u.uNear.value = camera.near; u.uFar.value = camera.far; u.uTime.value = t;
    if (this.qPaint && u.uPaint.value > 0) {
      this.quad.material = this.kuwa; this.kuwa.uniforms.tScene.value = this.rtScene.texture;
      r.setRenderTarget(this.rtK); r.render(this.scene, this.cam);
      this.quad.material = this.brush; this.brush.uniforms.tK.value = this.rtK.texture;
      const bu = this.brush.uniforms; bu.tDepth.value = this.rtScene.depthTexture;
      bu.uProjInv.value.copy(camera.projectionMatrixInverse); bu.uViewInv.value.copy(camera.matrixWorld);
      bu.uFocal.value = camera.projectionMatrix.elements[5] * this.rtK.height / 2 / (this.brush.uniforms.uPr.value || 1);
      r.setRenderTarget(this.rtP); r.render(this.scene, this.cam);
      u.tPaint.value = this.rtP.texture;
    }
    const keepP = u.uPaint.value, keepR = u.uRays.value;
    if (!this.qPaint) u.uPaint.value = 0; if (!this.qRays) u.uRays.value = 0;
    this.quad.material = this.comp;
    r.setRenderTarget(null); r.render(this.scene, this.cam);
    u.uPaint.value = keepP; u.uRays.value = keepR;
  }
}
