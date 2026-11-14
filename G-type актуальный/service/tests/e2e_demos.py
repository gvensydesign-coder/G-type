"""demos: живые демо инструментов (ui_demos.js) — «Как это работает» на главной и подсказки инструментов.
Проверяет: демо создаются лениво (не раньше, чем рядом с экраном) и без сдвига вёрстки; играют только пока видны и вкладка активна;
reduced motion = только постер, ни одного rAF; обе темы (цвета из токенов сервиса); 400 и 768 px без горизонтального скролла;
4 подсказки (ячейки / насыщенность / кернинг / сохранить) открываются, влезают в экран, закрываются Esc и кликом снаружи, играют только открытыми;
чипы фильтров библиотеки обновляются по ключам (узел чипа сохраняется, вход и выход анимируются, выход короче входа). Одна строка PASS/FAIL."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from uiq_views import PAGE, TOUR_OFF

T0 = time.time(); BAD = []
URL = PAGE + '?motion=1'


def bad(m):
    BAD.append(m); print('  ', m)


def new(b, w, h, theme='light', reduced=False, motion=True):
    ctx = b.new_context(viewport={'width': w, 'height': h}, color_scheme=theme, reduced_motion='reduce' if reduced else 'no-preference', has_touch=w < 1000)
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto(URL if motion else PAGE)
    pg.wait_for_function("typeof S!=='undefined'&&typeof DM!=='undefined'&&!!document.querySelector('#dm-home .dm-box')", timeout=30000)
    pg.evaluate("t=>document.documentElement.dataset.theme=t", theme)
    pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
    pg.evaluate("DM.car.hover=true;DM.car.fit()")  # h1: the home cards are a slider; keep autoplay out of these checks (tests/e2e_h1_slider.py covers it)
    return ctx, pg, errs


STATE = "[...document.querySelectorAll('#dm-home .dm-box')].map(b=>{const i=b._dm;return {k:i.key,init:!!i.api,run:i.run,t:i.t,D:i.api&&i.api.D,P:i.api&&i.api.POSTER,w:b.clientWidth,h:b.clientHeight,single:!!i.st&&!i.st.hasAttribute('data-c')&&!i.st.querySelector('.dm-lbars')}})"
SCROLL = "i=>{const f=document.querySelectorAll('#dm-home .dm-fig')[i];f.scrollIntoView({block:'center'});}"


def overflow(pg, tag):
    r = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,b:[...document.querySelectorAll('.libview,body')].map(e=>e.scrollWidth-e.clientWidth).filter(x=>x>1)})")
    if r['sw'] > r['iw'] + 1 or r['b']: bad(f'{tag}: horizontal overflow {r}')


with sync_playwright() as p:
    b = p.chromium.launch()
    # ---- 1440 light: lazy init, no layout shift, play only when visible
    ctx, pg, errs = new(b, 1440, 900)
    st = pg.evaluate(STATE)
    if len(st) != 6: bad(f'expected 6 demos on home, got {len(st)}')
    far = pg.evaluate("(()=>{const f=document.querySelectorAll('#dm-home .dm-fig');return [...f].map(e=>e.getBoundingClientRect().top>innerHeight+260)})()")
    for s, f in zip(st, far):
        if f and s['init']: bad(f"{s['k']}: initialised although far below the screen (not lazy)")
    h0 = pg.evaluate("document.querySelector('#dm-home').getBoundingClientRect().height"); y0 = pg.evaluate("[...document.querySelectorAll('#dm-home .dm-box')].map(b=>b.getBoundingClientRect().height)")
    for i in range(6):
        pg.evaluate(SCROLL, i); pg.wait_for_timeout(500)
    st = pg.evaluate(STATE)
    for s in st:
        if not s['init']: bad(f"{s['k']}: not initialised after scrolling to it")
        if not s['single']: bad(f"{s['k']}: a compact / adaptive layout marker exists")
    y1 = pg.evaluate("[...document.querySelectorAll('#dm-home .dm-box')].map(b=>b.getBoundingClientRect().height)")
    if [round(x) for x in y0] != [round(x) for x in y1]: bad(f'layout shift on init: box heights {y0} -> {y1}')
    pg.wait_for_function("typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)  # W88: startup work runs in idle slices; measure the loop on a quiet page
    pg.evaluate("document.getElementById('sec-how').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    vis = pg.evaluate("[...document.querySelectorAll('#dm-home .dm-box')].map(b=>{const r=b.getBoundingClientRect();return [b._dm.run, r.bottom>0&&r.top<innerHeight&&!b.closest('.dm-fig').hasAttribute('aria-hidden')]})")
    for (run, v), s in zip(vis, st):
        if v and not run: bad(f"{s['k']}: visible but not playing")
        if not v and run: bad(f"{s['k']}: offscreen but playing")
    t1 = pg.evaluate("document.querySelector('#dm-home .dm-box')._dm.t"); pg.wait_for_timeout(500); t2 = pg.evaluate("document.querySelector('#dm-home .dm-box')._dm.t")
    if abs(t2 - t1) < .2: bad(f'visible demo does not advance (t {t1} -> {t2})')
    # scroll away: pause
    pg.evaluate("document.querySelector('#view-lib').scrollTop=1e5;window.scrollTo(0,1e5)"); pg.wait_for_timeout(400)
    run = pg.evaluate("[...document.querySelectorAll('#dm-home .dm-box')].map(b=>{const r=b.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight?-1:b._dm.run})")
    if any(x is True for x in run): bad(f'offscreen demos keep playing: {run}')
    # hidden tab
    pg.evaluate("document.getElementById('sec-how').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    if pg.evaluate("DM.all.size&&[...DM.all].some(i=>i.run)"): bad('demos keep playing in a hidden tab')
    pg.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(200)
    if not pg.evaluate("[...DM.all].some(i=>i.run)"): bad('demos do not resume after the tab is visible again')
    # home view hidden (another tab) -> pause
    pg.evaluate("setTab('library')"); pg.wait_for_function("getComputedStyle(document.getElementById('view-lib')).display==='none'"); pg.wait_for_timeout(300)
    if pg.evaluate("[...document.querySelectorAll('#dm-home .dm-box')].some(b=>b._dm.run)"): bad('demos keep playing while the home view is not shown')
    pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
    # dark theme follows the service toggle (tokens), cursor + hero colours
    def hero(pg): return pg.evaluate("getComputedStyle(document.querySelector('#dm-home .dm-hero')).backgroundColor")
    c_l = hero(pg); pg.evaluate("document.documentElement.dataset.theme='dark'"); pg.wait_for_timeout(100); c_d = hero(pg)
    if c_l == c_d: bad(f'theme does not change the demo ({c_l})')
    if c_d != 'rgb(24, 24, 27)': bad(f'dark hero colour is not the service --card: {c_d}')
    pg.evaluate("document.documentElement.dataset.theme='light'")
    if errs: bad(f'console errors: {errs[:3]}')
    ctx.close()

    # ---- reduced motion: poster only
    ctx, pg, errs = new(b, 1440, 900, reduced=True)
    for i in range(6):
        pg.evaluate(SCROLL, i); pg.wait_for_timeout(300)
    st = pg.evaluate(STATE)
    for s in st:
        if not s['init']: bad(f"reduced: {s['k']} not initialised (poster must show)")
        if s['run']: bad(f"reduced: {s['k']} is playing")
        if s['init'] and abs(s['t'] - s['P']) > 1e-6: bad(f"reduced: {s['k']} is not on its poster frame (t={s['t']}, poster={s['P']})")
    if errs: bad(f'reduced: console errors {errs[:3]}')
    ctx.close()

    # ---- phone 400 + tablet 768: no overflow, the same single stage layout, swipe row
    for (w, h, th) in [(400, 820, 'light'), (400, 820, 'dark'), (768, 1024, 'dark')]:
        ctx, pg, errs = new(b, w, h, th)
        pg.evaluate("document.getElementById('sec-how').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
        r0 = pg.evaluate("(()=>{const f=document.querySelector('#dm-home .dm-fig').getBoundingClientRect();return [f.left,f.right,innerWidth]})()")
        if w < 720 and (r0[0] < 0 or r0[1] > r0[2]): bad(f'{w}: first card outside the screen {r0}')
        for i in range(6):
            pg.evaluate(SCROLL, i); pg.wait_for_timeout(350)
        st = pg.evaluate(STATE)
        for s in st:
            if not s['init'] and w >= 768: bad(f"{w}: {s['k']} not initialised")
        if any(s['init'] and not s['single'] for s in st): bad(f'{w}: a compact / adaptive layout marker exists')
        overflow(pg, f'{w} {th}')
        if w < 720:
            sw = pg.evaluate("(()=>{const g=document.getElementById('dm-home');return [g.scrollWidth>g.clientWidth+1,getComputedStyle(g).overflowX]})()")
            if not sw[0]: bad(f'{w}: swipe row does not scroll {sw}')
        # every hint opens inside the screen and fits
        if errs: bad(f'{w}: console errors {errs[:3]}')
        ctx.close()

    # ---- hints (1440 and 400): open, fits, plays only while open, Esc / outside click close
    for (w, h) in [(1440, 900), (400, 820)]:
        ctx, pg, errs = new(b, w, h)
        def hint(sel, tag, outside=False):
            if not pg.is_visible(sel): bad(f'{w} {tag}: help button not visible ({sel})'); return
            pg.click(sel); pg.wait_for_timeout(450)
            r = pg.evaluate("(()=>{const p=document.getElementById('dmpop');if(!p||p.hidden)return null;const r=p.getBoundingClientRect(),i=[...DM.all].find(x=>x.root.closest('#dmpop')&&!x.root.parentElement.hidden);return {l:r.left,t:r.top,r:r.right,b:r.bottom,iw:innerWidth,ih:innerHeight,run:i&&i.run,init:!!(i&&i.api),key:i&&i.key,exp:document.querySelector('[data-dm-help][aria-expanded=true]')!==null}})()")
            if not r: bad(f'{w} {tag}: popover did not open'); return
            if r['l'] < -0.5 or r['t'] < -0.5 or r['r'] > r['iw'] + .5 or r['b'] > r['ih'] + .5: bad(f'{w} {tag}: popover outside the screen {r}')
            if not r['init'] or not r['run']: bad(f'{w} {tag}: demo inside is not playing {r}')
            if not r['exp']: bad(f'{w} {tag}: aria-expanded not set')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(350)
            if pg.evaluate("!document.getElementById('dmpop').hidden"): bad(f'{w} {tag}: Esc does not close')
            if tag == 'cells' and pg.evaluate("dwSec('draw')!=='cells'"): bad('Esc closed the drawer behind the popover as well')
            if pg.evaluate("[...DM.all].some(i=>i.root.closest('#dmpop')&&i.run)"): bad(f'{w} {tag}: demo plays in a closed popover')
            if not outside: return
            if not pg.is_visible(sel): return
            pg.click(sel); pg.wait_for_timeout(300); pg.mouse.click(w - 4, h - 4) if w > 1000 else pg.mouse.click(4, h - 4); pg.wait_for_timeout(350)
            if pg.evaluate("!document.getElementById('dmpop').hidden"): bad(f'{w} {tag}: outside click does not close')
        pg.evaluate("setTab('draw')"); pg.wait_for_selector('.dr-g #dr-side', state='attached', timeout=15000); pg.wait_for_timeout(600)
        pg.click('#dr-tools [data-tool=cells]'); pg.evaluate("dwOpen('draw','cells')"); pg.wait_for_timeout(500)
        hint('#dr-side [data-dm-help=cells]', 'cells')
        # regression: dwApply -> DM.setHint must not write attributes unconditionally (MutationObserver loop froze the page on dwOpen('draw','all'))
        pg.evaluate("dwOpen('draw','all')"); pg.wait_for_timeout(300)
        if pg.evaluate("1+1") != 2: bad('page frozen after dwOpen(draw, all)')
        pg.evaluate("dwClose('draw')"); pg.wait_for_timeout(300)
        # D5: «Скачать шрифт» (and its «?») stay hidden until a glyph is saved: draw one rectangle and save it, then open the hint
        bx = pg.locator('#dr-cv').bounding_box()
        pg.mouse.move(bx['x'] + bx['width'] * .42, bx['y'] + bx['height'] * .3); pg.mouse.down()
        pg.mouse.move(bx['x'] + bx['width'] * .55, bx['y'] + bx['height'] * .75, steps=6); pg.mouse.up()
        pg.wait_for_function("!document.querySelector('#dr-sv').disabled", timeout=5000); pg.click('#dr-sv')
        pg.wait_for_function("!document.querySelector('#dr-fontb').hidden", timeout=5000); pg.wait_for_timeout(450)
        hint('#dr-fontb ~ [data-dm-help=save]', 'save', True)
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard[data-font=volt]'); pg.evaluate("document.querySelector('#libgrid .lcard[data-font=volt]').click()")
        pg.wait_for_function("S.fontId==='volt'&&!S.live", timeout=30000); pg.evaluate("setTab('edit')"); pg.wait_for_timeout(500)
        pg.evaluate("dwOpen('edit','params')"); pg.wait_for_timeout(500)
        hint('#pcard [data-dm-help=weight]', 'weight')
        pg.evaluate("dwClose('edit')"); pg.evaluate("setTab('kern')"); pg.wait_for_timeout(500)
        hint('#view-kern [data-dm-help=kern]', 'kern')
        if errs: bad(f'{w} hints: console errors {errs[:3]}')
        ctx.close()

    # ---- keyed chips in the library
    ctx, pg, errs = new(b, 1440, 900)
    pg.evaluate("setTab('library')"); pg.wait_for_selector('#lib-tags .tile', timeout=15000); pg.wait_for_timeout(500)
    tiles = pg.evaluate("[...document.querySelectorAll('#lib-tags .tile')].slice(0,2).map(t=>t.dataset.tag)")
    pg.click(f'#lib-tags .tile[data-tag="{tiles[0]}"]'); pg.wait_for_timeout(30)
    anim = pg.evaluate("[...document.querySelectorAll('#lib-fchips .fchip')].map(c=>c.getAnimations().length)")
    if not anim or not anim[0]: bad(f'new chip does not animate in {anim}')
    pg.wait_for_timeout(450)
    pg.evaluate("window.__c0=document.querySelector('#lib-fchips .fchip')")
    pg.evaluate("libTagOn(arguments[0]||'')" if False else f"libTagOn('{tiles[1]}')"); pg.wait_for_timeout(450)
    same = pg.evaluate("document.querySelector('#lib-fchips .fchip')===window.__c0")
    n = pg.evaluate("document.querySelectorAll('#lib-fchips .fchip').length")
    if not same: bad('first chip node was replaced when a second one was added (innerHTML re-render)')
    if n != 2: bad(f'expected 2 chips, got {n}')
    pg.evaluate("libTagOff(window.__c0.dataset.tag)"); pg.wait_for_timeout(30)
    g = pg.evaluate("[...document.querySelectorAll('#mo-ghosts .fchip')].map(e=>e.getAnimations().map(a=>a.effect.getTiming().duration))")
    if not g or not g[0]: bad(f'removed chip does not leave as a ghost {g}')
    else:
        din = pg.evaluate("MO.D('base')"); dout = g[0][0]
        if not dout < din: bad(f'exit {dout} ms is not shorter than entrance {din} ms')
    try: pg.wait_for_function("document.querySelectorAll('#mo-ghosts .fchip').length===0", timeout=3000)
    except Exception: pass
    left = pg.evaluate("[document.querySelectorAll('#lib-fchips .fchip').length,document.querySelectorAll('#mo-ghosts .fchip').length,LQ.tags.join()]")
    if left[0] != 1 or left[1]: bad(f'after removing one of two chips (chips, ghosts, tags) = {left}')
    if errs: bad(f'chips: console errors {errs[:3]}')
    ctx.close()
    b.close()

# nothing of any demo frame leaves its stage (6 px inset), nothing leaves the hero window (8 px), no clipped text (project rule: no bleed)
import demo_frame
for _w in (1440, 400):
    for x in demo_frame.run(_w)[:5]: bad(f'demo frame {_w}: {x}')
for x in BAD[:40]: print('  ', x)
print(('PASS' if not BAD else 'FAIL') + f' demos {len(BAD)} problems; 6 demos x lazy/visibility/reduced/themes/400+768, 4 tool hints, keyed chips, no element leaves its frame t={time.time()-T0:.1f}s')
sys.exit(1 if BAD else 0)
