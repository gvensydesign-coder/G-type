/* ---- cells -> contours (pure; nodes {x,y,a,b}) ---- */
const PXR=(function(){
const KAP=0.5523;
const nd=(x,y)=>({x,y,a:null,b:null});
function rectNodes(x0,y0,x1,y1){return [nd(x0,y0),nd(x1,y0),nd(x1,y1),nd(x0,y1)];}
function roundRectNodes(x0,y0,x1,y1,r){r=Math.min(r,(x1-x0)/2,(y1-y0)/2);if(r<0.5)return rectNodes(x0,y0,x1,y1);const k=r*(1-KAP);
  /* counter-clockwise starting bottom-left after the corner */
  return [{x:x0+r,y:y0,a:{x:x0+k,y:y0},b:null},{x:x1-r,y:y0,a:null,b:{x:x1-k,y:y0}},
    {x:x1,y:y0+r,a:{x:x1,y:y0+k},b:null},{x:x1,y:y1-r,a:null,b:{x:x1,y:y1-k}},
    {x:x1-r,y:y1,a:{x:x1-k,y:y1},b:null},{x:x0+r,y:y1,a:null,b:{x:x0+k,y:y1}},
    {x:x0,y:y1-r,a:{x:x0,y:y1-k},b:null},{x:x0,y:y0+r,a:null,b:{x:x0,y:y0+k}}];}
function circleNodes(cx,cy,r){const k=r*KAP;return [{x:cx+r,y:cy,a:{x:cx+r,y:cy-k},b:{x:cx+r,y:cy+k}},{x:cx,y:cy+r,a:{x:cx+k,y:cy+r},b:{x:cx-k,y:cy+r}},
  {x:cx-r,y:cy,a:{x:cx-r,y:cy+k},b:{x:cx-r,y:cy-k}},{x:cx,y:cy-r,a:{x:cx-k,y:cy-r},b:{x:cx+k,y:cy-r}}];}
function diamondNodes(cx,cy,r){return [nd(cx+r,cy),nd(cx,cy+r),nd(cx-r,cy),nd(cx,cy-r)];}
/* union of axis-aligned rects -> loops of points [[x,y]...] (outer CCW, holes CW), diagonal touches are kept as separate loops */
function unionRects(rects){
  const xs=[...new Set(rects.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b),ys=[...new Set(rects.flatMap(r=>[r[1],r[3]]))].sort((a,b)=>a-b);
  const nx=xs.length-1,ny=ys.length-1;if(nx<1||ny<1)return [];
  const xi=new Map(xs.map((v,i)=>[v,i])),yi=new Map(ys.map((v,i)=>[v,i]));
  const F=new Uint8Array(nx*ny);
  for(const [x0,y0,x1,y1] of rects){for(let j=yi.get(y0);j<yi.get(y1);j++)for(let i=xi.get(x0);i<xi.get(x1);i++)F[j*nx+i]=1;}
  const f=(i,j)=>i>=0&&j>=0&&i<nx&&j<ny&&F[j*nx+i]===1;
  /* directed edges with the inside on the left (CCW outer) */
  const E=new Map();const key=(i,j)=>i*(ny+2)+j;
  const add=(a,b)=>{const k=key(a[0],a[1]);(E.get(k)||E.set(k,[]).get(k)).push(b);};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(!F[j*nx+i])continue;
    if(!f(i,j-1))add([i,j],[i+1,j]);          /* bottom edge, going right */
    if(!f(i+1,j))add([i+1,j],[i+1,j+1]);      /* right edge, going up */
    if(!f(i,j+1))add([i+1,j+1],[i,j+1]);      /* top edge, going left */
    if(!f(i-1,j))add([i,j+1],[i,j]);}         /* left edge, going down */
  const loops=[];
  while(E.size){const k0=E.keys().next().value;const arr0=E.get(k0);const i0=Math.floor(k0/(ny+2)),j0=k0%(ny+2);let a=[i0,j0],b=arr0.shift();if(!arr0.length)E.delete(k0);
    const L=[a];let prev=a,cur=b,guard=0;
    while(!(cur[0]===L[0][0]&&cur[1]===L[0][1])&&guard++<100000){L.push(cur);const kk=key(cur[0],cur[1]);const out=E.get(kk);if(!out)break;
      /* choose the turn: prefer left turn (keeps diagonal touches as separate pieces) */
      const dx=cur[0]-prev[0],dy=cur[1]-prev[1];let bi=0,bs=-9;
      for(let t=0;t<out.length;t++){const ex=out[t][0]-cur[0],ey=out[t][1]-cur[1];const ex1=Math.sign(ex),ey1=Math.sign(ey);const cr=Math.sign(dx)*ey1-Math.sign(dy)*ex1;/* >0 left turn */const sc=cr>0?2:cr===0?1:0;if(sc>bs){bs=sc;bi=t;}}
      const nx2=out.splice(bi,1)[0];if(!out.length)E.delete(kk);prev=cur;cur=nx2;}
    loops.push(L.map(p=>[xs[p[0]],ys[p[1]]]));}
  return loops;}
/* drop collinear points */
function simplify(P){const o=[];const n=P.length;for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])!==0)o.push(b);}return o;}
function loopNodes(P,r){/* P polygon (rectilinear); round convex corners with radius r */
  P=simplify(P);const n=P.length;let area=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1];}const ccw=area>0;
  if(!(r>0.5))return P.map(p=>nd(p[0],p[1]));
  const out=[];
  for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);const convex=cross>0;
    if(!convex){out.push(nd(b[0],b[1]));continue;}
    const la=Math.hypot(b[0]-a[0],b[1]-a[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);const rr=Math.min(r,la/2,lc/2);
    const p1=[b[0]+(a[0]-b[0])/la*rr,b[1]+(a[1]-b[1])/la*rr],p2=[b[0]+(c[0]-b[0])/lc*rr,b[1]+(c[1]-b[1])/lc*rr];const k=1-KAP;
    out.push({x:p1[0],y:p1[1],a:null,b:{x:p1[0]+(b[0]-p1[0])*(1-k)*1,y:p1[1]+(b[1]-p1[1])*(1-k)*1}});
    out.push({x:p2[0],y:p2[1],a:{x:p2[0]+(b[0]-p2[0])*(1-k),y:p2[1]+(b[1]-p2[1])*(1-k)},b:null});}
  return out;}
