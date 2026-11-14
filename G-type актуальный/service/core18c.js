/* ===== Скелетные шрифты: общий набор (комплект K, регистрация, знаки препинания, диакритика) ===== */
/* параметры пера — в общей таблице PARAMS (новая группа «Перо»; у шрифтов на контурах скрыты) */
if(!PARAMS.some(r=>r[0]==='nib'))PARAMS.push(['nib','Угол пера, °',-30,60,1,'Перо'],['press','Нажим, %',0,100,1,'Перо'],
  ['term','Окончания',0,3,1,'Перо'],['tens','Натяжение кривых',0.8,1.3,0.01,'Перо'],['conn','Связность, %',0,100,1,'Перо']);
/* комплект для рисования скелета: метрики знака и средние линии краёв (центр пера на S/2 и H/2 от края) */
function skKit(g,font){const p=g.p,S=p.stem,H=p.hair,pn=font.pen(p);
  const K={g,p,font,w:g.w,h:g.h,S,H,ov:p.ov||0,xh:p.xh,capH:p.capH,asc:p.asc,desc:p.desc,tens:p.tens||1};
  K.hx=S/2;K.hy=H/2;
  if(pn.kind==='ell'){const M=pn.M([0,1],1),M2=pn.M([1,0],1);K.hx=Math.abs(skSupport(M,[-1,0]).p[0]);K.hy=Math.abs(skSupport(M2,[0,1]).p[1]);}
  else{K.hx=p.stem/2;K.hy=p.hair/2;}
  K.L=K.hx;K.R=g.w-K.hx;K.cx=g.w/2;K.B=K.hy;K.T=g.h-K.hy;K.ym=g.h/2;
  /* эллиптическое перо: край перекладины на 0.3 ед. внутри от среза ствола — без совпадающих рёбер в CSG */
  if(pn.kind==='ell'){K.B+=0.3;K.T-=0.3;}
  K.st=(x,y0,y1,c0,c1)=>SKB.L(x,y0,x,y1,c0||'H',c1||'H');
  K.hb=(x0,x1,y,c0,c1)=>SKB.L(x0,y,x1,y,c0||'V',c1||'V');
  K.ln=(x0,y0,x1,y1,c0,c1)=>SKB.L(x0,y0,x1,y1,c0||'H',c1||'H');
  K.ov_=(cx,cy,rx,ry)=>SKB.E(cx,cy,rx,ry,{tens:K.tens});
  K.arc=(cx,cy,rx,ry,a0,a1,c0,c1)=>SKB.A(cx,cy,rx,ry,a0,a1,c0||'T',c1||'T',{tens:K.tens});
  K.pa=(specs,c0,c1,o)=>SKB.P(specs,c0||'T',c1||'T',Object.assign({tens:K.tens},o||{}));
  K.dot=(x,y,r)=>SKB.D(x,y,r||K.dr());
  K.dr=()=>Math.max(K.S,K.H)*0.62;
  return K;}
/* объединение с проверкой: точное CSG иногда ошибается на совпадающих рёбрах (край перекладины = срез ствола
   при повёрнутом пере) — сверяем площадь с растром исходных штрихов; при расхождении — сдвиг на 0.06 ед. и повтор */
/* ---------- бюджет узлов: жадное слияние соседних пролётов в одну кривую по исходным отсчётам (ошибка не копится),
   сначала самые дешёвые гладкие узлы, экстремумы и мягкие изломы — в последнюю очередь; ошибка ≤ tolMax ед. ---------- */
function skSegsOf(c){const ns=c.nodes,n=ns.length,S=[];for(let i=0;i<n;i++){const A=ns[i],B=ns[(i+1)%n];S.push(A.b||B.a?[[A.x,A.y],A.b?[A.b.x,A.b.y]:[A.x,A.y],B.a?[B.a.x,B.a.y]:[B.x,B.y],[B.x,B.y]]:[[A.x,A.y],[B.x,B.y]]);}return S;}
function skSpanOf(s){const line=s.length===2,P0=s[0],P3=s[s.length-1],Q=[];
  const dir=(a,list)=>{for(const q of list){const d=skSub(q,a);if(skLen(d)>1e-6)return skNorm(d);}return [1,0];};
  let T0,T1;
  if(line){T0=T1=skNorm(skSub(P3,P0));}
  else{const N=Math.max(8,Math.ceil(skPolyLen(s)/6));for(let k=1;k<N;k++)Q.push(skBz(s,k/N));T0=dir(P0,[s[1],s[2],s[3]]);const d=dir(P3,[s[2],s[1],s[0]]);T1=[-d[0],-d[1]];}
  return {line,P0,P3,T0,T1,Q,seg:s};}
/* обратная проверка посадки: сама новая кривая не должна уходить от исходной ломаной дальше tol (петли и выбросы при больших рукоятках) */
const skStride=Q=>{if(Q.length<=44)return Q;const k=Math.ceil(Q.length/44),o=[];for(let i=0;i<Q.length;i+=k)o.push(Q[i]);return o;};
function skRevOk(B,pts,tol){const n=pts.length,lim=tol*1.15;for(let k=1;k<24;k++){const q=skBz(B,k/24),qx=q[0],qy=q[1];let m=1e18;
    for(let i=0;i<n-1;i++){const a=pts[i],b=pts[i+1],ax=a[0],ay=a[1],dx=b[0]-ax,dy=b[1]-ay,l=dx*dx+dy*dy;let t=l?((qx-ax)*dx+(qy-ay)*dy)/l:0;t=t<0?0:t>1?1:t;const ex=qx-ax-t*dx,ey=qy-ay-t*dy,d=ex*ex+ey*ey;if(d<m)m=d;}
    if(Math.sqrt(m)>lim)return false;}return true;}
function skMergeSpans(A,B,tol){
  if(A.line!==B.line){const pts=S=>{if(!S.line)return S.Q;const L=skLen(skSub(S.P3,S.P0)),N=Math.max(1,Math.ceil(L/8)),o=[];for(let k=1;k<N;k++)o.push(skAdd(S.P0,skMul(skSub(S.P3,S.P0),k/N)));return o.concat(S.Q);};
    const Q=pts(A).concat([A.P3],pts(B));const Qs=skStride(Q),f=skFitPts(A.P0,B.P3,A.T0,B.T1,Qs);if(!f||f.err>tol*0.8||!skRevOk(f.B,[A.P0].concat(Qs,[B.P3]),tol))return null;
    return {err:f.err*1.25,span:{line:false,P0:A.P0,P3:B.P3,T0:A.T0,T1:B.T1,Q,seg:f.B}};}
  if(A.line){const L=skSub(B.P3,A.P0),ll=skLen(L);if(ll<1e-6)return null;const nL=skNorm(L);let e=Math.abs(skCross(nL,skSub(A.P3,A.P0)));for(const q of A.Q.concat(B.Q))e=Math.max(e,Math.abs(skCross(nL,skSub(q,A.P0))));
    if(e>tol*0.5)return null;return {err:e,span:{line:true,P0:A.P0,P3:B.P3,T0:nL,T1:nL,Q:A.Q.concat([A.P3],B.Q),seg:[A.P0,B.P3]}};}
  const Q=A.Q.concat([A.P3],B.Q);const Qs=skStride(Q),f=skFitPts(A.P0,B.P3,A.T0,B.T1,Qs);if(!f||f.err>tol||!skRevOk(f.B,[A.P0].concat(Qs,[B.P3]),tol))return null;
  return {err:f.err,span:{line:false,P0:A.P0,P3:B.P3,T0:A.T0,T1:B.T1,Q,seg:f.B}};}
/* перепосадка: между обязательными узлами (изломы, стыки с прямыми, при forceExt — экстремумы) кривая заново режется на минимум
   кубиков по плотным отсчётам исходного контура (жадно, самый длинный кусок в допуск); касательные в узлах берутся с исходной кривой */
function skRefit(c,tol,forceExt){const S=skSegsOf(c),n=S.length;if(n<3)return c;
  const dirAt=(s,t)=>{let d=skBzD(s,t);if(skLen(d)<1e-6){d=t<0.5?skSub(s[3],s[0]):skSub(s[3],s[0]);}return skNorm(d);};
  const forced=[];for(let i=0;i<n;i++){const A=S[(i-1+n)%n],B=S[i];if(A.length===2||B.length===2){forced.push(true);continue;}
    const ta=dirAt(A,1),tb=dirAt(B,0);if(skDot(ta,tb)<0.97){forced.push(true);continue;}
    if(forceExt&&(Math.abs(tb[0])<0.0175||Math.abs(tb[1])<0.0175)){const P=B[0];const a=skBz(A,0.5),b=skBz(B,0.5);const ex=ax=>{const u=a[ax]-P[ax],v=b[ax]-P[ax];return (u<-1.5&&v<-1.5)||(u>1.5&&v>1.5);};
      if((Math.abs(tb[0])<0.0175&&ex(0))||(Math.abs(tb[1])<0.0175&&ex(1))){forced.push(true);continue;}}
    forced.push(false);}
  let k0=forced.indexOf(true);if(k0<0){k0=0;forced[0]=true;}
  const out=[];let i=0;
  while(i<n){const sg=S[(k0+i)%n];if(sg.length===2){out.push(sg);i++;continue;}
    let j=i+1;while(j<n&&!forced[(k0+j)%n]&&S[(k0+j)%n].length===4)j++;/* секция i..j-1 */
    const P=[],T=[];for(let m=i;m<j;m++){const s=S[(k0+m)%n];const N=Math.max(4,Math.ceil(skLen(skSub(s[3],s[0]))/5)+Math.ceil(skPolyLen(s)/9));
      for(let k=0;k<N;k++){P.push(skBz(s,k/N));T.push(dirAt(s,k/N));}}
    const last=S[(k0+j-1)%n];P.push(last[3]);T.push(dirAt(last,1));
    const M=P.length-1;let a=0;
    const fit=(a,e)=>{if(e-a<=1)return {err:0,B:null};const Qs=skStride(P.slice(a+1,e)),f=skFitPts(P[a],P[e],T[a],T[e],Qs);return f&&f.err<=tol&&skRevOk(f.B,[P[a]].concat(Qs,[P[e]]),tol)?f:null;};
    while(a<M){let step=1,good=a+1,gf=null;
      while(true){const e=Math.min(M,a+step);const f=fit(a,e);if(!f)break;good=e;gf=f;if(e===M)break;step*=2;}
      if(good<M&&good-a>=1){let lo=good,hi=Math.min(M,a+step);while(hi-lo>1){const mid=(lo+hi)>>1;const f=fit(a,mid);if(f){lo=mid;gf=f;}else hi=mid;}good=lo;gf=fit(a,good);}
      if(good-a===1&&!gf.B){/* один шаг: прямой отрезок между отсчётами заменяем кубиком по исходной кривой */
        const ch=skLen(skSub(P[good],P[a]));out.push([P[a],skAdd(P[a],skMul(T[a],ch/3)),skSub(P[good],skMul(T[good],ch/3)),P[good]]);}
      else out.push(gf.B);
      a=good;}
    i=j;}
  return Object.assign({},c,{nodes:skChainNodes(out.map(q=>q.map(z=>z.slice())))});}
