"""h1: home «Как это работает» = slider. Visible cards per width, autoplay (advance, pause on hover / focus / hidden tab / off-screen, reduced motion = none),
arrows / dots / keys, seamless loop, no clipped or half-cut card, a11y roles, home column max width at 3840. One PASS/FAIL line."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from uiq_views import PAGE, TOUR_OFF
T0 = time.time(); BAD = []
URL = PAGE + '?motion=1'
def bad(m): BAD.append(m); print('  ', m)

def new(b, w, h=1000, theme='light', reduced=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, reduced_motion='reduce' if reduced else 'no-preference')
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function("typeof S!=='undefined'&&typeof DM!=='undefined'&&!!DM.car&&!!document.querySelector('#dm-home .dm-box')", timeout=30000)
    pg.wait_for_function("typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)  # W88: startup work runs in idle slices
    if pg.evaluate("DM.car.idx||DM.car.busy"):  # autoplay ran while the page was busy: back to the first card, settled
        pg.evaluate("DM.car.goTo(0)"); pg.wait_for_timeout(1500)
    pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('sec-how').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
    return ctx, pg, errs

# visible figures (inside the clip frame), their rects and the frame
VIS = """(()=>{const v=document.querySelector('.dm-view').getBoundingClientRect();
 return {view:[v.left,v.right],figs:[...document.querySelectorAll('#dm-home .dm-fig')].map(f=>{const r=f.getBoundingClientRect();return {l:r.left,r:r.right,w:r.width,i:f.getAttribute('aria-label'),hid:f.getAttribute('aria-hidden')}}),
 n:DM.car.n,idx:DM.car.idx,mode:DM.car.mode,cw:DM.car.cw}})()"""
def vis(pg):
    d = pg.evaluate(VIS); v0, v1 = d['view']
    d['in'] = [f for f in d['figs'] if f['l'] >= v0 - .5 and f['r'] <= v1 + .5]
    d['cut'] = [f for f in d['figs'] if (f['l'] < v1 - .5 and f['r'] > v1 + .5) or (f['r'] > v0 + .5 and f['l'] < v0 - .5)]
    return d

with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- visible count + no cut card per width
    EXP = {1024: 2, 1280: 2, 1440: 2, 1920: 3, 2560: 3, 3840: 3}
    for w, n in EXP.items():
        ctx, pg, errs = new(b, w); d = vis(pg)
        if d['n'] != n or len(d['in']) != n: bad(f'{w}: visible cards {len(d["in"])} (n={d["n"]}), expected {n}')
        if d['cut']: bad(f'{w}: a card is cut by the frame {d["cut"]}')
        if abs(d['cw'] - d['in'][0]['w']) > 1 or d['cw'] > 720.5: bad(f'{w}: card width {d["cw"]} / {d["in"][0]["w"]}')
        gaps = [round(d['in'][i + 1]['l'] - d['in'][i]['r'], 1) for i in range(len(d['in']) - 1)]
        if len(set(gaps)) > 1 or (gaps and abs(gaps[0] - 20) > .6): bad(f'{w}: gaps not one value of 20: {gaps}')
        if errs: bad(f'{w}: errors {errs[:2]}')
        # arrows + dots present, dot = ink only for current
        dots = pg.evaluate("[...document.querySelectorAll('.dm-dot')].map(d=>d.getAttribute('aria-current'))")
        if dots != ['true'] + ['false'] * 5: bad(f'{w}: dots {dots}')
        if not pg.is_visible('#sec-how .vact'): bad(f'{w}: arrows hidden')
        if w == 3840:
            col = pg.evaluate("(()=>{const s=document.querySelector('#view-lib>.vsec');const r=s.getBoundingClientRect();const c=document.querySelector('#createcards').getBoundingClientRect();return [r.width,c.width,r.left+r.width/2,(innerWidth+92-14)/2]})()")
            if col[0] > 1721 or col[1] > 1721: bad(f'3840: home column not capped {col}')
            if abs(col[2] - col[3]) > 2: bad(f'3840: column not centred {col}')
        ctx.close()
    # ---- controls at 1440
    ctx, pg, errs = new(b, 1440)
    r = pg.evaluate("(()=>{const c=document.getElementById('dm-car');return [c.getAttribute('role'),c.getAttribute('aria-roledescription'),[...document.querySelectorAll('#dm-home .dm-fig')].map(f=>f.getAttribute('aria-label')+'|'+f.getAttribute('aria-roledescription'))]})()")
    if r[0] != 'region' or r[1] != 'карусель' or r[2][1] != '2 из 6|слайд': bad(f'aria: {r}')
    pg.mouse.move(5, 5)
    pg.click('#sec-how .arr[data-dir="1"]'); pg.mouse.move(5, 5); pg.wait_for_timeout(900)
    if vis(pg)['idx'] != 1: bad('next arrow does not advance')
    pg.click('#sec-how .arr[data-dir="-1"]'); pg.mouse.move(5, 5); pg.wait_for_timeout(900)
    if vis(pg)['idx'] != 0: bad('prev arrow does not go back')
    # loop: prev from 0 -> idx 5, visible = cards 6 and 1; then next x6 returns; always whole cards
    pg.click('#sec-how .arr[data-dir="-1"]'); pg.mouse.move(5, 5); pg.wait_for_timeout(900)
    d = vis(pg)
    if d['idx'] != 5 or sorted(f['i'] for f in d['in']) != ['1 из 6', '6 из 6'] or d['cut']: bad(f'seamless prev wrap: {d["idx"]} {[f["i"] for f in d["in"]]} cut={d["cut"]}')
    pg.keyboard.press('Tab')  # leave current focus
    pg.focus('#dm-car'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(900)
    if vis(pg)['idx'] != 0: bad('ArrowRight does not advance')
    pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(900)
    if vis(pg)['idx'] != 5: bad('ArrowLeft does not go back')
    pg.mouse.move(5, 5)
    dots = pg.query_selector_all('.dm-dot'); dots[1].click(); pg.mouse.move(5, 5); pg.wait_for_timeout(1500)
    d = vis(pg)
    if d['idx'] != 1 or d['cut'] or len(d['in']) != 2: bad(f'dot jump: {d["idx"]} cut={d["cut"]}')
    cur = pg.evaluate("[...document.querySelectorAll('.dm-dot')].map(x=>x.getAttribute('aria-current'))")
    if cur != ['false', 'true'] + ['false'] * 4: bad(f'current dot {cur}')
    # only visible slides run their demo
    pg.wait_for_timeout(300)
    run = pg.evaluate("[...document.querySelectorAll('#dm-home .dm-fig')].map(f=>f.querySelector('.dm-box')._dm.run)")
    vi = [f['hid'] is None for f in vis(pg)['figs']]
    if [bool(x) for x in run] != vi: bad(f'running demos {run} vs visible {vi}')
    # ink dot colour
    c = pg.evaluate("[getComputedStyle(document.querySelector('.dm-dot[aria-current=true]'),'::before').backgroundColor,getComputedStyle(document.querySelector('.dm-dot[aria-current=false]'),'::before').backgroundColor,getComputedStyle(document.documentElement).getPropertyValue('--ink')]")
    if c[0] == c[1] or 'rgb(255, 59' in c[0]: bad(f'dot colours {c}')
    ctx.close()
    # ---- autoplay (real timing), pauses
    ctx, pg, errs = new(b, 1440); pg.mouse.move(5, 5)
    pg.wait_for_function("DM.car.running", timeout=3000)
    i0 = pg.evaluate("DM.car.idx"); pg.wait_for_function(f"DM.car.idx!=={i0}", timeout=9000); pg.wait_for_timeout(700)
    i0 = pg.evaluate("DM.car.idx"); t = time.time()
    pg.wait_for_function(f"DM.car.idx!=={i0}", timeout=9000); dt = time.time() - t
    if not 4.0 < dt < 7.5: bad(f'autoplay period {dt:.1f}s')
    pg.wait_for_timeout(700)
    # hover pauses
    pg.mouse.move(700, 450); pg.wait_for_timeout(300); i1 = pg.evaluate("DM.car.idx")
    if pg.evaluate("DM.car.running"): bad('autoplay timer runs while hovered')
    pg.wait_for_timeout(7000)
    if pg.evaluate("DM.car.idx") != i1: bad('advanced while hovered')
    pg.mouse.move(5, 5); pg.wait_for_function("DM.car.running", timeout=3000)
    # hidden tab
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    if pg.evaluate("DM.car.running"): bad('autoplay timer runs in a hidden tab')
    i2 = pg.evaluate("DM.car.idx"); pg.wait_for_timeout(6500)
    if pg.evaluate("DM.car.idx") != i2: bad('advanced in a hidden tab')
    pg.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_function("DM.car.running", timeout=3000)
    # keyboard focus inside pauses
    pg.keyboard.press('Tab'); pg.evaluate("document.querySelector('#dm-car').focus()"); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(800)
    if pg.evaluate("DM.car.running"): bad('autoplay runs while the carousel has keyboard focus')
    pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(200)
    # off-screen pauses
    pg.evaluate("document.querySelector('#view-lib').scrollTop=1e5;window.scrollTo(0,1e5)"); pg.wait_for_timeout(500)
    if pg.evaluate("DM.car.running"): bad('autoplay runs while the section is off-screen')
    pg.evaluate("document.getElementById('sec-how').scrollIntoView({block:'center'})"); pg.wait_for_function("DM.car.running", timeout=3000)
    # touch interaction pauses
    pg.evaluate("document.getElementById('dm-car').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:7,clientX:600,clientY:400,bubbles:true}))")
    if pg.evaluate("DM.car.running"): bad('autoplay runs after a touch interaction')
    # swipe
    i3 = pg.evaluate("DM.car.idx")
    pg.evaluate("document.getElementById('dm-car').dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:7,clientX:400,clientY:405,bubbles:true}))"); pg.wait_for_timeout(900)
    if pg.evaluate("DM.car.idx") != (i3 + 1) % 6: bad('swipe left does not advance')
    # transition frames stay whole: sample a step, motion tokens
    pg.mouse.move(5, 5)
    ms = pg.evaluate("MO.D('slow')")
    if not 450 <= ms <= 600: bad(f'slide duration token {ms}')
    if errs: bad(f'errors {errs[:2]}')
    ctx.close()
    # ---- reduced motion: no autoplay, manual works
    ctx, pg, errs = new(b, 1440, reduced=True); pg.mouse.move(5, 5)
    pg.wait_for_timeout(6800)
    if pg.evaluate("DM.car.idx") != 0 or pg.evaluate("DM.car.running"): bad('reduced motion: autoplay is on')
    pg.click('#sec-how .arr[data-dir="1"]'); pg.wait_for_timeout(300)
    if pg.evaluate("DM.car.idx") != 1: bad('reduced motion: manual next does not work')
    ctx.close()
    # ---- phone: swipe row, no controls, no overflow; 3840: all cards still whole
    ctx, pg, errs = new(b, 390, 820)
    s = pg.evaluate("(()=>{const g=document.getElementById('dm-home');return [g.scrollWidth>g.clientWidth+1,getComputedStyle(g).overflowX,DM.car.mode,getComputedStyle(document.querySelector('.dm-dots')).display,getComputedStyle(document.querySelector('#sec-how .vact')).display,document.documentElement.scrollWidth<=innerWidth]})()")
    if not s[0] or s[1] != 'auto' or s[2] != 'swipe' or s[3] != 'none' or s[4] != 'none' or not s[5]: bad(f'phone swipe row {s}')
    if pg.evaluate("DM.car.running"): bad('phone: autoplay')
    ctx.close()
    b.close()
for x in BAD[:40]: print('  ', x)
print(('PASS' if not BAD else 'FAIL') + f' h1_slider {len(BAD)} problems; visible count 1024-3840, whole cards, one gap, autoplay + pauses, reduced motion, arrows/dots/keys/swipe, loop, column cap t={time.time()-T0:.1f}s')
sys.exit(1 if BAD else 0)
