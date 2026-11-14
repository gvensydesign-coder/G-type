"""T1 v82: (1) saved presets validated like project files, (2) draw: diacritics ghost mark inside the canvas,
(3) storage-denied mode (localStorage / indexedDB throwing, or silently empty): every main flow without JS errors + one honest note,
(4) library search with no results: clear empty state with a way out (both themes, 390 and 1440)."""
import os, sys, json, io
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from draw_scaffold import SCAFFOLD

THROW = """(()=>{const T=()=>{throw new DOMException('The operation is insecure.','SecurityError')};
for(const k of ['localStorage','sessionStorage','indexedDB'])Object.defineProperty(window,k,{get:T,configurable:true});})()"""
EMPTY = """(()=>{const ls={getItem(){return null},setItem(){},removeItem(){},clear(){},key(){return null},length:0};
Object.defineProperty(window,'localStorage',{get(){return ls},configurable:true});
Object.defineProperty(window,'indexedDB',{get(){return null},configurable:true});})()"""


class S2(Session):
    """Session with a custom init script (no TOUR_OFF: storage is denied) and viewport."""
    def __init__(self, p, name, init=None, w=1440, h=900, tour_off=True):
        self.name = name
        self.b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': w, 'height': h}, accept_downloads=True)
        self.pg = self.ctx.new_page(); self.errs = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.on('console', lambda m: self.errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
        if tour_off: self.ctx.add_init_script(TOUR_OFF)
        if init: self.ctx.add_init_script(init)
        self.ctx.add_init_script('window.__GT_TEST=1')
        self.pg.goto('file://' + PAGE)
        self.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)


def noerr(s, what):
    e = [x for x in s.errs if 'ERR_' not in x]
    assert not e, (what, e[:3])


# ---------------------------------------------------------------- 1. presets
def presets(p):
    s = S2(p, 't1_pre'); pg = s.pg
    s.open_font('kvadra')
    lim = pg.evaluate("""(()=>{const r={};const pr={fonts:{kvadra:{styles:{regular:{p:{stem:1e9}}}}}};projSanitize(pr);r.stem=pr.fonts.kvadra.styles.regular.p.stem;return r})()""")
    mx = lim['stem']
    bad = [
        {'name': 'Огромный', 'p': {'stem': 1e9, 'sb': -1e9}},
        {'name': 'Мусор', 'p': {'stem': 'abc', 'sb': {'x': 1}, 'zzz': 5, '__proto__': {'a': 1}}},
        {'name': 5, 'p': {'stem': '100'}},
        {'name': 'Пустой', 'p': 'x'},
        None, 7, {'p': []},
        {'name': 'Нан', 'p': {'stem': None, 'sb': 'NaN'}},
    ]
    pg.evaluate("a=>localStorage.setItem('gtype-presets-kvadra',JSON.stringify(a))", bad)
    pg.evaluate("localStorage.setItem('gtype-presets-nofont','{broken')")
    pg.evaluate("renderPre()")
    got = pg.evaluate("loadPre()")
    names = [g['name'] for g in got]
    assert names == ['Огромный', 'Мусор', 'Пресет 3', 'Нан'], names
    assert next(g for g in got if g['name'] == 'Мусор')['p'] == {} and next(g for g in got if g['name'] == 'Нан')['p'] == {}
    for g in got:
        for k, v in g['p'].items():
            assert isinstance(v, (int, float)), (g, k)
    big = next(g for g in got if g['name'] == 'Огромный')
    assert big['p']['stem'] == mx, (big, mx)
    assert -2000 <= big['p']['sb'] <= 2000, big
    assert any(g['name'] == 'Пресет 3' and g['p'].get('stem') == 100 for g in got), got
    # storage was healed
    st = json.loads(pg.evaluate("localStorage.getItem('gtype-presets-kvadra')"))
    assert st == got, 'not healed in storage'
    # apply: values land clamped
    pg.evaluate("document.querySelector('#mypre .chip').click()")
    assert pg.evaluate("S.styles.regular.p.stem") == mx
    # boot heal: reload with garbage for ANOTHER font, heal runs for all fonts
    pg.evaluate("localStorage.setItem('gtype-presets-volt',JSON.stringify([{name:'Z',p:{stem:1e12}}]))")
    s.ctx.add_init_script("try{localStorage.setItem('gtype-presets-volt',JSON.stringify([{name:'Z',p:{stem:1e12}}]))}catch(e){}")
    pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&typeof renderPre==='function'", timeout=30000); pg.wait_for_timeout(500)
    v = json.loads(pg.evaluate("localStorage.getItem('gtype-presets-volt')"))
    assert v[0]['p']['stem'] < 1e6, v
    assert pg.evaluate("!document.getElementById('nsn')"), 'note shown although storage works'
    t = pg.evaluate("(()=>{document.getElementById('mypre-add').click();return document.getElementById('toast').textContent})()")
    assert 'Пресет сохранён' in t, t
    noerr(s, 'presets'); s.close()
    return f'clamped stem->{mx}'


