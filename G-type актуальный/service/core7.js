/* ===== «Кодекс» v2: унциал на чистой геометрии (дуги, прямые штрихи, мало точек) ===== */
function arcN(cx,cy,rx,ry,a0,a1){
  const span=a1-a0,n=Math.max(1,Math.ceil(Math.abs(span)/90-1e-9)),da=span/n*D2R,k=4/3*Math.tan(da/4),nodes=[];
  for(let i=0;i<=n;i++){
    const a=a0*D2R+da*i,px=cx+rx*Math.cos(a),py=cy+ry*Math.sin(a),tx=-rx*Math.sin(a),ty=ry*Math.cos(a);
    nodes.push({x:px,y:py,a:i>0?{x:px-k*tx,y:py-k*ty}:null,b:i<n?{x:px+k*tx,y:py+k*ty}:null});
  }
  return nodes;
}
function ellN(cx,cy,rx,ry){const n=arcN(cx,cy,rx,ry,0,360),f=n[0],l=n.pop();f.a=l.a;return n;}
function mkU(g,U,ch){
  const p=g.p,S=g.S,H=Math.max(p.hair,14),so=soOf(p),cp=ch.codePointAt(0);
  const K={g,p,w:g.w,h:g.h,asc:g.asc,desc:g.desc,U,S,H,so,L:so,R:g.w-so,v:0,cp,ov:g.ov,nib:p.diag,fl:(p.spur||0)/130,hairW:H,stemW:S};
  K.cx=g.w/2;K.bw=K.R-K.L;K.sx=(S<=CX_S0?S:CX_S0+(S-CX_S0)*0.88)*1.03;K.sy=Math.max(H*1.3,26);K.tc=Math.max(H*1.2,26);K.top=U?g.h:g.asc;
  const tH=Math.max(H*1.15,30),bk=Math.min(tH*0.9,so*0.8);
  K.pg=pts=>PG(g,pts);K.rc=(x0,y0,x1,y1)=>R(g,x0,y0,x1,y1);
  K.ell=(cx,cy,rx,ry)=>mkc(ellN(cx,cy,rx,ry),false);
  K.ball=(x,y,r)=>K.ell(x,y,r||K.tc*1.3,r||K.tc*1.3);
  K.syR=K.sy*1.04;/* круглая горизонталь чуть толще прямой (§2) */
  K.ring=(cx,cy,rx,ry,sx,sy)=>[K.ell(cx,cy,rx,ry),mkc(ellN(cx,cy,Math.max(3,rx-(sx||K.sx)),Math.max(3,ry-(sy||K.syR))),true)];
  K.band=(cx,cy,rx,ry,a0,a1,sx,sy)=>{sx=sx||K.sx;sy=sy||K.syR;
    return mkc(arcN(cx,cy,rx,ry,a0,a1).concat(arcN(cx,cy,Math.max(3,rx-sx),Math.max(3,ry-sy),a1,a0)),false);};
  /* точка центральной линии полосы под углом a */
  K.bpt=(cx,cy,rx,ry,a,sx,sy)=>{const r=a*D2R;return [cx+(rx-(sx||K.sx)/2)*Math.cos(r),cy+(ry-(sy||K.syR)/2)*Math.sin(r)];};
  K.bar=(x0,y0,x1,y1,tt)=>{
    const th=Math.atan2(y1-y0,x1-x0),t=tt||penWidth(K,th),dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy)||1,sn=Math.abs(dy)/L;
    if(sn>0.55){const tw=t/sn;return K.pg([[x0-tw/2,y0],[x0+tw/2,y0],[x1+tw/2,y1],[x1-tw/2,y1]]);}
    const nx=-dy/L*t/2,ny=dx/L*t/2;return K.pg([[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]]);};
  K.hb=(x0,x1,yTop)=>K.rc(x0,yTop-K.sy,x1,yTop);
  K.hbb=(x0,x1,yBot)=>K.rc(x0,yBot,x1,yBot+K.sy);
  K.top_=(x,y,st)=>{if(K.so<3||!st||st==='n')return [];if(st==='a')st=['f','s','f'][K.v];const hw=S/2+K.so;
    if(st==='f')return [K.pg([[x-hw,y],[x+S/2,y],[x+S/2,y-tH],[x-S/2,y-tH*2.6]])];
    return [K.pg([[x-hw,y],[x+hw,y],[x+hw,y-tH],[x+S/2+bk,y-tH],[x+S/2,y-tH-bk],[x-S/2,y-tH-bk],[x-S/2-bk,y-tH],[x-hw,y-tH]])];};
  K.bot_=(x,y,st)=>{if(K.so<3||!st||st==='n')return [];if(st==='a')st=['s','s','f'][K.v];const hw=S/2+K.so;
    if(st==='f')return [K.pg([[x+hw,y],[x-S/2,y],[x-S/2,y+tH],[x+S/2,y+tH*2.6]])];
    return [K.pg([[x-hw,y],[x+hw,y],[x+hw,y+tH],[x+S/2+bk,y+tH],[x+S/2,y+tH+bk],[x-S/2,y+tH+bk],[x-S/2-bk,y+tH],[x-hw,y+tH]])];};
  K.stem=(x,y0,y1,top,bot)=>[K.rc(x-S/2,y0,x+S/2,y1),...K.top_(x,y1,top),...K.bot_(x,y0,bot)];
  /* стопа: четверть дуги вправо от нижнего конца штриха */
  K.foot=(x,rf)=>[K.band(x-S/2+rf,rf,rf,rf,180,270,S,K.sy)];
  K.dot=(x,y,r)=>{r=r||S*0.5;return K.pg([[x-r,y],[x,y+r],[x+r,y],[x,y-r]]);};
  /* вензель над вершиной штриха (только прописные) */
  K.deco=(x,y,dir,kind)=>{
    if(!U||K.fl<0.08)return [];
    const f=K.fl,tc=K.tc,rb=tc*1.25,k=kind==null?K.v:kind;
    if(k===1){const dh=Math.min(S*0.5,rb*1.7)*Math.min(1.3,0.6+f*0.4),hh=dh*2.6;return [K.pg([[x-dh,y-2],[x+dh,y-2],[x,y+hh]])];}
    const r=(k===2?84:62)*f,nk=Math.max(24,30*f,(r>rb*0.5?rb+0.14*(r+tc/2)+K.ov+Math.max(18,tc*0.4):0)),cy=y+nk /* QA3: капля не ложится на штрих (иначе петля) */,cxx=x+dir*r,out=[K.rc(x-tc/2,y-4,x+tc/2,cy)];
    if(dir>0){out.push(K.band(cxx,cy,r+tc/2,r+tc/2,180,-8,tc,tc));const e=K.bpt(cxx,cy,r+tc/2,r+tc/2,-8,tc,tc);out.push(K.ball(e[0],e[1],rb));}
    else{out.push(K.band(cxx,cy,r+tc/2,r+tc/2,0,188,tc,tc));const e=K.bpt(cxx,cy,r+tc/2,r+tc/2,188,tc,tc);out.push(K.ball(e[0],e[1],rb));}
    return out;
  };
  return K;
}
const UX={};
const tkH=(K,b)=>Math.max(K.S*0.6,b*1.75);
/* ---------- строчные латинские ---------- */
UX.o=K=>K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov);
UX.c=K=>{const {cx,h,ov,S}=K,o=[K.band(cx,h/2,K.bw/2,h/2+ov,38,322)];
  if(K.v===1){const e=K.bpt(cx,h/2,K.bw/2,h/2+ov,38);o.push(K.ball(e[0],e[1],S*0.34));}return o;};
