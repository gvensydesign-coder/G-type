/* ===== Гротески G-type: знаки на общих компонентах (CSG) =====
   Каждая буква — сложение деталей (стволы, перекладины, овалы, диагонали) и вычитание (апертуры, ловушки).
   Все размеры берутся из ДНК шрифта: S — вертикаль, H — горизонталь, round/kappa — форма овала,
   aper — раскрытие концов, bar — оптический центр перекладин, mv — глубина средней вершины М,
   trap — ловушки для краски, diag — толщина диагоналей. */
const GR={};
const RK_V=1.05,RK_H=1.03; /* круглый ствол ≈105% прямого, круглая горизонталь ≈103% */
const TRAP_KEEP=24,JOIN_KEEP=16,GL_GAP=24; /* минимум штриха, который остаётся за ловушкой и под выемкой стыка */
function gk(g){
  const p=g.p,S=g.S,H=g.H,w=g.w,h=g.h,ov=g.ov||0;
  const k={g,p,S,H,w,h,ov,asc:p.asc,desc:p.desc,cx:w/2};
  const g1=Object.assign({},g,{round:1});
  k.bar=(p.bar||53)/100;k.aper=(p.aper==null?26:p.aper)/100;k.mv=(p.mv==null?0:p.mv)/100;k.trap=(p.trap||0)/100;
  /* радиус овала: доля от полуразмера (round 0..1) */
  k.rad=(bw,bh)=>Math.max(0,Math.min(bw,bh)/2*Math.min(1,p.round));
  k.radIn=(r,bw,bh)=>{const ri=Math.max(r-(S+H)*0.42,r*0.22)*(p.innerR==null?1:p.innerR);return Math.max(2,Math.min(ri,Math.min(bw,bh)/2-1));};
  k.RR=(x0,y0,x1,y1,rr,hole)=>mkc(rp([[x0,y0,rr[0]],[x1,y0,rr[1]],[x1,y1,rr[2]],[x0,y1,rr[3]]],g1),hole);
  k.st=(x0,y0,x1,y1)=>k.RR(Math.min(x0,x1),Math.min(y0,y1),Math.max(x0,x1),Math.max(y0,y1),[0,0,0,0]);
  /* овал-кольцо с толщинами tv (бока) и th (верх/низ); f — какие углы скруглены [нл,нп,вп,вл] */
  k.ring=(x0,y0,x1,y1,f,tv,th,fi)=>{const fi0=fi;f=f||[1,1,1,1];fi=fi||f;/* оптика (TYPE_FOUNDATION §2): свободный овал (все углы круглые) толще у экстремумов, чем прямой ствол */const rnd=tv==null&&th==null&&fi0==null&&f.every(q=>q),rw=Math.max(0,Math.min(1,(0.6-S/(p.xh||500))/0.3)); /* в тяжёлых весах прибавка сходит на нет: просветы e a s э не закрываем */tv=tv==null?(rnd?S*(1+(RK_V-1)*rw):S):tv;th=th==null?(rnd?H*(1+(RK_H-1)*rw):H):th;const bw=x1-x0,bh=y1-y0,r=k.rad(bw,bh);
    const iw=bw-2*tv,ih=bh-2*th;const ri=k.riSafe(k.radIn(r,iw,ih),r,tv,th,iw,ih);
    const o=[k.RR(x0,y0,x1,y1,f.map(q=>q*r))];
    if(iw>4&&ih>4)o.push(k.RR(x0+tv,y0+th,x1-tv,y1-th,fi.map(q=>q*ri),true));return o;};
  /* внутренний угол не выходит за внешний: середина внутренней дуги не дальше середины внешней (с запасом 6) */
  k.riSafe=(ri,r,tv,th,iw,ih)=>{const kp=Math.min(0.95,Math.max(0,g.kappa==null?K0:g.kappa)),c=(4-3*kp)/8,t=Math.min(tv,th);
    return Math.min(Math.max(ri,r-(t-6)/c),Math.max(2,Math.min(iw,ih)/2-1));};
  /* толщина диагонали по перу (эллипс S×H) и горизонтальная ширина среза */
  k.dw=(dx,dy)=>{const L=Math.hypot(dx,dy)||1,sn=Math.abs(dy)/L,cs=Math.abs(dx)/L;
    const tp=1/Math.sqrt((sn*sn)/(S*S)+(cs*cs)/(H*H))*(p.diag||1);return Math.min(tp/Math.max(sn,0.25),S*2.4);};
  /* диагональ по левой кромке: низ (xl0,y0) → верх (xl1,y1), ширина считается сама */
  k.dgL=(xl0,y0,xl1,y1,hw)=>{hw=hw||k.dw(xl1-xl0,y1-y0);return mkc(rp([[xl0,y0],[xl0+hw,y0],[xl1+hw,y1],[xl1,y1]],g1));};
  /* диагональ по осевой */
  k.dgC=(x0,y0,x1,y1,hw)=>{hw=hw||k.dw(x1-x0,y1-y0);return mkc(rp([[x0-hw/2,y0],[x0+hw/2,y0],[x1+hw/2,y1],[x1-hw/2,y1]],g1));};
  k.poly=pts=>mkc(rp(pts.map(q=>[q[0],q[1],q[2]||0]),g1));
  k.cut=(x0,y0,x1,y1)=>SUB(k.st(x0,y0,x1,y1));
  k.cutP=pts=>SUB(k.poly(pts));
  /* концы овальных знаков: высоты верхнего и нижнего среза (апертура) */
  k.term=(y0,y1,f)=>{const hh=y1-y0,gap=Math.max(hh*k.aper*(f||1),8);let yb=(y0+y1)/2-gap/2,yt=(y0+y1)/2+gap/2;
    yt=Math.min(yt,y1-H-Math.max(6,H*0.35));yb=Math.max(yb,y0+H+Math.max(6,H*0.35));if(yt<yb){const m=(y0+y1)/2;yt=m+4;yb=m-4;}return [yb,yt];};
  k.dot=(x,y,d)=>{d=d||Math.min(S*0.95,k.w>S*1.2?S:S);const r=Math.min(d/2,(p.round||0.5)*d*0.5);return k.RR(x,y,x+d,y+d,[r,r,r,r]);};
  k.fd=()=>Math.max(k.desc*0.62,H*1.5,90);
  /* ловушка для краски: узкий клин в остром внутреннем углу (x,y) вдоль направления (ux,uy) */
  /* lim — сколько штриха за углом (ловушка не прорезает штрих насквозь: остаётся ≥ TRAP_KEEP);
     «пятка» ромба уходит назад в просвет — вырез всегда открыт в просвет, а не висит дыркой в штрихе */
  /* tanA — тангенс половины угла просвета у вершины: в остром просвете «пятка» уходит дальше, до ширины ~2·wd+16 */
  k.trapAt=(x,y,ux,uy,lim,tanA)=>{if(k.trap<=0)return [];let L=S*0.55*k.trap;let wd=Math.max(3,S*0.07*k.trap+2);const nx=-uy,ny=ux;
    if(lim!=null)L=Math.min(L,lim-TRAP_KEEP);wd=Math.max(wd,Math.min(L*0.35,S*0.04));/* QA3: мелкая ловушка — выемка, а не щель */if(L<wd||wd<6)return [];/* волосяная щель не печатается — не режем */
    const bk=Math.max(wd*1.2+3,tanA>0?Math.min((wd+8)/tanA,Math.max(4*L,wd*4)):0);
    return [SUB(k.poly([[x-ux*bk,y-uy*bk],[x-nx*wd,y-ny*wd],[x+ux*L,y+uy*L],[x+nx*wd,y+ny*wd]]))[0]];};
  /* ловушка в развилке двух кромок x=a+b·y; s1,s2 — куда (±1 по y) кромки уходят от развилки вдоль просвета */
  k.trapX=(e1,e2,s1,s2,lim)=>{if(k.trap<=0||Math.abs(e1[1]-e2[1])<1e-6)return [];const y=(e2[0]-e1[0])/(e1[1]-e2[1]),x=e1[0]+e1[1]*y;
    const n=(b,sg)=>{const l=Math.hypot(b,1);return [b*sg/l,sg/l];},u1=n(e1[1],s1),u2=n(e2[1],s2);let ux=-(u1[0]+u2[0]),uy=-(u1[1]+u2[1]);const l=Math.hypot(ux,uy);if(l<1e-6)return [];
    const ca=Math.max(-1,Math.min(1,u1[0]*u2[0]+u1[1]*u2[1])),th=Math.acos(ca)/2;
    return k.trapAt(x,y,ux/l,uy/l,lim,Math.tan(th));};
  /* ---- сужение в стыках (join) ----
     k.jn — доля 0..0.6; глубина выемки = толщина штриха × jn × 0.55 (25 → ~14%, 50 → ~27%).
     Просвет у ствола поднимается острым «носиком» в штрих: штрих тоньше на внутренней стороне,
     внешний контур не меняется. Вычитание кладётся в группу штриха (не ствола) — ствол остаётся целым. */
  k.jn=Math.max(0,Math.min(60,p.join||0))/100;
  /* фактический радиус внутреннего угла кольца (как его скруглит rp) */
  k.ringIn=(x0,y0,x1,y1,tv,th)=>{tv=tv==null?S:tv;th=th==null?H:th;const bw=x1-x0,bh=y1-y0,iw=bw-2*tv,ih=bh-2*th;
    if(iw<=4||ih<=4)return {ri:0,iw:Math.max(iw,0),ih:Math.max(ih,0)};
    const r0=k.riSafe(k.radIn(k.rad(bw,bh),iw,ih),k.rad(bw,bh),tv,th,iw,ih),cham=(g.kappa==null?0.55:g.kappa)<0.25,cap=cham?0.34:0.5;
    return {ri:Math.min(r0,iw*cap,ih*cap,cham?S*0.95:1e9),iw,ih};};
  /* выемка у стыка: (xs,yc) — угол «кромка ствола × кромка штриха»; sx — куда уходит штрих от ствола (±1),
     sy — из просвета в штрих (±1); o.ri — радиус скругления этого угла просвета, o.free — свободная длина
     прямой кромки штриха, o.t — толщина штриха, o.m — множитель, o.e — запас внутрь ствола */
  k.joinCut=(xs,yc,sx,sy,o)=>{o=o||{};if(k.jn<=0)return [];const t=o.t||H,ri=Math.max(0,o.ri||0);
    const d=Math.min(t*0.36,t*k.jn*0.55*(o.m==null?1:o.m));if(d<2)return [];
    const free=Math.max(ri,o.free==null?S*2:o.free);
    const L=Math.max(ri,Math.min(free,Math.max(S*0.8,t*1.6,d*5))),e=o.e==null?S*0.5:o.e,R=ri+2;
    const P=(u,v)=>({x:xs+sx*u,y:yc+sy*v});
    /* профиль y=d·(1−u/L)²: плавный клин без перегиба, по касательной к кромке штриха */
    const B=P(0,d),T=P(L,0);B.b=P(L/3,d/3);T.a=P(L*2/3,0);
    const nodes=[Object.assign(P(-e,d),{a:null,b:null}),Object.assign(B,{a:null}),Object.assign(T,{b:null}),
      Object.assign(P(L,-1.5),{a:null,b:null}),Object.assign(P(0,-R),{a:null,b:null}),Object.assign(P(-e,-R),{a:null,b:null})];
    return SUB(mkc(nodes,false));};
  /* выемки для кольца, примыкающего к стволу: sx=+1 — ствол слева, -1 — справа; fi — флаги внутренних углов [нл,нп,вп,вл];
     mt/mb — множители для верхнего и нижнего стыка (0 — без выемки) */
  k.ringJoins=(x0,y0,x1,y1,fi,sx,mt,mb,fo,bare)=>{if(k.jn<=0)return [];fi=fi||[1,1,1,1];fo=fo||fi;const I=k.ringIn(x0,y0,x1,y1),xs=sx>0?x0+S:x1-S,o=[];
    if(I.iw<=4||I.ih<=4)return o;
    const nT=sx>0?fi[3]:fi[2],fT=sx>0?fi[2]:fi[3],nB=sx>0?fi[0]:fi[1],fB=sx>0?fi[1]:fi[0];
    /* тонкая горизонталь у сильно скруглённого внешнего угла не доходит до ствола в полную толщину —
       выемка перерезала бы стык: тогда её нет */
    const ro=k.rad(x1-x0,y1-y0),Se=bare?S*0.5:S/*bare — у стыка нет ствола: выемка (заходит на S/2 внутрь) режет саму стенку*/,drop=Math.max(Se<ro?ro-Math.sqrt(ro*ro-(ro-Se)*(ro-Se)):0,cornerDrop(ro,Se,g.kappa==null?K0:g.kappa)),dd=H*k.jn*0.55;
    const okJ=f=>!f||drop+Math.min(H*0.36,dd)+(bare?4:JOIN_KEEP)<=H;
    if(!okJ(sx>0?fo[3]:fo[2]))mt=0;if(!okJ(sx>0?fo[0]:fo[1]))mb=0;
    if(mt)o.push(...k.joinCut(xs,y1-H,sx,1,{ri:nT*I.ri,free:I.iw-fT*I.ri,m:mt}));
    if(mb)o.push(...k.joinCut(xs,y0+H,sx,-1,{ri:nB*I.ri,free:I.iw-fB*I.ri,m:mb}));
    return o;};
  return k;}