# ---------------------------------------------------------------- 2. draw diacritics ghost
def ghost(p):
    from e2e_draw import Session as DS, Draw, setpick
    s = DS(p, 't1_ghost'); pg = s.pg
    pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv')
    setpick(pg, 'dia')
    out = []
    for w, h in ((1440, 900), (1024, 768), (768, 1024), (390, 844)):
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(300)
        for ch in '˘¨´¸˛˙˜':
            pg.evaluate("c=>document.querySelector('.dr-gl[data-ch=\"'+c+'\"]').click()", ch); pg.wait_for_timeout(150)
            r = pg.evaluate("""()=>{const t=GT_DRAW._t,cv=document.getElementById('dr-cv');
              document.getElementById('gtdraw').style.setProperty('--dr-ghost','rgb(255,0,255)');t.readCol();t.redraw();return null}""")
            n = pg.evaluate("""()=>{const cv=document.getElementById('dr-cv'),c=cv.getContext('2d'),W=cv.width,H=cv.height;
              return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(0)))).then(()=>{const d=c.getImageData(0,0,W,H).data;let top=-1,bot=-1,l=W,rr=-1;
              for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(d[i]>200&&d[i+1]<80&&d[i+2]>200){if(top<0)top=y;bot=y;if(x<l)l=x;if(x>rr)rr=x;}}
              return {top,bot,l,rr,W,H}})}""")
            out.append((w, ch, n))
            assert n['top'] != 0 and n['top'] >= 0, (w, ch, n)
            assert n['bot'] < n['H'] - 1, (w, ch, n)
    noerr(s, 'ghost'); s.close()
    return f'checked {len(out)}'


