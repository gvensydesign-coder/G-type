/* Стресс «Нить» (nit) на уровне хоста: топология каждого знака при случайных/крайних значениях всех ползунков (диапазоны из paramLimits),
   как stress_applik.js. Независимая проверка по растру 2 ед./пкс: число частей и дыр как у эталона (тот же знак, то же зерно, значения по умолчанию, дрожь 0),
   дыра не меньше (1.1·S)², часть не меньше 0.5·S² (кроме точек). Два счёта: raw = сборка генератора БЕЗ страховки (показывает, где страховка срабатывает),
   bad = то, что отдаёт хост (F.raw через страховку). Узкие пределы ползунков выбраны так, чтобы raw в них = 0 на крайних значениях.
   node stress_nit.js [N=60|pres|ext] [seed=1]     RAW=1: bad считается по raw */
const fs=require('fs');
const M=new Function(fs.readFileSync(process.env.CORE||__dirname+'/core_all.js','utf8')+'\nreturn {FONTS,useFont,safeP,famParams,FAM_W,PARAMS,paramLimits,NZS,csgMask};')();M.useFont('nit');const F=M.FONTS.nit,Z=M.NZS;
const U=2,RAWMODE=!!process.env.RAW;
function MODE0(){return process.argv[2]==='sweep'?9:3;}const MODE=process.argv[2]||'60',SEED=+(process.argv[MODE0()]||1);
let s=(SEED*2654435761)>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};
function flat2(c){const P=[],n=c.nodes.length;for(let i=0;i<n;i++){const a=c.nodes[i],b=c.nodes[(i+1)%n];
  const ab=a.b||a,ba=b.a||b;for(let t=0;t<1;t+=1/8){const u=1-t;P.push([u*u*u*a.x+3*u*u*t*ab.x+3*u*t*t*ba.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*ab.y+3*u*t*t*ba.y+t*t*t*b.y]);}}return P;}
