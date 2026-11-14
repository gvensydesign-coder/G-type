/* ===== «Ротунда» (Rotunda Libros) — книжная ротунда на движке «скелет + перо» =====
   Порядок работы (type-design-foundation): метрики и перо → ключевые знаки o n d → семейства знаков (чаши, арки, диагонали,
   прописные-версали, кириллица, цифры, знаки) → поля и кернинг → лишь затем особые формы (ss01: круглая r и длинная s).
   Перо: широкий эллипс stem × hair под постоянным углом nib; контраст даёт перо, а не нарисованные утолщения.
   Окончания: стволы — плоский срез по горизонтали (H), свободные концы дуг — срез вдоль кромки пера (K.nc),
   точки — ромб (штрих поперёк кромки). Круги — окружности (κ=0.5523), просветы чаш заострены самим пером.
   Набор basic: a–z A–Z А–Я Ёё 0–9 . , : ; ! ? « » " ' - – — ( ) / & № и пробел. */
(function(){
const F={id:'rotunda',hFix:1,name:'Ротунда',family:'Rotunda Libros',tag:'Книжный · широкое перо · ротунда',S0:100,GL:{},charset:'basic',
  desc:'Книжная ротунда: широкое перо под постоянным углом, круглые чаши с заострёнными просветами, плоские срезы стволов, ромбовидные точки. Латиница, кириллица, цифры.',
  sample:'Letra de Pancilla para Libros'};
F.pen=p=>skPenOf({kind:'ell'},p);
F.kit=(g,ch)=>{const K=skKit(g,F);const a=(K.p.nib||0)*D2R;K.na=a;K.nc='V';K.nb={cut:[Math.cos(a),Math.sin(a)]};K.stc=['R','H',K.nb,{cut:[Math.cos(a*0.5),Math.sin(a*0.5)]}][Math.max(0,Math.min(3,Math.round(K.p.term==null?1:K.p.term)))];
  /* ромб: короткий штрих поперёк кромки пера, концы срезаны вдоль кромки */
  K.dia=(x,y,r)=>{const u=[-Math.sin(a),Math.cos(a)];const L=Math.max(K.S*0.36,r*0.5);return SKB.L(x-u[0]*L,y-u[1]*L,x+u[0]*L,y+u[1]*L,'F','F');};
  K.dr=()=>Math.max(K.S,K.H)*0.62;return K;};
/* срез стволов (параметр term): 0 круг · 1 плоский по горизонтали · 2 скос вдоль кромки пера · 3 полускос; меняет только концы, лежащие на крутых штрихах */
const steep=(a,b)=>Math.abs(b.y-a.y)>Math.abs(b.x-a.x)*1.7;
const stemCuts=(sk,K)=>{const tm=Math.max(0,Math.min(3,Math.round(K.p.term==null?1:K.p.term)));
  /* скос по кромке: угловая точка среза ложится на линию (база, x-высота...), поэтому конец сдвигается внутрь на половину ширины·tg угла среза */
  const dl=tm===2?Math.tan(K.na):tm===3?Math.tan(K.na*0.5):0,wst=Math.hypot(K.S*Math.cos(K.na),K.H*Math.sin(K.na)),sh=wst/2*dl;
  const mv=(n,dy)=>{const m=Object.assign({},n);m.y+=dy;if(n.a)m.a={x:n.a.x,y:n.a.y+dy};if(n.b)m.b={x:n.b.x,y:n.b.y+dy};return m;};
  return sk.map(st=>{if(st.dot||!st.nodes||st.nodes.length<2)return st;const ns=st.nodes.slice(),n=ns.length;
  const q0=ns[0].b||ns[1].a||ns[1],q1=ns[n-1].a||ns[n-2].b||ns[n-2];
  const s0=st.cap0==='H'&&steep(ns[0],q0),s1=st.cap1==='H'&&steep(ns[n-1],q1);
  if(!s0&&!s1)return st;
  if(s0&&sh)ns[0]=mv(ns[0],q0.y>ns[0].y?sh:-sh);
  if(s1&&sh)ns[n-1]=mv(ns[n-1],q1.y>ns[n-1].y?sh:-sh);
  return Object.assign({},st,{nodes:ns,cap0:s0?K.stc:st.cap0,cap1:s1?K.stc:st.cap1});});};
const d=(ch,fn,bw,kind,nst)=>skDef(F,ch,K=>stemCuts(fn(K),K),bw,kind,nst);
/* знаки над буквами: бреве — широкая чаша пера, диерезис — два ромба */
/* integration (a): dd.avail = room of the fixed mark zone (F.mkZ); the breve and the dots shrink to it instead of rising with the pen */
SKM.rbreve=(K,cx,y,dd)=>{const S=Math.max(K.S,K.H),a=dd.mw*0.4,r0=K.dr()*0.8,wsb=dd.avail?Math.min(1,dd.avail*0.55/(1.14*S)):1,r=r0*wsb,
    ry=dd.avail?Math.min(Math.max(dd.mh*0.34,K.hy*2),Math.max(K.hy*1.5,(dd.avail-K.hy*1.2-0.57*S*wsb)/0.577)):Math.max(dd.mh*0.34,K.hy*2),lo=y+K.hy*1.2;
  /* кириллическое бреве: дуга пера с утолщёнными концами — ромбы на обоих концах (как точки диерезиса); в фиксированной зоне знака концы уменьшаются вместе с пером */
  const fA=Math.min(1,Math.max(0.3,ry*1.9/S)),ba=K.arc(cx,lo+ry,a,ry,205,335,K.nb,K.nb);if(fA<1)ba.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*fA;});/* W88 A: heavy pen in a low mark zone left a sliver counter inside the cup */return [ba,...[205,335].map(t=>{const x=cx+a*Math.cos(t*D2R),yy=lo+ry+ry*Math.sin(t*D2R),u=[-Math.sin(K.na),Math.cos(K.na)],L=Math.max(K.S*0.2,r*0.3)*wsb;const e=SKB.L(x-u[0]*L,yy-u[1]*L,x+u[0]*L,yy+u[1]*L,'F','F');if(wsb*fA<1)e.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*wsb*fA;});return e;})];};
SKM.rdier=(K,cx,y,dd)=>{const S=Math.max(K.S,K.H),ws=dd.avail?Math.min(1,dd.avail/(1.14*S)):1,r=K.dr()*0.8*ws,g=Math.max(r*1.5,dd.mw*0.26),cy=dd.avail?y+0.57*S*ws:y+r;
  /* dot height is about 1.14 pen; in a fixed mark zone the pen (w) and the stroke length shrink together so the dot fits */
  const dia=x=>{const e=K.dia(x,cy,r);if(ws<1){const a=K.na,u=[-Math.sin(a),Math.cos(a)],L=Math.max(K.S*0.36,r*0.5)*ws;const f=SKB.L(x-u[0]*L,cy-u[1]*L,x+u[0]*L,cy+u[1]*L,'F','F');f.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*ws;});return f;}return e;};
  return [dia(cx-g),dia(cx+g)];};
