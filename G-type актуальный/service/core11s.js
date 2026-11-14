/* ===== Строка (stroka): конструкции знаков, заменяющие общие гротескные ТОЛЬКО при p.stk=1 =====
   Вольт и Квадра не затрагиваются: у них p.stk не задан, обёртки возвращают прежние функции (golden md5).
   Обёртки ставятся ДО core12 (buildGrotesk запоминает функции GR.* по ссылке). */
const STK={};

/* ---- эллиптические углы (ТОЛЬКО stk): круглые знаки — вытянутые квадроэллипсы без «стадионных» вертикалей ----
   У общего rp радиус угла одинаков по обеим осям (овал = «стадион»: полукруг + прямые бока, читается DIN/техно).
   Здесь вертикальный радиус больше горизонтального в (1+STK.E) раз (но не больше половины стороны). */
const STK_E=0.5;
function rpE(pts,g,E){if(g.kappa<0.25)return rp(pts,g);const n=pts.length,out=[];if(STK.noE)E=0;E=E*Math.max(0,Math.min(1,(g.kappa-0.3)/0.25))*Math.min(1,g.round);/* фаска/малый kappa/малое round — прежний круговой угол (топология не меняется) */
  for(let i=0;i<n;i++){const x=pts[i][0],y=pts[i][1],r0=pts[i][2]||0;
    if(!r0){out.push({x,y,a:null,b:null});continue;}
    const pr=pts[(i-1+n)%n],nx=pts[(i+1)%n];
    const rr=r0*g.round,k=Math.min(0.95,Math.max(0,g.kappa));
    const rad=(q)=>{const dx=q[0]-x,dy=q[1]-y,d=Math.hypot(dx,dy)||1,vert=Math.abs(dy)>Math.abs(dx),r=Math.min(vert?rr*(1+E):rr,d*0.5);
      const px=x+dx/d*r,py=y+dy/d*r;return {x:px,y:py,a:null,b:null,hx:x-px,hy:y-py};};
    const A=rad(pr),B=rad(nx);
    out.push({x:A.x,y:A.y,a:null,b:{x:A.x+A.hx*k,y:A.y+A.hy*k}});
    out.push({x:B.x,y:B.y,a:{x:B.x+B.hx*k,y:B.y+B.hy*k},b:null});}
  return out;}
{const gk0=gk;gk=function(g){const k=gk0(g);if(!(g&&g.p&&g.p.stk))return k;
  const g1=Object.assign({},g,{round:1});
  k.RR=(x0,y0,x1,y1,rr,hole)=>mkc(rpE([[x0,y0,rr[0]],[x1,y0,rr[1]],[x1,y1,rr[2]],[x0,y1,rr[3]]],g1,STK_E),hole);
  return k;};}
STK.on=g=>!!(g&&g.p&&g.p.stk);
STK.wrap=(name,fn)=>{const o=GR[name];GR[name]=function(g,...r){return STK.on(g)?fn(g,...r):o.call(this,g,...r);};};
/* стопа: ствол sx..sx+S уходит вниз и поворачивает вправо, конец — горизонтальный срез на высоте yc.
   Радиус внешнего угла равен высоте стопы (вертикаль входит в закругление целиком, стык со стволом без уступа);
   tw — толщина правого конца (с вырезом-просветом), без tw стопа сплошная. gid — своя группа */
STK.foot=(k,sx,x1,yc,gid,tw)=>{const {S,H,ov}=k,bw=x1-sx,bh=yc+ov,ro=Math.max(2,Math.min(bw/2,bh));
  const o=[k.RR(sx,-ov,x1,yc,[ro,ro,0,0])];
  if(tw){const hw=x1-tw-(sx+S);if(hw>6){const hh=yc+60-(-ov+H),ri=Math.max(2,Math.min(k.radIn(ro,hw,Math.min(hh,bh)),hw*0.49,(bh-H)*0.95));o.push(SUB(k.RR(sx+S,-ov+H,x1-tw,yc+60,[ri,ri,0,0]))[0]);}}
  return GRP(gid,o);};
/* ---- a: двухэтажная; верх = арка r/n зеркально в правый ствол (клин-выемка), чаша = чаша d, ниже и меньше ---- */
STK.a=g=>{const k=gk(g),{w,h,S,H,ov}=k,top=h+ov,bT=Math.max(h*0.61+ov,2*H+30),yb2=top-H,riMax=Math.max(10,yb2-bT-H*0.12),xe=Math.max(S*2.6,w*0.9);
  /* верхняя шапочка = дуга б (arcTop), зеркально: правый ствол сам загибается влево в короткую горизонталь с косым срезом */
  const yA=Math.max(bT*0.5,top-2*(riMax+S*0.8)-1);
  return MIRX([k.st(0,0,S,yA+1),...STK.arcTop(k,yA,top,xe,{ri:riMax}),...STK.bowlG(k,0,w,-ov,bT,7)],w);};
STK.wrap('a',STK.a);
/* ---- g: одноэтажная, закруглённый крюк с вертикальным срезом ---- */
STK.wrap('g',g=>{const k=gk(g),{w,h,S,H,ov}=k;return [...MIRX(STK.bowl(k,h+ov),w),...GR.tail(k,w-S,w*0.08,h)];});
/* ---- t: плоский верх с косым срезом, перекладина, крюк-стопа ---- */
STK.wrap('t',g=>{const k=gk(g),{w,h,S,H,ov}=k,sx=w*0.2,top=h+(k.asc-h)*0.55,yc=Math.max(H*0.9+h*0.1,h*0.27);
  const st=k.poly([[sx,yc-1],[sx+S,yc-1],[sx+S,top],[sx,top-S*0.62]]);
  return [st,k.st(0,h-H,w,h),...STK.arcBot(k,-ov,yc+ov,w,{x0:sx,rf:0.95})];});
/* ---- f: узкий, дуга с горизонтальным концом, перекладина ---- */
STK.wrap('f',g=>{const k=gk(g),{w,h,S,H,ov}=k,sx=w*0.16,a=k.asc,xe=w*0.92,yA=a-Math.max(H*3.2,h*0.4);
  return [k.st(sx,0,sx+S,yA+1),...STK.arcTop(k,yA,a,xe,{x0:sx,rf:0.9}),k.st(0,h-H,w*0.84,h)];});
/* ---- l: ствол с короткой закруглённой стопой ---- */
STK.wrap('l',g=>{const k=gk(g),{w,h,S,H,ov}=k,tl=Math.min(190,Math.max(120,S*1.1)),yc=Math.max(H*0.9+h*0.1,h*0.24);
  return [k.st(0,yc-1,S,k.asc),...STK.arcBot(k,-ov,yc+ov,S+tl,{x0:0,rf:0.95})];});
