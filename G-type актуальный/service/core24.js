/* ===== «Модуль» (Modul Grid) — модульный геометрический дисплей: плита минус «замочные скважины» =====
   Принцип (из эталона берётся только принцип постройки): каждый знак — монолитная плита из немногих модулей
   (стадион с полукруглым верхом/низом, прямоугольник, круг) с вычтенными счётчиками одной системы:
   круглая «головка» диаметром w−2m (m — стенка) + узкая щель под ней (скважина). Щель открыта книзу (А, Н, X),
   кверху (U, Ц, Ш) или закрыта скруглённым концом (O, D, C). Все размеры — от ячейки g = 0.3·capH·wdth/100:
   2 ячейки у большинства знаков, 1 у I, 3 у M N W Ж Ш Щ Ы Ю Ф. Высота прописной ≈ 1.67 ширины двух ячеек.
   Глубина «скважины» (conn): щель = головка·(1−0.5·conn). Срез концов term: 2 — по сетке, 1 — раструбом.
   Регистр: прописные = строчные (юникейс), овершута нет. Знаки собираются на компонентах core11 (rp, mkc, SUB). */
(function(){
const F={id:'modul',name:'Модуль',family:'Modul Grid',tag:'Модульная сетка · дисплей',S0:84,GL:{},charset:'basic',
  desc:'Тяжёлые знаки из плит и «замочных скважин»: круглая головка + узкая щель — единая система счётчиков на жёсткой сетке. Прописные и строчные — один регистр (юникейс). Пресеты — Модуль, Скважина, Плита, Сетка.',
  sample:'MODUL GRID · МОДУЛЬНАЯ СЕТКА'};
const cellOf=p=>p.capH*0.3*p.wdth/100;
/* ---------- размеры модулей от параметров (общие для ширин и форм) ---------- */
const wAof=p=>Math.max(2*cellOf(p),3.6*p.stem);                 /* ширина «двух ячеек» */
const cOf=p=>Math.max(0,Math.min(1,(p.conn||0)/100));
/* FX3: the wall beside the slit (LEG = R - rs) follows the stem: 1.6·stem at full conn (was 2.6x Light … 1.4x Black), the slit narrows as the stem grows;
   conn < 100 blends towards the plain round hole (rs = rh) */
const dimsA=(w,p)=>{const S=p.stem,R=w/2,rh=Math.max(6,R-S),c=cOf(p),rf=Math.min(rh,Math.max(rh*0.22,R-1.6*S)),rs=rh+(rf-rh)*c;return {S,R,rh,rs,LEG:R-rs};};
const legOf=p=>dimsA(wAof(p),p).LEG;
/* «три ячейки»: две арки шириной wa накладываются на толщину стенки, W = 2·wa − m: головки разделены стенкой m */
/* MD: ширина стойки с замочной скважиной (Г Т Б К L I 1 4 7): ≥ 2 стенок, ≤ 0.42 ширины двух ячеек — головка не схлопывается при conn=0 и stem 46 */
const spOf=p=>Math.min(1.08*Math.max(legOf(p),1.6*p.stem),0.42*wAof(p));
const W3of=p=>Math.max(3*cellOf(p),5.4*p.stem);
const waOf=(W,p)=>(W+p.stem)/2;
/* ---------- набор инструментов формы ---------- */
function kit(g){const p=g.p,S=g.S,h=g.h,w=g.w,tens=p.tens||1,term=Math.round(p.term||2);
  const g1={round:1,kappa:Math.min(0.95,0.5523*tens),S,H:g.H};
  const D=dimsA(w,p),R=D.R,rh=D.rh,rs=D.rs,LEG=legOf(p),cx=w/2;
  const hr2=Math.max(6,Math.min(rh,(h-2*S-1.5*S)/4));         /* головка в знаках с двумя счётчиками (B 8 3 S) */
  const ta=Math.min(1.5*S,0.2*h),tb=Math.min(1.25*S,0.17*h);   /* рукав E/F, перекладина T Г 5 7 */
  const sH=Math.max(4,Math.min(rs*0.9,hr2*0.72)),ymid=h*0.5,yE=1.9*S;                                   /* yE — толщина массы под закрытой щелью */
  const K={g,p,S,h,w,cx,R,rh,rs,LEG,hr2,ta,tb,ymid,yE,term,sH};
  K.box=(x0,y0,x1,y1,r)=>{const rr=Array.isArray(r)?r:[r||0,r||0,r||0,r||0];return mkc(rp([[x0,y0,rr[0]],[x1,y0,rr[1]],[x1,y1,rr[2]],[x0,y1,rr[3]]],g1),false);};
  K.pg=pts=>mkc(pts.map(q=>({x:q[0],y:q[1],a:null,b:null})),false);
  K.disc=(x,y,r)=>mkc(ellN(x,y,r,r),false);
  const sub=c=>Object.assign(c,{op:'sub'}),post=c=>Object.assign(c,{op:'post'});
  K.sub=sub;K.post=post;
  /* скважина вниз: головка (круг) + щель, открытая книзу (closed=false) или с круглым концом на высоте yEnd */
  K.keyDown=(x,yh,r,s,yEnd,closed)=>[sub(K.disc(x,yh,r)),sub(closed?K.box(x-s,yEnd,x+s,yh,[s,s,0,0]):K.box(x-s,-80,x+s,yh))];
  K.keyUp=(x,yh,r,s,yEnd,closed)=>[sub(K.disc(x,yh,r)),sub(closed?K.box(x-s,yh,x+s,yEnd,[0,0,s,s]):K.box(x-s,yh,x+s,h+80))];
  /* горизонтальная щель от головки: вправо (dir=1) или влево (dir=-1), открыта наружу */
  K.slotH=(x,y,s,dir)=>sub(dir>0?K.box(x,y-s,w+80,y+s):K.box(-80,y-s,x,y+s));
  /* вырез-апертура справа/слева: term 2 — прямой срез по сетке, term 1 — раструб */
  K.gap=(xi,xo,y0,y1)=>{const f=term===1?(y1-y0)*0.3:0;return sub(K.pg([[xi,y0],[xo,y0-f],[xo,y1+f],[xi,y1]]));};
  /* MD-rule: pin = замочная скважина в стойке (головка + закрытая щель с круглым концом), str = полоса с круглыми концами */
  K.SP=spOf(p);K.rH=Math.max(5,K.SP*0.27,0.46*S);K.rN=Math.max(3,K.SP*0.12,0.2*S);K.tb2=Math.min(1.5*S,0.2*h);
  K.pin=(x,yh,yE,rH,rN)=>{rH=rH||K.rH;rN=rN||K.rN;return [sub(K.disc(x,yh,rH)),sub(yE<yh?K.box(x-rN,yE,x+rN,yh,[rN,rN,0,0]):K.box(x-rN,yh,x+rN,yE,[0,0,rN,rN]))];};
  K.str=(x0,y0,x1,y1,r)=>{const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy),q=r-1.5,nx=-dy/L*q,ny=dx/L*q;return [K.pg([[x0+nx,y0+ny],[x1+nx,y1+ny],[x1-nx,y1-ny],[x0-nx,y0-ny]]),K.disc(x0,y0,r),K.disc(x1,y1,r)];};
  K.subStr=(x0,y0,x1,y1,r)=>K.str(x0,y0,x1,y1,r).map(sub);
  K.hitFix=1;
  return K;}
const reg=(ch,shape,wf)=>{F.GL[ch]={shape:g=>shape(kit(g)),w:wf,k:'cap',opt:{}};};
/* ---------- общие построения ---------- */
/* стадион: оба конца круглые; полукруглый верх: [bl,br,tr,tl] */
const stad=(K,rb,rt,x0,x1)=>K.box(x0==null?0:x0,0,x1==null?K.w:x1,K.h,[rb,rb,rt,rt]);
/* O/C/D/G/Q: закрытая скважина — голова у верха, щель вниз с круглым концом */
const holeO=K=>K.keyDown(K.cx,K.h-K.S-K.rh,K.rh,K.rs,K.yE,true);
const Cf=K=>{const y0=K.h*0.27,y1=K.h*0.47;return [stad(K,K.R,K.R),...holeO(K),K.gap(K.cx,K.w+80,y0,y1)];};
/* E/F: слева дуга, справа прямые рукава; контры — горизонтальные скважины с круглым левым концом */
const armsE=K=>{const {w,h,ta,S}=K,hc=(h-3*ta)/2,cl=Math.max(K.LEG*0.85,S*1.25),rE=Math.min(K.R,h/2),rT=Math.max(2,Math.min(hc/2,rE-Math.max(cl,ta))),r=hc/2,o=[];
  const c1=h-ta-hc,c0=ta;
  o.push(K.sub(K.box(cl,c1,w+80,c1+hc,[r,0,0,rT])),K.sub(K.box(cl,c0,w+80,c0+hc,[rT,0,0,r])));return {o,hc,c0,c1,cl};};
const Ef=K=>{const {o}=armsE(K),r=Math.min(K.R,K.h/2);return [K.box(0,0,K.w,K.h,[r,0,0,r]),...o];};
const Ff=K=>{const {o,hc,c1,cl}=armsE(K),r=Math.min(K.R,K.h/2),{ta,w,h}=K;
  return [K.box(0,0,w,h,[0,0,0,r]),o[0],K.sub(K.box(cl,-80,w+80,ta+hc)),K.sub(K.box(w*0.74,ta+hc-6,w+80,c1+6))];};
/* H-семейство: сверху скважина «головкой вниз», снизу «головкой вверх», между ними перекладина */
const Hbody=K=>{const {S,h,cx,rh,rs}=K,bar=S,ym=h*0.5;
  return [K.box(0,0,K.w,h),...K.keyUp(cx,ym+bar/2+rh,rh,rs,0,false),...K.keyDown(cx,ym-bar/2-rh,rh,rs,0,false)];};
const bite=(K,x,y,r)=>K.sub(K.disc(x,y,r));
/* три ячейки: две арки с общей средней ножкой */
const duo=K=>{const W=K.w,wa=waOf(W,K.p),Da=dimsA(wa,K.p);return {W,wa,Ra:Da.R,rha:Da.rh,rsa:Da.rs,LEG:Da.LEG,c1:wa/2,c2:W-wa/2};};
/* M: две стенки и V-полоса между ними; впадина верхнего клина на половине высоты */
const Mf=K=>{const {w:W,h,LEG}=K,s=LEG,cx=W/2,hn=h*0.5,t=Math.min(h*0.34,hn-0.1*h),Rm=Math.min(LEG*0.9,W/6),rb=Math.max(8,K.rs*0.5);
  return [K.box(0,0,W,h,[0,0,Rm,Rm]),K.sub(K.pg([[s,h+80],[s,h],[cx,hn],[W-s,h],[W-s,h+80]])),K.sub(K.pg([[s,-80],[s,h-t],[cx,hn-t],[W-s,h-t],[W-s,-80]])),K.sub(K.disc(cx,hn+rb*0.45,rb))];};
/* N/И: две стенки + диагональ; два кармана-клина (сверху справа, снизу слева) с плоским срезом (читается N, а не Л) */
const Nf=K=>{const {w:W,h,S}=K,LEG=1.6*S,Ra=duo(K).Ra,dd=Math.min(Math.max(LEG*1.3,S*1.2),0.4*(W-LEG)),ex=W-LEG,sl=(W-dd)/h,yC=h*(1-(ex-dd)/(W-dd)),f=Math.max(8,0.9*Math.min(K.rh,Math.max(0.22*K.rh,K.R-1.6*S))),yT=yC+f,xT=dd+sl*(h-yT);
  const q=[[dd-80*sl,h+80],[ex,h+80],[ex,yT],[xT,yT]],pw=dd/Math.sqrt(1+sl*sl),ne=Math.hypot(sl,1),dx=sl/ne,dy=-1/ne,L=0.2*h,rw=0.2*pw;
  /* щель-скважина вдоль диагонали: полоса с круглыми концами, закрытая */
  return [K.box(0,0,W,h,[0,Ra,0,Ra]),K.sub(K.pg(q)),K.sub(K.pg(q.map(c=>[W-c[0],h-c[1]]))),...K.subStr(W/2-dx*L,h/2-dy*L,W/2+dx*L,h/2+dy*L,rw)];};
const Shf=K=>{const {W,wa,rha,rsa,c1,c2}=duo(K),S=K.S;
  return [K.box(0,0,W,K.h),...K.keyUp(c1,S+rha,rha,rsa,0,false),...K.keyUp(c2,S+rha,rha,rsa,0,false)];};
/* P/R: кольцо + ножка */
const ringTop=K=>{const {R,h,w}=K;return [K.box(0,0,K.LEG,h-R),K.disc(K.cx,h-R,R-1.5),K.sub(K.disc(K.cx,h-R,K.rh))];};
const Pf=K=>ringTop(K);
const Rf=K=>{const {R,h,w,S,rh,rs,cx,LEG}=K,cy=h-R,yt=cy-rh-S;
  return [K.box(0,0,w,h,[0,0,R,R]),K.sub(K.disc(cx,cy,rh)),K.sub(K.box(cx-rs*1.1,-80,cx+rs*1.1,yt,[0,0,rs*1.1,rs*1.1])),bite(K,w+LEG*0.25,yt+S*0.4,LEG*0.62)];};
/* B/8/3/S/2/5: два счётчика одной головки hr2 */
const twoHeads=K=>{const {h,S,hr2}=K;return {y1:h-S-hr2,y2:S+hr2};};
const Bf=K=>{const {w,h,S,hr2,LEG}=K,{y1,y2}=twoHeads(K),rr=hr2+S;
  return [K.box(0,0,LEG,h),K.box(LEG*0.5,h-2*rr-1,w,h-1,[0,rr,rr,0]),K.box(LEG*0.5,1,w,2*rr+1,[0,rr,rr,0]),
    K.sub(K.disc(w-rr,y1,hr2)),K.sub(K.disc(w-rr,y2,hr2))];};
/* ---------- регистрация: латиница ---------- */
const Zf=K=>{const {w,h,R,S}=K,{y1,y2}=twoHeads(K),rw=Math.max(S*0.7,K.LEG*0.45);
  return [stad(K,R,R),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2)),K.slotH(K.cx,y1,K.sH,-1),K.slotH(K.cx,y2,K.sH,-1),K.sub(K.disc(w+rw*0.35,h*0.5,rw))];};
