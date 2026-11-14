/* ===== «Ренесса» (Renessa Serif) — антиква старого стиля на движке «скелет + перо» =====
   Перо — эллиптическое, широкое (stem × hair под углом nib): контраст и наклон оси овалов даёт перо, а не нарисованные утолщения.
   Засечки — отдельный модуль (контур-«кронштейн» с клиновидным концом), прикрепляется к скелетному штриху как «точка с контуром»
   (st.dot + st.poly, см. skStroke). Параметры модуля: ser (длина), brk (кронштейн), hsl (скос головной засечки), ball (капли), fla (раструб).
   Строчные рисуются пером 0.9 от прописного (stem/hair × 0.9): прописные тяжелее строчных на ~10%. */
(function(){
const F={id:'renessa',mkCap:232,mkLow:270,mkAbs:945,name:'Ренесса',family:'Renessa Serif',tag:'Антиква · старого стиля',S0:92,GL:{},
  desc:'Антиква старого стиля: ширококонечное перо под наклоном даёт умеренный контраст и наклонную ось овалов, засечки с кронштейном и клиновидным концом, круглые широкие О и С, Λ-образные Л и Д, каплевидные окончания.',
  sample:'Антиква 1495'};
F.pen=p=>skPenOf({kind:'ell'},p);
const D2=Math.PI/180;
/* ---------- параметры модуля засечек ---------- */
if(!PARAMS.some(r=>r[0]==='ser'))PARAMS.push(['ser','Длина засечек, %',0,100,1,'Засечки'],['brk','Кронштейн засечек, %',0,100,1,'Засечки'],
  ['hsl','Скос головной засечки, °',8,40,1,'Засечки'],['ball','Каплевидные окончания, %',0,100,1,'Засечки'],['fla','Раструб стволов, %',0,100,1,'Засечки']);
const RNP=['ser','brk','hsl','ball','fla'];
const gp=(p,k,d)=>p[k]==null?d:p[k];
const LCM=0.92;/* перо строчных = 0.9 пера прописных */
const EPS=0.6;
/* ---------- построитель контуров ---------- */
function PB(){const ns=[];const o={
  M(x,y){ns.push({x,y,a:null,b:null});return o;},
  L(x,y){ns.push({x,y,a:null,b:null});return o;},
  C(x1,y1,x2,y2,x,y){ns[ns.length-1].b={x:x1,y:y1};ns.push({x,y,a:{x:x2,y:y2},b:null});return o;},
  Z(x1,y1,x2,y2){if(x1!=null){ns[ns.length-1].b={x:x1,y:y1};ns[0].a={x:x2,y:y2};}return o;},
  done(){return {hole:false,nodes:ns};}};return o;}
/* контур-засечка как «точка с контуром»: x,y — точка привязки (для редактора скелета) */
const SP=(x,y,c)=>({dot:true,x,y,r:2,poly:[c]});
/* ---------- комплект ---------- */
function RK(g,ch){const e=F.GL[ch],low=!!(e&&e.k==='xh'),p=g.p,m=low?LCM:1;
  const K=skKit(g,F);K.m=m;
  const spec={kind:'ell',rx:p.stem/2*m,ry:p.hair/2*m,ang:p.nib||0};K.spec=spec;K.low=low;K.spT={kind:'ell',rx:spec.rx*0.55,ry:spec.ry,ang:spec.ang};K.spM={kind:'ell',rx:spec.rx*0.82,ry:spec.ry,ang:spec.ang};
  if(m!==1){const pn=skPenOf(spec,p),M=pn.M([0,1],1),M2=pn.M([1,0],1);K.hx=Math.abs(skSupport(M,[-1,0]).p[0]);K.hy=Math.abs(skSupport(M2,[0,1]).p[1]);K.S*=m;K.H*=m;
    K.B=K.hy+0.3;K.T=g.h-K.hy-0.3;
    for(const k of ['st','hb','ln','ov_','arc','pa']){const f=K[k];K[k]=(...a)=>{const s=f(...a);s.pen=spec;return s;};}}
  const ser=gp(p,'ser',55)/100,brk=gp(p,'brk',50)/100;
  K.vw=2*K.hx;                                      /* ширина ствола по горизонтали */
  K.hyb=K.hy*0.9;K.tb=2*K.hyb;                      /* тонкая перекладина: толщина */
  K.sl=Math.max(6,ser*K.vw*1.5);                    /* вынос засечки от края ствола */
  K.tt=K.tb*0.55;                                   /* толщина кончика засечки */
  K.bh=K.tt+(0.9+2.2*brk)*K.tb;                     /* высота кронштейна у ствола */
  K.fl=1+0.2*gp(p,'fla',40)/100;                   /* раструб ствола у засечки */
  K.L=K.sl+K.hx*K.fl;K.R=g.w-K.L;K.cx=g.w/2;
  K.bar=(x0,x1,y,c0,c1)=>{const s=SKB.L(x0,y,x1,y,c0||'V',c1||'V');s.pen={kind:'ell',rx:spec.rx,ry:K.hyb,ang:0};return s;};
  K.ba=(x0,y0,x1,y1,c0,c1)=>{const s=SKB.L(x0,y0,x1,y1,c0||'H',c1||'H');s.pen=spec;return s;};
  return K;}
F.kit=RK;
/* ствол с раструбом у концов: y0 — низ, y1 — верх; концы вдвинуты в засечку */
function stem(K,x,y0,y1,o){o=o||{};const f0=o.f0==null?K.fl:o.f0,f1=o.f1==null?K.fl:o.f1,Lg=Math.abs(y1-y0),t=Math.min(0.3,K.bh*1.4/Lg);
  const nd=(y,w)=>({x,y,a:null,b:null,type:'smooth',w});const up=y1>y0,s=up?1:-1;
  const ns=[nd(y0,f0)];if(Lg>K.bh*3){ns.push(nd(y0+s*Lg*t,1+(f0-1)*0.25),nd(y1-s*Lg*t,1+(f1-1)*0.25));}ns.push(nd(y1,f1));
  const s0=SKB.st(ns,o.c0||'H',o.c1||'H');if(K.m!==1)s0.pen=K.spec;return s0;}
/* ---------- засечки ---------- */
/* ножка/головка симметричная: x — ось ствола, y0 — линия, dir=+1 тело выше линии (ножка), −1 ниже (головка); aL/aR — полуширины ствола у засечки */
function slab(K,x,y0,dir,o){o=o||{};const aL=o.aL!=null?o.aL:K.hx*K.fl,aR=o.aR!=null?o.aR:aL,Lg=o.L!=null?o.L:K.sl,Ll=o.l!=null?o.l:Lg,Lr=o.r!=null?o.r:Lg,
  T=o.T!=null?o.T:K.tt,B=o.B!=null?o.B:K.bh,d=dir;
  const b=PB(),xl=x-aL-Ll,xr=x+aR+Lr,yT=y0+d*T,yB=y0+d*B,skx=(o.sk||0)*(yB-y0),jl=x-aL+1.5+skx,jr=x+aR-1.5+skx;
  b.M(xl,y0).L(xr,y0).L(xr,yT);
  const sk_=o.sk||0,h1=(B-T)*0.8;if(Lr>1){const dx=xr-jr;b.C(xr-dx*0.55,yT+d*K.tb*0.03,jr-sk_*d*h1,yB-d*h1,jr,yB);}else b.L(jr,yB);
  b.L(jl,yB);
  if(Ll>1){const dx=jl-xl;b.C(jl-sk_*d*h1,yB-d*h1,xl+dx*0.55,yT+d*K.tb*0.03,xl,yT);}else b.L(xl,yT);
  return SP(x,y0,b.done());}
/* головная засечка строчных: клин влево с наклоном hsl, ось x, верх yT */
function flag(K,x,yTop,o){o=o||{};const aL=o.aL!=null?o.aL:K.hx*K.fl,Lg=o.L!=null?o.L:K.sl*1.05,tn=Math.tan(gp(K.p,'hsl',24)*D2),
  tv=o.T!=null?o.T:K.tt*0.9,Bk=o.B!=null?o.B:K.bh*0.78;
  const xl=x-aL-Lg,yt=yTop-Math.min(Lg*tn,K.bh*1.5),yb=yt-tv,yj=yb-Bk,sk=o.sk||0,jl=x-aL+1.5+sk*(yj-yTop),jr=x-aL+9;
  const b=PB();b.M(xl,yb).C(xl+(jl-xl)*0.5,yb-K.tb*0.05,jl,yj+Bk*0.62,jl,yj).L(jr+sk*(yj-yTop),yj).L(jr,yTop-EPS).L(xl,yt);
  return SP(x,yTop,b.done());}
/* ---------- определения ---------- */
const sk0=(ch,g)=>F.GL[ch].skel(g);
const WP=(bw,nst,nsl)=>p=>{const hx0=hxOf(p);return Math.max(60,bw*p.wdth/100+(nst||0)*(2*hx0-HX0)+(nsl==null?2:nsl)*(slOf(p,hx0)-SL0));};
/* вертикальная толщина штриха пера прописных (для расчёта ширин): независимо от комплекта */
function hxOf(p,m){m=m||1;const pn=skPenOf({kind:'ell',rx:p.stem/2*m,ry:p.hair/2*m,ang:p.nib||0},p),M=pn.M([0,1],1);return Math.abs(skSupport(M,[-1,0]).p[0]);}
const slOf=(p,hx)=>Math.max(6,gp(p,'ser',55)/100*2*hx*1.5);
let HX0=0,SL0=0;
const FN={};
const d=(ch,fn0,bw,kind,nst,nsl)=>{const fn=K=>{const r=fn0(K);return Array.isArray(r)?r.flat().filter(Boolean):r;};return (FN[ch]=fn,skDef(F,ch,fn,typeof bw==='function'?bw:WP(bw,nst,nsl),kind,nst==null?2:nst));};
/* ===== вспомогательные построения ===== */
const at=(x0,y0,x1,y1,y)=>x0+(x1-x0)*(y-y0)/(y1-y0);
/* половина горизонтальной ширины штриха с направлением (dx,dy) пером комплекта */
function hwd(K,dx,dy,sp){const L=Math.hypot(dx,dy),n=[-dy/L,dx/L],pn=skPenOf(sp||K.spec,K.p),M=pn.M([dx/L,dy/L],1),s=skSupport(M,n).p;
  return Math.abs(s[0]*n[0]+s[1]*n[1])/Math.max(0.2,Math.abs(dy)/L);}
/* вертикальный «клюв» на конце перекладины: xe — край, yb — низ перекладины (dir=-1: клюв вниз) */
/* клюв на конце штриха: xe — вертикальный срез, yE — край штриха у среза со стороны клюва, dir=-1 клюв вниз (yE — нижний край), +1 вверх;
   side=+1: штрих уходит влево от среза; m — наклон края штриха dy/dx; ch — вертикальная толщина штриха у среза */
function beak(K,xe,yE,dir,side,o){o=o||{};const s=side||1,m=o.m||0,ch=o.ch!=null?o.ch:K.tb,dh=o.h!=null?o.h:K.bh*1.05,bl=o.bl!=null?o.bl:K.sl*0.95,tw=o.tw!=null?o.tw:K.tt*0.6;
  const Y=x=>yE+m*(x-xe),yTip=yE+dir*dh,xt=xe-s*tw,xj=xe-s*bl,xc=xj+s*bl*0.5,xo=xe-s*EPS;
  const b=PB();
  b.M(xo,yE-dir*ch*0.5).L(xo,yTip).L(xt,yTip).C(xt-s*bl*0.02,yTip-dir*dh*0.45,xc,Y(xc)-dir*EPS,xj,Y(xj)-dir*EPS).L(xj,Y(xj)-dir*ch*0.5);
  return SP(xe,yE,b.done());}
/* ===== общие построения ===== */
const thick=(K,ux,uy)=>{const L=Math.hypot(ux,uy),pn=skPenOf(K.spec,K.p),M=pn.M([ux/L,uy/L],1),n=[-uy/L,ux/L],s=skSupport(M,n).p;return 2*Math.abs(s[0]*n[0]+s[1]*n[1]);};
/* вертикальный клюв-клин на конце дуги/штриха: стержень с сужением, внешний край вертикален (x = xe), dir=-1 вниз, +1 вверх; side=+1 — конец справа */
function vbeak(K,xe,y,dir,side,o){o=o||{};const dh=o.h!=null?o.h:K.bh*0.85,tw=o.tw!=null?o.tw:K.tt*0.9,bl=o.bl!=null?o.bl:K.sl*0.5,ch=o.ch||K.tb*1.2,sd=side,xo=xe-sd*EPS;
  const yT=y+dir*dh,yI=y-dir*ch*0.5,xt=xo-sd*tw,xb=xo-sd*(tw+bl);
  const b=PB();b.M(xo,yI).L(xo,yT).L(xt,yT).C(xt-sd*bl*0.04,yT-dir*dh*0.55,xb+sd*bl*0.45,y-dir*ch*0.12,xb,y-dir*ch*0.12).L(xb,yI);
  return SP(xe,y,b.done());}
function arcBeak(K,cx,cy,rx,ry,a,dir,o){const r=a*D2,E=[cx+rx*Math.cos(r),cy+ry*Math.sin(r)],T=[-rx*Math.sin(r),ry*Math.cos(r)],L=Math.hypot(T[0],T[1]),ux=T[0]/L,uy=T[1]/L,
  th=thick(K,ux,uy),ch=th/Math.max(0.25,Math.abs(ux)),side=Math.cos(r)>0?1:-1;
  return vbeak(K,E[0],E[1]+dir*ch*0.5,dir,side,Object.assign({},o||{}));}
/* каплевидное окончание: нажим растёт к концу штриха, перед ним — шейка */
const BW=K=>1+0.55*gp(K.p,'ball',60)/100,BN=K=>1-0.14*gp(K.p,'ball',60)/100;
const BALL=(K,x,y)=>SKB.D(x,y,K.hx*(0.72+0.5*gp(K.p,'ball',60)/100));
const nodes=(sp,tens)=>skPath(sp,{tens:tens||1});
/* ===== терминалы (новые): всё строится явными контурами от конца штриха ===== */
const SPo=(x,y,b)=>SP(x,y,skOrient(b.done().nodes,false));
/* сведения о конце штриха-пути: точка, единичный вектор наружу, кромка */
function endInfo(ns,start){const n=ns.length,E=start?ns[0]:ns[n-1];let nb=start?(ns[0].b||ns[1]):(ns[n-1].a||ns[n-2]);
  let ux=E.x-nb.x,uy=E.y-nb.y;if(Math.hypot(ux,uy)<1e-6){nb=start?ns[1]:ns[n-2];ux=E.x-nb.x;uy=E.y-nb.y;}const L=Math.hypot(ux,uy)||1;return {x:E.x,y:E.y,ux:ux/L,uy:uy/L};}
/* каплевидное окончание: круг радиуса r с центром в (x,y), хвост назад по штриху (длина Lt, полуширина hw) */
function tdrop(K,x,y,ux,uy,r,o){o=o||{};const L=Math.hypot(ux,uy)||1;ux/=L;uy/=L;const nx=uy,ny=-ux,k=0.5523;
  const th=thick(K,ux,uy),hw=o.hw!=null?o.hw:Math.max(2,th*0.5*0.8),Lt=o.Lt!=null?o.Lt:r*2.2,sh=o.sh!=null?o.sh:r*0.25;
  const P=(a,b)=>[x+ux*(a+sh)+nx*b,y+uy*(a+sh)+ny*b];const b=PB();
  let p=P(-Lt,-hw);b.M(p[0],p[1]);
  let c1=P(-Lt*0.45,-hw),c2=P(-r*0.75,-r),A=P(0,-r);b.C(c1[0],c1[1],c2[0],c2[1],A[0],A[1]);
  let q1=P(k*r,-r),q2=P(r,-k*r),F=P(r,0);b.C(q1[0],q1[1],q2[0],q2[1],F[0],F[1]);
  q1=P(r,k*r);q2=P(k*r,r);let B=P(0,r);b.C(q1[0],q1[1],q2[0],q2[1],B[0],B[1]);
  c1=P(-r*0.75,r);c2=P(-Lt*0.45,hw);p=P(-Lt,hw);b.C(c1[0],c1[1],c2[0],c2[1],p[0],p[1]);
  return SPo(x,y,b);}
/* точка и касательная на расстоянии dist вдоль пути от конца (start=true — от начала) */
function ptAlong(ns,start,dist){const seq=start?ns:ns.slice().reverse();let acc=0,prev=null,res=null;
  for(let i=0;i<seq.length-1&&!res;i++){const A=seq[i],B=seq[i+1];const hA=start?A.b:A.a,hB=start?B.a:B.b;
    const c=[[A.x,A.y],hA?[hA.x,hA.y]:[A.x,A.y],hB?[hB.x,hB.y]:[B.x,B.y],[B.x,B.y]];
    for(let k=0;k<=40;k++){const t=k/40,u=1-t,x=u*u*u*c[0][0]+3*u*u*t*c[1][0]+3*u*t*t*c[2][0]+t*t*t*c[3][0],y=u*u*u*c[0][1]+3*u*u*t*c[1][1]+3*u*t*t*c[2][1]+t*t*t*c[3][1];
      if(prev){const dl=Math.hypot(x-prev[0],y-prev[1]);if(acc+dl>=dist){const f=(dist-acc)/dl,px=prev[0]+(x-prev[0])*f,py=prev[1]+(y-prev[1])*f;res={x:px,y:py,tx:(prev[0]-x)/dl,ty:(prev[1]-y)/dl};break;}acc+=dl;}prev=[x,y];}}
  return res||{x:prev[0],y:prev[1],tx:0,ty:1};}
/* вертикальный клюв на срезанном вертикально конце штриха-пути ns: dir=-1 клюв вниз, +1 вверх; start — конец у начала пути */
function vbk(K,ns,start,dir,o){o=o||{};const E=endInfo(ns,start);const tf=(start?ns[0]:ns[ns.length-1]).w||1,side=E.ux>0?-1*-1:-1,th=thick(K,E.ux,E.uy)*tf,ch=th/Math.max(0.5,Math.abs(E.ux));
  const sd=E.ux>0?1:-1; /* тело штриха — со стороны sd от среза: sd=+1 тело слева (конец справа) */
  const dh=o.h!=null?o.h:K.bh*1.4,tw=o.tw!=null?o.tw:K.hx*0.5,bl=o.bl!=null?o.bl:K.hx*1.2,xf=E.x+sd*K.hx*tf,yc=E.y+(E.ux?E.uy/E.ux:0)*sd*K.hx*tf;
  const edge=dir<0?yc-ch/2:yc+ch/2,yTip=edge+dir*dh,xt=xf-sd*tw;
  const Q=ptAlong(ns,start,bl*1.1),thQ=thick(K,Q.tx,Q.ty)*(tf+(1-tf)*0.5),nx=-Q.ty,ny=Q.tx,sg=(ny*dir>0)?1:-1;
  const J=[Q.x+sg*nx*thQ/2*0.97,Q.y+sg*ny*thQ/2*0.97];
  const b=PB();b.M(xf,yc).L(xf,yTip).L(xt,yTip).C(xt-sd*bl*0.02,yTip-dir*dh*0.45,J[0]+sd*bl*0.45,J[1]+dir*K.tb*0.15,J[0],J[1]).L(Q.x,Q.y);
  return SPo(xf,yc,b);}
const ovl=(K,xl,xr,y0,y1)=>K.ov_((xl+xr)/2,(y0+y1)/2,(xr-xl)/2,(y1-y0)/2);
const Hh=K=>K.h;
/* ствол + засечки */
const stemS=(K,x,y0,y1,o)=>{o=o||{};const out=[stem(K,x,y0+K.tt*0.5,y1-K.tt*0.5)];
  if(!o.noFoot)out.push(slab(K,x,y0,1,o.foot));if(!o.noHead)out.push(slab(K,x,y1,-1,o.head));return out;};
/* диагональ с засечками на концах: (xa,ya) — нижний/верхний конец осевой, засечки по горизонтали */
function diag(K,xa,ya,xb,yb,o){o=o||{};const sp=o.thin?K.spT:o.mid?K.spM:K.spec,dx=xb-xa,dy=yb-ya,hw=hwd(K,dx,dy,sp);
  const ea=o.ea||'H',eb=o.eb||'H',ia=o.inA!=null?o.inA:K.tt*0.5,ib=o.inB!=null?o.inB:K.tt*0.5;
  const L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
  const ya2=ya+(ya<yb?1:-1)*ia,yb2=yb+(yb<ya?1:-1)*ib;
  const xa2=xa+ux*(ya2-ya)/uy,xb2=xb+ux*(yb2-yb)/uy;
  const st=SKB.L(xa2,ya2,xb2,yb2,ea,eb);st.pen=sp;if(o.w){st.nodes[0].w=o.w;st.nodes[1].w=o.w;}
  return {st,hw,sk:dx/dy};}
/* нога К/к: параллелограмм, верх срезан по оси руки (прячется в руке) */
function legP(K,L,yj,xt,h,xm,ym,xb){const dy=-ym,sl_=(xb-xm)/dy,hw=hwd(K,xb-xm,dy),m=(h-yj)/(xt-L),q=hw/(1-sl_*m),yA=x=>yj+m*(x-L),y1=K.tt*0.5,xc1=xm+sl_*(y1-ym);
  const b=PB();b.M(xm-q,yA(xm-q)).L(xm+q,yA(xm+q)).L(xc1+hw,y1).L(xc1-hw,y1);return SPo(xm,ym,b);}
/* толстая диагональ, нижний край которой срезан по оси тонкого штриха PQ (стык у/У без ступеньки) */
function trimDiag(K,xa,ya,xb,yb,P,Q){const hw=hwd(K,xb-xa,yb-ya),s=(xb-xa)/(yb-ya),m=(Q[0]-P[0])/(Q[1]-P[1]);
  const yI=e=>{/* xa+e*hw+s*(y-ya) = P0+m*(y-P1) */return (P[0]-m*P[1]-xa-e*hw+s*ya)/(s-m);};
  const yl=yI(-1),yr=yI(1),xl=xa-hw+s*(yl-ya),xr=xa+hw+s*(yr-ya);
  const b=PB();b.M(xa-hw,ya).L(xa+hw,ya).L(xr,yr).L(xl,yl);return SPo(xa,ya,b);}
/* Z/z: диагональ — параллелограмм со срезами по осям планок (углы заподлицо с планками) */
function zDiag(K,xa,xe,yt,yb,m){let hw=40;for(let i=0;i<4;i++){hw=hwd(K,(xe-hw-m)-(xa+hw+m),yb-yt);}
  const xt=xe-hw-m,xb=xa+hw+m,b=PB();b.M(xt-hw,yt).L(xt+hw,yt).L(xb+hw,yb).L(xb-hw,yb);return SPo(xt,yt,b);}
/* вертикальная засечка-чёрточка (сужается к концу): dir=+1 вверх, -1 вниз */
function tick(K,x,y0,dir,hgt,tw){tw=tw||K.hyb*1.5;const b=PB();b.M(x-tw,y0).L(x+tw,y0).L(x+tw*0.75,y0+dir*hgt).L(x-tw*0.75,y0+dir*hgt);return SP(x,y0,b.done());}
/* хвост Ц/Щ: нижняя планка продолжена вправо за ствол на уровне базовой линии, на конце короткая вертикальная чёрточка вниз */
function tailF(K,x,len){len=len||K.hx*2.4;const xt=x+K.hx+len-K.hyb*1.5,d=K.low?K.hx*1.4:K.hx*2;return [K.bar(x-K.hx,xt,K.hyb),beak(K,xt,0,-1,1,{h:K.low?K.bh*0.95:K.bh*1.3})];}
/* лента-флаг б/r: ровная по толщине полоса от верха ствола вправо, слева плавно сливается со стволом, конец срезан косо, слегка вверх */
function ribbon(K,x,yT,len,t,up,hs,yb){hs=hs||1;const xs=x-K.hx*hs,hx2=2*K.hx*hs,b=PB();up=up==null?0.35:up;
  b.M(xs,yb!=null?yb:yT-t*3.2);if(yb!=null)b.L(xs,yT-t*3.4);b.C(xs,yT-t*1.5,xs+t*0.9,yT,xs+t*2.7,yT)
   .C(xs+len*0.55,yT+t*0.03,xs+len*0.85,yT+t*0.06,xs+len,yT+t*up)
   .C(xs+len-t*0.08,yT+t*0.05,xs+len-t*0.5,yT-t*0.65,xs+len-t*0.85,yT-t*0.9)
   .C(xs+len*0.8,yT-t*0.98,xs+len*0.6,yT-t*0.98,xs+hx2+t*1.9,yT-t*0.98)
   .C(xs+hx2+t*0.4,yT-t*0.98,xs+hx2,yT-t*1.5,xs+hx2,yT-t*2.6).L(xs+hx2,yb!=null?yb:yT-t*3.2);
  return SP(x,yT-t*2,b.done());}
/* клиновой шип вверх (Ґ/ґ): сужается кверху, срез скошен как у засечек, у основания скобка в планку */
function spur(K,x,y0,yT,wb,wt){const b=PB(),r=wb*0.5,q=wt*0.5;b.M(x-r,y0-K.hyb).L(x+r,y0-K.hyb).L(x+r,y0).C(x+r,y0+(yT-y0)*0.25,x+q,yT-(yT-y0)*0.4,x+q,yT-K.hyb*2.2).L(x-q,yT).C(x-q,yT-(yT-y0)*0.4,x-r,y0+(yT-y0)*0.25,x-r,y0);return SP(x,y0,b.done());}
function vsp(K,x,y0,yT){return spur(K,x,y0,yT,K.hx*1.9,K.hx*0.8);}
/* зеркальный флажок головки (вправо): та же геометрия, что у flag() */
function flagR(K,x,yTop,o){o=o||{};const aL=o.aL!=null?o.aL:K.hx*K.fl,Lg=o.L!=null?o.L:K.sl*1.05,tn=Math.tan(gp(K.p,'hsl',24)*D2),tv=o.T!=null?o.T:K.tt*0.9,Bk=o.B!=null?o.B:K.bh*0.78;
  const xl=x+aL+Lg,yt=yTop-Math.min(Lg*tn,K.bh*1.5),yb=yt-tv,yj=yb-Bk,jl=x+aL-1.5,jr=x+aL-9,b=PB();
  b.M(xl,yb).C(xl+(jl-xl)*0.5,yb-K.tb*0.05,jl,yj+Bk*0.62,jl,yj).L(jr,yj).L(jr,yTop-EPS).L(xl,yt);return SP(x,yTop,b.done());}
/* ===== прямые прописные ===== */
d('H',K=>{const {L,R,h}=K;return [...stemS(K,L,0,h),...stemS(K,R,0,h),K.bar(L,R,h*0.52)];},524,'cap',2);
d('I',K=>stemS(K,K.cx,0,K.h),p=>2*slOf(p,hxOf(p))+2*hxOf(p)+40,'cap',1);
d('E',K=>{const {L,h,w}=K,yt=h-K.hyb,yb=K.hyb,ym=h*0.52,xe=w-K.sl*0.5,xm=xe-w*0.07;
  return [...stemS(K,L,0,h,{head:{r:0}}),K.bar(L,xe,yt),K.bar(L,xm,ym),K.bar(L,xe,yb),
    beak(K,xe,yt-K.hyb,-1,1),beak(K,xe,yb+K.hyb,1,1),beak(K,xm,ym+K.hyb,1,1,{h:K.bh*0.7}),beak(K,xm,ym-K.hyb,-1,1,{h:K.bh*0.7})];},438,'cap',1);
d('F',K=>{const {L,h,w}=K,yt=h-K.hyb,ym=h*0.5,xe=w-K.sl*0.4,xm=xe-w*0.09;
  return [...stemS(K,L,0,h,{head:{r:0}}),K.bar(L,xe,yt),K.bar(L,xm,ym),beak(K,xe,yt-K.hyb,-1,1),beak(K,xm,ym+K.hyb,1,1,{h:K.bh*0.7}),beak(K,xm,ym-K.hyb,-1,1,{h:K.bh*0.7})];},394,'cap',1);
d('L',K=>{const {L,h,w}=K,yb=K.hyb,xe=w-K.sl*0.4;
  return [...stemS(K,L,0,h),K.bar(L,xe,yb),beak(K,xe,yb+K.hyb,1,1)];},403,'cap',1);
d('T',K=>{const {w,h,cx}=K,yt=h-K.hyb,xa=K.sl*0.4,xe=w-xa;
  return [K.bar(xa,xe,yt),beak(K,xe,yt-K.hyb,-1,1),beak(K,xa,yt-K.hyb,-1,-1),stem(K,cx,K.tt*0.5,h-K.hyb*1.2),slab(K,cx,0,1)];},482,'cap',1);
d('O',K=>[ovl(K,K.hx,K.w-K.hx,K.hy-K.ov,K.h-K.hy+K.ov)],661,'cap',2,0);
d('C',K=>{const {w,h}=K,cx=w/2+K.hx*0.08,cy=h/2,rx=(w-2*K.hx)/2,ry=h/2+K.ov-K.hy,ex=K.apx||0,a0=40+ex,a1=322-ex;
  const ns=skArcN(cx,cy,rx,ry,a0,a1,K.tens),o=SKB.st(ns,'V','V');o.pen=K.spec;return [o,vbk(K,ns,true,-1)];},595,'cap',2,0);
d('G',K=>{const {w,h}=K,cx=w/2,cy=h/2,rx=(w-2*K.hx)/2,ry=h/2+K.ov-K.hy,a0=50,yb=cy+h*0.05;
  const an=skArcN(cx,cy,rx,ry,a0,352,K.tens),p=SKB.st(skCat(an,skLn(cx+rx*0.99,cy-h*0.03,cx+rx*0.99,yb)),'V','H');p.pen=K.spec;
  return [p,vbk(K,an,true,-1,{h:K.bh*0.7}),K.bar(cx-rx*0.05,cx+rx,yb-K.hyb),beak(K,cx-rx*0.05,yb,1,-1,{h:K.bh*0.8})];},570,'cap',2,0);
const bowlR=(K,x0,xr,y0,y1,c1)=>{const r=Math.max(K.hx*0.8,Math.min((y1-y0)/2*0.98,(xr-x0)*0.9));
  return K.pa([[x0,y1,0],[xr-r,y1,0],[xr,(y0+y1)/2,-90],[xr-r,y0,180],[x0,y0,180]],'J','J');};
d('D',K=>{const {L,w,h}=K,xr=w-K.hx-K.sl*0.15;return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),bowlR(K,L,xr,K.hyb,h-K.hyb)];},573,'cap',2);
d('B',K=>{const {L,w,h}=K,ym=h*0.54,xr=w-K.hx-K.sl*0.2;
  return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),bowlR(K,L,xr-w*0.05,ym,h-K.hyb),bowlR(K,L,xr,K.hyb,ym)];},448,'cap',2);
