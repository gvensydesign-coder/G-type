/* ===== «Аппликация» (Applikatsiya Paper): детская бумажная аппликация, куски-многоугольники + зерно по id знака. Части: applik/engine.js build.js glyphs.js api.js (сборка mk_applik.sh) ===== */
(function(){
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
/* ---------- сборка знака: куски -> шумы реза -> зазоры -> наклон/высота/линия -> поля ---------- */
const AREC={};const ALC={};   /* собственные вырезы строчных (юникейс, но другая конструкция) */
const aRecOf=(id,lc)=>(lc&&ALC[id])||AREC[id];            /* канонические рецепты: id -> {w(H,S), f(K) -> [куски]} */
const AU=1; /* единица UPM = 1/1000 em */
function aKit(id,lc,p,seedAdd){
  const sc=lc?p.lcs:1,H=p.capH*sc,S=p.stem*(lc?0.96:1);
  const rg=aRng(aHash(id+'|'+(lc?1:0)+'|'+(p.seed|0)+'|'+(seedAdd|0)));
  const jf=Math.min(p.jit/50,1.4),ma=0.11+0.12*jf;
  const hf=aCL(Math.pow(150/p.stem,0.45),0.7,1.25);const K={H,S,p,sc,lc,jf,id,hf};
  K.r=()=>rg()*2-1;K.u=()=>rg();
  K.sm=[0,1,2,3].map(()=>1+ma*K.r()+0.03);
  K.s=i=>S*K.sm[i&3];
  /* личность знака: наклон, линия, высота — из первых обращений к генератору (до чертежа) */
  K.pers={lean:K.r(),base:K.r(),hgt:K.r(),wid:K.r()};
  K.pieces=[];
  const P=(v,o)=>{const q=Object.assign({v:ccw(v),h:[]},o||{});return q;};
  K.P=P;
  K.rect=aRect;
  K.snip=(v,i,s,soft)=>aSnip(v,i,s,soft);
  /* автосрез угла: «ножницами подрезали» (3 обращения всегда) */
  K.auto=(v,w,prob)=>{const u1=K.u(),u2=K.u(),u3=K.u();if(u1<(prob==null?0.38:prob)){const i=Math.floor(u2*v.length);return aSnip(v,i,Math.max(14,w*(0.2+0.14*u3)),u3>0.8);}return v;};
  K.strip=(p0,p1,w0,w1,o)=>{o=o||{};const ka=K.r()*0.13,kb=K.r()*0.13;
    if(o.lap&&p.lap>0){const dx=p1[0]-p0[0],dy=p1[1]-p0[1],L=Math.hypot(dx,dy)||1,e=p.lap/100*0.5*S;p0=[p0[0]-dx/L*e,p0[1]-dy/L*e];p1=[p1[0]+dx/L*e,p1[1]+dy/L*e];}
    let v=aStrip(p0,p1,w0,w1,o.flat?0:ka,o.flat?0:kb);v=K.auto(v,Math.min(w0,w1),o.sn==null?0.38:o.sn);const q=P(v,o);q.st={p0,p1,w0,w1};return q;};
  K.vs=(x,y0,y1,w,dx,o)=>K.strip([x,y0],[x+(dx||0),y1],w,w*((o&&o.tp)||1),o);
  K.hs=(x0,x1,y,w,dy,o)=>K.strip([x0,y],[x1,y+(dy||0)],w*hf,w*hf*((o&&o.tp)||1),Object.assign({lap:1},o));
  K.poly=(v,o)=>P(v,o);
  K.ring=(x0,y0,x1,y1,l,b,r,t,so,si,o)=>{const q=P(aRect(x0,y0,x1,y1,so),o);const hv=aRect(x0+l*0.94,y0+b*hf*0.82,x1-r*0.9,y1-t*hf*0.82,si);q.h=[hv.slice().reverse().map(z=>({x:z.x,y:z.y,soft:0}))];return q;};
  K.arc=(cx,cy,rx,ry,t0,t1,a0,a1,n,o)=>{const q=P(aArc(cx,cy,rx,ry,t0,t1,a0,a1,n,0.9*hf),o);
    if(o&&o.rd){const v=q.v,nn=v.length,c=[];for(let i=0;i<nn;i++){const a=v[i],b=v[(i+1)%nn],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,rr=((mx-cx)/rx)**2+((my-cy)/ry)**2;if(rr>.78&&Math.hypot(a.x-b.x,a.y-b.y)>60)c.push(i);}
      const k1=K.u(),k2=K.u();if(c.length){v[c[Math.floor(k1*c.length)]].soft=.12;if(c.length>3)v[c[Math.floor(k2*c.length)]].soft=.09;}}
    return q;};
  /* многоугольный «круглый» кусок: 10–13 граней, 1–2 мягких среза ножницами, перекос */
  K.blob=(x0,y0,x1,y1,o)=>{o=o||{};const n=o.n||(10+Math.floor(K.u()*4)),rot=K.r()*.22,cx=(x0+x1)/2,cy=(y0+y1)/2,rx=(x1-x0)/2,ry=(y1-y0)/2;
    const k1=Math.floor(K.u()*n),k2=Math.floor(K.u()*n),two=K.u()<.5,sf=.07+.07*K.u(),cf=1/Math.cos(Math.PI/n)*.985;
    const v=[];for(let i=0;i<n;i++){const a=rot+Math.PI*2*i/n+K.r()*.07,rr=cf+K.r()*.03;v.push(V(cx+rx*rr*Math.cos(a),cy+ry*rr*Math.sin(a),(i===k1||(two&&i===k2))?sf:0));}
    return v;};
  K.oring=(x0,y0,x1,y1,l,b,r,t,o)=>{const q=P(K.blob(x0,y0,x1,y1,o));
    const hx0=x0+l*.94,hy0=y0+b*hf*.82,hx1=x1-r*.9,hy1=y1-t*hf*.82,rx=(hx1-hx0)/2,ry=(hy1-hy0)/2;
    const cx=(hx0+hx1)/2+K.r()*rx*.06,cy=(hy0+hy1)/2+K.r()*ry*.05,rot=K.r()*.24,n=7+Math.floor(K.u()*3),hv=[];
    for(let i=0;i<n;i++){const a=rot+Math.PI*2*i/n;hv.push({x:cx+rx*Math.cos(a),y:cy+ry*Math.sin(a),soft:0});}
    q.h=[hv.reverse()];return q;};
  K.dot=(x0,y0,d,o)=>{const sn=d*0.22;return P(aRect(x0,y0,x0+d,y0+d*(0.96+0.08*K.u()),[sn*(0.5+K.u()),sn*(0.5+K.u()),sn*(0.5+K.u()),sn*(0.5+K.u())]),o);};
  /* случайный размер среза для колец */
  K.sn=(f,b)=>f*(0.6+0.8*K.u())+(b||0);
  return {K,rg};}
const aWmin=(f,n,e)=>(H,S)=>Math.max(f*H,n*S+(e||0));
function aPieceY(pc){let m=1e9;for(const q of pc.v)m=Math.min(m,q.y);return m;}
/* сдвиг-отступ приклеенного куска: концу «у стыка» не даём доходить на gapW до остальных */
function aApplyGap(pieces,G,noGap){
  if(noGap)return;
  for(let i=0;i<pieces.length;i++){const pc=pieces[i];if(!pc.gl)continue;
    const d=pc.gl,dl=Math.hypot(d[0],d[1]),ux=d[0]/dl,uy=d[1]/dl;
    let smin=1e9,smax=-1e9;for(const q of pc.v){const s=q.x*ux+q.y*uy;smin=Math.min(smin,s);smax=Math.max(smax,s);}
    const ext=smax-smin;if(ext<200)continue;
    const others=pieces.filter((_,j)=>j!==i&&!pieces[j].mark).map(q=>q.fl);
    const mk=t=>{const f=ext>0?(1-t/ext):1;return pc.v.map(q=>{const s=q.x*ux+q.y*uy,s2=smin+t+(s-smin)*f,ds=s2-s;return [q.x+ux*ds,q.y+uy*ds];});};
    let ok=false,tt=0;
    for(let t=0;t<=0.4*ext;t+=3){const P2=mk(t);let md=1e9;for(const o of others){md=Math.min(md,aPolyDist(P2,o));}if(md>=G){ok=true;tt=t;break;}}
    if(!ok||tt>0.4*ext)continue;
    const f=1-tt/ext;
    pc.v=pc.v.map(q=>{const s=q.x*ux+q.y*uy,s2=smin+tt+(s-smin)*f,ds=s2-s;return Object.assign({},q,{x:q.x+ux*ds,y:q.y+uy*ds});});
    pc.fl=pc.v.map(q=>[q.x,q.y]);}}
const aSoftK=v=>{v=+v;if(!isFinite(v))v=50;return v<=50?v/50:1+0.6*(v-50)/50;};
const aScatK=aSoftK;
/* срез выпуклого многоугольника полуплоскостью s*(x*ux+y*uy) <= c (Сазерленд-Ходжман), мягкость новых рёбер 0 */
function aClip(v,ux,uy,c,keepLow){const out=[],n=v.length,f=q=>(keepLow?1:-1)*(q.x*ux+q.y*uy-c);
  for(let i=0;i<n;i++){const a=v[i],b=v[(i+1)%n],fa=f(a),fb=f(b);
    if(fa<=0)out.push(a);
    if((fa<0&&fb>0)||(fa>0&&fb<0)){const t=fa/(fa-fb);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,soft:0});}}
  return out;}
