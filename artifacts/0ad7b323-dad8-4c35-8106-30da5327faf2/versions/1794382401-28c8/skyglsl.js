// Небо v2 «Рисованный»: общий GLSL для неба и для предметов (слияние горизонта берёт тот же градиент).
// Цвета линейные (как в игре), вывод — грубый sRGB (pow 1/2.2) после выдержки.
export const COMMON = /* glsl */`
uniform vec3 uSun, uMoon;
uniform float uNight, uExp, uTime, uWind, uCover, uRays, uRit;
uniform vec3 uTop, uMid, uHor, uGlow, uBelt, uHorGlow, uCLit, uCSh, uCDeep, uRim, uFog, uSunCol;
uniform vec4 uF0; // x градиент от солнца, y цветовые поля, z мазки, w облака
uniform vec4 uF1; // x ветер, y края-росчерки, z штриховка, w лучи
uniform vec4 uF2; // x кольца, y свечение горизонта, z растр, w слияние горизонта
uniform vec4 uF3; // x звёзды, y полосы ступенями, z подсветка облаков, w кисть (мазки щетиной)
uniform vec4 uF4; // x зерно, y петли в облаках, z свободные росчерки, w карандашные царапины
uniform vec4 uF5; // x подчёркивание облаков росчерком, y солнце, z луна, w переходы штрихом (маркер/перо/тушь)
uniform sampler2D uAtlas;
uniform sampler2D uLoops;  // петли и каракули: 0 петли, 1 клубок, 2 зигзаг, 3 двойные петли   // почеркушки Michael: строки light, outline, smoke, hatch по 4 рисунка
uniform sampler2D uPress;   // нажим вдоль линии (выпрямленные росчерки света), 4 строки

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  float a = mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z); }
float fb3(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn3(p); p = p * 2.03 + 7.1; a *= .5; } return s / .9375; }
float st(float fps){ return floor(uTime * fps) / fps; }

// OKLab: смешение цветов без серой/зелёной середины (замер примеров: синий -> оранжевый идёт через лиловый)
vec3 toOK(vec3 c){ c = max(c, 0.);
  float l = .4122214708*c.r + .5363325363*c.g + .0514459929*c.b;
  float m = .2119034982*c.r + .6806995451*c.g + .1073969566*c.b;
  float s = .0883024619*c.r + .2817188376*c.g + .6299787005*c.b;
  l = pow(l, 1./3.); m = pow(m, 1./3.); s = pow(s, 1./3.);
  return vec3(.2104542553*l + .7936177850*m - .0040720468*s, 1.9779984951*l - 2.4285922050*m + .4505937099*s, .0259040371*l + .7827717662*m - .8086757660*s); }
vec3 fromOK(vec3 c){
  float l = c.x + .3963377774*c.y + .2158037573*c.z, m = c.x - .1055613458*c.y - .0638541728*c.z, s = c.x - .0894841775*c.y - 1.2914855480*c.z;
  l = l*l*l; m = m*m*m; s = s*s*s;
  return vec3(4.0767416621*l - 3.3077115913*m + .2309699292*s, -1.2684380046*l + 2.6097574011*m - .3413193965*s, -.0041960863*l - .7034186147*m + 1.7076147010*s); }
vec3 mixOK(vec3 a, vec3 b, float t){ return max(fromOK(mix(toOK(a), toOK(b), clamp(t, 0., 1.))), 0.); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
// лёгкий шум: зерно кадра шагом 8 к/с и крупные пятна-«бумага», не больше ±3–4% тона
vec3 grain(vec3 c, vec3 anchor){
  float g = h21(floor(gl_FragCoord.xy) + floor(uTime * 8.) * 17.31) - .5;
  float g2 = h21(floor(gl_FragCoord.xy * .5) + 91.7 + floor(uTime * 8.) * 3.7) - .5;
  float blot = vn3(anchor * 9.) * .6 + vn3(anchor * 31.) * .4 - .5;
  return c * (1. + g * .06 + g2 * .035 + blot * .05);
}

// Градиент неба: по высоте и по углу к светилу (замер ref1/ref3: у низкого солнца ~70% — от солнца), полосы ступенями с рваным краем
vec3 skyRamp(vec3 d, out float tBand){
  float el = asin(clamp(d.y, -1., 1.));
  float e = clamp(el / 1.15, 0., 1.);
  float jit = (vn3(d * 7. + 3.1) - .5);
  if (uF3.y > .5) e = mix(e, (floor(e * 7. + .5 + jit * .7)) / 7., .55);   // полосы ступенями, край мазком
  tBand = e;
  vec3 mauve = mixOK(uHor, uMid, .5); vec3 mo = toOK(mauve); mo.yz *= .55; mauve = fromOK(mo);   // лиловая середина вместо серой
  vec3 c = mixOK(uHor, mauve, smoothstep(0., .2, e));
  c = mixOK(c, uMid, smoothstep(.14, .55, e));
  c = mixOK(c, uTop, smoothstep(.5, 1., e));
  float sunEl = asin(clamp(uSun.y, -1., 1.));
  float sd = dot(d, uSun);
  float ang = acos(clamp(sd, -1., 1.));
  float low = 1. - smoothstep(.12, .7, sunEl);
  float up = smoothstep(-.12, .02, sunEl) * (1. - uNight);
  float fs = exp(-ang / (.28 + .5 * low));
  if (uF3.y > .5) fs = mix(fs, floor(fs * 6. + .5 + jit * .8) / 6., .5);
  float w = uF0.x > .5 ? mix(.3, .75, low) : .12;
  c = mixOK(c, uGlow * (.55 + .5 * low), fs * w * up);
  // пояс Венеры: розово-лиловая полоса напротив низкого солнца, над тёмно-синим
  float belt = smoothstep(.0, .05, el) * (1. - smoothstep(.1, .28, el)) * smoothstep(-.1, .7, -sd) * low * up;
  c = mixOK(c, uBelt, belt * .75 * uF0.x);
  // ночь: узкое свечение у луны (ref5: темно уже через 1,3 радиуса)
  float md = acos(clamp(dot(d, uMoon), -1., 1.));
  c += uGlow * .06 * exp(-md / .09) * uNight;
  return c;
}
`;

