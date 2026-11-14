/* Главная, библиотека, избранное, тема и разделы (home / library / fav / edit / proof / draw).
   Разметка разделов лежит в шаблоне (mkshell.py), стили в shell.css. Здесь: данные о шрифтах (теги, описания,
   порядок популярности), избранное, поиск и фильтры, переключатель темы и подключение окна «Отрисовать». */

/* ---------- данные библиотеки ---------- */
/* Единый словарь тегов: [id, название, шрифт для плитки, слова для поиска, группа, плитка].
   id стабильны (они хранятся в метаданных шрифтов и в ссылках), названия можно править. Описание схемы: FONT_META.md */
/* Терминология ParaType (kb/PARATYPE_KB.md, раздел 1). Грани словаря: class — группа по классификации, tool — инструмент или конструкция,
   prop — пропорции, contrast — контраст, purpose — назначение, charset — набор знаков, feature — технология. */
const TAG_GROUPS=['class','tool','prop','contrast','purpose','charset','feature'];
const LIB_TAGS=[
  ['grot','Гротески','volt','гротеск sans без засечек','class'],
  ['ngrot','Новые гротески','kvadra','нео неогротеск нейтральный','class'],
  ['geo','Геометрические','liniya','геометрия геометричный гротески','class'],
  ['hand','Рукописные','propis','прописной скрипт рукопись','class'],
  ['serif','Антиква','renessa','антиква засечки с засечками serif книжный шрифт','class'],
  ['renais','Ренессанс','renessa','ренессанс ренессансная старый стиль гарнитура гуманистическая гуманистический','class'],
  ['gothic','Готические','rotunda','готика готический круглоготический','class'],
  ['old','Древнерусские','ustav','исторический старинный средневековый кириллический','class'],
  ['uncial','Унциальные','codex','унциал вензели','class'],
  ['wpen','Ширококонечное перо','codex','перо пером каллиграфия каллиграфический','tool'],
  ['ppen','Остроконечное перо','propis','перо пером каллиграфия каллиграфический','tool'],
  ['conn','Связные','propis','связный соединение','tool'],
  ['rot','Ротунда','rotunda','круглоготический','tool'],
  ['ustav','Устав','ustav','уставное письмо','tool'],
  ['mod','Модульные','modul','модуль модульная сетка конструктивизм','tool'],
  ['pix','Пиксельные','pixel','пиксель пиксельный растр растровый битмап сетка клетка 8-бит ретро игровой','tool'],
  ['narrow','Узкие','ustav','узкий','prop'],
  ['normal','Нормальные','kvadra','нормальный','prop'],
  ['wide','Широкие','volt','широкий','prop'],
  ['nocon','Неконтрастные','liniya','монолиния монолинейный равный штрих','contrast'],
  ['text','Текстовые','stroka','текстовый для текста чтения книжный газетный интерфейс интерфейсный ui','purpose'],
  ['disp','Акцидентные','kaplya','заголовочный плакатный display дисплейный','purpose'],
  ['exp','Экспериментальные','kaplya','экспериментальный эксперимент капли растекание клякса','purpose'],
  ['basic','Базовый набор','modul','базовый набор','charset'],
  ['cl','Кириллица + латиница','kvadra','кириллица латиница cyrillic latin','charset'],
  ['vf','Вариативный','codex','вариативный variable ось','feature']
];
/* подгруппа входит в группу: фильтр «Гротески» находит и «Новые гротески» */
const TAG_PARENT={ngrot:'grot',geo:'grot',rot:'gothic',ustav:'old'};
/* плитки категорий над списком: только основные группы (подробные теги видны на карточках, в подсказках поиска и во всплывающей карточке) */
const TILE_TAGS=['grot','hand','gothic','old','disp','geo','pix','basic','vf'];
const tagById=k=>LIB_TAGS.find(t=>t[0]===k);
/* Метаданные шрифтов: year (число), desc (1–2 предложения), tags (id из LIB_TAGS), необязательно sample (первая строка образца).
   Остальное (charset, styles, weights, число знаков) считается из самого шрифта. Шрифт без записи показывается с запасными значениями,
   а проверка в tests/e2e_shell.py требует запись для каждого зарегистрированного шрифта. */
