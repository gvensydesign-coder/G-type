# focus rings must not be clipped: for every visible focusable control, the focus ring area must lie inside every clipping ancestor
import os,time
from playwright.sync_api import sync_playwright
T0=time.time()
JS="""()=>{const bad=[];const sel='button,input:not([type=range]):not([type=hidden]),select,textarea,[tabindex="0"],a[href]';
for(const e of document.querySelectorAll(sel)){
 if(!e.offsetParent||e.disabled)continue;const r=e.getBoundingClientRect();if(r.width<8||r.height<8)continue;
 if(r.bottom<0||r.top>innerHeight)continue;
 if(getComputedStyle(e).visibility==='hidden')continue;
 e.focus({preventScroll:true});if(document.activeElement!==e)continue;
 const cs=getComputedStyle(e);const ow=parseFloat(cs.outlineWidth)||0,oo=parseFloat(cs.outlineOffset)||0;
 const ext=cs.outlineStyle==='none'?0:Math.max(0,ow+oo);
 if(ext<=0)continue;
 let p=e.parentElement;
 while(p&&p!==document.body){const pc=getComputedStyle(p);
  if(pc.overflowX!=='visible'||pc.overflowY!=='visible'){const q=p.getBoundingClientRect();
   const cx=pc.overflowX!=='visible',cy=pc.overflowY!=='visible';
   if(r.left<q.left-0.5||r.right>q.right+0.5||r.top<q.top-0.5||r.bottom>q.bottom+0.5){p=p.parentElement;continue;}  /* the control itself is scrolled out of view, not a ring problem */
   /* a scroll container clips a ring that sticks out toward the side it can still scroll to: focusing the control scrolls it into view (the ring is clipped only at the unscrolled position, e.g. a button sitting on the viewport edge) */
   const sc=(d)=>{const sy=/(auto|scroll)/.test(pc.overflowY)&&p.scrollHeight>p.clientHeight+1,sx=/(auto|scroll)/.test(pc.overflowX)&&p.scrollWidth>p.clientWidth+1;
    return d==='b'?sy&&p.scrollTop+p.clientHeight<p.scrollHeight-1:d==='t'?sy&&p.scrollTop>1:d==='r'?sx&&p.scrollLeft+p.clientWidth<p.scrollWidth-1:sx&&p.scrollLeft>1;};
   const cl=(cx&&((r.left-ext<q.left-0.5&&!sc('l'))||(r.right+ext>q.right+0.5&&!sc('r'))))||(cy&&((r.top-ext<q.top-0.5&&!sc('t'))||(r.bottom+ext>q.bottom+0.5&&!sc('b'))));
   if(cl){
    bad.push((e.id||e.className||e.tagName).toString().slice(0,30)+' in '+(p.id||p.className).toString().slice(0,30));break;}}
  p=p.parentElement;}
}
document.activeElement&&document.activeElement.blur();return bad;}"""
BAD=[]
import sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from uiq_views import *
with sync_playwright() as p:
    b=p.chromium.launch();nst=0
    for (w,h) in VIEWPORTS:
        pg=new_page(b,w,h,'light');pg.keyboard.press('Tab')  # focus-visible heuristics: keyboard modality
        for n in VIEWS:
            goto(pg,n);nst+=1
            for x in pg.evaluate(JS):BAD.append(f'{w} {n}: {x}')
        pg.context.close()
    b.close()
for x in BAD[:40]:print('  ',x)
print(('PASS' if not BAD else 'FAIL')+f' focus {len(BAD)} clipped focus rings, {nst} view states (9 views x 1440/390/768) t={time.time()-T0:.1f}s')
