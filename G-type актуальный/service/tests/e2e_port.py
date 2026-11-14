"""Portfolio features (ui_port.js / ui_port_x.js): own text (library + home sync), «Перед скачиванием» contents, license in the exported name table (ID 13/14, fontTools:
ttf, woff, family zip, variable), author signature switch (ID 9/12), pins (4) + migration of the old showcase, reorder (pointer drag + arrows + aria-live), collections
(create / add / rename / delete with inline confirm, keyboard menu), share PNG 1080x1350 (saveFile) and link copy fallback, profile settings in the drawer save flow,
backup round trip, empty states, phone 390 overflow, both themes, no alert/confirm/prompt. One PASS/FAIL line per check (tests/common.py)."""
import io, os, sys, json, zipfile, struct
sys.path.insert(0, os.path.dirname(__file__))
from common import vf_ttf, Session, check_all, LOGS
from fontTools.ttLib import TTFont

SEED = """(async()=>{
 for (const [id,d] of [['renessa',14],['stroka',10],['modul',8],['kaplya',12],['ustav',6]]) { libOpen(id); S.styles.regular.p.stem=(S.styles.regular.p.stem||100)+d; bump(); }
 setTab('home'); await new Promise(r=>setTimeout(r,300)); return PROF.projects().map(f=>f.key);})()"""
META = """PROF.setMeta(Object.assign(PROF.meta(),{first:'Анна',last:'Морозова',bio:'Шрифтовой дизайнер.',
 links:[{net:'Сайт',url:'https://morozova.ru'}]}))"""
READY5 = """(()=>{for(const k of ['lib:renessa','lib:stroka','lib:modul','lib:kaplya','lib:ustav']){PROF.setReady(k,true);PROF.setVis(k,'pub');}})()"""
KEYS = ['lib:renessa', 'lib:stroka', 'lib:modul', 'lib:kaplya', 'lib:ustav']


def reload_keep(s, pg):
    """pg.reload() (common.py re-installs, once and visibly, the keys the browser dropped on reload: the same hand-over for every lane)."""
    pg.reload()


def boot(p, name, vp=None):
    s = Session(p, name)
    s.dialogs = []
    s.pg.on('dialog', lambda d: (s.dialogs.append(d.message), d.dismiss()))
    if vp:
        s.pg.set_viewport_size({'width': vp[0], 'height': vp[1]})
    return s


def profile(pg):
    pg.evaluate("setTab('profile')")
    pg.wait_for_selector('#view-profile .pf-wrap .sk-host', timeout=5000)
    pg.wait_for_timeout(150)


def seeded(s, ready=True):
    s.pg.evaluate(SEED); s.pg.evaluate(META)
    if ready:
        s.pg.evaluate(READY5)


def no_hscroll(pg, label):
    r = pg.evaluate("[document.documentElement.scrollWidth,document.documentElement.clientWidth,document.body.scrollWidth]")
    assert r[0] <= r[1] + 1 and r[2] <= r[1] + 1, f'{label}: horizontal overflow {r}'
    bad = pg.evaluate("""()=>{const W=innerWidth,o=[];for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||cs.position==='fixed')continue;
      if(r.right>W+2||r.left<-2){let p=e.parentElement,clip=false;while(p&&p!==document.body){const c=getComputedStyle(p);if(/(hidden|auto|scroll|clip)/.test(c.overflowX)){clip=true;break;}p=p.parentElement;}if(!clip)o.push((e.className||e.tagName)+'');}}return o.slice(0,5);}""")
    assert not bad, f'{label}: elements outside the viewport {bad}'


def png_size(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    return struct.unpack('>II', data[16:24])


def names(font):
    nm = font['name']
    g = lambda i: (nm.getName(i, 3, 1, 0x409).toUnicode() if nm.getName(i, 3, 1, 0x409) else None)
    return {i: g(i) for i in (9, 12, 13, 14)}


def export(s, item, lic=None, sign=None, fam_pick=None):
    """Скачать -> item -> «Перед скачиванием» (optionally set license / signature) -> «Скачать». Returns (filename, bytes)."""
    pg = s.pg
    pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=120000)
    pg.evaluate("document.querySelector('#ex-menu').click()")
    pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'", timeout=10000)
    pg.evaluate("x=>document.querySelector('#ex-list [data-x='+x+']').click()", item)
    pg.wait_for_selector('#xpv:not([hidden])', timeout=5000)
    if lic is not None:
        if pg.get_attribute('#xpv [data-xa=lic]', 'aria-expanded') != 'true':
            pg.click('#xpv [data-xa=lic]')
        pg.click(f'#xpv [data-xl={lic}]')
    if sign is not None:
        on = pg.is_checked('#xpv-sig')
        if on != sign:
            pg.click('#xpv label.tgl')
        assert pg.is_checked('#xpv-sig') == sign
    with pg.expect_download(timeout=240000) as d:
        pg.click('#xpv [data-xa=go]')
    dl = d.value
    path = os.path.join(LOGS, 'dl_port_' + dl.suggested_filename)
    dl.save_as(path)
    return dl.suggested_filename, open(path, 'rb').read()


