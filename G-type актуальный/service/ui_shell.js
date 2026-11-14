/* Оболочка: рейл и верхняя панель, свёрнутые карточки с вырезом-кнопкой, группы параметров, «Повторить».
   Ничего не считает и не рисует: только раскладка. Все старые id и обработчики остаются на месте. */
const SHELL_LS='gtype-ui-v1';
let SHELL_U={};
try{SHELL_U=JSON.parse(localStorage.getItem(SHELL_LS)||'{}')||{};}catch(e){SHELL_U={};}
function shellKeep(){try{localStorage.setItem(SHELL_LS,JSON.stringify(SHELL_U));}catch(e){}}
const SHELL_SECT={edit:'Редактор',proof:'Проверка',kern:'Кернинг'};
const SHELL_KEEP=/^(Пропорции)$/;
const shellIco=n=>'<i class="ico i-'+n+'"></i>';

/* вырез в углу карточки: .notch + круглая кнопка .nb (разметку рисует CSS, см. «шаблон выреза») */
function shellNotch(card,id,icon,title,fn){
  const n=document.createElement('div');n.className='notch';
  const b=document.createElement('button');b.type='button';b.className='nb';b.id=id;
  n.appendChild(b);(card.querySelector(':scope>.ghead,:scope>.phead')||card).appendChild(n);b.addEventListener('click',fn);
  b.setIcon=(ic,tt,exp)=>{b.innerHTML=shellIco(ic);b.title=tt;b.setAttribute('aria-label',tt);if(exp!=null)b.setAttribute('aria-expanded',exp?'true':'false');};
  b.setIcon(icon,title);return b;
}

/* повтор действия: тот же стек, что у «Отменить» (ui_a.js), но в обратную сторону */
const shellRedo=[];
(function(){
  const _snap=snap,_undo=undo;
  snap=function(){shellRedo.length=0;return _snap.apply(this,arguments);};
  undo=function(){
    const was=JSON.stringify({styles:S.styles,edits:S.edits}),n=undoStack.length;
    const r=_undo.apply(this,arguments);
    if(undoStack.length<n)shellRedo.push({f:S.fontId,s:was});
    return r;
  };
})();
function redo(){
  const it=shellRedo.pop();
  if(!it||it.f!==S.fontId){toast('Нечего повторять');return;}
  undoStack.push(JSON.stringify({styles:S.styles,edits:S.edits}));
  const o=JSON.parse(it.s);S.styles=normStyles(S.fontId,o.styles);S.edits=o.edits||{};S.node=null;syncPanel();bump();
}

function shellHead(){
  const f=typeof FONTS!=='undefined'&&FONTS[S.fontId],t=$('#fontname'),c=$('#crumb');if(!t||!c)return;
  if(TAB_NAV.has(S.tab)){c.textContent='G-type';t.textContent='Шрифты';}
  else{c.textContent=SHELL_SECT[S.tab]||'';t.textContent=f?f.name:'G-type';}
}

