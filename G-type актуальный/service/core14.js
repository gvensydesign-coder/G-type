/* ===== Гротески: знаки и огонек на общих компонентах (gk) =====
   Все знаки собраны из тех же деталей, что и буквы: точки k.dot, стволы, кольца, диагонали «по перу» S×H,
   плоские срезы. Толщины — из системы S (вертикаль) / H (горизонталь). */
const GS={};
/* толщина штриха по перу для направления (dx,dy): вертикаль → S, горизонталь → H */
GS.pen=(k,dx,dy)=>{const L=Math.hypot(dx,dy)||1,sn=Math.abs(dy)/L,cs=Math.abs(dx)/L;return 1/Math.sqrt((sn*sn)/(k.S*k.S)+(cs*cs)/(k.H*k.H))*(k.p.diag||1);};
/* размер точки знаков препинания: как точка буквы (k.dot), но двоеточие помещается в высоту строчных */
GS.dd=p=>Math.min(sE(p),p.xh/2.5);
GS.ddk=k=>Math.min(k.S,k.p.xh/2.5);
/* запятая: точка + хвост вниз-влево с плоским срезом; (x0,y0) — левый нижний угол точки */
GS.tailL=k=>Math.max(k.p.desc*0.6,GS.ddk(k)*0.55);
GS.comma=(k,x0,y0)=>{const d=GS.ddk(k),L=GS.tailL(k),tw0=d*0.62,tw1=Math.max(d*0.4,k.H*0.62),sh=d*0.3;
  return [k.dot(x0,y0,d),k.poly([[x0+d-tw0,y0+d*0.5],[x0+d,y0+d*0.5],[x0+d,y0],[x0+d-sh,y0-L],[x0+d-sh-tw1,y0-L],[x0+d-tw0,y0]])];};
/* кавычка-запятая наверху: open=true — перевёрнутая (‘ “) */
GS.qc=(k,x0,open)=>{const d=GS.ddk(k),L=GS.tailL(k),top=k.p.capH,y0=top-d;const c=GS.comma(k,x0,y0);
  if(!open)return c;const yl=y0-L;return xf(c,(x,y)=>[2*x0+d-x,yl+top-y]);};
/* прямая кавычка: ствол с плоским срезом, сужается книзу */
GS.qs=(k,x0)=>{const d=GS.ddk(k),top=k.p.capH,hh=(d+GS.tailL(k))*0.86,bw=d*0.6,r=Math.min(d/2,(k.p.round||0.5)*d*0.5);
  return [k.poly([[x0,top,r],[x0+d,top,r],[x0+d/2+bw/2,top-hh],[x0+d/2-bw/2,top-hh]])];};
/* шеврон, остриём вправо, в координатах (u,v): u0..u1 — длина, vc ± hh — размах, T — толщина по перпендикуляру;
   концы срезаны поперёк оси u, остриё — короткий плоский срез. map(u,v)→[x,y] */
GS.chev=(k,u0,u1,vc,hh,tp,map)=>{const du=u1-u0,c=Math.max(tp*0.22,8),dv=hh-c,L=Math.hypot(du,dv);
  let Tv=tp*L/du;Tv=Math.min(Tv,hh*0.78);const ui=u0+(hh-Tv)*du/dv;
  const P=[[u0,vc+hh],[u1,vc+c],[u1,vc-c],[u0,vc-hh],[u0,vc-hh+Tv],[Math.min(ui,u1-2),vc],[u0,vc+hh-Tv]];
  return k.poly(P.map(([u,v])=>map(u,v)));};