const Yf=K=>{const {w,h,cx}=K,dd=ddOf(K),r=dd*0.4,yj=h*0.45,sb=K.SP,r0=sb*0.3;
  return [K.box(cx-sb/2,0,cx+sb/2,yj+r*0.5,[r0,r0,0,0]),...K.str(r,h-r,cx,yj,r),...K.str(w-r,h-r,cx,yj,r),...K.pin(cx,yj-K.rH*0.3,h*0.1,Math.max(sb*0.27,0.46*K.S),Math.max(sb*0.12,0.2*K.S))];};
/* W: две V из полос одним контуром (плоские низы 1.5d, центральный пик на полную высоту) */
/* вершина внутреннего выреза двух полос, сходящихся в b (a и c — их дальние концы), полуширина r */
const notchV=(a,b,c,r)=>{const u=(p,q)=>{const L=Math.hypot(q[0]-p[0],q[1]-p[1]);return [(q[0]-p[0])/L,(q[1]-p[1])/L];},d1=u(b,a),d2=u(b,c);
  const off=(d,o)=>{let n=[-d[1],d[0]];if(n[0]*o[0]+n[1]*o[1]<0)n=[-n[0],-n[1]];return [b[0]+n[0]*r,b[1]+n[1]*r];};
  const p1=off(d1,d2),p2=off(d2,d1),det=d1[0]*(-d2[1])-d1[1]*(-d2[0]),t=((p2[0]-p1[0])*(-d2[1])-(p2[1]-p1[1])*(-d2[0]))/det;
  return [p1[0]+d1[0]*t,p1[1]+d1[1]*t];};
