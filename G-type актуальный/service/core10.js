/* ===== Объединение контуров (CSG): растр → трассировка → кривые Безье =====
   Контуры глифа складываются по правилу nonzero; контуры с op:'sub' вычитаются; с op:'post' добавляются после вычитания.
   Результат — чистые контуры без наложений, узлы на экстремумах, ручки экстремумов строго горизонтальны/вертикальны. */
const CSG_R=1;                    // единиц шрифта на пиксель растра
const CSG_CACHE=new Map();
function csgFlatten(c){const out=[],n=c.nodes,L=n.length;if(L<2)return out;
  for(let i=0;i<L;i++){const a=n[i],b=n[(i+1)%L];const p1=a.b||a,p2=b.a||b;
    const curve=!!((a.b&&(a.b.x!==a.x||a.b.y!==a.y))||(b.a&&(b.a.x!==b.x||b.a.y!==b.y)));
    if(!curve){out.push([a.x,a.y]);continue;}
    const len=Math.hypot(p1.x-a.x,p1.y-a.y)+Math.hypot(p2.x-p1.x,p2.y-p1.y)+Math.hypot(b.x-p2.x,b.y-p2.y);
    const seg=Math.max(4,Math.min(64,Math.ceil(len/6)));
    for(let k=0;k<seg;k++){const t=k/seg,u=1-t;
      out.push([u*u*u*a.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*b.y]);}}
  return out;}
/* маска по правилу nonzero для набора многоугольников */
function csgMask(polys,x0,y0,W,H,mask,mode){
  const rows=new Array(H);for(let r=0;r<H;r++)rows[r]=null;
  for(const P of polys){const n=P.length;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];if(a[1]===b[1])continue;
    const d=b[1]>a[1]?1:-1,lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]);
    let r0=Math.ceil((lo-y0)/CSG_R-0.5),r1=Math.ceil((hi-y0)/CSG_R-0.5)-1;if(r0<0)r0=0;if(r1>H-1)r1=H-1;
    for(let r=r0;r<=r1;r++){const y=y0+(r+0.5)*CSG_R;const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);(rows[r]||(rows[r]=[])).push(x,d);}}}
  for(let r=0;r<H;r++){const L=rows[r];if(!L)continue;const m=L.length/2,idx=new Array(m);for(let k=0;k<m;k++)idx[k]=k;
    idx.sort((p,q)=>L[2*p]-L[2*q]);let wn=0,xs=0;
    for(const k of idx){const x=L[2*k],was=wn;wn+=L[2*k+1];
      if(was===0&&wn!==0)xs=x;
      else if(was!==0&&wn===0){let c0=Math.ceil((xs-x0)/CSG_R-0.5),c1=Math.ceil((x-x0)/CSG_R-0.5)-1;if(c0<0)c0=0;if(c1>W-1)c1=W-1;
        const o=r*W;for(let c=c0;c<=c1;c++)mask[o+c]=mode;}}}
}
/* трассировка границ: залитое всегда слева по ходу → внешние против часовой, дыры по часовой */
function csgTrace(m,W,H){
  const at=(i,j)=>i>=0&&j>=0&&i<W&&j<H&&m[j*W+i]===1;
  const next=new Map();const key=(i,j)=>j*(W+2)+i;
  const add=(ai,aj,bi,bj)=>{const k=key(ai,aj);let l=next.get(k);if(!l)next.set(k,l=[]);l.push([ai,aj,bi,bj]);};
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){if(m[j*W+i]!==1)continue;
    if(!at(i,j-1))add(i,j,i+1,j);if(!at(i+1,j))add(i+1,j,i+1,j+1);if(!at(i,j+1))add(i+1,j+1,i,j+1);if(!at(i-1,j))add(i,j+1,i,j);}
  const loops=[];
  for(const [k0,l0] of next){while(l0.length){let e=l0.pop();const st=[e[0],e[1]],pts=[[e[0],e[1]]];let dx=e[2]-e[0],dy=e[3]-e[1];
    let guard=0;
    while(guard++<4e6){const cx=e[2],cy=e[3];if(cx===st[0]&&cy===st[1])break;
      const l=next.get(key(cx,cy));if(!l||!l.length)break;
      let pick=0;if(l.length>1){/* седло: поворот налево (диагональные пиксели — разные контуры) */
        let best=-9;for(let q=0;q<l.length;q++){const ex=l[q][2]-l[q][0],ey=l[q][3]-l[q][1];const cr=dx*ey-dy*ex;const s=cr>0?2:(cr===0?1:0);if(s>best){best=s;pick=q;}}}
      const ne=l.splice(pick,1)[0];const ndx=ne[2]-ne[0],ndy=ne[3]-ne[1];
      if(ndx!==dx||ndy!==dy)pts.push([cx,cy]);dx=ndx;dy=ndy;e=ne;}
    if(pts.length>=3)loops.push(pts);}}
  return loops;}
