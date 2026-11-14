/* ===== «Сохранение процесса» (W93): черновики режимов работы =====
   Режимы: «Редактор» (параметры библиотечного шрифта), «Отрисовка» (холст), «Импорт» (свой шрифт из файлов; сюда же редактор шрифта «Свой шрифт»).
   Правила: описание в MANIFEST.md (W93) и DESIGN_SYSTEM.md (раздел 21).
   — Новый вход в режим (с главной, из библиотеки, рейла, профиля) начинается с чистого состояния. Перезагрузка вкладки восстанавливает экран и работу как раньше.
   — Уход из режима кнопкой приложения (рейл, логотип, «Назад» браузера) с изменениями: окно «Сохранить процесс?» (PF.modal; на телефоне шторка).
   — Закрытие вкладки: окно показать нельзя. При скрытии страницы пишется метка; в новой сессии процесс уходит в «автосохранение» (черновик со значком) и один раз показывается плашка.
   — Черновики: IndexedDB gtype-drafts-v1 (запасной путь localStorage), схема v1, не больше 30, проверка и ограничение значений при открытии.
   Тесты: tests/e2e_drafts.py. Хуки тестов: window.GT_DRAFTS. */
(function(){
'use strict';
const PF=window.PROF;if(!PF)return;
const SCHEMA=1,MAXD=30,DBN='gtype-drafts-v1',LSP='gtype-drafts-v1-',PREF_KEY='gtype-drafts-pref-v1',MARK_KEY='gtype-drafts-mark-v1',SESS_KEY='gtype-dsess-v1',NS_KEY='gtype-sess-v1',DRK='gtype-draw-n7';
const MODES={edit:'Редактор',draw:'Отрисовка',import:'Импорт'};
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const {esc,ic,plural,$1,$A}=PF;
const mo=()=>window.MO||{off:()=>true,D:()=>0,E:()=>'ease'};
const clone=o=>JSON.parse(JSON.stringify(o));
const p2=n=>(n<10?'0':'')+n;
const DR={list:[],bad:[],ready:false,undo:null,editId:null,note:null,cb:[]};
let NEWSESS=true,NAV0=null,MARK0=null;
try{NAV0=JSON.parse(localStorage.getItem('gtype-nav-v1')||'null');}catch(e){}
try{MARK0=JSON.parse(localStorage.getItem('gtype-drafts-mark-v1')||'null');}catch(e){}
try{NEWSESS=!sessionStorage.getItem(NS_KEY);sessionStorage.setItem(NS_KEY,'1');}catch(e){}
const G=window.GT_DRAFTS={newSession:NEWSESS,restoring:false,max:MAXD,schema:SCHEMA};

/* ---------- настройка «при выходе» ---------- */
function getPref(){try{const v=localStorage.getItem(PREF_KEY);return v==='save'||v==='discard'?v:'ask';}catch(e){return 'ask';}}
function setPref(v){try{if(v==='ask')localStorage.removeItem(PREF_KEY);else localStorage.setItem(PREF_KEY,v);}catch(e){}}

/* ---------- устойчивая строка и подпись ---------- */
function stab(o){
  if(o&&typeof o==='object'){
    if(Array.isArray(o))return '['+o.map(stab).join(',')+']';
    return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+stab(o[k])).join(',')+'}';
  }
  return JSON.stringify(o===undefined?null:o);
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+s.length.toString(36);}
const cleanName=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,40);
function fmtAbs(t){const d=new Date(t);return d.getDate()+' '+MON[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():'')+', '+p2(d.getHours())+':'+p2(d.getMinutes());}
function fmtRel(t){
  const d=new Date(t),n=new Date(),hm=p2(d.getHours())+':'+p2(d.getMinutes()),sd=x=>x.getFullYear()*372+x.getMonth()*31+x.getDate(),dd=sd(n)-sd(d);
  if(dd===0)return 'сегодня, '+hm;if(dd===1)return 'вчера, '+hm;return fmtAbs(t);
}

/* ---------- хранилище: IndexedDB, запасной путь localStorage, иначе только память ---------- */
const ST={kind:null,db:null,p:null};
function stOpen(){
  if(ST.p)return ST.p;
  ST.p=new Promise(res=>{
    const ls=()=>{try{localStorage.setItem(LSP+'t','1');localStorage.removeItem(LSP+'t');ST.kind='ls';}catch(e){ST.kind='mem';}res(ST.kind);};
    try{
      if(!window.indexedDB){ls();return;}
      const q=indexedDB.open(DBN,1);
      q.onupgradeneeded=()=>{try{q.result.createObjectStore('d',{keyPath:'id'});}catch(e){}};
      q.onsuccess=()=>{ST.db=q.result;ST.kind='idb';res('idb');};
      q.onerror=()=>ls();q.onblocked=()=>ls();
    }catch(e){ls();}
    setTimeout(()=>{if(!ST.kind)ls();},4000);
  });
  return ST.p;
}
const isQuota=e=>!!e&&(e.name==='QuotaExceededError'||e.code===22||/quota/i.test(String(e.message||e)));
function stAll(){
  return stOpen().then(k=>new Promise(res=>{
    if(k==='idb'){
      try{const tx=ST.db.transaction('d','readonly'),rq=tx.objectStore('d').getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>res([]);}catch(e){res([]);}
    }else if(k==='ls'){
      const out=[];try{const ix=JSON.parse(localStorage.getItem(LSP+'idx')||'[]');for(const id of ix){try{const r=JSON.parse(localStorage.getItem(LSP+'d-'+id));if(r)out.push(r);}catch(e){out.push({id:String(id),__broken:true});}}}catch(e){}res(out);
    }else res([]);
  }));
}
function stPut(rec){
  return stOpen().then(k=>new Promise(res=>{
    if(k==='idb'){
      try{
        const tx=ST.db.transaction('d','readwrite');tx.objectStore('d').put(rec);
        tx.oncomplete=()=>res({ok:true});
        tx.onerror=()=>res({ok:false,quota:isQuota(tx.error)});
        tx.onabort=()=>res({ok:false,quota:isQuota(tx.error)});
      }catch(e){res({ok:false,quota:isQuota(e)});}
    }else if(k==='ls'){
      try{
        localStorage.setItem(LSP+'d-'+rec.id,JSON.stringify(rec));
        let ix=[];try{ix=JSON.parse(localStorage.getItem(LSP+'idx')||'[]');}catch(e){}
        if(!ix.includes(rec.id)){ix.push(rec.id);localStorage.setItem(LSP+'idx',JSON.stringify(ix));}
        res({ok:true});
      }catch(e){res({ok:false,quota:isQuota(e)});}
    }else res({ok:false,quota:false});
  }));
}
function stDel(id){
  return stOpen().then(k=>new Promise(res=>{
    if(k==='idb'){
      try{const tx=ST.db.transaction('d','readwrite');tx.objectStore('d').delete(id);tx.oncomplete=()=>res(true);tx.onerror=tx.onabort=()=>res(false);}catch(e){res(false);}
    }else if(k==='ls'){
      try{localStorage.removeItem(LSP+'d-'+id);let ix=JSON.parse(localStorage.getItem(LSP+'idx')||'[]');ix=ix.filter(x=>x!==id);localStorage.setItem(LSP+'idx',JSON.stringify(ix));}catch(e){}res(true);
    }else res(true);
  }));
}

