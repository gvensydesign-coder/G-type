/* ---------- «Сцепка»: оптический спейсинг по балансу белой площади (одно правило для всех знаков) ----------
   1. поле:  sb = max(SMIN, A − ALPHA·среднее по полосе(min(глубина(y), CAP)))      (глубина = от габарита до чернил в строке)
   2. кернинг пары k(a,b) = ЦЕЛЬ − площадь(a,b), но зазор в самых близких рядах не меньше CLR   (ЦЕЛЬ = площадь пары Н–Н)
   Все слагаемые масштабируются зазором g: плоский зазор «стойка|стойка» равен g (поле g/2 с каждой стороны). */
const ST_ALPHA=0.5,ST_WIN=8,ST_CLRF=1.0;
const ST_YS=[];for(let y=-300;y<1100;y+=4)ST_YS.push(y);
function stSpCfg(g){const A=g/2,k=A/26;return {g,A,CAP:70*k,SMIN:-30*k,CLR:ST_CLRF*g};}
/* контуры -> многоугольники для измерений ({p,h}) */
const stPolysOf=cs=>cs.map(c=>({p:c.poly,h:c.hole}));
/* Крайние чернила по строкам — как у эталона: растр 0.5 пикс/ед. (PIL polygon при 2-кратной выборке и BILINEAR-уменьшении, порог >127), т.е. край
   квантуется сеткой 2 ед.; точный край давал бы другие значения кернинга на ±1. Координаты эталона сдвинуты на 0.25 от решётки JS. */
const ST_PH=0.25;
const stRound=v=>{const f=Math.floor(v),d=v-f;return d<0.5?f:d>0.5?f+1:(f%2===0?f:f+1);};
function stEdgeRows(polys,x0,y0,x1,y1){
  const ox=Math.floor(x0+ST_PH)-8,oy=Math.floor(y0+ST_PH)-8,W=Math.floor((x1+ST_PH-ox+8)*0.5)+2,H=Math.floor((y1+ST_PH-oy+8)*0.5)+2,n=ST_YS.length;
  const dl=new Float64Array(n).fill(NaN),dr=new Float64Array(n).fill(NaN),SW=2*W,SH=2*H;
  const row=new Map();   /* src-строка -> Uint8Array покрытия (closed-pixel cover вдоль линии r+0.5) */
  const getRow=r=>{if(r<0||r>=SH)return null;let a=row.get(r);if(a)return a;a=new Uint8Array(SW);
    const yc=oy+SH-r-0.5-ST_PH;for(const iv of stRowInt(polys,yc)){const c0=Math.max(0,Math.floor(iv[0]+ST_PH-ox)),c1=Math.min(SW-1,Math.floor(iv[1]+ST_PH-ox));for(let c=c0;c<=c1;c++)a[c]=1;}
    row.set(r,a);return a;};
  const WT=[0.125,0.375,0.375,0.125],cov=new Float64Array(W);
  for(let k=0;k<n;k++){const y=ST_YS[k],j=stRound(H-1-(y-oy)*0.5);if(j<0||j>=H)continue;
    cov.fill(0);let any=false;
    for(let a=0;a<4;a++){const A=getRow(2*j-1+a);if(!A)continue;const wy=WT[a];
      for(let i=0;i<W;i++){let sx=0;for(let b=0;b<4;b++){const c=2*i-1+b;if(c>=0&&c<SW&&A[c])sx+=WT[b];}if(sx)cov[i]+=wy*sx;}}
    let first=-1,last=-1;for(let i=0;i<W;i++)if(cov[i]*255>127){if(first<0)first=i;last=i;}
    if(first>=0){dl[k]=ox+first*2-(x0+ST_PH);dr[k]=(x1+ST_PH)-(ox+(last+1)*2);}}
  return {dl,dr};}
function stGS(polys,cfg){
  if(!polys.length)return {empty:true,sbl:0,sbr:0};
  const b=stBBox(polys),x0=b[0],y0=b[1],x1=b[2],y1=b[3],n=ST_YS.length;
  const {dl,dr}=stEdgeRows(polys,x0,y0,x1,y1);
  const lo=Math.max(y0+ST_PH,0),hi=y1+ST_PH,lo2=lo+0.06*(hi-lo),hi2=hi-0.06*(hi-lo),band=new Uint8Array(n);
  const ml_=new Float64Array(n),mr_=new Float64Array(n);let sl=0,sr=0,nb=0;
  for(let k=0;k<n;k++){band[k]=(ST_YS[k]>=lo2&&ST_YS[k]<=hi2)?1:0;
    ml_[k]=isNaN(dl[k])?cfg.CAP:Math.min(dl[k],cfg.CAP);mr_[k]=isNaN(dr[k])?cfg.CAP:Math.min(dr[k],cfg.CAP);
    if(band[k]){sl+=ml_[k];sr+=mr_[k];nb++;}}
  const ml=nb?sl/nb:cfg.CAP,mr=nb?sr/nb:cfg.CAP;
  return {empty:false,bbox:b,dl,dr,band,maskL:ml_,maskR:mr_,ml,mr,sbl:Math.max(cfg.SMIN,cfg.A-ST_ALPHA*ml),sbr:Math.max(cfg.SMIN,cfg.A-ST_ALPHA*mr)};}
/* пара a b без кернинга -> {area, clr} */
function stPair(a,b){
  if(a.empty||b.empty)return null;
  const n=ST_YS.length;let any=false;
  for(let k=0;k<n;k++)if(a.band[k]&&b.band[k]){any=true;break;}
  let s=0,cnt=0;
  for(let k=0;k<n;k++){const inb=any?(a.band[k]&&b.band[k]):(a.band[k]||b.band[k]);if(!inb)continue;
    s+=a.sbr+b.sbl+ST_ALPHA*(a.maskR[k]+b.maskL[k]);cnt++;}
  const area=cnt?s/cnt:0;
  let clr=1e9;const row=new Float64Array(n);let have=false,mn=1e9;
  for(let k=0;k<n;k++){if(!isNaN(a.dr[k])&&!isNaN(b.dl[k])){row[k]=a.sbr+b.sbl+a.dr[k]+b.dl[k];have=true;if(row[k]<mn)mn=row[k];}else row[k]=NaN;}
  if(have){
    for(let i=0;i+ST_WIN<=n;i++){let s2=0,ok=true;for(let j=0;j<ST_WIN;j++){const v=row[i+j];if(isNaN(v)){ok=false;break;}s2+=v;}if(ok){const m=s2/ST_WIN;if(m<clr)clr=m;}}
    if(clr>=1e8)clr=mn;}
  return {area,clr};}
function stKernFor(a,b,target,cfg,kmin,kmax){kmin=kmin==null?-90:kmin;kmax=kmax==null?140:kmax;
  const p=stPair(a,b);if(!p)return 0;let k=target-p.area;if(p.clr<1e8)k=Math.max(k,cfg.CLR-p.clr);
  k=Math.max(kmin,Math.min(kmax,k));return Math.round(k);}