# ---------------------------------------------------------------------------------------------------------------------------------------------
def own_text(p):
    s = boot(p, 'port_text')
    try:
        pg = s.pg
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard')
        assert pg.locator('#view-library .lt-in').count() == 1 and pg.locator('#view-lib .lt-in').count() == 0, 'field on library only'
        h0 = pg.evaluate("[document.querySelector('#libgrid .lcard').getBoundingClientRect().height,document.querySelector('#view-library').scrollHeight,document.querySelector('#libgrid .lcard').getBoundingClientRect().top]")
        sig0 = pg.evaluate("(()=>{const c=document.querySelector('#libgrid .lcv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;})()")
        pg.fill('#view-library .lt-in', 'Привет')
        pg.wait_for_function("window.LIBTXT==='Привет'")
        pg.wait_for_timeout(250)
        sig1 = pg.evaluate("(()=>{const c=document.querySelector('#libgrid .lcv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;})()")
        assert sig1 > 200 and sig1 != sig0, (sig0, sig1)
        h1 = pg.evaluate("[document.querySelector('#libgrid .lcard').getBoundingClientRect().height,document.querySelector('#view-library').scrollHeight,document.querySelector('#libgrid .lcard').getBoundingClientRect().top]")
        assert abs(h1[0] - h0[0]) < 1 and abs(h1[2] - h0[2]) < 1, f'layout jump {h0} -> {h1}'
        assert pg.evaluate("JSON.parse(sessionStorage.getItem('gtype-libtxt-s')).t") == 'Привет'
        # long text: field is limited, cards still draw (no empty canvases)
        pg.fill('#view-library .lt-in', 'Очень длинный текст для проверки обложек')
        pg.wait_for_timeout(250)
        assert len(pg.input_value('#view-library .lt-in')) <= 28
        assert pg.evaluate("[...document.querySelectorAll('#libgrid .lcv')].slice(0,12).every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;return false})"), 'empty canvas for long text'
        no_hscroll(pg, 'library long text')
        # chips are toggles
        pg.click('.lt-chips .chip[data-v="0123"]')
        assert pg.get_attribute('.lt-chips .chip[data-v="0123"]', 'aria-pressed') == 'true' and pg.input_value('#view-library .lt-in') == '0123'
        pg.click('.lt-chips .chip[data-v="0123"]')
        assert pg.get_attribute('.lt-chips .chip[data-v="0123"]', 'aria-pressed') == 'false' and pg.input_value('#view-library .lt-in') == '' and pg.evaluate("window.LIBTXT")==''
        pg.click('.lt-chips .chip[data-v=name]')
        assert pg.evaluate("window.LIBTXT_NAME") is True and pg.get_attribute('.lt-chips .chip[data-v=name]', 'aria-pressed') == 'true'
        pg.click('.lt-chips .chip[data-v=name]')
        assert pg.evaluate("window.LIBTXT_NAME") is False
        # clear button
        pg.fill('#view-library .lt-in', 'Аа Бб'); pg.wait_for_function("window.LIBTXT==='Аа Бб'")
        assert pg.is_visible('#view-library .lt-x')
        pg.click('#view-library .lt-x')
        pg.wait_for_function("window.LIBTXT===''")
        assert pg.input_value('#view-library .lt-in') == '' and not pg.is_visible('#view-library .lt-x')
        # home has no field and keeps font names on its cards; the library keeps the text
        pg.fill('#view-library .lt-in', 'Дом'); pg.wait_for_function("window.LIBTXT==='Дом'")
        pg.evaluate("setTab('home')"); pg.wait_for_selector('#libcards .lcv'); pg.wait_for_timeout(250)
        assert pg.locator('#view-lib .lt-in').count() == 0, 'no own-text field on home'
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#view-library .lt-in', state='visible')
        assert pg.input_value('#view-library .lt-in') == 'Дом'
        # survives reload within the session
        reload_keep(s, pg); pg.wait_for_function("typeof S!=='undefined' && !!document.querySelector('#view-library .lt-in')", timeout=30000)
        assert pg.input_value('#view-library .lt-in') == 'Дом' and pg.evaluate("window.LIBTXT") == 'Дом'
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'library own text (home without field), chips toggle, ✕ clears, no layout jump, long text fits, sessionStorage'
    finally:
        s.close()


