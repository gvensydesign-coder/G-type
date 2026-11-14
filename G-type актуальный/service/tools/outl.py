"""Outline statistics of a TTF (all glyphs): points, near-axis straight segments (<=3 u off, >25 u long), micro segments (<6 u),
tangent breaks 4..18 deg at on-curve points with a curve on at least one side, needles (<20 deg, two straight edges).
usage: outl.py a.ttf [b.ttf]  (b = new build: adds per-glyph XOR at 200 px against a)"""
import sys,math,numpy as np
from fontTools.ttLib import TTFont
def contours(g,gs):
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    return None
def stats(path):
    f=TTFont(path);gl=f['glyf'];N=dict(pts=0,axis=0,micro=0,brk=0,needle=0)
    for name in f.getGlyphOrder():
        g=gl[name]
        if g.numberOfContours<=0:continue
        co=g.coordinates;fl=g.flags;ends=g.endPtsOfContours;s=0
        for e in ends:
            P=[(co[i][0],co[i][1],fl[i]&1) for i in range(s,e+1)];s=e+1;n=len(P);N['pts']+=n
            on=[i for i in range(n) if P[i][2]]
            for k in range(len(on)):
                i=on[k];j=on[(k+1)%len(on)];h=(i+1)%n==j  # straight if consecutive on-curve points
                a,b=P[i],P[j]
                if h:
                    dx,dy=b[0]-a[0],b[1]-a[1];L=math.hypot(dx,dy)
                    if L<6:N['micro']+=1
                    if L>25 and ((0<abs(dy)<=3) or (0<abs(dx)<=3)):N['axis']+=1
            for i in range(n):
                p=P[i]
                if not p[2]:continue
                q=P[(i-1)%n];r=P[(i+1)%n]
                u=(p[0]-q[0],p[1]-q[1]);v=(r[0]-p[0],r[1]-p[1])
                lu,lv=math.hypot(*u),math.hypot(*v)
                if lu<1e-6 or lv<1e-6:continue
                ang=math.degrees(math.acos(max(-1,min(1,(u[0]*v[0]+u[1]*v[1])/(lu*lv)))))
                curve=(not q[2]) or (not r[2])
                if curve and 4<=ang<=18:N['brk']+=1
                if (not curve) and lu>0 and lv>0:
                    inter=180-ang
                    if inter<20:N['needle']+=1
    return N
if __name__=='__main__':
    a=stats(sys.argv[1]);print(sys.argv[1].split('/')[-1],a)
    if len(sys.argv)>2:
        b=stats(sys.argv[2]);print(sys.argv[2].split('/')[-1],b)
