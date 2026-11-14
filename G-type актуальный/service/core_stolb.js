/* ===== «Столб» (Stolb Display): высокий сжатый гротеск. Части: stolb/engine.js letters.js glyphs.js spacing.js tail.js (сборка mk_stolb.sh) ===== */
(function(){
/* ---------- «Столб» (stolb): движок (из «Сцепки»; добавлено: круглые углы по реестру RC, малый радиус прямых углов Rs). Острые куски (прямоугольники и ленты) -> объединение -> ОДНА система скруглений ----------
   Все куски строятся острыми; дыры вычитаются из объединения всех кусков; контур снимается с растра (шаг 0.5 ед.), упрощается
   (Дуглас–Пекер 2.2 пикс.), прижимается к вертикалям/горизонталям, затем каждый выпуклый угол получает радиус R (= rnd·S),
   каждый вогнутый — 0.5·R, как у буквы «О». Углы мягче 14° остаются прямыми. Дуги — кубические Безье. */
const cnCL=(v,a,b)=>Math.max(a,Math.min(b,v));
const CN_SC=2,CN_EPS=2.2,CN_SNAP=0.6,CN_AMIN=14;
/* ---- куски ---- */
const cnRR=(x0,y0,x1,y1)=>({p:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],h:false});
const cnRH=(x0,y0,x1,y1)=>({p:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],h:true});
const cnPara=(p0,p1,wh)=>{const h=wh/2;return {p:[[p0[0]-h,p0[1]],[p0[0]+h,p0[1]],[p1[0]+h,p1[1]],[p1[0]-h,p1[1]]],h:false};};
const cnSolid=vs=>({p:vs.map(v=>[v[0],v[1]]),h:false});
const cnHole=vs=>({p:vs.map(v=>[v[0],v[1]]),h:true});
const cnShift=(polys,dx,dy)=>polys.map(q=>({p:q.p.map(v=>[v[0]+dx,v[1]+(dy||0)]),h:q.h}));
const cnMirror=(polys,w)=>polys.map(q=>({p:q.p.map(v=>[w-v[0],v[1]]).reverse(),h:q.h}));
const cnCopy=polys=>polys.map(q=>({p:q.p.map(v=>[v[0],v[1]]),h:q.h}));
function cnBBox(polys){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of polys)for(const v of q.p){if(v[0]<x0)x0=v[0];if(v[0]>x1)x1=v[0];if(v[1]<y0)y0=v[1];if(v[1]>y1)y1=v[1];}
  return x0>x1?[0,0,0,0]:[x0,y0,x1,y1];}
/* ---- растр: центр пикселя (i+.5, j+.5), вершины на целой решётке; чёт-нечет ---- */
function cnFill(m,W,H,pts,val){let ymin=1e9,ymax=-1e9;for(const v of pts){if(v[1]<ymin)ymin=v[1];if(v[1]>ymax)ymax=v[1];}
  const n=pts.length,xs=[];
  for(let j=Math.max(0,Math.floor(ymin)-1);j<=Math.min(H-1,Math.ceil(ymax));j++){const yc=j+0.5;xs.length=0;
    for(let i=0;i<n;i++){const a=pts[i],b=pts[i+1===n?0:i+1];if((a[1]<=yc)!==(b[1]<=yc))xs.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){const i0=Math.max(0,Math.ceil(xs[k]-0.5)),i1=Math.min(W-1,Math.ceil(xs[k+1]-0.5)-1);
      for(let i=i0;i<=i1;i++)m[j*W+i]=val;}}}
/* маска набора кусков: сначала все твёрдые, потом дыры вычитаются из всего. sc — пикселей на единицу */
function cnMask(polys,sc,pad){const b=cnBBox(polys);const ox=Math.floor(b[0])-pad,oy=Math.floor(b[1])-pad;
  const W=Math.ceil((b[2]-ox+pad)*sc)+2,H=Math.ceil((b[3]-oy+pad)*sc)+2;const m=new Uint8Array(W*H);
  const tr=pts=>pts.map(v=>[Math.round((v[0]-ox)*sc),Math.round((v[1]-oy)*sc)]);
  for(const q of polys)if(!q.h)cnFill(m,W,H,tr(q.p),1);
  for(const q of polys)if(q.h)cnFill(m,W,H,tr(q.p),0);
  return {m,W,H,ox,oy,sc};}
/* ---- обход границы по рёбрам пикселей (ink слева): внешние против часовой, дыры по часовой ---- */
function cnTrace(M){const {m,W,H}=M,W1=W+1;
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
const cnArea2=p=>{let a=0;for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length];a+=u[0]*v[1]-v[0]*u[1];}return a;};
/* замкнутый Дуглас–Пекер (как cv2.approxPolyDP) */
function cnDP(pts,eps){const n=pts.length;if(n<4)return pts.slice();
  let far=0,fd=-1;for(let i=1;i<n;i++){const d=(pts[i][0]-pts[0][0])**2+(pts[i][1]-pts[0][1])**2;if(d>fd){fd=d;far=i;}}
  const keep=new Uint8Array(n);keep[0]=1;keep[far]=1;
  const rec=(a,b)=>{ /* a<b индексы в развёрнутой цепочке (по модулю n) */
    if(b-a<2)return;const P=pts[a%n],Q=pts[b%n];const dx=Q[0]-P[0],dy=Q[1]-P[1],L=Math.hypot(dx,dy);let md=-1,mi=-1;
    for(let i=a+1;i<b;i++){const R=pts[i%n];const d=L<1e-9?Math.hypot(R[0]-P[0],R[1]-P[1]):Math.abs((R[0]-P[0])*dy-(R[1]-P[1])*dx)/L;if(d>md){md=d;mi=i;}}
    if(md>eps){keep[mi%n]=1;rec(a,mi);rec(mi,b);}};
  rec(0,far);rec(far,n);
  const out=[];for(let i=0;i<n;i++)if(keep[i])out.push(pts[i]);return out;}
function cnSnap(pts,tol){const n=pts.length,P=pts.map(p=>[p[0],p[1]]);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
    if(Math.abs(a[0]-b[0])<=tol){const m=(a[0]+b[0])/2;a[0]=b[0]=m;}
    if(Math.abs(a[1]-b[1])<=tol){const m=(a[1]+b[1])/2;a[1]=b[1]=m;}}
  return P;}
/* скругление многоугольника: вершины [x,y,r] -> {nodes (кубики), poly (ломаная для измерений)} */
function cnFillet(vs){const m=vs.length,nodes=[],poly=[];
  const corner=(x,y)=>{nodes.push({x,y,a:{x,y},b:{x,y}});poly.push([x,y]);};
  for(let i=0;i<m;i++){const [x,y,r]=vs[i];const pv=vs[(i+m-1)%m],nx=vs[(i+1)%m];
    if(r<=0.01){corner(x,y);continue;}
    const d1x=pv[0]-x,d1y=pv[1]-y,d2x=nx[0]-x,d2y=nx[1]-y,l1=Math.hypot(d1x,d1y),l2=Math.hypot(d2x,d2y);
    if(l1<1e-6||l2<1e-6){corner(x,y);continue;}
    const u1=[d1x/l1,d1y/l1],u2=[d2x/l2,d2y/l2];const ang=Math.acos(cnCL(u1[0]*u2[0]+u1[1]*u2[1],-1,1));
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
function cnFinish(polys,R,ri,RC,Rs){RC=RC||[];Rs=Rs||0;const isRC=(x,y)=>{for(const q of RC)if(Math.abs(q[0]-x)<1.6&&Math.abs(q[1]-y)<1.6)return true;return false;};
  if(!polys.length)return [];
  const M=cnMask(polys,CN_SC,6),loops=cnTrace(M),out=[];
  for(const lp of loops){
    let ap=cnDP(lp,CN_EPS);if(ap.length<3)continue;
    const isHole=cnArea2(ap)<0;
    let pts=ap.map(p=>[M.ox+p[0]/CN_SC,M.oy+p[1]/CN_SC]);
    pts=cnSnap(pts,CN_SNAP);
    /* убрать совпавшие подряд вершины */
    const q=[];for(const p of pts){if(!q.length||Math.abs(q[q.length-1][0]-p[0])>1e-9||Math.abs(q[q.length-1][1]-p[1])>1e-9)q.push(p);}
    while(q.length>1&&Math.abs(q[0][0]-q[q.length-1][0])<1e-9&&Math.abs(q[0][1]-q[q.length-1][1])<1e-9)q.pop();
    if(q.length<3)continue;
    const n=q.length,vs=[];
    for(let i=0;i<n;i++){const p0=q[(i+n-1)%n],p1=q[i],p2=q[(i+1)%n];
      const cr=(p1[0]-p0[0])*(p2[1]-p1[1])-(p1[1]-p0[1])*(p2[0]-p1[0]);
      const d1=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]),d2=Math.atan2(p2[1]-p1[1],p2[0]-p1[0]);
      let turn=((d2-d1)*180/Math.PI+180)%360;if(turn<0)turn+=360;turn=Math.abs(turn-180);
      const rc=isRC(p1[0],p1[1]);vs.push([p1[0],p1[1],turn<CN_AMIN?0:(cr>0?(rc?R:Rs):(rc?ri:Rs*0.5))]);}
    const f=cnFillet(vs);
    out.push({hole:isHole,nodes:f.nodes,poly:f.poly});}
  return out;}
