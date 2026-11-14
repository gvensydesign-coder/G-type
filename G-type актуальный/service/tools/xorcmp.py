"""usage: xorcmp.py old.ttf new.ttf [limit]  -> per-glyph XOR/union at 200 px (all cmap glyphs of old); prints mean, max, count > 0.5 %, worst glyphs"""
import sys,numpy as np
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
def run(a,b,sz=200):
    cm=TTFont(a).getBestCmap();cn=TTFont(b).getBestCmap()
    fa=ImageFont.truetype(a,sz);fb=ImageFont.truetype(b,sz)
    res=[]
    for u in sorted(cm):
        if u<0x21 or u not in cn:continue
        ch=chr(u)
        ims=[]
        for f in (fa,fb):
            im=Image.new('L',(sz*3,sz*3),0);ImageDraw.Draw(im).text((sz//2,sz*2),ch,font=f,fill=255,anchor='ls');ims.append(np.array(im)>127)
        un=(ims[0]|ims[1]).sum()
        if un:res.append(((ims[0]^ims[1]).sum()/un,ch))
    return res
if __name__=='__main__':
    r=run(sys.argv[1],sys.argv[2]);r.sort(reverse=True)
    x=np.array([v for v,_ in r])
    print('glyphs %d mean %.4f max %.4f  >0.5%%: %d  >1%%: %d'%(len(r),x.mean(),x.max(),(x>0.005).sum(),(x>0.01).sum()),' '.join('%s:%.3f'%(c,v) for v,c in r[:8]))