d('P',K=>{const {L,w,h}=K,xr=w-K.hx-K.sl*0.2;return [...stemS(K,L,0,h,{head:{r:0}}),bowlR(K,L,xr,h*0.44,h-K.hyb)];},395,'cap',2);
d('R',K=>{const {L,w,h}=K,xr=w-K.hx-K.sl*0.3,yb=h*0.44,xj=L+(xr-L)*0.5,xl=w-K.sl-hwd(K,1,-2);
  const lg=diag(K,xj,yb,xl,0,{ea:'H',eb:'H'});return [...stemS(K,L,0,h,{head:{r:0}}),bowlR(K,L,xr,yb,h-K.hyb),lg.st,slab(K,xl,0,1,{sk:lg.sk,aL:lg.hw,aR:lg.hw})];},453,'cap',2);
d('A',K=>{const {w,h,cx}=K,sl=K.sl,a1=cx-2,a2=cx+2;let xL=sl+K.hx,xR=w-sl-K.hx;
  for(let i=0;i<3;i++){xL=sl+hwd(K,a1-xL,h,K.spT);xR=w-sl-hwd(K,xR-a2,h);}
  const l=diag(K,xL,0,a1,h,{thin:1,inB:0}),r=diag(K,xR,0,a2,h,{inB:0}),yb=h*0.27;
  return [l.st,r.st,K.bar(at(xL,0,a1,h,yb),at(xR,0,a2,h,yb),yb),slab(K,xL,0,1,{sk:l.sk,aL:l.hw,aR:l.hw}),slab(K,xR,0,1,{sk:r.sk,aL:r.hw,aR:r.hw})];},619,'cap',0,2);