function aSplit(pieces,id,lc,p,seedAdd,K){
  const rs=aRng(aHash(id+'|sp|'+(lc?1:0)+'|'+(p.seed|0)+'|'+(seedAdd|0))),f=aCL(p.pcs,0,100)/100,out=[];
  pieces.forEach((pc,pi)=>{
    const u=[rs(),rs(),rs(),rs(),rs(),rs(),rs(),rs()];
    if(!pc.st||pc.gl||pc.mark||pc.v.length<4){out.push(pc);return;}
    const {p0,p1,w0,w1}=pc.st,dx=p1[0]-p0[0],dy=p1[1]-p0[1],L=Math.hypot(dx,dy);
    if(L<300||u[0]>=f*1.25){out.push(pc);return;}
    const ux=dx/L,uy=dy/L,nx=-uy,ny=ux,w=(w0+w1)/2,n3=(f>0.6&&L>470&&u[1]>0.45);
    const cuts=n3?[0.3+0.1*u[2],0.62+0.12*u[3]]:[0.36+0.28*u[2]],base=p0[0]*ux+p0[1]*uy,ovl=0.2*w,seg=[];
    const bounds=[-1e9].concat(cuts.map(t=>base+t*L)).concat([1e9]);
    for(let k=0;k<bounds.length-1;k++){
      let v=pc.v.map(q=>({x:q.x,y:q.y,soft:q.soft}));
      if(k>0)v=aClip(v,ux,uy,bounds[k]-ovl,false);
      if(k<bounds.length-2)v=aClip(v,ux,uy,bounds[k+1]+ovl,true);
      if(v.length<3)continue;
      if(k>0){const J=[p0[0]+ux*(bounds[k]-base),p0[1]+uy*(bounds[k]-base)],th=(u[4+k%3]*2-1)*(0.018+0.03*f),sh=(u[5-(k%2)]*2-1)*0.07*w,c=Math.cos(th),s=Math.sin(th);
        v=v.map(q=>{const X=q.x-J[0],Y=q.y-J[1];return {x:J[0]+X*c-Y*s+nx*sh,y:J[1]+X*s+Y*c+ny*sh,soft:0};});}
      const q=Object.assign({},pc,{v,h:[],st:null});
      /* свободный конец куска: направление от стыка к концу; стык с соседом открывается ползунком «Зазоры» */
      const mid=v.reduce((a,z)=>[a[0]+z.x/v.length,a[1]+z.y/v.length],[0,0]);
      q.gl=(k===0)?[-ux,-uy]:(k===bounds.length-2?[ux,uy]:null);
      if(!q.gl)delete q.gl;
      q.fl=v.map(z=>[z.x,z.y]);seg.push(q);}
    if(seg.length<2){out.push(pc);return;}
    seg.forEach(z=>out.push(z));});
  return out;}
function aGlyphRaw(id,lc,p,seedAdd){
  const rec=aRecOf(id,lc);if(!rec)return null;
  const {K,rg}=aKit(id,lc,p,seedAdd);
  K.W=rec.w(K.H,K.S)*(1+0.12*K.pers.wid*aScatK(p.scat));
  let pieces=rec.f(K);
  const A=p.jit/100*22*(0.55+0.45*p.stem/150)*(p.tear>0?1.1:1),rotA=p.jit/100*0.04;
  const body=[];
  pieces.forEach((pc,pi)=>{
    
    const vs=pc.v,hs=pc.h;
    const jit=(v,amp)=>{const n=v.length,out=[];for(let i=0;i<n;i++){const jx=K.r(),jy=K.r();const a=v[(i+n-1)%n],b=v[(i+1)%n],c=v[i];
        const lim=0.27*Math.min(Math.hypot(a.x-c.x,a.y-c.y),Math.hypot(b.x-c.x,b.y-c.y));let dx=jx*amp,dy=jy*amp;const m=Math.hypot(dx,dy);if(m>lim){dx*=lim/m;dy*=lim/m;}
        out.push(Object.assign({},c,{x:c.x+dx,y:c.y+dy}));}return out;};
    const rot=K.r()*rotA,cc=aCent(vs);
    pc.v=jit(vs,pc.mark?A*0.6:A);pc.h=hs.map(h=>jit(h,A*0.5));
    const cr=Math.cos(rot),sr=Math.sin(rot),rt=q=>{const x=q.x-cc[0],y=q.y-cc[1];return Object.assign({},q,{x:cc[0]+x*cr-y*sr,y:cc[1]+x*sr+y*cr});};
    pc.v=pc.v.map(rt);pc.h=pc.h.map(h=>h.map(rt));
    pc.fl=pc.v.map(q=>[q.x,q.y]);
  });
  /* мягкие резы: множитель кривизны на всех мягких рёбрах */
  const sf=aSoftK(p.soft);
  for(const pc of pieces){for(const q of pc.v)if(q.soft>0)q.soft=Math.min(0.27,q.soft*sf);for(const h of pc.h)for(const q of h)if(q.soft>0)q.soft=Math.min(0.27,q.soft*sf);}
  /* кусочки: длинные полосы режутся на 2-3 куска, склеенных внахлёст с небольшим сдвигом и поворотом */
  pieces=aSplit(pieces,id,lc,p,seedAdd,K);
  /* приклейка с зазором */
  const G=p.gap/100;
  if(G>0.12){const gw=14+(G-0.12)/0.88*34;aApplyGap(pieces,gw);}
  else if(G>0){for(const pc of pieces){if(!pc.gl)continue;}}
  return {K,rg,pieces,body};}
/* FX2g: строчные не выше 1.09·(0.86·capH): наклон/разброс высоты широких знаков (х ш я ф ж, повторяющих прописной рецепт) раньше поднимали их до высоты прописных (до +66 u над ними в Black); если верх тела выше предела — второй проход с вертикальным сжатием от строки (метки ё й не в счёт). Детерминированно: тот же зерно, тот же рецепт */
function aBuild(id,lc,p,seedAdd){let r=aBuild0(id,lc,p,seedAdd,1);
  if(lc&&r&&r.contours.length){const lim=p.capH*p.lcs*1.09;let top=-1e9;for(const c of r.contours){if(c.mark)continue;for(const n of c.nodes)if(n.y>top)top=n.y;}
    if(top>lim)r=aBuild0(id,lc,p,seedAdd,lim/top);}
  return r;}
function aBuild0(id,lc,p,seedAdd,ky){
  const raw=aGlyphRaw(id,lc,p,seedAdd);if(!raw)return null;
  const {K,pieces,body}=raw,H=K.H,P=K.pers;
  const jf=Math.min(p.jit/50,1.4);
  /* контуры */
  const sc_=aScatK(p.scat),sy=1+0.10*sc_*P.hgt,sx=1+0.03*sc_*P.wid,lean=P.lean*p.lean*1.6*Math.PI/180;
  const cx=K.W*0.5,cy=H*0.5,cl=Math.cos(lean),sl=Math.sin(lean);
  const tf=(x,y)=>{const X=(x-cx)*sx,Y=(y-cy)*sy;return [cx+X*cl-Y*sl,cy+X*sl+Y*cl];};
  /* знак стоит нижним углом коробки на строке: минимум по концам номинальной базовой линии после наклона */
  const minB=Math.min(tf(0,0)[1],tf(K.W,0)[1]);
  const base=P.base*0.07*p.capH*(p.bj/100);
  const dy=base-minB;
  const T=(x,y)=>{const t=tf(x,y);return [t[0],(t[1]+dy)*ky];};
  const contours=[],parts=[];
  pieces.forEach((pc,pi)=>{
    let tearEdge=null,trg=null;
    if(p.tear>0){trg=aRng(aHash(K.id+'|t|'+(p.seed|0)+'|'+pi+'|'+(K.lc?1:0)));
      const n=pc.v.length,L=[];for(let i=0;i<n;i++){const a=pc.v[i],b=pc.v[(i+1)%n];L.push([Math.hypot(a.x-b.x,a.y-b.y),i]);}
      L.sort((a,b)=>b[0]-a[0]);tearEdge=new Set();for(const [ln,ie] of L){if(ln>110&&trg()<0.82)tearEdge.add(ie);}if(!tearEdge.size)tearEdge.add(L[0][1]);}
    const o={blunt:p.blunt+(p.tear>0?4:0),tearEdge,tearRng:trg,tearAmp:3+12*p.tear/100,tearWl:24};
    const nodes=aNodes(pc.v,o);
    const out=aXfNodes(nodes,T);contours.push({hole:false,nodes:out,piece:pi,mark:!!pc.mark});
    parts.push(aFlat(out,5));
    pc.h.forEach(h=>{const hn=aNodes(h,{blunt:p.blunt*0.8});contours.push({hole:true,nodes:aXfNodes(hn,T),piece:pi});});
  });
  /* оптические поля: края по телу (0.08H..0.92H), клин — наполовину к среднему */
  const rec_=aRecOf(id,lc),sbk=rec_.sbk==null?1:rec_.sbk;
  const NB=18,yb0=H*0.06+dy,yb1=H*0.94+dy,Lb=[],Rb=[];
  const polys=parts;
  const scan=y=>{let lo=1e9,hi=-1e9;for(const P2 of polys){const n=P2.length;for(let i=0;i<n;i++){const a=P2[i],b=P2[(i+1)%n];if((a[1]<=y)!==(b[1]<=y)){const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);lo=Math.min(lo,x);hi=Math.max(hi,x);}}}return lo<hi?[lo,hi]:null;};
  let bbL=1e9,bbR=-1e9,bbB=1e9,bbT=-1e9;for(const P2 of polys)for(const q of P2){bbL=Math.min(bbL,q[0]);bbR=Math.max(bbR,q[0]);bbB=Math.min(bbB,q[1]);bbT=Math.max(bbT,q[1]);}
  const small=(bbT-bbB)<0.45*H||rec_.bbox;
  let eL=bbL,eR=bbR;
  if(!small){let sl_=0,sr_=0,c=0,mn=1e9,mx=-1e9;for(let b=0;b<NB;b++){const y=yb0+(yb1-yb0)*(b+0.5)/NB,r=scan(y);if(!r)continue;mn=Math.min(mn,r[0]);mx=Math.max(mx,r[1]);sl_+=r[0];sr_+=r[1];c++;}
    if(c){mn=Math.min(mn,bbL);mx=Math.max(mx,bbR);const ml=sl_/c,mr=sr_/c;eL=mn+0.5*(ml-mn);eR=mx-0.5*(mx-mr);}}
  const sb=(p.sb+0.12*(p.stem-150))*sbk;
  const shift=sb-eL,adv=Math.round(eR-eL+2*sb);
  const fin=c=>({hole:c.hole,piece:c.piece,mark:c.mark,nodes:c.nodes.map(n=>({x:Math.round((n.x+shift)*10)/10,y:Math.round(n.y*10)/10,a:{x:Math.round((n.a.x+shift)*10)/10,y:Math.round(n.a.y*10)/10},b:{x:Math.round((n.b.x+shift)*10)/10,y:Math.round(n.b.y*10)/10}}))});
  const res={id,lc,adv,contours:contours.map(fin),H,dy,lean:P.lean*p.lean*1.6,sb,nGl:pieces.filter(q=>q.gl).length};
  res.profile=aProfile(res);
  return res;}
