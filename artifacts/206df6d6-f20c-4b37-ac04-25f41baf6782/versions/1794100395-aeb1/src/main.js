// Превью «Логово Водяного»: та же рисованная сцена, что у логова Лешего (краска, кисть, точки на переходах, цветокор),
// богатырь ходит сам (WASD, камера следит без мыши), при входе в чашу скал ночь уходит в бирюзу и мрак.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { U, MAXL, paint, inkMat, lin } from './toon.js';
import { buildLair, groundAt, WATER_Y, BASIN, segDist, segT, SHOT_CAMS, ISLE, PLAT_Y, FLOOR_Y, pathX, MOON_DIR, H_VOD, H_LESHY, H_HERO, FACE, AP_R, houseLocal, STAIR, LANDING, PORCH_FRONT, SHORE } from './vod.js';
import { buildLife } from './life.js';
import { makeBrushAtlas } from './textures.js';
import { Post } from './post.js';
import { Reflection } from './reflect.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
U.uBrushTex.value = makeBrushAtlas();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 1200);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;
scene.add(sun, sun.target);

// ---------- темы: обычный лес и логово ----------
const v3 = (a) => new THREE.Vector3(...a);
const THEMES = {
  forest: {
    // подход ущельем: лунная ночь в горах, холодно-синяя
    sunDir: v3([-0.3, 0.8, 0.5]).normalize(), sunCol: v3([0.62, 0.7, 0.86]), shadeCol: v3([0.2, 0.25, 0.36]),
    fog: lin('#3a4a5c'), fogDen: 0.005, fogLow: 0.15, low: lin('#506478'), rim: v3([0.7, 0.8, 1.0]),
    skyTop: lin('#0b1424'), skyHor: lin('#3a5068'),
    lo: [0.012, 0.022, 0.04], hi: [0.85, 0.9, 0.98], expo: 1.1, sat: 0.95, bloomTh: 0.8, rays: 0.8,
  },
  lair: {
    // по референсу Michael: сине-серо-голубая ночь, луна сверху сквозь кроны, тени в холодный графит; огни — редкие тёплые акценты
    sunDir: MOON_DIR.clone(), sunCol: v3([0.56, 0.68, 0.8]), shadeCol: v3([0.12, 0.16, 0.22]),
    fog: lin('#1c2a34'), fogDen: 0.0072, fogLow: 0.34, low: lin('#3a5866'), rim: v3([0.62, 0.8, 1.0]),
    skyTop: lin('#060c12'), skyHor: lin('#24384a'),
    lo: [0.008, 0.014, 0.022], hi: [0.82, 0.88, 0.94], expo: 1.25, sat: 0.9, bloomTh: 0.7, rays: 1.0,
  },
};
const TH = { k: 0, target: 0, mode: 'auto' };   // k: 0 лес, 1 логово
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
function applyTheme(k) {
  const A = THEMES.forest, B = THEMES.lair, L = (a, b) => a + (b - a) * k;
  U.uTheme.value = k;
  U.uSunDir.value.copy(A.sunDir).lerp(B.sunDir, k).normalize();
  U.uSunCol.value.copy(A.sunCol).lerp(B.sunCol, k);
  U.uShadeCol.value.copy(A.shadeCol).lerp(B.shadeCol, k);
  U.uFogCol.value.copy(A.fog).lerp(B.fog, k);
  U.uFogDen.value = L(A.fogDen, B.fogDen); U.uFogLow.value = L(A.fogLow, B.fogLow);
  U.uLowCol.value.copy(A.low).lerp(B.low, k);
  U.uRimCol.value.copy(A.rim).lerp(B.rim, k);
  sky.material.uniforms.uTop.value.copy(A.skyTop).lerp(B.skyTop, k);
  sky.material.uniforms.uHor.value.copy(A.skyHor).lerp(B.skyHor, k);
  const pu = post.comp.uniforms;
  pu.uLo.value.set(L(A.lo[0], B.lo[0]), L(A.lo[1], B.lo[1]), L(A.lo[2], B.lo[2]));
  pu.uHi.value.set(L(A.hi[0], B.hi[0]), L(A.hi[1], B.hi[1]), L(A.hi[2], B.hi[2]));
  pu.uExpo.value = L(A.expo, B.expo); pu.uSatTod.value = L(A.sat, B.sat); pu.uRaysTod.value = L(A.rays, B.rays);
  post.bright.uniforms.uTh.value = L(A.bloomTh, B.bloomTh);
}

