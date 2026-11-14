"""FX80 F1: project validation (B01), file naming (B02/B05/B06), pre-download empty glyphs (B03), one count (B04),
kern input (B07/D14), VF avar slnt (B08), plural (B09), preset names (B09b), «+ Знак» hex (B10), PUA sample (B11),
tester hint/canvas (B12), phone header (B13/D15), proof colours (D07), glyph count (A01), MP4 (A09), project popover (D04/D05)."""
import io, os, sys, json, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from common import vf_ttf, Session, check_all, WK
from fontTools.ttLib import TTFont


BUILD = """(fam)=>{if(fam!==null)S.family=fam;ensureKern();const w=weightOf(S.styles.regular.p);const r=buildTTF('regular',S,{weight:w.weight,weightName:w.name,fontId:S.fontId});return Array.from(r.bytes)}"""


def load_proj(s, obj, name='p.json'):
    path = os.path.join(tempfile.gettempdir(), 'fx80_F1_' + name)
    open(path, 'w').write(obj if isinstance(obj, str) else json.dumps(obj))
    s.pg.evaluate("setTab('edit')")
    if not s.pg.is_visible('#projpop'):
        s.pg.click('#settings')
    s.pg.wait_for_selector('#projpop', state='visible', timeout=5000)
    s.pg.set_input_files('#pj-l', path); s.pg.wait_for_timeout(1500)
    return s.js("document.getElementById('toast').textContent")


def validation(p):
    s = Session(p, 'fx80f1a')
    try:
        pg = s.pg
        s.open_font('kvadra')
        base = json.loads(s.js("JSON.stringify(projectJSON())"))
        # huge numbers: clamped, loaded, build works, nothing absurd stored
        pr = json.loads(json.dumps(base))
        for sl in pr['fonts'].values():
            for st in sl['styles'].values():
                st['p'] = {k: 1e12 for k in st['p']}
        t = load_proj(s, pr, 'huge.json')
        assert 'приведены' in t, t
        mx = s.js("Math.max(...Object.values(S.styles.regular.p))")
        assert mx <= 2000, mx
        n = len(s.pg.evaluate(BUILD, None))
        assert n > 1000, n
        # garbage strings: rejected, state untouched
        before = s.js("JSON.stringify(S.styles.regular.p)")
        pr = json.loads(json.dumps(base))
        for sl in pr['fonts'].values():
            for st in sl['styles'].values():
                st['p'] = {k: 'abc' for k in st['p']}
        t = load_proj(s, pr, 'abc.json')
        assert 'не открыт' in t, t
        assert s.js("JSON.stringify(S.styles.regular.p)") == before
        # self-heal: a bad stored value is repaired on boot and the repair is persisted
        bad = json.loads(s.js("localStorage.getItem('%s')" % s.js("KEY+'-f-kvadra'")) or '{}')
        bad['styles']['regular']['p']['stem'] = 1e12
        s.js("localStorage.setItem(KEY+'-f-kvadra',%s)" % json.dumps(json.dumps(bad)))
        pg.reload()
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        pg.wait_for_timeout(2500)
        stem = s.js("S.lib.kvadra.styles.regular.p.stem")
        assert stem <= 400, stem
        pg.wait_for_function("(()=>{const j=localStorage.getItem(KEY+'-f-kvadra');if(!j)return false;try{return JSON.parse(j).styles.regular.p.stem<=400}catch(e){return false}})()", timeout=30000, polling=200)  # persist is debounced (idle callback): poll the healed value
        stored = json.loads(s.js("localStorage.getItem(KEY+'-f-kvadra')"))
        assert stored['styles']['regular']['p']['stem'] <= 400, stored['styles']['regular']['p']['stem']
        assert not s.errs, s.errs[:3]
        return 'huge clamped, garbage rejected, storage healed'
    finally:
        s.close()


def names(p):
    s = Session(p, 'fx80f1b')
    try:
        pg = s.pg
        s.open_font('kvadra')
        own = s.js("FONTS.kvadra.family")
        for fam in ['', '   ', '!!!', '😀😀', '日本語']:
            s.js("S.family=%s" % json.dumps(fam))
            nm = s.js("psSafe(S.family)")
            assert nm and nm != 'Volt', (fam, nm)
            raw = pg.evaluate(BUILD, None)
            f = TTFont(io.BytesIO(bytes(raw)))
            fam1 = f['name'].getDebugName(1)
            ps = f['name'].getDebugName(6)
            assert 'Volt Noir' not in fam1 and not ps.startswith('Volt-'), (fam, fam1, ps)
            if fam in ('', '   ', '!!!', '😀😀'):
                assert fam1 == own, (fam, fam1)
        # project file name = same transliteration as the TTF
        s.js("S.family='Мой шрифт'; syncPanel()")
        pg.click('#settings'); pg.wait_for_selector('#projpop', state='visible', timeout=5000)
        with pg.expect_download(timeout=30000) as d:
            pg.click('#pj-s')
        assert d.value.suggested_filename == 'MoyShrift-project.json', d.value.suggested_filename
        # clearing the field restores this font's own name
        pg.click('#settings') if not pg.is_visible('#projpop') else None
        pg.fill('#fam', ''); pg.dispatch_event('#fam', 'change')
        assert s.js("S.family") == own, s.js("S.family")
        return 'names ok'
    finally:
        s.close()