UX.e=K=>{const {cx,h,ov,L,R,sy}=K;return [K.band(cx,h/2,K.bw/2,h/2+ov,0,326),K.rc(L+K.sx*0.5,h/2-sy*0.45,R-K.sx*0.15,h/2+sy*0.45)];};
UX.a=K=>{const {L,R,h,S,ov}=K;
  /* однoярусная a = овал «о» + правый ствол поверх правой стенки (как d без восходящего): без щелей на стыке */
  return [...K.ring(K.cx,h/2,K.bw/2,h/2+ov),...K.stem(R-S/2,0,h,'a','s')];};
UX.b=K=>[...K.stem(K.L+K.S/2,0,K.top,'a','s'),...K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov)];
UX.d=K=>[...K.stem(K.R-K.S/2,0,K.top,'a','s'),...K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov)];
UX.p=K=>[...K.stem(K.L+K.S/2,-K.desc,K.h,'a','s'),...K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov)];
UX.q=K=>[...K.stem(K.R-K.S/2,-K.desc,K.h,'f','s'),...K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov)];
UX.g=K=>{const {L,R,h,S,cx}=K,dd=K.desc*0.52,rx=K.bw*0.5,ry=K.desc*0.46,o=[K.rc(R-S,-dd,R,h-S*0.2),K.band(R-rx,-dd,rx,ry,0,-152),...K.ring(cx,h/2,K.bw/2,h/2+K.ov)];
  if(K.v===1){const e=K.bpt(R-rx,-dd,rx,ry,-152);o.push(K.ball(e[0],e[1],S*0.34));}return o;};
const archL=(K,x0,x1,ym)=>K.band((x0+x1)/2,ym,(x1-x0)/2,K.h-ym+K.ov,0,180);
UX.h=K=>{const {L,R,S,h}=K,ym=h*0.52;return [...K.stem(L+S/2,0,K.top,'a','s'),archL(K,L,R,ym),...K.stem(R-S/2,0,ym,null,'s')];};
UX.n=K=>{const {L,R,S,h}=K,ym=h*0.52;return [...K.stem(L+S/2,0,h,'a','s'),archL(K,L,R,ym),...K.stem(R-S/2,0,ym,null,'s')];};
UX.m=K=>{const {L,R,S,h,cx}=K,ym=h*0.52,xM=cx;
  return [...K.stem(L+S/2,0,h,'a','s'),archL(K,L,xM+S/2,ym),...K.stem(xM,0,ym,null,'s'),archL(K,xM-S/2,R,ym),...K.stem(R-S/2,0,ym,null,'s')];};
UX.r=K=>{const {L,R,S,h}=K,ym=h*0.52,rx=(R-L)*0.62,o=[...K.stem(L+S/2,0,h,'a','s'),K.band(L+rx,ym,rx,h-ym+K.ov,52,180)];
  const e=K.bpt(L+rx,ym,rx,h-ym+K.ov,52);o.push(K.ball(e[0],e[1],S*0.36));return o;};
UX.u=K=>{const {L,R,S,h,cx}=K,ym=h*0.5;return [...K.stem(L+S/2,ym,h,'a',null),K.band(cx,ym,K.bw/2,ym+K.ov,180,360),...K.stem(R-S/2,0,h,'a','s')];};
UX.i=K=>[...K.stem(K.cx,0,K.h,'a','s'),K.dot(K.cx,K.h+K.S*1.0)];
UX.j=K=>{const {L,R,S,h}=K,dd=K.desc*0.5,x=R-S/2,rx=K.bw*0.78,ry=K.desc*0.45;
  return [...K.stem(x,-dd,h,'a',null),K.band(x+S/2-rx,-dd,rx,ry,0,-125),K.dot(x,h+S*1.0)];};
UX.l=K=>K.stem(K.cx,0,K.top,'a','s');
UX.k=K=>{const {L,R,S,h}=K;return [...K.stem(L+S/2,0,K.top,'a','s'),K.bar(R-S*0.45,h,L+S*1.2,h*0.4),K.bar(L+S*1.35,h*0.5,R-S*0.4,0)];};
UX.s=K=>{const {cx,h,S}=K,rx=K.bw/2,ry=h*0.27,sx=S*0.9,sy=K.sy*1.2;
  const p1=K.bpt(cx,h*0.75,rx,ry,203,sx,sy),p2=K.bpt(cx,h*0.25,rx,ry,23,sx,sy);
  return [K.band(cx,h*0.75,rx,ry,24,214,sx,sy),K.band(cx,h*0.25,rx,ry,45,-156,sx,sy),K.bar(p1[0],p1[1],p2[0],p2[1],sx*0.8)];};
UX.t=K=>{const {L,R,S,h}=K,x=K.cx-(K.bw>S*2.3?K.bw*0.05:0);
  return [...K.stem(x,0,h*1.14,'a','s'),K.rc(L,h-K.sy*1.1,R,h)];};
UX.f=K=>{const {L,R,S,h}=K,T=K.asc*0.8,rh=K.bw*0.62,x=L+S/2,o=[...K.stem(x,0,T,null,'s'),K.band(L+rh,T,rh,rh*0.8,40,180),K.rc(L,h-K.sy*1.1,R-S*0.4,h)];
  const e=K.bpt(L+rh,T,rh,rh*0.8,40);o.push(K.ball(e[0],e[1],Math.min(S*0.34,Math.max(K.sy*0.5,K.asc-e[1]))));return o;};/* капля не выше линии выносных в тяжёлых весах (FX2) */
const vbars=(K,x0,x1,y0,y1,ytip)=>{ // две диагонали, сходящиеся книзу
  const xm=(x0+x1)/2,tw=Math.max(K.S*0.95,10),tt=Math.max(K.H*1.7,28);
  return [K.pg([[x0,y1],[x0+tw,y1],[xm+tw/2,y0],[xm-tw/2,y0]]),K.pg([[x1-tt,y1],[x1,y1],[xm+tt/2,y0],[xm-tt/2,y0]])];};
UX.v=K=>vbars(K,K.L,K.R,0,K.h);
UX.w=K=>{const m=K.cx;return [...vbars(K,K.L,m+K.S*0.2,0,K.h),...vbars(K,m-K.S*0.2,K.R,0,K.h)];};
UX.x=K=>{const {L,R,h}=K;return [K.bar(L+K.S*0.45,h,R-K.S*0.45,0),K.bar(R-K.S*0.3,h,L+K.S*0.3,0)];};
UX.y=K=>{const {L,R,h,S}=K,dd=K.desc*0.95,tt=Math.max(K.H*1.7,28),x1=R-tt/2,x0=L+tt/2+4;
  const xj=x1+(x0-x1)*(h*0.9)/(h+dd);
  return [K.pg([[L,h],[L+S*0.95,h],[xj+S*0.4,h*0.1],[xj-S*0.4,h*0.1]]),K.bar(x1,h,x0,-dd,tt)];};