const FONT_META={
  kvadra:{year:2026,tags:['ngrot','normal','cl','vf','wide'],desc:'Новый гротеск нормальных пропорций: закрытые формы, ровный ритм, крупный строчной. Для интерфейсов и сплошного набора.'},
  stroka:{year:2026,tags:['ngrot','normal','text','cl','vf'],desc:'Новый гротеск нормальных пропорций для текста и интерфейсов: крупный строчной, квадратно-круглые овалы, двухэтажная а, открытые апертуры. Читается мелким кеглем.'},
  volt:{year:2077,tags:['grot','wide','disp','cl','vf'],desc:'Широкий акцидентный гротеск: тяжёлые вертикали, тонкие горизонтали, острые шпоры. Для плакатов, заголовков и упаковки.'},
  liniya:{year:2026,tags:['geo','nocon','cl','vf'],desc:'Геометрический гротеск без контраста: штрих одной толщины, формы из круга и прямой. Для логотипов, вывесок и коротких текстов.'},
  propis:{year:2026,tags:['hand','ppen','conn','cl','vf'],desc:'Рукописный шрифт остроконечным пером: связные буквы с лёгким наклоном и росчерками. Для приглашений, открыток и подписей.'},
  codex:{year:1204,tags:['uncial','wpen','cl','vf'],desc:'Унциальный шрифт, написанный ширококонечным пером: округлые формы и вензели. Для книжных заголовков, афиш и этикеток.'},
  rotunda:{year:1719,tags:['gothic','rot','wpen','basic','cl','wide','vf'],desc:'Ротунда — круглоготический шрифт: широкие пропорции, один излом, много круглых форм; по мотивам испанской каллиграфии XVIII века (Поланко).'},
  ustav:{year:1703,tags:['old','ustav','narrow','disp','basic','cl','vf'],desc:'Устав — древнерусский шрифт: узкие, почти квадратные буквы строгого вертикального ритма. Для акцидентных заголовков и обложек.'},
  modul:{year:2026,tags:['geo','mod','disp','basic','cl','vf'],desc:'Геометрический акцидентный шрифт модульной конструкции: буквы собраны из одинаковых ячеек сетки. Для плакатов и фирменных знаков.'},
  ryvok:{year:2077,tags:['grot','wide','disp','basic','cl','vf'],desc:'Широкий акцидентный гротеск тяжёлого рисунка с лезвиями. Для плакатов, обложек и спортивной графики.'},
  pixel:{year:2026,tags:['pix','disp','cl','vf'],desc:'Пиксельный шрифт на настоящей клеточной сетке: разрешение, насыщенность и форма клетки меняются свободно, есть пиксельные засечки и кисть для правки клеток. Для игр, афиш и интерфейсов в духе 8 бит.',sample:'ПОИГРАЙ СО МНОЙ'},
  kaplya:{year:2026,tags:['disp','exp','basic','cl'],desc:'Акцидентный шрифт из капель и растекающейся краски: чем тяжелее вес, тем сильнее растекание и теснее буквы, пока чёрный не сольётся в пятно. Для плакатов, обложек и музыкальной графики.'},
  applik:{year:2026,tags:['disp','exp','basic','cl'],desc:'Акцидентный юникейс из бумажных кусков, вырезанных детской рукой: прямые резы ножницами, лёгкий наклон и прыжок каждого знака. Ползунки превращают ножницы в рваную бумагу или мозаику с зазорами. Для детских книг, афиш, упаковки и открыток.',sample:'Аппликация · Paper Kids'},
  stsepka:{year:2026,tags:['disp','narrow','exp','basic','cl'],desc:'Акцидентный узкий скруглённый шрифт с конструкторными лигатурами: соседние буквы сцепляются общей стойкой, крышей или ступенькой в один знак. Строчные прыгают по строке, а ползунки меняют вес, скругление, зазор сцепки и высоту строчных. Для вывесок, афиш, логотипов и заголовков.',sample:'Сцепка · Stsepka',hint:'Соседние буквы сцепляются сами; зазор сцепки — в настройках'},
  stolb:{year:2026,tags:['grot','narrow','disp','basic','cl'],desc:'Акцидентный сжатый гротеск из высоких прямых стоек: просветы внутри букв одинаковые, повороты закрыты, а косые заменены блоками и стрелками-соединителями. Для афиш, вывесок и заголовков, где слово должно встать колонной.'},
  tyaga:{year:2026,tags:['geo','nocon','disp','exp','cl'],desc:'Геометрический минималистичный монолинейный шрифт из одних заглавных букв, который растягивается по ширине: тянутся только прямые горизонтали, а стойки и скругления остаются прежними. Знак «~» после буквы растягивает её в шрифте, а блок на платформе выравнивает строки по ширине. Для плакатов, афиш и заголовков.',sample:'ПЛЕ СНЕ ВЫЙ СЫР',hint:'Знак ~ после буквы растягивает её · инструмент «Блок»'},
  kortes:{year:2026,tags:['serif','disp','exp','cl'],desc:'Тяжёлая акцидентная антиква из одних заглавных букв: клиновидные расходящиеся засечки, линзовидные просветы и острые концы. Буква R выпускает длинный росчерк под следующую круглую букву, а Я — зеркальный росчерк влево после круглой; работает в Figma и Word. Для афиш, обложек и заголовков.',hint:'Росчерки появляются сами: R перед круглой буквой, Я после неё'},
  nit:{year:2026,tags:['hand','narrow','nocon','disp','basic','cl'],desc:'Рукописный монолинейный шрифт, узкий: каждая буква — одна тонкая линия круглого пера, штрихи сходятся неровно, как фломастером. Строчные кириллицы — капительные, шире и свободнее прописных; толщина линии настраивается отдельным ползунком — от плакатной нити до жирной монолинии.',sample:'Смысл жизни состоит в том',hint:'Толщина линии настраивается отдельным ползунком: от нити до жирной монолинии'},
  renessa:{year:1495,tags:['serif','renais','wpen','text','cl','vf'],desc:'Антиква старого стиля по мотивам ренессансных книг: наклонная ось пера, мягкие клиновидные засечки, округлая б и острые клинья в концах. Для книг, журналов и спокойных заголовков.'},
  imp:{year:new Date().getFullYear(),tags:['cl'],desc:'Ваш шрифт, собранный из своих знаков. Параметры, веса и экспорт работают так же, как у готовых шрифтов.'}
};
const FM_SAMPLES=['Съешь ещё этих мягких французских булок','Sphinx of black quartz, judge my vow','0123456789 № 2026'];
/* единая точка доступа: всё, что показывают карточки, строки списка и всплывающая карточка, берётся отсюда, с запасными значениями */
function fmeta(id){
  const f=FONTS[id]||{},m=FONT_META[id]||{};
  const y=Number.isFinite(m.year)?m.year:null;
  const tags=(Array.isArray(m.tags)?m.tags:[]).filter(tagById);
  const ord=k=>{const t=tagById(k);return TAG_GROUPS.indexOf(t[4])*100+LIB_TAGS.indexOf(t);};
  tags.sort((a,b)=>ord(a)-ord(b));
  const weights=(typeof FAM_W!=='undefined'&&id!=='imp')?FAM_W.map(w=>w[0]):[];
  return {id,name:f.name||id,year:y,cover:(f.name||id)+(y==null?'':' '+y),
    desc:m.desc||f.desc||f.tag||'',tags,
    sample:m.sample||f.sample||'',
    charset:f.charset==='basic'?'basic':'ext',
    glyphs:Array.isArray(f.CHARSET)?f.CHARSET.length:0,
    styles:['regular','italic'].filter(k=>!f.DEFAULTS||f.DEFAULTS[k]),
    weights};
}
/* для фильтров: свои теги и теги родительских групп */
const libTagIds=id=>{const o=new Set(fmeta(id).tags);o.forEach(k=>{if(TAG_PARENT[k])o.add(TAG_PARENT[k]);});if(typeof langTagIds==='function')langTagIds(id).forEach(k=>o.add(k));/* ui_lang_l1: lang-* */return [...o];};
/* на карточках и в строках списка: теги жанра, конструкции и эпохи (набор и вариативность видны в бейдже и во всплывающей карточке) */
const libCardTags=id=>fmeta(id).tags.filter(k=>['class','tool','prop','contrast','purpose'].includes(tagById(k)[4])).slice(0,3);
/* популярность: заданный порядок; понравившиеся шрифты поднимаются выше всех. «Новые»: от свежих к старым */
const LIB_POP=['volt','kvadra','stroka','propis','liniya','codex','rotunda','ustav','modul','ryvok','kaplya','pixel','renessa','applik','stsepka','stolb','nit','tyaga','kortes'];
const LIB_NEW=['imp','kortes','tyaga','nit','stolb','stsepka','applik','renessa','pixel','kaplya','stroka','ryvok','rotunda','modul','ustav','propis','liniya','codex','kvadra','volt'];
const LIB_HOME_MAX=6;
const LQ={q:'',tags:[],coll:'',sort:'pop',get tag(){return this.tags[0]||'';},set tag(v){this.tags=v?[v]:[];}};

/* ---------- избранное ---------- */
const FAV_KEY='gtype-favs-v1';
let FAVS=new Set();
try{const a=JSON.parse(localStorage.getItem(FAV_KEY)||'[]');if(Array.isArray(a))a.forEach(x=>{if(typeof x==='string')FAVS.add(x);});}catch(e){}
function favSave(){try{localStorage.setItem(FAV_KEY,JSON.stringify([...FAVS]));}catch(e){}noStoreNote();}
function favSet(id,on){
  if(on)FAVS.add(id);else FAVS.delete(id);
  favSave();libHearts();
  if(S.tab==='fav'){libRenderFav();requestAnimationFrame(drawLibrary);}
}
function libHearts(){
  document.querySelectorAll('.lcard[data-font] .heart').forEach(h=>{
    const id=h.closest('.lcard').dataset.font,on=FAVS.has(id),f=FONTS[id];
    h.setAttribute('aria-pressed',on?'true':'false');
    const l=(on?'Убрать из избранного: ':'В избранное: ')+(f?f.name:id);h.title=l;h.setAttribute('aria-label',l);
  });
}
/* избранное едет вместе с проектом */
(function(){
  const _pj=projectJSON;projectJSON=function(){const r=_pj.apply(this,arguments);r.favs=[...FAVS];return r;};
  const _ap=applyProject;applyProject=function(pr){
    const ok=_ap.apply(this,arguments);
    if(ok&&pr&&Array.isArray(pr.favs)){FAVS=new Set(pr.favs.filter(x=>typeof x==='string'));favSave();if(typeof libBuildAll==='function'&&document.getElementById('libcards'))libBuildAll();}
    return ok;};
})();

