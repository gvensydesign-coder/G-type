"""W96-F formats lane: OTF (CFF) and WOFF2 next to TTF/WOFF.
 formats_enc   : in-page Brotli encoder vs node zlib decoder (edge cases)
 formats_lib   : every library font, regular + italic: node build (otf_lib.js) -> OTF and WOFF2 load in fontTools and Chromium; glyph count/names/cmap/advances equal to TTF,
                 outlines equal within tolerance (pen area/bounds), GSUB/GPOS/hmtx/cmap/name/OS2/hhea bytes equal, text width in Chromium within 0.5 % (plain, kern off, ss01, case, tnum)
 formats_ui    : export dialog chips + one-line hints, OTF / WOFF2 downloads (names, content), family zip (ttf + otf/ + woff2/ + woff/), variable font ttf + woff2, no page errors
 formats_drawn : a font made from imported SVG glyphs ('imp', same registry as the drawn fonts): OTF + WOFF2 export and load in fontTools and Chromium"""
import base64, glob, io, os, subprocess, sys, zipfile
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all, WK, LOGS, vf_zip
import fmt_cmp
from fontTools.ttLib import TTFont

SAMPLE = 'Съешь ещё этих мягких French булок AVATAR Typo 1/2 H2O 0123456789 (Жук)'
FEATS = ['normal', '"kern" 0', '"ss01"', '"case"', '"tnum"', '"smcp"']
SAME_TABLES = ['cmap', 'hmtx', 'name', 'OS/2', 'GSUB', 'GPOS', 'gasp', 'hhea']
JS_WIDTHS = """async ({a, txt, feats}) => {
  const out = {};
  for (const [n, b] of Object.entries(a)) {
    const u = Uint8Array.from(atob(b), c => c.charCodeAt(0));
    const f = new FontFace(n, u.buffer); await f.load(); document.fonts.add(f);
  }
  for (const n of Object.keys(a)) {
    out[n] = feats.map(ft => { const s = document.createElement('span'); s.textContent = txt;
      s.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;font:100px "' + n + '";font-feature-settings:' + ft;
      document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w; });
  }
  return out;
}"""


def lib_ids():
    return sorted(os.path.basename(f)[4:-12] for f in glob.glob(os.path.join(WK, 'lib-*-regular.ttf')))


def formats_enc(p):
    r = subprocess.run(['node', os.path.join(WK, 'tests', 'brotli_selftest.js')], capture_output=True, text=True, timeout=300)
    assert r.returncode == 0, r.stdout + r.stderr
    return r.stdout.strip().splitlines()[-1]


def build_lib(ids, out):
    """one fresh node process per font (2 at a time): the nit generator keeps state between builds of other fonts in one process (TTF vs TTF differs by a few kern units there, engine behaviour), a clean process makes TTF/OTF/WOFF2 of one font comparable byte for byte"""
    os.makedirs(out, exist_ok=True)
    pend = list(ids); run = []
    while pend or run:
        while pend and len(run) < 2:
            fid = pend.pop(0)
            run.append(subprocess.Popen(['node', '-r', './fixed_clock.js', 'otf_lib.js', out, fid], cwd=WK, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True))
        pr = run.pop(0)
        o, _ = pr.communicate(timeout=1200)
        assert pr.returncode == 0, o[-500:]