function raster(contours){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const polys=contours.map(c=>flat2(c));
  for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const W=Math.ceil((x1-x0)/U)+10,H=Math.ceil((y1-y0)/U)+10,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;
    for(let k=0;k<xs.length-1;k++){w+=xs[k][1];if(w!==0){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
  return {m,W,H};}
function label(m,W,H,val,c8){const L=new Int32Array(W*H).fill(-1),areas=[];let n=0;const q=new Int32Array(W*H);
  for(let st=0;st<W*H;st++){if(m[st]!==val||L[st]>=0)continue;let h=0,t=0;q[t++]=st;L[st]=n;let ar=0;
    while(h<t){const k=q[h++];ar++;const i=k%W,j=(k-i)/W;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;if(!c8&&di&&dj)continue;const I=i+di,J=j+dj;if(I<0||J<0||I>=W||J>=H)continue;const kk=J*W+I;if(m[kk]===val&&L[kk]<0){L[kk]=n;q[t++]=kk;}}}
    areas.push(ar*U*U);n++;}
  return {L,areas,n};}
let H0=12;function topo(cs,S){H0=Math.pow(1.1*(S||19.6),2);const {m,W,H}=raster(cs);const fg=label(m,W,H,1,true),bg=label(m,W,H,0,false);
  const touch=new Set();for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
  const holes=[];for(let c=0;c<bg.n;c++)if(!touch.has(c)&&bg.areas[c]>=H0)holes.push(bg.areas[c]);
  return {parts:fg.areas,holes};}
const chars=F.CHARSET.filter(c=>c.trim()&&c.charCodeAt(0)>32&&!/[   ]/.test(c));
const D=F.DEFAULTS.regular;const mk=o=>M.paramLimits({...D,...o},'nit').q;
const DOTS=new Set([...'.,:;!?·•…"\'‘’“”„°ёЁйЙiјj:;%№=©@:']);
const refC={};
function refOf(ch,seed){const k=ch+'|'+seed;if(refC[k])return refC[k];const e={S:Z.S(Z.DEF.nlw),width:Z.DEF.nwd,wob:0,join:Z.DEF.njn,seed};const r=Z.build(ch,e);return refC[k]=r&&r.cs.length?topo(r.cs,e.S):null;}
function probs(ch,cs,S,seed){const t=topo(cs,S),r=refOf(ch,seed),out=[];if(!r)return out;
  if(t.holes.length!==r.holes.length)out.push('holes '+r.holes.length+'->'+t.holes.length);
  if(t.parts.length!==r.parts.length)out.push('parts '+r.parts.length+'->'+t.parts.length);
  const hm=Math.pow(1.1*S,2);for(const a of t.holes)if(a<hm){out.push('smallhole '+Math.round(a));break;}
  return out;}
const fails=[],stat={checked:0,raw:0,rawBy:{}};
function check(label,o){const p=mk(o),e=Z.eng(p);
  for(const ch of chars){stat.checked++;
    const raw=Z.build(ch,e);if(!raw||!raw.cs.length)continue;
    const pr0=probs(ch,raw.cs,e.S,e.seed);if(pr0.length){stat.raw++;stat.rawBy[label.split(':')[0]]=(stat.rawBy[label.split(':')[0]]||0)+1;if(RAWMODE)fails.push({label,ch,probs:pr0,p:o});}
    if(!RAWMODE){const g=F.raw(ch,p),pr=probs(ch,g.cs,e.S,e.seed);if(pr.length)fails.push({label,ch,probs:pr,p:o,fb:g.fallback});}}}
const L=M.paramLimits(D,'nit').L,KEYS=['nlw','nwd','nwob','njn','nseed'];
const mid=k=>D[k];
if(MODE==='pres'){
  for(const grp of F.methods)for(const [nm,pr] of grp[2])check('pres:'+grp[0]+'/'+nm,pr);
  for(const [wn] of M.FAM_W){const q=M.famParams(D,wn);const o={};for(const k of KEYS)o[k]=q[k];check('fam:'+wn,o);}
}else if(MODE==='sweep'){
  const key=process.argv[3],vals=process.argv[4].split(',').map(Number),seeds=(process.argv[5]||'1,2,3').split(',').map(Number);
  for(const v of vals)for(const sd of seeds)check('sweep:'+key+'='+v,{[key]:v,nseed:sd});
}else if(MODE==='ext'){
  for(const k of KEYS){if(k==='nseed')continue;for(const v of L[k])check('ext:'+k+'='+v,{[k]:v});}
  for(const sd of [1,2,3,4,5,6,7,8,9,10,17,33,101,250,512,999])check('seed:'+sd,{nseed:sd});
  const lo={},hi={};for(const k of KEYS){lo[k]=L[k][0];hi[k]=L[k][1];}check('ext:allmin',lo);check('ext:allmax',hi);
  for(const a of KEYS)for(const b of KEYS){if(a>=b||a==='nseed'||b==='nseed')continue;for(const va of L[a])for(const vb of L[b])check('ext2:'+a+'='+va+','+b+'='+vb,{[a]:va,[b]:vb});}
}else{
  const N=+MODE;for(let i=0;i<N;i++){const o={};for(const k of KEYS){const [a,b]=L[k];o[k]=k==='nseed'?Math.floor(rnd()*1000):(rnd()<0.25?(rnd()<0.5?a:b):a+rnd()*(b-a));}check('rnd'+i,o);}
}
const byCh={};for(const f of fails){const k=f.ch+' '+f.probs.join(',');byCh[k]=(byCh[k]||0)+1;}
for(const f of fails.slice(0,RAWMODE?+(process.env.SHOW||60):12))console.log('FAIL',f.label,f.ch,f.probs.join(','),JSON.stringify(f.p),f.fb||'');
console.log('raw by group',JSON.stringify(stat.rawBy));
console.log('TOTAL',MODE,'seed',SEED,'checked',stat.checked,'raw',stat.raw,'bad',fails.length);
