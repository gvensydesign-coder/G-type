/* ---------- «Аппликация»: движок бумажных кусков ----------
   Кусок = многоугольник (4–9 вершин) + необязательные дыры-счётчики; всё считается в координатах знака (x 0..W, y 0..H, H = высота прописных).
   Случайность: seed = hash(канонический id знака | регистр | вариант) -> mulberry32; число обращений к генератору на знак постоянно,
   поэтому ползунки меняют форму непрерывно, а сборка стабильна. */
const aHash=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;};
function aRng(seed){let a=seed>>>0||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const aCL=(v,a,b)=>Math.max(a,Math.min(b,v));
const aAreaV=v=>{let s=0;for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];s+=a.x*b.y-b.x*a.y;}return s/2;};
const aCent=v=>{let x=0,y=0;for(const q of v){x+=q.x;y+=q.y;}return [x/v.length,y/v.length];};
/* вершины: {x,y,soft}; soft = выпуклость мягкого (кривого) реза на ребре к следующей вершине, доля длины */
const V=(x,y,soft)=>({x,y,soft:soft||0});
function ccw(v){return aAreaV(v)>=0?v:v.slice().reverse().map((q,i,arr)=>({x:q.x,y:q.y,soft:0}));}
/* прямоугольник со срезанными углами. sn = [bl,br,tr,tl]; элемент: число s | [s,'soft'] | [sx,sy] | [sx,sy,'soft'] */
function aRect(x0,y0,x1,y1,sn){sn=sn||[0,0,0,0];
  const sz=e=>{if(!e)return null;if(typeof e==='number')return e>0?[e,e,0]:null;const soft=e[e.length-1]==='soft'?0.2:0;const nums=e.filter(z=>typeof z==='number');const sx=nums[0],sy=nums.length>1?nums[1]:nums[0];return sx>0?[sx,sy,soft]:null;};
  const bl=sz(sn[0]),br=sz(sn[1]),tr=sz(sn[2]),tl=sz(sn[3]),v=[];
  /* срезы на одной стороне не должны налезать друг на друга: сумма <= 0.82 длины стороны */
  const Wd=x1-x0,Hd=y1-y0,fitE=(a,ia,b,ib,len)=>{if(a&&b&&a[ia]+b[ib]>0.82*len){const k=0.82*len/(a[ia]+b[ib]);a[ia]*=k;b[ib]*=k;}};
  fitE(bl,0,br,0,Wd);fitE(tl,0,tr,0,Wd);fitE(bl,1,tl,1,Hd);fitE(br,1,tr,1,Hd);
  for(const c of [bl,br,tr,tl])if(c){c[0]=Math.min(c[0],0.45*Wd);c[1]=Math.min(c[1],0.45*Hd);}
  if(bl)v.push(V(x0,y0+bl[1],bl[2]),V(x0+bl[0],y0));else v.push(V(x0,y0));
  if(br)v.push(V(x1-br[0],y0,br[2]),V(x1,y0+br[1]));else v.push(V(x1,y0));
  if(tr)v.push(V(x1,y1-tr[1],tr[2]),V(x1-tr[0],y1));else v.push(V(x1,y1));
  if(tl)v.push(V(x0+tl[0],y1,tl[2]),V(x0,y1-tl[1]));else v.push(V(x0,y1));
  return v;}
