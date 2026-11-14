# usage: python3 tests/pxvf_check.py <vf_dir> <fam_dir> [weights]
# «Пиксель» variable font (pixel-regular-VF.ttf / pixel-italic-VF.ttf): fvar wght 300/400/900, avar, STAT, HVAR, gvar present; named instances Light/Regular/Bold/Black
# (300/400/700/900); gvar compatible (instancer works at every sampled weight); at every sampled weight every contour keeps its orientation, edges keep direction and
# no two edges of the same contour (or of a hole and any other contour) cross - outer/outer overlaps are fine (nonzero fill = union);
# instances vs the static family: glyph count and mean advance ratio, rasterised XOR reported. Prints one line per file and a final 'PASS pxvf ...' / 'FAIL pxvf ...'.
import os, sys
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

vf_dir, fam_dir = sys.argv[1], sys.argv[2]
WS = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else '300,350,400,450,550,650,700,750,850,900').split(',')]
GLY = 'HOnoaegsBRKЖжыЯбфЮ&@%80ШщЛм'
BASE = 'PixelGrid'


def contours(font, gn):
    g = font['glyf'][gn]
    if g.numberOfContours <= 0:
        return []
    out, s = [], 0
    for e in g.endPtsOfContours:
        pts = np.array(g.coordinates[s:e + 1], dtype=float); fl = g.flags[s:e + 1]
        out.append((pts, all(f & 1 for f in fl)))
        s = e + 1
    return out


def area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def cross_pairs(P, Q, same):
    """proper crossings between edge sets of P (n,2) and Q (m,2); same=True skips adjacent edges"""
    a, b = P, np.roll(P, -1, axis=0); c, d = Q, np.roll(Q, -1, axis=0)
    def orient(p, q, r):
        return (q[..., 0] - p[..., 0]) * (r[..., 1] - p[..., 1]) - (q[..., 1] - p[..., 1]) * (r[..., 0] - p[..., 0])
    A, B, C, D = a[:, None, :], b[:, None, :], c[None, :, :], d[None, :, :]
    o1, o2, o3, o4 = orient(A, B, C), orient(A, B, D), orient(C, D, A), orient(C, D, B)
    X = (o1 * o2 < 0) & (o3 * o4 < 0)
    if same:
        n = len(P); i = np.arange(n)
        X[i, i] = False; X[i, (i + 1) % n] = False; X[(i + 1) % n, i] = False
    return bool(X.any())


def check_glyph(f0, f1, gn):
    c0, c1 = contours(f0, gn), contours(f1, gn)
    if len(c0) != len(c1):
        return 'contour count'
    for k, ((p0, on0), (p1, on1)) in enumerate(zip(c0, c1)):
        if not (on0 and on1):
            return None          # rounded grid (not default): geometric test not applicable
        if area(p0) * area(p1) <= 0 and abs(area(p0)) > 1:
            return 'contour %d orientation flipped' % k
        d0, d1 = np.roll(p0, -1, axis=0) - p0, np.roll(p1, -1, axis=0) - p1
        if np.any((np.sign(d0) * np.sign(d1) < 0)):
            return 'contour %d edge reversed' % k
        if cross_pairs(p1, p1, True):
            return 'contour %d self-crossing' % k
    for i in range(len(c1)):
        for j in range(i + 1, len(c1)):
            hole_i, hole_j = area(c0[i][0]) * area(c0[0][0]) < 0, area(c0[j][0]) * area(c0[0][0]) < 0
            if (hole_i or hole_j) and cross_pairs(c1[i][0], c1[j][0], False):
                return 'contours %d/%d cross (hole)' % (i, j)
    return None


