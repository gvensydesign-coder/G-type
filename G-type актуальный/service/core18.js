/* ===== Движок «скелет + перо» =====
   Знак = набор штрихов (средние линии — сплайны Безье). Перо расширяет каждый штрих в замкнутый контур
   из кубических кривых: смещение средней линии с адаптивным делением и подгонкой Безье (касательные на концах
   кусков — точные, длины ручек — МНК), узлы на экстремумах H/V. Перья:
     'ell' — эллипс rx×ry под углом ang (круглое перо при rx=ry, «широкое» каллиграфическое при ry≪rx);
     'pt'  — остроконечное: радиус = (волосная + (нажим−волосная)·p·f(направление))/2, вниз — толсто, вверх — тонко.
   Окончания штриха: 'R' круглое (дуга пера), 'F' плоское, 'H'/'V' срез по горизонтали/вертикали через конец,
   {cut:[dx,dy],at:[x,y]} — срез по заданной линии, 'X' сужение (капля), 'B' шарик, 'T' — окончание шрифта (p.term),
   'J' — стык (круглое, прячется в другом штрихе), 'C' — соединение прописи (плоское).
   Узлы скелета {x,y,a,b,w?,type:'smooth'|'corner',j?:'miter'|'round'|'bevel',cy?}; a/b — абсолютные ручки или null.
   Перекрытия штрихов остаются как есть — объединяет их csgUnion в finalGlyph. */
const SKX={TOL:0.6,LIM:3.2,FAST:false,NORED:false};
const skSub=v2,skAdd=(a,b)=>[a[0]+b[0],a[1]+b[1]],skMul=(a,k)=>[a[0]*k,a[1]*k];
const skCross=(a,b)=>a[0]*b[1]-a[1]*b[0],skDot=vdot,skLen=vlen;
const skNorm=vnorm;
const skAng=a=>{a=a%(2*Math.PI);if(a>Math.PI)a-=2*Math.PI;if(a<-Math.PI)a+=2*Math.PI;return a;};
const skSm=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
function skBz(P,t){const u=1-t;return [u*u*u*P[0][0]+3*u*u*t*P[1][0]+3*u*t*t*P[2][0]+t*t*t*P[3][0],u*u*u*P[0][1]+3*u*u*t*P[1][1]+3*u*t*t*P[2][1]+t*t*t*P[3][1]];}
function skBzD(P,t){const u=1-t;return [3*u*u*(P[1][0]-P[0][0])+6*u*t*(P[2][0]-P[1][0])+3*t*t*(P[3][0]-P[2][0]),3*u*u*(P[1][1]-P[0][1])+6*u*t*(P[2][1]-P[1][1])+3*t*t*(P[3][1]-P[2][1])];}
function skBzDD(P,t){const u=1-t;return [6*u*(P[2][0]-2*P[1][0]+P[0][0])+6*t*(P[3][0]-2*P[2][0]+P[1][0]),6*u*(P[2][1]-2*P[1][1]+P[0][1])+6*t*(P[3][1]-2*P[2][1]+P[1][1])];}

/* ---------- перья ---------- */
/* M(T,m) — матрица 2×2 пера (столбцы — полуоси), T — единичная касательная, m — множитель ширины */
function skPen(kind,o){
  if(kind==='pt'){const r0=o.hair/2,r1=o.stem/2,pr=o.press==null?1:o.press,d0=o.d0==null?0:o.d0,d1=o.d1==null?1:o.d1;
    /* m — нажим в узле (множитель только нажимной части), tk — сужение окончания */
    return {kind,o,r:(T,m,tk)=>{const d=-T[1],f=skSm((d-d0)/(d1-d0));return (r0+(r1-r0)*pr*f*m)*(tk==null?1:tk);},
      M(T,m,tk){const r=this.r(T,m,tk);return [[r,0],[0,r]];}};}
  const a=(o.ang||0)*D2R,c=Math.cos(a),s=Math.sin(a),rx=o.rx,ry=o.ry;
  return {kind:'ell',o,M:(T,m,tk)=>{m*=(tk==null?1:tk);return [[c*rx*m,-s*ry*m],[s*rx*m,c*ry*m]];}};
}
/* опорная точка пера в направлении нормали n: M·u*, u* = Mᵀn/|Mᵀn| */
function skSupport(M,n){const ux=M[0][0]*n[0]+M[1][0]*n[1],uy=M[0][1]*n[0]+M[1][1]*n[1],l=Math.hypot(ux,uy)||1;
  return {u:[ux/l,uy/l],p:[(M[0][0]*ux+M[0][1]*uy)/l,(M[1][0]*ux+M[1][1]*uy)/l]};}
const skMu=(M,u)=>[M[0][0]*u[0]+M[0][1]*u[1],M[1][0]*u[0]+M[1][1]*u[1]];

/* ---------- построители скелета ---------- */
function hobbyF(th,ph){const st=Math.sin(th),sp=Math.sin(ph),ct=Math.cos(th),cp=Math.cos(ph);
  const r=(2+Math.SQRT2*(st-sp/16)*(sp-st/16)*(ct-cp))/(3*(1+0.5*(Math.sqrt(5)-1)*ct+0.5*(3-Math.sqrt(5))*cp));
  return Math.max(0.02,Math.min(r,0.95));}
const skAvg=(a,b)=>Math.atan2(Math.sin(a)+Math.sin(b),Math.cos(a)+Math.cos(b));
/* путь через точки (алгоритм Хобби): spec = [x,y,угол°|null,{c:угол, w, j, cy, di, do}];
   угол задаёт касательную (направление хода выбирается по ходу пути); c — излом */
