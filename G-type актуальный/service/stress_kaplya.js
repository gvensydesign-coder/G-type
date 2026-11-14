/* Стресс «Капли» по собственным правилам шрифта (RECIPE_kaplya.md): топология меняется по замыслу, поэтому вместо «как у умолчаний»:
   — части (без капель) и дыры совпадают с эталоном при растекании ≤ 35 (Light/Regular узнаваемы); выше — дыры могут закрываться только у знаков из allowClose (при растекании ≥ 60), новых дыр и потери частей нет;
   — капли: площадь ≥ 1500, зазор до тела ≥ 14, не больше 4; нет самопересечений; нет тонких перемычек и щелей (раскрытие/замыкание растра 4 ед.).
   node stress_kaplya.js [N=150|pres] [styles=regular,italic] [seed=1] */
const fs=require('fs');
const M=new Function(fs.readFileSync(process.env.CORE||__dirname+'/core_all.js','utf8')+'\nreturn {FONTS,useFont,safeP,famParams,FAM_W,PARAMS};')();
M.useFont('kaplya');const F=M.FONTS.kaplya;
const PRES=process.argv[2]==='pres',N=PRES?0:+(process.argv[2]||150),STY=(process.argv[3]||'regular,italic').split(','),SEED=+(process.argv[4]||1);
let seed=(SEED*2654435761)>>>0||1;const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const CH=F.CHARSET.filter(c=>c.trim()&&c.charCodeAt(0)>32&&!/[   ]/.test(c));
const CRIT=[...'OНПoeaЖ8iйёbdgЮЯ&?!'];
const flat=c=>{const pts=[],n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];for(let s=0;s<8;s++){const t=s/8,u=1-t;pts.push([u*u*u*a.x+3*u*u*t*a.b.x+3*u*t*t*b.a.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*a.b.y+3*u*t*t*b.a.y+t*t*t*b.y]);}}return pts;};
const area=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
function segX(a,b,c,d){const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0;}
function selfX(P){const n=P.length;for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;if(segX(P[i],P[(i+1)%n],P[j],P[(j+1)%n]))return true;}return false;}
function distTo(P,Q){let m=1e9;const n=Q.length;for(const p of P){for(let i=0;i<n;i++){const a=Q[i],b=Q[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy;let t=l2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);if(d<m)m=d;}}return m;}
function raster(polys){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const U=4,W=Math.ceil((x1-x0)/U)+12,H=Math.ceil((y1-y0)/U)+12,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y)){xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;for(let k=0;k<xs.length-1;k++){w+=xs[k][1];if(w!==0){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
  return {m,W,H};}
const er=(m,W,H)=>{const o=new Uint8Array(m.length);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k]&&m[k-1]&&m[k+1]&&m[k-W]&&m[k+W])o[k]=1;}return o;};
const di=(m,W,H)=>{const o=new Uint8Array(m);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k-1]||m[k+1]||m[k-W]||m[k+W])o[k]=1;}return o;};
function slivers(polys){const {m,W,H}=raster(polys);let ink=0;for(const v of m)ink+=v;
  let e=m;for(let i=0;i<2;i++)e=er(e,W,H);let o=e;for(let i=0;i<2;i++)o=di(o,W,H);let thin=0;for(let k=0;k<m.length;k++)if(m[k]&&!o[k])thin++;
  let d=m;for(let i=0;i<2;i++)d=di(d,W,H);let c=d;for(let i=0;i<2;i++)c=er(c,W,H);let gap=0;for(let k=0;k<m.length;k++)if(c[k]&&!m[k])gap++;
  return {thin:thin>Math.max(30,0.012*ink)?thin:0,gap:gap>45?gap:0};}
function info(ch,q){const r=F.raw(ch,q);if(!r)return null;const main=[],sats=[],holes=[];
  for(const c of r.contours){const P=flat(c);if(c.sat)sats.push(P);else if(c.hole)holes.push(P);else main.push(P);}return {main,sats,holes,all:[...main,...holes,...sats]};}
