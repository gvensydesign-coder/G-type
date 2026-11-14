"""«Подборки»: bands render in the library grid, a collection opens a filtered view, real font cards keep .lcard[data-font], phone carousel snaps."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

def coll_check(p):
    s = Session(p, 'collections'); pg = s.pg
    try:
        pg.click('[data-tab=home]')
        assert pg.evaluate("!!document.querySelector('#home-podb .pband')"), 'no featured band on home'
        pg.click('[data-tab=library]')
        pg.wait_for_function("document.querySelectorAll('#libgrid .lcard[data-font]').length>8", timeout=20000)
        nb = pg.evaluate("document.querySelectorAll('#libgrid .pband').length")
        assert nb >= 1, f'bands in library: {nb}'
        assert pg.evaluate("document.querySelectorAll('#libgrid .pband .spc').length") >= 3
        assert pg.evaluate("[...document.querySelectorAll('#libgrid .pband')].every(b=>!b.querySelector('.lcard'))"), 'band cards must not be .lcard'
        n_all = pg.evaluate("document.querySelectorAll('#libgrid .lcard[data-font]').length")
        assert pg.evaluate("PODB.length") == 7
        assert pg.evaluate("PODB.every(c=>c.fonts.length>=3&&c.fonts.length<=6&&c.title&&c.desc)")
        pg.click('#libgrid .pband .pb-all')
        pg.wait_for_function("LQ.coll", timeout=10000)
        cid = pg.evaluate("LQ.coll"); want = pg.evaluate("podbIds(podbBy(LQ.coll)).length")
        pg.wait_for_function(f"document.querySelectorAll('#libgrid .lcard[data-font]').length=={want}", timeout=10000)
        assert pg.evaluate("document.querySelectorAll('#libgrid .pband').length") == 0, 'bands shown inside a collection view'
        assert pg.is_visible('#lib-coll'), 'no collection header'
        assert pg.evaluate("document.querySelector('#lib-coll').textContent").strip(), 'empty header'
        pg.click('#lib-coll-x')
        pg.wait_for_function(f"!LQ.coll && document.querySelectorAll('#libgrid .lcard[data-font]').length=={n_all}", timeout=10000)
        # phone: one card per screen, snap, no scrollbar
        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_function("document.querySelector('#libgrid .pband')", timeout=10000)
        r = pg.evaluate("""(()=>{const row=document.querySelector('#libgrid .pband .pb-row'),c=row.querySelector('.spc'),cs=getComputedStyle(row);
          return {snap:cs.scrollSnapType,w:c.getBoundingClientRect().width,rw:row.getBoundingClientRect().width,sb:cs.scrollbarWidth,hs:document.documentElement.scrollWidth>innerWidth}})()""")
        assert 'x' in r['snap'], r
        assert r['w'] >= r['rw'] * 0.7, r
        assert not r['hs'], 'horizontal page scroll on phone'
        assert not s.errs, s.errs[:3]
        return f'bands={nb} coll={cid} n={want} phone_card={r["w"]:.0f}/{r["rw"]:.0f}'
    finally:
        s.close()

if __name__ == '__main__':
    sys.exit(check_all([('collections', coll_check)]))
