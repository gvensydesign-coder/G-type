"""kerning editor: AV exception -60 -> export TTF -> GPOS pair value -60; undo -> pair back to automatic."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common import Session, check_all
from fontTools.ttLib import TTFont
from ttfkern import kern

VAL = -60


def kern_check(p):
    s = Session(p, 'kern')
    try:
        pg = s.pg
        s.open_font('volt')
        pg.evaluate("document.getElementById('kern-open').click()")
        pg.wait_for_function("S.tab==='kern' && !!document.getElementById('kk-v')", timeout=10000)
        pg.fill('#kk-a', 'A')
        pg.fill('#kk-b', 'V')
        pg.wait_for_function("KK.a==='A' && KK.b==='V'", timeout=5000)
        pg.fill('#kk-v', str(VAL))
        pg.dispatch_event('#kk-v', 'change')
        pg.wait_for_function(f"(S.styles[S.style].ku||{{}})['AV']==={VAL}", timeout=10000)
        assert s.js("kkInfo('A','V').v") == VAL, 'kkInfo does not show the exception'
        _, data, _ = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        upm = f['head'].unitsPerEm
        got = kern(f, 'A', 'V')
        assert got == VAL, f'GPOS AV={got} (upm {upm})'
        # undo the exception: pair falls back to the automatic value
        # the top-bar Скачать is visible now: opening its menu moves focus, the still-dirty #kk-v fires a second `change` (a second undo step)
        for _ in range(3):
            if s.js("(S.styles[S.style].ku||{})['AV']===undefined"):
                break
            pg.evaluate("document.getElementById('undo').click()")   # same handler as the toolbar button
            pg.wait_for_timeout(150)
        pg.wait_for_function("(S.styles[S.style].ku||{})['AV']===undefined", timeout=10000)
        _, data2, _ = s.download('ttf')
        after = kern(TTFont(io.BytesIO(data2)), 'A', 'V')
        assert after != VAL, f'undo kept AV={after}'
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'AV={got} after_undo={after} upm={upm}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('kern', kern_check)]))