function skGreedy(cs,budget,tolMax){
  let tot=0;for(const c of cs)tot+=c.nodes.length;if(!budget||tot<=budget)return cs;tolMax=tolMax||2;
  const CT=cs.map(c=>c.nodes.length>=3?skSegsOf(c).map(skSpanOf):null);
  const cand=(sp,i)=>{const n=sp.length,A=sp[(i-1+n)%n],B=sp[i];if(A._c&&A._c.B===B)return A._c.r;const r=cand0(sp,i);A._c={B,r};return r;};
  const cand0=(sp,i)=>{const n=sp.length,A=sp[(i-1+n)%n],B=sp[i];const dot=skDot(A.T1,B.T0);if(dot<0.9)return null;/* излом > 25° не трогаем */
    const m=skMergeSpans(A,B,tolMax);if(!m)return null;
    const ang=Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI;
    const ext=(Math.abs(B.T0[0])<0.0175||Math.abs(B.T0[1])<0.0175)&&!A.line&&!B.line?1.2:0;
    return {m,score:m.err+ext+0.05*ang};};
  /* короткий пролёт между двумя соседями стягивается в угол на пересечении их касательных */
  const moveEnd=(S,which,X)=>{const s=S.seg.map(q=>q.slice());if(s.length===2){s[which?1:0]=X.slice();}else if(which){const d=skSub(X,s[3]);s[3]=X.slice();s[2]=skAdd(s[2],d);}else{const d=skSub(X,s[0]);s[0]=X.slice();s[1]=skAdd(s[1],d);}return skSpanOf(s);};
  const coll=(sp,i)=>{const n=sp.length,A=sp[(i-1+n)%n],B=sp[i],C=sp[(i+1)%n];if(B._k&&B._k.A===A&&B._k.C===C)return B._k.r;const r=coll0(sp,i);B._k={A,C,r};return r;};
  const coll0=(sp,i)=>{const n=sp.length,A=sp[(i-1+n)%n],B=sp[i],C=sp[(i+1)%n];const len=skLen(skSub(B.P3,B.P0));if(len>16||n<=3)return null;
    const cr=skCross(A.T1,C.T0);let X;
    if(Math.abs(cr)<0.25)X=[(B.P0[0]+B.P3[0])/2,(B.P0[1]+B.P3[1])/2];
    else{const D=skSub(C.P0,A.P3),t=skCross(D,C.T0)/cr;X=skAdd(A.P3,skMul(A.T1,t));}
    const dm=skLen(skSub(X,[(B.P0[0]+B.P3[0])/2,(B.P0[1]+B.P3[1])/2]));if(dm>tolMax)return null;
    {const rd=(q,O,T,L)=>{const t=Math.max(0,Math.min(L,skDot(skSub(q,O),T)));return skLen(skSub(q,skAdd(O,skMul(T,t))));};let mx=0;
      for(const q of B.Q.concat([B.P0,B.P3,[(B.P0[0]+B.P3[0])/2,(B.P0[1]+B.P3[1])/2]])){mx=Math.max(mx,Math.min(rd(q,X,[-A.T1[0],-A.T1[1]],len*2+6),rd(q,X,C.T0,len*2+6)));}
      if(mx>tolMax)return null;}
    return {score:dm*0.5+0.3,coll:{A:moveEnd(A,1,X),C:moveEnd(C,0,X)}};};
  while(tot>budget){let best=null;
    CT.forEach((sp,ci)=>{if(!sp||sp.length<=3)return;for(let i=0;i<sp.length;i++){const k=cand(sp,i);if(k&&(!best||k.score<best.k.score))best={k,ci,i};const q=coll(sp,i);if(q&&(!best||q.score<best.k.score))best={k:q,ci,i};}});
    if(!best)break;const sp=CT[best.ci],n=sp.length,i=best.i,j=(i-1+n)%n;
    if(best.k.coll){sp[j]=best.k.coll.A;sp[(i+1)%n]=best.k.coll.C;sp.splice(i,1);}
    else{sp[j]=best.k.m.span;sp.splice(i,1);}tot--;}
  return cs.map((c,ci)=>CT[ci]?Object.assign({},c,{nodes:skChainNodes(CT[ci].map(s=>s.seg.map(q=>q.slice())))}):c);}
/* расхождение двух наборов контуров (двустороннее, по плотным отсчётам; сетка ускоряет поиск ближайшего отрезка) */
function skDense(cs,step){const P=[];for(const c of cs){const n=c.nodes.length;for(let i=0;i<n;i++){const a=c.nodes[i],b=c.nodes[(i+1)%n],cv=a.b||b.a,L=Math.hypot(b.x-a.x,b.y-a.y),N=cv?Math.max(8,Math.ceil(L/step)):Math.max(1,Math.ceil(L/(step*3)));
    const p1=a.b||a,p2=b.a||b;for(let k=0;k<N;k++){const t=k/N,u=1-t;P.push(cv?[u*u*u*a.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*b.y]:[a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t]);}}}return P;}
function skDevOne(cs,P){const C=16,G=new Map();const poly=[];for(const c of cs){const Q=skDense([c],3);for(let i=0;i<Q.length;i++)poly.push([Q[i],Q[(i+1)%Q.length]]);}
  for(const sg of poly){const [a,b]=sg;for(let x=Math.floor(Math.min(a[0],b[0])/C);x<=Math.floor(Math.max(a[0],b[0])/C);x++)for(let y=Math.floor(Math.min(a[1],b[1])/C);y<=Math.floor(Math.max(a[1],b[1])/C);y++){const k=x+','+y;let l=G.get(k);if(!l)G.set(k,l=[]);l.push(sg);}}
  const d0=(p,l)=>{let m=1e18;const px=p[0],py=p[1];for(const [a,b] of l){const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy;let t=q?((px-a[0])*dx+(py-a[1])*dy)/q:0;t=t<0?0:t>1?1:t;const ex=px-a[0]-t*dx,ey=py-a[1]-t*dy,d=ex*ex+ey*ey;if(d<m)m=d;}return Math.sqrt(m);};
  return P.map(p=>{for(let r=1;r<=6;r++){let b=1e9;const cx=Math.floor(p[0]/C),cy=Math.floor(p[1]/C);for(let x=cx-r;x<=cx+r;x++)for(let y=cy-r;y<=cy+r;y++){const l=G.get(x+','+y);if(l)b=Math.min(b,d0(p,l));}if(b<=(r-0.5)*C)return b;if(r===6)return b<1e9?b:99;}});}
function skHaus(A,B){let m=0;for(const d of skDevOne(B,skDense(A,3)))if(d>m)m=d;for(const d of skDevOne(A,skDense(B,3)))if(d>m)m=d;return m;}
function skReduce(cs,budget,tolMax,tolCap){const cnt=x=>x.reduce((q,c)=>q+c.nodes.length,0);if(!budget||cnt(cs)<=budget)return cs;tolMax=tolMax||2;tolCap=Math.max(tolCap||tolMax,tolMax);
  let best=null,bn=1e9;const take=(r,lim)=>{const n=cnt(r);if(n>=bn)return false;if(skHaus(cs,r)<=lim){best=r;bn=n;return true;}return false;};
  /* ступени допуска: самый «жадный» вариант проверяется первым; если фактическое расхождение больше ступени — допуск уменьшается */
  const lims=[];for(let l=tolMax;l<=tolCap+1e-6;l+=1)lims.push(l);
  for(const lim of lims){
    for(const f of [0.95,0.8,0.6]){let r;try{r=skGreedy(cs,budget,lim*f);}catch(e){break;}if(cnt(r)>=bn)continue;if(take(r,lim))break;}
    if(best&&bn<=budget)return best;}
  /* последний шанс: перепосадка контура (кубики заново по плотным отсчётам) + слияние */
  const lim=lims[lims.length-1];
  for(const fe of [true,false])for(const f of [0.95,0.75]){try{const r=skGreedy(cs.map(c=>skRefit(c,lim*f*0.6,fe)),budget,lim*f*0.5);if(take(r,lim)&&bn<=budget)return best;}catch(e){}}
  return best||cs;}