UX.z=K=>{const {L,R,h,S}=K;return [K.rc(L,h-K.sy*1.1,R,h),K.rc(L,0,R,K.sy*1.1),K.bar(R-S*0.5,h-K.sy*0.9,L+S*0.5,K.sy*0.9)];};
/* ---------- прописные латинские ---------- */
const bowlU=(K,xs,yT,yB,xr,fr)=>{const ry=(yT-yB)/2,cy=(yT+yB)/2,rx=Math.min(ry*0.95,(xr-xs)*(fr||0.58)),cxb=xr-rx;
  return [K.hb(xs,cxb+2,yT),K.hbb(xs,cxb+2,yB),K.band(cxb,cy,rx,ry,-90,90)];};
UX.A=K=>{const {L,R,cx,h,S}=K,x0=L+S*0.5,y=h*0.3,tw=S*0.6;
  const xl=x0+(cx-x0)*(y/h),xr=(R-S*0.5)-((R-S*0.5)-cx)*(y/h);
  return [K.bar(x0,0,cx-S*0.1,h),K.bar(R-S*0.5,0,cx+S*0.1,h),K.rc(xl,y-K.sy*0.5,xr,y+K.sy*0.5),...K.bot_(x0,0,'s'),...K.bot_(R-S*0.5,0,'s'),...K.deco(cx,h,1,1)];};
UX.B=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h,h*0.52,R-S*0.4),...bowlU(K,xs,h*0.54,0,R),...K.deco(xs,h,1)];};
UX.D=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h,0,R,0.62),...K.deco(xs,h,1)];};
UX.E=K=>UX.e(K);
UX.F=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),K.rc(xs,h-K.sy*1.2,R,h),K.rc(R-K.sy*1.2,h-tkH(K,K.sy*1.2),R,h),K.rc(xs,h*0.5-K.sy*0.6,R-S*0.5,h*0.5+K.sy*0.6),...K.deco(xs,h,1)];};
UX.G=K=>{const {cx,h,ov,R,S}=K;return [K.band(cx,h/2,K.bw/2,h/2+ov,46,360),K.rc(cx,h/2-K.sy*0.5,R-2,h/2+K.sy*0.5),K.rc(R-K.sx,h/2,R,h/2+h*0.11)];};
UX.H=K=>{const {L,R,S,h}=K;return [...K.stem(L+S/2,0,h,'a','s'),...K.stem(R-S/2,0,h,'a','s'),K.rc(L+S-2,h*0.515-K.sy*0.5,R-S+2,h*0.515+K.sy*0.5),...K.deco(L+S/2,h,1)];};
UX.I=K=>K.stem(K.cx,0,K.h,'s','s');/* I — брусок с засечками сверху и снизу: не путается с l с флажком (FX2) */
UX.J=K=>{const {R,S,h}=K,ry=h*0.28,rx=K.bw*0.6;return [...K.stem(R-S/2,ry,h,'a',null),K.band(R-rx,ry,rx,ry,0,-135)];};
UX.K=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),K.bar(R-S*0.4,h,L+S*1.15,h*0.42),K.bar(L+S*1.3,h*0.52,R-S*0.25,0),...K.deco(xs,h,1)];};
UX.L=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a',null),K.rc(L,0,R,K.sy*1.3),K.rc(R-K.sy*1.2,0,R,tkH(K,K.sy*1.3)),...K.deco(xs,h,1)];};
UX.M=K=>{const {L,R,S,h,cx}=K;return [...K.stem(L+S/2,0,h,'a','s'),...K.stem(R-S/2,0,h,'a','s'),K.bar(L+S*0.75,h,cx,h*0.08),K.bar(R-S*0.75,h,cx,h*0.08),...K.deco(L+S/2,h,1)];};
UX.N=K=>{const {L,R,S,h}=K;return [...K.stem(L+S/2,0,h,'a','s'),...K.stem(R-S/2,0,h,'a','s'),K.bar(L+S*0.75,h,R-S*0.75,0),...K.deco(L+S/2,h,1)];};
UX.O=UX.o;UX.C=UX.c;UX.S=UX.s;
UX.P=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h,h*0.42,R),...K.deco(xs,h,1)];};
UX.Q=K=>[...K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov,K.sx/1.03*0.95,K.sy),K.bar(K.cx+K.bw*0.06,K.h*0.24,K.R-K.S*0.35,-K.h*0.12)];/* хвост лежит в просвете: стенки как до оптической прибавки (иначе узкий карман в тяжёлых/широких настройках) */
UX.R=K=>{const {L,R,S,h,cx}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h,h*0.42,R-S*0.2),K.bar(cx-S*0.1,h*0.44,R-S*0.35,0),...K.deco(xs,h,1)];};
UX.T=K=>{const {L,R,S,h,cx}=K;return [K.rc(L,h-K.sy*1.25,R,h),K.rc(L,h-tkH(K,K.sy*1.25),L+K.sy*1.2,h),K.rc(R-K.sy*1.2,h-tkH(K,K.sy*1.25),R,h),...K.stem(cx,0,h-K.sy*1.25,null,'s'),...K.deco(cx,h,1)];};
UX.U=K=>[...UX.u(K),...K.deco(K.R-K.S/2,K.h,-1,K.v===1?1:0)];
UX.V=K=>UX.v(K);UX.W=K=>UX.w(K);UX.X=K=>UX.x(K);
UX.Y=K=>{const {L,R,cx,S,h}=K,yj=h*0.46,tt=Math.max(K.H*1.7,28);
  return [K.pg([[L,h],[L+S*0.95,h],[cx+S*0.4,yj],[cx-S*0.4,yj]]),K.pg([[R-tt,h],[R,h],[cx+tt/2,yj],[cx-tt/2,yj]]),...K.stem(cx,0,yj+4,null,'s')];};
UX.Z=K=>UX.z(K);
/* ---------- кириллица ---------- */
/* концевой «зуб» горизонтали: всегда заметно глубже самой черты (иначе на конце остаётся ступенька в несколько единиц) */
const tick=(K,x,yTop)=>K.rc(x-K.sy*1.2,yTop-tkH(K,K.sy*1.2),x,yTop);
UX.Be=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),K.rc(xs,h-K.sy*1.2,R-S*0.2,h),tick(K,R-S*0.2,h),...bowlU(K,xs,h*0.58,0,R),...K.deco(xs,h,1)];};
UX.Ge=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),K.rc(xs,h-K.sy*1.2,R,h),tick(K,R,h),...K.deco(xs,h,1)];};
UX.Ghe=K=>[...UX.Ge(K),K.rc(K.R-K.sy*1.2,K.h,K.R,K.h+K.S*0.5)];
UX.De=K=>{const {L,R,S,h,cx}=K,dd=K.desc*0.62,xt1=cx-K.bw*0.16,xt2=cx+K.bw*0.16,yb=-dd+K.sy*1.3;
  return [K.rc(xt1,h-K.sy*1.25,xt2,h),K.bar(xt1,h,L+S*0.85,yb-2),K.bar(xt2,h,R-S*0.85,yb-2),K.rc(L,-dd,R,yb),K.rc(L,-dd,Math.max(L+K.sy*1.2,L+S*0.85),-dd+tkH(K,K.sy*1.3)),K.rc(Math.min(R-K.sy*1.2,R-S*0.85),-dd,R,-dd+tkH(K,K.sy*1.3))];};