/* ---------- порядок и поиск ---------- */
function libIds(){return Object.keys(FONTS).filter(id=>FONTS[id]);}
function libPopOrder(ids){
  const rank=id=>{const i=LIB_POP.indexOf(id);return (FAVS.has(id)?-100:0)+(i<0?50:i);};
  return ids.slice().sort((a,b)=>rank(a)-rank(b));
}
function libHomeIds(){
  const ids=libIds().filter(id=>LIB_POP.indexOf(id)>=0||FAVS.has(id));
  return libPopOrder(ids).slice(0,LIB_HOME_MAX);
}
const libNorm=s=>String(s||'').toLowerCase().replace(/ё/g,'е');
const libWords=s=>libNorm(s).split(/[^a-zа-я0-9]+/).filter(Boolean);
function libHay(id){
  const f=FONTS[id],m=fmeta(id);
  const tg=libTagIds(id).map(tagById);
  return {name:libWords(f.name).concat(libWords(f.family)),
    all:libWords([f.name,f.family,m.desc,m.year||'',tg.map(t=>t[1]+' '+t[3]).join(' ')].join(' '))};
}
/* лёгкая морфология: «рукописные» находит «рукописный», «пером» находит «перо» (отбрасываем до двух последних букв, основа от 4 букв) */
function libStems(t){const o=[t];if(t.length>=5)o.push(t.slice(0,-1));if(t.length>=6)o.push(t.slice(0,-2));return o;}
const libWordHit=(w,t)=>libStems(t).some(v=>w.startsWith(v));
function libMatch(id,q){
  const toks=libWords(q);if(!toks.length)return true;
  const h=libHay(id);
  return toks.every(t=>h.all.some(w=>libWordHit(w,t))||(t.length>=3&&h.name.some(w=>w.includes(t))));
}
/* подсказки тегов под полем: по последнему слову запроса, уже выбранные не предлагаем */
function libSuggest(q){
  const toks=libWords(q),t=toks[toks.length-1];
  if(!t||t.length<2)return [];
  const hit=[];
  LIB_TAGS.forEach(tg=>{
    if(LQ.tags.includes(tg[0]))return;
    const lab=libWords(tg[1]),syn=libWords(tg[3]);
    const r=lab.some(w=>libWordHit(w,t))?0:syn.some(w=>libWordHit(w,t))?1:-1;
    if(r>=0)hit.push([r,tg[0]]);
  });
  hit.sort((a,b)=>a[0]-b[0]);
  return hit.slice(0,5).map(x=>x[1]);
}
function libFiltered(){
  let ids=libIds();
  if(LQ.tags.length)ids=ids.filter(id=>LQ.tags.every(k=>libTagIds(id).includes(k)));
  ids=ids.filter(id=>libMatch(id,LQ.q));
  const pc=LQ.coll&&typeof podbBy==='function'?podbBy(LQ.coll):null;/* ui_podb.js: подборка сужает список и задаёт порядок */
  if(pc){const own=podbIds(pc);ids=ids.filter(id=>own.includes(id));}
  if(pc&&LQ.sort==='pop')ids.sort((a,b)=>podbIds(pc).indexOf(a)-podbIds(pc).indexOf(b));
  else if(LQ.sort==='az')ids.sort((a,b)=>FONTS[a].name.localeCompare(FONTS[b].name,'ru'));
  else if(LQ.sort==='new')ids.sort((a,b)=>{const i=LIB_NEW.indexOf(a),j=LIB_NEW.indexOf(b);return (i<0?99:i)-(j<0?99:j);});
  else ids=libPopOrder(ids);
  /* FX80 F3 (A06): при запросе точное имя и начало имени идут первыми, остальное сохраняет порядок */
  const qt=libWords(LQ.q);
  if(qt.length&&!(pc&&LQ.sort==='pop')){
    const sc=id=>{const nm=libHay(id).name;return qt.every(t=>nm.some(w=>w===t))?0:qt.every(t=>nm.some(w=>w.startsWith(t)))?1:qt.every(t=>nm.some(w=>w.includes(t)))?2:3;};
    const m=new Map(ids.map(id=>[id,sc(id)]));
    ids=ids.map((id,i)=>[id,i]).sort((a,b)=>m.get(a[0])-m.get(b[0])||a[1]-b[1]).map(x=>x[0]);
  }
  return ids;
}
/* клик по тегу на карточке: открыть библиотеку с этим фильтром, шрифт не открывается */
function libTagGo(k){
  hcHide(true);
  LQ.tags=[k];LQ.q='';LQ.coll='';
  if(S.tab==='library'){libRenderLibrary();requestAnimationFrame(drawLibrary);const q=document.getElementById('lib-q');if(q)q.value='';}
  else setTab('library');
}
function libTagBtns(id,box){
  libCardTags(id).forEach(k=>{
    const b=document.createElement('button');b.type='button';b.className='tag';b.dataset.tag=k;b.textContent=tagById(k)[1];
    b.setAttribute('aria-label','Тег: '+tagById(k)[1]);
    b.addEventListener('click',e=>{e.stopPropagation();libTagGo(k);});
    b.addEventListener('keydown',e=>{e.stopPropagation();});
    box.appendChild(b);
  });
}

