"""under (W96-U): «Подложка» — бледный образец под холстом (шрифт библиотеки или своя картинка), editor + draw (+ «Ячейки»).
Checks: under_font (right char, follows glyph switch, italic, opacity, over/under, shortcut), under_img (PNG upload, move / scale / rotate by fields and handles, lock, sheet),
under_persist (reload keeps settings and image), under_export (TTF bytes + edits + undo stack identical with / without underlay), under_draw (draw mode + cells tool),
under_geom (1440 + 390, light + dark: panel inside the viewport, nothing overflows). Evidence screenshots only with GT_SHOTS=1 (dsf 2 into GT_UNDER_EV)."""
import os, sys, struct, zlib, io, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, TOUR_OFF, PAGE, CHROME, SHOTS
from e2e_draw import Session as DSession, Draw
from draw_scaffold import SCAFFOLD
from playwright.sync_api import sync_playwright
from fontTools.ttLib import TTFont

EV = os.environ.get('GT_UNDER_EV') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs', 'qa_under')


def png_file(w=300, h=420):
    """A synthetic scan: white paper, dark letter «Г» (no commercial outline, generated here)."""
    rows = []
    for y in range(h):
        r = bytearray([0])
        for x in range(w):
            ink = (40 <= x < 90 and 40 <= y < h - 40) or (40 <= x < w - 40 and 40 <= y < 90)
            v = 20 if ink else 245
            r += bytes([v, v, v])
        rows.append(bytes(r))
    raw = b''.join(rows)

    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
    p = os.path.join(tempfile.gettempdir(), 'gt_under_scan.png')
    open(p, 'wb').write(data)
    return p


def last(pg): return pg.evaluate("GT_UNDER._t.last()")
def ustate(pg): return pg.evaluate("JSON.parse(JSON.stringify(GT_UNDER._t.U))")


def wait_last(pg, cond, timeout=8000):
    pg.wait_for_function("(()=>{const l=GT_UNDER._t.last();return !!(" + cond + ")})()", timeout=timeout)


def dark_sum(pg, sel='#stage'):
    """Sum of canvas darkness: used to compare renders (monotonic in underlay opacity)."""
    return pg.evaluate("""s=>{const c=document.querySelector(s),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let t=0;for(let i=0;i<d.length;i+=4){t+=(255-(d[i]+d[i+1]+d[i+2])/3)*d[i+3]/255;}return t;}""", sel)


def settle(pg): pg.wait_for_timeout(250)


def editor(p, name='under'):
    s = Session(p, name)
    s.open_font('kortes'); s.pg.wait_for_timeout(500)
    return s


def open_panel(pg, btn='#un-btn'):
    if not pg.evaluate("GT_UNDER._t.open()"):
        pg.click(btn)
    pg.wait_for_selector('#un-panel', state='visible')


def under_font(p):
    s = editor(p); pg = s.pg
    pg.evaluate("selectGlyph('Б')"); settle(pg)
    base = dark_sum(pg)
    # keyboard shortcut Alt+U opens the panel
    pg.keyboard.press('Alt+KeyU'); pg.wait_for_selector('#un-panel', state='visible')
    assert pg.evaluate("GT_UNDER._t.open()"), 'Alt+U'
    pg.click('#un-src [data-m=font]'); settle(pg)
    L = last(pg)
    assert L['drawn'] and L['ch'] == 'Б' and L['mode'] == 'font', L
    other = ustate(pg)['font']
    assert other != 'kortes', 'default font should differ from the edited one'
    assert dark_sum(pg) > base + 1000, 'font underlay changes the canvas'
    # follows glyph switching
    for ch in ('Ж', 'а', 'Я'):
        pg.evaluate("c=>selectGlyph(c)", ch); wait_last(pg, f"l.ch==='{ch}'&&l.drawn")
    # another font + italic
    pg.select_option('#un-font', 'ustav'); settle(pg)
    assert ustate(pg)['font'] == 'ustav' and last(pg)['drawn']
    pg.click('#un-sty [data-s=italic]'); settle(pg)
    assert ustate(pg)['sty'] == 'italic' and last(pg)['drawn']
    # opacity: default 25, 10..60, darker with more
    assert ustate(pg)['op'] == 25
    pg.evaluate("document.querySelector('#un-op').value=10;document.querySelector('#un-op').dispatchEvent(new Event('input',{bubbles:true}))"); settle(pg)
    a = dark_sum(pg)
    pg.evaluate("document.querySelector('#un-op').value=60;document.querySelector('#un-op').dispatchEvent(new Event('input',{bubbles:true}))"); settle(pg)
    b = dark_sum(pg)
    assert ustate(pg)['op'] == 60 and b > a + 500, (a, b)
    assert pg.evaluate("document.querySelector('#un-op').min") == '10' and pg.evaluate("document.querySelector('#un-op').max") == '60'
    # over / under contour
    pg.click('#un-ov [data-o="1"]'); settle(pg)
    assert last(pg)['over'] is True and last(pg)['drawn']
    pg.click('#un-ov [data-o="0"]'); settle(pg)
    assert last(pg)['over'] is False
    # off
    pg.click('#un-src [data-m=off]'); settle(pg)
    assert not last(pg)['drawn']
    pg.click('#un-src [data-m=font]'); settle(pg)
    assert last(pg)['drawn']
    # in font mode there is no «Убрать» (the «Выкл» segment does it); Esc closes the panel
    assert not pg.is_visible('#un-rm')
    pg.click('#un-src [data-m=off]'); settle(pg)
    assert ustate(pg)['mode'] == 'off'
    pg.keyboard.press('Escape'); settle(pg)
    assert not pg.evaluate("GT_UNDER._t.open()") and not pg.is_visible('#un-panel')
    assert not s.errs, s.errs
    return 'char follows, italic, opacity 10..60, over/under, Alt+U, off'


