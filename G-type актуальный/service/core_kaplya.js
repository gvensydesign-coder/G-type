/* ===== «Капля» (Kaplya Drop): поле капсул + гладкое объединение, изоконтур, Безье. Части: kap/engine.js build.js glyphs.js api.js tail.js (сборка mk_kaplya.sh) ===== */
(function(){
/* ---------- «Капля»: движок неявного поля (капсулы + гладкое объединение), изоконтур, подгонка Безье ---------- */
const kHash=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;};
function kRng(seed){let a=seed>>>0||1;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function kNoise(seed){const hv=(ix,iy)=>{let h=(Math.imul(ix,374761393)+Math.imul(iy,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return ((h>>>0)/4294967295)*2-1;};
  const sm=t=>t*t*(3-2*t);
  return (x,y,lam)=>{const fx=x/lam,fy=y/lam,ix=Math.floor(fx),iy=Math.floor(fy),tx=sm(fx-ix),ty=sm(fy-iy);
    const a=hv(ix,iy),b=hv(ix+1,iy),c=hv(ix,iy+1),d=hv(ix+1,iy+1);return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;};}
const kSS=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/* ломаная -> равномерные точки с шагом ds (концы сохраняются); возвращает также длины */
function kResample(pts,ds){const n=pts.length;if(n<2)return pts.slice();const L=[0];for(let i=1;i<n;i++)L.push(L[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const T=L[n-1];if(T<1e-6)return [pts[0].slice(),pts[n-1].slice()];const m=Math.max(1,Math.round(T/ds)),out=[];let j=0;
  for(let k=0;k<=m;k++){const s=T*k/m;while(j<n-2&&L[j+1]<s)j++;const seg=L[j+1]-L[j]||1,t=(s-L[j])/seg;out.push([pts[j][0]+(pts[j+1][0]-pts[j][0])*t,pts[j][1]+(pts[j+1][1]-pts[j][1])*t]);}
  return out;}
function kDistPoly(px,py,pts){let best=1e9;for(let i=0;i<pts.length-1;i++){const ax=pts[i][0],ay=pts[i][1],bx=pts[i+1][0],by=pts[i+1][1],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
  let t=l2>0?((px-ax)*dx+(py-ay)*dy)/l2:0;t=t<0?0:t>1?1:t;const d=Math.hypot(px-ax-dx*t,py-ay-dy*t);if(d<best)best=d;}return best;}
/* ---------- поле ---------- */
/* strokes: [{p:[[x,y]..] (плотная ломаная), r:[...] радиусы по точкам, closed}] ; возвращает {f(x,y), bb} */
function kMakeField(strokes,k,noiseFn,A){
  const seg=[];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const ex=k+A+10;
  strokes.forEach((s,si)=>{const p=s.p,r=s.r;for(let i=0;i<p.length-1;i++){
    const ax=p[i][0],ay=p[i][1],bx=p[i+1][0],by=p[i+1][1],ra=r[i],rb=r[i+1];seg.push([ax,ay,bx,by,ra,rb,si]);}
    if(p.length===1)seg.push([p[0][0],p[0][1],p[0][0],p[0][1],r[0],r[0],si]);
    for(let i=0;i<p.length;i++){x0=Math.min(x0,p[i][0]-r[i]);x1=Math.max(x1,p[i][0]+r[i]);y0=Math.min(y0,p[i][1]-r[i]);y1=Math.max(y1,p[i][1]+r[i]);}});
  x0-=ex;y0-=ex;x1+=ex;y1+=ex;
  const B=64,bx0=Math.floor(x0/B),by0=Math.floor(y0/B),bnx=Math.floor(x1/B)-bx0+1,bny=Math.floor(y1/B)-by0+1,bk=new Array(bnx*bny);
  for(const s of seg){const rm=Math.max(s[4],s[5])+ex,i0=Math.floor((Math.min(s[0],s[2])-rm)/B)-bx0,i1=Math.floor((Math.max(s[0],s[2])+rm)/B)-bx0,j0=Math.floor((Math.min(s[1],s[3])-rm)/B)-by0,j1=Math.floor((Math.max(s[1],s[3])+rm)/B)-by0;
    for(let j=Math.max(0,j0);j<=Math.min(bny-1,j1);j++)for(let i=Math.max(0,i0);i<=Math.min(bnx-1,i1);i++){(bk[j*bnx+i]||(bk[j*bnx+i]=[])).push(s);}}
  const ns=strokes.length,dd=new Float64Array(ns),used=[];
  const f=(x,y)=>{const i=Math.floor(x/B)-bx0,j=Math.floor(y/B)-by0;if(i<0||j<0||i>=bnx||j>=bny)return 150;const L=bk[j*bnx+i];if(!L)return 150;
    used.length=0;
    for(const s of L){const ax=s[0],ay=s[1],dx=s[2]-ax,dy=s[3]-ay,l2=dx*dx+dy*dy;let t=l2>0?((x-ax)*dx+(y-ay)*dy)/l2:0;t=t<0?0:t>1?1:t;
      const d=Math.hypot(x-ax-dx*t,y-ay-dy*t)-(s[4]+(s[5]-s[4])*t),si=s[6];
      if(dd[si]===undefined||used.indexOf(si)<0){used.push(si);dd[si]=d;}else if(d<dd[si])dd[si]=d;}
    let v;
    if(used.length===1)v=dd[used[0]];
    else{const a=used.map(si=>dd[si]).sort((p,q)=>p-q);v=a[0];for(let n=1;n<a.length;n++){const h=Math.max(k-Math.abs(a[n]-v),0)/k;v=Math.min(a[n],v)-h*h*k/4;if(a[n]-v>k)break;}}
    if(A>0&&v<k+A+20)v+=A*(0.62*noiseFn(x,y,118)+0.38*noiseFn(x+57,y-31,53));
    return v;};
  return {f,bb:[x0,y0,x1,y1]};}
/* ---------- изоконтур (marching squares), внутри: v<0, обход так, что внутри слева ---------- */
function kIso(f,bb,h){const x0=Math.floor(bb[0]/h)*h,y0=Math.floor(bb[1]/h)*h,nx=Math.ceil((bb[2]-x0)/h)+2,ny=Math.ceil((bb[3]-y0)/h)+2;
  const v=new Float32Array(nx*ny);for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)v[j*nx+i]=f(x0+i*h,y0+j*h);
  for(let i=0;i<nx;i++){v[i]=Math.max(v[i],1);v[(ny-1)*nx+i]=Math.max(v[(ny-1)*nx+i],1);}for(let j=0;j<ny;j++){v[j*nx]=Math.max(v[j*nx],1);v[j*nx+nx-1]=Math.max(v[j*nx+nx-1],1);}
  const next=new Map();
  for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
    const c=[j*nx+i,j*nx+i+1,(j+1)*nx+i+1,(j+1)*nx+i],ins=[v[c[0]]<0,v[c[1]]<0,v[c[2]]<0,v[c[3]]<0];
    if(ins[0]===ins[1]&&ins[1]===ins[2]&&ins[2]===ins[3])continue;
    /* ребра против часовой: 0 низ H(i,j), 1 право V(i+1,j), 2 верх H(i,j+1), 3 лево V(i,j) ; id = 2*(j*nx+i)+vert */
    const eid=[2*(j*nx+i),2*(j*nx+i+1)+1,2*((j+1)*nx+i),2*(j*nx+i)+1];
    const all=[];for(let e=0;e<4;e++){const A=ins[e],B=ins[(e+1)%4];if(A!==B)all.push({id:eid[e],s:A});}
    if(all.length===2){const a=all[0].s?all[0]:all[1],b=all[0].s?all[1]:all[0];next.set(a.id,b.id);}
    else{const cv=(v[c[0]]+v[c[1]]+v[c[2]]+v[c[3]])/4,centerIn=cv<0;
      for(let q=0;q<4;q++){if(!all[q].s)continue;next.set(all[q].id,centerIn?all[(q+1)%4].id:all[(q+3)%4].id);}}}
  const pt=id=>{const vert=id&1,k=id>>1,i=k%nx,j=(k-i)/nx,a=v[k],b=v[vert?k+nx:k+1],t=a/(a-b);return vert?[x0+i*h,y0+(j+t)*h]:[x0+(i+t)*h,y0+j*h];};
  const loops=[],seen=new Set();
  for(const s0 of next.keys()){if(seen.has(s0))continue;const L=[];let id=s0,guard=0;
    while(!seen.has(id)&&guard++<200000){seen.add(id);L.push(pt(id));const n=next.get(id);if(n===undefined)break;id=n;}
    if(L.length>=6)loops.push(L);}
  return {loops,v,nx,ny,x0,y0,h};}
const kArea=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
/* сглаживание замкнутой ломаной (1-2-1) */
function kSmooth(P,n){for(let it=0;it<n;it++){const m=P.length,Q=new Array(m);for(let i=0;i<m;i++){const a=P[(i+m-1)%m],b=P[i],c=P[(i+1)%m];Q[i]=[(a[0]+2*b[0]+c[0])/4,(a[1]+2*b[1]+c[1])/4];}P=Q;}return P;}
/* ---------- подгонка кубических Безье (Schneider) ---------- */
function kBez(c,t){const u=1-t,a=u*u*u,b=3*u*u*t,d=3*u*t*t,e=t*t*t;return [a*c[0][0]+b*c[1][0]+d*c[2][0]+e*c[3][0],a*c[0][1]+b*c[1][1]+d*c[2][1]+e*c[3][1]];}
function kBez1(c,t){const u=1-t;return [3*u*u*(c[1][0]-c[0][0])+6*u*t*(c[2][0]-c[1][0])+3*t*t*(c[3][0]-c[2][0]),3*u*u*(c[1][1]-c[0][1])+6*u*t*(c[2][1]-c[1][1])+3*t*t*(c[3][1]-c[2][1])];}
function kBez2(c,t){const u=1-t;return [6*u*(c[2][0]-2*c[1][0]+c[0][0])+6*t*(c[3][0]-2*c[2][0]+c[1][0]),6*u*(c[2][1]-2*c[1][1]+c[0][1])+6*t*(c[3][1]-2*c[2][1]+c[1][1])];}
function kGenBez(d,u,t1,t2){const n=d.length,p0=d[0],p3=d[n-1];let C00=0,C01=0,C11=0,X0=0,X1=0;
  for(let i=0;i<n;i++){const s=u[i],o=1-s,b0=o*o*o,b1=3*s*o*o,b2=3*s*s*o,b3=s*s*s;
    const a1x=t1[0]*b1,a1y=t1[1]*b1,a2x=t2[0]*b2,a2y=t2[1]*b2;
    C00+=a1x*a1x+a1y*a1y;C01+=a1x*a2x+a1y*a2y;C11+=a2x*a2x+a2y*a2y;
    const tx=d[i][0]-(p0[0]*(b0+b1)+p3[0]*(b2+b3)),ty=d[i][1]-(p0[1]*(b0+b1)+p3[1]*(b2+b3));X0+=a1x*tx+a1y*ty;X1+=a2x*tx+a2y*ty;}
  const det=C00*C11-C01*C01,seg=Math.hypot(p3[0]-p0[0],p3[1]-p0[1]);let al1,al2;
  if(Math.abs(det)>1e-9){al1=(X0*C11-X1*C01)/det;al2=(C00*X1-C01*X0)/det;}else al1=al2=0;
  if(!(al1>1e-6*seg)||!(al2>1e-6*seg)||al1>seg*2||al2>seg*2){al1=al2=seg/3;}
  return [p0,[p0[0]+t1[0]*al1,p0[1]+t1[1]*al1],[p3[0]+t2[0]*al2,p3[1]+t2[1]*al2],p3];}
function kReparam(d,u,c){return u.map((s,i)=>{const q=kBez(c,s),q1=kBez1(c,s),q2=kBez2(c,s),dx=q[0]-d[i][0],dy=q[1]-d[i][1];
  const num=dx*q1[0]+dy*q1[1],den=q1[0]*q1[0]+q1[1]*q1[1]+dx*q2[0]+dy*q2[1];return den===0?s:Math.max(0,Math.min(1,s-num/den));});}
function kFitCubic(d,t1,t2,err,out){const n=d.length;
  if(n===2){const seg=Math.hypot(d[1][0]-d[0][0],d[1][1]-d[0][1])/3;out.push([d[0],[d[0][0]+t1[0]*seg,d[0][1]+t1[1]*seg],[d[1][0]+t2[0]*seg,d[1][1]+t2[1]*seg],d[1]]);return;}
  let u=[0];for(let i=1;i<n;i++)u.push(u[i-1]+Math.hypot(d[i][0]-d[i-1][0],d[i][1]-d[i-1][1]));const T=u[n-1]||1;u=u.map(x=>x/T);
  let c=kGenBez(d,u,t1,t2),mx=0,sp=Math.floor(n/2);
  const me=()=>{mx=0;sp=Math.floor(n/2);for(let i=1;i<n-1;i++){const q=kBez(c,u[i]),e=(q[0]-d[i][0])**2+(q[1]-d[i][1])**2;if(e>=mx){mx=e;sp=i;}}};
  me();if(mx<err*err){out.push(c);return;}
  if(mx<err*err*16){for(let it=0;it<4;it++){u=kReparam(d,u,c);c=kGenBez(d,u,t1,t2);me();if(mx<err*err){out.push(c);return;}}}
  if(sp<1)sp=1;if(sp>n-2)sp=n-2;
  const a=d[sp-1],b=d[sp+1];let tc=[a[0]-b[0],a[1]-b[1]];const l=Math.hypot(tc[0],tc[1])||1;tc=[tc[0]/l,tc[1]/l];
  kFitCubic(d.slice(0,sp+1),t1,tc,err,out);kFitCubic(d.slice(sp),[-tc[0],-tc[1]],t2,err,out);}
/* замкнутый контур -> узлы {x,y,a,b}; разбиение по экстремумам x/y с осевыми касательными */
function kFitLoop(P,err){const n=P.length;
  let ex=[];const pick=(f)=>{let b=0;for(let i=1;i<n;i++)if(f(P[i])<f(P[b]))b=i;return b;};
  ex=[pick(p=>p[0]),pick(p=>-p[0]),pick(p=>p[1]),pick(p=>-p[1])];ex=[...new Set(ex)].sort((a,b)=>a-b);
  const tang=(i)=>{const m=3,a=P[(i-m+n)%n],b=P[(i+m)%n];let t=[b[0]-a[0],b[1]-a[1]];const l=Math.hypot(t[0],t[1])||1;t=[t[0]/l,t[1]/l];
    if(Math.abs(t[0])<0.2)t=[0,Math.sign(t[1])||1];else if(Math.abs(t[1])<0.2)t=[Math.sign(t[0])||1,0];return t;};
  const segs=[];
  for(let q=0;q<ex.length;q++){const a=ex[q],b=ex[(q+1)%ex.length];const d=[];let i=a;while(true){d.push(P[i]);if(i===b&&d.length>1)break;i=(i+1)%n;if(d.length>n+1)break;}
    if(d.length<2)continue;if(ex.length===1)d.push(P[a]);
    const ta=tang(a),tb=tang(b);kFitCubic(d,ta,[-tb[0],-tb[1]],err,segs);}
  /* узлы */
  const m=segs.length,nodes=[];
  for(let i=0;i<m;i++){const s=segs[i],pr=segs[(i+m-1)%m];nodes.push({x:s[0][0],y:s[0][1],a:{x:pr[2][0],y:pr[2][1]},b:{x:s[1][0],y:s[1][1]}});}
  return nodes;}
/* ---------- построение знака: штрихи -> радиусы -> поле -> контур -> Безье; капли и подтёки ---------- */
const kPool=(y,X)=>{const g=1-y/(0.55*X);return g<=0?0:Math.pow(Math.min(1,g),1.3);};
function kPrepare(specs,P){
  const R=P.R,m=P.m;const strokes=[];
  for(const sp of specs){const o=Array.isArray(sp)?{p:sp}:sp;let pts=o.p.map(q=>[q[0],q[1]]);
    const w=o.w||1,r0=R*w;if(pts.length===1)pts.push([pts[0][0]+0.01,pts[0][1]]);
    strokes.push({orig:pts,o,r0,closed:!!o.c,dot:!!o.dot});}
  strokes.forEach((s,si)=>{
    const ds=Math.max(7,Math.min(15,s.r0*0.4));s.p=kResample(s.orig,ds);let n=s.p.length;
    /* концы: свободные получают каплю-утолщение */
    s.free=[false,false];
    if(!s.closed){for(let e=0;e<2;e++){const E=e?s.p[n-1]:s.p[0];let j=false;if(s.o.nb&&s.o.nb[e])j=true;
      if(!j)for(let q=0;q<strokes.length;q++){if(q===si)continue;if(kDistPoly(E[0],E[1],strokes[q].orig)<0.8*Math.max(s.r0,strokes[q].r0)){j=true;break;}}
      s.free[e]=!j;}}
    if(s.dot){s.free=[false,false];}
    if(P.trim>0&&!s.closed&&!s.dot&&n>5){const tl=P.trim*s.r0;let a=0,z=n-1,acc=0;
      if(s.free[0]){while(a<n-4&&acc<tl){acc+=Math.hypot(s.p[a+1][0]-s.p[a][0],s.p[a+1][1]-s.p[a][1]);a++;}}
      acc=0;if(s.free[1]){while(z>a+3&&acc<tl){acc+=Math.hypot(s.p[z][0]-s.p[z-1][0],s.p[z][1]-s.p[z-1][1]);z--;}}
      s.p=s.p.slice(a,z+1);n=s.p.length;}
    s.capE=[0,0];
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0];let c=1e9;
      for(let q=0;q<strokes.length;q++){if(q===si)continue;c=Math.min(c,kDistPoly(E[0],E[1],strokes[q].orig)-strokes[q].r0*0.9-0.2*s.r0-P.k*0.35);}
      s.capE[e]=c;}
    const L=[0];for(let i=1;i<n;i++)L.push(L[i-1]+Math.hypot(s.p[i][0]-s.p[i-1][0],s.p[i][1]-s.p[i-1][1]));s.L=L;const T=L[n-1];
    const neck=(!s.dot&&!s.closed&&T>5*s.r0)?(0.03+0.09*P.m):0;
    s.r=s.p.map((q,i)=>{let r=s.r0*(1+P.pm*kPool(q[1],P.X))*(1-neck*Math.sin(Math.PI*L[i]/T));
      if(s.dot)return s.r0*P.dotK;
      const Lb=Math.max(2.0*s.r0,26);
      for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],sd=e?T-L[i]:L[i];if(sd<Lb){const low=E[1]<0.32*P.X;const want=s.r0*(1+P.bm*(low?1.3:1)*kSS(0,1,1-sd/Lb));r=Math.max(r,Math.min(want,Math.max(s.r0,s.capE[e])));}}
      return r;});
  });
  return strokes;}
