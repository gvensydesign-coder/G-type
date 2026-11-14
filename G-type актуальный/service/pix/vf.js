/* ===== variable weight (wght) for «Пиксель» =====
   Masters must be point-compatible while static weights change the cell topology, so the VF uses ONE topology: the Regular cell map.
   Weight = rectilinear offset of the merged Regular outline; vertex k of every master is vertex k of the same polygon
   (point-compatible by construction, no matcher needed).
   - dx, dy (cells) = static ladder (PXE.ctx sv/sh of Light/Bold/Black) minus Regular, per axis; Black goes a quarter cell further than Bold where the static ladder gives Bold == Black.
   - x: left faces stay, right faces move 2*dx (grid-aligned). y: symmetric growth by dy per face plus a piecewise-linear remap that pins the baseline,
     x-height, cap height, descender and glyph extremes (metrics never drift, vertex order is kept).
   - Static Bold/Black glyphs are wider than the dilated outline (counters keep their width): the missing width E is given to the emptiest columns (cell-rounded),
     so slits do not close and advances match the static family.
   - Per glyph the offset is scaled back (fx, fy) where a counter / stroke would close (clearance EPS cell): every master is a valid simple polygon set;
     outer loops may overlap (diagonal contacts) - nonzero fill renders the union.
   Grid shape: square or rounded (pshape 2) is kept; dot / diamond / gap / stagger are not part of the VF (solid grid is exported). */
const PXVF=(function(){
const EPS=0.34,STEP=0.1;
const cache=new Map();
function simplify(P){const n=P.length,o=[];for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])!==0)o.push(b);}return o;}
const area=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
/* cells -> loops [{P:[[x,y]..] (cell units, material on the left), hole, vx, sy}]; vx = x multiplier (left faces 0, right faces 2: x' = x + vx*dx), sy = outward y sign of the face */
function loopsOf(cells){
  const rects=cells.map(c=>[c[0],c[1],c[0]+1,c[1]+1]);
  const L=PXR.unionRects(rects).map(simplify).filter(P=>P.length>=4);
  return L.map(P=>{const n=P.length,vx=new Array(n),sy=new Array(n);
    for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];
      for(const [p,q] of [[a,b],[b,c]]){const ex=q[0]-p[0],ey=q[1]-p[1];
        if(ex===0)vx[i]=ey>0?2:0; /* going up = right-facing face (material on the left) */
        else sy[i]=-Math.sign(ex);}} /* going left = top face (+1), going right = bottom face (-1) */
    return {P,hole:area(P)<0,vx,sy};});}
/* y: symmetric growth (top faces up, bottom faces down by dy) and a piecewise-linear remap that pins lines carrying only top or only bottom faces
   (baseline, x-height, cap height, descender, glyph extremes), so metrics do not drift and every master keeps its vertex order */
function lineSet(K,loops){
  const s=new Set([-K.D,0,K.X,K.H]);let lo=1e9,hi=-1e9;
  for(const L of loops)for(const p of L.P){if(p[1]<lo)lo=p[1];if(p[1]>hi)hi=p[1];}
  s.add(lo);s.add(hi);return {lines:[...s].sort((a,b)=>a-b),lo,hi};}
function anchorsOf(loops,LS,dy){
  const top=new Set(),bot=new Set();
  for(const L of loops){const n=L.P.length;for(let i=0;i<n;i++){const a=L.P[i],b=L.P[(i+1)%n];if(a[1]===b[1])(b[0]<a[0]?top:bot).add(a[1]);}}
  const an=[];
  for(const y of LS.lines){if(y<LS.lo||y>LS.hi)continue;const t=top.has(y),b=bot.has(y);if(t&&!b)an.push([y+dy,y]);else if(b&&!t)an.push([y-dy,y]);}
  an.sort((p,q)=>p[0]-q[0]);
  const o=[];for(const a of an){const l=o[o.length-1];if(!l||(a[0]>l[0]+1e-9&&a[1]>l[1]+1e-9))o.push(a);}
  return o;}
function remap(an,y){
  if(!an.length)return y;
  if(y<=an[0][0])return an[0][1]+(y-an[0][0]);
  for(let i=0;i<an.length-1;i++){const a=an[i],b=an[i+1];if(y<=b[0])return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}
  const l=an[an.length-1];return l[1]+(y-l[0]);}
