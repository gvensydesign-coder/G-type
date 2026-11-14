/* ===== Трассировка картинки: растр (PNG/JPG/WEBP) → контуры знака =====
   Чистый JS без DOM: на входе серый растр, на выходе контуры {hole,nodes:[{x,y,a,b}]} высотой 1000 (низ = 0, y вверх), как у svgImport.
   Конвейер: яркость → (выравнивание освещения) → инверсия → порог (Оцу) → размытие → убрать мелочь / заполнить дырки →
   контур по линии уровня (marching squares, подпиксельный: без ступенек) → углы, прямые, кривые Безье (fitCubic из core10) с узлами в экстремумах.
   Предпросмотр гоняет trcRun порциями (генератор), тесты — trcSync. */
const TRC={MAXSIDE:1200,MAXC:800,MAXNODE:20000};
/* ---------- вход: RGBA → серый (чернила тёмные), автополярность ---------- */
function trcGrayOf(rgba,W,H){
  const n=W*H,g=new Uint8Array(n);let tr=0;
  for(let i=0;i<n;i++)if(rgba[4*i+3]<128)tr++;
  const comp=(bg)=>{for(let i=0;i<n;i++){const a=rgba[4*i+3]/255,l=0.299*rgba[4*i]+0.587*rgba[4*i+1]+0.114*rgba[4*i+2];g[i]=Math.round(l*a+bg*(1-a));}};
  comp(255);
  /* прозрачный PNG с белым знаком: на белом фоне пусто — компонуем на чёрном */
  if(tr>n*0.02){let mn=255,mx=0;for(let i=0;i<n;i+=7){if(g[i]<mn)mn=g[i];if(g[i]>mx)mx=g[i];}if(mx-mn<24){comp(0);}}
  /* автополярность: рамка кадра темнее середины — знак светлый на тёмном */
  let s=0,c=0;const bw=Math.max(1,Math.round(Math.min(W,H)*0.03));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x<bw||y<bw||x>=W-bw||y>=H-bw){s+=g[y*W+x];c++;}}
  return {g,W,H,inv:c?(s/c<110):false};}
function trcOtsu(g){
  const h=new Float64Array(256);for(let i=0;i<g.length;i++)h[g[i]]++;
  const tot=g.length;let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];
  let wb=0,sb=0,best=-1,t0=128,t1=128;
  for(let t=0;t<256;t++){wb+=h[t];if(!wb)continue;const wf=tot-wb;if(!wf)break;sb+=t*h[t];
    const mb=sb/wb,mf=(sum-sb)/wf,v=wb*wf*(mb-mf)*(mb-mf);if(v>best*(1+1e-9)){best=v;t0=t1=t;}else if(v>=best*(1-1e-9))t1=t;}
  const thr=(t0+t1)>>1;
  return thr+1;}
/* ---------- размытие (гаусс, разделимый) ---------- */
function trcBlur(src,W,H,sg){
  if(sg<0.25)return Float32Array.from(src);
  const r=Math.max(1,Math.ceil(sg*2.6)),k=new Float32Array(2*r+1);let ks=0;
  for(let i=-r;i<=r;i++){k[i+r]=Math.exp(-i*i/(2*sg*sg));ks+=k[i+r];}for(let i=0;i<k.length;i++)k[i]/=ks;
  const tmp=new Float32Array(W*H),out=new Float32Array(W*H);
  for(let y=0;y<H;y++){const o=y*W;for(let x=0;x<W;x++){let a=0;for(let d=-r;d<=r;d++){let xx=x+d;xx=xx<0?0:xx>=W?W-1:xx;a+=src[o+xx]*k[d+r];}tmp[o+x]=a;}}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let d=-r;d<=r;d++){let yy=y+d;yy=yy<0?0:yy>=H?H-1:yy;a+=tmp[yy*W+x]*k[d+r];}out[y*W+x]=a;}
  return out;}