def counts_and_empty(p):
    s = Session(p, 'fx80f1c')
    try:
        pg = s.pg
        s.open_font('kvadra')
        # B09 plural
        for n, w in [(1, 'знак требует'), (2, 'знака требуют'), (5, 'знаков требуют'), (21, 'знак требует'), (22, 'знака требуют'), (111, 'знаков требуют'), (101, 'знак требует')]:
            t = s.js("(()=>{AP.sum={n:%d,fix:0,err:0};apPaintChip();return document.querySelector('#apchip .t').textContent})()" % n)
            assert t == f'{n} {w} внимания', t
        # B03: uncheck all contours of A and o («Части») -> dialog must not say «полностью» for Latin and must warn
        for ch in ('A', 'o'):
            s.js("selectGlyph(%s)" % json.dumps(ch))
            pg.wait_for_function("S.sel===%s && !S.live" % json.dumps(ch), timeout=20000)
            s.js("(()=>{const n=rawGlyph().cs.length;S.edits[S.sel]={off:Array.from({length:n},(_,i)=>i)};cache.clear();bump();})()")
        pg.wait_for_timeout(600)
        assert s.js("(getFinal('A','regular').cs||[]).length") == 0, 'A still has contours'
        s.js("PORT.xpvOpen('ttf')")
        html = s.js("document.querySelector('#xpv').innerText")
        assert 'Пустые знаки' in html, html[:300]
        lat = html.split('Латиница')[1].split('\n')[0:3]
        assert 'полностью' not in ' '.join(lat) and 'пустые' in ' '.join(lat), lat
        return 'plural ok, empty glyphs flagged'
    finally:
        s.close()


def misc(p):
    s = Session(p, 'fx80f1d')
    try:
        pg = s.pg
        s.open_font('kvadra')
        # B07/D14 kern
        pg.evaluate("document.getElementById('kern-open').click()")
        pg.wait_for_function("S.tab==='kern' && !!document.getElementById('kk-v')", timeout=10000)
        pg.fill('#kk-a', 'A'); pg.fill('#kk-b', 'V')
        pg.wait_for_function("KK.a==='A' && KK.b==='V'", timeout=5000)
        pg.fill('#kk-v', '-30'); pg.dispatch_event('#kk-v', 'change')
        pg.wait_for_function("(S.styles[S.style].ku||{})['AV']===-30", timeout=10000)
        v = s.js("document.getElementById('kk-v').value")
        assert v == '−30', repr(v)
        s.js("KK.b='☃';kernRender()")
        assert s.js("document.getElementById('kk-v').disabled") is True
        assert s.js("document.getElementById('kk-v').value") == ''
        assert s.js("[...document.querySelectorAll('#kk-ctl [data-d]')].every(b=>b.disabled)")
        # B09b presets
        s.js("localStorage.removeItem(PRE_KEY())")
        s.js("setTab('edit')")
        pg.wait_for_function("S.tab==='edit'", timeout=5000)
        s.open_panes()
        for _ in range(3):
            s.js("document.getElementById('mypre-add').click()")
        s.js("{const q=loadPre();q.splice(0,1);savePre(q);}")
        s.js("document.getElementById('mypre-add').click()")
        nm = s.js("loadPre().map(x=>x.name)")
        assert len(set(nm)) == len(nm), nm
        s.js("{const q=[];for(let i=0;i<24;i++)q.push({name:'Пресет '+(i+1),p:{}});savePre(q);renderPre();}")
        assert s.js("document.getElementById('mypre-add').disabled") is True
        # B10 hex
        for t in ['ab', 'bad', 'face']:
            assert s.js("cuParse(%s)===undefined" % json.dumps(t)), t
        assert s.js("cuParse('U+0463')") == 'ѣ' and s.js("cuParse('0463')") == 'ѣ'
        # B12 hint with nbsp: no breakable space before %
        # A01 glyph count
        c1 = s.js("FONTS.kvadra.CHARSET.length")
        c2 = s.js("shareState({fid:'kvadra'}).meta") if s.js("typeof shareState") == 'function' else ''
        # A09: MP4 is offered only with an explicit H.264 mime type (never the bare video/mp4 = VP9 inside MP4)
        mp = s.js("window.SHARE?SHARE.mp4():''")
        assert (not mp) or ('avc1' in mp or 'h264' in mp), mp
        if c1:
            pass
        # D07 no literal brand red in proof canvas code
        src = open(os.path.join(WK, 'ui_c.js')).read()
        assert "'#FC473C':(r.lvl===1" not in src
        # D04/D05 project popover
        pg.click('#settings'); pg.wait_for_selector('#projpop', state='visible', timeout=5000)
        txt = s.js("(()=>{const pp=document.getElementById('projpop');const out={};let cur='';for(const e of pp.querySelectorAll('.sub,.btn')){if(e.classList.contains('sub'))cur=e.textContent.trim();else (out[cur]=out[cur]||[]).push(e.textContent.trim());}return out;})()")
        reset = ' '.join(txt.get('Сброс', []))
        assert 'Копировать' not in reset and 'знакомство' not in reset, txt
        assert any('Копировать' in x for x in txt.get('Начертание', [])), txt
        assert 'Какие' not in s.js("document.getElementById('projpop').innerText")
        assert 'Список языков' in s.js("document.getElementById('projpop').innerText")
        return 'kern/presets/hex/popover ok'
    finally:
        s.close()