def export_preview(p):
    s = boot(p, 'port_xpv')
    try:
        pg = s.pg
        pg.evaluate(META)
        s.open_font('stroka')
        pg.evaluate("document.querySelector('#ex-menu').click()")
        pg.evaluate("document.querySelector('#ex-list [data-x=ttf]').click()")
        pg.wait_for_selector('#xpv:not([hidden])')
        t = pg.inner_text('#xpv')
        for need in ('Перед скачиванием', 'Начертания', 'Кириллица', 'Латиница', 'Возможности OpenType', 'Лицензия', 'Подпись автора', 'Файлы', '≈', 'Кернинг'):
            assert need in t, f'«{need}» missing in the preview'
        files = pg.evaluate("[...document.querySelectorAll('#xpv .xpv-files .f b')].map(b=>b.textContent)")
        assert len(files) == 2 and files[0].endswith('.ttf'), files
        assert pg.evaluate("[...document.querySelectorAll('#xpv .xpv-files .f span')].every(e=>e.textContent.startsWith('≈'))"), 'sizes are estimates'
        # formats
        pg.click('#xpv [data-xf=fam]'); assert 'family.zip' in pg.inner_text('#xpv .xpv-files')
        pg.click('#xpv [data-xf=woff]'); assert '.woff' in pg.inner_text('#xpv .xpv-files')
        pg.click('#xpv [data-xf=vf]'); assert 'VF' in pg.inner_text('#xpv .xpv-files')
        # stock Stroka keeps its own OFL passport, no choice made -> OFL badge from the passport
        assert pg.locator('#xpv .lic-b[data-l=ofl]').count() == 1
        # coverage: partial rows are marked
        assert pg.locator('#xpv .xpv-cov .r').count() == 3
        # Esc closes, focus returns, no counters next to headings
        pg.keyboard.press('Escape'); pg.wait_for_selector('#xpv', state='hidden')
        # signature switch is bound to the profile setting and the real author object
        pg.evaluate("document.querySelector('#ex-menu').click()"); pg.evaluate("document.querySelector('#ex-list [data-x=ttf]').click()")
        pg.wait_for_selector('#xpv:not([hidden])')
        assert pg.is_checked('#xpv-sig') and pg.evaluate("PROF.meta().sign") is True and pg.evaluate("GT_AUTHOR&&GT_AUTHOR.name") == 'Анна Морозова'
        pg.click('#xpv label.tgl')
        assert pg.evaluate("PROF.meta().sign") is False and pg.evaluate("GT_AUTHOR") is None and not pg.is_checked('#xpv-sig')
        pg.keyboard.press('Escape')
        # profile drawer shows the same value
        profile(pg); pg.click('[data-pf=edit]'); pg.wait_for_selector('.pf-drawer #pf-sign')
        assert not pg.is_checked('#pf-sign'), 'profile setting must follow the preview switch'
        # no name -> switch disabled
        pg.keyboard.press('Escape'); pg.evaluate("PROF.setMeta(Object.assign(PROF.meta(),{first:'',last:''}))")
        pg.evaluate("setTab('edit')")
        pg.evaluate("document.querySelector('#ex-menu').click()"); pg.evaluate("document.querySelector('#ex-list [data-x=ttf]').click()")
        pg.wait_for_selector('#xpv:not([hidden])')
        assert pg.is_disabled('#xpv-sig')
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'contents (styles, coverage, OpenType, license, signature, ≈ files), format switch, signature = profile setting = GT_AUTHOR'
    finally:
        s.close()


def license_files(p):
    s = boot(p, 'port_lic')
    try:
        pg = s.pg
        pg.evaluate(META)
        s.open_font('volt')
        # stock font, nothing chosen: current behaviour (no 13/14)
        _, b = export(s, 'ttf')
        n = names(TTFont(io.BytesIO(b)))
        assert n[13] is None and n[14] is None, n
        assert n[9] == 'Анна Морозова' and n[12] == 'https://morozova.ru', n
        # OFL
        nm, b = export(s, 'ttf', lic='ofl', sign=False)
        n = names(TTFont(io.BytesIO(b)))
        assert 'SIL Open Font License' in n[13] and n[14] == 'https://openfontlicense.org', n
        assert n[9] is None or 'Морозова' not in n[9], 'signature must be absent with the switch off'
        # CC BY-NC
        nm, b = export(s, 'ttf', lic='cc', sign=True)
        n = names(TTFont(io.BytesIO(b)))
        assert 'CC BY-NC' in n[13] and n[14] == 'https://creativecommons.org/licenses/by-nc/4.0/' and n[9] == 'Анна Морозова', n
        # all rights reserved: ID 13, no ID 14
        nm, b = export(s, 'ttf', lic='arr')
        n = names(TTFont(io.BytesIO(b)))
        assert n[13] == 'All rights reserved.' and n[14] is None, n
        # woff
        nm, b = export(s, 'woff', lic='cc')
        f = TTFont(io.BytesIO(b)); assert f.flavor == 'woff'
        n = names(f); assert 'CC BY-NC' in n[13] and n[14].startswith('https://creativecommons.org'), n
        # variable font
        nm, b = export(s, 'vf', lic='ofl')
        b = vf_ttf(b)
        f = TTFont(io.BytesIO(b)); assert 'fvar' in f
        n = names(f); assert 'SIL Open Font License' in n[13] and n[14] == 'https://openfontlicense.org', n
        # family zip: every file carries it
        nm, b = export(s, 'fam', lic='cc')
        z = zipfile.ZipFile(io.BytesIO(b)); tt = [x for x in z.namelist() if x.endswith('.ttf')]
        assert len(tt) >= 4, z.namelist()
        for x in tt:
            n = names(TTFont(io.BytesIO(z.read(x)))); assert 'CC BY-NC' in n[13] and n[14].startswith('https://creativecommons.org'), (x, n)
        # the choice is stored per font in the profile and survives a reload; another stock font is unaffected
        assert pg.evaluate("PROF.meta().lic.volt") == 'cc'
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined' && typeof S!=='undefined'", timeout=30000)
        assert pg.evaluate("PROF.meta().lic.volt") == 'cc' and pg.evaluate("GT_LICENSE('volt').url").startswith('https://creativecommons') and pg.evaluate("GT_LICENSE('kvadra')") is None
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'name 13/14 (fontTools) in ttf / woff / variable / every file of the family zip; ARR has no 14; stock default untouched; per-font choice persists'
    finally:
        s.close()


def default_license(p):
    s = boot(p, 'port_deflic')
    try:
        pg = s.pg
        seeded(s)
        pg.evaluate("PROF.meta().defLic='arr';PROF.saveMeta()")
        s.open_font('renessa')
        nm, b = export(s, 'ttf')
        n = names(TTFont(io.BytesIO(b)))
        assert n[13] == 'All rights reserved.' and n[14] is None, ('own font takes the profile default', n)
        return 'own (edited) font takes the default license from the profile'
    finally:
        s.close()


