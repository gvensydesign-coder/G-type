"""OpenType panel: toggles show only for supporting fonts, a toggle changes the specimen (glyph names and canvas pixels),
looks right in both themes, and the exported TTF contains the features (with kern GPOS intact)."""
import io, os, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from common import Session, check_all
from fontTools.ttLib import TTFont

GN = "(t,k)=>layout(t,'regular',60,4000).lines.flatMap(l=>l.chars.map(c=>c.gn)).join(' ')"


def spec_hash(s):
    return hashlib.md5(s.pg.locator('#spec').screenshot()).hexdigest()


def ot_check(p):
    s = Session(p, 'ot')
    try:
        pg = s.pg
        s.open_font('volt'); s.open_panes()
        pg.wait_for_selector('#otsec', state='visible', timeout=10000)
        rows = s.js("[...document.querySelectorAll('#otsec [data-otrow]')].filter(r=>!r.hidden).map(r=>r.dataset.otrow).join(' ')")
        for k in ('smcp', 'c2sc', 'onum', 'tnum', 'frac', 'sups', 'subs', 'liga'):
            if k == 'liga':
                assert k not in rows.split(), f'Volt has no ligatures: {rows}'
            else:
                assert k in rows.split(), f'volt row {k} missing: {rows}'
        assert 'swsh' not in rows.split() and 'salt' not in rows.split(), f'Propis-only rows visible in Volt: {rows}'
        tips = s.js("[...document.querySelectorAll('#otsec [data-otrow]')].filter(r=>!r.hidden).map(r=>r.title.length).join(' ')")
        assert all(int(x) > 40 for x in tips.split()), f'tooltips too short {tips}'
        s.js("S.text='Ab 2024 1/2';drawSpecimen()")
        base_names = s.js(f"({GN})(S.text)")
        assert 'b.sc' not in base_names and 'one.numr' not in base_names, base_names
        h0 = spec_hash(s)
        # toggle each: names change
        pg.check('#otsec [data-ot=smcp]')
        n1 = s.js(f"({GN})(S.text)")
        assert 'b.sc' in n1.split(), n1
        h1 = spec_hash(s)
        assert h1 != h0, 'smcp did not change the specimen canvas'
        pg.check('#otsec [data-ot=onum]')
        n2 = s.js(f"({GN})(S.text)")
        assert 'two.osf' in n2.split() and 'zero.osf' in n2.split(), n2
        pg.check('#otsec [data-ot=frac]')
        n3 = s.js(f"({GN})(S.text)")
        assert 'one.numr' in n3.split() and 'uni2044' in n3.split() and 'two.dnom' in n3.split(), n3
        assert spec_hash(s) != h1, 'onum/frac did not change the canvas'
        pg.check('#otsec [data-ot=tnum]')
        assert 'two.tosf' in s.js(f"({GN})(S.text)").split()
        pg.uncheck('#otsec [data-ot=smcp]')
        assert 'b.sc' not in s.js(f"({GN})(S.text)").split()
        # both themes: panel readable, checkbox accent
        for th in ('light', 'dark'):
            s.js(f"document.documentElement.setAttribute('data-theme','{th}')")
            r = s.js("(()=>{const l=document.querySelector('#otsec [data-otrow=smcp]'),c=getComputedStyle(l),b=getComputedStyle(document.querySelector('#otsec')).backgroundColor;return [c.color,c.display,l.getBoundingClientRect().height>10]})()")
            assert r[1] == 'flex' and r[2] and r[0] != '', f'{th}: {r}'
            pg.locator('#otsec').screenshot(path=os.path.join(os.path.dirname(__file__), '..', 'logs', f'ot_panel_{th}.png'))
        s.js("document.documentElement.setAttribute('data-theme','light')")
        # export carries features; kern stays
        pg.uncheck('#otsec [data-ot=onum]')
        name, data, path = s.download('ttf')
        f = TTFont(io.BytesIO(data))
        feats = {fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord}
        need = {'smcp', 'c2sc', 'onum', 'lnum', 'tnum', 'pnum', 'frac', 'sups', 'subs', 'sinf', 'ordn', 'ss01', 'case'}
        assert need <= feats, f'export lacks {sorted(need - feats)}'
        gf = {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord} if 'GPOS' in f else set()
        assert 'kern' in f or 'kern' in gf, 'kerning lost'
        go = f.getGlyphOrder()
        assert 'a.sc' in go and 'two.osf' in go and 'one.numr' in go and 'uni2044' in go, 'OT glyphs not in export'
        # Propis rows and swash
        s.open_font('propis'); s.open_panes()
        pg.wait_for_selector('#otsec', state='visible', timeout=10000)
        rows = s.js("[...document.querySelectorAll('#otsec [data-otrow]')].filter(r=>!r.hidden).map(r=>r.dataset.otrow).join(' ')")
        assert 'swsh' in rows.split() and 'salt' in rows.split() and 'liga' not in rows.split(), rows
        s.js("S.text='Нос ава Anna';drawSpecimen()")
        hp0 = spec_hash(s)
        pg.check('#otsec [data-ot=swsh]')
        n4 = s.js(f"({GN})(S.text)")
        assert '.swsh' in n4, n4
        assert spec_hash(s) != hp0, 'swsh did not change the canvas'
        pg.check('#otsec [data-ot=salt]')
        assert '.salt' in s.js(f"({GN})(S.text)")
        # text face: ligatures on by default
        s.open_font('kvadra'); s.open_panes()
        pg.wait_for_selector('#otsec', state='visible', timeout=10000)
        s.js("S.text='office офис';drawSpecimen()")
        n5 = s.js(f"({GN})(S.text)")
        assert 'f_f_i' in n5.split(), n5
        pg.uncheck('#otsec [data-ot=liga]')
        assert 'f_f_i' not in s.js(f"({GN})(S.text)").split()
        pg.check('#otsec [data-ot=liga]')
        # a basic font: panel hidden
        s.open_font('ustav'); s.open_panes()
        vis = s.js("(()=>{const q=document.querySelector('#otsec');return !q||q.hidden||q.getBoundingClientRect().height===0})()")
        assert vis, 'OpenType panel visible for a basic font'
        assert not s.errs, f'page errors {s.errs[:3]}'
        return f'rows ok, canvas changes (smcp onum frac swsh), export features {len(feats)}'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('ot', ot_check)]))
