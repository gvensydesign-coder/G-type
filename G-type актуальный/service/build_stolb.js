// usage: node build_stolb.js outdir [json overrides for regular params]
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/dev_all.js','utf8');
const M=new Function(src+'\nreturn {FONTS,useFont,DEFAULTS,newLattice,buildTTF,weightOf,famParams,FAM_W,paramLimits};')();
const out=process.argv[2]||'.';const ov=process.argv[3]?JSON.parse(process.argv[3]):{};const tag=process.argv[4]||'';
M.useFont('stolb');const f=M.FONTS.stolb;
const mk=k=>({p:M.paramLimits({...f.DEFAULTS[k],...ov},'stolb').q,lat:M.newLattice(),hg:[],kern:{}});
const state={family:f.family,edits:{},styles:{regular:mk('regular'),italic:mk('italic')}};
const w=M.weightOf(state.styles.regular.p);
for(const k of ['regular','italic']){const r=M.buildTTF(k,state,{weight:w.weight,weightName:w.name});fs.writeFileSync(out+'/stolb'+tag+'-'+k+'.ttf',Buffer.from(r.bytes));console.log('stolb',k,w.name,w.weight,r.psName||'',r.bytes.length,r.glyphCount);}
