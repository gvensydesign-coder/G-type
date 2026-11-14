#!/usr/bin/env python3
"""Regression: no self-intersecting contour (fold-back loop) in Liniya e-family / bowl-bar glyphs.
usage: liniya_loop_check.py FAMDIR VFDIR   (FAMDIR/Liniya-*.ttf static, VFDIR/liniya-{regular,italic}-VF.ttf sampled at wght 300/400/600/900)"""
import sys, glob, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
CHARS = 'еёєэәеeéêëěēėęGgЭЄ69θаaoоcсdqб'
class FP(BasePen):
    def __init__(s, gs): super().__init__(gs); s.cs = []; s.c = None
    def _moveTo(s, p): s.c = [p]; s.cs.append(s.c)
    def _lineTo(s, p): s.c.append(p)
    def _curveToOne(s, a, b, c):
        p = s.c[-1]
        for i in range(1, 9):
            t = i / 8; u = 1 - t
            s.c.append((u**3*p[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t**3*c[0], u**3*p[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t**3*c[1]))
    def _qCurveToOne(s, a, c):
        p = s.c[-1]
        for i in range(1, 7):
            t = i / 6; u = 1 - t
            s.c.append((u*u*p[0]+2*u*t*a[0]+t*t*c[0], u*u*p[1]+2*u*t*a[1]+t*t*c[1]))
    def _closePath(s): pass
    def _endPath(s): pass
def cross(a, b, c, d):
    o = lambda p, q, r: (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    return o(a, b, c)*o(a, b, d) < -1e-6 and o(c, d, a)*o(c, d, b) < -1e-6
def selfx(f, gn, loc=None):
    gs = f.getGlyphSet(location=loc) if loc else f.getGlyphSet()
    p = FP(gs); gs[gn].draw(p); k = 0
    for P in p.cs:
        n = len(P)
        for i in range(n):
            for j in range(i+2, n):
                if i == 0 and j == n-1: continue
                if cross(P[i], P[(i+1) % n], P[j], P[(j+1) % n]): k += 1
    return k
fam, vf = sys.argv[1], sys.argv[2]
bad = []; n = 0
jobs = [(p, None) for p in sorted(glob.glob(os.path.join(fam, 'Liniya-*.ttf')))]
for sty in ('regular', 'italic'):
    for w in (300, 400, 600, 900):
        jobs.append((os.path.join(vf, 'liniya-%s-VF.ttf' % sty), {'wght': w}))
for path, loc in jobs:
    f = TTFont(path); cm = f.getBestCmap()
    for ch in CHARS:
        gn = cm.get(ord(ch))
        if not gn: continue
        n += 1
        k = selfx(f, gn, loc)
        if k: bad.append((os.path.basename(path), loc, ch, k))
for b in bad: print('LOOP', *b)
print('liniya_loop_check glyphs', n, 'bad', len(bad))
sys.exit(1 if bad else 0)