/* ---------- проверка записи черновика ---------- */
const FIDRE=/^[A-Za-z0-9_-]{1,40}$/;
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function checkRec(r){
  if(!isObj(r)||r.__broken)return 'broken';
  if(typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(r.id))return 'broken';
  if(typeof r.v!=='number'||!isFinite(r.v))return 'broken';
  if(r.v>SCHEMA)return 'newer';if(r.v<SCHEMA)return 'old';
  if(!MODES[r.mode]||!isObj(r.data)||typeof r.name!=='string')return 'broken';
  if(!(r.u>0))return 'broken';
  return AD[r.mode].check(r);
}
function normRec(r){
  return {id:r.id,v:r.v,mode:MODES[r.mode]?r.mode:'edit',name:cleanName(r.name)||'Черновик',fid:typeof r.fid==='string'?r.fid.slice(0,40):'',fname:cleanName(r.fname),
    t:+r.t>0?+r.t:(+r.u>0?+r.u:0),u:+r.u>0?+r.u:0,auto:!!r.auto,smp:typeof r.smp==='string'?r.smp.slice(0,16):'',data:r.data};
}

/* ---------- адаптеры режимов ---------- */
const lat0=l=>{if(!l)return false;try{return PF.test.latMoved(l);}catch(e){return false;}};
/* слот библиотечного шрифта: только то, что правил пользователь (отличия от значений по умолчанию); не зависит от ленивых значений по умолчанию */
function slotForm(id,sl){
  const F=FONTS[id];if(!F||!sl||!sl.styles)return null;
  const out={},D=F.DEFAULTS||{};let any=false;
  if(sl.family&&F.family&&sl.family!==F.family){out.f=sl.family;any=true;}
  if(sl.edits&&Object.keys(sl.edits).some(k=>{const e=sl.edits[k];return e&&(typeof e!=='object'||Object.keys(e).length);})){
    const e={};for(const k of Object.keys(sl.edits)){const v=sl.edits[k];if(v&&(typeof v!=='object'||Object.keys(v).length))e[k]=v;}out.e=e;any=true;}
  if(sl.custom&&Object.keys(sl.custom).length){out.c=sl.custom;any=true;}
  const s={};
  for(const k of ['regular','italic']){
    const st=sl.styles[k],d=D[k];if(!st)continue;const o={};
    if(st.p&&d){const p={};for(const q of Object.keys(d)){const a=st.p[q],b=d[q];if(typeof b==='number'?Math.abs((+a||0)-b)>1e-6:(a!==undefined&&a!==b))p[q]=a;}
      for(const q of Object.keys(st.p))if(!(q in d)&&q!=='chamfer'&&st.p[q]!==undefined)p[q]=st.p[q];
      if(Object.keys(p).length)o.p=p;}
    if(lat0(st.lat))o.l=st.lat;
    if(st.hg&&st.hg.length)o.h=st.hg;
    if(st.ku&&Object.keys(st.ku).length)o.u=st.ku;
    if(st.kc&&Object.keys(st.kc).length)o.k=st.kc;
    if(Object.keys(o).length){s[k]=o;any=true;}
  }
  if(Object.keys(s).length)out.s=s;
  return any?out:null;
}
function slotData(id){
  /* то, что нужно для восстановления: параметры, решётка, правки, свои знаки, пользовательский кернинг (автокернинг пересчитывается) */
  if(id===S.fontId)stash();
  const sl=S.lib[id];if(!sl)return null;
  const o={family:sl.family,edits:clone(sl.edits||{}),custom:clone(sl.custom||{}),styles:{}};
  for(const k of ['regular','italic']){const s=sl.styles[k];if(!s)continue;o.styles[k]={p:clone(s.p),lat:clone(s.lat),hg:clone(s.hg||[]),ku:clone(s.ku||{}),kc:clone(s.kc||{})};}
  return o;
}
function checkSlotData(d){
  if(!isObj(d)||!isObj(d.styles))return false;
  const s=d.styles.regular;if(!isObj(s)||!isObj(s.p))return false;
  if(d.styles.italic!=null&&!(isObj(d.styles.italic)&&isObj(d.styles.italic.p)))return false;
  if(d.edits!=null&&!isObj(d.edits))return false;
  if(d.custom!=null&&!isObj(d.custom))return false;
  return true;
}
function applySlot(id,d){
  /* возвращает число значений, возвращённых в допустимые пределы */
  const raw={family:d.family,edits:d.edits,custom:d.custom,styles:d.styles};
  const pr={fonts:{}};pr.fonts[id]=clone(raw);
  const fx=projSanitize(pr);
  S.lib[id]=mkSlot(id,pr.fonts[id]);
  PDIRTY.add(id);
  return fx.bad+fx.clamped;
}
function resyncEditor(id){
  if(S.fontId===id){activate(id);buildGlyphList();buildPanel();syncPanel();bump();}
}
const EMPTY_FORM=Object.freeze({});
const AD={
  edit:{
    key:()=>S.fontId,
    valid:id=>!!(id&&FONTS[id]&&id!=='imp'),
    form(id){if(id===S.fontId)stash();return slotForm(id,S.lib[id])||EMPTY_FORM;},
    has(id){return this.form(id)!==EMPTY_FORM;},
    snap(id){const d=slotData(id);if(!d)return null;const F=FONTS[id];return {data:d,fid:id,fname:cleanName(d.family||F.name),smp:(F.name||'Аа').slice(0,12),base:F.name};},
    clean(id){
      if(!FONTS[id])return;
      S.lib[id]=mkSlot(id);PDIRTY.add(id);
      if(S.fontId===id){activate(id);try{buildGlyphList();buildPanel();syncPanel();}catch(e){console.error(e);}bump();}
      persist();
    },
    check(r){
      if(!checkSlotData(r.data))return 'broken';
      if(!FIDRE.test(r.fid||'')||!FONTS[r.fid]||r.fid==='imp')return 'nofont';
      return 'ok';
    },
    apply(r){
      const id=r.fid,fx=applySlot(id,r.data);
      if(S.fontId!==id){switchFont(id);}else resyncEditor(id);
      persist();return {fixed:fx};
    },
    open(){setTab('edit');}
  },
  import:{
    key:()=>'imp',
    valid:()=>true,
    form(){
      let p=null;try{p=impPack();}catch(e){}
      if(!p)return EMPTY_FORM;
      if(S.fontId==='imp')stash();
      const sl=S.lib.imp;
      return {pack:p,slot:FONTS.imp&&sl?slotForm('imp',sl):null};
    },
    has(){return this.form()!==EMPTY_FORM;},
    snap(){
      const p=impPack();if(!p)return null;
      let slot=null;if(FONTS.imp){slot=slotData('imp');}
      return {data:{pack:clone(p),slot},fid:'imp',fname:cleanName(p.family||'Свой шрифт'),smp:'',base:cleanName(p.family||'Свой шрифт')};
    },
    clean(){
      try{if(IU.open&&typeof iuClose==='function')iuClose();}catch(e){}
      impUnpack(null);iuRegisterNow();delete S.lib.imp;try{localStorage.removeItem(KEY+'-f-imp');}catch(e){}
      PDIRTY.add('imp');persist();
    },
    check(r){
      const d=r.data;if(!isObj(d.pack)||!isObj(d.pack.g)||d.pack.v!==1)return 'broken';
      const ks=Object.keys(d.pack.g);if(!ks.length||ks.length>2000)return 'broken';
      for(const k of ks.slice(0,40)){const g=d.pack.g[k];if(!isObj(g)||!Array.isArray(g.c))return 'broken';}
      if(d.slot!=null&&!checkSlotData(d.slot))return 'broken';
      return 'ok';
    },
    apply(r){
      const d=r.data;let fx=0;
      impUnpack(clone(d.pack));IU.lsVer=-1;
      iuRegisterNow();
      if(d.slot&&FONTS.imp){fx=applySlot('imp',d.slot);if(S.fontId==='imp')resyncEditor('imp');}
      persist();return {fixed:fx};
    },
    open(){iuOpen();}
  },
  draw:{
    key:()=>'draw',
    valid:()=>true,
    raw(){
      const D=window.GT_DRAW;let o=null;
      try{if(D&&D.pack)o=D.pack();}catch(e){}
      if(!o){try{o=JSON.parse(localStorage.getItem(DRK)||'null');}catch(e){}}
      return o&&o.v===1?o:null;
    },
    form(){
      const o=this.raw();if(!o||!isObj(o.g))return EMPTY_FORM;
      const g={};for(const ch of Object.keys(o.g)){const r=o.g[ch];if(r&&((r.i&&r.i.length)||r.s))g[ch]=r;}
      return Object.keys(g).length?{g,name:o.name||''}:EMPTY_FORM;
    },
    has(){return this.form()!==EMPTY_FORM;},
    built(){const o=this.raw();return !!(o&&o.built);},
    snap(){
      const o=this.raw();if(!o||this.form()===EMPTY_FORM)return null;
      return {data:clone(o),fid:'draw',fname:cleanName(o.name)||'Мой шрифт',smp:'',base:cleanName(o.name)||'Мой шрифт'};
    },
    clean(){
      const D=window.GT_DRAW;
      if(D&&D.reset)D.reset();else try{localStorage.removeItem(DRK);}catch(e){}
    },
    check(r){
      const o=r.data;if(o.v!==1||!isObj(o.g))return 'broken';
      const ks=Object.keys(o.g);if(!ks.length||ks.length>3000)return 'broken';
      for(const k of ks.slice(0,60)){const g=o.g[k];if(!isObj(g))return 'broken';if(g.i!=null&&!Array.isArray(g.i))return 'broken';}
      try{if(JSON.stringify(o).length>6e6)return 'broken';}catch(e){return 'broken';}
      return 'ok';
    },
    apply(r){
      const o=clone(r.data);o.built=0;
      const D=window.GT_DRAW,mounted=!!(D&&D.pack&&D.pack());
      if(mounted&&D.hist&&D.hist.apply)D.hist.apply(o);
      else{try{localStorage.setItem(DRK,JSON.stringify(o));}catch(e){throw e;}}
      return {fixed:0};
    },
    open(){setTab('draw');}
  }
};
G.adapters=AD;

