/* Тяга kerning audit: class table at the 32 extreme corners + random sets: every kerned pair (all members and stretched alternates) keeps the nearest ink gap >= 12 u (>= 0.42 of Апрош up to 60 u at default),
   |value| <= 150 (15 % UPM), no more than 20 % of the pairs at one value (saturation), values come from the host table. node kern_tyaga.js [random sets=12] */
const fs=require('fs');
const M=new Function(fs.readFileSync(__dirname+'/core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,TYS,TYG,kernProfile,kernGap,classKernTable};')();
M.useFont('tyaga');const F=M.FONTS.tyaga,L=M.TYS.LIM,K=M.TYS.KEYS.filter(k=>k!=='tlg'),base={...F.DEFAULTS.regular};
const sets=[{}];for(let m=0;m<(1<<K.length);m++){const q={};K.forEach((k,i)=>q[k]=(m>>i&1)?L[k][1]:L[k][0]);sets.push(q);}
let seed=7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<+(process.argv[2]||12);i++){const q={};for(const k of K)q[k]=L[k][0]+rnd()*(L[k][1]-L[k][0]);sets.push(q);}
let bad=0,checked=0,worst=1e9,hist={},npairs=0;
for(const q of sets){const p={...base,...q},st={p,lat:M.newLattice(),hg:[],kern:{}};
  const pf={};const gp=n=>n in pf?pf[n]:(pf[n]=(g=>g&&g.cs.length?M.kernProfile(g.cs,g.adv):null)(M.finalGlyph(n,st,{})));
  const ct=M.classKernTable(st,gp,()=>false,'tyaga');const apr=p.tap/100*700,G0=Math.max(12,Math.min(60,Math.round(0.42*apr)));
  const alts={};for(const a of M.TYS.alts)(alts[a.canon]=alts[a.canon]||[]).push(a.name);
  const mem=n=>{const L=ct.L.find(x=>x[0]===n)||ct.R.find(x=>x[0]===n);return [...(L?L[1]:[]),...(alts[n]||[])];};
  for(const key in ct.vals){const v=ct.vals[key];if(!v)continue;const [a,b]=key.split('|');
    if(Math.abs(v)>150){bad++;console.log('BAD |v|>150',key,v);}
    if(q===sets[0]){hist[v]=(hist[v]||0)+1;npairs++;}
    for(const x of mem(a))for(const y of mem(b)){const A=gp(x),B=gp(y);if(!A||!B)continue;const g=M.kernGap(A,B,1e4);if(!g)continue;checked++;
      const after=g.min+v;worst=Math.min(worst,after-G0);if(after<G0-1){bad++;if(bad<10)console.log('BAD gap',JSON.stringify(q),x,y,v,Math.round(g.min),'G0',G0);}}}}
const top=Math.max(...Object.values(hist));
console.log('pairs',npairs,'distinct values',Object.keys(hist).length,'max share',(top/npairs).toFixed(2),'worst margin',Math.round(worst),'member pairs checked',checked,'bad',bad);
if(top/npairs>0.2){console.log('BAD saturation');bad++;}
process.exit(bad?1:0);
