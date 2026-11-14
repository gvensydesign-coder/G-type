/* ===== «Устав» (Ustav Display) — узкий акцидентный шрифт в духе вязи / полуустава =====
   Движок: «скелет + перо» (core18*). Перо — эллиптическое (stem × hair, угол nib = 0): вертикали толстые, горизонтали — волосные.
   Характер шрифта задают не перо, а построения:
     flare  — вогнутое раструбом утолщение концов стволов (узел скелета с множителем нажима w);
     slope  — наклон тонких перекладин (Н, Е, Ф, А, Ч …), градусы;
     point  — остриё чаш (О С Э Є Ф Р …): угол стрельчатой вершины;
     drop   — «капелька» на концах верхних перекладин (Г Т П Б Е).
   Строчные — капительные (унициальные) формы той же конструкции на высоте x, выносные у б b d h k l f t, нижние у р у ц щ д g j p q y ф.
   Набор — базовый (charset:'basic'): А–Я а–я Ёё, A–Z a–z, цифры, основная пунктуация. */
(function(){
const F={id:'ustav',name:'Устав',family:'Ustav Display',tag:'Вязь · узкий акцидентный',S0:110,GL:{},charset:'basic',
  desc:'Очень узкий высокий шрифт в духе старорусской вязи: вогнуто-раструбные стволы, стрельчатые чаши, тонкие косые перекладины. Строчные — капительные. Базовый набор.',
  sample:'Устав 1703'};
F.sampleText='Слово о полку Игореве';
F.pen=p=>skPenOf({kind:'ell'},p);
const D2=Math.PI/180;
/* ---------- параметры конструкции ---------- */
if(!PARAMS.some(r=>r[0]==='flare'))PARAMS.push(['flare','Раструб стволов, %',0,100,1,'Перо'],['slope','Угол наклона перекладин, °',0,16,0.5,'Перо'],
  ['point','Остриё полуовалов, %',0,100,1,'Перо'],['drop','Каплевидные элементы, %',0,100,1,'Перо']);
const USP=['flare','slope','point','drop'];
const gp=(p,k,d)=>p[k]==null?d:p[k];
const FE=p=>1+0.3*gp(p,'flare',60)/100;/* множитель раструба на нижнем конце ствола */
function uKit(g,ch){const K=skKit(g,F),p=g.p;
  K.fe=FE(p);K.ft=1+(K.fe-1)*0.5;/* верх раструбится слабее низа */
  K.sl=Math.tan(gp(p,'slope',8)*D2);K.pt=gp(p,'point',55)/100;K.dp=gp(p,'drop',50)/100;
  K.al=K.pt*38;/* угол стрельчатой вершины, градусы */
  K.L=K.hx*K.fe;K.R=g.w-K.L;
  return K;}
F.kit=uKit;
const nd=(x,y,w,type)=>({x,y,a:null,b:null,type:type||'smooth',w});
/* ---------- примитивы ---------- */
/* тонкая перекладина с наклоном: от (x0,y) до (x1,y+rise); rise — доля run */
function bar(K,x0,x1,y,o){o=o||{};const rise=o.rise!=null?o.rise:(x1-x0)*K.sl;return SKB.L(x0,y,x1,y+rise,o.c0||'J',o.c1||'V');}
/* капелька: короткий нисходящий (или восходящий) штрих у конца перекладины, нажим 0.6 */
function drop(K,x,y,dir,len){const l=len==null?K.S*1.1:len;if(K.dp<0.02)return [];const L=Math.min(l*K.dp+K.hy,K.h*0.26);
  return [SKB.st([nd(x,y,0.62),nd(x,y+dir*L,0.62)],dir<0?'H':'H','J')];}
/* стрельчатая вершина (излом) */
const apex=(x,y,di,dout,w,cy)=>[x,y,null,{c:1,di,do:dout,j:'miter',w,cy}];
/* овал О: стрельчатая вершина сверху (слабее) и снизу (острее), бока утолщены */
function oval(K,o){o=o||{};const h=K.h,ot=o.ot!=null?o.ot:h,ob=o.ob!=null?o.ob:0,cx=o.cx!=null?o.cx:K.cx,xl=o.xl!=null?o.xl:K.hx*1.08,xr=o.xr!=null?o.xr:K.w-K.hx*1.08,cy=ob+(ot-ob)*0.52;
  const at=K.al*0.75,ab=K.al,yt=ot+K.ov-K.hy*0.9,yb=ob-K.ov+K.hy*0.9;
  return SKB.P([apex(cx,yt,at,-at,0.8,ot+K.ov),[xr,cy,-90,{w:o.sw||1.08}],apex(cx,yb,180+ab,180-ab,0.8,ob-K.ov),[xl,cy,90,{w:o.sw||1.08}]],'R','R',{closed:true,tens:K.tens});}
/* ---------- общие построения ---------- */
/* наклонный ствол с раструбом на концах: нажим w в узлах (концы шире, середина — перо; mw — нажим середины) */
function stemL(K,xa,ya,xb,yb,o){o=o||{};const dx=xb-xa,dy=yb-ya,L=Math.hypot(dx,dy)||1,lf=Math.min(L*0.34,K.S*1.7),t=lf/L;
  const fb=o.fb!=null?o.fb:K.fe,ft=o.ft!=null?o.ft:K.ft,mw=o.mw!=null?o.mw:1,P=f=>[xa+dx*f,ya+dy*f];
  const mk=(f,w)=>{const q=P(f);return nd(q[0],q[1],w);};
  const ns=[mk(0,fb)];
  if(t<0.5-0.02){ns.push(mk(t,mw),mk(1-t,mw));}else ns.push(mk(0.5,mw));
  ns.push(mk(1,ft));
  return SKB.st(ns,o.c0||'H',o.c1||'H');}
const stem=(K,x,y0,y1,o)=>stemL(K,x,y0,x,y1,o);
/* диагональ: раструб слабее; mw — нажим */
const diag=(K,xa,ya,xb,yb,o)=>stemL(K,xa,ya,xb,yb,Object.assign({fb:1+(K.fe-1)*0.12,ft:1+(K.fe-1)*0.12,mw:0.9},o||{}));
/* чаша от ствола x0: верхняя дуга выходит из ствола на yb, нижняя возвращается на ya; ba — угол входа нижней дуги в ствол (°, вниз) */
function bowlR(K,x0,xr,ya,yb,o){o=o||{};const ba=o.ba!=null?o.ba:K.al*0.5,ym=o.ym!=null?o.ym:(ya+yb)/2,v=K.al*1.1;
  /* правая вершина чаши — лёгкий излом (стрельчатость), при point=0 — гладкая дуга */
  const mid=v>2?[xr,ym,null,{c:1,di:-(90-v),do:-(90+v),j:'miter',w:1.06}]:[xr,ym,-90,{w:1.06}];
  return SKB.P([[x0,yb,0,{w:0.9}],mid,[x0,ya,180+ba,{w:0.9}]],'J','J',{tens:K.tens});}
/* арка n/h/m: из ствола x0 на высоте yA вверх, стрельчатая вершина, вниз ствол x1 до линии (раструб снизу); open — плечо r */
function arch(K,x0,x1,yA,o){o=o||{};const h=K.h,yt=h+K.ov-K.hy*0.9,ax=x0+(x1-x0)*0.52,al=K.al*0.8,lf=Math.min(yA*0.4,K.S*1.7);
  const sp=[[x0,yA,90,{w:0.55}],apex(ax,yt,al,-al,0.85,h+K.ov),[x1,yA,-90,{w:1.04}]];
  if(!o.open){sp.push([x1,lf,-90,{w:1}]);sp.push([x1,0,-90,{w:o.fb!=null?o.fb:K.fe}]);}
  return SKB.P(sp,'J',o.open?'V':'H',{tens:K.tens});}
/* U: стрельчатое дно */
function cup(K,x0,x1){const h=K.h,yb=-K.ov+K.hy*0.9,al=K.al,ys=h*0.34;
  return SKB.P([[x0,h,-90,{w:K.ft}],[x0,h*0.72,-90,{w:1}],[x0,ys,-90,{w:1.04}],apex((x0+x1)/2,yb,-al,al,0.85,-K.ov),[x1,ys,90,{w:1.04}],[x1,h*0.72,90,{w:1}],[x1,h,90,{w:K.ft}]],'H','H',{tens:K.tens});}
/* ---------- определения ---------- */
const WP=(bw,nst)=>p=>Math.max(60,bw*1.0*p.wdth/100+nst*(p.stem-F.S0)*0.85+nst*p.stem*0.5*(FE(p)-1));
const d=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,typeof bw==='function'?bw:WP(bw,nst==null?2:nst),kind,nst==null?2:nst);
const sqDot=(K,x,yc,s)=>{s=s||K.S*0.95;return SKB.L(x,yc-s/2,x,yc+s/2,'H','H');};
/* верхняя перекладина с каплей на правом конце */
const topBar=(K,x0,x1,o)=>{o=o||{};x1-=4;const out=[SKB.L(x0,K.T,x1,K.T,'J','V')];if(o.drop!==false)out.push(...drop(K,x1-K.hx*0.62,K.h,-1,K.S*1.15));return out;};
const sk=(ch,g)=>F.GL[ch].skel(g);

/* ===== прямые: Н П Г Т Л А Е F I ===== */
d('H',K=>{const {L,R,h}=K;return [stem(K,L,0,h),stem(K,R,0,h),bar(K,L,R,h*0.44)];},380,'cap',2);
d('I',K=>[stem(K,K.cx,0,K.h)],p=>p.stem*1.0+p.stem*0.9*(FE(p)-1)+110,'cap',1);
d('T',K=>{const {w,cx,h}=K;return [SKB.L(5,K.T,w-5,K.T,'V','V'),stem(K,cx,0,K.T,{c1:'J'}),...drop(K,K.hx*0.62+5,h,-1,K.S*1.15),...drop(K,w-K.hx*0.62-5,h,-1,K.S*1.15)];},400,'cap',1);
d('П',K=>{const {L,R,h}=K;return [stem(K,L,0,h),stem(K,R,0,h),SKB.L(L,K.T,R,K.T,'J','J')];},380,'cap',2);
d('Г',K=>{const {L,w}=K;return [stem(K,L,0,K.h),...topBar(K,L,w-K.hx*0.62)];},300,'cap',1);
d('L',K=>{const {L,w}=K,x1=w-K.hx*0.62,r=(x1-L)*K.sl*0.4;return [stem(K,L,0,K.h),bar(K,L,x1,K.B,{rise:r}),...drop(K,x1,K.B+r,1,K.S*1.0)];},330,'cap',1);
const midBar=(K,x0,x1)=>{x1-=K.hx*0.3;const rise=Math.min((x1-x0)*K.sl,K.h*0.1),y=K.h*0.46;return [bar(K,x0,x1,y,{rise}),...(K.dp<0.02?[]:[SKB.st([nd(x1,y+rise,0.62),nd(x1,y+rise-(K.hy+Math.min(K.S*0.35,K.h*0.05)*K.dp),0.62)],'H','J')])];};
d('E',K=>{const {L,w,h}=K;return [stem(K,L,0,h),...topBar(K,L,w-K.hx*0.62),...midBar(K,L,w*0.8),SKB.L(L,K.B,w-K.hx*0.62,K.B,'J','V'),...drop(K,w-K.hx*0.62,K.B,1,K.S*1.0)];},330,'cap',1);
d('F',K=>{const {L,w,h}=K;return [stem(K,L,0,h),...topBar(K,L,w-K.hx*0.62),...midBar(K,L,w*0.8)];},310,'cap',1);
d('Л',K=>{const {L,R,w,h}=K,xt=L+w*0.24;return [stemL(K,L,0,xt,h-K.hy*0.6),SKB.L(xt-w*0.1,K.T,R,K.T,'J','J'),...drop(K,xt-w*0.1+K.hx*0.62,h,-1,K.S*0.9),stem(K,R,0,h)];},400,'cap',2);
d('A',K=>{const {L,R,w,h}=K,xt=L+w*0.24,yb=h*0.3,xl=L+(xt-L)*yb/h;return [...sk('Л',K.g),bar(K,xl,R,yb)];},400,'cap',2);

/* ===== круглые: О С Э Ф Ю ===== */
d('O',K=>[oval(K)],340,'cap',2);
const Cs=K=>{const {w,h}=K,at=K.al*0.75,ab=K.al,yt=h+K.ov-K.hy*0.9,yb=-K.ov+K.hy*0.9,cy=h*0.52,xl=K.hx*1.08,xe=w-K.hx*0.7;
  return [SKB.P([[xe,h*0.76,180-at*0.6,{w:0.85}],apex(w*0.5,yt,180-at,180+at,0.8,h+K.ov),[xl,cy,-90,{w:1.08}],apex(w*0.5,yb,-ab,ab,0.8,-K.ov),[xe,h*0.22,ab*0.6,{w:0.85}]],'HV','HV',{tens:K.tens})];};
d('C',Cs,330,'cap',2);
d('Э',K=>[...skMirX(Cs(K),K.w),bar(K,K.w*0.3,K.R,K.h*0.47)],330,'cap',2);
d('Ф',K=>{const {w,h,cx}=K;return [stem(K,cx,0,h),oval(K,{xl:K.hx*1.08,xr:w-K.hx*1.08,ot:h*0.84,ob:h*0.16})];},460,'cap',3);
d('Ю',K=>{const {L,w,h}=K,xo=w*0.4;return [stem(K,L,0,h),bar(K,L,xo,h*0.47,{rise:0}),oval(K,{xl:xo+K.hx*0.6,xr:w-K.hx*1.08,cx:(xo+w)/2})];},520,'cap',3);

/* ===== стволы с чашами: Р В Б Ь Ъ Ы D R Я ===== */
d('P',K=>{const {L,R,h}=K;return [stem(K,L,0,h),bowlR(K,L,R,h*0.40,K.T)];},350,'cap',1);
d('B',K=>{const {L,R,h,w}=K,ym=h*0.54,r1=R-w*0.05;return [stem(K,L,0,h),bowlR(K,L,r1,ym,K.T,{ba:0}),bowlR(K,L,R,K.B,ym,{ba:0})];},370,'cap',1);
d('Б',K=>{const {L,R,h,w}=K;return [stem(K,L,0,h),...topBar(K,L,w-K.hx*0.62),bowlR(K,L,R,K.B,h*0.58,{ba:0})];},360,'cap',1);
d('Ь',K=>{const {L,R,h}=K;return [stem(K,L,0,h),bowlR(K,L,R,K.B,h*0.58,{ba:0})];},340,'cap',1);
d('Ъ',K=>{const {w,h}=K,xs=w*0.34;return [SKB.L(5,K.T,xs,K.T,'V','J'),...drop(K,K.hx*0.62+5,h,-1,K.S*1.15),stem(K,xs,0,h),bowlR(K,xs,K.R,K.B,h*0.58,{ba:0})];},440,'cap',2);
d('Ы',K=>{const {L,R,h,w}=K,xr=R-w*0.36;return [stem(K,L,0,h),bowlR(K,L,xr,K.B,h*0.58,{ba:0}),stem(K,R,0,h)];},520,'cap',2);
d('D',K=>{const {L,R,h}=K;return [stem(K,L,0,h),SKB.P([[L,K.T,0,{w:0.9}],[R,h*0.5,-90,{w:1.08}],[L,K.B,180,{w:0.9}]],'J','J',{tens:K.tens})];},380,'cap',1);
d('R',K=>{const {L,R,h}=K,yb=h*0.42,xj=L+(R-L)*0.4;return [stem(K,L,0,h),bowlR(K,L,R,yb,K.T,{ba:0}),diag(K,xj,yb,R,0)];},370,'cap',1);
d('Я',K=>skMirX(sk('R',K.g),K.w),370,'cap',1);

/* ===== диагональные: К Ж И Й М N Х У V W Y Z ===== */
d('K',K=>{const {L,R,h}=K,J=[L+K.hx*0.6,h*0.40],Q=[J[0]+(R-J[0])*0.38,J[1]+(h-J[1])*0.38];return [stem(K,L,0,h),diag(K,R,h,J[0],J[1],{c1:'J'}),diag(K,Q[0],Q[1],R,0,{c0:'J'})];},380,'cap',1);
d('Ж',K=>{const {L,R,h,cx,w}=K,g=K.hx*0.5,ym=h*0.46;return [stem(K,cx,0,h),diag(K,R,h,cx+g,ym,{c1:'J'}),diag(K,cx+g,ym,R,0,{c0:'J'}),diag(K,L,h,cx-g,ym,{c1:'J'}),diag(K,cx-g,ym,L,0,{c0:'J'})];},560,'cap',3);
d('И',K=>{const {L,R,h}=K;return [stem(K,L,0,h),stem(K,R,0,h),diag(K,R,h,L,0,{mw:0.78})];},380,'cap',2);
d('N',K=>{const {L,R,h}=K;return [stem(K,L,0,h),stem(K,R,0,h),diag(K,L,h,R,0,{mw:0.78})];},380,'cap',2);
d('M',K=>{const {L,R,h,cx}=K,ym=h*0.2;return [stem(K,L,0,h),stem(K,R,0,h),diag(K,L,h,cx,ym,{mw:0.78,c1:'J'}),diag(K,R,h,cx,ym,{mw:0.78,c1:'J'})];},520,'cap',2);
d('X',K=>{const {L,R,h}=K;return [diag(K,L,h,R,0,{mw:1}),diag(K,R,h,L,0,{mw:0.55,fb:0.8,ft:0.8})];},400,'cap',1);
d('У',K=>{const {L,R,h,w}=K;return [SKB.P([[R,h,-90,{w:K.ft}],[R,h*0.62,-90,{w:1}],[R,h*0.22,-90,{w:1}],[R-w*0.3,K.B,180,{w:0.85}]],'H','HV',{tens:K.tens}),
  diag(K,L,h,R,h*0.36,{c1:'J',mw:0.95})];},400,'cap',2);
d('V',K=>{const {w,h,cx}=K,a=K.hx*1.1;return [SKB.P([[a,h,null,{w:K.ft}],[cx,0,null,{c:1,cy:0,j:'miter'}],[w-a,h,null,{w:K.ft}]],'H','H')];},420,'cap',1);
d('W',K=>{const {w,h,cx}=K,a=K.hx*1.1;return [SKB.P([[a,h,null,{w:K.ft}],[w*0.26,0,null,{c:1,cy:0,j:'miter'}],[cx,h*0.76,null,{c:1,j:'miter',cy:h*0.9}],[w*0.74,0,null,{c:1,cy:0,j:'miter'}],[w-a,h,null,{w:K.ft}]],'H','H')];},640,'cap',2);
d('Y',K=>{const {w,h,cx}=K,a=K.hx*1.1,yj=h*0.46;return [diag(K,a,h,cx,yj,{c1:'J'}),diag(K,w-a,h,cx,yj,{c1:'J'}),stem(K,cx,0,yj+K.hy,{c1:'J'})];},400,'cap',1);
d('Z',K=>{const {w}=K,a=K.hx*1.3;return [SKB.P([[0,K.T],[w-a,K.T,null,{c:1}],[a,K.B,null,{c:1}],[w,K.B]],'V','V')];},340,'cap',1);

/* ===== З S G J Q U N Ч Ц Ш Щ Д ===== */
d('З',K=>{const {w,h}=K,at=K.al*0.75,ab=K.al,yt=h+K.ov-K.hy*0.9,yb=-K.ov+K.hy*0.9,ym=h*0.54,xe=K.hx*0.7,xr1=w-K.hx*1.08-w*0.04,xr2=w-K.hx*1.08;
  return [SKB.P([[xe,h*0.8,at*0.6,{w:0.85}],apex(w*0.5,yt,at,-at,0.8,h+K.ov),[xr1,(yt+ym)/2,-90,{w:1.06}],[w*0.36,ym,180,{w:0.8}]],'HV','J',{tens:K.tens}),
    SKB.P([[w*0.36,ym,0,{w:0.8}],[xr2,(ym+yb)/2,-90,{w:1.08}],apex(w*0.5,yb,180+ab,180-ab,0.8,-K.ov),[xe,h*0.2,180-ab*0.6,{w:0.85}]],'J','HV',{tens:K.tens})];},340,'cap',2);
d('S',K=>{const {w,h}=K,at=K.al*0.75,ab=K.al*0.9,yt=h+K.ov-K.hy*0.9,yb=-K.ov+K.hy*0.9,xl=K.hx*1.06,xr=w-K.hx*1.06,xe=w-K.hx*0.7;
  return [SKB.P([[xe,h*0.8,180-at*0.6,{w:0.85}],apex(w*0.5,yt,180-at,180+at,0.8,h+K.ov),[xl,h*0.745,-90,{w:1.06}],[w*0.5,h*0.5,-30,{w:0.85}],[xr,h*0.265,-90,{w:1.06}],apex(w*0.5,yb,180+ab,180-ab,0.8,-K.ov),[K.hx*0.7,h*0.2,180-ab*0.6,{w:0.85}]],'HV','HV',{tens:K.tens})];},340,'cap',2);
d('G',K=>{const {w,h}=K,at=K.al*0.75,ab=K.al,yt=h+K.ov-K.hy*0.9,yb=-K.ov+K.hy*0.9,xl=K.hx*1.08,xe=w-K.hx*0.7;
  return [SKB.P([[xe,h*0.76,180-at*0.6,{w:0.85}],apex(w*0.5,yt,180-at,180+at,0.8,h+K.ov),[xl,h*0.52,-90,{w:1.08}],apex(w*0.5,yb,-ab,ab,0.8,-K.ov),[w-K.hx*1.06,h*0.3,90,{w:1.04}],[w-K.hx*1.06,h*0.4,90,{w:1.0}]],'V','H',{tens:K.tens}),
    bar(K,w*0.56,w-K.hx*0.4,h*0.42,{rise:0})];},350,'cap',2);
d('J',K=>{const {w,h}=K,ab=K.al,yb=-K.ov+K.hy*0.9,xr=w-K.L;
  return [SKB.P([[xr,h,-90,{w:K.ft}],[xr,h*0.7,-90,{w:1}],[xr,h*0.32,-90,{w:1.04}],apex(w*0.48,yb,180+ab,180-ab,0.85,-K.ov),[K.hx*0.8,h*0.2,100,{w:0.85}]],'H','HV',{tens:K.tens})];},300,'cap',1);
d('Q',K=>[...sk('O',K.g),SKB.L(K.w*0.46,K.B+4,K.w*0.9,-K.desc*0.34,'F','V')],340,'cap',2);
d('U',K=>[cup(K,K.L,K.R)],380,'cap',2);
d('Ч',K=>{const {L,R,h}=K,ym=h*0.4;return [stem(K,L,ym-K.hy,h,{fb:1}),bar(K,L,R,ym-K.hy,{rise:(R-L)*K.sl*0.6}),stem(K,R,0,h)];},380,'cap',2);
d('Ш',K=>{const {L,R,h,cx}=K;return [stem(K,L,0,h),stem(K,cx,0,h),stem(K,R,0,h),SKB.L(L,K.B,R,K.B,'J','J')];},560,'cap',3);
d('Ц',K=>{const {L,R,h,w}=K,dd=K.desc*0.95;return [stem(K,L,0,h),stem(K,R,-dd,h,{fb:1.45}),SKB.L(R-K.S*1.35,-dd+K.hy*0.5,R,-dd+K.hy*0.5,'V','J'),SKB.L(L,K.B,R,K.B,'J','J')];},420,'cap',2);
d('Щ',K=>{const {L,R,h,cx}=K,dd=K.desc*0.95;return [stem(K,L,0,h),stem(K,cx,0,h),stem(K,R,-dd,h,{fb:1.45}),SKB.L(R-K.S*1.35,-dd+K.hy*0.5,R,-dd+K.hy*0.5,'V','J'),SKB.L(L,K.B,R,K.B,'J','J')];},600,'cap',3);
d('Д',K=>{const {L,R,w,h}=K,xt=L+w*0.22,dd=K.desc*0.55,yb=K.B;return [stemL(K,L+w*0.04,yb,xt,h-K.hy*0.6,{fb:1}),SKB.L(xt-w*0.1,K.T,R,K.T,'J','J'),...drop(K,xt-w*0.1+K.hx*0.62,h,-1,K.S*0.9),stem(K,R,yb,h,{fb:1}),
  SKB.L(0,yb,w,yb,'V','V'),stem(K,K.hx*0.9,-dd,yb,{fb:0.85,ft:1}),stem(K,w-K.hx*0.9,-dd,yb,{fb:0.85,ft:1})];},480,'cap',3);

/* ===== строчные: то же на высоте x; выносные — б b d f h k l t g j p q y ф ц щ д ===== */
const SM=(ch,base,bw,nst,kind)=>d(ch,K=>sk(base,K.g),bw,kind||'xh',nst);
d('a',K=>sk('A',K.g),400,'xh',2);d('c',Cs,330,'xh',2);d('e',K=>sk('E',K.g),330,'xh',1);d('o',K=>[oval(K)],340,'xh',2);d('x',K=>sk('X',K.g),400,'xh',1);
d('s',K=>sk('S',K.g),340,'xh',2);d('v',K=>sk('V',K.g),420,'xh',1);d('w',K=>sk('W',K.g),640,'xh',2);d('z',K=>sk('Z',K.g),340,'xh',1);
d('u',K=>[cup(K,K.L,K.R)],380,'xh',2);
d('n',K=>{const {L,R,h}=K;return [stem(K,L,0,h),arch(K,L,R,h*0.56)];},380,'xh',2);
d('m',K=>{const {L,R,h}=K,xm=(L+R)/2;return [stem(K,L,0,h),arch(K,L,xm,h*0.56),arch(K,xm,R,h*0.56)];},560,'xh',3);
d('r',K=>{const {L,R,h}=K;return [stem(K,L,0,h),arch(K,L,R*0.92,h*0.56,{open:true})];},300,'xh',2.4);
d('h',K=>{const {L,R,h}=K;return [stem(K,L,0,K.asc),arch(K,L,R,h*0.56)];},380,'xh',2);
/* FX2g: l с коротким хвостом-крючком вправо (I — голый ствол): I и l различимы при 12 px; хвост короткий, не «подошва» L */
d('l',K=>{const cx=K.cx-K.S*0.35,t=K.S*1.55;return [stem(K,cx,0,K.asc),SKB.P([[cx,K.h*0.3,-90,{w:0.95}],[cx+t*0.42,K.hy*1.1+2,-6,{w:0.8}],[cx+t,K.h*0.2,70,{w:0.55}]],'J','V',{tens:K.tens})];},p=>p.stem*1.0+p.stem*0.9*(FE(p)-1)+110+p.stem*0.9,'xh',2);
d('i',K=>[stem(K,K.cx,0,K.h),sqDot(K,K.cx,K.h+K.S*0.55+K.capH*0.07)],p=>p.stem*1.0+p.stem*0.9*(FE(p)-1)+110,'xh',1);
d('k',K=>{const {L,R,h}=K,J=[L+K.hx*0.6,h*0.40],Q=[J[0]+(R-J[0])*0.38,J[1]+(h-J[1])*0.38];return [stem(K,L,0,K.asc),diag(K,R,h,J[0],J[1],{c1:'J'}),diag(K,Q[0],Q[1],R,0,{c0:'J'})];},380,'xh',1);
d('b',K=>{const {L,R,h}=K;return [stem(K,L,0,K.asc),bowlR(K,L,R,K.B,K.T,{ba:0})];},360,'xh',2);
d('d',K=>skMirX(sk('b',K.g),K.w),360,'xh',2);
d('p',K=>{const {L,R}=K;return [stem(K,L,-K.desc,K.h),bowlR(K,L,R,K.B,K.T,{ba:0})];},360,'xh',2);
d('q',K=>skMirX(sk('p',K.g),K.w),360,'xh',2);
d('y',K=>{const {L,R,h,w}=K;return [SKB.P([[R,h,-90,{w:K.ft}],[R,h*0.4,-90,{w:1}],[R,-K.desc*0.45,-90,{w:1}],[R-w*0.3,-K.desc+K.hy,180,{w:0.85}]],'H','HV',{tens:K.tens}),
  diag(K,L,h,R,h*0.34,{c1:'J',mw:0.95})];},400,'xh',2);
d('g',K=>{const {w,h}=K,xr=w-K.L,ab=K.al*0.9,yb=-K.desc+K.hy;return [oval(K),SKB.P([[xr,h*0.5,-90,{w:1}],[xr,-K.desc*0.4,-90,{w:1}],apex(w*0.46,yb,180+ab,180-ab,0.85,-K.desc),[K.hx*0.9,-K.desc*0.5,100,{w:0.85}]],'J','HV',{tens:K.tens})];},360,'xh',2);
d('j',K=>{const {w,h}=K,xr=w-K.L,ab=K.al*0.9,yb=-K.desc+K.hy;return [SKB.P([[xr,h,-90,{w:K.ft}],[xr,-K.desc*0.4,-90,{w:1}],apex(w*0.46,yb,180+ab,180-ab,0.85,-K.desc),[K.hx*0.9,-K.desc*0.5,100,{w:0.85}]],'H','HV',{tens:K.tens}),sqDot(K,xr,h+K.S*0.55+K.capH*0.07)];},270,'xh',1);
d('f',K=>{const {w,h,cx}=K,xs=cx*0.8,r=w*0.34,ya=K.asc-K.hy;return [SKB.P([[xs,0,90,{w:K.fe}],[xs,h*0.5,90,{w:1}],[xs,ya-r*0.9,90,{w:1}],apex(xs+r*0.55,ya,10,-5,0.85,K.asc),[xs+r*1.5,ya-r*0.2,-60,{w:0.9}]],'H','HV',{tens:K.tens}),bar(K,0,w*0.92,K.T,{rise:0})];},300,'xh',1);
d('t',K=>{const {w,h}=K,xs=w*0.42;return [stem(K,xs,0,h+(K.asc-h)*0.55),bar(K,0,w,K.T,{rise:0})];},320,'xh',1);

/* ===== кириллица, строчные ===== */
d('б',K=>{const {L,R,h,w}=K;return [stem(K,L,0,K.asc),SKB.L(L,K.asc-K.hy,w-K.hx*0.62,K.asc-K.hy,'J','V'),...drop(K,w-K.hx*0.62,K.asc,-1,K.S*1.0),bowlR(K,L,R,K.B,K.T,{ba:0})];},360,'xh',1);
SM('в','B',370,1);SM('г','Г',300,1);SM('ж','Ж',560,3);SM('з','З',340,2);SM('и','И',380,2);SM('к','K',380,1);SM('л','Л',400,2);SM('м','M',520,2);
SM('н','H',380,2);SM('п','П',380,2);SM('т','T',400,1);SM('ч','Ч',380,2);SM('ш','Ш',560,3);SM('ъ','Ъ',440,2);SM('ы','Ы',520,2);SM('ь','Ь',340,1);SM('э','Э',330,2);
SM('ю','Ю',520,3);SM('я','Я',370,1);
d('д',K=>{const {L,R,w,h}=K,xt=L+w*0.22,dd=K.desc*0.55,yb=K.B;return [stemL(K,L+w*0.04,yb,xt,h-K.hy*0.6,{fb:1}),SKB.L(xt-w*0.1,K.T,R,K.T,'J','J'),...drop(K,xt-w*0.1+K.hx*0.62,h,-1,K.S*0.9),stem(K,R,yb,h,{fb:1}),
  SKB.L(0,yb,w,yb,'V','V'),stem(K,K.hx*0.9,-dd,yb,{fb:0.85,ft:1}),stem(K,w-K.hx*0.9,-dd,yb,{fb:0.85,ft:1})];},480,'xh',3);
d('ц',K=>{const {L,R,h}=K,dd=K.desc*0.95;return [stem(K,L,0,h),stem(K,R,-dd,h,{fb:1.45}),SKB.L(R-K.S*1.35,-dd+K.hy*0.5,R,-dd+K.hy*0.5,'V','J'),SKB.L(L,K.B,R,K.B,'J','J')];},420,'xh',2);
d('щ',K=>{const {L,R,h,cx}=K,dd=K.desc*0.95;return [stem(K,L,0,h),stem(K,cx,0,h),stem(K,R,-dd,h,{fb:1.45}),SKB.L(R-K.S*1.35,-dd+K.hy*0.5,R,-dd+K.hy*0.5,'V','J'),SKB.L(L,K.B,R,K.B,'J','J')];},600,'xh',3);
d('ф',K=>{const {w,h,cx}=K;return [stem(K,cx,-K.desc,K.asc),oval(K,{xl:K.hx*1.08,xr:w-K.hx*1.08})];},460,'xh',3);
/* ===== знаки: Ё Й ===== */
/* integration (a): fixed mark zone — the tip of the marks is clamped to K.h + MKZ (not rising with the pen); clearance of the breve >= max(40 u, 0.32 stem) */
const MKZ=185,mkg=K=>Math.max(0.32*K.S,40);
const brv=K=>{const a=K.w*0.27,wm=0.4*K.S/(2*K.hy),/* FX3: middle of the breve >= 0.38 stem (was a 15 u hairline) */
    sq=Math.min(K.S*0.62,(MKZ-mkg(K))*0.5),yb=K.h+mkg(K)+0.16*K.S+2,ye=Math.min(yb+K.S*0.85,K.h+MKZ-sq*0.5);
  return [SKB.P([[K.cx-a,ye,-80,{w:0.55}],[K.cx,yb+K.hy*0.5*wm,0,{w:wm}],[K.cx+a,ye,80,{w:0.55}]],'F','F',{tens:K.tens}),sqDot(K,K.cx-a,ye,sq),sqDot(K,K.cx+a,ye,sq)];};
skCompose(F,'Й','И',[],{extra:K=>brv(K)});skCompose(F,'й','и',[],{extra:K=>brv(K)});
const dier=K=>{const g0=mkg(K),s=Math.min(K.S*0.8,K.h+MKZ-(K.h+g0)),y=K.h+g0+s/2,g=Math.max(K.S*0.9,K.w*0.17);return [sqDot(K,K.cx-g,y,s),sqDot(K,K.cx+g,y,s)];};
skCompose(F,'Ё','E',[],{extra:K=>dier(K)});skCompose(F,'ё','e',[],{extra:K=>dier(K)});

/* ===== цифры ===== */
const dg=(ch,fn,bw,nst)=>d(ch,fn,bw,'cap',nst==null?2:nst);
/* FX3: 0 = 0.84 of the O width (side walls .95), never narrower than 1.9 stem + 55 (counter stays open at any stem) */
dg('0',K=>[oval(K,{xl:K.hx*1.08,xr:K.w-K.hx*1.08,sw:0.95})],p=>Math.max(0.84*WP(340,2)(p),1.9*p.stem+55));
dg('1',K=>{const {w,h}=K,x=w-K.L-K.hx*0.2;return [stem(K,x,0,h),SKB.P([[K.hx*0.7,h*0.7,null,{w:0.8}],[x-K.hx*0.4,h*0.96,null,{w:0.9}]],'V','J')];},260,1);
dg('2',K=>{const {w,h}=K,at=K.al*0.75,yt=h+K.ov-K.hy*0.9;return [SKB.P([[K.hx*0.9,h*0.78,at*0.6,{w:0.85}],apex(w*0.5,yt,at,-at,0.8,h+K.ov),[w-K.hx*1.06,h*0.7,-90,{w:1.06}],[w*0.42,h*0.34,-125,{w:0.9}],[K.L*0.8,K.B,null,{c:1,di:-125,do:0}],[w-K.hx*0.3,K.B,0,{w:1}]],'HV','HV',{tens:K.tens})];},330);
/* FX3: 3 = flat-top three (horizontal bar with a drop, diagonal into the lower bowl); З keeps the round lancet top */
dg('3',K=>{const {w,h}=K,ab=K.al,yb=-K.ov+K.hy*0.9,ym=h*0.54,xe=K.hx*0.7,xr2=w-K.hx*1.08,xj=w*0.4;
  return [...topBar(K,K.hx*0.6,w-K.hx*0.85),diag(K,w-K.hx*0.95,h-K.hy*0.5,xj,ym,{c0:'J',c1:'J',mw:0.9}),
    SKB.P([[xj,ym,0,{w:0.8}],[xr2,(ym+yb)/2,-90,{w:1.08}],apex(w*0.5,yb,180+ab,180-ab,0.8,-K.ov),[xe,h*0.2,180-ab*0.6,{w:0.85}]],'J','HV',{tens:K.tens})];},340);
dg('4',K=>{const {w,h}=K,xs=w-K.L-K.hx*0.3,yb=h*0.3;return [stem(K,xs,0,h),SKB.P([[xs-K.hx*0.3,h,null,{w:0.9}],[K.hx*0.6,yb+K.hy,null,{c:1,j:'miter'}],[w,yb+K.hy]],'H','V')];},340,1);
dg('5',K=>{const {w,h}=K,ab=K.al*0.9,yb=-K.ov+K.hy*0.9,ym=h*0.56;return [SKB.L(w-K.hx*0.6,K.T,K.hx*1.1,K.T,'V','J'),stem(K,K.L,h*0.46,h,{fb:1}),SKB.P([[K.L,h*0.5,90,{w:0.8}],[w*0.5,ym+K.hy,0,{w:0.85}],[w-K.hx*1.06,(ym+yb)/2,-90,{w:1.06}],apex(w*0.5,yb,180+ab,180-ab,0.8,-K.ov),[K.hx*0.7,h*0.2,180-ab*0.6,{w:0.85}]],'J','HV',{tens:K.tens})];},340);
dg('6',K=>{const {w,h}=K,at=K.al*0.75;return [oval(K,{ot:h*0.62,ob:0}),SKB.P([[K.L,h*0.45,90,{w:1}],[K.L+w*0.04,h*0.78,80,{w:0.95}],[w*0.62,h+K.ov-K.hy*0.9,0,{w:0.8}],[w-K.hx*0.6,h*0.86,-50,{w:0.85}]],'J','HV',{tens:K.tens})];},340);
dg('7',K=>{const {w,h}=K;return [SKB.P([[0,K.T],[w-K.hx*0.8-5,K.T,null,{c:1,j:'miter'}],[w*0.34,0,null,{w:1.0}]],'V','H')];},330,1);
dg('8',K=>{const {w,h}=K,ym=h*0.54,e=K.hy*0.9-K.ov;return [oval(K,{ot:ym+e,ob:0,xl:K.hx*1.08,xr:w-K.hx*1.08}),oval(K,{ot:h,ob:ym-e,xl:K.hx*1.5,xr:w-K.hx*1.5})];},350,3.2);
dg('9',K=>skXf(sk('6',K.g),(x,y)=>[K.w-x,K.h-y]),340);
/* ===== знаки ===== */
skPunct(F);
const SPS=K=>K.S*0.95;
/* FX3: comma-form mark: square dot + short tail. 'comma' tail ends at 0.92·desc; quotes are one band (height 0.33 capH, top = capH):
   close = ’ ”, open = ‘ “ (rotated 180° in place), low = „ (dot on the baseline) */
const cm=(K,x,mode)=>{const sp=SPS(K),Hq=0.33*K.capH,tail=(yc)=>SKB.st([nd(x,yc-sp*0.2,0.8),nd(x-K.S*0.5,mode==='comma'?-K.desc*0.92:yc-sp/2-(Hq-sp),0.55)],'H','H');
  const yc=mode==='comma'||mode==='low'?sp/2:K.capH-sp/2,sk=[sqDot(K,x,yc),tail(yc)];
  if(mode!=='open')return sk;const ym=K.capH-Hq/2;return skXf(sk,(X,Y)=>[2*x-X,2*ym-Y]).map(skReverse);};
d('.',K=>[sqDot(K,K.cx,SPS(K)/2)],p=>p.stem*1.0+80,'cap',1);
d(',',K=>cm(K,K.cx,'comma'),p=>p.stem*1.0+90,'cap',1);
d(':',K=>[sqDot(K,K.cx,SPS(K)/2),sqDot(K,K.cx,K.xh-SPS(K)/2)],p=>p.stem*1.0+80,'xh',1);
d(';',K=>[sqDot(K,K.cx,K.xh-SPS(K)/2),...cm(K,K.cx,'comma')],p=>p.stem*1.0+90,'xh',1);
d('!',K=>[SKB.st([nd(K.cx,K.capH,K.ft),nd(K.cx,K.capH*0.62,1),nd(K.cx,SPS(K)*1.6+K.capH*0.06,0.62)],'H','H'),sqDot(K,K.cx,SPS(K)/2)],p=>p.stem*1.0+90,'cap',1);
d('?',K=>{const {w,h:_h}=K,h=K.capH,at=K.al*0.75,yt=h+K.ov-K.hy*0.9,yb=SPS(K)*1.6+h*0.06;
  return [SKB.P([[K.hx*0.9,h*0.8,at*0.6,{w:0.85}],apex(w*0.5,yt,at,-at,0.8,h+K.ov),[w-K.hx*1.06,h*0.72,-90,{w:1.06}],[w*0.52,h*0.4,-120,{w:0.9}],[w*0.48,yb,-90,{w:0.7}]],'V','H',{tens:K.tens}),sqDot(K,w*0.48,SPS(K)/2)];},330,'cap',1);
const dash=(ch,len,y,wv)=>d(ch,K=>[SKB.st([nd(0,K.capH*y,wv),nd(K.w,K.capH*y,wv)],'V','V')],p=>len+(p.stem-F.S0)*0.5,'cap',0);
dash('-',230,0.42,1.5);dash('–',480,0.42,1.4);dash('—',900,0.42,1.4);
d('"',K=>[SKB.st([nd(K.L,K.capH,K.ft),nd(K.L,K.capH*0.7,0.62)],'H','H'),SKB.st([nd(K.R,K.capH,K.ft),nd(K.R,K.capH*0.7,0.62)],'H','H')],p=>p.stem*2.6+60,'cap',2);
d("'",K=>[SKB.st([nd(K.cx,K.capH,K.ft),nd(K.cx,K.capH*0.7,0.62)],'H','H')],p=>p.stem*1.0+80,'cap',1);
/* типографские знаки: запятая (квадратная точка + хвост) поднимается к верху прописных; ‘ — поворот на 180°; пары — два знака */
{
 const q1=p=>p.stem*1.0+90,q2=p=>p.stem*2.5+110,px=K=>K.S*0.95;
 d('’',K=>cm(K,K.cx,'close'),q1,'cap',1);
 d('‘',K=>cm(K,K.cx,'open'),q1,'cap',1);
 d('”',K=>[...cm(K,K.cx-px(K),'close'),...cm(K,K.cx+px(K),'close')],q2,'cap',2);
 d('“',K=>[...cm(K,K.cx-px(K),'open'),...cm(K,K.cx+px(K),'open')],q2,'cap',2);
 d('„',K=>[...cm(K,K.cx-px(K),'low'),...cm(K,K.cx+px(K),'low')],q2,'cap',2);
 /* … : три квадратные точки, шаг 2 стороны — теснее трёх набранных точек */
 const ep=K=>K.S*1.9;
 d('…',K=>[0,1,2].map(i=>sqDot(K,K.S*0.5+i*ep(K),SPS(K)/2)),p=>p.stem*(1+3.8),'cap',3);
 /* − : горизонталь «+»: ось на 0.5 высоты прописных, штрих дефиса, ширина цифры */
 d('−',K=>[SKB.st([nd(0,K.capH*0.5,1.4),nd(K.w,K.capH*0.5,1.4)],'V','V')],p=>F.GL['0'].w(p),'cap',0);}
/* ---------- регистрация ---------- */
F.sym=false;
F.nodeBudget=25;F.simpTol=1.5;
const P0={wdth:95,capH:700,xh:540,asc:730,desc:200,stem:110,hair:38,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:8,slant:0,sb:38,track:0,space:200,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,term:1,tens:1,conn:0,flare:50,slope:8,point:55,drop:50};
F.DEFAULTS={regular:{...P0},italic:{...P0,wdth:92,slant:9,icomp:40,space:192}};
F.lim={capH:[660,740],xhR:[0.7,0.84],ascA:[10,90],desc:[170,240],wdth:[92,118],ov:[2,14],stem:[80,150],stemK:0.34,stemW:1,stemWK:1.45,hairR:[0.26,0.42],hairX:0.115,nib:[0,0],term:[1,1],tens:[0.9,1.1],flare:[0,100],slope:[0,16],point:[0,100],drop:[0,100]};
F.params={nib:null,term:null,press:null,conn:null,spur:null,diag:null,optic:null,round:null,kappa:null,innerR:null,rough:null,aper:null,bar:null,mv:null,trap:null,join:null,stemScale:null,
  flare:['Раструб стволов, %',0,100,1],slope:['Угол наклона перекладин, °',0,16,0.5],point:['Остриё полуовалов, %',0,100,1],drop:['Каплевидные элементы, %',0,100,1],tens:['Натяжение кривых',0.9,1.1,0.01]};
for(const k of ['capH','desc','wdth','ov','stem'])F.params[k]=[(PARAMS.find(r=>r[0]===k)||[])[1]||k,F.lim[k][0],F.lim[k][1],1];
F.params.stem[0]='Основной штрих (ствол)';F.params.hair=['Соединительный штрих (волосная)',28,F.lim.stem[1]*0.6,1];
F.params.xh=['Высота строчных',F.lim.capH[0]*F.lim.xhR[0],F.lim.capH[1]*F.lim.xhR[1],1];F.params.asc=['Верхние выносные',F.lim.capH[0]+F.lim.ascA[0],F.lim.capH[1]+F.lim.ascA[1],1];
F.methods=[
  ['Характер','Готовые системы формы: раструб, остриё и капли.',[['Вязь',{flare:50,point:55,drop:50,slope:8}],['Уставной',{flare:25,point:20,drop:25,slope:0}],['Лезвие',{flare:90,point:95,drop:85,slope:14}]]],
  ['Вес','Толщина ствола.',[['Лёгкий',{stem:80,hair:32}],['Обычный',{stem:112,hair:40}],['Жирный',{stem:150,hair:46}]]],
  ['Ширина','Общая ширина знаков.',[['Узкий',{wdth:92}],['Обычный',{wdth:100}],['Широкий',{wdth:116}]]],
  ['Перекладины','Наклон тонких перекладин и капли.',[['Прямые',{slope:0,drop:30}],['Косые',{slope:8,drop:50}],['Крутые',{slope:15,drop:80}]]],
];
/* веса: ствол Light 0.714 · Regular 1 · Bold 1.26 (≥ +25%, ParaType) · Black 1.37 от умолчания (предел ствола 150, ширина растёт вместе с весом); волосная растёт медленнее, раструб в тяжёлых слабее */
WSCALE.ustav=0.66;
KERN_TABLE.ustav=KERN_TABLE_BASE;
const _famParams_ust=famParams;
famParams=function(p,wn){const o=_famParams_ust(p,wn);
  if(CUR_FONT==='ustav'){const kw={Light:0.727,Regular:1,Bold:1.26,Black:1.37}[wn];if(kw)o.stem=Math.round(p.stem*kw);const k=o.stem/p.stem;
    o.hair=Math.round(p.hair*Math.pow(k,0.85));/* FX3: hair ~ stem^0.85 (was ^0.45): the thinnest ring ray of o/O now scales like the stems (Bold/Regular >= 1.25) */
    o.flare=Math.round(gp(p,'flare',60)*(k>1?Math.max(0.4,1-(k-1)*0.55):1));
    if(p.wdth!=null)o.wdth=Math.round(p.wdth*({Bold:1.04,Black:1.10}[wn]||1));/* предел ствола привязан к ширине (stemWK·wdth): тяжёлым весам — шире */
    return paramLimits(o,'ustav').q;}
  return o;};
/* новые параметры в пределах: зажимаются вместе с остальными (safeP) */
const _paramLimits_ust=paramLimits;
paramLimits=function(p,font){const r=_paramLimits_ust(p,font);font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');
  if(font==='ustav'){const D=F.DEFAULTS.regular;for(const k of USP){const lim=F.lim[k];let v=r.q[k];if(v==null||!isFinite(+v))v=D[k];r.q[k]=CL(+v,lim[0],lim[1]);r.L[k]=lim.slice();}}
  return r;};
/* ёлочки: шире растут с пером (стандартные выходят за поля в Bold/Black) */
{const guil=(K,left,x0)=>{const wq=K.w*0.3,m=K.xh*0.48,a=Math.max(K.xh*0.22,wq*0.9);const sk=[SKB.P([[x0+wq,m+a],[x0,m,null,{c:1}],[x0+wq,m-a]],'F','F')];return left?sk:skMirX(sk,K.w);};
const gStep=K=>{const T=Math.max(K.S,K.H),wq=K.w*0.3,a=Math.max(K.xh*0.22,wq*0.9),sn=a/Math.hypot(a,wq);return Math.max(K.w*0.42,T/sn+T*0.45);};
const gW=p=>470+(Math.max(p.stem,p.hair)-F.S0)*4.6;
d('«',K=>[...guil(K,true,K.L),...guil(K,true,K.L+gStep(K))],gW,'xh',0);
d('»',K=>[...skMirX([...guil(K,true,K.L),...guil(K,true,K.L+gStep(K))],K.w)],gW,'xh',0);}
F.proof={stemSet:'HILEFTПШЩЦЕГЬЫЪБДilпшщцьыъгт',barSkip:'ЗЭEЕFHНн'};
skRegister(F);
if(F.GL['−']&&!F.CHARSET.includes('−'))F.CHARSET.push('−');
})();
