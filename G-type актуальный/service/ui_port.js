/* ===== PORT: профиль как портфолио, подборки, свой текст, лицензия =====
   Закреплённые (до 4), порядок работ, шрифт имени, цвет профиля, лицензии и подборки лежат в метаданных профиля (PROF.meta(), ключ gtype-profile-v1)
   и попадают в резервную копию. Профиль рисует разделы через PROF.sections / PROF.paintExtra, ящик правки берёт группы из PORT.drawer*.
   Свой текст библиотеки: sessionStorage gtype-libtxt-s. Меню «⋯» на карточке шрифта, диалоги подборок, перетаскивание карточек (pointer events).
   «Поделиться» и предпросмотр экспорта — ui_port_x.js. Общие помощники отдаются через window.PORT. */
(function(){
'use strict';
const PF=window.PROF,PORT=window.PORT={};
const {esc,ic,plural,$1,$A}=PF;
const M=()=>PF.meta(),save=()=>PF.saveMeta();
const tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const phone=()=>matchMedia('(max-width:720px)').matches;
const mo=()=>window.MO||{off:()=>true,D:()=>0,E:()=>'ease'};
const authorName=()=>PF.fullName()||'';
PORT.tok=tok;PORT.phone=phone;PORT.authorName=authorName;

/* ---------- лицензии ---------- */
const LIC={
  ofl:{n:'Свободная (SIL OFL)',b:'OFL',d:'Использовать можно везде, продавать сам шрифт нельзя',txt:'This Font Software is licensed under the SIL Open Font License, Version 1.1.',url:'https://openfontlicense.org'},
  cc:{n:'Только некоммерческое использование (CC BY-NC)',b:'CC BY-NC',d:'Бесплатно, но только для некоммерческих проектов',txt:'Licensed under CC BY-NC 4.0: free for non-commercial use with attribution.',url:'https://creativecommons.org/licenses/by-nc/4.0/'},
  arr:{n:'Все права защищены',b:'Права защищены',d:'Только с вашего письменного разрешения',txt:'All rights reserved.',url:''}
};
const LIC_IDS=PF.LICIDS;
/* действующая лицензия: выбранная; для своих шрифтов — по умолчанию из профиля; у шрифтов библиотеки без выбора файл остаётся как был (пусто) */
function licOf(fid){
  const m=M();if(m.lic[fid]&&LIC[m.lic[fid]])return m.lic[fid];
  let own=fid==='imp';try{own=own||PF.test.isCustom(fid);}catch(e){}
  return own?m.defLic:(fid==='stroka'?'ofl':'');
}
window.GT_LICENSE=fid=>{const x=LIC[licOf(fid)];return x?{txt:x.txt,url:x.url}:null;};
function licBadge(l,tag,extra){
  const x=LIC[l];if(!x)return '';tag=tag||'span';
  return '<'+tag+' class="lic-b" data-l="'+l+'" title="'+esc(x.n+'. '+x.d)+'"'+(tag==='button'?' type="button"':'')+(extra||'')+'>'+esc(x.b)+'</'+tag+'>';
}
const licRadios=(attr,cur)=>LIC_IDS.map(l=>'<button class="lic-opt" type="button" role="radio" aria-checked="'+(cur===l)+'" '+attr+'="'+l+'"><span class="rd" aria-hidden="true"></span><span><b>'+esc(LIC[l].n)+'</b><span class="d">'+esc(LIC[l].d)+'</span></span></button>').join('');
Object.assign(PORT,{LIC,LIC_IDS,licOf,licBadge,licRadios});

/* ---------- общие помощники ---------- */
function paintText(cv,fid,text,o){
  o=o||{};const back=S.fontId;
  try{
    const f=fitCanvas(cv),c=f.c,w=f.w,h=f.h;c.clearRect(0,0,w,h);
    if(!FONTS[fid])return;
    useFont(fid);
    let run=libRun(fid,text||'');if(!run.items.length)run=libRun(fid,FONTS[fid].name||'Аа');if(!run.items.length)return;
    const pad=o.pad==null?12:o.pad;let sc=h*(o.cap||.34)/run.cap;if(run.tot*sc>w-2*pad)sc=(w-2*pad)/Math.max(run.tot,1);
    const base=h/2+run.cap*sc/2,ox=o.left?pad:(w-run.tot*sc)/2;
    c.fillStyle=o.fill||getComputedStyle(cv).color;
    for(const it of run.items)c.fill(pathOf(it[0].cs,(px,py)=>[ox+it[1]*sc+px*sc,base-py*sc]),'nonzero');
  }catch(e){console.error(e);}
  finally{try{if(FONTS[back])useFont(back);}catch(e){}}
}
const live=()=>{let l=$1('#sk-live');if(!l){l=document.createElement('div');l.id='sk-live';l.className='sk-live';l.setAttribute('role','status');l.setAttribute('aria-live','polite');document.body.appendChild(l);}return l;};
const say=t=>{live().textContent='';setTimeout(()=>{live().textContent=t;},30);};
/* работы = готовые шрифты «В профиле», в порядке пользователя (новые — по времени правки) */
function works(p){
  const o=M().order,fs=(p||PF.snapshot(!PF.guest)).fonts.filter(f=>f.st==='ready'&&f.vis==='pub'&&f.fid&&FONTS[f.fid]);
  return fs.sort((a,b)=>{const ia=o.indexOf(a.key),ib=o.indexOf(b.key);return (ia<0?999:ia)-(ib<0?999:ib)||b.t-a.t;});
}
const byFid=fid=>works().find(w=>w.fid===fid);
const nameOf=fid=>{const w=byFid(fid);return w?w.name:(FONTS[fid]?FONTS[fid].name:fid);};
Object.assign(PORT,{paintText,say,works,byFid,nameOf});

/* =====================================================================
   Свой текст: поле в шапке библиотеки, текст на обложках библиотеки и избранного (главная — без него)
   ===================================================================== */
const LT_KEY='gtype-libtxt-s';
const LT_CHIPS=[['name','Название'],['Аа Бб','Аа Бб'],['0123','0123'],['Привет, мир','Привет, мир']];
let ltTimer=0;
function ltRead(){try{return JSON.parse(sessionStorage.getItem(LT_KEY)||'null')||{};}catch(e){return {};}}
function ltWrite(o){try{sessionStorage.setItem(LT_KEY,JSON.stringify(o));}catch(e){}}
function ltApply(txt,mode,redraw){
  window.LIBTXT=mode==='name'?'':txt;window.LIBTXT_NAME=mode==='name';
  ltWrite({t:txt,m:mode});
  const ph=mode==='name'?'Название на каждой карточке':'Свой текст';
  $A('.lt-in').forEach(i=>{if(i.value!==txt)i.value=txt;i.placeholder=ph;});
  $A('.ltx').forEach(f=>f.classList.toggle('has',!!(txt||mode==='name')));
  $A('.lt-x').forEach(x=>{x.hidden=!txt;});
  $A('.lt-chips .chip').forEach(c=>c.setAttribute('aria-pressed',String((mode==='name'&&c.dataset.v==='name')||(mode!=='name'&&!!txt&&c.dataset.v===txt))));
  if(redraw!==false&&typeof drawLibrary==='function')requestAnimationFrame(()=>{drawLibrary();});
}
function ltField(){
  const f=document.createElement('div');f.className='srch big ltx';
  f.innerHTML=ic('text')+'<input class="lt-in" type="text" maxlength="28" placeholder="Свой текст" aria-label="Свой текст для всех карточек" autocomplete="off" spellcheck="false" enterkeyhint="done"><button class="srch-x lt-x" type="button" aria-label="Очистить свой текст" hidden>'+ic('close')+'</button>';
  const inp=$1('input',f);
  inp.addEventListener('input',()=>{clearTimeout(ltTimer);const v=inp.value;ltTimer=setTimeout(()=>ltApply(v.trim()?v:'','',true),90);});
  $1('.lt-x',f).addEventListener('click',()=>{ltApply('','',true);inp.focus();});
  return f;
}
function ltInit(){
  for(const id of ['lib-search']){ /* только библиотека: с главной поле убрано по решению пользователя */
    const form=document.getElementById(id);if(!form||form.parentNode.classList.contains('lt-row'))continue;
    const row=document.createElement('div');row.className='lt-row';
    form.parentNode.insertBefore(row,form);row.appendChild(form);row.appendChild(ltField());
    if(id==='lib-search'){
      const ch=document.createElement('div');ch.className='lt-chips';ch.setAttribute('role','group');ch.setAttribute('aria-label','Быстрые тексты');
      ch.innerHTML='<span class="lt-cap">Показать везде:</span>'+LT_CHIPS.map(c=>'<button class="chip" type="button" data-v="'+esc(c[0])+'" aria-pressed="false">'+esc(c[1])+'</button>').join('');
      row.parentNode.insertBefore(ch,row.nextSibling);
      ch.addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;
        if(b.getAttribute('aria-pressed')==='true')ltApply('','',true);else if(b.dataset.v==='name')ltApply('','name',true);else ltApply(b.dataset.v,'',true);});
    }
  }
  const q0=document.getElementById('lib-q');if(q0)q0.placeholder='Название или слово';
  const st=ltRead();if(st.t||st.m)ltApply(st.t||'',st.m||'',false);
}
PORT.setText=(t,m)=>ltApply(t||'',m||'',true);