GS.yc=k=>k.p.xh*0.53;              /* оптический центр знаков операций */
GS.opT=k=>Math.max(k.H*1.05,k.S*0.48); /* горизонталь знаков операций */
GS.opL=k=>Math.min(k.w*0.94,k.p.xh*0.92);
GS.brY=k=>[-k.p.desc*0.72,Math.max(k.p.asc,k.p.capH+50)];
GS.brSv=p=>sE(p)*0.78;GS.brArm=p=>Math.max(p.hair*1.15,sE(p)*0.5,70);
/* ---------- точки, запятые, кавычки ---------- */
GS.period=g=>{const k=gk(g);return [k.dot(0,0,GS.ddk(k))];};
GS.commaG=g=>{const k=gk(g);return GS.comma(k,0,0);};
GS.colon=g=>{const k=gk(g),d=GS.ddk(k);return [k.dot(0,0,d),k.dot(0,k.p.xh-d,d)];};
GS.semi=g=>{const k=gk(g),d=GS.ddk(k);return [...GS.comma(k,0,0),k.dot(0,k.p.xh-d,d)];};
GS.excl=g=>{const k=gk(g),{w,S,H}=k,d=GS.ddk(k),cx=w/2,gp=Math.max(d*0.5,H*0.6),bw=Math.max(d*0.78,S*0.62),top=k.p.capH;
  return [k.poly([[cx-S/2,top],[cx+S/2,top],[cx+bw/2,d+gp],[cx-bw/2,d+gp]]),k.dot(cx-d/2,0,d)];};
GS.exclInv=g=>xf(GS.excl(g),(x,y)=>[g.w-x,g.p.xh-y]);
GS.questInv=g=>xf(GR.quest(g),(x,y)=>[g.w-x,g.p.xh-y]);
GS.ellipsis=g=>{const k=gk(g),d=GS.ddk(k),gp=d*0.55;return [0,1,2].map(i=>k.dot(i*(d+gp),0,d));};
GS.bullet=g=>{const k=gk(g),d=g.w,y=k.p.xh*0.5-d/2;return [k.dot(0,y,d)];};
GS.q1=(open,low)=>g=>{const k=gk(g);if(low)return GS.comma(k,0,0);return GS.qc(k,0,open);};
GS.q2=(open,low)=>g=>{const k=gk(g),d=GS.ddk(k),o=d*1.5;const one=x=>low?GS.comma(k,x,0):GS.qc(k,x,open);return [...one(0),...one(o)];};
GS.qs1=g=>{const k=gk(g);return GS.qs(k,0);};
GS.qs2=g=>{const k=gk(g),d=GS.ddk(k);return [...GS.qs(k,0),...GS.qs(k,d*1.55)];};
GS.grave=g=>{const k=gk(g),d=mkDims(k,true);return MK.grave(k,g.w/2,k.p.capH-d.mh,d);};
/* ---------- тире, операции ---------- */
GS.dash=g=>{const k=gk(g),t=Math.min(Math.max(k.H*1.1,k.S*0.52),k.S),yc=k.p.xh*0.52;return [k.st(0,yc-t/2,g.w,yc+t/2)];};
GS.minus=g=>{const k=gk(g),t=GS.opT(k),yc=GS.yc(k),L=GS.opL(k),cx=g.w/2;return [k.st(cx-L/2,yc-t/2,cx+L/2,yc+t/2)];};
GS.plus=g=>{const k=gk(g),t=GS.opT(k),tv=Math.max(t,k.S*0.72),yc=GS.yc(k),L=GS.opL(k),cx=g.w/2;
  return [k.st(cx-L/2,yc-t/2,cx+L/2,yc+t/2),k.st(cx-tv/2,yc-L/2,cx+tv/2,yc+L/2)];};
GS.eq=g=>{const k=gk(g),t=GS.opT(k),yc=GS.yc(k),L=GS.opL(k),cx=g.w/2,gp=Math.max(t*0.85,k.p.xh*0.1);
  return [k.st(cx-L/2,yc+gp/2,cx+L/2,yc+gp/2+t),k.st(cx-L/2,yc-gp/2-t,cx+L/2,yc-gp/2)];};
GS.lt=(left)=>g=>{const k=gk(g),yc=GS.yc(k),L=GS.opL(k),cw=Math.min(g.w*0.94,L*0.9),hh=L*0.46,x0=(g.w-cw)/2;
  const tp=GS.pen(k,cw,hh)*1.08;const o=[GS.chev(k,x0,x0+cw,yc,hh,tp,(u,v)=>[u,v])];return left?MIRX(o,g.w):o;};
