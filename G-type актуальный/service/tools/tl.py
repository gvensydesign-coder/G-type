import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from skimage.draw import polygon as skpoly
import cv2
R=''
FAM={'modul':'ModulGrid','ryvok':'RyvokDisplay','kaplya':'KaplyaDrop','applik':'ApplikatsiyaPaper','stsepka':'StsepkaDisplay','stolb':'StolbDisplay','nit':'Nit'}
STY=['Light','Regular','Bold','Black','LightItalic','Italic','BoldItalic','BlackItalic']
def path(k,s): return f'{R}fam/{FAM[k]}-{s}.ttf'
class FP(BasePen):
    def __init__(s,gs,n=8):
        super().__init__(gs); s.cs=[]; s.cur=None; s.n=n; s.nodes=[]; s.nn=0
    def _moveTo(s,p): s.cur=[p]; s.start=p; s.last=p; s.nn+=1
    def _lineTo(s,p): s.cur.append(p); s.last=p; s.nn+=1
    def _curveToOne(s,a,b,c):
        p0=s.last
        for i in range(1,s.n+1):
            t=i/s.n; m=1-t
            s.cur.append((m**3*p0[0]+3*m*m*t*a[0]+3*m*t*t*b[0]+t**3*c[0], m**3*p0[1]+3*m*m*t*a[1]+3*m*t*t*b[1]+t**3*c[1]))
        s.last=c; s.nn+=1
    def _qCurveToOne(s,a,b):
        p0=s.last
        for i in range(1,s.n+1):
            t=i/s.n; m=1-t
            s.cur.append((m*m*p0[0]+2*m*t*a[0]+t*t*b[0], m*m*p0[1]+2*m*t*a[1]+t*t*b[1]))
        s.last=b; s.nn+=1
    def _closePath(s):
        c=s.cur
        if len(c)>1 and c[0]==c[-1]: c=c[:-1]
        s.cs.append(np.array(c,float)); s.cur=None
    _endPath=_closePath
def contours(gs,g,n=8):
    p=FP(gs,n); gs[g].draw(p); return p.cs,p.nn
def sarea(c):
    x=c[:,0];y=c[:,1]; return 0.5*np.sum(x*np.roll(y,-1)-np.roll(x,-1)*y)
def segs(c): return np.stack([c,np.roll(c,-1,axis=0)],1)
def seg_x(A,B,skip_adj=False):
    # proper intersections between segment sets A (n,2,2) and B (m,2,2); returns bool matrix
    a0=A[:,0][:,None];a1=A[:,1][:,None];b0=B[:,0][None];b1=B[:,1][None]
    def cr(o,a,b): return (a[...,0]-o[...,0])*(b[...,1]-o[...,1])-(a[...,1]-o[...,1])*(b[...,0]-o[...,0])
    d1=cr(b0,b1,a0);d2=cr(b0,b1,a1);d3=cr(a0,a1,b0);d4=cr(a0,a1,b1)
    e=1e-6
    return (d1*d2< -e)&(d3*d4< -e)
SC=0.4; X0=-400; Y0=-500; HH=1300
def raster(cs,adv):
    W=int((adv+900)*SC)+2; H=int(HH*SC*1.3)+2
    cnt=np.zeros((H,W),np.int16)
    for c in cs:
        s=1 if sarea(c)<0 else -1   # outer (clockwise, negative) = +1
        xs=(c[:,0]-X0)*SC; ys=(Y0+1.0*HH*1.3 - c[:,1])*SC  # flip y: top = Y0+HH*1.3
        rr,cc=skpoly(ys,xs,(H,W)); m=np.zeros((H,W),np.int16); m[rr,cc]=1
        cnt+=m*s
    return (cnt!=0).astype(np.uint8)
def analyse_raster(img):
    n,lab,st,cen=cv2.connectedComponentsWithStats(img,connectivity=8)
    comps=[(int(st[i,4]/SC/SC),tuple(int(v/SC) for v in st[i,:4]),i) for i in range(1,n)]
    inv=1-img
    n2,lab2,st2,cen2=cv2.connectedComponentsWithStats(inv,connectivity=4)
    # background component touching border = outside
    border=set(np.unique(np.concatenate([lab2[0],lab2[-1],lab2[:,0],lab2[:,-1]])))
    holes=[(int(st2[i,4]/SC/SC),i) for i in range(1,n2) if i not in border]
    return comps,holes,lab,lab2