const OV=K=>[K.cx,K.h/2,(K.R-K.L)/2,K.h/2+K.ov-K.hy];
const oval=K=>{const [cx,cy,rx,ry]=OV(K);return K.ov_(cx,cy,rx,ry);};
const at=(x0,y0,x1,y1,y)=>x0+(x1-x0)*(y-y0)/(y1-y0);
/* x средней линии штриха на высоте y (по кривым Безье) — чтобы второй штрих входил точно в первый */
const xAtY=(st,y)=>{let best=null;const ns=st.nodes;for(let i=0;i+1<ns.length;i++){const A=ns[i],B=ns[i+1],P=[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]];
  let prev=P[0];for(let k=1;k<=40;k++){const q=skBz(P,k/40);if((prev[1]-y)*(q[1]-y)<=0&&q[1]!==prev[1]){const t=(y-prev[1])/(q[1]-prev[1]);return prev[0]+(q[0]-prev[0])*t;}prev=q;}}return null;};
/* арка n/h/m: ствол, плечо-полукруг, правая ножка с плоским срезом */
const arch=(K,x0,x1)=>{const yt=K.T+K.ov*0.6,r=(x1-x0)/2,ys=Math.max(K.h*0.3,yt-r);
  return K.pa([[x0,ys,90],[(x0+x1)/2,yt,0],[x1,ys,-90],[x1,0,-90]],'J','H');};
const cup=(K,x0,x1)=>{const yb=K.B-K.ov*0.6,r=(x1-x0)/2,ys=Math.min(K.h*0.7,yb+r);
  return K.pa([[x0,K.h,-90],[x0,ys,-90],[(x0+x1)/2,yb,0],[x1,ys,90]],'H','J');};
/* чаша вправо / влево от ствола: полуокружность и прямые по краям */
const bowlR=(K,x0,xr,y0,y1)=>{const r=Math.max(K.S*0.4,Math.min((y1-y0)/2,(xr-x0)*0.92,xr-x0-K.S*0.8));
  return K.pa([[x0,y1,0],[xr-r,y1,0],[xr,(y0+y1)/2,-90],[xr-r,y0,180],[x0,y0,180]],'J','J');};
const bowlL=(K,x0,xl,y0,y1)=>{const r=Math.max(K.S*0.4,Math.min((y1-y0)/2,(x0-xl)*0.92,x0-xl-K.S*0.8));
  return K.pa([[x0,y1,180],[xl+r,y1,180],[xl,(y0+y1)/2,-90],[xl+r,y0,0],[x0,y0,0]],'J','J');};
/* круглое раскрытие C/c/G: конец дуги не ближе пера к соседнему */
const apC=(K,ry,a)=>Math.max(a,Math.asin(Math.min(0.9,(K.hy*1.7+K.h*0.05+Math.max(0,K.hx-K.hy)*0.8)/ry))/D2R);
const apE=(K,ry)=>{const T=K.hy*2+K.h*0.1+Math.max(0,K.hx-K.hy)*0.35;return Math.asin(Math.min(0.97,(T+K.hy)/ry))/D2R;};
const sS=K=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov,yb=K.B-K.ov,ym=h*0.53,iu=w*0.05,tq=0.2-Math.min(0.07,Math.max(0,Math.max(K.hx,K.hy)-45)/h*0.6);
  return [K.pa([[R-iu*0.6,h-h*tq],[cx-iu*0.3,yt,180],[L+iu,(yt+ym)/2,-90],[cx,ym,-14],[R,(ym+yb)/2,-90],[cx,yb,180],[L,h*tq]],K.nb,K.nb)];};
const sZe=(K,tw)=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov,yb=K.B-K.ov,ym=h*0.54,xm=cx-w*(tw||0.08);
  return [K.pa([[L+w*0.04,h*0.78,42],[cx-w*0.02,yt,0],[R-w*0.05,(yt+ym)/2,-90],[xm+w*0.08,ym,180],[xm,ym,180]],'V','F'),
    K.pa([[xm,ym,0],[xm+w*0.1,ym,0],[R,(ym+yb)/2,-90],[cx,yb,180],[L,h*0.2]],'F',K.nb)];};
/* ---------- латиница, прописные (версали: круглые формы там, где они не мешают кириллице) ---------- */
d('A',K=>{const {w,h}=K,x0=K.hx*1.1,x1=w-K.hx*1.1,yb=h*0.3,ap=K.T+K.ov*0.5;
  return [SKB.P([[x0,0],[K.cx,K.T+K.ov*0.4,null,{c:1,j:'round'}],[x1,0]],'H','H'),K.hb(at(x0,0,K.cx,K.T,yb)+K.hx*0.3,at(x1,0,K.cx,K.T,yb)-K.hx*0.3,yb,'J','J')];},620,'cap',1);
d('B',K=>{const {L,R,T,B,h,w}=K,ym=h*0.54;return [K.st(L,0,h),bowlR(K,L,R-w*0.08,ym,T),bowlR(K,L,R,B,ym)];},520,'cap',2);
d('C',K=>{const [cx,cy,rx,ry]=OV(K),a=apC(K,ry,42)+8;return [K.arc(cx,cy,rx,ry,a,360-a,K.nb,'V')];},560,'cap',2);
d('D',K=>{const {L,R,T,B,h}=K,r=(R-L)*0.62,ym=h/2;return [K.st(L,0,h),K.pa([[L,T,0],[R-r*0.9,T,0],[R,ym,-90],[R-r*0.9,B,180],[L,B,180]],'J','J')];},600,'cap',2);
/* Е: ствол и три перекладины — круглая унциальная форма читалась как Є */
d('E',K=>{const {L,w,T,B,h}=K;return [K.st(L,0,h),K.hb(L,w*0.94,T,'F','V'),K.hb(L,w*0.8,h*0.5,'F','F'),K.hb(L,w,B,'F','V')];},520,'cap',1);
d('F',K=>{const {L,w,T,h}=K;return [K.st(L,0,h),K.hb(L,w,T,'F'),K.hb(L,w*0.86,h*0.5,'F')];},430,'cap',1);
d('G',K=>{const [cx,cy,rx,ry]=OV(K),a=Math.max(42,apC(K,ry,42))+8;return [SKB.st(skCat(skArcN(cx,cy,rx,ry,a,360,K.tens),skLn(K.R,cy,cx+rx*0.05,cy)),K.nb,'V')];},590,'cap',2);
d('H',K=>{const {L,R,h}=K;return [K.st(L,0,h),K.st(R,0,h),K.hb(L,R,h*0.52,'F','F')];},570,'cap',2);
d('I',K=>[K.st(K.cx,0,K.h)],p=>Math.max(p.stem,p.hair)*1.5,'cap',1);
d('J',K=>{const {L,R,h}=K,rx=(R-L)/2,ry=Math.min(h*0.3,rx*1.1),cy=K.B-K.ov+ry;
  return [SKB.st(skCat(skLn(R,h,R,cy),skArcN(R-rx,cy,rx,ry,0,-160,K.tens)),'H','H')];},400,'cap',1);
