/* ---------- «Столб» (stolb): параметры, кэш, метрики, кернинг, регистрация в продукте (по образцу stsepka/tail.js) ----------
   Ключи ползунков с префиксом u: urnd (радиус скруглений, %), uctr (контраст, %), uap (апертура, %), ucut (срез концов, %), ugap (разрядка: зазор стойка|стойка).
   Насыщенность = host stem (S), ширина = host wdth, высота строчных = host xh (lcr = xh/700). Поля зашиты в контур (opt.fixed, sb = 0). */
const CN_DEF={S:88,wd:1,rnd:0.72,ctr:0.35,ap:1,ct:0,gap:30,lcr:0.75};
const CN_LIM={S:[60,176,1],wd:[0.80,1.30,0.01],rnd:[0,1,0.01],ctr:[0,1,0.01],ap:[0.6,1.4,0.01],ct:[0,1,0.01],gap:[14,70,1],lcr:[0.66,0.82,0.001]};
function cnSafe(p){const q=Object.assign({},CN_DEF,p||{});for(const k in CN_LIM){const [a,b]=CN_LIM[k];let v=+q[k];if(!isFinite(v))v=CN_DEF[k];q[k]=cnCL(v,a,b);}q.S=Math.round(q.S);q.gap=Math.round(q.gap);return q;}
const CN_KEY=q=>[q.S,q.wd,q.rnd,q.ctr,q.ap,q.ct,q.gap,q.lcr].join('|');
const CN_WEIGHTS={Light:62,Regular:88,Bold:124,Black:158};
const cnShiftCS=(cs,dx,dy)=>cs.map(k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:{x:n.a.x+dx,y:n.a.y+dy},b:{x:n.b.x+dx,y:n.b.y+dy}})),poly:k.poly.map(v=>[v[0]+dx,v[1]+dy])}));
function cnFinishGlyph(cs,wRaw,cfg){
  if(!cs.length)return {cs:[],adv:wRaw,gs:{empty:true,sbl:0,sbr:0},dx:0,x0:0,x1:0};
  const polys=cnPolysOf(cs),gs=cnGS(polys,cfg),b=cnBBox(polys);const dx=gs.sbl-b[0];
  return {cs:cnShiftCS(cs,dx,0),adv:(b[2]-b[0])+gs.sbl+gs.sbr,gs,dx,x0:b[0],x1:b[2]};}
const cnData_cache=new Map();
function cnData(pIn){const q=cnSafe(pIn),key=CN_KEY(q);let D=cnData_cache.get(key);if(D)return D;
  const c=cnCtx({S:q.S,wd:q.wd,rnd:q.rnd,ctr:q.ctr,ap:q.ap,ct:q.ct,gap:q.gap,lcr:q.lcr}),cfg=cnSpCfg(q.gap);
  D={q,c,cfg,key,gl:new Map(),T0:null,kc:new Map()};
  D.glyph=ch=>{let g=D.gl.get(ch);if(g!==undefined)return g;
    const P=cnGlyphPiece(ch,c);if(!P||P.space){D.gl.set(ch,null);return null;}
    g=cnFinishGlyph(P.cs,P.w,cfg);g.raw=P.raw;g.ch=ch;D.gl.set(ch,g);return g;};
  D.kernTarget=()=>{if(D.T0==null){const h=D.glyph('n');D.T0=cnPair(h.gs,h.gs).area;}return D.T0;};
  D.kern=(a,b)=>{const id=a+'\u0001'+b;let k=D.kc.get(id);if(k!==undefined)return k;
    const ga=D.glyph(a),gb=D.glyph(b);k=0;
    if(ga&&gb&&!ga.gs.empty&&!gb.gs.empty&&cnIsAlnum(a)&&cnIsAlnum(b)){k=cnKernFor(ga.gs,gb.gs,D.kernTarget(),cfg,-70*q.gap/30,110*q.gap/30);if(Math.abs(k)<3)k=0;}
    D.kc.set(id,k);return k;};
  if(cnData_cache.size>12)cnData_cache.clear();
  cnData_cache.set(key,D);return D;}
