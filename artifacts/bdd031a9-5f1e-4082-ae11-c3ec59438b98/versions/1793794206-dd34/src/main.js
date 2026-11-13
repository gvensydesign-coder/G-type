// Превью «Логово Лешего»: сцена в стиле из видео (краска, кисть, точки на переходах, цветокор material-lab),
// богатырь ходит сам (WASD, камера следит без мыши), при входе в логово свет и воздух уходят в зелень и мрак.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { U, MAXL, paint, inkMat, lin } from './toon.js';
import { buildLair, groundAt, WATER_Y, BASIN, segDist, segT, SHOT_CAMS } from './lair.js';
import { buildLife } from './life.js';
import { makeBrushAtlas } from './textures.js';
import { Post } from './post.js';

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
    sunDir: v3([-0.5, 0.62, 0.6]).normalize(), sunCol: v3([1.06, 1.0, 0.88]), shadeCol: v3([0.56, 0.64, 0.78]),
    fog: lin('#c3cdb6'), fogDen: 0.0032, fogLow: 0.0, low: lin('#b8c7b0'), rim: v3([1.0, 0.85, 0.6]),
    skyTop: lin('#b9c8c4'), skyHor: lin('#f3dcb8'),
    lo: [0.018, 0.05, 0.055], hi: [0.975, 0.98, 0.94], expo: 0.76, sat: 1.0, bloomTh: 1.0, rays: 1.0,
  },
  lair: {
    // как на концепте: всё в зелени, свет сверху — мертвенно-зелёный столб, тени в чёрную бирюзу, огни тёплые
    sunDir: v3([0.25, 0.85, -0.45]).normalize(), sunCol: v3([0.62, 0.8, 0.52]), shadeCol: v3([0.13, 0.22, 0.21]),
    fog: lin('#183a30'), fogDen: 0.0085, fogLow: 0.42, low: lin('#3a6a4a'), rim: v3([0.6, 1.0, 0.65]),
    skyTop: lin('#06140f'), skyHor: lin('#23503a'),
    lo: [0.006, 0.02, 0.018], hi: [0.72, 0.92, 0.62], expo: 1.2, sat: 1.05, bloomTh: 0.7, rays: 1.1,
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
      c += mix(vec3(1.0, 0.9, 0.7), vec3(0.4, 1.0, 0.6), uTheme) * s * 0.35;
      // облака тремя слоями (рисованные, тонами): высокие перистые, кучевые клубы, низкие рваные тучи у горизонта
      if (vD.y > 0.0) {
        vec2 uv = vD.xz / (vD.y + 0.1);
        vec2 sd = normalize(uSunDir.xz + 0.001) * 0.05;
        float fade = smoothstep(0.0, 0.12, vD.y);
        vec3 litC = mix(vec3(1.0, 0.95, 0.86), vec3(0.17, 0.36, 0.26), uTheme), midC = mix(vec3(0.78, 0.8, 0.84), vec3(0.07, 0.18, 0.14), uTheme), shC = mix(vec3(0.55, 0.6, 0.7), vec3(0.025, 0.07, 0.06), uTheme);
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
      // круг-оберег на небе (как на концепте): кольца и спицы, тонкие, бледно-зелёные
      vec3 cdir = normalize(vec3(0.45, 0.62, -0.65));
      vec3 ax = normalize(cross(cdir, vec3(0.0, 1.0, 0.0))), ay = cross(ax, cdir);
      vec2 q = vec2(dot(vD, ax), dot(vD, ay)) / max(dot(vD, cdir), 0.01);
      float r = length(q), a = atan(q.y, q.x);
      float ring = smoothstep(0.004, 0.0, abs(r - 0.33)) + smoothstep(0.003, 0.0, abs(r - 0.25)) + smoothstep(0.003, 0.0, abs(r - 0.12));
      float spoke = smoothstep(0.012, 0.0, abs(fract(a / 6.2832 * 8.0) - 0.5) * r * 0.8) * step(0.12, r) * step(r, 0.33);
      float tri = smoothstep(0.005, 0.0, abs(r * cos(mod(a, 2.094) - 1.047) - 0.165)) * step(r, 0.34);
      float sig = clamp(ring + spoke * 0.6 + tri * 0.8, 0.0, 1.0) * step(0.0, dot(vD, cdir));
      c += vec3(0.45, 0.85, 0.6) * sig * 0.12 * uTheme;
      gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);

// ---------- логово ----------
const world = buildLair(scene);
const life = buildLife(scene, world);
const post = new Post(renderer);
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
    m.material = paint({ base: '#ffffff', map, strokeAmt: 0.06, break: 0.16, rim: 1.0, hero: o.hero || 0.6, litT: o.litT || [1.1, 1.02, 0.92] });
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
const hero = { ch: null, pos: new THREE.Vector3(3, 0, 92), yaw: Math.PI, speed: 0, H: 1.53 };
const leshy = { ch: null, pos: new THREE.Vector3(), yaw: 0, speed: 0, H: 2.5, state: 'home', t: 0 };
const ready = Promise.all([
  loadB64('models/bogatyr.b64.txt').then((g) => { hero.ch = dress(g, hero.H, { hero: 1, litT: [1.18, 1.1, 0.98] }); }).catch((e) => console.warn(e)),
  loadB64('models/leshy.b64.txt').then((g) => { leshy.ch = dress(g, leshy.H, { hero: 0.5 }); }).catch((e) => console.warn(e)),
]);
const door = world.anim.doorLeshy;
leshy.pos.set(door.x, 0, door.z); leshy.yaw = door.yaw;

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
  path: { name: 'Тропа в логово', ...C.path, fov: 48, theme: 'auto', hero: [2.5, 0, 50, Math.PI] },
  whole: { name: 'Логово целиком (как концепт)', ...C.whole, fov: 60, theme: 1, hero: [2.6, 0, 30.5, Math.PI + 0.3] },
  tree: { name: 'Дуб-терем', ...C.tree, fov: 60, theme: 1, hero: [-4.2, 0, -9, Math.PI + 0.2] },
  hall: { name: 'Хоромы и костёр', ...C.hall, fov: 54, theme: 1, hero: [-14, 0, 3, -1.6] },
  idol: { name: 'Идол с черепом', ...C.idol, fov: 46, theme: 1, hero: [12.6, 0, 31.2, -2.4] },
  hut: { name: 'Изба на сваях', ...C.hut, fov: 54, theme: 1, hero: [12.6, 0, 11.6, 1.4] },
  walks: { name: 'Мостки и протоки', ...C.walks, fov: 52, theme: 1, hero: [16, 0, -4, -1.6] },
  water: { name: 'Болото бурлит и светится', ...C.water, fov: 56, theme: 1, hero: [-1.4, 0, 9, Math.PI + 0.3] },
  top: { name: 'Сверху: размер логова', ...C.top, fov: 46, theme: 0.35, hero: [2.5, 0, 36, Math.PI] },
  edge: { name: 'Граница: лес и логово', ...C.edge, fov: 55, theme: 'auto', hero: [2.6, 0, 46, Math.PI] },
};
let shot = 'walk';
const cam = { pos: new THREE.Vector3(3, 4, 100), look: new THREE.Vector3(3, 1.5, 90), yaw: Math.PI, nudge: 0, lift: 0 };
function setShot(k) {
  shot = k; const s = SHOTS[k];
  if (!s.walk) {
    cam.pos.set(...s.pos); cam.look.set(...s.look); camera.fov = s.fov;
    if (s.hero) { hero.pos.set(s.hero[0], 0, s.hero[2]); hero.pos.y = floorAt(s.hero[0], s.hero[2], 3); hero.yaw = s.hero[3]; hero.speed = 0; }
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
  if (e.key >= '1' && e.key <= '9') setShot(ks[+e.key - 1]); if (e.key === '0') setShot(ks[9]);
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && shot !== 'walk') setShot('walk');
  if (e.code === 'KeyL') leshyOut();
  if (e.code === 'ArrowLeft') cam.nudge -= 0.12; if (e.code === 'ArrowRight') cam.nudge += 0.12;
  if (e.code === 'ArrowUp') cam.lift += 0.6; if (e.code === 'ArrowDown') cam.lift -= 0.6;
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function leshyOut() { if (leshy.state === 'home' || leshy.state === 'back') { leshy.state = 'out'; leshy.t = 0; } }

// ---------- Леший: выходит из дуба, идёт по мосткам к герою, стоит, возвращается ----------
const LESHY_PATH = [[door.x, door.z], [-6, -10], [-3, 3], [0, 17]];
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
    if (leshy.t > 9) { leshy.state = 'back'; leshy.seg = LESHY_PATH.length - 2; }
  } else if (leshy.state === 'back') {
    const p = LESHY_PATH[Math.max(0, leshy.seg)]; target = p; sp = 1.3;
    if (Math.hypot(leshy.pos.x - p[0], leshy.pos.z - p[1]) < 0.6) { leshy.seg--; if (leshy.seg < 0) { leshy.state = 'home'; leshy.yaw = door.yaw; leshy.seg = 1; } }
  }
  if (target) {
    const dx = target[0] - leshy.pos.x, dz = target[1] - leshy.pos.z;
    leshy.yaw = turn(leshy.yaw, Math.atan2(dx, dz), dt * 3);
    leshy.speed += (sp - leshy.speed) * Math.min(1, dt * 3);
  } else leshy.speed += (0 - leshy.speed) * Math.min(1, dt * 4);
  leshy.pos.x += Math.sin(leshy.yaw) * leshy.speed * dt; leshy.pos.z += Math.cos(leshy.yaw) * leshy.speed * dt;
  leshy.pos.y = floorAt(leshy.pos.x, leshy.pos.z, leshy.pos.y);
  leshy.ch.root.position.copy(leshy.pos); leshy.ch.root.rotation.y = leshy.yaw;
  blendAnim(leshy.ch, leshy.speed, dt, 1.3, 4);
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
}