// ---------- небо: градиент, в логове — круг-оберег и пятна растра ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uTop: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() }, uSunDir: U.uSunDir, uTheme: U.uTheme, uTime: U.uTime },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunDir; uniform float uTheme; uniform float uTime; varying vec3 vD;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h12(i), h12(i+vec2(1,0)), f.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), f.x), f.y); }
    float fb(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(5.3,1.7); a*=0.5; } return s/0.97; }
    void main(){ float h = clamp(vD.y, 0.0, 1.0);
      vec3 c = mix(uHor, uTop, pow(h, 0.6));
      float s = pow(max(dot(vD, normalize(uSunDir)), 0.0), 8.0);
      c += mix(vec3(0.6, 0.75, 1.0), vec3(0.45, 1.0, 0.9), uTheme) * s * 0.25;
      // облака тремя слоями (рисованные, тонами): высокие перистые, кучевые клубы, низкие рваные тучи у горизонта
      if (vD.y > 0.0) {
        vec2 uv = vD.xz / (vD.y + 0.1);
        vec2 sd = normalize(uSunDir.xz + 0.001) * 0.05;
        float fade = smoothstep(0.0, 0.12, vD.y);
        vec3 litC = mix(vec3(0.42, 0.5, 0.62), vec3(0.16, 0.36, 0.34), uTheme), midC = mix(vec3(0.2, 0.26, 0.36), vec3(0.06, 0.17, 0.17), uTheme), shC = mix(vec3(0.08, 0.11, 0.18), vec3(0.02, 0.06, 0.065), uTheme);
        // перистые: вытянутые мазки
        vec2 cu = mat2(0.8, -0.6, 0.6, 0.8) * uv * vec2(0.25, 1.4) + vec2(uTime * 0.004, 0.0);
        float ci = fb(cu * 1.3) * smoothstep(0.2, 0.8, vn(uv * 0.35 + 7.0));
        float cA = smoothstep(0.5, 0.62, ci) * 0.55 * fade;
        c = mix(c, mix(midC, litC, 0.6 + 0.4 * s), cA);
        // кучевые: светлая сторона к солнцу, полутень, тень и тёмная кромка
        vec2 kp = uv * 0.42 + vec2(uTime * 0.008, uTime * 0.003);
        float k0 = fb(kp) - 0.08 * vn(uv * 0.12 + 3.0), k1 = fb(kp - sd);
        float cov = smoothstep(0.53, 0.56, k0);
        float lit = k0 - k1;
        vec3 kc = lit > 0.02 ? litC : (lit > -0.03 ? midC : shC);
        float edge = smoothstep(0.53, 0.535, k0) - smoothstep(0.545, 0.555, k0);
        kc = mix(kc, shC * 0.55, edge * 0.8);
        c = mix(c, kc, cov * fade * mix(0.95, 0.85, uTheme));
        // низкие рваные тучи у горизонта, бегут быстрее
        float lo = fb(vec2(atan(vD.z, vD.x) * 3.0 + uTime * 0.012, vD.y * 9.0));
        float lA = smoothstep(0.48, 0.56, lo) * smoothstep(0.24, 0.04, vD.y) * smoothstep(0.0, 0.03, vD.y);
        c = mix(c, mix(shC, midC, smoothstep(0.56, 0.7, lo)), lA * 0.85);
      }
      // звёзды сквозь разрывы облаков
      vec2 sq = vD.xz / (vD.y + 0.25) * 140.0; vec2 si = floor(sq);
      float st = step(0.985, h12(si)) * smoothstep(0.45, 0.05, length(fract(sq) - 0.5)) * smoothstep(0.05, 0.3, vD.y);
      c += vec3(0.75, 0.9, 1.0) * st * 0.5;
      gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);

// ---------- логово ----------
const world = buildLair(scene);
const life = buildLife(scene, world);
const post = new Post(renderer);
const refl = new Reflection(renderer, WATER_Y); if (world.waterMesh) refl.hide.push(world.waterMesh);

// ---------- вода и трава отвечают идущему: круги от шагов, брызги на бегу, следы в грязи ----------
let ripI = 0;
function addRip(x, z, k) { U.uRip.value[ripI].set(x, z, U.uTime.value, k); ripI = (ripI + 1) % U.uRip.value.length; }
const splash = { n: 90, i: 0, p: [], v: [], life: [] };
splash.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), paint({ base: '#a9bdb0', rim: 1.4, wet: 1, strokeAmt: 0.05, emit: [0.04, 0.06, 0.05] }), splash.n);
for (let i = 0; i < splash.n; i++) { splash.p.push(new THREE.Vector3(0, -99, 0)); splash.v.push(new THREE.Vector3()); splash.life.push(0); }
splash.mesh.frustumCulled = false; scene.add(splash.mesh);
function addSplash(x, z, dirX, dirZ, n) {
  for (let k = 0; k < n; k++) {
    const i = splash.i; splash.i = (i + 1) % splash.n;
    splash.p[i].set(x + (Math.random() - 0.5) * 0.3, WATER_Y + 0.05, z + (Math.random() - 0.5) * 0.3);
    splash.v[i].set(dirX * 1.2 + (Math.random() - 0.5) * 1.6, 1.4 + Math.random() * 1.8, dirZ * 1.2 + (Math.random() - 0.5) * 1.6);
    splash.life[i] = 1;
  }
}
const _m = new THREE.Matrix4();
function updSplash(dt) {
  for (let i = 0; i < splash.n; i++) {
    if (splash.life[i] > 0) { splash.v[i].y -= 9.8 * dt; splash.p[i].addScaledVector(splash.v[i], dt); if (splash.p[i].y < WATER_Y) splash.life[i] = 0; }
    const s = splash.life[i] > 0 ? 1 : 0; _m.makeScale(s, s * 1.6, s).setPosition(splash.p[i]); splash.mesh.setMatrixAt(i, _m);
  }
  splash.mesh.instanceMatrix.needsUpdate = true;
}
const prints = { n: 48, i: 0 };
{ const g = new THREE.CircleGeometry(0.5, 10); g.rotateX(-Math.PI / 2); g.scale(0.11, 1, 0.24);
  const m = paint({ base: '#1e1a10', strokeAmt: 0.1, rim: 0, wet: 1.0 }); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2;
  prints.mesh = new THREE.InstancedMesh(g, m, prints.n); prints.mesh.receiveShadow = true; prints.mesh.frustumCulled = false;
  _m.makeScale(0, 0, 0); for (let i = 0; i < prints.n; i++) prints.mesh.setMatrixAt(i, _m); scene.add(prints.mesh); }