/* ---------- выравнивание неравномерного освещения (фото листа) ---------- */
function trcFlat(g,W,H){
  const f=Math.max(1,Math.floor(Math.max(W,H)/150)),w=Math.ceil(W/f),h=Math.ceil(H/f);
  const sm=new Float32Array(w*h),cnt=new Float32Array(w*h);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const j=((y/f)|0)*w+((x/f)|0);sm[j]+=g[y*W+x];cnt[j]++;}
  for(let i=0;i<sm.length;i++)sm[i]/=cnt[i]||1;
  const r=Math.max(2,Math.round(0.3*Math.max(w,h)));
  const mx=(a,horiz)=>{const o=new Float32Array(w*h);const L=horiz?w:h,M=horiz?h:w;
    for(let m=0;m<M;m++)for(let i=0;i<L;i++){let v=0;const a0=Math.max(0,i-r),a1=Math.min(L-1,i+r);for(let q=a0;q<=a1;q++){const t=horiz?a[m*w+q]:a[q*w+m];if(t>v)v=t;}if(horiz)o[m*w+i]=v;else o[i*w+m]=v;}
    return o;};
  let bg=mx(mx(sm,true),false);
  bg=trcBlur(bg,w,h,Math.max(1,r*0.5));
  let lo=1e9,hi=-1;for(let i=0;i<bg.length;i++){if(bg[i]<lo)lo=bg[i];if(bg[i]>hi)hi=bg[i];}
  if(hi-lo<0.1*255||hi<60)return g;
  const out=new Float32Array(W*H);
  for(let y=0;y<H;y++){const fy=Math.min(h-1.001,Math.max(0,(y+0.5)/f-0.5)),y0=fy|0,ty=fy-y0;
    for(let x=0;x<W;x++){const fx=Math.min(w-1.001,Math.max(0,(x+0.5)/f-0.5)),x0=fx|0,tx=fx-x0;
      const b=(bg[y0*w+x0]*(1-tx)+bg[y0*w+x0+1]*tx)*(1-ty)+(bg[(y0+1)*w+x0]*(1-tx)+bg[(y0+1)*w+x0+1]*tx)*ty;
      const v=g[y*W+x]/Math.max(30,b)*255;out[y*W+x]=v>255?255:v;}}
  return out;}
/* подготовка одного изображения: с инверсией и без — результат кешируется вызывающим */
function trcPrepare(img,invert){
  const n=img.W*img.H;let g=new Float32Array(n);
  if(invert)for(let i=0;i<n;i++)g[i]=255-img.g[i];else for(let i=0;i<n;i++)g[i]=img.g[i];
  g=trcFlat(g,img.W,img.H);
  const u=new Uint8Array(n);for(let i=0;i<n;i++)u[i]=Math.max(0,Math.min(255,Math.round(g[i])));
  return {g,W:img.W,H:img.H,otsu:trcOtsu(u),blur:{}};}
/* ---------- связные области: мелочь и дырки ---------- */
function trcSpeck(F,W,H,thr,minArea){
  if(minArea<=0)return {n1:0,n2:0};
  const n=W*H,lab=new Uint8Array(n),st=new Int32Array(n);let n1=0,n2=0;
  const ink=i=>F[i]<thr;
  /* чернила: 8-связность; фон: 4-связность, не касающийся края — дырка */
  for(let s=0;s<n;s++){if(lab[s])continue;const isInk=ink(s);lab[s]=1;
    let sp=0,cnt=0,touch=false;st[sp++]=s;const mem=[];
    while(sp){const i=st[--sp];cnt++;mem.push(i);const x=i%W,y=(i/W)|0;
      if(x===0||y===0||x===W-1||y===H-1)touch=true;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;if(!isInk&&dx&&dy)continue;
        const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const j=yy*W+xx;if(lab[j]||ink(j)!==isInk)continue;lab[j]=1;st[sp++]=j;}}
    if(cnt<minArea){
      if(isInk){for(const i of mem)F[i]=255;n1++;}
      else if(!touch){for(const i of mem)F[i]=0;n2++;}}}
  return {n1,n2};}