/* ---- измерения по многоугольнику ---- */
/* интервалы чернил в строке y: объединение твёрдых минус дыры */
function cnRowInt(polys,y){const sol=[],hol=[];
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
function cnProfile(polys,side,y0,y1,step){const res=[];
  for(let y=y0;y<=y1;y+=step){const iv=cnRowInt(polys,y+step/2);
    res.push(!iv.length?null:side==='r'?iv[iv.length-1][1]:iv[0][0]);}
  return res;}
/* топология: части (4-связные), дыры; растр sc=0.25 */
function cnTopo(polys,sc){sc=sc||0.25;if(!polys.length)return {parts:0,holes:0,areas:[],holeareas:[]};
  const M=cnMask(polys,sc,8),{m,W,H}=M;const lab=new Int32Array(W*H);const stack=[];
  const flood=(val,start,id)=>{let area=0,border=false;stack.push(start);lab[start]=id;
    while(stack.length){const s=stack.pop();area++;const x=s%W,y=(s-x)/W;if(x===0||y===0||x===W-1||y===H-1)border=true;
      if(x>0&&!lab[s-1]&&m[s-1]===val){lab[s-1]=id;stack.push(s-1);}if(x<W-1&&!lab[s+1]&&m[s+1]===val){lab[s+1]=id;stack.push(s+1);}
      if(y>0&&!lab[s-W]&&m[s-W]===val){lab[s-W]=id;stack.push(s-W);}if(y<H-1&&!lab[s+W]&&m[s+W]===val){lab[s+W]=id;stack.push(s+W);}}
    return {area:area/(sc*sc),border};};
  const areas=[],holeareas=[];let id=0;
  for(let s=0;s<W*H;s++){if(lab[s])continue;id++;const r=flood(m[s],s,id);if(m[s]===1)areas.push(Math.round(r.area));else if(!r.border)holeareas.push(Math.round(r.area));}
  areas.sort((a,b)=>a-b);holeareas.sort((a,b)=>a-b);
  return {parts:areas.length,holes:holeareas.length,areas,holeareas};}
/* ---------- «Столб» (stolb): рецепты букв. Высокий сжатый гротеск: прямые стойки, овалы — прямоугольники с малым радиусом.
   Круглые углы регистрируются в рецепте (rc), прямые углы получают лишь малый радиус Rs. Прописные H = 700; строчные — те же рецепты на высоте x. ---------- */
function cnCtx(o){o=o||{};const S=o.S==null?88:o.S,rnd=o.rnd==null?0.72:o.rnd,ctr=o.ctr==null?0.35:o.ctr,ap=o.ap==null?1:o.ap,ct=o.ct==null?0:o.ct;
  const R=rnd*1.1*S,T=Math.min(S*(1-0.30*ctr),0.150*700),wd0=o.wd==null?1:o.wd,cw=Math.max(22,0.26*S);
  return {cw,cx:cw*Math.max(0.9,Math.min(1.4,wd0)),S,T,Tr:Math.min(S,Math.min(T+0.05*S,0.158*700)),D:1.03*S,R,ri:0.38*R,Rs:rnd>0.005?Math.max(1.2,0.13*R):0,ap,ct,wd:o.wd==null?1:o.wd,gap:o.gap==null?30:o.gap,lcr:o.lcr==null?0.75:o.lcr,
    kw:Math.max(0.78,1+0.42*(S/88-1)),cmin:Math.max(22,0.26*S),lc:false,rnd,ctr,jump:0};}
function cnSub(c,k){const d=Object.assign({},c);d.lc=true;d.S=c.S*k;d.T=c.T*k;d.Tr=c.Tr*k;d.D=c.D*k;d.R=c.R*k;d.ri=c.ri*k;d.Rs=c.Rs*k;d.cmin=Math.max(22,c.cmin*(0.5+0.5*k));d.cw=d.cmin;d.cx=Math.max(20,c.cx*(0.5+0.5*k));return d;}
/* ---- наборы кусков с реестром круглых углов ---- */
const rr=cnRR;
function cat(){const out=[],rc=[];for(const a of arguments){if(!a)continue;if(Array.isArray(a)){for(const q of a)out.push(q);if(a.rc)for(const r of a.rc)rc.push(r);}else out.push(a);}out.rc=rc;return out;}
const reg=(...pts)=>{const a=[];a.rc=pts;return a;};
const cnMov=(P,dx,dy)=>{const o=cnShift(P,dx,dy);o.rc=(P.rc||[]).map(r=>[r[0]+dx,r[1]+(dy||0)]);return o;};
const cnMirP=(P,w)=>{const o=cnMirror(P,w);o.rc=(P.rc||[]).map(r=>[w-r[0],r[1]]);return o;};
const cnFlipY=(P,H)=>{const o=P.map(q=>({p:q.p.map(v=>[v[0],H-v[1]]).reverse(),h:q.h}));o.rc=(P.rc||[]).map(r=>[r[0],H-r[1]]);return o;};
const cnRot=(P,w,H)=>{const o=P.map(q=>({p:q.p.map(v=>[w-v[0],H-v[1]]),h:q.h}));o.rc=(P.rc||[]).map(r=>[w-r[0],H-r[1]]);return o;};
/* кольцо (овал): внешние круглые углы по сторонам o.l/o.r/o.t/o.b, внутренние — всегда */
function cnRing(x0,y0,x1,y1,c,o){o=o||{};const S=c.S,Tt=c.Tr,rc=[];
  const L=o.l!==false,Rr=o.r!==false,Tp=o.t!==false,Bt=o.b!==false;
  if(Tp&&L)rc.push([x0,y1]);if(Tp&&Rr)rc.push([x1,y1]);if(Bt&&L)rc.push([x0,y0]);if(Bt&&Rr)rc.push([x1,y0]);
  rc.push([x0+S,y0+Tt],[x1-S,y0+Tt],[x1-S,y1-Tt],[x0+S,y1-Tt]);
  const a=[rr(x0,y0,x1,y1),cnRH(x0+S,y0+Tt,x1-S,y1-Tt)];a.rc=rc;return a;}
/* вертикальный крючок со срезом: свободный конец (yTip) срезан косо на c.ct, внешняя сторона outer ('l'|'r'); dir −1 — висит вниз от yBase, +1 — растёт вверх */
function cnHook(x0,x1,yBase,yTip,outer,c){const ang=c.ct*20*Math.PI/180,off=Math.min(0.5*(x1-x0)*Math.tan(ang)*2,0.6*Math.abs(yTip-yBase)),dir=yTip<yBase?-1:1;
  /* внешний край короче: срез «уходит» к внутреннему краю */
  const yo=yTip-dir*off,yi=yTip;const xo=outer==='r'?x1:x0,xi=outer==='r'?x0:x1;
  const P=[[x0,yBase],[x1,yBase]];
  const tip=outer==='r'?[[x1,yo],[x0,yi]]:[[x1,yi],[x0,yo]];
  return cnSolid(P.concat(tip));}
const CN_LET={};
function cnReg(chars,wr,ns,f,o){o=o||{};for(const ch of chars)CN_LET[ch]=Object.assign({f,wr,ns,ch},o);}
const cnYm=(c,H)=>0.47*H;
/* ширина знака (ink): wr·H·wd·kw, но не меньше стоек + просветов (+ собственный минимум знака) */
function cnWidth(ch,c,H){const d=CN_LET[ch];
  if(d.wf)return Math.round(d.wf(c,H));
  if(d.eq)return Math.round(d.ns*c.S+(d.ns-1)*c.cx+(d.ex?d.ex(c,H):0));const lo0=d.ns*c.S+(d.ns-1)*c.cmin*(d.cmf||1)+(d.ex?d.ex(c,H):0);
  let raw=Math.max(d.wr*H*c.wd*c.kw,lo0,d.mn?d.mn(c,H):0);const q=1;return Math.round(raw/q)*q;}
function cnBuild(ch,c,H){const d=CN_LET[ch];const w=cnWidth(ch,c,H);const P=d.f(c,w,H);return {polys:P,w,rc:P.rc||[]};}
/* крюк-терминал C/G/S: длина hk из апертуры */
const cnHk=(c,H,k)=>{const o=0.5*(1-0.62*c.ap)*H*(k||1);return Math.max(c.Tr+0.55*c.S,Math.min(o,0.40*H));};
/* ================= ПРЯМЫЕ ================= */
cnReg('ОO',.31,2,(c,w,H)=>cnRing(0,0,w,H,c),{});
cnReg('0',.245,2,(c,w,H)=>{const S=c.S;const P=cnRing(0,0,w,H,c);return cat(P,cnStP([w*0.5-S*0.36,H*0.10],[w*0.5+S*0.36,H*0.90],S*0.42));},{cmf:0.55});
function cnStP(p0,p1,wh){return cnPara(p0,p1,wh);}
cnReg('НH',.265,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,ym-T/2,w-S+1,ym+T/2)];},{});
cnReg('П',.265,2,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,H-T,w-S+1,H)];},{});
cnReg('Г',.215,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,H-T,w,H)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('F',.215,1,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.84,ym+T/2)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('ТT',.25,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,H-T,w,H),rr(w/2-S/2,0,w/2+S/2,H-T+1)];},{ex:(c)=>c.S+0.5*c.cmin*2});
cnReg('ЕE',.215,1,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.88,ym+T/2),rr(0,0,w,T)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('L',.215,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,0,w,T)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('I',.0,1,(c,w,H)=>[rr(0,0,w,H)],{mn:(c)=>c.S});
CN_LET.I.wr=0.001;
/* U — чаша: круглые нижние углы */
cnReg('U',.265,2,(c,w,H)=>{const S=c.S,T=c.T;const a=[rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,c.Tr)];a.rc=[[0,0],[w,0],[S,c.Tr],[w-S,c.Tr]];return a;},{});
const cnTail=(c,w,H,dep)=>{const S=c.S,T=c.T;return [rr(w-S,-dep,w,1)];};
const cnDep=(c)=>Math.max(0.17*700,c.S*1.3);
cnReg('Ц',.28,2,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,T)].concat(cnTail(c,w,H,cnDep(c)));},{});
const cnSh=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(w/2-S/2,0,w/2+S/2,H),rr(S-1,0,w-S+1,T)];};
cnReg('Ш',.43,3,cnSh,{});
cnReg('Щ',.445,3,(c,w,H)=>cnSh(c,w,H).concat(cnTail(c,w,H,cnDep(c))),{});
cnReg('Ч',.26,2,(c,w,H)=>{const S=c.S,T=c.T,yq=0.38*H;return [rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T)];},{});
/* Ь Ъ Ы Б: стойка + чаша (круглые правые углы) */
const cnBowl=(c,x0,y0,x1,y1)=>cnRing(x0,y0,x1,y1,c,{l:false});
cnReg('Ь',.27,2,(c,w,H)=>{const S=c.S,hb=0.60*H;return cat([rr(0,0,S,H)],cnBowl(c,0,0,w,hb));},{});
cnReg('Ъ',.33,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.60*H,fl=0.9*S;return cat([rr(0,H-T,fl+S,H),rr(fl,0,fl+S,H)],cnBowl(c,fl,0,w,hb));},{ns:2,ex:(c)=>0.9*c.S});
cnReg('Ы',.40,3,(c,w,H)=>{const S=c.S,hb=0.60*H,g=Math.max(22,0.30*S),bw=w-S-g;return cat([rr(0,0,S,H)],cnBowl(c,0,0,bw,hb),[rr(w-S,0,w,H)]);},{ex:(c)=>0.3*c.S});
cnReg('Б',.27,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.52*H;return cat([rr(0,0,S,H),rr(0,H-T,w,H)],cnBowl(c,0,0,w,hb));},{});
const cnTwo=(c,w,H,yu,lf,st)=>cat(cnRing(0,yu,w-(st||0.01*c.S),H,c,{l:lf,b:true}),cnRing(0,0,w,yu+c.Tr,c,{l:lf,t:true}));
cnReg('ВB',.29,2,(c,w,H)=>cnTwo(c,w,H,0.43*H,false,0.55*c.cmin),{ex:(c)=>0.55*c.cmin});
cnReg('8',.235,2,(c,w,H)=>cnTwo(c,w,H,0.50*H,true),{cmf:0.7});
const cnRru=(c,w,H)=>{const S=c.S,yu=0.40*H;return cat([rr(0,0,S,H)],cnBowl(c,0,yu,w,H));};
cnReg('РP',.265,2,cnRru,{});
/* R: чаша + прямая вертикальная нога */
const cnRl=(c,w,H)=>{const S=c.S,yu=0.40*H,wh=1.03*c.D;const xs=Math.max(w-wh/2-0.34*yu,S+0.5*wh+0.28*c.cmin);
  return cat(cnRru(c,w,H),[cnPara([xs,yu+0.4*c.Tr],[w-wh/2,0],wh)]);};
cnReg('R',.285,2,cnRl,{});
/* Я (блочная система): правая сквозная стойка, чаша слева с общим просветом, нога от левого низа чаши до базовой линии; между ногой и стойкой щель = общий просвет */
const cnYa=(c,w,H)=>{const S=c.S,yu=0.40*H,Tr=c.Tr,sh=Math.tan(7*Math.PI/180)*(yu+Tr*0.5),dp=0.35*S,hh=0.30*S,yn=yu+Tr*0.35;
  const P=cat(cnMirP(cnRru(c,w,H),w),[cnPara([S/2,yu+Tr*0.5],[S/2-sh,0],S)]);
  P.push(cnHole([[-sh*0.3-2,yn+hh],[dp-sh*0.3,yn],[-sh*0.3-2,yn-hh]]));return P;};
