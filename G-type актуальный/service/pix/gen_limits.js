/* gen_limits.js: топология знаков по (res, serif, pw) против эталона res12/pw1.5/serif0. node gen_limits.js [report] */
const fs=require('fs');
const S=require('./sheet.js');
const src=fs.readFileSync(__dirname+'/../core_all.js','utf8');
const V=new Function(src+';return FONTS.volt;')();
const CHARS=V.CHARSET.filter(c=>!/[\s   ]/.test(c));
function topo(cells){const set=new Map();for(const [x,y] of cells)set.set(x+','+y,1);
  if(!set.size)return '0/0';
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cells){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  x0--;y0--;x1++;y1++;const W=x1-x0+1,H=y1-y0+1;const m=new Uint8Array(W*H);for(const [x,y] of cells)m[(y-y0)*W+(x-x0)]=1;
  const lab=(val)=>{const L=new Int32Array(W*H);let n=0;const border=new Set();const sz=[];
    for(let i=0;i<W*H;i++){if(m[i]!==val||L[i])continue;n++;const st=[i];L[i]=n;let s=0,b=false;
      while(st.length){const k=st.pop();s++;const x=k%W,y=(k-x)/W;if(x===0||y===0||x===W-1||y===H-1)b=true;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(m[j]===val&&!L[j]){L[j]=n;st.push(j);}}}
      sz.push([s,b]);}
    return sz;};
  const ink=lab(1).length,bg=lab(0).filter(a=>!a[1]).length;return ink+'/'+bg;}
function cellsOf(ch,res,pw,serif){const g=S.glyph(ch,res,pw,serif);return g?g.cells:null;}
const REF={};for(const c of CHARS){const k=cellsOf(c,12,1.5,0);if(k)REF[c]=topo(k);}
const TINY_EXEMPT=new Set(['4','%','&','Đ','Æ']);/* на 5-6 клетках эти знаки не могут держать топологию эталона */
const ALLOW={'0':new Set(['1/1','1/2'])};/* нуль с чертой: на мелком кегле просвет слишком мал для черты — гладкий нуль */
function bad(res,pw,serif){const o=[];for(const c of CHARS){if(serif&&S.R4.T[c]&&S.R4.serifAudit(c,S.PXE.ctx(res,pw,serif)).length)o.push(c+':serif');const k=cellsOf(c,res,pw,serif);if(!k||!REF[c])continue;const t=topo(k);if(t!==REF[c]&&!(ALLOW[c]&&ALLOW[c].has(t)))o.push(c+':'+REF[c]+'>'+t);}return o;}
/* alternates: same topology as their base at the same sliders */
const altsLib=require('./alts.js');
let MX=(h,serif)=>3;
const A=()=>altsLib(S.PXE,S.R4,(h,serif)=>MX(h,serif));
const sh=(cs,dy)=>cs.map(c=>[c[0],c[1]+dy,c[2]]);
function altBad(res,pw,serif){const L=A(),o=[];const K=S.PXE.ctx(res,pw,serif),q={res,pw,pserif:serif};
  const mk=(f,ch)=>{const B=f.build(K,q);const cs=B?B.cells():null;if(!cs)return null;const dy=typeof f.dy==='function'?f.dy(K):(f.dy||0);return dy?sh(cs,dy):cs;};
  for(const d of '0123456789'){const bt=d==='0'?topo(S.R4.buildSpec({r:'0p',k:'cap'},S.PXE.ctx(res,pw,serif)).cells()):topo(cellsOf(d,res,pw,serif));
    for(const kind of ['osf','numr','dnom','subs']){const cs=mk(L[kind](d),d);if(!cs||topo(cs)!==bt)o.push(d+'.'+kind+':'+bt+'>'+(cs?topo(cs):'null'));}}
  for(const ch of CHARS){if(!/\p{Lu}/u.test(ch)||/[ßǅ]/.test(ch)||!S.R4.T[ch])continue;const bt=topo(cellsOf(ch,res,pw,serif)||[]);
    const B=L.sc(ch)(K,q);const cs=B?B.cells():null;if(!cs||topo(cs)!==bt)o.push(ch+'.sc:'+bt+'>'+(cs?topo(cs):'null'));}
  return o;}
module.exports={topo,bad,REF,CHARS,cellsOf,altBad,setMX:f=>{MX=f;}};
if(require.main===module&&process.argv[2]==='table'){
 const pass=(withAlts,T1)=>{const tab={};
  if(T1)MX=(h,serif)=>{const r=T1[CLp(h,5,24)];return r?Math.max(1,r[serif?1:0]):1;};
  for(let res=5;res<=24;res++){tab[res]=[];for(const serif of [0,1]){let mx=0;
    for(let i=0;i<=8;i++){const pw=1+i/2;if(bad(res,pw,serif).length)break;if(withAlts){const ab=altBad(res,pw,serif);if(ab.length){if(process.env.DBG)console.error('alt',res,serif,pw,ab.slice(0,12).join(' '));break;}}mx=pw;}tab[res].push(mx);}}
  return tab;};
 const CLp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const setMX=f=>{MX=f;};MX=(h,serif)=>3;
 const t1=pass(false);const tab=pass(true,t1);
 /* rmin: наименьшее разрешение, для которого и гротеск, и засечки держат топологию на самом лёгком весе, и выше него нет дыр */
 let ok=24;for(let res=24;res>=5;res--){if(tab[res][0]>0)ok=res;else break;}
 if(process.env.PXFAKE){for(let r=5;r<=24;r++)tab[r]=[Math.min(5,Math.floor(r/3)),Math.min(5,Math.floor(r/3))];ok=6;}
 console.log(JSON.stringify({rmin:ok,table:tab}));process.exit(0);}
if(require.main===module&&process.argv[2]==='unstable'){
 const cnt={};for(let res=8;res<=24;res++)for(const serif of [0,1])for(const pw of [1,1.5,2,3]){for(const x of bad(res,pw,serif)){const c=x.split(':')[0];cnt[c]=(cnt[c]||0)+1;}}
 console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([c,n])=>c+' '+REF[c]+' x'+n).join(' | '));process.exit(0);}
if(require.main===module){
 const rep=process.argv[2]==='report';const tab={};
 for(let res=5;res<=24;res++){tab[res]=[];for(const serif of [0,1]){let mx=-1;const fails={};
   for(let i=0;i<=8;i++){const pw=1+i/2;const b=bad(res,pw,serif);if(rep&&(i===0||i===8))fails[pw]=b;if(!b.length)mx=pw;else if(!rep)break;}
   tab[res].push(mx);
   if(rep)console.log('res',res,'s',serif,'max',mx,'n@1',(fails[1]||[]).length,(fails[1]||[]).slice(0,14).join(' '));}}
 console.log(JSON.stringify(tab));
}