document.addEventListener('DOMContentLoaded',()=>{
  /* заголовок следует за вкладкой и шрифтом */
  const _st=setTab;setTab=function(){const r=_st.apply(this,arguments);shellHead();if(innerWidth<=1060)window.scrollTo(0,0);return r;};
  const _sf=switchFont;switchFont=function(){const r=_sf.apply(this,arguments);shellHead();return r;};
  shellHead();

  /* повтор */
  const rb=$('#redo');if(rb)rb.addEventListener('click',redo);
  window.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();
    if(!((k==='z'&&e.shiftKey)||k==='y'))return;
    const t=e.target;if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!(t.type==='range'))return;
    e.preventDefault();e.stopImmediatePropagation();redo();
  },true);

  /* чип фоновой сверки сидит на рейле у «Сверки» как значок с числом; по нажатию открывает список замечаний */
  try{if(typeof apEnsureUI==='function')apEnsureUI();}catch(e){}
  const chip=$('#apchip'),slot=$('#apslot');
  if(chip&&slot)slot.appendChild(chip);

  /* образец: .pane (paneInit, ui_ds_s1.js); свёрнутый — одна живая строка в шапке */
  const sw=$('#specwrap');
  paneInit(sw,'ed-prev',innerHeight>=1200&&innerWidth>1060,()=>{
    requestAnimationFrame(()=>{edMiniFit();schedule();});
  });

  /* список знаков: узкая полоса и «весь набор» */
  const cols=$('#view-edit'),gc=$('#gcard'),gh=gc.querySelector('.ghead');
  const fold=document.createElement('button');fold.type='button';fold.id='g-fold';fold.className='tbtn';gh.appendChild(fold);
  const gwb=shellNotch(gc,'g-wide','out','Показать весь набор',()=>{
    if(cols.dataset.g==='strip'){setG('norm');return;}
    setWide(!gc.classList.contains('wide'));});
  function setWide(on){
    gc.classList.toggle('wide',on);
    gwb.setIcon(on?'in':'out',on?'Свернуть набор':'Показать весь набор',on);
    requestAnimationFrame(()=>{if(typeof drawThumbs==='function')drawThumbs();});
  }
  function setG(st,auto){
    cols.dataset.g=st;if(!auto){SHELL_U.g=st;shellKeep();}requestAnimationFrame(()=>schedule());
    if(st==='strip')setWide(false);
    fold.innerHTML=shellIco(st==='strip'?'chev-left':'chev-right');
    fold.title=st==='strip'?'Развернуть список знаков':'Свернуть список знаков в полосу';fold.setAttribute('aria-label',fold.title);fold.setAttribute('aria-expanded',st==='strip'?'false':'true');
    if(st==='strip')gwb.setIcon('chev-left','Развернуть список знаков',false);else gwb.setIcon('out','Показать весь набор',false);
    requestAnimationFrame(()=>{if(typeof drawThumbs==='function')drawThumbs();});
  }
  fold.addEventListener('click',()=>setG(cols.dataset.g==='strip'?'norm':'strip'));
  if(SHELL_U.g)setG(SHELL_U.g==='strip'?'strip':'norm');else setG(innerWidth<1366&&innerWidth>1060?'strip':'norm',true);/* ниже 1366 знаки сами сворачиваются в полосу */
  document.addEventListener('pointerdown',e=>{if(gc.classList.contains('wide')&&!gc.contains(e.target))setWide(false);});
  gc.addEventListener('click',e=>{if(gc.classList.contains('wide')&&e.target.closest('.gb'))setWide(false);});

  /* параметры: «Пропорции» раскрыта, остальные группы свёрнуты (выбор пользователя запоминается: gtype-pane-grp-<имя>, не зависит от шрифта); поиск; «раскрыть всё»; вся колонка сворачивается в полосу */
  const pc=$('#pcard'),panel=pc.querySelector('.panel'),pbox=$('#params');
  const gOpen=new Map();let all=false;
  const setGrp=(g,open)=>{g.classList.toggle('shut',!open);const h=g.querySelector('h5');if(h)h.setAttribute('aria-expanded',open?'true':'false');};
  function decorate(){
    pbox.querySelectorAll('.grp').forEach(g=>{
      if(g.dataset.dc)return;g.dataset.dc='1';
      const h=g.querySelector('h5');if(!h)return;const name=h.textContent;
      h.tabIndex=0;h.setAttribute('role','button');
      const sk='grp-'+name.trim().toLowerCase().replace(/\s+/g,'_');
      const st=typeof paneStored==='function'?paneStored(sk):null;
      setGrp(g,gOpen.has(name)?gOpen.get(name):(all?true:st!==null?st:SHELL_KEEP.test(name)));
      const tg=()=>{const open=g.classList.contains('shut');setGrp(g,open);gOpen.set(name,open);try{localStorage.setItem('gtype-pane-'+sk,open?'1':'0');}catch(e){}};
      h.addEventListener('click',tg);
      h.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tg();}});
    });
    if(typeof edParamFilter==='function')edParamFilter();
  }
  decorate();new MutationObserver(decorate).observe(pbox,{childList:true});
  const pab=shellNotch(pc,'p-all','unfold','Раскрыть все группы',()=>setAll(!all));
  function setAll(on){
    all=on;
    pbox.querySelectorAll('.grp').forEach(g=>{const h=g.querySelector('h5');const nm=h?h.textContent:'';const st=typeof paneStored==='function'?paneStored('grp-'+nm.trim().toLowerCase().replace(/\s+/g,'_')):null;const open=on||(st!==null?st:SHELL_KEEP.test(nm));gOpen.set(nm,open);setGrp(g,open);});
    panel.querySelectorAll(':scope>.pane').forEach(d=>{if(d.hidden)return;d.open=on;});
    pab.setIcon(on?'fold':'unfold',on?'Свернуть лишнее':'Раскрыть все группы',on);
  }
  pab.setAttribute('aria-expanded','false');
  /* колонка настроек стала выдвижной панелью у рейла (FLY): #pcard остаётся тем же узлом, #p-fold — кнопка «Закрыть» */
  const pfold=document.createElement('button');pfold.type='button';pfold.id='p-fold';pfold.className='nb dw-x';pc.querySelector('.phead').appendChild(pfold);
  pc.querySelector('.phead').classList.add('dw-h');pc.querySelector('.phead h2').classList.add('dw-t');
  pfold.innerHTML=shellIco('close');pfold.title='Закрыть панель';pfold.setAttribute('aria-label','Закрыть панель');
  pfold.addEventListener('click',()=>{if(window.dwClose)window.dwClose('edit');});

  /* «Скачать» на рейле: то же меню, что и в верхней панели */
  const xm=$('#ex-list'),xw=$('#xwrap'),rdw=$('#rail-dlwrap'),rdl=$('#rail-dl'),topB=$('#ex-menu');
  if(rdl&&xm&&topB){
    topB.addEventListener('click',()=>{if(xm.parentNode!==xw)xw.appendChild(xm);},true);
    rdl.addEventListener('click',e=>{e.stopPropagation();projShow(false);if(xm.parentNode!==rdw)rdw.appendChild(xm);exOpen(xm.hidden);});
    document.addEventListener('click',e=>{if(!xm.hidden&&xm.parentNode===rdw&&!e.target.closest('#rail-dlwrap'))exOpen(false);});
  }

  /* «Проект» на рейле: имя, сохранить/открыть, сбросы */
  const pp=$('#projpop'),st=$('#settings');
  function projShow(on){if(!pp)return;pp.hidden=!on;if(st)st.setAttribute('aria-expanded',on?'true':'false');}
  window.projShow=projShow;
  if(st&&pp){
    st.addEventListener('click',e=>{e.stopPropagation();if(typeof helpToggle==='function')helpToggle(false);if(xm&&!xm.hidden)exOpen(false);projShow(pp.hidden);});
    document.addEventListener('click',e=>{if(!pp.hidden&&!e.target.closest('#projwrap'))projShow(false);});
    window.addEventListener('keydown',e=>{if(e.key==='Escape')projShow(false);});
    const hb=$('#help');if(hb)hb.addEventListener('click',()=>projShow(false),true);
    pp.addEventListener('click',e=>{if(e.target.closest('#cp,#rs,#ra,#hint-reset,#pj-s'))projShow(false);});
  }
});

