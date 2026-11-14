"""pen: stroke deco on Volt «n», apply to similar (h m u), export differs only in those glyphs, undo restores."""
import io, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, glyph_sigs
from fontTools.ttLib import TTFont

DECO = "Object.keys(S.edits).filter(k=>S.edits[k].deco).sort().join('')"


def pen_check(p):
    s = Session(p, 'pen')
    try:
        pg = s.pg
        s.open_font('volt')
        base_name, base_bytes, _ = s.download('ttf')
        base_sig, base_cmap = glyph_sigs(TTFont(io.BytesIO(base_bytes)))
        s.js("selectGlyph('n')")
        pg.wait_for_function("S.sel==='n' && !S.live", timeout=20000)
        pg.click('[data-mode=pen]')
        pg.wait_for_function("S.mode==='pen'", timeout=10000)
        pg.click('#pn-tool [data-pnt=s]')
        pg.click('#pn-op [data-pno=add]')
        W = s.js("rawGlyph().w")
        S2 = """([x,y])=>{const s=skMap().s(x,y),r=$('#stage').getBoundingClientRect();return [r.left+s[0],r.top+s[1]];}"""
        for (x, y) in [(W - 70, 50), (W + 70, -30)]:
            X, Y = s.js("(" + S2 + ")([%d,%d])" % (x, y))
            pg.mouse.click(X, Y)
            pg.wait_for_timeout(150)
        pg.keyboard.press('Enter')
        pg.wait_for_function("(S.edits.n&&S.edits.n.deco)&&penList().length>=1", timeout=10000)
        n_own = s.js("penList().length")
        pg.click('#pn-sim')
        pg.wait_for_selector('#pn-sim-go', state='visible', timeout=10000)
        pg.click('#pn-sim-go')
        pg.wait_for_function("['h','m','u'].every(c=>S.edits[c]&&S.edits[c].deco)", timeout=30000)
        decos = s.js(DECO)
        decos = decos.replace('"','')
        s.js("selectGlyph('n')")
        pg.wait_for_timeout(100)
        edited = TTFont(io.BytesIO(s.download('ttf')[1]))
        sig, cmap = glyph_sigs(edited)
        # glyphs that share an edit key with a decorated key (identical Cyrillic/Latin letters are one edit key)
        twins = s.js("(keys=>CHARSET.filter(c=>keys.includes(edKey(c))).join(''))(%s)" % repr(list(decos)))
        names = lambda chars: {cmap.get(ord(c)) for c in chars if cmap.get(ord(c))}
        diff = {n for n in sig if sig[n] != base_sig.get(n)}
        want = {'n', 'h', 'm', 'u'}
        assert n_own == 1, f'own strokes {n_own}'
        assert want <= set(decos), f'decos {decos}'
        assert diff, 'export identical to default'
        assert diff <= names(twins), f'unexpected glyphs changed {sorted(diff - names(twins))}'
        assert names(['n', 'h', 'm', 'u']) <= diff, f'changed {sorted(diff)}'
        # undo until no decorated glyphs remain (bounded)
        for _ in range(8):
            if not s.js(f"({DECO}).length"):
                break
            pg.click('#undo')
            pg.wait_for_timeout(120)
        pg.wait_for_function(f"({DECO}).length===0", timeout=10000)
        after = TTFont(io.BytesIO(s.download('ttf')[1]))
        sig2, _ = glyph_sigs(after)
        left = sorted(n for n in sig2 if sig2[n] != base_sig.get(n))
        assert not left, f'undo left changes in {left}'
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'decos={decos} changed={len(diff)} undo=clean'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('pen', pen_check)]))