def pins_migration(p):
    s = boot(p, 'port_pins')
    try:
        pg = s.pg
        seeded(s)
        # legacy profile: old showcase numbers on proj entries, no pins field
        pg.evaluate("""(()=>{const m=PROF.meta();const o=JSON.parse(JSON.stringify(m));delete o.pins;
          for(const k of Object.keys(o.proj))o.proj[k].pin=0;
          o.proj['lib:modul'].pin=1;o.proj['lib:renessa'].pin=2;o.proj['lib:stroka'].pin=3;
          localStorage.setItem('gtype-profile-v1',JSON.stringify(o));})()""")
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined' && typeof S!=='undefined'", timeout=30000)
        assert pg.evaluate("PROF.meta().pins") == ['lib:modul', 'lib:renessa', 'lib:stroka'], pg.evaluate("PROF.meta().pins")
        profile(pg)
        assert pg.locator('.sk-pins .sk-card').count() == 3 and pg.locator('.sk-pins .sk-slot').count() == 1
        ttl = pg.evaluate("[...document.querySelectorAll('.sk-pins .sk-card .cap b')].map(b=>b.textContent)")
        assert ttl == ['Модуль', 'Ренесса', 'Строка'], ttl
        assert not pg.locator('.pf-vcard,.pf-vgrid').count()
        # headings carry no counters
        heads = pg.evaluate("[...document.querySelectorAll('.sk-sect .vhead h2')].map(h=>h.textContent.trim())")
        assert heads == ['Закреплённые', 'Работы', 'Подборки', 'Черновики'], heads
        assert 'из 4' not in pg.inner_text('#view-profile')
        # real fonts on the pinned cards
        sig = pg.evaluate("""[...document.querySelectorAll('.sk-pins .sk-card canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,h=0;for(let i=3;i<d.length;i+=4)if(d[i]>0){n++;h=(h*31+i)%1000003}return [n,h]})""")
        assert all(a[0] > 500 for a in sig) and len({tuple(a) for a in sig}) == 3, sig
        # pin the 4th, the 5th is refused with a calm toast; unpin frees a slot
        pg.click('#sk-works .sk-card[data-k="lib:kaplya"] [data-sk=pin]')
        pg.wait_for_function("PROF.meta().pins.length===4")
        assert pg.locator('.sk-pins .sk-card').count() == 4 and pg.locator('.sk-pins .sk-slot').count() == 0
        pg.click('#sk-works .sk-card[data-k="lib:ustav"] [data-sk=pin]')
        assert pg.evaluate("PROF.meta().pins.length") == 4
        assert 'четыре места' in pg.inner_text('.toast')
        pg.click('.sk-pins .sk-card[data-k="lib:modul"] [data-sk=pin]')
        pg.wait_for_function("PROF.meta().pins.length===3")
        assert pg.evaluate("PROF.meta().pins") == ['lib:renessa', 'lib:stroka', 'lib:kaplya']
        # folder menu: limit and wording
        pg.click('#sk-works .sk-card[data-k="lib:modul"] [data-sk=pin]'); pg.wait_for_function("PROF.meta().pins.length===4")
        pg.evaluate("setTab('folder')"); pg.wait_for_selector('#pf-flist .pf-fc')
        pg.click('.pf-fc[data-card="lib:ustav"] [data-pf=more]'); pg.wait_for_selector('.menu.pop:not([hidden])')
        mi = pg.locator('.menu.pop [data-pf=m-pin]')
        assert mi.is_disabled() and 'места заняты' in mi.inner_text(), mi.inner_text()
        pg.keyboard.press('Escape')
        # hiding a font removes its pin
        pg.click('.pf-fc[data-card="lib:modul"] [data-pf=vis][data-v=hid]')
        pg.wait_for_function("!PROF.meta().pins.includes('lib:modul')")
        # persisted
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined'", timeout=30000)
        assert pg.evaluate("PROF.meta().pins") == ['lib:renessa', 'lib:stroka', 'lib:kaplya']
        # guest sees only pins + published works, no owner controls
        profile(pg); pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill')
        assert pg.locator('#view-profile [data-sk=pin],#view-profile [data-sk=ord],#view-profile [data-sk=slot],#view-profile .sk-ord').count() == 0
        assert pg.locator('.sk-pins .sk-card').count() == 3
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'legacy showcase migrates (first 3), 4 pins max with calm refusal, menu hint, hide unpins, persists, guest view clean'
    finally:
        s.close()