d('K',K=>{const {L,w,h}=K,xa=w-K.hx*1.2,ya=h*0.36,t=0.5,xj=xa+(L-xa)*t,yj=h+(ya-h)*t;
  return [K.st(L,0,h),K.ln(xa,h,L,ya,'H','J'),K.ln(xj,yj,w-K.hx*1.15,0,'J','H')];},560,'cap',2);
d('L',K=>{const {L,w,B,h}=K;return [K.st(L,0,h),K.hb(L,w,B,'F','V')];},430,'cap',1);
d('M',K=>{const {L,R,T,B,h,cx}=K;
  /* М / м: прямые стволы и клин до базовой — узнаваемо в обеих азбуках (круглые плечи читались как «ᗰ») */
  return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[cx,B,null,{c:1,cy:0}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];},720,'cap',3);
d('N',K=>{const {L,R,T,B,h}=K;return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[R,B,null,{c:1,cy:0}],[R,h]],'H','H')];},620,'cap',2);
d('O',K=>[oval(K)],640,'cap',2);
d('P',K=>{const {L,R,T,h,w}=K;return [K.st(L,0,h),bowlR(K,L,R,h*0.42,T)];},500,'cap',2);
d('Q',K=>{const [cx,cy,rx,ry]=OV(K);return [oval(K),K.ln(cx+rx*0.1,K.h*0.2,K.w-K.hx*0.4,-K.h*0.08,'F','F')];},640,'cap',2);
d('R',K=>{const {L,R,T,h,w}=K,yb=h*0.44,xj=L+(R-L)*0.42;return [K.st(L,0,h),bowlR(K,L,R-w*0.02,yb,T),K.ln(xj,yb,w-K.hx*1.15,0,'J','H')];},530,'cap',2);
d('S',K=>sS(K),460,'cap',2);
d('T',K=>{const {w,T,h,cx}=K;return [K.hb(0,w,T,'V','V'),K.st(cx,0,T,'H','J')];},520,'cap',1);
d('U',K=>{const yb=K.B-K.ov*0.6,r=(K.R-K.L)/2,ys=Math.min(K.h*0.7,yb+r);return [K.pa([[K.L,K.h,-90],[K.L,ys,-90],[(K.L+K.R)/2,yb,0],[K.R,ys,90],[K.R,K.h,90]],'H','H')];},580,'cap',2);
d('V',K=>{const {w,h,B,cx}=K;return [SKB.P([[K.hx*1.15,h],[cx,B,null,{c:1,cy:0}],[w-K.hx*1.15,h]],'H','H')];},620,'cap',1);
d('W',K=>{const {w,h,B,T,cx}=K,x0=K.hx*1.15,x4=w-K.hx*1.15;return [SKB.P([[x0,h],[w*0.25,B,null,{c:1,cy:0}],[cx,T,null,{c:1,cy:h}],[w*0.75,B,null,{c:1,cy:0}],[x4,h]],'H','H')];},900,'cap',2);
d('X',K=>{const {w,h}=K,a=K.hx*1.15;return [K.ln(a,h,w-a,0),K.ln(w-a,h,a,0)];},630,'cap',1);
d('Y',K=>{const {w,h,cx}=K,a=K.hx*1.6,yj=h*0.46;return [K.ln(a,h,cx,yj,'H','J'),K.ln(w-a,h,cx,yj,'H','J'),K.st(cx,yj,0,'J','H')];},590,'cap',1);
d('Z',K=>{const {w,T,B,h}=K,a=K.hx*1.3;return [SKB.P([[0,T],[w-a,T,null,{c:1}],[a,B,null,{c:1}],[w,B]],'V','V')];},520,'cap',1);
/* ---------- латиница, строчные ---------- */
d('a',K=>[oval(K),K.st(K.R,0,K.h)],500,'xh',2);
d('b',K=>[K.st(K.L,0,K.asc),oval(K)],500,'xh',2);
d('c',K=>{const [cx,cy,rx,ry]=OV(K),a=apC(K,ry,44)+8+4*Math.max(0,Math.min(1,(K.S-176)/24))*Math.max(0,Math.min(1,(100-K.H)/40));return [K.arc(cx,cy,rx,ry,a,360-a,K.nb,'V')];},440,'xh',2);
d('d',K=>[oval(K),K.st(K.R,0,K.asc)],500,'xh',2);
d('e',K=>{const [cx,cy,rx,ry]=OV(K);return [SKB.st(skCat(skLn(K.L,cy,K.R,cy),skArcN(cx,cy,rx,ry,0,360-Math.max(44,apE(K,ry)+4),K.tens)),'J','V')];},480,'xh',2);
d('f',K=>{const {w,h}=K,xs=K.hx+w*0.14,r=Math.min((w-K.hx-xs)*0.62,Math.max(K.hx*0.5,(K.asc-K.hy-K.T)*0.5)),ya=K.asc-K.hy-r;
  return [SKB.st(skCat(skLn(xs,0,xs,ya),skArcN(xs+r,ya,r,r,180,84,K.tens)),'H','V'),K.hb(0,w*0.86,K.T,'V','V')];},300,'xh',1);
d('g',K=>{const {L,R,h,cx}=K,rx=(R-L)/2,ry=K.desc*0.36,cy=-K.desc+K.hy+ry;
  return [oval(K),SKB.st(skCat(skLn(R,h,R,cy),skArcN(cx,cy,rx,ry,0,-150,K.tens)),'H',K.nb)];},500,'xh',2);
