/* ===== «Сцепка» (Stsepka Display): конструкторные лигатуры, кусками из прямых, один радиус. Части: stsepka/engine.js letters.js glyphs.js spacing.js lig.js api.js tail.js (сборка mk_stsepka.sh) ===== */
(function(){
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
/* ---------- «Сцепка»: рецепты букв (прописные формы; строчные — те же формы, ниже и тоньше) ---------- */
function stCtx(o){o=o||{};const S=o.S==null?138:o.S,rnd=o.rnd==null?0.45:o.rnd;
  const c={S,T:0.8*S,wd:o.wd==null?1:o.wd,r:rnd*S,ri:0.5*rnd*S,gap:o.gap==null?44:o.gap,lcr:o.lcr==null?0.72:o.lcr,jump:o.jump==null?1:o.jump,cmin:Math.max(46,0.30*S),lc:false,rnd};
  return c;}
function stSub(c,k){const d=Object.assign({},c);d.lc=true;d.S=c.S*k;d.T=c.T*k;d.r=c.r*k;d.ri=c.ri*k;return d;}
const ST_LET={};
function stReg(chars,wr,ns,flags,f){flags=flags||{};for(const ch of chars)ST_LET[ch]={f,wr,ns,lw:!!flags.lw,rs:!!flags.rs,at:!!flags.at,af:!!flags.af,ch};}
const ST_MINW={'И':S=>2.8*S+40,'N':S=>2.8*S+40,'К':S=>2.45*S+40,'K':S=>2.45*S+40,'Л':S=>3.0*S,'D':S=>2.95*S,'В':S=>2.45*S,'B':S=>2.45*S,'Б':S=>2.45*S,'8':S=>2.45*S};
function stWidth(ch,c,H){const d=ST_LET[ch];const m=ST_MINW[ch]?ST_MINW[ch](c.S):0;
  let raw=Math.max(1.08*d.wr*H*c.wd,d.ns*c.S+(d.ns-1)*c.cmin+(ch==='1'?0.5*c.S:0),m);
  if(c.lc&&'ВB8Б'.includes(ch))raw*=1.16;
  const q=0.5*c.S,lo=Math.max(d.ns*c.S+(d.ns-1)*c.cmin+(ch==='1'?0.5*c.S:0),m);
  return Math.max(Math.round(raw/q)*q,Math.ceil(lo/q)*q);}
/* build: -> {polys,w} ; x0 ink from 0 */
function stBuild(ch,c,H,xt,xf,w){const d=ST_LET[ch];if(w==null)w=stWidth(ch,c,H);
  return {polys:d.f(c,w,H,xt||0,xf||0),w,ext:Math.max(xt||0,xf||0)};}
const rr=stRR;
function stRing(x0,y0,x1,y1,c,ri){const S=c.S,T=c.T;return [rr(x0,y0,x1,y1),stRH(x0+S,y0+T,x1-S,y1-T)];}
const stYm=(c,H)=>0.47*H;
/* ---- прямые ---- */
stReg('ОO',.54,2,{lw:1,rs:1},(c,w,H)=>stRing(0,0,w,H,c));
/* CS68: 0 ≠ О — кольцо с косой чертой в счётчике (одинаковые ствол/радиусы), ширина прежняя */
stReg('0',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(0,0,w,T),rr(0,H-T,w,H),stPara([S*0.9,T*0.9],[w-S*0.9,H-T*0.9],0.5*S)];});
stReg('НH',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H);return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,ym-T/2,w-S+1,ym+T/2)];});
stReg('П',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,H-T,w-S+1,H)];});
const stG=(c,w,H,xt)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,H-T,w+xt,H)];};
stReg('ГF',.46,1,{lw:1,at:1},(c,w,H,xt)=>stG(c,w,H,xt));
stReg('F',.46,1,{lw:1,at:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,ym=stYm(c,H);return stG(c,w,H,xt).concat([rr(S-1,ym-T/2,w*0.84,ym+T/2)]);});
stReg('ТT',.54,1,{at:1},(c,w,H,xt)=>{const S=c.S,T=c.T;return [rr(0,H-T,w+xt,H),rr(w/2-S/2,0,w/2+S/2,H-T+1)];});
stReg('ЕE',.46,1,{lw:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,ym=stYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.86,ym+T/2),rr(0,0,w+xf,T)];});
stReg('L',.46,1,{lw:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,0,w+xf,T)];});
stReg('I',.12,1,{lw:1,rs:1},(c,w,H)=>[rr(0,0,w,H)]);/* FX2g: I = голый ствол (ширина по S, 0.22·H давало 177 u при штрихе 118 в Light) */
const stU=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,T)];};
stReg('U',.54,2,{lw:1,rs:1},stU);
stReg('Ц',.56,2,{lw:1,rs:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,g=c.gap,D=g+T,ext=Math.max(xf,0.6*S);
  return stU(c,w,H).concat([rr(w-S,-D,w,1),rr(w-1,-D,w+ext,-g)]);});
const stSh=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(w/2-S/2,0,w/2+S/2,H),rr(S-1,0,w-S+1,T)];};
stReg('Ш',.82,3,{lw:1,rs:1},stSh);
stReg('Щ',.86,3,{lw:1,rs:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,g=c.gap,D=g+T,ext=Math.max(xf,0.6*S);
  return stSh(c,w,H).concat([rr(w-S,-D,w,1),rr(w-1,-D,w+ext,-g)]);});
stReg('Ч',.52,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,yq=0.36*H;return [rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T)];});
stReg('Ь',.50,2,{lw:1},(c,w,H)=>{const S=c.S,hb=0.62*H;return [rr(0,0,S,H)].concat(stRing(0,0,w,hb,c));});
stReg('Ъ',.58,2,{},(c,w,H)=>{const S=c.S,T=c.T,hb=0.62*H,fl=0.85*S;const d=fl+2*S-w;if(-22<d&&d<22)w=fl+2*S-26;
  return [rr(0,H-T,fl+S,H),rr(fl,0,fl+S,H)].concat(stRing(fl,0,w,hb,c));});
stReg('Ы',.78,3,{lw:1,rs:1},(c,w,H)=>{const S=c.S,hb=0.62*H,g=Math.max(26,0.2*S),bw=w-S-g;
  return [rr(0,0,S,H)].concat(stRing(0,0,bw,hb,c),[rr(w-S,0,w,H)]);});
stReg('Б',.50,2,{lw:1,at:1},(c,w,H,xt)=>{const S=c.S,T=c.T,hb=0.58*H;return [rr(0,0,S,H),rr(0,H-T,w+xt,H)].concat(stRing(0,0,w,hb,c));});
const stTwo=(c,w,H,yu)=>stRing(0,yu,w,H,c).concat(stRing(0,0,w,yu+c.T,c));
stReg('ВB',.52,2,{lw:1},(c,w,H)=>stTwo(c,w,H,0.42*H));/* FX2g: талия 0.42 H (было 0.46) — В отличается от 8 (0.52) */
stReg('8',.46,2,{lw:1,rs:1},(c,w,H)=>stTwo(c,w,H,0.52*H));
const stRru=(c,w,H,xt)=>{const S=c.S,T=c.T,yu=0.40*H;const P=[rr(0,0,S,H)].concat(stRing(0,yu,w,H,c));if(xt)P.push(rr(w-1,H-T,w+xt,H));return P;};
stReg('РP',.50,2,{lw:1,at:1},stRru);
const stRl=(c,w,H)=>{const S=c.S,yu=0.40*H,wh=1.0*S;
  return stRru(c,w,H,0).concat([stPara([Math.max(w-wh/2-0.40*yu,S+0.5*wh+0.3*c.cmin),yu+0.45*c.T],[w-wh/2,0],wh)]);};