// ---------- камера: за героем, ближе к логову — разворачивается на дуб ----------
function updateCamera(dt, t) {
  const s = SHOTS[shot];
  let wantPos, wantLook;
  if (s.walk) {
    const behind = hero.speed > 0.2 ? hero.yaw : cam.yaw;
    cam.yaw = turn(cam.yaw, behind + cam.nudge, dt * (hero.speed > 0.2 ? 1.6 : 0.5));
    const toTree = Math.hypot(hero.pos.x - world.TREE.x, hero.pos.z - world.TREE.z);
    const far = THREE.MathUtils.clamp((toTree - 15) / 40, 0, 1);
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
  const arr = lightList.map((l) => [l.pos.distanceToSquared(c), l]).sort((a, b) => a[0] - b[0]).slice(0, MAXL);
  arr.forEach(([, l], i) => {
    const f = 1 - l.flick * 0.18 * (0.5 + 0.5 * Math.sin(t * 9 + i * 3) * Math.sin(t * 4.3 + i));
    // окна логова светят сильнее, когда стемнело (в логове)
    const k = (0.8 + 1.9 * U.uTheme.value) * f;
    U.uL.value[i].set(l.pos.x, l.pos.y, l.pos.z, l.r);
    U.uLC.value[i].set(l.col[0] * k, l.col[1] * k, l.col[2] * k);
  });
  U.uLN.value = arr.length;
}

// ---------- кадр ----------
const ui = { stage: document.getElementById('stage'), fps: document.getElementById('fps'), theme: document.getElementById('themeNow') };
let W = 1, H = 1, pr = 1;
function layout() {
  W = ui.stage.clientWidth; H = ui.stage.clientHeight;
  pr = Math.min(devicePixelRatio || 1, qual === 2 ? 1.5 : qual === 1 ? 1 : 0.75);
  renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix(); post.setSize(W, H, pr);
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
  let want = ssg(1.5, 1.12, dC);
  if (TH.mode === 'forest') want = 0; else if (TH.mode === 'lair') want = 1; else if (TH.forced !== null && TH.forced !== undefined) want = TH.forced;
  TH.k += (want - TH.k) * Math.min(1, dt * 0.9);
  applyTheme(TH.k);
  ui.theme.textContent = TH.k > 0.5 ? 'логово' : 'обычный лес';
  updateCamera(dt, t);
  updateLights(t);
  for (const m of world.mists) { if (m.userData.rise !== undefined) { const k = ((t * 0.25 + m.userData.rise * 0.1) % 1); m.position.y = m.userData.rise + k * 1.2; m.material.uniforms.uA.value = 0.16 * Math.sin(k * Math.PI); m.position.x += Math.sin(t * 0.3 + m.userData.rise) * 0.004; } m.lookAt(camera.position.x, m.position.y, camera.position.z); }
  life.update(t, dt, pr);
  world.anim.flames.forEach((f, i) => { const k = 1 + 0.18 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 5.3 + i); f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); f.rotation.y = t * 0.7 + i; });
  // солнце и тень следуют за камерой
  const fc = cam.look; sun.target.position.set(fc.x, 0, fc.z); sun.position.copy(sun.target.position).addScaledVector(U.uSunDir.value, 120);
  // лучи: в лесу от солнца, в логове — от зелёного столба над дубом
  sunFar.copy(U.uSunDir.value).multiplyScalar(800).lerp(new THREE.Vector3(world.TREE.x + 6, 80, world.TREE.z - 14), TH.k);
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
document.getElementById('hide').onclick = () => { const p = document.getElementById('panel'); p.hidden = !p.hidden; };

layout();
setShot(new URLSearchParams(location.search).get('shot') || 'walk');
applyTheme(0);
ready.then(() => { document.getElementById('loading').hidden = true; });
if (!MANUAL) frame();
window.__lair = { setShot, hero, leshy, TH, world, post, life, floorAt, keys, step: (n = 1, d = 1 / 30) => { for (let i = 0; i < n; i++) frame(d); }, ready, leshyOut, renderer, camera };
