import sys
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
f=TTFont(sys.argv[1]);gs=f.getGlyphSet();cm=f.getBestCmap()
for ch in sys.argv[2]:
    n=cm.get(ord(ch))
    if not n: print(ch,'MISSING');continue
    bp=BoundsPen(gs);gs[n].draw(bp);print(ch,n,'adv',f['hmtx'][n][0],'bbox',bp.bounds, 'w',(bp.bounds[2]-bp.bounds[0]) if bp.bounds else 0)