stReg('R',.54,2,{lw:1},stRl);
stReg('Я',.54,2,{rs:1},(c,w,H)=>stMirror(stRl(c,w,H),w));
stReg('D',.54,2,{lw:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,w,H),stRH(1.45*S,T,Math.max(w-S,1.45*S+0.45*S),H-T)];});
stReg('Q',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return stRing(0,0,w,H,c).concat([rr(w-1.55*S,-0.80*T,w+0.28*S,0.55*T)]);});/* FX2g: хвост Q — брусок под правой половиной кольца (было малый выступ): Q ≠ 0 */
const stC=(c,w,H,hk)=>{const S=c.S,T=c.T;hk=hk==null?(T+0.6*S):hk;hk=Math.min(hk,0.36*H);
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(w-S,0,w,hk)];};
stReg('СC',.52,2,{lw:1},(c,w,H)=>stC(c,w,H));
stReg('G',.54,2,{lw:1},(c,w,H)=>{const S=c.S,T=c.T,hk=Math.min(T+0.6*S,0.36*H),yh=0.52*H;
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(w-S,0,w,yh),rr(w*0.46,yh-T,w-S+1,yh)];});
/* FX2g: Э — перекладина длиннее (от 0.10 w) и крюки короче (≤ 0.8 от предела): З/Э/3 различимы при 12 px */
/* CS68: Э — одна чаша: сплошная прямая правая стойка без талии, короткий язычок слева (не касается стойки), крюки левых концов внутрь */
stReg('Э',.52,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=Math.min(T+0.3*S,0.8*(ym-T/2-0.35*S)),cw=w-2*S;
  return [rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,0,w,H),rr(0,H-hk,S,H),rr(0,0,S,hk),rr(0,ym-T/2,Math.max(S+0.2*S,0.55*cw+S*0.5),ym+T/2)];});
const stThree=(c,w,H,hookTop,hookBot,hk,waist)=>{const S=c.S,T=c.T,ym=stYm(c,H),nh=0.9*T,hkm=Math.min(H-ym-T/2-0.35*S,ym-T/2-0.35*S);hk=Math.min(hk,hkm);
  const P=[rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,ym+nh/2-3,w,H-T/2),rr(w-S,T/2,w,ym-nh/2+3),rr(Math.max(w*0.42,w-1.62*S),ym-nh/2,w-(waist?0.4*S:0),ym+nh/2)];
  if(hookTop)P.push(rr(0,H-hk,S,H));if(hookBot)P.push(rr(0,0,S,hk));return P;};
stReg('З',.52,2,{},(c,w,H)=>stThree(c,w,H,true,true,c.T+0.75*c.S,true));
stReg('3',.52,2,{},(c,w,H)=>stThree(c,w,H,false,true,c.T+0.3*c.S));
stReg('S',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=Math.min(T+0.6*S,H-ym-T/2-0.35*S,ym-T/2-0.35*S);
  return [rr(0,H-T,w,H),rr(0,ym-T/2,S,H-T/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,T/2,w,ym+T/2),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(0,0,S,hk)];});
stReg('5',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=T+0.3*S;
  return [rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,T/2,w,ym+T/2),rr(0,0,w,T),rr(0,0,S,hk)];});
stReg('2',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H);
  return [rr(0,H-T,w,H),rr(w-S,ym-T/2,w,H-T/2),rr(0,ym-T/2,w,ym+T/2),rr(0,T/2,S,ym+T/2),rr(0,0,w,T)];});
const st6=(c,w,H)=>{const S=c.S,T=c.T,hb=0.60*H,hk=T+0.3*S;
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(w-S,H-hk,w,H)].concat(stRing(0,0,w,hb,c));};
stReg('6',.52,2,{lw:1},st6);
stReg('9',.52,2,{rs:1},(c,w,H)=>st6(c,w,H).map(q=>({p:q.p.map(v=>[w-v[0],H-v[1]]),h:q.h})));
stReg('4',.54,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,yb=0.24*H,wh=0.95*S;
  return [rr(w-S,0,w,H),rr(0,yb,w,yb+T),stPara([wh/2,yb+T],[w-S-wh/2,H],wh)];});
stReg('7',.50,1,{},(c,w,H)=>{const S=c.S,T=c.T,wh=1.05*S;return [rr(0,H-T,w,H),stPara([w*0.40,0],[w-wh/2,H-T],wh)];});
stReg('1',.38,1,{rs:1},(c,w,H)=>{const S=c.S,wh=S;return [rr(w-S,0,w,H),stPara([w-S/2,H],[wh*0.45,H-0.27*H],wh)];});
/* ---- диагональные ---- */
const ST_LEAN=12*Math.PI/180;
function stKpart(c,w,H,x0){x0=x0||0;const S=c.S,T=c.T,ym=stYm(c,H),wh=S/Math.cos(ST_LEAN),st=Math.max(0.42*S,c.cmin*0.9),xb=x0+S+st+wh/2;
  let xt=Math.min(x0+w-wh/2,xb+(H-ym)*Math.tan(16*Math.PI/180));xt=Math.max(xt,xb+4);
  return [rr(x0+S-1,ym-T/2,xb+wh/2,ym+T/2),stPara([xb,ym],[xt,H],wh),stPara([xb,ym],[xt,0],wh)];}
stReg('КK',.54,2,{lw:1},(c,w,H)=>[rr(0,0,c.S,H)].concat(stKpart(c,w,H)));
stReg('Ж',1.0,3,{},(c,w,H)=>{const S=c.S,ym=stYm(c,H),wc=w/2;
  const cen=rr(wc-S/2,0,wc+S/2,H),L=rr(0,0,S,H),R_=rr(w-S,0,w,H),xs=wc-S/2+1,hb=1.7*S/2,hn=0.34*S;
  const lsp=stSolid([[S-1,ym-hb],[xs,ym-hn],[xs,ym+hn],[S-1,ym+hb]]),rsp=stSolid([[w-S+1,ym-hb],[wc+S/2-1,ym-hn],[wc+S/2-1,ym+hn],[w-S+1,ym+hb]]);
  return [L,R_,cen,lsp,rsp];});
const stI2=(c,w,H)=>{const S=c.S;return [rr(0,0,S,H),rr(w-S,0,w,H),stPara([S*0.5,0],[w-S*0.5,H],S)];};
stReg('ИN',.54,2,{lw:1,rs:1},stI2);
stReg('N',.54,2,{lw:1,rs:1},(c,w,H)=>stMirror(stI2(c,w,H),w));
stReg('ХX',.50,2,{},(c,w,H)=>{const S=c.S,wh=S;return [stPara([wh/2,0],[w-wh/2,H],wh),stPara([w-wh/2,0],[wh/2,H],wh)];});
stReg('Y',.50,2,{},(c,w,H)=>{const S=c.S,wh=S,ymid=0.42*H;
  return [stPara([wh/2,H],[w/2,ymid],wh),stPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];});
stReg('У',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,g=c.gap,yb=0.42*H;
  return [rr(w-S,0,w,H),rr(0,yb,S,H),rr(S-1,yb,w-S+1,yb+T),rr(0,0,S,yb-g),rr(S-1,0,w-S+1,T)];});
stReg('V',.54,2,{},(c,w,H)=>{const S=c.S,wh=S;return [stPara([wh/2,H],[w/2,0],wh),stPara([w-wh/2,H],[w/2,0],wh)];});
stReg('W',.90,3,{},(c,w,H)=>{const S=c.S,wh=0.9*S,q=w/4;
  return [stPara([wh/2,H],[q,0],wh),stPara([2*q,H*0.58],[q,0],wh),stPara([2*q,H*0.58],[3*q,0],wh),stPara([w-wh/2,H],[3*q,0],wh)];});
stReg('МM',.70,3,{lw:1,rs:1},(c,w,H)=>{const S=c.S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),stPara([S/2,H],[w/2,0.34*H],S),stPara([w-S/2,H],[w/2,0.34*H],S)];});
stReg('Z',.48,2,{af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,wh=S;return [rr(0,H-T,w,H),rr(0,0,w+xf,T),stPara([w-wh/2,H-T],[wh/2,T],wh)];});
stReg('Л',.58,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,al=7*Math.PI/180,wh=S/Math.cos(al),lean=H*Math.tan(al),xl=lean;
  return [rr(xl,H-T,w,H),rr(w-S,0,w,H),stPara([wh/2,0],[wh/2+lean,H],wh)];});
stReg('Д',.54,2,{lw:1,rs:1,af:1},(c,w,H)=>{const S=c.S,T=c.T,D=0.8*T;
  return [rr(0,-D,S,H),rr(w-S,-D,w,H),rr(0,H-T,w,H),rr(S-1,0,w-S+1,T)];});