d('h',K=>[K.st(K.L,0,K.asc),arch(K,K.L,K.R)],440,'xh',2);
const iW=p=>Math.max(p.stem,p.hair)*1.5;
const iDot=K=>{const r=K.dr();return K.dia(K.cx,Math.min(K.h+Math.max(K.S*0.62,K.capH*0.07)+r,K.asc-r*0.5),r);};
d('i',K=>[K.st(K.cx,0,K.h),iDot(K)],iW,'xh',1);
d('j',K=>{const {h}=K,x=K.cx,r=Math.max(K.S*1.0,K.capH*0.13),ry=K.desc*0.42,cy=-K.desc+K.hy+ry;
  return [SKB.st(skCat(skLn(x,h,x,cy),skArcN(x-r,cy,r,ry,0,-150,K.tens)),'H',K.nb),iDot(K)];},iW,'xh',1);
d('k',K=>{const {L,w,h}=K,xa=w-K.hx*1.2,ya=h*0.28,t=0.48,xj=xa+(L-xa)*t,yj=h+(ya-h)*t;
  return [K.st(L,0,K.asc),K.ln(xa,h,L,ya,'H','J'),K.ln(xj,yj,w-K.hx*1.15,0,'J','H')];},430,'xh',2);
d('l',K=>[K.st(K.cx,0,K.asc)],p=>Math.max(p.stem,p.hair)*1.5,'xh',1);
d('m',K=>{const {L,R,h}=K,xm=(L+R)/2;return [K.st(L,0,h),arch(K,L,xm),arch(K,xm,R)];},680,'xh',3);
d('n',K=>[K.st(K.L,0,K.h),arch(K,K.L,K.R)],440,'xh',2);
d('o',K=>[oval(K)],500,'xh',2);
d('p',K=>[K.st(K.L,K.h,-K.desc),oval(K)],500,'xh',2);
d('q',K=>[K.st(K.R,K.h,-K.desc),oval(K)],500,'xh',2);
d('r',K=>{const {L,w,h}=K,r=(w-K.hx-L)*0.66,yt=K.T+K.ov*0.6,cy=yt-r;return [K.st(L,0,h),K.arc(L+r,cy,r,r,180,42,'J',K.nc)];},300,'xh',1);
d('s',K=>sS(K),390,'xh',3);
d('t',K=>{const {w,h}=K,xs=w*0.4,top=h+(K.asc-h)*0.55,yb=K.B-K.ov*0.6,r=Math.min((w-xs-K.hx)*0.8,h*0.3);
  return [K.pa([[xs,top,-90],[xs,yb+r,-90],[xs+r*0.9,yb,0],[w-K.hx*0.4,yb+r*0.3,35]],'H',K.nc),K.hb(0,w*0.9,K.T,'V','V')];},320,'xh',1);
d('u',K=>[cup(K,K.L,K.R),K.st(K.R,K.h,0)],440,'xh',2);
d('v',K=>F.GL['V'].skel(K.g),480,'xh',1);
d('w',K=>F.GL['W'].skel(K.g),740,'xh',2);
d('x',K=>F.GL['X'].skel(K.g),460,'xh',1);
d('y',K=>{const {w,h}=K,a=K.hx*1.15,x1=w-a,xe=w*0.2,ye=-K.desc+K.hy;
  const tail=SKB.P([[x1,h,-100],[w*0.46,-K.desc*0.35,-110],[xe,ye,180]],'H','H');const yj=K.hy*2.2,xj=xAtY(tail,yj);
  return [K.ln(a,h,xj==null?w*0.5:xj,yj,'H','J'),tail];},470,'xh',1);
d('z',K=>F.GL['Z'].skel(K.g),420,'xh',1);
/* ---------- кириллица ---------- */
const Be=K=>{const {L,R,T,B,h,w}=K,ym=h*0.56;return [K.st(L,0,h),K.hb(L,w*0.88,T,'F'),bowlR(K,L,R,B,ym)];};
const Ge=K=>[K.st(K.L,0,K.h),K.hb(K.L,K.w*0.98,K.T,'F','V')];
const De=K=>{const {L,R,w,h,T,B}=K,dd=K.desc,x1=w*0.3,xb=L+w*0.06;
  return [SKB.P([[xb,B],[x1,T,null,{c:1,cy:h}],[R,T]],'J','J'),K.st(R,h,-dd,'H','H'),K.hb(L,R,B,'J','J'),K.st(L,B,-dd,'J','H')];};
const Zhe=K=>{const {w,h,cx}=K,xa=w-K.hx*1.2,ym=h*0.5,xs=cx+K.S*0.34;
  const r=[K.ln(xa,h,xs,ym,'H','J'),K.ln(xs,ym,w-K.hx*1.15,0,'J','H')];return [K.st(cx,0,h),...r,...skMirX(r,w)];};
