/* Латинская m: арочная форма (три ствола, две арки) по умолчанию в каждом шрифте библиотеки.
   m в форме кириллической «м» остаётся только набором ss01 (глиф m.ss01).
   Патч правит таблицы глифов уже собранных шрифтов (FONTS[id].GL), упакованные источники не трогает. */
(function () {
  "use strict";
  if (window.__GT_LATIN_M_PATCH__) return;
  window.__GT_LATIN_M_PATCH__ = true;

  var SS01_NAME = "m в форме «м»";
  var swapped = new WeakSet();

  /* ---------- геометрия ---------- */
  function scan(cs, y) {
    var xs = [];
    for (var i = 0; i < cs.length; i++) {
      var pts = flatC(cs[i], 16), n = pts.length;
      for (var j = 0; j < n; j++) {
        var a = pts[j], b = pts[(j + 1) % n];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
    }
    xs.sort(function (p, q) { return p - q; });
    var out = [];
    for (var k = 0; k + 1 < xs.length; k += 2) out.push([xs[k], xs[k + 1]]);
    return out;
  }

  function inkBox(cs) {
    var x0 = 1e9, x1 = -1e9;
    for (var i = 0; i < cs.length; i++) {
      var pts = flatC(cs[i], 12);
      for (var j = 0; j < pts.length; j++) {
        if (pts[j][0] < x0) x0 = pts[j][0];
        if (pts[j][0] > x1) x1 = pts[j][0];
      }
    }
    return [x0, x1];
  }

  function rect(x0, y0, x1, y1, sub) {
    var n = function (x, y) { return { x: x, y: y, a: { x: x, y: y }, b: { x: x, y: y } }; };
    var c = { hole: false, nodes: [n(x0, y0), n(x1, y0), n(x1, y1), n(x0, y1)] };
    if (sub) c.op = "sub";
    return c;
  }

  function copy(cs, dx) {
    dx = dx || 0;
    return cs.map(function (c) {
      return {
        hole: c.hole,
        nodes: c.nodes.map(function (q) {
          return {
            x: q.x + dx, y: q.y,
            a: q.a && { x: q.a.x + dx, y: q.a.y },
            b: q.b && { x: q.b.x + dx, y: q.b.y },
          };
        }),
      };
    });
  }

  /* ---------- общий приём: m = n + ещё одна арка ----------
     Второй n встаёт левым стволом на правый ствол первого, его левая половина
     (шпора, левая засечка) срезается. Ствол, арка, узел и засечки берутся с n как есть;
     поля m считает оптическая посадка по тому же правому и левому краю, что у n. */
  function mFromN(N, shrink) {
    var nw = function (p) { return typeof N.w === "function" ? N.w(p) : (N.w * p.wdth) / 100; };
    var wOf = function (p) { return Math.max(2 * nw(p) * shrink - sE(p), 3 * sE(p) + 1); };
    var shape = function (g) {
      var S = sE(g.p), w1 = (g.w + S) / 2;
      var a = N.shape(Object.assign({}, g, { w: w1 })) || [];
      var iv = scan(a, g.h * 0.42);
      if (iv.length < 2) return a;
      var l = iv[0], r = iv[iv.length - 1];
      var b = copy(a, r[0] - l[0]);
      var box = inkBox(b);
      var half = csgUnion(b.concat([rect(box[0] - 50, -400, (r[0] + r[1]) / 2, g.h + 400, true)]));
      return csgUnion(copy(a).concat(half));
    };
    return { shape: shape, w: wOf };
  }

  function refreshLive(id) {
    if (typeof CUR_FONT === "string" && CUR_FONT === id && typeof GL === "object") {
      var src = FONTS[id].GL;
      for (var k in src) if (GL[k] !== src[k]) GL[k] = src[k];
    }
  }

  /* ---------- Вольт, Квадра, Пиксель: арочная m была в ss01, кириллическая по умолчанию ---------- */
  function swapDefault(id) {
    var f = FONTS[id];
    if (!f || !f.GL || swapped.has(f.GL)) return;
    var G = f.GL, mm = G.m, ss = G["m.ss01"];
    if (!mm || !ss) return;
    swapped.add(G);
    G.m = Object.assign({}, ss, { opt: mm.opt });
    G["m.ss01"] = Object.assign({}, mm, { opt: ss.opt });
  }

  /* ---------- Кодекс: арочная m из собственного n ---------- */
  function codexM() {
    var f = FONTS.codex;
    if (!f || !f.GL || swapped.has(f.GL)) return;
    var G = f.GL, mm = G.m, ss = G["m.ss01"];
    if (!mm || !ss || !G.n) return;
    swapped.add(G);
    var built = mFromN(G.n, 0.97);
    G.m = Object.assign({}, mm, { shape: built.shape, w: built.w });
    G["m.ss01"] = Object.assign({}, ss, { shape: mm.shape, w: mm.w });
  }

  /* ---------- Аппликация: m из бумажных кусков (три полосы-ствола и две дуги), как n/р остальных знаков ---------- */
  function applikM() {
    var f = FONTS.applik;
    if (!f || typeof APPLIK === "undefined" || !APPLIK.REC || APPLIK.REC.m_) return;
    APPLIK.REC.m_ = {
      w: function (H, S) { return Math.max(1.3 * H, 3 * S + 250); },
      f: function (K) {
        var H = K.H, W = K.W, a = K.s(0), b = K.s(1), c = K.s(2), d = K.s(3);
        var ryo = H * 0.34, cy = H - ryo;
        var xl = a * 0.5, xr = W - c * 0.5, xm = (xl + xr) / 2;
        var h1 = (xm - xl) / 2, h2 = (xr - xm) / 2;
        var t1 = d * 0.9, t2 = b * 0.86;
        return [
          K.vs(xl, 0, H, a, H * 0.008),
          K.vs(xm, 0, H * 0.93, b, -H * 0.006),
          K.vs(xr, 0, cy + ryo * 0.25, c, H * 0.01),
          K.arc(xl + h1, cy, h1 + t1 / 2, ryo, t1, t1 * 0.92, 180, 0, 6),
          K.arc(xm + h2, cy, h2 + t2 / 2, ryo, t2 * 1.05, t2 * 0.82, 180, 0, 6),
        ];
      },
    };
    var gen = function (p) {
      return APPLIK.safe({
        stem: p.stem, jit: p.cjit, tear: p.ctear, gap: p.cgap, lap: p.clap, pcs: p.cpcs, sharp: p.csharp,
        soft: p.csoft, scat: p.cscat, lean: p.clean, bj: p.cbj, seed: p.cseed, sb: 0,
      });
    };
    var cont = function (cs) {
      return cs.map(function (c) {
        return mkc(c.nodes.map(function (n) {
          return { x: n.x, y: n.y, a: { x: n.a.x, y: n.a.y }, b: { x: n.b.x, y: n.b.y } };
        }), c.hole);
      });
    };
    f.GL.m = {
      shape: function (g) { return cont(APPLIK.build("m_", true, gen(g.p), 0).contours); },
      w: function (p) { return APPLIK.build("m_", true, gen(p), 0).adv; },
      k: "xh",
      opt: {},
    };
    var raw0 = f.raw;
    f.raw = function (ch, p) { return ch === "m" ? APPLIK.build("m_", true, gen(p), 0) : raw0(ch, p); };
  }

  /* ---------- Сцепка: m в грамматике шрифта (прямоугольные куски, один радиус скругления, поля как у n) ---------- */
  function filletRect(cs, R, ri) {
    var K = 0.5523;
    return cs.map(function (c) {
      var pts = c.nodes.map(function (n) { return [n.x, n.y]; }), n = pts.length, out = [];
      for (var i = 0; i < n; i++) {
        var P = pts[(i + n - 1) % n], V = pts[i], N = pts[(i + 1) % n];
        var d1 = Math.hypot(P[0] - V[0], P[1] - V[1]), d2 = Math.hypot(N[0] - V[0], N[1] - V[1]);
        var cr = (V[0] - P[0]) * (N[1] - V[1]) - (V[1] - P[1]) * (N[0] - V[0]);
        var r = cr > 0 ? R : ri;
        r = Math.min(r, d1 / 2, d2 / 2);
        if (r < 0.5 || Math.abs(cr) < 1e-6) { out.push({ x: V[0], y: V[1], a: { x: V[0], y: V[1] }, b: { x: V[0], y: V[1] } }); continue; }
        var t1 = [V[0] + ((P[0] - V[0]) / d1) * r, V[1] + ((P[1] - V[1]) / d1) * r];
        var t2 = [V[0] + ((N[0] - V[0]) / d2) * r, V[1] + ((N[1] - V[1]) / d2) * r];
        out.push({ x: t1[0], y: t1[1], a: { x: t1[0], y: t1[1] }, b: { x: t1[0] + (V[0] - t1[0]) * K, y: t1[1] + (V[1] - t1[1]) * K } });
        out.push({ x: t2[0], y: t2[1], a: { x: t2[0] + (V[0] - t2[0]) * K, y: t2[1] + (V[1] - t2[1]) * K }, b: { x: t2[0], y: t2[1] } });
      }
      return { hole: c.hole, nodes: out };
    });
  }

  function stsepkaM() {
    var f = FONTS.stsepka;
    if (!f || typeof STS === "undefined" || !f.GL.m || f.GL.m.__archM) return;
    var ink = function (cs) {
      var x0 = 1e9, x1 = -1e9;
      cs.forEach(function (c) { (c.nodes || []).forEach(function (n) { if (n.x < x0) x0 = n.x; if (n.x > x1) x1 = n.x; }); });
      return [x0, x1];
    };
    var memo = new WeakMap();
    var build = function (p) {
      var D = STS.D(p), hit = memo.get(D);
      if (hit) return hit;
      var c = D.c, k = Math.min(0.86, (0.27 * c.lcr * 700) / c.S);
      var S = c.S * k, T = c.T * k, R = c.r * k, ri = c.ri * k, H = 700 * c.lcr;
      var q = 0.5 * S, lo = 3 * S + 2 * c.cmin;
      var W = Math.max(Math.round((1.08 * 1.16 * H * c.wd) / q) * q, Math.ceil(lo / q) * q);
      var xm = W / 2, g = c.gap * 0.6;
      var parts = [
        rect(0, 0, S, H), rect(xm - S / 2, 0, xm + S / 2, H), rect(W - S, 0, W, H),
        rect(0, H - T, W, H),
        rect(xm - g / 2, H - T * 0.5, xm + g / 2, H + 40, true),
      ];
      var cs = filletRect(csgUnion(parts), R, ri);
      var gn = D.glyph("n"), nb = ink(gn.cs), sbl = nb[0], sbr = gn.adv - nb[1];
      var res = { cs: copy(cs, sbl), adv: sbl + W + sbr };
      memo.set(D, res);
      return res;
    };
    var cont = function (cs) {
      return cs.map(function (c) {
        return mkc(c.nodes.map(function (n) {
          return { x: n.x, y: n.y, a: { x: n.a.x, y: n.a.y }, b: { x: n.b.x, y: n.b.y } };
        }), c.hole);
      });
    };
    var shape = function (g) { return cont(build(g.p).cs); };
    var width = function (p) { return build(p).adv; };
    f.GL.m = Object.assign({}, f.GL.m, { shape: shape, w: width, __archM: true });
    if (f.GL["m.ss01"]) f.GL["m.ss01"] = Object.assign({}, f.GL["m.ss01"], { shape: shape, w: width });
    ["m_m.liga", "n_m.liga", "m_a.liga"].forEach(function (nm) { delete f.GL[nm]; });
    var rules0 = STS.rules;
    STS.rules = function (p, which) {
      return rules0.call(STS, p, which).filter(function (r) { return !(r.chars[0] >= "a" && r.chars[0] <= "z" && r.chars.indexOf("m") >= 0); });
    };
    var ckt = classKernTable;
    classKernTable = function (st, prof, isLow, fontId) {
      var out = ckt.apply(this, arguments);
      if ((fontId || CUR_FONT) !== "stsepka" || !out || !out.vals) return out;
      var base = out.vals;
      out.vals = new Proxy({}, {
        get: function (t, key) {
          if (typeof key === "string" && key.indexOf("|") > 0) {
            var i = key.indexOf("|"), a = key.slice(0, i), b = key.slice(i + 1);
            if (a === "m" || b === "m") key = (a === "m" ? "n" : a) + "|" + (b === "m" ? "n" : b);
          }
          return base[key];
        },
        has: function () { return true; },
        ownKeys: function () { return ["*"]; },
        getOwnPropertyDescriptor: function () { return { enumerable: true, configurable: true, value: 0 }; },
      });
      return out;
    };
    if (typeof stData_cache !== "undefined") stData_cache.clear();
  }

  function apply() {
    ["volt", "kvadra", "pixel"].forEach(swapDefault);
    codexM();
    applikM();
    stsepkaM();
    if (FONTS.volt) FONTS.volt.ss01Name = SS01_NAME;
    if (FONTS.kvadra) FONTS.kvadra.ss01Name = SS01_NAME;
    if (FONTS.codex) FONTS.codex.ss01Name = SS01_NAME;
    if (FONTS.pixel) FONTS.pixel.ss01Name = "m в форме «м» и гладкий нуль";
    ["volt", "kvadra", "codex", "pixel", "applik", "stsepka"].forEach(refreshLive);
    dropCaches();
  }

  function dropCaches() {
    try {
      if (typeof cache === "object" && cache.clear) cache.clear();
      if (typeof GCACHE === "object") GCACHE.clear();
      if (typeof CSG_CACHE === "object") CSG_CACHE.clear();
      if (typeof bump === "function" && typeof S === "object" && S.styles) bump();
    } catch (e) { /* кеши пересоберутся сами */ }
  }

  window.__GT_LATIN_M__ = { mFromN: mFromN, scan: scan, apply: apply };
  apply();
})();
