"""fx80 F2: draw-mode / status / import fixes (C01-C16): rule vs build button, one import count, tiny-mark warning, undo vs history, tour step, stable spacing,
status plaque list, phone toast and sheet, placeholders, name validation, stable style suffix."""
import io, os, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from common import Session as CS, check_all, LOGS
from e2e_draw import setup
from fontTools.ttLib import TTFont

RECT_H = [[(0, 0), (100, 700)], [(400, 0), (500, 700)], [(0, 300), (500, 400)]]


def shape(d, ch, rs):
    d.goto(ch); d.tool('shape')
    for r in rs: d.path(r)
    d.save()


def draw_check(p):
    s, d = setup(p, 'fx80f2'); pg = s.pg
    pg.evaluate("dwClose('draw')")
    # C10: the test-text field shows the default sentence as a placeholder
    pg.evaluate("dwOpen('draw','spk')"); pg.wait_for_timeout(300)
    assert 'АТАКА' in pg.get_attribute('#dr-akt', 'placeholder'), 'C10'
    # C04: undo stack survives a glyph switch; history entries are named by action
    d.goto('Н'); d.tool('brush'); d.path([(100, 0), (100, 700)]); pg.wait_for_timeout(600)
    d.tool('shape'); d.path([(300, 0), (400, 700)]); pg.wait_for_timeout(600)
    d.goto('Т'); d.goto('Н')
    assert not pg.is_disabled('#dr-undo'), 'C04 undo kept after switching glyphs'
    labs = pg.evaluate("HIST.info('dr').labels")
    assert any(l.startswith('Кисть') for l in labs) and any(l.startswith('Фигура') for l in labs), ('C04', labs)
    assert not any(l == 'Буква Н' for l in labs), ('C04', labs)
    pg.click('#dr-hist'); pg.wait_for_selector('#hist:not([hidden])')
    # C12: no tooltip is drawn for a button whose popover is open
    assert pg.evaluate("getComputedStyle(document.querySelector('#dr-hist'),'::after').display") == 'none', 'C12'
    pg.keyboard.press('Escape')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200)
    assert d.st("t.cur.items.length") == 1, 'C04 undo works after return'
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(200)
    d.save()
    # C01: rule and button agree: one saved glyph -> message says what will be missing, dialog warns
    pg.evaluate("dwOpen('draw','recs')"); pg.wait_for_timeout(400)
    txt = pg.inner_text('#dr-pr')
    assert 'можно собрать и сейчас' in txt and 'хотя бы 3 знака — тогда' not in txt, ('C01', txt[:200])
    # C15: the «go» button of the missing-glyph hint never points at the open glyph
    cur = d.st("t.cur.ch"); gos = pg.evaluate("[...document.querySelectorAll('#dr-pr [data-go]')].map(b=>b.dataset.go)")
    assert cur not in gos, ('C15', cur, gos)
    pg.evaluate("dwClose('draw')")
    pg.click('#dr-fontb'); pg.wait_for_selector('#dr-mf:not([hidden])')
    assert 'мало знаков' in pg.inner_text('#dr-mfi'), 'C01 dialog'
    # C13: name validation, inline hint
    pg.fill('#dr-nm', 'Тест/шрифт: «№1» <b>😀 ..' + 'x' * 40); pg.wait_for_timeout(100)
    v = pg.input_value('#dr-nm')
    assert len(v) <= 31 and not any(c in v for c in '/:<>😀'), ('C13', v)
    assert pg.inner_text('#dr-nmh').strip(), 'C13 hint'
    pg.fill('#dr-nm', 'Мой тест'); pg.click('#dr-mfc')
    # C06 + C14: second glyph = solid ellipse; spacing of Н does not depend on the bogus stem of a solid shape; style suffix stable
    d.goto('О'); d.tool('shape'); pg.click('#dr-opt [data-sh=ell]'); d.path([(0, 0), (500, 700)]); d.save()
    pg.wait_for_timeout(300)
    # C08: strength 0 does not claim there are no pairs
    pg.evaluate("dwOpen('draw','spk')"); pg.wait_for_timeout(300)
    pg.click('#dr-akk'); pg.wait_for_timeout(500)
    pg.evaluate("(()=>{const i=document.querySelector('#dr-aks');i.value=0;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()")
    pg.wait_for_timeout(300)
    assert 'Подходящих пар пока нет' not in pg.inner_text('#dr-aksk'), ('C08', pg.inner_text('#dr-aksk'))
    pg.evaluate("(()=>{const i=document.querySelector('#dr-aks');i.value=100;i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()")
    pg.evaluate("dwClose('draw')")
    pg.click('#dr-fontb'); pg.fill('#dr-nm', 'Тест/шрифт: «№1» <b>😀'); pg.click('#dr-mfo')
    pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=90000)
    exp = d.st("drnAutoSp(t.D.g['Н'].cs, drnStemOf(t.D.g['Н'].cs)).l")  # the stem of Н itself, not the median with the solid ellipse
    assert d.st("t.D.g['Н'].sp.l") == exp, ('C06', exp, d.st("JSON.stringify(t.D.g['Н'].sp)"))
    assert pg.evaluate("weightOf(S.styles.regular.p).name") == 'Regular', 'C14'
    pg.evaluate("document.getElementById('view-draw').hidden=true;GT_DRAW.onHide()")
    pg.evaluate("iuRegisterNow()")
    name, data, path = s.download('ttf')
    f = TTFont(io.BytesIO(data)); nm = f['name']
    n1 = nm.getName(1, 3, 1, 0x409).toUnicode(); n2 = nm.getName(2, 3, 1, 0x409).toUnicode()
    assert len(n1) <= 31 and not any(c in n1 for c in '/:<>'), ('C13 nameID1', n1)
    assert n2 == 'Regular' and name.endswith('-Regular.ttf'), ('C14', n2, name)
    # C07: status plaque short + clickable list, nothing clipped
    pg.wait_for_function("ST&&ST.items&&ST.items.some(i=>i.kind==='cover')", timeout=60000)
    pg.wait_for_function("document.querySelector('#st-plaque .st-t').textContent.startsWith('Нет ')", timeout=20000)
    t = pg.evaluate("(()=>{const e=document.querySelector('#st-plaque .st-t');return [e.textContent,e.scrollWidth<=e.clientWidth+1,e.getAttribute('role'),e.scrollWidth,e.clientWidth,innerWidth,document.querySelector('#st-plaque').getBoundingClientRect().width,document.documentElement.dataset.theme||'']})()")
    assert '…' not in t[0] and t[1] and t[2] == 'button', ('C07', t)
    pg.click('#st-plaque .st-t'); pg.wait_for_selector('#st-pop')
    pop = pg.evaluate("(()=>{const r=document.querySelector('#st-pop').getBoundingClientRect();return [document.querySelector('#st-pop').innerText,r.left>=0,r.right<=innerWidth,r.bottom<=innerHeight]})()")
    assert pop[1] and pop[2] and pop[3] and 'Не хватает' in pop[0] and ' Ё' in pop[0] + ' ', ('C07 popover', pop)
    pg.keyboard.press('Escape')
    errs = [e for e in s.errs if 'ERR_' not in e]
    assert not errs, errs[:3]
    s.close()
    return f'name1={n1!r} file={name}'