function addPrint(x, y, z, yaw) { _m.makeRotationY(yaw).setPosition(x, y + 0.012, z); prints.mesh.setMatrixAt(prints.i, _m); prints.i = (prints.i + 1) % prints.n; prints.mesh.instanceMatrix.needsUpdate = true; }
// шаги: когда пора, в воде — круг и брызги, на сырой земле — след
function stepFx(who, dt, sp, run) {
  who.stepT = (who.stepT || 0) + dt * sp;
  const wet = WATER_Y - floorAt(who.pos.x, who.pos.z, who.pos.y);
  const inWater = wet > 0.02 && Math.abs(who.pos.y - groundAt(who.pos.x, who.pos.z)) < 0.05;
  if (sp < 0.2) { who.idleT = (who.idleT || 0) + dt; if (inWater && who.idleT > 1.8) { who.idleT = 0; addRip(who.pos.x, who.pos.z, 0.5); } return; }
  const stride = run ? 1.25 : 0.75;
  if (who.stepT < stride) return;
  who.stepT = 0; who.foot = -(who.foot || 1);
  const sx = Math.cos(who.yaw) * 0.12 * who.foot, sz = -Math.sin(who.yaw) * 0.12 * who.foot;
  if (inWater) { addRip(who.pos.x + sx, who.pos.z + sz, run ? 1.0 : 0.75); if (run) addSplash(who.pos.x, who.pos.z, Math.sin(who.yaw), Math.cos(who.yaw), 7); }
  else { const gy = groundAt(who.pos.x, who.pos.z); if (Math.abs(who.pos.y - gy) < 0.05 && gy < 0.2) addPrint(who.pos.x + sx, gy, who.pos.z + sz, who.yaw); }
}
// тот же цветокор, что в лаборатории (утро/день в стиле видео)
post.comp.uniforms.uSat.value = 1.1;

// ---------- герои ----------
const loader = new GLTFLoader();
function loadB64(url) {
  return fetch(url).then((r) => r.text()).then((t) => new Promise((res, rej) => {
    const bin = atob(t.trim()); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    loader.parse(buf.buffer, '', res, rej);
  }));
}
function dress(gltf, height, o = {}) {
  const root = gltf.scene; root.scale.setScalar(height);
  root.traverse((m) => {
    if (!m.isMesh) return;
    const map = m.material.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
    m.material = paint({ base: o.base || '#ffffff', map, moss: o.moss || '#5c7a34', mossAmt: o.mossAmt || 0, wet: o.wet || 0, strokeAmt: 0.06, break: 0.16, rim: 1.0, hero: o.hero || 0.6, litT: o.litT || [1.1, 1.02, 0.92] });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    if (m.isSkinnedMesh) { const ol = new THREE.SkinnedMesh(m.geometry, inkMat); ol.bind(m.skeleton, m.bindMatrix); m.parent.add(ol); ol.position.copy(m.position); ol.quaternion.copy(m.quaternion); ol.scale.copy(m.scale); ol.frustumCulled = false; }
  });
  const mixer = new THREE.AnimationMixer(root); const act = {};
  for (const c of gltf.animations) act[c.name] = mixer.clipAction(c);
  for (const k of ['Idle', 'Walk', 'Run']) if (act[k]) { act[k].play(); act[k].setEffectiveWeight(k === 'Idle' ? 1 : 0); }
  scene.add(root);
  return { root, mixer, act, w: { Idle: 1, Walk: 0, Run: 0 } };
}
function blendAnim(ch, speed, dt, walkV = 1.4, runV = 4.5) {
  const want = speed < 0.15 ? { Idle: 1, Walk: 0, Run: 0 } : speed < (walkV + runV) / 2 ? { Idle: 0, Walk: 1, Run: 0 } : { Idle: 0, Walk: 0, Run: 1 };
  for (const k of ['Idle', 'Walk', 'Run']) {
    if (!ch.act[k]) continue;
    ch.w[k] += (want[k] - ch.w[k]) * Math.min(1, dt * 8);
    ch.act[k].setEffectiveWeight(ch.w[k]);
  }
  if (ch.act.Walk) ch.act.Walk.timeScale = THREE.MathUtils.clamp(speed / walkV, 0.6, 1.6);
  if (ch.act.Run) ch.act.Run.timeScale = THREE.MathUtils.clamp(speed / runV, 0.7, 1.4);
  ch.mixer.update(dt);
}
const hero = { ch: null, pos: new THREE.Vector3(pathX(62), 0, 62), yaw: Math.PI, speed: 0, H: H_HERO };
// Водяной 3,0 м: пока своей модели нет — мерка по фигуре Лешего (перекрашена в тину), только для пропорций
const leshy = { ch: null, pos: new THREE.Vector3(), yaw: 0, speed: 0, H: H_VOD, state: 'home', t: 0 };
const leshyFig = { ch: null };
const ready = Promise.all([
  loadB64('models/bogatyr.b64.txt').then((g) => { hero.ch = dress(g, hero.H, { hero: 1, litT: [1.18, 1.1, 0.98] }); }).catch((e) => console.warn(e)),
  loadB64('models/leshy.b64.txt').then((g) => {
    const g2 = { scene: SkeletonUtils.clone(g.scene), animations: g.animations };
    leshy.ch = dress(g, leshy.H, { hero: 0.5, base: '#6ab4d4', moss: '#2f6a4a', mossAmt: 0.45, wet: 0.8 });
    leshyFig.ch = dress(g2, H_LESHY, { hero: 0.5 }); leshyFig.ch.root.visible = false;
  }).catch((e) => console.warn(e)),
]);
const door = world.door;
leshy.pos.set(door.ix, FLOOR_Y, door.iz); leshy.yaw = door.yaw; let doorK = 0;