/* ---------- контуры по линии уровня: ink = F < thr, чернила справа по ходу (экран, y вниз) ---------- */
function trcMarch(F,W,H,thr){
  const Wp=W+2,Hp=H+2,V=new Float32Array(Wp*Hp).fill(255);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)V[(y+1)*Wp+x+1]=F[y*W+x];
  const NE=2*Wp*Hp,nxt=new Int32Array(NE).fill(-1),ex=new Float32Array(NE),ey=new Float32Array(NE),has=new Uint8Array(NE);
  const eid=(i,j,v)=>2*(j*Wp+i)+v;
  const cross=(i,j,v)=>{const id=eid(i,j,v);if(has[id])return id;has[id]=1;
    const a=V[j*Wp+i],b=v?V[(j+1)*Wp+i]:V[j*Wp+i+1],t=(thr-a)/(b-a);
    ex[id]=(v?i:i+t)-0.5;ey[id]=(v?j+t:j)-0.5;return id;};
  /* координаты: центр пикселя (x,y) исходного растра = (x+0.5, y+0.5); сдвиг на рамку -1 */
  for(let j=0;j<Hp-1;j++)for(let i=0;i<Wp-1;i++){
    const tl=V[j*Wp+i]<thr,tr=V[j*Wp+i+1]<thr,br=V[(j+1)*Wp+i+1]<thr,bl=V[(j+1)*Wp+i]<thr;
    const m=(tl?8:0)|(tr?4:0)|(br?2:0)|(bl?1:0);if(m===0||m===15)continue;
    /* обход по периметру TL→TR→BR→BL: край чернила→фон начинает отрезок (A), фон→чернила заканчивает (B) */
    const cs=[tl,tr,br,bl],ed=[cross.bind(null,i,j,0),cross.bind(null,i+1,j,1),cross.bind(null,i,j+1,0),cross.bind(null,i,j,1)];
    const A=[],Bs=[];
    for(let k=0;k<4;k++){const s0=cs[k],s1=cs[(k+1)%4];if(s0===s1)continue;if(s0)A.push(k);else Bs.push(k);}
    if(A.length===1){nxt[ed[A[0]]()]=ed[Bs[0]]();}
    else{ /* седло: центр — чернила → A к следующему B, иначе к предыдущему */
      const c=(V[j*Wp+i]+V[j*Wp+i+1]+V[(j+1)*Wp+i+1]+V[(j+1)*Wp+i])/4<thr;
      for(const k of A){let pick=-1;
        if(c){for(let d=1;d<=3&&pick<0;d++)if(Bs.includes((k+d)%4))pick=(k+d)%4;}
        else{for(let d=1;d<=3&&pick<0;d++)if(Bs.includes((k-d+4)%4))pick=(k-d+4)%4;}
        nxt[ed[k]()]=ed[pick]();}}}
  return {nxt,ex,ey,NE};}
function trcLoops(M){
  const {nxt,ex,ey,NE}=M,seen=new Uint8Array(NE),loops=[];
  for(let s=0;s<NE;s++){if(nxt[s]<0||seen[s])continue;const P=[];let e=s,g=0;
    while(e>=0&&!seen[e]&&g++<8e6){seen[e]=1;P.push([ex[e],ey[e]]);e=nxt[e];}
    if(e===s&&P.length>=4)loops.push(P);}
  return loops;}
/* ---------- обработка одного замкнутого контура (пиксели, y вниз) ---------- */
function trcResample(P,ds){
  const n=P.length,cum=new Float64Array(n+1);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];cum[i+1]=cum[i]+Math.hypot(b[0]-a[0],b[1]-a[1]);}
  const L=cum[n],N=Math.max(8,Math.round(L/ds)),st=L/N,out=[];let k=0;
  for(let q=0;q<N;q++){const d=q*st;while(k<n-1&&cum[k+1]<d)k++;const a=P[k],b=P[(k+1)%n],seg=cum[k+1]-cum[k]||1,t=(d-cum[k])/seg;
    out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  return out;}
function trcSmooth(P,sg){
  const n=P.length;if(sg<0.35)return P.map(p=>[p[0],p[1]]);
  const r=Math.min((n>>1)-1,Math.max(1,Math.ceil(sg*2.5))),k=[];let ks=0;
  for(let i=-r;i<=r;i++){const w=Math.exp(-i*i/(2*sg*sg));k.push(w);ks+=w;}
  const out=new Array(n);
  for(let i=0;i<n;i++){let x=0,y=0;for(let d=-r;d<=r;d++){const p=P[(i+d+n*4)%n],w=k[d+r];x+=p[0]*w;y+=p[1]*w;}out[i]=[x/ks,y/ks];}
  return out;}