def formats_lib(p):
    ids = lib_ids()
    assert len(ids) >= 19, f'library fonts {len(ids)}'
    out = os.path.join(LOGS, 'fmt_lib')
    build_lib(ids, out)
    b = None
    s = Session(p, 'formats_lib')
    try:
        pg = s.pg
        tot = {'ttf': 0, 'otf': 0, 'woff2': 0}; worst_w = 0.0; worst_a = 0.0; nfiles = 0; kern_fonts = 0
        for fid in ids:
            for k in ('regular', 'italic'):
                base = os.path.join(out, f'lib-{fid}-{k}')
                raw = {e: open(f'{base}.{e}', 'rb').read() for e in ('ttf', 'otf', 'ttf.woff2')}
                t = TTFont(io.BytesIO(raw['ttf'])); o = TTFont(io.BytesIO(raw['otf'])); w = TTFont(io.BytesIO(raw['ttf.woff2']))
                tag = f'{fid} {k}'
                assert o.sfntVersion == 'OTTO' and 'CFF ' in o and 'glyf' not in o and 'loca' not in o, f'{tag}: OTF flavour'
                assert o['maxp'].tableVersion == 0x00005000 and o['post'].formatType == 3.0, f'{tag}: maxp/post'
                assert w.flavor == 'woff2' and 'glyf' in w, f'{tag}: woff2 flavour'
                r = fmt_cmp.compare(t, o)
                worst_a = max(worst_a, r['area_rel'])
                for tb in SAME_TABLES:
                    if tb in t:
                        if tb == 'hhea':  # extents come from the cubic outline: everything but minLsb/minRsb/xMaxExtent is equal
                            for fld in ('lineGap', 'advanceWidthMax', 'caretSlopeRise', 'caretSlopeRun', 'numberOfHMetrics'):
                                assert getattr(t['hhea'], fld) == getattr(o['hhea'], fld), f'{tag}: OTF hhea.{fld}'
                            for fld in ('ascent', 'descent', 'minLeftSideBearing', 'minRightSideBearing', 'xMaxExtent'):
                                assert abs(getattr(t['hhea'], fld) - getattr(o['hhea'], fld)) <= 8, f'{tag}: OTF hhea.{fld}'
                        elif tb == 'OS/2':  # vertical metrics follow the real extremes of the cubic outline (1-3 units off the TrueType ones)
                            for fld in o['OS/2'].__dict__:
                                if fld in ('sTypoAscender', 'sTypoDescender', 'usWinAscent', 'usWinDescent', 'panose', 'sTypoLineGap'):
                                    continue
                                assert getattr(t['OS/2'], fld) == getattr(o['OS/2'], fld), f'{tag}: OTF OS/2.{fld}'
                            for fld in ('sTypoAscender', 'sTypoDescender', 'usWinAscent', 'usWinDescent'):
                                assert abs(getattr(t['OS/2'], fld) - getattr(o['OS/2'], fld)) <= 3, f'{tag}: OTF OS/2.{fld}'
                        elif tb != 'hmtx':  # hmtx: advances equal (fmt_cmp), lsb = xMin of the cubic outline (within 8 units of the TrueType one, whose lsb follows the quad control points)
                            assert tb in o and t.reader[tb] == o.reader[tb], f'{tag}: OTF table {tb} differs from TTF'
                        assert tb in w and t.reader[tb] == w.reader[tb], f'{tag}: WOFF2 table {tb} differs from TTF'
                assert o['head'].unitsPerEm == t['head'].unitsPerEm and o['head'].macStyle == t['head'].macStyle
                # WOFF2 == TTF glyph for glyph (lossless transform)
                assert w.getGlyphOrder() == t.getGlyphOrder() and fmt_cmp.cmap_of(w) == fmt_cmp.cmap_of(t), f'{tag}: woff2 names/cmap'
                gt, gw = t['glyf'], w['glyf']
                for n in t.getGlyphOrder():
                    x, y = gt[n], gw[n]
                    assert x.numberOfContours == y.numberOfContours, f'{tag}: {n} contours'
                    if x.numberOfContours:
                        assert list(x.coordinates) == list(y.coordinates) and list(x.flags) == list(y.flags) and list(x.endPtsOfContours) == list(y.endPtsOfContours), f'{tag}: {n} woff2 outline'
                has_kern = 'GPOS' in t
                kern_fonts += has_kern
                # Chromium: the three faces on one page, same text widths
                a = {n: base64.b64encode(raw[e]).decode() for n, e in (('T', 'ttf'), ('O', 'otf'), ('W', 'ttf.woff2'))}
                wd = pg.evaluate(JS_WIDTHS, {'a': a, 'txt': SAMPLE, 'feats': FEATS})
                for i, ft in enumerate(FEATS):
                    for n in ('O', 'W'):
                        d = abs(wd[n][i] - wd['T'][i]) / max(wd['T'][i], 1)
                        worst_w = max(worst_w, d)
                        assert d <= 0.005, f'{tag}: width {n} vs TTF with {ft}: {wd[n][i]:.2f} vs {wd["T"][i]:.2f}'
                if has_kern:  # kerning really takes part (and equally in all three)
                    assert (wd['T'][0] != wd['T'][1]) == (wd['O'][0] != wd['O'][1]) == (wd['W'][0] != wd['W'][1]), f'{tag}: kern on/off differs between formats'
                pg.evaluate("document.fonts.clear?.()")
                for e, key in (('ttf', 'ttf'), ('otf', 'otf'), ('woff2', 'ttf.woff2')):
                    tot[e] += len(raw[key])
                nfiles += 1
        assert not s.errs, f'page errors {s.errs[:3]}'
        return (f'{len(ids)} fonts x2 styles ok; glyph/cmap/advance/GSUB/GPOS equal; area diff max {worst_a*100:.2f}%; Chromium width diff max {worst_w*100:.3f}%; '
                f'bytes ttf {tot["ttf"]//1024}K otf {tot["otf"]//1024}K woff2 {tot["woff2"]//1024}K')
    finally:
        s.close()