/* ---- 1: короткий лёгкий флажок, без подошвы ---- */
STK.wrap('n1',g=>{const k=gk(g),{w,h,S,H}=k,xs=w-S,x0=w*0.06,yL=h*0.64,fT=H*1.3;
  return [k.st(xs,0,w,h),k.poly([[x0,yL],[xs+1,h-fT*1.02],[xs+1,h],[x0,yL+fT]])];});
/* ---- Q: короткий хвост под углом, пересекает нижнюю правую часть овала ---- */
STK.wrap('Q',g=>{const k=gk(g),{w,h,S,H,ov}=k,hw=Math.max(H*1.05,S*0.8);
  return [...k.ring(0,-ov,w,h+ov),band(k,w*0.56,h*0.2,w*1.0,-h*0.14,hw)];});
/* ---- J: ствол справа, стопа влево с горизонтальным срезом (зеркало стопы t) ---- */
STK.wrap('J',g=>{const k=gk(g),{w,h,S,H,ov}=k,yc=Math.min(h*0.34,w*0.5);
  return [k.st(w-S,yc-1,w,h),...MIRX(STK.arcBot(k,-ov,yc+ov,w,{x0:0,rf:0.95}),w)];});
/* ---- j: тот же крючок, что у g (единая система нижних выносных) ---- */
STK.wrap('j',g=>{const k=gk(g),{w,h,S,H}=k;return [...GR.tail(k,w-S,0,h),k.dot(w-S,h+Math.max(40,S*0.4),S)];});
/* ---- Л: нога из левого края перекладины, наклон ~8° (не П), ствол справа ---- */
STK.wrap('El',g=>{const k=gk(g),{w,h,S,H,ov}=k,fw=Math.max(S*0.6,0.4*(w-2*S)/1.4),xl=fw,yt=H*2.1,bw=xl+S,bh=yt+ov,ro=Math.max(2,Math.min(k.rad(bw,bh),bh*0.6,bw*0.5)),hw=xl+60,ri=Math.max(2,Math.min(k.radIn(ro,hw,bh),hw*0.49,bh*0.8));
  /* нога сама загибается влево: моноплинейный крюк (зеркальный j), конец — вертикальный срез; без шара и утолщения */
  return [k.st(w-S,0,w,h),k.st(xl,h-H,w,h),k.st(xl,yt-1,xl+S,h),...GRP(3,[k.RR(0,-ov,bw,yt,[0,ro,0,0]),SUB(k.RR(-60,-ov+H,xl,yt+60,[0,ri,0,0]))[0]])];});
/* Д: те же вертикальная нога и перекладина; нижняя планка с короткими ножками шириной в ствол */
STK.ext=S=>Math.round(S*0.8);STK.ext2=S=>Math.round(S*0.6); /* Д д: вынос с каждой стороны, ширина глифа + 2*ext2 (тело = прежняя ширина) */ /* вынос базовой планки за правый ствол (Ц Щ) / за обе ножки (Д) */
STK.wrap('De',g=>{const k=gk(g),{w,h,S,H}=k,fd=k.desc*0.58,e=STK.ext2(S),r=Math.min(S*0.42,fd*0.5),bx=w-e,xl=e+Math.min((bx-e)*0.2,Math.max(S*0.7,bx-e-3.4*S));
  /* Black: стопа шире своей глубины в 1.5 раза читалась запятой, прилипшей к предыдущему слову (аудит) — стопа не шире 1.25 глубины, отступает внутрь от края планки */
  const fw=S>fd*1.4?fd*1.25:S,fi=S-fw;
  return [k.st(0,0,w,H),k.RR(fi,-fd,fi+fw,H+1,[Math.min(r,fw*0.5),0,0,0]),k.RR(w-S,-fd,w-fi,H+1,[0,Math.min(r,fw*0.5),0,0]),k.st(bx-S,0,bx,h),k.st(xl,h-H,bx,h),k.st(xl,H-1,xl+S,h)];});
/* Ц Щ: классический хвост — база продолжается за правый ствол, у внешнего конца спускается короткий штрих, наружный угол скруглён */
STK.wrap('Tse',g=>{const k=gk(g),{w,h,S,H}=k,fd=k.desc*0.58,e=STK.ext(S),r=Math.min(S*0.42,fd*0.5),bx=w-e;return [k.st(0,0,S,h),k.st(bx-S,0,bx,h),k.st(0,0,w,H),k.RR(w-S,-fd,w,H+1,[0,r,0,0])];});
STK.wrap('Shcha',g=>{const k=gk(g),{w,h,S,H}=k,fd=k.desc*0.58,e=STK.ext(S),r=Math.min(S*0.42,fd*0.5),bx=w-e,mx=bx/2-S/2;return [k.st(0,0,S,h),k.st(mx,0,mx+S,h),k.st(bx-S,0,bx,h),k.st(0,0,w,H),k.RR(w-S,-fd,w,H+1,[0,r,0,0])];});

/* n r m(арочная): ствол доходит до верха плеча (h+ov) — без ступеньки 10 ед. в левом верхнем углу */
/* ---- единая логика «плечо/чаша отходит от ствола» (Inter-конструкция): ствол прямой, верх — квадратный;
   плечо ответвляется НИЖЕ верха (снаружи — клин-выемка глубиной STK.drop·H), внутри — острый стык с малым радиусом (тонкий стык) ---- */
STK.drop=0.62;STK.dx0=0.30;STK.riL=0.3;
/* радиус внешнего угла у ствола: клин глубиной dT на расстоянии dx от стенки (круговая оценка; rpE вытягивает вертикаль, поэтому множитель) */
STK.rj=(k,lim,vl)=>{const S=k.S,H=k.H,dx=S*STK.dx0,dT=Math.min(H*0.55,0.125*(k.p.xh||525)),kp=k.g.kappa==null?0.6:k.g.kappa,kk=Math.min(0.95,Math.max(0,kp)),
  E=kp<0.25?0:STK_E*Math.max(0,Math.min(1,(kp-0.3)/0.25)),vh=vl==null?1e9:vl/2;
  /* точная глубина клина: кубическая дуга угла (как строит rpE) на расстоянии dx от стенки; радиус подбирается делением пополам */
  const drop=rr=>{const ry=Math.min(rr*(1+E),vh),px=rr,py=ry;/* угол в (0,0): точки Pv=(0,-ry), Ph=(rr,0) */let lo=0,hi=1,t=0.5;
    const X=t=>{const u=1-t;return u*u*u*0+3*u*u*t*0+3*u*t*t*(rr-rr*kk)+t*t*t*rr;},Y=t=>{const u=1-t;return u*u*u*(-ry)+3*u*u*t*(-ry+ry*kk)+3*u*t*t*0+t*t*t*0;};
    for(let i=0;i<24;i++){t=(lo+hi)/2;if(X(t)<dx)lo=t;else hi=t;}return -Y(t);};
  let lo=Math.max(4,dx+1),hi=Math.max(lo,lim);if(drop(hi)<=dT)return hi;if(drop(lo)>=dT)return lo;
  for(let i=0;i<30;i++){const m=(lo+hi)/2;if(drop(m)<dT)lo=m;else hi=m;}return (lo+hi)/2;};
