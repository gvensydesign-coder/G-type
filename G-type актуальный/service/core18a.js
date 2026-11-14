/* ===== «Линия» — геометрическая монолинейная гарнитура на движке «скелет + перо» =====
   Все знаки — средние линии (окружности, дуги, прямые), перо круглое/эллиптическое (stem × hair, угол nib).
   Формы — в долях высоты знака K.h, поэтому одна функция рисует и прописную, и капительную строчную (в, г, д, ж …). */
(function(){
const F={id:'liniya',mkCap:232,mkLow:270,mkAbs:945,name:'Линия',family:'Liniya',tag:'Геометрия · монолиния',S0:86,GL:{},
  desc:'Геометрическая гарнитура в одну линию: знаки построены средней линией из дуг и прямых и обведены круглым пером. Гладкие кривые Безье, узлы на экстремумах.',
  sample:'Линия 2026'};
F.pen=p=>skPenOf({kind:'ell'},p);
F.kit=(g,ch)=>skKit(g,F);
const d=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,bw,kind,nst);
/* ---------- общие построения ---------- */
const OV=K=>[K.cx,K.h/2,(K.R-K.L)/2,K.h/2+K.ov-K.hy];
/* раскрытие C/c: угол конца дуги растёт с толщиной пера (и каплей), чтобы концы не смыкались */
const apC=(K,ry,a)=>Math.max(a,Math.asin(Math.min(0.9,(K.hy*1.7+K.h*0.05+(K.p.term===3?K.hx*0.9:K.p.term===2?K.hx*0.45:0)+Math.max(0,K.hx-K.hy)*0.8)/ry))/D2R);          // овал во всю ширину
const oval=K=>{const [cx,cy,rx,ry]=OV(K);return K.ov_(cx,cy,rx,ry);};
/* арка n/h/m: из ствола x0 вверх, полукруг, вниз до линии */
const arch=(K,x0,x1)=>{const yt=K.T+K.ov*0.6,r=(x1-x0)/2,ys=Math.max(K.h*0.3,yt-r);
  return K.pa([[x0,ys,90],[(x0+x1)/2,yt,0],[x1,ys,-90],[x1,0,-90]],'J','H');};
const cup=(K,x0,x1)=>{const yb=K.B-K.ov*0.6,r=(x1-x0)/2,ys=Math.min(K.h*0.7,yb+r);
  return K.pa([[x0,K.h,-90],[x0,ys,-90],[(x0+x1)/2,yb,0],[x1,ys,90]],'H','J');};
/* чаша вправо от ствола x0 между y0 и y1 (средние линии), до xr */
const bowlR=(K,x0,xr,y0,y1)=>{const r=Math.max(K.S*0.4,Math.min((y1-y0)/2,(xr-x0)*0.92,xr-x0-K.S*0.8));
  return K.pa([[x0,y1,0],[xr-r,y1,0],[xr,(y0+y1)/2,-90],[xr-r,y0,180],[x0,y0,180]],'J','J');};
const bowlL=(K,x0,xl,y0,y1)=>{const r=Math.max(K.S*0.4,Math.min((y1-y0)/2,(x0-xl)*0.92,x0-xl-K.S*0.8));
  return K.pa([[x0,y1,180],[xl+r,y1,180],[xl,(y0+y1)/2,-90],[xl+r,y0,0],[x0,y0,0]],'J','J');};
/* точка на отрезке */
const at=(x0,y0,x1,y1,y)=>x0+(x1-x0)*(y-y0)/(y1-y0);
/* S: верхняя чаша уже нижней */
const sS=K=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov,yb=K.B-K.ov,ym=h*0.53,iu=w*0.05;
  const tq=0.2-Math.min(0.08,Math.max(0,Math.max(K.hx,K.hy)-45)/h*0.6);return [K.pa([[R-iu*0.6,h-h*tq],[cx-iu*0.3,yt,180],[L+iu,(yt+ym)/2,-90],[cx,ym,-14],[R,(ym+yb)/2,-90],[cx,yb,180],[L,h*tq]],'T','T')];};
/* З/3: две чаши вправо, язычок в середине */
const sZe=(K,tw)=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov,yb=K.B-K.ov,ym=h*0.54,xm=cx-w*(tw||0.08);
  return [K.pa([[L+w*0.02,h*0.8],[cx-w*0.02,yt,0],[R-w*0.05,(yt+ym)/2,-90],[xm+w*0.08,ym,180],[xm,ym,180]],'T','F'),
    K.pa([[xm,ym,0],[xm+w*0.1,ym,0],[R,(ym+yb)/2,-90],[cx,yb,180],[L,h*0.2]],'F','T')];};
