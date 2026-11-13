// Запекание рисованной карты нормалей (Б) и кисть — из прототипа «Рисованные нормали» (pnorm/main.js), для сцены игры.
import * as THREE from 'three';
let renderer = null;
export function setRenderer(r) { renderer = r; }
const BLACK = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); BLACK.needsUpdate = true;
const NOISE = /* glsl */`
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
`;

const quadGeo = new THREE.PlaneGeometry(2, 2);
const quadCam = new THREE.Camera();
const QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
export function rt(S) { return new THREE.WebGLRenderTarget(S, S, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }); }
function pass(mat, target) {
  const m = new THREE.Mesh(quadGeo, mat); m.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(m);
  renderer.setRenderTarget(target); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
}
export function bakePainted(geo, albMap, S = 1024) {
  const cc0 = renderer.getClearColor(new THREE.Color()), ca0 = renderer.getClearAlpha();
  try { return bakeInner(geo, albMap, S); } finally { renderer.setClearColor(cc0, ca0); }
}
function bakeInner(geo, albMap, S) {
  const A = rt(S), B = rt(S);
  // 1) нормали модели в UV
  const nm = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vN; void main(){ vN = normal; gl_Position = vec4(uv * 2. - 1., 0., 1.); }',
    fragmentShader: 'varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN) * .5 + .5, 1.); }',
    side: THREE.DoubleSide, depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, nm); mesh.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(mesh);
  renderer.setRenderTarget(A); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, quadCam); renderer.setRenderTarget(null);
  // 2) расширение островов UV (чтобы шов не темнел)
  const dil = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t; uniform float px; varying vec2 vUv;
    void main(){ vec4 c = texture2D(t, vUv); if (c.a > .5) { gl_FragColor = c; return; }
      vec4 s = vec4(0.); for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec4 q = texture2D(t, vUv + vec2(x, y) * px); if (q.a > .5) s += vec4(q.rgb, 1.); }
      gl_FragColor = s.a > 0. ? vec4(s.rgb / s.a, 1.) : vec4(0.); }` });
  let src = A, dst = B;
  for (let i = 0; i < 6; i++) { dil.uniforms.t.value = src.texture; pass(dil, dst); [src, dst] = [dst, src]; }
  const base = src; const spare = dst;
  // 3) мазки: два слоя вытянутых клеток в UV; нормаль мазка = нормаль в центре мазка (плоскость), щетина вдоль, рваный край
  const paint = new THREE.ShaderMaterial({ uniforms: { t: { value: base.texture }, alb: { value: albMap || BLACK }, cmode: { value: 0 }, seed: { value: 0 }, px: { value: 1 / S } }, vertexShader: QUAD_V, fragmentShader: `
    uniform sampler2D t, alb; uniform float seed, px, cmode; varying vec2 vUv;
    ${NOISE}
    vec3 dec(vec4 c){ return normalize(c.rgb * 2. - 1.); }
    vec3 layer(vec2 uv, vec3 n0, float ang, vec2 sc, float sd, out float e, out vec2 cuo){
      mat2 R = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
      vec2 w = uv + (vec2(n2(uv * 40. + sd), n2(uv * 40. + sd + 9.)) - .5) * .012;
      vec2 s = (R * w) * sc; vec2 i = floor(s); float d1 = 9., d2 = 9.; vec2 fp = s, id = i;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 c = i + vec2(x, y); vec2 q = c + .1 + .8 * h22(c + sd); float d = length(s - q); if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d; }
      e = d2 - d1;
      vec2 cu = transpose(R) * (fp / sc);
      vec4 cc = texture2D(t, cu); vec3 nc = dec(cc);
      cuo = cu; if (cc.a < .5 || dot(nc, n0) < .55) { nc = n0; cuo = uv; }            // центр на другом острове UV — берём свою нормаль и свой цвет
      nc = normalize(nc + (h33(vec3(id, sd)) - .5) * .3);
      float br = n2(vec2((s.y - fp.y) * 14., s.x * .6) + id * 3.7);   // щетина вдоль мазка
      vec3 tl = normalize(cross(n0, vec3(.3, .9, .2)));
      return nc;   // плоский мазок: без щетины-объёма
    }
    void main(){
      vec4 c = texture2D(t, vUv); if (c.a < .5) { gl_FragColor = c; return; }
      vec3 n0 = dec(c); float e1, e2; vec2 ca, cb;
      vec3 a = layer(vUv, n0, .5, vec2(22., 60.), seed, e1, ca);
      vec3 b = layer(vUv + .013, n0, -.35, vec2(34., 90.), seed + 41., e2, cb);
      float m = step(.52, n2(vUv * 26. + seed * 3.) + (n2(vUv * 160. + seed) - .5) * .35);   // слой выбирается целиком, без смешения нормалей   // маска щетины: где ложится второй слой
      if (cmode > .5) {   // цвет теми же мазками: внутри мазка цвет из его центра (как у автора видео: цвет и нормаль в одних местах)
        vec2 cu = m > .5 ? cb : ca; vec3 ac = texture2D(alb, cu).rgb, ao = texture2D(alb, vUv).rgb;
        gl_FragColor = vec4(mix(ac, ao, .25), 1.); return;
      }
      vec3 n = normalize(mix(a, b, m));
      gl_FragColor = vec4(n * .5 + .5, 1.);
    }` });
  const outs = [];
  const rts = [];
  for (let k = 0; k < 3; k++) { const o = rt(S); paint.uniforms.seed.value = k * 13.7; pass(paint, o); outs.push(o.texture); rts.push(o); }
  const cols = [];
  if (albMap) { paint.uniforms.cmode.value = 1; for (let k = 0; k < 3; k++) { const o = rt(S); paint.uniforms.seed.value = k * 13.7; pass(paint, o); cols.push(o.texture); } }
  spare.dispose(); nm.dispose(); dil.dispose(); paint.dispose();
  return { base: base.texture, painted: outs, colors: cols, rts, S };
}

const STAMP_V = QUAD_V;
const stampN = new THREE.ShaderMaterial({ uniforms: { c: { value: new THREE.Vector2() }, dir: { value: new THREE.Vector2(1, 0) }, r: { value: .02 }, nrm: { value: new THREE.Vector3(0, 0, 1) }, base: { value: null }, erase: { value: 0 }, seed: { value: 0 } },
  vertexShader: STAMP_V, transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  fragmentShader: `uniform vec2 c, dir; uniform float r, erase, seed; uniform vec3 nrm; uniform sampler2D base; varying vec2 vUv;
  ${NOISE}
  float brushMask(){ vec2 p = vUv - c; vec2 pr = vec2(-dir.y, dir.x);
    float a = dot(p, dir) / (r * 1.7), b = dot(p, pr) / r;
    float d = length(vec2(a, b)) + (n2(vUv / r * 1.3 + seed) - .5) * .35;
    float m = 1. - smoothstep(.75, 1., d);
    m *= .78 + .22 * step(.35, n2(vec2(b * 9., a * .8) + seed));   // щетина вдоль мазка
    return m; }
  void main(){ float m = brushMask(); if (m <= .001) discard;
    vec3 n = erase > .5 ? texture2D(base, vUv).rgb : nrm * .5 + .5; gl_FragColor = vec4(n, m); }` });
const stampC = new THREE.ShaderMaterial({ uniforms: { ...stampN.uniforms, col: { value: new THREE.Color() } },
  vertexShader: STAMP_V, transparent: true, depthTest: false, depthWrite: false,
  blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  fragmentShader: stampN.fragmentShader.replace('uniform sampler2D base;', 'uniform sampler2D base; uniform vec3 col;').replace(/void main\(\)\{[\s\S]*\}$/, 'void main(){ float m = brushMask(); if (m <= .001) discard; gl_FragColor = erase > .5 ? vec4(0., 0., 0., m) : vec4(col, m * .75); }') });
// стирание цвета: альфа уменьшается
const stampCE = stampC.clone(); stampCE.uniforms = stampC.uniforms; stampCE.blendSrcAlpha = THREE.ZeroFactor; stampCE.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
export function stampInto(mat, target) {
  const m = new THREE.Mesh(quadGeo, mat); m.frustumCulled = false; const sc = new THREE.Scene(); sc.add(m);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(target); renderer.render(sc, quadCam); renderer.setRenderTarget(null); renderer.autoClear = ac;
}

export { stampN, stampC, stampCE };
