"""Kerning measurement on built TTFs (PIL, 1000 px/em => 1 px = 1 u).
usage: kmeasure.py <famdir> <out.json> [fonts] [styles]
Per font/style: n-n closest gap (nn), word space, 40 critical pairs: kern, closest approach after kerning, ratio to nn;
lowercase twin check; share of most frequent kern value."""
import sys,json,os,collections
import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image,ImageDraw,ImageFont
FAM={'volt':'VoltGrotesk','kvadra':'KvadraSans','stroka':'StrokaSans','liniya':'Liniya','codex':'CodexUncial','renessa':'RenessaSerif','propis':'PropisScript',
 'rotunda':'RotundaLibros','ustav':'UstavDisplay','pixel':'PixelGrid','modul':'ModulGrid','ryvok':'RyvokDisplay','kaplya':'KaplyaDrop','applik':'ApplikatsiyaPaper','stsepka':'StsepkaDisplay','stolb':'StolbDisplay','nit':'Nit'}
CRIT="AV AT AY LT LV LY To Ta Ty Va Ya Yo P. F. T. r. L' 7. «A A» ГА ТА УА ЛТ ЛУ ЛЧ ГО Го Гд Ту То Тя Уа ДА ТО АУ РА Р. Г. У.".split()
def kern_g(f,gl,gr):
    if 'GPOS' not in f: return 0
    gp=f['GPOS'].table
    if not hasattr(f,'_ksubs'):
        subs=[]
        for fr in gp.FeatureList.FeatureRecord:
            pass
        idx=set()
        for fr in gp.FeatureList.FeatureRecord:
            if fr.FeatureTag=='kern': idx|=set(fr.Feature.LookupListIndex)
        for i in sorted(idx):
            lk=gp.LookupList.Lookup[i]
            for st in lk.SubTable:
                if lk.LookupType==9: st=st.ExtSubTable
                if st.LookupType==2 if hasattr(st,'LookupType') else True: subs.append(st)
        f._ksubs=subs
    for st in f._ksubs:
        cov=st.Coverage.glyphs
        if gl not in cov: continue
        if st.Format==1:
            ps=st.PairSet[cov.index(gl)]
            for pv in ps.PairValueRecord:
                if pv.SecondGlyph==gr:
                    return getattr(pv.Value1,'XAdvance',0) or 0
            continue
        c1=st.ClassDef1.classDefs.get(gl,0);c2=st.ClassDef2.classDefs.get(gr,0)
        v=st.Class1Record[c1].Class2Record[c2].Value1
        return (getattr(v,'XAdvance',0) or 0) if v else 0
    return 0
class Meas:
    def __init__(s,path):
        s.path=path;s.f=TTFont(path);s.cm=s.f.getBestCmap();s.im=ImageFont.truetype(path,1000);s.c={}
        s.hm=s.f['hmtx']
    def adv(s,ch):
        g=s.cm.get(ord(ch));return s.hm[g][0] if g else None
    def prof(s,ch):
        if ch in s.c: return s.c[ch]
        if ord(ch) not in s.cm: s.c[ch]=None;return None
        W,H=2400,2400;im=Image.new('L',(W,H),0);ImageDraw.Draw(im).text((700,1700),ch,font=s.im,fill=255,anchor='ls')
        a=np.array(im)>=128
        rows=np.nonzero(a.any(1))[0]
        if not len(rows): s.c[ch]=None;return None
        L={};R={}
        for y in rows:
            xs=np.nonzero(a[y])[0];L[y]=xs[0]-700;R[y]=xs[-1]+1-700
        s.c[ch]=(L,R,s.adv(ch));return s.c[ch]
    def kern(s,l,r):
        return kern_g(s.f,s.cm.get(ord(l)),s.cm.get(ord(r)))
    def gap(s,l,r,k=None):
        A=s.prof(l);B=s.prof(r)
        if not A or not B: return None
        if k is None:k=s.kern(l,r)
        sh=set(A[0])&set(B[0])
        if not sh: return None
        return min((B[0][y]+A[2]+k)-A[1][y] for y in sh)
def optgap(m,l,r,k,D):
    A=m.prof(l);B=m.prof(r)
    if not A or not B: return None
    lo=max(min(A[0]),min(B[0]));hi=min(max(A[0]),max(B[0]))
    if hi<lo: return None
    tot=0;n=0
    for y in range(lo,hi+1):
        if y in A[0] and y in B[0]: g=(B[0][y]+A[2]+k)-A[1][y]; tot+=min(g,D)
        else: tot+=D
        n+=1
    return tot/n
def run(famdir,fid,sty):
    p=f"{famdir}/{FAM[fid]}-{sty}.ttf"
    m=Meas(p)
    nn=m.gap('n','n',0)
    ip=m.prof('I') or m.prof('l');stem=max(ip[1].values())-min(ip[0].values()) if ip else 100
    sp=m.adv(' ')
    res=[];vals=[]
    for pr in CRIT:
        l,r=pr[0],pr[1]
        if ord(l) not in m.cm or ord(r) not in m.cm: continue
        k=m.kern(l,r);g=m.gap(l,r,k);g0=m.gap(l,r,0)
        og=optgap(m,l,r,k,nn+stem) if nn>0 else None
        res.append([pr,k,g,g0,og])
    # lowercase twin check (unicase fonts and all): same pair in lowercase
    tw=[]
    for pr in CRIT:
        lo=pr.lower()
        if lo==pr: continue
        if any(ord(c) not in m.cm for c in lo[:2]): continue
        tw.append([pr,m.kern(pr[0],pr[1]),m.kern(lo[0],lo[1]),m.gap(lo[0],lo[1])])
    # kern value saturation: all pairs of caps A-Я/A-Z
    letters='ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ.,'
    cnt=collections.Counter()
    for a in letters:
        for b in letters:
            if ord(a) in m.cm and ord(b) in m.cm:
                k=m.kern(a,b)
                if k: cnt[k]+=1
    top=cnt.most_common(3);tot=sum(cnt.values())
    return {'nn':nn,'space':sp,'pairs':res,'twins':tw,'sat':[top,tot]}
if __name__=='__main__':
    famdir,out=sys.argv[1:3]
    fonts=sys.argv[3].split(',') if len(sys.argv)>3 and sys.argv[3] else list(FAM)
    styles=sys.argv[4].split(',') if len(sys.argv)>4 else ['Regular','Black']
    R={}
    for fid in fonts:
        R[fid]={}
        for sty in styles:
            try: R[fid][sty]=run(famdir,fid,sty)
            except Exception as e: print('ERR',fid,sty,e)
        d=R[fid].get('Regular')
        if d:
            nn=d['nn'];pr=[x for x in d['pairs'] if x[2] is not None]
            po=[x for x in d['pairs'] if x[4] is not None]
            ok=sum(1 for x in po if abs(x[4]/nn-1)<=0.15);okc=sum(1 for x in pr if abs(x[2]/nn-1)<=0.15);over=sum(1 for x in pr if x[2]>0.8*d['space']);ov=sum(1 for x in pr if x[2]<=0)
            print(f"{fid:8s} nn={nn} space={d['space']} pairs={len(pr)} opt15={ok}/{len(po)} clos15={okc} >0.8sp={over} overlaps={ov} top={d['sat'][0]} /{d['sat'][1]}")
    json.dump(R,open(out,'w'),default=int)