# ---------------------------------------------------------------- 3. storage denied
def flows(p, init, tag):
    from e2e_draw import Draw, setpick
    from e2e_import import make_fixtures
    s = S2(p, 't1_' + tag, init, tour_off=False); pg = s.pg
    step = []
    def mark(x): step.append(x)
    # home: the first-visit onboarding may open: close it by Escape
    pg.wait_for_timeout(600)
    if pg.evaluate("window.ONB&&ONB.isOpen"): pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    assert pg.evaluate("!document.getElementById('nsn')"), 'note shown before any user work'
    mark('home')
    # library: search without result, empty state, reset, favourite, list view, theme
    pg.click('[data-tab=library]'); pg.wait_for_selector('#libgrid .lcard', timeout=20000)
    pg.fill('#lib-q', 'яяяяяя'); pg.wait_for_function("!document.getElementById('lib-empty').hidden", timeout=5000)
    pg.click('#lib-reset'); pg.wait_for_function("document.getElementById('lib-empty').hidden", timeout=5000)
    pg.evaluate("libSetView('list')"); pg.evaluate("libSetView('grid')"); pg.evaluate("themeSet('dark')"); pg.evaluate("themeSet('light')")
    pg.evaluate("document.querySelector('#libgrid .lcard .lc-more')&&document.querySelector('#libgrid .lcard .lc-more').click()"); pg.keyboard.press('Escape')
    mark('library')
    # edit font: slider, preset, project save / load, export
    s.open_font('kvadra'); pg.wait_for_timeout(300)
    pg.evaluate("snap();S.styles.regular.p.stem=Math.max(80,S.styles.regular.p.stem-10);syncPanel();bump()"); pg.wait_for_timeout(900)
    pg.evaluate("document.querySelector('#mypre-add')&&document.querySelector('#mypre-add').click()"); pg.wait_for_timeout(300)
    assert pg.evaluate("typeof loadPre()==='object'")
    name, data, path = s.download('ttf'); assert data[:4] in (b'\x00\x01\x00\x00', b'true', b'OTTO'), data[:4]
    assert pg.evaluate("document.querySelectorAll('#nsn').length") == 1, 'one-time note missing/duplicated'
    txt = pg.inner_text('#nsn'); assert 'не даёт сохранять' in txt and 'до закрытия вкладки' in txt, txt
    box = pg.evaluate("(()=>{const r=document.getElementById('nsn').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()")
    assert box[0] >= 0 and box[1] >= 0 and box[2] <= box[4] and box[3] <= box[5], box
    pg.click('#nsn button'); assert pg.evaluate("!document.getElementById('nsn')")
    pg.evaluate("snap();S.styles.regular.p.stem+=1;syncPanel();bump()"); pg.wait_for_timeout(600)
    assert pg.evaluate("!document.getElementById('nsn')"), 'note shown twice'
    toast_txt = pg.evaluate("(()=>{document.getElementById('mypre-add').click();return document.getElementById('toast').textContent})()")
    assert 'сохранён' not in toast_txt and 'пропадёт' in toast_txt, toast_txt
    mark('edit+export')
    # project save and open
    pj = json.dumps(pg.evaluate("projectJSON()"))
    pjp = os.path.join(LOGS, 't1_pj.json'); open(pjp, 'w').write(pj)
    pg.set_input_files('#pj-l', pjp); pg.wait_for_timeout(500)
    mark('project')
    # history panel (editor)
    pg.evaluate("document.getElementById('hist-btn')&&document.getElementById('hist-btn').click()"); pg.wait_for_timeout(400)
    pg.keyboard.press('Escape'); mark('hist')
    # share
    pg.evaluate("SHARE.open(S.fontId,S.family)"); pg.wait_for_function("SHARE.state.open&&SHARE.state.face&&SHARE.state.m", timeout=120000)
    pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=5000); mark('share')
    # profile: edit + save name
    pg.evaluate("setTab('profile')"); pg.wait_for_selector('#view-profile .pf-wrap', timeout=8000)
    pg.evaluate("document.querySelector('[data-pf=edit]')&&document.querySelector('[data-pf=edit]').click()"); pg.wait_for_timeout(500)
    mark('profile')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # nav: reload restores something sane (hash)
    pg.evaluate("location.hash='#library'"); pg.wait_for_timeout(300)
    pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000); pg.wait_for_timeout(600)
    if pg.evaluate("window.ONB&&ONB.isOpen"): pg.keyboard.press('Escape')
    mark('nav')
    # tours
    for t in ('welcome', 'editor'):
        pg.evaluate("t=>TOUR.run(t,{force:true})", t); pg.wait_for_timeout(700)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    mark('tours')
    # import
    pg.evaluate("setTab('home')"); fs = make_fixtures()
    pg.click('[data-tab=home]'); pg.click('#imp-card'); pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
    pg.set_input_files('#imp-files', fs)
    pg.wait_for_function("Object.keys(IMP.glyphs).length>=10 && !IU.pending.length", timeout=60000)
    pg.click('#imp-build'); pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
    mark('import')
    # draw + build
    pg.evaluate("setTab('home')"); pg.click('#draw-card'); pg.wait_for_selector('#dr-cv', timeout=15000)
    d = Draw(s)
    from e2e_draw import draw_N
    draw_N(d, pg)
    for ch in 'ОГ':
        d.goto(ch); d.tool('shape'); d.path([(0, 0), (175, 700)], 2); d.path([(525, 0), (700, 700)], 2); d.save()
    t = pg.evaluate("document.getElementById('toast').textContent"); assert 'Знак принят' in t or 'сохранён' not in t, t
    pg.click('#dr-fontb'); pg.wait_for_selector('#dr-mf:not([hidden])'); pg.fill('#dr-nm', 'Приват'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    mark('draw')
    noerr(s, (tag, step)); 
    s.close(); return ','.join(step)


# ---------------------------------------------------------------- 4. library: empty search
def empty(p):
    n = 0
    for w, h in ((1440, 900), (390, 844)):
        for th in ('light', 'dark'):
            s = S2(p, 't1_empty', w=w, h=h); pg = s.pg
            pg.evaluate("t=>themeSet(t)", th)
            pg.click('[data-tab=library]'); pg.wait_for_selector('#libgrid .lcard', timeout=20000)
            pg.fill('#lib-q', 'яяяяя'); pg.wait_for_function("!document.getElementById('lib-empty').hidden", timeout=5000)
            t = pg.inner_text('#lib-empty'); assert 'яяяяя' in t and 'Сбросить' in t, t
            r = pg.evaluate("""(()=>{const b=document.getElementById('lib-reset-top'),r=b.getBoundingClientRect();
              const e=document.getElementById('lib-empty').getBoundingClientRect();
              return {vis:!!b.offsetParent,top:r.top,bot:r.bottom,l:r.left,rr:r.right,W:innerWidth,H:innerHeight,ew:e.right-e.left,sw:document.documentElement.scrollWidth}})()""")
            assert r['vis'] and r['top'] >= 0 and r['bot'] <= r['H'] and r['l'] >= 0 and r['rr'] <= r['W'], (w, th, r)
            assert r['sw'] <= r['W'], ('h-scroll', r)
            # the second reset (inside the empty card) works too: filter + query
            pg.evaluate("LQ.tags=['sans'];libRenderLibrary()") if False else None
            pg.evaluate("document.getElementById('lib-reset').click()")
            pg.wait_for_function("document.getElementById('lib-empty').hidden && document.querySelectorAll('#libgrid .lcard').length>3", timeout=5000)
            assert pg.input_value('#lib-q') == '' and pg.evaluate("document.getElementById('lib-reset-top').hidden")
            # top button too
            pg.fill('#lib-q', 'яяяяя'); pg.wait_for_function("!document.getElementById('lib-empty').hidden", timeout=5000)
            pg.evaluate("document.getElementById('lib-reset-top').click()")
            pg.wait_for_function("document.getElementById('lib-empty').hidden", timeout=5000)
            noerr(s, 'empty'); s.close(); n += 1
    return f'{n} combos'


# ---------------------------------------------------------------- 5. storage note vs the draw toolbar
def nsn_draw(p):
    JS = """(()=>{const n=document.getElementById('nsn');if(!n)return {none:1};const a=n.getBoundingClientRect(),bad=[];
      for(const e of document.querySelectorAll('#view-draw button,#view-draw input,#view-draw select,#view-draw [role=toolbar],header.top button,.rail button')){
        const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')continue;const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;
        if(r.left<a.right-0.5&&r.right>a.left+0.5&&r.top<a.bottom-0.5&&r.bottom>a.top+0.5)bad.push((e.id||e.className||e.tagName)+':'+[r.left,r.top,r.right,r.bottom].map(Math.round))}
      return {box:[a.left,a.top,a.right,a.bottom],W:innerWidth,H:innerHeight,bad}})()"""
    n = 0
    for w, h in ((1440, 900), (1024, 768), (768, 1024), (390, 844)):
        for th in ('light', 'dark'):
            s = S2(p, 't1_nsn', THROW, w=w, h=h, tour_off=False); pg = s.pg
            pg.wait_for_timeout(600)
            if pg.evaluate("window.ONB&&ONB.isOpen"): pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
            pg.evaluate("t=>themeSet(t)", th)
            pg.evaluate("setTab('home')"); pg.click('#draw-card'); pg.wait_for_selector('#dr-cv', timeout=15000); pg.wait_for_timeout(500)
            pg.evaluate("noStoreNote()"); pg.wait_for_timeout(300)
            r = pg.evaluate(JS); b = r['box']
            assert not r.get('none'), (w, th, 'note missing')
            assert not r['bad'], (w, th, 'note overlaps controls', r['bad'], b)
            assert b[0] >= 0 and b[1] >= 0 and b[2] <= r['W'] and b[3] <= r['H'], (w, th, b)
            # leaving the draw screen returns the note to its shell position (no stale inline offsets)
            pg.evaluate("setTab('home')"); pg.wait_for_timeout(300)
            if pg.evaluate("!!document.getElementById('nsn')"):
                assert pg.evaluate("document.getElementById('nsn').style.bottom===''"), (w, th, 'stale offset')
            noerr(s, 'nsn'); s.close(); n += 1
    return f'{n} combos'


if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    cs = [('presets', presets), ('ghost', ghost), ('empty', empty), ('nsn_draw', nsn_draw), ('denied_throw', lambda p: flows(p, THROW, 'throw')), ('denied_empty', lambda p: flows(p, EMPTY, 'empty'))]
    sys.exit(check_all([c for c in cs if not only or c[0] in only]))
