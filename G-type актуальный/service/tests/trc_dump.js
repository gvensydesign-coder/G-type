// node tests/trc_dump.js <fxdir> <out.json> [opts json]  — trace outlines (pixel coords, flattened + nodes) for overlay drawing
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','core_all.js'),'utf8');
const m=new Function(src+'\nreturn {trcGrayOf,trcPrepare,trcSync,csgFlatten};')();
const dir=process.argv[2],opt=JSON.parse(process.argv[4]||'{}'),out={};
function pgm(p){const b=fs.readFileSync(p);let o=0;const tok=()=>{while(b[o]<=32)o++;let s='';while(b[o]>32)s+=String.fromCharCode(b[o++]);return s;};tok();const W=+tok(),H=+tok();tok();o++;return {W,H,d:b.subarray(o,o+W*H)};}
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.pgm'))){const P=pgm(path.join(dir,f));const a=new Uint8ClampedArray(P.W*P.H*4);for(let i=0;i<P.W*P.H;i++){a[4*i]=a[4*i+1]=a[4*i+2]=P.d[i];a[4*i+3]=255;}
  const img=m.trcGrayOf(a,P.W,P.H),prep=m.trcPrepare(img,img.inv),r=m.trcSync(prep,Object.assign({thr:prep.otsu,smooth:40,speck:4},opt));if(r.err)continue;
  const {ox,oy,u}=r.tf,T=p=>[ox+p.x/u,oy-p.y/u];
  out[f.replace('.pgm','')]={cs:r.cs.map(c=>({hole:c.hole,poly:m.csgFlatten(c).map(p=>[ox+p[0]/u,oy-p[1]/u]),nodes:c.nodes.map(n=>({p:T(n),a:n.a&&T(n.a),b:n.b&&T(n.b)}))}))};}
fs.writeFileSync(process.argv[3],JSON.stringify(out));
