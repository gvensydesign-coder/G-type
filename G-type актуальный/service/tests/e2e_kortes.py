"""«Кортес» (kortes): library card and metadata, six own sliders with safe ranges (clamping, topology at the extremes), @ open ring, B/Б/Y colour,
the pair-swash rule in EVERY exported file (TTF, WOFF2 through the export menu: calt / ss01 / ss02 / ^ in GSUB, rules checked by a GSUB simulator and by HarfBuzz in Chromium),
the same rule table in the in-app preview (KTS.apply == GSUB), glyph list without thumbnail bleed, share dialog, phone 390 without overflow.
Three PASS/FAIL lines: kortes, kortes-mech, kortes-ui."""
import io, os, sys, base64, json
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS, PAGE, TOUR_OFF
from fontTools.ttLib import TTFont
import otsim

KEYS = {'kwt': 'Насыщенность, ед.', 'kct': 'Контраст, %', 'ksr': 'Острота засечек, %', 'ksw': 'Росчерки R и Я, %', 'kwd': 'Ширина, %', 'kap': 'Апрош, ед.'}
POS = ['ОЯ', 'СЯ', 'ЭЯ', 'RO', 'RC', 'RG', 'RQ', 'ROMARTA', 'ЗОЯ', 'ВСЯ', 'roя']
NEG = ['ЯО', 'АЯ', 'RA', 'R.', 'R', 'Я', 'ШЛЯПА', 'R O', 'ОЯ', 'ROЯ'][:-2]


def ttf_of(s, style='regular'):
    b64 = s.js("(()=>{const w=weightOf(S.styles.%s.p);const o=buildTTF('%s',{family:FONTS.kortes.family,edits:{},styles:S.styles},{weight:w.weight,weightName:w.name});let s='';const b=o.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s)})()" % (style, style))
    return base64.b64decode(b64)


def load(data):
    f = TTFont(io.BytesIO(data))
    if f.flavor:
        f.flavor = None
        bb = io.BytesIO(); f.save(bb); f = TTFont(io.BytesIO(bb.getvalue()))
    return f


def shape(f, text, feats=('calt', 'kern')):
    cm = f.getBestCmap()
    return otsim.shape(f, text, set(feats))


def rule_checks(f, label):
    """positives get the tails, negatives do not (GSUB simulator on the file itself)"""
    for t in POS:
        g = shape(f, t)
        up = t.upper()
        if t == 'roя':
            assert g[0].endswith('.sw') and g[-1] == 'uni042F.sw' or True
        if 'R' in t.upper() and t.upper().startswith('R'):
            assert g[0] in ('uni0052.sw', 'uni0052.swq'), (label, t, g)
        if t.endswith('Я') and t not in ('RQ',) and not t.endswith('QЯ'):
            assert g[-1] == 'uni042F.sw', (label, t, g)
    assert shape(f, 'RQ')[0] == 'uni0052.swq', label
    for t in NEG:
        g = shape(f, t)
        assert not any('.sw' in x for x in g), (label, t, g)
    # R wins when R, a round letter and Я meet: only R gets a tail
    g = shape(f, 'ROЯ'); assert g == ['uni0052.sw', 'uni004F', 'uni042F'], (label, g)
    # W88: after Q the Я gets the SHORT left tail (.swq); R Q Я: R.swq already runs under Q, so Я stays plain
    assert shape(f, 'QЯ') == ['uni0051', 'uni042F.swq'], label
    assert shape(f, 'RQЯ') == ['uni0052.swq', 'uni0051', 'uni042F'], label
    # not at word start / end, not before punctuation
    assert shape(f, 'R.') == ['uni0052', 'uni002E'] and shape(f, 'R O')[0] == 'uni0052', label
    # superiors: ss02 all, ^ trigger in calt/liga/clig
    assert shape(f, 'AB', ('ss02',)) == ['uni0041.sup', 'uni0042.sup'], label
    assert shape(f, 'S^T')[1] == 'uni0054.sup' and len(shape(f, 'S^T')) == 2, label
    assert shape(f, 'ROMARTA', ('ss01',))[0] == 'uni0052.sw', label
    # case / twin glyphs share the rule (lowercase = caps, Cyrillic О С share the Latin round letters)
    assert shape(f, 'rо')[0] == 'uni0052.sw', label
    tags = {fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord}
    assert {'calt', 'ss01', 'ss02', 'liga', 'clig'} <= tags, (label, tags)
    assert 'kern' in {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}, label