// ---------- ходьба: земля, мостки, вода по колено ----------
function floorAt(x, z, curY = 99) {
  // выбираем самый высокий пол не выше «шага» над текущей высотой: можно подняться по лестнице и пройти под галереей
  let y = groundAt(x, z);
  for (const w of world.walks) {
    if (segDist(x, z, w) > w.w * 0.5) continue;
    const wy = (w.ramp ? w.ya + (w.yb - w.ya) * segT(x, z, w) : w.y) + 0.035;
    if (wy <= curY + 0.5 && wy > y) y = wy;
  }
  return y;
}
function collide(p, r) {
  for (const s of world.solids) {
    if ((s.y0 !== undefined && p.y < s.y0) || (s.y1 !== undefined && p.y > s.y1)) continue;
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), R = s.r + r;
    if (d < R && d > 1e-4) { p.x = s.x + dx / d * R; p.z = s.z + dz / d * R; }
  }
  const lim = 160; p.x = THREE.MathUtils.clamp(p.x, -lim, lim); p.z = THREE.MathUtils.clamp(p.z, -lim, lim);
}

// ---------- ракурсы ----------
const C = SHOT_CAMS;
const SHOTS = {
  walk: { name: 'Иду сам (WASD, Shift — бег)', walk: true },
  whole: { name: 'Логово целиком (как концепт)', ...C.whole, fov: 45, theme: 1, hero: [-1.4, 0, 23.0, Math.PI - 0.3] },
  terem: { name: 'Терем Водяного', ...C.terem, fov: 58, theme: 1, hero: [4.1, 0, -1.6, Math.PI + 0.5] },
  scale: { name: 'Пропорции: Водяной, Леший, богатырь', ...C.scale, fov: 50, theme: 1, hero: [6.9, 0, -0.4, Math.PI + 0.3], scale: true },
  bridge: { name: 'Мостик к лестнице', ...C.bridge, fov: 56, theme: 1 },
  stair: { name: 'Лестница и причал', ...C.stair, fov: 54, theme: 1, hero: [-0.6, 0, 3.6, Math.PI - 0.6] },
  roof: { name: 'Кровля: ракушки, звёзды, мох', ...C.roof, fov: 48, theme: 1 },
  falls: { name: 'Водопады в скалах', ...C.falls, fov: 60, theme: 1, hero: [0.2, 0, 8.5, Math.PI + 0.2] },
  idols: { name: 'Идолы и стяги на острове', ...C.idols, fov: 54, theme: 1, hero: [1.2, 0, -2.2, Math.PI - 0.8] },
  bones: { name: 'Кости большой рыбы', ...C.bones, fov: 52, theme: 1 },
  rays: { name: 'Лунный свет сквозь кроны', ...C.rays, fov: 64, theme: 1, hero: [0.4, 0, 21.5, Math.PI - 0.2] },
  top: { name: 'Сверху: размер логова', ...C.top, fov: 46, theme: 1, hero: [1.0, 0, 30, Math.PI] },
  fly: { name: 'Свободный полёт (F)', fly: true, fov: 60 },
};
let shot = 'walk';
const cam = { pos: new THREE.Vector3(3, 4, 100), look: new THREE.Vector3(3, 1.5, 90), yaw: Math.PI, nudge: 0, lift: 0 };
// свободный полёт (как в редакторе): только в этом режиме мышь крутит камеру
const fly = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, speed: 6, drag: false, lx: 0, ly: 0 };
function setShot(k) {
  const prev = shot; shot = k; const s = SHOTS[k];
  document.getElementById('flyHelp').hidden = !s.fly; document.getElementById('flyBtn').classList.toggle('on', !!s.fly);
  if (s.fly) {
    if (prev !== 'fly') { fly.pos.copy(camera.position); const d = new THREE.Vector3(); camera.getWorldDirection(d); fly.yaw = Math.atan2(d.x, d.z); fly.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)); }
    camera.fov = s.fov; camera.updateProjectionMatrix();
    for (const b of document.getElementById('shots').children) b.classList.toggle('on', b.dataset.k === k);
    return;
  }
  if (!s.walk) {
    cam.pos.set(...s.pos); cam.look.set(...s.look); camera.fov = s.fov;
    if (s.hero) { hero.pos.set(s.hero[0], 0, s.hero[2]); hero.pos.y = floorAt(s.hero[0], s.hero[2], 9); hero.yaw = s.hero[3]; hero.speed = 0; }
    scaleLineup(!!s.scale);
  } else camera.fov = 52;
  camera.updateProjectionMatrix();
  if (s.theme !== undefined && TH.mode === 'auto') TH.forced = s.theme === 'auto' ? null : s.theme; else TH.forced = null;
  if (s.walk) TH.forced = null;
  for (const b of document.getElementById('shots').children) b.classList.toggle('on', b.dataset.k === k);
}