/* на каком расстоянии dx от кромки угла круговая дуга радиуса rr уходит на глубину dT (клин одинаковой глубины со всеми остальными стыками) */
STK.dxFor=(k,rr,vl)=>{const H=k.H,dT=Math.min(H*0.55,0.125*(k.p.xh||525)),kp=k.g.kappa==null?0.6:k.g.kappa,kk=Math.min(0.95,Math.max(0,kp)),E=kp<0.25?0:STK_E*Math.max(0,Math.min(1,(kp-0.3)/0.25)),ry=Math.min(rr*(1+E),vl/2);
  const X=t=>3*(1-t)*t*t*(rr-rr*kk)+t*t*t*rr,Y=t=>-Math.pow(1-t,3)*ry+3*Math.pow(1-t,2)*t*(-ry+ry*kk);let lo=0,hi=1;
  for(let i=0;i<30;i++){const t=(lo+hi)/2;if(-Y(t)>dT)lo=t;else hi=t;}return Math.max(2,X((lo+hi)/2));};
STK.E=k=>{const kp=k.g.kappa==null?0.6:k.g.kappa;return kp<0.25?0:STK_E*Math.max(0,Math.min(1,(kp-0.3)/0.25));};
/* внутренний радиус не выходит за внешний (по обеим осям с запасом на толщину): штрих не рвётся на дуге */
STK.fit=(k,ri,ro,sx,vo,iw,ih)=>{const E=STK.E(k),roy=Math.min(ro*(1+E),vo/2),kp=k.g.kappa==null?0.6:k.g.kappa,c=(4-3*Math.min(0.95,Math.max(0,kp)))/8,
  lo=ro-(Math.min(sx,k.H)*0.6)/c,up=Math.min(ro-sx*0.9,ih/2<=roy-k.H*0.8?1e9:(roy-k.H*0.8)/(1+E));return Math.max(2,Math.min(Math.max(Math.min(ri,up),lo),Math.max(2,Math.min(iw,ih)/2-1)));};
STK.rc=(k,ro,sx,iw,ih)=>{const kp=k.g.kappa==null?0.6:k.g.kappa,c=(4-3*Math.min(0.95,Math.max(0,kp)))/8;return Math.max(2,Math.min(ro,Math.max(2,Math.min(iw,ih)/2-1)+Math.min(sx,k.H)*0.6/c));};
STK.run=0.31;
STK.rk=1;
/* арка: ствол слева на xa..xa+S (ствол кладёт вызывающий); xb — правая кромка; top — верх арки */
STK.arch=(k,xa,xb,top,gid,o)=>{o=o||{};const {S,H}=k,w=xb-xa,iw=w-2*S,ih=top-H,r=STK.rc(k,Math.max(0,Math.min(k.rad(w,top),w-S-2,top*0.5)),S,iw,ih),
  ri=STK.fit(k,Math.max(2,Math.min(k.radIn(r,iw,ih),iw*0.48)),r,S,top,iw,ih),rL=STK.rj(k,Math.min(r*0.95,w*0.5),top),xl=xa+S-S*STK.dx0,riL=Math.max(2,Math.min(ri,H*STK.riL+2)),
  xi=o.xi==null?xb-S:o.xi;
  return GRP(gid,[k.RR(xl,0,xb,top,[0,0,r,rL]),...(xi-xa-S>6&&ih>6?[SUB(k.RR(xa+S,-80,xi,top-H,[0,0,ri,riL]))[0]]:[])]);};
STK.u=g=>ROT(GR.n(g),g.w,g.h);
STK.wrap('n',g=>{const k=gk(g),{w,h,S,H,ov}=k;return [k.st(0,0,S,h),...STK.arch(k,0,w,h+ov,1)];});
STK.rr=(g,o)=>{o=o||{};const k=gk(g),{w,h,S,H,ov}=k,top=h+ov;
  const tr=Math.max(4,Math.min(o.tr||Math.max(H*1.2,S*0.7),(w-S)*0.55)),xi=w-tr;
  const iw=Math.max(4,xi-S),ih=top-H,r=Math.min(o.rmax||1e9,STK.rc(k,Math.max(0,Math.min(k.rad(w,top),w-S-2,top*0.5)),S,iw,ih)),ri=STK.fit(k,Math.max(2,Math.min(k.radIn(r,iw,ih),iw*0.48)),r,S,top,iw,ih),
    rL=STK.rj(k,Math.min(r*0.95,(w-S)*0.6),top),xl=S-S*STK.dx0,riL=Math.max(2,Math.min(ri,H*STK.riL+2));
  const free=xi-ri-(S+riL),xc=free>=2?Math.max(S+riL+1,xi-ri-1):(S+xi)/2;
  let yt=o.yt!=null?o.yt:top-Math.max(H+Math.max(10,H*0.4),h*0.3);if(free<2)yt=Math.min(yt,top-H-ri-2);
  return [k.st(0,0,S,h),...GRP(1,[k.RR(xl,0,w,top,[0,0,r,rL]),SUB(k.RR(S,-80,xi,top-H,[0,0,ri,riL]))[0],...(o.slope?[SUB(k.poly([[xc,-80],[w+40,-80],[w+40,yt+o.slope*(w+40-xc)],[xc,yt]]))[0]]:o.cap?[STK.capCut(k,'TR',o.cap,top,-80),SUB(k.cut(S+riL+1,-80,w+300,top-H*0.98))[0]]:[k.cut(xc,-80,w+40,yt)[0]])])];};
{const r0=GR.r;GR.r=function(g){if(!STK.on(g))return r0.call(this,g);const k=gk(g);return STK.rr(g,{cap:Math.min(k.w-k.H*1.6*STK.TN-6,Math.max(k.w*0.62,k.S*1.75)),rmax:k.h*0.32});};}
/* m: обе арки ответвляются от своих стволов одинаково (клин-выемка справа вверху у ствола, как у n); средний ствол — прямой, квадратный верх на x-высоте;
   правая нога первой арки входит в средний ствол слева с тем же клином (зеркало) и тонким внутренним стыком */
