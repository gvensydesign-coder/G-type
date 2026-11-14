// usage: node -r ./fixed_clock.js t10lib.js <outdir> <fontId>  -> writes lib-<id>-{regular,italic}.ttf (same as t10.js for one font)
const fs=require('fs');
const src=fs.readFileSync('core_all.js','utf8');
const mod=new Function(src+'\nreturn {FONTS,useFont,DEFAULTS,newLattice,buildTTF,CHARSET,finalGlyph,GL,weightOf};')();
const out=process.argv[2]||'.', id=process.argv[3];
mod.useFont(id);const f=mod.FONTS[id];
const mk=k=>({p:{...f.DEFAULTS[k]},lat:mod.newLattice(),hg:[],kern:{}});
const state={family:f.family,edits:{},styles:{regular:mk('regular'),italic:mk('italic')}};
const w=mod.weightOf(state.styles.regular.p);
for(const k of ['regular','italic']){const r=mod.buildTTF(k,state,{weight:w.weight,weightName:w.name});fs.writeFileSync(out+'/lib-'+id+'-'+k+'.ttf',Buffer.from(r.bytes));console.log(id,k,w.name,w.weight,r.psName||'',r.bytes.length,r.glyphCount);}
