import sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
def gl(p):
    f=TTFont(p);gs=f.getGlyphSet();o={}
    for n in f.getGlyphOrder():
        r=RecordingPen();gs[n].draw(r);o[n]=(repr(r.value),f['hmtx'][n][0])
    return f.getBestCmap(),o
a=gl(sys.argv[1]);b=gl(sys.argv[2]);inv={v:k for k,v in b[0].items()}
ch=[n for n in b[1] if n in a[1] and a[1][n]!=b[1][n]]
print(len(ch),' '.join(chr(inv[n]) if n in inv else n for n in ch))