/* ---------- режим и сессия ---------- */
function curMode(){
  try{
    if(typeof IU!=='undefined'&&IU.open)return 'import';
    const t=S.tab;if(t==='draw')return 'draw';
    if(t==='edit'||t==='proof'||t==='kern')return S.fontId==='imp'?'import':'edit';
  }catch(e){}
  return null;
}
function modeOfTab(t){
  if(t==='draw')return 'draw';
  if(t==='edit'||t==='proof'||t==='kern')return S.fontId==='imp'?'import':'edit';
  return null;
}
const keyOf=m=>m==='edit'?S.fontId:m==='import'?'imp':'draw';
let SS=null,ADOPT=null,KEEPNEXT=false,BYPASS=false,OPENING=false;
function saveSess(){try{if(SS)sessionStorage.setItem(SESS_KEY,JSON.stringify({mode:SS.mode,key:SS.key,base:SS.base,draftId:SS.draftId,keep:SS.keep}));else sessionStorage.removeItem(SESS_KEY);}catch(e){}}
function loadSess(){try{const j=JSON.parse(sessionStorage.getItem(SESS_KEY)||'null');return isObj(j)&&MODES[j.mode]?j:null;}catch(e){return null;}}
function isReady(mode,key){
  try{
    const m=PF.meta().proj,k=mode==='import'?'imp':mode==='edit'?'lib:'+key:'';
    const p=k&&m[k];if(!p)return false;
    return (p.st||(p.exp?'ready':'draft'))==='ready';
  }catch(e){return false;}
}
const EMPTY_H=hash(stab(EMPTY_FORM));
const formStr=(mode,key)=>hash(stab(AD[mode].form(key)));
function dirty(){
  if(!SS||SS.keep)return false;
  if(isReady(SS.mode,SS.key))return false;
  return formStr(SS.mode,SS.key)!==SS.base;
}
G.dirty=()=>!!dirty();
G.session=()=>SS?{mode:SS.mode,key:SS.key,draftId:SS.draftId,keep:SS.keep}:null;
G.mode=curMode;
G.keepNext=()=>{KEEPNEXT=true;setTimeout(()=>{KEEPNEXT=false;},0);};
G.formHash=(mode,key)=>formStr(mode,key||keyOf(mode));
G.stateHash=()=>{const m=curMode();return m?formStr(m,keyOf(m)):'';};

