"""python3 tools/nz_view.py out.png 'chars' '{"nlw":5}' [raw] [px_cap]  -> contact sheet of product glyphs (black on white, holes white)"""
import sys,json,subprocess,os
from PIL import Image,ImageDraw
out,chars=sys.argv[1],sys.argv[2];ov=sys.argv[3] if len(sys.argv)>3 else '{}';raw=len(sys.argv)>4 and sys.argv[4]=='raw'
cap=int(sys.argv[5]) if len(sys.argv)>5 else 200
here=os.path.dirname(os.path.abspath(__file__))
d=json.loads(subprocess.check_output(['node',here+'/nz_dump.js',chars,ov]+(['raw'] if raw else [])))
sc=cap/740;cw=int(cap*0.95);ch_=int(cap*1.55);cols=max(1,min(len(chars),1800//cw))
rows=(len(chars)+cols-1)//cols
img=Image.new('RGB',(cols*cw,rows*ch_),'white');dr=ImageDraw.Draw(img)
for i,c in enumerate(chars):
    g=d[c];ox=(i%cols)*cw+10;oy=(i//cols)*ch_+int(cap*1.15)
    cs=sorted(g['cs'],key=lambda k:-abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(k['pts'],k['pts'][1:]+k['pts'][:1]))))
    for k in cs:
        pts=[(ox+x*sc,oy-y*sc) for x,y in k['pts']]
        if len(pts)>2: dr.polygon(pts,fill='white' if k['hole'] else 'black')
    dr.text((ox,oy+int(cap*0.3)),c+(' fb '+g['fb'] if g['fb'] else ''),fill='red')
img.save(out)
