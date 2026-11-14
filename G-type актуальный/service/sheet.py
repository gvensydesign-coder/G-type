import sys
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
fn=sys.argv[1]; out=sys.argv[2]; size=int(sys.argv[3]) if len(sys.argv)>3 else 96
groups=sys.argv[4:] or ["ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz","АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐ","абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ","0123456789 .,:;!?\"'-–—()[]{}/\\|","@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…"]
font=ImageFont.truetype(fn,size)
W=2000; lines=[]
for g in groups:
    cur='';x=0
    for ch in g:
        a=font.getlength(ch)+size*0.04
        if x+a>W-40: lines.append(cur);cur='';x=0
        cur+=ch;x+=a
    lines.append(cur)
LH=int(size*1.65)
canvas=Image.new('RGB',(W,LH*len(lines)+40),(32,34,38)); d=ImageDraw.Draw(canvas)
for i,l in enumerate(lines):
    x=20
    for ch in l:
        d.text((x,20+i*LH),ch,font=font,fill=(255,240,0)); x+=font.getlength(ch)+size*0.04
canvas.save(out)
