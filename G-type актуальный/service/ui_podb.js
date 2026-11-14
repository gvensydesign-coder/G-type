/* ===== «Подборки» (m63): тематические ленты шрифтов по сценариям =====
   Подборка = сценарий + 3–6 шрифтов + свой образец текста в каждой карточке. Ленты вставляются между рядами сетки «Все шрифты»
   (после каждых двух рядов), на главной показывается одна. Клик по заголовку или «Все шрифты подборки» открывает библиотеку,
   отфильтрованную по подборке (LQ.coll). Карточки лент — `.spc` (кнопки), настоящие карточки шрифтов остаются `.lcard[data-font]`:
   тесты и всплывающая карточка считают только их. Стили: блок «PODB m63» в template.html; описание: DESIGN_SYSTEM.md §6.1. */

/* Состав подбирается по метаданным FONT_META (теги и описания), а не по вкусу: у каждого шрифта указана причина.
   kind: word — короткие слова, big — крупные слова крупным кеглем, para — абзац, ui — строки интерфейса.
   txt: образцы по кругу (i-й шрифт берёт i-й образец), так карточки в ленте не повторяются.
   Только шрифты, которые есть в библиотеке: отсутствующие тихо пропускаются (podbIds). */
const PODB=[
  {id:'logo',title:'Для логотипа',desc:'Выразительные, но чистые формы: хорошо держатся в одном цвете и в маленьком размере.',kind:'word',
    txt:['Север','Лаваш','Маяк','Орион','Кедр','Вектор'],
    fonts:[
      ['modul','geo+mod+disp: сборная геометрия, знак узнаётся издалека'],           /* модульная конструкция — готовая логотипная сетка */
      ['liniya','geo+nocon: один штрих, как у линейных знаков'],                       /* монолиния хорошо масштабируется от иконки до вывески */
      ['volt','grot+wide+disp: плотный акцидентный гротеск'],                           /* тяжёлые вертикали дают вес в одну краску */
      ['kvadra','ngrot+normal: нейтральный новый гротеск, не спорит со знаком'],       /* спокойная пара к символу */
      ['ryvok','grot+wide+disp: резкие лезвия, характер'],                              /* для техно- и спортивных марок */
      ['stsepka','disp+narrow+exp: буквы сцеплены в монограмму, ловкий знак из имени']  /* лигатуры дают готовый логотип из названия */
    ]},
  {id:'book',title:'Для книги',desc:'Шрифты для длинного чтения: ровный ритм строки и спокойные формы.',kind:'para',
    txt:['Тихо шумел камыш, и в ночной тишине слышался далёкий звон колокола над рекой.',
         'Он вернулся к вечеру, снял шапку у порога и долго слушал, как за стеной тикают часы.',
         'Снег лёг на крыши до самых труб, и город на миг показался нарисованным.'],
    fonts:[
      ['renessa','serif+renais+text: антиква старого стиля, классика книги'],         /* единственная антиква с тегом text */
      ['stroka','ngrot+text: гротеск для текста, ровный ритм'],                        /* тег text: книги и журналы без засечек */
      ['codex','uncial+wpen: унциал для особых изданий'],                              /* книжный, но для коротких отрывков */
      ['kvadra','ngrot+normal: нейтральный текстовый гротеск']                         /* нормальные пропорции, крупный строчной */
    ]},
  {id:'ui',title:'Для интерфейса',desc:'Чёткие формы и крупный строчной знак: читаются в мелком кегле на экране.',kind:'ui',
    txt:['Настройки · Сохранить · 3 новых','Поиск · Профиль · Выйти','Главная · Заказы · 12 сообщений'],
    fonts:[
      ['stroka','ngrot+normal+text: сделан для текста и интерфейсов'],                /* тег text, прямое назначение */
      ['kvadra','ngrot+normal: нейтральный, закрытые формы'],                          /* тот же класс, чуть выразительнее */
      ['liniya','geo+nocon: ровная линия, подходит для заголовков экранов']            /* монолиния читается на малых размерах */
    ]},
  {id:'sign',title:'Для вывески и плаката',desc:'Крупные акцидентные шрифты: читаются издалека и держат внимание.',kind:'big',
    txt:['ОТКРЫТО','РЫНОК','ТЕАТР','БАР','ГАРАЖ','КАФЕ'],
    fonts:[
      ['volt','grot+wide+disp: широкий и тяжёлый'],                                    /* дисплейный гротеск */
      ['ryvok','grot+wide+disp: лезвия для афиши'],                                    /* плакатный характер */
      ['ustav','old+narrow+disp: узкий устав для высоких вывесок'],                    /* узкий — длинные слова умещаются */
      ['rotunda','gothic+wide: готика для пивных и лавок'],                            /* исторический колорит */
      ['stolb','grot+narrow+disp: высокие узкие стойки, слово встаёт колонной'],        /* узкий плотный гротеск: длинные вывески и афиши */
      ['stsepka','disp+narrow+exp: узкий плотный шрифт со сцепками, читается издалека'] /* высокие вывески и афиши: слова умещаются */
    ]},
  {id:'kids',title:'Для детского проекта',desc:'Весёлые формы без строгости: капли, клетки и круглые линии.',kind:'word',
    txt:['Сказка','Дракон','Радуга','Мышонок','Игры'],
    fonts:[
      ['applik','disp+exp: бумажная аппликация, вырезано детской рукой'],            /* буквы-вырезки: самый «детский» по замыслу */
      ['kaplya','disp+exp: капли и растекание, как краска'],                           /* самый «живой» шрифт библиотеки */
      ['pixel','pix+disp: пиксели из игр'],                                            /* ретро-игры нравятся и детям, и подросткам */
      ['liniya','geo+nocon: круглые буквы одной линии'],                               /* дружелюбная геометрия */
      ['propis','hand+conn: письмо от руки'],                                          /* как в прописях */
      ['modul','geo+mod: буквы-кубики']                                                /* конструктор */
    ]},
  {id:'exp',title:'Экспериментальные',desc:'Нестандартные конструкции: когда нужно удивить.',kind:'word',
    txt:['Сдвиг','Шум','Эхо','Капля','Пиксель'],
    fonts:[
      ['applik','exp: тег «Экспериментальные», бумага с ножницами и рваным краем'],  /* вырезка и обрыв как конструкция */
      ['kaplya','exp: тег «Экспериментальные», растекающаяся краска'],                 /* единственный с тегом exp */
      ['pixel','pix: настоящая клеточная сетка'],                                      /* необычная конструкция */
      ['modul','mod: модульная сетка'],                                                /* конструктивизм */
      ['ryvok','disp: лезвия и перспектива'],                                          /* динамика */
      ['tyaga','geo+nocon+disp+exp: растягиваемая монолиния, буква тянется как пружина'],  /* необычная конструкция: растяжка по ширине */
      ['kortes','serif+disp+exp: тяжёлая антиква, у R и Я растут росчерки под соседа']       /* контекстные хвосты: подстановка по паре букв */
    ]},
  {id:'hand',title:'Рукописные и каллиграфия',desc:'Письмо пером: наклон, связки и нажим.',kind:'word',
    txt:['Здравствуй','С любовью','Письмо','Чернила','Вечер'],
    fonts:[
      ['propis','hand+ppen+conn: остроконечное перо, связные буквы'],                  /* прописной скрипт */
      ['codex','uncial+wpen: ширококонечное перо, унциал'],                            /* каллиграфия широким пером */
      ['renessa','renais+wpen: гуманистический курсив пера'],                          /* почерк ренессанса */
      ['rotunda','gothic+wpen: ротунда пером'],                                        /* готическая каллиграфия */
      ['ustav','old+ustav: уставное письмо'],                                          /* древнерусская рукопись */
      ['nit','hand+nocon: рукописная монолиния фломастером, живая неровная рука']       /* почерк без пера: одна линия, неровные стыки */
    ]}
];
const podbBy=id=>PODB.find(c=>c.id===id)||null;
/* состав подборки: только существующие шрифты; [[id, причина]] */
const podbFonts=c=>c.fonts.filter(f=>FONTS[f[0]]);
const podbIds=c=>podbFonts(c).map(f=>f[0]);
const PODB_HOME='logo';/* на главной показывается эта подборка */