function xform(c,dx,dy,S){
  const an=anchorsOf(c.loops,c.LS,dy);
  return c.loops.map(L=>({hole:L.hole,P:L.P.map((p,i)=>[p[0]+L.vx[i]*dx+(S?S(p[0]):0),remap(an,p[1]+L.sy[i]*dy)])}));}
const sdist=(a,b)=>{const dx=Math.max(0,Math.max(Math.min(a[0],a[2]),Math.min(b[0],b[2]))-Math.min(Math.max(a[0],a[2]),Math.max(b[0],b[2]))),
  dy=Math.max(0,Math.max(Math.min(a[1],a[3]),Math.min(b[1],b[3]))-Math.min(Math.max(a[1],a[3]),Math.max(b[1],b[3])));return Math.hypot(dx,dy);};
function edgesOf(loops){const E=[];loops.forEach((L,li)=>{const n=L.P.length;for(let i=0;i<n;i++){const a=L.P[i],b=L.P[(i+1)%n];E.push([a[0],a[1],b[0],b[1],li,i,n,L.hole]);}});return E;}
function baseOf(loops){const E=edgesOf(loops),D=new Float32Array(E.length*E.length);
  for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++)D[i*E.length+j]=sdist(E[i],E[j]);return {E,D};}
/* valid master: every edge keeps its direction and stays >= EPS long; no two non-adjacent edges closer than EPS (outer-outer overlaps are unions; every other contact, also a pinch that already exists, locks the glyph at its Regular shape) */
function validAt(c,dx,dy,why,S){
  const E=edgesOf(xform(c,dx,dy,S)),base=c.base;
  for(let k=0;k<E.length;k++){const e=E[k],o=base.E[k],ux=Math.sign(o[2]-o[0]),uy=Math.sign(o[3]-o[1]);
    const len=(e[2]-e[0])*ux+(e[3]-e[1])*uy;
    if(len<EPS-1e-9){if(why)why.push('edge '+k+' len '+len.toFixed(2)+' at '+o[0]+','+o[1]);return false;}}
  for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){
    const a=E[i],b=E[j];
    if(a[4]===b[4]){const d=Math.abs(i-j);if(d<=1||d===a[6]-1)continue;}
    if(!a[7]&&!b[7]&&a[4]!==b[4])continue;
    if(sdist(a,b)<EPS-1e-9){if(why)why.push('pair '+i+'/'+j+' d '+sdist(a,b).toFixed(2));return false;}}
  return true;}
/* extra width E (cells, integer-rounded cumulative) goes to the emptiest columns (weight = emptiness^2) */
function stretchOf(cells,E){
  if(!(E>0))return null;
  let xa=1e9,xb=-1e9,ya=1e9,yb=-1e9;for(const c of cells){xa=Math.min(xa,c[0]);xb=Math.max(xb,c[0]);ya=Math.min(ya,c[1]);yb=Math.max(yb,c[1]);}
  const n=xb-xa+1,rows=yb-ya+1,cnt=new Array(n).fill(0);for(const c of cells)cnt[c[0]-xa]++;
  const w=cnt.map(k=>{const e=1-k/rows;return e*e;}),tot=w.reduce((a,b)=>a+b,0);
  if(!(tot>0))return null;
  const cum=[0];for(let i=0;i<n;i++)cum.push(cum[i]+E*w[i]/tot);
  const r=cum.map(v=>Math.round(v));
  return x=>r[Math.max(0,Math.min(n,x-xa))];}
function fit(c,Dx,Dy,Ws){
  const Ef=dx=>Math.max(0,Math.min(4,Ws==null?0:Ws-c.W-2*dx));
  const sf=dx=>stretchOf(c.cells,Math.round(Ef(dx)));
  let fx=1;if(Dx!==0)while(fx>1e-9&&!validAt(c,Dx*fx,0,null,sf(Dx*fx)))fx=Math.round((fx-STEP)*1e6)/1e6;
  fx=Math.max(0,fx);
  const dx=Dx*fx,S=sf(dx);
  let fy=1;if(Dy!==0)while(fy>1e-9&&!validAt(c,dx,Dy*fy,null,S))fy=Math.round((fy-STEP)*1e6)/1e6;
  fy=Math.max(0,fy);
  return {dx,dy:Dy*fy,fx,fy,E:Math.round(Ef(dx)),S};}