/* ---------- прописные ---------- */
GR.H=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar;return [k.st(0,0,S,h),k.st(w-S,0,w,h),k.st(S-1,ym-H/2,w-S+1,ym+H/2)];};
GR.I=g=>{const k=gk(g);return [k.st(0,0,k.S,k.h)];};
GR.E=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar;return [k.st(0,0,S,h),k.st(0,h-H,w,h),k.st(0,ym-H/2,w*0.9,ym+H/2),k.st(0,0,w,H)];};
GR.F=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*(k.bar-0.03);return [k.st(0,0,S,h),k.st(0,h-H,w,h),k.st(0,ym-H/2,w*0.9,ym+H/2)];};
GR.T=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,h-H,w,h),k.st(w/2-S/2,0,w/2+S/2,h)];};
GR.L=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),k.st(0,0,w,H)];};
GR.Pe=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),k.st(w-S,0,w,h),k.st(0,h-H,w,h)];};
GR.Ge=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),k.st(0,h-H,w,h)];};
GR.O=g=>{const k=gk(g);return k.ring(0,-k.ov,k.w,k.h+k.ov);};
GR.C=(g,mir,f)=>{const k=gk(g),{w,h,ov,cx}=k,[yb,yt]=k.term(-ov,h+ov,f);
  const o=[...k.ring(0,-ov,w,h+ov),k.cut(cx,yb,w+40,yt)[0]];return mir?MIRX(o,w):o;};