/* ---------- латиница, прописные ---------- */
d('A',K=>{const {w,h}=K,x0=K.hx*1.15,x1=w-K.hx*1.15,top=h-K.hy,yb=h*0.3;
  return [SKB.P([[x0,0],[K.cx,top,null,{c:1,cy:h}],[x1,0]],'H','H'),K.hb(at(x0,0,K.cx,top,yb),at(x1,0,K.cx,top,yb),yb,'J','J')];},680,'cap',1);
d('B',K=>{const {L,R,T,B,h,w}=K,ym=h*0.55;return [K.st(L,0,h),bowlR(K,L,R-w*0.07,ym,T),bowlR(K,L,R,B,ym)];},520,'cap',2);
d('C',K=>{const [cx,cy,rx,ry]=OV(K),a=apC(K,ry,42);return [K.arc(cx,cy,rx,ry,a,360-a)];},640,'cap',2);
d('D',K=>{const {L,R,T,B}=K;return [K.st(L,0,K.h),bowlR(K,L,R,B,T)];},620,'cap',2);
d('E',K=>{const {L,w,T,B,h}=K;return [K.st(L,0,h),K.hb(L,w,T,'F'),K.hb(L,w*0.9,h*0.5,'F'),K.hb(L,w,B,'F')];},440,'cap',1);
d('F',K=>{const {L,w,T,h}=K;return [K.st(L,0,h),K.hb(L,w,T,'F'),K.hb(L,w*0.9,h*0.5,'F')];},420,'cap',1);
d('G',K=>{const [cx,cy,rx,ry]=OV(K);return [SKB.st(skCat(skArcN(cx,cy,rx,ry,Math.max(42,Math.asin(Math.min(0.9,(K.hy*2.4+K.h*0.07+(K.p.term===3?K.hx*0.9:K.p.term===2?K.hx*0.5:0)+Math.max(0,K.hx-K.hy)*1.0)/ry))/D2R),360,K.tens),skLn(K.R,cy,cx+rx*0.04,cy)),'T','V')];},680,'cap',2);
d('H',K=>{const {L,R,h}=K;return [K.st(L,0,h),K.st(R,0,h),K.hb(L,R,h*0.515,'F','F')];},580,'cap',2);
d('I',K=>[K.st(K.cx,0,K.h)],p=>Math.max(p.stem,p.hair*1.05),'cap',1);
d('J',K=>{const {L,R,h}=K,rx=(R-L)/2,ry=Math.min(h*0.3,rx*1.1),cy=K.B-K.ov+ry;
  return [SKB.st(skCat(skLn(R,h,R,cy),skArcN(R-rx,cy,rx,ry,0,-168,K.tens)),'H','T')];},400,'cap',1);
d('K',K=>{const {L,w,h}=K,xa=w-K.hx*1.2,ya=h*0.36,t=0.5,xj=xa+(L-xa)*t,yj=h+(ya-h)*t;
  return [K.st(L,0,h),K.ln(xa,h,L,ya,'H','J'),K.ln(xj,yj,w-K.hx*1.15,0,'J','H')];},570,'cap',2);