d('V',K=>{const {w,h,cx}=K,sl=K.sl,a1=cx-2,a2=cx+2;let xL=sl+K.hx,xR=w-sl-K.hx;
  for(let i=0;i<3;i++){xL=sl+hwd(K,a1-xL,h);xR=w-sl-hwd(K,xR-a2,h,K.spT);}
  const l=diag(K,xL,h,a1,0,{inB:0}),r=diag(K,xR,h,a2,0,{thin:1,inB:0});
  return [l.st,r.st,slab(K,xL,h,-1,{sk:l.sk,aL:l.hw,aR:l.hw,r:K.sl*0.3}),slab(K,xR,h,-1,{sk:r.sk,aL:r.hw,aR:r.hw,l:K.sl*0.3})];},563,'cap',0,2);
d('N',K=>{const {L,R,h}=K,hw=hwd(K,R-L,-h);
  const dg=SKB.P([[L,h-K.hy*0.3],[R,K.hy*0.3]],'H','H');dg.pen=K.spM;
  return [...stemS(K,L,0,h),stem(K,R,K.tt*0.5,h-K.tt*0.5),slab(K,R,h,-1),dg];},607,'cap',2);
d('M',K=>{const {L,R,h,cx}=K,y0=h-K.hy*0.3;
  const l=diag(K,L,y0,cx-2,0,{mid:1,inA:0,inB:0}),r=diag(K,cx+2,0,R,y0,{thin:1,inA:0,inB:0});
  return [...stemS(K,L,0,h),...stemS(K,R,0,h),l.st,r.st];},748,'cap',2);
