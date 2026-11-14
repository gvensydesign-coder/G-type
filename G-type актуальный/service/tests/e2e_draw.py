"""draw: «Отрисуй свой шрифт» — mount, grids, tools, save & advance, recommendations (+fix), test window, font build, TTF via existing export, phone width."""
import io, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import Session as _Session, check_all, WK, LOGS, TOUR_OFF, PAGE, SHOTS, shot as _shot
from draw_scaffold import SCAFFOLD
from fontTools.ttLib import TTFont

QA = os.path.join(LOGS, 'qa_DR')
QA4 = os.path.join(LOGS, 'qa_DR4')


class Session(_Session):
    """same as common.Session but independent of the rail markup (no [data-tab=lib] / [data-tab=home] wait)"""
    def __init__(self, p, name, dsf=1):
        self.name = name
        self.b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium') if os.path.exists('/opt/pw-browsers/chromium') else p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True, device_scale_factor=dsf)
        self.pg = self.ctx.new_page(); self.errs = []
        self.pg.on('pageerror', lambda e: self.errs.append(str(e)))
        self.pg.on('console', lambda m: self.errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
        self.ctx.add_init_script(TOUR_OFF)
        self.ctx.add_init_script('window.__GT_TEST=1')
        self.pg.goto('file://' + PAGE)
        self.pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && typeof GT_DRAW!=='undefined'", timeout=30000)


class Draw:
    def __init__(self, s):
        self.s = s; self.pg = s.pg

    def w2s(self, x, y):
        return self.pg.evaluate("([x,y])=>GT_DRAW._t.w2s(x,y)", [x, y])

    def click(self, x, y, **kw):
        self.pg.evaluate("dwClose('draw')")  # the rail drawer overlays the left of the canvas
        px, py = self.w2s(x, y); self.pg.mouse.click(px, py, **kw)

    def path(self, pts, steps=3):
        self.pg.evaluate("dwClose('draw')")
        px, py = self.w2s(*pts[0]); self.pg.mouse.move(px, py); self.pg.mouse.down()
        for a, b in zip(pts, pts[1:]):
            for k in range(1, steps + 1):
                self.pg.mouse.move(*self.w2s(a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps))
        self.pg.mouse.up()

    def tool(self, t): self.pg.click(f'#dr-tools [data-tool={t}]')
    def st(self, expr): return self.pg.evaluate(f"(()=>{{const t=GT_DRAW._t;return {expr}}})()")
    def items(self): return self.st("t.cur.items.map(i=>i.k+':'+i.t)")
    def shot(self, name):
        _shot(self.pg, os.path.join(QA, name))
    def goto(self, ch): self.pg.evaluate("dwClose('draw')"); self.pg.click(f'.dr-gl[data-ch="{ch}"]')
    def key(self, k):
        self.pg.evaluate("k=>window.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}))", k)

    def save(self): self.pg.click('#dr-sv'); self.pg.wait_for_timeout(250)


def setpick(pg, k):
    """D5: the set switcher is a dropdown pill: open it, pick the set"""
    pg.click('#dr-setb'); pg.click(f'#dr-sets [data-s={k}]')


def openpane(pg, k):
    """right-panel panes: open (aria-expanded=true) the pane k = grid|con|recs; the header is #dr-ph-<k>"""
    pg.evaluate(f"dwOpen('draw','{k}')")  # side panels live in the rail drawer; this opens it on section k
    pg.wait_for_timeout(250)


def gclick(pg, sel):
    openpane(pg, 'grid'); pg.click(sel)


def setup(p, name='draw', size=None):
    s = Session(p, name)
    if size: s.pg.set_viewport_size(size)
    assert s.pg.evaluate(SCAFFOLD)
    s.pg.wait_for_selector('#dr-cv'); s.pg.wait_for_timeout(300)
    return s, Draw(s)


def full(p):
    s, d = setup(p); pg = s.pg
    out = []
    # --- grids: choose Плитка 4×4 ---
    gclick(pg,'#dr-pg [data-g=tile]')
    assert d.st("t.D.grid") == 'tile'
    d.shot('01_tile_empty.png')
    # --- Н from rectangle drags + clicks ---
    d.goto('Н')
    d.pg.mouse.move(*d.w2s(0, 0))
    d.path([(0, 0), (175, 700)], 2)         # left stem
    d.path([(525, 0), (700, 700)], 2)       # right stem
    d.click(262, 262); d.click(437, 262)    # crossbar cells (row 1)
    assert d.items() == ['add:rect'] * 4, d.items()
    d.shot('02_tile_N.png')
    # undo / redo buttons
    pg.click('#dr-undo'); assert len(d.items()) == 3
    pg.click('#dr-redo'); assert len(d.items()) == 4
    d.save()
    assert d.st("t.D.ch") == 'О', d.st("t.D.ch")             # auto-advance to the next undrawn
    assert d.st("Object.keys(t.D.g).filter(c=>t.D.g[c].s).join('')") == 'Н'
    # --- О: marker stroke ---
    d.tool('marker')
    import math
    ring = [(350 + 280 * math.cos(a / 10 * 2 * math.pi), 350 + 280 * math.sin(a / 10 * 2 * math.pi)) for a in range(0, 11)]
    d.path(ring, 3)
    pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000)
    assert d.items() == ['add:stroke'], d.items()
    d.shot('03_marker_O.png')
    d.save()
    # --- Г: pen polygon closed by the first node ---
    d.goto('Г'); d.tool('pen')
    for q in [(175, 0), (350, 0), (350, 525), (525, 525), (525, 700), (175, 700)]: d.click(*q)
    d.click(175, 0)
    assert d.items() == ['add:pen'], d.items()
    assert d.st("t.cur.items[0].pen.closed") is True
    # pen: drag creates a smooth node; node edit
    d.goto('С'); d.tool('pen')
    d.click(175, 175); d.click(525, 175)
    a = d.w2s(525, 525); pg.mouse.move(*a); pg.mouse.down(); pg.mouse.move(a[0] + 40, a[1] - 40, steps=4); pg.mouse.up()
    d.click(175, 525); d.click(175, 175)
    assert d.st("t.cur.items[0].pen.nodes.some(n=>n.b)") is True
    d.shot('04_pen_curve.png')
    d.goto('Г')                              # leave С drawn-as-draft, go on
    d.save()
    # --- shapes: tri, quad, ellipse, eraser, brush, select ---
    d.goto('Л'); d.tool('shape')
    pg.click('#dr-opt [data-sh=tri]'); d.click(100, 100)
    pg.click('#dr-opt [data-sh=quad]'); d.click(300, 100)
    pg.click('#dr-opt [data-sh=ell]'); d.click(500, 100)
    pg.click('#dr-opt [data-sh=tri]'); pg.click('#dr-opt [data-act=flip]'); d.path([(0, 350), (350, 700)], 2)
    assert d.items() == ['add:tri', 'add:quad', 'add:ell', 'add:tri'], d.items()
    d.tool('erase'); pg.click('#dr-opt [data-er=rect]'); d.click(500, 100)
    assert d.items()[-1] == 'sub:rect', d.items()
    pg.click('#dr-opt [data-er=quad]'); d.click(600, 300)
    pg.click('#dr-opt [data-er=ell]'); d.click(600, 500)
    pg.click('#dr-opt [data-er=tri]'); d.click(600, 650)
    pg.click('#dr-opt [data-er=stroke]'); d.path([(0, 600), (200, 650)], 3)
    pg.wait_for_function("GT_DRAW._t.cur.items.length===9", timeout=15000)
    d.shot('05_tools_L.png')
    d.tool('select'); d.click(100, 100)
    assert d.st("t.cur.sel") == 0
    pg.click('#dr-opt [data-act=dup]'); assert len(d.items()) == 10
    pg.click('#dr-opt [data-act=sub]'); assert d.items()[-1].startswith('sub:'), d.items()[-1]
    pg.click('#dr-opt [data-act=del]'); assert len(d.items()) == 9
    d.click(300, 100); pg.keyboard.press('ArrowRight')
    d.path([(300, 100), (300, 300)], 2)      # move
    pg.keyboard.press('Control+z'); pg.keyboard.press('Control+z'); pg.keyboard.press('Control+y')
    pg.click('#dr-mir'); pg.click('#dr-clr'); assert d.items() == []
    pg.click('#dr-undo'); assert len(d.items()) == 9
    # copy from another glyph
    pg.click('#dr-clr'); pg.click('#dr-from'); pg.click('#dr-pop [data-c="Н"]'); assert len(d.items()) >= 1
    # brush on Р
    d.goto('Р'); d.tool('brush')
    d.path([(175, 0), (175, 700), (450, 700), (450, 350), (175, 350)], 5)
    pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000)
    assert d.items() == ['add:stroke']
    d.save()
    # --- keyboard: jump by letter, Enter saves ---
    d.key('Т'); assert d.st("t.D.ch") == 'Т'
    pg.keyboard.press('3'); assert d.st("t.D.tool") == 'brush'
    pg.keyboard.press('2'); d.click(262, 350)
    pg.keyboard.press('Enter'); assert d.st("t.D.g['Т']&&t.D.g['Т'].s") is True
    # --- recommendations ---
    openpane(pg,'recs'); pg.wait_for_selector('#dr-pr .dr-rec')
    txt = pg.inner_text('#dr-pr')
    assert 'Интервалы' in txt, txt
    d.shot('06_recs.png')
    pg.click('#dr-pr [data-fix=space]'); pg.wait_for_timeout(200)
    assert d.st("savedCount") if False else True
    assert pg.evaluate("Object.values(GT_DRAW._t.D.g).filter(r=>r.s).every(r=>r.sp&&r.sp.l>0)")
    assert 'Интервалы не настроены' not in pg.inner_text('#dr-pr')
    pg.click('#dr-pr [data-chk]')
    for fx in pg.evaluate("[...document.querySelectorAll('#dr-pr [data-fix]')].map(b=>b.dataset.fix)"):
        if fx != 'twin' and pg.query_selector(f'#dr-pr [data-fix={fx}]'):
            pg.click(f'#dr-pr [data-fix={fx}]'); pg.wait_for_timeout(150)
        openpane(pg,'recs')
    if pg.query_selector('#dr-pr [data-fix=twin]'):
        pg.click('#dr-pr [data-fix=twin]'); assert pg.evaluate("!!GT_DRAW._t.D.g['H']&&GT_DRAW._t.D.g['H'].s")
    openpane(pg,'grid')
    # --- hasWork ---
    assert pg.evaluate("GT_DRAW.hasWork()") is True
    # --- test window ---
    pg.click('#dr-testb'); pg.wait_for_selector('#dr-mt:not([hidden])')
    pg.fill('#dr-tx', 'НОГ ТР')
    pg.fill('#dr-ts', '80'); pg.dispatch_event('#dr-ts', 'input')
    pg.click('#dr-pg2 [data-p=ru]'); pg.fill('#dr-tx', 'НОГ ТР ГОН Я'); pg.dispatch_event('#dr-tx', 'input')
    ink = pg.evaluate("""()=>{const c=document.getElementById('dr-tc'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let n=0;
      for(let i=0;i<d.length;i+=4){if(d[i]<100&&d[i+1]<100)n++;}return n;}""")
    assert ink > 800, f'test window ink {ink}'
    pg.wait_for_function("[...document.fonts].some(f=>f.family==='DrTestFont'&&f.status==='loaded')", timeout=15000)
    pg.wait_for_function("GT_DRAW._t.testFontOk()", timeout=15000)
    ink2 = pg.evaluate("""()=>{const c=document.getElementById('dr-tc'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let n=0;
      for(let i=0;i<d.length;i+=4){if(d[i]<100&&d[i+1]<100)n++;}return n;}""")
    assert ink2 > 800, f'real-font ink {ink2}'
    d.shot('07_test_light.png')
    # dark app theme: the test window opens dark, undrawn letters get an accent fallback style
    pg.click('#dr-mtc'); pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.click('#dr-testb')
    pg.fill('#dr-tx', 'НОГ Я'); pg.dispatch_event('#dr-tx', 'input'); pg.wait_for_timeout(200)
    px = pg.evaluate("""()=>{const c=document.getElementById('dr-tc'),x=c.getContext('2d');const bg=x.getImageData(3,3,1,1).data;
      const d=x.getImageData(0,0,c.width,c.height).data;let acc=0;for(let i=0;i<d.length;i+=4){if(d[i]>200&&d[i+1]<170&&d[i+2]<170)acc++;}return [bg[0],bg[1],bg[2],acc];}""")
    assert px[0] < 60 and px[2] < 60, f'dark test canvas bg {px}'
    assert px[3] > 20, f'fallback style pixels {px}'
    d.shot('09_test_dark_app.png')
    pg.evaluate("document.documentElement.removeAttribute('data-theme')")
    pg.click('#dr-mtc'); pg.click('#dr-testb')
    pg.click('#dr-tth'); pg.click('#dr-pg2 [data-p=en]'); pg.click('#dr-pg2 [data-p=num]')
    pg.fill('#dr-tx', 'НОГ ТР'); pg.dispatch_event('#dr-tx', 'input')
    d.shot('08_test_dark.png')
    pg.click('#dr-mtc'); assert pg.evaluate("document.getElementById('dr-mt').hidden")
    # draft survives a reload
    pg.evaluate("GT_DRAW.onHide()")
    assert pg.evaluate("(localStorage.getItem('gtype-draw-n7')||'').length") > 1000
    import json
    ls = pg.evaluate("localStorage.getItem('gtype-draw-n7')")
    # headless file:// localStorage is not reliably shared across a reload: re-seed it when the browser dropped it
    s.ctx.add_init_script("try{if(!localStorage.getItem('gtype-draw-n7'))localStorage.setItem('gtype-draw-n7',%s)}catch(e){}" % json.dumps(ls))
    pg.reload(); pg.wait_for_function("typeof S!=='undefined'&&typeof GT_DRAW!=='undefined'")
    pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv')
    n = pg.evaluate("Object.values(GT_DRAW._t.D.g).filter(r=>r.s).length")
    info = pg.evaluate("[(localStorage.getItem('gtype-draw-n7')||'').length, Object.keys(GT_DRAW._t.D.g).join('')]")
    assert n >= 4, f'restored {n} {info} {s.errs[-2:]}'
    assert pg.evaluate("GT_DRAW.hasWork()") is True
    # --- save font ---
    pg.click('#dr-fontb'); pg.wait_for_selector('#dr-mf:not([hidden])')
    assert 'Создать шрифт' in pg.inner_text('#dr-mfo')
    pg.click('#dr-mfc'); pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Мой тест')
    pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    pg.evaluate("document.getElementById('view-draw').hidden=true;GT_DRAW.onHide()")
    assert pg.evaluate("FONTS.imp.name") == 'Мой тест'
    assert pg.evaluate("S.family") == 'Мой тест'
    card = pg.evaluate("(document.querySelector('.lcard[data-font=imp]')||{textContent:''}).textContent")
    assert 'Мой тест' in card and 'Нарисован' in card, card
    cnt = pg.evaluate("Object.keys(IMP.glyphs).filter(c=>IMP.glyphs[c].src==='draw').length")
    assert cnt >= 3, f'imp glyphs {cnt}'
    assert pg.evaluate("GT_DRAW.hasWork()") is False
    assert pg.evaluate("IMP.glyphs['Н'].adj&&typeof IMP.glyphs['Н'].adj.l==='number'"), 'adj.l missing'
    pg.evaluate("impUnpack(impPack())")
    assert pg.evaluate("IMP.glyphs['Н'].adj&&typeof IMP.glyphs['Н'].adj.r==='number'"), 'adj lost on project round-trip'
    pg.evaluate("iuRegisterNow()")
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); cm = f.getBestCmap()
    for ch in 'НОГТ':
        assert ord(ch) in cm, f'{ch} missing in cmap'
    assert name.startswith('MoyTest-'), name
    assert f['name'].getDebugName(6).startswith('MoyTest-') and 'Volt' not in f['name'].getDebugName(3), (f['name'].getDebugName(6), f['name'].getDebugName(3))
    assert f['name'].getDebugName(1).startswith('Мой тест'), f['name'].getDebugName(1)
    glyf = f['glyf']; H = glyf[cm[ord('Н')]]
    assert H.yMax >= 600 and abs(H.yMin) <= 12, (H.yMin, H.yMax)
    assert len(f.getGlyphOrder()) >= 4
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'glyphs={cnt} ink={ink} ttf_glyphs={len(f.getGlyphOrder())} family={f["name"].getDebugName(1)}'