/* main: cells [[x,y]], u (px size), shape 0 square 1 dot 2 rounded 3 diamond, gap (units), stag 0/1/2 */
function render(cells,u,shape,gap,stag){
  const out=[];if(!cells.length)return out;
  const g=Math.max(0,gap),h=u/4;
  const pos=c=>{let x=c[0]*u,y=c[1]*u;if(stag===1){const odd=((c[1]%2)+2)%2;x+=odd?h:-h;}else if(stag===2){const odd=((c[0]%2)+2)%2;y+=odd?h:-h;}return [x,y];};
  const P=cells.map(c=>pos(c));
  const sq=shape===0||shape===2;
  if(sq&&g<0.5){/* merged union */
    const rects=P.map(p=>[p[0],p[1],p[0]+u,p[1]+u]);const loops=unionRects(rects);const r=shape===2?0.3*u:0;
    for(const L of loops){const nodes=loopNodes(L,r);let ar=0;const n=nodes.length;for(let i=0;i<n;i++){const a=nodes[i],b=nodes[(i+1)%n];ar+=a.x*b.y-b.x*a.y;}out.push({nodes,hole:ar<0});}
    return out;}
  const gg=sq?g:Math.max(g,Math.max(2,u*0.04));/* round / diamond: «0» = touching, tiny clearance keeps contours separate */
  const s=u-gg,m=gg/2;
  for(const p of P){const x0=p[0]+m,y0=p[1]+m,x1=x0+s,y1=y0+s;let nodes;
    if(shape===0)nodes=rectNodes(x0,y0,x1,y1);else if(shape===2)nodes=roundRectNodes(x0,y0,x1,y1,0.3*u);
    else if(shape===1)nodes=circleNodes(p[0]+u/2,p[1]+u/2,s/2);else nodes=diamondNodes(p[0]+u/2,p[1]+u/2,s/2+(u-s)*0+0);
    out.push({nodes,hole:false});}
  return out;}
return {render,unionRects,loopNodes};})();
if(typeof module!=='undefined')module.exports=PXR;
