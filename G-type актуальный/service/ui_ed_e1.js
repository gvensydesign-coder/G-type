/* Редактор (m40): раскладка. Живая строка свёрнутого образца, «Режимы» в образце, поиск по параметрам,
   «Языки» в настройках, вкладки «Редактор · Проверка · Кернинг». Панели — единая реализация paneInit/paneHTML (ui_ds_s1.js).
   Ничего не считает и не рисует глифы; все старые id остаются на месте. */
/* открыть все панели редактора (для тестов и «раскрыть всё»); панели — paneInit (ui_ds_s1.js) */
function edOpenAll(){
  paneOpenAll(document.getElementById('view-edit'));
}

/* ---------- панели колонки «Настройки»: все — .pane; раскрыта по умолчанию одна («Пресеты», data-open) ---------- */
function edPanesInit(){
  document.querySelectorAll('#pcard .panel>.pane[data-pane], #mtbox').forEach(p=>paneInit(p,p.dataset.pane,p.dataset.open==='1'));
}
/* старый <details>, который добавил чужой код (пиксельный раздел), -> .pane с теми же id/hidden; закрыт по умолчанию */
const ED_DET_KEYS={pxsec:['ed-pixels',false]};
function edUpgradeDetails(){
  document.querySelectorAll('#pcard .panel>details').forEach(d=>{
    const k=ED_DET_KEYS[d.id]||['ed-'+(d.id||'x'),false],sm=d.querySelector(':scope>summary');
    const p=paneEl(k[0],sm?sm.textContent:'','');p.id=d.id;p.hidden=d.hidden;
    const b=p.querySelector('.pane-b');[...d.childNodes].forEach(n=>{if(n!==sm)b.appendChild(n);});
    d.replaceWith(p);paneInit(p,k[0],k[1]);
  });
}

/* ---------- высота образца и свёрнутая «живая строка» ---------- */
specMaxH=function(){
  const mob=innerWidth<=1060,sw=document.getElementById('specwrap');
  if(sw&&sw.classList.contains('shut'))return 110;
  return Math.round(Math.max(110,Math.min(mob?240:210,innerHeight*(mob?.26:.2))));
};
function edMiniFit(){/* размер строки пересчитывает drawSpecimen ниже */}
const _drawSpecimen_ed=drawSpecimen;
drawSpecimen=function(){
  const sw=document.getElementById('specwrap'),cv=document.getElementById('spec');
  if(!sw||!cv||S.tab!=='edit'||!sw.classList.contains('shut')){
    if(cv&&cv.style.marginTop)cv.style.marginTop='';
    return _drawSpecimen_ed.apply(this,arguments);
  }
  const keep={sz:S.specSize,tx:S.text,tt:typeof TT!=='undefined'?TT.on:false,cm:S.cmp?S.cmp.on:false};
  try{
    S.specSize=Math.min(S.specSize,26);
    S.text=String(S.text||'').split('\n')[0].trim()||' ';
    if(typeof TT!=='undefined')TT.on=false;
    if(S.cmp)S.cmp.on=false;
    _drawSpecimen_ed.apply(this,arguments);
  }finally{
    S.specSize=keep.sz;S.text=keep.tx;
    if(typeof TT!=='undefined')TT.on=keep.tt;
    if(S.cmp)S.cmp.on=keep.cm;
  }
  const fs=S.specFs||26,row=fs*1.15+10;
  sw.style.setProperty('--mini-h',Math.ceil(fs*1.15+8)+'px');
  cv.style.marginTop=(S.style==='italic'?-row-6:-6)+'px';/* видна только строка текущего начертания */
};

/* ---------- вкладки «Редактор · Проверка · Кернинг» ---------- */
function edTabsSync(){
  document.querySelectorAll('#vtabs [data-tab]').forEach(b=>{const on=b.dataset.tab===S.tab;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;});
}

/* ---------- «Режимы» (тестер, сравнение, декор) и прочая сборка ---------- */
function edBuild(){
  const sw=document.getElementById('specwrap'),row=sw&&sw.querySelector('.chiprow');if(!row)return;
  let m=document.getElementById('ed-modes');
  const tt=document.getElementById('tt-on'),cm=document.getElementById('cmpb');
  if(!m&&tt&&cm){
    m=paneEl('ed-modes','Режимы','<div class="pane-row" id="ed-modes-row"></div>',{tip:'Тестер, сравнение, декоративные начертания',bid:'ed-modes-b'});m.id='ed-modes';
    row.appendChild(m);
    paneInit(m,'ed-modes',false);
    const vf=document.getElementById('vfx-pane');if(vf)row.appendChild(vf);/* «Оси» — рядом с «Режимами» */
  }
  if(m){
    const mr=m.querySelector('#ed-modes-row'),body=m.querySelector('.pane-b');
    ['tt-on','cmpb','decob','cmpbar'].forEach(id=>{const e=document.getElementById(id);if(e&&e.parentNode!==mr)mr.appendChild(e);});
    ['ttbar','ttout','decobar'].forEach(id=>{const e=document.getElementById(id);if(e&&e.parentNode!==body)body.appendChild(e);});
    if(!m.__obs){
      m.__obs=1;
      /* включённый режим не прячется в закрытой панели */
      const chk=()=>{if(m._pane&&!m._pane.open&&m.querySelector('#tt-on.on,#cmpb.on,#decob.on,#decob[aria-pressed=true]'))m._pane.set(true,false,true);};
      new MutationObserver(chk).observe(m,{subtree:true,attributes:true,attributeFilter:['class','aria-pressed']});
      chk();
    }
  }
}

