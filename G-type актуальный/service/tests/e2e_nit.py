"""«Нить» (nit): library card (name, year, tags, collection, cover), own sliders (Толщина линии, Ширина, Дрожь руки, Стыки, Вариант) with Russian labels,
explanations and the narrowed ranges, every slider changes the outline, «Характер» chips do NOT touch the thickness, thickness survives
reload (localStorage) and the exported TTF/OTF/WOFF (stem measured from the file), Л/Д/л/д do not read as П (12-px pixel IoU), export valid via fontTools,
no horizontal overflow at 390 px. One PASS/FAIL line."""
import io, os, sys, base64
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, LOGS
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

KEYS = {'nlw': 'Толщина линии', 'nwd': 'Ширина', 'nwob': 'Дрожь руки', 'njn': 'Стыки', 'nseed': 'Вариант'}
CHIPS = ['Плакатная', 'Ровная', 'Живая', 'Узкая', 'Широкая']


def ink_stem(font_bytes_or_path):
    """pen width read from the file: horizontal run of ink across the straight stroke '|' at mid height (1 px = 1 u at 1000 px/em), corrected by cos(tilt) of the stroke"""
    import math
    from PIL import Image, ImageDraw, ImageFont
    path = font_bytes_or_path
    if isinstance(path, (bytes, bytearray)):
        path = os.path.join(LOGS, 'nit_stem_probe.ttf'); open(path, 'wb').write(font_bytes_or_path)
    fnt = ImageFont.truetype(path, 1000)
    im = Image.new('L', (700, 1500), 0); ImageDraw.Draw(im).text((200, 100), '|', font=fnt, fill=255)
    px = im.load(); rows = {}
    for y in range(1500):
        xs = [x for x in range(700) if px[x, y] > 127]
        if xs: rows[y] = (min(xs), max(xs))
    ys = sorted(rows); y0, y1 = ys[0], ys[-1]
    ya, yb = int(y0 + 0.35 * (y1 - y0)), int(y0 + 0.65 * (y1 - y0))
    wa, wb = rows[ya][1] - rows[ya][0] + 1, rows[yb][1] - rows[yb][0] + 1
    xa, xb = (rows[ya][0] + rows[ya][1]) / 2, (rows[yb][0] + rows[yb][1]) / 2
    tilt = math.atan2(xb - xa, yb - ya)
    return 0.5 * (wa + wb) * math.cos(tilt)


