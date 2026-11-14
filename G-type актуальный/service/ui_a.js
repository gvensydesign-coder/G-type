/* ===== VOLT: состояние, отрисовка образца и миниатюр ===== */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const STYLE_NAMES={regular:'Прямой',italic:'Италик'}; /* начертание (не вес): вес определяется толщиной — weightOf */
const mkStyle=k=>({p:{...DEFAULTS[k]},lat:newLattice(),hg:[],kern:{}});
let DESIGN=null;
const S={
  fontId:'volt',lib:{},style:'regular',mode:'points',sel:'Ж',node:null,tab:'home',
  text:'ЖЕЛЕЗО НОЧИ\nNeon Noir 2077 — №7',specSize:60,family:'Volt Grotesk',
  snap:true,snapStep:10,guides:true,parts:false,
  styles:{regular:mkStyle('regular'),italic:mkStyle('italic')},
  view:{zoom:1,px:0,py:0},
  ref:{on:false,font:'Onest',scale:100,img:null,imgA:40,imgS:100,imgX:0,imgY:0},
  proof:{grp:'all',onlyBad:false,size:150,metrics:true,ref:false},
};
/* правки знака-близнеца (e/е, A/А …) общие: S.edits['е'] ≡ S.edits['e'] (ключ — латинский знак); старые проекты переносятся при подключении */
{let px=null;const own=new WeakSet(),H={get:(t,k)=>t[typeof k==='string'?edKey(k):k],set:(t,k,v)=>{t[typeof k==='string'?edKey(k):k]=v;return true;},
    has:(t,k)=>(typeof k==='string'?edKey(k):k) in t,deleteProperty:(t,k)=>delete t[typeof k==='string'?edKey(k):k]};
  Object.defineProperty(S,'edits',{enumerable:true,get:()=>px,set:v=>{if(v&&own.has(v)){px=v;return;}v=(v&&typeof v==='object')?v:{};
    for(const k of Object.keys(v)){const c=edKey(k);if(c!==k){if(v[c]===undefined)v[c]=v[k];delete v[k];}}px=new Proxy(v,H);own.add(px);}});S.edits={};}
const cur=()=>S.styles[S.style];
let ver=0;const cache=new Map();
/* Кеш глифов в два уровня: cache — на текущую версию (сбрасывается при каждом bump),
   GCACHE — по содержимому ключа (шрифт + параметры начертания + правки знака), переживает bump:
   неизменённые знаки (другое начертание, другие буквы при правке одной) не перестраиваются. */
const GCACHE=new Map(),SIGID=new Map();let sigMemo={};
cache.clear=function(){Map.prototype.clear.call(this);sigMemo={};};
function styleSig(key){let s=sigMemo[key];if(s===undefined){const st=S.styles[key];
  const raw=JSON.stringify(st.p)+'|'+JSON.stringify(st.hg||[])+'|'+(latActive(st.lat)?JSON.stringify(st.lat):'0');
  s=SIGID.get(raw);if(s===undefined){if(SIGID.size>400)SIGID.clear();s=SIGID.size+1+'s'+(++sigSeq);SIGID.set(raw,s);}sigMemo[key]=s;}return s;}
let sigSeq=0;
/* правки знака; у варианта .hi (calt) — правки базового знака */
function edOfKey(ch){const e=S.edits[ch];if(e)return e;const d=GL[ch];return d&&d.opt&&d.opt.alt&&d.opt.feat==='calt'?S.edits[d.opt.base]:undefined;}
let SLIDING=false;
function getFinal(ch,key,opt){
  let o=opt||{};
  /* ползунок тянется: скелетные знаки (редактор, образец) — быстрой огибающей, точный знак после отпускания */
  if(SLIDING&&S.live&&!o.live&&typeof SKX!=='undefined'&&GL[ch]&&GL[ch].skel&&!(typeof drag!=='undefined'&&drag))o=Object.assign({},o,{live:true});
  const fl=(o.warp===false?1:0)+''+(o.slant===false?1:0)+(o.subdiv===false?1:0)+(o.keepOff?1:0)+(o.remap===false?1:0)+(o.rough===false?1:0)+(o.union===false?1:0)+(o.live?'L':'');
  const k=key+'|'+ch+'|'+fl;
  let v=cache.get(k);
  if(v===undefined){
    const e=edOfKey(ch),gk=CUR_FONT+'|'+fl+'|'+ch+'|'+styleSig(key)+'|'+(e?JSON.stringify(e):'');
    v=GCACHE.get(gk);
    if(v===undefined){v=(o.live?liveGlyphOf(ch,S.styles[key],S.edits):finalGlyph(ch,S.styles[key],S.edits,opt))||null;
      if(GCACHE.size>9000){let n=0;for(const kk of GCACHE.keys()){GCACHE.delete(kk);if(++n>=3000)break;}}
      GCACHE.set(gk,v);}
    cache.set(k,v);}
  return v;
}
/* скелетные шрифты: точный знак (объединение контуров) дорог — образец сначала рисуется быстрыми знаками,
   точные досчитываются в простое небольшими порциями и образец перерисовывается */
function peekFinal(ch,key){const k=key+'|'+ch+'|0000000';let v=cache.get(k);if(v!==undefined)return v;
  const e=edOfKey(ch),gk=CUR_FONT+'|0000000|'+ch+'|'+styleSig(key)+'|'+(e?JSON.stringify(e):'');v=GCACHE.get(gk);if(v!==undefined)cache.set(k,v);return v;}
const REFINE={q:new Map(),t:0,draw:0};
function gfSmart(ch,key){const v=peekFinal(ch,key);if(v!==undefined)return v;
  if(!(GL[ch]&&GL[ch].skel))return getFinal(ch,key);
  REFINE.q.set(key+'\u0001'+ch,[ch,key]);if(!REFINE.t)REFINE.t=setTimeout(refineStep,40);
  return getFinal(ch,key,FAST);}
function refineStep(){REFINE.t=0;if(S.live||(typeof drag!=='undefined'&&drag)){REFINE.t=setTimeout(refineStep,120);return;}
  const t0=performance.now();for(const [k,[ch,key]] of REFINE.q){REFINE.q.delete(k);if(S.styles[key])getFinal(ch,key);if(performance.now()-t0>28)break;}
  if(REFINE.q.size)REFINE.t=setTimeout(refineStep,0);
  /* перерисовка — после последней порции или не чаще раза в 160 мс */
  const now=performance.now();if(!REFINE.q.size||now-REFINE.draw>160){REFINE.draw=now;try{drawSpecimen();}catch(e){}}}
