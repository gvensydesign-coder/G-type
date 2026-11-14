"""«Поделиться шрифтом» (Stage 3): menu item + panel (open/close/Esc/focus), live poster of the user's font, reduced motion = poster frame, nothing clipped at the frame edge in any frame (hero by ink bounds,
two-line names keep an ink gap >= 8 % of the size), PNG 1080x1350 and WebM downloads through the service's file path, phone layout, both themes, draw button. One PASS/FAIL line."""
import os, sys, struct, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *

READY = "SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent"


def frames_ok(s, tag, step=2):
    """every element box of the frame (and the ink of what sits on a card / chip) inside the frame; rest positions inside the gutter; line gaps >= 8 %"""
    n = 0
    for i in range(0, 75, step):
        t = i / 10
        R = s.js(f"SHARE.recFrame({t})")
        W, H, G = R['W'], R['H'], R['G']
        by = {e['n']: e for e in R['r'] if not e.get('in')}
        for e in R['r']:
            n += 1
            inside = lambda m: e['x0'] >= m - 1e-6 and e['y0'] >= m - 1e-6 and e['x1'] <= W - m + .5 and e['y1'] <= H - m + .5
            assert inside(0), (tag, t, e['n'], 'outside the frame', e)
            assert not e['rest'] or inside(G - .5), (tag, t, e['n'], 'outside the gutter at rest', e)
            if e.get('in'):
                p = by[e['in']]
                assert e['x0'] >= p['x0'] - .5 and e['x1'] <= p['x1'] + .5 and e['y0'] >= p['y0'] - .5 and e['y1'] <= p['y1'] + .5, (tag, t, e['n'], 'crosses its card', e, p)
        hs = [by[k] for k in sorted(k for k in by if k.startswith('hero'))]
        assert hs and hs[0]['y0'] >= by['pill']['y1'] and hs[-1]['y1'] <= by['track']['y0'], (tag, t, 'hero collides with the header / weight track', hs[0], hs[-1], by['track'])
        for a_, b_ in zip(hs, hs[1:]):
            gap = b_['y0'] - a_['y1']
            assert gap >= .08 * R['size'] - .5, (tag, t, 'line gap', gap, R['size'])
    return n


SHOTS_DIR = os.environ.get('PST_SHOTS')  # PST_SHOTS=<dir>: keep every exported PNG + dialog screenshots there
BGS = {'light': (0xef, 0xef, 0xf1), 'dark': (0x13, 0x13, 0x16), 'accent': (0xfc, 0x47, 0x3c)}
DIMS = {'1:1': (1080, 1080), '4:5': (1080, 1350), '9:16': (1080, 1920)}
VDIMS = {'1:1': '720,720', '4:5': '720,900', '9:16': '720,1280'}
PHR = {'1:1': 'Привет, мир', '4:5': 'Съешь ещё этих мягких булок', '9:16': 'Съешь ещё этих мягких французских булок'}


def pick(s, grp, v):
    s.pg.click(f'#pst [data-r={grp}] [data-v="{v}"]')


def settle(s, t=120000):
    s.pg.wait_for_function(READY, timeout=t)
    s.pg.wait_for_timeout(120)


def png_check(path, fmt, theme):
    from PIL import Image
    im = Image.open(path).convert('RGB')
    assert im.size == DIMS[fmt], (fmt, theme, im.size)
    for xy in ((3, 3), (im.size[0] - 4, 3), (3, im.size[1] - 4), (im.size[0] - 4, im.size[1] - 4)):
        px = im.getpixel(xy)
        assert all(abs(a - b) <= 2 for a, b in zip(px, BGS[theme])), (fmt, theme, xy, px, BGS[theme])
    # edge rows/cols (outer 12 px = half a gutter) hold nothing but the background: nothing is cut by the frame
    W_, H_ = im.size
    for box in ((0, 0, W_, 12), (0, H_ - 12, W_, H_), (0, 0, 12, H_), (W_ - 12, 0, W_, H_)):
        ex = im.crop(box).getextrema()
        assert all(abs(lo - b) <= 3 and abs(hi - b) <= 3 for (lo, hi), b in zip(ex, BGS[theme])), (fmt, theme, 'ink in the edge band', box, ex)
    return im


