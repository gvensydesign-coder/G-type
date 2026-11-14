const fs=require('fs');
const src=fs.readFileSync('core_all.js','utf8');
const mod=new Function(src+'\nreturn {FONTS,useFont,DEFAULTS,newLattice,buildTTF,CHARSET,finalGlyph,GL,weightOf};')();
const out=process.argv[2]||'.';
for(const id of Object.keys(mod.FONTS)){
  mod.useFont(id);const f=mod.FONTS[id];
  const mk=k=>({p:{...f.DEFAULTS[k]},lat:mod.newLattice(),hg:[],kern:{}});
  const state={family:f.family,edits:{},styles:{regular:mk('regular'),italic:mk('italic')}};
  /* вес — как в интерфейсе (ui_c: weightOf по прямому начертанию): имена и usWeightClass в TTF соответствуют толщине */
  const w=mod.weightOf(state.styles.regular.p);
  for(const k of ['regular','italic']){const r=mod.buildTTF(k,state,{weight:w.weight,weightName:w.name});fs.writeFileSync(out+'/lib-'+id+'-'+k+'.ttf',Buffer.from(r.bytes));console.log(id,k,w.name,w.weight,r.psName||'',r.bytes.length,r.glyphCount);}
}
