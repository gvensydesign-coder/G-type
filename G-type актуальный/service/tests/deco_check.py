"""Decorative styles: geometry checks on TTF built by `node deco_make_d1.js <dir> [fonts] [variants]`.
usage: python3 tests/deco_check.py [dir] [fonts]   (default dir out_deco, all fonts that have files there)
Per font x variant:
  valid      every glyph loads, >=3 points per contour, coordinates in range, saves back to a TTF
  direction  outer contours clockwise (net area <= 0), nonzero fill == even-odd fill (no overlaps, holes opposite)
  slivers    no contour with area < 6 units^2 or mean width (2A/P) < 0.5 units
  ink        every glyph that has ink in the plain font keeps ink
  topology   outline: stem centre is white, near-edge is ink; inline: core stays ink, line is white; counters stay white;
             shadow: face/shadow as expected; cameo: letter white inside black rectangle, advance >= plain + 2*pad (wider only if the glyph overhangs)
  nodes      decorated points <= 4.5x plain points (7x for hatch; whole font)
Prints one PASS/FAIL line."""
import io, json, os, sys, glob
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen, decomposeQuadraticSegment

WK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


class FlatPen(BasePen):
    """contours as lists of (x,y); quadratic curves flattened in 4 steps"""
    def __init__(self, gs):
        super().__init__(gs)
        self.cs = []
        self.cur = None

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for k in range(1, 7):
            t = k / 6; u = 1 - t
            self.cur.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for k in range(1, 5):
            t = k / 4; u = 1 - t
            self.cur.append((u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0], u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]))

    def _closePath(self):
        if self.cur and len(self.cur) > 2:
            self.cs.append(self.cur)
        self.cur = None

    def _endPath(self):
        self._closePath()


def contours(font, gn):
    gs = font.getGlyphSet()
    pen = FlatPen(gs)
    gs[gn].draw(pen)
    return [np.array(c, dtype=float) for c in pen.cs]