const cnIsAlnum=ch=>/[\p{L}\p{N}]/u.test(ch);
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const CN_KEYS=['urnd','uctr','uap','ucut','ugap'];
const CN_ROWS=[['urnd','Радиус скруглений, %',0,100,1,'Форма'],['uctr','Контраст, %',0,100,1,'Штрихи'],['uap','Апертура, %',60,140,1,'Конструкция'],['ucut','Срез концов, %',0,100,1,'Конструкция'],['ugap','Разрядка',14,70,1,'Наклон и ритм']];
if(!PARAMS.some(r=>r[0]==='urnd')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...CN_ROWS);}
const cnNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const cnEng=p=>({S:cnNum(p.stem,88),wd:cnNum(p.wdth,100)/100,rnd:cnNum(p.urnd,72)/100,ctr:cnNum(p.uctr,35)/100,ap:cnNum(p.uap,100)/100,ct:cnNum(p.ucut,0)/100,gap:cnNum(p.ugap,30),lcr:Math.round(cnNum(p.xh,525)/700*1e4)/1e4});
const cnD=p=>cnData(cnEng(p));
const CN_ALL=[...CN_LAT_U,...CN_LAT_L,...CN_CYR_U,...CN_CYR_L,...'Ёё',...CN_DIG];
const CN_SYM='.,:;!?«»„“”‘’"\'-–—‒−()/&№…@#%*·•°+=\\|₽©';
const CN_LAT=CN_LAT_U,CN_LATL=CN_LAT_L,CN_CY=CN_CYR_U.slice(0,5)+'Ё'+CN_CYR_U.slice(5),CN_CYL=CN_CYR_L.slice(0,5)+'ё'+CN_CYR_L.slice(5);
const cnCont=cs=>cs.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));
const CN_SHAREDU={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х'};
const F={id:'stolb',name:'Столб',family:'Stolb Display',tag:'Сжатый гротеск · плакат',S0:88,GL:{},charset:'basic',
  desc:'Высокий узкий гротеск для логотипов и заголовков: плотные прямые стойки, овалы как вытянутые прямоугольники с малым радиусом, горизонтальные концевые элементы, малая апертура и ровная тесная разрядка. Строчные с крупным очком, жирное начертание по умолчанию.',
  sample:'Столб · Stolb',sampleText:'ЗАГОЛОВОК'};
const cnIsLow=ch=>/\p{Ll}/u.test(ch);
function cnEntry(ch){
  return {shape:g=>{const x=cnD(g.p).glyph(ch);return x?cnCont(x.cs):[];},w:p=>{const x=cnD(p).glyph(ch);return x?x.adv:0;},k:cnIsLow(ch)?'xh':'cap',opt:{fixed:true}};}
const CN_CHARS=[...CN_LAT_U,...CN_LAT_L,...CN_CYR_U,...CN_CYR_L,...'Ёё',...CN_DIG,...CN_SYM];
const CN_SHL={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y'};
for(const ch of CN_CHARS){if(F.GL[ch])continue;
  const cyr=CN_SHAREDU[ch],lat=CN_SHL[ch];
  if(cyr){F.GL[cyr]=F.GL[cyr]||cnEntry(cyr);F.GL[ch]=F.GL[cyr];}
  else if(lat){F.GL[lat]=F.GL[lat]||cnEntry(lat);F.GL[ch]=F.GL[lat];}
  else F.GL[ch]=cnEntry(ch);}
for(const c of [' ',' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:(c===' '||c===' ')?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',CN_LAT],['Латиница · строчные',CN_LATL],['Кириллица · прописные',CN_CY],['Кириллица · строчные',CN_CYL],['Цифры',CN_DIG],['Знаки',CN_SYM]];
F.CHARSET=CN_CHARS.concat([' ',' ',' ',' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const x=cnD(p).glyph(ch);return x||null;};
const K0={wdth:100,capH:700,xh:525,asc:CN_ASC,desc:CN_DD,stem:88,hair:88,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:230,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,urnd:72,uctr:35,uap:100,ucut:0,ugap:30};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10,icomp:40,wdth:98}};
const HID=['capH','hair','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','sb'];
F.params={stem:['Насыщенность',60,176,1],wdth:['Ширина, %',80,130,1],xh:['Высота строчных',462,574,1]};
for(const k of HID)F.params[k]=null;
const CNP={
  poster:{stem:88,wdth:100,xh:525,urnd:72,uctr:35,uap:100,ucut:0,ugap:30},
  tight:{stem:94,wdth:86,xh:540,urnd:60,uctr:25,uap:80,ucut:0,ugap:24},
  soft:{stem:82,wdth:108,xh:510,urnd:100,uctr:40,uap:115,ucut:0,ugap:34},
  strict:{stem:90,wdth:96,xh:530,urnd:10,uctr:45,uap:100,ucut:60,ugap:30},
  afisha:{stem:124,wdth:92,xh:540,urnd:40,uctr:20,uap:90,ucut:0,ugap:22},
  journal:{stem:70,wdth:112,xh:550,urnd:72,uctr:45,uap:110,ucut:0,ugap:36}};
F.methods=[
  ['Характер','Готовые системы: плакатная по умолчанию, плотная, мягкая, строгая, афишная и журнальная.',[['Плакат',CNP.poster],['Плотный',CNP.tight],['Мягкий',CNP.soft],['Строгий',CNP.strict],['Афиша',CNP.afisha],['Журнал',CNP.journal]]],
  ['Вес','Толщина штриха: от светлого до сверхжирного.',[['Светлый',{stem:62}],['Обычный',{stem:88}],['Жирный',{stem:124}],['Чёрный',{stem:158}]]],
  ['Скругление','Радиус круглых углов овалов; прямые углы остаются острыми.',[['Острое',{urnd:0}],['Обычное',{urnd:72}],['Мягкое',{urnd:90}],['Круглое',{urnd:100}]]],
  ['Срез концов','Горизонтальный или слегка косой срез концевых элементов.',[['Прямой',{ucut:0}],['Лёгкий',{ucut:40}],['Косой',{ucut:100}]]],
  ['Строчные','Высота строчных.',[['Низкие',{xh:470}],['Обычные',{xh:525}],['Высокие',{xh:570}]]]];
F.coverNarrow=true;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=60;
const CN_ALLCH=CN_ALL.join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:CN_ALLCH,desc:CN_ALLCH,descX:0,holeK:0.004};
function cnLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',60,176,88);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  cl('wdth',80,130,100);cl('xh',462,574,525);q.xh=Math.round(q.xh);
  cl('urnd',0,100,72);cl('uctr',0,100,35);cl('uap',60,140,100);cl('ucut',0,100,0);cl('ugap',14,70,30);q.ugap=Math.round(q.ugap);
  cl('capH',700,700,700);cl('asc',CN_ASC,CN_ASC,CN_ASC);cl('desc',CN_DD,CN_DD,CN_DD);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,100,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',-60,100,0);cl('space',150,360,230);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='stolb')return _pl(p,font);return cnLim(p);};
WSCALE.stolb=0.5587;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='stolb'){const t=CN_WEIGHTS[wn];if(t){const k=Math.max(0.8,Math.min(1.2,p.stem/88));o.stem=Math.round(Math.min(176,Math.max(60,t*k)));o.hair=o.stem;o.wdth=p.wdth;}return paramLimits(o,'cond').q;}
  return o;};
