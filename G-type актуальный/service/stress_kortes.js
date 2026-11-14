/* Стресс «Кортес» (kortes) на уровне хоста (finalGlyph с объединением): каждый знак и каждый вариант (.sw .swq .sup) при наборах ползунков kwt kct ksr ksw kwd kap
   в пределах продукта: число внешних контуров и дыр как при значениях по умолчанию, нет NaN, ни одной крошки (контур < 350 u2).
   Набор R1: значения по умолчанию, минимум и максимум каждого ползунка (12), пять угловых сочетаний, остальное случайно (всего N).
   node stress_kortes.js [N=32] [seed=1] [shard=i/n] */
const fs=require('fs');
const M=new Function(fs.readFileSync(__dirname+'/core_all.js','utf8')+'\nreturn {FONTS,useFont,newLattice,finalGlyph,KTS};')();
M.useFont('kortes');const F=M.FONTS.kortes,L=M.KTS.LIM,K=M.KTS.KEYS;
const base={...F.DEFAULTS.regular};
const names=[...new Set(F.CHARSET.filter(c=>c.trim()&&c!==' '&&c.charCodeAt(0)!==0x2009&&c.charCodeAt(0)!==0x202f&&(!/\p{L}/u.test(c)||c===c.toUpperCase()))),...M.KTS.alts.map(a=>a.name)];
const area=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
function sig(p){const st={p,lat:M.newLattice(),hg:[],kern:{}},o={},tiny=[];
  for(const ch of names){const g=M.finalGlyph(ch,st,{});if(!g||!g.cs.length||!isFinite(g.adv)){o[ch]='bad';continue;}
    let ok=true;for(const c of g.cs)for(const n of c.nodes)if(![n.x,n.y].every(isFinite))ok=false;
    o[ch]=ok?g.cs.filter(c=>!c.hole).length+'/'+g.cs.filter(c=>c.hole).length:'nan';
    for(const c of g.cs)if(area(c)<350)tiny.push(ch);}
  return {o,tiny};}
const N=+process.argv[2]||32;let seed=(+process.argv[3]||1)*2654435761>>>0||1;
const [sh,sn]=(process.argv[4]||'0/1').split('/').map(Number);
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const sets=[{}];
for(const k of K){sets.push({[k]:L[k][0]});sets.push({[k]:L[k][1]});}
for(let i=0;i<5;i++){const q={};K.forEach((k,j)=>q[k]=((i*3+j*5+(i>>1))%2)?L[k][1]:L[k][0]);sets.push(q);}
while(sets.length<N){const q={};for(const k of K)q[k]=Math.round(L[k][0]+rnd()*(L[k][1]-L[k][0]));sets.push(q);}
const t0=sig(base).o;let bad=0,builds=0;const why={};
sets.slice(0,N).forEach((q,i)=>{if(i%sn!==sh)return;const r=sig({...base,...q});builds+=names.length;
  for(const ch of names){if(r.o[ch]!==t0[ch]){bad++;(why[ch]=why[ch]||[]).push(JSON.stringify(q)+' '+t0[ch]+'->'+r.o[ch]);}}
  for(const ch of r.tiny){bad++;(why[ch+' tiny']=why[ch+' tiny']||[]).push(JSON.stringify(q));}});
for(const k of Object.keys(why).slice(0,16))console.log('BAD',k,why[k].length,why[k][0]);
console.log('TOTAL',N,'sets',sets.slice(0,N).filter((_,i)=>i%sn===sh).length,'glyph builds',builds,'bad',bad);
process.exit(bad?1:0);
