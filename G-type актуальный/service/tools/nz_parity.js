/* parity of the product glyph (skeleton fit + round pen + union) vs the generator reference (union of discs along the polyline strokes).
   usage: node tools/nz_parity.js [nlw=5] [wob=80] [join=40] [seed=1] [width=30]   -> XOR / reference ink at 200 px cap height (3x supersampled) */
const M=require('./nz_load.js');M.useFont('nit');const Z=M.NZS,NIT=M.NIT;
const a=process.argv.slice(2).map(Number);const P={nlw:a[0]??5,nwob:a[1]??80,njn:a[2]??40,nseed:a[3]??1,nwd:a[4]??30};
const e=Z.eng(P);const sc=200/740*(+process.env.SS||8);const R=M.CSG_R;
let worst=[],sum=0,n=0;
for(const ch of Z.ALL){const g=NIT.glyph(ch,{S:e.S,width:e.width,wob:e.wob,join:e.join,seed:e.seed});if(!g||!g.strokes.length)continue;
  const raw=Z.build(ch,e);if(!raw.cs.length)continue;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const s of g.strokes)for(const p of s.pts){x0=Math.min(x0,p[0]-s.w);x1=Math.max(x1,p[0]+s.w);y0=Math.min(y0,p[1]-s.w);y1=Math.max(y1,p[1]+s.w);}
  const W=Math.ceil((x1-x0)*sc)+2,H=Math.ceil((y1-y0)*sc)+2;
  const A=new Uint8Array(W*H);
  for(const s of g.strokes){const r=s.w/2,r2=r*r,pts=s.dot&&s.pts.length<2?[s.pts[0]]:s.pts;
    for(let i=0;i<Math.max(1,pts.length-1);i++){const p=pts[i],q=pts[Math.min(i+1,pts.length-1)];
      const bx0=Math.max(0,Math.floor((Math.min(p[0],q[0])-r-x0)*sc)),bx1=Math.min(W-1,Math.ceil((Math.max(p[0],q[0])+r-x0)*sc)),by0=Math.max(0,Math.floor((y1-Math.max(p[1],q[1])-r)*sc)),by1=Math.min(H-1,Math.ceil((y1-Math.min(p[1],q[1])+r)*sc));
      const dx=q[0]-p[0],dy=q[1]-p[1],l2=dx*dx+dy*dy||1;
      for(let yy=by0;yy<=by1;yy++)for(let xx=bx0;xx<=bx1;xx++){const X=x0+(xx+0.5)/sc,Y=y1-(yy+0.5)/sc;let t=((X-p[0])*dx+(Y-p[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const ex=X-(p[0]+dx*t),ey=Y-(p[1]+dy*t);if(ex*ex+ey*ey<=r2)A[yy*W+xx]=1;}}}
  const B=new Uint8Array(W*H);
  const polys=raw.cs.map(c=>M.flatC(c,10).map(q=>[(q[0]-x0)*sc*R,(y1-q[1])*sc*R]));
  M.csgMask(polys,0,0,W,H,B,1);
  let ink=0,xor=0;for(let i=0;i<W*H;i++){ink+=A[i];xor+=A[i]^B[i];}
  const r=xor/ink*100;sum+=r;n++;worst.push([r,ch]);}
worst.sort((u,v)=>v[0]-u[0]);
console.log('params',JSON.stringify(P),'glyphs',n,'mean XOR %',(sum/n).toFixed(2),'worst',worst.slice(0,8).map(w=>w[1]+':'+w[0].toFixed(1)).join(' '));
