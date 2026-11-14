/* Инструмент рейла «Искажение» — этап 1 (математика из proto/iskazhenie.html). */
(function () {
  "use strict";
  if (window.__GT_DISTORT_PATCH__) return;
  window.__GT_DISTORT_PATCH__ = true;

  var OUT = null;
  var FONT = "volt";

  var POS = [
    { id: "slant", name: "Наклон", min: -25, max: 25, def: 0, fmt: function (v) { return v + "°"; } },
    { id: "sx", name: "Ширина знаков", min: 60, max: 150, def: 100, fmt: function (v) { return v + "%"; } },
    { id: "sy", name: "Высота знаков", min: 60, max: 150, def: 100, fmt: function (v) { return v + "%"; } },
    { id: "jit", name: "Разброс поворота", min: 0, max: 20, def: 0, fmt: function (v) { return v + "°"; }, letter: true },
  ];
  var FX = [
    { id: "twist", name: "Вихрь", min: -100, max: 100, def: 0, fmt: function (v) { return (v > 0 ? "+" : "") + v; }, sub: [{ id: "twistR", name: "Радиус", min: 30, max: 150, def: 90, fmt: function (v) { return v + "%"; } }] },
    { id: "lens", name: "Линза", min: -100, max: 100, def: 0, fmt: function (v) { return (v > 0 ? "+" : "") + v; }, sub: [{ id: "lensR", name: "Радиус", min: 30, max: 150, def: 90, fmt: function (v) { return v + "%"; } }] },
    { id: "wave", name: "Волна", min: 0, max: 100, def: 0, fmt: function (v) { return String(v); }, sub: [{ id: "waveL", name: "Длина волны", min: 150, max: 1400, def: 600, fmt: function (v) { return v + " ед."; } }, { id: "waveD", name: "Направление", min: 0, max: 90, def: 0, fmt: function (v) { return v + "°"; } }] },
    { id: "noise", name: "Дрожь", min: 0, max: 100, def: 0, fmt: function (v) { return String(v); }, sub: [{ id: "noiseS", name: "Крупность", min: 20, max: 220, def: 90, fmt: function (v) { return v + " ед."; } }] },
    { id: "spikes", name: "Шипы", min: 0, max: 100, def: 0, fmt: function (v) { return String(v); }, sub: [{ id: "spikeP", name: "Шаг шипов", min: 16, max: 80, def: 34, fmt: function (v) { return v + " ед."; } }] },
    { id: "slice", name: "Срез", min: 0, max: 100, def: 0, fmt: function (v) { return String(v); }, sub: [{ id: "sliceN", name: "Число полос", min: 2, max: 14, def: 6, fmt: function (v) { return String(v); } }] },
    { id: "pix", name: "Пиксели", min: 0, max: 100, def: 0, fmt: function (v) { return v === 0 ? "0" : cellOf(v) + " ед."; }, sub: [] },
  ];
  function cellOf(a) { return Math.round(90 - ((90 - 16) * a) / 100); }
  var ALLP = POS.concat(FX.reduce(function (a, f) { return a.concat([f], f.sub); }, []));
  var DEF = {};
  ALLP.forEach(function (p) { DEF[p.id] = p.def; });

  var S = {
    text: "ЖЕЛЕЗО",
    seed: 17,
    p: Object.assign({}, DEF),
    perLetter: false,
    selCh: "",
    letterP: {},
    variants: false,
    variantSeed: 17,
    mode: "whole",
    same: 0,
  };

  var ui = {};
  var hiddenViews = [];
  var open = false;
  var cv, ctx, cvw, dpr = 1, cw = 480, ch = 280;
  var flatCache = {};
  var drawTmr = 0;

  function hash(a, b) {
    var h = (a ^ 0x9e3779b9) >>> 0;
    h = Math.imul(h ^ (b + 0x7f4a7c15 | 0), 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  var rnd = function (a, b) { return hash(a | 0, b | 0) / 4294967296; };
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    function g(i, j) { return rnd(s + i * 374761393, j * 668265263) * 2 - 1; }
    var a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * u + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
  }
  var area = function (P) {
    var s = 0;
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  function flatGlyph(fid, ch) {
    var k = fid + ch;
    if (flatCache[k]) return flatCache[k];
    if (!OUT || !OUT[fid] || !OUT[fid].gl[ch]) return null;
    var g = OUT[fid].gl[ch];
    var polys = [];
    for (var ci = 0; ci < g.cs.length; ci++) {
      var c = g.cs[ci], n = c.n, L = n.length, pts = [];
      for (var i = 0; i < L; i++) {
        var a = n[i], b = n[(i + 1) % L];
        var p0 = [a[0], a[1]], p1 = a[4] != null ? [a[4], a[5]] : p0,
          p2 = b[2] != null ? [b[2], b[3]] : [b[0], b[1]], p3 = [b[0], b[1]];
        pts.push(p0);
        if (p1 === p0 && p2[0] === p3[0] && p2[1] === p3[1]) continue;
        var len = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        var m = Math.max(2, Math.min(28, Math.ceil(len / 16)));
        for (var j = 1; j < m; j++) {
          var t = j / m, u = 1 - t;
          pts.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
          ]);
        }
      }
      var ar = area(pts);
      if (c.h ? ar > 0 : ar < 0) pts.reverse();
      polys.push(pts);
    }
    return (flatCache[k] = { adv: g.adv, polys: polys });
  }
  function clone(P) { return P.map(function (q) { return q.map(function (p) { return [p[0], p[1]]; }); }); }
  function bbox(polys) {
    var a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (var pi = 0; pi < polys.length; pi++)
      for (var qi = 0; qi < polys[pi].length; qi++) {
        var p = polys[pi][qi];
        if (p[0] < a) a = p[0];
        if (p[0] > c) c = p[0];
        if (p[1] < b) b = p[1];
        if (p[1] > d) d = p[1];
      }
    return a > c ? null : [a, b, c, d];
  }
  function densify(P, step) {
    var o = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length];
      o.push(a);
      var d = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.ceil(d / step);
      for (var j = 1; j < m; j++) {
        var t = j / m;
        o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return o;
  }
  function uniform(P, step) {
    var L = 0, seg = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[i], b = P[(i + 1) % P.length];
      var d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      seg.push(d);
      L += d;
    }
    var n = Math.max(4, Math.round(L / step));
    if (n % 2) n++;
    var o = [], si = 0, acc = 0;
    for (var k = 0; k < n; k++) {
      var t = (k * L) / n;
      while (si < P.length - 1 && acc + seg[si] < t) { acc += seg[si]; si++; }
      var a = P[si], b = P[(si + 1) % P.length], f = seg[si] ? (t - acc) / seg[si] : 0;
      o.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
    }
    return o;
  }
  function layout(text, fid) {
    var words = text.split(" ").filter(Boolean), lines = [], cur = [], w = 0, MAXW = 7200;
    function adv(ch) { var g = OUT[fid].gl[ch]; return g ? g.adv : 0; }
    for (var wi = 0; wi < words.length; wi++) {
      var word = words[wi], ww = 0;
      for (var ci = 0; ci < word.length; ci++) ww += adv(word[ci]);
      if (cur.length && w + ww > MAXW) { lines.push(cur); cur = []; w = 0; }
      cur.push(word);
      w += ww + 300;
    }
    if (cur.length) lines.push(cur);
    return lines.slice(0, 4);
  }
  function glyphList(text, fid) {
    var lines = layout(text, fid), res = [], idx = 0, maxW = 0, lineH = 1080;
    lines.forEach(function (ws, li) {
      var x = 0;
      ws.forEach(function (word) {
        for (var ci = 0; ci < word.length; ci++) {
          var ch = word[ci], g = flatGlyph(fid, ch);
          if (!g) continue;
          res.push({ ch: ch, idx: idx++, x: x, y: -li * lineH, adv: g.adv, line: li });
          x += g.adv;
        }
        x += 300;
      });
      maxW = Math.max(maxW, x - 300);
    });
    return { res: res, W: maxW, H: Math.max(1, lines.length) * lineH, nl: Math.max(1, lines.length), lineH: lineH };
  }
  function clipBand(P, y0, y1) {
    var o = P;
    function clip(poly, keep, y) {
      var r = [];
      for (var i = 0; i < poly.length; i++) {
        var a = poly[i], b = poly[(i + 1) % poly.length];
        var ia = keep(a), ib = keep(b);
        if (ia) r.push(a);
        if (ia !== ib) {
          var t = (y - a[1]) / (b[1] - a[1]);
          r.push([a[0] + (b[0] - a[0]) * t, y]);
        }
      }
      return r;
    }
    if (isFinite(y0)) { o = clip(o, function (p) { return p[1] >= y0; }, y0); if (o.length < 3) return null; }
    if (isFinite(y1)) { o = clip(o, function (p) { return p[1] <= y1; }, y1); if (o.length < 3) return null; }
    return o;
  }
  function place(polys, g, sx) {
    for (var pi = 0; pi < polys.length; pi++)
      for (var qi = 0; qi < polys[pi].length; qi++) {
        polys[pi][qi][0] += g.x;
        polys[pi][qi][1] += g.y;
      }
    return polys;
  }
  function pixelate(polys, cell, xo) {
    var bb = bbox(polys);
    if (!bb) return polys;
    var out = [], gx0 = xo + Math.floor((bb[0] - xo) / cell) * cell, gy0 = Math.floor(bb[1] / cell) * cell;
    for (var y = gy0; y < bb[3]; y += cell) {
      var yc = y + cell / 2, xs = [];
      for (var pi = 0; pi < polys.length; pi++) {
        var P = polys[pi];
        for (var i = 0; i < P.length; i++) {
          var a = P[i], b = P[(i + 1) % P.length];
          if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort(function (m, n) { return m - n; });
      var run = null, cells = Math.ceil((bb[2] - gx0) / cell);
      for (var c = 0; c < cells; c++) {
        var xc = gx0 + c * cell + cell / 2, inside = false;
        for (var k = 0; k + 1 < xs.length; k += 2) if (xc >= xs[k] && xc < xs[k + 1]) { inside = true; break; }
        if (inside) {
          if (!run) run = [c, c];
          else run[1] = c;
        } else if (run) {
          out.push([[gx0 + run[0] * cell, y], [gx0 + (run[1] + 1) * cell, y], [gx0 + (run[1] + 1) * cell, y + cell], [gx0 + run[0] * cell, y + cell]]);
          run = null;
        }
      }
      if (run) out.push([[gx0 + run[0] * cell, y], [gx0 + (run[1] + 1) * cell, y], [gx0 + (run[1] + 1) * cell, y + cell], [gx0 + run[0] * cell, y + cell]]);
    }
    return out;
  }
  function buildGlyph(g, env, off) {
    var p = env.p, fx = env.fx, fl = flatGlyph(env.font, g.ch);
    if (!fl) return [];
    var polys = clone(fl.polys);
    var seedG = env.mode === "letter" ? hash(env.seed, g.ch.codePointAt(0) || 0) : env.seed;
    if (off) return place(polys, g, 0);
    var sx = p.sx / 100, sy = p.sy / 100, tn = Math.tan((-p.slant * Math.PI) / 180);
    for (var pi = 0; pi < polys.length; pi++)
      for (var qi = 0; qi < polys[pi].length; qi++) {
        polys[pi][qi][0] *= sx;
        polys[pi][qi][1] *= sy;
        polys[pi][qi][0] += polys[pi][qi][1] * tn;
      }
    if (p.jit > 0 && env.mode === "letter") {
      var bb = bbox(polys), cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
      var a = (rnd(seedG, 5) * 2 - 1) * p.jit * (Math.PI / 180), c = Math.cos(a), s = Math.sin(a);
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var dx = polys[pi][qi][0] - cx, dy = polys[pi][qi][1] - cy;
          polys[pi][qi][0] = cx + dx * c - dy * s;
          polys[pi][qi][1] = cy + dx * s + dy * c;
        }
    }
    polys = place(polys, g, sx);
    var warp = fx.twist || fx.lens || fx.wave || fx.noise;
    if (fx.spikes) polys = polys.map(function (P) { return uniform(P, p.spikeP / 2); });
    else if (warp) polys = polys.map(function (P) { return densify(P, 14); });
    var cx, cy, Rbase, ox = 0, oy = 0;
    if (env.mode === "letter") {
      var bb2 = bbox(polys);
      cx = (bb2[0] + bb2[2]) / 2;
      cy = (bb2[1] + bb2[3]) / 2;
      Rbase = Math.hypot(bb2[2] - bb2[0], bb2[3] - bb2[1]) * 0.62;
      ox = cx;
      oy = cy;
    } else {
      cx = env.cx;
      cy = env.cy;
      Rbase = Math.hypot(env.W, env.H) * 0.45;
    }
    if (fx.twist) {
      var R = (Rbase * p.twistR) / 100, th = (p.twist / 100) * 1.4;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var dx = polys[pi][qi][0] - cx, dy = polys[pi][qi][1] - cy, r = Math.hypot(dx, dy);
          if (r >= R) continue;
          var f = 1 - r / R, aa = th * f * f, cc = Math.cos(aa), ss = Math.sin(aa);
          polys[pi][qi][0] = cx + dx * cc - dy * ss;
          polys[pi][qi][1] = cy + dx * ss + dy * cc;
        }
    }
    if (fx.lens) {
      R = (Rbase * p.lensR) / 100;
      var kk = (p.lens / 100) * 0.6;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          dx = polys[pi][qi][0] - cx;
          dy = polys[pi][qi][1] - cy;
          r = Math.hypot(dx, dy);
          if (r >= R || r < 1e-6) continue;
          var t = r / R, ff = 1 + kk * (1 - t * t);
          polys[pi][qi][0] = cx + dx * ff;
          polys[pi][qi][1] = cy + dy * ff;
        }
    }
    if (fx.wave) {
      var A = (p.wave / 100) * 70, Lw = p.waveL, ang = (p.waveD * Math.PI) / 180,
        tx = Math.cos(ang), ty = Math.sin(ang),
        phi = env.mode === "letter" ? rnd(seedG, 11) * 6.283 : rnd(env.seed, 3) * 6.283;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var u = (polys[pi][qi][0] - ox) * tx + (polys[pi][qi][1] - oy) * ty;
          var d = A * Math.sin(6.2832 * (u / Lw) + phi);
          polys[pi][qi][0] += -ty * d;
          polys[pi][qi][1] += tx * d;
        }
    }
    if (fx.noise) {
      A = (p.noise / 100) * 45;
      var Sx = p.noiseS, s1 = hash(seedG, 21), s2 = hash(seedG, 22), nu, nv;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          nu = (polys[pi][qi][0] - ox) / Sx;
          nv = (polys[pi][qi][1] - oy) / Sx;
          polys[pi][qi][0] += A * vnoise(nu, nv, s1);
          polys[pi][qi][1] += A * vnoise(nu, nv, s2);
        }
    }
    if (fx.spikes) {
      A = (p.spikes / 100) * 80;
      polys = polys.map(function (P, pi) {
        var n = P.length, o = new Array(n);
        for (var i = 0; i < n; i++) {
          var a = P[(i + n - 1) % n], b = P[(i + 1) % n], ttx = b[0] - a[0], tty = b[1] - a[1],
            ll = Math.hypot(ttx, tty) || 1, nx = tty / ll, ny = -ttx / ll;
          var kk2 = i % 2 === 1 ? A * (0.55 + 0.45 * rnd(seedG, pi * 1000 + i)) : -A * 0.12;
          o[i] = [P[i][0] + nx * kk2, P[i][1] + ny * kk2];
        }
        return o;
      });
    }
    if (fx.slice) {
      var N = Math.round(p.sliceN), As = (p.slice / 100) * 110, yA, yB;
      if (env.mode === "letter") { yA = -60; yB = 780; }
      else { yA = -(env.L.nl - 1) * env.L.lineH - 100; yB = 800; }
      var h = (yB - yA) / N, out2 = [];
      for (var k = 0; k < N; k++) {
        var y0 = k === 0 ? -Infinity : yA + k * h, y1 = k === N - 1 ? Infinity : yA + (k + 1) * h;
        var sh = (rnd(seedG, 100 + k) * 2 - 1) * As;
        for (pi = 0; pi < polys.length; pi++) {
          var cc2 = clipBand(polys[pi], y0, y1);
          if (cc2) out2.push(cc2.map(function (q) { return [q[0] + sh, q[1]]; }));
        }
      }
      polys = out2;
    }
    if (fx.pix && p.pix > 0) polys = pixelate(polys, cellOf(p.pix), env.mode === "letter" ? g.x : 0);
    return polys;
  }

  function sampleFromPage() {
    var t = document.getElementById("txt");
    if (t && t.value.trim()) {
      var line = t.value.trim().split("\n")[0];
      return line.slice(0, 40) || "ЖЕЛЕЗО";
    }
    return "ЖЕЛЕЗО";
  }

  function paramsForGlyph(ch) {
    var base = S.p;
    if (S.perLetter && S.letterP[ch]) base = Object.assign({}, S.p, S.letterP[ch]);
    return base;
  }

  function envNow(seed, text) {
    var fx = {};
    FX.forEach(function (f) { fx[f.id] = S.p[f.id] !== 0; });
    var L = glyphList(text || S.text, FONT);
    return {
      p: S.p,
      fx: fx,
      font: FONT,
      mode: S.perLetter ? "letter" : "whole",
      same: S.same,
      seed: seed != null ? seed : S.seed,
      W: L.W,
      H: L.H,
      cx: L.W / 2,
      cy: (-(L.nl - 1) * L.lineH) / 2 + 350,
      L: L,
    };
  }

  function renderPreview(targetCv, targetCtx, seed, text) {
    if (!OUT || !targetCv || !targetCtx) return;
    var env = envNow(seed, text);
    var L = env.L;
    var all = [];
    for (var gi = 0; gi < L.res.length; gi++) {
      var g = L.res[gi];
      var glyphEnv = env;
      if (S.perLetter) {
        var pp = paramsForGlyph(g.ch);
        var fx2 = {};
        FX.forEach(function (f) { fx2[f.id] = pp[f.id] !== 0; });
        glyphEnv = Object.assign({}, env, { p: pp, fx: fx2, mode: "letter" });
      }
      all.push(buildGlyph(g, glyphEnv, false));
    }
    var r = targetCv.parentElement ? targetCv.parentElement.getBoundingClientRect() : { width: cw, height: ch };
    var w = Math.max(80, Math.round(r.width)), h = Math.max(80, Math.round(r.height));
    var ratio = Math.min(3, window.devicePixelRatio || 1);
    targetCv.width = w * ratio;
    targetCv.height = h * ratio;
    targetCv.style.width = w + "px";
    targetCv.style.height = h + "px";
    var pad = Math.max(12, Math.min(w, h) * 0.08);
    var lay = { y0: -(L.nl - 1) * L.lineH - 90, y1: 800 };
    var lcx = env.cx, lcy = env.cy;
    var sc = Math.min((w - 2 * pad) / Math.max(1, L.W), (h - 2 * pad) / Math.max(1, lay.y1 - lay.y0));
    var ex = 1e-9, ey = 1e-9;
    for (var ai = 0; ai < all.length; ai++)
      for (var pi = 0; pi < all[ai].length; pi++)
        for (var qi = 0; qi < all[ai][pi].length; qi++) {
          ex = Math.max(ex, Math.abs(all[ai][pi][qi][0] - lcx));
          ey = Math.max(ey, Math.abs(all[ai][pi][qi][1] - lcy));
        }
    sc = Math.min(sc, (w / 2 - pad) / ex, (h / 2 - pad) / ey);
    function X(x) { return w / 2 + (x - lcx) * sc; }
    function Y(y) { return h / 2 - (y - lcy) * sc; }
    targetCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
    targetCtx.clearRect(0, 0, w, h);
    var ink = getComputedStyle(document.documentElement).getPropertyValue("--glyph").trim() ||
      getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#000";
    targetCtx.fillStyle = ink;
    targetCtx.beginPath();
    for (ai = 0; ai < all.length; ai++)
      for (pi = 0; pi < all[ai].length; pi++) {
        var P = all[ai][pi];
        if (!P.length) continue;
        targetCtx.moveTo(X(P[0][0]), Y(P[0][1]));
        for (qi = 1; qi < P.length; qi++) targetCtx.lineTo(X(P[qi][0]), Y(P[qi][1]));
        targetCtx.closePath();
      }
    targetCtx.fill("nonzero");
  }

  function fitMain() {
    if (!cvw || !cv) return;
    var r = cvw.getBoundingClientRect();
    cw = Math.max(100, Math.round(r.width));
    ch = Math.max(100, Math.round(r.height));
  }

  function draw() {
    if (!open) return;
    fitMain();
    renderPreview(cv, ctx, S.seed, S.text);
    if (S.variants) renderVariants();
    syncSliders();
    refreshLetters();
  }

  function queueDraw() {
    clearTimeout(drawTmr);
    drawTmr = setTimeout(draw, 60);
  }

  function renderVariants() {
    if (!ui.varRow) return;
    ui.varRow.hidden = false;
    var items = ui.varRow.querySelectorAll("canvas");
    for (var i = 0; i < 5; i++) {
      var seed = S.variantSeed + i * 97;
      renderPreview(items[i], items[i].getContext("2d"), seed, S.text);
    }
  }

  function hideVariants() {
    if (ui.varRow) ui.varRow.hidden = true;
  }

  function setRange(el, def, v) {
    var inp = el.querySelector('input[type="range"]');
    var out = el.querySelector("output");
    inp.value = v;
    var lo = def.min < 0 ? Math.min(50, ((v - def.min) / (def.max - def.min)) * 100) : 0;
    var hi = ((v - def.min) / (def.max - def.min)) * 100;
    var a = def.min < 0 ? Math.min(50, hi) : 0;
    var b = def.min < 0 ? Math.max(50, hi) : hi;
    inp.style.setProperty("--lo", a + "%");
    inp.style.setProperty("--hi", b + "%");
    out.textContent = def.fmt(v);
    el.classList.toggle("act", v !== def.def);
  }

  function syncSliders() {
    var key = S.perLetter && S.selCh ? S.selCh : null;
    var bag = key ? Object.assign({}, S.p, S.letterP[key] || {}) : S.p;
    ALLP.forEach(function (p) {
      var el = ui.sliders[p.id];
      if (!el) return;
      setRange(el, p, bag[p.id] != null ? bag[p.id] : DEF[p.id]);
    });
    FX.forEach(function (f) {
      (f.sub || []).forEach(function (s) {
        var sub = ui.sliders[s.id];
        if (!sub) return;
        sub.hidden = (bag[f.id] || 0) === 0;
      });
    });
    if (ui.swPer) ui.swPer.checked = S.perLetter;
    if (ui.swVar) ui.swVar.checked = S.variants;
    if (ui.spec) ui.spec.textContent = S.text;
    var note = document.getElementById("dst-disclaimer");
    if (note) note.textContent = distortActive()
      ? "Эффект записывается в скачиваемый файл. Каждый знак искажается от своего центра. Пять вариантов остаются на экране: в файл попадает основной вид."
      : "Сдвиньте ползунок: эффект запишется в TTF, OTF, WOFF и WOFF2, в семейство и в вариативный файл. Каждый знак искажается от своего центра.";
  }

  function setParam(id, v) {
    if (S.perLetter && S.selCh) {
      if (!S.letterP[S.selCh]) S.letterP[S.selCh] = {};
      S.letterP[S.selCh][id] = v;
    } else {
      S.p[id] = v;
    }
    queueDraw();
  }

  function refreshLetters() {
    if (!ui.letters) return;
  ui.letters.hidden = !S.perLetter;
    if (!S.perLetter) return;
    var seen = {}, chars = [];
    for (var i = 0; i < S.text.length; i++) {
      var c = S.text[i];
      if (c === " " || seen[c]) continue;
      seen[c] = 1;
      chars.push(c);
    }
    ui.letters.innerHTML = chars
      .map(function (c) {
        return '<button type="button" class="chip sm' + (c === S.selCh ? " on" : "") + '" data-ch="' + c + '">' + c + "</button>";
      })
      .join("");
  }

  function injectStyles() {
    if (document.getElementById("distort-patch-css")) return;
    var st = document.createElement("style");
    st.id = "distort-patch-css";
    st.textContent =
      "#view-distort{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) min(420px,38vw);gap:var(--wg);padding:var(--pad);box-sizing:border-box;overflow:hidden}" +
      "#view-distort .dst-stage{background:var(--card);border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:var(--s3);display:flex;flex-direction:column;gap:var(--s2);min-width:0;min-height:0}" +
      "#view-distort .dst-cvw{flex:1;position:relative;background:var(--canvas);border-radius:var(--r-md);min-height:200px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--line)}" +
      "#view-distort .dst-cvw canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
      "#view-distort .dst-side{background:var(--card);border-radius:var(--r-lg);box-shadow:var(--sh-1);padding:var(--s4);overflow:auto;min-height:0;display:flex;flex-direction:column;gap:var(--s4)}" +
      "#view-distort .dst-h{display:flex;align-items:center;gap:var(--s2);margin:0}" +
      "#view-distort .dst-h h2{margin:0 auto 0 0;font:600 var(--fs-lg)/1 var(--f-ui)}" +
      "#view-distort .dst-note{margin:0;font-size:var(--fs-md);color:var(--text-2);line-height:1.45}" +
      "#view-distort .dst-fx{display:flex;flex-wrap:wrap;gap:var(--s1)}" +
      "#view-distort .dst-fx .chip{height:var(--h-sm);padding:0 var(--s3);font-size:var(--fs-sm);background:var(--surface-2);border:0;border-radius:var(--r-pill);cursor:pointer;color:var(--text)}" +
      "#view-distort .dst-fx .chip.on{background:var(--ink);color:var(--on-ink)}" +
      "#view-distort .dst-sec{display:flex;flex-direction:column;gap:var(--s3)}" +
      "#view-distort .dst-sec h3{margin:0;font-size:var(--fs-md);font-weight:600;color:var(--text-2)}" +
      "#view-distort .dst-sw{display:flex;align-items:center;gap:var(--s2);font-size:var(--fs-md);cursor:pointer}" +
      "#view-distort .dst-sw input{accent-color:var(--ink)}" +
      "#view-distort .dst-ctl{display:flex;flex-direction:column;gap:2px}" +
      "#view-distort .dst-ctl label{display:flex;justify-content:space-between;gap:var(--s2);font-size:var(--fs-md)}" +
      "#view-distort .dst-ctl output{font-variant-numeric:tabular-nums;color:var(--text-2)}" +
      "#view-distort .dst-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:24px;background:transparent;margin:0;cursor:pointer;accent-color:var(--ink);--lo:0%;--hi:0%}" +
      "#view-distort .dst-ctl input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--track) 0 var(--lo),var(--ink) var(--lo) var(--hi),var(--track) var(--hi) 100%)}" +
      "#view-distort .dst-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--ink);border:2px solid var(--card);margin-top:-6px}" +
      "#view-distort .dst-sub{margin-left:var(--s3);padding-left:var(--s3);border-left:2px solid var(--line)}" +
      "#view-distort .dst-vars{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--s2)}" +
      "#view-distort .dst-vars canvas{background:var(--canvas);border-radius:var(--r-xs);box-shadow:inset 0 0 0 1px var(--line);width:100%;aspect-ratio:1.2}" +
      "#view-distort .btn.pri-accent{background:var(--accent-press);color:var(--on-accent)}" +
      "#view-distort .btn.pri-accent:hover{background:var(--accent-hover)}" +
      "#view-distort .btn.pri-accent:active{background:var(--accent-press)}" +
      "#view-distort .nb-close{width:var(--h-md);height:var(--h-md);border:0;border-radius:var(--r-pill);background:var(--surface-2);cursor:pointer;display:grid;place-items:center;color:var(--text)}" +
      "#rb-distort svg{width:22px;height:22px;display:block}" +
      "body:not(.rm-work) #rb-distort{display:none!important}" +
      "@media(max-width:960px){#view-distort{grid-template-columns:1fr;grid-template-rows:minmax(180px,34vh) minmax(0,1fr)}}";
    document.head.appendChild(st);
  }

  function mkSlider(def, parent, sub) {
    var d = document.createElement("div");
    d.className = "dst-ctl" + (sub ? " dst-sub" : "");
    d.dataset.id = def.id;
    d.innerHTML =
      '<label for="dst-r-' +
      def.id +
      '"><span>' +
      def.name +
      '</span><output></output></label><input type="range" id="dst-r-' +
      def.id +
      '" min="' +
      def.min +
      '" max="' +
      def.max +
      '" step="1">';
    parent.appendChild(d);
    var inp = d.querySelector("input");
    inp.addEventListener("input", function () {
      setParam(def.id, +inp.value);
    });
    ui.sliders[def.id] = d;
    return d;
  }

  function buildPanel() {
    injectStyles();
    var app = document.querySelector(".app");
    if (!app || document.getElementById("view-distort")) return;
    var sec = document.createElement("section");
    sec.id = "view-distort";
    sec.hidden = true;
    sec.setAttribute("aria-label", "Искажение");
    sec.innerHTML =
      '<div class="dst-stage">' +
      '<div class="dst-h"><h2>Предпросмотр</h2><span id="dst-spec" class="dst-note"></span></div>' +
      '<div class="dst-cvw" id="dst-cvw"><canvas id="dst-cv" role="img" aria-label="Образец с искажением"></canvas></div>' +
      '<p class="dst-note" id="dst-disclaimer">Сдвиньте ползунок: эффект запишется в TTF, OTF, WOFF и WOFF2, в семейство и в вариативный файл. Каждый знак искажается от своего центра.</p>' +
      "</div>" +
      '<aside class="dst-side">' +
      '<div class="dst-h"><h2>Искажение</h2><button type="button" class="nb-close" id="dst-close" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="dst-sec"><h3>Эффекты</h3><div class="dst-fx" id="dst-fxnames"></div></div>' +
      '<div class="dst-sec"><h3>Общие настройки</h3><div id="dst-shared"></div></div>' +
      '<label class="dst-sw"><input type="checkbox" id="dst-per">Свои на букву</label>' +
      '<div class="dst-fx" id="dst-letters" hidden></div>' +
      '<label class="dst-sw"><input type="checkbox" id="dst-var">Варианты</label>' +
      '<div class="dst-vars" id="dst-vars" hidden></div>' +
      '<button type="button" class="btn pri-accent" id="dst-apply" style="align-self:flex-start">Применить к образцу</button>' +
      "</aside>";
    app.appendChild(sec);

    ui.panel = sec;
    ui.shared = sec.querySelector("#dst-shared");
    ui.letters = sec.querySelector("#dst-letters");
    ui.varRow = sec.querySelector("#dst-vars");
    ui.swPer = sec.querySelector("#dst-per");
    ui.swVar = sec.querySelector("#dst-var");
    ui.spec = sec.querySelector("#dst-spec");
    ui.sliders = {};

    cvw = sec.querySelector("#dst-cvw");
    cv = sec.querySelector("#dst-cv");
    ctx = cv.getContext("2d");

    var fxNames = sec.querySelector("#dst-fxnames");
    FX.forEach(function (f) {
      var b = document.createElement("span");
      b.className = "chip sm";
      b.textContent = f.name;
      b.title = f.name;
      fxNames.appendChild(b);
    });

    POS.forEach(function (p) { mkSlider(p, ui.shared); });
    FX.forEach(function (f) {
      mkSlider(f, ui.shared);
      (f.sub || []).forEach(function (s) { mkSlider(s, ui.shared, true); });
    });

    for (var vi = 0; vi < 5; vi++) {
      var c = document.createElement("canvas");
      c.width = 120;
      c.height = 96;
      c.setAttribute("aria-hidden", "true");
      ui.varRow.appendChild(c);
    }

    sec.querySelector("#dst-close").addEventListener("click", closePanel);
    sec.querySelector("#dst-apply").addEventListener("click", function () {
      S.text = sampleFromPage();
      if (ui.spec) ui.spec.textContent = S.text;
      queueDraw();
    });

    ui.swPer.addEventListener("change", function () {
      S.perLetter = ui.swPer.checked;
      if (S.perLetter && !S.selCh) {
        var t = S.text.replace(/\s/g, "");
        S.selCh = t[0] || "";
      }
      refreshLetters();
      queueDraw();
    });

    ui.swVar.addEventListener("change", function () {
      S.variants = ui.swVar.checked;
      if (S.variants) {
        S.variantSeed = S.seed;
        renderVariants();
        ui.varRow.hidden = false;
      } else hideVariants();
    });

    ui.letters.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ch]");
      if (!b) return;
      S.selCh = b.dataset.ch;
      refreshLetters();
      syncSliders();
    });

    if (window.ResizeObserver)
      new ResizeObserver(function () {
        if (open) queueDraw();
      }).observe(cvw);
    window.addEventListener("resize", function () {
      if (open) queueDraw();
    });
  }

  function rememberViews() {
    hiddenViews = [];
    var app = document.querySelector(".app");
    if (!app) return;
    app.querySelectorAll(":scope > section:not(#view-distort),:scope > div.cols").forEach(function (el) {
      if (el.id === "view-distort") return;
      if (!el.hidden) {
        hiddenViews.push(el);
        el.hidden = true;
      }
    });
  }

  function restoreViews() {
    hiddenViews.forEach(function (el) {
      el.hidden = false;
    });
    hiddenViews = [];
  }

  function openPanel() {
    if (open) return;
    buildPanel();
    if (!OUT) {
      loadOut(function () {
        openPanel();
      });
      return;
    }
    S.text = sampleFromPage();
    open = true;
    rememberViews();
    if (ui.panel) ui.panel.hidden = false;
    var btn = document.getElementById("rb-distort");
    if (btn) {
      btn.setAttribute("aria-pressed", "true");
      btn.classList.add("on");
    }
    draw();
  }

  function closePanel() {
    if (!open) return;
    open = false;
    if (ui.panel) ui.panel.hidden = true;
    if (document.body.classList.contains("rm-work")) restoreViews();
    else hiddenViews = [];
    hideVariants();
    var btn = document.getElementById("rb-distort");
    if (btn) {
      btn.setAttribute("aria-pressed", "false");
      btn.classList.remove("on");
    }
  }

  function togglePanel() {
    if (open) closePanel();
    else openPanel();
  }

  function parseOut(html) {
    var start = html.indexOf("window.__OUT=");
    if (start < 0) return null;
    var i = start + "window.__OUT=".length;
    if (html[i] !== "{") return null;
    var depth = 0;
    for (var j = i; j < html.length; j++) {
      var c = html[j];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return JSON.parse(html.slice(i, j + 1));
      }
    }
    return null;
  }

  function loadOut(cb) {
    fetch("/proto/iskazhenie.html")
      .then(function (r) {
        return r.text();
      })
      .then(function (t) {
        OUT = parseOut(t);
        flatCache = {};
        if (cb) cb();
      })
      .catch(function () {
        OUT = null;
      });
  }

  function paramsDiffer(p) {
    for (var i = 0; i < ALLP.length; i++) {
      var id = ALLP[i].id;
      if ((p[id] == null ? DEF[id] : p[id]) !== DEF[id]) return true;
    }
    return false;
  }

  function distortActive() {
    var base = S.perLetter ? S.p : Object.assign({}, S.p, { jit: 0 });
    if (paramsDiffer(base)) return true;
    if (!S.perLetter) return false;
    var keys = Object.keys(S.letterP);
    for (var i = 0; i < keys.length; i++) {
      if (paramsDiffer(Object.assign({}, S.p, S.letterP[keys[i]]))) return true;
    }
    return false;
  }

  function polysOfCs(cs) {
    var polys = [];
    for (var ci = 0; ci < cs.length; ci++) {
      var n = cs[ci].nodes || [];
      var L = n.length;
      if (L < 2) continue;
      var pts = [];
      for (var i = 0; i < L; i++) {
        var a = n[i], b = n[(i + 1) % L];
        var p0x = a.x, p0y = a.y;
        var p1x = a.b ? a.b.x : p0x, p1y = a.b ? a.b.y : p0y;
        var p2x = b.a ? b.a.x : b.x, p2y = b.a ? b.a.y : b.y;
        var p3x = b.x, p3y = b.y;
        pts.push([p0x, p0y]);
        var straight = Math.hypot(p1x - p0x, p1y - p0y) < 0.4 && Math.hypot(p2x - p3x, p2y - p3y) < 0.4;
        if (straight) continue;
        var len = Math.hypot(p3x - p0x, p3y - p0y) + Math.hypot(p1x - p0x, p1y - p0y) + Math.hypot(p2x - p1x, p2y - p1y);
        var m = Math.max(2, Math.min(16, Math.ceil(len / 32)));
        for (var j = 1; j < m; j++) {
          var t = j / m, u = 1 - t;
          pts.push([
            u * u * u * p0x + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * p3x,
            u * u * u * p0y + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t * p3y,
          ]);
        }
      }
      if (pts.length < 3) continue;
      var ar = area(pts);
      if (cs[ci].hole ? ar > 0 : ar < 0) pts.reverse();
      polys.push(pts);
    }
    return polys;
  }

  function csOfPolys(polys) {
    var cs = [];
    for (var i = 0; i < polys.length; i++) {
      var P = polys[i];
      if (!P || P.length < 3) continue;
      cs.push({
        hole: area(P) < 0,
        nodes: P.map(function (p) { return { x: p[0], y: p[1], a: null, b: null }; }),
      });
    }
    return cs;
  }

  function warpLetter(polys, p, fx, seedG, jitter) {
    var sx = p.sx / 100, sy = p.sy / 100, tn = Math.tan((-p.slant * Math.PI) / 180);
    var pi, qi;
    for (pi = 0; pi < polys.length; pi++)
      for (qi = 0; qi < polys[pi].length; qi++) {
        polys[pi][qi][0] *= sx;
        polys[pi][qi][1] *= sy;
        polys[pi][qi][0] += polys[pi][qi][1] * tn;
      }
    if (jitter && p.jit > 0) {
      var bb = bbox(polys);
      if (bb) {
        var cx0 = (bb[0] + bb[2]) / 2, cy0 = (bb[1] + bb[3]) / 2;
        var ang = (rnd(seedG, 5) * 2 - 1) * p.jit * (Math.PI / 180), cc0 = Math.cos(ang), ss0 = Math.sin(ang);
        for (pi = 0; pi < polys.length; pi++)
          for (qi = 0; qi < polys[pi].length; qi++) {
            var ddx = polys[pi][qi][0] - cx0, ddy = polys[pi][qi][1] - cy0;
            polys[pi][qi][0] = cx0 + ddx * cc0 - ddy * ss0;
            polys[pi][qi][1] = cy0 + ddx * ss0 + ddy * cc0;
          }
      }
    }
    var warp = fx.twist || fx.lens || fx.wave || fx.noise;
    if (fx.spikes) polys = polys.map(function (P) { return uniform(P, p.spikeP / 2); });
    else if (warp) polys = polys.map(function (P) { return densify(P, 18); });
    var bb2 = bbox(polys);
    if (!bb2) return polys;
    var cx = (bb2[0] + bb2[2]) / 2, cy = (bb2[1] + bb2[3]) / 2;
    var Rbase = Math.hypot(bb2[2] - bb2[0], bb2[3] - bb2[1]) * 0.62;
    var ox = cx, oy = cy;
    if (fx.twist) {
      var R = (Rbase * p.twistR) / 100, th = (p.twist / 100) * 1.4;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var dx = polys[pi][qi][0] - cx, dy = polys[pi][qi][1] - cy, r = Math.hypot(dx, dy);
          if (r >= R) continue;
          var f = 1 - r / R, aa = th * f * f, cc = Math.cos(aa), ss = Math.sin(aa);
          polys[pi][qi][0] = cx + dx * cc - dy * ss;
          polys[pi][qi][1] = cy + dx * ss + dy * cc;
        }
    }
    if (fx.lens) {
      R = (Rbase * p.lensR) / 100;
      var kk = (p.lens / 100) * 0.6;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          dx = polys[pi][qi][0] - cx;
          dy = polys[pi][qi][1] - cy;
          r = Math.hypot(dx, dy);
          if (r >= R || r < 1e-6) continue;
          var t = r / R, ff = 1 + kk * (1 - t * t);
          polys[pi][qi][0] = cx + dx * ff;
          polys[pi][qi][1] = cy + dy * ff;
        }
    }
    if (fx.wave) {
      var A = (p.wave / 100) * 70, Lw = p.waveL, angW = (p.waveD * Math.PI) / 180;
      var tx = Math.cos(angW), ty = Math.sin(angW), phi = rnd(seedG, 11) * 6.283;
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var u = (polys[pi][qi][0] - ox) * tx + (polys[pi][qi][1] - oy) * ty;
          var d = A * Math.sin(6.2832 * (u / Lw) + phi);
          polys[pi][qi][0] += -ty * d;
          polys[pi][qi][1] += tx * d;
        }
    }
    if (fx.noise) {
      A = (p.noise / 100) * 45;
      var Sx = p.noiseS, s1 = hash(seedG, 21), s2 = hash(seedG, 22);
      for (pi = 0; pi < polys.length; pi++)
        for (qi = 0; qi < polys[pi].length; qi++) {
          var nu = (polys[pi][qi][0] - ox) / Sx, nv = (polys[pi][qi][1] - oy) / Sx;
          polys[pi][qi][0] += A * vnoise(nu, nv, s1);
          polys[pi][qi][1] += A * vnoise(nu, nv, s2);
        }
    }
    if (fx.spikes) {
      A = (p.spikes / 100) * 80;
      polys = polys.map(function (P, idx) {
        var n = P.length, o = new Array(n);
        for (var i = 0; i < n; i++) {
          var a = P[(i + n - 1) % n], b = P[(i + 1) % n];
          var ttx = b[0] - a[0], tty = b[1] - a[1], ll = Math.hypot(ttx, tty) || 1;
          var nx = tty / ll, ny = -ttx / ll;
          var kk2 = i % 2 === 1 ? A * (0.55 + 0.45 * rnd(seedG, idx * 1000 + i)) : -A * 0.12;
          o[i] = [P[i][0] + nx * kk2, P[i][1] + ny * kk2];
        }
        return o;
      });
    }
    if (fx.slice) {
      var N = Math.round(p.sliceN), As = (p.slice / 100) * 110, yA = -60, yB = 780;
      var h = (yB - yA) / N, out2 = [];
      for (var k = 0; k < N; k++) {
        var y0 = k === 0 ? -Infinity : yA + k * h, y1 = k === N - 1 ? Infinity : yA + (k + 1) * h;
        var sh = (rnd(seedG, 100 + k) * 2 - 1) * As;
        for (pi = 0; pi < polys.length; pi++) {
          var cc2 = clipBand(polys[pi], y0, y1);
          if (cc2) out2.push(cc2.map(function (q) { return [q[0] + sh, q[1]]; }));
        }
      }
      polys = out2;
    }
    if (fx.pix && p.pix > 0) {
      var sign = 1, best = 0;
      for (pi = 0; pi < polys.length; pi++) {
        var ar = area(polys[pi]);
        if (Math.abs(ar) > Math.abs(best)) { best = ar; sign = ar >= 0 ? 1 : -1; }
      }
      polys = pixelate(polys, cellOf(p.pix), 0);
      if (sign < 0) polys = polys.map(function (P) { return P.slice().reverse(); });
    }
    return polys.map(function (P) { return P.length > 480 ? uniform(P, 28) : P; });
  }

  function bakeGlyphCs(cs, adv, ch) {
    var key = typeof ch === "string" ? ch : "";
    var p = paramsForGlyph(key);
    if (!S.perLetter) p = Object.assign({}, p, { jit: 0 });
    if (!paramsDiffer(p)) return null;
    var polys = polysOfCs(cs);
    if (!polys.length) return null;
    var before = bbox(polys);
    var fx = {};
    FX.forEach(function (f) { fx[f.id] = p[f.id] !== 0; });
    var cp = key.codePointAt(0) || 0;
    var seedG = hash(S.seed, cp);
    polys = warpLetter(polys, p, fx, seedG, !!S.perLetter);
    if (!polys.length) return null;
    var bb = bbox(polys);
    if (!bb) return null;
    var shift = before && bb[0] < before[0] - 1 ? before[0] - bb[0] : 0;
    if (shift) {
      for (var si = 0; si < polys.length; si++)
        for (var sj = 0; sj < polys[si].length; sj++) polys[si][sj][0] += shift;
      bb = bbox(polys);
    }
    var adv2 = Math.max(1, Math.round(adv * Math.abs(p.sx / 100)));
    if (bb && bb[2] + 8 > adv2) adv2 = Math.ceil(bb[2] + 16);
    return { cs: csOfPolys(polys), adv: adv2 };
  }

  function installBake() {
    if (window.__GT_BAKE_INSTALLED) return;
    if (typeof window.finalGlyph !== "function" || typeof window.buildTTF !== "function") return;
    window.__GT_BAKE_INSTALLED = true;
    var origFG = window.finalGlyph;
    var depth = 0;
    window.finalGlyph = function (ch, st, edits, opt) {
      var fg = origFG.apply(this, arguments);
      if (!depth || !fg || !fg.cs || !fg.cs.length) return fg;
      try {
        var baked = bakeGlyphCs(fg.cs, fg.adv, fg.ch || ch);
        if (!baked) return fg;
        var copy = {};
        for (var k in fg) copy[k] = fg[k];
        copy.cs = baked.cs;
        copy.adv = baked.adv;
        return copy;
      } catch (err) {
        return fg;
      }
    };
    function wrap(name) {
      var orig = window[name];
      if (typeof orig !== "function" || orig.__gtBake) return;
      var fn = function () {
        var on = distortActive();
        if (on) depth++;
        var left = false;
        function leave() {
          if (left) return;
          left = true;
          if (on) depth--;
        }
        try {
          var args = arguments;
          if (name === "buildTTF" && on && args[1] && args[1].family && String(args[1].family).indexOf("Искаж") < 0) {
            args = [args[0], Object.assign({}, args[1], { family: args[1].family + " Искаж" }), args[2]];
          }
          var result = orig.apply(this, args);
          if (result && typeof result.then === "function") {
            return result.then(function (v) { leave(); return v; }, function (e) { leave(); throw e; });
          }
          leave();
          return result;
        } catch (e) {
          leave();
          throw e;
        }
      };
      fn.__gtBake = true;
      window[name] = fn;
    }
    wrap("buildTTF");
    wrap("buildVariableTTF");
    wrap("buildVariablePair");
    wrap("famBuildAll");
    window.__GT_DISTORT_API = {
      active: distortActive,
      params: function () { return JSON.parse(JSON.stringify(S.p)); },
      set: function (partial, flags) {
        Object.assign(S.p, partial || {});
        if (flags && typeof flags.perLetter === "boolean") S.perLetter = flags.perLetter;
        syncSliders();
      },
    };
  }

  function placeBtn() {
    var tools = document.getElementById("rp-tools");
    if (!tools) return false;
    var btn = document.getElementById("rb-distort");
    if (!btn) {
      btn = document.createElement("button");
      btn.className = "rb";
      btn.type = "button";
      btn.id = "rb-distort";
      btn.setAttribute("data-tip", "Искажение");
      btn.setAttribute("aria-label", "Искажение");
      btn.setAttribute("aria-pressed", open ? "true" : "false");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M3 9c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"/>' +
        '<path d="M3 15c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7.5 0"/></svg>';
      btn.addEventListener("click", togglePanel);
    }
    if (btn.parentNode !== tools) {
      var more = document.getElementById("rail-more-btn");
      if (more && more.parentNode === tools) tools.insertBefore(btn, more);
      else tools.appendChild(btn);
    }
    return true;
  }

  function boot() {
    buildPanel();
    loadOut();
    installBake();
    placeBtn();
    var obs = new MutationObserver(function () {
      placeBtn();
      if (open && !document.body.classList.contains("rm-work")) closePanel();
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();