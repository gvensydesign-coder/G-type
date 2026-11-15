// Тепловая карта: уточнения поверх ui_heat.js.
/* «Пропись»: у шрифта связки между буквами задуманы, поэтому штатная карта не ставит оценку.
   Здесь оценка считается по телам букв: связки (тонкие входы и выходы штрихов) убираются из растра открытием,
   и толщина, плотность, апрош и пробел между словами меряются только на том, что осталось.
   Остальные шрифты идут штатным путём без изменений. */
(function () {
  "use strict";
  if (window.__GT_HEAT_PATCH__) return;
  window.__GT_HEAT_PATCH__ = true;

  var FONT = "propis";
  var N = 48;
  var SCALE = 0.12;
  var OPEN_R = 2;
  var THICK_R = 2;
  var LOW = "nohecsuagdpbqkvxyaonпнитсеуазрдкшх";
  var UP = "HOEBNMSTUAKPДНОПЕКСТИ";
  var DIG = "0123456789";
  var PAIRS_LOW = ["nn", "no", "on", "oo", "нн", "но", "он", "оо", "пп", "пн", "ео", "ое"];
  var PAIRS_UP = ["HH", "HO", "OH", "OO", "НН", "НО", "ОН", "ОО", "HE", "EH", "НЕ", "ЕН"];
  var curSc = 0;
  var BC = typeof WeakMap === "function" ? new WeakMap() : null;
  var work = null;

  function evalS() {
    try { return (0, eval)("S"); } catch { return null; }
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function med(a) {
    if (!a.length) return 0;
    var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1;
    return b.length & 1 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function cls(ch) {
    if (/\p{Lu}/u.test(ch)) return "u";
    if (/\p{Ll}/u.test(ch)) return "l";
    if (/\p{Nd}/u.test(ch)) return "d";
    return "p";
  }
  function glyph(ch, key) {
    try { return window.gfSmart(ch, key); } catch { return null; }
  }

  function erode(m, w, h, r) {
    var t = new Uint8Array(w * h), o = new Uint8Array(w * h), i, j, k, v;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      v = 1;
      for (k = -r; k <= r && v; k++) { var x = i + k; if (x < 0 || x >= w || !m[j * w + x]) v = 0; }
      t[j * w + i] = v;
    }
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      v = 1;
      for (k = -r; k <= r && v; k++) { var y = j + k; if (y < 0 || y >= h || !t[y * w + i]) v = 0; }
      o[j * w + i] = v;
    }
    return o;
  }
  function dilate(m, w, h, r) {
    var t = new Uint8Array(w * h), o = new Uint8Array(w * h), i, j, k, v;
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      v = 0;
      for (k = -r; k <= r && !v; k++) { var x = i + k; if (x >= 0 && x < w && m[j * w + x]) v = 1; }
      t[j * w + i] = v;
    }
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
      v = 0;
      for (k = -r; k <= r && !v; k++) { var y = j + k; if (y >= 0 && y < h && t[y * w + i]) v = 1; }
      o[j * w + i] = v;
    }
    return o;
  }

  /* Тело знака: растр, открытие (тонкие связки уходят), профиль краски по тем же N строкам, что у штатной карты. */
  function body(g, cap, xh) {
    var k = cap + "|" + xh, e = BC && BC.get(g);
    if (e && e.k === k) return e.B;
    var minx = 1e9, maxx = -1e9, c, n, i;
    for (i = 0; i < g.cs.length; i++) {
      c = g.cs[i];
      for (n = 0; n < c.nodes.length; n++) {
        var nd = c.nodes[n];
        if (nd.x < minx) minx = nd.x;
        if (nd.x > maxx) maxx = nd.x;
      }
    }
    var step = cap / N, B = { L: new Float32Array(N).fill(NaN), R: new Float32Array(N).fill(NaN), ink: new Float32Array(N), adv: g.adv, step: step, xmin: 1e9, xmax: -1e9 };
    if (!(maxx > minx)) { if (BC) BC.set(g, { k: k, B: B }); return B; }
    var x0 = minx - 30, w = Math.ceil((maxx - minx + 60) * SCALE), h = Math.ceil(cap * SCALE) + 1;
    if (!work) work = document.createElement("canvas");
    work.width = w; work.height = h;
    var ctx = work.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fill(window.pathOf(g.cs, function (a, b) { return [(a - x0) * SCALE, (cap - b) * SCALE]; }), "nonzero");
    var d = ctx.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
    for (i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    var thick = dilate(erode(m, w, h, THICK_R), w, h, THICK_R);
    m = dilate(erode(m, w, h, OPEN_R), w, h, OPEN_R);
    function rowRuns(mm, r) {
      var j = Math.min(h - 1, Math.max(0, Math.floor((cap - (r + 0.5) * step) * SCALE))), out = [], st = -1, i;
      for (i = 0; i <= w; i++) {
        var on = i < w && mm[j * w + i];
        if (on && st < 0) st = i;
        if (!on && st >= 0) { out.push([x0 + st / SCALE, x0 + i / SCALE]); st = -1; }
      }
      return out;
    }
    var r;
    for (r = 0; r < N; r++) {
      var rr = rowRuns(m, r);
      if (rr.length) {
        var first = rr[0][0], last = rr[rr.length - 1][1], s = 0;
        rr.forEach(function (q) { s += q[1] - q[0]; });
        B.L[r] = first; B.R[r] = last; B.ink[r] = s;
        if (first < B.xmin) B.xmin = first;
        if (last > B.xmax) B.xmax = last;
      }
    }
    var nX = Math.max(6, Math.round(xh / cap * N)), runs = [], widths = [];
    for (r = 0; r < N; r++) runs.push(rowRuns(thick, r));
    for (r = Math.max(1, Math.floor(nX * 0.2)); r < Math.min(N - 1, Math.ceil(nX * 0.8)); r++) {
      runs[r].forEach(function (q) {
        var wq = q[1] - q[0];
        if (wq > 0.5 * nX * step) return;
        function near(rw) {
          for (var z = 0; z < runs[rw].length; z++) {
            var zz = runs[rw][z];
            if (Math.abs((zz[0] + zz[1]) / 2 - (q[0] + q[1]) / 2) <= Math.max(wq, zz[1] - zz[0])) return zz;
          }
          return null;
        }
        var u = near(r - 1), dn = near(r + 1);
        if (!u || !dn) return;
        var dl = Math.abs(u[0] - dn[0]), dr = Math.abs(u[1] - dn[1]);
        if (Math.min(dl, dr) <= 0.8 * step && Math.max(dl, dr) <= 2 * step) widths.push(wq);
      });
    }
    B.sw = widths.length >= 3 ? med(widths) : NaN;
    if (BC) BC.set(g, { k: k, B: B });
    return B;
  }
  function flatGap(A, B, nb) {
    var s = 0, n = 0;
    for (var r = 0; r < nb; r++) {
      var ra = A.R[r], lb = B.L[r];
      if (ra !== ra || lb !== lb) continue;
      s += A.adv - ra + lb; n++;
    }
    return n ? s / n : NaN;
  }

  /* Опора по телам: те же контрольные знаки и пары, что у штатной карты, но профили без связок. */
  function bodyRef(key, ref, get, HM) {
    var cap = ref.cap, xh = ref.xh, nX = ref.nX, out = { tone: {}, flat: {}, D: {}, t: {} };
    function P(ch) { var g = get(ch); return g && g.cs && g.cs.length ? { g: g, P: HM.prof(g, cap, xh), B: body(g, cap, xh) } : null; }
    [["l", LOW], ["u", UP], ["d", DIG]].forEach(function (pr) {
      var sws = [];
      Array.from(new Set(Array.from(pr[1]))).forEach(function (ch) {
        var p = P(ch);
        if (p && p.B.sw > 0) sws.push(p.B.sw);
      });
      out.tone[pr[0]] = { sw: med(sws), n: sws.length };
    });
    [["xh", nX, PAIRS_LOW, ["nn", "нн", "hh", "пп"]], ["cap", N, PAIRS_UP, ["HH", "НН", "EE", "ЕЕ"]]].forEach(function (bd) {
      var flat = NaN, i;
      for (i = 0; i < bd[3].length; i++) {
        var A = P(bd[3][i][0]), B = P(bd[3][i][1]);
        if (A && B) { flat = flatGap(A.B, B.B, bd[1]); if (flat === flat) break; }
      }
      var D = flat === flat && flat > 0 ? 1.6 * flat : (bd[0] === "xh" ? xh : cap) * 0.3, ar = [];
      bd[2].forEach(function (q) {
        var A = P(q[0]), B = P(q[1]);
        if (A && B) ar.push(HM.areaGap(A.B, B.B, A.B.adv, bd[1], D).a);
      });
      out.flat[bd[0]] = flat; out.D[bd[0]] = D; out.t[bd[0]] = ar.length ? med(ar) : NaN;
    });
    return out;
  }

  /* строчные кириллические пары: естественный разброс по телам не выходит за ±0,30; прописные (А, Т, диагонали) и латиница терпимее */
  var sevPair = function (d, caps, loose) {
    if (caps) return d < 0 ? clamp01((-d - 0.70) / 0.30) : clamp01((d - 0.90) / 0.60);
    if (loose) return d < 0 ? clamp01((-d - 0.50) / 0.30) : clamp01((d - 0.55) / 0.40);
    return d < 0 ? clamp01((-d - 0.30) / 0.30) : clamp01((d - 0.32) / 0.35);
  };
  var sevTone = function (d) { return clamp01((Math.abs(d) - 0.20) / 0.30); };
  /* пробел между словами видимый (с росчерком последней буквы), он не зависит от связок внутри слова.
     Отношение к апрошу пар у прописи не сравнивается: у соединённых букв оно по определению иное, считается только пробел в em. */
  var sevWord = function (e) {
    return Math.max(e < 0.17 ? clamp01((0.17 - e) / 0.07) : 0, e > 0.45 ? clamp01((e - 0.45) / 0.15) : 0);
  };

  function joined(x) {
    var c = cls(x.c.ch);
    return !!x.B && (c === "l" || c === "u");
  }
  function measure(prev, lines, refs, sc, HM) {
    var items = [], gc = {}, br = {}, li, old = {};
    prev.forEach(function (it) { old[it.t + "|" + it.ln + "|" + it.i] = it; });
    function keep(t, l, i) {
      var it = old[t + "|" + l + "|" + i];
      if (it) { it.body = true; it.intended = false; items.push(it); }
    }
    for (li = 0; li < lines.length; li++) {
      var ln = lines[li], key = ln.key, ref = refs[key] || ln.ref;
      if (!ref) continue;
      var get = gc[key] || (gc[key] = (function (k) {
        var m = new Map();
        return function (ch) { var v = m.get(ch); if (v === undefined) { v = glyph(ch, k); m.set(ch, v); } return v; };
      })(key));
      var R = br[key] || (br[key] = bodyRef(key, ref, get, HM));
      var sp = get(" "), spAdv = sp && sp.adv > 0 ? sp.adv : 250, info = [], i;
      for (i = 0; i < ln.chars.length; i++) {
        var c = ln.chars[i], g = get(c.gn || c.ch), ok = g && g.cs && g.cs.length;
        info.push(ok ? { c: c, g: g, P: HM.prof(g, ref.cap, ref.xh), B: body(g, ref.cap, ref.xh), xu: c.x / sc } : { c: c, g: g, P: null, xu: c.x / sc });
      }
      var yTop = function (cp) { return ln.base - cp * sc; };
      var pairs = [], words = [];
      for (i = 0; i < info.length; i++) {
        var Bi = info[i];
        if (Bi.P) {
          var cl = cls(Bi.c.ch), T = cl === "l" || cl === "u" ? R.tone[cl] : null;
          if (cl === "d" || cl === "p") keep("tone", li, i);
          if (T && T.n && T.sw > 0 && Bi.B.sw > 0) {
            var band = cl === "l" ? ref.xh : ref.cap;
            var dev = Math.max(-0.6, Math.min(0.6, Bi.B.sw / T.sw - 1));
            items.push({ t: "tone", body: true, ln: li, i: i, ch: Bi.c.ch, gn: Bi.c.gn || Bi.c.ch, key: key, dev: dev, sev: sevTone(dev),
              x0: ln.ox + Bi.xu * sc, x1: ln.ox + (Bi.xu + Bi.g.adv) * sc, y0: yTop(band), y1: ln.base });
          }
        }
        if (!i) continue;
        var A = info[i - 1];
        if (!A.P || !Bi.P) continue;
        var dx = Bi.xu - A.xu, free = dx - A.g.adv;
        if (free > 0.45 * spAdv) {
          var rmax = -1e9, lmin = 1e9;
          var wa = A.P, wb = Bi.P;
          for (var r = 0; r < ref.nX; r++) {
            if (wa.R[r] === wa.R[r] && wa.R[r] > rmax) rmax = wa.R[r];
            if (wb.L[r] === wb.L[r] && wb.L[r] < lmin) lmin = wb.L[r];
          }
          if (rmax > -1e8 && lmin < 1e8) words.push({ i: i, wu: dx + lmin - rmax, x0: ln.ox + (A.xu + rmax) * sc, x1: ln.ox + (Bi.xu + lmin) * sc });
          continue;
        }
        var ca = cls(A.c.ch), cb = cls(Bi.c.ch);
        var bnd = (ca === "u" || ca === "d") && (cb === "u" || cb === "d") ? "cap" : "xh", n = bnd === "cap" ? N : ref.nX;
        var bod = joined(A) && joined(Bi), PA = bod ? A.B : A.P, PB = bod ? Bi.B : Bi.P, D = bod ? R.D[bnd] : ref.D[bnd];
        pairs.push({ i: i, A: A, B: Bi, PA: PA, PB: PB, bod: bod, band: bnd, n: n, D: D, m: HM.areaGap(PA, PB, dx, n, D), dx: dx, ca: ca, cb: cb });
      }
      var tTxt = med(pairs.map(function (p) { return p.m.a; }));
      pairs.forEach(function (p) {
        if (!p.bod) { keep("pair", li, p.i); return; }
        var rf = R, t = rf.t[p.band];
        if (!(t > 0)) t = tTxt;
        if (!(t > 0)) return;
        var flat = rf.flat[p.band] > 0 ? rf.flat[p.band] : t;
        var dev = p.m.a / t - 1;
        if (p.m.min < 1e8 && p.m.min > 1.2 * flat) dev = Math.max(dev, 0.9 * (p.m.min / flat - 1));
        var cyr = /[\u0400-\u04FF]/;
        var sev = sevPair(dev, p.ca === "u" || p.cb === "u", !(cyr.test(p.A.c.ch) && cyr.test(p.B.c.ch))), touch = false;
        if (p.ca !== "u" && p.cb !== "u" && p.m.min < 1e8 && p.m.min <= Math.max(2, 0.12 * flat)) { touch = true; sev = Math.max(sev, 0.78); }
        if ((p.ca === "p" || p.cb === "p") && dev > 0) sev = 0;
        var bandH = p.band === "cap" ? ref.cap : ref.xh;
        var gx0 = p.A.xu + p.PA.xmax, gx1 = p.B.xu + p.PB.xmin;
        items.push({ t: "pair", body: true, ln: li, i: p.i, a: p.A.c.ch, b: p.B.c.ch, gnA: p.A.c.gn || p.A.c.ch, gnB: p.B.c.gn || p.B.c.ch, key: key, dev: dev, sev: sev, touch: touch,
          band: p.band, gap: p.m.a, tgt: t, site: { dx: p.dx, n: p.n, D: p.D, PA: p.PA, PB: p.PB, t: t },
          x0: ln.ox + Math.min(gx0, gx1) * sc - 0.16 * 1000 * sc, x1: ln.ox + Math.max(gx0, gx1) * sc + 0.16 * 1000 * sc, y0: yTop(bandH), y1: ln.base });
      });
      var Lt = tTxt > 0 ? tTxt : R.t.xh;
      words.forEach(function (w) {
        if (!(Lt > 0)) return;
        var e = w.wu / 1000, r = 3;
        items.push({ t: "word", body: true, ln: li, i: w.i, key: key, ratio: r, wu: w.wu, em: e, dev: r / 3 - 1, sev: sevWord(e),
          x0: w.x0 - 0.06 * 1000 * sc, x1: w.x1 + 0.06 * 1000 * sc, y0: yTop(ref.xh), y1: ln.base });
      });
    }
    prev.forEach(function (it) {
      if (it.t === "rhy") { it.body = true; it.intended = false; items.push(it); }
    });
    return items;
  }

  /* ---------- общее: чистка, ненаписанные знаки, лишние пробелы ---------- */
  var INTENT = { modul: "tone,rhy,pair", ryvok: "all", tyaga: "pair", kaplya: "all", pixel: "tone,pair", applik: "all", stsepka: "tone,pair,rhy", kortes: "pair,tone", stolb: "tone,rhy" };
  var SPACE_FREE = 3;

  function relKinds() {
    var S = evalS(), v = S && INTENT[S.fontId];
    if (!v) return null;
    var o = {};
    (v === "all" ? ["pair", "tone", "word", "rhy"] : v.split(",")).forEach(function (k) { o[k] = true; });
    return o;
  }
  function distortOn() {
    try { return !!(window.__GT_DISTORT_API && window.__GT_DISTORT_API.active()); } catch { return false; }
  }
  function missingMap(lines) {
    return lines.map(function (ln) {
      return ln.chars.map(function (c) {
        if (!/[\p{L}\p{N}]/u.test(c.ch)) return false;
        var g = glyph(c.gn || c.ch, ln.key);
        return !g || !!g.ph || !(g.cs && g.cs.length);
      });
    });
  }
  function clean(items, lines) {
    var miss = missingMap(lines);
    return items.filter(function (it) {
      var m = miss[it.ln];
      if (m && (m[it.i] || (it.t !== "tone" && it.i > 0 && m[it.i - 1]))) return false;
      if (!isFinite(it.sev)) it.sev = 0;
      if (!isFinite(it.dev)) it.dev = 0;
      return true;
    });
  }
  function coverage(lines) {
    var miss = missingMap(lines), used = {}, skip = {};
    lines.forEach(function (ln, li) {
      ln.chars.forEach(function (c, i) {
        if (!/[\p{L}\p{N}]/u.test(c.ch)) return;
        if (miss[li][i]) skip[c.ch] = 1; else used[c.ch] = 1;
      });
    });
    return { used: Object.keys(used), skipped: Object.keys(skip) };
  }
  /* Пробел из нескольких пробелов подряд: явный выброс, даже когда медиана по тексту нормальная. */
  function markWords(items, lines, kinds) {
    var sc = curSc, byLine = {};
    items.forEach(function (it) {
      if (it.t !== "word") return;
      if (kinds && kinds.word && !it.xs) it.sev = 0;
      var ln = lines[it.ln];
      if (!ln || !sc || !(it.i > 0)) return;
      var A = ln.chars[it.i - 1], B = ln.chars[it.i];
      var gA = glyph(A.gn || A.ch, ln.key), gS = byLine[ln.key] || (byLine[ln.key] = glyph(" ", ln.key));
      if (!gA || !gS || !(gS.adv > 0)) return;
      var free = (B.x - A.x) / sc - gA.adv, k = Math.round(free / gS.adv);
      it.xk = k;
      var extra = k >= SPACE_FREE ? clamp01((k - SPACE_FREE + 1) / 3) : 0;
      if (extra > 0) {
        it.xs = extra;
        it.sev = Math.max(it.sev || 0, extra);
        it.ratio = Math.max(it.ratio || 0, 3 * k);
      }
    });
  }
  function verdictFor(score) {
    return score >= 90 ? "Читается ровно." : score >= 78 ? "Ровно, но есть места, где глаз споткнётся." : score >= 60 ? "Пятно неровное, сбои видны в тексте." : "Пятно рваное, глаз спотыкается на каждой строке.";
  }
  function post(res, list, lines) {
    if (!res) return res;
    var out = list.filter(function (it) {
      return it.t === "word" && it.xs >= 0.3 && !(res.finds || []).some(function (f) { return f.items && f.items.indexOf(it) >= 0; });
    });
    if (out.length && res.finds) {
      var pen = 0, before = res.score;
      out.forEach(function (it, n) {
        var g = { t: "word", items: [it], ratio: it.ratio, em: it.em, sev: it.xs, k: "w:x" + it.ln + "." + it.i, dev: it.ratio / 3 - 1, rank: it.xs * 0.9 };
        it.f = g;
        res.finds.push(g);
        pen += 7 * Math.pow(it.xs, 1.5) * 0.5 * (n < 8 ? 1 : 0.5);
      });
      res.finds.sort(function (a, b) { return b.rank - a.rank; });
      res.top = res.finds.slice(0, 5);
      if (typeof before === "number" && isFinite(before)) {
        res.score = Math.max(0, Math.min(100, Math.round(before - pen)));
        if (res.verdict && res.verdict === verdictFor(before)) res.verdict = verdictFor(res.score);
      }
    }
    var cv = coverage(lines);
    res.gtUsed = cv.used.length;
    res.gtSkipped = cv.skipped;
    return res;
  }

  /* ---------- шрифты с задуманной неровностью: оценка по отклонению от рисунка шрифта ---------- */
  var PG = new Map();
  function plain(ch, key) {
    var S = evalS(), st = S && S.styles && S.styles[key];
    if (!st || typeof window.finalGlyph !== "function") return null;
    var sig = "", cu = S.custom && S.custom[ch];
    try { sig = window.styleSig(key); } catch { sig = ""; }
    var k = S.fontId + "|" + key + "|" + ch + "|" + sig + "|" + (cu ? cu.v : "");
    if (PG.has(k)) return PG.get(k);
    var g = null;
    try { g = window.finalGlyph(ch, st, {}); } catch { g = null; }
    if (PG.size > 800) PG.clear();
    PG.set(k, g);
    return g;
  }
  /* у шрифта с задуманной неровностью эталон — его же рисунок, поэтому порог ниже штатного: любое заметное отклонение — правка */
  var sevPairStd = function (d) { return d < 0 ? clamp01((-d - 0.10) / 0.30) : clamp01((d - 0.12) / 0.30); };
  var sevToneRel = function (d) { return clamp01((Math.abs(d) - 0.08) / 0.27); };

  function relative(items, lines, refs, sc, HM, kinds) {
    var dist = distortOn(), idx = {}, tones = [], pairs = [], words = [];
    items.forEach(function (it) { idx[it.t + "|" + it.ln + "|" + it.i] = it; it.rel = true; });
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li], key = ln.key, ref = refs[key] || ln.ref;
      if (!ref) continue;
      var info = ln.chars.map(function (c) {
        var n = c.gn || c.ch, g = glyph(n, key);
        if (!(g && g.cs && g.cs.length)) return null;
        var g0 = dist ? null : plain(n, key), ok = g0 && g0.cs && g0.cs.length;
        return { c: c, g: g, P: HM.prof(g, ref.cap, ref.xh), g0: ok ? g0 : null, P0: ok ? HM.prof(g0, ref.cap, ref.xh) : null };
      });
      for (var i = 0; i < info.length; i++) {
        var B = info[i], it = idx["tone|" + li + "|" + i];
        if (it && kinds.tone) {
          if (dist) { if (!it.warp) { it.sev = 0; it.dev = 0; } }
          else if (B && B.P0) {
            var cl = cls(B.c.ch), a = cl === "l" ? B.P.areaX : B.P.areaC, a0 = cl === "l" ? B.P0.areaX : B.P0.areaC;
            var dA = a0 > 0 ? a / a0 - 1 : 0, raw;
            if (B.P.sw > 0 && B.P0.sw > 0) raw = 0.8 * (B.P.sw / B.P0.sw - 1) + 0.2 * dA; else raw = 0.4 * dA;
            tones.push({ it: it, raw: Math.max(-0.6, Math.min(0.6, raw)) });
          } else { it.sev = 0; it.dev = 0; }
        }
        if (!i) continue;
        var pit = idx["pair|" + li + "|" + i], A = info[i - 1];
        var wit = idx["word|" + li + "|" + i];
        if (wit && !dist && A && B && A.P0 && B.P0 && wit.wu > 0) {
          var rmax = -1e9, lmin = 1e9, r;
          for (r = 0; r < ref.nX; r++) {
            if (A.P0.R[r] === A.P0.R[r] && A.P0.R[r] > rmax) rmax = A.P0.R[r];
            if (B.P0.L[r] === B.P0.L[r] && B.P0.L[r] < lmin) lmin = B.P0.L[r];
          }
          if (rmax > -1e8 && lmin < 1e8) {
            var dxw = (B.c.x - A.c.x) / sc, wu0 = A.P0.adv + (dxw - A.g.adv) + lmin - rmax;
            if (wu0 > 40) words.push({ it: wit, dev: wit.wu / wu0 - 1 });
          }
        }
        if (pit && kinds.pair) {
          if (dist) { if (!pit.warp) { pit.sev = 0; pit.dev = 0; pit.touch = false; } }
          else if (A && B && A.P0 && B.P0 && pit.site) {
            var st = pit.site, dx0 = A.P0.adv + (st.dx - A.g.adv), m0 = HM.areaGap(A.P0, B.P0, dx0, st.n, st.D), e = 0.1 * st.D;
            pairs.push({ it: pit, raw: (pit.gap + e) / (m0.a + e) - 1, m0: m0, ref: ref });
          } else { pit.sev = 0; pit.dev = 0; pit.touch = false; }
        }
      }
    }
    var mt = tones.length >= 3 ? med(tones.map(function (x) { return x.raw; })) : 0;
    tones.forEach(function (x) { x.it.dev = x.raw - mt; x.it.sev = sevToneRel(x.it.dev); });
    var bands = {};
    pairs.forEach(function (x) { (bands[x.it.band] = bands[x.it.band] || []).push(x.raw); });
    pairs.forEach(function (x) {
      var arr = bands[x.it.band], md = arr.length >= 3 ? med(arr) : 0, it = x.it;
      it.dev = (1 + x.raw) / (1 + md) - 1;
      it.sev = sevPairStd(it.dev);
      if (it.touch) {
        var flat = x.ref.flat[it.band] > 0 ? x.ref.flat[it.band] : it.tgt;
        if (x.m0.min < 1e8 && x.m0.min <= Math.max(2, 0.12 * flat)) it.touch = false; else it.sev = Math.max(it.sev, 0.78);
      }
      if ((cls(it.a) === "p" || cls(it.b) === "p") && it.dev > 0) it.sev = 0;
    });
    words.forEach(function (x) {
      var sv = sevPairStd(x.dev);
      x.it.sev = kinds.word ? sv : Math.max(x.it.sev || 0, sv);
      x.it.wdev = x.dev;
    });
    if (kinds.rhy) items.forEach(function (it) { if (it.t === "rhy") { it.sev = 0; it.dev = 0; } });
  }

  /* Неполный набор: штатный счётчик требует Н и О и не менее 12 знаков регистра. Оценку даём по тем знакам, что написаны,
     если их хотя бы три; недостающие просто не считаются. */
  var MIN_GLYPHS = 3;
  function enough(lines) {
    return coverage(lines).used.length >= MIN_GLYPHS;
  }
  function relaxMin(list, refs) {
    var seen = {}, cl = {}, n = 0;
    list.forEach(function (it) {
      if (it.t !== "tone" || seen[it.ch]) return;
      seen[it.ch] = 1; n++; cl[cls(it.ch)] = 1;
    });
    if (n < MIN_GLYPHS) return;
    Object.keys(refs || {}).forEach(function (k) {
      var m = refs[k] && refs[k].min;
      if (!m) return;
      ["l", "u", "d"].forEach(function (c) { if (m[c] && cl[c]) { m[c].any = true; m[c].ok = true; } });
    });
  }


  /* Классы знаков, которые штатный счётчик закрыл («мало знаков»): тон и пары считаем сами по тем же опорным числам. */
  function gated(ref, c) {
    return !!(ref && ref.min && ref.min[c] && ref.min[c].any && !ref.min[c].ok);
  }
  function fill(items, lines, refs, sc, HM) {
    var any = false;
    Object.keys(refs || {}).forEach(function (k) { if (gated(refs[k], "l") || gated(refs[k], "u") || gated(refs[k], "d")) any = true; });
    if (!any) return items;
    var out = items.filter(function (it) { return !(it.t === "pair" && it.abs); });
    var have = {};
    out.forEach(function (it) { have[it.t + "|" + it.ln + "|" + it.i] = 1; });
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li], key = ln.key, ref = refs[key] || ln.ref;
      if (!ref) continue;
      var info = ln.chars.map(function (c) {
        var g = glyph(c.gn || c.ch, key);
        return g && g.cs && g.cs.length && !g.ph ? { c: c, g: g, P: HM.prof(g, ref.cap, ref.xh), xu: c.x / sc } : null;
      });
      var yTop = function (cp) { return ln.base - cp * sc; };
      var sp = glyph(" ", key), spAdv = sp && sp.adv > 0 ? sp.adv : 250;
      var pl = [];
      for (var i = 0; i < info.length; i++) {
        var B = info[i];
        if (!B) continue;
        var cl = cls(B.c.ch);
        if (cl !== "p" && gated(ref, cl) && !have["tone|" + li + "|" + i]) {
          var R = ref.tone[cl];
          var area = cl === "l" ? B.P.areaX : B.P.areaC;
          if (R && R.n && B.P.adv > 0 && area > 0) {
            var band = cl === "l" ? ref.xh : ref.cap;
            var dD = Math.max(-0.6, Math.min(0.6, area / (B.P.adv * band) / R.dens - 1)), dev;
            if (!(R.sw > 0 && B.P.sw > 0)) dev = 0.4 * dD;
            else {
              var dS = Math.max(-0.6, Math.min(0.6, B.P.sw / R.sw - 1));
              dev = (B.P.stems && B.P.stems.length || dS > 0 ? 0.8 : 0.5) * dS + 0.2 * dD;
            }
            out.push({ t: "tone", ln: li, i: i, ch: B.c.ch, gn: B.c.gn || B.c.ch, key: key, dev: dev, sev: sevTone(dev),
              x0: ln.ox + B.xu * sc, x1: ln.ox + (B.xu + B.g.adv) * sc, y0: yTop(band), y1: ln.base });
          }
        }
        if (!i || !info[i - 1]) continue;
        var A = info[i - 1], dx = B.xu - A.xu;
        if (dx - A.g.adv > 0.45 * spAdv) continue;
        var ca = cls(A.c.ch), cb = cls(B.c.ch);
        var bnd = (ca === "u" || ca === "d") && (cb === "u" || cb === "d") ? "cap" : "xh";
        if (!gated(ref, bnd === "cap" ? "u" : "l") || have["pair|" + li + "|" + i]) continue;
        if (typeof window.kernBlocked === "function" && window.kernBlocked(A.c.ch, B.c.ch)) continue;
        var n = bnd === "cap" ? N : ref.nX, D = ref.D[bnd];
        pl.push({ i: i, A: A, B: B, band: bnd, n: n, D: D, m: HM.areaGap(A.P, B.P, dx, n, D), dx: dx, ca: ca, cb: cb });
      }
      var tTxt = med(pl.map(function (p) { return p.m.a; }));
      pl.forEach(function (p) {
        var t = ref.t[p.band];
        if (!(t > 0)) t = tTxt;
        if (!(t > 0)) return;
        var flat = ref.flat[p.band] > 0 ? ref.flat[p.band] : t;
        var dev = p.m.a / t - 1;
        if (p.m.min < 1e8 && p.m.min > 1.2 * flat) dev = Math.max(dev, 0.9 * (p.m.min / flat - 1));
        var sev = sevPairStd0(dev), touch = false;
        if (p.m.min < 8) { touch = true; sev = Math.max(sev, 0.78); }
        if ((p.ca === "p" || p.cb === "p") && dev > 0) sev = 0;
        var bandH = p.band === "cap" ? ref.cap : ref.xh;
        var gx0 = p.A.xu + p.A.P.xmax, gx1 = p.B.xu + p.B.P.xmin;
        out.push({ t: "pair", ln: li, i: p.i, a: p.A.c.ch, b: p.B.c.ch, gnA: p.A.c.gn || p.A.c.ch, gnB: p.B.c.gn || p.B.c.ch, key: key, dev: dev, sev: sev, touch: touch,
          band: p.band, gap: p.m.a, tgt: t, site: { dx: p.dx, n: p.n, D: p.D, PA: p.A.P, PB: p.B.P, t: t },
          x0: ln.ox + Math.min(gx0, gx1) * sc - 0.16 * 1000 * sc, x1: ln.ox + Math.max(gx0, gx1) * sc + 0.16 * 1000 * sc, y0: yTop(bandH), y1: ln.base });
      });
    }
    return out;
  }
  var sevPairStd0 = function (d) { return d < 0 ? clamp01((-d - 0.25) / 0.40) : clamp01((d - 0.40) / 0.50); };

  function hook() {
    var HM = window.HEAT;
    if (!HM || typeof HM.summarize !== "function" || typeof HM.analyze !== "function") return false;
    if (HM.summarize.__gtBody) return true;
    var origSum = HM.summarize, origAnalyze = HM.analyze;
    var sum = function (items, lines, refs) {
      var S = evalS();
      if (!items || !lines || !S) return origSum.apply(this, arguments);
      var id = S.fontId, body = id === FONT, kinds = relKinds();
      var list = items;
      if (!items.some(function (x) { return x.body || x.rel; })) {
        list = clean(items, lines);
        if (curSc && enough(lines)) list = fill(list, lines, refs, curSc, HM);
        if (body && curSc) list = measure(list, lines, refs, curSc, HM);
        if (!body && kinds && curSc) relative(list, lines, refs, curSc, HM, kinds);
        markWords(list, lines, body ? null : kinds);
      }
      relaxMin(list, refs);
      var res;
      if (body || kinds) {
        S.fontId = "";
        try { res = origSum.call(this, list, lines, refs); }
        finally { S.fontId = id; }
      } else res = origSum.call(this, list, lines, refs);
      if (res) res.gtMode = body ? "body" : kinds ? "rel" : "std";
      return post(res, list, lines);
    };
    sum.__gtBody = true;
    sum.__gtOrig = origSum;
    HM.summarize = sum;
    var an = function (lines, sc) {
      curSc = sc;
      var saved = window.gfSmart;
      if (typeof saved !== "function") return origAnalyze.apply(this, arguments);
      window.gfSmart = function () {
        var g = saved.apply(this, arguments);
        return g && g.ph ? null : g;
      };
      try { return origAnalyze.apply(this, arguments); }
      finally { window.gfSmart = saved; }
    };
    an.__gtBodyScale = true;
    HM.analyze = an;
    var origToggle = HM.toggle;
    HM.toggle = function (on) {
      if (!autoCall && HM.on && (on === undefined || !on)) userOff = true;
      return origToggle.apply(this, arguments);
    };
    return true;
  }

  var autoCall = false, userOff = false, autoFor = "";
  function lastRes() {
    var H = window.HEAT;
    return H && (H.lastPf || H.last);
  }
  function note(rep, cls_, html) {
    var el = rep.querySelector("." + cls_);
    if (!html) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("p");
      el.className = "hr-intent " + cls_;
      var sc = rep.querySelector(".hr-score"), prev = rep.querySelector(".hr-body-note");
      (cls_ === "hr-cnt-note" && prev ? prev : sc).after(el);
    }
    if (el.innerHTML !== html) el.innerHTML = html;
  }
  function tune() {
    var S = evalS(), H = window.HEAT;
    if (!S || !H) return;
    var id = S.fontId, body = id === FONT, rel = !!INTENT[id];
    if (id === "imp") {
      if (S.tab === "edit" && !H.on && !userOff && autoFor !== "imp" && document.getElementById("heatb")) {
        autoFor = "imp";
        autoCall = true;
        try { H.toggle(true); } finally { autoCall = false; }
      }
    } else autoFor = "";
    var rep = document.getElementById("heat-rep");
    if (rep && !rep.__gtTune) {
      rep.__gtTune = true;
      new MutationObserver(function () { tune(); }).observe(rep, { childList: true });
    }
    var res = lastRes();
    if (rep && rep.querySelector(".hr-score")) {
      var noFix = body || rel;
      if (noFix) {
        rep.querySelectorAll('[data-rp="fix"],[data-rp="fixs"]').forEach(function (b) {
          if (b.closest("li") && !b.closest("li").querySelector('[data-rp="glyph"]')) {
            b.setAttribute("data-rp", "glyph"); b.textContent = "Открыть знак";
          } else b.remove();
        });
      }
      var other = rep.querySelector(".hr-intent:not(.hr-body-note):not(.hr-cnt-note)");
      note(rep, "hr-body-note", other ? "" : body ? "<b>Связки не считаются.</b> Оценка по телам букв." : rel ? "<b>Неровность задумана рисунком.</b> Оценка по отклонениям от рисунка шрифта." : "");
      var sk = res && res.gtSkipped && res.gtSkipped.length;
      note(rep, "hr-cnt-note", sk ? "<b>В оценке " + res.gtUsed + " " + plural(res.gtUsed) + ".</b> Ненаписанные знаки пропущены: " + res.gtSkipped.length + "." : "");
    }
    var bar = document.getElementById("heatbar");
    if (bar) {
      var c = bar.querySelector(".heat-cnt"), r2 = H.last, txt = H.on && r2 && r2.gtSkipped && r2.gtSkipped.length ? "В оценке " + r2.gtUsed + " " + plural(r2.gtUsed) : "";
      if (txt && !c) {
        c = document.createElement("span");
        c.className = "heat-cnt";
        c.style.cssText = "font-size:var(--fs-sm);color:var(--muted);align-self:center;white-space:nowrap";
        bar.appendChild(c);
      }
      if (c) { c.textContent = txt; c.hidden = !txt; }
    }
    var tip = document.getElementById("heat-tip");
    if (tip && !tip.__gtTune) {
      tip.__gtTune = true;
      new MutationObserver(function () {
        var S2 = evalS();
        if (!S2 || !(S2.fontId === FONT || INTENT[S2.fontId])) return;
        var acts = tip.querySelector(".ht-a");
        if (!acts) return;
        acts.querySelectorAll('[data-ha="fix"],[data-ha="fixs"],[data-ha="kern"]').forEach(function (b) { b.remove(); });
        if (!acts.querySelector("button")) {
          var g = document.createElement("button");
          g.type = "button"; g.className = "btn sm"; g.setAttribute("data-ha", "glyph"); g.textContent = "Открыть знак";
          acts.appendChild(g);
        }
      }).observe(tip, { childList: true });
    }
  }
  function plural(n) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? "знак" : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? "знака" : "знаков";
  }

  var tries = 0;
  function boot() {
    var ok = hook();
    tune();
    if (!ok && tries++ < 100) setTimeout(boot, 100);
  }
  boot();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  setInterval(tune, 600);
})();