const Wf=K=>{const {w:W,h,LEG}=K,d=Math.min(LEG*1.05,0.17*W),r=d*0.45,cx=W/2,x1=W*0.2,rb=Math.max(7,d*0.38);
  const a=[r,h-r],b=[x1,r],c=[cx,h-r],e=[W-x1,r],f=[W-r,h-r];
  const v1=notchV(a,b,c,r),v2=notchV(c,e,f,r),v3=notchV(b,c,e,r);
  /* нижний вырез под пиком: вершина v3 направлена вниз */
  return [...K.str(a[0],a[1],b[0],b[1],r),...K.str(b[0],b[1],c[0],c[1],r),...K.str(c[0],c[1],e[0],e[1],r),...K.str(e[0],e[1],f[0],f[1],r),
    K.sub(K.disc(v1[0],v1[1]+rb*0.4,rb)),K.sub(K.disc(v2[0],v2[1]+rb*0.4,rb)),K.sub(K.box(v1[0]-K.rN*1.1,v1[1],v1[0]+K.rN*1.1,v1[1]+rb*2.5)),K.sub(K.box(v2[0]-K.rN*1.1,v2[1],v2[0]+K.rN*1.1,v2[1]+rb*2.5))];};
const W2=wAof,W3=W3of;
/* А: арка с закрытой головкой над перекладиной и открытой скважиной книзу (читается как А, а не П) */
const Af=K=>{const {h,S,cx,rh,rs,R}=K,bar=Math.max(S*0.9,0.11*h),tb0=h-S-2*rh,r2=Math.max(6,Math.min(rh*0.8,(tb0-bar-S*0.6)/2)),yc=tb0-bar-r2;
  return [K.box(0,0,K.w,h,[0,0,R,R]),K.sub(K.disc(cx,h-S-rh,rh)),...K.keyDown(cx,yc,r2,Math.min(rs,r2),0,false)];};
reg('A',Af,W2);
reg('B',Bf,W2);
reg('C',Cf,W2);
reg('D',K=>[K.box(0,0,K.w,K.h,[0,K.R,K.R,0]),...holeO(K)],W2);
reg('E',Ef,W2);
reg('F',Ff,W2);
reg('G',K=>{const {w,h,tb,cx,S}=K,ga=Math.max(1.0*S,0.15*h),ya0=h*0.56;
  return [...Cf(K).slice(0,3),K.gap(cx+K.rs*0.5,w+80,ya0,ya0+ga),K.post(K.box(cx,K.yE-12,cx+K.rh+3,ya0+4))];},W2);
reg('H',Hbody,W2);
reg('I',K=>{const {w,h}=K,r=w/2;return [K.box(0,0,w,h,[r,r,r,r]),...K.pin(K.cx,h*0.66,h*0.34)];},spOf);
reg('J',K=>[K.box(0,0,K.w,K.h,[K.R,K.R,0,0]),...K.keyUp(K.cx,K.S+K.rh,K.rh,K.rs,0,false),K.sub(K.box(-80,K.h*0.42,K.cx,K.h+80))],W2);
/* K: стенка + две диагонали-полосы, сходящиеся у стенки; X: две пересекающиеся полосы (плита минус клинья) */
const ddOf=K=>Math.min(Math.max(K.LEG*1.25,K.S*1.15),0.3*K.w);
reg('K',K=>{const {w,h,SP}=K,dd=ddOf(K),r=dd*0.4,ym=h*0.5,xj=SP*0.6,r0=SP*0.3;
  return [K.box(0,0,SP,h,[r0,0,0,r0]),...K.str(xj,ym,w-r,h-r,r),...K.str(xj,ym,w-r,r,r),K.sub(K.disc(SP*0.5,ym,K.rH*1.1)),K.sub(K.box(SP*0.5,ym-K.rN,w+80,ym+K.rN))];},W2);
reg('L',K=>{const {w,h,SP,S}=K,t=K.tb2,r0=SP*0.3,rb=t/2;
  return [K.box(0,0,SP,h,[0,0,0,r0]),K.box(0,0,w,t,[r0,rb,rb,0]),...K.pin(SP/2,h*0.62,t+S*0.5)];},W2);
