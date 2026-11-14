const fs=require('fs');
const src=fs.readFileSync('core_all.js','utf8');
const M=new Function(src+'\nreturn {FONTS,useFont,DEFAULTS,newLattice,CHARSET,finalGlyph,GL};')();
const ids=process.argv[2]?process.argv[2].split(','):Object.keys(M.FONTS);
const style=process.argv[3]||'regular';
const R=4; // units per pixel
function flat(c){const pts=[];const n=c.nodes;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
  const p0=[a.x,a.y],p3=[b.x,b.y],p1=a.b?[a.b.x,a.b.y]:p0,p2=b.a?[b.a.x,b.a.y]:p3;
  for(let t=0;t<1;t+=1/12){const u=1-t;pts.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}}return pts;}
function raster(polys,x0,y0,W,H){const wn=new Int16Array(W*H);
  for(const P of polys){for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(a[1]===b[1])continue;
    const dir=b[1]>a[1]?1:-1;const ylo=Math.min(a[1],b[1]),yhi=Math.max(a[1],b[1]);
    for(let r=Math.max(0,Math.ceil((ylo-y0)/R-0.5));r<H;r++){const y=y0+(r+0.5)*R;if(y>=yhi)break;if(y<ylo)continue;
      const x=a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]);const cidx=Math.max(0,Math.min(W,Math.ceil((x-x0)/R-0.5)));
      for(let q=cidx;q<W;q++)wn[r*W+q]+=dir;}}}
  return wn;}
const out={};
for(const id of ids){M.useFont(id);const f=M.FONTS[id];const p={...f.DEFAULTS[style],rough:0,slant:0};
  const st={p,lat:M.newLattice(),hg:[],kern:{}};const rep=[];
  for(const ch of f.CHARSET){if(ch===' '||ch.charCodeAt(0)===160)continue;
    const g=M.finalGlyph(ch,st,{},{});if(!g||!g.cs.length)continue;
    // nodes may store handles differently; detect
    const polys=g.cs.map(c=>({hole:c.hole,P:flat(c)}));
    let xmin=1e9,xmax=-1e9,ymin=1e9,ymax=-1e9;polys.forEach(o=>o.P.forEach(([x,y])=>{xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}));
    const x0=xmin-8,y0=ymin-8,W=Math.ceil((xmax-xmin+16)/R),H=Math.ceil((ymax-ymin+16)/R);
    const all=raster(polys.map(o=>o.P),x0,y0,W,H);
    const outer=raster(polys.filter(o=>!o.hole).map(o=>o.P),x0,y0,W,H);
    let leak=0,ink=0;for(let i=0;i<W*H;i++){if(all[i]!==0)ink++;if(all[i]!==0&&outer[i]===0)leak++;}
    // components
    const seen=new Uint8Array(W*H);let comps=[];
    for(let i=0;i<W*H;i++){if(all[i]===0||seen[i])continue;let st2=[i],n=0;seen[i]=1;while(st2.length){const k=st2.pop();n++;const x=k%W,y=(k/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(all[j]!==0&&!seen[j]){seen[j]=1;st2.push(j);}}}comps.push(n);}
    comps=comps.filter(n=>n>6);
    const lsb=xmin, rsb=g.adv-xmax;
    rep.push({ch,w:Math.round(g.w),adv:Math.round(g.adv),lsb:Math.round(lsb),rsb:Math.round(rsb),ymin:Math.round(ymin),ymax:Math.round(ymax),leakPct:+(100*leak/Math.max(ink,1)).toFixed(1),comps:comps.length,inkW:Math.round(xmax-xmin),k:f.GL[ch].k});
  }
  out[id]={p,rep};
}
fs.writeFileSync('audit_'+style+'.json',JSON.stringify(out));
console.log('ok',Object.keys(out).join(','));