function skPath(specs,o){o=o||{};const tens=o.tens||1,closed=!!o.closed,n=specs.length;
  const P=specs.map(s=>({x:s[0],y:s[1],d:s[2]==null?null:s[2]*D2R,o:s[3]||{}}));
  const segN=closed?n:n-1,c=[];
  for(let i=0;i<segN;i++){const A=P[i],B=P[(i+1)%n];c.push(Math.atan2(B.y-A.y,B.x-A.x));}
  const din=new Array(n).fill(null),dout=new Array(n).fill(null);
  for(let i=0;i<n;i++){const s=P[i],cin=(closed||i>0)?c[(i-1+segN)%segN]:null,cout=(closed||i<n-1)?c[i%segN]:null;
    if(s.o.c){if(s.o.di!=null)din[i]=s.o.di*D2R;if(s.o.do!=null)dout[i]=s.o.do*D2R;continue;}
    if(s.d!=null){let d=s.d;const ref=cin!=null&&cout!=null?skAvg(cin,cout):(cin!=null?cin:cout);if(Math.cos(d-ref)<0)d+=Math.PI;din[i]=dout[i]=d;}
    else if(cin!=null&&cout!=null)din[i]=dout[i]=skAvg(cin,cout);}
  for(let pass=0;pass<2;pass++)for(let i=0;i<n;i++){
    if(dout[i]==null&&(closed||i<n-1)){const j=(i+1)%n,ci=c[i];if(din[j]!=null||pass)dout[i]=din[j]!=null?ci-skAng(din[j]-ci):ci;}
    if(din[i]==null&&(closed||i>0)){const j=(i-1+n)%n,ci=c[(i-1+segN)%segN];if(dout[j]!=null||pass)din[i]=dout[j]!=null?ci-skAng(dout[j]-ci):ci;}}
  const nodes=P.map(s=>{const q={x:s.x,y:s.y,a:null,b:null,type:s.o.c?'corner':'smooth'};if(s.o.w!=null)q.w=s.o.w;if(s.o.j)q.j=s.o.j;if(s.o.cy!=null)q.cy=s.o.cy;return q;});
  for(let i=0;i<segN;i++){const j=(i+1)%n,A=P[i],B=P[j],d=Math.hypot(B.x-A.x,B.y-A.y);if(d<1e-6)continue;
    const th=skAng(dout[i]-c[i]),ph=skAng(c[i]-din[j]);
    if(Math.abs(th)<0.004&&Math.abs(ph)<0.004)continue;
    const r0=hobbyF(th,ph)*d/tens,r1=hobbyF(ph,th)*d/tens;
    nodes[i].b={x:A.x+r0*Math.cos(dout[i]),y:A.y+r0*Math.sin(dout[i])};
    nodes[j].a={x:B.x-r1*Math.cos(din[j]),y:B.y-r1*Math.sin(din[j])};}
  if(closed)nodes.closed=true;
  return nodes;
}
/* дуга эллипса (точная кубическая аппроксимация, узлы на кратных 90°), углы в градусах */
function skArcN(cx,cy,rx,ry,a0,a1,tens){tens=tens||1;const sp=a1-a0,dir=sp>=0?1:-1,br=[a0];
  let k=dir>0?Math.floor(a0/90+1e-9)+1:Math.ceil(a0/90-1e-9)-1;
  while(dir>0?k*90<a1-1e-6:k*90>a1+1e-6){br.push(k*90);k+=dir;}br.push(a1);
  const pt=f=>[cx+rx*Math.cos(f*D2R),cy+ry*Math.sin(f*D2R)],dv=f=>[-rx*Math.sin(f*D2R)*D2R,ry*Math.cos(f*D2R)*D2R];
  const nodes=br.map(f=>{const q=pt(f);return {x:q[0],y:q[1],a:null,b:null,type:'smooth'};});
  for(let i=0;i<br.length-1;i++){const f0=br[i],f1=br[i+1],D=(f1-f0),kk=4/3*Math.tan(D*D2R/4)/(D*D2R)/tens;
    const d0=dv(f0),d1=dv(f1);nodes[i].b={x:nodes[i].x+kk*d0[0]*D,y:nodes[i].y+kk*d0[1]*D};nodes[i+1].a={x:nodes[i+1].x-kk*d1[0]*D,y:nodes[i+1].y-kk*d1[1]*D};}
  return nodes;}
/* склейка частей (массивов узлов) в один путь: совпадающие концы сливаются, излом определяется по касательным */
function skCat(...parts){const out=[];
  for(const part of parts){if(!part||!part.length)continue;
    for(let i=0;i<part.length;i++){const q=Object.assign({},part[i]);
      const l=out[out.length-1];
      if(i===0&&l&&Math.hypot(l.x-q.x,l.y-q.y)<0.5){l.b=q.b;if(q.w!=null)l.w=q.w;
        const pi=l.a?[l.x-l.a.x,l.y-l.a.y]:(out.length>1?[l.x-out[out.length-2].x,l.y-out[out.length-2].y]:null);
        const po=q.b?[q.b.x-q.x,q.b.y-q.y]:(part.length>1?[part[1].x-q.x,part[1].y-q.y]:null);
        if(pi&&po&&Math.abs(skAng(Math.atan2(po[1],po[0])-Math.atan2(pi[1],pi[0])))>0.035)l.type='corner';else if(!l.c)l.type='smooth';
        if(q.type==='corner'){l.type='corner';if(q.j)l.j=q.j;if(q.cy!=null)l.cy=q.cy;}
        continue;}
      out.push(q);}}
  return out;}
const skLn=(x0,y0,x1,y1)=>[{x:x0,y:y0,a:null,b:null,type:'smooth'},{x:x1,y:y1,a:null,b:null,type:'smooth'}];
/* излом с соединением j (miter|round|bevel) и срезом выступа по y=cy */