/* профиль для кернинга: крайние x по полосам 20 ед. от -40 до 900 */
const A_B0=-40,A_BS=20,A_NB=48;
function aProfile(g){const L=new Array(A_NB).fill(null),R=new Array(A_NB).fill(null);
  const polys=g.contours.filter(c=>!c.hole).map(c=>aFlat(c.nodes,5));
  for(let b=0;b<A_NB;b++){const y=A_B0+A_BS*(b+0.5);let lo=1e9,hi=-1e9;
    for(const P2 of polys){const n=P2.length;for(let i=0;i<n;i++){const a=P2[i],c=P2[(i+1)%n];if((a[1]<=y)!==(c[1]<=y)){const x=a[0]+(y-a[1])*(c[0]-a[0])/(c[1]-a[1]);lo=Math.min(lo,x);hi=Math.max(hi,x);}}}
    if(lo<hi){L[b]=lo;R[b]=hi;}}
  return {L,R};}
/* ---------- топология знака: растр (нулевое правило), части, дыры, тонкие места — для страховки и стресс-теста ---------- */
const A_PIN=600;
function aRaster(contours,U){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const polys=contours.map(c=>aFlat(c.nodes,6));
  for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const W=Math.ceil((x1-x0)/U)+10,H=Math.ceil((y1-y0)/U)+10,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;
    for(let k=0;k<xs.length-1;k++){w+=xs[k][1];if(w!==0){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
  return {m,W,H};}
function aLabel(m,W,H,val){const L=new Int32Array(W*H).fill(-1),areas=[],q=new Int32Array(W*H);let n=0;
  for(let st=0;st<W*H;st++){if(m[st]!==val||L[st]>=0)continue;let h=0,t=0;q[t++]=st;L[st]=n;let ar=0;
    while(h<t){const k=q[h++];ar++;const i=k%W,j=(k-i)/W;
      if(i>0&&m[k-1]===val&&L[k-1]<0){L[k-1]=n;q[t++]=k-1;}if(i<W-1&&m[k+1]===val&&L[k+1]<0){L[k+1]=n;q[t++]=k+1;}
      if(j>0&&m[k-W]===val&&L[k-W]<0){L[k-W]=n;q[t++]=k-W;}if(j<H-1&&m[k+W]===val&&L[k+W]<0){L[k+W]=n;q[t++]=k+W;}}
    areas.push(ar);n++;}
  return {L,areas,n};}
const aEr=(m,W,H)=>{const o=new Uint8Array(m.length);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k]&&m[k-1]&&m[k+1]&&m[k-W]&&m[k+W])o[k]=1;}return o;};
const aDi=(m,W,H)=>{const o=new Uint8Array(m);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k-1]||m[k+1]||m[k-W]||m[k+W])o[k]=1;}return o;};
function aTopo(g,U){U=U||4;if(!g.contours.length)return {parts:[],holes:[],thin:0,slit:0};const {m,W,H}=aRaster(g.contours,U);
  const fg=aLabel(m,W,H,1),bg=aLabel(m,W,H,0),touch=new Set();
  for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
  const holes=[];for(let c=0;c<bg.n;c++)if(!touch.has(c)&&bg.areas[c]*U*U>=A_PIN)holes.push(bg.areas[c]*U*U);
  const parts=fg.areas.map(a=>a*U*U).filter(a=>a>=A_PIN||true);
  const k2=Math.round(8/U);let e=m;for(let i=0;i<k2;i++)e=aEr(e,W,H);let o=e;for(let i=0;i<k2;i++)o=aDi(o,W,H);let thin=0,ink=0;for(let k=0;k<m.length;k++){if(m[k])ink++;if(m[k]&&!o[k])thin++;}
  const d=aDi(m,W,H),c=aEr(d,W,H);let slit=0;for(let k=0;k<m.length;k++)if(c[k]&&!m[k])slit++;
  return {parts,holes,thin:ink?thin/ink:0,slit,U};}
/* ---------- рецепты знаков (юникейс; строчные = те же формы, мельче, со своим зерном) ----------
   Координаты: x 0..W, y 0..H (H = высота прописных), кусок = K.strip / K.rect / K.ring / K.arc / K.poly; gl:[dx,dy] = «приклеенный» кусок (зазор), направление от стыка к свободному концу */
const R=AREC,w=aWmin;
/* FX2g: корень полосы-ноги продлён назад по её оси (на долю длины), чтобы торец целиком лежал в стенке чаши и стойке: иначе между стойкой, низом чаши и косым торцом оставался замкнутый треугольник-пинхол (Bold/Black, 24-45 u²) */
const aBack=(p0,p1,f)=>[p0[0]+(p0[0]-p1[0])*f,p0[1]+(p0[1]-p1[1])*f];
/* ----- кириллица ----- */
R['А']={w:w(.9,3.0,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.55,0],[W*.465,H],a,a*.92),K.strip([W-b*.5,0],[W*.55,H-8],b*.9,b*.82),K.hs(W*.2,W*.84,H*.2,c*.6,H*.014)];}};
R['Б']={w:w(.66,2.2,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.82,W*.97,H-b*.42,b*.84,-H*.018,{gl:[1,0]}),
    K.ring(a*.45,0,W,H*.63,a*.66,c*.8,c*.95,c*.8,[K.sn(S*.2),[S*.9,'soft'],[S*.9,'soft'],0],[S*.14,S*.2,S*.2,S*.1])];}};
R['В']={w:w(.7,2.5,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,H*.45,W*.92,H,a*.66,b*.7,b*.92,b*.8,[0,0,[S*.9,'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0]),
    K.ring(a*.45,0,W,H*.6,a*.66,c*.8,c*.95,b*.75,[K.sn(S*.12),[S*.95,'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Г']={w:w(.52,1.7,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  let v=[V(0,0),V(a,0),V(a*1.02,H-b*.9),V(W,H-b*.82),V(W*.99,H),V(0,H)];v=aSnip(v,4,S*.3,true);return [K.poly(v)];}};
R['Д']={w:w(.78,2.8,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.6,fh=H*.17,ft=W*.15;
  const base=[V(0,-fh),V(ft,-fh),V(ft*1.1,0),V(W-ft*1.2,0),V(W-ft,-fh*.92),V(W,-fh*.92),V(W,bt),V(0,bt)];
  return [K.poly(base),K.strip([W*.27,bt*.4],[W*.45,H],a*.9,a*.82),K.strip([W*.74,bt*.4],[W*.57,H-6],b*.9,b*.8)];}};
R['Е']={w:w(.54,1.8,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.vs(a*.5,0,H,a,H*.008),K.hs(a*.3,W,H-b*.38,b*.76,-H*.014),K.hs(a*.82,W*.84,H*.5,c*.62,H*.02,{gl:[1,0]}),K.hs(a*.3,W*.95,d*.38,d*.76,H*.012)];}};
R['Ё']={w:R['Е'].w,f:K=>{const p=R['Е'].f(K),{H,S,W}=K,d=Math.max(.13*H,S*.64);
  p.push(K.dot(W*.28,H*1.1,d,{mark:1}),K.dot(W*.6,H*1.1,d,{mark:1}));return p;}};
R['Ж']={w:w(1.0,4,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.35,H],[W-a*.4,0],a*.92,a*.82),K.strip([W-b*.35,H],[b*.5,0],b*.86,b*.8),K.vs(W*.5,0,H,c*1.05,H*.01)];}};
R['З']={w:w(.62,2.2,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W*.48,H*.735,W*.43,H*.265,a*.92,a*.8,160,-90,5),K.arc(W*.5,H*.28,W*.5,H*.28,b*1.0,b*.84,92,-155,5)];}};
R['И']={w:w(.7,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.05,0,{tp:.84}),K.vs(W-b*.5,0,H,b*.88,H*.01),K.strip([a*.55,H*.07],[W-b*.55,H*.93],c*.8,c*.7)];}};
R['Й']={w:R['И'].w,f:K=>{const p=R['И'].f(K),{H,S,W}=K,t=Math.max(.1*H,S*.62);
  const v=[V(W*.26,H*1.07),V(W*.5,H*1.04,0),V(W*.74,H*1.07),V(W*.72,H*1.07+t,0),V(W*.5,H*1.07+t*.45,0),V(W*.28,H*1.07+t)];
  p.push(K.P([V(W*.24,H*1.18),V(W*.5,H*1.1,.28),V(W*.76,H*1.18),V(W*.74,H*1.18+t),V(W*.5,H*1.1+t*.7,0),V(W*.26,H*1.18+t)],{mark:1}));return p;}};
