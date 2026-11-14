# usage: python3 loclcheck.py <font.ttf>
# Finds GSUB feature 'locl' and reports which script/LangSys tags reference it.
# Passes when BGR and SRB LangSys both reference a locl feature that has at least one lookup with substitutions.
import sys
from fontTools.ttLib import TTFont

f = TTFont(sys.argv[1])
gsub = f['GSUB'].table
feats = gsub.FeatureList.FeatureRecord
locl_idx = [i for i, fr in enumerate(feats) if fr.FeatureTag == 'locl']
print('locl feature records', len(locl_idx))
if not locl_idx:
    print('no locl feature'); sys.exit(1)
refs = set()
for sr in gsub.ScriptList.ScriptRecord:
    langsys = [('DFLT', sr.Script.DefaultLangSys)] if sr.Script.DefaultLangSys else []
    langsys += [(lr.LangSysTag, lr.LangSys) for lr in sr.Script.LangSysRecord]
    for tag, ls in langsys:
        if any(i in locl_idx for i in ls.FeatureIndex):
            refs.add((sr.ScriptTag, tag))
print('locl langsys', sorted(refs))
lookups = set()
for i in locl_idx:
    lookups.update(feats[i].Feature.LookupListIndex)
nsub = sum(len(gsub.LookupList.Lookup[l].SubTable) for l in lookups)
print('locl lookups', sorted(lookups), 'subtables', nsub)
tags = {t for _, t in refs}
ok = 'BGR ' in tags and 'SRB ' in tags and nsub > 0
print('BGR' if 'BGR ' in tags else 'no BGR', 'SRB' if 'SRB ' in tags else 'no SRB', 'OK' if ok else 'FAIL')
sys.exit(0 if ok else 1)