GR.G=g=>{const k=gk(g),{w,h,S,H,ov,cx}=k,ym=h*0.47,[yb,yt]=k.term(-ov,h+ov);
  return [...GRP(1,[...k.ring(0,-ov,w,h+ov),k.cut(cx,ym+H/2,w+40,Math.max(yt,ym+H/2+4))[0]]),k.st(cx*0.95,ym-H/2,w,ym+H/2)];};
GR.D=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),...k.ring(0,0,w,h,[0,1,1,0])];};
GR.B=(g)=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar,wt=w-S*0.18;
  const F=[0,1,1,0];return [k.st(0,0,S,h),...GRP(7,[...k.ring(0,ym-H/2,wt,h,F),...k.ring(0,0,w,ym+H/2,F),
    ...k.ringJoins(0,ym-H/2,wt,h,F,1,1,0.5),...k.ringJoins(0,0,w,ym+H/2,F,1,0.5,1)])];};
GR.P=g=>{const k=gk(g),{w,h,S,H}=k,yb=h*0.4,F=[0,1,1,0];return [k.st(0,0,S,h),...GRP(7,[...k.ring(0,yb,w,h,F),...k.ringJoins(0,yb,w,h,F,1,1,1)])];};
GR.R=g=>{const k=gk(g),{w,h,S,H}=k,yb=h*0.42,wb=w*0.96;const hw=k.dw(w-wb*0.5,yb);
  const F=[0,1,1,0];return [k.st(0,0,S,h),...GRP(7,[...k.ring(0,yb,wb,h,F),...k.ringJoins(0,yb,wb,h,F,1,1,1)]),k.dgL(w-hw,0,wb*0.5-hw*0.3,yb+H*0.5,hw)];};
GR.Q=g=>{const k=gk(g),{w,h,S,H}=k;const hw=k.dw(w*0.3,h*0.34);return [...k.ring(0,-k.ov,w,h+k.ov),k.dgC(w*0.92-hw*0.2,-h*0.12,w*0.6,h*0.22,hw*0.9)];};
GR.U=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.46;
  return [...GRP(1,[...k.ring(0,-ov,w,ym*2+ov),k.cut(S,ym,w-S,h+40)[0]]),k.st(0,ym,S,h),k.st(w-S,ym,w,h)];};
GR.J=g=>{const k=gk(g),{w,h,S,H,ov}=k,hj=h*0.56,[yb]=k.term(-ov,hj);
  return [...GRP(1,[...k.ring(0,-ov,w,hj,[1,1,1,1],null,null,[1,1,0,1]),k.cut(-40,yb,w-S,hj+40)[0]]),k.st(w-S,hj/2,w,h)];};
/* S: два полукольца, общий хребет, плоские срезы */
GR.S=(g,mir)=>{const k=gk(g),{w,h,S,H,ov,cx}=k,ym=h*0.52,dx=w*0.03;
  const [,ytT]=k.term(ym-H/2,h+ov),[ybB]=k.term(-ov,ym+H/2);
  const T=GRP(1,[...k.ring(dx,ym-H/2,w-dx,h+ov),k.cut(cx,-40,w+40,ytT)[0]]);
  const B=GRP(2,[...k.ring(0,-ov,w,ym+H/2),k.cut(-40,ybB,cx,h+40)[0]]);
  const o=[...T,...B];return mir?MIRX(o,w):o;};
/* А и V: трапеция минус внутренний треугольник; срез вершины по ширине ствола */
function aShape(k,inv){const {w,h,S,H}=k,aw=Math.min(S*0.92,w*0.3),cx=w/2;const hw=k.dw(cx-aw/2,h);
  const tipY=h*(1-(cx-hw)/(cx-aw/2))*-1+h;// высота внутренней вершины
  const yi=Math.min(h-H*0.6,(cx-hw)*h/(cx-aw/2));
  const out=k.poly([[0,0],[w,0],[cx+aw/2,h],[cx-aw/2,h]]);
  const inner=k.cutP([[hw,-40],[w-hw,-40],[w-hw+(-40)*0,-40],[cx,yi]]);
  const o=[out,...inner];
  /* ловушка во внутренней вершине */
  o.push(...k.trapAt(cx,yi,0,1,h-yi,(cx-hw)/Math.max(yi,1)));
  return inv?xf(o,(x,y)=>[x,h-y]):o;}
