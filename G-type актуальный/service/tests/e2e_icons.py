# icon buttons: the icon must sit in the centre of its button (dx,dy <= 2px) AND must have visible pixels (a solid disc without an icon FAILS),
# all views, both themes; checkbox toggles (label.tg) are checked unchecked and checked
import sys,io
from PIL import Image
from playwright.sync_api import sync_playwright
import os,time
T0=time.time()
P='file://'+os.path.abspath('index.html'); O=None
JS="""()=>{const out=[];let i=0;
document.querySelectorAll('[data-au]').forEach(x=>x.removeAttribute('data-au')); /* indices of earlier scans (other views) must not survive: querySelector(data-au=N) would pick a stale element of another view */
for(const e of document.querySelectorAll('button,label,a,[role=button]')){
 if(!e.offsetParent||getComputedStyle(e).visibility==='hidden')continue;const r=e.getBoundingClientRect();if(r.width<16||r.height<16||r.height>56||r.width>64)continue;
 if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
 if(r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)continue; /* partly outside the screen (swipe row edge) */
 {const rl=document.querySelector('.rail');if(rl&&e.closest('.rail')===null){const q=rl.getBoundingClientRect();if(r.right>q.left&&r.left<q.right&&r.bottom>q.top&&r.top<q.bottom)continue;} /* touches the bar: reachable by scrolling, checked in the overflow audit (UNDER-BAR) */
 let ok=true;for(const [fx,fy] of [[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]]){const hit=document.elementFromPoint(r.x+r.width*fx,r.y+r.height*fy);if(!hit||!(e.contains(hit)||hit.contains(e)))ok=false;}if(!ok)continue;} /* covered (even partly) by another layer (drawer, bottom bar): not what the user sees */
 const b=getComputedStyle(e,'::before'),ic=e.querySelector(':scope>.ico, :scope>i.ico, :scope>svg');
 const hasB=b.content!=='none'&&(b.maskImage&&b.maskImage!=='none'||b.webkitMaskImage&&b.webkitMaskImage!=='none');
 if(!hasB&&!ic)continue;
 if((e.innerText||'').trim().length>2 && getComputedStyle(e).fontSize!=='0px')continue;
 e.dataset.au=++i;out.push({i,dis:!!e.disabled,id:e.id,cls:String(e.className).slice(0,40),x:r.x,y:r.y,w:r.width,h:r.height,
  ic:ic?(()=>{const q=ic.getBoundingClientRect();return [q.x+q.width/2-(r.x+r.width/2),q.y+q.height/2-(r.y+r.height/2)]})():null});}
return out;}"""
def px(pg,e):
    im=Image.open(io.BytesIO(pg.screenshot(clip={'x':e['x'],'y':e['y'],'width':e['w'],'height':e['h']}))).convert('L')
    w,h=im.size;cx,cy=w/2,h/2;R=min(w,h)/2*0.8
    from collections import Counter
    pts=[(x,y) for y in range(h) for x in range(w) if (x-cx)**2+(y-cy)**2<R*R]
    bg=Counter(im.getpixel(p) for p in pts).most_common(1)[0][0]
    TH=10 if e.get('dis') else 30  # disabled buttons are dimmed on purpose
    weak=[p for p in pts if abs(im.getpixel(p)-bg)>TH]
    if len(weak)<6:return 'NOINK'
    ink=[p for p in pts if abs(im.getpixel(p)-bg)>(60 if not e.get('dis') else TH)] or weak
    xs=[p[0] for p in ink];ys=[p[1] for p in ink]
    return ((min(xs)+max(xs))/2-cx+.5,(min(ys)+max(ys))/2-cy+.5)
def chk(pg,name,e,tag=''):
    # icon pixels must exist (px -> 'NOINK' = solid disc / empty button); centring from the DOM box of the icon, else from the pixels
    d=px(pg,e)
    if d=='NOINK':  # settle (transitions / mode rebuild), re-read the box once; an element that left the screen meanwhile is not a failure
        pg.wait_for_timeout(500)
        r=pg.evaluate("i=>{const l=document.querySelector('[data-au=\\\"'+i+'\\\"]');if(!l||!l.offsetParent)return null;const r=l.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}}",e['i'])
        if r is None:return 0
        e=dict(e,**r);d=px(pg,e)
    if d=='NOINK':
        el=pg.evaluate("i=>{const l=document.querySelector('[data-au=\"'+i+'\"]');return l?(l.getAttribute('aria-label')||l.title||l.id||l.className):''}",e['i'])
        print(f"NOICON {name}{tag} [{el}] #{e['id']} .{e['cls']} {e['w']:.0f}x{e['h']:.0f} has no visible icon pixels");return 1
    d=e['ic'] or d
    if d and (abs(d[0])>2 or abs(d[1])>2):
        print(f"OFF {name}{tag} #{e['id']} .{e['cls']} {e['w']:.0f}x{e['h']:.0f} dx={d[0]:.1f} dy={d[1]:.1f}");return 1
    return 0
def run(pg,name):
    bad=0
    for e in pg.evaluate(JS):
        bad+=chk(pg,name,e)
        # checkbox toggles: also the other state (the icon must survive :checked)
        if pg.evaluate("i=>{const l=document.querySelector('[data-au=\"'+i+'\"]');return !!l&&l.tagName==='LABEL'&&!!l.querySelector('input[type=checkbox]')}",e['i']):
            pg.evaluate("i=>document.querySelector('[data-au=\"'+i+'\"] input').click()",e['i']);pg.wait_for_timeout(120)
            e2=pg.evaluate("i=>{const l=document.querySelector('[data-au=\"'+i+'\"]');const r=l.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,id:l.id,cls:String(l.className).slice(0,40),i:i,ic:null}}",e['i'])
            bad+=chk(pg,name,e2,'[toggled]')
            pg.evaluate("i=>document.querySelector('[data-au=\"'+i+'\"] input').click()",e['i']);pg.wait_for_timeout(120)
    return bad
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from uiq_views import *
with sync_playwright() as p:
    b=p.chromium.launch();tot=0;nst=0
    for (w,h) in VIEWPORTS:
        for th in THEMES:
            pg=new_page(b,w,h,th);tag=f'{w}:{th}'
            for v in VIEWS:
                goto(pg,v);tot+=run(pg,f'{tag}:{v}');nst+=1
                if v=='library' and w==1440:  # a second font family (pixel) keeps its own editor icons
                    pg.click('#libgrid .lcard[data-font=pixel]');pg.wait_for_timeout(2500);tot+=run(pg,f'{tag}:edit-pixel')
            pg.context.close()
    b.close()
    print(('PASS' if tot==0 else 'FAIL')+f' icons {tot} icon buttons off-centre or without icon pixels in {nst} view states (home/library/fav/edit/drawer/proof/kern/draw/import x 1440+390+768 x 2 themes) t={time.time()-T0:.1f}s')
