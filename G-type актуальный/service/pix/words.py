"""python3 pix/words.py out.png size font1.ttf [font2.ttf ...] -- the 3 acceptance phrases, one block per font"""
import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; size=int(sys.argv[2]); fonts=sys.argv[3:]
LINES=["ПОИГРАЙ СО МНОЙ","Съешь ещё этих мягких французских булок","Font over 1234567890"]
W=1800; LH=int(size*1.45)
im=Image.new('RGB',(W,30+len(fonts)*(len(LINES)*LH+24)),(250,250,248)); d=ImageDraw.Draw(im); y=16
for fn in fonts:
    f=ImageFont.truetype(fn,size)
    for l in LINES: d.text((20,y),l,font=f,fill=(16,16,16)); y+=LH
    d.line((0,y+8,W,y+8),fill=(200,0,0)); y+=24
im.save(out)
