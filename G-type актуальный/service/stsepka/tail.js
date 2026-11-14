/* ---------- регистрация в продукте: шрифт «Сцепка» (Stsepka Display), по образцу applik/tail.js ----------
   Ключи ползунков имеют префикс z…: zrnd (скругление, %), zgap (зазор сцепки), zjump (скачут строчные, %), zlig (режим сцепок 0 обычные / 1 все / 2 выкл).
   Насыщенность = host stem (S), ширина = host wdth, высота строчных = host xh (lcr = xh/700). Поля зашиты в контур (opt.fixed, sb = 0). */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const ST_KEYS=['zrnd','zgap','zjump','zlig'];
const ST_ROWS=[['zrnd','Скругление, %',5,70,1,'Форма'],['zgap','Зазор сцепки',14,60,1,'Сцепка'],['zjump','Скачут строчные, %',0,150,5,'Сцепка'],['zlig','Сцепки',0,2,1,'Сцепка']];
if(!PARAMS.some(r=>r[0]==='zrnd')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...ST_ROWS);}
const stNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
/* параметры продукта -> движок */
const stEng=p=>({S:stNum(p.stem,138),wd:stNum(p.wdth,100)/100,rnd:stNum(p.zrnd,45)/100,gap:stNum(p.zgap,44),lcr:Math.round(stNum(p.xh,504)/700*1e4)/1e4,jump:stNum(p.zjump,100)/100});
const stD=p=>stData(stEng(p));
const ST_ALL=[...ST_LAT_U,...ST_LAT_L,...ST_CYR_U,...ST_CYR_L,...'Ёё',...ST_DIG];
const ST_SYM='.,:;!?«»„“”‘’"\'-–—−()/&№…@#%*·•°+=\\|₽©';
const ST_LAT=ST_LAT_U,ST_LATL=ST_LAT_L,ST_CY=ST_CYR_U.slice(0,5)+'Ё'+ST_CYR_U.slice(5),ST_CYL=ST_CYR_L.slice(0,5)+'ё'+ST_CYR_L.slice(5);
const stCont=cs=>cs.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));
const stGname=ch=>{if(/[A-Za-z]/.test(ch))return ch;return 'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');};
const stLigName=spec=>[...spec].map(stGname).join('_')+'.liga';
/* общие формы латиницы и кириллицы (проверено: контуры совпадают): один и тот же знак GL, правки общие */
const ST_SHARED={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х',a:'а',c:'с',e:'е',o:'о',p:'р',x:'х'};
const F={id:'stsepka',name:'Сцепка',family:'Stsepka Display',tag:'Конструктор · сцепки · юникейс',S0:138,GL:{},charset:'basic',
  desc:'Акцидентный узкий скруглённый шрифт с конструкторными лигатурами: соседние буквы сцепляются общей стойкой, крышей или ступенькой в один знак (OpenType calt — обычные, ss02 — все, ss01 — без сцепок). Тяжёлый рисунок из прямых кусков с одним радиусом скругления на все углы, строчные прыгают по строке, как в вывеске-конструкторе. Для вывесок, афиш, логотипов и заголовков.',
  sample:'Сцепка · Stsepka',sampleText:'КОНСТРУКТОР',ss01Name:'Без сцепок',ss02Name:'Все сцепки'};
const stIsLow=ch=>/\p{Ll}/u.test(ch);
function stEntry(ch){
  return {shape:g=>{const x=stD(g.p).glyph(ch);return x?stCont(x.cs):[];},w:p=>{const x=stD(p).glyph(ch);return x?x.adv:0;},k:stIsLow(ch)?'xh':'cap',opt:{fixed:true}};}
const ST_CHARS=[...ST_LAT_U,...ST_LAT_L,...ST_CYR_U,...ST_CYR_L,...'Ёё',...ST_DIG,...ST_SYM];
for(const ch of ST_CHARS){if(F.GL[ch])continue;
  const cyr=ST_SHARED[ch];
  if(cyr){F.GL[cyr]=F.GL[cyr]||stEntry(cyr);F.GL[ch]=F.GL[cyr];}else F.GL[ch]=stEntry(ch);}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
for(const c of [' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
/* ---- альтернаты: «Без сцепок» (ss01: буквы без сцепок не подставляются в лигатуры) и сами лигатуры (calt / ss02) ---- */
const stUsed=new Set();
for(const [spec] of stPairsAll()){for(const ch of spec)stUsed.add(ch);
  const sp=spec.toLowerCase(),m=ST_MODE_OF[spec];
  if(m!=='shelf'&&m!=='foot'&&stNoLcDy(sp)&&!ST_LC_DROP.has(sp))for(const ch of sp)stUsed.add(ch);}
for(const ch of stUsed){const b=F.GL[ch];if(!b)continue;
  F.GL[stGname(ch)+'.ss01']={shape:b.shape,w:b.w,k:b.k,opt:{fixed:true,alt:true,base:ch,feat:'ss01',own:true,kernAs:true}};}
function stLigEntry(spec,tier,lower){
  return {shape:g=>{const r=stD(g.p).ligGet(spec);return r&&r.keep?stCont(r.cs):[];},w:p=>{const r=stD(p).ligGet(spec);return r&&r.keep?r.adv:0;},k:lower?'xh':'cap',
    opt:{fixed:true,alt:true,base:spec[0],feat:(tier===1&&!lower)?'lig1':'lig2',own:true,lig:[...spec],tier,lower,ligName:true}};}
for(const [spec,tier] of stPairsAll()){
  F.GL[stLigName(spec)]=stLigEntry(spec,tier,false);
  const sp=spec.toLowerCase(),m=ST_MODE_OF[spec];
  if(m!=='shelf'&&m!=='foot'&&stNoLcDy(sp)&&!ST_LC_DROP.has(sp))F.GL[stLigName(sp)]=stLigEntry(sp,tier,true);}
F.GROUPS=[['Латиница · прописные',ST_LAT],['Латиница · строчные',ST_LATL],['Кириллица · прописные',ST_CY],['Кириллица · строчные',ST_CYL],['Цифры',ST_DIG],['Знаки',ST_SYM]];
F.CHARSET=ST_CHARS.concat([' ',' ',' ',' ']).filter(c=>F.GL[c]);
F.raw=(ch,p)=>{const x=stD(p).glyph(ch);return x||null;};
const K0={wdth:100,capH:700,xh:504,asc:860,desc:210,stem:138,hair:138,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:300,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,zrnd:45,zgap:44,zjump:100,zlig:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['capH','hair','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','sb','zlig'];
F.params={stem:['Насыщенность',112,164,1],wdth:['Ширина, %',85,125,1],xh:['Высота строчных',420,588,1]};
for(const k of HID)F.params[k]=null;
/* пресеты: характер, вес, скругление, зазор сцепки, режим сцепок */
const STP={
  poster:{stem:138,wdth:100,xh:504,zrnd:45,zgap:44,zjump:100},
  dense:{stem:156,wdth:92,xh:540,zrnd:35,zgap:28,zjump:30},
  soft:{stem:130,wdth:108,xh:490,zrnd:68,zgap:50,zjump:120},
  strict:{stem:140,wdth:96,xh:520,zrnd:8,zgap:40,zjump:20}};
F.methods=[
  ['Характер','Готовые системы: плакатная по умолчанию, плотная, мягкая и строгая.',[
    ['Плакат',STP.poster],['Плотный',STP.dense],['Мягкий',STP.soft],['Строгий',STP.strict]]],
  ['Сцепки','Какие пары букв сцепляются в один знак: обычные (calt), все (ss02: плотный набор и строчные), выключены (ss01).',[
    ['Обычные',{zlig:0}],['Все',{zlig:1}],['Выкл',{zlig:2}]]],
  ['Вес','Толщина штриха: от светлого до чёрного.',[['Светлый',{stem:118}],['Обычный',{stem:138}],['Жирный',{stem:152}],['Чёрный',{stem:164}]]],
  ['Скругление','Радиус скругления всех углов (выпуклые углы — R, вогнутые — R/2).',[['Острое',{zrnd:8}],['Обычное',{zrnd:45}],['Мягкое',{zrnd:60}],['Круглое',{zrnd:70}]]],
  ['Зазор сцепки','Ширина щели в сцепке и белого между буквами.',[['Тонкий',{zgap:24}],['Обычный',{zgap:44}],['Широкий',{zgap:58}]]],
  ['Строчные','Высота строчных и их прыжок по строке.',[['Низкие',{xh:440,zjump:60}],['Обычные',{xh:504,zjump:100}],['Высокие',{xh:570,zjump:100}],['Скачут',{xh:504,zjump:150}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=60;
const ST_ALLCH=ST_ALL.join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:' ',hang:true,asc:ST_ALLCH,desc:ST_ALLCH,descX:0,holeK:0.004};
/* пределы: ползунки независимы (проверено стресс-прогоном); всё остальное зафиксировано */
function stLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('stem',112,164,138);q.stem=Math.round(q.stem);q.hair=q.stem;L.hair=[q.stem,q.stem];
  cl('wdth',85,125,100);cl('xh',420,588,504);q.xh=Math.round(q.xh);
  cl('zrnd',5,70,45);cl('zgap',14,60,44);q.zgap=Math.round(q.zgap);cl('zjump',0,150,100);cl('zlig',0,2,0);q.zlig=Math.round(q.zlig);
  cl('capH',700,700,700);cl('asc',860,860,860);cl('desc',210,210,210);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',-60,100,0);cl('space',200,420,300);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='stsepka')return _pl(p,font);return stLim(p);};
WSCALE.stsepka=0.869;
/* семейство: Light ≈ S118, Regular = текущий, Bold ≈ 152, Black = 164 (границы безопасного S; ладдер масштабируется от положения ползунка) */
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='stsepka'){const t={Light:118,Regular:138,Bold:152,Black:164}[wn];if(t){const k=Math.max(0.8,Math.min(1.2,p.stem/138));o.stem=Math.round(Math.min(164,Math.max(112,t*k)));o.hair=o.stem;}return paramLimits(o,'stsepka').q;}
  return o;};
KERN_TABLE.stsepka=[];
/* ---- кернинг: собственный (баланс белой площади, как в движке), классы по одному знаку, значения считаются лениво ---- */
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='stsepka')return _ckt(st,prof,isLow,fontId);
  const D=stD(st.p),mem=ST_ALL.filter(ch=>prof(ch));
  const out={L:mem.map(ch=>[ch,[ch]]),R:mem.map(ch=>[ch,[ch]]),vals:null,tU:D.cfg.g,tL:D.cfg.g,pairs:{}};
  const kc=st.kc||{};
  out.vals=new Proxy({},{get:(t,key)=>{if(typeof key!=='string')return undefined;if(kc[key]!=null)return Math.max(-KERN_MAX,Math.min(KERN_MAX,Math.round(+kc[key])||0));
      const i=key.indexOf('|');return i<0?undefined:D.kern(key.slice(0,i),key.slice(i+1));},
    has:()=>true,ownKeys:()=>['*'],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true,value:0})});
  return out;};
/* ---- GSUB: ss02 (все сцепки) и calt (обычные) — лигатуры type 4; ss01 (без сцепок) делает хост перед ними ---- */
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='stsepka')return;
  const d1=[],d2=[];
  for(const g of glyphs){if(!g.alt||!g.alt.own)continue;const e=GL[g.name];if(!e||!e.opt.lig)continue;
    const comps=e.opt.lig.map(c=>gidByCh[c]);if(comps.some(x=>x==null))continue;
    (e.opt.tier===1&&!e.opt.lower?d1:d2).push({comps,lig:gidByName[g.name]});}
  if(d2.length){looks.push({type:4,subs:[otoLigSubst(d2)]});feats.push({tag:'ss02',lookups:[looks.length-1],nameID:257});}
  if(d1.length){looks.push({type:4,subs:[otoLigSubst(d1)]});feats.push({tag:'calt',lookups:[looks.length-1]});}};
