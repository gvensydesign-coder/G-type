/* ===== Панель «OpenType»: функции шрифта в образце (m29 · OT) =====
   Образец рисуется из контуров, а не системным шрифтом, поэтому font-feature-settings не работает: те же подстановки, что пишутся
   в GSUB (core_ot_o1.js, otFeaturesO1), повторяет OTU.pre — заменяет знаки текста на служебные символы U+F800…, а ctxName
   отдаёт для них имя знака (a.sc, one.osf, f_i …). Подключается обёртками layout / layoutG / ctxName / syncPanel. */
const OTU={on:{smcp:0,c2sc:0,onum:0,tnum:0,frac:0,sups:0,subs:0,liga:1,salt:0,swsh:0},pua:new Map(),rev:new Map(),next:0xF800};
try{const j=JSON.parse(localStorage.getItem('ot_o1')||'null');if(j&&typeof j==='object')for(const k in OTU.on)if(k in j)OTU.on[k]=j[k]?1:0;}catch(e){}
OTU.save=()=>{try{localStorage.setItem('ot_o1',JSON.stringify(OTU.on));}catch(e){}};
/* ряды панели: ключ, подпись, подсказка (термины ПараТайп), признак наличия в шрифте */
OTU.ROWS=[
  ['smcp','Капитель','Строчные буквы заменяются уменьшенными прописными — капителью. Высота чуть больше строчных, штрих тот же, знаки чуть шире прописных. Работает для латиницы и кириллицы (OpenType smcp).'],
  ['c2sc','Капитель из прописных','Прописные тоже становятся капителью, весь текст набирается капителью (OpenType c2sc). Включайте вместе с «Капителью».'],
  ['onum','Минускульные цифры','Текстовые цифры разной высоты: 0 1 2 по высоте строчных, 6 и 8 с верхним выносным, 3 4 5 7 9 с нижним (OpenType onum). Хорошо сидят в обычном тексте.'],
  ['tnum','Табличные цифры','Все цифры одной ширины, столбцы чисел и суммы встают ровно; знаки €, $, ₽ тоже. Без галочки цифры пропорциональные (OpenType tnum).'],
  ['frac','Дроби','Запись 1/2 превращается в настоящую дробь: уменьшенные числитель и знаменатель и косая черта под 45° (OpenType frac).'],
  ['sups','Верхние индексы','Цифры поднимаются на верхнюю линию и уменьшаются, как в м² или сноске (OpenType sups).'],
  ['subs','Нижние индексы','Цифры опускаются ниже основной линии и уменьшаются, как в H2O (OpenType subs).'],
  ['liga','Лигатуры fi fl ff','Сцепки латинских fi, fl, ff, ffi, ffl в один знак без наложения крючка f на точку. Только латиница: у русских букв лигатур нет (OpenType liga).'],
  ['salt','Альтернаты','Раздельные формы букв а е о с д г без входного и выходного штриха — «печатные» варианты рукописных (OpenType salt).'],
  ['swsh','Росчерки','Длинный выходной штрих у последней буквы слова и подводящий штрих у прописной, в логике остроконечного пера (OpenType swsh).']];
/* поддержка: есть ли в шрифте знаки для функции */
OTU.has=k=>{if(!OTO.on(CUR_FONT))return false;const G=FONTS[CUR_FONT].GL;
  switch(k){case'smcp':case'c2sc':return !!(G['a.sc']&&G['uni0430.sc']);case'onum':return !!G['one.osf'];case'tnum':return !!G['one.tf'];
    case'frac':return !!(G['one.numr']&&G['\u2044']);case'sups':return !!G['one.numr'];case'subs':return !!G['one.subs'];case'liga':return !!G['f_i']&&OTO.LIG_FONTS.indexOf(CUR_FONT)>=0;
    case'salt':return !!G['a.salt'];case'swsh':return !!G['n.swsh'];}return false;};
