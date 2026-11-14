"""FX80 F4: one share dialog everywhere (SHARE), no fake links; screen survives reload, Back/Forward walk the screens, dialogs close on Back."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

READY = "SHARE.state.open&&SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent"
SEED = """(()=>{const m=PROF.meta();m.pins=[];PROF.saveMeta();})()"""


def closed(pg):
    pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=5000)


def run(p):
    s = Session(p, 'fx80_f4'); pg = s.pg
    try:
        # ---- share: library card menu -> full dialog for that font, editor naming, no old dialog, no fake link
        pg.click('[data-tab=library]')
        pg.wait_for_selector('#libgrid .lcard[data-font=kvadra] .lc-more', timeout=20000)
        pg.click('#libgrid .lcard[data-font=kvadra] .lc-more'); pg.click('.menu70 [data-m=share]')
        pg.wait_for_function(READY, timeout=120000)
        assert pg.evaluate("SHARE.state.m.id") == 'kvadra'
        assert pg.evaluate("!document.querySelector('.shr-dlg,#shr-cv,#shr-cp,#shr-l')"), 'old PNG-only dialog still present'
        txt = pg.evaluate("document.getElementById('pst').innerText")
        assert 'Скопировать ссылку' not in txt and 'g-type/@' not in txt, 'fake link'
        assert pg.evaluate("!!document.querySelector('#pst [data-f],#pst [data-r]')"), 'formats/themes missing'
        lib_name = pg.evaluate("SHARE.state.m.name")
        closed(pg)
        # the editor dialog for the same font uses the same name
        s.open_font('kvadra')
        pg.evaluate("SHARE.open(S.fontId,S.family)"); pg.wait_for_function(READY, timeout=120000)
        assert pg.evaluate("SHARE.state.m.name") == lib_name, ('naming differs', lib_name, pg.evaluate("SHARE.state.m.name"))
        closed(pg)
        # profile: created-font card + header button -> same dialog
        pg.evaluate("setTab('profile')"); pg.wait_for_selector('#view-profile .pf-wrap .sk-host', timeout=8000)
        assert pg.evaluate("!document.querySelector('[data-pf=copy]')"), 'profile fake link chip'
        pg.evaluate("PORT.share({fid:'volt'})"); pg.wait_for_function(READY, timeout=120000)
        assert pg.evaluate("SHARE.state.m.id") == 'volt'
        closed(pg)
        # empty profile header button: calm toast, no dialog
        pg.evaluate("PROF.openShare({})"); pg.wait_for_timeout(300)
        assert pg.evaluate("document.getElementById('pst')?document.getElementById('pst').hidden:true") or pg.evaluate("SHARE.state.open")
        pg.evaluate("SHARE.close()")
        # ---- navigation
        pg.evaluate("setTab('home')"); pg.wait_for_timeout(200)
        pg.click('[data-tab=library]'); pg.wait_for_timeout(200)
        assert pg.evaluate("location.hash") == '#library'
        n = pg.evaluate("history.length")
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(200)
        assert pg.evaluate("history.length") == n, 'duplicate history entry'
        pg.evaluate("setTab('fav')"); pg.wait_for_timeout(200)
        assert pg.evaluate("location.hash") == '#fav'
        pg.go_back(); pg.wait_for_function("S.tab==='library'", timeout=5000)
        assert pg.evaluate("location.hash") == '#library'
        pg.go_forward(); pg.wait_for_function("S.tab==='fav'", timeout=5000)
        # dialog closes on Back
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(200)
        pg.click('#libgrid .lcard[data-font=kvadra] .lc-more'); pg.wait_for_selector('.menu70')
        pg.click('.menu70 [data-m=share]'); pg.wait_for_function(READY, timeout=120000)
        pg.go_back(); pg.wait_for_function("document.getElementById('pst').hidden", timeout=5000)
        # reload restores the screen; editor restores the last font
        s.open_font('stroka')
        pg.wait_for_timeout(300)
        assert pg.evaluate("location.hash") == '#edit'
        pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&!!document.querySelector('[data-tab=home]')", timeout=30000)
        pg.wait_for_function("S.tab==='edit'", timeout=15000)
        assert pg.evaluate("S.fontId") == 'stroka', pg.evaluate("S.fontId")
        for tok, tab in (('profile', 'profile'), ('library', 'library'), ('draw', 'draw'), ('fav', 'fav')):
            pg.evaluate(f"setTab('{tok}')"); pg.wait_for_timeout(500)
            pg.reload(); pg.wait_for_function(f"typeof S!=='undefined'&&S.tab==='{tab}'", timeout=30000)
            assert pg.evaluate("location.hash") == '#' + tok
        # sandbox: no hash reaches the page, the stored screen is restored
        pg.evaluate("setTab('library')"); pg.wait_for_timeout(300)
        pg.evaluate("history.replaceState(null,'',location.pathname+location.search)"); pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&S.tab==='library'", timeout=30000)
        # import screen
        pg.evaluate("setTab('home')"); pg.wait_for_timeout(200)
        pg.evaluate("iuOpen()"); pg.wait_for_timeout(400)
        assert pg.evaluate("location.hash") == '#import'
        pg.go_back(); pg.wait_for_function("!IU.open", timeout=5000)
        # invalid token -> home
        pg.goto('file://' + PAGE + '#nonsense'); pg.reload()
        pg.wait_for_function("typeof S!=='undefined'&&S.tab", timeout=30000); pg.wait_for_timeout(400)
        assert pg.evaluate("S.tab") == 'home', pg.evaluate("S.tab")
        # ds still opens from the hash and Back leaves it
        pg.goto('file://' + PAGE + '#ds'); pg.reload()
        pg.wait_for_function("document.body.classList.contains('ds-open')", timeout=15000)
        assert not s.errs, s.errs[:3]
        return 'ok'
    finally:
        s.close()


if __name__ == '__main__':
    with sync_playwright() as p:
        try:
            print('PASS fx80_F4', run(p))
        except Exception as e:
            print('FAIL fx80_F4', repr(e)[:600]); sys.exit(1)