GR.A=g=>{const k=gk(g),{w,h,S,H}=k,cb=h*0.3,aw=Math.min(S*0.92,w*0.3),cx=w/2,hw=k.dw(cx-aw/2,h);
  const xl=y=>hw+y*(cx-aw/2)/h,xr=y=>w-xl(y);
  return [...GRP(1,aShape(k,false)),k.st(xl(cb)-2,cb-H/2,xr(cb)+2,cb+H/2)];};
GR.V=g=>{const k=gk(g);return GRP(1,aShape(k,true));};
GR.W=g=>{const k=gk(g),{w,h}=k,w1=w*0.58;const kk=Object.assign({},k,{w:w1,cx:w1/2});const a=aShape(kk,true);
  return [...GRP(1,a),...GRP(2,xf(aShape(kk,true),(x,y)=>[x+w-w1,y]))];};
GR.X=g=>{const k=gk(g),{w,h}=k,hw=k.dw(w,h)*0.98,dc=h/2*hw/Math.max(w-hw,1);/* dc — от центра до развилки */
  return [k.dgC(hw/2,0,w-hw/2,h,hw),k.dgC(w-hw/2,0,hw/2,h,hw),...k.trapAt(w/2,h/2+dc,0,-1,dc,(w-hw)/h),...k.trapAt(w/2,h/2-dc,0,1,dc,(w-hw)/h)];};
GR.Y=g=>{const k=gk(g),{w,h,S}=k,yj=h*0.44,cx=w/2,hw=k.dw(cx,h-yj),yc=yj+(h-yj)*(hw/2)/Math.max(cx-hw/2,1);
  return [k.dgC(hw/2,h,cx,yj,hw),k.dgC(w-hw/2,h,cx,yj,hw),k.st(cx-S/2,0,cx+S/2,yj+S*0.2),...k.trapAt(cx,yc,0,-1,yc,(cx-hw/2)/Math.max(h-yj,1))];};
GR.Z=g=>{const k=gk(g),{w,h,H}=k,hw=k.dw(w,h-2*H);
  return [k.st(0,h-H,w,h),k.st(0,0,w,H),k.poly([[0,H],[hw,H],[w,h-H],[w-hw,h-H]])];};
GR.N=(g,mir)=>{const k=gk(g),{w,h,S}=k,hw=k.dw(w-S,h)*0.96;
  const yn=h*S/Math.max(w-hw,1);/* где кромка диагонали входит в ствол */
  const o=[k.st(0,0,S,h),k.st(w-S,0,w,h),k.poly([[0,h],[hw,h],[w,0],[w-hw,0]]),...k.trapAt(S,h-yn,0,-1,null,Math.tan(Math.atan((w-hw)/h)/2)),...k.trapAt(w-S,yn,0,1,null,Math.tan(Math.atan((w-hw)/h)/2))];
  return mir?MIRX(o,w):o;};
GR.M=g=>{const k=gk(g),{w,h,S}=k,vb=h*k.mv,cx=w/2,aw=Math.min(S*0.9,w*0.22),hw=k.dw(cx-aw/2,h-vb)*0.95;
  /* средняя «V»: трапеция минус внутренний треугольник со сдвигом кромок на ширину ноги */
  const xo=y=>(cx-aw/2)*(h-y)/(h-vb),xi=y=>xo(y)+hw,yA=h-(cx-hw)*(h-vb)/(cx-aw/2);
  const yAp=Math.max(Math.min(yA,h-k.H*0.6),Math.min(vb+k.H*0.6,h-k.H*0.6));/* низ средней «V» не перерезается */
  const V=GRP(1,[k.poly([[0,h],[w,h],[cx+aw/2,vb],[cx-aw/2,vb]]),k.cutP([[xi(h+40),h+40],[w-xi(h+40),h+40],[cx,yAp]])[0],...k.trapAt(cx,yAp,0,-1,yAp-vb,(cx-hw)/Math.max(h-yAp,1))]);
  return [k.st(0,0,S,h),k.st(w-S,0,w,h),...V];};
/* К и половина Ж: плечо в верхний правый угол, нога из плеча в нижний правый */
function kArms(k,x0,x1,h,gid){const {S,H}=k,yj=h*0.4,w=x1-x0;
  const hw1=k.dw(w,h-yj),Pt=[x1-hw1/2,h],J=[x0,yj];const m=(Pt[0]-J[0])/(h-yj);const yb=yj-hw1/(2*Math.max(m,0.2));
  const xc=y=>J[0]+m*(y-yj);
  const arm=k.dgC(xc(yb),yb,Pt[0],h,hw1);
  const yq=yj+(h-yj)*0.36,xq=xc(yq);const hw2=k.dw(x1-xq,yq)*1.02;
  const leg=k.dgC(x1-hw2/2,0,xq,yq,hw2);
  /* ловушка — в развилке плеча и ноги (правая кромка плеча × правая кромка ноги), не глубже, чем до ствола */
  const xl0=x1-hw2/2,cl=(xq-xl0)/yq;
  const tr=k.trapX([J[0]-m*yj+hw1/2,m],[xl0+hw2/2,cl],-1,1,null);
  const tr2=tr.length?k.trapX([J[0]-m*yj+hw1/2,m],[xl0+hw2/2,cl],-1,1,Math.max(0,(J[0]-m*yj+hw1/2+m*((xl0+hw2/2-(J[0]-m*yj+hw1/2))/(m-cl)))-x0)*0.7):[];
  /* плечо не выходит за левую кромку ствола */
  return GRP(gid||5,[arm,leg,k.cut(x0-S-2000,-200,x0-S,h+200)[0],...tr2]);}
