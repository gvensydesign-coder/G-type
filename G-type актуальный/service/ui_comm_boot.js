/* ===== «Сообщество»: загрузчик (v92). Тексты уроков и челленджей (ui_comm_data.js) и код раздела (ui_comm.js) лежат в index.html одним сжатым блоком <script type="text/plain" id="zm">
   и при старте НЕ разбираются и не выполняются. Блок распаковывается и запускается синхронно один раз: при первом открытии вкладки «Сообщество» (в том числе по ссылке #community,
   после перезагрузки и кнопкой «Назад»), при показе статей в «Избранном» и при первом изменении шрифта, если в хранилище записан активный челлендж.
   Здесь только то, что нужно до загрузки: обёртка setTab, «Избранное» (читает маленький ключ), отметки «само» (шрифт / правка), состояние popstate и заглушка window.COMM для тестов. =====
   Контракт с ui_comm.js: он вызывает __cmStub.ready(API); API.hk = {enter, leave, favRender, sw, bump, seed}; popstate, пришедший до загрузки, отдаёт __cmStub.pop(). */
(function(){
'use strict';
const KEY='gtype-comm-v1';
let M=null,POP=null,SIG='',LIVE=false;
const stored=()=>{try{const j=JSON.parse(localStorage.getItem(KEY)||'null');return j&&typeof j==='object'&&!Array.isArray(j)?j:{};}catch(e){return {};}};
const ACT=!!stored().act;   /* активный челлендж записан: смена шрифта и правка параметров могут отметить пункты прогресса */
function ensure(){
  if(M)return M;
  if(typeof __zrun!=='function'||!document.getElementById('zm'))throw new Error('community bundle is missing');
  __zrun('zm');
  if(!M)throw new Error('community bundle did not register');
  return M;
}
window.__cmStub={ready:api=>{M=api;window.COMM=api;},pop:()=>{const p=POP;POP=null;return p;},loaded:()=>!!M};
/* до загрузки window.COMM — прокси: built() = false, любое другое обращение загружает раздел (нужно тестам и внешним вызовам) */
window.COMM=new Proxy({},{get(_,k){if(typeof k==='symbol'||k==='then')return undefined;if(k==='built'&&!M)return ()=>false;return ensure()[k];}});
window.addEventListener('load',()=>setTimeout(()=>{LIVE=true;},0));
/* popstate приходит до загрузки (переход «Назад» на запись #community из другой вкладки): состояние записи нужно разделу при первом построении */
window.addEventListener('popstate',e=>{if(M)return;POP=e.state||null;setTimeout(()=>{POP=null;},0);});
(function wrap(){
  if(typeof setTab!=='function')return;
  const _st=setTab;setTab=function(t){const r=_st.apply(this,arguments);try{if(typeof S!=='undefined'&&S.tab==='community')ensure().hk.enter();else if(M)M.hk.leave();}catch(e){console.error(e);}return r;};
})();
(function favHook(){
  if(typeof libRenderFav!=='function')return;
  const _f=libRenderFav;
  libRenderFav=function(){
    const r=_f.apply(this,arguments);
    try{
      if(M)M.hk.favRender();
      else{const fv=stored().fav;if(fv&&typeof fv==='object'&&Object.keys(fv).some(k=>fv[k]))ensure().hk.favRender();
        else{const sec=document.getElementById('fav-art'),box=document.getElementById('fav-artlist');if(sec)sec.hidden=true;if(box)box.textContent='';}}
    }catch(e){console.error(e);}
    return r;
  };
})();
(function actHook(){
  if(typeof switchFont==='function'){const _s=switchFont;switchFont=function(id){const same=id===S.fontId,r=_s.apply(this,arguments);
    try{
      if(M)M.hk.sw(id,same);
      else if(ACT&&LIVE){if(!same&&FONTS[id])ensure().hk.sw(id,same);else SIG=JSON.stringify(cur().p);}
    }catch(e){console.error(e);}
    return r;};}
  if(typeof bump==='function'){const _b=bump;bump=function(){const r=_b.apply(this,arguments);
    try{
      if(M)M.hk.bump();
      else if(ACT&&LIVE&&SIG&&JSON.stringify(cur().p)!==SIG){const m=ensure();m.hk.seed(SIG);m.hk.bump();SIG='';}
    }catch(e){console.error(e);}
    return r;};}
})();
})();