/* ---------- карточки ---------- */
const REC_KEY='gtype-recent-v1';
let RECENT=[];
try{const a=JSON.parse(localStorage.getItem(REC_KEY)||'[]');if(Array.isArray(a))RECENT=a.filter(x=>typeof x==='string').slice(0,8);}catch(e){}
function recNote(id){RECENT=[id].concat(RECENT.filter(x=>x!==id)).slice(0,8);try{localStorage.setItem(REC_KEY,JSON.stringify(RECENT));}catch(e){}}
function libOpen(id){window.LIB_PICKED=true;recNote(id);if(id!==S.fontId)switchFont(id);setTab('edit');}
function libCard(id){
  const f=FONTS[id],d=document.createElement('div');
  d.className='lcard';d.dataset.font=id;d.setAttribute('role','button');d.tabIndex=0;
  const cv=document.createElement('canvas');cv.className='lcv';cv.dataset.font=id;cv.setAttribute('aria-hidden','true');d.appendChild(cv);
  const ln=document.createElement('span');ln.className='ln';ln.textContent=f.name;ln.appendChild(document.createElement('em'));d.appendChild(ln);
  const lt=document.createElement('span');lt.className='lt tags';libTagBtns(id,lt);d.appendChild(lt);
  if(f.charset==='basic'){const lb=document.createElement('span');lb.className='lb';lb.textContent='Базовый набор';d.appendChild(lb);}
  const nt=document.createElement('span');nt.className='notch';nt.setAttribute('aria-hidden','true');nt.innerHTML='<span class="nb go"><i class="ico i-up"></i></span>';d.appendChild(nt);
  const h=document.createElement('button');h.type='button';h.className='heart';h.innerHTML='<i class="ico"></i>';
  h.setAttribute('aria-pressed',FAVS.has(id)?'true':'false');
  const l=(FAVS.has(id)?'Убрать из избранного: ':'В избранное: ')+f.name;h.title=l;h.setAttribute('aria-label',l);
  h.addEventListener('click',e=>{e.stopPropagation();const on=!FAVS.has(id);favSet(id,on);toast(on?'Добавлено в избранное':'Убрано из избранного');if(S.tab==='home')libReorderHome();});
  d.appendChild(h);
  const mb=document.createElement('button');mb.type='button';mb.className='lc-more';mb.innerHTML='<i class="ico i-more" aria-hidden="true"></i>';
  mb.setAttribute('aria-label','Действия: «'+f.name+'»');mb.setAttribute('aria-haspopup','menu');mb.setAttribute('aria-expanded','false');
  mb.addEventListener('click',e=>{e.stopPropagation();if(window.PORT)PORT.cardMenu(mb,id);});
  d.appendChild(mb);
  d.addEventListener('click',e=>{if(e.target.closest('.heart,.lc-more'))return;libOpen(id);});
  d.addEventListener('keydown',e=>{if(e.target===d&&(e.key==='Enter'||e.key===' ')){e.preventDefault();libOpen(id);}});
  return d;
}
const VIEW_KEY='gtype-libview-v1';
let LVIEW='grid';
try{if(localStorage.getItem(VIEW_KEY)==='list')LVIEW='list';}catch(e){}
function libApplyView(){
  ['libgrid','favgrid'].forEach(i=>{const e=document.getElementById(i);if(e)e.classList.toggle('list',LVIEW==='list');});
  document.querySelectorAll('.vt button').forEach(b=>{const on=b.dataset.view===LVIEW;b.setAttribute('aria-pressed',on?'true':'false');b.classList.toggle('on',on);});
}
function libSetView(v){LVIEW=v;try{localStorage.setItem(VIEW_KEY,v);}catch(e){}libApplyView();requestAnimationFrame(()=>{drawLibrary();hsAll();});}
function libFill(box,ids){box.textContent='';ids.forEach(id=>box.appendChild(libCard(id)));}

