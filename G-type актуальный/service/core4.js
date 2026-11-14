/* ===== VOLT: сборка глифа из параметров, правок, направляющих и сетки ===== */
function makeG(p,w,h){
  const S=sE(p),Hh=p.hair;
  return {p,w,h,S,H:Hh,Hr:Hh*(1+(p.optic||0)/100),D:Math.min(S*p.diag,S*1.4),sp:p.spur,sw:S*0.6,ov:p.ov,round:p.round,
    kappa:p.kappa==null?K0:p.kappa,asc:p.asc,desc:p.desc,capH:p.capH,xh:p.xh,RO:240,RI:120*(p.innerR==null?1:p.innerR),RS:46};
}
function glyphWidth(ch,p,ed){
  const d=GL[ch];if(!d)return 0;
  let w=typeof d.w==='function'?d.w(p):(d.opt.fixed?d.w:d.w*p.wdth/100);
  if(ed&&ed.wm)w*=ed.wm/100;
  return Math.max(w,40);
}
/* защита архитектуры: параметры держатся в согласованных пределах, что бы ни пришло из проекта или ползунка.
   Пределы взаимозависимы и считаются по порядку приоритета: пропорции → ширина → ствол → горизонталь →
   апертура → ловушки/стыки. Каждый следующий параметр зажимается с учётом уже зажатых предыдущих, поэтому
   у ползунка «старшего» параметра предел не зависит от «младших» (интерфейс показывает его как динамический предел).
   Цель: при любых значениях ползунков число частей и дыр у знаков не меняется, просветы не уже SAFE_G. */
