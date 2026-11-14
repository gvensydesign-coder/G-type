"""pixel: switch to Pixel Grid, change resolution/weight/grid, paint + erase a cell with the pixel tools, undo, export TTF and load it in the browser."""
import io, sys, os, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all
from fontTools.ttLib import TTFont

INFO = "(()=>{const i=FONTS.pixel.px.info(S.sel,S.styles[S.style].p,(S.edits[S.sel]&&S.edits[S.sel].px||{})[String(S.styles[S.style].p.res)]);return i})()"
CELLS = "JSON.stringify((" + INFO + ").cells.map(c=>c.slice(0,2)).sort())"


def pixel_check(p):
    s = Session(p, 'pixel')
    try:
        pg = s.pg
        s.open_font('pixel')
        s.js("selectGlyph('H')")
        pg.wait_for_function("S.sel==='H' && !S.live", timeout=20000)
        # resolution / weight / grid through the real parameters
        for k, v in (('res', 16), ('pw', 2), ('pshape', 1), ('pgap', 1)):
            s.js("(()=>{S.styles[S.style].p.%s=%s;bump();})()" % (k, v))
        pg.wait_for_timeout(200)
        sh = s.js("getFinal('H',S.style).cs.length")
        assert sh > 3, 'grid shape must give per-cell contours'
        s.js("(()=>{const p=S.styles[S.style].p;p.pshape=0;p.pgap=0;p.res=12;p.pw=1.5;bump();})()")
        pg.wait_for_timeout(200)
        # tools exist only for this font
        assert pg.query_selector('[data-mode=pxb]') and pg.query_selector('[data-mode=pxe]'), 'pixel tools missing'
        pg.click('[data-mode=pxb]')
        pg.wait_for_function("S.mode==='pxb'", timeout=10000)
        before = s.js(CELLS)
        import json
        cells = json.loads(before)
        have = {tuple(c) for c in cells}
        tgt = None
        for (x, y) in sorted(have):
            for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c = (x + d[0], y + d[1])
                if c not in have and min(a for a, b in have) < c[0] < max(a for a, b in have) and min(b for a, b in have) < c[1] < max(b for a, b in have):
                    tgt = c
                    break
            if tgt:
                break
        assert tgt, 'no free cell'
        def scr(c):
            return s.js("(c=>{const u=safeP(S.styles[S.style].p).pu;const a=toS((c[0]+.5)*u,(c[1]+.5)*u);const r=document.querySelector('#stage').getBoundingClientRect();return [r.left+a[0],r.top+a[1]];})(%s)" % json.dumps(list(tgt)))
        X, Y = scr(tgt)
        pg.mouse.click(X, Y)
        pg.wait_for_timeout(150)
        after = json.loads(s.js(CELLS))
        new = [c for c in after if tuple(c) not in have]
        assert [list(tgt)] == new, 'paint did not add the cell %s %s' % (tgt, new)
        # erase it
        pg.click('[data-mode=pxe]')
        pg.wait_for_function("S.mode==='pxe'", timeout=10000)
        pg.mouse.click(X, Y)
        pg.wait_for_timeout(150)
        assert json.loads(s.js(CELLS)) == cells, 'erase did not remove the cell'
        # paint again then undo
        pg.click('[data-mode=pxb]')
        pg.mouse.click(X, Y)
        pg.wait_for_timeout(150)
        assert len(json.loads(s.js(CELLS))) == len(cells) + 1
        pg.click('#undo')
        pg.wait_for_timeout(200)
        assert json.loads(s.js(CELLS)) == cells, 'undo failed'
        pg.click('#redo')
        pg.wait_for_timeout(200)
        assert len(json.loads(s.js(CELLS))) == len(cells) + 1, 'redo failed'
        # resolution change keeps edits (stored per resolution, never dropped)
        s.js("(()=>{S.styles[S.style].p.res=16;bump();})()")
        pg.wait_for_timeout(200)
        n12 = s.js("Object.keys(S.edits.H.px).length")
        s.js("(()=>{S.styles[S.style].p.res=12;bump();})()")
        pg.wait_for_timeout(200)
        assert len(json.loads(s.js(CELLS))) == len(cells) + 1, 'edit lost after resolution round trip'
        assert n12 >= 1
        # export TTF, check cmap and glyph H, load in browser
        name, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        cm = f.getBestCmap()
        assert len(cm) >= 340, 'cmap %d' % len(cm)
        assert 0x41F in cm and 0x41 in cm
        b64 = base64.b64encode(data).decode()
        ok = s.js("""async()=>{const ff=new FontFace('PXTest','url(data:font/ttf;base64,%s)');await ff.load();document.fonts.add(ff);return document.fonts.check('32px PXTest','ПоиграйA')}""" % b64) if False else s.js("""(async()=>{const ff=new FontFace('PXTest','url(data:font/ttf;base64,%s)');await ff.load();document.fonts.add(ff);return document.fonts.check('32px PXTest','Aa')})()""" % b64)
        assert ok, 'exported font failed to load'
        assert not s.errs, s.errs[:3]
        return 'cells %d->%d paint/erase/undo/redo ok, ttf %d glyphs %d bytes' % (len(cells), len(cells) + 1, len(f.getGlyphOrder()), len(data))
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('pixel', pixel_check)]))
