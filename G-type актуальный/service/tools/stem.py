import sys
from PIL import Image,ImageDraw,ImageFont
def runs(ttf,ch,ypos):
    f=ImageFont.truetype(ttf,1000)
    im=Image.new('L',(1800,1800),0);ImageDraw.Draw(im).text((300,1300),ch,font=f,fill=255,anchor='ls')
    y=1300-int(ypos);row=[im.getpixel((x,y))>127 for x in range(1800)]
    r=[];s=None
    for x,v in enumerate(row+[False]):
        if v and s is None:s=x
        if not v and s is not None:r.append((s-300,x-s));s=None
    return r
if __name__=='__main__':
    for ttf in sys.argv[2:]:
        print(ttf.split('/')[-1],' '.join(f"{ch}:{[w for _,w in runs(ttf,ch,float(sys.argv[1]) if ch in 'ΗНHI' else float(sys.argv[1])*0.6)]}" for ch in 'НIпиl'))