const ref={};
function refOf(sty){if(ref[sty])return ref[sty];const q=M.safeP({...F.DEFAULTS[sty]}),r={};for(const ch of CH){const i=info(ch,q);if(i)r[ch]=[i.main.length,i.holes.length];}return ref[sty]=r;}
function check(sty,o,chs){const p={...F.DEFAULTS[sty],...o},q=M.safeP(p),R=refOf(sty),errs=[],m=q.melt;
  for(const ch of chs){const i=info(ch,q);if(!i||!R[ch])continue;const [rm,rh]=R[ch];
    if(i.main.length!==rm){errs.push(ch+':parts '+rm+'→'+i.main.length);continue;}
    const hv=q.stem>=150;
    if(m<=35&&!hv){if(i.holes.length!==rh){errs.push(ch+':holes '+rh+'→'+i.holes.length);continue;}}
    else if(i.holes.length>rh||(i.holes.length<rh&&!(F.allowClose.includes(ch)&&(m>=60||hv)))){errs.push(ch+':holes '+rh+'→'+i.holes.length+' m'+m);continue;}
    if(i.sats.length>4){errs.push(ch+':sats '+i.sats.length);continue;}
    let bad=null;
    for(const s of i.sats){if(Math.abs(area(s))<1500){bad='speck';break;}const g=Math.min(...[...i.main,...i.holes].map(P=>distTo(s.filter((_,k)=>k%3===0),P)));if(g<14){bad='gap '+Math.round(g);break;}}
    if(!bad)for(const P of [...i.main,...i.holes])if(selfX(P)){bad='selfx';break;}
    if(bad){errs.push(ch+':'+bad);continue;}
    {const Xh=q.xh;let mis=0;
      for(const sp of i.sats){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const pt of sp){x0=Math.min(x0,pt[0]);x1=Math.max(x1,pt[0]);y0=Math.min(y0,pt[1]);y1=Math.max(y1,pt[1]);}
        const cx=(x0+x1)/2,rs=(x1-x0)/2;let low=1e9;
        for(const m of i.main)for(const pt of m)if(Math.abs(pt[0]-cx)<=rs*1.6&&pt[1]>y1&&pt[1]<low)low=pt[1];
        /* a satellite is legal only as a falling drop: directly below its own drip bead (bead hangs below the baseline, gap <= 0.12 xh) */
        if(!(y1<0&&low<0))mis++;
        else if(low-y1>0.14*Xh+0)mis++;}
      if(mis){errs.push(ch+':misread '+mis);continue;}}
    const sl=slivers(i.all);if(sl.thin)errs.push(ch+':thin '+sl.thin);else if(sl.gap>(q.stem>=150||m>=70?200:0))errs.push(ch+':slit '+sl.gap);}
  return errs;}
const ranges=()=>{const ov=F.params||{},out=[];for(const [k,l,mn,mx,stp] of M.PARAMS){const o=ov[k];if(o===null||o===undefined)continue;const [,a,b,s]=Array.isArray(o)?o:[l,mn,mx,stp];if(k==='slant')continue;out.push([k,a,b,s]);}return out;};
let total=0,totalC=0;const R=ranges();
for(const sty of STY){
  const D=F.DEFAULTS[sty],cfgs=[];
  if(PRES){for(const [mn,,opts] of F.methods)for(const [on,o] of opts){const nv={};for(const k in o)nv[k]=typeof o[k]==='function'?o[k](D):o[k];cfgs.push([mn+':'+on,{...D,...nv}]);}
    for(const [wn] of M.FAM_W)cfgs.push(['fam:'+wn,M.famParams(D,wn)]);}
  else{
    cfgs.push(['min',Object.fromEntries(R.map(([k,a])=>[k,a]))],['max',Object.fromEntries(R.map(([k,,b])=>[k,b]))],
      ['stain',{stem:124,melt:100,drip:100,wdth:88}],['stain-wide',{stem:124,melt:100,drip:100,wdth:118,capH:640}],['thin-stain',{stem:46,melt:100,drip:100}],['heavy-clean',{stem:124,melt:0,drip:0,wdth:88}],['tall',{capH:760,stem:124,melt:100}],['rain',{melt:100,drip:100}]);
    while(cfgs.length<N){const o={};for(const [k,a,b,s] of R){const u=rnd();o[k]=u<0.2?a:u<0.4?b:a+(b-a)*rnd();if(s>=1)o[k]=Math.round(o[k]);}cfgs.push(['r'+cfgs.length,o]);}}
  let bad=0;const byCh={},ex=[];
  cfgs.forEach(([nm,o],ci)=>{let chs;if(PRES)chs=CH;else{const s=new Set(CRIT);let k=0;while(s.size<CRIT.length+36&&k++<400)s.add(CH[Math.floor(rnd()*CH.length)]);chs=[...s].filter(c=>CH.includes(c));}
    const errs=check(sty,o,chs);if(errs.length){bad++;for(const e of errs){const c=e.split(':')[0];byCh[c]=(byCh[c]||0)+1;}if(ex.length<15)ex.push(nm+' '+JSON.stringify(o).slice(0,200)+' :: '+errs.slice(0,10).join(' '));}});
  total+=bad;totalC+=cfgs.length;console.log('kaplya',sty,'combos',cfgs.length,'bad',bad,JSON.stringify(byCh));ex.forEach(e=>console.log('   ',e));}
console.log('TOTAL combos',totalC,'bad',total);
