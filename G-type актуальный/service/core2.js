/* ===== VOLT: конструкции глифов (все из кривых) ===== */
const SH = {};
/* --- прописные --- */
SH.A=g=>{const {w,h,D,H}=g;const ex=w/2-D/2,yb=h*0.24,e1=ex*(yb+H)/h;
  return [DG(g,0,0,ex,h),DG(g,w-D,0,w-D-ex,h),R(g,e1+2,yb,w-e1-2,yb+H)];};
SH.B=g=>{const {w,h,S,Hr:H,RO,RI}=g;const ym=h*0.53,wt=w-S*0.2;
  return [R(g,0,ym-H/2,wt,h,[0,0,RO,0]),X(g,S,ym+H/2,wt-S,h-H,[0,0,RI,0]),
          R(g,0,0,w,ym+H/2,[0,RO,0,0]),X(g,S,H,w-S,ym-H/2,[0,RI,0,0])];};
SH.C=(g,mir)=>{const {w,h,S,Hr:H,sp,sw,RO,RI,ov}=g;const y0=-ov,y1=h+ov;
  let pts=[[0,y0,RO],[w,y0,0],[w,y0+sp+H,0],[w-sw,y0+sp+H,0],[w-sw,y0+H,0],[S,y0+H,RI],[S,y1-H,RI],[w-sw,y1-H,0],[w-sw,y1-sp-H,0],[w,y1-sp-H,0],[w,y1,0],[0,y1,RO]];
  if(mir)pts=pts.map(p=>[w-p[0],p[1],p[2]]);return [PG(g,pts)];};
SH.D=g=>{const {w,h,S,Hr:H,RO,RI}=g;return [R(g,0,0,w,h,[0,RO,RO,0]),X(g,S,H,w-S,h-H,[0,RI,RI,0])];};
SH.E=g=>{const {w,h,S,H,sp,sw}=g;const ym=h*0.53;
  return [R(g,0,0,S,h),R(g,0,0,w,H),R(g,0,h-H,w,h),R(g,0,ym-H/2,w*0.86,ym+H/2),R(g,w-sw,0,w,H+sp),R(g,w-sw,h-H-sp,w,h)];};
SH.F=g=>{const {w,h,S,H,sp,sw}=g;const ym=h*0.46;
  return [R(g,0,0,S,h),R(g,0,h-H,w,h),R(g,w-sw,h-H-sp,w,h),R(g,0,ym-H/2,w*0.82,ym+H/2)];};
SH.G=g=>{const {w,h,S,Hr:H,sp,sw,RO,RI,ov}=g;const y0=-ov,y1=h+ov,ym=h*0.46;
  return [PG(g,[[0,y0,RO],[w,y0,RO],[w,ym+H/2,0],[w*0.5,ym+H/2,0],[w*0.5,ym-H/2,0],[w-S,ym-H/2,0],[w-S,y0+H,RI],[S,y0+H,RI],[S,y1-H,RI],[w-sw,y1-H,0],[w-sw,y1-sp-H,0],[w,y1-sp-H,0],[w,y1,0],[0,y1,RO]])];};
SH.H=g=>{const {w,h,S,H}=g;const ym=h*0.53;return [R(g,0,0,S,h),R(g,w-S,0,w,h),R(g,S-2,ym-H/2,w-S+2,ym+H/2)];};
SH.I=g=>[R(g,0,0,g.S,g.h)];
SH.J=g=>{const {w,h,S,H,sp,sw,RO}=g;
  return [R(g,w-S,0,w,h,[0,RO,0,0]),R(g,0,0,w-S*0.5,H),R(g,0,0,sw,H+sp)];};
SH.K=g=>{const {w,h,S,D}=g;const ym=h*0.5;
  return [R(g,0,0,S,h),DG(g,0,ym*0.8,w-D,h),DG(g,w-D,0,0,ym*1.25)];};
SH.L=g=>{const {w,h,S,H,sp,sw}=g;return [R(g,0,0,S,h),R(g,0,0,w,H),R(g,w-sw,0,w,H+sp)];};
SH.M=g=>{const {w,h,S,D}=g;const hv=h*0.22,mx=w/2-D/2;
  return [R(g,0,0,S,h),R(g,w-S,0,w,h),DG(g,mx,hv,0,h),DG(g,mx,hv,w-D,h)];};