/* ===== рейл по режимам =====
   Библиотека (главная, «Библиотека», «Избранное»): рейл как был. Рабочие режимы (редактор · проверка · кернинг · «Отрисовать» · «Собрать из знаков»):
   остаются «Главная» и «?», «Проект» уходит в верхнюю панель режима, тема — во всплывающее «?», а свободное место занимают переключатели
   и быстрые переходы к панелям этого режима. Все панели — те же .pane (paneInit); рейл только открывает/сворачивает их и показывает состояние (aria-pressed). */
(function(){
  const q=s=>document.querySelector(s),RM_WORK=new Set(['edit','proof','kern','draw','import']),RM_ED=new Set(['edit','proof','kern']);
  const narrow=()=>innerWidth<=1060,phone=()=>innerWidth<=720;
  function rmMode(){const b=document.body;if(b.classList.contains('ds-open'))return 'library';if(b.classList.contains('imp-open'))return 'import';return (typeof S!=='undefined'&&S.tab)||'home';}
  const pane=sel=>{const e=q(sel);return e&&e._pane?e:null;};
  const paneShut=e=>e.classList.contains('shut');
  const reveal=e=>requestAnimationFrame(()=>{try{e.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(x){}});
  /* ===== выдвижные панели у рейла (FLY) =====
     Бывшие колонки настроек (редактор #pcard, «Отрисовать» #dr-side, «Собрать из знаков» #imp-side) — одна панель-ящик на режим:
     те же узлы и id, но видна одна секция за раз; кнопка рейла открывает ящик на своей секции, повторное нажатие / Esc / × закрывают.
     data-open="1|0", data-sec=<секция|all>, data-solo="1" — в ящике одна панель, её заголовок заменяет заголовок ящика. */
  const DW={
    edit:{el:'#pcard',host:'#pcard .panel',def:'params',secs:{
      params:{t:'Настройки',m:'.psearch,#xp-sw,#ps-glyph,#ps-pre,#ps-main'},presets:{t:'Пресеты',m:'#ps-pre'},
      special:{t:'Свой знак',m:'#cusec,#pensec,#pxsec,#impsec'},grid:{t:'Сетка и направляющие',m:'#ps-grid,#ps-guides'},
      ref:{t:'Эталон',m:'#ps-ref'},ot:{t:'OpenType',m:'#otsec'},lang:{t:'Языки',m:'#ps-lang'}}},
    draw:{el:'#dr-side',host:'#dr-side',secs:{cells:{t:'Сетка ячеек',m:'[data-pane=dr-cells]',hint:'cells'},grid:{t:'Сетка',m:'[data-pane=dr-grid]'},con:{t:'Конструкция',m:'[data-pane=dr-con]'},recs:{t:'Рекомендации и языки',m:'[data-pane=dr-recs]'},spk:{t:'Интервалы и кернинг',m:'[data-pane=dr-spk]'}}},
    import:{el:'#imp-side',host:'#imp-side',secs:{up:{t:'Загрузка',m:'[data-pane=imp-up]'},opt:{t:'Параметры набора',m:'[data-pane=imp-opt]'},pv:{t:'Предпросмотр',m:'[data-pane=imp-pv]'},lg:{t:'Языки набора',m:'[data-pane=imp-lg]'}}}
  };
  const dwEl=m=>DW[m]?q(DW[m].el):null;
  const dwSec=m=>{const e=dwEl(m);return e&&e.dataset.open==='1'?e.dataset.sec:null;};
  function dwHead(m){
    const e=dwEl(m);if(!e)return null;
    let h=e.querySelector(':scope>.dw-h');
    if(!h){
      h=document.createElement('div');h.className='dw-h';
      h.innerHTML='<h2 class="dw-t"></h2>'+(m==='draw'&&window.DM?DM.hintHTML('cells','dw-hint'):'')+'<button type="button" class="dw-x" aria-label="Закрыть панель" title="Закрыть панель"><i class="ico i-close"></i></button>';
      const hb0=h.querySelector('.dw-hint');if(hb0)hb0.hidden=true;e.insertBefore(h,e.firstChild);h.querySelector('.dw-x').addEventListener('click',()=>dwClose(m));
    }
    return h;
  }
  const dwSpecialPane=()=>['#cusec','#pensec','#pxsec','#impsec'].map(pane).find(e=>e&&!e.hidden)||null;
  function dwTitle(m,sec){
    if(sec==='all')return m==='edit'?'Настройки':'Панель';
    if(m==='edit'&&sec==='special'){const e=dwSpecialPane(),t=e&&e.querySelector(':scope>.pane-h .pane-t');if(t)return t.textContent.trim();}
    return (DW[m].secs[sec]||{}).t||'';
  }
  /* показать только нужную секцию: остальное прячем классом dw-off (атрибут hidden чужих модулей не трогаем) */
  function dwApply(m){
    const c=DW[m],e=dwEl(m),h=q(c.host);if(!e||!h||e.dataset.open!=='1')return;
    const sec=e.dataset.sec,defM=c.def&&c.secs[c.def].m;
    const inAny=k=>Object.values(c.secs).some(s=>k.matches(s.m));
    let shown=0,pn=0,only=null;
    [...h.children].forEach(k=>{
      if(k.classList.contains('dw-h'))return;
      let on;
      if(sec==='all')on=true;
      else{const s=c.secs[sec];on=!!s&&k.matches(s.m);if(!on&&sec===c.def&&!inAny(k))on=true;}
      k.classList.toggle('dw-off',!on);k.classList.toggle('dw-vis',on&&!k.hidden);
      if(on&&!k.hidden){shown++;only=k;if(k.classList.contains('pane'))pn++;}
    });
    const solo=sec!=='all'&&shown===1&&pn===1;
    e.dataset.solo=solo?'1':'0';
    const t=dwTitle(m,sec),ht=e.querySelector('.dw-t');if(ht&&ht.textContent!==t)ht.textContent=t;
    const hb=e.querySelector('.dw-h .dw-hint');if(hb)DM.setHint(hb,(c.secs[sec]||{}).hint);
    e.setAttribute('aria-label',t);
  }
  function dwOpen(m,sec){
    const c=DW[m],e=dwEl(m);if(!e)return false;
    dwHead(m);
    if(sec==null)sec=c.def||Object.keys(c.secs)[0];
    const was=e.dataset.open==='1'&&e.dataset.sec===sec,wasOpen=e.dataset.open==='1';
    const h0=(wasOpen&&!was&&window.MO&&MO.sizeFlip)?e.offsetHeight:0;
    e.classList.add('dw');e.dataset.sec=sec;e.dataset.open='1';e.inert=false;e.removeAttribute('aria-hidden');
    if(!wasOpen){e.classList.add('dw-opening');clearTimeout(e._dwo);const done=()=>{clearTimeout(e._dwo);e.classList.remove('dw-opening');};
      e._dwo=setTimeout(done,(window.MO?MO.D('open')+MO.D('base'):0)+60);
      e.addEventListener('animationend',function f(ev){if(ev.target!==e&&e.contains(ev.target)){e.removeEventListener('animationend',f);done();}});}
    dwApply(m);
    if(h0)MO.sizeFlip(e,h0);
    if(!was){
      /* секция, открытая с рейла, всегда показывает содержимое: свёрнутые панели секции раскрываем (без записи в память) */
      if(sec!=='params'&&sec!=='all')[...q(c.host).children].forEach(k=>{if(k.classList.contains('dw-vis')&&k._pane){k._pane.inst=1;k._pane.set(true,false,true);k._pane.inst=0;}   /* the section arrives with its panes open: no pane height animation under the section crossfade (no near-empty frames) */});
      const sc=q(c.host);if(sc)sc.scrollTop=0;e.scrollTop=0;
    }
    requestAnimationFrame(()=>{try{window.dispatchEvent(new Event('dw:open'));}catch(x){}});
    schedule();return true;
  }
  function dwClose(m){
    const e=dwEl(m);if(!e||e.dataset.open!=='1')return;
    e.dataset.open='0';e.inert=true;e.setAttribute('aria-hidden','true');
    if(e.contains(document.activeElement)){const b=q('.rail .rb[aria-pressed=true]')||q('#rb-edit');try{document.activeElement.blur();}catch(x){}}
    schedule();
  }
  const dwToggle=(m,sec)=>{if(dwSec(m)===sec)dwClose(m);else dwOpen(m,sec);};
  window.dwOpen=dwOpen;window.dwClose=dwClose;window.dwSec=dwSec;
  /* ящик: пока открыт, следит за составом и видимостью секций */
  function dwWatch(m){
    const c=DW[m],e=dwEl(m),h=e&&q(c.host);if(!h||h.__dwObs)return;h.__dwObs=1;
    e.classList.add('dw');if(e.dataset.open!=='1'){e.dataset.open='0';e.inert=true;e.setAttribute('aria-hidden','true');}
    dwHead(m);
    const seen=new Set();
    const fn=()=>{
      if(e.dataset.open==='1'){dwApply(m);
        /* секции «Свой знак»/«Перо» исчезли — закрываем пустой ящик */
        if(m==='edit'&&e.dataset.sec==='special'&&!dwSpecialPane())dwClose(m);}
      if(m==='edit'){
        /* вошли в режим «Свой знак» / «Перо» / «Знак из файла» — параметры режима сразу под рукой */
        ['#cusec','#pensec','#impsec'].forEach(sel=>{const p=q(sel);if(!p)return;const vis=!p.hidden;
          if(vis&&!seen.has(sel)&&rmMode()==='edit')dwOpen('edit','special');
          if(vis)seen.add(sel);else seen.delete(sel);});
      }
      schedule();
    };
    new MutationObserver(fn).observe(h,{childList:true,subtree:false});
    new MutationObserver(fn).observe(h,{attributes:true,subtree:true,attributeFilter:['hidden']});
  }
  /* строка рейла для секции ящика */
  function dwTool(m,id,label,icon,sel){
    return {id,label,icon,
      vis:()=>{if(id==='special')return !!dwSpecialPane();const p=sel&&pane(sel);return !!p&&!p.hidden;},
      pressed:()=>dwSec(m)===id,
      ctl:()=>DW[m].el.slice(1),
      dyn:id==='special'?()=>{const e=dwSpecialPane(),t=e&&e.querySelector(':scope>.pane-h .pane-t');return t?t.textContent.trim():'Свой знак';}:null,
      run:()=>dwToggle(m,id)};
  }
  /* «Настройки» (#rb-edit) в редакторе — ящик с параметрами */
  const paramsTool={pressed:()=>dwSec('edit')==='params',run:()=>dwToggle('edit','params')};
  const chkTool=(id,label,icon,sel)=>({id,label,icon,vis:()=>!!q(sel),pressed:()=>!!q(sel)&&q(sel).checked,ctl:()=>sel.slice(1),run:()=>q(sel).click()});
  const goTool=(id,label,icon,sel,focusSel)=>({id,label,icon,vis:()=>!!q(sel),pressed:()=>null,ctl:()=>(q(sel)||{}).id||'',
    run:()=>{const e=q(sel);if(!e)return;try{e.scrollIntoView({block:'start',behavior:'smooth'});}catch(x){}const f=focusSel&&q(focusSel);if(f)try{f.focus({preventScroll:true});}catch(x){}}});
  /* пане на странице (не в ящике): «Таблица метрик» в «Проверке» */
  const paneTool=(id,label,icon,sel)=>({id,label,icon,
    vis:()=>{const e=pane(sel);return !!e&&!e.hidden;},
    pressed:()=>{const e=pane(sel);return !!e&&!paneShut(e);},
    ctl:()=>{const e=q(sel);return e&&e.id;},
    run:()=>{const e=pane(sel);if(!e)return;e._pane.toggle();if(!paneShut(e))reveal(e);}});
  const TOOLS={
    edit:[
      dwTool('edit','presets','Пресеты','layers','#ps-pre'),
      dwTool('edit','special','Свой знак','draw'),
      dwTool('edit','grid','Сетка и направляющие','grid','#ps-grid'),
      dwTool('edit','ref','Эталон','eye','#ps-ref'),
      dwTool('edit','ot','OpenType','ot','#otsec'),
      dwTool('edit','lang','Языки','globe','#ps-lang')
    ],
    proof:[
      /* «Только с замечаниями», «Метрики», «Эталон» есть в верхней панели «Проверки»: в рейле не дублируются */
      paneTool('mt','Таблица метрик','table','#mtbox')
    ],
    kern:[
      goTool('pair','Пара','kern','.kk-bar','#kk-a'),
      goTool('text','В тексте','text','#kk-ctxt','#kk-txt'),
      goTool('list','Основные пары','viewlist','#kk-list'),
      chkTool('only','Только с замечаниями','alert','#kk-only')
    ],
    draw:[
      dwTool('draw','cells','Сетка ячеек','layers','#dr-side [data-pane=dr-cells]'),
      dwTool('draw','grid','Сетка','grid','#dr-side [data-pane=dr-grid]'),
      dwTool('draw','con','Конструкция','points','#dr-side [data-pane=dr-con]'),
      dwTool('draw','spk','Интервалы и кернинг','kern','#dr-side [data-pane=dr-spk]'),
      dwTool('draw','recs','Рекомендации и языки','bulb','#dr-side [data-pane=dr-recs]')
    ],
    import:[
      /* «Загрузить файлы» есть в верхней панели: значок загрузки в рейле не дублируется */
      dwTool('import','opt','Параметры набора','edit','#imp-side [data-pane=imp-opt]'),
      dwTool('import','pv','Предпросмотр','eye','#imp-side [data-pane=imp-pv]'),
      dwTool('import','lg','Языки набора','globe','#imp-side [data-pane=imp-lg]')
    ]
  };
  window.RAIL_TOOLS=TOOLS;
  /* «Проект» и тема переезжают в рабочих режимах */
  let HOME=null;
  function homeInit(){
    if(HOME)return;const pw=q('#projwrap'),tb=q('#theme-btn');if(!pw||!tb)return;
    HOME={pw,tb,pwp:pw.parentNode,tbp:tb.parentNode,tbn:tb.nextSibling};
  }
  function relocate(mode){
    homeInit();if(!HOME)return;const st=q('#settings'),{pw,tb}=HOME;
    if(!RM_WORK.has(mode)){
      if(pw.parentNode!==HOME.pwp)HOME.pwp.insertBefore(pw,q('#rail-profile'));
      if(tb.parentNode!==HOME.tbp)HOME.tbp.insertBefore(tb,q('#helpwrap'));
      pw.classList.remove('rm-top','rm-dr','rm-im');st.classList.remove('btn','rm-proj','dr-b');st.classList.add('rb');return;
    }
    const act=q('#help-act');if(act&&tb.parentNode!==act)act.appendChild(tb);
    let host=null,before=null,cls='';
    if(RM_ED.has(mode)){host=q('header.top');before=q('#xwrap');}
    else if(mode==='draw'){host=q('.dr-top');before=q('#dr-testb');cls='rm-dr';}
    else if(mode==='import'){host=q('.imp-act');before=host&&host.firstChild;cls='rm-im';}
    if(host){
      if(pw.parentNode!==host||(before&&pw.nextSibling!==before))host.insertBefore(pw,before||null);
      pw.classList.remove('rm-dr','rm-im');pw.classList.add('rm-top');if(cls)pw.classList.add(cls);
      st.classList.remove('rb');st.classList.add('rm-proj');
      if(mode==='draw'){st.classList.add('dr-b');st.classList.remove('btn');}else{st.classList.add('btn');st.classList.remove('dr-b');}
    }
  }
  /* сборка рейла */
  let lastKey='',moreBtn=null,moreMenu=null;
  const icoHTML=n=>'<i class="ico i-'+n+'"></i>';
  function ensureMore(){
    if(moreBtn)return;const rail=q('#rail'),tools=q('#rp-tools');
    moreBtn=document.createElement('button');moreBtn.type='button';moreBtn.className='rb more';moreBtn.id='rail-more-btn';moreBtn.dataset.rt='more';
    moreBtn.setAttribute('aria-haspopup','menu');moreBtn.setAttribute('aria-expanded','false');moreBtn.setAttribute('aria-controls','rail-more');
    moreBtn.setAttribute('aria-label','Ещё');moreBtn.title='Ещё';moreBtn.dataset.tip='Ещё';moreBtn.innerHTML=icoHTML('more');
    tools.appendChild(moreBtn);
    moreMenu=document.createElement('div');moreMenu.className='rmore';moreMenu.id='rail-more';moreMenu.setAttribute('role','menu');moreMenu.setAttribute('aria-label','Ещё');moreMenu.hidden=true;
    rail.appendChild(moreMenu);
    moreBtn.addEventListener('click',e=>{e.stopPropagation();moreShow(moreMenu.hidden);});
    document.addEventListener('click',e=>{if(!moreMenu.hidden&&!e.target.closest('#rail-more,#rail-more-btn'))moreShow(false);});
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!moreMenu.hidden){moreShow(false);moreBtn.focus();}});
    moreMenu.addEventListener('click',e=>{
      const b=e.target.closest('[data-rt]');if(!b)return;moreShow(false);const id=b.dataset.rt;
      if(id==='help-more'){setTimeout(()=>{if(typeof projShow==='function')projShow(false);if(typeof helpToggle==='function')helpToggle(true);},0);return;}
      if(id==='proj-more'){setTimeout(()=>{if(typeof helpToggle==='function')helpToggle(false);if(typeof projShow==='function')projShow(true);},0);return;}
      const t=(TOOLS[rmMode()]||[]).find(x=>x.id===id);if(t){t.run();schedule();}});
  }
  function moreShow(on){if(!moreMenu)return;moreMenu.hidden=!on;moreBtn.setAttribute('aria-expanded',on?'true':'false');if(on){const f=moreMenu.querySelector('.rm-item');if(f)f.focus();}}
  function sync(){
    const mode=rmMode(),b=document.body,work=RM_WORK.has(mode);
    if(b.dataset.rm!==mode)b.dataset.rm=mode;
    b.classList.toggle('rm-work',work);b.classList.toggle('rm-ed',RM_ED.has(mode));
    relocate(mode);
    ensureMore();
    Object.keys(DW).forEach(dwWatch);
    const tools=q('#rp-tools'),all=(TOOLS[mode]||[]).filter(t=>{try{return t.vis();}catch(e){return false;}});
    const lab=t=>t.dyn?t.dyn():t.label;
    /* «Редактор»: в редакторе — переключатель колонки настроек, в «Проверке» и «Кернинге» — путь назад */
    const rbe=q('#rb-edit');
    if(rbe){
      const ed=mode==='edit',l=ed?'Настройки':'Редактор';
      rbe.dataset.tip=l;rbe.title=l;rbe.setAttribute('aria-label',l);
      const pr=ed?paramsTool.pressed():null;
      if(pr===null)rbe.removeAttribute('aria-pressed');else rbe.setAttribute('aria-pressed',pr?'true':'false');
      if(ed)rbe.setAttribute('aria-controls','pcard');else rbe.removeAttribute('aria-controls');
    }
    const slots=phone()?(RM_ED.has(mode)?3:4):all.length;
    const prim=work?all.slice(0,slots):[],rest=work?all.slice(slots):[];
    const key=mode+'|'+prim.map(t=>t.id+lab(t)).join(',')+'|'+rest.map(t=>t.id+lab(t)).join(',')+'|'+phone();
    if(key!==lastKey){
      lastKey=key;
      tools.querySelectorAll('.rb[data-rt]:not(.more),.rsep').forEach(e=>e.remove());
      const frag=document.createDocumentFragment();
      if(prim.length){const sp=document.createElement('span');sp.className='rsep';sp.setAttribute('aria-hidden','true');frag.appendChild(sp);}
      prim.forEach(t=>{const bt=document.createElement('button');bt.type='button';bt.className='rb';bt.dataset.rt=t.id;
        const l=lab(t);bt.dataset.tip=l;bt.title=l;bt.setAttribute('aria-label',l);bt.innerHTML=icoHTML(t.icon);
        const c=t.ctl&&t.ctl();if(c)bt.setAttribute('aria-controls',c);frag.appendChild(bt);});
      tools.insertBefore(frag,moreBtn);
      moreMenu.innerHTML=rest.map(t=>'<button type="button" role="menuitem" class="rm-item" data-rt="'+t.id+'">'+icoHTML(t.icon)+'<span>'+lab(t)+'</span></button>').join('')
        +(work?'<button type="button" role="menuitem" class="rm-item" data-rt="proj-more">'+icoHTML('folder')+'<span>Проект</span></button><button type="button" role="menuitem" class="rm-item" data-rt="help-more">'+icoHTML('help')+'<span>Подсказки и тема</span></button>':'');
    }
    /* состояние */
    all.forEach(t=>{
      const p=t.pressed();
      [tools.querySelector('.rb[data-rt="'+t.id+'"]'),moreMenu.querySelector('[data-rt="'+t.id+'"]')].forEach(e=>{if(!e)return;
        if(p===null||p===undefined)e.removeAttribute('aria-pressed');else e.setAttribute('aria-pressed',p?'true':'false');});
    });
    if(!work||!phone())moreShow(false);
  }
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;try{sync();}catch(e){}});};
  window.railSync=sync;window.railSchedule=schedule;
  document.addEventListener('DOMContentLoaded',()=>{
    const tools=q('#rp-tools');if(!tools)return;
    tools.addEventListener('click',e=>{
      const bt=e.target.closest('.rb[data-rt]');if(!bt||bt.classList.contains('more'))return;
      const t=(TOOLS[rmMode()]||[]).find(x=>x.id===bt.dataset.rt);if(t){t.run();sync();}});
    /* «Настройки» в редакторе: сворачивает / разворачивает колонку; в «Проверке» и «Кернинге» — переход в редактор (обычный data-tab) */
    const rbe=q('#rb-edit');
    if(rbe)rbe.addEventListener('click',e=>{
      if(rmMode()!=='edit')return;e.stopImmediatePropagation();
      paramsTool.run();sync();},true);
    const _st=setTab;setTab=function(){const r=_st.apply(this,arguments);sync();setTimeout(sync,300);return r;};
    new MutationObserver(()=>schedule()).observe(document.body,{attributes:true,attributeFilter:['class']});
    new MutationObserver(rs=>{if(rs.some(r=>!r.target.closest||!r.target.closest('#rail,#rail-more')))schedule();})
      .observe(q('.app'),{attributes:true,subtree:true,attributeFilter:['data-g','data-gc','data-open','data-sec','hidden']});
    new MutationObserver(()=>schedule()).observe(q('.app'),{childList:true});
    const dv=q('#view-draw');if(dv)new MutationObserver(()=>schedule()).observe(dv,{childList:true});
    document.addEventListener('pane:toggle',schedule);
    document.addEventListener('change',e=>{if(e.target&&e.target.matches&&e.target.matches('#pbad,#pmet,#pref,#kk-only'))schedule();});
    window.addEventListener('resize',schedule);
    /* Esc сначала закрывает открытое меню (проект, «?», «Ещё»), а не уводит из «Кернинга» в редактор */
    window.addEventListener('keydown',e=>{
      if(e.key!=='Escape'||e.defaultPrevented)return;
      const m=rmMode(),op=DW[m]&&dwSec(m);
      if(op&&!(moreMenu&&!moreMenu.hidden)&&!(q('#projpop')&&!q('#projpop').hidden)&&!(q('#helpc')&&!q('#helpc').hidden)&&!q('.dr-m:not([hidden])')){
        const t=e.target;if(t&&t.id==='p-q'&&t.value)return;/* Esc в поиске сначала очищает поиск */
        const d=dwEl(m),had=d&&d.contains(document.activeElement);dwClose(m);if(had){const b=q('.rail .rb[data-rt]');try{b&&b.focus();}catch(x){}}return;}
    },false);
    window.addEventListener('keydown',e=>{
      if(e.key!=='Escape')return;const pp=q('#projpop'),hc=q('#helpc');
      const open=(pp&&!pp.hidden)||(hc&&!hc.hidden)||(moreMenu&&!moreMenu.hidden);if(!open)return;
      if(pp&&!pp.hidden&&typeof projShow==='function')projShow(false);
      if(hc&&!hc.hidden&&typeof helpToggle==='function')helpToggle(false);
      moreShow(false);e.stopImmediatePropagation();},true);
    sync();setTimeout(sync,400);
  });
})();

/* W94 plaques: a single-row bar is a pill, a bar whose text wraps falls back to a card radius (.is-wrap, DESIGN_SYSTEM §22). plFit measures the text element against one line. */
function plFit(el,textSel){
  if(!el||!el.isConnected)return;
  el.classList.remove('is-wrap');
  const t=textSel?el.querySelector(textSel):el.firstElementChild;if(!t)return;
  const cs=getComputedStyle(t),lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.4;
  if(t.getBoundingClientRect().height>lh*1.5)el.classList.add('is-wrap');
}
window.plFit=plFit;