def drag(pg, a, b, sel='#stage', steps=6):
    r = pg.evaluate("s=>{const q=document.querySelector(s).getBoundingClientRect();return [q.left,q.top]}", sel)
    pg.mouse.move(r[0] + a[0], r[1] + a[1]); pg.mouse.down()
    for k in range(1, steps + 1):
        pg.mouse.move(r[0] + a[0] + (b[0] - a[0]) * k / steps, r[1] + a[1] + (b[1] - a[1]) * k / steps)
    pg.mouse.up()


def img_flow(pg, sel='#stage', key_ctx='ed'):
    """upload -> fields -> handles -> lock -> sheet; works for both canvases"""
    png = png_file()
    pg.click('#un-src [data-m=img]'); settle(pg)
    pg.set_input_files('#un-file', png)
    pg.wait_for_function("(()=>{const l=GT_UNDER._t.last();return l.mode==='img'&&l.drawn&&!!GT_UNDER._t.frame()})()", timeout=15000)
    key = pg.evaluate("GT_UNDER._t.key()")
    tf = pg.evaluate("k=>JSON.parse(JSON.stringify(GT_UNDER._t.TF[k]))", key)
    assert tf and tf['rot'] == 0 and not tf['lock'] and tf['h'] > 100, tf
    # numeric fields
    pg.fill('#un-fx', '40'); pg.fill('#un-fy', '-30'); pg.fill('#un-fs', '90'); pg.fill('#un-fr', '4'); settle(pg)
    tf = pg.evaluate("k=>JSON.parse(JSON.stringify(GT_UNDER._t.TF[k]))", key)
    assert (tf['x'], tf['y'], tf['h'], tf['rot']) == (40, -30, 630, 4), tf
    # handles: body move
    fr = pg.evaluate("GT_UNDER._t.frame()")
    c = fr['C']; drag(pg, c, [c[0] + 50, c[1] + 20], sel); settle(pg)
    t2 = pg.evaluate("k=>JSON.parse(JSON.stringify(GT_UNDER._t.TF[k]))", key)
    assert t2['x'] > tf['x'] and t2['y'] < tf['y'], (tf, t2)
    # scale handle (bottom right corner): pull outwards -> bigger
    fr = pg.evaluate("GT_UNDER._t.frame()"); hs = fr['hs']; c = fr['C']
    drag(pg, hs, [hs[0] + (hs[0] - c[0]) * .4, hs[1] + (hs[1] - c[1]) * .4], sel); settle(pg)
    t3 = pg.evaluate("k=>JSON.parse(JSON.stringify(GT_UNDER._t.TF[k]))", key)
    assert t3['h'] > t2['h'] * 1.2, (t2, t3)
    # rotate handle: drag sideways
    fr = pg.evaluate("GT_UNDER._t.frame()"); hr = fr['hr']
    drag(pg, hr, [hr[0] + 60, hr[1] + 20], sel); settle(pg)
    t4 = pg.evaluate("k=>JSON.parse(JSON.stringify(GT_UNDER._t.TF[k]))", key)
    assert abs(t4['rot'] - t3['rot']) > 3, (t3, t4)
    # lock: frame gone, drag does not move it
    pg.click('#un-lock'); settle(pg)
    assert pg.evaluate("GT_UNDER._t.frame()") is None and pg.evaluate("k=>GT_UNDER._t.TF[k].lock", key)
    assert pg.inner_text('#un-lock') == 'Изменить'
    return key, t4