/* лайк на главной: список пересортировывается сразу, карточки плавно переезжают (FLIP) */
function libReorderHome(){
  const b=document.getElementById('libcards');if(!b)return;
  const old=new Map([...b.children].map(c=>[c.dataset.font,c.getBoundingClientRect()]));
  const fid=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.lcard');const fk=fid&&fid.dataset.font;
  libRenderHome();
  if(fk){const h=b.querySelector('.lcard[data-font="'+fk+'"] .heart');if(h)h.focus({preventScroll:true});}
  const still=!(window.MO&&MO.off());
  [...b.children].forEach(c=>{
    const o=old.get(c.dataset.font),r=c.getBoundingClientRect();
    if(!still||!c.animate)return;
    if(o){const dx=o.left-r.left,dy=o.top-r.top;if(dx||dy)c.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:MO.D('base'),easing:MO.E('out')});}
    else c.animate([{opacity:0},{opacity:1}],{duration:MO.D('base'),easing:MO.E('out')});
  });
  requestAnimationFrame(drawLibrary);
}
function libRenderHome(){const b=document.getElementById('libcards');if(b)libFill(b,libHomeIds());libRenderHomeMore();hsAll();}
const plShrift=n=>n+((n%10===1&&n%100!==11)?' шрифт':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?' шрифта':' шрифтов');
const COLL=[['old','Древнерусские'],['disp','Акцидентные'],['hand','Рукописные'],['gothic','Готические']];
function libMini(id){
  const f=FONTS[id],d=document.createElement('button');d.type='button';d.className='mcard';d.dataset.font=id;
  const cv=document.createElement('canvas');cv.className='lcv';cv.dataset.font=id;cv.setAttribute('aria-hidden','true');d.appendChild(cv);
  const b=document.createElement('b');b.textContent=f.name;d.appendChild(b);
  const s=document.createElement('span');s.textContent=libCardTags(id).map(k=>tagById(k)[1]).join(' · ');d.appendChild(s);
  d.addEventListener('click',()=>libOpen(id));return d;
}
function libRenderHomeMore(){
  const col=document.getElementById('collections');
  if(col&&!col.children.length){
    const ids=libIds();
    COLL.forEach(([k,name])=>{
      const own=ids.filter(id=>libTagIds(id).includes(k));if(!own.length)return;
      const tag=tagById(k),rep=FONTS[tag[2]]?tag[2]:own[0];
      const b=document.createElement('button');b.type='button';b.className='coll';b.dataset.tag=k;
      b.innerHTML='<b></b><span></span><canvas class="lcv" data-txt="Аа" data-ink="1" aria-hidden="true"></canvas>';
      b.querySelector('b').textContent=name;b.querySelector('span').textContent=plShrift(own.length);b.querySelector('canvas').dataset.font=rep;
      b.addEventListener('click',()=>{LQ.tag=k;LQ.q='';LQ.coll='';setTab('library');});
      col.appendChild(b);});
  }
  /* «Продолжить работу» убран с главной: недавние шрифты (RECENT) и правки теперь живут в папке «Созданные шрифты» профиля (ui_prof_a.js) */
  const fav=libPopOrder(libIds().filter(id=>FAVS.has(id))).slice(0,4);
  const fill=(sec,box,ids)=>{const s=document.getElementById(sec),b=document.getElementById(box);if(!s||!b)return;b.textContent='';ids.forEach(id=>b.appendChild(libMini(id)));s.hidden=!ids.length;};
  fill('sec-favp','favprev',fav);
  const m=document.getElementById('home-more');if(m)m.hidden=!fav.length;
}
function libRenderFav(){
  const b=document.getElementById('favgrid'),e=document.getElementById('fav-empty');if(!b||!e)return;
  const ids=libPopOrder(libIds().filter(id=>FAVS.has(id)));
  libFill(b,ids);b.hidden=!ids.length;e.hidden=!!ids.length;
}
/* шапка библиотеки: «среди N шрифтов» из настоящего числа шрифтов (родительный падеж: 21 шрифта, остальные шрифтов) */
function libHeadCount(){
  const n=libIds().length,a=document.getElementById('lib-n'),w=document.getElementById('lib-nw');
  if(a)a.textContent=n;if(w)w.textContent=(n%10===1&&n%100!==11)?'шрифта':'шрифтов';
}
function libRenderLibrary(){
  const b=document.getElementById('libgrid');if(!b)return;
  const ids=libFiltered(),all=libIds().length,filt=!!(LQ.q.trim()||LQ.tags.length||LQ.coll);
  libFill(b,ids);b.hidden=!ids.length;
  document.getElementById('lib-empty').hidden=!!ids.length;
  {/* T1 v82: пустой результат называет запрос, а выход (сброс) есть и рядом со счётчиком, выше сгиба */
    const t=document.getElementById('lib-empty-t'),s2=document.getElementById('lib-empty-s'),rt=document.getElementById('lib-reset-top'),q=LQ.q.trim();
    if(t)t.textContent=q?'Ничего не найдено по запросу «'+(q.length>40?q.slice(0,40)+'…':q)+'»':'Ничего не найдено с такими фильтрами';
    if(s2)s2.textContent=q?'Проверьте написание, попробуйте другое слово или уберите фильтры.':'Уберите часть фильтров или сбросьте их все.';
    if(rt)rt.hidden=!!ids.length||!filt;}
  libHeadCount();
  {const lc=document.getElementById('lib-count'),lt=filt?'Найдено: '+ids.length+' из '+all:'Все шрифты';window.MO&&MO.num?MO.num(lc,lt):lc.textContent=lt;}
  const q=document.getElementById('lib-q');if(q&&q.value!==LQ.q)q.value=LQ.q;
  document.getElementById('lib-q-x').hidden=!LQ.q;
  document.querySelectorAll('#lib-tags .tile').forEach(t=>t.setAttribute('aria-pressed',LQ.tags.includes(t.dataset.tag)?'true':'false'));
  libRenderChips();
  document.querySelectorAll('#lib-sort button').forEach(t=>t.classList.toggle('on',t.dataset.sort===LQ.sort));
  syncLibrary();
}
/* выбранные теги: съёмные чипы в поле поиска; подсказки тегов под полем */
function libTagOff(k){LQ.tags=LQ.tags.filter(x=>x!==k);libRenderLibrary();requestAnimationFrame(drawLibrary);}
function libTagOn(k){
  if(!LQ.tags.includes(k))LQ.tags.push(k);
  /* слово, по которому нашли тег, из запроса убираем */
  const w=LQ.q.trim().split(/\s+/);w.pop();LQ.q=w.join(' ');
  const q=document.getElementById('lib-q');if(q)q.value=LQ.q;
  libRenderLibrary();requestAnimationFrame(drawLibrary);
}
function libRenderChips(){
  const box=document.getElementById('lib-fchips');if(!box)return;
  const kf=window.MO&&MO.keyed?MO.keyed:(b,keys,mk)=>{b.textContent='';keys.forEach(k=>b.appendChild(mk(k)));};
  const tags=LQ.tags.filter(k=>tagById(k));
  box.hidden=!tags.length;
  kf(box,tags,k=>{
    const t=tagById(k),b=document.createElement('button');b.type='button';b.className='fchip';b.dataset.tag=k;
    b.setAttribute('aria-label','Убрать фильтр: '+t[1]);b.title='Убрать фильтр';
    b.appendChild(document.createTextNode(t[1]));b.insertAdjacentHTML('beforeend','<i class="ico i-close" aria-hidden="true"></i>');
    b.addEventListener('click',()=>{libTagOff(k);const q=document.getElementById('lib-q');if(q)q.focus();});
    return b;
  });
  const sg=document.getElementById('lib-sug');if(!sg)return;
  const ids=libSuggest(LQ.q);
  sg.hidden=!ids.length;
  kf(sg,ids,k=>{
    const b=document.createElement('button');b.type='button';b.className='sug';b.dataset.tag=k;b.textContent=tagById(k)[1];
    b.setAttribute('aria-label','Добавить фильтр: '+tagById(k)[1]);
    b.addEventListener('mousedown',e=>e.preventDefault());
    b.addEventListener('click',()=>{libTagOn(k);const q=document.getElementById('lib-q');if(q)q.focus();});
    return b;
  });
  [...sg.children].forEach((b,i)=>b.classList.toggle('first',!i));
}
function libRenderTiles(){
  const box=document.getElementById('lib-tags');if(!box)return;box.textContent='';
  const ids=libIds();
  TILE_TAGS.map(tagById).forEach(([k,name,rep,syn])=>{
    const n=ids.filter(id=>libTagIds(id).includes(k)).length;
    const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.tag=k;b.setAttribute('aria-pressed','false');
    b.setAttribute('aria-label',name+', шрифтов: '+n);
    const c=document.createElement('span');c.className='tn';c.textContent=n;b.appendChild(c);
    const cv=document.createElement('canvas');cv.className='lcv';cv.dataset.font=FONTS[rep]?rep:ids[0];cv.dataset.txt='Аа';cv.dataset.ink='1';cv.setAttribute('aria-hidden','true');b.appendChild(cv);
    const l=document.createElement('span');l.className='tl';l.textContent=name;b.appendChild(l);
    b.addEventListener('click',()=>{LQ.tags=LQ.tags.includes(k)?LQ.tags.filter(x=>x!==k):[k];libRenderLibrary();requestAnimationFrame(drawLibrary);});
    box.appendChild(b);
  });
}
function libRenderCreate(){
  const box=document.getElementById('createcards');if(!box)return;box.textContent='';
  const d=document.createElement('button');d.type='button';d.className='lcard imp-new draw-new';d.id='draw-card';
  d.innerHTML='<span class="imp-ph" aria-hidden="true"><i class="ico i-draw"></i><span class="ex">А Б В</span></span><span class="ln">Отрисовать свой шрифт</span><span class="lt">Рисуйте буквы на холсте: контуры сами станут шрифтом</span><span class="notch" aria-hidden="true"><span class="nb go"><i class="ico i-up"></i></span></span>';
  d.addEventListener('click',()=>setTab('draw'));
  box.appendChild(d);
}
function libBuildAll(){
  libApplyView();
  libRenderHome();if(typeof hmHero==='function')try{hmHero();}catch(e){console.error(e);}libRenderCreate();libRenderTiles();libRenderLibrary();libRenderFav();libHearts();
}
/* раздел обновляется при каждом входе: порядок зависит от избранного */
function libRefresh(t){
  if(t==='home'){libRenderHome();if(typeof hmResume==='function')hmResume();}
  else if(t==='fav')libRenderFav();
  else if(t==='library')libRenderLibrary();
  libHearts();syncLibrary();
}

/* ---------- тема ---------- */
const THEME_KEY='gtype-theme-v1';
function themeStored(){try{const v=localStorage.getItem(THEME_KEY);return v==='dark'||v==='light'?v:'';}catch(e){return '';}}
function themeApply(th){
  document.documentElement.dataset.theme=th;
  const b=document.getElementById('theme-btn');
  if(b){const dark=th==='dark',l=dark?'Светлая тема':'Тёмная тема';
    b.setAttribute('aria-pressed',dark?'true':'false');b.title=l;b.dataset.tip=l;b.setAttribute('aria-label',l);
    const i=b.querySelector('.ico');if(i){i.classList.toggle('i-sun',dark);i.classList.toggle('i-moon',!dark);}}
  try{if(LIB_VIEWS[S.tab])requestAnimationFrame(drawLibrary);}catch(e){}
}
function themeSet(th){try{localStorage.setItem(THEME_KEY,th);}catch(e){}themeApply(th);}

