import numpy as np,json
from common import *
from PIL import Image,ImageDraw,ImageFont
PAIRS=[('З','3'),('Э','З'),('Э','3'),('Ч','4'),('У','Ч'),('У','4'),('Е','Є'),('П','А'),('Л','7'),('Л','Λ'),('Ш','W'),('C','G'),('8','&'),('П','М'),('м','т'),('I','l'),('l','1'),('I','1'),('O','0'),('О','0'),('о','0'),('ив','иб'),('р','п'),('ь','ъ'),('Ь','Ъ'),('Б','6'),('б','6'),('ш','щ'),('Ш','Щ'),('ц','щ'),('Ц','Щ'),('и','й'),('п','л'),('н','и'),('в','8'),('S','5'),('Z','2'),('г','r'),('Ы','Ь'),('Я','R'),('l','|'),('I','|'),('и','u'),('п','n'),('т','m'),('д','g'),('Ё','Е'),('Й','И'),('З','Э'),('ч','4'),('ъ','Ъ'),('Ж','K'),('ы','ь')]
def cov(p,s,sz):
    f=ImageFont.truetype(p,sz);adv=f.getlength(s) if s else 0
    W=int(adv)+int(sz*0.6);H=int(sz*2)
    im=Image.new('L',(W,H),0);ImageDraw.Draw(im).text((int(sz*0.3),int(sz*1.4)),s,font=f,fill=255,anchor='ls')
    return np.array(im).astype(float)/255
def iou(a,b):
    h=max(a.shape[0],b.shape[0]);w=max(a.shape[1],b.shape[1])
    A=np.zeros((h,w));B=np.zeros((h,w));A[:a.shape[0],:a.shape[1]]=a;B[:b.shape[0],:b.shape[1]]=b
    # align by ink bbox left edge
    def shift(M):
        xs=np.nonzero(M.max(0)>0.3)[0]
        if len(xs)==0: return M
        return np.roll(M,-xs.min(),axis=1)
    A=shift(A);B=shift(B)
    return (np.minimum(A,B).sum()/max(1e-9,np.maximum(A,B).sum()))
if __name__=='__main__':
    allr={}
    for fid in FAM:
        p0=path(fid,'Regular')
        f=TTFont(p0);cm=f.getBestCmap()
        res={}
        for sty in ('Regular','Black','Italic'):
            p=path(fid,sty);
            # size so that cap height ~12px: capH/1000*size=12
            cap={'rotunda':660,'pixel':696}.get(fid,700);sz=round(12*1000/cap)
            r=[]
            for a,b in PAIRS:
                if any(ord(c) not in cm for c in a+b): continue
                r.append((a,b,round(iou(cov(p,a,sz),cov(p,b,sz)),2)))
            res[sty]=r
        allr[fid]=res
        print(fid,'sz',sz)
        for sty in res:
            print(' ',sty,[(a,b,v) for a,b,v in sorted(res[sty],key=lambda t:-t[2])[:12]])
    json.dump(allr,open('data/iou.json','w'))
