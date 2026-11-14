"""Editable sample: type straight into the rendered sample (editor, kerning tab, draw test), caret/selection overlay, placeholder, plain paste,
Enter rules, click in a gap = caret + kerning pill with working -/+ (both themes). Separate grey text field is gone."""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from common import Session


def click_gap(pg, i, row=0, id='spec'):
    r = pg.evaluate(f"(()=>{{const r=document.getElementById('{id}').getBoundingClientRect();return [r.left,r.top]}})()")
    h = pg.evaluate(f"SMP_I.{ 'spec' if id == 'spec' else 'kk'}.rows[{row}][{i}]")
    pg.mouse.click(r[0] + h['x'], r[1] + (h['y0'] + h['y1']) / 2)
    return h


def sample(p):
    s = Session(p, 'sample')
    try:
        pg = s.pg
        s.open_font('volt')
        pg.evaluate("document.getElementById('specwrap')._pane.set(true)")
        # the separate grey field and its row are gone; size slider sits in the chip row
        assert pg.evaluate("!document.querySelector('.sp-row')"), 'old .sp-row still there'
        assert pg.evaluate("!!document.querySelector('#specwrap .chiprow #tsz')"), 'size slider not in the chip row'
        assert pg.evaluate("(()=>{const t=document.getElementById('txt');return t.closest('#specbox')&&getComputedStyle(t).opacity==='0'})()"), 'input must live inside the sample, invisible'
        assert pg.get_attribute('#txt', 'aria-label'), 'aria-label'
        pg.evaluate("S.text='Я люблю';document.getElementById('txt').value=S.text;schedule()")
        pg.wait_for_timeout(500)
        for th in ('light', 'dark'):
            pg.evaluate(f"document.documentElement.dataset.theme='{th}'")
            pg.wait_for_timeout(250)
            pg.evaluate("document.getElementById('txt').blur()")
            click_gap(pg, 3)   # between л and ю
            pg.wait_for_function("document.activeElement.id==='txt'", timeout=3000)
            assert pg.evaluate("document.getElementById('txt').selectionStart") == 3
            assert pg.evaluate("!SMP_I.spec.car.hidden"), 'caret not shown'
            pop = pg.evaluate("(()=>{const p=document.getElementById('kk-pop');const c=getComputedStyle(p);return {h:p.hidden,t:p.innerText,o:c.opacity,fg:c.color,bg:c.backgroundColor}})()")
            assert not pop['h'] and pop['o'] == '1' and 'ю' in pop['t'], (th, pop)
            assert pop['fg'] != pop['bg'], ('pill text colour equals its background', th, pop)
            k0 = pg.evaluate("kkInfo('л','ю').v")
            pg.click('#kk-pop [data-d="1"]')
            pg.click('#kk-pop [data-d="1"]')
            pg.click('#kk-pop [data-d="-1"]')
            assert pg.evaluate("kkInfo('л','ю').v") == k0 + 1, 'pill buttons do not change kerning'
            assert pg.input_value('#pp-v') == str(k0 + 1)
            pg.click('#pp-auto')
            assert pg.evaluate("kkInfo('л','ю').v") == k0
            pg.keyboard.press('Escape')
        # typing + caret follows
        click_gap(pg, 9 if False else len(pg.evaluate("SMP_I.spec.rows[0]")) - 1)
        pg.keyboard.type(' мир')
        assert pg.evaluate("S.text") == 'Я люблю мир'
        pg.keyboard.press('Enter')
        pg.keyboard.type('Ab')
        assert pg.evaluate("S.text") == 'Я люблю мир\nAb', 'Enter must add a line in the multi-line sample'
        pg.wait_for_timeout(300)
        n = pg.evaluate("SMP_I.spec.rows[0].length")
        assert n == len('Я люблю мир\nAb') + 1, n
        # paste: formatting stripped, plain text only
        pg.evaluate("document.getElementById('txt').select()")
        pg.evaluate("""(()=>{const t=document.getElementById('txt');const dt=new DataTransfer();dt.setData('text/plain','Привет\\r\\nмир');dt.setData('text/html','<b>Привет</b>');
          t.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}))})()""")
        assert pg.evaluate("S.text") == 'Привет\nмир', pg.evaluate("S.text")
        pg.wait_for_timeout(300)
        # placeholder: empty text shows the default sample, muted
        pg.keyboard.press('Control+a')
        pg.keyboard.press('Delete')
        pg.wait_for_timeout(300)
        assert pg.evaluate("S.text") == ''
        assert pg.evaluate("SMP_I.spec.rows[0].length") == 1
        # the second comparison line follows the text
        pg.keyboard.type('Ну')
        pg.wait_for_timeout(300)
        assert pg.evaluate("S.text") == 'Ну' and pg.evaluate("SMP_I.spec.rows.length") == 2
        # arrows / selection
        pg.keyboard.press('Home')
        pg.keyboard.press('Shift+ArrowRight')
        assert pg.evaluate("document.getElementById('smp-x')||document.querySelectorAll('#specbox .smp-sel i').length") == 1, 'selection rectangle'
        # kerning tab: typed into the test text, Enter does nothing, click picks the pair
        pg.evaluate("setTab('kern')")
        pg.wait_for_function("S.tab==='kern'", timeout=5000)
        pg.wait_for_timeout(500)
        assert pg.evaluate("document.getElementById('kk-ctbox').contains(document.getElementById('kk-txt'))")
        h = click_gap(pg, 3, id='kk-ctxt')
        pg.wait_for_function("document.activeElement.id==='kk-txt'", timeout=3000)
        pg.keyboard.press('End')
        pg.keyboard.type('Zz')
        pg.keyboard.press('Enter')
        assert pg.evaluate("KK.txt.endsWith('Zz') && !KK.txt.includes('\\n')"), pg.evaluate("KK.txt")
        # draw view: test dialog has no separate field either
        pg.evaluate("setTab('draw')")
        pg.wait_for_selector('.dr-g #dr-side', state='attached', timeout=15000)
        assert pg.evaluate("document.getElementById('dr-tt').contains(document.getElementById('dr-tx'))")
        assert not s.errs, s.errs[:3]
        return 'typing, caret, selection, plain paste, Enter rules, placeholder, kerning pill -/+ live in both themes; kerning tab and draw test share the model'
    finally:
        s.b.close()


if __name__ == '__main__':
    t0 = time.time()
    rc = 0
    try:
        with sync_playwright() as p:
            msg = sample(p)
        print(f'PASS sample {msg} t={time.time() - t0:.1f}s')
    except Exception as e:  # noqa
        rc = 1
        print(f'FAIL sample {type(e).__name__}: {str(e)[:900]}')
    sys.exit(rc)