stReg('АA',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,yb=0.30*H;
  const sol=stSolid([[0,0],[S,0],[S,yb],[w-S,yb],[w-S,0],[w,0],[w,H],[0,H]]);
  return [sol,stHole([[S,yb+T],[w-S,yb+T],[w-S,H-T],[S,H-T]])];});
stReg('Ф',.68,3,{},(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return stRing(0,y0,w,y1,c).concat([rr(w/2-S/2,0,w/2+S/2,H)]);});
stReg('Ю',.80,3,{lw:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),bl=0.55*S;
  return [rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)].concat(stRing(S+bl,0,w,H,c));});
stReg('J',.46,1,{},(c,w,H)=>{const S=c.S,T=c.T,hk=T+0.5*S;return [rr(w-S,0,w,H),rr(0,0,w,T),rr(0,0,S,hk)];});
/* ---------- «Сцепка»: полный базовый набор поверх рецептов: строчные, акценты, цифры, знаки ---------- */
const ST_CAPH=700;
const ST_CYR_U='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',ST_CYR_L='абвгдежзийклмнопрстуфхцчшщъыьэюя';
const ST_LAT_U='ABCDEFGHIJKLMNOPQRSTUVWXYZ',ST_LAT_L='abcdefghijklmnopqrstuvwxyz',ST_DIG='0123456789';
const ST_PUNCT=[...'.,:;!?«»„“”‘’"\'-–—()/&№…@#%*−·•°+=\\|₽©'];
const ST_SPACES={' ':300,' ':300,' ':120,' ':150};
const ST_LC_DY={b:.085,d:.085,f:.085,h:.085,k:.085,l:.085,t:.06,i:.04,j:-.03,g:-.085,p:-.085,q:-.085,y:-.085,'б':.085,'ф':-.085,'р':-.085,'ц':-.03,'щ':-.03,'д':-.03};
const ST_LC_BASE={};{const a=ST_LAT_L+ST_CYR_L,b=ST_LAT_U+ST_CYR_U;for(let i=0;i<a.length;i++)ST_LC_BASE[a[i]]=b[i];}
const stBaseOf=ch=>ST_LC_BASE[ch]||ch;
/* FX2g: строчный ствол = 0.88 S (как у прописных лесенка весов), предел по высоте строчных 0.27·xh вместо 0.245·xh: 101/118/130/135 вместо 104/121/123/123 (Bold = Black раньше) */
const stLcCtx=c=>stSub(c,Math.min(0.86,0.27*c.lcr*ST_CAPH/c.S));
const stDot=(x,y,d)=>rr(x,y,x+d,y+d);
const ST_JK=1.15;
/* Й: сплошной треугольник в левом верхнем счётчике «И», слитый со стойкой и с верхней линией, одна широкая косая щель (JK·g) к диагонали */
function stJtri(c,w,H){const S=c.S,m=(w-S)/H,xe=y=>m*y,k=Math.sqrt(1+m*m),g=c.gap,hs=ST_JK*g*k,yt=(S+hs)/m;
  if(H-yt<0.35*S)return [];
  return [stSolid([[S*0.5,yt-4],[S+1,yt],[xe(H)-hs,H],[S*0.5,H]])];}
function stAccents(ch,c,H,w){const S=c.S;let out=[];
  if(ch==='ё'||ch==='Ё'){const d=0.62*S,gap=0.5*d,tot=2*d+gap,x0=(w-tot)/2,y0=H+0.30*S;out=[stDot(x0,y0,d),stDot(x0+d+gap,y0,d)];}
  if(ch==='й'||ch==='Й')out=out.concat(stJtri(c,w,H));
  return out;}
/* знак -> {cs:[{hole,nodes,poly}], w, dy, polys(острые куски, до скруглений)} */
function stGlyphPiece(ch,c){const Hcap=ST_CAPH;
  if(ST_SPACES[ch]!=null)return {cs:[],w:ST_SPACES[ch],dy:0,raw:[]};
  const lc=ST_LC_BASE[ch]!=null&&ch!==ch.toUpperCase();
  if(ST_DIG.includes(ch)||ST_LAT_U.includes(ch)||ST_CYR_U.includes(ch)||ST_LC_BASE[ch]!=null||'ЁёЙй'.includes(ch)){
    let b;if(ch==='Ё'||ch==='ё')b='Е';else if(ch==='Й'||ch==='й')b='И';else b=stBaseOf(ch);
    const up=(ch!==ch.toLowerCase()&&ch===ch.toUpperCase())||ST_DIG.includes(ch)||ch==='Ё'||ch==='Й';
    let H,cc;if(up){H=Hcap;cc=c;}else{H=Hcap*c.lcr;cc=stLcCtx(c);}
    let dy=0;if(ST_LC_BASE[ch]!=null&&ch!==ch.toUpperCase()){dy=(ST_LC_DY[ch]||0)*c.jump*Hcap;if(ch==='ф')H=Hcap*(c.lcr+0.17);}
    const P=stBuild(b,cc,H);const raw=P.polys.concat(stAccents(ch,cc,H,P.w));
    return {cs:stFinish(raw,cc.r,cc.ri),w:P.w,dy,raw};}
  const Q=stPunct(ch,c,Hcap);if(!Q)return null;
  return {cs:stFinish(Q.polys,c.r,c.ri),w:Q.w,dy:0,raw:Q.polys};}