// ---------- ввод (без мыши: камера следит сама) ----------
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  const ks = Object.keys(SHOTS);
  if (e.key >= '1' && e.key <= '9') setShot(ks[+e.key - 1]); if (e.key === '0') setShot(ks[9]); if (e.key === '-') setShot(ks[10]); if (e.key === '=') setShot(ks[11]);
  if (e.code === 'KeyF') { setShot(shot === 'fly' ? 'walk' : 'fly'); return; }
  if (e.code === 'Escape' && shot === 'fly') { setShot('walk'); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && shot !== 'walk' && shot !== 'fly') setShot('walk');
  if (e.code === 'KeyV') leshyOut();
  if (e.code === 'ArrowLeft') cam.nudge -= 0.12; if (e.code === 'ArrowRight') cam.nudge += 0.12;
  if (e.code === 'ArrowUp') cam.lift += 0.6; if (e.code === 'ArrowDown') cam.lift -= 0.6;
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
{ const cv = renderer.domElement;
  cv.addEventListener('contextmenu', (e) => { if (shot === 'fly') e.preventDefault(); });
  cv.addEventListener('pointerdown', (e) => { if (shot !== 'fly') return; fly.drag = true; fly.lx = e.clientX; fly.ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!fly.drag || shot !== 'fly') return; fly.yaw -= (e.clientX - fly.lx) * 0.004; fly.pitch = THREE.MathUtils.clamp(fly.pitch - (e.clientY - fly.ly) * 0.004, -1.5, 1.5); fly.lx = e.clientX; fly.ly = e.clientY; });
  addEventListener('pointerup', () => { fly.drag = false; });
  cv.addEventListener('wheel', (e) => { if (shot !== 'fly') return; e.preventDefault(); fly.speed = THREE.MathUtils.clamp(fly.speed * (e.deltaY > 0 ? 0.85 : 1.18), 1, 60); }, { passive: false }); }
// пропорции: Водяной, Леший и богатырь рядом под входом-шалашиком у двери 3,3 м
function scaleLineup(on) {
  if (!leshy.ch || !leshyFig.ch) return;
  if (on) {
    const a = houseLocal(-0.75, AP_R + 0.9), b = houseLocal(0.45, AP_R + 1.0), c = houseLocal(1.2, AP_R + 1.1);
    leshy.state = 'show'; leshy.pos.set(a[0], FLOOR_Y + 0.02, a[1]); leshy.yaw = FACE; leshy.speed = 0;
    leshyFig.ch.root.visible = true; leshyFig.ch.root.position.set(b[0], FLOOR_Y + 0.02, b[1]); leshyFig.ch.root.rotation.y = FACE;
    hero.pos.set(c[0], FLOOR_Y + 0.02, c[1]); hero.yaw = FACE; hero.speed = 0;
  } else { leshyFig.ch.root.visible = false; if (leshy.state === 'show') { leshy.state = 'home'; leshy.pos.set(door.ix, FLOOR_Y, door.iz); } }
}
function leshyOut() { if (leshy.state === 'show') scaleLineup(false); if (leshy.state === 'home' || leshy.state === 'back') { leshy.state = 'out'; leshy.t = 0; } }

// ---------- Леший: выходит из дуба, идёт по мосткам к герою, стоит, возвращается ----------
const LESHY_PATH = [[door.ix, door.iz], [door.x, door.z]];
function updateLeshy(dt) {
  if (!leshy.ch) return;
  leshy.t += dt;
  let target = null, sp = 0;
  if (leshy.state === 'out') {
    const i = Math.min(LESHY_PATH.length - 1, leshy.seg || 1); const p = LESHY_PATH[i];
    target = p; sp = 1.5;
    if (Math.hypot(leshy.pos.x - p[0], leshy.pos.z - p[1]) < 0.6) { leshy.seg = (leshy.seg || 1) + 1; if (leshy.seg >= LESHY_PATH.length) { leshy.state = 'stand'; leshy.t = 0; } }
  } else if (leshy.state === 'stand') {
    const d = hero.pos.clone().sub(leshy.pos); leshy.yaw = turn(leshy.yaw, Math.atan2(d.x, d.z), dt * 2);
    if (leshy.t > 12) { leshy.state = 'back'; leshy.seg = LESHY_PATH.length - 2; }
  } else if (leshy.state === 'back') {
    const p = LESHY_PATH[Math.max(0, leshy.seg)]; target = p; sp = 1.3;
    if (Math.hypot(leshy.pos.x - p[0], leshy.pos.z - p[1]) < 0.6) { leshy.seg--; if (leshy.seg < 0) { leshy.state = 'home'; leshy.yaw = door.yaw; leshy.seg = 1; leshy.pos.set(door.ix, FLOOR_Y, door.iz); } }
  }
  if (target) {
    const dx = target[0] - leshy.pos.x, dz = target[1] - leshy.pos.z;
    leshy.yaw = turn(leshy.yaw, Math.atan2(dx, dz), dt * 3);
    leshy.speed += (sp - leshy.speed) * Math.min(1, dt * 3);
  } else leshy.speed += (0 - leshy.speed) * Math.min(1, dt * 4);
  leshy.pos.x += Math.sin(leshy.yaw) * leshy.speed * dt; leshy.pos.z += Math.cos(leshy.yaw) * leshy.speed * dt;
  leshy.pos.y = FLOOR_Y + 0.02;
  // створки двери дуба: открываются, когда Леший рядом с порогом (выходит или возвращается), потом закрываются
  const nearDoor = Math.hypot(leshy.pos.x - door.ix, leshy.pos.z - door.iz) < 2.6;
  const want = (leshy.state === 'out' || leshy.state === 'back') && nearDoor ? 1 : 0;
  doorK += (want - doorK) * Math.min(1, dt * 2.0);
  door.g.rotation.y = door.rot + doorK * 1.5;
  leshy.ch.root.visible = leshy.state !== 'home' || doorK > 0.05;
  leshy.ch.root.position.copy(leshy.pos); leshy.ch.root.rotation.y = leshy.yaw;
  blendAnim(leshy.ch, leshy.speed, dt, 1.3, 4);
  if (leshyFig.ch && leshyFig.ch.root.visible) blendAnim(leshyFig.ch, 0, dt);
  if (leshy.ch.root.visible) { stepFx(leshy, dt, leshy.speed * 0.8, false); U.uPush.value[1].set(leshy.pos.x, leshy.pos.y, leshy.pos.z, 1.6); } else U.uPush.value[1].set(0, -99, 0, 1);
}
function turn(a, b, k) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * Math.min(1, k); }