const Ii=K=>{const {L,R,T,B,h}=K;return [SKB.P([[L,h],[L,B,null,{c:1,cy:0}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];};
const El=K=>{const {L,R,T,h,w}=K,x1=w*0.34;return [SKB.P([[K.hx*1.15,0],[x1,T,null,{c:1,cy:h}],[R,T,null,{c:1}],[R,0]],'H','H')];};
const Pe=K=>{const {L,R,T,h}=K;return [SKB.P([[L,0],[L,T,null,{c:1,cy:h}],[R,T,null,{c:1,cy:h}],[R,0]],'H','H')];};
const Te=K=>{const {w,T,cx}=K;return [K.hb(0,w,T,'V','V'),K.st(cx,0,T,'H','J')];};
const Ef=K=>{const {L,R,h,cx}=K;return [K.st(cx,0,h),K.ov_(cx,h*0.52,(R-L)/2,Math.min(h*0.36,(R-L)*0.5)-K.hy*0.2)];};
const Tse=K=>{const {L,w,h,B}=K,dd=K.desc,R1=w-K.hx-K.S*1.05;
  return [K.st(L,h,0,'H','H'),K.st(R1,h,0,'H','H'),K.hb(L,w,B,'J','V'),K.st(w-K.hx,B,-dd,'J','H')];};
const Che=K=>{const {L,R,h}=K,yc=h*0.42,r=Math.min((R-L)*0.45,h*0.25);
  return [K.pa([[L,h,-90],[L,yc+r,-90],[L+r,yc,0],[R,yc,0]],'H','J'),K.st(R,h,0)];};
const Sha=K=>{const {L,R,h,B,cx}=K;return [SKB.P([[L,h],[L,B,null,{c:1,cy:0}],[R,B,null,{c:1,cy:0}],[R,h]],'H','H'),K.st(cx,h,B,'H','J')];};
const Shcha=K=>{const {L,w,h,B}=K,dd=K.desc,R1=w-K.hx-K.S*1.05,xm=(L+R1)/2;
  return [K.st(L,h,0,'H','H'),K.st(xm,h,0,'H','H'),K.st(R1,h,0,'H','H'),K.hb(L,w,B,'J','V'),K.st(w-K.hx,B,-dd,'J','H')];};
const Soft=K=>{const {L,R,B,h}=K;return [K.st(L,0,h),bowlR(K,L,R,B,h*0.56)];};
const Hard=K=>{const {w,h,B,T}=K,xs=w*0.36;return [K.hb(0,xs,T,'V','J'),K.st(xs,0,h),bowlR(K,xs,K.R,B,h*0.56)];};
const Yeru=K=>{const {L,w,h,B}=K,wr=w-K.hx;return [K.st(L,0,h),bowlR(K,L,Math.min(w*0.66,wr-2*K.hx-Math.max(40,K.hx*0.7)),B,h*0.56),K.st(wr,0,h)];};
const Ee=K=>{const [cx,cy,rx,ry]=OV(K),a=180-Math.max(50,apE(K,ry)*0.85+20);return [K.arc(cx,cy,rx,ry,a,-a,'V',K.nb),K.hb(K.w*0.3,K.R,cy,'F','J')];};
const Yu=K=>{const {L,R,w,h}=K,xo0=L+K.S*1.5+w*0.06,ocx=(xo0+R)/2,rx=(R-xo0)/2;
  return [K.st(L,0,h),K.hb(L,xo0,h/2,'J','J'),K.ov_(ocx,h/2,rx,h/2+K.ov-K.hy)];};
const Ya=K=>{const {L,R,T,h,w}=K,yb=h*0.44,xj=R-(R-L)*0.42;return [K.st(R,0,h),bowlL(K,R,L+w*0.02,yb,T),K.ln(xj,yb,K.hx*1.15,0,'J','H')];};
d('Б',Be,500,'cap',2);d('Г',Ge,410,'cap',1);d('Д',De,650,'cap',2);d('Ж',Zhe,880,'cap',2);d('З',K=>sZe(K),490,'cap',2);
d('И',Ii,600,'cap',2);d('Л',El,570,'cap',2);d('П',Pe,580,'cap',2);d('У',K=>{const {w,h}=K,a=K.hx*1.15,x1=w-a,xe=w*0.24,yj=h*0.36;
  return [K.ln(x1,h,xe,0,'H','H'),K.ln(a,h,at(x1,h,xe,0,yj),yj,'H','J')];},590,'cap',1);
d('Ф',Ef,640,'cap',2);d('Ц',Tse,630,'cap',2);d('Ч',Che,540,'cap',2);d('Ш',Sha,860,'cap',3);d('Щ',Shcha,920,'cap',3);
d('Ъ',Hard,610,'cap',2);d('Ы',Yeru,740,'cap',3);d('Ь',Soft,490,'cap',2);d('Э',Ee,560,'cap',2);d('Ю',Yu,900,'cap',3);d('Я',Ya,530,'cap',2);
d('б',K=>{const {L,R,h,cx}=K,ya=K.asc-K.hy,r=Math.min((ya-h)*0.9,(R-L)*0.4);
  return [oval(K),K.pa([[L,h*0.5,90],[L,ya-r,90],[L+r,ya,0],[L+r*2.1,Math.max(ya-r*0.15,h+K.hy*2.6+h*0.06),-20]],'J','V')];},500,'xh',2);
d('в',K=>F.GL['B'].skel(K.g),440,'xh',2);d('г',Ge,340,'xh',1);d('д',De,520,'xh',2);d('ж',Zhe,760,'xh',2);d('з',K=>sZe(K),410,'xh',2);
d('и',Ii,470,'xh',2);d('к',K=>F.GL['K'].skel(K.g),440,'xh',2);d('л',El,460,'xh',2);d('м',K=>F.GL['M'].skel(K.g),620,'xh',3);
d('н',K=>F.GL['H'].skel(K.g),470,'xh',2);d('п',Pe,470,'xh',2);d('т',Te,440,'xh',1);
d('ф',K=>{const {L,R,h,cx}=K;return [K.st(cx,K.asc,-K.desc),oval(K)];},560,'xh',2);
d('ц',Tse,500,'xh',2);d('ч',Che,430,'xh',2);d('ш',Sha,720,'xh',3);d('щ',Shcha,780,'xh',3);d('ъ',Hard,510,'xh',2);d('ы',Yeru,620,'xh',3);
d('ь',Soft,410,'xh',2);d('э',Ee,440,'xh',2);d('ю',Yu,720,'xh',3);d('я',Ya,440,'xh',2);
/* ---------- цифры ---------- */
const dg=(ch,fn,bw)=>d(ch,fn,bw,'cap',2);
dg('0',K=>[oval(K)],520);
dg('1',K=>{const {w,h,T}=K,xs=w-K.hx*1.2;return [SKB.P([[K.hx*0.7,h*0.84],[xs,T,null,{c:1,cy:h}],[xs,0]],K.nc,'H')];},340);
dg('2',K=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov;return [K.pa([[L+w*0.02,h*0.72,48],[cx,yt,0],[R-w*0.02,h*0.7,-90],[R-w*0.24,h*0.38,-135],[L+K.hx*0.6,K.B,null,{c:1,j:'bevel'}],[w,K.B]],K.nc,'V')];},500);
/* FX2g: 3 с плоской верхушкой (ровная перекладина + косая в талию): З и 3 различимы при 12 px (§4) */
dg('3',K=>{const {L,R,w,h,cx}=K,yt=K.T+K.ov*0.3,yb=K.B-K.ov,ym=h*0.54,xm=cx-w*0.02;
  return [K.pa([[L+w*0.06,yt],[R-w*0.06,yt,null,{c:1,j:'miter'}],[xm,ym+h*0.02,null,{c:1,j:'miter'}],[xm+w*0.1,ym,0],[R,(ym+yb)/2,-90],[cx,yb,180],[L,h*0.2]],'V',K.nb)];},490);
dg('4',K=>{const {w,h}=K,xs=w-K.hx-w*0.14,yb=h*0.3;return [SKB.P([[xs,0],[xs,K.T,null,{c:1,cy:h}],[K.hx*2.4,yb,null,{c:1}],[w,yb]],'H','V')];},560);
dg('5',K=>{const {L,R,w,h,cx}=K,yb=K.B-K.ov,ym=h*0.6;
  return [K.pa([[w*0.9,K.T],[L+w*0.08,K.T,null,{c:1,cy:h}],[L+w*0.02,h*0.5,null,{c:1,di:-95,j:K.hx>55?'bevel':undefined}],[cx,ym,0],[R,(ym+yb)/2,-90],[cx,yb,180],[L+K.hx*0.2,Math.min(h*0.17,h*0.46-K.hy*3)]],'V','H')];},500);
dg('6',K=>{const {L,R,h,cx}=K,ry=h*0.31*(1-0.1*Math.max(0,Math.min(1,(K.S-176)/24))*Math.max(0,Math.min(1,(100-K.H)/40))),cy=K.B-K.ov+ry,rx=(R-L)/2;return [K.ov_(cx,cy,rx,ry),K.pa([[L,cy,90],[cx-rx*0.15,h*0.8],[R-rx*0.25,K.T+K.ov*0.5]],'J',K.nc)];},510);
dg('7',K=>{const {w,h,T}=K;return [SKB.P([[0,T],[w-K.hx*1.2,T,null,{c:1}],[w*0.3,0]],'V','H')];},480);
dg('8',K=>{const {L,R,h,cx}=K,ys=h*0.555,yb=K.B-K.ov,yt=K.T+K.ov,rx=(R-L)/2,rx2=rx*0.86;
  return [K.ov_(cx,(yb+ys)/2,rx,(ys-yb)/2),K.ov_(cx,(ys+yt)/2,rx2,(yt-ys)/2)];},520);
dg('9',K=>{const {L,R,h,cx}=K,ry=h*0.31,cy=K.T+K.ov-ry,rx=(R-L)/2;return [K.ov_(cx,cy,rx,ry),K.pa([[R,cy,-90],[cx+rx*0.15,h*0.2],[L+rx*0.25,K.B-K.ov*0.5]],'J',K.nc)];},510);
/* ---------- знаки (общий набор skPunct) и пробелы ---------- */
skPunct(F);
const G=F.GL;
d('&',K=>{const {L,R,cx}=K,ys=K.capH*0.56,yb=K.B-K.ov,yt=K.T+K.ov,rx=Math.min((R-L)/2,K.capH*0.3+K.hx*0.3),lcy=(yb+ys)/2,lry=(ys-yb)/2,ucx=cx-rx*0.3,uw=rx*0.62,ucy=(ys+yt)/2;
  /* Et-образная: верхняя чаша разомкнута справа, нижняя дуга открыта, длинная диагональ к хвосту справа внизу — не «восьмёрка» */
  return [K.arc(ucx,ucy,uw,(yt-ys)/2,62,315,K.nb,'F'),K.arc(cx-rx*0.05,lcy,rx*0.95,lry,45,232,K.nb,'F'),K.ln(ucx+uw*0.15,ys+(yt-ys)*0.1,cx+rx*0.9,0,'F','H')];},640,'cap',2);
/* @ — adaptive (W88 A): the inner «a» is drawn with a pen scaled to the room left inside the ring (gap g to the ring on every side, own counter >= c), so heavy pens never close the ring channel or fill the a */
d('@',K=>{const {w,capH:h}=K,T=Math.max(K.S,K.H),cy=h*0.4,rx=w/2-K.hx,ry=h*0.52,hx=K.hx,hy=K.hy,xi=K.cx-T*0.1,g=Math.max(40,0.24*T),c=Math.max(40,0.3*T);
  /* clearance of the (pen-scaled) a outline to the ring's inner edge, measured on 24 x 36 sampled points (ellipses of different aspect meet on the diagonals) */
  const RI=[];for(let j=0;j<36;j++){const t=j*Math.PI/18;{const sn=Math.sin(t);RI.push([K.cx+(rx-hx)*Math.cos(t),cy+0.15*ry+(sn>=0?0.85*ry-hy*1.25:1.15*ry-hy)*sn]);}}
  const clr=(r,q)=>{let m=1e9;const pts=[[xi+r+hx*q*1.05,cy+1.1*r+hy*q*0.5],[xi+r,cy+1.1*r+hy*q*1.8],[xi+r+hx*q*1.05,cy+0.55*r]];for(let i=0;i<24;i++){const t=i*Math.PI/12;pts.push([xi+(r+hx*q)*Math.cos(t),cy+(1.1*r+hy*q)*Math.sin(t)]);}for(const [x,y] of pts){for(const P of RI){const d=Math.hypot(P[0]-x,P[1]-y);if(d<m)m=d;}}return m;};
  const sOf=r=>{if(r-c<hx*0.2)return 0;let q=1;for(;q>0.2;q-=0.05){if(clr(r,q)>=g&&r-c>=hx*q&&1.1*r-c>=hy*q)return q;}return q;};
  const r0=Math.max(w*0.09,Math.min(w*0.17,Math.min(rx,ry)*0.42-T*0.5),T*0.78);let ri=r0,s=sOf(ri);
  if(s<1){let bs=s,br=ri;for(let r=r0;r>r0*0.5;r-=4){const q=sOf(r);if(q>bs+1e-9){bs=q;br=r;}if(q>=1)break;}ri=br;s=Math.max(0.2,bs);}
  const ba=K.ov_(xi,cy,ri,ri*1.1),ring=K.pa([[xi+ri,cy+ri*1.1,-90],[xi+ri,cy-ri*0.55,-90],[xi+ri+(K.R-xi-ri)*0.4,Math.max(cy-ri*1.15,cy-0.8*ry+hy+g+hy*s),0],[K.R,cy+ry*0.15,90],[K.cx,cy+ry,180],[K.L,cy,-90],[K.cx,cy-ry,0],[K.cx+rx*0.7,cy-ry*0.8]],'H','R');
  if(s<1){ba.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*s;});[0,1].forEach(i=>{const n=ring.nodes[i];if(n)n.w=s;});if(ring.nodes[2])ring.nodes[2].w=(1+s)/2;}
  return [ba,ring];},820,'cap',6);