const CL=(v,a,b)=>Math.max(a,Math.min(b,v));
const SAFE_G=16;
function paramLimits(p,font){const q=Object.assign({},p),L={};font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');
  const cl=(k,lo,hi,dflt)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v)){if(dflt===undefined)return;v=dflt;}q[k]=CL(+v,lo,hi);};
  const G=SAFE_G,codex=font==='codex';
  cl('capH',620,760,700);cl('xh',q.capH*0.64,q.capH*0.86,500);
  cl('asc',q.capH+10,q.capH+160,760);cl('desc',150,270,210);
  cl('wdth',80,140,100);
  const k=q.wdth/100,sk=q.stemScale?k:1,xh=q.xh,cap=q.capH;
  cl('ov',0,22,0);
  if(codex){
    cl('asc',Math.max(q.capH+10,xh+140),q.capH+160,760);/* f, б: выносной элемент не ложится на чашу */
    /* Кодекс (перо): S — широкая сторона пера, H — узкая. Ширина знаков Кодекса сама растёт со стволом выше 150
       (cxWx, core7), засечки — медленнее ствола (soOf), поэтому пределы считаются по настоящей ширине знака (glyphWidth).
       Границы сняты стресс-тестом топологии (stress.js):
       ствол снизу — у 5 чаша отрывается от стойки (растёт с шириной), у широкого низкого к отрываются плечо и нога;
       сверху — зазор между стволами n/h/и/H/N/П ≥ 40, $ (по ширине $), Q/%/@ в узких, низкие прописные;
       узкая сторона пера от 36 (8, K) до пределов $, ж, в/е, б; засечки соседних стволов не сходятся. */
    const gapS=Sx=>{const pp=Object.assign({},q,{stem:Sx/sk,round:0});let g=1e9;
      for(const ch of ['n','h','u','п','н','и','H','N','П','Н']){if(!GL[ch])continue;const n=NST_CX[ch]||2;
        g=Math.min(g,(glyphWidth(ch,pp)-n*Sx)/(n-1));}return g;};
    /* $: ствол + узкая сторона ≤ (0.53 − 0.125·k)·(ширина $ при засечках 0.75) − 10 (калибровка calD.js); ширина $ растёт со стволом */
    const dolS=Sx=>{const pp=Object.assign({},q,{stem:Sx/sk,round:0.75});return GL['$']?(0.54-0.125*k)*glyphWidth('$',pp)-10:1e9;};
    const rK=514*k/xh,kLo=rK>1.44?100+(rK-1.44)*300:0;const wl=CL((rK-1.25)/0.3,0,1);/* широкий и низкий: развилки к, ж теснее */
    {let hi=Math.min(xh*(rK>1.44?0.4:0.48),240,cap>=700?240:228+(cap-700)*0.7/*низкие прописные*/,100+400*(k-0.8)/*узкий и тяжёлый: Q, %, @*/);const lo=Math.max(95,100*k-20,kLo);const okS=v=>gapS(v)>=CODEX_LIM.g&&dolS(v)>=v+36;
      if(!okS(hi)){let a=lo,b=hi;for(let i=0;i<18;i++){const m=(a+b)/2;if(okS(m))a=m;else b=m;}hi=a;}
      cl('stem',lo/sk,hi/sk,150);}
    const S=q.stem*sk;
    /* угол пера: в узких знаках крутое перо замыкает развилку k */
    if(q.diag!=null)cl('diag',0,50-30*wl-25*CL((S-170)/30,0,1)*CL((cap-700)/40,0,1)/*ж: тяжёлое перо при высоких прописных*/);
    /* узкая сторона: у K при крутом пере не тоньше 40; сверху — $ (dolS), ж (низкие/высокие прописные), чаши, б */
    cl('hair',Math.max((q.diag||0)>30?40:36,S*0.24),Math.min(dolS(S)-S,84,S*0.42,(q.diag||0)>27&&S>190?58:1e9/*k: крутое тяжёлое перо*/,(q.slant||0)>3?0.2*S+160*(k-1)+18:1e9/*курсивная и: просвет у засечек*/,Math.max(48,Math.min(68-Math.abs(q.capH-700)*0.22,60+80*(k-1)))/*ж*/,xh*0.14,62+30*(k-0.8),72+0.03*(xh-440),(q.asc-xh-q.ov-GL_LIM.g2)/1.56),46);
    /* засечки соседних стволов (n, h, m, u, п, н, и, ш, H, N, П, Н, Ш) не сходятся: зазор считается по настоящей ширине
       знака (glyphWidth — она уже включает рост от ствола cxWx и вынос засечек soOf, core7) */
    const SER=['n','h','u','п','н','и','л','H','N','П','Н','U'];
    const gapN=(Sx,rd)=>{const pp=Object.assign({},q,{stem:Sx/sk,round:rd});let g=1e9;
      const so=typeof soOf==='function'?soOf(pp):0.4*Sx*rd;
      for(const ch of SER){if(!GL[ch])continue;const n=NST_CX[ch]||2;
        const w=glyphWidth(ch,pp);g=Math.min(g,(w-2*so-n*Sx)/(n-1)-2*so);}return g;};
    let rS=1.6;if(gapN(S,rS)<CODEX_LIM.gs){let lo=0,hi=rS;for(let i=0;i<20;i++){const m=(lo+hi)/2;if(gapN(S,m)>=CODEX_LIM.gs)lo=m;else hi=m;}rS=lo;}
    if(q.round!=null)cl('round',0,Math.min(0.75-0.25*CL((q.capH-700)/100,0,1)-0.15*wl,rS));
    if(q.spur!=null)cl('spur',0,CODEX_LIM.spurMax);
    return {q,L};
  }
  if(q.bar!=null)cl('bar',46,58);if(q.mv!=null)cl('mv',0,45);cl('innerR',0.5,1.4,1);
  const bar=(q.bar==null?53:q.bar)/100,ov=q.ov,G2=GL_LIM.g2,dg=(q.diag!=null&&q.diag<5)?CL(q.diag,0.85,1.15):1;
  const hLo=S=>Math.max(40,S*GL_LIM.hS);
  /* ствол: два ствола и просвет в самых узких знаках с чашей (з, э, ь: 520) и ы (ствол+чаша+ствол: 800 − 3.45·S);
     диагональные знаки — при самой тонкой допустимой горизонтали */
  let sHi=Math.min(xh*0.5,(GL_LIM.wB*k-G2)/2,(GL_LIM.wY*k-40)/3.45)/sk;
  if(!diagOK(sHi*sk,hLo(sHi*sk),dg,k,cap,xh,q.mv,q.round,q.kappa==null?0.5523:q.kappa)){let lo=60,hi=sHi;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(diagOK(m*sk,hLo(m*sk),dg,k,cap,xh,q.mv,q.round,q.kappa==null?0.5523:q.kappa))lo=m;else hi=m;}sHi=lo;}
  cl('stem',60,sHi,190);
  const S=q.stem*sk;
  /* горизонталь: не тоньше ~трети ствола (диагонали по перу S×H не истончаются), не толще ствола;
     просветы по высоте: в (два кольца), я/R (чаша от 0.42·xh), e (над и под перекладиной), э (концы, перекладина, апертура);
     диагональные знаки (A, V, W, X, Y, M) — раскрытие не уже G2 */
  let hHi=Math.min(S,(Math.min(bar,1-bar)*xh-G2)/1.5,(0.58*xh-G2)/2,(0.52*xh+ov-G2)/1.85,(0.48*xh+ov-G2)/1.5,(Math.min(bar,1-bar)*xh+ov-G2)/1.85,0.82*q.desc-ov-G2/*g: нижняя перекладина не ложится на чашу*/);
  const hL=hLo(S);hHi=Math.max(hHi,hL);
  {const kp=q.kappa==null?0.5523:q.kappa,rd=q.round==null?1:q.round,okA=v=>ampOK(S,v,dg,k,cap,kp,rd,q.innerR,ov);
    if(!okA(hHi)){let lo=hL,hi=hHi;if(okA(lo)){for(let i=0;i<24;i++){const m=(lo+hi)/2;if(okA(m))lo=m;else hi=m;}hHi=lo;}}}
  if(!diagOK(S,hHi,dg,k,cap,xh,q.mv,q.round,q.kappa==null?0.5523:q.kappa)){let lo=hL,hi=hHi;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(diagOK(S,m,dg,k,cap,xh,q.mv,q.round,q.kappa==null?0.5523:q.kappa))lo=m;else hi=m;}hHi=lo;}
  if(font==='stroka'&&S>=120&&S<=200&&q.capH>=680&&q.capH<=720&&xh>=500&&xh<=560&&q.wdth>=88&&q.wdth<=104)hHi=Math.max(hHi,Math.min(S*0.86,hHi*1.2));/* RS10: Stroka Bold/Black ladder (hair/stem .85/.80) above the shared counter limit */
  cl('hair',hL,hHi,62);
  const H=q.hair;
  /* апертура: у Э/э щель шире перекладины, у G срез выше перекладины */
  if(q.aper!=null)cl('aper',Math.min(50,Math.max(8,100*2*(Math.abs(bar-0.5)*xh+H/2+G2)/(2.6*(xh+2*ov)),100*(H+2*G2-0.06*cap)/(cap+2*ov))),50);
  /* скругление овалов: при тонких штрихах большой радиус уводит конец дуги (2, C, S) от стенки и
     раздваивает чаши 6/9 — круглость ограничивается толщиной штриха */
  if(q.round!=null){const kp=q.kappa==null?0.5523:q.kappa;const ok=rd=>roundOK(rd,S,H,kp,k,cap,ov,q);
    if(!ok(q.round))cl('round',0,roundMax(S,H,kp,k,cap,ov,q));else L.round=[0,roundMax(S,H,kp,k,cap,ov,q)];}
  if(q.diag!=null&&q.diag<5)cl('diag',0.85,1.15);
  /* ловушки: длина S·0.55·trap не больше доли толщины диагонали (эллипс пера S×H под ~45°) */
  if(q.trap!=null){const T45=dg/Math.sqrt(0.5/(S*S)+0.5/(H*H)),op=vOpenMin(S,H,dg,k,cap,xh);
    /* в узких раскрытиях (тяжёлые узкие V, W) ловушка короче: остриё не отрезает щель просвета */
    cl('trap',0,Math.min(80,100*GL_LIM.tr*T45/(0.55*S))*CL((op-GL_LIM.g2)/160,0,1));}
  if(q.join!=null)cl('join',0,60);
  cl('innerR',0.5,1.4,1);
  return {q,L};}
