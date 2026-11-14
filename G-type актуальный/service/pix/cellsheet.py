import sys,json
from PIL import Image, ImageDraw
src,out=sys.argv[1],sys.argv[2]; c=int(sys.argv[3]) if len(sys.argv)>3 else 6
d=json.load(open(src)); res=d['res']; D=max(3,round(res*.27))
W=1800; lines=[]
for row in d['rows']:
    cur=[];x=10
    for g in row:
        cs=g['cells']
        if g.get('sp'): w=max(2,round(res*.35))
        elif not cs: w=res//2
        else:
            x0=min(a for a,b in cs);x1=max(a for a,b in cs);w=x1-x0+1+1
        if x+w*c>W-10: lines.append(cur);cur=[];x=10
        cur.append((g,w));x+=w*c+c
    lines.append(cur)
LH=(res+D+6)*c
im=Image.new('RGB',(W,LH*len(lines)+20),(250,250,248));dr=ImageDraw.Draw(im)
for i,l in enumerate(lines):
    x=10;base=i*LH+10+(res+3)*c
    for g,w in l:
        cs=g['cells'] or []
        if cs:
            x0=min(a for a,b in cs)
            for a,b in cs:
                X=x+(a-x0)*c;Y=base-(b+1)*c
                dr.rectangle((X,Y,X+c-1,Y+c-1),fill=(16,16,16))
        x+=w*c+c
im.save(out)
