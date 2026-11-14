/* ===== PORT, часть X: «Перед скачиванием» (предпросмотр экспорта) и «Поделиться» (карточка 1080×1350) =====
   Предпросмотр открывается из меню «Скачать» (ui_c.js: PORT.xpvWant / PORT.xpvOpen) и запускает прежние EX_RUN. Подпись автора = PROF.meta().sign (ID 9 и 12 в таблице name),
   лицензия = PORT.licOf (ID 13 и 14 пишет core_meta_l1.js через GT_LICENSE). Размеры файлов оценочные. PNG уходит через saveFile. */
(function(){
'use strict';
const PF=window.PROF,PORT=window.PORT;
const {esc,ic,plural,$1,$A}=PF;
const {LIC,LIC_IDS,licOf,licBadge,licRadios,tok,works,byFid,paintText,authorName}=PORT;
const M=()=>PF.meta();
const fui=()=>tok('--f-ui');

/* =====================================================================
   «Поделиться»: одно окно на всё приложение, SHARE (ui_share.js): форматы, темы, своя фраза, PNG / WebM / MP4.
   FX80 F4: прежнее окно «только PNG» и «Скопировать ссылку» убраны (ссылка никуда не вела). Точки входа (карточка библиотеки,
   меню «…», «Созданные шрифты», профиль) вызывают PORT.share({fid}); имя на постере то же, что в редакторе.
   ===================================================================== */
PORT.share=function(o){
  o=o||{};
  let fid=o.fid;
  if(!fid||!FONTS[fid]){/* профиль без выбранного шрифта: закреплённая работа, иначе первая готовая */
    const ws=works(),pin=M().pins.map(k=>ws.find(x=>x.key===k)).filter(Boolean)[0]||ws[0];
    fid=pin&&pin.fid;
  }
  if(!fid||!FONTS[fid]){toast('Сначала создайте шрифт, которым можно поделиться');return null;}
  const w=byFid(fid);
  if(window.SHARE)SHARE.open(fid,fid==='imp'&&w?w.name:undefined,{opener:document.activeElement});
  return null;
};
PF.openShare=PORT.share;

/* =====================================================================
   «Перед скачиванием»
   ===================================================================== */
const XFMT=[['ttf','TTF'],['otf','OTF'],['woff2','WOFF2'],['woff','WOFF'],['fam','Семейство'],['vf','Вариативный'],['png','PNG']];
/* одна строка простым языком под кнопками форматов */
const XHINT={ttf:'Для установки в систему',otf:'Для установки в систему, кривые как в редакторе, удобно для дизайн-программ',woff2:'Для сайтов, самый лёгкий',woff:'Для старых браузеров',fam:'Все веса и курсивы одним архивом: TTF, OTF, WOFF2, WOFF',vf:'Все веса в одном архиве: TTF и WOFF2. OTF у вариативных не бывает',png:'Картинка с текстом этим шрифтом'};
const CYR='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',SIGNS='0123456789.,:;!?-–—«»()"\'№/%+=*&@#$₽€…';
const OTH={smcp:['Капитель','строчные становятся малыми прописными'],c2sc:['Капитель из прописных','весь текст малыми прописными'],onum:['Цифры разной высоты','текстовые, как строчные буквы'],tnum:['Цифры одной ширины','столбцы чисел встают ровно'],frac:['Дроби','1/2 превращается в настоящую дробь'],sups:['Верхние индексы','как в м² и сносках'],subs:['Нижние индексы','как в H₂O'],liga:['Лигатуры','fi, fl, ff в один знак'],salt:['Альтернативы','запасные формы букв'],swsh:['Росчерки','длинные выходные штрихи'],kern:['Кернинг','расстояния между парами букв подобраны'],calt:['Сцепки букв','буквы соединяются сами по контексту'],ss01:['Набор форм 1','другие формы по включению']};
function xStats(){
  const F=FONTS[S.fontId],cs=(F.CHARSET||[]).filter(c=>c!==' '&&c!==' '),has=new Set(cs);
  /* FX80 B03: знак без контуров (в любом из двух начертаний) в набор не засчитывается: файл унесёт его пустым */
  const emp=new Set();
  for(const c of cs){let e=false;
    try{const r=typeof AP!=='undefined'&&AP.res&&AP.res.get(c);if(r&&r.issues.some(x=>x.t==='пустой контур'))e=true;}catch(x){}
    if(!e)for(const k of ['regular','italic']){try{if(S.styles[k]){const g=getFinal(c,k);if(!g||!g.cs||!g.cs.length){e=true;break;}}}catch(x){}}
    if(e)emp.add(c);}
  const row=(label,set)=>{const exp=[...set],got=exp.filter(c=>has.has(c)&&!emp.has(c));return {label,got:got.length,exp:exp.length,miss:exp.filter(c=>!has.has(c)),emp:exp.filter(c=>emp.has(c))};};
  let feats=[];
  try{if(typeof OTU!=='undefined')feats=OTU.ROWS.filter(r=>OTU.has(r[0])).map(r=>r[0]);}catch(e){}
  feats=['kern'].concat(feats);
  if(S.fontId==='stsepka')feats.push('calt');
  return {n:cs.length,emp:[...emp],rows:[row('Кириллица',CYR),row('Латиница',LAT),row('Знаки и цифры',SIGNS)],feats};
}
const XP={fmt:'ttf',pick:false,el:null,sc:null};
const sizeKb=(n,k)=>Math.max(9,Math.round(n*.46*k+12));
const fmtSize=kb=>kb>=1000?(kb/1024).toFixed(1).replace('.',',')+' МБ':kb+' КБ';
function xFiles(x,n){
  const base=psSafe(S.family),r=sizeKb(n,1),i=sizeKb(n,1.04);
  if(x==='ttf')return [[base+'-Regular.ttf',r],[base+'-Italic.ttf',i]];
  if(x==='otf')return [[base+'-Regular.otf',Math.round(r*.56)],[base+'-Italic.otf',Math.round(i*.56)]];
  if(x==='woff2')return [[base+'-Regular.woff2',Math.round(r*.22)],[base+'-Italic.woff2',Math.round(i*.22)]];
  if(x==='woff')return [[base+'-Regular.woff',Math.round(r*.55)],[base+'-Italic.woff',Math.round(i*.55)]];
  if(x==='fam')return [[base+'-family.zip',Math.round((r+i)*4*1.7)]];
  if(x==='vf')return [[base+'-VF.zip',Math.round((r*1.9+i*1.9+r*.4+i*.4)*1.02)]];
  return [[base+'-sample.png',140]];
}
function xStyles(x){
  if(x==='fam')return ['Тонкий','Обычный','Жирный','Чёрный','Тонкий курсив','Обычный курсив','Жирный курсив','Чёрный курсив'];
  if(x==='vf')return ['Вес 300–900','Прямой','Италик'];
  if(x==='png')return ['Образец шрифта'];
  return ['Прямой','Италик'];
}
function xpvBuild(){
  if(XP.el)return;
  const sc=document.createElement('div');sc.className='xpv-sc';sc.hidden=true;
  const el=document.createElement('section');el.className='xpv';el.id='xpv';el.hidden=true;el.tabIndex=-1;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','xpv-t');
  document.body.appendChild(sc);document.body.appendChild(el);XP.el=el;XP.sc=sc;
  sc.addEventListener('click',()=>xpvClose());
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();xpvClose();}
    if(e.key==='Tab'){const f=$A('button:not([disabled]),input:not([disabled])',el).filter(x=>x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}});
  el.addEventListener('click',e=>{
    const f=e.target.closest('[data-xf]'),l=e.target.closest('[data-xl]'),b=e.target.closest('[data-xa]');
    if(f){XP.fmt=f.dataset.xf;xpvPaint(true,'[data-xf="'+XP.fmt+'"]');}
    if(l){M().lic[S.fontId]=l.dataset.xl;PF.saveMeta();XP.pick=false;xpvPaint(true,'[data-xa=lic]');licSync();}
    if(b){const a=b.dataset.xa;
      if(a==='lic'){XP.pick=!XP.pick;xpvPaint(true,'[data-xa=lic]');}
      else if(a==='close')xpvClose();
      else if(a==='go')xpvGo();}
  });
  /* подпись автора: тот же переключатель, что в профиле (M.sign), сразу попадает в GT_AUTHOR и в таблицу name */
  el.addEventListener('change',e=>{if(e.target.id==='xpv-sig'){M().sign=!!e.target.checked;PF.saveMeta();PF.syncAuthor();xpvPaint(true,'#xpv-sig');}});
}
function xpvPaint(keep,focus){
  const el=XP.el;if(!el)return;
  const F=FONTS[S.fontId],st=xStats(),x=XP.fmt,files=xFiles(x,st.n),tot=files.reduce((a,f)=>a+f[1],0);
  const lic=licOf(S.fontId),L=LIC[lic],nm=authorName(),sigOn=!!(M().sign&&nm);
  const sc=el.querySelector('.xpv-b'),top=sc?sc.scrollTop:0;
  const lst=a=>a.slice(0,4).join(' ')+(a.length>4?' и ещё '+(a.length-4):'');
  const miss=r=>(r.miss.length||r.emp.length)?[r.miss.length?'не хватает: '+lst(r.miss):'',r.emp.length?'пустые: '+lst(r.emp):''].filter(Boolean).join(' · '):'полностью';
  const cov=st.rows.map(r=>{const pc=Math.round(r.got/r.exp*100);return '<div class="r'+((r.miss.length||r.emp.length)?' part':'')+'"><span>'+r.label+'</span><span class="bar" role="img" aria-label="'+r.label+': '+pc+' %"><i style="width:'+pc+'%"></i></span><span class="n">'+r.got+' из '+r.exp+' · '+miss(r)+'</span></div>';}).join('');
  const ot=st.feats.map(t=>{const h=OTH[t]||[t,''];return '<div class="o">'+ic('check')+'<span><b>'+esc(h[0])+'</b>'+(h[1]?' — '+esc(h[1]):'')+'</span></div>';}).join('');
  el.innerHTML='<div class="xpv-h"><div class="t"><h2 id="xpv-t">Перед скачиванием</h2><p>'+esc(F.name)+' · '+esc(S.family)+'</p></div><button class="ibtn sm" type="button" data-xa="close" aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<div class="xpv-fmt" role="group" aria-label="Формат">'+XFMT.map(f=>'<button class="chip" type="button" data-xf="'+f[0]+'" aria-pressed="'+(f[0]===x)+'">'+f[1]+'</button>').join('')+'</div>'+
    '<p class="xpv-hint" id="xpv-hint">'+esc(XHINT[x]||'')+'</p>'+
    '<div class="xpv-b"><div class="xpv-c">'+
    '<div class="xpv-s"><div class="k">Начертания</div><div class="xpv-chips">'+xStyles(x).map(s=>'<span class="tg">'+esc(s)+'</span>').join('')+'</div></div>'+
    '<div class="xpv-s"><div class="k">Знаки</div><div class="xpv-cov">'+cov+'</div>'+(st.emp.length?'<div class="xpv-warn" role="alert"><b>Пустые знаки: '+esc(st.emp.slice(0,12).join(' ')+(st.emp.length>12?' и ещё '+(st.emp.length-12):''))+'</b><span>В файле они останутся без контуров. Верните части знака в редакторе или откройте «Проверку».</span></div>':'')+'</div>'+
    '<div class="xpv-s"><div class="k">Возможности OpenType</div><div class="xpv-ot">'+ot+'</div></div></div>'+
    '<div class="xpv-c"><div class="xpv-s"><div class="k">Лицензия<button class="btn sm ghost" type="button" data-xa="lic" aria-expanded="'+XP.pick+'">'+(XP.pick?'Свернуть':(lic?'Изменить':'Выбрать'))+'</button></div><div class="xpv-lic">'+
      (lic?'<div class="row">'+licBadge(lic)+'<b>'+esc(L.n)+'</b></div><p>'+esc(L.d)+'</p>':'<p>Лицензия не выбрана. Файл останется без неё, пока вы её не укажете.</p>')+
      (XP.pick?'<div class="pick" role="radiogroup" aria-label="Лицензия">'+licRadios('data-xl',lic)+'</div>':'')+
      (lic?'<p class="lic-note">Текст лицензии'+(L.url?' и ссылка':'')+' запишутся в файл шрифта.</p>':'')+'</div></div>'+
    '<div class="xpv-s"><div class="xpv-sig"><div class="tt"><b>Подпись автора</b><span>'+(nm?(sigOn?'«'+esc(nm)+'» запишется в файл':'Имя в файл не попадёт'):'Укажите имя в профиле, чтобы подписывать шрифты')+'</span></div><label class="tgl"><input id="xpv-sig" type="checkbox" role="switch" aria-label="Подпись автора"'+(sigOn?' checked':'')+(nm?'':' disabled')+'><span></span></label></div></div>'+
    '<div class="xpv-s"><div class="k">Файлы<span>≈ '+fmtSize(tot)+'</span></div><div class="xpv-files">'+files.map(f=>'<div class="f">'+ic('download')+'<b>'+esc(f[0])+'</b><span>≈ '+fmtSize(f[1])+'</span></div>').join('')+'</div></div></div></div>'+
    '<div class="xpv-f"><span class="sp">Файлы сохранятся в «Загрузки»</span><button class="btn lg" type="button" data-xa="close">Отмена</button><button class="btn pri lg" type="button" data-xa="go">'+ic('download')+'Скачать шрифт</button></div>';
  const nb=el.querySelector('.xpv-b');if(nb&&keep)nb.scrollTop=top;
  if(focus){const t=$1(focus,el);if(t)t.focus({preventScroll:true});}
}
PORT.xpvWant=x=>XFMT.some(f=>f[0]===x)&&!!FONTS[S.fontId];
PORT.xpvOpen=function(x,pick){
  xpvBuild();XP.fmt=x||'ttf';XP.pick=!!pick;xpvPaint();
  XP.el.hidden=false;XP.sc.hidden=false;XP.prev=document.activeElement;
  $1('[data-xa=go]',XP.el).focus({preventScroll:true});
};
function xpvClose(){if(!XP.el||XP.el.hidden)return;XP.el.hidden=true;XP.sc.hidden=true;if(XP.prev&&XP.prev.focus)XP.prev.focus({preventScroll:true});}
function xpvGo(){const x=XP.fmt;xpvClose();exRun(x);}
/* значок лицензии рядом с кнопкой «Скачать» (на телефоне скрыт) */
function licSync(){
  const b=$1('#lic-x');if(!b)return;const l=licOf(S.fontId),x=LIC[l];
  b.hidden=!x;if(!x)return;b.dataset.l=l;b.textContent=x.b;b.title='Лицензия: '+x.n+'. '+x.d;b.setAttribute('aria-label','Лицензия: '+x.n+'. Изменить');
}
function boot(){
  const xw=$1('#xwrap');
  if(xw&&!$1('#lic-x')){const b=document.createElement('button');b.id='lic-x';b.type='button';b.className='lic-b';b.addEventListener('click',()=>PORT.xpvOpen('ttf',true));xw.insertBefore(b,xw.firstChild);}
  licSync();
}
try{const o=switchFont;switchFont=function(){const r=o.apply(this,arguments);try{licSync();}catch(e){}return r;};}catch(e){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
