# usage: python3 tests/uniwidth_check.py <famuw_dir> <font_prefix e.g. VoltGrotesk> [min_gap=2]
# 1) every glyph advance is identical in Light/Regular/Bold/Black (+Italic) -- ref: Regular
# 2) no collisions in 40 critical pairs per weight: min horizontal gap between ink profiles (advance + GPOS kern) >= min_gap
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ttfkern import kern_g
d, pre = sys.argv[1], sys.argv[2]
MING = float(sys.argv[3]) if len(sys.argv) > 3 else 2
PAIRS = ['nn', 'oo', 'no', 'on', 'HH', 'HO', 'OH', 'OO', 'AV', 'VA', 'AT', 'TA', 'LT', 'LY', 'PA', 'WA', 'YA', 'Ta', 'Te', 'To', 'Va', 'Ye',
         'T.', 'V,', 'F.', 'P.', '11', '17', '74', 'ГА', 'ТА', 'УА', 'ЛТ', 'Г.', 'Т.', 'Ту', 'Гд', 'ик', 'ыв', 'шш']
Y0, Y1, N = -200, 800, 100
def profile(font, gname):
    gs = font.getGlyphSet(); pen = DecomposingRecordingPen(gs); gs[gname].draw(pen)
    segs = []; cur = None; pts = []
    def flat(p0, ctrl, p1):
        if len(ctrl) == 0: return [p1]
        out = []
        for i in range(1, 9):
            t = i / 8
            if len(ctrl) == 1:
                a = (1 - t) ** 2; b = 2 * (1 - t) * t; c = t * t
                out.append((a * p0[0] + b * ctrl[0][0] + c * p1[0], a * p0[1] + b * ctrl[0][1] + c * p1[1]))
            else:
                out.append(p1)
        return out
    polys = []; poly = []; last = None
    for op, args in pen.value:
        if op == 'moveTo': poly = [args[0]]; last = args[0]
        elif op == 'lineTo': poly.append(args[0]); last = args[0]
        elif op == 'qCurveTo':
            pts_ = list(args)
            # implied on-curve points
            ctrl = pts_[:-1]; end = pts_[-1]
            cur_p = last
            for i, c in enumerate(ctrl):
                if i < len(ctrl) - 1: nxt = ((c[0] + ctrl[i + 1][0]) / 2, (c[1] + ctrl[i + 1][1]) / 2)
                else: nxt = end
                poly.extend(flat(cur_p, [c], nxt)); cur_p = nxt
            last = end
        elif op in ('closePath', 'endPath'):
            if poly: polys.append(poly); poly = []
    L = np.full(N, np.nan); R = np.full(N, np.nan)
    ys = Y0 + (np.arange(N) + 0.5) * (Y1 - Y0) / N
    for k, y in enumerate(ys):
        xs = []
        for P in polys:
            n = len(P)
            for i in range(n):
                a, b = P[i], P[(i + 1) % n]
                if (a[1] <= y < b[1]) or (b[1] <= y < a[1]):
                    xs.append(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
        if xs: L[k] = min(xs); R[k] = max(xs)
    return L, R
bad = 0; files = {}
for fn in sorted(os.listdir(d)):
    if fn.startswith(pre + '-') and fn.endswith('.ttf'): files[fn[len(pre) + 1:-4]] = TTFont(os.path.join(d, fn))
ref = files['Regular']; cmap = ref.getBestCmap()
adv0 = {g: ref['hmtx'][g][0] for g in ref.getGlyphOrder()}
for name, f in files.items():
    diff = [g for g in f.getGlyphOrder() if g in adv0 and f['hmtx'][g][0] != adv0[g]]
    if diff: print('advance differs', name, len(diff), diff[:6]); bad += 1
minpairs = {}
for name, f in files.items():
    cm = f.getBestCmap(); worst = (1e9, '')
    for p in PAIRS:
        a, b = cm.get(ord(p[0])), cm.get(ord(p[1]))
        if not a or not b: continue
        k = kern_g(f, a, b) or 0
        La, Ra = profile(f, a); Lb, Rb = profile(f, b)
        adva = f['hmtx'][a][0]
        gap = (adva + k + Lb) - Ra                    # per row, both glyphs present
        # allow lookahead of one row for diagonal contact
        g = np.nanmin(gap) if np.isfinite(gap).any() else 1e9
        if g < worst[0]: worst = (g, p)
        if g < MING: print('collision', name, p, 'gap %.1f kern %s' % (g, k)); bad += 1
    minpairs[name] = worst
    print(name, 'advances equal to Regular: %d glyphs' % len(adv0), '| min pair gap %.1f at %s' % worst)
print('uniwidth_check pairs', len(PAIRS), 'bad', bad)
sys.exit(1 if bad else 0)