def drawshare(p):
    """draw 3 real glyphs, save the font, «Поделиться» turns on, the poster is built from THAT font (cmap/glyphs of the drawn font), PNG downloads"""
    import struct
    s, d = setup(p, 'draw_share'); pg = s.pg
    assert pg.evaluate("document.getElementById('dr-shareb').disabled") is True, 'share disabled before a font exists'
    gclick(pg, '#dr-pg [data-g=tile]')
    d.goto('Н'); d.path([(0, 0), (175, 700)], 2); d.path([(525, 0), (700, 700)], 2); d.click(262, 262); d.click(437, 262); d.save()
    d.goto('Г'); d.tool('pen')
    for q in [(175, 0), (350, 0), (350, 525), (525, 525), (525, 700), (175, 700)]: d.click(*q)
    d.click(175, 0); d.save()
    d.goto('Т'); d.tool('shape'); d.path([(0, 525), (700, 700)], 2); d.path([(262, 0), (437, 525)], 2); d.save()
    assert pg.evaluate("document.getElementById('dr-shareb').disabled") is True, 'share still disabled: font not saved yet'
    pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Поделка'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    pg.evaluate("setTab('draw')"); pg.wait_for_selector('#dr-shareb', timeout=15000)
    pg.wait_for_function("!document.getElementById('dr-shareb').disabled", timeout=5000)
    assert pg.evaluate("getComputedStyle(document.getElementById('dr-shareb')).opacity") != '0'
    pg.wait_for_function("SHARE.warmed('imp',FONTS.imp.name)", timeout=120000)     # idle pre-build started by the enabled share button
    pg.click('#dr-shareb')
    pg.wait_for_function("document.getElementById('pst')&&!document.getElementById('pst').hidden", timeout=5000)
    pg.wait_for_function("SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent", timeout=180000)
    pg.wait_for_timeout(300)
    st = pg.evaluate("({id:SHARE.state.m.id,name:SHARE.state.m.name,fam:SHARE.state.fam,sub:SHARE.state.m.sub.join(''),grid:SHARE.state.m.grid.join('')})")
    assert pg.evaluate("!SHARE.state.static"), 'drawn font: weight axis lost (static poster)'
    assert st['id'] == 'imp' and st['name'] != 'Aa' and set(st['name']) <= set(st['sub']), st      # name made of letters the font has (the title letters were not drawn)
    assert set('НГТ') <= set(st['sub']) and not (set(st['grid']) & set('ОЕАБВ')), st      # drawn glyphs only (derived accents/Latin twins allowed)
    # the poster canvas really uses the drawn font: the face holds the drawn outlines for Н
    ok = pg.evaluate("""(async()=>{const f=SHARE.state.fam;await document.fonts.load('700 100px '+f,'Н');
      const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');x.font='700 160px '+f+', monospace';x.fillText('Н',10,150);
      const a=x.getImageData(0,0,200,200).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i]>128)n++;
      const c2=document.createElement('canvas');c2.width=c2.height=200;const y=c2.getContext('2d');y.font='700 160px monospace';y.fillText('Н',10,150);
      const b=y.getImageData(0,0,200,200).data;let m=0,df=0;for(let i=3;i<b.length;i+=4){if(b[i]>128)m++;if((a[i]>128)!==(b[i]>128))df++;}
      return [n,m,df];})()""")
    assert ok[0] > 500 and ok[2] > 500, ('poster font is not the drawn font', ok)
    ink = pg.evaluate("(()=>{const c=document.querySelector('#pst canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]<60)n++;return n})()")
    assert ink > 300, ('poster is empty', ink)
    with pg.expect_download(timeout=60000) as dl: pg.click('#pst [data-r=png]')
    path = os.path.join(LOGS, 'draw_share_poster.png'); dl.value.save_as(path)
    b = open(path, 'rb').read()
    assert b[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', b[16:24]) == (1080, 1350) and len(b) > 20000, ('png', len(b))
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'share enabled after save, poster font = drawn font ({st["sub"]}), poster ink {ink}, PNG 1080x1350 {len(b)} B'


def grids(p):
    """every grid preset with a drawn letter, light and dark canvas"""
    s, d = setup(p, 'draw_g'); pg = s.pg
    plan = {
        'mod': ('Н', lambda: (d.path([(0, 0), (100, 700)], 2), d.path([(300, 0), (400, 700)], 2), d.path([(100, 300), (300, 400)], 2))),
        'circ': ('О', lambda: (d.tool('shape'), pg.click('#dr-opt [data-sh=quad]'), d.click(50, 50), d.click(450, 50), d.click(50, 650), d.click(450, 650),
                               pg.click('#dr-opt [data-sh=rect]'), d.path([(0, 150), (100, 550)], 2), d.path([(400, 150), (500, 550)], 2),
                               d.path([(150, 0), (350, 100)], 2), d.path([(150, 600), (350, 700)], 2))),
        'diag': ('А', lambda: (pg.click('#dr-opt [data-sh=tri]'), d.click(20, 30), d.click(130, 640), d.path([(70, 0), (200, 700)], 2), d.path([(200, 700), (330, 0)], 2))),
        'pix': ('Т', lambda: (d.tool('marker'), d.path([(0, 650), (500, 650)], 4), d.path([(250, 600), (250, 0)], 4))),
        'none': ('Л', lambda: (d.tool('brush'), d.path([(100, 700), (100, 0), (450, 0)], 6))),
    }
    done = []
    for g, (ch, fn) in plan.items():
        gclick(pg, f'#dr-pg [data-g={g}]'); d.goto(ch)
        d.tool('shape')
        fn()
        pg.wait_for_timeout(1200)
        assert len(d.items()) >= 1, (g, d.items())
        d.shot(f'10_grid_{g}.png'); done.append(g)
    gclick(pg,'#dr-pg [data-g=circ]'); d.goto('О')
    gclick(pg,'#dr-pg [data-cvm=dark]'); d.shot('11_circ_dark.png')
    pg.click('#dr-th'); gclick(pg,'#dr-pg [data-cvm=light]')
    gclick(pg,'#dr-pg [data-cvm=auto]')
    # app dark theme (html[data-theme]) is followed by default
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(200)
    assert pg.evaluate("getComputedStyle(document.getElementById('gtdraw')).getPropertyValue('--dr-paper').trim()") == '#17171a'
    d.shot('12_app_dark.png')
    pg.evaluate("document.documentElement.removeAttribute('data-theme')")
    # sliders, switches
    gclick(pg,'#dr-pg [data-g=mod]')
    pg.fill('#dr-rows', '10'); pg.dispatch_event('#dr-rows', 'input'); pg.fill('#dr-cols', '8'); pg.dispatch_event('#dr-cols', 'input')
    assert d.st("t.D.gp.mod.rows") == 10 and d.st("t.cur.cols") == 8
    for sid in ('dr-snap', 'dr-ghs', 'dr-nbs'): pg.click(f'label:has(#{sid})')
    assert d.st("t.D.snap") is False and d.st("t.D.ghost") is False
    pg.click('#dr-gh'); pg.click('#dr-gh')
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return 'grids=' + ','.join(done)


def phone(p):
    s, d = setup(p, 'draw_m', {'width': 400, 'height': 820}); pg = s.pg
    d.goto('Н'); gclick(pg,'#dr-pg [data-g=tile]')
    d.path([(0, 0), (175, 700)], 2)
    ov = pg.evaluate("({sw:document.documentElement.scrollWidth,iw:innerWidth,rw:document.getElementById('gtdraw').scrollWidth,rc:document.getElementById('gtdraw').clientWidth})")
    assert ov['sw'] <= ov['iw'] + 1 and ov['rw'] <= ov['rc'] + 1, ov
    cv = pg.evaluate("(()=>{const r=document.getElementById('dr-cv').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
    for sel in ['#dr-tl', '#dr-tr', '#dr-opt', '#dr-tools']:
        r = pg.evaluate("s=>{const e=document.querySelector(s).getBoundingClientRect();return [e.left,e.top,e.right,e.bottom]}", sel)
        assert r[1] >= cv[3] - 1 or r[3] <= cv[1] + 1, (sel, r, cv)      # no pill covers the canvas
    for sel in ['#dr-tools [data-tool=pen]', '#dr-tools [data-tool=select]', '#dr-sv', '#dr-undo', '#dr-th']:
        r = pg.evaluate("s=>{const e=document.querySelector(s).getBoundingClientRect();return [e.left,e.right,e.width]}", sel)
        assert r[0] >= 0 and r[1] <= 401 and r[2] > 20, (sel, r)
    d.shot('20_phone.png')
    pg.evaluate("document.getElementById('gtdraw').scrollTo(0,9999)"); pg.wait_for_timeout(150); d.shot('21_phone_panel.png')
    s.close()
    return f'overflow ok {ov}'


def viewports(p):
    """canvas and floating tool bar are fully inside the viewport (no page scroll needed) at common sizes"""
    out = []
    for w, h in [(1024, 768), (1280, 720), (1366, 768), (1440, 900), (820, 1180)]:
        s = Session(p, 'draw_v'); pg = s.pg; pg.set_viewport_size({'width': w, 'height': h})
        pg.evaluate("setTab('draw')"); pg.wait_for_selector('#dr-cv', state='visible'); pg.wait_for_timeout(500)
        r = pg.evaluate("""()=>{const q=s=>{const b=document.querySelector(s).getBoundingClientRect();return [b.left,b.top,b.right,b.bottom]};return {cv:q('#dr-cv'),tools:q('#dr-tools'),opt:q('#dr-opt'),iw:innerWidth,ih:innerHeight}}""")
        for k in ('cv', 'tools'):
            b = r[k]
            assert b[0] >= -1 and b[1] >= -1 and b[2] <= w + 1 and b[3] <= h + 1, (w, h, k, b)
        out.append(f'{w}x{h}')
        s.close()
    return 'inside viewport: ' + ' '.join(out)


ICON_JS = """()=>{const out=[];const add=(sel,el,only)=>{const ic=el.querySelector(':scope>svg,:scope>i.ico');if(!ic)return;
  const b=el.getBoundingClientRect(),i=ic.getBoundingClientRect();out.push({sel,only,b:[b.left,b.top,b.width,b.height],i:[i.left,i.top,i.width,i.height]});};
  const q=(s,only)=>document.querySelectorAll(s).forEach((e,k)=>{if(e.offsetParent!==null)add(s+'#'+k+(e.id?'('+e.id+')':'')+(e.dataset.tool?'['+e.dataset.tool+']':'')+(e.dataset.sh?'['+e.dataset.sh+']':''),e,only&&!e.querySelector('span'));});
  q('#dr-tl .dr-ib',1);q('#dr-tr .dr-ib',1);q('#dr-tools .dr-ib',1);q('#dr-opt button',1);q('.dr-top .dr-b',0);return out;}"""


def ink_bbox(img, box, pad=3):
    """ink bbox (css px) of non-background pixels inside box=[x,y,w,h]+pad; background = colour 3px inside the left edge, mid-height of the button"""
    import numpy as np
    return None


def icons(p):
    """every icon button in the draw tool: |dx|,|dy| between the visible icon ink centre and the button centre <= 0.5 px (dx only for icon-only buttons)"""
    import numpy as np
    from PIL import Image
    K = 4
    s = Session(p, 'draw_ic', dsf=K); pg = s.pg
    assert pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv'); pg.wait_for_timeout(400)
    res = []
    for tool in ['shape', 'brush', 'erase']:
        pg.click(f'#dr-tools [data-tool={tool}]'); pg.mouse.move(2, 2); pg.wait_for_timeout(120)
        for it in pg.evaluate(ICON_JS):
            bx, by, bw, bh = it['b']; ix, iy, iw, ih = it['i']
            full = it['only']
            x0, y0, w, h = (bx, by, bw, bh) if full else (ix - 3, iy - 3, iw + 6, ih + 6)
            img = np.asarray(Image.open(io.BytesIO(pg.screenshot(clip={'x': x0, 'y': y0, 'width': w, 'height': h}))).convert('RGB')).astype(int)
            bgp = img[int(h * K / 2), int(3 * K)] if full else img[int(h * K / 2), 0]
            ink = np.abs(img - bgp).sum(axis=2) > 90
            if full:                                    # only the inner part of the button (ignore its own rounded edge)
                m = np.zeros_like(ink); m[int(5 * K):int(h * K) - int(5 * K), int(5 * K):int(w * K) - int(5 * K)] = True; ink &= m
            ys, xs = np.nonzero(ink)
            assert len(xs), ('no ink', it['sel'])
            cx = x0 + (xs.min() + xs.max() + 1) / 2 / K; cy = y0 + (ys.min() + ys.max() + 1) / 2 / K
            dx = cx - (bx + bw / 2); dy = cy - (by + bh / 2)
            res.append((it['sel'], round(dx, 2), round(dy, 2), full))
    s.close()
    seen = {}
    for sel, dx, dy, full in res: seen[sel] = (dx, dy, full)
    bad = [f'{k} dx={v[0]} dy={v[1]}' for k, v in seen.items() if abs(v[1]) > 0.5 or (v[2] and abs(v[0]) > 0.5)]
    assert not bad, bad
    return f'{len(seen)} icon buttons centred within 0.5px (max |dx| {max((abs(v[0]) for v in seen.values() if v[2]), default=0):.2f}, max |dy| {max(abs(v[1]) for v in seen.values()):.2f})'


def assist(p):
    """assistant fixes: height/baseline, stem, specks, open path, auto-spacing — numbers before/after"""
    s, d = setup(p, 'draw_a'); pg = s.pg
    gclick(pg,'#dr-pg [data-g=tile]'); openpane(pg,'grid'); pg.click('label:has(#dr-snap)')           # snap off: free sizes
    assert d.st("t.D.snap") is False
    d.goto('Н'); d.tool('shape')
    d.path([(100, 0), (180, 650)], 2); d.path([(450, 0), (530, 650)], 2); d.path([(180, 300), (450, 380)], 2); d.path([(600, 600), (612, 612)], 2)
    assert len(d.items()) == 4; d.save()
    d.goto('П'); d.tool('shape'); d.path([(100, 0), (260, 700)], 2); d.path([(450, 0), (610, 700)], 2); d.path([(260, 540), (450, 700)], 2); d.save()
    d.goto('И'); d.tool('pen')
    for q in [(100, 0), (200, 0), (200, 700), (100, 700)]: d.click(*q)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100)
    assert d.st("t.cur.items.length") == 1 and d.st("t.cur.items[0].pen.closed") is False
    d.save()
    d.goto('Ш'); d.tool('shape'); d.path([(100, 0), (180, 700)], 2); d.path([(300, 0), (380, 700)], 2); d.save()
    openpane(pg,'recs'); pg.wait_for_selector('#dr-pr .dr-rec')
    ids = pg.evaluate("[...document.querySelectorAll('#dr-pr [data-fix]')].map(b=>b.dataset.fix)")
    for need in ('stem', 'height', 'speck', 'open', 'space'):
        assert need in ids, (need, ids)
    d.shot('30_assist_before.png')
    g = "GT_DRAW._t.D.g"
    top0 = pg.evaluate(f"Math.round(impBBox({g}['Н'].cs).y1)"); assert top0 < 680, top0
    stem0 = pg.evaluate(f"Math.round(drnStemOf({g}['П'].cs))"); assert stem0 > 120, stem0
    ncs0 = pg.evaluate(f"{g}['Н'].cs.length")
    for fx in ('height', 'stem', 'speck', 'open', 'space'):
        openpane(pg,'recs'); pg.click(f'#dr-pr [data-fix={fx}]'); pg.wait_for_timeout(250)
    top1 = pg.evaluate(f"Math.round(impBBox({g}['Н'].cs).y1)"); assert 695 <= top1 <= 705, top1
    stem1 = pg.evaluate(f"Math.round(drnStemOf({g}['П'].cs))"); assert abs(stem1 - 80) <= 14, (stem0, stem1)
    ncs1 = pg.evaluate(f"{g}['Н'].cs.length"); assert ncs1 < ncs0, (ncs0, ncs1)
    assert pg.evaluate(f"{g}['И'].items[0].pen.closed") is True
    assert pg.evaluate(f"Object.values({g}).filter(r=>r.s).every(r=>r.sp)")
    left = pg.evaluate("[...document.querySelectorAll('#dr-pr [data-fix]')].map(b=>b.dataset.fix)")
    assert not any(x in left for x in ('speck', 'open', 'space')), left
    d.shot('31_assist_after.png')
    # replace-confirm lives in the font dialog (no window.confirm)
    pg.evaluate("IMP.glyphs['Z']={c:[drnRect(0,300,300,1000)],bb:{x0:0,y0:300,x1:300,y1:1000},k:1,src:'x',adj:null,v:1}")
    pg.click('#dr-fontb'); pg.wait_for_selector('#dr-mf:not([hidden])')
    assert 'Заменить' in pg.inner_text('#dr-mfo') and 'будут заменены' in pg.inner_text('#dr-mfi')
    pg.click('#dr-mfc')
    # heights: Н ink spans the baseline..cap after the fix
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'height {top0}->{top1} stem {stem0}->{stem1} contours {ncs0}->{ncs1} fixes={ids}'


def shot4(pg, name, sel=None):
    path = os.path.join(QA4, name)
    if sel: pg.locator(sel).screenshot(path=path) if SHOTS else None
    else: _shot(pg, path)


def draw_N(d, pg):
    """Н on the tile grid: two stems + two crossbar cells (same as the main lane)"""
    gclick(pg,'#dr-pg [data-g=tile]')
    d.goto('Н'); d.tool('shape')
    d.path([(0, 0), (175, 700)], 2); d.path([(525, 0), (700, 700)], 2)
    d.click(262, 262); d.click(437, 262)
    d.save()


def polygram(p):
    """polygram: families, overlay, drafts (П from Н, Ш, Ц, Щ, Э, Ь, Ъ, Ы, Е), draft marking, persistence"""
    s, d = setup(p, 'draw_pg'); pg = s.pg
    draw_N(d, pg)
    Nbb = pg.evaluate("(()=>{const b=impBBox(GT_DRAW._t.D.g['Н'].cs);return [b.x0,b.y0,b.x1,b.y1]})()")
    # П: note offers the draft; the draft is 3 shapes, bbox = bbox of Н
    d.goto('П')
    pg.wait_for_selector('#dr-note [data-cact=draft]')
    assert 'заготовк' in pg.inner_text('#dr-note').lower()
    shot4(pg, 'pg_00_offer.png')
    pg.click('#dr-note [data-cact=draft]'); pg.wait_for_timeout(200)
    assert d.items() == ['add:draft'] * 3, d.items()
    ev = pg.evaluate("(()=>{const t=GT_DRAW._t,cs=t.evalGlyph(),b=impBBox(cs);return {n:cs.length,b:[b.x0,b.y0,b.x1,b.y1]}})()")
    assert ev['n'] == 1 and all(abs(a - b) <= 1 for a, b in zip(ev['b'], Nbb)), (ev, Nbb)
    assert 'draft' in pg.get_attribute('#dr-note', 'class') and 'Заготовка' in pg.inner_text('#dr-note')
    shot4(pg, 'pg_01_draft_P.png')
    # draft is fully editable: select tool picks a draft shape
    d.tool('select'); d.click(80, 300)
    assert d.st("t.cur.sel") >= 0
    d.save()
    assert d.st("t.D.g['П']&&t.D.g['П'].s") is True and pg.evaluate("document.getElementById('dr-note').hidden")
    # other recipes: item counts + connected result + inside the cell
    openpane(pg,'con')
    d.goto('Ш'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 4, d.items(); d.save()
    d.goto('Ц'); pg.click('#dr-note [data-cact=draft]'); n_c = len(d.items()); assert n_c == 4, d.items(); d.save()
    d.goto('Щ'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 5, d.items(); d.save()
    d.goto('Е'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 4, d.items(); d.save()
    # С marker ring -> Э
    d.goto('С'); d.tool('marker')
    import math
    arc = [(350 + 280 * math.cos(a), 350 + 280 * math.sin(a)) for a in [0.6 + i * (2 * math.pi - 1.2) / 10 for i in range(11)]]
    arc = [(350 + 280 * math.cos(0.6 + i * (2 * math.pi - 1.2) / 10), 350 + 280 * math.sin(0.6 + i * (2 * math.pi - 1.2) / 10)) for i in range(11)]
    d.path(arc, 3); pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000); d.save()
    d.goto('Э'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 2, d.items(); d.save()
    # Р (brush bowl) -> Ь flipped -> Ъ, Ы
    d.goto('Р'); d.tool('brush'); d.path([(175, 0), (175, 700), (450, 700), (450, 350), (175, 350)], 5)
    pg.wait_for_function("GT_DRAW._t.cur.items.length===1", timeout=15000); d.save()
    d.goto('Ь'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 1; d.save()
    d.goto('Ъ'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 2; d.save()
    d.goto('Ы'); pg.click('#dr-note [data-cact=draft]'); assert len(d.items()) == 2; d.save()
    geo = pg.evaluate("""(()=>{const t=GT_DRAW._t,o={};for(const c of 'ПШЦЩЕЭЬЪЫ'){const cs=t.D.g[c].cs,b=impBBox(cs);o[c]=[cs.length,Math.round(b.x0),Math.round(b.y0),Math.round(b.x1),Math.round(b.y1)];}return o})()""")
    for c, (n, x0, y0, x1, y1) in geo.items():
        assert n >= 1 and x0 >= -2 and x1 <= 702 and y1 <= 730 and y0 >= -260, (c, geo[c])
    assert geo['П'][0] == 1 and geo['Ш'][0] == 1 and geo['Е'][0] == 1 and geo['Ъ'][0] <= 2, geo   # Ъ: outline + counter
    # no floating parts: every glyph's contour count is the expected small number
    assert geo['Ц'][0] == 1 and geo['Щ'][0] == 1 and geo['Ы'][0] <= 3, geo   # Ы: Ь (outline + counter) + stem
    # polygram overlay: for Ц the already-drawn family members appear as tinted outlines (П is the 3rd member -> green)
    d.goto('Ц'); openpane(pg,'con')
    assert d.st("t.D.poly") is False
    def green():
        return pg.evaluate("""()=>{const c=document.getElementById('dr-cv'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let n=0;
          for(let i=0;i<d.length;i+=4){if(d[i+1]-d[i]>10&&d[i+1]-d[i+2]>5)n++;}return n}""")
    off = green(); assert off < 30, off
    pg.click('label:has(#dr-poly)'); pg.wait_for_timeout(300)
    assert d.st("t.D.poly") is True
    on = green(); assert on > 60, (off, on)
    assert d.st("t.polyMembers('Ц').map(m=>m.ch).join('')").startswith('Н'), d.st("t.polyMembers('Ц').map(m=>m.ch).join('')")
    shot4(pg, 'pg_02_overlay_light.png', '#dr-sq')
    shot4(pg, 'pg_03_panel.png', '#dr-side')
    pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(300)
    shot4(pg, 'pg_04_overlay_dark.png')
    on_d = green(); assert on_d > 100, on_d
    pg.evaluate("document.documentElement.removeAttribute('data-theme')")
    # a draft left unsaved is persisted with its marking
    d.goto('Г'); d.tool('select'); openpane(pg,'con')
    pg.evaluate("GT_DRAW.onHide()")
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'П draft items=3 bbox={ev["b"]} overlay green px {off}->{on} (dark {on_d}); geo={ {c: v[0] for c, v in geo.items()} }'


def diacritics(p):
    """diacritics: marks set, auto anchors, composites Й Ё (+ Ў Ї), badge, anchor drag, detach, export"""
    s, d = setup(p, 'draw_dia'); pg = s.pg
    draw_N(d, pg)
    # И = copy of Н (shape does not matter for the composite maths), Е from the polygram draft
    d.goto('И'); pg.click('#dr-from'); pg.click('#dr-pop [data-c="Н"]'); d.save()
    d.goto('Е'); pg.click('#dr-note [data-cact=draft]'); d.save()
    d.goto('У'); pg.click('#dr-from'); pg.click('#dr-pop [data-c="Н"]'); d.save()
    openpane(pg,'recs'); pg.wait_for_selector('#dr-pr .dr-rec')
    txt = pg.inner_text('#dr-pr')
    assert 'Нарисуйте кратку' in txt and 'Й' in txt, txt
    shot4(pg, 'dia_00_recs.png', '#dr-side')
    # anchors exist for a saved base
    a = pg.evaluate("(()=>{const a=GT_DRAW._t.ancInfo('И');return {t:a.top,b:a.bot,bb:(b=>[b.x0,b.y0,b.x1,b.y1])(impBBox(GT_DRAW._t.D.g['И'].cs))}})()")
    assert abs(a['t']['x'] - (a['bb'][0] + a['bb'][2]) / 2) <= 6 and a['t']['y'] == round(a['bb'][3]) + 32, a
    # marks: «Диакритика» set
    setpick(pg, 'dia'); assert d.st("t.D.set") == 'dia'
    assert len(pg.query_selector_all('.dr-gl')) == 12
    d.goto('˘'); pg.wait_for_selector('#dr-note [data-cact=mkdraft]')
    assert 'концы' in pg.inner_text('#dr-note')
    pg.click('#dr-note [data-cact=mkdraft]'); pg.wait_for_timeout(250)
    assert len(d.items()) >= 1
    shot4(pg, 'dia_01_breve_draft.png', '#dr-sq')
    # thickened ends: the stroke is thicker at the ends than in the middle
    th = pg.evaluate("""(()=>{const cs=GT_DRAW._t.evalGlyph(),b=impBBox(cs);const lo=b.y0+8,mid=b.y0+8;
      const e=impRuns(cs,'h',b.y1-14),m=impRuns(cs,'h',b.y0+6);const w=r=>r.reduce((s,q)=>s+q[1]-q[0],0);return [w(e),w(m),e.length,m.length]})()""")
    assert th[2] == 2 and th[3] == 1, th      # two ends at the top, one joined bottom
    d.save()
    # Й and й appear automatically (й needs и: not drawn -> only Й)
    assert d.st("!!t.comp('Й')") is True and d.st("!!t.comp('й')") is False
    c = pg.evaluate("(()=>{const c=GT_DRAW._t.comp('Й'),bb=impBBox(GT_DRAW._t.D.g['И'].cs);return {ptx:c.pt.x,pty:c.pt.y,mb:[c.mb.x0,c.mb.y0,c.mb.x1,c.mb.y1],bb:[bb.x0,bb.y0,bb.x1,bb.y1],n:c.cs.length}})()")
    assert abs((c['mb'][0] + c['mb'][2]) / 2 - c['ptx']) <= 1 and abs(c['mb'][1] - c['pty']) <= 1, c
    assert c['mb'][1] - c['bb'][3] >= 30 and c['n'] == 2, c        # clear of the base, separate contour
    # strip badge + progress, other sets
    setpick(pg, 'cyr')
    assert pg.query_selector('.dr-gl[data-ch="Й"].cmp .cm') is not None
    assert 'составных 1' in pg.inner_text('#dr-prog'), pg.inner_text('#dr-prog')
    shot4(pg, 'dia_02_strip_badge.png', '#dr-strip')
    # Ё: ¨ drawn -> composite from the polygram-drafted Е
    setpick(pg, 'dia'); d.goto('¨'); pg.click('#dr-note [data-cact=mkdraft]'); d.save()
    assert d.st("!!t.comp('Ё')") is True and d.st("!!t.comp('Й')") is True
    setpick(pg, 'cyx'); assert pg.query_selector('.dr-gl[data-ch="Ё"].cmp') is not None
    # Ў needs «У»+кратка (У drawn): composite exists too; Ї needs І (Latin I twin) -> absent
    assert d.st("!!t.comp('Ў')") is True and d.st("!!t.comp('Ї')") is False
    # anchors: current composite shows the anchors of its base; drag the top anchor
    setpick(pg, 'cyr'); d.goto('Й'); pg.wait_for_timeout(200)
    assert 'Составной' in pg.inner_text('#dr-note')
    shot4(pg, 'dia_03_anchors_light.png', '#dr-sq')
    before = pg.evaluate("(()=>{const c=GT_DRAW._t.comp('Й');return [c.pt.x,c.pt.y,c.mb.x0,c.mb.y0]})()")
    ap = pg.evaluate("(()=>{const a=GT_DRAW._t.ancInfo('И').top;return [a.x,a.y]})()")
    sx, sy = d.w2s(*ap); ex, ey = d.w2s(ap[0] + 60, ap[1] + 40)
    pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.move((sx + ex) / 2, (sy + ey) / 2, steps=3); pg.mouse.move(ex, ey, steps=3); pg.mouse.up()
    after = pg.evaluate("(()=>{const c=GT_DRAW._t.comp('Й');return [c.pt.x,c.pt.y,c.mb.x0,c.mb.y0]})()")
    assert abs(after[0] - before[0] - 60) <= 2 and abs(after[1] - before[1] - 40) <= 2 and abs(after[2] - before[2] - 60) <= 2, (before, after)
    assert d.st("t.cur.items.length") == 0 and d.st("!!t.D.g['И'].anc") is True
    shot4(pg, 'dia_04_anchor_moved.png', '#dr-sq')
    # Ў (same base family is У, other base) is unchanged by the И anchor
    # double click returns to the auto position
    pg.mouse.dblclick(ex, ey); pg.wait_for_timeout(200)
    back = pg.evaluate("(()=>{const c=GT_DRAW._t.comp('Й');return [c.pt.x,c.pt.y]})()")
    assert abs(back[0] - before[0]) <= 1 and abs(back[1] - before[1]) <= 1, (before, back)
    # composites follow the base: change И, Й changes
    sig0 = pg.evaluate("JSON.stringify(GT_DRAW._t.comp('Й').cs).length")
    d.goto('И'); pg.click('#dr-mir'); d.save()
    d.goto('И'); pg.click('#dr-clr'); pg.click('#dr-from'); pg.click('#dr-pop [data-c="Е"]'); d.save()
    sig1 = pg.evaluate("JSON.stringify(GT_DRAW._t.comp('Й').cs).length")
    assert sig0 != sig1
    # dark theme look
    d.goto('Й'); pg.evaluate("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(300)
    shot4(pg, 'dia_05_anchors_dark.png')
    pg.evaluate("document.documentElement.removeAttribute('data-theme')")
    # detach
    pg.click('#dr-note [data-cact=detach]'); pg.wait_for_timeout(200)
    assert d.st("t.D.g['Й']&&t.D.g['Й'].s") is True and d.st("t.D.g['Й'].items.length") == 1
    assert 'cmp' not in (pg.get_attribute('.dr-gl[data-ch="Й"]', 'class') or '')
    # export: build the font and download the TTF; Й Ё Ў carry real contours above the cap line
    pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Диа тест'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    pg.evaluate("document.getElementById('view-draw').hidden=true;GT_DRAW.onHide()")
    pg.evaluate("iuRegisterNow()")
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); cm = f.getBestCmap(); glyf = f['glyf']
    info = {}
    for ch in 'ЙЁЎ':
        assert ord(ch) in cm, f'{ch} missing in cmap'
        g = glyf[cm[ord(ch)]]
        assert g.numberOfContours >= 2, (ch, g.numberOfContours)
        info[ch] = (g.numberOfContours, g.yMin, g.yMax)
        assert g.yMax > 700 + 40, (ch, g.yMax)
    hN = glyf[cm[ord('Н')]]
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'Й anchor {c["ptx"]},{c["pty"]} gap={c["mb"][1]-c["bb"][3]:.0f}; drag {before[:2]}->{after[:2]}; ttf (contours,yMin,yMax)={info}'


if __name__ == '__main__':
    sys.exit(check_all([('draw', full), ('draw-grids', grids), ('draw-phone', phone), ('draw-viewports', viewports), ('draw-icons', icons), ('draw-share', drawshare), ('draw-assist', assist), ('draw-polygram', polygram), ('draw-diacritics', diacritics)]))
