"""every element of every demo frame lies inside the demo stage (no cropping, 6 px inset); used by e2e_demos and by hand"""
import os,sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
JS = """([key,t])=>{const inst=[...DM.all].find(i=>i.key===key);if(!inst)return 'noinst';
 inst.seek(t);const st=inst.root.querySelector('.dm-st'),s=st.getBoundingClientRect(),k=s.width/st.offsetWidth,bad=[];
 st.querySelectorAll('*').forEach(e=>{if(e.closest('svg'))return;if(e.closest('.dm-rl'))return;
  let o=1;for(let a=e;a&&a!==st.parentNode;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden'){o=0;break}o*=parseFloat(cs.opacity)}
  if(o<.25)return;const r0=e.getBoundingClientRect();if(r0.width<1||r0.height<1)return;
  let r={left:r0.left,top:r0.top,right:r0.right,bottom:r0.bottom},clipped=false;
  for(let a=e.parentElement;a&&a!==st;a=a.parentElement){const cs=getComputedStyle(a);if(cs.overflow!=='visible'||cs.overflowX!=='visible'){const q=a.getBoundingClientRect();
    if(r0.left<q.left-1||r0.right>q.right+1||r0.top<q.top-1||r0.bottom>q.bottom+1)clipped=true;
    r={left:Math.max(r.left,q.left),top:Math.max(r.top,q.top),right:Math.min(r.right,q.right),bottom:Math.min(r.bottom,q.bottom)};}}
  if(r.right<=r.left||r.bottom<=r.top)return;
  const txt=[...e.childNodes].some(c=>c.nodeType===3&&c.textContent.trim());
  const nm=(typeof e.className==='string'?e.className:e.tagName)+(txt?' [text '+e.textContent.trim().slice(0,12)+']':'');
  if(clipped&&txt&&!e.closest('.dm-cur')&&!e.closest('.dm-sv,.dm-bt'))bad.push(['CLIPPED '+nm,0,0,0,0]);
  const hr=e.closest('.dm-hero');if(hr&&hr!==e&&!e.closest('.dm-sat')&&!e.closest('.dm-ft')){const q=hr.getBoundingClientRect(),mm=8*k;if(r.left<q.left+mm-.5||r.top<q.top+mm-.5||r.right>q.right-mm+.5||r.bottom>q.bottom-mm+.5)bad.push(['HERO '+nm,Math.round((r.left-q.left)/k),Math.round((r.top-q.top)/k),Math.round((r.right-q.left)/k),Math.round((r.bottom-q.top)/k)]);}
  const m=6*k;if(r.left<s.left+m-.5||r.top<s.top+m-.5||r.right>s.right-m+.5||r.bottom>s.bottom-m+.5)bad.push([nm,Math.round((r.left-s.left)/k),Math.round((r.top-s.top)/k),Math.round((r.right-s.left)/k),Math.round((r.bottom-s.top)/k)]);});
 return bad}"""
def run(w=1440,only=None):
    out=[]
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=CHROME) if os.path.exists(CHROME) else p.chromium.launch()
        ctx=b.new_context(viewport={'width':w,'height':900});ctx.add_init_script(TOUR_OFF);pg=ctx.new_page()
        pg.goto('file://'+PAGE);pg.wait_for_function("typeof DM!=='undefined'&&document.querySelector('#dm-home')",timeout=30000)
        for key in ('d1','d2','d3','d4'):
            pg.evaluate("(k)=>document.querySelector('#dm-home').scrollIntoView()",key);pg.wait_for_timeout(300)
            pg.evaluate("[...DM.all].forEach(i=>i.init&&i.init())")
            pg.wait_for_timeout(500)
            D=pg.evaluate("(k)=>{const i=[...DM.all].find(i=>i.key===k);return i&&i.api?i.api.D:0}",key)
            if not D: out.append((key,'no api'));continue
            t=0
            while t<=D:
                r=pg.evaluate(JS,[key,t])
                if r and r!='noinst':
                    for x in r:out.append((w,key,round(t,2),x))
                t+=.25
        b.close()
    return out
if __name__=='__main__':
    bad=[]
    for w in (1440,400):
        bad+=run(w)
    seen={}
    for x in bad:seen.setdefault((x[0],x[1],str(x[3][0])[:30]) if len(x)==4 else x,[]).append(x)
    for k,v in list(seen.items())[:40]:print(k,len(v),v[0][2:])
    print('violations',len(bad))
    sys.exit(1 if bad else 0)
