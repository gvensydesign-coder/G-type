import sys,math
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
def run(ttf,chars,thr=6,lo=0,hi=40):
    f=TTFont(ttf);gs=f.getGlyphSet();cm=f.getBestCmap();out=[]
    for ch in chars:
        g=cm.get(ord(ch))
        if not g:continue
        p=DecomposingRecordingPen(gs);gs[g].draw(p)
        segs=[];cur=None;start=None
        for op,a in p.value:
            if op=='moveTo':cur=a[0];start=cur;sg=[]
            elif op=='lineTo':sg.append((cur,a[0],a[0]));cur=a[0]
            elif op=='qCurveTo':
                pts=list(a)
                # expand implied
                offs=pts[:-1];end=pts[-1]
                if len(offs)==0:sg.append((cur,end,end));cur=end;continue
                pp=cur
                for i,o in enumerate(offs):
                    e=end if i==len(offs)-1 else ((o[0]+offs[i+1][0])/2,(o[1]+offs[i+1][1])/2)
                    sg.append((pp,o,e));pp=e
                cur=end
            elif op in('closePath','endPath'):
                if cur!=start:sg.append((cur,start,start))
                segs.append(sg)
        for sg in segs:
            n=len(sg)
            for i in range(n):
                a=sg[i];b=sg[(i+1)%n]
                # outgoing tangent of a: end - ctrl ; incoming of b: ctrl - start
                t1=(a[2][0]-a[1][0],a[2][1]-a[1][1]);t2=(b[1][0]-b[0][0],b[1][1]-b[0][1])
                if math.hypot(*t1)<1e-6 or math.hypot(*t2)<1e-6:continue
                ang=abs(math.degrees(math.atan2(t1[0]*t2[1]-t1[1]*t2[0],t1[0]*t2[0]+t1[1]*t2[1])))
                if thr<=ang<=hi:out.append((ch,round(a[2][0]),round(a[2][1]),round(ang,1)))
    return out
if __name__=='__main__':
    thr=float(sys.argv[3]) if len(sys.argv)>3 else 6
    for r in run(sys.argv[1],sys.argv[2],thr):print(*r)