d('L',K=>{const {L,w,B,h}=K;return [K.st(L,0,h),K.hb(L,w,B,'F')];},410,'cap',1);
d('M',K=>{const {L,R,T,B,h,cx}=K;return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[cx,B,null,{c:1,cy:0}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];},760,'cap',3);
d('N',K=>{const {L,R,T,B,h}=K;return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[R,B,null,{c:1,cy:0}],[R,h]],'H','H')];},610,'cap',2);
d('O',K=>[oval(K)],720,'cap',2);
d('P',K=>{const {L,R,T,h,w}=K;return [K.st(L,0,h),bowlR(K,L,R,h*0.42,T)];},500,'cap',2);
d('Q',K=>{const [cx,cy,rx,ry]=OV(K);return [oval(K),K.ln(cx+rx*0.22,K.h*0.24,K.w-K.hx*0.6,-K.h*0.02,'F','F')];},720,'cap',2);
d('R',K=>{const {L,R,T,h,w}=K,yb=h*0.44,xj=L+(R-L)*0.42;return [K.st(L,0,h),bowlR(K,L,R-w*0.02,yb,T),K.ln(xj,yb,w-K.hx*1.15,0,'J','H')];},530,'cap',2);
d('S',K=>sS(K),460,'cap',2);
d('T',K=>{const {w,T,h,cx}=K;return [K.hb(0,w,T),K.st(cx,0,T,'H','J')];},540,'cap',1);
d('U',K=>{const yb=K.B-K.ov*0.6,r=(K.R-K.L)/2,ys=Math.min(K.h*0.7,yb+r);return [K.pa([[K.L,K.h,-90],[K.L,ys,-90],[(K.L+K.R)/2,yb,0],[K.R,ys,90],[K.R,K.h,90]],'H','H')];},580,'cap',2);
d('V',K=>{const {w,h,B,cx}=K;return [SKB.P([[K.hx*1.15,h],[cx,B,null,{c:1,cy:0}],[w-K.hx*1.15,h]],'H','H')];},650,'cap',1);
d('W',K=>{const {w,h,B,T,cx}=K,x0=K.hx*1.15,x4=w-K.hx*1.15;return [SKB.P([[x0,h],[w*0.25,B,null,{c:1,cy:0}],[cx,T,null,{c:1,cy:h}],[w*0.75,B,null,{c:1,cy:0}],[x4,h]],'H','H')];},960,'cap',2);
d('X',K=>{const {w,h}=K,a=K.hx*1.15;return [K.ln(a,h,w-a,0),K.ln(w-a,h,a,0)];},610,'cap',1);
d('Y',K=>{const {w,h,cx}=K,a=K.hx*1.6,yj=h*0.46;return [K.ln(a,h,cx,yj,'H','J'),K.ln(w-a,h,cx,yj,'H','J'),K.st(cx,yj,0,'J','H')];},620,'cap',1);
d('Z',K=>{const {w,T,B,h}=K,a=K.hx*1.3;return [SKB.P([[0,T],[w-a,T,null,{c:1}],[a,B,null,{c:1}],[w,B]],'V','V')];},540,'cap',1);
/* ---------- латиница, строчные ---------- */
d('a',K=>[oval(K),K.st(K.R,0,K.h)],540,'xh',2);
d('b',K=>[K.st(K.L,0,K.asc),oval(K)],540,'xh',2);
d('c',K=>{const [cx,cy,rx,ry]=OV(K),a=apC(K,ry,44);return [K.arc(cx,cy,rx,ry,a,360-a)];},480,'xh',2);
d('d',K=>[K.st(K.R,0,K.asc),oval(K)],540,'xh',2);
/* раскрытие e/э: конец дуги не ближе толщины пера (с каплей — больше) к перекладине */
const apE=(K,ry)=>{const T=K.hy*2+(K.p.term===3?K.hx*0.9:K.p.term===2?K.hx*0.4:0)+K.h*0.1+Math.max(0,K.hx-K.hy)*0.35;return Math.asin(Math.min(0.97,(T+K.hy)/ry))/D2R;};
d('e',K=>{const [cx,cy,rx,ry]=OV(K);return [SKB.st(skCat(skLn(K.L,cy,K.R,cy),skArcN(cx,cy,rx,ry,0,360-Math.max(38,apE(K,ry)),K.tens)),'J','T')];},520,'xh',2);
d('f',K=>{const {w,h}=K,xs=K.hx+w*0.14,r=(w-K.hx-xs)*0.62,ya=K.asc-K.hy-r;
  return [SKB.st(skCat(skLn(xs,0,xs,ya),skArcN(xs+r,ya,r,r,180,(()=>{const Tt=Math.max(K.S,K.H),sn=(K.h+Tt*1.15-ya)/r;return sn>=0.98?80:Math.max(48,Math.asin(Math.max(-1,sn))/D2R);})(),K.tens)),'H','T'),K.hb(0,w*0.86,K.T)];},290,'xh',1);
d('g',K=>{const {L,R,h,cx}=K,rx=(R-L)/2,ry=K.desc*0.36,cy=-K.desc+K.hy+ry;
  return [oval(K),SKB.st(skCat(skLn(R,h,R,cy),skArcN(cx,cy,rx,ry,0,-158,K.tens)),'H','T')];},540,'xh',2);
d('h',K=>[K.st(K.L,0,K.asc),arch(K,K.L,K.R)],470,'xh',2);
const iW=p=>Math.max(p.stem,p.hair)*1.24;
const iDot=K=>{const r=K.dr();return K.dot(K.cx,Math.min(K.h+Math.max(K.S*0.55,K.capH*0.07)+r,K.asc-r),r);};
d('i',K=>[K.st(K.cx,0,K.h),iDot(K)],iW,'xh',1);
d('ı',K=>[K.st(K.cx,0,K.h)],iW,'xh',1);
/* j: ствол и поля как у i, хвост уходит под предыдущую букву (отрицательное левое поле только ниже базовой линии) */
d('j',K=>{const {h}=K,x=K.cx,r=Math.max(K.S*1.15,K.capH*0.15),ry=K.desc*0.42,cy=-K.desc+K.hy+ry;
  return [SKB.st(skCat(skLn(x,h,x,cy),skArcN(x-r,cy,r,ry,0,-150,K.tens)),'H','T'),iDot(K)];},iW,'xh',1);