d('X',K=>{const {w,h}=K,sl=K.sl,x0=sl+K.hx*0.9,x1=w-x0;const a=diag(K,x0,0,x1,h,{thin:1}),b=diag(K,x1,0,x0,h);
  return [a.st,b.st,slab(K,x0,0,1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,x1,0,1,{sk:b.sk,aL:b.hw,aR:b.hw}),slab(K,x1,h,-1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,x0,h,-1,{sk:b.sk,aL:b.hw,aR:b.hw})];},591,'cap',0,2);
function endBeak(K,ns,i,dir,side,o){return vbk(K,ns,i===0,dir,Object.assign({h:K.bh*(K.low?0.6:1.0),bl:K.hx*(K.low?0.85:1.0)},o||{}));}
const pst=(K,sp,c0,c1,o)=>{const st=SKB.P(sp,c0,c1,Object.assign({tens:K.tens},o||{}));if(K.m!==1)st.pen=K.spec;return st;};
d('K',K=>{const {L,w,h}=K,sl=K.sl,wa=hwd(K,1,2,K.spT),xt=w-sl-wa,xb=w-sl-hwd(K,1,-2),yj=h*0.36,t=0.52,xm=L+(xt-L)*t,ym=yj+(h-yj)*t;
  const arm=diag(K,L,yj,xt,h,{thin:1,inA:0}),leg=diag(K,xm,ym,xb,0,{inA:0});
  return [...stemS(K,L,0,h),arm.st,legP(K,L,yj,xt,h,xm,ym,xb),slab(K,xt,h,-1,{sk:arm.sk,aL:arm.hw,aR:arm.hw}),slab(K,xb,0,1,{sk:leg.sk,aL:leg.hw,aR:leg.hw})];},483,'cap',2,2);
d('Y',K=>{const {w,h,cx}=K,sl=K.sl,yj=h*0.44,xl=sl+hwd(K,cx-sl-K.hx,h-yj),xr=w-sl-hwd(K,cx-sl-K.hx,h-yj,K.spT);
  const a=diag(K,xl,h,cx-2,yj,{inB:0}),b=diag(K,xr,h,cx+2,yj,{thin:1,inB:0});
  return [a.st,b.st,stem(K,cx,K.tt*0.5,yj+K.hy),slab(K,cx,0,1),slab(K,xl,h,-1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,xr,h,-1,{sk:b.sk,aL:b.hw,aR:b.hw})];},496,'cap',1,2);
d('Z',K=>{const {w,h}=K,xa=K.sl*0.4,xe=w-xa,yt=h-K.hyb,yb=K.hyb,xd1=xe-K.sl*0.5,xd0=xa+K.sl*0.5;
  const dg=zDiag(K,xa,xe,yt,yb,0);
  return [K.bar(xa,xe,yt),K.bar(xa,xe,yb),dg,beak(K,xa,yt-K.hyb,-1,-1),beak(K,xe,yb+K.hyb,1,1)];},503,'cap',1,0);
const sS=(K,o)=>{o=o||{};const {w,h}=K,xl=K.hx,xr=w-K.hx,cx=w/2,yt=h+K.ov-K.hy,yb=K.hy-K.ov,ym=h*0.53;
  const sp=[[xr-w*0.05,h*0.78,127],[cx-w*0.04,yt,180],[xl+w*0.04,(yt+ym)/2+h*0.03,-90],[cx,ym,-12],[xr,(ym+yb)/2-h*0.02,-90],[cx+w*0.04,yb,180],[xl+w*0.05,h*0.22,127]];
  const ns=nodes(sp,K.tens),st=SKB.st(ns,'V','V');st.pen=K.spec;ns[0].w=0.5;ns[ns.length-1].w=0.5;return [st,endBeak(K,ns,0,-1,1),endBeak(K,ns,ns.length-1,1,-1)];};
d('S',K=>sS(K),378,'cap',2,0);
d('U',K=>{const {L,R,h,cx}=K,yb=K.hy-K.ov;
  return [...stemS(K,L,h*0.4,h,{foot:false,noFoot:true}),pst(K,[[L,h*0.5,-90],[cx,yb,0],[R,h*0.5,90]],'J','J'),...stemS(K,R,h*0.4,h,{noFoot:true})];},544,'cap',2,2);
d('W',K=>{const {w,h,cx}=K,sl=K.sl;let xa=sl+K.hx*1.6,xb=w-xa;const x1=w*0.285,x2=w*0.715;
  const hk=hwd(K,x1-xa,h),ht=hwd(K,cx-x1,h,K.spT);xa=sl+hk;xb=w-sl-ht;
  const s1=diag(K,xa,h,x1,0,{inB:0}),s2=diag(K,x1,0,cx-2,h,{thin:1,inA:0,inB:0}),s3=diag(K,cx+2,h,x2,0,{inA:0,inB:0}),s4=diag(K,x2,0,xb,h,{thin:1,inA:0});
  return [s1.st,s2.st,s3.st,s4.st,slab(K,xa,h,-1,{aL:hk,aR:hk}),slab(K,xb,h,-1,{aL:ht,aR:ht})];},883,'cap',0,2);
d('J',K=>{const {w,h}=K,x=w-K.sl-K.hx*1.2,yb=K.hy-K.ov,r=K.hx*0.62;
  const ns=nodes([[x,h-K.tt*0.5,-90],[x,h*0.2,-90],[x-w*0.2,yb,180],[x-w*0.36,h*0.12,115]],K.tens),st=SKB.st(ns,'H','F');st.pen=K.spec;const E=endInfo(ns,false);
  return [st,slab(K,x,h,-1),tdrop(K,E.x,E.y,E.ux,E.uy,r)];},616,'cap',1,2);
d('Q',K=>{const {w,h}=K,cx=w/2,rx=(w-2*K.hx)/2,tl=nodes([[cx+rx*0.1,h*0.17],[cx+rx*0.62,-h*0.015],[w-K.hx*0.55,-h*0.07]],1),t=SKB.st(tl,'F','F');t.pen=K.spec;t.nodes[0].w=0.9;t.nodes[2].w=1.1;
  return [ovl(K,K.hx,w-K.hx,K.hy-K.ov,h-K.hy+K.ov),t];},653,'cap',2,0);
/* ===== кириллические прописные ===== */
const Dtop=(K,hw)=>0;
d('Б',K=>{const {L,w,h}=K,yt=h-K.hyb,xe=w-K.sl*0.4,ym=h*0.56,xr=w-K.hx-K.sl*0.15;
  return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),K.bar(L,xe,yt),beak(K,xe,yt-K.hyb,-1,1),bowlR(K,L,xr,K.hyb,ym)];},394,'cap',2);
d('В',K=>FN.B(K),520,'cap',2);
d('Г',K=>{const {L,h,w}=K,yt=h-K.hyb,xe=w-K.sl*0.4;return [...stemS(K,L,0,h,{head:{r:0}}),K.bar(L,xe,yt),beak(K,xe,yt-K.hyb,-1,1)];},365,'cap',1);
d('П',K=>{const {L,R,h}=K,yt=h-K.hyb;return [...stemS(K,L,0,h,{head:{r:0}}),...stemS(K,R,0,h,{head:{l:0}}),K.bar(L,R,yt)];},515,'cap',2);
d('И',K=>{const {L,R,h}=K,y0=h-K.hy*0.3,dg=diag(K,R,y0,L,K.hy*0.3,{thin:1,inA:0,inB:0});return [...stemS(K,L,0,h),...stemS(K,R,0,h),dg.st];},547,'cap',2);
d('Л',K=>{const {w,h,cx}=K,sl=K.sl,a1=cx-2,a2=cx+2;let xL=sl+K.hx,xR=w-sl-K.hx;
  for(let i=0;i<3;i++){xL=sl+hwd(K,a1-xL,h,K.spT);xR=w-sl-hwd(K,xR-a2,h);}
  const l=diag(K,xL,0,a1,h,{thin:1,inB:0}),r=diag(K,xR,0,a2,h,{inB:0});
  return [l.st,r.st,slab(K,xL,0,1,{sk:l.sk,aL:l.hw,aR:l.hw,r:K.sl*0.4}),slab(K,xR,0,1,{sk:r.sk,aL:r.hw,aR:r.hw,l:K.sl*0.4})];},589,'cap',0,2);
d('Д',K=>{const {w,h,cx}=K,sl=K.sl,yb=K.hyb*2,fd=h*0.15,xe0=K.sl*0.35,xe1=w-xe0,a1=cx-2,a2=cx+2;let xL=sl*1.35+K.hx,xR=w-xL;
  for(let i=0;i<3;i++){xL=sl*1.35+hwd(K,a1-xL,h-yb,K.spT);xR=w-sl*1.35-hwd(K,xR-a2,h-yb);}
  const l=diag(K,xL,yb-1,a1,h,{thin:1,inA:0,inB:0}),r=diag(K,xR,yb-1,a2,h,{inA:0,inB:0});
  return [l.st,r.st,K.bar(xe0,xe1,K.hyb),beak(K,xe1,0,-1,1,{h:fd,bl:K.sl*1.1}),beak(K,xe0,0,-1,-1,{h:fd,bl:K.sl*1.1}),slab(K,xL,yb,1,{sk:l.sk,aL:l.hw,aR:l.hw,r:K.sl*0.4}),slab(K,xR,yb,1,{sk:r.sk,aL:r.hw,aR:r.hw,l:K.sl*0.4})];},675,'cap',0,2);
d('Ж',K=>{const {w,h,cx}=K,sl=K.sl,ym=h*0.5,xl=sl+hwd(K,1,2.2),xr=w-xl,xj=K.hx*0.6;
  const ys=(xa,ya,xb,yb,x)=>ya+(yb-ya)*(x-xa)/(xb-xa),xs=K.hx*1.0;
  const a=diag(K,xl,h,cx-xs,ys(xl,h,cx-xj,ym+K.hy,cx-xs),{inB:0,eb:'V'}),b=diag(K,cx-xs,ys(cx-xj,ym-K.hy,xl,0,cx-xs),xl,0,{thin:1,inA:0,ea:'V'}),c=diag(K,xr,h,cx+xs,ys(xr,h,cx+xj,ym+K.hy,cx+xs),{thin:1,inB:0,eb:'V'}),e=diag(K,cx+xs,ys(cx+xj,ym-K.hy,xr,0,cx+xs),xr,0,{inA:0,ea:'V'});
  const I=K.sl*0.5,sf={L:K.sl*0.75};return [...stemS(K,cx,0,h,{foot:sf,head:sf}),a.st,b.st,c.st,e.st,slab(K,xl,h,-1,{sk:a.sk,aL:a.hw,aR:a.hw,r:I}),slab(K,xr,h,-1,{sk:c.sk,aL:c.hw,aR:c.hw,l:I}),slab(K,xl,0,1,{sk:b.sk,aL:b.hw,aR:b.hw,r:I}),slab(K,xr,0,1,{sk:e.sk,aL:e.hw,aR:e.hw,l:I})];},773,'cap',1,4);
