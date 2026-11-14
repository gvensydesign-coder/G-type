"""UI shell: context rail, dark theme, favorites, library search/filter, home layout, draw view contract, phone width."""
import os, sys, json, time
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, PAGE, TOUR_OFF

READY = "typeof S!=='undefined' && !!document.querySelector('#libcards .lcard') && typeof setTab==='function'"
NAV = ['home', 'library', 'fav']
EDIT = ['edit', 'proof', 'kern']


# Headless Chromium sometimes drops a localStorage write that is still queued when the document is reloaded
# (about 1 run in 8 under load; reproducible on the previous build, so not an app bug). The test therefore carries
# the stored keys across the reload in sessionStorage and puts back only keys that went missing: the app still has to
# READ them on start-up, but the check no longer depends on the browser's write queue.
def reload(pg):
    """reload and wait for the NEW document (marker on the old one disappears) to be ready; common.py hands the localStorage keys over if the browser drops them"""
    pg.evaluate("window.__old=1")
    pg.reload()
    pg.wait_for_function("!window.__old && " + READY, timeout=30000)


def vis(pg, sel):
    return pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'}", sel)


def on_tab(pg):
    # active state lives on the rail (navigation + editor) and on the top-bar view tabs (Редактор / Проверка / Кернинг); same tab = one entry
    return pg.evaluate("[...new Set([...document.querySelectorAll('.rail .rb.on, #vtabs [data-tab].on')].filter(b=>b.getBoundingClientRect().width>0).map(b=>b.dataset.tab||b.id))]")


def new_ctx(s, **kw):
    ctx = s.b.new_context(viewport={'width': 1440, 'height': 900}, **kw)
    ctx.add_init_script(TOUR_OFF)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + PAGE)
    pg.wait_for_function(READY, timeout=30000)
    return ctx, pg, errs


def rail_check(p):
    s = Session(p, 'shell_rail')
    try:
        pg = s.pg
        for t in ('home', 'library', 'fav'):
            pg.click(f'[data-tab={t}]')
            pg.wait_for_function(f"S.tab==='{t}'", timeout=5000)
            for n in NAV + ['theme-btn', 'help', 'settings']:
                sel = f'[data-tab={n}]' if n in NAV else '#' + n
                assert vis(pg, sel), f'{sel} hidden on {t}'
            for n in EDIT:
                assert not vis(pg, f'[data-tab={n}]'), f'edit tool {n} visible on {t}'
            assert not vis(pg, '#ex-menu'), f'download visible on {t}'
            assert on_tab(pg) == [t], f'active {on_tab(pg)} on {t}'
        s.open_font('kvadra')
        # work mode: the rail keeps «Главная» and the editor button; library/fav are reachable via «Главная»; theme moved into the «?» popover (see e2e_rail)
        for n in ('home', 'edit'):
            assert vis(pg, f'[data-tab={n}]'), f'{n} hidden in editor'
        for n in ('library', 'fav'):   # D5: the main sections are on the rail in every mode (same top group), tools come after the separator
            assert vis(pg, f'[data-tab={n}]'), f'{n} missing from the rail in editor'
        assert vis(pg, '#ex-menu') and not vis(pg, '#theme-btn')
        assert on_tab(pg) == ['edit'], on_tab(pg)
        pg.click('[data-tab=proof]')
        pg.wait_for_function("S.tab==='proof'", timeout=5000)
        assert on_tab(pg) == ['proof'], on_tab(pg)
        pg.click('#logo')
        pg.wait_for_function("S.tab==='home'", timeout=5000)
        assert not vis(pg, '[data-tab=edit]') and not vis(pg, '#ex-menu'), 'edit tools left after logo -> home'
        assert on_tab(pg) == ['home']
        assert not s.errs, s.errs[:3]
        return 'nav-only on home/library/fav, edit tools only in editor, active state ok'
    finally:
        s.close()


def theme_check(p):
    s = Session(p, 'shell_theme')
    try:
        pg = s.pg
        assert s.js("document.documentElement.dataset.theme") == 'light'
        bg0 = s.js("getComputedStyle(document.body).backgroundColor")
        assert vis(pg, '#theme-btn') and pg.get_attribute('#theme-btn', 'aria-pressed') == 'false'
        pg.click('#theme-btn')
        pg.wait_for_function("document.documentElement.dataset.theme==='dark'", timeout=3000)
        bg1 = s.js("getComputedStyle(document.body).backgroundColor")
        assert bg0 != bg1, (bg0, bg1)
        assert pg.get_attribute('#theme-btn', 'aria-pressed') == 'true'
        assert s.js("localStorage.getItem('gtype-theme-v1')") == 'dark'
        # dark in every view: body/card colors differ from light, nothing white left on cards
        for t in ('library', 'fav', 'home'):
            pg.evaluate(f"setTab('{t}')")
            card = s.js("getComputedStyle(document.querySelector('.libview:not([hidden])')).color")
            assert card.startswith('rgb(24') or card.startswith('rgb(2'), card  # light text on dark
        reload(pg)
        assert s.js("document.documentElement.dataset.theme") == 'dark', 'choice lost after reload'
        assert s.js("getComputedStyle(document.body).backgroundColor") == bg1
        pg.click('#theme-btn')
        assert s.js("document.documentElement.dataset.theme") == 'light'
        assert s.js("localStorage.getItem('gtype-theme-v1')") == 'light'
        # first visit follows the system scheme; a stored choice beats it
        ctx, pg2, errs = new_ctx(s, color_scheme='dark')
        assert pg2.evaluate("document.documentElement.dataset.theme") == 'dark', 'system dark ignored'
        pg2.evaluate("localStorage.setItem('gtype-theme-v1','light')")
        reload(pg2)
        assert pg2.evaluate("document.documentElement.dataset.theme") == 'light'
        ctx.close()
        assert not s.errs, s.errs[:3]
        return f'toggle ok, bg {bg0}->{bg1}, persists, follows system on first visit'
    finally:
        s.close()