/* ---------- поиск по параметрам ---------- */
function edParamFilter(){
  const q=document.getElementById('p-q'),box=document.getElementById('params');if(!q||!box)return;
  const t=q.value.trim().toLowerCase();let any=false;
  box.classList.toggle('searching',!!t);
  box.querySelectorAll('.grp').forEach(g=>{
    let hit=0;
    g.querySelectorAll('.ctl').forEach(c=>{
      const l=c.querySelector('label span'),ok=!t||(l&&l.textContent.toLowerCase().includes(t))||(c.title||'').toLowerCase().includes(t);
      c.classList.toggle('nomatch',!ok);if(ok)hit++;});
    g.classList.toggle('nomatch',!!t&&!hit);
    if(t&&hit){g.classList.remove('shut');const h=g.querySelector('h5');if(h)h.setAttribute('aria-expanded','true');}
    else if(!t&&g.dataset.dc){/* вернуть выбор пользователя */
      const h=g.querySelector('h5'),nm=h?h.textContent:'',open=g.dataset.was;
      if(open!=null){g.classList.toggle('shut',open!=='1');if(h)h.setAttribute('aria-expanded',open==='1'?'true':'false');}}
    if(t&&hit)any=true;
  });
  const none=document.getElementById('p-none');if(none)none.hidden=!t||any;
}
function edSearchInit(){
  const q=document.getElementById('p-q');if(!q||q.__ed)return;q.__ed=1;
  let prev=false;
  q.addEventListener('input',()=>{
    const on=!!q.value.trim();
    if(on&&!prev){document.querySelectorAll('#params .grp').forEach(g=>{g.dataset.was=g.classList.contains('shut')?'0':'1';});}
    prev=on;edParamFilter();
  });
  q.addEventListener('keydown',e=>{if(e.key==='Escape'&&q.value){q.value='';q.dispatchEvent(new Event('input'));e.stopPropagation();}});
}

/* ---------- «Языки» в настройках ---------- */
function edLangFill(){
  const box=document.querySelector('#ps-lang .lg-body');if(!box||typeof langCover!=='function')return;
  const cov=langCover(S.fontId),full=lgFull(cov),near=lgNear(cov,3);
  box.innerHTML='<p class="lg-row"><b>'+full.length+' из '+cov.length+'</b> языков поддержано полностью</p>'
    +(full.length?'<p class="lg-row">'+full.map(r=>lgEsc(r.name)).join(', ')+'</p>':'')
    +(near.length?'<p class="lg-row">Почти: '+near.map(r=>'<b>'+lgEsc(r.name)+'</b> — '+lgEsc(lgMiss(r))).join('; ')+'</p>':'');
}
function edLangMount(){
  const pan=document.querySelector('#pcard .panel');if(!pan||document.getElementById('ps-lang')||typeof langCover!=='function')return;
  const d=paneEl('ed-lang','Языки','<div class="lg-body"></div>',{tip:'Какие языки поддерживает набор знаков этого шрифта'});d.id='ps-lang';
  pan.appendChild(d);
  paneInit(d,'ed-lang',false,open=>{if(open)edLangFill();});
  if(d.open)edLangFill();
}

document.addEventListener('DOMContentLoaded',()=>{
  /* обёртка поверх вкладок кернинга/оболочки: вызывается последней */
  const _st=setTab;
  setTab=function(){const r=_st.apply(this,arguments);try{edTabsSync();edBuild();}catch(e){}return r;};
  /* свёрнутая «живая строка» открывает образец по щелчку */
  const sb=document.getElementById('specbox'),sw=document.getElementById('specwrap');
  if(sb&&sw)sb.addEventListener('click',()=>{if(sw.classList.contains('shut')&&sw._pane)sw._pane.set(true);});
  try{edPanesInit();edUpgradeDetails();edBuild();edSearchInit();edLangMount();edTabsSync();}catch(e){console.warn('ed init',e);}
  /* то, что создаётся позже (панель OpenType, «Оси», тестер): подхватить */
  const ev=document.getElementById('view-edit');
  if(ev)new MutationObserver(()=>{try{edUpgradeDetails();edBuild();edLangMount();}catch(e){}}).observe(ev,{childList:true,subtree:true});
  const _sf=switchFont;
  switchFont=function(){const r=_sf.apply(this,arguments);try{if(document.querySelector('#ps-lang:not(.shut)'))edLangFill();}catch(e){}return r;};
  /* стрелки в списке вкладок */
  const vt=document.getElementById('vtabs');
  if(vt)vt.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    const bs=[...vt.querySelectorAll('[role=tab]')],i=bs.indexOf(document.activeElement);if(i<0)return;
    e.preventDefault();const n=bs[(i+(e.key==='ArrowRight'?1:bs.length-1))%bs.length];n.focus();n.click();});
  window.addEventListener('resize',()=>{if(S.tab==='edit')schedule();});
});