GS.times=g=>{const k=gk(g),yc=GS.yc(k),a=GS.opL(k)*0.36,cx=g.w/2,t=GS.pen(k,1,1)*0.95;
  return [band(k,cx-a,yc-a,cx+a,yc+a,t),band(k,cx-a,yc+a,cx+a,yc-a,t)];};
GS.caret=g=>{const k=gk(g),top=k.p.capH,u0=top*0.5,hh=g.w*0.44,tp=GS.pen(k,hh,top-u0)*1.05;
  return [GS.chev(k,u0,top,g.w/2,hh,tp,(u,v)=>[v,u])];};
GS.tilde=g=>{const k=gk(g),w=g.w,yc=GS.yc(k),a=k.p.xh*0.075,T=Math.max(k.H*1.05,k.S*0.5),t=T/2,x1=w*0.34,x2=w*0.66,R=w*0.3;
  return [k.poly([[0,yc-a+t],[x1,yc+a+t,R],[x2,yc-a+t,R],[w,yc+a+t],[w,yc+a-t],[x2,yc-a-t,R],[x1,yc+a-t,R],[0,yc-a-t]])];};
GS.under=g=>{const k=gk(g),top=-k.p.desc*0.4;return [k.st(0,top-Math.min(k.H*1.05,k.p.desc*0.45),g.w,top)];};
/* ---------- скобки, черты ---------- */
GS.brack=(round)=>g=>{const k=gk(g),{w,H}=k,Sv=GS.brSv(k.p),[yB,yT]=GS.brY(k),th=H,R=round?1e4:0,Ri=round?(w-Sv)*0.9:0;
  return [k.poly([[w,yB],[0,yB,R],[0,yT,R],[w,yT],[w,yT-th],[Sv,yT-th,Ri],[Sv,yB+th,Ri],[w,yB+th]])];};
GS.brace=g=>{const k=gk(g),{w,H}=k,Sv=GS.brSv(k.p)*0.85,[yB,yT]=GS.brY(k),ym=(yB+yT)/2,xs=Math.max(k.S*0.42,60),th=H,R=1e4,Ri=(w-xs-Sv)*0.9,tt=Math.max(H*1.1,Sv*0.62);
  const hook=k.poly([[xs,ym],[xs,yT,R],[w,yT],[w,yT-th],[xs+Sv,yT-th,Ri],[xs+Sv,ym]]);
  return [hook,...xf([hook],(x,y)=>[x,2*ym-y]),k.st(0,ym-tt/2,xs+Sv*0.5,ym+tt/2)];};
GS.slash=g=>{const k=gk(g),yB=-k.p.desc*0.5,yT=k.p.asc,hw=k.dw(g.w*0.6,yT-yB);return [k.dgL(0,yB,g.w-hw,yT,hw)];};
GS.bar=g=>{const k=gk(g),[yB,yT]=GS.brY(k);return [k.st(0,yB,g.w,yT)];};
/* ---------- @ # $ € & * ---------- */
GS.atT=p=>Math.max(p.hair,sE(p)*0.56);
GS.at=g=>{const k=gk(g),{w,H}=k,tv=GS.atT(k.p),th=Math.max(H*0.86,30),yb=-k.p.desc*0.42,yt=k.p.capH,bh=yt-yb;
  const gx=Math.max(H*0.6,60),ix1=w-tv-gx,ih=bh*0.5,iy0=yb+(bh-ih)/2-th*0.25,iy1=iy0+ih,ix0=Math.max(tv+gx,ix1-ih*1.0);
  const O=GRP(1,[...k.ring(0,yb,w,yt,[1,1,1,1],tv,th),k.cut(ix1-tv,yb-40,w+40,iy0)[0]]);
  const A=GRP(2,[...k.ring(ix0,iy0,ix1,iy1,[1,1,1,1],tv,th),k.st(ix1-tv,iy0,ix1,iy1)]);
  return [...O,...A,k.st(ix1-tv,iy0,w,iy0+th)];};
