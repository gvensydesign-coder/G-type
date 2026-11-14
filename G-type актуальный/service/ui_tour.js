/* ===== ONBOARDING m44 (ui_tour.js): coachmark tours + single contextual hints + «?» card wiring =====
   Docs: DESIGN_SYSTEM.md §9. CSS: block «ONBOARDING m44» in template.html, tokens --tour-scrim / --tour-w / --z-tour.
   API (window.TOUR):
     TOUR.run(id,{force})        start a tour (queued while another tour / menu / modal / drawer is open); force = replay, also navigates to the section
     TOUR.hint(id,anchor,opts)   one-step contextual coachmark: ring + card, one button «Понятно», never blocks; first time only
     TOUR.reset()                forget every tour and hint (storage key = HINT_KEY of ui_d.js)
     TOUR.seen(id)               true when the tour / hint was already shown
   Storage: the existing hint set (HINT_KEY, ui_d.js: hintSeen / hintMark). Tours are stored as «tour:<id>», hints under their own id
   (so «slide», «point», … already seen by old users stay seen). «tour:welcome:skip» = the welcome tour was left early (red dot on «?»),
   «help:dot» = the dot was acknowledged. Legacy flag gtype-tour-v1=1 (set by the e2e lanes) keeps every auto-start off.
   Automation: under WebDriver nothing starts by itself unless the URL has ?tour=1 (add ?motion=1 to see the motion). */