def reorder(p):
    s = boot(p, 'port_ord', vp=(1440, 1500))
    try:
        pg = s.pg
        seeded(s)
        profile(pg)
        pg.click('[data-sk=ord]'); pg.wait_for_selector('.sk-ordmode .sk-ord')
        pg.evaluate("document.querySelector('#sk-works').scrollIntoView({block:'center'})")
        order = lambda: pg.evaluate("[...document.querySelectorAll('#sk-works .sk-card')].map(c=>c.dataset.k)")
        o0 = order(); assert len(o0) == 5
        # arrows (keyboard path) + announcement
        first = o0[0]
        pg.focus(f'#sk-works .sk-card[data-k="{first}"] [data-sk=right]')
        pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
        o1 = order(); assert o1[1] == first and o1[0] == o0[1], (o0, o1)
        live = pg.inner_text('#sk-live'); assert '2-я' in live or 'теперь 2' in live, live
        assert pg.evaluate("document.activeElement.dataset.sk") == 'right', 'focus stays on the arrow'
        assert pg.get_attribute('#sk-live', 'aria-live') == 'polite'
        # first card has no «earlier»
        assert pg.is_disabled(f'#sk-works .sk-card >> nth=0 >> [data-sk=left]')
        # pointer drag: last card to the first place (mouse path; same events as touch pointers)
        last = o1[-1]
        g = pg.locator(f'#sk-works .sk-card[data-k="{last}"] [data-sk=grip]').bounding_box()
        t = pg.locator('#sk-works .sk-card >> nth=0').bounding_box()
        pg.mouse.move(g['x'] + g['width'] / 2, g['y'] + g['height'] / 2)
        pg.mouse.down()
        pg.mouse.move(t['x'] + t['width'] / 2 + 10, t['y'] + t['height'] / 2, steps=8)
        assert pg.evaluate(f"document.querySelector('#sk-works .sk-card[data-k=\"{last}\"]').classList.contains('drag')")
        assert pg.locator('#sk-works .sk-card.over').count() == 1
        pg.mouse.up(); pg.wait_for_timeout(200)
        o2 = order(); assert o2[0] == last, (o1, o2)
        assert pg.evaluate("PROF.meta().order")[0] == last
        # touch-style pointer events through the dispatch API
        pg.evaluate("""(k)=>{const g=document.querySelector('#sk-works .sk-card[data-k="'+k+'"] [data-sk=grip]');const r=g.getBoundingClientRect();const f=(t,x,y)=>g.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y}));
          const t=document.querySelector('#sk-works .sk-card:nth-child(3)').getBoundingClientRect();
          f('pointerdown',r.x+5,r.y+5);f('pointermove',t.x+t.width/2,t.y+t.height/2);f('pointerup',t.x+t.width/2,t.y+t.height/2);}""", last)
        pg.wait_for_timeout(200)
        o3 = order(); assert o3[2] == last, (o2, o3)
        # persists
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined'", timeout=30000)
        profile(pg); assert order() == o3
        # leaving the mode hides the controls; Escape in the mode does not break anything
        assert pg.locator('.sk-ordmode').count() == 0 and not pg.is_visible('#sk-works .sk-ord >> nth=0'), 'order mode is off after reload'
        pg.click('[data-sk=ord]'); pg.wait_for_selector('.sk-ordmode'); pg.click('[data-sk=ord]'); assert pg.locator('.sk-ordmode').count() == 0
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'arrows + aria-live (focus kept), mouse drag, touch pointer events, order persists'
    finally:
        s.close()