function podbCard(c,f,i){
  const id=f[0],fo=FONTS[id],b=document.createElement('button');
  b.type='button';b.className='spc';b.dataset.font=id;b.dataset.coll=c.id;
  b.setAttribute('aria-label','Шрифт «'+fo.name+'», подборка «'+c.title+'»');
  const cv=document.createElement('canvas');cv.className='spv';cv.dataset.font=id;cv.dataset.kind=c.kind;cv.dataset.txt=c.txt[i%c.txt.length];cv.setAttribute('aria-hidden','true');
  b.appendChild(cv);
  const n=document.createElement('b');n.textContent=fo.name;b.appendChild(n);
  const w=document.createElement('span');w.textContent=f[1].replace(/^[^:]*:\s*/,'');b.appendChild(w);
  b.addEventListener('click',()=>libOpen(id));
  return b;
}
/* лента: заголовок, описание, стрелки, горизонтальная карусель, «Все шрифты подборки» */
function podbBand(c){
  const s=document.createElement('section');s.className='pband';s.dataset.coll=c.id;s.setAttribute('aria-labelledby','pb-t-'+c.id);
  const h=document.createElement('div');h.className='pb-h';
  const t=document.createElement('div');t.className='pb-t';
  const hh=document.createElement('h3');hh.id='pb-t-'+c.id;hh.textContent=c.title;
  const p=document.createElement('p');p.textContent=c.desc;t.appendChild(hh);t.appendChild(p);h.appendChild(t);
  const act=document.createElement('div');act.className='vact';
  act.innerHTML='<button class="arr pb-prev" type="button" aria-label="Назад"><i class="ico i-chev-left"></i></button><button class="arr pb-next" type="button" aria-label="Вперёд"><i class="ico i-chev-right"></i></button>';
  const all=document.createElement('button');all.type='button';all.className='vlink pb-all';all.dataset.coll=c.id;
  all.innerHTML='Все шрифты подборки<i class="ico i-arrow-r"></i>';
  all.addEventListener('click',()=>podbOpen(c.id));
  act.appendChild(all);h.appendChild(act);s.appendChild(h);
  const row=document.createElement('div');row.className='pb-row hs-fade';row.setAttribute('role','list');
  podbFonts(c).forEach((f,i)=>{const k=podbCard(c,f,i);k.setAttribute('role','listitem');row.appendChild(k);});
  s.appendChild(row);
  const by=d=>row.scrollBy({left:d*Math.max(240,row.clientWidth*.8),behavior:'smooth'});
  const pv=s.querySelector('.pb-prev'),nx=s.querySelector('.pb-next');
  pv.addEventListener('click',()=>by(-1));nx.addEventListener('click',()=>by(1));
  const upd=()=>{const l=row.scrollLeft>2,r=row.scrollLeft+row.clientWidth<row.scrollWidth-2;pv.disabled=!l;nx.disabled=!r;row.dataset.hs=(l?'l ':'')+(r?'r':'');};
  row.addEventListener('scroll',upd,{passive:true});s._upd=upd;
  requestAnimationFrame(upd);
  return s;
}
/* клик по подборке: библиотека, отфильтрованная по ней */
function podbOpen(id){
  if(!podbBy(id))return;
  hcHide(true);LQ.coll=id;LQ.q='';LQ.tags=[];
  const q=document.getElementById('lib-q');if(q)q.value='';
  if(S.tab==='library'){libRenderLibrary();requestAnimationFrame(drawLibrary);const v=document.getElementById('view-library');if(v)v.scrollTop=0;}
  else setTab('library');
}
function podbClear(){
  if(!LQ.coll)return;LQ.coll='';
  if(S.tab==='library'){libRenderLibrary();requestAnimationFrame(drawLibrary);}
}