/* новый вход в режим: чистое состояние. Остаток прошлой работы не теряется: уходит в автосохранение (черновик со значком) */
function enterMode(to,from){
  const key=keyOf(to),ad=AD[to];
  if(SS&&SS.mode===to&&SS.key===key)return;
  if(G.restoring){
    const s=loadSess();
    SS=s&&s.mode===to&&s.key===key?{mode:to,key,base:String(s.base),draftId:s.draftId||null,keep:!!s.keep}:{mode:to,key,base:EMPTY_H,draftId:null,keep:isReady(to,key)};
    saveSess();return;
  }
  if(ADOPT){SS=ADOPT;ADOPT=null;SS.mode=to;SS.key=key;saveSess();return;}
  if(KEEPNEXT){KEEPNEXT=false;SS={mode:to,key,base:formStr(to,key),draftId:null,keep:true};saveSess();return;}
  if(from&&from!==to){/* переход между режимами одного потока (рисунок → «Свой шрифт» и обратно): работа остаётся, сессия переходит */
    SS={mode:to,key,base:SS&&SS.mode===to?SS.base:EMPTY_H,draftId:null,keep:false};saveSess();return;}
  if(to==='edit'&&!ad.valid(key)){SS=null;saveSess();return;}
  if(isReady(to,key)){SS={mode:to,key,base:formStr(to,key),draftId:null,keep:true};saveSess();return;}
  if(ad.has(key)){
    if(to==='draw'&&ad.built())ad.clean(key);
    else leftoverToAuto(to,key);
  }
  SS={mode:to,key,base:formStr(to,key),draftId:null,keep:false};saveSess();
}
function leftoverToAuto(mode,key){
  const ad=AD[mode],sn=ad.snap(key);if(!sn){ad.clean(key);return;}
  const hs=hash(stab(sn.data));
  if(DR.list.some(d=>d.mode===mode&&d.fid===sn.fid&&hash(stab(d.data))===hs)){ad.clean(key);return;}/* то же самое уже лежит в черновиках */
  const rec=buildRec(mode,sn,{auto:true,u:lastEdit(mode,key)});
  if(DR.list.length>=MAXD){noteCap();return;}/* места нет: состояние остаётся как есть, ничего не теряется */
  const data=rec.data;ad.clean(key);
  DR.list.unshift(rec);sortList();
  stPut(rec).then(r=>{
    if(r.ok){showRecovery(rec);if(visibleProfile())renderSect(true);return;}
    DR.list=DR.list.filter(d=>d.id!==rec.id);
    try{ad.apply({fid:key,data});}catch(e){}
    noteFail(r.quota);
  });
}
function lastEdit(mode,key){
  try{const p=PF.meta().proj[mode==='import'?'imp':'lib:'+key];if(p&&p.t>0)return p.t;}catch(e){}
  try{const j=JSON.parse(localStorage.getItem(MARK_KEY)||'null');if(j&&j.mode===mode&&j.t>0)return j.t;}catch(e){}
  return Date.now();
}
function defName(mode,sn){
  const b=cleanName(sn.base||sn.fname)||'Шрифт';
  return cleanName(b+' · '+MODES[mode]);
}
function buildRec(mode,sn,o){
  o=o||{};const now=Date.now();
  return {id:o.id||('d'+now.toString(36)+Math.random().toString(36).slice(2,7)),v:SCHEMA,mode,name:cleanName(o.name)||defName(mode,sn),fid:sn.fid,fname:sn.fname,
    t:o.t||now,u:o.u||now,auto:!!o.auto,smp:sn.smp||'',data:sn.data};
}
const sortList=()=>DR.list.sort((a,b)=>b.u-a.u);
async function saveCurrent(name){
  /* возвращает {ok} или {ok:false,err:'cap'|'quota'|'io'|'empty'} */
  if(!SS)return {ok:false,err:'empty'};
  const mode=SS.mode,key=SS.key,sn=AD[mode].snap(key);if(!sn)return {ok:false,err:'empty'};
  const ex=SS.draftId?DR.list.find(d=>d.id===SS.draftId):null;
  if(!ex&&DR.list.length>=MAXD)return {ok:false,err:'cap'};
  const rec=buildRec(mode,sn,{name:name||(ex&&ex.name),id:ex&&ex.id,t:ex&&ex.t});
  const r=await stPut(rec);
  if(!r.ok)return {ok:false,err:r.quota?'quota':'io'};
  const i=DR.list.findIndex(d=>d.id===rec.id);if(i>=0)DR.list[i]=rec;else DR.list.push(rec);sortList();
  SS.draftId=rec.id;
  return {ok:true,rec};
}
/* конец сессии режима: состояние сбрасывается, чтобы следующий вход был чистым */
function endSession(reset){
  const s=SS;SS=null;saveSess();try{localStorage.removeItem(MARK_KEY);}catch(e){}
  if(s&&reset&&!s.keep&&!isReady(s.mode,s.key)){try{if(AD[s.mode].has(s.key))AD[s.mode].clean(s.key);}catch(e){console.error(e);}}
}

/* ---------- уход из режима: перехват нажатий рейла ---------- */
const NAVSEL='#rail [data-tab],#logo,#rail-profile,#rail-back';
function targetMode(el){
  if(el.id==='logo')return null;
  if(el.id==='rail-profile'||el.id==='rail-back')return null;
  const t=el.dataset&&el.dataset.tab;return t?modeOfTab(t):null;
}
function ensureSS(){
  const m=curMode();if(!m)return null;
  if(!SS||SS.mode!==m){const key=keyOf(m);SS={mode:m,key,base:EMPTY_H,draftId:null,keep:isReady(m,key)};saveSess();}/* сессия потеряна: текущая работа считается несохранённой, ничего не сбрасывается */
  return SS;
}
/* вернуть true, если уход перехвачен (окно показано или идёт автосохранение) */
function guardLeave(proceed,toMode){
  const m=curMode();if(!m||toMode===m)return false;
  const ss=ensureSS();if(!ss)return false;
  if(!dirty()){endSession(true);return false;}
  const pref=getPref();
  if(pref==='discard'){endSession(true);return false;}
  if(pref==='save'){
    saveCurrent().then(r=>{
      if(r.ok){toast('Процесс сохранён в «Черновики»');endSession(true);proceed();}
      else showDialog(proceed,r.err);
    });
    return true;
  }
  showDialog(proceed,null);
  return true;
}
document.addEventListener('click',e=>{
  const el=e.target&&e.target.closest?e.target.closest(NAVSEL):null;if(!el)return;
  if(BYPASS)return;
  const proceed=()=>{BYPASS=true;try{el.click();}finally{BYPASS=false;}};
  if(guardLeave(proceed,targetMode(el))){e.preventDefault();e.stopImmediatePropagation();}
},true);
/* Esc в «Импорте» закрывает экран: тот же вопрос */
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||BYPASS)return;
  try{
    if(!(typeof IU!=='undefined'&&IU.open)||document.getElementById('imp-pop')||PF.layers.length||document.querySelector('.pf-mw'))return;
    const proceed=()=>{BYPASS=true;try{iuClose();}finally{BYPASS=false;}};
    if(guardLeave(proceed,null)){e.preventDefault();e.stopImmediatePropagation();}
  }catch(x){}
},true);
G.popGuard=(tok,run)=>{
  const m=curMode(),tm=tok==='edit'?modeOfTab('edit'):tok==='draw'?'draw':tok==='import'?'import':null;
  if(!m||tm===m)return false;
  const ss=ensureSS();if(!ss)return false;
  if(!dirty()){endSession(true);return false;}
  const pref=getPref();
  if(pref==='discard'){endSession(true);return false;}
  /* вернуть адрес режима: экран не меняется, пока человек не ответил */
  try{const t=window.GT_NAV&&GT_NAV.cur();if(t)history.pushState(null,'','#'+t);}catch(e){}
  if(pref==='save'){saveCurrent().then(r=>{if(r.ok){toast('Процесс сохранён в «Черновики»');endSession(true);run();}else showDialog(run,r.err);});return true;}
  showDialog(run,null);return true;
};

/* ---------- вход: обёртки setTab и iuOpen ---------- */
const _setTab=setTab;
setTab=function(t){
  if(t==='lib')t='home';
  try{
    const from=curMode(),to=modeOfTab(t);
    if(to){if(to!==from)enterMode(to,from);else if(!SS||SS.mode!==to)ensureSS();}
  }catch(e){console.error(e);}
  const r=_setTab.apply(this,arguments);
  try{if(SS&&!OPENING&&curMode()!==SS.mode&&!(G.restoring)){/* вышли из режима программно (тест, ссылка, тур): сессия кончилась, остаток подберёт следующий вход */SS=null;saveSess();}}catch(e){}
  return r;
};
if(typeof iuOpen==='function'){
  const _io=iuOpen;
  iuOpen=function(){
    try{const from=curMode();if(from!=='import'||!SS||SS.mode!=='import')enterMode('import',from);}catch(e){console.error(e);}
    OPENING=true;try{return _io.apply(this,arguments);}finally{OPENING=false;}
  };
}

