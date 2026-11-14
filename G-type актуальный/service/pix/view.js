const PXE=require('./engine.js');const rec=require('./glyphs1.js');
const G=rec(PXE);require('./glyphs2.js')(PXE,G);
function build(ch,res,pw,serif){const K=PXE.ctx(res,pw,serif);const B=new PXE.Bm(K);const P=PXE.prims(K,B);
  const f=G[ch];if(!f)return null;f(P);return {K,B};}
function show(chs,res,pw,serif){const out=[];for(const ch of chs){const r=build(ch,res,pw,serif);if(!r){out.push([ch+' ?']);continue;}
  const cs=r.B.cells();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const lines=[];const Y1=Math.max(y1,r.K.H-1),Y0=Math.min(y0,0);
  for(let y=Y1;y>=Y0;y--){let s='';for(let x=Math.min(x0,0);x<=x1;x++)s+=r.B.g(x,y)?'#':(y===0&&0?'_':'.');lines.push(s);}
  out.push([ch,...lines]);}
  const h=Math.max(...out.map(o=>o.length));
  for(let i=0;i<h;i++){console.log(out.map(o=>(o[i]||'').padEnd(Math.max(...o.map(l=>l.length))+2)).join(''));}}
const [,, chs, res, pw, serif]=process.argv;
show(chs.split(''),+res||12,+pw||1.5,+serif||0);