/* ---------- рисование образцов ---------- */
/* строки абзаца: слова переносятся по ширине, cap — высота прописной в пикселях */
function podbWrap(id,txt,avail,sc){
  const sp=libRun(id,' '),gap=(sp.tot||300)*sc,lines=[];let cur=null;
  txt.split(/\s+/).filter(Boolean).forEach(wd=>{
    const r=libRun(id,wd),w=r.tot*sc;
    if(cur&&cur.w+gap+w<=avail){cur.w+=gap+w;cur.ws.push(r);}else{cur={w,ws:[r]};lines.push(cur);}
  });
  return {lines,gap};
}
let PODB_JOB=0,PODB_MORE=0;
function podbDraw(){
  const root=document.getElementById(LIB_VIEWS[S.tab]);if(!root)return;
  const cvs=root.querySelectorAll('canvas.spv');if(!cvs.length)return;
  const glyph=css('--glyph'),mu=css('--cv-muted'),list=[...cvs],job=++PODB_JOB;let k=0;
  const one=cv=>{
      const id=cv.dataset.font;if(!FONTS[id])return;
      useFont(id);
      const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);if(w<20)return;
      const kind=cv.dataset.kind,txt=cv.dataset.txt,pad=18;
      c.fillStyle=glyph;
      const put=(r,x,base,sc)=>{for(const [g,xx] of r.items)c.fill(pathOf(g.cs,(px,py)=>[x+xx*sc+px*sc,base-py*sc]),'nonzero');};
      if(kind==='ui'){
        /* строка интерфейса: «·» нет ни в одном шрифте библиотеки, поэтому разделитель рисуется точкой; кегль ≈ 17 px, не шире карточки */
        const segs=txt.split(' · ').map(t=>libRun(id,t)),sp=libRun(id,' '),r0=libRun(id,'Н'),cap0=r0.cap||700;
        const gapU=(sp.tot||300)*1.1,dotU=cap0*0.22;
        const totU=segs.reduce((a,r)=>a+r.tot,0)+(segs.length-1)*(2*gapU+dotU);
        const sc=Math.min(12.5/cap0,(w-2*pad)/Math.max(totU,1)),base=h/2+cap0*sc/2;
        let x=pad;
        segs.forEach((r,i)=>{
          put(r,x,base,sc);x+=r.tot*sc;
          if(i<segs.length-1){x+=gapU*sc;c.beginPath();c.arc(x+dotU*sc/2,base-cap0*sc*0.36,dotU*sc/2,0,Math.PI*2);c.fill();x+=dotU*sc+gapU*sc;}
        });
        return;
      }
      if(kind==='para'){
        /* абзац: кегль задаёт высота прописной (≈ 16 px текста); строк не больше, чем влезает */
        const r0=libRun(id,'Н'),capPx=12,sc=capPx/(r0.cap||700),lh=capPx*2.05;
        const W=podbWrap(id,txt,w-2*pad,sc),maxL=Math.max(1,Math.floor((h-2*pad)/lh));
        const L=W.lines.slice(0,maxL),tot=L.length*lh,y0=(h-tot)/2+lh*0.5+capPx*0.5;
        L.forEach((ln,li)=>{let x=pad;ln.ws.forEach(r=>{put(r,x,y0+li*lh,sc);x+=r.tot*sc+W.gap;});});
        return;
      }
      const run=libRun(id,txt),big=kind==='big';
      const capMax=h*(big?0.56:0.42),sc=Math.min(capMax/(run.cap||700),(w-2*pad)/Math.max(run.tot,1));
      const capPx=run.cap*sc,base=h/2+capPx/2;
      put(run,big?(w-run.tot*sc)/2:pad,base,sc);
    };
  const run=()=>{
    if(job!==PODB_JOB)return;
    const back=S.fontId,t0=performance.now();let more=false;
    try{while(k<list.length){one(list[k++]);if(k<list.length&&performance.now()-t0>DL_BUDGET){more=true;break;}}}
    catch(e){console.error(e);k=list.length;}
    finally{try{useFont(back);}catch(e){}}
    PODB_MORE=more?1:0;
    if(more)setTimeout(run,0);
  };
  run();
}
(function(){const f=drawLibrary;drawLibrary=function(){const r=f.apply(this,arguments);try{podbDraw();}catch(e){console.error(e);}return r;};})();