UX.Zhe=K=>{const {L,R,cx,S,h}=K;return [...K.stem(cx,0,h,'a','s'),K.bar(L+S*0.4,h,cx-S*0.35,h*0.5),K.bar(R-S*0.4,h,cx+S*0.35,h*0.5),K.bar(L+S*0.4,0,cx-S*0.35,h*0.5),K.bar(R-S*0.4,0,cx+S*0.35,h*0.5)];};
UX.Ze=K=>{const {cx,h,ov,S}=K,rx=K.bw/2,sx=S*0.88;
  return [K.band(cx,h*0.76,rx*0.92,h*0.25,-115,152,sx),K.band(cx-rx*0.04,h*0.28,rx,h*0.28+ov,115,-155,sx)];};
UX.I_=K=>{const {L,R,S,h}=K;return [...K.stem(L+S/2,0,h,'a','s'),...K.stem(R-S/2,0,h,'a','s'),K.bar(R-S*0.75,h,L+S*0.75,0)];};
UX.Ish=K=>[...UX.I_(K),K.band(K.cx,K.h+K.S*0.6,K.bw*0.3,K.S*0.5,205,335,K.tc*1.1,K.tc*1.1)];
UX.Le=K=>{const {L,R,S,h}=K;return [...K.stem(R-S/2,0,h,'a','s'),K.bar(R-S*0.55,h,L+S*0.6,0),...K.bot_(L+S*0.6,0,'f')];};
UX.Pe=K=>{const {L,R,S,h}=K;return [...K.stem(L+S/2,0,h,'f','s'),...K.stem(R-S/2,0,h,null,'s'),K.rc(L+S/2,h-K.sy*1.25,R,h)];};
/* У: строчная — как y (с нижним выносным); прописная стоит на базовой линии в высоте прописных:
   длинная волосная диагональ до базовой с флажковой засечкой (как у Л), толстое левое плечо входит в неё выше середины */
UX.U_=K=>{if(!K.U)return UX.y(K);const {L,R,h,S}=K,tt=Math.max(K.H*1.7,28),x1=R-tt/2,x0=L+S*0.6;
  const yj=h*0.36,xj=x0+(x1-x0)*(yj/h);
  return [K.pg([[L,h],[L+S*0.95,h],[xj+S*0.4,yj],[xj-S*0.4,yj]]),K.bar(x1,h,x0,0,tt),...K.bot_(x0,0,'f')];};
/* Ф: строчная — ствол от нижнего до верхнего выносного; прописная — ствол в высоте прописных (на базовой), овал в середине */
UX.Ef=K=>{const {cx,h,S}=K;if(K.U)return [...K.stem(cx,0,h,'a','s'),...K.ring(cx,h/2,K.bw/2,h*0.3,S*0.95,K.sy)];
  return [...K.stem(cx,-K.desc,K.asc,'a','s'),...K.ring(cx,h/2,K.bw/2,h*0.3,S*0.95,K.sy)];};
/* б: чаша «о» на высоте строчных + шея пера: из левой стенки чаши вверх и плавной дугой вправо до линии выносных,
   конец — капля, как у f и r (не копия прописной Б) */
UX.be=K=>{const {L,R,S,h}=K,cy=h*0.5,ex=R-S*0.15,rx=Math.max(S*1.2,ex-L),ry=K.asc-cy;
  const o=[...K.ring(K.cx,h/2,K.bw/2,h/2+K.ov),K.band(ex,cy,rx,ry,72,180,S,K.sy)];
  const e=K.bpt(ex,cy,rx,ry,72,S,K.sy);o.push(K.ball(e[0],e[1],Math.min(S*0.34,Math.max(K.sy*0.5,K.asc-e[1]))));return o;};/* капля не выше линии выносных в тяжёлых весах (FX2) */
UX.Tse=K=>{const {L,R,S,h}=K,dd=K.desc*0.5;return [...K.stem(L+S/2,0,h,'a',null),...K.stem(R-S/2,-dd,h,'a',null),K.rc(L,0,R,K.sy*1.3)];};
UX.Che=K=>{const {L,R,S,h,cx}=K,ym=h*0.62,ry=ym-h*0.36;return [...K.stem(L+S/2,ym,h,'a',null),K.band(cx,ym,K.bw/2,ry,180,360),...K.stem(R-S/2,0,h,'a','s')];};
UX.Sha=K=>{const {L,R,S,h,cx}=K;return [...K.stem(L+S/2,0,h,'a',null),...K.stem(cx,0,h,'a',null),...K.stem(R-S/2,0,h,'a',null),K.rc(L,0,R,K.sy*1.3)];};
UX.Shcha=K=>{const {L,R,S,h,cx}=K,dd=K.desc*0.5;return [...K.stem(L+S/2,0,h,'a',null),...K.stem(L+(R-L-S)*0.5+S/2,0,h,'a',null),...K.stem(R-S/2,-dd,h,'a',null),K.rc(L,0,R,K.sy*1.3)];};
UX.Soft=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h*0.6,0,R)];};
UX.Hard=K=>{const {L,R,S,h}=K,xs=L+K.bw*0.3+S/2;return [K.rc(L,h-K.sy*1.6,xs,h),...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h*0.6,0,R)];};
UX.Yeru=K=>{const {L,R,S,h}=K,xs=L+S/2,xr=R-S/2;return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h*0.6,0,xr-S*0.95),...K.stem(xr,0,h,'a','s')];};
UX.Ee=K=>{const {cx,h,ov,L,R,sy}=K;return [K.band(cx,h/2,K.bw/2,h/2+ov,-142,142),K.rc(L+K.bw*0.3,h/2-sy*0.45,R-K.sx*0.5,h/2+sy*0.45)];};
UX.Yu=K=>{const {L,R,S,h}=K,rw=K.bw*0.62,cxr=R-rw/2;return [...K.stem(L+S/2,0,h,'a','s'),K.rc(L+S-2,h/2-K.sy*0.5,cxr-rw/2+2,h/2+K.sy*0.5),...K.ring(cxr,h/2,rw/2,h/2+K.ov)];};
UX.Ya=K=>MIRX(UX.R({...K,deco:()=>[],L:K.L,R:K.R}),K.w);
/* две точки: расстояние между ними не меньше зазора, иначе в тяжёлых весах они слипаются */
const dots2=(K,fr,y,r)=>{const g=Math.max(K.S*0.15,20),d=Math.max(K.w*fr,r+g/2);return [K.dot(K.cx-d,y,r),K.dot(K.cx+d,y,r)];};
UX.Yo=K=>[...UX.e(K),...dots2(K,0.12,K.h+K.S*0.95,K.S*0.4)];
UX.Ye=K=>MIRX(UX.Ee(K),K.w);
UX.Ii=K=>[...K.stem(K.cx,0,K.h,'a','s'),...dots2(K,0.16,K.h+K.S*0.9,K.S*0.36)];
/* ---------- реестр ---------- */
const UNI={GL:{},CHARSET:[]};
/* засечки и ширина тяжёлых весов: выше ствола CX_S0 вылет засечки растёт медленнее ствола (иначе засечки соседних
   штрихов слипаются), а ширина знака прибавляет долю прироста каждого вертикального штриха (иначе просветы н, м, е схлопываются) */
