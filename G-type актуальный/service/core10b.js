/* ===== Точное векторное объединение контуров (CSG) =====
   1) Сегменты исходных контуров (отрезки и кубические Безье) режутся в экстремумах по X/Y → монотонные куски.
   2) Точные пересечения кусков (рекурсивное деление + уточнение Ньютоном) и проекции концов на чужие куски
      (Т-стыки, совпадающие рёбра); точки ближе CSGX_EPS сливаются в одну вершину.
   3) Каждый кусок режется в точках пересечения (де Кастельжо); совпадающие рёбра объединяются в пучок.
   4) Для каждого ребра считается число обхода по категориям (группа: сложение / вычитание, post) лучом
      из середины ребра — точно по исходным кривым; ребро остаётся, если заливка слева и справа разная.
   5) Рёбра собираются в замкнутые контуры (заливка слева), смежные части одной исходной кривой
      склеиваются обратно в точную подкривую, прямые на одной линии — в один отрезок, кривые режутся в экстремумах.
   Геометрия результата — точные подкривые исходных сегментов, без подгонки. При сбое — растровый csgUnionRaster. */
const CSGX_EPS=0.02;              // допуск слияния вершин (ед. шрифта)
const CSGX_THIN=0.6;           // контуры тоньше (средняя ширина) отбрасываются
const CSGX_STAT={exact:0,fallback:0,last:null};
function cxEval(p,t){if(p.length===2){return [p[0][0]+(p[1][0]-p[0][0])*t,p[0][1]+(p[1][1]-p[0][1])*t];}
  const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;return [a*p[0][0]+b*p[1][0]+c*p[2][0]+d*p[3][0],a*p[0][1]+b*p[1][1]+c*p[2][1]+d*p[3][1]];}
function cxDer(p,t){if(p.length===2)return [p[1][0]-p[0][0],p[1][1]-p[0][1]];
  const u=1-t;return [3*u*u*(p[1][0]-p[0][0])+6*u*t*(p[2][0]-p[1][0])+3*t*t*(p[3][0]-p[2][0]),3*u*u*(p[1][1]-p[0][1])+6*u*t*(p[2][1]-p[1][1])+3*t*t*(p[3][1]-p[2][1])];}
/* подкривая на [t0,t1] */
function cxSub(p,t0,t1){if(p.length===2)return [t0<=0?p[0].slice():cxEval(p,t0),t1>=1?p[1].slice():cxEval(p,t1)];
  let q=p;if(t1<1){q=cxSplit(q,t1)[0];}if(t0>0){q=cxSplit(q,t0/t1)[1];}return q;}
function cxSplit(b,t){const l=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  const a=l(b[0],b[1]),c=l(b[1],b[2]),d=l(b[2],b[3]),e=l(a,c),f=l(c,d),g=l(e,f);return [[b[0],a,e,g],[g,f,d,b[3]]];}
/* параметры экстремумов по X и Y внутри (lo,hi) */
function cxExt(p,lo,hi){const ts=[];if(p.length===2)return ts;
  for(const ax of [0,1]){const p0=p[0][ax],p1=p[1][ax],p2=p[2][ax],p3=p[3][ax];
    const A=-p0+3*p1-3*p2+p3,B=2*(p0-2*p1+p2),C=p1-p0;const sc=Math.abs(p0)+Math.abs(p1)+Math.abs(p2)+Math.abs(p3)+1;
    const push=t=>{if(t>lo&&t<hi)ts.push(t);};
    if(Math.abs(A)<1e-12*sc){if(Math.abs(B)>1e-12*sc)push(-C/B);}else{const D=B*B-4*A*C;if(D>=0){const s=Math.sqrt(D);push((-B+s)/(2*A));push((-B-s)/(2*A));}}}
  ts.sort((a,b)=>a-b);const o=[];for(const t of ts)if(!o.length||t-o[o.length-1]>1e-9)o.push(t);return o;}
function cxFlat(p){if(p.length===2)return true;const A=p[0],B=p[3],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy);
  if(L<1e-9)return Math.hypot(p[1][0]-A[0],p[1][1]-A[1])<0.004&&Math.hypot(p[2][0]-A[0],p[2][1]-A[1])<0.004;
  const d1=Math.abs((p[1][0]-A[0])*dy-(p[1][1]-A[1])*dx)/L,d2=Math.abs((p[2][0]-A[0])*dy-(p[2][1]-A[1])*dx)/L;return d1<0.004&&d2<0.004;}