/* =====================================================================
   Профиль: закреплённые, работы, порядок, подборки
   ===================================================================== */
const ACC=[['Бренд','pa-1'],['Мандарин','pa-2'],['Мёд','pa-3'],['Мята','pa-4'],['Лазурь','pa-5'],['Сирень','pa-6']];
let ORD=false,CFM='';
function cardHTML(f,o){
  const k=esc(f.key),n=esc(f.name),own=o.own,i=o.i,N=o.n,pinned=M().pins.indexOf(f.key)>=0,l=licOf(f.fid);
  const ord=(own&&!o.pin)?'<div class="sk-ord pf-own" role="group" aria-label="Порядок: «'+n+'»"><button class="ibtn sm grip" type="button" data-sk="grip" data-k="'+k+'" aria-label="Перетащить «'+n+'»" title="Перетащить">'+ic('move')+'</button><button class="ibtn sm" type="button" data-sk="left" data-k="'+k+'" aria-label="Сдвинуть «'+n+'» раньше" title="Раньше"'+(i===0?' disabled':'')+'>'+ic('chev-left')+'</button><button class="ibtn sm" type="button" data-sk="right" data-k="'+k+'" aria-label="Сдвинуть «'+n+'» позже" title="Позже"'+(i===N-1?' disabled':'')+'>'+ic('chev-right')+'</button></div>':'';
  const acts='<div class="sk-act">'+(own?'<button class="ibtn sm pf-own" type="button" data-sk="pin" data-k="'+k+'" aria-pressed="'+pinned+'" aria-label="'+(pinned?'Открепить':'Закрепить')+' «'+n+'»" title="'+(pinned?'Открепить':'Закрепить сверху')+'">'+ic('pin')+'</button>':'')+
    '<span class="sp"></span><button class="ibtn sm" type="button" data-sk="share" data-fid="'+esc(f.fid)+'" aria-label="Поделиться «'+n+'»" title="Поделиться">'+ic('share')+'</button></div>';
  return '<article class="sk-card" data-card="'+k+'" data-k="'+k+'">'+(o.pin?'<span class="pn">'+ic('pin')+'Закреплено</span>':'')+ord+
    '<div class="pf-spec" data-k="'+k+'" data-t="'+n+'"><canvas aria-hidden="true"></canvas></div>'+
    '<div class="cap"><b>'+n+'</b><span class="m"><span>'+esc(f.meta)+'</span>'+(l?licBadge(l):'')+'</span></div>'+acts+'</article>';
}
function emptyBlock(h,p,cta,fan){
  return '<div class="sk-emp pf-own"><div><h3>'+h+'</h3><p>'+p+'</p><div class="cta">'+cta+'</div></div>'+(fan==='pin'?'<div class="sk-ill pin" aria-hidden="true"><i class="slot"></i><i class="card">Аа<b>'+ic('pin')+'</b></i><i class="slot"></i></div>'
    :fan==='shelf'?'<div class="sk-ill shelf" aria-hidden="true"><span class="tab"></span><span class="band"><i>Аа</i><i>Бб</i><i>Вв</i></span><span class="band"><i>Гг</i><i>Дд</i></span></div>':'')+'</div>';
}
function pinsHTML(ws,own,p){
  const pins=M().pins.map(k=>ws.find(w=>w.key===k)).filter(Boolean);
  if(!own&&!pins.length)return '';
  let h='<section class="sk-sect sk-pinsec" aria-labelledby="sk-hp"><div class="vhead"><h2 id="sk-hp">Закреплённые</h2></div>';
  if(!ws.length){
    return h+emptyBlock(ic('pin')+'Здесь будут ваши лучшие работы','Отметьте шрифт готовым и оставьте его в профиле. Потом закрепите до четырёх работ: они встанут сверху.',
      p.fonts.length?'<button class="btn lg" type="button" data-pf="open-folder">'+ic('folder')+'Открыть созданные шрифты</button>':'','pin')+'</section>';
  }
  h+='<div class="sk-pins">';
  pins.forEach(f=>{h+=cardHTML(f,{own,pin:true,i:0,n:1});});
  if(own)for(let i=pins.length;i<PF.MAXPIN;i++){
    h+=!pins.length&&i===0?'<button class="sk-slot pf-own" type="button" data-sk="slot">'+ic('pin')+'<b>Закрепите лучшие работы</b><span>Они встанут первыми в вашем профиле</span></button>'
      :'<button class="sk-slot pf-own" type="button" data-sk="slot" aria-label="Свободное место: закрепить работу">'+ic('plus')+'</button>';
  }
  return h+'</div></section>';
}
function worksHTML(ws,own){
  if(!ws.length)return '';
  return '<section class="sk-sect'+(ORD?' sk-ordmode':'')+'" aria-labelledby="sk-hw"><div class="vhead"><h2 id="sk-hw">Работы</h2>'+
    (own&&ws.length>1?'<button class="chip sk-chip pf-own" type="button" data-sk="ord" aria-pressed="'+ORD+'">'+ic(ORD?'check':'move')+(ORD?'Готово':'Изменить порядок')+'</button>':'')+'</div>'+
    '<div class="sk-works" id="sk-works">'+ws.map((f,i)=>cardHTML(f,{own,i,n:ws.length})).join('')+'</div></section>';
}
function collHTML(c,own){
  const ids=c.fonts.filter(f=>FONTS[f]),id=esc(c.id),nm=esc(c.name);
  const cards=ids.map(fid=>{
    const w=byFid(fid),mine=!!w,t=w?w.name:FONTS[fid].name,l=mine?licOf(fid):'';
    return '<button class="spc" type="button" role="listitem" data-sk="openf" data-fid="'+esc(fid)+'"><canvas class="spcv" data-fid="'+esc(fid)+'" data-t="'+esc(t)+'" aria-hidden="true"></canvas><b>'+esc(t)+'</b><span class="m">'+(mine?'<span class="own70">Мой шрифт</span>'+(l?licBadge(l):''):'<span>Из библиотеки</span>')+'</span></button>';
  }).join('');
  const add=own?'<button class="spc add pf-own" type="button" role="listitem" data-sk="addto" data-c="'+id+'">'+ic('plus')+'<b>Добавить шрифт</b></button>':'';
  const head='<div class="pb-h"><div class="pb-t"><h3 id="skc-'+id+'">'+nm+'</h3>'+(c.desc?'<p>'+esc(c.desc)+'</p>':'')+'</div>'+
    '<div class="vact"><button class="arr pb-prev" type="button" aria-label="Назад">'+ic('chev-left')+'</button><button class="arr pb-next" type="button" aria-label="Вперёд">'+ic('chev-right')+'</button>'+
    (own?'<button class="vlink pf-own" type="button" data-sk="editc" data-c="'+id+'">Изменить'+ic('pen2')+'</button><button class="ibtn sm sk-del pf-own" type="button" data-sk="delc" data-c="'+id+'" aria-label="Удалить подборку «'+nm+'»" title="Удалить подборку">'+ic('trash')+'</button>':'')+'</div></div>';
  if(own&&CFM===c.id)return '<section class="pband confirm" data-c="'+id+'" aria-labelledby="skc-'+id+'"><div class="pf-cfm" role="alertdialog" aria-label="Удалить подборку «'+nm+'»?"><div class="pf-cfh">'+ic('alert')+'<b id="skc-'+id+'">Удалить подборку «'+nm+'»?</b></div><p>Шрифты останутся на месте, исчезнет только подборка. Отменить нельзя.</p><div class="pf-cfb"><button class="btn sm" type="button" data-sk="delno">Отмена</button><button class="btn sm danger solid" type="button" data-sk="delok" data-c="'+id+'">Удалить</button></div></div></section>';
  return '<section class="pband" data-c="'+id+'" aria-labelledby="skc-'+id+'">'+head+'<div class="pb-row" role="list">'+cards+add+'</div></section>';
}
function collsHTML(own){
  const cs=M().colls;
  if(!cs.length&&!own)return '';
  return '<section class="sk-sect" aria-labelledby="sk-hc"><div class="vhead"><h2 id="sk-hc">Подборки</h2>'+(own&&cs.length?'<button class="chip sk-chip pf-own" type="button" data-sk="newc">'+ic('plus')+'Новая подборка</button>':'')+'</div>'+
    (cs.length?'<div class="sk-bands">'+cs.map(c=>collHTML(c,own)).join('')+'</div>':
      emptyBlock(ic('folder')+'Подборок пока нет','Соберите шрифты под проект, настроение или клиента: свои и чужие в одной ленте. Подборка появится в профиле.','<button class="btn pri lg" type="button" data-sk="newc">'+ic('plus')+'Создать подборку</button>','shelf'))+'</section>';
}
const inner=(p,own)=>{const ws=works(p);return pinsHTML(ws,own,p)+worksHTML(ws,own)+collsHTML(own);};
PF.sections=(p,own)=>'<div class="sk-host">'+inner(p,own)+'</div>';
function paintBands(root){
  $A('.pband',root).forEach(b=>{const row=$1('.pb-row',b),pv=$1('.pb-prev',b),nx=$1('.pb-next',b);if(!row||b._w)return;b._w=1;
    const upd=()=>{pv.disabled=row.scrollLeft<=2;nx.disabled=row.scrollLeft+row.clientWidth>=row.scrollWidth-2;};
    const by=d=>row.scrollBy({left:d*Math.max(240,row.clientWidth*.8),behavior:mo().off()?'auto':'smooth'});
    pv.addEventListener('click',()=>by(-1));nx.addEventListener('click',()=>by(1));row.addEventListener('scroll',upd,{passive:true});requestAnimationFrame(upd);});
}
PF.paintExtra=root=>{
  $A('canvas.spcv',root).forEach(cv=>paintText(cv,cv.dataset.fid,cv.dataset.t,{cap:.34}));
  $A('canvas.pf-namecv',root).forEach(cv=>paintText(cv,cv.dataset.fid,cv.dataset.t,{left:true,cap:.62,pad:0}));
  paintBands(root);
};
function refresh(focus){
  const v=$1('#view-profile'),host=v&&$1('.sk-host',v);if(!host)return;
  const own=!PF.guest;host.innerHTML=inner(PF.snapshot(own),own);PF.paint(host);
  if(focus){const t=$1(focus,host);if(t)t.focus({preventScroll:true});}
}
function movePin(k){
  const w=works().find(x=>x.key===k);
  if(M().pins.indexOf(k)>=0){PF.togglePin(k);toast('Откреплено');}
  else if(M().pins.length>=PF.MAXPIN){toast('Все четыре места заняты. Сначала открепите одну работу');return;}
  else if(PF.togglePin(k))toast('Закреплено: '+(w?w.name:''));
  refresh('[data-sk=pin][data-k="'+k+'"]');
}
function reorder(k,to,focus){
  const ks=works().map(w=>w.key),i=ks.indexOf(k);if(i<0)return;
  to=Math.max(0,Math.min(ks.length-1,to));if(to===i)return;
  ks.splice(i,1);ks.splice(to,0,k);M().order=ks;save();
  const box=$1('#sk-works'),after=()=>{refresh();if(focus){const t=$1('[data-sk='+focus+'][data-k="'+k+'"]:not([disabled])')||$1('[data-sk='+(focus==='left'?'right':'left')+'][data-k="'+k+'"]');if(t)t.focus({preventScroll:true});}};
  if(box&&window.MO&&MO.flipList)MO.flipList(box,after,{key:c=>c.dataset&&c.dataset.card});else after();
  const w=works().find(x=>x.key===k);say('«'+(w?w.name:'')+'»: теперь '+(to+1)+'-я из '+ks.length);
}
/* перетаскивание за ручку: pointer events (мышь и касание); карточка идёт за пальцем, место показывает рамка */
function dragStart(e,grip){
  const v=$1('#view-profile'),box=$1('#sk-works'),card=grip.closest('.sk-card');if(!box||!card)return;
  e.preventDefault();
  const vr=v.getBoundingClientRect(),cards=$A('.sk-card',box),from=cards.indexOf(card);
  const rects=cards.map(c=>{const r=c.getBoundingClientRect();return {l:r.left,r:r.right,t:r.top-vr.top+v.scrollTop,b:r.bottom-vr.top+v.scrollTop};});
  const st={k:card.dataset.k,card,cards,from,to:from,x0:e.clientX,y0:e.clientY,s0:v.scrollTop,cx:e.clientX,cy:e.clientY,raf:0};
  try{grip.setPointerCapture(e.pointerId);}catch(x){}
  card.classList.add('drag');
  const place=()=>{
    const dy=st.cy-st.y0+(v.scrollTop-st.s0);
    card.style.transform='translate('+(st.cx-st.x0)+'px,'+dy+'px)';
    const px=st.cx,py=st.cy-vr.top+v.scrollTop;let to=st.to;
    rects.forEach((r,i)=>{if(px>=r.l&&px<=r.r&&py>=r.t&&py<=r.b)to=i;});
    if(to!==st.to){st.to=to;cards.forEach((c,i)=>c.classList.toggle('over',i===to&&i!==from));}
  };
  const tick=()=>{
    const y=st.cy-vr.top,h=vr.height,z=56;
    if(y<z)v.scrollTop-=Math.ceil((z-y)/4);else if(y>h-z)v.scrollTop+=Math.ceil((y-(h-z))/4);
    place();st.raf=requestAnimationFrame(tick);
  };
  const move=ev=>{st.cx=ev.clientX;st.cy=ev.clientY;place();};
  const end=ev=>{
    grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);
    cancelAnimationFrame(st.raf);card.classList.remove('drag');card.style.transform='';cards.forEach(c=>c.classList.remove('over'));
    if(ev.type==='pointerup'&&st.to!==st.from)reorder(st.k,st.to,null);
  };
  grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  st.raf=requestAnimationFrame(tick);
}
function profileClicks(){
  const v=$1('#view-profile');if(!v)return;
  v.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-sk=grip]');if(g&&e.button===0)dragStart(e,g);});
  v.addEventListener('click',e=>{
    const a=e.target.closest('[data-sk]');if(!a||a.dataset.sk==='grip')return;
    const t=a.dataset.sk,k=a.dataset.k;
    if(t==='pin')movePin(k);
    else if(t==='share')PORT.share({kind:'font',fid:a.dataset.fid});
    else if(t==='ord'){ORD=!ORD;refresh('[data-sk=ord]');}
    else if(t==='left'||t==='right')reorder(k,works().map(w=>w.key).indexOf(k)+(t==='left'?-1:1),t);
    else if(t==='slot'){const b=$1('#sk-works [data-sk=pin][aria-pressed=false]',v);if(b){b.scrollIntoView({block:'center',behavior:mo().off()?'auto':'smooth'});b.focus({preventScroll:true});}toast('Нажмите булавку на карточке работы, чтобы закрепить её');}
    else if(t==='newc')openCollDialog();
    else if(t==='editc')openCollDialog({id:a.dataset.c});
    else if(t==='addto')openPicker(a.dataset.c);
    else if(t==='delc'){CFM=a.dataset.c;refresh('[data-sk=delno]');}
    else if(t==='delno'){const c=CFM;CFM='';refresh('[data-sk=delc][data-c="'+c+'"]');}
    else if(t==='delok'){const c=M().colls.find(x=>x.id===a.dataset.c);CFM='';M().colls=M().colls.filter(x=>x.id!==a.dataset.c);save();refresh();toast('Подборка удалена'+(c?': «'+c.name+'»':''));}
    else if(t==='openf'){if(FONTS[a.dataset.fid]&&typeof libOpen==='function'){PF.guestOff(true);libOpen(a.dataset.fid);}}
  });
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&CFM&&!PF.layers.length&&$1('.pband.confirm')){e.preventDefault();e.stopImmediatePropagation();const c=CFM;CFM='';refresh('[data-sk=delc][data-c="'+c+'"]');}},true);
}