const CX_S0=150;
/* в светлых весах засечка не короче ~34 ед. (иначе Light выглядит почти без засечек); при round=0 засечек нет */
const soOf=p=>{const r=p.round||0;if(r<=0)return 0;const so=(p.stem<=CX_S0?p.stem:CX_S0+(p.stem-CX_S0)*0.2)*0.4*r;return Math.max(so,34*Math.min(1,r/0.75));};
const CX_N4='MмWw&',CX_N3='RЯя$mШшЩщЫыЖжЮюИиЙйNÆæŒœaаąăàáâãäåānuUhñńňùúûüūůűÙÚÛÜŪŮŰчЧeеёЁèéêëēėěęEЕbdpqgрРфФ',CX_N1='iljtfrIJTІіЇїıгГґҐ1LcCсСзЗ3эЭєЄsS257';
const cxNst=ch=>CX_N4.includes(ch)?4:CX_N3.includes(ch)?3:CX_N1.includes(ch)?1:2;
const cxWx=(ch,p)=>cxNst(ch)*Math.max(0,p.stem-CX_S0)*0.95;
const WFIX_CODEX=/*WF*/{"A": 0.906, "C": 1.348, "G": 1.157, "H": 0.849, "J": 1.281, "K": 0.923, "L": 0.893, "M": 0.854, "N": 0.847, "O": 1.077, "R": 0.93, "S": 1.172, "T": 1.068, "U": 0.846, "V": 1.121, "W": 1.076, "X": 1.092, "Y": 1.152, "Z": 1.085, "a": 0.908, "c": 1.263, "e": 1.105, "g": 1.088, "h": 0.859, "k": 0.94, "n": 0.859, "s": 1.161, "u": 0.859, "v": 1.125, "y": 1.111, "А": 0.936, "Д": 1.153, "З": 1.243, "И": 0.898, "Й": 0.898, "М": 0.882, "Н": 0.876, "О": 1.112, "П": 0.876, "С": 1.392, "Т": 1.103, "У": 1.152, "Ф": 1.071, "Х": 1.128, "Ч": 0.903, "Ы": 0.93, "Э": 1.507, "Ю": 1.087, "г": 0.891, "д": 1.071, "е": 1.149, "ж": 0.923, "з": 1.165, "и": 0.852, "й": 0.852, "м": 0.89, "н": 0.865, "о": 1.089, "п": 0.848, "с": 1.314, "т": 1.178, "у": 1.155, "ф": 1.168, "ч": 0.855, "ш": 0.899, "ы": 0.918, "э": 1.371, "я": 0.933}/*END*/;
function ud(chars,fn,bw,kind,U){for(const ch of chars)UNI.GL[ch]={shape:g=>fn(mkU(g,!!U,ch)),w:p=>(typeof bw==='function'?bw(p):bw)*p.wdth/100*(WFIX_CODEX[ch]||1)+2*soOf(p)+cxWx(ch,p),k:kind||'cap',opt:{}};}
const LOWB={a:450,b:450,c:410,d:450,e:430,f:340,g:450,h:450,i:p=>p.stem,j:262,k:430,l:p=>p.stem*1.0,m:740,n:450,o:470,p:450,q:450,r:340,s:390,t:p=>p.stem*2.3,u:450,v:470,w:720,x:450,y:470,z:400};
const CAPB={a:600,b:460,c:470,d:520,e:450,f:400,g:500,h:560,i:p=>p.stem,j:330,k:520,l:420,m:760,n:580,o:560,p:440,q:560,r:470,s:420,t:500,u:540,v:560,w:820,x:530,y:530,z:460};
for(const k in LOWB){ud(k,UX[k],LOWB[k],'xh',false);ud(k.toUpperCase(),UX[k.toUpperCase()],CAPB[k],'cap',true);}
const CY=[['А',UX.A,600,'а',UX.a,450],['Б',UX.Be,470,'б',UX.be,450],['В',UX.B,460,'в',UX.B,420],['Г',UX.Ge,420,'г',UX.Ge,360],
 ['Д',UX.De,640,'д',UX.De,560],['Е',UX.e,450,'е',UX.e,430],['Ё',UX.Yo,450,'ё',UX.Yo,430],['Ж',UX.Zhe,860,'ж',UX.Zhe,780],['З',UX.Ze,430,'з',UX.Ze,390],['И',UX.I_,560,'и',UX.I_,480],['Й',UX.Ish,560,'й',UX.Ish,480],
 ['К',UX.K,520,'к',UX.K,430],['Л',UX.Le,560,'л',UX.Le,480],['М',UX.M,760,'м',UX.M,660],['Н',UX.H,560,'н',UX.H,470],['О',UX.o,560,'о',UX.o,470],['П',UX.Pe,560,'п',UX.Pe,470],
 ['Р',UX.P,440,'р',UX.p,450],['С',UX.c,470,'с',UX.c,410],['Т',UX.T,500,'т',UX.T,400],['У',UX.U_,520,'у',UX.U_,470],['Ф',UX.Ef,640,'ф',UX.Ef,600],['Х',UX.x,530,'х',UX.x,450],
 ['Ц',UX.Tse,580,'ц',UX.Tse,500],['Ч',UX.Che,500,'ч',UX.Che,450],['Ш',UX.Sha,780,'ш',UX.Sha,700],['Щ',UX.Shcha,830,'щ',UX.Shcha,740],['Ъ',UX.Hard,600,'ъ',UX.Hard,520],
 ['Ы',UX.Yeru,700,'ы',UX.Yeru,640],['Ь',UX.Soft,470,'ь',UX.Soft,420],['Э',UX.Ee,430,'э',UX.Ee,390],['Ю',UX.Yu,740,'ю',UX.Yu,680],['Я',UX.Ya,470,'я',UX.Ya,430],
 ['І',UX.I,p=>p.stem,'і',UX.i,p=>p.stem],['Ї',K=>[...K.stem(K.cx,0,K.h,'a','s'),...dots2(K,0.16,K.h+K.S*0.9,K.S*0.36)],p=>p.stem,'ї',UX.Ii,p=>p.stem],
 ['Є',UX.e,450,'є',UX.e,430],['Ґ',UX.Ghe,420,'ґ',UX.Ghe,360]];