SH.N=g=>{const {w,h,S,D}=g;return [R(g,0,0,S,h),R(g,w-S,0,w,h),DG(g,w-D,0,0,h)];};
SH.O=g=>{const {w,h,S,Hr:H,RO,RI,ov}=g;return [R(g,0,-ov,w,h+ov,RO),X(g,S,H-ov,w-S,h+ov-H,RI)];};
SH.P=g=>{const {w,h,S,Hr:H,RO,RI}=g;const yb=h*0.38;
  return [R(g,0,0,S,h),R(g,0,yb,w,h,[0,RO,RO,0]),X(g,S,yb+H,w-S,h-H,[0,RI,RI,0])];};
SH.Q=g=>{const {w,D}=g;return [...SH.O(g),DG(g,w*0.52,-130,w*0.38,g.H*0.5,D*0.8)];};
SH.R=g=>{const {w,h,S,Hr:H,D,RO,RI}=g;const yb=h*0.38;
  return [R(g,0,0,S,h),R(g,0,yb,w,h,[0,RO,RO,0]),X(g,S,yb+H,w-S,h-H,[0,RI,RI,0]),DG(g,w-D,0,S*0.9,yb+H*0.6)];};
SH.S=(g,mir,sharp)=>{const {w,h,S,Hr:H,sp,sw,RO,RI,ov}=g;const y0=-ov,y1=h+ov,ym=h/2,r=sharp?0:RO;
  let pts=[[0,y0,0],[w,y0,r],[w,ym+H/2,0],[S,ym+H/2,RI],[S,y1-H,RI],[w-sw,y1-H,0],[w-sw,y1-H-sp,0],[w,y1-H-sp,0],[w,y1,0],[0,y1,r],[0,ym-H/2,0],[w-S,ym-H/2,RI],[w-S,y0+H,RI],[sw,y0+H,0],[sw,y0+H+sp,0],[0,y0+H+sp,0]];
  if(mir)pts=pts.map(p=>[w-p[0],p[1],p[2]]);return [PG(g,pts)];};
SH.T=g=>{const {w,h,S,H,sp,sw}=g;const mx=w/2-S/2;
  return [R(g,0,h-H,w,h),R(g,mx,0,mx+S,h),R(g,0,h-H-sp,sw,h),R(g,w-sw,h-H-sp,w,h)];};
SH.U=g=>{const {w,h,S,Hr:H,RO,RI,ov}=g;
  return [PG(g,[[0,h],[S,h],[S,H-ov,RI],[w-S,H-ov,RI],[w-S,h],[w,h],[w,-ov,RO],[0,-ov,RO]])];};
SH.V=g=>{const {w,h,D}=g;return [DG(g,w/2-D/2,0,0,h),DG(g,w/2-D/2,0,w-D,h)];};
SH.W=g=>{const {w,h,D}=g;const x1=w*0.25-D/2,x2=w*0.75-D/2,mp=w/2-D/2,py=h*0.62;
  return [DG(g,x1,0,0,h),DG(g,x1,0,mp,py),DG(g,x2,0,mp,py),DG(g,x2,0,w-D,h)];};
SH.X=g=>{const {w,h,D}=g;return [DG(g,0,0,w-D,h),DG(g,w-D,0,0,h)];};
SH.Y=g=>{const {w,h,S,D}=g;const cx=w/2,ym=h*0.42;
  return [DG(g,cx-D/2,ym,0,h),DG(g,cx-D/2,ym,w-D,h),R(g,cx-S/2,0,cx+S/2,ym+10)];};
SH.Z=g=>{const {w,h,H,D,sp,sw}=g;
  return [R(g,0,h-H,w,h),R(g,0,0,w,H),DG(g,0,0,w-D,h),R(g,0,h-H-sp,sw,h),R(g,w-sw,0,w,H+sp)];};
/* у / y со спуском */
SH.yy=(g,dsc)=>{const {w,h,D}=g;const xB=w*0.2,top=w-D,y0=-dsc,t=(h*0.4-y0)/(h-y0),xj=xB+(top-xB)*t;
  return [DG(g,xB,y0,top,h),DG(g,xj,h*0.4,0,h)];};
/* --- кириллица --- */
SH.Be=g=>{const {w,h,S,H,sp,sw,RO,RI}=g;const yb=h*0.56;
  return [R(g,0,0,S,h),R(g,0,h-H,w,h),R(g,w-sw,h-H-sp,w,h),R(g,0,0,w,yb,[0,RO,0,0]),X(g,S,H,w-S,yb-H,[0,RI,0,0])];};