const sZe=(K,tw)=>{const {w,h}=K,xl=K.hx,xr=w-K.hx,cx=w/2,yt=h+K.ov-K.hy,yb=K.hy-K.ov,ym=h*0.535,xm=cx-w*0.02;
  const t=nodes([[xl+w*0.06,h*0.8],[cx,yt,0],[xr-w*0.06,(yt+ym)/2+h*0.02,-90],[xm+w*0.06,ym+K.hy*0.2,180],[xm-w*0.02,ym+K.hy*0.2,180]],K.tens);
  const b=nodes([[xm-w*0.04,ym-K.hy*0.2,0],[xm+w*0.1,ym-K.hy*0.2,0],[xr,(ym+yb)/2,-90],[cx,yb,180],[xl+w*0.04,h*0.2]],K.tens);
  t[0].w=0.5;b[b.length-1].w=0.5;const s1=SKB.st(t,'V','F'),s2=SKB.st(b,'F','V');if(K.m!==1){s1.pen=K.spec;s2.pen=K.spec;}
  return [s1,s2,endBeak(K,t,0,-1,-1),endBeak(K,b,b.length-1,1,-1)];};
d('З',K=>sZe(K),428,'cap',2,0);
d('Э',K=>{K.apx=Math.max(0,K.p.stem-96)*0.4;/* mirrored pen: at Black the two terminals would meet at the bar level */const r=skMirX(FN['Є'](K),K.w);K.apx=0;return r;},533,'cap',2,0);
d('Є',K=>{const {w,h}=K,cx=w/2+K.hx*0.08,cy=h/2,rx=(w-2*K.hx)/2;
  const wv=nodes([[cx-rx,cy+h*0.012,0],[cx-rx*0.4,cy+h*0.045,8],[cx+rx*0.12,cy+h*0.005,-8],[cx+rx*0.45,cy+h*0.04,12],[cx+rx*0.55,cy+h*0.012,-80]],K.tens),wb=SKB.st(wv,'H','F');wb.pen=K.spec;wv[4].w=0.7;wv[0].w=0.9;
  return [...FN.C(K),wb];},533,'cap',2,0);
d('Ф',K=>{const {w,h,cx}=K,rx=(w-2*K.hx)/2;return [...stemS(K,cx,0,h),ovl(K,K.hx,w-K.hx,h*0.16,h*0.86)];},635,'cap',2,2);
d('Ц',K=>{const {L,R,h}=K,dd=0;
  return [...stemS(K,L,0,h),stem(K,R,-dd+K.tt*0.5,h-K.tt*0.5),slab(K,R,h,-1),...tailF(K,R),K.bar(L,R,K.hyb)];},511,'cap',2);
d('Ч',K=>{const {L,R,cx,h}=K;return [...stemS(K,L,h*0.5,h,{noFoot:true}),pst(K,[[L,h*0.62,-90],[L,h*0.5,-90],[L+(R-L)*0.4,h*0.34,0],[R,h*0.36,0]],'J','J'),...stemS(K,R,0,h)];},459,'cap',2);
d('Ш',K=>{const {L,R,cx,h}=K;return [...stemS(K,L,0,h,{foot:{r:0}}),...stemS(K,cx,0,h,{noFoot:true}),...stemS(K,R,0,h,{foot:{l:0}}),K.bar(L,R,K.hyb)];},726,'cap',3);
d('Щ',K=>{const {L,R,cx,h,w}=K,dd=0,xt=R;return [...stemS(K,L,0,h,{foot:{r:0}}),...stemS(K,cx,0,h,{noFoot:true}),...stemS(K,R,0,h,{noFoot:true}),K.bar(L,R+K.hx,K.hyb),slab(K,R,h,-1)].slice(0,-1).concat([stem(K,R,-dd+K.tt*0.5,h-K.tt*0.5),...tailF(K,R)]);},738,'cap',3);
d('Ь',K=>{const {L,w,h}=K,xr=w-K.hx-K.sl*0.1;return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),bowlR(K,L,xr,K.hyb,h*0.58)];},391,'cap',2);
d('Ъ',K=>{const {w,h}=K,L=K.L+K.sl*1.1,xr=w-K.hx-K.sl*0.1,xa=K.sl*0.3,yt=h-K.hyb;return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),bowlR(K,L,xr,K.hyb,h*0.58),K.bar(xa,L,yt),beak(K,xa,yt-K.hyb,-1,-1)];},533,'cap',2);
d('Ы',K=>{const {L,w,h}=K,xr=w-K.hx*3-Math.max(K.sl,SL0)*2.2;return [...stemS(K,L,0,h,{head:{r:0},foot:{r:0}}),bowlR(K,L,xr,K.hyb,h*0.58),...stemS(K,w-K.L,0,h)];},635,'cap',3);
d('Ю',K=>{const {L,w,h}=K,xo=L+K.hx+K.sl*0.4+h*0.12;return [...stemS(K,L,0,h),K.bar(L,xo+K.hx,h*0.5),ovl(K,xo,w-K.hx,K.hy-K.ov,h-K.hy+K.ov)];},823,'cap',2,1);
d('Я',K=>skMirX(FN.R(K),K.w),570,'cap',2,2);
d('Ґ',K=>{const {L,h,w}=K,yt=h-K.hyb,xe=w-K.sl*0.7,up=K.spT;const v=spur(K,xe-K.hx*0.15,yt,h*1.065,K.hx*1.15,K.hx*0.62);
  return [...stemS(K,L,0,h,{head:{r:0}}),K.bar(L,xe,yt),v];},358,'cap',1);
/* амперсанд: классический — верхняя петля, круглая нижняя чаша, диагональная нога с клиновой засечкой */
d('У',K=>{const {w,h,cx}=K,sl=K.sl,xa=sl+hwd(K,1,-2.2),xb=w-sl-hwd(K,1,2,K.spT),yj=h*0.35,xe=w*0.18;
  const ns=nodes([[xb,h-K.tt*0.5],[cx+w*0.03,h*0.42],[w*0.3,h*0.1],[xe,K.hy+h*0.0,180]],K.tens);
  const a=diag(K,xa,h,cx-w*0.02,h*0.4,{inB:0}),st=SKB.st(ns,'H','R');st.pen=K.spM;const E=endInfo(ns,false);
  const ap=trimDiag(K,xa,h,cx-w*0.02,h*0.4,[xb,h-K.tt*0.5],[cx+w*0.03,h*0.42]);
  return [ap,st,slab(K,xa,h,-1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,xb,h,-1,{aL:hwd(K,1,2,K.spT),aR:hwd(K,1,2,K.spT)})];},516,'cap',1,2);
/* ===== строчные латинские ===== */
const lstem=(K,x,yTop,o)=>{o=o||{};const out=[stem(K,x,K.tt*0.5,yTop,{f1:1})];if(!o.noFoot)out.push(slab(K,x,0,1,o.foot));if(!o.noHead)out.push(flag(K,x,yTop,o.head));return out;};
const archP=(K,xL,xR,o)=>{o=o||{};const h=K.h,yt=h+K.ov-K.hy,xm=xL+(xR-xL)*0.5;
  return pst(K,[[xL,h*0.5,76],[xm,yt,0],[xR,h*(o.ye||0.42),-90]],'J','J');};
d('n',K=>{const {L,R,h}=K;return [...lstem(K,L,h),archP(K,L,R),stem(K,R,K.tt*0.5,h*0.45),slab(K,R,0,1)];},385,'xh',2);
d('m',K=>{const {L,R,h}=K,xm=(L+R)/2;return [...lstem(K,L,h),archP(K,L,xm),stem(K,xm,K.tt*0.5,h*0.45),slab(K,xm,0,1),archP(K,xm,R),stem(K,R,K.tt*0.5,h*0.45),slab(K,R,0,1)];},603,'xh',3);
d('h',K=>{const {L,R,h}=K;return [...lstem(K,L,K.asc),archP(K,L,R),stem(K,R,K.tt*0.5,h*0.45),slab(K,R,0,1)];},385,'xh',2);
d('u',K=>{const {L,R,h,cx}=K,yb=K.hy-K.ov;
  return [stem(K,L,h*0.5,h,{f1:1}),flag(K,L,h),pst(K,[[L,h*0.55,-90],[L,h*0.3,-90],[cx+K.hx*0.2,yb,0],[R-K.hx*0.2,h*0.26,70],[R,h*0.5,90]],'J','J'),stem(K,R,K.tt*0.5,h,{f1:1}),flag(K,R,h),slab(K,R,0,1,{l:0})];},385,'xh',2);
d('r',K=>{const {L,h,w}=K,t=K.hx*1.8,yT=h+K.ov-K.hyb;
  return [...lstem(K,L,h),ribbon(K,L,yT,w*0.58,t,0.3)];},431,'xh',1);
d('i',K=>{const r=K.dr()*0.8;return [...lstem(K,K.cx,K.h),K.dot(K.cx+K.hx*0.15,Math.min(K.h+r*1.7+K.hy*0.8,K.asc-r*0.4),r)];},p=>2*slOf(p,hxOf(p,LCM))+2*hxOf(p,LCM)+60,'xh',1);
d('ı',K=>lstem(K,K.cx,K.h),p=>2*slOf(p,hxOf(p,LCM))+2*hxOf(p,LCM)+60,'xh',1);
d('l',K=>lstem(K,K.cx,K.asc),p=>2*slOf(p,hxOf(p,LCM))+2*hxOf(p,LCM)+60,'xh',1);
d('o',K=>[ovl(K,K.hx,K.w-K.hx,K.hy-K.ov,K.h-K.hy+K.ov)],392,'xh',2,0);
d('c',K=>{const {w,h}=K,cx=w/2+K.hx*0.1,cy=h/2,rx=(w-2*K.hx)/2,ry=h/2+K.ov-K.hy,a0=46,a1=324,ns=skArcN(cx,cy,rx,ry,a0,a1,K.tens);
  const st=SKB.st(ns,'F','V');st.pen=K.spec;const E=endInfo(ns,true);return [st,tdrop(K,E.x,E.y,E.ux,E.uy,K.hx*0.62),vbk(K,ns,false,1,{h:K.bh*0.85,bl:K.hx*1.1})];},350,'xh',2,0);
d('e',K=>{const {w,h}=K,cx=w/2,cy=h/2,rx=(w-2*K.hx)/2,ry=h/2+K.ov-K.hy,a1=308,ns=skArcN(cx,cy,rx,ry,0,a1,K.tens),st=SKB.st(ns,'F','V');st.pen=K.spec;ns[0].w=0.72;
  return [st,vbk(K,ns,false,1,{h:K.bh*0.5,bl:K.hx*0.8}),K.bar(cx-rx,cx+rx,cy+h*0.02)];},355,'xh',2,0);