GR.K=g=>{const k=gk(g),{w,h,S}=k;return [k.st(0,0,S,h),...kArms(k,S,w,h)];};
GR.Zhe=g=>{const k=gk(g),{w,h,S}=k,cx=w/2;return [k.st(cx-S/2,0,cx+S/2,h),...kArms(k,cx+S/2,w,h,5),...MIRX(kArms(k,cx+S/2,w,h,6),w)];};
GR.Be=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*0.56,F=[0,1,1,0];return [k.st(0,0,S,h),k.st(0,h-H,w*0.92,h),...GRP(7,[...k.ring(0,0,w,ym+H/2,F),...k.ringJoins(0,0,w,ym+H/2,F,1,1,1)])];};
GR.De=g=>{const k=gk(g),{w,h,S,H}=k,fd=k.fd(),m=w*0.09,xr=w-m,xt=m+w*0.12,tw=Math.max(S*0.62,H*1.1);
  return [k.st(0,0,w,H),k.st(0,-fd,tw,H),k.st(w-tw,-fd,w,H),k.st(xr-S,0,xr,h),k.st(xt,h-H,xr,h),k.dgL(m,H*0.5,xt,h)];};
GR.El=g=>{const k=gk(g),{w,h,S,H}=k,xt=w*0.2;return [k.st(w-S,0,w,h),k.st(xt,h-H,w,h),k.dgL(0,0,xt,h)];};
GR.Ze=(g,mir)=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*k.bar,dx=w*0.04,xm=Math.max(w*0.3,dx+S+2);
  const [,ytT]=k.term(ym-H/2,h+ov,3),[ybB]=k.term(-ov,ym+H/2,3);
  const T=GRP(1,[...k.ring(dx,ym-H/2,w-dx,h+ov,[1,1,1,1],null,null,[0,1,1,1]),k.cut(-40,-40,xm,ytT)[0]]);
  const B=GRP(2,[...k.ring(0,-ov,w,ym+H/2,[1,1,1,1],null,null,[1,1,1,0]),k.cut(-40,ybB,xm,h+40)[0]]);
  const o=[...T,...B];return mir?MIRX(o,w):o;};
GR.Ee=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar;return [...GR.C(g,true,2.6),k.st(w*0.3,ym-H/2,w-S+1,ym+H/2)];};
GR.Ye=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*k.bar;return [...GR.C(g,false,2.6),k.st(S-1,ym-H/2,w*0.7,ym+H/2)];};
GR.Ii=g=>GR.N(g,true);
GR.Breve=(k,x0,x1,y0)=>{const t=Math.min(Math.max(k.H*0.85,30),k.S*0.6),hh=t*2.4;
  return GRP(9,[...k.ring(x0,y0,x1,y0+hh*2,[1,1,1,1],t*1.15,t),k.cut(x0-20,y0+hh,x1+20,y0+hh*2+20)[0]]);};
GR.Ish=g=>{const k=gk(g),{w,h}=k,bw=Math.min(w*0.5,k.S*2.6),x0=(w-bw)/2;return [...GR.Ii(g),...GR.Breve(k,x0,x0+bw,h+Math.max(40,k.H*0.6))];};
GR.U_=(g,desc)=>{/* У/у: правая длинная диагональ до низа, левое плечо в неё */
  const k=gk(g),{w,h,S}=k,yb=desc?-k.desc:0;const hw=k.dw(w,h-yb);
  const xb=desc?hw*0.5+w*0.05:hw*0.5+w*0.04;const L=k.dgC(xb,yb,w-hw/2,h,hw);
  const m=((w-hw/2)-xb)/(h-yb),xc=y=>xb+m*(y-yb);const yj=desc?h*0.02:h*0.32;const hw2=k.dw(xc(yj)-hw/2,h-yj);
  /* ловушка в развилке: правая кромка плеча × левая кромка длинной диагонали, вниз в штрих */
  const xe=xc(yj)-hw*0.1,ca=-(xe-hw2/2)/(h-yj),aa=hw2/2-ca*h;
  return [L,k.dgC(hw2/2,h,xe,yj,hw2),...k.trapX([aa+hw2/2,ca],[xb-m*yb-hw/2,m],1,1,hw*0.7)];};
GR.Ef=(g,a,b)=>{const k=gk(g),{w,h,S,H,ov}=k,full=a!=null,y0=full?-ov:h*0.1,y1=full?h+ov:h*0.9;
  return [k.st(w/2-S/2,full?a:0,w/2+S/2,full?b:h),...k.ring(0,y0,w,y1)];};
GR.Tse=g=>{const k=gk(g),{w,h,S,H}=k,fd=k.fd(),tw=Math.max(S*0.62,H*1.1);return [k.st(0,0,S,h),k.st(w-S-tw*0.0,0,w-tw*0.0,h),k.st(0,0,w,H),k.st(w-tw,-fd,w+0,H)];};
GR.Che=g=>{const k=gk(g),{w,h,S,H}=k,ym=h*0.44,r=Math.min(H*1.2,S*0.9);
  return [k.st(0,ym,S,h),...GRP(7,[k.RR(0,ym-H/2,w-S+1,ym+H/2,[r,0,0,0]),...k.joinCut(w-S,ym-H/2,-1,1,{free:(w-S)*0.6})]),k.st(w-S,0,w,h)];};
GR.Sha=g=>{const k=gk(g),{w,h,S,H}=k,mx=w/2-S/2;return [k.st(0,0,S,h),k.st(mx,0,mx+S,h),k.st(w-S,0,w,h),k.st(0,0,w,H)];};
GR.Shcha=g=>{const k=gk(g),{w,h,S,H}=k,fd=k.fd(),tw=Math.max(S*0.62,H*1.1),wi=w-tw*0.55,mx=wi/2-S/2;
  return [k.st(0,0,S,h),k.st(mx,0,mx+S,h),k.st(wi-S,0,wi,h),k.st(0,0,wi,H),k.st(w-tw,-fd,w,H)];};
