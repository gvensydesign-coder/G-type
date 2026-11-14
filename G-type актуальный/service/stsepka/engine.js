/* ---------- «Сцепка»: движок. Острые куски (прямоугольники и ленты) -> объединение -> ОДНА система скруглений ----------
   Все куски строятся острыми; дыры вычитаются из объединения всех кусков; контур снимается с растра (шаг 0.5 ед.), упрощается
   (Дуглас–Пекер 2.2 пикс.), прижимается к вертикалям/горизонталям, затем каждый выпуклый угол получает радиус R (= rnd·S),
   каждый вогнутый — 0.5·R, как у буквы «О». Углы мягче 14° остаются прямыми. Дуги — кубические Безье. */
const stCL=(v,a,b)=>Math.max(a,Math.min(b,v));
const ST_SC=2,ST_EPS=2.2,ST_SNAP=0.6,ST_AMIN=14;
/* ---- куски ---- */
const stRR=(x0,y0,x1,y1)=>({p:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],h:false});
const stRH=(x0,y0,x1,y1)=>({p:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],h:true});
const stPara=(p0,p1,wh)=>{const h=wh/2;return {p:[[p0[0]-h,p0[1]],[p0[0]+h,p0[1]],[p1[0]+h,p1[1]],[p1[0]-h,p1[1]]],h:false};};
const stSolid=vs=>({p:vs.map(v=>[v[0],v[1]]),h:false});
const stHole=vs=>({p:vs.map(v=>[v[0],v[1]]),h:true});
const stShift=(polys,dx,dy)=>polys.map(q=>({p:q.p.map(v=>[v[0]+dx,v[1]+(dy||0)]),h:q.h}));
const stMirror=(polys,w)=>polys.map(q=>({p:q.p.map(v=>[w-v[0],v[1]]).reverse(),h:q.h}));
const stCopy=polys=>polys.map(q=>({p:q.p.map(v=>[v[0],v[1]]),h:q.h}));
function stBBox(polys){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of polys)for(const v of q.p){if(v[0]<x0)x0=v[0];if(v[0]>x1)x1=v[0];if(v[1]<y0)y0=v[1];if(v[1]>y1)y1=v[1];}
  return x0>x1?[0,0,0,0]:[x0,y0,x1,y1];}
/* ---- растр: центр пикселя (i+.5, j+.5), вершины на целой решётке; чёт-нечет ---- */
function stFill(m,W,H,pts,val){let ymin=1e9,ymax=-1e9;for(const v of pts){if(v[1]<ymin)ymin=v[1];if(v[1]>ymax)ymax=v[1];}
  const n=pts.length,xs=[];
  for(let j=Math.max(0,Math.floor(ymin)-1);j<=Math.min(H-1,Math.ceil(ymax));j++){const yc=j+0.5;xs.length=0;
    for(let i=0;i<n;i++){const a=pts[i],b=pts[i+1===n?0:i+1];if((a[1]<=yc)!==(b[1]<=yc))xs.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){const i0=Math.max(0,Math.ceil(xs[k]-0.5)),i1=Math.min(W-1,Math.ceil(xs[k+1]-0.5)-1);
      for(let i=i0;i<=i1;i++)m[j*W+i]=val;}}}
/* маска набора кусков: сначала все твёрдые, потом дыры вычитаются из всего. sc — пикселей на единицу */
function stMask(polys,sc,pad){const b=stBBox(polys);const ox=Math.floor(b[0])-pad,oy=Math.floor(b[1])-pad;
  const W=Math.ceil((b[2]-ox+pad)*sc)+2,H=Math.ceil((b[3]-oy+pad)*sc)+2;const m=new Uint8Array(W*H);
  const tr=pts=>pts.map(v=>[Math.round((v[0]-ox)*sc),Math.round((v[1]-oy)*sc)]);
  for(const q of polys)if(!q.h)stFill(m,W,H,tr(q.p),1);
  for(const q of polys)if(q.h)stFill(m,W,H,tr(q.p),0);
  return {m,W,H,ox,oy,sc};}
