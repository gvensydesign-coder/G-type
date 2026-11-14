"""«Тяга» (tyaga): library card and metadata, five own sliders (+ «Межстрочный» only in block mode) with safe ranges, the stretch mechanism in every exported file
(TTF, WOFF, family: «~» after a letter -> .sN via calt/liga/clig, zero-width «~», kern incl. alternates) verified through HarfBuzz in Chromium,
parity of the native engine with the prototype (XOR at 200 px), tool «Блок» (justify modes, drag, keyboard, PNG/SVG, text with «~», persistence), phone 390 without overflow.
Three PASS/FAIL lines: tyaga, tyaga-mech, tyaga-block."""
import io, os, sys, base64, zipfile, json
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS, PAGE, TOUR_OFF, CHROME
from fontTools.ttLib import TTFont
from e2e_port import reload_keep

FIX = os.path.join(os.path.dirname(__file__), 'fixtures', 'tyaga_proto.js')
KEYS = {'tsw': 'Толщина, %', 'trd': 'Скругление, %', 'tbs': 'Базовая ширина, %', 'tap': 'Апрош, %', 'tst': 'Растяжка, ×'}
TILDE_FREE = 'ЕСЫОТЗБГ'          # free letters (stretch up to x6)
DIAG = 'АИЛХ'                    # diagonal letters (up to x2, then lock)
SYMS = '@#*©₽°•·\\|'               # symbols added in v83 (₽ # stretch up to x2, the rest do not stretch)


def ttf_b64(s, style='regular'):
    return s.js("(()=>{const o=buildTTF('%s',{family:FONTS.tyaga.family,edits:{},styles:S.styles},{});let s='';const b=o.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s);})()" % style)


def shaping_page(s, ttf_bytes, name='T'):
    """Fresh page with the font as @font-face (HarfBuzz in Chromium shapes it); returns (page, width(text, features))"""
    pg = s.ctx.new_page()
    b64 = base64.b64encode(ttf_bytes).decode()
    pg.set_content('<style>@font-face{font-family:%s;src:url(data:font/ttf;base64,%s)}</style><span id=a style="font:1000px %s;white-space:pre;position:absolute"></span>' % (name, b64, name))
    pg.evaluate("document.fonts.load('1000px %s')" % name)
    pg.wait_for_timeout(300)

    def width(txt, feat='normal'):
        return pg.evaluate("([t,f])=>{const e=document.getElementById('a');e.style.fontFeatureSettings=f;e.textContent=t;return e.getBoundingClientRect().width}", [txt, feat])
    return pg, width


def check_font_file(data, label):
    """GSUB features, zero-width tilde, alternates, kern in one file; returns the font"""
    f = TTFont(io.BytesIO(data))
    if f.flavor:
        f.flavor = None
        bb = io.BytesIO(); f.save(bb); f = TTFont(io.BytesIO(bb.getvalue()))
    cm = f.getBestCmap()
    assert 0x7E in cm, (label, 'no tilde')
    assert f['hmtx'][cm[0x7E]][0] == 0, (label, 'tilde must be zero width')
    tags = {fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord}
    assert {'calt', 'liga', 'clig'} <= tags, (label, tags)
    assert 'kern' in {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}, (label, 'kern')
    order = f.getGlyphOrder()
    alts = [g for g in order if '.s' in g]
    assert len(alts) >= 100, (label, len(alts))
    # ligature rules for upper and lower case, Latin and Cyrillic: uni0043.s5 (С c C с) exists; lowercase maps to the same alternate
    assert 'uni0043.s5' in order and 'uni0041.s2' in order and 'uni0041.s3' not in order, label
    return f