/* br: ребро среза идёт от (x1-s,y0) к (x1,y0+s) -> мягкость на первой точке пары */
/* лента от p0 к p1, ширина w0 -> w1, косые срезы концов ka,kb (радианы) */
function aStrip(p0,p1,w0,w1,ka,kb){const dx=p1[0]-p0[0],dy=p1[1]-p0[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,nx=-uy,ny=ux;ka=ka||0;kb=kb||0;
  const a0=[p0[0]-nx*w0/2-ux*Math.tan(ka)*w0/2,p0[1]-ny*w0/2-uy*Math.tan(ka)*w0/2],a1=[p0[0]+nx*w0/2+ux*Math.tan(ka)*w0/2,p0[1]+ny*w0/2+uy*Math.tan(ka)*w0/2];
  const b0=[p1[0]-nx*w1/2-ux*Math.tan(kb)*w1/2,p1[1]-ny*w1/2-uy*Math.tan(kb)*w1/2],b1=[p1[0]+nx*w1/2+ux*Math.tan(kb)*w1/2,p1[1]+ny*w1/2+uy*Math.tan(kb)*w1/2];
  return [V(a0[0],a0[1]),V(b0[0],b0[1]),V(b1[0],b1[1]),V(a1[0],a1[1])];}
/* срезать угол i многоугольника на s вдоль обоих рёбер */
function aSnip(v,i,s,soft){const n=v.length,p=v[(i+n-1)%n],c=v[i],q=v[(i+1)%n];
  const d1=Math.hypot(p.x-c.x,p.y-c.y)||1,d2=Math.hypot(q.x-c.x,q.y-c.y)||1;s=Math.min(s,0.4*d1,0.4*d2);
  const a=V(c.x+(p.x-c.x)/d1*s,c.y+(p.y-c.y)/d1*s,soft?0.2:0),b=V(c.x+(q.x-c.x)/d2*s,c.y+(q.y-c.y)/d2*s,c.soft);
  const o=v.slice();o.splice(i,1,a,b);return o;}
/* полоса вдоль дуги эллипса (многоугольная: n прямых резов). углы в градусах, 0 = вправо, против часовой */
function aArc(cx,cy,rx,ry,t0,t1,a0,a1,n,kv){kv=kv==null?0.9:kv;const out=[],inn=[];
  for(let k=0;k<=n;k++){const f=k/n,a=(a0+(a1-a0)*f)*Math.PI/180,t=t0+(t1-t0)*f;
    out.push(V(cx+rx*Math.cos(a),cy+ry*Math.sin(a)));inn.push(V(cx+(rx-t)*Math.cos(a),cy+(ry-t*kv)*Math.sin(a)));}
  return ccw(out.concat(inn.reverse()));}
/* ---------- превращение куска в контур: срезы, мягкие дуги, тупые углы, рваный край ---------- */
function aNodes(v,o){const n=v.length,rb=o.blunt,P=[];
  for(let i=0;i<n;i++){const p=v[(i+n-1)%n],c=v[i],q=v[(i+1)%n];
    const d1=Math.hypot(p.x-c.x,p.y-c.y)||1,d2=Math.hypot(q.x-c.x,q.y-c.y)||1;
    /* угол между рёбрами: чем острее, тем сильнее тупим (но не больше трети ребра) */
    const ux=(p.x-c.x)/d1,uy=(p.y-c.y)/d1,wx=(q.x-c.x)/d2,wy=(q.y-c.y)/d2,cs=aCL(ux*wx+uy*wy,-1,1),ang=Math.acos(cs);
    let r=rb*(ang<1.2?1+(1.2-ang)*1.4:1);if(ang>2.9)r=0;
    r=Math.min(r,0.32*d1,0.32*d2);
    if(r<1.5){P.push({x:c.x,y:c.y,a:{x:c.x,y:c.y},b:{x:c.x,y:c.y},corner:1,e:i});continue;}
    const p1={x:c.x+ux*r,y:c.y+uy*r},p2={x:c.x+wx*r,y:c.y+wy*r},k=0.62;
    P.push({x:p1.x,y:p1.y,a:{x:p1.x,y:p1.y},b:{x:p1.x+(c.x-p1.x)*k,y:p1.y+(c.y-p1.y)*k},e:i,in:1});
    P.push({x:p2.x,y:p2.y,a:{x:p2.x+(c.x-p2.x)*k,y:p2.y+(c.y-p2.y)*k},b:{x:p2.x,y:p2.y},e:i,out:1});}
  /* рёбра: между исходящим узлом вершины i и входящим узлом вершины i+1 — прямой рез, мягкий рез (кубика) или рваная кромка */
  const res=[];
  for(let k=0;k<P.length;k++){const A=P[k],B=P[(k+1)%P.length];const isOut=A.out||A.corner,isIn=B.in||B.corner;
    res.push(A);
    if(!(isOut&&isIn&&(B.e===(A.e+1)%n)))continue;
    const edge=v[A.e];const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1;
    if(edge.soft>0){const nx=dy/L,ny=-dx/L,bg=edge.soft*L;A.b={x:A.x+dx*0.3+nx*bg,y:A.y+dy*0.3+ny*bg};B.a={x:B.x-dx*0.3+nx*bg,y:B.y-dy*0.3+ny*bg};}
    else if(o.tearEdge&&o.tearEdge.has(A.e)&&L>110){
      const rr=o.tearRng,amp=o.tearAmp,wl=o.tearWl,m=Math.max(3,Math.round(L/wl)),nx=dy/L,ny=-dx/L;
      A.b={x:A.x,y:A.y};
      for(let j=1;j<m;j++){const f=j/m,env=Math.min(1,Math.min(f,1-f)*6),nr=rr(),nd=rr();let off=(rr()*2-1)*amp*env;if(nr<0.16&&env>.8)off=-(amp*1.1+6+nd*9);const al=(rr()*2-1)*0.25*L/m;
        const x=A.x+dx*(f+al/L)+nx*off,y=A.y+dy*(f+al/L)+ny*off;res.push({x,y,a:{x,y},b:{x,y},corner:1,torn:1});}
      B.a={x:B.x,y:B.y};}
    else{A.b={x:A.x,y:A.y};B.a={x:B.x,y:B.y};}}
  return res;}
function aXfNodes(nodes,fn){return nodes.map(n=>{const q=fn(n.x,n.y),a=fn(n.a.x,n.a.y),b=fn(n.b.x,n.b.y);return {x:q[0],y:q[1],a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]}};});}
/* дискретизация контура для проверок / спейсинга (кубики -> 8 точек) */
function aFlat(nodes,steps){steps=steps||6;const pts=[],n=nodes.length;for(let i=0;i<n;i++){const a=nodes[i],b=nodes[(i+1)%n];
  const straight=a.b.x===a.x&&a.b.y===a.y&&b.a.x===b.x&&b.a.y===b.y;
  if(straight){pts.push([a.x,a.y]);continue;}
  for(let s=0;s<steps;s++){const t=s/steps,u=1-t;pts.push([u*u*u*a.x+3*u*u*t*a.b.x+3*u*t*t*b.a.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*a.b.y+3*u*t*t*b.a.y+t*t*t*b.y]);}}return pts;}
/* расстояние между многоугольниками (0, если пересекаются) */
function aSegX(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;}
function aPtSeg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;let t=l2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2:0;t=aCL(t,0,1);return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
function aPolyIn(p,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){if((P[i][1]>p[1])!==(P[j][1]>p[1])&&p[0]<(P[j][0]-P[i][0])*(p[1]-P[i][1])/(P[j][1]-P[i][1])+P[i][0])c=!c;}return c;}
function aPolyDist(P,Q){const n=P.length,m=Q.length;let best=1e9;
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){if(aSegX(P[i],P[(i+1)%n],Q[j],Q[(j+1)%m]))return 0;}
  if(aPolyIn(P[0],Q)||aPolyIn(Q[0],P))return 0;
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){best=Math.min(best,aPtSeg(P[i],Q[j],Q[(j+1)%m]),aPtSeg(Q[j],P[i],P[(i+1)%n]));}return best;}