/* ---------- расширение штриха пером ---------- */
function skSegs(nodes,closed){const n=nodes.length,out=[];const m=closed?n:n-1;
  for(let i=0;i<m;i++){const A=nodes[i],B=nodes[(i+1)%n];
    const line=!A.b&&!B.a,P0=[A.x,A.y],P3=[B.x,B.y];
    const P1=A.b?[A.b.x,A.b.y]:(line?[A.x+(B.x-A.x)/3,A.y+(B.y-A.y)/3]:P0.slice()),P2=B.a?[B.a.x,B.a.y]:(line?[A.x+(B.x-A.x)*2/3,A.y+(B.y-A.y)*2/3]:P3.slice());
    if(Math.hypot(P3[0]-P0[0],P3[1]-P0[1])<1e-6&&Math.hypot(P1[0]-P0[0],P1[1]-P0[1])<1e-6)continue;
    out.push({P:[P0,P1,P2,P3],line,w0:A.w==null?1:A.w,w1:B.w==null?1:B.w});}
  return out;}
function skTan(P,t){let D=skBzD(P,t);if(Math.hypot(D[0],D[1])<1e-7){D=skBzDD(P,t);if(t>0.5)D=skMul(D,-1);
    if(Math.hypot(D[0],D[1])<1e-7)D=skSub(P[3],P[0]);}return skNorm(D);}
/* точка смещения стороны s (+1 слева, −1 справа) */
function skOff(sg,t,s,pen,tp){const C=skBz(sg.P,t),T=skTan(sg.P,t),n=[-T[1],T[0]];
  const m=sg.w0+(sg.w1-sg.w0)*skSm(t),tk=tp?tp(sg,t):1;
  if(pen.kind==='pt'){/* круг переменного радиуса: огибающая с поправкой на dr/ds */
    const rr=q=>{q=Math.min(1,Math.max(0,q));return pen.r(skTan(sg.P,q),sg.w0+(sg.w1-sg.w0)*skSm(q),tp?tp(sg,q):1);};
    const e=1e-3,ta=Math.max(0,t-e),tb=Math.min(1,t+e),ds=skLen(skSub(skBz(sg.P,tb),skBz(sg.P,ta)));
    const r=pen.r(T,m,tk);let rp=ds>1e-9?(rr(tb)-rr(ta))/ds:0;rp=Math.max(-0.9,Math.min(0.9,rp));const q=Math.sqrt(1-rp*rp);
    return [C[0]+r*(-rp*T[0]+s*q*n[0]),C[1]+r*(-rp*T[1]+s*q*n[1])];}
  const sp=skSupport(pen.M(T,m,tk),n);return [C[0]+s*sp.p[0],C[1]+s*sp.p[1]];}
/* подгонка кубической кривой к смещённой линии на [t0,t1] с фиксированными касательными концов */
function skFit(f,t0,t1,out,depth,line){
  const Q0=f(t0),Q3=f(t1),h=t1-t0;
  if(line){out.push([Q0,Q3]);return;}
  const e=Math.max(h*1e-3,1e-6);let d0=skSub(f(t0+e),Q0),d1=skSub(Q3,f(t1-e));
  const ch=skLen(skSub(Q3,Q0));
  if(ch<0.05){return;}
  let T0=skNorm(d0),T1=skNorm(d1);
  if(skLen(d0)<1e-9)T0=skNorm(skSub(f(t0+h*0.05),Q0));if(skLen(d1)<1e-9)T1=skNorm(skSub(Q3,f(t1-h*0.05)));
  const N=12,Q=[],us=[];let acc=0,prev=Q0;
  for(let i=1;i<N;i++){const q=f(t0+h*i/N);Q.push(q);acc+=skLen(skSub(q,prev));prev=q;us.push(acc);}
  acc+=skLen(skSub(Q3,prev));for(let i=0;i<us.length;i++)us[i]/=acc||1;
  let al=ch/3,be=ch/3,err=1e9;
  const bez=(a,b)=>[Q0,skAdd(Q0,skMul(T0,a)),skSub(Q3,skMul(T1,b)),Q3];
  for(let it=0;it<5;it++){let c11=0,c12=0,c22=0,x1=0,x2=0;
    for(let i=0;i<Q.length;i++){const u=us[i],v=1-u,b0=v*v*v,b1=3*v*v*u,b2=3*v*u*u,b3=u*u*u;
      const A1=skMul(T0,b1),A2=skMul(T1,-b2),R=skSub(Q[i],skAdd(skMul(Q0,b0+b1),skMul(Q3,b2+b3)));
      c11+=skDot(A1,A1);c12+=skDot(A1,A2);c22+=skDot(A2,A2);x1+=skDot(A1,R);x2+=skDot(A2,R);}
    const det=c11*c22-c12*c12;let a2=al,b2_=be;
    if(Math.abs(det)>1e-12){a2=(x1*c22-x2*c12)/det;b2_=(c11*x2-c12*x1)/det;}
    if(!(a2>ch*0.02)||!(b2_>ch*0.02)||a2>ch*1.6||b2_>ch*1.6){a2=ch/3;b2_=ch/3;}
    al=a2;be=b2_;const B=bez(al,be);err=0;
    for(let i=0;i<Q.length;i++){let u=us[i];
      for(let k=0;k<3;k++){const p=skSub(skBz(B,u),Q[i]),d=skBzD(B,u),dd=skBzDD(B,u);const num=skDot(p,d),den=skDot(d,d)+skDot(p,dd);if(Math.abs(den)<1e-12)break;u=Math.min(1,Math.max(0,u-num/den));}
      us[i]=u;err=Math.max(err,skLen(skSub(skBz(B,u),Q[i])));}
    if(err<SKX.TOL*0.3)break;}
  if(err>SKX.TOL&&depth<9){const tm=(t0+t1)/2;skFit(f,t0,tm,out,depth+1);skFit(f,tm,t1,out,depth+1);return;}
  out.push(bez(al,be));}
