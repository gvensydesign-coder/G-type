/* ===== DS: collapsible .pane, live platform facts, hidden «Дизайн-система» page (#ds) =====
   paneInit(el,key,defaultOpen) — see DESIGN_SYSTEM.md. platformInfo() — facts computed from FONTS / FONT_META / DOM export menu / OT + VFX tables.
   openDS()/closeDS() — reference page, route #ds (not in the rail). */

/* ---------- token colours for canvas code: dsColor('accent') reads the live CSS variable ---------- */
const DS_FALL={accent:'#FC473C',glyph:'#000000','cv-muted':'#6a6a72','cv-line':'#e3e3e6',danger:'#B42318',ink:'#0b0b0c'};
function dsColor(name){
  try{const v=getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim();if(v)return v;}catch(e){}
  return DS_FALL[name]||'#000000';
}

/* ---------- .pane: the ONE collapsible-panel implementation (editor, draw, import, DS page) ----------
   Markup (build it with paneHTML or write it by hand):
     <section class="pane" data-pane="key"><button class="pane-h" aria-expanded><span class="pane-t">Title</span><i class="pane-chev"></i></button><div class="pane-b">…</div></section>
   State: class .shut on the section + aria-expanded on .pane-h + [hidden] on .pane-b; el.open mirrors it (set = not persisted).
   Storage: gtype-pane-<key> ('1'/'0'); the old keys (gtype-ed-panes-v1 JSON, gt-pane-<key>) are still read once. */
const PANE_PFX='gtype-pane-';
function paneStored(key){
  try{
    const v=localStorage.getItem(PANE_PFX+key);if(v==='1'||v==='0')return v==='1';
    const o=JSON.parse(localStorage.getItem('gtype-ed-panes-v1')||'{}');if(o&&o[key]!=null)return !!o[key];
    const l=localStorage.getItem('gt-pane-'+key);if(l==='1'||l==='0')return l==='1';
  }catch(e){}
  return null;
}
function paneHTML(key,title,body,opt){
  opt=opt||{};
  return '<section class="pane'+(opt.cls?' '+opt.cls:'')+'" data-pane="'+key+'"><button type="button" class="pane-h"'+(opt.hid?' id="'+opt.hid+'"':'')+(opt.tip?' title="'+opt.tip+'"':'')+' aria-expanded="true"><span class="pane-t">'+title+'</span>'+(opt.head||'')+'<i class="pane-chev" aria-hidden="true"></i></button><div class="pane-b"'+(opt.bid?' id="'+opt.bid+'"':'')+'>'+body+'</div></section>';
}
function paneEl(key,title,body,opt){const t=document.createElement('template');t.innerHTML=paneHTML(key,title,body,opt);return t.content.firstElementChild;}
function paneInit(el,key,defaultOpen,cb){
  if(typeof el==='string')el=document.querySelector(el);
  if(!el)return null;
  if(el._pane)return el._pane;
  const h=el.querySelector(':scope>.pane-h'),b=el.querySelector(':scope>.pane-b');
  if(!h||!b)return null;
  key=key||el.dataset.pane||'';el.dataset.pane=key;
  const st=paneStored(key);
  let open=st!==null?st:defaultOpen!==false;
  if(!b.id)b.id='pane-b-'+String(key).replace(/[^\w-]/g,'_');
  h.setAttribute('aria-controls',b.id);
  const api={key,get open(){return open;},set(v,silent,nosave){
      const was=open,mo=(!silent&&!api.inst&&was!==!!v&&window.MO)?MO.paneStart(el,b,!!v):null;
      open=!!v;h.setAttribute('aria-expanded',open?'true':'false');b.hidden=!open;el.classList.toggle('shut',!open);
      if(mo)MO.paneRun(mo);
      if(!nosave){try{localStorage.setItem(PANE_PFX+key,open?'1':'0');}catch(e){}}
      if(!silent){el.dispatchEvent(new CustomEvent('pane:toggle',{bubbles:true,detail:{key,open}}));if(cb)cb(open);}return open;},
    toggle(){return api.set(!open);}};
  h.addEventListener('click',()=>api.toggle());
  try{Object.defineProperty(el,'open',{get:()=>open,set:v=>api.set(v,false,true),configurable:true});}catch(e){}
  api.set(open,true,true);
  el._pane=api;return api;
}
/* open every collapsible pane of a view (tests, «expand all»); not persisted */
function paneOpenAll(root){
  (root||document).querySelectorAll('.pane').forEach(p=>{if(p.hidden||!p._pane)return;p._pane.set(true,false,true);});
}

