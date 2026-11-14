// usage: node vf.js [fonts] [outdir]  -> variable TTF per font/style (family-wide vertical metrics)
const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildVariableTTF,buildVariablePair,unionVMetrics,setVMetrics};')();
const ids=(process.argv[2]||Object.keys(M.FONTS).join(',')).split(','),out=process.argv[3]||'vf';
const axes=(process.argv[4]||'wght').split(',').filter(Boolean),uniwidth=/uw/.test(process.argv[5]||'');
fs.mkdirSync(out,{recursive:true});
(async()=>{for(const id of ids){M.useFont(id);const f=M.FONTS[id];
  const st={family:f.family,edits:{},styles:{}};
  for(const s of ['regular','italic'])st.styles[s]={p:{...f.DEFAULTS[s]},lat:M.newLattice(),hg:[],kern:{}};
  const t0=Date.now(),sty=(process.env.STY||'regular,italic').split(','),rs={};
  for(const s of sty)rs[s]=await M.buildVariableTTF(s,st,{fontId:id,axes,uniwidth});
  const VMu=M.unionVMetrics(sty.flatMap(s=>rs[s].vmList));for(const s of sty)rs[s].bytes=M.setVMetrics(rs[s].bytes,VMu);
  for(const s of sty){const r=rs[s];fs.writeFileSync(out+'/'+id+'-'+s+'-VF.ttf',Buffer.from(r.bytes));
    console.log(id,s,r.bytes.length,'bytes',r.glyphCount,'glyphs','collapsed-contour glyphs',r.fallbacks.length,r.fallbacks.slice(0,6).join(' '),'axes',r.axes.join('+'),'dropped',r.axesDropped.join(','),'masters',r.masters,r.uniwidth?'uwTight '+r.uniwidth.length:'');}
  console.log(id,'total',(Date.now()-t0)+'ms');
}
})();
