"""W88: (a) every text in the «Как это работает» demos renders >= 8.5 px on a 390 px phone (stage scale x computed font size), sampled over the whole loop of each demo. (b) W88 review: sampled over the whole loop (48 frames per demo) at 390 and 1440: every text node lies inside its nearest card/tile/button/cell rect (0.5 stage px), every nested
card/tile/button/cell lies inside its parent card (except in-flight chips), and no two text boxes intersect, except the listed intentional overlays (OVERLAY): an in-flight file chip (.dm-ft / .dm-fc / .dm-fly) moving
over content; a chip that is NOT moving (held frame) must overlap nothing. One line: demo_text."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

JS = """()=>{const out={};document.querySelectorAll('#dm-home .dm-box').forEach(bx=>{const i=bx._dm,k=i.X.k;
 for(let n=0;n<=12;n++){i.seek(i.api.D*n/12);bx.querySelectorAll('.dm-st *').forEach(e=>{if(e.closest('svg'))return;const t=[...e.childNodes].filter(c=>c.nodeType===3&&c.textContent.trim()).map(c=>c.textContent.trim()).join('');if(!t)return;
  let o=1;for(let a=e;a&&a!==bx;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden'){o=0;break}o*=parseFloat(cs.opacity)}if(o<.2)return;
  const fs=parseFloat(getComputedStyle(e).fontSize)*k,key=i.key+' '+(e.className||e.tagName)+' "'+t.slice(0,14)+'"';if(!(key in out)||out[key]>fs)out[key]=fs;});}});return out}"""


BOX = '.dm-ce,.dm-tile,.dm-lt,.dm-fr,.dm-ft,.dm-fc,.dm-btn,.dm-bt,.dm-pv,.dm-hero,.dm-seg,.dm-cv,.dm-cvs,.dm-c6'
OVERLAY = '.dm-ft,.dm-fc,.dm-fly'   # intentional overlays: the dragged file chip / flying glyph while it moves (a held chip is checked separately)
GEO = """([BOX,OVERLAY])=>{const res=[];const prev={};document.querySelectorAll('#dm-home .dm-box').forEach(bx=>{const i=bx._dm,k=i.X.k,key=i.key;const N=48;
 for(let n=0;n<=N;n++){i.seek(i.api.D*n/N);const items=[],boxes=[];
  const vis=e=>{let o=1;for(let a=e;a&&a!==bx;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden')return 0;o*=parseFloat(cs.opacity)}return o};
  bx.querySelectorAll('.dm-st *').forEach(e=>{if(e.closest('svg')||e.closest('.dm-cur')||e.closest('.dm-rl'))return;if(vis(e)<.2)return;
   if(e.matches(BOX)&&!e.closest('.dm-lt')&&false)return;
   const tn=[...e.childNodes].filter(c=>c.nodeType===3&&c.textContent.trim());if(!tn.length)return;
   const r=document.createRange();r.selectNodeContents(e);const q=r.getBoundingClientRect();if(q.width<1)return;
   const own=e.matches(BOX)?e:e.closest(BOX);if(!own)return;const fl=!!e.closest(OVERLAY);
   let cont=own;const c=cont.getBoundingClientRect();
   items.push({t:e.textContent.trim().slice(0,12),k:e.className||e.tagName,r:[q.left,q.top,q.right,q.bottom],c:[c.left,c.top,c.right,c.bottom],fl,el:e});});
  for(const it of items){const [a,b,c2,d]=it.r,[x0,y0,x1,y1]=it.c,t=.5*k;
   if(a<x0-t||b<y0-t||c2>x1+t||d>y1+t)res.push(['TEXT OUTSIDE its box',key,n,it.t,it.k,[a-x0,b-y0,x1-c2,y1-d].map(v=>+(v/k).toFixed(1))]);}
  bx.querySelectorAll('.dm-st *').forEach(e=>{if(!e.matches(BOX)||vis(e)<.2||e.matches(OVERLAY)||e.closest(OVERLAY))return;const par=e.parentElement&&e.parentElement.closest(BOX);if(!par||par.matches('.dm-hero')&&false)return;
   const a=e.getBoundingClientRect(),p=par.getBoundingClientRect(),t=.5*k;if(a.width<1)return;
   if(a.left<p.left-t||a.top<p.top-t||a.right>p.right+t||a.bottom>p.bottom+t)res.push(['BOX OUTSIDE parent',key,n,e.className,[a.left-p.left,a.top-p.top,p.right-a.right,p.bottom-a.bottom].map(v=>+(v/k).toFixed(1))]);});
  for(let u=0;u<items.length;u++)for(let v=u+1;v<items.length;v++){const A=items[u],B=items[v];if(A.el.contains(B.el)||B.el.contains(A.el))continue;
   const g=3*k,ov=!(A.r[2]<=B.r[0]+g||B.r[2]<=A.r[0]+g||A.r[3]<=B.r[1]+g||B.r[3]<=A.r[1]+g);/* 3 stage px: adjacent letters of one word set with negative tracking */if(!ov)continue;
   if(A.fl||B.fl){const F=A.fl?A:B,fe=F.el.closest(OVERLAY),fr=fe.getBoundingClientRect(),pk=key+fe.className,pr=prev[pk];prev[pk]=[fr.left,fr.top];
     if(pr&&Math.abs(pr[0]-fr.left)<.5&&Math.abs(pr[1]-fr.top)<.5)res.push(['HELD chip overlaps text',key,n,A.t,B.t]);continue;}
   res.push(['TEXT OVERLAP',key,n,A.t+' ['+A.k+']',B.t+' ['+B.k+']']);}
  bx.querySelectorAll(OVERLAY).forEach(fe=>{const fr=fe.getBoundingClientRect();prev[key+fe.className]=[fr.left,fr.top]});
 }});return res}"""

SEG = """()=>{const res=[];document.querySelectorAll('#dm-home .dm-box').forEach(bx=>{const i=bx._dm,k=i.X.k;
 bx.querySelectorAll('.dm-seg').forEach(sg=>{const th=sg.querySelector('.dm-th');if(!th)return;
  for(let n=0;n<=48;n++){i.seek(i.api.D*n/48);const a=sg.getBoundingClientRect(),b=th.getBoundingClientRect();if(b.width<1)continue;
   const T=(b.top-a.top)/k,B=(a.bottom-b.bottom)/k,L=(b.left-a.left)/k,R=(a.right-b.right)/k;
   if(Math.abs(T-B)>.5)res.push(['SEG thumb off-centre vertically',i.key,n,'',[T,B].map(v=>+v.toFixed(1))]);
   if(L<T-.5&&R<T-.5||L<-.5||R<-.5)res.push(['SEG thumb outside track',i.key,n,'',[L,R,T].map(v=>+v.toFixed(1))]);
   if(Math.min(L,R)>T+.5&&Math.min(L,R)<T+1.5)res.push(['SEG thumb side inset != top inset',i.key,n,'',[L,R,T].map(v=>+v.toFixed(1))]);}});});return res}"""


def run(p):
    s = Session(p, 'demo_text'); pg = s.pg
    try:
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.evaluate("setTab('home')"); pg.wait_for_timeout(500)
        pg.evaluate("DM.all.forEach(i=>{i.ctrl&&i.ctrl(false);i.init&&i.init()})")
        pg.wait_for_function("[...document.querySelectorAll('#dm-home .dm-box')].every(b=>b._dm&&b._dm.api)", timeout=20000)
        r = pg.evaluate(JS)
        bad = []
        for w in (390, 1440):
            pg.set_viewport_size({'width': w, 'height': 900}); pg.evaluate("setTab('home')"); pg.wait_for_timeout(500)
            pg.evaluate("DM.all.forEach(i=>{i.ctrl&&i.ctrl(false);i.init&&i.init()})"); pg.wait_for_timeout(400)
            for x in pg.evaluate(GEO, [BOX, OVERLAY]): bad.append((w,) + tuple(x))
            # segmented-control thumb: equal inset on every side at both rest positions (user report 2026-11-09)
            for x in pg.evaluate(SEG): bad.append((w,) + tuple(x))
        seen = {}
        for x in bad: seen.setdefault((x[0], x[1], x[2], str(x[4]), str(x[5])[:30]), x)
        kinds = sorted(set((x[2], x[1][:8], str(x[4])[:10] if x[2] != 'd5' or 'EM' not in str(x[5]) else 'cell', str(x[5])[:30] if x[2] != 'd5' or 'EM' not in str(x[5]) else '') for x in bad))
        assert not bad, f'{len(bad)} frame violations: {kinds[:30]} FIRST {[x for x in bad if x[2]=="d5"][:3]}'
        small = {k: round(v, 2) for k, v in r.items() if v < 8.5}
        assert r and not small, f'text below 8.5 px at 390: {dict(list(small.items())[:6])}'
        return f'{len(r)} text items, min {min(r.values()):.2f} px at 390; whole-loop containment/overlap clean at 390+1440'
    finally:
        s.close()


if __name__ == '__main__':
    sys.exit(check_all([('demo_text', run)]))
