// «С листа бумаги»: уточнения обводки бланка и статусы частично заполненного листа.
(function () {
  "use strict";

  var STYLE_ID = "gtype-paper-patch";
  var DEFAULT_TEXT = "Съешь же ещё этих мягких французских булок, да выпей чаю. 0123456789";
  var WORDS =
    "дом том ком кот лук мак мох мир мост море мама папа тур порт парк форт гора город " +
    "утро путь лето луна сад сыр суп суд день доска слово пока она оно они тут там тогда " +
    "ветер вечер вода рука рыба река труд угол ум удар друг сутки лист штора щука " +
    "плод пол полк пост пока тихо кто что как так сто три три ура мышь стол стул стук " +
    "адрес арка бор борт бык брат бок борода век век верх вор вол воля газ гость гром " +
    "год гул дар дед дуб дым дух жук жар жуть зал зов зуб кость крот круг курс лов лодка " +
    "лоб луг мост мрак мука нос нота ночь нора обед окно озеро орёл осел ось отец пар пир " +
    "пол пыл ров рост рот рубка свет сила скот сон сорт спор срок стая стена стол стон " +
    "ток торт трос тут тыл удел уха фото хор хлеб цвет цель час чуть шар шум щит эхо юг яма";

  var MATCH = {};
  var DECIDED = {};
  var pageOfN = typeof WeakMap === "function" ? new WeakMap() : null;

  function ready() {
    try {
      return typeof PPC === "object" && typeof trcSync === "function" && typeof PP === "object";
    } catch {
      return false;
    }
  }

  /* ---------- обводка: контур не должен терять отверстия и острова ---------- */

  function labelMask(mask, W, H, want, eight) {
    var lab = new Int32Array(W * H);
    var stack = new Int32Array(W * H);
    var comps = [];
    for (var s = 0; s < W * H; s++) {
      if (mask[s] !== want || lab[s]) continue;
      var id = comps.length + 1;
      var sp = 0;
      var area = 0;
      var border = false;
      var cy0 = H;
      var cy1 = -1;
      stack[sp++] = s;
      lab[s] = id;
      while (sp) {
        var p = stack[--sp];
        var x = p % W;
        var y = (p / W) | 0;
        area++;
        if (y < cy0) cy0 = y;
        if (y > cy1) cy1 = y;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            if (!eight && dx && dy) continue;
            var nx = x + dx;
            var ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            var q = ny * W + nx;
            if (mask[q] !== want || lab[q]) continue;
            lab[q] = id;
            stack[sp++] = q;
          }
        }
      }
      comps.push({ area: area, border: border, y0: cy0, y1: cy1 });
    }
    return comps;
  }

  function expectedContours(prep, thr) {
    var W = prep.W;
    var H = prep.H;
    var g = prep.g;
    var ink = new Uint8Array(W * H);
    for (var i = 0; i < W * H; i++) ink[i] = g[i] < thr ? 1 : 0;
    var minInk = Math.max(10, 0.0015 * W * H);
    var minHole = Math.max(16, 0.0025 * W * H);
    var inks = labelMask(ink, W, H, 1, true).filter(function (c) {
      return c.area >= minInk;
    }).length;
    var bg = labelMask(ink, W, H, 0, false).filter(function (c) {
      return !c.border && c.area >= minHole;
    }).length;
    return inks + bg;
  }

  function resample(prep, s) {
    var W = Math.max(8, Math.round(prep.W * s));
    var H = Math.max(8, Math.round(prep.H * s));
    var sx = prep.W / W;
    var sy = prep.H / H;
    var out = new Float32Array(W * H);
    var src = prep.g;
    var x;
    var y;
    if (s < 1) {
      for (y = 0; y < H; y++) {
        var y0 = Math.floor(y * sy);
        var y1 = Math.max(y0 + 1, Math.min(prep.H, Math.ceil((y + 1) * sy)));
        for (x = 0; x < W; x++) {
          var x0 = Math.floor(x * sx);
          var x1 = Math.max(x0 + 1, Math.min(prep.W, Math.ceil((x + 1) * sx)));
          var sum = 0;
          var cnt = 0;
          for (var yy = y0; yy < y1; yy++) {
            for (var xx = x0; xx < x1; xx++) {
              sum += src[yy * prep.W + xx];
              cnt++;
            }
          }
          out[y * W + x] = sum / cnt;
        }
      }
    } else {
      for (y = 0; y < H; y++) {
        var fy = Math.min(prep.H - 1.001, Math.max(0, (y + 0.5) * sy - 0.5));
        var iy = fy | 0;
        var ty = fy - iy;
        for (x = 0; x < W; x++) {
          var fx = Math.min(prep.W - 1.001, Math.max(0, (x + 0.5) * sx - 0.5));
          var ix = fx | 0;
          var tx = fx - ix;
          var i0 = iy * prep.W + ix;
          out[y * W + x] =
            (src[i0] * (1 - tx) + src[i0 + 1] * tx) * (1 - ty) +
            (src[i0 + prep.W] * (1 - tx) + src[i0 + prep.W + 1] * tx) * ty;
        }
      }
    }
    return { g: out, W: W, H: H, otsu: prep.otsu, blur: {}, sEff: (W / prep.W + H / prep.H) / 2 };
  }

  function backToPrep(r, rs) {
    var s = rs.sEff;
    var tf = r.tf;
    return Object.assign({}, r, {
      tf: { ox: (tf.ox + 0.5) / s - 0.5, oy: (tf.oy + 0.5) / s - 0.5, u: tf.u * s },
      k: r.k / s,
    });
  }

  function install() {
    var origTrc = trcSync;
    var origSlice = PPC.sliceCell;
    var origPhoto = PPC.processPhoto;
    var plans = [
      [1, 0], [1, -20], [1, 20], [0.5, 0], [0.5, -20], [0.75, 0], [0.75, -20],
      [0.6, 0], [1.5, 0], [0.5, 20], [0.4, 0], [1.25, -20], [2, 0],
    ];

    trcSync = function (prep, opt) {
      var r = origTrc.apply(this, arguments);
      try {
        if (!PP.open || !prep || !prep.g || !prep.W || !prep.H) return r;
        var thr = Math.max(1, Math.min(254, +(opt && opt.thr) || prep.otsu));
        var want = expectedContours(prep, thr);
        var got = r && r.cs ? r.cs.length : 0;
        if (got >= want) return r;
        var best = r;
        var bestGot = got;
        var sm0 = opt && opt.smooth != null ? opt.smooth : 40;
        for (var i = 0; i < plans.length; i++) {
          var s = plans[i][0];
          var sm = Math.max(0, Math.min(100, sm0 + plans[i][1]));
          var rs = s === 1 ? prep : resample(prep, s);
          var o2 = Object.assign({}, opt, { smooth: sm });
          var r2 = origTrc.call(this, rs, o2);
          if (!r2 || !r2.cs || !r2.cs.length) continue;
          var n2 = r2.cs.length;
          if (n2 > bestGot) {
            best = s === 1 ? r2 : backToPrep(r2, rs);
            bestGot = n2;
          }
          if (n2 >= want) break;
        }
        return best;
      } catch {
        return r;
      }
    };

    PPC.processPhoto = function () {
      var r = origPhoto.apply(this, arguments);
      try {
        if (r && r.ok && r.n && pageOfN) pageOfN.set(r.n, r.code ? r.code.page : 0);
      } catch {}
      return r;
    };

    /* ---------- сверка ячейки с эталоном нейтрального гротеска (Строка) ---------- */

    var MN = 48;
    var ZG = 12;
    var MARGIN = 0.15;
    var ABS_MIN = 0.7;
    var REF_RAW = "А|1.0|0.0|AAAP8AAAAAAP8AAAAAAf+AAAAAAf+AAAAAA//AAAAAA//AAAAAB//gAAAAB//gAAAAB//gAAAAD//wAAAAD//wAAAAH//4AAAAH//4AAAAP+f8AAAAP+f8AAAAP8P8AAAAf8P+AAAAf8P+AAAA/4H/AAAA/4H/AAAB/wD/gAAB/wD/gAAB/wD/gAAD/gB/wAAD/gB/wAAH/gA/4AAH/AA/4AAH/AA/8AAP+AAf8AAP+AAf8AAf////+AAf////+AA//////AA//////AA//////AB//////gB//////gD/wAAD/wD/gAAB/wH/gAAB/4H/gAAA/4H/AAAA/4P/AAAA/8P+AAAAf8f+AAAAf+f+AAAAP+/8AAAAP//8AAAAP/;Б|1.0|0.0|///////w///////w///////w///////w///////w///////w///////w/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8B//AAA/8f///gA/8////4A//////+A///////A///////w///////4///////4/+AAAH/8/8AAAB/+/8AAAA/+/8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf+/8AAAA/+/8AAAD/+/+AAAP/8///////4///////w///////g///////A/9////8A/8////wA/8P//+AA;В|1.0|0.0|/8////gA/9////4A//////+A///////A///////g///////w///////4/8AAAD/4/8AAAB/8/8AAAA/8/8AAAA/8/8AAAA/8/8AAAAf8/8AAAAf8/8AAAAf8/8AAAAf8/8AAAA/8/8AAAA/4/8AAAB/4/8AAAB/w/+AAAH/g///////A//////+A///////A///////g/+AAAD/w/8AAAA/4/8AAAAf8/8AAAAf+/8AAAAP+/8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAA/+/8AAAB/+///////8///////4///////4///////g///////A/9////8A/8f///gA;Г|1.0|0.0|//////////////////////////////////////////////////////////AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA;Д|1.0|-0.17|AA/////wAA/////wAA/////wAA/////wAA/////wAA/////wAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfw/////////////////////////////////////////////////gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB/fgAAAAB+;Е|1.0|0.0|/////////////////////////////////////////////////////////+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA///////g///////g///////g///////g///////g///////g///////g///////g/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA////////////////////////////////////////////////////////;Ё|1.241|0.0|AAPwD8AAAAf4H+AAAA/8P+AAAAf4P+AAAAPwH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////////////////////////////////////////////////+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA///////g///////g///////g///////g///////g///////g/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA////////////////////////////////////////////////;Ж|1.0|0.0|/gAH4AB/fwAH4AD+fwAH4AD+P4AH4AH8H8AH4AP4H8AH4AP4D+AH4AfwD+AH4AfwB/AH4A/gA/gH4B/AA/gH4B/AAfwH4D+AAP4H4H8AAP4H4H8AAH8H4P4AAH8H4P4AAD+H4fwAAB/H4/gAAB/H4/gAAB/n5/gAAB/37/gAAD/37/wAAD////wAAD7//3wAAH7//34AAH7//34AAP7//38AAPx//j8AAPw//D8AAfg//B+AAfgf+B+AA/gf+B/AA/AP8A/AA/AH4A/AB+AH4AfgB+AH4AfgD+AH4AfwD8AH4APwD8AH4APwH4AH4AH4H4AH4AH4P4AH4AH8PwAH4AD8PwAH4AD8fgAH4AB+fgAH4AB+/gAH4AB//AAH4AA/;З|1.014|-0.014|H/////4AP//////gP//////4f//////+f//////+////////////////AAAAAP//AAAAAB//AAAAAA//AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAA//AAAAAD//AAB////+AAB////8AAB////4AAB////4AAB////8AAB////+AAA/////AAAAAA//AAAAAAf/AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAA//AAAAAD//AAAAAf//////////////////f//////+f//////8P//////4P//////AH/////wA;И|1.0|0.0|/4AAAAP//4AAAAf//4AAAA///4AAAB///4AAAD///4AAAD///4AAAH///4AAAP///4AAAf///4AAA////4AAA////4AAB////4AAD/3//4AAH/n//4AAP/n//4AAP/H//4AAf+H//4AA/8H//4AB/4H//4AB/4H//4AD/wH//4AH/gH//4AP/AH//4Af+AH//4Af+AH//4A/8AH//4B/4AH//4D/wAH//4H/gAH//4H/gAH//4P/AAH//4f+AAH//4/8AAH//5/8AAH//5/4AAH//7/wAAH////gAAH////AAAH////AAAH///+AAAH///8AAAH///4AAAH///wAAAH///wAAAH///gAAAH///AAAAH//+AAAAH//8AAAAH/;Й|1.241|0.0|AAOAAcAAAAPgB8AAAAH//4AAAAD//wAAAAB//gAAAAA//AAAAAAH4AAAAAAAAAAAAAAAAAAA/4AAAAP//4AAAAf//4AAAA///4AAAB///4AAAD///4AAAH///4AAAP///4AAAf///4AAA////4AAB////4AAD/3//4AAH/n//4AAP/H//4AAf+H//4AA/8H//4AB/4H//4AD/wH//4AH/gH//4AP/AH//4Af+AH//4A/8AH//4B/4AH//4D/wAH//4H/gAH//4P/AAH//4f+AAH//4/8AAH//5/4AAH//7/wAAH////gAAH////AAAH///+AAAH///8AAAH///4AAAH///wAAAH///gAAAH///AAAAH//+AAAAH//8AAAAH/;К|1.0|0.0|/4AAAB///4AAAD/+/4AAAH/4/4AAAf/w/4AAA//g/4AAB//A/4AAD/+A/4AAH/8A/4AAP/4A/4AAf/wA/4AA//AA/4AD/+AA/4AH/8AA/4AP/4AA/4Af/wAA/4A//gAA/4B//AAA/4D/8AAA/4P/4AAA/4f/4AAA/4//8AAA/5//+AAA/7/3+AAA///3/AAA///n/gAA///n/wAA///H/wAA//+D/4AA//8B/8AA//4A/+AA//wA/+AA//AAf/AA/+AAP/gA/8AAP/wA/4AAH/wA/4AAD/4A/4AAB/8A/4AAB/+A/4AAA/+A/4AAAf/A/4AAAP/g/4AAAP/w/4AAAH/w/4AAAD/4/4AAAD/8/4AAAB/8/4AAAA/+/4AAAAf/;Л|1.0|-0.014|AH//////AH//////AH//////AH//////AH//////AH//////AH//////AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AH/AAAH/AP/AAAH/AP/AAAH/AP/AAAH////AAAH////AAAH///+AAAH///+AAAH///8AAAH///4AAAH///gAAAH/;М|1.0|0.0|/gAAAAB//wAAAAD//wAAAAD//4AAAAH//4AAAAH//8AAAAP//8AAAAP//8AAAAP//+AAAAf//+AAAAf///AAAA////AAAA////gAAB////gAAB////wAAD////wAAD////wAAD////4AAH///v4AAH9//v8AAP9//n8AAP5//n+AAf5//j+AAfx//j+AAfx//h/AA/h//h/AA/h//h/gB/h//g/gB/B//g/wD/B//gfwD+B//gf4H+B//gP4H8B//gP4H8B//gP8P8B//gH8P4B//gH+f4B//gD+fwB//gD//wB//gB//gB//gB//gB//gB//gB//gA//AB//gA//AB//gAf+AB//gAf+AB//gAP8AB//gAP8AB//gAH4AB/;Н|1.0|0.0|/4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//////////////////////////////////////////////////////////////////4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH/;О|1.014|-0.014|AAA//AAAAAP//8AAAA////AAAD////wAAH////4AAP////8AA//////AA//wD//AB/+AAf/gD/8AAP/wH/wAAD/4H/gAAB/4P/gAAB/8P/AAAA/8f+AAAAf+f+AAAAf+f8AAAAf+f8AAAAP+/8AAAAP//8AAAAP//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//8AAAAP//8AAAAP/f8AAAAP+f8AAAAf+f+AAAAf+f+AAAAf+P/AAAA/8P/gAAB/8H/gAAB/4H/wAAD/4D/8AAP/wB/+AAf/gA//wD//AA//////AAP////8AAH////4AAD////wAAA////AAAAP//8AAAAA//AAA;П|1.0|0.0|/////////////////////////////////////////////////////////4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH/;Р|1.0|0.0|/8f///AA/8////4A//////+A///////g///////w///////4///////8/+AAAH/8/8AAAB/+/8AAAA/+/8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAA/+/8AAAB/+/+AAAP/8///////8///////4///////w///////A/9////+A/8////4A/8P//+AA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA;С|1.014|-0.014|AAP////4AD/////8AP/////8A//////+D//////+H///////P///////f//wAAAAf/+AAAAA//4AAAAA//gAAAAA//AAAAAA//AAAAAA/+AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//gAAAAA//4AAAAAf/+AAAAAf//wAAAAP///////H///////D//////+A//////+AP/////8AD/////8AAP////4;Т|1.0|0.0|////////////////////////////////////////////////////////AAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAA;У|1.0|0.0|/8AAAA///8AAAB/+f+AAAB/8f+AAAD/8P+AAAH/4P/AAAH/wP/AAAP/wH/gAAf/gH/gAA//AH/gAA/+AD/wAB/+AD/wAD/8AB/4AH/4AB/4AH/wAB/4AP/wAA/8Af/gAA/8Af/AAAf+A//AAAf+B/+AAAf+D/8AAAP/D/4AAAP/H/4AAAH/v/wAAAH/v/gAAAH///AAAAD///AAAAD//+AAAAB//8AAAAB//8AAAAB//4AAAAA//wAAAAA//gAAAAAf/gAAAAA//AAAAAA/+AAAAAB/+AAAAAD/8AAAAAH/4AAAAAH/wAAAAAP/wAAAAAf/gAAAAA//AAAAAA/+AAAAAB/+AAAAAD/8AAAAAD/4AAAAAH/4AAAAAP/wAAAAA;Ф|1.0|0.0|AAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAf/H4/8AA//37//AB//////gD//////wH//////4H//////4P//////8P+AP8Af8f8AP8AP+f4AH4AH+fwAH4AD+fwAH4AD+/gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB/fwAH4AD+fwAH4AD+f4AH4AH+f8AP8AP+P+AP8Af8P//////8H//////4H//////4D//////wB//////gA//37//AAf/H4/8AAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAA;Х|1.0|0.0|/+AAAAf/f/AAAA/+P/AAAA/8H/gAAB/4H/wAAD/4D/4AAH/wB/4AAH/gA/8AAP/AA/+AAf/AAf/AA/+AAP/gB/8AAH/gB/4AAD/wD/wAAD/4H/wAAB/8P/gAAA/+f/AAAAf+f+AAAAP//8AAAAP//8AAAAH//4AAAAD//wAAAAB//gAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAB//gAAAAD//wAAAAH//4AAAAP//8AAAAP//8AAAAf+f+AAAA/+f/AAAB/8P/gAAD/4H/wAAD/wD/wAAH/gB/4AAP/gB/8AAf/AA/+AA/+AAf/AA/8AAP/AB/4AAH/gD/4AAH/wH/wAAD/4H/gAAB/4P/AAAA/8f/AAAA/+/+AAAAf/;Ц|1.0|-0.17|/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A/wAAAB/A////////////////////////////////////////////////AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD+;Ч|1.0|0.0|/4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//8AAAAH//8AAAAH//8AAAAH//+AAAAH/f+AAAAH/f/AAAAP/P/wAAAP/P///////H///////D///////B///////Af//////AP////n/AB////H/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/AAAAAAH/;Ш|1.0|0.0|/AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA/////////////////////////////////////////////////////////;Щ|1.0|-0.17|+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw+AAfgAPw////////////////////////////////////////////////AAAAAAA/AAAAAAAfAAAAAAAfAAAAAAAfAAAAAAAfAAAAAAAfAAAAAAAe;Ъ|1.0|0.0|///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wf8AAAB/z//4AAB/3//+AAB/////AAB/////wAB/////4AB/////4AB/////8AB/wAA/+AB/wAAf+AB/wAAP+AB/wAAH/AB/wAAH/AB/wAAD/AB/wAAD/AB/wAAD/AB/wAAD/AB/wAAD/AB/wAAD/AB/wAAH/AB/wAAH/AB/wAAP+AB/wAAf+AB/4AB/8AB/////8AB/////4AB/////wAB/////gAB/////AAB/3//8AAB/x//wA;Ы|1.0|0.0|/gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//g//wAB//n///gB//v///wB//////8B//////+B///////B///////B///////h//gAAD/h//gAAB/x//gAAA/x//gAAAfx//gAAAfx//gAAAf5//gAAAP5//gAAAP5//gAAAP5//gAAAP5//gAAAf5//gAAAfx//gAAAfx//gAAA/x//gAAB/x//wAAD/h///////h///////B//////+B//////8B//////4B//v///wB//n///AB/;Ь|1.0|0.0|/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8B//AAA/8f///gA/8////4A//////+A///////A///////w///////4///////4/+AAAH/8/8AAAB/+/8AAAA/+/8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf+/8AAAA/+/8AAAD/+/+AAAP/8///////4///////w///////g///////A/9////8A/8////wA/8P//+AA;Э|1.014|-0.014|H////8AAP/////wAP/////8Af//////Af//////w///////4///////8AAAAB//+AAAAAP/+AAAAAD//AAAAAB//AAAAAA//AAAAAAf/AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AD//////AD//////AD//////AD//////AD//////AD//////AB//////AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAA//AAAAAB//AAAAAD//AAAAAP/+AAAAB//+///////8///////4f//////wf//////AP/////8AP/////wAH////8AA;Ю|1.014|-0.014|/AAAB/gA/gAAP/4A/gAAf/8A/gAA//+A/gAB///A/gAD///g/gAH///w/gAH/B/w/gAP+Af4/gAP8AP8/gAf4AP8/gAfwAH8/gAfwAH+/gA/gAD+/gA/gAD+/gA/gAD+/gA/gAB//gA/AAB//gB/AAB//gB/AAB/////AAB/////AAB/////AAB/////AAB/////AAB/////AAB/////AAB//gB/AAB//gB/AAB//gB/AAB//gA/gAB//gA/gAB//gA/gAD+/gA/gAD+/gA/gAD+/gAfwAH+/gAfwAH8/gAf4AP8/gAP8AP8/gAP8Af4/gAH/B/w/gAH///w/gAD///g/gAB///A/gAA//+A/gAAf/8A/gAAP/4A/AAAD/gA;Я|1.0|0.0|AAf//+H/AD////n/AP////3/Af//////A///////B///////D///////H/8AAAP/H/wAAAP/P/gAAAH/P/AAAAH/P/AAAAH/P+AAAAH/P+AAAAH/P+AAAAH/P+AAAAH/P/AAAAH/P/AAAAH/P/gAAAH/H/wAAAP/H/8AAAf/D///////B///////A///////Af//////AP////3/AD////n/AAf//+H/AAD/+AH/AAH/8AH/AAH/4AH/AAP/wAH/AAf/gAH/AA//AAH/AB/+AAH/AD/+AAH/AD/8AAH/AH/4AAH/AP/wAAH/Af/gAAH/A//AAAH/B/+AAAH/D/+AAAH/D/8AAAH/H/4AAAH/P/wAAAH/f/gAAAH///AAAAH/;а|0.764|-0.014|A/////gAA/////4AB/////+AB//////gB//////wD//////4D//////4H//////8H//////+AAAAAP/+AAAAAD/+AAAAAB//AAAAAB//AAAAAA//AAAAAA//AAAAAAf/AAAAAAf/AAAAAAf/AD///+P/AP////P/A///////B///////D///////H///////P///////P///////f///////f/wAAA////AAAAf//+AAAAf//+AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAf///AAAAf/f/gAAA//f///////f///////P///////H///////D///////B///////A///////AP////P/AD///+AA;б|1.057|-0.014|AAP////AAB/////gAP/////gAf/////wB//////wD//////4H//////wP//gAAAAf/+AAAAAf/4AAAAAf/wAAAAA//gAAAAA//AAAAAA/////gAA/////+AA//////wA//////8A//////+A///////A///////w/+AAA//4/+AAAH/4/8AAAD/8/8AAAB/+/8AAAA/+/8AAAAf+/8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAf//+AAAAf/f+AAAAf+f/AAAA/+f/gAAB/+P/wAAD/8H/4AAH/4H//AA//4D//////wB//////gAf////+AAP////8AAD////wAAAf//+AAAAB//gAA;в|0.75|0.0|/8////wA//////8A///////A///////g///////w///////w///////4///////4///////8/+AAAD/8/+AAAB/8/8AAAB/8/8AAAA/8/8AAAA/8/8AAAA/8/8AAAA/8/8AAAA/8/+AAAB/8/+AAAB/4//AAAD/4///////w///////g///////g///////w///////4///////8//AAAA/8/+AAAA/+/+AAAAf+/8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf//+AAAAf//+AAAA/////////+///////+///////+///////8///////4///////w///////g/9////+A/8////4A;г|0.75|0.0|//////////////////////////////////////////////////////////////////////////gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA//gAAAAA;д|0.75|-0.17|AA/////wAA/////wAA/////wAA/////wAA/////wAA/////wAA/////wAA/////wAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfwAA/gAAfw/////////////////////////////////////////////////////////gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB/fgAAAAB+fgAAAAB+;е|0.764|-0.014|AD////wAAf////+AA//////AD//////wH//////4P//////8P//////8f//////+f//////+//gAAB////AAAA///+AAAAf//+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//////////////////////////////////////////////////////////////////////////////////8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//gAAAAA//4AAAAA//+AAAAA///wAAAAf//////8f//////8P//////4H//////4D//////4B//////wAf/////wAD/////wAAP////g;ё|1.011|-0.014|AAD4HwAAAAH8P4AAAAH8P4AAAAH8P4AAAAH4H4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB////gAAf////+AB//////gD//////wH//////4P//////8f//////+f/wAAD/+//AAAA///+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//////////////////////////////////////////////////////////8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//gAAAAA//4AAAAA///gAAAA///////8f//////8P//////4D//////4A//////wAP/////wAAf////g;ж|0.75|0.0|/4AP8AH/f8AP8AP+f8AP8AP+P+AP8Af8P+AP8Af8H/AP8A/4H/AP8A/4D/gP8B/wB/gP8B/gB/wP8D/gA/4P8H/AA/4P8H/AAf8P8P+AAf8P8P+AAP+P8f8AAH+P8f4AAH/P8/4AAD/v9/wAAD/v9/wAAD////wAAD////wAAD////wAAH////4AAH////4AAP////8AAP7//38AAP7//38AAf7//3+AAf7//3+AAfx//j+AA/x//j/AA/w//D/AA/g//B/AB/gf+B/gB/gf+B/gD/AP8A/wD/AP8A/wD/AP8A/wH+AP8Af4H+AP8Af4H8AP8AP4P8AP8AP8P8AP8AP8f4AP8AH+f4AP8AH+f4AP8AH+/wAP8AD//wAP8AD/;з|0.764|-0.014|H/////8AH//////gP//////4P//////+f//////+f///////f///////////////////////AAAAAP//AAAAAD//AAAAAB//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAB//AAAAAB//AAB/////AAB////+AAB////8AAB////4AAB////wAAB////wAAB////4AAB////8AAB////+AAB/////AAAAAD//AAAAAB//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAB//AAAAAD//AAAAAf//////////////////f///////f///////f//////+P//////8P//////4H//////gH/////4A;и|0.75|0.0|/8AAAA///8AAAB///8AAAD///8AAAD///8AAAH///8AAAP///8AAAf///8AAAf///8AAA////8AAB////8AAD////8AAD////8AAH////8AAP////8AAf/v//8AAf/P//8AA//P//8AB/+P//8AD/8P//8AD/4P//8AH/4P//8AP/wP//8Af/gP//8A//AP//8A//AP//8B/+AP//8D/8AP//8H/4AP//8H/wAP//8P/wAP//8f/gAP//8//AAP//8/+AAP//9/+AAP////8AAP////4AAP////wAAP////wAAP////gAAP////AAAP///+AAAP///+AAAP///8AAAP///4AAAP///wAAAP///gAAAP///gAAAP///AAAAP/;й|1.011|0.0|AADAAwAAAADgBwAAAADwDwAAAAD//wAAAAB//gAAAAB//gAAAAA//AAAAAAf+AAAAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAA/4AAAA///8AAAB///8AAAD///8AAAH///8AAAP///8AAAf///8AAA////8AAB////8AAD////8AAH////8AAP////8AAf/v//8AA//P//8AB/+P//8AD/8P//8AH/4P//8AP/wP//8Af/gP//8A//AP//8B/+AP//8D/8AP//8H/4AP//8P/gAP//8f/AAP//8/+AAP//9/8AAP////4AAP////wAAP////gAAP////AAAP///+AAAP///8AAAP///4AAAP///wAAAP///gAAAP///AAAAP/;к|0.75|0.0|/8AAAP///8AAAf/+/8AAA//8/8AAB//4/8AAD//g/8AAH//A/8AAP/+A/8AAf/8A/8AA//4A/8AB//wA/8AD//gA/8AH//AA/8AP/+AA/8Af/8AA/8A//4AA/8B//wAA/8H//gAA/8P//AAA/8f/+AAA/8//8AAA/9//+AAA/////AAA/////gAA///3/gAA///3/wAA///n/4AA///n/4AA///n/8AA///D/+AA//+D/+AA//8B//AA//4A//gA//wA//gA//gAf/wA//AAP/4A/+AAP/8A/8AAH/8A/8AAD/+A/8AAB//A/8AAB//A/8AAA//g/8AAAf/w/8AAAf/w/8AAAP/4/8AAAH/8/8AAAH/+/8AAAD/+/8AAAB//;л|0.75|-0.014|AP//////AP//////AP//////AP//////AP//////AP//////AP//////AP//////AP//////AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/AP/AAAP/Af/AAAP////AAAP////AAAP////AAAP///+AAAP///+AAAP///8AAAP///4AAAP///wAAAP///gAAAAA;м|0.75|0.0|/4AAAAH//4AAAAH//4AAAAH//8AAAAP//8AAAAP//+AAAAf//+AAAAf///AAAA////AAAA////AAAA////gAAB////gAAB////wAAD////wAAD////4AAH////4AAH////4AAH////8AAP////8AAP////+AAf///3+AAf7//3/AA/7//3/AA/7//z/AA/z//z/gB/z//x/gB/j//x/wD/j//w/wD/D//w/4H/D//w/4H/D//wf4H+D//wf8P+D//wP8P8D//wP+f8D//wH+f4D//wH//4D//wH//4D//wD//wD//wD//wD//wB//gD//wB//gD//wA//AD//wA//AD//wA//AD//wAf+AD//wAf+AD//wAP8AD//wAP8AD/;н|0.75|0.0|/8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//////////////////////////////////////////////////////////////////////////////////8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP/;о|0.764|-0.014|AAB//gAAAAP//8AAAA////AAAD////wAAH////4AAf////+AA//////AB//////gB//////gD//4H//wH//AA//4H/8AAP/4P/4AAH/8P/wAAD/8f/gAAB/+f/AAAA/+f/AAAA/+/+AAAAf//+AAAAf//+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//+AAAAf//+AAAAf/f+AAAAf+f/AAAA/+f/AAAA/+f/gAAB/+P/wAAD/8P/4AAH/8H/8AAP/4H//AA//4D//4H//wB//////gB//////gA//////AAf////+AAH////4AAD////wAAA////AAAAP//8AAAAB//gAA;п|0.75|0.0|/////////////////////////////////////////////////////////////////////////8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP/;р|0.764|-0.293|/8P//8AA/8////gA/9////4A//////+A///////A///////g///////w/+AAA//4/+AAAH/8/8AAAD/8/8AAAB/+/8AAAA/+/8AAAA///8AAAAf//8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf//8AAAAf//8AAAA/+/8AAAB/+/8AAAD/+/8AAAH/8/+AAAf/4//AAD//4///////w///////g//////+A//////8A/8////wA/8f//+AA/8A/+AAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA;с|0.764|-0.014|AAP////4AD/////4AP/////8A//////8D//////8H//////+P//////+f///////f//////////4AAAA///AAAAA//8AAAAA//wAAAAA//gAAAAA//AAAAAA//AAAAAA//AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//AAAAAA//gAAAAA//wAAAAA//8AAAAA///AAAAA///4AAAAf///////f///////P//////+H//////+D//////8A//////8AP/////8AD/////4AAP////4;т|0.75|0.0|////////////////////////////////////////////////////////////////////////AAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAA;у|0.75|-0.293|/8AAAA///+AAAB/+f+AAAD/8f/AAAD/8f/AAAH/4P/AAAP/wP/gAAP/wH/gAAf/gH/gAA//AH/wAB//AD/wAB/+AD/wAD/8AD/4AH/4AB/4AH/4AB/4AP/wAB/8Af/gAA/8A//gAA/+A//AAA/+B/+AAAf+D/8AAAf/D/8AAAf/H/4AAAP/P/wAAAP///wAAAP///gAAAH///AAAAH///AAAAD//+AAAAD//8AAAAD//4AAAAB//4AAAAB//wAAAAB//gAAAAA//gAAAAA//AAAAAB/+AAAAAD/8AAAAAD/8AAAAAH/4AAAAAP/wAAAAAf/wAAAAAf/gAAAAA//AAAAAB//AAAAAB/+AAAAAD/8AAAAAH/4AAAAAH/4AAAAA;ф|1.057|-0.293|AAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAH/H4/4AA//37//AB//////gD//////wH//////4P//////8f8AH4AP+fwAH4AD+fwAH4AD+/gAH4AB//gAH4AB//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//AAH4AA//gAH4AB/fgAH4AB+fwAH4AD+f4AH4AH+P+AP8Af8P//////8H//////4D//////wB//37//gAf/n5/+AAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAAAAAH4AAA;х|0.75|0.0|//wAAD//f/wAAD/+P/4AAH/8P/8AAP/8H/+AAf/4D/+AAf/wD//AA//gB//gB//gA//wD//AAf/wD/+AAf/4H/+AAP/8P/8AAH/8P/4AAD/+f/wAAD////wAAB////gAAA////AAAAf//+AAAAf//+AAAAP//8AAAAH//4AAAAH//4AAAAD//wAAAAB//gAAAAB//gAAAAD//wAAAAH//4AAAAH//4AAAAP//8AAAAf//+AAAA////AAAA////AAAB////gAAD////wAAH/+f/wAAH/8P/4AAP/8P/8AAf/4H/+AAf/wD/+AA//wD//AB//gB//gD//AA//wD/+AAf/wH/+AAf/4P/8AAP/8f/4AAH/8f/wAAD/+//wAAD//;ц|0.75|-0.17|/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A/wAAAH/A////////////////////////////////////////////////////////AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD/AAAAAAD+AAAAAAD8;ч|0.75|0.0|/8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP//+AAAAP///AAAAf/f/gAAAf/f///////P///////P///////H///////D///////B/////v/A/////P/Af///+P/AH///4P/AAP/+AP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/;ш|0.75|0.0|/gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAH8AB//gAP8AB/////////////////////////////////////////////////////////////////////////;щ|0.75|-0.17|/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw/AAfgAPw////////////////////////////////////////////////////////AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA/AAAAAAA+;ъ|0.75|-0.014|///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAA///wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/wAAAAAB/x//wAAB/z//+AAB/3///AAB/////gAB/////wAB/////4AB/////8AB/////8AB/////+AB/8AB/+AB/4AAf/AB/wAAP/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAH/AB/wAAP/AB/4AAP/AB/4AA/+AB/////+AB/////+AB/////8AB/////4AB/////4AB/////wAB/////gAB/3//+AAAAB//4A;ы|0.75|-0.014|/gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//gAAAAB//j///AB//n///wB//v///4B//////8B//////+B//////+B///////B///////B///////h//4AAH/h//wAAB/h//wAAB/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//gAAA/x//wAAB/h//wAAD/h///////h///////B///////B///////B//////+B//////8B//////4B//v///wB/AH///AAA;ь|0.75|-0.014|/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+H///AA/+f///4A//////+A///////A///////g///////w///////4///////8///////8//gAAP/+/+AAAB/+/+AAAA///+AAAA///+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAA///+AAAB/+//AAAH/+///////+///////8///////4///////4///////w///////g//////+A/+////8AAAP///gA;э|0.764|-0.014|H////8AAH/////wAH/////8AP//////AP//////wf//////4f//////8///////+///////+AAAAP///AAAAB///AAAAAf//AAAAAH//AAAAAD//AAAAAD//AAAAAB//AAAAAB//AAAAAB//AB//////AD//////AD//////AD//////AD//////AD//////AD//////AD//////AD//////AB//////AAAAAA//AAAAAA//AAAAAA//AAAAAB//AAAAAB//AAAAAD//AAAAAD//AAAAAH//AAAAAf//AAAAA///AAAAH//////////+///////+f//////8f//////4P//////wP//////AH/////8AH/////wAH////8AA;ю|0.764|-0.014|AAAAB/gA/gAAP/4A/gAAf/8A/gAA//+A/gAB///A/gAD///g/gAH///w/gAH///4/gAP///4/gAP/h/8/gAf+A/8/gAf8Af8/gAf4AP+/gA/4AH+/gA/wAH+/gA/wAH+/gA/gAD//gA/gAD/////gAD/////gAD/////gAB/////gAB/////AAB/////AAB/////AAB/////AAB/////gAB/////gAB//gB/gAD//gB/gAD//gA/gAD//gA/gAD//gA/wAH+/gA/wAH+/gA/4AH+/gAf4AP+/gAf8Af8/gAf+A/8/gAP/h/8/gAP///4/gAH///4/gAH///w/gAD///g/gAB///A/gAA//+A/gAAf/8A/gAAP/4AAAAAD/gA;я|0.75|0.0|AB////P/AP////v/Af//////A///////B///////D///////H///////H///////H///////P/4AAA//P/gAAAf/P/gAAAP/P/AAAAP/P/AAAAP/P/AAAAP/P/AAAAP/P/gAAAf/P/gAAAf/P/8AAB//H///////H///////D///////D///////B///////A///////Af//////AH////v/AB///+P/AAH/+AP/AAP/8AP/AAf/4AP/AA//4AP/AA//wAP/AB//gAP/AD//AAP/AH/+AAP/AH/+AAP/AP/8AAP/Af/4AAP/A//wAAP/A//wAAP/B//gAAP/D//AAAP/H/+AAAP/P/+AAAP/P/8AAAP/f/4AAAP///wAAAP/;A|1.0|0.0|AAAP8AAAAAAP8AAAAAAf+AAAAAAf+AAAAAA//AAAAAA//AAAAAB//gAAAAB//gAAAAB//gAAAAD//wAAAAD//wAAAAH//4AAAAH//4AAAAP+f8AAAAP+f8AAAAP8P8AAAAf8P+AAAAf8P+AAAA/4H/AAAA/4H/AAAB/wD/gAAB/wD/gAAB/wD/gAAD/gB/wAAD/gB/wAAH/gA/4AAH/AA/4AAH/AA/8AAP+AAf8AAP+AAf8AAf////+AAf////+AA//////AA//////AA//////AB//////gB//////gD/wAAD/wD/gAAB/wH/gAAB/4H/gAAA/4H/AAAA/4P/AAAA/8P+AAAAf8f+AAAAf+f+AAAAP+/8AAAAP//8AAAAP/;B|1.0|0.0|/8////gA/9////4A//////+A///////A///////g///////w///////4/8AAAD/4/8AAAB/8/8AAAA/8/8AAAA/8/8AAAA/8/8AAAAf8/8AAAAf8/8AAAAf8/8AAAAf8/8AAAA/8/8AAAA/4/8AAAB/4/8AAAB/w/+AAAH/g///////A//////+A///////A///////g/+AAAD/w/8AAAA/4/8AAAAf8/8AAAAf+/8AAAAP+/8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAA/+/8AAAB/+///////8///////4///////4///////g///////A/9////8A/8f///gA;C|1.014|-0.014|AAP////4AD/////8AP/////8A//////+D//////+H///////P///////f//wAAAAf/+AAAAA//4AAAAA//gAAAAA//AAAAAA//AAAAAA/+AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//gAAAAA//4AAAAAf/+AAAAAf//wAAAAP///////H///////D//////+A//////+AP/////8AD/////8AAP////4;D|1.0|0.0|/4f//4AA/5////AA/7////gA//////4A//////8A//////+A///////A/8AAB//g/4AAAf/w/4AAAH/4/4AAAD/4/4AAAB/8/4AAAA/8/4AAAA/8/4AAAAf+/4AAAAf+/4AAAAP+/4AAAAP//4AAAAP//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAP//4AAAAP//4AAAAP+/4AAAAf+/4AAAAf+/4AAAA/8/4AAAA/8/4AAAB/8/4AAAD/4/4AAAH/4/4AAAf/w/8AAB//g///////A//////+A//////8A//////4A/7////gA/5////AA/4f//4AA;E|1.0|0.0|/////////////////////////////////////////////////////////+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA///////g///////g///////g///////g///////g///////g///////g///////g/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA////////////////////////////////////////////////////////;F|1.0|0.0|/////////////////////////////////////////////////////////+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA///////g///////g///////g///////g///////g///////g///////g/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA;G|1.014|-0.014|AAP////wAD/////wAP/////wA//////4D//////4H//////8P//////8f//gAAAAf/8AAAAA//wAAAAA//gAAAAA//AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/4AAAAAA/4AAAAAA/4AAAAAA/4AAAAAA/4AAAAAA/4AAAAAA/4AAAAAA/4AB/////4AB/////4AB/////4AB/////4AB/////8AB/////8AB/////8AAAAP//8AAAAP//+AAAAf//+AAAAf///AAAA////AAAA////gAAB////gAAB////wAAD////8AAP//f/+AAf/+f//gB//+P//////8H//////4D//////wA//////AAP////8AAD////wAAAP//8AA;H|1.0|0.0|/4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//////////////////////////////////////////////////////////////////4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH/;I|1.0|0.0|////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////;J|1.0|-0.014|AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAA//AAAAAB//AAAAAD//AAAAAP//AAAAB//////////////////+f//////8f//////4P//////gP/////+AH/////AA;K|1.0|0.0|/4AAAB///4AAAD/+/4AAAH/4/4AAAf/w/4AAA//g/4AAB//A/4AAD/+A/4AAH/8A/4AAP/4A/4AAf/wA/4AA//AA/4AD/+AA/4AH/8AA/4AP/4AA/4Af/wAA/4A//gAA/4B//AAA/4D/8AAA/4P/4AAA/4f/4AAA/4//8AAA/5//+AAA/7/3+AAA///3/AAA///n/gAA///n/wAA///H/wAA//+D/4AA//8B/8AA//4A/+AA//wA/+AA//AAf/AA/+AAP/gA/8AAP/wA/4AAH/wA/4AAD/4A/4AAB/8A/4AAB/+A/4AAA/+A/4AAAf/A/4AAAP/g/4AAAP/w/4AAAH/w/4AAAD/4/4AAAD/8/4AAAB/8/4AAAA/+/4AAAAf/;L|1.0|0.0|//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAA////////////////////////////////////////////////////////;M|1.0|0.0|/gAAAAB//wAAAAD//wAAAAD//4AAAAH//4AAAAH//8AAAAP//8AAAAP//8AAAAP//+AAAAf//+AAAAf///AAAA////AAAA////gAAB////gAAB////wAAD////wAAD////wAAD////4AAH///v4AAH9//v8AAP9//n8AAP5//n+AAf5//j+AAfx//j+AAfx//h/AA/h//h/AA/h//h/gB/h//g/gB/B//g/wD/B//gfwD+B//gf4H+B//gP4H8B//gP4H8B//gP8P8B//gH8P4B//gH+f4B//gD+fwB//gD//wB//gB//gB//gB//gB//gB//gB//gA//AB//gA//AB//gAf+AB//gAf+AB//gAP8AB//gAP8AB//gAH4AB/;N|1.0|0.0|/8AAAAH//+AAAAH///AAAAH///gAAAH///wAAAH///wAAAH///4AAAH///8AAAH///+AAAH////AAAH////AAAH////gAAH//7/wAAH//5/4AAH//5/8AAH//4/8AAH//4f+AAH//4P/AAH//4H/gAH//4H/gAH//4D/wAH//4B/4AH//4A/8AH//4Af+AH//4Af+AH//4AP/AH//4AH/gH//4AD/wH//4AB/4H//4AB/4H//4AA/8H//4AAf+H//4AAP/H//4AAP/n//4AAH/n//4AAD/3//4AAB////4AAA////4AAA////4AAAf///4AAAP///4AAAH///4AAAD///4AAAD///4AAAB///4AAAA///4AAAAf//4AAAAP/;O|1.014|-0.014|AAA//AAAAAP//8AAAA////AAAD////wAAH////4AAP////8AA//////AA//wD//AB/+AAf/gD/8AAP/wH/wAAD/4H/gAAB/4P/gAAB/8P/AAAA/8f+AAAAf+f+AAAAf+f8AAAAf+f8AAAAP+/8AAAAP//8AAAAP//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//8AAAAP//8AAAAP/f8AAAAP+f8AAAAf+f+AAAAf+f+AAAAf+P/AAAA/8P/gAAB/8H/gAAB/4H/wAAD/4D/8AAP/wB/+AAf/gA//wD//AA//////AAP////8AAH////4AAD////wAAA////AAAAP//8AAAAA//AAA;P|1.0|0.0|/8f///AA/8////4A//////+A///////g///////w///////4///////8/+AAAH/8/8AAAB/+/8AAAA/+/8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAA/+/8AAAB/+/+AAAP/8///////8///////4///////w///////A/9////+A/8////4A/8P//+AA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA;Q|1.014|-0.195|AAD/+AAAAAf//4AAAB///+AAAH////gAAf////wAA/////4AB//AH/8AD/8AA/+AH/wAAf/AH/gAAP/gP/AAAH/gP+AAAD/wf+AAAB/wf8AAAB/4f8AAAA/4/4AAAA/4/4AAAA/4/4AAAAf8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAA/4/8AAAA/4f8AAAA/4f8AAAB/4f+AAAB/wP+AAAD/wP/AAGH/gH/gAPP/gD/wAf//AD/8A//+AB//h//8AA/////4AAP////wAAH////4AAB////+AAAf////AAAB/+P/wAAAAAH/4AAAAAB/+AAAAAA//AAAAAAP+AAAAAAH8AAAAAAD4AAAAAAAw;R|1.0|0.0|/4f//+AA/5////wA/7////8A//////+A///////A///////g///////w/8AAAP/4/8AAAD/4/4AAAB/8/4AAAA/8/4AAAA/8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAAf8/4AAAA/8/4AAAA/8/4AAAB/8/8AAAD/4/+AAAP/4///////w///////g///////A//////+A/7////8A/5////wA/4f//+AA/4Af/wAA/4AP/wAA/4AH/4AA/4AD/8AA/4AB/+AA/4AA//AA/4AAf/gA/4AAf/wA/4AAP/wA/4AAH/4A/4AAD/8A/4AAB/+A/4AAA//A/4AAA//g/4AAAf/w/4AAAP/w/4AAAH/4/4AAAD/8/4AAAB/+/4AAAA//;S|1.014|-0.014|AP/////gB//////wH//////wf//////4f//////4///////8///////8//4AAAAA//AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//gAAAAA//+AAAAA//////+A///////wf//////4P//////+D//////+A///////AAf/////AAAAAD//AAAAAA//AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAB//AAAAAP//f///////f///////f//////+P//////8P//////4H//////AH/////4A;T|1.0|0.0|////////////////////////////////////////////////////////AAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAAAAAf+AAA;U|1.0|-0.014|/4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//4AAAAH//8AAAAH//8AAAAH//8AAAAH/f8AAAAH/f+AAAAH/f+AAAAH/f/AAAAH/P/gAAAH/P/gAAAH/H/wAAAH/H/4AAAH/D/+AAAH/B//gAAP/A///////Af//////AP//////AH//////AD////3/AA////n/AAH//+D/;V|1.0|0.0|/8AAAAP//+AAAAf/f+AAAAf+f/AAAA/+P/AAAA/8P/AAAA/8P/gAAB/4H/gAAB/4H/wAAD/4D/wAAD/wD/wAAD/wB/4AAH/gB/4AAH/gB/8AAP/gA/8AAP/AA/8AAP/AAf+AAf+AAf+AAf+AAP+AAf8AAP/AA/8AAP/AA/8AAH/gB/4AAH/gB/4AAD/gB/wAAD/wD/wAAD/wD/wAAB/4H/gAAB/4H/gAAA/4H/AAAA/8P/AAAAf8P+AAAAf8f+AAAAf+f+AAAAP+f8AAAAP//8AAAAH//4AAAAH//4AAAAH//wAAAAD//wAAAAD//wAAAAB//gAAAAB//gAAAAA//AAAAAA//AAAAAA//AAAAAAf+AAAAAAf+AAAAAAP8AAA;W|1.0|0.0|/gAP8AB//gAP8AB//wAP8AD/fwAP8AD+fwAP8AD+fwAP8AD+f4Af+AD+P4Af+AH+P4Af+AH8P4Af+AH8P4A//AH8P8A//AP8H8A//AP4H8A//AP4H8A//AP4H8B//gP4D+B//gfwD+B//gfwD+B//gfwD+B//gfwB/D+fwfwB/D+fw/gB/D+fw/gB/D+fw/gB/D8P4/gA/n8P5/AA/n8P5/AA/n8P5/AA/n4H5/AAfv4H9+AAf/4H/+AAf/4H/+AAf/4H/+AAP/wD/+AAP/wD/8AAP/wD/8AAP/wD/8AAP/gB/8AAH/gB/4AAH/gB/4AAH/gB/4AAH/AA/4AAD/AA/wAAD/AA/wAAD/AA/wAAD/AA/wAAB+AAfwAAB+AAfgA;X|1.0|0.0|/+AAAAf/f/AAAA/+P/AAAA/8H/gAAB/4H/wAAD/4D/4AAH/wB/4AAH/gA/8AAP/AA/+AAf/AAf/AA/+AAP/gB/8AAH/gB/4AAD/wD/wAAD/4H/wAAB/8P/gAAA/+f/AAAAf+f+AAAAP//8AAAAP//8AAAAH//4AAAAD//wAAAAB//gAAAAA//AAAAAA//AAAAAA//AAAAAA//AAAAAB//gAAAAD//wAAAAH//4AAAAP//8AAAAP//8AAAAf+f+AAAA/+f/AAAB/8P/gAAD/4H/wAAD/wD/wAAH/gB/4AAP/gB/8AAf/AA/+AA/+AAf/AA/8AAP/AB/4AAH/gD/4AAH/wH/wAAD/4H/gAAB/4P/AAAA/8f/AAAA/+/+AAAAf/;Y|1.0|0.0|/+AAAAP/f+AAAAf+P/AAAA/8P/gAAB/8H/gAAB/4D/wAAD/wD/4AAH/wB/8AAP/gA/8AAP/AAf+AAf/AAf/AA/+AAP/AA/8AAH/gB/4AAH/wD/4AAD/4D/wAAB/4H/gAAB/8P/gAAA/+f/AAAAf+f+AAAAP//8AAAAP//8AAAAH//4AAAAD//wAAAAD//wAAAAB//gAAAAA//AAAAAAf/AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAAAAAP8AAA;Z|1.0|0.0|////////////////////////////////////////////////////////AAAAAH/+AAAAAP/8AAAAAf/4AAAAA//wAAAAB//gAAAAB//AAAAAD/+AAAAAH/+AAAAAf/4AAAAAf/wAAAAB//wAAAAD//AAAAAH/+AAAAAP/8AAAAAf/4AAAAA//wAAAAB//gAAAAB//AAAAAD/+AAAAAH/+AAAAAf/4AAAAAf/wAAAAA//gAAAAD//AAAAAH/+AAAAAP/8AAAAAf/4AAAAA//wAAAAB//gAAAAB//AAAAAD/+AAAAAH/8AAAAAP/4AAAAAf/wAAAAA////////////////////////////////////////////////////////;a|0.764|-0.014|A/////gAA/////4AB/////+AB//////gB//////wD//////4D//////4H//////8H//////+AAAAAP/+AAAAAD/+AAAAAB//AAAAAB//AAAAAA//AAAAAA//AAAAAAf/AAAAAAf/AAAAAAf/AD///+P/AP////P/A///////B///////D///////H///////P///////P///////f///////f/wAAA////AAAAf//+AAAAf//+AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAf///AAAAf/f/gAAA//f///////f///////P///////H///////D///////B///////A///////AP////P/AD///+AA;b|1.057|-0.014|/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8H//8AA/8////gA/9////4A//////+A///////A///////g///////w/+AAA//4/+AAAH/8/8AAAD/8/8AAAB/+/8AAAA/+/8AAAA///8AAAAf//8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf//8AAAAf//8AAAA///8AAAA/+/8AAAB/+/8AAAD/8/8AAAH/8/+AAA//4///////w///////g///////A//////+A/9////4A/8////gA/8P//8AA;c|0.764|-0.014|AAP////4AD/////4AP/////8A//////8D//////8H//////+P//////+f///////f//////////4AAAA///AAAAA//8AAAAA//wAAAAA//gAAAAA//AAAAAA//AAAAAA//AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//AAAAAA//gAAAAA//wAAAAA//8AAAAA///AAAAA///4AAAAf///////f///////P//////+H//////+D//////8A//////8AP/////8AD/////4AAP////4;d|1.057|-0.014|AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAP//4P/AB////P/AH////v/Af//////A///////B///////D///////H//AAAf/P/4AAAf/P/wAAAP/f/gAAAP/f/AAAAP///AAAAP//+AAAAP//+AAAAP//+AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP//+AAAAP///AAAAP/f/AAAAP/f/gAAAP/P/wAAAP/P/4AAAP/H//AAAf/D///////B///////A///////Af//////AH////v/AB////P/AAP//8P/;e|0.764|-0.014|AD////wAAf////+AA//////AD//////wH//////4P//////8P//////8f//////+f//////+//gAAB////AAAA///+AAAAf//+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//////////////////////////////////////////////////////////////////////////////////8AAAAAA/8AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//AAAAAA//gAAAAA//4AAAAA//+AAAAA///wAAAAf//////8f//////8P//////4H//////4D//////4B//////wAf/////wAD/////wAAP////g;f|1.057|0.0|AAAf///wAAD////4AAP////8AA/////8AB/////+AD//////AH//////AP//4AAAAP//gAAAAP//AAAAAP/+AAAAAP/+AAAAAP/8AAAAAP/8AAAA///////A///////A///////A///////A///////A///////A///////AAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAAAP/8AAAA;g|0.764|-0.239|AAP//8P/AB////P/AH////v/Af//////A///////B///////D///////H//gAAf/H/8AAAf/P/4AAAP/f/wAAAP/f/gAAAP/f/AAAAP//+AAAAP//+AAAAP//+AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP//+AAAAP/f/AAAAP/f/gAAAP/f/gAAAP/P/wAAAP/P/8AAAf/H//AAAf/D///////B///////A///////Af//////AH//////AB////f/AAP//8//AAAAAB//AAAAAD//AAAAAP//AAAAB///P//////+H//////8H//////4D//////wD//////AD/////4AB////+AA;h|1.057|0.0|/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8H//4AA/8f///AA/9////4A//////+A///////A///////g///////w/+AAA//4/+AAAH/8/8AAAD/8/8AAAB/+/8AAAA/+/8AAAA///8AAAAf//8AAAAf//8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP/;i|0.971|0.0|AH////4AH//////4f//////+////////////////f//////+D//////wAB////gAAAAAAAAAAAAAAAAAAAAAAAAA////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////;j|0.971|-0.239|AAAAAAf8AAAAAB/+AAAAAD//AAAAAD//AAAAAB//AAAAAA/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAD//AAAAAH//AAAAAP//AAAAA///AAAAH//////////+///////8f//////4P//////gH/////8AH/////AA;k|1.057|0.0|/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAf/+/8AAA//8/8AAD//4/8AAH//g/8AAP//A/8AA//8A/8AB//4A/8AH//gA/8AP//AA/8A//8AA/8B//4AA/8H//gAA/8P//AAA/8//+AAA/9//+AAA/////AAA/////gAA/////wAA/////4AA///v/8AA///H/+AA//+D//AA//4B//gA//wA//wA//AAf/4A/+AAP/8A/8AAH/+A/8AAD//A/8AAB//g/8AAA//w/8AAAf/4/8AAAP/8/8AAAH/+/8AAAD//;l|1.057|-0.014|///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///4AAAA///////////////+///////8///////4f//////wP//////gD//////A;m|0.764|0.0|AH/AA/8A/v/n5/+A///37//A///////g///////w///////w///////4///////4///////8/gAP8A/8/gAP8AP+/gAH8AH+/gAH4AH+/gAH4AD+/gAH4AD+/gAH4AD//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB//gAH4AB/;n|0.764|0.0|AAH//4AA/8f///AA/8////wA/9////4A//////+A///////A///////g///////g///////w//AAB//4/+AAAf/4/+AAAH/8/8AAAD/8/8AAAB/+/8AAAB/+/8AAAA/+/8AAAA/+/8AAAA///8AAAAf//8AAAAf//8AAAAf//8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP/;o|0.764|-0.014|AAB//gAAAAP//8AAAA////AAAD////wAAH////4AAf////+AA//////AB//////gB//////gD//4H//wH//AA//4H/8AAP/4P/4AAH/8P/wAAD/8f/gAAB/+f/AAAA/+f/AAAA/+/+AAAAf//+AAAAf//+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//+AAAAf//+AAAAf/f+AAAAf+f/AAAA/+f/AAAA/+f/gAAB/+P/wAAD/8P/4AAH/8H/8AAP/4H//AA//4D//4H//wB//////gB//////gA//////AAf////+AAH////4AAD////wAAA////AAAAP//8AAAAB//gAA;p|0.764|-0.293|/8P//8AA/8////gA/9////4A//////+A///////A///////g///////w/+AAA//4/+AAAH/8/8AAAD/8/8AAAB/+/8AAAA/+/8AAAA///8AAAAf//8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAf//8AAAAf//8AAAAf//8AAAA/+/8AAAB/+/8AAAD/+/8AAAH/8/+AAAf/4//AAD//4///////w///////g//////+A//////8A/8////wA/8f//+AA/8A/+AAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA;q|0.764|-0.293|AAP//8P/AB////P/AH////v/Af//////A///////B///////D///////H//AAAf/P/4AAAf/P/wAAAP/f/gAAAP/f/AAAAP///AAAAP//+AAAAP//+AAAAP//+AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP//+AAAAP/f/AAAAP/f/gAAAP/f/wAAAP/P/4AAAP/H/+AAAf/H//wAA//D///////B///////Af//////AP//////AD////P/AAf//+P/AAAf/AP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/;r|0.764|0.0|AAAAH//g///g///w///j///w///v///4///////8///////8///////+///////+///////////4AAAA///wAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA///gAAAA;s|0.764|-0.014|AP/////gD//////gH//////wf//////wf//////4///////4///////4///////8///////8//4AAAAA//gAAAAA//AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA/+AAAAAA//AAAAAA//wAAAAA/////8AA//////+A///////w///////4///////+f//////+P///////H///////A///////AB//////AAAAAH//AAAAAB//AAAAAA//AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAf/AAAAAA//AAAAAA//AAAAAD//AAAAAP//f///////f///////f///////P///////P//////+P//////8H//////4H//////gH/////8A;t|0.918|-0.014|AAAMAAAAAAB8AAAAAAH8AAAAAA/8AAAAAD/8AAAAAH/8AAAAAH/8AAAAAH/8AAAA///////8///////8///////8///////8///////8///////8///////8///////8AH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH/8AAAAAH//AAAAAH///AAAAH//////AH/////+AH/////+AD/////8AB/////8AAf////4AAB////4;u|0.75|-0.014|/8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP//+AAAAP//+AAAAP/f/AAAAP/f/AAAAP/f/gAAAP/f/gAAAP/P/wAAAP/P/4AAAP/H/8AAAf/H//AAA//D///////B///////A///////A///////Af//////AH////v/AD////P/AA///+P/AAH//4AA;v|0.75|0.0|//AAAA////AAAA//f/gAAB/+f/gAAB/+P/wAAD/8P/wAAD/8P/wAAD/8H/4AAH/4H/4AAH/4D/4AAH/wD/8AAP/wD/8AAP/wB/8AAP/gB/+AAf/gA/+AAf/AA//AA//AAf/AA//AAf/AA/+AAf/gB/+AAP/gB/8AAP/gB/8AAP/wD/8AAH/wD/4AAH/4H/4AAD/4H/wAAD/4H/wAAD/8P/wAAB/8P/gAAB/8P/gAAA/+f/AAAA/+f/AAAAf+/+AAAAf//+AAAAf//+AAAAP//8AAAAP//8AAAAH//4AAAAH//4AAAAH//4AAAAD//wAAAAD//wAAAAB//gAAAAB//gAAAAB//gAAAAA//AAAAAA//AAAAAAf+AAAAAAf+AAA;w|0.75|0.0|/wAP8AD//wAP8AD//wAf+AD/f4Af+AH+f4Af+AH+f4Af+AH+f4Af+AH+f4A//AH+P8A//AP8P8A//AP8P8A//AP8P8A//AP8H+B//gP4H+B//gf4H+B//gf4H+B//gf4H+B//gfwD/D//wfwD/D//w/wD/D//w/wD/D+fw/wB/D+fw/gB/H+f4/gB/n+f5/gB/n+P5/gA/n8P5/AA/n8P5/AA/v8P9/AA//8P//AA//4H//AAf/4H/+AAf/4H/+AAf/4H/+AAf/wD/+AAP/wD/8AAP/wD/8AAP/wD/8AAP/wD/8AAP/gB/8AAH/gB/4AAH/gB/4AAH/gB/4AAH/AA/4AAD/AA/wAAD/AA/wAAD/AA/wAAD/AA/wAAB+AAfgA;x|0.75|0.0|//wAAD//f/wAAD/+P/4AAH/8P/8AAP/8H/+AAf/4D/+AAf/wD//AA//gB//gB//gA//wD//AAf/wD/+AAf/4H/+AAP/8P/8AAH/8P/4AAD/+f/wAAD////wAAB////gAAA////AAAAf//+AAAAf//+AAAAP//8AAAAH//4AAAAH//4AAAAD//wAAAAB//gAAAAB//gAAAAD//wAAAAH//4AAAAH//4AAAAP//8AAAAf//+AAAA////AAAA////AAAB////gAAD////wAAH/+f/wAAH/8P/4AAP/8P/8AAf/4H/+AAf/wD/+AA//wD//AB//gB//gD//AA//wD/+AAf/wH/+AAf/4P/8AAP/8f/4AAH/8f/wAAD/+//wAAD//;y|0.75|-0.293|/8AAAA///+AAAB/+f+AAAD/8f/AAAD/8f/AAAH/4P/AAAP/wP/gAAP/wH/gAAf/gH/gAA//AH/wAB//AD/wAB/+AD/wAD/8AD/4AH/4AB/4AH/4AB/4AP/wAB/8Af/gAA/8A//gAA/+A//AAA/+B/+AAAf+D/8AAAf/D/8AAAf/H/4AAAP/P/wAAAP///wAAAP///gAAAH///AAAAH///AAAAD//+AAAAD//8AAAAD//4AAAAB//4AAAAB//wAAAAB//gAAAAA//gAAAAA//AAAAAB/+AAAAAD/8AAAAAD/8AAAAAH/4AAAAAP/wAAAAAf/wAAAAAf/gAAAAA//AAAAAB//AAAAAB/+AAAAAD/8AAAAAH/4AAAAAH/4AAAAA;z|0.75|0.0|////////////////////////////////////////////////////////////////////////AAAAB///AAAAD//+AAAAH//8AAAAP//4AAAAf//wAAAA///gAAAB///AAAAD//+AAAAH//8AAAAP//4AAAAf//wAAAA///gAAAB///AAAAD//+AAAAH//8AAAAP//4AAAAf//wAAAA///gAAAB///AAAAD//+AAAAH//8AAAAP//4AAAAf//wAAAA///gAAAB///AAAAD//+AAAAH//8AAAAP//4AAAAf//wAAAA///gAAAA////////////////////////////////////////////////////////////////////////;0|1.014|-0.014|AAA//AAAAAP//8AAAA////AAAD////wAAH////4AAP////8AA//////AB//wD//AB//AAf/gD/8AAP/wH/4AAH/4H/wAAD/4P/gAAB/8P/gAAB/8f/AAAA/+f/AAAA/+f/AAAA/+f+AAAAf+/+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf//+AAAAf/f+AAAAf+f/AAAAf+f/AAAA/+f/AAAA/+P/gAAB/8P/gAAB/8H/wAAD/4H/4AAH/4D/8AAP/wB/+AAf/gB//wD//AA//////AAP////8AAH////4AAD////wAAA////AAAAP//8AAAAA//AAA;1|1.0|0.0|AAAAH///AAAB////AAAP////AAD/////AAf/////AD//////A///////H///////////////////9///////h//////4B//////AB/////wAB////+AAB////gAAB///8AAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///AAAAB///;2|1.014|0.0|AH///4AAAH////AAAP////4AAP////8AAf/////AAf/////gAf/////wAAAAAf/4AAAAAH/8AAAAAB/8AAAAAA/+AAAAAAf+AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAA/+AAAAAA/+AAAAAD/8AAAAAH/8AAAAAf/4AAAAB//wAAAAH//gAAAAf//AAAAB//8AAAAH//wAAAAf//AAAAB//8AAAAH//wAAAAf//AAAAB//8AAAAH//wAAAAf//AAAAB//8AAAAH//wAAAAf//AAAAA//8AAAAA////////////////////////////////////////////////////////;3|1.0|-0.014|H////4AAP/////AAP/////wAf/////4Af/////8A//////+A///////AAAAAAf/AAAAAAP/gAAAAAP/gAAAAAH/gAAAAAH/gAAAAAP/gAAAAAf/gAAAAB//AAAAAH//AAAAAf/+AAAAB//8AAAAP//+AAAA////wAAD////8AAP////+AA/////+AH//////Af//////AAAAAD//AAAAAA//AAAAAAf/AAAAAAf/AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAA//AAAAAD//AAAAAf//////////////////f//////+f//////8P//////wP//////AH/////wA;4|1.0|0.0|AAAAB///AAAAD///AAAAD///AAAAH///AAAAP///AAAAf/v/AAAA//P/AAAB//P/AAAD/+P/AAAH/8P/AAAH/4P/AAAP/wP/AAAf/gP/AAA//AP/AAB//AP/AAD/+AP/AAH/8AP/AAH/4AP/AAP/wAP/AAf/gAP/AA//AAP/AB/+AAP/AD/+AAP/AH/8AAP/AP/4AAP/AP/wAAP/Af/gAAP/A///////B///////D///////H///////P///////P///////f///////////////AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/;5|1.0|-0.014|AD/////4Af/////4B//////8D//////8H//////+P//////+f//////+f/+AAAAA//wAAAAA//gAAAAA//AAAAAA//AAAAAA/+AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/////+AA//////8A///////g///////4///////8///////+////////AAAAD///AAAAAH//AAAAAB//AAAAAAf/AAAAAAf/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAA//AAAAAD//AAAAAf//P///////P///////H//////+H//////8D//////wD//////AD/////wA;6|1.014|-0.014|AP////+AA//////AD//////AH//////gP//////gf//////gf//////w//4AAAAA//gAAAAA//AAAAAA/+AAAAAA/+AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/8AAAAAA/////gAA//////wA//////8A///////A///////g///////w///////4//AAA//8/+AAAD/+/8AAAA/+/8AAAAf//8AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAf//+AAAAf/f/gAAB/+f/wAAD/+P//////8H//////4D//////wB//////gAf////+AAH////4AAA////AA;7|1.0|0.0|////////////////////////////////////////////////////////AAAAAA//AAAAAB/+AAAAAB/8AAAAAD/8AAAAAH/4AAAAAH/wAAAAAP/gAAAAAf/gAAAAA//AAAAAA/+AAAAAB/+AAAAAD/8AAAAAD/4AAAAAH/4AAAAAP/wAAAAAf/gAAAAAf/AAAAAA//AAAAAB/+AAAAAB/8AAAAAD/8AAAAAH/4AAAAAH/wAAAAAP/gAAAAAf/gAAAAA//AAAAAA/+AAAAAB/+AAAAAD/8AAAAAD/4AAAAAH/wAAAAAP/wAAAAAP/gAAAAAf/AAAAAA//AAAAAB/+AAAAAB/8AAAAAD/8AAAAAH/4AAAAAH/wAAAAAP/gAAAA;8|1.014|-0.016|AAf//+AAAD////wAAP////8AAf////+AA//////AB//////gD//gB//wH/8AAP/4H/4AAH/4H/wAAD/4P/gAAB/8P/gAAB/8P/gAAB/8P/gAAB/8P/gAAB/8P/gAAB/8H/wAAD/4H/4AAH/4D/+AAf/wD//////wB//////gA//////AA//////AB//////gD//////wH//////4P/8AAP/8f/wAAD/+f/gAAB/+f/AAAA/+/+AAAAf//+AAAAf//+AAAAf//8AAAAP//8AAAAP//+AAAAf//+AAAAf//+AAAAf/f/AAAA/+f/gAAB/+P/4AAH/8P//gB//8H//////4D//////wB//////gAf////+AAH////4AAA////AA;9|1.014|-0.014|AA////AAAH////8AA//////AB//////gD//////wH//////4P//////8f/wAAD/+f/gAAB/+/+AAAAf//+AAAAf//8AAAAP//8AAAAP//8AAAAP//8AAAAP//8AAAAP//+AAAAP//+AAAAP/f/AAAAP/f/wAAAf/P///////H///////D///////B///////A///////AP//////AB//////AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAP/AAAAAAf/AAAAAAf/AAAAAA//AAAAAB//AAAAAH//D//////+B//////+B//////8B//////4A//////wA//////AAf////8A";
    var REF = null;
    var HOMO = {};
    "АA ВB ЕE КK МM НH ОO РP СC ТT ХX аa еe оo рp сc хx уy".split(" ").forEach(function (p) {
      HOMO[p.charAt(0)] = p.charAt(1).toLowerCase();
      HOMO[p.charAt(1)] = p.charAt(1).toLowerCase();
    });
    function sameShape(a, b) {
      var ka = HOMO[a] || a.toLowerCase();
      var kb = HOMO[b] || b.toLowerCase();
      return ka === kb || a.toLowerCase() === b.toLowerCase();
    }

    function dilate(m, r) {
      var o = new Uint8Array(MN * MN);
      for (var y = 0; y < MN; y++) {
        for (var x = 0; x < MN; x++) {
          if (!m[y * MN + x]) continue;
          for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
              if (dx * dx + dy * dy > r * r) continue;
              var xx = x + dx;
              var yy = y + dy;
              if (xx >= 0 && yy >= 0 && xx < MN && yy < MN) o[yy * MN + xx] = 1;
            }
          }
        }
      }
      return o;
    }

    function erode(m, r) {
      var o = new Uint8Array(MN * MN).fill(1);
      for (var y = 0; y < MN; y++) {
        for (var x = 0; x < MN; x++) {
          if (m[y * MN + x]) continue;
          for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
              if (dx * dx + dy * dy > r * r) continue;
              var xx = x + dx;
              var yy = y + dy;
              if (xx >= 0 && yy >= 0 && xx < MN && yy < MN) o[yy * MN + xx] = 0;
            }
          }
        }
      }
      return o;
    }

    function thin(src) {
      var m = Uint8Array.from(src);
      var at = function (x, y) {
        return x < 0 || y < 0 || x >= MN || y >= MN ? 0 : m[y * MN + x];
      };
      var changed = true;
      while (changed) {
        changed = false;
        for (var pass = 0; pass < 2; pass++) {
          var del = [];
          for (var y = 0; y < MN; y++) {
            for (var x = 0; x < MN; x++) {
              if (!m[y * MN + x]) continue;
              var p2 = at(x, y - 1), p3 = at(x + 1, y - 1), p4 = at(x + 1, y), p5 = at(x + 1, y + 1);
              var p6 = at(x, y + 1), p7 = at(x - 1, y + 1), p8 = at(x - 1, y), p9 = at(x - 1, y - 1);
              var B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
              if (B < 2 || B > 6) continue;
              var seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
              var A = 0;
              for (var i = 0; i < 8; i++) if (!seq[i] && seq[i + 1]) A++;
              if (A !== 1) continue;
              if (pass === 0) {
                if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue;
              } else if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
              del.push(y * MN + x);
            }
          }
          if (del.length) {
            changed = true;
            for (var d = 0; d < del.length; d++) m[del[d]] = 0;
          }
        }
      }
      return m;
    }

    function straightDiagonal(t) {
      var pts = [];
      for (var y = 0; y < MN; y++) for (var x = 0; x < MN; x++) if (t[y * MN + x]) pts.push([x, y]);
      var n = 0;
      var d = 0;
      pts.forEach(function (c) {
        var nb = pts.filter(function (p) {
          return Math.abs(p[0] - c[0]) <= 3 && Math.abs(p[1] - c[1]) <= 3;
        });
        if (nb.length < 5) return;
        var mx = 0, my = 0;
        nb.forEach(function (p) { mx += p[0]; my += p[1]; });
        mx /= nb.length;
        my /= nb.length;
        var sxx = 0, syy = 0, sxy = 0;
        nb.forEach(function (p) {
          var dx = p[0] - mx, dy = p[1] - my;
          sxx += dx * dx;
          syy += dy * dy;
          sxy += dx * dy;
        });
        var tr = sxx + syy;
        var det = sxx * syy - sxy * sxy;
        var disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
        var l1 = tr / 2 + disc;
        var l2 = tr / 2 - disc;
        n++;
        if (l1 / (l2 + 0.05) < 8) return;
        var ang = Math.abs(0.5 * Math.atan2(2 * sxy, sxx - syy) * 180 / Math.PI);
        if (ang > 25 && ang < 65) d++;
      });
      return n ? d / n : 0;
    }

    function features(o) {
      o.thin = thin(o.m);
      var w = dilate(o.thin, 2);
      var z = new Float32Array(ZG * ZG);
      var c = MN / ZG;
      for (var y = 0; y < MN; y++) for (var x = 0; x < MN; x++) z[((y / c) | 0) * ZG + ((x / c) | 0)] += w[y * MN + x];
      var b = new Float32Array(ZG * ZG);
      for (var j = 0; j < ZG; j++) {
        for (var i = 0; i < ZG; i++) {
          var s = 0;
          var t = 0;
          for (var dy = -1; dy <= 1; dy++) {
            for (var dx = -1; dx <= 1; dx++) {
              var xx = i + dx;
              var yy = j + dy;
              if (xx < 0 || yy < 0 || xx >= ZG || yy >= ZG) continue;
              var k = dx || dy ? 0.5 : 1;
              s += z[yy * ZG + xx] * k;
              t += k;
            }
          }
          b[j * ZG + i] = s / t;
        }
      }
      var nn = 0;
      for (var q = 0; q < b.length; q++) nn += b[q] * b[q];
      o.z = b;
      o.zn = Math.sqrt(nn) || 1;
      var closed = erode(dilate(o.m, 4), 4);
      o.holes = labelMask(closed, MN, MN, 0, false).filter(function (cm) {
        return !cm.border && cm.area >= 5;
      }).length;
      var ink = labelMask(o.m, MN, MN, 1, true).filter(function (cm) {
        return cm.area >= 3;
      });
      var max = 0;
      ink.forEach(function (cm) {
        if (cm.area > max) max = cm.area;
      });
      var body = ink.filter(function (cm) {
        return cm.area >= 0.15 * max;
      });
      var small = ink.filter(function (cm) {
        return cm.area < 0.15 * max;
      });
      var top = body.length
        ? Math.min.apply(
            null,
            body.map(function (cm) {
              return cm.y0;
            })
          )
        : 0;
      o.accent = small.some(function (cm) {
        return cm.y1 < top;
      })
        ? 1
        : 0;
      o.diag = straightDiagonal(o.thin);
      return o;
    }

    function refs() {
      if (REF) return REF;
      REF = {};
      REF_RAW.split(";").forEach(function (rec) {
        var p = rec.split("|");
        var bin = atob(p[3]);
        var m = new Uint8Array(MN * MN);
        for (var i = 0; i < MN * MN; i++) m[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
        REF[p[0]] = features({ m: m, top: +p[1], bot: +p[2] });
      });
      return REF;
    }

    function cellFeatures(gl, capPx) {
      var w = gl.w;
      var h = gl.h;
      var x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (gl.data[y * w + x] < gl.thr) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) return null;
      var bw = x1 - x0 + 1;
      var bh = y1 - y0 + 1;
      var m = new Uint8Array(MN * MN);
      for (var j = 0; j < MN; j++) {
        var ya = y0 + (bh * j) / MN;
        var yb = y0 + (bh * (j + 1)) / MN;
        for (var i = 0; i < MN; i++) {
          var xa = x0 + (bw * i) / MN;
          var xb = x0 + (bw * (i + 1)) / MN;
          var sum = 0;
          var cnt = 0;
          for (var yy = Math.floor(ya); yy < Math.ceil(yb); yy++) {
            var wy = Math.min(yy + 1, yb) - Math.max(yy, ya);
            for (var xx = Math.floor(xa); xx < Math.ceil(xb); xx++) {
              var wx = Math.min(xx + 1, xb) - Math.max(xx, xa);
              cnt += wx * wy;
              if (gl.data[yy * w + xx] < gl.thr) sum += wx * wy;
            }
          }
          m[j * MN + i] = cnt && sum / cnt >= 0.3 ? 1 : 0;
        }
      }
      return features({ m: m, top: (gl.base - y0) / capPx, bot: (gl.base - (y1 + 1)) / capPx });
    }

    function shapeScore(a, b) {
      var dot = 0;
      for (var i = 0; i < a.z.length; i++) dot += a.z[i] * b.z[i];
      var sim = dot / (a.zn * b.zn);
      var dv = Math.max(0, Math.abs(a.top - b.top) - 0.08) + Math.max(0, Math.abs(a.bot - b.bot) - 0.08);
      var dd = Math.max(0, Math.abs(a.diag - b.diag) - 0.1);
      return (
        sim -
        0.08 * Math.min(Math.abs(a.holes - b.holes), 2) -
        0.3 * Math.abs(a.accent - b.accent) -
        Math.min(0.3, 2 * dv) -
        Math.min(0.3, 0.6 * dd)
      );
    }

    function judge(label, gl, letters) {
      var R = refs();
      if (!R[label]) return null;
      var cm = cellFeatures(gl, PPC.CAP_MM * PPC.DPMM);
      if (!cm) return null;
      var own = shapeScore(cm, R[label]);
      var best = null;
      letters.forEach(function (ch) {
        if (!R[ch] || sameShape(ch, label)) return;
        var s = shapeScore(cm, R[ch]);
        if (!best || s > best.s) best = { ch: ch, s: s };
      });
      if (!best) return null;
      var margin = best.s - own;
      return {
        own: own,
        best: best.ch,
        bestScore: best.s,
        margin: margin,
        doubt: margin >= MARGIN && best.s >= ABS_MIN,
      };
    }

    function cellInfo(n, k) {
      try {
        var on = document.querySelector("#pp-presets .pp-chip.on");
        var id = on ? on.getAttribute("data-p") : "min";
        var custom = document.getElementById("pp-custom");
        var letters =
          typeof GT_CSET === "object" && GT_CSET.chars
            ? GT_CSET.chars(id, custom ? custom.value : "")
            : PPC.PRESETS.min.set.split("");
        var page = (pageOfN && pageOfN.get(n)) || 0;
        var pages = PPC.pagesOf(letters.join(""));
        return { ch: (pages[page] || [])[k] || "", letters: letters };
      } catch {
        return { ch: "", letters: [] };
      }
    }

    var judged = typeof WeakMap === "function" ? new WeakMap() : null;
    PPC.sliceCell = function (n, k, thr) {
      var res = origSlice.apply(this, arguments);
      try {
        if (res.empty || !res.glyph) return res;
        var info = cellInfo(n, k);
        if (!info.ch) return res;
        var key = k + "|" + thr + "|" + info.letters.length;
        var bag = judged && judged.get(n);
        if (judged && !bag) judged.set(n, (bag = {}));
        var j = bag && bag[key] !== undefined ? bag[key] : judge(info.ch, res.glyph, info.letters);
        if (bag) bag[key] = j;
        MATCH[info.ch] = j;
        if (j && j.doubt && !DECIDED[info.ch]) {
          return Object.assign({}, res, { m: Object.assign({}, res.m, { touch: true }) });
        }
      } catch {}
      return res;
    };

    /* ---------- интервалы: база по штриху и высоте, как у библиотечных гротесков ---------- */

    var origSp = drnOptSp;
    var ROUND_RATIO = 0.65;
    drnOptSp = function () {
      var r = origSp.apply(this, arguments);
      if (!PP.open || !r || !r.ref) return r;
      try {
        var G = arguments[0];
        var chars = Object.keys(G)
          .filter(function (ch) {
            return !IMP_ISMARK(ch) && G[ch] && G[ch].length;
          })
          .sort();
        var prof = {};
        chars.forEach(function (ch) {
          var p = drnOptDepth(ch, G[ch]);
          if (p) prof[ch] = p;
        });
        var cap = DRN.cap;
        var base = Math.max(40, Math.min(140, 0.08 * cap + 0.4 * (r.ref.stem || 40)));
        var near = [];
        chars.forEach(function (ch) {
          var p = prof[ch];
          if (!p) return;
          [p.dL, p.dR].forEach(function (d) {
            var c = drnSideClass(d, p.H);
            if ((c === "s" || c === "d") && drnMean(d) < 0.1 * p.H) near.push(drnMean(d));
          });
        });
        near.sort(function (a, b) {
          return a - b;
        });
        var ds = near.length ? near[near.length >> 1] : 0;
        var lam = (0.35 * base) / (0.18 * cap);
        ["О", "O", "о", "o"].some(function (ch) {
          var p = prof[ch];
          if (!p) return false;
          var dm = (drnMean(p.dL) + drnMean(p.dR)) / 2;
          var den = dm - ROUND_RATIO * DRN_LAM.d * ds;
          if (dm > 5 && den > 1 && drnSideClass(p.dL, p.H) === "r") {
            lam = ((1 - ROUND_RATIO) * base) / den;
            return true;
          }
          return false;
        });
        var mn = Math.round(0.35 * base);
        var mx = Math.round(1.25 * base);
        var sp = {};
        chars.forEach(function (ch) {
          var p = prof[ch];
          if (!p) return;
          var cl = [drnSideClass(p.dL, p.H), drnSideClass(p.dR, p.H)];
          var side = function (d, c) {
            return Math.max(mn, Math.min(mx, Math.round(base - lam * DRN_LAM[c] * drnMean(d))));
          };
          var l = side(p.dL, cl[0]);
          var rr = side(p.dR, cl[1]);
          if (Math.abs(l - rr) <= 3 && cl[0] === cl[1]) {
            l = rr = Math.round((l + rr) / 2);
          }
          sp[ch] = { l: l, r: rr, cl: cl[0] + cl[1] };
        });
        var out = { sp: sp, ref: { stem: r.ref.stem, sbS: Math.round(base), lam: Math.round(lam * 1000) / 1000, calib: true } };
        window.__gtPaperSp = out;
        return out;
      } catch {
        return r;
      }
    };

    window.__gtPaperMatch = MATCH;
  }

  /* ---------- интерфейс шага «Проверка» и «Шрифт» ---------- */

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent =
      "#view-paper .pp-cols.chk{display:grid;gap:var(--s4);min-height:0;cursor:auto}" +
      "#view-paper .pp-bar,#view-paper #pp-presets{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;max-width:100%}" +
      "#view-paper .pp-bar::-webkit-scrollbar,#view-paper #pp-presets::-webkit-scrollbar{display:none}" +
      "#view-paper .pp-bar .chip,#view-paper #pp-presets .chip{flex:none}" +
      "#view-paper .pp-tile.empty{box-shadow:inset 0 0 0 1px var(--line);background:var(--panel)}" +
      "#view-paper .pp-tile.empty .st{display:none}" +
      "#view-paper .pp-tile.empty .lb{color:var(--text-2);box-shadow:none;background:transparent}" +
      "#view-paper .pp-tile.empty.picked{box-shadow:0 0 0 2px var(--ink)}" +
      "#view-paper .pp-tag.neutral{background:var(--panel);color:var(--text-2)}" +
      "#view-paper .pp-sum{display:grid;gap:var(--s2);margin:var(--s4) 0 0;padding:var(--s4);border-radius:var(--r-md);background:var(--paper);box-shadow:inset 0 0 0 1px var(--line);min-width:0}" +
      "#view-paper .pp-sum-h{margin:0;font-size:var(--fs-md);color:var(--text-2)}" +
      "#view-paper .pp-sum-h b{color:var(--ink);font-weight:var(--fw-b)}" +
      "#view-paper .pp-sum-b{display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr);gap:var(--s1) var(--s4);align-items:baseline;margin:0;font-size:var(--fs-md)}" +
      "#view-paper .pp-sum-b dt{color:var(--text-2);font-size:var(--fs-sm)}" +
      "#view-paper .pp-sum-b dd{margin:0;min-width:0;overflow-wrap:anywhere;letter-spacing:.08em;line-height:1.5}" +
      "#view-paper .pp-sum-b dd .g{display:inline-block;min-width:6.5em;letter-spacing:0;color:var(--text-2);font-size:var(--fs-sm);font-weight:var(--fw-r)}" +
      "#view-paper .pp-sum-b dd.f .l{color:var(--ink);font-weight:var(--fw-b)}" +
      "#view-paper .pp-sum-b dd.m .l{color:var(--text-2);font-weight:var(--fw-sb)}" +
      "#view-paper .pp-sum-b dd i{font-style:normal;letter-spacing:0;font-weight:var(--fw-r)}" +
      "#view-paper .pp-sum-n{margin:0;font-size:var(--fs-md);color:var(--text-2)}" +
      "#view-paper .pp-doubt{display:grid;gap:var(--s2);margin:0 0 var(--s3)}" +
      "#view-paper .pp-doubt[hidden]{display:none}" +
      "#view-paper .pp-doubt .pp-row{gap:var(--s2)}" +
      "#view-paper .pp-doubt .pp-note{font-size:var(--fs-md)}" +
      "#view-paper .pp-sum-b dd.w .l{color:var(--warn-text);font-weight:var(--fw-b)}" +
      "@media (max-width:720px){#view-paper .pp-sum{padding:var(--s3)}#view-paper .pp-sum-b{grid-template-columns:minmax(0,1fr);gap:0}#view-paper .pp-sum-b dd{margin-bottom:var(--s2)}#view-paper .pp-sum-b dd .g{display:block}}";
    document.head.appendChild(st);
  }

  function setText(el, t) {
    if (el && el.textContent !== t) el.textContent = t;
  }

  var GROUPS = [
    ["Заглавные", /[А-ЯЁ]/],
    ["Строчные", /[а-яё]/],
    ["Латиница", /[A-Za-z]/],
    ["Цифры и знаки", /[^А-Яа-яЁёA-Za-z]/],
  ];

  function groupLines(list, all, kind) {
    var rows = [];
    GROUPS.forEach(function (g) {
      var inAll = all.filter(function (c) {
        return g[1].test(c);
      });
      if (!inAll.length) return;
      var sub = list.filter(function (c) {
        return g[1].test(c);
      });
      if (!sub.length) return;
      var txt;
      if (kind === "m" && sub.length === inAll.length && sub.length > 6) {
        txt = "<i>все " + sub.length + "</i>";
      } else {
        txt = esc(sub.join(" "));
      }
      rows.push([g[0], txt]);
    });
    return rows;
  }

  var snap = null;
  var busy = false;

  function readTiles() {
    var tiles = [].slice.call(document.querySelectorAll("#pp-grid .pp-tile"));
    return tiles.map(function (t) {
      return { ch: t.dataset.ch, st: t.dataset.st };
    });
  }

  function currentFilter() {
    var on = document.querySelector("#pp-filters .pp-chip.on");
    return on ? on.getAttribute("data-f") : "all";
  }

  function fullState() {
    var f = currentFilter();
    if (f === "all") {
      snap = readTiles();
      return snap;
    }
    var all = document.querySelector('#pp-filters [data-f="all"]');
    var back = document.querySelector('#pp-filters [data-f="' + f + '"]');
    if (all && back) {
      busy = true;
      try {
        all.click();
        snap = readTiles();
        var again = document.querySelector('#pp-filters [data-f="' + f + '"]');
        if (again) again.click();
      } finally {
        busy = false;
      }
      return snap;
    }
    return snap || readTiles();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function doubtOf(ch) {
    var j = MATCH[ch];
    return j && j.doubt && !DECIDED[ch] ? j : null;
  }

  function summaryHTML(state) {
    var found = state
      .filter(function (t) {
        return t.st === "ok" || t.st === "warn";
      })
      .map(function (t) {
        return t.ch;
      });
    var miss = state
      .filter(function (t) {
        return t.st === "empty";
      })
      .map(function (t) {
        return t.ch;
      });
    var off = state.filter(function (t) {
      return t.st === "off";
    }).length;
    var all = state.map(function (t) {
      return t.ch;
    });
    var warn = state
      .filter(function (t) {
        return t.st === "warn";
      })
      .map(function (t) {
        return t.ch;
      });
    var h =
      "Найдено <b>" + found.length + "</b> из " + all.length +
      (warn.length ? ", из них сомнительных <b>" + warn.length + "</b>" : "") +
      ". Не написано <b>" + miss.length + "</b>" +
      (off ? ", исключено " + off : "") + ".";
    var body = "";
    var f = groupLines(found, all, "f");
    var m = groupLines(miss, all, "m");
    var rowsHTML = function (rows, cls) {
      return rows
        .map(function (r) {
          return "<span class=\"g\">" + r[0] + "</span> <span class=\"" + cls + "\">" + r[1] + "</span>";
        })
        .join("<br>");
    };
    if (f.length) body += "<dt>Найдены</dt><dd class=\"f\">" + rowsHTML(f, "l") + "</dd>";
    if (warn.length) {
      body +=
        "<dt>Сомнительные</dt><dd class=\"w\">" +
        warn
          .map(function (ch) {
            var j = doubtOf(ch);
            return "<span class=\"l\">" + esc(ch) + "</span>" + (j ? " <span class=\"g\">похоже на «" + esc(j.best) + "»</span>" : "");
          })
          .join("<br>") +
        "</dd>";
    }
    if (m.length) body += "<dt>Не написаны</dt><dd class=\"m\">" + rowsHTML(m, "l") + "</dd>";
    return { html: "<p class=\"pp-sum-h\">" + h + "</p>" + (body ? "<dl class=\"pp-sum-b\">" + body + "</dl>" : "") + "", found: found, miss: miss, all: all };
  }

  var lastSum = "";

  function applyCheck() {
    var view = document.getElementById("pp-v-check");
    if (!view) return;
    var card = view.querySelector(".pp-card");
    var state = fullState();
    var lead = card && card.querySelector(".pp-lead");
    setText(
      lead,
      "Каждая ячейка нарезана и подписана. Зелёная галочка: буква найдена. Жёлтая: буква сомнительна, например похожа на другую. " +
        "Серая ячейка: буква не написана, в шрифт она не попадёт. Нажмите на букву, чтобы исключить её, назначить другой знак или переснять ячейку."
    );
    var prog = document.getElementById("pp-prog-t");
    if (prog) setText(prog, prog.textContent.replace(/^готово/, "найдено"));
    var chip = document.querySelector('#pp-filters [data-f="empty"]');
    if (chip && chip.firstChild && chip.firstChild.nodeType === 3 && chip.firstChild.nodeValue !== "Не написаны") {
      chip.firstChild.nodeValue = "Не написаны";
    }
    [].forEach.call(document.querySelectorAll("#pp-grid .pp-tile.empty"), function (t) {
      var lab = "Буква " + t.dataset.ch + ": не написана";
      if (t.getAttribute("aria-label") !== lab) t.setAttribute("aria-label", lab);
    });
    var st = document.getElementById("pp-d-st");
    if (st && st.textContent === "пусто") {
      st.className = "pp-tag neutral";
      st.textContent = "не написана";
    }
    var why = document.getElementById("pp-d-why");
    if (why && why.children.length && !document.getElementById("pp-d-body").hidden && st && st.textContent === "не написана") {
      why.textContent = "";
    }
    [].forEach.call(document.querySelectorAll("#pp-grid .pp-tile.warn"), function (t) {
      var jj = doubtOf(t.dataset.ch);
      if (!jj) return;
      var lab = "Буква " + t.dataset.ch + ": сомнительно, похожа на " + jj.best;
      if (t.getAttribute("aria-label") !== lab) t.setAttribute("aria-label", lab);
    });
    var picked = document.querySelector("#pp-grid .pp-tile.picked");
    var dch = picked ? picked.dataset.ch : "";
    var dj = picked && picked.dataset.st === "warn" ? doubtOf(dch) : null;
    var box = document.getElementById("pp-d-doubt");
    if (!box && why) {
      box = document.createElement("div");
      box.id = "pp-d-doubt";
      box.className = "pp-doubt";
      why.after(box);
      box.addEventListener("click", onDoubtClick);
    }
    if (dj && why) {
      var tags = why.querySelectorAll(".pp-tag");
      var noteHTML = "<span class=\"pp-tag warn\" data-doubt=\"1\">Похоже на «" + esc(dj.best) + "»</span>";
      if (!why.querySelector("[data-doubt]")) {
        var plain = [].filter.call(tags, function (t) {
          return t.textContent !== "касается границы";
        });
        why.innerHTML = noteHTML + plain.map(function (t) { return t.outerHTML; }).join("");
      }
    }
    if (box) {
      var target = state.filter(function (t) {
        return dj && t.ch === dj.best;
      })[0];
      var free = !!(target && target.st === "empty");
      var sig = dj ? dch + ">" + dj.best + ">" + (free ? 1 : 0) : "";
      if (box.getAttribute("data-sig") !== sig) {
        box.setAttribute("data-sig", sig);
        box.hidden = !dj;
        box.innerHTML = dj
          ? (free
              ? ""
              : "<p class=\"pp-note\">Ячейка «" + esc(dj.best) + "» уже занята, поэтому буква остаётся под своим знаком.</p>") +
            "<div class=\"pp-row\">" +
            (free ? "<button class=\"btn sm\" type=\"button\" data-a=\"take\">Считать «" + esc(dj.best) + "»</button>" : "") +
            "<button class=\"btn sm ghost\" type=\"button\" data-a=\"keep\">Оставить «" + esc(dch) + "»</button></div>"
          : "";
      }
    }
    var info = document.getElementById("pp-d-info");
    if (info && info.textContent === "В ячейке пусто.") {
      setText(info, "Эта буква на листе не написана. Её можно дописать позже или переснять ячейку.");
    }
    var sum = document.getElementById("pp-sum");
    if (!sum && card) {
      var prog2 = card.querySelector(".pp-prog");
      sum = document.createElement("div");
      sum.id = "pp-sum";
      sum.className = "pp-sum";
      sum.setAttribute("role", "status");
      sum.setAttribute("aria-live", "polite");
      if (prog2) prog2.after(sum);
    }
    if (!state.length) {
      if (sum) sum.hidden = true;
      return;
    }
    if (sum) sum.hidden = false;
    var s = summaryHTML(state);
    if (sum && s.html !== lastSum) {
      sum.innerHTML = s.html;
      lastSum = s.html;
    } else if (sum && !sum.innerHTML) {
      sum.innerHTML = s.html;
    }
    var note = document.getElementById("pp-chk-note");
    if (note) {
      setText(note, s.miss.length ? "Не написанные буквы в шрифт не попадут. Их можно дописать позже." : "");
    }
  }

  function onDoubtClick(e) {
    var b = e.target.closest("button[data-a]");
    var picked = document.querySelector("#pp-grid .pp-tile.picked");
    if (!b || !picked) return;
    var ch = picked.dataset.ch;
    var j = MATCH[ch];
    DECIDED[ch] = true;
    if (b.getAttribute("data-a") === "take" && j) {
      var re = document.getElementById("pp-d-re");
      if (re) {
        re.value = j.best;
        re.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
    var sh = document.getElementById("pp-sharp");
    if (sh) sh.dispatchEvent(new Event("input", { bubbles: true }));
  }

  var DICT = null;
  function dict() {
    if (DICT) return DICT;
    var seen = {};
    DICT = WORDS.split(/\s+/).filter(function (w) {
      if (!w || seen[w]) return false;
      seen[w] = 1;
      return true;
    });
    return DICT;
  }

  function sampleText(found) {
    var set = {};
    found.forEach(function (c) {
      set[c] = 1;
    });
    var lines = [];
    var chunk = [];
    found.forEach(function (c, i) {
      chunk.push(c);
      if (chunk.length === 7 || i === found.length - 1) {
        lines.push(chunk.join(""));
        chunk = [];
      }
    });
    var words = [];
    dict().forEach(function (w) {
      var variants = [w.toUpperCase(), w.charAt(0).toUpperCase() + w.slice(1), w];
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        if (v.length >= 3 && v.split("").every(function (c) { return set[c]; })) {
          if (words.indexOf(v) < 0) words.push(v);
          break;
        }
      }
    });
    words.sort(function (a, b) {
      return b.length - a.length;
    });
    var out = lines.join(" ");
    if (words.length) out += "\n" + words.slice(0, 8).join(" ");
    return out;
  }

  var genText = "";

  function applyFont() {
    var view = document.getElementById("pp-v-font");
    if (!view || view.hidden) return;
    var g = document.getElementById("pp-st-g");
    var mlab = document.getElementById("pp-st-m");
    if (mlab && mlab.nextElementSibling) setText(mlab.nextElementSibling, "не написаны");
    var state = snap || readTiles();
    if (!state.length) return;
    var s = summaryHTML(state);
    var miss = document.getElementById("pp-miss");
    var traced = g ? +g.textContent : s.found.length;
    var msg;
    if (!traced) {
      msg = "Ни один знак не удалось обвести. Вернитесь к шагу «Проверка» и проверьте буквы или переснимите лист.";
    } else if (!s.miss.length) {
      msg = "Все знаки набора найдены.";
    } else {
      msg =
        "В шрифте " + traced + " " + plural(traced, "знак", "знака", "знаков") + " с вашего листа: " + s.found.join(" ") +
        ". Не написано " + s.miss.length + ", в файл эти знаки не попадут. Их можно дорисовать в редакторе.";
    }
    if (traced && traced < s.found.length) {
      msg += " Не удалось обвести " + (s.found.length - traced) + ": проверьте их на шаге «Проверка».";
    }
    setText(miss, msg);
    var ta = document.getElementById("pp-pv-txt");
    if (ta && s.found.length && s.miss.length && (ta.value === DEFAULT_TEXT || ta.value === genText)) {
      var t = sampleText(s.found);
      if (t !== ta.value) {
        genText = t;
        ta.value = t;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function plural(n, a, b, c) {
    var m = n % 100;
    var k = n % 10;
    return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c;
  }

  var obs = null;
  function apply() {
    if (busy) return;
    try {
      ensureStyles();
      applyCheck();
      applyFont();
    } catch {
      if (window.console) console.warn("paper patch", e);
    }
    if (obs) obs.takeRecords();
  }

  function attach() {
    var view = document.getElementById("view-paper");
    if (!view) return false;
    view.addEventListener(
      "change",
      function (e) {
        if (e.target && e.target.id === "pp-d-re") {
          var pk = document.querySelector("#pp-grid .pp-tile.picked");
          if (pk) DECIDED[pk.dataset.ch] = true;
        }
      },
      true
    );
    obs = new MutationObserver(apply);
    obs.observe(view, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
    apply();
    return true;
  }

  function boot() {
    if (!ready()) {
      setTimeout(boot, 120);
      return;
    }
    if (window.__gtPaperPatch) return;
    window.__gtPaperPatch = true;
    install();
    ensureStyles();
    if (!attach()) {
      var w = new MutationObserver(function () {
        if (attach()) w.disconnect();
      });
      w.observe(document.body, { childList: true, subtree: true });
    }
  }

  boot();
})();
