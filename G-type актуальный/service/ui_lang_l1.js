/* ===== Языки и паспорт шрифта: интерфейс =====
   Данные — core_lang_l1.js (языки, покрытие), core_meta_l1.js (паспорт). Здесь только подключение к оболочке обёртками:
   — фильтр «Поддержка языков» в библиотеке (теги lang-ru … в общем словаре LIB_TAGS, группа lang);
   — блок «Языки» во всплывающей карточке шрифта (вместо надписи «Базовый/Расширенный») и во всплывающем окне «Проект» в редакторе;
   — «Языки вашего набора» и «что нарисовать дальше» на экранах «Собрать из своих знаков» и «Отрисуй свой шрифт»;
   — пункт «О шрифте» в меню «Скачать»: паспорт (классификация, вес и ширина, PANOSE по-русски, языки, число знаков). */
/* ---------- словарь тегов: группа lang ---------- */
const LG_EN={ru:'russian',uk:'ukrainian украина',be:'belarusian беларусь',bg:'bulgarian болгария',sr:'serbian сербия',mk:'macedonian македония',kk:'kazakh казахстан',tt:'tatar татарстан',ba:'bashkir башкортостан',ky:'kyrgyz киргизия кыргызский',mn:'mongolian монголия',
  en:'english',de:'german deutsch германия',fr:'french франция',es:'spanish испания',it:'italian италия',pt:'portuguese португалия',nl:'dutch голландский',pl:'polish польша',cs:'czech чехия',sk:'slovak словакия',hu:'hungarian венгрия',ro:'romanian румыния',tr:'turkish турция',
  hr:'croatian serbian bosnian хорватия босняцкий',sl:'slovenian словения',lt:'lithuanian литва',lv:'latvian латвия',et:'estonian эстония',fi:'finnish финляндия',sv:'swedish швеция',nb:'norwegian норвегия',da:'danish дания',is:'icelandic исландия',az:'azerbaijani азербайджан',uz:'uzbek узбекистан'};
TAG_GROUPS.push('lang');
LANG_DB.forEach(L=>LIB_TAGS.push([langTagId(L.id),L.name,'volt',(LG_EN[L.id]||''),'lang']));
const lgIsLangTag=k=>typeof k==='string'&&k.startsWith('lang-');
const lgEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lgFull=cov=>cov.filter(r=>r.status==='full');
const lgNear=(cov,n)=>cov.filter(r=>r.status==='almost').sort((a,b)=>a.cost-b.cost).slice(0,n);
const lgMiss=r=>'не хватает '+langMissText(r);

