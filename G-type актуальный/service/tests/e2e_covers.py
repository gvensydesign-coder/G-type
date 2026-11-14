"""Library covers (Stage 3, project rule: nothing leaves the frame): per font one hero word >= 2/3 of the cover width, fully inside the padding (fitted by ink bounds),
2 satellites (Aa chip, glyph-count tag): 3 strings (strip: 2), no dead quadrant, real words, deterministic; no horizontal overflow at 400/768/1440, light and dark; own text still works. One PASS/FAIL line."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

COVJS = """(sel)=>[...document.querySelectorAll(sel)].filter(c=>c.getBoundingClientRect().width>0).map(cv=>{
  const c=cv.getContext('2d'),w=cv.width,h=cv.height,d=c.getImageData(0,0,w,h).data,ink=(x,y)=>d[(y*w+x)*4+3]>24;
  const dpr=w/cv.getBoundingClientRect().width;
  let X0=w,X1=-1,Y0=h,Y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ink(x,y)){if(x<X0)X0=x;if(x>X1)X1=x;if(y<Y0)Y0=y;if(y>Y1)Y1=y;}
  const area=(x0,x1,y0,y1)=>{for(let y=Math.max(0,Math.floor(y0*dpr));y<Math.min(h,Math.ceil(y1*dpr));y++)for(let x=Math.max(0,Math.floor(x0*dpr));x<Math.min(w,Math.ceil(x1*dpr));x++)if(ink(x,y))return true;return false;};
  const D=cv.dataset,cw=cv.getBoundingClientRect().width,ch=cv.getBoundingClientRect().height;
  const q=[[0,cw/2,0,ch/2],[cw/2,cw,0,ch/2],[0,cw/2,ch/2,ch],[cw/2,cw,ch/2,ch]].map(r=>area(...r));
  return {font:D.font,word:D.cover,vis:+D.vis,strings:+D.strings,layout:D.layout,pad:+D.pad,top:+D.top,bot:+D.bot,
    ix0:+D.ix0,ix1:+D.ix1,iy0:+D.iy0,iy1:+D.iy1,
    px0:X0/dpr,px1:(X1+1)/dpr,py0:Y0/dpr,py1:(Y1+1)/dpr,notch:area(cw-56,cw,0,56),q,w:cw,h:ch};})"""


def check_rows(rows, tag):
    assert rows, tag
    for r in rows:
        t = f"{tag} {r['font']} {r['word']}"
        # nothing leaves the frame: hero ink box (from the glyph outlines) inside the padding, painted pixels inside the padding too
        assert r['ix0'] >= r['pad'] - 0.6 and r['ix1'] <= r['w'] - r['pad'] + 0.6, (t, 'hero ink outside the horizontal padding', r['ix0'], r['ix1'], r['w'])
        assert r['iy0'] >= r['top'] - 0.6 and r['iy1'] <= r['h'] - r['bot'] + 0.6, (t, 'hero ink outside the vertical area', r['iy0'], r['iy1'], r['h'])
        assert r['px0'] >= r['pad'] - 2 and r['px1'] <= r['w'] - r['pad'] + 2 and r['py1'] <= r['h'] - 2 and r['py0'] >= 2, (t, 'painted pixels touch the frame', r['px0'], r['px1'], r['py0'], r['py1'])
        assert r['vis'] >= 2 / 3 - 0.01, (t, 'hero ink width', r['vis'])
        assert 2 <= r['strings'] <= 7 and r['strings'] == (2 if r['layout'] == 'strip' else 3), (t, 'strings', r['strings'], r['layout'])
        if r['layout'] != 'strip':
            assert not r['notch'], (t, 'ink under the card notch')
            assert r['q'][0] and r['q'][2] and r['q'][3], (t, 'dead quadrant (top right is the card notch)', r['q'])
        else:
            assert all(r['q']), (t, 'dead quadrant', r['q'])


def run(p):
    s = Session(p, 'covers')
    try:
        pg = s.pg
        words = s.js("[...CV_RU,...CV_LA]")
        found = {}
        n = 0
        for vw, vh in ((1440, 900), (768, 1024), (400, 860)):
            pg.set_viewport_size({'width': vw, 'height': vh})
            for th in ('light', 'dark'):
                pg.evaluate(f"document.documentElement.setAttribute('data-theme','{th}')")
                for tab, sel, lay in (('library', '#libgrid .lcv', 'grid'), ('home', '#libcards .lcv', 'grid'), ('library', '#libgrid .lcv', 'list'), ('fav', '#favgrid .lcv', 'grid')):
                    if tab == 'fav' and not s.js("FAVS.size"):
                        s.js("favSet('volt',true);favSet('pixel',true)")
                    pg.evaluate(f"setTab('{tab}')")
                    if tab == 'library':
                        pg.click(f'#lib-view [data-view={lay}]')
                    pg.wait_for_function(f"S.tab==='{tab}' && [...document.querySelectorAll('{sel}')].length>0 && [...document.querySelectorAll('{sel}')].every(c=>c.dataset.cover)", timeout=15000)
                    pg.wait_for_timeout(500)
                    pg.wait_for_function("!DL_MORE&&!PODB_MORE", timeout=60000)  # W88: covers are drawn font by font in slices; read them when the pass is complete
                    rows = pg.evaluate(f"({COVJS})('{sel}')")
                    check_rows(rows, f'{vw} {th} {tab} {lay}')
                    ws = [r['word'].lower() for r in rows if r['font'] != 'imp']
                    assert len(ws) == len(set(ws)), (vw, th, tab, lay, 'repeated word', sorted(ws))
                    for r in rows:
                        assert r['word'].lower() in [x.lower() for x in words] or r['word'] == s.js(f"FONTS.{r['font']}.name"), ('not a real word', r['word'])
                        if lay == 'grid' and tab == 'library':
                            found.setdefault(r['font'], set()).add(r['word'])
                    n += len(rows)
                    if lay == 'grid' and tab == 'library' and (vw, th) in ((1440, 'light'), (400, 'dark')):
                        assert all(r['layout'] == ('phone' if vw == 400 else 'wide') for r in rows), 'layout by width'
                    # no horizontal overflow
                    assert s.js("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"), (vw, th, tab, 'page overflow')
                    assert s.js(f"[...document.querySelectorAll('{sel}')].every(c=>{{const r=c.getBoundingClientRect();return r.width===0||(r.left>=-1&&r.right<=innerWidth+1)}})") or tab == 'home', (vw, th, tab, 'cover outside the viewport')
                pg.click('#lib-view [data-view=grid]') if s.js("S.tab==='library'") else None
        # deterministic: one (word, edge, bleed) per font across widths of the same layout class is not required, but never two answers for the same canvas size
        # variety: edges and words differ between fonts
        flat = [sorted(v)[0] for v in found.values()]
        assert len(set(flat)) >= 12, ('covers look alike', flat)
        # redraw gives identical choices
        pg.set_viewport_size({'width': 1440, 'height': 900}); pg.evaluate("setTab('library')"); pg.wait_for_timeout(400); pg.wait_for_function("!DL_MORE&&!PODB_MORE", timeout=60000)
        a = s.js("[...document.querySelectorAll('#libgrid .lcv')].map(c=>c.dataset.cover+c.dataset.cap).join()")
        s.js("drawLibrary()"); pg.wait_for_timeout(300); pg.wait_for_function("!DL_MORE&&!PODB_MORE", timeout=60000)
        assert a == s.js("[...document.querySelectorAll('#libgrid .lcv')].map(c=>c.dataset.cover+c.dataset.cap).join()"), 'not deterministic'
        # own text and click/fav keep working
        pg.fill('#view-library .lt-in', 'Дом'); pg.wait_for_function("window.LIBTXT==='Дом'", timeout=5000); pg.wait_for_timeout(500); pg.wait_for_function("!DL_MORE&&!PODB_MORE", timeout=60000)
        assert s.js("[...document.querySelectorAll('#libgrid .lcv')].every(c=>c.dataset.cover==='Дом')"), 'own text on every cover'
        pg.fill('#view-library .lt-in', 'Очень длинный текст для обложек'); pg.wait_for_timeout(500); pg.wait_for_function("!DL_MORE&&!PODB_MORE", timeout=60000)
        assert s.js("[...document.querySelectorAll('#libgrid .lcv')].every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;return false})"), 'empty cover with a long own text'
        pg.fill('#view-library .lt-in', ''); pg.wait_for_function("window.LIBTXT===''", timeout=5000)
        pg.click('#libgrid .lcard[data-font=stroka] .heart'); assert s.js("FAVS.has('stroka')"), 'fav'
        pg.click('#libgrid .lcard[data-font=stroka] .heart')
        pg.click('#libgrid .lcard[data-font=ustav]'); pg.wait_for_function("S.fontId==='ustav' && S.tab==='edit'", timeout=20000)
        assert not s.errs, s.errs[:3]
        return f'covers: {n} covers x 3 widths x 2 themes: hero ink inside the padding (no bleed), >= 2/3 wide, 3 strings (strip 2), nothing under the notch, no dead quadrant, unique words, deterministic, own text ok'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('covers', run)]))