/* полигон (замкнутая ломаная) внутри? */
function kInPoly(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function kLoopsClean(iso,P){const {loops,v,nx,ny,x0,y0,h}=iso;const out=[];
  for(const L0 of loops){const L=kSmooth(L0,1),ar=kArea(L);if(Math.abs(ar)<300)continue;
    let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;for(const q of L){bx0=Math.min(bx0,q[0]);bx1=Math.max(bx1,q[0]);by0=Math.min(by0,q[1]);by1=Math.max(by1,q[1]);}
    /* глубина: максимум |v| внутри (для дыр v>0, для островов v<0) */
    let dep=0;const hole=ar<0;
    for(let j=Math.max(0,Math.floor((by0-y0)/h));j<=Math.min(ny-1,Math.ceil((by1-y0)/h));j++)for(let i=Math.max(0,Math.floor((bx0-x0)/h));i<=Math.min(nx-1,Math.ceil((bx1-x0)/h));i++){
      const val=v[j*nx+i];if(hole?val>0:val<0){const a=Math.abs(val);if(a>dep&&kInPoly(x0+i*h,y0+j*h,L))dep=a;}}
    if(hole?dep<P.holeMin:(dep<P.islMin||Math.abs(ar)<P.islArea))continue;
    out.push({L,hole,ar,dep});}
  return out;}
function kBuild(specs,P,key){P.key=key;
  const strokes=kPrepare(specs,P);const rng=kRng(kHash(key)^(P.seed||0));
  /* планирование подтёков: добавляют штрихи */
  const plan=kPlanDrips(strokes,P,rng);
  const all=strokes.concat(plan.drips);
  const seedN=(kHash(key)^((P.seed||0)*7919))|0,nz=kNoise(seedN);
  const sy=P.sy;
  const fldW=kMakeField(all.map(s=>({p:s.p.map(q=>[q[0],q[1]*sy]),r:s.r})),P.k,nz,P.nA);
  const fld={f:(x,y)=>fldW.f(x,y*sy),bb:fldW.bb};
  const iso=kIso(fldW.f,fldW.bb,P.h);
  const cl=kLoopsClean(iso,P);
  if(sy!==1)for(const c of cl){c.L=c.L.map(q=>[q[0],q[1]/sy]);}
  const contours=[];const polys=[];
  for(const c of cl){let nodes=kFitLoop(c.L,P.err);
    for(const e of [0.6,0.3]){if(!kSelfX(kFlatN(nodes)))break;nodes=kFitLoop(c.L,e);}if(nodes.length<3)continue;contours.push({hole:c.hole,nodes,ar:c.ar});polys.push(c.L);}
  const sats=kPlaceSats(strokes,plan,polys,P,rng,fld);
  for(const s of sats){const nodes=kFitLoop(s.poly,0.8);contours.push({hole:false,nodes,ar:kArea(s.poly),sat:true});}
  return {contours,meta:{sats:sats.length,drips:plan.drips.length/2,loops:cl.length}};}
/* ---------- подтёки (шея + бусина) ---------- */
function kPlanDrips(strokes,P,rng){const q=P.q,X=P.X,drips=[],anch=[];const noBot=/[CcСсSsЭэOoОоQGgЄє0@&8°©%•·]/.test(P.key||'');
  strokes.forEach(s=>{if(s.dot)return;const n=s.p.length;
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],F=e?s.p[n-3<0?0:n-3]:s.p[Math.min(2,n-1)];let dx=E[0]-F[0],dy=E[1]-F[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
      const rr=s.r[e?n-1:0];if((dy<-0.35||E[1]<0.3*X)&&E[1]-rr<=0.3*rr+6)anch.push({x:E[0],y:E[1],r:rr,dx,dy,kind:'end'});}
    /* низ округлых форм и нижние перекладины */
    let mi=0;for(let i=1;i<n;i++)if(s.p[i][1]<s.p[mi][1])mi=i;
    const yb=s.p[mi][1];if(!noBot&&yb<0.28*X&&yb-s.r[mi]<=0.3*s.r[mi]+6&&mi>0&&mi<n-1)anch.push({x:s.p[mi][0],y:yb,r:s.r[mi],dx:0,dy:-1,kind:'bot'});
    const T=s.L[n-1];let ymin=1e9,ymax=-1e9;for(const p of s.p){ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);}
  });
  /* перемешивание детерминированно */
  if(noBot){for(let i=anch.length-1;i>=0;i--)if(anch[i].y<0.35*X)anch.splice(i,1);}
  for(let i=anch.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[anch[i],anch[j]]=[anch[j],anch[i]];}
  const gate=(q<0.15?rng()<0.12:rng()<0.25+0.6*q);const maxD=(q<0.05||!gate)?0:1+(q>0.7&&rng()<0.5?1:0),pa=0.5+0.5*q;let nd=0;const placed=[];
  for(const a of anch){if(nd>=maxD)break;const u=rng();if(u>pa*(q>0.02?1:0))continue;
    {let ok=true;const rbT=Math.max(P.neckMin,0.2*P.R)*1.2+26,steps=Math.ceil((a.r+P.R*2.6)/18);
      for(let i=1;i<=steps&&ok;i++){const sy=a.y-a.r-6-i*18;
        for(const s of strokes){if(s.dot&&false)continue;const d=kDistPoly(a.x,sy,s.orig)-s.r0*1.25;if(d<rbT+P.R*0.5*(i>steps-3?1:0)+10){if(kDistPoly(a.x,sy,s.orig)<s.r0*1.25+4&&Math.hypot(a.x-a.x,sy-a.y)<a.r+14)continue;ok=false;break;}}}
      if(!ok)continue;}
    if(placed.some(p=>Math.abs(p.x-a.x)<2.2*P.R*1.4&&Math.abs(p.y-a.y)<4*P.R))continue;
    const rn=Math.max(P.neckMin,0.2*P.R*(0.9+0.4*rng())),rb=Math.max(rn*1.9,P.R*(0.34+0.4*P.m)*(0.85+0.4*rng()),P.dropMin);
    const len=a.r+Math.min(P.R*(0.5+1.5*q*rng()),q<0.4?0.12*X:0.3*X)+1.2*rb;
    const bx=a.x+(rng()-0.5)*0.15*P.R,by=Math.max(a.y-len,-P.DD+rb+2);
    drips.push({p:[[a.x,a.y-a.r*0.3],[bx,by]],r:[rn,rn],closed:false,free:[false,false],r0:rn,L:[0,len],orig:[[a.x,a.y],[bx,by]],isDrip:1});
    drips.push({p:[[bx,by],[bx+0.01,by]],r:[rb,rb],closed:false,free:[false,false],r0:rb,L:[0,0.01],orig:[[bx,by],[bx,by]],isDrip:1,bead:1});
    placed.push({x:a.x,y:a.y,bx,by,rb});nd++;}
  return {drips,anch,placed};}