STK.archG=(k,xa,xb,xi,top,gid,sym)=>{const {S,H}=k,w=xb-xa,iw=xi-xa-S,ih=top-H,r=STK.rc(k,Math.max(0,Math.min(k.rad(w,top),w-S-2,top*0.5)),S,iw,ih),
  ri=STK.fit(k,Math.max(2,Math.min(k.radIn(r,iw,ih),iw*0.48)),r,S,top,iw,ih),rL=STK.rj(k,Math.min(r*0.95,w*0.5),top),xl=xa+S-S*STK.dx0,riL=Math.max(2,Math.min(ri,H*STK.riL+2));
  if(sym)return GRP(gid,[k.RR(xl,0,xi+S*STK.dx0,top,[0,0,rL,rL]),SUB(k.RR(xa+S,-80,xi,top-H,[0,0,riL,riL]))[0]]);
  return GRP(gid,[k.RR(xl,0,xb,top,[0,0,r,rL]),SUB(k.RR(xa+S,-80,xi,top-H,[0,0,ri,riL]))[0]]);};
STK.archR=(k,xa,xb,top)=>{const {S}=k,w=xb-xa,iw=w-2*S,ih=top-k.H;return STK.rc(k,Math.max(0,Math.min(k.rad(w,top),w-S-2,top*0.5)),S,iw,ih);};
STK.mArch=g=>{const k=gk(g),{w,h,S,H,ov}=k,c=(w-3*S)/2,w1=2*S+c,x2=w1-S,top=h+ov;
  return [k.st(0,0,S,h),k.st(x2,0,x2+S,h),...STK.archG(k,0,x2+S,x2,top,1,true),...STK.arch(k,x2,w,top,2)];};
/* b d p q: чаша — овал, примыкающий к стволу: оба угла у ствола скруглены (клин-выемка), просвет — круглый с малым радиусом у ствола */
STK.bowlG=(k,x0,x1,yb,yt,gid,rnd,hb,ht)=>{const {S,H}=k,w=x1-x0,hv=yt-yb;hb=hb==null?H:hb;ht=ht==null?H:ht;const iw=w-2*S,ih=hv-hb-ht,ro=STK.rc(k,k.rad(w,hv),S,iw,ih),ri=STK.fit(k,Math.max(2,Math.min(k.radIn(ro,iw,ih),iw*0.48,ih*0.48)),ro,S,hv,iw,ih),
  rL=STK.rj(k,Math.min(ro*0.95,hv*0.3),hv),xl=x0+S-S*STK.dx0,riL=Math.max(2,Math.min(ri,H*STK.riL+4));
  if(rnd)return GRP(gid||7,[k.RR(x0,yb,x1,yt,[ro,ro,ro,0]),SUB(k.RR(x0+S,yb+hb,x1-S,yt-ht,[ri,ri,ri,riL]))[0]]);
  return GRP(gid||7,[k.RR(xl,yb,x1,yt,[rL,ro,ro,rL]),SUB(k.RR(x0+S,yb+hb,x1-S,yt-ht,[riL,ri,ri,riL]))[0]]);};
STK.bowl=(k,y1)=>STK.bowlG(k,0,k.w,-k.ov,y1,7);
STK.isCap=k=>k.h>(k.p.xh||k.h)*1.05;
STK.wrap('b',g=>{const k=gk(g),{w,h,S,H,ov}=k;return [k.st(0,0,S,k.asc),...STK.bowl(k,h+ov)];});
STK.wrap('p',g=>{const k=gk(g),{w,h,S,H,ov}=k;return [k.st(0,-k.desc,S,h),...STK.bowl(k,h+ov)];});
STK.wrap('hn',g=>{const k=gk(g);return [...GR.n(g),k.st(0,g.h-1,k.S,k.asc)];});

/* ---- ß (в core13 — через G['ß'], см. core12s): верхняя дуга плавно выходит из ствола, нижняя чаша закрыта ---- */
STK.ess=g=>{const k=gk(g),{w,S,H}=k,a=k.asc,ym=a*0.55,wt=w*0.88;
  return [k.st(0,0,S,a*0.5),...GRP(1,[...k.ring(0,ym-H/2,wt,a+k.ov,[0,1,1,1]),...k.ringJoins(0,ym-H/2,wt,a+k.ov,[0,1,1,1],1,0,0.5)]),...GRP(2,[...k.ring(0,-k.ov,w,ym+H/2,[0,1,1,0]),...k.ringJoins(0,-k.ov,w,ym+H/2,[0,1,1,0],1,0.5,0)])];};
/* ---- y/у: прямой хвост и в курсиве ---- */
/* RS10: y/у — no ink-trap wedge on the long diagonal (it made a kink in the tail); the shoulder arm simply joins the diagonal */
STK.wrap('y',g=>{const k=gk(g),{w,h,S}=k,yb=-k.desc,hw=k.dw(w,h-yb),xb=hw*0.5+w*0.05,L=k.dgC(xb,yb,w-hw/2,h,hw);
  const m=((w-hw/2)-xb)/(h-yb),xc=y=>xb+m*(y-yb),yj=h*0.02,hw2=k.dw(xc(yj)-hw/2,h-yj),xe=xc(yj)-hw*0.1;
  return [L,k.dgC(hw2/2,h,xe,yj,hw2)];});
/* б: чаша; левая стенка поднимается выносным и одной дугой уходит вправо в короткую горизонталь с вертикальным срезом (как у f) */
/* дуга сверху (б, 6, 9): левая стенка поднимается и одной широкой дугой уходит вправо в короткую горизонталь со слегка скошенным срезом */
STK.TN=0.35;
STK.arcTop=(k,yA,a,xe,o)=>{o=o||{};const {S,H,w}=k,x0=o.x0||0,bh=a-yA,ro=Math.max(4,Math.min(o.ro||1e9,w*0.46,(xe-x0)*0.5,bh*(o.rf||0.5))),ri=Math.max(2,Math.min(o.ri||1e9,ro-S*STK.rik,(xe-x0-S)*0.45)),yb2=a-H,tn=STK.TN,xt=xe-H*tn*0.5;
  return GRP(o.gid||3,o.plain?[k.RR(x0,yA,xe,a,[0,0,0,ro]),SUB(k.RR(x0+S,yA-60,xe+180,yb2,[0,0,0,ri]))[0]]:[k.RR(x0,yA,xe+120,a,[0,0,0,ro]),SUB(k.RR(x0+S,yA-60,xe+180,yb2,[0,0,0,ri]))[0],SUB(k.poly([[xt-60*tn,a+60],[xt+(a-yb2+60)*tn,yb2-60],[xe+300,yb2-60],[xe+300,a+60]]))[0]]);};