def collections(p):
    s = boot(p, 'port_coll')
    try:
        pg = s.pg
        seeded(s)
        profile(pg)
        # empty state
        assert 'Подборок пока нет' in pg.inner_text('#view-profile') and pg.locator('.sk-bands').count() == 0
        pg.click('[data-sk=newc]'); pg.wait_for_selector('.dlg70 #sk-cn')
        assert pg.is_disabled('#sk-ok')
        pg.fill('#sk-cn', 'Для афиш'); pg.fill('#sk-cd', 'Плотные и широкие')
        pg.click('#sk-ok'); pg.wait_for_selector('.dlg70', state='detached')
        assert pg.locator('#view-profile .pband').count() == 1 and 'Для афиш' in pg.inner_text('#view-profile .pband h3') and 'Плотные' in pg.inner_text('#view-profile .pband')
        # card menu in the library, by keyboard
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard[data-font=volt] .lc-more')
        pg.focus('#libgrid .lcard[data-font=volt] .lc-more')
        pg.keyboard.press('Enter'); pg.wait_for_selector('.menu70')
        assert pg.evaluate("document.activeElement.closest('.menu70')!==null"), 'focus moves into the menu'
        assert pg.get_attribute('#libgrid .lcard[data-font=volt] .lc-more', 'aria-expanded') == 'true'
        pg.keyboard.press('Enter'); pg.wait_for_selector('.menu70 [data-m=tog]')   # «В подборку» opens the list
        pg.keyboard.press('Enter'); pg.wait_for_function("PROF.meta().colls[0].fonts.includes('volt')")
        assert pg.evaluate("document.querySelector('.menu70 [data-m=tog]').getAttribute('aria-checked')") == 'true'
        pg.keyboard.press('Escape'); pg.wait_for_selector('.menu70', state='detached')
        assert pg.evaluate("document.activeElement.className") == 'lc-more', 'focus returns to the ⋯ button'
        assert pg.evaluate("S.tab") == 'library', 'menu must not open the font'
        # new collection from the menu adds the font at once
        pg.click('#libgrid .lcard[data-font=kvadra] .lc-more'); pg.click('.menu70 [data-m=coll]'); pg.click('.menu70 [data-m=new]')
        pg.wait_for_selector('.dlg70 #sk-cn'); pg.fill('#sk-cn', 'Спокойные'); pg.click('#sk-ok')
        pg.wait_for_function("PROF.meta().colls.length===2")
        assert pg.evaluate("PROF.meta().colls[1].fonts") == ['kvadra']
        # picker on the profile
        profile(pg)
        pg.click('#view-profile .pband[data-c] [data-sk=addto] >> nth=0'); pg.wait_for_selector('.sk-pk')
        pg.click('.sk-pk[data-f=stroka]'); pg.wait_for_function("PROF.meta().colls[0].fonts.includes('stroka')")
        pg.click('.dlg70 [data-x] >> nth=-1'); pg.wait_for_selector('.dlg70', state='detached')
        assert pg.locator('#view-profile .pband').first.locator('.spc[data-sk=openf]').count() == 2
        # rename / edit
        pg.click('#view-profile .pband >> nth=0 >> [data-sk=editc]'); pg.wait_for_selector('#sk-cn')
        assert pg.input_value('#sk-cn') == 'Для афиш'
        pg.fill('#sk-cn', 'Афиши и вывески'); pg.click('#sk-ok'); pg.wait_for_selector('.dlg70', state='detached')
        assert 'Афиши и вывески' in pg.inner_text('#view-profile .pband >> nth=0')
        # delete: inline confirm, Esc cancels, Отмена cancels, Удалить removes
        pg.click('#view-profile .pband >> nth=0 >> [data-sk=delc]')
        pg.wait_for_selector('#view-profile .pband.confirm [data-sk=delno]')
        assert pg.evaluate("document.activeElement.dataset.sk") == 'delno', 'focus on the safe button'
        assert 'Удалить подборку' in pg.inner_text('#view-profile .pband.confirm') and 'Шрифты останутся' in pg.inner_text('#view-profile .pband.confirm')
        pg.keyboard.press('Escape'); pg.wait_for_selector('#view-profile .pband.confirm', state='detached')
        assert pg.evaluate("PROF.meta().colls.length") == 2
        pg.click('#view-profile .pband >> nth=0 >> [data-sk=delc]'); pg.click('[data-sk=delno]')
        assert pg.locator('#view-profile .pband.confirm').count() == 0 and pg.evaluate("PROF.meta().colls.length") == 2
        pg.click('#view-profile .pband >> nth=0 >> [data-sk=delc]'); pg.click('[data-sk=delok]')
        pg.wait_for_function("PROF.meta().colls.length===1")
        assert pg.evaluate("PROF.meta().colls[0].name") == 'Спокойные' and pg.locator('#view-profile .pband').count() == 1
        # persists; goes into the backup and back
        ls = pg.evaluate("localStorage.getItem('gtype-profile-v1')")
        assert ls and 'Спокойные' in ls, 'collection was not written to localStorage before the reload'
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined'", timeout=30000)
        n = pg.evaluate("PROF.meta().colls.length")
        assert n == 1, ('colls after reload', n, pg.evaluate("(localStorage.getItem('gtype-profile-v1')||'').length"))
        b = pg.evaluate("JSON.stringify(PROF.buildBackup())"); bj = json.loads(b)
        assert bj['profile']['colls'][0]['name'] == 'Спокойные' and 'pins' in bj['profile'] and 'nameFont' in bj['profile'] and 'defLic' in bj['profile'] and 'lic' in bj['profile']
        pg.evaluate("PROF.setMeta(Object.assign({},PROF.meta(),{colls:[]}))")
        assert pg.evaluate("PROF.meta().colls.length") == 0
        pg.evaluate("t=>PROF.applyBackup(PROF.checkBackup(t))", b)
        assert pg.evaluate("PROF.meta().colls[0].name") == 'Спокойные'
        # guest sees the collection without owner controls
        profile(pg); pg.click('[data-pf=guest]'); pg.wait_for_selector('.pf-gpill')
        assert pg.locator('#view-profile .pband').count() == 1 and pg.locator('#view-profile [data-sk=editc],#view-profile [data-sk=delc],#view-profile [data-sk=addto],#view-profile [data-sk=newc]').count() == 0
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'create / menu by keyboard / picker / rename / delete with inline confirm (Esc, Отмена, Удалить), persists, backup round trip, guest view'
    finally:
        s.close()


def share(p):
    s = boot(p, 'port_share')
    try:
        pg = s.pg
        s.ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        seeded(s)
        pg.evaluate("PROF.meta().pins=['lib:renessa','lib:stroka'];PROF.saveMeta()")
        profile(pg)
        # FX80 F4: one dialog everywhere = SHARE (ui_share.js); the old PNG-only dialog and its fake link are gone
        READY = "SHARE.state.open&&SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent"
        pg.click('[data-pf=share]'); pg.wait_for_function(READY, timeout=120000)
        assert pg.evaluate("SHARE.state.m.id") == 'renessa', 'profile share opens the pinned work'
        assert pg.evaluate("!document.querySelector('.shr-dlg,#shr-cp,#shr-l')"), 'old dialog / fake link must not exist'
        assert pg.evaluate("[...document.querySelectorAll('#pst button')].every(b=>!/Скопировать ссылку/.test(b.textContent))")
        pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
        # library card menu: right font, same dialog
        pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard[data-font=kvadra] .lc-more')
        pg.click('#libgrid .lcard[data-font=kvadra] .lc-more'); pg.click('.menu70 [data-m=share]')
        pg.wait_for_function(READY, timeout=120000)
        assert pg.evaluate("SHARE.state.m.id") == 'kvadra' and pg.evaluate("SHARE.state.m.name") == pg.evaluate("S.family"), 'library menu share: right font, editor naming'
        assert pg.evaluate("!!document.querySelector('#pst [data-r=sf]')||!!document.querySelector('#pst')")
        pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'profile + library card menu open the full SHARE dialog for the right font; no PNG-only dialog / fake link'
    finally:
        s.close()