R['К']={w:w(.72,2.3,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.008),K.strip([a*.75,H*.42],[W-b*.4,H*.99],b*.84,b*.72),K.strip([a*.85,H*.52],[W-c*.4,0],c*.9,c*.8)];}};
R['Л']={w:w(.8,2.7,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.55,0],[W*.5,H],a*1.02,a*.9),K.strip([W-b*.5,0],[W*.6,H-10],b*.9,b*.82)];}};
R['М']={w:w(1.04,4,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.vs(a*.5,0,H,a,H*.012),K.vs(W-b*.5,0,H,b*.9,-H*.01),K.strip([a*.55,H*.95],[W*.5,H*.22],c*.8,c*.7),K.strip([W-b*.55,H*.95],[W*.5,H*.2],d*.78,d*.7)];}};
R['Н']={w:w(.72,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.04,-H*.012),K.vs(W-b*.5,0,H,b*.88,H*.01,{tp:.9}),K.hs(a*.4,W-b*.4,H*.47,c*.6,H*.035)];}};
R['О']={w:w(.8,2.9,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H,a,c*.82,b,c*.78,[K.sn(S*.7,24),[K.sn(S*.7,24),'soft'],K.sn(S*.8,20),K.sn(S*.6,20)],[K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10)])];}};
R['П']={w:w(.74,2.4,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  let v=[V(0,0),V(a,0),V(a*1.02,H-c*.82),V(W-b,H-c*.8),V(W-b*.98,0),V(W,0),V(W,H),V(0,H)];v=aSnip(v,7,S*.3);return [K.poly(v)];}};
R['Р']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.008),K.ring(a*.45,H*.34,W,H,a*.66,c*.8,b*.95,c*.8,[0,0,[K.sn(S*.9),'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0])];}};
R['С']={w:w(.78,2.8,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.84,42,320,6)];}};
R['Т']={w:w(.78,2.6,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.hs(0,W,H-a*.4,a*.8,-H*.018),K.vs(W*.52,0,H-a*.5,b,-W*.02,{gl:[0,-1]})];}};
R['У']={w:w(.78,2.5,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([W-b*.35,H],[b*.3,0],b*.92,b*.84),K.strip([a*.3,H],[W*.47,H*.4],a*.86,a*.78)];}};
R['Ф']={w:w(.96,3.4,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(W*.5,0,H,a*.92,W*.008),K.ring(0,H*.2,W,H*.82,b*.9,b*.72,b,b*.72,[K.sn(S*.8,30),K.sn(S*.7,30),K.sn(S*.9,30),K.sn(S*.7,30)],[K.sn(S*.22,10),K.sn(S*.2,10),K.sn(S*.25,10),K.sn(S*.2,10)])];}};
R['Х']={w:w(.82,2.8,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.35,H],[W-a*.4,0],a*.96,a*.86),K.strip([W-b*.4,H*.98],[b*.5,0],b*.78,b*.7)];}};
R['Ц']={w:w(.72,2.5,210),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W-b*.45,bt*.8,-H*.24,b*.8,W*.05)];}};
R['Ч']={w:w(.66,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W-b*.5,0,H,b,H*.008),K.vs(a*.5,H*.34,H,a*.95,H*.01,{tp:1.05}),K.hs(a*.3,W-b*.3,H*.4,c*.76,-H*.03)];}};
R['Ш']={w:w(1.02,3.6,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W*.5,0,H,c*.9,W*.012)];}};
R['Щ']={w:w(1.06,3.7,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W*.5,0,H,c*.9,W*.012),K.vs(W-b*.4,bt*.8,-H*.25,b*.82,W*.06)];}};
R['Ь']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,0,W,H*.62,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Ъ']={w:w(.8,2.7,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),fl=W*.36;
  return [K.hs(0,fl+a*.5,H-c*.4,c*.8,H*.014),K.vs(fl+a*.5,0,H,a,H*.01),K.ring(fl,0,W,H*.72,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Ы']={w:w(.98,3.4,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),x2=W-b*.5,wb=W-b*1.3-S*.45;
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,0,wb,H*.67,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0]),K.vs(x2,0,H,b*.92,H*.008)];}};
R['Э']={w:w(.74,2.6,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.84,138,-138,6),K.hs(W*.26,W*.78,H*.5,b*.6,H*.012,{gl:[-1,0]})];}};
R['Ю']={w:w(1.04,3.9,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),x0=W*.36;
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.3,x0+b*.9,H*.5,c*.6,-H*.012),
    K.ring(x0,0,W,H,b*.95,c*.8,b*.9,c*.78,[K.sn(S*.7,24),[K.sn(S*.7,24),'soft'],K.sn(S*.8,20),K.sn(S*.6,20)],[K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10)])];}};
R['Я']={w:w(.68,2.3,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W-a*.5,0,H,a,-H*.008),K.ring(0,H*.38,W-a*.4,H,b*.9,c*.8,a*.66,c*.8,[0,0,0,[K.sn(S*.6,30),K.sn(S*.7,40)]],[S*.2,S*.1,0,S*.12]),
    K.strip([W*.64,H*.46],[b*.3,0],c*.9,c*.8,{gl:[-.5,-1]})];}};
/* ----- латиница (только то, чего нет в кириллице) ----- */
R['D']={w:w(.74,2.5,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.ring(a*.45,0,W,H,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.8,20),'soft'],K.sn(S*.8,20),0],[0,S*.2,S*.3,0])];}};
R['F']={w:w(.52,1.8,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.hs(a*.3,W,H-b*.38,b*.78,H*.016),K.hs(a*.82,W*.82,H*.5,c*.62,-H*.02,{gl:[1,0]})];}};
R['G']={w:w(.82,2.9,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.86,40,362,7),K.hs(W*.46,W*.97,H*.5,b*.64,H*.008)];}};
R['I']={w:w(.24,1.2,70),f:K=>{const {H,S,W}=K,a=K.s(0);return [K.vs(W/2,0,H,a*1.05,H*.012,{tp:.9})];}};
R['J']={w:w(.58,2.1,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=b*.82;
  let v=[V(0,0),V(W,0),V(W*1.0,H),V(W-a,H),V(W-a*1.02,c),V(a*.95,c*1.02),V(a*.95,H*.3),V(0,H*.3)];v=aSnip(v,1,S*.7,true);return [K.poly(v)];}};
R['L']={w:w(.54,1.9,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.3,W,b*.36,b*.74,H*.012)];}};
R['N']={w:w(.74,2.4,220),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.vs(W-b*.5,0,H,b*.92,H*.012),K.strip([a*.55,H*.93],[W-b*.55,H*.07],c*.84,c*.7)];}};
R['Q']={w:R['О'].w,f:K=>{const p=R['О'].f(K),{H,S,W}=K,a=K.s(2);
  p.push(K.strip([W*.6,H*.14],[W*1.06,-H*.16],a*.8,a*.74));return p;}};
R['R']={w:w(.64,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.ring(a*.45,H*.38,W*.96,H,a*.66,c*.8,b*.95,c*.8,[0,0,[K.sn(S*.9),'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0]),K.strip(aBack([W*.4,H*.45],[W-b*.3,0],.11),[W-b*.3,0],c*.86,c*.78)];}};
R['S']={w:w(.62,2.2,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  /* FX2g: S из двух дуг не склеивалась (зазор между концом верхней и началом нижней): верхняя дуга заканчивается на 280° (было 262°), нижняя начинается на 95° (было 85°): концы заходят друг под друга — один кусок, как у склеенных полос */
  return [K.arc(W*.5,H*.735,W*.46,H*.265,a*.92,a*.8,18,280,5),K.arc(W*.5,H*.28,W*.5,H*.28,b*1.0,b*.84,95,-150,5)];}};
R['U']={w:w(.74,2.5,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2)*.84;
  let v=[V(0,H),V(a,H),V(a*1.02,c),V(W-b,c*1.02),V(W-b*.98,H),V(W,H),V(W,0),V(0,0)];v=aSnip(v,7,S*.55);v=aSnip(v,6,S*.75,true);return [K.poly(v)];}};
R['V']={w:w(.8,2.7,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.35,H],[W*.485,0],a*.92,a*.8),K.strip([W-b*.4,H*.98],[W*.525,0],b*.86,b*.78)];}};
R['W']={w:w(1.16,4.1,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.strip([a*.3,H],[W*.24,0],a*.88,a*.78),K.strip([W*.26,0],[W*.5,H*.82],c*.78,c*.7),K.strip([W*.5,H*.8],[W*.74,0],d*.78,d*.7),K.strip([W*.76,0],[W-b*.3,H*.98],b*.86,b*.78)];}};
R['Y']={w:w(.8,2.7,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.35,H],[W*.5,H*.44],a*.88,a*.8),K.strip([W-b*.35,H*.98],[W*.5,H*.44],b*.82,b*.76),K.vs(W*.5,0,H*.5,c,-W*.01)];}};
R['Z']={w:w(.68,2.3,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(0,W,H-a*.4,a*.76,-H*.012),K.strip([W-b*.4,H-a*.3],[b*.4,b*.3],b*.86,b*.78),K.hs(0,W*.98,c*.38,c*.78,H*.012)];}};
/* ----- цифры ----- */
R['0']={w:w(.62,2.1,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H,a*.95,c*.8,b*.95,c*.8,[K.sn(S*.7,20),K.sn(S*.6,20),[K.sn(S*.6,20),'soft'],K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)])];}};
R['1']={w:w(.4,1.7,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(W*.62,0,H,a,-W*.02),K.strip([W*.64,H*.95],[W*.0,H*.6],b*.8,b*.7)];}};
R['2']={w:w(.62,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.arc(W/2,H*.7,W/2,H*.3,a*.98,a*.84,172,-40,5),K.strip([W-a*.35,H*.52],[b*.4,c*.5],b*.84,b*.76),K.hs(0,W,c*.38,c*.76,H*.01)];}};
R['3']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(W*.04,W*.96,H-a*.38,a*.76,-H*.012),K.strip([W-a*.5,H-a*.2],[W*.42,H*.52],a*.9,a*.78),K.arc(W*.47,H*.29,W*.5,H*.29,c*1.0,c*.84,108,-150,5)];}};
R['4']={w:w(.7,2.4,160),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W*.74,0,H,a,H*.006),K.strip([W*.7,H*.99],[b*.3,H*.3],b*.84,b*.76),K.hs(0,W,H*.3,c*.64,H*.012)];}};
R['5']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(W*.16,W*.96,H-a*.38,a*.76,-H*.008),K.vs(W*.2+b*.4,H*.54,H,b*.92,-W*.02),K.arc(W*.48,H*.3,W*.52,H*.3,c*1.0,c*.84,135,-150,5)];}};
R['6']={w:w(.62,2.1,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H*.64,a,c*.8,b*.95,c*.78,[K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.4,10)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)]),
    K.arc(W*1.0,H*.42,W*1.0,H*.58,a*1.0,a*.8,180,86,3)];}};
R['7']={w:w(.6,2.0,140),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.hs(0,W,H-a*.38,a*.76,-H*.012),K.strip([W-b*.3,H-a*.2],[W*.3,0],b*.92,b*.8)];}};
R['8']={w:w(.64,2.2,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(W*.06,H*.47,W*.94,H,a*.9,c*.78,a*.9,c*.76,[K.sn(S*.5,16),K.sn(S*.5,16),K.sn(S*.5,16),K.sn(S*.5,16)],[K.sn(S*.1,8),K.sn(S*.1,8),K.sn(S*.1,8),K.sn(S*.1,8)]),
    K.ring(0,0,W,H*.6,b,c*.8,b*.95,c*.78,[K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)])];}};
R['9']={w:w(.62,2.1,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,H*.36,W,H,a*.95,c*.78,b,c*.8,[K.sn(S*.4,10),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)]),
    K.arc(W*.0,H*.58,W*1.0,H*.58,b*1.0,b*.8,0,-95,3)];}};
/* ----- знаки ----- */
const dotD=(H,S)=>aCL(S*.98,.16*H,.235*H);
R['.']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d)];}};
R[',']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d),K.strip([d*.72,d*.35],[d*.2,-K.H*.17],d*.62,d*.3,{flat:1})];}};
R[':']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d),K.dot(d*.04,K.H*.5,d*.96)];}};
R[';']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(d*.04,K.H*.5,d*.96),K.dot(0,0,d),K.strip([d*.72,d*.35],[d*.2,-K.H*.17],d*.62,d*.3,{flat:1})];}};
const bang=K=>{const {H,S}=K,wt=S*1.14,wb=S*.62,d=dotD(H,S);return [K.P([V(0,H*.28),V((wt-wb)/2+wb,H*.28),V(wt,H),V(0,H)]),K.dot((wt-d)/2,0,d)];};
R['!']={sbk:.9,w:(H,S)=>Math.max(S*1.14,dotD(H,S)),f:K=>{const {H,S}=K,wt=Math.min(S*1.12,dotD(K.H,S)*1.15),d=dotD(H,S),y0=d+H*.13;
  const o=(Math.max(wt,d)-wt)/2;return [K.P([V(o+wt*.22,y0),V(o+wt*.78,y0),V(o+wt,H),V(o,H*.99)]),K.dot((Math.max(wt,d)-d)/2,0,d)];}};
