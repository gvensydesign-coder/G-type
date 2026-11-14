import json,sys
from PIL import Image,ImageDraw
d=json.load(open(sys.argv[1]));out=sys.argv[2];S=int(sys.argv[3]) if len(sys.argv)>3 else 6
res=d['res']
D=int(res*0.27)+2
rowh=(res+D+8)*S+10
W=0
for line in d['sheet']:
    w=0
    for g in line:
        if g['cells']:
            xs=[c[0] for c in g['cells']];w+=(max(xs)-min(xs)+2+(0))*S
        else: w+=4*S
    W=max(W,w)
im=Image.new('RGB',(W+20,rowh*len(d['sheet'])+10),(250,250,250));dr=ImageDraw.Draw(im)
for li,line in enumerate(d['sheet']):
    x=10;base=li*rowh+(res+8)*S+5
    for g in line:
        if g['cells']:
            xs=[c[0] for c in g['cells']];mn=min(xs)
            for x0,y0,v in g['cells']:
                px=x+(x0-mn)*S;py=base-(y0+1)*S
                dr.rectangle([px,py,px+S-1,py+S-1],fill=(0,0,0) if v!=3 else (60,60,200))
            x+=(max(xs)-mn+2)*S
        else: x+=4*S
    dr.line([10,base,W+10,base],fill=(255,150,150))
im.save(out)