def fav_check(p):
    s = Session(p, 'shell_fav')
    try:
        pg = s.pg
        pg.click('[data-tab=fav]')
        assert vis(pg, '#fav-empty') and not vis(pg, '#favgrid'), 'empty state missing'
        pg.click('#fav-go')
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        pg.click('[data-tab=home]')
        h = '#libcards .lcard[data-font=volt] .heart'
        assert pg.get_attribute(h, 'aria-pressed') == 'false'
        pg.click(h)
        assert s.js("S.tab") == 'home', 'heart opened the font'
        assert pg.get_attribute(h, 'aria-pressed') == 'true'
        pg.click('[data-tab=library]')
        pg.click('#libgrid .lcard[data-font=propis] .heart')
        assert s.js("S.tab") == 'library'
        pg.click('[data-tab=fav]')
        ids = s.js("[...document.querySelectorAll('#favgrid .lcard')].map(c=>c.dataset.font)")
        assert sorted(ids) == ['propis', 'volt'], ids
        assert pg.get_attribute('#favgrid .lcard[data-font=volt] .heart', 'aria-pressed') == 'true'
        assert json.loads(s.js("localStorage.getItem('gtype-favs-v1')")) and set(json.loads(s.js("localStorage.getItem('gtype-favs-v1')"))) == {'volt', 'propis'}
        assert set(s.js("projectJSON().favs")) == {'volt', 'propis'}, 'favs missing in project json'
        reload(pg)
        pg.click('[data-tab=fav]')
        ids = s.js("[...document.querySelectorAll('#favgrid .lcard')].map(c=>c.dataset.font)")
        assert sorted(ids) == ['propis', 'volt'], 'favorites lost after reload ' + str(ids) + ' ls=' + str(s.js("localStorage.getItem('gtype-favs-v1')")) + ' tab=' + str(s.js('S.tab')) + ' n=' + str(s.js('FAVS.size'))
        # project round trip: favs travel with the file
        pj = s.js("JSON.parse(JSON.stringify(projectJSON()))")
        pg.click('#favgrid .lcard[data-font=volt] .heart')
        pg.click('#favgrid .lcard[data-font=propis] .heart')
        assert vis(pg, '#fav-empty') and not vis(pg, '#favgrid'), 'empty state after unliking all'
        s.js("applyProject(%s)" % json.dumps(pj))
        pg.evaluate("setTab('fav')")
        ids = s.js("[...document.querySelectorAll('#favgrid .lcard')].map(c=>c.dataset.font)")
        assert sorted(ids) == ['propis', 'volt'], 'favs not restored by project load ' + str(ids)
        pg.click('#favgrid .lcard[data-font=propis]')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='propis'", timeout=15000)
        assert not s.errs, s.errs[:3]
        return 'like -> favorites -> unlike, empty state, persists, in project json, card opens editor'
    finally:
        s.close()


def library_check(p):
    s = Session(p, 'shell_lib')
    try:
        pg = s.pg
        pg.click('[data-tab=library]')
        ids = lambda: s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")
        assert len(ids()) == s.js("Object.keys(FONTS).length"), ids()
        tiles = s.js("[...document.querySelectorAll('#lib-tags .tile')].map(t=>[t.dataset.tag,+t.querySelector('.tn').textContent])")
        assert len(tiles) == 9 and all(n > 0 for _, n in tiles), tiles
        pg.fill('#lib-q', 'рот')
        assert 'rotunda' in ids() and 'volt' not in ids(), ids()
        pg.fill('#lib-q', 'РОТ')
        assert 'rotunda' in ids(), 'case sensitive'
        pg.fill('#lib-q', 'volt')
        assert ids() == ['volt'], ids()
        pg.fill('#lib-q', 'каллиграф')
        assert 'rotunda' in ids() and 'volt' not in ids(), ids()
        pg.fill('#lib-q', '')
        pg.click('#lib-tags .tile[data-tag=gothic]')
        assert sorted(ids()) == ['rotunda'], ids()
        assert pg.get_attribute('#lib-tags .tile[data-tag=gothic]', 'aria-pressed') == 'true'
        pg.fill('#lib-q', 'рот')
        assert ids() == ['rotunda'], ids()
        pg.fill('#lib-q', 'яяя')
        assert ids() == [] and vis(pg, '#lib-empty') and not vis(pg, '#libgrid'), 'empty state'
        pg.click('#lib-reset')
        assert len(ids()) == s.js("Object.keys(FONTS).length") and not vis(pg, '#lib-empty')
        assert s.js("document.querySelector('#lib-q').value") == ''
        pg.click('#lib-sort [data-sort=az]')
        names = s.js("[...document.querySelectorAll('#libgrid .lcard .ln')].map(c=>c.textContent)")
        assert names == sorted(names, key=lambda x: x.lower().replace('ё', 'е')), names
        pg.click('#lib-sort [data-sort=new]')
        assert ids()[:2] == ['kortes', 'tyaga'], ids()
        pg.click('#libgrid .lcard[data-font=codex]')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='codex'", timeout=15000)
        # home search box jumps to the library with the query
        pg.click('[data-tab=home]')
        pg.fill('#home-q', 'пропись')
        pg.press('#home-q', 'Enter')
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        assert ids() == ['propis', 'nit'], ids()  # «пропись» matches the synonyms of the tag «Рукописные»: Пропись first (popularity), then Нить (also hand)
        assert not s.errs, s.errs[:3]
        return 'search (ru/lat/case), tag chip, combo, empty state, sort, open editor, home search'
    finally:
        s.close()


def home_check(p):
    s = Session(p, 'shell_home')
    try:
        pg = s.pg
        pg.click('[data-tab=home]')
        n = s.js("document.querySelectorAll('#libcards .lcard').length")
        assert 1 <= n <= 6, n
        cre = s.js("[...document.querySelectorAll('#createcards .lcard')].map(c=>c.id)")
        assert cre == ['imp-card', 'draw-card'], cre
        assert 'Отрисовать' in s.js("document.querySelector('#draw-card .ln').textContent")
        # a liked font that is not in the default top 6 is boosted into it
        assert 'ryvok' not in s.js("[...document.querySelectorAll('#libcards .lcard')].map(c=>c.dataset.font)")
        pg.click('[data-tab=library]')
        pg.click('#libgrid .lcard[data-font=ryvok] .heart')
        pg.click('[data-tab=home]')
        ids = s.js("[...document.querySelectorAll('#libcards .lcard')].map(c=>c.dataset.font)")
        assert ids[0] == 'ryvok' and len(ids) == 6, ids
        pg.click('#all-fonts')
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        assert len(s.js("document.querySelectorAll('#libgrid .lcard')")) if False else s.js("document.querySelectorAll('#libgrid .lcard').length") == s.js("Object.keys(FONTS).length")
        # draw card -> draw view (placeholder or the real tool)
        pg.click('[data-tab=home]')
        pg.click('#draw-card')
        pg.wait_for_function("S.tab==='draw'", timeout=5000)
        assert vis(pg, '#view-draw') and not vis(pg, '#view-lib')
        assert s.js("document.querySelector('#view-draw').children.length") > 0, 'draw view empty'
        assert on_tab(pg) == ['home'], on_tab(pg)
        assert not vis(pg, '[data-tab=edit]') and not vis(pg, '#ex-menu'), 'edit tools on draw view'
        pg.click('[data-tab=home]'); pg.click('[data-tab=library]')  # work modes keep only Главная on the rail
        assert not vis(pg, '#view-draw')
        assert not s.errs, s.errs[:3]
        return f'{n} fonts on home, create cards {cre}, like boosts, all-fonts link, draw card opens draw'
    finally:
        s.close()