KERN_TABLE.stolb=[];
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='stolb')return _ckt(st,prof,isLow,fontId);
  const D=cnD(st.p),mem=CN_ALL.filter(ch=>prof(ch));
  const out={L:mem.map(ch=>[ch,[ch]]),R:mem.map(ch=>[ch,[ch]]),vals:null,tU:D.cfg.g,tL:D.cfg.g,pairs:{}};
  const kc=st.kc||{};
  out.vals=new Proxy({},{get:(t,key)=>{if(typeof key!=='string')return undefined;if(kc[key]!=null)return Math.max(-KERN_MAX,Math.min(KERN_MAX,Math.round(+kc[key])||0));
      const i=key.indexOf('|');return i<0?undefined:D.kern(key.slice(0,i),key.slice(i+1));},
    has:()=>true,ownKeys:()=>['*'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true,value:0})});
  return out;};
const CNS={D:cnD,eng:cnEng,LIM:CN_LIM,CTX:cnCtx,ALL:CN_ALL};
FONTS.stolb=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!CN_KEYS.includes(r[0])&&!['track','space','slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='stolb'){const f=FONTS[id];f.params=f.params||{};for(const k of CN_KEYS)if(!(k in f.params))f.params[k]=null;}
if(typeof globalThis!=='undefined')globalThis.CNS=CNS;
}