/* ---- обход границы по рёбрам пикселей (ink слева): внешние против часовой, дыры по часовой ---- */
function stTrace(M){const {m,W,H}=M,W1=W+1;
  const ed=new Uint8Array(W1*(H+1)),used=new Uint8Array(W1*(H+1));
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){if(!m[j*W+i])continue;
    if(j===0||!m[(j-1)*W+i])ed[j*W1+i]|=1;
    if(i===W-1||!m[j*W+i+1])ed[j*W1+i+1]|=2;
    if(j===H-1||!m[(j+1)*W+i])ed[(j+1)*W1+i+1]|=4;
    if(i===0||!m[j*W+i-1])ed[(j+1)*W1+i]|=8;}
  /* направления: 0=E(+x) 1=N(+y) 2=W(-x) 3=S(-y); чернила слева; в седле — правый поворот (8-связность чернил) */
  const DX=[1,0,-1,0],DY=[0,1,0,-1],loops=[];
  for(let y=0;y<=H;y++)for(let x=0;x<=W;x++){const e=ed[y*W1+x];if(!e)continue;
    for(let d0=0;d0<4;d0++){if(!(e>>d0&1)||(used[y*W1+x]>>d0&1))continue;
      const pts=[];let cx=x,cy=y,d=d0;
      for(;;){used[cy*W1+cx]|=1<<d;const nx=cx+DX[d],ny=cy+DY[d];const eo=ed[ny*W1+nx];
        let nd=-1;for(const c of [(d+3)&3,d,(d+1)&3])if(eo>>c&1){nd=c;break;}
        if(nd!==d)pts.push([nx,ny]);
        if(nd<0)break;
        cx=nx;cy=ny;d=nd;
        if(used[cy*W1+cx]>>d&1)break;}
      if(pts.length>=4)loops.push(pts);}}
  return loops;}
const stArea2=p=>{let a=0;for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length];a+=u[0]*v[1]-v[0]*u[1];}return a;};
/* замкнутый Дуглас–Пекер (как cv2.approxPolyDP) */
function stDP(pts,eps){const n=pts.length;if(n<4)return pts.slice();
  let far=0,fd=-1;for(let i=1;i<n;i++){const d=(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2;if(d>fd){fd=d;far=i;}}
  const keep=new Uint8Array(n);keep[0]=1;keep[far]=1;
  const rec=(a,b)=>{ /* a<b индексы в развёрнутой цепочке (по модулю n) */
    if(b-a<2)return;const P=pts[a%n],Q=pts[b%n];const dx=Q[0]-P[0],dy=Q[1]-P[1],L=Math.hypot(dx,dy);let md=-1,mi=-1;
    for(let i=a+1;i<b;i++){const R=pts[i%n];const d=L<1e-9?Math.hypot(R[0]-P[0],R[1]-P[1]):Math.abs((R[0]-P[0])*dy-(R[1]-P[1])*dx)/L;if(d>md){md=d;mi=i;}}
    if(md>eps){keep[mi%n]=1;rec(a,mi);rec(mi,b);}};
  rec(0,far);rec(far,n);
  const out=[];for(let i=0;i<n;i++)if(keep[i])out.push(pts[i]);return out;}
function stSnap(pts,tol){const n=pts.length,P=pts.map(p=>[p[0],p[1]]);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
    if(Math.abs(a[0]-b[0])<=tol){const m=(a[0]+b[0])/2;a[0]=b[0]=m;}
    if(Math.abs(a[1]-b[1])<=tol){const m=(a[1]+b[1])/2;a[1]=b[1]=m;}}
  return P;}
