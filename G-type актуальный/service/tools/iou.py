# usage: iou.py capH ttf [ttf...] -- pairs ; prints IoU at ~12px cap (and 24) for the given pairs
import sys,numpy as np
from PIL import Image,ImageDraw,ImageFont
def cov(p,s,sz):
    f=ImageFont.truetype(p,sz);adv=f.getlength(s)
    W=int(adv)+int(sz*0.6);H=int(sz*2)
    im=Image.new('L',(W,H),0);ImageDraw.Draw(im).text((int(sz*0.3),int(sz*1.4)),s,font=f,fill=255,anchor='ls')
    return np.array(im).astype(float)/255
def iou(a,b):
    h=max(a.shape[0],b.shape[0]);w=max(a.shape[1],b.shape[1])
    A=np.zeros((h,w));B=np.zeros((h,w));A[:a.shape[0],:a.shape[1]]=a;B[:b.shape[0],:b.shape[1]]=b
    def shift(M):
        xs=np.nonzero(M.max(0)>0.3)[0]
        return M if len(xs)==0 else np.roll(M,-xs.min(),axis=1)
    A=shift(A);B=shift(B)
    return np.minimum(A,B).sum()/max(1e-9,np.maximum(A,B).sum())
def pairs_iou(ttf,pairs,cap=700,caps=(12,24)):
    out={}
    for a,b in pairs:
        out[(a,b)]=[round(iou(cov(ttf,a,round(c*1000/cap)),cov(ttf,b,round(c*1000/cap))),2) for c in caps]
    return out
if __name__=='__main__':
    cap=int(sys.argv[1]);pairs=[tuple(x.split(',')) for x in sys.argv[2].split()];
    for ttf in sys.argv[3:]:
        r=pairs_iou(ttf,pairs,cap)
        print(ttf.split('/')[-1],' '.join(f"{a}{b}:{v[0]}/{v[1]}" for (a,b),v in r.items()))
