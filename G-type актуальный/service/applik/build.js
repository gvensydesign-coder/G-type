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