/* то же, перевёрнутое по вертикали (нижний крюк): стенка слева уходит вниз и одной дугой вправо в короткую горизонталь; нижняя кромка yB, высота дуги bh */
STK.arcBot=(k,yB,bh,xe,o)=>FLIPY(STK.arcTop(k,0,bh,xe,o),(yB+bh)/2);
/* срез-«шапочка» для овальных знаков: удаляет всё за косой линией б (наклон TN), на высоте d от кромки линия переходит в вертикаль до yEnd.
   c = TR TL BR BL (угол знака), xt — x внешней кромки, T — y внешней кромки штриха */
STK.capCut=(k,c,xt,T,yEnd)=>{const tn=STK.TN,H=k.H,top=c[0]==='T',right=c[1]==='R',sx=right?1:-1,sy=top?1:-1,d=H*1.6,X=y=>xt+sx*sy*(T-y)*tn,Wf=right?k.w+300:-300,y1=T+sy*80,y2=T-sy*d;
  return k.cutP([[X(y1),y1],[X(y2),y2],[X(y2),yEnd],[Wf,yEnd],[Wf,y1]])[0];};
/* открытая сторона: x внешней кромки терминала (от открытого края) — штрих у терминала ещё почти горизонтален, вертикаль среза не задевает стенку */
STK.capX=(k,w,f)=>Math.max(w*0.38,Math.min(w*(f||0.66),w-k.S*1.3-k.H*1.6*STK.TN-14));
/* штрих по осевой линии пера S×H: толщина по направлению */
STK.pen=(k,phi)=>{const s=Math.sin(phi),c=Math.cos(phi);return 1/Math.sqrt(s*s/(k.S*k.S)+c*c/(k.H*k.H));};
STK.stroke=(k,pts)=>{const n=pts.length,L=[],R=[];for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;const t=STK.pen(k,Math.atan2(dy,dx))/2;
  L.push([pts[i][0]-dy*t,pts[i][1]+dx*t]);R.push([pts[i][0]+dy*t,pts[i][1]-dx*t]);}const thin=A=>{const o=[A[0]];for(let i=1;i<A.length-1;i++){const q=o[o.length-1];if(Math.hypot(A[i][0]-q[0],A[i][1]-q[1])>=8)o.push(A[i]);}const e=A[A.length-1],q=o[o.length-1];if(o.length>1&&Math.hypot(e[0]-q[0],e[1]-q[1])<8)o.pop();o.push(e);return o;};/* без микро-сегментов (<6 ед.): ступенек на контуре нет */
  return k.poly([...thin(L),...thin(R).reverse()]);};
/* горизонталь → дуга по часовой (центр C, радиус Rc) → касательная к точке Q */
STK.hookPath=(x0,yc,xa,Rc,Q)=>{const C=[xa,yc-Rc],dx=Q[0]-C[0],dy=Q[1]-C[1],L=Math.hypot(dx,dy),b=Math.atan2(dy,dx),d=Math.acos(Math.min(1,Rc/L));let at=b-d;
  for(const a of [b-d,b+d]){const tx=C[0]+Rc*Math.cos(a),ty=C[1]+Rc*Math.sin(a);if((Q[0]-tx)*Math.sin(a)-(Q[1]-ty)*Math.cos(a)>0){at=a;break;}}
  while(at>Math.PI/2+1e-6)at-=2*Math.PI;const pts=[];for(let x=x0;x<xa;x+=40)pts.push([x,yc]);const n=Math.max(8,Math.ceil((Math.PI/2-at)/0.025));
  for(let i=0;i<=n;i++){const a=Math.PI/2+(at-Math.PI/2)*i/n;pts.push([C[0]+Rc*Math.cos(a),C[1]+Rc*Math.sin(a)]);}
  const tx=pts[pts.length-1],m=Math.max(2,Math.ceil(Math.hypot(Q[0]-tx[0],Q[1]-tx[1])/40));for(let i=1;i<=m;i++)pts.push([tx[0]+(Q[0]-tx[0])*i/m,tx[1]+(Q[1]-tx[1])*i/m]);return pts;};
STK.wrap('be',g=>{const k=gk(g),{w,h,S,H,ov}=k,a=Math.max(k.asc,h+ov+H+Math.max(40,H*0.4)),yA=h*0.5,xe=Math.max(S*2.6,w*0.9),
  /* RS11: fully rounded closed bowl (no straight stem to the baseline, no square bottom-left corner) — same as 6 */
  hv=h+ov,ro=Math.max(2,k.rad(w,hv)),y0=-ov+Math.min(ro*(1+STK.E(k)),hv/2)+2;
  return [k.st(0,y0,S,yA+1),...STK.bowlG(k,0,w,-ov,h+ov,7,true),...STK.arcTop(k,yA,a,xe)];});
/* 6 / 9: та же конструкция, что б: ствол-дуга + чаша с клин-выемкой */
STK.wrap('n6',g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=Math.max(H*0.9,Math.min(h*0.5,h+ov-1.5*H-Math.max(40,H*0.4))),yA=ym+H*0.5,xe=Math.max(S*2.4,w*0.88),hv=ym+H*0.5+ov,ro=Math.max(2,k.rad(w,hv)),y0=-ov+Math.min(ro*(1+STK.E(k)),hv/2)+2;
  /* левый нижний угол чаши круглый и общий со стволом (без ступеньки у базовой линии) */
  return [k.st(0,y0,S,yA+1),...STK.bowlG(k,0,w,-ov,ym+H*0.5,7,true),...STK.arcTop(k,yA,h+ov,xe)];});
STK.wrap('n9',g=>ROT(GR.n6(g),g.w,g.h));