/* ---------- стили ---------- */
(function(){const st=document.createElement('style');st.id='lg-css';st.textContent=`
.langf{display:flex;flex-direction:column;gap:12px;flex:none;min-width:0}
.lf-btn{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;min-height:44px;padding:0 16px;border:0;border-radius:var(--r-pill);background:var(--card);color:var(--ink);font:600 var(--fs-base) var(--f-ui);cursor:pointer;transition:background var(--dur-fast)}
.lf-btn:hover{background:var(--card-2)}
.lf-btn:focus-visible,.lf-chip:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
.lf-btn .ico{width:18px;height:18px;transition:transform var(--dur-fast)}
.lf-btn[aria-expanded=true] .ico{transform:rotate(180deg)}
.lf-n{min-width:22px;height:22px;padding:0 6px;border-radius:var(--r-pill);background:var(--accent);color:var(--on-accent);font:700 var(--fs-sm)/22px var(--f-ui);text-align:center}
.lf-n[hidden]{display:none}
.lf-panel{display:grid;gap:14px;padding:16px;border-radius:var(--r);background:var(--card)}
.lf-panel[hidden]{display:none}
.lf-g h4{margin:0 0 8px;font:600 var(--fs-sm) var(--f-ui);color:var(--muted)}
.lf-chips{display:flex;flex-wrap:wrap;gap:6px}
.lf-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1.5px solid transparent;border-radius:var(--r-pill);background:var(--paper);color:var(--ink);font:500 13.5px var(--f-ui);cursor:pointer;transition:background var(--dur-fast),border-color var(--dur-fast)}
.lf-chip:hover{background:var(--panel)}
.lf-chip[aria-pressed=true]{border-color:var(--accent);background:var(--accent-soft)}
.lf-chip em{font-style:normal;color:var(--muted);font-variant-numeric:tabular-nums}
.lf-chip.zero{opacity:.55}.lf-chip:disabled{cursor:default}
.lf-hint{margin:0;color:var(--muted);font-size:var(--fs-md)}
.hc-lang{display:grid;gap:8px}
.hl-h{display:flex;justify-content:space-between;align-items:baseline;font-size:var(--fs-sm);color:var(--muted)}
.hl-h b{font:700 var(--fs-md) var(--f-ui);color:var(--ink)}
.hl-chips{display:flex;flex-wrap:wrap;gap:6px}
.hl-chips .tag.more{background:none;box-shadow:inset 0 0 0 1.5px var(--line)}
.hl-near{margin:0;font-size:var(--fs-sm);line-height:1.4;color:var(--muted)}
.hl-near b{color:var(--ink);font-weight:600}
.pj-lang{display:grid;gap:6px;font-size:var(--fs-md)}
.pj-lang b{font-weight:700}
.pj-lang p{margin:0;color:var(--muted);line-height:1.4}
body.tab-lib .pj-lang,body.tab-lib .pj-langh{display:none}
.lg-set{display:grid;gap:8px;padding:14px 16px;border-radius:var(--r);background:var(--card);font-size:var(--fs-base);flex:none;min-width:0}
.lg-set h3{margin:0;font:700 var(--fs-base) var(--f-ui)}
.lg-set p{margin:0;line-height:1.45}
.lg-set .mut{color:var(--muted)}
.lg-set .lg-next{display:grid;gap:4px}
.lg-set .lg-next b{font-weight:700}
.lg-set .lg-ltr{font-weight:700;letter-spacing:.06em}
.lg-set .lf-chips{gap:4px}
.lg-set .lg-pill{display:inline-block;padding:4px 10px;border-radius:var(--r-pill);background:var(--paper);font-size:var(--fs-sm);font-weight:600}
#lg-draw{margin:0}
.ab-wrap{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.4)}
.ab-wrap[hidden]{display:none}
.ab-card{width:min(640px,100%);max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;padding:22px;border-radius:var(--r);background:var(--paper);color:var(--ink);display:grid;gap:16px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.ab-card::-webkit-scrollbar{display:none}
.ab-h{display:flex;align-items:center;gap:12px}
.ab-h h2{margin:0;font:800 var(--fs-xl)/1.1 var(--f-ui);letter-spacing:-.02em;flex:1}
.ab-x{width:44px;height:44px;border:0;border-radius:50%;background:var(--card);color:var(--ink);display:grid;place-items:center;cursor:pointer}
.ab-x:hover{background:var(--card-2)}
.ab-x .ico{width:20px;height:20px}
.ab-sub{margin:0;color:var(--muted);font-size:var(--fs-base)}
.ab-seg{display:inline-flex;gap:4px;padding:4px;border-radius:var(--r-pill);background:var(--card);justify-self:start}
.ab-seg button{min-height:36px;padding:0 16px;border:0;border-radius:var(--r-pill);background:none;color:var(--ink);font:600 13.5px var(--f-ui);cursor:pointer}
.ab-seg button[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.ab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0}
.ab-grid>div{padding:12px 14px;border-radius:var(--r-sm);background:var(--card);display:grid;gap:3px;align-content:start}
.ab-grid dt{font-size:var(--fs-sm);color:var(--muted)}
.ab-grid dd{margin:0;font-weight:600;font-size:var(--fs-base);line-height:1.35}
.ab-sec h3{margin:0 0 8px;font:700 var(--fs-base) var(--f-ui)}
.ab-pan{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0;font-size:13.5px}
.ab-pan dt{color:var(--muted)}
.ab-pan dd{margin:0;font-weight:600}
.ab-digits{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.ab-digits span{min-width:34px;padding:7px 8px;border-radius:var(--r-sm);background:var(--card);font:700 var(--fs-base) var(--f-ui);text-align:center;font-variant-numeric:tabular-nums}
.ab-note{margin:0;color:var(--muted);font-size:var(--fs-sm);line-height:1.45}
.xmenu button.lg-about{border-top:1px solid var(--line);border-radius:0 0 12px 12px;margin-top:4px;padding-top:12px}
@media (max-width:560px){.ab-card{padding:16px}.ab-grid{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(st);})();

/* ---------- фильтр «Поддержка языков» в библиотеке ---------- */
function lgFacetBuild(){
  if(document.getElementById('lang-facet'))return;
  const tiles=document.getElementById('lib-tags');if(!tiles||!tiles.parentNode)return;
  const box=document.createElement('div');box.className='langf';box.id='lang-facet';
  box.innerHTML='<button type="button" class="lf-btn" id="lf-btn" aria-expanded="false" aria-controls="lf-panel" title="Показать шрифты, в которых есть все буквы, знаки препинания и кавычки выбранного языка">Поддержка языков<span class="lf-n" id="lf-n" hidden>0</span><i class="ico i-chev-down" aria-hidden="true"></i></button>'
    +'<div class="lf-panel" id="lf-panel" role="group" aria-label="Поддержка языков" hidden></div>';
  const vctl=document.querySelector('#view-library .vhead .vctl'),vt=document.getElementById('lib-view');/* HM: кнопка в строке «Все шрифты», слева от переключателя вида */
  if(vctl)vctl.insertBefore(box,vt&&vt.parentNode===vctl?vt:vctl.firstChild);else tiles.parentNode.insertBefore(box,tiles.nextSibling);
  const panel=box.querySelector('#lf-panel');
  [['cyr','Кириллица'],['lat','Латиница']].forEach(([sc,title])=>{
    const g=document.createElement('div');g.className='lf-g';g.innerHTML='<h4>'+title+'</h4><div class="lf-chips"></div>';
    const chips=g.querySelector('.lf-chips');
    LANG_DB.filter(L=>L.sc===sc).forEach(L=>{
      const b=document.createElement('button');b.type='button';b.className='lf-chip';b.dataset.tag=langTagId(L.id);b.setAttribute('aria-pressed','false');
      b.title='Шрифты с полной поддержкой: '+L.name+' (все буквы, знаки препинания, кавычки)';
      b.innerHTML='<span>'+lgEsc(L.name)+'</span><em></em>';
      b.addEventListener('click',()=>{const k=b.dataset.tag;LQ.tags=LQ.tags.includes(k)?LQ.tags.filter(x=>x!==k):LQ.tags.concat(k);libRenderLibrary();requestAnimationFrame(drawLibrary);});
      chips.appendChild(b);});
    panel.appendChild(g);});
  const hint=document.createElement('p');hint.className='lf-hint';hint.textContent='Язык считается поддержанным, если в шрифте есть все его буквы (прописные и строчные), знаки препинания и кавычки. Выберите несколько языков, чтобы найти шрифт, который покрывает все сразу.';
  panel.appendChild(hint);
  const btn=box.querySelector('#lf-btn');
  const setOpen=on=>{panel.hidden=!on;btn.setAttribute('aria-expanded',on?'true':'false');if(on)setTimeout(()=>panel.scrollIntoView({block:'nearest',behavior:'smooth'}),0);};
  btn.addEventListener('click',()=>setOpen(panel.hidden));
  document.addEventListener('mousedown',e=>{if(!panel.hidden&&!box.contains(e.target))setOpen(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);btn.focus();}});
}
function lgFacetSync(){
  lgFacetBuild();
  const panel=document.getElementById('lf-panel');if(!panel)return;
  const ids=libIds(),tagSets=ids.map(id=>new Set(langTagIds(id)));
  panel.querySelectorAll('.lf-chip').forEach(b=>{
    const k=b.dataset.tag,n=tagSets.filter(s=>s.has(k)).length;
    b.querySelector('em').textContent=n;b.classList.toggle('zero',!n);
    b.setAttribute('aria-pressed',LQ.tags.includes(k)?'true':'false');
    b.disabled=!n&&!LQ.tags.includes(k);/* FX80 F3 (A13): язык без шрифтов не выбирается (если уже выбран — можно снять) */
    b.setAttribute('aria-label',b.querySelector('span').textContent+', шрифтов: '+n);});
  const sel=LQ.tags.filter(lgIsLangTag).length,bd=document.getElementById('lf-n');
  if(bd){bd.hidden=!sel;bd.textContent=sel;}
  /* выбран язык — панель остаётся видимой, чтобы его можно было снять */
}
(function(){const f=libRenderLibrary;libRenderLibrary=function(){const r=f.apply(this,arguments);try{lgFacetSync();}catch(e){console.error(e);}return r;};})();
/* теги-языки в общем списке тегов шрифта (для фильтра, чипов и подсказок поиска) */
document.addEventListener('DOMContentLoaded',()=>{try{lgFacetSync();}catch(e){}});

/* ---------- всплывающая карточка шрифта ---------- */
function lgChipsInto(box,rows,max){
  box.textContent='';
  rows.forEach((r,i)=>{
    const b=document.createElement('button');b.type='button';b.className='tag';b.dataset.tag=langTagId(r.id);b.textContent=r.name;
    b.title='Показать все шрифты с поддержкой языка: '+r.name;if(max&&i>=max)b.hidden=true;
    b.addEventListener('click',()=>libTagGo(b.dataset.tag));box.appendChild(b);});
  if(max&&rows.length>max){
    const m=document.createElement('button');m.type='button';m.className='tag more';m.textContent='ещё '+(rows.length-max);m.setAttribute('aria-expanded','false');
    m.title='Показать все языки';
    m.addEventListener('click',()=>{const on=m.getAttribute('aria-expanded')!=='true';
      [...box.querySelectorAll('.tag:not(.more)')].forEach((t,i)=>{if(i>=max){t.hidden=!on;}});
      m.setAttribute('aria-expanded',on?'true':'false');m.textContent=on?'свернуть':'ещё '+(rows.length-max);
      if(typeof hcPlace==='function')hcPlace();});
    box.appendChild(m);}
}
function lgHcFill(id){
  const e=HC.el;if(!e)return;
  const dl=e.querySelector('.hc-m');
  [...dl.children].forEach(d=>{if(d.firstChild&&d.firstChild.textContent==='Набор')d.remove();});
  let b=e.querySelector('.hc-lang');
  if(!b){b=document.createElement('div');b.className='hc-lang';b.innerHTML='<div class="hl-h"><span>Языки</span><b></b></div><div class="hl-chips"></div><p class="hl-near" hidden></p>';dl.parentNode.insertBefore(b,dl.nextSibling);}
  const cov=langCover(id),full=lgFull(cov),near=lgNear(cov,2);
  {const nb=b.querySelector('.hl-h b'),nt=full.length+' из '+cov.length;window.MO&&MO.num?MO.num(nb,nt):nb.textContent=nt;}
  b.querySelector('.hl-h').title='Поддержано языков: все буквы, знаки препинания и кавычки';
  lgChipsInto(b.querySelector('.hl-chips'),full,6);
  const p=b.querySelector('.hl-near');
  p.hidden=!near.length;
  p.innerHTML=near.map(r=>'<b>'+lgEsc(r.name)+'</b>: '+lgEsc(lgMiss(r))).join('<br>');
  if(!full.length){b.querySelector('.hl-chips').textContent='Полных нет';}
}
(function(){const f=hcFill;hcFill=function(id){const r=f.apply(this,arguments);try{lgHcFill(id);}catch(e){console.error(e);}return r;};})();

/* ---------- окно «Проект» в редакторе ---------- */
function lgProjSync(){
  const pp=document.getElementById('projpop');if(!pp)return;
  let b=document.getElementById('pj-lang');
  if(!b){
    const sub=pp.querySelector('#pj-sub-cp')||[...pp.querySelectorAll('.sub')][0];
    const h=document.createElement('div');h.className='sub pj-langh';h.textContent='Языки';
    b=document.createElement('div');b.className='pj-lang';b.id='pj-lang';
    (sub?sub.parentNode:pp).insertBefore(h,sub||null);h.parentNode.insertBefore(b,sub||null);
  }
  const id=S.fontId,cov=langCover(id),full=lgFull(cov),near=lgNear(cov,2);
  b.innerHTML='<p><b>'+full.length+' из '+cov.length+'</b> языков поддержано полностью</p>'
    +paneHTML('pj-lang-which','Список языков','<p>'+(full.map(r=>lgEsc(r.name)).join(', ')||'Пока ни один')+'</p>',{cls:'flat'})
    +(near.length?'<p>Почти: '+near.map(r=>lgEsc(r.name)+' — '+lgEsc(lgMiss(r))).join('; ')+'</p>':'');
  paneInit(b.querySelector('.pane'),'pj-lang-which',false);
}
document.addEventListener('DOMContentLoaded',()=>{
  const st=document.getElementById('settings');
  if(st)st.addEventListener('click',()=>{try{lgProjSync();}catch(e){console.error(e);}},true);
});

/* ---------- блок «Языки вашего набора» (импорт и рисование) ---------- */
function lgSetBlock(box,set,empty,compact){
  box.textContent='';
  const h=document.createElement('h3');h.textContent='Языки вашего набора';box.appendChild(h);
  if(!set.size){const p=document.createElement('p');p.className='mut';p.textContent=empty;box.appendChild(p);return;}
  const cov=langCover(null,set),full=lgFull(cov);
  const pills=full.map(r=>'<span class="lg-pill">'+lgEsc(r.name)+'</span>').join(' ');
  const p=document.createElement('p');
  if(compact){
    p.innerHTML=full.length?'Покрыто полностью: <b>'+full.length+'</b> из '+cov.length+'.':'Пока ни один язык не покрыт полностью.';
    box.appendChild(p);
    if(full.length){const dt=paneEl('lg-which','Список языков','<p>'+pills+'</p>',{cls:'flat'});box.appendChild(dt);paneInit(dt,'lg-which',false);}
  }else{
    p.innerHTML=full.length?'Покрыто полностью: <b>'+full.length+'</b> из '+cov.length+'. '+pills:'Пока ни один язык не покрыт полностью: нужны все буквы алфавита, знаки препинания и кавычки.';
    box.appendChild(p);
  }
  const nx=langNext(null,set,3);
  if(nx.length){
    const d=document.createElement('div');d.className='lg-next';
    const first=nx[0];
    d.innerHTML='<p><b>Следующий язык — '+lgEsc(first.name)+'.</b> Нарисуйте: <span class="lg-ltr">'+lgEsc(langMissText(first))+'</span></p>'
      +(nx.length>1?'<p class="mut">Дальше: '+nx.slice(1).map(r=>lgEsc(r.name)+' ('+lgEsc(lgMiss(r))+')').join('; ')+'</p>':'');
    box.appendChild(d);}
}
/* знаки, которые окажутся в шрифте пользователя: свои + собранные автоматически */
function lgImpSet(){
  const s=new Set();
  try{
    if(typeof IMP!=='undefined'&&IMP.glyphs)for(const ch of Object.keys(IMP.glyphs)){const g=IMP.glyphs[ch];if(g&&g.c&&g.c.length&&Array.from(ch).length===1)s.add(ch);}
    if(FONTS.imp&&FONTS.imp.CHARSET)FONTS.imp.CHARSET.forEach(c=>{if(c.trim())s.add(c);});
  }catch(e){}
  return s;
}
function lgImpSync(){
  const v=document.getElementById('view-imp');if(!v)return;
  let b=document.getElementById('imp-lang');
  if(!b){b=document.createElement('section');b.className='lg-set';b.id='imp-lang';b.setAttribute('aria-label','Языки вашего набора');
    const bar=v.querySelector('.imp-bar');(bar&&bar.parentNode?bar.parentNode:v).insertBefore(b,bar?bar.nextSibling:null);}
  lgSetBlock(b,lgImpSet(),'Загрузите знаки: здесь появятся языки, которые покрывает ваш набор, и подсказка, что добавить дальше.');
}
(function(){
  if(typeof iuRender==='function'){const f=iuRender;iuRender=function(){const r=f.apply(this,arguments);try{lgImpSync();}catch(e){console.error(e);}return r;};}
  if(typeof iuRegisterNow==='function'){const g=iuRegisterNow;iuRegisterNow=function(){const r=g.apply(this,arguments);try{lgImpSync();}catch(e){}return r;};}
})();
/* нарисованные знаки: GT_DRAW.saved() если есть, иначе сохранённое состояние мастерской */
function lgDrawSet(){
  const s=new Set();
  try{
    const D=window.GT_DRAW;
    if(D&&typeof D.saved==='function'){D.saved().forEach(c=>s.add(c));return s;}
    const o=JSON.parse(localStorage.getItem('gtype-draw-n7')||'null');
    if(o&&o.g)for(const ch of Object.keys(o.g)){const r=o.g[ch];if(r&&r.s&&r.c)s.add(ch);}
  }catch(e){}
  return s;
}
let LG_DRAW_T=0;
function lgDrawSync(){
  const side=document.getElementById('dr-side');if(!side)return;
  let b=document.getElementById('lg-draw');
  if(!b){b=document.createElement('section');b.className='lg-set';b.id='lg-draw';b.setAttribute('aria-label','Языки вашего набора');side.insertBefore(b,side.firstChild);}
  lgSetBlock(b,lgDrawSet(),'Сохраните первые знаки: здесь появятся языки, которые покрывает набор, и подсказка, что рисовать дальше.',true);
}
document.addEventListener('DOMContentLoaded',()=>{
  /* мастерская монтируется при первом входе; следим за счётчиком «n из m» и за появлением панели */
  const root=document.getElementById('view-draw');if(!root)return;
  const mo=new MutationObserver(()=>{clearTimeout(LG_DRAW_T);LG_DRAW_T=setTimeout(()=>{try{lgDrawSync();}catch(e){}},900);});
  mo.observe(root,{childList:true,subtree:true,characterData:true});
});

/* ---------- «О шрифте» ---------- */
const LG_ST={regular:'Прямой',italic:'Италик'};
let LG_AB={style:'regular'};
function lgAboutBuild(){
  let w=document.getElementById('about-font');if(w)return w;
  w=document.createElement('div');w.className='ab-wrap';w.id='about-font';w.hidden=true;
  w.innerHTML='<div class="ab-card" role="dialog" aria-modal="true" aria-labelledby="ab-ttl"><div class="ab-h"><h2 id="ab-ttl">О шрифте</h2>'
    +'<button type="button" class="ab-x" id="ab-x" aria-label="Закрыть" title="Закрыть"><i class="ico i-close"></i></button></div><div id="ab-body" style="display:grid;gap:16px"></div></div>';
  document.body.appendChild(w);
  w.addEventListener('click',e=>{if(e.target===w)lgAboutClose();});
  w.querySelector('#ab-x').addEventListener('click',lgAboutClose);
  w.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();lgAboutClose();}});
  return w;
}
function lgAboutClose(){const w=document.getElementById('about-font');if(!w||w.hidden)return;w.hidden=true;const b=document.getElementById('ex-menu');if(b)b.focus();}
function lgAboutFill(){
  const body=document.getElementById('ab-body');if(!body)return;
  const key=LG_AB.style;
  const w=weightOf(S.styles.regular.p);
  let m;
  try{m=metaPassport(S,key,{weight:w.weight,weightName:w.name});}catch(err){console.error(err);body.textContent='Не удалось собрать паспорт. Закройте окно и откройте его снова.';return;}
  const fm=fmeta(S.fontId),tags=fm.tags.map(k=>tagById(k)[1]);
  const full=lgFull(m.lang),near=lgNear(m.lang,3);
  const dd=(k,v)=>'<div><dt>'+k+'</dt><dd>'+v+'</dd></div>';
  const unicodeNames=m.blocks.join(', ');
  body.innerHTML=
    '<p class="ab-sub">'+lgEsc(S.family||fm.name)+' · '+lgEsc(m.wName)+' · '+LG_ST[key]+'</p>'
    +'<div class="ab-seg" role="group" aria-label="Начертание">'+['regular','italic'].filter(k=>S.styles[k]).map(k=>'<button type="button" data-st="'+k+'" aria-pressed="'+(k===key)+'" title="Показать паспорт этого начертания">'+LG_ST[k]+'</button>').join('')+'</div>'
    +'<dl class="ab-grid">'
      +dd('Классификация',lgEsc(tags.join(' · ')||'—')+(m.classText?'<br><span style="color:var(--muted);font-weight:500">класс IBM: '+lgEsc(m.classText)+'</span>':''))
      +dd('Насыщенность',m.weightClass+' · '+lgEsc(m.weightWord))
      +dd('Ширина',m.widthClass+' · '+lgEsc(m.widthName))
      +dd('Знаков в наборе',String(m.glyphCount))
      +dd('Высота строчных',m.heights.x+' ед.')
      +dd('Высота прописных',m.heights.cap+' ед.')
    +'</dl>'
    +'<section class="ab-sec"><h3>PANOSE</h3><div class="ab-digits" aria-label="Десять цифр PANOSE">'+m.panose.map(d=>'<span>'+d+'</span>').join('')+'</div>'
      +'<dl class="ab-pan">'+m.panoseText.map(r=>'<dt>'+lgEsc(r.k)+'</dt><dd>'+lgEsc(r.v)+'</dd>').join('')+'</dl>'
      +'<p class="ab-note" style="margin-top:8px">PANOSE считается по размерам знаков: насыщенность — по толщине ствола к высоте прописных, пропорции — по ширине Н, контраст — по отношению горизонтали к стволу. Поэтому она может отличаться от класса веса в названии начертания.</p></section>'
    +'<section class="ab-sec"><h3>Языки: '+full.length+' из '+m.lang.length+'</h3>'
      +'<div class="lf-chips">'+(full.map(r=>'<span class="lg-pill" style="background:var(--card)">'+lgEsc(r.name)+'</span>').join('')||'<span class="ab-note">Пока ни один язык не покрыт полностью.</span>')+'</div>'
      +(near.length?'<p class="ab-note" style="margin-top:8px">Почти: '+near.map(r=>'<b>'+lgEsc(r.name)+'</b> — '+lgEsc(lgMiss(r))).join('; ')+'</p>':'')+'</section>'
    +'<section class="ab-sec"><h3>Кодировки</h3><p class="ab-note" style="color:var(--ink)">Блоки Unicode: '+lgEsc(unicodeNames||'—')+'.<br>Кодовые страницы: '+lgEsc(m.codePages.join(', ')||'ни одна не покрыта полностью')+'.</p></section>'
    +'<p class="ab-note">Эти данные записываются в файл при скачивании (таблицы OS/2, name, gasp). Подсказок для сглаживания на экране (хинтинга) в файле нет: за сглаживание отвечает таблица gasp.</p>';
  body.querySelectorAll('.ab-seg button').forEach(b=>b.addEventListener('click',()=>{LG_AB.style=b.dataset.st;lgAboutFill();const n=body.querySelector('.ab-seg button[aria-pressed=true]');if(n)n.focus();}));
}
function lgAboutOpen(){
  const w=lgAboutBuild();
  LG_AB.style=S.styles[S.style]?S.style:'regular';
  lgAboutFill();w.hidden=false;
  const x=w.querySelector('#ab-x');if(x)x.focus();
}
document.addEventListener('DOMContentLoaded',()=>{
  const m=document.getElementById('ex-list');
  if(m&&!m.querySelector('[data-x=about]')){
    const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.dataset.x='about';b.className='lg-about';b.textContent='О шрифте';
    b.title='Паспорт шрифта: классификация, вес и ширина, PANOSE, языки';
    m.appendChild(b);}
  if(typeof EX_RUN!=='undefined')EX_RUN.about=()=>{lgAboutOpen();};
});
