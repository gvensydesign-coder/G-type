/* ---------- регистрация в продукте: шрифт «Аппликация» (Applikatsiya Paper), как kap/tail.js ----------
   Ключи ползунков в продукте имеют префикс c… (jit/lean/seed/… уже заняты другими шрифтами):
   cjit→jit, ctear→tear, cgap→gap, clap→lap, cpcs→pcs, csharp→sharp, csoft→soft, cscat→scat, clean→lean, cbj→bj, cseed→seed */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const AP_KEYS=['ctear','cgap','clap','cpcs','csharp','csoft','cjit','cscat','clean','cbj','cseed'];
const AP_ROWS=[
  ['ctear','Рваный край, %',0,100,1,'Бумага'],['cgap','Зазоры, %',0,100,1,'Бумага'],['clap','Нахлёст, %',0,100,1,'Бумага'],
  ['cpcs','Количество кусочков, %',0,100,1,'Вырезка'],['csharp','Острота резов, %',0,100,1,'Вырезка'],['csoft','Мягкие резы, %',0,100,1,'Вырезка'],
  ['cjit','Неровность, %',0,100,1,'Детская рука'],['cscat','Разброс размера, %',0,100,1,'Детская рука'],['clean','Разброс наклона, °',0,10,0.5,'Детская рука'],
  ['cbj','Скачет строка, %',0,100,1,'Детская рука'],['cseed','Вариант',0,99,1,'Детская рука']];
if(!PARAMS.some(r=>r[0]==='ctear')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...AP_ROWS);}
const apGen=p=>aSafe({stem:p.stem,jit:p.cjit,tear:p.ctear,gap:p.cgap,lap:p.clap,pcs:p.cpcs,sharp:p.csharp,soft:p.csoft,scat:p.cscat,lean:p.clean,bj:p.cbj,seed:p.cseed,sb:0});
const F={id:'applik',name:'Аппликация',family:'Applikatsiya Paper',tag:'Бумага · ножницы · детская аппликация',S0:150,GL:{},charset:'basic',
  desc:'Акцидентный юникейс из бумажных кусков, вырезанных детской рукой: прямые резы ножницами, небольшой наклон и прыжок каждого знака, склеенные в одно целое. Ползунок «Рваный край» превращает ножницы в оборванную бумагу, «Кусочки» и «Нахлёст» меняют сборку, «Зазоры» разводят куски, как в мозаике. Пресеты — Ножницы, Рваная бумага, Мозаика, Аккуратная, Малыш.',
  sample:'Аппликация · Paper Kids'};
F.sampleText='КОНФЕТА';
for(const ch of A_CHARSET){const m=aMapChar(ch);if(!m||!AREC[m.id])continue;
  F.GL[ch]={shape:g=>aGet(m.id,m.lc,apGen(g.p),0).contours.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole)),
    w:p=>aGet(m.id,m.lc,apGen(p),0).adv,k:m.lc?'xh':'cap',opt:{}};}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',LAT],['Латиница · строчные (юникейс)',LATL],['Кириллица · прописные',CY],['Кириллица · строчные (юникейс)',CYL],['Цифры',DIG],['Знаки',SYM]];
F.CHARSET=A_CHARSET.concat([' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const m=aMapChar(ch);return aGet(m.id,m.lc,apGen(p),0);};
const K0={wdth:100,capH:700,xh:602,asc:1130,desc:290,stem:150,hair:150,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:92,track:0,space:300,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,seed:0,
  ctear:0,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:50,cscat:50,clean:5,cbj:70,cseed:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed'];
F.params={stem:['Насыщенность',106,232,1]};
for(const k of HID)F.params[k]=null;
const PRE={
  sc:{ctear:0,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:50,cscat:50,clean:5,cbj:70},
  tr:{ctear:100,cgap:0,clap:0,cpcs:0,csharp:50,csoft:50,cjit:58,cscat:50,clean:5,cbj:70}};
F.methods=[
  ['Характер','Готовые системы: что вырезано и как склеено.',[
    ['Ножницы',PRE.sc],['Рваная бумага',PRE.tr],
    ['Мозаика',{ctear:0,cgap:22,clap:25,cpcs:75,csharp:70,csoft:15,cjit:40,cscat:40,clean:4,cbj:40}],
    ['Аккуратная',{ctear:0,cgap:0,clap:0,cpcs:0,csharp:75,csoft:15,cjit:15,cscat:15,clean:2,cbj:20}],
    ['Малыш',{ctear:30,cgap:0,clap:20,cpcs:20,csharp:15,csoft:90,cjit:90,cscat:85,clean:8,cbj:90}]]],
  ['Край','Как оторван край бумаги.',[['Ножницы',{ctear:0}],['Лёгкий',{ctear:30}],['Рваный',{ctear:65}],['Оборванный',{ctear:100}]]],
  ['Зазоры','Расстояние между кусками.',[['Склеено',{cgap:0}],['Узкие',{cgap:15}],['Широкие',{cgap:45}],['Мозаика',{cgap:80}]]],
  ['Кусочки','Из скольких кусков собрана буква.',[['Целые',{cpcs:0}],['Немного',{cpcs:30}],['Много',{cpcs:65}],['Мелко',{cpcs:100}]]],
  ['Вес','Толщина кусков.',[['Светлый',{stem:114}],['Обычный',{stem:150}],['Жирный',{stem:192}],['Чёрный',{stem:226}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;F.deTiny=7;F.coverTight=140;
const ALLCH=[...LAT,...LATL,...CY,...CYL,...DIG].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:ALLCH,desc:ALLCH,descX:0,holeK:0.004,
  drops:(ch,p)=>{const m=aMapChar(ch);if(!m||!AREC[m.id])return 0;const q=Object.assign({},p,{slant:0});const g=aGet(m.id,m.lc,apGen(q),0);return (p.cgap>12||p.cpcs>0)?(g.nGl||0)+(p.cpcs>0?4:0):0;}};
function apLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',106,232,150);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  for(const [k,lo,hi,dv] of [['ctear',0,100,0],['cgap',0,100,0],['clap',0,100,0],['cpcs',0,100,0],['csharp',0,100,50],['csoft',0,100,50],['cjit',0,100,50],['cscat',0,100,50],['clean',0,10,5],['cbj',0,100,70],['cseed',0,99,0]])cl(k,lo,hi,dv);
  q.cseed=Math.round(q.cseed);
  cl('capH',700,700,700);cl('wdth',100,100,100);cl('xh',602,602,602);cl('asc',1130,1130,1130);cl('desc',290,290,290);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',100,100,100);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',40,160,92);cl('track',-60,100,0);cl('space',200,420,300);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='applik')return _pl(p,font);return apLim(p);};
WSCALE.applik=0.77;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='applik'){const t={Light:114,Regular:150,Bold:192,Black:226}[wn];if(t){const k=Math.max(0.7,Math.min(1.3,p.stem/150));o.stem=Math.round(Math.min(232,Math.max(106,t*k)));o.hair=o.stem;}return paramLimits(o,'applik').q;}
  return o;};
KERN_TABLE.applik=(typeof KERN_TABLE_BASE!=='undefined'?KERN_TABLE_BASE:[]).slice();
for(const r of PARAMS)if(!(r[0] in F.params)&&!AP_KEYS.includes(r[0])&&!['sb','track','space','slant'].includes(r[0]))F.params[r[0]]=null;
FONTS.applik=F;
for(const id in FONTS)if(id!=='applik'){const f=FONTS[id];f.params=f.params||{};for(const k of AP_KEYS)if(!(k in f.params))f.params[k]=null;}
}