/* ---- Единая система «чаша у ствола» для прописных и кириллицы: bowlG везде (клин-выемка + тонкий стык, как b/d/p/q) ---- */
STK.wrap('D',g=>{const k=gk(g),{w,h,S}=k;return [k.st(0,0,S,h),...STK.bowlG(k,0,w,0,h,7)];});
STK.wrap('P',g=>{const k=gk(g),{w,h,S}=k,yb=h*0.4;return [k.st(0,0,S,h),...STK.bowlG(k,0,w,yb,h,7)];});
STK.hmid=0.56;STK.hout=0.94; /* RS10: middle bar of the double-bowl glyphs B В в 8 = hair * hmid (colour 1.25x -> peer band) */
STK.wrap('B',g=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar,wt=w-S*0.18,Hm=H*STK.hmid,Ho=H*STK.hout;return [k.st(0,0,S,h),k.st(S-2,ym-Hm/2,S+Math.min(S*0.2,24),ym+Hm/2),...STK.bowlG(k,0,wt,ym-Hm/2,h,7,false,Hm,Ho),...STK.bowlG(k,0,w,0,ym+Hm/2,8,false,Ho,Hm)];});
STK.wrap('Be',g=>{const k=gk(g),{w,h,S,H}=k,ym=h*0.56;return [k.st(0,0,S,h),k.st(0,h-H,w*0.92,h),...STK.bowlG(k,0,w,0,ym+H/2,7)];});
STK.wrap('R',g=>{const k=gk(g),{w,h,S,H}=k,yb=h*0.42,wb=w*0.96,yq=yb+H*0.5;
  /* нога: диагональ веса ствола (перо S×H) постоянной ширины, как плечо К; верх прячется в нижней полке чаши, слева от неё остаётся тонкий стык без клина */
  const xq=Math.max(S*1.6,wb*0.48),dxl=w-xq,hw=k.dw(dxl,yq),xb=w-hw/2;
  return [k.st(0,0,S,h),...STK.bowlG(k,0,wb,yb,h,7,false,H*Math.min(1,0.37*(h-yb)/H),H*Math.min(1,0.37*(h-yb)/H)),k.dgC(xb,0,xq,yq,hw)];});
/* ---- К к Ж ж: оптические выемки (ink-trap, «перехват») в острых стыках плеча со стволом и в развилке плеча и ноги ---- */
STK.slot=(k,ax,ay,ux,uy,depth,wd,gid)=>{const l=Math.hypot(ux,uy)||1;ux/=l;uy/=l;const nx=-uy,ny=ux,e=40,bw=wd/2*(depth+e)/depth,bx=ax-ux*e,by=ay-uy*e;
  /* RS10: rounded tip (radius rt) instead of a sharp apex: no ink spike at the end of the trap */
  const rt=Math.min(wd*0.34,depth*0.3),cxs=ax+ux*(depth-rt),cys=ay+uy*(depth-rt),pts=[[bx+nx*bw,by+ny*bw]];
  for(let i=0;i<=6;i++){const t=Math.PI*i/6;pts.push([cxs+nx*rt*Math.cos(t)+ux*rt*Math.sin(t),cys+ny*rt*Math.cos(t)+uy*rt*Math.sin(t)]);}
  pts.push([bx-nx*bw,by-ny*bw]);
  return GRP(gid,SUB(k.poly(pts)));};
STK.kArms=(k,x0,x1,h,gid)=>{const {S,H}=k,yj=h*0.4,res=kArms(k,x0,x1,h,gid),w=x1-x0,hw1=k.dw(w,h-yj),Pt=[x1-hw1/2,h],m=(Pt[0]-x0)/(h-yj);
  const yq=yj+(h-yj)*0.36,xq=x0+m*(yq-yj),hw2=k.dw(x1-xq,yq)*1.02,cl=(xq-(x1-hw2/2))/yq,yc=(x0-m*yj+hw1/2-(x1-hw2))/(cl-m),xcx=x1-hw2+cl*yc,
    n1=Math.hypot(m,1),n2=Math.hypot(cl,1),dep=S*STK.trapD,wd=S*STK.trapW;
  /* карман между стволом, плечом и ногой (острый, 74 град): щель вглубь развилки по биссектрисе — «перехват» */
  /* глубина щели не больше половины металла вдоль биссектрисы до верхней кромки плеча; при включённой ловушке (trap>0) щель ставит базовая конструкция */
  {const ux=m/n1+cl/n2,uy=1/n1+1/n2,ul=Math.hypot(ux,uy)||1,vx=ux/ul,vy=uy/ul,den=vx-m*vy,tA=Math.abs(den)>1e-6?(-hw1/2-(xcx-x0)+m*(yc-yj))/den:0,dd=Math.min(dep,tA*0.5);
   if(!(k.trap>0)&&yc>H*0.5&&yc<h&&tA>0&&dd>=Math.max(8,H*0.12))res.push(...STK.slot(k,xcx,yc,vx,vy,dd,Math.min(wd,dd*0.7),gid||5));}
  return res;};
STK.trapD=0.38;STK.trapW=0.2;STK.dgK=0.96;STK.dgZh=0.9;
STK.diag=(g,f)=>Object.assign({},g,{p:Object.assign({},g.p,{diag:(g.p.diag||1)*f})});
STK.wrap('K',g=>{const k=gk(STK.diag(g,STK.dgK)),{w,h,S}=k;return [k.st(0,0,S,h),...STK.kArms(k,S,w,h)];});
STK.wrap('Zhe',g=>{const k=gk(STK.diag(g,STK.dgZh)),{w,h,S}=k,cx=w/2;return [k.st(cx-S/2,0,cx+S/2,h),...STK.kArms(k,cx+S/2,w,h,5),...MIRX(STK.kArms(k,cx+S/2,w,h,6),w)];});
STK.wrap('Soft',g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),...STK.bowlG(k,0,w,STK.isCap(k)?0:-k.ov,h*0.56+H*0.5,7)];});
STK.wrap('Hard',g=>{const k=gk(g),{w,h,S,H}=k,xs=w*0.24;return [k.st(0,h-H,xs+S,h),k.st(xs,0,xs+S,h),...STK.bowlG(k,xs,w,STK.isCap(k)?0:-k.ov,h*0.56+H*0.5,7)];});
STK.wrap('Yeru',g=>{const k=gk(g),{w,h,S,H}=k,xr=w-S,wb=xr-S*0.45;return [k.st(0,0,S,h),...STK.bowlG(k,0,wb,STK.isCap(k)?0:-k.ov,h*0.56+H*0.5,7),k.st(xr,0,w,h)];});
/* ч Ч: чашка (левый ствол + дно) входит в правый ствол с той же клин-выемкой (зеркало арки n по вертикали) */
STK.wrap('Che',g=>{const k=gk(g),{w,h,S,H}=k,ym=h*0.44,yc=ym-H/2,iw=w-2*S,ih=h-yc-H,r=STK.rc(k,Math.max(2,Math.min(k.rad(w,h-yc),(h-yc)*0.5,iw)),S,iw,ih),
  ri=STK.fit(k,Math.max(2,Math.min(k.radIn(r,iw,ih),iw*0.48)),r,S,h-yc,iw,ih),rL=STK.rj(k,Math.min(r*0.95,iw*0.9),h-yc),riL=Math.max(2,Math.min(ri,H*STK.riL+2)),xr=w-S+S*STK.dx0;
  return [k.st(w-S,0,w,h),...GRP(1,[k.RR(0,yc,xr,h,[r,rL,0,0]),SUB(k.RR(S,yc+H,w-S,h+80,[ri,riL,0,0]))[0]])];});