/* пересечения двух монотонных кусков: список [s,t] (параметры кусков) */
function cxIntersect(A,B,out,strict){
  const rec=(a,a0,a1,b,b0,b1,dep)=>{
    const ax0=Math.min(a[0][0],a[a.length-1][0]),ax1=Math.max(a[0][0],a[a.length-1][0]),ay0=Math.min(a[0][1],a[a.length-1][1]),ay1=Math.max(a[0][1],a[a.length-1][1]);
    const bx0=Math.min(b[0][0],b[b.length-1][0]),bx1=Math.max(b[0][0],b[b.length-1][0]),by0=Math.min(b[0][1],b[b.length-1][1]),by1=Math.max(b[0][1],b[b.length-1][1]);
    const e=1e-7;if(ax0>bx1+e||bx0>ax1+e||ay0>by1+e||by0>ay1+e)return;
    const fa=cxFlat(a),fb=cxFlat(b);
    if((fa&&fb)||dep>48){
      const P=a[0],Q=a[a.length-1],R=b[0],S=b[b.length-1];const rx=Q[0]-P[0],ry=Q[1]-P[1],sx=S[0]-R[0],sy=S[1]-R[1];
      const la=Math.hypot(rx,ry),lb=Math.hypot(sx,sy);if(la<1e-12||lb<1e-12)return;
      /* знаковые расстояния концов до чужой хорды: пересечение — только при смене знака (совпадающие хорды не дают точек) */
      const o1=(rx*(R[1]-P[1])-ry*(R[0]-P[0]))/la,o2=(rx*(S[1]-P[1])-ry*(S[0]-P[0]))/la;
      const o3=(sx*(P[1]-R[1])-sy*(P[0]-R[0]))/lb,o4=(sx*(Q[1]-R[1])-sy*(Q[0]-R[0]))/lb;
      const tol=1e-9;
      /* почти параллельные и близкие хорды — совпадающие рёбра: их стыки ловит проекция концов */
      if(!strict&&Math.abs(rx*sy-ry*sx)<2e-3*la*lb&&Math.max(Math.abs(o1),Math.abs(o2),Math.abs(o3),Math.abs(o4))<CSGX_EPS)return;
      if(!((o1>tol&&o2<-tol)||(o1<-tol&&o2>tol)))return;
      if(!((o3>tol&&o4<-tol)||(o3<-tol&&o4>tol)))return;
      const s=o3/(o3-o4),t=o1/(o1-o2);
      out.push([a0+(a1-a0)*Math.min(1,Math.max(0,s)),b0+(b1-b0)*Math.min(1,Math.max(0,t))]);return;}
    if(!fa&&(fb||(ax1-ax0+ay1-ay0)>=(bx1-bx0+by1-by0))){const [l,r]=cxSplit(a,0.5),m=(a0+a1)/2;rec(l,a0,m,b,b0,b1,dep+1);rec(r,m,a1,b,b0,b1,dep+1);}
    else{const [l,r]=cxSplit(b,0.5),m=(b0+b1)/2;rec(a,a0,a1,l,b0,m,dep+1);rec(a,a0,a1,r,m,b1,dep+1);}};
  rec(A,0,1,B,0,1,0);
  /* уточнение Ньютоном по обеим кривым */
  for(const r of out){let [s,t]=r;for(let it=0;it<6;it++){const P=cxEval(A,s),Q=cxEval(B,t),fx=P[0]-Q[0],fy=P[1]-Q[1];if(Math.abs(fx)+Math.abs(fy)<1e-11)break;
      const da=cxDer(A,s),db=cxDer(B,t);const det=-da[0]*db[1]+db[0]*da[1];if(Math.abs(det)<1e-12)break;
      const ds=(-fx*(-db[1])+db[0]*(-fy))/det,dt=(da[0]*(-fy)-(-fx)*da[1])/det;const ns=s+ds,nt=t+dt;if(!(ns>=0&&ns<=1&&nt>=0&&nt<=1))break;s=ns;t=nt;}
    r[0]=s;r[1]=t;}
  return out;}
/* ближайший параметр монотонного куска к точке */
function cxProject(p,P){if(p.length===2){const dx=p[1][0]-p[0][0],dy=p[1][1]-p[0][1],L2=dx*dx+dy*dy;if(L2<1e-18)return [0,Math.hypot(P[0]-p[0][0],P[1]-p[0][1])];
    let t=((P[0]-p[0][0])*dx+(P[1]-p[0][1])*dy)/L2;t=Math.min(1,Math.max(0,t));const q=cxEval(p,t);return [t,Math.hypot(q[0]-P[0],q[1]-P[1])];}
  let bt=0,bd=1e18;for(let k=0;k<=16;k++){const t=k/16,q=cxEval(p,t),d=(q[0]-P[0])**2+(q[1]-P[1])**2;if(d<bd){bd=d;bt=t;}}
  let t=bt;for(let it=0;it<8;it++){const q=cxEval(p,t),d1=cxDer(p,t);const fx=q[0]-P[0],fy=q[1]-P[1];
    const u=1-t,d2=[6*u*(p[2][0]-2*p[1][0]+p[0][0])+6*t*(p[3][0]-2*p[2][0]+p[1][0]),6*u*(p[2][1]-2*p[1][1]+p[0][1])+6*t*(p[3][1]-2*p[2][1]+p[1][1])];
    const num=fx*d1[0]+fy*d1[1],den=d1[0]*d1[0]+d1[1]*d1[1]+fx*d2[0]+fy*d2[1];if(Math.abs(den)<1e-14)break;const nt=Math.min(1,Math.max(0,t-num/den));if(Math.abs(nt-t)<1e-13){t=nt;break;}t=nt;}
  const q=cxEval(p,t);return [t,Math.hypot(q[0]-P[0],q[1]-P[1])];}
/* t монотонного куска, где координата ax равна v (кусок монотонен по ax) */
function cxSolve(p,ax,v){if(p.length===2){const a=p[0][ax],b=p[1][ax];return (v-a)/(b-a);}
  let lo=0,hi=1;const inc=p[3][ax]>p[0][ax];
  for(let it=0;it<60;it++){const m=(lo+hi)/2,c=cxEval(p,m)[ax];if((c<v)===inc)lo=m;else hi=m;if(hi-lo<1e-12)break;}return (lo+hi)/2;}