cnReg('Я',.285,2,cnYa,{});
cnReg('D',.285,2,(c,w,H)=>cnRing(0,0,w,H,c,{l:false}),{});
cnReg('Q',.30,2,(c,w,H)=>{const S=c.S,T=c.T;return cat(cnRing(0,0,w,H,c),[rr(w-S*1.05,-0.62*T,w+0.55*S,0.5*T)]);},{});
const cnC=(c,w,H,hk)=>{const S=c.S,Tt=c.Tr;hk=hk==null?cnHk(c,H):hk;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hk,'r',c),cnHook(w-S,w,Tt-1,hk,'r',c)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt]];return P;};
cnReg('СC',.265,2,(c,w,H)=>cnC(c,w,H),{});
cnReg('G',.285,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,hk=cnHk(c,H,1),yh=0.52*H;
  const P=cat(cnC(c,w,H,hk).slice(0,4),[rr(w-S,0,w,yh),rr(Math.max(S+0.45*c.cmin,S+0.30*(w-2*S)),yh-T,w-S+1,yh)]);
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt]];return P;},{});
/* Э: зеркальная С с язычком слева; З: две чаши с талией и крюками слева */
cnReg('Э',.265,2,(c,w,H)=>cnMirP(cat(cnC(c,w,H,Math.min(cnHk(c,H),0.80*(cnYm(c,H)-c.T/2-0.35*c.S)))),w).concat([rr(0.30*w,cnYm(c,H)-c.T/2,w-c.S+1,cnYm(c,H)+c.T/2)]),{});
const cnThree=(c,w,H,flat,hookTop)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),nh=0.86*T,hk=Math.min(cnHk(c,H,0.9),0.8*(ym-T/2-0.35*S));
  const P=[rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+nh/2-2,w,H-Tt/2),rr(w-S,Tt/2,w,ym-nh/2+2),rr(Math.max(w*0.38,w-1.7*S),ym-nh/2,w-(flat?0:0.38*S),ym+nh/2)];
  if(hookTop)P.push(cnHook(0,S,H-Tt+1,H-hk,'l',c));P.push(cnHook(0,S,Tt-1,hk,'l',c));
  P.rc=flat?[[w,0],[w,H*0+ym+nh/2],[0,0]].concat([[w-S,H-Tt]]):[[0,H],[w,H],[w,0],[w,ym+nh/2],[w-S,H-Tt],[w-S,ym+nh/2]];
  if(flat)P.rc.push([w,ym-nh/2]);P.rc=P.rc.concat([[w,ym-nh/2]]);return P;};
cnReg('З',.265,2,(c,w,H)=>cnThree(c,w,H,false,true),{});
cnReg('3',.265,2,(c,w,H)=>cnThree(c,w,H,true,false),{});
cnReg('S',.28,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),hk=Math.min(cnHk(c,H,0.95),H-ym-T/2-0.30*S,ym-T/2-0.30*S);
  const P=[rr(0,H-Tt,w,H),rr(0,ym-T/2,S,H-Tt/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,Tt/2,w,ym+T/2),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hk,'r',c),cnHook(0,S,Tt-1,hk,'l',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[0,ym-T/2],[w,ym+T/2],[S,H-Tt],[w-S,Tt],[S,ym+T/2],[w-S,ym-T/2]];return P;},{});
cnReg('5',.265,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H)+0.02*H,hk=cnHk(c,H,0.8);
  const P=[rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,c.Tr/2,w,ym+T/2),rr(0,0,w,c.Tr),cnHook(0,S,c.Tr-1,Math.min(hk,ym-T/2-0.3*S),'l',c)];
  P.rc=[[w,ym+T/2],[w,0],[S,ym-T/2],[w-S,c.Tr]];return P;},{});
cnReg('2',.265,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,hk=Math.min(cnHk(c,H,0.8),0.30*H);
  const P=[rr(0,H-Tt,w,H),rr(w-S,0.50*H,w,H-Tt/2),cnPara([w-S*0.5,0.56*H],[S*0.5,T*0.6],1.02*S),rr(0,0,w,T),cnHook(0,S,H-Tt+1,H-hk,'l',c)];
  P.rc=[[w,H],[w-S,H-Tt],[w,0.50*H]];return P;},{mn:(c)=>2.4*c.S});
const cn6=(c,w,H)=>{const S=c.S,T=c.T,hb=0.62*H,hk=cnHk(c,H,0.8);
  const P=cat([rr(0,0,S,H),rr(0,H-c.Tr,w,H),cnHook(w-S,w,H-c.Tr+1,H-hk,'r',c)],cnRing(0,0,w,hb,c));P.rc=P.rc.concat([[0,H],[w,H]]);return P;};
cnReg('6',.25,2,cn6,{cmf:0.7});
cnReg('9',.25,2,(c,w,H)=>cnRot(cn6(c,w,H),w,H),{cmf:0.7});
cnReg('4',.28,2,(c,w,H)=>{const S=c.S,T=c.T,yb=0.27*H,wh=0.92*S;
  return [rr(w-S,0,w,H),rr(0,yb,w,yb+T),cnPara([wh/2,yb+T-2],[w-S-wh*0.2,H],wh)];},{mn:(c)=>2.7*c.S});
cnReg('7',.265,1,(c,w,H)=>{const S=c.S,T=c.T,wh=1.02*S;return [rr(0,H-T,w,H),cnPara([w*0.30,0],[w-wh/2,H-T+2],wh)];},{mn:(c)=>2.35*c.S});
cnReg('1',.17,1,(c,w,H)=>{const S=c.S,fw=0.95*S;return [rr(w-S,0,w,H),cnSolid([[w-S,H],[w-S,H-1.25*S],[w-S-fw,H-0.78*S],[w-S-fw,H-0.78*S+0.70*S]])];},{ex:(c)=>0.95*c.S+0.2*c.cmin,mn:(c)=>2.0*c.S});
/* ================= ДИАГОНАЛЬНЫЕ ================= */
const CN_LEAN=14*Math.PI/180;
function cnKpart(c,w,H,x0){x0=x0||0;const S=c.S,T=c.T,ym=cnYm(c,H),wh=c.D/Math.cos(CN_LEAN),st=Math.max(0.35*S,c.cmin*0.75),xb=x0+S+st+wh/2;
  let xt=Math.min(x0+w-wh/2,xb+(H-ym)*Math.tan(17*Math.PI/180));xt=Math.max(xt,xb+4);
  return [rr(x0+S-1,ym-T/2,xb+wh/2,ym+T/2),cnPara([xb,ym],[xt,H],wh),cnPara([xb,ym],[xt,0],wh)];}
cnReg('КK',.29,2,(c,w,H)=>[rr(0,0,c.S,H)].concat(cnKpart(c,w,H)),{mn:(c)=>2.5*c.S+c.cmin});
cnReg('Ж',.52,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),wc=w/2,wh=c.D*0.98;
  const cen=rr(wc-S/2,0,wc+S/2,H);const g=Math.max(2,0.20*S),xl=wc-S/2-g,hw=xl;
  const arm=(x_in,x_out,sgn)=>[cnPara([x_in,ym+0.5],[x_out,H],wh),cnPara([x_in,ym-0.5],[x_out,0],wh)];
  const L=arm(wc-S/2+1,wh/2+0.5,-1),R_=arm(wc+S/2-1,w-wh/2-0.5,1);
  return [cen].concat(L,R_);},{mn:(c)=>3*c.S+1.7*c.D});
const cnI2=(c,w,H)=>{const S=c.S,x0=S*0.5,x1=w-S*0.5,xm=(x0+x1)/2,e=0.28*S,m=0.38*S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[x0-e,0],[x0+e,0],[xm+m,H/2],[x1+e,H],[x1-e,H],[xm-m,H/2]])];};
cnReg('ИN',.36,2,cnI2,{mn:(c)=>2.0*c.S+3.6*c.cmin});
cnReg('N',.36,2,(c,w,H)=>cnMirP(cnI2(c,w,H),w),{mn:(c)=>2.0*c.S+3.6*c.cmin});
cnReg('ХX',.29,2,(c,w,H)=>{const wh=0.92*c.D;return [cnPara([wh/2,0],[w-wh/2,H],wh),cnPara([w-wh/2,0],[wh/2,H],wh)];},{mn:(c)=>2.5*c.D+0.4*c.cmin});
cnReg('Y',.29,2,(c,w,H)=>{const S=c.S,wh=0.9*c.D,ymid=0.42*H;
  return [cnPara([wh/2,H],[w/2,ymid],wh),cnPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('У',.29,2,(c,w,H)=>{const D=c.D*0.98,yb=0.40*H;const xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,0],[xr,H],D)];const m=(xr-xl)/H;const xj=xl+m*yb;P.push(cnPara([xl,H],[xj,yb],D));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
cnReg('V',.29,2,(c,w,H)=>{const wh=0.92*c.D;return [cnPara([wh/2,H],[w/2,0],wh),cnPara([w-wh/2,H],[w/2,0],wh)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('W',.52,3,(c,w,H)=>{const wh=0.82*c.D,q=w/4;
  return [cnPara([wh/2,H],[q,0],wh),cnPara([2*q,H*0.64],[q,0],wh),cnPara([2*q,H*0.64],[3*q,0],wh),cnPara([w-wh/2,H],[3*q,0],wh)];},{mn:(c)=>3.2*c.D+0.8*c.cmin});
cnReg('МM',.42,2,(c,w,H)=>{const S=c.S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,H],[w/2,0.28*H],0.9*c.D),cnPara([w-S/2,H],[w/2,0.28*H],0.9*c.D)];},{mn:(c)=>2*c.S+2.4*c.D});
cnReg('Z',.265,2,(c,w,H)=>{const S=c.S,T=c.T,wh=1.0*S;return [rr(0,H-T,w,H),rr(0,0,w,T),cnPara([w-wh/2,H-T+2],[wh/2,T-2],wh)];},{mn:(c)=>2.3*c.S+0.5*c.cmin});
cnReg('Л',.32,2,(c,w,H)=>{const S=c.S,T=c.T,wh=c.D*1.0,lean=Math.max(0,Math.min(0.10*H,w-S-wh-c.cmin*0.9));
  return [rr(lean*0.35,H-T,w,H),rr(w-S,0,w,H),cnPara([wh/2,0],[wh/2+lean,H-T+2],wh)];},{mn:(c)=>S0(c)+c.D+c.cmin*1.1+0.06*700});
function S0(c){return c.S;}
cnReg('Д',.31,2,(c,w,H)=>{const S=c.S,T=c.T,dp=cnDep(c)*0.9,ex=0.50*S;
  /* верхняя полка, стойки, пол на базовой линии, ножки ниже базовой с наружными лапками */
  return [rr(0,H-T,w,H),rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,-0*dp,w-S+1,T),rr(0,-dp,S,2),rr(w-S,-dp,w,2),rr(-ex,-dp,S,-dp+T*0.92),rr(w-S,-dp,w+ex,-dp+T*0.92)];},{mn:(c)=>2*c.S+c.cmin*1.3});
cnReg('АA',.34,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,sh=1.0*S,ctop=Math.max(0.85*c.cmin,0.30*S),dx=Math.max(0,Math.min(0.12*w,(w-2*sh-ctop)/2)),yb=0.30*H;
  const P=[cnSolid([[0,0],[sh,0],[dx+sh,H],[dx,H]]),cnSolid([[w,0],[w-sh,0],[w-dx-sh,H],[w-dx,H]]),rr(dx,H-Tt,w-dx,H),rr(0.5*dx*yb/H+sh*0.5,yb,w-0.5*dx*yb/H-sh*0.5,yb+T)];
  P.rc=[[dx,H],[w-dx,H]];return P;},{mn:(c)=>2.0*c.S+0.85*c.cmin+0.30*c.S+0.14*700});
cnReg('Ф',.50,3,(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return cat(cnRing(0,y0,w,y1,c),[rr(w/2-S/2,0,w/2+S/2,H)]);},{mn:(c)=>3*c.S+2.2*c.cmin});
cnReg('Ю',.48,3,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H),bl=0.55*S;
  return cat([rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)],cnRing(S+bl,0,w,H,c));},{mn:(c)=>3*c.S+0.55*c.S+c.cmin*1.2});
cnReg('J',.215,1,(c,w,H)=>{const S=c.S,T=c.T,hk=Math.min(c.Tr+0.4*S+0.1*H*0.4,0.30*H);
  const P=[rr(w-S,0,w,H),rr(0,0,w,c.Tr),rr(0,0,S,hk)];P.rc=[[w,0],[S,c.Tr]];return P;},{ex:(c)=>0.6*c.S+c.cmin*0.3});

