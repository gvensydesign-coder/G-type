// Три времени суток. День — как было (замерено по кадрам видео), утро и ночь — новые.
// Всё задаётся одним набором чисел и плавно перетекает за ~1,5 с при переключении.
import * as THREE from 'three';
import { G } from './materials.js';

const lin = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const v3 = (x, y, z) => { const v = new THREE.Vector3(x, y, z).normalize(); return [v.x, v.y, v.z]; };

export const TOD = {
  morning: {
    name: 'Утро',
    // низкое солнце слева: длинные тени, персиковый свет, сиреневые тени, густой туман у земли
    sunDir: v3(-0.86, 0.27, 0.32), glowDir: v3(-0.55, 0.13, -0.83),
    sunCol: [1.14, 0.90, 0.72], shadeCol: [0.56, 0.57, 0.80],
    hazeWarm: lin('#fcd5b6'), hazeCool: lin('#c2c6da'), hazeDen: 0.0105, hazeMax: 0.95, fog: 1.7,
    tint: [1.03, 0.95, 0.93], cloudSh: 0.55,
    skyTop: lin('#a6bcd6'), skyMid: lin('#f4d8c8'), skyHor: lin('#fbc29c'), glowC: [1.0, 0.82, 0.62], disc: [1.0, 0.95, 0.85], discSize: 0.9995, stars: 0,
    cLit: lin('#ffd8c0'), cSh: lin('#e3b0bb'), cDeep: lin('#b3a2c8'),
    lo: [0.05, 0.06, 0.10], hi: [1.0, 0.965, 0.93], expo: 0.8, sat: 1.0, bloomTh: 0.95, rays: 1.25,
    shaft: 1.0, shaftC: [1.0, 0.82, 0.62], emit: 0, fly: 0, motes: 1.0, moteC: [1.0, 0.88, 0.7], blob: 0.5,
  },
  day: {
    name: 'День',
    sunDir: v3(-0.55, 0.62, 0.56), glowDir: v3(-0.12, 0.30, -0.95),
    sunCol: [1.06, 1.00, 0.90], shadeCol: [0.56, 0.64, 0.78],
    hazeWarm: lin('#fbe4bb'), hazeCool: lin('#bcd0c0'), hazeDen: 0.0065, hazeMax: 0.95, fog: 1.0,
    tint: [1, 1, 1], cloudSh: 1.0,
    skyTop: lin('#9fc0c6'), skyMid: lin('#f5e6c8'), skyHor: lin('#fbdcae'), glowC: [1.0, 0.93, 0.75], disc: [1.0, 0.98, 0.9], discSize: 0.9995, stars: 0,
    cLit: lin('#fde9d4'), cSh: lin('#e9c6c2'), cDeep: lin('#cdb8cf'),
    lo: [0.03, 0.075, 0.08], hi: [0.975, 0.985, 0.95], expo: 0.76, sat: 1.0, bloomTh: 1.0, rays: 1.0,
    shaft: 0.45, shaftC: [1.0, 0.92, 0.72], emit: 0, fly: 0, motes: 1.0, moteC: [1.0, 0.93, 0.72], blob: 0.5,
  },
  night: {
    name: 'Ночь',
    // луна справа-сзади: холодный синий свет, звёзды, светлячки, тёплое окно иллюминатора
    sunDir: v3(0.45, 0.72, -0.35), glowDir: v3(0.30, 0.38, -0.87),
    sunCol: [0.50, 0.62, 0.92], shadeCol: [0.19, 0.25, 0.42],
    hazeWarm: lin('#5f739c'), hazeCool: lin('#25344f'), hazeDen: 0.0085, hazeMax: 0.92, fog: 1.25,
    tint: [0.34, 0.43, 0.66], cloudSh: 0.45,
    skyTop: lin('#0b1628'), skyMid: lin('#1c2d4d'), skyHor: lin('#344a6e'), glowC: [0.55, 0.65, 0.85], disc: [0.95, 0.96, 1.0], discSize: 0.99935, stars: 1,
    cLit: lin('#6f81a8'), cSh: lin('#3a4767'), cDeep: lin('#283350'),
    lo: [0.012, 0.025, 0.05], hi: [0.86, 0.92, 1.0], expo: 1.0, sat: 0.95, bloomTh: 0.62, rays: 0.35,
    shaft: 0.3, shaftC: [0.6, 0.72, 1.0], emit: 1, fly: 1, motes: 0.0, moteC: [0.7, 0.8, 1.0], blob: 0.35,
  },
};

