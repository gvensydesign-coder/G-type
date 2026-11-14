/* Стресс «Столб» (stolb): топология знаков и сцепок при случайных значениях всех ползунков (диапазоны из F.params), как stress_applik.js.
   Знак: число дыр и частей как у эталона (тот же знак при значениях по умолчанию, тот же вес класса), без крапинок, тонких мест и щелей. Сцепка: если собирается (keep) —
   те же проверки; не собирающаяся пара в файл не пишется (это не ошибка, считается отдельно).
   node stress_stolb.js [N=80|pres] [seed=1] */
const fs=require('fs');
const M=new Function(fs.readFileSync(process.env.CORE||__dirname+'/dev_all.js','utf8')+'\nreturn {FONTS,useFont,safeP,famParams,FAM_W,PARAMS,paramLimits};')();M.useFont('stolb');const F=M.FONTS.stolb;
const U=4,PIN=600;
const PRES=process.argv[2]==='pres',N=PRES?0:+(process.argv[2]||80),SEED=+(process.argv[3]||1);
let s=(SEED*2654435761)>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};
function flat(nodes){const P=[],n=nodes.length;for(let i=0;i<n;i++){const a=nodes[i],b=nodes[(i+1)%n];
  const lin=(a.b.x===a.x&&a.b.y===a.y)&&(b.a.x===b.x&&b.a.y===b.y);if(lin){P.push([a.x,a.y]);continue;}
  for(let t=0;t<1;t+=1/8){const u=1-t;P.push([u*u*u*a.x+3*u*u*t*a.b.x+3*u*t*t*b.a.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*a.b.y+3*u*t*t*b.a.y+t*t*t*b.y]);}}return P;}
function raster(contours){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const polys=contours.map(c=>flat(c.nodes));
  for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const W=Math.ceil((x1-x0)/U)+10,H=Math.ceil((y1-y0)/U)+10,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;
    for(let k=0;k<xs.length-1;k++){w^=1;if(w){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
  return {m,W,H};}
function label(m,W,H,val){const L=new Int32Array(W*H).fill(-1),areas=[];let n=0;const q=new Int32Array(W*H);
  for(let st=0;st<W*H;st++){if(m[st]!==val||L[st]>=0)continue;let h=0,t=0;q[t++]=st;L[st]=n;let ar=0;
    while(h<t){const k=q[h++];ar++;const i=k%W,j=(k-i)/W;
      if(i>0&&m[k-1]===val&&L[k-1]<0){L[k-1]=n;q[t++]=k-1;}if(i<W-1&&m[k+1]===val&&L[k+1]<0){L[k+1]=n;q[t++]=k+1;}
      if(j>0&&m[k-W]===val&&L[k-W]<0){L[k-W]=n;q[t++]=k-W;}if(j<H-1&&m[k+W]===val&&L[k+W]<0){L[k+W]=n;q[t++]=k+W;}}
    areas.push(ar);n++;}
  return {L,areas,n};}
const er=(m,W,H)=>{const o=new Uint8Array(m.length);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k]&&m[k-1]&&m[k+1]&&m[k-W]&&m[k+W])o[k]=1;}return o;};
const di=(m,W,H)=>{const o=new Uint8Array(m);for(let j=1;j<H-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;if(m[k-1]||m[k+1]||m[k-W]||m[k+W])o[k]=1;}return o;};

function topo(g,Hcap){const {m,W,H}=raster(g.contours||g.cs);
  const fg=label(m,W,H,1),bg=label(m,W,H,0);
  /* дыры = компоненты фона, не касающиеся рамки */
  const touch=new Set();for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
  const holes=[];for(let c=0;c<bg.n;c++)if(!touch.has(c)&&bg.areas[c]*U*U>=PIN)holes.push(bg.areas[c]*U*U);
  const parts=fg.areas.map(a=>a*U*U);
  /* тонкие участки: размыкание 2 клетки (8 u) */
  let e=m;for(let i=0;i<2;i++)e=er(e,W,H);let o=e;for(let i=0;i<2;i++)o=di(o,W,H);let thin=0,ink=0;for(let k=0;k<m.length;k++){if(m[k])ink++;if(m[k]&&!o[k])thin++;}
  /* щели: замыкание 1 клетка (4 u -> зазор < 8 u) */
  let d=di(m,W,H);let c=er(d,W,H);let slit=0;for(let k=0;k<m.length;k++)if(c[k]&&!m[k])slit++;
  return {parts,holes,thin:thin/ink,thinN:thin,slit};}
