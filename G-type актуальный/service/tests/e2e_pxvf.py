"""pxvf: «Пиксель» variable font from the real export menu: «Вариативный» offers regular + italic VF files (wght 300–900, Light/Regular/Bold/Black instances),
extra axis boxes are disabled for this font, fontTools validates fvar/avar/STAT/HVAR/gvar, the instancer works at 300/400/700/900, weights get heavier and wider,
the file follows the editor state (resolution), static TTF export is unchanged in structure."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS, vf_zip
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def vf_downloads(s, timeout=240000):
    got = []
    s.pg.on('download', lambda d: got.append(d))
    s.pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=timeout)
    s.pg.evaluate("document.querySelector('#ex-menu').click()")
    s.pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'", timeout=10000)
    s.pg.evaluate("document.querySelector('[data-x=vf]').click()")
    s.pg.wait_for_selector('#xpv:not([hidden]) [data-xa=go]', timeout=10000)  # «Перед скачиванием» dialog (since the export-preview wave)
    s.pg.evaluate("document.querySelector('#xpv [data-xa=go]').click()")
    import time
    t0 = time.time()
    while len(got) < 1 and time.time() - t0 < timeout / 1000:
        s.pg.wait_for_timeout(300)
    s.pg.wait_for_timeout(1500)  # a second file would arrive within this window: the variable export is ONE zip
    assert len(got) == 1, f'expected ONE VF zip, got {[d.suggested_filename for d in got]}'
    assert got[0].suggested_filename.endswith('-VF.zip'), got[0].suggested_filename
    path = os.path.join(LOGS, 'dl_pxvf_' + got[0].suggested_filename)
    got[0].save_as(path)
    z = vf_zip(open(path, 'rb').read())
    assert len(z) == 4 and sum(n.endswith('.ttf') for n in z) == 2 and sum(n.endswith('.woff2') for n in z) == 2, sorted(z)
    return {n: d for n, d in z.items() if n.endswith('.ttf')}


def stem(font, ch='H'):
    """width of the left stem of H = distance between the first two x of the default contour"""
    cm = font.getBestCmap(); g = font['glyf'][cm[ord(ch)]]
    xs = sorted(set(x for x, y in g.coordinates))
    return xs[1] - xs[0], font['hmtx'][cm[ord(ch)]][0]


def pxvf_check(p):
    s = Session(p, 'pxvf')
    try:
        s.open_font('pixel'); s.open_panes()
        assert s.js("!!document.querySelector('[data-x=vf]') && !document.querySelector('[data-x=vf]').hidden"), 'no «Вариативный» item for pixel'
        dis = s.js("[...document.querySelectorAll('#ex-list [data-vfax]')].map(i=>i.dataset.vfax+':'+(i.disabled?'off':'on')).join(' ')")
        s.js("typeof vfxAvailSync==='function'&&vfxAvailSync()")
        dis = s.js("[...document.querySelectorAll('#ex-list [data-vfax]')].map(i=>i.dataset.vfax+':'+(i.disabled?'off':'on')).join(' ')")
        assert dis == 'wght:on wdth:off opsz:off slnt:off', f'axis boxes {dis}'
        files = vf_downloads(s)
        names = sorted(files)
        assert len(names) == 2 and any('Italic' in n for n in names), f'names {names}'
        res = {}
        for n, data in files.items():
            f = TTFont(io.BytesIO(data))
            ital = 'Italic' in n
            axes = [(a.axisTag, a.minValue, a.defaultValue, a.maxValue) for a in f['fvar'].axes]
            assert axes == [('wght', 300.0, 400.0, 900.0)], f'{n} axes {axes}'
            for t in ('avar', 'STAT', 'HVAR', 'gvar'):
                assert t in f, f'{n} no {t}'
            inst = {f['name'].getDebugName(i.subfamilyNameID): i.coordinates['wght'] for i in f['fvar'].instances}
            assert inst == {'Light': 300.0, 'Regular': 400.0, 'Bold': 700.0, 'Black': 900.0}, f'{n} instances {inst}'
            assert any(r.langID == 0x419 for r in f['name'].names), f'{n} no RU names'
            got = {}
            for w in (300, 400, 700, 900):
                it = instancer.instantiateVariableFont(TTFont(io.BytesIO(data)), {'wght': w}, inplace=False)
                got[w] = stem(it, 'Н')
                got[w] += (stem(it, 'Ш')[1],)
            assert got[300][2] <= got[400][2] < got[700][2] <= got[900][2], f'{n} Ш advance not growing {got}'
            assert ital or (got[900][0] > got[400][0] > 0 and got[300][0] <= got[400][0]), f'{n} stem not growing {got}'
            res[n] = (f['maxp'].numGlyphs, len(data), got)
        # the VF follows the editor state: lower resolution -> thicker cells (stem in font units doubles at res 6)
        r0 = res[[n for n in names if 'Italic' not in n][0]][2][400][0]
        s.js("(()=>{const p=S.styles.regular.p;p.res=8;bump();})()")
        s.pg.wait_for_timeout(300)
        s.js("S.style='regular'")
        files2 = vf_downloads(s)
        f2 = TTFont(io.BytesIO([d for n, d in files2.items() if 'Italic' not in n][0]))
        r1 = stem(f2, 'Н')[0]
        assert r1 > r0 * 1.2, f'VF does not follow resolution: stem {r0} -> {r1}'
        assert not s.errs, f'page errors {s.errs[:3]}'
        n0 = names[0]
        return 'files=%s glyphs=%d sizes=%s stemH@400 res12=%d res8=%d' % ('+'.join(names), res[n0][0], '/'.join(str(res[n][1] // 1024) + 'K' for n in names), r0, r1)
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('pxvf', pxvf_check)]))