/* ---------- окно «Сохранить процесс?» ---------- */
function errText(err){
  if(err==='cap')return 'Черновиков уже '+MAXD+'. Удалите ненужные в профиле или нажмите «Не сохранять».';
  if(err==='quota')return 'Не хватило места в браузере. Освободите место в «Черновиках» или нажмите «Не сохранять». Ваша работа пока на месте.';
  return 'Не получилось сохранить. Попробуйте ещё раз или нажмите «Отмена»: работа останется на месте.';
}
let DLG=null;
function showDialog(proceed,err){
  if(DLG)return;
  const mode=SS.mode,key=SS.key,sn=AD[mode].snap(key)||{base:'Шрифт'};
  const ex=SS.draftId?DR.list.find(d=>d.id===SS.draftId):null;
  const nm=ex?ex.name:defName(mode,sn);
  const html='<div class="mh"><h2>Сохранить процесс?</h2><button class="ibtn sm" type="button" data-x aria-label="Закрыть">'+ic('close')+'</button></div>'+
    '<p class="lead">'+(ex?'Изменения обновят черновик в профиле: Профиль → Черновики.':'Он появится в профиле: Профиль → Черновики. Вернуться к работе можно в любой момент.')+'</p>'+
    '<label class="dd-fld"><span>Название черновика</span><input class="inp" id="dd-name" type="text" maxlength="40" autocomplete="off" value="'+esc(nm)+'"></label>'+
    '<label class="chk dd-ask"><input type="checkbox" id="dd-rem"><span>Больше не спрашивать</span></label>'+
    '<p class="dd-err" id="dd-err" role="alert"'+(err?'':' hidden')+'>'+(err?esc(errText(err)):'')+'</p>'+
    '<div class="dd-btns"><button class="btn" type="button" data-dd="cancel">Отмена</button><span class="sp"></span><button class="btn danger" type="button" data-dd="discard">Не сохранять</button><button class="btn pri" type="button" data-dd="save">Сохранить</button></div>';
  const close=()=>{if(DLG&&DLG.L)DLG.L.close();};
  const L=PF.modal(html,{label:'Сохранить процесс?',cls:'dd-dlg',focus:'#dd-name',onClose:()=>{DLG=null;},onRequest:close});
  DLG={L,proceed};setTimeout(()=>{try{const i=L.el.querySelector('#dd-name');if(i&&document.activeElement===i)i.select();}catch(e){}},60);
  const dlg=L.el,errEl=dlg.querySelector('#dd-err'),inp=dlg.querySelector('#dd-name');
  const showErr=t=>{errEl.textContent=t;errEl.hidden=!t;};
  let busy=false;
  const done=run=>{L.close();setTimeout(run,0);};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();dlg.querySelector('[data-dd=save]').click();}});
  dlg.addEventListener('click',async e=>{
    const b=e.target.closest('[data-dd]');if(!b||busy)return;
    const a=b.dataset.dd,rem=dlg.querySelector('#dd-rem').checked;
    if(a==='cancel'){close();return;}
    if(a==='discard'){if(rem)setPref('discard');endSession(true);done(proceed);return;}
    if(a==='save'){
      busy=true;b.disabled=true;
      const r=await saveCurrent(cleanName(inp.value));
      busy=false;b.disabled=false;
      if(!r.ok){showErr(errText(r.err));return;}
      if(rem)setPref('save');
      endSession(true);toast('Процесс сохранён в «Черновики»');done(proceed);
    }
  });
}

/* ---------- плашка с действиями (в духе тоста: не перекрывает рабочие панели и окна) ---------- */
function closeNote(){const n=DR.note;if(!n)return;DR.note=null;clearTimeout(n.tm);try{n.mo&&n.mo.disconnect();}catch(e){}window.removeEventListener('resize',n.place);
  if(mo().off()||!n.el.animate){n.el.remove();return;}
  const a=n.el.animate([{opacity:1,transform:'translate(-50%,0)'},{opacity:0,transform:'translate(-50%,8px)'}],{duration:mo().D('close'),easing:mo().E('in'),fill:'forwards'});a.onfinish=()=>n.el.remove();setTimeout(()=>n.el.remove(),mo().D('close')+80);}
function note(o){
  closeNote();
  const el=document.createElement('div');el.className='drn';el.setAttribute('role','status');if(o.id)el.id=o.id;
  el.innerHTML='<span class="drn-t">'+o.html+'</span><span class="drn-a"></span><button class="ibtn sm drn-x" type="button" aria-label="Закрыть">'+ic('close')+'</button>';
  const box=el.querySelector('.drn-a');
  (o.actions||[]).forEach(a=>{const b=document.createElement('button');b.type='button';b.className='btn sm'+(a.pri?' pri':'');b.textContent=a.l;b.addEventListener('click',()=>{closeNote();a.fn();});box.appendChild(b);});
  el.querySelector('.drn-x').addEventListener('click',()=>{closeNote();if(o.onClose)o.onClose();});
  document.body.appendChild(el);
  const n=DR.note={el,tm:0,place:null,mo:null};
  const place=()=>{
    if(!el.isConnected)return;
    const modal=[...document.querySelectorAll('[aria-modal=true]')].some(x=>!x.hidden&&x.offsetParent!==null);
    el.classList.toggle('off',modal);
    plFit(el,'.drn-t');
    el.style.bottom='';
    const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s2'))||8;
    let bot=innerHeight-el.getBoundingClientRect().bottom;
    for(let i=0;i<4;i++){
      const r=el.getBoundingClientRect();let moved=false;
      for(const d of document.querySelectorAll('.tools,#dr-dock,#toast.on,#nsn,.pf-gpill')){
        if(!d.offsetParent&&getComputedStyle(d).position!=='fixed')continue;const q=d.getBoundingClientRect();if(q.width<2||q.height<2)continue;
        if(r.right<=q.left||r.left>=q.right||r.bottom<=q.top-gap||r.top>=q.bottom+gap)continue;
        bot=innerHeight-q.top+gap;el.style.bottom=bot+'px';moved=true;break;}
      if(!moved)break;
    }
  };
  n.place=place;place();requestAnimationFrame(()=>{place();requestAnimationFrame(place);});setTimeout(place,350);
  window.addEventListener('resize',place);
  try{n.mo=new MutationObserver(place);n.mo.observe(document.body,{childList:true,attributes:true,attributeFilter:['class','hidden'],subtree:false});const t=document.getElementById('toast');if(t)n.mo.observe(t,{attributes:true,attributeFilter:['class']});}catch(e){}
  if(!mo().off()&&el.animate)el.animate([{opacity:0,transform:'translate(-50%,var(--s5))'},{opacity:1,transform:'translate(-50%,0)'}],{duration:mo().D('base'),easing:mo().E('out')});
  if(o.ttl)n.tm=setTimeout(()=>{if(DR.note===n)closeNote();},o.ttl);
  return n;
}
G.note=note;G.closeNote=closeNote;G.closeRec=closeRec;
/* плашка восстановления стоит на главной в потоке страницы (над «Лабораторией») и сдвигает содержимое: ничего не перекрывает */
function closeRec(fast){
  const e=document.getElementById('dd-recs');if(!e)return;
  if(fast||mo().off()||!e.animate){e.remove();return;}
  const h=e.offsetHeight;
  const a=e.animate([{opacity:1,height:h+'px'},{opacity:0,height:'0px'}],{duration:mo().D('close'),easing:mo().E('in'),fill:'forwards'});
  a.onfinish=()=>e.remove();setTimeout(()=>e.remove(),mo().D('close')+80);
}
function showRecovery(rec){
  closeRec(true);
  const anchor=(document.getElementById('h-mk')||{}).closest?document.getElementById('h-mk').closest('section'):null;
  if(!anchor){note({id:'dd-rec',html:'Есть несохранённый процесс от '+esc(fmtAbs(rec.u)),ttl:0,actions:[{l:'Восстановить',pri:true,fn:()=>continueDraft(rec.id)},{l:'Сохранить в черновики',fn:()=>keepAuto(rec.id)}],onClose:()=>removeDraft(rec.id)});return;}
  const w=document.createElement('section');w.className='vsec dd-recs';w.id='dd-recs';
  w.innerHTML='<div class="dd-rec notchc" id="dd-rec" role="status"><span class="dd-rec-t">Есть несохранённый процесс от '+esc(fmtAbs(rec.u))+'</span>'+
    '<button class="ibtn dd-rec-x" type="button" data-rc="del" aria-label="Удалить несохранённый процесс" title="Удалить">'+ic('close')+'</button>'+
    '<span class="dd-rec-a"><button type="button" class="btn lg pri" data-rc="go">Восстановить</button><button type="button" class="btn lg" data-rc="keep">Сохранить в черновики</button></span>'+
    '<span class="notch"><button type="button" class="nb" data-rc="del" aria-label="Удалить несохранённый процесс" title="Удалить">'+ic('close')+'</button></span></div>';
  anchor.parentNode.insertBefore(w,anchor);
  const fn={go:()=>continueDraft(rec.id),keep:()=>keepAuto(rec.id),del:()=>removeDraft(rec.id)};
  w.addEventListener('click',e=>{
    const b=e.target.closest('[data-rc]');
    if(b){closeRec();fn[b.dataset.rc]();return;}
  });
  if(S.tab!=='home')toast('Прошлый процесс сохранён. Продолжить можно на главной или в «Черновиках»');
  if(!mo().off()&&w.animate){const h=w.offsetHeight;if(h)w.animate([{opacity:0,height:'0px'},{opacity:1,height:h+'px'}],{duration:mo().D('base'),easing:mo().E('out')});}
}
G.showRecovery=showRecovery;
function noteCap(){note({html:'Черновиков уже '+MAXD+', прошлый процесс остался на месте. Удалите ненужные в профиле.',ttl:9000,actions:[{l:'Открыть черновики',fn:()=>openDrafts()}]});}
function noteFail(quota){note({html:quota?'Не хватило места в браузере, прошлый процесс возвращён на место. Освободите место в черновиках.':'Не получилось сохранить прошлый процесс, он возвращён на место.',ttl:9000,actions:[{l:'Открыть черновики',fn:()=>openDrafts()}]});}
function openDrafts(){
  try{if(S.tab!=='profile')setTab('profile');requestAnimationFrame(()=>{const s=document.getElementById('dd-sect');if(s)s.scrollIntoView({block:'start',behavior:'auto'});});}catch(e){}
}