function csgExact(cs){
  /* категории: post — 0; группа k: сложение 2i+1, вычитание 2i+2 */
  const gk=new Map();let ncat=1;
  const catOf=c=>{if(c.op==='post')return 0;const k=c.grp||0;let g=gk.get(k);if(g==null){g=ncat;gk.set(k,g);ncat+=2;}return c.op==='sub'?g+1:g;};
  /* 1. монотонные куски */
  const P=[];   // {p, cat, o:orig id, t0,t1, x0,x1,y0,y1}
  const ORIG=[];// исходные сегменты: точки
  const near=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.y-q.y)<1e-6;
  for(const c of cs){if(!c.nodes||c.nodes.length<2)continue;const cat=catOf(c);
    /* совпадающие соседние узлы (вырожденный сегмент между ними) — один узел, иначе в контуре будет щель */
    let n=[];for(const nd of c.nodes){const pv=n[n.length-1];
      if(pv&&near(pv,nd)&&(!pv.b||near(pv.b,pv))&&(!nd.a||near(nd.a,nd))){n[n.length-1]={x:pv.x,y:pv.y,a:pv.a,b:nd.b};continue;}
      n.push(nd);}
    while(n.length>1){const f=n[0],l=n[n.length-1];if(near(l,f)&&(!l.b||near(l.b,l))&&(!f.a||near(f.a,f))){n[0]={x:f.x,y:f.y,a:l.a,b:f.b};n.pop();}else break;}
    if(n.length<2)continue;
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
      const curve=!!((a.b&&(a.b.x!==a.x||a.b.y!==a.y))||(b.a&&(b.a.x!==b.x||b.a.y!==b.y)));
      let p=curve?[[a.x,a.y],[(a.b||a).x,(a.b||a).y],[(b.a||b).x,(b.a||b).y],[b.x,b.y]]:[[a.x,a.y],[b.x,b.y]];
      /* вырожденная кривая (ручки на хорде, по порядку) — это отрезок */
      if(p.length===4){const A=p[0],B=p[3],dx=B[0]-A[0],dy=B[1]-A[1],L2=dx*dx+dy*dy;
        if(L2>1e-12){const L=Math.sqrt(L2),dv=z=>Math.abs((z[0]-A[0])*dy-(z[1]-A[1])*dx)/L,pr=z=>((z[0]-A[0])*dx+(z[1]-A[1])*dy)/L2;
          if(dv(p[1])<1e-7&&dv(p[2])<1e-7&&pr(p[1])>=0&&pr(p[2])<=1&&pr(p[1])<=pr(p[2]))p=[A,B];}}
      if(!p.every(q=>isFinite(q[0])&&isFinite(q[1])))throw new Error('nan');
      if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<1e-9&&(!curve||p.every(q=>Math.abs(q[0]-a.x)+Math.abs(q[1]-a.y)<1e-9)))continue;
      const o=ORIG.length;ORIG.push(p);
      const ts=[0];for(const t of cxExt(p,1e-7,1-1e-7)){const z=cxEval(p,t),w=cxEval(p,ts[ts.length-1]),e=p[p.length-1];
        if(Math.hypot(z[0]-w[0],z[1]-w[1])>1e-6&&Math.hypot(z[0]-e[0],z[1]-e[1])>1e-6)ts.push(t);}ts.push(1);
      /* последовательный разрез: соседние куски делят одну и ту же точку (без щелей) */
      const QS=[];if(p.length===2||ts.length===2)QS.push(p.map(z=>z.slice()));
      else{let cur=p,prev=0;for(let k=1;k+1<ts.length;k++){const [l,r]=cxSplit(cur,(ts[k]-prev)/(1-prev));
          const g=l[3];for(const ax of [0,1])if(Math.abs(l[2][ax]-g[ax])<1e-7&&Math.abs(r[1][ax]-g[ax])<1e-7){l[2][ax]=g[ax];r[1][ax]=g[ax];}
          QS.push(l);cur=r;prev=ts[k];}QS.push(cur);}
      for(let k=0;k<QS.length;k++){const q=QS[k];
        const A=q[0],B=q[q.length-1];
        P.push({p:q,cat,o,t0:ts[k],t1:ts[k+1],x0:Math.min(A[0],B[0]),x1:Math.max(A[0],B[0]),y0:Math.min(A[1],B[1]),y1:Math.max(A[1],B[1]),cuts:[]});}}}
  if(!P.length)return [];
  /* 2. вершины: кластеры точек */
  const VX=[],VY=[],par=[];const grid=new Map();const cell=CSGX_EPS*2;
  const find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
  const unite=(i,j)=>{i=find(i);j=find(j);if(i!==j){if(i<j)par[j]=i;else par[i]=j;}};
  const addPt=(x,y)=>{const id=VX.length;VX.push(x);VY.push(y);par.push(id);const cx=Math.floor(x/cell),cy=Math.floor(y/cell);
    for(let ix=cx-1;ix<=cx+1;ix++)for(let iy=cy-1;iy<=cy+1;iy++){const l=grid.get(ix*100003+iy);if(!l)continue;for(const j of l)if(Math.abs(VX[j]-x)<=CSGX_EPS&&Math.abs(VY[j]-y)<=CSGX_EPS&&Math.hypot(VX[j]-x,VY[j]-y)<=CSGX_EPS)unite(id,j);}
    const k=cx*100003+cy;let l=grid.get(k);if(!l)grid.set(k,l=[]);l.push(id);return id;};
  for(const s of P){const A=s.p[0],B=s.p[s.p.length-1];s.cuts.push([0,addPt(A[0],A[1])],[1,addPt(B[0],B[1])]);}
  /* сортировка по x для перебора пар */
  const ord=P.map((_,i)=>i).sort((i,j)=>P[i].x0-P[j].x0);
  const E=CSGX_EPS;
  for(let ii=0;ii<ord.length;ii++){const a=P[ord[ii]];
    for(let jj=ii+1;jj<ord.length;jj++){const b=P[ord[jj]];if(b.x0>a.x1+E)break;
      if(b.y0>a.y1+E||a.y0>b.y1+E)continue;
      /* проекции концов друг на друга */
      for(const [s,t] of [[a,b],[b,a]]){for(const ep of [s.p[0],s.p[s.p.length-1]]){
          if(ep[0]<t.x0-E||ep[0]>t.x1+E||ep[1]<t.y0-E||ep[1]>t.y1+E)continue;
          const [tt,d]=cxProject(t.p,ep);if(d<=E&&tt>1e-9&&tt<1-1e-9){const q=cxEval(t.p,tt);const v=addPt(q[0],q[1]);unite(v,addPt(ep[0],ep[1]));t.cuts.push([tt,v]);}}}
      /* собственные пересечения */
      if(b.x0>a.x1+1e-7||b.y0>a.y1+1e-7||a.y0>b.y1+1e-7)continue;
      const r=cxIntersect(a.p,b.p,[]);
      for(const [s,t] of r){const qa=cxEval(a.p,s),qb=cxEval(b.p,t);const va=addPt(qa[0],qa[1]),vb=addPt(qb[0],qb[1]);unite(va,vb);a.cuts.push([s,va]);b.cuts.push([t,vb]);}}}
  /* представитель кластера: исходный узел контура приоритетнее (это первые точки), иначе он сам */
  const NV=VX.length;const rep=new Int32Array(NV);for(let i=0;i<NV;i++)rep[i]=find(i);
  /* 3. рёбра */
  const ED=[];
  for(let si=0;si<P.length;si++){const s=P[si];s.cuts.sort((x,y)=>x[0]-y[0]);let pt=-1,pv=-1;
    for(const [t,v0] of s.cuts){const v=rep[v0];if(pt<0){pt=t;pv=v;continue;}if(v===pv)continue;
      ED.push({s:si,ta:pt,tb:t,va:pv,vb:v});pt=t;pv=v;}}
  for(const e of ED){const s=P[e.s];const q=cxSub(s.p,e.ta,e.tb).map(x=>x.slice());
    const A=[VX[e.va],VY[e.va]],B=[VX[e.vb],VY[e.vb]];
    if(q.length===4){q[1][0]+=A[0]-q[0][0];q[1][1]+=A[1]-q[0][1];q[2][0]+=B[0]-q[3][0];q[2][1]+=B[1]-q[3][1];}
    q[0]=A;q[q.length-1]=B;e.q=q;e.mid=cxEval(q,0.5);
    e.oa=s.t0+(s.t1-s.t0)*e.ta;e.ob=s.t0+(s.t1-s.t0)*e.tb;}
  /* пучки совпадающих рёбер */
  const bmap=new Map();const BUN=[];
  for(const e of ED){const k=e.va<e.vb?e.va+'_'+e.vb:e.vb+'_'+e.va;let l=bmap.get(k);if(!l)bmap.set(k,l=[]);
    let hit=null;for(const b of l){const m=b.rep.mid;if(Math.hypot(m[0]-e.mid[0],m[1]-e.mid[1])<=CSGX_EPS*2||(cxProject(b.rep.q,e.mid)[1]<=CSGX_EPS*2&&cxProject(e.q,m)[1]<=CSGX_EPS*2)){hit=b;break;}}
    if(hit){hit.mem.push(e);}else{const b={rep:e,mem:[e]};l.push(b);BUN.push(b);}}
  /* 4. классификация */
  const inside=w=>{if(w[0]!==0)return true;for(let g=1;g<ncat;g+=2)if(w[g]!==0&&w[g+1]===0)return true;return false;};
  const W=new Int32Array(ncat);
  const BE=[];
  for(const b of BUN){const e=b.rep,m=e.mid;const d=cxDer(e.q,0.5);
    const horiz=Math.abs(d[1])>=Math.abs(d[0]);   // луч по +x, иначе по +y
    W.fill(0);const excl=new Set(b.mem.map(x=>x.s));
    for(let si=0;si<P.length;si++){if(excl.has(si))continue;const s=P[si];
      if(horiz){if(s.y1<=s.y0||m[1]<s.y0||m[1]>=s.y1||s.x1<=m[0])continue;
        const A=s.p[0],B=s.p[s.p.length-1];let x;if(s.x0>m[0])x=Infinity;else{const t=cxSolve(s.p,1,m[1]);x=cxEval(s.p,t)[0];}
        if(x>m[0])W[s.cat]+=(B[1]>A[1]?1:-1);}
      else{if(s.x1<=s.x0||m[0]<s.x0||m[0]>=s.x1||s.y1<=m[1])continue;
        const A=s.p[0],B=s.p[s.p.length-1];let y;if(s.y0>m[1])y=Infinity;else{const t=cxSolve(s.p,0,m[0]);y=cxEval(s.p,t)[1];}
        if(y>m[1])W[s.cat]+=(B[0]<A[0]?1:-1);}}
    const far=inside(W);
    /* вклад самих рёбер пучка: точка по другую сторону (−r) */
    for(const x of b.mem){const dd=cxDer(x.q,0.5);if(horiz)W[P[x.s].cat]+=(dd[1]>0?1:-1);else W[P[x.s].cat]+=(dd[0]<0?1:-1);}
    const near=inside(W);
    if(far===near)continue;
    /* заливка на стороне −r, если near; слева от направления (−dy,dx) */
    const r=horiz?[1,0]:[0,1];const fill=near?[-r[0],-r[1]]:r;const left=[-d[1],d[0]];
    const fwd=left[0]*fill[0]+left[1]*fill[1]>0;
    BE.push(fwd?{va:e.va,vb:e.vb,q:e.q,o:P[e.s].o,ta:e.oa,tb:e.ob}:{va:e.vb,vb:e.va,q:e.q.slice().reverse(),o:P[e.s].o,ta:e.ob,tb:e.oa});}
  /* 5. сборка контуров */
  const outM=new Map();for(let i=0;i<BE.length;i++){const l=outM.get(BE[i].va);if(l)l.push(i);else outM.set(BE[i].va,[i]);}
  const indeg=new Map();for(const e of BE)indeg.set(e.vb,(indeg.get(e.vb)||0)+1);
  for(const [v,l] of outM)if((indeg.get(v)||0)!==l.length)throw new Error('degree');
  for(const [v,c] of indeg)if(!outM.has(v))throw new Error('degree');
  const tang=(q,end)=>{if(!end){for(let k=1;k<q.length;k++){const dx=q[k][0]-q[0][0],dy=q[k][1]-q[0][1];if(Math.abs(dx)+Math.abs(dy)>1e-9)return Math.atan2(dy,dx);}}
    else{const n=q.length-1;for(let k=n-1;k>=0;k--){const dx=q[n][0]-q[k][0],dy=q[n][1]-q[k][1];if(Math.abs(dx)+Math.abs(dy)>1e-9)return Math.atan2(dy,dx);}}return 0;};
  const used=new Uint8Array(BE.length);const loops=[];
  const turn=(ain,q)=>{let da=tang(q,false)-ain;while(da<=-Math.PI)da+=2*Math.PI;while(da>Math.PI)da-=2*Math.PI;return da;};
  for(let i0=0;i0<BE.length;i0++){if(used[i0])continue;const L=[];let i=i0;let guard=0;const sv=BE[i0].va;
    for(;;){if(guard++>100000)throw new Error('loop');used[i]=1;L.push(BE[i]);const e=BE[i];
      const cand=outM.get(e.vb).filter(j=>!used[j]);if(e.vb===sv)cand.push(i0);
      if(!cand.length)throw new Error('open');
      const ain=tang(e.q,true);let best=-1,bv=-1e9;
      for(const j of cand){const da=turn(ain,BE[j].q);if(da>bv+1e-12){bv=da;best=j;}}
      if(best===i0)break;i=best;}
    loops.push(L);}
  /* 6. контуры → узлы */
  const out=[];
  for(const L of loops){
    /* склейка частей одной исходной кривой */
    const S=[];
    for(const e of L){const pe=S.length?S[S.length-1]:null;
      if(pe&&pe.o===e.o&&Math.abs(pe.tb-e.ta)<1e-12&&((pe.tb>pe.ta)===(e.tb>e.ta))){pe.tb=e.tb;pe.vb=e.vb;continue;}
      S.push({o:e.o,ta:e.ta,tb:e.tb,va:e.va,vb:e.vb});}
    if(S.length>1){const f=S[0],l=S[S.length-1];if(f.o===l.o&&Math.abs(l.tb-f.ta)<1e-12&&((l.tb>l.ta)===(f.tb>f.ta))){f.ta=l.ta;f.va=l.va;S.pop();}}
    /* точная геометрия: подкривая исходного сегмента (концы — в вершины) */
    let G=[];
    for(const s of S){const lo=Math.min(s.ta,s.tb),hi=Math.max(s.ta,s.tb);
      const q=cxSub(ORIG[s.o],lo,hi).map(x=>x.slice());if(s.ta>s.tb)q.reverse();
      const A=[VX[s.va],VY[s.va]],B=[VX[s.vb],VY[s.vb]];
      if(q.length===4){q[1][0]+=A[0]-q[0][0];q[1][1]+=A[1]-q[0][1];q[2][0]+=B[0]-q[3][0];q[2][1]+=B[1]-q[3][1];}
      q[0]=A;q[q.length-1]=B;G.push(q);}
    const C=cxFinish(G);if(C)out.push(C);}
  /* правки ступенек, задевшие соседние контуры, — откатить к точной геометрии */
  for(let it=0;it<3;it++){const bad=cxCross(out);if(!bad.size)break;let ch=false;for(const i of bad)if(out[i].raw){out[i]=out[i].raw;ch=true;}if(!ch)break;}
  return out;}