def run_main(p):
    s = Session(p, 'tyaga')
    try:
        pg = s.pg
        s.js("setTab('library')")
        pg.wait_for_selector('#libgrid .lcard[data-font=tyaga]', timeout=15000)
        card = s.js("document.querySelector('#libgrid .lcard[data-font=tyaga]').textContent.replace(/\\s+/g,' ')")
        assert 'Тяга' in card and s.js('FONT_META.tyaga.year') == 2026, card
        tags = list(s.js('FONT_META.tyaga.tags'))
        for t in ('geo', 'nocon', 'disp', 'exp', 'cl'):
            assert t in tags, tags
        assert 'vf' not in tags
        assert 'tyaga' in s.js("PODB.filter(c=>c.fonts.some(f=>f[0]==='tyaga')).map(c=>c.fonts.map(f=>f[0]).join(',')).join(',')")
        assert s.js("fmeta('tyaga').cover") == 'Тяга 2026' and s.js("fmeta('tyaga').charset") == 'ext'
        assert s.js("LIB_POP.includes('tyaga') && LIB_NEW.includes('tyaga')")
        s.open_font('tyaga'); s.open_panes()
        lab = s.js("[...document.querySelectorAll('#params .ctl label span')].map(x=>x.textContent).join('|')")
        for k, l in KEYS.items():
            assert l in lab, (l, lab)
            assert s.js(f"!!document.querySelector('#p_{k}')"), k
            assert s.js(f"(EXPL['{k}']||[''])[0].length") > 20, 'no explanation for ' + k
        assert not s.js("!!document.querySelector('#p_tlg')"), '«Межстрочный» must be hidden outside the block'
        hidden = s.js("['stem','capH','hair','sb','aper','slope','wdth','track','space','xh','asc'].filter(k=>document.querySelector('#p_'+k)).join(',')")
        assert hidden == '', 'foreign sliders visible: ' + hidden
        rng = {k: s.js(f"[+document.querySelector('#p_{k}').min,+document.querySelector('#p_{k}').max]") for k in KEYS}
        lim = s.js("(()=>{const L=paramLimits(S.styles.regular.p,'tyaga').L;const o={};for(const k of ['tsw','trd','tbs','tap','tst'])o[k]=L[k];return o})()")
        assert rng == {k: list(v) for k, v in lim.items()}, (rng, lim)
        assert s.js("TYS.LIM.tsw[0]") == 12 and s.js("TYS.LIM.tst[1]") == 6
        d = s.js("S.styles.regular.p")
        assert (d['tsw'], d['trd'], d['tbs'], d['tap'], d['tst']) == (18.75, 100, 100, 13.5, 1), d
        chips = s.js("[...document.querySelectorAll('#methods .chip')].map(b=>b.textContent.trim()).join('|')")
        for c in ('Образец', 'Острая', 'Лёгкая', 'Плотная', 'Жирная', 'Нет', '×2'):
            assert c in chips, (c, chips)
        # every slider changes the outline (and nothing else breaks at the safe extremes)
        sig = "(()=>{const a=getFinal('Е',S.style),b=getFinal('О',S.style),c=getFinal('Ж',S.style),d=getFinal('в',S.style);return JSON.stringify([a.cs,b.cs,c.cs,d.cs,a.adv,b.adv])})()"
        base = s.js(sig)
        for k in KEYS:
            r = rng[k]; cur0 = s.js(f"S.styles[S.style].p.{k}")
            for v in (r[0], r[1]):
                s.js(f"S.styles[S.style].p.{k}={v};bump();")
                assert s.js(sig) != base or v == cur0, f'slider {k}={v} does not change the outline'
                assert s.js("(()=>{for(const ch of CHARSET){const g=getFinal(ch,S.style);if(!g)return ch;if(ch!==' '&&ch!=='~'&&ch.charCodeAt(0)>32&&ch.charCodeAt(0)!==160&&ch!==' '&&ch!==' '&&!g.cs.length)return 'empty '+ch;}return ''})()") == '', f'{k}={v} breaks a glyph'
            s.js(f"S.styles[S.style].p.{k}={cur0};bump();")
        assert s.js(sig) == base, 'defaults not restored'
        # the safe extremes of ALL sliders at once keep the topology of the default (outer/hole counts of every glyph and its alternates)
        topo = "(()=>{const o={};for(const ch of CHARSET.concat(TYS.alts.map(a=>a.name))){if(ch==='~'||ch.trim()===''||ch.charCodeAt(0)===160||ch===' '||ch===' ')continue;const g=finalGlyph(ch,S.styles.regular,{});o[ch]=g.cs.filter(c=>!c.hole).length+'/'+g.cs.filter(c=>c.hole).length;}return o})()"
        t0 = s.js(topo)
        for combo in ({'tsw': 12, 'trd': 100, 'tbs': 80}, {'tsw': 23, 'trd': 0, 'tbs': 130, 'tap': 4}, {'tsw': 23, 'trd': 100, 'tbs': 80, 'tap': 30, 'tst': 6}, {'tsw': 12, 'trd': 0, 'tbs': 130}):
            s.js("Object.assign(S.styles.regular.p,%s);cache.clear();ver++" % json.dumps(combo))
            t1 = s.js(topo)
            bad = [k for k in t0 if t1[k] != t0[k] and True]
            assert not bad, (combo, bad[:8], [(k, t0[k], t1[k]) for k in bad[:4]])
        # W84 T4: % rings never merge with the slash (3 outer / 2 holes) at the worst corner and at the whole grid of stroke x round; 6 and 9 keep their counter at round 0
        for tw in (12, 18.75, 23):
            for rd in (0, 50, 100):
                s.js("Object.assign(S.styles.regular.p,%s);cache.clear();ver++" % json.dumps({'tsw': tw, 'trd': rd, 'tbs': 80, 'tap': 4}))
                tp = s.js(topo)
                assert tp['%'] == '3/2', ('% topology', tw, rd, tp['%'])
                assert tp['6'] == t0['6'] and tp['9'] == t0['9'], ('6/9', tw, rd, tp['6'], tp['9'])
        s.js("Object.assign(S.styles.regular.p,{tsw:18.75,trd:100,tbs:100,tap:13.5,tst:1});cache.clear();ver++;bump();")
        # thickness persists across reload; the «Растяжка» steps change the glyph itself
        pg.evaluate("(()=>{const r=document.querySelector('#p_tsw');r.value=21;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));})()")
        pg.wait_for_function("S.styles[S.style].p.tsw===21", timeout=5000)
        pg.click('#methods .chip:text-is("×2")'); pg.wait_for_timeout(200)
        assert s.js("S.styles[S.style].p.tst") == 2 and s.js("S.styles[S.style].p.tsw") == 21
        wE = s.js("getFinal('Е',S.style).adv"); wI = s.js("getFinal('I',S.style).adv"); wA = s.js("getFinal('А',S.style).adv")
        pg.click('#methods .chip:text-is("Нет")'); pg.wait_for_timeout(200)
        assert wE > 1.6 * s.js("getFinal('Е',S.style).adv") and abs(wI - s.js("getFinal('I',S.style).adv")) < 1, 'stretch default: free letters x2, І stays'
        assert wA > 1.6 * s.js("getFinal('А',S.style).adv") * 0.99 - 1
        pg.wait_for_function("(()=>{try{return JSON.parse(localStorage.getItem(KEY+'-f-tyaga')).styles.regular.p.tsw===21}catch(e){return false}})()", timeout=15000); reload_keep(s, pg)
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        s.open_font('tyaga')
        assert s.js("S.styles.regular.p.tsw") == 21, ('thickness lost on reload', s.js("JSON.stringify([S.fontId,S.styles.regular.p.tsw,S.style,Object.keys(S.lib).length])"))
        s.js("S.styles.regular.p.tsw=18.75;bump()")
        # family weights are built from the user's value
        assert s.js("(()=>{const p=S.styles.regular.p;const a=famParams(p,'Light').tsw,r=famParams(p,'Regular').tsw,b=famParams(p,'Bold').tsw,k=famParams(p,'Black').tsw;return a<r&&r<b&&b<k&&r===p.tsw})()")
        # glyph list: every thumbnail's ink stays inside its cell with a margin (no bleed), both themes, regular and italic
        for th in ('light', 'dark'):
            for sty in ('regular', 'italic'):
                s.js("document.documentElement.dataset.theme='%s';S.style='%s';syncPanel();bump()" % (th, sty)); pg.wait_for_timeout(6000)  # W88: 390 glyph cells re-render lazily; under load 1.5 s left thumbnails of the previous thickness
                bad = s.js("""(()=>{const o=[];for(const b of document.querySelectorAll('#glyphs .gb')){const cv=b.querySelector('canvas');if(!cv||!cv.width)continue;const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,W=cv.width,H=cv.height,m=Math.max(2,Math.round(W*0.03));let hit=false;
                  for(let y=0;y<H&&!hit;y++)for(let x=0;x<W;x++){if(x>=m&&x<W-m&&y>=m&&y<H-m){x=W-m-1;continue;}if(d[(y*W+x)*4+3]>40){hit=true;break;}}if(hit)o.push(b.dataset.ch)}return o})()""")
                assert not bad, ('thumbnail ink touches the cell edge', th, sty, bad[:8])
        s.js("document.documentElement.dataset.theme='light';S.style='regular';syncPanel();bump()")
        # symbols @ # * © ₽ ° • · \ | : in the charset, drawn, ink inside the cell (advance horizontally, descender..ascender vertically), classes as decided
        symbad = s.js("""(()=>{const o=[];for(const ch of %s){if(!CHARSET.includes(ch)){o.push('charset '+ch);continue;}const g=finalGlyph(ch,S.styles.regular,{});
          if(!g||!g.cs.length){o.push('empty '+ch);continue;}let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const c of g.cs)for(const n of c.nodes){x0=Math.min(x0,n.x);x1=Math.max(x1,n.x);y0=Math.min(y0,n.y);y1=Math.max(y1,n.y);}
          if(x0<-1||x1>g.adv+1||y0<-260||y1>950)o.push('ink '+ch+' '+[x0,x1,g.adv,y0,y1].map(Math.round));}return o})()""" % json.dumps(SYMS))
        assert not symbad, symbad
        cls = s.js("(()=>{const o={};for(const ch of %s)o[ch]=TYG.CLASS(ch);return o})()" % json.dumps(SYMS))
        assert cls == {'₽': 'h', '#': 'h', **{c: 'n' for c in '@*©°•·\\|'}}, cls
        assert s.js("TYG.KMAX.h") == 2 and s.js("getFinal('₽',S.style).adv") > 0
        assert not [c for c in SYMS if s.js("(ch=>{const e=getFinal(ch,S.style);return !e||!e.cs.length})(%s)" % json.dumps(c))]
        # status plaque: the tilde glyph is not reported as an empty letter
        pg.evaluate("setTab('edit')")
        pg.wait_for_function("typeof ST!=='undefined'&&ST.res!=null", timeout=30000)
        pg.wait_for_timeout(3500)
        kinds = s.js("ST.items.map(i=>i.kind).join(',')")
        assert 'empty' not in kinds and 'cover' not in kinds, kinds
        assert not s.errs, s.errs[:3]
        return f'5 sliders {rng}, defaults, extremes keep topology, stretch default, reload ok'
    finally:
        s.close()