/* ---------- действия над черновиками ---------- */
async function keepAuto(id){
  const d=DR.list.find(x=>x.id===id);if(!d)return;
  const c=Object.assign({},d,{auto:false});const r=await stPut(c);
  if(!r.ok){note({html:esc(errText(r.quota?'quota':'io')),ttl:7000});return;}
  Object.assign(d,c);if(visibleProfile())renderSect(true);toast('Сохранено в «Черновики»');
}
async function removeDraft(id){
  let d=null,bad=false;
  const i=DR.list.findIndex(x=>x.id===id);
  if(i>=0){d=DR.list[i];DR.list.splice(i,1);}
  else{const j=DR.bad.findIndex(x=>x.id===id);if(j<0)return;bad=DR.bad[j];DR.bad.splice(j,1);d=Object.assign({},bad.rec,{__bad:bad});}
  await stDel(id);
  if(visibleProfile())renderSect(true);
  undoNote(d);
}
function undoNote(d){
  DR.undo=d;
  note({id:'dd-undo',html:'Черновик «'+esc(d.name)+'» удалён',ttl:7000,actions:[{l:'Вернуть',fn:async()=>{
    const rec=d.__bad?d.__bad.raw:d;
    const r=await stPut(rec);if(!r.ok){note({html:esc(errText(r.quota?'quota':'io')),ttl:7000});return;}
    if(d.__bad)DR.bad.push(d.__bad);else DR.list.push(d);sortList();DR.undo=null;if(visibleProfile())renderSect(true);toast('Черновик возвращён');}}]});
}
async function renameDraft(id,name){
  const d=DR.list.find(x=>x.id===id);name=cleanName(name);
  DR.editId=null;
  if(!d||!name||name===d.name){if(visibleProfile())renderSect(false);return;}
  const c=Object.assign({},d,{name,u:Date.now()});const r=await stPut(c);
  if(!r.ok){note({html:esc(errText(r.quota?'quota':'io')),ttl:7000});if(visibleProfile())renderSect(false);return;}
  Object.assign(d,c);sortList();if(visibleProfile())renderSect(true);
}
const PROBLEM={
  broken:'Черновик повреждён и не открывается. Его можно только удалить.',
  old:'Черновик создан в старой версии G-type и не открывается. Его можно только удалить.',
  newer:'Черновик создан в более новой версии G-type. Обновите страницу или удалите его.',
  nofont:'Этого шрифта больше нет в библиотеке. Черновик не открыть: удалите его.'
};
function problemOf(d){try{return checkRec(d);}catch(e){return 'broken';}}
function continueDraft(id,opt){
  const d=DR.list.find(x=>x.id===id);
  if(!d){toast('Черновик не найден');return false;}
  const pr=problemOf(d);
  if(pr!=='ok'){const t=PROBLEM[pr]||PROBLEM.broken;if(pr==='nofont')note({html:esc(t),ttl:8000});else note({html:esc(t),ttl:8000});return false;}
  /* то, что сейчас лежит в режиме, не теряется: уходит в автосохранение */
  const ad=AD[d.mode];
  try{
    const key=d.mode==='edit'?d.fid:d.mode==='import'?'imp':'draw';
    if(d.mode==='edit'&&S.fontId!==key){/* состояние другого шрифта не затрагивается */}
    if(ad.has(key)&&!isReady(d.mode,key)){
      if(d.mode==='draw'&&ad.built())ad.clean(key);else leftoverToAuto(d.mode,key);
    }
    const res=ad.apply(d);
    ADOPT={mode:d.mode,key,base:formStr(d.mode,key),draftId:d.id,keep:false};
    if(d.auto){d.auto=false;stPut(d);}
    if(res&&res.fixed)toast('Часть значений вернули в допустимые пределы');
    closeNote();closeRec(true);
    ad.open();
    return true;
  }catch(e){
    console.error(e);
    note({html:'Не получилось открыть черновик. Попробуйте ещё раз или удалите его.',ttl:8000});
    return false;
  }
}
G.continueDraft=continueDraft;G.removeDraft=removeDraft;G.renameDraft=renameDraft;G.saveCurrent=saveCurrent;G.getPref=getPref;G.setPref=setPref;
G.list=()=>DR.list.map(d=>({id:d.id,mode:d.mode,name:d.name,fid:d.fid,auto:d.auto,u:d.u,v:d.v}));
G.bad=()=>DR.bad.map(d=>({id:d.id,why:d.why}));
G.ready=()=>DR.ready;
G.whenReady=cb=>{if(DR.ready)cb();else DR.cb.push(cb);};
G.put=async rec=>{const r=await stPut(rec);if(r.ok){const i=DR.list.findIndex(d=>d.id===rec.id),j=DR.bad.findIndex(d=>d.id===rec.id);if(i>=0)DR.list.splice(i,1);if(j>=0)DR.bad.splice(j,1);classify([rec]);sortList();if(visibleProfile())renderSect(false);}return r;};
G.kind=()=>ST.kind;