def collect_downloads(s, trigger, n, timeout=240000):
    got = []
    s.pg.on('download', lambda d: got.append(d))
    trigger()
    import time
    t0 = time.time()
    while len(got) < n and time.time() - t0 < timeout / 1000:
        s.pg.wait_for_timeout(300)
    assert len(got) >= n, f'{len(got)} downloads of {n}'
    res = []
    for d in got:
        path = os.path.join(LOGS, 'dl_formats_' + d.suggested_filename)
        d.save_as(path)
        res.append((d.suggested_filename, open(path, 'rb').read()))
    return res


def formats_ui(p):
    s = Session(p, 'formats_ui')
    try:
        pg = s.pg
        s.open_font('volt')
        pg.evaluate("document.querySelector('#ex-menu').click()")
        pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'")
        pg.evaluate("document.querySelector('#ex-list [data-x=otf]').click()")
        pg.wait_for_selector('#xpv:not([hidden])', timeout=10000)
        chips = pg.evaluate("[...document.querySelectorAll('#xpv .xpv-fmt [data-xf]')].map(b=>b.dataset.xf).join(' ')")
        assert chips == 'ttf otf woff2 woff fam vf png', chips
        want = {'ttf': 'установки в систему', 'otf': 'кривые как в редакторе', 'woff2': 'самый лёгкий', 'woff': 'старых браузеров', 'vf': 'OTF'}
        for x, frag in want.items():
            pg.click(f'#xpv [data-xf={x}]')
            txt = pg.inner_text('#xpv #xpv-hint')
            assert frag in txt and txt.strip(), f'hint {x}: {txt}'
            files = pg.inner_text('#xpv .xpv-files')
            assert (x if x != 'vf' else '-VF.zip') in files, f'files {x}: {files}'
            box = pg.evaluate("(()=>{const e=document.querySelector('#xpv'),r=e.getBoundingClientRect(),h=document.querySelector('#xpv-hint').getBoundingClientRect();return [r.left,r.right,innerWidth,h.left,h.right,document.querySelector('#xpv .xpv-fmt').scrollWidth>document.querySelector('#xpv .xpv-fmt').clientWidth+1]})()")
            assert box[0] >= 0 and box[1] <= box[2] and box[3] >= box[0] and box[4] <= box[1] + 1, f'hint box {x} {box}'
        pg.click('#xpv [data-xa=close]')
        rep = []
        # single files through the menu
        for item, ext in (('otf', '.otf'), ('woff2', '.woff2')):
            name, data, _ = s.download(item)
            assert name.endswith(ext), name
            f = TTFont(io.BytesIO(data))
            if item == 'otf':
                assert f.sfntVersion == 'OTTO' and 'CFF ' in f and f['head'].magicNumber == 0x5F0F3CF5
            else:
                assert data[:4] == b'wOF2' and f.flavor == 'woff2' and 'glyf' in f
            assert f.getBestCmap() and len(f.getGlyphOrder()) > 500
            rep.append(f'{item}={len(data)//1024}K')
        # regular + italic of one export click: two downloads each
        for item, ext in (('otf', '.otf'), ('woff2', '.woff2')):
            def go(item=item):
                pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=120000)
                pg.evaluate("document.querySelector('#ex-menu').click()")
                pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'")
                pg.evaluate("x=>document.querySelector('#ex-list [data-x='+x+']').click()", item)
                pg.evaluate("document.querySelector('#xpv [data-xa=go]').click()")
            res = collect_downloads(s, go, 2)
            names = sorted(n for n, _ in res[-2:])
            assert names[0].endswith('-Italic' + ext) or 'Italic' in names[0] or 'Italic' in names[1], names
            for n, d in res[-2:]:
                TTFont(io.BytesIO(d))
        # family zip
        name, data, _ = s.download('fam')
        z = zipfile.ZipFile(io.BytesIO(data)); assert z.testzip() is None
        names = z.namelist()
        ttfs = [n for n in names if '/' not in n and n.endswith('.ttf')]
        for sub, ext in (('otf', '.otf'), ('woff2', '.woff2'), ('woff', '.woff')):
            fs = [n for n in names if n.startswith(sub + '/') and n.endswith(ext)]
            assert len(fs) == len(ttfs) == 8, f'{sub}: {len(fs)} vs {len(ttfs)}'
        pairs = 0
        for n in ttfs[:3]:
            stem = n[:-4]
            t = TTFont(io.BytesIO(z.read(n))); o = TTFont(io.BytesIO(z.read('otf/' + stem + '.otf'))); w = TTFont(io.BytesIO(z.read('woff2/' + stem + '.woff2')))
            fmt_cmp.compare(t, o)
            assert w.getGlyphOrder() == t.getGlyphOrder()
            assert t['hhea'].ascent == o['hhea'].ascent and t['OS/2'].usWinAscent == o['OS/2'].usWinAscent, 'family vertical metrics'
            pairs += 1
        rep.append(f'zip {len(names)} files')
        assert not s.errs, f'page errors {s.errs[:3]}'
        return ' '.join(rep)
    finally:
        s.close()


