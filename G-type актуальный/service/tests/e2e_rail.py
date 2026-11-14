"""Contextual rail: library pages keep the navigation rail; every work mode (edit/proof/kern/draw/import) rebuilds it into that mode's tool strip.
Checks: exact button set per mode, every tool opens/toggles its target (state flips and flips back), removed functions (project, theme) stay reachable,
rail pills hug their content (no empty gap), phone bottom bar <= 6 items with «Ещё». One PASS/FAIL line."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

KEYS = "[...document.querySelectorAll('.rail .rb')].filter(b=>{const r=b.getBoundingClientRect(),c=getComputedStyle(b);return r.width>0&&r.height>0&&c.visibility!=='hidden'}).map(b=>b.dataset.tab||b.dataset.rt||b.id)"
SETS = {
    # library modes end with the profile avatar (rail-profile); folder adds the back item on top; D5: work modes show it too (same bottom group)
    'home': ['home', 'library', 'fav', 'theme-btn', 'help', 'settings', 'rail-profile'],
    'library': ['home', 'library', 'fav', 'theme-btn', 'help', 'settings', 'rail-profile'],
    'fav': ['home', 'library', 'fav', 'theme-btn', 'help', 'settings', 'rail-profile'],
    'profile': ['home', 'library', 'fav', 'theme-btn', 'help', 'settings', 'rail-profile'],
    'folder': ['rail-back', 'home', 'library', 'fav', 'theme-btn', 'help', 'settings', 'rail-profile'],
    # D5: same top group (home, library, fav) in every mode, tools after the separator, «?» + profile at the bottom
    'edit': ['home', 'library', 'fav', 'edit', 'presets', 'grid', 'ref', 'ot', 'lang', 'help', 'rail-profile'],
    'proof': ['home', 'library', 'fav', 'edit', 'mt', 'help', 'rail-profile'],   # «Только с замечаниями» / «Метрики» / «Эталон» live in the top bar only
    'kern': ['home', 'library', 'fav', 'edit', 'pair', 'text', 'list', 'only', 'help', 'rail-profile'],
    'draw': ['home', 'library', 'fav', 'grid', 'con', 'spk', 'recs', 'help', 'rail-profile'],
    'import': ['home', 'library', 'fav', 'opt', 'pv', 'lg', 'help', 'rail-profile'],   # «Загрузить файлы» lives in the top bar only
}
# tool -> JS expression whose value must flip when the tool is clicked (the real target state, not the button's own aria-pressed)
STATE = {
    # drawer tools (FLY): the rail button opens the drawer on its section; state = which section the drawer shows (null = closed)
    'edit': {'edit': "dwSec('edit')", 'presets': "dwSec('edit')",
             'grid': "dwSec('edit')", 'ref': "dwSec('edit')", 'ot': "dwSec('edit')", 'lang': "dwSec('edit')"},
    'proof': {'mt': "document.querySelector('#mtbox').classList.contains('shut')"},
    'kern': {'only': "document.querySelector('#kk-only').checked"},
    'draw': {'grid': "dwSec('draw')", 'con': "dwSec('draw')", 'spk': "dwSec('draw')", 'recs': "dwSec('draw')"},
    'import': {'opt': "dwSec('import')", 'pv': "dwSec('import')", 'lg': "dwSec('import')"},
}
# drawer: tool -> (mode, drawer id, a selector inside its section that must be visible once the drawer is open)
DRAWER = {
    'edit': ('edit', 'pcard', '#params .grp h5'), 'presets': ('edit', 'pcard', '#methods'), 'grid': ('edit', 'pcard', '#addv'),
    'ref': ('edit', 'pcard', '#refon'), 'ot': ('edit', 'pcard', '#otsec .pane-b'), 'lang': ('edit', 'pcard', '#ps-lang .lg-body'),
}
GO = {  # scroll/focus launchers: target must be on screen (and focused when it is a field)
    'kern': {'pair': ("#kk-a", "kk-a"), 'text': ("#kk-txt", "kk-txt"), 'list': ("#kk-list", None)},
}


def enter(pg, mode, s=None):
    if mode in ('home', 'library', 'fav', 'profile', 'folder'):
        pg.evaluate("typeof iuClose==='function'&&document.body.classList.contains('imp-open')&&iuClose()")
        pg.evaluate(f"setTab('{mode}')")
    elif mode in ('edit', 'proof', 'kern'):
        if not pg.evaluate("S.fontId==='kvadra'"):
            s.open_font('kvadra')
        pg.evaluate(f"setTab('{mode}')")
    elif mode == 'draw':
        pg.evaluate("document.body.classList.contains('imp-open')&&iuClose()")
        pg.evaluate("setTab('draw')")
        pg.wait_for_selector('.dr-g #dr-side', state='attached', timeout=15000)
    elif mode == 'import':
        pg.evaluate("setTab('home')")
        pg.evaluate("document.querySelector('#imp-card').click()")
        pg.wait_for_function("document.body.classList.contains('imp-open')", timeout=10000)
    pg.wait_for_function(f"document.body.dataset.rm==='{mode}'", timeout=10000)
    pg.wait_for_timeout(450)


def vis(pg, sel):
    return pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none'}", sel)


def sets_and_gaps(p):
    s = Session(p, 'rail_sets')
    try:
        pg = s.pg
        for mode, want in SETS.items():
            enter(pg, mode, s)
            got = pg.evaluate(KEYS)
            assert got == want, f'{mode}: rail {got} != {want}'
            # pills hug their content: height <= content + padding (+2 rounding)
            bad = pg.evaluate("""()=>[...document.querySelectorAll('.rail .rpill')].filter(p=>p.getBoundingClientRect().height>0).map(p=>{
              const k=[...p.querySelectorAll('.rb,.rsep')].filter(e=>e.getBoundingClientRect().height>0),cs=getComputedStyle(p);
              if(!k.length)return 'empty pill '+p.id+'.'+p.className;
              const top=Math.min(...k.map(e=>e.getBoundingClientRect().top)),bot=Math.max(...k.map(e=>e.getBoundingClientRect().bottom)),r=p.getBoundingClientRect();
              const allowed=(bot-top)+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+2;
              return r.height>allowed?('gap in pill '+(p.id||p.className)+' h='+r.height+' content='+(bot-top)):''}).filter(Boolean)""")
            assert not bad, f'{mode}: {bad}'
            inside = pg.evaluate("()=>[...document.querySelectorAll('.rail .rb')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden').every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0})")
            assert inside, f'{mode}: rail overflows the viewport'
            # a11y: every rail button is a <button> with a name, tooltip and (for tools) aria-pressed or a plain action
            meta = pg.evaluate("[...document.querySelectorAll('.rail .rb[data-rt]')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden').map(b=>[b.tagName,!!b.getAttribute('aria-label'),!!b.dataset.tip,b.dataset.rt])")
            assert all(m[0] == 'BUTTON' and m[1] and m[2] for m in meta), (mode, meta)
        assert not s.errs, s.errs[:3]
        return 'exact rail set per mode (home/library/fav/profile/folder/edit/proof/kern/draw/import; avatar only in library modes), pills hug content'
    finally:
        s.close()


def tools_work(p):
    s = Session(p, 'rail_tools')
    try:
        pg = s.pg
        n = 0
        for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
            enter(pg, mode, s)
            for tid, expr in STATE.get(mode, {}).items():
                sel = f'.rail .rb[data-rt={tid}]' if tid != 'edit' else '.rail #rb-edit'
                assert vis(pg, sel), f'{mode}/{tid} not visible'
                a = pg.evaluate(expr)
                if mode == 'edit' and tid in DRAWER:
                    assert a is None, f'{mode}/{tid}: drawer should start closed ({a})'
                pg.click(sel)
                pg.wait_for_timeout(260)
                b = pg.evaluate(expr)
                assert a != b, f'{mode}/{tid}: target state did not change ({a})'
                pr = pg.get_attribute(sel, 'aria-pressed')
                assert pr in ('true', 'false'), f'{mode}/{tid}: aria-pressed={pr}'
                if isinstance(b, str) and b in ('params', 'presets', 'special', 'grid', 'ref', 'ot', 'lang', 'up', 'opt', 'pv', 'lg', 'con', 'spk', 'recs'):
                    assert pr == 'true', f'{mode}/{tid}: pressed while its section is shown ({pr})'
                    dr = {'edit': '#pcard', 'draw': '#dr-side', 'import': '#imp-side'}[mode]
                    assert vis(pg, dr), f'{mode}/{tid}: drawer not visible'
                    assert pg.evaluate("d=>{const e=document.querySelector(d);return [...e.querySelectorAll('.dw-vis')].some(k=>k.getBoundingClientRect().height>0)}", dr), f'{mode}/{tid}: no visible section content'
                    assert pg.evaluate("d=>document.querySelector(d+' .dw-t').textContent.trim().length>0", dr), f'{mode}/{tid}: drawer title empty'
                pg.click(sel)
                pg.wait_for_timeout(260)
                assert pg.evaluate(expr) == a, f'{mode}/{tid}: second click did not restore'
                n += 1
            for tid, (target, focus) in GO.get(mode, {}).items():
                pg.click(f'.rail .rb[data-rt={tid}]')
                pg.wait_for_timeout(700)
                ok = pg.evaluate("t=>{const r=document.querySelector(t).getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}", target)
                assert ok, f'{mode}/{tid}: target {target} not on screen'
                if focus:
                    assert pg.evaluate("document.activeElement&&document.activeElement.id") == focus, f'{mode}/{tid}: focus not on {focus}'
                n += 1
        # edit: the settings button and the second state of pressed
        enter(pg, 'edit', s)
        assert pg.get_attribute('#rb-edit', 'aria-pressed') == 'false'
        # drawer: close button and Esc close it; a second tool switches the section; no settings column left in the layout
        pg.click('#rb-edit'); pg.wait_for_timeout(260)
        assert vis(pg, '#pcard') and vis(pg, '#p-q')
        pg.click('#pcard .dw-x'); pg.wait_for_timeout(300)
        assert pg.evaluate("dwSec('edit')") is None and not vis(pg, '#pcard')
        pg.click('.rail .rb[data-rt=lang]'); pg.wait_for_timeout(260)
        pg.click('.rail .rb[data-rt=grid]'); pg.wait_for_timeout(260)
        assert pg.evaluate("dwSec('edit')") == 'grid' and vis(pg, '#addv') and not vis(pg, '#ps-lang')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        assert pg.evaluate("dwSec('edit')") is None, 'Esc did not close the drawer'
        g = pg.evaluate("(()=>{const r=document.querySelector('#gcard').getBoundingClientRect(),s=document.querySelector('#stagebox').getBoundingClientRect();return r.left>s.right-2})()")
        assert g, 'glyph column must sit right of the canvas'
        # keyboard: Enter on a focused tool toggles its target
        pg.focus('.rail .rb[data-rt=presets]')
        a = pg.evaluate("dwSec('edit')")
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(250)
        assert pg.evaluate("dwSec('edit')") != a, 'Enter on a rail tool did nothing'
        pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
        # proof / kern: the editor button leads back to the editor
        for mode in ('proof', 'kern'):
            enter(pg, mode, s)
            pg.click('#rb-edit')
            pg.wait_for_function("S.tab==='edit'", timeout=5000)
        # home leads out of every work mode
        for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
            enter(pg, mode, s)
            pg.click('.rail [data-tab=home]')
            pg.wait_for_function("S.tab==='home'", timeout=5000)
            pg.evaluate("document.body.classList.contains('imp-open')&&iuClose()")
        assert not s.errs, s.errs[:3]
        return f'{n} tools flip their targets and restore; edit/home buttons lead out; Enter works'
    finally:
        s.close()


def removed_reachable(p):
    s = Session(p, 'rail_moved')
    try:
        pg = s.pg
        for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
            enter(pg, mode, s)
            assert pg.evaluate("!document.querySelector('.rail #settings') && !!document.querySelector('#helpc #theme-btn')"), f'{mode}: project/theme still in the rail (theme must sit in the «?» popover)'
            assert vis(pg, '#settings'), f'{mode}: project button hidden'
            assert pg.evaluate("!document.querySelector('#settings').closest('.rail')")
            pg.click('#settings')
            pg.wait_for_selector('#projpop', state='visible', timeout=5000)
            assert vis(pg, '#pj-s') and vis(pg, '#pj-l'), f'{mode}: save/open missing in the project menu'
            pg.keyboard.press('Escape')
            pg.wait_for_selector('#projpop', state='hidden', timeout=3000)
            # theme: «?» popover
            th0 = pg.evaluate("document.documentElement.dataset.theme")
            pg.click('#help')
            pg.wait_for_selector('#helpc', state='visible', timeout=5000)
            assert vis(pg, '#theme-btn'), f'{mode}: theme toggle missing in the help popover'
            pg.click('#theme-btn')
            pg.wait_for_timeout(200)
            assert pg.evaluate("document.documentElement.dataset.theme") != th0, f'{mode}: theme did not change'
            pg.click('#theme-btn')
            assert pg.evaluate("document.documentElement.dataset.theme") == th0
            pg.evaluate("helpToggle(false)")
        # library pages keep project + theme in the rail
        enter(pg, 'library', s)
        assert pg.evaluate("!!document.querySelector('.rail #settings') && !!document.querySelector('.rail #theme-btn')")
        # project round trip survives the move: «Сохранить» still works in the top bar
        enter(pg, 'edit', s)
        pg.click('#settings')
        with pg.expect_download(timeout=20000):
            pg.click('#pj-s')
        assert not s.errs, s.errs[:3]
        return 'project save/open in the work-mode top bar, theme in «?», both back in the rail on library pages'
    finally:
        s.close()


def phone(p):
    s = Session(p, 'rail_phone')
    try:
        pg = s.pg
        pg.set_viewport_size({'width': 390, 'height': 844})
        for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
            enter(pg, mode, s)
            keys = pg.evaluate(KEYS)
            assert 3 <= len(keys) <= 6, f'{mode}: {keys}'
            assert keys[0] == 'home' and keys[-1] == 'more', f'{mode}: {keys}'
            fit = pg.evaluate("()=>[...document.querySelectorAll('.rail .rb')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden').every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.width>=36})")
            assert fit, f'{mode}: bar items outside the viewport / too small'
            assert pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"), f'{mode}: horizontal overflow'
            pg.click('#rail-more-btn')
            pg.wait_for_selector('#rail-more', state='visible', timeout=3000)
            assert pg.get_attribute('#rail-more-btn', 'aria-expanded') == 'true'
            items = pg.evaluate("[...document.querySelectorAll('#rail-more .rm-item')].map(b=>b.dataset.rt)")
            assert 'proj-more' in items and 'help-more' in items, items
            # overflow = the contextual tools that did not fit + project + help
            want_total = len(SETS[mode]) - 1  # minus home... help lives in «Ещё»
            shown = [k for k in keys if k not in ('home', 'more')]
            assert len(shown) + len([i for i in items if i not in ('proj-more', 'help-more')]) == len([k for k in SETS[mode] if k not in ('home', 'help', 'library', 'fav', 'rail-profile')])   # D5: library/fav/profile are desktop-rail items; the phone bar keeps home + tools + «Ещё», (mode, keys, items)
            pg.click('#rail-more .rm-item[data-rt=proj-more]')
            pg.wait_for_selector('#projpop', state='visible', timeout=3000)
            assert vis(pg, '#pj-s')
            pg.keyboard.press('Escape')
            pg.click('#rail-more-btn')
            pg.click('#rail-more .rm-item[data-rt=help-more]')
            pg.wait_for_selector('#helpc', state='visible', timeout=3000)
            assert vis(pg, '#theme-btn'), f'{mode}: theme unreachable on phone'
            pg.evaluate("helpToggle(false)")
            if items[:-2]:  # an overflow tool works from the menu
                tid = items[0]
                pg.click('#rail-more-btn')
                pg.click(f'#rail-more .rm-item[data-rt={tid}]')
                pg.wait_for_selector('#rail-more', state='hidden', timeout=3000)
        assert not s.errs, s.errs[:3]
        return 'phone bar <=6 items with «Ещё» (rest tools, Проект, Подсказки и тема) in all work modes'
    finally:
        s.close()


def responsive(p):
    """390x844: drawer is a bottom sheet (full width, sits above the bar, never under it); 768x1024: vertical rail, drawer starts right of the rail; both themes;
    every work mode: bar items fit and are >= 40px, no horizontal page scroll."""
    s = Session(p, 'rail_resp')
    try:
        pg = s.pg
        for th in ('light', 'dark'):
            pg.emulate_media(color_scheme=th)
            pg.evaluate(f"document.documentElement.dataset.theme='{th}'")
            pg.set_viewport_size({'width': 390, 'height': 844})
            for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
                enter(pg, mode, s)
                bar = pg.evaluate("(()=>{const r=document.querySelector('.rail').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
                assert bar[3] > 780 and bar[0] >= 0 and bar[2] <= 390, (th, mode, 'bar not at the bottom', bar)
                small = pg.evaluate("[...document.querySelectorAll('.rail .rb')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden').map(b=>{const r=b.getBoundingClientRect();return [b.dataset.rt||b.dataset.tab||b.id,Math.round(r.width),Math.round(r.height)]}).filter(x=>x[1]<40||x[2]<40)")
                assert not small, (th, mode, 'bar items under 40px', small)
                assert pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"), (th, mode, 'horizontal scroll')
            for mode, tool in (('edit', 'edit'), ('draw', 'grid'), ('import', 'opt')):
                enter(pg, mode, s)
                pg.evaluate(f"dwOpen('{mode}', '{ {'edit': 'params', 'draw': 'grid', 'import': 'opt'}[mode] }')")
                pg.wait_for_timeout(450)
                d = pg.evaluate("(()=>{const e=document.querySelector('.dw[data-open=\"1\"]');if(!e)return null;const r=e.getBoundingClientRect(),b=document.querySelector('.rail').getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,h:r.height,barTop:b.top}})()")
                assert d, (th, mode, 'drawer did not open')
                assert d['l'] <= 16 and d['r'] >= 374, (th, mode, 'drawer is not a full-width sheet', d)
                assert d['b'] <= d['barTop'] + 12 and d['h'] >= 200 and d['t'] >= 0, (th, mode, 'drawer is not a bottom sheet above the bar', d)
                pg.evaluate(f"dwClose('{mode}')")
            pg.set_viewport_size({'width': 768, 'height': 1024})
            pg.wait_for_timeout(300)
            for mode in ('edit', 'proof', 'kern', 'draw', 'import'):
                enter(pg, mode, s)
                bar = pg.evaluate("(()=>{const r=document.querySelector('.rail').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth]})()")
                assert bar[2] < 130 and bar[3] <= 1024, (th, mode, 'tablet rail is not a vertical strip', bar)
                assert pg.evaluate("document.documentElement.scrollWidth<=document.documentElement.clientWidth"), (th, mode, 'tablet horizontal scroll')
                small = pg.evaluate("[...document.querySelectorAll('.rail .rb')].filter(b=>b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden').filter(b=>{const r=b.getBoundingClientRect();return r.width<40||r.height<40||r.right>innerWidth||r.bottom>innerHeight}).map(b=>b.dataset.rt||b.dataset.tab||b.id)")
                assert not small, (th, mode, 'tablet rail items too small / outside', small)
            enter(pg, 'edit', s)
            pg.evaluate("dwOpen('edit','params')"); pg.wait_for_timeout(450)
            d = pg.evaluate("(()=>{const e=document.querySelector('.dw[data-open=\"1\"]');const r=e.getBoundingClientRect(),b=document.querySelector('.rail').getBoundingClientRect();return [r.left,b.right,r.right,r.bottom]})()")
            assert d[0] >= d[1] - 1 and d[2] <= 768 and d[3] <= 1024, (th, 'tablet drawer overlaps the rail or leaves the screen', d)
            pg.evaluate("dwClose('edit')")
            pg.set_viewport_size({'width': 390, 'height': 844})
        assert not s.errs, s.errs[:3]
        return 'phone 390: bottom bar + bottom-sheet drawers, tablet 768: vertical rail + drawer right of it, both themes'
    finally:
        s.close()


def tooltips(p):
    """Desktop rail = plain icon buttons: hover or keyboard focus shows the small tooltip (::after) next to the button, the rail never widens,
    every button has an accessible name equal to its tooltip, and the tooltip stays inside the viewport (measured with the real font)."""
    s = Session(p, 'rail_tips')
    try:
        pg = s.pg
        VIS = "b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(b).visibility!=='hidden'}"
        TIP = """b=>{const a=getComputedStyle(b,'::after'),c=document.createElement('canvas').getContext('2d');c.font=a.font;
          const w=c.measureText(b.dataset.tip).width+parseFloat(a.paddingLeft)+parseFloat(a.paddingRight),r=b.getBoundingClientRect();
          return {op:+a.opacity,content:a.content,right:r.right+16+w,bottom:r.top+r.height/2+parseFloat(a.fontSize)/2+parseFloat(a.paddingTop),top:r.top+r.height/2-parseFloat(a.fontSize)/2-parseFloat(a.paddingTop),iw:innerWidth,ih:innerHeight}}"""
        for th in ('light', 'dark'):
            pg.evaluate(f"document.documentElement.dataset.theme='{th}'")
            for mode in ('home', 'edit', 'draw'):
                enter(pg, mode, s); pg.evaluate('document.activeElement&&document.activeElement.blur()')
                assert pg.evaluate("!document.querySelector('#rail').dataset.x && !document.querySelector('#rail').hasAttribute('data-x')"), (mode, 'rail has an expanded state')
                btns = pg.evaluate("[...document.querySelectorAll('.rail .rb')].filter(" + VIS + ").map(b=>b.id||b.dataset.tab||b.dataset.rt)")
                assert btns, mode
                w0 = pg.evaluate("[...document.querySelectorAll('.rail .rpill')].filter(p=>p.getBoundingClientRect().width>0).map(p=>Math.round(p.getBoundingClientRect().width))")
                for k in btns:
                    sel = f'.rail .rb[data-tab={k}]' if k in ('home', 'library', 'fav') else (f'.rail #{k}' if pg.evaluate(f"!!document.querySelector('.rail #{k}')") else f'.rail .rb[data-rt={k}]')
                    nm = pg.evaluate("s=>{const b=document.querySelector(s);return [b.tagName,(b.getAttribute('aria-label')||'').trim(),b.dataset.tip||'']}", sel)
                    assert nm[0] == 'BUTTON' and nm[1] and nm[2], (mode, k, nm)
                    pg.mouse.move(5, 5); pg.wait_for_timeout(250)
                    assert pg.evaluate("s=>getComputedStyle(document.querySelector(s),'::after').opacity", sel) == '0', (mode, k, 'tooltip visible without hover')
                    pg.hover(sel); pg.wait_for_timeout(500)
                    t = pg.evaluate(f"s=>({TIP})(document.querySelector(s))", sel)
                    assert t['op'] == 1 and t['content'] not in ('none', 'normal'), (th, mode, k, 'no tooltip on hover', t)
                    assert t['right'] <= t['iw'] - 8 and t['top'] >= 0 and t['bottom'] <= t['ih'], (th, mode, k, 'tooltip crosses the viewport', t)
                    assert pg.evaluate("[...document.querySelectorAll('.rail .rpill')].filter(p=>p.getBoundingClientRect().width>0).map(p=>Math.round(p.getBoundingClientRect().width))") == w0, (mode, k, 'rail widened on hover')
                    assert not pg.evaluate("document.querySelector('#rail').hasAttribute('data-x')"), (mode, k, 'rail expanded on hover')
                pg.mouse.move(5, 5)
                # keyboard focus shows the tooltip too
                pg.keyboard.press('Shift'); pg.focus('.rail .rb[data-tab=home]'); pg.keyboard.press('Tab'); pg.wait_for_timeout(500)
                fo = pg.evaluate(f"()=>{{const b=document.activeElement;return b&&b.matches('.rail .rb')&&b.matches(':focus-visible')?({TIP})(b):null}}")
                assert fo and fo['op'] == 1, (mode, 'no tooltip on keyboard focus', fo)
        assert not s.errs, s.errs[:3]
        return 'rail buttons: aria-label = tooltip, tooltip on hover/keyboard focus inside the viewport, rail never widens (light+dark, home/edit/draw)'
    finally:
        s.close()


if __name__ == '__main__':
    t0 = time.time()
    rc = 0
    with sync_playwright() as p:
        res = []
        for name, fn in (('sets', sets_and_gaps), ('tools', tools_work), ('moved', removed_reachable), ('phone', phone), ('responsive', responsive), ('tooltips', tooltips)):
            try:
                res.append(name + ': ' + fn(p))
            except Exception as e:  # noqa
                res.append(f'FAILED {name}: {type(e).__name__}: {str(e)[:260]}')
                rc = 1
    print(('PASS' if rc == 0 else 'FAIL') + ' rail ' + ' | '.join(res) + f' t={time.time()-t0:.1f}s')
    sys.exit(rc)