/* прямая по методу главных компонент: {p:[x,y], d:[dx,dy]} */
function trcLineFit(Q,a,b,n){
  let mx=0,my=0,c=0;for(let i=a;i<=b;i++){const p=Q[((i%n)+n)%n];mx+=p[0];my+=p[1];c++;}mx/=c;my/=c;
  let sxx=0,sxy=0,syy=0;for(let i=a;i<=b;i++){const p=Q[((i%n)+n)%n],dx=p[0]-mx,dy=p[1]-my;sxx+=dx*dx;sxy+=dx*dy;syy+=dy*dy;}
  const th=0.5*Math.atan2(2*sxy,sxx-syy);let d=[Math.cos(th),Math.sin(th)];
  const A=Q[((a%n)+n)%n],B=Q[((b%n)+n)%n];if(d[0]*(B[0]-A[0])+d[1]*(B[1]-A[1])<0)d=[-d[0],-d[1]];
  return {p:[mx,my],d};}
const trcProj=(l,q)=>{const t=(q[0]-l.p[0])*l.d[0]+(q[1]-l.p[1])*l.d[1];return [l.p[0]+l.d[0]*t,l.p[1]+l.d[1]*t];};
function trcIsect(l1,l2){const det=l1.d[0]*l2.d[1]-l1.d[1]*l2.d[0];if(Math.abs(det)<0.15)return null;
  const dx=l2.p[0]-l1.p[0],dy=l2.p[1]-l1.p[1],t=(dx*l2.d[1]-dy*l2.d[0])/det;return [l1.p[0]+l1.d[0]*t,l1.p[1]+l1.d[1]*t];}
/* параметры из ползунка «Гладкость» и высоты чернил */
function trcParams(Hink,smooth,ds){
  const g=Math.max(0,Math.min(1,smooth/100));
  const tol=Math.max(0.7,Hink*(0.0012+0.0065*g));
  const sf=0.2*tol+0.35,sd=0.8*tol+1;
  const w=Math.max(3,Math.round(Math.max(4,0.011*Hink,1.6*sd)/ds));
  return {g,tol,sf:sf/ds,sd:sd/ds,w,corner:34+10*g,tolL:0.8*tol+0.3,fit:0.9*tol+0.1,Lmin:Math.max(0.1*Hink,8*tol)/ds,ds};}
