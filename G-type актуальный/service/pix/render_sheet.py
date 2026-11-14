"""python3 pix/render_sheet.py out.png size font1.ttf [font2.ttf ...] -- text lines are fixed; one block per font"""
import sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; size=int(sys.argv[2]); fonts=sys.argv[3:]
LINES=["ПОИГРАЙ СО МНОЙ","Съешь ещё этих мягких французских булок","Font over 1234567890 AaBbEeGgRrSs","АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ","абвгдеёжзийклмнопрстуфхцчшщъыьэюя","ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz","0123456789 .,:;!?\"'-–—()[]{}/&@#%€₽№«»"]
W=1800
LH=int(size*1.5)
H=40+len(fonts)*(len(LINES)*LH+30)
im=Image.new('RGB',(W,H),(250,250,248)); d=ImageDraw.Draw(im)
y=20
for fn in fonts:
    f=ImageFont.truetype(fn,size)
    for l in LINES:
        d.text((20,y),l,font=f,fill=(16,16,16)); y+=LH
    d.line((0,y+8,W,y+8),fill=(200,0,0)); y+=30
im.save(out)
