"""«Столб» (stolb): library card (name, year, tags, collection), Russian slider labels + explanations, ranges, six preset chips that apply,
every slider changes the outline, exported TTF (family, Cyrillic+Latin cmap, kern), status plaque without confusable/empty issues,
no horizontal overflow at 390 px in library and editor. One PASS/FAIL line."""
import io, os, sys, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS
from fontTools.ttLib import TTFont

KEYS = {'stem': 'Насыщенность', 'wdth': 'Ширина', 'xh': 'Высота строчных', 'urnd': 'Радиус скруглений', 'uctr': 'Контраст',
        'uap': 'Апертура', 'ucut': 'Срез концов', 'ugap': 'Разрядка'}
RANGES = {'stem': [60, 176], 'wdth': [80, 130], 'xh': [462, 574], 'urnd': [0, 100], 'uctr': [0, 100], 'uap': [60, 140], 'ucut': [0, 100], 'ugap': [14, 70]}
CHIPS = ['Плакат', 'Плотный', 'Мягкий', 'Строгий', 'Афиша', 'Журнал']


def st_check(p):
    s = Session(p, 'stolb')
    try:
        pg = s.pg
        s.js("setTab('library')")
        pg.wait_for_selector('#libgrid .lcard[data-font=stolb]', timeout=15000)
        card = s.js("document.querySelector('#libgrid .lcard[data-font=stolb]').textContent.replace(/\\s+/g,' ')")
        assert 'Столб' in card and s.js('FONT_META.stolb.year') == 2026, card
        tags = s.js("FONT_META.stolb.tags").__iter__()
        tags = list(tags)
        for t in ('grot', 'narrow', 'disp', 'basic'):
            assert t in tags, tags
        assert 'vf' not in tags, 'no VF built: tag «Вариативный» must be absent'
        assert 'sign' in s.js("PODB.filter(c=>c.fonts.some(f=>f[0]==='stolb')).map(c=>c.id).join(',')")
        assert s.js("fmeta('stolb').cover") == 'Столб 2026'
        s.open_font('stolb'); s.open_panes()
        lab = s.js("[...document.querySelectorAll('#params .ctl label span')].map(x=>x.textContent).join('|')")
        for k, l in KEYS.items():
            assert l in lab, (l, lab)
            assert s.js(f"!!document.querySelector('#p_{k}')"), k
            assert s.js(f"(EXPL['{k}']||[''])[0].length") > 20, 'no explanation for ' + k
        expl = s.js("[...document.querySelectorAll('#params .ctl')].map(row=>[(row.querySelector('label span')||{}).textContent||'',(row.querySelector('.xp-t')||{}).textContent||''])")
        for l, t in expl:
            if any(l.startswith(v) for v in KEYS.values()):
                assert t and t.split(' — ')[0].lower().replace('ё', 'е') == l.split(',')[0].strip().lower().replace('ё', 'е'), (l, t)
        rng = {k: s.js(f"[+document.querySelector('#p_{k}').min,+document.querySelector('#p_{k}').max]") for k in KEYS}
        assert rng == RANGES, rng
        hidden = s.js("['capH','hair','sb','aper','slope'].filter(k=>document.querySelector('#p_'+k)).join(',')")
        assert hidden == '', 'foreign sliders visible: ' + hidden
        chips = s.js("[...document.querySelectorAll('#methods .chip')].map(b=>b.textContent.trim()).join('|')")
        for c in CHIPS:
            assert c in chips, (c, chips)
        # every slider changes the outline
        sig = "(()=>{const g=getFinal('Н',S.style),h=getFinal('о',S.style),j=getFinal('Б',S.style),k=getFinal('З',S.style);return JSON.stringify([g.cs,h.cs,j.cs,k.cs,g.adv,h.adv])})()"
        base = s.js(sig)
        for k in KEYS:
            r = RANGES[k]; cur0 = s.js(f"S.styles[S.style].p.{k}")
            v = r[1] if abs(cur0 - r[1]) > abs(cur0 - r[0]) else r[0]
            s.js(f"S.styles[S.style].p.{k}={v};bump();")
            assert s.js(sig) != base, f'slider {k} does not change the outline'
            s.js(f"S.styles[S.style].p.{k}={cur0};bump();")
        assert s.js(sig) == base, 'defaults not restored'
        pg.click('#methods .chip:text-is("Плотный")')
        pg.wait_for_function("S.styles[S.style].p.stem===94&&S.styles[S.style].p.wdth===86", timeout=5000)
        pg.click('#methods .chip:text-is("Афиша")')
        pg.wait_for_function("S.styles[S.style].p.stem===124", timeout=5000)
        pg.click('#methods .chip:text-is("Плакат")')
        pg.wait_for_function("S.styles[S.style].p.stem===88&&S.styles[S.style].p.wdth===100", timeout=5000)
        # export TTF straight from the page
        b64 = s.js("(()=>{const o=buildTTF('regular',{family:FONTS.stolb.family,edits:{},styles:S.styles},{});let s='';const b=o.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s);})()")
        data = base64.b64decode(b64)
        open(os.path.join(LOGS, 'stolb_regular.ttf'), 'wb').write(data)
        f = TTFont(io.BytesIO(data))
        cm = f.getBestCmap()
        for ch in 'ЖЭМДИЙУЫабвжюяAWYGgxy0123':
            assert ord(ch) in cm, ('cmap', ch)
        assert any('Stolb' in str(n) for n in f['name'].names if n.nameID in (1, 4, 16)), 'family name'
        assert 'kern' in {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}, 'kern missing'
        assert 'fvar' not in f, 'static font must not carry fvar'
        # status plaque
        pg.evaluate("setTab('edit')")
        pg.wait_for_function("typeof ST!=='undefined'&&ST.res!=null", timeout=30000)
        pg.wait_for_timeout(4000)
        conf = s.js("(ST.conf||[]).map(p=>p.a+p.b)")
        assert len(conf) <= 3, ('confusable pairs', conf)
        kinds = s.js("ST.items.map(i=>i.kind).join(',')")
        assert 'empty' not in kinds and 'cover' not in kinds, kinds
        assert not s.errs, s.errs[:3]
        s.js("setTab('library')"); pg.wait_for_selector('#libgrid .lcv[data-font=stolb]', timeout=15000); pg.wait_for_timeout(800)
        pg.fill('#view-library .lt-in', 'Дом'); pg.wait_for_function("window.LIBTXT==='Дом'", timeout=5000); pg.wait_for_timeout(900)
        assert s.js("document.querySelector('#libgrid .lcv[data-font=stolb]').dataset.cover") == 'Дом', 'own text on the cover'
        pg.fill('#view-library .lt-in', ''); pg.wait_for_function("window.LIBTXT===''", timeout=5000); pg.wait_for_timeout(300)
        # phone: no horizontal scroll in library and editor
        ctx = s.b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        from common import TOUR_OFF, PAGE
        ctx.add_init_script(TOUR_OFF)
        ph = ctx.new_page(); perr = []
        ph.on('pageerror', lambda e: perr.append(str(e)))
        ph.goto('file://' + PAGE)
        ph.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
        ph.evaluate("setTab('library')"); ph.wait_for_selector('#libgrid .lcard[data-font=stolb]', timeout=15000)
        ph.wait_for_timeout(600)
        w1 = ph.evaluate("document.documentElement.scrollWidth")
        ph.wait_for_timeout(500)
        ph.click('#libgrid .lcard[data-font=stolb]')
        ph.wait_for_function("S.fontId==='stolb'&&!S.live", timeout=30000)
        ph.evaluate("setTab('edit')"); ph.wait_for_function("S.tab==='edit'", timeout=10000); ph.wait_for_timeout(800)
        w2 = ph.evaluate("document.documentElement.scrollWidth")
        assert w1 <= 390 and w2 <= 390, ('overflow at 390', w1, w2)
        assert not perr, perr[:2]
        ctx.close()
        return f'8 sliders, 6 chips, library card+tag+sign collection, TTF {len(data)//1024} KB, kern ok, conf={conf}, 390px {w1}/{w2}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('cond', st_check)]))