// ---------- герой ----------
function updateHero(dt) {
  if (!hero.ch) return;
  let mx = 0, mz = 0;
  if (shot === 'walk') {
    if (keys.KeyW) mz += 1; if (keys.KeyS) mz -= 1; if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
  }
  const run = keys.ShiftLeft || keys.ShiftRight;
  let want = 0;
  if (mx || mz) {
    // направление относительно камеры
    const f = new THREE.Vector3().subVectors(cam.look, cam.pos); f.y = 0; f.normalize();
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const d = f.multiplyScalar(mz).add(r.multiplyScalar(mx)).normalize();
    hero.yaw = turn(hero.yaw, Math.atan2(d.x, d.z), dt * 10);
    want = run ? 4.6 : 1.6;
  }
  hero.speed += (want - hero.speed) * Math.min(1, dt * 6);
  const wet = Math.max(0, WATER_Y - floorAt(hero.pos.x, hero.pos.z, hero.pos.y));   // в воде медленнее
  const sp = hero.speed * (wet > 0.05 ? 0.6 : 1);
  hero.pos.x += Math.sin(hero.yaw) * sp * dt; hero.pos.z += Math.cos(hero.yaw) * sp * dt;
  collide(hero.pos, 0.35);
  const fy = floorAt(hero.pos.x, hero.pos.z, hero.pos.y);
  hero.pos.y = fy < hero.pos.y - 0.6 ? hero.pos.y - Math.min(hero.pos.y - fy, dt * 9) : fy;   // с края падает, не телепортом
  hero.ch.root.position.copy(hero.pos); hero.ch.root.rotation.y = hero.yaw;
  blendAnim(hero.ch, sp, dt);
  stepFx(hero, dt, sp, run && sp > 2.5);
  U.uPush.value[0].set(hero.pos.x, hero.pos.y, hero.pos.z, 1.05);
}

// ---------- камера: за героем, ближе к логову — разворачивается на дуб ----------
function updateCamera(dt, t) {
  const s = SHOTS[shot];
  if (s.fly) {
    const f = new THREE.Vector3(Math.sin(fly.yaw) * Math.cos(fly.pitch), Math.sin(fly.pitch), Math.cos(fly.yaw) * Math.cos(fly.pitch)), r = new THREE.Vector3(-Math.cos(fly.yaw), 0, Math.sin(fly.yaw));
    const v = new THREE.Vector3(); if (keys.KeyW) v.add(f); if (keys.KeyS) v.sub(f); if (keys.KeyD) v.sub(r); if (keys.KeyA) v.add(r); if (keys.KeyE || keys.Space) v.y += 1; if (keys.KeyQ || keys.KeyC) v.y -= 1;
    if (v.lengthSq()) fly.pos.addScaledVector(v.normalize(), fly.speed * (keys.ShiftLeft || keys.ShiftRight ? 3.5 : 1) * dt);
    fly.pos.y = Math.max(fly.pos.y, Math.max(groundAt(fly.pos.x, fly.pos.z), WATER_Y) + 0.3);
    camera.position.copy(fly.pos); camera.lookAt(fly.pos.clone().add(f)); cam.pos.copy(fly.pos); cam.look.copy(fly.pos).add(f);
    return;
  }
  let wantPos, wantLook;
  if (s.walk) {
    const behind = hero.speed > 0.2 ? hero.yaw : cam.yaw;
    cam.yaw = turn(cam.yaw, behind + cam.nudge, dt * (hero.speed > 0.2 ? 1.6 : 0.5));
    const toTree = Math.hypot(hero.pos.x - ISLE.x, hero.pos.z - ISLE.z);
    const far = THREE.MathUtils.clamp((toTree - 12) / 30, 0, 1);
    const dist = 6.5 + far * 1.5, up = 2.6 + cam.lift;
    wantPos = new THREE.Vector3(hero.pos.x - Math.sin(cam.yaw) * dist, hero.pos.y + up, hero.pos.z - Math.cos(cam.yaw) * dist);
    wantLook = new THREE.Vector3(hero.pos.x + Math.sin(cam.yaw) * 4, hero.pos.y + 1.6 + (1 - far) * 2.5, hero.pos.z + Math.cos(cam.yaw) * 4);
    const gy = groundAt(wantPos.x, wantPos.z) + 0.6; if (wantPos.y < gy) wantPos.y = gy;
    cam.pos.lerp(wantPos, 1 - Math.exp(-dt * 4)); cam.look.lerp(wantLook, 1 - Math.exp(-dt * 5));
  }
  const o = cam.pos.clone().sub(cam.look).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.walk ? 0 : cam.nudge).add(cam.look);
  camera.position.set(o.x + Math.sin(t * 0.31) * 0.05, o.y + (s.walk ? 0 : cam.lift) + Math.sin(t * 0.43) * 0.03, o.z);
  camera.lookAt(cam.look);
}

