/* ---------- набор знаков, параметры, кернинг, реестр ---------- */
const LATSH={Y:'У',A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х'};   /* общие формы латиницы и кириллицы: один и тот же знак */
const LATONLY='DFGIJLNQRSUVWYZ';
const LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',LATL='abcdefghijklmnopqrstuvwxyz',CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',CYL='абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const DIG='0123456789',SYM='.,:;!?«»„“”‘’"\'-–—()/&№…−·•°©₽@#%*+=\\|';
const SPACES={' ':300,' ':300,' ':150,' ':170};
/* символ -> {id, lc} */
function aMapChar(ch){
  if(CY.includes(ch))return {id:ch,lc:false};
  if(CYL.includes(ch))return {id:ch.toUpperCase(),lc:true};
  if(LAT.includes(ch))return {id:LATSH[ch]||ch,lc:false};
  if(LATL.includes(ch)){const u=ch.toUpperCase();return {id:LATSH[u]||u,lc:true};}
  if(DIG.includes(ch)||SYM.includes(ch)){const m={'«':'«','»':'»','„':'„','“':'“','”':'”','‘':'‘','’':'’','–':'–','—':'—','№':'№','…':'…'};return {id:m[ch]||ch,lc:false};}
  return null;}
const A_CHARSET=[...LAT,...LATL,...CY,...CYL,...DIG,...SYM];
const A_ALT_LET='АОЕНИТ';   /* буквы с двумя запасными вырезами (calt) */
const A_PRESETS={ /* направления */
  A:{name:'Ножницы',tear:0,jit:50},
  B:{name:'Рваная бумага',tear:100,jit:58}};
const A_WEIGHTS={Light:114,Regular:150,Bold:192,Black:226};
const A_DEF={capH:700,stem:150,jit:50,lean:5,bj:70,gap:0,seed:0,tear:0,sharp:50,soft:50,scat:50,lap:0,pcs:0,blunt:11,sb:92,lcs:0.86};
/* пределы (проверены стресс-прогоном): всё остальное зажимается */
const A_LIM={stem:[106,232],jit:[0,100],lean:[0,10],bj:[0,100],gap:[0,100],seed:[0,99],tear:[0,100],sharp:[0,100],soft:[0,100],scat:[0,100],lap:[0,100],pcs:[0,100]};
function aSafe(p){const q=Object.assign({},A_DEF,p||{});for(const k in A_LIM){const [a,b]=A_LIM[k];q[k]=aCL(+q[k]||0,a,b);}q.seed=Math.round(q.seed);q.capH=700;q.blunt=20-18*q.sharp/100;q.sb=aCL(q.sb,0,160);q.lcs=aCL(q.lcs,.8,.92);return q;}
const aCache=new Map();
function aKey(id,lc,p,sa){return [id,lc?1:0,sa|0,p.stem,p.jit,p.lean,p.bj,p.gap,p.seed,p.tear,p.blunt,p.sb,p.lcs,p.soft,p.scat,p.lap,p.pcs].join('|');}
/* страховка топологии (как в «Капле»): эталон = тот же знак при stem 150, неровность 0, зазор 0; если дыры/части/тонкие места не те — пересобрать с меньшей неровностью, затем без зазора */
const aRefC=new Map();
function aRef(id,lc,seed,sa){const k=id+'|'+lc+'|'+seed+'|'+(sa|0);let r=aRefC.get(k);if(!r){const g=aBuild(id,lc,aSafe({stem:150,jit:0,lean:0,bj:0,gap:0,seed:seed,tear:0}),sa|0);r=aTopo(g);aRefC.set(k,r);}return r;}
function aTopoOK(g,id,lc,p,sa){if(!g.contours.length)return true;const t=aTopo(g),ref=aRef(id,lc,p.seed,sa),H=lc?p.capH*p.lcs:p.capH;
  if(t.holes.length!==ref.holes.length)return false;for(const a of t.holes)if(a<0.005*H*H)return false;
  const rp=ref.parts.length;if(t.parts.length<rp||t.parts.length>rp+(g.nGl||0))return false;
  for(const a of t.parts)if(a<4500&&a>=A_PIN)return false;
  if(t.thin>0.012||t.slit>70)return false;return true;}
const aFB={n:0,tot:0};
function aGet(id,lc,p,sa){const k=aKey(id,lc,p,sa);let r=aCache.get(k);if(!r){r=aBuild(id,lc,p,sa);aFB.tot++;
    if(AREC[id]&&!aTopoOK(r,id,lc,p,sa)){aFB.n++;let ok=false;
      for(const [kj,kg,kt,ks=1] of [[0.7,1,1],[0.45,1,.8],[0.2,1,.6],[0.45,0,.6],[0.2,0,.4],[0,0,.2],[0,0,0],[0,0,0,.95],[0,0,0,.9],[0,0,0,.85]]){const p2=Object.assign({},p,{stem:p.stem*ks,jit:p.jit*kj,gap:p.gap*kg,tear:p.tear*kt,lap:p.lap*(kt<1?kt*kt:1),pcs:p.pcs*(kt<1?kt:1),soft:50+(p.soft-50)*(kt<1?kt:1),scat:50+(p.scat-50)*(kt<1?kt:1),sharp:50+(p.sharp-50)*(kt<1?kt:1)}),r2=aBuild(id,lc,p2,sa);if(aTopoOK(r2,id,lc,p2,sa)){r=r2;r.fallback=kj+'/'+kg+'/'+kt+'/'+ks;ok=true;break;}}
      if(!ok){r=aBuild(id,lc,Object.assign({},p,{jit:0,gap:0,lap:0,pcs:0,tear:0,lean:p.lean*0.5}),sa);r.fallback='last';}}
    if(aCache.size>3000)aCache.clear();aCache.set(k,r);}return r;}
function aGlyphName(ch){const cp=ch.codePointAt(0);
  if(/[A-Za-z]/.test(ch))return ch;
  if(/[0-9]/.test(ch))return ['zero','one','two','three','four','five','six','seven','eight','nine'][+ch];
  return 'uni'+cp.toString(16).toUpperCase().padStart(4,'0');}
/* весь шрифт: уникальные контуры (общие латинско-кириллические знаки — один глиф на несколько кодов) */
function aFont(pIn,opts){opts=opts||{};const p=aSafe(pIn),glyphs=[],byKey=new Map();
  const chars=A_CHARSET;
  for(const ch of chars){const m=aMapChar(ch);if(!m||!AREC[m.id])continue;const key=m.id+'|'+(m.lc?1:0);
    let g=byKey.get(key);if(!g){const r=aGet(m.id,m.lc,p,0);g={name:aGlyphName(ch),key,id:m.id,lc:m.lc,codes:[],adv:r.adv,contours:r.contours,profile:r.profile,lean:r.lean,dy:r.dy};byKey.set(key,g);glyphs.push(g);}
    g.codes.push(ch.codePointAt(0));}
  /* пробелы */
  for(const ch in SPACES){glyphs.push({name:aGlyphName(ch)==='uni0020'?'space':aGlyphName(ch),key:'sp'+ch,codes:[ch.codePointAt(0)],adv:SPACES[ch]+Math.round(0.35*(p.stem-150)*(ch===' '||ch===' '?1:0)),contours:[],profile:null});}
  /* запасные вырезы */
  const alts=[];
  if(opts.alts!==false){for(const idc of A_ALT_LET)for(const lc of [false,true])for(let k=1;k<=2;k++){const r=aBuild(idc,lc,p,137*k);const base=byKey.get(idc+'|'+(lc?1:0));
    if(!base)continue;const g={name:base.name+'.alt'+k,key:base.key+'.alt'+k,id:idc,lc,codes:[],adv:r.adv,contours:r.contours,profile:r.profile,alt:base.name};alts.push(g);}}
  const kern=opts.kern===false?[]:aKern(glyphs,alts);
  return {p,glyphs,alts,kern};}
/* кернинг по телу (полосы 20 ед.): целимся в средний оптический зазор пар Н/О; клин (А Л Д У Т Г Р 7 …) сближаются сами */
function aGapStat(gl,gr){let sum=0,cnt=0,minG=1e9,both=0;const CAP=300;
  for(let b=0;b<A_NB;b++){const rl=gl.profile.R[b],lr=gr.profile.L[b];if(rl==null&&lr==null)continue;const y=A_B0+A_BS*(b+0.5);if(y<30||y>760)continue;
    let g;if(rl!=null&&lr!=null){g=(gl.adv-rl)+lr;both++;minG=Math.min(minG,g);}else g=CAP;sum+=Math.min(g,CAP);cnt++;}
  return cnt&&both?{mean:sum/cnt,min:minG}:null;}
function aKern(glyphs,alts){const L=glyphs.concat(alts).filter(g=>g.profile&&g.contours.length&&!(g.codes.length&&g.codes.every(c=>(c<0x30)||(c>=0x2010&&c<=0x2026&&false))));
  const find=id=>glyphs.find(g=>g.key===id+'|0');const H_=find('Н'),O_=find('О');
  if(!H_||!O_)return [];
  const ref=[[H_,H_],[O_,O_],[H_,O_],[O_,H_]].map(([a,b])=>aGapStat(a,b).mean),target=ref.reduce((a,b)=>a+b,0)/ref.length;
  const out=[];
  for(const a of L)for(const b of L){const st=aGapStat(a,b);if(!st)continue;let k=-(st.mean-target)*0.55;if(k>20)k=20;if(k<-150)k=-150;
    if(st.min+k<56)k=56-st.min;if(k>0&&k<-0)k=0;k=Math.round(k/2)*2;if(Math.abs(k)>=8)out.push([a.name,b.name,k]);}
  return out;}
/* ---------- реестр (как core_kaplya.js) ---------- */
const APPLIK_PARAMS=[['stem','Насыщенность',...A_LIM.stem,1],['jit','Неровность',0,100,1],['lean','Наклон букв, °',0,10,0.5],['bj','Скачет строка',0,100,1],['gap','Зазоры',0,100,1],['seed','Вариант',0,99,1]];
const APPLIK={id:'applik',name:'Аппликация',family:'Applikatsiya Paper',tag:'Бумага · ножницы · детская аппликация',year:2026,
  desc:'Акцидентный юникейс из вырезанных детской рукой бумажных кусков: прямые резы ножницами, лёгкий наклон и прыжок каждого знака, клеевые зазоры. Направления — «Ножницы» и «Рваная бумага».',
  sample:'Аппликация · Paper Kids',sampleText:'КОНФЕТА',
  charset:'basic',CHARSET:A_CHARSET.concat([' ']),params:APPLIK_PARAMS,limits:A_LIM,defaults:A_DEF,weights:A_WEIGHTS,presets:A_PRESETS,altLetters:A_ALT_LET,
  safe:aSafe,build:aGet,raw:aBuild,topo:aTopo,fb:aFB,font:aFont,mapChar:aMapChar,kern:aKern,REC:AREC,flat:aFlat,polyDist:aPolyDist};
APPLIK.famParams=(p,wn)=>aSafe(Object.assign({},p,{stem:A_WEIGHTS[wn]||p.stem}));
if(typeof globalThis!=='undefined')globalThis.APPLIK=APPLIK;
if(typeof module!=='undefined'&&module.exports)module.exports=APPLIK;
