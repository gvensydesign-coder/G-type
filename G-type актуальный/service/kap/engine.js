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
