"""import: 10 generated Latin SVG glyphs -> UI file input -> build -> TTF validated with fontTools."""
import io, os, sys, glob, subprocess, shutil
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, WK, LOGS
from fontTools.ttLib import TTFont

CHARS = 'HOnoxeaspl'           # 10 glyphs, Latin
CAP = 700                      # cap height of the fixtures (viewBox base 900, H top 200)
TOL_CAP = 25                   # units of 1000 em
TOL_BASE = 5


def make_fixtures():
    out = os.path.join(LOGS, 'fx_import')
    shutil.rmtree(out, ignore_errors=True)
    subprocess.run(['node', os.path.join(WK, 'fixtures.js'), out, 'kvadra', 'abs', CHARS],
                   cwd=WK, check=True, stdout=subprocess.DEVNULL)
    fs = sorted(glob.glob(os.path.join(out, '*.svg')))
    assert len(fs) == len(CHARS), f'fixtures {len(fs)}'
    return fs


def import_check(p):
    fs = make_fixtures()
    s = Session(p, 'import')
    try:
        pg = s.pg
        pg.click('#imp-card')
        pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
        pg.set_input_files('#imp-files', fs)
        pg.wait_for_function(f"Object.keys(IMP.glyphs).length>={len(CHARS)} && !IU.pending.length", timeout=60000)
        got = s.js("Object.keys(IMP.glyphs).length")
        assert got == len(CHARS), f'glyph count {got}'
        pg.click('#imp-build')
        pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
        name, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        cm = f.getBestCmap()
        upm = f['head'].unitsPerEm
        missing = [c for c in CHARS if ord(c) not in cm]
        assert not missing, f'missing in cmap {missing}'
        gl = f['glyf']
        H, O = gl[cm[ord('H')]], gl[cm[ord('O')]]
        assert abs(H.yMin) <= TOL_BASE, f'H baseline {H.yMin}'
        assert -30 <= O.yMin <= TOL_BASE, f"O baseline {O.yMin}"
        assert abs(H.yMax - CAP) <= TOL_CAP, f'H height {H.yMax} vs {CAP}'
        assert abs(O.yMax - CAP) <= TOL_CAP, f'O height {O.yMax} vs {CAP}'
        assert abs(O.yMax - H.yMax) <= TOL_CAP, f'O/H heights {O.yMax}/{H.yMax}'
        for c in CHARS:
            g = gl[cm[ord(c)]]
            assert g.numberOfContours != 0, f'empty glyph {c}'
        # the file must also re-open and round-trip through fontTools
        buf = io.BytesIO(); f.save(buf); TTFont(io.BytesIO(buf.getvalue()))
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'glyphs={got} upm={upm} H={H.yMin}..{H.yMax} O={O.yMin}..{O.yMax}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('import', import_check)]))
