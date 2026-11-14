"""Font status plaque (ok / warn / missing letters), jump to filtered Проверка, export-menu block, explanation toggle persistence."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

def wait_res(pg, cond, t=60000):
    pg.wait_for_function("ST.res&&ST.res!=='wait'&&(" + cond + ")", timeout=t)

def status_check(p):
    s = Session(p, 'status'); pg = s.pg
    try:
        # find a clean font and a font with a confusable pair
        s.open_font('liniya')
        wait_res(pg, "true")
        assert pg.evaluate("ST.res") == 'warn', pg.evaluate("[ST.res,JSON.stringify(ST.items)]")
        txt = pg.evaluate("ST.items.map(i=>i.text).join('|')")
        assert 'путаться' in txt, txt
        assert pg.is_visible('#st-plaque') and pg.get_attribute('#st-plaque', 'data-lvl') == 'warn'
        # export menu has the same status on top
        pg.evaluate("document.querySelector('#ex-menu').click()")
        pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'", timeout=10000)
        assert pg.evaluate("document.querySelector('#ex-list').firstElementChild.id") == 'xm-st'
        assert 'путаться' in pg.evaluate("document.querySelector('#xm-st').textContent")
        pg.keyboard.press('Escape')
        # jump to Проверка, filtered to the problem glyphs
        pg.click('#st-plaque .st-go')
        pg.wait_for_function("S.tab==='proof'", timeout=10000)
        pg.wait_for_selector('#pfilt', timeout=10000)
        assert pg.evaluate("S.proof.only&&S.proof.only.length")>=1
        pg.click('#pfilt-x')
        pg.wait_for_function("!S.proof.only||!S.proof.only.length", timeout=5000)
        # missing letters: enable Ukrainian on a font without Ґ
        pg.evaluate("stLangSet('uk',true)")
        found = None
        for fid in ['ustav', 'rotunda', 'kaplya', 'pixel', 'ryvok']:
            s.open_font(fid); wait_res(pg, "true")
            if 'Не хватает букв' in pg.evaluate("ST.items.map(i=>i.text).join('|')"):
                found = fid; break
        if found:
            assert pg.evaluate("document.querySelector('#st-plaque').dataset.lvl") in ('warn', 'bad')
        # ok state: ru only on a clean font
        pg.evaluate("stLangSet('uk',false)")
        ok = None
        for fid in ['volt', 'kvadra', 'codex', 'modul']:
            s.open_font(fid); wait_res(pg, "true")
            if pg.evaluate("ST.res") == 'ok': ok = fid; break
        assert ok, 'no font reached ok status'
        assert pg.evaluate("document.querySelector('#st-plaque').dataset.lvl") == 'ok'
        assert 'готов' in pg.evaluate("document.querySelector('#st-plaque').textContent")
        # explanation toggle persists
        s.open_panes()
        assert pg.evaluate("!!document.querySelector('#params .xp-row')"), 'no explanation rows'
        assert pg.is_checked('#xp-toggle'), 'default should be on'
        pg.evaluate("document.querySelector('#xp-toggle').click()")
        assert pg.evaluate("localStorage.getItem('gtype-expl-v1')") == '0'
        pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
        pg.evaluate("dwOpen('edit','params')")
        pg.wait_for_selector('#xp-toggle', state='attached', timeout=10000)
        assert not pg.is_checked('#xp-toggle'), 'toggle did not persist'
        assert not s.errs, s.errs[:3]
        return f'warn=liniya missing={found} ok={ok}'
    finally:
        s.close()

if __name__ == '__main__':
    sys.exit(check_all([('status', status_check)]))
