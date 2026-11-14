const fs=require('fs');
const M=new Function(fs.readFileSync('core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,famParams,kernProfile,kernGap,classKernTable,kernMeasure,KMREF:()=>KMREF,GL:()=>GL};')();
const id=process.argv[2];M.useFont(id);const f=M.FONTS[id];Object.assign(f,JSON.parse(process.argv[3]||'{}'));
const st={p:M.famParams(f.DEFAULTS.regular,'Regular'),lat:M.newLattice(),hg:[],kern:{}};
const pc={};const prof=ch=>{if(pc[ch]!==undefined)return pc[ch];const g=M.finalGlyph(ch,st,{});return pc[ch]=g&&g.cs.length?M.kernProfile(g.cs,g.adv):null;};
const isLow=ch=>{const d=M.GL()[ch];return !!(d&&d.k==='xh');};
const ct=M.classKernTable(st,prof,isLow,id);
for(const pr of process.argv.slice(4)){const a=prof(pr[0]),b=prof(pr[1]);const g=M.kernGap(a,b,1e4);
  const cl=(()=>{let l,r;ct.L.forEach(([n,m])=>{if(m.includes(pr[0]))l=n});ct.R.forEach(([n,m])=>{if(m.includes(pr[1]))r=n});return l+'|'+r;})();
  console.log(pr,'gmin0',g.min,'pair',ct.pairs[pr],'class',cl,ct.vals[cl],JSON.stringify(M.KMREF()),a.adv);}