/* Рамер—Дуглас—Пекер для замкнутой ломаной */
function csgRDP(P,eps){if(P.length<4)return P.slice();
  const keep=new Uint8Array(P.length);
  /* опорные точки — две самые далёкие */
  let i0=0,i1=0,dmax=-1;for(let i=0;i<P.length;i++){const d=(P[i][0]-P[0][0])**2+(P[i][1]-P[0][1])**2;if(d>dmax){dmax=d;i1=i;}}
  keep[i0]=keep[i1]=1;
  const rec=(a,b)=>{const n=P.length;const A=P[a],B=P[b%n];let mx=-1,mi=-1;const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-9;
    for(let k=a+1;k<b;k++){const q=P[k%n];const d=Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L;if(d>mx){mx=d;mi=k;}}
    if(mx>eps){keep[mi%n]=1;rec(a,mi);rec(mi,b);}};
  rec(i0,i1);rec(i1,P.length+i0);
  const out=[];for(let i=0;i<P.length;i++)if(keep[i])out.push(P[i]);return out;}
/* ---- аппроксимация кривыми (Шнайдер) ---- */
const v2=(a,b)=>[a[0]-b[0],a[1]-b[1]],vlen=a=>Math.hypot(a[0],a[1]),vnorm=a=>{const l=vlen(a)||1;return [a[0]/l,a[1]/l];},vdot=(a,b)=>a[0]*b[0]+a[1]*b[1];
function bz(b,t){const u=1-t;return [u*u*u*b[0][0]+3*u*u*t*b[1][0]+3*u*t*t*b[2][0]+t*t*t*b[3][0],u*u*u*b[0][1]+3*u*u*t*b[1][1]+3*u*t*t*b[2][1]+t*t*t*b[3][1]];}
function bzd(b,t){const u=1-t;return [3*u*u*(b[1][0]-b[0][0])+6*u*t*(b[2][0]-b[1][0])+3*t*t*(b[3][0]-b[2][0]),3*u*u*(b[1][1]-b[0][1])+6*u*t*(b[2][1]-b[1][1])+3*t*t*(b[3][1]-b[2][1])];}
function bzdd(b,t){const u=1-t;return [6*u*(b[2][0]-2*b[1][0]+b[0][0])+6*t*(b[3][0]-2*b[2][0]+b[1][0]),6*u*(b[2][1]-2*b[1][1]+b[0][1])+6*t*(b[3][1]-2*b[2][1]+b[1][1])];}
function fitCubic(pts,tl,tr,err,depth){
  const n=pts.length;if(n===2){const d=vlen(v2(pts[1],pts[0]))/3;return [[pts[0],[pts[0][0]+tl[0]*d,pts[0][1]+tl[1]*d],[pts[1][0]+tr[0]*d,pts[1][1]+tr[1]*d],pts[1]]];}
  let u=[0];for(let i=1;i<n;i++)u.push(u[i-1]+vlen(v2(pts[i],pts[i-1])));const tot=u[n-1]||1;u=u.map(x=>x/tot);
  let b=genBz(pts,u,tl,tr),[me,si]=maxErr(pts,b,u);
  if(me<err)return [b];
  if(me<err*4){for(let it=0;it<6;it++){u=u.map((t,i)=>newton(b,pts[i],t));b=genBz(pts,u,tl,tr);[me,si]=maxErr(pts,b,u);if(me<err)return [b];}}
  if((depth||0)>12||n<4)return [b];
  si=Math.max(1,Math.min(n-2,si));const tc=vnorm(v2(pts[si-1],pts[si+1]));
  return fitCubic(pts.slice(0,si+1),tl,tc,err,(depth||0)+1).concat(fitCubic(pts.slice(si),[-tc[0],-tc[1]],tr,err,(depth||0)+1));}