d('s',K=>sS(K),319,'xh',2,0);
d('d',K=>{const {w,h}=K;return [ovl(K,K.hx,w-K.L+K.hx*0.1,K.hy-K.ov,h-K.hy+K.ov),...lstem(K,w-K.L,K.asc,{foot:{l:0}})];},385,'xh',2,1);
d('b',K=>{const {w,h}=K;return [ovl(K,K.L-K.hx*0.1,w-K.hx,K.hy-K.ov,h-K.hy+K.ov),...lstem(K,K.L,K.asc,{noFoot:true})];},382,'xh',2,1);
d('p',K=>{const {w,h}=K,dd=K.desc;return [ovl(K,K.L-K.hx*0.1,w-K.hx,K.hy-K.ov,h-K.hy+K.ov),stem(K,K.L,-dd+K.tt*0.5,h,{f1:1}),flag(K,K.L,h),slab(K,K.L,-dd,1)];},382,'xh',2,1);
d('q',K=>{const {w,h}=K,dd=K.desc,x=w-K.L;return [ovl(K,K.hx,x+K.hx*0.1,K.hy-K.ov,h-K.hy+K.ov),stem(K,x,-dd+K.tt*0.5,h,{f1:1}),slab(K,x,-dd,1)];},385,'xh',2,1);
d('a',K=>{const {w,h}=K,xs=w-K.L,xl=K.hx;
  const ns=nodes([[xl+w*0.06,h*0.75,62],[xl+w*0.2,h-K.hy+K.ov*0.5,10],[xs-K.hx*0.2,h*0.62,-85],[xs,h*0.5,-90]],K.tens);
  const top=SKB.st(ns,'F','H');top.pen=K.spec;ns[0].w=0.8;const E=endInfo(ns,true);
  return [top,tdrop(K,E.x,E.y,E.ux,E.uy,K.hx*0.56),stem(K,xs,K.tt*0.5,h*0.55,{f1:1}),slab(K,xs,0,1,{l:0}),ovl(K,xl,xs-K.hx*0.35,K.hy-K.ov,h*0.6)];},336,'xh',2,1);
d('f',K=>{const {w,h}=K,xs=w*0.38,r=w*0.3,yt=K.asc-K.hy,ns=nodes([[xs,0.0+K.tt*0.5,90],[xs,yt-r,90],[xs+r*0.6,yt,0],[xs+r*1.3,yt-r*0.02,-22]],K.tens);
  const st=SKB.st(ns,'H','V');st.pen=K.spec;return [st,vbk(K,ns,false,-1,{h:K.bh*0.85,bl:K.hx*0.9}),slab(K,xs,0,1),K.bar(0+K.sl*0.3,w-K.sl*0.2,h-K.hyb),beak(K,w-K.sl*0.2,h-K.hyb*2,-1,1,{h:K.bh*0.6}),beak(K,K.sl*0.3,h-K.hyb*2,-1,-1,{h:K.bh*0.6})];},266,'xh',1,2);
d('t',K=>{const {w,h}=K,xs=w*0.42,yt=h+(K.asc-h)*0.42;
  return [stem(K,xs,K.tt*0.5,yt,{f1:1,c1:{cut:[1,0.32]}}),slab(K,xs,0,1),K.bar(K.sl*0.3,w-K.sl*0.3,h-K.hyb),beak(K,w-K.sl*0.3,h-K.hyb*2,-1,1,{h:K.bh*0.6}),beak(K,K.sl*0.3,h-K.hyb*2,-1,-1,{h:K.bh*0.6})];},279,'xh',1,2);
d('g',K=>{const {w,h}=K,xl=K.hx,xr=w-K.hx,dd=K.desc,cx=w/2,hy=K.hy;
  const ux0=xl+w*0.02,ux1=xr-w*0.02,uy0=h*0.34,uy1=h-hy+K.ov,lx0=xl-w*0.03,lx1=xr+w*0.03,ly0=-dd+hy,ly1=-dd*0.2;
  const ub=ovl(K,ux0,ux1,uy0,uy1),lb=ovl(K,lx0,lx1,ly0,ly1);
  const ucx=(ux0+ux1)/2,ucy=(uy0+uy1)/2,urx=(ux1-ux0)/2,ury=(uy1-uy0)/2,lcx=(lx0+lx1)/2,lcy=(ly0+ly1)/2,lrx=(lx1-lx0)/2,lry=(ly1-ly0)/2,a=D2*232,b=D2*52;
  const ln=nodes([[ucx+urx*Math.cos(a),ucy+ury*Math.sin(a),-48],[cx+w*0.1,h*0.06,-20],[lcx+lrx*Math.cos(b),lcy+lry*Math.sin(b),-60]],K.tens),link=SKB.st(ln,'F','F');link.pen=K.spT;
  const en=nodes([[ucx+urx*0.2,uy1,10],[xr+K.hx*0.55,h*1.0,20]],K.tens),ear=SKB.st(en,'F','R');ear.pen=K.spT;en[1].w=0.9;
  return [ub,lb,link,ear];},331,'xh',2,1);
d('j',K=>{const x=K.cx,dd=K.desc,r=K.dr()*0.8,ns=nodes([[x,K.h,-90],[x,-dd*0.45,-90],[x-K.sl*0.9,-dd+K.hy,180],[x-K.sl*1.4-K.hx*0.9,-dd*0.58,110]],K.tens),st=SKB.st(ns,'H','R');st.pen=K.spec;ns[2].w=0.75;ns[3].w=0.42;
  return [st,flag(K,x,K.h),K.dot(x+K.hx*0.15,Math.min(K.h+r*1.7+K.hy*0.8,K.asc-r*0.4),r)];},p=>2*slOf(p,hxOf(p,LCM))+2*hxOf(p,LCM)+60,'xh',1);
d('k',K=>{const {L,w,h}=K,xt=w-K.sl*0.5-hwd(K,1,2,K.spT),xb=w-K.sl*0.4-hwd(K,1,-2),yj=h*0.34,t=0.5,xm=L+(xt-L)*t,ym=yj+(h-yj)*t;
  const arm=diag(K,L,yj,xt,h,{thin:1,inA:0,inB:0}),leg=diag(K,xm,ym,xb,0,{inA:0});
  return [...lstem(K,L,K.asc),arm.st,legP(K,L,yj,xt,h,xm,ym,xb),slab(K,xb,0,1,{sk:leg.sk,aL:leg.hw,aR:leg.hw}),slab(K,xt,h,-1,{sk:arm.sk,aL:arm.hw,aR:arm.hw,l:K.sl*0.15,r:K.sl*0.55})];},334,'xh',2,2);
d('v',K=>{const {w,h,cx}=K,sl=K.sl,a1=cx-2,a2=cx+2;let xL=sl+K.hx,xR=w-sl-K.hx;
  for(let i=0;i<3;i++){xL=sl+hwd(K,a1-xL,h);xR=w-sl-hwd(K,xR-a2,h,K.spT);}
  const l=diag(K,xL,h,a1,0,{inB:0}),r=diag(K,xR,h,a2,0,{thin:1,inB:0});
  return [l.st,r.st,flag(K,xL,h,{aL:l.hw,sk:l.sk}),slab(K,xR,h,-1,{sk:r.sk,aL:r.hw,aR:r.hw,l:K.sl*0.3})];},434,'xh',0,2);
d('w',K=>{const {w,h,cx}=K,sl=K.sl;let xa=sl+K.hx*1.6,xb=w-xa;const x1=w*0.285,x2=w*0.715;
  const hk=hwd(K,x1-xa,h),ht=hwd(K,cx-x1,h,K.spT);xa=sl+hk;xb=w-sl-ht;
  const s1=diag(K,xa,h,x1,0,{inB:0}),s2=diag(K,x1,0,cx-2,h,{thin:1,inA:0,inB:0}),s3=diag(K,cx+2,h,x2,0,{inA:0,inB:0}),s4=diag(K,x2,0,xb,h,{thin:1,inA:0});
  return [s1.st,s2.st,s3.st,s4.st,flag(K,xa,h,{aL:hk,sk:s1.sk}),slab(K,xb,h,-1,{sk:s4.sk,aL:ht,aR:ht})];},657,'xh',0,2);
d('x',K=>{const {w,h}=K,sl=K.sl,x0=sl+K.hx*0.9,x1=w-x0;const a=diag(K,x0,0,x1,h,{thin:1}),b=diag(K,x1,0,x0,h);
  return [a.st,b.st,slab(K,x0,0,1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,x1,0,1,{sk:b.sk,aL:b.hw,aR:b.hw}),slab(K,x1,h,-1,{sk:a.sk,aL:a.hw,aR:a.hw}),slab(K,x0,h,-1,{sk:b.sk,aL:b.hw,aR:b.hw})];},420,'xh',0,2);
d('y',K=>{const {w,h}=K,sl=K.sl,dd=K.desc,xa=sl+hwd(K,1,-2.2),xb=w-sl-hwd(K,1,2,K.spT),xe=w*0.1;
  const ns=nodes([[xb,h-K.tt*0.5],[w*0.46,h*0.08],[w*0.3,-dd*0.5],[xe+w*0.05,-dd+K.hy*1.6,165]],K.tens),st=SKB.st(ns,'H','R');st.pen=K.spT;ns[3].w=0.8;
  const a=diag(K,xa,h,w*0.47,h*0.1,{inB:0}),ap=trimDiag(K,xa,h,w*0.47,h*0.1,[xb,h-K.tt*0.5],[w*0.46,h*0.08]);
  return [ap,st,flag(K,xa,h,{aL:a.hw,sk:a.sk}),slab(K,xb,h,-1,{aL:hwd(K,1,2,K.spT),aR:hwd(K,1,2,K.spT)})];},400,'xh',1,2);
d('z',K=>{const {w,h}=K,xa=K.sl*0.35,xe=w-xa,yt=h-K.hyb,yb=K.hyb,dg=zDiag(K,xa,xe,yt,yb,0);
  return [K.bar(xa,xe,yt),K.bar(xa,xe,yb),dg,beak(K,xa,yt-K.hyb,-1,-1,{h:K.bh*0.7}),beak(K,xe,yb+K.hyb,1,1,{h:K.bh*0.7})];},382,'xh',1,0);
/* ===== строчные кириллические ===== */
d('б',K=>{const {w,h}=K,xl=K.hx,t=K.hx*1.55,yT=Math.min(K.asc*0.95,h*1.45)-K.hx*0.9;
  return [ovl(K,xl,w-K.hx,K.hy-K.ov,h-K.hy+K.ov),ribbon(K,xl,yT,w*0.93,t,0.95,1.04,h*0.5)];},364,'xh',2,0);
d('в',K=>FN.B(K),353,'xh',2);
d('г',K=>{const {L,h,w}=K,yt=h-K.hyb,xe=w-K.sl*0.4;return [...lstem(K,L,h),K.bar(L,xe,yt),beak(K,xe,yt-K.hyb,-1,1,{h:K.bh*0.8})];},308,'xh',1);
d('д',K=>{const {L,R,h,w}=K,yb=K.tb,xe0=K.sl*0.25,xe1=w-xe0,fd=h*0.17;
  const xe2=L+K.hx*0.7,xa=R-K.hx*0.35,ya=h-K.hy*1.6,ns=nodes([[xa,ya,-124],[xe2,yb-4,-103]],K.tens),leg=SKB.st(ns,'H','H');leg.pen=K.spT;
  return [stem(K,R,yb,h,{f1:1}),flag(K,R,h),slab(K,R,yb-4,1,{L:K.sl*0.5}),leg,K.bar(xe0,xe1,K.hyb),beak(K,xe1,0,-1,1,{h:fd,bl:K.sl*1.1}),beak(K,xe0,0,-1,-1,{h:fd,bl:K.sl*1.1})];},521,'xh',0,2);