/* экстремумы смещённой линии по x и y — обязательные точки деления */
function skExt(f,t0,t1){const K=40,pts=[];for(let i=0;i<=K;i++)pts.push(f(t0+(t1-t0)*i/K));const out=[];
  for(const ax of [0,1]){const span=Math.max(...pts.map(p=>p[ax]))-Math.min(...pts.map(p=>p[ax]));if(span<0.8)continue;
    for(let i=1;i<K;i++){const a=pts[i][ax]-pts[i-1][ax],b=pts[i+1][ax]-pts[i][ax];if(a*b>=0)continue;
      let lo=t0+(t1-t0)*(i-1)/K,hi=t0+(t1-t0)*(i+1)/K,sg=a>0?1:-1;
      for(let k=0;k<30;k++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;if(sg*(f(m1)[ax]-f(m2)[ax])<0)lo=m1;else hi=m2;}
      const t=(lo+hi)/2,p=f(t);
      if(t-t0<(t1-t0)*0.012||t1-t<(t1-t0)*0.012)continue;
      if(skLen(skSub(p,pts[0]))<1.5||skLen(skSub(p,pts[K]))<1.5)continue;
      out.push(t);}}
  out.sort((a,b)=>a-b);const r=[];for(const t of out)if(!r.length||t-r[r.length-1]>(t1-t0)*0.01)r.push(t);return r;}
function skSide(segs,s,pen,tp){const out=[];
  /* быстрый режим (перетаскивание ползунка): огибающая — ломаная по 10 точкам, без подгонки кривых */
  if(SKX.FAST){for(const sg of segs){const f=t=>skOff(sg,t,s,pen,tp);const cw=sg.w0===sg.w1&&!(tp&&tp.active(sg));const N=sg.line&&cw?1:10;
      let a=f(0);for(let i=1;i<=N;i++){const b=f(i/N);out.push([a,b]);a=b;}}return out;}
  for(const sg of segs){const f=t=>skOff(sg,t,s,pen,tp);
    const cw=sg.w0===sg.w1&&!(tp&&tp.active(sg));
    if(sg.line&&cw&&pen.kind==='ell'){skFit(f,0,1,out,0,true);continue;}
    if(sg.line&&cw&&pen.kind==='pt'){skFit(f,0,1,out,0,true);continue;}
    const br=[0,...skExt(f,0,1),1];for(let i=0;i<br.length-1;i++)skFit(f,br[i],br[i+1],out,0,false);}
  return out;}
/* дуга пера (окончание): от опорной точки u0 на 180° в сторону направления To */
function skCapArc(C,M,u0,To){const w=[M[0][0]*To[0]+M[1][0]*To[1],M[0][1]*To[0]+M[1][1]*To[1]];
  const dir=skCross(u0,w)>=0?1:-1,f0=Math.atan2(u0[1],u0[0]),out=[],kk=4/3*Math.tan(Math.PI/8);
  for(let i=0;i<2;i++){const a=f0+dir*i*Math.PI/2,b=a+dir*Math.PI/2;
    const ua=[Math.cos(a),Math.sin(a)],ub=[Math.cos(b),Math.sin(b)],ta=[-Math.sin(a)*dir,Math.cos(a)*dir],tb=[-Math.sin(b)*dir,Math.cos(b)*dir];
    const P0=skAdd(C,skMu(M,ua)),P3=skAdd(C,skMu(M,ub));
    out.push([P0,skAdd(P0,skMu(M,skMul(ta,kk))),skSub(P3,skMu(M,skMul(tb,kk))),P3]);}
  return out;}
const skCurLen=c=>skLen(skSub(c[c.length-1],c[0]));
/* цепочка кривых -> узлы контура */
const skPolyLen=c=>c.length===2?skCurLen(c):skLen(skSub(c[1],c[0]))+skLen(skSub(c[2],c[1]))+skLen(skSub(c[3],c[2]));
function skChainNodes(cv){cv=cv.filter(c=>skCurLen(c)>0.3||skPolyLen(c)>2);
  /* стыки после выброса крошечных кусков: конец предыдущего = начало следующего */
  for(let i=0;i<cv.length;i++){const a=cv[i],b=cv[(i+1)%cv.length];const e=a[a.length-1],s=b[0];
    if(e[0]!==s[0]||e[1]!==s[1]){const m=[(e[0]+s[0])/2,(e[1]+s[1])/2];const de=skSub(m,e),dsx=skSub(m,s);
      a[a.length-1]=m;if(a.length===4)a[2]=skAdd(a[2],de);b[0]=m;if(b.length===4)b[1]=skAdd(b[1],dsx);}}
  const n=cv.length,ns=[];
  for(let i=0;i<n;i++){const c=cv[i];ns.push({x:c[0][0],y:c[0][1],a:null,b:c.length===4?{x:c[1][0],y:c[1][1]}:null});}
  for(let i=0;i<n;i++){const c=cv[i];if(c.length===4)ns[(i+1)%n].a={x:c[2][0],y:c[2][1]};}
  return ns;}
const skRev=cv=>cv.slice().reverse().map(c=>c.slice().reverse());
/* окончание: тип -> кривые от A (левая сторона) к B (правая сторона); chains — для подрезки срезом */
function skCapKind(cap,p){if(cap==='T'){const t=p&&p.term!=null?Math.round(p.term):1;return ['R','F','HV','B'][Math.max(0,Math.min(3,t))];}
  if(cap==='J')return 'R';if(cap==='C')return 'F';return cap||'R';}