const chars=F.CHARSET.filter(c=>c.trim()&&c.charCodeAt(0)>32&&!/[\u00a0\u2009\u202f]/.test(c));
const D=F.DEFAULTS.regular;
const mk=o=>M.paramLimits({...D,...o},'stolb').q;
const refCache={};
const rawOf=(ch,p)=>F.raw(ch,p);
function refOf(ch){if(refCache[ch])return refCache[ch];return refCache[ch]=topo(rawOf(ch,mk({})));}
const fails=[],stat={checked:0,lig:0,ligDropped:0};
/* integration (f): lowercase counters (ъ at the extreme corner wdth 125 / stem 137-150: 1712-1840 u2) are judged at 0.0035 capH2 (1715 u2 at capH 700); capitals and digits keep 0.004 */
let CURS=78,CURCH='';const SMALLSET=new Set([...'.,:;!?„“”‘’…·•*\'"-–—‒−']);
function probsOf(t,r,H,lc){const probs=[];
  if(r&&t.holes.length!==r.holes.length)probs.push('holes '+r.holes.length+'->'+t.holes.length);
  if(r&&t.parts.length!==r.parts.length)probs.push('parts '+r.parts.length+'->'+t.parts.length);
  for(const a of t.holes)if(a>=PIN&&a<(lc?0.0035:0.004)*H*H){probs.push('smallhole '+Math.round(a));break;}
  for(const a of t.parts)if(a<Math.min(2000,0.30*CURS*CURS)&&a>=PIN){probs.push('speck '+Math.round(a));break;}
  if(t.thin>(SMALLSET.has(CURCH)?0.10:0.025))probs.push('thin '+(t.thin*100).toFixed(1)+'%');
  if(t.slit>160)probs.push('slit '+t.slit);return probs;}
function check(label,o){const p=mk(o);CURS=p.stem;
  for(const ch of chars){const g=rawOf(ch,p);if(!g||!g.cs.length)continue;const t=topo(g);stat.checked++;CURCH=ch;
    const pr=probsOf(t,refOf(ch),p.capH,ch!==ch.toUpperCase());if(pr.length)fails.push({label,ch,probs:pr,p:o});}
}
const KEYS=['stem','wdth','xh','urnd','uctr','uap','ucut','ugap'];
const R=[];for(const [k,l,mn,mx,st] of M.PARAMS){const o=F.params[k];if(o===null||!KEYS.includes(k))continue;const [,a,b,s]=Array.isArray(o)?o:[l,mn,mx,st];R.push([k,a,b,s]);}
const base=Object.fromEntries(R.map(([k])=>[k,D[k]]));
if(PRES){
  for(const [mn,,opts] of F.methods)for(const [on,o] of opts)check(mn+':'+on,{...base,...o});
  for(const [wn] of M.FAM_W){const q=M.famParams(D,wn);check('fam:'+wn,q);}
}else{
  for(const [k,a,b] of R)for(const v of [a,b])check('min/max '+k+'='+v,{...base,[k]:v});
  check('all-min',Object.fromEntries(R.map(([k,a])=>[k,a])));check('all-max',Object.fromEntries(R.map(([k,,b])=>[k,b])));
  for(let i=0;i<N;i++){const o={};for(const [k,a,b,s] of R){const u=rnd();o[k]=u<0.15?a:u<0.3?b:a+(b-a)*rnd();if(s>=1)o[k]=Math.round(o[k]);}check('rand'+i,o);}
}
const byGlyph={};for(const f of fails){(byGlyph[f.ch]=byGlyph[f.ch]||[]).push(f);}
console.log('stolb checked glyph builds',stat.checked,'bad',fails.length,'glyphs',Object.keys(byGlyph).length);
for(const k in byGlyph){const f=byGlyph[k];console.log('  ',k,f.length,'e.g.',f[0].label,JSON.stringify(f[0].p).slice(0,260),f[0].probs.join(';'));}
console.log('TOTAL combos',stat.checked,'bad',fails.length);