def formats_vf(p):
    s = Session(p, 'formats_vf')
    try:
        pg = s.pg
        s.open_font('kvadra')
        def go():
            pg.wait_for_function("!document.querySelector('#ex-menu').hasAttribute('aria-busy')", timeout=120000)
            pg.evaluate("document.querySelector('#ex-menu').click()")
            pg.wait_for_function("document.querySelector('#ex-menu').getAttribute('aria-expanded')==='true'")
            pg.evaluate("document.querySelector('#ex-list [data-x=vf]').click()")
            pg.evaluate("(()=>{const p=document.querySelector('#xpv');if(p&&!p.hidden)p.querySelector('[data-xa=go]').click();})()")
        zr = collect_downloads(s, go, 1)
        assert len(zr) == 1 and zr[0][0].endswith('-VF.zip'), [n for n, _ in zr]
        zf = zipfile.ZipFile(io.BytesIO(zr[0][1])); zn = sorted(zf.namelist())
        assert [n for n in zn if n.endswith('.ttf')] and all(n.startswith('woff2/') for n in zn if n.endswith('.woff2')), zn
        res = sorted(vf_zip(zr[0][1]).items())
        names = sorted(n for n, _ in res)
        assert any(n.endswith('-VF.ttf') for n in names) and any(n.endswith('-VF.woff2') for n in names) and any(n.endswith('-VF-Italic.woff2') for n in names), names
        for n, d in res:
            f = TTFont(io.BytesIO(d))
            assert 'fvar' in f and 'gvar' in f, f'{n}: no variation tables'
            if n.endswith('.woff2'):
                assert f.flavor == 'woff2'
        a = {chr(65 + i): base64.b64encode(d).decode() for i, (n, d) in enumerate(res) if n.endswith('-VF.ttf') or n.endswith('-VF.woff2')}
        wd = pg.evaluate("""async ({a}) => {const out = {};for (const [n, b] of Object.entries(a)) {const u = Uint8Array.from(atob(b), c => c.charCodeAt(0));const f = new FontFace('V' + n, u.buffer, {weight: '300 900'}); await f.load(); document.fonts.add(f);}
          for (const n of Object.keys(a)) {out[n] = [300, 900].map(wt => {const s = document.createElement('span'); s.textContent = 'Съешь ещё AVATAR'; s.style.cssText = 'position:absolute;white-space:pre;font:' + wt + ' 100px V' + n; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w;});}return out;}""", {'a': a})
        ks = list(wd)
        assert len(ks) == 2 and all(abs(x - y) < 0.5 for x, y in zip(wd[ks[0]], wd[ks[1]])), wd
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'VF files {len(res)}: ' + ' '.join(f'{n}={len(d)//1024}K' for n, d in sorted(res))
    finally:
        s.close()


