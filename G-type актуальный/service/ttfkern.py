import sys
from fontTools.ttLib import TTFont
def kern(f,l,r):
    cm=f.getBestCmap();gl=cm.get(ord(l)) if len(l)==1 else l;gr=cm.get(ord(r)) if len(r)==1 else r
    return kern_g(f,gl,gr)
def kern_g(f,gl,gr):
    if 'GPOS' not in f: return None
    for lk in f['GPOS'].table.LookupList.Lookup:
        for st in lk.SubTable:
            if st.LookupType==9: st=st.ExtSubTable
            if st.Format==1:
                if gl in st.Coverage.glyphs:
                    ps=st.PairSet[st.Coverage.glyphs.index(gl)]
                    for pv in ps.PairValueRecord:
                        if pv.SecondGlyph==gr: return pv.Value1.XAdvance if pv.Value1 else 0
            else:
                if gl in st.Coverage.glyphs:
                    c1=st.ClassDef1.classDefs.get(gl,0);c2=st.ClassDef2.classDefs.get(gr,0)
                    rec=st.Class1Record[c1].Class2Record[c2]
                    v=rec.Value1.XAdvance if rec.Value1 else 0
                    return v
    return 0
if __name__=='__main__':
    f=TTFont(sys.argv[1])
    for p in sys.argv[2:]:
        print(p,kern(f,p[0],p[1]))