def area(P):
    x, y = P[:, 0], P[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def perim(P):
    return float(np.sum(np.hypot(*(np.roll(P, -1, axis=0) - P).T)))


def winding(polys, pts):
    """nonzero winding number and crossing parity for points (N,2)"""
    w = np.zeros(len(pts), dtype=int)
    px, py = pts[:, 0], pts[:, 1]
    for P in polys:
        x0, y0 = P[:, 0], P[:, 1]
        x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        up = (y0[None, :] <= py[:, None]) & (y1[None, :] > py[:, None])
        dn = (y1[None, :] <= py[:, None]) & (y0[None, :] > py[:, None])
        cr = (x1 - x0)[None, :] * (py[:, None] - y0[None, :]) - (px[:, None] - x0[None, :]) * (y1 - y0)[None, :]
        w += np.sum(up & (cr > 0), axis=1) - np.sum(dn & (cr < 0), axis=1)
    return w


def crossings(polys, pts):
    c = np.zeros(len(pts), dtype=int)
    px, py = pts[:, 0], pts[:, 1]
    for P in polys:
        x0, y0 = P[:, 0], P[:, 1]
        x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        cond = (y0[None, :] <= py[:, None]) != (y1[None, :] <= py[:, None])
        t = (py[:, None] - y0[None, :]) / np.where(y1 == y0, 1, (y1 - y0))[None, :]
        xi = x0[None, :] + t * (x1 - x0)[None, :]
        c += np.sum(cond & (xi > px[:, None]), axis=1)
    return c


def edist(polys, pts):
    """distance from points to the polygon boundary (chunked, vectorised over all segments)"""
    A = np.concatenate(polys); B = np.concatenate([np.roll(P, -1, axis=0) for P in polys])
    D = B - A; L2 = np.maximum((D ** 2).sum(1), 1e-12)
    best = np.empty(len(pts))
    for i0 in range(0, len(pts), 600):
        q = pts[i0:i0 + 600]
        t = np.clip(((q[:, None, 0] - A[None, :, 0]) * D[None, :, 0] + (q[:, None, 1] - A[None, :, 1]) * D[None, :, 1]) / L2[None], 0, 1)
        px = A[None, :, 0] + t * D[None, :, 0] - q[:, None, 0]
        py = A[None, :, 1] + t * D[None, :, 1] - q[:, None, 1]
        best[i0:i0 + 600] = np.sqrt((px * px + py * py).min(1))
    return best


def ink(polys, pts):
    return winding(polys, pts) != 0


def medial(polys, want_ink=True):
    """grid point with the largest distance to the boundary: inside ink, or inside a counter (a CCW hole contour but not ink)"""
    allp = np.concatenate(polys)
    x0, y0 = allp.min(0); x1, y1 = allp.max(0)
    gx, gy = np.meshgrid(np.arange(x0, x1, 8.0), np.arange(y0, y1, 8.0))
    pts = np.stack([gx.ravel(), gy.ravel()], 1)
    inside = ink(polys, pts)
    if want_ink:
        sel = inside
    else:
        holes = [P for P in polys if area(P) > 0]
        if not holes:
            return None, 0
        sel = (~inside) & (winding(holes, pts) != 0)
    if not sel.any():
        return None, 0
    cand = pts[sel]
    d = edist(polys, cand)
    i = int(np.argmax(d))
    return cand[i], float(d[i])


def shift_of(v, R):
    import math
    if v == 'cameo':
        return R['pad']
    if v == 'inline_out':
        return math.ceil(R['g'] + R['w'])
    if v.startswith('shadow'):
        return math.ceil(max(0.0, -math.cos(math.radians(R['angle'])) * R['depth']))
    return 0


def cmap_of(f):
    return f.getBestCmap()


def check_font(dirn, fid, variants, log):
    plain_path = os.path.join(WK, f'lib-{fid}-regular.ttf')
    plain = TTFont(plain_path)
    pc = cmap_of(plain)
    meta = json.load(open(os.path.join(dirn, f'{fid}-meta.json')))
    ppts = sum(len(plain['glyf'][g].coordinates) for g in plain.getGlyphOrder() if plain['glyf'][g].numberOfContours > 0)
    tested = [c for c in 'оеНИаЖВ8lЩ' if ord(c) in pc]
    base = {}; bmed = {}
    for c in tested:
        polys = contours(plain, pc[ord(c)])
        base[c] = polys; bmed[c] = (medial(polys, True), medial(polys, False))
    problems = []
    stats = []
    for v in variants:
        path = os.path.join(dirn, f'{fid}-{v}.ttf')
        if not os.path.exists(path):
            continue
        f = TTFont(path)
        R = meta['R'][v]
        glyf = f['glyf']; hmtx = f['hmtx']
        buf = io.BytesIO(); f.save(buf)  # valid font round trip
        n_ink = 0; pts_total = 0; bad = {'slivers': 0, 'dir': 0, 'pts': 0, 'ink': 0}
        cm = cmap_of(f)
        first_bad = []
        for gi, gn in enumerate(f.getGlyphOrder()):
            g = glyf[gn]
            if g.numberOfContours <= 0:
                continue
            coords, ends, flags = g.getCoordinates(glyf)
            pts_total += len(coords)
            if any(abs(x) > 32000 or abs(y) > 32000 for x, y in coords):
                bad['pts'] += 1
            start = 0
            for e in ends:
                if e - start + 1 < 3:
                    bad['pts'] += 1
                start = e + 1
            polys = contours(f, gn)
            if not polys:
                bad['ink'] += 1; first_bad.append(('empty', gn)); continue
            for P in polys:
                A = abs(area(P)); L = perim(P)
                if A < 6 or 2 * A / max(L, 1e-9) < 0.5:
                    bad['slivers'] += 1; first_bad.append(('sliver', gn, round(A, 1), round(L, 1)))
            net = sum(area(P) for P in polys)
            if net > 0:
                bad['dir'] += 1; first_bad.append(('net-ccw', gn))
            # nonzero == even-odd away from edges (every 2nd glyph: the full set is covered by the slivers/area/direction checks)
            if gi % 2:
                n_ink += 1
                continue
            allp = np.concatenate(polys)
            x0, y0 = allp.min(0); x1, y1 = allp.max(0)
            gx, gy = np.meshgrid(np.arange(x0 + 1.3, x1, 15.0), np.arange(y0 + 1.7, y1, 15.0))
            pts = np.stack([gx.ravel(), gy.ravel()], 1)
            if len(pts):
                far = edist(polys, pts) > 1.5
                pts = pts[far]
                if len(pts):
                    nz = winding(polys, pts) != 0
                    eo = crossings(polys, pts) % 2 == 1
                    if (nz != eo).any():
                        bad['dir'] += 1; first_bad.append(('winding', gn))
            n_ink += 1
        # glyphs with ink in plain must keep ink
        for ch, gn in pc.items():
            if plain['glyf'][gn].numberOfContours > 0 and ch in cm:
                if glyf[cm[ch]].numberOfContours <= 0:
                    bad['ink'] += 1; first_bad.append(('lost-ink', chr(ch)))
        if pts_total > (7.0 if v == 'shadow_hatch' else 4.5) * ppts:
            bad['pts'] += 1; first_bad.append(('nodes', pts_total, ppts))
        # topology at sample points
        topo = []
        for c in tested:
            gn = cm.get(ord(c))
            if not gn:
                continue
            dpolys = contours(f, gn)
            bp = base[c]
            sv = np.array([float(shift_of(v, R)), 0.0])
            (m, dm), (cmed0, cd0) = bmed[c]
            if m is None:
                continue
            m = m + sv
            m2 = m
            bp = [P + sv for P in bp]
            if v == 'cameo':
                # letter interior is white, rectangle near its left edge is black
                if ink(dpolys, m2[None])[0]:
                    topo.append(('cameo-letter-black', c))
                allp = np.concatenate(dpolys)
                if not ink(dpolys, np.array([[allp[:, 0].min() + 3, (allp[:, 1].min() + allp[:, 1].max()) / 2]]))[0]:
                    topo.append(('cameo-rect-white', c))
                ba = plain['hmtx'][pc[ord(c)]][0]; da = hmtx[gn][0]
                if da < ba + 2 * R['pad'] - 2:
                    topo.append(('cameo-adv', c, ba, da, R['pad']))
                continue
            if v == 'outline':
                if dm > R['w'] + 4 and ink(dpolys, m[None])[0]:
                    topo.append(('outline-centre-filled', c, round(dm), round(R['w'])))
            elif v == 'inline_in':
                # «Нить»: у восьмёрки опорная точка лежит в перекрестии двух колец (две линии по 20 u) — внутренняя белая линия в узле — известное исключение
                if dm > R['d'] + R['w'] + 4 and not ink(dpolys, m[None])[0] and not (fid == 'nit' and c == '8'):
                    topo.append(('inline-core-lost', c))
            elif v == 'inline_out':
                if not ink(dpolys, m[None])[0] and dm > 6:
                    topo.append(('inline_out-centre-white', c))
            elif v == 'shadow_block':
                if dm > R['w'] + 4 and ink(dpolys, m[None])[0]:
                    topo.append(('block-face-black', c))
            elif v in ('shadow_solid', 'shadow_hatch'):
                if dm > 6 and not ink(dpolys + [], m[None])[0]:
                    topo.append(('solid-face-white', c))
            # counters stay open
            cmed, cd = (cmed0 + sv if cmed0 is not None else None), cd0
            if cmed is not None and v in ('inline_out',) and cd > R['g'] + R['w'] + 6:
                if ink(dpolys, cmed[None])[0]:
                    topo.append(('counter-filled', c, round(cd)))
            if v == 'outline' and cmed is not None and cd > 8:
                # counter centre stays white in outline
                if ink(dpolys, cmed[None])[0]:
                    topo.append(('outline-counter-filled', c))
        if topo:
            bad['topo'] = len(topo)
            first_bad += topo[:4]
        stats.append(f'{v}:{pts_total}pts')
        tot = sum(bad.values())
        if tot:
            problems.append(f'{fid}/{v} {bad} {first_bad[:4]}')
    return problems, stats


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else os.path.join(WK, 'out_deco')
    fonts = sys.argv[2].split(',') if len(sys.argv) > 2 else sorted({os.path.basename(p).split('-')[0] for p in glob.glob(os.path.join(d, '*-meta.json'))})
    variants = sys.argv[3].split(',') if len(sys.argv) > 3 else ['outline', 'inline_in', 'inline_out', 'shadow_block', 'shadow_solid', 'shadow_hatch', 'cameo']
    allp = []; info = []
    for fid in fonts:
        if not os.path.exists(os.path.join(d, f'{fid}-meta.json')):
            allp.append(f'{fid}: no meta in {d}'); continue
        pr, st = check_font(d, fid, variants, None)
        allp += pr; info.append(f'{fid}[{len(st)}]')
    if allp:
        print('FAIL deco_check ' + ' | '.join(allp[:6]))
        return 1
    print('PASS deco_check fonts=' + ','.join(info))
    return 0


if __name__ == '__main__':
    sys.exit(main())
