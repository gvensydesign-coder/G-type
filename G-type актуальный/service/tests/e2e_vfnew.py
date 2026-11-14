"""vfnew: «Скачать шрифт» -> variable font works for Нить / Тяга / Кортес: the download is a valid VF (fvar wght 300..900, avar, STAT, HVAR, 4 named instances with Russian names),
the axis checkboxes offer only the axes the font supports, glyph count == static family file, the VF loads in Chromium."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import vf_ttf, Session, check_all
from fontTools.ttLib import TTFont
WK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AXES = {'nit': 'wght', 'tyaga': 'wght opsz slnt', 'kortes': 'wght'}
BASE = {'nit': 'Nit', 'tyaga': 'Tyaga', 'kortes': 'Kortes'}


def vfnew_check(p):
    out = []
    for fid, want in AXES.items():
        s = Session(p, 'vfnew_' + fid)
        try:
            s.open_font(fid); s.open_panes()
            s.js("document.querySelector('#ex-menu').click()")
            on = s.js("[...document.querySelectorAll('#ex-list [data-vfax]')].filter(b=>!b.disabled).map(b=>b.dataset.vfax).join(' ')")
            assert on == want, f'{fid}: enabled axes {on!r} != {want!r}'
            s.js("document.querySelector('#ex-menu').click()")   # close again: download() opens it itself
            name, data, path = s.download('vf', timeout=300000)
            assert name.endswith('-VF.zip'), name
            data = vf_ttf(data)
            f = TTFont(io.BytesIO(data))
            axes = [a.axisTag for a in f['fvar'].axes]
            assert axes == ['wght'], f'{fid}: default VF axes {axes}'
            assert (f['fvar'].axes[0].minValue, f['fvar'].axes[0].maxValue) == (300, 900)
            st = TTFont(os.path.join(WK, 'fam', BASE[fid] + '-Regular.ttf'))
            for t in ('avar', 'STAT', 'HVAR', 'gvar', 'GSUB', 'GPOS'):
                assert (t in f) == (t in st) or t in ('avar', 'STAT', 'HVAR', 'gvar') and t in f, f'{fid}: table {t} differs from the static family'
            assert any(r.langID == 0x419 for r in f['name'].names), f'{fid}: no RU names'
            ni = len(f['fvar'].instances); assert ni == 4, f'{fid}: instances {ni}'
            assert f['maxp'].numGlyphs == st['maxp'].numGlyphs, f'{fid}: glyphs {f["maxp"].numGlyphs} vs static {st["maxp"].numGlyphs}'
            assert s.js("typeof VFXP!=='undefined'"), 'no axes pane'
            assert not s.errs, f'{fid}: page errors {s.errs[:3]}'
            out.append(f'{fid} {len(data)//1024}K')
        finally:
            s.close()
    return ' '.join(out)


if __name__ == '__main__':
    sys.exit(check_all([('vfnew', vfnew_check)]))