function skMaskOf(cs,x0,y0,W,H,R){const m=new Uint8Array(W*H);csgMask(cs.map(c=>csgFlatten(c).map(q=>[q[0]/R,q[1]/R])),x0,y0,W,H,m,1);return m;}
function skUnionChecked(raw){let u=csgUnion(raw);if(typeof csgMask!=='function'||!raw.length)return u;
  try{const R=4;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const c of raw)for(const n of c.nodes){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x);y1=Math.max(y1,n.y);}
    x0=Math.floor(x0/R)-4;y0=Math.floor(y0/R)-4;const W=Math.ceil(x1/R-x0)+8,H=Math.ceil(y1/R-y0)+8;
    const ref=skMaskOf(raw,x0,y0,W,H,R);let ink=0;for(const v of ref)ink+=v;
    /* плохо: площадь расходится с растром или контуры касаются друг друга в вершинах (куски, сшитые точкой) */
    const touch=cs=>{const seen=new Map();for(let i=0;i<cs.length;i++)for(const n of cs[i].nodes){const k=Math.round(n.x*20)+','+Math.round(n.y*20);const j=seen.get(k);if(j!=null&&j!==i)return true;seen.set(k,i);}return false;};
    const bad=cs=>{if(touch(cs))return true;const m=skMaskOf(cs,x0,y0,W,H,R);let d=0;for(let i=0;i<m.length;i++)if(m[i]!==ref[i])d++;return d>Math.max(6,ink*0.004);};
    if(!bad(u))return u;
    for(const e of [0.06,0.13]){const jit=raw.map((c,i)=>{const dx=e*((i%3)-1),dy=e*(((i+1)%3)-1);return Object.assign({},c,{nodes:c.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:n.a&&{x:n.a.x+dx,y:n.a.y+dy},b:n.b&&{x:n.b.x+dx,y:n.b.y+dy}}))});});
      const v=csgUnion(jit);if(!bad(v)){CSG_CACHE.set(csgKey(raw),v);return v;}}
    const key=csgKey(raw);CSG_CACHE.delete(key);const r=csgUnionRaster(raw);CSG_CACHE.set(key,r);return r;}catch(e){return u;}}
/* контур знака: штрихи пера -> объединение -> упрощение (минимум узлов, экстремумы сохраняются) */
const SKSH=new Map();/* память точных контуров: один и тот же знак строится для редактора, направляющих, образца и миниатюр один раз */
/* класс края по скелету (не по контуру: контур тяжёлого пера теряет радиус): круглая чаша — гладкий узел с горизонтальной касательной
   и длинными ручками (радиус ≥ ~70), всё остальное (острие, срез, перекладина, конец штриха) — плоский край */
function skExtClass(sk,hy,ov){const tops=[],bots=[];
  for(const st of sk||[]){if(st.dot||!st.nodes)continue;const ns=st.nodes,N=ns.length,cl=!!st.closed;
    for(let i=0;i<N;i++){const B=ns[i],A=cl?ns[(i+N-1)%N]:ns[i-1],C=cl?ns[(i+1)%N]:ns[i+1];
      const din=B.a?[B.x-B.a.x,B.y-B.a.y]:A?[B.x-A.x,B.y-A.y]:null,dout=B.b?[B.b.x-B.x,B.b.y-B.y]:C?[C.x-B.x,C.y-B.y]:null;
      if(din&&dout&&(cl||(i>0&&i<N-1))){const l1=Math.hypot(din[0],din[1]),l2=Math.hypot(dout[0],dout[1]);if(l1<1e-6||l2<1e-6)continue;
        if(din[1]>=-0.02*l1&&dout[1]<=0.02*l2)tops.push(B.y+hy);
        if(din[1]<=0.02*l1&&dout[1]>=-0.02*l2)bots.push(B.y-hy);}
}}
  /* знак рисовал выход за линию намеренно (узел на ov выше/ниже линии) — значит чаша; узел на линии — плоский край */
  return {top:L=>{let m=-1e9;for(const y of tops)if(y>=L-30&&y<=L+30&&y>m)m=y;return m>L+0.3*ov;},
          bot:L=>{let m=1e9;for(const y of bots)if(y<=L+30&&y>=L-30&&y<m)m=y;return m<L-0.3*ov;}};}
/* ---------- фиксация высот (FX2): перо с нажимом/срезом сдвигает крайние точки знака с весом (у Прописи верх H +1…+21,
   низ o −8…−23; у Ротунды асцендер Black +40). После объединения края возвращаются на постоянные линии шрифта:
   плоский край (вершина-острие, срез, перекладина) — ровно на линию, круглая чаша — на линию ± ov (1–3 %).
   Кусочно-линейная монотонная деформация по y: у границы линий — якоря, ниже/выше — сдвиг по постоянной
   (значки над буквой едут вместе с телом, зазор сохраняется). Включается флагом font.hFix и видом знака (cap | xh | xhn). */
function skHFix(cs,p,kind,sk,hy){if(!kind||!p||p.xh==null||!p.capH)return cs;
  const ov=p.ov||0,topL=kind==='cap'?[p.capH]:kind==='xhn'?[p.xh]:[p.xh,p.asc],botL=[0,-p.desc],W=48,V=12;
  const tops={},bots={};
  for(const c of cs){const ns=c.nodes,N=ns.length;if(N<3)continue;
    /* плотный ломаный контур (шаг ~3 ед.) — экстремумы ищутся по нему, а не по узлам: вершина часто лежит между узлами */
    const X=[],Y=[];
    for(let i=0;i<N;i++){const A=ns[i],B=ns[(i+1)%N];const p1=A.b||A,p2=B.a||B;
      const n=Math.max(1,Math.ceil((Math.hypot(p1.x-A.x,p1.y-A.y)+Math.hypot(p2.x-p1.x,p2.y-p1.y)+Math.hypot(B.x-p2.x,B.y-p2.y))/3));
      for(let k=0;k<n;k++){const t=k/n,u=1-t;X.push(u*u*u*A.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*B.x);Y.push(u*u*u*A.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*B.y);}}
    const M=X.length,Wn=10;if(M<3*Wn)continue;const at=i=>(i%M+M)%M;
    for(let i=0;i<M;i++){const y=Y[i];let top=true,bot=true;
      for(let k=-Wn;k<=Wn;k++){const yy=Y[at(i+k)];if(yy>y+1e-9)top=false;if(yy<y-1e-9)bot=false;}
      if(!top&&!bot)continue;
      const dx=X[at(i+Wn)]-X[at(i-Wn)];
      if(top&&dx<0)for(const L of topL)if(y>=L-V&&y<=L+W){const o=tops[L];if(!o||y>o.m+1e-9){tops[L]={m:y};}}
      if(bot&&dx>0)for(const L of botL)if(y<=L+V&&y>=L-W){const o=bots[L];if(!o||y<o.m-1e-9){bots[L]={m:y};}}}}
  const sc=skExtClass(sk,hy,ov);for(const L in tops)tops[L].round=sc.top(+L,+L);for(const L in bots)bots[L].round=sc.bot(+L);
  const an=[],tl=Object.keys(tops).map(Number).sort((a,b)=>a-b),bl=Object.keys(bots).map(Number).sort((a,b)=>a-b);
  if(!tl.length&&!bl.length)return cs;
  const all=[...bl,...tl].sort((a,b)=>a-b);
  for(const L of tl){const o=tops[L],t=L+(o.round?ov:0),e=o.m-t;
    const lower=all.filter(v=>v<L-60).pop(),dist=lower==null?L:L-lower,R=Math.min(0.8*dist,Math.max(120,6*Math.abs(e)));
    an.push([o.m-R,o.m-R],[o.m,t]);}
  for(const L of bl){const o=bots[L],t=L-(o.round?ov:0),e=o.m-t;
    const upper=all.filter(v=>v>L+60)[0],dist=upper==null?p.capH:upper-L,R=Math.min(0.8*dist,Math.max(120,6*Math.abs(e)));
    an.push([o.m,t],[o.m+R,o.m+R]);}
  if(!an.length)return cs;
  an.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  for(let i=1;i<an.length;i++){const dy=an[i][0]-an[i-1][0],dt=an[i][1]-an[i-1][1];
    if(dy<1e-6){if(Math.abs(dt)>1e-6)return cs;an.splice(i--,1);}else if(dt<0.2*dy)return cs;}/* деформация обязана оставаться монотонной */
  const n=an.length,f=y=>{if(y<=an[0][0])return y+(an[0][1]-an[0][0]);if(y>=an[n-1][0])return y+(an[n-1][1]-an[n-1][0]);
    let k=1;while(an[k][0]<y)k++;const a=an[k-1],b=an[k];return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);};
  return cs.map(c=>({hole:c.hole,nodes:c.nodes.map(q=>({x:q.x,y:f(q.y),a:q.a&&{x:q.a.x,y:f(q.a.y)},b:q.b&&{x:q.b.x,y:f(q.b.y)}}))}));}
function skYTop(cs){let m=-1e9;for(const c of cs){const n=c.nodes,N=n.length;for(let i=0;i<N;i++){const A=n[i],B=n[(i+1)%N],p1=A.b||A,p2=B.a||B;for(let k=0;k<=16;k++){const t=k/16,u=1-t,y=u*u*u*A.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*B.y;if(y>m)m=y;}}}return m;}
function skHy(font,p){const pn=font.pen(p);if(pn.kind==='ell'){const M2=pn.M([1,0],1);return Math.abs(skSupport(M2,[0,1]).p[1]);}return p.hair/2;}
function skShape(sk,font,p,kind){const raw=skelToContours(sk,font.pen(p),p);if(typeof csgUnion!=='function'||SKX.FAST)return raw;
  const hk=font.hFix&&kind&&p&&p.xh!=null?kind+[p.capH,p.xh,p.asc,p.desc,p.ov].join(','):'';
  const mk=typeof csgKey==='function'?(font.id||font.name||'')+(SKX.NORED?'~':'|')+hk+csgKey(raw):null,hit=mk&&SKSH.get(mk);
  if(hit){const cp=()=>hit.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))}));
    if(typeof CSG_CACHE!=='undefined'){const r2=cp(),k2=csgKey(r2);if(!CSG_CACHE.has(k2))CSG_CACHE.set(k2,r2);}return cp();}
  const res=skShape0(raw,font,hk?(cs=>skHFix(cs,p,kind,sk,skHy(font,p))):null);
  if(mk){if(SKSH.size>600){let n=0;for(const k of SKSH.keys()){SKSH.delete(k);if(++n>=200)break;}}
    SKSH.set(mk,res.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))})));}
  return res;}