/* ---------- platformInfo ---------- */
function platformInfo(){
  const ids=(typeof FONTS==='object'?Object.keys(FONTS):[]).filter(id=>FONTS[id]&&id!=='imp'&&Array.isArray(FONTS[id].CHARSET));
  const meta=ids.map(id=>typeof fmeta==='function'?fmeta(id):{id,name:FONTS[id].name||id,charset:FONTS[id].charset==='basic'?'basic':'ext',glyphs:FONTS[id].CHARSET.length,styles:['regular','italic']});
  const basic=meta.filter(m=>m.charset==='basic').length;
  const gl=meta.map(m=>m.glyphs).filter(n=>n>0);
  const styleSet=new Set();meta.forEach(m=>(m.styles||[]).forEach(s=>styleSet.add(s)));
  const weights=typeof FAM_W!=='undefined'?FAM_W.map(w=>w[0]):[];
  const formats=[...document.querySelectorAll('#ex-list [data-x]')].filter(b=>b.dataset.x!=='about'&&b.dataset.x!=='share').map(b=>({id:b.dataset.x,label:b.textContent.trim()}));
  const axes=typeof VFX_ORDER!=='undefined'?VFX_ORDER.map(t=>({tag:t,label:(typeof VFX_UI_RU!=='undefined'&&VFX_UI_RU[t])||t})):[];
  const features=(typeof OTU!=='undefined'&&OTU.ROWS)?OTU.ROWS.map(r=>({tag:r[0],label:r[1]})):[];
  const languages=typeof LANG_DB!=='undefined'?LANG_DB.length:0;
  const scripts=typeof LANG_DB!=='undefined'?[...new Set(LANG_DB.map(l=>l.sc))]:[];
  const info={
    typefaces:ids.length,ids,names:meta.map(m=>m.name),
    full:ids.length-basic,basic,
    styles:[...styleSet],styleCount:styleSet.size,
    weights,weightCount:weights.length,
    glyphsMax:gl.length?Math.max(...gl):0,glyphsMin:gl.length?Math.min(...gl):0,glyphsTotal:gl.reduce((a,b)=>a+b,0),
    formats,axes,features,languages,scripts};
  const pl=(n,a,b,c)=>{const m=n%100,d=n%10;return (m>10&&m<20)?c:d===1?a:(d>=2&&d<=4)?b:c;};
  info.facts=[
    {k:'typefaces',text:info.typefaces+' '+pl(info.typefaces,'шрифт','шрифта','шрифтов')},
    {k:'styles',text:'Прямой и италик'},
    {k:'weights',text:info.weightCount?info.weightCount+' '+pl(info.weightCount,'веса','веса','весов')+' в семействе':''},
    {k:'axes',text:info.axes.length?'Вариативные оси: '+info.axes.length:''},
    {k:'features',text:info.features.length?'OpenType: '+info.features.length+' '+pl(info.features.length,'функция','функции','функций'):''},
    {k:'script',text:'Кириллица и латиница'},
    {k:'formats',text:info.formats.length?'Экспорт: '+info.formats.length+' '+pl(info.formats.length,'формат','формата','форматов'):''},
    {k:'languages',text:info.languages?info.languages+' '+pl(info.languages,'язык','языка','языков'):''},
    {k:'charset',text:info.full?info.full+' с полным набором знаков':''}].filter(f=>f.text);
  return info;
}