reg('M',Mf,W3);
reg('N',Nf,W3);
reg('O',K=>[stad(K,K.R,K.R),...holeO(K)],W2);
reg('P',Pf,W2);
reg('Q',K=>{const {cx,w,rs,S,LEG}=K,dd=Math.round(K.h*0.2);return [stad(K,K.R,K.R),...holeO(K),K.box(cx+rs*0.5,-dd,cx+rs*0.5+LEG*0.9,K.yE*0.8)];},W2);
reg('R',Rf,W2);
reg('S',K=>{const {w,h,R,rs}=K,{y1,y2}=twoHeads(K);return [stad(K,R,R),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2)),K.slotH(K.cx,y1,K.sH,1),K.slotH(K.cx,y2,K.sH,-1)];},W2);
reg('T',K=>{const {w,h,tb2:tb,SP,cx}=K,rb=tb/2,r0=SP*0.3;
  return [K.box(0,h-tb,w,h,[rb,rb,rb,rb]),K.box(cx-SP/2,0,cx+SP/2,h-tb+2,[r0,r0,0,0]),...K.pin(cx,h-tb-K.rH*0.5,h*0.3)];},W2);
reg('U',K=>[K.box(0,0,K.w,K.h,[K.R,K.R,0,0]),...K.keyUp(K.cx,K.S+K.rh,K.rh,K.rs,0,false)],W2);
reg('V',K=>{const {w,h,cx}=K,dd=ddOf(K),r=dd*0.4,a=[r,h-r],b=[cx,r],c=[w-r,h-r],v=notchV(a,b,c,r),rb=Math.max(8,r*0.7);
  return [...K.str(a[0],a[1],b[0],b[1],r),...K.str(b[0],b[1],c[0],c[1],r),K.sub(K.disc(v[0],v[1]+rb*0.5,rb)),K.sub(K.box(v[0]-K.rN,v[1],v[0]+K.rN,v[1]+rb*2.5))];},W2);
reg('W',Wf,W3);
reg('X',K=>{const {w,h,cx,S}=K,dd=ddOf(K),r=Math.max(dd*0.4,0.62*S);
  return [...K.str(r,h-r,w-r,r,r),...K.str(w-r,h-r,r,r,r),K.sub(K.disc(cx,h/2,r*0.8))];},W2);
reg('Y',Yf,W2);
reg('Z',K=>{const {w,h,tb}=K,dh=w*0.45,rb=tb/2,xa=w-rb-dh/2,ya=h-tb,xb=dh/2+rb,yb=tb,sl=t=>[xa+(xb-xa)*t,ya+(yb-ya)*t],p0=sl(0.36),p1=sl(0.64),rs=K.rH*0.8;
  return [K.box(0,h-tb,w,h,[rb,rb,rb,rb]),K.box(0,0,w,tb,[rb,rb,rb,rb]),K.pg([[w-rb,h-tb+3],[w-rb-dh,h-tb+3],[rb,tb-3],[rb+dh,tb-3]]),...K.subStr(p0[0],p0[1],p1[0],p1[1],rs)];},p=>Math.max(wAof(p)*1.05,4*p.stem));
/* ---------- цифры ---------- */
reg('0',K=>{const {S,rs,R,h}=K,r=Math.max(8,Math.min(K.rh*0.62,rs*1.25));return [stad(K,R,R),K.sub(K.box(K.cx-r,S*1.5,K.cx+r,h-S*1.5,[r,r,r,r]))];},W2);
reg('1',K=>{const {w,h,tb,SP}=K,a=w-SP,r0=SP*0.3;return [K.box(a,0,w,h,[r0,r0,0,0]),K.pg([[a+2,h],[a+2,h-2.6*tb],[0,h-1.3*tb]]),...K.pin(a+SP/2,h*0.55,h*0.2)];},p=>spOf(p)+0.75*wAof(p)*0.5);
reg('2',K=>{const {w,h,R,rs,S}=K,{y1,y2}=twoHeads(K);return [K.box(0,0,w,h,[0,0,R,R]),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2)),K.slotH(K.cx,y1,K.sH,-1),K.slotH(K.cx,y2,K.sH,1)];},W2);
/* FX3: 3 = З body with a straight (flat) top module: square top corners, round bottom */
reg('3',K=>{const {w,h,R,S}=K,{y1,y2}=twoHeads(K),rw=Math.max(S*0.7,K.LEG*0.45);
  return [K.box(0,0,w,h,[R,R,0,0]),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2)),K.slotH(K.cx,y1,K.sH,-1),K.slotH(K.cx,y2,K.sH,-1),K.sub(K.disc(w+rw*0.35,h*0.5,rw))];},p=>wAof(p)*0.9);
const f4=(K,yc)=>{const {w,h,S,cx,rh,rs,LEG}=K,bar=S;
  return [K.box(0,0,w,h),...K.keyUp(cx+LEG*0.0,yc+bar/2+rh,rh,rs,0,false),K.sub(K.box(-80,-80,w-LEG,yc-bar/2))];};
reg('4',K=>{const {w,h,LEG,S,SP}=K,dd=ddOf(K),tb=Math.min(1.25*S,0.17*h),yb=h*0.28,xs=w-SP,rb=tb/2;
  return [K.box(xs,0,w,h,[SP*0.3,SP*0.3,0,0]),K.box(0,yb,w,yb+tb,[rb,0,0,rb]),K.pg([[0,yb+2],[dd*0.9,yb+2],[xs+6,h],[xs+6-dd,h]]),...K.pin(xs+SP/2,h*0.72,yb+tb+S*0.6)];},W2);
reg('5',K=>{const {w,h,R,rs}=K,{y1,y2}=twoHeads(K);return [K.box(0,0,w,h,[R,R,0,0]),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2)),K.slotH(K.cx,y1,K.sH,1),K.slotH(K.cx,y2,K.sH,-1)];},W2);
const six=K=>{const {w,h,S,R,LEG,hr2,tb}=K,{y2}=twoHeads(K),yb=y2+hr2+K.ta*0.7,yt=h-tb,r=(yt-yb)/2;
  return [stad(K,R,R),K.sub(K.disc(K.cx,y2,hr2)),K.sub(K.box(LEG,yb,w+80,yt,[r,0,0,r]))];};
reg('6',six,W2);
reg('7',K=>{const {w,h,tb2:tb,SP}=K,rb=tb/2;return [K.box(w-SP,0,w,h,[SP*0.3,SP*0.3,0,0]),K.box(0,h-tb,w,h,[rb,0,rb*0.8,rb]),...K.pin(w-SP/2,h-tb-K.rH*0.5,h*0.3)];},W2);
reg('8',K=>{const {R}=K,{y1,y2}=twoHeads(K);return [stad(K,R,R),K.sub(K.disc(K.cx,y1,K.hr2)),K.sub(K.disc(K.cx,y2,K.hr2))];},W2);
reg('9',K=>ROT(six(K),K.w,K.h),W2);
/* ---------- кириллица ---------- */
reg('Б',K=>{const {w,h,tb2:tb,SP,R,hr2}=K,{y2}=twoHeads(K),rr=hr2+K.S,rb=tb/2,rt=rb*0.8;
  return [K.box(0,0,SP,h),K.box(0,h-tb,w,h,[0,rb,rb,rt]),K.box(SP*0.4,1,w,2*rr+1,[0,rr,rr,0]),K.sub(K.disc(w-rr,y2,hr2)),...K.pin(SP/2,h-tb-K.rH*0.5,2*rr+K.S*0.6)];},W2);
