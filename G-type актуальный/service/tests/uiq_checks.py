"""Responsive layout checks (JS evaluated in the page): horizontal overflow, clipped text, touch targets, overlapping controls."""
CHECK_JS = r"""(phone)=>{
const out=[];const vis=e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return false;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
 for(let p=e;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p);if(c.visibility==='hidden'||c.display==='none'||c.opacity==='0'||p.inert||p.hidden)return false;}return true;};
const nm=e=>(e.id?'#'+e.id:'')+'.'+String(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className).trim().split(/\s+/).slice(0,2).join('.')+'<'+e.tagName.toLowerCase()+'>';
const de=document.documentElement;
if(de.scrollWidth>de.clientWidth+1)out.push('PAGE-HSCROLL scrollWidth '+de.scrollWidth+' > '+de.clientWidth);
// scroll containers + clipping ancestors
const clips=e=>{for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p);if(c.overflowX!=='visible'){const q=p.getBoundingClientRect();if((c.overflowX==='auto'||c.overflowX==='scroll')&&q.right<=innerWidth+1&&q.left>=-1)return true;if(c.overflowX==='hidden'&&q.right<=innerWidth+1&&q.left>=-1&&q.width<innerWidth)return true;}}return false;};
const seen=new Set();
for(const e of document.querySelectorAll('body *')){
 if(['SCRIPT','STYLE','SVG','PATH','CANVAS','OPTION','USE','DEFS'].includes(e.tagName.toUpperCase()))continue;
 if(!vis(e))continue;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);
 // element sticking out of the viewport horizontally (not inside a clipping ancestor, not a fixed full-bleed layer)
 if(!clips(e)&&cs.position!=='fixed'&&(r.right>innerWidth+1||r.left<-1)&&r.width<innerWidth*3&&!e.closest('svg,[aria-hidden=true],.hm-bg,.hm-mesh'))out.push('OFFSCREEN '+nm(e)+' x='+Math.round(r.left)+'..'+Math.round(r.right));
 // text clipping: own text, box clips overflow
 const hasText=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>0);
 if(hasText&&e.tagName!=='OPTION'){
  const ox=cs.overflowX,oy=cs.overflowY;
  if((ox!=='visible'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&e.clientWidth>0)out.push('CLIP-X '+nm(e)+' "'+e.textContent.trim().slice(0,28)+'" '+e.scrollWidth+'>'+e.clientWidth);
  else if(oy!=='visible'&&oy!=='auto'&&oy!=='scroll'&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>0)out.push('CLIP-Y '+nm(e)+' "'+e.textContent.trim().slice(0,28)+'" '+e.scrollHeight+'>'+e.clientHeight);
  // text wider than its (visible-overflow) box: spills out of a pill/button
  if(ox==='visible'&&(e.matches('button,.btn,.chip,.rb,label,.seg>*,.tab')) && e.scrollWidth>e.clientWidth+1 && e.clientWidth>0)out.push('SPILL '+nm(e)+' "'+e.textContent.trim().slice(0,28)+'" '+e.scrollWidth+'>'+e.clientWidth);
 }
}
// wide screens (tablet, desktop): a swipe row must not hide controls behind its edge (phones keep the swipe rows by design)
if(!phone){for(const e of document.querySelectorAll('*')){if(!vis(e))continue;const c=getComputedStyle(e);
 if((c.overflowX==='auto'||c.overflowX==='scroll')&&e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&e.querySelector('button,input,select,label')&&!e.matches('.glyphs,.gcol,#glyphs,#libcards,#dr-strip,.pb-row')&&c.display.includes('flex')&&c.flexDirection.startsWith('row'))out.push('HIDDEN-IN-ROW '+nm(e)+' '+e.scrollWidth+'>'+e.clientWidth);}}
// touch targets: icon-only controls >= 40px, text controls >= 32px high
if(phone){for(const e of document.querySelectorAll('button,[role=button],a[href],label.tg,select,.rb,.nb')){
 if(!vis(e))continue;const r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
 const t=(e.innerText||'').trim();const need=t.length>2?32:40;
 if(r.height<need-0.5||(t.length<=2&&r.width<need-0.5))out.push('TOUCH '+nm(e)+' '+Math.round(r.width)+'x'+Math.round(r.height)+(t?' "'+t.slice(0,16)+'"':'')+' need '+need);
}}
// overlapping controls (visible interactive boxes intersecting by > 3px both ways, neither containing the other)
const ctl=[...document.querySelectorAll('button,select,input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]),.btn,[role=button]')].filter(e=>vis(e)&&!e.closest('.pop,.menu,[role=dialog],#helpc,#rail-more,.dw[data-open="0"]'));
const bx=ctl.map(e=>[e,e.getBoundingClientRect()]).filter(([e,r])=>r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth);
const layer=e=>{for(let p=e;p&&p!==document.body;p=p.parentElement){const c=getComputedStyle(p).position;if(c==='fixed'||c==='sticky')return p;}return document.body;};
for(let i=0;i<bx.length;i++)for(let j=i+1;j<bx.length;j++){const [a,A]=bx[i],[b,B]=bx[j];if(a.contains(b)||b.contains(a)||layer(a)!==layer(b))continue;
 const ix=Math.min(A.right,B.right)-Math.max(A.left,B.left),iy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);
 if(ix>3&&iy>3){// topmost at centre of the overlap decides: only report when both are actually reachable
  const cx=Math.max(A.left,B.left)+ix/2,cy=Math.max(A.top,B.top)+iy/2;const t=document.elementFromPoint(cx,cy);
  if(t&&(a.contains(t)||b.contains(t)))out.push('OVERLAP '+nm(a)+' x '+nm(b)+' '+Math.round(ix)+'x'+Math.round(iy));}}
// phone bottom bar: a control that stays under the bar even after scrolling it into view is unreachable
if(phone){const bar=document.querySelector('.rail');
 for(const e of document.querySelectorAll('button,select,input:not([type=hidden]):not([type=range]),.btn,[role=button],a[href]')){
  if(!vis(e)||e.closest('.rail,#rail-more,.pop,.menu,#helpc,.dw[data-open="0"]'))continue;let r=e.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;
  const hit=()=>{r=e.getBoundingClientRect();const t=document.elementFromPoint(r.left+r.width/2,Math.min(r.top+r.height/2,innerHeight-1));return !!t&&!!t.closest('.rail');};
  if(hit()&&e.closest('#stagebox,.dr-sq,.dr-bar'))out.push('UNDER-BAR-FOLD '+nm(e)+' y='+Math.round(r.top)+'..'+Math.round(r.bottom));
  if(hit()){e.scrollIntoView({block:'center',inline:'nearest'});if(hit())out.push('UNDER-BAR '+nm(e)+' y='+Math.round(r.top)+'..'+Math.round(r.bottom));}}}
return out;}"""

# known intended clips (single-line ellipsis labels that carry the full text in title/aria-label), matched as substring of the finding
ALLOW = []  # intended swipe carousels are excluded in CHECK_JS: #libcards (home), #dr-strip (draw glyph strip)


def audit(pg, phone):
    res = pg.evaluate(CHECK_JS, phone)
    return [r for r in res if not any(a in r for a in ALLOW)]