R['?']={w:w(.5,1.9,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),d=dotD(H,S);
  return [K.arc(W/2,H*.7,W/2,H*.3,a*.98,a*.84,172,-98,5),K.vs(W*.46,d+H*.13,H*.5,b*.9,W*.01,{}),K.dot(W*.5-d/2,0,d)];}};
const chev=(K,dir)=>{const {H,S}=K,t=S*.5,hh=H*.2,dx=H*.16,yc=H*.45;
  const one=x=>dir<0?[K.strip([x+dx,yc+hh],[x,yc],t,t*.92,{flat:1}),K.strip([x,yc],[x+dx,yc-hh],t,t*.92,{flat:1})]:[K.strip([x,yc+hh],[x+dx,yc],t,t*.92,{flat:1}),K.strip([x+dx,yc],[x,yc-hh],t,t*.92,{flat:1})];
  return one(0).concat(one(dx*1.5+S*.3));};
R['«']={w:(H,S)=>H*.16*2.5+S*.8+14,f:K=>chev(K,-1)};
R['»']={w:(H,S)=>H*.16*2.5+S*.8+14,f:K=>chev(K,1)};
/* кавычки-запятые: «голова» + хвост; 9-образные (’ ” „) и 6-образные (‘ “) */
const qd=(H,S)=>aCL(S*.74,.125*H,.18*H);
const q9=(K,x,y)=>{const {H,S}=K,d=qd(H,S);return [K.dot(x,y,d,{mark:1}),K.strip([x+d*.72,y+d*.35],[x+d*.12,y-H*.15],d*.64,d*.42,{flat:1,mark:1,sn:0})];};
const q6=(K,x,y)=>{const {H,S}=K,d=qd(H,S);return [K.dot(x,y,d,{mark:1}),K.strip([x+d*.3,y+d*.65],[x+d*.9,y+d+H*.13],d*.64,d*.42,{flat:1,mark:1,sn:0})];};
const qW=(H,S,n)=>qd(H,S)*(n===2?2.45:1.1)+H*.04;
R['\u2019']={sbk:.8,w:(H,S)=>qW(H,S,1),f:K=>q9(K,0,K.H-qd(K.H,K.S)-6)};
R['\u2018']={sbk:.8,w:(H,S)=>qW(H,S,1),f:K=>q6(K,0,K.H-qd(K.H,K.S)-K.H*.14-8)};
R['\u201D']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S),y=K.H-d-6;return q9(K,0,y).concat(q9(K,d*1.35,y));}};
R['\u201C']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S),y=K.H-d-K.H*.14-8;return q6(K,0,y).concat(q6(K,d*1.35,y));}};
R['\u201E']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S);return q9(K,0,0).concat(q9(K,d*1.35,0));}};
const H_=K=>K.H;
R['"']={sbk:.7,w:(H,S)=>S*1.9,f:K=>{const {H,S}=K;return [K.P([V(S*.04,H*.66),V(S*.5,H*.66),V(S*.8,H*.99),V(0,H*.97)],{mark:1}),K.P([V(S*1.0,H*.66),V(S*1.46,H*.66),V(S*1.8,H*.99),V(S*1.0,H*.97)],{mark:1})];}};
R["'"]={sbk:.8,w:(H,S)=>S*.9,f:K=>{const {H,S}=K;return [K.P([V(S*.04,H*.66),V(S*.5,H*.66),V(S*.8,H*.99),V(0,H*.97)],{mark:1})];}};
R['-']={sbk:.6,w:(H,S)=>H*.34,f:K=>{const {H,S}=K;return [K.hs(0,H*.34,H*.38,S*.62,H*.012,{mark:1})];}};
R['–']={sbk:.5,w:(H,S)=>H*.56,f:K=>{const {H,S}=K;return [K.hs(0,H*.56,H*.38,S*.6,H*.014,{mark:1})];}};
R['−']={sbk:.5,w:(H,S)=>H*.5,f:K=>{const {H,S}=K;return [K.hs(0,H*.5,H*.4,S*.62,H*.014,{mark:1})];}};
R['—']={sbk:.4,w:(H,S)=>H*.98,f:K=>{const {H,S}=K;return [K.hs(0,H*.98,H*.38,S*.6,H*.018,{mark:1})];}};
R['(']={sbk:.8,w:(H,S)=>H*.24+S*.6,f:K=>{const {H,S}=K,a=S*.78,rx=H*.26+S*.1;return [K.arc(rx,H*.43,rx,H*.58,a,a*.8,128,232,3,{})];}};
R[')']={sbk:.8,w:(H,S)=>H*.24+S*.6,f:K=>{const {H,S}=K,a=S*.78,rx=H*.26+S*.1;return [K.arc(0,H*.43,rx,H*.58,a*.8,a,52,-52,3,{})];}};
R['/']={sbk:.6,w:(H,S)=>H*.42+S*.4,f:K=>{const {H,S}=K,W=H*.42+S*.4;return [K.strip([S*.3,-H*.06],[W-S*.3,H*1.04],S*.72,S*.64)];}};
R['&']={w:w(.86,2.9,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(W*.08,H*.5,W*.74,H,a*.62,c*.7,a*.62,c*.66,[K.sn(S*.5,14),K.sn(S*.5,14),K.sn(S*.5,14),K.sn(S*.5,14)],[K.sn(S*.1,6),K.sn(S*.1,6),K.sn(S*.1,6),K.sn(S*.1,6)]),
    K.arc(W*.4,H*.28,W*.42,H*.28,b*.82,b*.7,75,325,5),K.strip([W*.22,H*.5],[W-c*.3,0],c*.8,c*.72)];}};
/* ----- CS68: · • ° © ₽ @ # % * + = \ | — те же куски бумаги: диски-точки, полосы, кольца с неровными срезами ----- */
const rg4=(K,x0,y0,x1,y1,t,f)=>K.ring(x0,y0,x1,y1,t,t*.88,t*.96,t*.88,[K.sn(f,10),K.sn(f,10),K.sn(f,10),K.sn(f,10)],[K.sn(f*.2,6),K.sn(f*.2,6),K.sn(f*.2,6),K.sn(f*.2,6)]);
R['·']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,K.H*.34-d/2,d)];}};
R['•']={sbk:.8,w:(H,S)=>dotD(H,S)*1.5,f:K=>{const d=dotD(K.H,K.S)*1.5;return [K.dot(0,K.H*.46-d/2,d)];}};
R['°']={sbk:.8,w:(H,S)=>H*.29,f:K=>{const {H,S}=K,s=H*.29,t=Math.min(S*.55,s*.36);return [rg4(K,0,H-s,s,H,t,s*.3)];}};
R['+']={w:w(.55,2.0,60),f:K=>{const {H,S,W}=K,ym=H*.44,a=Math.min(W,H*.56)/2;return [K.hs(0,W,ym,S*.62,H*.01,{mark:1}),K.vs(W/2,ym-a,ym+a,S*.66,H*.01,{mark:1})];}};
R['=']={w:w(.52,1.9,60),f:K=>{const {H,S,W}=K,g=Math.max(S*.5,H*.1);return [K.hs(0,W,H*.44+g,S*.56,H*.01,{mark:1}),K.hs(0,W*.98,H*.44-g,S*.56,-H*.01,{mark:1})];}};
R['\\']={sbk:.6,w:(H,S)=>H*.42+S*.4,f:K=>{const {H,S}=K,W=H*.42+S*.4;return [K.strip([S*.3,H*1.04],[W-S*.3,-H*.06],S*.72,S*.64)];}};
R['|']={sbk:.6,w:(H,S)=>S*.9,f:K=>{const {H,S}=K;return [K.vs(S*.42,-H*.08,H*.98,S*.8,H*.008)];}};
R['#']={w:w(.62,2.4,120),f:K=>{const {H,S,W}=K;return [K.vs(W*.32,0,H,S*.6,H*.01),K.vs(W*.7,0,H,S*.6,-H*.01),K.hs(0,W,H*.3,S*.52,H*.012),K.hs(0,W*.98,H*.64,S*.52,-H*.012)];}};
R['*']={w:w(.5,1.9,60),f:K=>{const {H,S,W}=K,cx=W/2,cy=H*.74,L=Math.min(W*.5,H*.2),t=S*.38;
  return [K.strip([cx,cy-L],[cx,cy+L],t,t*.9,{flat:1,mark:1}),K.strip([cx-L*.87,cy-L*.5],[cx+L*.87,cy+L*.5],t,t*.9,{flat:1,mark:1}),K.strip([cx-L*.87,cy+L*.5],[cx+L*.87,cy-L*.5],t,t*.9,{flat:1,mark:1})];}};
R['%']={w:w(.8,2.9,200),f:K=>{const {H,S,W}=K,s=Math.min(W*.38,H*.32),t=Math.min(S*.55,s*.36);
  return [rg4(K,0,H-s,s,H,t,s*.3),rg4(K,W-s,0,W,s,t,s*.3),K.strip([S*.3,-H*.05],[W-S*.3,H*1.03],S*.6,S*.52)];}};
R['©']={w:w(1.02,3.4,220),f:K=>{const {H,S,W}=K,hh=H*.94,y0=(H-hh)/2,cx=W/2,cy=H/2;
  return [rg4(K,0,y0,W,y0+hh,Math.min(S*.85,W*.17),S*.62),K.arc(cx,cy,W*.19,H*.19,S*.42,S*.38,42,320,5)];}};
R['₽']={w:R['Р'].w,f:K=>{const p=R['Р'].f(K),{H,S,W}=K;p.push(K.hs(0,W*.78,H*.19,S*.42,H*.006,{mark:1}));return p;}};
R['@']={w:w(1.0,3.3,220),f:K=>{const {H,S,W}=K,t=Math.min(S*.8,W*.15),cx=W/2,cy=H*.5,bt=Math.min(S*.32,W*.07);
  return [K.arc(cx,cy,W/2,H*.46,t,t*.9,14,338,7),rg4(K,W*.3,H*.3,W*.68,H*.6,bt,S*.1),K.vs(W*.66,H*.27,H*.64,S*.34,0,{mark:1})];}};

