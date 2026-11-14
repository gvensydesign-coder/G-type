import sys
from PIL import Image,ImageDraw,ImageFont
ttf,out,txt,size=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4])
f=ImageFont.truetype(ttf,size,layout_engine=ImageFont.Layout.RAQM)
lines=txt.split('|')
W=1800;H=int(len(lines)*size*1.35)+40
im=Image.new('RGB',(W,H),(32,33,36));d=ImageDraw.Draw(im)
for i,l in enumerate(lines):d.text((20,20+i*size*1.35),l,font=f,fill=(255,238,0))
im.save(out)