/* пара-кернинг */
const kernOf=(a,b,key,live)=>{if(!S.kd)ensureKern();const u=S.styles[key].ku;if(u&&u[a+b]!=null)return u[a+b];const k=S.styles[key].kern;if(k&&k[a+b])return k[a+b];
  /* во время перетаскивания — классы кернинга из прошлой таблицы (пересчёт после отпускания) */
  if(live&&typeof _ckCache!=='undefined'){const c=_ckCache[key];if(c&&c.ct){const l=c.lc[a],r=c.rc[b];return (l&&r&&c.ct.vals[l+'|'+r])||0;}}
  /* профили для классов кернинга у скелетных шрифтов — по быстрым знакам (разница с точными < 1 ед.) */
  try{return typeof classKernValue==='function'?classKernValue(a,b,S.styles[key],key,ch=>(GL[ch]&&GL[ch].skel)?getFinal(ch,key,FAST):getFinal(ch,key)):0;}catch(e){return 0;}};
/* ---------- сохранение ---------- */
const KEY='gtype-project-v20';
/* T1 v82: хранилище браузера недоступно (приватное окно, заблокированные данные сайта): проба один раз; «сохранено» без записи — нечестно,
   поэтому формулировки меняются (stSay), а в странице один раз появляется заметка (noStoreNote) */
let NOSTORE_OK=null,NOSTORE_SHOWN=false;
function storeOk(){if(NOSTORE_OK===null){try{const k='gtype-probe-v1';localStorage.setItem(k,'1');NOSTORE_OK=localStorage.getItem(k)==='1';localStorage.removeItem(k);}catch(e){NOSTORE_OK=false;}}return NOSTORE_OK;}
function stSay(saved,mem){return storeOk()?saved:mem;}
function noStoreNote(){
  if(NOSTORE_SHOWN||storeOk())return;NOSTORE_SHOWN=true;
  try{const n=document.createElement('div');n.className='nsn';n.id='nsn';n.setAttribute('role','status');
    n.innerHTML='<span>Браузер не даёт сохранять данные на этой странице, поэтому работа останется только до закрытия вкладки. Чтобы не потерять её, сохраните проект файлом («Проект» → «Сохранить»).</span><button class="btn sm" type="button">Понятно</button>';
    n.querySelector('button').addEventListener('click',()=>n.remove());document.body.appendChild(n);setTimeout(()=>n.remove(),30000);}catch(e){}}
let saveT=0;
function projectJSON(){ensureKern();stash();return {app:'volt',v:3,font:S.fontId,fonts:S.lib,text:S.text};}
/* Хранилище разбито по шрифтам: KEY-m — мета (шрифт, текст), KEY-f-<id> — слот шрифта. Пишутся только изменившиеся слоты,
   в простое после паузы 400 мс. Старый единый ключ KEY читается как прежде (и удаляется после первой записи нового вида). */
const PDIRTY=new Set();let PALL=false;const PLAST=new Map();
function persistWrite(){
  saveT=0;stash();
  const ids=PALL?Object.keys(S.lib):[...PDIRTY];PALL=false;PDIRTY.clear();
  try{
    for(const id of ids){if(!S.lib[id])continue;const j=JSON.stringify(S.lib[id]);if(PLAST.get(id)===j)continue;localStorage.setItem(KEY+'-f-'+id,j);PLAST.set(id,j);}
    const m=JSON.stringify({app:'volt',v:4,font:S.fontId,text:S.text,ids:Object.keys(S.lib)});
    if(PLAST.get('')!==m){localStorage.setItem(KEY+'-m',m);PLAST.set('',m);}
    if(localStorage.getItem(KEY)!==null)localStorage.removeItem(KEY);
  }catch(e){}
}
/* после старта (не мешая первой отрисовке) удаляются ключи gtype-* прежних версий (то же имя, другой суффикс -vN) и данные шрифтов, которых больше нет;
   незнакомые ключи других модулей не трогаются */
function storageSweep(){try{
  const cur=[KEY,HINT_KEY,IMPKEY,FAV_KEY,REC_KEY,VIEW_KEY,THEME_KEY,SHELL_LS,TT_KEY,'gtype-draw-n7'],dead=[];
  const base=k=>{const m=/^(.*?)-v\d+/.exec(k);return m?m[1]:null;};
  const known=id=>!!FONTS[id]||id==='imp';
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!k.startsWith('gtype-'))continue;
    if(k.startsWith(KEY+'-f-')){if(!known(k.slice(KEY.length+3)))dead.push(k);continue;}
    if(k.startsWith('gtype-presets-')){if(!known(k.slice(14)))dead.push(k);continue;}
    const b=base(k);if(b&&cur.some(c=>base(c)===b&&!k.startsWith(c)))dead.push(k);}
  for(const k of dead)localStorage.removeItem(k);
}catch(e){}}
function persistLoad(){
  let m=null;try{m=localStorage.getItem(KEY+'-m');}catch(e){}
  if(m){try{const mt=JSON.parse(m),fonts={};
    for(const id of (mt.ids||[])){const j=localStorage.getItem(KEY+'-f-'+id);if(j){fonts[id]=JSON.parse(j);PLAST.set(id,j);}}
    PLAST.set('',m);return {app:'volt',v:3,font:mt.font,fonts,text:mt.text};}catch(e){}}
  try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):null;}catch(e){return null;}
}
function persist(){noStoreNote();PDIRTY.add(S.fontId);PDIRTY.add('imp');clearTimeout(saveT);saveT=setTimeout(()=>idle(persistWrite),400);}
window.addEventListener('pagehide',()=>{if(saveT){clearTimeout(saveT);persistWrite();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&saveT){clearTimeout(saveT);persistWrite();}});
function normStyles(id,src){
  const D=FONTS[id].DEFAULTS,out={};
  for(const k of ['regular','italic']){
    const s=(src&&src[k])||{};const p={...D[k],...s.p};delete p.chamfer;
    const nl=newLattice(),l=s.lat;
    if(l&&l.dx&&l.dx.length===LAT_N){for(let i=0;i<LAT_N;i++)for(let j=0;j<LAT_N;j++){nl.dx[i][j]=+l.dx[i][j]||0;nl.dy[i][j]=+l.dy[i][j]||0;}}
    out[k]={p,lat:nl,
      hg:Array.isArray(s.hg)?s.hg.filter(g=>g&&typeof g.k==='string'&&isFinite(g.d)).map(g=>({...g})):[],
      kern:(s.kern&&typeof s.kern==='object')?{...s.kern}:{},
      ku:(s.ku&&typeof s.ku==='object')?{...s.ku}:{},kc:(s.kc&&typeof s.kc==='object')?{...s.kc}:{}};
  }
  return out;
}
/* FX80 B01: проверка параметров из файла проекта / хранилища. Допустимый диапазон = дорожка ползунка (с учётом значений по умолчанию обоих начертаний).
   Не число -> bad (значение заменяется значением по умолчанию), число вне диапазона -> clamped (приводится к границе). Меняет pr на месте, повторный вызов ничего не меняет. */