OTU.any=()=>OTO.on(CUR_FONT)&&OTU.ROWS.some(r=>OTU.on[r[0]]&&OTU.has(r[0]));
OTU.ch=name=>{let c=OTU.pua.get(name);if(!c){c=String.fromCodePoint(OTU.next++);OTU.pua.set(name,c);OTU.rev.set(c,name);}return c;};
const OTU_DIG=['zero','one','two','three','four','five','six','seven','eight','nine'];
/* преобразование текста */
OTU.pre=function(text){
  if(typeof text!=='string'||!OTU.any())return text;
  text=text.replace(/[\uF800-\uF8FF]/g,'\uFFFD');/* FX80 B11: служебный диапазон U+F800… занят внутренними именами; введённые пользователем знаки оттуда не должны с ними склеиваться */
  const F=FONTS[CUR_FONT],G=F.GL,on=k=>OTU.on[k]&&OTU.has(k),A=[...text],R=A.map(c=>({c,n:null,del:false}));
  const has=n=>!!G[n],nm=c=>otoName(c);
  const free=i=>!R[i].n&&!R[i].del;
  const isL=c=>/\p{L}/u.test(c),isD=c=>c>='0'&&c<='9';
  let tab=false;try{tab=!!safeP(cur().p).tabular;}catch(e){}
  /* лигатуры (латиница) */
  if(on('liga')){for(let i=0;i<A.length;i++){if(!free(i)||A[i]!=='f')continue;
    for(const [lg,seq] of [['f_f_i','ffi'],['f_f_l','ffl'],['f_f','ff'],['f_i','fi'],['f_l','fl']]){
      if(has(lg)&&seq.split('').every((c,k)=>i+k<A.length&&A[i+k]===c&&free(i+k))){R[i].n=lg;for(let k=1;k<seq.length;k++)R[i+k].del=true;break;}}}}
  /* капитель */
  if(on('smcp')||on('c2sc')){for(let i=0;i<A.length;i++){if(!free(i))continue;const c=A[i];if(!isL(c))continue;const lo=c.toLowerCase(),up=c.toUpperCase();
    if(c===lo&&c!==up){if(on('smcp')&&has(nm(c)+'.sc'))R[i].n=nm(c)+'.sc';}
    else if(c===up&&c!==lo){if(on('c2sc')){const k=nm(lo)+'.sc';if(has(k))R[i].n=k;}}}}
  /* дроби: цифры + / + цифры */
  const fr=new Set();
  if(on('frac')){for(let i=0;i<A.length;i++){const c=A[i];if(c!=='/'&&c!=='⁄')continue;if(i===0||i+1>=A.length||!isD(A[i-1])||!isD(A[i+1]))continue;
    R[i].n='uni2044';fr.add(i);let j=i-1;while(j>=0&&isD(A[j])){R[j].n=OTO_DIG[+A[j]]+'.numr';fr.add(j);j--;}
    j=i+1;while(j<A.length&&isD(A[j])){R[j].n=OTO_DIG[+A[j]]+'.dnom';fr.add(j);j++;}}}
  /* цифры */
  for(let i=0;i<A.length;i++){const c=A[i];if(!free(i))continue;
    if(isD(c)){const d=OTO_DIG[+c];let n=null;
      if(on('sups'))n=d+'.numr';else if(on('subs'))n=d+'.subs';
      else if(on('onum'))n=d+((on('tnum')||tab)?'.tosf':'.osf');
      else if(on('tnum')&&!tab)n=d+'.tf';
      if(n&&has(n))R[i].n=n;}
    else if(on('tnum')&&!tab&&OTO.CUR&&OTO.CUR[c]&&has(OTO.CUR[c]+'.tf'))R[i].n=OTO.CUR[c]+'.tf';}
  /* альтернаты */
  if(on('salt')){for(let i=0;i<A.length;i++){if(!free(i))continue;const k=nm(A[i])+'.salt';if(isL(A[i])&&has(k))R[i].n=k;}}
  /* росчерки: подвод у первой прописной слова, выход у последней строчной */
  if(on('swsh')){for(let i=0;i<A.length;i++){const c=A[i];if(!isL(c)||R[i].del)continue;
    const prevL=i>0&&isL(A[i-1]),nextL=i+1<A.length&&isL(A[i+1]),k=nm(c)+'.swsh';if(!has(k))continue;
    const d=G[k];if(d&&d.opt&&d.opt.term&&!nextL)R[i].n=k;
    else if(d&&d.opt&&d.opt.lead&&!prevL&&free(i))R[i].n=k;}}
  return R.filter(r=>!r.del).map(r=>r.n?OTU.ch(r.n):r.c).join('');
};
/* имя знака: служебный символ → имя GL; прочее — как было (в т.ч. calt Прописи) */
const _ctxName_ot=ctxName;
ctxName=function(prev,ch){const n=OTU.rev.get(ch);return n||_ctxName_ot(OTU.rev.has(prev)?'':prev,ch);};
const _layout_ot=layout;
layout=function(text){const a=Array.prototype.slice.call(arguments);a[0]=OTU.pre(text);return _layout_ot.apply(this,a);};
if(typeof layoutG==='function'){const _lg=layoutG;layoutG=function(text){const a=Array.prototype.slice.call(arguments);a[0]=OTU.pre(text);return _lg.apply(this,a);};}
/* ---------- панель ---------- */
(function(){const st=document.createElement('style');st.textContent=`
#otsec .ot-list{display:flex;flex-direction:column;gap:6px;padding:4px 0 6px}
#otsec .chk{display:flex;align-items:center;gap:8px;font-size:var(--fs-md);color:var(--ink);cursor:pointer;line-height:1.3}
#otsec .chk[hidden]{display:none}
#otsec .chk input{accent-color:var(--accent);width:16px;height:16px;margin:0;flex:none}
#otsec .ot-hint{font-size:var(--fs-sm);color:var(--muted);line-height:1.4}
`;document.head.appendChild(st);})();
function otuMount(){
  const pan=$('.panel');if(!pan)return;
  if(!$('#otsec')){const q=paneEl('ed-ot','OpenType','<div class="ot-list">'
      +OTU.ROWS.map(r=>'<label class="chk" data-otrow="'+r[0]+'" title="'+r[2].replace(/"/g,'&quot;')+'"><input type="checkbox" data-ot="'+r[0]+'" aria-label="'+r[1]+'">'+r[1]+'</label>').join('')
      +'</div><div class="ot-hint">Образец показывает подстановки так же, как их применит программа; в файл шрифта они записываются всегда.</div>',{tip:'Функции шрифта: капитель, цифры, дроби, индексы, лигатуры, альтернаты. Включаются в образце и записываются в экспортируемый шрифт'});q.id='otsec';
    pan.appendChild(q);paneInit(q,'ed-ot',false);/* свёрнута по умолчанию, состояние помнится */
    q.addEventListener('change',e=>{const k=e.target&&e.target.dataset&&e.target.dataset.ot;if(!k)return;OTU.on[k]=e.target.checked?1:0;
      if(k==='sups'&&e.target.checked){OTU.on.subs=0;}if(k==='subs'&&e.target.checked){OTU.on.sups=0;}
      OTU.save();otuSync();if(typeof schedule==='function')schedule();else if(typeof drawSpecimen==='function')drawSpecimen();});}
  otuSync();}
function otuSync(){const q=$('#otsec');if(!q)return;let n=0;
  for(const r of OTU.ROWS){const row=q.querySelector('[data-otrow="'+r[0]+'"]'),sup=OTU.has(r[0]);if(!row)continue;row.hidden=!sup;if(sup)n++;
    const i=row.querySelector('input');if(i)i.checked=!!OTU.on[r[0]];}
  q.hidden=n===0;}
const _syncPanel_ot=syncPanel;
syncPanel=function(){const r=_syncPanel_ot.apply(this,arguments);try{otuMount();}catch(e){}return r;};