def run_mech(p):
    s = Session(p, 'tyaga-mech')
    try:
        pg = s.pg
        s.open_font('tyaga')
        data = base64.b64decode(ttf_b64(s))
        open(os.path.join(LOGS, 'tyaga_regular.ttf'), 'wb').write(data)
        f = check_font_file(data, 'ttf')
        hm = f['hmtx']; cm = f.getBestCmap()
        adv = lambda n: hm[n][0]
        # --- parity of advances: font alternates = engine advances (ladder x1.5 x2 x3 x4 x6, diagonal x1.5 x2)
        eng = s.js("(()=>{const p=S.styles.regular.p,o={};for(const a of TYS.alts){const r=TYS.get(a.canon,p,TYS.stepK(a.canon,a.n,p));o[a.name]=Math.round(r.adv)}return o})()")
        for n, v in eng.items():
            assert abs(adv(n) - v) <= 1, (n, adv(n), v)
        # --- HarfBuzz (Chromium): widths of text with tildes in the TTF, with calt / liga / clig each alone, and with all off
        pg2, width = shaping_page(s, data)
        feats = ['normal', '"calt" 1, "liga" 0, "clig" 0', '"calt" 0, "liga" 1, "clig" 0', '"calt" 0, "liga" 0, "clig" 1']
        tests = [('С~', 'uni0043.s1'), ('С~~~~~', 'uni0043.s5'), ('Е~~', 'uni0045.s2'), ('с~~', 'uni0043.s2'), ('Ы~~~', 'uni042B.s3'), ('А~', 'uni0041.s1'), ('А~~~', 'uni0041.s2'), ('и~~', 'uni0418.s2'), ('E~~~~', 'uni0045.s4'), ('e~', 'uni0045.s1')]
        for txt, alt in tests:
            for ft in feats:
                w = width(txt, ft)
                assert abs(w - adv(alt)) <= 1.5, (txt, ft, w, adv(alt))
            off = width(txt, '"calt" 0, "liga" 0, "clig" 0')
            assert abs(off - adv(cm[ord(txt[0])])) <= 1.5, (txt, 'features off: the tilde must stay invisible', off)
        # unstretchable letters: tilde adds nothing; diagonal locks at x2; free letters lock at x6 (6th tilde invisible)
        assert abs(width('І~~', 'normal') - width('І', 'normal')) <= 1.5
        assert abs(width('Е~~~~~~', 'normal') - adv('uni0045.s5')) <= 1.5
        # --- kerning incl. stretched alternates: Г А pair is tighter than the sum of advances, same with Г~ А, А~ Т
        k = width('ГА', '"kern" 1') - width('ГА', '"kern" 0')
        assert k <= -40, ('kern Г-А', k)
        k2 = width('Г~А', '"kern" 1') - width('Г~А', '"kern" 0')
        assert abs(k2 - k) <= 1.5, ('kern must follow the alternate', k, k2)
        k3 = width('А~Т', '"kern" 1') - width('А~Т', '"kern" 0')
        assert k3 <= -40, ('kern А~-Т', k3)
        # --- symbols: ₽ and # stretch (x1.5, x2, locked at x2), @ * © ° • · \\ | do not (the tilde stays invisible)
        for ch in '₽#':
            for n in (1, 2):
                assert 'uni%04X.s%d' % (ord(ch), n) in f.getGlyphOrder(), (ch, n)
            assert 'uni%04X.s3' % ord(ch) not in f.getGlyphOrder(), ch
            for txt, alt in ((ch + '~', 'uni%04X.s1' % ord(ch)), (ch + '~~', 'uni%04X.s2' % ord(ch)), (ch + '~~~', 'uni%04X.s2' % ord(ch))):
                for ft in feats:
                    assert abs(width(txt, ft) - adv(alt)) <= 1.5, (txt, ft, width(txt, ft), adv(alt))
            assert adv('uni%04X.s2' % ord(ch)) > 1.5 * adv(cm[ord(ch)]), ch
        for ch in '@*©°•·\\|':
            assert not any(g.startswith('uni%04X.s' % ord(ch)) for g in f.getGlyphOrder()), ch
            assert abs(width(ch + '~~', 'normal') - width(ch, 'normal')) <= 1.5, ('«~» must not stretch ' + ch)
            assert width(ch, 'normal') > 20, ch
        pg2.close()
        # --- the same in WOFF and in the family (every file of the zip)
        nm, wd, _ = s.download('woff')
        fw = check_font_file(wd, 'woff')
        assert fw['hmtx']['uni0043.s5'][0] == adv('uni0043.s5')
        nm, zd, _ = s.download('fam')
        zf = zipfile.ZipFile(io.BytesIO(zd)); n = 0
        for nmz in zf.namelist():
            if nmz.endswith('.ttf') or nmz.endswith('.woff'):
                check_font_file(zf.read(nmz), nmz); n += 1
        assert n >= 8, n
        # --- italic keeps the mechanism (shear only)
        di = base64.b64decode(ttf_b64(s, 'italic')); check_font_file(di, 'italic')
        assert not s.errs, s.errs[:3]
        return f'ttf/woff/{n} family files: calt+liga+clig, {len(eng)} alternates, kern incl. alternates, HarfBuzz widths ok'
    finally:
        s.close()