R['№']={w:w(1.3,4.7,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),nw=W*.6,hh=H*.82,r=H*.4;
  return [K.vs(a*.5,0,hh,a*.92,0),K.vs(nw-b*.5,0,hh,b*.86,H*.01),K.strip([a*.35,hh*.97],[nw-b*.35,hh*.03],c*.72,c*.64),
    K.ring(nw+S*.2,H*.3,W,H*.8,b*.7,b*.7,b*.7,b*.7,[K.sn(S*.4,10),K.sn(S*.4,10),K.sn(S*.4,10),K.sn(S*.4,10)],[S*.06,S*.06,S*.06,S*.06]),
    K.hs(nw+S*.25,W,H*.18,b*.5,H*.01)];}};
R['…']={sbk:.8,w:(H,S)=>dotD(H,S)*3+H*.2,f:K=>{const d=dotD(K.H,K.S)*.92,g=K.H*.1;return [K.dot(0,0,d),K.dot(d+g,0,d),K.dot((d+g)*2,0,d)];}};
/* ---------- раунд 2: характер. Переопределения рецептов (разная конструкция, неровные «детские» решения), собственные вырезы строчных ---------- */
const RL=ALC;
/* ----- прописные ----- */
R['А']={w:w(.9,3.0,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),wd=K.u()<.45,cy=H*(.1+.22*K.u()),tl=K.r();
  return [K.strip([a*.55,0],[W*.465,H],a,a*(wd?1.5:.92)),K.strip([W-b*.5,0],[W*.55,H-8],b*.9,b*(wd?1.25:.82)),K.hs(W*.2,W*.84,cy,c*.6,H*.05*tl)];}};
R['Д']={w:w(.8,2.9,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.6,fh=H*.17,ft=W*.15,sh=H*.14*K.u(),wl=K.u()<.5;
  const base=[V(0,-fh),V(ft,-fh),V(ft*1.1,0),V(W-ft*1.2,0),V(W-ft,-fh*.92),V(W,-fh*.92),V(W,bt),V(0,bt)];
  return [K.poly(base),K.strip([W*.27,bt*.4],[W*.45,H],a*.9,a*(wl?1.5:.82)),K.strip([W*.74,bt*.4],[W*.57,H-6-sh],b*.9,b*.8)];}};
R['Е']={w:w(.56,1.9,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3),mid=H*(.38+.2*K.u()),tL=W*(.84+.16*K.u()),mL=W*(.58+.3*K.u()),bL=W*(.9+.1*K.u()),tl=K.r();
  return [K.vs(a*.5,0,H,a,H*.008),K.hs(a*.3,tL,H-b*.38,b*.76,-H*.014,{gl:[1,0]}),K.hs(a*.82,mL,mid,c*.62,H*.03*tl,{gl:[1,0]}),K.hs(a*.3,bL,d*.38,d*.76,H*.012,{gl:[1,0]})];}};
R['Ж']={w:w(1.12,4.2,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.35,H],[W-a*.4,0],a*.98,a*.86),K.strip([W-b*.35,H*(.92+.08*K.u())],[b*.5,0],b*.92,b*.84),K.vs(W*.5,0,H*(.9+.1*K.u()),c*1.18,H*.01)];}};
R['И']={w:w(.62,2.1,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.05,0,{tp:.84}),K.vs(W-b*.5,0,H*(.92+.08*K.u()),b*.88,H*.01),K.strip([a*.55,H*.07],[W-b*.55,H*.93],c*.8,c*.7)];}};
R['К']={w:w(.74,2.4,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),ta=K.u(),la=K.u();
  return [K.vs(a*.5,0,H,a,-H*.008),K.strip([a*.9,H*.42],[W-b*.4,H*(.86+.14*ta)],b*.84,b*.72,{gl:[1,.9]}),K.strip([a*.85,H*.52],[W-c*.4,H*.24*la],c*.9,c*.8,{gl:[1,-1]})];}};
R['Л']={w:w(.72,2.5,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),wd=K.u()<.5,hr=H*.12*K.u();
  return [K.strip([a*.55,0],[W*.5,H],a*1.02,a*(wd?1.6:.9)),K.strip([W-b*.5,0],[W*.6,H-10-hr],b*.9,b*.82)];}};
R['М']={w:w(1.16,4.2,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3),m=H*(.18+.14*K.u());
  return [K.vs(a*.5,0,H,a,H*.012),K.vs(W-b*.5,0,H*(.9+.1*K.u()),b*.9,-H*.01),K.strip([a*.55,H*.95],[W*.5,m],c*.84,c*.72),K.strip([W-b*.55,H*.95],[W*.5,m-H*.02],d*.78,d*.7)];}};
R['Н']={w:w(.74,2.4,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),by=H*(.28+.36*K.u()),tl=K.r();
  return [K.vs(a*.5,0,H,a*1.04,-H*.012),K.vs(W-b*.5,0,H*(.92+.08*K.u()),b*.88,H*.01,{tp:.9}),K.hs(a*.4,W-b*.4,by,c*.62,H*.06*tl)];}};
R['О']={w:w(.82,2.9,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.oring(0,0,W,H,a*(.9+.35*K.u()),c*.82,b*(.9+.35*K.u()),c*.78)];}};
R['С']={w:w(.8,2.8,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.12,b*.88,28+22*K.u(),332-22*K.u(),8,{rd:1})];}};
R['Т']={w:w(.7,2.4,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),sx=W*(.44+.16*K.u());
  return [K.hs(0,W,H-a*.4,a*.8,H*.04*K.r()),K.vs(sx,0,H-a*.5,b,-W*.03,{gl:[0,-1]})];}};
R['Ф']={w:w(1.1,3.7,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(W*.5,0,H,a*.92,W*.01),K.oring(0,H*.18,W,H*.84,b*.9,b*.72,b,b*.72,{n:12})];}};
R['Ц']={w:w(.78,2.6,210),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.62;
  return [K.vs(a*.5,0,H,a,H*.01,{gl:[0,1]}),K.vs(W-b*.5,0,H,b*.92,-H*.01,{gl:[0,1]}),K.hs(a*.1,W-b*.1,bt*.55,bt*1.35,H*.015*K.r(),{flat:1,sn:0}),K.vs(W-b*.45,bt*.8,-H*.24,b*.8,W*.05)];}};
R['Ш']={w:w(1.14,4,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  return [K.vs(a*.5,0,H,a,H*.01,{gl:[0,1]}),K.vs(W*.5,0,H*(.92+.08*K.u()),c*.9,W*.012,{gl:[0,1]}),K.vs(W-b*.5,0,H,b*.92,-H*.01,{gl:[0,1]}),K.hs(a*.1,W-b*.1,bt*.55,bt*1.35,H*.015*K.r(),{flat:1,sn:0})];}};
R['Щ']={w:w(1.18,4.1,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  return [K.vs(a*.5,0,H,a,H*.01,{gl:[0,1]}),K.vs(W*.5,0,H*(.92+.08*K.u()),c*.9,W*.012,{gl:[0,1]}),K.vs(W-b*.5,0,H,b*.92,-H*.01,{gl:[0,1]}),K.hs(a*.1,W-b*.1,bt*.55,bt*1.35,H*.015*K.r(),{flat:1,sn:0}),K.vs(W-b*.4,bt*.8,-H*.25,b*.82,W*.06)];}};
R['З']={w:w(.64,2.3,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W*.48,H*.735,W*.43,H*.265,a*.92,a*.8,160,-90,7,{rd:1}),K.arc(W*.5,H*.28,W*.5,H*.28,b*1.0,b*.84,92,-155,7,{rd:1})];}};
R['Э']={w:w(.76,2.7,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*(K.lc?.82:1),b*(K.lc?.7:.84),146,-146,8,{rd:1}),K.hs(W*.3,W*.86,H*(.44+.1*K.u()),b*.6,H*.02*K.r(),{gl:[-1,0]})];}};
R['Ю']={w:w(1.04,3.9,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),x0=W*.36;
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.3,x0+b*.9,H*(.4+.2*K.u()),c*.6,-H*.012),K.oring(x0,0,W,H,b*.95,c*.8,b*.9,c*.78)];}};
R['Я']={w:w(.68,2.3,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W-a*.5,0,H,a,-H*.008),K.oring(0,H*.38,W-a*.4,H,b*.9,c*.8,a*.66,c*.8,{n:11}),
    K.strip([W*.62,H*.55],[b*.3,0],c*.9,c*.8,{gl:[-.5,-1]})];}};
R['0']={w:w(.64,2.2,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.oring(0,0,W,H,a*.95,c*.8,b*.95,c*.8)];}};
/* ----- строчные: собственные вырезы (юникейс, но другая конструкция) ----- */
RL['Ъ']={w:w(.8,2.7,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),fl=W*.34;
  return [K.hs(0,fl+a*.5,H-c*.4,c*.7,H*.014),K.vs(fl+a*.5,0,H,a*.92,H*.01),K.ring(fl,0,W,H*.8,a*.6,c*.7,b*.85,c*.7,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
RL['А']={w:w(.88,3.0,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.55,0],[W*.42,H],a,a*1.15),K.strip([W-b*.5,0],[W*.5,H*.86],b*1.1,b*.9),K.hs(W*.1,W*1.02,H*(.2+.12*K.u()),c*.6,H*.05*K.r())];}};
RL['Е']={w:w(.7,2.4,140),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.arc(W/2,H/2,W/2,H/2,a*.94*Math.pow(K.hf,.8),b*.8*Math.pow(K.hf,.8),12,312,8,{rd:1}),K.hs(W*.2,W*.96,H*(.55+.03*K.u()),c*.6,H*.02*K.r(),{gl:[1,0]})];}};
RL['Ё']={w:RL['Е'].w,f:K=>{const p=RL['Е'].f(K),{H,S,W}=K,d=Math.max(.13*H,S*.64);
  p.push(K.dot(W*.24,H*1.1,d,{mark:1}),K.dot(W*.58,H*1.1,d,{mark:1}));return p;}};
