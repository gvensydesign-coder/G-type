// Рисованные нормали по материалам (прототип 2026-11-11): мазок = плоская грань, приклеенная к предмету.
// Профиль: sz — размер мазка по осям объекта (м), tilt — наклон грани, bris — щетина вдоль мазка,
// soft — мягкость края мазка, str — сила, R — кривизна формы (нормаль центра мазка n + (c − p)/R).
// Иерархия: герой чётче всех, постройки и камни спокойнее, зелень и земля почти гладкие.
import * as THREE from 'three';
export const PN_PROFILES = {
  hero:   { t: 'Герои', sz: [.16, .06, .16], tilt: .22, bris: .08, soft: .5, str: .75, R: .16 },
  stone:  { t: 'Камень', sz: [.22, .13, .22], tilt: .45, bris: .03, soft: .18, str: .85, R: .25 },
  metal:  { t: 'Железо', sz: [.1, .1, .1], tilt: .5, bris: 0, soft: .08, str: .9, R: .12 },
  wood:   { t: 'Дерево', sz: [.08, .3, .08], tilt: .14, bris: .35, soft: .5, str: .6, R: .2 },
  oak:    { t: 'Дуб, кора', sz: [.14, .4, .14], tilt: .2, bris: .4, soft: .45, str: .6, R: .3 },
  hay:    { t: 'Сено', sz: [.08, .06, .25], tilt: .3, bris: .25, soft: .7, str: .45, R: .4 },
  cloth:  { t: 'Ткань', sz: [.2, .08, .2], tilt: .2, bris: .1, soft: .6, str: .6, R: .2 },
  moss:   { t: 'Мох', sz: [.3, .2, .3], tilt: .2, bris: .05, soft: .8, str: .4, R: .4 },
  leaf:   { t: 'Хвоя, кусты, трава', sz: [.25, .15, .25], tilt: .25, bris: 0, soft: .8, str: .35, R: .3 },
  ground: { t: 'Земля', sz: [.9, .5, .9], tilt: .16, bris: 0, soft: 1, str: .28, R: 1.2 },
  none:   { t: 'Вода и эффекты', sz: [1, 1, 1], tilt: 0, bris: 0, soft: 1, str: 0, R: 1 },
};
const ALIAS = { fir: 'leaf', bush: 'leaf', fern: 'leaf', grass: 'leaf', water: 'none' };
export const PN_SAME = 'hero';
export const PN_MATS = new Set();
export function pnKind(m) { const k = m.userData?.mk || m.userData?.kind; return k ? (ALIAS[k] || (PN_PROFILES[k] ? k : 'cloth')) : 'hero'; }
export function pnUniforms(m) {
  if (!m.userData.pnU) {
    m.userData.pnK = pnKind(m);
    m.userData.pnU = { pfPNa: { value: new THREE.Vector4() }, pfPNb: { value: new THREE.Vector4() } };
    pnApply(m, true); PN_MATS.add(m);
  }
  return m.userData.pnU;
}
export function pnApply(m, byMat) {
  const P = PN_PROFILES[byMat ? m.userData.pnK : (m.userData.pnK === 'none' ? 'none' : PN_SAME)];
  m.userData.pnU.pfPNa.value.set(P.sz[0], P.sz[1], P.sz[2], P.tilt); m.userData.pnU.pfPNb.value.set(P.bris, P.soft, P.str, P.R);
}
export function pnSetByMaterial(on) { for (const m of PN_MATS) pnApply(m, on); }

export const PN_GLSL = /* glsl */`
uniform vec4 pfPN, pfPNa, pfPNb;   // pfPN: x вкл, y кипение, z сила, w резкость
varying vec3 vPfMv0; varying vec3 vPfMv1; varying vec3 vPfMv2;
vec3 pnH33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float pnH31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float pnN3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(pnH31(i), pnH31(i + vec3(1,0,0)), f.x), mix(pnH31(i + vec3(0,1,0)), pnH31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(pnH31(i + vec3(0,0,1)), pnH31(i + vec3(1,0,1)), f.x), mix(pnH31(i + vec3(0,1,1)), pnH31(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 pfPaintN(vec3 nV, float faceDir, float stepN){
  if (pfPNb.z <= 0.) return nV;
  vec3 p = vPfObjPos; vec3 n = normalize(vPfObjN);
  float seed = pfPN.y > .5 ? mod(stepN, 3.) * 17.3 : 0.;
  vec3 sz = pfPNa.xyz; float wm = min(sz.x, min(sz.y, sz.z));
  vec3 w = p + (vec3(pnN3(p / wm * .7 + seed), pnN3(p / wm * .7 + 11. + seed), pnN3(p / wm * .7 + 23. + seed)) - .5) * wm * 1.1;
  float a = .38, b = .22;
  mat3 R = mat3(cos(a), sin(a), 0., -sin(a), cos(a), 0., 0., 0., 1.) * mat3(1., 0., 0., 0., cos(b), sin(b), 0., -sin(b), cos(b));
  vec3 s = (R * w) / sz;
  vec3 ci = floor(s); float d1 = 9., d2 = 9.; vec3 fp = s, id = ci;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 c = ci + vec3(x, y, z); vec3 q = c + .15 + .7 * pnH33(c + seed); float d = length(s - q);
    if (d < d1) { d2 = d1; d1 = d; fp = q; id = c; } else if (d < d2) d2 = d;
  }
  float fw = length(fwidth(s));
  float fade = 1. - smoothstep(.10, .30, fw);              // мазок мельче ~6 px на экране — гладко, без ряби
  if (fade <= 0.) return nV;
  vec3 c = transpose(R) * (fp * sz);
  vec3 r = c - p; r -= n * dot(r, n);
  vec3 nc = normalize(n + r / pfPNb.w + (pnH33(id + 5.1 + seed) - .5) * pfPNa.w);
  float br = pnN3(vec3(s.x * .5, (s.y - fp.y) * 8., s.z * .5) + id * 3.1);
  vec3 up = transpose(R) * vec3(0., 1., 0.);
  nc = normalize(nc + (up - n * dot(up, n)) * (br - .5) * pfPNb.x * (1. - smoothstep(.05, .14, fw)));
  float sw = pfPNb.y * mix(1.6, .15, pfPN.w);
  nc = normalize(mix(n, nc, smoothstep(0., sw + .001, d2 - d1)));
  vec3 nv = normalize(mat3(vPfMv0, vPfMv1, vPfMv2) * nc) * faceDir;
  return normalize(mix(nV, nv, pfPN.z * pfPNb.z * fade));
}
`;