d('ж',K=>FN['Ж'](K),700,'xh',1,4);
d('з',K=>sZe(K),311,'xh',2,0);
d('и',K=>{const {L,R,h}=K,y0=h-K.hy*0.3,dg=diag(K,R,y0,L,K.hy*0.3,{thin:1,inA:0,inB:0});return [...lstem(K,L,h),...lstem(K,R,h),dg.st];},390,'xh',2);
d('к',K=>{const {L,w,h}=K,xt=w-K.sl*0.5-hwd(K,1,2,K.spT),xb=w-K.sl*0.4-hwd(K,1,-2),yj=h*0.34,t=0.5,xm=L+(xt-L)*t,ym=yj+(h-yj)*t;
  const arm=diag(K,L,yj,xt,h,{thin:1,inA:0,inB:0}),leg=diag(K,xm,ym,xb,0,{inA:0});
  return [...lstem(K,L,h),arm.st,legP(K,L,yj,xt,h,xm,ym,xb),slab(K,xb,0,1,{sk:leg.sk,aL:leg.hw,aR:leg.hw}),slab(K,xt,h,-1,{sk:arm.sk,aL:arm.hw,aR:arm.hw,l:K.sl*0.15,r:K.sl*0.55})];},334,'xh',2,2);
d('л',K=>{const {L,R,h}=K,r=K.hx*0.62;
  const xe=L+K.hx*0.7,xa=R-K.hx*0.35,ya=h-K.hy*1.6,ns=nodes([[xa,ya,-124],[xe,K.tt*0.5,-103]],K.tens),leg=SKB.st(ns,'H','H'),hw=hwd(K,-0.28,-1,K.spT);leg.pen=K.spT;
  return [...lstem(K,R,h,{head:{}}),leg,slab(K,xe,0,1,{sk:0.28,aL:hw,aR:hw,l:K.sl*0.7,r:K.sl*0.7})];},512,'xh',0,2);
d('м',K=>{const {L,R,h,cx}=K,y0=h-K.hy*0.3;
  const l=diag(K,L,y0,cx-2,0,{inA:0,inB:0}),r=diag(K,cx+2,0,R,y0,{thin:1,inA:0,inB:0});
  return [...lstem(K,L,h),...lstem(K,R,h),l.st,r.st];},540,'xh',2);
d('н',K=>{const {L,R,h}=K;return [...lstem(K,L,h),...lstem(K,R,h),K.bar(L,R,h*0.5)];},385,'xh',2);
d('п',K=>{const {L,R,h}=K,yt=h-K.hyb;return [...lstem(K,L,h,{noHead:true}),...lstem(K,R,h,{noHead:true}),K.bar(L,R,yt),slab(K,L,h,-1,{r:0}),slab(K,R,h,-1,{l:0})];},387,'xh',2);
d('т',K=>FN.T(K),399,'xh',1,2);
d('ф',K=>{const {w,h,cx}=K,dd=K.desc,ya=Math.min(K.asc,h*1.27);return [stem(K,cx,-dd+K.tt*0.5,ya,{f1:1}),flag(K,cx,ya,{L:K.sl*2.3,T:K.tt*1.3}),slab(K,cx,-dd,1),ovl(K,K.hx,w-K.hx,h*0.04,h*0.92)];},503,'xh',2,2);
d('ц',K=>{const {L,R,h}=K,dd=0;return [...lstem(K,L,h),stem(K,R,-dd+K.tt*0.5,h,{f1:1}),flag(K,R,h),...tailF(K,R,K.hx*2.1),K.bar(L,R,K.hyb)];},393,'xh',2);
d('ч',K=>{const {L,R,h}=K;return [stem(K,L,h*0.45,h,{f1:1}),flag(K,L,h),pst(K,[[L,h*0.6,-90],[L,h*0.45,-90],[L+(R-L)*0.4,h*0.3,0],[R,h*0.32,0]],'J','J'),...lstem(K,R,h)];},345,'xh',2);
d('ш',K=>{const {L,R,cx,h}=K;return [...lstem(K,L,h,{foot:{r:0}}),...lstem(K,cx,h,{noFoot:true}),...lstem(K,R,h,{foot:{l:0}}),K.bar(L,R,K.hyb)];},554,'xh',3);
d('щ',K=>{const {L,R,cx,h}=K,dd=0;return [...lstem(K,L,h,{foot:{r:0}}),...lstem(K,cx,h,{noFoot:true}),stem(K,R,-dd+K.tt*0.5,h,{f1:1}),flag(K,R,h),...tailF(K,R,K.hx*2.1),K.bar(L,R,K.hyb)];},592,'xh',3);
d('ь',K=>{const {L,w,h}=K,xr=w-K.hx-K.sl*0.1;return [...lstem(K,L,h,{foot:{r:0}}),bowlR(K,L,xr,K.hyb,h*0.6)];},320,'xh',2);
d('ъ',K=>{const {w,h}=K,L=K.L+K.sl*1.0,xr=w-K.hx-K.sl*0.1,xa=K.sl*0.25,yt=h-K.hyb;return [...lstem(K,L,h,{foot:{r:0},noHead:true}),slab(K,L,h,-1,{l:0}),K.bar(xa,L,yt),beak(K,xa,yt-K.hyb,-1,-1,{h:K.bh*0.7}),bowlR(K,L,xr,K.hyb,h*0.6)];},430,'xh',2);
d('ы',K=>{const {L,w,h}=K,xr=w-K.hx*3-Math.max(K.sl,SL0)*2.2;return [...lstem(K,L,h,{foot:{r:0}}),bowlR(K,L,xr,K.hyb,h*0.6),...lstem(K,w-K.L,h)];},484,'xh',3);
d('э',K=>skMirX(F.GL['є'].skel(K.g),K.w),326,'xh',2,0);
d('є',K=>{const {w,h}=K,cx=w/2+K.hx*0.1,cy=h/2,rx=(w-2*K.hx)/2;return [...FN.c(K),K.bar(cx-rx*1.0,cx+rx*0.6,cy+h*0.02)];},322,'xh',2,0);
d('ю',K=>{const {L,w,h}=K,xo=L+K.hx+K.sl*0.4+h*0.12;return [...lstem(K,L,h),K.bar(L,xo+K.hx,h*0.5),ovl(K,xo,w-K.hx,K.hy-K.ov,h-K.hy+K.ov)];},563,'xh',2,1);
d('я',K=>skMirX(FN.R(K),K.w),345,'xh',2,2);
d('ґ',K=>{const {L,h,w}=K,yt=h-K.hyb,xe=w-K.sl*0.6,v=spur(K,xe-K.hx*0.15,yt,h*1.12,K.hx*1.15,K.hx*0.62);return [...lstem(K,L,h),K.bar(L,xe,yt),v];},310,'xh',1);
/* ===== цифры: базовые — лайнинг (высота 0.97 прописной); onum (старый стиль) строится движком OTO по этим контурам ===== */
const DH=K=>K.capH*0.97,DD=K=>0;
const dg=(ch,fn,bw,nsl)=>d(ch,fn,bw,'cap',2,nsl==null?0:nsl);
dg('0',K=>[ovl(K,K.hx,K.w-K.hx,K.hy-K.ov,DH(K)-K.hy+K.ov)],422);
dg('1',K=>{const x=K.cx,H=DH(K);return [stem(K,x,K.tt*0.5,H,{f1:1}),flag(K,x,H,{L:K.sl*0.75}),slab(K,x,0,1)];},p=>2*slOf(p,hxOf(p))+2*hxOf(p)+30,2);
dg('2',K=>{const {w}=K,H=DH(K),xl=K.hx,xr=w-K.hx,cx=w/2;
  const ns=nodes([[xl+w*0.05,H*0.76,70,{w:BW(K)}],[cx,H+K.ov-K.hy,0,{w:BN(K)}],[xr,H*0.7,-90],[xr-w*0.12,H*0.4,-125],[xl+w*0.04,K.hyb*0.9,-160]],K.tens),st=SKB.st(ns,'R','H');st.pen=K.spec;
  return [st,K.bar(xl,xr,K.hyb),K.bar(xr-K.hx,xr+K.hx*1.5,K.hyb),beak(K,xr+K.hx*1.5,K.hyb*2,1,1,{h:K.bh*1.3})];},338);
dg('3',K=>{const {w}=K,H=DH(K),xl=K.hx,xr=w-K.hx,cx=w/2,yt=H+K.ov-K.hy,yb=K.hy-K.ov,ym=H*0.52;
  const t=nodes([[xl+w*0.05,H*0.78,70,{w:BW(K)}],[cx,yt,0,{w:BN(K)}],[xr-w*0.08,(yt+ym)/2+H*0.04,-90],[cx+w*0.02,ym+K.hy*0.2,180],[cx-w*0.1,ym+K.hy*0.2,180]],K.tens);
  const b=nodes([[cx-w*0.12,ym-K.hy*0.2,0],[cx+w*0.06,ym-K.hy*0.2,0],[xr,(ym+yb)/2+H*0.04,-90],[cx,yb,180],[xl+w*0.04,yb+H*0.22,95,{w:BW(K)}]],K.tens);
  const s1=SKB.st(t,'R','F'),s2=SKB.st(b,'F','R');s1.pen=K.spec;s2.pen=K.spec;return [s1,s2];},369);
dg('4',K=>{const {w}=K,H=DH(K),xs=w*0.66,dd=DD(K),yb=H*0.3,x0=K.hx+K.sl*0.2,xa=xs-K.hx*0.3,yt=H-K.tt*0.2,s=(xa-x0)/(H-yb),hw=hwd(K,xa-x0,H-yb);
  const yR=yb+(xs-(x0+hw))/s,b=PB();b.M(x0-hw,yb).L(x0+hw,yb).L(xs,yR).L(xs,yt).L(x0-hw+s*(yt-yb),yt);
  return [stem(K,xs,-dd+K.tt*0.5,H),slab(K,xs,H,-1,{L:K.sl*0.3}),slab(K,xs,-dd,1),SPo(x0,yb,b),K.bar(K.sl*0.2,w-K.hx*0.3-K.sl*0.2,yb)];},467,2);
dg('5',K=>{const {w}=K,H=DH(K),xl=K.hx,xr=w-K.hx,cx=w/2,yb=K.hy-K.ov,yt=H-K.hyb,xa=xl+w*0.12;
  const ns=nodes([[xa,yt,-90],[xa-w*0.02,H*0.5,-90],[cx-w*0.04,H*0.58,6],[xr,(H*0.55+yb)/2+H*0.05,-90],[cx,yb,180],[xl+w*0.04,yb+H*0.2,95,{w:BW(K)}]],K.tens),st=SKB.st(ns,'H','R');st.pen=K.spec;
  return [st,K.bar(xa,xr-w*0.05,yt),beak(K,xr-w*0.05,yt-K.hyb,-1,1,{h:K.bh*0.8}),slab(K,xa,H,-1,{r:0,L:K.sl*0.6})];},368);
dg('6',K=>{const {w}=K,cH=DH(K),xl=K.hx,xr=w-K.hx,cx=w/2;
  const ns=nodes([[xl,cH*0.34,90],[xl+w*0.04,cH*0.7,82],[cx+w*0.08,cH-K.hy+K.ov*0.5,6,{w:BN(K)}],[xr-w*0.04,cH*0.9,-40,{w:BW(K)}]],K.tens),arm=SKB.st(ns,'J','R');arm.pen=K.spec;
  return [ovl(K,xl,xr,K.hy-K.ov,cH*0.64),arm];},401);