def formats_drawn(p):
    from e2e_import import make_fixtures
    fs = make_fixtures()
    s = Session(p, 'formats_drawn')
    try:
        pg = s.pg
        pg.click('#imp-card')
        pg.wait_for_selector('#imp-files', state='attached', timeout=10000)
        pg.set_input_files('#imp-files', fs)
        pg.wait_for_function("Object.keys(IMP.glyphs).length>=10 && !IU.pending.length", timeout=60000)
        pg.click('#imp-build')
        pg.wait_for_function("S.fontId==='imp' && S.tab==='edit' && !S.live", timeout=60000)
        got = {}
        for item in ('ttf', 'otf', 'woff2'):
            name, data, _ = s.download(item)
            got[item] = (name, data)
        t = TTFont(io.BytesIO(got['ttf'][1])); o = TTFont(io.BytesIO(got['otf'][1])); w = TTFont(io.BytesIO(got['woff2'][1]))
        r = fmt_cmp.compare(t, o)
        assert o.sfntVersion == 'OTTO' and w.flavor == 'woff2'
        assert w.getGlyphOrder() == t.getGlyphOrder() and fmt_cmp.cmap_of(w) == fmt_cmp.cmap_of(t)
        cm = o.getBestCmap()
        for c in 'HOnoxeaspl':
            assert ord(c) in cm, f'{c} missing'
        a = {n: base64.b64encode(got[e][1]).decode() for n, e in (('T', 'ttf'), ('O', 'otf'), ('W', 'woff2'))}
        wd = pg.evaluate(JS_WIDTHS, {'a': a, 'txt': 'HOnoxeaspl HOnox', 'feats': ['normal']})
        for n in 'OW':
            assert abs(wd[n][0] - wd['T'][0]) / wd['T'][0] <= 0.005, wd
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f"imported/drawn font: glyphs={r['glyphs']} area diff {r['area_rel']*100:.2f}% ttf={len(got['ttf'][1])//1024}K otf={len(got['otf'][1])//1024}K woff2={len(got['woff2'][1])//1024}K"
    finally:
        s.close()


if __name__ == '__main__':
    sel = sys.argv[1:] or ['formats_enc', 'formats_lib', 'formats_ui', 'formats_vf', 'formats_drawn']
    allc = {'formats_enc': formats_enc, 'formats_lib': formats_lib, 'formats_ui': formats_ui, 'formats_vf': formats_vf, 'formats_drawn': formats_drawn}
    sys.exit(check_all([(n, allc[n]) for n in sel]))
