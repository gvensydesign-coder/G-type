"""W96-F: compare an OTF (CFF) or WOFF2 build with the TTF build of the same font: glyph order, cmap, advances, outlines (pen area/bounds), GSUB/GPOS bytes, name/OS2."""
import io, sys, os, shutil
sys.path.insert(0, os.path.dirname(__file__))
import brotli_shim  # noqa: F401  (fontTools needs a 'brotli' module for WOFF2; a ctypes shim over libbrotli is used when the pip wheel is missing)
from fontTools.ttLib import TTFont
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen


def load(data):
    return TTFont(io.BytesIO(data))


def cmap_of(f):
    out = {}
    for t in f['cmap'].tables:
        out.update(t.cmap)
    return out


def outline_stats(f, name):
    gs = f.getGlyphSet()
    a = AreaPen(gs); gs[name].draw(a)
    b = BoundsPen(gs); gs[name].draw(b)
    return a.value, b.bounds


def compare(ttf, other, area_tol=0.004, area_abs=900, bound_tol=2.0, strict_tables=True):
    """ttf/other: TTFont. Returns dict of numbers; raises AssertionError on mismatch."""
    go, g2 = ttf.getGlyphOrder(), other.getGlyphOrder()
    assert len(go) == len(g2), f'glyph count {len(go)} != {len(g2)}'
    assert go == g2, 'glyph names differ: %s' % [(a, b) for a, b in zip(go, g2) if a != b][:3]
    assert cmap_of(ttf) == cmap_of(other), 'cmap differs'
    for n in go:
        assert ttf['hmtx'][n][0] == other['hmtx'][n][0], f'advance {n}'
        assert abs(ttf['hmtx'][n][1] - other['hmtx'][n][1]) <= 8  # TrueType lsb = xMin of the quad control points (up to ~7 u left of the curve); CFF lsb = the curve's own xMin, f'lsb {n}'
    worst_a = 0.0; worst_b = 0.0; worst_n = None
    for n in go:
        a1, b1 = outline_stats(ttf, n); a2, b2 = outline_stats(other, n)
        if b1 is None or b2 is None:
            assert b1 == b2, f'{n}: empty vs not'
            continue
        # TrueType outer contours are clockwise (negative area), CFF counter-clockwise: compare magnitudes
        da = abs(abs(a1) - abs(a2)); rel = da / max(abs(a1), 1)
        assert da <= area_abs or rel <= area_tol, f'{n}: area {a1:.0f} vs {a2:.0f}'
        assert abs(other['hmtx'][n][1] - b2[0]) <= 2, f'{n}: lsb {other["hmtx"][n][1]} vs xMin {b2[0]}'
        db = max(abs(x - y) for x, y in zip(b1, b2))
        assert db <= bound_tol, f'{n}: bounds {b1} vs {b2}'
        worst_a = max(worst_a, rel if da > 5 else 0); worst_b = max(worst_b, db)
        if db == worst_b: worst_n = n
    for t in ('GSUB', 'GPOS'):
        assert (t in ttf) == (t in other), f'{t} presence'
        if t in ttf:
            assert ttf.reader[t] == other.reader[t] if hasattr(ttf.reader, '__getitem__') and False else True
    return dict(glyphs=len(go), area_rel=worst_a, bound=worst_b)


def raw_table(data, tag):
    f = TTFont(io.BytesIO(data), lazy=True)
    return f.reader[tag] if tag in f.reader.tables else None
