// Ядро: рендер, живописный пост-проход, свет «Аркейн, мрачный» (сумерки), небо, тон-шейдеры, частицы, вода, камера.
import * as THREE from 'three';

// палитра сумерек из style-lab/src/arcane.js (STYLES.new.dusk), линейные цвета
export const PAL = {
  sun: [0.36, 0.48, 0.5], shade: [0.085, 0.145, 0.19], deep: [0.03, 0.05, 0.065], sky: [0.16, 0.23, 0.23], fog: [0.05, 0.075, 0.078],
  sunDir: new THREE.Vector3(-0.5, 0.55, 0.55).normalize(),
};
const lin = (a) => new THREE.Color().setRGB(a[0], a[1], a[2]);

export const U = {
  uTime: { value: 0 },
  uTr: { value: Array.from({ length: 9 }, () => new THREE.Vector4(0, 0, 0, 0)) },
};

const gradData = new Uint8Array([46, 100, 170, 255]);
export const GRAD = new THREE.DataTexture(gradData, 4, 1, THREE.RedFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;

// toon с 4 ступенями; ext: rim (контровой свет), tint (множитель/добавка света-тени), sway/hang (трава), flash
export function toonMat(o = {}, ext = {}) {
  const m = new THREE.MeshToonMaterial({ gradientMap: GRAD, ...o });
  const uni = { uRimK: { value: ext.rim || 0 }, uMul: { value: new THREE.Color(1, 1, 1) }, uAdd: { value: new THREE.Color(0, 0, 0) }, uSway: { value: ext.sway || 0 }, uHang: { value: ext.hang ? 1 : 0 }, uPaint: { value: 0 } };
  m.userData.uni = uni;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni, { uTime: U.uTime, uTr: U.uTr });
    if (ext.plant) {
      sh.vertexShader = 'uniform float uTime, uSway, uHang; uniform vec4 uTr[9];\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        mat4 imx = modelMatrix;
        #ifdef USE_INSTANCING
        imx = modelMatrix * instanceMatrix;
        #endif
        vec3 wp = (imx * vec4(transformed, 1.0)).xyz;
        vec3 org = (imx * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float isc = length((imx * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        float wgt = uHang > 0.5 ? clamp(-position.y, 0.0, 1.0) : pow(clamp(position.y, 0.0, 1.0), 1.4);
        float ph = org.x * 0.6 + org.z * 0.4;
        vec3 dW = vec3(0.8, 0.0, 0.55) * (sin(uTime * 1.5 + ph) * 0.6 + sin(uTime * 2.9 + ph * 1.7) * 0.4) * uSway * wgt * isc;
        if (uHang < 0.5) {
          for (int i = 0; i < 9; i++) {
            vec4 t = uTr[i];
            if (t.z > 0.0) {
              vec2 d = org.xz - t.xz; float dist = length(d);
              if (dist < t.z) {
                float k = 1.0 - dist / t.z; k *= k;
                vec2 dir = d / max(dist, 0.08);
                dW.xz += dir * k * 0.85 * wgt * isc + vec2(sin(uTime * 15.0 + float(i) * 2.0 + org.x * 3.0), cos(uTime * 13.0 + org.z * 3.0)) * 0.05 * k * wgt * isc * (0.3 + t.w);
                dW.y -= k * 0.5 * wgt * isc;
              }
            }
          }
        }
        mvPosition.xyz += (viewMatrix * vec4(dW, 0.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;`);
    }
    if (ext.rim || ext.tint) {
      sh.fragmentShader = 'uniform float uRimK; uniform vec3 uMul, uAdd;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
        {
          vec3 vdir = normalize(vViewPosition);
          float rimF = pow(1.0 - clamp(dot(normal, vdir), 0.0, 1.0), 2.3);
          float back = smoothstep(-0.3, 0.55, dot(normal, normalize(vec3(-0.5, 0.4, -0.75))));
          outgoingLight = outgoingLight * uMul + uAdd;
          outgoingLight += vec3(0.42, 0.78, 0.76) * rimF * back * uRimK;
        }
        #include <opaque_fragment>`);
    }
  };
  return m;
}
export const plantMat = (sway, hang) => toonMat({ vertexColors: true, side: THREE.DoubleSide }, { plant: true, sway: sway ?? 0.1, hang });
export const vcMat = (o = {}) => toonMat({ vertexColors: true, ...o });

// ---------------------------------------------------------------- рендер и пост-проход
const POST_FS = `
precision highp float;
uniform sampler2D tD; uniform vec2 uRes; uniform float uTime, uVign, uSat, uContrast, uGrain, uInk, uBloom, uExposure;
uniform vec3 uHazeLo, uHazeHi;
varying vec2 vUv;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float lum(vec3 c){ return dot(c, vec3(0.3, 0.59, 0.11)); }
void main(){
  vec2 uv = vUv;
  vec2 wob = vec2(vn(uv * vec2(70.0, 40.0) + uTime * 0.04), vn(uv * vec2(64.0, 36.0) + 7.3)) - 0.5;
  uv += wob * 0.0018;
  vec2 px = 1.0 / uRes;
  vec3 c = texture2D(tD, uv).rgb;
  // тонкая линия по перепаду яркости
  float lL = lum(texture2D(tD, uv - vec2(px.x * 1.2, 0.0)).rgb), lR = lum(texture2D(tD, uv + vec2(px.x * 1.2, 0.0)).rgb);
  float lU = lum(texture2D(tD, uv - vec2(0.0, px.y * 1.2)).rgb), lD = lum(texture2D(tD, uv + vec2(0.0, px.y * 1.2)).rgb);
  float edge = abs(lR - lL) + abs(lD - lU);
  c *= 1.0 - smoothstep(0.05, 0.22, edge) * 0.38 * uInk;
  // мягкое свечение ярких мест
  vec3 bl = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854; vec2 o = vec2(cos(a), sin(a)) * px * 7.0;
    vec3 s = texture2D(tD, uv + o).rgb; bl += max(s - 0.55, 0.0);
    s = texture2D(tD, uv + o * 2.2).rgb; bl += max(s - 0.55, 0.0) * 0.6;
  }
  c += bl * 0.09 * uBloom;
  // дымка по вертикали: холоднее внизу, светлее у горизонта
  float hz = smoothstep(0.0, 1.0, 1.0 - vUv.y);
  c = mix(c, c + mix(uHazeHi, uHazeLo, hz) * 0.55, 0.28);
  c = vec3(1.0) - exp(-c * uExposure);
  float l = lum(c);
  c = mix(vec3(l), c, uSat);
  c = (c - 0.17) * uContrast + 0.17;
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  c *= 1.0 - uVign * smoothstep(0.35, 1.05, length(q));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c += (h21(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(lin([0.075, 0.115, 0.118]), 9, 78);
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 500);
    this.pr = Math.min(window.devicePixelRatio || 1, 1.5);
    let type = THREE.HalfFloatType;
    this.rt = new THREE.WebGLRenderTarget(16, 16, { type, samples: 4, depthBuffer: true });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tD: { value: this.rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: U.uTime,
        uVign: { value: 0.7 }, uSat: { value: 0.8 }, uContrast: { value: 1.14 }, uGrain: { value: 0.02 }, uInk: { value: 1 }, uBloom: { value: 0.6 }, uExposure: { value: 1.25 },
        uHazeLo: { value: lin([0.05, 0.085, 0.085]) }, uHazeHi: { value: lin([0.1, 0.12, 0.1]) },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: POST_FS, depthTest: false, depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
    this.makeLights();
    this.makeSky();
    this.paint = true;
  }
  makeLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(lin(PAL.sky).multiplyScalar(2.6), lin(PAL.shade).multiplyScalar(2.0), 1.0);
    s.add(this.hemi);
    this.sun = new THREE.DirectionalLight(lin(PAL.sun).multiplyScalar(3.4), 1.0);
    this.sun.castShadow = true;
    const sh = this.sun.shadow; sh.mapSize.set(2048, 2048);
    const c = sh.camera; c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.near = 1; c.far = 140;
    sh.bias = -0.0004; sh.normalBias = 0.05;
    s.add(this.sun, this.sun.target);
    this.fire = new THREE.PointLight(0xff9a4a, 0, 14, 1.6);
    this.fire.position.set(-9, 1.4, 6);
    s.add(this.fire);
  }
  followShadow(x, y, z) {
    this.sun.target.position.set(x, y, z);
    this.sun.position.copy(PAL.sunDir).multiplyScalar(60).add(this.sun.target.position);
    this.sun.target.updateMatrixWorld();
  }
  makeSky() {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTime: U.uTime, uTop: { value: lin([0.016, 0.03, 0.04]) }, uMid: { value: lin([0.09, 0.15, 0.16]) }, uHor: { value: lin(PAL.fog).multiplyScalar(1.5) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `precision highp float; varying vec3 vD; uniform float uTime; uniform vec3 uTop, uMid, uHor;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec3 d = normalize(vD); float e = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.22, e)); c = mix(c, uTop, smoothstep(0.18, 0.9, e));
          vec2 sp = d.xz / (d.y + 0.35) * 1.4;
          float cl = vn(sp * vec2(2.2, 5.0) + vec2(uTime * 0.01, 0.0)) * 0.6 + vn(sp * vec2(5.0, 11.0) + 4.0) * 0.4;
          float strokes = smoothstep(0.52, 0.78, cl) * smoothstep(0.02, 0.2, e) * (1.0 - smoothstep(0.5, 0.9, e));
          c += vec3(0.05, 0.075, 0.07) * strokes;
          vec3 md = normalize(vec3(-0.45, 0.45, -0.77));
          float md2 = length(d - md);
          c += vec3(0.6, 0.78, 0.74) * smoothstep(0.045, 0.036, md2) * 1.1;
          c += vec3(0.1, 0.16, 0.16) * smoothstep(0.35, 0.0, md2) * 0.5;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), m);
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }
  resize(w, h) {
    w = Math.max(2, Math.floor(w)); h = Math.max(2, Math.floor(h));
    this.renderer.setPixelRatio(this.pr); this.renderer.setSize(w, h, false);
    const bw = Math.floor(w * this.pr), bh = Math.floor(h * this.pr);
    this.rt.setSize(bw, bh);
    this.post.uniforms.uRes.value.set(bw, bh);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }
  render(t) {
    U.uTime.value = t;
    this.sky.position.copy(this.camera.position);
    const r = this.renderer;
    r.setRenderTarget(this.rt); r.clear(); r.render(this.scene, this.camera);
    r.setRenderTarget(null); r.render(this.postScene, this.postCam);
  }
}