SH.Ge=g=>{const {w,h,S,H,sp,sw}=g;return [R(g,0,0,S,h),R(g,0,h-H,w,h),R(g,w-sw,h-H-sp,w,h)];};
/* Д: корпус вписан между ножками, основание шире с «ножками» вниз */
SH.De=g=>{const {w,h,S,H}=g;const fd=SH.fd(g),m=w*0.09,xr=w-m,xt=m+w*0.13,tw=Math.max(S*0.62,H*1.1);
  return [R(g,0,0,w,H),R(g,0,-fd,tw,H),R(g,w-tw,-fd,w,H),R(g,xr-S,0,xr,h),R(g,xt,h-H,xr,h),DG(g,m,H*0.5,xt,h)];};
SH.fd=g=>Math.max((g.p.desc||200)*0.6,g.H*1.4,90);
SH.Zhe=g=>{const {w,h,S,D}=g;const cx=w/2,ym=h*0.5;
  return [R(g,cx-S/2,0,cx+S/2,h),DG(g,cx-D/2,ym,0,h),DG(g,cx-D/2,ym,0,0),DG(g,cx-D/2,ym,w-D,h),DG(g,cx-D/2,ym,w-D,0)];};
/* общая «С»-дуга в рамке: открыта слева (зеркальная), замкнута справа */
SH.Cg=(g,o)=>{const {S,Hr:H,sw,RO,RI}=g;const {x1,y0,y1,xt,xb,spT,spB}=o;
  return PG(g,[[x1,y0,RO],[xb,y0,0],[xb,y0+H+spB,0],[xb+sw,y0+H+spB,0],[xb+sw,y0+H,0],[x1-S,y0+H,RI],[x1-S,y1-H,RI],[xt+sw,y1-H,0],[xt+sw,y1-H-spT,0],[xt,y1-H-spT,0],[xt,y1,0],[x1,y1,RO]]);};
/* З: две дуги, верхняя уже нижней, на правой стороне виден перегиб; средние усы короче */
SH.Ze=g=>{const {w,h,S,Hr:H,sp,ov}=g;const ym=h*0.52,xm=w*0.27,wt=w-S*0.3;
  return [SH.Cg(g,{x1:wt,y0:ym-H/2,y1:h+ov,xt:0,xb:xm,spT:sp,spB:0}),SH.Cg(g,{x1:w,y0:-ov,y1:ym+H/2,xt:xm,xb:0,spT:0,spB:sp})];};
/* Э: одна замкнутая справа дуга и длинная перекладина */
SH.Ee=g=>{const {w,h,S,H,sp,ov}=g;const ym=h*0.53;
  return [SH.Cg(g,{x1:w,y0:-ov,y1:h+ov,xt:0,xb:0,spT:sp,spB:sp}),R(g,S*0.55,ym-H/2,w-S+2,ym+H/2)];};
SH.Ye=g=>{const {w,h,S,H}=g;const ym=h*0.53;return [...SH.C(g,false),R(g,S-2,ym-H/2,w*0.8,ym+H/2)];};
SH.Ii=g=>{const {w,h,S,D}=g;return [R(g,0,0,S,h),R(g,w-S,0,w,h),DG(g,0,0,w-D,h)];};
/* Й: И с настоящей скобкой-«чашей» над буквой */
SH.Ish=g=>{const {w,h,H,S}=g;const t=Math.min(Math.max(H*0.85,34),S*0.55,90),bw=Math.min(w*0.5,t*5.2),xa=(w-bw)/2,xb=xa+bw,y0=h+Math.max(46,t*0.7),y1=y0+t*2.3;
  /* кратка: чаша с толщиной горизонтали, близко к букве */
  return [...SH.Ii(g),PG(g,[[xa,y1,0],[xa+t*1.1,y1,0],[xa+t*1.1,y0+t,g.RS*0.6],[xb-t*1.1,y0+t,g.RS*0.6],[xb-t*1.1,y1,0],[xb,y1,0],[xb,y0,g.RS*1.4],[xa,y0,g.RS*1.4]])];};