const stComma=(x,y,d)=>[stDot(x,y,d),stPara([x+d*0.62,y+d*0.2],[x+d*0.22,y-0.72*d],d*0.72)];
function stPunct(ch,c,H){const S=c.S,T=c.T,r=c.r,d=0.92*S,ym=0.47*H;let polys=[],w=0;
  if(ch==='.'){polys=[stDot(0,0,d)];w=d;}
  else if(ch===','){polys=stComma(0.15*d,0,d);w=1.15*d;}
  else if(ch===':'){polys=[stDot(0,0,d),stDot(0,0.36*H,d)];w=d;}
  else if(ch===';'){polys=[stDot(0.15*d,0.36*H,d)].concat(stComma(0.15*d,0,d));w=1.15*d;}
  else if(ch==='!'){polys=[rr(0,0.25*H,d,H),stDot(0,0,d)];w=d;}
  else if(ch==='?'){w=0.46*H;polys=[rr(0,H-T,w,H),rr(w-S,0.5*H,w,H-T/2),rr(w/2-S/2,0.5*H,w,0.5*H+T),rr(w/2-S/2,0.25*H,w/2+S/2,0.5*H+T/2),stDot(w/2-d/2,0,d)];}
  else if(ch==='«'||ch==='»'){const hh=0.17*H,yc=0.40*H,dx=0.16*H,t=0.8*S;
    const chev=(x0,flip)=>{let vs=[[0,yc],[dx,yc+hh],[dx+t,yc+hh],[t,yc],[dx+t,yc-hh],[dx,yc-hh]];if(flip)vs=vs.map(v=>[dx+t-v[0],v[1]]);return stSolid(vs.map(v=>[v[0]+x0,v[1]]));};
    const step=0.5*dx+1.3*t;w=dx+t+step;polys=[chev(0,ch==='»'),chev(step,ch==='»')];}
  else if('„“”‘’'.includes(ch)){const yh=(ch==='„')?0:('“”‘’'.includes(ch)?H-d*0.95:0),gp=0.45*d,n='„“”'.includes(ch)?2:1;
    for(let k=0;k<n;k++){let q=stComma(0,yh,d);q=stShift(q,k*(d+gp)+0.15*d,0);
      if(ch==='“'||ch==='‘'){const cy=yh+d/2,cx=0.15*d+k*(d+gp)+d/2;q=q.map(z=>({p:z.p.map(v=>[2*cx-v[0],2*cy-v[1]]),h:z.h}));}
      polys=polys.concat(q);}
    w=n*d+(n-1)*gp+0.3*d;}
  else if(ch==='"'){const b=0.8*S;polys=[rr(0,0.62*H,b,H),rr(b+0.5*b,0.62*H,2.5*b,H)];w=2.5*b;}
  else if(ch==="'"){const b=0.8*S;polys=[rr(0,0.62*H,b,H)];w=b;}
  else if(ch==='-'){w=0.36*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='–'){w=0.58*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='—'){w=0.92*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='−'){w=0.46*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='('||ch===')'){w=0.34*H;const wh=0.85*S;
    polys=[rr(0,0.12*H,wh,0.88*H),stPara([wh/2,0.84*H],[w-wh/2,1.02*H],wh),stPara([wh/2,0.16*H],[w-wh/2,-0.02*H],wh)];if(ch===')')polys=stMirror(polys,w);}
  else if(ch==='/'){w=0.50*H;const wh=0.8*S;polys=[stPara([wh/2,-0.04*H],[w-wh/2,1.0*H],wh)];}
  else if(ch==='&'){w=0.66*H;const wh=S;
    polys=stRing(w*0.08,0.50*H,w*0.92,H,c).concat(stRing(0,0,w*0.96,0.58*H,c),[stPara([w*0.5,0.6*H],[w-wh/2+0.1*S,0],wh)]);}
  else if(ch==='№'){const n=stBuild('N',c,H),o=stBuild('O',stSub(c,0.8),0.46*H);w=n.w+0.12*S+o.w;
    polys=n.polys.concat(stShift(o.polys,n.w+0.12*S,H-0.46*H),[rr(n.w+0.12*S,H-0.46*H-0.5*T,w,H-0.46*H-0.5*T+0.5*T*0.8)]);}
  else if(ch==='…'){const gp=0.45*d;w=3*d+2*gp;polys=[0,1,2].map(k=>stDot(k*(d+gp),0,d));}
  else if(ch==='@'){w=0.80*H;const h=0.80*H;polys=stRing(0,0,w,h,c).concat(stRing(w*0.30,h*0.5-0.20*H,w*0.70,h*0.5+0.20*H,stSub(c,0.62)));}
  else if(ch==='#'){w=0.62*H;const b=0.72*S;polys=[rr(w*0.2,0,w*0.2+b,H),rr(w*0.8-b,0,w*0.8,H),rr(0,H*0.28,w,H*0.28+b),rr(0,H*0.62,w,H*0.62+b)];}
  else if(ch==='%'){w=0.78*H;const s=0.30*H,wh=0.6*S;
    polys=stRing(0,H-s,s,H,stSub(c,0.45)).concat(stRing(w-s,0,w,s,stSub(c,0.45)),[stPara([wh/2,0],[w-wh/2,H],wh)]);}
  else if(ch==='*'){w=0.50*H;const b=0.46*S,cx=w/2,cy=0.76*H,L=0.2*H;
    polys=[rr(cx-b/2,cy-L,cx+b/2,cy+L),stPara([cx-L*.8,cy-L*.8],[cx+L*.8,cy+L*.8],b),stPara([cx+L*.8,cy-L*.8],[cx-L*.8,cy+L*.8],b),rr(cx-L,cy-b/2,cx+L,cy+b/2)];}
  else if(ch==='·'){polys=[stDot(0,0.5*c.lcr*H-d/2,d)];w=d;}
  else if(ch==='•'){const D=1.75*d;polys=[stDot(0,ym-D/2,D)];w=D;}
  else if(ch==='°'){const s=0.30*H;polys=stRing(0,H-s,s,H,stSub(c,0.45));w=s;}
  else if(ch==='+'){w=0.50*H;const b=0.72*S;polys=[rr(w/2-b/2,ym-w/2+0.04*H,w/2+b/2,ym+w/2-0.04*H),rr(0.04*H,ym-T*.55,w-0.04*H,ym+T*.55)];}
  else if(ch==='='){w=0.46*H;const g=0.17*H;polys=[rr(0,ym-g-T*.5,w,ym-g+T*.5),rr(0,ym+g-T*.5,w,ym+g+T*.5)];}
  else if(ch==='\\'){w=0.50*H;const wh=0.8*S;polys=[stPara([wh/2,1.0*H],[w-wh/2,-0.04*H],wh)];}
  else if(ch==='|'){const b=0.8*S;w=b;polys=[rr(0,-0.1*H,b,0.98*H)];}
  else if(ch==='₽'){const P=stBuild('P',c,H);w=P.w;polys=P.polys.concat([rr(-0.3*S,0.27*H,0.9*w,0.27*H+0.8*T)]);w=P.w+0.1*S;}
  else if(ch==='©'){const h=0.86*H;w=h;const b=0.5*S,ch2=0.34*H,cw=0.26*H,x0=(w-cw)/2,y0=(h-ch2)/2;
    polys=[rr(0,0,S,h),rr(w-S,0,w,h),rr(0,0,w,T),rr(0,h-T,w,h),rr(x0,y0,x0+b,y0+ch2),rr(x0,y0,x0+cw,y0+b),rr(x0,y0+ch2-b,x0+cw,y0+ch2)];}
  else return null;
  return {polys,w};}
function stAllChars(){return [...ST_LAT_U+ST_LAT_L+ST_CYR_U+ST_CYR_L+'Ёё'+ST_DIG].concat(ST_PUNCT,Object.keys(ST_SPACES));}
/* ---------- «Сцепка»: оптический спейсинг по балансу белой площади (одно правило для всех знаков) ----------
   1. поле:  sb = max(SMIN, A − ALPHA·среднее по полосе(min(глубина(y), CAP)))      (глубина = от габарита до чернил в строке)
   2. кернинг пары k(a,b) = ЦЕЛЬ − площадь(a,b), но зазор в самых близких рядах не меньше CLR   (ЦЕЛЬ = площадь пары Н–Н)
   Все слагаемые масштабируются зазором g: плоский зазор «стойка|стойка» равен g (поле g/2 с каждой стороны). */
const ST_ALPHA=0.5,ST_WIN=8,ST_CLRF=1.0;
const ST_YS=[];for(let y=-300;y<1100;y+=4)ST_YS.push(y);
function stSpCfg(g){const A=g/2,k=A/26;return {g,A,CAP:70*k,SMIN:-30*k,CLR:ST_CLRF*g};}
/* контуры -> многоугольники для измерений ({p,h}) */
const stPolysOf=cs=>cs.map(c=>({p:c.poly,h:c.hole}));
/* Крайние чернила по строкам — как у эталона: растр 0.5 пикс/ед. (PIL polygon при 2-кратной выборке и BILINEAR-уменьшении, порог >127), т.е. край
   квантуется сеткой 2 ед.; точный край давал бы другие значения кернинга на ±1. Координаты эталона сдвинуты на 0.25 от решётки JS. */
const ST_PH=0.25;
const stRound=v=>{const f=Math.floor(v),d=v-f;return d<0.5?f:d>0.5?f+1:(f%2===0?f:f+1);};
function stEdgeRows(polys,x0,y0,x1,y1){
  const ox=Math.floor(x0+ST_PH)-8,oy=Math.floor(y0+ST_PH)-8,W=Math.floor((x1+ST_PH-ox+8)*0.5)+2,H=Math.floor((y1+ST_PH-oy+8)*0.5)+2,n=ST_YS.length;
  const dl=new Float64Array(n).fill(NaN),dr=new Float64Array(n).fill(NaN),SW=2*W,SH=2*H;
  const row=new Map();   /* src-строка -> Uint8Array покрытия (closed-pixel cover вдоль линии r+0.5) */
  const getRow=r=>{if(r<0||r>=SH)return null;let a=row.get(r);if(a)return a;a=new Uint8Array(SW);
    const yc=oy+SH-r-0.5-ST_PH;for(const iv of stRowInt(polys,yc)){const c0=Math.max(0,Math.floor(iv[0]+ST_PH-ox)),c1=Math.min(SW-1,Math.floor(iv[1]+ST_PH-ox));for(let c=c0;c<=c1;c++)a[c]=1;}
    row.set(r,a);return a;};
  const WT=[0.125,0.375,0.375,0.125],cov=new Float64Array(W);
  for(let k=0;k<n;k++){const y=ST_YS[k],j=stRound(H-1-(y-oy)*0.5);if(j<0||j>=H)continue;
    cov.fill(0);let any=false;
    for(let a=0;a<4;a++){const A=getRow(2*j-1+a);if(!A)continue;const wy=WT[a];
      for(let i=0;i<W;i++){let sx=0;for(let b=0;b<4;b++){const c=2*i-1+b;if(c>=0&&c<SW&&A[c])sx+=WT[b];}if(sx)cov[i]+=wy*sx;}}
    let first=-1,last=-1;for(let i=0;i<W;i++)if(cov[i]*255>127){if(first<0)first=i;last=i;}
    if(first>=0){dl[k]=ox+first*2-(x0+ST_PH);dr[k]=(x1+ST_PH)-(ox+(last+1)*2);}}
  return {dl,dr};}