for(const [U,fu,wu,l,fl,wl] of CY){ud(U,fu,wu,'cap',true);ud(l,fl,wl,'xh',false);}
ud('Є',UX.Ye,450,'cap',true);ud('є',UX.Ye,430,'xh',false);
ud('ф',UX.Ef,600,'xh',false);
UNI.GL['б'].opt.zoneInk=true;UNI.GL['б'].opt.negR=true;
/* ---------- цифры ---------- */
const sixU=K=>{const {L,R,S,h,ov}=K,rxu=K.bw*0.62,cyb=h*0.31;
  return [...K.ring(K.cx,cyb,K.bw/2,cyb+ov,S*0.95,K.sy),K.band(L+rxu,cyb,rxu,h*0.69,72,180)];};
const DGT=[
 ['0',K=>K.ring(K.cx,K.h/2,K.bw/2,K.h/2+K.ov,K.S*0.98,K.sy),430],
 ['1',K=>{const {L,S,h}=K,x=K.cx+S*0.15;return [...K.stem(x,0,h,null,'s'),K.pg([[x+S/2,h],[x-S/2,h],[L,h*0.78],[L,h*0.78-K.sy*1.5],[x-S/2,h*0.6]])];},p=>p.stem*2.1],
 ['2',K=>{const {L,R,h,S}=K,ry=h*0.29,cy=h-ry,e=K.bpt(K.cx,cy,K.bw/2,ry,-38);
   const t=K.bpt(K.cx,cy,K.bw/2,ry,165);return [K.band(K.cx,cy,K.bw/2,ry,-52,165),K.ball(t[0],t[1],K.sx*0.56),K.bar(e[0],e[1],L+S*0.45,K.sy*1.2,S*0.78),K.rc(L,0,R,K.sy*1.35)];},400],
 ['3',UX.Ze,400],
 ['4',K=>{const {L,R,S,h}=K,x4=L+K.bw*0.7;return [...K.stem(x4,0,h,null,'s'),K.bar(x4-S*0.15,h,L+S*0.35,h*0.3+K.sy*0.5,S*0.8),K.rc(L,h*0.3-K.sy*0.55,R,h*0.3+K.sy*0.55)];},450],
 ['5',K=>{const {L,R,S,h,ov}=K,cyb=h*0.3,e=K.bpt(K.cx,cyb,K.bw/2,cyb+ov,128);/* верхняя черта начинается от левой кромки ствола — без уступа */
   return [K.rc(e[0]-S*0.45,h-K.sy*1.25,R-S*0.1,h),K.rc(e[0]-S*0.45,Math.min(h*0.5,e[1]),e[0]+S*0.45,h),K.band(K.cx,cyb,K.bw/2,cyb+ov,-150,128)];},420],
 ['6',sixU,430],
 ['7',K=>{const {L,R,S,h}=K;return [K.rc(L,h-K.sy*1.25,R,h),K.rc(L,h-tkH(K,K.sy*1.25),L+K.sy*1.2,h),K.bar(R-S*0.6,h-K.sy*0.6,L+K.bw*0.28,0,S*0.85)];},400],
 ['8',K=>{const {S,h,ov}=K;return [...K.ring(K.cx,h*0.755,K.bw*0.42,h*0.245,S*0.9,K.sy),...K.ring(K.cx,h*0.3,K.bw/2,h*0.3+ov,S*0.95,K.sy)];},430],
 ['9',K=>ROT(sixU(K),K.w,K.h),430]];
