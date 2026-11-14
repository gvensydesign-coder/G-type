/* Стресс «Аппликации» (топология сборки из кусков, как в RECIPE_applik.md): для каждого знака — дыры, части, мелкие дыры, крапинки, тонкие места и щели.
   Эталон = тот же знак при Насыщенности 150 без неровности/зазоров/рваного края (тот же вариант). Допуск частей: + число отдельных кусков, которые зазор/кусочки разводят по замыслу.
   node stress_applik.js [N=100|pres] [seed=1] */
const fs=require('fs');
const M=new Function(fs.readFileSync(process.env.CORE||__dirname+'/../core_all.js','utf8')+'\nreturn {FONTS,useFont,safeP,famParams,FAM_W,PARAMS,paramLimits};')();M.useFont('applik');const F=M.FONTS.applik;
const U=2,PIN=6;
const PRES=process.argv[2]==='pres',N=PRES?0:+(process.argv[2]||100),SEED=+(process.argv[3]||1);
let s=(SEED*2654435761)>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};
function raster(contours){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const polys=contours.map(c=>A.flat(c.nodes,6));
  for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}
  const W=Math.ceil((x1-x0)/U)+10,H=Math.ceil((y1-y0)/U)+10,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;
    for(let k=0;k<xs.length-1;k++){w+=xs[k][1];if(w!==0){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
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
function topo(g,Hcap){const {m,W,H}=raster(g.contours);
  const fg=label(m,W,H,1),bg=label(m,W,H,0);
  /* дыры = компоненты фона, не касающиеся рамки */
  const touch=new Set();for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
  const holes=[];for(let c=0;c<bg.n;c++)if(!touch.has(c)&&bg.areas[c]*U*U>=PIN)holes.push(bg.areas[c]*U*U);
  const parts=fg.areas.map(a=>a*U*U);
  /* тонкие участки: размыкание 2 клетки (8 u) */
  let e=m;for(let i=0;i<2;i++)e=er(e,W,H);let o=e;for(let i=0;i<2;i++)o=di(o,W,H);let thin=0,ink=0;for(let k=0;k<m.length;k++){if(m[k])ink++;if(m[k]&&!o[k])thin++;}
  /* щели: замыкание 1 клетка (4 u -> зазор < 8 u) */
  let d=di(m,W,H);let c=er(d,W,H);let slit=0;for(let k=0;k<m.length;k++)if(c[k]&&!m[k])slit++;
  return {parts,holes,thin:thin/ink,thinN:thin,slit};}const A=APPLIK;
const chars=F.CHARSET.filter(c=>c.trim()&&c.charCodeAt(0)>32&&!/[   ]/.test(c));
const items=[],seen=new Set();for(const ch of chars){const m=A.mapChar(ch);if(!m||!A.REC[m.id])continue;const k=m.id+'|'+(m.lc?1:0);if(seen.has(k))continue;seen.add(k);items.push({ch,id:m.id,lc:m.lc,k});}
const D=F.DEFAULTS.regular;
const mk=o=>M.paramLimits({...D,...o},'applik').q;
if(process.env.LOC){const [ch,stem,sd]=process.env.LOC.split(',');
const g=F.raw(ch,mk({stem:+stem,cseed:+sd,cjit:50}));
let x0=1e9,y0=1e9;const polys=g.contours.map(c=>A.flat(c.nodes,6));for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);}
const {m,W,H}=raster(g.contours);const bg=label(m,W,H,0);const touch=new Set();for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
const cen={};for(let k=0;k<W*H;k++){const c=bg.L[k];if(c<0||touch.has(c))continue;const i=k%W,j=(k-i)/W;(cen[c]=cen[c]||{n:0,x:0,y:0});cen[c].n++;cen[c].x+=i;cen[c].y+=j;}
for(const c in cen){const o=cen[c];console.log('hole area',o.n*U*U,'at x',Math.round(x0+(o.x/o.n-5)*U),'y',Math.round(y0+(H-(o.y/o.n)-5)*U),'(glyph H',g.H,'adv',g.adv,')');}
process.exit(0);}
if(process.env.DRAW){const [ch,stem,sd]=process.env.DRAW.split(',');const g=F.raw(ch,mk({stem:+stem,cseed:+sd,cjit:50}));
require('fs').writeFileSync(process.argv[2],JSON.stringify(g.contours.map(c=>({hole:c.hole,pts:A.flat(c.nodes,8)}))));process.exit(0);}
const ids=(process.argv[2]||'RSrs');const seeds=+(process.argv[3]||30);
const res={};
for(const ch of ids){for(const stem of [106,150,192,226,232]){let bad=0,disc=0,tot=0,ex=[];for(let sd=0;sd<seeds;sd++){
  const p=mk({stem,cseed:sd,cjit:50});const g=F.raw(ch,p);const t=topo(g);tot++;
  const hs=t.holes.slice().sort((a,b)=>a-b);const ref=A.mapChar(ch);
  const pin=hs.filter(a=>a<600).length;if(pin)bad++;if(t.parts.length>1)disc++;if(ex.length<3&&(pin||t.parts.length>1))ex.push('s'+sd+' holes'+hs.map(Math.round)+' parts'+t.parts.length);}
  console.log(ch,'stem',stem,'pinhole',bad+'/'+tot,'multi-part',disc+'/'+tot,ex.join(' | '));}}
