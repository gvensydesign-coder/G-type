import sys,os
sys.path.insert(0,os.path.dirname(__file__))
from tl import *
import numpy as np
def info(ttf,chars):
    t=TTFont(ttf);gs=t.getGlyphSet();cm=t.getBestCmap();hm=t['hmtx'];out={}
    for ch in chars:
        g=cm.get(ord(ch))
        if not g: out[ch]=None;continue
        cs,nn=contours(gs,g,8)
        if not cs: out[ch]={'nc':0};continue
        ars=[round(sarea(c)) for c in cs]
        S=[segs(c) for c in cs];selfx=0;crossx=0
        for i,a in enumerate(S):
            if len(a)>3: selfx+=int(np.triu(seg_x(a,a),1).sum())
            for j in range(i+1,len(S)): crossx+=int(seg_x(a,S[j]).sum())
        comps,holes,_,_=analyse_raster(raster(cs,hm[g][0]))
        out[ch]={'nc':len(cs),'nodes':nn,'ar':ars,'selfx':selfx,'crossx':crossx,'comps':[c[0] for c in comps],'holes':[h[0] for h in holes]}
    return out
if __name__=='__main__':
    ttf=sys.argv[1];chars=sys.argv[2]
    r=info(ttf,chars)
    for ch,v in r.items(): print(ch,v)