function stGS(polys,cfg){
  if(!polys.length)return {empty:true,sbl:0,sbr:0};
  const b=stBBox(polys),x0=b[0],y0=b[1],x1=b[2],y1=b[3],n=ST_YS.length;
  const {dl,dr}=stEdgeRows(polys,x0,y0,x1,y1);
  const lo=Math.max(y0+ST_PH,0),hi=y1+ST_PH,lo2=lo+0.06*(hi-lo),hi2=hi-0.06*(hi-lo),band=new Uint8Array(n);
  const ml_=new Float64Array(n),mr_=new Float64Array(n);let sl=0,sr=0,nb=0;
  for(let k=0;k<n;k++){band[k]=(ST_YS[k]>=lo2&&ST_YS[k]<=hi2)?1:0;
    ml_[k]=isNaN(dl[k])?cfg.CAP:Math.min(dl[k],cfg.CAP);mr_[k]=isNaN(dr[k])?cfg.CAP:Math.min(dr[k],cfg.CAP);
    if(band[k]){sl+=ml_[k];sr+=mr_[k];nb++;}}
  const ml=nb?sl/nb:cfg.CAP,mr=nb?sr/nb:cfg.CAP;
  return {empty:false,bbox:b,dl,dr,band,maskL:ml_,maskR:mr_,ml,mr,sbl:Math.max(cfg.SMIN,cfg.A-ST_ALPHA*ml),sbr:Math.max(cfg.SMIN,cfg.A-ST_ALPHA*mr)};}
/* пара a b без кернинга -> {area, clr} */
function stPair(a,b){
  if(a.empty||b.empty)return null;
  const n=ST_YS.length;let any=false;
  for(let k=0;k<n;k++)if(a.band[k]&&b.band[k]){any=true;break;}
  let s=0,cnt=0;
  for(let k=0;k<n;k++){const inb=any?(a.band[k]&&b.band[k]):(a.band[k]||b.band[k]);if(!inb)continue;
    s+=a.sbr+b.sbl+ST_ALPHA*(a.maskR[k]+b.maskL[k]);cnt++;}
  const area=cnt?s/cnt:0;
  let clr=1e9;const row=new Float64Array(n);let have=false,mn=1e9;
  for(let k=0;k<n;k++){if(!isNaN(a.dr[k])&&!isNaN(b.dl[k])){row[k]=a.sbr+b.sbl+a.dr[k]+b.dl[k];have=true;if(row[k]<mn)mn=row[k];}else row[k]=NaN;}
  if(have){
    for(let i=0;i+ST_WIN<=n;i++){let s2=0,ok=true;for(let j=0;j<ST_WIN;j++){const v=row[i+j];if(isNaN(v)){ok=false;break;}s2+=v;}if(ok){const m=s2/ST_WIN;if(m<clr)clr=m;}}
    if(clr>=1e8)clr=mn;}
  return {area,clr};}
function stKernFor(a,b,target,cfg,kmin,kmax){kmin=kmin==null?-90:kmin;kmax=kmax==null?140:kmax;
  const p=stPair(a,b);if(!p)return 0;let k=target-p.area;if(p.clr<1e8)k=Math.max(k,cfg.CLR-p.clr);
  k=Math.max(kmin,Math.min(kmax,k));return Math.round(k);}
/* ---------- «Сцепка»: конструкторные лигатуры — режимы пар, жёсткие нижние пороги, сборка ----------
   режимы: share (общая стойка, обе полной высоты) | roof (верхняя перекладина одной переходит в крышу другой: настоящее слияние)
           | shelf (рука над: партнёр ≥ .72 высоты) | nest (партнёр ступенью вверх/вниз ≥ .78 прописной / .88 строчной) | foot (стопа латинской L ≤ .5 ширины партнёра) */
const ST_YG0=-420,ST_YG1=1248;
const ST_FLOOR_CAPS=0.72,ST_NEST_CAPS=0.78,ST_NEST_LC=0.88,ST_FOOT_MAX=0.5;
const ST_SHARE={'НН':1,'НА':2,'НЕ':1,'НЫ':2,'НЬ':2,'НП':2,'НМ':2,'ПИ':1,'ПЕ':2,'ПА':2,'ПО':2,'ИМ':1,'ИИ':2,'ИП':2,'МИ':1,'ММ':1,'МА':2,'МН':2,
  'NN':1,'MM':1,'HM':2,'NM':2,'HE':1,'MA':1,'NA':2,'NE':2};
const ST_ROOF={'ЕТ':1,'ET':1};
const ST_SHELF={'ТО':1,'ТА':1,'ТИ':1,'ТН':2,'ТЬ':1,'ТЯ':2,'ТЕ':1,'ТС':2,'РО':1,'РА':1,'РЕ':2,'ГО':1,'ГА':1,'ГИ':2,'ГН':2,'ГЯ':2,'ГЕ':2,
  'PO':1,'PA':1,'PE':2,'TA':1,'TO':1,'TE':1,'TH':2,'TC':2};
const ST_NEST={'КА':1,'ХА':1,'KA':1,'XA':1};
const ST_FOOT={'LA':1,'LE':1,'LO':1};
const ST_TRIPLES={};
const ST_MODE_OF={},ST_TIER={};
for(const [tb,m] of [[ST_SHARE,'share'],[ST_ROOF,'roof'],[ST_SHELF,'shelf'],[ST_NEST,'nest'],[ST_FOOT,'foot']])for(const k in tb){ST_MODE_OF[k]=m;ST_TIER[k]=tb[k];}
for(const k in ST_TRIPLES)ST_TIER[k]=ST_TRIPLES[k];
const ST_LC_DROP=new Set(['нп','нн','пн','на','по','па']);   /* строчные: читаются как ю */
const stPairsAll=()=>Object.keys(ST_MODE_OF).concat(Object.keys(ST_TRIPLES)).map(k=>[k,ST_TIER[k]]);
const stNoLcDy=sp=>![...sp].some(ch=>ST_LC_DY[ch]!=null);
/* кусок: {polys,w} в абсолютных x */
const stPShift=(P,dx,dy)=>({polys:stShift(P.polys,dx,dy||0),w:P.w});
const stPBox=P=>stBBox(P.polys);
function stBP(ch,c,H,xt,xf){const b=({'Й':'И','Ё':'Е','й':'И','ё':'Е'})[ch]||stBaseOf(ch);return stBuild(b,c,H,xt,xf);}
function stTuck(A,B,g,ymax){const ar=stProfile(A.polys,'r',ST_YG0,ST_YG1,4),bl=stProfile(B.polys,'l',ST_YG0,ST_YG1,4);let best=null;
  for(let i=0;i<ar.length;i++){const y=ST_YG0+4*i;const a=ar[i],b=bl[i];if(a==null||b==null)continue;if(ymax!=null&&y>ymax)continue;const v=a-b+g;if(best===null||v>best)best=v;}
  return best;}