/* точки знаков — ромбы */
{const dd=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,bw,kind,nst==null?0:nst,{});
 const dotW=p=>Math.max(p.stem,p.hair)*1.5;
 const par=(K,x0)=>{const t=K.capH*0.96,b=-K.desc*0.5,m=(t+b)/2;return K.pa([[x0+K.w*0.42,t-K.hy,-145],[x0+K.hx*0.5+K.S*0.32,m,-90],[x0+K.w*0.42,b+K.hy,145]],'H','H');};
 const pw=p=>0.55*p.xh+Math.max(p.stem,p.hair)*1.3;
 dd('(',K=>[par(K,K.L)],pw,'cap',0);
 dd(')',K=>skMirX([par(K,K.L)],K.w),pw,'cap',0);
 const comma=(K,x,y)=>{const r=K.dr();return [K.dia(x,y,r),SKB.P([[x+r*0.35,y-r*0.2,-90],[x+r*0.05,y-r*1.5],[x-r*0.7,y-r*2.5]],'J','X',{tl:r*2.2})];};
 dd('.',K=>[K.dia(K.cx,K.dr()*1.0,K.dr())],dotW,'cap',1);
 dd(',',K=>comma(K,K.cx,K.dr()*1.0),p=>dotW(p)*1.1,'cap',1);
 dd(':',K=>[K.dia(K.cx,K.dr()*1.0,K.dr()),K.dia(K.cx,K.xh-K.dr()*1.0,K.dr())],dotW,'xh',1);
 dd(';',K=>[...comma(K,K.cx,K.dr()*1.0),K.dia(K.cx,K.xh-K.dr()*1.0,K.dr())],p=>dotW(p)*1.1,'xh',1);
 dd('!',K=>{const r=K.dr();return [K.st(K.cx,K.capH,r*2+Math.max(K.S,K.H)*0.9,'H','R'),K.dia(K.cx,r,r)];},dotW,'cap',1);}