/* сцепка, которую при текущих параметрах собрать нельзя, в файл не попадает (правило не пишется) */
let stCurP=null;
const _bt=buildTTF;
buildTTF=function(styleKey,state,opts){const o=state&&state.styles&&state.styles[styleKey];const prev=stCurP;stCurP=o?o.p:null;try{return _bt.apply(this,arguments);}finally{stCurP=prev;}};
const _aok=otAltOk;
otAltOk=function(a,have,tabOn,italic){const r=_aok(a,have,tabOn,italic);if(!r||CUR_FONT!=='stsepka')return r;
  const e=GL[a.name];if(e&&e.opt&&e.opt.ligName&&stCurP){const x=stD(stCurP).ligGet(e.opt.lig.join(''));if(!x||!x.keep)return false;}return r;};
/* каталог сцепок для превью и тестов */
const STS={D:stD,eng:stEng,LIM:ST_LIM,ligName:stLigName,gname:stGname,
  /* правила превью: массив {chars,name} для режима ('calt' | 'ss02'), только собираемые при параметрах p */
  rules(p,which){const D=stD(p),out=[];
    for(const [spec] of stPairsAll())for(const sp of [spec,spec.toLowerCase()]){const r=D.ligGet(sp);if(!r||!r.keep)continue;
      const dense=r.lower||r.tier>1;if((which==='ss02')!==dense)continue;out.push({chars:[...sp],name:stLigName(sp)});}
    return out.sort((a,b)=>b.chars.length-a.chars.length);},
  /* текст -> массив токенов: строка-знак или {name} */
  apply(text,p,mode){const A=[...text].map(c=>({c}));if(mode===2)return A;
    for(const which of (mode===1?['ss02','calt']:['calt'])){const R=STS.rules(p,which);if(!R.length)continue;const by=new Map();R.forEach(r=>{(by.get(r.chars[0])||by.set(r.chars[0],[]).get(r.chars[0])).push(r);});
      for(let i=0;i<A.length;i++){if(A[i].n)continue;const L=by.get(A[i].c);if(!L)continue;
        for(const r of L){let ok=true;for(let k=0;k<r.chars.length;k++){const t=A[i+k];if(!t||t.n||t.c!==r.chars[k]){ok=false;break;}}
          if(ok){A.splice(i,r.chars.length,{n:r.name});break;}}}}
    return A;}};
FONTS.stsepka=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!ST_KEYS.includes(r[0])&&!['track','space','slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='stsepka'){const f=FONTS[id];f.params=f.params||{};for(const k of ST_KEYS)if(!(k in f.params))f.params[k]=null;}
if(typeof globalThis!=='undefined')globalThis.STS=STS;
}