const TOUR=(function(){
  'use strict';
  const htmlEl=document.documentElement;
  let root=null;/* the #tour overlay (set in build) */
  const q=(s,r)=>(r||document).querySelector(s),qa=(s,r)=>Array.from((r||document).querySelectorAll(s));
  const rmq=window.matchMedia('(prefers-reduced-motion:reduce)'),phoneMq=window.matchMedia('(max-width:720px)');
  const cssv=n=>getComputedStyle(htmlEl).getPropertyValue(n).trim();
  function ms(n){const v=cssv(n);return !v?0:v.endsWith('ms')?parseFloat(v):v.endsWith('s')?parseFloat(v)*1000:(parseFloat(v)||0);}
  const D=k=>ms('--dur-'+k);
  const off=()=>htmlEl.classList.contains('nomo')||rmq.matches;
  const wait=t=>new Promise(r=>setTimeout(r,t));
  const raf=()=>new Promise(r=>requestAnimationFrame(r));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const phone=()=>phoneMq.matches;
  function bez(str){
    const m=/cubic-bezier\(([^)]+)\)/.exec(str||''),p=m?m[1].split(',').map(Number):[.4,0,.2,1];
    const cx=3*p[0],bx=3*(p[2]-p[0])-cx,ax=1-cx-bx,cy=3*p[1],by=3*(p[3]-p[1])-cy,ay=1-cy-by;
    const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t;
    return x=>{let lo=0,hi=1,t=x;for(let i=0;i<24;i++){const v=X(t);if(Math.abs(v-x)<1e-4)break;if(v<x)lo=t;else hi=t;t=(lo+hi)/2;}return Y(t);};
  }

  /* ---------- switches and storage ---------- */
  const FLAG='gtype-tour-v1';
  const forced=()=>/[?&]tour=1/.test(location.search);
  function enabled(){
    if(forced())return true;
    try{if(localStorage.getItem(FLAG)==='1')return false;}catch(e){}
    if(navigator.webdriver)return false;
    return true;
  }
  const mem=new Set();
  const seenId=id=>{try{return hintSeen(id);}catch(e){return mem.has(id);}};
  const markId=id=>{mem.add(id);try{hintMark(id);}catch(e){}};
  const seen=id=>seenId('tour:'+id)||seenId(id);

  /* ---------- geometry helpers ---------- */
  function visible(el){
    if(!el||!el.isConnected)return false;
    const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return false;
    if(el.closest('[inert],[hidden]'))return false;
    return true;
  }
  const isFixed=el=>{for(let e=el;e&&e!==document.body;e=e.parentElement){if(getComputedStyle(e).position==='fixed')return true;}return false;};
  function pick(sel){
    if(sel==null)return [];
    if(typeof sel==='function'){let v;try{v=sel();}catch(e){v=null;}return (Array.isArray(v)?v:[v]).filter(visible);}
    const list=Array.isArray(sel)?sel:[sel],out=[];
    for(const s of list){const el=qa(s).find(visible);if(el)out.push(el);}
    return out;
  }
  function unionRect(els){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const e of els){const r=e.getBoundingClientRect();x0=Math.min(x0,r.left);y0=Math.min(y0,r.top);x1=Math.max(x1,r.right);y1=Math.max(y1,r.bottom);}
    return {x:x0,y:y0,w:x1-x0,h:y1-y0};
  }
  function radiusOf(el){
    const cs=getComputedStyle(el),r=cs.borderTopLeftRadius||'0px',b=el.getBoundingClientRect();
    if(r.endsWith('%'))return parseFloat(r)*Math.min(b.width,b.height)/100;
    return parseFloat(r)||0;
  }
  /* cut-out: target + padding, radius = target radius + padding, kept inside the viewport */
  function cutOf(els,pad,virt){
    let r,rad;
    if(virt){r={x:virt.x,y:virt.y,w:virt.w,h:virt.h};rad=virt.r||12;}
    else{r=unionRect(els);rad=els.length===1?radiusOf(els[0]):16;}
    const x0=Math.max(r.x-pad,4),y0=Math.max(r.y-pad,4),x1=Math.min(r.x+r.w+pad,innerWidth-4),y1=Math.min(r.y+r.h+pad,innerHeight-4);
    const w=Math.max(8,x1-x0),h=Math.max(8,y1-y0);
    return {x:x0,y:y0,w,h,r:Math.min(rad+pad,w/2,h/2)};
  }
  const sig=c=>[c.x,c.y,c.w,c.h].map(v=>Math.round(v*2)/2).join(',');
  /* wait until a measured value stays the same for N frames (animations of the trigger end), max ms */
  async function settle(get,max,frames){
    const t0=performance.now();let last='',n=0;frames=frames||3;
    for(;;){
      let s;try{s=get();}catch(e){s='';}
      if(s&&s===last){if(++n>=frames)return true;}else{n=0;last=s;}
      if(performance.now()-t0>max)return false;
      await raf();
    }
  }

  /* ---------- DOM ---------- */
  let dom=null;
  function build(){
    if(dom)return dom;
    const r=document.createElement('div');r.className='tour';r.id='tour';r.hidden=true;
    r.innerHTML='<svg class="tour-scrim" aria-hidden="true" focusable="false"><path d=""></path></svg><div class="tour-ring" aria-hidden="true"></div>'
      +'<div class="tour-card" id="tour-card" tabindex="-1" data-side="none"><span class="tour-arrow" aria-hidden="true"></span>'
      +'<div class="tour-lab"></div><h3 class="tour-t" id="tour-t"></h3><p class="tour-d" id="tour-d"></p>'
      +'<div class="tour-foot"><div class="tour-prog"><span class="tour-dots"></span><span class="tour-n"></span></div>'
      +'<div class="tour-btns"><button type="button" class="tour-skip">Пропустить</button><span class="sp"></span>'
      +'<button type="button" class="btn ghost sm tour-back">Назад</button><button type="button" class="btn pri sm tour-next">Далее</button></div></div></div>'
      +'<div class="tour-live" role="status" aria-live="polite"></div>';
    document.body.appendChild(r);root=r;
    dom={r,svg:q('.tour-scrim',r),path:q('.tour-scrim path',r),ring:q('.tour-ring',r),card:q('.tour-card',r),
      lab:q('.tour-lab',r),t:q('.tour-t',r),d:q('.tour-d',r),dots:q('.tour-dots',r),n:q('.tour-n',r),prog:q('.tour-prog',r),
      skip:q('.tour-skip',r),back:q('.tour-back',r),next:q('.tour-next',r),live:q('.tour-live',r)};
    dom.next.addEventListener('click',()=>onNext());
    dom.back.addEventListener('click',()=>onBack());
    dom.skip.addEventListener('click',()=>finish('skip'));
    return dom;
  }

  /* ---------- spotlight (one SVG overlay, rounded cut-out; FLIP-like tween between targets) ---------- */
  let cur=null,tw=0;
  function draw(c){
    const d=build(),W=innerWidth,H=innerHeight,{x,y,w,h}=c,r=Math.max(0,Math.min(c.r,w/2,h/2));
    d.svg.setAttribute('viewBox','0 0 '+W+' '+H);
    d.path.setAttribute('d','M0 0H'+W+'V'+H+'H0Z M'+(x+r)+' '+y+'H'+(x+w-r)+'A'+r+' '+r+' 0 0 1 '+(x+w)+' '+(y+r)+'V'+(y+h-r)+'A'+r+' '+r+' 0 0 1 '+(x+w-r)+' '+(y+h)+'H'+(x+r)+'A'+r+' '+r+' 0 0 1 '+x+' '+(y+h-r)+'V'+(y+r)+'A'+r+' '+r+' 0 0 1 '+(x+r)+' '+y+'Z');
    const s=d.ring.style;s.left=x+'px';s.top=y+'px';s.width=w+'px';s.height=h+'px';s.borderRadius=r+'px';
    cur=c;
  }
  function tweenTo(to,dur){
    cancelAnimationFrame(tw);
    if(!cur||off()||dur<=0){draw(to);return Promise.resolve();}
    const from=Object.assign({},cur),ease=bez(cssv('--ease-std')),t0=performance.now();
    return new Promise(res=>{
      const step=now=>{
        const p=Math.min(1,(now-t0)/dur),e=ease(p),k=['x','y','w','h','r'],o={};
        k.forEach(n=>{o[n]=from[n]+(to[n]-from[n])*e;});
        draw(o);
        if(p<1)tw=requestAnimationFrame(step);else{draw(to);res();}
      };
      tw=requestAnimationFrame(step);
    });
  }
  function pulse(){const r=build().ring;r.classList.remove('pulse');void r.offsetWidth;r.classList.add('pulse');}

  /* ---------- card placement ---------- */
  function barGap(){
    if(!phone())return 12;
    const rl=q('#rail');
    if(rl){const b=rl.getBoundingClientRect();if(b.width>0&&b.top>innerHeight/2)return Math.round(innerHeight-b.top+8);}
    return 12;
  }
  function place(cut,side0){
    const d=build(),c=d.card;
    if(phone()){c.dataset.side='sheet';c.style.removeProperty('left');c.style.removeProperty('top');c.style.setProperty('--tour-bar',barGap()+'px');return;}
    const vw=innerWidth,vh=innerHeight,M=12,G=14,w=c.offsetWidth,h=c.offsetHeight;
    const cx=cut.x+cut.w/2,cy=cut.y+cut.h/2;
    const cand={
      right:{x:cut.x+cut.w+G,y:clamp(cy-h/2,M,vh-h-M),ok:cut.x+cut.w+G+w<=vw-M},
      left:{x:cut.x-G-w,y:clamp(cy-h/2,M,vh-h-M),ok:cut.x-G-w>=M},
      bottom:{x:clamp(cx-w/2,M,vw-w-M),y:cut.y+cut.h+G,ok:cut.y+cut.h+G+h<=vh-M},
      top:{x:clamp(cx-w/2,M,vw-w-M),y:cut.y-G-h,ok:cut.y-G-h>=M}
    };
    let order=cut.y+cut.h<vh*.25?['bottom','right','left','top']:cut.y>vh*.75?['top','right','left','bottom']:cx<vw/2?['right','bottom','top','left']:['left','bottom','top','right'];
    if(side0&&cand[side0])order=[side0].concat(order.filter(s=>s!==side0));
    const s=order.find(k=>cand[k].ok);
    let x,y,side;
    if(s){x=cand[s].x;y=cand[s].y;side=s;}
    else{/* no side fits: the corner / edge / centre position that covers the least of the target */
      let best=null;
      for(const ix of [M,(vw-w)/2,vw-w-M])for(const iy of [M,(vh-h)/2,vh-h-M]){
        const ox=Math.max(0,Math.min(ix+w,cut.x+cut.w)-Math.max(ix,cut.x)),oy=Math.max(0,Math.min(iy+h,cut.y+cut.h)-Math.max(iy,cut.y));
        const ov=ox*oy,dist=Math.hypot(ix+w/2-cx,iy+h/2-cy);
        if(!best||ov<best.ov-1||(Math.abs(ov-best.ov)<=1&&dist>best.dist))best={ix,iy,ov,dist};
      }
      x=best.ix;y=best.iy;side='none';
    }
    c.dataset.side=side;c.style.left=Math.round(x)+'px';c.style.top=Math.round(y)+'px';
    if(side==='right'||side==='left')c.style.setProperty('--ay',Math.round(clamp(cy-y-4,24,h-40))+'px');
    if(side==='top'||side==='bottom')c.style.setProperty('--ax',Math.round(clamp(cx-x-8,24,w-40))+'px');
  }

  /* ---------- overlays that must not be covered by a tour ---------- */
  const isOpen=el=>!!el&&!el.hidden&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0;
  function layers(withDrawers){
    const out=[];
    const add=el=>{if(el&&isOpen(el))out.push(el);};
    add(q('#helpc'));add(q('#projpop'));add(q('#rail-more'));add(q('#ex-list'));add(q('#about-font'));add(q('#lf-panel'));
    qa('.xmenu,.menu.pop,.dr-m,.cu-modal,.pf-mw,.pf-drawer,.pf-scrim,.cm-modal,[role=dialog][aria-modal=true],[role=menu]').forEach(e=>{if(!e.closest('#tour'))add(e);});
    if(withDrawers)qa('.dw[data-open="1"]').forEach(add);
    return Array.from(new Set(out));
  }
  const blocked=()=>layers(true).length>0;

  /* ---------- context (which section is on screen) ---------- */
  function ctxNow(){
    const b=document.body;
    if(b.classList.contains('imp-open'))return 'import';
    if(b.classList.contains('ds-open'))return 'ds';
    return (typeof S!=='undefined'&&S.tab)||'home';
  }
  const toHome=()=>{if(ctxNow()!=='home'){const h=q('.rail [data-tab=home]');if(h)h.click();}};
  const openFont=()=>{if(ctxNow()==='edit')return;toHome();if(typeof libOpen==='function')libOpen((S&&S.fontId)||'volt');else setTab('edit');};
  const goTab=t=>()=>{if(ctxNow()===t)return;if(ctxNow()==='import'||ctxNow()==='draw'||ctxNow()==='profile'||ctxNow()==='folder')toHome();setTab(t);};

  /* ---------- tours ---------- */
  const T=(t,d,o)=>Object.assign({t,d},o||{});
  const drHas=()=>{const b=q('#dr-fontb');return !!b&&!b.disabled;};/* FX80 C05: есть ли сохранённый знак */
  const TOURS={
    welcome:{label:'Главная и навигация',ctx:'home',go:toHome,steps:[
      T('Добро пожаловать в G-type','Здесь шрифт не только выбирают, но и собирают: берёте готовый шрифт, меняете насыщенность, ширину и засечки и скачиваете файл.',{sel:['.hero .hx-h','.hero .hx-p'],lab:'Знакомство',pad:12,side:'bottom'}),
      T('Свой шрифт с нуля','«Собрать из своих знаков» превращает ваши SVG и картинки в шрифт. «Отрисовать свой шрифт» — рисуем буквы прямо на холсте.',{sel:'#createcards',lab:'Лаборатория',side:'top'}),
      T('Найдите шрифт','Введите название или слово, например «рубленый». Вся коллекция лежит в Библиотеке, любимое — в Избранном.',{sel:'#home-search',lab:'Поиск и библиотека',side:'bottom'}),
      T('Главная, Библиотека, Избранное','Разделы слева. Сердечко на карточке шрифта кладёт его в Избранное, чтобы вернуться позже.',{sel:'#rp-nav',lab:'Навигация',side:'right'}),
      T('Ваш профиль автора','Закреплённые работы, подборки, созданные шрифты, визитка и резервная копия. Красная точка на аватаре — профиль ещё не заполнен.',{sel:'#rail-profile',lab:'Профиль',side:'right'}),
      T('Тема и справка',()=>visible(q('#help'))?'Луна переключает тёмную тему. Знак вопроса открывает справку: любой тур можно пройти заново.':'Луна переключает тёмную тему. Справка и повтор туров — в «?» на рабочих экранах.',{sel:['#theme-btn','#help'],lab:'Тема и «?»',side:'right'})
    ]},
    editor:{label:'Редактор',ctx:'edit',go:openFont,steps:[
      T('Печатайте прямо в образце','Кликните и введите свой текст. Клик между двумя буквами открывает правку их пары, это кернинг.',{sel:'#specbox',lab:'Образец',side:'bottom'}),
      T('Прямой и Италик','У каждого шрифта два начертания, они настраиваются отдельно. Нажмите, чтобы переключить.',{sel:'#stylesw',lab:'Начертание',allowClick:true,side:'bottom'}),
      T('Редактор, Проверка, Кернинг','Редактор правит форму знаков. Проверка ищет ошибки в наборе, Кернинг подбирает расстояния между парами букв.',{sel:'#vtabs',lab:'Режимы',side:'bottom'}),
      T('Ползунки меняют весь шрифт','Насыщенность, ширина, контраст, засечки: двигаете ползунок, и все знаки перестраиваются сразу. Там же пресеты.',{sel:'#pcard',lab:'Настройки',lazy:true,side:'right',
        before:()=>{if(typeof dwOpen==='function'&&typeof dwSec==='function'&&dwSec('edit')!=='params'){TOUR._opened=true;dwOpen('edit','params');}else TOUR._opened=false;},
        after:()=>{if(TOUR._opened&&typeof dwClose==='function')dwClose('edit');TOUR._opened=false;}}),
      T('Правьте отдельный знак','Выберите знак справа и тяните точки на холсте. Кнопки снизу: Точки, Сетка, Скелет, Перо; линейка и точки включают направляющие и шаг привязки.',{sel:'.tools',lab:'Холст',side:'top'}),
      T('Скачайте результат','.ttf и .otf для установки, .woff2 для сайта, .zip со всеми весами, «Вариативный» с осями одним файлом, .png с образцом.',{sel:'#ex-menu',lab:'Скачать шрифт',side:'bottom'})
    ]},
    proof:{label:'Проверка',ctx:'proof',go:goTab('proof'),steps:[
      T('Что проверяет эта страница','G-type просматривает каждый знак: ошибки контура, выступы за метрики, странные боковые поля и двойники. Итог одной строкой сверху.',{sel:'#psum',lab:'Проверка',side:'bottom'}),
      T('Фильтры','Оставьте только латиницу, кириллицу, цифры или знаки. Галочка «Только с замечаниями» прячет всё, что в порядке.',{sel:()=>[q('.ptools .seg'),(q('#pbad')||{}).closest&&q('#pbad').closest('label')],lab:'Фильтры',side:'bottom'}),
      T('Метрики и Эталон','«Метрики» рисуют базовую линию, высоты и поля знака. «Эталон» накладывает контур обычного шрифта: видно, где ваш знак расходится с ним.',{sel:()=>['#pmet','#pref'].map(s=>(q(s)||{}).closest&&q(s).closest('label')),lab:'Слои',side:'bottom'}),
      T('Полнота набора','Каждая строка — свой алфавит, число справа показывает, сколько знаков уже есть. Зачёркнутые знаки в шрифте отсутствуют.',{sel:'#cover .cv',lab:'Полнота',side:'bottom'}),
      T('Список замечаний','Рамка и пункты под знаком называют проблему. Кнопка «Править» уводит прямо в редактор этого знака.',{sel:()=>{const bad=qa('#pgrid .pc.l1,#pgrid .pc.l2')[0];return bad||q('#pgrid .pc');},lab:'Знаки',side:'right'}),
      T('Таблица метрик','Ширина и боковые поля всех знаков списком: числа можно править прямо в ячейках.',{sel:'#mtbox',lab:'Метрики знаков',side:'top'})
    ]},
    kern:{label:'Кернинг',ctx:'kern',go:goTab('kern'),steps:[
      T('Выберите пару','Впишите две буквы или кликните между буквами в тексте ниже. Контекст H?H и n?n показывает пару среди соседей.',{sel:'#view-kern .kk-bar',lab:'Пара',side:'bottom'}),
      T('Тяните, чтобы поправить','Тяните знаки вправо и влево или нажимайте стрелки (Shift крупнее). Число под линией — текущий кернинг пары.',{sel:'#kk-big',lab:'Кернинг',side:'top'}),
      T('Точная правка','Кнопки −10, −1, +1, +10 сдвигают пару, «К авто» возвращает автоматическое значение. Правку можно оставить только этой паре или распространить на классы букв.',{sel:'#kk-ctl',lab:'Значение',side:'top'}),
      T('Проверьте в тексте','Печатайте свои слова: клик между буквами выбирает пару. В живом тексте сразу видно, стало лучше или нет.',{sel:'#kk-ctbox',lab:'В тексте',side:'top'}),
      T('Основные пары','Типичные трудные пары списком. Красная рамка — буквы сталкиваются, «Только с замечаниями» оставит только такие.',{sel:'#view-kern .ptools',lab:'Список пар',side:'top'})
    ]},
    profile:{label:'Профиль',ctx:'profile',go:()=>{toHome();const b=q('#rail-profile');if(b)b.click();},steps:[
      T('Редактировать профиль','Имя, фото, обложка, описание и ссылки. Так вас увидят посетители.',{sel:'.pf-head .pf-act .btn',lab:'Профиль',side:'left'}),
      T('Закреплённые','Закрепите до четырёх готовых шрифтов: они встанут первыми, остальные работы и подборки идут ниже. Гости видят именно это.',{sel:'.sk-pinsec',lab:'Закреплённые',side:'top'}),
      T('Созданные шрифты','Папка со всеми вашими шрифтами и черновиками. Готовые можно показывать в профиле и закреплять сверху.',{sel:'.pf-grid2 > :first-child',lab:'Папка',side:'top'}),
      T(()=>q('.pf-tools')?'Инструменты автора':'Заполните профиль',()=>q('.pf-tools')?'«Смотреть как гость» показывает профиль глазами посетителя, «Визитка автора» сохраняет PNG для соцсетей, «Резервная копия» кладёт всё в один файл .json.':'Четыре маленьких шага. После первого шрифта здесь появятся инструменты автора: вид гостя, визитка и резервная копия.',{sel:'.pf-tools,.pf-chk',lab:'Автору',side:'left'})
    ]},
    draw:{label:'Отрисовать свой шрифт',ctx:'draw',go:()=>{toHome();const b=q('#draw-card');if(b)b.click();},steps:[
      T('Что рисуем','Группы знаков: базовая кириллица, латиница, цифры и расширения. Выберите набор в списке: рядом видно, сколько знаков уже нарисовано.',{sel:'#dr-setb',lab:'Набор',side:'bottom'}),
      T('Список знаков','Выберите знак: на холсте появится бледная буква-подсказка. Нарисованные знаки отмечаются в списке.',{sel:'#dr-gwrap',lab:'Знаки',side:'left'}),
      T('Инструменты','Перо, фигуры, кисть, ластик и выбор. Клик ставит угол, перетаскивание — плавный узел, Enter заканчивает штрих.',{sel:'#dr-dock',lab:'Холст',side:'top'}),
      T('Завершите знак','Когда знак готов, нажмите «Готово». Кнопка оживает после первого штриха.',{sel:'#dr-sv',lab:'Знак',side:'bottom'}),
      T(()=>drHas()?'Проверьте и соберите':'Первый знак — и можно собирать',()=>drHas()?'Наверху «Проверить шрифт» показывает знаки в тексте, «Скачать шрифт» собирает файл. Он окажется в профиле, в «Созданных шрифтах».':'Пока нет ни одного сохранённого знака, поэтому «Проверить шрифт» и «Скачать шрифт» наверху неактивны. Завершите знак — и они включатся: первая покажет знаки в тексте, вторая соберёт файл.',{sel:()=>{if(!drHas())return q('#dr-sv');const b=[q('#dr-testb'),q('#dr-fontb')].filter(e=>e&&!e.hidden);return b.length?b:q('.dr-top');},lab:'Шрифт',side:'bottom'}),
      T('Сетка и конструкция','Сетка держит одинаковые высоты, «Конструкция» отвечает за размеры и поля, «Рекомендации» подсказывают, чего не хватает для языков.',{sel:'#rp-tools .rb[data-rt=grid]',lab:'Панели',side:'right'}),
      T('Интервалы и кернинг','Рассчитайте поля и кернинг по форме нарисованных букв: включите «Авто-интервалы» и «Авто-кернинг», посмотрите образец до и после, сила кернинга регулируется.',{sel:'#rp-tools .rb[data-rt=spk]',lab:'Панели',side:'right'})
    ]},
    import:{label:'Собрать из своих знаков',ctx:'import',go:()=>{toHome();const b=q('#imp-card');if(b)b.click();},steps:[
      T('Что собираем','Латиница или кириллица, базовый или расширенный набор. Для каждой буквы нужна своя картинка.',{sel:['#imp-sc','#imp-lv'],lab:'Набор',side:'bottom'}),
      T('Загрузите знаки','SVG, PNG, JPG или WEBP, можно целой папкой. Имя файла подскажет, к какой букве он относится.',{sel:'.imp-act',lab:'Файлы',side:'bottom'}),
      T('Ячейки знаков','Перетащите файл в нужную ячейку или кликните по ней. Счётчики групп показывают, сколько знаков уже на месте.',{sel:'#imp-lib .imp-grp',lab:'Знаки',side:'top'}),
      T('Параметры набора','Метрики, отступы, предпросмотр и языки набора лежат в панелях слева. Откройте любую из них.',{sel:'#rp-tools .rb[data-rt=opt]',lab:'Панели',side:'right'}),
      T('Скачайте шрифт','Когда знаки на местах, нажмите «Скачать шрифт»: он сразу появится в Созданных шрифтах профиля.',{sel:'#imp-build',lab:'Шрифт',side:'bottom'})
    ]}
  };
  const TOUR_ORDER=['welcome','editor','proof','kern','profile','draw','import'];
  const CTX_TOUR={home:'welcome',edit:'editor',proof:'proof',kern:'kern',profile:'profile',draw:'draw',import:'import'};

  /* ---------- contextual single coachmarks ---------- */
  const HT=id=>(typeof HINT_TXT!=='undefined'&&HINT_TXT[id])||'';
  const HINTS={
    slide:{t:'Ползунок меняет весь шрифт',d:()=>HT('slide'),side:'right'},
    point:{t:'Точки тянутся на холсте',d:()=>HT('point')},
    skel:{t:'Скелет штриха',d:()=>HT('skel'),side:'bottom'},
    draw:{t:'Рисование пером',d:()=>HT('draw'),side:'bottom'},
    pair:{t:'Кернинг пары',d:()=>HT('pair'),side:'bottom'},
    export:{t:'Какой формат выбрать',d:()=>HT('export'),side:'left'},
    kernpill:{near:()=>q('#specwrap'),t:'Кернинг этой пары',d:'«−» сближает буквы, «+» раздвигает (Shift — на 10). «К авто» отменит вашу правку, «Открыть» перейдёт на вкладку Кернинг.',side:'bottom'},
    axes:{t:'Оси вариативного шрифта',d:'Нажмите «Собрать оси»: ползунки покажут, как шрифт плавно меняется по насыщенности, ширине и наклону. Набор осей выбирают в меню «Скачать шрифт».',side:'bottom'},
    modes:{t:'Режимы образца',d:'Тестер, сравнение двух вариантов и декоративные начертания. Это только просмотр: сам шрифт они не меняют.',side:'bottom'},
    cmp:{t:'Сравнение',d:'«Запомнить как А», затем меняйте настройки: вторая строка покажет, что было раньше.',side:'bottom'},
    deco:{t:'Декоративные начертания',d:'Контур, тень, объём: выберите начертание, чтобы увидеть его на образце. В файл оно попадёт при скачивании.',side:'bottom'},
    uniwidth:{t:'Униширинные',d:'Все веса и италик получают одинаковую ширину знаков, как у Regular: текст не «прыгает» при смене насыщенности.',side:'left'},
    vfexp:{t:'Вариативный шрифт',d:'Сборка занимает до минуты: один файл заменяет все начертания, а оси выбираются в меню «Скачать шрифт».',side:'bottom'},
    pixres:{t:'Разрешение пиксельной сетки',d:'Правки хранятся отдельно для каждого разрешения. Если сменить его, прежние правки не пропадут — их можно перенести кнопкой.',side:'left'},
    pfvis:{t:'Видимость и меню шрифта',d:'«В профиле» показывает готовый шрифт гостям, «Скрыт» убирает. Меню «⋯»: переименовать, закрепить в профиле, удалить.',side:'top'},
    backup:{t:'Восстановление',d:'Выберите файл .json, сохранённый раньше. Перед заменой данных G-type спросит подтверждение.',side:'top'},
    avcrop:{t:'Кадрирование фото',d:'Тяните фото и меняйте масштаб: в круге то, что увидят другие. Маленькие кружки справа внизу показывают аватар в мелких размерах.',side:'top'}
  };

  /* ---------- state ---------- */
  let run=null,sg=null,seq=0,keyOn=false,tick=0,lastFocus=null;
  const Q=[],pending=new Set();
  let qTimer=0,lastCtx=null;

  /* ---------- keyboard ---------- */
  const inField=t=>t&&t.closest&&t.closest('input,textarea,select,[contenteditable=""],[contenteditable=true]')&&!(dom&&dom.card.contains(t));
  function onKey(e){
    if(!run&&!sg)return;
    const c=dom&&dom.card,k=e.key;
    if(sg&&!run){if(k==='Escape')hideSingle();return;}
    if(!run)return;
    if(k==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish('skip');return;}
    if(k==='Tab'){
      const f=[dom.back,dom.skip,dom.next].filter(b=>!b.hidden&&!b.disabled);
      if(!f.length)return;
      const i=f.indexOf(document.activeElement);
      if(!c.contains(document.activeElement)||(e.shiftKey&&i<=0)||(!e.shiftKey&&i===f.length-1)){e.preventDefault();(e.shiftKey?f[f.length-1]:f[0]).focus({preventScroll:true});}
      e.stopPropagation();return;
    }
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(inField(e.target)){return;}
    if(k==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();onNext();return;}
    if(k==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();onBack();return;}
    if(k==='Enter'){
      const b=e.target&&e.target.closest&&e.target.closest('#tour-card button');
      if(b&&b!==dom.next){e.stopPropagation();return;}/* Назад / Пропустить сработают сами */
      e.preventDefault();e.stopImmediatePropagation();onNext();return;
    }
    e.stopPropagation();/* app hotkeys do not fire under a tour */
  }
  window.addEventListener('keydown',onKey,true);
  document.addEventListener('focusin',e=>{
    if(!run||!dom||dom.card.contains(e.target)||(run.step&&run.step.allowClick&&run.target&&run.target.some(t=>t.contains(e.target))))return;
    if(e.target.closest&&e.target.closest('#tour'))return;
    try{dom.next.focus({preventScroll:true});}catch(x){}
  });
  /* single coachmark: a press anywhere else dismisses it (the press itself goes through) */
  document.addEventListener('pointerdown',e=>{if(sg&&!run&&dom&&!dom.card.contains(e.target))hideSingle();},true);

  /* ---------- tour flow ---------- */
  function sheetTop(){return innerHeight-barGap()-((dom&&dom.card.offsetHeight)||180)-14;}
  async function reveal(els,st){
    if(!els.length||els.every(isFixed))return;
    const el=els[0],lim=phone()?sheetTop():innerHeight-8;
    let r=unionRect(els);
    if(r.y>=8&&r.y+r.h<=lim&&r.x+r.w>0&&r.x<innerWidth)return;
    try{el.scrollIntoView({block:r.h>lim-8?'start':'center',inline:'nearest',behavior:off()?'auto':'smooth'});}catch(e){}
    await settle(()=>sig(unionRect(els)),1000,3);
    r=unionRect(els);
    if(phone()&&r.y+r.h>lim)window.scrollBy(0,r.y+r.h-lim+8);
    await settle(()=>sig(unionRect(els)),600,2);
  }
  function setText(R,st,i){
    const d=build(),n=R.steps.length;
    const v=x=>typeof x==='function'?x():x;
    d.lab.textContent=v(st.lab)||'';d.t.textContent=v(st.t)||'';d.d.textContent=v(st.d)||'';
    d.n.textContent=(i+1)+' из '+n;
    d.dots.innerHTML=R.steps.map((_,k)=>'<i'+(k<=i?' class="d"':'')+'></i>').join('');
    d.next.textContent=i===n-1?'Готово':'Далее';
    d.back.hidden=i===0;
    d.live.textContent='Шаг '+(i+1)+' из '+n+'. '+d.t.textContent+'. '+d.d.textContent;
  }
  async function go(i,dir){
    const R=run;if(!R)return;const tok=++R.tok,d=build();
    if(R.cur!=null&&R.cur!==i){const prev=R.steps[R.cur];if(prev&&prev.after){try{prev.after();}catch(e){}}}
    while(i>=0&&i<R.steps.length){
      const st=R.steps[i];
      if(st.when&&!st.when()){i+=dir;continue;}
      if(st.before){try{await st.before();}catch(e){}if(run!==R||tok!==R.tok)return;}
      let els=pick(st.sel);
      if(!els.length&&st.lazy){await settle(()=>pick(st.sel).length?'1':'',900,1);if(run!==R||tok!==R.tok)return;els=pick(st.sel);}
      if(!els.length){if(st.after){try{st.after();}catch(e){}}R.skipped++;i+=dir;continue;}
      /* hide the old card, measure the new one, make the target visible, wait for the layout to stop moving */
      d.card.classList.remove('on','up');
      R.cur=i;R.step=st;R.target=els;
      root.classList.toggle('clk',!!st.allowClick);
      setText(R,st,i);
      await reveal(els,st);if(run!==R||tok!==R.tok)return;
      await settle(()=>sig(unionRect(pick(st.sel).length?pick(st.sel):els)),900,3);if(run!==R||tok!==R.tok)return;
      els=pick(st.sel);if(!els.length){i+=dir;continue;}
      R.target=els;
      const cut=cutOf(els,st.pad||6);R.cut=cut;
      if(root.hidden||!root.classList.contains('on')){/* arrival: the scrim fades in, the cut-out is already at the target */
        draw(cut);root.hidden=false;root.classList.add('blk');
        await raf();if(run!==R||tok!==R.tok)return;
        root.classList.add('on');
      }
      const mv=tweenTo(cut,D('base'));
      await wait(off()?0:D('instant'));if(run!==R||tok!==R.tok)return;
      place(cut,st.side);
      if(phone()&&!els.every(isFixed)){/* the sheet must not cover the target: scroll the page up by the overlap */
        const top=d.card.getBoundingClientRect().top,ov=cut.y+cut.h-top+10;
        if(ov>0){window.scrollBy(0,ov);await settle(()=>sig(unionRect(els)),600,2);if(run!==R||tok!==R.tok)return;
          const c2=cutOf(pick(st.sel).length?pick(st.sel):els,st.pad||6);R.cut=c2;draw(c2);
          if(c2.y+c2.h>d.card.getBoundingClientRect().top-4&&c2.y>innerHeight/2)d.card.classList.add('up');}/* page cannot scroll: sheet goes to the top */
      }
      d.card.classList.add('on');
      if(R.first){R.first=false;try{d.next.focus({preventScroll:true});}catch(e){}}
      mv.then(()=>{if(run===R&&tok===R.tok)pulse();});
      return;
    }
    if(dir>0)finish('done');
    else if(R.cur!=null)go(R.cur,1);
  }
  const onNext=()=>{if(!run)return;if(run.cur>=run.steps.length-1)finish('done');else go(run.cur+1,1);};
  const onBack=()=>{if(!run||run.cur<=0)return;go(run.cur-1,-1);};

  function start(item){
    const def=TOURS[item.id];if(!def)return;
    hideSingle(true);
    let steps=def.steps.filter(s=>(!s.when||s.when())&&(s.lazy||pick(s.sel).length));
    if(!steps.length)return;
    build();
    lastFocus=document.activeElement;
    run={id:item.id,def,steps,cur:null,step:null,target:null,cut:null,tok:0,first:true,skipped:0,force:!!item.force};
    markId('tour:'+item.id);
    root.className='tour blk';dom.card.className='tour-card';dom.card.setAttribute('role','dialog');dom.card.setAttribute('aria-modal','true');
    dom.card.setAttribute('aria-labelledby','tour-t');dom.card.setAttribute('aria-describedby','tour-d');dom.card.removeAttribute('aria-live');
    dom.prog.hidden=false;dom.skip.hidden=false;dom.back.hidden=true;dom.next.hidden=false;
    root.hidden=true;cur=null;
    clearInterval(tick);tick=setInterval(remeasure,500);
    go(0,1);
  }
  function finish(reason){
    const R=run;if(!R)return;
    run=null;seq++;clearInterval(tick);cancelAnimationFrame(tw);
    const st=R.step;if(st&&st.after){try{st.after();}catch(e){}}
    const early=reason==='skip';
    if(early)markId('tour:'+R.id+':skip');else markId('tour:'+R.id+':done');/* FX80 F3 (A07): пропуск не считается прохождением */
    if(early&&R.id==='welcome'){markId('tour:welcome:skip');syncDot();}
    const d=dom;
    if(d){root.classList.remove('clk');root.classList.remove('on');d.card.classList.remove('on');
      const fin=()=>{if(!run&&!sg){root.hidden=true;root.className='tour';cur=null;}};
      if(off())fin();else setTimeout(fin,D('fast')+30);}
    if(lastFocus&&lastFocus.isConnected&&lastFocus.focus&&visible(lastFocus)){try{lastFocus.focus({preventScroll:true});}catch(e){}}
    lastFocus=null;
    setTimeout(pump,off()?30:D('fast')+80);
    try{window.dispatchEvent(new CustomEvent('tour:end',{detail:{id:R.id,reason}}));}catch(e){}
  }
  /* layout moved (resize, scroll, content changed): re-measure the target; a vanished target skips the step */
  let rmRaf=0;
  function remeasure(){
    if(rmRaf)return;
    rmRaf=requestAnimationFrame(()=>{
      rmRaf=0;
      if(run&&run.step&&run.cur!=null){
        const R=run,els=pick(R.step.sel);
        if(!els.length){if(R.cur<R.steps.length-1)go(R.cur+1,1);else finish('done');return;}
        R.target=els;const cut=cutOf(els,R.step.pad||6);
        if(cur&&sig(cut)!==sig(cur)){R.cut=cut;cancelAnimationFrame(tw);draw(cut);if(dom.card.classList.contains('on'))place(cut,R.step.side);}
        else if(dom.card.classList.contains('on')&&phone())place(cut,R.step.side);
      }else if(sg){
        const a=resolveAnchor(sg.anchor);
        if(!a||(a.el&&!visible(a.el))){hideSingle();return;}
        const cut=cutOf(a.els,sg.pad,a.virt);if(!cur||sig(cut)!==sig(cur)){draw(cut);place(nearCut(sg,cut),sg.side);}
      }
    });
  }
  window.addEventListener('resize',remeasure);
  window.addEventListener('scroll',remeasure,true);
  window.addEventListener('orientationchange',remeasure);

  /* ---------- queue ---------- */
  function pump(){
    clearTimeout(qTimer);qTimer=0;
    while(Q.length){
      const it=Q[0],def=TOURS[it.id];
      if(!def||Date.now()>it.exp||(!it.force&&(seen(it.id)||ctxNow()!==def.ctx||!enabled()))){Q.shift();continue;}
      if(run||blocked()){qTimer=setTimeout(pump,500);return;}
      Q.shift();start(it);return;
    }
  }
  function runTour(id,o){
    o=o||{};const def=TOURS[id];if(!def)return false;
    const force=!!o.force;
    if(!force&&(seen(id)||!enabled()))return false;
    if(Q.some(x=>x.id===id)||(run&&run.id===id))return true;
    const push=()=>{Q.push({id,force,exp:Date.now()+120000});pump();};
    if(force&&ctxNow()!==def.ctx){try{def.go&&def.go();}catch(e){}setTimeout(push,off()?120:D('slow')+250);return true;}
    push();return true;
  }

  /* ---------- single contextual coachmark ---------- */
  function resolveAnchor(a){
    if(typeof a==='function'){try{a=a();}catch(e){a=null;}}
    if(!a)return null;
    if(a.nodeType===1)return visible(a)?{el:a,els:[a]}:null;
    if(typeof a.x==='number')return {virt:a,els:[]};
    return null;
  }
  function hideSingle(instant){
    if(!sg)return;
    const d=dom;clearTimeout(sg.timer);const S0=sg;sg=null;clearInterval(tick);
    if(run)return;
    if(d){d.card.classList.remove('on');root.classList.remove('on');
      const fin=()=>{if(!run&&!sg){root.hidden=true;root.className='tour';cur=null;}};
      if(instant||off())fin();else setTimeout(fin,D('fast')+30);}
    S0.anchorEl=null;
  }
  function blockedForHint(a){
    const ls=layers(false);
    if(!ls.length)return false;
    const el=a.el||null;
    return ls.some(l=>!(el&&l.contains(el)));
  }
  function hint(id,anchor,o){
    o=o||{};const def=HINTS[id];
    if(!def||!enabled()||seen(id)||pending.has(id)||run)return false;
    if(!resolveAnchor(anchor))return false;
    pending.add(id);
    (async()=>{
      try{
        await wait(o.delay!=null?o.delay:(off()?0:D('fast')+60));
        let a=resolveAnchor(anchor);if(!a)return;
        await settle(()=>a.el?sig(unionRect([a.el])):sig(a.virt),900,3);
        a=resolveAnchor(anchor);
        if(!a||run||seen(id)||!enabled()||blockedForHint(a))return;
        showSingle(id,def,a,anchor,Object.assign({near:def.near},o));
      }finally{pending.delete(id);}
    })();
    return true;
  }
  function showSingle(id,def,a,anchor,o){
    if(sg)hideSingle(true);
    const d=build(),v=x=>typeof x==='function'?x():x;
    markId(id);
    root.className='tour one';
    d.card.className='tour-card';d.card.setAttribute('role','status');d.card.setAttribute('aria-live','polite');d.card.removeAttribute('aria-modal');d.card.removeAttribute('aria-labelledby');d.card.removeAttribute('aria-describedby');
    d.lab.textContent=v(def.lab)||'';d.t.textContent=v(def.t)||'';d.d.textContent=v(def.d)||'';
    d.prog.hidden=true;d.skip.hidden=true;d.back.hidden=true;d.next.hidden=false;d.next.textContent='Понятно';
    d.live.textContent='';
    const pad=o.pad!=null?o.pad:4,side=o.side||(o.inside?'bottom':def.side);
    const cut=cutOf(a.els,pad,a.virt);
    root.hidden=false;draw(cut);
    sg={id,anchor,pad,side,timer:0,near:o.near};
    requestAnimationFrame(()=>{
      if(!sg||sg.id!==id)return;
      root.classList.add('on');place(nearCut(sg,cut),side);d.card.classList.add('on');pulse();
    });
    const arm=ms0=>{clearTimeout(sg&&sg.timer);if(sg)sg.timer=setTimeout(hideSingle,ms0);};
    arm(9000);
    d.card.onmouseenter=()=>{if(sg)clearTimeout(sg.timer);};
    d.card.onmouseleave=()=>{if(sg)arm(3500);};
    clearInterval(tick);tick=setInterval(remeasure,500);
  }
  /* a hint may ask its card to sit next to another element (e.g. below the sample) so the ring target and the text stay visible */
  function nearCut(g,cut){const n=typeof g.near==='function'?g.near():g.near,e=n&&visible(n)?n:null;return e?cutOf([e],0):cut;}

  /* ---------- «?» card and the red dot ---------- */
  function syncDot(){
    const b=q('#help');if(!b)return;
    let dot=q('#help-dot');
    if(!dot){dot=document.createElement('i');dot.className='rb-dot';dot.id='help-dot';dot.setAttribute('aria-hidden','true');b.appendChild(dot);}
    dot.hidden=!(seenId('tour:welcome:skip')&&!seenId('help:dot'));
  }
  function renderList(){
    const box=q('#tour-list');if(!box)return;
    box.innerHTML=TOUR_ORDER.map(id=>'<button type="button" class="hlp-row" role="listitem" data-tour="'+id+'"><span>'+TOURS[id].label+'</span><span class="st">'+(seenId('tour:'+id+':skip')&&!seenId('tour:'+id+':done')?'Пропущено':seen(id)?'Пройдено':'Новое')+'</span><i class="ico" aria-hidden="true"></i></button>').join('');
  }
  function runCurrent(){
    const id=CTX_TOUR[ctxNow()]||'welcome';
    closeMenus();runTour(id,{force:true});
  }
  function closeMenus(){
    try{if(typeof helpToggle==='function')helpToggle(false);}catch(e){}
    try{if(typeof projShow==='function')projShow(false);}catch(e){}
  }
  function reset(){
    Q.length=0;pending.clear();mem.clear();
    if(run)finish('abort');
    hideSingle(true);
    try{hintMem=new Set();}catch(e){}
    try{localStorage.removeItem(HINT_KEY);}catch(e){}
    syncDot();renderList();
  }

  /* ---------- contextual triggers: first real interaction, never on load ---------- */
  function wireHints(){
    const stg=q('#stage');
    let armPt=null;
    if(stg)stg.addEventListener('pointermove',e=>{if(e.buttons&&typeof S!=='undefined'&&S.node)armPt={x:e.clientX,y:e.clientY};});
    window.addEventListener('pointerup',()=>{
      if(!armPt)return;const p=armPt;armPt=null;
      hint('point',{x:p.x-22,y:p.y-22,w:44,h:44,r:22});
    });
    document.addEventListener('change',e=>{const t=e.target;
      if(t&&t.type==='range'&&t.closest&&t.closest('.panel'))hint('slide',t);
      else if(t&&t.id==='vfx-uw'&&t.checked)hint('uniwidth',()=>t.closest('label')||t);
    },true);
    document.addEventListener('click',e=>{
      const t=e.target.closest&&e.target.closest('[data-mode=skel],[data-mode=draw]');
      if(t&&!t.disabled&&!t.hidden){if(t.dataset.mode==='draw'||(typeof skFont==='function'&&skFont()))hint(t.dataset.mode==='draw'?'draw':'skel',t);return;}
      const ex=e.target.closest&&e.target.closest('#ex-menu');
      if(ex){setTimeout(()=>{const m=q('#ex-list');if(m&&!m.hidden)hint('export',m,{delay:0});},30);return;}
      if(e.target.closest&&e.target.closest('[data-x=vf]')){hint('vfexp',()=>q('#ex-menu'),{delay:D('base')});return;}
      if(e.target.closest&&e.target.closest('#cmpb')){hint('cmp',()=>q('#cmpbar')||q('#cmpb'));return;}
      if(e.target.closest&&e.target.closest('#decob')){hint('deco',()=>q('#decobar')||q('#decob'));return;}
    },true);
    const spc=q('#spec');
    if(spc)spc.addEventListener('pointerdown',()=>hint('pair',spc,{inside:true}));
    const txt=q('#txt');if(txt)txt.addEventListener('input',()=>{markId('pair');hideSingle();});
    /* panes: first opening of «Оси» / «Режимы» */
    document.addEventListener('pane:toggle',e=>{
      const k=e.detail&&e.detail.key,open=e.detail&&e.detail.open;if(!open)return;
      if(k==='ed-axes')hint('axes',()=>q('#vfx-build'));
      else if(k==='ed-modes')hint('modes',()=>q('#ed-modes'));
    });
    /* pixel font: the resolution section appears */
    const px=q('#pxsec');
    if(px)new MutationObserver(()=>{if(!px.hidden&&ctxNow()==='edit')hint('pixres',()=>q('#pxbody'),{delay:D('open')});}).observe(px,{attributes:true,attributeFilter:['hidden','open']});
    /* profile dialogs (фото, резервная копия) */
    new MutationObserver(ms1=>{
      for(const m of ms1)for(const n of m.addedNodes){
        if(n.nodeType!==1||!n.classList)continue;
        if(n.classList.contains('pf-mw')){
          const h=q('.mh h2',n),tx=h?h.textContent.trim():'';
          if(tx==='Резервная копия')hint('backup',()=>q('[data-restore]',n),{delay:D('base')});
          else if(tx==='Фото профиля')hint('avcrop',()=>q('.pf-crop',n),{delay:D('base')});
        }
      }
    }).observe(document.body,{childList:true});
  }

  /* ---------- context watcher: tours start the first time a section is reached ---------- */
  function onCtx(force){
    const c=ctxNow();if(c===lastCtx&&!force)return;
    lastCtx=c;
    if(sg)hideSingle();
    if(run&&run.def.ctx!==c)finish('abort');
    if(c==='folder')setTimeout(()=>{const s=q('.pf-fc .seg,.pf-frow .vis .seg');if(s)hint('pfvis',s,{delay:D('slow')});},off()?250:D('slow')+250);
    const id=CTX_TOUR[c];
    if(id&&enabled()&&!seen(id)){setTimeout(()=>{if(ctxNow()===c)runTour(id);},off()?200:D('slow')+250);}
  }
  function init(){
    build();
    document.addEventListener('click',e=>{
      const row=e.target.closest&&e.target.closest('.hlp-row');
      if(row){closeMenus();setTimeout(()=>runTour(row.dataset.tour,{force:true}),off()?0:D('instant')+30);return;}
      if(e.target.closest&&e.target.closest('#tour-go,#tour-go2')){runCurrent();return;}
      if(e.target.closest&&e.target.closest('#tour-reset')){hintsReset();return;}
      if(e.target.closest&&e.target.closest('#help')){markId('help:dot');syncDot();renderList();}
      if(e.target.closest&&e.target.closest('#settings')){renderList();}
    },true);
    const _s=window.setTab;
    if(typeof _s==='function'){setTab=function(){const r=_s.apply(this,arguments);setTimeout(onCtx,0);return r;};}
    new MutationObserver(()=>onCtx()).observe(document.body,{attributes:true,attributeFilter:['class']});
    syncDot();renderList();wireHints();
    onCtx(true);
  }
  if(document.readyState==='complete')setTimeout(init,0);else window.addEventListener('load',()=>setTimeout(init,0));
  const api={run:runTour,hint,reset,seen,hideSingle,runCurrent,syncDot,renderList,enabled,ctx:ctxNow,tours:TOURS,order:TOUR_ORDER,hints:HINTS,
    active:()=>run?run.id:(sg?sg.id:null),blocked,_q:Q};
  window.TOUR=api;
  return api;
})();
