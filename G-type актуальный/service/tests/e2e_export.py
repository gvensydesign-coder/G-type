"""export menu: every download item (ttf woff zip vf png) triggers a download and the file validates; the last item «О шрифте» only opens the passport."""
import io, os, sys, zipfile
sys.path.insert(0, os.path.dirname(__file__))
from common import vf_ttf, Session, check_all
from fontTools.ttLib import TTFont
from PIL import Image

ITEMS = ['ttf', 'otf', 'woff2', 'woff', 'fam', 'vf', 'png']
MENU = ITEMS + ['share']  # share = poster panel (Stage 3), not a file
DECO = ['deco_outline', 'deco_inline', 'deco_shadow', 'deco_cameo']  # decorative styles section (ui_deco_d1.js)


def export_check(p):
    s = Session(p, 'export')
    try:
        pg = s.pg
        s.open_font('volt')
        listed = s.js("[...document.querySelectorAll('#ex-list [data-x]')].map(b=>b.dataset.x).join(' ')")
        assert listed in (' '.join(MENU + DECO + ['about']), ' '.join(MENU + ['about'] + DECO)), f'menu items {listed}'
        report = []
        for item in ITEMS:
            name, data, path = s.download(item)
            assert len(data) > 1000, f'{item}: {len(data)} bytes'
            if item == 'ttf':
                f = TTFont(io.BytesIO(data))
                assert f.getBestCmap() and 'glyf' in f, 'ttf has no glyphs'
                assert f['head'].magicNumber == 0x5F0F3CF5
                info = f'{len(f.getGlyphOrder())} glyphs'
            elif item == 'otf':
                f = TTFont(io.BytesIO(data))
                assert f.sfntVersion == 'OTTO' and 'CFF ' in f and 'glyf' not in f, 'otf is not CFF-flavoured'
                assert name.endswith('.otf'), name
                info = f'CFF {len(f.getGlyphOrder())} glyphs'
            elif item == 'woff2':
                assert data[:4] == b'wOF2', 'woff2 magic'
                f = TTFont(io.BytesIO(data))
                assert f.flavor == 'woff2' and 'glyf' in f, 'woff2 has no glyf'
                assert name.endswith('.woff2'), name
                info = f'{len(f.getGlyphOrder())} glyphs'
            elif item == 'woff':
                assert data[:4] == b'wOFF', 'woff magic'
                f = TTFont(io.BytesIO(data))
                assert 'glyf' in f, 'woff has no glyf'
                info = f'flavor={f.flavor}'
            elif item == 'fam':
                z = zipfile.ZipFile(io.BytesIO(data))
                assert z.testzip() is None, 'zip CRC'
                ttfs = [n for n in z.namelist() if n.lower().endswith('.ttf')]
                assert len(ttfs) >= 8, f'family ttfs {len(ttfs)}'
                for n in ttfs[:2]:
                    TTFont(io.BytesIO(z.read(n)))
                otfs = [n for n in z.namelist() if n.startswith('otf/') and n.endswith('.otf')]
                w2 = [n for n in z.namelist() if n.startswith('woff2/') and n.endswith('.woff2')]
                assert len(otfs) == len(ttfs) == len(w2), f'family otf {len(otfs)} woff2 {len(w2)} ttf {len(ttfs)}'
                for n in otfs[:1] + w2[:1]:
                    TTFont(io.BytesIO(z.read(n)))
                info = f'{len(ttfs)} ttf + otf + woff2'
            elif item == 'vf':
                assert name.endswith('-VF.zip'), name
                f = TTFont(io.BytesIO(vf_ttf(data)))
                assert 'fvar' in f and 'gvar' in f, 'no variation tables'
                axes = [a.axisTag for a in f['fvar'].axes]
                info = f'axes={"".join(axes)}'
            elif item == 'png':
                im = Image.open(io.BytesIO(data))
                assert im.format == 'PNG' and im.size[0] > 100 and im.size[1] > 50, f'png {im.format} {im.size}'
                info = f'{im.size[0]}x{im.size[1]}'
            report.append(f'{item}={len(data)//1024}K/{info}')
        assert not s.errs, f'page errors {s.errs[:3]}'
        return ' '.join(report)
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('export', export_check)]))