/* ---------- ленты между рядами сетки «Все шрифты» ---------- */
const PODB_ROWS=2;/* лента после каждых двух рядов */
function podbCols(grid){
  const w=grid.clientWidth;
  if(grid.classList.contains('list'))return 1;
  if(w>0){const n=getComputedStyle(grid).gridTemplateColumns.split(' ').filter(x=>/px$/.test(x)).length;if(n)return n;}
  return Math.max(1,Math.floor((innerWidth-150)/314));/* вид ещё скрыт: оценка по окну */
}
/* расставляет ленты в сетке заново (без пересборки карточек): после каждых PODB_ROWS рядов, но не реже, чем через 4 карточки */
function podbPlace(){
  const grid=document.getElementById('libgrid');if(!grid)return;
  grid.querySelectorAll(':scope>.pband').forEach(n=>n.remove());
  const filt=!!(LQ.q.trim()||LQ.tags.length||LQ.coll);
  if(filt)return;
  const cards=[...grid.children].filter(n=>n.classList.contains('lcard'));
  const gap=Math.max(podbCols(grid)*PODB_ROWS,4);grid.dataset.pgap=gap;
  let bi=0;
  for(let i=gap;i<cards.length;i+=gap){
    const c=PODB[bi%PODB.length];bi++;
    if(!podbFonts(c).length)continue;
    const band=podbBand(c);band.classList.add('in-grid');
    grid.insertBefore(band,cards[i]);
  }
}
(function(){const f=libRenderLibrary;libRenderLibrary=function(){
  const r=f.apply(this,arguments);
  try{podbPlace();podbHead();}catch(e){console.error(e);}
  return r;};})();