// ---------------------------------------------------------------- частицы (мягкие точки)
export class Particles {
  constructor(n, { additive = false } = {}) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    this.colA = new Float32Array(n * 4); this.size = new Float32Array(n); this.grav = new Float32Array(n); this.drag = new Float32Array(n); this.grow = new Float32Array(n);
    this.base = new Float32Array(n); this.alp = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.colA, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 500 } },
      vertexShader: 'attribute vec4 aCol; attribute float aSize; varying vec4 vC; uniform float uScale; void main(){ vC = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.2, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'precision highp float; varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.18, d); gl_FragColor = vec4(vC.rgb, vC.a * a); if (gl_FragColor.a < 0.01) discard; }',
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    for (let k = 0; k < n; k++) this.pos[k * 3 + 1] = -999;
  }
  emit(x, y, z, vx, vy, vz, color, size, life, grav = 6, drag = 1.2, alpha = 0.9, grow = 0) {
    const k = this.i; this.i = (this.i + 1) % this.n;
    this.pos[k * 3] = x; this.pos[k * 3 + 1] = y; this.pos[k * 3 + 2] = z;
    this.vel[k * 3] = vx; this.vel[k * 3 + 1] = vy; this.vel[k * 3 + 2] = vz;
    const c = typeof color === 'number' ? _tc.set(color) : color;
    this.colA[k * 4] = c.r; this.colA[k * 4 + 1] = c.g; this.colA[k * 4 + 2] = c.b; this.colA[k * 4 + 3] = alpha; this.alp[k] = alpha;
    this.base[k] = size; this.size[k] = size; this.life[k] = life; this.max[k] = life; this.grav[k] = grav; this.drag[k] = drag; this.grow[k] = grow;
  }
  update(dt, camera, h) {
    this.mat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) { if (this.pos[k * 3 + 1] > -900) { this.pos[k * 3 + 1] = -999; this.size[k] = 0; } continue; }
      this.life[k] -= dt;
      const dg = Math.exp(-this.drag[k] * dt);
      this.vel[k * 3] *= dg; this.vel[k * 3 + 2] *= dg; this.vel[k * 3 + 1] = this.vel[k * 3 + 1] * dg - this.grav[k] * dt;
      this.pos[k * 3] += this.vel[k * 3] * dt; this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      const t = Math.max(0, this.life[k] / this.max[k]);
      this.colA[k * 4 + 3] = Math.min(1, t * 2.2) * this.alp[k];
      this.size[k] = this.base[k] * (1 + this.grow[k] * (1 - t));
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aCol.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true;
  }
}
const _tc = new THREE.Color();