function projSanitize(pr){
  const res={bad:0,clamped:0};
  const fonts=(pr&&pr.fonts&&typeof pr.fonts==='object')?pr.fonts:(pr&&pr.styles?{volt:pr}:null);
  if(!fonts)return res;
  const num=v=>{if(typeof v==='number')return v;if(typeof v==='string'&&v.trim()!=='')return +v;return NaN;};
  for(const id in fonts){
    const F=FONTS[id],sl=fonts[id];if(!F||!sl||typeof sl!=='object'||!sl.styles||typeof sl.styles!=='object')continue;
    const D=F.DEFAULTS||{},ov=F.params||{},def={};for(const e of PARAMS)def[e[0]]=e;
    const rng=key=>{const e=def[key];if(!e)return [-2000,2000];
      let o=ov[key],mn=e[2],mx=e[3],st=e[4];if(Array.isArray(o)){mn=o[1];mx=o[2];st=o[3];}
      for(const s of ['regular','italic']){const v=D[s]&&D[s][key];if(v==null||!isFinite(+v))continue;if(+v>mx)mx=+v;if(+v<mn)mn=+v;}
      return [mn,mx];};
    for(const k of ['regular','italic']){
      const st=sl.styles[k];if(!st||typeof st!=='object')continue;
      if(st.p!=null&&(typeof st.p!=='object'||Array.isArray(st.p))){res.bad++;delete st.p;continue;}
      const p=st.p;if(p){for(const key of Object.keys(p)){
        if(key==='__proto__'||key==='constructor'){delete p[key];res.bad++;continue;}
        const v=num(p[key]);
        if(!isFinite(v)){res.bad++;if(D[k]&&D[k][key]!=null)p[key]=D[k][key];else delete p[key];continue;}
        const [mn,mx]=rng(key),c=Math.max(mn,Math.min(mx,v));
        if(c!==v)res.clamped++;
        if(c!==p[key])p[key]=c;}}
      for(const kk of ['kern','ku']){const o=st[kk];if(!o||typeof o!=='object')continue;
        for(const q of Object.keys(o)){const v=o[q];if(typeof v==='number'){if(!isFinite(v)){delete o[q];res.bad++;}else if(Math.abs(v)>2000){o[q]=v<0?-2000:2000;res.clamped++;}}}}}
  }
  return res;
}
function mkSlot(id,d){d=d||{};return {styles:normStyles(id,d.styles),edits:(d.edits&&typeof d.edits==='object')?d.edits:{},family:d.family?String(d.family):FONTS[id].family,kd:!!d.kd,sel:d.sel};}
function stash(){S.lib[S.fontId]={styles:S.styles,edits:S.edits,family:S.family,kd:S.kd,sel:S.sel};}
function activate(id){
  useFont(id);S.fontId=id;
  const sl=S.lib[id]||(S.lib[id]=mkSlot(id));
  S.styles=sl.styles;S.edits=sl.edits;S.family=sl.family;S.kd=sl.kd;
  S.sel=(sl.sel&&GL[sl.sel])?sl.sel:(GL['Ж']?'Ж':CHARSET.find(c=>GL[c]&&c!==' '));
  S.node=null;S.hover=null;cache.clear();DESIGN=null;undoStack.length=0;
  if(!S.kd){try{autoKern('regular');autoKern('italic');S.kd=true;}catch(e){}cache.clear();}
}
let PROJ_FIX={bad:0,clamped:0};
function applyProject(pr){
  if(!pr||typeof pr!=='object')return false;
  PROJ_FIX=projSanitize(pr);
  let target='volt';
  if(pr.fonts&&typeof pr.fonts==='object'){
    stash();
    for(const id in FONTS)if(pr.fonts[id])S.lib[id]=mkSlot(id,pr.fonts[id]);
    if(FONTS[pr.font])target=pr.font;
  }else if(pr.styles){stash();S.lib.volt=mkSlot('volt',pr);}
  else return false;
  if(pr.text)S.text=String(pr.text);
  activate(target);PALL=true;
  return true;
}
/* ---------- отмена ---------- */
const undoStack=[];
function snap(){undoStack.push(JSON.stringify({styles:S.styles,edits:S.edits}));if(undoStack.length>80)undoStack.shift();}
function undo(){const s=undoStack.pop();if(!s){toast('Нечего отменять');return;}const o=JSON.parse(s);S.styles=normStyles(S.fontId,o.styles);S.edits=o.edits||{};S.node=null;syncPanel();bump();}
/* ---------- перерисовка ---------- */
let raf=0,thumbT=0,lastBump=0,hqT=0;
const idle=f=>(window.requestIdleCallback?requestIdleCallback(f,{timeout:400}):setTimeout(f,16));
/* Живой режим: изменения идут подряд (ползунок, умная ручка, перетаскивание точки) — образец
   рисуется быстро (без точного объединения, только текущее начертание пересчитывается),
   миниатюры, библиотека и сверка — после паузы 220 мс, в простое браузера. */