/* ================= правки по замечаниям пользователя (R3) ================= */
const cnGap=c=>Math.max(14,c.cx*c.ap);
const cnDw=(c,dx,dy)=>c.D*Math.sqrt(dx*dx+dy*dy)/Math.abs(dy);   /* горизонтальная ширина диагонали при перпендикуляре D */
const EQ={eq:1};
for(const ch of 'ОO0НHПUЦШЩЧЬДDQ')if(CN_LET[ch])CN_LET[ch].eq=1;
for(const ch of '08')if(CN_LET[ch])CN_LET[ch].eq=1;
CN_LET['Ъ'].eq=1;CN_LET['Ы'].eq=1;CN_LET['Ю'].eq=1;CN_LET['Ф'].eq=1;
CN_LET['Ъ'].ex=(c)=>0.9*c.S;
for(const ch of 'ВB'){CN_LET[ch].eq=1;CN_LET[ch].ex=null;}
CN_LET['Б'].eq=1;CN_LET['РP'[0]].eq=1;CN_LET['P'].eq=1;CN_LET['R'].eq=1;CN_LET['Я'].eq=1;
CN_LET['Ы'].f=(c,w,H)=>{const S=c.S,hb=0.60*H,g=c.cx,bw=w-S-g;return cat([rr(0,0,S,H)],cnBowl(c,0,0,bw,hb),[rr(w-S,0,w,H)]);};CN_LET['Ы'].ex=null;
CN_LET['Ю'].f=(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H),bl=c.cx;return cat([rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)],cnRing(S+bl,0,w,H,c));};CN_LET['Ю'].ex=null;
CN_LET['0'].cmf=1;CN_LET['8'].cmf=1;
cnReg('6',.25,2,cn6,{eq:1});cnReg('9',.25,2,(c,w,H)=>cnRot(cn6(c,w,H),w,H),{eq:1});
/* И, N: чистая прямая диагональ с параллельными краями, без вырезов; ширина = 1.5 S + Wd/2 + 2.4 cx */
const cnWdI=(c,H)=>{let w=1.5*c.S+0.5*c.D+2.4*c.cx;for(let i=0;i<4;i++){const wd=cnDw(c,w-c.S,H);w=1.5*c.S+0.5*wd+2.4*c.cx;}return w;};
const cnI3=(c,w,H)=>{const S=c.S,wd=cnDw(c,w-S,H);return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,0],[w-S/2,H],wd)];};
cnReg('ИN',.3,2,cnI3,{wf:cnWdI});
cnReg('N',.3,2,(c,w,H)=>cnMirP(cnI3(c,w,H),w),{wf:cnWdI});
/* Л и А (А = Л + перекладина) */
const cnLamP=(c,H)=>{const lean=0.065*H;return {lean,wh:cnDw(c,lean,H-c.T)};};
const cnLamW=(c,H)=>{const p=cnLamP(c,H);return c.S+p.wh+p.lean+c.cx;};
const cnLam=(c,w,H)=>{const S=c.S,T=c.T,p=cnLamP(c,H),wh=p.wh,lean=p.lean;
  return [rr(lean*0.35,H-T,w,H),rr(w-S,0,w,H),cnPara([wh/2,0],[wh/2+lean,H-T+2],wh)];};
cnReg('Л',.3,2,cnLam,{wf:cnLamW});
cnReg('АA',.3,2,(c,w,H)=>{const S=c.S,T=c.T,p=cnLamP(c,H),ym=cnYm(c,H),xd=p.wh/2+p.lean*ym/(H-T+2);
  return cnLam(c,w,H).concat([rr(xd,ym-T/2,w-S+1,ym+T/2)]);},{wf:cnLamW});
/* Ф: стойка насквозь, два равных узких просвета */
cnReg('Ф',.4,3,(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return cat(cnRing(0,y0,w,y1,c),[rr(w/2-S/2,0,w/2+S/2,H)]);},{eq:1});
/* С: вертикальные терминалы сверху вниз и снизу вверх, щель по центру = просвет */
const cnC2=(c,w,H)=>{const S=c.S,Tt=c.Tr,g=cnGap(c),ym=H*0.5;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+g/2,w,H),rr(w-S,0,w,ym-g/2)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;};
cnReg('СC',.3,2,cnC2,{eq:1});
cnReg('G',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=cnGap(c),yh=0.52*H;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,yh+g,w,H),rr(w-S,0,w,yh),rr(S+c.cx,yh-T,w-S+1,yh)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;},{eq:1,ex:(c)=>0.75*c.S});
/* Э: зеркало Є: язычок и терминалы с щелью вокруг него */
cnReg('Э',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=cnGap(c),ym=cnYm(c,H);
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+T/2+g,w,H),rr(w-S,0,w,ym-T/2-g),rr(S-1,ym-T/2,w-S-c.cx,ym+T/2)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return cnMirP(P,w);},{eq:1,ex:(c)=>0.8*c.S});
/* Б: верхняя полка с вертикальным сбросом справа (30 % кегля) */
cnReg('Б',.3,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.52*H;return cat([rr(0,0,S,H),rr(0,H-T,w,H),rr(w-S,0.70*H,w,H)],cnBowl(c,0,0,w,hb));},{eq:1});
/* З, 3: V-вырез справа в талии, крюки с щелью */
const cnThree2=(c,w,H,flat,hookTop)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),nh=0.86*T,g=cnGap(c);
  const P=[rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,Tt/2,w,H-Tt/2),rr(Math.max(w*0.38,w-1.7*S),ym-nh/2,w,ym+nh/2)];
  const dp=0.35*S,hh=0.30*S;P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));
  const hkU=Math.min(0.40*H,Math.max(0.10*H,(H-Tt)-(ym+nh/2)-g)),hkL=Math.min(0.40*H,Math.max(0.10*H,(ym-nh/2)-Tt-g));
  if(hookTop)P.push(cnHook(0,S,H-Tt+1,H-hkU,'l',c));P.push(cnHook(0,S,Tt-1,hkL,'l',c));
  P.rc=[[0,H],[0,0],[w,H],[w,0],[w-S,H-Tt],[w-S,Tt]];return P;};
cnReg('З',.3,2,(c,w,H)=>cnThree2(c,w,H,false,true),{eq:1});
cnReg('3',.3,2,(c,w,H)=>cnThree2(c,w,H,true,false),{eq:1});
/* S, 5, 6: крюки доходят до щели = просвет */
cnReg('S',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),g=cnGap(c);
  const hkU=Math.min(0.40*H,Math.max(0.10*H,(H-Tt)-(ym+T/2)-g)),hkL=Math.min(0.40*H,Math.max(0.10*H,(ym-T/2)-Tt-g));
  const P=[rr(0,H-Tt,w,H),rr(0,ym-T/2,S,H-Tt/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,Tt/2,w,ym+T/2),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hkU,'r',c),cnHook(0,S,Tt-1,hkL,'l',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[0,ym-T/2],[w,ym+T/2],[S,H-Tt],[w-S,Tt],[S,ym+T/2],[w-S,ym-T/2]];return P;},{eq:1});
cnReg('5',.3,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H)+0.02*H,g=cnGap(c),hk=Math.min(0.40*H,Math.max(0.10*H,(ym-T/2)-c.Tr-g));
  const P=[rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,c.Tr/2,w,ym+T/2),rr(0,0,w,c.Tr),cnHook(0,S,c.Tr-1,hk,'l',c)];
  P.rc=[[0,H],[0,0],[w,ym+T/2],[w,0],[S,ym-T/2],[w-S,c.Tr]];return P;},{eq:1});
function cn6b(c,w,H){const S=c.S,T=c.T,hb=0.62*H,g=cnGap(c),hk=Math.min(0.40*H,Math.max(0.10*H,H-c.Tr-hb-g));
  const P=cat([rr(0,0,S,H),rr(0,H-c.Tr,w,H),cnHook(w-S,w,H-c.Tr+1,H-hk,'r',c)],cnRing(0,0,w,hb,c));P.rc=P.rc.concat([[0,H],[w,H]]);return P;}
cnReg('6',.25,2,cn6b,{eq:1});cnReg('9',.25,2,(c,w,H)=>cnRot(cn6b(c,w,H),w,H),{eq:1});
/* диагонали: перпендикуляр ≈ 1.03 S (оптическая компенсация) */
cnReg('ХX',.29,2,(c,w,H)=>{const wh=cnDw(c,w-c.D,H);return [cnPara([wh/2,0],[w-wh/2,H],wh),cnPara([w-wh/2,0],[wh/2,H],wh)];},{mn:(c)=>2.5*c.D+0.4*c.cmin});
cnReg('Y',.29,2,(c,w,H)=>{const S=c.S,ymid=0.42*H,wh=cnDw(c,w/2-c.D/2,H-ymid);
  return [cnPara([wh/2,H],[w/2,ymid],wh),cnPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('У',.29,2,(c,w,H)=>{const D=cnDw(c,w-c.D,H),yb=0.40*H;const xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,0],[xr,H],D)];const m=(xr-xl)/H;const xj=xl+m*yb;P.push(cnPara([xl,H],[xj,yb],cnDw(c,xj-xl,H-yb)));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
cnReg('V',.29,2,(c,w,H)=>{const wh=cnDw(c,w/2-c.D/2,H);return [cnPara([wh/2,H],[w/2,0],wh),cnPara([w-wh/2,H],[w/2,0],wh)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('W',.52,3,(c,w,H)=>{const q=w/4,wh=cnDw(c,q,H),wm=cnDw(c,q,0.64*H);
  return [cnPara([wh/2,H],[q,0],wh),cnPara([2*q,H*0.64],[q,0],wm),cnPara([2*q,H*0.64],[3*q,0],wm),cnPara([w-wh/2,H],[3*q,0],wh)];},{mn:(c)=>3.3*c.D+0.8*c.cmin});
cnReg('МM',.42,2,(c,w,H)=>{const S=c.S,wh=cnDw(c,w/2-S/2,0.72*H);
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,H],[w/2,0.28*H],wh),cnPara([w-S/2,H],[w/2,0.28*H],wh)];},{mn:(c)=>2*c.S+2.4*c.D});
cnReg('Z',.265,2,(c,w,H)=>{const S=c.S,T=c.T,wh=cnDw(c,w-c.D,H-2*T);return [rr(0,H-T,w,H),rr(0,0,w,T),cnPara([w-wh/2,H-T+2],[wh/2,T-2],wh)];},{mn:(c)=>2.3*c.S+0.5*c.cmin});
cnReg('Ж',.52,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),wc=w/2,wh=cnDw(c,wc-S/2-c.D/2,H-ym);
  const cen=rr(wc-S/2,0,wc+S/2,H);
  const arm=(x_in,x_out)=>[cnPara([x_in,ym+0.5],[x_out,H],wh),cnPara([x_in,ym-0.5],[x_out,0],wh)];
  return [cen].concat(arm(wc-S/2+1,wh/2+0.5),arm(wc+S/2-1,w-wh/2-0.5));},{mn:(c)=>3*c.S+1.7*c.D});

cnReg('ВB',.29,2,(c,w,H)=>cnTwo(c,w,H,0.43*H,false,0.0001),{eq:1});

/* Ф: кольцо из полос (без дыры), стойка проходит насквозь через оба просвета */
const cnPhi=(c,w,H,y0,y1,yb,yt)=>{const S=c.S,Tt=c.Tr,a=w/2-S/2,b=w/2+S/2;
  const P=[rr(0,y0,S,y1),rr(w-S,y0,w,y1),rr(0,y1-Tt,w,y1),rr(0,y0,w,y0+Tt),rr(a,yb,b,yt)];
  P.rc=[[0,y0],[w,y0],[0,y1],[w,y1],[S,y0+Tt],[S,y1-Tt],[a,y0+Tt],[a,y1-Tt],[b,y0+Tt],[b,y1-Tt],[w-S,y0+Tt],[w-S,y1-Tt]];return P;};
cnReg('Ф',.4,3,(c,w,H)=>cnPhi(c,w,H,0.14*H,0.86*H,0,H),{eq:1});

/* 0: косая черта выступает за контур (отличие от О при равных просветах); 8: V-вырезы с обеих сторон в талии (отличие от В) */
cnReg('0',.245,2,(c,w,H)=>{const S=c.S;return cat(cnRing(0,0,w,H,c),[cnPara([S*0.55,0.12*H],[w-S*0.55,0.88*H],0.72*S)]);},{eq:1});
cnReg('8',.235,2,(c,w,H)=>{const yu=0.50*H,P=cnTwo(c,w,H,yu,true),ym=yu+c.Tr/2,dp=0.35*c.S,hh=0.30*c.S;
  P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]),cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]));return P;},{eq:1});