reg('Г',K=>{const {w,h,tb2:tb,SP}=K,rb=tb/2,rt=rb*0.8;
  return [K.box(0,0,SP,h),K.box(0,h-tb,w,h,[0,rb,rb,rt]),...K.pin(SP/2,h-tb-K.rH*0.5,h*0.3)];},W2);
reg('Д',K=>{const {w,h,S,R,LEG,rs,tb}=K,i=LEG*0.42,dd=Math.round(h*0.2),wm=w-2*i,Rm=wm/2,rhm=Math.max(6,Rm-S),rsm=Math.max(rhm*0.22,rhm*(1-0.5*cOf(K.p))),t=Math.min(1.25*S,0.17*h);
  return [K.box(i,t-1,w-i,h,[0,0,Rm,Rm]),K.box(1,1,w-1,t,[0,0,0,0]),K.box(0,-dd,LEG*0.8,2),K.box(w-LEG*0.8,-dd,w,2),
    K.sub(K.disc(K.cx,h-S-rhm,rhm)),K.sub(K.box(K.cx-rsm,t+S*0.6,K.cx+rsm,h-S-rhm,[rsm,rsm,0,0]))];},p=>wAof(p)+0.85*legOf(p));
reg('Ж',K=>{const {W,wa,rha,rsa,c1,c2}=duo(K),{h,S}=K,ym=h*0.5,bar=S,rb=K.LEG*0.8,lg=duo(K).LEG;
  return [K.box(0,0,W,h),...K.keyUp(c1,ym+bar/2+rha,rha,rsa,0,false),...K.keyDown(c1,ym-bar/2-rha,rha,rsa,0,false),
    ...K.keyUp(c2,ym+bar/2+rha,rha,rsa,0,false),...K.keyDown(c2,ym-bar/2-rha,rha,rsa,0,false),
    bite(K,-lg*0.25,ym,rb),bite(K,W+lg*0.25,ym,rb)];},W3);
reg('З',Zf,W2);
reg('И',K=>MIRX(Nf(K),K.w),W3);
reg('Й',K=>{const {w,h,S,cx,LEG}=K,bw=LEG*0.8,y0=h+Math.max(36,S*0.5);
  return [...MIRX(Nf(K),w),Object.assign(K.box(cx-bw,y0,cx+bw,y0+bw,[bw,bw,0,0]),{grp:7})];},W3);
reg('Л',K=>{const {w,h,cx,S,rs,LEG,R}=K,i=Math.min(LEG*0.55,Math.max(LEG*0.2,R-1.46*S)),rd=(w-2*i)/2,yt=h-rd,rhd=Math.max(6,rd-S),yh=h-S-rhd,t=LEG*0.9,sl=i/yt,ext=80;
  /* FX2g: Bold/Black — купол не сужается до иглы: наклон плеч i ограничен так, что головка ≥ 0.46 S, а щель у головки ≥ 0.4 S (замочная скважина остаётся); Light/Regular без изменений */
  const xi=y=>Math.min(t+i*y/yt,cx-Math.max(6,rs*0.25,0.2*S-3));
  return [K.pg([[0,0],[w,0],[w-i,yt],[i,yt]]),K.box(i,yt-10,w-i,h,[0,0,rd,rd]),K.sub(K.disc(cx,yh,rhd)),
    K.sub(K.pg([[xi(0)-ext*0.02,-ext],[w-xi(0)+ext*0.02,-ext],[w-xi(yh),yh],[xi(yh),yh]]))];},W2);
reg('П',K=>[K.box(0,0,K.w,K.h),...K.keyDown(K.cx,K.h-K.S-K.rh,K.rh,K.rs,0,false)],W2);
reg('У',Yf,W2);
reg('Ф',K=>{const {w,h,S,cx,LEG}=K,y0=h*0.14,y1=h*0.86,hh=y1-y0,rr=Math.min(w/2,hh/2),ri=Math.max(2,rr-S),r0=LEG*0.5;
  /* стадион-кольцо + сквозная стойка с круглыми концами: две закрытые скважины с концентрической стенкой S */
  return [K.box(0,y0,w,y1,[rr,rr,rr,rr]),K.sub(K.box(S,y0+S,w-S,y1-S,[ri,ri,ri,ri])),K.post(K.box(cx-LEG/2,0,cx+LEG/2,h,[r0,r0,r0,r0]))];},W3);
reg('Ц',K=>{const {w,h,LEG,R}=K,dd=Math.round(h*0.26);/* FX3: tail 0.26 h (= the descender), 2.6 legs wide (ш~щ) */return [K.box(0,0,w,h,[R,R,0,0]),...K.keyUp(K.cx,K.S+K.rh,K.rh,K.rs,0,false),K.box(w-Math.min(LEG*2.6,w*0.62),-dd,w-1,h*0.3)];},W2);
reg('Ч',K=>f4(K,K.h*0.4),W2);
reg('Ш',Shf,W3);
reg('Щ',K=>{const dd=Math.round(K.h*0.26);return [...Shf(K),K.box(K.w-Math.min(K.LEG*2.6,K.w*0.62),-dd,K.w-1,K.h*0.3)];},W3);
reg('Ъ',K=>{const {w,h,tb,LEG,hr2,S}=K,{y2}=twoHeads(K),rr=hr2+S,xs=LEG*1.6;/* FX3: longer flag (ь~ъ) */
  return [K.pg([[0,h],[xs+LEG,h],[xs+LEG,0],[xs,0],[xs,h-tb],[0,h-tb]]),K.box(xs+LEG*0.5,1,w,2*rr+1,[0,rr,rr,0]),K.sub(K.disc(w-rr,y2,hr2))];},p=>wAof(p)+1.6*legOf(p));
reg('Ы',K=>{const {w,h,LEG,S,hr2}=K,rr=hr2+S,xr=w-LEG-S*0.9,{y2}=twoHeads(K);
  return [K.box(0,0,LEG,h),K.box(LEG*0.5,1,xr,2*rr+1,[0,rr,rr,0]),K.sub(K.disc(xr-rr,y2,hr2)),K.box(w-LEG,0,w,h)];},W3);