/* насколько опускается внешний угол (радиус r, натяжение kp, как rp) на расстоянии S от края */
function cornerDrop(r,S,kp){if(S>=r)return 0;if(kp<0.25)return r-S;const c=Math.min(0.95,kp);
  let lo=0,hi=1;for(let i=0;i<30;i++){const t=(lo+hi)/2,u=1-t;const x=u*u*u*(-r)+3*u*u*t*(-r+r*c)+3*u*t*t*0+t*t*t*0;if(x<-S)lo=t;else hi=t;}
  const t=(lo+hi)/2,u=1-t;return -(u*u*u*0+3*u*u*t*0+3*u*t*t*(-r+r*c)+t*t*t*(-r));}
function roundOK(rd,S,H,kp,k,cap,ov,q){const f=Math.min(1,rd);let r=(0.54*cap+ov+H)/2*f;if(kp<0.25)r=Math.min(r,S*0.95);
  if(cornerDrop(r,S,kp)>1.35*H-GL_LIM.g2)return false;
  const c=(4-3*Math.min(0.95,kp))/8,ro=Math.min(600*k,cap+2*ov)/2*f,rb=Math.min(600*k,0.56*cap+H/2+2*ov)/2*f;
  if(kp>=0.25&&c*(ro-rb)>H-6)return false;
  /* чистая фаска (kappa≈0) на полном радиусе: у & срез чаши упирается в ногу узкой щелью */
  if(kp<0.05&&rd>0.88)return false;
  /* & (core14): при острых фасках округлость тоже решает, замкнётся ли остаток просвета у ноги */
  if(q&&!ampOK(S,H,(q.diag!=null&&q.diag<5)?q.diag:1,k,cap,kp,rd,q.innerR==null?1:q.innerR,ov))return false;
  /* @ (core14 GS.at): верхний правый угол внешнего просвета не опускается на ствол «a» — иначе щель между ними замыкается */
  if(q){const tv=Math.max(H,S*0.56),th=Math.max(H*0.86,30),yb=-(q.desc||210)*0.42,bh=cap-yb,gx=Math.max(H*0.6,60),w=4*tv+2*gx+Math.max(tv*1.1,150);
    const ih=bh*0.5,iy1=yb+(bh-ih)/2-th*0.25+ih,rO=Math.min(w,bh)/2*f,iw=w-2*tv,ihh=bh-2*th;
    let ri=Math.max(rO-(S+H)*0.42,rO*0.22)*(q.innerR==null?1:q.innerR);ri=Math.min(ri,Math.min(iw,ihh)/2-1);
    ri=Math.min(Math.max(ri,rO-(Math.min(tv,th)-6)/c),Math.max(2,Math.min(iw,ihh)/2-1));if(kp<0.25)ri=Math.min(ri,S*0.95);
    if(cap-th-cornerDrop(ri,gx,kp)<iy1+GL_LIM.g2+8)return false;}
  return true;}