function skShape0(raw,font,post){/* быстрый режим: штрихи без объединения (заливка nonzero даёт тот же вид) */
  let u=skUnionChecked(raw);try{u=skSimplify(u,font.simpTol||1.5);if(!SKX.NORED)u=skReduce(u,font.nodeBudget||0,font.reduceTol||2,font.reduceCap||4);if(post)u=post(u);
    /* итог уже чистый: повторное объединение в finalGlyph возвращает его без пересборки (иначе вернулись бы мелкие узлы) */
    if(typeof csgKey==='function'&&typeof CSG_CACHE!=='undefined'){const cp=u.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))}));CSG_CACHE.set(csgKey(cp),cp);}}catch(e){}return u;}
/* регистрация знака: fn(K) -> скелет; bw — базовая ширина (при wdth 100), nst — число «стволов» для поправки ширины по весу */
function skDef(font,ch,fn,bw,kind,nst,o){o=o||{};const G=font.GL,S0=font.S0;
  const e={k:kind||'cap',opt:o.opt||{},
    w:typeof bw==='function'?bw:(p=>Math.max(30,bw*p.wdth/100+(nst==null?2:nst)*(p.stem-S0)*(p.stem>S0&&font.wK?font.wK:0.85)+(o.pad||0))),
    skel:g=>fn(font.kit(g,ch))};
  e.shape=g=>skShape(e.skel(g),font,g.p,e.k);
  G[ch]=e;return e;}
/* знак из другого знака со сдвигом / добавкой */
function skDerive(font,ch,base,add,o){const G=font.GL,B=G[base];if(!B)return;o=o||{};
  const e={k:o.k||B.k,opt:o.opt||{},w:o.w||B.w,skel:g=>{const K=font.kit(g,ch);let sk=B.skel(g);if(o.xf)sk=skXf(sk,o.xf(K));if(o.rev)sk=sk.map(skReverse);return add?sk.concat(add(K,sk)):sk;}};
  e.shape=g=>skShape(e.skel(g),font,g.p,e.k);G[ch]=e;return e;}
/* габарит скелета (по узлам и ручкам) */
function skBox(sk){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const ad=(x,y)=>{if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;};
  for(const s of sk){if(s.dot){ad(s.x-s.r,s.y-s.r);ad(s.x+s.r,s.y+s.r);continue;}for(const n of s.nodes){ad(n.x,n.y);}}return {x0,y0,x1,y1};}