/* типографские знаки: запятая (ромб + хвост) поднимается к верху прописных; ‘ — поворот на 180° вокруг центра знака; пары — два знака */
{const dd=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,bw,kind,nst==null?0:nst,{});
 const rr=p=>Math.max(p.stem,p.hair)*0.62;
 const comma=(K,x,y)=>{const r=K.dr();return [K.dia(x,y,r),SKB.P([[x+r*0.35,y-r*0.2,-90],[x+r*0.05,y-r*1.5],[x-r*0.7,y-r*2.5]],'J','X',{tl:r*2.2})];};
 const mk=(K,x,low,open)=>{const r=K.dr(),y=low?r:K.capH-r*0.8,sk=comma(K,x,y);return open?skXf(sk,(X,Y)=>[2*x-X,2*(y-r*1.2)-Y]).map(skReverse):sk;};
 const q1=p=>Math.max(p.stem,p.hair)*1.5*1.1,q2=p=>Math.max(p.stem,p.hair)*1.5*2.3;
 const px=K=>K.dr()*1.15;
 /* верх всех кавычек = верх прописных: замер контура и сдвиг (повёрнутая запятая ‘ “ выступает иначе) */
 const top=(K,sk)=>{try{const t=skYTop(skShape(sk,F,K.p));if(isFinite(t)&&Math.abs(t-K.capH)>0.5)return skXf(sk,(X,Y)=>[X,Y+K.capH-t]);}catch(e){}return sk;};
 dd('’',K=>top(K,mk(K,K.cx,false,false)),q1,'cap',1);
 dd('‘',K=>top(K,mk(K,K.cx,false,true)),q1,'cap',1);
 dd('”',K=>top(K,[...mk(K,K.cx-px(K),false,false),...mk(K,K.cx+px(K),false,false)]),q2,'cap',2);
 dd('“',K=>top(K,[...mk(K,K.cx-px(K),false,true),...mk(K,K.cx+px(K),false,true)]),q2,'cap',2);
 dd('„',K=>[...mk(K,K.cx-px(K),true,false),...mk(K,K.cx+px(K),true,false)],q2,'cap',2);
 /* … : три ромба точки; шаг 2.6 r — теснее трёх набранных точек */
 const ep=K=>K.dr()*2.6;
 dd('…',K=>{const r=K.dr();return [0,1,2].map(i=>K.dia(r*1.1+i*ep(K),r,r));},p=>rr(p)*(2.2+5.2),'cap',3);
 /* − : горизонталь знака «+»: ось на 0.5 высоты прописных, перо дефиса, ширина цифры */
 dd('−',K=>[K.hb(0,K.w,K.capH*0.5)],p=>F.GL['0'].w(p),'cap',0);}
/* № : N и малая открытая о с чертой; кольцо крупнее пера, иначе заплывает */
d('№',K=>{const {capH:h}=K,wn=K.w*0.64,o=[SKB.P([[K.L,0],[K.L,K.T,null,{c:1,cy:h}],[wn-K.hx,K.B,null,{c:1,cy:0}],[wn-K.hx,h]],'H','H')];
  const gN=Math.max(K.S,K.H)*0.3,ry=h*0.22,rx=Math.max(K.hx*1.5,ry*0.78),cx=wn+gN+rx+K.hx*0.5;
  o.push(K.ov_(cx,h*0.64,rx,ry),K.hb(cx-rx-K.hx*0.5,cx+rx+K.hx*0.5,h*0.2));return o;},1060,'cap',4.5);
F.mkZ={cap:235,low:235,g0:40,gk:0.32};
F.after=()=>{skCompose(F,'Й','И',['rbreve']);skCompose(F,'й','и',['rbreve']);skCompose(F,'Ё','E',['rdier']);skCompose(F,'ё','e',['rdier']);};
{const dd=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,bw,kind,nst==null?0:nst,{});
 dd('?',K=>{const {w}=K,top=K.capH,r=K.dr(),cy=top-K.hy-(top*0.27),ye=r*2+K.S*0.9+Math.max(K.hy,K.hx)*1.8;
  return [K.pa([[K.L,cy+top*0.04,90],[K.cx,top-K.hy+K.ov*0.5,0],[K.R,cy,-90],[K.cx+K.S*0.12,(cy+ye)/2,-160],[K.cx,ye,-90]],K.nc,'H'),K.dia(K.cx,r,r)];},420,'cap',1);}
{const dd=(ch,fn,bw,kind,nst)=>skDef(F,ch,fn,bw,kind,nst==null?0:nst,{});
 const guil=(K,x0)=>{const wq=K.xh*0.42,m=K.xh*0.5,a=K.xh*0.42;return SKB.P([[x0+wq,m+a],[x0,m,null,{c:1,j:'bevel'}],[x0+wq,m-a]],'F','F');};
 const gw=p=>0.84*p.xh+Math.max(p.stem,p.hair)*1.9+40;
 const gs=K=>K.xh*0.42+Math.max(K.S,K.H)*0.9;
 dd('«',K=>[guil(K,K.L+K.hx*0.6),guil(K,K.L+K.hx*0.6+gs(K))],gw,'xh',0);
 dd('»',K=>skMirX([guil(K,K.L+K.hx*0.6),guil(K,K.L+K.hx*0.6+gs(K))],K.w),gw,'xh',0);}
F.after();
/* ---------- ss01: круглая («двоечная») r и длинная s ---------- */
const alt=(name,base,fn,bw,nst)=>{const e={k:'xh',opt:{alt:true,base,feat:'ss01'},w:p=>Math.max(30,bw*p.wdth/100+nst*(p.stem-F.S0)*F.wK),skel:g=>fn(F.kit(g,name))};e.shape=g=>skShape(e.skel(g),F,g.p,'xh');G[name]=e;};
alt('r.ss01','r',K=>{const {L,R,w,h}=K,yt=K.T+K.ov*0.6;
  return [K.pa([[L+w*0.02,h*0.62,6],[K.cx+w*0.04,yt,0],[R-w*0.02,h*0.58,-90],[K.cx+w*0.12,h*0.3,-130],[L+K.hx*0.7,K.B,-180]],'V','V'),K.hb(L+K.hx*0.7,R-w*0.04,K.B,'J','V')];},330,1);