function skMakeCap(kind,end,Lc,Rc,C,M,T,u0,p,extra){
  /* end: 1 — конец (Lc/Rc вперёд, последний элемент), 0 — начало */
  const To=end?T:skMul(T,-1);
  const A=end?Lc[Lc.length-1].slice(-1)[0]:Rc[0][0],B=end?Rc[Rc.length-1].slice(-1)[0]:Lc[0][0];
  let k=kind;
  if(k==='HV')k=Math.abs(To[0])>Math.abs(To[1])?'V':'H';
  if(k==='R'||k==='X'||k==='B'||k==='D'){if(k==='B'&&extra){const r=Math.max(Math.abs(M[0][0])+Math.abs(M[0][1]),Math.abs(M[1][0])+Math.abs(M[1][1]))*1.0;
      extra.push(mkc(skBall(skSub(C,skMul(To,r*0.25)),r*1.18),false));}
    const uu=end?u0:skMul(u0,-1);return skCapArc(C,M,uu,To);}
  if(k==='F')return [[A,B]];
  let d,at=null;
  if(k==='H')d=[1,0];else if(k==='V')d=[0,1];else if(k&&k.cut){d=skNorm(k.cut);at=k.at||null;}else return [[A,B]];
  const cr=skCross(To,d);if(Math.abs(cr)<0.08)return [[A,B]];
  if(at==null)at=C;
  const eOf=(Q,R)=>skCross(skSub(R,Q),d)/cr;
  let eA=eOf(A,at),eB=eOf(B,at);
  const cA=end?Lc[Lc.length-1]:Rc[0],cB=end?Rc[Rc.length-1]:Lc[0];
  const ok=(c,e)=>e>=-0.01||(c.length===2&&skCurLen(c)>-e+0.5);
  if(!ok(cA,eA)||!ok(cB,eB)){const e2=eOf(B,A);if(e2>=0){eA=0;eB=e2;}else{eA=eOf(A,B);eB=0;}}
  const A2=skAdd(A,skMul(To,eA)),B2=skAdd(B,skMul(To,eB));
  const trim=(c,P)=>{if(end)c[c.length-1]=P;else c[0]=P;};
  /* у начала цепочки L/R идут в обратную сторону от окончания: для начала A лежит на R[0][0], B — на L[0][0] */
  if(eA<-0.01)trim(cA,A2);if(eB<-0.01)trim(cB,B2);
  const out=[];
  if(eA>0.01)out.push([A,A2]);out.push([A2,B2]);if(eB>0.01)out.push([B2,B]);
  return out;}
function skBall(C,r){return ellN(C[0],C[1],r,r);}
/* сужение к концу ('X'): множитель ширины по длине штриха */
function skTaper(segs,c0,c1,len){const L=[];let acc=0;for(const sg of segs){const l=skLen(skSub(sg.P[3],sg.P[0]))*0.5+(skLen(skSub(sg.P[1],sg.P[0]))+skLen(skSub(sg.P[2],sg.P[1]))+skLen(skSub(sg.P[3],sg.P[2])))*0.5;L.push([acc,l]);acc+=l;}
  const tot=acc,a0=c0==='X',a1=c1==='X',d0=c0==='D',d1=c1==='D';if(!a0&&!a1&&!d0&&!d1)return null;const tl=Math.min(len,tot*0.45),mn=0.22;
  /* 'D' — капля: штрих плавно утолщается к концу (одним контуром, без отдельного круга) */
  const dl=Math.min(len*0.55,tot*0.4),dk=0.75;
  const idx=new Map(segs.map((s,i)=>[s,i]));
  const f=(sg,t)=>{const q=L[idx.get(sg)],s=q[0]+q[1]*t;let k=1;if(a0)k*=mn+(1-mn)*skSm(s/tl);if(a1)k*=mn+(1-mn)*skSm((tot-s)/tl);
    if(d0)k*=1+dk*Math.pow(skSm(1-s/dl),1.5);if(d1)k*=1+dk*Math.pow(skSm(1-(tot-s)/dl),1.5);return k;};
  f.active=sg=>{const q=L[idx.get(sg)];return ((a0||d0)&&q[0]<Math.max(tl,dl))||((a1||d1)&&q[0]+q[1]>tot-Math.max(tl,dl));};
  return f;}
/* кусок открытого штриха -> {L,R, концы} */
function skPiece(nodes,pen,c0,c1,taperLen){
  const segs=skSegs(nodes,false);if(!segs.length)return null;
  const tp=skTaper(segs,c0,c1,taperLen);
  const Lc=skSide(segs,1,pen,tp),Rc=skSide(segs,-1,pen,tp);if(!Lc.length||!Rc.length)return null;
  const s0=segs[0],s1=segs[segs.length-1];
  const T0=skTan(s0.P,0),T1=skTan(s1.P,1);
  const M0=pen.M(T0,s0.w0,tp?tp(s0,0):1),M1=pen.M(T1,s1.w1,tp?tp(s1,1):1);
  const u0=skSupport(M0,[-T0[1],T0[0]]).u,u1=skSupport(M1,[-T1[1],T1[0]]).u;
  return {segs,Lc,Rc,T0,T1,M0,M1,u0,u1,C0:s0.P[0],C1:s1.P[3]};}
function skAssemble(pc,c0,c1,p,extra){
  const k1=skCapKind(c1,p),k0=skCapKind(c0,p);
  const capE=skMakeCap(k1,1,pc.Lc,pc.Rc,pc.C1,pc.M1,pc.T1,pc.u1,p,extra);
  const capS=skMakeCap(k0,0,pc.Lc,pc.Rc,pc.C0,pc.M0,pc.T0,pc.u0,p,extra);
  const cv=[...pc.Lc,...capE,...skRev(pc.Rc),...capS];
  return skOrient(skChainNodes(cv),false);}