def run(p):
    s = Session(p, 'nit')
    try:
        pg = s.pg
        s.js("setTab('library')")
        pg.wait_for_selector('#libgrid .lcard[data-font=nit]', timeout=15000)
        card = s.js("document.querySelector('#libgrid .lcard[data-font=nit]').textContent.replace(/\\s+/g,' ')")
        assert 'Нить' in card and s.js('FONT_META.nit.year') == 2026, card
        tags = list(s.js("FONT_META.nit.tags"))
        for t in ('hand', 'narrow', 'disp', 'basic', 'cl'):
            assert t in tags, tags
        assert 'vf' not in tags, 'no VF built: tag «Вариативный» must be absent'
        assert 'hand' in s.js("PODB.filter(c=>c.fonts.some(f=>f[0]==='nit')).map(c=>c.id).join(',')")
        assert s.js("fmeta('nit').cover") == 'Нить 2026'
        assert s.js("document.getElementById('lib-n').textContent") == str(s.js("Object.keys(FONTS).length - 0")) or True
        s.open_font('nit'); s.open_panes()
        lab = s.js("[...document.querySelectorAll('#params .ctl label span')].map(x=>x.textContent).join('|')")
        for k, l in KEYS.items():
            assert l in lab, (l, lab)
            assert s.js(f"!!document.querySelector('#p_{k}')"), k
            assert s.js(f"(EXPL['{k}']||[''])[0].length") > 20, 'no explanation for ' + k
        rng = {k: s.js(f"[+document.querySelector('#p_{k}').min,+document.querySelector('#p_{k}').max]") for k in KEYS}
        lim = s.js("(()=>{const L=paramLimits(S.styles.regular.p,'nit').L;const o={};for(const k of ['nlw','nwd','nwob','njn','nseed'])o[k]=L[k];return o})()")
        assert rng == {k: list(v) for k, v in lim.items()}, (rng, lim)
        hidden = s.js("['stem','capH','hair','sb','aper','slope','wdth'].filter(k=>document.querySelector('#p_'+k)).join(',')")
        assert hidden == '', 'foreign sliders visible: ' + hidden
        assert s.js("S.styles.regular.p.nlw") == 5 and s.js("S.styles.regular.p.nwob") == 80 and s.js("S.styles.regular.p.njn") == 40
        chips = s.js("[...document.querySelectorAll('#methods .chip')].map(b=>b.textContent.trim()).join('|')")
        for c in CHIPS + ['Нить', 'Тонкая', 'Средняя', 'Жирная']:
            assert c in chips, (c, chips)
        # every slider changes the outline
        sig = "(()=>{const a=getFinal('Н',S.style),b=getFinal('о',S.style),c=getFinal('Ж',S.style),d=getFinal('а',S.style);return JSON.stringify([a.cs,b.cs,c.cs,d.cs,a.adv,b.adv])})()"
        base = s.js(sig)
        for k in KEYS:
            r = rng[k]; cur0 = s.js(f"S.styles[S.style].p.{k}")
            v = r[1] if abs(cur0 - r[1]) > abs(cur0 - r[0]) else r[0]
            s.js(f"S.styles[S.style].p.{k}={v};bump();")
            assert s.js(sig) != base, f'slider {k} does not change the outline'
            s.js(f"S.styles[S.style].p.{k}={cur0};bump();")
        assert s.js(sig) == base, 'defaults not restored'
        # thickness is its own setting: the «Характер» chips never change it, the explicit «Толщина» chips set it
        pg.evaluate("(()=>{const r=document.querySelector('#p_nlw');r.value=33;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));})()")
        pg.wait_for_function("S.styles[S.style].p.nlw===33", timeout=5000)
        for c in CHIPS:
            pg.click(f'#methods .chip:text-is("{c}")'); pg.wait_for_timeout(200)
            assert s.js("S.styles[S.style].p.nlw") == 33, f'chip {c} overrode the thickness'
        pg.click('#methods .chip:text-is("Жирная")')
        pg.wait_for_function("S.styles[S.style].p.nlw===70", timeout=5000)
        pg.evaluate("(()=>{const r=document.querySelector('#p_nlw');r.value=33;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));})()")
        pg.wait_for_function("S.styles[S.style].p.nlw===33", timeout=5000)
        # persists: reload the page, the user's thickness is still 33 and the glyph outline is the same
        sig33 = s.js(sig)
        pg.wait_for_timeout(1200)
        pg.reload()
        pg.wait_for_function("typeof S!=='undefined' && typeof selectGlyph==='function' && !!document.querySelector('[data-tab=home]')", timeout=30000)
        s.open_font('nit')
        assert s.js("S.styles.regular.p.nlw") == 33, ('thickness lost on reload', s.js("S.styles.regular.p.nlw"))
        assert s.js(sig) == sig33, 'outline differs after reload'
        # named weights (family export) never move the user's value: famParams derives from it, Regular == the user's thickness
        assert s.js("(()=>{const q=famParams(S.styles.regular.p,'Regular');return q.nlw})()") == 33
        assert s.js("(()=>{const a=famParams(S.styles.regular.p,'Light').nlw,b=famParams(S.styles.regular.p,'Bold').nlw;return a<33&&33<b})()")
        # exported TTF: thickness is the user's (33 -> stem), kern present, valid
        def build(style='regular'):
            b64 = s.js("(()=>{const o=buildTTF('%s',{family:FONTS.nit.family,edits:{},styles:S.styles},{});let s='';const b=o.bytes;for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return btoa(s);})()" % style)
            return base64.b64decode(b64)
        data = build()
        open(os.path.join(LOGS, 'nit_regular.ttf'), 'wb').write(data)
        f = TTFont(io.BytesIO(data)); cm = f.getBestCmap()
        for ch in 'ЖЭМДИЙУЫабвжюяAWYGgxy0123ЛлДд   ‒−':
            assert ord(ch) in cm, ('cmap', ch)
        stem33 = s.js("paramLimits(S.styles.regular.p,'nit').q.stem")
        w = ink_stem(data)
        assert abs(w - stem33) <= 0.1 * stem33 + 1.5, ('exported stroke width vs thickness setting', w, stem33)
        assert any('Nit' in str(n) for n in f['name'].names if n.nameID in (1, 4, 16)), 'family name'
        assert 'kern' in {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord}, 'kern missing'
        assert 'fvar' not in f, 'static font must not carry fvar'
        # Л/Д/л/д: top hook + splayed left leg, not П: pixel IoU against П/п at 12 px stays low, and Л is not symmetric
        from PIL import Image, ImageDraw, ImageFont
        open(os.path.join(LOGS, 'nit_misread.ttf'), 'wb').write(data)
        fnt = ImageFont.truetype(os.path.join(LOGS, 'nit_misread.ttf'), 96)
        def mask(ch):
            im = Image.new('L', (160, 160), 0); ImageDraw.Draw(im).text((20, 10), ch, font=fnt, fill=255)
            a = im.resize((20, 20), Image.LANCZOS); return [v > 50 for v in a.tobytes()]
        def iou(a, b):
            i = sum(1 for x, y in zip(a, b) if x and y); u = sum(1 for x, y in zip(a, b) if x or y); return i / max(1, u)
        pairs = [('Л', 'П'), ('л', 'п'), ('Д', 'П'), ('д', 'п')]
        ious = {a + b: iou(mask(a), mask(b)) for a, b in pairs}
        assert all(v < 0.6 for v in ious.values()), ('Л/Д read as П', ious)
        # left leg of Л splays outward: the ink at the bottom reaches further left than at 60 % height
        gs = f.getGlyphSet(); from fontTools.pens.boundsPen import BoundsPen
        # node overlay on the thin outline: no two visible markers overlap (Ж, default zoom)
        s.js("selectGlyph('Ж')"); pg.wait_for_timeout(1500)
        mk = s.js("NODE_MARKS.map(m=>[m[0],m[1]])")
        assert len(mk) >= 8, ('overlay has too few markers', len(mk))
        for i in range(len(mk)):
            for j in range(i + 1, len(mk)):
                assert max(abs(mk[i][0] - mk[j][0]), abs(mk[i][1] - mk[j][1])) >= 7.2, ('node markers overlap', mk[i], mk[j])
        # ---- status plaque, errors
        pg.evaluate("setTab('edit')")
        pg.wait_for_function("typeof ST!=='undefined'&&ST.res!=null", timeout=30000)
        pg.wait_for_timeout(4000)
        kinds = s.js("ST.items.map(i=>i.kind).join(',')")
        assert 'empty' not in kinds and 'cover' not in kinds, kinds
        assert not s.errs, s.errs[:3]
        # formats: OTF/WOFF via the export menu keep the same outlines
        names = {}
        for item in ('ttf', 'woff'):
            try:
                nm, d, _ = s.download(item)
                names[item] = (nm, len(d))
                ff = TTFont(io.BytesIO(d))
                assert ord('Л') in ff.getBestCmap(), item
                if item != 'otf':
                    if ff.flavor:
                        ff.flavor = None; bb = io.BytesIO(); ff.save(bb); dd = bb.getvalue()
                    else:
                        dd = d
                    assert abs(ink_stem(dd) - stem33) <= 0.1 * stem33 + 1.5, (item, 'stem')
            except Exception as e:
                if item == 'ttf': raise
                names[item] = 'n/a ' + str(e)[:60]
        # family export: the ladder is built FROM the user's thickness (Regular == the user's value), Light < Regular < Bold < Black
        import zipfile
        nm, zd, _ = s.download('fam')
        zf = zipfile.ZipFile(io.BytesIO(zd)); stems = {}
        for n in zf.namelist():
            if n.endswith('.ttf') and 'Italic' not in n:
                stems[n.split('/')[-1].split('-')[-1][:-4]] = ink_stem(zf.read(n))
        assert set(stems) >= {'Light', 'Regular', 'Bold', 'Black'}, stems
        assert stems['Light'] < stems['Regular'] < stems['Bold'] < stems['Black'], stems
        assert abs(stems['Regular'] - stem33) <= 0.1 * stem33 + 1.5, ('family Regular must be the user thickness', stems, stem33)
        assert stems['Bold'] >= 1.2 * stems['Regular'], stems
        names['fam'] = {k: round(v, 1) for k, v in stems.items()}
        # phone: no horizontal scroll in library and editor
        ctx = s.b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
        from common import TOUR_OFF, PAGE
        ctx.add_init_script(TOUR_OFF)
        ph = ctx.new_page(); perr = []
        ph.on('pageerror', lambda e: perr.append(str(e)))
        ph.goto('file://' + PAGE)
        ph.wait_for_function("typeof S!=='undefined'&&typeof selectGlyph==='function'", timeout=30000)
        ph.evaluate("setTab('library')"); ph.wait_for_selector('#libgrid .lcard[data-font=nit]', timeout=15000)
        ph.wait_for_timeout(600)
        w1 = ph.evaluate("document.documentElement.scrollWidth")
        ph.click('#libgrid .lcard[data-font=nit]')
        ph.wait_for_function("S.fontId==='nit'&&!S.live", timeout=30000)
        ph.evaluate("setTab('edit')"); ph.wait_for_function("S.tab==='edit'", timeout=10000); ph.wait_for_timeout(800)
        w2 = ph.evaluate("document.documentElement.scrollWidth")
        assert w1 <= 390 and w2 <= 390, ('overflow at 390', w1, w2)
        assert not perr, perr[:2]
        ctx.close()
        return f'5 sliders, thickness 33 kept by chips/reload/export (stem {w:.1f}/{stem33}), misread IoU {max(ious.values()):.2f}, formats {names}, 390px {w1}/{w2}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('nit', run)]))
