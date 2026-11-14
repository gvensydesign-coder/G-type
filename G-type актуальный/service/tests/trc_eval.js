// usage: node tests/trc_eval.js <fxdir> [filter] [json]  — traces every *_clean/_photo fixture, prints IoU / nodes / time
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','core_all.js'),'utf8');
const m=new Function(src+'\nreturn {trcGrayOf,trcPrepare,trcSync,trcOtsu,csgFlatten,csgMask,impBBox};')();
function pgm(p){const b=fs.readFileSync(p);let o=0;const tok=()=>{while(b[o]<=32)o++;let s='';while(b[o]>32)s+=String.fromCharCode(b[o++]);return s;};
  tok();const W=+tok(),H=+tok();tok();o++;return {W,H,d:b.subarray(o,o+W*H)};}
function rgbaOf(P){const a=new Uint8ClampedArray(P.W*P.H*4);for(let i=0;i<P.W*P.H;i++){a[4*i]=a[4*i+1]=a[4*i+2]=P.d[i];a[4*i+3]=255;}return a;}
function iou(res,truth,W,H){
  const mask=new Uint8Array(W*H),{ox,oy,u}=res.tf;
  const polys=res.cs.map(c=>m.csgFlatten(c).map(p=>[ox+p[0]/u,oy-p[1]/u]));
  m.csgMask(polys,0,0,W,H,mask,1);
  let I=0,U=0;for(let i=0;i<W*H;i++){const a=mask[i]===1,b=truth[i]<128;if(a&&b)I++;if(a||b)U++;}return I/U;}
function run(dir,filter,opt){
  const rows=[];
  for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.pgm')&&(!filter||f.includes(filter))).sort()){
    const P=pgm(path.join(dir,f)),img=m.trcGrayOf(rgbaOf(P),P.W,P.H);
    const clean=pgm(path.join(dir,f.replace(/_(clean|photo)/,'_clean')));
    const prep=m.trcPrepare(img,img.inv);const t0=Date.now();
    const r=m.trcSync(prep,Object.assign({thr:prep.otsu,smooth:40,speck:4},opt||{}));
    if(r.err){rows.push({f,err:r.err,n:r.n});continue;}
    rows.push({f:f.replace('.pgm',''),iou:+iou(r,clean.d,P.W,P.H).toFixed(4),nodes:r.nodes,loops:r.loops,ms:Date.now()-t0});}
  return rows;}
if(require.main===module){const rows=run(process.argv[2],process.argv[3]);for(const r of rows)console.log(r.f.padEnd(24),r.err?('ERR '+r.err+' '+(r.n||'')):('iou '+r.iou+'  nodes '+r.nodes+'  loops '+r.loops+'  '+r.ms+'ms'));
  const ok=rows.filter(r=>!r.err);console.log('min iou clean',Math.min(...ok.filter(r=>/clean/.test(r.f)).map(r=>r.iou)),'min iou photo',Math.min(...ok.filter(r=>/photo/.test(r.f)).map(r=>r.iou)));}
module.exports={run};
