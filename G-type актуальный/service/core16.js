/* ===== Кодекс: знаки по перу единым контуром (~ × & Æ æ Œ œ ₽ € @ « » { } кавычки, запятая),
   бреве Й й Ў ў Ă ă Ğ ğ, Ж ж с согласованными диагоналями в обоих начертаниях ===== */
(function(){
if(!FONTS.codex)return;
const G=FONTS.codex.GL;
const wv=(v,p,ch)=>(typeof v==='function'?v(p):v)*p.wdth/100+2*soOf(p)+(ch?cxWx(ch,p):0);
const def=(ch,fn,w,k,U)=>{G[ch]={shape:g=>fn(mkU(g,!!U,ch)),w:p=>wv(w,p,/[ÆæŒœ₽€@&]/.test(ch)?ch:null),k:k||'cap',opt:{}};};

/* --- перо: лента вдоль осевой линии --- */
/* сплайн Катмулла–Рома через опорные точки, n отсчётов на участок */
function crS(P,n){const out=[];
  for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
    for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t,f=j=>0.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3);
      out.push([f(0),f(1)]);}}
  out.push(P[P.length-1].slice());return out;}
/* срез конца: 'h' — горизонтальный, 'v' — вертикальный, 'n' — по углу пера, [ux,uy] — заданный, иначе перпендикулярный */
function cutDir(K,e){if(e==='h')return [1,0];if(e==='v')return [0,1];if(e==='n'){const a=K.nib*D2R;return [Math.cos(a),Math.sin(a)];}return Array.isArray(e)?e:null;}
function endPts(K,P,nx,ny,hw,e){const u=cutDir(K,e);
  if(u){const d=u[0]*nx+u[1]*ny;if(Math.abs(d)>0.4){const f=hw/d;return [[P[0]+u[0]*f,P[1]+u[1]*f],[P[0]-u[0]*f,P[1]-u[1]*f]];}}
  return [[P[0]+nx*hw,P[1]+ny*hw],[P[0]-nx*hw,P[1]-ny*hw]];}