/* начало перетаскивания (ползунок, холст) — сразу живой режим, без тяжёлого первого кадра */
document.addEventListener('input',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=range]')&&typeof SKX!=='undefined'){lastBump=performance.now();SLIDING=true;}},true);
document.addEventListener('pointerdown',e=>{const t=e.target;if(t&&t.matches&&(t.matches('input[type=range]')||t.id==='stage'))lastBump=performance.now();},true);
function bump(){ver++;cache.clear();const now=performance.now();S.live=now-lastBump<260;lastBump=now;schedule();
  clearTimeout(thumbT);clearTimeout(hqT);
  hqT=setTimeout(()=>{const was=S.live;S.live=false;SLIDING=false;
    /* точный знак строится отдельной короткой задачей, затем перерисовка из кеша */
    if(was&&typeof SKX!=='undefined'&&GL[S.sel]&&GL[S.sel].skel){setTimeout(()=>{try{rawGlyph();}catch(e){}schedule();},0);}else if(was)schedule();
    thumbT=setTimeout(()=>idle(()=>{drawThumbs();drawLibrary();if(S.tab==='proof')proofSoon();autoProofSoon();}),0);},220);
  persist();}
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(S.tab==='edit'){drawEditor();drawSpecimen();}});}
const near1=(p,n)=>!p||(Math.abs(p.x-n.x)<0.5&&Math.abs(p.y-n.y)<0.5);
function pathOf(cs,tf){
  const p=new Path2D();
  for(const c of cs){const ns=c.nodes,n=ns.length;if(n<2)continue;
    const a=tf(ns[0].x,ns[0].y);p.moveTo(a[0],a[1]);
    for(let i=0;i<n;i++){const A=ns[i],B=ns[(i+1)%n];const e=tf(B.x,B.y);
      if(!near1(A.b,A)||!near1(B.a,B)){const c1=tf((A.b||A).x,(A.b||A).y),c2=tf((B.a||B).x,(B.a||B).y);p.bezierCurveTo(c1[0],c1[1],c2[0],c2[1],e[0],e[1]);}
      else p.lineTo(e[0],e[1]);}
    p.closePath();}
  return p;
}
function fitCanvas(cv){
  const r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(10,Math.round(r.width*d)),h=Math.max(10,Math.round(r.height*d));
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w:r.width,h:r.height};
}
/* цвета для холстов: --cv-* (не меняются в тёмной теме, холст остаётся светлым листом) важнее одноимённых --* */
const css=n=>{const s=getComputedStyle(document.documentElement);return (s.getPropertyValue('--cv'+n.slice(1))||s.getPropertyValue(n)).trim();};
const MONO='500 12px "Onest",system-ui,sans-serif';
/* ---------- миниатюры ---------- */
let thumbs=[];
function buildGlyphList(){
  const box=$('#glyphs');box.innerHTML='';thumbs=[];
  for(const [title,chars] of GROUPS){
    const h=document.createElement('h3');h.textContent=title;box.appendChild(h);
    const g=document.createElement('div');g.className='gl';
    for(const ch of chars){
      if(!GL[ch])continue;
      const b=document.createElement('button');b.type='button';b.className='gb';b.dataset.ch=ch;b.title=ch+'  U+'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
      const cv=document.createElement('canvas');b.appendChild(cv);
      b.addEventListener('click',()=>selectGlyph(ch));
      g.appendChild(b);thumbs.push({ch,cv,b});
    }
    box.appendChild(g);
  }
  apPaintList();
}
/* миниатюры: порциями по ~20 мс (сначала видимые) — главный поток не замирает после отпускания ползунка */
let thumbJob=0;
function drawThumbs(){
  const fg=css('--glyph');
  const ed=S.edits,job=++thumbJob,vh=innerHeight;
  const list=thumbs.map(t=>{const r=t.cv.getBoundingClientRect();return [t,r,r.bottom>=0&&r.top<=vh?0:1];}).sort((a,b)=>a[2]-b[2]);
  let i=0;
  const step=()=>{if(job!==thumbJob)return;const t0=performance.now();
    for(;i<list.length;i++){const [t,r]=list[i];
      const g=getFinal(t.ch,S.style),mark=!!ed[t.ch];
      /* тот же глиф (объект из кеша), тот же размер и цвет — не перерисовывать */
      if(!(t.g===g&&t.mark===mark&&t.fg===fg&&t.w===r.width&&t.h===r.height)){
        t.g=g;t.mark=mark;t.fg=fg;t.w=r.width;t.h=r.height;
        const {c,w,h}=fitCanvas(t.cv);c.clearRect(0,0,w,h);
        if(g){let sc=h/1150,ox=(w-g.adv*sc)/2,oy=h*0.8;
          const fit=typeof thumbFit==='function'?thumbFit(g,w,h):null;if(fit){sc=fit.sc;ox=fit.ox;oy=fit.oy;}/* «Тяга»: широкие и с выносными знаки вписываются в ячейку с полями */
          c.fillStyle=fg;c.fill(pathOf(g.cs,(x,y)=>[ox+x*sc,oy-y*sc]),'nonzero');
          if(mark){c.fillStyle=css('--accent');c.beginPath();c.arc(w-8,7,3,0,7);c.fill();}}}
      if(performance.now()-t0>20){i++;break;}}
    if(i<list.length)idle(step);};
  step();
  $$('.gb').forEach(b=>b.classList.toggle('on',b.dataset.ch===S.sel));
}
/* ---------- образец текста (с кернингом) ---------- */
/* контекстный вариант знака (как calt в экспорте): у Прописи после о/в/б/ю… — вариант с верхним входом */
function ctxName(prev,ch){const F=FONTS[CUR_FONT];return prev&&F&&F.ctx?F.ctx(prev,ch):ch;}
function layout(text,key,fs,maxW,opt,live){
  const sc=fs/1000,lines=[];
  for(const para of text.split('\n')){
    const words=para.split(' ');let line={chars:[],w:0};
    const adv=ch=>{const g=opt?getFinal(ch,key,opt):gfSmart(ch,key);return g?g.adv*sc:0;};
    const kf=(a,b)=>kernOf(a,b,key,live)*sc;
    const sp=adv(' ');
    words.forEach((wd,wi)=>{
      let ww=0,pv='';for(const ch of wd){ww+=adv(ctxName(pv,ch))+(pv?kf(pv,ch):0);pv=ch;}
      if(line.chars.length&&line.w+sp+ww>maxW){lines.push(line);line={chars:[],w:0};}
      else if(wi>0&&line.chars.length){line.w+=sp;}
      pv='';
      for(const ch of wd){if(pv)line.w+=kf(pv,ch);const gn=ctxName(pv,ch);line.chars.push({ch,gn,x:line.w});line.w+=adv(gn);pv=ch;}
    });
    lines.push(line);
  }
  return {lines,sc};
}
/* Быстрая заливка необъединённых контуров с той же логикой, что у csgUnion:
   внутри группы — nonzero и своё вычитание (op:'sub'), группы складываются, op:'post' — поверх. */
