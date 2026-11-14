# usage: vfxor.py <vf.ttf> <static.ttf> <wght> [chars]  -> per-glyph XOR at 200 px
import sys,numpy as np
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
vf,st,w=sys.argv[1],sys.argv[2],float(sys.argv[3])
inst=instancer.instantiateVariableFont(TTFont(vf),{'wght':w},inplace=False);inst.save('/tmp/_vx.ttf')
cm=TTFont(st).getBestCmap()
chars=sys.argv[4] if len(sys.argv)>4 else ''.join(chr(c) for c in sorted(cm) if 0x21<=c<=0x44f)
def r(fn,ch,sz=200):
    f=ImageFont.truetype(fn,sz);im=Image.new('L',(sz*2,sz*2),0);ImageDraw.Draw(im).text((sz//2,sz*3//2),ch,font=f,fill=255,anchor='ls');return np.array(im)>127
res=[]
for ch in chars:
    a,b=r('/tmp/_vx.ttf',ch),r(st,ch);u=(a|b).sum()
    if u: res.append(((a^b).sum()/u,ch))
res.sort(reverse=True)
print('mean %.3f  max %.3f  >0.03: %d/%d'%(np.mean([x for x,_ in res]),res[0][0],sum(1 for x,_ in res if x>0.03),len(res)))
print(' '.join('%s:%.2f'%(c,x) for x,c in res[:25]))
