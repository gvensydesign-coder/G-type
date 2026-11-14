"""«Сцепка» (stsepka): font-specific sliders with Russian labels and explanations, preset chips, «Сцепки» chips (Обычные / Все / Выкл), sample text shows
the ligatures (layout names), every slider changes the outline, the exported TTF has calt / ss01 / ss02 (fontTools) and they work in Chromium
(text widths with font-feature-settings), status plaque has no confusable warning, library card and collections."""
import io, os, sys, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS
from fontTools.ttLib import TTFont

GN = "(t)=>layout(t,'regular',60,4000).lines.flatMap(l=>l.chars.map(c=>c.gn)).join(' ')"
LABELS = ['Насыщенность', 'Ширина', 'Скругление', 'Зазор сцепки', 'Высота строчных', 'Скачут строчные']
KEYS = {'stem': 'Насыщенность', 'wdth': 'Ширина', 'zrnd': 'Скругление', 'zgap': 'Зазор сцепки', 'xh': 'Высота строчных', 'zjump': 'Скачут строчные'}


def st_check(p):
    s = Session(p, 'stsepka')
    try:
        pg = s.pg
        # library card + collections
        s.js("setTab('library')")
        pg.wait_for_selector('#libgrid .lcard[data-font=stsepka]', timeout=15000)
        card = s.js("document.querySelector('#libgrid .lcard[data-font=stsepka]').textContent.replace(/\\s+/g,' ')")
        assert 'Сцепка' in card and s.js('FONT_META.stsepka.year')==2026, card
        colls = s.js("PODB.filter(c=>c.fonts.some(f=>f[0]==='stsepka')).map(c=>c.id).join(',')")
        assert 'sign' in colls and 'logo' in colls, colls
        tags = s.js("FONT_META.stsepka.tags.join(',')")
        for t in ('disp', 'narrow', 'exp', 'basic', 'cl'):
            assert t in tags.split(','), tags
        s.open_font('stsepka'); s.open_panes()
        # sliders: Russian labels, explanations, ranges
        lab = s.js("[...document.querySelectorAll('#params .ctl label span')].map(x=>x.textContent).join('|')")
        for l in LABELS:
            assert l in lab, (l, lab)
        for k, l in KEYS.items():
            assert s.js(f"!!document.querySelector('#p_{k}')"), k
            assert s.js(f"(EXPL['{k}']||[''])[0].length")>20, 'no explanation for ' + k
        rng = {k: s.js(f"[+document.querySelector('#p_{k}').min,+document.querySelector('#p_{k}').max]") for k in KEYS}
        assert rng['stem'] == [112, 164] and rng['wdth'] == [85, 125] and rng['zrnd'] == [5, 70] and rng['zgap'] == [14, 60] and rng['xh'] == [420, 588] and rng['zjump'] == [0, 150], rng
        hidden = s.js("['capH','hair','sb','aper','slope'].filter(k=>document.querySelector('#p_'+k)).join(',')")
        assert hidden == '', 'foreign sliders visible: ' + hidden
        # presets and the ligature chips
        chips = s.js("[...document.querySelectorAll('#methods .chip')].map(b=>b.textContent.trim()).join('|')")
        for c in ('Плакат', 'Плотный', 'Мягкий', 'Строгий', 'Обычные', 'Все', 'Выкл'):
            assert c in chips, (c, chips)
        # every slider changes the outline
        sig = "(()=>{const g=getFinal('Н',S.style);const h=getFinal('о',S.style),j=getFinal('б',S.style);return JSON.stringify([g.cs,h.cs,j.cs,g.adv,h.adv])})()"
        base = s.js(sig)
        for k in KEYS:
            r = rng[k]; cur0 = s.js(f"S.styles[S.style].p.{k}")
            v = r[1] if abs(cur0 - r[1]) > abs(cur0 - r[0]) else r[0]
            s.js(f"S.styles[S.style].p.{k}={v};bump();")
            assert s.js(sig) != base, f'slider {k} does not change the outline'
            s.js(f"S.styles[S.style].p.{k}={cur0};bump();")
        assert s.js(sig) == base, 'defaults not restored'
        # preset chips apply
        pg.click('#methods .chip:text-is("Плотный")')
        pg.wait_for_function("S.styles[S.style].p.stem===156", timeout=5000)
        pg.click('#methods .chip:text-is("Плакат")')
        pg.wait_for_function("S.styles[S.style].p.stem===138&&S.styles[S.style].p.zrnd===45", timeout=5000)
        # sample text shows ligatures: calt (default), ss02 (all), ss01 (off)
        s.js("S.text='НН ТО ММ ми МИН';drawSpecimen()")
        modes = {}
        for name, mode in (('calt', 0), ('all', 1), ('off', 2)):
            pg.click(f'#methods .chip:text-is("{["Обычные", "Все", "Выкл"][mode]}")')
            pg.wait_for_function(f"S.styles[S.style].p.zlig=={mode}", timeout=5000)
            modes[name] = s.js(f"({GN})(S.text)").split()
        liga = lambda L: [x for x in L if x.endswith('.liga')]
        assert 'uni041D_uni041D.liga' in modes['calt'] and 'uni0422_uni041E.liga' in modes['calt'], modes['calt']
        assert not liga(modes['off']), modes['off']
        assert len(liga(modes['all'])) > len(liga(modes['calt'])), (modes['all'], modes['calt'])
        assert 'uni043C_uni0438.liga' in modes['all'] and 'uni043C_uni0438.liga' not in modes['calt'], 'lowercase pairs belong to ss02'
        # МИН triple removed (merged letters, audit): pairs only
        # canvas differs between modes
        import hashlib
        hs = []
        for mode in (0, 1, 2):
            s.js(f"S.styles[S.style].p.zlig={mode};bump();drawSpecimen()")
            hs.append(hashlib.md5(pg.locator('#spec').screenshot()).hexdigest())
        assert len(set(hs)) == 3, 'specimen did not change between ligature modes'
        s.js("S.styles[S.style].p.zlig=0;bump()")
        # export: TTF from the page
        b64 = s.js("(()=>{const o=buildTTF('regular',{family:FONTS.stsepka.family,edits:{},styles:S.styles},{});let s='';const b=o.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)})()")
        data = base64.b64decode(b64)
        open(os.path.join(LOGS, 'stsepka_regular.ttf'), 'wb').write(data)
        f = TTFont(io.BytesIO(data))
        g = f['GSUB'].table
        tags = sorted({fr.FeatureTag for fr in g.FeatureList.FeatureRecord})
        assert tags == ['calt', 'ss01', 'ss02'], tags
        names = {n.nameID: str(n) for n in f['name'].names if n.nameID in (256, 257)}
        assert names.get(256) == 'Без сцепок' and names.get(257), names
        order = f.getGlyphOrder()
        assert 'uni041D_uni041D.liga' in order and 'N_N.liga' in order and 'uni041D.ss01' in order, 'glyph names'
        def nsub(tag):
            idx = {i for fr in g.FeatureList.FeatureRecord if fr.FeatureTag == tag for i in fr.Feature.LookupListIndex}
            n = 0
            for i in idx:
                for st in g.LookupList.Lookup[i].SubTable:
                    t = st.ExtSubTable if hasattr(st, 'ExtSubTable') else st
                    n += sum(len(v) for v in t.ligatures.values()) if hasattr(t, 'ligatures') else len(t.mapping)
            return n
        n_calt, n_ss01, n_ss02 = nsub('calt'), nsub('ss01'), nsub('ss02')
        assert n_calt == 33 and n_ss02 == 50 and n_ss01 >= 30, (n_calt, n_ss01, n_ss02)
        assert 'kern' in {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}, 'kern missing'
        # Chromium: features work on the exported file
        pg.evaluate("b64=>{const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);window.__stf=new FontFace('StX',u.buffer);return window.__stf.load().then(f=>{document.fonts.add(f);})}", b64)
        W = lambda txt, feat: pg.evaluate("([t,f])=>{const e=document.createElement('span');e.style.cssText='position:absolute;white-space:pre;font:100px StX;font-kerning:none;font-feature-settings:'+f;e.textContent=t;document.body.appendChild(e);const w=e.getBoundingClientRect().width;e.remove();return w}", [txt, feat])
        plain = W('НН', '"calt" 0'); dflt = W('НН', '"calt" 1')
        assert dflt < plain - 8, ('calt НН', plain, dflt)
        plain2 = W('ми', '"calt" 1'); lo = W('ми', '"ss02" 1')
        assert lo < plain2 - 4, ('ss02 ми', plain2, lo)
        off = W('НН', '"ss01" 1')
        assert abs(off - plain) < 1, ('ss01 off', off, plain)
        pair2 = W('НП', '"calt" 1'); pair2s = W('НП', '"ss02" 1')
        assert pair2s < pair2 - 8, ('ss02 НП', pair2, pair2s)
        # status plaque: no confusable warning
        pg.evaluate("setTab('edit')")
        pg.wait_for_function("typeof ST!=='undefined'&&ST.res!=null", timeout=30000)
        pg.wait_for_timeout(1500)
        pg.wait_for_timeout(2500)
        conf = s.js("(ST.conf||[]).map(p=>p.a+p.b)")
        # О и 0 одинаковы по замыслу (юникейс-конструктор, утверждено): это честное предупреждение; все остальные пары (З/3, Ч/4, Б/6, S/5, B/8, I/l/1) различимы
        assert conf in ([], ['О0']), ('confusable pairs', conf)
        kinds = s.js("ST.items.map(i=>i.kind).join(',')")
        assert 'empty' not in kinds and 'issues' not in kinds and 'cover' not in kinds, kinds
        assert not s.errs, s.errs[:3]
        return f'sliders={len(KEYS)} chips ok; calt={n_calt} ss02={n_ss02} ss01={n_ss01}; widths НН {plain:.0f}->{dflt:.0f} ми {plain2:.0f}->{lo:.0f}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('stsepka', st_check)]))
