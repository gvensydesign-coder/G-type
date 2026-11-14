/* ===== Базовый набор: свойство шрифта charset:'basic' =====
   Шрифт, помеченный charset:'basic', содержит только базовый набор: кириллица А–Я а–я Ёё, латиница A–Z a–z, цифры,
   основная пунктуация и пробелы. Остальное (диакритика, расширенные кириллица/латиница, редкие символы) в нём не создаётся:
     — список знаков и группы (GROUPS) показывают только базовые разделы;
     — статический, семейный и вариативный экспорт строятся по CHARSET — в файле базовый набор, .notdef и пробелы;
     — «Сверка»/полнота набора считает базовый набор полным (предупреждений «нет» по расширенному набору не бывает);
     — в библиотеке на карточке — метка «Базовый набор».
   Шрифту достаточно выставить флаг; обрезка выполняется один раз при регистрации (последним шагом загрузки) и при useFont.
   У остальных шрифтов поле charset не задано — ничего не меняется. */
const BASIC_CYR='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const BASIC_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASIC_DIG='0123456789';
const BASIC_PUN='.,:;!?«»„“”‘’…"\'-–—−\u2012()/&@№\u00b7\u00a9\u20bd#%*+=\\|\u00b0\u2022';   // CS68: · © ₽ # % * + = \ | ° • join the basic set   // «ёлочки» и „лапки“, ‘одиночные’, многоточие, минус (U+2212)
const BASIC_SP=' \u00a0\u2009\u202f';   // пробел, неразрывный, тонкий, узкий неразрывный
const BASIC_SET=new Set([...BASIC_CYR,...BASIC_LAT,...BASIC_DIG,...BASIC_PUN,...BASIC_SP]);
const BASIC_TITLES=['Латиница · прописные','Латиница · строчные','Кириллица · прописные','Кириллица · строчные','Цифры','Знаки','Пробелы'];
const isBasicChar=ch=>BASIC_SET.has(ch);
const fontIsBasic=id=>{const f=FONTS[id==null?(typeof CUR_FONT==='string'?CUR_FONT:''):id];return !!(f&&f.charset==='basic');};
/* обрезка шрифта до базового набора: CHARSET, GROUPS и записи GL (копия — GL у шрифтов может быть общим) */
function applyBasicCharset(f){
  if(!f||f.charset!=='basic'||f._basicDone)return;
  f._basicDone=true;
  /* знаки базового набора, которые у шрифта есть, но не вошли в его CHARSET/группу «Знаки» (например «−») */
  for(const c of BASIC_PUN)if(f.GL[c]&&!f.CHARSET.includes(c))f.CHARSET.push(c);
  for(const g of f.GROUPS)if(g[0]==='Знаки'){const add=Array.from(BASIC_PUN).filter(c=>f.GL[c]&&!g[1].includes(c)).join('');if(add)g[1]+=add;}
  f.CHARSET=f.CHARSET.filter(isBasicChar);
  const G={};
  for(const k of Object.keys(f.GL)){const e=f.GL[k];
    if(Array.from(k).length===1&&k.length===1){if(isBasicChar(k))G[k]=e;}
    else if(e&&e.opt&&e.opt.alt){const b=e.opt.base;if(b&&isBasicChar(b))G[k]=e;}   // неэкодированные альтернаты (ss01, case, tnum …) — только базовых знаков
    else G[k]=e;}
  f.GL=G;
  const gr=[];
  for(const g of f.GROUPS){const s=Array.from(g[1]).filter(c=>isBasicChar(c)&&G[c]).join('');
    if(s&&(BASIC_TITLES.includes(g[0])||!/расширенн|диакритик/.test(g[0])))gr.push(Object.assign([g[0],s],g.cu?{cu:true}:{}));}
  f.GROUPS=gr;
}
/* пробелы у всех шрифтов: неразрывный U+00A0 (ширина пробела), тонкий U+2009 и узкий неразрывный U+202F (1/8–1/5 кегля, thinSpace в core1);
   цифровое тире U+2012: ширина цифры 0, ось минуса (клон «−» или «–» с шириной нуля). FIX-ENGINE: функция вызывается и для шрифтов,
   которые регистрируются позже этого файла (Аппликация, Сцепка, Пиксель) — из useFont и в конце загрузки (core_meta_l1). */
function basicExtras(id){const f=FONTS[id];if(!f||f._bxDone)return;f._bxDone=true;
  for(const c of ['\u00a0','\u2009','\u202f']){
    if(!f.GL[c])f.GL[c]={shape:()=>[],skel:()=>[],w:c==='\u00a0'?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
    if(!f.CHARSET.includes(c))f.CHARSET.push(c);}
  const fd='\u2012';
  if(!f.GL[fd]&&f.GL['0']&&(f.GL['−']||f.GL['–'])){const B=f.GL['−']||f.GL['–'],Z=f.GL['0'];
    f.GL[fd]=Object.assign({},B,{w:Z.w,opt:Object.assign({},B.opt||{},id==='pixel'?{}:{fdSynth:true})});}
  if(f.GL[fd]){if(!f.CHARSET.includes(fd))f.CHARSET.push(fd);
    for(const g of f.GROUPS)if(g[0]==='Знаки'&&!g[1].includes(fd)){const i=g[1].indexOf('—');g[1]=i>=0?g[1].slice(0,i+1)+fd+g[1].slice(i+1):g[1]+fd;}}}
for(const id of Object.keys(FONTS))basicExtras(id);
/* цифровое тире (клон минуса): продвиг = продвиг цифры 0 с оптическими полями; правая половина планки сдвигается, торцы не деформируются */
const _fg_fd=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fg_fd.apply(this,arguments);
  if(ch!=='\u2012'||!g||!g.cs||!g.cs.length)return g;
  const d=GL[ch];if(!d||!d.opt||!d.opt.fdSynth)return g;
  const z=_fg_fd('0',st,edits,Object.assign({},opt||{}));if(!z||!(z.adv>0))return g;
  const bx=q=>{let a=1e9,b=-1e9;for(const c of q.cs)for(const n of c.nodes){if(n.x<a)a=n.x;if(n.x>b)b=n.x;}return [a,b];};
  const m=_fg_fd('\u2212',st,edits,Object.assign({},opt||{}))||g,mb=bx(m);/* поля торцов — как у минуса */
  const [x0,x1]=bx(g),dL=mb[0]-x0,dl=(z.adv-(m.adv-mb[1]))-x1;
  if(Math.abs(dl)<0.5&&Math.abs(dL)<0.5&&Math.abs(z.adv-g.adv)<0.5)return g;
  const cx=(x0+x1)/2;
  return Object.assign({},g,{cs:xf(g.cs,(x,y)=>[x>cx?x+dl:x+dL,y]),adv:z.adv});};
for(const id of Object.keys(FONTS))applyBasicCharset(FONTS[id]);
const _useFont_basic=useFont;
useFont=function(id){basicExtras(id);applyBasicCharset(FONTS[id]);return _useFont_basic(id);};
/* новые параметры конструкции скрыты у шрифтов, которые их не объявили (ползунки есть только у «Устава») */
for(const id of Object.keys(FONTS)){const f=FONTS[id];if(f.id==='renessa')continue;f.params=Object.assign({},f.params||{});
  for(const k of ['ser','brk','hsl','ball','fla'])if(f.params[k]===undefined)f.params[k]=null;
  if(f.id==='ustav')continue;
  for(const k of ['flare','slope','point','drop'])if(f.params[k]===undefined)f.params[k]=null;}