for(const [d,f,w] of DGT)ud(d,f,w,'cap',true);
/* ---------- знаки ---------- */
const commaU=(K,yc)=>[K.dot(K.cx,yc,K.S*0.6),K.pg([[K.cx-K.S*0.3,yc-K.S*0.15],[K.cx+K.S*0.35,yc-K.S*0.15],[K.cx+K.S*0.08,yc-K.S*1.0],[K.cx-K.S*0.6,yc-K.S*1.5]])];
const wedge=(K,x,yT,yB)=>K.pg([[x-K.S*0.48,yT],[x+K.S*0.48,yT],[x+K.H*0.7,yB],[x-K.H*0.7,yB]]);
const PUN=[
 ['.',K=>[K.dot(K.cx,K.S*0.62,K.S*0.62)],p=>p.stem*0.95,'cap'],
 [',',K=>commaU(K,K.S*0.5),p=>p.stem*0.95,'cap'],
 [':',K=>{const r=Math.min(K.S*0.62,(K.h-Math.max(K.S*0.25,30))/4);return [K.dot(K.cx,r,r),K.dot(K.cx,K.h-r,r)];},p=>p.stem*0.95,'xh'],
 [';',K=>[K.dot(K.cx,K.h-K.S*0.62,K.S*0.62),...commaU(K,K.S*0.5)],p=>p.stem*0.95,'xh'],
 ['!',K=>[wedge(K,K.cx,K.h,Math.max(K.h*0.3,K.S*1.24+Math.max(K.S*0.25,30))),K.dot(K.cx,K.S*0.62,K.S*0.62)],p=>p.stem*0.95,'cap'],
 ['?',K=>{const {cx,h,S}=K,ry=h*0.27,cy=h-ry;return [K.band(cx,cy,K.bw/2,ry,-90,168,S*0.88),K.rc(cx-S*0.42,Math.max(h*0.3,S+Math.max(S*0.25,30)),cx+S*0.42,cy-ry+K.sy+4),K.dot(cx,S*0.5,S*0.5)];},400,'cap'],
 ["'",K=>[wedge(K,K.cx,K.h,K.h*0.66)],p=>p.stem*0.95,'cap'],
 ['"',K=>[wedge(K,K.cx-K.S*0.75,K.h,K.h*0.66),wedge(K,K.cx+K.S*0.75,K.h,K.h*0.66)],p=>p.stem*2.5,'cap'],
 ['-',K=>[K.rc(K.L,K.h*0.34-K.sy*0.6,K.R,K.h*0.34+K.sy*0.6)],260,'cap'],
 ['–',K=>[K.rc(K.L,K.h*0.34-K.sy*0.6,K.R,K.h*0.34+K.sy*0.6)],440,'cap'],
 ['—',K=>[K.rc(K.L,K.h*0.34-K.sy*0.6,K.R,K.h*0.34+K.sy*0.6)],780,'cap'],
 ['(',K=>{const rx=K.bw*1.0;return [K.band(K.L+rx,K.h*0.42,rx,K.h*0.78,128,232,K.S*0.8,K.S*0.8)];},p=>p.stem*1.5,'cap'],
 [')',K=>{const rx=K.bw*1.0;return MIRX([K.band(K.L+rx,K.h*0.42,rx,K.h*0.78,128,232,K.S*0.8,K.S*0.8)],K.w);},p=>p.stem*1.5,'cap'],
 ['[',K=>[K.rc(K.L,-K.h*0.14,K.L+K.S*0.8,K.h*1.04),K.rc(K.L,-K.h*0.14,K.R,-K.h*0.14+K.sy*1.2),K.rc(K.L,K.h*1.04-K.sy*1.2,K.R,K.h*1.04)],p=>p.stem*1.5,'cap'],
 [']',K=>[K.rc(K.R-K.S*0.8,-K.h*0.14,K.R,K.h*1.04),K.rc(K.L,-K.h*0.14,K.R,-K.h*0.14+K.sy*1.2),K.rc(K.L,K.h*1.04-K.sy*1.2,K.R,K.h*1.04)],p=>p.stem*1.5,'cap'],
 ['/',K=>[K.bar(K.R-K.S*0.3,K.h*1.02,K.L+K.S*0.3,-K.h*0.1,K.S*0.62)],p=>p.stem*2.6,'cap'],
 ['\\',K=>[K.bar(K.L+K.S*0.3,K.h*1.02,K.R-K.S*0.3,-K.h*0.1,K.S*0.62)],p=>p.stem*2.6,'cap'],
 ['|',K=>[K.rc(K.cx-K.S*0.4,-K.h*0.2,K.cx+K.S*0.4,K.h*1.04)],p=>p.stem*0.95,'cap'],
 ['+',K=>[K.rc(K.L,K.h*0.4-K.sy*0.6,K.R,K.h*0.4+K.sy*0.6),K.rc(K.cx-K.S*0.42,K.h*0.12,K.cx+K.S*0.42,K.h*0.68)],400,'cap'],
 ['=',K=>[K.rc(K.L,K.h*0.3-K.sy*0.6,K.R,K.h*0.3+K.sy*0.6),K.rc(K.L,K.h*0.52-K.sy*0.6,K.R,K.h*0.52+K.sy*0.6)],400,'cap'],
 ['×',K=>[K.bar(K.L+K.S*0.2,K.h*0.12,K.R-K.S*0.2,K.h*0.68,K.S*0.6),K.bar(K.L+K.S*0.2,K.h*0.68,K.R-K.S*0.2,K.h*0.12,K.S*0.6)],400,'cap'],
 ['<',K=>[K.bar(K.R-K.S*0.2,K.h*0.68,K.L+K.S*0.2,K.h*0.4,K.S*0.6),K.bar(K.L+K.S*0.2,K.h*0.4,K.R-K.S*0.2,K.h*0.12,K.S*0.6)],400,'cap'],
 ['>',K=>[K.bar(K.L+K.S*0.2,K.h*0.68,K.R-K.S*0.2,K.h*0.4,K.S*0.6),K.bar(K.R-K.S*0.2,K.h*0.4,K.L+K.S*0.2,K.h*0.12,K.S*0.6)],400,'cap'],
 ['_',K=>[K.rc(0,-K.h*0.16,K.w,-K.h*0.16+K.sy*1.2)],520,'cap'],
 /* звёздочка: размер не падает с весом (в жирном чуть растёт), лучи сужаются к концам и толстеют медленнее пера — читаемая звезда, а не клякса */
 ['*',K=>{const {cx,h,S}=K,r=h*0.2+Math.max(0,S-135)*0.25,y=h-r*0.95-h*0.06,t=Math.min(S*0.5,36+S*0.25),tt=t*0.62,o=[];
   for(let i=0;i<6;i++){const a=(90+i*60)*D2R,c=Math.cos(a),s=Math.sin(a),nx=-s,ny=c,x1=cx+c*r,y1=y+s*r;
     o.push(K.pg([[cx+nx*t/2-c*t*0.3,y+ny*t/2-s*t*0.3],[x1+nx*tt/2,y1+ny*tt/2],[x1-nx*tt/2,y1-ny*tt/2],[cx-nx*t/2-c*t*0.3,y-ny*t/2-s*t*0.3]]));}
   return o;},p=>2*(p.capH*0.2+Math.max(0,p.stem-135)*0.25)*0.9+p.stem*0.75,'cap'],
 ['°',K=>K.ring(K.cx,K.h*0.82,K.S*0.9,K.h*0.15,K.tc*1.2,K.tc*1.2),p=>p.stem*1.6,'cap'],
 ['•',K=>[K.ball(K.cx,K.h*0.4,K.S*0.55)],p=>p.stem*1.2,'cap'],
 ['…',K=>[K.dot(K.L+K.S*0.6,K.S*0.6,K.S*0.6),K.dot(K.L+K.S*2.1,K.S*0.6,K.S*0.6),K.dot(K.L+K.S*3.6,K.S*0.6,K.S*0.6)],p=>p.stem*4,'cap'],
 ['«',K=>{const {L,R,h,S}=K,m=K.cx,t=S*0.5;return [K.bar(m-S*0.1,h*0.66,L+S*0.1,h*0.4,t),K.bar(L+S*0.1,h*0.4,m-S*0.1,h*0.14,t),K.bar(R-S*0.1,h*0.66,m+S*0.1,h*0.4,t),K.bar(m+S*0.1,h*0.4,R-S*0.1,h*0.14,t)];},p=>p.stem*2.6,'cap'],
 ['»',K=>{const {L,R,h,S}=K,m=K.cx,t=S*0.5;return [K.bar(L+S*0.1,h*0.66,m-S*0.1,h*0.4,t),K.bar(m-S*0.1,h*0.4,L+S*0.1,h*0.14,t),K.bar(m+S*0.1,h*0.66,R-S*0.1,h*0.4,t),K.bar(R-S*0.1,h*0.4,m+S*0.1,h*0.14,t)];},p=>p.stem*2.6,'cap'],
 ['~',K=>{const rx=K.bw*0.25,y=K.h*0.5,t=K.tc*1.2;return [K.band(K.cx-rx,y,rx,K.h*0.09,0,180,t,t),K.band(K.cx+rx,y,rx,K.h*0.09,180,360,t,t)];},p=>p.stem*2.6,'cap'],
 ['^',K=>[K.bar(K.L+K.S*0.1,K.h*0.62,K.cx,K.h*1.0,K.S*0.5),K.bar(K.cx,K.h*1.0,K.R-K.S*0.1,K.h*0.62,K.S*0.5)],p=>p.stem*2.4,'cap'],
 ['`',K=>[K.bar(K.cx-K.S*0.4,K.h*1.0,K.cx+K.S*0.3,K.h*0.8,K.S*0.5)],p=>p.stem*1.6,'cap'],
 ['#',K=>{const {L,R,h,S}=K,t=S*0.52;return [K.bar(L+S*0.7,h*0.0,L+S*1.0,h*0.96,t),K.bar(R-S*1.0,h*0.0,R-S*0.7,h*0.96,t),K.rc(L,h*0.28-K.sy*0.5,R,h*0.28+K.sy*0.5),K.rc(L,h*0.62-K.sy*0.5,R,h*0.62+K.sy*0.5)];},500,'cap'],
 ['%',K=>{const {L,R,h,S}=K,r=h*0.17;return [...K.ring(L+K.bw*0.2,h*0.78,K.bw*0.2,r,S*0.55,K.sy*0.9),...K.ring(R-K.bw*0.2,h*0.22,K.bw*0.2,r,S*0.55,K.sy*0.9),K.bar(R-S*0.3,h*0.98,L+S*0.3,-h*0.02,S*0.5)];},620,'cap'],
 ['&',K=>{const {L,R,h,S,cx}=K;return [...K.ring(cx-K.bw*0.04,h*0.77,K.bw*0.27,h*0.23,S*0.78,K.sy),...K.ring(cx-K.bw*0.02,h*0.3,K.bw*0.38,h*0.3+K.ov,S*0.85,K.sy),K.bar(R-S*0.2,0,cx-K.bw*0.12,h*0.58,S*0.7)];},560,'cap'],
 ['@',K=>{const {cx,h,S}=K,cy=h*0.4,rx=K.bw/2,ry=h*0.55,cxi=cx+K.bw*0.02,rxi=K.bw*0.16,ryi=h*0.17;
   return [K.band(cx,cy,rx,ry,-14,305,S*0.8,K.sy*1.3),...K.ring(cxi,cy,rxi,ryi,K.tc*1.1,K.tc*1.1),K.rc(cxi+rxi-K.tc*1.1,cy-ryi,cxi+rxi,cy+ryi*1.25),K.rc(cxi+rxi-K.tc*0.2,cy-ryi,cx+rx-S*0.6+2,cy-ryi+K.tc*1.1)];},760,'cap'],
 ['$',K=>{const k2=Object.create(K);k2.h=K.h*0.78;const cs=xf(UX.s(k2),(x,y)=>[x,y+K.h*0.11]);return [...cs,K.rc(K.cx-K.tc*0.55,-K.h*0.05,K.cx+K.tc*0.55,K.h*1.05)];},420,'cap'],
 ['{',K=>{const {L,R,h,S,cx}=K,x=cx+S*0.1,t=S*0.62;return [K.rc(x-t/2,h*0.62,x+t/2,h*0.88),K.rc(x-t/2,h*0.12,x+t/2,h*0.38),K.rc(x-t/2,h*0.88-K.sy,R,h*0.88),K.rc(x-t/2,h*0.12,R,h*0.12+K.sy),K.bar(x,h*0.62,L+S*0.2,h*0.5,t),K.bar(L+S*0.2,h*0.5,x,h*0.38,t)];},p=>p.stem*2.2,'cap'],
 ['}',K=>MIRX(UNI.GL['{'].shape(K.g),K.w),p=>p.stem*2.2,'cap']];
