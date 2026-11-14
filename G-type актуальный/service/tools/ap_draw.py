import sys,json
from PIL import Image,ImageDraw
d=json.load(open(sys.argv[1]));out=sys.argv[2];sc=float(sys.argv[3]) if len(sys.argv)>3 else 0.8
xs=[p[0] for c in d for p in c['pts']];ys=[p[1] for c in d for p in c['pts']]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
W=int((x1-x0)*sc)+40;H=int((y1-y0)*sc)+40
im=Image.new('RGB',(W,H),(255,255,255));dr=ImageDraw.Draw(im)
cols=[(230,120,120),(120,160,230),(120,200,140),(230,200,100),(180,140,220)]
for i,c in enumerate(d):
    pts=[((p[0]-x0)*sc+20,(y1-p[1])*sc+20) for p in c['pts']]
    dr.polygon(pts,fill=(255,255,255) if c['hole'] else cols[i%5],outline=(0,0,0))
im.save(out)