function genBz(pts,u,tl,tr){const n=pts.length,p0=pts[0],p3=pts[n-1];let C00=0,C01=0,C11=0,X0=0,X1=0;
  for(let i=0;i<n;i++){const t=u[i],s=1-t,b1=3*t*s*s,b2=3*t*t*s;const A1=[tl[0]*b1,tl[1]*b1],A2=[tr[0]*b2,tr[1]*b2];
    C00+=vdot(A1,A1);C01+=vdot(A1,A2);C11+=vdot(A2,A2);
    const b0=s*s*s,b3=t*t*t;const tmp=[pts[i][0]-(p0[0]*(b0+b1)+p3[0]*(b2+b3)),pts[i][1]-(p0[1]*(b0+b1)+p3[1]*(b2+b3))];
    X0+=vdot(A1,tmp);X1+=vdot(A2,tmp);}
  const det=C00*C11-C01*C01;let al=0,ar=0;if(Math.abs(det)>1e-9){al=(X0*C11-X1*C01)/det;ar=(C00*X1-C01*X0)/det;}
  const seg=vlen(v2(p3,p0)),eps=1e-6*seg;
  if(al<eps||ar<eps||al>seg*1.6||ar>seg*1.6){al=ar=seg/3;}
  return [p0,[p0[0]+tl[0]*al,p0[1]+tl[1]*al],[p3[0]+tr[0]*ar,p3[1]+tr[1]*ar],p3];}
function maxErr(pts,b,u){let m=0,si=Math.floor(pts.length/2);for(let i=1;i<pts.length-1;i++){const q=bz(b,u[i]);const d=Math.hypot(q[0]-pts[i][0],q[1]-pts[i][1]);if(d>m){m=d;si=i;}}return [m,si];}
function newton(b,p,t){const q=bz(b,t),d1=bzd(b,t),d2=bzdd(b,t);const df=[q[0]-p[0],q[1]-p[1]];const num=vdot(df,d1),den=vdot(d1,d1)+vdot(df,d2);if(Math.abs(den)<1e-9)return t;return Math.min(1,Math.max(0,t-num/den));}
function splitBz(b,t){const l=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  const a=l(b[0],b[1]),c=l(b[1],b[2]),d=l(b[2],b[3]),e=l(a,c),f=l(c,d),g=l(e,f);return [[b[0],a,e,g],[g,f,d,b[3]]];}
/* разрезать кривую в точках экстремума по X и Y */
function extremaSplit(b){const ts=[];
  for(const ax of [0,1]){const p0=b[0][ax],p1=b[1][ax],p2=b[2][ax],p3=b[3][ax];
    const A=-p0+3*p1-3*p2+p3,B=2*(p0-2*p1+p2),C=p1-p0;
    const push=t=>{if(t>0.06&&t<0.94)ts.push(t);};
    if(Math.abs(A)<1e-9){if(Math.abs(B)>1e-9)push(-C/B);}else{const D=B*B-4*A*C;if(D>=0){const s=Math.sqrt(D);push((-B+s)/(2*A));push((-B-s)/(2*A));}}}
  ts.sort((p,q)=>p-q);const out=[];let cur=b,prev=0;
  for(const t of ts){if(t-prev<0.04)continue;const tt=(t-prev)/(1-prev);const [l,r]=splitBz(cur,tt);out.push(l);cur=r;prev=t;}
  out.push(cur);return out;}