function stPlacePair(a,b,Hc,c,lc){const g=c.gap,S=c.S,T=c.T,key=(a+b).toUpperCase();let mode=ST_MODE_OF[key];
  if(!mode&&key==='ИН')mode='share';if(!mode)return null;
  const A0=stBP(a.toUpperCase(),c,Hc);
  if(mode==='share'){const B=stPShift(stBP(b.toUpperCase(),c,Hc),A0.w-S);return [A0,B,mode];}
  if(mode==='roof'){const B0=stBP(b.toUpperCase(),c,Hc);const dx=stTuck(A0,B0,g,Hc-T-4);const dxm=stPBox(A0)[2]-2-stPBox(B0)[0];
    if(dx>dxm+0.5)return null;return [A0,stPShift(B0,dxm),mode];}
  if(mode==='shelf'){if(lc)return null;const hB=Hc-T-g;if(hB<ST_FLOOR_CAPS*Hc)return null;
    const B0=stBP(b.toUpperCase(),c,hB);const dx=stTuck(A0,B0,g);const B=stPShift(B0,dx);const need=stPBox(B)[2]-A0.w;
    return [stBP(a.toUpperCase(),c,Hc,Math.max(0,need),0),B,mode];}
  if(mode==='nest'){const f=lc?ST_NEST_LC:ST_NEST_CAPS,hB=f*Hc;let best=null;
    for(const al of [0,1]){const B0=stBP(b.toUpperCase(),c,hB);const oy=al===0?0:Hc-hB;const B1=stPShift(B0,0,oy);
      const dx=stTuck(A0,B1,g);const wid=Math.max(stPBox(B1)[2]+dx,stPBox(A0)[2]);if(best===null||wid<best[0]-1)best=[wid,dx,B1];}
    return [A0,stPShift(best[2],best[1]),mode];}
  if(mode==='foot'){if(lc)return null;const oy=T+g,hB=Hc-oy;if(hB<ST_FLOOR_CAPS*Hc)return null;
    const B0=stPShift(stBP(b.toUpperCase(),c,hB),0,oy);const dx=stTuck(A0,B0,g);const B=stPShift(B0,dx);
    const bb=stPBox(B),wB=bb[2]-bb[0],xf=Math.max(0,bb[0]+ST_FOOT_MAX*wB-A0.w);
    return [stBP(a.toUpperCase(),c,Hc,0,xf),B,mode];}
  return null;}
/* topo: число дыр у куска */
const stHolesOf=P=>stTopo(P.polys).holes;
/* сборка лигатуры: spec из 2–3 букв (в нужном регистре); -> {cs,w,groups,info} или null */
function stCompose(spec,Hc,c,lc){if(lc==null)lc=spec[0]!==spec[0].toUpperCase();
  const chars=[...spec];const first=stPlacePair(chars[0],chars[1],Hc,c,lc);if(!first)return null;
  const parts=[first[0],first[1]],modes=[first[2]];
  if(chars.length===3){const m=first[2];if(m!=='share'&&m!=='roof')return null;
    const key=(chars[1]+chars[2]).toUpperCase();const m2=ST_MODE_OF[key]||(key==='ИН'?'share':null);if(m2!=='share'&&m2!=='roof')return null;
    const pp=stPlacePair(chars[1],chars[2],Hc,c,lc);if(!pp)return null;
    const offs=stPBox(first[1])[0]-stPBox(stBP(chars[1].toUpperCase(),c,Hc))[0];
    parts.push(stPShift(pp[1],offs));modes.push(m2);}
  let polys=[];const groups=[];
  chars.forEach((ch,i)=>{let P=parts[i].polys;if('ЙЁйё'.includes(ch))P=P.concat(stAccents(ch,c,Hc,parts[i].w));groups.push(stCopy(P));polys=polys.concat(P);});
  let cs=stFinish(polys,c.r,c.ri);
  let x0=1e9,x1=-1e9;for(const k of cs)for(const v of k.poly){if(v[0]<x0)x0=v[0];if(v[0]>x1)x1=v[0];}
  const sh=k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x-x0,y:n.y,a:{x:n.a.x-x0,y:n.a.y},b:{x:n.b.x-x0,y:n.b.y}})),poly:k.poly.map(v=>[v[0]-x0,v[1]])});
  cs=cs.map(sh);const gr=groups.map(g=>stShift(g,-x0,0));
  const plainW=chars.reduce((s,ch)=>s+stBP(ch.toUpperCase(),c,Hc).w,0);
  return {cs,w:x1-x0,groups:gr,info:{mode:modes[0],modes,spec,holes:parts.reduce((s,P)=>s+stHolesOf(P),0),saving:plainW-(x1-x0)}};}
/* набор: все допустимые лигатуры одного регистра. density — предел яруса для keep (по умолчанию 3 = все) */
function stLigSet(c,lower,density){density=density==null?3:density;const res=[];
  for(const [spec,tier] of stPairsAll()){const sp=lower?spec.toLowerCase():spec;
    if(lower&&(!stNoLcDy(sp)||ST_LC_DROP.has(sp)))continue;
    let H,cc;if(lower){H=ST_CAPH*c.lcr;cc=stLcCtx(c);}else{H=ST_CAPH;cc=c;}
    const P=stCompose(sp,H,cc,lower);if(!P)continue;
    let ok=tier<=density;const t=stTopo(P.cs.map(k=>({p:k.poly,h:k.hole})));if(t.holes!==P.info.holes)ok=false;
    res.push({spec:sp,tier,lower,cs:P.cs,w:P.w,groups:P.groups,info:P.info,keep:ok});}
  return res;}
/* ---------- «Сцепка»: параметры, кэш, метрики, кернинг, набор лигатур ---------- */
const ST_DEF={S:138,wd:1,rnd:0.45,gap:44,lcr:0.72,jump:1};
const ST_LIM={S:[112,164,1],wd:[0.85,1.25,0.01],rnd:[0.05,0.70,0.01],gap:[14,60,1],lcr:[0.60,0.84,0.01],jump:[0,1.5,0.05]};
function stSafe(p){const q=Object.assign({},ST_DEF,p||{});for(const k in ST_LIM){const [a,b]=ST_LIM[k];let v=+q[k];if(!isFinite(v))v=ST_DEF[k];q[k]=stCL(v,a,b);}q.S=Math.round(q.S);q.gap=Math.round(q.gap);return q;}
const ST_KEY=q=>[q.S,q.wd,q.rnd,q.gap,q.lcr,q.jump].join('|');
const ST_WEIGHTS={Light:118,Regular:138,Bold:152,Black:164};
const stShiftCS=(cs,dx,dy)=>cs.map(k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:{x:n.a.x+dx,y:n.a.y+dy},b:{x:n.b.x+dx,y:n.b.y+dy}})),poly:k.poly.map(v=>[v[0]+dx,v[1]+dy])}));
/* метрики: поле слева/справа из оптического баланса, зашито в контур (x ink = sbl) */
function stFinishGlyph(cs,wRaw,cfg){
  if(!cs.length)return {cs:[],adv:wRaw,gs:{empty:true,sbl:0,sbr:0},dx:0,x0:0,x1:0};
  const polys=stPolysOf(cs),gs=stGS(polys,cfg),b=stBBox(polys);const dx=gs.sbl-b[0];
  return {cs:stShiftCS(cs,dx,0),adv:(b[2]-b[0])+gs.sbl+gs.sbr,gs,dx,x0:b[0],x1:b[2]};}