function csgUnion(cs){
  if(!cs||!cs.length)return cs;
  const key=csgKey(cs);const hit=CSG_CACHE.get(key);
  const cp=o=>o.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))}));
  if(hit)return cp(hit);
  let out=null;
  try{out=csgExact(cs);CSGX_STAT.exact++;}catch(e){CSGX_STAT.fallback++;CSGX_STAT.last=String(e&&e.message);out=null;}
  if(!out)return csgUnionRaster(cs);
  if(CSG_CACHE.size>4000)CSG_CACHE.clear();
  CSG_CACHE.set(key,out);
  return cp(out);}
/* микроступеньки (< CSGX_STEP ед.) — следствие неточной стыковки компонентов: короткий отрезок
   с изломом убирается, к соседней вершине сдвигается конец того соседа, где сдвиг заметен меньше
   (кривая — сдвигом конца вместе с ручкой, прямая по оси — только вдоль оси) */
const CSGX_STEP=1.0;
function cxMicroOne(H,i){
  const isAx=q=>Math.abs(q[0][0]-q[q.length-1][0])<1e-9||Math.abs(q[0][1]-q[q.length-1][1])<1e-9;
  const cost=(q,atEnd,np)=>{const e=atEnd?q[q.length-1]:q[0];if(q.length===4)return 0.5;
    if(!isAx(q))return 1;const o=atEnd?q[0]:q[1];const h=Math.abs(o[1]-e[1])<1e-9;return (h?Math.abs(np[1]-e[1]):Math.abs(np[0]-e[0]))>1e-9?2:0.2;};
  const len=q=>Math.hypot(q[q.length-1][0]-q[0][0],q[q.length-1][1]-q[0][1]);
  const mv=(q,atEnd,np)=>{if(atEnd){const e=q[q.length-1],dx=np[0]-e[0],dy=np[1]-e[1];if(q.length===4){q[2]=[q[2][0]+dx,q[2][1]+dy];}q[q.length-1]=np;}
    else{const e=q[0],dx=np[0]-e[0],dy=np[1]-e[1];if(q.length===4){q[1]=[q[1][0]+dx,q[1][1]+dy];}q[0]=np;}};
  const q=H[i],ip=(i-1+H.length)%H.length,inx=(i+1)%H.length,P=H[ip],N=H[inx];const A=q[0],B=q[1];
  const cA=cost(N,false,A),cB=cost(P,true,B);
  if(cA<cB||(cA===cB&&len(N)>=len(P)))mv(N,false,A);else mv(P,true,B);
  H.splice(i,1);}