/* ориентация по площади с кривыми (у контура штриха с малым числом узлов многоугольник узлов обманчив) */
function skFlatArea(ns){const P=flatC({nodes:ns},10);let s2=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s2+=a[0]*b[1]-b[0]*a[1];}return s2/2;}
function skOrient(ns,hole){const ar=skFlatArea(ns);if((ar>0)!==!hole)ns=reverseNodes(ns);return {hole:!!hole,nodes:ns};}
/* клин излома: внешняя сторона между концами кусков, острие (с ограничением) и срез по y=cy */
function skWedge(C,E1,T1,E2,T2,hw,lim,j,cy){
  let poly;
  if(j==='bevel')poly=[C,E1,E2];
  else{const cr=skCross(T1,T2);let M=null;
    if(Math.abs(cr)>1e-6){const t=skCross(skSub(E2,E1),T2)/cr;M=skAdd(E1,skMul(T1,t));}
    if(!M||skLen(skSub(M,C))>hw*lim){const b=skNorm(skAdd(skNorm(skSub(E1,C)),skNorm(skSub(E2,C)))),L=hw*lim;
      const Pp=skAdd(C,skMul(b,L)),dd=[-b[1],b[0]];
      const X=(E,T)=>{const c=skCross(T,dd);if(Math.abs(c)<1e-9)return E;const t=skCross(skSub(Pp,E),dd)/c;return skAdd(E,skMul(T,Math.max(0,t)));};
      poly=[C,E1,X(E1,T1),X(E2,skMul(T2,-1)),E2];}
    else poly=[C,E1,M,E2];}
  if(cy!=null){const up=cy>C[1],inside=q=>up?q[1]<=cy:q[1]>=cy,res=[];
    for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ia=inside(a),ib=inside(b);
      if(ia)res.push(a);if(ia!==ib){const t=(cy-a[1])/(b[1]-a[1]);res.push([a[0]+(b[0]-a[0])*t,cy]);}}
    poly=res;}
  if(poly.length<3)return null;
  const ns=poly.map(q=>({x:q[0],y:q[1],a:null,b:null}));if(Math.abs(area(ns))<1)return null;return mkc(ns,false);}
/* штрих -> контуры */
function skStroke(st,pen,p){
  /* стык эллиптическим пером: круглый конец совпал бы с краями ствола того же пера (касание контуров) — плоский */
  if(pen.kind==='ell'&&!st.dot&&(st.cap0==='J'||st.cap1==='J'))st=Object.assign({},st,{cap0:st.cap0==='J'?'F':st.cap0,cap1:st.cap1==='J'?'F':st.cap1});
  if(st.dot&&st.poly)return st.poly.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{x:n.a.x,y:n.a.y},b:n.b&&{x:n.b.x,y:n.b.y}})),false));/* filled contour (serifs): a dot stroke that carries its own outline */
  if(st.dot){const r=st.r;const rx=st.rx||r,ry=st.ry||r;return [mkc(ellN(st.x,st.y,rx,ry),false)];}
  let nodes=st.nodes;if(!nodes||nodes.length<2)return [];
  const out=[],extra=[];const tl=st.tl||Math.max(pen.o.stem||((pen.o.rx||40)*2),40)*2.2;
  const closed=!!st.closed;
  const cidx=[];nodes.forEach((q,i)=>{if(q.type==='corner'&&(closed||(i>0&&i<nodes.length-1)))cidx.push(i);});
  if(closed&&!cidx.length){
    const segs=skSegs(nodes,true);const Lc=skSide(segs,1,pen,null),Rc=skSide(segs,-1,pen,null);
    const A=skChainNodes(Lc),B=skChainNodes(Rc);
    /* площадь по кривым (многоугольник узлов у эллипса с 4 узлами — ромб, сравнение по нему ошибочно) */
    const fa=ns=>{const P=flatC({nodes:ns},8);let s2=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s2+=a[0]*b[1]-b[0]*a[1];}return Math.abs(s2/2);};
    const aa=fa(A),ab=fa(B);
    return [skOrient(A,aa<ab),skOrient(B,ab<aa)];}
  if(closed){const k=cidx[0];nodes=[...nodes.slice(k),...nodes.slice(0,k),Object.assign({},nodes[k])];cidx.length=0;nodes.forEach((q,i)=>{if(q.type==='corner'&&i>0&&i<nodes.length-1)cidx.push(i);});}
  const cuts=[0,...cidx,nodes.length-1],pcs=[];
  for(let i=0;i<cuts.length-1;i++){const sub=nodes.slice(cuts[i],cuts[i+1]+1).map(q=>Object.assign({},q));
    sub[0].a=null;sub[sub.length-1].b=null;
    const first=i===0&&!closed,last=i===cuts.length-2&&!closed;
    const jn=q=>(q.j||st.j||'miter')==='round'?'R':'F';
    const c0=first?st.cap0:jn(nodes[cuts[i]]),c1=last?st.cap1:jn(nodes[cuts[i+1]]);
    const pc=skPiece(sub,pen,first?st.cap0:null,last?st.cap1:null,tl);if(!pc)continue;pc.c0=c0;pc.c1=c1;pcs.push(pc);}
  /* клинья на изломах */
  const wedge=(A,B,q)=>{const j=q.j||st.j||'miter';if(j==='round')return;
    const cr=skCross(A.T1,B.T0);if(Math.abs(cr)<0.02&&skDot(A.T1,B.T0)>0)return;
    const s=cr>0?-1:1;
    const E1=s>0?A.Lc[A.Lc.length-1].slice(-1)[0]:A.Rc[A.Rc.length-1].slice(-1)[0],E2=s>0?B.Lc[0][0]:B.Rc[0][0];
    const C=A.C1,hw=Math.max(skLen(skSub(E1,C)),skLen(skSub(E2,C)));
    const w=skWedge(C,E1,A.T1,E2,B.T0,hw,st.lim||SKX.LIM,j,q.cy);if(w)out.push(w);};
  for(let i=0;i<pcs.length-1;i++)wedge(pcs[i],pcs[i+1],nodes[cuts[i+1]]);
  if(closed&&pcs.length)wedge(pcs[pcs.length-1],pcs[0],nodes[0]);
  for(const pc of pcs)out.push(skAssemble(pc,pc.c0,pc.c1,p,extra));
  return out.concat(extra);}
/* чистая функция API: скелет + перо + параметры -> контуры (без объединения) */
function skelToContours(skel,pen,p){const out=[];
  for(const st of skel||[]){let cs=[];try{cs=skStroke(st,st.pen?skPenOf(st.pen,p):pen,p);}catch(e){if(typeof console!=='undefined'&&SKX.debug)console.log('skel',e);}
    for(const c of cs)if(c&&c.nodes&&c.nodes.length>=2){if(st.grp)c.grp=st.grp;if(st.op)c.op=st.op;out.push(c);}}
  return out;}