/* ломаная → узлы: углы, прямые и кривые */
function csgFit(loop,x0,y0){
  const P0=loop.map(([i,j])=>[x0+i*CSG_R,y0+j*CSG_R]);
  /* сгладить ступеньки: настоящие углы (обе стороны длинные) остаются, остальное — середины ребер */
  const S0=[],N0=P0.length,LONG=3*CSG_R;
  for(let i=0;i<N0;i++){const pr=P0[(i-1+N0)%N0],c=P0[i],nx=P0[(i+1)%N0];
    const l1=Math.abs(c[0]-pr[0])+Math.abs(c[1]-pr[1]),l2=Math.abs(nx[0]-c[0])+Math.abs(nx[1]-c[1]);
    if(l1>=LONG&&l2>=LONG)S0.push(c);
    S0.push([(c[0]+nx[0])/2,(c[1]+nx[1])/2]);}
  const P=csgRDP(S0,0.6*CSG_R);const n=P.length;if(n<3)return null;
  /* углы: резкий поворот ломаной */
  const dir=i=>vnorm(v2(P[(i+1)%n],P[i]));
  const corner=new Uint8Array(n);
  for(let i=0;i<n;i++){const a=dir((i-1+n)%n),b=dir(i);const ang=Math.acos(Math.max(-1,Math.min(1,vdot(a,b))))*180/Math.PI;if(ang>36)corner[i]=1;}
  /* прямые участки: длинные отрезки, особенно строго горизонтальные/вертикальные */
  const slen=i=>vlen(v2(P[(i+1)%n],P[i]));
  const lineSeg=new Uint8Array(n);
  for(let i=0;i<n;i++){const d=dir(i),L=slen(i),ax=Math.abs(d[0])>0.9994||Math.abs(d[1])>0.9994;if((ax&&L>=18*CSG_R)||L>=70*CSG_R)lineSeg[i]=1;}
  for(let i=0;i<n;i++)if(lineSeg[i]){corner[i]=corner[i]||2;corner[(i+1)%n]=corner[(i+1)%n]||2;}
  let s0=-1;for(let i=0;i<n;i++)if(corner[i]){s0=i;break;}
  let smooth=false;if(s0<0){smooth=true;let li=0;for(let i=1;i<n;i++)if(P[i][0]<P[li][0])li=i;s0=li;}
  const order=[];for(let k=0;k<=n;k++)order.push((s0+k)%n);
  const runs=[];let cur=[order[0]];
  for(let k=1;k<=n;k++){const i=order[k];cur.push(i);if(k===n||corner[i]){runs.push(cur);cur=[i];}}
  const beziers=[];
  for(const run of runs){
    const pts=run.map(i=>P[i]);
    if(pts.length===2){beziers.push({line:true,b:[pts[0],pts[0],pts[1],pts[1]]});continue;}
    const ia=run[0],ib=run[run.length-1];
    const tA=()=>{if(corner[ia]===2&&lineSeg[(ia-1+n)%n])return dir((ia-1+n)%n);if(smooth&&!corner[ia])return vnorm(v2(P[(ia+1)%n],P[(ia-1+n)%n]));return vnorm(v2(pts[1],pts[0]));};
    const tB=()=>{if(corner[ib]===2&&lineSeg[ib]){const d=dir(ib);return [-d[0],-d[1]];}if(smooth&&!corner[ib])return vnorm(v2(P[(ib-1+n)%n],P[(ib+1)%n]));return vnorm(v2(pts[pts.length-2],pts[pts.length-1]));};
    const tl=tA(),tr=tB();
    const dense=densify(pts,3);
    for(const bz0 of fitCubic(dense,tl,tr,0.8*CSG_R)){
      /* почти прямая кривая → отрезок */
      const A=bz0[0],B=bz0[3],L=vlen(v2(B,A))||1;const dev=q=>Math.abs((q[0]-A[0])*(B[1]-A[1])-(q[1]-A[1])*(B[0]-A[0]))/L;
      if(dev(bz0[1])<0.6&&dev(bz0[2])<0.6){beziers.push({line:true,b:[A,A,B,B]});continue;}
      for(const sb of extremaSplit(bz0))beziers.push({b:sb});}}
  /* слить соседние коллинеарные отрезки */
  for(let k=beziers.length-1;k>0&&beziers.length>2;k--){const p=beziers[k-1],q=beziers[k];if(!p.line||!q.line)continue;
    const d1=vnorm(v2(p.b[3],p.b[0])),d2=vnorm(v2(q.b[3],q.b[0]));if(vdot(d1,d2)>0.9995){p.b=[p.b[0],p.b[0],q.b[3],q.b[3]];beziers.splice(k,1);}}
  /* узлы */
  const out=[];
  for(let k=0;k<beziers.length;k++){const B=beziers[k].b,isL=beziers[k].line;
    const nd={x:B[0][0],y:B[0][1],a:null,b:isL?null:{x:B[1][0],y:B[1][1]}};
    const prv=beziers[(k-1+beziers.length)%beziers.length];if(!prv.line)nd.a={x:prv.b[2][0],y:prv.b[2][1]};
    out.push(nd);}
  /* выпрямить ручки на экстремумах */
  for(const nd of out){for(const h of ['a','b']){const q=nd[h];if(!q)continue;const dx=Math.abs(q.x-nd.x),dy=Math.abs(q.y-nd.y);
      if(dy<dx*0.08)q.y=nd.y;else if(dx<dy*0.08)q.x=nd.x;}}
  /* округлить */
  const rd=v=>Math.round(v*10)/10;
  for(const nd of out){nd.x=rd(nd.x);nd.y=rd(nd.y);if(nd.a){nd.a.x=rd(nd.a.x);nd.a.y=rd(nd.a.y);}if(nd.b){nd.b.x=rd(nd.b.x);nd.b.y=rd(nd.b.y);}}
  return out.length>=2?out:null;}