SH.Yo=g=>[...SH.E(g),R(g,g.w*0.12,g.h+70,g.w*0.12+g.S*0.62,g.h+70+g.S*0.62,g.RS),R(g,g.w*0.88-g.S*0.62,g.h+70,g.w*0.88,g.h+70+g.S*0.62,g.RS)];
SH.El=g=>{const {w,h,S,H,D}=g;const x1=w*0.2;return [R(g,w-S,0,w,h),R(g,x1,h-H,w,h),DG(g,0,0,x1,h-H/2)];};
SH.Pe=g=>{const {w,h,S,H}=g;return [R(g,0,0,S,h),R(g,w-S,0,w,h),R(g,0,h-H,w,h)];};
SH.Ef=(g,a,b)=>{const {w,h,S,H,RO,RI}=g;const mx=w/2-S/2,full=a!=null,y0=full?-g.ov*0.6:h*0.12,y1=full?h+g.ov*0.6:h*0.88;
  return [R(g,mx,a!=null?a:0,mx+S,b!=null?b:h),R(g,0,y0,w,y1,RO),X(g,S,y0+H,w-S,y1-H,RI)];};
SH.Tse=g=>{const {w,h,S,H,sp,sw}=g;const fd=SH.fd(g);return [R(g,0,0,S,h),R(g,w-S,-fd,w,h),R(g,0,0,w,H),R(g,w-sw-S*0.2,-fd,w,-fd+H*0+80)];};
SH.Che=g=>{const {w,h,S,H}=g;const ym=h*0.42;return [R(g,0,ym-H/2,S,h),R(g,w-S,0,w,h),R(g,0,ym-H/2,w-S+2,ym+H/2)];};
SH.Sha=g=>{const {w,h,S,H}=g;const mx=w/2-S/2;return [R(g,0,0,w,H),R(g,0,0,S,h),R(g,mx,0,mx+S,h),R(g,w-S,0,w,h)];};
SH.Shcha=g=>{const {w,h,S,H}=g;const mx=w/2-S/2,fd=SH.fd(g);return [R(g,0,0,w,H),R(g,0,0,S,h),R(g,mx,0,mx+S,h),R(g,w-S,-fd,w,h)];};
SH.softBowl=(g,x0,wb)=>{const {h,S,Hr:H,RO,RI}=g;const yb=h*0.58;return [R(g,x0,0,wb,yb,[0,RO,0,0]),X(g,x0+S,H,wb-S,yb-H,[0,RI,0,0])];};
SH.Soft=g=>[R(g,0,0,g.S,g.h),...SH.softBowl(g,0,g.w)];
SH.Hard=g=>{const {w,h,S,H}=g;const o=70;return [R(g,0,h-H,S+o,h),R(g,o,0,o+S,h),...SH.softBowl(g,o,w)];};
SH.Yeru=g=>{const {w,h,S}=g;const wb=w-S-90;return [R(g,0,0,S,h),...SH.softBowl(g,0,wb),R(g,w-S,0,w,h)];};
SH.Yu=g=>{const {w,h,S,H,RO,RI,ov}=g;const ym=h/2,x1=S+80;
  return [R(g,0,0,S,h),R(g,S-2,ym-H/2,x1+2,ym+H/2),R(g,x1,-ov,w,h+ov,RO),X(g,x1+S,H-ov,w-S,h+ov-H,RI)];};
SH.Ya=g=>{const {w}=g;return MIRX(SH.R(g),w);};
SH.Ghe=g=>[...SH.Ge(g),R(g,g.w-g.S*0.55,g.h,g.w,g.h+90)];
SH.Ukr_I=g=>[R(g,0,0,g.S,g.h)];
SH.Yi=g=>[R(g,0,0,g.S,g.h),R(g,0,g.h+70,g.S*0.46,g.h+70+g.S*0.46,g.RS),R(g,g.S*0.54,g.h+70,g.S,g.h+70+g.S*0.46,g.RS)];
/* --- строчные латинские --- */
SH.a=g=>{const {w,h,S,Hr:H,RO,RI,ov}=g;return [R(g,0,-ov,w,h+ov,[RO,0,0,RO]),X(g,S,H-ov,w-S,h+ov-H,[RI,0,0,RI])];};
SH.b=g=>[R(g,0,0,g.S,g.asc),...SH.softBowl(g,0,g.w)]; /* b = «ь» с восходящим */
SH.d=g=>{const {w,h,S,Hr:H,asc,RO,RI,ov}=g;return [R(g,w-S,0,w,asc),R(g,0,-ov,w,h+ov,[RO,0,0,RO]),X(g,S,H-ov,w-S,h+ov-H,[RI,0,0,RI])];};
SH.p=g=>{const {w,h,S,H,desc,RO,RI,ov}=g;return [R(g,0,-desc,S,h),R(g,0,-ov,w,h+ov,[0,RO,RO,0]),X(g,S,H-ov,w-S,h+ov-H,[0,RI,RI,0])];};
SH.q=g=>{const {w,h,S,H,desc,RO,RI,ov}=g;return [R(g,w-S,-desc,w,h),R(g,0,-ov,w,h+ov,[RO,0,0,RO]),X(g,S,H-ov,w-S,h+ov-H,[RI,0,0,RI])];};
SH.e=g=>{const {w,h,S,Hr:H,sp,sw,RO,RI,ov}=g;const ym=h*0.52;
  return [R(g,0,ym-H/2,w,h+ov,[0,0,RO,RO]),X(g,S,ym+H/2,w-S,h+ov-H,[0,0,RI,RI]),R(g,0,-ov,S,ym+H/2,[RO,0,0,0]),R(g,0,-ov,w,-ov+H,[RO,0,0,0]),R(g,w-sw,-ov,w,-ov+H+sp)];};
