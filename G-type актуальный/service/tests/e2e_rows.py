# controls placed in one flex row must share one height (+-2px), all views, both themes
import os,time
T0=time.time();BAD=[]
from playwright.sync_api import sync_playwright
JS="""()=>{const out=[];const vis=e=>e.offsetParent&&e.getBoundingClientRect().width>0;
const bgOf=e=>{const c=getComputedStyle(e).backgroundColor;return c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'};
for(const row of document.querySelectorAll('*')){if(!vis(row))continue;const cs=getComputedStyle(row);if(!cs.display.includes('flex')||cs.flexDirection.startsWith('column'))continue;
 const ks=[...row.children].filter(k=>vis(k)&&(k.matches('button,select,.seg,.btn,.chip,.langf,input:not([type=range]):not([type=checkbox])'))&&(bgOf(k)||k.querySelector(':scope>button')&&bgOf(k.querySelector(':scope>button'))));
 if(ks.length<2)continue;const hs=ks.map(k=>{const b=k.matches('.langf')?k.querySelector('button'):k;return Math.round(b.getBoundingClientRect().height)});
 if(Math.max(...hs)-Math.min(...hs)>2)out.push((row.id?'#'+row.id:'')+'.'+String(row.className).split(' ').slice(0,2).join('.')+' '+ks.map((k,i)=>(k.id||k.className.split(' ')[0]||k.tagName)+':'+hs[i]).join(' '));}
return out;}"""
import sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from uiq_views import *
with sync_playwright() as p:
    b=p.chromium.launch();nst=0
    for (w,h) in VIEWPORTS:
        for th in THEMES:
            pg=new_page(b,w,h,th)
            for n in VIEWS:
                goto(pg,n);nst+=1;tag=f'{w} {th} {n}'
                for x in pg.evaluate(JS):BAD.append(f'{tag} {x}')
                if n in ('edit','proof','kern','draw','import') and w>720:  # the vertical rail must not cover the content (phone: bottom bar floats over scrolling content by design)
                    ov=pg.evaluate("()=>{const r=document.querySelector('.rail').getBoundingClientRect().right;const v=[...document.querySelectorAll('.app>section')].find(s=>!s.hidden);return v?Math.round(r-v.getBoundingClientRect().left):0}")
                    if ov>0:BAD.append(f'{tag} rail overlaps content by {ov}px')
            pg.context.close()
    b.close()
for x in BAD:print('  ',x)
print(('PASS' if not BAD else 'FAIL')+f' rows {len(BAD)} control rows with mixed heights, 9 views x 3 widths x2 themes t={time.time()-T0:.1f}s')