def render(fn, ch, sz=160):
    f = ImageFont.truetype(fn, sz)
    im = Image.new('L', (sz * 2, sz * 2), 0); ImageDraw.Draw(im).text((sz // 2, sz * 3 // 2), ch, font=f, fill=255, anchor='ls')
    return np.array(im) > 127


bad = 0; summary = []
for style in ('regular', 'italic'):
    fn = os.path.join(vf_dir, 'pixel-%s-VF.ttf' % style)
    probs = []
    if not os.path.exists(fn):
        print(fn, 'missing'); bad += 1; continue
    vf = TTFont(fn)
    for t in ('fvar', 'avar', 'STAT', 'HVAR', 'gvar'):
        if t not in vf: probs.append('no ' + t)
    ax = {a.axisTag: (a.minValue, a.defaultValue, a.maxValue) for a in vf['fvar'].axes}
    if ax.get('wght') != (300.0, 400.0, 900.0): probs.append('wght axis %s' % (ax.get('wght'),))
    inst = {vf['name'].getDebugName(i.subfamilyNameID): i.coordinates.get('wght') for i in vf['fvar'].instances}
    if inst != {'Light': 300.0, 'Regular': 400.0, 'Bold': 700.0, 'Black': 900.0}: probs.append('instances %s' % inst)
    if not any(r.langID == 0x419 for r in vf['name'].names): probs.append('no RU names')
    suffix = 'Italic' if style == 'italic' else ''
    ng = vf['maxp'].numGlyphs
    # gvar compatibility + geometry at sampled weights
    nbad = 0; first = []
    base = instancer.instantiateVariableFont(TTFont(fn), {'wght': 400}, inplace=False)
    order = base.getGlyphOrder()
    for w in WS:
        f1 = instancer.instantiateVariableFont(TTFont(fn), {'wght': w}, inplace=False)
        for gn in order:
            r = check_glyph(base, f1, gn)
            if r:
                nbad += 1
                if len(first) < 4: first.append('%s@%d %s' % (gn, w, r))
    if nbad: probs.append('geometry %d: %s' % (nbad, '; '.join(first)))
    # static family comparison
    stat = {}
    for wn, w in (('Light', 300), ('Regular', 400), ('Bold', 700), ('Black', 900)):
        sp = os.path.join(fam_dir, '%s-%s.ttf' % (BASE, ('Italic' if suffix else 'Regular') if wn == 'Regular' else wn + suffix))
        sf = TTFont(sp)
        if sf['maxp'].numGlyphs != ng: probs.append('glyph count %s %d!=%d' % (wn, sf['maxp'].numGlyphs, ng))
        it = instancer.instantiateVariableFont(TTFont(fn), {'wght': w}, inplace=False); tmp = '/tmp/_pxvf_%s_%d.ttf' % (style, w); it.save(tmp)
        r = []
        for ch in GLY:
            a, b = render(tmp, ch), render(sp, ch)
            r.append((a ^ b).sum() / max(1, (a | b).sum()))
        cm0, cm1 = sf.getBestCmap(), it.getBestCmap()
        ra = [it['hmtx'][cm1[c]][0] / sf['hmtx'][cm0[c]][0] for c in cm0 if 0x410 <= c <= 0x44f and sf['hmtx'][cm0[c]][0]]
        stat[wn] = (float(np.mean(r)), float(np.max(r)), float(np.mean(ra)))
        if np.mean(r) > 0.25 or np.max(r) > 0.6: probs.append('xor %s %.2f/%.2f' % (wn, np.mean(r), np.max(r)))
    print('pixel-%s-VF.ttf %dK axes %s glyphs %d geometry-bad %d xor(mean/max)/adv-ratio %s' % (
        style, os.path.getsize(fn) // 1024, ax, ng, nbad, ' '.join('%s:%.2f/%.2f/%.2f' % (k, *v) for k, v in stat.items())), probs or 'OK')
    bad += bool(probs); summary.append('%s %dK' % (style, os.path.getsize(fn) // 1024))
print(('FAIL' if bad else 'PASS'), 'pxvf', 'weights', len(WS), ' '.join(summary), 'bad', bad)
sys.exit(1 if bad else 0)