SH.f=g=>{const {w,h,S,H,asc,sp,sw,RO}=g;const sx=50;
  return [R(g,sx,0,sx+S,asc,[0,0,0,RO]),R(g,sx+S*0.4,asc-H,w,asc),R(g,w-sw,asc-H-sp*0.7,w,asc),R(g,0,h-H,sx+S+w*0.22,h)];};
SH.g=g=>{const {w,h,S,Hr:H,desc,sp,sw,RO,RI,ov}=g;
  return [R(g,0,-ov,w,h+ov,[RO,0,0,RO]),X(g,S,H-ov,w-S,h+ov-H,[RI,0,0,RI]),R(g,w-S,-desc,w,0,[0,RO,0,0]),R(g,0,-desc,w-S*0.5,-desc+H),R(g,0,-desc,sw,-desc+H+sp*0.8)];};
SH.n=g=>SH.Pe(g); /* n в системе «п/м/m»: прямые плечи */
SH.h=g=>[...SH.n(g),R(g,0,g.h-1,g.S,g.asc)];
SH.m=g=>{const {w,h,S,H}=g;const mx=w/2;
  /* m в системе «М/м/п»: прямые плечи, плоский верх, без скруглений */
  return [R(g,0,0,S,h),R(g,mx-S/2,0,mx+S/2,h),R(g,w-S,0,w,h),R(g,0,h-H,w,h)];};
SH.i=g=>{const {w,h,S}=g;return [R(g,0,0,S,h),R(g,0,h+90,S,h+90+S*0.9,g.RS)];};
SH.j=g=>{const {w,h,S,H,desc,sp,sw,RO}=g;
  return [R(g,w-S,-desc,w,h,[0,RO,0,0]),R(g,0,-desc,w-S*0.5,-desc+H),R(g,0,-desc,sw,-desc+H+sp*0.8),R(g,w-S,h+90,w,h+90+S*0.9,g.RS)];};
SH.k=g=>[...SH.K(g),R(g,0,g.h-1,g.S,g.asc)];
SH.l=g=>[R(g,0,0,g.S,g.asc)];
SH.r=g=>SH.Ge(g); /* r в системе «г» */
SH.t=g=>{const {w,h,S,H,asc,sp,sw}=g;const sx=50,top=h+(asc-h)*0.55;
  return [R(g,sx,0,sx+S,top),R(g,0,h-H,w,h),R(g,sx,0,w,H),R(g,w-sw,0,w,H+sp*0.8)];};
SH.dots=(g,cs)=>cs;
/* --- цифры --- */
SH.n0=g=>SH.O(g);
SH.n1=g=>{const {w,h,S,H}=g;return [R(g,w-S,0,w,h),PG(g,[[0,h*0.7],[w-S+2,h-H*1.3],[w-S+2,h],[0,h*0.7+H*1.5]])];};
SH.n2=g=>{const {w,h,S,Hr:H,sp,sw,RO,RI}=g;const yb=Math.min(h*0.5,h-H-S*0.55),xd=Math.min(S*1.08,w*0.42);
  const ybi=H+(yb-H)*(w-S)/(w-xd);
  /* «2»: верх как у зеркальной С (скруглён справа, обрезан слева), диагональ — параллельная полоса до основания */
  return [PG(g,[[0,0,0],[w,0,0],[w,H,0],[xd,H,0],[w,yb,RO*0.35],[w,h,RO],[0,h,0],[0,h-H-sp,0],[sw,h-H-sp,0],[sw,h-H,0],[w-S,h-H,RI],[w-S,ybi,0],[0,H,0]])];};