/* target offsets (cells, per face pair) of master weight w: static ladder minus Regular */
function targets(q,w){
  const ctx=pn=>PXE.ctx(q.res,pxFam(q,pn),q.pserif);
  const R=ctx('Regular'),M={Light:ctx('Light'),Bold:ctx('Bold'),Black:ctx('Black')};
  const d=K=>[(K.sv-R.sv)/2,(K.sh-R.sh)/2];
  let t;
  if(w<400)t=d(M.Light);else if(w===400)t=[0,0];else{
    const b=d(M.Bold),k=d(M.Black);
    /* Black = static Black; where the static ladder gives Bold == Black (low res) Black goes a quarter cell further so the instances stay distinct */
    t=(k[0]===b[0]&&k[1]===b[1])&&w>700?[b[0]+0.25,b[1]+0.25]:(w<=700?b:k);}
  return t;}
function build(d,q,pe){
  const q0=Object.assign({},q,{pshape:0,pgap:0,pstag:0});delete q0.pvfw;
  const b=pxBuild(d,q0,pe),cells=b.cells;
  const key=d.px.id+'|'+q.res+'|'+q.pw+'|'+q.pserif+'|'+q.slant+'|'+q.ptr+'|'+(pe?JSON.stringify(pe):'')+'|'+(d.px.pad?1:0);
  let c=cache.get(key);
  if(!c){let xa=1e9,xb=-1e9;for(const k of cells){xa=Math.min(xa,k[0]);xb=Math.max(xb,k[0]);}
    const K=pxCtx(q.res,q.pw,q.pserif),loops=cells.length?loopsOf(cells):[];
    c={cells,loops,LS:lineSet(K,loops),base:baseOf(loops),W:xb-xa+1,fits:{}};if(cache.size>3000)cache.clear();cache.set(key,c);}
  return {b,c,q0};}
/* VF glyph at master weight q.pvfw: Regular cell map (q.pw = Regular) offset per target; returns {cs,adv,w} */
function glyph(d,q,pe){
  const w=q.pvfw,{b,c,q0}=build(d,q,pe),u=q.pu;
  if(!c.cells.length)return {cs:[],adv:b.adv,w:b.w};
  const wk=w<400?300:w===400?400:w<=700?700:900; /* master weights; the VF only samples the 4 masters */
  let f=c.fits[wk];
  if(!f){
    if(wk===400)f={dx:0,dy:0,E:0,S:null};
    else{const [Dx,Dy]=targets(q,wk),qs=Object.assign({},q0,{pw:pxFam(q,wk===300?'Light':wk===700?'Bold':'Black')});
      f=fit(c,Dx,Dy,pxBuild(d,qs,pe).w/u);}
    c.fits[wk]=f;}
  const T=xform(c,f.dx,f.dy,f.S);
  const cs=T.map(L=>{const P=L.P.map(p=>[p[0]*u,p[1]*u]);
    const nodes=q.pshape===2?PXR.loopNodes(P,0.3*u):simplify(P).map(p=>({x:p[0],y:p[1],a:null,b:null}));
    return mkc(nodes,L.hole);});
  return {cs,adv:b.adv+(2*f.dx+f.E)*u,w:b.w+(2*f.dx+f.E)*u,fit:f};}
return {glyph,build,targets,validAt,EPS};})();
if(typeof VFX_FONT_AXES==='object')VFX_FONT_AXES.pixel=['wght'];
FONTS.pixel.px.vf=PXVF; /* test access */
/* masters (core3v): identical polygons in every master -> trivial point matching; no defect extras (validity is built into the masters) */
{const _vmg=vfMatchGlyph,_vdf=vfDefect;
 vfMatchGlyph=function(masters,coords,def){
  if(CUR_FONT==='pixel'){
    const m0=masters[0];
    if(masters.every(m=>m.length===m0.length&&m.every((c,i)=>c.segs.length===m0[i].segs.length&&!!c.hole===!!m0[i].hole)))
      return {conts:m0.map((c,i)=>masters.map(m=>m[i].segs)),collapsed:0};}
  return _vmg(masters,coords,def);};
 vfDefect=function(g){return CUR_FONT==='pixel'?null:_vdf(g);};}
