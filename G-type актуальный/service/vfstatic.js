// usage: node vfstatic.js <font> <outdir> [style]  -> static TTFs at axis points (named instances + opsz/slnt corners + 6 random) and points.json
const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildTTF,vfxPlan,vfxStyleState};')();
const id=process.argv[2],out=process.argv[3],sty=process.argv[4]||'regular';
fs.mkdirSync(out,{recursive:true});M.useFont(id);const f=M.FONTS[id];
const st={family:f.family,edits:{},styles:{}};
for(const s of ['regular','italic'])st.styles[s]={p:{...f.DEFAULTS[s]},lat:M.newLattice(),hg:[],kern:{}};
const plan=M.vfxPlan(sty,st,['wght','wdth','opsz','slnt']);
const wd=plan.axes.find(a=>a.tag==='wdth');
const hasS=plan.axes.some(a=>a.tag==='slnt'),pts=[];/* fonts without the slnt axis (Renessa): every point stays upright */
for(const w of [300,400,700,900])for(const d of (wd?[wd.min,100,wd.max]:[100]))pts.push({wght:w,wdth:d,opsz:14,slnt:0,kind:'named'});
pts.push({wght:400,wdth:100,opsz:8,slnt:0,kind:'opsz'},{wght:400,wdth:100,opsz:72,slnt:0,kind:'opsz'},{wght:400,wdth:100,opsz:24,slnt:0,kind:'mid'},{wght:550,wdth:100,opsz:14,slnt:0,kind:'mid'},{wght:400,wdth:wd?Math.max(wd.min,Math.min(wd.max,88)):100,opsz:14,slnt:hasS?-6:0,kind:'mid'});
if(hasS)pts.push({wght:400,wdth:100,opsz:14,slnt:-12,kind:'slnt'});
let s=7;const r=()=>(s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;
for(let i=0;i<20;i++){const a=plan.axes;const o={wght:Math.round(300+r()*600),wdth:Math.round(wd?wd.min+r()*(wd.max-wd.min):100),opsz:Math.round(8+r()*64),slnt:hasS?Math.round(-12*r()):(r(),0),kind:'rand'};pts.push(o);}
pts.forEach((p,i)=>{p.file='s'+i+'.ttf';const stt=M.vfxStyleState(sty,st,p);
 const state={family:f.family,edits:{},styles:{[sty]:stt}};
 fs.writeFileSync(out+'/'+p.file,Buffer.from(M.buildTTF(sty,state,{weight:p.wght,weightName:'Regular',fontId:id}).bytes));});
fs.writeFileSync(out+'/points.json',JSON.stringify(pts));console.log(id,'static points',pts.length);