/* ---------- капли-спутники ---------- */
function kPlaceSats(strokes,plan,polys,P,rng,fld){const q=P.q,X=P.X,out=[];if(q<0.3)return out;
  const cand=[];
  strokes.forEach(s=>{if(true)return;if(s.dot)return;const n=s.p.length;
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],F=e?s.p[Math.max(0,n-4)]:s.p[Math.min(3,n-1)];let dx=E[0]-F[0],dy=E[1]-F[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;cand.push({x:E[0],y:E[1],r:s.r[e?n-1:0],dx,dy});}
    let mi=0;for(let i=1;i<n;i++)if(s.p[i][1]<s.p[mi][1])mi=i;if(s.p[mi][1]<0.4*X&&mi>0&&mi<n-1)cand.push({x:s.p[mi][0],y:s.p[mi][1],r:s.r[mi],dx:0,dy:-1});});
  for(const d of plan.placed)cand.push({x:d.bx,y:d.by,r:d.rb,dx:0,dy:-1,drip:1});
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  const want=Math.min(cand.length,(rng()<0.15+0.55*q?1:0),P.maxSat);
  const gS=Math.min(P.gap,0.11*P.X);const bad=(x,y,r)=>{if(fld.f(x,y)<r+gS+P.nA)return true;for(const poly of polys){if(kDistPoly(x,y,poly.concat([poly[0]]))<r+gS)return true;}for(const o of out)if(Math.hypot(o.x-x,o.y-y)<o.r+r+P.gap*0.8)return true;
    if(y-r<-P.DD+4||y+r>P.top)return true;if(x<-P.sideMax||x>P.W+P.sideMax)return true;return false;};
  for(const c of cand){if(out.length>=want)break;
    for(let t=0;t<5;t++){const rs=Math.max(P.dropMin+2,Math.min(c.r*0.8,P.R*(0.16+0.5*Math.pow(rng(),1.5))*(0.8+0.6*P.m)+6));
      const ang=-Math.PI/2+(rng()-0.5)*0.12;let ux=Math.cos(ang),uy=Math.sin(ang);
      const dist=c.r+Math.min(P.gap,0.11*P.X)+rs+rng()*8+(t*3),x=c.x+ux*dist,y=c.y+uy*dist;
      if(bad(x,y,rs))continue;
      const sq=0.9+rng()*0.25,poly=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;poly.push([x+Math.cos(a)*rs*sq,y+Math.sin(a)*rs/sq]);}
      out.push({x,y,r:rs,poly:poly.reverse().reverse()});break;}}
  return out;}

function kFlatN(n){const pts=[];for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];for(let s=0;s<6;s++){const t=s/6,u=1-t;pts.push([u*u*u*a.x+3*u*u*t*a.b.x+3*u*t*t*b.a.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*a.b.y+3*u*t*t*b.a.y+t*t*t*b.y]);}}return pts;}
function kSelfX(P){const n=P.length,o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;const c=P[j],d=P[(j+1)%n];
    if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))continue;
    if(o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0)return true;}}return false;}
