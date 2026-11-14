import json,sys
from PIL import Image,ImageDraw,ImageChops
def render(files,out,scale=0.32,pad=40,labels=None,bg=(238,236,232)):
    rows=[json.load(open(f)) for f in files]
    W=int(max(r['w'] for r in rows)*scale)+2*pad; rh=int(1250*scale)
    H=rh*len(rows)+pad
    img=Image.new('RGB',(W,H),bg)
    for ri,r in enumerate(rows):
        S=2
        base=int((ri*rh)+pad/2+ 900*scale)  # baseline y px
        mask=Image.new('L',(W*S,rh*S+60),0)
        by=int(900*scale*S)
        for g in r['res']:
            gm=Image.new('L',mask.size,0);d=ImageDraw.Draw(gm)
            for pl in g['polys']:
                pts=[(pad*S+x*scale*S, by-y*scale*S) for x,y in pl['pts']]
                if not pl['hole']:d.polygon(pts,fill=255)
            for pl in g['polys']:
                pts=[(pad*S+x*scale*S, by-y*scale*S) for x,y in pl['pts']]
                if pl['hole']:d.polygon(pts,fill=0)
            mask=ImageChops.lighter(mask,gm)
        mask=mask.resize((W,rh+30),Image.LANCZOS)
        blk=Image.new('RGB',mask.size,(20,20,22))
        img.paste(blk,(0,ri*rh),mask.crop((0,0,W,rh+30)).crop((0,0,W,min(rh+30,H-ri*rh))))
    img.save(out)
if __name__=='__main__':
    out=sys.argv[1];render(sys.argv[2:],out)
