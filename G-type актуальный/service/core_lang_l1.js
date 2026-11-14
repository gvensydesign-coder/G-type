/* ===== core_lang_l1: поддержка языков (база данных языков и подсчёт покрытия) =====
   Источник букв — основные (main) наборы CLDR; вспомогательные (auxiliary) буквы не требуются.
   Язык поддержан, когда в шрифте есть ВСЕ буквы алфавита (прописные и строчные), нужная пунктуация
   (общая: . , : ; ! ? - ( ) – —; № у ru/uk/be/bg; апостроф у uk/be/en/fr/it) и пара основных кавычек языка
   (любая из допустимых пар). «Почти поддержан»: нет не более четверти букв (или нет только знаков) —
   список недостающих знаков возвращается как есть («Украинский: не хватает Ґ ґ Є є І і Ї ї»).
   Локальные формы (locl: BGR для болгарского, SRB для сербского и македонского) не входят в условие поддержки,
   а показываются отдельно: langOf(...).loclNeed / loclHave.
   Набор знаков берётся из FONTS[id].CHARSET, то есть из того же списка, из которого buildTTF строит cmap:
   так же считается и шрифт пользователя («Свой шрифт»), и нарисованный. Все данные — строки: LANG_DB сериализуется в JSON
   (tests/meta_check.py пересчитывает покрытие по cmap готового TTF тем же правилом).
   Поля: id, name (русское название для интерфейса), sc ('cyr'|'lat'), lo (строчные буквы в порядке алфавита),
   up (прописные в том же порядке; пусто — получить toUpperCase, '-' в позиции — прописной нет),
   q (допустимые пары основных кавычек, первая — основная), x (обязательные доп. знаки), any (группы «любой из»),
   locl ('BGR'|'SRB'|'') — какие локальные формы нужны. */