const FAST={live:true};
const _ocA=document.createElement('canvas'),_ocG=document.createElement('canvas');
function fillCSG(c,cs,tf,color){
  let need=false;for(const q of cs)if(q.op||q.grp){need=true;break;}
  c.fillStyle=color;
  if(!need){c.fill(pathOf(cs,tf),'nonzero');return;}
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const q of cs)for(const n of q.nodes)for(const z of [n,n.a,n.b]){if(!z)continue;const p=tf(z.x,z.y);if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}
  if(!(x1>x0&&y1>y0))return;
  const d=c.getTransform().a||1,ox=Math.floor(x0*d)-2,oy=Math.floor(y0*d)-2,W=Math.ceil(x1*d)+2-ox,H=Math.ceil(y1*d)+2-oy;
  for(const cv of [_ocA,_ocG]){if(cv.width<W)cv.width=W;if(cv.height<H)cv.height=H;}
  const A=_ocA.getContext('2d'),G=_ocG.getContext('2d');
  const prep=x=>{x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='source-over';x.clearRect(0,0,W,H);x.setTransform(d,0,0,d,-ox,-oy);x.fillStyle='#000';};
  prep(A);
  const groups=new Map(),post=[];
  for(const q of cs){if(q.op==='post'){post.push(q);continue;}const k=q.grp||0;let g=groups.get(k);if(!g)groups.set(k,g={add:[],sub:[]});(q.op==='sub'?g.sub:g.add).push(q);}
  for(const g of groups.values()){if(!g.add.length)continue;
    if(!g.sub.length){A.fill(pathOf(g.add,tf),'nonzero');continue;}
    prep(G);G.fill(pathOf(g.add,tf),'nonzero');G.globalCompositeOperation='destination-out';G.fill(pathOf(g.sub,tf),'nonzero');
    A.setTransform(1,0,0,1,0,0);A.drawImage(_ocG,0,0,W,H,0,0,W,H);A.setTransform(d,0,0,d,-ox,-oy);}
  if(post.length)A.fill(pathOf(post,tf),'nonzero');
  A.setTransform(1,0,0,1,0,0);A.globalCompositeOperation='source-in';A.fillStyle=color;A.fillRect(0,0,W,H);A.globalCompositeOperation='source-over';
  c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(_ocA,0,0,W,H,ox,oy,W,H);c.restore();
}
/* высота окна «Сравнения» */
function specMaxH(){
  const st=$('#view-edit .stage'),mob=innerWidth<=1060;
  const base=mob?innerHeight*0.36:(st&&st.clientHeight?st.clientHeight*0.42:innerHeight*0.36);
  return Math.round(Math.max(150,Math.min(mob?360:470,base)));
}
function autosizeTxt(){/* поле ввода образца невидимо (ui_smp.js): высота не нужна */}
let SPEC_HITS=[];
function drawSpecimen(){
  if(typeof TT!=='undefined'&&TT.hook())return;/* профессиональный тестер (ui_tester_t1.js) */
  const cv=$('#spec');const box=cv.parentElement;const maxH=specMaxH();
  if(S.cmp&&S.cmp.on){box.style.height=maxH+'px';drawCompare();return;}
  const live=!!S.live;
  const maxW=Math.max(200,box.clientWidth-40);let fs=S.specSize;
  const rows=['regular','italic'];
  /* в живом режиме пересчитывается только текущее начертание (быстрая заливка), второе — из кеша */
  const optOf=k=>(live&&k===S.style)?FAST:undefined;
  let lays,total;
  /* кегль уменьшается, только если слово не помещается по ширине; высота окна — по содержимому
     (пустые строки в конце текста не считаются) */
  const raw=String(S.text||''),ph=!raw.trim();/* пусто: образец по умолчанию приглушённым цветом */
  const txt=ph?smpDefault():(raw.replace(/[ \t]+$/,'')||' ');
  for(let it=0;it<16;it++){
    lays=rows.map(k=>layout(txt,k,fs,maxW,optOf(k),live));
    let wmax=0;lays.forEach(L=>L.lines.forEach(l=>{if(l.w>wmax)wmax=l.w;}));
    total=14;lays.forEach(L=>total+=L.lines.length*fs*1.15+10);total+=8;
    const mhF=Math.max(maxH,110);if((wmax<=maxW+0.5&&total<=mhF)||fs<=12)break;
    fs=Math.max(12,Math.floor(fs*Math.min(0.97,maxW/wmax,mhF/total)));
  }
  const H=Math.ceil(Math.max(110,total));
  box.style.height=Math.min(H,Math.max(maxH,110))+'px';cv.style.height=H+'px';/* длинный текст — прокрутка внутри окна образца */
  const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  const fg=css('--glyph'),dim=css('--glyph-dim'),ln=css('--line');
  let y=14;SPEC_HITS=[];const y00=14,RC=[];
  rows.forEach((k,ri)=>{
    const L=lays[ri],sc=L.sc,o=optOf(k),col=ph?dim:(k===S.style?fg:dim),RR=[];RC.push(RR);
    L.lines.forEach(line=>{
      const base=y+fs*0.86;
      /* границы между буквами (для «Поправить пару»): x — начало второй буквы */
      line.chars.forEach((it,ii)=>{if(ii&&it.ch!==' '&&line.chars[ii-1].ch!==' ')SPEC_HITS.push({a:line.chars[ii-1].ch,b:it.ch,x:20+it.x,y0:y,y1:y+fs*1.15});});
      for(const it of line.chars){const g=o?getFinal(it.gn||it.ch,k,o):gfSmart(it.gn||it.ch,k);
        RR.push({ch:it.ch,x0:20+it.x,x1:20+it.x+(g?g.adv*sc:0),y0:y+fs*0.04,y1:y+fs*1.06});
        if(!g||!g.cs.length)continue;
        const tf=(x,yy)=>[20+it.x+x*sc,base-yy*sc];
        if(o||g.live)fillCSG(c,g.cs,tf,col);else{c.fillStyle=col;c.fill(pathOf(g.cs,tf),'nonzero');}}
      y+=fs*1.15;
    });
    y+=10;if(ri<rows.length-1){c.strokeStyle=ln;c.beginPath();c.moveTo(20,y-8);c.lineTo(w-20,y-8);c.stroke();}
  });
  S.specFs=fs;
  smpCommit('spec',RC,ph?'':raw,{left:20,line:{y0:y00+fs*0.04,y1:y00+fs*1.06},pitch:fs*1.15,spw:fs*0.26});
}
/* FX80 F3 (D02): тост поднимается над канвас-доком (#zout/#fit/#zin), если иначе закрыл бы его */
function toastPlace(t){
  try{
    t.style.bottom='';
    /* editor canvas dock (.tools) and draw dock (#dr-dock): the toast sits fully above whichever one it would cover */
    const gap=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s2'))||8,w=t.offsetWidth,h=t.offsetHeight,c=innerWidth/2;
    const bot0=innerHeight-parseFloat(getComputedStyle(t).bottom||0);let top=1e9;
    for(const d of document.querySelectorAll('.tools,#dr-dock,.un-p,.heat-tip.pin')){   /* W96-R: панель подложки и закреплённая карточка карты тоже нельзя закрывать (оба fixed: offsetParent пуст) */
      if(!d.getClientRects().length)continue;const r=d.getBoundingClientRect();
      if(c+w/2<=r.left||c-w/2>=r.right)continue;
      if(bot0<r.top-gap||bot0-h>r.bottom+gap)continue;
      top=Math.min(top,r.top);}
    if(top<1e9)t.style.bottom=(innerHeight-top+gap)+'px';
  }catch(e){}
}
const modalOpen=()=>[...document.querySelectorAll('[aria-modal=true]')].some(e=>!e.hidden&&e.offsetParent!==null);
let tt=0,tdef=0;function toast(m){if(document.body.dataset.pst){const g=document.querySelector('#pst .pst-msg');if(g)g.textContent=m;return;}
  /* a toast never lies over an open dialog/sheet: it waits (up to 8 s) until the dialog closes */
  if(modalOpen()){clearTimeout(tdef);const t0=Date.now(),w=()=>{if(!modalOpen())toast(m);else if(Date.now()-t0<8000)tdef=setTimeout(w,300);};tdef=setTimeout(w,300);return;}
  const t=$('#toast');t.textContent=m;toastPlace(t);requestAnimationFrame(()=>requestAnimationFrame(()=>toastPlace(t)));setTimeout(()=>toastPlace(t),350);t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600);}