export const SKY_FRAG = COMMON + /* glsl */`
varying vec3 vDir;
// базис вокруг светила
void basis(vec3 n, out vec3 t1, out vec3 t2){ t1 = normalize(cross(abs(n.y) < .95 ? vec3(0,1,0) : vec3(1,0,0), n)); t2 = cross(n, t1); }
float atl(int row, float v, vec2 uv){ uv = clamp(uv, .02, .98); return texture2D(uAtlas, vec2((v + uv.x) / 4., (float(row) + uv.y) / 4.)).r; }
// одна почеркушка Michael в клетке: случайный рисунок, поворот зеркалом, размер; треть клеток «кипит» шагом fps
float scrib(int row, vec2 uv, float dens, float seed, float fps){
  vec2 cell = floor(uv); vec2 f = fract(uv);
  float h = h21(cell + seed);
  if (h > dens) return 0.;
  float boil = step(.66, h21(cell + floor(st(fps) * fps) * .37 + seed));
  float v = floor(fract(h * 7.31 + boil * .5) * 4.);
  vec2 g = (f - .5) * (1.05 + .5 * h21(cell + seed + 3.)) + .5;
  if (h21(cell + seed + 9.) > .5) g.x = 1. - g.x;
  if (g.x < .02 || g.x > .98 || g.y < .02 || g.y > .98) return 0.;
  // линия в атласе тонкая (рисунок 256 px ужат в клетку) — утолщаем выборкой крестом, как нажим кисти
  float o = .022, m = 0.;
  for (int i = 0; i < 5; i++) {
    vec2 off = i == 0 ? vec2(0.) : (i == 1 ? vec2(o, 0.) : (i == 2 ? vec2(-o, 0.) : (i == 3 ? vec2(0., o) : vec2(0., -o))));
    vec2 gg = clamp(g + off, .01, .99);
    m = max(m, texture2D(uAtlas, vec2((v + gg.x) / 4., (float(row) + gg.y) / 4.)).r);
  }
  return m;
}
// почеркушки полосой: только одна клетка поперёк (y в 0..1), иначе узор повторяется кольцами
float scribY(int row, vec2 uv, float dens, float seed, float fps){ return (uv.y < 0. || uv.y >= 1.) ? 0. : scrib(row, uv, dens, seed, fps); }
float scribX(int row, vec2 uv, float dens, float seed, float fps){ return (uv.x < 0. || uv.x >= 1.) ? 0. : scrib(row, uv, dens, seed, fps); }
// петля в клетке (как scrib, но из набора петель; v < 0 — случайный рисунок из набора)
float loopc(vec2 uv, float dens, float seed, float fps, float vsel){
  vec2 cell = floor(uv); vec2 f = fract(uv);
  float h = h21(cell + seed);
  if (h > dens) return 0.;
  float boil = step(.66, h21(cell + floor(st(fps) * fps) * .37 + seed));
  float v = vsel >= 0. ? vsel : floor(fract(h * 7.31 + boil * .5) * 4.);
  vec2 g = (f - .5) * (1. + .3 * h21(cell + seed + 3.)) + .5;
  g.y += (boil - .5) * .04;
  if (h21(cell + seed + 9.) > .5) g.x = 1. - g.x;
  if (g.x < .01 || g.x > .99 || g.y < .01 || g.y > .99) return 0.;
  return texture2D(uLoops, vec2((v + g.x) / 4., g.y)).r;
}
float loopY(vec2 uv, float dens, float seed, float fps, float vsel){ return (uv.y < 0. || uv.y >= 1.) ? 0. : loopc(uv, dens, seed, fps, vsel); }
float prs(float v, float u){ return texture2D(uPress, vec2(fract(u), (v + .5) / 4.)).r; }
// облачный слой: 3D-шум на направлении, слой поворачивается вокруг вертикали по ветру (своя скорость = параллакс), шагами
float cloudF(vec3 d, float rot, vec3 sc, float seed){
  float c = cos(rot), s = sin(rot);
  vec3 q = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
  return fb3(q * sc + seed);
}
// КИСТЬ (постер Spider-Verse): небо собрано из длинных косых мазков. Каждый мазок берёт цвет неба со своим сдвигом,
// поэтому на стыках мазков цвет обрывается; край мазка рваный щетиной, внутри полоски щетины.
vec2 gId, gId2; float gU, gV, gAl, gAc, gAB;
// одна сетка мазков в плоских координатах q: сдвиг выборки цвета, id мазка и МАСКА мазка (1 в теле, к краям и торцам
// сходит на нет щетиной). Наклон постоянный, а «гуляние» мазков — мягкий сдвиг координат: при повороте сетки шумом
// мазки сминались в прямые длинные стыки (замечание Michael 2026-11-11).
vec2 sGrid(vec2 q, float rw, float lmin, float lmax, float off, float bf, out vec2 id, out float al, out float ac, out float a){
  q += (vec2(vn2(q * 1.3 + 4.), vn2(q * 1.3 + 9.)) - .5) * .14;
  vec2 D = vec2(.949, -.315), P = vec2(.315, .949);
  al = dot(q, D); ac = dot(q, P);
  float r0 = ac / rw + off;
  float rj = r0 + (vn2(vec2(al * 22. / rw * .075, floor(r0) * 3.1 + off)) - .5) * .45;
  float row = floor(rj);
  float Ls = lmin + (lmax - lmin) * h11(row * 1.7 + off * 13.);
  float sg = al / Ls + h11(row * 3.3 + off * 7.) * 3. + off;
  float seg = floor(sg + (vn2(vec2(ac * 40., row)) - .5) * .3);
  id = vec2(row, seg) + off * 101.;
  float u = fract(sg), v = fract(rj);
  float hs = h21(id), hs2 = h21(id + 5.3);
  float bri = vn2(vec2(al * bf * .03, ac * bf)) - .5;            // щетина вдоль мазка
  float tail = smoothstep(.6, 1., u);
  // маска: поперёк — рваный край щетиной, вдоль — торец «сухой кистью» (щетина кончается в разное время)
  float ev = min(v, 1. - v) * 2., eu = min(u, 1. - u) * 2.;
  a = smoothstep(.0, .55, ev + bri * .7) * smoothstep(.0, .35, eu + bri * .9 - .05);
  return D * ((hs - .5) * .11 + bri * (.02 + .05 * tail)) + P * (hs2 - .5) * .035;
}
// мазки в развёртке Меркатора (низ и середина неба) двумя слоями: второй слой сдвинут на полмазка и кладётся поверх
// по маске, поэтому стык первого слоя всегда закрыт телом второго — жёстких границ нет, только край кисти
vec3 brushDirAz(vec3 d, float az);
vec3 brushDir(vec3 d){
  // шов развёртки на азимуте ±π: рядом со швом второй расчёт с азимутом +2π и смешение по маске — шва не видно
  float az = atan(d.z, d.x);
  vec3 r1 = brushDirAz(d, az);
  if (az > -2.54) return r1;
  vec2 i1 = gId, i2 = gId2; float b1 = gAB, l1 = gAl, c1 = gAc;
  vec3 r2 = brushDirAz(d, az + 6.2832);
  float w = smoothstep(-2.54, -3.1, az + (vn2(vec2(az * 6., d.y * 20.)) - .5) * .12);
  if (w < .5) { gId = i1; gId2 = i2; gAB = b1; gAl = l1; gAc = c1; }
  return normalize(mix(r1, r2, w));
}
vec3 brushDirAz(vec3 d, float az){
  float el = asin(clamp(d.y, -1., 1.));
  float elc = clamp(el, -.2, 1.35);
  vec2 q = vec2(az, log(tan(elc * .5 + .7854)));
  vec2 idA, idB; float alA, acA, alB, acB, aA, aB;
  vec2 sA = sGrid(q, .075, .35, .8, 0., 90., idA, alA, acA, aA);
  vec2 sB = sGrid(q, .075, .35, .8, .5, 90., idB, alB, acB, aB);
  vec2 sh = mix(sA, sB, aB);
  gId = idA; gId2 = idB; gAB = aB; gAl = mix(alA, alB, aB); gAc = mix(acA, acB, aB);
  vec2 q2 = q + sh;
  float el2 = 2. * atan(exp(q2.y)) - 1.5708 + (el - elc);
  return vec3(cos(el2) * cos(q2.x), sin(el2), cos(el2) * sin(q2.x));
}
// верх неба: те же два слоя мазков на плоском «потолке» (не сходятся в зените)
vec3 brushDirTop(vec3 d, out vec2 idA, out vec2 idB, out float aB){
  float k = d.y + .32;
  vec2 p = d.xz / k;
  float alA, acA, alB, acB, aA;
  vec2 sA = sGrid(p * .6, .09, .45, .95, .25, 170., idA, alA, acA, aA);
  vec2 sB = sGrid(p * .6, .09, .45, .95, .75, 170., idB, alB, acB, aB);
  vec2 p2 = p + mix(sA, sB, aB) / .6;
  float y2 = d.y + (h21(aB > .5 ? idB : idA) - .5) * .03;
  float k2 = max(y2 + .32, .05);
  return normalize(vec3(p2.x * k2, y2, p2.y * k2));
}
// ступень светлоты мазка (OKLab L), смешанная по маске второго слоя
float brushQ(float L, vec2 idA, vec2 idB, float aB){
  float qs = .03;
  float qa = (floor(L / qs + h21(idA) * .7) + .5) * qs, qb = (floor(L / qs + h21(idB) * .7) + .5) * qs;
  return mix(qa, qb, aB);
}
// переход штриховкой (маркер / перо / тушь): мягкая маска t превращается в линии; чем меньше t, тем тоньше линии.
// x — координата поперёк штриха, kind: 0 маркер (широкий, мягкий край, дрожит), 1 перо (тонкое, чёткое), 2 тушь (нажим рвётся)
float hatchMask(float t, float x, float y, float kind){
  float wob = (vn2(vec2(y * (kind < .5 ? 2. : 5.), floor(x) * 1.7)) - .5) * (kind < .5 ? .5 : .25);
  float tri = abs(fract(x + wob) - .5) * 2.;                 // 0 на линии, 1 между линиями
  float aa = fwidth(x) * 2. + (kind < .5 ? .12 : .02);
  float press = kind > 1.5 ? smoothstep(.25, .6, vn2(vec2(y * 3., floor(x) * 2.3))) : 1.;
  float m = 1. - smoothstep(t * press - aa, t * press + aa, tri);
  return max(m, smoothstep(.85, .97, t));
}
void main(){
  vec3 d0 = normalize(vDir);
  gId = vec2(0.); gId2 = vec2(0.); gU = 0.; gV = 0.; gAl = 0.; gAc = 0.; gAB = 0.;
  vec3 d = d0;
  vec2 tIdA = vec2(0.), tIdB = vec2(0.); float tAB = 0., tw = 0.;
  if (uF3.w > .5 && d0.y > -.08) {
    d = brushDir(d0);
    // стык низа и верха — не линия, а полоса, где верхние мазки ложатся по маске щетины
    float e0 = asin(clamp(d0.y, -1., 1.));
    if (e0 > .62) {
      vec3 dT = brushDirTop(d0, tIdA, tIdB, tAB);
      tw = smoothstep(.66, .95, e0 + (vn2(vec2(atan(d0.z, d0.x) * 5., e0 * 7.)) - .5) * .2 + (tAB - .5) * .08);
      d = normalize(mix(d, dT, tw));
    }
  }
  float el = asin(clamp(d.y, -1., 1.));
  float tB; vec3 c = skyRamp(d, tB);
  vec3 sky0 = c;
  // крупные цветовые поля: обмен соседних цветов градиента
  if (uF0.y > .5) { float n = fb3(d * 1.6 + 11.); c = mixOK(c, mixOK(uMid, uHor, .45), clamp((n - .5) * .9, -.25, .3) + .0); }
  // направленные мазки: лучами от низкого солнца, почти горизонтально у высокого (ref1 −25°, ref4 ~15°)
  vec3 t1, t2; basis(uSun, t1, t2);
  vec2 q = vec2(dot(d0, t1), dot(d0, t2));
  float ang = acos(clamp(dot(d0, uSun), -1., 1.));
  float aS = atan(q.y, q.x);
  float sunEl = asin(clamp(uSun.y, -1., 1.)); float low = 1. - smoothstep(.12, .7, sunEl);
  if (uF0.z > .5) {
    float az = atan(d.z, d.x);
    float sr = vn2(vec2(aS * 9., ang * 1.4 + st(1.) * .0)) * .6 + vn2(vec2(aS * 23., ang * 3.)) * .4;
    float sh = vn3(vec3(d.x * 2., d.y * 34., d.z * 2.)) * .6 + vn3(vec3(d.x * 5., d.y * 70., d.z * 5.)) * .4;
    float s = mix(sh, sr, low * (1. - uNight));
    c *= 1. + (s - .5) * .2;
  }
  // солнце: ядро с рваным краем-брызгами, линейный спад с потерей цвета (ref3), за облаками
  float up = smoothstep(-.1, .02, sunEl) * (1. - uNight);
  float t8 = st(8.);
  float rr = .042 * (1. + (vn2(vec2(aS * 4. / 3.1416 * 6., t8 * 3.)) - .5) * .35);
  vec3 coreC = uGlow * 1.6 + .25;
  c = mixOK(c, mix(coreC, uGlow, .4), pow(1. - smoothstep(rr, .38 + .2 * low, ang), 2.) * (uF5.y > .5 ? .25 : .55) * up);
  float core = 1. - smoothstep(rr, rr + .004, ang);
  float md = acos(clamp(dot(d0, uMoon), -1., 1.));
  float mR = uF5.z > .5 ? .075 : .055;
  float mdisc = 1. - smoothstep(mR, mR + .0025, md);
  if (uF5.y < .5) {
    float spk = step(.985, h21(floor(vec2(aS * 30., ang * 160.)) + floor(t8 * 2.))) * (1. - smoothstep(.05, .16, ang)) * step(rr, ang);
    c = mix(c, coreC, (core + spk * .6) * up);
  } else if (up > .001 && ang < .6) {
    // СОЛНЦЕ ПОЧЕРКУШКАМИ (ref3): 3 полупрозрачных ореола ступенями с рваным краем, ядро с брызгами и шипами,
    // край ядра и ореолов проходит через почеркушки Michael («свет» поперёк края, «дым» по кругу), всё кипит шагом 8 к/с
    vec3 b1, b2; basis(uSun, b1, b2);
    vec2 lp = vec2(dot(d0, b1), dot(d0, b2));
    float r = length(lp), aa = atan(lp.y, lp.x), a01 = aa / 6.2832 + .5;
    float R0 = .042;
    vec3 haloC = mixOK(c, uGlow / max(uExp, .8), .85);
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float Rk = R0 * (fk == 0. ? 2.1 : (fk == 1. ? 3.6 : 5.6));
      float rag = (vn2(vec2(aa * (5. + fk * 2.) + fk * 3.1, t8 * 2. + fk)) - .5) * .28 + (vn2(vec2(aa * 31., fk * 7. + t8)) - .5) * .1;
      float inK = step(r, Rk * (1. + rag));
      // почеркушки «дым» по кругу на краю ореола: часть заходит внутрь, часть наружу
      float sk = loopY(vec2(a01 * (7. + fk * 4.), (r / Rk - .75) / .5), .85, 61. + fk * 9., 8., 1.);
      inK = max(inK * (1. - sk * .7 * step(r, Rk)), sk * step(Rk, r));
      c = mixOK(c, haloC, inK * (.5 - fk * .13) * up);
    }
    // ядро: рваный край, редкие длинные шипы-брызги
    float rag = (vn2(vec2(aa * 9., t8 * 3.)) - .5) * .32 + (vn2(vec2(aa * 43., t8 * 2.)) - .5) * .16;
    float spike = pow(vn2(vec2(aa * 13., floor(t8 * 2.))), 7.) * 1.6;
    float Rc = R0 * (1. + rag + spike);
    float cr = step(r, Rc);
    // почеркушки «свет» поперёк края ядра: штрих выходит лучом наружу и режет край внутрь
    float sl = scribX(0, vec2((r / R0 - .6) / 1.3, a01 * 22.), .75, 71., 8.);
    float sl2 = scribY(3, vec2(a01 * 26., (r / R0 - .7) / .7), .6, 77., 8.);
    cr = max(cr, max(sl, sl2 * .8));
    // брызги-капли вокруг (ref3: края пятнами)
    vec2 pc = vec2(a01 * 70., r / R0 * 5.);
    vec2 ci = floor(pc);
    float drop = step(.9, h21(ci + floor(t8 * 2.) * .7)) * (1. - smoothstep(.22, .34, length(fract(pc) - .5))) * step(1., r / R0) * (1. - smoothstep(1.6, 2.6, r / R0));
    c = mix(c, coreC, clamp(cr + drop * .8, 0., 1.) * up);
    // внутри ядра лёгкие тёплые петли, чтобы диск не был пустым
    float inner = loopc(lp / R0 * 1.3 + 4., .5, 83., 8., 1.) * step(r, Rc * .85);
    c = mix(c, mixOK(coreC, uGlow, .55), inner * .35 * up);
    core = step(r, Rc);
  }
  // луна (ночь): плоский диск, край светлее центра, тонкое тёмное тёплое кольцо (ref5)
  vec3 moonC = mix(vec3(.62, .66, .5), vec3(.86, .88, .62), smoothstep(mR * .55, mR, md));
  if (uF5.z < .5) {
    float mring = smoothstep(mR, mR + .002, md) * (1. - smoothstep(mR + .006, mR + .01, md));
    vec3 cm = mix(c, c * .45 + vec3(.04, .015, .01), mring * uNight);
    c = mix(cm, moonC, mdisc * uNight);
  } else if (uNight > .01 && md < .3) {
    // ЛУНА ПОЧЕРКУШКАМИ (ref5 TMNT): край не кругом — проходит через петли «контура»: петли диска выходят наружу,
    // петли неба режут диск; внутри пятна-кратеры «дымом»; снаружи тёплое тёмное кольцо из петель; шаг 6 к/с
    vec3 b1, b2; basis(uMoon, b1, b2);
    vec2 lp = vec2(dot(d0, b1), dot(d0, b2)) / mR;
    float r = length(lp), aa = atan(lp.y, lp.x), a01 = aa / 6.2832 + .5;
    float t6 = st(6.);
    float Rm = 1. + (vn2(vec2(aa * 6., t6 * 2.)) - .5) * .07 + (vn2(vec2(aa * 29., 3.)) - .5) * .04;
    float disc = step(r, Rm);
    float lo = loopY(vec2(a01 * 8., (r - .74) / .52), .95, 91., 6., -1.);          // петли по краю
    float lo2 = loopY(vec2(a01 * 6. + .5, (r - .78) / .4), .75, 97., 6., 3.);   // второй слой, дым
    float edgeC = 0.;
    disc = r < Rm ? disc * (1. - lo2 * .85) : max(disc, lo * .9);             // край рвётся петлями в обе стороны
    // тёмное тёплое кольцо снаружи из петель (ref5)
    float dr = max(loopY(vec2(a01 * 9. + .3, (r - 1.0) / .55), .45, 103., 6., 0.), loopY(vec2(a01 * 6. + .7, (r - 1.12) / .7), .4, 107., 6., 3.) * .8) * step(Rm, r);
    vec3 warm = c * .5 + vec3(.03, .014, .01);
    float ringB = step(Rm, r) * (1. - smoothstep(Rm + .05, Rm + .14, r));
    c = mix(c, warm, max(ringB * .8, dr * .4) * uNight);
    // кратеры: пятна и каракули чуть темнее и зеленее, край диска светлее
    vec3 mc = moonC;
    float cr = loopc(lp * 1.3 + 7., .55, 111., 6., 1.) + loopc(lp * 1.9 + 2., .4, 117., 6., 2.) * .6;
    float blot = smoothstep(.55, .62, vn2(lp * 2.2 + 5.)) * .6;
    mc = mix(mc, mc * vec3(.68, .76, .6), clamp(max(cr, blot), 0., 1.) * step(r, .9));
    mc = mix(mc, vec3(.9, .9, .66), lo * step(Rm, r) * .5);
    c = mix(c, mc / max(uExp, 1.) * 1.08, clamp(disc, 0., 1.) * uNight);
    mdisc = clamp(disc, 0., 1.);
  }
  // звёзды: редкие, мигают шагами 6 к/с
  if (uF3.x > .5 && uNight > .01) {
    vec3 sp = d0 * 140.; vec3 ci = floor(sp); float hs = h31(ci);
    float star = step(.9965, hs) * (1. - smoothstep(.06, .2, length(fract(sp) - .5))) * smoothstep(.05, .25, d0.y);
    star *= .6 + .4 * step(.4, h31(ci + floor(st(6.) * 6.)));
    c += vec3(.5, .55, .7) * star * uNight * (1. - mdisc);
  }
  // облака: 4 слоя, каждый своим ветром (парралакс по высоте) и своим шагом
  float wspd = uF1.x > .5 ? uWind : 0.;
  float edgeAll = 0., shadeAll = 0., cloudA = 0., botAll = 0., litAll = 0.;
  float rimK = 1. - .65 * uNight;
  if (uF0.w > .5 && d.y > -.02) {
    // L1 высокие перистые мазки (6 к/с)
    float ci1 = cloudF(d, wspd * .004 * st(6.), vec3(1.2, 14., 1.2), 1.7);
    float a1 = smoothstep(.56, .66, ci1) * smoothstep(.35, .7, el) * (1. - smoothstep(1.2, 1.5, el)) * uCover;
    if (uF5.w > .5) {
      // перистые: крупный мягкий мазок — края распадаются на полосы маркера вдоль ветра
      vec2 hc = mat2(.97, .24, -.24, .97) * vec2(atan(d.z, d.x), el);
      float s1 = smoothstep(.5, .66, ci1) * smoothstep(.35, .7, el) * (1. - smoothstep(1.2, 1.5, el)) * uCover;
      a1 = hatchMask(s1, hc.y * 45., hc.x * 4., 0.) * s1 * 1.2;
    }
    c = mixOK(c, mixOK(c, uCLit, .6), clamp(a1, 0., 1.) * .55);
    // L2 дальняя гряда (6 к/с), L3 ближняя (8 к/с, быстрее)
    for (int L = 0; L < 2; L++) {
      float fl = float(L);
      float fps = L == 0 ? 6. : 8.;
      float rot = wspd * (L == 0 ? .006 : .014) * st(fps);
      vec3 sc = L == 0 ? vec3(3.2, 9., 3.2) : vec3(2., 5.5, 2.);
      float seed = L == 0 ? 3.3 : 9.1;
      float elLo = L == 0 ? .03 : .1, elHi = L == 0 ? .38 : .7;
      float band = smoothstep(elLo, elLo + .06, el) * (1. - smoothstep(elHi - .15, elHi, el));
      float th = (L == 0 ? .7 : .73) - uCover * (L == 0 ? .26 : .3);
      float f = cloudF(d, rot, sc, seed) * band;
      // мягкая маска края, ширина по дальности: дальняя гряда шире (маркер), ближняя уже (перо и тушь)
      float wE = L == 0 ? .07 : .045;
      float tE = smoothstep(th - wE, th + .01, f);
      if (tE <= 0.) continue;
      float azH = atan(d.z, d.x) + rot;
      float dens;
      if (uF5.w > .5) {
        // штрихи перехода лежат по ветру, лёгкий наклон; дальняя гряда — маркер крупно, ближняя — перо, у низа — тушь
        vec2 hc = mat2(.97, .24, -.24, .97) * vec2(azH, el);
        dens = L == 0 ? hatchMask(tE, hc.y * 70., hc.x * 6., 0.) : hatchMask(tE, hc.y * 150., hc.x * 9., el < .2 ? 2. : 1.);
        dens = max(dens, smoothstep(th - .004, th + .012, f));
      } else dens = smoothstep(th, th + .015, f);
      if (dens <= .001) continue;
      // свет: плотность к солнцу меньше — освещённая сторона; снизу — тёмный плоский низ и подчёркивание
      float fS = cloudF(normalize(d + uSun * .035), rot, sc, seed) * band;
      float fD = cloudF(normalize(d - vec3(0, .03, 0)), rot, sc, seed) * band;
      float lit = smoothstep(-.01, .03, f - fS);
      float bot = 1. - smoothstep(th - .02, th + .02, fD);   // снизу кончается — нижний край
      vec3 airC = mixOK(uCSh, sky0, L == 0 ? .5 : .3);       // дальний слой тонет в небе
      vec3 cc = mix(airC, mixOK(airC, uCLit, .85), lit * (L == 0 ? .7 : 1.));
      cc = mixOK(cc, mixOK(uCDeep, sky0, .25), bot * .55);
      if (uF3.z > .5) {
        // кайма к солнцу, серебряная обводка у солнца, подчёркивание снизу дополнительным цветом
        float edge = smoothstep(th + .05, th + .015, f) * dens;
        float near = exp(-ang / .45) * up;
        cc = mix(cc, mixOK(cc, uRim, .7) * (1. + .5 * near), edge * lit * (.35 + .6 * near) * rimK);
        cc = mix(cc, uHorGlow, edge * bot * .5 * rimK);
      }
      edgeAll = max(edgeAll, smoothstep(th - .04, th, f) * (1. - smoothstep(th + .01, th + .05, f)));
      shadeAll = max(shadeAll, dens * (1. - lit));
      c = mix(c, cc, dens);
      cloudA = max(cloudA, dens);
      botAll = max(botAll, dens * bot);
      litAll = max(litAll, dens * lit);
    }
    // L4 полоса у горизонта: тёмная гряда с рваным верхом (6 к/с)
    float ht = .025 + .03 * fb3(vec3(atan(d.z, d.x) * 2.5 + wspd * .002 * st(6.), 0., 1.3));
    float hb = (1. - smoothstep(ht, ht + .006, el)) * smoothstep(-.02, .0, el);
    if (uF5.w > .5) {
      // полоса у горизонта — самый дальний план: верх уходит штрихами туши, тоньше кверху
      float tH = (1. - smoothstep(ht - .012, ht + .014, el)) * smoothstep(-.02, .0, el);
      hb = hatchMask(tH, el * 260., atan(d.z, d.x) * 12., 2.) * smoothstep(-.02, .0, el);
    }
    c = mix(c, mixOK(uCSh, sky0, .55), hb * .6 * uCover);
  }
  // края облаков росчерками Michael (строки outline/smoke): клетка привязана к облаку, рисунок меняется у трети клеток шагом 8 к/с
  if (uF1.y > .5 && edgeAll > .01) {
    float az = atan(d.z, d.x) + wspd * .014 * st(8.);
    vec2 uv = vec2(az * 9., el * 22.);
    vec2 cell = floor(uv);
    float hv = h21(cell);
    float boil = step(.66, h21(cell + floor(st(8.) * 8.) * .37));
    float v = floor(fract(hv + boil * .5) * 4.);
    int row = hv > .5 ? 1 : 2;
    float ink = atl(row, v, fract(uv));
    vec3 lc = mixOK(c, uCDeep, .55);
    c = mix(c, lc, ink * edgeAll * .55);
  }
  // штриховка в тени ближних облаков (строка hatch, под 15°)
  if (uF1.z > .5 && shadeAll > .01) {
    float az = atan(d.z, d.x) + wspd * .014 * st(8.);
    vec2 uv = vec2(az * 14., el * 30.);
    uv = mat2(.966, -.259, .259, .966) * uv;
    float v = floor(h21(floor(uv)) * 4.);
    float hk = atl(3, v, fract(uv));
    c = mix(c, c * .78, hk * shadeAll * .45);
  }
  // лучи (ref3): 7 длинных прямых волосных линий иксами, часть двойные, нажим из росчерков света; 22 коротких шипа у ядра; шаг 8 к/с
  if (uF1.w > .5 && up > .01) {
    float ra = 0.;
    for (int k = 0; k < 7; k++) {
      float fk = float(k);
      float th = h11(fk * 7.3 + 1.) * 3.1416 + (h11(fk + floor(t8 * 1.)) - .5) * .02;
      float dl = abs(ang * sin(aS - th));
      float u = ang * cos(aS - th);
      float wd = mix(.0016, .004, h11(fk * 3.1));
      float ln = 1. - smoothstep(wd * .5, wd, dl);
      if (h11(fk * 5.7) > .6) ln = max(ln, 1. - smoothstep(wd * .4, wd * .8, abs(dl - wd * 2.6)));
      float p = prs(mod(fk, 4.), u * .9 + h11(fk));
      ra = max(ra, ln * smoothstep(.05, .3, p) * (1. - smoothstep(.22, .75, ang)) * step(.05, ang));
    }
    float sp = fract(aS / 6.2832 * 22. + h11(floor(aS / 6.2832 * 22.) + floor(t8 * 8.) * .1) * .3);
    float slen = .08 + .12 * h11(floor(aS / 6.2832 * 22.) * 1.7);
    float spike = (1. - smoothstep(.0, .12, abs(sp - .5))) * smoothstep(rr, rr + .01, ang) * (1. - smoothstep(slen, slen + .03, ang));
    float rk = max(ra, spike * .6) * uRays * (1. - cloudA * .8);
    c = mix(c, uGlow * 1.3 + .2, rk * up * .5);
  }
  // кольца-наброски вокруг светила (по образцу одобренной луны): рваные, нажим из росчерков, шаг 6 к/с
  if (uF2.x > .5) {
    vec3 cen = uNight > .5 ? uMoon : uSun;
    float a2 = uNight > .5 ? md : ang;
    vec3 b1, b2; basis(cen, b1, b2);
    float aa = atan(dot(d, b2), dot(d, b1));
    float t6 = st(6.);
    float on = uNight > .5 ? uNight : up;
    float rk = 0.;
    for (int k = 0; k < 3; k++) {
      float fk = float(k);
      float R = (uNight > .5 ? vec3(.085, .12, .16) : vec3(.12, .2, .33))[k];
      float wob = (vn2(vec2(aa * 3. + fk * 5., t6 * 2.)) - .5) * .008;
      float pr = prs(fk, aa / 6.2832 + fk * .31 + floor(t6 * .5) * .13);
      float wd = .0018 + .0022 * pr;
      rk = max(rk, (1. - smoothstep(wd, wd + .0015, abs(a2 - R - wob))) * step(.18, pr) * (k == 2 ? .6 : 1.)) * ((uNight > .5 && k > 0) ? 0. : 1.);
    }
    vec3 ringC = uNight > .5 ? vec3(.5, .55, .45) : mix(uGlow * 1.2, vec3(.9, .4, .55), .35);
    c = mix(c, ringC, rk * on * .45 * (1. - cloudA * .6));
  }
  // свечение горизонта дополнительным цветом, верх рваный (росчерки дыма)
  if (uF2.y > .5) {
    float az = atan(d.z, d.x);
    float top = .045 + .03 * vn2(vec2(az * 6., st(6.) * .5));
    float g = (1. - smoothstep(top * .4, top, el)) * smoothstep(-.03, .0, el);
    float sideK = mix(.5, 1., smoothstep(-.3, .8, dot(normalize(d.xz + 1e-4), normalize(uSun.xz + 1e-4))));
    c = mix(c, mixOK(c, uHorGlow, .8), g * .55 * sideK);
  }
  // растр: точки только в переходах полос и на краях облаков, привязан к направлению неба
  if (uF2.z > .5) {
    float az = atan(d.z, d.x);
    vec2 g = mat2(.5, -.866, .866, .5) * vec2(az * 140., el * 140.);
    float dd = length(fract(g) - .5);
    float m = clamp(fwidth(tB) * 120. + edgeAll * .8, 0., 1.);
    float dot0 = 1. - smoothstep(.18 * m, .18 * m + .06, dd);
    c = mix(c, c * (luma(c) > .25 ? .9 : 1.12), dot0 * m * .6);
  }
  // кисть: ступени светлоты по мазку, цветовой сдвиг мазка, щетина внутри, линии-растр у горизонта (ref Spider-Verse)
  if (uF3.w > .5 && d0.y > -.08) {
    vec3 o = toOK(c);
    float lq = mix(brushQ(o.x, gId, gId2, gAB), brushQ(o.x, tIdA, tIdB, tAB), tw);
    o.x = mix(o.x, lq, .6);
    vec2 chA = mix(vec2(h21(gId + .7), h21(gId + 1.9)), vec2(h21(gId2 + .7), h21(gId2 + 1.9)), gAB);
    o.yz += (chA - .5) * .014;
    float br = vn2(vec2(gAl * 5., gAc * 160.)) * .65 + vn2(vec2(gAl * 2., gAc * 55.)) * .35;
    o.x *= 1. + (br - .5) * .07;
    c = fromOK(o);
    float elx = asin(clamp(d0.y, -1., 1.));
    float lsK = smoothstep(.0, .04, elx) * (1. - smoothstep(.18, .42, elx)) * step(.5, vn2(vec2(gAl * 2.5, gId.x * 1.3)));
    float lf = elx * 320.; float lw = fwidth(lf);
    float lnn = 1. - smoothstep(.14, .14 + lw * 1.2, abs(fract(lf) - .5));
    c = mix(c, mixOK(c, uHorGlow, .55) * 1.08, lnn * lsK * .4 * (1. - uNight * .6) * (1. - cloudA * .7));
  }
  // === почеркушки поверх (ref5 TMNT: петли в облаках, подчёркивание; ref1–4: свободные росчерки и царапины) ===
  float azS = atan(d0.z, d0.x), elS = asin(clamp(d0.y, -1., 1.));
  float azC = azS + wspd * .014 * st(8.);   // клетки облаков едут с ближней грядой
  // петли и каракули внутри облаков: в тени темнее, на свету светлее, тон ±5%
  if (uF4.y > .5 && cloudA > .01) {
    vec2 uv = mat2(.985, -.17, .17, .985) * vec2(azC * 8., elS * 18.);
    float k = max(loopc(uv, .55, 4.2, 8., -1.), scrib(2, uv * 1.37 + 3.1, .35, 8.8, 8.) * .6);
    vec3 dk = mixOK(c, uCDeep, .6), lt = mixOK(c, uCLit, .45);
    c = mix(c, mix(dk, lt, litAll), clamp(k * 1.4, 0., 1.) * cloudA * .8);
  }
  // подчёркивание низа облаков росчерком дополнительного цвета (зелёный ночью, тёплый вечером)
  if (uF5.x > .5 && botAll > .01) {
    vec2 uv = vec2(azC * 16., elS * 40. + .3);
    float k = scrib(1, uv, .5, 12.4, 8.);
    vec3 ul = mixOK(uHorGlow * (1. + uNight * 1.6), uRim, .25);
    c = mix(c, mixOK(c, ul, .75), k * botAll * .7);
  }
  // свободные росчерки по чистому небу: редкие, вдоль мазков (−15°), тон чуть светлее неба
  if (uF4.z > .5 && d0.y > -.02) {
    vec2 uv = mat2(.966, .259, -.259, .966) * vec2(azS * 4.5, elS * 9.);
    float k = scrib(0, uv, .13, 21.7, 6.) + scrib(3, uv * 1.6 + 7.3, .08, 33.1, 6.) * .7;
    float on = (1. - cloudA * .8) * smoothstep(-.02, .05, elS) * (1. - smoothstep(1.1, 1.4, elS));
    vec3 lt = mixOK(c, mixOK(uHorGlow, uCLit, .5) * (1. + uNight), .28);
    c = mix(c, lt, clamp(k * 1.3, 0., 1.) * on * .5);
  }
  // карандашные царапины: короткие тонкие косые штрихи, часть светлее, часть темнее, треть меняется шагом 6 к/с
  if (uF4.w > .5 && d0.y > -.02) {
    vec2 r = mat2(.906, .423, -.423, .906) * vec2(azS * 34., elS * 34.);
    vec2 cell = floor(vec2(r.x * .5, r.y * 6.));
    float h = h21(cell + 55.);
    float boil = floor(st(6.) * 6. * step(.66, h21(cell + 2.)));
    float on = step(.8, fract(h + boil * .37));
    float yy = fract(r.y * 6.) - .5 - (h21(cell + 7.) - .5) * .5;
    float lw = fwidth(r.y * 6.);
    float ln = 1. - smoothstep(lw * .6, lw * 1.6, abs(yy));
    float xx = fract(r.x * .5); float len = .25 + .5 * h21(cell + 9.);
    ln *= step(xx, len) * smoothstep(0., .05, xx) * (1. - smoothstep(len - .08, len, xx));
    float sgn = h21(cell + 13.) > .45 ? 1. : -1.;
    c *= 1. + sgn * ln * on * .07;
  }
  if (uF4.x > .5) c = grain(c, d0);
  // обряд капища: небо кровью
  if (uRit > .001) { float h = clamp(d.y, 0., 1.); vec3 red = mix(vec3(.5, .035, .02), vec3(.09, .006, .005), pow(h, .55)); c = mix(c, c * vec3(.5, .035, .03) + red * .75, uRit); }
  gl_FragColor = vec4(pow(max(c * uExp, 0.), vec3(1. / 2.2)), 1.);
}
`;