GR.softBowl=(k,x0,x1,yt)=>{const F=[0,1,1,0];return GRP(7,[...k.ring(x0,0,x1,yt,F),...k.ringJoins(x0,0,x1,yt,F,1,1,1)]);};
GR.Soft=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),...GR.softBowl(k,0,w,h*0.56+H*0.5)];};
GR.Hard=g=>{const k=gk(g),{w,h,S,H}=k,xs=w*0.24;return [k.st(0,h-H,xs+S,h),k.st(xs,0,xs+S,h),...GR.softBowl(k,xs,w,h*0.56+H*0.5)];};
GR.Yeru=g=>{const k=gk(g),{w,h,S,H}=k,xr=w-S,wb=xr-S*0.45;return [k.st(0,0,S,h),...GR.softBowl(k,0,wb,h*0.56+H*0.5),k.st(xr,0,w,h)];};
GR.Yu=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*k.bar,ow=w*0.64,fr=(w-ow-S)*0.7;
  return [k.st(0,0,S,h),...GRP(7,[k.st(S-1,ym-H/2,w-ow+S,ym+H/2),...k.joinCut(S,ym+H/2,1,-1,{m:0.5,free:fr}),...k.joinCut(S,ym-H/2,1,1,{m:0.5,free:fr})]),...k.ring(w-ow,-ov,w,h+ov)];};
GR.Ya=g=>MIRX(GR.R(g),g.w);
GR.Ghe=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),k.st(0,h-H,w,h),k.st(w-S*0.6,h-1,w,h+Math.max(80,H*1.2))];};
GR.Yo=g=>{const k=gk(g),{w,h,S}=k,d=Math.min(S*0.9,w*0.28),y=h+Math.max(46,d*0.45);return [...GR.E(g),k.dot(w*0.14,y,d),k.dot(w*0.86-d,y,d)];};
GR.Yi=g=>{const k=gk(g),{h,S}=k,d=S*0.62,y=h+Math.max(46,d*0.5);return [k.st(0,0,S,h),k.dot(-d*0.5,y,d),k.dot(S-d*0.5,y,d)];};
/* ---------- строчные ---------- */
/* чаша a/g у ствола справа — как у d и q: плоский верх и низ на линиях (без нависания овала над срезом ствола) */
GR.bowlR=k=>MIRX(GR.softBowl(k,0,k.w,k.h),k.w);
GR.a=g=>{const k=gk(g),{w,h,S}=k;return [...GR.bowlR(k),k.st(w-S,0,w,h)];};
GR.b=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,k.asc),...GR.softBowl(k,0,w,h)];}; /* b: ствол + чаша во всю высоту строчных (как у ь, но выше) */
GR.d=g=>MIRX(GR.b(g),g.w);
GR.p=g=>{const k=gk(g),{w,h,S,H}=k,F=[0,1,1,0];return [k.st(0,-k.desc,S,h),...GRP(7,[...k.ring(0,0,w,h,F),...k.ringJoins(0,0,w,h,F,1,1,1)])];};
GR.q=g=>MIRX(GR.p(g),g.w);
GR.e=g=>{const k=gk(g),{w,h,S,H,ov,cx}=k,ym=h*0.52,yb=Math.max(-ov+H+Math.max(6,H*0.35),ym-H/2-Math.max(h*k.aper*1.3,H*0.5));
  return [...GRP(1,[...k.ring(0,-ov,w,h+ov),k.cut(cx,yb,w+40,ym-H/2)[0]]),k.st(S-1,ym-H/2,w,ym+H/2)];};
GR.f=g=>{const k=gk(g),{w,h,S,H}=k,sx=w*0.18,a=k.asc;return [k.st(sx,0,sx+S,a),k.st(sx,a-H,w,a),k.st(0,h-H,w*0.86,h)];};
GR.t=g=>{const k=gk(g),{w,h,S,H}=k,sx=w*0.18,top=h+(k.asc-h)*0.5;return [k.st(sx,0,sx+S,top),k.st(0,h-H,w,h),k.st(sx,0,w,H)];};
GR.g=g=>{const k=gk(g),{w,h,S,H}=k,d=k.desc*0.82;return [...GR.bowlR(k),k.st(w-S,-d,w,h),k.st(w*0.08,-d,w,-d+H)];};
GR.j=g=>{const k=gk(g),{w,h,S,H}=k,d=k.desc*0.82;return [k.st(w-S,-d,w,h),k.st(0,-d,w,-d+H),k.dot(w-S,h+Math.max(40,S*0.4),S)];};
GR.i=g=>{const k=gk(g),{h,S}=k;return [k.st(0,0,S,h),k.dot(0,h+Math.max(40,S*0.4),S)];};
/* «l» с коротким хвостом вправо-вверх (русский рынок): ствол плавно уходит в клин, конец поднят на ~0.15 x-высоты и срезан вертикально;
   вынос за ствол ≈ 0.55·S (90–150) — читается как строчная рядом с L */
GR.lTailL=k=>Math.min(150,Math.max(90,k.S*0.55));
GR.lTailD=k=>k.H*1.0+0.15*(k.p.xh||530)+0.0;
GR.lTail=k=>{const {S,H}=k,tl=GR.lTailL(k),dd=GR.lTailD(k),xR=S+tl;
  const rO=Math.max(0,Math.min(k.rad(xR,dd*2),dd-H*0.35));
  return [...GRP(5,[k.RR(0,0,xR,dd,[rO,0,0,0]),SUB(k.poly([[S,H],[xR+1,dd],[xR+1,dd+60],[S,dd+60]]))[0]])];};
GR.l=g=>{const k=gk(g);return [k.st(0,GR.lTailD(k)-1,k.S,k.asc),...GR.lTail(k)];};
GR.h=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,k.asc),k.st(w-S,0,w,h),k.st(0,h-H,w,h)];};
GR.k=g=>{const k=gk(g),{w,h,S}=k;return [k.st(0,0,S,k.asc),...kArms(k,S,w,h)];};
GR.n=g=>{const k=gk(g),{w,h,S,H,ov}=k;
  /* n: ствол + арка (кольцо без низа), скруглён только правый верх — плечо выходит из ствола */
  /* сужение в стыке заменяет ловушку в этом углу (не дублируется): глубина — большая из двух */
  const mj=k.jn>0?Math.max(1,k.trap*0.3/(k.jn*0.55)):0;
  return [k.st(0,0,S,h),...GRP(1,[...k.ring(0,0,w,h+ov,[0,0,1,0],null,null,[0,0,1,1]),k.cut(S,-80,w-S,H+1)[0],...k.ringJoins(0,0,w,h+ov,[0,0,1,1],1,mj,0,[0,0,1,0])]),...(mj?[]:k.trapAt(S,h-H-2,0.6,-0.8))];};