/* ---------- знаки препинания и символы (общие для скелетных шрифтов; рисуются пером шрифта) ---------- */
function skPunct(font){const d=(ch,fn,bw,kind,nst)=>skDef(font,ch,fn,bw,kind,nst==null?0:nst,{});
  const dotW=p=>Math.max(p.stem,p.hair)*1.24;
  const fixedW=v=>p=>v+(p.stem-font.S0)*0.6;
  /* точка, запятая */
  const dotAt=(K,x,y)=>K.dot(x,y,K.dr());
  const comma=(K,x,y)=>{const r=K.dr();return [dotAt(K,x,y),SKB.P([[x+r*0.55,y,-90],[x+r*0.2,y-r*1.5],[x-r*0.55,y-r*2.6]],'J','X',{tl:r*2.2})];};
  d('.',K=>[dotAt(K,K.cx,K.dr())],p=>dotW(p),'cap',1);
  d(',',K=>comma(K,K.cx,K.dr()),p=>dotW(p)*1.1,'cap',1);
  d(':',K=>[dotAt(K,K.cx,K.dr()),dotAt(K,K.cx,K.xh-K.dr())],p=>dotW(p),'xh',1);
  d(';',K=>[...comma(K,K.cx,K.dr()),dotAt(K,K.cx,K.xh-K.dr())],p=>dotW(p)*1.1,'xh',1);
  d('…',K=>{const r=K.dr(),s=(K.w-2*r)/2;return [0,1,2].map(i=>dotAt(K,r+i*s,r));},p=>dotW(p)*3+p.stem*1.3,'cap',3);
  d('!',K=>{const r=K.dr();return [K.st(K.cx,K.capH,r*2+Math.max(K.S,K.H)*0.9,'H','R'),dotAt(K,K.cx,r)];},p=>dotW(p),'cap',1);
  d('¡',K=>{const r=K.dr();return [K.st(K.cx,K.xh-r*2-Math.max(K.S,K.H)*0.9,K.xh-K.capH,'R','H'),dotAt(K,K.cx,K.xh-r)];},p=>dotW(p),'xh',1);
  const quest=(K,y0,top)=>{const {w}=K,r=K.dr(),rx=(w-K.S)/2,ry=(top-y0)*0.27,cy=top-K.hy-ry;
    return [K.pa([[K.L,cy+ry*0.15,90],[K.cx,top-K.hy+K.ov*0.5,0],[K.R,cy,-90],[K.cx+K.S*0.05,Math.max(cy-ry*1.15,y0+r*2+K.S*0.9+Math.max(K.hy,K.hx)*1.6),-120],[K.cx,y0+r*2+K.S*0.9,-90]],'T','R'),dotAt(K,K.cx,y0+r)];};/* узел шейки не ниже её конца: иначе при тяжёлом пере шейка проваливается на точку */
  d('?',K=>quest(K,0,K.capH),420,'cap',1);
  d('¿',K=>skXf(quest(K,0,K.capH),(x,y)=>[K.w-x,K.xh-y]).map(skReverse),420,'xh',1);
  /* кавычки и апостроф */
  const qL=K=>Math.max(K.capH*0.2,K.dr()*0.9*4.4);/* длина кавычки растёт с пером: иначе в Black от хвоста остаётся одна точка */
  /* верх кавычки = верх прописной (FX2): у открывающей хвост кончается круглым концом пера — узел на полтолщины ниже верха;
     нижние ‚ „ висят как запятая: точка на базовой линии, хвост уходит под неё */
  const qmark=(K,x,yTop,open,L)=>{const r=K.dr()*0.9;L=L||qL(K);
    if(open)return [SKB.P([[x+r*0.4,yTop-L+r*1.1],[x-r*0.05,yTop-L*0.45],[x,yTop-K.hy,90]],'X','R',{tl:r*1.6}),SKB.D(x,yTop-L+r,r)];
    return [SKB.D(x,yTop-r,r),SKB.P([[x+r*0.55,yTop-r,-90],[x+r*0.3,yTop-L*0.6],[x-r*0.45,yTop-L]],'J','X',{tl:r*1.6})];};
  const qW=n=>p=>Math.max(p.stem,p.hair)*(n>1?2.9:1.25);
  const Q=(ch,n,open,low)=>d(ch,K=>{const r=K.dr()*0.9,L=low?Math.max(qL(K),r+K.dr()*2.6+K.hy*0.5):qL(K),xs=n>1?[r*1.0,K.w-r*1.0]:[K.cx];
      /* FX2: “ ‘ — ” ’ , повёрнутые на 180° (зеркальная пара, а не другая форма) */
      const mk=y=>{const o=[];for(const x of xs){if(open&&!low){const c=qmark(K,x,y,false,L),b=skBox(c);o.push(...skXf(c,(X,Y)=>[b.x0+b.x1-X,b.y0+b.y1-Y]).map(skReverse));}else o.push(...qmark(K,x,y,open,L));}return o;};let y=low?K.dr()+r:K.capH,o=mk(y);
      /* открывающая: конец пера (повёрнутое перо) может выступать иначе, чем у точки — верх выравнивается по замеру (FX2) */
      if(open&&!low){try{const t=skYTop(skShape(o,font,K.p));if(isFinite(t)&&Math.abs(t-K.capH)>0.5){y+=K.capH-t;o=mk(y);}}catch(e){}}
      return o;},qW(n),'cap',n);
  Q('’',1,false,false);Q('‘',1,true,false);Q('‚',1,false,true);Q('”',2,false,false);Q('“',2,true,false);Q('„',2,false,true);
  d("'",K=>[K.st(K.cx,K.capH,K.capH*0.72,'H','R')],p=>Math.max(p.stem,p.hair)*1.1,'cap',1);
  d('"',K=>[K.st(K.L,K.capH,K.capH*0.72,'H','R'),K.st(K.R,K.capH,K.capH*0.72,'H','R')],p=>p.stem*2.9,'cap',2);
  d('`',K=>[K.ln(K.L*0.6,K.capH,K.R,K.capH-K.capH*0.16,'R','R')],p=>p.stem*2.2,'cap',1);
  /* тире, дефис, минус */
  const dash=(ch,len,y)=>d(ch,K=>[K.hb(0,K.w,K.capH*(y||0.42))],fixedW(len),'cap',0);
  dash('-',230);dash('–',500);dash('—',900);dash('−',500,0.42);/* на оси плюса */
  d('\u2012',K=>[K.hb(8,K.w-8,K.capH*0.5)],p=>font.GL['0']&&font.GL['0'].w?font.GL['0'].w(p):fixedW(560)(p),'cap',0);/* цифровое тире: ширина цифры, середина цифры */
  d('_',K=>[K.hb(0,K.w,-K.desc*0.35)],fixedW(560),'cap',0);
  /* скобки */
  const paren=(K,left)=>{const t=K.capH+K.desc*0.15,b=-K.desc*0.6,m=(t+b)/2,x0=K.L,x1=K.R;
    const sk=[K.pa([[x1,t-K.hy],[x0,m,-90],[x1,b+K.hy]],'T','T')];return left?sk:skMirX(sk,K.w);};
  d('(',K=>paren(K,true),190,'cap',1);d(')',K=>paren(K,false),190,'cap',1);
  const brk=(K,left)=>{const t=K.capH+K.desc*0.15,b=-K.desc*0.6;
    const sk=[SKB.P([[K.w,t-K.hy],[K.L,t-K.hy,null,{c:1}],[K.L,b+K.hy,null,{c:1}],[K.w,b+K.hy]],'V','V')];return left?sk:skMirX(sk,K.w);};
  d('[',K=>brk(K,true),170,'cap',1);d(']',K=>brk(K,false),170,'cap',1);
  const brace=(K,left)=>{const t=K.capH+K.desc*0.15,b=-K.desc*0.6,m=(t+b)/2,xm=K.cx,r=Math.min(K.w*0.45,(t-b)*0.12);
    const sk=[K.pa([[K.R+K.hx,t-K.hy,180],[xm+r,t-K.hy,180],[xm,t-K.hy-r,-90],[xm,m+r,-90],[K.L,m,180]],'V','J'),
      K.pa([[K.L,m,0],[xm,m-r,-90],[xm,b+K.hy+r,-90],[xm+r,b+K.hy,0],[K.R+K.hx,b+K.hy,0]],'J','V')];
    return left?sk:skMirX(sk,K.w);};
  d('{',K=>brace(K,true),250,'cap',1);d('}',K=>brace(K,false),250,'cap',1);
  d('/',K=>[K.ln(K.L,-K.desc*0.3,K.R,K.capH+K.desc*0.15)],360,'cap',1);
  d('\\',K=>[K.ln(K.L,K.capH+K.desc*0.15,K.R,-K.desc*0.3)],360,'cap',1);
  d('|',K=>[K.st(K.cx,K.capH+K.desc*0.15,-K.desc*0.6)],p=>Math.max(p.stem,p.hair)*1.05,'cap',1);
  /* математика */
  const mid=K=>K.capH*0.42;
  d('+',K=>{const m=mid(K),a=K.w/2-K.hx;return [K.hb(0,K.w,m),K.st(K.cx,m+a,m-a)];},fixedW(500),'cap',0);
  d('=',K=>{const m=mid(K),g=Math.max(K.H*1.6,K.capH*0.11);return [K.hb(0,K.w,m+g),K.hb(0,K.w,m-g)];},fixedW(500),'cap',0);
  d('×',K=>{const m=mid(K),a=K.w/2-K.hx*0.7;return [K.ln(K.cx-a,m-a,K.cx+a,m+a,'F','F'),K.ln(K.cx-a,m+a,K.cx+a,m-a,'F','F')];},fixedW(440),'cap',0);
  const lt=(K,left)=>{const m=mid(K),a=K.w/2-K.hx;const sk=[SKB.P([[K.R,m+a*0.95],[K.L+K.hx*0.7,m,null,{c:1,j:'miter'}],[K.R,m-a*0.95]],'F','F')];return left?sk:skMirX(sk,K.w);};
  d('<',K=>lt(K,true),fixedW(440),'cap',0);d('>',K=>lt(K,false),fixedW(440),'cap',0);
  d('^',K=>[SKB.P([[K.L,K.capH*0.5],[K.cx,K.capH-K.hy,null,{c:1,cy:K.capH}],[K.R,K.capH*0.5]],'H','H')],fixedW(440),'cap',0);
  d('~',K=>{const m=mid(K),a=K.w*0.5-K.hx,hh=K.capH*0.06;return [K.pa([[K.cx-a,m-hh*0.4],[K.cx-a*0.5,m+hh,0],[K.cx+a*0.5,m-hh,0],[K.cx+a,m+hh*0.4]],'T','T')];},fixedW(480),'cap',0);
  d('°',K=>{const r=Math.max(K.S*1.15,K.capH*0.1);return [K.ov_(K.cx,K.capH-r-K.hy,r,r)];},p=>Math.max(p.stem*3.3,p.capH*0.2+p.stem),'cap',0);
  d('•',K=>[K.dot(K.cx,K.capH*0.42,K.w/2)],p=>Math.max(p.stem,p.hair)*1.8,'cap',0);
  d('*',K=>{const c=[K.cx,K.capH-K.capH*0.2],r=K.capH*0.19,o=[];for(let i=0;i<3;i++){const a=(90+i*60)*D2R;o.push(K.ln(c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[0]-r*Math.cos(a),c[1]-r*Math.sin(a),'R','R'));}return o;},fixedW(420),'cap',0);
  d('#',K=>{const t=K.capH*0.78,b=0,o=[],s=K.capH*0.08;
    o.push(K.hb(0,K.w,t*0.68),K.hb(0,K.w,t*0.3));o.push(K.ln(K.w*0.36+s,t,K.w*0.36-s,b),K.ln(K.w*0.68+s,t,K.w*0.68-s,b));return o;},fixedW(560),'cap',0);
  d('%',K=>{const T=Math.max(K.S,K.H);let r=Math.max(K.w*0.11,K.w*0.17-T*0.3,T*0.95),ry=Math.max(K.capH*0.12,K.capH*0.17-T*0.25,T*0.9);
    /* кольца не должны касаться косой черты: расстояние центра кольца до линии >= внешний радиус + полштриха + зазор */
    const x1=K.R-K.S*0.2,x2=K.L+K.S*0.2,ln=Math.hypot(x1-x2,K.capH),dist=(cx,cy)=>Math.abs((cx-x2)*K.capH-cy*(x1-x2))/ln;
    for(let i=0;i<12;i++){const d0=dist(K.L+r,K.capH-ry-K.hy);if(d0>=Math.hypot(r,ry)*0.75+T*0.5+K.S*0.5+Math.max(14,T*0.15)||r<T*0.62)break;r*=0.95;ry*=0.95;}
    return [K.ov_(K.L+r,K.capH-ry-K.hy,r,ry),K.ov_(K.R-r,ry+K.hy,r,ry),K.ln(K.R-K.S*0.2,K.capH,K.L+K.S*0.2,0)];},p=>720+(Math.max(p.stem,p.hair)-font.S0)*5,'cap',0);
  /* & — петля сверху, диагональ вниз-вправо */
  d('&',K=>{const {w,capH:h}=K,r=h*0.16;
    return [K.pa([[w-K.hx,h*0.42,100],[w*0.62,K.B,180],[K.L+w*0.22,h*0.12],[K.L+w*0.06,h*0.27],[w*0.38,h*0.52],[w*0.56,h*0.74,90],[w*0.42,h-K.hy,180],[w*0.24,h*0.78,-90],[w*0.38,h*0.52],[w-K.hx*1.2,K.hy]],'T','T')];},620,'cap',2);
  /* @ */
  d('@',K=>{const {w,capH:h}=K,T=Math.max(K.S,K.H),cy=h*0.4,rx=w/2-K.hx,ry=h*0.52,ri=Math.max(w*0.09,Math.min(w*0.17,Math.min(rx,ry)*0.42-T*0.5),T*0.78),xi=K.cx-T*0.1;
    return [K.ov_(xi,cy,ri,ri*1.1),K.pa([[xi+ri,cy+ri*1.1,-90],[xi+ri,cy-ri*0.55,-90],[xi+ri+(K.R-xi-ri)*0.4,cy-ri*1.15,0],[K.R,cy+ry*0.15,90],[K.cx,cy+ry,180],[K.L,cy,-90],[K.cx,cy-ry,0],[K.cx+rx*0.7,cy-ry*0.8]],'H','R')];},820,'cap',6);
  /* $ — S + вертикаль */
  d('$',K=>{const sk=font.GL['S']?font.GL['S'].skel(K.g):[];const sc=0.8;return skXf(sk,(x,y)=>[K.cx+(x-K.cx)*1,y*sc+K.capH*0.1]).concat([K.st(K.cx,K.capH*1.04,K.capH*0.9-K.hy*0.5),K.st(K.cx,K.capH*0.1+K.hy*0.5,-K.capH*0.06)]);}/* штрихи только сверху и снизу: внутри S шарики не замыкают просветы */,480,'cap',2);
  /* валюты */
  d('€',K=>{const {w,capH:h}=K,rx=(w-K.S)/2,ry=h/2+K.ov-K.hy;return [K.arc(w/2+K.S*0.2,h/2,rx,ry,48,312),K.hb(0,w*0.62,h/2+Math.max(h*0.09,K.H*0.95)),K.hb(0,w*0.62,h/2-Math.max(h*0.09,K.H*0.95))];},620,'cap',2);/* перекладины € не сливаются */
  d('₽',K=>{const {w,capH:h}=K,x=K.S*0.9+K.hx,yb=h*0.42,r=(h-yb)/2;
    return [K.st(x,0,h),K.pa([[x,h-K.hy,0],[w-K.hx-r,h-K.hy,0],[w-K.hx,(h+yb)/2,-90],[w-K.hx-r,yb+K.hy*0,180],[x,yb,180]],'J','J'),K.hb(0,w*0.72,h*0.2)];},560,'cap',2);
  d('№',K=>{const {capH:h}=K,wn=K.w*0.66,o=[SKB.P([[K.L,0],[K.L,K.T,null,{c:1,cy:h}],[wn-K.hx,K.B,null,{c:1,cy:0}],[wn-K.hx,h]],'H','H')];
    const gN=Math.max(K.S,K.H)*0.45,rx=Math.max(K.hx*1.3,(K.w-wn-gN-2*K.hx)/2*0.92),cx=wn+gN+K.hx+rx;/* о у № отделено от N зазором */o.push(K.ov_(cx,h*0.62,rx,h*0.17),K.hb(cx-rx-K.hx,cx+rx+K.hx,h*0.2));return o;},1000,'cap',4.5);
  /* кавычки-ёлочки */
  const guil=(K,left,x0)=>{const wq=K.w*0.3,m=K.xh*0.48,a=Math.max(K.xh*0.22,wq*0.9);const sk=[SKB.P([[x0+wq,m+a],[x0,m,null,{c:1}],[x0+wq,m-a]],'F','F')];return left?sk:skMirX(sk,K.w);};
  /* шаг ёлочек: горизонтальная толщина наклонного плеча T/sinθ + зазор — уголки не слипаются ни в одном весе */
  const gStep=K=>{const T=Math.max(K.S,K.H),wq=K.w*0.3,a=Math.max(K.xh*0.22,wq*0.9),sn=a/Math.hypot(a,wq);return Math.max(K.w*0.42,T/sn+T*0.45);};
  const gW=p=>470+(Math.max(p.stem,p.hair)-font.S0)*2.4;
  d('«',K=>[...guil(K,true,K.L),...guil(K,true,K.L+gStep(K))],gW,'xh',0);
  d('»',K=>[...skMirX([...guil(K,true,K.L),...guil(K,true,K.L+gStep(K))],K.w)],gW,'xh',0);
  /* пробелы */
  for(const c of [' ',' '])font.GL[c]={shape:()=>[],skel:()=>[],w:p=>p.space,k:'cap',opt:{}};
}

