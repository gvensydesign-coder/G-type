/* ===== «Пропись» — связный рукописный шрифт остроконечным пером на движке «скелет + перо» =====
   Скелет рисуется прямо (без наклона), в порядке письма: нажим — по направлению хода (вниз толсто, вверх/вбок волосная,
   плавно: f = smoothstep(−Tᵧ)). Наклон добавляет параметр slant.
   Соединения по канону прописей:
     нижнее — строчная входит в (0, yc) и выходит в (w, yc) под углом CN_A (yc = 0.2·xh);
     верхнее — после о, в, б, ю (и o, b, v, w) выход идёт сверху на высоте yh; следующая буква берёт вариант «.hi»
     с верхним входом (OpenType calt: контекстная замена по предыдущему знаку; в превью — FONTS.propis.ctx).
   При нулевом трекинге хвосты соседних букв совпадают (перекрытие 4 ед.), поля шрифта = 0, у прописных и знаков поля встроены. */
let SK_HI=false;                                   // строится вариант с верхним входом
(function(){
const F={id:'propis',hFix:1,mkCap:232,mkLow:270,mkAbs:945,name:'Пропись',family:'Propis Script',tag:'Рукописный · остроконечное перо',S0:92,GL:{},
  desc:'Связный рукописный шрифт по канону прописей: нажим на нисходящих, волосные соединения нижние и верхние, петли выносных. Скелет из кривых Безье, перо остроконечное.',
  sample:'Пропись 2026'};
F.pen=p=>skPenOf({kind:'pt'},p);
const CN_A=52,CA=Math.cos(CN_A*D2R),SA=Math.sin(CN_A*D2R);
const uOf=p=>p.xh*0.56*p.wdth/100+(p.stem-F.S0)*0.3;
F.kit=(g,ch)=>{const K=skKit(g,F),p=g.p;
  /* тяжёлое перо: нажим перед нижним поворотом уводит край под базовую линию — низ скелета чуть поднимается */
  K.Bd=K.B+Math.max(0,p.stem-F.S0)*0.9;/* низ скелета не поднимается: край возвращает skHFix *//* низ поворота сразу после нажимного штриха */K.u=uOf(p);K.r=K.u*0.42;K.d=Math.max(K.hy*1.25,K.u*0.11);
  K.yc=p.xh*0.2;K.yh=(p.xh-K.hy)*0.84;K.ch=K.h-K.hy;K.hi=SK_HI;
  K.fl=Math.max(0,(p.spur==null?100:p.spur)/100);K.c=(p.conn==null?100:p.conn)/100;
  /* связность < 100 %: вход/выход укорачиваются вдоль хорды к соседнему узлу (а не назад по углу соединения —
     тогда конец оказывался позади предыдущего узла и путь закручивался петлёй) */
  const kc=1-(1-K.c)*0.55;
  const capLike=/\p{Lu}|\p{N}/u.test(ch||'');
  K.shorten=specs=>{if(!(K.c<0.995&&specs.length>=2))return specs;specs=specs.slice();const n=specs.length,b=specs[n-1],a=specs[n-2];
      /* прописные/цифры: слишком короткий хвост отбрасывается (иначе закручивался); строчные — только укорачиваются (петли е, з сохраняются) */
      if(capLike&&b&&b.isExt&&Array.isArray(a)&&n>2&&Math.hypot(b[0]-a[0],b[1]-a[1])*kc<K.u*0.5)specs.pop();
      else if(b&&b.isExt&&Array.isArray(a)){const e=[a[0]+(b[0]-a[0])*kc,a[1]+(b[1]-a[1])*kc,a[2]!=null?(a[2]+Math.atan2(b[1]-a[1],b[0]-a[0])/D2R)/2:null];specs[n-1]=e;}
      const f=specs[0],g2=specs[1];if(capLike&&f&&f.isEnt&&Array.isArray(g2)&&specs.length>2&&Math.hypot(g2[0]-f[0],g2[1]-f[1])*kc<K.u*0.5)specs.shift();
      else if(f&&f.isEnt&&Array.isArray(g2)){const e=[g2[0]+(f[0]-g2[0])*kc,g2[1]+(f[1]-g2[1])*kc,g2[2]!=null?(g2[2]+Math.atan2(g2[1]-f[1],g2[0]-f[0])/D2R)/2:null];specs[0]=e;}
      return specs;};
  K.pa=(specs,c0,c1,o)=>SKB.P(K.shorten(specs),c0||'R',c1||'R',Object.assign({tens:K.tens},o||{}));
  const sh=4;const tag=(a,k)=>{if(K.c<0.995)a[k]=1;return a;};
  /* вход: нижний (по умолчанию) или верхний (вариант .hi); при связности < 100 % K.pa укорачивает их по хорде */
  K.ent=()=>tag(K.hi?[-sh,K.yh,0]:[-sh*CA,K.yc-sh*SA,CN_A],'isEnt');
  K.ext=(hi,w)=>{w=w==null?K.w:w;return tag(hi?[w+sh,K.yh,0]:[w+sh*CA,K.yc+sh*SA,CN_A],'isExt');};
  K.cE=K.c>=0.995?'C':'R';
  /* точка пути (по скелету) с заданным x и касательная там: для стыков, идущих вдоль уже нарисованного штриха */
  K.pathAt=(specs,x)=>{const n=skPath(K.shorten(specs),{tens:K.tens});for(let i=0;i<n.length-1;i++){const A=n[i],B=n[i+1],P=[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]];
      if((A.x-x)*(B.x-x)>0)continue;let lo=0,hi=1;for(let k=0;k<40;k++){const m=(lo+hi)/2;if((skBz(P,m)[0]-x)*(A.x-x)>0)lo=m;else hi=m;}const t=(lo+hi)/2,q=skBz(P,t),d=skBzD(P,t);return [q[0],q[1],Math.atan2(d[1],d[0])/D2R];}
    return null;};
  /* вершина: подход по диагонали, тонкий разворот, ствол вниз */
  K.top=(x,y,from)=>{y=y==null?K.ch:y;if(Array.isArray(from))return [[x-K.hx*0.35,K.h*0.5,84],[x,y,null,{c:1,j:'round',di:90,do:-90,w:0}],[x,y-K.u*0.4,-90]];const di=typeof from==='number'?from:(from?73:66);return [[x,y,null,{c:1,j:'round',di,do:-90,w:0}],[x,y-K.u*0.4,-90]];};
  /* разворот вверх-вниз на месте (н, d): вверх по x−1.2d, вниз по x */
  K.pinT=(x,y)=>{y=y==null?K.ch:y;const d=K.d;return [[x-d*1.25,y-d*1.0,90],[x-d*0.6,y,0],[x,y-d*1.0,-90]];};
  /* низ ствола: поворот вправо (к выходу или к следующей вершине) */
  K.turn=x=>[[x,K.B+K.r,-90],[x+K.r,K.B,0]];
  /* низ ствола: тонкий разворот и возврат вверх внутри ствола (арки п, т, р, н) */
  K.pinB=(x,y)=>{y=y==null?K.B:y;const d=K.d;return [[x,y+d*0.9,-90],[x+d*0.4,y,0],[x+d*0.8,y+d*0.9,90]];};
  K.arch=(x0,x1)=>[[x0+K.d*0.8,K.h*0.45,90],[(x0+x1)/2+K.u*0.04,K.ch,0],[x1,K.h*0.5,-90]];
  /* петля выносного влево от ствола x */
  K.loopD=(x,depth)=>{const lr=Math.min(K.u*0.34,K.p.xh*0.21),dd=K.desc*(depth||1);return [[x,-dd*0.42,-90],[x-lr,-dd+K.hy,180],[x-lr*1.9,-dd*0.5,90],[x-lr*0.25,Math.min(-K.u*0.06,-(K.hx+K.hy)*0.55),40]];};
  /* петля восходящего вправо от ствола x: от входа вверх, вниз по стволу */
  K.loopU=(x)=>{const lw=K.u*0.26+K.hx*1.0,a=K.asc;return [[x+lw,K.h*1.08,78],[x+lw*0.45,a-K.hy,180],[x-lw*0.05,a-lw*1.3,-92],[x,K.h*0.55,-90]];};
  /* овал против часовой от верхней правой точки; loop — петелька и верхний выход */
  /* точка средней линии овала (угол в градусах) */
  K.ovPt=(ox,rx,a)=>{const ry=K.h/2+K.ov-K.hy;return [ox+rx*Math.cos(a*D2R),K.h/2+ry*Math.sin(a*D2R)];};
  /* закрытый овал (против часовой — нажим слева) */
  K.oval=(ox,rx)=>K.ov_(ox,K.h/2,rx,K.h/2+K.ov-K.hy);
  /* верхний выход от правой стороны овала */
  K.ovExit=(ox,rx)=>{const P=K.ovPt(ox,rx,8);return K.pa([[P[0],P[1],92],[ox+rx*0.95,K.yh,40],K.ext(true)],'J',K.cE);};
  /* вход, вливающийся в точку средней линии знака: нижний — слева снизу, верхний — сверху */
  K.entTo=(ox,rx,aLo,aHi)=>{const P=K.ovPt(ox,rx,K.hi?(aHi==null?112:aHi):(aLo==null?222:aLo));const s0=K.hi?[0,K.yh]:[0,K.yc];
    const k=K.c>=0.995?-4/Math.hypot(P[0],P[1]-s0[1]):(1-K.c)*0.55;const st=[s0[0]+(P[0]-s0[0])*k,s0[1]+(P[1]-s0[1])*k];
    return K.pa([[st[0],st[1],K.hi?0:CN_A],P],K.cE,'J');};
  K.extFrom=(x,y)=>{const E=[K.w+4*CA,K.yc+4*SA],k=K.c>=0.995?1:1-(1-K.c)*0.55;return K.pa([[x,y,10],[x+(E[0]-x)*k,y+(E[1]-y)*k,CN_A]],'J',K.cE);};
  /* острие в вершине прямой волосной от точки P (касательная — по хорде) */
  K.chordTo=(P,x,y,dout)=>{const a=Math.atan2(y-P[1],x-P[0])/D2R;return [[P[0],P[1],a],[x,y,null,{c:1,j:'round',di:a,do:dout==null?-90:dout,w:0}]];};
  return K;};
const TOPX=new Set([...'овбюobvw']);
const d=(ch,fn,nu,kind,nst)=>{const e=skDef(F,ch,fn,typeof nu==='function'?nu:(p=>Math.max(30,nu*uOf(p))),kind,nst);if(TOPX.has(ch))e.opt=Object.assign({},e.opt,{topExit:true});return e;};
/* ---------- строчные ---------- */
const X0=0.72,EX=0.6;
const wI=n=>X0+(n-1)+0.42+EX;
/* и-образные: вершина, ствол с поворотом … */
const sI=(K,n,o)=>{o=o||{};const xs=[];for(let i=0;i<n;i++)xs.push(K.u*(o.x0||X0)+i*K.u);const sp=[K.ent()];
  xs.forEach((x,i)=>{sp.push(...K.top(x,o.tops&&o.tops[i],i>0?[xs[i-1]+K.r,K.B]:false));if(i<n-1||!o.last)sp.push(...K.turn(x));});
  if(o.last)sp.push(...o.last(xs[n-1]));else sp.push(K.ext(false));
  return K.pa(sp,K.cE,K.cE);};
/* п-образные: ствол до линии, тонкий разворот, арки */
const sN=(K,n,o)=>{o=o||{};const xs=[];for(let i=0;i<n;i++)xs.push(K.u*X0+i*K.u);const out=[];
  const st=[K.ent(),...K.top(xs[0])];
  if(o.first)st.push(...o.first(xs[0]));else st.push([xs[0],K.h*0.45,-90],[xs[0],K.hx,-90]);
  out.push(K.pa(st,K.cE,'R'));
  for(let i=1;i<n;i++){const sp=[[xs[i-1],K.h*0.3,90],...K.arch(xs[i-1],xs[i]).map((q,j)=>j===0?[xs[i-1]+K.hx*0.2,K.h*0.5,88]:q)];
    if(i<n-1){sp.push([xs[i],K.hx,-90]);out.push(K.pa(sp,'J','R'));}
    else{sp.push(...K.turn(xs[i]),K.ext(false));out.push(K.pa(sp,'J',K.cE));}}
  return out;};
d('u',K=>[sI(K,2)],wI(2),'xh',2);d('и',K=>[sI(K,2)],wI(2),'xh',2);d('ш',K=>[sI(K,3)],wI(3),'xh',3);
const tailD=(K,x)=>{const dd=K.desc*0.5;return K.pa([[x,K.B+K.r*0.9,-90],[x+K.r*1.0,-dd*0.5,-84],[x+K.r*0.8,-dd,180],[x+K.r*0.35,-dd*0.72,95]],'J','D');};
d('ц',K=>[sI(K,2),tailD(K,K.u*(X0+1))],wI(2),'xh',2);
d('щ',K=>[sI(K,3),tailD(K,K.u*(X0+2))],wI(3),'xh',3);
d('ч',K=>{const {u,h}=K,x0=u*X0,x1=x0+u;return [K.pa([K.ent(),...K.top(x0),[x0,h*0.66,-90],[x0+u*0.45,h*0.4,0],...K.top(x1,null,[x0+u*0.45,h*0.4]),...K.turn(x1),K.ext(false)],K.cE,K.cE)];},wI(2),'xh',2);
d('y',K=>[sI(K,2,{last:x=>[...K.loopD(x),K.ext(false)]})],wI(2),'xh',2);
d('n',K=>sN(K,2),wI(2),'xh',2);d('п',K=>sN(K,2),wI(2),'xh',2);
d('m',K=>sN(K,3),wI(3),'xh',3);d('т',K=>sN(K,3),wI(3),'xh',3);
d('p',K=>sN(K,2,{first:x=>[[x,-K.desc*0.5,-90],[x,-K.desc+K.hx,-90]]}),wI(2),'xh',2);
/* л, м: крючок внизу слева */
const lStart=(K)=>K.hi?[K.ent(),[K.u*0.3,K.h*0.3,-80],[K.u*0.46,K.Bd+K.hy*0.2,10]]:(K.p.stem>F.S0+12?[K.ent()]:[K.ent(),[K.u*0.27,K.h*0.17,-80],[K.u*0.46,K.Bd+K.hy*0.2,10]]);/* тяжёлое перо: вместо мелкого завитка — простая ложбинка (завиток заливался в кляксу) */
d('л',K=>{const x0=K.u*1.1;return [K.pa([...lStart(K),...K.top(x0),...K.turn(x0),K.ext(false)],K.cE,K.cE)];},1.1+0.42+EX,'xh',2);
d('м',K=>{const x0=K.u*1.1,x1=x0+K.u;return [K.pa([...lStart(K),...K.top(x0),[x0,K.Bd+K.d+(K.Bd-K.B),-90],[x0+K.d*0.7+(K.Bd-K.B),K.Bd,0],...K.top(x1,null,[x0+K.d*0.7,K.B]),...K.turn(x1),K.ext(false)],K.cE,K.cE)];},2.1+0.42+EX,'xh',3);
/* н, ю */
d('н',K=>{const {u,h}=K,x0=u*X0,x1=x0+u;return [K.pa([K.ent(),...K.top(x0),[x0,h*0.5,-90],[x0,K.hx,-90]],K.cE,'R'),K.pa([[x0,h*0.48,5],[x1,h*0.5,5]],'J','J'),
  K.pa([[x1,K.ch,-90,{w:0}],[x1,h*0.5,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},wI(2),'xh',2);
d('ю',K=>{const {u,h}=K,x0=u*X0,rx=u*0.48,ox=x0+u*0.6+rx;
  return [K.pa([K.ent(),...K.top(x0),[x0,h*0.5,-90],[x0,K.hx,-90]],K.cE,'R'),K.pa([[x0,h*0.5,0],K.ovPt(ox,rx,180)],'J','J'),K.oval(ox,rx),K.ovExit(ox,rx)];},X0+0.6+0.96+0.55,'xh',3);
/* а д g q d: овал и ствол одним ходом */
const oA=(K,o)=>{o=o||{};const {u,h}=K,rx=u*0.5,ox=u*0.55+rx,xs=ox+rx;
  const top=o.tall?K.asc:K.h;const sp=[[xs-K.d*0.3,top-K.hy,-88,{w:0}],[xs,top-K.hy-K.u*0.4,-90]];
  if(o.loop)sp.push(...K.loopD(xs),K.ext(false));
  else if(o.q){const lr=u*0.3,dd=K.desc;sp.push([xs,-dd*0.55,-90],[xs+lr,-dd+K.hy,0],[xs+lr*1.6,-dd*0.42,90],K.ext(false));}
  else sp.push(...K.turn(xs),K.ext(false));
  return [K.entTo(ox,rx,null,140),K.oval(ox,rx),K.pa(sp,'R',K.cE)];};
const wA=0.55+1+0.42+EX;
d('a',K=>oA(K),wA,'xh',2);d('d',K=>oA(K,{tall:1}),wA,'xh',2);d('g',K=>oA(K,{loop:1}),wA,'xh',2);d('д',K=>oA(K,{loop:1}),wA,'xh',2);d('q',K=>oA(K,{q:1}),wA,'xh',2);
/* о, с, е, э */
d('o',K=>{const {u}=K,rx=u*0.5,ox=u*0.55+rx;return [K.entTo(ox,rx),K.oval(ox,rx),K.ovExit(ox,rx)];},0.55+1+0.6,'xh',2);
d('c',K=>{const {u,h}=K,rx=u*0.5,ox=u*0.55+rx,P=K.ovPt(ox,rx,150),Q=K.ovPt(ox,rx,40);
  return [K.entTo(ox,rx,222,150),K.pa([[Q[0],Q[1],110],[ox+rx*0.05,K.ch+K.ov,180],[ox-rx,h/2,-90],[ox+rx*0.1,K.B-K.ov,0],K.ext(false)],'D',K.cE)];},0.55+1+0.55,'xh',2);
d('e',K=>{const {u,h}=K,rx=u*0.46,ox=u*0.45+rx;const st=K.hi?[K.ent(),[ox-rx*0.6,h*0.46,-30]]:[K.ent(),[ox-rx*0.55,h*0.4]];
  return [K.pa([...st,[ox+rx*0.75,h*0.72,80],[ox,K.ch+K.ov,180],[ox-rx,h*0.47,-90],[ox+rx*0.15,K.B-K.ov,0],K.ext(false)],K.cE,K.cE)];},0.45+0.92+0.62,'xh',2);
d('э',K=>{const {u,h}=K,rx=u*0.52,ox=u*0.55+rx;
  return [K.pa([K.ent(),[ox-rx*0.72,h*0.74,75],[ox-rx*0.05,K.ch+K.ov,0],[ox+rx,h/2,-90],[ox,K.B-K.ov,180],[ox-rx*0.82,h*0.2,115]],K.cE,'D'),
    K.pa([[ox-rx*0.3,h*0.49],[ox+rx-K.hx*0.5,h*0.5]],'R','J'),K.extFrom(ox+rx*0.35,K.B+K.hy*0.5)];},0.55+1.04+0.55,'xh',2);
/* ь ъ ы б в */
/* выход мягкого знака начинается точно на скелете чаши (иначе при тонкой волосной хвост отрывается) */
const softX=(K,x0,rb)=>{const q=K.pathAt(softB(K,x0,rb).slice(0,3),x0+rb*1.3);return K.extFrom(...(q?[q[0],q[1]]:[x0+rb*1.6,K.h*0.07]));};
const softB=(K,x0,rb)=>{rb=Math.max(rb,K.hx*0.95+K.u*0.15);/* тяжёлое перо: чаша не заливается */return [[x0,K.B+K.r*0.9,-90],[x0+K.r,K.B,0],[x0+rb*2-K.hx,K.h*0.24,90],[x0+rb,K.h*0.48,180],[x0+K.hx*0.3,K.h*0.33,-100]];};
const stemTop=(K,x0)=>[K.ent(),...K.top(x0),[x0,K.h*0.5,-90]];
d('ь',K=>{const {u}=K,x0=u*X0,rb=u*0.42;return [K.pa([...stemTop(K,x0),...softB(K,x0,rb)],K.cE,'J'),softX(K,x0,rb)];},X0+0.84+0.5,'xh',2);
d('ъ',K=>{const {u,h}=K,x0=u*1.0,rb=u*0.42;const st=K.hi?[K.ent(),[u*0.55,K.ch,0]]:[K.ent(),[u*0.25,h*0.78,75],[u*0.55,K.ch,0]];
  return [K.pa([...st,[x0,K.ch,null,{c:1,j:'round',di:0,do:-90,w:0}],[x0,h*0.5,-90],...softB(K,x0,rb)],K.cE,'J'),softX(K,x0,rb)];},1.0+0.84+0.5,'xh',2);
d('ы',K=>{const {u}=K,x0=u*X0,rb=u*0.4,x1=x0+u*1.25;return [K.pa([...stemTop(K,x0),...softB(K,x0,rb)],K.cE,'J'),
  K.pa([[x1-K.d*0.8,K.ch,0,{w:0}],[x1,K.ch-K.d*1.05,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},X0+1.25+0.42+EX,'xh',3);
d('в',K=>{const {u,h}=K,x0=u*X0,rb=u*0.44+K.hx*0.15;
  return [K.pa([...stemTop(K,x0),[x0,K.B+K.r*0.9,-90],[x0+K.r,K.B,0],[x0+rb*2-K.hx,h*0.25,90],[x0+rb*0.8,h*0.5,180],[x0+K.hx*0.35,h*0.52,null,{c:1,j:'round',di:180,do:40}],
    [x0+rb*1.75,h*0.75,90],[x0+rb*0.9,K.ch,180],[x0+K.hx*0.3,h*0.8,-110]],K.cE,'J'),K.pa([[x0+rb*1.75,h*0.72,90],[x0+rb*1.9,K.yh,30],K.ext(true)],'J',K.cE)];},X0+0.88+0.55,'xh',2);
d('б',K=>{const {u,h}=K,rx=u*0.5,ox=u*0.55+rx,P=K.ovPt(ox,rx,25);return [K.entTo(ox,rx),K.oval(ox,rx),K.ovExit(ox,rx),
  K.pa([[P[0],P[1],100],[ox+rx*0.86,h*1.25,98],[ox+rx*1.2,K.asc-K.hy,10],[ox+rx*1.7,K.asc-K.hy-u*0.1,-25]],'J','R')];},0.55+1+0.6,'xh',2);
/* г з ж х к */
d('г',K=>{const {u,h}=K,x0=u*0.5;return [K.pa([K.ent(),[x0,h*0.72,75],[x0+u*0.45,K.ch,0],[x0+u*0.85,h*0.7,-90],[x0+u*0.55,h*0.22,-120],[x0+u*0.22,K.B,180],[x0-K.hx*0.2,h*0.16,100]],K.cE,'D'),K.extFrom(x0+u*0.3,K.B+K.hy*0.6)];},0.5+0.85+0.75,'xh',2);
d('з',K=>{const {u,h}=K,x0=u*0.45,dd=K.desc;
  return [K.pa([K.ent(),[x0,h*0.74,80],[x0+u*0.42,K.ch,0],[x0+u*0.82,h*0.76,-90],[x0+u*0.42,h*0.52,null,{c:1,j:'round',di:190,do:-10}],[x0+u*0.88,h*0.15,-90],[x0+u*0.62,-dd*0.45,-110],[x0+u*0.3,-dd+K.hy,180],[Math.min(x0+u*0.05,x0+u*0.62-K.hx*2.0-u*0.1),-dd*0.6,90],[x0+u*0.6,-u*0.05,40],K.ext(false)],K.cE,K.cE)];},0.45+0.88+0.7,'xh',2);
/* ɔ и c: половины х и ж; нажим ослаблен, чтобы в середине не было кома */
const halfL=(K,a,xb,withEnt)=>{const {h}=K,w=xb-a;const sp=withEnt?[K.ent(),[a+w*0.15,h*0.7,72]]:[[a+w*0.08,h*0.8,70]];
  return K.pa([...sp,[a+w*0.52,K.ch,0],[xb,h*0.5,-90,{w:0.72}],[a+w*0.5,K.B,180],[a+w*0.18,K.B+K.u*0.12,150]],withEnt?K.cE:'D','D');};
const halfR=(K,xb,b)=>{const {h}=K,w=b-xb;return K.pa([[b-w*0.08,h*0.8,110],[b-w*0.5,K.ch,180],[xb,h*0.5,-90,{w:0.72}],[b-w*0.48,K.B,0],K.ext(false)],'D',K.cE);};
/* зазор половин ж от ствола: ствол + толщина половины + просвет — растёт с нажимом */
const zG=K=>K.hx+(K.hy+(K.hx-K.hy)*0.72)+K.u*0.13;
d('x',K=>{const {u}=K,a=u*0.3,cx=a+u*0.78,g=K.hx*0.3;return [halfL(K,a,cx-g,true),halfR(K,cx+g,cx+u*0.78)];},0.3+1.56+0.4,'xh',2);
d('ж',K=>{const {u}=K,cx=u*0.3+u*0.8+zG(K),g=zG(K);return [halfL(K,u*0.3,cx-g,true),K.pa([[cx,K.ch,-90,{w:0}],[cx,K.h*0.5,-90],[cx,K.hx,-90]],'R','R'),halfR(K,cx+g,cx+g+u*0.8)];},p=>(0.3+1.6+0.4)*uOf(p)+2*(p.stem/2+(p.hair/2+(p.stem-p.hair)/2*0.72)+uOf(p)*0.13),'xh',3);
const kArm=(K,x0,xr)=>{const {h}=K;xr+=K.hx*0.5;return [[xr,h*0.82,95],[Math.max(xr-K.u*0.25,x0+K.hx*2.8+K.u*0.3),K.ch,180],[x0+K.u*0.35,h*0.62,-140],[x0+K.hx*0.45,h*0.46,null,{c:1,j:'round',di:-160,do:-30}],[xr-K.u*0.25,h*0.18,-65],[xr,K.B,0],K.ext(false)];};
d('k',K=>{const x0=K.u*X0;return [K.pa([K.ent(),...K.top(x0,K.asc-K.hy,[0,0]),[x0,K.hx,-90]],K.cE,'R')/* вход вливается в ствол (без узкой щели вдоль ствола) */,K.pa(kArm(K,x0,x0+K.u*1.0),'D',K.cE)];},X0+1.0+EX,'xh',2);
d('к',K=>{const x0=K.u*X0;return [K.pa([K.ent(),...K.top(x0),[x0,K.hx,-90]],K.cE,'R'),K.pa(kArm(K,x0,x0+K.u*1.0),'D',K.cE)];},X0+1.0+EX,'xh',2);
/* l h b f */
d('l',K=>{const x0=K.u*X0;return [K.pa([K.ent(),...K.loopU(x0),...K.turn(x0),K.ext(false)],K.cE,K.cE)];},X0+0.42+EX,'xh',1);
d('h',K=>{const {u,h}=K,x0=u*X0,x1=x0+u,lp=K.loopU(x0);const X=K.pathAt([K.ent(),lp[0]],x0+K.hx*0.3)||[x0,h*0.55,50];return [K.pa([K.ent(),...lp,[x0,K.hx,-90]],K.cE,'R'),K.pa([X,[(x0+x1)/2+u*0.06,K.ch,0],[x1,h*0.5,-90],...K.turn(x1),K.ext(false)],'J',K.cE)];},wI(2),'xh',2);
d('b',K=>{const {u,h}=K,x0=u*X0,rb=u*0.44;return [K.pa([K.ent(),...K.loopU(x0),[x0,K.B+K.r*0.9,-90],[x0+K.r,K.B,0],[x0+rb*2-K.hx,h*0.42,90],[x0+rb,K.ch,180],[x0+K.hx*0.5,h*0.8,-110],[x0+rb*0.75,h*0.66,10],K.ext(true)],K.cE,K.cE)];},X0+0.88+0.55,'xh',2);
d('f',K=>{const {u,h}=K,x0=u*X0,lr=u*0.3,dd=K.desc;return [K.pa([K.ent(),...K.loopU(x0),[x0,-dd*0.55,-90],[x0+lr,-dd+K.hy,0],[x0+lr*1.8,-dd*0.45,90],[x0+lr*0.8,K.yc*0.3,120]],K.cE,'D'),K.extFrom(x0+K.hx*0.6,K.yc*0.4)];},X0+0.65+EX,'xh',2);
/* i j t r s v w z */
const dotI=(K,x)=>K.dot(x+K.u*0.1,K.h+K.u*0.45,K.dr()*0.8);
d('i',K=>{const x0=K.u*X0;return [sI(K,1),dotI(K,x0)];},X0+0.42+EX,'xh',1);
d('ı',K=>[sI(K,1)],X0+0.42+EX,'xh',1);
d('j',K=>{const x0=K.u*0.92;return [sI(K,1,{x0:0.92,last:x=>[...K.loopD(x),K.ext(false)]}),dotI(K,x0)];},0.92+EX+0.1,'xh',1);
d('t',K=>{const {u,h}=K,x0=u*X0,top=h+(K.asc-h)*0.55;return [sI(K,1,{tops:[top]}),K.pa([[x0+K.hx*0.5,h*0.98],[x0+u*0.6,h*1.0]],'J','R')];},X0+0.42+EX,'xh',1);
d('r',K=>{const {u,h}=K,x0=u*0.62,x1=x0+u*0.42;
  return [K.pa([K.ent(),[x0-K.d*2.1,h*0.72,70],[x0,K.ch+K.ov*0.5,30],[x0+u*0.22,h*0.92,-5],[x1,h*0.9,null,{c:1,j:'round',di:-10,do:-92,w:0}],[x1,h*0.5,-90],...K.turn(x1),K.ext(false)],K.cE,K.cE)];},0.62+0.42+0.42+EX,'xh',1);
d('s',K=>{const {u,h}=K,x1=u*0.85;return [K.pa([K.ent(),[x1-K.d*1.5,h*0.75,70],[x1,K.ch+K.ov,null,{c:1,j:'round',di:70,do:-55,w:0}],[x1+u*0.3,h*0.4,-90],[x1-u*0.05,K.B,180],[x1-u*0.3,h*0.13,145]],K.cE,'D'),K.extFrom(x1,K.hy*1.2)];},0.85+0.35+0.55,'xh',2);
/* v, w: нижний поворот, подъём к верху справа, петелька и верхний выход */
const vEnd=(K,x1)=>{const {h,u}=K;return [[x1,h*0.45,86],[x1+u*0.12,K.yh,12],K.ext(true)];};
d('v',K=>{const {u}=K,x0=u*X0,x1=x0+u*0.95;return [K.pa([K.ent(),...K.top(x0),...K.turn(x0),...vEnd(K,x1)],K.cE,K.cE)];},X0+0.95+0.6,'xh',2);
d('w',K=>{const {u}=K,x0=u*X0,x1=x0+u,x2=x1+u*0.95;return [K.pa([K.ent(),...K.top(x0),...K.turn(x0),...K.top(x1,null,[x0+K.r,K.B]),...K.turn(x1),...vEnd(K,x2)],K.cE,K.cE)];},X0+1.95+0.6,'xh',3);
d('z',K=>{const {u,h}=K;return [K.pa([K.ent(),[u*0.35,h*0.75,80],[u*0.75,K.ch,0],[u*1.2,h*0.85,null,{c:1,j:'round',di:-30,do:-125}],[u*0.6,K.hx,null,{c:1,j:'round',di:-125,do:5}],[u*0.95,K.B+K.u*0.02,5],[u*1.2,h*0.06,30],K.ext(false)],K.cE,K.cE)];},1.6,'xh',1);
/* ф я є ґ */
d('ф',K=>{const {u,h}=K,cx=u*1.45,r=u*0.5,ry=h/2+K.ov-K.hy;return [K.entTo(cx-r,r),K.ov_(cx-r,h/2,r,ry),K.ov_(cx+r,h/2,r,ry),
  K.pa([[cx,K.asc-K.hy,-90,{w:0}],[cx,h,-90],[cx,-K.desc+K.hx,-90]],'R','R'),K.extFrom(...K.ovPt(cx+r,r,292))];},2.95,'xh',3);
d('я',K=>{const {u,h}=K,rx=u*0.45,ox=u*0.55+rx,oy=h*0.7,ry=h*0.3-K.hy,x1=ox+rx;const P=[ox+rx*Math.cos(230*D2R),oy+ry*Math.sin(230*D2R)],Q=[ox+rx*Math.cos(110*D2R),oy+ry*Math.sin(110*D2R)];
  const s0=K.hi?[0,K.yh]:[0,K.yc],T=K.hi?Q:P,k=K.c>=0.995?-4/Math.hypot(T[0],T[1]-s0[1]):(1-K.c)*0.55,st=[s0[0]+(T[0]-s0[0])*k,s0[1]+(T[1]-s0[1])*k];
  return [K.pa([[st[0],st[1],K.hi?0:CN_A],T],K.cE,'J'),...(K.hi?[K.pa([[u*0.15,K.B+K.d,-150],P],'D','J')]:[]),K.ov_(ox,oy,rx,ry),K.pa([[ox+rx*Math.cos(62*D2R),oy+ry*Math.sin(62*D2R),Math.atan2(-ry*Math.cos(62*D2R),rx*Math.sin(62*D2R))/D2R,{w:0}],[x1,oy,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},0.55+0.9+0.42+EX,'xh',2);/* ствол я выходит из овала по его скелету: без завитка, который замыкал щель */
d('є',K=>{const {u,h}=K,rx=u*0.5,ox=u*0.55+rx;const b=F.GL['c'].skel(K.g);return b.concat([K.pa([[ox-rx+K.hx,h*0.5],[ox+rx*0.35,h*0.52]],'J','R')]);},0.55+1+0.55,'xh',2);
d('ґ',K=>{const {u,h}=K,x0=u*0.5;const b=F.GL['г'].skel(K.g);return b.concat([K.pa([[x0+u*0.6,K.ch+K.hy],[x0+u*0.75,h*1.2,80]],'J','R')]);},0.5+0.85+0.75,'xh',2);
/* ---------- прописные ---------- */
const PADC=0.35;
/* поля прописных и цифр растут с нажимом: капли и петли тяжёлого пера не выходят за поля */
const wPad=p=>Math.max(0,p.stem-F.S0)*0.6;
const capW=(nu,ex)=>p=>Math.max(30,(nu+PADC+(ex?0:PADC))*uOf(p))+wPad(p)*(ex?1:2);
const dc=(ch,fn,nu,ex,nst)=>skDef(F,ch,K=>{K.L0=K.u*PADC+wPad(K.p);K.hi=false;return fn(K);},typeof nu==='function'?(p=>nu(p)+wPad(p)*2):capW(nu,ex),'cap',nst==null?2:nst);
/* завиток над стволом прописной слева (при малых росчерках — без завитка) */
const curlC=(K,x0,dn)=>{const f=K.u*0.3*Math.max(0.4,K.fl),cw=Math.max(f*1.8,K.hx+K.u*0.28);return K.fl>0.2?[[x0-cw,K.h*0.82,92],[x0-cw*0.5,K.ch,0],[x0,K.ch-cw*0.45,dn||-90]]:[[x0,K.ch,dn||-90,{w:0}]];};
/* ствол прописной: завиток сверху слева, крючок внизу влево */
const stemC=(K,x,o)=>{o=o||{};const {h}=K,f=K.u*0.38*Math.max(0.35,K.fl),rb=K.u*0.36;const sp=[];
  if(o.curl!==false&&K.fl>0.2){const cw=Math.max(f*1.7,K.hx+K.u*0.28);sp.push([x-cw,h*0.8,92],[x-cw*0.5,K.ch,0],[x,K.ch-cw*0.45,-90]);}else sp.push([x,K.ch,-90,{w:0}]);
  sp.push([x,h*0.5,-90]);
  if(o.end)sp.push(...o.end);else sp.push([x,K.B+rb,-90],[x-rb,K.B,180],[x-rb*1.75,K.B+rb*0.8,105]);
  return K.pa(sp,'D',o.end&&o.endCap?o.endCap:'D');};
const wave=(K,x0,x1,y,xs)=>{y=y==null?K.ch:y;const w=x1-x0,a=K.u*0.12*Math.max(0.5,K.fl);const sp=[[x0,y-a*1.8,75],[x0+w*0.28,y,-4]];if(xs!=null&&xs>x0+w*0.32&&xs<x0+w*0.62)sp.push([xs,y-a*0.3,-2]);sp.push([x0+w*0.66,y-a*0.5,2],[x1,y+a*0.3,30]);return K.pa(sp,'D','R');};
const waveY=(K)=>K.ch-K.u*0.12*Math.max(0.5,K.fl)*0.3;
const capU=(K,o)=>{o=o||{};const {h,u}=K,x0=K.L0+u*0.75,x1=x0+u*1.5;const f=u*0.3*Math.max(0.4,K.fl);
  const cw=Math.max(f*1.8,K.hx+K.u*0.28);const sp=[...(K.fl>0.2?[[x0-cw,h*0.82,92],[x0-cw*0.5,K.ch,0],[x0,K.ch-cw*0.45,-90]]:[[x0,K.ch,-90,{w:0}]]),[x0,K.B+K.r*1.2,-90],[x0+K.r*1.2,K.B,0],...K.top(x1,null,[x0+K.r*1.2,K.B])];
  if(o.last)sp.push(...o.last(x1));else sp.push(...K.turn(x1),K.ext(false));
  return [K.pa(sp,'D',K.cE)];};
dc('U',K=>capU(K),0.75+1.5+0.42+EX,1,2);dc('И',K=>capU(K),0.75+1.5+0.42+EX,1,2);
dc('Y',K=>capU(K,{last:x=>[...K.loopD(x),K.ext(false)]}),0.75+1.5+0.42+EX,1,2);dc('У',K=>capU(K,{last:x=>[...K.loopD(x),K.ext(false)]}),0.75+1.5+0.42+EX,1,2);
dc('Ч',K=>{const {h,u}=K,x0=K.L0+u*0.75,x1=x0+u*1.4,f=u*0.3*Math.max(0.4,K.fl);
  return [K.pa([...curlC(K,x0),[x0,h*0.6,-90],[x0+u*0.6,h*0.4,0],...K.top(x1,null,[x0+u*0.6,h*0.4]),...K.turn(x1),K.ext(false)],'D',K.cE)];},0.75+1.4+0.42+EX,1,2);
dc('Ш',K=>{const {h,u}=K,x0=K.L0+u*0.75,x1=x0+u*1.2,x2=x1+u*1.2,f=u*0.3*Math.max(0.4,K.fl);
  return [K.pa([...curlC(K,x0),[x0,K.B+K.r*1.2,-90],[x0+K.r*1.2,K.B,0],...K.top(x1,null,[x0+K.r*1.2,K.B]),...K.turn(x1),...K.top(x2,null,[x1+K.r,K.B]),...K.turn(x2),K.ext(false)],'D',K.cE)];},0.75+2.4+0.42+EX,1,3);
dc('Ц',K=>capU(K,{last:x=>[...K.loopD(x,0.62),K.ext(false)]}),0.75+1.5+0.42+EX,1,2);
dc('Щ',K=>{const {h,u}=K,x0=K.L0+u*0.75,x1=x0+u*1.2,x2=x1+u*1.2,f=u*0.3*Math.max(0.4,K.fl);
  return [K.pa([...curlC(K,x0),[x0,K.B+K.r*1.2,-90],[x0+K.r*1.2,K.B,0],...K.top(x1,null,[x0+K.r*1.2,K.B]),...K.turn(x1),...K.top(x2,null,[x1+K.r,K.B]),...K.turn(x2),K.ext(false)],'D',K.cE),tailD(K,x2)];},0.75+2.4+0.42+EX,1,3);
dc('A',K=>{const {h,u}=K,x0=K.L0,xa=x0+u*1.15,xs=xa+u*0.3,P=[x0+u*0.22,K.B+K.hy*1.5];const a2=Math.atan2(h*0.45-K.ch,xs-xa)/D2R;
  return [K.pa([...K.chordTo(P,xa,K.ch,a2),[xs,h*0.45,-87],[xs+u*0.03,K.B+K.r,-90],[xs+u*0.03+K.r,K.B,0],K.ext(false)],'R',K.cE),
    K.pa([[x0+u*0.45,h*0.38],[xs+u*0.15,h*0.42]],'R','R')];},1.45+0.42+EX,1,2);
dc('Л',K=>{const {h,u}=K,x0=K.L0,xa=x0+u*1.25;return [K.pa([[x0+u*0.05,Math.max(h*0.14,K.Bd+K.hx*1.5),-100],[x0+u*0.3,K.Bd,0],[x0+u*0.85,h*0.5,62],...K.top(xa),...K.turn(xa),K.ext(false)],'D',K.cE)];},1.25+0.42+EX,1,2);
/* острый угол между восходящей диагональю и стволом M: волосная перемычка по биссектрисе заполняет самый кончик щели
   (иначе при некоторых параметрах кончик отрывается в крошечный просвет) */
const mWeb=(K,x3,a3)=>{const hb=((a3-180)+(-90))/2*D2R,half=Math.abs((a3-180)-(-90))/2*D2R,L=(K.hx+K.hy)/Math.max(0.05,Math.sin(half))*0.45;
  return K.pa([[x3,K.ch-K.hy,null,{w:0}],[x3+Math.cos(hb)*L,K.ch-K.hy+Math.sin(hb)*L,null,{w:0}]],'R','R');};
dc('M',K=>{const {h,u}=K,x0=K.L0,eM=Math.min(u*0.35,Math.max(0,K.hx*2.2+u*0.25-u*0.55,(K.ch-K.hx)*0.24-u*0.55)),x1=x0+u*0.85-eM*0.3,x2=x1+u*0.7-eM*0.7,x3=x1+eM*0.3+u*1.25,P=[x0+u*0.22,K.B+K.hy*1.5];const a2=Math.atan2(K.hx-K.ch,x2-x1)/D2R,a3=Math.atan2(K.ch-K.hx,x3-x2)/D2R;
  return [K.pa([...K.chordTo(P,x1,K.ch,a2),[x2,K.hx,null,{c:1,j:'round',di:a2,do:a3}],[x3,K.ch,null,{c:1,j:'round',di:a3,do:-90,w:0}],[x3,h*0.5,-90],...K.turn(x3),K.ext(false)],'R',K.cE),mWeb(K,x3,a3)];},2.1+0.42+EX,1,3);
dc('N',K=>{const {h,u}=K,x0=K.L0,x1=x0+u*0.9,x2=x1+u*1.0,P=[x0+u*0.22,K.B+K.hy*1.5];const a2=Math.atan2(K.hx-K.ch,x2-x1)/D2R,a3=Math.atan2(K.ch-K.hx,u*0.12)/D2R;
  return [K.pa([...K.chordTo(P,x1,K.ch,a2),[x2,K.hx,null,{c:1,j:'round',di:a2,do:a3}],[x2+u*0.12,K.ch-u*0.05,a3]],'R','D')];},2.15,0,2);
dc('V',K=>{const {h,u}=K,x0=K.L0+u*0.6,x1=x0+u*0.55,x2=x1+u*0.75;return [K.pa([...curlC(K,x0,-80),[x1,K.hx,null,{c:1,j:'round',di:-80,do:Math.atan2(K.ch-K.hx,x2-x1)/D2R}],[x2,K.ch-K.u*0.05,72]],'D','D')];},2.0,0,2);
dc('W',K=>{const {h,u}=K,x0=K.L0+u*0.6,x1=x0+u*0.5,x2=x1+u*0.5,x3=x2+u*0.5,x4=x3+u*0.6,y2=K.ch*0.86;const a1=Math.atan2(y2-K.hx,x2-x1)/D2R,a2=Math.atan2(K.hx-y2,x3-x2)/D2R,a3=Math.atan2(K.ch-K.hx,x4-x3)/D2R;
  return [K.pa([...curlC(K,x0,-80),[x1,K.hx,null,{c:1,j:'round',di:-80,do:a1}],[x2,y2,null,{c:1,j:'round',di:a1,do:a2,w:0}],[x3,K.hx,null,{c:1,j:'round',di:a2,do:a3}],[x4,K.ch-u*0.05,72]],'D','D')];},2.8,0,3);
dc('H',K=>{const {h,u}=K,x0=K.L0+u*0.75,x1=x0+u*1.3;return [stemC(K,x0),K.pa([[x1-K.d*0.8,K.ch,0,{w:0}],[x1,K.ch-K.d*1.05,-90],...K.turn(x1),K.ext(false)],'R',K.cE),K.pa([[x0,h*0.46],[x0+u*0.6,h*0.5,8],[x1,h*0.49]],'J','J')];},0.75+1.3+0.42+EX,1,2);
dc('K',K=>{const x0=K.L0+K.u*0.75;return [stemC(K,x0),K.pa(kArm(K,x0,x0+K.u*1.1),'D',K.cE)];},0.75+1.15+EX,1,2);
dc('I',K=>[stemC(K,K.L0+K.u*0.85)],1.0,0,1);
dc('J',K=>{const x=K.L0+K.u*0.85;return [stemC(K,x,{end:K.loopD(x).slice(1).concat([[x+K.u*0.15,K.B+K.u*0.2,40]]),endCap:'D'})];},1.05,0,1);
/* Т/T: волна с каплей слева, ствол из-под волны чуть вогнут, крючок влево */
const capT=(K,x0,xw0,xw1)=>{const {u,h}=K,rb=u*0.34,xs=x0+u*0.1;return [wave(K,xw0,xw1,null,xs),K.pa([[xs,waveY(K),-100,{w:0}],[x0,h*0.5,-93],[x0-u*0.06,K.B+rb,-98],[x0-rb,K.B,180],[x0-rb*1.75,K.B+rb*0.8,105]],'R','D')];};
dc('T',K=>{const {u}=K;return capT(K,K.L0+u*1.0,K.L0,K.L0+u*2.2);},2.2,0,1);
dc('F',K=>{const {u,h}=K,x0=K.L0+u*1.0;return [...capT(K,x0,K.L0,K.L0+u*2.2),K.pa([[x0-u*0.35,h*0.46],[x0+u*0.45,h*0.48]],'R','R')];},2.2,0,1);
dc('Г',K=>{const {u}=K,x0=K.L0+u*0.75;return [stemC(K,x0),wave(K,x0-u*0.1,K.L0+u*1.85)];},1.85,0,1);
dc('Ґ',K=>{const {u}=K,x0=K.L0+u*0.75,x1=K.L0+u*1.85;return [stemC(K,x0),wave(K,x0-u*0.1,x1),K.pa([[x1-K.hx,K.ch],[x1+u*0.05,K.ch+K.capH*0.14,85]],'J','R')];},1.95,0,1);
dc('П',K=>{const {u}=K,x0=K.L0+u*0.75,x1=x0+u*1.3;return [stemC(K,x0),wave(K,x0-u*0.15,x1+u*0.1),K.pa([[x1-K.d*0.8,K.ch,0,{w:0}],[x1,K.ch-K.d*1.05,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},0.75+1.3+0.42+EX,1,2);
const capBowl=(K,x0,y0,y1,xr)=>[[x0,y1-K.u*0.2,70],[x0+K.u*0.25,y1,0],[xr,(y0+y1)/2,-90],[x0+K.u*0.15,y0,180],[x0-K.u*0.02,y0+K.u*0.06]];
dc('P',K=>{const {u,h}=K,x0=K.L0+u*0.75;return [stemC(K,x0),K.pa(capBowl(K,x0,h*0.44,K.ch,x0+u*1.15),'R','J')];},1.95,0,2);
dc('R',K=>{const {u,h}=K,x0=K.L0+u*0.75;const b=capBowl(K,x0,h*0.44,K.ch,x0+u*1.15);b.pop();b[b.length-1]=[x0+u*0.12,h*0.44,null,{c:1,j:'round',di:180,do:-35}];
  return [stemC(K,x0),K.pa([...b,[x0+u*0.85,h*0.15,-70],[x0+u*1.05,K.B,0],K.ext(false)],'R',K.cE)];},0.75+1.15+EX,1,2);
dc('B',K=>{const {u,h}=K,x0=K.L0+u*0.75;
  return [stemC(K,x0),K.pa([[x0,K.ch-u*0.2,70],[x0+u*0.25,K.ch,0],[x0+u*1.0,h*0.77,-90],[x0+K.hx*0.4,h*0.53,null,{c:1,j:'round',di:180,do:0}],[x0+u*1.15,h*0.27,-90],[x0+u*0.25,K.B,180],[x0+K.hx*0.2,K.B+u*0.12,150]],'J','J')];},1.95,0,2);
const softC=(K,x0,rw)=>[[x0,K.B+K.u*0.25,-90],[x0+K.u*0.3,K.B,0],[x0+K.u*rw,K.h*0.24,90],[x0+K.u*0.4,K.h*0.5,180],[x0+K.hx*0.3,K.h*0.4,-100]];
dc('Ь',K=>{const x0=K.L0+K.u*0.75;return [stemC(K,x0,{end:softC(K,x0,1.05),endCap:'J'})];},1.85,0,2);
dc('Ъ',K=>{const {u}=K,x0=K.L0+u*1.15;return [wave(K,K.L0,x0+u*0.1),stemC(K,x0,{curl:false,end:softC(K,x0,1.05),endCap:'J'})];},2.25,0,2);
dc('Ы',K=>{const {u}=K,x0=K.L0+u*0.75,x1=x0+u*1.5;return [stemC(K,x0,{end:softC(K,x0,0.95),endCap:'J'}),K.pa([[x1-K.d*0.8,K.ch,0,{w:0}],[x1,K.ch-K.d*1.05,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},0.75+1.5+0.42+EX,1,3);
dc('Ю',K=>{const {u,h}=K,x0=K.L0+u*0.75,rx=u*0.65,ox=x0+u*0.55+rx;return [stemC(K,x0),K.pa([[x0,h*0.5],[ox-rx,h*0.5]],'J','J'),K.ov_(ox,h/2,rx,h/2+K.ov-K.hy)];},0.75+0.55+1.3,0,3);
dc('Б',K=>{const {u,h}=K,x0=K.L0+u*0.45,rx=u*0.62,ox=x0+rx;return [wave(K,x0+u*0.1,x0+u*1.5),K.pa([[x0+u*0.25,K.ch-u*0.05,-100,{w:0}],[x0,h*0.3,-90],[ox,K.B-K.ov,0],[ox+rx,h*0.27,90],[ox,h*0.54,180],[x0+K.hx*0.6,h*0.36]],'R','J')];},1.75,0,2);
dc('D',K=>{const {u,h}=K,x0=K.L0+u*0.75,xr=x0+u*1.25;
  return [K.pa([[x0+u*0.1,K.ch,-95,{w:0}],[x0,h*0.45,-91],[x0,K.B+u*0.3,-90],[x0+u*0.3,K.B,0],[xr,h*0.5,90],[x0+u*0.4,K.ch,180],[x0-K.hx*0.1,K.ch-u*0.12,195]],'R','D')];},2.05,0,2);
dc('L',K=>{const {u,h}=K,x0=K.L0+u*0.75;return [K.pa([[x0+u*0.75,h*0.86,95],[x0+u*0.35,K.ch,180],[x0+u*0.05,h*0.72,-95],[x0-u*0.02,K.B+u*0.25,-92],[x0+u*0.3,K.B,0],[x0+u*1.1,K.B+u*0.1,25]],'D','D')];},1.95,0,1);
dc('O',K=>{const {u,h}=K,rx=u*0.85,ox=K.L0+rx;return [K.pa([[ox+rx*0.35,K.ch-u*0.06,160],[ox,K.ch+K.ov,180],[ox-rx,h/2,-90],[ox,K.B-K.ov,0],[ox+rx,h/2,90],[ox+rx*0.1,K.ch-K.hy*0.2,170],[ox-rx*0.45,Math.min(h*0.84,K.ch-K.hx*2.2),-100]],'R','D')];},1.7,0,2);
dc('Q',K=>{const {u,h}=K,rx=u*0.85,ox=K.L0+rx;return [...F.GL['O'].skel(K.g),K.pa([[ox-rx*0.3,K.B+u*0.1],[ox+rx*0.4,-K.u*0.08,-5],[ox+rx*1.05,K.B,20]],'R','R')];},1.75,0,2);
dc('C',K=>{const {u,h}=K,rx=u*0.8,ox=K.L0+rx;return [K.pa([[ox+rx*0.6,h*0.8,95],[ox+rx*0.05,K.ch+K.ov,180],[ox-rx,h/2,-90],[ox+rx*0.1,K.B-K.ov,0],[ox+rx*0.95,h*0.2,55],K.ext(false)],'D',K.cE)];},1.6+0.45,1,2);
dc('Є',K=>{const {u,h}=K,rx=u*0.8,ox=K.L0+rx;return [...F.GL['C'].skel(K.g),K.pa([[ox-rx+K.hx,h*0.5],[ox+rx*0.3,h*0.52]],'J','R')];},1.6+0.45,1,2);
dc('E',K=>{const {u,h}=K,rx=u*0.72,ox=K.L0+rx*1.05;
  return [K.pa([[ox+rx*0.55,h*0.82,95],[ox,K.ch+K.ov,180],[ox-rx*0.75,h*0.76,-90],[ox+rx*0.05,h*0.53,null,{c:1,j:'round',di:-5,do:185}],[ox-rx,h*0.26,-90],[ox+rx*0.1,K.B-K.ov,0],[ox+rx*0.95,h*0.22,55],K.ext(false)],'D',K.cE)];},1.55+0.45,1,2);
dc('Э',K=>{const {u,h}=K,rx=u*0.8,ox=K.L0+rx;return [K.pa([[ox-rx*0.7,h*0.78,75],[ox-rx*0.05,K.ch+K.ov,0],[ox+rx,h/2,-90],[ox,K.B-K.ov,180],[ox-rx*0.85,h*0.2,115]],'D','D'),K.pa([[ox-rx*0.25,h*0.49],[ox+rx-K.hx*0.5,h*0.5]],'R','J')];},1.6,0,2);
dc('З',K=>{const {u,h}=K,rx=u*0.72,ox=K.L0+rx;return [K.pa([[ox-rx*0.6,h*0.8,70],[ox-rx*0.05,K.ch+K.ov,0],[ox+rx*0.75,h*0.76,-90],[ox,h*0.52,null,{c:1,j:'round',di:185,do:-5}],[ox+rx,h*0.26,-90],[ox-rx*0.05,K.B-K.ov,180],[ox-rx*0.9,h*0.2,110]],'D','D')];},1.5,0,2);
dc('G',K=>{const {u,h}=K,rx=u*0.8,ox=K.L0+rx;return [K.pa([[ox+rx*0.6,h*0.8,95],[ox+rx*0.05,K.ch+K.ov,180],[ox-rx,h/2,-90],[ox+rx*0.05,K.B-K.ov,0],[ox+rx,h*0.38,90],[ox+rx*0.95,h*0.45]],'D','R'),K.pa([[ox+rx*0.3,h*0.44],[ox+rx*1.15,h*0.46]],'R','R')];},1.75,0,2);
dc('S',K=>{const {u,h}=K,x=K.L0,x1=x+u*1.3;return [K.pa([[x1,h*0.8,100],[x+u*0.7,K.ch+K.ov,180],[x+u*0.15,h*0.74,-90],[x+u*0.65,h*0.48,-25],[x1,h*0.24,-90],[x+u*0.65,K.B-K.ov,180],[x,h*0.2,110]],'D','D')];},1.4,0,2);
dc('X',K=>{const {u}=K,a=K.L0+u*0.12,cx=a+u*0.95,g=K.hx*0.3;return [halfL(K,a,cx-g,false),halfR(K,cx+g,cx+u*0.95)];},2.15,1,2);
dc('Ж',K=>{const {u}=K,a=K.L0+u*0.12,g=zG(K),cx=a+u*1.05+g;return [halfL(K,a,cx-g,false),stemC(K,cx,{curl:false,end:[[cx,K.hx,-90]],endCap:'R'}),halfR(K,cx+g,cx+g+u*1.05)];},p=>(2.1+0.12+PADC+0.06)*uOf(p)+2*(p.stem/2+(p.hair/2+(p.stem-p.hair)/2*0.72)+uOf(p)*0.13),1,3);
dc('Z',K=>{const {u,h}=K,x=K.L0;return [K.pa([[x+u*0.05,h*0.8,70],[x+u*0.6,K.ch,0],[x+u*1.3,K.ch-u*0.06,null,{c:1,j:'round',di:10,do:-130,w:0}],[x+u*0.1,K.hx,null,{c:1,j:'round',di:-130,do:0}],[x+u*0.8,K.B+u*0.04,0],[x+u*1.4,h*0.08,30]],'D','D')];},1.45,0,1);
dc('Ф',K=>{const {u,h}=K,cx=K.L0+u*1.2,r=u*0.6;return [K.ov_(cx-r,h*0.52,r,h*0.3),K.ov_(cx+r,h*0.52,r,h*0.3),stemC(K,cx,{curl:false,end:[[cx,K.hx,-90]],endCap:'R'})];},2.4,0,3);
dc('Д',K=>{const {u,h}=K,rx=u*0.75,ox=K.L0+rx,xs=ox+rx;return [K.ov_(ox,h*0.4,rx,h*0.4+K.ov-K.hy),K.pa([[xs-u*0.1,K.ch,-80,{w:0}],[xs,h*0.6,-90],...K.loopD(xs),K.ext(false)],'R',K.cE)];},1.5+EX,1,2);
dc('Я',K=>{const {u,h}=K,rx=u*0.6,ox=K.L0+u*0.2+rx,oy=h*0.72,x1=ox+rx;
  return [K.ov_(ox,oy,rx,h*0.28-K.hy),K.pa([[ox-rx*0.1,oy-h*0.26],[ox-rx*0.6,h*0.2,-110],[K.L0,K.B+u*0.05,190]],'J','D'),K.pa([[x1-K.d*0.8,K.ch,0,{w:0}],[x1,K.ch-K.d*1.05,-90],...K.turn(x1),K.ext(false)],'R',K.cE)];},0.2+1.2+0.42+EX,1,2);
/* ---------- цифры ---------- */
const dgW=0.95,dd=(ch,fn,nu)=>skDef(F,ch,K=>{K.hi=false;K.L0=K.u*0.22+wPad(K.p)+K.hx*0.35;K.W=K.w-2*K.L0;return fn(K);},p=>(nu||dgW)*uOf(p)*1.25+0.44*uOf(p)+2*wPad(p),'cap',2);
dd('0',K=>{const rx=K.W/2,ox=K.L0+rx;return [K.ov_(ox,K.h/2,rx-K.hx*0.3,K.h/2+K.ov-K.hy-Math.max(0,K.p.stem-F.S0)*0.4)];/* тяжёлое перо утолщает верх/низ овала */});
dd('1',K=>{const x=K.L0+K.W*0.7;return [K.pa([[K.L0+K.W*0.1,K.h*0.72],[x,K.ch,null,{c:1,j:'round',di:40,do:-90,w:0}],[x,K.h*0.5,-90],[x,K.hx,-90]],'R','R')];},0.7);
dd('2',K=>{const {L0,W,h}=K;return [K.pa([[L0+W*0.05,h*0.72,80],[L0+W*0.5,K.ch+K.ov,0],[L0+W,h*0.7,-90],[L0+W*0.6,h*0.35,-130],[L0+W*0.05,K.hx,null,{c:1,j:'round',di:-140,do:-10}],[L0+W*0.5,K.B+K.u*0.05,0],[L0+W*1.02,h*0.06,30]],'D','R')];});
dd('3',K=>{const {L0,W,h}=K;return [K.pa([[L0+W*0.05,h*0.8,70],[L0+W*0.48,K.ch+K.ov,0],[L0+W*0.9,h*0.76,-90],[L0+W*0.4,h*0.52,null,{c:1,j:'round',di:185,do:-5}],[L0+W,h*0.26,-90],[L0+W*0.45,K.B-K.ov,180],[L0,h*0.2,110]],'D','D')];});
dd('4',K=>{const {L0,W,h}=K,x=L0+W*0.76;return [K.pa([[x,K.ch,null,{w:0}],[L0,h*0.3,null,{c:1,j:'round',w:0.55}],[L0+W*1.02,h*0.32]],'R','R'),K.pa([[x+K.u*0.1,h*0.78,-95,{w:0}],[x,h*0.4,-92],[x-K.u*0.04,K.hx,-92]],'R','R')];},1.08);/* диагональ легче (нажим 0.55 у угла) и шире знак — треугольный просвет не заливается тяжёлым пером */
dd('5',K=>{const {L0,W,h}=K;return [K.pa([[L0+W*0.95,K.ch],[L0+W*0.2,K.ch-K.u*0.02-Math.max(0,K.p.stem-F.S0)*0.6,null,{c:1,j:'round',di:185,do:-95}],[L0+W*0.1,h*0.52,null,{c:1,j:'round',di:-95,do:20}],[L0+W*0.55,h*0.6,0],[L0+W,h*0.3,-90],[L0+W*0.45,K.B-K.ov,180],[L0,h*0.18,110]],'R','D')];});
dd('6',K=>{const {L0,W,h}=K,ry=h*0.3,cy=K.B-K.ov+ry,rx=W/2;return [K.pa([[L0+W*0.85,h*0.86,110],[L0+W*0.45,K.ch+K.ov,180],[L0,h*0.45,-90],[L0+rx,K.B-K.ov,0],[L0+W,cy,90],[L0+rx,cy+ry,180],[L0+K.hx*0.6,cy*1.0,-100]],'D','J')];});
dd('7',K=>{const {L0,W,h}=K;return [K.pa([[L0,K.ch-K.u*0.05,10],[L0+W,K.ch,null,{c:1,j:'round',di:0,do:-115,w:0}],[L0+W*0.35,K.hx,-110]],'R','R')];});
dd('8',K=>{const {L0,W,h}=K,c=L0+W/2;return [K.pa([[c+W*0.3,h*0.85],[c,K.ch+K.ov,180],[c-W*0.38,h*0.76,-90],[c+W*0.4,h*0.28,-90],[c,K.B-K.ov,180],[c-W*0.5,h*0.25,90],[c+W*0.35,h*0.72,90],[c+W*0.25,h*0.85,120]],'J','J')];});
dd('9',K=>{const {L0,W,h}=K,ry=h*0.3,cy=K.ch+K.ov-ry,rx=W/2;return [K.ov_(L0+rx,cy,rx,ry),K.pa([[L0+W,cy+ry*0.2,-90,{w:0}],[L0+W*0.9,h*0.3,-95],[L0+W*0.6,K.B-K.ov,180],[L0+W*0.1,h*0.12,120]],'R','D')];});
/* ---------- знаки ---------- */
skPunct(F);
const PADK=new Set([...'.,:;!?"\'-–—()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…¡¿−']);
for(const ch of PADK){const e=F.GL[ch];if(!e)continue;const w0=e.w,s0=e.skel;
  e.w=p=>w0(p)+2*uOf(p)*0.22;e.skel=g=>{const pd=uOf(g.p)*0.22,g2=Object.assign({},g,{w:g.w-2*pd});const o=SK_HI;SK_HI=false;try{return skXf(s0(g2),(x,y)=>[x+pd,y]);}finally{SK_HI=o;}};}
/* $ — простое S (без петель) и вертикаль: два устойчивых просвета */
{const e=F.GL['$'];const pd=p=>uOf(p)*0.22;e.w=p=>uOf(p)*1.75+2*pd(p);
 e.skel=g=>{const o=SK_HI;SK_HI=false;try{const K=F.kit(g,'$'),u=K.u,x0=pd(g.p)+K.hx,x1=K.w-pd(g.p)-K.hx,cx=(x0+x1)/2,w=x1-x0,h=K.capH,t=h*0.9,b=h*0.08;
   return [K.pa([[x1,t-h*0.16,100],[cx,t,180],[x0,(t+h*0.48)/2,-90],[cx,h*0.48,-20],[x1,(b+h*0.48)/2,-90],[cx,b,180],[x0,b+h*0.16,100]],'R','R'),
     /* вертикаль только над и под S: внутри знака она замыкала крошечные просветы */
     K.pa([[cx,h*1.0,-90,{w:0.6}],[cx,t-K.hy*0.5,-90]],'R','R'),K.pa([[cx,b+K.hy*0.5,-90],[cx,-h*0.08,-90]],'R','R')];}finally{SK_HI=o;}};
 e.shape=g=>skShape(e.skel(g),F,g.p,'cap');}
/* ---------- особые для расширенного набора ---------- */
/* огонек: под самой правой нижней точкой скелета (правая нога A, низ a/u/e…) */
F.mkGap=0.4;
F.mkZ={cap:160,low:160,g0:40,gk:0.32,bpad:t=>Math.max(0,0.42*(t-62))+4};/* integration (a): fixed mark zone for Ё Й Ї */
F.ogX=b=>(K,sk)=>{let bx=null;if(sk)for(const st of sk)for(const n of (st.nodes||[]))if(n.y<K.h*0.2&&n.y>-K.h*0.05&&(bx==null||n.x>bx)&&n.x<K.w-K.hx*0.5)bx=n.x;return bx!=null?bx-K.hx*0.3:K.u*1.6;};
F.ogI=(K,sk)=>{let b=null;for(const s of sk)for(const n of s.nodes)if(!b||Math.abs(n.y-K.capH*0.5)<Math.abs(b.y-K.capH*0.5))b=n;return b?b.x+K.hx*0.3:K.cx;};/* огонек Į — под стволом */
F.markX=(K,base,sk)=>{const b=skBox(sk.filter(s=>!s.dot));return (b.x0+b.x1)/2+(base===base.toUpperCase()?0:K.u*0.05);};
F.eszett=()=>d('ß',K=>{const {h}=K,x0=K.u*X0,u=Math.min(K.u,(K.w-K.hx*1.5-x0)/0.95);/* правая чаша не выходит за поле */return [K.pa([K.ent(),...K.loopU(x0),[x0,K.hx,-90]],K.cE,'R'),K.pa([[x0,K.asc*0.75],[x0+u*0.85,h*1.05,-90],[x0+u*0.3,h*0.6,180]],'J','J'),K.pa([[x0+u*0.3,h*0.6,0],[x0+u*0.95,h*0.25,-90],[x0+u*0.35,K.B,180],[x0+u*0.15,h*0.12]],'J','D')];},X0+1.2,'xh',2);
F.descR=(K,b)=>{const x=b==='К'||b==='K'?K.w-K.u*0.75:K.w-K.u*1.02,lr=K.u*0.26,dd=K.desc*0.55,xr=Math.min(x+K.r*1.3,K.w-K.hx*2),xs=xr-K.r*0.6;/* хвост не выходит за правое поле при тяжёлом пере */return [K.pa([[xs+K.r*0.7,K.B+K.hy*0.3,-20],[xr,-dd*0.45,-90],[xr-K.r*0.4,-dd,180],[xr-K.r*0.9,-dd*0.75,90]],'J','D')];};
F.ueLow=()=>{d('ү',K=>{const {u,h}=K,x0=u*0.5,x1=x0+u*0.9;return [K.pa([K.ent(),[x0,K.ch,72],[x0+u*0.45,h*0.2,-60],[x0+u*0.45,-K.desc+K.hx,-90]],K.cE,'R'),K.pa([[x1,K.ch,-120,{w:0}],[x0+u*0.47,h*0.15,-120]],'R','J'),K.extFrom(x0+u*0.45,K.yc*0.5)];},0.5+0.9+0.5,'xh',2);};
F.dzhe=()=>{dc('Џ',K=>{const sk=F.GL['П'].skel(K.g);return sk.concat([K.pa([[K.L0+K.u*1.4,K.B],[K.L0+K.u*1.4,-K.desc*0.5,-90]],'J','R')]);},0.75+1.3+0.42+EX,1,2);
  d('џ',K=>{const sk=F.GL['и'].skel(K.g);return sk.concat([K.pa([[K.u*(X0+0.5),K.B],[K.u*(X0+0.5),-K.desc*0.5,-90]],'J','R')]);},wI(2),'xh',2);};
F.shha=()=>{dc('Һ',K=>{const {u,h}=K,x0=K.L0+u*0.75,x1=x0+u*1.3;return [stemC(K,x0,{end:[[x0,K.hx,-90]],endCap:'R'}),K.pa([[x0,h*0.4,80],[(x0+x1)/2,h*0.62,0],[x1,h*0.4,-90],...K.turn(x1),K.ext(false)],'J',K.cE)];},0.75+1.3+0.42+EX,1,2);F.GL['һ']=F.GL['h'];};
F.tshe=()=>{dc('Ћ',K=>{const {u,h}=K,x0=K.L0+u*0.95,x1=x0+u*1.2;return [wave(K,K.L0,x0+u*0.9),stemC(K,x0,{curl:false,end:[[x0,K.hx,-90]],endCap:'R'}),K.pa([[x0,h*0.4,80],[(x0+x1)/2,h*0.58,0],[x1,h*0.38,-90],...K.turn(x1),K.ext(false)],'J',K.cE)];},0.95+1.2+0.42+EX,1,2);
  dc('Ђ',K=>{const {u,h}=K,x0=K.L0+u*0.95,x1=x0+u*1.2;return [wave(K,K.L0,x0+u*0.9),stemC(K,x0,{curl:false,end:[[x0,K.hx,-90]],endCap:'R'}),K.pa([[x0,h*0.4,80],[(x0+x1)/2,h*0.58,0],[x1,h*0.38,-90],[x1,-K.desc*0.3,-90],[x1-u*0.35,-K.desc*0.5,180]],'J','D')];},0.95+1.4,0,2);
  d('ћ',K=>{const {u,h}=K;return F.GL['h'].skel(K.g).concat([K.pa([[u*0.25,h*1.3],[u*1.2,h*1.32]],'R','R')]);},wI(2),'xh',2);
  d('ђ',K=>{const {u,h}=K,x0=u*X0,x1=x0+u-wPad(K.p)*0.5;return [K.pa([K.ent(),...K.loopU(x0),...K.pinB(x0),...K.arch(x0,x1),[x1,-K.desc*0.3,-90],[x1-u*0.3,-K.desc*0.5,180]],K.cE,'D'),K.pa([[u*0.25,h*1.3],[u*1.2,h*1.32]],'R','R')];},X0+1+0.3,'xh',2);};
F.barD=(K,cap)=>cap?[K.pa([[K.L0+K.u*0.2,K.h*0.45],[K.L0+K.u*1.1,K.h*0.47]],'R','R')]:[K.pa([[K.u*1.2,K.asc*0.8],[K.u*2.1,K.asc*0.82]],'R','R')];
F.slashL=(K,cap)=>cap?[K.pa([[K.L0+K.u*0.2,K.h*0.4],[K.L0+K.u*1.2,K.h*0.56]],'R','R')]:[K.pa([[K.u*0.3,K.h*0.95],[K.u*1.3,K.h*1.15]],'R','R')];
F.aeOv=0.3;F.apoPad=K=>K.u*0.25;F.aeOv2=0.3;
F.after=()=>{skCompose(F,'Й','И',['breve']);skCompose(F,'й','и',['breve']);skCompose(F,'Ё','E',['dier']);skCompose(F,'ё','e',['dier']);
  skCompose(F,'Ї','I',['dier']);skCompose(F,'ї','ı',['dier']);};
F.after();
/* ---------- регистрация ---------- */
const P0={wdth:100,capH:700,xh:450,asc:840,desc:270,stem:92,hair:30,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:100,ov:8,slant:16,sb:0,track:0,space:320,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:100,term:0,tens:1,conn:100};
F.DEFAULTS={regular:{...P0},italic:{...P0,wdth:90,stem:86,slant:22,spur:130,space:300}};
F.params={stem:['Основной штрих (нажим)',60,140,1],hair:['Соединительный штрих (волосная)',30,48,1],press:['Сила нажима, %',0,100,1],spur:['Росчерки прописных',0,200,1],
  conn:['Связность, %',0,100,1],tens:['Натяжение кривых',0.85,1.2,0.01],slant:['Угол наклона, °',0,26,0.5],
  sb:null,opsp:null,diag:null,optic:null,round:null,kappa:null,innerR:null,rough:null,aper:null,bar:null,mv:null,trap:null,join:null,stemScale:null,nib:null,term:null,icomp:null};
F.methods=[
  ['Нажим','Контраст остроконечного пера: от ровной линии до каллиграфии.',[['Ровная',{press:40}],['Лёгкий',{press:65}],['Пропись',{press:100,stem:92}],['Каллиграфия',{press:100,stem:118}]]],
  ['Наклон','Наклон письма.',[['Прямая',{slant:0}],['Школьная',{slant:16}],['Быстрая',{slant:22}]]],
  ['Связность','Соединения между строчными.',[['Слитно',{conn:100}],['Раздельно',{conn:35}]]],
  ['Росчерки','Размер завитков прописных.',[['Скромные',{spur:40}],['Обычные',{spur:100}],['Пышные',{spur:180}]]],
  ['Пропорции','Соотношение высот.',[['Пропись',{capH:700,xh:450,asc:840,desc:270}],['Крупные строчные',{capH:700,xh:520,asc:820,desc:250}]]],
];
F.sym=false;
F.simpTol=2.5;F.nodeBudget=25;/* Сверка для рукописного: поля без соединительных хвостов, законные выносные петли, ствол = волосная + нажим,
   перекладин в системе нет (горизонтали — волосные) */
F.proof={marginP:{conn:0},band:p=>{const q=safeP(p),yc=q.xh*0.2,hy=q.hair/2,yh=(q.xh-hy)*0.84,b=q.stem*0.55;return [[yc-b,yc+b],[yh-b,yh+b]];},desc:'зуyYУfgjpqдДцщЦЩрJ',descX:20,asc:'бbdfhklt',noBar:true,
  stem:p=>{const q=safeP(p);return q.hair+(q.stem-q.hair)*(q.press==null?1:q.press/100);},stemSet:'HILTПШЩЦНiпшщцнт'/* h l: петля входа вливается в ствол у основания — там ширина не ствол */};
/* post.italicAngle (FX2): штрихи Прописи в скелете откинуты на ~4.6°, поэтому видимый наклон = slant − 4.6 (замер 17.4° при slant 22); экспорт читает хук, см. core3b */
F.uprightAngle=p=>0;/* FIX-ENGINE: прямая Пропись — письмо с видимым наклоном 11.5° (замер штрихов Н, I; прежде post.italicAngle = 0) */
F.italicAngle=(p,style)=>-Math.round(Math.max(0,(+p.slant||0)-4.6)*10)/10;
F.lim={capH:[660,740],xhR:[0.6,0.72],ascA:[90,160],desc:[220,270],wdth:[88,120],ov:[4,12],stem:[70,140],stemK:0.33,stemW:1,hair:[28,40],press:[40,100],spur:[0,160],tens:[0.9,1.12],conn:[0,100]};
for(const k of ['capH','desc','wdth','ov'])F.params[k]=[(PARAMS.find(r=>r[0]===k)||[])[1]||k,F.lim[k][0],F.lim[k][1],1];
F.params.xh=['Высота строчных',F.lim.capH[0]*F.lim.xhR[0],F.lim.capH[1]*F.lim.xhR[1],1];F.params.asc=['Верхние выносные',F.lim.capH[0]+F.lim.ascA[0],F.lim.capH[1]+F.lim.ascA[1],1];
F.params.stem=['Основной штрих (нажим)',...F.lim.stem,1];F.params.hair=['Соединительный штрих (волосная)',...F.lim.hair,1];F.params.press=['Сила нажима, %',...F.lim.press,1];F.params.spur=['Росчерки прописных',...F.lim.spur,1];F.params.tens=['Натяжение кривых',...F.lim.tens,0.01];
/* диграфы (œ љ њ): строчные соединяются как в письме — правый знак встаёт ровно на выход левого, после верхнего выхода — вариант .hi */
/* огонек Ę ę — под нижней точкой чаши (всегда прикреплён) */
F.ogLow=(K,sk)=>{let b=null;for(const st of sk)for(const n of (st.nodes||[]))if(!b||n.y<b.y)b=n;return b?b.x:K.cx;};
F.pairOv=(c,a,b,ov)=>/\p{Ll}/u.test(c)?0:ov;F.pairHi=a=>TOPX.has(a);F.withHi=f=>{const o=SK_HI;SK_HI=true;try{return f();}finally{SK_HI=o;}};
skRegister(F);
/* ---------- варианты с верхним входом (.hi) и контекст ---------- */
const hiName=c=>(/^[a-z]$/.test(c)?c:'uni'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'))+'.hi';
F.hiOf={};F.topExit=new Set();
for(const c of F.CHARSET){const e=F.GL[c];if(!e||e.k!=='xh'||!/\p{Ll}/u.test(c)||!e.skel)continue;
  const base=c.normalize('NFD')[0];
  if(TOPX.has(c)||TOPX.has(base)||(e.opt&&e.opt.topExit))F.topExit.add(c);
  const nm=hiName(c);F.hiOf[c]=nm;
  const a={k:'xh',w:e.w,opt:{alt:true,base:c,feat:'calt',topExit:F.topExit.has(c)},skel:g=>{const o=SK_HI;SK_HI=true;try{return e.skel(g);}finally{SK_HI=o;}}};
  a.shape=g=>skShape(a.skel(g),F,g.p,(c===base||/[bdfhklіїґ]/.test(base))?'xh':'xhn');F.GL[nm]=a;}
/* знак после prev: вариант с верхним входом, если prev выходит сверху (для превью без OpenType) */
F.ctx=(prev,ch)=>(prev&&F.topExit.has(prev)&&F.hiOf[ch])?F.hiOf[ch]:ch;
})();
