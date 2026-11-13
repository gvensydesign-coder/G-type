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
    this.comp = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tDepth: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
        uSun: { value: new THREE.Vector2(0.5, 0.6) }, uSunVis: { value: 1 },
        uNear: { value: 0.1 }, uFar: { value: 2000 },
        uPaint: { value: 1 }, uBloom: { value: 1 }, uRays: { value: 1 }, uGrade: { value: 1 },
        uVig: { value: 1 }, uGrain: { value: 1 }, uDof: { value: 0 }, uFocus: { value: 10 },
        uSat: { value: 1.1 }, uCon: { value: 1.3 }, uPivot: { value: 0.45 }, uCurve: { value: 0.6 }, uCool: { value: 0.08 }, uExpo: { value: 0.76 },
        uLo: { value: new THREE.Vector3(0.03, 0.075, 0.08) }, uHi: { value: new THREE.Vector3(0.975, 0.985, 0.95) },
        uSatTod: { value: 1 }, uRaysTod: { value: 1 },
        tPaper: { value: makePaper() }, uPaper: { value: 1 }, uLines: { value: 1 }, uLineTh: { value: 0.012 }, uPr: { value: 1 },
      },
      vertexShader: FS_VERT,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth;
        uniform vec2 uRes; uniform float uTime; uniform vec2 uSun; uniform float uSunVis;
        uniform float uNear; uniform float uFar;
        uniform float uPaint; uniform float uBloom; uniform float uRays; uniform float uGrade;
        uniform float uVig; uniform float uGrain; uniform float uDof; uniform float uFocus;
        uniform float uSat; uniform float uCon; uniform float uPivot; uniform float uCurve; uniform float uCool; uniform float uExpo;
        uniform vec3 uLo; uniform vec3 uHi; uniform float uSatTod; uniform float uRaysTod;
        uniform sampler2D tPaper; uniform float uPaper; uniform float uLines; uniform float uLineTh; uniform float uPr;
        varying vec2 vUv;
        float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
        float linDepth(vec2 uv){ float d = texture2D(tDepth, uv).x; return perspectiveDepthToViewZ(d, uNear, uFar) * -1.0; }
        vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }

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

        // Внутренние линии по сгибам формы: вторая производная 1/z (на плоскости она ноль, на сгибе и ступеньке — нет).
        // Перо дрожит: точка выборки чуть смещается шумом, толщина гуляет.
        float inkLines(vec2 uv){
          float z0 = linDepth(uv);
          if (z0 > 45.0) return 0.0;
          vec2 px = uPr / uRes;
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
          if (uPaint > 0.0) c = mix(c, kuwahara(uv, 2.0 + uPaint), 0.85);
          if (uLines > 0.0) c = mix(c, c * vec3(0.30, 0.26, 0.32), inkLines(uv) * 0.75 * uLines);

          // свечение
          vec3 bl = texture2D(tBloom, uv).rgb;
          c += bl * 0.35 * uBloom;
          // лучи: радиальное размытие яркого к солнцу
          if (uRays > 0.0 && uSunVis > 0.0) {
            vec2 d = (uv - uSun) / 28.0; vec2 p = uv; float decay = 1.0; vec3 acc = vec3(0.0);
            for (int i=0;i<28;i++){ p -= d; acc += texture2D(tBloom, p).rgb * decay; decay *= 0.965; }
            c += acc / 28.0 * 0.9 * uRays * uRaysTod * uSunVis * vec3(1.0, 0.95, 0.82);
          }

          vec3 g = toSRGB(c * mix(1.0, uExpo, uGrade));
          if (uGrade > 0.0) {
            vec3 g0 = g;
            float l = dot(g, vec3(0.299,0.587,0.114));
            g = mix(vec3(l), g, uSat * uSatTod);                      // насыщенность (видео ~60–70 из 255)
            g = clamp((g - uPivot) * uCon + uPivot, 0.0, 1.0);
            g = mix(g, g*g*(3.0-2.0*g), uCurve);              // S-кривая: глубокие тени, светлая дымка
            g = mix(uLo, uHi, g);  // тени — тёмная бирюза, света — крем (утром и ночью свои)
            g += vec3(-0.012, 0.010, 0.0) * (1.0 - abs(l - 0.5) * 2.0); // средние тона чуть зеленее
            g.b += uCool * (1.0 - g.b);                        // убрать жёлтый налёт: в видео синий канал почти как красный
            g = mix(g0, g, uGrade);
          }
          if (uVig > 0.0) {
            vec2 q = (uv - 0.5) * vec2(1.0, 1.15);
            float v = smoothstep(0.42, 0.95, length(q));
            float bottom = smoothstep(0.3, 0.0, uv.y);
            g = mix(g, vec3(0.02, 0.06, 0.065), clamp(v*0.6 + bottom*0.7, 0.0, 0.9) * uVig);
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
    const u = this.comp.uniforms;
    const sp = sunWorld.clone().project(camera);
    u.uSun.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    const inFront = sp.z < 1 && sp.z > -1;
    const edge = Math.max(Math.abs(sp.x), Math.abs(sp.y));
    u.uSunVis.value = inFront ? THREE.MathUtils.clamp(1.6 - edge, 0, 1) : 0;
    u.tScene.value = this.rtScene.texture; u.tBloom.value = this.rtA.texture; u.tDepth.value = this.rtScene.depthTexture;
    u.uNear.value = camera.near; u.uFar.value = camera.far; u.uTime.value = t;
    const keepP = u.uPaint.value, keepR = u.uRays.value;
    if (!this.qPaint) u.uPaint.value = 0; if (!this.qRays) u.uRays.value = 0;
    this.quad.material = this.comp;
    r.setRenderTarget(null); r.render(this.scene, this.cam);
    u.uPaint.value = keepP; u.uRays.value = keepR;
  }
}
