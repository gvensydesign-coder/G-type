/* ===== FX80 F4: навигация: открытый экран переживает перезагрузку, кнопки браузера «Назад» / «Вперёд» =====
   Адрес хранит только простой токен: #home #library #profile #edit #draw #import #fav #community #ds (в песочнице до location.hash доходит лишь он).
   Экран: S.tab (proof, kern = edit; folder = profile), IU.open = import, body.ds-open = ds. Запись в историю одна на смену экрана, дубли не пишем.
   Перезагрузка: сначала хэш, иначе запомненный экран (localStorage gtype-nav-v1, вместе с последним шрифтом для #edit), неверный токен = home.
   «Назад» закрывает открытые окна и меню; ознакомительный тур и знакомство при загрузке не трогаем. */
(function(){
'use strict';
const TOKS=['home','library','profile','edit','draw','import','fav','community','ds'],SK='gtype-nav-v1';
const body=()=>document.body;
function cur(){
  if(body().classList.contains('ds-open'))return 'ds';
  if(typeof IU!=='undefined'&&IU.open)return 'import';
  const t=S.tab;
  return t==='proof'||t==='kern'||t==='edit'?'edit':t==='folder'||t==='profile'?'profile':TOKS.includes(t)?t:'home';
}
const hashTok=()=>{let h='';try{h=location.hash.replace(/^#/,'');}catch(e){}return TOKS.includes(h)?h:'';};
function store(t){try{localStorage.setItem(SK,JSON.stringify({t,fid:(typeof S!=='undefined'&&S.fontId)||''}));}catch(e){}}
function stored(){try{const j=JSON.parse(localStorage.getItem(SK)||'null');return j&&TOKS.includes(j.t)?j:null;}catch(e){return null;}}
let applying=false,last=null,queued=false;
function sync(){
  queued=false;if(applying||last===null)return;
  const t=cur();store(t);if(t===last)return;last=t;
  if(hashTok()===t||(t==='home'&&!hashTok()&&!location.hash))return;
  try{history.pushState(null,'','#'+t);}catch(e){}
}
function soon(){if(queued)return;queued=true;Promise.resolve().then(sync);}
function closeOverlays(){
  let n=0;
  const SEL='#pst,#xpv,#helpc,#projpop,#ex-list,#hcard,#about-font,.pf-mw,.pf-drawer,.menu70,.xmenu,.dr-m,.cu-modal,.cm-modal,#hist,#st-pop,#appop,#imp-pop';
  for(let i=0;i<4;i++){
    const open=[...document.querySelectorAll(SEL)].filter(e=>!e.closest('#tour,#onb-dlg')&&!e.hidden&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.classList.contains('off'));
    if(!open.length)break;n+=open.length;
    try{if(window.SHARE&&SHARE.state.open)SHARE.close();}catch(e){}
    open.forEach(e=>{try{e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));}catch(x){}});
  }
  return n;
}
function go(t){
  const c=cur();if(c===t)return;
  if(c==='ds'&&typeof closeDS==='function')closeDS(true);
  if(c==='import'&&t!=='import'&&typeof iuClose==='function')iuClose();
  if(t==='ds'){if(typeof openDS==='function')openDS();return;}
  if(t==='import'){if(typeof iuOpen==='function')iuOpen();return;}
  if(t==='edit'){const j=stored();if(j&&j.fid&&j.fid!==S.fontId&&FONTS[j.fid]){try{switchFont(j.fid);}catch(e){}}}
  setTab(t);
}
function onPop(){
  const t=hashTok()||'home',n=closeOverlays();
  const run=()=>{applying=true;try{go(t);}catch(e){}applying=false;last=cur();store(last);};
  /* W93: уход из режима с несохранённым процессом кнопкой «Назад»: диалог «Сохранить процесс?» (ui_drafts.js) */
  if(!(n&&cur()===t)){try{if(window.GT_DRAFTS&&GT_DRAFTS.popGuard&&GT_DRAFTS.popGuard(t,run))return;}catch(e){}run();return;}
  last=cur();store(last);
}
function boot(){
  if(typeof setTab!=='function'||typeof S==='undefined')return;
  const _st=setTab;setTab=function(){const r=_st.apply(this,arguments);soon();return r;};
  const noRestore=/[?&]tour\b/.test(location.search);
  const h=hashTok(),raw=(()=>{try{return location.hash;}catch(e){return '';}})();
  const j=stored();
  let want=h||(raw?'home':(noRestore||!j?'home':j.t));
  /* W93: новая сессия (вкладку закрывали) не открывает режим работы сама: процесс уходит в черновики, экран — главная; перезагрузка вкладки по-прежнему возвращает экран */
  const DRM=window.GT_DRAFTS;
  if(DRM&&DRM.newSession&&!h&&(want==='edit'||want==='draw'||want==='import'))want='home';
  if(DRM)DRM.restoring=!DRM.newSession;
  /* стартовый токен 'ds' ведёт собственный код страницы (hashchange / load) */
  applying=true;
  try{
    if(want==='edit'&&j&&j.fid&&j.fid!==S.fontId&&FONTS[j.fid]){try{switchFont(j.fid);}catch(e){}}
    if(want!=='ds'&&want!==cur()&&!(want==='edit'&&cur()==='edit'))go(want);
  }catch(e){}
  applying=false;if(DRM)DRM.restoring=false;
  last=want==='ds'?'ds':cur();
  try{
    if(raw&&!h)history.replaceState(null,'',location.pathname+location.search+(last==='home'?'':'#'+last));
    else if(!raw&&last!=='home')history.replaceState(null,'','#'+last);
  }catch(e){}
  store(last);
  window.addEventListener('popstate',onPop);
  try{if(DRM&&DRM.afterBoot)DRM.afterBoot();}catch(e){}
  try{new MutationObserver(soon).observe(body(),{attributes:true,attributeFilter:['class']});}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
window.GT_NAV={cur,tokens:TOKS,sync,go};
})();
