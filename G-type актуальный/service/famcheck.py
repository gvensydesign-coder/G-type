import glob,os,sys
from fontTools.ttLib import TTFont
bad=0;fams={}
for fn in sorted(glob.glob('fam/*.ttf')):
    f=TTFont(fn);n=f['name'];o=f['OS/2'];hh=f['hhea'];hd=f['head'];gs=f.getGlyphSet();g=f['glyf']
    ys=[(g[k].yMax,g[k].yMin,k) for k in f.getGlyphOrder() if g[k].numberOfContours]
    ymax=max(ys);ymin=min(ys,key=lambda t:t[1])
    nm={i:n.getDebugName(i) for i in (1,2,4,6,16,17)}
    probs=[]
    if ymax[0]>o.usWinAscent: probs.append('clip top %s'%(ymax,))
    if -ymin[1]>o.usWinDescent: probs.append('clip bottom')
    if hh.ascent!=o.sTypoAscender or hh.descent!=o.sTypoDescender: probs.append('hhea!=typo')
    if not o.fsSelection&128: probs.append('no USE_TYPO')
    if (hd.yMax,hd.yMin)!=(max(t[0] for t in ys),min(t[1] for t in ys)): probs.append('head bbox')
    it=bool(o.fsSelection&1);bo=bool(o.fsSelection&32);rg=bool(o.fsSelection&64)
    if it!=bool(hd.macStyle&2) or bo!=bool(hd.macStyle&1) or (rg and (it or bo)): probs.append('style bits')
    if it!=('Italic' in nm[2]) or bo!=('Bold' in nm[2]): probs.append('id2 vs bits')
    if ' ' in nm[6]: probs.append('ps space')
    # woff
    w=TTFont(fn[:-4]+'.woff')
    if w.flavor!='woff': probs.append('woff flavor')
    for t in f.keys():
        if t=='GlyphOrder':continue
        if f.reader[t]!=w.reader[t]: probs.append('woff diff '+t)
    fams.setdefault(nm[16],[]).append((nm[1],nm[2],nm[17],o.usWeightClass))
    print(os.path.basename(fn),'|',nm[1],'/',nm[2],'|',nm[16],'/',nm[17],'|',nm[4],'|',nm[6],'| w',o.usWeightClass,'fsSel',hex(o.fsSelection),'mac',hd.macStyle,
      '| hhea',hh.ascent,hh.descent,hh.lineGap,'typo',o.sTypoAscender,o.sTypoDescender,'win',o.usWinAscent,o.usWinDescent,'| yMax',ymax[0],ymax[2],'yMin',ymin[1],ymin[2],
      '| xh',o.sxHeight,'cap',o.sCapHeight,'| ttf',os.path.getsize(fn),'woff',os.path.getsize(fn[:-4]+'.woff'),probs or 'OK')
    bad+=bool(probs)
# uniqueness of (ID1,ID2) within family
for k,v in fams.items():
    pairs=[(a,b) for a,b,_,_ in v];print(k,len(v),'unique id1/2' if len(set(pairs))==len(pairs) else 'DUP',sorted(set(a for a,_,_,_ in v)))
print('bad',bad)
sys.exit(1 if bad else 0)