GR.hn=g=>{const k=gk(g);return [...GR.n(g),k.st(0,g.h-1,k.S,k.asc)];};
GR.r=g=>{const k=gk(g),{w,h,S,H,ov}=k,top=h+ov;
  /* r: ствол + плечо, плавно отходящее от ствола (как арка n), и короткий спуск с плоским горизонтальным срезом.
     Внутренний просвет — одно скруглённое вычитание: нет ступенек и «флажков» ни в одном весе. */
  const tr=Math.max(4,Math.min(Math.max(H*1.2,S*0.7),(w-S)*0.55));          // толщина спуска (терминала)
  const xi=w-tr,iw=Math.max(4,xi-S),ih=top-H;
  const r=Math.max(0,Math.min(k.rad(w,top),w-S-2,top*0.5));
  const ri=Math.max(2,Math.min(k.radIn(r,iw,ih),iw*0.48));                 // скругление просвета у ствола и под плечом
  /* горизонтальный срез терминала: идёт от середины просвета, поэтому проходит и через скругление под плечом
     (спуск одинаковой длины во всех весах); если скругления сходятся — срез не выше их начала */
  const free=xi-ri-(S+ri),xc=free>=2?Math.max(S+ri+1,xi-ri-1):(S+xi)/2;
  let yt=top-Math.max(H+Math.max(10,H*0.4),h*0.3);if(free<2)yt=Math.min(yt,top-H-ri-2);
  const mj=k.jn>0?Math.max(1,k.trap*0.3/(k.jn*0.55)):0;
  return [k.st(0,0,S,h),...GRP(1,[k.RR(0,0,w,top,[0,0,r,0]),SUB(k.RR(S,-80,xi,top-H,[0,0,ri,ri]))[0],k.cut(xc,-80,w+40,yt)[0],
    ...k.joinCut(S,top-H,1,1,{ri,free:iw-ri,m:mj})]),...(mj?[]:k.trapAt(S,top-H-2,0.6,-0.8))];};
GR.u=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(0,0,S,h),k.st(w-S,0,w,h),k.st(0,0,w,H)];};
GR.y=g=>GR.U_(g,true);
GR.be=g=>{const k=gk(g),{w,h,S,H,ov}=k,a=k.asc;
  /* перекладина почти легла на чашу (низкие выносные/толстая горизонталь) — сливается с ней, без щели-дырки в углу */
  const yb=a-H-(h+ov)<GL_GAP?Math.min(a-H,h+ov-H*0.5):a-H;
  return [...k.ring(0,-ov,w,h+ov),k.st(0,h*0.4,S,a),k.st(0,yb,w*0.86,a)];};
/* ---------- цифры ---------- */
GR.n0=g=>GR.O(g);
GR.n1=g=>{const k=gk(g),{w,h,S,H}=k;return [k.st(w-S,0,w,h),k.poly([[0,h*0.68],[w-S+1,h-H*1.35],[w-S+1,h],[0,h*0.68+H*1.45]])];};
GR.n2=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.46,[,yt]=k.term(ym,h+ov,2.2);const hwB=k.dw(w-S,ym)*1.02,yTop=ym+H*0.55;
  /* «2»: верхняя дуга обрезана слева (плоский срез) и снизу; диагональ входит в правую стенку */
  return [...GRP(1,[...k.ring(0,ym-H,w,h+ov,[1,0,1,1],null,null,[1,0,1,1]),k.cut(-40,ym-H-40,w-S,yt)[0],k.cut(-40,-40,w+40,yTop)[0]]),k.poly([[0,H-1],[hwB,H-1],[w,yTop+1],[w-S,yTop+1]]),k.st(0,0,w,H)];};
/* «3»: плоская верхняя перекладина и диагональ в нижнюю чашу — не «З» (круглая верхняя чаша): знаки различимы при 12 px */
GR.n3=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.42,xm=Math.max(w*0.3,S+2),ex=w*0.05;
  const [ybB]=k.term(-ov,ym+H/2,3);
  const B=GRP(2,[...k.ring(0,-ov,w,ym+H/2,[1,1,1,1],null,null,[1,1,1,0]),k.cut(-40,ybB,xm,h+40)[0]]);
  const xj=xm,hd=k.dw(w-xj,h-H-ym);
  return [k.st(ex,h-H,w,h),k.poly([[xj,ym],[xj+hd,ym],[w,h-H+1],[w-hd,h-H+1]]),...B];};
GR.n4=g=>{const k=gk(g),{w,h,S,H}=k,yc=h*0.28,xs=w-S-w*0.06,hw=k.dw(xs,h-yc);
  return [k.st(xs,0,xs+S,h),k.st(0,yc,w,yc+H*1.05),k.dgL(0,yc,xs-hw*0.72,h,hw)];};
GR.n5=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.56,[ybB]=k.term(-ov,ym+H/2);
  return [k.st(0,h-H,w*0.96,h),k.st(0,ym-H/2,S,h),...GRP(1,[...k.ring(0,-ov,w,ym+H/2,[1,1,1,0]),k.cut(-40,ybB,Math.max(S+2,w*0.5),ym-H/2)[0]])];};/* QA3: срез до середины — без шипа от внутреннего скругления */
GR.n6=g=>{const k=gk(g),{w,h,S,H,ov,cx}=k,ym=h*0.56,[,yt]=k.term(-ov,h+ov);
  /* правая сторона ниже конца верхней дуги — только чаша (без остатка внешнего кольца, дававшего уступ на плече);
     нижние внутренние углы чаши не выходят за внешнюю дугу большого кольца */
  const kp=Math.min(0.95,Math.max(0,g.kappa==null?K0:g.kappa)),c=(4-3*kp)/8,ro=k.rad(w,h+2*ov),Ib=k.ringIn(0,-ov,w,ym+H/2);
  /* QA3: верхний левый внешний угол чаши входит в ствол полого (иначе при большом kappa/innerR — уступ на стыке) */
  const rb6=k.rad(w,ym+H/2+ov),ft=rb6>0?Math.min(1,S*1.6/rb6):1;
  const fb=Ib.ri>0?Math.max(1,(ro-(Math.min(S,H)-6)/c)/Ib.ri):1;
  return [...GRP(1,[...k.ring(0,-ov,w,h+ov),k.cut(cx,-ov-40,w+40,Math.max(yt,ym+H+4))[0]]),...GRP(2,k.ring(0,-ov,w,ym+H/2,[1,1,1,ft],null,null,[fb,fb,1,1]))];};