/* ---------- библиотека шрифтов ---------- */
const LIBG=new Map();
const LIB_VIEWS={home:'view-lib',library:'view-library',fav:'view-fav'};
/* обложки: см. cvDraw ниже (Stage 3) */
/* строка знаков шрифта id (useFont(id) уже вызван): {items:[[знак,x]], tot, cap}; wn — вес семейства (Light/Regular/Bold/Black), без него обычное начертание */
function libRun(id,txt,wn,sty,slotOv){
  const slot=slotOv||(id===S.fontId?{styles:S.styles,edits:S.edits}:(S.lib[id]||(S.lib[id]=mkSlot(id))));
  const st=slot.styles[sty&&slot.styles[sty]?sty:'regular'],p=wn?famParams(st.p,wn):st.p,sst=wn?Object.assign({},st,{p}):st;
  const ssig=id+'|'+JSON.stringify([p,st.lat,st.hg]);
  /* знаки кешируются по (шрифт, параметры, правки): повторные перерисовки (размер окна, вкладки) ничего не строят */
  const get=ch=>{const ee=edGet(slot.edits,ch),ek=ee?JSON.stringify(ee):'',mk=ssig+'|'+ch+'|'+ek;let g=LIBG.get(mk);
    if(g===undefined){g=finalGlyph(ch,sst,slot.edits);if(LIBG.size>2500)LIBG.clear();LIBG.set(mk,g);}return g;};
  const items=[];let tot=0;
  for(const ch of txt){let g=get(ch);if(!g){const u=ch.toUpperCase();if(u!==ch)g=get(u);}if(!g)continue;items.push([g,tot,ch]);tot+=g.adv;}
  /* высота прописной по знаку «Н» (нет его: по параметру capH) */
  let cap=0;const H=get('Н')||get('H');
  if(H)for(const c of H.cs)for(const n of c.nodes)if(n.y>cap)cap=n.y;
  if(!(cap>100))cap=p.capH||700;
  return {items,tot,cap};
}
/* ---------- обложки шрифтов (Stage 3) ----------
   Правило проекта: ничего не выходит за край. Герой-слово целиком внутри полей обложки, подгонка по границам чернил (узлы и ручки контуров);
   чем длиннее слово при заданной высоте, тем шире герой: слово подбирается так, чтобы чернила занимали всю ширину поля (не уже 2/3 обложки).
   Два спутника другого рода: плашка «Аа» (знаки шрифта) и тег с числом знаков. Строк: 3 (у узкой полосы списка 2). Слова настоящие, подбор по знакам шрифта. */
const CV_RU=['Март','Окно','Мост','Звук','Ритм','Свет','Река','Лист','Небо','Холм','Город','Афиша','Весна','Музей','Берег','Лампа','Огонь','Парус','Сосна','Ветер','Рынок','Театр','Плакат','Журнал','Вокзал','Облако','Ракета','Сирень','Дорога','Витрина','Рассвет','Пекарня','Станция','Площадь','Комната','Мелодия','Корабль','Колокол','Праздник','Выставка','Открытка','Типограф','Алфавит','Лестница','Кинотеатр','Гостиница','Оранжерея','Побережье','Библиотека','Типография','Фотография','Мастерская','Расписание','Архитектура','Путешествие','Каллиграфия','Ночной экспресс','Книжный магазин','Выставка плакатов','Расписание поездов','Утро в городе','Летний вечер','Старая библиотека','Выставка старых плакатов','Большая типография города','Расписание вечерних поездов','Афиша осеннего кинотеатра','Мастерская вывесок и афиш','Новая книжная лавка'];
const CV_LA=['Kiosk','Metro','Orbit','Paper','Night','Poster','Garden','Harbor','Market','Studio','Cinema','Gallery','Journal','Skyline','Festival','Midnight','Magazine','Wednesday','Typography','Exhibition','Lighthouse','Architecture','Night Express','Morning Market','Poster Exhibition','Bridge','Ticket','Violin','Sunrise','Station','Postcard','Bakery','Theatre','Calendar','Alphabet','Lantern','Evening Poster Exhibition','Old Town Print Workshop','Morning Market Schedule','Autumn Cinema Programme'];
const cvHash=s=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619);}return x>>>0;};
/* раскладка по высоте холста: strip (полоса списка, мини-карточка), wide (карточка), phone (карточка на телефоне: выше, спутники крупнее).
   top = верх области героя: под плашками и под вырезом карточки (кнопка со стрелкой в правом верхнем углу, 56 px + скругление) */
