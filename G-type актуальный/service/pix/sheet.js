const PXE=require('./engine.js');const G=require('./glyphs1.js')(PXE);require('./glyphs2.js')(PXE,G);require('./glyphs3.js')(PXE,G);
const R4=require('./glyphs4.js')(PXE,G);require('./glyphs5.js')(PXE,G,R4.T);
const fs=require('fs');
function glyph(ch,res,pw,serif){const K=PXE.ctx(res,pw,serif);const B=R4.build(ch,K);return B?{K,cells:B.cells()}:null;}
module.exports={PXE,G,R4,glyph};
if(require.main===module){
 const [,,str,res,pw,serif,out]=process.argv;const R=+res||12;const rows=str.split('|');const sheet=[];
 for(const line of rows){const gl=[];for(const ch of line){const g=glyph(ch,R,+pw||1.5,+serif||0);gl.push({ch,cells:g?g.cells:null,H:g&&g.K.H});}sheet.push(gl);}
 fs.writeFileSync(out||'sheet.json',JSON.stringify({res:R,sheet}));
}