/* скругление многоугольника: вершины [x,y,r] -> {nodes (кубики), poly (ломаная для измерений)} */
function stFillet(vs){const m=vs.length,nodes=[],poly=[];
  const corner=(x,y)=>{nodes.push({x,y,a:{x,y},b:{x,y}});poly.push([x,y]);};
  for(let i=0;i<m;i++){const [x,y,r]=vs[i];const pv=vs[(i+m-1)%m],nx=vs[(i+1)%m];
    if(r<=0.01){corner(x,y);continue;}
    const d1x=pv[0]-x,d1y=pv[1]-y,d2x=nx[0]-x,d2y=nx[1]-y,l1=Math.hypot(d1x,d1y),l2=Math.hypot(d2x,d2y);
    if(l1<1e-6||l2<1e-6){corner(x,y);continue;}
    const u1=[d1x/l1,d1y/l1],u2=[d2x/l2,d2y/l2];const ang=Math.acos(stCL(u1[0]*u2[0]+u1[1]*u2[1],-1,1));
    if(ang<1e-3||ang>Math.PI-1e-3){corner(x,y);continue;}
    let t=r/Math.tan(ang/2);t=Math.min(t,l1*0.5,l2*0.5);const rr=t*Math.tan(ang/2);
    const p1=[x+u1[0]*t,y+u1[1]*t],p2=[x+u2[0]*t,y+u2[1]*t];
    const bx=u1[0]+u2[0],by=u1[1]+u2[1],bl=Math.hypot(bx,by);
    const cx=x+bx/bl*rr/Math.sin(ang/2),cy=y+by/bl*rr/Math.sin(ang/2);
    const a0=Math.atan2(p1[1]-cy,p1[0]-cx);let da=Math.atan2(p2[1]-cy,p2[0]-cx)-a0;
    while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
    const sg=da<0?-1:1,ns=Math.max(1,Math.ceil(Math.abs(da)/(Math.PI/2)-1e-9)),dd=da/ns,k=4/3*Math.tan(Math.abs(dd)/4)*rr;
    const pt=a=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)],tg=a=>[-Math.sin(a)*sg,Math.cos(a)*sg];
    for(let s=0;s<=ns;s++){const a=a0+dd*s,P=s===0?p1:s===ns?p2:pt(a),T=tg(a);
      const nd={x:P[0],y:P[1],a:{x:P[0],y:P[1]},b:{x:P[0],y:P[1]}};
      if(s>0){nd.a={x:P[0]-T[0]*k,y:P[1]-T[1]*k};}
      if(s<ns){nd.b={x:P[0]+T[0]*k,y:P[1]+T[1]*k};}
      nodes.push(nd);}
    const nps=Math.max(4,Math.ceil(Math.abs(da)/(Math.PI/12)));
    for(let s=0;s<=nps;s++){const a=a0+da*s/nps;poly.push(s===0?p1:s===nps?p2:pt(a));}}
  return {nodes,poly};}
/* итог: массив {hole, nodes, poly}; внешние против часовой, дыры по часовой */
function stFinish(polys,R,ri){
  if(!polys.length)return [];
  const M=stMask(polys,ST_SC,6),loops=stTrace(M),out=[];
  for(const lp of loops){
    let ap=stDP(lp,ST_EPS);if(ap.length<3)continue;
    const isHole=stArea2(ap)<0;
    let pts=ap.map(p=>[M.ox+p[0]/ST_SC,M.oy+p[1]/ST_SC]);
    pts=stSnap(pts,ST_SNAP);
    /* убрать совпавшие подряд вершины */
    const q=[];for(const p of pts){if(!q.length||Math.abs(q[q.length-1][0]-p[0])>1e-9||Math.abs(q[q.length-1][1]-p[1])>1e-9)q.push(p);}
    while(q.length>1&&Math.abs(q[0][0]-q[q.length-1][0])<1e-9&&Math.abs(q[0][1]-q[q.length-1][1])<1e-9)q.pop();
    if(q.length<3)continue;
    const n=q.length,vs=[];
    for(let i=0;i<n;i++){const p0=q[(i+n-1)%n],p1=q[i],p2=q[(i+1)%n];
      const cr=(p1[0]-p0[0])*(p2[1]-p1[1])-(p1[1]-p0[1])*(p2[0]-p1[0]);
      const d1=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]),d2=Math.atan2(p2[1]-p1[1],p2[0]-p1[0]);
      let turn=((d2-d1)*180/Math.PI+180)%360;if(turn<0)turn+=360;turn=Math.abs(turn-180);
      vs.push([p1[0],p1[1],turn<ST_AMIN?0:(cr>0?R:ri)]);}
    const f=stFillet(vs);
    out.push({hole:isHole,nodes:f.nodes,poly:f.poly});}
  return out;}