/* ---------- скелеты знаков (в координатах внешнего бокса: x 0..W, y 0..h; осевые линии отступают на o = R) ---------- */
const GD={};
const kE=(cx,cy,rx,ry,a0,a1)=>{const n=Math.max(2,Math.ceil(Math.abs(a1-a0)/6)),o=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return o;};
const kRP=(pts,rad)=>{const n=pts.length,out=[pts[0]];for(let i=1;i<n-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1],l1=Math.hypot(a[0]-b[0],a[1]-b[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]),t=Math.min(rad,l1*0.5,l2*0.5);
  if(t<1){out.push(b);continue;}const p1=[b[0]+(a[0]-b[0])/l1*t,b[1]+(a[1]-b[1])/l1*t],p2=[b[0]+(c[0]-b[0])/l2*t,b[1]+(c[1]-b[1])/l2*t];
  for(let s=0;s<=6;s++){const u=s/6,v=1-u;out.push([v*v*p1[0]+2*u*v*b[0]+u*u*p2[0],v*v*p1[1]+2*u*v*b[1]+u*u*p2[1]]);}}
  out.push(pts[n-1]);return out;};
const kCat=(...a)=>{const o=[];for(const s of a)for(const q of s){const l=o[o.length-1];if(l&&Math.hypot(l[0]-q[0],l[1]-q[1])<0.5)continue;o.push(q);}return o;};
function kKit(P,k){const o=P.R,W=P.W,h=k==='xh'?P.X:P.H,c=W/2,X=P.X,H=P.H,As=P.As,D=P.D;
  const K={P,o,W,h,c,X,H,As,D,rc:o*1.25,hw:0.94};
  K.E=kE;K.RP=kRP;K.cat=kCat;
  K.ring=(cx,cy,rx,ry)=>({p:kE(cx,cy,rx,ry,0,360),c:true});
  K.dot=(x,y,s)=>({p:[[x,y]],dot:true,w:s||1});
  K.ln=(x0,y0,x1,y1,w)=>({p:[[x0,y0],[x1,y1]],w:w||1});
  K.mir=(sp)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],q[1]]),nb:t.nb?[t.nb[1],t.nb[0]]:undefined});});
  K.rotc=(sp,yc)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],2*yc-q[1]])});});
  K.rot=(sp)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],h-q[1]])});});
  /* чаша справа: от (x0,yT) вправо, дуга полуэллипсом до (x0,yB) */
  K.bowl=(x0,yT,yB,xR,rxk)=>{const ry=(yT-yB)/2,rx=Math.min(xR-x0,ry*(rxk||1.0));return kCat([[x0,yT]],[[xR-rx,yT]],kE(xR-rx,(yT+yB)/2,rx,ry,90,-90),[[x0,yB]]);};
  /* арка n: левая точка (x0,cy) -> дуга -> правая стойка вниз до yb */
  return K;}
const wdf=(base,nst)=>p=>base*p.wdth/100+(nst/2)*1.15*(p.stem-76);
const gdef=(chars,k,base,nst,fn,extra)=>{for(const ch of chars)GD[ch]=Object.assign({k,w:wdf(base,nst),fn},extra||{});};
const gdefU=(low,wx,wc,nst,fn,nst2)=>{gdef(low,'xh',wx,nst,fn);gdef(low.toUpperCase(),'cap',wc,nst2==null?nst:nst2,fn);};
/* ===== латиница, строчные ===== */
const arch=(K,x0,x1,cy,yb)=>kCat(kE((x0+x1)/2,cy,(x1-x0)/2,Math.min((x1-x0)/2*0.95,K.h-K.o-cy),180,0),[[x1,yb]]);
const archY=(K)=>{const ry=(K.W/2-K.o)*0.92;return K.X-K.o-ry;};
GD.o={k:'xh',w:wdf(570,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
const apd=K=>(2*K.o-76)*0.28+34*K.P.m;
GD.c={k:'xh',w:wdf(520,2),fn:K=>[{p:kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,40+apd(K),320-apd(K))}]};
GD.e={k:'xh',w:wdf(560,2),fn:K=>[{p:[[K.o,K.h*0.5],[K.W-K.o,K.h*0.5]],w:K.hw},{p:kE(K.c,K.h/2,K.c-K.o,K.h/2-K.o,0,360-(36+apd(K)*1.4))}]};
const ringStem=(K,right,top,bot)=>[K.ring(K.c,K.X/2,K.c-K.o,K.X/2-K.o),K.ln(right?K.W-K.o:K.o,top,right?K.W-K.o:K.o,bot)];
GD.a={k:'xh',w:wdf(560,2),fn:K=>ringStem(K,true,K.X-K.o,K.o)};
GD.d={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,true,K.As-K.o,K.o)};
GD.b={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,false,K.As-K.o,K.o)};
GD.p={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,false,K.X-K.o,-K.D+K.o)};
GD.q={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,true,K.X-K.o,-K.D+K.o)};
GD.g={k:'xh',w:wdf(570,2),fn:K=>{const rh=Math.max(24,Math.min((K.W-2*K.o)*0.5,(K.D-2*K.o-24)/2)),by=-K.D+K.o;
  return [K.ring(K.c,K.X/2,K.c-K.o,K.X/2-K.o),{p:kCat([[K.W-K.o,K.X-K.o]],[[K.W-K.o,by+rh]],kE(K.W-K.o-rh,by+rh,rh,rh,0,-165))}];}};
GD.n={k:'xh',w:wdf(540,2),fn:K=>{const cy=archY(K);return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:arch(K,K.o,K.W-K.o,cy,K.o)}];}};
GD.h={k:'xh',w:wdf(540,2),fn:K=>{const cy=archY(K);return [K.ln(K.o,K.As-K.o,K.o,K.o),{p:arch(K,K.o,K.W-K.o,cy,K.o)}];}};
GD.m={k:'xh',w:wdf(830,3),fn:K=>{const ry=(K.W/4-K.o)*0.95,cy=K.X-K.o-ry,x1=K.W/2;return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:arch(K,K.o,x1,cy,K.o)},{p:arch(K,x1,K.W-K.o,cy,K.o)}];}};
GD.u={k:'xh',w:wdf(540,2),fn:K=>{const ry=(K.W/2-K.o)*0.92,cy=K.o+ry;return [{p:kCat([[K.o,K.X-K.o]],kE(K.c,cy,K.c-K.o,ry,180,360))},K.ln(K.W-K.o,K.X-K.o,K.W-K.o,K.o)];}};
GD.r={k:'xh',w:wdf(400,1.4),fn:K=>{const ww=K.W,ry=(ww*1.25-K.o)*0.5,cy=K.X-K.o-ry;return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:kE(K.o+ry*1.15,cy,ry*1.15,ry,180,50)}];}};
const wi=p=>p.stem*1.25+60;
GD.i={k:'xh',w:wi,fn:K=>[K.ln(K.c,K.X-K.o,K.c,K.o),K.dot(K.c,K.X+K.P.gDot+K.o*K.P.dotK,1)]};
GD.l={k:'xh',w:wi,fn:K=>[K.ln(K.c,K.As-K.o,K.c,K.o)]};
GD.j={k:'xh',w:p=>wi(p)+120,fn:K=>{const rh=Math.max(24,Math.min(K.W*0.34,(K.D-2*K.o-24)/2)),by=-K.D+K.o,xs=K.W-K.o-0;return [{p:kCat([[xs,K.X-K.o]],[[xs,by+rh]],kE(xs-rh,by+rh,rh,rh,0,-140))},K.dot(xs,K.X+K.P.gDot+K.o*K.P.dotK,1)];}};
GD.t={k:'xh',w:wdf(400,1.5),fn:K=>{const xs=K.W*0.42,Tt=K.X*1.26,rt=Math.min(K.W-xs-K.o,K.X*0.3);
  return [{p:kCat([[xs,Tt-K.o]],[[xs,K.o+rt]],kE(xs+rt,K.o+rt,rt,rt,180,300))},{p:[[K.o,K.X-K.o],[K.W-K.o,K.X-K.o]],w:K.hw}];}};
GD.f={k:'xh',w:wdf(400,1.5),fn:K=>{const xs=K.W*0.42,Tt=K.As,rf=Math.min(K.W-xs-K.o,K.X*0.30);
  return [{p:kCat([[xs,K.o]],[[xs,Tt-K.o-rf]],kE(xs+rf,Tt-K.o-rf,rf,rf,180,70))},{p:[[K.o,K.X-K.o],[xs+(K.W-K.o-xs)*0.5,K.X-K.o]],w:K.hw}];}};
GD.k={k:'xh',w:wdf(520,1.6),fn:K=>{const ym=K.X*0.40,x1=K.W-K.o,ya=K.X-K.o,t=0.40,jx=K.o+(x1-K.o)*t,jy=ym+(ya-ym)*t;
  return [K.ln(K.o,K.As-K.o,K.o,K.o),K.ln(K.o,ym,x1,ya),K.ln(jx,jy,x1,K.o)];}};
const sPath=(K,x0,x1,y0,y1)=>{const hs=y1-y0,ru=hs*0.245,rl=hs*0.255,cx=(x0+x1)/2,rx=(x1-x0)/2;
  const t=Math.max(0,Math.min(1.3,(2*K.o-134)/81)),a=22*t;
  return {p:kCat(kE(cx+rx*0.02,y1-ru,rx,ru,28+a,270),kE(cx-rx*0.02,y0+rl,rx,rl,90,-152+a))};};
GD.s={k:'xh',w:wdf(480,3.2),fn:K=>[sPath(K,K.o,K.W-K.o,K.o,K.h-K.o)]};
GD.v={k:'xh',w:wdf(560,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.o],[K.W-K.o,K.h-K.o]],K.o*1.6)}]};
GD.w={k:'xh',w:wdf(820,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W*0.26,K.o],[K.c,K.h*0.66],[K.W*0.74,K.o],[K.W-K.o,K.h-K.o]],K.o*1.4)}]};
GD.x={k:'xh',w:wdf(540,2),fn:K=>[K.ln(K.o,K.h-K.o,K.W-K.o,K.o),K.ln(K.W-K.o,K.h-K.o,K.o,K.o)]};
GD.y={k:'xh',w:wdf(560,2),fn:K=>{const x2=K.W*0.22,y2=-K.D+K.o,x1=K.W-K.o,ya=K.X-K.o,t=(K.o+30-ya)/(y2-ya),jx=x1+(x2-x1)*t;
  return [K.ln(K.o,ya,jx,K.o+30),K.ln(x1,ya,x2,y2)];}};