/* число рядов зависит от ширины окна: при смене и при показе раздела ленты расставляются заново, только если шаг изменился */
function podbCheck(){
  const g=document.getElementById('libgrid');if(!g||S.tab!=='library')return;
  const gap=Math.max(podbCols(g)*PODB_ROWS,4);
  if(String(gap)!==g.dataset.pgap)podbPlace();
  document.querySelectorAll('.pband').forEach(b=>b._upd&&b._upd());
}
let _pbRz=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(_pbRz);_pbRz=requestAnimationFrame(()=>{try{podbCheck();}catch(e){}});});
document.addEventListener('DOMContentLoaded',()=>{
  const _st=setTab;
  setTab=function(){const r=_st.apply(this,arguments);if(S.tab==='library')requestAnimationFrame(()=>{try{podbCheck();}catch(e){}});return r;};
});

/* шапка отфильтрованной подборки: плашка с названием, описанием и кнопкой «Показать все шрифты» */
function podbHead(){
  const vh=document.querySelector('#view-library .vhead');if(!vh)return;
  let box=document.getElementById('lib-coll');
  if(!box){box=document.createElement('div');box.id='lib-coll';box.className='pcoll';vh.parentNode.insertBefore(box,vh.nextSibling);}
  const c=podbBy(LQ.coll);
  box.hidden=!c;box.textContent='';
  if(!c)return;
  const t=document.createElement('div');t.className='pc-t';
  const b=document.createElement('b');b.textContent=c.title;const p=document.createElement('span');p.textContent=c.desc;t.appendChild(b);t.appendChild(p);
  const x=document.createElement('button');x.type='button';x.className='btn sm';x.id='lib-coll-x';x.textContent='Показать все шрифты';
  x.addEventListener('click',()=>{podbClear();});
  box.appendChild(t);box.appendChild(x);
  const n=document.getElementById('lib-count');
  if(n&&!(LQ.q.trim()||LQ.tags.length))n.textContent=c.title+' · '+plShrift(libFiltered().length);
}

/* ---------- главная: одна подборка ---------- */
function podbHome(){
  const box=document.getElementById('home-podb');if(!box||box.children.length)return;
  const c=podbBy(PODB_HOME);
  if(!c||!podbFonts(c).length){const s=document.getElementById('sec-podb');if(s)s.hidden=true;return;}
  const band=podbBand(c);band.classList.add('on-home');box.appendChild(band);
  const s=document.getElementById('sec-podb');if(s)s.hidden=false;
}
(function(){const f=libRenderHome;libRenderHome=function(){const r=f.apply(this,arguments);try{podbHome();}catch(e){console.error(e);}return r;};})();
document.addEventListener('DOMContentLoaded',()=>{try{podbHome();}catch(e){}});