/* ---- измерения по многоугольнику ---- */
/* интервалы чернил в строке y: объединение твёрдых минус дыры */
function stRowInt(polys,y){const sol=[],hol=[];
  for(const q of polys){const p=q.p,n=p.length,xs=[];
    for(let i=0;i<n;i++){const a=p[i],b=p[i+1===n?0:i+1];if((a[1]<=y)!==(b[1]<=y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    xs.sort((u,v)=>u-v);const tgt=q.h?hol:sol;for(let k=0;k+1<xs.length;k+=2)tgt.push([xs[k],xs[k+1]]);}
  if(!sol.length)return [];
  sol.sort((u,v)=>u[0]-v[0]);const mg=[];for(const s of sol){const l=mg[mg.length-1];if(l&&s[0]<=l[1]+1e-9)l[1]=Math.max(l[1],s[1]);else mg.push([s[0],s[1]]);}
  if(!hol.length)return mg;
  hol.sort((u,v)=>u[0]-v[0]);let cur=mg;
  for(const h of hol){const nx=[];for(const s of cur){if(h[1]<=s[0]||h[0]>=s[1]){nx.push(s);continue;}if(h[0]>s[0])nx.push([s[0],h[0]]);if(h[1]<s[1])nx.push([h[1],s[1]]);}cur=nx;}
  return cur;}
/* профиль края: для строк y0..y1 шаг st — крайний x чернил ('r' макс, 'l' мин) или null */
function stProfile(polys,side,y0,y1,step){const res=[];
  for(let y=y0;y<=y1;y+=step){const iv=stRowInt(polys,y+step/2);
    res.push(!iv.length?null:side==='r'?iv[iv.length-1][1]:iv[0][0]);}
  return res;}
/* топология: части (4-связные), дыры; растр sc=0.25 */
function stTopo(polys,sc){sc=sc||0.25;if(!polys.length)return {parts:0,holes:0,areas:[],holeareas:[]};
  const M=stMask(polys,sc,8),{m,W,H}=M;const lab=new Int32Array(W*H);const stack=[];
  const flood=(val,start,id)=>{let area=0,border=false;stack.push(start);lab[start]=id;
    while(stack.length){const s=stack.pop();area++;const x=s%W,y=(s-x)/W;if(x===0||y===0||x===W-1||y===H-1)border=true;
      if(x>0&&!lab[s-1]&&m[s-1]===val){lab[s-1]=id;stack.push(s-1);}if(x<W-1&&!lab[s+1]&&m[s+1]===val){lab[s+1]=id;stack.push(s+1);}
      if(y>0&&!lab[s-W]&&m[s-W]===val){lab[s-W]=id;stack.push(s-W);}if(y<H-1&&!lab[s+W]&&m[s+W]===val){lab[s+W]=id;stack.push(s+W);}}
    return {area:area/(sc*sc),border};};
  const areas=[],holeareas=[];let id=0;
  for(let s=0;s<W*H;s++){if(lab[s])continue;id++;const r=flood(m[s],s,id);if(m[s]===1)areas.push(Math.round(r.area));else if(!r.border)holeareas.push(Math.round(r.area));}
  areas.sort((a,b)=>a-b);holeareas.sort((a,b)=>a-b);
  return {parts:areas.length,holes:holeareas.length,areas,holeareas};}