function cxMicro(H){
  const len=q=>Math.hypot(q[q.length-1][0]-q[0][0],q[q.length-1][1]-q[0][1]);
  for(let guard=0;guard<50;guard++){let done=true;
    for(let i=0;i<H.length&&H.length>3;i++){const q=H[i];if(q.length!==2)continue;const L=len(q);if(L>=CSGX_STEP)continue;
      cxMicroOne(H,i);done=false;break;}
    if(done)break;}
  return H;}

/* сегменты замкнутого контура → узлы: прямые, слияние коллинеарных, разрез в экстремумах, микроступеньки */
function cxFinish(G,lineTol){lineTol=lineTol||0.01;
    /* почти прямые кривые → отрезки; коллинеарные отрезки — в один */
    G=G.map(q=>{if(q.length===2)return q;const A=q[0],B=q[3],dx=B[0]-A[0],dy=B[1]-A[1],Ln=Math.hypot(dx,dy);if(Ln<1e-9)return q;
      const dv=z=>Math.abs((z[0]-A[0])*dy-(z[1]-A[1])*dx)/Ln;const pr=z=>((z[0]-A[0])*dx+(z[1]-A[1])*dy)/(Ln*Ln);
      return dv(q[1])<lineTol&&dv(q[2])<lineTol&&pr(q[1])>=-1e-6&&pr(q[2])<=1+1e-6&&pr(q[1])<=pr(q[2])+1e-6?[A,B]:q;});
    for(let it=0;it<2;it++)for(let k=G.length-1;k>=0&&G.length>2;k--){const a=G[(k-1+G.length)%G.length],b=G[k];if(a===b||a.length!==2||b.length!==2)continue;
      const d1=[a[1][0]-a[0][0],a[1][1]-a[0][1]],d2=[b[1][0]-b[0][0],b[1][1]-b[0][1]];const l1=Math.hypot(...d1),l2=Math.hypot(...d2);
      if(l1<1e-9||l2<1e-9)continue;const cr=Math.abs(d1[0]*d2[1]-d1[1]*d2[0])/(l1*l2),dt=(d1[0]*d2[0]+d1[1]*d2[1])/(l1*l2);
      const dev=Math.abs((b[0][0]-a[0][0])*(b[1][1]-a[0][1])-(b[0][1]-a[0][1])*(b[1][0]-a[0][0]))/Math.hypot(b[1][0]-a[0][0],b[1][1]-a[0][1]);
      if(dt>0&&(cr<1e-4||dev<0.005)){const nl=[a[0],b[1]];const ia=(k-1+G.length)%G.length;G[ia]=nl;G.splice(k,1);if(ia>k){}}}
    /* кривые — разрез в экстремумах (кроме крошечных кусочков у концов) */
    const H=[];for(const q of G){if(q.length===2){H.push(q);continue;}
      const ts=cxExt(q,0,1).filter(t=>{const z=cxEval(q,t);return Math.hypot(z[0]-q[0][0],z[1]-q[0][1])>1.5&&Math.hypot(z[0]-q[3][0],z[1]-q[3][1])>1.5;});
      let cur=q,prev=0;for(const t of ts){const [l,r]=cxSplit(cur,(t-prev)/(1-prev));H.push(l);cur=r;prev=t;}H.push(cur);}
    const Hraw=H.map(q=>q.map(z=>z.slice()));
    cxMicro(H);cxSteps(H);
    const C=cxNodes(H);if(!C)return null;
    if(H.length!==Hraw.length){const R=cxNodes(Hraw);
      /* правка ступенек не должна давать самопересечений; иначе — точный контур как есть */
      if(R&&cxCross([C]).size)return R;
      if(R)Object.defineProperty(C,'raw',{value:R,enumerable:false});}
    return C;}