reg('Ь',K=>{const {w,h,LEG,S,hr2}=K,rr=hr2+S,{y2}=twoHeads(K);return [K.box(0,0,LEG,h),K.box(LEG*0.5,1,w,2*rr+1,[0,rr,rr,0]),K.sub(K.disc(w-rr,y2,hr2))];},W2);
reg('Э',K=>MIRX(Cf(K),K.w),W2);
reg('Ю',K=>{const {w,h,LEG,S}=K,wo=wAof(K.p),x0=w-wo,Do=dimsA(wo,K.p),cxo=x0+wo/2,tj=Math.min(1.25*S,0.17*h);
  return [K.box(0,0,LEG,h),K.box(LEG-2,h*0.5-tj/2,x0+4,h*0.5+tj/2),K.box(x0,0,w,h,[Do.R,Do.R,Do.R,Do.R]),...K.keyDown(cxo,h-S-Do.rh,Do.rh,Do.rs,K.yE,true)];},W3);
reg('Я',K=>MIRX(Rf(K),K.w),W2);
reg('Ё',K=>{const {w,h,LEG,cx,R}=K,dr=LEG*0.42,y=h+Math.max(40,LEG*0.3)+dr;return [...Ef(K),K.disc(cx-R*0.42,y,dr),K.disc(cx+R*0.42,y,dr)];},W2);
/* ---------- знаки ---------- */
const dW=legOf;
const dotR=K=>K.LEG*0.5;
reg('.',K=>[K.disc(K.cx,dotR(K),dotR(K))],dW);
reg(',',K=>{const r=dotR(K);return [K.disc(K.cx,r,r),K.box(K.cx-r*0.46,-r*1.2,K.cx+r*0.46,r)];},dW);
reg(':',K=>{const r=dotR(K);return [K.disc(K.cx,r,r),K.disc(K.cx,K.h*0.5-r*0.4,r)];},dW);
reg(';',K=>{const r=dotR(K);return [K.disc(K.cx,K.h*0.5-r*0.4,r),K.disc(K.cx,r,r),K.box(K.cx-r*0.46,-r*1.2,K.cx+r*0.46,r)];},dW);
reg('!',K=>{const r=dotR(K);return [K.box(K.cx-r,r*3,K.cx+r,K.h),K.disc(K.cx,r,r)];},dW);
reg('?',K=>{const {w,h,R,S,rh,LEG,cx}=K,r=LEG*0.5,cy=h-R,ystem=LEG+S*0.75;
  /* FX2g: край вычитаемого бокса не лежит на левом краю просвета (|LEG/2 − rh| < 8 в Black давало касание: в BlackItalic самопересечение и 2 соринки) — сдвиг на 8 ед. вглубь */
  const xc=cx-LEG/2+(Math.abs(LEG/2-rh)<8?8:0);
  return [K.disc(cx,cy,R-1.5),K.sub(K.disc(cx,cy,rh)),K.sub(K.box(-80,cy-R-80,xc,cy+rh*0.15)),
    K.box(cx-LEG/2,ystem,cx+LEG/2,cy-R*0.55),K.disc(cx,r,r)];},W2);/* FX2g: стойка заходит на 1.5 ед. в вычтенный бокс — нет касательных рёбер (в BlackItalic давали самопересечение и 2 соринки) */
reg("'",K=>[K.box(K.cx-K.LEG*0.4,K.h*0.7,K.cx+K.LEG*0.4,K.h,K.LEG*0.4)],dW);
reg('"',K=>[K.box(0,K.h*0.7,K.LEG*0.8,K.h,K.LEG*0.4),K.box(K.w-K.LEG*0.8,K.h*0.7,K.w,K.h,K.LEG*0.4)],p=>legOf(p)*2.35);
reg('-',K=>[K.box(0,K.h*0.5-K.tb/2,K.w,K.h*0.5+K.tb/2,K.tb/2)],p=>Math.max(1.2*cellOf(p),2.2*p.stem));
reg('–',K=>[K.box(0,K.h*0.5-K.tb/2,K.w,K.h*0.5+K.tb/2,K.tb/2)],p=>Math.max(2.2*cellOf(p),3.4*p.stem));
reg('—',K=>[K.box(0,K.h*0.5-K.tb/2,K.w,K.h*0.5+K.tb/2,K.tb/2)],p=>Math.max(3.6*cellOf(p),4.8*p.stem));
const parenL=K=>{const t=K.h*1.08,b=-K.h*0.08,r=Math.min((t-b)/2,K.w-2),S=K.S;
  return [K.box(0,b,K.w,t,[r,0,0,r]),K.sub(K.box(S,b+S,K.w+80,t-S,[Math.max(2,r-S),0,0,Math.max(2,r-S)]))];};
reg('(',parenL,p=>Math.max(0.9*cellOf(p),2.6*p.stem));
reg(')',K=>MIRX(parenL(K),K.w),p=>Math.max(0.9*cellOf(p),2.6*p.stem));
reg('/',K=>{const {w,h,LEG}=K,r=LEG*0.45;return K.str(r,r,w-r,h-r,r);},W2);
const guil=(K,left)=>{const {S,h}=K,m=h*0.5,t=S*0.9,a=Math.min(h*0.2,S*1.8),dx=t*1.3,r=t*0.33,sk=[];
  for(let i=0;i<2;i++){const x=i*t*2.2;sk.push(...K.str(x+r,m,x+dx+t*0.5,m+a-r,r),...K.str(x+r,m,x+dx+t*0.5,m-a+r,r));}
  return left?sk:MIRX(sk,K.w);};
reg('«',K=>guil(K,true),p=>p.stem*4.6);
reg('»',K=>guil(K,false),p=>p.stem*4.6);
/* типографские знаки: запятая-компонент (головка-диск + прямая ножка) поднимается вверх, поворачивается на 180° и удваивается */
const qMark=(K,x,open,low)=>{const r=dotR(K),L=3.2*r,yt=low?r+r:K.h,yb=yt-L;   /* марка = диск r и ножка 1.2r за его краем */
  return open?[K.disc(x,yb+r,r),K.box(x-r*0.46,yb+r,x+r*0.46,yt)]:[K.disc(x,yt-r,r),K.box(x-r*0.46,yb,x+r*0.46,yt-r)];};
const qW1=p=>legOf(p),qW2=p=>legOf(p)*2.5;
reg('’',K=>qMark(K,K.cx,false,false),qW1);
reg('‘',K=>qMark(K,K.cx,true,false),qW1);
reg('”',K=>{const r=dotR(K);return [...qMark(K,r,false,false),...qMark(K,K.w-r,false,false)];},qW2);
reg('“',K=>{const r=dotR(K);return [...qMark(K,r,true,false),...qMark(K,K.w-r,true,false)];},qW2);
reg('„',K=>{const r=dotR(K);return [...qMark(K,r,false,true),...qMark(K,K.w-r,false,true)];},qW2);
/* … : одна заготовка из трёх точек, шаг 1.2 диаметра — теснее, чем три набранные точки (диаметр + два полуапроша) */
const ELp=K=>dotR(K)*2.4;
reg('…',K=>{const r=dotR(K);return [0,1,2].map(i=>K.disc(r+i*ELp(K),r,r));},p=>{const r=legOf(p)*0.5;return r*2+2*r*2.4;});
/* − : горизонталь знака «+»: ось на середине высоты, толщина дефиса, ширина цифры */
reg('−',K=>[K.box(0,K.h*0.5-K.tb/2,K.w,K.h*0.5+K.tb/2,K.tb/2)],p=>wAof(p));
reg('№',K=>{const {w,h,S,tb}=K,wn=w*0.6,xo=wn+w*0.05,wo=w-xo,ho=h*0.5,Ro=wo/2,rho=Math.max(Ro*0.5,Ro-S*0.8);
  const K2=kit(Object.assign({},K.g,{w:wn}));
  return [...Hbody(K2),K.box(xo,h-ho,w,h-1,[Ro,Ro,Ro,Ro]),K.sub(K.disc(xo+Ro,h-ho/2,rho)),K.box(xo,0,w,tb*0.9)];},W3);