/* ---------- диакритика: знаки-штрихи, композиты по таблицам core13 (EXTLAT, MARKOF, EXTCYR) ---------- */
const SKM={};
/* размеры знака: от высоты прописной; над прописной — компактнее */
function skMD(K,cap){const C=K.capH,t=Math.max(K.S,K.H);return {mw:Math.min(Math.max(t*1.9,C*0.26),C*(cap?0.4:0.46)),mh:Math.max(C*(cap?0.15:0.2),t*(cap?1.5:1.55)),/* знак не ниже пера: в Black V-образный гачек не сплющивается в планку */gap:Math.max(C*(cap?0.06:0.085),t*(K.font&&K.font.mkCap?0.36:0.45)),t,lim:K.font&&K.font[cap?'mkCap':'mkLow']||0,mhMin:Math.max(C*(cap?0.11:0.14),t*(K.font&&K.font.mkCap?0.95:1.15))};}
SKM.acute=(K,cx,y,d)=>[K.ln(cx-d.mw*0.22,y+K.hy,cx+d.mw*0.26,y+d.mh-K.hy,'R','R')];
SKM.grave=(K,cx,y,d)=>[K.ln(cx-d.mw*0.26,y+d.mh-K.hy,cx+d.mw*0.22,y+K.hy,'R','R')];
SKM.circ=(K,cx,y,d)=>[SKB.P([[cx-d.mw*0.4,y+K.hy],[cx,y+d.mh-K.hy,null,{c:1,j:'miter'}],[cx+d.mw*0.4,y+K.hy]],'R','R')];
SKM.caron=(K,cx,y,d)=>[SKB.P([[cx-d.mw*0.4,y+d.mh-K.hy],[cx,y+K.hy,null,{c:1,j:'miter'}],[cx+d.mw*0.4,y+d.mh-K.hy]],'R','R')];
SKM.dot=(K,cx,y,d)=>{const r=Math.min(K.dr()*0.95,(d.avail||1e9)/2);return [SKB.D(cx,y+r,r)];};
SKM.dier=(K,cx,y,d)=>{const r=Math.min(K.dr()*0.95,(d.avail||1e9)/2),g=Math.max(r*1.25,d.mw*0.24);return [SKB.D(cx-g,y+r,r),SKB.D(cx+g,y+r,r)];};
SKM.ring=(K,cx,y,d)=>{const r=Math.max(d.mh*0.5,K.S*1.15,K.H*1.15);
  /* кольцо: внешняя высота не больше запаса над буквой (mkCap/mkLow), штрих тоньше (нажим w), чтобы просвет остался */
  if(!d.avail)return [K.ov_(cx,y+r,r,r-K.hy*0.5)];
  const Hr=Math.min(2*r+K.hy*0.5,Math.max(d.avail,d.mhMin)),ws=Math.min(1,0.31*Hr/Math.max(K.S,K.H)),rx=Hr/2-K.hx*ws,ry=Hr/2-K.hy*ws,e=K.ov_(cx,y+Hr/2,rx,ry);
  if(ws<1)e.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*ws;});return [e];};
SKM.macron=(K,cx,y,d)=>[K.hb(cx-d.mw*0.42,cx+d.mw*0.42,y+d.mh*0.4)];
SKM.tilde=(K,cx,y,d)=>{const a=d.mw*0.46,lo=y+K.hy,hi=y+d.mh*0.75;return [K.pa([[cx-a,lo+(hi-lo)*0.3],[cx-a*0.45,hi,0],[cx+a*0.45,lo,0],[cx+a,hi-(hi-lo)*0.3]],'R','R')];};
SKM.breve=(K,cx,y,d)=>{const a=d.mw*0.4,ry=d.avail?Math.min(d.mh*0.7,Math.max(d.mhMin*0.5,(d.avail-K.hy)/2)):d.mh*0.7;const e=K.arc(cx,y+ry+K.hy,a,ry,190,350,'R','R');
  /* Black: перо толще глубины дуги — бабочка/самопересечение; штрих бреве не толще 0.62 глубины (потолок = перекладина буквы) */
  const ws=Math.min(1,0.62*ry/Math.max(K.hy,1)/1.0);if(ws<1&&e.nodes)e.nodes.forEach(n=>{n.w=(n.w==null?1:n.w)*ws;});return [e];};
SKM.dacute=(K,cx,y,d)=>{const o=Math.max(d.mw*0.26,K.hx*1.6+d.mw*0.1);/* два штриха не касаются друг друга ни в одном весе */return [...SKM.acute(K,cx-o,y,{...d,mw:d.mw*0.75}),...SKM.acute(K,cx+o,y,{...d,mw:d.mw*0.75})];};
SKM.ced=(K,cx,y,d)=>{const dd=Math.min(K.desc*0.7,K.capH*0.22),r=dd*0.32;
  return [K.pa([[cx,K.hy*0.5,-90],[cx,-dd*0.25,-90],[cx+r*1.1,-dd*0.25-r*0.9,-90],[cx,-dd+K.hy],[cx-r*1.3,-dd+K.hy*1.2]],'J','R')];};
SKM.ogon=(K,cx,y,d)=>{const dd=Math.min(K.desc*0.72,K.capH*0.22),r=dd*0.45;
  return [K.pa([[cx,K.hy*0.8,-90],[cx-r,-dd*0.55,-90],[cx+r*0.15,-dd+K.hy,0],[cx+r*0.9,-dd+K.hy+r*0.3]],'J','R')];};
/* композит: база + знак; o.cx(K) — центр знака, o.top(K) — верх базы */
function skCompose(font,ch,base,marks,o){const B=font.GL[base];if(!B)return;o=o||{};
  const e={k:B.k,opt:{},w:o.w||B.w,skel:g=>{const K=font.kit(g,ch),cap=B.k!=='xh';const d=skMD(K,cap);
      let sk=B.skel(o.keepBase&&typeof B.w==='function'?Object.assign({},g,{w:B.w(g.p)}):g).slice();/* keepBase: база в своей ширине, добавка ширины — справа под знак */const top=o.top?o.top(K,sk):(cap?K.capH:(B.k==='xh'&&/[bdfhklіїґ]/.test(base)?K.asc:K.xh));
      const cx=o.cx?o.cx(K,sk):(font.markX?font.markX(K,base,sk):K.cx);
      for(const m of marks){const ex=font.mkGap&&(m==='caron'||m==='circ'||m==='grave')?font.mkGap*d.t:0,low=m==='ced'||m==='ogon';let dm=d;
        if(d.lim&&!low){const lim=font.mkAbs?Math.min(d.lim,Math.max(font.mkAbs-top,d.gap+d.mhMin+ex)):d.lim,av=lim-d.gap-ex;dm=Object.assign({},d,{avail:av,mh:Math.min(d.mh,Math.max(av,d.mhMin))});}
        /* integration (a): FONTS[id].mkZ={cap,low,g0,gk} — a fixed mark zone for Ё Й Ї (dots, breve): the zone top is a constant above the base (not growing with the pen),
           the clearance is max(g0, gk x pen) (>= max(40 u, 0.32 stem)), and the room between them is passed to the mark as avail (the mark shrinks instead of rising) */
        let my=low?0:top+d.gap+ex;
        if(font.mkZ&&!low&&/^(dier|breve|dot|rdier|rbreve)$/.test(m)){const Z=font.mkZ,gp=Math.max(Z.g0,Z.gk*d.t)+(m==='breve'&&Z.bpad?Z.bpad(d.t):0),av=top+(cap?Z.cap:Z.low)-(top+gp);my=top+gp;
          dm=Object.assign({},d,{gap:gp,avail:av,mh:Math.min(d.mh,Math.max(av,d.mhMin*(Z.mhK||1))),mhMin:Math.min(d.mhMin,av*0.5)});}
        sk=sk.concat(SKM[m](K,cx,my,dm));}/* острые знаки (вершина-миттер, нажим): запас от базы растёт с пером */
      if(o.extra)sk=sk.concat(o.extra(K,d,sk));return sk;}};
  e.shape=g=>skShape(e.skel(g),font,g.p,B.k==='xh'&&!/[bdfhklіїґ]/.test(base)&&marks.length?'xhn':B.k);font.GL[ch]=e;return e;}