/* ---------- окно «Отрисовать»: контракт window.GT_DRAW {mount, onShow, onHide, hasWork} ---------- */
const DRW={mounted:false,shown:false,ph:false};
function drawEnter(){
  const el=document.getElementById('view-draw'),D=window.GT_DRAW;if(!el)return;
  if(D&&typeof D.mount==='function'){
    if(!DRW.mounted){el.textContent='';DRW.ph=false;try{D.mount(el);}catch(e){console.error(e);}DRW.mounted=true;}
    if(typeof D.onShow==='function'){try{D.onShow();}catch(e){console.error(e);}}
    DRW.shown=true;return;
  }
  if(!DRW.ph){
    DRW.ph=true;el.innerHTML='<div class="empty"><i class="ico i-draw" aria-hidden="true"></i><b>Холст скоро появится</b><span>Здесь можно будет рисовать буквы и получать из них шрифт.</span><button class="btn pri" id="draw-back" type="button">На главную</button></div>';
    el.querySelector('#draw-back').addEventListener('click',()=>setTab('home'));
  }
}
function drawLeave(){
  const D=window.GT_DRAW;
  if(DRW.shown&&D&&typeof D.onHide==='function'){try{D.onHide();}catch(e){console.error(e);}}
  DRW.shown=false;
}

document.addEventListener('DOMContentLoaded',()=>{
  /* разделы: обёртка поверх остальных обёрток setTab (кернинг, импорт и т. д.) */
  const _st=setTab;
  setTab=function(t){
    if(t==='lib')t='home';
    hcHide(true);
    if(S.tab==='draw'&&t!=='draw')drawLeave();
    if(LIB_VIEWS[t])libRefresh(t);
    const r=_st.call(this,t);
    /* кернинг сам скрывает только старые разделы */
    for(const k of ['library','fav','draw']){const el=document.getElementById(TAB_VIEWS[k]);if(el&&S.tab!==k)el.hidden=true;}
    if(S.tab==='draw')drawEnter();
    return r;
  };

  /* тема: следуем системной, пока выбор не сделан вручную */
  themeApply(document.documentElement.dataset.theme==='dark'?'dark':'light');
  const tb=document.getElementById('theme-btn');
  if(tb)tb.addEventListener('click',()=>themeSet(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  try{const mq=matchMedia('(prefers-color-scheme:dark)');
    const f=e=>{if(!themeStored())themeApply(e.matches?'dark':'light');};
    if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f);}catch(e){}

  /* поиск и фильтры */
  const lq=document.getElementById('lib-q'),hq=document.getElementById('home-q');
  const goLib=()=>setTab('library');
  const upd=()=>{libRenderLibrary();requestAnimationFrame(drawLibrary);};
  if(lq){
    lq.addEventListener('input',()=>{LQ.q=lq.value;upd();});
    lq.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&lq.value){LQ.q='';lq.value='';upd();}
      else if(e.key==='Enter'&&!e.isComposing){const sg=libSuggest(LQ.q);if(sg.length){e.preventDefault();libTagOn(sg[0]);}}
      else if(e.key==='Backspace'&&!lq.value&&LQ.tags.length){e.preventDefault();libTagOff(LQ.tags[LQ.tags.length-1]);}
    });
    document.getElementById('lib-search').addEventListener('submit',e=>{e.preventDefault();lq.blur();});
    document.getElementById('lib-q-x').addEventListener('click',()=>{LQ.q='';lq.value='';upd();lq.focus();});
  }
  if(hq)document.getElementById('home-search').addEventListener('submit',e=>{e.preventDefault();LQ.q=hq.value.trim();LQ.tag='';LQ.coll='';hq.value='';goLib();});
  const af=document.getElementById('all-fonts');
  if(af)af.addEventListener('click',()=>{LQ.q='';LQ.tag='';LQ.coll='';goLib();});
  document.querySelectorAll('#lib-sort button').forEach(b=>b.addEventListener('click',()=>{LQ.sort=b.dataset.sort;upd();}));
  for(const rs of [document.getElementById('lib-reset'),document.getElementById('lib-reset-top')])
    if(rs)rs.addEventListener('click',()=>{LQ.q='';LQ.tag='';LQ.coll='';upd();const q=document.getElementById('lib-q');if(q)q.focus({preventScroll:true});});
  const fg=document.getElementById('fav-go');
  if(fg)fg.addEventListener('click',()=>{LQ.q='';LQ.tag='';LQ.coll='';goLib();});
  libHearts();
});

/* ---------- всплывающая карточка шрифта ----------
   Через ~0,7 с после наведения (отменяется, если курсор ушёл), сразу при фокусе с клавиатуры, по долгому нажатию на сенсорном экране.
   Остаётся, пока курсор на карточке или на самом окне; закрывается при уходе, Esc, прокрутке, смене раздела. Данные: fmeta(id). */