reg('&',K=>{const {w,h,R,S}=K,{y1,y2}=twoHeads(K);
  return [K.box(0,0,w*0.9,h,[R*0.9,R*0.9,R*0.9,R*0.9]),K.sub(K.disc(w*0.45,y1,K.hr2)),K.sub(K.disc(w*0.45,y2,K.hr2)),K.pg([[w*0.5,h*0.55],[w*0.5+S*1.05,h*0.55],[w,S*0.9],[w,0],[w*0.5+S*0.0,0]])];},p=>wAof(p)*1.12);
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
/* ---------- регистр: прописные = строчные (юникейс), совпадающие кириллица и латиница — один знак ---------- */
const G=F.GL;
for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')G[c.toLowerCase()]=G[c];
const TWIN={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X'};
for(const c in TWIN)G[c]=G[TWIN[c]];
for(const c of 'БГДЖЗИЙЛПУФЦЧШЩЪЫЬЭЮЯЁ')G[c.toLowerCase()]=G[c];
for(const c in TWIN)G[c.toLowerCase()]=G[TWIN[c]];
/* ---------- CS68: · • ° © ₽ @ # % * + = \ | — те же модули: диски, стадионы, скважины, полосы с круглыми концами ---------- */
reg('·',K=>[K.disc(K.cx,K.h*0.36,dotR(K))],dW);
reg('•',K=>{const r=dotR(K)*1.5;return [K.disc(K.cx,K.h*0.46,r)];},p=>legOf(p)*2.2);
reg('°',K=>{const r=K.w/2,cy=K.h-r;return [K.disc(K.cx,cy,r),K.sub(K.disc(K.cx,cy,Math.max(3,r-Math.min(K.S*0.8,r*0.55))))];},p=>Math.max(legOf(p)*2.1,0.9*p.stem*2));
reg('+',K=>{const {w,h,tb,cx}=K,a=Math.min(w,h*0.6)/2,ym=h*0.47;return [K.box(cx-a,ym-tb/2,cx+a,ym+tb/2,tb/2),K.box(cx-tb/2,ym-a,cx+tb/2,ym+a,tb/2)];},p=>Math.max(1.5*cellOf(p),3*p.stem));
reg('=',K=>{const {w,tb,h}=K,g=Math.max(1.5*tb,0.13*h),ym=h*0.47;return [K.box(0,ym+g/2,w,ym+g/2+tb,tb/2),K.box(0,ym-g/2-tb,w,ym-g/2,tb/2)];},p=>Math.max(1.4*cellOf(p),2.8*p.stem));
reg('\\',K=>{const {w,h,LEG}=K,r=LEG*0.45;return MIRX(K.str(r,r,w-r,h-r,r),w);},W2);
reg('|',K=>{const r=K.LEG*0.45;return [K.box(K.cx-r,-K.h*0.1,K.cx+r,K.h*0.98,r)];},p=>legOf(p)*1.5);
const ringP=(K,x,y,r,t)=>[K.post(K.disc(x,y,r)),K.post(mkc(ellN(x,y,Math.max(3,r-t),Math.max(3,r-t)),true))];
const arcC=(K,x,y,r,t,ga)=>{const n=40,pts=[],ro=r,ri=Math.max(3,r-t);
  for(let i=0;i<=n;i++){const a=ga+(2*Math.PI-2*ga)*i/n;pts.push([x+ro*Math.cos(a),y+ro*Math.sin(a)]);}
  for(let i=n;i>=0;i--){const a=ga+(2*Math.PI-2*ga)*i/n;pts.push([x+ri*Math.cos(a),y+ri*Math.sin(a)]);}
  const m=(ro+ri)/2;return [K.post(K.pg(pts)),K.post(K.disc(x+m*Math.cos(ga),y+m*Math.sin(ga),t/2)),K.post(K.disc(x+m*Math.cos(-ga),y+m*Math.sin(-ga),t/2))];};
const ringD=(K,x,y,r,t)=>[K.disc(x,y,r),K.sub(K.disc(x,y,Math.max(3,r-t)))];
reg('©',K=>{const {w,h,S,cx}=K,R=Math.min(w,h*0.92)/2,cy=h/2,t=Math.min(Math.max(S*0.8,R*0.12),R*0.3),r=R*0.56,ct=Math.min(Math.max(S*0.6,r*0.2),r*0.4);
  return [...ringD(K,cx,cy,R,t),...arcC(K,cx,cy,r,ct,0.62)];},p=>Math.min(1.3*W2(p),0.92*p.capH));
reg('₽',K=>{const P=F.GL['Р'].shape({...K.g}),{w,h,tb,S}=K;
  /* планка целиком под чашей: зазор-щель (открыта вправо), без наложения на кромку чаши — иначе клин-дырка у стойки и «бугор» на стыке; левый конец спрятан внутри стойки */
  let yMin=1e9;for(const c of P)for(const n of c.nodes)if(n.y>h*0.28&&n.y<h*0.5&&n.y<yMin)yMin=n.y;
  const th=tb*0.82,yt=(yMin<1e9?yMin:h*0.4)-Math.max(14,0.1*tb),y0=yt-th;
  return [...P,K.box(Math.min(S*0.5,K.SP*0.5),y0,w*0.82,yt,th/2)];},p=>F.GL['Р'].w(p));
reg('@',K=>{const {w,h,S,cx}=K,R=Math.min(w/2,h*0.46),cy=h*0.48,t=Math.min(Math.max(S*0.8,R*0.12),R*0.3),r=R*0.5,it=Math.min(Math.max(S*0.6,r*0.25),r*0.42);
  return [...ringD(K,cx,cy,R,t),K.sub(K.box(cx+R*0.3,cy-R*1.1,cx+R*1.2,cy-R*0.15)),...ringP(K,cx-R*0.05,cy,r,it),K.post(K.box(cx+r*0.55,cy-r*0.9,cx+r*0.55+it,cy+r*0.9,it/2))];},p=>1.15*W2(p));
reg('#',K=>{const {w,h,tb,S}=K,v=Math.min(tb,S*1.1,w*0.2),half=Math.min(Math.max(w*0.16,v),(w-v)/2),x1=w/2-half,x2=w/2+half;
  return [K.box(x1-v/2,0,x1+v/2,h,v/2),K.box(x2-v/2,0,x2+v/2,h,v/2),K.box(0,h*0.3-v/2,w,h*0.3+v/2,v/2),K.box(0,h*0.65-v/2,w,h*0.65+v/2,v/2)];},W2);
reg('%',K=>{const {w,h,S,LEG}=K,r=Math.min(w*0.22,h*0.17),t=Math.min(Math.max(S*0.65,r*0.25),r*0.5);
  return [...ringD(K,r+2,h-r,r,t),...ringD(K,w-r-2,r,r,t),...K.str(LEG*0.45,LEG*0.45,w-LEG*0.45,h-LEG*0.45,LEG*0.4)];},W2);
reg('*',K=>{const {w,h,cx,S}=K,L=Math.min(w*0.4,h*0.2),cy=h*0.74,rr=Math.max(S*0.35,6),o=[];
  for(const a of [90,30,150]){const dx=Math.cos(a*Math.PI/180)*L,dy=Math.sin(a*Math.PI/180)*L;o.push(...K.str(cx-dx,cy-dy,cx+dx,cy+dy,rr));}return o;},p=>Math.max(1.3*cellOf(p),2.6*p.stem));
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?"\'-–—()/&№«»‘’“”„…−·•°©₽@#%*+=\\|';
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' '].filter(c=>G[c]);
for(const c of Object.keys(G))if(!F.CHARSET.includes(c))delete G[c];
/* ---------- параметры, пределы, пресеты ---------- */
const M0={wdth:100,capH:720,xh:720,asc:940,desc:173,stem:84,hair:84,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:22,track:0,space:190,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,term:2,tens:1,conn:100};
F.DEFAULTS={regular:{...M0},italic:{...M0,wdth:98,slant:10,icomp:40,space:186}};
const HID=['hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp'];
F.params={wdth:['Ширина ячейки сетки, %',84,130,1],capH:['Высота прописных',640,760,1],stem:['Основной штрих (стенка модуля)',46,126,1],
  tens:['Натяжение дуг',0.9,1.15,0.01],term:['Концевые элементы: 1 раструб · 2 по сетке',1,2,1],conn:['Скважина: щель уже головки, %',0,100,1]};