def settings_drawer(p):
    s = boot(p, 'port_set')
    try:
        pg = s.pg
        seeded(s)
        profile(pg)
        assert pg.get_attribute('#view-profile', 'data-pacc') == '1'
        pg.click('.pf-head [data-pf=edit]'); pg.wait_for_selector('.pf-drawer .sk-ft')
        assert pg.evaluate("document.querySelector('.pf-drawer [data-save]').disabled") is True
        # choose: accent + name font + default license: nothing is applied until «Сохранить»
        pg.click('.pf-drawer [data-ac="5"]'); pg.click('.pf-drawer [data-nf=renessa]'); pg.click('.pf-drawer [data-dl=cc]')
        assert pg.evaluate("document.querySelector('.pf-drawer [data-save]').disabled") is False and not pg.locator('.pf-drawer .note').first.get_attribute('hidden')
        assert pg.get_attribute('#view-profile', 'data-pacc') == '1' and pg.evaluate("PROF.meta().nameFont") == '' and pg.evaluate("PROF.meta().defLic") == 'ofl'
        # radio group keyboard: arrows move the choice
        pg.focus('.pf-drawer [data-ac="5"]'); pg.keyboard.press('ArrowRight')
        assert pg.get_attribute('.pf-drawer [data-ac="6"]', 'aria-checked') == 'true' and pg.get_attribute('.pf-drawer [data-ac="5"]', 'aria-checked') == 'false'
        pg.click('.pf-drawer [data-ac="5"]')
        # closing with changes asks first; «Не сохранять» drops them
        pg.click('.pf-drawer [data-x] >> nth=0'); pg.wait_for_selector('.pf-uc')
        pg.click('[data-uc=drop]'); pg.wait_for_selector('.pf-drawer', state='detached')
        assert pg.get_attribute('#view-profile', 'data-pacc') == '1' and pg.evaluate("PROF.meta().acc") == 1
        # now save
        pg.click('.pf-head [data-pf=edit]'); pg.wait_for_selector('.pf-drawer .sk-ft')
        pg.click('.pf-drawer [data-ac="5"]'); pg.click('.pf-drawer [data-nf=renessa]'); pg.click('.pf-drawer [data-dl=cc]')
        pg.click('.pf-drawer [data-save]'); pg.wait_for_selector('.pf-drawer', state='detached')
        assert pg.get_attribute('#view-profile', 'data-pacc') == '5'
        m = pg.evaluate("PROF.meta()")
        assert m['acc'] == 5 and m['nameFont'] == 'renessa' and m['defLic'] == 'cc'
        assert pg.locator('h1.pf-name canvas.pf-namecv').count() == 1 and pg.get_attribute('h1.pf-name', 'aria-label') == 'Анна Морозова'
        n = pg.evaluate("(()=>{const c=document.querySelector('canvas.pf-namecv');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;})()")
        assert n > 300, 'name drawn with the chosen font'
        # persisted and reflected on the share card state
        reload_keep(s, pg); pg.wait_for_function("typeof PROF!=='undefined'", timeout=30000)
        assert pg.evaluate("PROF.meta().acc") == 5 and pg.evaluate("PROF.meta().nameFont") == 'renessa'
        profile(pg); assert pg.get_attribute('#view-profile', 'data-pacc') == '5'
        # reset the name font to the default
        pg.click('.pf-head [data-pf=edit]'); pg.wait_for_selector('.pf-drawer .sk-ft'); pg.click('.pf-drawer [data-nf=""]'); pg.click('.pf-drawer [data-save]')
        pg.wait_for_selector('.pf-drawer', state='detached')
        assert pg.locator('h1.pf-name canvas').count() == 0 and pg.inner_text('h1.pf-name') == 'Анна Морозова'
        # contrast of the six accents in both themes: dark ink on the tinted chip must be readable (>= 4.5) and white-on-ink avatar marks too
        res = pg.evaluate("""()=>{
          const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
          const rgb=(c,under)=>{cx.clearRect(0,0,1,1);if(under){cx.fillStyle=under;cx.fillRect(0,0,1,1);}cx.fillStyle=c;cx.fillRect(0,0,1,1);return [...cx.getImageData(0,0,1,1).data].slice(0,3);};
          const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
          const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
          const out=[];const v=document.querySelector('#view-profile');
          for(const th of ['light','dark']){document.documentElement.dataset.theme=th;
            for(let i=1;i<=6;i++){v.dataset.pacc=String(i);
              const chip=document.querySelector('#view-profile .chip.pf-soc');const cs=getComputedStyle(chip);
              const page=getComputedStyle(document.body).backgroundColor;
              const bg=rgb(cs.backgroundColor,page),ink=rgb(cs.color);
              const m=document.querySelector('#view-profile .pf-soc .pf-m');const ms=getComputedStyle(m);
              out.push([th,i,+cr(ink,bg).toFixed(2),+cr(rgb(ms.color),rgb(ms.backgroundColor)).toFixed(2)]);}}
          document.documentElement.dataset.theme='light';v.dataset.pacc='5';return out;}""")
        bad = [r for r in res if r[2] < 4.5 or r[3] < 3]
        assert not bad, f'low contrast on accent chips {bad}'
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'accent / name font / default license applied by «Сохранить», dirty note + confirm on close, radio arrows, persisted; 6 accents x 2 themes contrast ok (min ink %.2f)' % min(r[2] for r in res)
    finally:
        s.close()