GD.z={k:'xh',w:wdf(500,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3),w:1}]};
/* ===== прописные ===== */
GD.A={k:'cap',w:wdf(700,2.2),fn:K=>{const yb=K.h*0.30,t=(yb-K.o)/(K.h-2*K.o),xl=K.o+(K.c-K.o)*t,xr=K.W-xl;
  return [{p:kRP([[K.o,K.o],[K.c,K.h-K.o],[K.W-K.o,K.o]],K.o*1.4)},{p:[[xl,yb],[xr,yb]],w:K.hw}];}};
const bowlSt=(K,yT,yB,xR,rxk)=>({p:K.bowl(K.o,yT,yB,xR,rxk)});
GD.B={k:'cap',w:wdf(600,2),fn:K=>{const ym=K.h*0.535;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,ym,K.W-K.o*1.0-8,1.0),bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD.C={k:'cap',w:wdf(620,2),fn:K=>[{p:kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,40+apd(K),320-apd(K))}]};
GD.D={k:'cap',w:wdf(640,2),fn:K=>{const rx=Math.min(K.W*0.55,K.h/2-K.o);return [K.ln(K.o,K.o,K.o,K.h-K.o),{p:kCat([[K.o,K.h-K.o]],[[K.W-K.o-rx,K.h-K.o]],kE(K.W-K.o-rx,K.h/2,rx,K.h/2-K.o,90,-90),[[K.o,K.o]])}];}};
GD.E={k:'cap',w:wdf(520,1.6),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},{p:[[K.o,K.h*0.5],[K.W-K.o*1.0-K.W*0.1,K.h*0.5]],w:K.hw},{p:[[K.o,K.o],[K.W-K.o,K.o]],w:K.hw}]};
GD.F={k:'cap',w:wdf(500,1.6),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},{p:[[K.o,K.h*0.5],[K.W-K.o-K.W*0.1,K.h*0.5]],w:K.hw}]};
GD.G={k:'cap',w:wdf(660,2),fn:K=>[{p:kCat(kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,46+apd(K)*1.6,360),[[K.c+K.o*0.1,K.h/2]])}]};
GD.H={k:'cap',w:wdf(640,2),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),K.ln(K.W-K.o,K.o,K.W-K.o,K.h-K.o),{p:[[K.o,K.h*0.5],[K.W-K.o,K.h*0.5]],w:K.hw}]};
GD.I={k:'cap',w:wi,fn:K=>[K.ln(K.c,K.o,K.c,K.h-K.o)]};
GD.J={k:'cap',w:wdf(440,1.4),fn:K=>{const rj=Math.min((K.W-2*K.o)*0.7,K.h*0.25),xs=K.W-K.o;return [{p:kCat([[xs,K.h-K.o]],[[xs,K.o+rj]],kE(xs-rj,K.o+rj,rj,rj,0,-165))}];}};
GD.K={k:'cap',w:wdf(600,1.6),fn:K=>{const ym=K.h*0.40,x1=K.W-K.o,ya=K.h-K.o,t=0.42,jx=K.o+(x1-K.o)*t,jy=ym+(ya-ym)*t;
  return [K.ln(K.o,K.o,K.o,K.h-K.o),K.ln(K.o,ym,x1,ya),K.ln(jx,jy,x1,K.o)];}};