const stData_cache=new Map();
function stData(pIn){const q=stSafe(pIn),key=ST_KEY(q);let D=stData_cache.get(key);if(D)return D;
  const c=stCtx(q),cfg=stSpCfg(q.gap);
  D={q,c,cfg,key,gl:new Map(),lig:new Map(),sets:{},kc:new Map(),T0:null};
  D.glyph=ch=>{let g=D.gl.get(ch);if(g!==undefined)return g;
    const P=stGlyphPiece(ch,c);if(!P){D.gl.set(ch,null);return null;}
    let cs=P.cs;if(P.dy)cs=stShiftCS(cs,0,P.dy);
    g=stFinishGlyph(cs,P.w,cfg);g.dy=P.dy;g.raw=P.raw;g.ch=ch;D.gl.set(ch,g);return g;};
  /* лигатуры: каждая отдельно (профили дорогие), набор регистра — из отдельных */
  D.ligGet=spec=>{let r=D.lig.get(spec);if(r!==undefined)return r;
    const lower=spec[0]!==spec[0].toUpperCase(),sp0=spec.toUpperCase(),tier=ST_TIER[sp0];r=null;
    if(tier!=null&&(!lower||(stNoLcDy(spec)&&!ST_LC_DROP.has(spec)))){
      const H=lower?ST_CAPH*c.lcr:ST_CAPH,cc=lower?stLcCtx(c):c,P=stCompose(spec,H,cc,lower);
      if(P){const t=stTopo(P.cs.map(k=>({p:k.poly,h:k.hole})));const f=stFinishGlyph(P.cs,P.w,cfg);
        r={spec,tier,lower,cs:f.cs,w:P.w,groups:P.groups,info:P.info,adv:f.adv,gs:f.gs,dx:f.dx,keep:t.holes===P.info.holes};}}
    D.lig.set(spec,r);return r;};
  D.ligSet=lower=>{const k=lower?'l':'u';if(D.sets[k])return D.sets[k];const arr=[];
    for(const [spec] of stPairsAll()){const r=D.ligGet(lower?spec.toLowerCase():spec);if(r)arr.push(r);}
    return D.sets[k]=arr;};
  D.ligAll=()=>D.ligSet(false).concat(D.ligSet(true));
  D.kernTarget=()=>{if(D.T0==null){const h=D.glyph('Н');D.T0=stPair(h.gs,h.gs).area;}return D.T0;};
  /* кернинг пары знаков (только буквы и цифры) */
  D.kern=(a,b)=>{const id=a+'\u0001'+b;let k=D.kc.get(id);if(k!==undefined)return k;
    const ga=D.glyph(a),gb=D.glyph(b);k=0;
    if(ga&&gb&&!ga.gs.empty&&!gb.gs.empty&&stIsAlnum(a)&&stIsAlnum(b)){k=stKernFor(ga.gs,gb.gs,D.kernTarget(),cfg);if(Math.abs(k)<4)k=0;}
    D.kc.set(id,k);return k;};
  if(stData_cache.size>12)stData_cache.clear();
  stData_cache.set(key,D);return D;}
const stIsAlnum=ch=>/[\p{L}\p{N}]/u.test(ch);
const ST_KERN_CHARS=()=>[...ST_LAT_U+ST_LAT_L+ST_CYR_U+ST_CYR_L+'Ёё'+ST_DIG];
/* ---------- регистрация в продукте: шрифт «Сцепка» (Stsepka Display), по образцу applik/tail.js ----------
   Ключи ползунков имеют префикс z…: zrnd (скругление, %), zgap (зазор сцепки), zjump (скачут строчные, %), zlig (режим сцепок 0 обычные / 1 все / 2 выкл).
   Насыщенность = host stem (S), ширина = host wdth, высота строчных = host xh (lcr = xh/700). Поля зашиты в контур (opt.fixed, sb = 0). */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const ST_KEYS=['zrnd','zgap','zjump','zlig'];
