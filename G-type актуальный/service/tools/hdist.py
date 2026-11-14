# usage: hdist.py a.ttf b.ttf chars  -> symmetric Hausdorff distance (units) between outlines (sampled)
import sys,numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
class P(BasePen):
    def __init__(s,gs):super().__init__(gs);s.pts=[]
    def _moveTo(s,p):s.pts.append(p);s.c=p
    def _lineTo(s,p):
        for i in range(1,9):u=i/8;s.pts.append((s.c[0]+(p[0]-s.c[0])*u,s.c[1]+(p[1]-s.c[1])*u))
        s.c=p
    def _qCurveToOne(s,a,p):
        for i in range(1,9):u=i/8;s.pts.append(((1-u)**2*s.c[0]+2*(1-u)*u*a[0]+u*u*p[0],(1-u)**2*s.c[1]+2*(1-u)*u*a[1]+u*u*p[1]))
        s.c=p
    def _curveToOne(s,a,b,p):
        for i in range(1,9):u=i/8;s.pts.append(tuple((1-u)**3*s.c[k]+3*(1-u)**2*u*a[k]+3*(1-u)*u*u*b[k]+u**3*p[k] for k in(0,1)))
        s.c=p
def pts(f,ch):
    gs=f.getGlyphSet();g=f.getBestCmap().get(ord(ch))
    if not g:return None
    p=P(gs);gs[g].draw(p);return np.array(p.pts) if p.pts else None
A=TTFont(sys.argv[1]);B=TTFont(sys.argv[2]);out=[]
for ch in sys.argv[3]:
    a=pts(A,ch);b=pts(B,ch)
    if a is None or b is None:continue
    d=lambda x,y:np.sqrt(((x[:,None,:]-y[None,:,:])**2).sum(2)).min(1)
    out.append((max(d(a,b).max(),d(b,a).max()),ch))
out.sort(reverse=True)
print('mean %.1f max %.1f'%(np.mean([x for x,_ in out]),out[0][0]),' '.join('%s:%.1f'%(c,x) for x,c in out[:10]))
