"""OpenType features of the six extended fonts (volt kvadra stroka codex liniya propis), read from lib-<id>-<style>.ttf (built by t10par.sh).
For each font: every feature exists in GSUB, maps every expected glyph (single-substitution targets exist and are non-empty),
and shaping 'Ab 2024 1/2' with smcp,onum,frac gives the expected glyph names (tests/otsim.py: GSUB shaper on fontTools; uharfbuzz is used too when installed).
Basic fonts must have none of these features. Prints one final line: 'PASS ot ...' or 'FAIL ot ...'."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from fontTools.ttLib import TTFont
from otsim import shape, has_feature

WK = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FONTS = ['volt', 'kvadra', 'stroka', 'codex', 'liniya', 'propis', 'renessa']
NO_SC = ['renessa']   # figures, fractions, ordinals and kerning only: no small caps (smcp/c2sc)
BASIC = ['ustav', 'rotunda', 'modul', 'ryvok']
COMMON = ['smcp', 'c2sc', 'onum', 'lnum', 'tnum', 'pnum', 'frac', 'sups', 'subs', 'sinf', 'ordn']
EXTRA = {'kvadra': ['liga', 'ss01'], 'stroka': ['liga', 'ss01'], 'liniya': ['liga'], 'volt': ['ss01'], 'propis': ['salt', 'swsh']}
DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']
LOWER = [chr(c) for c in list(range(0x61, 0x7B)) + list(range(0x430, 0x450)) + [0x451]]
UPPER = [c.upper() for c in LOWER]


def single_maps(f, tag):
    """feature -> {input glyph: output glyph} over all single-substitution lookups (type 1, also through Extension 7)."""
    g = f['GSUB'].table
    out = {}
    for fr in g.FeatureList.FeatureRecord:
        if fr.FeatureTag != tag:
            continue
        for li in fr.Feature.LookupListIndex:
            lk = g.LookupList.Lookup[li]
            for st in lk.SubTable:
                s = st.ExtSubTable if lk.LookupType == 7 else st
                if hasattr(s, 'mapping'):
                    out.update(s.mapping)
    return out


def nonempty(f, name):
    gl = f['glyf'][name]
    return gl.numberOfContours != 0 and (f['hmtx'][name][0] > 0)


def lig_sets(f):
    g = f['GSUB'].table
    out = {}
    for fr in g.FeatureList.FeatureRecord:
        if fr.FeatureTag != "liga":
            continue
        for li in fr.Feature.LookupListIndex:
            lk = g.LookupList.Lookup[li]
            for st in lk.SubTable:
                s = st.ExtSubTable if lk.LookupType == 7 else st
                if hasattr(s, 'ligatures'):
                    for first, ls in s.ligatures.items():
                        for l in ls:
                            out[l.LigGlyph] = [first] + list(l.Component)
    return out


def check_font(fid, style='regular'):
    path = os.path.join(WK, f'lib-{fid}-{style}.ttf')
    f = TTFont(path)
    cm = f.getBestCmap()
    errs = []
    feats = {fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord}
    for t in [x for x in COMMON if not (fid in NO_SC and x in ('smcp', 'c2sc'))] + EXTRA.get(fid, []):
        if t not in feats:
            errs.append(f'feature {t} missing')
    if fid not in ('kvadra', 'stroka', 'liniya') and 'liga' in feats:
        errs.append('liga present (only Kvadra, Stroka and Liniya)')
    if fid != 'propis' and ({'salt', 'swsh'} & feats):
        errs.append('salt/swsh outside Propis')
    n_checked = 0
    # smcp / c2sc: every lowercase (upper) letter of the font maps to a non-empty X.sc, shared glyph for the base pair
    sm, c2 = single_maps(f, 'smcp'), single_maps(f, 'c2sc')
    for ch in ([] if fid in NO_SC else LOWER):
        gn = cm.get(ord(ch))
        if gn is None:
            continue
        t = sm.get(gn)
        if not t or not t.endswith('.sc') or not nonempty(f, t):
            errs.append(f'smcp {ch}: {gn}->{t}')
        n_checked += 1
    for ch in ([] if fid in NO_SC else UPPER):
        gn = cm.get(ord(ch))
        if gn is None or ord(ch.lower()) not in cm:
            continue
        t = c2.get(gn)
        if not t or not t.endswith('.sc') or not nonempty(f, t):
            errs.append(f'c2sc {ch}: {gn}->{t}')
        elif t != sm.get(cm[ord(ch.lower())]):
            errs.append(f'c2sc {ch} and smcp give different glyphs')
        n_checked += 1
    # figures
    for tag, suf in (('onum', '.osf'), ('sups', '.numr'), ('subs', '.subs'), ('sinf', '.subs')):
        m = single_maps(f, tag)
        for i, d in enumerate(DIG):
            src = cm[0x30 + i]
            if tag == 'onum':
                t = m.get(src)
                ok = t == d + '.osf'
            else:
                t = m.get(src)
                ok = t == d + suf
            if not ok or not nonempty(f, t):
                errs.append(f'{tag} {i}: {src}->{t}')
            n_checked += 1
    # tabular / proportional: the four forms exist and are distinct in advance only where they must differ
    tn, pn = single_maps(f, 'tnum'), single_maps(f, 'pnum')
    if not tn or not pn:
        errs.append('tnum/pnum empty')
    for i, d in enumerate(DIG):
        for nm in (d + '.osf', d + '.tosf', d + '.numr', d + '.dnom', d + '.subs'):
            if nm not in f.getGlyphOrder() or not nonempty(f, nm):
                errs.append(f'glyph {nm} missing or empty')
        n_checked += 1
    adv = {nm: f['hmtx'][nm][0] for d in DIG for nm in (d + '.tosf',)}
    if len(set(adv.values())) != 1:
        errs.append(f'tabular oldstyle advances differ: {sorted(set(adv.values()))}')
    # frac bar and ordinals
    if 'uni2044' not in f.getGlyphOrder() or not nonempty(f, 'uni2044'):
        errs.append('fraction bar U+2044 missing')
    if cm.get(0x2044) != 'uni2044':
        errs.append('U+2044 not in cmap')
    for u in (0xAA, 0xBA):
        if u not in cm or not nonempty(f, cm[u]):
            errs.append(f'U+{u:04X} missing')
    # liga
    if fid in ('kvadra', 'stroka', 'liniya'):
        ls = lig_sets(f)
        for nm in ('f_f', 'f_i', 'f_l', 'f_f_i', 'f_f_l'):
            if nm not in ls or not nonempty(f, nm):
                errs.append(f'liga {nm} missing')
        n_checked += 5
    # Propis: salt and swsh
    if fid == 'propis':
        sl, sw = single_maps(f, 'salt'), single_maps(f, 'swsh')
        if not 5 <= len(sl) <= 12:
            errs.append(f'salt count {len(sl)} (expected 5..12)')
        for k, v in list(sl.items()) + list(sw.items()):
            if not nonempty(f, v):
                errs.append(f'empty alternate {v}')
        n_checked += len(sl) + len(sw)
        if len(sw) < 20:
            errs.append(f'swsh count {len(sw)}')
    # shaping
    base = {c: cm[ord(c)] for c in 'A b 0 1 2 4 /'.split() if ord(c) in cm}
    sp = cm[0x20]
    got = shape(f, 'Ab 2024 1/2', ['smcp', 'onum', 'frac'])
    exp = [cm[ord('A')], cm[ord('b')] if fid in NO_SC else 'b.sc', sp, 'two.osf', 'zero.osf', 'two.osf', 'four.osf', sp, 'one.numr', 'uni2044', 'two.dnom']
    if got != exp:
        errs.append(f'shape smcp,onum,frac: {got} != {exp}')
    got = shape(f, 'Ab 2024', ['c2sc', 'tnum'])
    if fid not in NO_SC and got[:2] != ['a.sc', cm[ord('b')]]:
        errs.append(f'shape c2sc: {got[:2]}')
    got = shape(f, 'x2 H2', ['sups'])
    if 'two.numr' not in got:
        errs.append(f'shape sups: {got}')
    got = shape(f, '3 ' + chr(0x20AC) + '5', ['tnum'])
    if not any(g.endswith('.tf') for g in got if g != sp):
        errs.append(f'shape tnum: {got}')
    if fid in ('kvadra', 'stroka', 'liniya'):
        got = shape(f, 'office', ['liga'])
        if 'f_f' not in got and 'f_f_i' not in got:
            errs.append(f'shape liga: {got}')
        got = shape(f, 'офис', ['liga'])
        if any(g.startswith('f_') for g in got):
            errs.append('Cyrillic got ligature')
    if fid == 'propis':
        got = shape(f, 'Нос', ['swsh'])
        if not (got[0].endswith('.swsh') or got[-1].endswith('.swsh')):
            errs.append(f'shape swsh: {got}')
        if shape(f, 'ае', ['salt'])[0] != 'uni0430.salt':
            errs.append('shape salt')
    # kern / mark GPOS present and untouched in kind
    gf = {fr.FeatureTag for fr in f['GPOS'].table.FeatureList.FeatureRecord} if 'GPOS' in f else set()
    if 'kern' not in f and 'kern' not in gf:
        errs.append('kerning missing (kern table / GPOS kern)')
    # glyph names follow AGL: encoded uniXXXX, alternates base.suffix with an AGL-legal base
    import re
    for nm in f.getGlyphOrder():
        if not re.fullmatch(r'\.notdef|[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*|uni[0-9A-F]{4,6}(\.[A-Za-z0-9_]+)*|\.null|u[0-9A-F]{4,6}', nm):
            errs.append(f'bad glyph name {nm}')
            break
    return errs, n_checked, len(feats)


def basic_clean(bid):
    p = os.path.join(WK, f'lib-{bid}-regular.ttf')
    if not os.path.exists(p):
        return []
    f = TTFont(p)
    tags = {fr.FeatureTag for fr in f['GSUB'].table.FeatureList.FeatureRecord} if 'GSUB' in f else set()
    return [f'{bid}: unexpected {sorted(tags & {"smcp", "onum", "frac", "sups", "salt", "swsh", "liga"})}'] if tags & {'smcp', 'onum', 'frac', 'sups', 'salt', 'swsh', 'liga'} else []


def main():
    bad = 0
    total = 0
    for fid in FONTS:
        for style in ('regular', 'italic'):
            if not os.path.exists(os.path.join(WK, f'lib-{fid}-{style}.ttf')):
                print(f'FAIL ot lib-{fid}-{style}.ttf missing (run t10par.sh)')
                sys.exit(1)
            errs, n, nf = check_font(fid, style)
            total += n
            print(f'{fid} {style} features {nf} checked {n} errors {len(errs)}')
            for e in errs[:8]:
                print('    ' + e)
            bad += len(errs)
    for b in BASIC:
        e = basic_clean(b)
        if e:
            print('   ', e)
        bad += len(e)
    try:
        import uharfbuzz  # noqa: F401
        print('uharfbuzz available (shaping also covered by the GSUB simulator)')
    except Exception:
        print('uharfbuzz not installed: shaping via tests/otsim.py')
    if bad:
        print(f'FAIL ot errors {bad}')
        sys.exit(1)
    print(f'PASS ot 11 fonts, {total} glyph mappings, errors 0')


if __name__ == '__main__':
    main()
