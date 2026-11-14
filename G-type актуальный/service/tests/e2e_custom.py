"""custom glyph («+ Знак»): draw ѣ on Liniya, export TTF, cmap must contain U+0463 with outlines."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all
from fontTools.ttLib import TTFont

CH = 'ѣ'


def custom_check(p):
    s = Session(p, 'custom')
    try:
        pg = s.pg
        s.open_font('liniya')
        pg.click('#cu-add')
        pg.wait_for_selector('#cu-ch', state='visible', timeout=10000)
        pg.fill('#cu-ch', CH)
        pg.wait_for_function("document.getElementById('cu-msg').textContent.length>0", timeout=5000)
        pg.click('#cu-go')
        pg.wait_for_function("S.mode==='draw' && !!document.getElementById('cu-done')", timeout=10000)
        S2 = """([x,y])=>{const s=skMap().s(x,y),r=$('#stage').getBoundingClientRect();return [r.left+s[0],r.top+s[1]];}"""

        def scr(x, y):
            return s.js("(" + S2 + ")([%d,%d])" % (x, y))

        def click(x, y):
            X, Y = scr(x, y)
            pg.mouse.click(X, Y)
            pg.wait_for_timeout(120)

        def drag(x, y, dx, dy):
            X, Y = scr(x, y)
            sc = s.js("V.sc")
            pg.mouse.move(X, Y); pg.mouse.down()
            for k in range(1, 7):
                pg.mouse.move(X + dx * sc * k / 6, Y - dy * sc * k / 6)
            pg.mouse.up()
            pg.wait_for_timeout(120)

        xh = s.js("cur().p.xh")
        click(100, xh + 170); click(100, 0)          # stem
        pg.keyboard.press('Enter')
        click(40, xh + 110); click(190, xh + 110)     # top bar
        pg.keyboard.press('Enter')
        drag(100, xh * 0.62, 150, 0)                 # open bowl
        drag(250, xh * 0.3, 0, -120)
        drag(150, 0, -120, 0)
        drag(60, xh * 0.3, 0, 120)
        click(100, xh * 0.62)
        pg.wait_for_function("cuRec().skel.length>=3", timeout=10000)
        pg.click('#cu-done')
        pg.wait_for_function(f"S.mode!=='draw' && CHARSET.includes('{CH}') && !S.live", timeout=20000)
        adv = s.js(f"Math.round(getFinal('{CH}',S.style).adv)")
        assert adv > 0, f'advance {adv}'
        _, data, _ = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        cm = f.getBestCmap()
        cp = ord(CH)
        assert cp in cm, f'U+{cp:04X} missing from cmap'
        g = f['glyf'][cm[cp]]
        assert g.numberOfContours != 0, 'custom glyph is empty'
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'U+{cp:04X}={cm[cp]} contours={g.numberOfContours} adv={adv}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('custom', custom_check)]))
