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
uniform float uRain;       // дождь 0..1: мокрый блеск, лужи, рябь
uniform vec4 uLamp0; uniform vec4 uLamp1;   // ночные огни: (позиция, радиус): иллюминатор стража и фонарь Богатыря
uniform vec3 uLampC0; uniform vec3 uLampC1; // цвет × сила (ночью > 0)
uniform sampler2D uTrail;
uniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflOn;  // зеркальная картинка для воды
  // примятая тропа и следы (рисует физика), область x -16..16, z -4..16
`;

export const HAZE_FN = /* glsl */`
// отражение сцены в воде: смещение рябью и вертикальный смаз, как мазками по воде; fb — цвет, если отражения нет
vec3 waterRefl(vec3 w, vec2 nxz, vec3 fb){
  if (uReflOn < 0.5) return fb;
  vec4 p = uReflMat * vec4(w, 1.0); vec2 uv = p.xy / p.w + nxz * 0.035;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return fb;
  vec3 c = texture2D(uRefl, uv).rgb * 0.5 + texture2D(uRefl, uv + vec2(0.0, 0.012)).rgb * 0.3 + texture2D(uRefl, uv - vec2(0.0, 0.02)).rgb * 0.2;
  return c;
}

// ---- лужи: несколько луж в низинах поляны и у тропы, край неровный, как обведённый от руки; в дождь растут ----
// 0 на кромке, к 1 в самой глубокой точке, < 0 снаружи
float puddleOne(vec2 p, vec2 c, vec2 r, float s){
  vec2 d = (p - c) / (r * (1.0 + 0.3 * uRain)); float a = atan(d.y, d.x);
  float re = 1.0 + 0.16 * sin(3.0 * a + s) + 0.09 * sin(5.0 * a + s * 2.3) + 0.05 * sin(9.0 * a + s * 4.1);
  return 1.0 - length(d) / re;
}
float puddleDepth(vec3 w){
  vec2 p = w.xz; float m = -1.0;
  m = max(m, puddleOne(p, vec2(-4.6, 10.6), vec2(1.7, 0.95), 1.0));
  m = max(m, puddleOne(p, vec2(1.9, 12.2), vec2(1.15, 0.7), 2.0));
  m = max(m, puddleOne(p, vec2(6.0, 9.6), vec2(1.35, 0.8), 3.0));
  m = max(m, puddleOne(p, vec2(-1.3, 7.4), vec2(0.85, 0.55), 4.0));
  m = max(m, puddleOne(p, vec2(-10.2, 3.6), vec2(1.4, 0.9), 5.0));
  m = max(m, puddleOne(p, vec2(-3.2, -6.4), vec2(1.2, 0.65), 6.0));
  m = max(m, puddleOne(p, vec2(7.4, -5.8), vec2(1.0, 0.6), 7.0));
  return m;
}

// ---- ручей: петляет поперёк поляны за стражем (те же формулы в stream.js) ----
float streamZ(float x){ return -9.5 + 2.2 * sin(x * 0.11 + 0.6) + 0.8 * sin(x * 0.27); }
float streamW(float x){ return 1.25 + 0.4 * sin(x * 0.19 + 1.0); }
float streamDist(vec3 w){ return abs(w.z - streamZ(w.x)) - streamW(w.x); }   // < 0 — в воде
// ---- тропа: 0 нет, 1 сильно вытоптано; .g — свежие следы ----
vec2 trailAt(vec3 w){
  vec2 uv = vec2((w.x + 16.0) / 32.0, (w.z + 4.0) / 20.0);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec2(0.0);
  return texture2D(uTrail, uv).rg;
}
// ---- тёплые огни ночью: мягкое пятно света с полутоном, нормаль учитывается наполовину ----
vec3 lampOne(vec3 w, vec3 N, vec4 L, vec3 C){
  vec3 d = L.xyz - w; float r = length(d);
  float f = 1.0 - smoothstep(0.0, L.w, r);
  float k = f * f * (0.45 + 0.55 * max(dot(N, d / max(r, 1e-3)), 0.0));
  k = k > 0.42 ? 1.0 : (k > 0.12 ? 0.55 : k * 2.5);  // ступени, как в рисунке
  return C * k;
}
vec3 lampLight(vec3 w, vec3 N){ return lampOne(w, N, uLamp0, uLampC0) + lampOne(w, N, uLamp1, uLampC1); }
// свечение тумана вокруг огня: ближайшая точка луча зрения к огню
vec3 lampFog(vec3 w){
  vec3 o = cameraPosition, d = w - o; float len = length(d); vec3 vd = d / max(len, 1e-3);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec4 L = i == 0 ? uLamp0 : uLamp1; vec3 C = i == 0 ? uLampC0 : uLampC1;
    float t = clamp(dot(L.xyz - o, vd), 0.0, len);
    float m = length(o + vd * t - L.xyz);
    acc += C * exp(-m * m / (L.w * L.w * 0.12)) * 0.22;
  }
  return acc;
}
// Пятна солнца сквозь листву: шум, спроецированный вдоль луча солнца, медленно колышется вместе с кронами.
// Под пологом (дальше 14 м от центра поляны) светло только в «окнах» листвы, на поляне — почти везде.
// лист в клетке: заострённый эллипс со своим наклоном, дрожит на ветру
float leafCell(vec2 q, float seed){
  vec2 c = floor(q), f = fract(q) - 0.5;
  float h = hash12(c + seed);
  vec2 o = (vec2(hash12(c + seed + 3.1), hash12(c + seed + 7.3)) - 0.5) * 0.35;
  float a = h * 6.2831 + sin(uTime * (2.0 + h * 2.0) + h * 20.0) * 0.28 * (1.0 + uWind * 1.5);
  vec2 p = mat2(cos(a), -sin(a), sin(a), cos(a)) * (f - o);
  float L = 0.34 + h * 0.12;
  float x = p.x / L; float w = 0.42 * L * (1.0 - x * x);
  return step(abs(x), 1.0) * step(abs(p.y), w);
}
float canopyLight(vec3 wpos){
  vec3 p = wpos - uSunDir * dot(wpos, uSunDir);
  vec2 q = vec2(dot(p, normalize(cross(uSunDir, vec3(0.0,1.0,0.0)))), p.y + p.z * 0.3);
  vec2 sway = vec2(sin(uTime*0.7 + q.y*0.05), cos(uTime*0.55 + q.x*0.04)) * 0.35;
  float n = fbm2(q * 0.22 + sway) * 0.7 + vnoise2(q * 0.9 + sway * 2.0) * 0.3;
  float under = smoothstep(13.0, 20.0, length(wpos.xz)) * smoothstep(30.0, 14.0, wpos.y);
  float hole = step(0.56, n);
  // в пятне света — тени отдельных листьев; в тени — редкие блики в форме листьев
  float leafSh = max(leafCell(q * 1.4 + sway, 1.0), leafCell(q * 1.4 + vec2(0.5, 0.37) + sway * 1.3, 5.0) * step(0.5, hash12(floor(q * 1.4 + 0.5))));
  float leafLit = leafCell(q * 0.9 + sway * 1.6, 9.0) * step(0.62, hash12(floor(q * 0.9 + sway * 1.6) + 2.0)) * step(0.4, n);
  float l = hole * (1.0 - leafSh * 0.85) + (1.0 - hole) * leafLit * 0.9;
  return mix(1.0, 0.1 + l * 0.9, under);
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
  return mix(col, hazeColor(vd), k) + lampFog(wpos) * (0.35 + uGroundFog * 0.5) * uHazeOn;
}
`;