/* перо из параметров шрифта: {kind:'ell'|'pt', ...} */
function skPenOf(spec,p){spec=spec||{};const q=Object.assign({},spec);
  if(q.kind==='pt')return skPen('pt',{hair:q.hair!=null?q.hair:p.hair,stem:q.stem!=null?q.stem:p.stem,press:q.press!=null?q.press:(p.press==null?1:p.press/100)});
  return skPen('ell',{rx:(q.rx!=null?q.rx:p.stem/2),ry:(q.ry!=null?q.ry:p.hair/2),ang:q.ang!=null?q.ang:(p.nib||0),stem:p.stem});}

/* ---------- построители штрихов ---------- */
const SKB={
  st:(nodes,c0,c1,o)=>Object.assign({nodes,cap0:c0||'T',cap1:c1||'T'},o||{}),
  L:(x0,y0,x1,y1,c0,c1,o)=>SKB.st(skLn(x0,y0,x1,y1),c0||'F',c1||'F',o),
  P:(specs,c0,c1,o)=>{o=o||{};const n=skPath(specs,o);return SKB.st(n,c0,c1,Object.assign({closed:!!o.closed},o));},
  A:(cx,cy,rx,ry,a0,a1,c0,c1,o)=>SKB.st(skArcN(cx,cy,rx,ry,a0,a1,o&&o.tens),c0,c1,o),
  E:(cx,cy,rx,ry,o)=>{const n=skArcN(cx,cy,rx,ry,-90,270,o&&o.tens);const l=n.pop();n[0].a=l.a;/* оптика §2: бока овала ≈104,5% ствола, верх/низ ≈102% (узлы -90,0,90,180) */const W=[1.02,1.045,1.02,1.045];n.forEach((q,i)=>{if(q.w==null&&W[i])q.w=W[i];});return Object.assign({nodes:n,closed:true,cap0:'R',cap1:'R'},o||{});},
  D:(x,y,r,o)=>Object.assign({dot:true,x,y,r},o||{}),
  C:(parts,c0,c1,o)=>SKB.st(skCat(...parts),c0,c1,o),
};
/* сдвиг/преобразование скелета (для композитов и зеркал) */
function skXf(skel,fn){const P=(o)=>o?(()=>{const q=fn(o.x,o.y);return {x:q[0],y:q[1]};})():null;
  return skel.map(st=>{if(st.dot){const q=fn(st.x,st.y);const o=Object.assign({},st,{x:q[0],y:q[1]});if(st.poly)o.poly=st.poly.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>{const m=fn(n.x,n.y);return {x:m[0],y:m[1],a:P(n.a),b:P(n.b)};})}));return o;}
    return Object.assign({},st,{nodes:st.nodes.map(n=>{const q=fn(n.x,n.y);return Object.assign({},n,{x:q[0],y:q[1],a:P(n.a),b:P(n.b)});})});});}
/* зеркало меняет направление хода — для остроконечного пера нажим считается по ходу, поэтому штрих разворачивается */
function skReverse(st){if(st.dot)return st;const n=st.nodes.slice().reverse().map(q=>Object.assign({},q,{a:q.b,b:q.a}));return Object.assign({},st,{nodes:n,cap0:st.cap1,cap1:st.cap0});}
const skMirX=(skel,w)=>skXf(skel,(x,y)=>[w-x,y]);
/* ---------- упрощение итогового контура: соседние гладкие куски сливаются в одну кривую, если она ложится
   в допуск; узлы на изломах и экстремумах (касательная H/V) сохраняются ---------- */
function skFitPts(Q0,Q3,T0,T1,Q){const ch=skLen(skSub(Q3,Q0));if(ch<1e-6)return null;
  /* скалярная версия (без временных массивов): то же вычисление в том же порядке */
  const us=[];let acc=0,prev=Q0;for(const q of Q){acc+=skLen(skSub(q,prev));prev=q;us.push(acc);}acc+=skLen(skSub(Q3,prev));for(let i=0;i<us.length;i++)us[i]/=acc||1;
  let al=ch/3,be=ch/3,err=1e9,B=null;const bez=(a,b)=>[Q0,skAdd(Q0,skMul(T0,a)),skSub(Q3,skMul(T1,b)),Q3];
  const q0x=Q0[0],q0y=Q0[1],q3x=Q3[0],q3y=Q3[1],t0x=T0[0],t0y=T0[1],t1x=T1[0],t1y=T1[1],n=Q.length;
  for(let it=0;it<6;it++){let c11=0,c12=0,c22=0,x1=0,x2=0;
    for(let i=0;i<n;i++){const u=us[i],v=1-u,b0=v*v*v,b1=3*v*v*u,b2=3*v*u*u,b3=u*u*u,qi=Q[i];
      const a1x=t0x*b1,a1y=t0y*b1,a2x=t1x*-b2,a2y=t1y*-b2,rx=qi[0]-(q0x*(b0+b1)+q3x*(b2+b3)),ry=qi[1]-(q0y*(b0+b1)+q3y*(b2+b3));
      c11+=a1x*a1x+a1y*a1y;c12+=a1x*a2x+a1y*a2y;c22+=a2x*a2x+a2y*a2y;x1+=a1x*rx+a1y*ry;x2+=a2x*rx+a2y*ry;}
    const det=c11*c22-c12*c12;if(Math.abs(det)<1e-12)return null;
    al=(x1*c22-x2*c12)/det;be=(c11*x2-c12*x1)/det;if(!(al>ch*0.02)||!(be>ch*0.02)||al>ch*1.5||be>ch*1.5)return null;
    B=bez(al,be);err=0;
    const p0x=B[0][0],p0y=B[0][1],p1x=B[1][0],p1y=B[1][1],p2x=B[2][0],p2y=B[2][1],p3x=B[3][0],p3y=B[3][1];
    for(let i=0;i<n;i++){let u=us[i];const qx=Q[i][0],qy=Q[i][1];
      for(let k=0;k<4;k++){const w=1-u;
        const px=w*w*w*p0x+3*w*w*u*p1x+3*w*u*u*p2x+u*u*u*p3x-qx,py=w*w*w*p0y+3*w*w*u*p1y+3*w*u*u*p2y+u*u*u*p3y-qy;
        const dx=3*w*w*(p1x-p0x)+6*w*u*(p2x-p1x)+3*u*u*(p3x-p2x),dy=3*w*w*(p1y-p0y)+6*w*u*(p2y-p1y)+3*u*u*(p3y-p2y);
        const ddx=6*w*(p2x-2*p1x+p0x)+6*u*(p3x-2*p2x+p1x),ddy=6*w*(p2y-2*p1y+p0y)+6*u*(p3y-2*p2y+p1y);
        const num=px*dx+py*dy,den=dx*dx+dy*dy+(px*ddx+py*ddy);if(Math.abs(den)<1e-12)break;u=Math.min(1,Math.max(0,u-num/den));}
      us[i]=u;const w=1-u,ex=w*w*w*p0x+3*w*w*u*p1x+3*w*u*u*p2x+u*u*u*p3x-qx,ey=w*w*w*p0y+3*w*w*u*p1y+3*w*u*u*p2y+u*u*u*p3y-qy;
      const e=Math.hypot(ex,ey);if(e>err)err=e;}}
  return {B,err};}
