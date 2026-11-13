// Общие куски GLSL: шум, палитра света, воздушная перспектива.
// Всё в мировых координатах, чтобы пятна и мазки не «плыли» с камерой.

export const NOISE = /* glsl */`
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a=hash13(i), b=hash13(i+vec3(1,0,0)), c=hash13(i+vec3(0,1,0)), d=hash13(i+vec3(1,1,0));
  float e=hash13(i+vec3(0,0,1)), g=hash13(i+vec3(1,0,1)), h=hash13(i+vec3(0,1,1)), k=hash13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,g,f.x),mix(h,k,f.x),f.y), f.z);
}
float vnoise2(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,4.1); a*=0.5; } return s/0.9375; }
float fbm2(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise2(p); p=p*2.01+vec2(5.3,1.7); a*=0.5; } return s/0.96875; }
// Пятна «как кистью»: шум с рваным краем (пороговый fbm + мелкий шум по краю)
float blotch(vec3 p, float th, float edge){
  float n = fbm(p) + (vnoise(p*7.0)-0.5)*edge;
  return step(th, n);
}
`;

// Глобальные uniform'ы: один набор на все материалы (общие объекты по ссылке)
export const GLOBAL_DECL = /* glsl */`
uniform vec3 uSunDir;      // откуда светит (для теней и тонов)
uniform vec3 uGlowDir;     // где на небе сияние (контровое, за сценой)
uniform vec3 uSunCol;      // тёплый свет
uniform vec3 uShadeCol;    // холодный оттенок тени (бирюза/сирень)
uniform vec3 uHazeWarm;    // дымка в сторону солнца (кремовая)
uniform vec3 uHazeCool;    // дымка от солнца (мятная)
uniform float uHazeDen;    // плотность воздушной перспективы
uniform float uHazeMax;
uniform float uHazeOn;
uniform float uTime;
uniform float uGroundFog;  // молочный туман у земли
uniform vec3 uTint;        // общий оттенок времени суток для «нарисованных» цветов (листва, трава, кулисы)
uniform float uCloudSh;    // сила теней от облаков
uniform float uWind;       // порыв ветра 0..1 (трава, лианы, листья)
`;

export const HAZE_FN = /* glsl */`
// Пятна солнца сквозь листву: шум, спроецированный вдоль луча солнца, медленно колышется вместе с кронами.
// Под пологом (дальше 14 м от центра поляны) светло только в «окнах» листвы, на поляне — почти везде.
float canopyLight(vec3 wpos){
  vec3 p = wpos - uSunDir * dot(wpos, uSunDir);
  vec2 q = vec2(dot(p, normalize(cross(uSunDir, vec3(0.0,1.0,0.0)))), p.y + p.z * 0.3);
  vec2 sway = vec2(sin(uTime*0.7 + q.y*0.05), cos(uTime*0.55 + q.x*0.04)) * 0.35;
  float n = fbm2(q * 0.22 + sway) * 0.7 + vnoise2(q * 0.9 + sway * 2.0) * 0.3;
  float under = smoothstep(13.0, 20.0, length(wpos.xz)) * smoothstep(30.0, 14.0, wpos.y);
  float hole = step(0.56, n);
  return mix(1.0, 0.1 + hole * 0.9, under);
}
// Тени облаков: пятна шума на высоте облаков, спроецированные по лучу света и медленно бегущие по земле
float cloudShade(vec3 w){
  vec3 p = w + uSunDir * ((220.0 - w.y) / max(uSunDir.y, 0.15));
  vec2 q = p.xz * 0.0065 + vec2(uTime * 0.010, uTime * 0.004);
  float n = fbm2(q) + (vnoise2(q * 9.0) - 0.5) * 0.06;
  return 1.0 - smoothstep(0.5, 0.56, n) * 0.62 * uCloudSh;
}
vec3 hazeColor(vec3 viewDir){
  float s = pow(max(dot(viewDir, uGlowDir), 0.0), 3.0);
  return mix(uHazeCool, uHazeWarm, 0.35 + 0.65*s);
}
vec3 applyHaze(vec3 col, vec3 wpos){
  vec3 d = wpos - cameraPosition;
  float dist = length(d);
  vec3 vd = d / max(dist, 1e-3);
  float hf = exp(-max(0.5 * (wpos.y + cameraPosition.y), 0.0) * 0.018); // воздух плотнее у земли
  float h = 1.0 - exp(-dist * uHazeDen * hf);
  // низкий молочный туман: гуще у земли и вдали
  float low = exp(-max(wpos.y, 0.0) * 0.25) * smoothstep(30.0, 90.0, length(d.xz)) * uGroundFog; // по горизонтали: сверху земля не тонет в тумане
  float k = clamp(h * uHazeMax + low * 0.5, 0.0, 0.97) * uHazeOn;
  return mix(col, hazeColor(vd), k);
}
`;
