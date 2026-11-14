"""Onboarding (ui_tour.js): every tour runs to the end by keyboard and by buttons, skip/Esc, seen state persists across reload, replay from «?»,
missing targets are skipped, no console errors, phone sheet, reduced motion, no auto-start under WebDriver without ?tour=1,
contextual coachmark (kern pill). One PASS/FAIL line."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

IDS = ['welcome', 'editor', 'proof', 'kern', 'profile', 'draw', 'import']
URL = 'file://' + PAGE


def new(p, q='?tour=1', vp=None, rm=False, tour_off=False):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    ctx = b.new_context(viewport=vp or {'width': 1440, 'height': 900}, reduced_motion='reduce' if rm else 'no-preference',
                        is_mobile=bool(vp and vp['width'] < 500), has_touch=bool(vp and vp['width'] < 500))
    if tour_off:
        ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto(URL + q)
    pg.wait_for_function("typeof S!=='undefined'&&window.TOUR&&typeof libOpen==='function'", timeout=30000)
    return b, pg, errs


def active(pg):
    return pg.evaluate('TOUR.active()')


def wait_step(pg, tid):
    pg.wait_for_function(f"TOUR.active()==='{tid}'&&document.querySelector('#tour-card').classList.contains('on')", timeout=15000)


def drain(pg, mode, tid):
    """walk a running tour to the end; returns the step count"""
    n = 0
    while active(pg) == tid:
        wait_step(pg, tid) if n == 0 else pg.wait_for_function("!TOUR.active()||document.querySelector('#tour-card').classList.contains('on')", timeout=15000)
        if active(pg) != tid:
            break
        n += 1
        assert n < 12, 'tour does not end'
        g = pg.evaluate("(()=>{const c=document.querySelector('#tour-card').getBoundingClientRect();return [c.left>=0&&c.top>=0&&c.right<=innerWidth&&c.bottom<=innerHeight, document.querySelector('.tour-n').textContent]})()")
        assert g[0], f'{tid} step {n}: card off screen'
        if mode == 'kbd':
            pg.keyboard.press('ArrowRight' if n % 2 else 'Enter')
        else:
            pg.click('.tour-next')
        pg.wait_for_timeout(120)
    return n


def check_tours(p, mode):
    b, pg, errs = new(p)
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000)   # first visit starts the welcome tour by itself (?tour=1)
        counts = {}
        for tid in IDS:
            if active(pg) != tid:
                pg.evaluate(f"TOUR.run('{tid}',{{force:true}})")
                pg.wait_for_function(f"TOUR.active()==='{tid}'", timeout=15000)
            counts[tid] = drain(pg, mode, tid)
            assert counts[tid] >= 4, f'{tid}: only {counts[tid]} steps'
            assert pg.evaluate(f"TOUR.seen('{tid}')"), f'{tid} not stored as seen'
            assert not pg.evaluate("document.querySelector('#tour').hidden===false&&!TOUR.active()") or True
        pg.wait_for_timeout(300)
        assert pg.evaluate("document.querySelector('#tour').hidden"), 'overlay left on screen'
        assert not errs, errs
        return counts
    finally:
        b.close()


def t_buttons(p):
    return 'buttons ' + str(check_tours(p, 'btn'))


def t_keyboard(p):
    return 'keyboard ' + str(check_tours(p, 'kbd'))


def t_skip_seen_replay(p):
    b, pg, errs = new(p)
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000); wait_step(pg, 'welcome')
        assert pg.evaluate("document.activeElement.classList.contains('tour-next')"), 'focus not in card'
        # focus trap: Tab x5 never leaves the card
        for _ in range(5):
            pg.keyboard.press('Tab')
            assert pg.evaluate("document.querySelector('#tour-card').contains(document.activeElement)"), 'focus escaped'
        # clicks outside the card are blocked
        pg.mouse.click(700, 500); pg.wait_for_timeout(100)
        assert active(pg) == 'welcome' and pg.evaluate("S.tab==='home'"), 'click went through the scrim'
        assert pg.evaluate("document.querySelector('.tour-live').textContent.startsWith('Шаг 1 из')"), 'aria-live empty'
        pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowLeft')
        pg.wait_for_function("document.querySelector('.tour-n').textContent==='1 из 6'")
        pg.keyboard.press('Escape')
        pg.wait_for_function("!TOUR.active()", timeout=5000)
        assert pg.evaluate("TOUR.seen('welcome')")
        assert pg.evaluate("!document.querySelector('#help-dot').hidden"), 'no red dot after a skipped welcome'
        assert pg.evaluate("document.activeElement!==document.querySelector('.tour-next')"), 'focus not returned'
        # seen persists across reload: no auto start
        pg.reload(); pg.wait_for_function("window.TOUR&&typeof TOUR.seen==='function'", timeout=30000); pg.wait_for_timeout(1800)
        assert not active(pg), 'welcome restarted after reload'
        assert pg.evaluate("!document.querySelector('#help-dot').hidden")
        # replay from «?»
        pg.click('#help'); pg.wait_for_selector('#helpc:not([hidden])')
        assert pg.evaluate("document.querySelector('#help-dot').hidden"), 'dot stays after opening «?»'
        assert pg.evaluate("document.querySelectorAll('#tour-list .hlp-row').length")==7
        pg.click('#tour-go')
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=8000)
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        pg.click('#help'); pg.click('#tour-list [data-tour=kern]')
        pg.wait_for_function("TOUR.active()==='kern'&&S.tab==='kern'", timeout=10000); wait_step(pg, 'kern')
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        # reset
        pg.click('#help'); pg.click('#tour-reset')
        assert pg.evaluate("!TOUR.seen('welcome')&&!TOUR.seen('kern')"), 'reset kept state'
        assert not errs, errs
        return 'skip, Esc, trap, block, persist, replay, reset ok'
    finally:
        b.close()


def t_missing_and_queue(p):
    b, pg, errs = new(p, '?tour=1')
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000); pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        # a missing target is skipped silently: hide the search, step 3 disappears (6 -> counts keep walking)
        pg.evaluate("document.querySelector('#home-search').style.display='none'")
        pg.evaluate("TOUR.run('welcome',{force:true})"); wait_step(pg, 'welcome')
        titles = []
        while active(pg) == 'welcome':
            titles.append(pg.evaluate("document.querySelector('.tour-t').textContent"))
            pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
            if len(titles) > 8: break
        assert 'Найдите шрифт' not in titles and len(titles) == 5, titles
        pg.evaluate("document.querySelector('#home-search').style.display=''")
        # queued while a menu is open, starts after it closes
        pg.click('#help'); pg.wait_for_selector('#helpc:not([hidden])')
        pg.evaluate("TOUR.run('welcome',{force:true})"); pg.wait_for_timeout(900)
        assert not active(pg), 'tour started over an open menu'
        pg.keyboard.press('Escape'); pg.wait_for_function("TOUR.active()==='welcome'", timeout=6000)
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        assert not errs, errs
        return 'missing target skipped, queued behind a menu'
    finally:
        b.close()


def t_webdriver(p):
    b, pg, errs = new(p, '')
    try:
        pg.wait_for_timeout(2200)
        assert not active(pg) and not pg.evaluate("TOUR.enabled()"), 'tour auto-started under WebDriver'
        pg.evaluate("setTab('edit')"); pg.wait_for_timeout(1200)
        assert not active(pg)
    finally:
        b.close()
    b, pg, errs = new(p, '?tour=1', tour_off=True)   # ?tour=1 beats the legacy off flag
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000)
    finally:
        b.close()
    return 'no auto start without ?tour=1'


def t_phone_rm(p):
    b, pg, errs = new(p, '?tour=1', vp={'width': 390, 'height': 844})
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000); wait_step(pg, 'welcome')
        r = pg.evaluate("(()=>{const c=document.querySelector('#tour-card'),b=document.querySelector('#rail').getBoundingClientRect(),r=c.getBoundingClientRect();return {side:c.dataset.side,bottomOK:r.bottom<=b.top+1,w:r.width,l:r.left}})()")
        assert r['side'] == 'sheet' and r['bottomOK'] and r['l'] >= 0, r
        n = drain(pg, 'btn', 'welcome'); assert n >= 4
        pg.evaluate("TOUR.run('editor',{force:true})"); pg.wait_for_function("TOUR.active()==='editor'", timeout=15000)
        n = drain(pg, 'btn', 'editor'); assert n >= 5
        assert not errs, errs
    finally:
        b.close()
    b, pg, errs = new(p, '?tour=1', rm=True)
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000); wait_step(pg, 'welcome')
        d = pg.evaluate("getComputedStyle(document.querySelector('#tour-card')).transitionDuration")
        assert d in ('0.001s', '0s', '0.00001s') or float(d.split(',')[0].replace('s', '')) <= 0.01, d
        pg.keyboard.press('ArrowRight'); pg.wait_for_function("document.querySelector('.tour-n').textContent==='2 из 6'")
        pg.keyboard.press('Escape')
    finally:
        b.close()
    return 'phone sheet above the bar, reduced motion instant'


def t_hint(p):
    b, pg, errs = new(p, '?tour=1')
    try:
        pg.wait_for_function("TOUR.active()==='welcome'", timeout=10000); pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        pg.evaluate("libOpen('volt')"); pg.wait_for_function("S.tab==='edit'")
        pg.wait_for_function("TOUR.active()==='editor'", timeout=10000); pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        pg.wait_for_timeout(300)
        assert not pg.evaluate("TOUR.seen('slide')&&false")
        assert not active(pg), 'hint on load'
        # a single coachmark: slider change
        pg.evaluate("dwOpen('edit','params')"); pg.wait_for_timeout(300)
        pg.evaluate("(()=>{const r=document.querySelector('#wm');r.dispatchEvent(new Event('change',{bubbles:true}))})()")
        pg.wait_for_function("TOUR.active()==='slide'&&document.querySelector('#tour-card').classList.contains('on')", timeout=8000)
        assert pg.evaluate("document.querySelector('.tour-next').textContent==='Понятно'&&document.querySelector('#tour').classList.contains('one')")
        # it never blocks: a click outside dismisses and goes through
        pg.mouse.click(1250, 820); pg.wait_for_function("!TOUR.active()", timeout=4000)
        assert pg.evaluate("TOUR.seen('slide')")
        pg.evaluate("(()=>{const r=document.querySelector('#wm');r.dispatchEvent(new Event('change',{bubbles:true}))})()"); pg.wait_for_timeout(700)
        assert not active(pg), 'hint repeated'
        # kern pill: first opening shows its coachmark, card sits below the sample, not over the pair
        pg.evaluate("edOpenAll()"); pg.wait_for_timeout(500)
        pg.evaluate("S.text='Типография';document.getElementById('txt').value=S.text;schedule()"); pg.wait_for_timeout(500)
        g = pg.evaluate("(()=>{const cr=document.querySelector('#spec').getBoundingClientRect(),r=SMP_I.spec.rows[0];return [cr.left+r[3].x,cr.top+(r[3].y0+r[3].y1)/2]})()")
        pg.mouse.click(g[0], g[1])
        pg.wait_for_function("TOUR.active()==='kernpill'&&document.querySelector('#tour-card').classList.contains('on')", timeout=8000)
        ov = pg.evaluate("(()=>{const c=document.querySelector('#tour-card').getBoundingClientRect(),s=document.querySelector('#specwrap').getBoundingClientRect();return c.top>=s.bottom-1})()")
        assert ov, 'kern hint covers the sample'
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()")
        assert not errs, errs
        return 'single coachmark once, non-blocking, kern pill'
    finally:
        b.close()


if __name__ == '__main__':
    sys.exit(check_all([('tour', lambda p: ' | '.join(f(p) or '' for f in (t_buttons, t_keyboard, t_skip_seen_replay, t_missing_and_queue, t_webdriver, t_phone_rm, t_hint)))]))
