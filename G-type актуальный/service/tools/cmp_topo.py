import sys,os
sys.path.insert(0,os.path.dirname(__file__))
from gcheck import info
a,b,chars=sys.argv[1],sys.argv[2],sys.argv[3]
A=info(a,chars);B=info(b,chars)
n=0
for ch in chars:
    x,y=A[ch],B[ch]
    if not x or not y: continue
    tx=(x['nc'],len(x['holes']),len([c for c in x['comps'] if c>40]),x['selfx'],x['crossx'])
    ty=(y['nc'],len(y['holes']),len([c for c in y['comps'] if c>40]),y['selfx'],y['crossx'])
    mh=min([h for h in y['holes']] or [9999])
    if tx!=ty or mh<200 or y['selfx'] or y['crossx']:
        print(ch,tx,'->',ty,'minhole',mh);n+=1
print('changed',n)