const LANG_CORE='.,:;!?-()–—';
const LANG_APOS=["'’"];
const LANG_DB=[
  /* кириллица */
  {id:'ru',name:'Русский',sc:'cyr',lo:'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',q:['«»'],x:'№'},
  {id:'uk',name:'Украинский',sc:'cyr',lo:'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя',q:['«»'],x:'№',any:LANG_APOS},
  {id:'be',name:'Белорусский',sc:'cyr',lo:'абвгдеёжзійклмнопрстуўфхцчшыьэюя',q:['«»','„“'],x:'№',any:LANG_APOS},
  {id:'bg',name:'Болгарский',sc:'cyr',lo:'абвгдежзийклмнопрстуфхцчшщъьюя',q:['„“','«»'],x:'№',locl:'BGR'},
  {id:'sr',name:'Сербский (кириллица)',sc:'cyr',lo:'абвгдђежзијклљмнњопрстћуфхцчџш',q:['„“','«»','’’'],locl:'SRB'},
  {id:'mk',name:'Македонский',sc:'cyr',lo:'абвгдѓежзѕијклљмнњопрстќуфхцчџш',q:['„“','«»'],locl:'SRB'},
  {id:'kk',name:'Казахский',sc:'cyr',lo:'аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя',q:['«»','„“']},
  {id:'tt',name:'Татарский',sc:'cyr',lo:'аәбвгдеёжҗзийклмнңоөпрстуүфхһцчшщъыьэюя',q:['«»','„“']},
  {id:'ba',name:'Башкирский',sc:'cyr',lo:'абвгғдҙеёжзийкҡлмнңоөпрсҫтуүфхһцчшщъыьэәюя',q:['«»','„“']},
  {id:'ky',name:'Киргизский',sc:'cyr',lo:'абвгдеёжзийклмнңоөпрстуүфхцчшщъыьэюя',q:['«»','„“']},
  {id:'mn',name:'Монгольский',sc:'cyr',lo:'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя',q:['«»','„“']},
  /* латиница */
  {id:'en',name:'Английский',sc:'lat',lo:'abcdefghijklmnopqrstuvwxyz',q:['“”'],any:LANG_APOS},
  {id:'de',name:'Немецкий',sc:'lat',lo:'aäbcdefghijklmnoöpqrsßtuüvwxyz',up:'AÄBCDEFGHIJKLMNOÖPQRS-TUÜVWXYZ',q:['„“','»«']},
  {id:'fr',name:'Французский',sc:'lat',lo:'aàâæbcçdeéèêëfghiîïjklmnoôœpqrstuùûüvwxyÿz',q:['«»'],any:LANG_APOS},
  {id:'es',name:'Испанский',sc:'lat',lo:'aábcdeéfghiíjklmnñoópqrstuúüvwxyz',q:['«»','“”'],x:'¡¿'},
  {id:'it',name:'Итальянский',sc:'lat',lo:'aàbcdeéèfghiìlmnoóòpqrstuùvz',q:['«»','“”'],any:LANG_APOS},
  {id:'pt',name:'Португальский',sc:'lat',lo:'aáâãàbcçdeéêfghiíjklmnoóôõpqrstuúvwxyz',q:['“”','«»']},
  {id:'nl',name:'Нидерландский',sc:'lat',lo:'abcdefghijklmnopqrstuvwxyz',q:['“”','„”']},
  {id:'pl',name:'Польский',sc:'lat',lo:'aąbcćdeęfghijklłmnńoóprsśtuwyzźż',q:['„”','«»']},
  {id:'cs',name:'Чешский',sc:'lat',lo:'aábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzž',q:['„“','»«']},
  {id:'sk',name:'Словацкий',sc:'lat',lo:'aáäbcčdďeéfghiíjklĺľmnňoóôpqrŕsštťuúvwxyýzž',q:['„“','»«']},
  {id:'hu',name:'Венгерский',sc:'lat',lo:'aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz',q:['„”','»«']},
  {id:'ro',name:'Румынский',sc:'lat',lo:'aăâbcdefghiîjklmnopqrsștțuvwxyz',q:['„”','«»']},
  {id:'tr',name:'Турецкий',sc:'lat',lo:'abcçdefgğhıijklmnoöprsştuüvyz',up:'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',q:['“”','«»']},
  {id:'hr',name:'Хорватский / сербский (латиница)',sc:'lat',lo:'abcčćdđefghijklmnoprsštuvzž',q:['„“','»«']},
  {id:'sl',name:'Словенский',sc:'lat',lo:'abcčdefghijklmnoprsštuvzž',q:['„“','»«']},
  {id:'lt',name:'Литовский',sc:'lat',lo:'aąbcčdeęėfghiįyjklmnoprsštuųūvzž',q:['„“']},
  {id:'lv',name:'Латышский',sc:'lat',lo:'aābcčdeēfgģhiījkķlļmnņoprsštuūvzž',q:['„“','«»']},
  {id:'et',name:'Эстонский',sc:'lat',lo:'abdefghijklmnoprsšzžtuvõäöü',q:['„“','«»']},
  {id:'fi',name:'Финский',sc:'lat',lo:'abcdefghijklmnopqrsštuvwxyzžåäö',q:['”','»']},
  {id:'sv',name:'Шведский',sc:'lat',lo:'abcdefghijklmnopqrstuvwxyzåäö',q:['”','»']},
  {id:'nb',name:'Норвежский',sc:'lat',lo:'abcdefghijklmnopqrstuvwxyzæøå',q:['«»','„“']},
  {id:'da',name:'Датский',sc:'lat',lo:'abcdefghijklmnopqrstuvwxyzæøå',q:['»«','„“']},
  {id:'is',name:'Исландский',sc:'lat',lo:'aábdðeéfghiíjklmnoóprstuúvxyýþæö',q:['„“','«»']},
  {id:'az',name:'Азербайджанский',sc:'lat',lo:'abcçdeəfgğhxıijkqlmnoöprsştuüvyz',up:'ABCÇDEƏFGĞHXIİJKQLMNOÖPRSŞTUÜVYZ',q:['“”','«»']},
  {id:'uz',name:'Узбекский (латиница)',sc:'lat',lo:'abcdefghijklmnopqrstuvxyz',q:['«»','“”'],x:'ʻʼ'}
];
/* прописная пара к строчной: '' — прописной буквы нет */
function langUpper(L,i){
  const lo=Array.from(L.lo)[i];
  if(L.up){const u=Array.from(L.up)[i];return u==='-'?'':u;}
  const u=lo.toUpperCase();return (Array.from(u).length===1&&u!==lo)?u:'';
}
/* буквы языка: [[строчная, прописная], ...] в порядке алфавита */
function langLetters(L){return Array.from(L.lo).map((lo,i)=>[lo,langUpper(L,i)]);}
const LANG_BY_ID={};LANG_DB.forEach(L=>{LANG_BY_ID[L.id]=L;});
/* have — Set знаков (или строка/массив). Результат: недостающие буквы по парам («Ґ ґ»), знаки, статус */
function langOf(L,have){
  if(!(have instanceof Set))have=new Set(Array.from(typeof have==='string'?have:(have||[])));
  const lets=langLetters(L),miss=[];let missL=0;
  for(const [lo,up] of lets){
    const a=[];if(up&&!have.has(up))a.push(up);if(!have.has(lo))a.push(lo);
    if(a.length){missL++;miss.push(...a);}
  }
  const mp=[];
  for(const c of LANG_CORE+(L.x||''))if(!have.has(c))mp.push(c);
  for(const g of (L.any||[]))if(!Array.from(g).some(c=>have.has(c)))mp.push(g.charAt(0));
  /* кавычки: подходит любая полная пара; если ни одной — недостающие знаки ближайшей */
  let qBest=null;
  for(const q of (L.q||[])){const m=Array.from(new Set(Array.from(q))).filter(c=>!have.has(c));if(!qBest||m.length<qBest.length)qBest=m;}
  if(qBest)mp.push(...qBest);
  const total=lets.length;
  let status='none';
  if(!missL&&!mp.length)status='full';
  else if(missL<=Math.floor(total*0.25))status='almost';
  return {id:L.id,name:L.name,sc:L.sc,status,total,missL,missing:miss,missPunct:mp,
    cost:miss.length+mp.length,loclNeed:L.locl||''};
}
/* набор знаков шрифта; для шрифта пользователя — то, что реально попадёт в cmap */
function langSet(fontId){
  const f=(typeof FONTS!=='undefined')&&FONTS[fontId];
  return new Set(f&&f.CHARSET?f.CHARSET:[]);
}
function langHasLocl(fontId,tag){
  const f=(typeof FONTS!=='undefined')&&FONTS[fontId];if(!f||!f.GL)return false;
  const suf='.locl'+tag;for(const k in f.GL)if(k.length>suf.length&&k.endsWith(suf))return true;return false;
}
const LANG_MEMO={};
/* покрытие шрифта: [{...langOf, loclHave}] по всем языкам базы; кэш по набору знаков */
function langCover(fontId,have){
  const set=have instanceof Set?have:langSet(fontId);
  const key=(have?'*':fontId)+'|'+Array.from(set).join('');
  if(LANG_MEMO[key])return LANG_MEMO[key];
  const out=LANG_DB.map(L=>{const r=langOf(L,set);r.loclHave=r.loclNeed?(have?false:langHasLocl(fontId,r.loclNeed)):false;return r;});
  const ks=Object.keys(LANG_MEMO);if(ks.length>60)delete LANG_MEMO[ks[0]];
  LANG_MEMO[key]=out;return out;
}
/* текст «не хватает …» */
const langMissText=r=>{const a=r.missing.slice();if(r.missPunct.length)a.push(...r.missPunct);return a.join(' ');};
/* ближайшие языки, которых не хватает чуть-чуть: для «что нарисовать дальше» (по стоимости, затем по порядку базы) */
function langNext(fontId,have,n){
  const cov=langCover(fontId,have),set=have instanceof Set?have:langSet(fontId);
  if(!set.size)return [];
  const a=cov.filter(r=>r.status!=='full'&&r.cost<r.total*2).map((r,i)=>[r,i]);
  a.sort((x,y)=>x[0].cost-y[0].cost||x[1]-y[1]);
  return a.slice(0,n||3).map(x=>x[0]);
}
/* теги для фильтра библиотеки: lang-ru … */
const langTagId=id=>'lang-'+id;
function langTagIds(fontId){return langCover(fontId).filter(r=>r.status==='full').map(r=>langTagId(r.id));}