def empty_states(p):
    s = boot(p, 'port_empty')
    try:
        pg = s.pg
        profile(pg)   # brand new profile: no fonts, no pins, no collections
        t = pg.inner_text('#view-profile')
        assert 'Здесь будут ваши лучшие работы' in t and 'Подборок пока нет' in t and 'Созданные шрифты' in t, t[:400]
        assert pg.locator('.sk-pins .sk-card,.sk-works,#view-profile .pband').count() == 0
        assert pg.locator('#view-profile [data-sk=newc]').count() == 1 and pg.locator('#view-profile .sk-emp .btn').count() >= 1 and pg.locator('#view-profile .btn.pri').count() == 1 and pg.locator('#view-profile [data-pf=lab-draw]').count() == 1  # FX80 F3 A12: one primary CTA in the empty profile (header «Редактировать профиль»), a path to draw stays
        assert not pg.locator('.sk-sect .vhead h2').filter(has_text='Работы').count(), 'no works heading when empty'
        no_hscroll(pg, 'empty profile')
        # guest: no empty hints of owner sections
        pg.evaluate("PROF.guestOn()"); pg.wait_for_selector('.pf-gpill')
        gt = pg.inner_text('#view-profile')
        assert 'Подборок пока нет' not in gt and 'лучшие работы' not in gt and pg.locator('.sk-sect').count() == 0
        pg.click('.pf-gpill [data-pf=unguest]')
        # fonts exist but nothing pinned: slot invitation, works listed, no counters
        seeded(s); profile(pg); pg.evaluate("PROF.render(true)")
        pg.wait_for_selector('.sk-pins .sk-slot')
        assert pg.locator('.sk-pins .sk-slot').count() == 4 and 'Закрепите лучшие работы' in pg.inner_text('.sk-pins')
        pg.click('.sk-pins .sk-slot >> nth=0')
        assert pg.evaluate("document.activeElement.dataset.sk") == 'pin', 'slot leads to the pin buttons'
        # own fonts empty in a collection band: library only
        pg.evaluate("PROF.meta().colls=[{id:'cx',name:'Пустая',desc:'',fonts:[]}];PROF.saveMeta();PROF.render(true)")
        pg.wait_for_selector('#view-profile .pband'); assert pg.locator('#view-profile .pband .spc.add').count() == 1
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'no fonts / no pins / no collections / empty collection / guest: calm states with next steps'
    finally:
        s.close()


def phone_layout(p):
    s = boot(p, 'port_phone', vp=(390, 844))
    try:
        pg = s.pg
        seeded(s)
        pg.evaluate("PROF.meta().pins=['lib:renessa','lib:stroka'];PROF.meta().colls=[{id:'c1',name:'Для афиш и вывесок',desc:'Плотные и широкие: читаются с другой стороны улицы.',fonts:['volt','ryvok','ustav','modul','rotunda']}];PROF.saveMeta()")
        for th in ('light', 'dark'):
            pg.evaluate("t=>{document.documentElement.dataset.theme=t}", th)
            profile(pg); no_hscroll(pg, f'profile {th}')
            pg.click('[data-sk=ord]'); no_hscroll(pg, f'profile order mode {th}'); pg.click('[data-sk=ord]')
            pg.evaluate("setTab('library')"); pg.wait_for_selector('#libgrid .lcard'); no_hscroll(pg, f'library {th}')
            pg.fill('#view-library .lt-in', 'Привет'); pg.wait_for_timeout(200); no_hscroll(pg, f'library own text {th}')
            pg.click('#view-library .lt-x')
            pg.evaluate("setTab('home')"); pg.wait_for_selector('#libcards .lcard'); no_hscroll(pg, f'home {th}')
            pg.click('#libcards .lcard .lc-more >> nth=0'); pg.wait_for_selector('.menu70'); no_hscroll(pg, f'menu {th}'); pg.keyboard.press('Escape')
            profile(pg); pg.click('[data-pf=share]'); pg.wait_for_selector('#pst:not([hidden]) canvas'); pg.wait_for_timeout(400); no_hscroll(pg, f'share {th}')
            pg.keyboard.press('Escape'); pg.wait_for_function("document.getElementById('pst').hidden", timeout=3000)
            pg.click('.pf-head [data-pf=edit]'); pg.wait_for_selector('.pf-drawer .sk-ft'); no_hscroll(pg, f'drawer {th}'); pg.keyboard.press('Escape'); pg.wait_for_selector('.pf-drawer', state='detached')
            s.open_font('volt') if th == 'light' else pg.evaluate("setTab('edit')")
            pg.evaluate("document.querySelector('#rail-dl')&&document.querySelector('#rail-dl').click()")
            pg.evaluate("(()=>{const m=document.querySelector('#ex-list');if(m&&m.hidden)exOpen(true);document.querySelector('#ex-list [data-x=ttf]').click();})()")
            pg.wait_for_selector('#xpv:not([hidden])'); no_hscroll(pg, f'export preview {th}')
            assert pg.is_visible('#xpv [data-xa=go]')
            pg.keyboard.press('Escape'); pg.wait_for_selector('#xpv', state='hidden')
        # no visible scrollbars in the new scroll areas
        sb = pg.evaluate("""[...document.querySelectorAll('.pb-row,.xpv-b,.sk-pick,.xpv-fmt,.lt-chips')].map(e=>{const cs=getComputedStyle(e);const w=getComputedStyle(e,'::-webkit-scrollbar').display;return [e.className,cs.scrollbarWidth,w]})""")
        assert all(x[1] == 'none' or x[2] == 'none' for x in sb), sb
        assert not s.dialogs and not s.errs, (s.dialogs, s.errs[:3])
        return 'no horizontal overflow at 390: profile (+order mode), library (+own text), home, card menu, share, drawer, export preview; light + dark; no visible scrollbars'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('port_text', own_text), ('port_xpv', export_preview), ('port_license', license_files), ('port_deflic', default_license), ('port_pins', pins_migration),
                        ('port_reorder', reorder), ('port_coll', collections), ('port_share', share), ('port_settings', settings_drawer), ('port_empty', empty_states),
                        ('port_phone', phone_layout)]))