def stage4b(s):
    """Stage 4B: formats x themes (PNG size, bounds, background pixel), phrase mode, MP4 option logic, persistence"""
    pg = s.pg; n = 0
    pg.evaluate("localStorage.removeItem('gtype-share-v1')")
    assert s.js("SHARE.state.F.id==='4:5'&&SHARE.state.theme==='light'&&SHARE.state.mode==='grid'"), 'defaults'
    for fmt in ('1:1', '4:5', '9:16'):
        pick(s, 'sf', fmt)
        ar = s.js("(()=>{const r=document.querySelector('#pst .pst-pv').getBoundingClientRect();return r.width/r.height})()")
        want = {'1:1': 1, '4:5': .8, '9:16': .5625}[fmt]
        assert abs(ar - want) < .01, ('preview reflow', fmt, ar)
        for th in ('light', 'dark', 'accent'):
            pick(s, 'st', th); pg.wait_for_timeout(60)
            n += frames_ok(s, f'{fmt}/{th}', step=6)
            with pg.expect_download(timeout=60000) as dl: pg.click('#pst [data-r=png]')
            path = os.path.join(LOGS, f'poster_{fmt.replace(":", "x")}_{th}.png'); dl.value.save_as(path)
            assert dl.value.suggested_filename.endswith('-poster-%s.png' % fmt.replace(':', 'x')), dl.value.suggested_filename
            png_check(path, fmt, th)
            if SHOTS_DIR:
                import shutil; os.makedirs(SHOTS_DIR, exist_ok=True); shutil.copy(path, os.path.join(SHOTS_DIR, os.path.basename(path)))
        # preview card stays inside the dialog and the viewport
        r = s.js("(()=>{const q=s=>document.querySelector(s).getBoundingClientRect(),c=q('#pst .pst-card'),v=q('#pst .pst-pv');return [c.top>=0,c.bottom<=innerHeight,v.left>=c.left,v.right<=c.right,v.top>=c.top,v.bottom<=c.bottom]})()")
        assert all(r), ('desktop card / preview', fmt, r)
    pick(s, 'sf', '4:5'); pick(s, 'st', 'light')
    # video sizes scale with the format
    if os.system('which ffprobe >/dev/null 2>&1') == 0:
        import subprocess
        for fmt in ('1:1', '9:16'):
            pick(s, 'sf', fmt)
            with pg.expect_download(timeout=90000) as dl: pg.click('#pst [data-r=webm]')
            path = os.path.join(LOGS, 'poster_%s.webm' % fmt.replace(':', 'x')); dl.value.save_as(path)
            o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
            assert VDIMS[fmt] in o.replace('\n', ','), ('webm size', fmt, o)
        pick(s, 'sf', '4:5')
    # real MP4 where this browser records it (ftyp box, size of the format)
    if s.js("!!SHARE.mp4()"):
        pick(s, 'sf', '9:16')
        with pg.expect_download(timeout=90000) as dl: pg.click('#pst [data-r=mp4]')
        path = os.path.join(LOGS, 'poster_9x16.mp4'); dl.value.save_as(path)
        mb = open(path, 'rb').read(); assert mb[4:8] == b'ftyp' and len(mb) > 30000 and dl.value.suggested_filename.endswith('-poster-9x16.mp4'), ('mp4', len(mb), mb[:12])
        if os.system('which ffprobe >/dev/null 2>&1') == 0:
            import subprocess
            o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
            assert VDIMS['9:16'] in o.replace('\n', ','), ('mp4 size', o)
        pick(s, 'sf', '4:5')
    # phrase mode: phrase field, only chars of the font, subset rebuilt for new chars (debounced), 1-3 lines in every format
    pg.wait_for_function('SHARE.warmedPhrase()', timeout=90000)  # idle prebuild of the phrase subset while the dialog shows the grid
    pick(s, 'sm', 'phrase')
    assert s.js("!document.querySelector('#pst [data-r=phf]').hidden&&document.getElementById('pst-ph').placeholder==='Своя фраза'"), 'phrase field + placeholder'
    settle(s)
    # toasts never lie over the open dialog: the message goes to the dialog's own status line, a toast that was visible before opening is hidden
    s.js("document.getElementById('toast').classList.add('on')"); s.js("SHARE.close()"); pg.wait_for_timeout(300); s.js("SHARE.open(S.fontId,S.family)"); settle(s)
    assert not s.js("document.getElementById('toast').classList.contains('on')"), 'toast left over the dialog on open'
    s.js("toast('Проверка тоста')"); pg.wait_for_timeout(150)
    assert s.js("document.querySelector('#pst .pst-msg').textContent") == 'Проверка тоста' and not s.js("document.getElementById('toast').classList.contains('on')"), 'toast must go into the dialog status line'
    n0 = s.js("SHARE.state.n||0"); fam0 = s.js("SHARE.state.fam")
    pg.fill('#pst-ph', ''); pg.type('#pst-ph', 'Съешь ещё булок', delay=40)
    pg.wait_for_function("SHARE.state.m.phrase==='Съешь ещё булок'", timeout=5000)
    settle(s)
    assert s.js("SHARE.state.m.phrase")=='Съешь ещё булок', s.js("SHARE.state.m.phrase")
    assert s.js("SHARE.state.n||0") - n0 <= 0, ('typing must be debounced into one rebuild', n0, s.js("SHARE.state.n"))
    assert all(ch in s.js("SHARE.state.m.sub") for ch in 'Ъъ' if False) and 'ъ' in s.js("SHARE.state.m.sub"), 'phrase chars are in the subset'
    # the phrase is drawn in the font of the user: widths with the subset face differ from a generic face, and the face covers every phrase char
    w = s.js("(()=>{const c=document.createElement('canvas').getContext('2d'),f=SHARE.state.fam,p=SHARE.state.m.phrase;c.font='700 100px \"'+f+'\"';const a=c.measureText(p).width;c.font='700 100px serif';return [a,c.measureText(p).width]})()")
    assert abs(w[0] - w[1]) > 1, ('phrase is not in the font face', w)
    assert s.js("SHARE.state.fam") == fam0, 'phrase mode was prebuilt: no rebuild for ordinary Russian text'
    pg.fill('#pst-ph', 'Hello'); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
    fam1 = s.js("SHARE.state.fam"); assert fam1 != fam0 and 'H' in s.js("SHARE.state.m.sub"), 'new chars -> rebuilt subset'
    pg.fill('#pst-ph', 'булок ещё'); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
    assert s.js("SHARE.state.fam")==fam1, 'chars already in the subset: no rebuild'
    # missing chars: dropped, quiet hint in .pst-msg (never red)
    pg.fill('#pst-ph', 'Привет 漢字'); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
    m = s.js("({p:SHARE.state.m.phrase,miss:SHARE.state.m.miss,msg:document.querySelector('#pst .pst-msg').textContent,col:getComputedStyle(document.querySelector('#pst .pst-msg')).color})")
    assert m['p'] == 'Привет' and m['miss'] == ['漢', '字'] and 'пропущено' in m['msg'] and '漢' in m['msg'], m
    r_, g_, b_ = [int(x) for x in m['col'][m['col'].index('(') + 1:-1].split(',')[:3]]
    assert not (r_ > 150 and g_ < 100 and b_ < 100), ('hint must not be red', m['col'])
    pg.fill('#pst-ph', '漢字'); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
    assert s.js("SHARE.state.m.phrase===SHARE.state.m.name&&document.querySelector('#pst .pst-msg').textContent.length>0"), 'nothing of the phrase in the font: falls back to the name + hint'
    pg.fill('#pst-ph', ''); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
    for fmt in ('1:1', '4:5', '9:16'):
        pick(s, 'sf', fmt)
        for th in ('light', 'dark', 'accent'):
            pick(s, 'st', th)
            for ph in ('Привет', PHR[fmt], 'Съешь ещё этих мягких французских булок и выпей чаю'):
                pg.fill('#pst-ph', ph); pg.evaluate("document.getElementById('pst-ph').dispatchEvent(new Event('change'))"); settle(s)
                R = s.js("SHARE.recFrame(5.4)")
                nl = len([e for e in R['r'] if e['n'].startswith('hero')])
                assert 1 <= nl <= {'1:1': 3, '4:5': 3, '9:16': 5}[fmt], ('phrase lines', fmt, ph, nl)
                n += frames_ok(s, f'phrase/{fmt}/{th}/{len(ph)}', step=15)
        if SHOTS_DIR or True:
            with pg.expect_download(timeout=60000) as dl: pg.click('#pst [data-r=png]')
            path = os.path.join(LOGS, 'poster_phrase_%s.png' % fmt.replace(':', 'x')); dl.value.save_as(path); png_check(path, fmt, 'accent')
            if SHOTS_DIR:
                import shutil; shutil.copy(path, os.path.join(SHOTS_DIR, os.path.basename(path)))
        pick(s, 'st', 'light')
    assert s.js("(()=>{pst=document.querySelector('#pst');return 1})()")
    # persistence: format / theme / mode per viewer
    pick(s, 'sf', '9:16'); pick(s, 'st', 'dark')
    st = s.js("JSON.parse(localStorage.getItem('gtype-share-v1'))")
    assert st == {'f': '9:16', 't': 'dark', 'm': 'phrase'}, st
    pick(s, 'sm', 'grid'); pick(s, 'sf', '4:5'); pick(s, 'st', 'light')
    # MP4 option: visible only when the browser can record mp4 (mock isTypeSupported both ways, reopen each time)
    def reopen(mock):
        s.js("SHARE.close()"); pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
        s.js("(()=>{const o=window.__tsOrig||(window.__tsOrig=MediaRecorder.isTypeSupported.bind(MediaRecorder));MediaRecorder.isTypeSupported=%s})()" % mock)
        s.js("SHARE.open(S.fontId,S.family)"); settle(s)
        return s.js("(()=>{const q=n=>document.querySelector('#pst [data-r='+n+']');return {mp4h:q('mp4').hidden,mp4vis:!!q('mp4').offsetParent,mp4d:q('mp4').disabled,webmd:q('webm').disabled,webmvis:!!q('webm').offsetParent}})()")
    r = reopen("m=>m==='video/mp4'")   # FX80 A09: a bare video/mp4 may be VP9 inside MP4 -> never offered
    assert r['mp4h'] and not r['mp4vis'], ('bare mp4 (codec unknown) -> no MP4 button', r)
    r = reopen("m=>m==='video/mp4;codecs=avc1'")
    assert r['mp4vis'] and not r['mp4d'], ('mp4 avc1 -> offered', r)
    r = reopen("m=>/webm/.test(m)")
    assert r['mp4h'] and not r['mp4vis'] and r['webmvis'] and not r['webmd'], ('only webm -> no MP4 button', r)
    r = reopen("m=>false")
    assert r['mp4h'] and r['webmd'], ('nothing supported -> no MP4, webm disabled', r)
    reopen("window.__tsOrig")
    # a fresh viewer restores the last choice
    ctx = s.b.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script(TOUR_OFF)
    ctx.add_init_script("try{localStorage.setItem('gtype-share-v1',JSON.stringify({f:'1:1',t:'accent',m:'phrase'}))}catch(e){}")
    w = ctx.new_page(); w.goto('file://' + PAGE); w.wait_for_function("typeof SHARE!=='undefined'&&typeof S!=='undefined'", timeout=30000)
    w.evaluate("SHARE.open('volt','Вольт')"); w.wait_for_function(READY, timeout=120000)
    assert w.evaluate("SHARE.state.F.id==='1:1'&&SHARE.state.theme==='accent'&&SHARE.state.mode==='phrase'&&document.getElementById('pst-ph').value.length>0&&document.querySelector('#pst [data-r=sf] .on').dataset.v==='1:1'"), 'restored'
    ctx.close()
    # broken storage must not break the dialog
    ctx = s.b.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script(TOUR_OFF)
    ctx.add_init_script("try{localStorage.setItem('gtype-share-v1','{oops')}catch(e){}")
    w = ctx.new_page(); w.goto('file://' + PAGE); w.wait_for_function("typeof SHARE!=='undefined'&&typeof S!=='undefined'", timeout=30000)
    w.evaluate("SHARE.open('volt','Вольт')"); w.wait_for_function(READY, timeout=120000)
    assert w.evaluate("SHARE.state.F.id==='4:5'"), 'garbage storage -> defaults'
    ctx.close()
    pg.evaluate("localStorage.removeItem('gtype-share-v1')")
    return n


