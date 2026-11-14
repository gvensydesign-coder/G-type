// Dumps LANG_DB and the CHARSET-based coverage of every font as JSON (used by tests/meta_check.py).
// usage: node tests/lang_dump.js > out.json
const fs=require('fs'),path=require('path');
const M=new Function(fs.readFileSync(path.join(__dirname,'..','core_all.js'),'utf8')+'\nreturn {FONTS,useFont,LANG_DB,LANG_CORE,langCover,langMissText};')();
const out={db:M.LANG_DB,core:M.LANG_CORE,fonts:{}};
for(const id of Object.keys(M.FONTS)){
  M.useFont(id);const f=M.FONTS[id];
  out.fonts[id]={family:f.family,cover:M.langCover(id).map(r=>({id:r.id,status:r.status,missing:M.langMissText(r)}))};
}
process.stdout.write(JSON.stringify(out));
