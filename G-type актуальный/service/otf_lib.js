// usage: node -r ./fixed_clock.js otf_lib.js <outdir> <fontId[,id...]>  -> lib-<id>-{regular,italic}.{ttf,otf,woff2}  (W96-F: OTF/WOFF2 of the same build as t10lib.js)
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/core_all.js','utf8');
const mod=new Function(src+'\nreturn {FONTS,useFont,newLattice,buildTTF,weightOf,buildWOFF2:typeof buildWOFF2==="function"?buildWOFF2:null};')();
const out=process.argv[2]||'.',ids=(process.argv[3]||'volt').split(',');
(async()=>{for(const id of ids){
  mod.useFont(id);const f=mod.FONTS[id];
  const mk=k=>({p:{...f.DEFAULTS[k]},lat:mod.newLattice(),hg:[],kern:{}});
  const state={family:f.family,edits:{},styles:{regular:mk('regular'),italic:mk('italic')}};
  const w=mod.weightOf(state.styles.regular.p);
  for(const k of ['regular','italic']){
    const o={weight:w.weight,weightName:w.name},t=mod.buildTTF(k,state,o),c=mod.buildTTF(k,state,Object.assign({cff:true},o));
    const b='/lib-'+id+'-'+k;
    fs.writeFileSync(out+b+'.ttf',Buffer.from(t.bytes));fs.writeFileSync(out+b+'.otf',Buffer.from(c.bytes));
    let s='';if(mod.buildWOFF2){const t0=Date.now();const w2=await mod.buildWOFF2(t.bytes);fs.writeFileSync(out+b+'.ttf.woff2',Buffer.from(w2));s=' woff2='+w2.length+' ms='+(Date.now()-t0);}
    console.log(id,k,'ttf',t.bytes.length,'otf',c.bytes.length,s);
  }}})();
