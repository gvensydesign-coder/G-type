import sys
from PIL import Image,ImageDraw,ImageFont
BASIC=["ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz","АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ","абвгдеёжзийклмнопрстуфхцчшщъыьэюя","0123456789 .,:;!?«»\"'-–—()/&№"]
def full(ttf,out,size=96):
    font=ImageFont.truetype(ttf,size,layout_engine=ImageFont.Layout.RAQM)
    W=2200;lines=[]
    for g in BASIC:
        cur='';x=0
        for ch in g:
            a=font.getlength(ch)+size*0.06
            if x+a>W-60: lines.append(cur);cur='';x=0
            cur+=ch;x+=a
        lines.append(cur)
    LH=int(size*1.6);im=Image.new('RGB',(W,LH*len(lines)+40),(32,34,38));d=ImageDraw.Draw(im)
    for i,l in enumerate(lines):
        x=30
        for ch in l:
            d.text((x,20+i*LH),ch,font=font,fill=(255,238,0));x+=font.getlength(ch)+size*0.06
    im.save(out)
def text(ttf,out,lines,size):
    font=ImageFont.truetype(ttf,size,layout_engine=ImageFont.Layout.RAQM)
    W=max(int(font.getlength(l)) for l in lines)+80;LH=int(size*1.45)
    im=Image.new('RGB',(W,LH*len(lines)+40),(32,34,38));d=ImageDraw.Draw(im)
    for i,l in enumerate(lines):d.text((40,20+i*LH),l,font=font,fill=(255,238,0))
    im.save(out)
if __name__=='__main__':
    d=sys.argv[1]
    for sty,f in [('regular','RotundaLibros-Regular.ttf'),('italic','RotundaLibros-Italic.ttf'),('light','RotundaLibros-Light.ttf'),('bold','RotundaLibros-Bold.ttf'),('black','RotundaLibros-Black.ttf')]:
        full(d+'/'+f,'sheets/rotunda_set_%s.png'%sty)
        text(d+'/'+f,'sheets/rotunda_text_%s.png'%sty,["Letra de Pancilla para Libros","abcdefghijklmnopqrstuvwxyz","Ротунда для книг"],150)