d('k',K=>{const {L,w,h}=K,xa=w-K.hx*1.2,ya=h*0.28,t=0.48,xj=xa+(L-xa)*t,yj=h+(ya-h)*t;
  return [K.st(L,0,K.asc),K.ln(xa,h,L,ya,'H','J'),K.ln(xj,yj,w-K.hx*1.15,0,'J','H')];},450,'xh',2);
/* l с хвостиком вправо: отличается от I на малых кеглях (FX2) */
const lTail=p=>Math.max(p.stem,p.hair*1.05)*0.5;
d('l',K=>{const r=Math.min(K.w*0.4,K.hx*1.7+30),x=K.L;return [K.pa([[x,K.asc,-90],[x,K.B+r,-90],[x+r,K.B,0],[K.w-K.hx*0.6,K.B,0]],'H','V')];},p=>Math.max(p.stem,p.hair*1.05)+Math.max(p.stem,p.hair)*0.5+100,'xh',1);
d('m',K=>{const {L,R,h}=K,xm=(L+R)/2;return [K.st(L,0,h),arch(K,L,xm),arch(K,xm,R)];},720,'xh',3);
d('n',K=>[K.st(K.L,0,K.h),arch(K,K.L,K.R)],470,'xh',2);
d('o',K=>[oval(K)],530,'xh',2);
d('p',K=>[K.st(K.L,K.h,-K.desc),oval(K)],540,'xh',2);
d('q',K=>[K.st(K.R,K.h,-K.desc),oval(K)],540,'xh',2);
d('r',K=>{const {L,w,h}=K,r=(w-K.hx-L)*0.66,yt=K.T+K.ov*0.6,cy=yt-r;return [K.st(L,0,h),K.arc(L+r,cy,r,r,180,42,'J','T')];},300,'xh',1);
d('s',K=>sS(K),380,'xh',2);
d('t',K=>{const {w,h}=K,xs=w*0.44;return [K.st(xs,0,h+(K.asc-h)*0.55),K.hb(0,w,K.T)];},290,'xh',1);
d('u',K=>[cup(K,K.L,K.R),K.st(K.R,K.h,0)],470,'xh',2);
d('v',K=>F.GL['V'].skel(K.g),490,'xh',1);
d('w',K=>F.GL['W'].skel(K.g),760,'xh',2);
d('x',K=>F.GL['X'].skel(K.g),480,'xh',1);
d('y',K=>{const {w,h}=K,a=K.hx*1.15,x1=w-a,xe=w*0.3,ye=-K.desc,yj=K.hy;const xj=at(x1,h,xe,ye,yj);
  return [K.ln(a,h,xj,yj,'H','J'),K.ln(x1,h,xe,ye,'H','H')];},490,'xh',1);
d('z',K=>F.GL['Z'].skel(K.g),430,'xh',1);
/* ---------- кириллица (формы от K.h — общие для прописных и строчных) ---------- */
const Be=K=>{const {L,R,T,B,h,w}=K,ym=h*0.56;return [K.st(L,0,h),K.hb(L,w*0.88,T,'F'),bowlR(K,L,R,B,ym)];};
const Ge=K=>[K.st(K.L,0,K.h),K.hb(K.L,K.w*0.98,K.T,'F')];
const De=K=>{const {L,R,w,h,T,B}=K,dd=Math.max(K.desc*0.55,K.S*1.4),x1=w*0.3,xb=L+w*0.06;
  return [SKB.P([[xb,B],[x1,T,null,{c:1,cy:h}],[R,T]],'J','J'),K.st(R,h,-dd,'H','H'),K.hb(L,R,B,'J','J'),K.st(L,B,-dd,'J','H')];};
const Zhe=K=>{const {w,h,cx}=K,xa=w-K.hx*1.2,ym=h*0.5,xs=cx+K.S*0.1;
  const r=[K.ln(xa,h,xs,ym,'H','J'),K.ln(xs,ym,w-K.hx*1.15,0,'J','H')];return [K.st(cx,0,h),...r,...skMirX(r,w)];};