/* контур → узлы. P — точки линии уровня, Hink — высота чернил в пикселях */
function trcFitLoop(P0,Hink,smooth){
  const ds=Math.max(0.8,Math.min(2,Hink/600)),pa=trcParams(Hink,smooth,ds);
  const R=trcResample(P0,ds),n=R.length;if(n<10)return null;
  const Q=trcSmooth(R,pa.sf),S=trcSmooth(R,pa.sd);
  const at=(A,i)=>A[((i%n)+n)%n];
  const w=Math.min(pa.w,(n>>2)-1);if(w<2)return null;
  /* --- углы --- */
  const turn=new Float64Array(n);
  for(let i=0;i<n;i++){const a=at(S,i-w),b=at(S,i),c=at(S,i+w),ux=b[0]-a[0],uy=b[1]-a[1],vx=c[0]-b[0],vy=c[1]-b[1];
    turn[i]=Math.abs(Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy))*180/Math.PI;}
  let corners=[];
  for(let i=0;i<n;i++){if(turn[i]<pa.corner)continue;let ok=true;
    for(let d=1;d<=w&&ok;d++)if(turn[(i-d+n)%n]>=turn[i]||turn[(i+d)%n]>turn[i])ok=false;
    if(ok)corners.push(i);}
  /* равные значения подряд (плато) — оставить середину */
  {const o=[];for(const c of corners){if(o.length&&c-o[o.length-1]<=w)continue;o.push(c);}
   if(o.length>1&&o[0]+n-o[o.length-1]<=w)o.pop();corners=o;}
  /* точное положение угла — вершина по несглаженной линии */
  corners=corners.map(c=>{const A=at(Q,c-w),B=at(Q,c+w),dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1;let bi=c,bd=-1;
    for(let k=-w;k<=w;k++){const q=at(Q,c+k),d=Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L;if(d>bd){bd=d;bi=c+k;}}return ((bi%n)+n)%n;});
  corners=[...new Set(corners)].sort((p,q)=>p-q);
  /* --- границы кусков: [{i, kind}] с развёрнутыми индексами --- */
  const cut=(a,b,topLevel)=>{ /* разбить Q[a..b] на прямые/кривые */
    const out=[];const rec=(s,e,top)=>{
      const A=at(Q,s),B=at(Q,e),dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-9;let m=-1,md=-1;
      for(let k=s+1;k<e;k++){const q=at(Q,k),d=Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L;if(d>md){md=d;m=k;}}
      if(md<=pa.tolL){const arc=e-s;out.push({a:s,b:e,t:(top||arc>=pa.Lmin)?'L':'C'});return;}
      if(e-s<4||m<0){out.push({a:s,b:e,t:'C'});return;}
      rec(s,m,false);rec(m,e,false);};
    rec(a,b,topLevel);return out;};
  const bound=[]; /* {a,b,corner:boolean} забеги между углами */
  let startShift=0;
  if(corners.length){for(let k=0;k<corners.length;k++){const a=corners[k];let b=corners[(k+1)%corners.length];if(b<=a)b+=n;bound.push({a,b,top:true});}}
  else{ /* гладкий контур: начало в самой левой точке, при необходимости сдвигаем в конец прямой */
    let s=0;for(let i=1;i<n;i++)if(S[i][0]<S[s][0])s=i;
    {let lo=0,hi=0;while(lo>-n/3&&S[((s+lo-1)%n+n)%n][0]-S[s][0]<0.25*pa.tol)lo--;while(hi<n/3&&S[(s+hi+1)%n][0]-S[s][0]<0.25*pa.tol)hi++;s=((s+((lo+hi)>>1))%n+n)%n;}
    const tryStart=s0=>{let m=s0,md=-1;for(let k=1;k<n;k++){const q=at(Q,s0+k),d=(q[0]-Q[s0][0])**2+(q[1]-Q[s0][1])**2;if(d>md){md=d;m=s0+k;}}
      return [{a:s0,b:m,top:false},{a:m,b:s0+n,top:false}];};
    bound.push(...tryStart(s));startShift=1;
    /* первая и последняя прямые не должны слипаться через начало */
    const pcs=bound.flatMap(r=>cut(r.a,r.b,false));
    if(pcs[0].t==='L'&&pcs[pcs.length-1].t==='L'){bound.length=0;bound.push(...tryStart(pcs[0].b%n));}}
  /* --- куски --- */
  let pieces=[];
  for(const r of bound){const cs=cut(r.a,r.b,r.top);for(const p of cs){p.cornerStart=r.top&&p===cs[0];pieces.push(p);}}
  /* слить соседние кривые, две прямые подряд (без угла) — в кривую */
  const merged=[];
  for(const p of pieces){const q=merged[merged.length-1];
    if(q&&!p.cornerStart&&((q.t==='C'&&p.t==='C')||(q.t==='L'&&p.t==='L'&&!p.cornerStart))){
      if(q.t==='L'&&p.t==='L'){q.t='C';}q.b=p.b;}
    else merged.push(Object.assign({},p));}
  pieces=merged;
  /* --- экстремумы внутри кривых кусков --- */
  const split=[];
  for(const p of pieces){
    if(p.t==='L'){split.push(p);continue;}
    const cuts=[];
    for(const ax of [0,1]){
      const vA=at(S,p.a)[ax],vB=at(S,p.b)[ax],m=Math.max(3,w);
      for(let i=p.a+m;i<=p.b-m;i++){const v=at(S,i)[ax];
        let isMax=true,isMin=true;for(let d=-m;d<=m;d++){const u=at(S,i+d)[ax];if(u>v)isMax=false;if(u<v)isMin=false;if(!isMax&&!isMin)break;}
        if(!isMax&&!isMin)continue;
        const pr=isMax?v-Math.max(vA,vB):Math.min(vA,vB)-v;if(pr<0.7*pa.tol)continue;
        /* середина плато */
        let lo=i,hi=i;while(lo>p.a+1&&Math.abs(at(S,lo-1)[ax]-v)<0.25*pa.tol)lo--;while(hi<p.b-1&&Math.abs(at(S,hi+1)[ax]-v)<0.25*pa.tol)hi++;
        cuts.push({i:(lo+hi)>>1,ax,pr});}}
    cuts.sort((x,y)=>x.i-y.i);
    const kept=[];for(const c of cuts){const l=kept[kept.length-1];
      if(c.i-p.a<w||p.b-c.i<w)continue;
      if(l&&c.i-l.i<w){if(c.pr>l.pr)kept[kept.length-1]=c;continue;}kept.push(c);}
    let a=p.a,extA;
    for(const c of kept){split.push({a,b:c.i,t:'C',extA,extB:c.ax,cornerStart:p.cornerStart&&a===p.a});a=c.i;extA=c.ax;}
    split.push({a,b:p.b,t:'C',extA,cornerStart:p.cornerStart&&a===p.a});}
  const P2=split;
  /* границы: kind между кусками */
  const N=P2.length;
  const kindAt=k=>{ /* узел перед куском k */
    const p=P2[k],q=P2[(k-1+N)%N];
    if(p.cornerStart&&corners.length)return {kind:'corner'};
    if(q.t==='L'||p.t==='L')return {kind:'lin'};
    return {kind:'ext',ax:p.extA!==undefined?p.extA:(q.extB!==undefined?q.extB:0)};};
  /* куски, начинающиеся в точке, где ранее стоял угол */
  for(const p of P2){if(corners.length&&corners.includes(((p.a%n)+n)%n))p.cornerStart=true;}
  const nodeK=P2.map((p,k)=>kindAt(k));
  /* --- линии кусков --- */
  const lineOf=P2.map(p=>{if(p.t!=='L')return null;const cut0=Math.min(3,((p.b-p.a)>>2));return trcLineFit(Q,p.a+cut0,p.b-cut0,n);});
  /* --- положение узлов --- */
  const pos=P2.map((p,k)=>{const q0=at(Q,p.a);let r=[q0[0],q0[1]];
    const prev=(k-1+N)%N,lP=lineOf[prev],lN=lineOf[k];
    const kind=nodeK[k].kind;
    if(lP&&lN){const x=trcIsect(lP,lN);if(x&&Math.hypot(x[0]-r[0],x[1]-r[1])<3*pa.tol+2*w*0.5)r=x;else r=trcProj(lN,r);}
    else if(lN)r=trcProj(lN,r);else if(lP)r=trcProj(lP,r);
    return r;});
  /* --- касательные --- */
  const tanDir=(i,sgn)=>{const a=at(S,i),b=at(S,i+sgn*w),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;return [dx/L,dy/L];};
  const segs=[];
  for(let k=0;k<N;k++){const p=P2[k],k2=(k+1)%N,A=pos[k],B=pos[k2];
    if(p.t==='L'){segs.push({line:true,b:[A,A,B,B]});continue;}
    const pts=[];for(let i=p.a;i<=p.b;i++)pts.push(i===p.a?A:i===p.b?B:at(Q,i).slice());
    if(pts.length<4){segs.push({line:true,b:[A,A,B,B]});continue;}
    const tl0=nodeK[k],tr0=nodeK[k2];
    const dirTravel=(i,ax)=>{const a=at(S,i-2),b=at(S,i+2);return ax===0?(b[1]>=a[1]?1:-1):(b[0]>=a[0]?1:-1);};
    let tl,tr;
    if(tl0.kind==='corner')tl=tanDir(p.a,1);
    else if(tl0.kind==='lin'){const prevL=lineOf[(k-1+N)%N];tl=prevL?prevL.d:tanDir(p.a,1);}
    else{const ax=tl0.ax;tl=ax===0?[0,dirTravel(p.a,0)]:[dirTravel(p.a,1),0];}
    if(tr0.kind==='corner')tr=tanDir(p.b,-1);
    else if(tr0.kind==='lin'){const nl=lineOf[k2];tr=nl?[-nl.d[0],-nl.d[1]]:tanDir(p.b,-1);}
    else{const ax=p.extB!==undefined?p.extB:(P2[k2].extA!==undefined?P2[k2].extA:0);const t=ax===0?[0,dirTravel(p.b,0)]:[dirTravel(p.b,1),0];tr=[-t[0],-t[1]];}
    const dn=[];for(let i=0;i<pts.length;i+=1)dn.push(pts[i]);
    for(const bz0 of fitCubic(dn,tl,tr,pa.fit)){
      const A0=bz0[0],B0=bz0[3],Ln=vlen(v2(B0,A0))||1;const dev=q=>Math.abs((q[0]-A0[0])*(B0[1]-A0[1])-(q[1]-A0[1])*(B0[0]-A0[0]))/Ln;
      if(dev(bz0[1])<0.4*pa.tol&&dev(bz0[2])<0.4*pa.tol){segs.push({line:true,b:[A0,A0,B0,B0]});continue;}
      segs.push({b:bz0,pc:k});}}
  /* слить соседние кривые внутри одного куска, если одна кривая укладывается в допуск */
  for(let it=0;it<8;it++){let ch=false;
    for(let k=0;k<segs.length-1;k++){const p=segs[k],q=segs[k+1];if(p.line||q.line||p.pc!==q.pc)continue;
      const smp=[];for(let t=0;t<=1.0001;t+=0.05)smp.push(bz(p.b,Math.min(1,t)));for(let t=0.05;t<=1.0001;t+=0.05)smp.push(bz(q.b,Math.min(1,t)));
      const tl=vnorm(v2(p.b[1],p.b[0])),tr=vnorm(v2(q.b[2],q.b[3]));
      const f=fitCubic(smp,tl,tr,0.45*pa.fit);
      if(f.length===1){segs.splice(k,2,{b:f[0],pc:p.pc});ch=true;k--;}}
    if(!ch)break;}
  /* --- узлы --- */
  const out=[];
  for(let k=0;k<segs.length;k++){const B=segs[k].b,isL=segs[k].line;
    const nd={x:B[0][0],y:B[0][1],a:null,b:isL?null:{x:B[1][0],y:B[1][1]}};
    const prv=segs[(k-1+segs.length)%segs.length];if(!prv.line)nd.a={x:prv.b[2][0],y:prv.b[2][1]};
    out.push(nd);}
  return out.length>=3?trcClean(out,pa,Hink):null;}