dg('7',K=>{const {w}=K,H=DH(K),xl=K.sl*0.3,xr=w-K.sl*0.3,yt=H-K.hyb,dd=DD(K),ns=nodes([[xr-w*0.2-K.hx*1.2,yt,null,{w:1.2}],[w*0.52,H*0.3,null,{w:1.2}],[w*0.4,-dd,null,{w:1.25}]],K.tens),st=SKB.st(ns,'H','H');st.pen=K.spec;
  const x0=xr-w*0.2-K.hx*1.2,hw7=hwd(K,w*0.52-x0,H*0.3-yt)*1.2,xb=Math.min(xr,x0+hw7);
  return [K.bar(xl,xb,yt),beak(K,xl,yt-K.hyb,-1,-1),st];},513);
dg('8',K=>{const {w}=K,cH=DH(K),xl=K.hx,xr=w-K.hx;return [ovl(K,xl,xr,K.hy-K.ov,cH*0.56),ovl(K,xl+w*0.07,xr-w*0.07,cH*0.56-K.hy*1.6,cH-K.hy+K.ov)];},401);
dg('9',K=>{const six=F.GL['6'].skel(K.g),cH=DH(K),sh=0;return skXf(six,(x,y)=>[K.w-x,cH-y+sh]).map(skReverse);},401);
/* ===== знаки, составные ===== */
skPunct(F);
/* FX2g: скобки — настоящие дуги пера (полумесяц: толстое чрево от широкого пера, тонкие концы), а не почти прямые планки */
{const parenR=(K,left)=>{const t=K.capH+K.desc*0.15,b=-K.desc*0.6,m=(t+b)/2,x0=K.L,x1=K.R-K.hx*0.15;
    const sk=[K.pa([[x1,t-K.hy,-128,{w:0.5}],[x0+K.hx*0.15,t*0.72+b*0.28,-98],[x0,m,-90,{w:1.12}],[x0+K.hx*0.15,b*0.72+t*0.28,-82],[x1,b+K.hy,128,{w:0.5}]],'T','T')];
    return left?sk:skMirX(sk,K.w);};
  d('(',K=>parenR(K,true),262,'cap',2,0);d(')',K=>parenR(K,false),262,'cap',2,0);}
/* FX2g: “ ‘ — ” ’ , повёрнутые на 180° (как „ из ”): те же ширина, перо и форма, верх по верху прописной */
for(const [o,c] of [['“','”'],['‘','’']]){const e=F.GL[c];
  d(o,K=>{const sk=e.skel(K.g),b=skBox(sk),r=K.dr()*0.9;
    let out=skXf(sk,(x,y)=>[b.x0+b.x1-x,b.y0+b.y1-y]).map(skReverse);
    try{const t=skYTop(skShape(out,F,K.p));if(isFinite(t)&&Math.abs(t-K.capH)>0.5){const dy=K.capH-t;out=out.map(s=>skXf([s],(x,y)=>[x,y+dy])[0]);}}catch(er){}
    return out;},e.w,'cap',2,0);}
/* амперсанд — после skPunct, иначе будет затёрт общим */
d('&',K=>{const {w,h}=K,L=K.hx*1.15,cx=w*0.45,H=h+K.ov-K.hy,xf=w*0.72,xa=w*0.86,yA=h*0.42,xl=cx-w*0.17;
  const ns=nodes([[xf,K.hyb*2,121],[(xf+xl)/2+w*0.015,h*0.44,118],[xl,h*0.8,104],[cx+w*0.03,H,0],[cx+w*0.21,h*0.8,-90],[cx+w*0.03,h*0.58,-135],[L,h*0.3,-90,{w:0.94}],[cx-w*0.02,K.hy-K.ov,0],[cx+w*0.2,h*0.1,35],[xa,h*0.3,86,{w:0.9}],[xa,yA,90,{w:0.75}]],K.tens),st=SKB.st(ns,'H','T');st.pen=K.spec;
  return [st,slab(K,xf+K.hx*0.4,0,1,{l:K.sl*0.6,r:K.sl*0.9,aL:K.hx*1.1,aR:K.hx*1.05})];},570,'cap',2);
d('$',K=>{const cx=K.w/2,t=K.hx*0.42,rc=(y0,y1)=>{const b=PB();b.M(cx-t,y0).L(cx+t,y0).L(cx+t,y1).L(cx-t,y1);return SP(cx,y0,b.done());};
  return [...sS(K),rc(K.capH*0.985,K.capH*1.1),rc(-K.capH*0.1,K.capH*0.015)];},480,'cap',2,0);
/* ===== диакритика «Ренессы»: тонкие штрихи (перо диагоналей), круглые точки не толще 0.6 ствола; у остальных шрифтов SKM без изменений ===== */
const RM={
  acute:(K,cx,y,d)=>{const t=SKB.L(cx-d.mw*0.2,y+K.hy*1.2,cx+d.mw*0.26,y+d.mh-K.hy,'F','F');t.pen=K.spT;t.nodes[0].w=0.65;t.nodes[1].w=1.2;return [t];},
  grave:(K,cx,y,d)=>{const t=SKB.L(cx+d.mw*0.2,y+K.hy*1.2,cx-d.mw*0.26,y+d.mh-K.hy,'F','F');t.pen=K.spT;t.nodes[0].w=0.65;t.nodes[1].w=1.2;return [t];},
  circ:(K,cx,y,d)=>{const t=SKB.P([[cx-d.mw*0.38,y+K.hy],[cx,y+d.mh-K.hy,null,{c:1,j:'miter'}],[cx+d.mw*0.38,y+K.hy]],'F','F');t.pen=K.spT;return [t];},
  caron:(K,cx,y,d)=>{const t=SKB.P([[cx-d.mw*0.38,y+d.mh-K.hy],[cx,y+K.hy,null,{c:1,j:'miter'}],[cx+d.mw*0.38,y+d.mh-K.hy]],'F','F');t.pen=K.spT;return [t];},
  dot:(K,cx,y,d)=>{const r=Math.min(K.hx*0.62,(d.avail||1e9)/2);return [SKB.D(cx,y+r,r)];},
  dier:(K,cx,y,d)=>{const r=Math.min(K.hx*0.58,(d.avail||1e9)/2),g=Math.max(r*2.0,d.mw*0.22);return [SKB.D(cx-g,y+r,r),SKB.D(cx+g,y+r,r)];},
  breve:(K,cx,y,d)=>{const a=d.mw*0.38,ry=d.avail?Math.min(d.mh*0.7,Math.max(d.mhMin*0.5,(d.avail-K.hy)/2)):d.mh*0.7;const t=K.arc(cx,y+ry+K.hy,a,ry,195,345,'F','F');t.pen=K.spT;return [t];},
  tilde:(K,cx,y,d)=>{const a=d.mw*0.46,lo=y+K.hy,hi=y+d.mh*0.75;const t=K.pa([[cx-a,lo+(hi-lo)*0.3],[cx-a*0.45,hi,0],[cx+a*0.45,lo,0],[cx+a,hi-(hi-lo)*0.3]],'F','F');t.pen=K.spT;return [t];}
};
for(const m in RM){const o0=SKM[m];SKM[m]=function(K,cx,y,d){return K.font===F?RM[m](K,cx,y,d):o0(K,cx,y,d);};}
F.after=()=>{skCompose(F,'Й','И',['breve']);skCompose(F,'й','и',['breve']);skCompose(F,'Ё','E',['dier']);skCompose(F,'ё','e',['dier']);skCompose(F,'Ї','I',['dier']);skCompose(F,'ї','ı',['dier']);};
F.after();
// --- registration (temporary for v0)
const P0={wdth:100,capH:700,xh:450,asc:745,desc:230,stem:82,hair:25,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:10,slant:0,sb:36,track:0,space:210,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:7,press:0,term:1,tens:1,conn:0,sb:36,ser:42,brk:40,hsl:24,ball:60,fla:40};
F.DEFAULTS={regular:{...P0},italic:{...P0,slant:9,icomp:40}};
F.lim={capH:[660,740],xhR:[0.6,0.68],ascA:[20,80],desc:[190,250],wdth:[96,108],ov:[8,12],stemK:0.3,hairR:[0.2,0.3],stem:[50,140],hair:[6,40],nib:[3,16],term:[1,1],tens:[1,1],ser:[28,52],brk:[0,40],hsl:[14,36],ball:[25,65],fla:[0,50]};
F.params={};
const HIDE=['diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','conn','term','tens','flare','slope','point','drop','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade'];
for(const k of HIDE)F.params[k]=null;
F.params.capH=['Высота прописных',F.lim.capH[0],F.lim.capH[1],1];F.params.desc=['Нижние выносные',F.lim.desc[0],F.lim.desc[1],1];F.params.wdth=['Ширина, %',F.lim.wdth[0],F.lim.wdth[1],1];
F.params.stem=["Основной штрих (ствол)",70,88,1];F.params.hair=["Тонкий штрих (перо)",14,26,1];F.params.nib=['Угол оси пера, °',F.lim.nib[0],F.lim.nib[1],1];
F.params.xh=['Высота строчных',F.lim.capH[0]*F.lim.xhR[0],F.lim.capH[1]*F.lim.xhR[1],1];F.params.asc=['Верхние выносные',F.lim.capH[0]+F.lim.ascA[0],F.lim.capH[1]+F.lim.ascA[1],1];
for(const k of RNP)F.params[k]=[(PARAMS.find(r=>r[0]===k)||[])[1]||k,F.lim[k][0],F.lim[k][1],1];
/* тонкий штрих не толще 0.3 ствола; x-высота и верхние выносные связаны с капителью */
const _paramLimits_ren=paramLimits;
paramLimits=function(p,font){const r=_paramLimits_ren(p,font);font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');
  if(font==='renessa'){const D=F.DEFAULTS.regular;for(const k of [...RNP,'nib']){const lim=F.lim[k];let v=r.q[k];if(v==null||!isFinite(+v))v=D[k];r.q[k]=Math.min(lim[1],Math.max(lim[0],+v));r.L[k]=lim.slice();}
    const st=r.q.stem!=null?+r.q.stem:D.stem,hr=p&&p.hair!=null&&isFinite(+p.hair)?+p.hair:D.hair;/* the pen's thin side is a live slider: its own range (the generic engine would pin it to 0.3 stem) */
    r.q.hair=Math.min(Math.max(F.lim.hair[0],Math.min(F.lim.hair[1],hr)),st*0.3);r.L.hair=F.lim.hair.slice();}
  return r;};
HX0=hxOf(P0);SL0=slOf(P0,HX0);
F.proof={stemSet:'HILEFTПШЩЦНЕГЬЪБДilпшщцьъгт',barSkip:'EFHZЕГНПТЗЭзэ3eFfтгнеhи',stemTol:0.22,desc:'34579',descX:0};
F.mkGap=0.4;
/* знаки препинания: поля растут с пером, чтобы тяжёлые веса не выходили за кегль */
for(const [c,b,k] of [['{',96,0.9],['}',96,0.9],['[',20,0.7],[']',20,0.7],['«',42,3.2],['»',42,3.2],['“',20,0.2],['”',20,0.2],['„',20,0.2]]){const e=F.GL[c];if(!e)continue;const w0=e.w;e.w=p=>w0(p)+b+k*Math.max(0,p.stem-F.S0);}
for(const c of ['”','„']){const e=F.GL[c];if(!e)continue;const s0=e.skel;e.skel=g=>{const sk=s0(g),cx=(g.w!=null?g.w:0)/2;return skXf(sk,(x,y)=>[cx+(x-cx)*0.8,y]);};}
F.nodeBudget=64;F.simpTol=0.7;
skRegister(F);
})();