function cxNodes(H){
    if(H.length<2)return null;
    /* площадь (по ломаной с точками кривых) */
    let ar=0;const pts=[];for(const q of H){if(q.length===2)pts.push(q[0]);else for(let k=0;k<8;k++)pts.push(cxEval(q,k/8));}
    let per=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];ar+=a[0]*b[1]-b[0]*a[1];per+=Math.hypot(b[0]-a[0],b[1]-a[1]);}ar/=2;
    /* крошки и волоски (средняя ширина < CSGX_THIN) — не форма, а погрешность стыковки */
    if(Math.abs(ar)<4||2*Math.abs(ar)/per<CSGX_THIN)return null;
    const nodes=[];
    for(let k=0;k<H.length;k++){const q=H[k],pq=H[(k-1+H.length)%H.length];
      nodes.push({x:q[0][0],y:q[0][1],a:pq.length===4?{x:pq[2][0],y:pq[2][1]}:null,b:q.length===4?{x:q[1][0],y:q[1][1]}:null});}
    /* ручки, почти параллельные оси, — строго по оси */
    for(const nd of nodes)for(const h of ['a','b']){const q=nd[h];if(!q)continue;const dx=Math.abs(q.x-nd.x),dy=Math.abs(q.y-nd.y);
      if(dy<0.03&&dy<dx*0.02)q.y=nd.y;else if(dx<0.03&&dx<dy*0.02)q.x=nd.x;}
    const rd=v=>Math.round(v*100)/100;
    for(const nd of nodes){nd.x=rd(nd.x);nd.y=rd(nd.y);if(nd.a){nd.a.x=rd(nd.a.x);nd.a.y=rd(nd.a.y);}if(nd.b){nd.b.x=rd(nd.b.x);nd.b.y=rd(nd.b.y);}}
    return {hole:ar<0,nodes};}
/* индексы контуров, у которых есть пересечения (сами с собой или с другими) во внутренних точках сегментов */
function cxCross(C){const S=[];
  C.forEach((c,ci)=>{const n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
    const p=(a.b||b.a)?[[a.x,a.y],[(a.b||a).x,(a.b||a).y],[(b.a||b).x,(b.a||b).y],[b.x,b.y]]:[[a.x,a.y],[b.x,b.y]];
    const ts=[0].concat(cxExt(p,1e-6,1-1e-6),[1]);
    for(let k=0;k+1<ts.length;k++){const q=cxSub(p,ts[k],ts[k+1]);const A=q[0],B=q[q.length-1];
      S.push({q,ci,g:ci+':'+i,t0:ts[k],t1:ts[k+1],x0:Math.min(A[0],B[0]),x1:Math.max(A[0],B[0]),y0:Math.min(A[1],B[1]),y1:Math.max(A[1],B[1])});}}});
  const bad=new Set();S.sort((a,b)=>a.x0-b.x0);
  for(let i=0;i<S.length;i++){const a=S[i];for(let j=i+1;j<S.length;j++){const b=S[j];if(b.x0>a.x1)break;if(b.y0>a.y1||a.y0>b.y1)continue;
    const r=cxIntersect(a.q,b.q,[],true);
    for(const [u,v] of r){const ua=a.t0+(a.t1-a.t0)*u,vb=b.t0+(b.t1-b.t0)*v;
      if(ua>1e-4&&ua<1-1e-4||vb>1e-4&&vb<1-1e-4){if(a.g===b.g)continue;bad.add(a.ci);bad.add(b.ci);}}}}
  return bad;}