PARITY_JS = r"""async ([proto])=>{
  const sc=0.2,W=Math.ceil(700*1.9*sc)+40,H=Math.ceil(1100*sc)+30;
  const mk=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,W,H);return [c,x];};
  const P=TYG.clampP({});const res=[];
  const items=[];
  for(const ch of TYG.charset){if(!TYG.has(ch))continue;items.push([ch,ch,1,null]);}
  for(const a of TYS.alts){items.push([a.canon,a.name,TYS.stepK(a.canon,a.n,S.styles.regular.p),a.name]);}
  const seen=new Set();
  for(const [ch,name,k,alt] of items){
    const key=name;if(seen.has(key))continue;seen.add(key);
    const g1=window.Tyaga.glyph(ch,{},k);if(!g1)continue;
    const [c1,x1]=mk();window.Tyaga.drawGlyph(x1,g1,20+g1.sbL*sc,H-80*sc*1.0-130*sc,sc,'#000');
    const fg=finalGlyph(alt||ch,S.styles.regular,{},{slant:false,hyg:false});
    const [c2,x2]=mk();x2.save();x2.translate(20,H-80*sc*1.0-130*sc);x2.scale(sc,-sc);x2.fillStyle='#000';
    const p=new Path2D();for(const c of fg.cs){const n=c.nodes,N=n.length;p.moveTo(n[0].x,n[0].y);for(let i=0;i<N;i++){const a=n[i],b=n[(i+1)%N];const A=a.b||a,B=b.a||b;if(a.b||b.a)p.bezierCurveTo(A.x,A.y,B.x,B.y,b.x,b.y);else p.lineTo(b.x,b.y);}p.closePath();}
    x2.fill(p,'nonzero');x2.restore();
    const a=x1.getImageData(0,0,W,H).data,b=x2.getImageData(0,0,W,H).data;let xo=0,ink=0;
    for(let j=0;j<a.length;j+=4){const A=a[j]<128,B=b[j]<128;xo+=Math.abs(a[j]-b[j])/255;if(A||B)ink++;}
    res.push([name,xo/Math.max(1,ink),Math.abs(g1.adv-fg.adv)]);}
  return res;}"""


