"""Hero of the home page and library header (HERO50): headline fonts, circles, search width = headline block width, rotating subline
(rotation, pause on hover / focus / hidden tab / other view / tour, no layout shift, reduced motion), library count and Russian plural,
phone layout, no console errors. Google Fonts are served by tests/gfonts.py (route intercept). One PASS/FAIL line.
usage: python3 tests/e2e_hero.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import gfonts

URL = 'file://' + PAGE


def new(p, q='?motion=1', vp=None, rm=False, theme=None):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    ctx = b.new_context(viewport=vp or {'width': 1440, 'height': 900}, reduced_motion='reduce' if rm else 'no-preference')
    gfonts.install(ctx)
    ctx.add_init_script(TOUR_OFF + (f"try{{localStorage.setItem('gtype-theme-v1','{theme}')}}catch(e){{}}" if theme else ''))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto(URL + q)
    pg.wait_for_function("typeof S!=='undefined'&&window.TIPS&&TIPS.list().length===2&&!!document.querySelector('.hx-h')", timeout=30000)
    pg.evaluate("document.fonts.ready")
    pg.wait_for_function("document.fonts.check('800 40px Onest')&&document.fonts.check('italic 650 40px \"Playfair Display\"')", timeout=15000)
    return b, pg, errs


GEOM = """(sel)=>{const h=document.querySelector(sel+' .hx-h').getBoundingClientRect(),lines=[...document.querySelectorAll(sel+' .hx-h .ln')].map(l=>l.getBoundingClientRect()),
 s=(document.querySelector(sel+' .lt-row')||document.querySelector(sel+' .srch')).getBoundingClientRect(),w=document.querySelector(sel+' .hx-in').getBoundingClientRect();
 return {h:[h.left,h.width],s:[s.left,s.width],w:[w.left,w.width],lw:Math.max(...lines.map(l=>l.width)),n:lines.length,sw:document.documentElement.scrollWidth,iw:innerWidth}}"""


def t_fonts_layout(p):
    b, pg, errs = new(p)
    try:
        fam = pg.evaluate("(()=>{const k=document.querySelector('#view-lib .hx-h .k'),c=getComputedStyle(k);return [c.fontFamily,c.fontStyle,c.fontWeight,getComputedStyle(document.querySelector('#view-lib .hx-h')).fontWeight,getComputedStyle(document.querySelector('#view-lib .hx-h')).fontFamily]})()")
        assert fam[0].startswith('"Playfair Display"') and 'Georgia' in fam[0] and fam[1] == 'italic' and fam[2] == '650' and fam[3] == '800' and 'Onest' in fam[4], fam
        txt = pg.evaluate("[...document.querySelectorAll('#view-lib .hx-h .ln')].map(l=>l.textContent.replace(/\\s+/g,' ').trim())")
        assert txt == ['Создать свой шрифт', 'легко — ', 'вместе с G-type'] or txt == ['Создать свой шрифт', 'легко —', 'вместе с G-type'], txt
        zw = pg.evaluate("[...document.querySelectorAll('#view-lib .hx-h .ln')].map(l=>getComputedStyle(l,'::before').content)")
        assert all(c.replace('"', '') == '\u200b' for c in zw), ('zero-width-space anchor missing', zw)  # quirks-mode fix: every line keeps its height
        g = pg.evaluate(GEOM, '#view-lib')
        assert g['n'] == 3 and abs(g['s'][1] - g['h'][1]) <= 2 and abs(g['s'][0] - g['h'][0]) <= 2, g
        acc = pg.evaluate("(()=>{const a=getComputedStyle(document.querySelector('#view-lib .hx-h .k.a')).color,t=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();const d=document.createElement('i');d.style.color=t;document.body.appendChild(d);const r=getComputedStyle(d).color;d.remove();return [a,r]})()")
        assert acc[0] != acc[1], ('FX80 F5: hero G-type is neutral ink, not accent', acc)
        circ = pg.evaluate("[...document.querySelectorAll('#view-lib .hx-h .cl i')].map(i=>{const c=getComputedStyle(i);return [c.backgroundColor,c.color,c.boxShadow.includes('rgb')]})")
        assert len(circ) == 3 and circ[0][0] == 'rgb(252, 71, 60)' and circ[2][0] == 'rgb(255, 196, 182)' and circ[0][1] == 'rgb(255, 255, 255)' and all(c[2] for c in circ), circ
        # tablet
        pg.set_viewport_size({'width': 1024, 'height': 768}); pg.wait_for_timeout(200)
        g = pg.evaluate(GEOM, '#view-lib'); assert abs(g['s'][1] - g['h'][1]) <= 2 and g['sw'] <= g['iw'], g
        # no literal colours in the hero rules
        lit = pg.evaluate("""(()=>{const bad=[];for(const ss of document.styleSheets){let rs;try{rs=ss.cssRules}catch(e){continue}for(const r of rs){const t=r.cssText||'';if(/\\.(hx-|hero\\.hx|tip)/.test(r.selectorText||'')&&/#[0-9a-fA-F]{3,6}\\b|rgba?\\(/.test(t.replace(/var\\([^)]*\\)/g,'')))bad.push(r.selectorText)}}return bad})()""")
        assert not lit, ('literal colours', lit)
        assert not errs, errs
        return f"fonts Onest 800 + Playfair Italic 650, 3 lines, search {g['s'][1]:.0f}=block {g['h'][1]:.0f}, circles tokens"
    finally:
        b.close()


def t_dark(p):
    b, pg, errs = new(p, theme='dark')
    try:
        circ = pg.evaluate("[...document.querySelectorAll('#view-lib .hx-h .cl i')].map(i=>{const c=getComputedStyle(i);return [c.backgroundColor,c.color]})")
        assert circ[0][0] == 'rgb(252, 71, 60)' and circ[1][0] == 'rgb(242, 242, 244)' and circ[1][1] == 'rgb(11, 11, 12)' and circ[2][0] == 'rgb(247, 179, 163)', circ
        ring = pg.evaluate("[getComputedStyle(document.querySelector('#view-lib .cl i')).boxShadow,getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()]")
        assert '15, 15, 17' in ring[0], ring
        assert not errs, errs
        return 'dark circles: accent, light ink, peach; ring = page bg'
    finally:
        b.close()


def t_rotation(p):
    b, pg, errs = new(p)
    try:
        box = "document.querySelector('#view-lib .rtip')"
        pg.evaluate("TIPS.gap=700;TIPS.reset()")
        n = pg.evaluate(f"TIPS.state({box}).count"); assert n == 10, n
        seen = []
        shifts = []
        base = None
        for _ in range(60):
            s = pg.evaluate(f"""(()=>{{const t={box},st=TIPS.state(t),r=t.getBoundingClientRect(),h=document.querySelector('#view-lib .hx-h').getBoundingClientRect(),f=document.querySelector('#home-search').getBoundingClientRect();
              return [st.idx,st.text,[r.top,r.height,r.width,h.top,h.width,f.top,f.width,f.height]]}})()""")
            if s[1] not in [x[1] for x in seen]: seen.append(s)
            if base is None: base = s[2]
            if any(abs(a - c) > 0.5 for a, c in zip(s[2], base)): shifts.append((s[0], s[2], base))
            pg.wait_for_timeout(120)
            if len(seen) >= 5 and any(x[0] == 4 for x in seen): break
        assert len(seen) >= 4, ('subline does not rotate', [x[:2] for x in seen])
        assert not shifts, ('layout shift during rotation', shifts[:2])
        assert seen[0][1].startswith('Возьмите готовый шрифт'), seen[0][1]
        # long phrases fit on the block width (no ellipsis, no overflow)
        # accent word and word spans
        k = pg.evaluate(f"[...{box}.querySelectorAll('.rtip-i')].map(i=>i.querySelectorAll('.rtip-w.k').length)")
        assert all(c >= 0 for c in k) and sum(1 for c in k if c) == 9, k
        # a11y: running line hidden from AT, full list present, no live region
        a = pg.evaluate(f"(()=>{{const t={box};return [t.querySelector('.rtip-v').getAttribute('aria-hidden'),t.querySelectorAll('ul.vh li').length,!!t.closest('[aria-live]'),t.hasAttribute('aria-live'),t.querySelector('.rtip-v').hasAttribute('aria-live')]}})()")
        assert a == ['true', 10, False, False, False], a
        # every phrase <= 70 chars, no exclamation marks
        msgs = pg.evaluate("[].concat(TIPS.msgs.home,TIPS.msgs.lib).map(m=>m.replace(/\\*/g,''))")
        assert all(len(m) <= 70 and '!' not in m for m in msgs), [m for m in msgs if len(m) > 70 or '!' in m]
        assert not errs, errs
        return f"rotates ({len(seen)} phrases seen), no layout shift, aria-hidden + sr list, {len(msgs)} phrases <=70 chars"
    finally:
        b.close()


def t_pauses(p):
    b, pg, errs = new(p)
    try:
        box = "document.querySelector('#view-lib .rtip')"
        idx = lambda: pg.evaluate(f"TIPS.state({box}).idx")
        pg.evaluate("TIPS.gap=600;TIPS.reset()")
        # hover pauses
        pg.hover('#view-lib .rtip'); pg.wait_for_timeout(300)
        i0 = idx(); assert 'hover' in pg.evaluate(f"TIPS.state({box}).paused")
        pg.wait_for_timeout(2400); assert idx() == i0, 'moved while hovered'
        pg.mouse.move(5, 5); pg.wait_for_function(f"TIPS.state({box}).idx!=={i0}", timeout=8000)
        # focus in the search pauses
        pg.focus('#home-q'); pg.wait_for_timeout(300); i1 = idx(); assert 'focus' in pg.evaluate(f"TIPS.state({box}).paused")
        pg.wait_for_timeout(2000); assert idx() == i1, 'moved while the search has focus'
        pg.evaluate("document.activeElement.blur()"); pg.wait_for_function(f"TIPS.state({box}).idx!=={i1}", timeout=8000)
        # hidden tab pauses
        pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})"); pg.wait_for_timeout(300); i2 = idx()
        assert 'hidden' in pg.evaluate(f"TIPS.state({box}).paused")
        pg.wait_for_timeout(2000); assert idx() == i2, 'moved in a hidden tab'
        pg.evaluate("delete document.hidden"); pg.wait_for_function(f"TIPS.state({box}).idx!=={i2}", timeout=8000)
        # another view: home pauses, library header runs
        pg.evaluate("setTab('library')")
        lb = "document.querySelector('#view-library .rtip')"
        pg.wait_for_function(f"TIPS.state({box}).paused.includes('offscreen')", timeout=5000)  # after the view-exit animation
        i3 = idx(); l0 = pg.evaluate(f"TIPS.state({lb}).idx")
        pg.wait_for_function(f"TIPS.state({lb}).idx!=={l0}", timeout=8000)
        assert idx() == i3, 'home moved while hidden'
        pg.evaluate("setTab('home')"); pg.wait_for_timeout(500)
        # scrolled away: hero out of view
        pg.evaluate("(()=>{const v=document.querySelector('#view-lib');v.scrollTop=1e5;window.scrollTo(0,1e5)})()"); pg.wait_for_timeout(500)
        out = pg.evaluate(f"({box}).getBoundingClientRect().bottom<0")
        if out:
            assert 'offscreen' in pg.evaluate(f"TIPS.state({box}).paused")
        pg.evaluate("(()=>{const v=document.querySelector('#view-lib');v.scrollTop=0;window.scrollTo(0,0)})()"); pg.wait_for_timeout(500)
        # tour pauses
        pg.evaluate("TOUR.run('welcome',{force:true})"); pg.wait_for_function("TOUR.active()==='welcome'", timeout=8000); pg.wait_for_timeout(300)
        assert 'tour' in pg.evaluate(f"TIPS.state({box}).paused")
        i4 = idx(); pg.wait_for_timeout(2000); assert idx() == i4, 'moved during the tour'
        pg.keyboard.press('Escape'); pg.wait_for_function("!TOUR.active()"); pg.wait_for_function(f"TIPS.state({box}).idx!=={i4}", timeout=8000)
        assert not errs, errs
        return 'pauses: hover, focus, hidden tab, other view, tour; resumes after each'
    finally:
        b.close()


def t_reduced(p):
    b, pg, errs = new(p, q='', rm=True)
    try:
        pg.evaluate("TIPS.gap=400")
        pg.wait_for_timeout(2500)
        st = pg.evaluate("TIPS.state(document.querySelector('#view-lib .rtip'))")
        assert st['idx'] == 0 and 'reduced-motion' in st['paused'], st
        assert pg.evaluate("[...document.querySelectorAll('#view-lib .rtip-i.is-out,#view-lib .rtip-i.is-in')].length") == 0
        assert pg.evaluate("document.querySelectorAll('#view-lib .rtip ul.vh li').length") == 10
        assert not errs, errs
        return 'reduced motion: first phrase stays, full list kept for screen readers'
    finally:
        b.close()


def t_library(p):
    b, pg, errs = new(p)
    try:
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(600)
        pg.wait_for_function("[...document.querySelectorAll('#view-library .cl canvas')].every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4==3&&v>40))", timeout=8000)
        n = pg.evaluate("libIds().length")
        t = pg.evaluate("document.querySelector('#view-library .hx-h').textContent.replace(/\\s+/g,' ').trim()")
        assert t.endswith(f'среди {n} шрифтов') or (n % 10 == 1 and n % 100 != 11 and t.endswith(f'среди {n} шрифта')), (n, t)
        col = pg.evaluate("[getComputedStyle(document.querySelector('#lib-n')).color,getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()]")
        assert col[0] != 'rgb(252, 71, 60)', col   # FX80 F5: hero count is ink, not accent
        pl = pg.evaluate("""(()=>{const o=libIds,r={};for(const k of [1,2,5,11,12,15,21,22,25,101,111]){window.libIds=()=>new Array(k);libHeadCount();r[k]=document.getElementById('lib-nw').textContent}window.libIds=o;libHeadCount();return r})()""")
        exp = {1: 'шрифта', 2: 'шрифтов', 5: 'шрифтов', 11: 'шрифтов', 12: 'шрифтов', 15: 'шрифтов', 21: 'шрифта', 22: 'шрифтов', 25: 'шрифтов', 101: 'шрифта', 111: 'шрифтов'}
        assert {int(k): v for k, v in pl.items()} == exp, pl
        # circles hold three canvases drawn in three library fonts, sizes sane
        cv = pg.evaluate("[...document.querySelectorAll('#view-library .cl canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>40)n++;return [c.dataset.font,c.dataset.sty||'',n,c.width*c.height]})")
        assert [c[0] for c in cv] == ['renessa', 'stsepka', 'propis'] and all(0.03 < c[2] / c[3] < 0.5 for c in cv), cv
        g = pg.evaluate(GEOM, '#view-library')
        assert abs(g['s'][1] - g['h'][1]) <= 2 and abs(g['s'][0] - g['h'][0]) <= 2, g
        # tiles and «Все шрифты» follow
        assert pg.evaluate("document.querySelectorAll('#lib-tags .tile').length>0&&!!document.getElementById('lib-count')")
        assert not errs, errs
        return f'«среди {n} шрифтов», plural ok (1,2,5,11,12,15,21,22,25,101,111), 3 font circles, search = block {g["s"][1]:.0f}'
    finally:
        b.close()


def t_phone(p):
    b, pg, errs = new(p, vp={'width': 390, 'height': 844})
    try:
        g = pg.evaluate(GEOM, '#view-lib')
        assert g['sw'] <= g['iw'], ('horizontal scroll', g)
        assert abs(g['s'][1] - g['w'][1]) <= 2 and g['s'][1] >= g['iw'] - 40, ('search not full width', g)
        assert g['h'][0] >= 0 and g['h'][0] + g['h'][1] <= g['iw'], ('headline clipped', g)
        # the circles shrink with the headline, rows wrap
        fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#view-lib .hx-h')).fontSize)")
        assert fs <= 52, fs
        # reserved tip height covers the tallest phrase
        hs = pg.evaluate("[...document.querySelectorAll('#view-lib .rtip-i')].map(i=>i.getBoundingClientRect().height)")
        th = pg.evaluate("document.querySelector('#view-lib .rtip-v').getBoundingClientRect().height")
        assert th >= max(hs) - 1, (th, hs)
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(600)
        g = pg.evaluate(GEOM, '#view-library')
        assert g['sw'] <= g['iw'] and abs(g['s'][1] - g['w'][1]) <= 2, g
        assert not errs, errs
        return f"phone 390: no overflow, search {g['s'][1]:.0f} = block, headline {fs:.0f}px, tip height reserved {th:.0f}px"
    finally:
        b.close()


if __name__ == '__main__':
    sys.exit(check_all([('hero_fonts_layout', t_fonts_layout), ('hero_dark', t_dark), ('hero_rotation', t_rotation), ('hero_pauses', t_pauses),
                        ('hero_reduced', t_reduced), ('hero_library', t_library), ('hero_phone', t_phone)]))
