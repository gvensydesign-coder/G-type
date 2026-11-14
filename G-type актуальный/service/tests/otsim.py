"""Minimal GSUB shaper on fontTools tables (no HarfBuzz in this environment): single (1), ligature (4), chain context fmt 3 (6), reverse chain (8), extension (7).
shape(font, text, features, script='latn', lang=None) -> list of glyph names. Lookups of the enabled features are applied in lookup-index order."""
from fontTools.ttLib import TTFont

def _sub(lk):
    for st in lk.SubTable:
        yield st.ExtSubTable if lk.LookupType == 7 else st

def _ltype(lk):
    return lk.SubTable[0].ExtensionLookupType if lk.LookupType == 7 else lk.LookupType

def lookups_for(font, features, script='latn', lang=None):
    g = font['GSUB'].table
    sr = {r.ScriptTag: r.Script for r in g.ScriptList.ScriptRecord}
    sc = sr.get(script) or sr.get('DFLT')
    ls = sc.DefaultLangSys
    if lang and sc.LangSysRecord:
        for r in sc.LangSysRecord:
            if r.LangSysTag == lang: ls = r.LangSys
    idx = set()
    for fi in ls.FeatureIndex:
        fr = g.FeatureList.FeatureRecord[fi]
        if fr.FeatureTag in features: idx.update(fr.Feature.LookupListIndex)
    return sorted(idx)

def _cov(c):
    return set(c.glyphs)

def _apply(font, li, seq, depth=0):
    g = font['GSUB'].table
    lk = g.LookupList.Lookup[li]
    t = _ltype(lk)
    seq = list(seq)
    if t == 8:
        for st in _sub(lk):
            cov = st.Coverage.glyphs
            for i in range(len(seq) - 1, -1, -1):
                if seq[i] not in cov: continue
                bt, la = st.BacktrackCoverage, st.LookAheadCoverage
                if i - len(bt) < 0 or i + len(la) >= len(seq) + 0 and i + len(la) > len(seq) - 1: 
                    if i + len(la) > len(seq) - 1: continue
                    if i - len(bt) < 0: continue
                if all(seq[i - 1 - k] in _cov(bt[k]) for k in range(len(bt))) and all(seq[i + 1 + k] in _cov(la[k]) for k in range(len(la))):
                    seq[i] = st.Substitute[cov.index(seq[i])]
        return seq
    i = 0
    while i < len(seq):
        done = False
        for st in _sub(lk):
            if t == 1:
                m = getattr(st, 'mapping', None)
                if m and seq[i] in m:
                    seq[i] = m[seq[i]]; done = True; break
            elif t == 4:
                for lig in st.ligatures.get(seq[i], []):
                    n = len(lig.Component)
                    if seq[i + 1:i + 1 + n] == list(lig.Component):
                        seq[i:i + 1 + n] = [lig.LigGlyph]; done = True; break
                if done: break
            elif t == 6 and st.Format == 3:
                bt, ip, la = st.BacktrackCoverage, st.InputCoverage, st.LookAheadCoverage
                if i - len(bt) < 0 or i + len(ip) + len(la) > len(seq): continue
                if all(seq[i - 1 - k] in _cov(bt[k]) for k in range(len(bt))) and all(seq[i + k] in _cov(ip[k]) for k in range(len(ip))) and all(seq[i + len(ip) + k] in _cov(la[k]) for k in range(len(la))):
                    for rec in st.SubstLookupRecord:
                        sub = _apply(font, rec.LookupListIndex, [seq[i + rec.SequenceIndex]], depth + 1)
                        seq[i + rec.SequenceIndex] = sub[0]
                    done = True; break
        i += 1
    return seq

def shape(font, text, features, script='latn', lang=None):
    cm = font.getBestCmap()
    seq = [cm.get(ord(c), '.notdef') for c in text]
    for li in lookups_for(font, set(features), script, lang):
        seq = _apply(font, li, seq)
    return seq

def has_feature(font, tag):
    return any(r.FeatureTag == tag for r in font['GSUB'].table.FeatureList.FeatureRecord)