SH.n3=g=>SH.Ze(g);
SH.n4=g=>{const {w,h,S,H,D}=g;const yc=h*0.28;
  return [R(g,w-S,0,w,h),R(g,0,yc,w,yc+H*1.1),DG(g,0,yc,w-S-D+S*0.3,h)];};
SH.n5=g=>{const {w,h,S,Hr:H,sp,sw,ov}=g;const ym=h*0.56;
  return [R(g,0,h-H,w,h),R(g,w-sw,h-H-sp*0.8,w,h),R(g,0,ym-H*0.5,S,h),SH.Cg(g,{x1:w,y0:-ov,y1:ym+H*0.5,xt:0,xb:0,spT:0,spB:sp})];};
SH.n6=g=>{const {w,h,S,Hr:H,sp,sw,RO,RI}=g;const yb=h*0.56;
  return [PG(g,[[0,0,RO],[w,0,RO],[w,yb,RO],[S,yb,0],[S,h-H,RI],[w-sw,h-H,0],[w-sw,h-H-sp,0],[w,h-H-sp,0],[w,h,0],[0,h,RO]]),X(g,S,H,w-S,yb-H,RI)];};
SH.n7=g=>{const {w,h,H,D,sp,sw}=g;return [R(g,0,h-H,w,h),R(g,0,h-H-sp,sw,h),DG(g,w*0.12,0,w-D,h-H*0.5)];};
SH.n8=g=>{const {w,h,S,Hr:H,RO,RI}=g;const ym=h*0.53,o=S*0.2;
  return [R(g,o,ym-H/2,w-o,h,RO),X(g,o+S,ym+H/2,w-o-S,h-H,RI),R(g,0,0,w,ym+H/2,RO),X(g,S,H,w-S,ym-H/2,RI)];};
SH.n9=g=>ROT(SH.n6(g),g.w,g.h);
/* --- знаки --- */
const dotSz=g=>g.S*0.9;
SH.pPeriod=g=>[R(g,0,0,g.S,dotSz(g),g.RS)];
SH.comma=(g,y0)=>{const S=g.S,d=dotSz(g);return [R(g,0,y0,S,y0+d,g.RS),PG(g,[[S*0.3,y0+8],[S,y0+8],[S*0.62,y0-170],[S*0.02,y0-170]])];};
SH.pComma=g=>SH.comma(g,0);
SH.pColon=g=>[R(g,0,0,g.S,dotSz(g),g.RS),R(g,0,g.xh-dotSz(g),g.S,g.xh,g.RS)];
SH.pSemi=g=>[...SH.comma(g,0),R(g,0,g.xh-dotSz(g),g.S,g.xh,g.RS)];
SH.pExcl=g=>{const {S,h}=g;return [R(g,0,S*1.3,S,h),R(g,0,0,S,dotSz(g),g.RS)];};
SH.pQuest=g=>{const {w,h,S,H,sp,sw,RO}=g;const ym=h*0.52,x1=w*0.36;
  return [R(g,0,h-H,w,h,[0,0,RO,g.RS]),R(g,0,h-H-sp,sw,h),R(g,w-S,ym,w,h,[0,0,RO,0]),R(g,x1,ym,w,ym+H),R(g,x1,S*1.3,x1+S,ym+H),R(g,x1,0,x1+S,dotSz(g),g.RS)];};
SH.pQuoteS=g=>{const {S,h}=g;return [PG(g,[[0,h],[S,h],[S*0.76,h-250],[S*0.24,h-250]])];};
SH.pQuoteD=g=>{const {S,h}=g;const gp=S*0.5;return [PG(g,[[0,h],[S,h],[S*0.76,h-250],[S*0.24,h-250]]),PG(g,[[S+gp,h],[2*S+gp,h],[S*1.76+gp,h-250],[S*1.24+gp,h-250]])];};
SH.pHyphen=g=>[R(g,0,g.h*0.5-g.H,g.w,g.h*0.5+g.H*0.8)];
SH.pBracket=(g,round)=>{const {w,h,S,H,RO,RI}=g;const y0=-150,y1=h+70,t=H*1.5;
  return [PG(g,[[w,y1,0],[0,y1,round?RO:0],[0,y0,round?RO:0],[w,y0,0],[w,y0+t,0],[S,y0+t,round?RI:0],[S,y1-t,round?RI:0],[w,y1-t,0]])];};