STK.wrap('U',g=>{const k=gk(g),{w,h,S,ov}=k;return ROT([k.st(0,0,S,h),...STK.arch(k,0,w,h+ov,1)],w,h);});

/* ================= Шапочка со сгибом (б): единое окончание верхних/нижних концов (Строка) =================
   Штрих поднимается, одним широким изгибом уходит в короткую горизонталь и обрывается косым срезом (TN ≈ 19°: верхняя кромка короче нижней).
   Нижние концы — то же, перевёрнутое по вертикали (STK.arcBot); правые/левые — зеркально. Круглые знаки (c e s G З ...) собираются из таких дуг. */
/* «с»-образная скоба: левая стенка (x0) + верхняя шапочка + нижняя шапочка; plainT/plainB — конец без косого среза (стык со спинкой) */
STK.cshape=(k,yb,yt,o)=>{o=o||{};const x0=o.x0||0,ym=o.ym!=null?o.ym:(yb+yt)/2,rf=o.rf||0.95;
  return [...STK.arcTop(k,ym-1,yt,o.xeT,{x0,rf,gid:o.g1||3,plain:o.plainT,ri:o.riT}),...STK.arcBot(k,yb,ym-yb+1,o.xeB,{x0,rf,gid:o.g2||4,plain:o.plainB,ri:o.riB})];};
STK.capE=(k,w)=>Math.max(w*0.66,Math.min(w*0.93,w-k.S*0.12-k.H*STK.TN*0.5-8));
STK.rik=0.5;
STK.wrap('C',(g,mir,f)=>{const k=gk(g),{w,h,ov}=k,xe=STK.capE(k,w)-(f>2?w*0.06:0),o=STK.cshape(k,-ov,h+ov,{xeT:xe,xeB:xe});return mir?MIRX(o,w):o;});
STK.wrap('G',g=>{const k=gk(g),{w,h,S,H,ov,cx}=k,ym=h*0.47,T=h+ov,B=-ov,xe=STK.capE(k,w),hv=ym+H/2-B,ro=Math.max(4,Math.min(w*0.46,hv*0.95)),ri=Math.max(2,Math.min(ro-S*STK.rik,(w-2*S)*0.5));
  return [...STK.arcTop(k,ym,T,xe,{rf:0.95}),...GRP(4,[k.RR(0,B,w,ym+H/2,[ro,ro,0,0]),SUB(k.RR(S,B+H,w-S,T+80,[ri,ri,0,0]))[0]]),k.st(cx*0.95,ym-H/2,w,ym+H/2)];});
STK.wrap('S',(g,mir)=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.52,dx=w*0.03,T=h+ov,B=-ov,xe=STK.capE(k,w),xs=w*0.62;
  const t=STK.cshape(k,ym-H/2,T,{x0:dx,xeT:xe,xeB:xs,plainB:true,g1:1,g2:2});
  const b=MIRX(STK.cshape(k,B,ym+H/2,{x0:0,xeT:xs,xeB:xe,plainT:true,g1:3,g2:4}),w);
  const o=[...t,...b];return mir?MIRX(o,w):o;});
STK.wrap('Ze',(g,mir)=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*k.bar,dx=0,T=h+ov,B=-ov,xe=STK.capE(k,w),xs=w*0.62,rw=Math.max(8,H*STK.riW);
  /* талия: внутренние углы у перемычки малы (иначе набегает чёрный комок), снаружи — чистая клиновая выемка вместо «зубчика» из двух дуг */
  const t=MIRX(STK.cshape(k,ym-H/2,T,{x0:dx,xeT:xe,xeB:xs,plainB:true,g1:1,g2:2,riB:rw}),w);
  const b=MIRX(STK.cshape(k,B,ym+H/2,{x0:0,xeT:xs,xeB:xe,plainT:true,g1:3,g2:4,riT:rw}),w);
  const nd=S*STK.notchD,na=H*STK.notchA,cut=[];for(const gd of [1,2,3,4])cut.push(...GRP(gd,SUB(k.poly([[w+80,ym+na+80*na/nd],[w-nd,ym,Math.min(nd*0.5,18)],[w+80,ym-na-80*na/nd]]))));
  const o=[...t,...b,...cut];return mir?MIRX(o,w):o;});
STK.riW=0.5;STK.notchD=0.42;STK.notchA=0.5;
STK.wrap('e',g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.5,T=h+ov,B=-ov,xe=STK.capE(k,w);
  return [...k.ring(0,ym-H/2,w,T,[0,0,1,1]),...STK.arcBot(k,B,ym-B,xe,{rf:0.95,gid:4})];});
/* 5: стойка и верхняя перекладина — дуга б; чаша с нижним левым концом-шапочкой */
STK.wrap('n5',g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.56,B=-ov,xe=STK.capE(k,w),bh=ym+H/2-B,ro=Math.max(4,Math.min(w*0.46,bh*0.5));
  return [...STK.arcTop(k,ym-H/2,h,w*0.96),...MIRX(STK.cshape(k,B,ym+H/2,{x0:0,xeT:w,xeB:xe,plainT:true,g1:5,g2:6}),w)];});
/* 2: верхний левый конец — шапочка (зеркало б), дуга уходит одним изгибом в диагональ, база с плоским основанием */
STK.n2o=GR.n2;STK.n3o=GR.n3;
STK.wrap('n2',g=>{const k=gk(g),{w,h,S,H,ov}=k,T=h+ov,yc=T-H/2,xt=w*0.2,Rc=Math.min(Math.max(w*0.34,S*0.9),(yc-H)*0.5),xa=w-S/2-Rc,Q=[-S*0.1,H*0.5];
  /* предельные сочетания (очень толстые горизонтали/стволы при малой высоте): прежняя конструкция, без самопересечений */
  if(xa<xt+w*0.1||Rc<S*0.6||S+H>h*0.48||S>H*1.55||H>S*1.7)return STK.n2o(g);
  return [...GRP(1,[STK.stroke(k,STK.hookPath(-40,yc,xa,Rc,Q)),STK.capCut(k,'TL',xt,T,T-H*1.6-1),SUB(k.st(-400,-100,0,T+100))[0]]),k.st(0,0,w,H)];});