def draw_contract_check(p):
    s = Session(p, 'shell_draw')
    try:
        pg = s.pg
        pg.evaluate("""window.__d=[];window.GT_DRAW={mount(el){window.__d.push('mount');el.innerHTML='<div id="dr-mock">mock</div>'},onShow(){window.__d.push('show')},onHide(){window.__d.push('hide')},hasWork(){return false}}""")
        pg.click('[data-tab=home]')
        pg.click('#draw-card')
        pg.wait_for_function("S.tab==='draw'", timeout=5000)
        assert vis(pg, '#dr-mock')
        pg.click('[data-tab=home]'); pg.click('[data-tab=library]')
        pg.evaluate("setTab('draw')")
        pg.evaluate("setTab('lib')")
        log = s.js("window.__d")
        assert log == ['mount', 'show', 'hide', 'show', 'hide'], log
        assert s.js("S.tab") == 'home', 'lib alias'
        assert vis(pg, '#view-lib')
        assert not s.errs, s.errs[:3]
        return 'GT_DRAW mount once, onShow/onHide per switch, lib alias -> home'
    finally:
        s.close()


def phone_check(p):
    s = Session(p, 'shell_phone')
    try:
        pg = s.pg
        pg.set_viewport_size({'width': 400, 'height': 820})
        bad = []
        for t in ('home', 'library', 'fav', 'edit'):
            pg.evaluate(f"setTab('{t}')")
            pg.wait_for_timeout(300)
            ov = s.js("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            if ov > 0:
                bad.append((t, ov))
            rects = s.js("[...document.querySelectorAll('.rail .rb')].filter(b=>b.getBoundingClientRect().width>0).map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.bottom)]})")
            assert rects, f'rail empty on {t}'
            assert all(l >= 0 and r <= 400 and bt <= 820 for l, r, bt in rects), (t, rects)
            assert all(r - l >= 36 for l, r, _ in rects)
        assert not bad, f'horizontal overflow {bad}'
        pg.evaluate("setTab('library')")
        pg.fill('#lib-q', 'рот')
        assert s.js("document.querySelectorAll('#libgrid .lcard').length") >= 1
        assert not s.errs, s.errs[:3]
        return 'no horizontal overflow, rail inside viewport on home/library/fav/edit at 400px'
    finally:
        s.close()


def fixes_check(p):
    s = Session(p, 'shell_fix')
    try:
        pg = s.pg
        # 4: project popover outside the editor has no editor-only actions
        for t in ('home', 'library', 'fav', 'draw'):
            pg.evaluate(f"setTab('{t}')")
            pg.click('#settings')
            for i in ('ex-r', 'ex-i', 'cp', 'rs', 'ra'):
                assert not vis(pg, '#' + i), f'{i} visible on {t}'
            assert vis(pg, '#pj-s') and vis(pg, '#hint-reset')
            pg.keyboard.press('Escape')
        s.open_font('volt')
        pg.click('#settings')
        assert vis(pg, '#ex-r') and vis(pg, '#rs'), 'editor actions missing in editor'
        pg.keyboard.press('Escape')
        # 6: tile labels fit their tiles (1440, 1000, 400)
        for w in (1440, 1000, 400):
            pg.set_viewport_size({'width': w, 'height': 900})
            pg.evaluate("setTab('library')")
            pg.wait_for_timeout(250)
            bad = s.js("[...document.querySelectorAll('#lib-tags .tile')].filter(t=>{const l=t.querySelector('.tl'),r=t.getBoundingClientRect(),q=l.getBoundingClientRect();return l.scrollWidth>l.clientWidth+1||q.left<r.left||q.right>r.right}).map(t=>t.dataset.tag)")
            assert not bad, (w, bad)
        # 3: phone home hero is not clipped
        pg.set_viewport_size({'width': 400, 'height': 820})
        pg.evaluate("setTab('home')")
        pg.wait_for_timeout(250)
        bad = s.js("[...document.querySelectorAll('.hero h1,.hero p,.hero .srch,.hero .srch .btn')].filter(e=>e.getBoundingClientRect().right>document.querySelector('.hero').getBoundingClientRect().right+0.5).map(e=>e.tagName+e.className)")
        assert not bad, bad
        pg.set_viewport_size({'width': 1440, 'height': 900})
        # 14: heart on home re-sorts at once
        pg.evaluate("setTab('home')")
        pg.wait_for_timeout(200)
        first = s.js("document.querySelector('#libcards .lcard').dataset.font")
        pg.click('#libcards .lcard[data-font=codex] .heart')
        pg.wait_for_timeout(100)
        assert s.js("document.querySelector('#libcards .lcard').dataset.font") == 'codex' != first
        # storage unavailable: nothing throws, favorites and theme live in memory
        ctx = s.b.new_context(viewport={'width': 1440, 'height': 900})
        ctx.add_init_script("for(const m of ['getItem','setItem','removeItem'])Storage.prototype[m]=function(){throw new DOMException('denied','SecurityError')}")
        pg2 = ctx.new_page()
        errs = []
        pg2.on('pageerror', lambda e: errs.append(str(e)))
        pg2.goto('file://' + PAGE)
        pg2.wait_for_function(READY, timeout=30000)
        pg2.click('#libcards .lcard[data-font=volt] .heart')
        pg2.click('#theme-btn')
        assert pg2.evaluate("document.documentElement.dataset.theme") == 'dark'
        pg2.evaluate("setTab('fav')")
        assert pg2.evaluate("document.querySelectorAll('#favgrid .lcard').length") == 1
        assert not errs, errs[:3]
        ctx.close()
        assert not s.errs, s.errs[:3]
        return 'popover scoped, tile labels fit, phone hero fits, heart re-sorts, no-storage ok'
    finally:
        s.close()


def ui3_check(p):
    import icon_audit
    s = Session(p, 'shell_ui3')
    try:
        pg = s.pg
        # 2a/2b: tag tiles in one row that fills the width, scroll instead of wrap when narrow, no scrollbar
        pg.evaluate("setTab('library')")
        pg.wait_for_timeout(200)
        r = s.js("(()=>{const b=document.querySelector('#lib-tags'),t=[...b.children],bb=b.getBoundingClientRect();return [new Set(t.map(x=>Math.round(x.getBoundingClientRect().top))).size,bb.right-t[t.length-1].getBoundingClientRect().right,b.scrollWidth-b.clientWidth]})()")
        assert r[0] == 1 and r[1] < 3 and r[2] <= 1, r
        assert s.js("document.querySelector('#lib-count').textContent") == 'Все шрифты'
        for w in (1024, 700, 400):
            pg.set_viewport_size({'width': w, 'height': 800})
            pg.wait_for_timeout(250)
            for sel in ('#lib-tags', '#lib-sort'):
                r = pg.evaluate("sel=>{const b=document.querySelector(sel),t=[...b.children].filter(x=>x.getBoundingClientRect().width>0);return [new Set(t.map(x=>Math.round(x.getBoundingClientRect().top))).size,b.offsetHeight-b.clientHeight,getComputedStyle(b).overflowX]}", sel)
                assert r[0] == 1 and r[1] == 0 and r[2] == 'auto', (w, sel, r)
        assert s.js("(()=>{const b=document.querySelector('#lib-tags');return b.scrollWidth>b.clientWidth})()"), 'tiles should scroll at 400'
        pg.set_viewport_size({'width': 1440, 'height': 900})
        # view toggle
        assert pg.get_attribute('#lib-view [data-view=grid]', 'aria-pressed') == 'true'
        pg.click('#lib-view [data-view=list]')
        assert pg.get_attribute('#lib-view [data-view=list]', 'aria-pressed') == 'true'
        assert s.js("document.querySelector('#libgrid').classList.contains('list')")
        rows = s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>Math.round(c.getBoundingClientRect().left))")
        assert len(set(rows)) == 1, 'list rows must be full width'
        h = s.js("Math.round(document.querySelector('#libgrid .lcard').getBoundingClientRect().height)")
        assert 64 <= h <= 96, h
        pg.click('#libgrid .lcard[data-font=kvadra] .heart')
        assert s.js("S.tab") == 'library' and pg.get_attribute('#libgrid .lcard[data-font=kvadra] .heart', 'aria-pressed') == 'true'
        assert s.js("localStorage.getItem('gtype-libview-v1')") == 'list', 'view choice was not stored before the reload'
        reload(pg)
        pg.wait_for_function("LVIEW==='list'", timeout=5000)
        pg.evaluate("setTab('library')")
        pg.wait_for_function("document.querySelector('#libgrid').classList.contains('list')", timeout=5000)
        assert s.js("document.querySelector('#libgrid').classList.contains('list')"), 'view not remembered ' + str(s.js("[localStorage.getItem('gtype-libview-v1'),LVIEW,document.querySelector('#libgrid').className,S.tab]"))
        pg.evaluate("setTab('fav')")
        assert s.js("document.querySelector('#favgrid').classList.contains('list')")
        assert pg.get_attribute('#fav-view [data-view=list]', 'aria-pressed') == 'true'
        pg.click('#fav-view [data-view=grid]')
        assert not s.js("document.querySelector('#favgrid').classList.contains('list')")
        pg.evaluate("setTab('library')")
        assert not s.js("document.querySelector('#libgrid').classList.contains('list')"), 'shared view state'
        pg.click('#lib-view [data-view=list]')
        pg.click('#libgrid .lcard[data-font=codex] .ln')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='codex'", timeout=15000)
        # 3/4: home
        pg.evaluate("setTab('home')")
        assert s.js("document.querySelector('#h-mk').textContent") == 'Лаборатория'
        r = s.js("(()=>{const t=[...document.querySelectorAll('#libcards .lcard')];return [t.length,new Set(t.map(x=>Math.round(x.getBoundingClientRect().top))).size]})()")
        assert r[0] <= 6 and r[1] == 1, r
        assert s.js("document.querySelectorAll('#collections .coll').length") >= 3
        for w in (1440, 1024, 400):
            pg.set_viewport_size({'width': w, 'height': 900})
            pg.wait_for_timeout(250)
            ov = s.js("(()=>{const v=document.querySelector('#view-lib');return v.scrollWidth-v.clientWidth})()")
            assert ov <= 0, (w, ov)
        pg.set_viewport_size({'width': 1440, 'height': 900})
        pg.click('#collections .coll[data-tag=old]')
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        assert sorted(s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")) == ['ustav']
        # the old «Продолжить работу» block is gone from home
        pg.evaluate("setTab('home')")
        assert not s.js("!!document.querySelector('#recent')"), 'recent block must not exist'
        # 7: no native checkbox visible anywhere
        def native():
            return s.js("[...document.querySelectorAll('input[type=checkbox],input[type=radio]')].filter(i=>{if(i.closest('.dr-sw'))return false;const r=i.getBoundingClientRect(),c=getComputedStyle(i);return r.width>0&&c.opacity!=='0'&&c.visibility!=='hidden'&&c.appearance!=='none'}).length")
        for v in ('home', 'library', 'fav', 'proof', 'kern', 'edit'):
            pg.evaluate(f"setTab('{v}')")
            assert native() == 0, f'native checkbox on {v}'
        pg.evaluate("setTab('home')")
        pg.click('#imp-card')
        pg.wait_for_selector('#imp-emp', state='attached', timeout=10000)
        assert native() == 0, 'native checkbox on import'
        # 6: empty slots show the target character
        big = s.js("[...document.querySelectorAll('.imp-slot.empty')].slice(0,5).map(b=>[b.dataset.ch,(b.querySelector('.big')||{}).textContent,b.title])")
        assert big and all(c == t for c, t, _ in big) and all('U+' in ti for _, _, ti in big), big
        grp = s.js("(()=>{const a=document.querySelector('#imp-emp').closest('.imp-opts'),b=document.querySelector('#imp-auto').closest('.imp-opts');return a&&a===b})()")
        assert grp, 'options not grouped'
        # 5: icon centring (device px x2) on home, library, editor, kerning
        ctx = s.b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
        ctx.add_init_script(TOUR_OFF)
        p2 = ctx.new_page()
        p2.goto('file://' + PAGE)
        p2.wait_for_function(READY, timeout=30000)
        bad, n = [], 0
        def run(view):
            nonlocal n
            for name, dx, dy in icon_audit.audit(p2):
                n += 1
                if abs(dx) > 0.5 or abs(dy) > 0.5:
                    bad.append((view, name, round(dx, 2), round(dy, 2)))
        for v in ('home', 'library'):
            p2.evaluate(f"setTab('{v}')")
            p2.wait_for_timeout(400)
            run(v)
        p2.evaluate("switchFont('volt');setTab('edit')")
        p2.wait_for_timeout(600)
        run('edit')
        p2.evaluate("setTab('kern')")
        p2.wait_for_timeout(500)
        run('kern')
        ctx.close()
        assert n > 20, f'audit saw only {n} icon buttons'
        assert not bad, bad[:6]
        assert not s.errs, s.errs[:3]
        return f'ui3: tiles row/scroll, list view, home blocks, no native checkbox, slot chars, {n} icon buttons centred'
    finally:
        s.close()


YEARS = {'kvadra': 2026, 'stroka': 2026, 'volt': 2077, 'propis': 2026, 'liniya': 2026, 'codex': 1204, 'rotunda': 1719, 'ustav': 1703, 'modul': 2026, 'ryvok': 2077, 'kaplya': 2026, 'pixel': 2026, 'renessa': 1495, 'applik': 2026, 'stsepka': 2026, 'stolb': 2026, 'nit': 2026, 'tyaga': 2026, 'kortes': 2026}


def meta_check(p):
    """every registered font has year/desc/tags in FONT_META, tags are known ids, covers render every letter"""
    s = Session(p, 'shell_meta')
    try:
        bad = s.js("""(()=>{const bad=[];for(const id of Object.keys(FONTS)){const m=FONT_META[id];
          if(!m){bad.push(id+': no FONT_META entry');continue;}
          if(!Number.isFinite(m.year))bad.push(id+': year');
          if(typeof m.desc!=='string'||m.desc.length<40)bad.push(id+': desc');
          if(!Array.isArray(m.tags)||!m.tags.length)bad.push(id+': tags');
          else for(const k of m.tags)if(!tagById(k))bad.push(id+': unknown tag '+k);
          const f=fmeta(id);if(f.cover!==f.name+' '+f.year)bad.push(id+': cover text '+f.cover);}
        return bad;})()""")
        assert not bad, bad
        assert s.js("Object.keys(FONT_META).filter(k=>!FONTS[k]&&k!=='imp')") == [], 'FONT_META entry without a font'
        yrs = s.js("Object.fromEntries(Object.keys(FONTS).map(id=>[id,fmeta(id).year]))")
        for k, y in YEARS.items():
            assert yrs.get(k) == y, (k, yrs.get(k))
        assert s.js("FONT_META.imp.year") == s.js("new Date().getFullYear()"), 'user font year'
        ids = [t[0] for t in s.js("LIB_TAGS")]
        assert len(ids) == len(set(ids)), 'duplicate tag ids'
        miss = s.js("""(()=>{const back=S.fontId,out=[];for(const id of Object.keys(FONTS)){useFont(id);const r=libRun(id,fmeta(id).cover);
          if(r.items.length!==[...fmeta(id).cover].length)out.push(id);}useFont(back);return out;})()""")
        assert not miss, 'cover letters missing in ' + str(miss)
        w = s.js("Object.fromEntries(Object.keys(FONTS).map(id=>[id,fmeta(id).weights.length]))")
        assert all(v == 4 for v in w.values()), w
        assert not s.errs, s.errs[:3]
        return f'meta: {len(YEARS)} fonts have year/desc/tags, covers complete'
    finally:
        s.close()


def covers_check(p):
    """Stage 3 covers: a real hero word (not «Название год») on home/favs/library/list, drawn, inside the canvas box; detailed framing rules live in e2e_covers"""
    s = Session(p, 'shell_cover')
    try:
        pg = s.pg
        s.open_font('kvadra')
        pg.evaluate("setTab('home')")
        pg.click('#libcards .lcard[data-font=volt] .heart')
        views = [('home', '#libcards .lcv'), ('home', '#favprev .lcv'), ('library', '#libgrid .lcv'), ('fav', '#favgrid .lcv')]
        for tab, sel in views:
            pg.evaluate(f"setTab('{tab}')")
            pg.wait_for_function(f"S.tab==='{tab}' && [...document.querySelectorAll('{sel}')].length>0 && [...document.querySelectorAll('{sel}')].every(c=>c.dataset.cover)", timeout=8000)
            for lv in (['grid', 'list'] if tab in ('library', 'fav') else ['grid']):
                if tab in ('library', 'fav'):
                    pg.click(f'#{"lib" if tab=="library" else "fav"}-view [data-view={lv}]')
                    pg.wait_for_function(f"[...document.querySelectorAll('{sel}')].every(c=>c.dataset.cover)", timeout=8000)
                    pg.wait_for_timeout(150)
                rows = s.js(f"[...document.querySelectorAll('{sel}')].map(c=>[c.dataset.font,c.dataset.cover,+c.dataset.strings])")
                assert rows, (tab, sel)
                for fid, txt, n in rows:
                    assert len(txt) >= 3 and txt != s.js('FONTS.' + fid + '.name') + ' ' + str(YEARS[fid]), (tab, sel, fid, txt)
                    assert 2 <= n <= 7, (tab, fid, n)
        pg.evaluate("setTab('library')")
        pg.click('#lib-view [data-view=grid]')
        pg.wait_for_function("[...document.querySelectorAll('#libgrid .lcv')].every(c=>c.dataset.cover)", timeout=8000)
        pg.wait_for_timeout(500)
        ink = s.js("""[...document.querySelectorAll('#libgrid .lcv')].map(cv=>{const c=cv.getContext('2d'),w=cv.width,h=cv.height,d=c.getImageData(0,0,w,h).data;
          let y0=h,y1=-1,x0=w,x1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>40){if(y<y0)y0=y;if(y>y1)y1=y;if(x<x0)x0=x;if(x>x1)x1=x;}
          return [cv.dataset.font,y0/h,y1/h,x0/w,x1/w];})""")
        for fid, y0, y1, x0, x1 in ink:
            assert y1 >= 0, f'{fid}: cover is empty'
            assert x1 - x0 >= 0.66, f'{fid}: cover ink width {x1 - x0:.2f} < 2/3'
        assert not s.errs, s.errs[:3]
        return 'covers: hero word + satellites on home/favs/library/list, drawn, 3 strings'
    finally:
        s.close()


def tags_check(p):
    """tag chips replace the descriptor, click filters the library, search by tag prefix, suggestions, filter chips, full-width home search"""
    s = Session(p, 'shell_tags')
    try:
        pg = s.pg
        ids = lambda: s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")
        # home: search + own-text field together are exactly as wide as the headline block (HERO50), button at the right end of the search
        r = s.js("(()=>{const h=document.querySelector('.hero .hx-in').getBoundingClientRect(),f0=document.querySelector('#home-search').getBoundingClientRect(),f={left:f0.left,right:f0.right,width:f0.width},b=document.querySelector('#home-search .btn').getBoundingClientRect();return [h.left-f.left,h.right-f.right,f0.right-b.right,f.width]})()")
        assert abs(r[0]) <= 2 and abs(r[1]) <= 2 and r[2] <= 12, ('home search not full width', r)
        # cards: chips, no descriptor line
        chips = s.js("[...document.querySelectorAll('#libcards .lcard[data-font]')].map(c=>[c.dataset.font,c.querySelectorAll('.lt .tag').length,c.querySelector('.lt').textContent===[...c.querySelectorAll('.lt .tag')].map(t=>t.textContent).join('')])")
        assert all(1 <= n <= 3 and ok for _, n, ok in chips), chips
        pg.click('[data-tab=library]')
        txt = s.js("FONTS.propis.tag")
        assert not s.js("[...document.querySelectorAll('#libgrid .lt')].some(e=>e.textContent.includes(" + json.dumps(txt) + "))"), 'old descriptor still shown'
        # click a tag on a home card: library filtered, font not opened
        pg.click('[data-tab=home]')
        before = s.js("S.fontId")
        pg.click('#libcards .lcard[data-font=codex] .tag[data-tag=wpen]')
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        assert sorted(ids()) == ['codex', 'renessa', 'rotunda'], ids()
        assert s.js("S.fontId") == before, 'tag click opened a font'
        assert vis(pg, '#lib-fchips .fchip[data-tag=wpen]'), 'active filter chip missing'
        # tag click inside the library replaces the filter
        pg.click('#libgrid .lcard[data-font=codex] .tag[data-tag=uncial]')
        assert ids() == ['codex'] and s.js("S.tab") == 'library' and s.js("S.fontId") == before, ids()
        assert s.js("[...document.querySelectorAll('#lib-fchips .fchip')].map(c=>c.dataset.tag)") == ['uncial']
        # remove the chip
        pg.click('#lib-fchips .fchip[data-tag=uncial]')
        assert len(ids()) == s.js("Object.keys(FONTS).length") and not vis(pg, '#lib-fchips'), 'chip did not clear the filter'
        # tag prefix search + suggestion + Enter
        for q, tag, must in (('рукоп', 'hand', 'propis'), ('истор', 'old', 'ustav'), ('дисп', 'disp', 'ryvok'), ('акцид', 'disp', 'volt'), ('перо', 'wpen', 'rotunda'), ('пером', 'wpen', 'codex'), ('готи', 'gothic', 'rotunda')):
            pg.fill('#lib-q', q)
            assert must in ids(), (q, ids())
            sug = s.js("[...document.querySelectorAll('#lib-sug .sug')].map(b=>b.dataset.tag)")
            assert sug and sug[0] == tag, (q, sug)
            assert vis(pg, '#lib-sug'), 'suggestions row hidden'
            pg.fill('#lib-q', '')
            assert not vis(pg, '#lib-sug'), 'suggestions stay after clearing'
        pg.fill('#lib-q', 'рукоп')
        pg.press('#lib-q', 'Enter')
        assert s.js("[...document.querySelectorAll('#lib-fchips .fchip')].map(c=>c.dataset.tag)") == ['hand']
        assert s.js("document.querySelector('#lib-q').value") == '' and ids() == ['propis', 'nit'], ids()  # tag «Рукописные»: Пропись and Нить
        # a second tag from a suggestion narrows (AND); Backspace removes the last chip
        pg.fill('#lib-q', 'перо')
        pg.click('#lib-sug .sug[data-tag=ppen]')
        assert s.js("LQ.tags") == ['hand', 'ppen'] and ids() == ['propis'], (s.js("LQ.tags"), ids())
        pg.press('#lib-q', 'Backspace')
        assert s.js("LQ.tags") == ['hand'], s.js("LQ.tags")
        pg.press('#lib-q', 'Backspace')
        assert s.js("LQ.tags") == [] and len(ids()) == s.js("Object.keys(FONTS).length")
        # a font name never shows a tag suggestion that would hide it
        pg.fill('#lib-q', 'вольт')
        assert ids() == ['volt'] and not vis(pg, '#lib-sug'), ids()
        pg.fill('#lib-q', '')
        # full-width search, phone and tablet
        for w, h in ((1024, 768), (400, 800)):
            ctx, pg2, errs = new_ctx(s, )
            pg2.set_viewport_size({'width': w, 'height': h})
            pg2.wait_for_timeout(200)
            r = pg2.evaluate("(()=>{const h=document.querySelector('.hero .hx-in').getBoundingClientRect(),f0=document.querySelector('#home-search').getBoundingClientRect(),b=document.querySelector('#home-search .btn').getBoundingClientRect();return [h.left-f0.left,h.right-f0.right,f0.right-b.right]})()")
            assert abs(r[0]) <= 2 and abs(r[1]) <= 2 and r[2] <= 12, (w, r)
            assert pg2.evaluate("document.documentElement.scrollWidth<=innerWidth"), f'horizontal scroll at {w}'
            if w == 400:
                pg2.evaluate("setTab('library')")
                pg2.fill('#lib-q', 'рукоп')
                pg2.press('#lib-q', 'Enter')
                assert pg2.evaluate("document.documentElement.scrollWidth<=innerWidth"), 'chips overflow at 400'
                b = pg2.evaluate("(()=>{const f=document.querySelector('#lib-search').getBoundingClientRect(),c=document.querySelector('#lib-fchips .fchip').getBoundingClientRect();return [c.left>=f.left,c.right<=f.right]})()")
                assert all(b), b
            assert not errs, errs[:3]
            ctx.close()
        assert not s.errs, s.errs[:3]
        return 'tags: chips on cards, click filters without opening, prefix search, suggestions+Enter, filter chips, full-width home search'
    finally:
        s.close()


def hover_check(p):
    """hover card: delay, content, stays while hovered, closes on leave/Esc/scroll, buttons, flips at the edge, keyboard, themes"""
    s = Session(p, 'shell_hover')
    try:
        pg = s.pg
        shown = lambda: s.js("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&getComputedStyle(e).opacity==='1'})()")
        hidden = lambda: s.js("(()=>{const e=document.getElementById('hcard');return !e||e.hidden})()")
        pg.click('[data-tab=library]')
        card = '#libgrid .lcard[data-font=kvadra]'
        # delay: judged on the PAGE clock (pointerenter -> check), never on the test's wall clock: a stalled low-fps page can legitimately pass HC_DELAY
        # before the check runs; such a probe is inconclusive and repeated, a timely probe must show a hidden card
        def timely_probe(leave_after=None):
            for _try in range(6):
                pg.mouse.move(5, 5); pg.wait_for_function("document.getElementById('hcard')?document.getElementById('hcard').hidden:true", timeout=6000)
                s.js("(c=>{window.__hv=null;window.__lv=null;c.addEventListener('pointerenter',()=>{window.__hv=performance.now()},{once:true});c.addEventListener('pointerleave',()=>{window.__lv=performance.now()},{once:true})})(document.querySelector(%r))" % card)
                pg.locator(card).scroll_into_view_if_needed(); bx = pg.locator(card).bounding_box(); pg.mouse.move(bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2)
                pg.wait_for_function("window.__hv!==null", timeout=6000)
                if leave_after is None:
                    r = s.js("({h:(()=>{const e=document.getElementById('hcard');return !e||e.hidden})(),dt:performance.now()-window.__hv})")
                    if r['dt'] < s.js('HC_DELAY') - 100:
                        return r
                else:
                    pg.mouse.move(5, 5, steps=2); pg.wait_for_function("window.__lv!==null", timeout=6000)
                    if s.js("window.__lv-window.__hv") < s.js('HC_DELAY') - 100:
                        return True
            raise AssertionError('no timely hover probe in 6 tries (page too slow)')
        r = timely_probe(); assert r['h'], ('hover card appeared before the delay', r)
        pg.hover(card)
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&getComputedStyle(e).opacity==='1'})()", timeout=4000)
        # content
        d = s.js("""(()=>{const e=document.getElementById('hcard'),q=x=>e.querySelector(x);
          const px=cv=>{const c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>40)n++;return n;};
          return {name:q('.hc-n').textContent,year:q('.hc-y').textContent,desc:q('.hc-d').textContent,tags:[...e.querySelectorAll('.hc-tags .tag')].map(t=>t.dataset.tag),
          demo:px(q('.hc-cv')),weights:[...e.querySelectorAll('.hc-wc')].map(c=>[c.dataset.w,px(c.querySelector('canvas'))]),meta:q('.hc-m').textContent,
          input:!!q('.hc-in'),open:q('.hc-open').textContent,heart:q('.hc-heart').getAttribute('aria-pressed')}})()""")
        assert d['name'] == 'Квадра' and d['year'] == '2026' and len(d['desc']) > 40, d
        assert d['tags'] == s.js("fmeta('kvadra').tags") and len(d['tags']) >= 3, d['tags']
        assert d['demo'] > 200, 'live demo is empty'
        assert [w for w, _ in d['weights']] == ['Light', 'Regular', 'Bold', 'Black'] and all(n > 50 for _, n in d['weights']), d['weights']
        assert 'Знаков' in d['meta'] and 'Набор' not in d['meta'] and 'Прямой' in d['meta'] and 'Италик' in d['meta'], d['meta']  # «Базовый/Расширенный» replaced by the «Языки» block (ui_lang_l1.js)
        assert s.js("/из \\d+/.test(document.querySelector('#hcard .hc-lang .hl-h b').textContent)"), 'hover card: languages block'
        assert d['input'] and 'редакторе' in d['open'] and d['heart'] == 'false', d
        wt = s.js("(()=>{const f=[...document.querySelectorAll('#hcard .hc-wc canvas')].map(cv=>{const c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>40)n++;return n});return f})()")
        assert wt[0] < wt[1] < wt[2] < wt[3], ('weights not progressively heavier', wt)
        # inside the viewport
        assert s.js("(()=>{const r=document.getElementById('hcard').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"), 'hover card leaves the viewport'
        # demo cycles, typing replaces
        a = s.js("document.querySelector('#hcard .hc-cv').toDataURL().length")
        pg.fill('#hcard .hc-in', 'Тест')
        b = s.js("document.querySelector('#hcard .hc-cv').toDataURL().length")
        assert a != b, 'typed text did not redraw the demo'
        # stays open while the pointer is on the preview
        box = pg.locator('#hcard').bounding_box()
        pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + 60, steps=8)
        pg.wait_for_timeout(600)
        assert shown(), 'hover card closed while the pointer is on it'
        # tag inside the hover card filters the library and closes the card
        pg.click('#hcard .hc-tags .tag[data-tag=ngrot]')
        assert hidden() and s.js("LQ.tags") == ['ngrot'] and s.js("S.tab") == 'library', 'hover tag'
        assert sorted(s.js("[...document.querySelectorAll('#libgrid .lcard')].map(c=>c.dataset.font)")) == ['kvadra', 'stroka']
        pg.click('#lib-fchips .fchip[data-tag=ngrot]')
        # leave closes; a quick pass does not open
        pg.hover(card)
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden})()", timeout=4000)
        pg.mouse.move(5, 5, steps=4)
        pg.wait_for_function("document.getElementById('hcard').hidden", timeout=3000)
        timely_probe(leave_after=True)     # pointer left before HC_DELAY on the page clock
        pg.wait_for_timeout(1100)
        assert hidden(), 'hover card opened after the pointer left early'
        # Esc and scroll close it
        pg.hover(card)
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden})()", timeout=4000)
        pg.keyboard.press('Escape')
        assert hidden(), 'Esc does not close'
        pg.mouse.move(5, 5)
        pg.hover(card)
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden})()", timeout=4000)
        pg.mouse.wheel(0, 300)
        pg.wait_for_function("document.getElementById('hcard').hidden", timeout=3000)
        pg.evaluate("document.querySelector('#view-library').scrollTo?.(0,0);window.scrollTo(0,0)")
        # heart and open buttons
        pg.mouse.move(5, 5)
        card2 = '#libgrid .lcard[data-font=liniya]'
        pg.hover(card2)
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&getComputedStyle(e).opacity==='1'})()", timeout=4000)
        pg.click('#hcard .hc-heart')
        assert s.js("FAVS.has('liniya')") and pg.get_attribute('#hcard .hc-heart', 'aria-pressed') == 'true'
        assert pg.get_attribute(card2 + ' .heart', 'aria-pressed') == 'true', 'card heart not in sync'
        pg.click('#hcard .hc-heart')
        assert not s.js("FAVS.has('liniya')")
        pg.click('#hcard .hc-open')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='liniya'", timeout=15000)
        assert hidden(), 'hover card stays over the editor'
        # popular row on home: opens too
        pg.click('[data-tab=home]')
        pg.hover('#libcards .lcard[data-font=propis]')
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&document.querySelector('#hcard .hc-n').textContent==='Пропись'})()", timeout=4000)
        # flips: last column opens to the left, first column to the right
        pg.mouse.move(5, 5)
        pg.click('[data-tab=library]')
        last = s.js("(()=>{const c=[...document.querySelectorAll('#libgrid .lcard')];return c.reduce((a,b)=>b.getBoundingClientRect().right>a.getBoundingClientRect().right?b:a).dataset.font})()")
        pg.hover(f'#libgrid .lcard[data-font={last}]')
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&getComputedStyle(e).opacity==='1'})()", timeout=4000)
        r = s.js(f"(()=>{{const h=document.getElementById('hcard').getBoundingClientRect(),c=document.querySelector('#libgrid .lcard[data-font={last}]').getBoundingClientRect();return [h.left,h.right,h.top,h.bottom,c.left,innerWidth,innerHeight]}})()")
        assert r[1] <= r[4] + 1 and r[0] >= 0 and r[3] <= r[6], ('no flip to the left', r)
        # keyboard focus shows it
        pg.mouse.move(5, 5)
        pg.wait_for_function("document.getElementById('hcard').hidden", timeout=3000)
        pg.focus('#libgrid .lcard[data-font=volt]')
        pg.keyboard.press('Shift+Tab')
        pg.keyboard.press('Tab')
        pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&document.querySelector('#hcard .hc-n').textContent==='Вольт'})()", timeout=4000)
        pg.keyboard.press('Escape')
        assert hidden()
        # both themes
        for th in ('dark', 'light'):
            pg.evaluate(f"themeSet('{th}')")
            pg.mouse.move(5, 5)
            pg.hover(card)
            pg.wait_for_function("(()=>{const e=document.getElementById('hcard');return !!e&&!e.hidden&&getComputedStyle(e).opacity==='1'})()", timeout=4000)
            lum = s.js("(()=>{const m=getComputedStyle(document.getElementById('hcard')).backgroundColor.match(/\\d+/g).map(Number);return (m[0]+m[1]+m[2])/3})()")
            assert (lum < 80) == (th == 'dark'), (th, lum)
            pg.mouse.move(5, 5)
            pg.wait_for_function("document.getElementById('hcard').hidden", timeout=3000)
        assert not s.errs, s.errs[:3]
        return 'hover: 0.7s delay, content+weights+demo, stays while hovered, closes on leave/Esc/scroll, tag/heart/open buttons, flips, keyboard, both themes'
    finally:
        s.close()