/* ===== правки пользователя, раунд 2 ===== */
/* N/И: диагональ от внутреннего верхнего угла левой стойки до внутреннего края правой на 50 % высоты; нижняя кромка — от левой на 50 % до внутреннего нижнего угла правой. Колонка просвета = 1.3 cx */
const cnN4=(c,w,H)=>{const S=c.S;return [rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[S-1,H],[w-S+1,H/2],[w-S+1,0],[S-1,H/2]])];};
cnReg('N',.3,2,cnN4,{eq:1,ex:(c)=>0.3*c.cx});
cnReg('И',.3,2,(c,w,H)=>cnMirP(cnN4(c,w,H),w),{eq:1,ex:(c)=>0.3*c.cx});
/* Д: корпус на сплошном основании по базовой линии, шире стоек на 0.25 S с каждой стороны, высота = S; без выносных ножек */
cnReg('Д',.3,2,(c,w,H)=>{const S=c.S,T=c.T,ex=0.25*S;return [rr(0,H-T,w,H),rr(0,0,S,H),rr(w-S,0,w,H),rr(-ex,0,w+ex,S)];},{eq:1});
/* В: V-вырез справа в талии */
cnReg('ВB',.29,2,(c,w,H)=>{const yu=0.43*H,P=cnTwo(c,w,H,yu,false,0.0001),ym=yu+c.Tr/2,dp=0.35*c.S,hh=0.30*c.S;
  P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1});
/* Ж: три стойки через общий просвет, стрелки-соединители на середине, V-вырезы снаружи боковых стоек; w = 3S + 2cx */
cnReg('Ж',.45,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),ah=0.15*H,dp=0.30*S,hh=0.26*S,a=w/2-S/2,b=w/2+S/2;
  const P=[rr(0,0,S,H),rr(a,0,b,H),rr(w-S,0,w,H),cnSolid([[S-1,ym+ah],[a+1,ym],[S-1,ym-ah]]),cnSolid([[w-S+1,ym+ah],[b-1,ym],[w-S+1,ym-ah]])];
  P.push(cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]),cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1});
/* Э: зеркальная закрытая С с короткой перемычкой */
cnReg('Э',.3,2,(c,w,H)=>{const S=c.S,T=c.T,tl=0.5*c.cx;
  return cnMirP(cat(cnC2(c,w,H),[rr(S-1,H*0.5-0.45*T,S+tl,H*0.5+0.45*T)]),w);},{eq:1});
/* М: две стойки и узкая центральная V; w = 3S + 2cx */
cnReg('МM',.3,3,(c,w,H)=>{const S=c.S,cx=c.cx,inner=w-2*S,wh=(inner-cx)/2,ymin=0.28*H,xc=w/2;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S+wh/2,H],[xc,ymin],wh),cnPara([w-S-wh/2,H],[xc,ymin],wh)];},{eq:1});

/* ===== правки пользователя, раунд 3: Х У G W Y в блочной системе ===== */
const CN_UV='A';
/* Х: две стойки + бабочка-соединитель на середине + V-вырезы снаружи; 2S+1.3cx */
cnReg('ХX',.3,2,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),ah=0.15*H,dp=0.30*S,hh=0.26*S,nk=0.18*S,xc=w/2;
  const P=[rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[S-1,ym+ah],[xc,ym+nk],[w-S+1,ym+ah],[w-S+1,ym-ah],[xc,ym-nk],[S-1,ym-ah]])];
  P.push(cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]),cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1,ex:(c)=>0.3*c.cx});
/* Y: две верхние стойки, скруглённый U-стык на 45 %, центральная стойка S; 2S+cx */
cnReg('Y',.3,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,yb=0.45*H;
  const P=[rr(0,yb,S,H),rr(w-S,yb,w,H),rr(0,yb,w,yb+Tt),rr(w/2-S/2,0,w/2+S/2,yb+2)];
  P.rc=[[0,yb],[w,yb],[S,yb+Tt],[w-S,yb+Tt]];return P;},{eq:1});
/* У: три варианта (COND_UV=A|B|C) */
const cnUup=(c,w,H,yq,ext)=>{const S=c.S,T=c.T;return [rr(0,yq,S,H),rr(w-S,ext,w,H),rr(0,yq,w-S+1,yq+T)];};
cnReg('У',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,yq=0.42*H,dd=cnDep(c);let P;
  if(CN_UV==='B'){const hk=Math.max(Tt+0.2*S,0.65*dd);
    P=cat(cnUup(c,w,H,yq,-dd),[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)]);
    P.rc=[[0,yq],[0,-dd],[w,-dd],[S,yq+T],[S,-dd+Tt],[w-S,-dd+Tt]];}
  else if(CN_UV==='C'){const yb=0.45*H;
    P=[rr(0,yb,S,H),rr(w-S,yb,w,H),rr(0,yb,w,yb+Tt),rr(w/2-S/2,0,w/2+S/2,yb+2),rr(0,0,w/2+S/2,Tt)];
    P.rc=[[0,yb],[w,yb],[0,0],[S,yb+Tt],[w-S,yb+Tt],[w/2-S/2,Tt]];}
  else{const hk=0.20*H;
    P=cat(cnUup(c,w,H,yq,0),[rr(0,0,w,Tt),rr(0,0,S,hk)]);
    P.rc=[[0,yq],[0,0],[w,0],[S,yq+T],[S,Tt],[w-S,Tt]];}
  return P;},{eq:1});
/* G: закрытая С, нижняя стойка поднята до середины + язычок влево; 2S+cx */
cnReg('G',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=0.33*H,yh=0.36*H,tl=0.6*c.cx;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,yh+g,w,H),rr(w-S,0,w,yh),rr(w-S-tl,yh-0.8*T,w-S+1,yh)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;},{eq:1});
/* W: вертикальное зеркало М: две стойки + центральная перевёрнутая V до 65 %; 3S+2cx */
cnReg('W',.3,3,(c,w,H)=>{const S=c.S,cx=c.cx,inner=w-2*S,wh=(inner-cx)/2,ymax=0.65*H,xc=w/2;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S+wh/2,0],[xc,ymax],wh),cnPara([w-S-wh/2,0],[xc,ymax],wh)];},{eq:1});
/* ---------- «Столб» (stolb): строчные, акценты, цифры, знаки. Базовый набор (RU/EN, цифры, пунктуация, символы CS68) ---------- */
const CN_CAPH=700,CN_ASC=730,CN_DD=170;
const CN_CYR_U='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',CN_CYR_L='абвгдежзийклмнопрстуфхцчшщъыьэюя';
const CN_LAT_U='ABCDEFGHIJKLMNOPQRSTUVWXYZ',CN_LAT_L='abcdefghijklmnopqrstuvwxyz',CN_DIG='0123456789';
const CN_PUNCT=[...'.,:;!?«»„“”‘’"\'-–—()/&№…@#%*−·•°+=\\|₽©‒'];
const CN_SPACES={' ':1,' ':1,' ':1,' ':1};
const cnLcCtx=c=>{const k=Math.min(0.90,0.27*c.lcr*CN_CAPH/c.S);const d=cnSub(c,k),xh=c.lcr*CN_CAPH;d.T=Math.min(d.T,0.19*xh);d.Tr=Math.min(d.Tr,0.20*xh);d.asc=CN_ASC;d.dd=CN_DD;return d;};
/* ---- строчные латинские формы (собственные) ---- */
const cnArch=(c,w,H,hs)=>{const S=c.S,Tt=c.Tr;const P=[rr(0,0,S,hs),rr(w-S,0,w,H),rr(S-1,H-Tt,w,H)];P.rc=[[w,H],[w-S,H-Tt],[S,H-Tt]];return P;};
cnReg('n',.34,2,(c,w,H)=>cnArch(c,w,H,H),{});
cnReg('h',.34,2,(c,w,H)=>cnArch(c,w,H,c.asc),{});
cnReg('r',.26,1,(c,w,H)=>{const S=c.S,Tt=c.Tr,hk=Math.min(0.26*H,H-0.4*S-Tt);const P=[rr(0,0,S,H),rr(S-1,H-Tt,w,H),rr(w-0.85*S,H-hk,w,H)];P.rc=[[w,H],[S,H-Tt]];return P;},{ex:(c)=>0.85*c.S+0.6*c.cmin});
cnReg('b',.37,2,(c,w,H)=>cat([rr(0,0,c.S,c.asc)],cnRing(0,0,w,H,c,{t:false})),{});
cnReg('d',.37,2,(c,w,H)=>cnMirP(cat([rr(0,0,c.S,c.asc)],cnRing(0,0,w,H,c,{t:false})),w),{});
cnReg('p',.37,2,(c,w,H)=>cat([rr(0,-c.dd,c.S,H)],cnRing(0,0,w,H,c,{l:false,b:false})),{});
cnReg('q',.37,2,(c,w,H)=>cnMirP(cat([rr(0,-c.dd,c.S,H)],cnRing(0,0,w,H,c,{l:false,b:false})),w),{});
cnReg('a',.36,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,hm=Math.max(0.50*H,2*Tt+0.23*H),hk=Math.min(0.12*H+0.3*Tt,H-hm-Tt*0.5-0.26*H),x0=0.05*w;
  const bowl=cnRing(0,0,w,hm,c);
  const hd=Math.min(0.24*H,H-hm-0.20*H);const P=cat(bowl,[rr(w-S,0,w,H),rr(0,H-Tt,w,H),rr(0,H-hd,S,H)]);P.rc=P.rc.concat([[w,H],[0,H],[S,H-Tt],[w-S,H-Tt]]);return P;},{eq:1});
cnReg('e',.36,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=0.54*H,gp=Math.max(0.55*S,0.22*H*c.ap),hk=Math.max(Tt+0.3*S,ym-T/2-gp);
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(S-1,ym-T/2,w,ym+T/2),rr(w-S,ym-T/2,w,H),rr(0,0,w,Tt),cnHook(w-S,w,Tt-1,Math.min(hk,ym-T/2-0.45*S),'r',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[S,Tt],[S,H-Tt],[w-S,H-Tt]];return P;},{});
cnReg('g',.37,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,dd=c.dd,hk=Math.min(0.55*dd+0.2*S,dd-0.1*S);
  const P=cat(cnRing(0,0,w,H,c),[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)]);P.rc=P.rc.concat([[w,-dd],[w-S,-dd+Tt]]);return P;},{});
cnReg('f',.30,1,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,xs=0.34*S+0.1*c.cmin;const P=[rr(xs,0,xs+S,c.asc),rr(xs,c.asc-Tt,w,c.asc),rr(0,H-T,xs+S+0.55*S,H)];P.rc=[[xs,c.asc],[w,c.asc]];return P;},{ex:(c)=>1.55*c.S+0.9*c.cmin});
cnReg('t',.30,1,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,xs=0.34*S+0.1*c.cmin;const P=[rr(xs,0,xs+S,0.94*c.asc),rr(0,H-T,w,H),rr(xs,0,w,Tt),rr(w-S*0.9,0,w,0.24*H)];P.rc=[[w,0],[xs,0],[xs+S,Tt]];return P;},{ex:(c)=>1.55*c.S+0.9*c.cmin});
cnReg('i',.001,1,(c,w,H)=>{const S=c.S,dh=0.82*S,gp=Math.max(0.62*S,0.12*H);return [rr(0,0,w,H),rr(0,H+gp,w,H+gp+dh)];},{mn:(c)=>c.S});
cnReg('j',.22,1,(c,w,H)=>{const S=c.S,Tt=c.Tr,dd=c.dd,dh=0.82*S,gp=Math.max(0.62*S,0.12*H),hk=Math.min(0.5*dd,dd-0.1*S);
  const P=[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk),rr(w-S,H+gp,w,H+gp+dh)];P.rc=[[w,-dd],[w-S,-dd+Tt]];return P;},{ex:(c)=>0.9*c.S+0.3*c.cmin});