GR.n7=g=>{const k=gk(g),{w,h,S,H}=k,hw=k.dw(w*0.6,h-H);return [k.st(0,h-H,w,h),k.poly([[w*0.16,0],[w*0.16+hw,0],[w,h-H+1],[w-hw,h-H+1]])];};
GR.n8=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.53,dx=w*0.05;return [...k.ring(dx,ym-H/2,w-dx,h+ov),...k.ring(0,-ov,w,ym+H/2)];};
GR.n9=g=>ROT(GR.n6(g),g.w,g.h);
/* ---------- знаки ---------- */
GR.quest=g=>{const k=gk(g),{w,h,S,H,ov}=k,d=Math.min(S*0.95,w*0.36),gp=Math.max(40,H*0.5),yr=Math.min(h*0.66,Math.max(h*0.42,d+gp+H*1.7)),cx=w/2;
  const [,yt0]=k.term(yr,h+ov,1.8),yt=Math.min(yt0,h+ov-k.rad(w,h+ov-yr+H)*0.8);
  return [...GRP(1,[...k.ring(0,yr-H,w,h+ov,[0,1,1,1],null,null,[0,0,1,1]),k.cut(-40,yr,S*1.001,yt)[0],k.cut(-40,yr-H-40,cx-S/2,yr)[0]]),k.st(cx-S/2,d+gp,cx+S/2,yr),k.dot(cx-d/2,0,d)];};
GR.ruble=g=>{const k=gk(g),{w,h,S,H}=k,yb=h*0.42,wb=w*0.92;return [k.st(w*0.12,0,w*0.12+S,h),...k.ring(w*0.12,yb,wb,h,[0,1,1,0]),k.st(0,h*0.2,w*0.72,h*0.2+H)];};
GR.numero=g=>{const k=gk(g),{w,h,S,H}=k,wn=w*0.66;const kk=Object.assign({},g,{w:wn});
  const ow=w-wn-w*0.05,ox=wn+w*0.05,t=Math.max(H*0.8,S*0.45);
  return [...GR.N(kk),...k.ring(ox,h*0.38,w,h,[1,1,1,1],t,t*0.85),k.st(ox,h*0.18,w,h*0.18+t*0.85)];};
/* ---------- набор: те же ширины, новые конструкции ---------- */
function buildGrotesk(){
  const G={};for(const ch in FONTS.volt.GL)G[ch]=FONTS.volt.GL[ch];
  const D=(chars,shape,w,kind)=>{for(const ch of chars){const old=G[ch];G[ch]={shape,w:w==null?old.w:w,k:kind||(old?old.k:'cap'),opt:old?old.opt:{}};}};
  D('H',GR.H);D('I',GR.I);D('E',GR.E);D('F',GR.F);D('T',GR.T);D('L',GR.L);D('O',GR.O);D('C',g=>GR.C(g));D('G',GR.G);D('D',GR.D);
  D('B',GR.B);D('P',GR.P);D('R',GR.R);D('Q',GR.Q);D('U',GR.U);D('J',GR.J);D('S',g=>GR.S(g));D('A',GR.A);D('V',GR.V);D('W',GR.W);
  D('X',GR.X);D('Y',GR.Y);D('Z',GR.Z);D('N',g=>GR.N(g));D('M',GR.M);D('K',GR.K);
  D('Б',GR.Be);D('Г',GR.Ge);D('Д',GR.De);D('Ж',GR.Zhe);D('З',g=>GR.Ze(g));D('И',GR.Ii);D('Й',GR.Ish);D('Л',GR.El);D('П',GR.Pe);
  D('У',g=>GR.U_(g,false));D('Ф',g=>GR.Ef(g));D('Ц',GR.Tse);D('Ч',GR.Che);D('Ш',GR.Sha);D('Щ',GR.Shcha);D('Ъ',GR.Hard);D('Ы',GR.Yeru);
  D('Ь',GR.Soft);D('Э',GR.Ee);D('Ю',GR.Yu);D('Я',GR.Ya);D('Є',GR.Ye);D('Ґ',GR.Ghe);D('Ё',GR.Yo);D('Ї',GR.Yi);
  D('a',GR.a);D('b',GR.b);D('c',g=>GR.C(g));D('d',GR.d);D('e',GR.e);D('f',GR.f);D('g',GR.g);D('h',GR.h);D('i',GR.i);D('j',GR.j);
  D('k',GR.k);D('l',GR.l);D('o',GR.O);D('p',GR.p);D('q',GR.q);D('s',g=>GR.S(g));D('t',GR.t);D('u',GR.U);D('n',GR.n);D('r',GR.r);D('h',GR.hn);D('v',GR.V);D('w',GR.W);
  D('x',GR.X);D('y',GR.y);D('z',GR.Z);D('?',GR.quest);D('₽',GR.ruble);D('№',GR.numero);
  D('б',GR.be);D('в',GR.B);D('г',GR.Ge);D('д',GR.De);D('ж',GR.Zhe);D('з',g=>GR.Ze(g));D('и',GR.Ii);D('й',GR.Ish);D('к',GR.K);
  D('л',GR.El);D('м',GR.M);D('н',GR.H);D('п',GR.Pe);D('т',GR.T);D('ф',g=>GR.Ef(g,-g.desc,g.asc));D('ц',GR.Tse);D('ч',GR.Che);
  D('ш',GR.Sha);D('щ',GR.Shcha);D('ъ',GR.Hard);D('ы',GR.Yeru);D('ь',GR.Soft);D('э',GR.Ee);D('ю',GR.Yu);D('я',GR.Ya);D('є',GR.Ye);
  D('ґ',GR.Ghe);D('ё',g=>{const k=gk(g),{w,h,S}=k,d=Math.min(S*0.9,w*0.28),y=h+Math.max(40,d*0.45);return [...GR.e(g),k.dot(w*0.14,y,d),k.dot(w*0.86-d,y,d)];});
  D('ї',GR.Yi);D('і',GR.i);
  for(const [c,f] of [['0',GR.n0],['1',GR.n1],['2',GR.n2],['3',GR.n3],['4',GR.n4],['5',GR.n5],['6',GR.n6],['7',GR.n7],['8',GR.n8],['9',GR.n9]])D(c,f);
  return G;}
