/* Стресс «Тяга» (tyaga) на уровне хоста (finalGlyph с объединением): топология каждого знака и каждой растянутой формы (.sN) при крайних и случайных
   значениях ползунков tsw trd tbs tap tst: число внешних контуров и дыр как при значениях по умолчанию, нет NaN, ни один контур не меньше 0.035·S².
   Известные исключения прототипа (RECIPE_tyaga.md): 6 и 9 (точечная дыра), % при толщине 23 % и скруглении 0.
   node stress_tyaga.js [ext|N=60] [seed=1] */
const fs=require('fs');
const M=new Function(fs.readFileSync(__dirname+'/core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,TYS};')();
M.useFont('tyaga');const F=M.FONTS.tyaga,L=M.TYS.LIM,K=M.TYS.KEYS.filter(k=>k!=='tlg');
const base={...F.DEFAULTS.regular};
const names=[...new Set(F.CHARSET.filter(c=>c!=='~'&&c.trim()&&c.charCodeAt(0)!==160&&c!==' '&&c!==' ').map(c=>M.TYS.name(c)&&c)),...M.TYS.alts.map(a=>a.name)];
const area=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
function sig(p){const st={p,lat:M.newLattice(),hg:[],kern:{}},o={},S=p.tsw*7;let tiny=[];
  for(const ch of names){const g=M.finalGlyph(ch,st,{});if(!g||!g.cs.length||!isFinite(g.adv)){o[ch]='bad';continue;}
    for(const c of g.cs)for(const n of c.nodes)if(![n.x,n.y].every(isFinite))o[ch]='nan';
    o[ch]=g.cs.filter(c=>!c.hole).length+'/'+g.cs.filter(c=>c.hole).length;
    for(const c of g.cs)if(area(c)<0.035*S*S&&!/^[.,:;!?'"‘’“”„…]|^uni(002E|002C|003A|003B|0021|003F)/.test(ch))tiny.push(ch);}
  return {o,tiny};}
const t0=sig(base).o;const MODE=process.argv[2]||'60';let seed=(+process.argv[3]||1)*2654435761>>>0||1;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const sets=[];
if(MODE==='ext'){for(let m=0;m<(1<<K.length);m++){const q={};K.forEach((k,i)=>q[k]=(m>>i&1)?L[k][1]:L[k][0]);sets.push(q);}}
else for(let i=0;i<+MODE;i++){const q={};for(const k of K)q[k]=Math.round((L[k][0]+rnd()*(L[k][1]-L[k][0]))*20)/20;sets.push(q);}
const EX=new Set();
let bad=0,builds=0;const why={};
for(const q of sets){const p={...base,...q};const r=sig(p);builds+=names.length;
  for(const ch of names){if(EX.has(ch))continue;if(r.o[ch]!==t0[ch]){bad++;(why[ch]=why[ch]||[]).push(JSON.stringify(q)+' '+t0[ch]+'->'+r.o[ch]);}}
  for(const ch of r.tiny){if(EX.has(ch))continue;bad++;(why[ch+' tiny']=why[ch+' tiny']||[]).push(JSON.stringify(q));}}
for(const k of Object.keys(why).slice(0,12))console.log('BAD',k,why[k].length,why[k][0]);
console.log('TOTAL',MODE,'sets',sets.length,'glyph builds',builds,'bad',bad);
process.exit(bad?1:0);
