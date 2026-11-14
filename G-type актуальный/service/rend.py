import sys
from PIL import Image,ImageDraw,ImageFont
# usage: rend.py out.png size text ttf1 [ttf2 ...]  -> stacked rows (one per ttf), label left
out,size,txt=sys.argv[1],int(sys.argv[2]),sys.argv[3]
ttfs=sys.argv[4:]
rows=[]
for t in ttfs:
    f=ImageFont.truetype(t,size,layout_engine=ImageFont.Layout.RAQM)
    bb=f.getbbox(txt)
    im=Image.new('RGB',(bb[2]+60,int(size*1.5)),(250,250,250));d=ImageDraw.Draw(im)
    d.text((20,int(size*0.15)),txt,font=f,fill=(10,10,10))
    rows.append(im)
W=max(r.width for r in rows);H=sum(r.height for r in rows)
o=Image.new('RGB',(W,H),(250,250,250));y=0
for r in rows:o.paste(r,(0,y));y+=r.height
o.save(out)