RL['О']={w:w(.78,2.9,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H,a,c*.82,b,c*.78,[K.sn(S*.7,24),[K.sn(S*.7,24),'soft'],K.sn(S*.8,20),K.sn(S*.6,20)],[K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10)])];}};
RL['И']={w:w(.7,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H*(.9+.1*K.u()),a*1.3,0),K.vs(W-b*.5,0,H,b*1.1,0,{tp:.7}),K.strip([a*.55,H*.1],[W-b*.55,H*.9],c*.95,c*.8)];}};
RL['Н']={w:w(.7,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.28,-H*.012),K.vs(W-b*.5,0,H*(.88+.12*K.u()),b*.8,H*.01),K.hs(a*.4,W-b*.4,H*(.24+.12*K.u()),c*.7,H*.05*K.r())];}};
RL['Т']={w:w(.74,2.5,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.P([V(0,H-a*.7),V(W,H-a*.95),V(W*.97,H),V(W*.03,H-a*.1)]),K.vs(W*.5,0,H-a*.4,b*1.1,-W*.03,{tp:.7,gl:[0,-1]})];}};
RL['С']={w:w(.62,2.2,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.3,b*.78,36,326,7,{rd:1})];}};
RL['Р']={w:w(.64,2.2,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.008),K.oring(a*.3,H*.3,W,H,a*.66,c*.8,b*.95,c*.8,{n:11})];}};
RL['К']={w:w(.74,2.4,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),m=H*(.4+.12*K.u());
  return [K.vs(a*.5,0,H,a*1.1,-H*.008),K.strip([W-b*.3,H],[a*.95,m],b*.9,b*.75),K.strip([a*.95,m],[W-c*.3,H*.06*K.u()],c*.9,c*.8)];}};
RL['Л']={w:w(.8,2.9,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.P([V(0,0),V(a*1.2,0),V(W*.5,H*.6),V(W-b*1.2,0),V(W,0),V(W*.64,H),V(W*.36,H)])];}};
RL['М']={w:w(1.12,4.1,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H*(.9+.1*K.u()),a,H*.012),K.vs(W-b*.5,0,H,b*.92,-H*.01),
    K.P([V(W*.5,H*.1),V(W-b*.4,H),V(W-b*.4-c*1.1,H),V(W*.5,H*.42),V(a*.4+c*1.1,H),V(a*.4,H)])];}};
RL['У']={w:w(.78,2.6,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([W-b*.35,H],[b*.3,0],b*1.0,b*.9),K.strip([a*.3,H],[W*.46,H*.36],a*1.35,a*.7)];}};
/* ---------- набор знаков, параметры, кернинг, реестр ---------- */
const LATSH={Y:'У',A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х'};   /* общие формы латиницы и кириллицы: один и тот же знак */
const LATONLY='DFGIJLNQRSUVWYZ';
const LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',LATL='abcdefghijklmnopqrstuvwxyz',CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',CYL='абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const DIG='0123456789',SYM='.,:;!?«»„“”‘’"\'-–—()/&№…−·•°©₽@#%*+=\\|';
const SPACES={' ':300,' ':300,' ':150,' ':170};
/* символ -> {id, lc} */
function aMapChar(ch){
  if(CY.includes(ch))return {id:ch,lc:false};
  if(CYL.includes(ch))return {id:ch.toUpperCase(),lc:true};
  if(LAT.includes(ch))return {id:LATSH[ch]||ch,lc:false};
  if(LATL.includes(ch)){const u=ch.toUpperCase();return {id:LATSH[u]||u,lc:true};}
  if(DIG.includes(ch)||SYM.includes(ch)){const m={'«':'«','»':'»','„':'„','“':'“','”':'”','‘':'‘','’':'’','–':'–','—':'—','№':'№','…':'…'};return {id:m[ch]||ch,lc:false};}
  return null;}
const A_CHARSET=[...LAT,...LATL,...CY,...CYL,...DIG,...SYM];
const A_ALT_LET='АОЕНИТ';   /* буквы с двумя запасными вырезами (calt) */
const A_PRESETS={ /* направления */
  A:{name:'Ножницы',tear:0,jit:50},
  B:{name:'Рваная бумага',tear:100,jit:58}};
const A_WEIGHTS={Light:114,Regular:150,Bold:192,Black:226};
const A_DEF={capH:700,stem:150,jit:50,lean:5,bj:70,gap:0,seed:0,tear:0,sharp:50,soft:50,scat:50,lap:0,pcs:0,blunt:11,sb:92,lcs:0.86};
/* пределы (проверены стресс-прогоном): всё остальное зажимается */
const A_LIM={stem:[106,232],jit:[0,100],lean:[0,10],bj:[0,100],gap:[0,100],seed:[0,99],tear:[0,100],sharp:[0,100],soft:[0,100],scat:[0,100],lap:[0,100],pcs:[0,100]};
function aSafe(p){const q=Object.assign({},A_DEF,p||{});for(const k in A_LIM){const [a,b]=A_LIM[k];q[k]=aCL(+q[k]||0,a,b);}q.seed=Math.round(q.seed);q.capH=700;q.blunt=20-18*q.sharp/100;q.sb=aCL(q.sb,0,160);q.lcs=aCL(q.lcs,.8,.92);return q;}
const aCache=new Map();
function aKey(id,lc,p,sa){return [id,lc?1:0,sa|0,p.stem,p.jit,p.lean,p.bj,p.gap,p.seed,p.tear,p.blunt,p.sb,p.lcs,p.soft,p.scat,p.lap,p.pcs].join('|');}
/* страховка топологии (как в «Капле»): эталон = тот же знак при stem 150, неровность 0, зазор 0; если дыры/части/тонкие места не те — пересобрать с меньшей неровностью, затем без зазора */
const aRefC=new Map();
function aRef(id,lc,seed,sa){const k=id+'|'+lc+'|'+seed+'|'+(sa|0);let r=aRefC.get(k);if(!r){const g=aBuild(id,lc,aSafe({stem:150,jit:0,lean:0,bj:0,gap:0,seed:seed,tear:0}),sa|0);r=aTopo(g);aRefC.set(k,r);}return r;}
function aTopoOK(g,id,lc,p,sa){if(!g.contours.length)return true;const t=aTopo(g),ref=aRef(id,lc,p.seed,sa),H=lc?p.capH*p.lcs:p.capH;
  if(t.holes.length!==ref.holes.length)return false;for(const a of t.holes)if(a<0.005*H*H)return false;
  const rp=ref.parts.length;if(t.parts.length<rp||t.parts.length>rp+(g.nGl||0))return false;
  for(const a of t.parts)if(a<4500&&a>=A_PIN)return false;
  if(t.thin>0.012||t.slit>70)return false;return true;}
const aFB={n:0,tot:0};
function aGet(id,lc,p,sa){const k=aKey(id,lc,p,sa);let r=aCache.get(k);if(!r){r=aBuild(id,lc,p,sa);aFB.tot++;
    if(AREC[id]&&!aTopoOK(r,id,lc,p,sa)){aFB.n++;let ok=false;
      for(const [kj,kg,kt,ks=1] of [[0.7,1,1],[0.45,1,.8],[0.2,1,.6],[0.45,0,.6],[0.2,0,.4],[0,0,.2],[0,0,0],[0,0,0,.95],[0,0,0,.9],[0,0,0,.85]]){const p2=Object.assign({},p,{stem:p.stem*ks,jit:p.jit*kj,gap:p.gap*kg,tear:p.tear*kt,lap:p.lap*(kt<1?kt*kt:1),pcs:p.pcs*(kt<1?kt:1),soft:50+(p.soft-50)*(kt<1?kt:1),scat:50+(p.scat-50)*(kt<1?kt:1),sharp:50+(p.sharp-50)*(kt<1?kt:1)}),r2=aBuild(id,lc,p2,sa);if(aTopoOK(r2,id,lc,p2,sa)){r=r2;r.fallback=kj+'/'+kg+'/'+kt+'/'+ks;ok=true;break;}}
      if(!ok){r=aBuild(id,lc,Object.assign({},p,{jit:0,gap:0,lap:0,pcs:0,tear:0,lean:p.lean*0.5}),sa);r.fallback='last';}}
    if(aCache.size>3000)aCache.clear();aCache.set(k,r);}return r;}
function aGlyphName(ch){const cp=ch.codePointAt(0);
  if(/[A-Za-z]/.test(ch))return ch;
  if(/[0-9]/.test(ch))return ['zero','one','two','three','four','five','six','seven','eight','nine'][+ch];
  return 'uni'+cp.toString(16).toUpperCase().padStart(4,'0');}
/* весь шрифт: уникальные контуры (общие латинско-кириллические знаки — один глиф на несколько кодов) */
function aFont(pIn,opts){opts=opts||{};const p=aSafe(pIn),glyphs=[],byKey=new Map();
  const chars=A_CHARSET;
  for(const ch of chars){const m=aMapChar(ch);if(!m||!AREC[m.id])continue;const key=m.id+'|'+(m.lc?1:0);
    let g=byKey.get(key);if(!g){const r=aGet(m.id,m.lc,p,0);g={name:aGlyphName(ch),key,id:m.id,lc:m.lc,codes:[],adv:r.adv,contours:r.contours,profile:r.profile,lean:r.lean,dy:r.dy};byKey.set(key,g);glyphs.push(g);}
    g.codes.push(ch.codePointAt(0));}
  /* пробелы */
  for(const ch in SPACES){glyphs.push({name:aGlyphName(ch)==='uni0020'?'space':aGlyphName(ch),key:'sp'+ch,codes:[ch.codePointAt(0)],adv:SPACES[ch]+Math.round(0.35*(p.stem-150)*(ch===' '||ch===' '?1:0)),contours:[],profile:null});}
  /* запасные вырезы */
  const alts=[];
  if(opts.alts!==false){for(const idc of A_ALT_LET)for(const lc of [false,true])for(let k=1;k<=2;k++){const r=aBuild(idc,lc,p,137*k);const base=byKey.get(idc+'|'+(lc?1:0));
    if(!base)continue;const g={name:base.name+'.alt'+k,key:base.key+'.alt'+k,id:idc,lc,codes:[],adv:r.adv,contours:r.contours,profile:r.profile,alt:base.name};alts.push(g);}}
  const kern=opts.kern===false?[]:aKern(glyphs,alts);
  return {p,glyphs,alts,kern};}
/* кернинг по телу (полосы 20 ед.): целимся в средний оптический зазор пар Н/О; клин (А Л Д У Т Г Р 7 …) сближаются сами */
function aGapStat(gl,gr){let sum=0,cnt=0,minG=1e9,both=0;const CAP=300;
  for(let b=0;b<A_NB;b++){const rl=gl.profile.R[b],lr=gr.profile.L[b];if(rl==null&&lr==null)continue;const y=A_B0+A_BS*(b+0.5);if(y<30||y>760)continue;
    let g;if(rl!=null&&lr!=null){g=(gl.adv-rl)+lr;both++;minG=Math.min(minG,g);}else g=CAP;sum+=Math.min(g,CAP);cnt++;}
  return cnt&&both?{mean:sum/cnt,min:minG}:null;}
function aKern(glyphs,alts){const L=glyphs.concat(alts).filter(g=>g.profile&&g.contours.length&&!(g.codes.length&&g.codes.every(c=>(c<0x30)||(c>=0x2010&&c<=0x2026&&false))));
  const find=id=>glyphs.find(g=>g.key===id+'|0');const H_=find('Н'),O_=find('О');
  if(!H_||!O_)return [];
  const ref=[[H_,H_],[O_,O_],[H_,O_],[O_,H_]].map(([a,b])=>aGapStat(a,b).mean),target=ref.reduce((a,b)=>a+b,0)/ref.length;
  const out=[];
  for(const a of L)for(const b of L){const st=aGapStat(a,b);if(!st)continue;let k=-(st.mean-target)*0.55;if(k>20)k=20;if(k<-150)k=-150;
    if(st.min+k<56)k=56-st.min;if(k>0&&k<-0)k=0;k=Math.round(k/2)*2;if(Math.abs(k)>=8)out.push([a.name,b.name,k]);}
  return out;}
/* ---------- реестр (как core_kaplya.js) ---------- */
const APPLIK_PARAMS=[['stem','Насыщенность',...A_LIM.stem,1],['jit','Неровность',0,100,1],['lean','Наклон букв, °',0,10,0.5],['bj','Скачет строка',0,100,1],['gap','Зазоры',0,100,1],['seed','Вариант',0,99,1]];
const APPLIK={id:'applik',name:'Аппликация',family:'Applikatsiya Paper',tag:'Бумага · ножницы · детская аппликация',year:2026,
  desc:'Акцидентный юникейс из вырезанных детской рукой бумажных кусков: прямые резы ножницами, лёгкий наклон и прыжок каждого знака, клеевые зазоры. Направления — «Ножницы» и «Рваная бумага».',
  sample:'Аппликация · Paper Kids',sampleText:'КОНФЕТА',
  charset:'basic',CHARSET:A_CHARSET.concat([' ']),params:APPLIK_PARAMS,limits:A_LIM,defaults:A_DEF,weights:A_WEIGHTS,presets:A_PRESETS,altLetters:A_ALT_LET,
  safe:aSafe,build:aGet,raw:aBuild,topo:aTopo,fb:aFB,font:aFont,mapChar:aMapChar,kern:aKern,REC:AREC,flat:aFlat,polyDist:aPolyDist};
APPLIK.famParams=(p,wn)=>aSafe(Object.assign({},p,{stem:A_WEIGHTS[wn]||p.stem}));
if(typeof globalThis!=='undefined')globalThis.APPLIK=APPLIK;
if(typeof module!=='undefined'&&module.exports)module.exports=APPLIK;
/* ---------- регистрация в продукте: шрифт «Аппликация» (Applikatsiya Paper), как kap/tail.js ----------
   Ключи ползунков в продукте имеют префикс c… (jit/lean/seed/… уже заняты другими шрифтами):
   cjit→jit, ctear→tear, cgap→gap, clap→lap, cpcs→pcs, csharp→sharp, csoft→soft, cscat→scat, clean→lean, cbj→bj, cseed→seed */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const AP_KEYS=['ctear','cgap','clap','cpcs','csharp','csoft','cjit','cscat','clean','cbj','cseed'];
const AP_ROWS=[
  ['ctear','Рваный край, %',0,100,1,'Бумага'],['cgap','Зазоры, %',0,100,1,'Бумага'],['clap','Нахлёст, %',0,100,1,'Бумага'],
  ['cpcs','Количество кусочков, %',0,100,1,'Вырезка'],['csharp','Острота резов, %',0,100,1,'Вырезка'],['csoft','Мягкие резы, %',0,100,1,'Вырезка'],
  ['cjit','Неровность, %',0,100,1,'Детская рука'],['cscat','Разброс размера, %',0,100,1,'Детская рука'],['clean','Разброс наклона, °',0,10,0.5,'Детская рука'],
  ['cbj','Скачет строка, %',0,100,1,'Детская рука'],['cseed','Вариант',0,99,1,'Детская рука']];
if(!PARAMS.some(r=>r[0]==='ctear')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...AP_ROWS);}
const apGen=p=>aSafe({stem:p.stem,jit:p.cjit,tear:p.ctear,gap:p.cgap,lap:p.clap,pcs:p.cpcs,sharp:p.csharp,soft:p.csoft,scat:p.cscat,lean:p.clean,bj:p.cbj,seed:p.cseed,sb:0});
const F={id:'applik',name:'Аппликация',family:'Applikatsiya Paper',tag:'Бумага · ножницы · детская аппликация',S0:150,GL:{},charset:'basic',
  desc:'Акцидентный юникейс из бумажных кусков, вырезанных детской рукой: прямые резы ножницами, небольшой наклон и прыжок каждого знака, склеенные в одно целое. Ползунок «Рваный край» превращает ножницы в оборванную бумагу, «Кусочки» и «Нахлёст» меняют сборку, «Зазоры» разводят куски, как в мозаике. Пресеты — Ножницы, Рваная бумага, Мозаика, Аккуратная, Малыш.',
  sample:'Аппликация · Paper Kids'};