/* ---------- ящик «Редактировать профиль»: шрифт имени, цвет, лицензия по умолчанию (применяются по «Сохранить») ---------- */
function nameTiles(){
  const own=works().map(w=>w.fid),lib=['kvadra','stroka','codex','liniya','ustav'].filter(f=>FONTS[f]&&own.indexOf(f)<0);
  return [''].concat(own.slice(0,4)).concat(lib).slice(0,6);
}
PORT.drawerHTML=w=>{
  const nm=authorName()||'Ваше имя';
  const tiles=nameTiles().map(fid=>{
    const on=(w.nameFont||'')===fid,lab=fid?nameOf(fid):'Onest',def=fid?'':' · основной';
    return '<button class="sk-ft" type="button" role="radio" aria-checked="'+on+'" data-nf="'+esc(fid)+'" aria-label="'+esc(lab)+(fid?'':' (по умолчанию)')+'">'+
      (fid?'<canvas data-fid="'+esc(fid)+'" data-t="'+esc(nm)+'" aria-hidden="true"></canvas>':'<span class="on70" aria-hidden="true">'+esc(nm)+'</span>')+'<small>'+esc(lab+def)+'</small></button>';
  }).join('');
  const sw=ACC.map((a,i)=>'<button type="button" role="radio" aria-checked="'+(w.acc===i+1)+'" data-ac="'+(i+1)+'" aria-label="'+a[0]+'"><i style="background:var(--'+a[1]+')">'+ic('check')+'</i>'+a[0]+'</button>').join('');
  return '<div class="sk-grp"><h3>Оформление профиля</h3>'+
    '<div class="pf-fld"><div class="lb" id="sk-nf-l">Шрифт имени</div><div class="sk-fonts" role="radiogroup" aria-labelledby="sk-nf-l">'+tiles+'</div><div class="hint">Так имя выглядит в шапке профиля и на карточке «Поделиться». Свои шрифты стоят первыми.</div></div>'+
    '<div class="pf-fld"><div class="lb" id="sk-ac-l">Цвет профиля</div><div class="sk-sw" role="radiogroup" aria-labelledby="sk-ac-l">'+sw+'</div><div class="hint">Окрашивает шапку и чипы. Цвет ошибок остаётся прежним.</div></div></div>'+
    '<div class="sk-grp"><h3>Лицензия по умолчанию</h3><div class="pf-fld"><div class="xpv-lic"><div class="pick" role="radiogroup" aria-label="Лицензия по умолчанию">'+licRadios('data-dl',w.defLic)+'</div></div><div class="hint">Подходит для ваших шрифтов. У каждого шрифта её можно сменить перед скачиванием. Текст лицензии и ссылка записываются в файл.</div></div></div>';
};
PORT.drawerPaint=el=>$A('.sk-ft canvas',el).forEach(cv=>paintText(cv,cv.dataset.fid,cv.dataset.t,{left:true,cap:.46,pad:0}));
PORT.drawerBind=(el,w,upd)=>{
  const set=(sel,attr,val)=>$A(sel,el).forEach(b=>b.setAttribute('aria-checked',String(b.dataset[attr]===String(val))));
  el.addEventListener('click',e=>{
    const nf=e.target.closest('[data-nf]'),ac=e.target.closest('[data-ac]'),dl=e.target.closest('[data-dl]');
    if(nf){w.nameFont=nf.dataset.nf;set('[data-nf]','nf',w.nameFont);}
    else if(ac){w.acc=+ac.dataset.ac;set('[data-ac]','ac',w.acc);}
    else if(dl){w.defLic=dl.dataset.dl;set('[data-dl]','dl',w.defLic);}
    else return;
    upd();
  });
  el.addEventListener('keydown',e=>{
    const g=e.target.closest&&e.target.closest('[role=radiogroup]');if(!g||!/^Arrow/.test(e.key))return;
    const it=$A('[role=radio]',g),i=it.indexOf(document.activeElement);if(i<0)return;
    e.preventDefault();const n=it[(i+(/Right|Down/.test(e.key)?1:-1)+it.length)%it.length];n.focus();n.click();
  });
};