/* чистка: слить соседние отрезки на одной прямой, выровнять почти горизонтальные и вертикальные, выпрямить ручки в экстремумах */
function trcClean(nodes,pa,Hink){
  const fl=nd=>!nd.a&&!nd.b;
  /* ручки в экстремумах → ровно по оси */
  for(const nd of nodes)for(const h of ['a','b']){const q=nd[h];if(!q)continue;const dx=Math.abs(q.x-nd.x),dy=Math.abs(q.y-nd.y);
    if(dy<dx*0.1)q.y=nd.y;else if(dx<dy*0.1)q.x=nd.x;}
  /* слить коллинеарные отрезки */
  for(let it=0;it<2;it++)for(let i=0;i<nodes.length&&nodes.length>3;i++){
    const A=nodes[(i-1+nodes.length)%nodes.length],B=nodes[i],C=nodes[(i+1)%nodes.length];
    if(A.b||B.a||B.b||C.a)continue;
    const d1=vnorm(v2(B.x?[B.x,B.y]:[B.x,B.y],[A.x,A.y])),d2=vnorm(v2([C.x,C.y],[B.x,B.y]));
    if(vdot(d1,d2)>0.9998){nodes.splice(i,1);i--;}}
  /* слишком короткие отрезки между двумя узлами → один узел */
  for(let it=0;it<3;it++)for(let i=0;i<nodes.length&&nodes.length>4;i++){const A=nodes[i],B=nodes[(i+1)%nodes.length];
    if(A.b||B.a)continue;if(Math.hypot(B.x-A.x,B.y-A.y)<Math.max(3,0.011*Hink)){A.x=(A.x+B.x)/2;A.y=(A.y+B.y)/2;A.b=B.b;nodes.splice((i+1)%nodes.length,1);if((i+1)%nodes.length<i)i--;}}
  /* выровнять оси: отрезок, отклонённый от оси меньше ~0.8°, становится строго горизонтальным/вертикальным */
  const n=nodes.length;
  const move=(nd,dx,dy)=>{nd.x+=dx;nd.y+=dy;if(nd.a){nd.a.x+=dx;nd.a.y+=dy;}if(nd.b){nd.b.x+=dx;nd.b.y+=dy;}};
  for(let i=0;i<n;i++){const A=nodes[i],B=nodes[(i+1)%n];if(A.b||B.a)continue;
    const dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy);if(L<4)continue;
    if(Math.abs(dx)<0.014*L){const m=(A.x+B.x)/2;move(A,m-A.x,0);move(B,m-B.x,0);}
    else if(Math.abs(dy)<0.014*L){const m=(A.y+B.y)/2;move(A,0,m-A.y);move(B,0,m-B.y);}}
  void pa;void Hink;void fl;
  return nodes;}