// ---------- огни: ближайшие к камере ----------
const lightList = world.lights;
function updateLights(t) {
  const c = camera.position;
  const arr = lightList.map((l) => [l.pos.distanceToSquared(c) * (l.pri ? (l.pri >= 1 ? 0.12 : 0.4) : 1), l]).sort((a, b) => a[0] - b[0]).slice(0, MAXL);
  arr.forEach(([, l], i) => {
    const sd = l.seed ?? (l.seed = l.pos.x * 1.7 + l.pos.z); const f = 1 - l.flick * 0.22 * (0.5 + 0.5 * Math.sin(t * 11 + sd * 3.0) * Math.sin(t * 4.7 + sd)) - l.flick * 0.06 * Math.sin(t * 23 + sd * 5.0);
    // окна логова светят сильнее, когда стемнело (в логове)
    const k = (0.7 + 0.75 * U.uTheme.value) * f;
    U.uL.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.r);
    U.uLC.value[i].set(l.col[0] * k, l.col[1] * k, l.col[2] * k);
  });
  U.uLN.value = arr.length;
}

// ---------- подвесы качаются: фонари, колокольцы, стяги, верёвки ----------
const _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _ss = (e0, e1, x) => { const q = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return q * q * (3 - 2 * q); };
function updSwing(t) {
  const sws = world.anim.swing || [], hp = world.anim.haloPos; let dirty = false;
  for (const s of sws) {
    const a = s.amp * (Math.sin(t * s.w + s.ph) + 0.35 * Math.sin(t * s.w * 2.3 + s.ph * 1.7));
    if (s.axis) s.g.quaternion.setFromAxisAngle(s.axis, a);
    else s.g.rotation.set(a, 0, s.amp * 0.7 * Math.sin(t * s.w * 0.83 + s.ph + 1));
    s.g.position.copy(s.base);
    if (s.follow) {   // шарнир на ветви: то же смещение, что у кроны в шейдере (режим «по высоте в мире»)
      const { sway, m } = s.follow, b = s.base; let sh = _ss(m.y, m.y + m.z, b.y); sh = sh * sh * 1.6;
      const gust = 0.55 + 0.45 * Math.sin(t * 0.23 + b.x * 0.05) * Math.sin(t * 0.31 - b.z * 0.04);
      const sw = Math.sin(t * 1.1 + b.x * 0.4 + b.z * 0.3) * sway * (0.4 + 0.6 * Math.sin(t * 0.37 + b.y * 0.3)) * gust, sw2 = Math.sin(t * 2.7 + b.y * 1.3 + b.x) * sway * 0.25;
      s.g.position.x += (sw + sw2) * 0.06 * sh; s.g.position.z += (sw * 0.5 - sw2) * 0.05 * sh;
    }
    if (s.halos && hp) for (const h of s.halos) { _sv.copy(h.d).applyQuaternion(s.g.quaternion).add(s.g.position); hp.setXYZ(h.i, _sv.x, _sv.y, _sv.z); dirty = true; }
    if (s.lights) for (const l of s.lights) l.l.pos.copy(l.d).applyQuaternion(s.g.quaternion).add(s.g.position);
  }
  if (dirty) hp.needsUpdate = true;
}
// ---------- звук: шум водопадов (тише издали), плеск и бульканье у воды; всё синтезируется, без файлов ----------
const sound = (() => {
  let ac = null, on = false; const falls = [];
  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const n = ac.sampleRate * 3, buf = ac.createBuffer(2, n, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = (b + 0.04 * w) / 1.04; d[i] = w * 0.35 + b * 3.0; } }
    const master = ac.createGain(); master.gain.value = 0.0; master.connect(ac.destination);
    for (const f of world.FALLS) {
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = 0.8 + Math.random() * 0.3;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; const g = ac.createGain(); g.gain.value = 0; const pan = ac.createStereoPanner();
      src.connect(lp).connect(g).connect(pan).connect(master); src.start(Math.random() * 0.5);
      falls.push({ f, g, lp, pan });
    }
    // мелкий плеск у берега: тихий фон
    { const src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.playbackRate.value = 0.5; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.8; const g = ac.createGain(); g.gain.value = 0.05;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 0.035; lfo.connect(lg).connect(g.gain); lfo.start(); src.connect(bp).connect(g).connect(master); src.start(); }
    return master;
  }
  let master = null;
  return {
    toggle() { if (!ac) master = init(); on = !on; if (on) ac.resume(); master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.3); return on; },
    update() { if (!on || !ac) return; const c = camera.position, right = new THREE.Vector3(); camera.getWorldDirection(right); right.cross(camera.up).normalize();
      for (const s of falls) { const b = s.f.bot, d = Math.hypot(c.x - b.x, c.y - 1, c.z - b.z), k = Math.min(1, 9 / (d + 3)) * (0.5 + s.f.w * 0.08);
        s.g.gain.setTargetAtTime(k * k * 0.9, ac.currentTime, 0.2); s.lp.frequency.setTargetAtTime(600 + 2400 * k, ac.currentTime, 0.2);
        const dir = new THREE.Vector3(b.x - c.x, 0, b.z - c.z).normalize(); s.pan.pan.setTargetAtTime(THREE.MathUtils.clamp(dir.dot(right), -1, 1) * 0.8, ac.currentTime, 0.2); } },
  };
})();

// ---------- свет в окнах: живое пламя внутри, изредка проходит тень ----------
function updWindows(t) {
  const w = world.anim.win; if (!w) return;
  const fl = 1 + 0.12 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1) + 0.06 * Math.sin(t * 17.0);
  const ph = (t % 9.5) / 9.5, pass = ph > 0.82 ? Math.sin((ph - 0.82) / 0.18 * Math.PI) : 0;   // кто-то проходит мимо окна
  const k = fl * (1 - 0.5 * pass);
  w.win.uniforms.uK.value = w.k0 * k; w.inr.uniforms.uK.value = w.k1 * (fl * (1 - 0.3 * pass));
  if (w.light) w.light.r = w.r0 * (0.9 + 0.1 * k);
}