/* ---------- reference page ---------- */
const DS_GREYS=['g0','g25','g50','g100','g150','g200','g300','g400','g500','g600','g700','g800','g900'];
const DS_SEM=[['bg','Фон страницы'],['surface','Белая поверхность'],['surface-2','Поле ввода'],['surface-3','Наведение'],['card','Карточка'],['paper','Бумага'],['panel','Заливка контролов'],['panel-2','Контрол: наведение'],['line','Тонкая линия'],['line-strong','Линия: акцент'],['text','Текст'],['text-2','Текст: вторичный'],['text-3','Текст: подсказка'],['accent','Акцент'],['accent-hover','Акцент: наведение'],['accent-press','Акцент: нажатие'],['accent-soft','Акцент: фон'],['accent-text','Акцент: текст'],['danger','Ошибка'],['ok','Успех'],['warn','Внимание'],['rail','Рейл'],['canvas','Лист знаков']];
function dsHex(name){
  const p=document.createElement('i');p.style.cssText='position:absolute;width:0;height:0;background:var(--'+name+')';document.body.appendChild(p);
  const c=getComputedStyle(p).backgroundColor;p.remove();
  const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return c;
  const a=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  const h=n=>Math.round(n).toString(16).padStart(2,'0');
  return '#'+h(a[0])+h(a[1])+h(a[2])+(a.length>3&&a[3]<1?' · '+Math.round(a[3]*100)+'%':'');
}
function dsEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function dsDemo(title,html,note){return '<section class="ds-sec"><h3 class="sec-h">'+dsEsc(title)+'</h3>'+(note?'<p class="ds-note">'+dsEsc(note)+'</p>':'')+'<div class="ds-demo">'+html+'</div></section>';}
function dsBuildHTML(){
  const sw=(n,desc)=>'<div class="ds-sw"><i style="background:var(--'+n+')"></i><b>--'+n+'</b>'+(desc?'<em>'+dsEsc(desc)+'</em>':'')+'<span data-hex="'+n+'"></span></div>';
  const T=[['xs',11,'Подписи, счётчики'],['sm',12,'Мелкий текст, теги'],['md',13,'Плотные панели'],['base',14,'Основной текст интерфейса'],['lg',16,'Заголовки панелей, поиск'],['xl',20,'Названия карточек'],['2xl',24,'Заголовки разделов'],['3xl',32,'Крупные цифры']];
  const R=[['xs',8],['sm',12],['md',16],['lg',22],['xl',28],['pill',999]];
  const S=[1,2,3,4,5,6,7,8];
  let h='';
  h+='<header class="ds-head"><div><h2>Дизайн-система</h2><p class="ds-note">Токены и компоненты G-type. Все значения читаются из CSS-переменных текущей темы.</p></div><div class="ds-ctl"><div class="seg" role="group" aria-label="Тема"><button type="button" data-dsth="light">Светлая</button><button type="button" data-dsth="dark">Тёмная</button></div><button class="btn ink" type="button" id="ds-close">Закрыть</button></div></header>';
  h+=dsDemo('Цвет: серая шкала','<div class="ds-grid">'+DS_GREYS.map(n=>sw(n)).join('')+'</div>');
  h+=dsDemo('Цвет: смысловые токены','<div class="ds-grid">'+DS_SEM.map(s=>sw(s[0],s[1])).join('')+'</div>');
  h+=dsDemo('Типографика','<div class="ds-col">'+T.map(t=>'<div class="ds-trow"><code>--fs-'+t[0]+' · '+t[1]+'px</code><span style="font-size:var(--fs-'+t[0]+')">'+t[2]+' — Съешь ещё этих мягких булок 0123</span></div>').join('')+'<div class="ds-trow"><code>--fs-hero · clamp</code><span style="font:800 var(--fs-hero)/1 var(--f-ui);letter-spacing:-.04em">Собери свой <em style="font-style:normal;color:var(--accent)">шрифт</em></span></div><div class="ds-trow"><code>веса</code><span><b style="font-weight:400">400</b> · <b style="font-weight:500">500</b> · <b style="font-weight:600">600</b> · <b style="font-weight:700">700</b> · <b style="font-weight:800">800</b></span></div></div>');
  h+=dsDemo('Отступы','<div class="ds-col">'+S.map(n=>'<div class="ds-trow"><code>--s'+n+' · '+[4,8,12,16,20,24,32,48][n-1]+'px</code><i class="ds-bar" style="width:var(--s'+n+')"></i></div>').join('')+'</div>');
  h+=dsDemo('Радиусы','<div class="ds-row">'+R.map(r=>'<div class="ds-box"><i style="border-radius:'+(r[0]==='pill'?'var(--r-pill)':'var(--r-'+r[0]+')')+'"></i><code>--r-'+r[0]+' · '+(r[1]===999?'pill':r[1]+'px')+'</code></div>').join('')+'</div>');
  h+=dsDemo('Тени и высота контролов','<div class="ds-row">'+[1,2,3].map(n=>'<div class="ds-box"><i style="border-radius:var(--r-md);box-shadow:var(--sh-'+n+');background:var(--paper)"></i><code>--sh-'+n+'</code></div>').join('')+[['sm',28],['md',34],['lg',42]].map(x=>'<div class="ds-box"><i style="width:80px;height:var(--h-'+x[0]+');border-radius:var(--r-pill);background:var(--panel-2)"></i><code>--h-'+x[0]+' · '+x[1]+'px</code></div>').join('')+'</div>');
  h+=dsDemo('Кнопки','<div class="ds-row"><button class="btn pri" type="button">Скачать шрифт</button><button class="btn ink" type="button">Тёмная</button><button class="btn" type="button">Вторичная</button><button class="btn ghost" type="button">Прозрачная</button><button class="btn danger" type="button">Удалить</button><button class="btn" type="button" disabled>Недоступна</button><button class="btn pri sm" type="button">Малая</button><button class="btn pri ds-fx" type="button">Фокус</button></div><div class="ds-row"><button class="ibtn" type="button" aria-label="Назад"><i class="ico i-undo"></i></button><button class="ibtn" type="button" aria-label="Вперёд"><i class="ico i-redo"></i></button><button class="tbtn" type="button" aria-label="Помощь"><i class="ico i-help"></i></button><button class="ibtn" type="button" disabled aria-label="Недоступно"><i class="ico i-download"></i></button></div>','Основное действие экрана — одна .btn.pri. Белый текст на --accent-press даёт 4.7:1.');
  h+=dsDemo('Чипы, теги, бейджи','<div class="ds-row"><button class="chip" type="button">Тестер</button><button class="chip on" type="button">Выбран</button><button class="chip sm" type="button">Малый</button><span class="chip soft">Мягкий</span><span class="tag">Гротески</span><span class="badge">3</span><span class="badge danger">12</span><span class="badge mute">0</span></div>');
  h+=dsDemo('Сегменты','<div class="ds-row"><div class="seg"><button class="on" type="button">Прямой</button><button type="button">Италик</button></div><div class="seg light"><button type="button">Редактор</button><button class="on" type="button">Проверка</button><button type="button">Кернинг</button></div></div>');
  h+=dsDemo('Поля ввода','<div class="ds-row"><input class="inp" placeholder="Текст" value=""><input class="inp" value="Заполнено"><input class="inp ds-fx" value="Фокус"><input class="inp" value="Ошибка" aria-invalid="true"><input class="inp" value="Недоступно" disabled><input class="inp pill" placeholder="Скруглённое"></div><div class="srch" style="max-width:420px"><i class="ico i-search"></i><input placeholder="Название или слово" aria-label="Поиск"><button class="btn pri" type="button">Найти</button></div><textarea class="inp" placeholder="Многострочное поле" style="max-width:420px"></textarea>');
  h+=dsDemo('Выбор','<div class="ds-row"><select class="sel" aria-label="Список"><option>Один</option><option>Два</option></select><label class="chk"><input type="checkbox" checked><span>Галочка</span></label><label class="chk"><input type="checkbox"><span>Пусто</span></label><label class="chk"><input type="checkbox" disabled><span>Недоступно</span></label><label class="chk"><input type="radio" name="dsr" checked><span>Радио</span></label><label class="chk"><input type="radio" name="dsr"><span>Радио</span></label><label class="tgl"><input type="checkbox" role="switch" checked><span>Включено</span></label><label class="tgl"><input type="checkbox" role="switch"><span>Выключено</span></label></div>');
  h+=dsDemo('Ползунок','<div class="ctl" style="max-width:360px"><label><span>Ширина, %</span><output>116</output></label><input type="range" min="0" max="100" value="62" style="--lo:0%;--hi:62%" aria-label="Ширина"></div>');
  h+=dsDemo('Меню и подсказка','<div class="ds-row" style="align-items:flex-start"><div class="menu"><button type="button">Шрифт .ttf</button><button type="button" class="on">Для сайта .woff</button><button type="button">Семейство .zip</button><div class="divider"></div><button type="button">Образец .png</button></div><button class="btn tip ds-tip" type="button" data-tip="Подсказка над кнопкой">С подсказкой</button></div>');
  h+=dsDemo('Карточки','<div class="ds-row" style="align-items:stretch"><div class="card" style="width:260px"><h4 style="margin:0 0 4px">Карточка</h4><p class="ds-note" style="margin:0">Светлая заливка, тонкая тень --sh-1.</p></div><div class="surface" style="width:260px;padding:16px"><h4 style="margin:0 0 4px">Плавающая панель</h4><p class="ds-note" style="margin:0">Белая поверхность, тень --sh-2.</p></div><div class="notchc lcard" style="width:300px;min-height:150px"><div class="notch"><button class="nb go" type="button" aria-label="Открыть"><i class="ico i-arrow-r"></i></button></div><div class="ln">Карточка с вырезом</div><div class="lt">Круглая кнопка в углу</div></div></div>');
  h+=dsDemo('Сворачиваемые панели','<div style="max-width:420px"><section class="pane" id="ds-p1"><button class="pane-h" type="button" aria-expanded="true"><span class="pane-t">Пропорции</span><span class="pane-m">5</span><i class="pane-chev"></i></button><div class="pane-b"><p class="ds-note" style="margin:0">Открыта по умолчанию. Состояние панели запоминается.</p></div></section><section class="pane" id="ds-p2"><button class="pane-h" type="button" aria-expanded="false"><span class="pane-t">Штрихи</span><i class="pane-chev"></i></button><div class="pane-b"><p class="ds-note" style="margin:0">Закрыта по умолчанию.</p></div></section></div>');
  h+=dsDemo('Заголовок раздела, пустое состояние, уведомление','<h4 class="sec-h">Заголовок раздела</h4><div class="empty" style="max-width:420px"><i class="ico i-heart"></i><b>Пока пусто</b><span>Добавьте шрифт в избранное сердечком.</span><button class="btn pri" type="button">Открыть библиотеку</button></div><div class="ds-toast">Сохранено: Volt-Regular.ttf</div>');
  let pi='';try{const p=platformInfo();pi='<div class="ds-row">'+p.facts.map(f=>'<span class="chip">'+dsEsc(f.text)+'</span>').join('')+'</div>';}catch(e){pi='';}
  h+=dsDemo('Данные платформы',pi,'Считаются из каталога шрифтов, меню экспорта, осей и функций OpenType.');
  return h;
}
const DS_ST={built:false,prevTab:'home'};
function dsFillHex(){document.querySelectorAll('#view-ds [data-hex]').forEach(e=>{e.textContent=dsHex(e.dataset.hex);});}
function dsSyncTheme(){const t=document.documentElement.dataset.theme==='dark'?'dark':'light';document.querySelectorAll('#view-ds [data-dsth]').forEach(b=>b.classList.toggle('on',b.dataset.dsth===t));dsFillHex();}
function dsSetTheme(t){
  const cur=document.documentElement.dataset.theme==='dark'?'dark':'light';
  if(t!==cur){const b=document.getElementById('theme-btn');if(b)b.click();else document.documentElement.dataset.theme=t;}
  setTimeout(dsSyncTheme,30);
}
function openDS(){
  const app=document.querySelector('.app');if(!app)return;
  let v=document.getElementById('view-ds');
  if(!v){
    v=document.createElement('section');v.className='libview dsview';v.id='view-ds';v.setAttribute('aria-label','Дизайн-система');v.hidden=true;
    app.appendChild(v);
  }
  if(!DS_ST.built){
    v.innerHTML=dsBuildHTML();DS_ST.built=true;
    v.querySelector('#ds-close').addEventListener('click',closeDS);
    v.querySelectorAll('[data-dsth]').forEach(b=>b.addEventListener('click',()=>dsSetTheme(b.dataset.dsth)));
    paneInit(v.querySelector('#ds-p1'),'ds-demo-1',true);paneInit(v.querySelector('#ds-p2'),'ds-demo-2',false);
    new MutationObserver(()=>{if(!v.hidden)dsSyncTheme();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  }
  if(!v.hidden)return;
  if(typeof S!=='undefined')DS_ST.prevTab=S.tab||'home';
  ['view-lib','view-library','view-fav','view-comm','view-edit','view-proof','view-draw','view-kern'].forEach(id=>{const e=document.getElementById(id);if(e)e.hidden=true;});
  document.body.classList.add('tab-lib','ds-open');
  document.querySelectorAll('.rail .rb.on').forEach(b=>b.classList.remove('on'));
  v.hidden=false;v.scrollTop=0;dsSyncTheme();
  /* FX80 F4: адрес и историю ведёт ui_nav.js */
}
function closeDS(keepTab){
  const v=document.getElementById('view-ds');if(!v||v.hidden)return;
  v.hidden=true;document.body.classList.remove('ds-open');
  if(keepTab!==true&&typeof setTab==='function')setTab(DS_ST.prevTab&&DS_ST.prevTab!=='ds'?DS_ST.prevTab:'home');
}
(function(){
  const rail=document.getElementById('rail');
  if(rail)rail.addEventListener('click',e=>{if(e.target.closest('[data-tab],#logo')&&document.body.classList.contains('ds-open'))closeDS(true);},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#ds')openDS();else closeDS();});
  /* FX80 F3 (D13): Esc закрывает страницу дизайн-системы */
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&document.body.classList.contains('ds-open')&&![...document.querySelectorAll('.pf-mw,.tour.on,[role=dialog][aria-modal=true]')].some(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden')){e.preventDefault();closeDS();}});
  const go=()=>{if(location.hash==='#ds')setTimeout(openDS,0);};
  if(document.readyState==='complete')go();else window.addEventListener('load',go);
})();