GD.L={k:'cap',w:wdf(480,1.4),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
GD.M={k:'cap',w:wdf(840,4.6),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.c,K.h*0.30],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
GD.N={k:'cap',w:wdf(660,2),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.o],[K.W-K.o,K.h-K.o]],K.o*1.3)}]};
GD.O={k:'cap',w:wdf(700,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
GD.P={k:'cap',w:wdf(560,2),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,K.h*0.40,K.W-K.o,1.0)]};
GD.Q={k:'cap',w:wdf(700,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o),K.ln(K.c+K.W*0.12,K.h*0.26,K.W-K.o*0.6,-K.D*0.55)]};
GD.R={k:'cap',w:wdf(600,2),fn:K=>{const ym=K.h*0.42;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,ym,K.W-K.o,1.0),K.ln(K.c*0.8,ym,K.W-K.o,K.o)];}};
GD.S={k:'cap',w:wdf(560,3),fn:K=>[sPath(K,K.o,K.W-K.o,K.o,K.h-K.o)]};
GD.T={k:'cap',w:wdf(580,1.6),fn:K=>[{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD.U={k:'cap',w:wdf(640,2),fn:K=>{const ry=(K.W/2-K.o)*0.95,cy=K.o+ry;return [{p:kCat([[K.o,K.h-K.o]],kE(K.c,cy,K.c-K.o,ry,180,360),[[K.W-K.o,K.h-K.o]])}];}};
GD.V={k:'cap',w:wdf(640,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.o],[K.W-K.o,K.h-K.o]],K.o*1.6)}]};
GD.W={k:'cap',w:wdf(960,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W*0.26,K.o],[K.c,K.h*0.70],[K.W*0.74,K.o],[K.W-K.o,K.h-K.o]],K.o*1.4)}]};
GD.X={k:'cap',w:wdf(620,2),fn:K=>[K.ln(K.o,K.h-K.o,K.W-K.o,K.o),K.ln(K.W-K.o,K.h-K.o,K.o,K.o)]};
GD.Y={k:'cap',w:wdf(620,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.h*0.42],[K.W-K.o,K.h-K.o]],K.o*1.3)},K.ln(K.c,K.h*0.42,K.c,K.o)]};
GD.Z={k:'cap',w:wdf(560,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
/* ===== кириллица (прописные; строчные — те же построения на высоте x, где форма капительная) ===== */
const sq=(K)=>K.o*1.3;
GD['Б']={k:'cap',w:wdf(560,2),fn:K=>{const ym=K.h*0.56;return [K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD['Г']={k:'cap',w:wdf(470,1.6),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],sq(K))}]};
GD['Д']={k:'cap',w:wdf(700,2.2),fn:K=>{const yb=K.h*0.17,x1=K.W*0.20,x2=K.W-x1,dy=-K.D*0.55;
  return [{p:kRP([[x1,yb],[x1,K.h-K.o],[x2,K.h-K.o],[x2,yb]],sq(K))},{p:[[K.o,yb],[K.W-K.o,yb]],w:K.hw},K.ln(K.o,yb,K.o,dy),K.ln(K.W-K.o,yb,K.W-K.o,dy)];}};
GD['Ж']={k:'cap',w:wdf(920,3),fn:K=>{const ym=K.h*0.5;return [K.ln(K.c,K.o,K.c,K.h-K.o),{p:kRP([[K.o,K.h-K.o],[K.c,ym],[K.o,K.o]],K.o*0.8),nb:[0,0]},{p:kRP([[K.W-K.o,K.h-K.o],[K.c,ym],[K.W-K.o,K.o]],K.o*0.8)}];}};
GD['З']={k:'cap',w:wdf(560,2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.235,rl=hs*0.265,rx=K.c-K.o,cx=K.c,ym=K.o+2*rl;
  return [{p:kCat(kE(cx,K.h-K.o-ru,rx*0.95,ru,140,-90),[[cx-rx*0.35,ym]])},{p:kCat([[cx-rx*0.35,ym]],kE(cx,K.o+rl,rx,rl,90,-140))}];}};
GD['И']={k:'cap',w:wdf(660,3.4),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['Й']={k:'cap',w:wdf(660,2),fn:K=>{const by=K.h+K.P.gBreve+K.o*0.0,ry=K.W*0.11,rx=K.W*0.20;return [...GD['И'].fn(K),{p:kE(K.c,by+K.o+ry,rx,ry,205,335)}];}};
GD['Л']={k:'cap',w:wdf(660,2),fn:K=>[{p:kRP([[K.o,K.o],[K.W*0.32,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['П']={k:'cap',w:wdf(640,2),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['Ф']={k:'cap',w:wdf(760,2.4),fn:K=>{const ry=K.h*0.32,rx=K.c-K.o*1.4;return [K.ring(K.c,K.h/2,rx,ry),K.ln(K.c,K.h-K.o,K.c,K.o)];}};
GD['Ц']={k:'cap',w:wdf(680,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],sq(K))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,-K.D*0.55)]};
GD['Ч']={k:'cap',w:wdf(600,2),fn:K=>{const ym1=K.h*0.58,ry1=K.h*0.20;return [{p:kCat([[K.o,K.h-K.o]],[[K.o,ym1]],kE(K.c,ym1,K.c-K.o,ry1,180,360))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,K.o)];}};
GD['Ш']={k:'cap',w:wdf(940,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o],[K.W-K.o,K.h-K.o]],sq(K))},K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD['Щ']={k:'cap',w:wdf(980,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],sq(K))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,-K.D*0.55),K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD['Ъ']={k:'cap',w:wdf(680,2),fn:K=>{const x1=K.W*0.30,ym=K.h*0.60;return [K.ln(x1,K.o,x1,K.h-K.o),{p:[[K.o,K.h-K.o],[x1,K.h-K.o]],w:K.hw},{p:K.bowl(x1,ym,K.o,K.W-K.o,1.05)}];}};
GD['Ь']={k:'cap',w:wdf(560,2),fn:K=>{const ym=K.h*0.60;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD['Ы']={k:'cap',w:wdf(840,6),fn:K=>{const ym=K.h*0.60,xr=K.W-K.o,xb=K.W*0.58;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,ym,K.o,xb,1.05),K.ln(xr,K.o,xr,K.h-K.o)];}};
GD['Э']={k:'cap',w:wdf(580,2),fn:K=>[{p:kE(K.c-K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,140-apd(K),-140+apd(K))},{p:[[K.c+K.o*1.2,K.h/2],[K.W-K.o,K.h/2]],w:K.hw,nb:[0,1]}]};
GD['Ю']={k:'cap',w:wdf(900,3),fn:K=>{const x1=K.o,xo=K.W*0.36,cx=(xo+K.W)/2,rx=(K.W-xo)/2-K.o;return [K.ln(x1,K.o,x1,K.h-K.o),{p:[[x1,K.h/2],[xo+K.o,K.h/2]],w:K.hw},K.ring(cx,K.h/2,rx,K.h/2-K.o)];}};
GD['Я']={k:'cap',w:wdf(600,2),fn:K=>K.mir(GD.R.fn(K))};
GD['Ё']={k:'cap',w:wdf(520,1.6),fn:K=>{const y=K.h+K.P.gDot+K.o*K.P.dotK;return [...GD.E.fn(K),K.dot(K.W*0.24,y,1),K.dot(K.W*0.76,y,1)];}};
/* ===== цифры ===== */
GD['0']={k:'cap',w:wdf(560,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
GD['1']={k:'cap',w:wdf(400,1.4),fn:K=>{const x=K.W*0.62;return [K.ln(x,K.o,x,K.h-K.o),K.ln(x,K.h-K.o,K.o+4,K.h*0.78)];}};
GD['2']={k:'cap',w:wdf(540,2),fn:K=>{const ru=(K.h-2*K.o)*0.28,cy=K.h-K.o-ru;return [{p:kCat(kE(K.c,cy,K.c-K.o,ru,165,-40),[[K.o,K.o]],[[K.W-K.o,K.o]])}];}};
GD['3']={k:'cap',w:wdf(560,2),fn:GD['З'].fn};
GD['4']={k:'cap',w:wdf(600,2),fn:K=>{const x=K.W*0.70,yb=K.h*0.30;return [{p:kRP([[x,K.o],[x,K.h-K.o],[K.o,yb],[K.W-K.o,yb]],sq(K)*0.7)}];}};
GD['5']={k:'cap',w:wdf(540,2),fn:K=>{const yb=K.h*0.50,rb=(yb-K.o)/2*1.0;return [{p:kRP([[K.W-K.o,K.h-K.o],[K.o+K.W*0.08,K.h-K.o],[K.o+K.W*0.05,yb+K.o*0.4]],sq(K)*0.8)},{p:kCat([[K.o+K.W*0.05,yb+K.o*0.4]],kE(K.c-K.o*0.3,K.o+(yb+K.o*0.4-K.o)/2*1.0,K.c-K.o*0.7,(yb+K.o*0.4-K.o)/2,100,-150))}];}};
GD['6']={k:'cap',w:wdf(600,2),fn:K=>{const t=Math.max(0,Math.min(1,(2*K.o-100)/115)),ry=K.h*(K.P.k6r||0.27-0.065*t),cy=K.o+ry,xT=K.W*(0.74-0.08*t);return [K.ring(K.c,cy,K.c-K.o,ry),{p:kE(xT,cy,xT-K.o,K.h-K.o-cy,180,100)}];}};
GD['7']={k:'cap',w:wdf(520,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W*0.34,K.o]],sq(K))}]};
GD['8']={k:'cap',w:wdf(560,2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.235,rl=hs*0.265;return [K.ring(K.c,K.h-K.o-ru,K.c-K.o*1.5,ru),K.ring(K.c,K.o+rl,K.c-K.o,rl)];}};
GD['9']={k:'cap',w:wdf(560,2),fn:K=>K.rot(GD['6'].fn(K))};
/* ===== знаки ===== */
const dotW=p=>p.stem*1.25+50;
GD['.']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1)]};
GD[',']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1),K.ln(K.c,K.o*K.P.dotK,K.c-K.o*0.7,-K.o*2.4,0.75)]};
GD[':']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1),K.dot(K.c,K.X-K.o*K.P.dotK,1)]};
GD[';']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.X-K.o*K.P.dotK,1),K.dot(K.c,K.o*K.P.dotK,1),K.ln(K.c,K.o*K.P.dotK,K.c-K.o*0.7,-K.o*2.4,0.75)]};
const yDotTop=K=>Math.max(K.h*0.30,3*K.o+K.P.gDot+K.o*K.P.bm);
GD['!']={k:'cap',w:dotW,fn:K=>[K.ln(K.c,K.h-K.o,K.c,yDotTop(K)),K.dot(K.c,K.o*K.P.dotK,1)]};
GD['?']={k:'cap',w:wdf(480,1.8),fn:K=>{const ru=(K.h-2*K.o)*0.27,cy=K.h-K.o-ru,xs=K.c;return [{p:kCat(kE(K.c,cy,K.c-K.o,ru,170,-55),[[xs,cy-ru*1.0]],[[xs,Math.min(yDotTop(K),cy-ru*1.0-10)]])},K.dot(K.c,K.o*K.P.dotK,1)];}};
const qd=(K,x,y,s)=>[K.dot(x,y,1),K.ln(x,y,x-K.o*0.6,y-K.o*2.6,0.72)];
GD["'"]={k:'cap',w:dotW,fn:K=>qd(K,K.c,K.h-K.o*K.P.dotK,1)};
GD['"']={k:'cap',w:p=>dotW(p)*2.7,fn:K=>[...qd(K,K.W*0.28,K.h-K.o*K.P.dotK),...qd(K,K.W*0.72,K.h-K.o*K.P.dotK)]};
GD['’']=GD["'"];
GD['‘']={k:'cap',w:dotW,fn:K=>K.rotc(qd(K,K.c,K.h-K.o*K.P.dotK),K.h-K.o*1.9)};
GD['”']=GD['"'];
GD['“']={k:'cap',w:p=>dotW(p)*2.7,fn:K=>K.rotc([...qd(K,K.W*0.28,K.h-K.o*K.P.dotK),...qd(K,K.W*0.72,K.h-K.o*K.P.dotK)],K.h-K.o*1.9)};
GD['„']={k:'xh',w:p=>dotW(p)*2.7,fn:K=>[...qd(K,K.W*0.28,K.o*K.P.dotK),...qd(K,K.W*0.72,K.o*K.P.dotK)]};
const dash=(f)=>({k:'xh',w:p=>Math.max(260,p.stem*f),fn:K=>[{p:[[K.o,K.X*0.42],[K.W-K.o,K.X*0.42]],w:K.hw}]});
GD['-']=dash(3.0);GD['–']=dash(4.4);GD['—']=dash(6.2);
GD['‒']={k:'xh',w:wdf(560,2),fn:K=>[{p:[[K.o,K.X*0.42],[K.W-K.o,K.X*0.42]],w:K.hw}]};/* figure dash = digit advance */
GD['−']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>[{p:[[K.o,K.X*0.5],[K.W-K.o,K.X*0.5]],w:K.hw}]};
GD['(']={k:'cap',w:wdf(300,0.8),fn:K=>{const ry=K.h*0.56,rx=K.h*0.34;return [{p:kE(K.o+rx,K.h*0.42,rx,ry,138,222)}];}};
GD[')']={k:'cap',w:wdf(300,0.8),fn:K=>K.mir(GD['('].fn(K))};
GD['/']={k:'cap',w:wdf(420,1.4),fn:K=>[K.ln(K.o,K.o-K.D*0.0,K.W-K.o,K.h-K.o)]};
GD['…']={k:'xh',w:p=>dotW(p)*3.2,fn:K=>[0.14,0.5,0.86].map(f=>K.dot(K.W*f,K.o*K.P.dotK,1))};
const guil=(K,left)=>{const m=K.X*0.5,a=K.X*0.2,dx=K.o*0.9,o=K.o,S=[];for(let i=0;i<2;i++){const x=o+i*(K.W*0.43);S.push({p:kRP([[x+dx*2.2,m+a],[x+dx*0.3,m],[x+dx*2.2,m-a]],o*0.6)});}return left?S:K.mir(S);};
GD['«']={k:'xh',w:wdf(660,3.4),fn:K=>guil(K,true)};
GD['»']={k:'xh',w:wdf(660,3.4),fn:K=>guil(K,false)};
GD['№']={k:'cap',w:wdf(1000,3),fn:K=>{const wn=K.W*(0.50+0.14*Math.max(0,K.P.m-0.35)),xo=K.W*0.80,ro=K.h*0.17,K2=Object.assign({},K,{W:wn});return [...GD.N.fn(K2),K.ring(xo,K.h-K.o-ro,ro,ro),{p:[[xo-ro,K.o],[xo+ro,K.o]],w:0.7}];}};
GD['&']={k:'cap',w:wdf(660,2.2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.21,rl=hs*0.29,cu=K.W*0.40,cy=K.o+rl,rx=K.W*0.40;
  return [K.ring(cu,K.h-K.o-ru,ru*1.05,ru),{p:kCat(kE(K.W*0.46,cy,rx,rl,95,300),[[K.W-K.o,K.o+rl*0.5]])},K.ln(K.W-K.o,K.o,cu-ru*0.6,K.h-K.o-ru*1.8)];}};
