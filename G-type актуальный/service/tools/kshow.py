import json,sys
R=json.load(open(sys.argv[1]));B=json.load(open(sys.argv[2])) if len(sys.argv)>2 and sys.argv[2]!='-' else None
sty=sys.argv[4] if len(sys.argv)>4 else 'Regular'
for f in (sys.argv[3].split(',') if len(sys.argv)>3 else R):
    d=R[f][sty];nn=d['nn']
    bad=[(p,k,g) for p,k,g,g0,og in d['pairs'] if g is not None and not(0.85<=g/nn<=1.15)]
    print(f,'nn',nn,'sp',d['space'],'bad',len(bad),' '.join(f"{p}:{k}/{g}({g/nn:.1f})" for p,k,g in bad))