SH.pParenL=g=>SH.pBracket(g,true);
SH.pParenR=g=>MIRX(SH.pBracket(g,true),g.w);
SH.pBrL=g=>SH.pBracket(g,false);
SH.pBrR=g=>MIRX(SH.pBracket(g,false),g.w);
SH.pBraceL=g=>{const {w,h,S,H}=g,s=S*0.85,x0=w*0.36,yt=h+70,yb=-150,ym=(yt+yb)/2,tp=s*0.62;
  return [R(g,x0,yt-H*1.4,w,yt),R(g,x0,ym+tp*0.5,x0+s,yt),PG(g,[[x0+s,ym+tp],[x0,ym+tp],[0,ym],[x0,ym-tp],[x0+s,ym-tp]]),R(g,x0,yb,x0+s,ym-tp*0.5),R(g,x0,yb,w,yb+H*1.4)];};

SH.pBraceR=g=>MIRX(SH.pBraceL(g),g.w);
SH.pSlash=g=>[DG(g,0,-70,g.w-g.D*0.9,g.h+50,g.D*0.9)];
SH.pBslash=g=>MIRX(SH.pSlash(g),g.w);
SH.pBar=g=>[R(g,0,-200,g.S,g.h+60)];
SH.pAt=g=>{const {w,h,S,H,RO,RI}=g;const xe=w*0.78,ye=h*0.22,ix0=w*0.34,ix1=w*0.66,iy0=h*0.3,iy1=h*0.64,t=Math.max(H*1.4,S*0.42),th=Math.max(H*0.9,34);
  return [PG(g,[[0,0,RO],[xe,0,0],[xe,H,0],[S,H,RI],[S,h-H,RI],[w-S,h-H,RI],[w-S,ye,0],[w,ye,0],[w,h,RO],[0,h,RO]]),
    R(g,ix0,iy0,ix1,iy1,g.RS),X(g,ix0+t,iy0+th,ix1-t,iy1-th,g.RS*0.5),R(g,ix1-t,iy0,w-S+4,iy0+th*1.3)];};

SH.pHash=g=>{const {w,h,S,H}=g;const v=S*0.62;return [R(g,w*0.16,0,w*0.16+v,h),R(g,w*0.84-v,0,w*0.84,h),R(g,0,h*0.3,w,h*0.3+H*1.4),R(g,0,h*0.62,w,h*0.62+H*1.4)];};
SH.pDollar=g=>{const {w,h,S}=g;return [...SH.S(g,false,false),R(g,w/2-S*0.25,-90,w/2+S*0.25,h+90)];};
SH.pPercent=g=>{const {w,h,S,H,RO,RI}=g;const rw=w*0.4;
  return [R(g,0,h*0.52,rw,h,RO),X(g,S*0.55,h*0.52+H,rw-S*0.55,h-H,RI),R(g,w-rw,0,w,h*0.48,RO),X(g,w-rw+S*0.55,H,w-S*0.55,h*0.48-H,RI),DG(g,w*0.14,-10,w*0.62,h+10,g.D*0.6)];};
SH.pAmp=g=>{const {w,h,S,H,D,RO,RI}=g;
  return [R(g,w*0.08,h*0.5,w*0.7,h,RO),X(g,w*0.08+S*0.9,h*0.5+H,w*0.7-S*0.9,h-H,RI),R(g,0,0,w*0.86,h*0.54,RO),X(g,S*0.9,H,w*0.86-S*0.9,h*0.54-H,RI),DG(g,w-D,0,w*0.36,h*0.6,D*0.9)];};
SH.pStar=g=>{const {w,h,S}=g;const cx=w/2,cy=h*0.7,L=Math.min(S*2.2,w*0.95),t=Math.max(S*0.34,40);return [RR(g,cx,cy,L,t,90),RR(g,cx,cy,L,t,30),RR(g,cx,cy,L,t,-30)];};
SH.pPlus=g=>{const {w,h,S,H}=g;const cy=h*0.46,tH=Math.min(H*1.6,S*0.7),tV=Math.min(S*0.64,tH*1.25);return [R(g,0,cy-tH/2,w,cy+tH/2),R(g,w/2-tV/2,cy-w/2,w/2+tV/2,cy+w/2)];};
SH.pEq=g=>{const {w,h,S,H}=g;const T=Math.min(H*1.5,S*0.7,h*0.115),gp=Math.max(T*0.9,h*0.09),cy=h*0.47;return [R(g,0,cy+gp/2,w,cy+gp/2+T),R(g,0,cy-gp/2-T,w,cy-gp/2)];};
SH.pLt=(g,mir)=>{const {w,h,S,H}=g;const cy=h*0.46,hh=h*0.34,T=Math.min(Math.max(Math.min(S,H*1.5),H)*1.15,hh*0.5),ti=Math.min(T*w/hh,w*0.62);const cs=[PG(g,[[w,cy],[0,cy+hh],[0,cy+hh-T],[w-ti,cy],[0,cy-hh+T],[0,cy-hh]])];return mir?MIRX(cs,w):cs;};
SH.pUnder=g=>[R(g,0,-170,g.w,-170+g.H*1.6)];
SH.pTilde=g=>{const {w,h,H}=g;const cy=h*0.5,T=Math.min(H*1.5,h*0.17),d=Math.min(T*1.1,h*0.11);
  return [PG(g,[[0,cy],[w*0.3,cy+d],[w*0.7,cy-d],[w,cy],[w,cy-T],[w*0.7,cy-d-T],[w*0.3,cy+d-T],[0,cy-T]])];};