/* ===== CS68: · © ₽ @ # % * + = \ | ° • — штрихи той же системы; жидкость сливает перекрестия сама ===== */
const rWt=(K,f)=>K.o*f;                                   /* радиус штриха при весе f (вес w у штриха — доля радиуса R) */
GD['·']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.X*0.5,1)]};   /* точка на середине x-высоты, вес точки */
GD['•']={k:'cap',w:p=>p.stem*2.0+50,fn:K=>[K.dot(K.c,K.h*0.42,1.7)]};
GD['°']={k:'cap',w:p=>p.stem*1.75+56,fn:K=>{const rr=K.o*0.5,rc=rr*2.3;return [Object.assign({p:kE(K.c,K.h-rr-rc,rc,rc,0,360),c:true},{w:0.5})];}};
/* + и =: ось минуса (середина x-высоты), плечи — штрих горизонталей */
const mathAx=K=>K.X*0.5;
GD['+']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>{const m=mathAx(K),a=Math.min(K.W/2-K.o,K.X/2-K.o*1.05);return [{p:[[K.c-a,m],[K.c+a,m]],w:K.hw},{p:[[K.c,m-a],[K.c,m+a]],w:K.hw}];}};
GD['=']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>{const m=mathAx(K),t=K.o*0.8,g=Math.min(t+Math.max(K.o*0.9,K.X*0.1),K.X/2-t-4);return [{p:[[K.o,m+g],[K.W-K.o,m+g]],w:0.8},{p:[[K.o,m-g],[K.W-K.o,m-g]],w:0.8}];}};
GD['\\']={k:'cap',w:wdf(420,1.4),fn:K=>K.mir(GD['/'].fn(K))};
GD['|']={k:'cap',w:wi,fn:K=>[K.ln(K.c,K.h-K.o,K.c,-K.D*0.45)]};
GD['*']={k:'cap',w:wdf(470,1.4),fn:K=>{const r=Math.min(K.c-K.o,K.h*0.2),cy=K.h-K.o-r*1.02,o=[];for(let i=0;i<3;i++){const a=(90+i*60)*Math.PI/180;o.push({p:[[K.c+r*Math.cos(a),cy+r*Math.sin(a)],[K.c-r*Math.cos(a),cy-r*Math.sin(a)]],w:0.85});}return o;}};
GD['#']={k:'cap',w:wdf(760,3.4),fn:K=>{const t=K.h*0.80,b=K.h*0.04+K.o*0.0,x1=K.W*0.36,x2=K.W*0.66,s=K.W*0.05,y1=K.h*0.60,y2=K.h*0.27,o=[];
  o.push({p:[[K.o,y1],[K.W-K.o,y1]],w:0.8},{p:[[K.o,y2],[K.W-K.o,y2]],w:0.8});
  o.push({p:[[x1+s,K.h-K.o*0.9],[x1-s,K.o*0.9]],w:0.8},{p:[[x2+s,K.h-K.o*0.9],[x2-s,K.o*0.9]],w:0.8});return o;}};
GD['%']={k:'cap',w:wdf(900,2.6),fn:K=>{const rr=K.o*0.55,rc=Math.max(rr*1.9,K.h*0.12),ry=rc*1.05,rw=0.55*(1+0.5*Math.max(0,K.P.m-0.5));
  return [Object.assign({p:kE(K.o+rc*0.9,K.h-rr-ry,rc,ry,0,360),c:true},{w:rw}),Object.assign({p:kE(K.W-K.o-rc*0.9,rr+ry,rc,ry,0,360),c:true},{w:rw}),{p:[[K.W-K.o*1.4,K.h-K.o*0.9],[K.o*1.4,K.o*0.9]],w:0.8}];}};
GD['©']={k:'cap',w:wdf(900,2.4),fn:K=>{const f=Math.min(1,Math.pow(134/(2*K.o),1.15)),wr=0.8*f,wc=0.62*f,rx=K.c-K.o*wr,ry=K.h/2-K.o*wr,
  gap=K.P.gDot*0.55,avail=Math.min(rx,ry)-2*K.o*wr,ri=Math.max(K.o*0.3,0.34*Math.min(rx,ry)*0+0,Math.min(0.52*Math.min(rx,ry),avail-gap-K.o*wc));
  /* W88 M: the mouth of the c arc opens wider when the pen is heavy / the liquid spreads (a closed mouth made a second hole) */
  const mo=Math.max(38,Math.min(80,Math.asin(Math.min(0.99,(K.P.gDot*0.4+2*K.o*wc)/(2*ri)))*180/Math.PI));
  return [Object.assign(K.ring(K.c,K.h/2,rx,ry),{w:wr}),Object.assign({p:kE(K.c+ri*0.12,K.h/2,ri,ri,mo,360-mo)},{w:wc})];}};
/* @ — adaptive (W88 M): the inner ring keeps a channel to the outer ring (heavy pens/melt used to split it into two holes), and the tail always reaches the outer ring (wide/tall @ left the inner ring detached: parts 1->2); defaults unchanged */
GD['@']={k:'cap',w:wdf(900,2.4),fn:K=>{const rx=K.c-K.o,ry=K.h/2-K.o,mt=K.P.m||0,ri=Math.max(K.o*0.8,Math.min(Math.min(rx,ry)*0.44,ry-1.35*K.o-K.o*(0.75+0.3*mt))),cx=K.c-ri*0.12,cy=K.h*0.5,xs=cx+ri;
  const dipA=Math.max(ri*0.25,Math.min(ri*0.7,cy-ri*0.5-(cy-ry+Math.max(1.95*K.o,1.35*K.o+40)))),tail=kCat([[xs,cy+ri*1.05]],[[xs,cy-ri*0.5]],kE(xs+ri*0.7,cy-ri*0.5,ri*0.7,dipA,180,320)),E=tail[tail.length-1],sq=1-Math.pow((E[1]-K.h/2)/ry,2),rX=K.c+rx*Math.sqrt(Math.max(0,sq));
  if(rX-E[0]>(ri<Math.min(rx,ry)*0.44-1?1.2:Math.min(2.1,1.5+2*mt))*K.o){let bd=1e9,bp=null;for(let i=0;i<120;i++){const t=i*Math.PI/60,q=[K.c+rx*Math.cos(t),K.h/2+ry*Math.sin(t)],d=Math.hypot(q[0]-E[0],q[1]-E[1]);if(d<bd){bd=d;bp=q;}}const ux=(bp[0]-E[0])/(bd||1),uy=(bp[1]-E[1])/(bd||1);tail.push([bp[0]+ux*K.o*0.4,bp[1]+uy*K.o*0.4]);}
  return [Object.assign(K.ring(K.c,K.h/2,rx,ry),{w:0.8}),Object.assign(K.ring(cx,cy,ri,ri),{w:0.55}),{p:tail,w:0.55}];}};
GD['₽']={k:'cap',w:wdf(560,2),fn:K=>{const sx=K.o+K.W*0.12,yb=Math.max(K.h*0.18,K.o*1.1),tb=K.o*0.7,gap=Math.max(K.o*0.5,K.P.gDot*0.5),yB=Math.min(K.h*0.54,yb+tb+gap+K.o),x1=K.W-K.o;
  return [K.ln(sx,K.o,sx,K.h-K.o),{p:K.bowl(sx,K.h-K.o,yB,x1,1.0)},{p:[[K.o,yb],[sx+(x1-sx)*0.78,yb]],w:0.7}];}};
/* кириллица строчные = капительные формы на высоте x */
const same=[['в','В'],['г','Г'],['д','Д'],['ж','Ж'],['з','З'],['и','И'],['й','Й'],['л','Л'],['п','П'],['ц','Ц'],['ч','Ч'],['ш','Ш'],['щ','Щ'],['ъ','Ъ'],['ы','Ы'],['ь','Ь'],['э','Э'],['ю','Ю'],['я','Я'],['ё','']];
GD['б']={k:'xh',w:wdf(570,2),fn:K=>[K.ring(K.c,K.o+(K.X*0.9)/2-K.o+0,K.c-K.o,(K.X*0.9)/2-K.o),K.ln(K.o,K.As-K.o,K.o,K.o),{p:kRP([[K.o,K.As-K.o],[K.W*0.62,K.As-K.o],[K.W*0.84,K.As-K.o-K.X*0.1]],K.o*1.2)}].slice(0,2).concat([{p:[[K.o,K.As-K.o],[K.W*0.80,K.As-K.o-K.X*0.08]],w:K.hw}])};
GD['ф']={k:'xh',w:wdf(700,2.2),fn:K=>[K.ring(K.c,K.X/2,K.c-K.o*1.5,K.X/2-K.o),K.ln(K.c,K.As-K.o,K.c,-K.D+K.o)]};
GD['Ё'].fn=GD['Ё'].fn;
GD['ё']={k:'xh',w:wdf(560,2),fn:K=>{const y=K.X+K.P.gDot+K.o*K.P.dotK;return [...GD.e.fn(K),K.dot(K.W*0.25,y,1),K.dot(K.W*0.75,y,1)];}};
/* ===== сборка таблицы: общие знаки латиницы/кириллицы — один и тот же объект ===== */
const kLower={'в':['B',520,'xh'],'г':['Г',420,'xh'],'д':['Д',620,'xh'],'ж':['Ж',800,'xh'],'з':['З',470,'xh'],'и':['И',560,'xh'],'й':['Й',560,'xh'],'к':['K',520,'xh'],
  'л':['Л',560,'xh'],'м':['M',700,'xh'],'н':['H',540,'xh'],'п':['П',540,'xh'],'т':['T',480,'xh'],'ц':['Ц',580,'xh'],'ч':['Ч',520,'xh'],'ш':['Ш',800,'xh'],'щ':['Щ',860,'xh'],
  'ъ':['Ъ',580,'xh'],'ы':['Ы',800,'xh'],'ь':['Ь',500,'xh'],'э':['Э',490,'xh'],'ю':['Ю',770,'xh'],'я':['Я',520,'xh']};