const Ii=K=>{const {L,R,T,B,h}=K;return [SKB.P([[L,h],[L,B,null,{c:1,cy:0}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];};
const El=K=>{const {L,R,T,h,w}=K,x1=w*0.34;return [SKB.P([[K.hx*1.15,0],[x1,T,null,{c:1,cy:h}],[R,T,null,{c:1}],[R,0]],'H','H')];};
const Pe=K=>{const {L,R,T,h}=K;return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];};
const Te=K=>{const {w,T,cx}=K;return [K.hb(0,w,T),K.st(cx,0,T,'H','J')];};
const Ef=K=>{const {L,R,h,cx}=K;return [K.st(cx,0,h),K.ov_(cx,h*0.52,(R-L)/2,h*0.3-K.hy*0.5)];};
const Tse=K=>{const {L,w,h,B}=K,dd=Math.max(K.desc*0.5,K.S*1.4),R1=w-K.hx-K.S*1.05;
  return [K.st(L,h,B,'H','J'),K.st(R1,h,B,'H','J'),K.hb(L,w,B,'J','V'),K.st(w-K.hx,B,-dd,'J','H')];};
const Che=K=>{const {L,R,h}=K,yc=h*0.42,r=Math.min((R-L)*0.45,h*0.25);
  return [K.pa([[L,h,-90],[L,yc+r,-90],[L+r,yc,0],[R,yc,0]],'H','J'),K.st(R,h,0)];};
const Sha=K=>{const {L,R,h,B,cx}=K;return [SKB.P([[L,h],[L,B,null,{c:1,cy:0}],[R,B,null,{c:1,cy:0}],[R,h]],'H','H'),K.st(cx,h,B,'H','J')];};
const Shcha=K=>{const {L,w,h,B}=K,dd=Math.max(K.desc*0.5,K.S*1.4),R1=w-K.hx-K.S*1.05,xm=(L+R1)/2;
  return [K.st(L,h,B,'H','J'),K.st(xm,h,B,'H','J'),K.st(R1,h,B,'H','J'),K.hb(L,w,B,'J','V'),K.st(w-K.hx,B,-dd,'J','H')];};
const Soft=K=>{const {L,R,B,h}=K;return [K.st(L,0,h),bowlR(K,L,R,B,h*0.56)];};
const Hard=K=>{const {w,h,B,T}=K,xs=w*0.36;return [K.hb(0,xs,T,'V','J'),K.st(xs,0,h),bowlR(K,xs,K.R,B,h*0.56)];};
const Yeru=K=>{const {L,w,h,B}=K,wr=w-K.hx;return [K.st(L,0,h),bowlR(K,L,w*0.66,B,h*0.56),K.st(wr,0,h)];};
const Ee=K=>{const [cx,cy,rx,ry]=OV(K),a=180-Math.max(42,apE(K,ry)*0.85+12);return [K.arc(cx,cy,rx,ry,a,-a),K.hb(K.w*0.3,K.R,cy,'F','J')];};
const Yu=K=>{const {L,R,w,h}=K,xo0=L+K.S*1.5+w*0.06,ocx=(xo0+R)/2,rx=(R-xo0)/2;
  return [K.st(L,0,h),K.hb(L,xo0,h/2,'J','J'),K.ov_(ocx,h/2,rx,h/2+K.ov-K.hy)];};
const Ya=K=>{const {L,R,T,h,w}=K,yb=h*0.44,xj=R-(R-L)*0.42;return [K.st(R,0,h),bowlL(K,R,L+w*0.02,yb,T),K.ln(xj,yb,K.hx*1.15,0,'J','H')];};
const Ye=K=>{const [cx,cy,rx,ry]=OV(K),a=apC(K,ry/1.6,42);return [K.arc(cx,cy,rx,ry,a,360-a),K.hb(K.L,K.w*0.62,cy,'J','F')];};
const Ghe=K=>{const up=K.capH*0.16;return [K.st(K.L,0,K.h),K.hb(K.L,K.R,K.T,'F','J'),K.st(K.R,K.T,K.h+up,'J','H')];};
d('Б',Be,500,'cap',2);d('Г',Ge,410,'cap',1);d('Д',De,620,'cap',2);d('Ж',Zhe,840,'cap',2);d('З',K=>sZe(K),490,'cap',2);
d('И',Ii,610,'cap',2);d('Л',El,580,'cap',2);d('П',Pe,590,'cap',2);d('У',K=>{const {w,h}=K,a=K.hx*1.15,x1=w-a,xe=w*0.24,yj=h*0.36;
  return [K.ln(x1,h,xe,0,'H','H'),K.ln(a,h,at(x1,h,xe,0,yj),yj,'H','J')];},600,'cap',1);
d('Ф',Ef,760,'cap',2);d('Ц',Tse,640,'cap',2);d('Ч',Che,540,'cap',2);d('Ш',Sha,830,'cap',3);d('Щ',Shcha,900,'cap',3);
d('Ъ',Hard,620,'cap',2);d('Ы',Yeru,760,'cap',3);d('Ь',Soft,490,'cap',2);d('Э',Ee,640,'cap',2);d('Ю',Yu,920,'cap',3);d('Я',Ya,530,'cap',2);
d('Є',Ye,640,'cap',2);d('Ґ',Ghe,420,'cap',1);
/* строчные: те же формы на высоте x */
d('б',K=>{const {L,R,h,cx}=K,r=Math.min(K.asc-K.hy-h*0.92,(R-L)*0.5);return [oval(K),K.pa([[L,h*0.5,90],[L,K.asc-K.hy-r,90],[L+r,K.asc-K.hy,0],[R,K.asc-K.hy,0]],'J','V')];},530,'xh',2);
d('в',K=>F.GL['B'].skel(K.g),440,'xh',2);d('г',Ge,340,'xh',1);d('д',De,520,'xh',2);d('ж',Zhe,700,'xh',2);d('з',K=>sZe(K),410,'xh',2);
d('и',Ii,470,'xh',2);d('к',K=>F.GL['K'].skel(K.g),440,'xh',2);d('л',El,460,'xh',2);d('м',K=>F.GL['M'].skel(K.g),580,'xh',3);
d('н',K=>F.GL['H'].skel(K.g),470,'xh',2);d('п',Pe,470,'xh',2);d('т',Te,440,'xh',1);
d('ф',K=>{const {L,R,h,cx}=K;return [K.st(cx,K.asc,-K.desc),K.ov_(cx,h/2,(R-L)/2,h/2+K.ov-K.hy)];},700,'xh',2);
d('ц',Tse,500,'xh',2);d('ч',Che,430,'xh',2);d('ш',Sha,680,'xh',3);d('щ',Shcha,740,'xh',3);d('ъ',Hard,510,'xh',2);d('ы',Yeru,620,'xh',3);
d('ь',Soft,410,'xh',2);d('э',Ee,480,'xh',2);d('ю',Yu,720,'xh',3);d('я',Ya,440,'xh',2);d('є',Ye,480,'xh',2);d('ґ',Ghe,340,'xh',1);
/* ---------- цифры ---------- */
const dg=(ch,fn,bw)=>d(ch,fn,bw,'cap',2);
dg('0',K=>[oval(K)],520);
dg('1',K=>{const {w,h,T}=K,xs=w-K.hx*1.2;return [SKB.P([[K.hx*0.9,h*0.78],[xs,T,null,{c:1,cy:h}],[xs,0]],'T','H')];},300);
dg('2',K=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov;return [K.pa([[L+w*0.02,h*0.72],[cx,yt,0],[R-w*0.02,h*0.7,-90],[R-w*0.24,h*0.38,-135],[L+K.hx*0.6,K.B,null,{c:1,di:-135}],[w,K.B]],'T','V')];},500);
dg('3',K=>sZe(K,0.02),490);
dg('4',K=>{const {w,h}=K,xs=w-K.hx-w*0.14,yb=h*0.3;return [SKB.P([[xs,0],[xs,K.T,null,{c:1,cy:h}],[K.hx*2.4,yb,null,{c:1}],[w,yb]],'H','V')];},560);
dg('5',K=>{const {L,R,w,h,cx}=K,yb=K.B-K.ov,ym=h*0.6;
  return [K.pa([[w*0.9,K.T],[L+w*0.08,K.T,null,{c:1,cy:h}],[L+w*0.02,h*0.5,null,{c:1,di:-95,j:K.hx>55?'bevel':undefined}],[cx,ym,0],[R,(ym+yb)/2,-90],[cx,yb,180],[L+Math.max(0,K.hx-40)*0.6,Math.min(h*0.16,h*0.46-K.hy*3)]],'V','T')];},500);
dg('6',K=>{const {L,R,h,cx}=K,ry=h*0.31,cy=K.B-K.ov+ry,rx=(R-L)/2;return [K.ov_(cx,cy,rx,ry),K.pa([[L,cy,90],[cx-rx*0.15,h*0.8],[R-rx*0.25,K.T+K.ov*0.5]],'J','T')];},510);
dg('7',K=>{const {w,h,T}=K;return [SKB.P([[0,T],[w-K.hx*1.2,T,null,{c:1}],[w*0.3,0]],'V','H')];},480);
dg('8',K=>{const {L,R,h,cx}=K,ys=h*0.555,yb=K.B-K.ov,yt=K.T+K.ov,rx=(R-L)/2,rx2=rx*0.86;
  return [K.ov_(cx,(yb+ys)/2,rx,(ys-yb)/2),K.ov_(cx,(ys+yt)/2,rx2,(yt-ys)/2)];},520);
dg('9',K=>{const {L,R,h,cx}=K,ry=h*0.31,cy=K.T+K.ov-ry,rx=(R-L)/2;return [K.ov_(cx,cy,rx,ry),K.pa([[R,cy,-90],[cx+rx*0.15,h*0.2],[L+rx*0.25,K.B-K.ov*0.5]],'J','T')];},510);
/* ---------- особые знаки для расширенного набора ---------- */
F.mkGap=0.12;
F.ogX=b=>K=>b==='A'?K.w-K.hx*2.6:K.R-K.hx*0.3;
F.eszett=()=>d('ß',K=>{const {L,R,h,w}=K,yt=K.asc-K.hy,ym=h*0.62;
  return [K.st(L,0,yt-w*0.25,'H','J'),K.pa([[L,yt-w*0.25,90],[L+w*0.3,yt,0],[R-w*0.08,(yt+ym)/2,-90],[L+w*0.42,ym,180]],'J','J'),
    K.pa([[L+w*0.42,ym,0],[R,ym*0.5,-90],[L+w*0.45,K.B,180],[L+w*0.28,K.B,180]],'J','T')];},520,'xh',2);
F.descR=(K,b)=>{const dd=Math.max(K.desc*0.5,K.S*1.4);return b==='К'||b==='к'?[K.st(K.w-K.hx,K.hy*2,-dd,'J','H')]:[K.st(K.R,K.hy*2,-dd,'J','H')];};
F.ueLow=()=>d('ү',K=>{const {w,h,cx}=K,a=K.hx*1.15;return [SKB.P([[a,h],[cx,K.B,null,{c:1}],[w-a,h]],'H','H'),K.st(cx,K.B*2,-K.desc,'J','H')];},490,'xh',1);
F.dzhe=()=>{const dz=K=>{const {L,R,h,B,cx}=K,dd=Math.max(K.desc*0.5,K.S*1.4);return [SKB.P([[L,h],[L,B,null,{c:1,cy:0}],[R,B,null,{c:1,cy:0}],[R,h]],'H','H'),K.st(cx,B,-dd,'J','H')];};
  d('Џ',dz,590,'cap',2);d('џ',dz,470,'xh',2);};
F.shha=()=>{d('Һ',K=>[K.st(K.L,0,K.h),Object.assign(arch(Object.assign({},K,{T:K.h*0.62,h:K.h*0.62+K.hy}),K.L,K.R))],590,'cap',2);F.GL['һ']=F.GL['h'];};
F.tshe=()=>{const G=F.GL;
  d('Ћ',K=>{const {w,h}=K,xs=w*0.24;return [K.hb(0,w*0.62,K.T),K.st(xs,0,K.T,'H','J'),arch(Object.assign({},K,{T:h*0.6,h:h*0.6+K.hy}),xs,K.R)];},620,'cap',2);
  d('Ђ',K=>{const {w,h}=K,xs=w*0.24,r=(K.R-xs)/2,yt=h*0.6,ys=yt-r;return [K.hb(0,w*0.62,K.T),K.st(xs,0,K.T,'H','J'),
    K.pa([[xs,ys,90],[(xs+K.R)/2,yt,0],[K.R,ys,-90],[K.R,ys*0.5,-90],[K.R-r,-K.desc*0.45,180]],'J','T')];},620,'cap',2);
  d('ћ',K=>{const {L,R,h,asc}=K;return [K.st(L,0,asc),K.hb(0,L+K.S*1.9,h+(asc-h)*0.5),arch(K,L,R)];},480,'xh',2);
  d('ђ',K=>{const {L,R,h,asc}=K,r=(R-L)/2,yt=K.T+K.ov*0.6,ys=yt-r;return [K.st(L,0,asc),K.hb(0,L+K.S*1.9,h+(asc-h)*0.5),
    K.pa([[L,ys,90],[(L+R)/2,yt,0],[R,ys,-90],[R,0,-90],[R-r*0.9,-K.desc*0.5,180]],'J','T')];},480,'xh',2);};
F.njFix=()=>{};
F.aeOv=1;F.aeOv2=1;
F.barD=(K,cap)=>cap?[K.hb(0,K.S*2.6,K.h*0.5,'V','V')]:[K.hb(K.R-K.S*1.8,K.R+K.hx,K.h+(K.asc-K.h)*0.5,'V','V')];
/* Ł ł: косая через ствол */
F.slashL=null;
d('Ł',K=>{const {L,w,B,h}=K,xs=K.S*1.1+K.hx;return [K.st(xs,0,h),K.hb(xs,w,B,'F'),K.ln(xs-K.S*1.1,h*0.32,xs+K.S*1.1,h*0.56,'F','F')];},480,'cap',1);
d('ł',K=>{const {w,h}=K,xs=w/2;return [K.st(xs,0,K.asc),K.ln(0+K.hx*0.3,h*0.5,w-K.hx*0.3,h*0.82,'F','F')];},p=>p.stem*3.1,'xh',1);
/* Й й — бреве */
F.after=()=>{skCompose(F,'Й','И',['breve']);skCompose(F,'й','и',['breve']);skCompose(F,'Ё','E',['dier']);skCompose(F,'ё','e',['dier']);
  skCompose(F,'Ї','I',['dier']);skCompose(F,'ї','ı',['dier']);};
/* знаки */
skPunct(F);
F.after();
/* ---------- регистрация ---------- */
const L0={wdth:100,capH:700,xh:490,asc:740,desc:220,stem:86,hair:80,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:10,slant:0,sb:44,track:0,space:330,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,term:1,tens:1,conn:0};
F.DEFAULTS={regular:{...L0},italic:{...L0,wdth:97,stem:84,hair:78,slant:10,icomp:40,space:322}};
F.params={stem:['Основной штрих (перо)',50,170,1],hair:['Горизонтали (перо)',30,170,1],nib:['Угол пера, °',-30,60,1],
  term:['Концевые элементы: круг · плоск. · срез · капля',0,3,1],tens:['Натяжение кривых',0.8,1.3,0.01],
  diag:null,optic:null,round:null,kappa:null,innerR:null,rough:null,spur:null,aper:null,bar:null,mv:null,trap:null,join:null,stemScale:null,press:null,conn:null};
F.methods=[
  ['Перо','Форма пера: круглое (монолиния), слегка контрастное или широкое под углом.',[['Монолиния',{hair:p=>p.stem,nib:0}],['Оптика',{hair:p=>Math.round(p.stem*0.93),nib:0}],['Широкое 30°',{hair:p=>Math.round(p.stem*0.42),nib:30}],['Широкое 40°',{hair:p=>Math.round(p.stem*0.42),nib:40}]]],
  ['Вес','Толщина пера.',[['Светлый',{stem:58,hair:54}],['Обычный',{stem:86,hair:80}],['Полужирный',{stem:118,hair:110}],['Чёрный',{stem:150,hair:140}]]],
  ['Окончания','Форма концов штрихов.',[['Круглые',{term:0}],['Плоские',{term:1}],['Срезанные',{term:2}],['Капля',{term:3}]]],
  ['Кривые','Натяжение скелета: от мягкого к «суперэллипсу».',[['Мягкие',{tens:1.12}],['Круг',{tens:1}],['Тугие',{tens:0.9}]]],
  ['Пропорции','Соотношение высот.',[['Геометрия',{capH:700,xh:490,asc:740,desc:220}],['Высокий x',{capH:700,xh:560,asc:730,desc:200}],['Длинные выносные',{capH:700,xh:460,asc:800,desc:250}]]],
  ['Ширина','Общая ширина знаков.',[['Узкий',{wdth:86}],['Обычный',{wdth:100}],['Широкий',{wdth:116}]]],
];
F.sym=false;
F.wK=0.55;F.nodeBudget=25;
/* Сверка: у b чаша Линии вливается в ствол по всей высоте (геометрический круг) — его ствол не мерится */
F.proof={stemSet:'HILEFTПШЩЦНЕГЬЫЪБДhilnпшщцньыъгт',tailL:'jјĵǰ'};/* насыщенные начертания: знак раздвигается лишь на часть прироста пера, просветы сужаются умеренно */
F.lim={capH:[640,740],xhR:[0.64,0.8],ascA:[20,120],desc:[180,260],wdth:[85,125],ov:[4,16],stem:[56,150],stemK:0.3,stemWK:1.35,hairR:[0.4,1.05],hairX:0.24,nibX:0.2,ascX:1.5,descX:1.2,nib:[-20,45],term:[0,3],tens:[0.9,1.15]};
for(const k of ['capH','desc','wdth','ov','stem'])F.params[k]=[(PARAMS.find(r=>r[0]===k)||[])[1]||k,F.lim[k][0],F.lim[k][1],1];
F.params.stem[0]='Основной штрих (перо)';F.params.xh=['Высота строчных',F.lim.capH[0]*F.lim.xhR[0],F.lim.capH[1]*F.lim.xhR[1],1];
F.params.asc=['Верхние выносные',F.lim.capH[0]+F.lim.ascA[0],F.lim.capH[1]+F.lim.ascA[1],1];F.params.hair=['Горизонтали (перо)',28,F.lim.stem[1]*1.05,1];
F.params.tens=['Натяжение кривых',0.9,1.15,0.01];F.params.nib=['Угол пера, °',-20,45,1];
skRegister(F);
})();