const HC={el:null,id:null,anchor:null,tIn:0,tOut:0,tDemo:0,tLp:0,si:0,typed:false,via:'',t0:0,supUntil:0,lpXY:null};
const HC_DELAY=700,HC_LEAVE=220;
const HC_STYLE={regular:'Прямой',italic:'Италик'};
function hcBuild(){
  if(HC.el)return HC.el;
  const e=document.createElement('div');e.id='hcard';e.className='hcard';e.setAttribute('role','dialog');e.hidden=true;
  e.innerHTML='<div class="hc-h"><b class="hc-n"></b><span class="hc-y"></span></div><p class="hc-d"></p><div class="hc-tags tags"></div>'
    +'<div class="hc-demo"><canvas class="hc-cv" aria-hidden="true" title="Нажмите и печатайте свой текст"></canvas><input class="hc-in" type="text" maxlength="80" aria-label="Свой текст для образца: печатайте прямо в образце" autocomplete="off" spellcheck="false"></div>'
    +'<div class="hc-w" hidden></div><dl class="hc-m"></dl>'
    +'<div class="hc-act"><button class="btn pri hc-open" type="button">Открыть в редакторе</button><button class="hc-heart" type="button" aria-pressed="false"><i class="ico"></i></button></div>';
  document.body.appendChild(e);HC.el=e;
  e.querySelector('.hc-open').addEventListener('click',()=>{const id=HC.id;hcHide(true);if(id)libOpen(id);});
  e.querySelector('.hc-heart').addEventListener('click',()=>{
    const id=HC.id;if(!id)return;const on=!FAVS.has(id);favSet(id,on);toast(on?'Добавлено в избранное':'Убрано из избранного');
    if(S.tab==='home')libReorderHome();hcHeart();
  });
  const inp=e.querySelector('.hc-in');
  smpAttach('hc',{cv:e.querySelector('.hc-cv'),box:e.querySelector('.hc-demo'),ta:inp,multi:false,max:80,on:()=>!e.hidden});
  inp.addEventListener('input',()=>{HC.typed=!!inp.value;hcDemo();});
  e.addEventListener('pointerenter',hcKeep);
  e.addEventListener('pointerleave',ev=>{if(!hcOnAnchor(ev.relatedTarget))hcLater();});
  e.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();hcHide(true);}});
  return e;
}
function hcOnAnchor(n){return !!(n&&HC.anchor&&n.nodeType===1&&HC.anchor.contains(n));}
function hcAnchor(){
  if(HC.anchor&&document.body.contains(HC.anchor))return HC.anchor;
  const a=HC.id&&document.querySelector('.libview:not([hidden]) .lcard[data-font="'+HC.id+'"]');
  HC.anchor=a||null;return HC.anchor;
}
function hcHeart(){
  const b=HC.el&&HC.el.querySelector('.hc-heart');if(!b||!HC.id)return;
  const on=FAVS.has(HC.id),l=(on?'Убрать из избранного: ':'В избранное: ')+fmeta(HC.id).name;
  b.setAttribute('aria-pressed',on?'true':'false');b.title=l;b.setAttribute('aria-label',l);
}
function hcFill(id){
  const e=HC.el,m=fmeta(id);
  e.setAttribute('aria-label','Шрифт «'+m.name+'»');
  e.querySelector('.hc-n').textContent=m.name;
  e.querySelector('.hc-y').textContent=m.year==null?'':String(m.year);
  e.querySelector('.hc-d').textContent=m.desc;
  const tg=e.querySelector('.hc-tags');tg.textContent='';
  m.tags.forEach(k=>{const b=document.createElement('button');b.type='button';b.className='tag';b.dataset.tag=k;b.textContent=tagById(k)[1];
    b.addEventListener('click',()=>libTagGo(k));tg.appendChild(b);});
  tg.hidden=!m.tags.length;
  const dl=e.querySelector('.hc-m');dl.textContent='';
  const row=(k,v)=>{const d=document.createElement('div');d.innerHTML='<dt></dt><dd></dd>';d.firstChild.textContent=k;d.lastChild.textContent=v;dl.appendChild(d);};
  if(m.glyphs)row('Знаков',String(m.glyphs));
  row('Набор',m.charset==='basic'?'Базовый':'Расширенный');
  row('Начертания',m.styles.map(k=>HC_STYLE[k]||k).join(', ')||'Прямой');
  e.querySelector('.hc-in').value='';HC.typed=false;HC.si=0;
  const w=e.querySelector('.hc-w');w.textContent='';
  m.weights.forEach(wn=>{const c=document.createElement('div');c.className='hc-wc';c.innerHTML='<canvas aria-hidden="true"></canvas><span></span>';c.dataset.w=wn;c.lastChild.textContent=wn;w.appendChild(c);});
  w.hidden=!m.weights.length;
  hcHeart();
}
/* образец: слова переносятся по строкам, размер подбирается так, чтобы уместиться в две строки */
function hcLines(id,txt,cvw){
  const words=txt.split(/\s+/).filter(Boolean),sp=libRun(id,' ');
  const run=words.map(w=>libRun(id,w)),cap=(run[0]||sp).cap,gap=sp.tot||cap*0.3;
  for(const px of [26,22,18,15,12]){
    const sc=px/cap,avail=cvw-24,lines=[];let cur=null;
    run.forEach((r,i)=>{const w=r.tot*sc;
      if(cur&&cur.w+gap*sc+w<=avail){cur.w+=gap*sc+w;cur.ws.push(i);}else{cur={w,ws:[i]};lines.push(cur);}});
    if(lines.length<=2||px===12)return {px,sc,lines,run,gap,cap};
  }
}
function hcDemo(){
  const e=HC.el;if(!e||e.hidden||!HC.id)return;
  const id=HC.id,cv=e.querySelector('.hc-cv'),inp=e.querySelector('.hc-in');
  const list=((FONT_META[id]||{}).sample?[FONT_META[id].sample]:[]).concat(FM_SAMPLES);
  const txt=HC.typed?inp.value:list[HC.si%list.length];
  const back=S.fontId;
  try{useFont(id);
    const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
    const L=hcLines(id,txt,w);if(!L)return;
    const lh=L.px*1.5,y0=(h-(L.lines.length-1)*lh-L.px)/2+L.px;
    c.fillStyle=css('--glyph');const RC=[];
    L.lines.forEach((ln,li)=>{let x=12;
      ln.ws.forEach(i=>{const r=L.run[i];
        for(const [g,xx,ch] of r.items){RC.push({ch,x0:x+xx*L.sc,x1:x+(xx+g.adv)*L.sc,y0:y0+li*lh-L.px*0.8,y1:y0+li*lh+L.px*0.22});c.fill(pathOf(g.cs,(px,py)=>[x+xx*L.sc+px*L.sc,y0+li*lh-py*L.sc]),'nonzero');}
        x+=r.tot*L.sc+L.gap*L.sc;});});
    smpCommit('hc',[RC],HC.typed?inp.value:'',{left:12,line:{y0:y0-L.px*0.8,y1:y0+L.px*0.22},pitch:lh,spw:L.gap*L.sc});
  }finally{useFont(back);}
}
function hcWeights(){
  const e=HC.el,id=HC.id;if(!e||!id)return;
  const cells=e.querySelectorAll('.hc-wc');if(!cells.length)return;
  const back=S.fontId;
  try{useFont(id);
    cells.forEach(cell=>{
      const cv=cell.querySelector('canvas'),{c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
      const r=libRun(id,'Аа',cell.dataset.w),px=h*0.46,sc=px/r.cap,base=h*0.5+px*0.5;
      c.fillStyle=css('--glyph');
      for(const [g,xx] of r.items)c.fill(pathOf(g.cs,(qx,qy)=>[(w-r.tot*sc)/2+xx*sc+qx*sc,base-qy*sc]),'nonzero');
    });
  }finally{useFont(back);}
}
function hcPlace(){
  const e=HC.el,a=hcAnchor();if(!e||!a){hcHide(true);return;}
  const r=a.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight,m=8,gap=6;
  e.style.width=Math.min(340,vw-2*m)+'px';e.style.left='0px';e.style.top='0px';
  const w=e.offsetWidth,h=e.offsetHeight,cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  let x,y,side;
  if(vw-r.right-gap-m>=w){x=r.right+gap;y=r.top;side='r';}
  else if(r.left-gap-m>=w){x=r.left-gap-w;y=r.top;side='l';}
  else{x=cl(r.left+(r.width-w)/2,m,vw-w-m);
    if(vh-r.bottom-gap-m>=h){y=r.bottom+gap;side='b';}else if(r.top-gap-m>=h){y=r.top-gap-h;side='t';}else{y=r.bottom+gap;side='b';}}
  y=cl(y,m,Math.max(m,vh-h-m));
  e.style.left=Math.round(x)+'px';e.style.top=Math.round(y)+'px';e.dataset.side=side;
}
function hcShow(card,via){
  const id=card&&card.dataset.font;if(!id||!FONTS[id]||card.classList.contains('imp-new'))return;
  clearTimeout(HC.tIn);clearTimeout(HC.tOut);
  const e=hcBuild();
  if(HC.id!==id||e.hidden)hcFill(id);
  HC.id=id;HC.anchor=card;HC.via=via||'mouse';HC.t0=performance.now();
  e.hidden=false;hcPlace();hcDemo();hcWeights();
  requestAnimationFrame(()=>e.classList.add('on'));
  clearInterval(HC.tDemo);
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches)
    HC.tDemo=setInterval(()=>{const i=HC.el&&HC.el.querySelector('.hc-in');if(HC.typed||(i&&document.activeElement===i))return;HC.si++;hcDemo();},2600);
}
function hcHide(hard){
  if(hard){clearTimeout(HC.tIn);clearTimeout(HC.tLp);}
  clearTimeout(HC.tOut);clearInterval(HC.tDemo);
  const e=HC.el;if(!e||e.hidden)return;
  e.classList.remove('on');e.hidden=true;HC.anchor=null;
}
function hcKeep(){clearTimeout(HC.tOut);}
function hcLater(){clearTimeout(HC.tOut);if(HC.el&&!HC.el.hidden)HC.tOut=setTimeout(()=>hcHide(),HC_LEAVE);}
function hcCard(n){return n&&n.closest?n.closest('.lcard[data-font]:not(.imp-new)'):null;}
document.addEventListener('pointerover',e=>{
  if(e.pointerType==='touch')return;
  const c=hcCard(e.target);
  if(HC.el&&HC.el.contains(e.target)){hcKeep();return;}
  if(!c)return;
  if(!HC.el||HC.el.hidden||HC.anchor!==c){
    if(c.contains(e.relatedTarget))return;
    clearTimeout(HC.tIn);HC.tIn=setTimeout(()=>hcShow(c,'mouse'),HC_DELAY);
  }else hcKeep();
},true);
document.addEventListener('pointerout',e=>{
  if(e.pointerType==='touch')return;
  const c=hcCard(e.target);if(!c)return;
  if(c.contains(e.relatedTarget))return;
  clearTimeout(HC.tIn);
  if(HC.el&&HC.el.contains(e.relatedTarget))return;
  hcLater();
},true);
document.addEventListener('focusin',e=>{
  const c=hcCard(e.target);
  if(c&&e.target===c){try{if(!c.matches(':focus-visible'))return;}catch(x){return;}hcShow(c,'kb');}
  else if(HC.el&&!HC.el.hidden&&!HC.el.contains(e.target)&&!(HC.anchor&&HC.anchor.contains(e.target)))hcHide();
});
document.addEventListener('focusout',e=>{
  if(HC.via!=='kb'||!HC.el||HC.el.hidden)return;
  const n=e.relatedTarget;if(n&&(HC.el.contains(n)||(HC.anchor&&HC.anchor.contains(n))))return;
  hcHide();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&HC.el&&!HC.el.hidden){hcHide(true);}},true);