alt('s.ss01','s',K=>{const {w,h}=K,xs=K.hx+w*0.14,r=(w-K.hx-xs)*0.62,ya=K.asc-K.hy-r;
  return [SKB.st(skCat(skLn(xs,0,xs,ya),skArcN(xs+r,ya,r,r,180,60,K.tens)),'H',K.nc)];},300,1);
F.ss01Name='Круглая r и длинная s';
/* ---------- регистрация ---------- */
const L0={wdth:96,capH:660,xh:490,asc:720,desc:215,stem:168,hair:30,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:10,slant:0,sb:42,track:0,space:330,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:36,press:0,term:3,tens:1,conn:0};
F.DEFAULTS={regular:{...L0},italic:{...L0,wdth:98,stem:170,hair:29,nib:32,slant:10,icomp:40,space:310}};
F.params={stem:['Основной штрих (перо)',50,170,1],hair:['Соединительный штрих (перо)',14,120,1],nib:['Угол пера, °',20,50,1],tens:['Натяжение кривых',0.9,1.15,0.01],
  diag:null,optic:null,round:null,kappa:null,innerR:null,rough:null,spur:null,aper:null,bar:null,mv:null,trap:null,join:null,stemScale:null,press:null,conn:null,term:['Концевые элементы: круг · плоский · скос · полускос',0,3,1]};
F.methods=[
  ['Перо','Угол и контраст широкого пера.',[['Классическая 36°',{nib:36,hair:30}],['Острая 38°',{nib:38,hair:24}],['Мягкая 30°',{nib:30,hair:40}]]],
  ['Вес','Ширина пера.',[['Светлая',{stem:124,hair:24}],['Обычная',{stem:168,hair:30}],['Жирная',{stem:188,hair:34}]]],
  ['Срез','Концы стволов и ножек.',[['Плоский',{term:1}],['Скос по перу',{term:2}],['Полускос',{term:3}]]],
  ['Пропорции','Соотношение высот.',[['Книжная',{capH:660,xh:490,asc:720,desc:215}],['Высокий x',{capH:660,xh:510,asc:700,desc:190}],['Длинные выносные',{capH:660,xh:450,asc:770,desc:230}]]],
  ['Ширина','Сжатие знаков.',[['Сжатая',{wdth:92}],['Обычная',{wdth:96}],['Широкая',{wdth:108}]]],
];
F.sym=false;F.wK=0.8;F.nodeBudget=30;
/* ствол широкого пера: горизонтальный размах эллипса; перекладины не мерятся по hair (их толщина зависит от угла пера) */
F.proof={stem:p=>{const a=(p.nib||0)*D2R;return Math.hypot(p.stem*Math.cos(a),p.hair*Math.sin(a));},noBar:true,stemSet:'FHILTБВГНПТЬЪЫШЦЧhilnmпгтнцшь'};
F.lim={capH:[630,720],xhR:[0.66,0.78],ascA:[30,120],desc:[180,260],wdth:[92,108],ov:[4,16],stem:[62,200],stemK:0.46,stemWK:2.2,hairR:[0.14,0.36],hairX:0.17,nibX:0.27,ascX:1.15,descX:1.07,nib:[29,38],term:[0,3],tens:[0.9,1.15]};
for(const k of ['capH','desc','wdth','ov','stem'])F.params[k]=[(PARAMS.find(r=>r[0]===k)||[])[1]||k,F.lim[k][0],F.lim[k][1],1];
F.params.stem[0]='Основной штрих (перо)';F.params.xh=['Высота строчных',F.lim.capH[0]*F.lim.xhR[0],F.lim.capH[1]*F.lim.xhR[1],1];
F.params.asc=['Верхние выносные',F.lim.capH[0]+F.lim.ascA[0],F.lim.capH[1]+F.lim.ascA[1],1];F.params.hair=['Соединительный штрих (перо)',14,F.lim.stem[1]*0.5,1];
F.params.nib=['Угол пера, °',F.lim.nib[0],F.lim.nib[1],1];
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?«»"\'-–—()/&№‘’“”„…−‒₽@#%*+=\\|°•';
for(const c in SK_TWIN)if(G[SK_TWIN[c]])G[c]=G[SK_TWIN[c]];
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' ','\u00a0'].filter(c=>G[c]);
for(const c of Object.keys(G))if(c.length===1&&!F.CHARSET.includes(c))delete G[c];
otAddAlternates(G,false);delete G['m.ss01'];
FONTS[F.id]=F;
/* кернинг классами: общая таблица (буквы не соединяются) */
KERN_TABLE.rotunda=KERN_TABLE_BASE;
/* шкала веса */
WSCALE.rotunda=0.6;
if(typeof CU!=='undefined'){CU.J.rotunda='round';CU.CAP.rotunda='T';}
})();
/* веса семейства Ротунды (правило ParaType: Bold ≥ +25% к Regular): Light 96 · Regular 134 · Bold 168 (умолчание шрифта) · Black 200 — шаги 1.40 / 1.25 / 1.19; предел пера 200 снят стресс-тестом; контраст (толщина пера) растёт медленнее, знаки чуть шире, чтобы острые просветы чаш не закрывались */
const _famParamsRot=famParams;
famParams=function(p,wn){const o=_famParamsRot(p,wn);
  if(CUR_FONT==='rotunda'){const k={Light:0.56,Regular:0.774,Bold:1.024,Black:1.19}[wn]||1;/* Regular 130 · Bold 172: Bold/Regular 1.32 (FX2) */
    o.stem=Math.round(p.stem*k);o.nib=p.nib+({Light:3,Regular:-1,Bold:-6,Black:-8}[wn]||0);/* ось контраста: при постоянном пере она уходит 27° → 44° (шире перо — круче), поправка угла держит 28–33° (FX2) */o.hair=Math.max(18,Math.round(Math.max(p.hair*Math.pow(k,0.6),o.stem*0.205*(p.hair/30))));/* пропорция пера (hair/stem) не падает ниже 0.2 — иначе ось контраста уходит с 28° до 42° (FX2) */
    if(p.wdth!=null)o.wdth=Math.round(p.wdth*(1+0.25*Math.max(0,k-1)));
    return paramLimits(o,'rotunda').q;}
  return o;};
