const fs=require('fs');
let src=fs.readFileSync(__dirname+'/ap_pin.js','utf8');
src=src.split("const mk=o=>M.paramLimits")[0];
eval(src.replace(/^const /gm,'var ').replace(/process\.argv\[2\]==='pres'/,'false'));
var mk=o=>M.paramLimits({...D,...o},'applik').q;
const ch=process.argv[2]||'R',stem=+process.argv[3]||226,sd=+process.argv[4]||0;
const g=F.raw(ch,mk({stem,cseed:sd,cjit:50}));
let x0=1e9,y0=1e9;const polys=g.contours.map(c=>A.flat(c.nodes,6));for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);}
const {m,W,H}=raster(g.contours);const bg=label(m,W,H,0);const touch=new Set();for(let i=0;i<W;i++){touch.add(bg.L[i]);touch.add(bg.L[(H-1)*W+i]);}for(let j=0;j<H;j++){touch.add(bg.L[j*W]);touch.add(bg.L[j*W+W-1]);}
const cen={};for(let k=0;k<W*H;k++){const c=bg.L[k];if(c<0||touch.has(c))continue;const i=k%W,j=(k-i)/W;(cen[c]=cen[c]||{n:0,x:0,y:0});cen[c].n++;cen[c].x+=i;cen[c].y+=j;}
for(const c in cen){const o=cen[c];console.log('hole area',o.n*U*U,'at x',Math.round(x0+(o.x/o.n-5)*U),'y(top-down from ymin)',Math.round(y0+(o.y/o.n-5)*U),'glyph H',g.H,'adv',g.adv);}