/* ---------- главный конвейер (генератор: между этапами отдаёт управление) ----------
   img = trcGrayOf(...); prep = trcPrepare(img,invert); opt = {thr, smooth (0..100), speck (px, 0..40)}
   результат: {cs, bb, nodes, loops, k, tf:{ox,oy,u}} или {err:'empty'|'complex'|'nodes', n} */
function* trcRun(prep,opt){
  const W=prep.W,H=prep.H,sc=Math.max(W,H)/600;
  const thr=Math.max(1,Math.min(254,+opt.thr||prep.otsu));
  const sg=Math.max(0.6,Math.min(1.6,0.75*sc))*(1+0.6*Math.max(0,Math.min(1,(opt.smooth||0)/100)));
  const bk=Math.round(sg*20);let F0=prep.blur[bk];if(!F0){F0=trcBlur(prep.g,W,H,sg);prep.blur={};prep.blur[bk]=F0;}
  yield 0.1;
  const F=Float32Array.from(F0);
  const d=Math.max(0,+opt.speck||0)*sc,minA=d>0?Math.PI/4*d*d:0;
  trcSpeck(F,W,H,thr,minA);
  yield 0.25;
  const M=trcMarch(F,W,H,thr);yield 0.4;
  let loops=trcLoops(M);
  const minLoop=Math.max(minA,6*sc*sc);
  const area=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
  loops=loops.map(P=>({P,ar:area(P)})).filter(o=>Math.abs(o.ar)>=Math.max(4,minLoop));
  if(!loops.length)return {err:'empty'};
  if(loops.length>TRC.MAXC)return {err:'complex',n:loops.length};
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const o of loops)for(const q of o.P){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  const Hink=Math.max(8,y1-y0);
  const cs=[];let nn=0;
  for(let li=0;li<loops.length;li++){const o=loops[li];
    const nodes=trcFitLoop(o.P,Hink,opt.smooth==null?40:opt.smooth);
    if(nodes){nn+=nodes.length;if(nn>TRC.MAXNODE)return {err:'nodes',n:nn};cs.push({hole:o.ar<0,nodes});}
    if(li%6===5)yield 0.4+0.55*li/loops.length;}
  if(!cs.length)return {err:'empty'};
  /* пиксели (y вниз) → единицы знака: высота чернил 1000, низ = 0, y вверх */
  const T=(nd,f)=>{const o={x:f(nd.x,nd.y)[0],y:f(nd.x,nd.y)[1]};return o;};
  void T;
  let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
  const bb0=impBBoxPx(cs);bx0=bb0.x0;by0=bb0.y0;bx1=bb0.x1;by1=bb0.y1;
  const u=1000/Math.max(1e-6,by1-by0);
  const cv=(p)=>p&&{x:(p.x-bx0)*u,y:(by1-p.y)*u};
  const out=cs.map(c=>mkc(c.nodes.map(n=>Object.assign(cv(n),{a:cv(n.a)||null,b:cv(n.b)||null})),c.hole));
  const bb=impBBox(out);
  return {cs:out,bb,nodes:nn,loops:out.length,k:(by1-by0)/1000,tf:{ox:bx0,oy:by1,u},W,H};}
function impBBoxPx(cs){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const c of cs){const n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
    if(!(a.b||b.a)){x0=Math.min(x0,a.x);x1=Math.max(x1,a.x);y0=Math.min(y0,a.y);y1=Math.max(y1,a.y);continue;}
    const Pq=[[a.x,a.y],a.b?[a.b.x,a.b.y]:[a.x,a.y],b.a?[b.a.x,b.a.y]:[b.x,b.y],[b.x,b.y]];
    for(let k=0;k<=24;k++){const q=bz(Pq,k/24);x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}}}
  return {x0,y0,x1,y1};}
function trcSync(prep,opt){const it=trcRun(prep,opt);let r;while(!(r=it.next()).done){}return r.value;}
/* запись результата трассировки как знака набора (как impSet для SVG): k — единиц высоты на пиксель исходной картинки */
function impSetTraced(ch,res,name,kScale){
  if(!res||!res.cs||!res.cs.length||!res.bb)return false;
  const old=IMP.glyphs[ch];
  IMP.glyphs[ch]={c:res.cs,bb:res.bb,k:(res.k||1)*(kScale||1),src:name||'',adj:old&&old.adj?old.adj:null,v:++IMP.ver};
  delete IMP.warn[ch];return true;}
