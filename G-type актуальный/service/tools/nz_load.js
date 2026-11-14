/* loads the dev build (unstripped, no UI) with the registered fonts; usage: const M=require('./nz_load.js') */
const fs=require('fs');
module.exports=new Function(fs.readFileSync(process.env.CORE||__dirname+'/../dev_all.js','utf8')+'\nreturn {FONTS,useFont,safeP,famParams,FAM_W,PARAMS,paramLimits,glyphWidth,finalGlyph,buildTTF,newLattice,NZS,NIT,csgMask,flatC,CSG_R,weightOf};')();