/* упрощение контуров после искажения (сетка, направляющие): мелкие куски warpContour
   с гладкими стыками склеиваются в одну кубическую кривую, если она отклоняется не больше CSGX_FIT */
const CSGX_FIT=0.2;
function cxFitChain(Q){
  const pts=[];for(let k=0;k<Q.length;k++){const q=Q[k];for(let s=(k?1:0);s<=8;s++)pts.push(cxEval(q,s/8));}
  const tg=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);return l>1e-9?[dx/l,dy/l]:null;};
  const f=Q[0],l=Q[Q.length-1];
  const tl=tg(f[0],f[1])||tg(f[0],f[2])||tg(f[0],f[3]),tr=tg(l[3],l[2])||tg(l[3],l[1])||tg(l[3],l[0]);if(!tl||!tr)return null;
  let u=[0];for(let i=1;i<pts.length;i++)u.push(u[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const tot=u[u.length-1]||1;u=u.map(x=>x/tot);
  let b=genBz(pts,u,tl,tr),[me]=maxErr(pts,b,u);
  for(let it=0;it<6&&me>CSGX_FIT;it++){u=u.map((t,i)=>newton(b,pts[i],t));b=genBz(pts,u,tl,tr);[me]=maxErr(pts,b,u);}
  if(me>CSGX_FIT)return null;
  return b;}
function csgSimplify(cs){const out=[];
  for(const c of cs){const n=c.nodes;if(!n||n.length<2)continue;
    let G=[];for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
      const curve=!!((a.b&&(a.b.x!==a.x||a.b.y!==a.y))||(b.a&&(b.a.x!==b.x||b.a.y!==b.y)));
      if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<1e-9&&!curve)continue;
      G.push(curve?[[a.x,a.y],[(a.b||a).x,(a.b||a).y],[(b.a||b).x,(b.a||b).y],[b.x,b.y]]:[[a.x,a.y],[b.x,b.y]]);}
    if(G.length<2)continue;
    /* гладкие стыки кривых */
    const N=G.length;const smooth=new Uint8Array(N); // стык перед G[k]
    const dirE=q=>{const e=q[q.length-1];for(let k=q.length-2;k>=0;k--){const dx=e[0]-q[k][0],dy=e[1]-q[k][1],l=Math.hypot(dx,dy);if(l>1e-9)return [dx/l,dy/l];}return null;};
    const dirS=q=>{const s=q[0];for(let k=1;k<q.length;k++){const dx=q[k][0]-s[0],dy=q[k][1]-s[1],l=Math.hypot(dx,dy);if(l>1e-9)return [dx/l,dy/l];}return null;};
    for(let k=0;k<N;k++){const p=G[(k-1+N)%N],q=G[k];if(p.length!==4||q.length!==4)continue;const a=dirE(p),b=dirS(q);if(a&&b&&a[0]*b[0]+a[1]*b[1]>0.99985)smooth[k]=1;}
    let s0=-1;for(let k=0;k<N;k++)if(!smooth[k]){s0=k;break;}
    const R=[];
    if(s0<0){s0=0;}
    let k=0;
    while(k<N){const i=(s0+k)%N;
      if(G[i].length!==4){R.push(G[i]);k++;continue;}
      /* цепочка гладких кривых от i */
      let m=1;while(k+m<N&&smooth[(s0+k+m)%N])m++;
      const chain=[];for(let j=0;j<m;j++)chain.push(G[(s0+k+j)%N]);
      let a=0;while(a<chain.length){let best=a,bz=null;
        for(let b=a+1;b<chain.length;b++){const f=cxFitChain(chain.slice(a,b+1));if(!f)break;best=b;bz=f;}
        if(bz){R.push(bz);a=best+1;}else{R.push(chain[a]);a++;}}
      k+=m;}
    const C=cxFinish(R,0.05);if(C)out.push(C);}
  return out;}

/* короткие прямые (< CSGX_FLAT ед.) — ступеньки по меркам Сверки. Если прямая касательно переходит в соседнюю
   кривую, она поглощается этой кривой (подгонка одной кубической с теми же касательными, ошибка ≤ 0.5 ед.);
   иначе — схлопывается, как микроступенька */