def run_block(p):
    s = Session(p, 'tyaga-block')
    try:
        pg = s.pg
        s.open_font('tyaga'); s.open_panes()
        # ---- parity of the native engine with the prototype (200 px, XOR share of ink)
        pg.add_script_tag(path=FIX)
        res = pg.evaluate(PARITY_JS, [0])
        REDRAWN = set('&№%?QJ23Й') | {n for n in (r[0] for r in res) if n.startswith(('uni0051.', 'uni004A.', 'uni0032.', 'uni0033.', 'uni0419.'))}  # W84 T4: redrawn on purpose, no prototype parity
        res = [r for r in res if r[0] not in REDRAWN]
        worst = max(res, key=lambda r: r[1])
        assert len(res) >= 150, len(res)
        assert worst[1] <= 0.03, ('XOR parity', worst, [r for r in res if r[1] > 0.03][:5])
        assert max(r[2] for r in res) <= 1.0, ('advance parity', max(res, key=lambda r: r[2]))
        # ---- toggle «Образец / Блок»
        assert s.js("document.querySelector('#tyb-view')&&!document.querySelector('.tyb-tog').hidden"), 'toggle must be visible for Тяга'
        assert not s.js("document.querySelector('#tyb-ctl').offsetParent"), 'block UI hidden in the sample mode'
        pg.click('#tyb-view [data-m=blk]'); pg.wait_for_function("!!document.querySelector('#tyb-ctl').offsetParent", timeout=5000)
        pg.wait_for_function("TYB.hits().length>=10", timeout=5000)
        assert s.js("!!document.querySelector('#p_tlg')"), '«Межстрочный» appears in block mode'
        assert s.js("document.querySelector('#specwrap').classList.contains('tyb-on')")
        # poster «ПЛЕ / СНЕ / ВЫЙ / СЫР» justified: equal line widths, one stretched letter per row (С, Е, Ы like the reference)
        M = s.js("(()=>{const m=TYB.model();return {w:m.Wt,lw:m.lays.map(l=>l.width),k:m.lines.map(l=>l.map(i=>[i.ch,+(i.k||1).toFixed(2)]))}})()")
        assert all(abs(x - M['w']) <= 1 for x in M['lw']), M
        stretched = [[c for c, k in row if k > 1.01] for row in M['k']]
        assert stretched == [['Е'], ['С'], ['Ы'], ['С']], stretched
        # W84 T4: hint under «Скопировать текст с ~» (Word ligatures / Figma), visible, below the button, inside the pane
        assert s.js("(()=>{const h=document.querySelector('#tyb-cphint'),b=document.querySelector('#tyb-cp');return !!h&&h.offsetParent!==null&&/Стандартные лигатуры/.test(h.textContent)&&/Figma/.test(h.textContent)&&h.getBoundingClientRect().top>=b.getBoundingClientRect().bottom-1&&h.getBoundingClientRect().right<=document.querySelector('#specwrap').getBoundingClientRect().right+0.5})()"), 'copy hint missing or misplaced'
        # W84 T4: «Поделиться» in block mode draws the justified block (not a plain line): poster formats, own phrase, other fonts unchanged
        READY = "SHARE.state.face&&SHARE.state.m&&!document.querySelector('#pst .pst-load').offsetParent"
        s.js("SHARE.open('tyaga','Тяга')"); pg.wait_for_function(READY, timeout=180000); pg.wait_for_timeout(200)
        assert s.js("document.querySelector('#pst').dataset.block") == '1' and s.js("!document.querySelector('#pst [data-r=blk]').hidden")
        for fmt in ('4:5', '1:1', '9:16'):
            pg.click('#pst [data-r=sf] [data-v="%s"]' % fmt); pg.wait_for_timeout(250)
            R = s.js("SHARE.recFrame(5.4)"); hero = [e for e in R['r'] if e['n'].startswith('hero')]
            assert len(hero) == 4, (fmt, len(hero)); xs = [e['x1'] for e in hero]
            assert max(xs) - min(xs) <= 4, ('poster block is not justified', fmt, xs)
            assert all(e['x0'] >= R['G'] - 0.5 and e['x1'] <= R['W'] - R['G'] + 0.5 for e in hero), (fmt, hero)
        assert s.js("!!(SHARE.state.bk&&SHARE.state.bk.f&&SHARE.state.bk.f.b.lines.length===4)")
        pg.click('#pst [data-r=sm] [data-v=phrase]'); pg.fill('#pst-ph', 'Тяга тянет буквы'); pg.keyboard.press('Tab'); pg.wait_for_timeout(900)
        pg.wait_for_function(READY, timeout=180000)
        R = s.js("SHARE.recFrame(5.4)"); hero = [e for e in R['r'] if e['n'].startswith('hero')]; xs = [e['x1'] for e in hero]
        assert len(hero) >= 2 and max(xs) - min(xs) <= 6, ('phrase block', xs)
        assert s.js("SHARE.state.bk.f.b.lines.map(l=>l.map(i=>i.ch).join('')).join(' ').replace(/ +/g,' ')") .replace('\n', ' ') != '', 'phrase lines'
        pg.click('#pst [data-r=sm] [data-v=grid]'); s.js("SHARE.close()"); pg.wait_for_timeout(300)
        pg.click('#tyb-view [data-m=smp]'); pg.wait_for_timeout(200)
        s.js("SHARE.open('tyaga','Тяга')"); pg.wait_for_function(READY, timeout=180000)
        assert s.js("document.querySelector('#pst').dataset.block") == '' and s.js("document.querySelector('#pst [data-r=blk]').hidden"), 'block poster without block mode'
        R = s.js("SHARE.recFrame(5.4)"); assert len([e for e in R['r'] if e['n'].startswith('hero')]) == 1, 'plain name line outside block mode'
        s.js("SHARE.close()"); pg.wait_for_timeout(300)
        pg.click('#tyb-view [data-m=blk]'); pg.wait_for_timeout(300)
        # «Равномерно»: lines stay equal, more letters share the stretch
        pg.click('#tyb-mode [data-v=eq]'); pg.wait_for_timeout(200)
        M2 = s.js("(()=>{const m=TYB.model();return {w:m.Wt,lw:m.lays.map(l=>l.width),k:m.lines.map(l=>l.filter(i=>(i.k||1)>1.01).length)}})()")
        assert all(abs(x - M2['w']) <= 1 for x in M2['lw']) and max(M2['k']) >= 2, M2
        pg.click('#tyb-mode [data-v=one]'); pg.wait_for_timeout(150)
        # block width slider
        pg.evaluate("(()=>{const r=document.querySelector('#tyb-w');r.value=8;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(150)
        assert abs(s.js("TYB.model().Wt") - 8 * 700) <= 1
        pg.evaluate("(()=>{const r=document.querySelector('#tyb-w');r.value=5.55;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(150)
        # block off: natural widths, width slider and mode disabled
        pg.click('#tyb-just', force=True); pg.wait_for_timeout(150)
        assert s.js("document.querySelector('#tyb-w').disabled") and s.js("TYB.model().lays.every(l=>l.glyphs.every(q=>Math.abs(q.g.W/q.g.w0-1)<1e-6))")
        pg.click('#tyb-just', force=True); pg.wait_for_timeout(150)
        # ---- drag the right edge of a letter: stretch changes, handle visible, stays inside the canvas
        box = pg.locator('#tyb-cv').bounding_box()
        h = s.js("(()=>{const q=TYB.hits().find(h=>h.li===0&&h.item.ch==='П');return q?{x:q.x1,y:(q.y0+q.y1)/2,k:q.g.W/q.g.w0}:null})()")
        assert h, 'П not found'
        k0 = h['k']
        pg.mouse.move(box['x'] + h['x'], box['y'] + h['y']); pg.mouse.down()
        pg.mouse.move(box['x'] + h['x'] + 60, box['y'] + h['y'], steps=6); pg.wait_for_timeout(100)
        mid = s.js("(()=>{const q=TYB.hits().find(h=>h.li===0&&h.item.ch==='П');return q.g.W/q.g.w0})()")
        assert mid > k0 + 0.2, ('drag did not stretch', k0, mid)
        assert s.js("document.querySelector('#tyb-cv').style.cursor")
        pg.mouse.up(); pg.wait_for_timeout(150)
        man = s.js("TYB.state().man")
        assert '0:0' in man and man['0:0'][1] == 'П' and man['0:0'][0] > 1.2, man
        # diagonal letter locks at x2 even when dragged far
        hd = s.js("(()=>{const q=TYB.hits().find(h=>h.li===0&&h.item.ch==='Л');return {x:q.x1,y:(q.y0+q.y1)/2}})()")
        pg.mouse.move(box['x'] + hd['x'], box['y'] + hd['y']); pg.mouse.down(); pg.mouse.move(box['x'] + hd['x'] + 400, box['y'] + hd['y'], steps=4); pg.mouse.up(); pg.wait_for_timeout(150)
        kl = s.js("(()=>{const q=TYB.hits().find(h=>h.li===0&&h.item.ch==='Л');return q.g.W/q.g.w0})()")
        assert kl <= 2.001, ('diagonal letter must lock at x2', kl)
        # keyboard: focus the canvas, ArrowDown selects the next letter, ArrowRight stretches, Delete resets
        pg.click('#tyb-rst'); pg.wait_for_timeout(100)
        assert s.js("Object.keys(TYB.state().man).length") == 0
        pg.focus('#tyb-cv'); pg.wait_for_timeout(100)
        pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
        man = s.js("TYB.state().man"); assert len(man) == 1 and list(man.values())[0][0] > 1.15, man
        assert 'ширина' in s.js("document.querySelector('#tyb-info').textContent"), 'status line for assistive tech'
        pg.keyboard.press('Delete'); pg.wait_for_timeout(100)
        assert s.js("Object.keys(TYB.state().man).length") == 0
        # ---- text with «~»: round trip through the font mechanism (tilde count = nearest ladder step), also lower case and a typed «~»
        t = s.js("TYB.tildeText()")
        assert t.split('\n') == [x for x in t.split('\n')] and len(t.split('\n')) == 4, t
        for ln, ch in zip(t.split('\n'), ['Е', 'С', 'Ы', 'С']):
            assert ch + '~' in ln, (ln, ch)
        pg.fill('#tyb-txt', 'пле~~\nТЯ~'); pg.wait_for_timeout(200)
        M3 = s.js("(()=>{const m=TYB.model();return m.lines.map(l=>l.map(i=>[i.ch,i.fixed?i.k:null]))})()")
        assert M3[0][2] == ['е', 2] and M3[1][1][1] == 1.5, M3       # «е~~» = x2, «Я~» = x1.5
        assert s.js("TYB.tildeText()").split('\n')[0].count('~') >= 2
        pg.fill('#tyb-txt', 'ПЛЕ\nСНЕ\nВЫЙ\nСЫР'); pg.wait_for_timeout(200)
        pg.click('#tyb-cp'); pg.wait_for_timeout(300)
        assert 'Скопировано' in s.js("document.querySelector('#tyb-info').textContent") or 'Скопировано' in s.js("document.querySelector('#toast').textContent")
        # ---- export PNG / SVG through the download pattern
        with pg.expect_download(timeout=30000) as d:
            pg.click('#tyb-png')
        path = os.path.join(LOGS, 'tyaga_block.png'); d.value.save_as(path); png = open(path, 'rb').read()
        assert png[:8] == b'\x89PNG\r\n\x1a\n' and len(png) > 3000, len(png)
        from PIL import Image
        im = Image.open(path).convert('L'); dark = sum(im.histogram()[:100]) / (im.width * im.height)
        assert 0.15 < dark < 0.7, ('PNG ink share', dark)
        with pg.expect_download(timeout=30000) as d:
            pg.click('#tyb-svg')
        path = os.path.join(LOGS, 'tyaga_block.svg'); d.value.save_as(path); svg = open(path, encoding='utf-8').read()
        assert svg.startswith('<?xml') and svg.count('<path') == 12 and 'viewBox' in svg, (svg[:80], svg.count('<path'))
        # ---- block state is saved with the project and survives a reload
        pg.fill('#tyb-txt', 'ТЯГА\nЛЕТО'); pg.click('#tyb-mode [data-v=eq]'); pg.wait_for_timeout(200)
        pj = s.js("JSON.stringify(projectJSON().fonts.tyaga.tyb)")
        tb = json.loads(pj); assert tb['txt'] == 'ТЯГА\nЛЕТО' and tb['mode'] == 'eq' and tb['on'] is True, tb
        pg.wait_for_function("(()=>{try{const t=JSON.parse(localStorage.getItem(KEY+'-f-tyaga')).tyb;return t.txt==='ТЯГА\\nЛЕТО'&&t.mode==='eq'}catch(e){return false}})()", timeout=15000); reload_keep(s, pg)
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        s.open_font('tyaga')
        try:
            pg.wait_for_function("!!document.querySelector('#tyb-ctl')&&!!document.querySelector('#tyb-ctl').offsetParent", timeout=8000)
        except Exception:
            raise AssertionError('block not restored after reload: ' + s.js("JSON.stringify({tyb:S.tyb,hidden:document.querySelector('#tyb-ctl').hidden,shut:document.querySelector('#specwrap').className,fid:S.fontId,tab:S.tab})"))
        assert s.js("TYB.state().txt") == 'ТЯГА\nЛЕТО' and s.js("TYB.state().mode") == 'eq' and s.js("!!document.querySelector('#p_tlg')")
        # block state of a project file is validated (bad values do not reach the model)
        s.js("S.lib.tyaga.tyb={on:true,txt:12,w:999,mode:'x',man:{'a':[1,'х'],'0:0':[99,'Т']}};activate('tyaga')")
        tbv = s.js("S.tyb"); assert tbv['w'] == 16 and tbv['mode'] == 'one' and tbv['man'].get('0:0', [0])[0] == 6 and 'a' not in tbv['man'], tbv
        # ---- other fonts do not show the tool; no console errors
        s.js("activate('volt');syncPanel()")
        assert not s.js("!!document.querySelector('#tyb-view')&&!document.querySelector('.tyb-tog').hidden"), 'toggle visible for another font'
        assert not s.errs, s.errs[:3]
        # ---- phone: block mode at 390 / tablet widths, nothing overflows or is cut
        for wpx, hpx in ((390, 844), (768, 1024), (1024, 768), (1440, 900)):
            ctx = s.b.new_context(viewport={'width': wpx, 'height': hpx}, accept_downloads=True)
            ctx.add_init_script(TOUR_OFF)
            ph = ctx.new_page(); perr = []
            ph.on('pageerror', lambda e: perr.append(str(e)))
            ph.goto('file://' + PAGE)
            ph.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
            ph.evaluate("setTab('library')"); ph.wait_for_selector('#libgrid .lcard[data-font=tyaga]', timeout=15000)
            ph.click('#libgrid .lcard[data-font=tyaga]'); ph.wait_for_function("S.fontId==='tyaga'&&!S.live", timeout=30000)
            ph.evaluate("setTab('edit')"); ph.wait_for_function("S.tab==='edit'", timeout=10000); ph.wait_for_timeout(600)
            ph.evaluate("document.querySelector('#tyb-view [data-m=blk]').click()"); ph.wait_for_timeout(900)
            r = ph.evaluate("""()=>{const sw=document.querySelector('#specwrap').getBoundingClientRect(),out=[];
              for(const e of document.querySelectorAll('#tyb-stage,#tyb-ctl,#tyb-ctl *,.tyb-tog,.tyb-tog *')){const b=e.getBoundingClientRect();if(!b.width||!b.height||e.offsetParent===null)continue;
                if(b.left<sw.left-0.5||b.right>sw.right+0.5)out.push([e.id||e.className||e.tagName,Math.round(b.left),Math.round(b.right),Math.round(sw.left),Math.round(sw.right)]);
                if(e.matches('button,.btn')&&e.scrollWidth>e.clientWidth+1)out.push(['clipped text',e.textContent.trim()]);}
              const cv=document.querySelector('#tyb-cv');return {over:out,sw:document.documentElement.scrollWidth,cvw:cv.getBoundingClientRect().width,cvh:cv.getBoundingClientRect().height}}""")
            assert not r['over'], (wpx, r['over'][:4])
            assert r['sw'] <= wpx + 1 and r['cvw'] > 200 and r['cvh'] > 100, (wpx, r)
            assert not perr, perr[:2]
            ctx.close()
        return f"parity worst XOR {worst[1]:.3f} ({worst[0]}), {len(res)} glyphs; poster rows {stretched}; drag/keyboard, tilde text, PNG {len(png)} B, SVG, persistence, 390-1440 no overflow"
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('tyaga', run_main), ('tyaga-mech', run_mech), ('tyaga-block', run_block)]))