function roundMax(S,H,kp,k,cap,ov,q){const top=1.6;if(roundOK(top,S,H,kp,k,cap,ov,q))return top;let lo=0,hi=top;for(let i=0;i<20;i++){const m=(lo+hi)/2;if(roundOK(m,S,H,kp,k,cap,ov,q))lo=m;else hi=m;}return lo;}
/* & (core14 GS.amp): часть просвета нижней чаши справа от ноги должна выходить под срез ya — иначе замыкается в дырку */
function ampOK(S,H,dg,k,cap,kp,rd,iR,ov){const h=cap,w=Math.max(S*3.1+40,680*k),tv=S*0.8,tvT=S*0.7,thT=Math.min(H,h*0.48*0.3),yj=h*0.52,ya=h*0.46,a0=w*0.08;
  const ys=yj+thT,hw=Math.min(dwF(S,H,dg,w-a0,ys+ov)*0.92,S*1.15),xs=a0+tvT*0.5+hw*0.5,xr=y=>xs+hw/2+(w-(xs+hw/2))*(ys-y)/(ys+ov);
  const b1=Math.max(w*0.74,w-hw+tv*0.6),bh=yj+thT+ov,X1=b1-tv,xl=xr(ya);if(xl>=X1-2)return true;
  const r=Math.min(b1,bh)/2*Math.min(1,rd),iw=b1-2*tv,ih=bh-2*H,c=(4-3*Math.min(0.95,kp))/8,cap2=Math.max(2,Math.min(iw,ih)/2-1);
  let ri=Math.min(Math.max(r-(S+H)*0.42,r*0.22)*iR,cap2);ri=Math.min(Math.max(ri,r-(Math.min(tv,H)-6)/c),cap2);if(kp<0.25)ri=Math.min(ri,S*0.95,Math.min(iw,ih)*0.34);
  const top=yj+thT-H,x=Math.min(X1,xl),e=X1-x,yt=e>=ri?top:top-cornerDrop(ri,e,kp);
  if(yt>=ya+8)return true;
  /* замкнутый остаток просвета — треугольник между ногой и стенкой: крошечный (< ~3 px на кегле 150) не в счёт */
  const ye=ys-(X1-xs-hw/2)*(ys+ov)/Math.max(w-xs-hw/2,1),cx=X1-ri,cy=top-ri;let n=0;
  const topAt=x=>X1-x>=ri?top:top-cornerDrop(ri,X1-x,kp);
  for(let y=Math.max(ye,-ov+H);y<ya;y+=2)for(let x=xr(y);x<X1;x+=2){if(y>topAt(x))continue;n++;}
  return n*4<40;}
