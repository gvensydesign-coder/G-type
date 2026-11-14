const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,buildTTF,buildWOFF,unionVMetrics,setVMetrics,FAM_W,famParams,weightOf};')();
const W=M.FAM_W;
fs.mkdirSync('fam',{recursive:true});
(async()=>{
  for(const id of (process.argv[2]?process.argv[2].split(','):Object.keys(M.FONTS))){
    M.useFont(id);const f=M.FONTS[id],built=[];
    for(const [wn,wc] of W){
      const st={family:f.family,edits:{},styles:{}};
      for(const s of ['regular','italic']){const p=M.famParams(f.DEFAULTS[s],wn);st.styles[s]={p,lat:M.newLattice(),hg:[],kern:{}};}
      for(const s of ['regular','italic'])built.push(M.buildTTF(s,st,{weight:wc,weightName:wn}));
    }
    const VM=M.unionVMetrics(built.map(r=>r.metrics)); // единый интерлиньяж семейства
    for(const r of built){const b=M.setVMetrics(r.bytes,VM);
      fs.writeFileSync('fam/'+r.psName+'.ttf',Buffer.from(b));
      fs.writeFileSync('fam/'+r.psName+'.woff',Buffer.from(await M.buildWOFF(b)));}
    console.log(id,'ok',JSON.stringify(VM),'default=',JSON.stringify(M.weightOf(f.DEFAULTS.regular)),W.map(w=>w[0]+':'+JSON.stringify((({stem,hair,aper,innerR,join,trap})=>({stem,hair,aper,innerR,join,trap}))(M.famParams(f.DEFAULTS.regular,w[0])))).join(' '));
  }
})();
