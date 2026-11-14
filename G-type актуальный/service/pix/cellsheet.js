/* node pix/cellsheet.js "text|text2" res pw serif out.json -> JSON for pix/cellsheet.py */
const S=require('./sheet.js');const fs=require('fs');
const [,,txt,res,pw,serif,out]=process.argv;
const rows=txt.split('|').map(l=>[...l].map(ch=>{if(ch===' ')return {ch,cells:[],sp:1};const g=S.glyph(ch,+res,+pw,+serif);return {ch,cells:g?g.cells.map(c=>[c[0],c[1]]):null};}));
fs.writeFileSync(out,JSON.stringify({res:+res,rows}));