/* толщина диагонали по перу (как k.dw в core11) */
function dwF(S,H,dg,dx,dy){const L=Math.hypot(dx,dy)||1,sn=Math.abs(dy)/L,cs=Math.abs(dx)/L;return Math.min(dg/Math.sqrt(sn*sn/(S*S)+cs*cs/(H*H))/Math.max(sn,0.25),S*2.4);}
function vOpenMin(S,H,dg,k,cap,xh){let m=1e9;for(const [w,h] of [[660*k,cap],[0.58*920*k,cap],[580*k,xh],[0.58*840*k,xh]]){const aw=Math.min(S*0.92,w*0.3);m=Math.min(m,w-2*dwF(S,H,dg,w/2-aw/2,h));}return m;}
/* диагональные знаки гротеска остаются раскрытыми: A (просвет над перекладиной), V/W/v/w, X/x, Y, M/м (раствор и низ «V» не сливается со стволами) */
function diagOK(S,H,dg,k,cap,xh,mv,rd,kp){const g=GL_LIM.g2;
  const vOpen=(w,h)=>{const aw=Math.min(S*0.92,w*0.3),hw=dwF(S,H,dg,w/2-aw/2,h);return w-2*hw>=g;};
  {const w=730*k,h=cap,aw=Math.min(S*0.92,w*0.3),cx=w/2,hw=dwF(S,H,dg,cx-aw/2,h),yi=Math.min(h-0.6*H,(cx-hw)*h/(cx-aw/2)),yb=0.3*h+H/2;
    const base=w-2*(hw+yb*(cx-aw/2)/h),ht=yi-yb;if(!(base>=g*1.5&&ht>=g*1.5))return false;
    if(base*ht/(base+2*Math.hypot(ht,base/2))<GL_LIM.rin)return false;}
  if(!vOpen(660*k,cap)||!vOpen(0.58*920*k,cap)||!vOpen(580*k,xh)||!vOpen(0.58*840*k,xh))return false;
  for(const [w,h] of [[710*k,cap],[560*k,xh]])if(w-2*dwF(S,H,dg,w,h)*0.98<g)return false;
  {const w=700*k,h=cap,yj=h*0.44;if(w-2*dwF(S,H,dg,w/2,h-yj)<g)return false;}
  for(const [w,h] of [[840*k,cap],[730*k,xh]]){const vb=h*(mv==null?0:mv)/100,cx=w/2,aw=Math.min(S*0.9,w*0.22),hw=dwF(S,H,dg,cx-aw/2,h-vb)*0.95;
    if(w-2*hw<g||cx-aw/2-S<g)return false;}
  /* % (core13): косая черта не сливается с кольцами (зазор от скруглённого угла кольца до кромки черты) */
  if(rd!=null){const w=800,h=cap,hw=Math.min(dwF(S,H,dg,w*0.64,h)*0.9,w*0.3),L=Math.hypot(0.64*w,h),nx=h/L,ny=-0.64*w/L;
    let rc=Math.min(0.4*w,0.44*h)/2*Math.min(1,rd);if(kp<0.25)rc=Math.min(rc,S*0.95)*0.6;
    const X=0.4*w,Y=0.56*h,kq=Math.min(0.95,kp),P=[[X,Y+rc],[X,Y+rc-rc*kq],[X-rc+rc*kq,Y],[X-rc,Y]];let d=1e9;
    for(let i=0;i<=12;i++){const t=i/12,u=1-t,px=u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],py=u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1];
      d=Math.min(d,-((px-(0.18*w-hw/2))*nx+py*ny));}
    if(d<GL_LIM.g2*0.85)return false;}
  return true;}