def under_img(p):
    s = editor(p); pg = s.pg
    pg.evaluate("selectGlyph('Б')"); settle(pg)
    open_panel(pg)
    key, t4 = img_flow(pg)
    before = pg.evaluate("k=>JSON.stringify(GT_UNDER._t.TF[k])", key)
    fr_c = pg.evaluate("(()=>{const q=document.querySelector('#stage').getBoundingClientRect();return [q.width/2,q.height/2]})()")
    drag(pg, fr_c, [fr_c[0] + 80, fr_c[1] + 40]); settle(pg)
    assert pg.evaluate("k=>JSON.stringify(GT_UNDER._t.TF[k])", key) == before, 'locked image must not move'
    # per glyph by default: another glyph has none; sheet shows on all
    pg.evaluate("selectGlyph('Ж')"); settle(pg)
    assert not last(pg)['drawn'] and 'нет' in pg.inner_text('#un-st')
    pg.evaluate("selectGlyph('Б')"); settle(pg)
    pg.check('#un-sheet'); settle(pg)   # the own image of Б becomes the sheet for all glyphs
    assert pg.evaluate("GT_UNDER._t.key()").endswith(':*') and last(pg)['drawn']
    pg.evaluate("selectGlyph('Ж')"); settle(pg)
    assert last(pg)['drawn'], 'sheet shows on every glyph'
    pg.uncheck('#un-sheet'); settle(pg)
    assert not last(pg)['drawn'], 'Ж has no own image'
    pg.evaluate("selectGlyph('Б')"); settle(pg)
    assert last(pg)['drawn'], 'own image of Б kept'
    # Убрать removes the image
    pg.click('#un-rm'); settle(pg)
    assert not last(pg)['drawn'] and pg.evaluate("k=>!GT_UNDER._t.TF[k]", key)
    # bad file: inline message, no alert
    bad = os.path.join(tempfile.gettempdir(), 'gt_under_bad.txt'); open(bad, 'w').write('x')
    pg.set_input_files('#un-file', bad); settle(pg)
    assert 'PNG' in pg.inner_text('#un-msg')
    assert not s.errs, s.errs
    return f'png upload, fields, handles, lock, sheet, remove (h={t4["h"]})'