const SK_TWIN={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','І':'I','Ј':'J','Ѕ':'S'};
function skExtend(font){const G=font.GL;
  for(const cy in SK_TWIN){const la=SK_TWIN[cy];if(G[la])G[cy]=G[la];}
  const base=c=>c.normalize('NFD')[0];
  if(G['i']&&!G['ı'])skDerive(font,'ı','i',null,{});/* заменяется шрифтом при необходимости */
  for(const ch of EXTLAT){const m=MARKOF[ch];if(!m)continue;let b=base(ch);if(ch==='ı')continue;
    if('ìíîïī'.includes(ch))b='ı';if(!G[b])continue;
    const ogx=(m==='ogon')?(font.ogX?font.ogX(b):null):null;
    skCompose(font,ch,b,[m],ogx?{cx:ogx}:{});}
  skCompose(font,'Ą','A',['ogon'],{cx:(K,sk)=>font.ogX?font.ogX('A')(K,sk):K.R});skCompose(font,'ą','a',['ogon'],{cx:(K,sk)=>font.ogX?font.ogX('a')(K,sk):K.R});
  skCompose(font,'Ę','E',['ogon'],{cx:(K,sk)=>font.ogLow?font.ogLow(K,sk):K.R-K.w*0.15});skCompose(font,'ę','e',['ogon'],{cx:(K,sk)=>font.ogLow?font.ogLow(K,sk):K.cx+K.w*0.1});
  skCompose(font,'Į','I',['ogon'],{cx:(K,sk)=>font.ogI?font.ogI(K,sk):K.cx});skCompose(font,'į','i',['ogon'],{cx:K=>K.cx});
  const slash=(K,x0,y0,x1,y1)=>[K.ln(x0,y0,x1,y1,'F','F')];
  skCompose(font,'Ø','O',[],{extra:K=>slash(K,K.w*0.08,-K.h*0.04,K.w*0.92,K.h*1.04)});
  skCompose(font,'ø','o',[],{extra:K=>slash(K,K.w*0.06,-K.xh*0.06,K.w*0.94,K.xh*1.06)});
  if(font.slashL){skCompose(font,'Ł','L',[],{extra:K=>font.slashL(K,true)});skCompose(font,'ł','l',[],{extra:K=>font.slashL(K,false)});}
  skCompose(font,'Đ','D',[],{extra:K=>font.barD?font.barD(K,true):[K.hb(0,K.S*2.2,K.capH*0.48)]});
  skCompose(font,'đ','d',[],{extra:K=>font.barD?font.barD(K,false):[K.hb(K.R-K.S*1.6,K.R+K.S*0.9,K.xh+(K.asc-K.xh)*0.5)]});
  /* ď ť: апостроф справа */
  const apo=(K,x,top)=>{const r=K.dr()*0.85;return [SKB.D(x,top-r,r),SKB.P([[x+r*0.5,top-r,-90],[x+r*0.2,top-r*2.2],[x-r*0.4,top-r*3.2]],'J','X',{tl:r*1.5})];};
  const apx=K=>K.w-K.dr()*0.85-(font.apoPad?font.apoPad(K):0);
  if(G['d'])skCompose(font,'ď','d',[],{keepBase:1,w:p=>G['d'].w(p)+Math.max(p.stem,p.hair)*1.25,extra:K=>apo(K,apx(K),K.asc)});
  /* у t апостроф не ниже верха ствола и правее перекладины: отступ от габарита t на толщину пера */
  if(G['t'])skCompose(font,'ť','t',[],{keepBase:1,w:p=>G['t'].w(p)+Math.max(p.stem,p.hair)*1.0,extra:K=>apo(K,apx(K),Math.max(K.asc,K.xh+K.hy+Math.max(K.S,K.H)*0.4+K.dr()*0.85*3.6))});/* не касается перекладины */
  /* лигатуры-диграфы: правый знак сдвигается к правому краю левого */
  const pair=(c,a,b,ov)=>{if(!G[a]||!G[b])return;if(font.pairOv)ov=font.pairOv(c,a,b,ov);const e={k:G[a].k,opt:{},
      w:p=>G[a].w(p)+G[b].w(p)-p.stem*ov,
      skel:g=>{const wa=G[a].w(g.p),wb=G[b].w(g.p),ga=Object.assign({},g,{w:wa}),gb=Object.assign({},g,{w:wb});
        const sb=font.pairHi&&font.pairHi(a)?font.withHi(()=>G[b].skel(gb)):G[b].skel(gb);return [...G[a].skel(ga),...skXf(sb,(x,y)=>[x+wa-g.p.stem*ov,y])];}};
    e.shape=g=>skShape(e.skel(g),font,g.p,e.k==='xh'?'xhn':e.k);G[c]=e;};
  pair('Æ','A','E',font.aeOv||0.9);pair('æ','a','e',font.aeOv2||1.0);pair('Œ','O','E',1.0);pair('œ','o','e',1.0);
  if(font.eszett)font.eszett();
  /* кириллица */
  skCompose(font,'Ѓ','Г',['acute']);skCompose(font,'ѓ','г',['acute']);skCompose(font,'Ќ','К',['acute']);skCompose(font,'ќ','к',['acute']);
  skCompose(font,'Ў','У',['breve']);skCompose(font,'ў','у',['breve']);
  const bar=(K,x0,x1,y)=>[K.hb(x0,x1,y)];
  /* перекладина Ғ ғ пересекает ствол (x ствола — по скелету базы на средней высоте) */
  const stemX=(sk,y)=>{let b=null;for(const st of sk)for(const n of (st.nodes||[]))if(!b||Math.abs(n.y-y)<Math.abs(b.y-y))b=n;return b?b.x:0;};
  skCompose(font,'Ғ','Г',[],{extra:(K,d,sk)=>{const x=stemX(sk,K.capH*0.46);return bar(K,Math.max(K.hy*0.5,x-K.S*0.9),Math.min(x+K.S*1.9,K.w-K.hx*0.6),K.capH*0.46);}});
  skCompose(font,'ғ','г',[],{extra:(K,d,sk)=>{const x=stemX(sk,K.xh*0.46);return bar(K,Math.max(K.hy*0.5,x-K.S*0.9),Math.min(x+K.S*1.9,K.w-K.hx*0.6),K.xh*0.46);}});
  const tailR=(K,x)=>[K.st(x,K.hy*2,-Math.max(K.desc*0.45,K.S*1.2),'J','H')];
  if(font.descR){for(const [c,b] of [['Қ','К'],['қ','к'],['Ң','Н'],['ң','н']])skCompose(font,c,b,[],{extra:K=>font.descR(K,b)});}
  skCompose(font,'Ө','О',[],{extra:K=>bar(K,K.S*0.5,K.w-K.S*0.5,K.capH*0.5)});skCompose(font,'ө','о',[],{extra:K=>bar(K,K.S*0.5,K.w-K.S*0.5,K.xh*0.5)});
  if(G['Y'])G['Ү']=G['Y'];
  if(font.ueLow)font.ueLow();else if(G['Y'])skDerive(font,'ү','Y',null,{k:'xh',w:G['y'].w,xf:K=>(x,y)=>[x,y*K.xh/K.capH-K.desc*(1-y/K.capH)*0]});
  skCompose(font,'Ұ','Ү',[],{extra:K=>bar(K,K.w*0.18,K.w*0.82,K.capH*0.3)});if(G['ү'])skCompose(font,'ұ','ү',[],{extra:K=>bar(K,K.w*0.15,K.w*0.85,G['ү'].k==='xh'?-K.desc*0.3:K.xh*0.3)});
  if(font.dzhe)font.dzhe();
  if(G['e']){const rot=K=>(x,y)=>[K.w-x,K.h-y];skDerive(font,'ә','e',null,{xf:rot,rev:true});
    skDerive(font,'Ә','e',null,{k:'cap',w:G['О']?G['О'].w:G['e'].w,xf:rot,rev:true});}
  if(font.shha)font.shha();
  if(font.tshe)font.tshe();
  pair('Љ','Л','Ь',1);pair('љ','л','ь',1);pair('Њ','Н','Ь',1);pair('њ','н','ь',1);
  if(font.njFix)font.njFix();
  if(G['Ï'])G['Ї']=G['Ï'];if(G['ï'])G['ї']=G['ï'];
  /* «одинаковые буквы — один знак», включая сербские/македонские */
  for(const cy in SK_TWIN){const la=SK_TWIN[cy];if(G[la])G[cy]=G[la];}
  const add=Object.keys(G).filter(c=>(EXTLAT+EXTCYR+'¡¿−‒ЈјЅѕ').includes(c));
  for(const c of add)if(!font.CHARSET.includes(c))font.CHARSET.push(c);
  const gl=EXTLAT.split('').filter(c=>G[c]).join(''),gc=EXTCYR.split('').filter(c=>G[c]).join('');
  font.GROUPS=font.GROUPS.filter(x=>!/расширенн|диакритик/.test(x[0]));
  font.GROUPS.splice(font.GROUPS.length-2,0,['Латиница · диакритика',gl],['Кириллица · расширенная',gc]);
}
/* регистрация скелетного шрифта в реестре FONTS */
function skRegister(font){
  const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ';
  const sym='.,:;!?"\'-–—()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…';
  for(const c in SK_TWIN)if(font.GL[SK_TWIN[c]])font.GL[c]=font.GL[SK_TWIN[c]];
  font.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
  font.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' ',' '].filter(c=>font.GL[c]);
  if(font.charset!=='basic')skExtend(font);/* базовый набор: диакритика и расширенные знаки не создаются */
  FONTS[font.id]=font;}