const GL_LIM={wB:520,wY:800,hS:0.3,tr:0.45,g2:24,rin:10};
const CODEX_LIM={wR:471,spurMax:240,g:40,gs:32,zA:60,zG:46};
const NST_CX={m:3,'ш':3,'Ш':3};/* число стволов со засечками внизу (для зазора засечек) */
function safeP(p){const q=paramLimits(p).q;if(q.ital!=null)q.ital=q.ital>0.5?1:0;return q;}
function buildBase(ch,p,ed){p=safeP(p);
  const d=GL[ch];if(!d)return null;
  const h=d.hz?d.hz(p):d.k==='xh'?p.xh:p.capH; /* d.hz — своя высота знака (капитель, цифры OpenType) */
  const w=glyphWidth(ch,p,ed);
  const g=makeG(p,w,h);
  const cs=d.shape(g)||[];
  return {w,h,S:g.S,cs:cloneC(cs)};
}
function applyEdits(cs,ed){
  if(!ed)return;
  cs.forEach((c,ci)=>{
    if(ed.off&&ed.off.indexOf(ci)>=0)c.off=true;
    c.nodes.forEach((n,ni)=>{
      const e=ed[ci+':'+ni];if(!e)return;
      if(e.p){n.x+=e.p[0];n.y+=e.p[1];if(n.a){n.a.x+=e.p[0];n.a.y+=e.p[1];}if(n.b){n.b.x+=e.p[0];n.b.y+=e.p[1];}}
      for(const part of ['a','b']){
        const v=e[part];
        if(v===false){n[part]=null;continue;}
        if(v){if(!n[part])n[part]={x:n.x,y:n.y};n[part].x+=v[0];n[part].y+=v[1];}
      }
    });
  });
}
const isDigit=ch=>ch>='0'&&ch<='9';
/* Оптический спейсинг (по площади просвета, как у Трейси и HT Letterspacer):
   у прямой стороны отступ = sb; у круглой и открытой стороны часть белого уже «внутри» знака,
   поэтому отступ уменьшается на среднюю глубину просвета в зоне от линии шрифта до высоты знака. */
function flatC(c,seg){const pts=[],n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
  const ax=a.x,ay=a.y,bx=b.x,by=b.y,p1=a.b||a,p2=b.a||b,curve=!!(a.b||b.a);
  if(!curve){pts.push([ax,ay]);continue;}
  for(let k=0;k<seg;k++){const t=k/seg,u=1-t;pts.push([u*u*u*ax+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*bx,u*u*u*ay+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*by]);}}return pts;}
function inkProfile(cs,y0,y1,rows){
  const polys=cs.map(c=>flatC(c,10));let xmin=1e9,xmax=-1e9;
  polys.forEach(P=>P.forEach(q=>{if(q[0]<xmin)xmin=q[0];if(q[0]>xmax)xmax=q[0];}));
  const L=[],Rr=[];
  for(let r=0;r<rows;r++){const y=y0+(r+0.5)*(y1-y0)/rows;const xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];
      if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y)){xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}}
    xs.sort((p,q)=>p[0]-q[0]);let wn=0,first=null,last=null;
    for(const [x,d] of xs){const was=wn;wn+=d;if(was===0&&wn!==0&&first===null)first=x;if(was!==0&&wn===0)last=x;}
    L.push(first);Rr.push(last);}
  return {xmin,xmax,L,R:Rr};}
function sideAreas(cs,zoneH,sb){
  const pr=inkProfile(cs,0,zoneH,40);if(!(pr.xmax>pr.xmin))return null;
  const depth=Math.max(zoneH*0.12,sb*1.2),n=pr.L.length,eps=zoneH*0.05;let aL=0,aR=0,cL=0,cR=0;
  for(let i=0;i<n;i++){const l=pr.L[i],r=pr.R[i];
    aL+=l==null?depth:Math.min(l-pr.xmin,depth);aR+=r==null?depth:Math.min(pr.xmax-r,depth);
    if(l!=null&&l-pr.xmin<eps)cL++;if(r!=null&&pr.xmax-r<eps)cR++;}
  return {xmin:pr.xmin,xmax:pr.xmax,aL:aL/n,aR:aR/n,cL:cL/n,cR:cR/n};}