def under_persist(p):
    s = editor(p); pg = s.pg
    pg.evaluate("selectGlyph('Б')"); settle(pg); open_panel(pg)
    pg.click('#un-src [data-m=font]'); pg.select_option('#un-font', 'rotunda'); settle(pg)
    pg.evaluate("document.querySelector('#un-op').value=40;document.querySelector('#un-op').dispatchEvent(new Event('input',{bubbles:true}))")
    img_flow(pg)
    key = pg.evaluate("GT_UNDER._t.key()")
    pg.wait_for_timeout(700)  # debounced TF write + IndexedDB put
    pg.reload()
    pg.wait_for_function("typeof S!=='undefined'&&typeof GT_UNDER!=='undefined'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=120000)
    s.open_font('kortes'); pg.evaluate("selectGlyph('Б')"); settle(pg)
    st = ustate(pg)
    assert st['mode'] == 'img' and st['font'] == 'rotunda' and st['op'] == 40, st
    pg.wait_for_function("(()=>{const l=GT_UNDER._t.last();return l.mode==='img'&&l.drawn})()", timeout=15000)
    tf = pg.evaluate("k=>GT_UNDER._t.TF[k]", key)
    assert tf and tf['lock'] and tf['rot'] != 0, tf
    # a library font source also comes back
    pg.keyboard.press('Alt+KeyU'); pg.wait_for_selector('#un-panel', state='visible')
    pg.click('#un-src [data-m=font]'); settle(pg)
    assert last(pg)['drawn'] and last(pg)['font'] == 'rotunda'
    assert not s.errs, s.errs
    return 'settings + image survive reload'


def under_export(p):
    s = editor(p); pg = s.pg
    pg.evaluate("selectGlyph('Б')"); settle(pg)
    snapshot = lambda: pg.evaluate("JSON.stringify([S.edits,S.styles,undoStack.length,projectJSON()])")
    pre = snapshot()
    _, off_bytes, _ = s.download('ttf')
    open_panel(pg); pg.click('#un-src [data-m=font]'); settle(pg)
    assert last(pg)['drawn']
    _, on_bytes, _ = s.download('ttf')
    img_flow(pg)
    _, on2, _ = s.download('ttf')
    post = snapshot()
    assert pre == post, 'edits / styles / undo stack / project JSON changed by the underlay'

    def tabs(b):
        f = TTFont(io.BytesIO(b)); out = {}
        for t in sorted(f.keys()):
            if t in ('GlyphOrder', 'head'): continue
            try: out[t] = f.getTableData(t)
            except Exception: out[t] = b''
        return out
    a, b, c = tabs(off_bytes), tabs(on_bytes), tabs(on2)
    assert a == b == c, 'TTF tables differ with the underlay on'
    same = off_bytes == on_bytes == on2
    assert not s.errs, s.errs
    return f'ttf tables identical (raw bytes identical={same}), edits/undo/project unchanged'


def draw_session(p, size=None):
    s = DSession(p, 'under-draw')
    if size: s.pg.set_viewport_size(size)
    assert s.pg.evaluate(SCAFFOLD)
    s.pg.wait_for_selector('#dr-cv'); s.pg.wait_for_timeout(400)
    return s, Draw(s)


def under_draw(p):
    s, d = draw_session(p); pg = s.pg
    pg.evaluate("dwClose('draw')")
    d.goto('Н'); settle(pg)
    pg.wait_for_selector('#un-dbtn')
    pg.click('#un-dbtn'); pg.wait_for_selector('#un-panel', state='visible')
    pg.click('#un-src [data-m=font]'); settle(pg)
    L = last(pg)
    assert L['ctx'] == 'dr' and L['ch'] == 'Н' and L['drawn'], L
    d.goto('А'); wait_last(pg, "l.ch==='А'&&l.drawn")
    undo0 = d.st("t.cur.undo.length"); items0 = d.st("t.cur.items.length")
    # image + handles on the draw canvas
    pg.evaluate("dwClose('draw')")
    img_flow(pg, sel='#dr-cv')
    # cells tool: underlay still painted, hot path of the cell grid untouched
    pg.click('#un-lock'); settle(pg)  # unlock to see the frame again
    pg.click('#un-src [data-m=font]'); settle(pg)
    d.tool('cells'); settle(pg)
    assert last(pg)['drawn'] and last(pg)['ctx'] == 'dr'
    d.tool('rect') if pg.evaluate("!!document.querySelector('#dr-tools [data-tool=rect]')") else None
    assert d.st("t.cur.undo.length") == undo0 and d.st("t.cur.items.length") == items0, 'draw history / items changed by the underlay'
    # underlay is never part of the saved glyph: drawing data has no trace of it
    assert 'under' not in pg.evaluate("JSON.stringify(GT_DRAW.pack())").lower()
    # moving between tabs closes the panel
    pg.focus('#un-src [data-m=font]'); pg.keyboard.press('Escape'); settle(pg)
    assert not pg.is_visible('#un-panel')
    assert not s.errs, s.errs
    return 'draw: char follows, image handles, cells tool, history untouched'


def geom_checks(pg, tag):
    bad = []
    m = pg.evaluate("""()=>{const p=document.querySelector('#un-panel');const r=p.getBoundingClientRect(),o=[];
      for(const e of p.querySelectorAll('*')){const q=e.getBoundingClientRect();if(q.width&&(q.right>r.right+.5||q.left<r.left-.5)&&getComputedStyle(e).position!=='absolute')o.push(e.tagName+'.'+e.className+'#'+e.id);}
      return {l:r.left,t:r.top,r:r.right,b:r.bottom,vw:innerWidth,vh:innerHeight,sw:document.documentElement.scrollWidth,pw:p.scrollWidth,pc:p.clientWidth,over:o.slice(0,5),
        btns:[...p.querySelectorAll('button,select,input')].filter(e=>e.offsetParent&&e.type!=='file').map(e=>{const q=e.getBoundingClientRect();return [q.left,q.top,q.right,q.bottom,e.id||e.textContent.trim()]})}}""")
    if m['l'] < -.5 or m['r'] > m['vw'] + .5 or m['t'] < -.5 or m['b'] > m['vh'] + .5: bad.append(f'{tag}: panel outside viewport {m["l"]:.0f},{m["t"]:.0f},{m["r"]:.0f},{m["b"]:.0f} in {m["vw"]}x{m["vh"]}')
    if m['sw'] > m['vw']: bad.append(f'{tag}: page scrolls horizontally {m["sw"]}>{m["vw"]}')
    if m['pw'] > m['pc'] + 1: bad.append(f'{tag}: panel content wider than panel {m["pw"]}>{m["pc"]}')
    if m['over']: bad.append(f'{tag}: sticks out of the panel {m["over"]}')
    bt = m['btns']
    for i in range(len(bt)):
        for j in range(i + 1, len(bt)):
            a, b = bt[i], bt[j]
            if a[0] < b[2] - 1 and b[0] < a[2] - 1 and a[1] < b[3] - 1 and b[1] < a[3] - 1: bad.append(f'{tag}: overlap {a[4]} / {b[4]}')
    return bad


def shot2(pg, name):
    if SHOTS:
        os.makedirs(EV, exist_ok=True); pg.screenshot(path=os.path.join(EV, name))


def under_geom(p):
    b = p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
    bad = []; n = 0
    try:
        for w, h in ((1440, 900), (390, 844)):
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if SHOTS else 1); ctx.add_init_script(TOUR_OFF)
            pg = ctx.new_page(); pg.goto('file://' + PAGE)
            pg.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'&&typeof bgQuiet==='function'&&bgQuiet()", timeout=180000)
            for th in ('light', 'dark'):
                pg.evaluate("t=>document.documentElement.setAttribute('data-theme',t)", th)
                # editor
                pg.evaluate("setTab('library')"); pg.click('#libgrid .lcard[data-font=kortes]')
                pg.wait_for_function("S.fontId==='kortes'&&!S.live", timeout=30000); pg.evaluate("setTab('edit')"); pg.wait_for_timeout(700)
                pg.evaluate("selectGlyph('Б')"); settle(pg)
                pg.evaluate("GT_UNDER.close(true)")
                pg.evaluate("document.querySelector('#un-btn').scrollIntoView({block:'center'})")
                btn = pg.query_selector('#un-btn')
                assert btn and btn.is_visible(), f'toolbar button hidden at {w}'
                pg.evaluate("document.querySelector('#un-btn').click()"); pg.wait_for_selector('#un-panel', state='visible')
                for mode in ('font', 'img', 'off'):
                    if mode == 'img' and not pg.evaluate("!!GT_UNDER._t.TF[GT_UNDER._t.key()]"):
                        pg.click('#un-src [data-m=img]'); pg.set_input_files('#un-file', png_file()); pg.wait_for_function("GT_UNDER._t.last().drawn", timeout=15000)
                    else:
                        pg.click(f'#un-src [data-m={mode}]')
                    settle(pg); bad += geom_checks(pg, f'ed {w} {th} {mode}'); n += 1
                    if mode in ('font', 'img'): shot2(pg, f'ed_{w}_{th}_{mode}.png')
                pg.click('#un-src [data-m=font]'); settle(pg)
                pg.evaluate("GT_UNDER.close(true)")
                # draw
                pg.evaluate("setTab('home')")
                pg.evaluate(SCAFFOLD); pg.wait_for_selector('#dr-cv', state='visible', timeout=20000); pg.wait_for_timeout(500)
                pg.evaluate("dwClose('draw')")
                pg.evaluate("document.querySelector('#un-dbtn').click()"); pg.wait_for_selector('#un-panel', state='visible')
                for mode in ('font', 'img'):
                    pg.click(f'#un-src [data-m={mode}]')
                    if mode == 'img' and not pg.evaluate("!!GT_UNDER._t.TF[GT_UNDER._t.key()]"):
                        pg.set_input_files('#un-file', png_file()); pg.wait_for_function("GT_UNDER._t.last().drawn", timeout=15000)
                    settle(pg); bad += geom_checks(pg, f'dr {w} {th} {mode}'); n += 1
                    shot2(pg, f'dr_{w}_{th}_{mode}.png')
                pg.evaluate("GT_UNDER.close(true)"); pg.evaluate("setTab('home')")
            ctx.close()
    finally:
        b.close()
    assert not bad, '; '.join(bad[:8])
    return f'{n} states (1440/390 x light/dark x editor/draw), panel inside the viewport, no overflow'


CHECKS = {'under_font': under_font, 'under_img': under_img, 'under_persist': under_persist, 'under_export': under_export, 'under_draw': under_draw, 'under_geom': under_geom}
if __name__ == '__main__':
    want = sys.argv[1:] or list(CHECKS)
    sys.exit(check_all([(n, CHECKS[n]) for n in want]))