// ---------------------------------------------------------------- вода
export function makeWaterMaterial() {
  const f = THREE.UniformsUtils.clone({ x: 0 });
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: U.uTime, uDeep: { value: lin([0.012, 0.045, 0.06]) }, uShallow: { value: lin([0.05, 0.13, 0.13]) }, uSky: { value: lin([0.1, 0.17, 0.18]) },
      uFogCol: { value: lin([0.075, 0.115, 0.118]) }, uFog: { value: new THREE.Vector2(9, 78) }, uGlint: { value: lin([0.42, 0.62, 0.58]) },
    },
    vertexShader: 'attribute float aDepth; varying vec3 vW; varying float vD; void main(){ vD = aDepth; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `precision highp float; varying vec3 vW; varying float vD; uniform float uTime; uniform vec3 uDeep, uShallow, uSky, uFogCol, uGlint; uniform vec2 uFog;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float d = clamp(vD, 0.0, 1.0);
        vec3 base = mix(uShallow, uDeep, smoothstep(0.05, 0.6, d));
        vec3 view = normalize(cameraPosition - vW);
        float fr = pow(1.0 - clamp(view.y, 0.0, 1.0), 3.0);
        float n = vn(vW.xz * vec2(1.6, 4.2) + vec2(uTime * 0.25, -uTime * 0.12)) * 0.6 + vn(vW.xz * vec2(3.4, 9.0) - uTime * 0.2) * 0.4;
        float stroke = smoothstep(0.62, 0.8, n);
        vec3 col = mix(base, uSky, fr * 0.7) + uGlint * stroke * (0.35 + fr * 0.6);
        float foam = smoothstep(0.1, 0.0, abs(vD - 0.0)) * (0.5 + 0.5 * vn(vW.xz * 7.0 + uTime * 0.4));
        col += vec3(0.28, 0.4, 0.36) * foam * 0.5;
        float f = smoothstep(uFog.x, uFog.y, distance(cameraPosition, vW));
        col = mix(col, uFogCol, f);
        gl_FragColor = vec4(col, smoothstep(-0.22, 0.05, vD) * 0.94);
      }`,
  });
}

// ---------------------------------------------------------------- камера
export class CamRig {
  constructor(camera) {
    this.cam = camera; this.mode = 'follow';
    this.yaw = 0; this.pitch = 0.36; this.dist = 5.6; this.target = new THREE.Vector3(); this.center = new THREE.Vector3(0, 0, 0);
    this.auto = false; this.height = 1.5;
    this._p = new THREE.Vector3(); this._t = new THREE.Vector3(); this.inited = false;
  }
  setOrbit(center, yaw, pitch, dist) { this.mode = 'orbit'; this.center.copy(center); this.yaw = yaw; this.pitch = pitch; this.dist = dist; this.inited = false; }
  setFollow(dist = 5.6, pitch = 0.36) { this.mode = 'follow'; this.dist = dist; this.pitch = pitch; this.inited = false; }
  update(dt, heroPos, heightFn) {
    const c = this.cam;
    if (this.mode === 'orbit') {
      if (this.auto) this.yaw += dt * 0.12;
      const cp = Math.cos(this.pitch);
      this._p.set(this.center.x + Math.sin(this.yaw) * cp * this.dist, this.center.y + Math.sin(this.pitch) * this.dist, this.center.z + Math.cos(this.yaw) * cp * this.dist);
      c.position.lerp(this._p, this.inited ? 1 - Math.exp(-dt * 8) : 1);
      c.lookAt(this.center); this.inited = true;
      return;
    }
    this._t.set(heroPos.x, heroPos.y + this.height, heroPos.z);
    this.target.lerp(this._t, this.inited ? 1 - Math.exp(-dt * 7) : 1);
    const cp = Math.cos(this.pitch);
    this._p.set(this.target.x - Math.sin(this.yaw) * cp * this.dist, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z - Math.cos(this.yaw) * cp * this.dist);
    if (this.blocked) {
      // камера не заходит в постройки: идём от героя к желаемой точке и останавливаемся перед препятствием
      const tx = this.target.x, tz = this.target.z; let last = 1;
      for (let k = 1; k <= 12; k++) { const f = k / 12, x = tx + (this._p.x - tx) * f, z = tz + (this._p.z - tz) * f; const y = this.target.y + (this._p.y - this.target.y) * f; if (this.blocked(x, z, y - heightFn(x, z))) { last = (k - 1) / 12; break; } }
      if (last < 1) { last = Math.max(0.25, last - 0.06); this._p.x = tx + (this._p.x - tx) * last; this._p.z = tz + (this._p.z - tz) * last; this._p.y = this.target.y + (this._p.y - this.target.y) * Math.max(last, 0.6); }
    }
    if (heightFn) { const gy = heightFn(this._p.x, this._p.z) + 0.5; if (this._p.y < gy) this._p.y = gy; }
    c.position.copy(this._p);
    c.lookAt(this.target);
    this.inited = true;
  }
}