function csgKey(cs){let s='';for(const c of cs){s+=(c.op||'')+(c.grp||'')+(c.hole?'h':'')+':';for(const n of c.nodes){s+=Math.round(n.x*4)+','+Math.round(n.y*4);
  if(n.a)s+='a'+Math.round(n.a.x*4)+','+Math.round(n.a.y*4);if(n.b)s+='b'+Math.round(n.b.x*4)+','+Math.round(n.b.y*4);s+=';';}}return s;}
function csgUnionRaster(cs){
  if(!cs||!cs.length)return cs;
  const key=csgKey(cs);const hit=CSG_CACHE.get(key);if(hit)return hit.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))}));
  const base=[],sub=[],post=[];
  const FL=cs.map(c=>{const P=csgFlatten(c);return P.length<3?null:P;});
  cs.forEach((c,i)=>{const P=FL[i];if(!P)return;(c.op==='sub'?sub:c.op==='post'?post:base).push(P);});
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const P of base.concat(post))for(const q of P){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  if(!(x1>x0))return [];
  x0=Math.floor(x0)-3;y0=Math.floor(y0)-3;const W=Math.ceil((x1-x0)/CSG_R)+4,H=Math.ceil((y1-y0)/CSG_R)+4;
  const m=new Uint8Array(W*H);
  /* группы: в каждой — сложение (nonzero) и своё вычитание; группы объединяются */
  const groups=new Map();
  cs.forEach((c,i)=>{if(c.op==='post')return;const P=FL[i];if(!P)return;const k=c.grp||0;let G=groups.get(k);if(!G)groups.set(k,G={add:[],sub:[]});(c.op==='sub'?G.sub:G.add).push(P);});
  if(groups.size===1){const G=groups.values().next().value;csgMask(G.add,x0,y0,W,H,m,1);if(G.sub.length)csgMask(G.sub,x0,y0,W,H,m,0);}
  else{const t=new Uint8Array(W*H);for(const G of groups.values()){t.fill(0);csgMask(G.add,x0,y0,W,H,t,1);if(G.sub.length)csgMask(G.sub,x0,y0,W,H,t,0);for(let i=0;i<t.length;i++)if(t[i])m[i]=1;}}
  if(post.length)csgMask(post,x0,y0,W,H,m,1);
  /* убрать одиночные пиксели-занозы */
  const loops=csgTrace(m,W,H);const out=[];
  const XS=[],YS=[];for(const c of cs){if(c.op==='sub'&&false)continue;for(const nd of c.nodes){XS.push(nd.x);YS.push(nd.y);}}
  const snap=(v,arr)=>{let b=v,bd=1.35*CSG_R;for(const q of arr){const d=Math.abs(q-v);if(d<bd){bd=d;b=q;}}return b;};
  for(const L of loops){let ar=0;for(let i=0;i<L.length;i++){const a=L[i],b=L[(i+1)%L.length];ar+=a[0]*b[1]-b[0]*a[1];}
    if(Math.abs(ar)/2<12)continue;           // мусор < 12 пикс²
    const nodes=csgFit(L,x0,y0);if(!nodes)continue;
    for(const nd of nodes){const nx=snap(nd.x,XS),ny=snap(nd.y,YS),dx=nx-nd.x,dy=ny-nd.y;if(!dx&&!dy)continue;
      nd.x=nx;nd.y=ny;if(nd.a){nd.a.x+=dx;nd.a.y+=dy;}if(nd.b){nd.b.x+=dx;nd.b.y+=dy;}}
    /* схлопнуть микроступеньки: короткие прямые отрезки между двумя углами */
    for(let it=0;it<3;it++){for(let q=0;q<nodes.length&&nodes.length>3;q++){const A=nodes[q],B=nodes[(q+1)%nodes.length];
      if(A.b||B.a)continue;const L=Math.hypot(B.x-A.x,B.y-A.y);if(L<6.5*CSG_R){A.x=(A.x+B.x)/2;A.y=(A.y+B.y)/2;A.b=B.b;nodes.splice((q+1)%nodes.length,1);q--;}}}
    out.push(mkc(nodes,ar<0));}
  if(CSG_CACHE.size>4000)CSG_CACHE.clear();
  CSG_CACHE.set(key,out);
  return out.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))}));
}
/* помощники для конструкций: вычитание и добавление после вычитания */
const SUB=cs=>(Array.isArray(cs)?cs:[cs]).map(c=>Object.assign(c,{op:'sub'}));
const GRP=(k,cs)=>(Array.isArray(cs)?cs:[cs]).map(c=>Object.assign(c,{grp:k}));