/* 3: плоская перекладина с шапочкой слева, правый изгиб плавно уходит в диагональ (стопа диагонали срезана по низу спинки);
   нижняя чаша — «с» наоборот, левый конец спинки спрятан под диагональ */
STK.wrap('n3',g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=Math.max(h*0.43,Math.min(h*0.545,h-3*H)),B=-ov,xe=STK.capE(k,w),yc=h-H/2,wt=w*0.9,Rc=Math.min(Math.max(w*0.2,S*0.85),(yc-ym)*0.8),xa=wt-S/2-Rc,xt=w*0.1,Q=[w*0.5,ym];
  if(w>h*0.95||xa<xt+w*0.12||Rc<S*0.6||ym+H/2>h-H*1.9||S+H>h*0.48||S>H*1.55||H>S*1.7)return STK.n3o(g);
  const pts=STK.hookPath(-40,yc,xa,Rc,Q),a=pts[pts.length-2],b=pts[pts.length-1];let ux=b[0]-a[0],uy=b[1]-a[1];const l=Math.hypot(ux,uy);ux/=l;uy/=l;
  const phi=Math.atan2(uy,ux),hw=STK.pen(k,phi)/(2*Math.abs(Math.sin(phi))),xc=y=>b[0]+(y-b[1])*ux/uy,yT=ym+H/2,xl=xc(yT)-hw+8;
  pts.push([b[0]+ux*220,b[1]+uy*220]);
  return [...GRP(1,[STK.stroke(k,pts),STK.capCut(k,'TL',xt,h,h-H*1.6-1),SUB(k.st(-400,-400,w+400,ym-H/2))[0]]),...MIRX(STK.cshape(k,B,yT,{x0:0,xeT:w-xl,xeB:xe,plainT:true,g1:3,g2:4}),w)];});
/* нижний выносной крюк g j (и y italic): стебель уходит вниз и одним изгибом — в короткую горизонталь влево с косым срезом (б, перевёрнутая) */
{const t0=GR.tail;GR.tail=function(k,xs,xL,yS,gid){if(!(k.p&&k.p.stk))return t0.call(this,k,xs,xL,yS,gid);
  const {S,H,ov}=k,dd=GR.tailD(k),xR=xs+S,Lm=xR-xL,rO=Math.max(0,Math.min(k.rad(Lm,dd*2),dd-H*0.35)),yTop=-dd+Math.max(rO*2.2,H*2.4);
  return [...MIRX(STK.arcBot(k,-dd,yTop+dd,xs+Lm,{x0:xs,rf:0.95,gid:gid||4}),xs+xR),k.st(xs,yTop-1,xR,yS)];};}

/* 4: перекладина заканчивается вровень с правой кромкой ствола (без выноса вправо) */
STK.wrap('n4',g=>{const k=gk(g),{w,h,S,H}=k,yc=h*0.28,xs=w-S,hw=k.dw(xs,h-yc);
  return [k.st(xs,0,xs+S,h),k.st(Math.min(xs-hw*0.72,(xs-hw*0.72)*H*1.05/(h-yc)),yc,xs+S,yc+H*1.05),k.dgL(0,yc,xs-hw*0.72,h,hw)];});
/* RS10: 8 — hair 0.9 (ink colour of the double ring vs peers 0 6 9) */
STK.hairF=(g,f)=>Object.assign({},g,{H:g.H*f,Hr:(g.Hr||g.H)*f});
STK.wrap('n8',g=>{const k=gk(STK.hairF(g,0.9)),{w,h,S,H,ov}=k,ym=h*0.53,dx=w*0.05;return [...k.ring(dx,ym-H/2,w-dx,h+ov),...k.ring(0,-ov,w,ym+H/2)];});

/* RS10: remove tiny segments (<= thr units): drop a handle-less corner point next to a very short segment */
STK.deTiny=(cs,thr)=>cs.map(c=>{if(!c||!c.nodes||c.nodes.length<5)return c;let n=c.nodes.slice(),ch=false;
  const plain=q=>!(q.a&&(q.a.x!==q.x||q.a.y!==q.y))&&!(q.b&&(q.b.x!==q.x||q.b.y!==q.y));
  for(let it=0;it<6;it++){let hit=-1;const L=n.length;if(L<5)break;
    for(let i=0;i<L;i++){const a=n[i],b=n[(i+1)%L];if(Math.hypot(a.x-b.x,a.y-b.y)<=thr){if(plain(a)){hit=i;break;}if(plain(b)){hit=(i+1)%L;break;}hit=-2-i;break;}}
    if(hit===-1)break;
    if(hit<-1){const i=-2-hit,j=(i+1)%L,a=n[i],b=n[j],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:a.a,b:b.b};
      /* tiny fillet between two curved nodes: collapse into one node with the outer handles */
      const nn=n.slice();nn[i]=m;nn.splice(j>i?j:0,1);n=nn;ch=true;continue;}
    n.splice(hit,1);ch=true;}
  return ch?Object.assign({},c,{nodes:n}):c;});

/* RS11: ф Ф — two bowls (left = d mirrored, right = b) around the central stem, each with the b/d cleft + thin crotch at top and bottom */
STK.wrap('Ef',(g,a,b)=>{const k=gk(g),{w,h,S,ov}=k,full=a!=null,y0=full?-ov:h*0.1,y1=full?h+ov:h*0.9,xc=w/2-S/2;
  return [k.st(xc,full?a:0,xc+S,full?b:h),...STK.bowlG(k,xc,w,y0,y1,7),...MIRX(STK.bowlG(k,0,xc+S,y0,y1,8),xc+S)];});
/* RS11: ю Ю — н-like stem + bar + о-ring; the bar meets the ring with the same thin wedge notch (cleft + thin crotch) top and bottom as the stem junction / b */
STK.yuE=0.02;
STK.wrap('Yu',g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*k.bar,ow=w*0.64,fr=(w-ow-S)*0.7,xr=w-ow,ax=xr+S*STK.yuE,dep=S*STK.yuD,wd=S*STK.yuW;
  return [k.st(0,0,S,h),...GRP(7,[k.st(S-1,ym-H/2,xr+S*0.5,ym+H/2),...k.joinCut(S,ym+H/2,1,-1,{m:0.5,free:fr}),...k.joinCut(S,ym-H/2,1,1,{m:0.5,free:fr}),...k.ring(xr,-ov,w,h+ov)])];});
STK.yuD=0.24;STK.yuW=0.09;