const kNst={'в':2,'г':1.4,'д':2,'ж':3,'з':2,'и':2,'й':2,'к':1.6,'л':2,'м':3,'н':2,'п':2,'т':1.4,'ц':2,'ч':2,'ш':3,'щ':3,'ъ':2,'ы':6,'ь':2,'э':2,'ю':3,'я':2};
const kTwinLo={'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x'},kTwinUp={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','У':'Y','Х':'X'};
for(const c in kLower){const [src,wb]=kLower[c];GD[c]={k:'xh',w:wdf(wb,kNst[c]),fn:GD[src].fn};}
const KGL={};
for(const ch of Object.keys(GD)){GD[ch].id=ch;KGL[ch]=GD[ch];}
for(const c in kTwinLo)KGL[c]=GD[kTwinLo[c]];for(const c in kTwinUp)KGL[c]=GD[kTwinUp[c]];
/* ---------- параметры -> структура P ---------- */
function kParams(p,W,k){const m=Math.max(0,Math.min(1,(p.melt==null?30:p.melt)/100)),q=Math.max(0,Math.min(1,(p.drip==null?28:p.drip)/100)),R=p.stem/2,H=p.capH,X=p.xh||Math.round(H*0.78*(1+0.05*m));
  const bm=Math.min(0.62,0.14+0.55*Math.pow(m,0.8)),it=p.slant>0?1.25:1;
  return {R,m,q,H,X,As:Math.round(H*1.03),D:Math.round(H*0.27+0.6*(p.stem-134)+70),W,pm:0.10*m,bm,dotK:1.0,
    k:16+60*Math.pow(m,1.1),nA:(2.5+0.034*H*Math.pow(m,1.3))*it,sy:1+0.4*Math.max(0,Math.min(1,(p.stem-100)/115)),h:8,err:1.3,holeMin:16,islMin:9,islArea:420,neckMin:15,dropMin:22,gap:22+0.1*p.stem,maxSat:3,sideMax:170,top:(p.asc||H*1.3)+4,DD:290,
    gDot:Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1),gBreve:Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1),seed:p.seed||0};}
const kRefH=new Map();
function kBuildOnce(ch,p,W,sc,trim){const d=KGL[ch];if(sc!==1)p=Object.assign({},p,{xh:Math.round(p.capH*0.78*(1+0.05*(p.melt/100)*sc))});const P=kParams(p,W,d.k);if(sc!==1){sc=Math.max(sc,0.04);P.k*=sc;P.nA*=sc;P.bm*=sc;P.pm*=sc;}P.trim=trim;P.sy=1+(P.sy-1)*Math.max(sc,0.5);const K=kKit(P,d.k);P.k0=d.k;return kBuild(d.fn(K),P,d.id);}
const kHoles=r=>r.contours.filter(c=>c.hole).length;
const kMains=r=>r.contours.filter(c=>!c.hole&&!c.sat).length;
function kGlyph(ch,p,Wouter){const d=KGL[ch];if(!d)return null;const W=Wouter||d.w(p);
  const rk=ch+'|'+p.capH+'|'+p.wdth;let ref=kRefH.get(rk);
  if(ref==null){const p0=Object.assign({},p,{stem:134,melt:30,drip:0,slant:0,xh:Math.round(p.capH*0.78*1.015)});const r0=kBuildOnce(ch,p0,d.w(p0),1,0);ref=[kHoles(r0),kMains(r0)];kRefH.set(rk,ref);}
  const bad=r=>Math.max(0,kHoles(r)-ref[0])*3+(kMains(r)!==ref[1]?5:0);
  let r=kBuildOnce(ch,p,W,1,0),bs=bad(r);
  if(bs>0){for(const [sc,tr] of [[0.7,0],[0.4,0],[0.15,0],[0,0],[0.7,0.3],[0.4,0.6],[0,1.0],[0,1.6]]){const r2=kBuildOnce(ch,p,W,sc,tr),b2=bad(r2);if(b2<bs){r=r2;bs=b2;}if(bs===0)break;}}
  return r;}
/* ---------- шрифт «Капля» ---------- */
const F={id:'kaplya',name:'Капля',family:'Kaplya Drop',tag:'Растекание · капли · акциденция',S0:90,GL:{},charset:'basic',
  desc:'Акцидентный шрифт из капель и растекающейся краски: чем тяжелее вес, тем сильнее растекание, тем теснее буквы, пока чёрный не станет единым пятном. Светлые начертания читаются спокойно. Пресеты — Капля, Чистая, Пятно, Дождь.',
  sample:'Капля · ability'};
F.sampleText='Растекание';
if(!PARAMS.some(r=>r[0]==='melt'))PARAMS.push(['melt','Растекание, %',0,100,1,'Растекание'],['drip','Капли, %',0,100,1,'Растекание']);
const KP=['melt','drip'];
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?"\'-–—()/&№«»‘’“”„…−·©₽@#%*+=\\|°•';
const kCache=new Map();
function kKey(ch,p,W){return [ch,p.stem,p.melt,p.drip,p.capH,p.xh,p.asc,p.slant>0?1:0,p.seed||0,Math.round(W)].join('|');}
function kCached(ch,p,W){const key=kKey(ch,p,W);let r=kCache.get(key);if(!r){r=kGlyph(ch,p,W);if(kCache.size>1500)kCache.clear();kCache.set(key,r);}return r;}
const isLt=ch=>/[A-Za-zА-Яа-яЁё0-9]/.test(ch);
for(const ch of Object.keys(KGL)){const d=KGL[ch],lt=isLt(ch);
  F.GL[ch]={shape:g=>{const r=kCached(ch,g.p,g.w);return r.contours.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));},
    w:lt?d.w:(p=>d.w(p)-0.85*(p.track||0)),k:d.k==='xh'?'xh':'cap',opt:{}};}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' '].filter(c=>F.GL[c]);
for(const c of Object.keys(F.GL))if(!F.CHARSET.includes(c))delete F.GL[c];
F.raw=(ch,p)=>kGlyph(ch,p,F.GL[ch].w(p));
const K0={wdth:100,capH:700,xh:520,asc:800,desc:300,stem:134,hair:134,melt:30,drip:28,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:34,track:-46,space:240,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,seed:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10,melt:34,space:236}};
const HID=['hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','sb','track','space','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade'];
F.params={wdth:['Ширина знаков, %',88,118,1],capH:['Высота прописных',640,760,1],stem:['Основной штрих',80,250,1],melt:['Растекание, %',0,100,1],drip:['Капли, %',0,100,1]};
for(const k of HID)F.params[k]=null;
F.methods=[
  ['Характер','Готовые системы растекания.',[
    ['Капля',{melt:30,drip:28,stem:134}],['Чистая',{melt:0,drip:0,stem:134}],['Пятно',{melt:100,drip:55,stem:215}],['Дождь',{melt:45,drip:100,stem:134}]]],
  ['Вес','Толщина штриха.',[['Светлый',{stem:100}],['Обычный',{stem:134}],['Жирный',{stem:175}],['Чёрный',{stem:215}]]],
  ['Растекание','Как расплывается краска.',[['Нет',{melt:0}],['Лёгкое',{melt:25}],['Сильное',{melt:60}],['Пятно',{melt:100}]]],
  ['Капли','Капли и подтёки.',[['Нет',{drip:0}],['Редкие',{drip:25}],['Частые',{drip:60}],['Дождь',{drip:100}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;
const ALLCH=[...lat,...latl,...cy,...cyl,...'0123456789'].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IlНH',stemFy:[0.5],stemTol:0.2,hang:true,asc:ALLCH,desc:ALLCH,descX:0,holeK:0.01,aboveBase:true,
  drops:(ch,p)=>{const q=safeP({...p,slant:0});const r=kCached(ch,q,glyphWidth(ch,q));return r.contours.filter(c=>c.sat).length;}};
/* допуски «экспериментальных» правил: контуры закрываются/сливаются по замыслу только в этих знаках и только при растекании ≥ 60 */
F.allowSlit='SsSs2G3зЗ5Ee';
F.allowClose='aeеаёzбвдзрфыьэюяЖжЗ36890&8@ВЭЭ№Фф₽©@%°';
function kLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',640,760,700);cl('wdth',88,118,100);cl('melt',0,100,30);cl('drip',0,100,28);
  const m=q.melt/100,h=q.capH;
  cl('stem',80,Math.min(250,0.31*h+0.2*(q.wdth-100)),134);q.stem=Math.round(q.stem);q.melt=Math.round(q.melt);q.drip=Math.round(q.drip);
  q.hair=q.stem;L.hair=[q.stem,q.stem];
  const xh=Math.round(h*0.78*(1+0.05*m));cl('xh',xh,xh,xh);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',100,100,100);cl('icomp',0,0,0);cl('seed',0,0,0);
  const tr=Math.round(-0.27*q.stem*Math.pow(m/0.3,0.9));cl('track',tr,tr,tr);cl('sb',34,34,34);
  const sp=Math.round(236+0.9*(-tr));cl('space',sp,sp,sp);
  const R=q.stem/2,bm=Math.min(0.62,0.14+0.55*Math.pow(m,0.8)),gd=Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1);
  const asc=Math.ceil(Math.max(h*1.03,xh+gd+2*R+8))+6;cl('asc',asc,asc,asc);
  const ds=Math.max(290,Math.round(h*0.27+0.6*(q.stem-134)+70))+6;cl('desc',ds,ds,ds);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='kaplya')return _pl(p,font);return kLim(p);};
WSCALE.kaplya=0.435;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='kaplya'){const t={Light:[100,10,8],Regular:[134,30,28],Bold:[175,58,55],Black:[215,88,80]}[wn];if(t){const k=p.stem/134;o.stem=Math.round(t[0]*Math.max(0.6,Math.min(1.4,k)));o.melt=t[1];o.drip=t[2];o.hair=o.stem;o.wdth=p.wdth;}return paramLimits(o,'kaplya').q;}
  return o;};
KERN_TABLE.kaplya=[];
FONTS.kaplya=F;
for(const id in FONTS)if(id!=='kaplya'){const f=FONTS[id];f.params=f.params||{};for(const k of KP)if(!(k in f.params))f.params[k]=null;}
})();