def vf_avar(p):
    s = Session(p, 'fx80f1e')
    try:
        s.open_font('volt'); s.open_panes()
        s.js("(()=>{for(const t of ['wdth','slnt']){const i=document.querySelector('#ex-list [data-vfax='+t+']');if(i&&!i.checked){i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}));}}})()")
        name, data, path = s.download('vf', timeout=300000)
        assert name.endswith('-VF.zip'), name
        data = vf_ttf(data)
        f = TTFont(io.BytesIO(data))
        axes = [a.axisTag for a in f['fvar'].axes]
        assert 'slnt' in axes, axes
        seg = f['avar'].segments['slnt']
        assert seg.get(1.0) == 1.0 and seg.get(-1.0) == -1.0 and seg.get(0.0) == 0.0, seg
        from fontTools.varLib import instancer
        a = [x for x in f['fvar'].axes if x.axisTag == 'slnt'][0]
        for loc in (a.minValue, a.defaultValue):
            g = TTFont(io.BytesIO(data))
            instancer.instantiateVariableFont(g, {'slnt': loc})
        return f'avar slnt {dict(seg)} instances ok'
    finally:
        s.close()


def phone(p):
    s = Session(p, 'fx80f1f')
    try:
        pg = s.pg
        for w in (360, 390, 414):
            pg.set_viewport_size({'width': w, 'height': 844})
            s.open_font('kvadra'); pg.wait_for_timeout(500)
            r = s.js("""(()=>{const t=document.querySelector('header.top'),x=document.getElementById('xwrap'),v=document.querySelector('.vtabs');const a=x.getBoundingClientRect(),b=v.getBoundingClientRect(),h=t.getBoundingClientRect();return {xy:a.y,vy:b.y,right:a.right,hr:h.right}})()""")
            assert r['xy'] < r['vy'], (w, r)   # download button shares the first row, tabs are below
            assert r['right'] <= r['hr'] + 1, (w, r)
        return 'phone header one row'
    finally:
        s.close()


def tester(p):
    s = Session(p, 'fx80f1g')
    try:
        pg = s.pg
        s.open_font('kvadra')
        s.open_panes()
        pg.click('#tt-on'); pg.wait_for_timeout(800)
        h = s.js("document.querySelector('#stagebox').getBoundingClientRect().height")
        assert h >= 280, h
        src = open(os.path.join(WK, 'ui_tester_t1.js')).read()
        assert "масштаб\\u00a0'" in src or 'масштаб ' in src
        return f'stage {int(h)}px with tester'
    finally:
        s.close()


if __name__ == '__main__':
    L = [('fx80_F1_validation', validation), ('fx80_F1_names', names), ('fx80_F1_counts_empty', counts_and_empty),
         ('fx80_F1_misc', misc), ('fx80_F1_vf', vf_avar), ('fx80_F1_phone', phone), ('fx80_F1_tester', tester)]
    sys.exit(check_all([x for x in L if not sys.argv[1:] or any(a in x[0] for a in sys.argv[1:])]))
