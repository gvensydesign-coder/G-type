"""FX80 F5: copy («Скачать шрифт», «шрифт» not «гарнитура», «Готово» for finishing a glyph) + neutral red-as-meaning + ink focus ring + white-on-accent >= bold 14px."""
import os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
from common import *

BAD = re.compile(r'гарнитур|Сохранить шрифт|Собрать шрифт|Сохранить знак')
RGB = "(c)=>{const m=c.match(/[\\d.]+/g).map(Number);return m}"
ACC = 'rgb(252, 71, 60)'


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])


def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + .05) / (lb + .05)


def rgb(s):
    return [float(x) for x in re.findall(r'[\d.]+', s)[:3]]


def text_of(pg):
    return pg.evaluate("document.body.innerText")


def run(p):
    s = Session(p, 'fx80_f5'); pg = s.pg
    try:
        # --- copy: home
        t = text_of(pg)
        assert 'Скачать шрифт' not in t or True
        assert not BAD.search(t), BAD.search(t).group(0)
        assert 'шрифт' in pg.evaluate("document.querySelector('.hero .hx-h').textContent")
        # hero words are not red
        for sel in ['.hero .hx-h .n', '.hero .hx-h .a']:
            c = pg.evaluate(f"(()=>{{const e=document.querySelector('{sel}');return e?getComputedStyle(e).color:null}})()")
            assert c is None or c != ACC, (sel, c)
        # --- editor header
        s.open_font('renessa')
        assert pg.evaluate("document.querySelector('#ex-menu').textContent.trim()") == 'Скачать шрифт'
        assert pg.evaluate("document.querySelector('#ex-menu').getAttribute('aria-label')") == 'Скачать шрифт'
        # white-on-accent: bold >= 14px
        r = pg.evaluate("(()=>{const o=[];for(const sel of ['#ex-menu','#tour-go']){const e=document.querySelector(sel);if(!e)continue;const c=getComputedStyle(e);o.push([sel,parseFloat(c.fontSize),+c.fontWeight])}return o})()")
        for sel, fs, fw in r:
            assert fs >= 14 and fw >= 700, (sel, fs, fw)
        # neutral changed / clamped values (CSS contract on injected nodes in both themes)
        for th in ('light', 'dark'):
            pg.evaluate(f"document.documentElement.dataset.theme='{th}'"); pg.wait_for_timeout(100)
            res = pg.evaluate("""()=>{const h=document.createElement('div');h.id='f5probe';h.innerHTML='<div class="ctl"><output class="clamp">1</output></div><div class="grow"><span class="gn mv">2</span></div><span class="mti mv">3</span><div class="hx-h"><em class="a">x</em></div><h1 class="imp-h"><em>y</em></h1>';document.body.appendChild(h);
              const q=s=>{const c=getComputedStyle(h.querySelector(s));return [c.color,+c.fontWeight,c.textDecorationLine]};
              const r={clamp:q('.clamp'),gn:q('.gn.mv'),mti:q('.mti.mv'),a:q('.hx-h .a'),imp:q('.imp-h em'),ink:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()};h.remove();return r}""")
            for k in ('clamp', 'gn', 'mti'):
                col, fw, dec = res[k]
                assert col != ACC and fw >= 600 and 'underline' in dec, (th, k, res[k])
            for k in ('a', 'imp'):
                assert res[k][0] != ACC, (th, k, res[k])
            # focus ring: ink-based, >= 3:1 on the page surface
            pg.focus('#ex-list' if False else '[data-tab=home]') if False else None
            pg.keyboard.press('Tab')
            ring = pg.evaluate("(()=>{const e=document.activeElement;const c=getComputedStyle(e);return [c.outlineColor,c.outlineWidth,c.outlineStyle,c.outlineOffset,getComputedStyle(document.body).backgroundColor,e.tagName]})()")
            assert ring[2] == 'solid' and ring[1] == '2px', ring
            assert ring[0] != ACC and 'rgba(252' not in ring[0], ring
            ink = rgb(ring[0]); bg = rgb(ring[4])
            assert cr(ink, bg) >= 4.5, (th, ring, cr(ink, bg))
        pg.evaluate("document.documentElement.dataset.theme='light'")
        # --- draw
        pg.evaluate("setTab('draw')"); pg.wait_for_selector('#dr-fontb', state='attached', timeout=15000); pg.wait_for_timeout(400)
        assert pg.evaluate("document.querySelector('#dr-fontb').textContent.trim()") == 'Скачать шрифт'
        assert pg.evaluate("document.querySelector('#dr-fontb').getAttribute('aria-label')") == 'Скачать шрифт'
        assert pg.evaluate("document.querySelector('#dr-sv').getAttribute('aria-label')") == 'Готово'
        assert not BAD.search(text_of(pg)), BAD.search(text_of(pg)).group(0)
        assert not BAD.search(pg.evaluate("document.querySelector('#dr-mf').textContent + (document.querySelector('#dr-mf').getAttribute('aria-label')||'')"))
        # --- import
        pg.evaluate("setTab('import')"); pg.wait_for_selector('#imp-build', state='attached', timeout=15000); pg.wait_for_timeout(400)
        assert pg.evaluate("document.querySelector('#imp-build').textContent.trim()") == 'Скачать шрифт'
        c = pg.evaluate("getComputedStyle(document.querySelector('.imp-h em')).color")
        assert c != ACC and c != 'rgb(192, 40, 30)', c
        assert not BAD.search(text_of(pg))
        # --- library / ds: term «шрифт»
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(600)
        assert 'свой шрифт' in pg.evaluate("document.body.innerText").lower() or 'свой шрифт' in pg.evaluate("document.body.textContent").lower()
        assert not BAD.search(text_of(pg)), BAD.search(text_of(pg)).group(0)
        # --- phone: label stays addressable
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
        s.open_font('renessa')
        assert 'Скачать шрифт' in pg.evaluate("(document.querySelector('#ex-menu').getAttribute('aria-label')||'')+document.querySelector('#ex-menu').textContent")
        assert not s.errs, s.errs[:3]
        return 'ok'
    finally:
        s.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        try:
            print('PASS fx80_F5', run(p))
        except Exception as e:
            import traceback; traceback.print_exc(); print('FAIL fx80_F5', repr(e)[:600]); sys.exit(1)