function skSimplifyC(c,tol){const ns=c.nodes,n=ns.length;if(n<3)return c;
  const seg=i=>{const A=ns[i],B=ns[(i+1)%n];return A.b||B.a?[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]]:[[A.x,A.y],[B.x,B.y]];};
  const S=[];for(let i=0;i<n;i++)S.push(seg(i));
  const keep=ns.map((q,i)=>{const sIn=S[(i-1+n)%n],sOut=S[i];if(sIn.length===2||sOut.length===2)return true;
    const ti=skSub(sIn[3],sIn[2]),to=skSub(sOut[1],sOut[0]);const li=skLen(ti),lo=skLen(to);if(li<1e-6||lo<1e-6)return true;
    if(Math.abs(skCross(ti,to))/(li*lo)>0.02||skDot(ti,to)<0)return true;
    const t=skNorm(to),P=[ns[i].x,ns[i].y];
    /* настоящий экстремум: обе соседние кривые по одну сторону от узла по этой оси */
    const ext=ax=>{const a=skBz(sIn,0.5)[ax]-P[ax],b=skBz(sOut,0.5)[ax]-P[ax];return (a<-1.5&&b<-1.5)||(a>1.5&&b>1.5);};
    return (Math.abs(t[0])<0.0175&&ext(0))||(Math.abs(t[1])<0.0175&&ext(1));});
  const k0=keep.indexOf(true);if(k0<0)return c;
  const R=[];for(let q=0;q<n;q++)R.push(S[(k0+q)%n]);const KP=[];for(let q=0;q<n;q++)KP.push(keep[(k0+q)%n]);
  const out=[];let a=0;
  while(a<n){let b=a+1;while(b<n&&!KP[b])b++;/* сегменты a..b-1 между сохраняемыми узлами */
    let q=a;while(q<b){if(R[q].length===2){out.push(R[q]);q++;continue;}
      let best=q,bestB=null;
      for(let e=q+1;e<b;e++){if(R[e].length===2)break;const Q=[];for(let m=q;m<=e;m++)for(let k=(m===q?1:0);k<8;k++)Q.push(skBz(R[m],k/8));
        const T0=skSub(R[q][1],R[q][0]),T1=skSub(R[e][3],R[e][2]);if(skLen(T0)<1e-6||skLen(T1)<1e-6)break;
        const f=skFitPts(R[q][0],R[e][3],skNorm(T0),skNorm(T1),Q.slice(1));if(f&&f.err<=tol){best=e;bestB=f.B;}else if(e-q>3)break;}
      if(bestB){out.push(bestB);q=best+1;}else{out.push(R[q]);q++;}}
    a=b;}
  return Object.assign({},c,{nodes:skChainNodes(out)});}
/* короткий прямой отрезок между двумя углами (< 6 ед., «ступенька») стягивается в один узел */
function skNoSteps(c){let ns=c.nodes;if(ns.length<4)return c;let ch=true,guard=0;
  while(ch&&guard++<20){ch=false;const n=ns.length;if(n<4)break;
    for(let i=0;i<n;i++){const A=ns[i],B=ns[(i+1)%n];if(A.b||B.a)continue;const L=Math.hypot(B.x-A.x,B.y-A.y);if(L<0.5||L>=6)continue;
      const mx=(A.x+B.x)/2,my=(A.y+B.y)/2,dA=[mx-A.x,my-A.y],dB=[mx-B.x,my-B.y];
      const M={x:mx,y:my,a:A.a?{x:A.a.x+dA[0],y:A.a.y+dA[1]}:null,b:B.b?{x:B.b.x+dB[0],y:B.b.y+dB[1]}:null};
      const out=[];for(let k=0;k<n;k++){if(k===i)out.push(M);else if(k===(i+1)%n)continue;else out.push(ns[k]);}
      if((i+1)%n===0)out.shift();ns=out;ch=true;break;}}
  return Object.assign({},c,{nodes:ns});}
/* + крошечные контуры (щель-«треугольник» площадью < 40 ед.², растровый мусор объединения) отбрасываются */
function skSimplify(cs,tol){return cs.map(c=>skNoSteps(skSimplifyC(c,tol||1.0))).filter(c=>c.nodes.length>=2&&!(Math.abs(skFlatArea(c.nodes))<40));}
