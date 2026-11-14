// usage: node -r ./fixed_clock.js famuw.js [fonts] [outdir]  -> uniwidth family TTFs (advance of every weight and the italic = Regular)
const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,famBuildAll,unionVMetrics,setVMetrics};')();
const ids=(process.argv[2]||Object.keys(M.FONTS).join(',')).split(','),out=process.argv[3]||'famuw';
fs.mkdirSync(out,{recursive:true});
for(const id of ids){M.useFont(id);const f=M.FONTS[id];
  const st={family:f.family,edits:{},styles:{}};
  for(const s of ['regular','italic'])st.styles[s]={p:{...f.DEFAULTS[s]},lat:M.newLattice(),hg:[],kern:{}};
  const built=M.famBuildAll(st,true),VM=M.unionVMetrics(built.map(b=>b.r.metrics));
  const rep=[];
  for(const b of built){fs.writeFileSync(out+'/'+b.r.psName+'.ttf',Buffer.from(M.setVMetrics(b.r.bytes,VM)));
    if(b.r.uwTight&&b.r.uwTight.length){const t=b.r.uwTight.map(x=>parseFloat(x.split(':')[1]));rep.push(b.wn+(b.k==='italic'?'-It':'')+' '+t.length+' glyphs tightened, max '+Math.max(...t).toFixed(1)+'%');}}
  console.log(id,'uniwidth ok;',rep.join('; '));
  fs.writeFileSync(out+'/'+id+'-tight.json',JSON.stringify(built.filter(b=>b.r.uwTight&&b.r.uwTight.length).map(b=>({w:b.wn,k:b.k,g:b.r.uwTight}))));
}