export const OBJ_VERT = /* glsl */`
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;

export const OBJ_FRAG = COMMON + /* glsl */`
uniform vec3 uBase;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = uNight > .5 ? uMoon : uSun;
  float lam = dot(N, L);
  float lq = lam < 0. ? 0. : (lam < .45 ? .55 : 1.);   // три ступени
  vec3 amb = mixOK(uCSh, uCDeep, .4) * 1.4;
  vec3 col = uBase * (amb + uSunCol * lq * .55 * (uNight > .5 ? .25 : 1.));
  float dist = length(vW - cameraPosition);
  vec3 dir = normalize(vW - cameraPosition);
  if (uF2.w > .5) {
    // слияние: даль берёт цвет неба в том же направлении, тремя планами (ref1/2/4: даль ≈ небо, середина 50–75%, ближний 25–35%)
    float tB; vec3 sk = skyRamp(normalize(vec3(dir.x, max(dir.y, .02), dir.z)), tB);
    float k = smoothstep(20., 380., dist);
    float j = (vn3(vW * .08) - .5) * .12;
    k = floor((k + j) * 4. + .5) / 4.;
    vec3 plane = mixOK(col, sk * mix(.35, 1., k), k);
    // ближний план к дополнительному лиловому, не к серому
    plane = mixOK(plane, plane * vec3(.92, .85, 1.12), (1. - k) * .25);
    col = plane;
    // кайма цвета неба на краю силуэта со стороны света, рваная
    float fr = pow(1. - clamp(dot(N, V), 0., 1.), 2.5);
    float side = smoothstep(-.1, .5, dot(normalize(N.xz + 1e-4), normalize(L.xz + 1e-4)));
    float br = step(.45, vn3(vW * .9 + floor(st(6.) * 6.) * .0));
    col = mix(col, sk * 1.15, fr * side * br * smoothstep(.1, .5, k) * .8);
  } else {
    col = mix(col, uFog, smoothstep(25., 520., dist));
  }
  if (uF4.x > .5) col = grain(col, vW * .004);
  if (uRit > .001) col = mix(col, col * vec3(.4, .05, .04), uRit * .8);
  gl_FragColor = vec4(pow(max(col * uExp, 0.), vec3(1. / 2.2)), 1.);
}`;

export const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`;