const ST_ROWS=[['zrnd','Скругление, %',5,70,1,'Форма'],['zgap','Зазор сцепки',14,60,1,'Сцепка'],['zjump','Скачут строчные, %',0,150,5,'Сцепка'],['zlig','Сцепки',0,2,1,'Сцепка']];
if(!PARAMS.some(r=>r[0]==='zrnd')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...ST_ROWS);}
const stNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
/* параметры продукта -> движок */
const stEng=p=>({S:stNum(p.stem,138),wd:stNum(p.wdth,100)/100,rnd:stNum(p.zrnd,45)/100,gap:stNum(p.zgap,44),lcr:Math.round(stNum(p.xh,504)/700*1e4)/1e4,jump:stNum(p.zjump,100)/100});
const stD=p=>stData(stEng(p));
const ST_ALL=[...ST_LAT_U,...ST_LAT_L,...ST_CYR_U,...ST_CYR_L,...'Ёё',...ST_DIG];
const ST_SYM='.,:;!?«»„“”‘’"\'-–—−()/&№…@#%*·•°+=\\|₽©';
const ST_LAT=ST_LAT_U,ST_LATL=ST_LAT_L,ST_CY=ST_CYR_U.slice(0,5)+'Ё'+ST_CYR_U.slice(5),ST_CYL=ST_CYR_L.slice(0,5)+'ё'+ST_CYR_L.slice(5);
const stCont=cs=>cs.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));
const stGname=ch=>{if(/[A-Za-z]/.test(ch))return ch;return 'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');};
const stLigName=spec=>[...spec].map(stGname).join('_')+'.liga';
/* общие формы латиницы и кириллицы (проверено: контуры совпадают): один и тот же знак GL, правки общие */
const ST_SHARED={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х',a:'а',c:'с',e:'е',o:'о',p:'р',x:'х'};
const F={id:'stsepka',name:'Сцепка',family:'Stsepka Display',tag:'Конструктор · сцепки · юникейс',S0:138,GL:{},charset:'basic',
  desc:'Акцидентный узкий скруглённый шрифт с конструкторными лигатурами: соседние буквы сцепляются общей стойкой, крышей или ступенькой в один знак (OpenType calt — обычные, ss02 — все, ss01 — без сцепок). Тяжёлый рисунок из прямых кусков с одним радиусом скругления на все углы, строчные прыгают по строке, как в вывеске-конструкторе. Для вывесок, афиш, логотипов и заголовков.',
  sample:'Сцепка · Stsepka',sampleText:'КОНСТРУКТОР',ss01Name:'Без сцепок',ss02Name:'Все сцепки'};
const stIsLow=ch=>/\p{Ll}/u.test(ch);
function stEntry(ch){
  return {shape:g=>{const x=stD(g.p).glyph(ch);return x?stCont(x.cs):[];},w:p=>{const x=stD(p).glyph(ch);return x?x.adv:0;},k:stIsLow(ch)?'xh':'cap',opt:{fixed:true}};}
const ST_CHARS=[...ST_LAT_U,...ST_LAT_L,...ST_CYR_U,...ST_CYR_L,...'Ёё',...ST_DIG,...ST_SYM];
for(const ch of ST_CHARS){if(F.GL[ch])continue;
  const cyr=ST_SHARED[ch];
  if(cyr){F.GL[cyr]=F.GL[cyr]||stEntry(cyr);F.GL[ch]=F.GL[cyr];}else F.GL[ch]=stEntry(ch);}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
for(const c of [' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
/* ---- альтернаты: «Без сцепок» (ss01: буквы без сцепок не подставляются в лигатуры) и сами лигатуры (calt / ss02) ---- */
const stUsed=new Set();
for(const [spec] of stPairsAll()){for(const ch of spec)stUsed.add(ch);
  const sp=spec.toLowerCase(),m=ST_MODE_OF[spec];
  if(m!=='shelf'&&m!=='foot'&&stNoLcDy(sp)&&!ST_LC_DROP.has(sp))for(const ch of sp)stUsed.add(ch);}
for(const ch of stUsed){const b=F.GL[ch];if(!b)continue;
  F.GL[stGname(ch)+'.ss01']={shape:b.shape,w:b.w,k:b.k,opt:{fixed:true,alt:true,base:ch,feat:'ss01',own:true,kernAs:true}};}
function stLigEntry(spec,tier,lower){
  return {shape:g=>{const r=stD(g.p).ligGet(spec);return r&&r.keep?stCont(r.cs):[];},w:p=>{const r=stD(p).ligGet(spec);return r&&r.keep?r.adv:0;},k:lower?'xh':'cap',
    opt:{fixed:true,alt:true,base:spec[0],feat:(tier===1&&!lower)?'lig1':'lig2',own:true,lig:[...spec],tier,lower,ligName:true}};}
for(const [spec,tier] of stPairsAll()){
  F.GL[stLigName(spec)]=stLigEntry(spec,tier,false);
  const sp=spec.toLowerCase(),m=ST_MODE_OF[spec];
  if(m!=='shelf'&&m!=='foot'&&stNoLcDy(sp)&&!ST_LC_DROP.has(sp))F.GL[stLigName(sp)]=stLigEntry(sp,tier,true);}
F.GROUPS=[['Латиница · прописные',ST_LAT],['Латиница · строчные',ST_LATL],['Кириллица · прописные',ST_CY],['Кириллица · строчные',ST_CYL],['Цифры',ST_DIG],['Знаки',ST_SYM]];
F.CHARSET=ST_CHARS.concat([' ',' ',' ',' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const x=stD(p).glyph(ch);return x||null;};
const K0={wdth:100,capH:700,xh:504,asc:860,desc:210,stem:138,hair:138,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:300,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,zrnd:45,zgap:44,zjump:100,zlig:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['capH','hair','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','sb','zlig'];
F.params={stem:['Насыщенность',112,164,1],wdth:['Ширина, %',85,125,1],xh:['Высота строчных',420,588,1]};
for(const k of HID)F.params[k]=null;
/* пресеты: характер, вес, скругление, зазор сцепки, режим сцепок */
const STP={
  poster:{stem:138,wdth:100,xh:504,zrnd:45,zgap:44,zjump:100},
  dense:{stem:156,wdth:92,xh:540,zrnd:35,zgap:28,zjump:30},
  soft:{stem:130,wdth:108,xh:490,zrnd:68,zgap:50,zjump:120},
  strict:{stem:140,wdth:96,xh:520,zrnd:8,zgap:40,zjump:20}};
F.methods=[
  ['Характер','Готовые системы: плакатная по умолчанию, плотная, мягкая и строгая.',[
    ['Плакат',STP.poster],['Плотный',STP.dense],['Мягкий',STP.soft],['Строгий',STP.strict]]],
  ['Сцепки','Какие пары букв сцепляются в один знак: обычные (calt), все (ss02: плотный набор и строчные), выключены (ss01).',[
    ['Обычные',{zlig:0}],['Все',{zlig:1}],['Выкл',{zlig:2}]]],
  ['Вес','Толщина штриха: от светлого до чёрного.',[['Светлый',{stem:118}],['Обычный',{stem:138}],['Жирный',{stem:152}],['Чёрный',{stem:164}]]],
  ['Скругление','Радиус скругления всех углов (выпуклые углы — R, вогнутые — R/2).',[['Острое',{zrnd:8}],['Обычное',{zrnd:45}],['Мягкое',{zrnd:60}],['Круглое',{zrnd:70}]]],
  ['Зазор сцепки','Ширина щели в сцепке и белого между буквами.',[['Тонкий',{zgap:24}],['Обычный',{zgap:44}],['Широкий',{zgap:58}]]],
  ['Строчные','Высота строчных и их прыжок по строке.',[['Низкие',{xh:440,zjump:60}],['Обычные',{xh:504,zjump:100}],['Высокие',{xh:570,zjump:100}],['Скачут',{xh:504,zjump:150}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=60;
const ST_ALLCH=ST_ALL.join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:ST_ALLCH,desc:ST_ALLCH,descX:0,holeK:0.004};
/* пределы: ползунки независимы (проверено стресс-прогоном); всё остальное зафиксировано */
function stLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',112,164,138);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  cl('wdth',85,125,100);cl('xh',420,588,504);q.xh=Math.round(q.xh);
  cl('zrnd',5,70,45);cl('zgap',14,60,44);q.zgap=Math.round(q.zgap);cl('zjump',0,150,100);cl('zlig',0,2,0);q.zlig=Math.round(q.zlig);
  cl('capH',700,700,700);cl('asc',860,860,860);cl('desc',210,210,210);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',-60,100,0);cl('space',200,420,300);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='stsepka')return _pl(p,font);return stLim(p);};
WSCALE.stsepka=0.869;
/* семейство: Light ≈ S118, Regular = текущий, Bold ≈ 152, Black = 164 (границы безопасного S; ладдер масштабируется от положения ползунка) */
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='stsepka'){const t={Light:118,Regular:138,Bold:152,Black:164}[wn];if(t){const k=Math.max(0.8,Math.min(1.2,p.stem/138));o.stem=Math.round(Math.min(164,Math.max(112,t*k)));o.hair=o.stem;}return paramLimits(o,'stsepka').q;}
  return o;};
KERN_TABLE.stsepka=[];
/* ---- кернинг: собственный (баланс белой площади, как в движке), классы по одному знаку, значения считаются лениво ---- */
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='stsepka')return _ckt(st,prof,isLow,fontId);
  const D=stD(st.p),mem=ST_ALL.filter(ch=>prof(ch));
  const out={L:mem.map(ch=>[ch,[ch]]),R:mem.map(ch=>[ch,[ch]]),vals:null,tU:D.cfg.g,tL:D.cfg.g,pairs:{}};
  const kc=st.kc||{};
  out.vals=new Proxy({},{get:(t,key)=>{if(typeof key!=='string')return undefined;if(kc[key]!=null)return Math.max(-KERN_MAX,Math.min(KERN_MAX,Math.round(+kc[key])||0));
      const i=key.indexOf('|');return i<0?undefined:D.kern(key.slice(0,i),key.slice(i+1));},
    has:()=>true,ownKeys:()=>['*'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true,value:0})});
  return out;};
/* ---- GSUB: ss02 (все сцепки) и calt (обычные) — лигатуры type 4; ss01 (без сцепок) делает хост перед ними ---- */
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='stsepka')return;
  const d1=[],d2=[];
  for(const g of glyphs){if(!g.alt||!g.alt.own)continue;const e=GL[g.name];if(!e||!e.opt.lig)continue;
    const comps=e.opt.lig.map(c=>gidByCh[c]);if(comps.some(x=>x==null))continue;
    (e.opt.tier===1&&!e.opt.lower?d1:d2).push({comps,lig:gidByName[g.name]});}
  if(d2.length){looks.push({type:4,subs:[otoLigSubst(d2)]});feats.push({tag:'ss02',lookups:[looks.length-1],nameID:257});}
  if(d1.length){looks.push({type:4,subs:[otoLigSubst(d1)]});feats.push({tag:'calt',lookups:[looks.length-1]});}};
/* сцепка, которую при текущих параметрах собрать нельзя, в файл не попадает (правило не пишется) */
let stCurP=null;
const _bt=buildTTF;
buildTTF=function(styleKey,state,opts){const o=state&&state.styles&&state.styles[styleKey];const prev=stCurP;stCurP=o?o.p:null;try{return _bt.apply(this,arguments);}finally{stCurP=prev;}};
const _aok=otAltOk;
otAltOk=function(a,have,tabOn,italic){const r=_aok(a,have,tabOn,italic);if(!r||CUR_FONT!=='stsepka')return r;
  const e=GL[a.name];if(e&&e.opt&&e.opt.ligName&&stCurP){const x=stD(stCurP).ligGet(e.opt.lig.join(''));if(!x||!x.keep)return false;}return r;};
/* каталог сцепок для превью и тестов */
const STS={D:stD,eng:stEng,LIM:ST_LIM,ligName:stLigName,gname:stGname,
  /* правила превью: массив {chars,name} для режима ('calt' | 'ss02'), только собираемые при параметрах p */
  rules(p,which){const D=stD(p),out=[];
    for(const [spec] of stPairsAll())for(const sp of [spec,spec.toLowerCase()]){const r=D.ligGet(sp);if(!r||!r.keep)continue;
      const dense=r.lower||r.tier>1;if((which==='ss02')!==dense)continue;out.push({chars:[...sp],name:stLigName(sp)});}
    return out.sort((a,b)=>b.chars.length-a.chars.length);},
  /* текст -> массив токенов: строка-знак или {name} */
  apply(text,p,mode){const A=[...text].map(c=>({c}));if(mode===2)return A;
    for(const which of (mode===1?['ss02','calt']:['calt'])){const R=STS.rules(p,which);if(!R.length)continue;const by=new Map();R.forEach(r=>{(by.get(r.chars[0])||by.set(r.chars[0],[]).get(r.chars[0])).push(r);});
      for(let i=0;i<A.length;i++){if(A[i].n)continue;const L=by.get(A[i].c);if(!L)continue;
        for(const r of L){let ok=true;for(let k=0;k<r.chars.length;k++){const t=A[i+k];if(!t||t.n||t.c!==r.chars[k]){ok=false;break;}}
          if(ok){A.splice(i,r.chars.length,{n:r.name});break;}}}}
    return A;}};
FONTS.stsepka=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!ST_KEYS.includes(r[0])&&!['track','space','slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='stsepka'){const f=FONTS[id];f.params=f.params||{};for(const k of ST_KEYS)if(!(k in f.params))f.params[k]=null;}
if(typeof globalThis!=='undefined')globalThis.STS=STS;
}
})();