/* безопасные диапазоны параметров пера (дополняют safeP) */
/* пределы параметров скелетных шрифтов: font.lim (сняты стресс-тестом топологии stress.js), формат как у paramLimits */
const _paramLimits_core=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');const F=FONTS[font];
  if(!F||!F.lim)return _paramLimits_core(p,font);
  const q=Object.assign({},p),L={},M=F.lim,D=F.DEFAULTS&&F.DEFAULTS.regular||{};
  const cl=(k,lo,hi)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=D[k]!=null?D[k]:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',...M.capH);cl('xh',q.capH*M.xhR[0],q.capH*M.xhR[1]);cl('asc',q.capH+M.ascA[0],q.capH+M.ascA[1]);cl('desc',...M.desc);
  cl('wdth',...M.wdth);cl('ov',...M.ov);cl('stem',M.stem[0],M.stemK?Math.max(M.stem[0],Math.min(M.stem[1],M.stemK*q.xh*(M.stemW?q.wdth/100:1),M.stemWK?M.stemWK*q.wdth:1e9)):M.stem[1]);
  if(M.hairR)cl('hair',Math.max(28,q.stem*M.hairR[0]),Math.max(Math.max(28,q.stem*M.hairR[0]),Math.min(q.stem*M.hairR[1],M.hairX?q.xh*M.hairX:1e9,M.stemWK?M.stemWK*q.wdth:1e9)));else cl('hair',...M.hair);
  /* выносные не короче, чем нужно для точки i/j и крючков g/j при текущей толщине */
  const T=Math.max(q.stem,q.hair);if(M.ascX)cl('asc',Math.max(q.capH+M.ascA[0],Math.min(q.capH+M.ascA[1],q.xh+M.ascX*T)),q.capH+M.ascA[1]);
  if(M.descX)cl('desc',Math.max(M.desc[0],Math.min(M.desc[1],M.descX*T)),M.desc[1]);
  for(const k of ['nib','press','term','tens','conn','spur'])if(M[k])cl(k,...M[k]);
  /* повёрнутое перо: вертикальная толщина горизонталей sqrt((S·sin)²+(H·cos)²) не больше hairX·xh — ограничивается угол */
  if(M.hairX&&M.nib){const Lm=(M.nibX||M.hairX)*q.xh,S=q.stem,H=q.hair;let mx=M.nib[1];
    if(S>H+1&&Lm>H){const s2=(Lm*Lm-H*H)/(S*S-H*H);if(s2<1)mx=Math.asin(Math.sqrt(s2))/D2R;}else if(S>H+1)mx=0;
    cl('nib',Math.max(M.nib[0],-mx),Math.min(M.nib[1],mx));}
  if(q.term!=null)q.term=Math.round(q.term);
  return {q,L};};
/* скрыть новые параметры пера у шрифтов на контурах */
for(const id of Object.keys(FONTS)){const f=FONTS[id];f.params=Object.assign({},f.params||{},{nib:null,press:null,term:null,tens:null,conn:null});}
/* ---------- API для режима «Скелет» ---------- */
/* скелет знака текущего шрифта при параметрах p (с учётом правок ed.sk) — данные для отрисовки и правки */
function glyphSkeleton(ch,p,ed){const d=GL[ch];if(!d||!d.skel)return null;const q=safeP(p);const h=d.k==='xh'?q.xh:q.capH;
  const w=glyphWidth(ch,q,ed);const g=makeG(q,w,h);let sk=d.skel(g);if(ed&&ed.sk)sk=skApplyEdits(sk,ed.sk);return {w,h,skel:sk,pen:FONTS[CUR_FONT].pen(q)};}
/* правки скелета: ed.sk = {'s:n':{p:[dx,dy],a:[dx,dy],b:[dx,dy],w:dw}, 's:cap0':'R', 's:cap1':'F'};
   сдвиги ограничены ±SK_EDIT_LIM (архитектуру знака нельзя сломать), нажим w — 0…2 */
const SK_EDIT_LIM=160;
function skApplyEdits(sk,E){const cl=v=>Math.max(-SK_EDIT_LIM,Math.min(SK_EDIT_LIM,+v||0));
  return sk.map((st,si)=>{const capE=k=>{const v=E[si+':'+k];return typeof v==='string'&&/^[RFHVXBTJC]$/.test(v)?v:null;};
    if(st.dot){const e=E[si+':0'];if(!e||!e.p)return st;const dx=cl(e.p[0]),dy=cl(e.p[1]);const o=Object.assign({},st,{x:st.x+dx,y:st.y+dy});if(st.poly)o.poly=st.poly.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:n.a&&{x:n.a.x+dx,y:n.a.y+dy},b:n.b&&{x:n.b.x+dx,y:n.b.y+dy}}))}));return o;}
    const o=Object.assign({},st,{nodes:st.nodes.map((n,ni)=>{const e=E[si+':'+ni];if(!e)return n;const q=Object.assign({},n,{a:n.a&&{...n.a},b:n.b&&{...n.b}});
      if(e.p){const dx=cl(e.p[0]),dy=cl(e.p[1]);q.x+=dx;q.y+=dy;if(q.a){q.a.x+=dx;q.a.y+=dy;}if(q.b){q.b.x+=dx;q.b.y+=dy;}}
      for(const h of ['a','b']){const v=e[h];if(v===false)q[h]=null;else if(Array.isArray(v)){if(!q[h])q[h]={x:q.x,y:q.y};q[h].x+=cl(v[0]);q[h].y+=cl(v[1]);}}
      /* гладкий узел: вторая ручка остаётся на одной прямой */
      if(q.type!=='corner'&&q.a&&q.b&&(e.a||e.b)&&!(e.a&&e.b)){const mv=e.a?'a':'b',ot=e.a?'b':'a';const dx=q[mv].x-q.x,dy=q[mv].y-q.y,L=Math.hypot(dx,dy);
        const lo=Math.hypot(q[ot].x-q.x,q[ot].y-q.y);if(L>1e-6){q[ot]={x:q.x-dx/L*lo,y:q.y-dy/L*lo};}}
      if(e.w!=null)q.w=Math.max(0,Math.min(2,(n.w==null?1:n.w)+(+e.w||0)));
      if(e.type==='corner'||e.type==='smooth')q.type=e.type;
      return q;})});
    const c0=capE('cap0'),c1=capE('cap1');if(c0)o.cap0=c0;if(c1)o.cap1=c1;return o;});}
/* buildBase: у скелетных знаков с правками скелета контур пересчитывается из изменённой средней линии */
const _buildBase_core=buildBase;
buildBase=function(ch,p,ed){const d=GL[ch];
  if(!d||!d.skel||!ed||!ed.sk||!Object.keys(ed.sk).length)return _buildBase_core(ch,p,ed);
  const r=glyphSkeleton(ch,p,ed),q=safeP(p);const cs=skShape(r.skel,FONTS[CUR_FONT],q,((FONTS[CUR_FONT].GL||{})[ch]||{}).k);
  return {w:r.w,h:r.h,S:sE(q),cs:cloneC(cs)};};
/* ---------- правки базового знака переходят на его вариант .hi (calt): контекстная замена не должна терять правку ----------
   правки скелета — по штрихам с тем же числом узлов; правки точек контура — по ближайшему узлу варианта (≤ 6 ед.) */
const HI_MEMO=new Map();
const isHiAlt=ch=>{const d=GL[ch];return !!(d&&d.opt&&d.opt.alt&&d.opt.feat==='calt'&&d.opt.base&&d.skel);};
function hiEdits(ch,p,edB){
  const key=CUR_FONT+'|'+ch+'|'+JSON.stringify(p)+'|'+JSON.stringify(edB);let r=HI_MEMO.get(key);if(r!==undefined)return r;
  const base=GL[ch].opt.base,q=safeP(p);r=null;
  try{const out={};
    for(const k in edB)if(k!=='sk'&&k!=='off'&&!/^\d+:\d+$/.test(k))out[k]=edB[k];
    const wB=glyphWidth(base,q,edB),h=GL[base].k==='xh'?q.xh:q.capH;
    const sB=GL[base].skel(makeG(q,wB,h)),sH=GL[ch].skel(makeG(q,glyphWidth(ch,q,edB),GL[ch].k==='xh'?q.xh:q.capH));
    let skC=null;
    if(edB.sk){skC={};for(const k in edB.sk){const si=+k.split(':')[0],a=sB[si],b=sH[si];
        if(a&&b&&!a.dot===!b.dot&&(a.dot||a.nodes.length===b.nodes.length))skC[k]=edB.sk[k];}
      if(Object.keys(skC).length)out.sk=skC;else skC=null;}
    const pk=Object.keys(edB).filter(k=>/^\d+:\d+$/.test(k));
    if(pk.length||edB.off){
      const eb=skC||edB.sk?{sk:edB.sk}:null,bb=buildBase(base,p,eb),hh=buildBase(ch,p,skC?{sk:skC}:null);
      if(bb&&hh){
        for(const k of pk){const [ci,ni]=k.split(':').map(Number),n=bb.cs[ci]&&bb.cs[ci].nodes[ni];if(!n)continue;let bd=6.01,bk=null;
          hh.cs.forEach((c,cj)=>c.nodes.forEach((m,nj)=>{const d=Math.hypot(m.x-n.x,m.y-n.y);if(d<bd){bd=d;bk=cj+':'+nj;}}));
          if(bk&&!(bk in out))out[bk]=edB[k];}
        if(edB.off&&bb.cs.length===hh.cs.length)out.off=edB.off;}}
    r=Object.keys(out).length?out:null;}catch(e){r=null;}
  if(HI_MEMO.size>300)HI_MEMO.clear();HI_MEMO.set(key,r);return r;}
const _finalGlyph_hi=finalGlyph;
finalGlyph=function(ch,st,edits,opt){
  if(edits&&isHiAlt(ch)){const edB=edGet(edits,GL[ch].opt.base),own=edGet(edits,ch);
    if(edB&&(!own||own===edB)){const d=hiEdits(ch,st.p,edB);const e2=Object.assign({},edits),ek=edKey(ch);delete e2[ch];if(d)e2[ek]=d;else delete e2[ek];return _finalGlyph_hi(ch,st,e2,opt);}}
  return _finalGlyph_hi(ch,st,edits,opt);};
