import sys,numpy as np
sys.path.insert(0,__import__('os').path.dirname(__file__))
from PIL import Image,ImageDraw,ImageFont
# usage: iou_pair.py capH_units "A,B;C,D" size ttf...   (size = px of cap height approx)
def cov(p,s,sz):
    f=ImageFont.truetype(p,sz);adv=f.getlength(s)
    im=Image.new('L',(int(adv)+int(sz*0.6),int(sz*2)),0);ImageDraw.Draw(im).text((int(sz*0.3),int(sz*1.4)),s,font=f,fill=255,anchor='ls')
    return np.array(im).astype(float)/255
def iou(a,b):
    h=max(a.shape[0],b.shape[0]);w=max(a.shape[1],b.shape[1])
    A=np.zeros((h,w));B=np.zeros((h,w));A[:a.shape[0],:a.shape[1]]=a;B[:b.shape[0],:b.shape[1]]=b
    def sh(M):
        xs=np.nonzero(M.max(0)>0.3)[0];return np.roll(M,-xs.min(),axis=1) if len(xs) else M
    A=sh(A);B=sh(B);return np.minimum(A,B).sum()/max(1e-9,np.maximum(A,B).sum())
cap=float(sys.argv[1]);pairs=[p.split(',') for p in sys.argv[2].split(';')];cappx=[float(x) for x in sys.argv[3].split(',')]
for t in sys.argv[4:]:
    for cp in cappx:
        sz=round(cp*1000/cap)
        print(t.split('/')[-1],'cap%gpx'%cp,' '.join('%s/%s=%.3f'%(a,b,iou(cov(t,a,sz),cov(t,b,sz))) for a,b in pairs))