GS.atW=p=>{const tv=GS.atT(p),gx=Math.max(p.hair*0.6,60);return 4*tv+2*gx+Math.max(tv*1.1,150);};
GS.hash=g=>{const k=gk(g),{w,H}=k,h=k.p.capH,ln=w*0.07,hv=Math.min(k.dw(ln,h)*0.72,w*0.24),th=Math.max(H*1.0,30),xa=w*0.29,xb=w*0.71;
  const v=x=>k.dgC(x-ln/2,0,x+ln/2,h,hv);return [v(xa),v(xb),k.st(0,h*0.31-th/2,w,h*0.31+th/2),k.st(0,h*0.67-th/2,w,h*0.67+th/2)];};
GS.dollar=g=>{const k=gk(g),{w,h,H,S}=k,cx=w/2,tb=Math.max(H*1.0,S*0.5),ext=Math.min(Math.max(70,k.p.desc*0.42),k.p.asc-h+20);
  return [...GR.S(g),k.st(cx-tb/2,h-H*0.5,cx+tb/2,h+ext),k.st(cx-tb/2,-ext,cx+tb/2,H*0.5)];};
GS.euro=g=>{const k=gk(g),{w,h,H}=k,e=w*0.14,gc=Object.assign({},g,{w:w-e});
  const C=xf(GR.C(gc,false),(x,y)=>[x+e,y]),th=Math.min(H*0.95,(h-2*H)/3.8),gp=th*0.8,x1=e+(w-e)*0.62;
  return [...C,k.st(0,h/2+gp/2,x1,h/2+gp/2+th),k.st(0,h/2-gp/2-th,x1,h/2-gp/2)];};
GS.amp=g=>{const k=gk(g),{w,h,S,H,ov}=k,tv=S*0.8,tvT=S*0.7,thT=Math.min(H,(h*0.48)*0.3),yj=h*0.52,ya=h*0.46;
  const a0=w*0.08,a1=w*0.66,T=GRP(1,k.ring(a0,yj,a1,h+ov,[1,1,1,1],tvT,thT));
  /* нога: из нижнего левого угла верхней петли в правый нижний угол */
  const ys=yj+thT,hw=Math.min(k.dw(w-a0,ys+ov)*0.92,S*1.15),xs=a0+tvT*0.5+hw*0.5;
  const D=k.dgC(xs,ys,w-hw/2,-ov,hw),xr=y=>xs+hw/2+(w-(xs+hw/2))*(ys-y)/(ys+ov);
  /* нижняя чаша: правая стенка до ya — «рука», всё правее ноги выше ya срезано */
  const b1=Math.max(w*0.74,w-hw+tv*0.6);
  const B=GRP(2,[...k.ring(0,-ov,b1,yj+thT,[1,1,1,1],tv,H),k.cutP([[xr(h+40),h+40],[w+40,h+40],[w+40,ya],[xr(ya),ya]])[0]]);
  return [...T,...B,D];};
GS.ampW=p=>Math.max(sE(p)*3.1+40,680*p.wdth/100);
/* кавычки-ёлочки: два шеврона, остриём влево (left) или вправо.
   Толщина — по перу S×H для угла шеврона (как диагонали букв), высота растёт с весом, чтобы внутренний угол не залился;
   ширина знака считается той же геометрией (GS.guilGeo), поэтому шевроны не слипаются в тяжёлых весах. */