SH.pCaret=g=>{const {w,h,H}=g;const T=H*1.7,y0=h*0.56,hh=h*0.4;
  return [PG(g,[[0,y0],[w/2,y0+hh],[w,y0],[w,y0-T],[w/2,y0+hh-T*1.25],[0,y0-T]])];};

SH.pGrave=g=>{const {w,h,S}=g;return [PG(g,[[0,h],[S*0.8,h],[S*1.1,h-120],[S*0.3,h-120]])];};
SH.pDeg=g=>{const {S,H,RO,RI}=g;const d=S*1.6,y=g.h-d;return [R(g,0,y,d,g.h,RO),X(g,S*0.55,y+H*1.1,d-S*0.55,g.h-H*1.1,RI)];};
SH.pBullet=g=>[R(g,0,g.h*0.5-g.S*0.45,g.S,g.h*0.5+g.S*0.45,g.RS)];
SH.pTimes=g=>{const {w,h,S,H}=g;const cy=h*0.5,L=w*1.05,t=Math.min(H*2,S*0.8);return [RR(g,w/2,cy,L,t,45),RR(g,w/2,cy,L,t,-45)];};
SH.pRuble=g=>{const {w,h,S,H}=g;return [...SH.P(g),R(g,0,h*0.27,w*0.74,h*0.27+H*1.2)];};
SH.pEuro=g=>{const {w,h,S,H}=g;const ym=h*0.5;return [...SH.C(g,false),R(g,-10,ym-H*2.2,w*0.62,ym-H*1.0),R(g,-10,ym+H*1.0,w*0.62,ym+H*2.2)];};
SH.pNum=g=>{const {w,h,S,H,RO,RI}=g;const r=S*1.6;const nw=g.w-50-r*1.4;const gN=Object.assign({},g,{w:nw});const n=SH.N(gN);const x0=nw+50;
  return [...n,R(g,x0,h-r*1.15,x0+r*1.4,h,RO),X(g,x0+S*0.5,h-r*1.15+H*1.1,x0+r*1.4-S*0.5,h-H*1.1,RI),R(g,x0,h-r*1.15-H*1.7,x0+r*1.4,h-r*1.15-H*0.4)];};
SH.pGuil=(g,mir)=>{const {w,h,S,H}=g;const cy=g.xh*0.5,T=Math.min(Math.max(S*0.4,H*1.2,40),w*0.2),a=(w*0.94-2.7*T)/2,hh=Math.min(a/0.72,g.xh*0.4),cw=a+T,gp=T*0.7,tot=2*cw+gp,ox=(w-tot)/2;
  const chev=x0=>PG(g,[[x0,cy],[x0+a,cy+hh],[x0+a+T,cy+hh],[x0+T,cy],[x0+a+T,cy-hh],[x0+a,cy-hh]]);
  const cs=[chev(ox),chev(ox+cw+gp)];return mir?cs:MIRX(cs,w);};
SH.pQSingle=(g,low,flip)=>{const {S,h}=g;const y0=low?-0:h-dotSz(g);let cs=SH.comma(g,y0);if(flip)cs=FLIPY(cs,y0+dotSz(g)/2-60);return cs;};
SH.pQDouble=(g,low,flip)=>{const S=g.S,gp=S*0.55;const a=SH.pQSingle(g,low,flip);const b=xf(a,(x,y)=>[x+S+gp,y]);return [...a,...b];};
SH.pEllipsis=g=>{const S=g.S,gp=S*0.45,d=dotSz(g);return [0,1,2].map(i=>R(g,i*(S+gp),0,i*(S+gp)+S,d,g.RS));};
SH.pSpace=g=>[];