function cvLayout(h){
  if(h<110)return {k:'strip',pad:8,top:6,bot:6,chip:18,res:38};
  if(h>=160)return {k:'phone',pad:14,top:66,bot:12,chip:28,res:0};
  return {k:'wide',pad:14,top:62,bot:12,chip:26,res:0};
}
/* границы чернил знака в единицах шрифта (узлы вместе с ручками кривых), кеш на объекте знака */
const CV_X=new WeakMap();
function cvInk(g){let r=CV_X.get(g);if(r)return r;let a=1e9,b=-1e9,c=1e9,d=-1e9;
  for(const cs of g.cs)for(const n of cs.nodes)for(const q of [n,n.a,n.b]){if(!q)continue;if(q.x<a)a=q.x;if(q.x>b)b=q.x;if(q.y<c)c=q.y;if(q.y>d)d=q.y;}
  r=[a,b,c,d];CV_X.set(g,r);return r;}
function cvInkRun(run){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const [g,xx] of run.items){const k=cvInk(g);if(k[0]>k[1])continue;x0=Math.min(x0,xx+k[0]);x1=Math.max(x1,xx+k[1]);y0=Math.min(y0,k[2]);y1=Math.max(y1,k[3]);}
  return {x0,x1,y0,y1,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};}
/* масштаб героя: по ширине поля и по высоте области, что меньше */
function cvFit(L,w,h,ik){const Aw=w-2*L.pad-L.res,Ah=h-L.top-L.bot,fw=Aw/ik.w,fh=Ah/ik.h;return {Aw,Ah,fw,fh,sc:Math.min(fw,fh)};}
const cvOk=(run,word)=>run.tot>0&&run.items.length===[...word].length;
/* какое слово взять: длина подгоняется так, чтобы высота и ширина поля заполнялись вместе; проверяются знаки шрифта (кириллица, затем латиница) */
function cvWord(id,w,h,L,used){
  const hs=cvHash(id),tags=fmeta(id).tags;
  let res=null;
  for(const pool of [CV_RU,CV_LA]){
    let tgt=tags.includes('narrow')?9:tags.includes('wide')?5:7,best=null,tried=new Set(used||[]),fails=0;
    for(let it=0;it<6;it++){
      let cand=null;
      for(let d=0;d<16&&!cand;d++){
        const opts=pool.filter(x=>!tried.has(x)&&Math.abs([...x].length-tgt)===d);
        if(opts.length)cand=opts[(hs+it)%opts.length];
      }
      if(!cand)break;
      tried.add(cand);
      const run=libRun(id,cand);
      if(!cvOk(run,cand)){if(++fails>=3)break;continue;}
      const f=cvFit(L,w,h,cvInkRun(run)),sc=f.fw>f.fh?1.5*Math.log(f.fw/f.fh):Math.log(f.fh/f.fw);
      if(!best||sc<best.sc)best={word:cand,sc};
      if(sc<.08)break;
      const len=[...cand].length;let nt=Math.max(3,Math.min(30,Math.round(len*f.fw/f.fh)));
      if(nt===len)nt+=f.fw>f.fh?1:-1;tgt=nt;
    }
    if(best){res=best.word;break;}
  }
  return res||FONTS[id].name;
}
function cvPl(n,a,b,c){return (n%10===1&&n%100!==11)?a:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?b:c;}
function cvTag(id,short){const m=fmeta(id),g=m.glyphs;
  if(g>0)return g+' '+cvPl(g,'знак','знака','знаков')+(short?'':(m.charset==='basic'?' · базовый':'')+(m.tags.includes('vf')?' · VF':''));
  return m.styles.length>1?'Прямой + курсив':'Прямой';}
function cvPill(c,x,y,w,h){const r=h/2;c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.arc(x+w-r,y+r,r,-Math.PI/2,Math.PI/2);c.lineTo(x+r,y+h);c.arc(x+r,y+r,r,Math.PI/2,Math.PI*1.5);c.closePath();}
/* плашка «Аа» знаками самого шрифта; возвращает ширину */
function cvChip(c,id,x,y,hh,bg,fg){
  let run=libRun(id,'Аа');if(!cvOk(run,'Аа'))run=libRun(id,'Aa');
  const ok=cvOk(run,'Aa'),capH=hh*.46,sc=ok?capH/run.cap:1,tw=ok?run.tot*sc:hh*.9,w=tw+hh*.8;
  c.fillStyle=bg;cvPill(c,x,y,w,hh);c.fill();c.fillStyle=fg;
  if(ok){const bx=x+(w-tw)/2,by=y+hh/2+capH/2;for(const [g,xx] of run.items)c.fill(pathOf(g.cs,(px,py)=>[bx+xx*sc+px*sc,by-py*sc]),'nonzero');}
  else{c.font='700 '+(hh*.5)+'px Onest,system-ui,sans-serif';c.textBaseline='middle';c.textAlign='center';c.fillText('Аа',x+w/2,y+hh/2+1);c.textAlign='left';}
  return w;
}
function cvTagDraw(c,txt,x,y,hh,fs,line,fg){
  c.font='600 '+fs+'px Onest,system-ui,sans-serif';const tw=c.measureText(txt).width,w=tw+hh*.9;
  c.strokeStyle=line;c.lineWidth=1;cvPill(c,x+.5,y+.5,w-1,hh-1);c.stroke();
  c.fillStyle=fg;c.textBaseline='middle';c.textAlign='left';c.fillText(txt,x+hh*.45,y+hh/2+.5);return w;
}
function cvDraw(cv,id,c,w,h,ctxt,ctext,pick){
  const L=cvLayout(h),glyph=css('--glyph'),canvas=css('--canvas'),line=css('--glyph-dim'),muted=css('--muted');
  const custom=!!ctxt;let word,run;
  if(custom){word=ctext(id);run=libRun(id,word,undefined,cv.dataset.sty);}
  else{
    const key=id+'|'+Math.round(w)+'|'+Math.round(h);let pw=pick.by.get(key);
    if(!pw){pw=cvWord(id,w,h,L,pick.used);pick.used.add(pw);pick.by.set(key,pw);}
    word=pw;run=libRun(id,word,undefined,cv.dataset.sty);
  }
  let ik=cvInkRun(run),f=cvFit(L,w,h,ik),sc=f.sc;
  if(custom){
    /* свой текст: тот же кадр; не крупнее минимальной высоты прописной, при нехватке места «…» */
    const minCap=window.LIBTXT_MINCAP||16;
    if(sc*run.cap<minCap){sc=minCap/run.cap;
      if(ik.w*sc>f.Aw){const ell=libRun(id,'\u2026').items.length?'\u2026':'...',ch=[...word];
        while(ch.length>1){ch.pop();const r2=libRun(id,ch.join('').trimEnd()+ell,undefined,cv.dataset.sty),k2=cvInkRun(r2);if(k2.w*sc<=f.Aw){run=r2;ik=k2;word=ch.join('')+ell;break;}}}}
  }
  const items=run.items,x0=L.pad+L.res-ik.x0*sc,base=L.top+f.Ah/2+(ik.y0+ik.y1)/2*sc;
  c.fillStyle=glyph;
  for(const [gl,xx] of items)c.fill(pathOf(gl.cs,(px,py)=>[x0+xx*sc+px*sc,base-py*sc]),'nonzero');
  /* спутники */
  let n=1;const chh=L.chip;
  if(L.k==='strip'){cvChip(c,id,L.pad,(h-chh)/2,chh,glyph,canvas);n++;}
  else{
    const y=12,cw=cvChip(c,id,L.pad,y,chh,glyph,canvas);n++;
    const th=chh-4,fs=L.k==='phone'?12:11;
    /* тег не заходит под вырез карточки: полный текст, иначе короткий */
    c.font='600 '+fs+'px Onest,system-ui,sans-serif';const room=w-60-(L.pad+cw+6),fit=t=>c.measureText(t).width+th*.9<=room;
    let tg=cvTag(id);if(!fit(tg))tg=cvTag(id,true);
    cvTagDraw(c,tg,L.pad+cw+6,y+(chh-th)/2,th,fs,line,muted);n++;
  }
  const D=cv.dataset;D.cover=word;D.cap=(sc*run.cap).toFixed(2);D.vis=(ik.w*sc/w).toFixed(3);D.strings=n;D.layout=L.k;
  D.ix0=(x0+(ik.x0)*sc).toFixed(1);D.ix1=(x0+ik.x1*sc).toFixed(1);D.iy0=(base-ik.y1*sc).toFixed(1);D.iy1=(base-ik.y0*sc).toFixed(1);D.pad=L.pad;D.top=L.top;D.bot=L.bot;
}
/* живые образцы: все холсты .lcv видимого раздела (карточки и плитки категорий) */
/* Рисуется по одному шрифту; пока кеш знаков холодный (старт), после ~DL_BUDGET мс отдаёт управление браузеру и продолжает следующей задачей:
   первый кадр и ввод не ждут все обложки. Тёплая перерисовка (тема, размер окна) укладывается в один проход. Новый вызов отменяет незаконченный. */