// ---------- кадр ----------
const ui = { stage: document.getElementById('stage'), fps: document.getElementById('fps'), theme: document.getElementById('themeNow') };
let W = 1, H = 1, pr = 1;
function layout() {
  W = ui.stage.clientWidth; H = ui.stage.clientHeight;
  pr = Math.min(devicePixelRatio || 1, qual === 2 ? 1.5 : qual === 1 ? 1 : 0.75);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix(); post.setSize(W, H, pr); refl.setSize(W * pr, H * pr); refl.on = qual > 0;
}
let qual = 2, lowT = 0;
addEventListener('resize', layout);

const clock = new THREE.Clock();
let t = 0, fa = 0, fn = 0;
const sunFar = new THREE.Vector3();
const MANUAL = new URLSearchParams(location.search).has('manual');
function frame(fixed) {
  const dt = fixed !== undefined ? fixed : Math.min(clock.getDelta(), 0.05); t += dt; U.uTime.value = t;
  updateHero(dt); updateLeshy(dt);
  // тема: по месту богатыря (вход в логово — граница болота и ельника)
  const dC = Math.hypot((hero.pos.x - BASIN.x) / BASIN.rx, (hero.pos.z - BASIN.z) / BASIN.rz);
  const ssg = (e0, e1, x) => { const q = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return q * q * (3 - 2 * q); };
  let want = ssg(1.6, 1.15, dC);
  if (TH.mode === 'forest') want = 0; else if (TH.mode === 'lair') want = 1; else if (TH.forced !== null && TH.forced !== undefined) want = TH.forced;
  TH.k += (want - TH.k) * Math.min(1, dt * 0.9);
  applyTheme(TH.k);
  ui.theme.textContent = TH.k > 0.5 ? 'логово' : 'ущелье';
  updateCamera(dt, t);
  updateLights(t);
  for (const m of world.mists) { if (m.userData.rise !== undefined) { const k = ((t * 0.25 + m.userData.rise * 0.1) % 1); m.position.y = m.userData.rise + k * 1.2; m.material.uniforms.uA.value = 0.16 * Math.sin(k * Math.PI); m.position.x += Math.sin(t * 0.3 + m.userData.rise) * 0.004; } m.lookAt(camera.position.x, m.position.y, camera.position.z); }
  life.update(t, dt, pr);
  updSwing(t);
  sound.update();
  if (world.anim.spray) world.anim.spray.uniforms.uPr.value = pr;
  updWindows(t);
  (world.anim.flames || []).forEach((f, i) => { const k = 1 + 0.18 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 5.3 + i); f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); f.rotation.y = t * 0.7 + i; });
  // солнце и тень следуют за камерой
  const fc = cam.look; sun.target.position.set(fc.x, 0, fc.z); sun.position.copy(sun.target.position).addScaledVector(U.uSunDir.value, 120);
  // лучи: в лесу от солнца, в логове — от зелёного столба над дубом
  sunFar.copy(U.uSunDir.value).multiplyScalar(800).lerp(new THREE.Vector3(-6, 60, -60), TH.k);
  updSplash(dt);
  refl.render(scene, camera, MANUAL);
  post.render(scene, camera, sunFar, t);
  fa += dt; fn++;
  if (fa > 1) { const f = fn / fa; ui.fps.textContent = Math.round(f) + ' к/с'; if (!MANUAL) { lowT = f < 35 ? lowT + fa : 0; if (lowT > 3 && qual > 0) { qual--; layout(); lowT = -3; } } fa = 0; fn = 0; }
  if (!MANUAL) requestAnimationFrame(() => frame());
}

// ---------- панель ----------
const shotsEl = document.getElementById('shots');
for (const [k, s] of Object.entries(SHOTS)) { const b = document.createElement('button'); b.textContent = s.name; b.dataset.k = k; b.onclick = () => setShot(k); shotsEl.appendChild(b); }
for (const b of document.querySelectorAll('#themeSeg button')) b.onclick = () => {
  TH.mode = b.dataset.k; for (const x of document.querySelectorAll('#themeSeg button')) x.classList.toggle('on', x === b);
};
document.getElementById('leshyBtn').onclick = leshyOut;
document.getElementById('flyBtn').onclick = () => setShot(shot === 'fly' ? 'walk' : 'fly');
document.getElementById('soundBtn').onclick = () => { const on = sound.toggle(); document.getElementById('soundBtn').textContent = 'Звук воды: ' + (on ? 'вкл' : 'выкл'); };
document.getElementById('hide').onclick = () => { const p = document.getElementById('panel'); p.hidden = !p.hidden; };

layout();
setShot(new URLSearchParams(location.search).get('shot') || 'walk');
applyTheme(0);
ready.then(() => { document.getElementById('loading').hidden = true; });
if (!MANUAL) frame();
window.__lair = { groundAt, scaleLineup, leshyFig, door, mod: { STAIR, LANDING, houseLocal, AP_R, PORCH_FRONT, SHORE }, ripDbg: () => U.uRip.value.map((v) => v.toArray().map((x) => +x.toFixed(2))), SHOTS, setShot, hero, leshy, TH, world, post, life, floorAt, keys, step: (n = 1, d = 1 / 30) => { for (let i = 0; i < n; i++) frame(d); }, ready, leshyOut, renderer, camera, scene };
