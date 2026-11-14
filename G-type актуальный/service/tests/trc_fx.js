// usage: node tests/trc_fx.js <out.json> <fontId> <chars> : flattened glyph polygons (font units, y up) for raster fixtures
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../core_all.js','utf8');
const m=new Function(src+'\nreturn {FONTS,useFont,newLattice,finalGlyph,csgFlatten};')();
const [out,fid,chars]=[process.argv[2],process.argv[3]||'kvadra',process.argv[4]||'HTOSa'];
m.useFont(fid);const f=m.FONTS[fid];const st={p:{...f.DEFAULTS.regular},lat:m.newLattice(),hg:[],kern:{}};
const res={};
for(const ch of chars){const g=m.finalGlyph(ch,st,{},{});if(!g)continue;
  res[ch]={adv:g.adv,cs:g.cs.map(c=>({hole:c.hole,pts:m.csgFlatten(c).map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)])}))};}
fs.writeFileSync(out,JSON.stringify(res));console.log(Object.keys(res).join(''));