/* ---------- раздел профиля «Черновики» ---------- */
const visibleProfile=()=>S.tab==='profile'&&!!document.getElementById('dd-sect');
function prefSeg(){
  const v=getPref(),o=[['ask','Спрашивать'],['save','Сохранять'],['discard','Не сохранять']];
  return '<div class="dd-pref"><span class="dd-pl" id="dd-pl">При выходе из режима</span><div class="seg sm" role="group" aria-labelledby="dd-pl">'+o.map(x=>'<button type="button" data-dd="pref" data-v="'+x[0]+'" aria-pressed="'+(v===x[0])+'"'+(v===x[0]?' class="on"':'')+'>'+x[1]+'</button>').join('')+'</div></div>';
}
function cardHTML(d){
  const k=esc(d.id),n=esc(d.name),bad=d.__why;
  const meta='<span class="badge mute">'+esc(MODES[d.mode]||'Режим')+'</span>'+(d.auto?'<span class="badge warn">Автосохранение</span>':'');
  const spec='<div class="pf-spec dd" data-d="'+k+'" aria-hidden="true"><canvas></canvas></div>';
  if(DR.editId===d.id)return '<article class="card pf-fc dd-card" data-card="'+k+'">'+spec+'<div class="pf-fb"><div class="pf-fnn"><input class="inp dd-rn" data-d="'+k+'" value="'+n+'" maxlength="40" aria-label="Название черновика"></div><span class="pf-fd">'+meta+'</span></div><div class="pf-ff dd-ff"><button class="btn sm ink" type="button" data-dd="rn-ok" data-d="'+k+'">Готово</button><button class="btn sm" type="button" data-dd="rn-no">Отмена</button></div></article>';
  const err=bad?'<p class="dd-prob">'+ic('alert')+'<span>'+esc(PROBLEM[bad]||PROBLEM.broken)+'</span></p>':'';
  return '<article class="card pf-fc dd-card'+(bad?' bad':'')+'" data-card="'+k+'">'+spec+'<div class="pf-fb"><div class="pf-fnn"><b title="'+n+'">'+n+'</b></div><span class="pf-fd dd-meta">'+meta+'</span><span class="pf-fd">'+esc(fmtRel(d.u))+'</span></div>'+err+
    '<div class="pf-ff dd-ff">'+(bad?'':'<button class="btn sm ink" type="button" data-dd="cont" data-d="'+k+'">Продолжить</button>')+'<span class="sp"></span>'+
    (bad?'':'<button class="ibtn sm" type="button" data-dd="rename" data-d="'+k+'" aria-label="Переименовать «'+n+'»" title="Переименовать">'+ic('pen2')+'</button>')+
    '<button class="ibtn sm" type="button" data-dd="del" data-d="'+k+'" aria-label="Удалить «'+n+'»" title="Удалить">'+ic('trash')+'</button></div></article>';
}
function sectHTML(){
  const all=DR.list.concat(DR.bad.map(b=>Object.assign({},b.rec,{__why:b.why}))).sort((a,b)=>(b.u||0)-(a.u||0));
  const n=all.length;
  let h='<section class="sk-sect dd-sect pf-own" id="dd-sect" aria-labelledby="dd-h"><div class="vhead"><h2 id="dd-h">Черновики'+(n?' <small>'+n+'</small>':'')+'</h2>'+prefSeg()+'</div>';
  if(!n)h+='<div class="card dd-emp"><h3>'+ic('folder')+'Пока нет черновиков</h3><p>Выходите из редактора, отрисовки или импорта и сохраняйте процесс. Работа появится здесь, и её можно продолжить в любой момент.</p></div>';
  else h+='<div class="pf-fgrid dd-grid" id="dd-grid">'+all.map(cardHTML).join('')+'</div>'+(DR.list.length>=MAXD?'<p class="dd-cap">Это предел: '+MAXD+' черновиков. Удалите ненужные, чтобы сохранять новые.</p>':'');
  return h+'</section>';
}
PF.draftsSect=()=>sectHTML();
/* превью: свой шрифт черновика рисуется настоящими контурами */
function paintRow(cv,gs,col){
  const f=fitCanvas(cv),c=f.c,w=f.w,h=f.h;c.clearRect(0,0,w,h);c.fillStyle=col;
  if(!gs.length)return false;
  const sc=h*.42/700,gap=h*.12;let tot=-gap;
  const bb=gs.map(cs=>{let a=1e9,b=-1e9;for(const k of cs)for(const n of k.nodes){if(n.x<a)a=n.x;if(n.x>b)b=n.x;}tot+=(b-a)*sc+gap;return [a,b];});
  if(tot>w*.84){const k=w*.84/tot;return paintRowK(c,gs,bb,sc*k,gap*k,w,h);}
  return paintRowK(c,gs,bb,sc,gap,w,h);
}
function paintRowK(c,gs,bb,sc,gap,w,h){
  let tot=-gap;bb.forEach(b=>{tot+=(b[1]-b[0])*sc+gap;});
  let x=(w-tot)/2;const base=h/2+700*sc*.45;
  gs.forEach((cs,i)=>{const a=bb[i][0],b=bb[i][1];c.fill(pathOf(cs,(px,py)=>[x+(px-a)*sc,base-py*sc]),'evenodd');x+=(b-a)*sc+gap;});
  return true;
}
function glyphsOf(d){
  const out=[];
  try{
    if(d.mode==='draw'){
      const g=d.data.g||{};for(const ch of Object.keys(g)){const r=g[ch];if(!r)continue;let cs=[];
        if(r.s&&r.c)cs=impUnpackC(r.c);else if(Array.isArray(r.i))for(const it of r.i){if(it&&it.k!=='sub'&&it.c)cs=cs.concat(impUnpackC(it.c));}
        if(cs.length)out.push(cs);if(out.length>=3)break;}
    }else{
      const g=d.data.pack.g,order=['А','Б','В','A','B','C'].filter(c=>g[c]).concat(Object.keys(g));
      for(const ch of order){if(out.length>=3)break;const r=g[ch];if(r&&r.c){const cs=impUnpackC(r.c);if(cs.length&&!out.includes(cs))out.push(cs);}}
    }
  }catch(e){}
  return out;
}
const SLOTC=new Map();
function slotFor(d){
  const key=d.id+'|'+d.u;let s=SLOTC.get(key);
  if(!s){try{const pr={fonts:{}};pr.fonts[d.fid]=clone({family:d.data.family,edits:d.data.edits,styles:d.data.styles});projSanitize(pr);s=mkSlot(d.fid,pr.fonts[d.fid]);}catch(e){s=null;}SLOTC.set(key,s);if(SLOTC.size>40)SLOTC.delete(SLOTC.keys().next().value);}
  return s;
}
function paintOne(d,el){
  const cv=el.querySelector('canvas');if(!cv)return;const col=getComputedStyle(el).color,back=S.fontId;
  let ok=false;
  try{
    if(d.mode==='edit'){
      const slot=slotFor(d);
      if(slot&&FONTS[d.fid]){
        const f=fitCanvas(cv),c=f.c,w=f.w,h=f.h;c.clearRect(0,0,w,h);c.fillStyle=col;
        useFont(d.fid);
        let run=libRun(d.fid,d.smp||FONTS[d.fid].name||'Аа',undefined,undefined,slot);
        if(!run.items.length)run=libRun(d.fid,FONTS[d.fid].name||'Аа',undefined,undefined,slot);
        if(run.items.length){
          const pad=Math.round(w*.08);let sc=h*.4/run.cap;if(run.tot*sc>w-2*pad)sc=(w-2*pad)/Math.max(run.tot,1);
          const base=h/2+run.cap*sc/2,ox=(w-run.tot*sc)/2;
          for(const it of run.items)c.fill(pathOf(it[0].cs,(px,py)=>[ox+it[1]*sc+px*sc,base-py*sc]),'nonzero');ok=true;
        }
      }
    }else ok=paintRow(cv,glyphsOf(d),col);
  }catch(e){console.error(e);}
  finally{try{if(FONTS[back])useFont(back);}catch(e){}}
  if(!ok){const f=fitCanvas(cv),c=f.c;c.clearRect(0,0,f.w,f.h);c.fillStyle=col;c.font='600 '+Math.round(f.h*.34)+'px '+getComputedStyle(document.documentElement).getPropertyValue('--f-ui').trim();c.textAlign='center';c.textBaseline='middle';c.fillText('Аб',f.w/2,f.h/2);}
}
function paintDrafts(root){
  if(!root)return;
  $A('.pf-spec.dd[data-d]',root).forEach(el=>{const d=DR.list.find(x=>x.id===el.dataset.d)||DR.bad.map(b=>b.rec).find(x=>x&&x.id===el.dataset.d);
    if(!d||(d.__broken)){const cv=el.querySelector('canvas');if(cv){const f=fitCanvas(cv);f.c.clearRect(0,0,f.w,f.h);}return;}
    const bad=DR.bad.find(b=>b.id===d.id);
    if(bad){const cv=el.querySelector('canvas');if(cv){const f=fitCanvas(cv);f.c.clearRect(0,0,f.w,f.h);f.c.fillStyle=getComputedStyle(el).color;f.c.font='600 '+Math.round(f.h*.3)+'px '+getComputedStyle(document.documentElement).getPropertyValue('--f-ui').trim();f.c.textAlign='center';f.c.textBaseline='middle';f.c.fillText('?',f.w/2,f.h/2);}return;}
    paintOne(d,el);});
}
const _pe=PF.paintExtra;
PF.paintExtra=root=>{if(_pe)_pe(root);paintDrafts(root);};
G.paint=paintDrafts;
function renderSect(flip){
  const old=document.getElementById('dd-sect');if(!old)return;
  const grid=old.querySelector('#dd-grid');
  const ae=document.activeElement,keep=ae&&old.contains(ae)?(ae.dataset&&ae.dataset.dd?'[data-dd='+ae.dataset.dd+']'+(ae.dataset.d?'[data-d="'+ae.dataset.d+'"]':''):null):null;
  const mut=()=>{const t=document.createElement('div');t.innerHTML=sectHTML();const nw=t.firstChild;old.replaceWith(nw);paintDrafts(nw);
    const rn=nw.querySelector('.dd-rn');if(rn){rn.focus();rn.select();}else if(keep){const e=nw.querySelector(keep);if(e)e.focus({preventScroll:true});}};
  if(flip&&grid&&window.MO&&MO.flipList&&!mo().off())MO.flipList(grid,mut,{key:c=>c.dataset&&c.dataset.card});else mut();
}
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('#dd-sect [data-dd]');if(!a)return;
  const act=a.dataset.dd,id=a.dataset.d;
  if(act==='cont')continueDraft(id);
  else if(act==='del')removeDraft(id);
  else if(act==='rename'){DR.editId=id;renderSect(false);}
  else if(act==='rn-ok'){const i=document.querySelector('#dd-sect .dd-rn');renameDraft(id,i?i.value:'');}
  else if(act==='rn-no'){DR.editId=null;renderSect(false);}
  else if(act==='pref'){setPref(a.dataset.v);renderSect(false);toast(a.dataset.v==='save'?'Процесс будет сохраняться сам':a.dataset.v==='discard'?'Процесс не будет сохраняться':'Будем спрашивать при выходе');}
});
document.addEventListener('keydown',e=>{
  const i=e.target&&e.target.classList&&e.target.classList.contains('dd-rn')?e.target:null;if(!i)return;
  if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();renameDraft(i.dataset.d,i.value);}
  else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();DR.editId=null;renderSect(false);}
},true);