const _refSB={};
function refArea(kind,p){
  const key=CUR_FONT+'|'+kind+'|'+JSON.stringify(p);if(_refSB[key]!=null)return _refSB[key];
  const ch=kind==='xh'?(GL['n']?'n':'н'):(GL['H']?'H':'Н');let v=0;
  const b=buildBase(ch,p,null);if(b){const zh=kind==='xh'?p.xh:p.capH;const a=sideAreas(b.cs,zh,p.sb);if(a)v=a.aL;}
  for(const k in _refSB)if(Object.keys(_refSB).length>40)delete _refSB[k];
  return _refSB[key]=v;}
/* площадь белого у стороны сравнивается с эталоном (H или n): у эталона отступ = sb */
function opticalSB(cs,zoneH,sb,amt,aRef){
  const s=sideAreas(cs,zoneH,sb);if(!s)return null;const k=0.4*amt;
  const lo=c=>sb*(c>=0.22?0.5:c>=0.09?0.35:0.12);
  const f=(a,c)=>Math.min(Math.max(sb-(a-aRef)*k,lo(c)),sb*1.25);
  return {xmin:s.xmin,xmax:s.xmax,l:f(s.aL,s.cL),r:f(s.aR,s.cR)};}
const isLetter=ch=>/\p{L}/u.test(ch);
function tabularWidth(p){let m=0;for(const d of '0123456789')m=Math.max(m,glyphWidth(d,p));return m;}
/* итоговый глиф: правки -> направляющие -> сетка -> наклон -> поля */
/* Одинаковые знаки (латинская e и кириллическая е — один и тот же знак GL) делят правки: ключ — латинский знак */
const TWC=new Map();
function edKey(ch){let m=TWC.get(CUR_FONT);if(!m){m=Object.create(null);const by=new Map();
  for(const k in GL){const o=GL[k];const c=by.get(o);if(c===undefined||(k.charCodeAt(0)<128&&c.charCodeAt(0)>=128))by.set(o,k);}
  for(const k in GL)m[k]=by.get(GL[k]);TWC.set(CUR_FONT,m);}return m[ch]||ch;}
