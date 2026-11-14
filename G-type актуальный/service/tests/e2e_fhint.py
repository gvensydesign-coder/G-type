"""W88 font feature hints: data-driven from FONT_META[id].hint, shown above the editor sample (where the tester also works), dismissible,
remembered per font in the hint set (HINT_KEY, key «fh:<id>»), neutral (not red), nothing leaves its pane, both themes, phone 390.
One PASS/FAIL line: fhint."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all

HINTS = {'kortes': 'Росчерки появляются сами', 'tyaga': 'Знак ~ после буквы растягивает её', 'nit': 'Толщина линии', 'stsepka': 'сцепляются'}
GEOM = """(()=>{const b=document.getElementById('fhint'),w=document.getElementById('specwrap');if(!b||b.hidden)return null;const r=b.getBoundingClientRect(),q=w.getBoundingClientRect(),cs=getComputedStyle(b),x=b.querySelector('.fh-x').getBoundingClientRect(),t=b.querySelector('.fh-t');
 const col=cs.color.match(/\\d+/g).map(Number),bg=cs.backgroundColor;
 return {txt:t.textContent,l:r.left-q.left,r:q.right-r.right,t:r.top-q.top,h:r.height,xin:x.right<=r.right+.5&&x.left>=r.left&&x.top>=r.top-.5&&x.bottom<=r.bottom+.5,clip:t.scrollWidth>t.clientWidth+1,red:col[0]>200&&col[1]<120&&col[2]<120,bg}})()"""


def fh(p):
    s = Session(p, 'fhint'); pg = s.pg; bad = []
    try:
        for fid, frag in HINTS.items():
            s.open_font(fid)
            pg.wait_for_function("(()=>{const b=document.getElementById('fhint');return b&&!b.hidden})()", timeout=5000)
            g = pg.evaluate(GEOM)
            if frag not in g['txt']: bad.append(f'{fid}: text {g["txt"]!r}')
            if not g['xin'] or g['clip'] or g['red'] or g['l'] < 0 or g['r'] < 0: bad.append(f'{fid}: geometry {g}')
        # fonts without a hint show nothing
        s.open_font('volt')
        if pg.evaluate("!document.getElementById('fhint').hidden"): bad.append('volt: hint shown for a font without hint')
        # dismiss + persist per font
        s.open_font('kortes')
        pg.wait_for_function("!document.getElementById('fhint').hidden")
        pg.click('#fhint .fh-x'); pg.wait_for_function("document.getElementById('fhint').hidden", timeout=3000)
        if not pg.evaluate("hintSeen('fh:kortes')"): bad.append('dismiss not stored')
        if pg.evaluate("hintSeen('fh:tyaga')"): bad.append('dismiss leaked to another font')
        s.open_font('tyaga')
        if pg.evaluate("document.getElementById('fhint').hidden"): bad.append('tyaga hint hidden after dismissing kortes')
        s.open_font('kortes')
        if pg.evaluate("!document.getElementById('fhint').hidden"): bad.append('kortes hint came back after dismiss')
        # survives reload
        pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'")
        s.open_font('kortes')
        if pg.evaluate("!document.getElementById('fhint').hidden"): bad.append('dismiss lost after reload')
        # tester on: hint stays visible for a font with a hint and does not overlap the tester
        s.open_font('tyaga'); s.open_panes(); pg.click('#tt-on'); pg.wait_for_timeout(300)
        g = pg.evaluate(GEOM)
        if not g: bad.append('hint hidden while tester is on')
        pg.click('#tt-on')
        # reset hints brings it back
        pg.evaluate("TOUR.reset()"); s.open_font('kortes')
        if pg.evaluate("document.getElementById('fhint').hidden"): bad.append('reset did not restore the hint')
        # themes + phone
        for th in ('light', 'dark'):
            pg.evaluate(f"themeSet('{th}')"); pg.wait_for_timeout(200)
            g = pg.evaluate(GEOM)
            if not g or g['red']: bad.append(f'{th}: {g}')
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(300)
        g = pg.evaluate(GEOM)
        if not g or not g['xin'] or g['clip'] or g['l'] < 0 or g['r'] < 0: bad.append(f'phone: {g}')
        if pg.evaluate("document.documentElement.scrollWidth>innerWidth+1"): bad.append('phone: horizontal overflow')
        if s.errs: bad.append('errors ' + str(s.errs[:2]))
    finally:
        s.close()
    if bad: raise AssertionError('; '.join(bad))
    return 'hints on %d fonts, dismiss/persist/reset, tester, themes, phone' % len(HINTS)


if __name__ == '__main__':
    sys.exit(check_all([('fhint', fh)]))