export class DayTime {
  constructor(refs) {
    this.r = refs; // { sky, clouds, post, shafts, motes, fireflies, glass, blobs() }
    this.cur = flat(TOD.day); this.from = this.cur.slice(); this.to = this.cur.slice(); this.k = 1;
    this.key = 'day'; this.fogOn = 1;
    this.apply();
  }
  set(key, instant = false) {
    this.key = key; this.from = this.cur.slice(); this.to = flat(TOD[key]); this.k = instant ? 1 : 0;
    if (instant) { this.cur = this.to.slice(); this.apply(); }
  }
  update(dt) {
    if (this.k >= 1) return;
    this.k = Math.min(1, this.k + dt / 1.5);
    const e = this.k * this.k * (3 - 2 * this.k);
    for (let i = 0; i < this.cur.length; i++) this.cur[i] = this.from[i] + (this.to[i] - this.from[i]) * e;
    this.apply();
  }
  get v() { return unflat(this.cur); }
  apply() {
    const d = unflat(this.cur), r = this.r;
    G.uSunDir.value.set(...d.sunDir).normalize(); G.uGlowDir.value.set(...d.glowDir).normalize();
    G.uSunCol.value.set(...d.sunCol); G.uShadeCol.value.set(...d.shadeCol);
    G.uHazeWarm.value.setRGB(...d.hazeWarm); G.uHazeCool.value.setRGB(...d.hazeCool);
    G.uHazeDen.value = d.hazeDen; G.uHazeMax.value = d.hazeMax; G.uGroundFog.value = d.fog * this.fogOn;
    G.uTint.value.set(...d.tint); G.uCloudSh.value = d.cloudSh;
    const su = r.sky.material.uniforms;
    su.uTop.value.setRGB(...d.skyTop); su.uMidC.value.setRGB(...d.skyMid); su.uHor.value.setRGB(...d.skyHor);
    su.uGlowC.value.set(...d.glowC); su.uDisc.value.set(...d.disc); su.uDiscSize.value = d.discSize; su.uStars.value = d.stars;
    for (const c of r.clouds.children) { const u = c.material.uniforms; u.uLitC.value.setRGB(...d.cLit); u.uShC.value.setRGB(...d.cSh); u.uDeep.value.setRGB(...d.cDeep); }
    const pu = r.post.comp.uniforms;
    pu.uLo.value.set(...d.lo); pu.uHi.value.set(...d.hi); pu.uExpo.value = d.expo; pu.uSatTod.value = d.sat;
    r.post.bright.uniforms.uTh.value = d.bloomTh; pu.uRaysTod.value = d.rays;
    const sh = r.shafts.material.uniforms; sh.uShaft.value = d.shaft; sh.uShaftC.value.set(...d.shaftC);
    r.motes.forEach((m) => { m.material.uniforms.uMoteK.value = d.motes; m.material.uniforms.uMoteC.value.set(...d.moteC); });
    r.fireflies.material.uniforms.uMoteK.value = d.fly; r.fireflies.visible = d.fly > 0.01;
    r.nightGlow(d.emit);
    for (const b of r.blobs()) b.material.uniforms.uOp.value = d.blob;
  }
}

const KEYS = ['sunDir', 'glowDir', 'sunCol', 'shadeCol', 'hazeWarm', 'hazeCool', 'hazeDen', 'hazeMax', 'fog', 'tint', 'cloudSh',
  'skyTop', 'skyMid', 'skyHor', 'glowC', 'disc', 'discSize', 'stars', 'cLit', 'cSh', 'cDeep', 'lo', 'hi', 'expo', 'sat', 'bloomTh', 'rays',
  'shaft', 'shaftC', 'emit', 'fly', 'motes', 'moteC', 'blob'];
function flat(o) { const a = []; for (const k of KEYS) { const v = o[k]; if (Array.isArray(v)) a.push(...v); else a.push(v); } return a; }
function unflat(a) {
  const o = {}; let i = 0;
  for (const k of KEYS) { const n = Array.isArray(TOD.day[k]) ? TOD.day[k].length : 1; o[k] = n === 1 ? a[i] : a.slice(i, i + n); i += n; }
  return o;
}
