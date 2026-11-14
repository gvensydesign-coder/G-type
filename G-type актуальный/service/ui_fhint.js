/* W88: подсказка о поведении шрифта. Один источник: FONT_META[id].hint (ui_lib_u1.js). Показывается над образцом в редакторе (там же работает «Тестер»),
   закрывается крестиком; «закрыто» помнится по шрифту в наборе подсказок (hintMark('fh:'+id), HINT_KEY), «Сбросить подсказки» возвращает. */
const FH={id:null};
function fhEl(){
  let b=document.getElementById('fhint');if(b)return b;
  const w=document.getElementById('specwrap'),sb=document.getElementById('specbox');if(!w||!sb)return null;
  b=document.createElement('div');b.className='fhint';b.id='fhint';b.hidden=true;b.setAttribute('role','note');
  b.innerHTML='<span class="fh-t"></span><button class="fh-x" type="button" aria-label="Скрыть подсказку"><i class="ico i-close" aria-hidden="true"></i></button>';
  w.insertBefore(b,sb);
  b.querySelector('.fh-x').addEventListener('click',()=>{
    const id=b.dataset.font;if(id)try{hintMark('fh:'+id);}catch(e){}
    b.classList.add('out');const done=()=>{b.hidden=true;b.classList.remove('out');};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('nomo'))done();else setTimeout(done,160);
    const t=document.getElementById('txt');if(t&&S.tab==='edit')try{t.focus({preventScroll:true});}catch(e){}
  });
  return b;
}
function fhText(id){const m=FONT_META[id];return m&&typeof m.hint==='string'?m.hint:'';}
function fhRefresh(){
  const b=fhEl();if(!b)return;
  const id=S.fontId,h=fhText(id),show=!!h&&S.tab==='edit'&&!hintSeen('fh:'+id);
  b.dataset.font=id;b.classList.remove('out');
  if(show){b.querySelector('.fh-t').textContent=h;if(b.hidden){b.hidden=false;b.classList.remove('in');void b.offsetWidth;b.classList.add('in');}plFit(b,'.fh-t');}
  else b.hidden=true;
}
window.addEventListener('resize',()=>{const b=document.getElementById('fhint');if(b&&!b.hidden)plFit(b,'.fh-t');});
document.addEventListener('DOMContentLoaded',()=>{
  const st=setTab;setTab=function(t){const r=st.apply(this,arguments);try{fhRefresh();}catch(e){console.error(e);}return r;};
  const ac=activate;activate=function(){const r=ac.apply(this,arguments);try{fhRefresh();}catch(e){console.error(e);}return r;};
  fhRefresh();
});