cnReg('l',.001,1,(c,w,H)=>{const S=c.S,Tt=c.Tr;const P=[rr(0,0,S,c.asc),rr(0,0,w,Tt)];P.rc=[[w,0]];return P;},{mn:(c)=>1.62*c.S});
cnReg('k',.34,2,(c,w,H)=>[rr(0,0,c.S,c.asc)].concat(cnKpart(c,w,H)),{mn:(c)=>2.5*c.S+c.cmin});
cnReg('y',.30,2,(c,w,H)=>{const dd=c.dd,D=cnDw(c,w-c.D,H+dd),yb=0.36*H,xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,-dd],[xr,H],D)];const m=(xr-xl)/(H+dd);const xj=xl+m*(yb+dd);P.push(cnPara([xl,H],[xj,yb],D));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
/* строчные из кириллических/латинских прописных рецептов на высоте x (с масштабом ширины) */
const CN_LCMAP={o:'О',c:'С',s:'S',v:'V',w:'W',x:'Х',z:'Z',u:'U','в':'В','г':'Г','д':'Д','ж':'Ж','з':'З','и':'И','й':'И','к':'К','л':'Л','м':'М','н':'Н','п':'П','т':'Т','ц':'Ц','ч':'Ч','ш':'Ш','щ':'Щ','ъ':'Ъ','ы':'Ы','ь':'Ь','э':'Э','ю':'Ю','я':'Я','ё':'Е'};
for(const k in CN_LCMAP){const b=CN_LET[CN_LCMAP[k]];CN_LET[k]=Object.assign({},b,{ch:k,wr:b.wrl||b.wr*1.24});}
CN_LET.i.wr=CN_LET.l.wr=0.001;
cnReg('m',.62,3,(c,w,H)=>{const S=c.S,Tt=c.Tr,xm=(w-S)/2;const P=[rr(0,0,S,H),rr(xm,0,xm+S,H),rr(w-S,0,w,H),rr(S-1,H-Tt,xm+S,H),rr(xm,H-Tt,w,H)];P.rc=[[xm+S,H],[w,H],[S,H-Tt],[xm,H-Tt]];return P;},{mn:(c)=>3*c.S+2*c.cmin});
/* б — стойка с флажком + чаша; ф — овал со стойкой от нижнего до верхнего выносного */
cnReg('б',.34,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr;const P=cat([rr(0,0,S,c.asc),rr(0,c.asc-T,w*0.86,c.asc)],cnRing(0,0,w,H,c,{t:false}));return P;},{});
cnReg('ф',.4,3,(c,w,H)=>cnPhi(c,w,H,0,H,-c.dd,c.asc),{eq:1});
for(const ch of 'nhbdpqaegб')CN_LET[ch].eq=1;CN_LET.m.eq=1;CN_LET['ф'].eq=1;
/* ---- акценты ---- */
function cnDots(w,y0,c){const d=Math.min(0.72*c.S,w/2.5),g=0.5*d,x0=(w-2*d-g)/2;return [rr(x0,y0,x0+d,y0+d),rr(x0+d+g,y0,x0+2*d+g,y0+d)];}
function cnBreve(w,y0,c){const S=c.S,db=Math.min(0.80*S,w*0.30),gb=Math.max(0.34*S,22),wb=Math.min(2*db+gb,w*0.94),bt=0.62*c.T,mh=bt+0.80*db,x0=(w-wb)/2;
  const P=[rr(x0,y0,x0+db,y0+mh),rr(x0+wb-db,y0,x0+wb,y0+mh),rr(x0+db-1,y0,x0+wb-db+1,y0+bt)];P.rc=[[x0,y0],[x0+wb,y0],[x0+db,y0+bt],[x0+wb-db,y0+bt]];return P;}
const cnMarkGap=c=>Math.max(40,0.34*c.S);
/* ---- базовые знаки ---- */
const CN_BASE_UP={Ё:'Е',Й:'И'};
function cnGlyphPiece(ch,c){
  if(CN_SPACES[ch])return {cs:[],w:1,dy:0,raw:[],rc:[],space:true};
  let key=ch,cc=c,H=CN_CAPH,lower=false;
  const isDig=CN_DIG.includes(ch),isU=CN_LAT_U.includes(ch)||CN_CYR_U.includes(ch)||'ЁЙ'.includes(ch),isL=CN_LAT_L.includes(ch)||CN_CYR_L.includes(ch)||'ёй'.includes(ch);
  if(isDig||isU||isL){
    if(ch==='Ё')key='Е';else if(ch==='Й')key='И';else if(ch==='ё')key='e';else if(ch==='й')key='и';
    if(isL){H=CN_CAPH*c.lcr;cc=cnLcCtx(c);lower=true;}
    else if(ch==='Й'||ch==='Ё'){}
    const sh=CN_SHARED[key];if(sh&&!CN_LET[key])key=sh;
    const P=cnBuild(key,cc,H);let raw=P.polys,rc=(raw.rc||[]).slice();
    let extra=[];if(ch==='ё'||ch==='Ё'){extra=cnDots(P.w,H+cnMarkGap(cc),cc);}
    if(ch==='й'||ch==='Й'){const b=cnBreve(P.w,H+cnMarkGap(cc),cc);extra=b;rc=rc.concat(b.rc);}
    raw=Object.assign(raw.concat(extra),{rc});
    return {cs:cnFinish(raw,cc.R,cc.ri,rc,cc.Rs),w:P.w,dy:0,raw,rc};}
  const Q=cnPunct(ch,c,CN_CAPH);if(!Q)return null;
  return {cs:cnFinish(Q.polys,c.R,c.ri,Q.rc||[],c.Rs),w:Q.w,dy:0,raw:Q.polys,rc:Q.rc||[]};}
const cnDot=(x,y,d)=>rr(x,y,x+d,y+d);
const cnComma=(x,y,d)=>[cnDot(x,y,d),cnPara([x+d*0.58,y+d*0.2],[x+d*0.22,y-0.74*d],d*0.78)];
function cnPunct(ch,c,H){const S=c.S,T=c.T,Tt=c.Tr,d=1.02*S,ym=0.47*H;let polys=[],w=0,rc=[];
  const sm=cnSub(c,0.62);
  if(ch==='.'){polys=[cnDot(0,0,d)];w=d;}
  else if(ch===','){polys=cnComma(0.1*d,0,d);w=1.2*d;}
  else if(ch===':'){polys=[cnDot(0,0,d),cnDot(0,0.375*H*1.0,d)];w=d;}
  else if(ch===';'){polys=[cnDot(0.1*d,0.375*H,d)].concat(cnComma(0.1*d,0,d));w=1.2*d;}
  else if(ch==='!'){polys=[rr(0,Math.max(0.26*H,d+Math.max(0.35*S,26)),d,H),cnDot(0,0,d)];w=d;}
  else if(ch==='?'){w=Math.max(0.27*H,2*S+0.6*c.cmin);const hk=0.20*H;polys=[rr(0,H-Tt,w,H),rr(w-S,0.50*H,w,H-Tt/2),rr(w/2-S/2,0.50*H,w,0.50*H+T),rr(w/2-S/2,Math.max(0.26*H,d+Math.max(0.35*S,26)),w/2+S/2,0.50*H+T/2),cnDot(w/2-d/2,0,d),rr(0,H-hk,S,H)];rc=[[w,H],[w-S,H-Tt],[w,0.50*H+T]];}
  else if(ch==='«'||ch==='»'){const hh=0.15*H,yc=0.40*H,dx=0.115*H,t=0.78*S;
    const chev=(x0,flip)=>{let vs=[[0,yc],[dx,yc+hh],[dx+t,yc+hh],[t,yc],[dx+t,yc-hh],[dx,yc-hh]];if(flip)vs=vs.map(v=>[dx+t-v[0],v[1]]);return cnSolid(vs.map(v=>[v[0]+x0,v[1]]));};
    const step=0.5*dx+1.1*t;w=dx+t+step;polys=[chev(0,ch==='»'),chev(step,ch==='»')];}
  else if('„“”‘’'.includes(ch)){const yh=(ch==='„')?0:H-d*0.98,gp=0.5*d,n='„“”'.includes(ch)?2:1;
    for(let k=0;k<n;k++){let q=cnComma(0,yh,d);q=cnShift(q,k*(d+gp)+0.12*d,0);
      if(ch==='“'||ch==='‘'){const cy=yh+d/2,cx=0.12*d+k*(d+gp)+d/2;q=q.map(z=>({p:z.p.map(v=>[2*cx-v[0],2*cy-v[1]]),h:z.h}));}
      polys=polys.concat(q);}
    w=n*d+(n-1)*gp+0.24*d;}
  else if(ch==='"'){const b=0.9*S;polys=[rr(0,0.60*H,b,H),rr(b*1.6,0.60*H,2.6*b,H)];w=2.6*b;}
  else if(ch==="'"){const b=0.9*S;polys=[rr(0,0.60*H,b,H)];w=b;}
  else if(ch==='-'){w=0.30*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='‒'){w=Math.max(0.27*H,2*S+c.cmin);polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='–'){w=0.46*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='—'){w=0.80*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='−'){w=0.36*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='('||ch===')'){w=0.28*H;const wh=0.88*S;
    polys=[rr(0,0.10*H,wh,0.90*H),cnPara([wh/2,0.86*H],[w-wh/2,1.02*H],wh),cnPara([wh/2,0.14*H],[w-wh/2,-0.02*H],wh)];if(ch===')')polys=cnMirror(polys,w);}
  else if(ch==='/'){w=0.40*H;const wh=0.85*S;polys=[cnPara([wh/2,-0.04*H],[w-wh/2,1.0*H],wh)];}
  else if(ch==='\\'){w=0.40*H;const wh=0.85*S;polys=[cnPara([wh/2,1.0*H],[w-wh/2,-0.04*H],wh)];}
  else if(ch==='|'){w=0.85*S;polys=[rr(0,-0.12*H,w,1.0*H)];}
  else if(ch==='&'){w=Math.max(0.46*H,(2*S+c.cmin+14)/0.84);const wh=0.95*S;const up=cnRing(w*0.04,0.50*H,w*0.88,H,c),lo=cnRing(0,0,w*0.98,0.56*H,c);
    polys=cat(up,lo,[cnPara([w*0.52,0.58*H],[w-wh/2+0.2*S,0],wh)]);rc=polys.rc;}
  else if(ch==='№'){const n=cnBuild('N',c,H),o=cnBuild('o',cnSub(c,0.62),0.56*H*0.82),gp=Math.max(0.30*S,18);w=n.w+gp+o.w;
    polys=cat(n.polys,cnMov(o.polys,n.w+gp,H-0.56*H*0.82),[rr(n.w+gp,H-0.56*H*0.82-0.9*T*0.62,w,H-0.56*H*0.82-0.9*T*0.62+0.55*T*0.62)]);rc=polys.rc;}
  else if(ch==='…'){const gp=0.55*d;w=3*d+2*gp;polys=[0,1,2].map(k=>cnDot(k*(d+gp),0,d));}
  else if(ch==='@'){let inn;const ss=sm.S,tt=sm.T,iw=2*ss+0.9*c.cmin+ss,ih=0.36*H;inn=cat(cnRing(0,0,iw-ss,ih,sm),[rr(iw-ss,0,iw,ih*0.75)]); const gp=Math.max(0.5*c.cmin,16);w=iw+2*(c.S+gp);const h=0.80*H,S2=c.S,T2=c.T,hi=ih;
    const box=[rr(0,0,S2,h),rr(w-S2,0,w,h),rr(S2-1,0,w-S2+1,T2),rr(S2-1,h-T2,w-S2+1,h)];
    polys=cat(box,cnMov(inn,S2+gp,h*0.5-hi*0.5));rc=[[0,0],[w,0],[0,h],[w,h]];}
  else if(ch==='#'){w=Math.max(0.46*H,3.1*S+30);const b=0.78*T,vs=0.82*S;polys=[rr(w*0.16,0,w*0.16+vs,H),rr(w*0.84-vs,0,w*0.84,H),rr(0,H*0.30,w,H*0.30+b),rr(0,H*0.60,w,H*0.60+b)];}
  else if(ch==='%'){const s=Math.max(0.27*H,2*sm.Tr+1.2*c.cmin+36),rw=Math.max(0.9*s,2*sm.S+1.2*c.cmin+24),wh=0.62*S;w=Math.max(0.60*H,1.75*rw,wh+(rw+25)*H/(H-s));polys=cat(cnRing(0,H-s,rw,H,sm),cnRing(w-rw,0,w,s,sm),[cnPara([wh/2,0],[w-wh/2,H],wh)]);rc=polys.rc;}
  else if(ch==='*'){w=0.34*H;const b=0.54*S,cx=w/2,cy=0.78*H,L=0.15*H;
    polys=[rr(cx-b/2,cy-L,cx+b/2,cy+L),cnPara([cx-L*.85,cy-L*.85],[cx+L*.85,cy+L*.85],b),cnPara([cx+L*.85,cy-L*.85],[cx-L*.85,cy+L*.85],b),rr(cx-L,cy-b/2,cx+L,cy+b/2)];}
  else if(ch==='·'){polys=[cnDot(0,0.5*c.lcr*H-d/2,d)];w=d;}
  else if(ch==='•'){const D=1.55*d;polys=cat(cnRing(0,ym-D/2,D,ym+D/2,{S:0,Tr:0,cmin:0}));polys=[cnDot(0,ym-D/2,D)];w=D;}
  else if(ch==='°'){const s=Math.max(0.24*H,2*sm.Tr+60);w=Math.max(s*0.8,2*sm.S+60);polys=cnRing(0,H-s,w,H,sm);rc=polys.rc;}
  else if(ch==='+'){w=0.36*H;const b=0.82*S;polys=[rr(w/2-b/2,ym-w/2+0.03*H,w/2+b/2,ym+w/2-0.03*H),rr(0.02*H,ym-T*.5,w-0.02*H,ym+T*.5)];}
  else if(ch==='='){w=0.36*H;const g=0.14*H;polys=[rr(0,ym-g-T*.5,w,ym-g+T*.5),rr(0,ym+g-T*.5,w,ym+g+T*.5)];}
  else if(ch==='₽'){const P=cnBuild('Р',c,H);w=P.w+0.3*S;polys=cat(P.polys,[rr(-0.30*S,0.27*H,P.w-0.1*S,0.27*H+0.8*T)]);rc=polys.rc;}
  else if(ch==='©'){let inn;const ss=sm.S,tt=sm.T,iw=2*ss+0.9*c.cmin,ih=0.36*H;inn=[rr(0,0,ss,ih),rr(ss-1,0,iw,tt),rr(ss-1,ih-tt,iw,ih)]; const gp=Math.max(0.5*c.cmin,16);w=iw+2*(c.S+gp);const h=0.80*H,S2=c.S,T2=c.T,hi=ih;
    const box=[rr(0,0,S2,h),rr(w-S2,0,w,h),rr(S2-1,0,w-S2+1,T2),rr(S2-1,h-T2,w-S2+1,h)];
    polys=cat(box,cnMov(inn,S2+gp,h*0.5-hi*0.5));rc=[[0,0],[w,0],[0,h],[w,h]];}
  else return null;
  polys=Object.assign(polys.slice?polys.slice():polys,{rc:rc||[]});
  return {polys,w,rc:rc||[]};}