GS.penSH=(S,H,dx,dy,diag)=>{const L=Math.hypot(dx,dy)||1,sn=Math.abs(dy)/L,cs=Math.abs(dx)/L;return 1/Math.sqrt((sn*sn)/(S*S)+(cs*cs)/(H*H))*(diag||1);};
GS.guilGeo=(S,H,xh,diag)=>{const r=1.05,tp0=GS.penSH(S,H,r,1,diag)*0.95,LdU=Math.hypot(r,1)/r;
  let Tv=tp0*LdU;const hh=Math.max(xh*0.34,Math.min(Tv/0.88,xh*0.42));Tv=Math.min(Tv,hh*0.88);
  const tp=Tv/LdU,cw=hh*r,sn=1/Math.hypot(r,1),off=tp/sn+Math.max(tp*0.45,40),m=Math.max(14,tp*0.12);
  return {hh,cw,tp,off,m,W:off+cw+2*m};};
GS.guilW=p=>GS.guilGeo(sE(p),p.hair,p.xh,p.diag).W;
GS.guil=(left)=>g=>{const k=gk(g),w=g.w,yc=k.p.xh*0.5,G=GS.guilGeo(k.S,k.H,k.p.xh,k.p.diag),x0=(w-G.off-G.cw)/2;
  const o=[GS.chev(k,x0,x0+G.cw,yc,G.hh,G.tp,(u,v)=>[u,v]),GS.chev(k,x0+G.off,x0+G.off+G.cw,yc,G.hh,G.tp,(u,v)=>[u,v])];return left?MIRX(o,w):o;};
GS.star=g=>{const k=gk(g),w=g.w,top=k.p.capH,R0=Math.max(k.S*0.95,top*0.23),t=Math.min(Math.max(k.H*0.85,k.S*0.56),R0*0.62),R=Math.min(R0,(w*0.96-t*0.5)/1.732),cy=top-R,cx=w/2;
  const arm=a=>{const c=Math.cos(a),s=Math.sin(a);return band(k,cx-R*c,cy-R*s,cx+R*c,cy+R*s,t);};
  return [arm(Math.PI/2),arm(Math.PI/6),arm(-Math.PI/6)];};
/* ---------- огонек: изогнутый хвостик снизу правой части ---------- */
/* xE — правый край (плоский срез) хвостика, owMax — предельная ширина */
/* xE — правый край (плоский срез) хвостика, owMax — предельная ширина, xL — левый край (для ствола).
   Толщина хвоста ≈ H, но не больше 0.6 глубины; глубина ≈ 0.43 desc — не растёт с весом. */
GS.ogon=(k,xE,owMax,xL)=>{const {S,H}=k,dsc=k.p.desc||210,dh=dsc*0.43,t=Math.max(14,Math.min(H*0.95,dh*0.6)),tv=Math.min(Math.max(t*1.3,S*0.42),S*0.6);
  let ow=Math.min(Math.max(tv+t*2.2,S*0.95),owMax||1e9);if(xL!=null)ow=Math.min(ow,xE-(xL-tv*0.2));const x0=xE-ow,yTop=Math.max(H*0.5,t),rise=t*0.35;
  return [k.poly([[x0,yTop],[x0,-dh,1e4],[xE,-dh+rise],[xE,-dh+rise+t],[x0+tv,-dh+t+rise*0.4,1e4],[x0+tv,yTop]])];};