F.sampleText='КОНФЕТА';
for(const ch of A_CHARSET){const m=aMapChar(ch);if(!m||!AREC[m.id])continue;
  F.GL[ch]={shape:g=>aGet(m.id,m.lc,apGen(g.p),0).contours.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole)),
    w:p=>aGet(m.id,m.lc,apGen(p),0).adv,k:m.lc?'xh':'cap',opt:{}};}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',LAT],['Латиница · строчные (юникейс)',LATL],['Кириллица · прописные',CY],['Кириллица · строчные (юникейс)',CYL],['Цифры',DIG],['Знаки',SYM]];
F.CHARSET=A_CHARSET.concat([' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const m=aMapChar(ch);return aGet(m.id,m.lc,apGen(p),0);};
const K0={wdth:100,capH:700,xh:602,asc:1130,desc:290,stem:150,hair:150,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:92,track:0,space:300,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,seed:0,
  ctear:0,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:50,cscat:50,clean:5,cbj:70,cseed:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed'];
F.params={stem:['Насыщенность',106,232,1]};
for(const k of HID)F.params[k]=null;
const PRE={
  sc:{ctear:0,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:50,cscat:50,clean:5,cbj:70},
  tr:{ctear:100,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:58,cscat:50,clean:5,cbj:70}};
F.methods=[
  ['Характер','Готовые системы: что вырезано и как склеено.',[
    ['Ножницы',PRE.sc],['Рваная бумага',PRE.tr],
    ['Мозаика',{ctear:0,cgap:22,clap:25,cpcs:75,csharp:70,csoft:15,cjit:40,cscat:40,clean:4,cbj:40}],
    ['Аккуратная',{ctear:0,cgap:0,clap:0,cpcs:0,csharp:75,csoft:15,cjit:15,cscat:15,clean:2,cbj:20}],
    ['Малыш',{ctear:30,cgap:0,clap:20,cpcs:20,csharp:15,csoft:90,cjit:90,cscat:85,clean:8,cbj:90}]]],
  ['Край','Как оторван край бумаги.',[['Ножницы',{ctear:0}],['Лёгкий',{ctear:30}],['Рваный',{ctear:65}],['Оборванный',{ctear:100}]]],
  ['Зазоры','Расстояние между кусками.',[['Склеено',{cgap:0}],['Узкие',{cgap:15}],['Широкие',{cgap:45}],['Мозаика',{cgap:80}]]],
  ['Кусочки','Из скольких кусков собрана буква.',[['Целые',{cpcs:0}],['Немного',{cpcs:30}],['Много',{cpcs:65}],['Мелко',{cpcs:100}]]],
  ['Вес','Толщина кусков.',[['Светлый',{stem:114}],['Обычный',{stem:150}],['Жирный',{stem:192}],['Чёрный',{stem:226}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;F.deTiny=7;F.coverTight=140;
const ALLCH=[...LAT,...LATL,...CY,...CYL,...DIG].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:ALLCH,desc:ALLCH,descX:0,holeK:0.004,
  drops:(ch,p)=>{const m=aMapChar(ch);if(!m||!AREC[m.id])return 0;const q=Object.assign({},p,{slant:0});const g=aGet(m.id,m.lc,apGen(q),0);return (p.cgap>12||p.cpcs>0)?(g.nGl||0)+(p.cpcs>0?4:0):0;}};
function apLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',106,232,150);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  for(const [k,lo,hi,dv] of [['ctear',0,100,0],['cgap',0,100,0],['clap',0,100,0],['cpcs',0,100,0],['csharp',0,100,50],['csoft',0,100,50],['cjit',0,100,50],['cscat',0,100,50],['clean',0,10,5],['cbj',0,100,70],['cseed',0,99,0]])cl(k,lo,hi,dv);
  q.cseed=Math.round(q.cseed);
  cl('capH',700,700,700);cl('wdth',100,100,100);cl('xh',602,602,602);cl('asc',1130,1130,1130);cl('desc',290,290,290);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',100,100,100);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',40,160,92);cl('track',-60,100,0);cl('space',200,420,300);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='applik')return _pl(p,font);return apLim(p);};
WSCALE.applik=0.77;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='applik'){const t={Light:114,Regular:150,Bold:192,Black:226}[wn];if(t){const k=Math.max(0.7,Math.min(1.3,p.stem/150));o.stem=Math.round(Math.min(232,Math.max(106,t*k)));o.hair=o.stem;}return paramLimits(o,'applik').q;}
  return o;};
KERN_TABLE.applik=(typeof KERN_TABLE_BASE!=='undefined'?KERN_TABLE_BASE:[]).slice();
for(const r of PARAMS)if(!(r[0] in F.params)&&!AP_KEYS.includes(r[0])&&!['sb','track','space','slant'].includes(r[0]))F.params[r[0]]=null;
FONTS.applik=F;
for(const id in FONTS)if(id!=='applik'){const f=FONTS[id];f.params=f.params||{};for(const k of AP_KEYS)if(!(k in f.params))f.params[k]=null;}
}
})();