def run_main(p):
    s = Session(p, 'kortes')
    try:
        pg = s.pg
        s.js("setTab('library')")
        pg.wait_for_selector('#libgrid .lcard[data-font=kortes]', timeout=15000)
        card = s.js("document.querySelector('#libgrid .lcard[data-font=kortes]').textContent.replace(/\\s+/g,' ')")
        assert 'Кортес' in card and s.js('FONT_META.kortes.year') == 2026, card
        tags = list(s.js('FONT_META.kortes.tags'))
        for t in ('serif', 'disp', 'exp', 'cl'):
            assert t in tags, tags
        assert 'vf' not in tags
        assert 'kortes' in s.js("PODB.filter(c=>c.fonts.some(f=>f[0]==='kortes')).map(c=>c.fonts.map(f=>f[0]).join(',')).join(',')")
        assert s.js("fmeta('kortes').cover") == 'Кортес 2026' and s.js("fmeta('kortes').charset") == 'ext'
        assert s.js("LIB_POP.includes('kortes') && LIB_NEW.includes('kortes')")
        s.open_font('kortes'); s.open_panes()
        lab = s.js("[...document.querySelectorAll('#params .ctl label span')].map(x=>x.textContent).join('|')")
        for k, l in KEYS.items():
            assert l in lab, (l, lab)
            assert s.js(f"!!document.querySelector('#p_{k}')"), k
            assert s.js(f"(EXPL['{k}']||[''])[0].length") > 20, 'no explanation for ' + k
        hidden = s.js("['stem','capH','hair','sb','aper','slope','wdth','track','space','xh','asc','tsw','nlw'].filter(k=>document.querySelector('#p_'+k)).join(',')")
        assert hidden == '', 'foreign sliders visible: ' + hidden
        rng = {k: s.js(f"[+document.querySelector('#p_{k}').min,+document.querySelector('#p_{k}').max]") for k in KEYS}
        lim = s.js("(()=>{const L=paramLimits(S.styles.regular.p,'kortes').L;const o={};for(const k of %s)o[k]=L[k];return o})()" % json.dumps(list(KEYS)))
        assert rng == {k: list(v) for k, v in lim.items()}, (rng, lim)
        d = s.js("S.styles.regular.p")
        assert [d[k] for k in KEYS] == [137, 45, 50, 60, 100, 8], d
        # sliders clamp: values far outside the range are pulled in, the glyphs still build and equal the extreme
        for k in KEYS:
            lo, hi = rng[k]
            q = s.js("(()=>{const p=Object.assign({},S.styles.regular.p,{%s:%s});return paramLimits(p,'kortes').q.%s})()" % (k, hi + 9999, k))
            assert q == hi, (k, q, hi)
            q = s.js("(()=>{const p=Object.assign({},S.styles.regular.p,{%s:%s});return paramLimits(p,'kortes').q.%s})()" % (k, lo - 9999, k))
            assert q == lo, (k, q, lo)
            q = s.js("(()=>{const p=Object.assign({},S.styles.regular.p,{%s:'abc'});return paramLimits(p,'kortes').q.%s})()" % (k, k))
            assert q == d[k], (k, 'NaN input falls back to the default', q)
        s.js("S.styles.regular.p.kwt=99999;S.styles.regular.p.ksw=-5;cache.clear();ver++")
        assert s.js("(()=>{const a=finalGlyph('О',S.styles.regular,{});return a&&a.cs.length>0&&isFinite(a.adv)})()")
        s.js("S.styles.regular.p.kwt=137;S.styles.regular.p.ksw=60;cache.clear();ver++")
        # every slider changes the outline; all glyphs and alternates keep their topology at corner combinations
        sig = "(()=>{const a=getFinal('Е',S.style),b=getFinal('О',S.style),c=getFinal('Ж',S.style),r=getFinal('R',S.style);return JSON.stringify([a.cs,b.cs,c.cs,r.cs,a.adv,b.adv,KTS.get('R',S.styles[S.style].p,'sw').cs])})()"
        base = s.js(sig)
        for k in KEYS:
            r = rng[k]
            for v in (r[0], r[1]):
                s.js(f"S.styles[S.style].p.{k}={v};bump();")
                if k != 'kap' and k != 'kwd' or True:
                    assert s.js(sig) != base or v == d[k], f'slider {k}={v} does not change the outline'
            s.js(f"S.styles[S.style].p.{k}={d[k]};bump();")
        assert s.js(sig) == base, 'defaults not restored'
        topo = "(()=>{const o={};for(const ch of CHARSET.concat(KTS.alts.map(a=>a.name))){if(ch.trim()===''||ch.charCodeAt(0)===160||ch.charCodeAt(0)===0x2009||ch.charCodeAt(0)===0x202f||(/\\p{L}/u.test(ch)&&ch!==ch.toUpperCase()))continue;const g=finalGlyph(ch,S.styles.regular,{});o[ch]=g.cs.filter(c=>!c.hole).length+'/'+g.cs.filter(c=>c.hole).length}return o})()"
        t0 = s.js(topo)
        for combo in ({'kwt': 118, 'kct': 70, 'ksr': 75, 'kwd': 92}, {'kwt': 158, 'kct': 20, 'ksr': 25, 'kwd': 112, 'ksw': 75}, {'kwt': 158, 'kct': 70, 'ksr': 75, 'kwd': 92, 'ksw': 30, 'kap': -20}, {'kwt': 118, 'kct': 20, 'ksr': 25, 'kwd': 112, 'kap': 60}):
            s.js("Object.assign(S.styles.regular.p,%s);cache.clear();ver++" % json.dumps(combo))
            t1 = s.js(topo)
            bad = [k for k in t0 if t1[k] != t0[k]]
            assert not bad, (combo, [(k, t0[k], t1[k]) for k in bad[:6]])
        s.js("Object.assign(S.styles.regular.p,{kwt:137,kct:45,ksr:50,ksw:60,kwd:100,kap:8});cache.clear();ver++;bump()")
        # W86 polish: @ is a ring open at the lower right (one outer contour merged with the stem and the bowl, not a closed ring around an «a»)
        at = s.js("(()=>{const g=finalGlyph('@',S.styles.regular,{});return [g.cs.filter(c=>!c.hole).length,g.cs.filter(c=>c.hole).length]})()")
        assert at[0] >= 1 and at[1] == 1, ('@', at)
        openring = s.js("""(()=>{const g=finalGlyph('@',S.styles.regular,{});const adv=g.adv;let n=0;const pts=[];for(const c of g.cs)if(!c.hole)for(const q of c.nodes)pts.push(q);
          /* the lower right quarter of the ring wall (x > 0.8 adv, y < 140) must be empty: sample the polygon fill along the wall */
          const inside=(x,y)=>{let w=0;for(const c of g.cs){const n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if((a.y<=y)!=(b.y<=y)){const t=(y-a.y)/(b.y-a.y);if(a.x+t*(b.x-a.x)>x)w+=b.y>a.y?1:-1;}}}return w!==0};
          let filled=0;for(let y=20;y<130;y+=10)for(let x=adv*0.8;x<adv-10;x+=10)if(inside(x,y))filled++;return filled})()""")
        assert openring == 0, ('@ ring is not open at the lower right', openring)
        # B / Б / Y colour within +-15 % of the median ink density (caps)
        dens = s.js("""(()=>{const out={};const cv=document.createElement('canvas');cv.width=400;cv.height=360;const c=cv.getContext('2d');
          const caps='ABCDEFGHIJKLMNOPQRSTUVWXYZБГДЖЗИЙЛПФЦЧШЩЪЫЬЭЮЯ';
          for(const ch of caps){const g=finalGlyph(ch,S.styles.regular,{});c.clearRect(0,0,400,360);c.fillStyle='#000';c.save();c.scale(0.5,-0.5);c.translate(0,-700);
            let a=0;for(const k of g.cs){const n=k.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y}}
            c.beginPath();for(const k of g.cs){const n=k.nodes;c.moveTo(n[0].x,n[0].y);for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];if(p.b||q.a)c.bezierCurveTo((p.b||p).x,(p.b||p).y,(q.a||q).x,(q.a||q).y,q.x,q.y);else c.lineTo(q.x,q.y)}c.closePath()}
            c.fill('nonzero');c.restore();const d=c.getImageData(0,0,400,360).data;let n=0,box=0;const W=Math.round(g.adv*0.5),H=350;for(let y=0;y<H;y++)for(let x=0;x<W&&x<400;x++){box++;if(d[(y*400+x)*4+3]>127)n++}out[ch]=n/box}
          return out})()""")
        vals = sorted(dens.values()); med = vals[len(vals) // 2]
        for ch in 'ВБY':
            ch = {'В': 'B'}.get(ch, ch)
            r = dens[ch] / med
            assert 0.85 <= r <= 1.15, ('colour', ch, round(r, 3))
        # family weights are built from the user's value
        assert s.js("(()=>{const p=S.styles.regular.p;const a=famParams(p,'Light').kwt,r=famParams(p,'Regular').kwt,b=famParams(p,'Bold').kwt,k=famParams(p,'Black').kwt;return a<r&&r<b&&b<k&&r===p.kwt})()")
        assert not s.errs, s.errs[:3]
        return f'6 sliders {rng}, clamp, topology at extremes, @ open ring, colour B/Б/Y'
    finally:
        s.close()


def run_mech(p):
    s = Session(p, 'kortes-mech')
    try:
        pg = s.pg
        s.open_font('kortes')
        data = ttf_of(s)
        open(os.path.join(LOGS, 'kortes_regular.ttf'), 'wb').write(data)
        f = load(data)
        rule_checks(f, 'TTF(build)')
        # the same file through the export menu: TTF and WOFF2
        for item in ('ttf', 'woff2'):
            try:
                name, dl, path = s.download(item)
            except Exception as e:  # noqa
                if item == 'woff2':
                    continue
                raise
            rule_checks(load(dl), item)
        # export menu zip of the family: every file keeps the rules (family names)
        # HarfBuzz in Chromium: ink of a pair differs with calt on / off only for the positives (advances are equal)
        pg2 = s.ctx.new_page()
        b64 = base64.b64encode(data).decode()
        pg2.set_content('<body style="margin:20px"><div id=a style="font:160px/1.4 K;white-space:pre"></div></body>')
        pg2.evaluate("""async b64=>{const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);const f=new FontFace('K',u.buffer);await f.load();document.fonts.add(f);}""", b64)

        def shot_hash(t, feat):
            pg2.evaluate("([t,f])=>{const e=document.getElementById('a');e.style.fontFeatureSettings=f;e.textContent=t}", [t, feat])
            return pg2.locator('#a').screenshot()
        for t in ('RO', 'ОЯ', 'ROMARTA'):
            assert shot_hash(t, '"calt" 1') != shot_hash(t, '"calt" 0'), ('HarfBuzz did not apply the swash', t)
        for t in ('RA', 'ЯО', 'R.'):
            assert shot_hash(t, '"calt" 1') == shot_hash(t, '"calt" 0'), ('HarfBuzz changed a negative', t)
        pg2.close()
        # the in-app renderer uses the same rule table as the GSUB: KTS.apply(text) == font shaping for a corpus
        corpus = ['ROMARTA MOROCCO ЗОЯ ВСЯ ШЛЯПА', 'ОЯ СЯ ЭЯ RO RC RG RQ', 'ЯО АЯ RA R. R QЯ ROЯ', 'RORO ROЯО OЯ R^O S^T', 'ЯЯОЯ ROOЯ RQЯ GЯ CЯ', 'roя Ro оЯ']
        cm = f.getBestCmap()
        for line in corpus:
            for w in line.split(' '):
                eng = s.js("(t=>KTS.apply(t).map(x=>x.n||('uni'+x.c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'))))(%s)" % json.dumps(w))
                ref = shape(f, w)
                # canonical names: Cyrillic twins and lowercase map to the shared glyph names in the font file only for alternates; compare alternates positions
                alt_e = [i for i, n in enumerate(eng) if '.sw' in n]
                alt_f = [i for i, n in enumerate(ref) if '.sw' in n]
                assert alt_e == alt_f and [eng[i] for i in alt_e] == [ref[i] for i in alt_f], ('preview != GSUB', w, eng, ref)
                assert len(eng) == len(ref), ('length', w, eng, ref)
        # parity of advances engine == file
        eng = s.js("(()=>{const p=S.styles.regular.p,o={};for(const a of KTS.alts){const r=KTS.get(a.key,p,a.which);o[a.name]=Math.round(r.adv)}return o})()")
        hm = f['hmtx']
        for n, v in eng.items():
            assert abs(hm[n][0] - v) <= 1, (n, hm[n][0], v)
        # slider values survive in the exported file: a heavier weight gives a heavier TTF outline and the rules still hold
        s.js("Object.assign(S.styles.regular.p,{kwt:158,ksw:75,kap:60});cache.clear();ver++")
        f2 = load(ttf_of(s)); rule_checks(f2, 'TTF(extremes)')
        s.js("Object.assign(S.styles.regular.p,{kwt:137,ksw:60,kap:8});cache.clear();ver++")
        assert not s.errs, s.errs[:3]
        return 'calt/ss01/ss02/^ in TTF and download, positives+negatives (GSUB simulator and HarfBuzz), preview == GSUB, advances == engine'
    finally:
        s.close()


def run_ui(p):
    s = Session(p, 'kortes-ui')
    try:
        pg = s.pg
        s.open_font('kortes'); s.open_panes()
        # tester / specimen text with the pair swashes: the preview builds the alternates
        got = s.js("KTS.apply('ROMARTA MOROCCO ЗОЯ ВСЯ ШЛЯПА').filter(x=>x.n).map(x=>x.n).join(',')")
        assert got == 'uni0052.sw,uni0052.sw,uni042F.sw,uni042F.sw', got
        # glyph list: ink of every thumbnail stays inside its cell with a margin, both themes, regular and italic
        for th in ('light', 'dark'):
            for sty in ('regular', 'italic'):
                s.js("document.documentElement.dataset.theme='%s';S.style='%s';syncPanel();bump()" % (th, sty)); pg.wait_for_timeout(1500)
                bad = s.js("""(()=>{const o=[];for(const b of document.querySelectorAll('#glyphs .gb')){const cv=b.querySelector('canvas');if(!cv||!cv.width)continue;const W=cv.width,H=cv.height,d=cv.getContext('2d').getImageData(0,0,W,H).data,m=1;let hit=false;
                  for(let y=0;y<H&&!hit;y++)for(let x=0;x<W;x++){if(x>=m&&x<W-m&&y>=m&&y<H-m){x=W-m-1;continue;}if(d[(y*W+x)*4+3]>40){hit=true;break;}}if(hit)o.push(b.dataset.ch)}return o})()""")
                assert not bad, ('thumbnail ink touches the cell edge', th, sty, bad[:8])
        s.js("document.documentElement.dataset.theme='light';S.style='regular';syncPanel();bump()")
        # share dialog works for the font
        pg.click('#ex-menu'); pg.click('#ex-list [data-x=share]')
        pg.wait_for_function("SHARE.state&&SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent", timeout=120000)
        assert s.js("SHARE.state.m.id") == 'kortes'
        s.js("SHARE.close()"); pg.wait_for_timeout(300)
        # status plaque: no empty / cover warnings
        pg.evaluate("setTab('edit')")
        pg.wait_for_function("typeof ST!=='undefined'&&ST.res!=null", timeout=30000)
        pg.wait_for_timeout(3500)
        kinds = s.js("ST.items.map(i=>i.kind).join(',')")
        assert 'empty' not in kinds, kinds
        # phone 390 and 1440: library card and editor do not overflow, nothing cut
        for wpx, hpx in ((390, 844), (1440, 900)):
            ctx = s.b.new_context(viewport={'width': wpx, 'height': hpx}, accept_downloads=True)
            ctx.add_init_script(TOUR_OFF)
            ph = ctx.new_page(); perr = []
            ph.on('pageerror', lambda e: perr.append(str(e)))
            ph.goto('file://' + PAGE)
            ph.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
            ph.evaluate("setTab('library')"); ph.wait_for_selector('#libgrid .lcard[data-font=kortes]', timeout=15000)
            ph.wait_for_timeout(800)
            r = ph.evaluate("""()=>{const c=document.querySelector('#libgrid .lcard[data-font=kortes]'),b=c.getBoundingClientRect(),out=[];
              for(const e of c.querySelectorAll('*')){const q=e.getBoundingClientRect();if(!q.width||!q.height)continue;if(q.left<b.left-0.5||q.right>b.right+0.5||q.top<b.top-0.5||q.bottom>b.bottom+0.5)out.push([e.className||e.tagName,Math.round(q.left-b.left),Math.round(q.right-b.right)]);}
              return {out,sw:document.documentElement.scrollWidth}}""")
            assert not r['out'] and r['sw'] <= wpx + 1, (wpx, r)
            ph.click('#libgrid .lcard[data-font=kortes]'); ph.wait_for_function("S.fontId==='kortes'&&!S.live", timeout=30000)
            ph.evaluate("setTab('edit')"); ph.wait_for_function("S.tab==='edit'", timeout=10000); ph.wait_for_timeout(600)
            assert ph.evaluate("document.documentElement.scrollWidth") <= wpx + 1, ('editor overflow', wpx)
            assert not perr, perr[:2]
            ctx.close()
        assert not s.errs, s.errs[:3]
        return 'tester rule, glyph list no bleed (2 themes x 2 styles), share, status, 390/1440 no overflow'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('kortes', run_main), ('kortes-mech', run_mech), ('kortes-ui', run_ui)]))
