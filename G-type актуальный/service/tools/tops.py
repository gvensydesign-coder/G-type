import sys
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
def tops(ttf,chars):
    f=TTFont(ttf);gs=f.getGlyphSet();cm=f.getBestCmap();o={}
    for ch in chars:
        n=cm.get(ord(ch))
        if not n: continue
        bp=BoundsPen(gs);gs[n].draw(bp)
        if bp.bounds:o[ch]=bp.bounds
    return o
if __name__=='__main__':
    ttf=sys.argv[1]
    lc='abcdefghijklmnopqrstuvwxyzабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
    t=tops(ttf,lc);import statistics
    caps=tops(ttf,'ABCEHKMOPTXНОПТ')
    cm=statistics.median(v[3] for v in caps.values())
    print('cap median',cm)
    xh=[(c,round(v[3])) for c,v in t.items() if c not in 'bdfhklt' and c not in 'бдфtlк']
    print('lc median',statistics.median(v[3] for v in t.values()))
    print(' '.join(f'{c}{round(v[3])}' for c,v in t.items()))
