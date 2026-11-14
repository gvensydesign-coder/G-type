"""history (Stage 4C): undo/redo timeline + «История» panel with previews.
editor: a slider drag is ONE entry, separate edits are separate entries, Ctrl/Cmd+Z / Ctrl+Shift+Z / Ctrl+Y, no shortcut inside a text input,
buttons with disabled state, panel (newest first, label, time, preview), jump to an entry (later ones stay as redo), a new edit truncates redo,
restored states give identical outlines and a buildable font, kerning / glyph / italic labels, 100-entry cap, previews never block (no long task > 100 ms), no toasts.
draw: cells strokes become entries, the local undo moves the pointer, the panel jumps, previews render.
Stage 5A: a timeline per font (and the draw view) survives font switches and reloads (IndexedDB, localStorage fallback, memory only when storage is blocked),
size caps and LRU eviction, quota / blocked storage never throws, the preview of a historical drawn (custom) glyph shows that step, not the current drawing."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import check_all, Session, glyph_sigs, ttf_bytes_ok, shot as _shot, LOGS, TOUR_OFF

OUTL = """(()=>{cache.clear();const o=[];for(const st of ['regular','italic'])for(const ch of ['А','Ж','а','в','Е','И']){const g=getFinal(ch,st);
 o.push(g?[Math.round(g.adv*100),g.cs.map(c=>c.nodes.map(n=>[Math.round(n.x*100),Math.round(n.y*100),n.a?Math.round(n.a.x*100):0,n.a?Math.round(n.a.y*100):0,n.b?Math.round(n.b.x*100):0,n.b?Math.round(n.b.y*100):0]))]:null);}
 return JSON.stringify(o)})()"""
INK = """()=>[...document.querySelectorAll('#hist-l .hist-pv canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>20)n++;return n;})"""


def info(pg, sc='ed'):
    return pg.evaluate(f"HIST.info('{sc}')")


def settle(pg, n=None):
    """wait for the idle commit (400 ms) and, optionally, for n entries"""
    pg.wait_for_timeout(560)
    if n is not None:
        pg.wait_for_function(f"HIST.info('ed').n=={n}", timeout=4000)


def editor(p):
    s = Session(p, 'hist'); pg = s.pg
    s.open_font('volt'); s.open_panes()
    pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
    pg.evaluate("window.__tm=0;new MutationObserver(()=>window.__tm++).observe(document.querySelector('#toast'),{childList:true,characterData:true,subtree:true,attributes:true})")
    assert pg.is_disabled('#undo') and pg.is_disabled('#redo'), 'undo/redo must be disabled with no history'
    st = [pg.evaluate(OUTL)]
    b0 = s.download('ttf')[1]
    # 1. a slider drag = ONE entry (many input events, one pointer gesture)
    pg.evaluate("""async()=>{const el=document.querySelector('#p_stem'),w=ms=>new Promise(r=>setTimeout(r,ms)),v0=+el.value;
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      for(let k=1;k<=14;k++){el.value=v0+k*4;el.dispatchEvent(new Event('input',{bubbles:true}));await w(30);}
      el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}""")
    settle(pg, 2)
    w = info(pg); assert w['n'] == 2 and '→' in w['labels'][1] and 'штрих' in w['labels'][1].lower(), w
    st.append(pg.evaluate(OUTL)); assert st[1] != st[0]
    # 2. separate edits are separate entries (snap() = start of a gesture); labels name the parameter and values
    pg.evaluate("snap();cur().p.xh=560;bump();snap();cur().p.capH=715;bump();"); settle(pg, 4)
    st.append(None); st.append(pg.evaluate(OUTL))
    w = info(pg); assert w['n'] == 4 and 'Высота' in w['labels'][2] and '→' in w['labels'][3], w
    # outlines at every step, for the restore checks: walk back with the keyboard and remember them
    pg.wait_for_function("!document.querySelector('#toast').classList.contains('on')", timeout=8000); pg.evaluate("window.__tm=0")
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
    st[2] = pg.evaluate(OUTL); assert info(pg)['i'] == 2
    pg.keyboard.press('Control+Shift+z'); pg.wait_for_timeout(250)
    assert pg.evaluate(OUTL) == st[3] and info(pg)['i'] == 3, 'Ctrl+Shift+Z'
    pg.keyboard.press('Control+z'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
    assert pg.evaluate(OUTL) == st[1] and info(pg)['i'] == 1, 'two undos'
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(250)
    assert pg.evaluate(OUTL) == st[2] and info(pg)['i'] == 2, 'Ctrl+Y'
    pg.keyboard.press('Meta+z'); pg.wait_for_timeout(250); assert info(pg)['i'] == 1, 'Cmd+Z'
    pg.keyboard.press('Meta+Shift+z'); pg.wait_for_timeout(250); assert info(pg)['i'] == 2, 'Cmd+Shift+Z'
    assert pg.evaluate("window.__tm") == 0, 'undo/redo must not toast'
    # sliders follow (the panel shows the restored value)
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
    assert pg.evaluate("+document.querySelector('#p_xh').value")==540 or pg.evaluate("+document.querySelector('#p_xh').value")==pg.evaluate("cur().p.xh"), 'slider follows'
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(250)
    # 3. no shortcut while a text input has focus
    pg.evaluate("(()=>{const i=document.createElement('input');i.type='text';i.id='tmpin';document.body.appendChild(i);i.focus()})()")
    before = info(pg)['i']; pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
    assert info(pg)['i'] == before, 'shortcut ran inside a text input'
    pg.evaluate("document.getElementById('tmpin').remove()")
    # 4. buttons + disabled state
    assert not pg.is_disabled('#undo')
    pg.evaluate("document.querySelector('#undo').click()"); pg.evaluate("document.querySelector('#undo').click()"); pg.evaluate("document.querySelector('#undo').click()")
    pg.wait_for_timeout(200)
    assert info(pg)['i'] == 0 and pg.is_disabled('#undo') and not pg.is_disabled('#redo'), 'buttons'
    assert pg.evaluate(OUTL) == st[0], 'restore to the first state must give identical outlines'
    pg.evaluate("document.querySelector('#undo').click()")  # disabled: nothing happens, no toast
    assert pg.evaluate("window.__tm") == 0
    b1 = s.download('ttf')[1]
    g0, c0 = glyph_sigs(ttf_bytes_ok(b0)); g1, c1 = glyph_sigs(ttf_bytes_ok(b1))
    assert c0 == c1 and g0 == g1, 'font built after undo-to-start differs from the original'
    for _ in range(3): pg.evaluate("document.querySelector('#redo').click()")
    pg.wait_for_timeout(200)
    assert pg.is_disabled('#redo') and pg.evaluate(OUTL) == st[3], 'redo to the end'
    # 5. panel: newest first, label + time + preview, jump, redo stays, new edit truncates
    pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])')
    rows = pg.evaluate("[...document.querySelectorAll('#hist-l .hist-i')].map(b=>({i:+b.dataset.i,l:b.querySelector('.hist-lab').textContent,m:b.querySelector('.hist-m').textContent,cur:b.classList.contains('cur')}))")
    assert [r['i'] for r in rows] == [3, 2, 1, 0] and rows[0]['cur'] and all(r['m'] for r in rows) and rows[3]['l'] == 'Исходное состояние', rows
    pg.wait_for_function("(" + INK + ")().every(n=>n>20)", timeout=15000)
    inks = pg.evaluate("(" + INK + ")()"); assert all(n > 20 for n in inks), inks
    pg.click('#hist-l .hist-i[data-i="1"]'); pg.wait_for_timeout(300)
    assert pg.evaluate(OUTL) == st[1] and info(pg)['i'] == 1, 'jump'
    cls = pg.evaluate("[...document.querySelectorAll('#hist-l .hist-i')].map(b=>b.className.replace('hist-i','').trim())")
    assert cls == ['redo', 'redo', 'cur', ''], cls  # newest first: the two later entries stay as redo
    pg.keyboard.press('Escape'); pg.wait_for_function("document.querySelector('#hist').hidden")
    assert pg.evaluate("document.activeElement.id") == 'hist-btn', 'focus returns to the button'
    pg.evaluate("snap();cur().p.desc=230;bump();"); settle(pg, 3)
    w = info(pg); assert w['i'] == 2 and w['n'] == 3 and pg.is_disabled('#redo'), ('new edit truncates redo', w)
    # 6. per-glyph edit + kerning + italic labels
    pg.evaluate("selectGlyph('Ж');snap();ed().sbL=30;bump();"); settle(pg, 4)
    assert info(pg)['labels'][-1] == 'Буква Ж', info(pg)
    pg.evaluate("setTab('kern')"); pg.wait_for_timeout(300)
    pg.evaluate("kkPick('А','В');kkSet(40);"); settle(pg, 5)
    assert info(pg)['labels'][-1] == 'Кернинг А–В', info(pg)
    k1 = pg.evaluate("kernOf('А','В','regular')")
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(300)
    assert pg.evaluate("kernOf('А','В','regular')") != 40 or k1 != 40, 'kerning undo'
    assert pg.evaluate("kernOf('А','В','regular')") != k1 or k1 == 0
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(300)
    assert pg.evaluate("kernOf('А','В','regular')") == k1, 'kerning redo'
    pg.evaluate("setTab('edit')"); pg.evaluate("S.style='italic';syncPanel&&syncPanel();snap();cur().p.stem=210;bump();"); settle(pg, 6)
    assert 'Италик' in info(pg)['labels'][-1], info(pg)
    pg.evaluate("S.style='regular';syncPanel()")
    # 7. restore everything: all outlines equal to the recorded ones at the matching steps, build ok after a jump into the middle
    pg.evaluate("HIST.go('ed',0)"); pg.wait_for_timeout(300)
    assert pg.evaluate(OUTL) == st[0], 'jump to the start restores the original outlines'
    assert pg.evaluate("S.edits['Ж']===undefined||!S.edits['Ж'].sbL"), 'glyph edit gone'
    pg.evaluate("HIST.go('ed',HIST.info('ed').n-1)"); pg.wait_for_timeout(300)
    assert pg.evaluate("S.edits['Ж']&&S.edits['Ж'].sbL")==30 and pg.evaluate("kernOf('А','В','regular')") == k1
    fn, data, _ = s.download('ttf'); f = ttf_bytes_ok(data); assert len(f.getGlyphOrder()) > 100, 'buildable font after restore'
    # 8. cap and memory: 130 quick edits -> at most 100 entries (+ the oldest kept as the base)
    pg.evaluate("for(let k=0;k<130;k++){snap();cur().p.stem=100+(k%90);bump();HIST.flush('ed');}")
    w = info(pg); assert w['n'] <= 101 and w['i'] == w['n'] - 1, w
    # 9. previews: many entries, no long task while they are generated (observer lives only while the panel renders)
    pg.wait_for_timeout(3000)   # let the thumbnail / library redraws queued by the edits above finish: they are not preview work
    pg.evaluate("window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration))).observe({entryTypes:['longtask']})}catch(e){}")
    pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("[...document.querySelectorAll('#hist-l .hist-i')].slice(0,6).every(b=>b.querySelector('canvas'))", timeout=5000)
    pg.wait_for_function("(" + INK + ")().slice(0,6).every(n=>n>20)", timeout=20000)
    # every drawn preview is fitted: ink keeps >= 4 canvas px from every edge (a glyph preview was once a cropped blob)
    bad = pg.evaluate("""[...document.querySelectorAll('#hist-l .hist-pv canvas')].map((c,i)=>{const W=c.width,H=c.height,d=c.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>20){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
      return x1<0?null:[i,x0,y0,W-1-x1,H-1-y1];}).filter(r=>r&&Math.min(r[1],r[2],r[3],r[4])<4)""")
    assert not bad, ('preview ink touches the thumbnail edge', bad)
    lt = pg.evaluate("window.__lt"); assert not lt or max(lt) < 100, ('long tasks', lt)
    # the panel stays inside the viewport and the rows do not overflow it
    r = pg.evaluate("(()=>{const q=document.querySelector('#hist').getBoundingClientRect();return [q.left,q.top,q.right,q.bottom,innerWidth,innerHeight]})()")
    assert r[0] >= 0 and r[1] >= 0 and r[2] <= r[4] and r[3] <= r[5], r
    ov = pg.evaluate("[...document.querySelectorAll('#hist .hist-i')].filter(b=>b.scrollWidth>b.clientWidth+1).length"); assert ov == 0, ov
    _shot(pg, os.path.join(LOGS, 'history_panel.png'))
    pg.keyboard.press('Escape')
    assert not s.errs, s.errs[:3]
    s.close()
    return f"editor ok n={w['n']} long={max(lt) if lt else 0}"


def draw(p):
    from e2e_draw import setup
    s, d = setup(p, 'histdraw'); pg = s.pg
    pg.wait_for_function("HIST.info('dr')&&HIST.info('dr').n===1", timeout=5000)
    pg.evaluate("dwClose('draw')")
    d.tool('cells'); pg.wait_for_timeout(300)
    c = lambda i, j: ((i + .5) * 70, (j + .5) * 70)
    d.goto('Н') if hasattr(d, 'goto') else None
    d.path([c(2, 8), c(2, 1)], steps=2); pg.wait_for_timeout(1600)
    base = info(pg, 'dr')['n'] - 1      # index of the state after the first stroke (the first stroke also settles the project meta)
    d.path([c(6, 8), c(6, 1)], steps=2); pg.wait_for_timeout(560)
    w = info(pg, 'dr'); assert w['n'] == base + 2 and w['labels'][-1].startswith('Ячейки') and w['i'] == base + 1, w
    n2 = pg.evaluate("GT_DRAW._t.cl.cellN(GT_DRAW._t.cl.curCell())")
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(300)
    w = info(pg, 'dr'); n1 = pg.evaluate("GT_DRAW._t.cl.cellN(GT_DRAW._t.cl.curCell())")
    assert w['n'] == base + 2 and w['i'] == base and n1 < n2, ('local undo moves the pointer', w, n1, n2)
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(300)
    assert info(pg, 'dr')['i'] == base + 1
    pg.click('#dr-hist'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("(" + INK + ")().slice(0,2).every(n=>n>20)", timeout=15000)
    r = pg.evaluate("(()=>{const q=document.querySelector('#hist').getBoundingClientRect();return [q.left,q.top,q.right,q.bottom,innerWidth,innerHeight]})()")
    assert r[0] >= 0 and r[1] >= 0 and r[2] <= r[4] and r[3] <= r[5], ('draw: history panel (anchored to the floating toolbar) stays inside the viewport', r)
    pg.click(f'#hist-l .hist-i[data-i="{base}"]'); pg.wait_for_timeout(500)
    n1b = pg.evaluate("GT_DRAW._t.cl.cellN(GT_DRAW._t.cl.curCell())")
    assert info(pg, 'dr')['i'] == base and n1b == n1, ('jump restores the drawing', n1b, n1)
    pg.click('#hist-l .hist-i[data-i="0"]'); pg.wait_for_timeout(500)
    assert pg.evaluate("GT_DRAW._t.cur.items.length") == 0 and info(pg, 'dr')['i'] == 0
    pg.keyboard.press('Escape')
    assert not s.errs, s.errs[:3]
    s.close()
    return 'draw ok'


def edit3(pg):
    """three separate editor entries on the current font"""
    pg.evaluate("snap();cur().p.xh=560;bump();snap();cur().p.capH=715;bump();snap();cur().p.stem=230;bump();")
    settle(pg, 4)


def wait_saved(pg):
    pg.evaluate("HIST.flushStore()")
    pg.wait_for_function("HIST.store.pending===0", timeout=8000)
    pg.evaluate("HIST.flushStore()"); pg.wait_for_timeout(300)


def reload_page(s, pg):
    from e2e_port import reload_keep
    wait_saved(pg)
    pg.evaluate("persistWrite&&persistWrite()") if pg.evaluate("typeof persistWrite==='function'") else None
    pg.wait_for_timeout(300)
    reload_keep(s, pg)
    pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && typeof HIST!=='undefined' && !!document.querySelector('#hist-btn')", timeout=30000)


def switch_and_reload(p):
    s = Session(p, 'histpers'); pg = s.pg
    s.open_font('volt'); pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
    o0 = pg.evaluate(OUTL)
    edit3(pg)
    a = info(pg); assert a['n'] == 4, a
    o3 = pg.evaluate(OUTL)
    # font switch and back keeps the timeline (and the pointer) of each font separately
    s.open_font('kvadra'); pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
    pg.evaluate("snap();cur().p.stem=190;bump();"); settle(pg, 2)
    kv = info(pg); assert kv['n'] == 2, kv
    s.open_font('volt'); pg.wait_for_function("S.fontId==='volt'&&HIST.info('ed')", timeout=5000)
    b = info(pg); assert b['n'] == 4 and b['i'] == 3 and b['labels'] == a['labels'], ('switch back', a, b)
    pg.evaluate("HIST.go('ed',1)"); pg.wait_for_timeout(250)
    s.open_font('kvadra'); s.open_font('volt')
    c = info(pg); assert c['n'] == 4 and c['i'] == 1, ('pointer kept', c)
    pg.evaluate("HIST.go('ed',3)"); pg.wait_for_timeout(250)
    # reload: the timeline comes back, the jump works
    reload_page(s, pg)
    pg.wait_for_function("S.fontId==='volt'", timeout=10000)
    pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===4", timeout=10000)
    d = info(pg); assert d['i'] == 3 and d['labels'] == a['labels'], ('reload', a, d)
    assert pg.evaluate(OUTL) == o3, 'state after reload'
    pg.evaluate("document.querySelector('#undo').click()"); pg.wait_for_timeout(250)
    assert info(pg)['i'] == 2 and not pg.is_disabled('#undo'), 'undo after reload'
    pg.evaluate("HIST.go('ed',0)"); pg.wait_for_timeout(300)
    assert pg.evaluate(OUTL) == o0, 'jump to the first entry after reload restores the original outlines'
    pg.evaluate("setTab('edit')"); pg.wait_for_function("S.tab==='edit'", timeout=10000)
    pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("(" + INK + ")().slice(0,4).every(n=>n>20)", timeout=15000)
    pg.keyboard.press('Escape')
    # the other font's timeline was saved too
    s.open_font('kvadra'); pg.wait_for_function("HIST.info('ed').n===2", timeout=8000)
    assert not s.errs, s.errs[:3]
    s.close()
    return "switch+reload ok"


def eviction(p):
    s = Session(p, 'histev'); pg = s.pg
    s.open_font('volt'); pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
    assert pg.evaluate("HIST.store.open().then(k=>k)") in ('idb', 'ls'), 'storage should be available'
    # size caps: entries and bytes
    pg.evaluate("for(let k=0;k<130;k++){snap();cur().p.stem=100+(k%90);bump();HIST.flush('ed');}")
    r = pg.evaluate("(()=>{const t=HIST._t.T['ed:volt'];const big=HIST._t.encode(t,2e6),small=HIST._t.encode(t,95000);const d=HIST._t.decode(big),ds=HIST._t.decode(small);"
                    "return {n:t.list.length,i:t.i,big:[big.list.length,big.bytes,big.i,d&&d.list.length,d&&d.i],small:[small.list.length,small.bytes,small.i,ds&&ds.list.length,ds&&ds.i]}})()")
    assert r['big'][0] <= 101 and r['big'][1] <= 2e6 and r['big'][3] == r['big'][0], r
    assert r['small'][0] < r['big'][0] and r['small'][1] <= 95000 and r['small'][3] == r['small'][0], ('byte cap trims old entries', r)
    assert r['small'][2] == r['small'][0] - 1, ('pointer entry survives the trim', r)
    # overall cap: least recently used fonts are evicted, the open font stays
    for fid in ('kvadra', 'stroka', 'codex'):
        s.open_font(fid); pg.wait_for_function(f"S.fontId==='{fid}'&&HIST.info('ed')", timeout=8000)
        pg.evaluate("snap();cur().p.stem=cur().p.stem+7;bump();"); settle(pg, 2)
        wait_saved(pg)
    s.open_font('volt'); pg.evaluate("snap();cur().p.stem=cur().p.stem+9;bump();"); settle(pg)
    pg.evaluate("HIST._t.ST.total=60000")
    wait_saved(pg)
    left = pg.evaluate("Promise.all(['ed:volt','ed:kvadra','ed:stroka','ed:codex'].map(k=>HIST.store.get(k).then(v=>[k,!!v])))")
    left = dict(left)
    assert left['ed:volt'], ('the open font is kept', left)
    assert not all(left.values()), ('LRU eviction removed old fonts', left)
    # a removed font in memory is reloaded cleanly: no error
    s.open_font('kvadra'); pg.wait_for_function("S.fontId==='kvadra'&&HIST.info('ed')", timeout=8000)
    assert not s.errs, s.errs[:3]
    s.close()
    return f"caps ok big={r['big'][:2]} small={r['small'][:2]} left={sum(left.values())}/4"


BLOCK_IDB = "Object.defineProperty(window,'indexedDB',{get(){throw new Error('idb blocked')},configurable:true});"
BLOCK_LS = ("(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(String(k).indexOf('gtype-hist')===0)throw new DOMException('blocked','SecurityError');return o.apply(this,arguments)};})();")
QUOTA = ("(()=>{const o=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(String(k)!=='__x')throw new DOMException('quota','QuotaExceededError');return o.apply(this,arguments)};})();")


def blocked(p):
    out = []
    for name, script, kinds in (('idb+ls blocked', BLOCK_IDB + BLOCK_LS, (None,)), ('idb blocked -> localStorage', BLOCK_IDB, ('ls',)), ('quota', QUOTA, ('idb',))):
        s = Session.__new__(Session)
        s.name = 'histblk'
        s.b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium') if os.path.exists('/opt/pw-browsers/chromium') else p.chromium.launch()
        s.ctx = s.b.new_context(viewport={'width': 1440, 'height': 900})
        s.pg = pg = s.ctx.new_page(); s.errs = []
        pg.on('pageerror', lambda e: s.errs.append(str(e)))
        pg.on('console', lambda m: s.errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
        s.ctx.add_init_script(TOUR_OFF); s.ctx.add_init_script(script)
        from common import PAGE
        pg.goto('file://' + PAGE)
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        s.open_font('volt'); pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
        edit3(pg)
        pg.evaluate("HIST.flushStore()"); pg.wait_for_timeout(800)
        pg.evaluate("HIST.flushStore()"); pg.wait_for_timeout(500)
        k = pg.evaluate("HIST.store.open().then(k=>k)")
        assert k in kinds, (name, k)
        a = info(pg); assert a['n'] == 4, a
        pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
        assert info(pg)['i'] == 2, 'undo works without storage'
        s.open_font('kvadra'); s.open_font('volt')
        b = info(pg); assert b['n'] == 4 and b['i'] == 2, ('in-memory timeline survives a font switch', name, b)
        pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])'); pg.keyboard.press('Escape')
        assert not s.errs, (name, s.errs[:3])
        s.close(); out.append(f'{name}={k}')
    return 'blocked ok ' + ', '.join(out)


CU_REC = ("{k:'xh',skel:[%s]}")


def cu_preview(p):
    s = Session(p, 'histcu'); pg = s.pg
    s.open_font('volt'); pg.wait_for_function("HIST.info('ed')&&HIST.info('ed').n===1", timeout=5000)
    setc = """(sk)=>{snap();S.custom['ѣ']=cuSan({k:'xh',skel:sk});cuInstall1(S.fontId,'ѣ');cuAfter();S.sel='ѣ';cache.clear();bump();}"""
    stem = "{nodes:[{x:110,y:0,type:'corner'},{x:110,y:420,type:'corner'}]}"
    bar = "{nodes:[{x:30,y:300,type:'corner'},{x:330,y:300,type:'corner'}]}"
    st1 = [{'nodes': [{'x': 110, 'y': 0, 'type': 'corner'}, {'x': 110, 'y': 420, 'type': 'corner'}]}]
    st2 = st1 + [{'nodes': [{'x': 30, 'y': 300, 'type': 'corner'}, {'x': 330, 'y': 300, 'type': 'corner'}]}]
    st3 = st2 + [{'nodes': [{'x': 40, 'y': 20, 'type': 'corner'}, {'x': 320, 'y': 400, 'type': 'corner'}]}]
    for k, sk in enumerate((st1, st2, st3)):
        pg.evaluate("([f,sk])=>(0,eval(f))(sk)", [setc, sk]); settle(pg, k + 2)   # wait for the entry itself: a slow idle commit must not merge two steps
    w = info(pg); assert w['n'] == 4 and all('ѣ' in x for x in w['labels'][1:]), w
    pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("(" + INK + ")().slice(0,4).every(n=>n>20)", timeout=15000)
    urls = pg.evaluate("[...document.querySelectorAll('#hist-l .hist-i')].map(b=>({i:+b.dataset.i,u:b.querySelector('canvas').toDataURL()}))")
    byi = {u['i']: u['u'] for u in urls}
    assert len({byi[1], byi[2], byi[3]}) == 3, 'historical drawn-glyph previews must differ from each other (and from the current drawing)'
    # the preview of step 1 equals what the glyph looked like then: render it again on its own, on the fresh state
    pg.keyboard.press('Escape')
    pg.evaluate("HIST.go('ed',1)"); pg.wait_for_timeout(300)
    pg.click('#hist-btn'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("(" + INK + ")().slice(0,4).every(n=>n>20)", timeout=15000)
    after = pg.evaluate("[...document.querySelectorAll('#hist-l .hist-i')].map(b=>({i:+b.dataset.i,u:b.querySelector('canvas').toDataURL()}))")
    ai = {u['i']: u['u'] for u in after}
    assert ai[1] == byi[1] and ai[3] == byi[3], 'a preview does not depend on the current drawing'
    # the sample glyph of the real (global) GL was restored
    assert pg.evaluate("GL['ѣ']===undefined||typeof GL['ѣ'].shape==='function'")
    pg.keyboard.press('Escape')
    assert not s.errs, s.errs[:3]
    s.close()
    return 'custom preview ok'


def draw_reload(p):
    from e2e_draw import setup
    from e2e_port import reload_keep
    s, d = setup(p, 'histdrr'); pg = s.pg
    pg.wait_for_function("HIST.info('dr')&&HIST.info('dr').n===1", timeout=5000)
    pg.evaluate("dwClose('draw')")
    d.tool('cells'); pg.wait_for_timeout(300)
    c = lambda i, j: ((i + .5) * 70, (j + .5) * 70)
    d.path([c(2, 8), c(2, 1)], steps=2); pg.wait_for_timeout(1600)
    d.path([c(6, 8), c(6, 1)], steps=2); pg.wait_for_timeout(700)
    a = info(pg, 'dr'); assert a['n'] >= 3, a
    n_items = pg.evaluate("GT_DRAW._t.cl.cellN(GT_DRAW._t.cl.curCell())")
    wait_saved(pg)
    pg.evaluate("GT_DRAW.onHide()")
    ls = pg.evaluate("localStorage.getItem('gtype-draw-n7')")
    s.ctx.add_init_script("try{if(!localStorage.getItem('gtype-draw-n7'))localStorage.setItem('gtype-draw-n7',%s)}catch(e){}" % json.dumps(ls))
    reload_keep(s, pg)
    pg.wait_for_function("typeof S!=='undefined'&&typeof GT_DRAW!=='undefined'&&typeof HIST!=='undefined'", timeout=30000)
    from draw_scaffold import SCAFFOLD
    pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv')
    pg.wait_for_function(f"HIST.info('dr')&&HIST.info('dr').n=={a['n']}", timeout=10000)
    b = info(pg, 'dr'); assert b['i'] == a['i'] and b['labels'] == a['labels'], ('draw reload', a, b)
    pg.evaluate("dwClose('draw')")
    pg.click('#dr-hist'); pg.wait_for_selector('#hist:not([hidden])')
    pg.wait_for_function("(" + INK + ")().slice(0,2).every(n=>n>20)", timeout=15000)
    pg.click('#hist-l .hist-i[data-i="0"]'); pg.wait_for_timeout(500)
    assert pg.evaluate("GT_DRAW._t.cur.items.length") == 0 and info(pg, 'dr')['i'] == 0, 'jump after reload'
    pg.click(f'#hist-l .hist-i[data-i="{a["i"]}"]'); pg.wait_for_timeout(500)
    assert pg.evaluate("GT_DRAW._t.cl.cellN(GT_DRAW._t.cl.curCell())") == n_items, 'jump forward after reload restores the drawing'
    pg.keyboard.press('Escape')
    assert not s.errs, s.errs[:3]
    s.close()
    return 'draw reload ok'


if __name__ == '__main__':
    sys.exit(check_all([('history-editor', editor), ('history-draw', draw), ('history-persist', switch_and_reload), ('history-caps', eviction), ('history-blocked', blocked), ('history-custom-preview', cu_preview), ('history-draw-reload', draw_reload)]))