const CN_SHARED={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y'};
/* строчная у: вариант B для всех (правая стойка ниже базовой, крюк влево) */
const CN_UVL=(typeof process!=='undefined'&&process.env&&process.env.COND_UVL)||'B';
cnReg('y',.30,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,dd=c.dd,yq=0.42*H,hk=Math.max(Tt+0.2*S,0.65*dd);
  if(CN_UVL==='A'){const hA=0.22*H;const P=[rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T),rr(0,0,w,Tt),rr(0,0,S,hA)];
    P.rc=[[0,yq],[0,0],[w,0],[S,yq+T],[S,Tt],[w-S,Tt]];return P;}
  const P=[rr(0,yq,S,H),rr(w-S,-dd,w,H),rr(0,yq,w-S+1,yq+T),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)];
  P.rc=[[0,yq],[0,-dd],[w,-dd],[S,yq+T],[S,-dd+Tt],[w-S,-dd+Tt]];return P;},{eq:1});
/* ---------- «Сцепка»: оптический спейсинг по балансу белой площади (одно правило для всех знаков) ----------
   1. поле:  sb = max(SMIN, A − ALPHA·среднее по полосе(min(глубина(y), CAP)))      (глубина = от габарита до чернил в строке)
   2. кернинг пары k(a,b) = ЦЕЛЬ − площадь(a,b), но зазор в самых близких рядах не меньше CLR   (ЦЕЛЬ = площадь пары Н–Н)
   Все слагаемые масштабируются зазором g: плоский зазор «стойка|стойка» равен g (поле g/2 с каждой стороны). */
const CN_ALPHA=0.5,CN_WIN=8,CN_CLRF=1.0;
const CN_YS=[];for(let y=-300;y<1100;y+=4)CN_YS.push(y);
function cnSpCfg(g){const A=g/2,k=A/26;return {g,A,CAP:90*k,SMIN:-30*k,CLR:CN_CLRF*g};}
/* контуры -> многоугольники для измерений ({p,h}) */
const cnPolysOf=cs=>cs.map(c=>({p:c.poly,h:c.hole}));
/* Крайние чернила по строкам — как у эталона: растр 0.5 пикс/ед. (PIL polygon при 2-кратной выборке и BILINEAR-уменьшении, порог >127), т.е. край
   квантуется сеткой 2 ед.; точный край давал бы другие значения кернинга на ±1. Координаты эталона сдвинуты на 0.25 от решётки JS. */
const CN_PH=0.25;
const cnRound=v=>{const f=Math.floor(v),d=v-f;return d<0.5?f:d>0.5?f+1:(f%2===0?f:f+1);};
function cnEdgeRows(polys,x0,y0,x1,y1){
  const ox=Math.floor(x0+CN_PH)-8,oy=Math.floor(y0+CN_PH)-8,W=Math.floor((x1+CN_PH-ox+8)*0.5)+2,H=Math.floor((y1+CN_PH-oy+8)*0.5)+2,n=CN_YS.length;
  const dl=new Float64Array(n).fill(NaN),dr=new Float64Array(n).fill(NaN),SW=2*W,SH=2*H;
  const row=new Map();   /* src-строка -> Uint8Array покрытия (closed-pixel cover вдоль линии r+0.5) */
  const getRow=r=>{if(r<0||r>=SH)return null;let a=row.get(r);if(a)return a;a=new Uint8Array(SW);
    const yc=oy+SH-r-0.5-CN_PH;for(const iv of cnRowInt(polys,yc)){const c0=Math.max(0,Math.floor(iv[0]+CN_PH-ox)),c1=Math.min(SW-1,Math.floor(iv[1]+CN_PH-ox));for(let c=c0;c<=c1;c++)a[c]=1;}
    row.set(r,a);return a;};
  const WT=[0.125,0.375,0.375,0.125],cov=new Float64Array(W);
  for(let k=0;k<n;k++){const y=CN_YS[k],j=cnRound(H-1-(y-oy)*0.5);if(j<0||j>=H)continue;
    cov.fill(0);let any=false;
    for(let a=0;a<4;a++){const A=getRow(2*j-1+a);if(!A)continue;const wy=WT[a];
      for(let i=0;i<W;i++){let sx=0;for(let b=0;b<4;b++){const c=2*i-1+b;if(c>=0&&c<SW&&A[c])sx+=WT[b];}if(sx)cov[i]+=wy*sx;}}
    let first=-1,last=-1;for(let i=0;i<W;i++)if(cov[i]*255>127){if(first<0)first=i;last=i;}
    if(first>=0){dl[k]=ox+first*2-(x0+CN_PH);dr[k]=(x1+CN_PH)-(ox+(last+1)*2);}}
  return {dl,dr};}
function cnGS(polys,cfg){
  if(!polys.length)return {empty:true,sbl:0,sbr:0};
  const b=cnBBox(polys),x0=b[0],y0=b[1],x1=b[2],y1=b[3],n=CN_YS.length;
  const {dl,dr}=cnEdgeRows(polys,x0,y0,x1,y1);
  const lo=Math.max(y0+CN_PH,0),hi=y1+CN_PH,lo2=lo+0.06*(hi-lo),hi2=hi-0.06*(hi-lo),band=new Uint8Array(n);
  const ml_=new Float64Array(n),mr_=new Float64Array(n);let sl=0,sr=0,nb=0;
  for(let k=0;k<n;k++){band[k]=(CN_YS[k]>=lo2&&CN_YS[k]<=hi2)?1:0;
    ml_[k]=isNaN(dl[k])?cfg.CAP:Math.min(dl[k],cfg.CAP);mr_[k]=isNaN(dr[k])?cfg.CAP:Math.min(dr[k],cfg.CAP);
    if(band[k]){sl+=ml_[k];sr+=mr_[k];nb++;}}
  const ml=nb?sl/nb:cfg.CAP,mr=nb?sr/nb:cfg.CAP;
  return {empty:false,bbox:b,dl,dr,band,maskL:ml_,maskR:mr_,ml,mr,sbl:Math.max(cfg.SMIN,cfg.A-CN_ALPHA*ml),sbr:Math.max(cfg.SMIN,cfg.A-CN_ALPHA*mr)};}
/* пара a b без кернинга -> {area, clr} */
function cnPair(a,b){
  if(a.empty||b.empty)return null;
  const n=CN_YS.length;let any=false;
  for(let k=0;k<n;k++)if(a.band[k]&&b.band[k]){any=true;break;}
  let s=0,cnt=0;
  for(let k=0;k<n;k++){const inb=any?(a.band[k]&&b.band[k]):(a.band[k]||b.band[k]);if(!inb)continue;
    s+=a.sbr+b.sbl+CN_ALPHA*(a.maskR[k]+b.maskL[k]);cnt++;}
  const area=cnt?s/cnt:0;
  let clr=1e9;const row=new Float64Array(n);let have=false,mn=1e9;
  for(let k=0;k<n;k++){if(!isNaN(a.dr[k])&&!isNaN(b.dl[k])){row[k]=a.sbr+b.sbl+a.dr[k]+b.dl[k];have=true;if(row[k]<mn)mn=row[k];}else row[k]=NaN;}
  if(have){
    for(let i=0;i+CN_WIN<=n;i++){let s2=0,ok=true;for(let j=0;j<CN_WIN;j++){const v=row[i+j];if(isNaN(v)){ok=false;break;}s2+=v;}if(ok){const m=s2/CN_WIN;if(m<clr)clr=m;}}
    if(clr>=1e8)clr=mn;}
  return {area,clr};}
function cnKernFor(a,b,target,cfg,kmin,kmax){kmin=kmin==null?-90:kmin;kmax=kmax==null?140:kmax;
  const p=cnPair(a,b);if(!p)return 0;let k=target-p.area;if(p.clr<1e8)k=Math.max(k,cfg.CLR-p.clr);
  k=Math.max(kmin,Math.min(kmax,k));return Math.round(k);}
/* ---------- «Столб» (stolb): параметры, кэш, метрики, кернинг, регистрация в продукте (по образцу stsepka/tail.js) ----------
   Ключи ползунков с префиксом u: urnd (радиус скруглений, %), uctr (контраст, %), uap (апертура, %), ucut (срез концов, %), ugap (разрядка: зазор стойка|стойка).
   Насыщенность = host stem (S), ширина = host wdth, высота строчных = host xh (lcr = xh/700). Поля зашиты в контур (opt.fixed, sb = 0). */