const DL_BUDGET=24;let DL_JOB=0,DL_MORE=0;
function drawLibrary(){
  const root=document.getElementById(LIB_VIEWS[S.tab]);if(!root)return;
  const ink=css('--ink'),glyph=css('--glyph');
  /* Свой текст на обложках библиотеки (ui_port.js): window.LIBTXT, или LIBTXT_NAME = название шрифта; на главной всегда слова-герои */
  const useT=S.tab!=='home',ctxt=useT?(window.LIBTXT||(window.LIBTXT_NAME?'\u0001':'')):'',ctext=id=>(useT&&window.LIBTXT)||FONTS[id].name;
  const pick={used:new Set(),by:new Map()};/* слова не повторяются в одном виде: по порядку шрифтов, уже занятые пропускаются */
  const ids=Object.keys(FONTS),job=++DL_JOB;let k=0;
  const one=id=>{
    const cvs=root.querySelectorAll('canvas.lcv[data-font="'+id+'"]');if(!cvs.length)return;
    useFont(id);
    for(const cv of cvs){
      const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
      if(!cv.dataset.txt&&!cv.dataset.circ){cvDraw(cv,id,c,w,h,ctxt,ctext,pick);continue;}
      const txt=cv.dataset.txt;
      let run=libRun(id,txt,undefined,cv.dataset.sty);let tot=run.tot,items=run.items;
      let sc,base;
      if(cv.dataset.circ){
        /* круг в шапке: высота прописной = доля диаметра (data-circ, подбирается под шрифт), знаки по центру, цвет из токена (data-fill) */
        sc=Math.min(h*(+cv.dataset.circ||0.34)/run.cap,w*0.8/Math.max(tot,1));base=h*0.5+run.cap*sc*0.5;
      }else{
        sc=Math.min(h*0.72/700,(w-(cv.dataset.ink?16:64))/Math.max(tot,1));base=h*0.5+h*0.72*0.5;
      }
      c.fillStyle=cv.dataset.fill?css(cv.dataset.fill):cv.dataset.ink?ink:glyph;
      for(const [g,xx] of items)c.fill(pathOf(g.cs,(px,py)=>[(w-tot*sc)/2+xx*sc+px*sc,base-py*sc]),'nonzero');
    }
  };
  const run=()=>{
    if(job!==DL_JOB)return;
    const back=S.fontId,t0=performance.now();let more=false;
    try{while(k<ids.length){one(ids[k++]);if(k<ids.length&&performance.now()-t0>DL_BUDGET){more=true;break;}}}
    catch(e){console.error(e);k=ids.length;}
    finally{try{useFont(back);}catch(e){}}
    DL_MORE=more?1:0;
    if(more)setTimeout(run,0);
  };
  run();
}
/* фоновая работа старта закончена (лента главной, обложки, автокернинг): для тестов и замеров */
function bgQuiet(){const b=document.getElementById('hm-bg');return !DL_MORE&&!(typeof PODB_MORE!=='undefined'&&PODB_MORE)&&(!b||b.classList.contains('on')||!HM_JOB.q||!hmHome())&&!!S.kd;}
/* карточки строит ui_lib_u1.js (главная, библиотека, избранное) */
function buildLibrary(){
  if(typeof libBuildAll==='function')libBuildAll();
  syncLibrary();
}
function syncLibrary(){
  $$('.lcard[data-font]').forEach(d=>{const on=d.dataset.font===S.fontId&&!!window.LIB_PICKED;/* FX80 F3 (A16): отметка «открыт» только после выбора шрифта пользователем */d.classList.toggle('on',on);if(on)d.setAttribute('aria-current','true');else d.removeAttribute('aria-current');});
}
function switchFont(id){
  if(!FONTS[id]||id===S.fontId)return;
  window.LIB_PICKED=true;
  stash();activate(id);
  S.view={zoom:1,px:0,py:0};S.text=FONTS[id].sampleText||S.text;
  buildGlyphList();buildPanel();buildMethods();syncPanel();syncLibrary();if(typeof renderPre==='function')renderPre();if(typeof syncCmp==='function')syncCmp();
  S.proofFont=null;bump();drawLibrary();
  toast('Открыт шрифт «'+FONTS[id].name+'»');
}
