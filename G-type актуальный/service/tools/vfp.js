const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,famParams,vfStateAtW,FAM_W,finalGlyph};')();
const id=process.argv[2];M.useFont(id);const f=M.FONTS[id];
const st={family:f.family,edits:{},styles:{regular:{p:{...f.DEFAULTS.regular},lat:M.newLattice(),hg:[],kern:{}}}};
console.log('FAM_W',JSON.stringify(M.FAM_W));
for(const wn of ['Light','Regular','Bold','Black']){const p=M.famParams(f.DEFAULTS.regular,wn);console.log(wn,JSON.stringify({stem:p.stem,hair:p.hair,wdth:p.wdth,sb:p.sb}));}
for(const w of [300,400,700,900]){const s=M.vfStateAtW('regular',st,w);console.log(w,JSON.stringify({stem:s.p.stem,hair:s.p.hair,wdth:s.p.wdth,sb:s.p.sb}));
 const g=M.finalGlyph(process.argv[3]||'А',s,{});console.log('  glyph',process.argv[3]||'А',g.adv,g.cs.length,g.cs[0].nodes.length,JSON.stringify(g.cs[0].nodes.slice(0,2).map(n=>[Math.round(n.x),Math.round(n.y)])));}