def hover_phone_check(p):
    """phone width: the hover card (forced by long press) stays inside the viewport; a plain tap still opens the font"""
    s = Session(p, 'shell_hover_phone')
    try:
        ctx, pg, errs = new_ctx(s, has_touch=True, is_mobile=True)
        pg.set_viewport_size({'width': 400, 'height': 800})
        pg.evaluate("setTab('library')")
        pg.wait_for_function("S.tab==='library'", timeout=5000)
        pg.evaluate("hcShow(document.querySelector('#libgrid .lcard[data-font=ryvok]'),'touch')")
        r = pg.evaluate("(()=>{const e=document.getElementById('hcard'),h=e.getBoundingClientRect();return [h.left,h.top,h.right,h.bottom,document.documentElement.clientWidth,innerHeight,e.hidden]})()")
        assert not r[6] and r[0] >= 0 and r[1] >= 0 and r[2] <= r[4] + 0.5 and r[3] <= r[5] + 0.5, ('phone hover card outside viewport', r)
        pg.evaluate("hcHide(true)")
        assert pg.evaluate("document.getElementById('hcard').hidden")
        pg.tap('#libgrid .lcard[data-font=ryvok]')
        pg.wait_for_function("S.tab==='edit' && S.fontId==='ryvok'", timeout=15000)
        assert not errs, errs[:3]
        ctx.close()
        return 'hover card on phone width stays in viewport, tap opens font'
    finally:
        s.close()


def all_checks(p):
    import traceback
    out = []
    for f in (rail_check, theme_check, fav_check, library_check, home_check, draw_contract_check, phone_check, fixes_check, ui3_check, meta_check, covers_check, tags_check, hover_check, hover_phone_check):
        try:
            out.append(f(p))
        except Exception as e:  # name the failing sub-check and line
            ln = traceback.extract_tb(e.__traceback__)[-1].lineno
            raise AssertionError(f'{f.__name__} line {ln}: {e}')
    return '; '.join(out)


if __name__ == '__main__':
    sys.exit(check_all([('shell', all_checks)]))