def tiny_check(p):
    s, d = setup(p, 'fx80f2t'); pg = s.pg
    pg.evaluate("dwClose('draw')")
    d.goto('О'); d.tool('brush'); pg.evaluate("GT_DRAW._t.D.w=8")
    px, py = d.w2s(250, 350); pg.mouse.click(px, py); pg.wait_for_timeout(200)
    pg.click('#dr-sv'); pg.wait_for_timeout(300)
    t = pg.evaluate("[...document.querySelectorAll('.toast')].map(e=>e.textContent).join('|')")
    assert 'очень мелкий' in t, ('C03', t)
    s.close(); return 'tiny warned'


def tour_check(p):
    s, d = setup(p, 'fx80f2tour'); pg = s.pg
    pg.evaluate("dwClose('draw')")
    txt = pg.evaluate("(()=>{const T=document.querySelector('#dr-fontb');return T&&T.disabled})()")
    assert txt, 'precondition: build button disabled before a glyph is saved'
    src = open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ui_tour.js'), encoding='utf-8').read()
    assert 'drHas()' in src and "q('#dr-sv')" in src, 'C05'
    s.close(); return 'tour step state-aware'


def import_check(p):
    s = CS(p, 'fx80f2imp'); pg = s.pg
    d = tempfile.mkdtemp(prefix='f2imp')
    files = []
    for n, b in [('picture1.png', b'not a png'), ('broken.svg', b'<svg'), ('notes.txt', b'hello'), ('Q.png', b'\x89PNG\r\n\x1a\nzzzz')]:
        fp = os.path.join(d, n); open(fp, 'wb').write(b); files.append(fp)
    pg.click('#imp-card'); pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
    pg.set_input_files('#imp-files', files); pg.wait_for_timeout(2500)
    st = pg.inner_text('#imp-status')
    assert 'Не принято файлов: 4' in st, ('C02', st)
    for n in ('picture1.png', 'broken.svg', 'notes.txt', 'Q.png'):
        assert n + ' — ' in st, ('C02 reason for ' + n, st)
    s.close(); return 'one count + reasons'


def phone_check(p):
    s, d = setup(p, 'fx80f2ph', {'width': 390, 'height': 844}); pg = s.pg
    shape(d, 'Н', RECT_H); pg.wait_for_timeout(300)
    r = pg.evaluate("(()=>{const e=document.querySelector('.toast.on');if(!e)return null;const b=e.getBoundingClientRect();return [b.top,innerHeight]})()")
    assert r and r[0] > r[1] * 0.5, ('C09 toast low on phone', r)
    pg.evaluate("dwOpen('draw','grid')"); pg.wait_for_timeout(700)
    h = pg.evaluate("(()=>{const b=document.querySelector('#dr-side').getBoundingClientRect();return [b.top,b.height,innerHeight]})()")
    assert h[1] <= h[2] * 0.47 + 1, ('C09 sheet height', h)
    s.close(); return f'toast top {r[0]:.0f}, sheet {h[1]:.0f}px'


if __name__ == '__main__':
    sys.exit(check_all([('f2-draw', draw_check), ('f2-tiny', tiny_check), ('f2-tour', tour_check), ('f2-import', import_check), ('f2-phone', phone_check)]))