const CN_DEF={S:88,wd:1,rnd:0.72,ctr:0.35,ap:1,ct:0,gap:30,lcr:0.75};
const CN_LIM={S:[60,176,1],wd:[0.80,1.30,0.01],rnd:[0,1,0.01],ctr:[0,1,0.01],ap:[0.6,1.4,0.01],ct:[0,1,0.01],gap:[14,70,1],lcr:[0.66,0.82,0.001]};
function cnSafe(p){const q=Object.assign({},CN_DEF,p||{});for(const k in CN_LIM){const [a,b]=CN_LIM[k];let v=+q[k];if(!isFinite(v))v=CN_DEF[k];q[k]=cnCL(v,a,b);}q.S=Math.round(q.S);q.gap=Math.round(q.gap);return q;}
const CN_KEY=q=>[q.S,q.wd,q.rnd,q.ctr,q.ap,q.ct,q.gap,q.lcr].join('|');
const CN_WEIGHTS={Light:62,Regular:88,Bold:124,Black:158};
const cnShiftCS=(cs,dx,dy)=>cs.map(k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:{x:n.a.x+dx,y:n.a.y+dy},b:{x:n.b.x+dx,y:n.b.y+dy}})),poly:k.poly.map(v=>[v[0]+dx,v[1]+dy])}));
function cnFinishGlyph(cs,wRaw,cfg){
  if(!cs.length)return {cs:[],adv:wRaw,gs:{empty:true,sbl:0,sbr:0},dx:0,x0:0,x1:0};
  const polys=cnPolysOf(cs),gs=cnGS(polys,cfg),b=cnBBox(polys);const dx=gs.sbl-b[0];
  return {cs:cnShiftCS(cs,dx,0),adv:(b[2]-b[0])+gs.sbl+gs.sbr,gs,dx,x0:b[0],x1:b[2]};}
const cnData_cache=new Map();
function cnData(pIn){const q=cnSafe(pIn),key=CN_KEY(q);let D=cnData_cache.get(key);if(D)return D;
  const c=cnCtx({S:q.S,wd:q.wd,rnd:q.rnd,ctr:q.ctr,ap:q.ap,ct:q.ct,gap:q.gap,lcr:q.lcr}),cfg=cnSpCfg(q.gap);
  D={q,c,cfg,key,gl:new Map(),T0:null,kc:new Map()};
  D.glyph=ch=>{let g=D.gl.get(ch);if(g!==undefined)return g;
    const P=cnGlyphPiece(ch,c);if(!P||P.space){D.gl.set(ch,null);return null;}
    g=cnFinishGlyph(P.cs,P.w,cfg);g.raw=P.raw;g.ch=ch;D.gl.set(ch,g);return g;};
  D.kernTarget=()=>{if(D.T0==null){const h=D.glyph('n');D.T0=cnPair(h.gs,h.gs).area;}return D.T0;};
  D.kern=(a,b)=>{const id=a+'\u0001'+b;let k=D.kc.get(id);if(k!==undefined)return k;
    const ga=D.glyph(a),gb=D.glyph(b);k=0;
    if(ga&&gb&&!ga.gs.empty&&!gb.gs.empty&&cnIsAlnum(a)&&cnIsAlnum(b)){k=cnKernFor(ga.gs,gb.gs,D.kernTarget(),cfg,-70*q.gap/30,110*q.gap/30);if(Math.abs(k)<3)k=0;}
    D.kc.set(id,k);return k;};
  if(cnData_cache.size>12)cnData_cache.clear();
  cnData_cache.set(key,D);return D;}
const cnIsAlnum=ch=>/[\p{L}\p{N}]/u.test(ch);
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const CN_KEYS=['urnd','uctr','uap','ucut','ugap'];
const CN_ROWS=[['urnd','Радиус скруглений, %',0,100,1,'Форма'],['uctr','Контраст, %',0,100,1,'Штрихи'],['uap','Апертура, %',60,140,1,'Конструкция'],['ucut','Срез концов, %',0,100,1,'Конструкция'],['ugap','Разрядка',14,70,1,'Наклон и ритм']];
if(!PARAMS.some(r=>r[0]==='urnd')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...CN_ROWS);}
const cnNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const cnEng=p=>({S:cnNum(p.stem,88),wd:cnNum(p.wdth,100)/100,rnd:cnNum(p.urnd,72)/100,ctr:cnNum(p.uctr,35)/100,ap:cnNum(p.uap,100)/100,ct:cnNum(p.ucut,0)/100,gap:cnNum(p.ugap,30),lcr:Math.round(cnNum(p.xh,525)/700*1e4)/1e4});
const cnD=p=>cnData(cnEng(p));
const CN_ALL=[...CN_LAT_U,...CN_LAT_L,...CN_CYR_U,...CN_CYR_L,...'Ёё',...CN_DIG];
const CN_SYM='.,:;!?«»„“”‘’"\'-–—‒−()/&№…@#%*·•°+=\\|₽©';
const CN_LAT=CN_LAT_U,CN_LATL=CN_LAT_L,CN_CY=CN_CYR_U.slice(0,5)+'Ё'+CN_CYR_U.slice(5),CN_CYL=CN_CYR_L.slice(0,5)+'ё'+CN_CYR_L.slice(5);
const cnCont=cs=>cs.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));
const CN_SHAREDU={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х'};
const F={id:'stolb',name:'Столб',family:'Stolb Display',tag:'Сжатый гротеск · плакат',S0:88,GL:{},charset:'basic',
  desc:'Высокий узкий гротеск для логотипов и заголовков: плотные прямые стойки, овалы как вытянутые прямоугольники с малым радиусом, горизонтальные концевые элементы, малая апертура и ровная тесная разрядка. Строчные с крупным очком, жирное начертание по умолчанию.',
  sample:'Столб · Stolb',sampleText:'ЗАГОЛОВОК'};
const cnIsLow=ch=>/\p{Ll}/u.test(ch);
function cnEntry(ch){
  return {shape:g=>{const x=cnD(g.p).glyph(ch);return x?cnCont(x.cs):[];},w:p=>{const x=cnD(p).glyph(ch);return x?x.adv:0;},k:cnIsLow(ch)?'xh':'cap',opt:{fixed:true}};}
const CN_CHARS=[...CN_LAT_U,...CN_LAT_L,...CN_CYR_U,...CN_CYR_L,...'Ёё',...CN_DIG,...CN_SYM];
const CN_SHL={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y'};
for(const ch of CN_CHARS){if(F.GL[ch])continue;
  const cyr=CN_SHAREDU[ch],lat=CN_SHL[ch];
  if(cyr){F.GL[cyr]=F.GL[cyr]||cnEntry(cyr);F.GL[ch]=F.GL[cyr];}
  else if(lat){F.GL[lat]=F.GL[lat]||cnEntry(lat);F.GL[ch]=F.GL[lat];}
  else F.GL[ch]=cnEntry(ch);}
for(const c of [' ',' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:(c===' '||c===' ')?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',CN_LAT],['Латиница · строчные',CN_LATL],['Кириллица · прописные',CN_CY],['Кириллица · строчные',CN_CYL],['Цифры',CN_DIG],['Знаки',CN_SYM]];
F.CHARSET=CN_CHARS.concat([' ',' ',' ',' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const x=cnD(p).glyph(ch);return x||null;};
const K0={wdth:100,capH:700,xh:525,asc:CN_ASC,desc:CN_DD,stem:88,hair:88,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:230,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,urnd:72,uctr:35,uap:100,ucut:0,ugap:30};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10,icomp:40,wdth:98}};
const HID=['capH','hair','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','sb'];
F.params={stem:['Насыщенность',60,176,1],wdth:['Ширина, %',80,130,1],xh:['Высота строчных',462,574,1]};
for(const k of HID)F.params[k]=null;
const CNP={
  poster:{stem:88,wdth:100,xh:525,urnd:72,uctr:35,uap:100,ucut:0,ugap:30},
  tight:{stem:94,wdth:86,xh:540,urnd:60,uctr:25,uap:80,ucut:0,ugap:24},
  soft:{stem:82,wdth:108,xh:510,urnd:100,uctr:40,uap:115,ucut:0,ugap:34},
  strict:{stem:90,wdth:96,xh:530,urnd:10,uctr:45,uap:100,ucut:60,ugap:30},
  afisha:{stem:124,wdth:92,xh:540,urnd:40,uctr:20,uap:90,ucut:0,ugap:22},
  journal:{stem:70,wdth:112,xh:550,urnd:72,uctr:45,uap:110,ucut:0,ugap:36}};
F.methods=[
  ['Характер','Готовые системы: плакатная по умолчанию, плотная, мягкая, строгая, афишная и журнальная.',[['Плакат',CNP.poster],['Плотный',CNP.tight],['Мягкий',CNP.soft],['Строгий',CNP.strict],['Афиша',CNP.afisha],['Журнал',CNP.journal]]],
  ['Вес','Толщина штриха: от светлого до сверхжирного.',[['Светлый',{stem:62}],['Обычный',{stem:88}],['Жирный',{stem:124}],['Чёрный',{stem:158}]]],
  ['Скругление','Радиус круглых углов овалов; прямые углы остаются острыми.',[['Острое',{urnd:0}],['Обычное',{urnd:72}],['Мягкое',{urnd:90}],['Круглое',{urnd:100}]]],
  ['Срез концов','Горизонтальный или слегка косой срез концевых элементов.',[['Прямой',{ucut:0}],['Лёгкий',{ucut:40}],['Косой',{ucut:100}]]],
  ['Строчные','Высота строчных.',[['Низкие',{xh:470}],['Обычные',{xh:525}],['Высокие',{xh:570}]]]];
F.coverNarrow=true;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=60;
const CN_ALLCH=CN_ALL.join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:CN_ALLCH,desc:CN_ALLCH,descX:0,holeK:0.004};
function cnLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',60,176,88);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  cl('wdth',80,130,100);cl('xh',462,574,525);q.xh=Math.round(q.xh);
  cl('urnd',0,100,72);cl('uctr',0,100,35);cl('uap',60,140,100);cl('ucut',0,100,0);cl('ugap',14,70,30);q.ugap=Math.round(q.ugap);
  cl('capH',700,700,700);cl('asc',CN_ASC,CN_ASC,CN_ASC);cl('desc',CN_DD,CN_DD,CN_DD);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,100,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',-60,100,0);cl('space',150,360,230);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='stolb')return _pl(p,font);return cnLim(p);};
WSCALE.stolb=0.5587;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='stolb'){const t=CN_WEIGHTS[wn];if(t){const k=Math.max(0.8,Math.min(1.2,p.stem/88));o.stem=Math.round(Math.min(176,Math.max(60,t*k)));o.hair=o.stem;o.wdth=p.wdth;}return paramLimits(o,'cond').q;}
  return o;};
KERN_TABLE.stolb=[];
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='stolb')return _ckt(st,prof,isLow,fontId);
  const D=cnD(st.p),mem=CN_ALL.filter(ch=>prof(ch));
  const out={L:mem.map(ch=>[ch,[ch]]),R:mem.map(ch=>[ch,[ch]]),vals:null,tU:D.cfg.g,tL:D.cfg.g,pairs:{}};
  const kc=st.kc||{};
  out.vals=new Proxy({},{get:(t,key)=>{if(typeof key!=='string')return undefined;if(kc[key]!=null)return Math.max(-KERN_MAX,Math.min(KERN_MAX,Math.round(+kc[key])||0));
      const i=key.indexOf('|');return i<0?undefined:D.kern(key.slice(0,i),key.slice(i+1));},
    has:()=>true,ownKeys:()=>['*'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true,value:0})});
  return out;};
const CNS={D:cnD,eng:cnEng,LIM:CN_LIM,CTX:cnCtx,ALL:CN_ALL};
FONTS.stolb=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!CN_KEYS.includes(r[0])&&!['track','space','slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='stolb'){const f=FONTS[id];f.params=f.params||{};for(const k of CN_KEYS)if(!(k in f.params))f.params[k]=null;}
if(typeof globalThis!=='undefined')globalThis.CNS=CNS;
}
})();