document.addEventListener('scroll',e=>{
  if(!HC.el||HC.el.hidden||HC.el.contains(e.target))return;
  if(HC.via==='kb'&&performance.now()-HC.t0<250)return;/* фокус сам подкручивает карточку в видимую область */
  hcHide(true);
},true);
window.addEventListener('resize',()=>hcHide(true));
document.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){
    const c=hcCard(e.target);
    if(HC.el&&!HC.el.hidden&&!HC.el.contains(e.target)&&c!==HC.anchor)hcHide(true);
    if(c&&!e.target.closest('.heart,.tag')){HC.lpXY=[e.clientX,e.clientY];clearTimeout(HC.tLp);
      HC.tLp=setTimeout(()=>{HC.supUntil=Date.now()+900;hcShow(c,'touch');},550);}
  }else if(HC.el&&!HC.el.hidden&&!HC.el.contains(e.target))hcHide(true);
},true);
['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>clearTimeout(HC.tLp),true));
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&HC.lpXY&&Math.hypot(e.clientX-HC.lpXY[0],e.clientY-HC.lpXY[1])>10)clearTimeout(HC.tLp);},true);
document.addEventListener('contextmenu',e=>{if(HC.supUntil>Date.now()&&hcCard(e.target))e.preventDefault();},true);
document.addEventListener('click',e=>{if(HC.supUntil>Date.now()&&hcCard(e.target)){e.stopPropagation();e.preventDefault();}},true);

/* ---------- ряды в одну строку: затухание у краёв и стрелки ---------- */
const HS_FADE='#lib-tags,#lib-sort,.meth .row,.imp-bar,.imp-pend .pc,.pn-pre,.kk-bar,.kk-ctl,.kk-flags,.ptools,.cmpbar,.chiprow,.proof .seg,.cu-row,#cu-cap,#cu-type,#libcards,.pb-row,#dm-home,#view-edit .glyphs,.tools,#dr-sets,#dr-strip,.xpv-fmt,.lt-chips,.vtabs,.tt-tabs,.tt-bar .seg,.hs-fade';
function hsUpd(el){
  const cs=getComputedStyle(el),pl=parseFloat(cs.paddingLeft)||0,pr=parseFloat(cs.paddingRight)||0,l=el.scrollLeft>pl+2,r=el.scrollLeft+el.clientWidth<el.scrollWidth-pr-2;/* внутренний отступ не считается «скрытым» содержимым */
  el.classList.add('hs-fade');el.dataset.hs=(l?'l ':'')+(r?'r':'');
  if(el.id==='libcards'){const p=document.getElementById('pop-prev'),n=document.getElementById('pop-next');if(p)p.disabled=!l;if(n)n.disabled=!r;}
}
function vsUpd(el){const t=el.scrollTop>2,b=el.scrollTop+el.clientHeight<el.scrollHeight-2;el.dataset.vs=(t?'t ':'')+(b?'b':'');}/* то же по вертикали: меню с прокруткой */
function hsAll(){document.querySelectorAll(HS_FADE).forEach(hsUpd);document.querySelectorAll('.xmenu').forEach(vsUpd);}
let hsT=0;const hsSoon=()=>{if(!hsT)hsT=requestAnimationFrame(()=>{hsT=0;hsAll();});};
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.matches){if(t.matches(HS_FADE))hsUpd(t);else if(t.matches('.xmenu'))vsUpd(t);}},true);
document.addEventListener('click',()=>hsSoon(),true);
window.addEventListener('resize',hsSoon);
document.addEventListener('DOMContentLoaded',()=>{
  try{new MutationObserver(hsSoon).observe(document.body,{childList:true,subtree:true});}catch(e){}
  const by=d=>{const b=document.getElementById('libcards');if(b)b.scrollBy({left:d*Math.max(240,b.clientWidth*.8),behavior:'smooth'});};
  const p=document.getElementById('pop-prev'),n=document.getElementById('pop-next'),fa=document.getElementById('fav-all');
  if(p)p.addEventListener('click',()=>by(-1));if(n)n.addEventListener('click',()=>by(1));
  if(fa)fa.addEventListener('click',()=>setTab('fav'));
  document.querySelectorAll('.vt button').forEach(b=>b.addEventListener('click',()=>libSetView(b.dataset.view)));
  libApplyView();
  hsSoon();
});