for(const k of HID)F.params[k]=null;
F.methods=[
  ['Система','Готовые настройки модульной сетки.',[
    ['Модуль',{stem:84,wdth:100,capH:720,conn:100,term:2,tens:1,mono:0,sb:22}],
    ['Скважина',{stem:66,wdth:104,capH:720,conn:100,term:2,tens:1,mono:0,sb:22}],
    ['Плита',{stem:118,wdth:100,capH:700,conn:70,term:1,tens:0.94,mono:0,sb:20}],
    ['Сетка',{stem:84,wdth:100,capH:720,conn:100,term:2,tens:1,sb:22,mono:p=>Math.round(p.capH*0.9*p.wdth/100+2*22+p.track)}]]],
  ['Вес','Стенка кольца.',[['Светлый',{stem:50}],['Обычный',{stem:84}],['Тяжёлый',{stem:106}],['Чёрный',{stem:124}]]],
  ['Срез','Как режутся концы дуг.',[['Раструб',{term:1}],['По сетке',{term:2}]]],
  ['Скважина','Ширина щели относительно головки.',[['Ровная',{conn:0}],['Узкая',{conn:60}],['Замочная',{conn:100}]]],
  ['Дуги','Натяжение дуг.',[['Мягкие',{tens:1.1}],['Круг',{tens:1}],['Тугие',{tens:0.92}]]],
  ['Ширина','Ширина ячейки сетки.',[['Узкий',{wdth:88}],['Обычный',{wdth:100}],['Широкий',{wdth:116}]]],
];
F.sym=false;F.wK=0;F.nodeBudget=0;
F.proof={stemSet:'IПГL',noBar:true,stem:p=>legOf(p)};
/* пределы взаимозависимы: ячейка → стенка (головка не меньше трети ширины, высоты хватает на три стенки и два счётчика) →
   скважина; горизонтали = вертикалям, прописные = строчные, выносные выводятся из размеров */
function modulLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',640,760,720);cl('wdth',84,130,100);
  const wA=0.6*q.capH*q.wdth/100;
  cl('stem',46,Math.min(0.175*q.capH,0.285*wA),84);
  q.hair=q.stem;L.hair=[q.stem,q.stem];
  cl('xh',q.capH,q.capH,q.capH);
  const asc=Math.round(q.capH*1.3);cl('asc',asc,asc,asc);
  const ds=Math.round(q.capH*0.24);cl('desc',ds,ds,ds);
  cl('ov',0,0,0);cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('diag',1,1,1);cl('optic',0,0,0);cl('rough',0,0,0);cl('spur',0,0,0);
  cl('tens',0.9,1.15,1);cl('term',1,2,2);q.term=Math.round(q.term);
  cl('conn',0,100,100);
  if(q.mono>0){let wm=0;for(const c in F.GL){if(c===' ')continue;const w=F.GL[c].w;wm=Math.max(wm,typeof w==='function'?w(q):w);}cl('mono',Math.ceil(wm+2*(q.sb||0)+(q.track||0)),1400,0);}
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='modul')return _pl(p,font);return modulLim(p);};
/* вес: шкала stem/xh: Regular 84/720 ≈ 0.117 → целевое 0.315 */
WSCALE.modul=0.36;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='modul'){const rt={Light:0.07,Regular:0.117,Bold:0.16,Black:0.175}[wn];if(rt)o.stem=Math.round(p.capH*rt);o.hair=o.stem;if(p.wdth!=null)o.wdth=Math.round(p.wdth*(1+0.04*Math.max(0,o.stem/p.stem-1)));return paramLimits(o,'modul').q;}
  return o;};
/* кернинг по классам — общая таблица */
/* FX3: Л is a Λ-shaped glyph here: left class mL gets the A rows (ЛТ ЛУ ЛV … were 0) */
Object.assign(KC_L,{mL:'Л'});F.kernTwin=true;/* FIX-ENGINE: строчные близнецы в классах прописных */
KERN_TABLE.modul=[...KERN_TABLE_BASE,...KERN_TABLE_BASE.filter(r=>r[0]==='A').map(r=>['mL',r[1],r[2]])];
/* моноширинная «Сетка»: advance фиксирован (p.mono), кернинг не применяется */
if(typeof classKernTable==='function'){const _ckt=classKernTable;
  classKernTable=function(st,prof,isLow,fontId){if((fontId||CUR_FONT)==='modul'&&st&&st.p&&st.p.mono>0)return null;return _ckt(st,prof,isLow,fontId);};}
FONTS.modul=F;
})();