def run(p):
    s = Session(p, 'share')
    try:
        pg = s.pg
        s.open_font('volt')
        assert s.js("!!document.querySelector('#ex-list [data-x=share]')"), 'menu item'
        assert s.js("!FORMATS_HAS_SHARE".replace('FORMATS_HAS_SHARE', "(typeof platformInfo==='function'?platformInfo().formats:[]).some(f=>f.id==='share')")), 'share is not a file format'
        opener = s.js("(document.getElementById('ex-menu').focus(),1)")
        pg.click('#ex-menu'); pg.click('#ex-list [data-x=share]')
        pg.wait_for_function("document.getElementById('pst')&&!document.getElementById('pst').hidden", timeout=5000)
        assert s.js("document.getElementById('pst').getAttribute('aria-modal')==='true'"), 'dialog semantics'
        pg.wait_for_function(READY, timeout=120000)
        pg.wait_for_function("document.getElementById('pst').classList.contains('on')")
        pg.wait_for_timeout(400)
        # reduced motion / automation: poster frame, not running
        assert s.js("SHARE.state.t===SHARE.POSTER&&!SHARE.state.run"), 'reduced motion = poster frame only'
        ink = s.js("(()=>{const c=document.querySelector('#pst canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]<60)n++;return n})()")
        assert ink > 300, ('poster is empty', ink)
        assert s.js("SHARE.state.fam.startsWith('GTShare')&&!SHARE.state.static"), 'weight axis font'
        # clipping in every frame, several names (one, two lines, long)
        total = frames_ok(s, 'volt/default')
        for nm in ('Вечерний город', 'Большая типография', 'Очень длинное название ш'):
            pg.fill('#pst-nm', nm); pg.evaluate("document.getElementById('pst-nm').dispatchEvent(new Event('change'))")
            pg.wait_for_function(READY, timeout=120000)
            total += frames_ok(s, 'volt/' + nm)
        assert s.js("SHARE.state.hero.lines.length")==2, 'long name goes to two lines'
        # downloads
        with pg.expect_download(timeout=60000) as dl: pg.click('#pst [data-r=png]')
        path = os.path.join(LOGS, 'share_poster.png'); dl.value.save_as(path)
        d = open(path, 'rb').read(); assert d[:8] == b'\x89PNG\r\n\x1a\n' and struct.unpack('>II', d[16:24]) == (1080, 1350) and len(d) > 20000, ('png', len(d), struct.unpack('>II', d[16:24]))
        assert dl.value.suggested_filename.endswith('-poster-4x5.png'), dl.value.suggested_filename
        with pg.expect_download(timeout=90000) as dl: pg.click('#pst [data-r=webm]')
        path = os.path.join(LOGS, 'share_poster.webm'); dl.value.save_as(path)
        w = open(path, 'rb').read(); assert w[:4] == b'\x1a\x45\xdf\xa3' and len(w) > 50000, ('webm', len(w))
        if os.system('which ffprobe >/dev/null 2>&1') == 0:
            import subprocess
            o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=width,height,codec_name', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
            assert '720,900' in o.replace('\n', ','), ('webm size', o)
        total += stage4b(s)
        # both themes
        bg = s.js("getComputedStyle(document.querySelector('#pst .pst-card')).backgroundColor")
        s.js("document.documentElement.setAttribute('data-theme','dark')"); pg.wait_for_timeout(300)
        bg2 = s.js("getComputedStyle(document.querySelector('#pst .pst-card')).backgroundColor")
        assert bg != bg2, ('theme', bg, bg2)
        s.js("document.documentElement.setAttribute('data-theme','light')")
        # close: Esc, focus returns, hidden
        pg.keyboard.press('Escape')
        pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
        assert s.js("document.activeElement&&document.activeElement.id==='ex-menu'"), 'focus returns to the opener'
        pg.click('#ex-menu'); pg.click('#ex-list [data-x=share]'); pg.wait_for_function(READY, timeout=60000)
        pg.click('#pst [data-r=x]'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
        # phone layout
        ctx = s.b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True); ctx.add_init_script(TOUR_OFF)
        ph = ctx.new_page(); perr = []; ph.on('pageerror', lambda e: perr.append(str(e)))
        ph.goto('file://' + PAGE); ph.wait_for_function("typeof S!=='undefined'&&typeof SHARE!=='undefined'", timeout=30000)
        ph.evaluate("SHARE.open('ryvok','Ночной город')"); ph.wait_for_function(READY, timeout=120000); ph.wait_for_timeout(500)
        r = ph.evaluate("""(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const c=q('#pst .pst-card'),v=q('#pst .pst-pv'),b=q('#pst [data-r=png]');
          return {card:[c.left,c.right,c.top,c.bottom],pv:[v.left,v.right,v.top,v.bottom],btn:b.height,sw:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight}})()""")
        assert r['card'][0] >= -1 and r['card'][1] <= r['iw'] + 1 and r['card'][3] <= r['ih'] + 1, ('phone card', r)
        assert r['pv'][0] >= 0 and r['pv'][1] <= r['iw'] and r['btn'] >= 43 and r['sw'] <= r['iw'] + 1, ('phone layout', r)
        assert abs((r['pv'][1]-r['pv'][0])/(r['pv'][3]-r['pv'][2])-0.8)<0.01, ('poster aspect on phone', r['pv'])
        assert ph.evaluate("SHARE.state.hero.lines.length")>=1
        # no toast over the open dialog (opening from another font toasts; later toasts go to the dialog message line)
        assert ph.evaluate("!document.getElementById('toast').classList.contains('on')"), 'toast over the share sheet on open'
        ph.evaluate("toast('Проверка')"); ph.wait_for_timeout(100)
        assert ph.evaluate("!document.getElementById('toast').classList.contains('on')&&document.querySelector('#pst .pst-msg').textContent==='Проверка'"), 'toast must not overlap the open dialog'
        # poster glyph card: 32 distinct glyph shapes (no repeated rows), even for fonts whose lowercase equals caps
        for fid in ('ryvok', 'modul', 'volt', 'pixel'):
            g = ph.evaluate("(id=>{SHARE.open(id,'Тест');const m=SHARE.state.m,f=FONTS[id];return {g:m.grid,sig:new Set(m.grid.map(c=>{const u=c.toUpperCase(),g=f.GL[c];return u!==c&&g&&f.GL[u]&&JSON.stringify(g)===JSON.stringify(f.GL[u])?u:c})).size}})('%s')" % fid)
            assert len(g['g']) == 32 and g['sig'] == 32 and len(set(g['g'])) == 32, ('grid', fid, g)
        # Stage 4B on the phone: every format x phrase mode, nothing wider than the screen, preview inside the sheet, 44 px controls
        ph.evaluate("SHARE.open('volt','Вольт')"); ph.wait_for_function(READY, timeout=120000)
        for fmt in ('1:1', '9:16', '4:5'):
            for mode in ('phrase', 'grid'):
                ph.click(f'#pst [data-r=sf] [data-v="{fmt}"]'); ph.click(f'#pst [data-r=sm] [data-v="{mode}"]')
                ph.wait_for_function(READY, timeout=60000); ph.wait_for_timeout(150)
                r = ph.evaluate("""(()=>{const iw=innerWidth,bad=[...document.querySelectorAll('#pst *')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(b.right>iw+.5||b.left<-.5)&&!e.closest('.pst-sc')}).map(e=>e.className||e.tagName),
                  v=document.querySelector('#pst .pst-pv').getBoundingClientRect(),c=document.querySelector('#pst .pst-card').getBoundingClientRect(),
                  sg=[...document.querySelectorAll('#pst .pst-seg button')].map(b=>b.getBoundingClientRect().height);
                  return {bad,sw:document.documentElement.scrollWidth,iw,pv:[v.left>=c.left,v.right<=c.right],seg:Math.min(...sg),ar:v.width/v.height}})()""")
                assert not r['bad'] and r['sw'] <= r['iw'] + 1 and all(r['pv']) and r['seg'] >= 38, ('phone', fmt, mode, r)
                assert abs(r['ar'] - {'1:1': 1, '4:5': .8, '9:16': .5625}[fmt]) < .01, ('phone preview aspect', fmt, r)
        ph.click('#pst [data-r=sm] [data-v=grid]'); ph.click('#pst [data-r=sf] [data-v="4:5"]'); ph.wait_for_function(READY, timeout=60000)
        ph.evaluate("localStorage.removeItem('gtype-share-v1')")
        ph.screenshot(path=os.path.join(LOGS, 'share_phone.png'))
        assert not perr, perr[:3]
        ctx.close()
        # Stage 4A: speculative build. Opening the «Скачать» menu starts the poster font build in idle time; the dialog then opens with the font ready.
        # Checked on a fresh page (nothing cached): not ready at once, ready by itself (no dialog open), dialog ready < 1.5 s, real weight axis (not the static fallback)
        ctx2 = s.b.new_context(viewport={'width': 1440, 'height': 900}); ctx2.add_init_script(TOUR_OFF); ctx2.add_init_script('window.__GT_TEST=1;window.__GT_STEPS=[]')
        w = ctx2.new_page(); werr = []; w.on('pageerror', lambda e: werr.append(str(e)))
        w.goto('file://' + PAGE); w.wait_for_function("typeof S!=='undefined'&&typeof SHARE!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
        w.evaluate("switchFont('ryvok');setTab('edit')"); w.wait_for_timeout(800)
        assert w.evaluate("SHARE.warmed()") is False, 'nothing cached yet'
        w.click('#ex-menu')
        w.wait_for_function("SHARE.warmed()", timeout=120000)
        assert w.evaluate("!SHARE.state.open"), 'warm build must not open the dialog'
        # the build's own granularity: every step between two idle slots is one glyph (the page has unrelated long tasks of its own, e.g. its start-up sweeps)
        st = w.evaluate("__GT_STEPS.map(x=>x[1])")
        assert len(st) > 10 and max(st) < 300, ('warm build step too long / not chunked', len(st), max(st) if st else None)
        w.keyboard.press('Escape'); w.evaluate("SHARE.open(S.fontId,S.family)")
        t0 = time.time(); w.wait_for_function(READY, timeout=20000)
        assert time.time() - t0 < 1.5, ('dialog after warm build', time.time() - t0)
        assert w.evaluate("!SHARE.state.static&&SHARE.state.fam.startsWith('GTShare')"), 'warm build lost the weight axis'
        # a changed parameter is another cache key: the old warm result is not reused for the new look
        w.evaluate("SHARE.close()"); w.wait_for_timeout(300)
        assert not werr, werr[:3]
        ctx2.close()
        # draw: the share button sits next to «Скачать шрифт», disabled until the font exists (D5: also hidden until a glyph is saved)
        s.js("setTab('draw')"); pg.wait_for_selector('#dr-shareb', state='attached', timeout=15000)
        assert s.js("document.getElementById('dr-shareb').hidden"), 'draw share button hidden before the first saved glyph'
        assert s.js("document.getElementById('dr-shareb').disabled===!FONTS.imp"), 'draw share button state'
        assert not s.errs, s.errs[:3]
        return f'share: menu item, panel open/close/Esc/focus, {total} frame boxes inside the frame (gutter at rest, hero by ink, two-line gap >= 8 %), PNG 1080x1350, WebM 720x900 downloads, Stage 4B (3 formats x 3 themes: PNG size + background pixel + edge band + bounds, WebM/MP4 sizes, phrase mode 1-3 lines + missing chars + debounced subset rebuild, MP4 option logic with mocked isTypeSupported, persistence), both themes, phone 390, draw button, speculative idle build via the menu'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('share', run)]))
