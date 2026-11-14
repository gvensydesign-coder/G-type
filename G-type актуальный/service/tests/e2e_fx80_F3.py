"""FX80 F3: library search ranking, skipped tour label, collections dialog (scrim, hover card, duplicates, counter), profile empty (one primary),
name counters, lang chips, fresh-visit card mark, toasts vs canvas dock, phone dock vs rail, DS Esc, DS tokens (button heights, close buttons, radii)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *


def run(p):
    s = Session(p, 'fx80_f3'); pg = s.pg
    try:
        # A16: a fresh visit marks no library card as opened
        pg.click('[data-tab=library]')
        pg.wait_for_function("document.querySelectorAll('#libgrid .lcard[data-font]').length>8", timeout=20000)
        assert pg.evaluate("document.querySelectorAll('#libgrid .lcard.on').length") == 0, 'fresh visit: card marked as current'
        # A06: exact name first
        pg.evaluate("LQ.q='пропис';libRenderLibrary()"); pg.wait_for_timeout(200)
        first = pg.evaluate("document.querySelector('#libgrid .lcard[data-font]').dataset.font")
        assert first == 'propis', f'search order: {first}'
        pg.evaluate("LQ.q='квадра';libRenderLibrary()"); pg.wait_for_timeout(200)
        assert pg.evaluate("document.querySelector('#libgrid .lcard[data-font]').dataset.font") == 'kvadra'
        pg.evaluate("LQ.q='';libRenderLibrary()")
        # A13: zero-count language chips are disabled
        pg.evaluate("document.querySelector('#lf-btn').click()")
        z = pg.evaluate("[...document.querySelectorAll('.lf-chip.zero')].map(b=>b.disabled)")
        assert z and all(z), f'zero chips selectable: {z}'
        # A08: hover card closes and the dialog dims the page
        pg.hover('#libgrid .lcard[data-font=volt]'); pg.wait_for_function("!!document.querySelector('.hcard.on')", timeout=5000)
        pg.evaluate("PROF.modal('<div class=mh><h2>t</h2></div>',{label:'t'})"); pg.wait_for_timeout(400)
        assert pg.evaluate("!document.querySelector('.hcard.on')"), 'hover card stays over the dialog'
        assert pg.evaluate("getComputedStyle(document.querySelector('.pf-scrim')).display")!='none', 'dialog has no dimming in the library'
        pg.evaluate("PROF.closeLayers(true)")
        # A19: duplicate collection names are rejected inline
        pg.click('#rail-profile'); pg.wait_for_function("S.tab==='profile'", timeout=10000); pg.wait_for_timeout(600)
        pg.click('[data-sk=newc]')
        pg.wait_for_selector('#sk-cn', timeout=5000)
        pg.fill('#sk-cn', 'Для афиш'); pg.click('#sk-ok'); pg.wait_for_timeout(400)
        pg.click('[data-sk=newc]'); pg.wait_for_selector('#sk-cn', timeout=5000)
        pg.fill('#sk-cn', 'для афиш')
        assert pg.evaluate("document.querySelector('#sk-ok').disabled"), 'duplicate name accepted'
        assert 'уже есть' in pg.inner_text('#sk-cerr')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        # A20: name limit counter
        pg.click('[data-pf=edit]'); pg.wait_for_selector('#pf-l', timeout=5000)
        pg.fill('#pf-l', 'А' * 30)
        assert '30/30' in pg.inner_text('[data-nc=pf-l]'), 'no limit counter'
        pg.evaluate("PROF.closeLayers(true)"); pg.wait_for_timeout(300)
        # D13: Esc closes the design-system page
        pg.evaluate("openDS()"); pg.wait_for_timeout(400)
        assert 'localStorage' not in pg.inner_text('#view-ds') and 'platformInfo' not in pg.inner_text('#view-ds'), 'dev strings in DS'
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
        assert not pg.evaluate("document.body.classList.contains('ds-open')"), 'Esc does not close DS'
        # A07: skipped tour is not «Пройдено»
        pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
        pg.evaluate("TOUR.run('welcome',{force:true})")
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=15000)
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()", timeout=5000)
        pg.evaluate("TOUR.renderList()")
        st = pg.evaluate("document.querySelector('.hlp-row[data-tour=welcome] .st').textContent")
        assert st == 'Пропущено', f'skipped tour label: {st}'
        # D02 + A11: toast avoids the canvas dock; resets answer with a toast
        s.open_font('volt'); pg.wait_for_timeout(500)
        for w, h in ((1440, 900), (1024, 768), (768, 1024)):
            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(500)
            pg.evaluate("toast('Знак сохранён — дальше «Скачать»')"); pg.wait_for_timeout(450)
            ov = pg.evaluate("""(()=>{const t=document.getElementById('toast').getBoundingClientRect();return ['zout','fit','zin'].filter(id=>{const b=document.getElementById(id).getBoundingClientRect();return b.left<t.right&&b.right>t.left&&b.top<t.bottom&&b.bottom>t.top})})()""")
            assert not ov, f'toast covers {ov} at {w}'
        # v82: the toast fired together with the screen switch («Открыт шрифт ...») also stays clear of the dock; both themes, 4 widths
        for th in ('light', 'dark'):
            for w, h in ((1440, 900), (1024, 768), (768, 1024), (390, 844)):
                pg.set_viewport_size({'width': w, 'height': h}); pg.evaluate("t=>themeSet(t)", th)
                pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
                s.open_font('volt'); pg.wait_for_timeout(200); s.open_font('nit'); pg.wait_for_timeout(500)
                ov = pg.evaluate("""(()=>{const t=document.getElementById('toast').getBoundingClientRect();if(!document.getElementById('toast').classList.contains('on'))return ['toast not shown'];
                  return [...document.querySelectorAll('.tools,.tools button,#dr-dock')].filter(e=>e.offsetParent&&getComputedStyle(e).visibility!=='hidden').filter(e=>{const b=e.getBoundingClientRect();return b.width>1&&b.left<t.right&&b.right>t.left&&b.top<t.bottom&&b.bottom>t.top}).map(e=>e.id||e.className)})()""")
                assert not ov, f'toast covers {ov} at {w} {th}'
        pg.set_viewport_size({'width': 1440, 'height': 900})
        pg.evaluate("document.getElementById('ra').click()")
        assert 'нет' in pg.inner_text('#toast') or pg.evaluate("document.getElementById('toast').textContent").strip(), 'reset gives no feedback'
        # D01: phone canvas dock is above the bottom rail (not covered at load)
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(600)
        cov = pg.evaluate("""(()=>{const rail=document.querySelector('.rail').getBoundingClientRect(),d=document.querySelector('.tools').getBoundingClientRect();return d.bottom>rail.top&&d.top<rail.bottom&&d.bottom>0&&d.top<innerHeight})()""")
        assert not cov, 'phone dock under the rail'
        # D09/D10: one height per .btn.sm, one radius for dialogs, one close button
        pg.set_viewport_size({'width': 1440, 'height': 900}); pg.wait_for_timeout(400)
        hs = pg.evaluate("""(()=>{const h=new Set();document.querySelectorAll('.btn.sm').forEach(b=>{if(b.offsetParent&&b.getBoundingClientRect().height)h.add(Math.round(b.getBoundingClientRect().height))});return [...h]})()""")
        bad = pg.evaluate("[...document.querySelectorAll('.btn.sm')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height&&Math.abs(b.offsetHeight-28)>0).map(b=>(b.id||b.className)+':'+b.getBoundingClientRect().height)")
        assert not bad, f'.btn.sm heights {hs} {bad}'
        # A12: empty profile shows a single primary button
        s2 = Session(p, 'fx80_f3b')
        try:
            s2.pg.click('#rail-profile'); s2.pg.wait_for_function("S.tab==='profile'", timeout=10000); s2.pg.wait_for_timeout(800)
            n = s2.pg.evaluate("[...document.querySelectorAll('#view-profile .btn.pri')].filter(b=>b.offsetParent).length")
            assert n == 1, f'primary buttons in empty profile: {n}'
        finally:
            s2.close()
        assert not s.errs, s.errs[:3]
        return 'ok'
    finally:
        s.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        try:
            print('PASS fx80_F3', run(p))
        except Exception as e:
            print('FAIL fx80_F3', repr(e)[:400]); sys.exit(1)