const CSGX_FLAT=6;
function cxSteps(H){
  const tS=q=>{for(let k=1;k<q.length;k++){const dx=q[k][0]-q[0][0],dy=q[k][1]-q[0][1],l=Math.hypot(dx,dy);if(l>1e-9)return [dx/l,dy/l];}return null;};
  const tE=q=>{const n=q.length-1;for(let k=n-1;k>=0;k--){const dx=q[n][0]-q[k][0],dy=q[n][1]-q[k][1],l=Math.hypot(dx,dy);if(l>1e-9)return [dx/l,dy/l];}return null;};
  const lineAsCubic=q=>[q[0],[q[0][0]+(q[1][0]-q[0][0])/3,q[0][1]+(q[1][1]-q[0][1])/3],[q[0][0]+(q[1][0]-q[0][0])*2/3,q[0][1]+(q[1][1]-q[0][1])*2/3],q[1]];
  const fit=(Q,tol)=>{const pts=[];for(let k=0;k<Q.length;k++){const q=Q[k];const m=q.length===2?4:16;for(let s=(k?1:0);s<=m;s++)pts.push(cxEval(q,s/m));}
    const tl=tS(Q[0]),tr=tE(Q[Q.length-1]);if(!tl||!tr)return null;const t2=[-tr[0],-tr[1]];
    let u=[0];for(let i=1;i<pts.length;i++)u.push(u[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const tot=u[u.length-1]||1;u=u.map(x=>x/tot);
    let b=genBz(pts,u,tl,t2),[me]=maxErr(pts,b,u);for(let it=0;it<8&&me>tol;it++){u=u.map((t,i)=>newton(b,pts[i],t));b=genBz(pts,u,tl,t2);[me]=maxErr(pts,b,u);}
    if(me>tol)return null;b[0]=Q[0][0];b[3]=Q[Q.length-1][Q[Q.length-1].length-1];return b;};
  for(let guard=0;guard<60;guard++){let done=true;
    for(let i=0;i<H.length&&H.length>2;i++){const q=H[i];if(q.length!==2)continue;const L=Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1]);if(L>=CSGX_FLAT)continue;
      const ip=(i-1+H.length)%H.length,inx=(i+1)%H.length,P=H[ip],N=H[inx];const d=[(q[1][0]-q[0][0])/L,(q[1][1]-q[0][1])/L];
      const a=P.length===4&&tE(P),b=N.length===4&&tS(N);
      const smP=a&&a[0]*d[0]+a[1]*d[1]>0.9998,smN=b&&b[0]*d[0]+b[1]*d[1]>0.9998;
      let r=null;
      if(smP&&smN&&P!==N){const M=[(q[0][0]+q[1][0])/2,(q[0][1]+q[1][1])/2];const r1=fit([P,[q[0],M]],0.5),r2=fit([[M,q[1]],N],0.5);
        if(r1&&r2){r1[3]=M;r2[0]=M;H[ip]=r1;H[inx]=r2;H.splice(i,1);done=false;break;}}
      if(smN&&(r=fit([q,N],0.5))){H.splice(i,1);H[inx>i?i:0]=r;done=false;break;}
      if(smP&&(r=fit([P,q],0.5))){H[ip]=r;H.splice(i,1);done=false;break;}
      /* угол с обеих сторон (или подгонка не удалась) */
      if(H.length<=3)continue;
      if(P.length===2&&N.length===2&&cxJoinLines(H,i,1)){done=false;break;}
      /* серия коротких прямых (шип) между двумя прямыми */
      if(P.length===2&&N.length===2&&N!==P){const N2=H[(inx+1)%H.length];const L2=Math.hypot(N[1][0]-N[0][0],N[1][1]-N[0][1]);
        if(L2<CSGX_FLAT&&N2.length===2&&H.length>4&&cxJoinLines(H,i,2)){done=false;break;}}
      cxMicroOne(H,i);done=false;break;}
    if(done)break;}
  return H;}

/* убрать k коротких прямых начиная с i между прямыми P (до) и N (после):
   на одной линии — слить; параллельны со сдвигом — сдвинуть более короткую; иначе — продлить до пересечения */
function cxJoinLines(H,i,k){const n=H.length;const ip=(i-1+n)%n,inx=(i+k)%n;const P=H[ip],N=H[inx];if(P.length!==2||N.length!==2||ip===inx)return false;
  let runL=0;for(let j=0;j<k;j++){const q=H[(i+j)%n];runL+=Math.hypot(q[1][0]-q[0][0],q[1][1]-q[0][1]);}
  const p0=P[0],p1=P[1],n0=N[0],n1=N[1];const r=[p1[0]-p0[0],p1[1]-p0[1]],u=[n1[0]-n0[0],n1[1]-n0[1]];
  const lr=Math.hypot(...r),lu=Math.hypot(...u);if(lr<1e-9||lu<1e-9)return false;
  const den=r[0]*u[1]-r[1]*u[0];
  const rm=()=>{const idx=[];for(let j=0;j<k;j++)idx.push((i+j)%n);idx.sort((a,b)=>b-a);for(const j of idx)H.splice(j,1);};
  if(Math.abs(den)<0.02*lr*lu){if(r[0]*u[0]+r[1]*u[1]<=0)return false;
    const nr=[-r[1]/lr,r[0]/lr],off=(n0[0]-p1[0])*nr[0]+(n0[1]-p1[1])*nr[1];
    if(Math.abs(off)>=CSGX_FLAT)return false;
    if(Math.abs(off)>0.3){/* сдвиг более короткой стороны вместе с концом её внешней соседки */
      if(lu<=lr){const d=[-nr[0]*off,-nr[1]*off];const o=H[(inx+1)%n];if(o===P)return false;N[0]=[N[0][0]+d[0],N[0][1]+d[1]];N[1]=[N[1][0]+d[0],N[1][1]+d[1]];
        o[0]=N[1];if(o.length===4)o[1]=[o[1][0]+d[0],o[1][1]+d[1]];}
      else{const d=[nr[0]*off,nr[1]*off];const o=H[(ip-1+n)%n];if(o===N)return false;P[0]=[P[0][0]+d[0],P[0][1]+d[1]];P[1]=[P[1][0]+d[0],P[1][1]+d[1]];
        const e=o.length-1;o[e]=P[0];if(o.length===4)o[2]=[o[2][0]+d[0],o[2][1]+d[1]];}}
    P[1]=N[1];const iN=H.indexOf(N);H.splice(iN,1);const i2=H.indexOf(P);const idx=[];for(let j=0;j<k;j++)idx.push((i2+1+j)%H.length);idx.sort((a,b)=>b-a);for(const j of idx)H.splice(j,1);
    return true;}
  const t=((n0[0]-p0[0])*u[1]-(n0[1]-p0[1])*u[0])/den,X=[p0[0]+r[0]*t,p0[1]+r[1]*t];
  const tn=((X[0]-n0[0])*u[0]+(X[1]-n0[1])*u[1])/(lu*lu);
  const dA=Math.hypot(X[0]-p1[0],X[1]-p1[1]),dB=Math.hypot(X[0]-n0[0],X[1]-n0[1]);
  if(!(t>0.5&&tn<0.5&&dA<Math.max(2*runL,3)&&dB<Math.max(2*runL,3)))return false;
  P[1]=X;N[0]=X;rm();return true;}