/* гладкая лента: ширина = ширина пера под углом касательной (или o.w(t,th)); края — кривые через отсчёты */
function ribbon(K,C,o){o=o||{};const n=C.length,Ls=[],Rs=[],k=o.k||1,mn=o.min||K.H*0.8;
  const tg=i=>{const a=C[Math.max(0,i-1)],b=C[Math.min(n-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [dx/l,dy/l];};
  for(let i=0;i<n;i++){const [tx,ty]=tg(i),th=Math.atan2(ty,tx);let w=o.w?o.w(i/(n-1),th):penWidth(K,th)*k;w=Math.max(w,mn);
    const nx=-ty,ny=tx,hw=w/2,e=i===0?o.e0:i===n-1?o.e1:null;
    const q=e?endPts(K,C[i],nx,ny,hw,e):[[C[i][0]+nx*hw,C[i][1]+ny*hw],[C[i][0]-nx*hw,C[i][1]-ny*hw]];
    Ls.push(q[0]);Rs.push(q[1]);}
  /* отсчёты, вылезшие за линию среза конца, убираются (иначе край даёт шип за срезом) */
  const trim=(S,end)=>{const u=cutDir(K,end?o.e1:o.e0);if(!u)return S;const i0=end?n-1:0,E=S[i0],[tx,ty]=tg(i0),sg=end?1:-1;
    const nn=[-u[1],u[0]],dir=(nn[0]*tx+nn[1]*ty)*sg>0?1:-1;
    const out=(p)=>((p[0]-E[0])*nn[0]+(p[1]-E[1])*nn[1])*dir>=-0.5;const R=S.slice();
    if(end){let j=R.length-2;while(j>0&&j>R.length-6&&out(R[j])){R.splice(j,1);j--;}}else{while(R.length>2&&out(R[1])&&S.length-R.length<4)R.splice(1,1);}
    return R;};
  for(const S of [Ls,Rs]){const a=trim(trim(S,true),false);S.length=0;S.push(...a);}
  const side=S=>S.map((p,j)=>{const a=S[Math.max(0,j-1)],b=S[Math.min(S.length-1,j+1)],sc=(j===0||j===S.length-1)?1/3:1/6;
    const tx=(b[0]-a[0])*sc,ty=(b[1]-a[1])*sc;
    return {x:p[0],y:p[1],a:j>0?{x:p[0]-tx,y:p[1]-ty}:null,b:j<S.length-1?{x:p[0]+tx,y:p[1]+ty}:null};});
  const R2=side(Rs.slice().reverse());
  return mkc(side(Ls).concat(R2),false);}
/* ломаная лента с острыми стыками (усы, кавычки-ёлочки): ширина каждого участка — по перу */
function penPoly(K,P,o){o=o||{};const k=o.k||1,n=P.length,seg=[];
  for(let i=0;i<n-1;i++){const dx=P[i+1][0]-P[i][0],dy=P[i+1][1]-P[i][1],l=Math.hypot(dx,dy)||1,th=Math.atan2(dy,dx);
    const w=Math.max(o.ws?o.ws[i]:penWidth(K,th)*k,o.min||K.H*0.8);seg.push({nx:-dy/l,ny:dx/l,hw:w/2});}
  const off=(i,s,sg)=>[P[i][0]+sg*s.nx*s.hw,P[i][1]+sg*s.ny*s.hw];
  const meet=(i,sg)=>{const a=seg[i-1],b=seg[i];const p1=off(i,a,sg),p2=off(i,b,sg);
    const d1=[P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]],d2=[P[i+1][0]-P[i][0],P[i+1][1]-P[i][1]];
    const den=d1[0]*d2[1]-d1[1]*d2[0];if(Math.abs(den)<1e-9)return p2;
    const t=((p2[0]-p1[0])*d2[1]-(p2[1]-p1[1])*d2[0])/den;return [p1[0]+d1[0]*t,p1[1]+d1[1]*t];};
  const Ls=[],Rs=[];
  const s0=seg[0],e0=endPts(K,P[0],s0.nx,s0.ny,s0.hw,o.e0);Ls.push(e0[0]);Rs.push(e0[1]);
  for(let i=1;i<n-1;i++){Ls.push(meet(i,1));Rs.push(meet(i,-1));}
  const sl=seg[n-2],e1=endPts(K,P[n-1],sl.nx,sl.ny,sl.hw,o.e1);Ls.push(e1[0]);Rs.push(e1[1]);
  return K.pg(Ls.concat(Rs.reverse()));}

/* --- × : два штриха пера, крест --- */
def('×',K=>{const {L,R,h,S}=K,a=S*0.15,y0=h*0.12,y1=h*0.66;
  return [penPoly(K,[[L+a,y1],[R-a,y0]],{k:0.72}),penPoly(K,[[L+a,y0],[R-a,y1]],{k:0.72})];},400);
/* --- ~ : одна волна пера --- */
def('~',K=>{const {L,R,h}=K,yc=h*0.4,A=h*0.085,x0=L+K.S*0.05,x1=R-K.S*0.05,C=[],F=1.12*Math.PI;
  for(let i=0;i<=20;i++){const t=i/20,f=Math.PI-F+2*F*t;C.push([x0+(x1-x0)*t,yc+A*Math.sin(f)]);}
  return [ribbon(K,C,{k:0.72,e0:'n',e1:'n'})];},460);

/* --- & : один росчерк пера (хвост → петля → чаша → плечо) --- */
def('&',K=>{const {L,h,bw,ov}=K,m=Math.max(0,K.S-CX_S0),X=u=>L+m+u*(bw-2*m),Y=v=>v*h; /* m: в тяжёлых весах росчерк не выходит за поля */
  const P=[[0.98,0.50],[0.88,0.43],[0.79,0.26],[0.62,0.07],[0.38,-0.01],[0.14,0.07],[0.05,0.28],[0.15,0.48],[0.36,0.63],[0.52,0.75],[0.60,0.89],[0.50,1.0],[0.31,0.99],[0.19,0.85],[0.27,0.69],[0.55,0.44],[0.78,0.20],[1.0,0.0]]
    .map(([u,v])=>[X(u),v<0?-ov:v>0.99?Y(v)+ov:Y(v)]);
  return [ribbon(K,crS(P,6),{k:0.9*Math.min(1,(CX_S0+Math.max(0,K.S-CX_S0)*0.15)/K.S),e0:'n',e1:'h'})];},600);

/* --- лигатуры: общий штрих --- */
/* Æ: левая нога A уходит в вершину, правая нога A — ствол E; поперечина A продолжается средней чертой E */
def('Æ',K=>{const {L,R,S,h,sy}=K,xs=L+K.bw*0.5,x0=L+S*0.5,yb=h*0.46,xl=x0+(xs-S*0.6-x0)*(yb/h);
  return [K.bar(x0,0,xs-S*0.6,h),...K.bot_(x0,0,'s'),K.rc(xs-S/2,0,xs+S/2,h),
    K.rc(xs-S*1.1,h-sy*1.2,R,h),K.rc(R-sy*1.2,h-tkH(K,sy*1.2),R,h),
    K.rc(xl,yb-sy*0.6,R-S*0.45,yb+sy*0.6),
    K.rc(xs-S/2-K.so,0,R,sy*1.3),K.rc(R-sy*1.2,0,R,tkH(K,sy*1.3))];},860,'cap',true);
/* æ: чаша «а» и ствол, из ствола растёт «е» */
def('æ',K=>{const {L,S,h,ov,sx,sy}=K,ra=(K.bw+S)/4,cxa=L+ra,xs=cxa+ra-S/2,cxe=xs-S/2+ra;
  return [...K.ring(cxa,h/2,ra,h/2+ov),K.rc(xs-S/2,0,xs+S/2,h),...K.top_(xs,h,'a'),
    K.band(cxe,h/2,ra,h/2+ov,0,326),K.rc(xs,h/2-sy*0.45,cxe+ra-sx*0.15,h/2+sy*0.45)];},760,'xh');
/* Œ œ: чаши «о» и «е» слиты общей стенкой */
const oeU=K=>{const {L,S,h,ov,sx,sy}=K,r=(K.bw+sx)/4,cxo=L+r,cxe=cxo+2*r-sx;
  return [...K.ring(cxo,h/2,r,h/2+ov),K.band(cxe,h/2,r,h/2+ov,0,326),K.rc(cxe-r+sx*0.5,h/2-sy*0.45,cxe+r-sx*0.15,h/2+sy*0.45)];};
def('Œ',oeU,900,'cap',true);def('œ',oeU,760,'xh');

/* --- валюты --- */
def('₽',K=>{const {L,R,S,h,sy}=K,xs=L+K.bw*0.22+S/2,yb=h*0.42,yr=h*0.2;
  return [...K.stem(xs,0,h,'a','s'),...bowlU(K,xs,h,yb,R),K.rc(L,yb,xs,yb+sy),K.rc(L,yr-sy*0.55,xs+K.bw*0.42,yr+sy*0.55)];},520);
def('€',K=>{const {L,R,S,h,ov,sy}=K,rx=K.bw*0.42,cx=R-rx,y1=h*0.4,y2=h*0.6;
  const o=[K.band(cx,h/2,rx,h/2+ov,38,322)];
  for(const y of [y1,y2])o.push(K.rc(L,y-sy*0.45,cx+rx*0.25,y+sy*0.45));return o;},540);

/* --- @ : внутренняя «а» Кодекса, её ствол хвостом переходит во внешнюю дугу --- */
def('@',K=>{const {cx,h,S}=K,cy=h*0.4,sw=S*0.78,syy=K.sy*1.1,rx=K.bw/2,ry=h*0.56,rxi=K.bw*0.2,ryi=h*0.22,cxi=cx-K.bw*0.06,xs=cxi+rxi-sw/2;
  const xo=cx+rx,hx0=xs-sw/2,hcx=(hx0+xo)/2,hrx=(xo-hx0)/2,hry=ryi*0.75;
  return [K.band(cx,cy,rx,ry,0,302,sw,syy),...K.ring(cxi,cy,rxi,ryi,sw,syy),K.rc(xs-sw/2,cy,xs+sw/2,cy+ryi),
    K.band(hcx,cy,hrx,hry,180,360,sw,syy)];},780);

/* --- «ёлочки» по перу: верхнее плечо — волосная, нижнее — основная --- */
const chev=(K,xa,xt,y0,ym,y1)=>penPoly(K,[[xa,y1],[xt,ym],[xa,y0]],{k:0.82,e0:'n',e1:'n'});
def('«',K=>{const {L,R,h,S}=K,m=K.cx,d=S*0.25;return [chev(K,m-d,L+S*0.1,h*0.12,h*0.4,h*0.68),chev(K,R-S*0.1,m+d,h*0.12,h*0.4,h*0.68)];},p=>p.stem*2.7);
def('»',K=>MIRX(G['«'].shape(K.g),K.w),p=>p.stem*2.7);

/* --- фигурные скобки: два росчерка пера, сходящиеся в острие --- */
const braceL=K=>{const {L,R,h,S}=K,xv=K.cx+S*0.12,top=h*1.04,bot=-h*0.14,mid=(top+bot)/2,r=S*0.75;
  const up=crS([[R,top],[xv+r*0.55,top-r*0.25],[xv,top-r],[xv,mid+r*1.05],[xv-r*0.45,mid+r*0.3],[L,mid]],5);
  /* FX2: один сплошной росчерк вместо двух лент, встречающихся в острие (стык давал в Black 4 точечные дырки и шипы) */
  const dn=up.slice(0,-1).reverse().map(([x,y])=>[x,2*mid-y]),all=up.concat(dn);
  const w=(t,th)=>{const u=t<=0.5?t*2:(1-t)*2;return Math.min(penWidth(K,th)*0.88,r*0.9)*(u>0.75?1-(u-0.75)*1.8:1);};/* ширина ленты не больше радиуса изгиба: иначе внутренний край складывается в точечные дырки */
  return [ribbon(K,all,{w,e0:'v',e1:'v',min:K.H*0.7})];};
def('{',braceL,p=>p.stem*2.3);def('}',K=>MIRX(braceL(K),K.w),p=>p.stem*2.3);

/* --- запятая и кавычки: головка срезана пером, хвост сходит на нет --- */
const comma=(K,x,yt)=>{const {S,H}=K,C=crS([[x+S*0.06,yt],[x+S*0.1,yt-S*0.5],[x-S*0.02,yt-S*0.98],[x-S*0.36,yt-S*1.38]],5);
  const w=t=>{const u=Math.max(0,(t-0.28)/0.72),e=u*u*(3-2*u);return S*1.02*(1-e)+H*0.4*e;};
  return ribbon(K,C,{w,e0:'n',min:H*0.35});};
const qW=(n)=>p=>(n>1?p.stem*2.6:p.stem*1.2);
const mkQ=(c,n,fn)=>def(c,K=>{const o=[],dx=n>1?K.S*0.95:0;for(let i=0;i<n;i++){const off=n>1?(i-0.5)*2*dx:0;o.push(...xf(fn(K),(x,y)=>[x+off,y]));}return o;},qW(n));
const hiC=K=>[comma(K,K.cx,K.h)],loC=K=>[comma(K,K.cx,K.S*1.1)];
const yTopC=cs=>{let m=-1e9;for(const c of cs){const n=c.nodes,N=n.length;for(let i=0;i<N;i++){const A=n[i],B=n[(i+1)%N],p1=A.b||A,p2=B.a||B;for(let k=0;k<=20;k++){const t=k/20,u=1-t;m=Math.max(m,u*u*u*A.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*B.y);}}}return m;};
/* ‘ “: поворот запятой; верх выравнивается по верху ’ ” (замер контура), иначе «“» ниже «”» на ~40 ед. (FX2) */
const turn=K=>{const cs=hiC(K),yc=K.h-K.S*0.75,o=xf(cs,(x,y)=>[2*K.cx-x,2*yc-y]),dy=yTopC(cs)-yTopC(o);return xf(o,(x,y)=>[x,y+dy]);};
mkQ('’',1,hiC);mkQ('”',2,hiC);mkQ('‘',1,turn);mkQ('“',2,turn);mkQ('‚',1,loC);mkQ('„',2,loC);
def(',',loC,p=>p.stem*0.95);
/* ; — точка и запятая не слипаются: точка уменьшается, головка запятой опускается, когда ствол велик для высоты строчных */
def(';',K=>{const g=Math.max(K.S*0.25,30),r=Math.min(K.S*0.62,(K.h-g)/4),yt=Math.min(K.S*1.1,K.h-2*r-g);return [K.dot(K.cx,K.h-r,r),comma(K,K.cx,yt)];},p=>p.stem*0.95,'xh');

/* --- бреве: открытая чаша по перу, с зазором от буквы --- */
function brv(K,cx,top){const {S,H}=K,rx=Math.min(Math.max(K.bw*0.27,S*0.95),S*1.5),ry=rx*0.7,gap=Math.max(56,H*1.2),cy=top+gap+ry;
  /* кириллическое бреве (ParaType): тонкая середина, утолщённые концы — каплевидные завершения (в латинском утолщена середина) */
  const t=Math.max(H*0.8,22),r=Math.max(t*1.35,S*0.3),A0=205,A1=335;
  return [K.band(cx,cy,rx,ry,A0,A1,t*1.15,t),...[A0,A1].map(a=>{const q=K.bpt(cx,cy,rx,ry,a,t*1.15,t);return K.ball(q[0],q[1],r);})];}
const withBrv=(ch,base,U,cxf)=>{const B=G[base];if(!B)return;
  G[ch]={shape:g=>{const K=mkU(g,U,ch);return [...B.shape(g),...brv(K,cxf?cxf(K):K.cx,K.h)];},w:B.w,k:B.k,opt:{}};};
G['Й']={shape:g=>{const K=mkU(g,true,'Й');return [...UX.I_(K),...brv(K,K.cx,K.h)];},w:G['И'].w,k:'cap',opt:{}};
G['й']={shape:g=>{const K=mkU(g,false,'й');return [...UX.I_(K),...brv(K,K.cx,K.h)];},w:G['и'].w,k:'xh',opt:{}};
withBrv('Ў','У',true);withBrv('ў','у',false);withBrv('Ă','A',true);withBrv('ă','a',false);
withBrv('Ğ','G',true);withBrv('ğ','g',false,K=>K.cx);

/* --- Ж ж: толщина диагоналей задаётся по итоговому (с наклоном) направлению; стык со стволом без ступенек --- */
function zheC(K){const {L,R,S,h,cx}=K,t=Math.tan((K.p.slant||0)*D2R),ym=h/2,xo=S*0.4,o=[];
  /* нижняя засечка ствола: только если нижние ветви её не задевают (иначе между ветвью и скосом засечки
     остаются крошечные замкнутые просветы) */
  const tH=Math.max(K.H*1.15,30),yS=tH+Math.min(tH*0.9,K.so*0.8),xS=S/2+K.so;let botOk=true;
  const arm=(ox,oy,jx)=>{const dx=jx-ox,dy=ym-oy,fx=dx+dy*t,Lf=Math.hypot(fx,dy),th=Math.atan2(dy,fx);
    const T=Math.max(penWidth(K,th),S*0.7),tw=T/(Math.abs(dy)/Lf);return tw;};
  for(const sd of [-1,1]){const ox=sd<0?L+xo:R-xo;let jx=cx,tu=0,tl=0;
    for(let it=0;it<3;it++){tu=arm(ox,h,jx);tl=arm(ox,0,jx);const m=Math.max(tu,tl);jx=cx-sd*(S/2-m/2-1);}
    const m=Math.max(tu,tl),X0=sd<0?cx+S/2-m-1:cx-S/2+m+1;
    for(const [oy,tw] of [[h,tu],[0,tl]]){const j=sd<0?X0+tw/2:X0-tw/2;
      o.push(K.pg([[ox-tw/2,oy],[ox+tw/2,oy],[j+tw/2,ym],[j-tw/2,ym]]));
      if(oy===0){const xi=ox-sd*tw/2+(j-ox)*(yS/ym);if(sd<0?xi>cx-xS-Math.max(6,S*0.12):xi<cx+xS+Math.max(6,S*0.12))botOk=false;}}}
  return [...K.stem(cx,0,h,'a',botOk?'s':null),...o];}
G['Ж']={shape:g=>zheC(mkU(g,true,'Ж')),w:G['Ж'].w,k:'cap',opt:{}};
G['ж']={shape:g=>zheC(mkU(g,false,'ж')),w:G['ж'].w,k:'xh',opt:{}};
/* И и Й й: в узком и тяжёлом наборе диагональ съедала оба просвета — оставались щели в пиксель, которые при печати
   то заплывают, то замыкаются в «глазок». Ширина не меньше 2 стволов + диагональ + 2 просвета (как у умолчаний, ≥24 ед.) */
for(const ch of 'ИиЙй'){const E=G[ch];if(!E)continue;const w0=E.w,U=ch==='И'||ch==='Й';
  E.w=p=>{const w=w0(p),K=mkU(makeG(p,w,U?p.capH:p.xh),U,ch),x0=K.R-K.S*0.75,x1=K.L+K.S*0.75,h=K.h;
    const pw=penWidth(K,Math.atan2(-h,x1-x0)),tw=pw*Math.hypot(x1-x0,h)/h,gm=24,need=2*K.S+tw+2*gm;
    return K.bw>=need?w:w+(need-K.bw)*1.06;};}
})();