/* ---------- загрузка списка, метка скрытия, новая сессия ---------- */
function classify(arr){
  for(const r of arr){
    let why;try{why=checkRec(r);}catch(e){why='broken';}
    if(why==='ok')DR.list.push(normRec(r));
    else DR.bad.push({id:isObj(r)&&typeof r.id==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(r.id)?r.id:('x'+Math.random().toString(36).slice(2,7)),why,raw:r,
      rec:isObj(r)?{id:String(r.id||''),name:cleanName(r.name)||'Черновик',mode:MODES[r.mode]?r.mode:'edit',u:+r.u>0?+r.u:0,auto:false,data:{}}:{id:'x',name:'Черновик',mode:'edit',u:0,data:{}}});
  }
}
function load(){
  return stAll().then(arr=>{
    DR.list=[];DR.bad=[];classify(arr);sortList();DR.ready=true;
    DR.cb.splice(0).forEach(f=>{try{f();}catch(e){}});
    if(visibleProfile())renderSect(false);
  });
}
function writeMark(){
  try{
    const m=curMode();if(!m||!SS||SS.mode!==m)return;
    if(!dirty())return;
    localStorage.setItem(MARK_KEY,JSON.stringify({mode:m,key:SS.key,t:Date.now()}));
  }catch(e){}
}
window.addEventListener('pagehide',writeMark);
document.addEventListener('visibilitychange',()=>{if(document.hidden)writeMark();});
G.writeMark=writeMark;
/* после запуска: в новой сессии работа, оставшаяся в режиме, уходит в автосохранение, плашка показывается один раз */
function afterBoot(){
  stOpen().then(()=>load()).then(()=>{
    if(G.newSession){
      const nav=NAV0,mk=MARK0;
      const m=(mk&&MODES[mk.mode]&&mk.mode)||(nav&&(nav.t==='edit'?(nav.fid==='imp'?'import':'edit'):nav.t==='draw'?'draw':nav.t==='import'?'import':null));
      if(m&&curMode()!==m){
        const key=m==='edit'?(mk&&mk.key)||(nav&&nav.fid)||S.fontId:m==='import'?'imp':'draw';
        if(m!=='edit'||AD.edit.valid(key)){
          try{
            if(!isReady(m,key)&&AD[m].has(key)){
              if(m==='draw'&&AD.draw.built())AD.draw.clean(key);else leftoverToAuto(m,key);
            }
          }catch(e){console.error(e);}
        }
      }
      try{localStorage.removeItem(MARK_KEY);}catch(e){}
    }
    if(visibleProfile())renderSect(false);
  });
}
G.afterBoot=afterBoot;
G.endSession=endSession;
document.addEventListener('DOMContentLoaded',()=>{if(!window.GT_NAV)setTimeout(afterBoot,0);});
})();
