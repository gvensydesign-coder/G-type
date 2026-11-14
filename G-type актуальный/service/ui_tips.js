/* ===== Ротатор подсказок (m50): серая строка под заголовком главной и библиотеки (DESIGN_SYSTEM.md §6.2) =====
   Разметка: <div class="hx-p rtip" data-tips="home|lib"><p class="rtip-v" aria-hidden="true">…</p></div>.
   Все фразы лежат стопкой в одной ячейке сетки (высота = самая высокая, ширина не меняется, сдвига вёрстки нет), видна одна.
   Смена каждые --tip-gap (4,5 с): старая фраза уходит вверх на --tip-lift за --dur-fast (--ease-in), новая поднимается снизу на --tip-rise за --dur-base (--ease-out),
   слова по очереди с шагом --stagger-tight. Анимация целиком в CSS, длительности из токенов (html.nomo и reduced motion их обнуляют).
   Пауза: курсор над строкой, фокус внутри шапки (поле поиска), вкладка скрыта, шапка вне экрана или не показана, идёт тур (TOUR.active()).
   prefers-reduced-motion: остаётся первая фраза, ничего не меняется. Для скринридеров: aria-hidden на бегущей строке и полный список в .vh. */
(function(){
  'use strict';
  /* *слово* — ключевое слово в акцентном цвете. Каждая фраза называет то, что в продукте есть. */
  const MSG={
    home:[
      'Возьмите готовый шрифт, подстройте под себя и скачайте файл',
      'Тяните *ползунок* — весь шрифт меняется сразу',
      'Нарисуйте буквы на *холсте* — контуры сами станут шрифтом',
      'Загрузите *SVG* со своими буквами и соберите из них шрифт',
      'Кликните между буквами образца, чтобы поправить *кернинг*',
      'Скачайте *вариативный* шрифт — все оси в одном файле',
      '*Проверка* покажет буквы, которые легко спутать',
      'Попробуйте *декор*: контурное, оттенённое, выворотное начертания',
      'Подпишите шрифт своим именем — это включается в *профиле* автора',
      'Любимые шрифты соберутся в *Избранном* — нажмите на сердечко'
    ],
    lib:[
      'Выберите *категорию* — останутся только подходящие шрифты',
      'Фильтр *«Поддержка языков»* покажет шрифты для нужного языка',
      'Нажмите на *сердечко* — шрифт ляжет в Избранное',
      'Ищите по названию или по слову, например *«рукописный»*',
      '*Подборки* на главной собраны под задачу: логотип, книга, интерфейс',
      'Сетка или список, популярные или по алфавиту — выбирайте *вид*'
    ]
  };
  const root=document.documentElement,rmq=matchMedia('(prefers-reduced-motion:reduce)');
  const cssMs=(n,d)=>{const v=getComputedStyle(root).getPropertyValue(n).trim();if(!v)return d;return v.endsWith('ms')?parseFloat(v):v.endsWith('s')?parseFloat(v)*1000:(parseFloat(v)||d);};
  const insts=[];
  const TIPS=window.TIPS={msgs:MSG,gap:0,tick:250,list:()=>insts,
    /* состояние для проверок: номер видимой фразы и причины паузы */
    state(el){const n=insts.find(x=>x.box===el)||insts[0];return n?{idx:n.idx,count:n.items.length,paused:n.why(),text:n.items[n.idx].textContent}:null;},
    step(el){const n=el?insts.find(x=>x.box===el):insts.find(x=>x.visible());if(n)n.next();},
    reset(){insts.forEach(n=>{n.acc=0;});}};
  const gap=()=>TIPS.gap||cssMs('--tip-gap',4500);

  function mkItem(msg){
    const it=document.createElement('span');it.className='rtip-i';
    let i=0;
    msg.split(/(\*[^*]+\*)/).forEach(part=>{
      if(!part)return;
      const acc=part[0]==='*';
      (acc?part.slice(1,-1):part).split(/(\s+)/).forEach(w=>{
        if(!w)return;
        if(/^\s+$/.test(w)){it.appendChild(document.createTextNode(' '));return;}
        const s=document.createElement('span');s.className='rtip-w'+(acc?' k':'');s.style.setProperty('--i',i++);s.textContent=w;it.appendChild(s);
      });
    });
    return it;
  }
  function build(box){
    const list=MSG[box.dataset.tips];if(!list||!list.length)return;
    const v=box.querySelector('.rtip-v');if(!v)return;
    v.textContent='';
    const items=list.map(mkItem);items.forEach(it=>v.appendChild(it));items[0].classList.add('is-cur');
    /* полный список для скринридеров: бегущая строка скрыта (aria-hidden), живая область не используется */
    const ul=document.createElement('ul');ul.className='vh';ul.setAttribute('aria-label','Подсказки');
    list.forEach(m=>{const li=document.createElement('li');li.textContent=m.replace(/\*/g,'');ul.appendChild(li);});
    box.appendChild(ul);
    const n={box,items,idx:0,acc:0,hover:false,focus:false,inview:true,
      visible(){const r=box.getBoundingClientRect();return r.width>0&&r.height>0;},
      why(){const a=[];if(rmq.matches)a.push('reduced-motion');if(document.hidden)a.push('hidden');if(n.hover)a.push('hover');if(n.focus)a.push('focus');
        if(!n.inview||!n.visible())a.push('offscreen');
        try{if(window.TOUR&&TOUR.active&&TOUR.active())a.push('tour');}catch(e){}return a;},
      next(){n.go((n.idx+1)%n.items.length);},
      go(i){
        const cur=n.items[n.idx],nx=n.items[i];if(!nx||cur===nx)return;
        cur.classList.remove('is-cur');cur.classList.add('is-out');
        nx.classList.add('is-in');void nx.offsetWidth;nx.classList.remove('is-in');nx.classList.add('is-cur');
        clearTimeout(cur._t);cur._t=setTimeout(()=>cur.classList.remove('is-out'),cssMs('--dur-fast',180)+80);
        n.idx=i;n.acc=0;
      }};
    box.addEventListener('mouseenter',()=>{n.hover=true;});
    box.addEventListener('mouseleave',()=>{n.hover=false;});
    const hx=box.closest('.hx-in')||box;
    hx.addEventListener('focusin',()=>{n.focus=true;});
    hx.addEventListener('focusout',()=>{setTimeout(()=>{n.focus=hx.contains(document.activeElement);},0);});
    if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{es.forEach(e=>{n.inview=e.isIntersecting;});},{threshold:.1});io.observe(box);}
    insts.push(n);
  }
  function loop(){
    insts.forEach(n=>{if(n.why().length)return;n.acc+=TIPS.tick;if(n.acc>=gap())n.next();});
  }
  function init(){
    document.querySelectorAll('.rtip[data-tips]').forEach(build);
    if(insts.length)setInterval(loop,TIPS.tick);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
