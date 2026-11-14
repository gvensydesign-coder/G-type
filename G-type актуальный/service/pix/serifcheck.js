/* node pix/serifcheck.js : засечки и острова по всем знакам, разрешениям 6..24 и весам (только допустимые таблицей пределов); печатает bad N */
const S=require('./sheet.js');const L=require('./gen_limits.js');
const lim=(()=>{try{return JSON.parse(require('fs').readFileSync(__dirname+'/limits.json','utf8')).table}catch(e){return null}})();
let bad=0;const seen={};
for(let res=6;res<=24;res++)for(const serif of [1]){const mx=lim&&lim[res]?lim[res][1]:3;
  for(let pw=1;pw<=Math.max(1,mx);pw+=0.5){const K=S.PXE.ctx(res,pw,serif);
    for(const ch of L.CHARS){const r=S.R4.serifAudit(ch,K);if(r.length){bad++;if(!seen[r[0]]&&Object.keys(seen).length<25){seen[r[0]]=1;console.log(res,pw,r[0]);}}}}}
console.log('bad',bad);process.exit(bad?1:0);
