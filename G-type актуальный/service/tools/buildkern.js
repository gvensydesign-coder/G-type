// usage: node -r ./fixed_clock.js tools/buildkern.js <outdir> <fontIds> [overridesJSON] [styles=Regular,Black]
const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildTTF,famParams,FAM_W,weightOf,unionVMetrics,setVMetrics};')();
const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const ids=process.argv[3].split(',');const ov=process.argv[4]?JSON.parse(process.argv[4]):{};
const sty=(process.argv[5]||'Regular,Black').split(',');
for(const id of ids){M.useFont(id);const f=M.FONTS[id];Object.assign(f,ov[id]||ov['*']||{});
  for(const wn of sty){const wc=(M.FAM_W.find(w=>w[0]===wn)||[0,400])[1];
    const st={family:f.family,edits:{},styles:{}};
    for(const s of ['regular']){const p=M.famParams(f.DEFAULTS[s],wn);st.styles[s]={p,lat:M.newLattice(),hg:[],kern:{}};}
    const r=M.buildTTF('regular',st,{weight:wc,weightName:wn});
    fs.writeFileSync(out+'/'+r.psName+'.ttf',Buffer.from(r.bytes));}}
