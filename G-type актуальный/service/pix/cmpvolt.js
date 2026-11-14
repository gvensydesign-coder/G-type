const fs=require('fs');const {topo,REF,CHARS}=require('./gen_limits.js');
const T=require('../topolib.js')(fs.readFileSync(__dirname+'/../core_all.js','utf8'));
const r=T.refTopo('volt','regular');const o=[];
for(const c of CHARS){if(!r[c]||!REF[c])continue;const v=r[c][0];if(v!==REF[c])o.push(c+':volt '+v+' px '+REF[c]);}
console.log(o.join('  '));