PUN.push(['\u2012',K=>[K.rc(K.L,K.h*0.5-K.sy*0.6,K.R,K.h*0.5+K.sy*0.6)],p=>UNI.GL['0']?(UNI.GL['0'].w(p)-2*soOf(p))*100/p.wdth:440,'cap']);/* цифровое тире: ширина цифры, середина цифры */
for(const [c,f,w,kind] of PUN){UNI.GL[c]={shape:g=>f(mkU(g,false,c)),w:p=>(typeof w==='function'?w(p):w)*p.wdth/100+2*soOf(p)+(c==='$'?cxWx(c,p):0),k:kind,opt:{}};}
/* кавычки из запятой */
{
  const cm=(K,yc)=>commaU(K,yc);
  const rot=(K,cs,yc)=>xf(cs,(x,y)=>[2*K.cx-x,2*yc-y]);
  const mkQ=(c,fn,n)=>{UNI.GL[c]={shape:g=>{const K=mkU(g,false,c),o=[];const dx=n>1?K.S*0.95:0;for(let i=0;i<n;i++){const off=n>1?(i-0.5)*2*dx:0;o.push(...xf(fn(K),(x,y)=>[x+off,y]));}return o;},w:p=>(n>1?p.stem*2.6:p.stem*1.2)*p.wdth/100+2*soOf(p),k:'cap',opt:{}};};
  mkQ('’',K=>cm(K,K.h-K.S*0.7),1);mkQ('”',K=>cm(K,K.h-K.S*0.7),2);
  mkQ('‘',K=>rot(K,cm(K,K.h-K.S*0.7),K.h-K.S*0.7-K.S*0.4),1);mkQ('“',K=>rot(K,cm(K,K.h-K.S*0.7),K.h-K.S*0.7-K.S*0.4),2);
  mkQ('‚',K=>cm(K,K.S*0.5),1);mkQ('„',K=>cm(K,K.S*0.5),2);
}
/* общие знаки с «Вольтом» (пробелы, валюты, номер) */
for(const c of ['№','₽','€',' ','\u00a0'])if(FONTS.volt.GL[c])UNI.GL[c]=FONTS.volt.GL[c];
{
  const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ';
  const sym='.,:;!?"\'-–—‒()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…';
  UNI.CHARSET=Object.keys(UNI.GL);
  UNI.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
}
FONTS.codex=Object.assign({GL:UNI.GL,CHARSET:UNI.CHARSET,GROUPS:UNI.GROUPS},{
  id:'codex',name:'Кодекс',family:'Codex Uncial',tag:'Унциал · росчерки',
  desc:'Унциал с контрастом широкого пера: округлые формы, засечки трёх видов и росчерки на прописных.',
  sample:'КОДЕКС Uncial 1204',
  DEFAULTS:{
    regular:{wdth:110,capH:700,xh:500,asc:790,desc:230,stem:150,hair:46,diag:30,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:10,slant:0,sb:48,track:0,space:330,stemScale:0,tabular:0,mono:0,rough:0},
    italic:{wdth:106,capH:700,xh:500,asc:790,desc:230,stem:144,hair:44,diag:30,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:10,slant:11,sb:48,track:0,space:320,stemScale:0,tabular:0,mono:0,rough:0}},
  params:{stem:['Основной штрих (широкая сторона)',60,260,1],hair:['Соединительный штрих (узкая сторона)',16,140,1],diag:['Угол пера, °',0,75,1],round:['Размер засечек',0,2.4,0.05],spur:['Росчерки, размер',0,320,1],
    optic:null,kappa:null,innerR:null,ov:null,rough:null},
  methods:[
    ['Перо','Толщина и контраст пера: от узкого до широкого.',[['Узкое',{stem:110,hair:36}],['Среднее',{stem:150,hair:46}],['Широкое',{stem:190,hair:58}],['Резкий контраст',{stem:185,hair:22}]]],
    ['Угол пера','Наклон среза пера: определяет, какие диагонали толстые.',[['0°',{diag:0}],['20°',{diag:20}],['30°',{diag:30}],['45°',{diag:45}],['60°',{diag:60}]]],
    ['Засечки','Размер засечек: клин и плашка чередуются по знакам.',[['Нет',{round:0}],['Малые',{round:0.6}],['Обычные',{round:1}],['Крупные',{round:1.6}]]],
    ['Росчерки','Размер завитков над прописными.',[['Нет',{spur:0}],['Малые',{spur:70}],['Обычные',{spur:130}],['Пышные',{spur:240}]]],
    ['Пропорции','Соотношение высот.',[['Обычные',{capH:700,xh:500,asc:790,desc:230}],['Высокие выносные',{capH:700,xh:460,asc:860,desc:270}],['Крупный глаз',{capH:700,xh:560,asc:760,desc:210}]]],
    ['Ширина','Общий масштаб ширины.',[['Узкий',{wdth:92}],['Обычный',{wdth:110}],['Широкий',{wdth:130}]]],
  ],
  sym:false
});