const edGet=(edits,ch)=>edits?(edits[edKey(ch)]||edits[ch]):undefined;
function finalGlyph(ch,st,edits,opt){
  opt=opt||{};
  const ed=edGet(edits,ch);
  const b=buildBase(ch,st.p,ed);if(!b)return null;
  let cs=b.cs;applyEdits(cs,ed);
  if(!opt.keepOff)cs=cs.filter(c=>!c.off);
  const doU=opt.union!==false;
  if(!doU&&opt.rough!==false&&st.p.rough>0)cs=roughGlyph(cs,st.p.rough,ch);
  const fx=mkRemap(evalVG(b.w,b.S,ed)),fy=mkRemap(evalHG(st.p,st.hg));
  const weff=fx.f(b.w);
  const useRemap=opt.remap!==false&&(fx.active||fy.active);
  const useWarp=opt.warp!==false&&latActive(st.lat);
  /* точное объединение — до искажения (искажение взаимно однозначно), после — упрощение кусков */
  const preU=doU&&(useRemap||useWarp)&&typeof csgSimplify==='function';
  if(preU)cs=csgUnion(cs);
  if(useRemap||useWarp){
    const fn=(x,y)=>{let X=useRemap?fx.f(x):x,Y=useRemap?fy.f(y):y;if(useWarp){const q=ffdPoint(st.lat,weff,X,Y);X=q[0];Y=q[1];}return [X,Y];};
    cs=opt.subdiv===false?cs.map(c=>Object.assign(mapNodes(c,fn),{off:c.off})):cs.map(c=>Object.assign(warpContour(c,fn,40),{off:c.off}));
  }
  if(doU){cs=preU?csgSimplify(cs):csgUnion(cs);if(opt.rough!==false&&st.p.rough>0)cs=roughGlyph(cs,st.p.rough,ch);}
  if(doU&&st.p.stk&&typeof STK!=='undefined'&&STK.deTiny)cs=STK.deTiny(cs,4.6);/* RS10: merge segments <= 4.6 u (Stroka) */
  else if(doU&&typeof CUR_FONT==='string'&&typeof FONTS!=='undefined'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].deTiny&&typeof STK!=='undefined'&&STK.deTiny)cs=STK.deTiny(STK.deTiny(cs,FONTS[CUR_FONT].deTiny),FONTS[CUR_FONT].deTiny);/* per-font: «Аппликация» — стыки склеенных кусков дают короткие отрезки */
  const full=opt.slant!==false;
  const eL=full?((ed&&ed.sbL)||0):0,eR=(ed&&ed.sbR)||0;
  const t=full?Math.tan(st.p.slant*Math.PI/180):0;
  const gd=GL[ch],go=gd.opt||{},bc=go.base||ch; /* альтернаты ('m.ss01', 'zero.tnum') ведут себя как базовый знак */
  const isSpace=isSpaceCh(bc);
  let sb=full?st.p.sb+eL:0;
  let adv=isSpace?spaceAdv(bc,st.p):weff+2*st.p.sb+st.p.track+((ed&&ed.sbL)||0)+eR;
  const osp=st.p.opsp==null?100:st.p.opsp,tab=go.tnum?true:go.pnum?false:!!st.p.tabular;
  if(full&&!isSpace&&osp>0&&!go.fixed&&(isLetter(bc)||(isDigit(bc)&&!tab))){
    const zh=gd.hz?gd.hz(st.p):gd.k==='xh'?st.p.xh:st.p.capH;const o=opticalSB(cs,zh,st.p.sb,osp/100,refArea(gd.k==='xh'?'xh':'cap',st.p));
    /* go.tailL: хвост ниже базовой уходит под предыдущую букву — левое поле по краю выше базовой */
    /* go.zoneInk: верхний выносной элемент (шарик б) не считается краем знака — поле от чаши в зоне строчных */
    if(o&&go.zoneInk){let m=-1e9;for(const c of cs)for(const q of flatC(c,8))if(q[1]<=zh*1.03&&q[0]>m)m=q[0];if(m>o.xmin&&m<o.xmax){o.xmax=m;o.r=Math.max(o.r,o.l);}}
    if(o&&go.tailL){let m=1e9;for(const c of cs)for(const q of flatC(c,8))if(q[1]>=0&&q[0]<m)m=q[0];if(m<1e9){o.xmin=m;o.l=o.r;}}
    if(o){const inkW=o.xmax-o.xmin;sb=o.l+eL-o.xmin;adv=o.l+inkW+o.r+st.p.track+eL+eR;}
  }
  if(full&&!isSpace){
    let fixed=0;
    if(st.p.mono>0)fixed=st.p.mono;else if(tab&&(isDigit(bc)||(typeof OTO!=='undefined'&&OTO.cur(bc))))fixed=tabularWidth(st.p)+2*st.p.sb+st.p.track;
    if(fixed){sb+=(fixed-adv)/2;adv=fixed;}
  }
  const gbo=(GL[bc]&&GL[bc].opt)||go;
  if(full&&!isSpace&&!tab&&(gbo.sbl||gbo.sbr)){const l=gbo.sbl?gbo.sbl(st.p):0,r=gbo.sbr?gbo.sbr(st.p):0;sb+=l;adv+=l+r;}
  if(full&&!isSpace&&tab&&gbo.sbt){const x=gbo.sbt(st.p);sb+=x;adv+=2*x;}
  if(full&&!isSpace&&go.sbx){const x=typeof go.sbx==='function'?go.sbx(st.p):go.sbx;sb+=x;adv+=2*x;}/* go.sbx — добавка к полям знака (капитель, индексы) */
  if(t!==0||sb!==0)cs=cs.map(c=>Object.assign(mapNodes(c,(x,y)=>[x+y*t+sb,y]),{off:c.off}));
  /* оптическая компенсация курсива: ручки гладких узлов поворачиваются против наклона —
     овалы теряют «механический» перекос, прямые штрихи не меняются */
  const ic=(st.p.icomp||0)/100;
  if(t!==0&&ic>0){const th=-Math.atan(t)*ic*0.5,cs0=Math.cos(th),sn0=Math.sin(th);
    for(const c of cs)for(const n of c.nodes){if(!n.a||!n.b)continue;
      for(const h of ['a','b']){const dx=n[h].x-n.x,dy=n[h].y-n.y;n[h]={x:n.x+dx*cs0-dy*sn0,y:n.y+dx*sn0+dy*cs0};}}}
  return {ch,w:b.w,weff,adv:Math.max(adv,0),cs,fx,fy,S:b.S};
}