/* =====================================================================
   Подборки: меню «⋯» на карточке шрифта, диалог, выбор шрифтов
   ===================================================================== */
let MENU=null;
const fontsWord=n=>n+' '+plural(n,'шрифт','шрифта','шрифтов');
function menuClose(){if(MENU){MENU.el.remove();if(MENU.btn)MENU.btn.setAttribute('aria-expanded','false');MENU=null;}}
function menuPlace(m,btn){
  const r=btn.getBoundingClientRect(),W=Math.min(300,innerWidth-24);
  if(phone()){m.style.left='var(--pad)';m.style.right='var(--pad)';m.style.top='auto';m.style.bottom='calc(var(--pad) + 76px)';m.style.width='auto';return;}
  let x=r.right-W;const y=r.bottom+6;x=Math.max(12,Math.min(x,innerWidth-W-12));
  m.style.left=x+'px';m.style.top=y+'px';
  const h=m.offsetHeight;if(y+h>innerHeight-12)m.style.top=Math.max(12,r.top-h-6)+'px';
}
const collsOf=fid=>M().colls.filter(c=>c.fonts.indexOf(fid)>=0);
function mainMenu(m,fid){
  const fav=typeof FAVS!=='undefined'&&FAVS.has(fid),n=collsOf(fid).length;
  m.innerHTML='<button type="button" role="menuitem" data-m="coll" class="nxt">'+ic('folder')+'В подборку'+(n?'<span class="cn">'+esc(collsOf(fid).map(c=>c.name).join(', '))+'</span>':'')+ic('chev-right')+'</button>'+
    '<button type="button" role="menuitem" data-m="fav">'+ic('heart')+(fav?'Убрать из избранного':'В избранное')+'</button>'+
    '<button type="button" role="menuitem" data-m="share">'+ic('share')+'Поделиться</button><hr class="divider"><button type="button" role="menuitem" data-m="open">'+ic('edit')+'Открыть в редакторе</button>';
}
function collMenu(m,fid){
  m.innerHTML='<div class="mh70"><button class="ibtn sm" type="button" data-m="back" aria-label="Назад">'+ic('chev-left')+'</button>В подборку<span>'+esc(nameOf(fid))+'</span></div>'+
    M().colls.map(c=>'<button type="button" role="menuitemcheckbox" aria-checked="'+(c.fonts.indexOf(fid)>=0)+'" data-m="tog" data-c="'+esc(c.id)+'"><span class="nm">'+esc(c.name)+'</span><span class="ck">'+ic('check')+'</span></button>').join('')+
    (M().colls.length?'<hr class="divider">':'')+'<button type="button" role="menuitem" data-m="new" class="mk">'+ic('plus')+'Новая подборка</button>';
}
PORT.cardMenu=function(btn,fid){
  if(MENU&&MENU.btn===btn){menuClose();return;}
  menuClose();
  const m=document.createElement('div');m.className='menu menu70 pop';m.setAttribute('role','menu');m.setAttribute('aria-label','Действия с «'+nameOf(fid)+'»');
  document.body.appendChild(m);MENU={el:m,btn,fid,t:Date.now()};btn.setAttribute('aria-expanded','true');
  mainMenu(m,fid);menuPlace(m,btn);
  const f0=$1('button',m);if(f0)f0.focus({preventScroll:true});
  m.addEventListener('click',e=>{
    const b=e.target.closest('[data-m]');if(!b)return;e.stopPropagation();const a=b.dataset.m;
    if(a==='coll'){collMenu(m,fid);menuPlace(m,btn);const x=$1('button:not(.ibtn)',m);if(x)x.focus();}
    else if(a==='back'){mainMenu(m,fid);const x=$1('button',m);if(x)x.focus();}
    else if(a==='tog'){const c=M().colls.find(x=>x.id===b.dataset.c);if(!c)return;const i=c.fonts.indexOf(fid);
      if(i>=0){c.fonts.splice(i,1);toast('Убрано из подборки «'+c.name+'»');}else{c.fonts.push(fid);toast('Добавлено в подборку «'+c.name+'»');}
      save();b.setAttribute('aria-checked',String(i<0));refresh();}
    else if(a==='new'){menuClose();openCollDialog({addFid:fid});}
    else if(a==='fav'){if(typeof favSet==='function'){const on=!FAVS.has(fid);favSet(fid,on);toast(on?'Добавлено в избранное':'Убрано из избранного');}menuClose();}
    else if(a==='share'){menuClose();PORT.share({kind:'font',fid});}
    else if(a==='open'){menuClose();if(typeof libOpen==='function')libOpen(fid);}
  });
  m.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();menuClose();btn.focus();return;}
    const it=$A('button',m),i=it.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus();}
    else if(e.key==='Tab')menuClose();
  });
};
document.addEventListener('click',e=>{if(MENU&&!e.target.closest('.menu70'))menuClose();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&MENU){menuClose();}},true);
window.addEventListener('scroll',e=>{if(MENU&&Date.now()-MENU.t>400&&!(e.target.closest&&e.target.closest('.menu70')))menuClose();},true);