MK.ogon=(k,cx,y,d)=>{const isStem=k.w<=k.S*1.05;return isStem?GS.ogon(k,k.w-k.S*0.1,null,0):GS.ogon(k,k.w-k.S*0.42);};
(function(){
  const G=FONTS.volt.GL,F={fixed:true};
  const put=(ch,shape,w,kind,opt)=>{const old=G[ch];G[ch]={shape,w:w==null?old.w:w,k:kind||(old?old.k:'cap'),opt:opt||(old?old.opt:{})||{}};};
  const DD=GS.dd;
  put('.',GS.period,DD,'cap',{});put(',',GS.commaG,DD,'cap',{});put(':',GS.colon,DD,'xh',{});put(';',GS.semi,DD,'xh',{});
  put('!',GS.excl,p=>sE(p),'cap',{});put('¡',GS.exclInv,p=>sE(p),'cap',{});put('¿',GS.questInv,G['?'].w,'cap',{});
  put('…',GS.ellipsis,p=>DD(p)*4.1,'cap',{});put('•',GS.bullet,p=>Math.max(sE(p)*1.05,p.xh*0.36),'cap',{});
  put("'",GS.qs1,DD,'cap',{});put('"',GS.qs2,p=>DD(p)*2.55,'cap',{});
  put('‘',GS.q1(true,false),DD,'cap',{});put('’',GS.q1(false,false),DD,'cap',{});put('‚',GS.q1(false,true),DD,'cap',{});
  put('“',GS.q2(true,false),p=>DD(p)*2.5,'cap',{});put('”',GS.q2(false,false),p=>DD(p)*2.5,'cap',{});put('„',GS.q2(false,true),p=>DD(p)*2.5,'cap',{});
  put('`',GS.grave,null,'cap',{});
  put('-',GS.dash,300,'cap',F);put('–',GS.dash,520,'cap',F);put('—',GS.dash,880,'cap',F);put('−',GS.minus,520,'cap',F);
  put('+',GS.plus,520,'cap',F);put('=',GS.eq,520,'cap',F);put('<',GS.lt(true),460,'cap',F);put('>',GS.lt(false),460,'cap',F);
  put('×',GS.times,520,'cap',F);put('^',GS.caret,520,'cap',F);put('~',GS.tilde,560,'cap',F);put('_',GS.under,640,'cap',F);
  put('[',GS.brack(false),p=>GS.brSv(p)+GS.brArm(p),'cap',F);put(']',g=>MIRX(GS.brack(false)(g),g.w),p=>GS.brSv(p)+GS.brArm(p),'cap',F);
  put('(',GS.brack(true),p=>GS.brSv(p)+GS.brArm(p)*1.3,'cap',F);put(')',g=>MIRX(GS.brack(true)(g),g.w),p=>GS.brSv(p)+GS.brArm(p)*1.3,'cap',F);
  const brW=p=>GS.brSv(p)*0.85+GS.brArm(p)+Math.max(sE(p)*0.42,60);
  put('{',GS.brace,brW,'cap',F);put('}',g=>MIRX(GS.brace(g),g.w),brW,'cap',F);
  put('/',GS.slash,520,'cap',F);put('\\',g=>MIRX(GS.slash(g),g.w),520,'cap',F);put('|',GS.bar,p=>Math.max(p.hair*1.1,sE(p)*0.62),'cap',{});
  put('@',GS.at,GS.atW,'cap',F);put('#',GS.hash,p=>Math.max(600,sE(p)*2.94),'cap',F);put('$',GS.dollar,600,'cap',F);put('€',GS.euro,640,'cap',{});
  put('&',GS.amp,GS.ampW,'cap',F);put('*',GS.star,520,'cap',F);put('«',GS.guil(true),GS.guilW,'xh',F);put('»',GS.guil(false),GS.guilW,'xh',F);
  /* огонек у А — под правой ногой */
  const legW=k=>{const aw=Math.min(k.S*0.92,k.w*0.3);return k.dw(k.w/2-aw/2,k.h);};
  compose(G,'Ą','A',[],{extra:k=>{const hw=legW(k);return GS.ogon(k,k.w-k.S*0.04,hw*0.9);}});
  /* у a — под стволом справа, у e — под нижней частью чаши справа */
  /* ширина хвоста ą не больше ствола: в светлых весах хвост выступал влево и с чашей италика давал «карман» */
  compose(G,'ą','a',[],{extra:k=>GS.ogon(k,k.w-k.S*0.02,k.S*0.98)});
  compose(G,'ę','e',[],{extra:k=>GS.ogon(k,k.w*0.86,k.w*0.42)});
  /* новые знаки — в набор обоих гротесков */
  for(const f of [FONTS.volt,FONTS.kvadra]){for(const c of '¡¿−')if(!f.CHARSET.includes(c))f.CHARSET.push(c);
    for(const gr of f.GROUPS)if(gr[0]==='Знаки'){for(const c of '¡¿−')if(!gr[1].includes(c))gr[1]+=c;}}
})();
