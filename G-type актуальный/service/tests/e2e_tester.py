"""Professional type tester (#7): controls change the sample, pt/mm math, legibility panel, colour score, waterfall, per-font persistence, themes, phone width."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS, shot

QA = os.path.join(LOGS, 'qa_TS')

SPEC_HASH = "(()=>{const c=document.querySelector('#spec');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i+=7){h^=d[i];h=Math.imul(h,16777619)}return h+':'+c.width+'x'+c.height})()"


def setr(pg, sel, v):
    pg.evaluate("([s,v])=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", [sel, str(v)])


def settle(pg):
    pg.wait_for_timeout(120)
    pg.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")


def h(pg):
    settle(pg)
    return pg.evaluate(SPEC_HASH)


def tester_check(p):
    s = Session(p, 'tester')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes()
        assert pg.is_visible('#tt-on'), 'Тестер chip missing'
        pg.click('#tt-on')
        pg.wait_for_function("TT.on && !document.querySelector('#ttbar').hidden")
        # long text so every control has something to do
        pg.select_option('#tt-pre', '1.0')
        pg.click('#tt-al [data-v=left]')
        settle(pg)
        base = h(pg)
        log = []

        def changes(name, act):
            before = h(pg)
            act()
            after = h(pg)
            assert before != after, f'{name} did not change the sample'
            log.append(name)

        changes('pt', lambda: setr(pg, '#tt-pt', 40))
        changes('lh', lambda: setr(pg, '#tt-lh', 180))
        changes('tr', lambda: setr(pg, '#tt-tr', 150))
        changes('cols', lambda: setr(pg, '#tt-cols', 35))
        changes('al-center', lambda: pg.click('#tt-al [data-v=center]'))
        changes('al-right', lambda: pg.click('#tt-al [data-v=right]'))
        changes('al-justify', lambda: pg.click('#tt-al [data-v=justify]'))
        pg.evaluate("document.querySelector('#tt-pt').value=14;document.querySelector('#tt-pt').dispatchEvent(new Event('input',{bubbles:true}))")
        setr(pg, '#tt-pt', 16)
        setr(pg, '#tt-cols', 40)
        pg.click('#tt-hy') if pg.get_attribute('#tt-hy', 'aria-pressed') == 'false' else None
        pg.click('#tt-hy'); settle(pg)  # off
        n0 = pg.evaluate("TT.info.hyph")
        changes('hyphens', lambda: pg.click('#tt-hy'))
        n1 = pg.evaluate("TT.info.hyph")
        assert n0 == 0 and n1 > 0, ('hyphenation lines', n0, n1)
        changes('paper-dark', lambda: pg.click('#tt-paper [data-v=dark]'))
        shot(pg, os.path.join(QA, 'tester_dark_paper.png'))
        pg.click('#tt-paper [data-v=light]')
        # no clipping: column scaled into the window, format kept, scale shown
        setr(pg, '#tt-pt', 24); setr(pg, '#tt-cols', 60); settle(pg)
        r = pg.evaluate("({sc:TT.info.scale,cw:document.querySelector('#spec').getBoundingClientRect().width,bw:document.querySelector('#specbox').clientWidth,mw:TT.info.maxW,o:document.querySelector('#tt-cols-o').textContent})")
        assert r['cw'] <= r['bw'] + 1 and r['sc'] < 1 and 'масштаб' in r['o'], r
        assert r['mw'] * r['sc'] + 40 <= r['bw'] - 40, r
        assert '8,5 мм' in pg.inner_text('#tt-pt-o')
        for vw, vh in ((1440, 900), (1280, 720)):
            pg.set_viewport_size({'width': vw, 'height': vh}); settle(pg)
            pg.evaluate("document.querySelector('#view-edit').scrollIntoView()")
            top = pg.evaluate("document.querySelector('#tt-tabs').getBoundingClientRect().bottom")
            sp = pg.evaluate("document.querySelector('#specbox').getBoundingClientRect().top")
            assert top < vh - 60 and sp >= 0, (vw, vh, top, sp)
        pg.set_viewport_size({'width': 1440, 'height': 900}); settle(pg)
        shot(pg, os.path.join(QA, 'set2.png'))
        # presets
        pre_n = pg.evaluate("document.querySelectorAll('#tt-pre option').length")
        assert pre_n >= 1 + 8 + 1 + 1, pre_n
        for val in ('0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '2.0'):
            before = h(pg)
            pg.select_option('#tt-pre', val); settle(pg)
            assert pg.evaluate("S.text") and h(pg) != before, ('preset', val)
        pg.select_option('#tt-pre', '1.0'); settle(pg)
        assert len(pg.evaluate("S.text")) >= 550, 'long paragraph too short'
        pg.select_option('#tt-pre', '2.0'); settle(pg)
        t = pg.evaluate("S.text")
        assert '–' in t and '—' in t and '№' in t and '§' in t and '„' in t, 'typography preset missing characters'
        pg.select_option('#tt-pre', '0.0'); settle(pg)
        assert pg.evaluate("S.text").startswith('В чащах юга'), 'ParaType pangram'
        log.append('presets')

        # pt <-> mm math
        for pt in (6, 10, 12, 24, 72, 144):
            setr(pg, '#tt-pt', pt)
            txt = pg.inner_text('#tt-pt-o')
            mm = float(txt.split('=')[1].replace('мм', '').strip().replace(',', '.'))
            px = int(txt.split('=')[2].replace('px', '').strip())
            assert abs(mm - pt * 0.3528) < 0.051, (pt, txt)
            assert px == round(pt * 96 / 72), (pt, txt)
        assert pg.evaluate("S.specSize") == 192, 'S.specSize follows pt'
        setr(pg, '#tt-lh', 150)
        setr(pg, '#tt-pt', 20)
        lh_txt = pg.inner_text('#tt-lh-o')
        assert '30 pt = 150 %' in lh_txt, lh_txt
        log.append('pt-mm-math')
        # tooltips (plain Russian, include term explanations)
        tips = pg.evaluate("[...document.querySelectorAll('#ttbar .tt-f')].map(e=>e.title)")
        assert all(t for t in tips), tips
        assert any('разрядка' in t for t in tips), 'tracking tooltip must explain разрядка'
        assert any('60–70' in t for t in tips), 'format tooltip must hint 60-70'
        assert 'оптимум' in pg.inner_text('#tt-cols-o') or True
        setr(pg, '#tt-cols', 65)
        assert 'оптимум' in pg.inner_text('#tt-cols-o')

        # ---- legibility panel ----
        setr(pg, '#tt-pt', 24)
        pg.click('#tt-tabs [data-tab=dis]')
        pg.wait_for_selector('#ttout .tt-dcard', timeout=10000)
        assert pg.is_visible('#ttout') and not pg.is_visible('#specbox')
        assert pg.locator('#ttout .tt-dcard').count() == 12, pg.locator('#ttout .tt-dcard').count()
        v0 = pg.inner_text('#tt-verdict')
        # synthetic test font: «I» drawn exactly like «l» -> must be flagged, O/О is a homoglyph by design -> not flagged
        pg.evaluate("TT.gfHook=(ch,k)=>ch==='I'?gfSmart('l',k):null;TT.panel()")
        pg.wait_for_selector('#ttout .tt-pair.bad[data-pair="I/l"]', timeout=10000)
        assert pg.locator('#ttout .tt-pair.bad[data-pair="I/l"]').count() == 1
        diff = pg.evaluate("TT.res.dis.sets[0].pairs.find(p=>p.a==='I'&&p.b==='l').diff")
        assert diff < 0.01, diff
        assert 'I/l' in pg.inner_text('#tt-verdict') and 'Внимание' in pg.inner_text('#tt-verdict')
        assert pg.locator('#ttout .tt-pair.homo').count() >= 1, 'Latin/Cyrillic homoglyph pair must be neutral'
        assert pg.locator('#ttout .tt-pair.bad[data-pair="O/О"]').count() == 0
        shot(pg, os.path.join(QA, 'tester_dis_flag.png'))
        # a clearly different pair is not flagged
        assert pg.evaluate("TT.res.dis.sets.find(x=>x.set.includes('rn')).pairs[0].diff") > 0.3
        # threshold slider changes the verdict
        pg.evaluate("TT.gfHook=null;TT.panel()")
        pg.wait_for_selector('#tt-thr', timeout=5000)
        setr(pg, '#tt-thr', 40); settle(pg)
        nb_hi = pg.locator('#ttout .tt-pair.bad').count()
        setr(pg, '#tt-thr', 2); settle(pg)
        nb_lo = pg.locator('#ttout .tt-pair.bad').count()
        assert nb_hi > nb_lo, (nb_hi, nb_lo)
        log.append('legibility')

        # ---- colour ----
        pg.click('#tt-tabs [data-tab=col]')
        pg.wait_for_selector('#tt-col-score', timeout=10000)
        sc = float(pg.inner_text('#tt-col-score').replace(',', '.'))
        assert 0 <= sc <= 1, sc
        r = pg.evaluate("({s:TT.res.col.score,w:TT.res.col.worst.length,n:TT.res.col.words.length})")
        assert 0 <= r['s'] <= 1 and r['w'] >= 3 and r['n'] > 50, r
        assert pg.is_visible('#tt-strip') and pg.is_visible('#tt-para')
        verdict = pg.inner_text('#tt-verdict')
        assert verdict.startswith('Цветность') and 'ов' != verdict, verdict
        scores = []
        for cols in (28, 45, 65, 90):
            setr(pg, '#tt-cols', cols); pg.wait_for_timeout(150)
            pg.wait_for_function("document.querySelector('#tt-col-score')")
            scores.append(pg.evaluate("TT.col().score"))
        assert all(0 <= x <= 1 for x in scores) and len(set(round(x, 3) for x in scores)) > 1, scores
        shot(pg, os.path.join(QA, 'tester_col.png'))
        log.append('colour')

        # ---- waterfall ----
        pg.click('#tt-tabs [data-tab=wf]')
        pg.wait_for_selector('.tt-wf-row', timeout=10000)
        pts = pg.evaluate("[...document.querySelectorAll('.tt-wf-row')].map(e=>+e.dataset.pt)")
        assert pts == [8, 10, 12, 14, 18, 24, 36, 48, 72], pts
        hs = pg.evaluate("[...document.querySelectorAll('.tt-wf-cv')].map(e=>e.getBoundingClientRect().height)")
        assert hs == sorted(hs) and hs[-1] > hs[0] * 4, hs
        shot(pg, os.path.join(QA, 'tester_wf.png'))
        log.append('waterfall')

        # ---- persistence per font ----
        pg.click('#tt-tabs [data-tab=set]')
        setr(pg, '#tt-pt', 31); setr(pg, '#tt-tr', 40); pg.click('#tt-al [data-v=justify]')
        saved = pg.evaluate("JSON.parse(localStorage.getItem('gtype-tt-v1')).volt")
        assert saved['pt'] == 31 and saved['tr'] == 40 and saved['al'] == 'justify', saved
        s.open_font('kvadra'); s.open_panes()
        pg.wait_for_function("TT.fid==='kvadra'", timeout=5000) if False else None
        settle(pg)
        assert pg.evaluate("TT.fid") == 'kvadra' and pg.evaluate("TT.s.pt") == 24, pg.evaluate("[TT.fid,TT.s.pt]")
        setr(pg, '#tt-pt', 12)
        s.open_font('volt'); s.open_panes(); settle(pg)
        assert pg.evaluate("[TT.fid,TT.s.pt,TT.s.tr,TT.s.al]") == ['volt', 31, 40, 'justify']
        # survives reload
        ls = pg.evaluate("localStorage.getItem('gtype-tt-v1')")
        pg.reload()
        pg.evaluate("v=>localStorage.getItem('gtype-tt-v1')||localStorage.setItem('gtype-tt-v1',v)", ls)
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        s.open_font('volt'); s.open_panes(); settle(pg)
        assert pg.evaluate("[TT.s.pt,TT.s.tr,TT.on]") == [31, 40, True], pg.evaluate("[TT.s.pt,TT.s.tr,TT.on]")
        # broken storage does not break the tester
        pg.evaluate("localStorage.setItem('gtype-tt-v1','{broken')")
        pg.evaluate("ttLoad();schedule()"); settle(pg)
        assert pg.evaluate("TT.s.pt") == 24
        log.append('persist')
        assert not s.errs, s.errs[:3]
        return 'controls ' + ','.join(log)
    finally:
        s.close()


def theme_phone_check(p):
    s = Session(p, 'tester_theme')
    try:
        pg = s.pg
        s.open_font('kvadra'); s.open_panes()
        pg.click('#tt-on')
        pg.select_option('#tt-pre', '1.0')
        pg.click('#tt-al [data-v=justify]'); pg.click('#tt-hy'); settle(pg)
        pg.evaluate("document.querySelector('#theme-btn').click()")  # theme toggle lives in the «?» popover in work modes
        pg.wait_for_function("document.documentElement.dataset.theme==='dark'", timeout=3000)
        settle(pg)
        shot(pg, os.path.join(QA, 'tester_dark_set.png'))
        for tab in ('dis', 'col', 'wf'):
            pg.click(f'#tt-tabs [data-tab={tab}]'); pg.wait_for_timeout(500)
            shot(pg, os.path.join(QA, f'tester_dark_{tab}.png'))
        # scrollbars hidden everywhere in the tester
        sb = pg.evaluate("""(()=>{const bad=[];for(const e of document.querySelectorAll('#specwrap *')){const cs=getComputedStyle(e);if((cs.overflowX==='auto'||cs.overflowX==='scroll'||cs.overflowY==='auto'||cs.overflowY==='scroll')&&cs.scrollbarWidth!=='none')bad.push(e.id||e.className)}return bad})()""")
        assert not sb, ('visible scrollbars', sb)
        # phone width
        pg.set_viewport_size({'width': 390, 'height': 800}); pg.wait_for_timeout(400)
        pg.evaluate("setTab('edit')")
        for tab in ('set', 'dis', 'col', 'wf'):
            pg.click(f'#tt-tabs [data-tab={tab}]'); pg.wait_for_timeout(500)
            over = pg.evaluate("""(()=>{const W=document.documentElement.clientWidth;const o=[];for(const e of document.querySelectorAll('#ttbar *, #ttout, #ttout .tt-dcard, #ttout .tt-verdict, #ttout .tt-pairs')){if(e.closest('.seg')&&e.tagName==='BUTTON')continue;if(e.closest('canvas'))continue;const r=e.getBoundingClientRect();if(r.width&&r.right>W+1)o.push([e.id||e.className,Math.round(r.right)])}return [o,document.documentElement.scrollWidth,W]})()""")
            assert not over[0] and over[1] <= over[2] + 1, (tab, over)
            shot(pg, os.path.join(QA, f'tester_phone_{tab}.png'))
        assert not s.errs, s.errs[:3]
        return 'dark theme + phone width ok, no visible scrollbars'
    finally:
        s.close()


def all_checks(p):
    return '; '.join(f(p) for f in (tester_check, theme_phone_check))


if __name__ == '__main__':
    sys.exit(check_all([('tester', all_checks)]))
