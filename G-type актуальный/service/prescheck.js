/* node prescheck.js <core_all.js> out.json — отпечатки контуров для умолчаний, каждого метода/пресета и весов семейства */
const fs=require('fs'),crypto=require('crypto');
const M=new Function(fs.readFileSync(process.argv[2],'utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,famParams,FAM_W,safeP};')();
const CH=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя0123456789&@%$'];
const out={};
const fp=(id,p)=>{const st={p,lat:M.newLattice(),hg:[],kern:{}};const h=crypto.createHash('md5');const per={};
  for(const c of CH){if(!M.FONTS[id].GL[c])continue;const g=M.finalGlyph(c,st,{},{});const s=JSON.stringify(g.cs.map(q=>q.nodes.map(n=>[Math.round(n.x),Math.round(n.y)])))+g.adv.toFixed(0);h.update(s);per[c]=crypto.createHash('md5').update(s).digest('hex').slice(0,6);}
  return {h:h.digest('hex').slice(0,10),per};};
for(const id of ['volt','kvadra','codex']){M.useFont(id);const f=M.FONTS[id];
  for(const sty of ['regular','italic']){const D=f.DEFAULTS[sty];
    out[id+'|'+sty+'|default']=fp(id,{...D});
    for(const [mn,,opts] of f.methods||[])for(const [on,o] of opts){const p={...D};const nv={};for(const k in o)nv[k]=typeof o[k]==='function'?o[k](p):o[k];Object.assign(p,nv);out[id+'|'+sty+'|'+mn+':'+on]=fp(id,p);}
    for(const [wn] of M.FAM_W)out[id+'|'+sty+'|fam:'+wn]=fp(id,M.famParams(D,wn));
  }}
fs.writeFileSync(process.argv[3],JSON.stringify(out));