function openCollDialog(o){
  o=o||{};
  const ed=o.id?M().colls.find(c=>c.id===o.id):null,add=o.addFid&&FONTS[o.addFid]?o.addFid:null;
  const L=PF.modal('<div class="mh"><h2>'+(ed?'Изменить подборку':'Новая подборка')+'</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<div class="pf-fld"><label for="sk-cn">Название</label><input id="sk-cn" class="inp" maxlength="40" autocomplete="off" placeholder="Например, «Для афиш»" value="'+esc(ed?ed.name:'')+'" aria-describedby="sk-cerr"><div class="pf-nc" id="sk-cerr" aria-live="polite"></div></div>'+
    '<div class="pf-fld"><label for="sk-cd">Короткое описание</label><textarea id="sk-cd" class="inp" maxlength="90" placeholder="Чем объединены шрифты">'+esc(ed?ed.desc:'')+'</textarea></div>'+
    (add?'<div class="pre">'+ic('check')+'<span>Шрифт «'+esc(nameOf(add))+'» добавится сразу</span></div>':'')+
    '<div class="bt"><button class="btn" type="button" data-x>Отмена</button><button class="btn pri" type="button" id="sk-ok" disabled>'+(ed?'Сохранить':'Создать подборку')+'</button></div>',
    {label:ed?'Изменить подборку':'Новая подборка',cls:'dlg70',focus:'#sk-cn'});
  const dlg=L.el,n=$1('#sk-cn',dlg),d=$1('#sk-cd',dlg),ok=$1('#sk-ok',dlg);
  const er=$1('#sk-cerr',dlg);
  /* FX80 F3 (A19): одинаковое имя (без учёта регистра) не принимается, предел 40 знаков виден */
  const dup=()=>{const v=n.value.trim().toLowerCase();return !!v&&M().colls.some(c=>c.id!==(ed&&ed.id)&&String(c.name).trim().toLowerCase()===v);};
  const upd=()=>{const d=dup(),k=n.value.length;er.textContent=d?'Подборка с таким названием уже есть':(k>=32?(k>=40?'40/40 — предел':k+'/40'):'');er.classList.toggle('max',d||k>=40);er.classList.toggle('warn',!d&&k>=32&&k<40);n.setAttribute('aria-invalid',d?'true':'false');ok.disabled=!n.value.trim()||d;};
  n.addEventListener('input',upd);d.addEventListener('input',upd);upd();
  n.addEventListener('keydown',e=>{if(e.key==='Enter'&&!ok.disabled){e.preventDefault();ok.click();}});
  ok.addEventListener('click',()=>{
    const name=n.value.trim();if(!name||dup())return;
    if(ed){ed.name=name;ed.desc=d.value.trim();toast(stSay('Подборка сохранена','Подборка изменена, но после закрытия вкладки пропадёт'));}
    else{M().colls.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name,desc:d.value.trim(),fonts:add?[add]:[]});toast('Подборка «'+name+'» создана'+stSay('',', но после закрытия вкладки пропадёт'));}
    save();L.close();refresh();
  });
}
/* «Добавить шрифт»: список библиотеки с галочками */
function openPicker(cid){
  const c=M().colls.find(x=>x.id===cid);if(!c)return;
  const ids=Object.keys(FONTS).filter(f=>f!=='imp'||(typeof impHasInk==='function'&&impHasInk()));
  const L=PF.modal('<div class="mh"><h2>Добавить шрифт</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div><p class="lead">Подборка «'+esc(c.name)+'». Отметьте шрифты, они появятся в ней сразу.</p>'+
    '<div class="sk-pick" role="group" aria-label="Шрифты библиотеки">'+ids.map(f=>'<button type="button" class="sk-pk" role="checkbox" aria-checked="'+(c.fonts.indexOf(f)>=0)+'" data-f="'+esc(f)+'"><canvas data-fid="'+esc(f)+'" aria-hidden="true"></canvas><b>'+esc(nameOf(f))+'</b><span class="ck">'+ic('check')+'</span></button>').join('')+'</div>'+
    '<div class="bt"><button class="btn pri" type="button" data-x>Готово</button></div>',{label:'Добавить шрифт',cls:'dlg70',focus:'.sk-pk'});
  const dlg=L.el;
  $A('.sk-pk canvas',dlg).forEach(cv=>paintText(cv,cv.dataset.fid,nameOf(cv.dataset.fid),{left:true,cap:.5,pad:0}));
  dlg.addEventListener('click',e=>{
    const b=e.target.closest('.sk-pk');if(!b)return;const f=b.dataset.f,i=c.fonts.indexOf(f);
    if(i>=0)c.fonts.splice(i,1);else c.fonts.push(f);
    save();b.setAttribute('aria-checked',String(i<0));refresh();
  });
  L.onClose=()=>refresh();
}

/* =====================================================================
   подключение
   ===================================================================== */
PF.port=PORT;
function boot(){
  try{ltInit();}catch(e){console.error(e);}
  try{profileClicks();}catch(e){console.error(e);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
