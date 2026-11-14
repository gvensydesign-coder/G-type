/* ===== «Отрисуй свой шрифт»: интерфейс (вид window.GT_DRAW) =====
   Оболочка вызывает GT_DRAW.mount(#view-draw) один раз, затем onShow()/onHide(); hasWork() — есть ли несобранный рисунок.
   Геометрия и измерения — core_draw_n7.js. Готовый шрифт собирается тем же путём, что «Собрать из своих знаков»
   (IMP.glyphs -> iuRegisterNow), поэтому правка, кернинг, сверка и экспорт работают как обычно.
   Поля между знаками (оптические) передаются в нормализацию набора обёрткой impNormalize ниже: файлы ядра не правятся. */
(function(){
'use strict';
const LSK='gtype-draw-n7';
const SETS={cyr:{n:'Базовая кириллица',s:'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя'},
  lat:{n:'Латиница',s:'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'},
  num:{n:'Цифры и знаки',s:'0123456789.,:;!?-–—()«»"'},
  cyx:{n:'Кириллица +',t:'Ё Ў Ї Ѓ Ќ и другие знаки с диакритикой — собираются сами из букв и знаков',s:'ЁёЎўІіЇїЃѓЌќ'},
  lax:{n:'Латиница +',t:'Латинские буквы с диакритикой — собираются сами из букв и знаков',s:(()=>{const m=drnCompSpec();let o='';for(const c of (typeof EXTLAT==='string'?EXTLAT:''))if(m[c]&&/[A-Za-z]/.test(m[c][0]))o+=c;return o;})()},
  dia:{n:'Диакритика',t:'Знаки отдельно: кратка, диэрезис, акут и другие. Нарисуйте знак — буквы с ним соберутся сами',s:DRN_MARKS.map(m=>m[0]).join('')}};
const GRIDS={mod:{n:'Модульная',rows:7,cols:5},circ:{n:'Круги и диагонали',rows:7,cols:6},tile:{n:'Плитка 4×4',rows:4,cols:4},
  diag:{n:'Диагональная 45°',rows:10,cols:7},pix:{n:'Пиксельная',rows:14,cols:10},none:{n:'Без сетки',rows:7,cols:6},cell:{n:'Ячейки',rows:10,cols:10}};
const TOOLS=[['pen','Перо','1'],['shape','Фигуры','2'],['brush','Кисть','3'],['marker','Маркер','4'],['erase','Ластик','5'],['select','Выделение','6'],['cells','Ячейки','=']];
const CL_MAX=8,CL_NAME=24;/* слоёв ячеек в знаке, длина имени слоя */
const SHAPES=[['rect','Прямоугольник'],['ell','Эллипс и круг'],['tri','Треугольник'],['quad','Четверть круга']];
const PANGR={ru:'Съешь же ещё этих мягких французских булок, да выпей чаю',en:'The quick brown fox jumps over the lazy dog',num:'0123456789 Аа Бб Вв Гг Дд'};
const ICO={
  pen:'M4 20l1-4 11-11 3 3L8 19z M14 7l3 3',shape:'M4 4h9v9H4z M21 16.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0z',
  brush:'M19 3.5a2.1 2.1 0 013 3L12 16l-4 1 1-4z M7.5 17.5C7 20 5.5 21 3 21c2.5-.5 3-2 4.5-3.5',
  marker:'M5 19l1-4 9-9 3 3-9 9z M13 8l3 3 M4 21.5h16',eraser:'M7 20h13 M5.5 13.5l8-8a2 2 0 013 0l3 3a2 2 0 010 3L12.5 20H8z M9.5 9.5l5 5',
  select:'M6 3l12 8-5.5 1.4L9.5 18z',
  gridv:'M4 4h16v16H4z M4 12h16 M12 4v16',
  cells:'M3.5 7.5a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0 M13.5 7.5a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0 M3.5 16.5a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0 M13.5 16.5a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0',
  trash:'M5 7h14 M10 7V4h4v3 M7 7l1 13h8l1-13',mirror:'M12 3v18 M8 7l-5 5 5 5z M16 7l5 5-5 5z',copy:'M9 9h11v11H9z M4 15V4h11',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z',
  play:'M7 4l13 8-13 8z',plus:'M12 5v14 M5 12h14',eyeoff:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z M4 4l16 16',up:'M6 15l6-6 6 6',down:'M6 9l6 6 6-6',
  bulb:'M9 18h6 M10 21h4 M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z',
  rect:'M4 6h16v12H4z',ell:'M12 5a8 7 0 100 14 8 7 0 000-14z',tri:'M4 20V4l16 16z',quad:'M4 20V4a16 16 0 0116 16z',
  save:'M5 3h11l3 3v15H5z M8 3v6h8V3 M8 21v-7h8v7',dup:'M8 8h12v12H8z M4 16V4h12',flip:'M4 12h16 M8 8l-4 4 4 4 M16 8l4 4-4 4'};
const CI={undo:'undo',redo:'redo',hist:'history',check:'check',sun:'sun',moon:'moon',x:'close'};
/* иконки без своего файла: viewBox сдвинут так, чтобы геометрический центр контура лежал в центре 24×24 (иначе знак «плывёт» в кнопке) */
const ICV={};
function icBox(n){if(ICV[n])return ICV[n];let v='0 0 24 24';
  try{const sv=document.createElementNS('http://www.w3.org/2000/svg','svg'),pa=document.createElementNS('http://www.w3.org/2000/svg','path');
    sv.setAttribute('viewBox','0 0 24 24');sv.style.cssText='position:absolute;left:-99px;top:0;width:24px;height:24px;visibility:hidden';pa.setAttribute('d',ICO[n]);sv.appendChild(pa);document.body.appendChild(sv);
    const bb=pa.getBBox();document.body.removeChild(sv);if(bb.width>0&&bb.height>0)v=(bb.x+bb.width/2-12).toFixed(2)+' '+(bb.y+bb.height/2-12).toFixed(2)+' 24 24';}catch(e){}
  return ICV[n]=v;}
const ic=(n,w)=>CI[n]?'<i class="ico i-'+CI[n]+'" style="width:'+(w||22)+'px;height:'+(w||22)+'px"></i>':'<svg viewBox="'+icBox(n)+'" width="'+(w||22)+'" height="'+(w||22)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+ICO[n]+'"/></svg>';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const jc=o=>JSON.parse(JSON.stringify(o,(k,v)=>k[0]==='_'?undefined:v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const toast=m=>{try{if(typeof window.toast==='function')window.toast(m);}catch(e){}};
/* ---------------- состояние ---------------- */
const D={set:'cyr',ch:'А',tool:'shape',shape:'rect',er:'stroke',w:70,grid:'mod',gp:{},snap:true,ghost:true,nbr:true,cv:'auto',tab:'grid',
  g:{},name:'Мой шрифт',built:false,shown:false,flip:false,recs:[],mounted:false,col:null,poly:false,anc:true,
  cs:null,link:'none',cshow:true,cmode:'draw',pg:'mod',pl:[],cdel:0,crn:-1,ak:{sp:0,k:0,s:100,kw:[]}};
for(const k in GRIDS)D.gp[k]={rows:GRIDS[k].rows,cols:GRIDS[k].cols};
D.cs=drcNorm({});
const cur={ch:null,items:[],al:0,undo:[],redo:[],sel:-1,grp:[],grpFor:-2,grpN:-1,dirty:false,cols:4,pen:null,hover:null};
const ui={};
let P=null,rafId=0,saveT=0;
const setOf=ch=>{for(const k in SETS)if(SETS[k].s.includes(ch))return k;return null;};
const chars=()=>Array.from(SETS[D.set].s);
const cell=()=>700/D.gp[D.grid].rows;
const cellOr=()=>D.grid==='none'?100:cell();
const colsNow=()=>cur.cols;
const Wd=()=>colsNow()*cellOr();
const isSaved=ch=>!!(D.g[ch]&&D.g[ch].s&&D.g[ch].cs&&D.g[ch].cs.length);
const savedList=()=>Object.keys(D.g).filter(isSaved);

/* ---------------- составные знаки и якоря ---------------- */
const TINTS=['#c0504f','#4a78c9','#3a8f5f','#b9822a','#8566b8','#2f8ea0','#b95a92'];
const csId=(()=>{const wm=new WeakMap();let n=0;return cs=>{let v=wm.get(cs);if(!v){v=++n;wm.set(cs,v);}return v;};})();
const CC=new Map();
/* основа: сама буква или её двойник (кириллица/латиница) */
function baseRec(c){if(isSaved(c))return {ch:c,r:D.g[c]};const t=IMP_TWIN[c];if(t&&isSaved(t))return {ch:t,r:D.g[t]};return null;}
/* якоря основы: авто + смещения пользователя (r.anc = {t:[dx,dy], b:[dx,dy]}) */
function ancInfo(ch){
  const r=D.g[ch];if(!r||!r.s||!r.cs)return null;
  const k=csId(r.cs)+'|'+(r.anc?JSON.stringify(r.anc):'');
  if(r._ai&&r._ai.k===k)return r._ai;
  const dotted=DRN_DOTTED.includes(ch),tcs=dotted?drnDotless(r.cs):r.cs,at=drnAnch(tcs.length?tcs:r.cs),ab=drnAnch(r.cs);
  if(!at||!ab)return null;
  const o=r.anc||{},t=o.t||[0,0],b=o.b||[0,0];
  return r._ai={k,cs:tcs.length?tcs:r.cs,autoT:at.top,autoB:ab.bot,top:{x:at.top.x+t[0],y:at.top.y+t[1]},bot:{x:ab.bot.x+b[0],y:ab.bot.y+b[1]}};}
function comp(ch){
  if(isSaved(ch))return null;
  const sp=drnCompSpec()[ch];if(!sp)return null;
  const m=D.g[sp[1]];if(!m||!m.s||!m.cs)return null;
  const b=baseRec(sp[0]);if(!b)return null;
  const ai=ancInfo(b.ch);if(!ai)return null;
  const mi=drnMarkInfo(sp[1]),below=mi[4]==='b',bcs=below?b.r.cs:ai.cs;
  const key=csId(bcs)+'|'+csId(m.cs)+'|'+(b.r.anc?JSON.stringify(b.r.anc):'')+'|'+sp[1]+b.ch;
  const e=CC.get(ch);if(e&&e.key===key)return e.rec;
  const pt=below?ai.bot:ai.top,mc=drnPlaceMark(drnCp(m.cs),pt,below?'b':'t');
  let cs;try{cs=drnEval([{k:'add',cs:bcs},{k:'add',cs:mc}]);}catch(x){cs=[];}
  if(!cs.length){CC.delete(ch);return null;}
  const rec={comp:true,ch,base:b.ch,mark:sp[1],cs,items:[],s:true,sp:null,pt,mb:impBBox(mc),below,cols:b.r.cols||0};
  CC.set(ch,{key,rec});return rec;}
const hasG=ch=>isSaved(ch)||!!comp(ch);
const R=ch=>isSaved(ch)?D.g[ch]:comp(ch);
function allList(){const o=savedList();for(const ch of Object.keys(drnCompSpec()))if(!isSaved(ch)&&comp(ch))o.push(ch);return o;}
const compCount=()=>Object.keys(drnCompSpec()).filter(c=>!isSaved(c)&&comp(c)).length;
/* на какой основе показывать якоря текущего знака */
function ancTarget(){const ch=cur.ch;if(!ch||!D.anc||drnMarkInfo(ch))return null;
  if(isSaved(ch)){const a=ancInfo(ch);return a?{ch,a}:null;}
  const c=comp(ch);if(c){const a=ancInfo(c.base);return a?{ch:c.base,a,comp:c}:null;}
  return null;}
function ancPts(){const t=ancTarget();if(!t)return null;return [{k:'t',x:t.a.top.x,y:t.a.top.y},{k:'b',x:t.a.bot.x,y:t.a.bot.y}];}
const draftFor=ch=>drnDraft(ch,c=>isSaved(c)?D.g[c].cs:null);
function polyMembers(ch){return drnPolyMembers(ch).map((c,i)=>({ch:c,tint:TINTS[i%TINTS.length]})).filter(m=>isSaved(m.ch));}
/* ---------------- хранение ---------------- */
function packItems(items){return items.map(it=>{const o={k:it.k,t:it.t,c:impPackC(it.cs)};
  if(it.pen)o.p={c:it.pen.closed?1:0,n:it.pen.nodes.map(n=>[n.x,n.y,n.a?n.a.x:null,n.a?n.a.y:null,n.b?n.b.x:null,n.b?n.b.y:null])};
  if(it.cl){o.l={g:it.cl.g,c:it.cl.c,s:it.cl.s};if(it.cl.n)o.l.n=it.cl.n;if(it.cl.h)o.l.h=1;}return o;});}
const cellInts=a=>{const o=[];if(Array.isArray(a))for(let q=0;q+1<a.length&&o.length<12000;q+=2){const i=Math.round(+a[q]),j=Math.round(+a[q+1]);if(isFinite(i)&&isFinite(j)&&i>=-300&&i<300&&j>=-300&&j<300)o.push(i,j);}return o;};
function unpackItems(arr){const out=[];if(!Array.isArray(arr))return out;
  for(const o of arr){try{const cs=impUnpackC(o.c);if(!cs.length&&!(o.l&&o.l.g))continue;/* пустой слой ячеек — тоже слой */const it={k:o.k==='sub'?'sub':'add',t:o.t||'x',cs};
    if(o.p&&Array.isArray(o.p.n))it.pen={closed:!!o.p.c,nodes:o.p.n.map(r=>({x:+r[0],y:+r[1],a:r[2]==null?null:{x:+r[2],y:+r[3]},b:r[4]==null?null:{x:+r[4],y:+r[5]}}))};
    if(o.l&&o.l.g){it.cl={g:drcNorm(o.l.g),c:cellInts(o.l.c),s:cellInts(o.l.s)};const nm=typeof o.l.n==='string'?o.l.n.trim().slice(0,CL_NAME):'';if(nm)it.cl.n=nm;if(o.l.h)it.cl.h=1;}
    out.push(it);}catch(e){}}
  return out;}
function packAll(){cellFlushAll();commitCur(false);
  const g={};for(const ch of Object.keys(D.g)){const r=D.g[ch];if(!r.items.length&&!r.s)continue;
    g[ch]={i:packItems(r.items),s:r.s?1:0,c:r.s&&r.cs?impPackC(r.cs):0,w:r.cols||0,sp:r.sp||0,an:r.anc||0};}
  return {m:{v:1,name:D.name,set:D.set,ch:D.ch,grid:D.grid==='cell'?(D.pg||'mod'):D.grid,gp:D.gp,cg:{s:D.cs,l:D.link,v:D.cshow?1:0,m:D.cmode,pl:D.pl.slice(0,CL_MAX).map(x=>x||null)},snap:D.snap,ghost:D.ghost,nbr:D.nbr,cv:D.cv,w:D.w,built:D.built?1:0,poly:D.poly?1:0,anc:D.anc?1:0,ak:{sp:D.ak.sp?1:0,k:D.ak.k?1:0,s:D.ak.s,kw:D.ak.kw.slice(0,300)}},g};}
function persistNow(){
  try{const a=packAll();a.m.g=a.g;localStorage.setItem(LSK,JSON.stringify(a.m));
  }catch(e){console.warn('draw persist',e&&e.message);}}
function persistSoon(){noStoreNote();clearTimeout(saveT);saveT=setTimeout(persistNow,700);if(window.HIST)HIST.poke('dr');}
function restore(o){
  if(o===undefined){o=null;try{o=JSON.parse(localStorage.getItem(LSK)||'null');}catch(e){}}
  if(!o||o.v!==1)return;
  try{
    if(typeof o.name==='string')D.name=cleanName(o.name)||'Мой шрифт';
    if(SETS[o.set])D.set=o.set;if(typeof o.ch==='string'&&setOf(o.ch))D.ch=o.ch;
    if(GRIDS[o.grid])D.grid=o.grid;
    if(o.gp)for(const k in GRIDS)if(o.gp[k]){D.gp[k].rows=clamp(+o.gp[k].rows||GRIDS[k].rows,2,24);D.gp[k].cols=clamp(+o.gp[k].cols||GRIDS[k].cols,2,24);}
    D.snap=o.snap!==false;D.ghost=o.ghost!==false;D.nbr=o.nbr!==false;if(['auto','light','dark'].includes(o.cv))D.cv=o.cv;
    if(o.cg&&typeof o.cg==='object'){D.cs=drcNorm(o.cg.s);if(['none','grid','all'].includes(o.cg.l))D.link=o.cg.l;D.cshow=o.cg.v!==0;D.cmode=o.cg.m==='erase'?'erase':'draw';D.pl=(Array.isArray(o.cg.pl)?o.cg.pl.slice(0,CL_MAX):[]).map(x=>x&&typeof x==='object'?drcNorm(x):undefined);}
    if(!D.pl[0])D.pl[0]=D.cs;
    D.w=clamp(+o.w||70,8,200);D.built=!!o.built;D.poly=!!o.poly;D.anc=o.anc!==0;
    {const a=o.ak&&typeof o.ak==='object'?o.ak:{};D.ak={sp:a.sp?1:0,k:a.k?1:0,s:clamp(Math.round(+a.s),0,150)||(a.s===0?0:100),kw:Array.isArray(a.kw)?a.kw.filter(x=>typeof x==='string'&&x.length<12).slice(0,300):[]};}
    for(const ch of Object.keys(o.g||{})){const r=o.g[ch];if(!r||Array.from(ch).length!==1)continue;
      const e={items:unpackItems(r.i),s:!!r.s,cs:null,cols:r.w?clamp(+r.w,2,24):0,sp:r.sp&&isFinite(r.sp.l)?{l:+r.sp.l,r:+r.sp.r}:null,anc:r.an&&typeof r.an==='object'?r.an:null};
      if(e.s){e.cs=impUnpackC(r.c);if(!e.cs.length)e.s=false;}
      if(e.items.length||e.s)D.g[ch]=e;}
  }catch(e){console.warn('draw restore',e&&e.message);}}
/* ---------------- текущий знак ---------------- */
const snapStr=()=>{cellFlush();return JSON.stringify(cur.items,(k,v)=>k[0]==='_'?undefined:v);};
/* FX80 C04: у каждого знака свой стек отмены, он живёт при переходах между знаками (как лента «История») */
const UST={};
function ustClear(){for(const k in UST)delete UST[k];}
function ustReset(){ustClear();cur.undo=[];cur.redo=[];}
function loadCur(ch){
  const prev=cur.ch,same=prev===ch;
  if(prev&&!same&&(cur.undo.length||cur.redo.length))UST[prev]={u:cur.undo,r:cur.redo};
  D.ch=ch;cur.ch=ch;const r=D.g[ch];
  cur.items=r?jc(r.items):[];
  cur.cols=(r&&r.cols)||D.gp[D.grid].cols;if(D.grid==='tile')cur.cols=D.gp.tile.rows;
  {const u=!same&&UST[ch];cur.undo=u?u.u:[];cur.redo=u?u.r:[];delete UST[ch];}cur.sel=-1;cur.grp=[];cur.dirty=false;cur.pen=null;P=null;cur.al=0;D.cdel=0;D.crn=-1;cellOnLoad();}
function commitCur(recompute){
  const ch=cur.ch;if(!ch)return;
  const r=D.g[ch];
  if(!cur.items.length&&!(r&&r.s)){delete D.g[ch];return;}
  if(!cur.dirty&&r)return;
  const e=r||(D.g[ch]={items:[],s:false,cs:null,cols:0,sp:null});
  e.items=JSON.parse(snapStr());e.cols=cur.cols;
  if(e.s&&recompute!==false){const cs=drnEval(e.items);if(cs.length){e.cs=cs;e.sp=null;}else{e.s=false;e.cs=null;}}
  cur.dirty=false;}
function markDirty(){cur.dirty=true;D.built=false;persistSoon();}
function pushUndo(lbl){if(window.HIST){HIST.mark('dr');if(HIST.hint)HIST.hint('dr',lbl||(D.tool==='cells'?'Ячейки':'Правка'));}cur.undo.push(snapStr());if(cur.undo.length>80)cur.undo.shift();cur.redo=[];}
function setItems(s){const keep=selAll(),n=cur.items.length;cur.items=JSON.parse(s);cur.sel=-1;cur.pen=null;if(keep.length&&n===cur.items.length)setSel(keep);}/* отмена правки без смены состава фигур оставляет выделение */
function undo(){if(!cur.undo.length)return;cur.redo.push(snapStr());setItems(cur.undo.pop());cellAdopt();autoGrid();markDirty();sync();if(window.HIST)HIST.sync('dr');}
function redo(){if(!cur.redo.length)return;cur.undo.push(snapStr());setItems(cur.redo.pop());cellAdopt();autoGrid();markDirty();sync();if(window.HIST)HIST.sync('dr');}
function addItem(it,lbl){pushUndo(lbl||(it.k==='sub'?'Ластик':it.t==='pen'?'Перо':'Фигура'));cur.items.push(it);cur.sel=cur.items.length-1;markDirty();sync();}
function clearAll(){if(!cur.items.length)return;pushUndo('Очистка');cur.items=[];cur.sel=-1;cur.pen=null;markDirty();sync();}
/* выделение: основной номер cur.sel и добавленные Shift (cur.grp); группа живёт, пока не менялся состав фигур */
function selAll(){
  if(cur.sel<0||cur.sel>=cur.items.length)return [];
  if(cur.grpFor!==cur.sel||cur.grpN!==cur.items.length)return [cur.sel];
  return [cur.sel,...cur.grp.filter(i=>i!==cur.sel&&i>=0&&i<cur.items.length)];}
function setSel(arr){
  arr=Array.from(new Set(arr)).filter(i=>i>=0&&i<cur.items.length);
  if(!arr.length){cur.sel=-1;cur.grp=[];return;}
  cur.sel=arr[arr.length-1];cur.grp=arr.slice(0,-1);cur.grpFor=cur.sel;cur.grpN=cur.items.length;}
function mirrorAll(vert){
  if(!cur.items.length)return;pushUndo('Отражение');const W=Wd();
  for(const it of cur.items){if(it.cl){cellMirror(it,vert);continue;}it.cs=vert?drnAff(it.cs,x=>x,y=>DRN.cap-y):drnAff(it.cs,x=>W-x,y=>y);
    if(it.pen)for(const n of it.pen.nodes){const f=p=>p&&(vert?{x:p.x,y:DRN.cap-p.y}:{x:W-p.x,y:p.y});const a=f(n.a),b=f(n.b);
      if(vert)n.y=DRN.cap-n.y;else n.x=W-n.x;n.a=a;n.b=b;}
    it._p=null;}
  if(curCell())cellAfterMirror();
  markDirty();sync();}
function copyFrom(ch){
  const r=D.g[ch];if(!r||ch===cur.ch)return;
  const src=r.s&&r.cs?[{k:'add',t:'copy',cs:drnCp(r.cs)}]:jc(r.items);
  pushUndo('Копия знака');for(const it of src)cur.items.push(it);cur.sel=-1;markDirty();sync();}
/* ---------------- привязка ---------------- */
function snapPt(x,y,alt){
  if(!D.snap||D.grid==='none'||alt)return [x,y];
  const c=cell(),i=Math.floor(x/c),j=Math.floor(y/c),x0=i*c,y0=j*c,cand=[[x0,y0],[x0+c,y0],[x0,y0+c],[x0+c,y0+c]];
  if(D.grid==='circ'||D.grid==='tile'||D.grid==='diag'){cand.push([x0+c/2,y0+c/2]);}
  if(D.grid==='circ'||D.grid==='tile'){cand.push([x0+c/2,y0],[x0+c/2,y0+c],[x0,y0+c/2],[x0+c,y0+c/2]);}
  if(D.grid==='circ'){const d=c/2*Math.SQRT1_2;for(const sx of [-1,1])for(const sy of [-1,1])cand.push([x0+c/2+sx*d,y0+c/2+sy*d]);}
  if(D.grid==='tile'){const W=Wd(),H=700,mx=W/2,my=H/2;for(const r of [W/2,W*0.3]){const d=r*Math.SQRT1_2;for(const sx of [-1,1])for(const sy of [-1,1])cand.push([mx+sx*d,my+sy*d]);}}
  let b=null,bd=1e18;for(const q of cand){const d=(q[0]-x)**2+(q[1]-y)**2;if(d<bd){bd=d;b=q;}}
  return bd<(c*0.62)**2?b:[x,y];}
/* ---------------- вид ---------------- */
const V={s:1,x0:0,yt:0,w:400,h:400,dpr:1};
/* холст — прямоугольник во всю карточку: знак по центру, масштаб по меньшей из сторон, лишняя ширина отдана соседям и сетке */
function accentMode(){const ch=cur.ch;if(!ch)return false;if(drnMarkInfo(ch)||drnCompSpec()[ch])return true;
  const r=isSaved(ch)?D.g[ch]:null,bb=r&&r.cs?impBBox(r.cs):null;return !!(bb&&bb.y1>DRN.asc+10);}
/* the cell grid is fitted into the height that is left above the toolbar (V.pb = toolbar + its inset), so the toolbar never covers the grid */
function layout(){const W=Wd(),top=accentMode()?1050:875;V.top=top;const pb=V.pb||0,pt=V.pt||0,av=Math.max(120,V.h-pb-pt);
  V.s=Math.min(av/(top+225),V.w/(W+300));V.x0=W/2-V.w/(2*V.s);V.yt=(top-225)/2+(pt+av/2)/V.s;}
const X=x=>(x-V.x0)*V.s,Y=y=>(V.yt-y)*V.s;
const wx=px=>px/V.s+V.x0,wy=py=>V.yt-py/V.s;
function evPt(e){const r=ui.cv.getBoundingClientRect();return [(e.clientX-r.left)*(V.w/r.width),(e.clientY-r.top)*(V.h/r.height)];}
function evW(e){const p=evPt(e);return [wx(p[0]),wy(p[1])];}
const drTok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();/* canvas palette lives in CSS tokens (--cvl-*, --cvd-*) */
function readCol(){const cs=getComputedStyle(ui.root),g=n=>cs.getPropertyValue(n).trim();
  D.col={paper:g('--dr-paper'),ink:g('--dr-ink'),grid:g('--dr-grid'),grid2:g('--dr-grid2'),metric:g('--dr-metric'),ghost:g('--dr-ghost'),box:g('--dr-box'),nbr:g('--dr-nbr'),acc:g('--dr-ink')||'#141416',lab:g('--dr-lab')||g('--dr-ink'),txt:g('--dr-txt')};}
function pathOf(it){if(it._ov)return it._ov;if(!it._p){const p=new Path2D();for(const c of it.cs){const n=c.nodes;if(n.length<2)continue;p.moveTo(n[0].x,n[0].y);
  for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if(a.b||b.a){const p1=a.b||a,p2=b.a||b;p.bezierCurveTo(p1.x,p1.y,p2.x,p2.y,b.x,b.y);}else p.lineTo(b.x,b.y);}p.closePath();}it._p=p;}
  return it._p;}
function pathCs(cs){return pathOf({cs});}
function gpath(r){if(!r._gp||r._gc!==r.cs){r._gp=pathCs(r.cs);r._gc=r.cs;}return r._gp;}
let lay=null;
function place(){const nw=ui.root.clientWidth>0&&ui.root.clientWidth<=560;
  if(nw===ui.narrow)return;ui.narrow=nw;const host=nw?ui.bar:ui.sq;
  for(const e of [ui.tr,ui.note,ui.dock])host.appendChild(e);}
function placeDock(){const d=ui.dock;if(!d||!ui.sq)return;if(ui.narrow){d.style.left='';d.style.transform='';d.style.width='';return;}
  /* the dock is a whole number of pixels wide and its first row has the same parity as the free width, so the centred row never lands on a half pixel */
  d.style.width='';d.style.transform='none';d.style.left='0px';const r1=d.querySelector('.dr-trow');let w=Math.ceil(d.getBoundingClientRect().width);
  if(r1){const c=Math.ceil(r1.scrollWidth),pad=parseFloat(getComputedStyle(d).paddingLeft)*2;if(Math.round(w-pad-c)%2)w++;}
  d.style.width=w+'px';const W=ui.sq.clientWidth;d.style.left=Math.max(8,Math.round((W-w)/2))+'px';}
function size(){place();const m=ui.mid,rw=ui.root.clientWidth,stack=!ui.narrow&&rw<=760;
  /* одна колонка: квадрат не выше видимой области, чтобы холст и панель инструментов были видны без прокрутки страницы */
  if(stack){const mr=m.getBoundingClientRect(),/* высота корня НЕ входит в расчёт: на планшете корень по высоте равен содержимому, и формула rc-top гоняла холст по кругу (каждый кадр -4 px, потом скачок: ResizeObserver-цикл); холст ограничивает только видимая область */avail=Math.max(280,innerHeight-(mr.top+scrollY)-12);m.style.height=Math.floor(Math.min(m.clientWidth,avail))+'px';}else m.style.height='';
  let w=Math.max(120,Math.floor(m.clientWidth)),h=Math.max(120,Math.floor(ui.narrow?m.clientWidth:(m.clientHeight||m.clientWidth)));
  if(ui.narrow){/* телефон: холст ниже ширины ровно настолько, чтобы нижний ряд дока не уходил под нижнюю панель (rail) без прокрутки */
    const rl=document.getElementById('rail'),dk=ui.dock;
    if(rl&&dk&&V.h>0&&getComputedStyle(rl).position==='fixed'){const ex=dk.getBoundingClientRect().bottom+scrollY-(rl.getBoundingClientRect().top-8);h=Math.max(220,Math.min(h,Math.floor(V.h-ex)));}}
  const dpr=Math.min(2.5,window.devicePixelRatio||1);
  if(w!==V.w||h!==V.h||dpr!==V.dpr||ui.cv.width!==Math.round(w*dpr)){V.w=w;V.h=h;V.dpr=dpr;ui.sq.style.width=w+'px';ui.sq.style.height=h+'px';ui.cv.width=Math.round(w*dpr);ui.cv.height=Math.round(h*dpr);lay=null;}placeDock();V.pb=ui.narrow?0:Math.round((ui.dock.offsetHeight||96)+2*12);V.pt=ui.narrow?0:8;}
function redraw(){if(rafId)return;rafId=requestAnimationFrame(()=>{rafId=0;draw();});}
function line(ctx,x0,y0,x1,y1){ctx.beginPath();ctx.moveTo(X(x0),Y(y0));ctx.lineTo(X(x1),Y(y1));ctx.stroke();}
function gridBounds(){const c=cellOr(),W=Wd();
  if(D.grid==='tile')return {x0:0,x1:W,y0:0,y1:700,c};
  return {x0:0,x1:W,y0:-Math.ceil(210/c)*c,y1:Math.ceil(760/c)*c,c};}
function drawDots(ctx,c){
  const W=Wd(),x0=V.x0,x1=V.x0+V.w/V.s,yb=wy(V.h),yt=wy(0),g=Math.max(10,c);
  ctx.save();ctx.fillStyle=D.col.metric;ctx.globalAlpha=.55;const r=Math.max(.9,Math.min(1.6,V.s*g*.04));
  for(let i=Math.floor(x0/g);i<=Math.ceil(x1/g);i++){const x=i*g;if(x>=-1&&x<=W+1)continue;
    for(let j=Math.floor(yb/g);j<=Math.ceil(yt/g);j++){ctx.beginPath();ctx.arc(X(x),Y(j*g),r,0,7);ctx.fill();}}
  ctx.restore();}
function drawGrid(ctx){
  if(D.grid==='none'){drawDots(ctx,60);return;}
  if(D.grid==='cell'){drawDots(ctx,cellOr());drawCellGrid(ctx);return;}
  const B=gridBounds(),c=B.c,col=D.col;drawDots(ctx,c);
  ctx.lineWidth=1;ctx.strokeStyle=col.grid;
  if(D.grid==='tile'){ctx.fillStyle=col.box;ctx.beginPath();const r=0.07*B.x1*V.s;ctx.roundRect(X(0),Y(700),B.x1*V.s,700*V.s,r);ctx.fill();ctx.stroke();}
  ctx.strokeStyle=col.grid;
  const n=Math.round((B.x1-B.x0)/c),m=Math.round((B.y1-B.y0)/c),ex=D.grid!=='tile',
    gl=ex?Math.floor(V.x0/c):0,gr=ex?Math.ceil((V.x0+V.w/V.s)/c):n,A=i=>{ctx.globalAlpha=i<0||i>=n?.4:1;};
  /* сетка продолжается за кеглем бледнее — холст виден как единая разметка */
  for(let i=0;i<=n;i++){ctx.globalAlpha=1;line(ctx,i*c,B.y0,i*c,B.y1);}
  for(let j=0;j<=m;j++){const y=B.y0+j*c;
    ctx.globalAlpha=1;line(ctx,B.x0,y,B.x1,y);
    }
  ctx.globalAlpha=1;ctx.strokeStyle=col.grid2;
  if(D.grid==='circ'){
    for(let i=0;i<n;i++){A(i);for(let j=0;j<m;j++){const cx=(i+.5)*c,cy=B.y0+(j+.5)*c;
      ctx.beginPath();ctx.arc(X(cx),Y(cy),c/2*V.s,0,7);ctx.stroke();
      line(ctx,cx-c/2,cy-c/2,cx+c/2,cy+c/2);line(ctx,cx-c/2,cy+c/2,cx+c/2,cy-c/2);}}ctx.globalAlpha=1;}
  else if(D.grid==='diag'){
    for(let i=0;i<n;i++){A(i);for(let j=0;j<m;j++){const x=i*c,y=B.y0+j*c;line(ctx,x,y,x+c,y+c);}}ctx.globalAlpha=1;}
  else if(D.grid==='tile'){
    const W=B.x1,mx=W/2,my=350;
    for(const r of [W/2,W*0.3]){ctx.beginPath();ctx.arc(X(mx),Y(my),r*V.s,0,7);ctx.stroke();}
    line(ctx,0,0,W,700);line(ctx,0,700,W,0);
    ctx.beginPath();ctx.arc(X(mx),Y(my),W*0.15*V.s,0,7);ctx.stroke();}}
function drawAccentLine(ctx){if(V.top<1000)return;const y=DRN.cap+250;
  ctx.save();ctx.font='500 12px Onest,system-ui,sans-serif';ctx.textBaseline='bottom';ctx.textAlign='left';ctx.strokeStyle=D.col.metric;ctx.lineWidth=1;ctx.setLineDash([2,5]);
  line(ctx,V.x0,y,V.x0+V.w/V.s,y);ctx.fillStyle=D.col.lab;ctx.fillText('линия акцентов',6,Y(y)-3);ctx.restore();}
function drawMetrics(ctx){drawAccentLine(ctx);
  const col=D.col,W=Wd(),ex=V.w/V.s,xa=V.x0,xb=V.x0+ex,L=[[0,'база',1],[DRN.xh,'строчные'],[DRN.cap,'прописные'],[DRN.asc,'выносные'],[DRN.desc,'нижние']];
  ctx.font='500 12px Onest,system-ui,sans-serif';ctx.textBaseline='bottom';ctx.textAlign='left';
  for(const [y,t,b] of L){ctx.globalAlpha=b?1:.7;ctx.strokeStyle=b?col.acc:col.metric;ctx.lineWidth=b?1.4:1;ctx.setLineDash(b?[]:[4,4]);line(ctx,xa,y,xb,y);
    ctx.fillStyle=col.lab;ctx.fillText(t,6,Y(y)-3);}
  ctx.globalAlpha=1;ctx.setLineDash([]);
  ctx.strokeStyle=col.metric;ctx.lineWidth=1;line(ctx,0,DRN.desc-30,0,DRN.asc+30);line(ctx,W,DRN.desc-30,W,DRN.asc+30);}
function drawGhostChar(ctx){
  const ch=cur.ch;if(!ch||!D.ghost)return;
  const f='Onest,system-ui,"Segoe UI",sans-serif';ctx.save();
  ctx.font='400 100px '+f;const h=ctx.measureText('H').actualBoundingBoxAscent||72,sz=100*DRN.cap/h*V.s;
  if(drnMarkInfo(ch)){/* знак: образец поменьше, в зоне над строчными */
    ctx.font='400 '+sz*1.6+'px '+f;ctx.fillStyle=D.col.ghost;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    /* T1 v82 (C11): образец знака целиком внутри холста — размер уменьшается, если верх (или низ седиля) вышел бы за край */
    const by=Y(drnMarkInfo(ch)[4]==='b'?330:250),lo=(V.pt||0)+4,hi=V.h-(V.pb||0)-4;let fs=sz*1.6;
    {const m=ctx.measureText(ch),a=m.actualBoundingBoxAscent||0,d=m.actualBoundingBoxDescent||0;let k=1;
      if(a>0&&by-a<lo)k=Math.min(k,(by-lo)/a);if(d>0&&by+d>hi)k=Math.min(k,(hi-by)/d);
      if(k<1){fs=Math.max(8,fs*Math.max(.2,k));ctx.font='400 '+fs+'px '+f;}}
    ctx.fillText(ch,X(Wd()/2),by);ctx.restore();return;}
  ctx.font='400 '+sz+'px '+f;ctx.fillStyle=D.col.ghost;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText(ch,X(Wd()/2),Y(0));ctx.restore();}
/* полиграмма: контуры уже нарисованных букв той же конструкции, разными оттенками */
function drawPoly(ctx){
  if(!D.poly||!cur.ch)return;
  for(const m of polyMembers(cur.ch)){const p=gpath(D.g[m.ch]);
    ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.globalAlpha=.6;ctx.lineWidth=1.8/V.s;ctx.strokeStyle=m.tint;ctx.stroke(p);ctx.restore();}}
/* составной знак без собственных штрихов показан бледной заливкой акцентом */
function drawComp(ctx){
  if(cur.items.length||isSaved(cur.ch))return;const c=comp(cur.ch);if(!c)return;
  ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.globalAlpha=.55;ctx.fillStyle=D.col.ink;ctx.fill(gpath(c),'nonzero');ctx.restore();}
function drawAnchors(ctx){
  const pts=ancPts();if(!pts)return;
  ctx.save();ctx.lineWidth=1;
  for(const a of pts){const x=X(a.x),y=Y(a.y),r=6.5;
    ctx.setLineDash([3,3]);ctx.strokeStyle=D.col.acc;ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(x-18,y);ctx.lineTo(x+18,y);ctx.moveTo(x,y-18);ctx.lineTo(x,y+18);ctx.stroke();
    ctx.setLineDash([]);ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
    ctx.fillStyle=D.col.acc;ctx.fill();ctx.strokeStyle=D.col.paper;ctx.lineWidth=2;ctx.stroke();}
  ctx.restore();}
function ancHit(px){const pts=ancPts();if(!pts)return null;
  for(const a of pts){if(Math.hypot(X(a.x)-px[0],Y(a.y)-px[1])<=12)return a;}return null;}
/* neighbouring letters beside the current one (style consistency): drawn glyphs in the neighbour tint, undrawn ones as a faint reference letter (only while «Образец буквы» is on);
   they fill the visible width outwards, fade with distance and are never interactive (canvas paint only) */
function drawNeighbors(ctx){
  if(!D.nbr)return;const L=chars(),i=L.indexOf(cur.ch);if(i<0)return;
  const W=Wd(),xa=V.x0,xb=V.x0+V.w/V.s,gap=40,f='Onest,system-ui,"Segoe UI",sans-serif';
  ctx.save();ctx.font='400 100px '+f;const h=ctx.measureText('H').actualBoundingBoxAscent||72,sz=100*DRN.cap/h*V.s;ctx.font='400 '+sz+'px '+f;
  const refW=ch=>ctx.measureText(ch).width/V.s;
  const one=(ch,side,edge,k)=>{/* returns the new edge, null = skip this letter, false = does not fit whole: stop (nothing is ever cut by the canvas edge) */
    ctx.save();ctx.globalAlpha=Math.max(.3,1-k*.22);
    if(hasG(ch)&&R(ch)&&impBBox(R(ch).cs)){const r=R(ch),bb=impBBox(r.cs),sp=spOf(ch),w=bb.x1-bb.x0,tot=sp.l+w+sp.r;
      if(side<0?edge-tot<xa+gap/2:edge+tot>xb-gap/2){ctx.restore();return false;}
      const ox=side<0?edge-tot-bb.x0+sp.l:edge+sp.l-bb.x0;
      ctx.translate(X(ox),Y(0));ctx.scale(V.s,-V.s);ctx.fillStyle=D.col.nbr;ctx.fill(gpath(r),'nonzero');ctx.restore();return side<0?edge-tot-gap:edge+tot+gap;}
    if(!D.ghost||drnMarkInfo(ch)){ctx.restore();return null;}
    const w=refW(ch);if(side<0?edge-w<xa+gap/2:edge+w>xb-gap/2){ctx.restore();return false;}ctx.fillStyle=D.col.ghost;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.globalAlpha*=.7;
    ctx.fillText(ch,X(side<0?edge-w:edge),Y(0));ctx.restore();return side<0?edge-w-gap:edge+w+gap;};
  for(const side of [-1,1]){let edge=side<0?-gap:W+gap;
    for(let n=1,k=0;n<=8&&i+side*n>=0&&i+side*n<L.length;n++){
      const e=one(L[i+side*n],side,edge,k);if(e===false)break;if(e===null)continue;edge=e;k++;}}
  ctx.restore();}
function drawItems(ctx){
  const nw=Math.round(V.w*V.dpr),nh=Math.round(V.h*V.dpr);if(!lay||lay.width!==nw||lay.height!==nh){lay=document.createElement('canvas');lay.width=nw;lay.height=nh;}
  const L=lay.getContext('2d');L.setTransform(1,0,0,1,0,0);L.clearRect(0,0,nw,nh);L.setTransform(V.dpr*V.s,0,0,-V.dpr*V.s,-V.dpr*V.x0*V.s,V.dpr*V.yt*V.s);
  L.fillStyle=D.col.ink;
  for(const it of cur.items){if(it.cl&&it.cl.h)continue;L.globalCompositeOperation=it.k==='sub'?'destination-out':'source-over';
    if(it._anim&&it===ANI.it&&aniPaint(L,it))continue;L.fill(pathOf(it),'nonzero');}
  L.globalCompositeOperation='source-over';
  ctx.drawImage(lay,0,0,V.w,V.h);}
function stroke1(ctx,path,color,lw,dash){ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.lineWidth=lw/V.s;ctx.strokeStyle=color;ctx.setLineDash(dash?dash.map(d=>d/V.s):[]);ctx.stroke(path);ctx.restore();}
function bbOf(it){return impBBox(it.cs);}
function drawOverlay(ctx){
  const acc=D.col.acc;
  /* вычитающие фигуры и выделение */
  const sa=selAll();
  cur.items.forEach((it,i)=>{
    if(it.k==='sub'&&(D.tool==='select'||D.tool==='erase'))stroke1(ctx,pathOf(it),acc,1.2,[4,3]);
    if(sa.includes(i))stroke1(ctx,pathOf(it),acc,2);});
  /* предпросмотр жеста */
  if(P&&P.t==='shape'&&P.cs)stroke1(ctx,pathCs(P.cs),P.sub?acc:D.col.ink,2,P.sub?[4,3]:null);
  if(P&&P.t==='shape'&&P.cs){ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.globalAlpha=.35;ctx.fillStyle=P.sub?acc:D.col.ink;ctx.fill(pathCs(P.cs),'nonzero');ctx.restore();}
  if(P&&P.t==='stroke'&&P.pts.length){
    ctx.save();ctx.globalAlpha=P.sub?.5:.85;ctx.fillStyle=P.sub?acc:D.col.ink;
    for(let i=0;i<P.pts.length;i++){ctx.beginPath();ctx.arc(X(P.pts[i][0]),Y(P.pts[i][1]),P.ws[i]/2*V.s,0,7);ctx.fill();
      if(i){const a=P.pts[i-1],b=P.pts[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l>0.5){const nx=-dy/l,ny=dx/l,r1=P.ws[i-1]/2,r2=P.ws[i]/2;
        ctx.beginPath();ctx.moveTo(X(a[0]+nx*r1),Y(a[1]+ny*r1));ctx.lineTo(X(b[0]+nx*r2),Y(b[1]+ny*r2));ctx.lineTo(X(b[0]-nx*r2),Y(b[1]-ny*r2));ctx.lineTo(X(a[0]-nx*r1),Y(a[1]-ny*r1));ctx.fill();}}}
    ctx.restore();}
  if(P&&P.t==='marq'){const x0=X(Math.min(P.a[0],P.b[0])),x1=X(Math.max(P.a[0],P.b[0])),y0=Y(Math.max(P.a[1],P.b[1])),y1=Y(Math.min(P.a[1],P.b[1]));
    ctx.save();ctx.fillStyle=acc;ctx.globalAlpha=.08;ctx.fillRect(x0,y0,x1-x0,y1-y0);ctx.globalAlpha=1;ctx.strokeStyle=acc;ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.strokeRect(x0+.5,y0+.5,x1-x0,y1-y0);ctx.restore();}
  if(D.tool==='cells')drawCellHover(ctx);
  /* перо */
  drawPen(ctx);
  /* маркер привязки */
  if(cur.hover&&D.shown&&!(P&&P.t==='move')){const h=cur.hover;ctx.strokeStyle=acc;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(h[0]),Y(h[1]),5,0,7);ctx.stroke();}
  /* ручки преобразования выделения (ui_xform_x1.js) */
  if(D.tool==='select'&&sa.length&&!(P&&P.t==='marq'))xfDraw().paint(ctx);else if(XFC)XFC.sync();}
function nodeCurve(ctx,a,b){const p1=a.b||a,p2=b.a||b;if(a.b||b.a)ctx.bezierCurveTo(X(p1.x),Y(p1.y),X(p2.x),Y(p2.y),X(b.x),Y(b.y));else ctx.lineTo(X(b.x),Y(b.y));}
function drawNodes(ctx,nodes,closed,hot){
  const acc=D.col.acc;ctx.save();ctx.strokeStyle=acc;ctx.lineWidth=1.5;
  if(nodes.length>1){ctx.beginPath();ctx.moveTo(X(nodes[0].x),Y(nodes[0].y));for(let i=0;i<nodes.length-1;i++)nodeCurve(ctx,nodes[i],nodes[i+1]);if(closed)nodeCurve(ctx,nodes[nodes.length-1],nodes[0]);ctx.stroke();}
  for(const n of nodes){for(const h of [n.a,n.b])if(h&&hot){ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X(n.x),Y(n.y));ctx.lineTo(X(h.x),Y(h.y));ctx.stroke();
      ctx.fillStyle=D.col.paper;ctx.beginPath();ctx.arc(X(h.x),Y(h.y),4,0,7);ctx.fill();ctx.stroke();}
    ctx.fillStyle=acc;ctx.fillRect(X(n.x)-4.5,Y(n.y)-4.5,9,9);}
  ctx.restore();}
function drawPen(ctx){
  if(cur.pen){const N=cur.pen.nodes.slice();
    if(cur.hover&&!cur.pen.drag&&N.length)N.push({x:cur.hover[0],y:cur.hover[1],a:null,b:null});
    drawNodes(ctx,N,false,true);
    if(cur.pen.nodes.length>=3){ctx.strokeStyle=D.col.acc;ctx.setLineDash([2,4]);ctx.lineWidth=1;line(ctx,N[N.length-1].x,N[N.length-1].y,N[0].x,N[0].y);ctx.setLineDash([]);}
    return;}
  if(D.tool==='pen'||D.tool==='select'){cur.items.forEach((it,i)=>{if(!it.pen||(D.tool==='select'&&i!==cur.sel))return;drawNodes(ctx,it.pen.nodes,it.pen.closed,i===cur.sel);});}}
function draw(){
  if(!ui.cv||!D.mounted)return;size();layout();if(!D.col)readCol();
  const ctx=ui.cv.getContext('2d');ctx.setTransform(V.dpr,0,0,V.dpr,0,0);
  ctx.fillStyle=D.col.paper;ctx.fillRect(0,0,V.w,V.h);
  if(D.grid!=='tile'){ctx.fillStyle=D.col.box;ctx.fillRect(X(0),Y(DRN.asc+30),Wd()*V.s,(DRN.asc+30-DRN.desc+30)*V.s);}
  const un=window.GT_UNDER,up=un?{ch:cur.ch,W:Wd(),cw:V.w,s:V.s,paper:D.col.paper,X,Y}:null;/* W96-U: подложка (только холст) */
  drawGhostChar(ctx);if(un)un.dr(ctx,0,up);drawNeighbors(ctx);drawGrid(ctx);drawMetrics(ctx);drawComp(ctx);drawPoly(ctx);drawItems(ctx);if(un)un.dr(ctx,1,up);drawOverlay(ctx);drawAnchors(ctx);}
/* ---------------- построение фигур ---------------- */
function cellOf(p){const c=cellOr();return [Math.floor(p[0]/c),Math.floor(p[1]/c),c];}
function shapeFrom(kind,a,b,raw,mod,click){
  const c=cellOr();let [ax,ay]=a,[bx,by]=b;
  if(kind==='rect'){
    if(click){const [i,j]=cellOf(raw);return {t:'rect',cs:[drnRect(i*c,j*c,(i+1)*c,(j+1)*c)]};}
    if(mod.shift){const s=Math.min(Math.abs(bx-ax),Math.abs(by-ay));bx=ax+Math.sign(bx-ax||1)*s;by=ay+Math.sign(by-ay||1)*s;}
    if(Math.abs(bx-ax)<1||Math.abs(by-ay)<1)return null;
    return {t:'rect',cs:[drnRect(Math.min(ax,bx),Math.min(ay,by),Math.max(ax,bx),Math.max(ay,by))]};}
  if(kind==='ell'){
    if(click){const [i,j]=cellOf(raw);return {t:'ell',cs:[drnEllipse((i+.5)*c,(j+.5)*c,c/2,c/2)]};}
    if(mod.shift){const s=Math.min(Math.abs(bx-ax),Math.abs(by-ay));bx=ax+Math.sign(bx-ax||1)*s;by=ay+Math.sign(by-ay||1)*s;}
    if(Math.abs(bx-ax)<1||Math.abs(by-ay)<1)return null;
    const x0=Math.min(ax,bx),x1=Math.max(ax,bx),y0=Math.min(ay,by),y1=Math.max(ay,by);
    return {t:'ell',cs:[drnEllipse((x0+x1)/2,(y0+y1)/2,(x1-x0)/2,(y1-y0)/2)]};}
  if(kind==='tri'){
    if(click){const [i,j]=cellOf(raw),x0=i*c,y0=j*c,u=(raw[0]-x0)/c,v=(raw[1]-y0)/c;
      const cx=u<.5?x0:x0+c,cy=v<.5?y0:y0+c,ox=u<.5?x0+c:x0,oy=v<.5?y0+c:y0;
      return {t:'tri',cs:[drnPoly([[cx,cy],[ox,cy],[cx,oy]])]};}
    if(Math.abs(bx-ax)<1||Math.abs(by-ay)<1)return null;
    const fl=D.flip!==!!mod.shift;
    return {t:'tri',cs:[drnPoly([[ax,ay],[bx,by],fl?[bx,ay]:[ax,by]])]};}
  if(kind==='quad'){
    if(click){const [i,j]=cellOf(raw),x0=i*c,y0=j*c,u=(raw[0]-x0)/c,v=(raw[1]-y0)/c;
      const cx=u<.5?x0:x0+c,cy=v<.5?y0:y0+c,q=u<.5?(v<.5?0:3):(v<.5?1:2);
      return {t:'quad',cs:[drnSector(cx,cy,c,q*Math.PI/2,(q+1)*Math.PI/2)]};}
    const dx=bx-ax,dy=by-ay,r=Math.max(Math.abs(dx),Math.abs(dy));if(r<1)return null;
    const q=dx>=0?(dy>=0?0:3):(dy>=0?1:2);
    return {t:'quad',cs:[drnSector(ax,ay,r,q*Math.PI/2,(q+1)*Math.PI/2)]};}
  return null;}
function strokeItems(pts,ws,sub){
  let cs;
  if(D.grid==='pix'){const c=cell(),seen=new Set(),L=[];
    const add=(x,y)=>{const i=Math.floor(x/c),j=Math.floor(y/c),k=i+','+j;if(!seen.has(k)){seen.add(k);L.push(drnRect(i*c,j*c,(i+1)*c,(j+1)*c));}};
    for(let i=0;i<pts.length;i++){if(i){const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(c/3)));for(let k=1;k<=n;k++)add(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n);}else add(pts[0][0],pts[0][1]);}
    try{cs=csgUnion(L);}catch(e){cs=L;}}
  else cs=drnStroke(pts,ws);
  return cs&&cs.length?{k:sub?'sub':'add',t:'stroke',cs}:null;}
/* ---------------- перо ---------------- */
function penHit(w){const r=10/V.s;
  for(let i=cur.items.length-1;i>=0;i--){const it=cur.items[i];if(!it.pen)continue;
    for(let n=0;n<it.pen.nodes.length;n++){const q=it.pen.nodes[n];
      if(i===cur.sel)for(const part of ['a','b']){const h=q[part];if(h&&Math.hypot(h.x-w[0],h.y-w[1])<r)return {i,n,part};}
      if(Math.hypot(q.x-w[0],q.y-w[1])<r)return {i,n,part:'n'};}}
  return null;}
function penRegen(it){it.cs=drnPenCs(it.pen.nodes);it._p=null;}
function smoothNode(nodes,i,closed){
  const n=nodes.length,p=nodes[i],a=nodes[(i-1+n)%n],b=nodes[(i+1)%n];
  const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,la=Math.hypot(p.x-a.x,p.y-a.y)/3,lb=Math.hypot(b.x-p.x,b.y-p.y)/3;
  p.a={x:p.x-dx/l*la,y:p.y-dy/l*la};p.b={x:p.x+dx/l*lb,y:p.y+dy/l*lb};}
function penFinish(closed){
  const pen=cur.pen;cur.pen=null;if(!pen||pen.nodes.length<3){redraw();return;}
  const nodes=pen.nodes.map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}));
  addItem({k:'add',t:'pen',cs:drnPenCs(nodes),pen:{closed:!!closed,nodes}});}
/* ---------------- преобразование выделения: переходник к XF ---------------- */
let XFC=null;
/* предмет после матрицы m: контур пера пересобирается из его узлов, остальное — прямой перенос контуров */
function xfItem(o,m){
  const it=Object.assign({},o);
  if(o.pen&&o.pen.nodes&&o.pen.nodes.length>=3){const nodes=XF.affNodes(o.pen.nodes,m).map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}));
    it.pen={closed:o.pen.closed,nodes};it.cs=drnPenCs(nodes);}
  else it.cs=XF.affCs(o.cs,m);
  delete it._p;return it;}
function xfOk(items){
  for(const it of items)for(const c of it.cs)for(const n of c.nodes)for(const q of [n,n.a,n.b]){if(q&&!(isFinite(q.x)&&isFinite(q.y)&&Math.abs(q.x)<1e5&&Math.abs(q.y)<1e5))return false;}
  try{const e=drnEval(items);return e.length>0||!items.some(it=>it.k!=='sub'&&it.cs.length);}catch(err){return false;}}
function xfDraw(){
  if(XFC)return XFC;
  XFC=XF.make({id:'dr',host:ui.sq,mirrorEl:ui.mir,mirrorHome:ui.from,
    enabled:()=>D.tool==='select'&&D.shown&&selAll().length>0,
    bbox:()=>{if(D.tool!=='select')return null;let b=null;for(const i of selAll())b=XF.union(b,impBBox(cur.items[i].cs));return b;},
    key:()=>cur.ch+'|'+selAll().join(','),
    toS:(x,y)=>[X(x),Y(y)],fromS:(px,py)=>[wx(px),wy(py)],size:()=>[V.w,V.h],
    snap:(ax,v)=>{if(!D.snap||D.grid==='none')return v;const c=cell(),st=(D.grid==='circ'||D.grid==='tile')?c/2:c,q=Math.round(v/st)*st;return Math.abs(q-v)<=Math.max(st*.3,5/V.s)?q:v;},
    begin:()=>{const ix=selAll();if(!ix.length)return false;pushUndo('Трансформация');return {ix,orig:ix.map(i=>jc(cur.items[i])),n:cur.undo.length};},
    apply:(m,t)=>{t.ix.forEach((i,k)=>{cur.items[i]=xfItem(t.orig[k],m);});redraw();return true;},
    end:(t,moved)=>{
      if(!moved){cur.undo.pop();return true;}
      if(!xfOk(t.ix.map(i=>cur.items[i]))){t.ix.forEach((i,k)=>{cur.items[i]=t.orig[k];});cur.undo.pop();toast('Так фигура сломается, поэтому правку отменили. Попробуйте изменить меньше');redraw();return false;}
      markDirty();sync(false);return true;},
    cancel:t=>{t.ix.forEach((i,k)=>{cur.items[i]=t.orig[k];});cur.undo.pop();redraw();},
    redraw,
    onBar:show=>{ui.mir.title=show?'Отразить ↔ (Shift — ↕)':'';ui.mir.dataset.tip=show?'Отразить ↔ (Shift — ↕)':'Отразить весь знак (Shift — по вертикали)';}});
  return XFC;}
function selectAll(){setSel(cur.items.map((_,i)=>i).filter(i=>!cur.items[i].cl));sync(false);}
/* ---------------- указатель ---------------- */
function onDown(e){
  if(e.button>0||!D.shown)return;e.preventDefault();ui.cv.setPointerCapture&&ui.cv.setPointerCapture(e.pointerId);
  const raw=evW(e),alt=e.altKey,s=snapPt(raw[0],raw[1],alt),tool=D.tool,px=evPt(e);
  P=null;
  if(!cur.pen){const ah=ancHit(px);if(ah){P={t:'anc',k:ah.k,ch:ancTarget().ch};redraw();return;}}
  if(tool==='shape'||(tool==='erase'&&D.er!=='stroke')){
    P={t:'shape',kind:tool==='shape'?D.shape:D.er,a:s,b:s,raw,sub:tool==='erase',click:true,px0:px,cs:null,mod:{shift:e.shiftKey}};}
  else if(tool==='marker'||tool==='brush'||tool==='erase'){
    const w0=tool==='brush'?brushW(e,null):D.w;
    P={t:'stroke',pts:[s],ws:[w0],sub:tool==='erase',brush:tool==='brush',last:[raw[0],raw[1],performance.now(),e.clientX,e.clientY]};}
  else if(tool==='cells'){if(!cellDown(e,raw))P=null;}
  else if(tool==='select'){
    if(xfDraw().down(e,px[0],px[1])){redraw();return;}
    let hit=-1;for(let i=cur.items.length-1;i>=0;i--){if(!cur.items[i].cl&&drnHit(cur.items[i].cs,raw[0],raw[1])){hit=i;break;}}
    const all=selAll();
    if(e.shiftKey){/* Shift: добавить фигуру в выделение или убрать из него */
      if(hit>=0)setSel(all.includes(hit)?all.filter(i=>i!==hit):[...all,hit]);
      else P={t:'marq',a:raw,b:raw,base:all,px0:px};}
    else if(hit>=0){
      if(!(all.length>1&&all.includes(hit)))setSel([hit]);
      const ix=selAll();pushUndo('Перемещение');P={t:'move',idx:ix,a:s,origs:ix.map(i=>jc(cur.items[i])),moved:false};}
    else{setSel([]);P={t:'marq',a:raw,b:raw,base:[],px0:px};}
    sync();}
  else if(tool==='pen'){
    if(!cur.pen){const h=penHit(raw);
      if(h){cur.sel=h.i;const it=cur.items[h.i];
        if(e.altKey&&h.part==='n'){pushUndo('Правка пера');const q=it.pen.nodes[h.n];if(q.a||q.b){q.a=q.b=null;}else smoothNode(it.pen.nodes,h.n);penRegen(it);markDirty();sync();return;}
        pushUndo('Правка пера');P={t:'penedit',h,moved:false};sync();return;}}
    if(!cur.pen)cur.pen={nodes:[],drag:null};
    const pen=cur.pen,first=pen.nodes[0];
    if(first&&pen.nodes.length>=3&&Math.hypot((first.x-raw[0])*V.s,(first.y-raw[1])*V.s)<11){penFinish(true);P=null;sync();return;}
    pen.nodes.push({x:s[0],y:s[1],a:null,b:null});pen.drag={start:px,node:pen.nodes.length-1};P={t:'pen'};}
  redraw();}
function brushW(e,prev){
  const base=D.w,pr=e.pointerType==='mouse'?null:(e.pressure||.5);
  let f;if(pr!=null&&pr>0)f=.3+1.1*pr;
  else{const now=performance.now();let sp=0;if(prev){const dt=Math.max(1,now-prev[2]);sp=Math.hypot(e.clientX-prev[3],e.clientY-prev[4])/dt;}
    f=clamp(1.15-sp*0.42,.3,1.15);}
  return base*f;}
function onMove(e){
  const raw=evW(e),s=snapPt(raw[0],raw[1],e.altKey);cur.hover=D.tool==='select'||D.tool==='cells'?null:s;cur.hc=D.tool==='cells'?raw:null;
  if(XFC&&XFC.active){const px=evPt(e);ui.cv.style.cursor=XFC.move(e,px[0],px[1])||'';return;}
  if(!P){if(D.tool==='select'){const px=evPt(e),cu=xfDraw().move(e,px[0],px[1])||'';if(ui.cv.style.cursor!==cu)ui.cv.style.cursor=cu;}
    if(cur.pen||D.tool!=='select')redraw();return;}
  if(P.t==='anc'){const r=D.g[P.ch],ai=ancInfo(P.ch);if(r&&ai){const au=P.k==='t'?ai.autoT:ai.autoB,dx=Math.round(raw[0]-au.x),dy=Math.round(raw[1]-au.y);
      r.anc=Object.assign({},r.anc||{});r.anc[P.k]=[dx,dy];D.built=false;}}
  else if(P.t==='shape'){P.b=s;const px=evPt(e);if(Math.hypot(px[0]-P.px0[0],px[1]-P.px0[1])>5)P.click=false;
    P.cs=P.click?null:(shapeFrom(P.kind,P.a,P.b,raw,{shift:e.shiftKey},false)||{}).cs||null;}
  else if(P.t==='stroke'){
    const l=P.last,now=performance.now();const w=P.brush?brushW(e,l):D.w;
    const lp=P.pts[P.pts.length-1];
    if(Math.hypot((raw[0]-lp[0])*V.s,(raw[1]-lp[1])*V.s)>2.5){P.pts.push([raw[0],raw[1]]);P.ws.push(P.brush?(P.ws[P.ws.length-1]*.6+w*.4):w);P.last=[raw[0],raw[1],now,e.clientX,e.clientY];}}
  else if(P.t==='move'){const dx=s[0]-P.a[0],dy=s[1]-P.a[1];if(dx||dy)P.moved=true;
    P.idx.forEach((ix,k)=>{const it=cur.items[ix],o=P.origs[k];it.cs=drnMove(o.cs,dx,dy);it._p=null;
      if(o.pen)it.pen={closed:o.pen.closed,nodes:o.pen.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:n.a&&{x:n.a.x+dx,y:n.a.y+dy},b:n.b&&{x:n.b.x+dx,y:n.b.y+dy}}))};});}
  else if(P.t==='cells'){cellMove(raw);}
  else if(P.t==='marq'){P.b=raw;}
  else if(P.t==='penedit'){const it=cur.items[P.h.i],n=it.pen.nodes[P.h.n];P.moved=true;
    if(P.h.part==='n'){const dx=s[0]-n.x,dy=s[1]-n.y;n.x=s[0];n.y=s[1];if(n.a){n.a.x+=dx;n.a.y+=dy;}if(n.b){n.b.x+=dx;n.b.y+=dy;}}
    else{const o=P.h.part,oth=o==='a'?'b':'a';n[o]={x:s[0],y:s[1]};
      if(n[oth]&&!e.altKey){const L=Math.hypot(n[oth].x-n.x,n[oth].y-n.y),dx=n.x-s[0],dy=n.y-s[1],l=Math.hypot(dx,dy)||1;n[oth]={x:n.x+dx/l*L,y:n.y+dy/l*L};}
      else if(!n[oth]&&!e.altKey){n[oth]={x:2*n.x-s[0],y:2*n.y-s[1]};}}
    penRegen(it);}
  else if(P.t==='pen'&&cur.pen&&cur.pen.drag){const d=cur.pen.drag,px=evPt(e);
    if(Math.hypot(px[0]-d.start[0],px[1]-d.start[1])>4){const n=cur.pen.nodes[d.node];n.b={x:s[0],y:s[1]};n.a={x:2*n.x-s[0],y:2*n.y-s[1]};}}
  redraw();}
function onUp(e){
  if(XFC&&XFC.active){try{ui.cv.releasePointerCapture&&ui.cv.releasePointerCapture(e.pointerId);}catch(x){}XFC.up(e);redraw();return;}
  if(!P){return;}
  const p=P;P=null;
  if(p.t==='anc'){persistSoon();sync(false);return;}
  try{ui.cv.releasePointerCapture&&ui.cv.releasePointerCapture(e.pointerId);}catch(x){}
  if(p.t==='cells'){cellUp(p);redraw();return;}
  if(p.t==='shape'){const r=shapeFrom(p.kind,p.a,p.b,p.raw,{shift:e.shiftKey},p.click);if(r&&r.cs)addItem({k:p.sub?'sub':'add',t:r.t,cs:r.cs});}
  else if(p.t==='stroke'){const it=strokeItems(p.pts,p.ws,p.sub);if(it)addItem(it,p.sub?'Ластик':p.brush?'Кисть':'Маркер');}
  else if(p.t==='move'){if(!p.moved){cur.undo.pop();}else markDirty();sync();}
  else if(p.t==='marq'){
    const x0=Math.min(p.a[0],p.b[0]),x1=Math.max(p.a[0],p.b[0]),y0=Math.min(p.a[1],p.b[1]),y1=Math.max(p.a[1],p.b[1]);
    if(Math.hypot(...[p.b[0]-p.a[0],p.b[1]-p.a[1]])*V.s>4){const inR=[];
      cur.items.forEach((it,i)=>{const b=it.cl?null:bbOf(it);if(b&&b.x1>=x0&&b.x0<=x1&&b.y1>=y0&&b.y0<=y1)inR.push(i);});
      setSel([...p.base,...inR]);}
    else if(!p.base.length)setSel([]);
    sync();}
  else if(p.t==='penedit'){if(!p.moved)cur.undo.pop();else markDirty();sync();}
  else if(p.t==='pen'&&cur.pen)cur.pen.drag=null;
  redraw();}
function onDbl(e){
  const ah=ancHit(evPt(e));if(ah){const t=ancTarget(),r=D.g[t.ch];if(r&&r.anc){const o=Object.assign({},r.anc);delete o[ah.k];r.anc=o.t||o.b?o:null;D.built=false;persistSoon();sync(false);}return;}
  if(cur.pen&&cur.pen.nodes.length>=3){cur.pen.nodes.pop();penFinish(false);sync();}}
/* ---------------- выбор знака, сохранение, переход ---------------- */
function gotoChar(ch,keepSet){
  if(ch===cur.ch)return;commitCur(true);
  const s=setOf(ch);if(s&&!keepSet)D.set=s;
  loadCur(ch);sync(true);persistSoon();}
function nextUndrawn(from){
  const L=chars(),i=L.indexOf(from);
  for(let k=1;k<=L.length;k++){const c=L[(i+k)%L.length];if(!hasG(c))return c;}
  return null;}
function saveGlyph(){
  if(cur.pen&&cur.pen.nodes.length>=3)penFinish(false);
  const cs=drnEval(cur.items);
  if(!cs.length){toast('Сначала нарисуйте знак');return false;}
  let tinyNote='';{const bb0=impBBox(cs);if(bb0&&!drnMarkInfo(cur.ch)){const z=impCat(cur.ch).z;
    if(z!=='pun'&&z!=='sym'&&z!=='idot'&&z!=='jdot'&&z!=='mark'&&Math.max(bb0.x1-bb0.x0,bb0.y1-bb0.y0)<DRN.cap*0.2)
      tinyNote=' «'+cur.ch+'» очень мелкий: при сборке его растянут до размера буквы. Нарисуйте крупнее, если это не точка.';}}
  cur.dirty=true;commitCur(false);if(window.HIST&&HIST.hint)HIST.hint('dr','Сохранение');
  const e=D.g[cur.ch];e.s=true;e.cs=cs;e.cols=cur.cols;e.sp=null;cur.dirty=false;D.built=false;
  analyze();persistNow();
  const nx=nextUndrawn(cur.ch);
  if(nx&&nx!==cur.ch){loadCur(nx);toast(stSay('Знак сохранён','Знак принят')+' — дальше «'+nx+'»'+(tinyNote?'.'+tinyNote:''));}
  else toast((nx?stSay('Знак сохранён','Знак принят'):'Все знаки набора нарисованы. Алфавит в сборе')+(tinyNote?'.'+tinyNote:''));
  sync(true);return true;}
/* ---------------- автоанализ ---------------- */
function spOf(ch){
  if(D.ak.sp&&isSaved(ch)&&!drnMarkInfo(ch)){const o=optSp();if(o&&o.sp[ch])return {l:o.sp[ch].l,r:o.sp[ch].r};}
  if(!isSaved(ch)){const c=comp(ch);if(c){const b=spOf(c.base),bb=impBBox(D.g[c.base].cs),cb=impBBox(c.cs);
    return {l:Math.round(b.l+Math.max(0,bb.x0-cb.x0)),r:Math.round(b.r+Math.max(0,cb.x1-bb.x1))};}}
  const r=D.g[ch];if(r&&r.sp)return r.sp;if(!r||!r.cs)return {l:50,r:50};if(!r._a||r._ac!==r.cs){r._a=drnAutoSp(r.cs,stemMed())||{l:50,r:50};r._ac=r.cs;}return r._a;}
let stemCache=null;
/* FX80 C06: эталон толщины не зависит от числа нарисованных знаков: сначала стойка «н/n/Н/H» (как в оптических интервалах), иначе медиана правдоподобных штрихов (не толще 0,3 высоты прописной — сплошной овал не считается штрихом) */
function stemMed(){
  for(const ch of ['н','n','Н','H']){const r=D.g[ch];if(r&&r.s&&r.cs){const s=drnStemOf(r.cs);if(s&&s<=DRN.cap*0.3)return s;}}
  const v=[];for(const ch of savedList()){if(!DRN.STEMOK.includes(ch))continue;const s=drnStemOf(D.g[ch].cs);if(s&&s<=DRN.cap*0.3)v.push(s);}
  return v.length?impMed(v):80;}
/* ---------------- Stage 5B: авто-интервалы и автокернинг ----------------
   D.ak = {sp, k, s, kw}: sp — интервалы считаются по оптической площади (spOf), k — значения кернинга пишутся в шрифт при сборке (st.kc),
   s — сила кернинга, % (0–150), kw — ключи классов, записанных в st.kc прошлой сборкой (при выключении они снимаются). Всё хранится в проекте рисунка и в истории ('dr'). */
const AKC={sp:{k:'',v:null},kn:{k:'',v:null}};
function akKeySp(){return savedList().filter(ch=>!drnMarkInfo(ch)).map(ch=>ch+csId(D.g[ch].cs)).join('|');}
function optSp(){
  const k=akKeySp();if(AKC.sp.k===k&&AKC.sp.v)return AKC.sp.v;
  const G={};for(const ch of savedList()){if(drnMarkInfo(ch))continue;G[ch]=D.g[ch].cs;}
  let v;try{v=drnOptSp(G,stemMed());}catch(e){v={sp:{},ref:{stem:0,sbS:0,lam:0,calib:false}};}
  AKC.sp={k,v};return v;}
/* кернинг по текущим знакам (включая составные) и полям; force — посчитать, даже если переключатель выключен; sOv — сила из ползунка */
function akKern(force,sOv){
  if(!D.ak.k&&!force)return null;
  const s=sOv!=null?sOv:D.ak.s,L=allList().filter(ch=>!drnMarkInfo(ch));
  const G={},parts=[];
  for(const ch of L){const r=R(ch);if(!r||!r.cs||!r.cs.length)continue;const sp=spOf(ch);if(!sp)continue;G[ch]={cs:r.cs,l:sp.l,r:sp.r};parts.push(ch+csId(r.cs)+':'+sp.l+'/'+sp.r);}
  const k=parts.join('|')+'#'+s;if(AKC.kn.k===k&&AKC.kn.v)return AKC.kn.v;
  let v;try{v=drnKernAuto(G,s,stemMed());}catch(e){v={vals:{},n:0,tU:0,tL:0,pair:()=>0};}
  AKC.kn={k,v};return v;}
const akPair=(a,b)=>{const k=D.ak.k?akKern(false):null;return k?k.pair(a,b):0;};
/* действие с одной записью истории и подписью: прежние правки фиксируются, затем состояние меняется и становится записью */
function akRun(label,fn){
  if(!D.mounted)return;
  cellFlushAll();commitCur(true);
  const run=()=>{fn();D.built=false;persistNow();analyze();sync(false);};
  if(window.HIST&&HIST.labeled)HIST.labeled('dr',label,run);else run();}
function akSetSp(on,label){akRun(label||(on?'Авто-интервалы':'Интервалы: исходные'),()=>{D.ak.sp=on?1:0;});}
function akSetKern(on,label){akRun(label||(on?'Авто-кернинг':'Кернинг: выключен'),()=>{D.ak.k=on?1:0;});}
function akSetStr(v){v=clamp(Math.round(+v)||0,0,150);akRun('Сила кернинга '+v+' %',()=>{D.ak.s=v;});}
/* запись значений классов в стиль шрифта: ровно то, что посчитано (или снятие прежних).
   В экспорт идут и старая таблица пар st.kern (автокернинг редактора, приоритетнее классов), и классы st.kc: старая таблица каждый раз считается заново
   (после выключения всё как было), а при включённом автокернинге из неё убираются пары, которые покрывают классы с посчитанными значениями. */
function akApplyKern(){
  const kn=D.ak.k?akKern(false):null,keys=kn?Object.keys(kn.vals):[];
  for(const key of ['regular','italic']){const st=S.styles&&S.styles[key];if(!st)continue;
    try{if(typeof autoKern==='function')autoKern(key);}catch(e){}/* старая таблица пар — заново */
    if(!st.kc)st.kc={};for(const k of D.ak.kw)delete st.kc[k];
    if(kn){for(const k of keys)st.kc[k]=kn.vals[k];
      if(st.kern)for(const k of keys){const q=k.split('|');for(const a of Array.from(KC_L[q[0]]||''))for(const b of Array.from(KC_R[q[1]]||''))delete st.kern[a+b];}}
    if(!Object.keys(st.kc).length)delete st.kc;}
  S.kd=true;D.ak.kw=keys;}
function flatten(ch,cs){delete UST[ch];const r=D.g[ch];r.cs=cs;r.items=[{k:'add',t:'merged',cs:drnCp(cs)}];r.sp=null;if(ch===cur.ch){cur.items=jc(r.items);cur.sel=-1;cur.undo=[];cur.redo=[];}}
function analyze(){
  cellFlushAll();
  const R=[],L=savedList(),setN=SETS[D.set].n;
  if(L.length<3)R.push({id:'few',txt:'Сохранено знаков: '+L.length+'. Шрифт можно собрать и сейчас, но в нём будут только они: остальных букв, цифр и знаков не будет. Лучше нарисовать хотя бы 3 знака.'});
  const miss=chars().filter(c=>!hasG(c));
  if(L.length&&miss.length)R.push({id:'miss',txt:'Не нарисовано '+miss.length+' из '+chars().length+' знаков набора «'+setN+'»: '+miss.slice(0,8).join(' ')+(miss.length>8?' …':''),fix:null,go:miss[0]});
  if(L.length<2){D.recs=R;return R;}
  /* толщина штриха */
  const st={};for(const ch of L){if(!DRN.STEMOK.includes(ch))continue;const s=drnStemOf(D.g[ch].cs);if(s)st[ch]=s;}
  const sv=Object.values(st),med=sv.length?impMed(sv):0;
  if(sv.length>=3){const bad=Object.keys(st).filter(ch=>Math.abs(st[ch]-med)/med>0.2);
    if(bad.length)R.push({id:'stem',txt:'Толщина штриха разная: '+bad.slice(0,4).map(c=>'«'+c+'» '+Math.round(st[c])).join(', ')+(bad.length>4?' …':'')+' при норме '+Math.round(med)+'.',
      fix:()=>{let n=0;for(const ch of bad){const d=(med-st[ch])/2;try{const cs=D.g[ch].cs,t0=impTopo(csgUnion(drnCp(cs)));let o=impGrow(drnCp(cs),d,d*0.85);o=csgUnion(o);if(impTopo(o)===t0){flatten(ch,o);n++;}}catch(e){}}
        toast('Толщина выровнена у '+n+' знаков — штрихи как по линейке');}});}
  /* высоты и посадка на базовую линию */
  const hb=[],fixH=[];
  for(const ch of L){const z=drnZone(ch);if(!z)continue;const cs=D.g[ch].cs,bb=impBBox(cs);if(!bb)continue;
    const rT=drnRoundEdge(cs,bb,true),rB=drnRoundEdge(cs,bb,false),o=DRN.ov;let msg=null,t1=bb.y1,t0=bb.y0;
    if(z.top!=null&&(bb.y1<z.top-5||bb.y1>z.top+(rT?o+8:5))){t1=z.top+(rT?o*0.6:0);msg='«'+ch+'»: верх '+(bb.y1<z.top?'ниже':'выше')+' линии на '+Math.round(Math.abs(bb.y1-z.top));}
    if(z.bot!=null&&(bb.y0<z.bot-(rB?o+8:5)||bb.y0>z.bot+5)){t0=z.bot-(rB&&z.bot===0?o*0.6:0);msg=(msg?msg+', ':'«'+ch+'»: ')+'низ '+(bb.y0>z.bot?'выше':'ниже')+' линии на '+Math.round(Math.abs(bb.y0-z.bot));}
    if(msg){hb.push(msg);fixH.push([ch,bb,t0,t1]);}}
  if(hb.length)R.push({id:'height',txt:'Высота и посадка на линии: '+hb.slice(0,3).join('; ')+(hb.length>3?' и ещё '+(hb.length-3):'')+'.',
    fix:()=>{for(const [ch,bb,t0,t1] of fixH)flatten(ch,drnFitY(D.g[ch].cs,bb.y0,bb.y1,t0,t1));toast('Высоты подогнаны у '+fixH.length+' знаков — буквы встали вровень');}});
  /* интервалы */
  const sm=stemMed(),sp={};let off=0,none=0;
  for(const ch of L){const a=drnAutoSp(D.g[ch].cs,sm);if(!a)continue;sp[ch]=a;const c=D.g[ch].sp;
    if(!c)none++;else if(Math.abs(c.l-a.l)>14||Math.abs(c.r-a.r)>14)off++;}
  if((none||off)&&!D.ak.sp)R.push({id:'space',txt:none?'Интервалы не настроены у '+none+' знаков. Оптический расчёт: '+Object.keys(sp).slice(0,3).map(c=>'«'+c+'» '+sp[c].l+'/'+sp[c].r).join(', ')+'.':'Интервалы устарели у '+off+' знаков после правок.',
    fix:()=>{for(const ch in sp)D.g[ch].sp=sp[ch];toast('Интервалы рассчитаны для '+Object.keys(sp).length+' знаков');}});
  /* общие формы кириллицы и латиницы */
  const tw=drnTwinPairs(isSaved);
  if(tw.length)R.push({id:'twin',txt:'Одинаковые буквы можно нарисовать один раз: '+tw.slice(0,4).map(p=>p[0]+' → '+p[1]).join(', ')+(tw.length>4?' и ещё '+(tw.length-4):'')+'.',
    fix:()=>{for(const [a,b] of tw){const s=D.g[a];D.g[b]={items:jc(s.items),s:true,cs:drnCp(s.cs),cols:s.cols,sp:s.sp?{...s.sp}:null};}toast('Скопировано форм: '+tw.length);}});
  /* мелкие пятна */
  const sp2=[];for(const ch of L){const z=impCat(ch).z;if(z==='pun'||z==='sym'||z==='idot'||z==='jdot'||'ёйЙЁ'.includes(ch))continue;
    const tiny=D.g[ch].cs.filter(c=>drnAreaAbs(c)<350);if(tiny.length)sp2.push(ch);}
  if(sp2.length)R.push({id:'speck',txt:'Мелкие пятна в знаках: '+sp2.slice(0,6).map(c=>'«'+c+'»').join(' ')+'.',
    fix:()=>{for(const ch of sp2){const r=D.g[ch];const it=r.items.filter(i=>{const a=i.cs.reduce((s,c)=>s+drnAreaAbs(c),0);return i.k==='sub'||a>=350;});
      const cs=drnEval(it).filter(c=>drnAreaAbs(c)>=350);flatten(ch,cs.length?cs:r.cs.filter(c=>drnAreaAbs(c)>=350));}toast('Пятна удалены — чисто, как после ластика');}});
  /* открытые контуры */
  const op=[];for(const ch of L){if(D.g[ch].items.some(i=>i.pen&&!i.pen.closed))op.push(ch);}
  if(op.length)R.push({id:'open',txt:'Контур пера не замкнут: '+op.slice(0,6).map(c=>'«'+c+'»').join(' ')+' — он залит по прямой между концами.',
    fix:()=>{for(const ch of op){const r=D.g[ch];for(const i of r.items)if(i.pen)i.pen.closed=true;if(ch===cur.ch)for(const i of cur.items)if(i.pen)i.pen.closed=true;}toast('Контуры замкнуты — ни одной щели');}});
  /* полиграмма и диакритика */
  const dr=[];for(const c of chars()){if(hasG(c)||!DRN_REC[c])continue;const d=draftFor(c);if(d)dr.push([c,d.label]);}
  for(const [c,l] of dr.slice(0,2))R.push({id:'draft-'+c,txt:'Для «'+c+'» есть заготовка из полиграммы: '+l+'.',go:c});
  const sp0=drnCompSpec(),byMark={};
  for(const t in sp0){if(isSaved(t))continue;const mk=sp0[t][1];if(D.g[mk]&&D.g[mk].s)continue;if(!baseRec(sp0[t][0]))continue;(byMark[mk]=byMark[mk]||[]).push(t);}
  Object.keys(byMark).sort((a,b)=>byMark[b].length-byMark[a].length).slice(0,3).forEach(mk=>{const mi=drnMarkInfo(mk),ts=byMark[mk];
    R.push({id:'mark-'+mi[2],txt:'Нарисуйте '+mi[5]+' — получите '+ts.slice(0,5).join(' ')+(ts.length>5?' и ещё '+(ts.length-5):'')+' автоматически.',go:mk});});
  for(const mi of DRN_MARKS){const r=D.g[mi[0]];if(!r||!r.s||!r.cs)continue;const mb=impBBox(r.cs);if(!mb)continue;
    const h=mb.y1-mb.y0,w=mb.x1-mb.x0,ws=savedList().filter(c=>!drnMarkInfo(c)&&/\p{Lu}/u.test(c)).map(c=>{const b=impBBox(D.g[c].cs);return b.x1-b.x0;}),bw=ws.length?impMed(ws):0;
    const k=Math.min(h>DRN.cap*0.3?DRN.cap*0.22/h:1,bw&&w>bw*0.8?bw*0.7/w:1);
    if(k<1)R.push({id:'msz-'+mi[2],txt:mi[1]+' слишком крупная: обычно 0,15–0,25 высоты прописных и не шире 0,8 основы.',
      fix:()=>{const ch=mi[0],q=D.g[ch],b=impBBox(q.cs),cx=(b.x0+b.x1)/2,oy=mi[4]==='b'?b.y1:b.y0;flatten(ch,drnAff(q.cs,x=>cx+(x-cx)*k,y=>oy+(y-oy)*k));toast('Знак уменьшен');}});}
  D.recs=R;return R;}
function applyFix(id){
  const r=D.recs.find(x=>x.id===id);if(!r||!r.fix)return;
  commitCur(true);ustReset();r.fix();
  D.built=false;loadCur(cur.ch);analyze();persistNow();sync(true);}
/* ---------------- интерфейс ---------------- */
const CSS=`
.dr{--dr-paper:var(--cvl-paper);--dr-ink:var(--cvl-ink);--dr-grid:var(--cvl-grid);--dr-grid2:var(--cvl-grid2);--dr-metric:var(--cvl-metric);--dr-ghost:var(--cvl-ghost);--dr-box:var(--cvl-box);--dr-nbr:var(--cvl-nbr);--dr-lab:var(--cvl-lab);
  container:dr/inline-size;height:100%;min-height:0;overflow-y:auto;overflow-x:hidden;color:var(--ink)}
.dr-g{--dr-gw:172px;--dr-sw:264px;height:100%;min-height:0;display:grid;grid-template-columns:var(--dr-gw) minmax(0,1fr) var(--dr-sw);grid-template-rows:auto minmax(0,1fr);gap:var(--wg);font:400 var(--fs-base)/1.4 var(--f-ui);transition:grid-template-columns var(--dur-base) var(--ease-std)}
.dr-g[data-gc="1"]{--dr-gw:46px}
html[data-theme=dark] .dr{--dr-paper:var(--cvd-paper);--dr-ink:var(--cvd-ink);--dr-grid:var(--cvd-grid);--dr-grid2:var(--cvd-grid2);--dr-metric:var(--cvd-metric);--dr-ghost:var(--cvd-ghost);--dr-box:var(--cvd-box);--dr-nbr:var(--cvd-nbr);--dr-lab:var(--cvd-lab)}
html .dr[data-cv=light]{--dr-paper:var(--cvl-paper);--dr-ink:var(--cvl-ink);--dr-grid:var(--cvl-grid);--dr-grid2:var(--cvl-grid2);--dr-metric:var(--cvl-metric);--dr-ghost:var(--cvl-ghost);--dr-box:var(--cvl-box);--dr-nbr:var(--cvl-nbr);--dr-lab:var(--cvl-lab)}
html .dr[data-cv=dark]{--dr-paper:var(--cvd-paper);--dr-ink:var(--cvd-ink);--dr-grid:var(--cvd-grid);--dr-grid2:var(--cvd-grid2);--dr-metric:var(--cvd-metric);--dr-ghost:var(--cvd-ghost);--dr-box:var(--cvd-box);--dr-nbr:var(--cvd-nbr);--dr-lab:var(--cvd-lab)}
.dr{user-select:none;-webkit-user-select:none}.dr textarea,.dr input[type=text]{user-select:text;-webkit-user-select:text}
.dr *{box-sizing:border-box;scrollbar-width:none}.dr *::-webkit-scrollbar{display:none}
:where(.dr) button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
.dr-top #dr-shareb>span{display:none}.dr-top #dr-shareb{padding:0 var(--s3)}/* только значок: подпись в title и aria-label */
.dr-top{grid-column:1/-1;display:flex;align-items:center;gap:var(--s2);flex-wrap:nowrap;min-width:0;background:var(--surface);border-radius:calc(var(--h-md) / 2 + var(--s2));padding:var(--s2) var(--s3);box-shadow:var(--sh-1)}   /* nested radius: bar = pill 17 + inset 8 */
.dr-setw{position:relative;min-width:0;flex:0 1 auto}
.dr-setb{display:inline-flex;align-items:center;gap:var(--s2);height:var(--h-md);max-width:100%;padding:0 var(--s3) 0 var(--s4);border-radius:var(--r-pill);font-weight:600;font-size:var(--fs-md);white-space:nowrap;
  background:linear-gradient(90deg,var(--panel-2) var(--p,0%),var(--surface-2) var(--p,0%));box-shadow:inset 0 0 0 1px var(--line);transition:box-shadow var(--dur-base) var(--ease-out-soft)}
.dr-setb:hover{box-shadow:inset 0 0 0 1px var(--line-strong);transition-duration:var(--dur-fast)}
.dr-setb[aria-expanded=true]{box-shadow:inset 0 0 0 1px var(--text-2)}
.dr-setn{min-width:0;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto}.dr-setd{color:var(--text-2)}
.dr-setb .dr-prog{padding:0;flex:1;text-align:left;color:var(--text-2);font-variant-numeric:tabular-nums}
.dr-setb .ico{width:14px;height:14px;flex:none;color:var(--text-2);transition:transform var(--dur-base) var(--ease-std)}
.dr-setb[aria-expanded=true] .ico{transform:rotate(180deg)}
.dr-sets{position:absolute;left:0;top:calc(100% + var(--s2));z-index:40;min-width:min(300px,calc(100vw - 32px));transform-origin:top left;display:grid!important;
  visibility:hidden;opacity:0;transform:scale(.97);pointer-events:none;transition:opacity var(--dur-instant) var(--ease-in),transform var(--dur-instant) var(--ease-in),visibility 0s linear var(--dur-instant)}
.dr-sets:not([hidden]){visibility:visible;opacity:1;transform:none;pointer-events:auto;transition:opacity var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out)}
.dr-sets.menu>button{justify-content:space-between;gap:var(--s5)}
.dr-sets.menu>button.on{background:var(--surface-3);color:var(--text);font-weight:700}
.dr-sets em{font-style:normal;font-weight:500;font-size:var(--fs-md);color:var(--text-2);font-variant-numeric:tabular-nums}
.dr-b[hidden],.dm-qb[hidden]{display:none}
.dr-in{animation:dr-in var(--dur-base) var(--ease-out) both}
@keyframes dr-in{from{opacity:0;transform:translateX(var(--s2)) scale(.96)}}
.dr-sp{flex:1}.dr-prog{font-weight:600;font-size:var(--fs-md);color:var(--text-2);white-space:nowrap;padding:0 var(--s2)}
.dr-b{display:inline-flex;align-items:center;gap:var(--s2);min-height:var(--h-md);padding:0 var(--s4);border-radius:var(--r-pill);background:var(--surface-2);font-weight:600;font-size:var(--fs-md);white-space:nowrap;position:relative}
.dr-b:hover{background:var(--surface-3)}.dr-b:disabled,.dr-b.pri:disabled,.dr-ib.acc:disabled{background:var(--surface-2);color:var(--text-2);opacity:.7;cursor:default;filter:none}
.dr-b.pri{background:var(--accent);color:var(--on-accent)}.dr-b.pri:hover{background:var(--accent-hover)}.dr-b.pri:active{background:var(--accent-press)}
.dr-b .bd{min-width:20px;height:20px;border-radius:var(--r-pill);background:var(--accent);color:var(--on-accent);font-size:var(--fs-sm);font-weight:700;display:grid;place-items:center;padding:0 var(--s1)}
.dr-card{background:var(--surface);border-radius:var(--r-md);min-height:0;min-width:0;box-shadow:var(--sh-1)}
.dr-gwrap{display:flex;flex-direction:column;overflow:hidden}
.dr-gtog{display:flex;align-items:center;gap:var(--s2);width:100%;min-height:var(--h-lg);padding:0 var(--s3);font-weight:600;font-size:var(--fs-md);color:var(--text);text-align:left;flex:none}
.dr-gtog span{flex:1}.dr-gtog .ico{width:16px;height:16px;color:var(--text-3);transition:transform var(--dur-fast)}
.dr-gtog:hover .ico{color:var(--text)}
.dr-g[data-gc="1"] .dr-gtog{justify-content:center;padding:0}.dr-g[data-gc="1"] .dr-gtog span{display:none}.dr-g[data-gc="1"] .dr-gtog .ico{transform:rotate(180deg)}
.dr-g[data-gc="1"] .dr-strip{display:none}
.dr-gcur{display:none;font:700 var(--fs-xl)/1 var(--f-ui);text-align:center;padding:var(--s3) 0;color:var(--text)}
.dr-g[data-gc="1"] .dr-gcur{display:block}
.dr-strip{padding:var(--s0) var(--s2) var(--s2);overflow-y:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s1);align-content:start;flex:1;min-height:0}
.dr-gl{aspect-ratio:1;border-radius:var(--r-xs);background:var(--surface-2);display:grid;place-items:center;font-weight:600;font-size:var(--fs-base);position:relative;color:var(--ink);min-width:0}
.dr-gl:hover{background:var(--surface-3)}
.dr-gl.cur{outline:2px solid var(--ink);outline-offset:-2px;background:var(--surface)}
.dr-gl.draft::after{content:"";position:absolute;left:var(--s1);top:var(--s1);width:6px;height:6px;border-radius:50%;background:var(--text-2)}
.dr-gl svg.th{width:76%;height:76%;fill:currentColor}
.dr-gl .lt{display:none}
.dr-gl .ok{position:absolute;right:var(--s1);bottom:var(--s1);width:8px;height:8px;border-radius:50%;background:var(--ok);color:var(--on-accent);display:grid;place-items:center}
.dr-gl .ok svg,.dr-gl .ok i{display:none}
.dr-mid{min-width:0;min-height:0;display:grid;place-items:center;position:relative}
.dr-sq{position:relative;border-radius:var(--r-md);overflow:hidden;background:var(--dr-paper);box-shadow:var(--sh-2)}
.dr-sq canvas{display:block;width:100%;height:100%;touch-action:none;cursor:crosshair}
.dr-pill{position:absolute;display:flex;align-items:center;gap:var(--s0);padding:var(--s1);background:var(--surface);border-radius:var(--r-pill);box-shadow:var(--sh-2);color:var(--text);z-index:3;max-width:calc(100% - 16px)}
.dr-ib{width:var(--h-md);height:var(--h-md);border-radius:50%;display:grid;place-items:center;flex:none;position:relative}
.dr-ib .ico,.dr-ib svg{width:20px!important;height:20px!important}   /* mask icons carry an inline 22px: one size per toolbar */
.dr-ib:hover{background:var(--surface-3)}.dr-ib.on{background:var(--ink);color:var(--surface)}.dr-ib:disabled{opacity:.3;cursor:default}
.dr-ib:focus-visible,.dr-b:focus-visible,.dr-pills button:focus-visible,.dr-gl:focus-visible,.dr-gtog:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
.dr-ib.acc{background:var(--ink);color:var(--on-ink);width:auto;padding:0 var(--s3);border-radius:var(--r-pill);gap:var(--s2);display:inline-flex;font-weight:600;font-size:var(--fs-md)}
.dr-tr{right:var(--s3);top:var(--s3)}
.dr-dock{left:50%;bottom:var(--s3);transform:translateX(-50%);flex-direction:column;align-items:stretch;gap:var(--s0);padding:var(--s1);border-radius:var(--r-lg);max-width:calc(100% - 16px)}   /* nested radius: 17 (button) + 4 (inset) ~ r-lg */
.dr-trow{display:flex;align-items:center;justify-content:center;gap:var(--s0);min-width:0}
.dr-grp{display:flex;align-items:center;gap:var(--s0);flex:none}
.dr-dv{width:1px;height:var(--s5);background:var(--line);margin:0 var(--s2);flex:none}
.dr-orow{display:flex;align-items:center;gap:var(--s3);min-height:var(--h-sm);padding:var(--s1) var(--s3);border-top:1px solid var(--line);min-width:0}
.dr-tlab{font-weight:700;font-size:var(--fs-md);color:var(--text);white-space:nowrap;flex:none}
.dr-orow .dr-opt{margin:0;padding:0;border:0;flex:1;min-width:0}
.dr-opt{display:flex;align-items:center;gap:var(--s2);flex-wrap:nowrap;white-space:nowrap;min-width:0;margin-left:var(--s1);padding-left:var(--s2);border-left:1px solid var(--line)}
.dr-opt:empty{display:none}.dr-opt[hidden]{display:none}
.dr [data-tip]::after{content:attr(data-tip);position:absolute;z-index:6;pointer-events:none;opacity:0;white-space:nowrap;background:var(--g900);color:var(--g0);font:500 var(--fs-sm)/1 var(--f-ui);padding:var(--s2) var(--s3);border-radius:var(--r-xs);box-shadow:var(--sh-3);transition:opacity var(--dur-fast)}
.dr [data-tip]:hover::after,.dr [data-tip]:focus-visible::after{opacity:1}
.dr-dock [data-tip]::after{bottom:calc(100% + 10px);left:50%;transform:translateX(-50%)}
.dr-tr [data-tip]::after{top:calc(100% + 10px);right:0}
@media (prefers-reduced-motion:reduce){.dr-g,.dr [data-tip]::after,.dr-gtog .ico{transition:none}}
.dr-bar{display:none}
body.dr-on .toast{left:auto;right:var(--s4);bottom:var(--s4);top:auto;transform:translateY(20px);max-width:min(420px,calc(100vw - 32px))}
body.dr-on .toast.on{transform:none}
@media (max-width:720px){body.dr-on .toast{left:50%;right:auto;top:auto;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px)}body.dr-on .toast.on{transform:translate(-50%,0)}}/* FX80 C09: тост внизу, шапку не закрывает */
.dr-opt input[type=range]{width:96px;accent-color:var(--accent)}
.dr-opt .hint{color:var(--text-2);font-size:var(--fs-sm);padding:0 var(--s2)}
.dr-opt output{min-width:2.4em;font-weight:600;font-variant-numeric:tabular-nums}
.dr-side{padding:var(--s1) var(--s3) var(--s2);display:flex;flex-direction:column;gap:0;overflow-y:auto}
.dr-side>.pane:last-child{border-bottom:0}
.dr-sec{display:grid;gap:var(--s3)}
.dr-rbd{min-width:18px;height:18px;border-radius:var(--r-pill);background:var(--ink);color:var(--on-ink);font-size:var(--fs-xs);font-weight:700;display:grid;place-items:center;padding:0 var(--s1)}
.dr-rbd[hidden]{display:none}
.dr-pills{display:flex;flex-wrap:wrap;gap:var(--s2)}
.dr-pills button{padding:0 var(--s3);border-radius:var(--r-pill);background:var(--surface-2);font-weight:500;font-size:var(--fs-md);min-height:var(--h-sm)}
.dr-pills button:hover{background:var(--surface-3)}
.dr-pills button.on{background:var(--ink);color:var(--surface)}
.dr-row{display:grid;gap:var(--s1)}.dr-row label,.dr-row .lb{display:flex;justify-content:space-between;font-weight:500;font-size:var(--fs-md)}
.dr-row output{font-weight:700;font-variant-numeric:tabular-nums}
.dr-side input[type=range],.dr-m input[type=range]{width:100%;accent-color:var(--accent)}
.dr-sw{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);font-weight:500;font-size:var(--fs-md);cursor:pointer;min-height:var(--h-sm)}
.dr-sw input{position:absolute;opacity:0;pointer-events:none}
.dr-sw i{width:34px;height:20px;border-radius:var(--r-pill);background:var(--line-strong);position:relative;flex:none;transition:background var(--dur-fast)}
.dr-sw i::after{content:"";position:absolute;left:var(--s0);top:var(--s0);width:16px;height:16px;border-radius:50%;background:var(--on-accent);transition:transform var(--dur-fast)}
.dr-sw input:checked+i{background:var(--accent)}.dr-sw input:checked+i::after{transform:translateX(14px)}
.dr-sw input:focus-visible+i{outline:2px solid var(--focus-ring);outline-offset:2px}
.dr-rec{background:var(--surface-2);border-radius:var(--r-sm);padding:var(--s3);display:grid;gap:var(--s2);font-size:var(--fs-md)}
.dr-rec p{margin:0}.dr-rec .dr-b{min-height:var(--h-md);padding:0 var(--s3);justify-self:start;font-size:var(--fs-md)}
.dr-empty{color:var(--text-2);padding:var(--s2) var(--s0);font-size:var(--fs-md)}
.dr-m{position:fixed;inset:0;z-index:80;background:var(--scrim);display:grid;place-items:center;padding:var(--s4)}
.dr-m[hidden]{display:none}
.dr-mc{background:var(--paper);color:var(--ink);border-radius:var(--r);padding:var(--s5);width:min(860px,100%);max-height:100%;overflow-y:auto;display:grid;gap:var(--s3);box-shadow:var(--sh-3)}
.dr-mc h3{margin:0;font:700 var(--fs-xl)/1.2 var(--f-ui)}
.dr-mh{display:flex;align-items:center;gap:var(--s3)}
.dr-m textarea,.dr-m input[type=text]{width:100%;border:0;background:var(--panel);border-radius:var(--r-sm);padding:var(--s3);font:inherit;color:inherit;resize:none}
.dr-tt{border-radius:var(--r-md);overflow:auto;background:var(--dr-paper);min-height:160px}
.dr-tt canvas{display:block}
.dr-ctl{display:flex;gap:var(--s3);align-items:center;flex-wrap:wrap}
.dr-ctl .dr-pills{flex:1}.dr-mc .dr-pills button{background:var(--panel)}.dr-mc .dr-pills button:hover{background:var(--panel-2)}
.dr-pop{position:absolute;left:var(--s3);top:calc(var(--h-lg) + var(--s3));z-index:4;background:var(--paper);border-radius:var(--r-md);box-shadow:var(--sh-3);padding:var(--s3);width:min(300px,calc(100% - 16px));max-height:62%;overflow-y:auto;display:flex;flex-wrap:wrap;gap:var(--s2)}
.dr-pop button{width:var(--h-lg);height:var(--h-lg);border-radius:var(--r-sm);background:var(--panel);font-weight:600}
.dr-pop[hidden]{display:none}
.dr-note{position:absolute;right:var(--s3);top:calc(var(--h-lg) + var(--s3));z-index:3;display:flex;flex-direction:column;align-items:flex-start;gap:var(--s2);padding:var(--s3);background:var(--paper);border-radius:var(--r-md);box-shadow:var(--sh-2);max-width:min(230px,40%);font:500 var(--fs-md)/1.35 var(--f-ui)}
.dr-note[hidden]{display:none}.dr-note>span{min-width:0}
.dr-note .dr-b{min-height:var(--h-md);padding:0 var(--s3);font-size:var(--fs-md)}
.dr-note.draft{box-shadow:0 0 0 2px var(--line-strong),var(--sh-2)}
.dr-gl .cm{position:absolute;right:var(--s1);bottom:var(--s1);width:16px;height:16px;border-radius:50%;background:var(--ink);color:var(--paper);display:grid;place-items:center}
.dr-gl .cm svg{width:11px;height:11px;stroke-width:3}
.dr-gl.cmp{outline:1px dashed var(--muted);outline-offset:-3px}
.dr-h{margin:var(--s2) 0 0;font:700 var(--fs-lg)/1.3 var(--f-ui)}
.dr-hint{margin:0;color:var(--muted);font-size:var(--fs-md)}
.dr-ak{display:grid;gap:var(--s3);min-width:0}.dr-ak .dr-h:first-child{margin-top:0}
.dr-akr{display:flex;align-items:center;gap:var(--s3);flex-wrap:wrap;min-width:0}.dr-akr .dr-b{flex:0 1 auto;max-width:100%;overflow:hidden;text-overflow:ellipsis}.dr-akr .dr-sw{flex:1 1 auto;min-width:0}
.dr-akpv{display:block;width:100%;max-width:100%;border-radius:var(--r-md);background:var(--dr-paper);box-shadow:inset 0 0 0 1px var(--line)}
.dr-akst{display:inline-flex;align-items:center;gap:var(--s2);color:var(--text-2);font-size:var(--fs-md);min-width:0}.dr-akst b{font-weight:700;color:var(--ink)}
.dr-ak input[type=text]{width:100%;border:0;background:var(--panel);border-radius:var(--r-sm);padding:var(--s2) var(--s3);font:inherit;font-size:var(--fs-md);color:inherit;min-width:0}
.dr-lay>.dr-hint:first-child{min-height:var(--h-md);display:flex;align-items:center}   /* the empty-state line holds the height of one layer row: saving a glyph (list <-> empty) does not shift the panel */
.dr-fam{display:flex;flex-wrap:wrap;gap:var(--s2)}
.dr-fam button{min-width:var(--h-md);height:var(--h-md);border-radius:var(--r-xs);background:var(--surface-2);font-weight:600;position:relative;padding:0 var(--s2);color:var(--ink)}
.dr-fam button.off{color:var(--muted);font-weight:400}
.dr-fam button.cur{outline:2px solid var(--ink);outline-offset:-2px}
.dr-fam.mk button{height:var(--h-md);font-weight:500;font-size:var(--fs-md);display:inline-flex;align-items:center;gap:var(--s2);padding:0 var(--s3)}.dr-fam.mk .mg{font-size:var(--fs-xl);line-height:1;font-weight:600;min-width:12px;text-align:center}
.dr-fam button i{position:absolute;right:var(--s1);top:var(--s1);width:7px;height:7px;border-radius:50%}
.dr-shp{display:flex;flex-wrap:wrap;gap:var(--s1)}
.dr-shp .dr-ib{background:var(--surface-2);width:var(--h-md);height:var(--h-md)}
.dr-shp .dr-ib:hover{background:var(--surface-3)}.dr-shp .dr-ib.on{background:var(--ink);color:var(--surface)}
.dr-shp .dr-ib svg{width:18px;height:18px;stroke-linejoin:miter}
.dr-lay{display:grid;gap:var(--s2);padding-bottom:var(--s3);border-bottom:1px solid var(--line)}
.dr-lays{display:flex;flex-direction:column;gap:var(--s1)}
.dr-ly{display:flex;align-items:center;gap:var(--s1);min-height:var(--h-md);padding:0 var(--s3) 0 var(--s1);border-radius:var(--r-md);background:var(--surface-2);transition:background var(--dur-fast) var(--ease-std)}
.dr-ly:hover{background:var(--surface-3)}.dr-ly.on{background:var(--ink);color:var(--surface)}
.dr-ly .dr-ib{width:var(--h-md);height:var(--h-md);flex:none;background:transparent;color:inherit}
.dr-ly.on .dr-ib:hover{background:color-mix(in srgb,var(--surface) 22%,transparent)}
.dr-ly.off .dr-ly-nm,.dr-ly.off .dr-ly-c{opacity:.55}.dr-ly.off .dr-ly-nm{text-decoration:line-through}
.dr-ly-nm{flex:1;min-width:0;text-align:left;font:500 var(--fs-md)/1.2 var(--f-ui);color:inherit;background:transparent;padding:var(--s2) var(--s1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:var(--h-md)}
.dr-ly-in{flex:1;min-width:0;height:calc(var(--h-md) - var(--s2));border:0;border-radius:var(--r-sm);padding:0 var(--s2);font:500 var(--fs-md) var(--f-ui);background:var(--paper);color:var(--ink);outline:2px solid var(--focus-ring);outline-offset:0}
.dr-ly-c{flex:none;font-size:var(--fs-sm);font-variant-numeric:tabular-nums;opacity:.75}
.dr-lbar{display:flex;gap:var(--s1);flex-wrap:wrap}
.dr-lbar .dr-ib{background:var(--surface-2);width:var(--h-md);height:var(--h-md)}.dr-lbar .dr-ib:hover:not(:disabled){background:var(--surface-3)}.dr-lbar .dr-ib:disabled{opacity:.35;cursor:default}
.dr-conf{display:grid;gap:var(--s2);font-weight:500;font-size:var(--fs-md)}
.dr-sub{margin:var(--s1) 0 0;font-weight:600;font-size:var(--fs-md)}
.dr-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--s4)}
.dr-ends{display:flex;justify-content:space-between;gap:var(--s2);color:var(--text-2);font-size:var(--fs-sm)}
.dr-pills button:disabled{opacity:.4;cursor:default}
@container dr (max-width:1040px){.dr-g{--dr-gw:148px;--dr-sw:236px}.dr-top #dr-testb>span,.dr-top #dr-shareb>span{display:none}.dr-top #dr-testb{order:1}.dr-top #dr-fontb{order:2}.dr-top .dm-qb{order:3;margin-left:calc(-1 * var(--s1))}.dr-top #dr-shareb{order:4}.dr-top #dr-testb,.dr-top #dr-shareb{padding:0 var(--s3)}}
@container dr (max-width:760px){
  .dr-g{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto auto;height:auto;min-height:100%;align-content:start}
  .dr-g[data-gc="1"]{--dr-gw:auto}
  .dr-gtog,.dr-gcur{display:none!important}.dr-g[data-gc="1"] .dr-strip{display:flex}
  .dr-gwrap{overflow:visible}
  .dr-strip{display:flex;overflow-x:auto;overflow-y:hidden;padding:var(--s2)}.dr-gl{width:var(--h-lg);height:var(--h-lg);flex:none;aspect-ratio:auto}
  .dr-mid{aspect-ratio:auto}
  .dr-top{flex-wrap:wrap}
  .dr-side{overflow:visible}
}
@container dr (max-width:560px){.dr-mid{aspect-ratio:auto!important;display:flex;flex-direction:column;align-items:center;gap:var(--s2)}
  .dr-bar{display:flex;flex-wrap:wrap;gap:var(--s2);justify-content:center;width:100%}
  .dr-bar .dr-pill,.dr-bar .dr-note{position:static;transform:none;max-width:100%}.dr-bar .dr-note{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;max-width:100%;font-size:var(--fs-base);box-shadow:var(--sh-1)}.dr-bar .dr-note.draft{box-shadow:0 0 0 2px var(--line-strong)}
  .dr-bar .dr-pill{box-shadow:var(--sh-1);background:var(--surface)}
  .dr-bar .dr-dock{border-radius:var(--r-lg);width:100%}.dr-bar .dr-dv{display:none}
  .dr-bar .dr-trow{flex-wrap:wrap;justify-content:space-between;row-gap:var(--s1)}.dr-bar .dr-hg{order:1}.dr-bar .dr-og{order:2}.dr-bar .dr-tools{order:3;flex:1 0 100%;justify-content:space-between}
  .dr-bar .dr-orow{padding:var(--s1) var(--s2)}.dr-bar .dr-opt{white-space:normal;flex-wrap:wrap;justify-content:flex-start}
  .dr-top .dr-setw{flex:1 1 100%}.dr-setb{width:100%}.dr-top .dr-b{padding:0 var(--s3)}.dr-top #dr-testb>span,.dr-top #dr-shareb>span{display:none}.dr-ib.acc span{display:none}.dr-ib.acc{padding:0;width:var(--h-md);justify-content:center}.dr-opt .hint{display:none}.dr-b span.lb2{display:none}
  .dr-bar [data-tip]::after,.dr-tr [data-tip]::after{display:none}}
`;
function build(el){
  if(!document.getElementById('dr-n7-css')){const s=document.createElement('style');s.id='dr-n7-css';s.textContent=CSS;document.head.appendChild(s);}
  el.innerHTML='';const root=document.createElement('div');root.className='dr';root.id='gtdraw';root.setAttribute('data-cv',D.cv);ui.root=root;
  root.innerHTML=`<div class="dr-g">
  <div class="dr-top">
    <div class="dr-setw" id="dr-setw">
      <button class="dr-setb" id="dr-setb" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="dr-sets" title="Выбрать набор знаков"><span class="dr-setn" id="dr-setn"></span><span class="dr-setd" aria-hidden="true">·</span><span class="dr-prog" id="dr-prog"></span><i class="ico i-chev-down" aria-hidden="true"></i></button>
      <div class="dr-sets menu" id="dr-sets" role="listbox" aria-label="Набор знаков" hidden></div>
    </div>
    <span class="dr-sp"></span>
    <button class="dr-b" id="dr-testb" type="button" title="Проверить шрифт" aria-label="Проверить шрифт">${ic('play',18)}<span>Проверить шрифт</span></button>
    <button class="dr-b pri" id="dr-fontb" type="button" aria-label="Скачать шрифт">${ic('save',18)}<span>Скачать шрифт</span></button><button class="dr-b" id="dr-shareb" type="button" title="Поделиться шрифтом: постер, PNG и видео" aria-label="Поделиться шрифтом"><i class="ico i-share" style="width:18px;height:18px" aria-hidden="true"></i><span>Поделиться</span></button>${window.DM?DM.hintHTML('save','dm-qb'):''}
  </div>
  <div class="dr-card dr-gwrap" id="dr-gwrap">
    <button class="dr-gtog" id="dr-gtog" type="button" aria-expanded="true" aria-controls="dr-strip" title="Свернуть или развернуть список знаков"><span>Знаки</span><i class="ico i-chev-left"></i></button>
    <div class="dr-gcur" id="dr-gcur" aria-hidden="true"></div>
    <div class="dr-strip" id="dr-strip" role="listbox" aria-label="Знаки"></div>
  </div>
  <div class="dr-mid" id="dr-mid"><div class="dr-sq" id="dr-sq">
    <canvas id="dr-cv" aria-label="Холст знака"></canvas>
    <div class="dr-pill dr-tr" id="dr-tr">
      <button class="dr-ib" id="dr-gh" type="button" data-tip="Образец буквы" aria-label="Образец буквы" aria-pressed="true">${ic('eye')}</button>
      <button class="dr-ib" id="dr-th" type="button" data-tip="Тема холста" aria-label="Тема холста">${ic('moon')}</button>
      <button class="dr-ib acc" id="dr-sv" type="button" data-tip="Готово (Enter)" aria-label="Готово">${ic('check')}<span>Готово</span></button>
    </div>
    <div class="dr-pop" id="dr-pop" hidden></div>
    <div class="dr-note" id="dr-note" hidden></div>
    <div class="dr-pill dr-dock" id="dr-dock" role="toolbar" aria-label="Рисование">
      <div class="dr-trow">
        <div class="dr-grp dr-hg" id="dr-tl" role="group" aria-label="История">
          <button class="dr-ib" id="dr-undo" type="button" data-tip="Отменить (Ctrl+Z)" aria-label="Отменить">${ic('undo')}</button>
          <button class="dr-ib" id="dr-redo" type="button" data-tip="Повторить (Ctrl+Y)" aria-label="Повторить">${ic('redo')}</button>
          <button class="dr-ib" id="dr-hist" type="button" data-tip="История правок" aria-label="История правок" aria-haspopup="dialog" aria-expanded="false">${ic('hist')}</button>
        </div>
        <span class="dr-dv" aria-hidden="true"></span>
        <div class="dr-tools dr-grp" id="dr-tools" role="group" aria-label="Инструменты"></div>
        <span class="dr-dv" aria-hidden="true"></span>
        <div class="dr-grp dr-og" id="dr-ops" role="group" aria-label="Действия со знаком">
          <button class="dr-ib" id="dr-mir" type="button" data-tip="Отразить (Shift — по вертикали)" aria-label="Отразить">${ic('mirror')}</button>
          <button class="dr-ib" id="dr-from" type="button" data-tip="Взять из другого знака" aria-label="Взять из другого знака">${ic('copy')}</button>
          <button class="dr-ib" id="dr-clr" type="button" data-tip="Очистить знак" aria-label="Очистить знак">${ic('trash')}</button>
        </div>
      </div>
      <div class="dr-orow"><span class="dr-tlab" id="dr-tlab" aria-live="polite"></span><div class="dr-opt" id="dr-opt"></div></div>
    </div>
  </div><div class="dr-bar" id="dr-bar"></div></div>
  <div class="dr-card dr-side dw" id="dr-side" data-open="0" inert aria-hidden="true">
    ${paneHTML('dr-cells','Сетка ячеек','<div id="dr-cl"></div>',{hid:'dr-ph-cells',cls:'line'})}
    ${paneHTML('dr-grid','Сетка','<div id="dr-pg"></div>',{hid:'dr-ph-grid',cls:'line'})}
    ${paneHTML('dr-con','Конструкция','<div id="dr-cn"></div>',{hid:'dr-ph-con',cls:'line'})}
    ${paneHTML('dr-spk','Интервалы и кернинг',`<div class="dr-ak" id="dr-spkb">
      <h3 class="dr-h">Интервалы</h3>
      <p class="dr-hint">Поля считаются по площади белого у краёв буквы: прямые, круглые и диагональные стороны — по одному правилу. Ориентир — «н» и «о».</p>
      <div class="dr-akr"><button type="button" class="dr-b pri" id="dr-aksp" disabled>Рассчитать интервалы</button><label class="dr-sw">Авто-интервалы<input type="checkbox" id="dr-aksw" disabled><i></i></label></div>
      <p class="dr-hint" id="dr-aksi" aria-live="polite"></p>
      <h3 class="dr-h">Кернинг</h3>
      <p class="dr-hint">Пары кириллицы, латиницы и знаков препинания по формам букв. Значения попадут в шрифт при сборке (таблица GPOS kern) и в окно «Кернинг».</p>
      <div class="dr-akr"><button type="button" class="dr-b pri" id="dr-akk" disabled>Рассчитать кернинг</button><label class="dr-sw">Авто-кернинг<input type="checkbox" id="dr-akkw" disabled><i></i></label></div>
      <div class="dr-row"><label for="dr-aks">Сила <output id="dr-akso">100 %</output></label><input id="dr-aks" type="range" min="0" max="150" step="5" value="100"></div>
      <div class="dr-row"><label for="dr-akt">Текст для проверки</label><input type="text" id="dr-akt" maxlength="60" autocomplete="off" spellcheck="false" aria-label="Текст для проверки кернинга"></div>
      <canvas class="dr-akpv" id="dr-akpv" role="img" aria-label="Сравнение текста без кернинга и с кернингом"></canvas>
      <p class="dr-hint" id="dr-aksk" aria-live="polite"></p>
    </div>`,{hid:'dr-ph-spk',cls:'line'})}
    ${paneHTML('dr-recs','Рекомендации и языки','<div id="dr-lgh"></div><div id="dr-pr"></div>',{hid:'dr-ph-recs',cls:'line',head:'<span class="dr-rbd" id="dr-recn" hidden></span>'})}
  </div>
  <div class="dr-m" id="dr-mt" hidden role="dialog" aria-label="Проверка шрифта"><div class="dr-mc">
    <div class="dr-mh"><h3>Проверка шрифта</h3><span class="dr-sp"></span><button class="dr-ib" id="dr-mtx" type="button" aria-label="Закрыть">${ic('x')}</button></div>
    <div class="dr-ctl"><div class="dr-pills" id="dr-pg2"><button type="button" data-p="ru">Русский</button><button type="button" data-p="en">English</button><button type="button" data-p="num">Цифры</button></div>
      <button class="dr-ib" id="dr-tth" type="button" aria-label="Светлый или тёмный фон">${ic('moon')}</button></div>
    <div class="dr-row"><label for="dr-ts">Размер <output id="dr-tso">64</output></label><input id="dr-ts" type="range" min="20" max="180" value="64"></div>
    <div class="dr-tt" id="dr-tt"><canvas id="dr-tc"></canvas><textarea id="dr-tx" rows="1" wrap="off" aria-label="Текст для проверки: печатайте прямо в образце" spellcheck="false" autocomplete="off"></textarea></div>
    <div class="dr-ctl"><button class="dr-b" id="dr-mtc" type="button">Закрыть</button><span class="dr-sp"></span><button class="dr-b pri" id="dr-mtf" type="button">${ic('save',20)}<span>Скачать шрифт</span></button></div>
  </div></div>
  <div class="dr-m" id="dr-mf" hidden role="dialog" aria-label="Скачать шрифт"><div class="dr-mc" style="width:min(460px,100%)">
    <div class="dr-mh"><h3>Скачать шрифт</h3><span class="dr-sp"></span><button class="dr-ib" id="dr-mfx" type="button" aria-label="Закрыть">${ic('x')}</button></div>
    <div class="dr-row"><label for="dr-nm">Название шрифта</label><input type="text" id="dr-nm" maxlength="80" autocomplete="off" aria-describedby="dr-nmh"></div>
    <p class="dr-hint" id="dr-nmh">Не длиннее 31 символа, без / \ : &lt; &gt; и эмодзи.</p>
    <p id="dr-mfi" style="margin:0;color:var(--muted)"></p>
    <div class="dr-ctl"><button class="dr-b" id="dr-mfc" type="button">Отмена</button><span class="dr-sp"></span><button class="dr-b pri" id="dr-mfo" type="button">${ic('check',20)}<span>Создать шрифт</span></button></div>
  </div></div></div>`;
  el.appendChild(root);
  for(const id of ['gwrap','gtog','gcur','dock','lgh','sets','bar','prog','strip','mid','sq','cv','tl','tr','tools','ops','tlab','setb','setn','setw','opt','side','pg','pr','cn','note','pop','undo','redo','mir','from','clr','gh','th','sv','recn','cl','testb','fontb','shareb','mt','tx','ts','tso','tt','tc','mf','nm','mfi','mfo','mtx','mtc','mtf','mfx','mfc','tth','pg2','aksp','aksw','akk','akkw','aks','akso','akt','akpv','aksi','aksk'])ui[id]=root.querySelector('#dr-'+id);
  root.querySelectorAll('.pane').forEach(p=>paneInit(p,p.dataset.pane,p.dataset.pane==='dr-grid'||p.dataset.pane==='dr-cells'));
  ui.cpane=root.querySelector('[data-pane=dr-cells]');ui.cpane.hidden=true;
  {let c=0;try{c=localStorage.getItem('gt-dr-gc')==='1';}catch(e){}setGC(c);}
  /* «Языки вашего набора» вставляет ui_lang_l1.js в начало панели — переносим в панель «Рекомендации и языки» */
  new MutationObserver(()=>{const l=document.getElementById('lg-draw');if(l&&l.parentNode!==ui.lgh)ui.lgh.appendChild(l);}).observe(ui.side,{childList:true});
  wire();clWire();}
function wire(){
  const R=ui.root,on=(e,t,f)=>e.addEventListener(t,f);
  on(ui.setb,'click',e=>{e.stopPropagation();setMenu(ui.sets.hidden);});
  on(ui.setw,'keydown',e=>{if(e.key==='Escape'&&!ui.sets.hidden){e.stopPropagation();setMenu(false);ui.setb.focus();}
    else if((e.key==='ArrowDown'||e.key==='ArrowUp')&&(e.target===ui.setb||ui.sets.contains(e.target))){e.preventDefault();if(ui.sets.hidden)setMenu(true);
      const bs=[...ui.sets.querySelectorAll('button')],i=bs.indexOf(document.activeElement),n=e.key==='ArrowDown'?(i+1)%bs.length:(i<=0?bs.length-1:i-1);bs[n].focus();}});
  document.addEventListener('click',e=>{if(!ui.sets.hidden&&!e.target.closest('#dr-setw'))setMenu(false);});
  on(ui.sets,'click',e=>{const b=e.target.closest('button');if(!b)return;setMenu(false);ui.setb.focus();if(b.dataset.s===D.set)return;commitCur(true);D.set=b.dataset.s;const L=chars();if(!L.includes(cur.ch))loadCur(L.find(c=>!isSaved(c))||L[0]);sync(true);persistSoon();});
  on(ui.strip,'click',e=>{const b=e.target.closest('.dr-gl');if(b)gotoChar(b.dataset.ch,true);});
  on(ui.tools,'click',e=>{const b=e.target.closest('[data-tool]');if(b)setTool(b.dataset.tool);});
  on(ui.undo,'click',undo);on(ui.redo,'click',redo);on(ui.clr,'click',clearAll);
  on(ui.mir,'click',e=>{if(D.tool==='select'&&selAll().length&&XFC&&!ui.mir.closest('.dr-pill'))XFC.flip(e.shiftKey);else mirrorAll(e.shiftKey);});
  on(ui.from,'click',()=>{if(!ui.pop.hidden){ui.pop.hidden=true;return;}
    const L=savedList().filter(c=>c!==cur.ch);ui.pop.innerHTML=L.length?L.map(c=>'<button type="button" data-c="'+esc(c)+'">'+esc(c)+'</button>').join(''):'<span class="dr-empty">Пока пусто. Самое время нарисовать первую букву</span>';ui.pop.hidden=false;});
  on(ui.pop,'click',e=>{const b=e.target.closest('[data-c]');if(b){copyFrom(b.dataset.c);ui.pop.hidden=true;}});
  on(ui.gh,'click',()=>{D.ghost=!D.ghost;sync();persistSoon();});
  on(ui.th,'click',()=>{const dark=effDark();D.cv=dark?'light':'dark';applyTheme();persistSoon();});
  on(ui.sv,'click',()=>saveGlyph());
  ui.root.querySelectorAll('.pane-h').forEach(h=>on(h,'click',()=>{if(h.getAttribute('aria-expanded')==='true'){if(h.id==='dr-ph-recs')analyze();sync(false);}}));
  /* ящик у рейла открыт на «Рекомендациях»: то же, что раскрытие панели (пересчёт подсказок) */
  /* FX80 C09: на телефоне лист — половина экрана; при открытии холст подтягивается в видимую часть над листом */
  window.addEventListener('dw:open',()=>{try{if(ui.side&&ui.side.dataset.open==='1'&&window.matchMedia('(max-width:720px)').matches&&ui.mid)setTimeout(()=>ui.mid.scrollIntoView({block:'start',behavior:'auto'}),0);}catch(e){}});
  window.addEventListener('dw:open',()=>{if(D.mounted&&ui.side&&ui.side.dataset.open==='1'&&ui.side.dataset.sec==='recs'){analyze();sync(false);}else if(D.mounted&&ui.side&&ui.side.dataset.open==='1'&&ui.side.dataset.sec==='spk'){AKC.pv='';sync(false);}});
  on(ui.gtog,'click',()=>setGC(ui.root.querySelector('.dr-g').getAttribute('data-gc')!=='1'));
  on(ui.testb,'click',openTest);on(ui.fontb,'click',openFont);on(ui.shareb,'click',()=>{if(FONTS.imp&&window.SHARE)SHARE.open('imp',D.name||FONTS.imp.name);});
  on(ui.cv,'pointerdown',onDown);on(ui.cv,'pointermove',onMove);on(ui.cv,'pointerup',onUp);on(ui.cv,'pointercancel',onUp);on(ui.cv,'dblclick',onDbl);
  on(ui.cv,'pointerleave',()=>{cur.hover=null;cur.hc=null;redraw();});
  on(ui.cv,'contextmenu',e=>e.preventDefault());
  on(ui.opt,'click',e=>{const b=e.target.closest('[data-sh],[data-er],[data-act],[data-cm]');if(!b)return;
    if(b.dataset.cm){D.cmode=b.dataset.cm;persistSoon();}
    else if(b.dataset.act==='cclr'){cellClear();return;}
    else if(b.dataset.act==='cshow'){D.cshow=!D.cshow;persistSoon();}
    else if(b.dataset.sh){D.shape=b.dataset.sh;}else if(b.dataset.er){D.er=b.dataset.er;}
    else if(b.dataset.act==='flip'){D.flip=!D.flip;}
    else if(b.dataset.act==='sub'&&cur.sel>=0){pushUndo('Вычитание');const sa=selAll(),to=cur.items[cur.sel].k==='sub'?'add':'sub';for(const i of sa)cur.items[i].k=to;markDirty();}
    else if(b.dataset.act==='dup'&&cur.sel>=0){dupSel();}
    else if(b.dataset.act==='del'&&cur.sel>=0){delSel();}
    sync();});
  on(ui.opt,'input',e=>{if(e.target.id==='dr-csz'){cellGesture();cellSet({size:+e.target.value});const o=ui.opt.querySelector('output');if(o)o.textContent=D.cs.size;const q=ui.cl.querySelector('#dr-cz');if(q){q.value=D.cs.size;q.closest('.dr-row').querySelector('output').textContent=D.cs.size;}return;}
  if(e.target.id==='dr-w'){D.w=+e.target.value;const o=ui.opt.querySelector('output');if(o)o.textContent=D.w;persistSoon();}});
  on(ui.pg,'click',e=>{const b=e.target.closest('[data-g],[data-cvm]');if(!b)return;
    if(b.dataset.g){commitCur(true);D.grid=b.dataset.g;cur.cols=D.grid==='tile'?D.gp.tile.rows:(D.g[cur.ch]&&D.g[cur.ch].cols)||D.gp[D.grid].cols;sync();persistSoon();}
    else{D.cv=b.dataset.cvm;applyTheme();persistSoon();}});
  on(ui.pg,'input',e=>{const t=e.target,gp=D.gp[D.grid];
    if(t.id==='dr-rows'){gp.rows=+t.value;if(D.grid==='tile'){gp.cols=gp.rows;cur.cols=gp.rows;}}
    else if(t.id==='dr-cols'){gp.cols=+t.value;cur.cols=gp.cols;cur.dirty=true;}
    else if(t.id==='dr-snap'){D.snap=t.checked;}else if(t.id==='dr-ghs'){D.ghost=t.checked;}else if(t.id==='dr-nbs'){D.nbr=t.checked;}
    else return;
    const o=t.parentNode&&t.parentNode.querySelector&&t.closest('.dr-row')&&t.closest('.dr-row').querySelector('output');if(o)o.textContent=t.value;
    redraw();persistSoon();});
  on(ui.cn,'click',e=>{const b=e.target.closest('[data-cact],[data-cg]');if(!b)return;
    if(b.dataset.cg){gotoChar(b.dataset.cg);return;}
    const a=b.dataset.cact;if(a==='draft')makeDraft();else if(a==='mkdraft')makeMarkDraft();else if(a==='detach')detach();else if(a==='resetanc')resetAnc();});
  on(ui.cn,'input',e=>{const t=e.target;if(t.id==='dr-poly'){D.poly=t.checked;redraw();persistSoon();}else if(t.id==='dr-anc'){D.anc=t.checked;redraw();persistSoon();}});
  on(ui.note,'click',e=>{const b=e.target.closest('[data-cact]');if(!b)return;const a=b.dataset.cact;if(a==='draft')makeDraft();else if(a==='mkdraft')makeMarkDraft();else if(a==='detach')detach();});
  on(ui.aksp,'click',()=>{if(!savedList().length){toast('Сначала сохраните хотя бы один знак');return;}akSetSp(true,'Авто-интервалы');});
  on(ui.aksw,'change',()=>akSetSp(ui.aksw.checked,ui.aksw.checked?'Авто-интервалы':'Интервалы: исходные'));
  on(ui.akk,'click',()=>{if(savedList().length<2){toast('Для кернинга нужно хотя бы две буквы');return;}akSetKern(true,'Авто-кернинг');});
  on(ui.akkw,'change',()=>akSetKern(ui.akkw.checked,ui.akkw.checked?'Авто-кернинг':'Кернинг: выключен'));
  on(ui.aks,'input',()=>{ui.akso.textContent=ui.aks.value+' %';akPaint(+ui.aks.value);});
  on(ui.aks,'change',()=>akSetStr(ui.aks.value));
  on(ui.akt,'input',()=>akPaint());
  on(ui.pr,'click',e=>{const b=e.target.closest('[data-fix],[data-go],[data-chk]');if(!b)return;
    if(b.dataset.fix)applyFix(b.dataset.fix);else if(b.dataset.go)gotoChar(b.dataset.go);else{analyze();sync();}});
  /* окна */
  on(ui.mtx,'click',closeTest);on(ui.mtc,'click',closeTest);on(ui.mfx,'click',()=>ui.mf.hidden=true);on(ui.mfc,'click',()=>ui.mf.hidden=true);
  on(ui.mtf,'click',()=>{closeTest();openFont();});
  on(ui.mt,'pointerdown',e=>{if(e.target===ui.mt)closeTest();});on(ui.mf,'pointerdown',e=>{if(e.target===ui.mf)ui.mf.hidden=true;});
  smpAttach('dr',{cv:ui.tc,box:ui.tt,ta:ui.tx,multi:true,max:3000,on:()=>!ui.mt.hidden});on(ui.tx,'input',renderTest);on(ui.ts,'input',()=>{ui.tso.textContent=ui.ts.value;renderTest();});
  on(ui.pg2,'click',e=>{const b=e.target.closest('button');if(!b)return;ui.tx.value=PANGR[b.dataset.p];renderTest();});
  on(ui.tth,'click',()=>{setTT(!ui.tt.classList.contains('dk'));renderTest();});
  on(ui.nm,'input',()=>{const raw=ui.nm.value,t=nameStrip(raw),a=Array.from(t);nameHint(raw);const v=a.length>NAME_MAX?a.slice(0,NAME_MAX).join(''):t;if(v!==raw)ui.nm.value=v;});
  on(ui.mfo,'click',()=>{const nm=cleanName(ui.nm.value)||'Мой шрифт';D.name=nm;if(buildFont(D.name)){ui.mf.hidden=true;}});
  /* размер */
  if(window.ResizeObserver){new ResizeObserver(()=>{if(D.mounted){draw();}}).observe(ui.mid);}
  window.addEventListener('resize',()=>redraw());
  new MutationObserver(()=>{if(D.mounted){D.col=null;redraw();syncTheme();}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});}
const effDark=()=>D.cv==='dark'||(D.cv==='auto'&&document.documentElement.getAttribute('data-theme')==='dark');
function setGC(c){ui.root.querySelector('.dr-g').setAttribute('data-gc',c?'1':'0');ui.gtog.setAttribute('aria-expanded',c?'false':'true');try{localStorage.setItem('gt-dr-gc',c?'1':'0');}catch(e){}setTimeout(()=>{if(D.mounted){draw();}},230);}
function applyTheme(){ui.root.setAttribute('data-cv',D.cv);D.col=null;syncTheme();redraw();if(ui.pg)sync();}
function syncTheme(){if(!ui.th)return;const d=effDark();ui.th.innerHTML=ic(d?'sun':'moon');ui.th.title=d?'Светлый холст':'Тёмный холст';}
function setTool(t){if(cur.pen&&t!=='pen'){penFinish(false);}P=null;const was=D.tool;D.tool=t;cur.hover=null;cur.hc=null;autoGrid();
  if(was==='cells'&&t!=='cells'&&typeof dwSec==='function'&&dwSec('draw')==='cells'&&typeof dwClose==='function')dwClose('draw');
  sync();persistSoon();
  if(t==='cells'&&was!=='cells'&&!D.copened&&typeof dwOpen==='function'&&innerWidth>1060){D.copened=true;dwOpen('draw','cells');}}
function dupSel(){if(cur.sel<0)return;pushUndo('Дубликат');const d=cellOr(),made=[];
  for(const i of selAll()){const it=jc(cur.items[i]);
    it.cs=drnMove(it.cs,d,-d*0);if(it.pen)for(const n of it.pen.nodes){n.x+=d;if(n.a)n.a.x+=d;if(n.b)n.b.x+=d;}
    cur.items.push(it);made.push(cur.items.length-1);}
  setSel(made);markDirty();sync();}
function delSel(){if(cur.sel<0)return;pushUndo('Удаление');const sa=selAll().sort((a,b)=>b-a);for(const i of sa)cur.items.splice(i,1);cur.sel=-1;cur.grp=[];markDirty();sync();}
/* ---------------- перерисовка панелей ---------------- */
function thumb(ch){const r=R(ch);if(!r||!r.cs)return '';
  if(r._th&&r._thc===r.cs)return r._th;r._thc=r.cs;
  const b=impBBox(r.cs)||{x0:0,y0:0,x1:500,y1:700},w=b.x1-b.x0,h=b.y1-b.y0,m=Math.max(w,h)*0.5,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2;
  return r._th='<svg class="th" viewBox="'+(cx-m).toFixed(0)+' '+(-cy-m).toFixed(0)+' '+(2*m).toFixed(0)+' '+(2*m).toFixed(0)+'" preserveAspectRatio="xMidYMid meet"><path transform="scale(1,-1)" d="'+drnPathD(r.cs)+'" fill-rule="nonzero"/></svg>';}
function renderStrip(){
  const L=chars();let h='';
  for(const ch of L){const sv=isSaved(ch),cm=!sv&&!!comp(ch),dr=!sv&&!cm&&D.g[ch]&&D.g[ch].items.length,mi=drnMarkInfo(ch);
    const nm=mi?mi[1]:ch;
    h+='<button type="button" class="dr-gl'+(ch===cur.ch?' cur':'')+(dr?' draft':'')+(cm?' cmp':'')+'" data-ch="'+esc(ch)+'" role="option" title="'+esc(nm)+(sv?' — нарисован':cm?' — составной: '+comp(ch).base+' + '+comp(ch).mark:dr?' — черновик, ещё не сохранён':'')+'" aria-label="Знак '+esc(nm)+(sv?', нарисован':cm?', составной':dr?', черновик':'')+'" aria-selected="'+(ch===cur.ch)+'">'+(sv||cm?'<span class="lt">'+esc(ch)+'</span>'+thumb(ch)+(cm?'<span class="cm" title="составной" aria-hidden="true">'+ic('plus',11)+'</span>':'<span class="ok">'+ic('check',11)+'</span>'):esc(ch))+'</button>';}
  ui.strip.innerHTML=h;
  const c=ui.strip.querySelector('.cur');if(c&&c.scrollIntoView&&D.shown)try{c.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}
function setMenu(on){ui.sets.hidden=!on;ui.setb.setAttribute('aria-expanded',on?'true':'false');
  if(on){const c=ui.sets.querySelector('.on')||ui.sets.querySelector('button');if(c)c.focus({preventScroll:true});}}
/* кнопка действия, которая пока недоступна, не серая, а скрыта; при появлении коротко выезжает (--dur-base, ease-out) */
function actVis(b,on,extra){if(!b)return;const was=b.dataset.v;if(was===(on?'1':'0'))return;b.dataset.v=on?'1':'0';
  for(const e of [b].concat(extra||[])){e.hidden=!on;if(on&&was!==undefined){e.classList.remove('dr-in');void e.offsetWidth;e.classList.add('dr-in');}}}
function renderTop(){
  const cntOf=k=>{const l=Array.from(SETS[k].s);return [l.filter(isSaved).length,l.length];};
  const mh=Object.keys(SETS).map(k=>{const c=cntOf(k);return '<button type="button" role="option" data-s="'+k+'" class="'+(k===D.set?'on':'')+'" aria-selected="'+(k===D.set)+'"'+(SETS[k].t?' title="'+esc(SETS[k].t)+'"':'')+'><span>'+SETS[k].n+'</span><em>'+c[0]+' из '+c[1]+'</em></button>';}).join('');
  if(ui.sets.dataset.k!==mh){ui.sets.innerHTML=mh;ui.sets.dataset.k=mh;}
  ui.setn.textContent=SETS[D.set].n;
  const L=chars(),n=L.filter(isSaved).length,cn=L.filter(c=>!isSaved(c)&&comp(c)).length;{const t=n+' из '+L.length+(cn?' · составных '+cn:'');window.MO&&MO.num?MO.num(ui.prog,t):ui.prog.textContent=t;}
  ui.setb.style.setProperty('--p',(L.length?Math.round(100*n/L.length):0)+'%');
  const has=savedList().length>0;
  ui.fontb.disabled=!has;ui.testb.disabled=!has;ui.shareb.disabled=!FONTS.imp;
  actVis(ui.testb,has);actVis(ui.fontb,has,[ui.root.querySelector('.dm-qb')].filter(Boolean));actVis(ui.shareb,!!FONTS.imp);
  if(FONTS.imp&&S.fontId==='imp'&&window.SHARE&&SHARE.warm)SHARE.warm('imp',D.name||FONTS.imp.name);/* Stage 4A: кнопка «Поделиться» включена: постер собирается заранее, в простое */
  const cnt=D.recs.filter(r=>r.fix).length;ui.recn.hidden=!cnt;ui.recn.textContent=cnt;}
function toolBtns(){const tn=TOOLS.find(t=>t[0]===D.tool);if(ui.tlab&&tn&&ui.tlab.textContent!==tn[1]){ui.tlab.textContent=tn[1];ui.tlab.style.minWidth='';ui.tlab.style.minWidth=Math.ceil(ui.tlab.getBoundingClientRect().width)+'px';}/* whole pixels: the options row starts on a pixel boundary */ui.tools.innerHTML=TOOLS.map(([k,n,h])=>'<button type="button" class="dr-ib'+(D.tool===k?' on':'')+'" data-tool="'+k+'" data-tip="'+n+' ('+h+')" aria-label="'+n+'" aria-pressed="'+(D.tool===k)+'">'+ic(k==='erase'?'eraser':k)+'</button>').join('');}
function shapeChips(attr,cur_){return SHAPES.map(([k,n])=>'<button type="button" class="dr-ib'+(cur_===k?' on':'')+'" data-'+attr+'="'+k+'" data-tip="'+n+'" aria-label="'+n+'">'+ic(k)+'</button>').join('');}
function renderOpt(){
  const t=D.tool;let h='';
  const wsl='<span class="hint">Толщина</span><input id="dr-w" type="range" min="8" max="200" value="'+D.w+'" aria-label="Толщина штриха"><output>'+D.w+'</output>';
  if(t==='pen')h='<span class="hint">Клик — угол, протяжка — кривая, первая точка — замкнуть</span>';
  else if(t==='shape')h=shapeChips('sh',D.shape)+(D.shape==='tri'?'<button type="button" class="dr-ib'+(D.flip?' on':'')+'" data-act="flip" data-tip="Другая половина ячейки" aria-label="Другая половина">'+ic('flip')+'</button>':'');
  else if(t==='brush'||t==='marker')h=wsl;
  else if(t==='erase')h='<button type="button" class="dr-ib'+(D.er==='stroke'?' on':'')+'" data-er="stroke" data-tip="Штрих" aria-label="Штрих">'+ic('eraser')+'</button>'+shapeChips('er',D.er)+(D.er==='stroke'?wsl:'');
  else if(t==='select'){const s=cur.sel>=0;h='<button type="button" class="dr-ib" data-act="sub" '+(s?'':'disabled ')+'data-tip="Вычитать / добавлять" aria-label="Вычитать">'+ic('eraser')+'</button><button type="button" class="dr-ib" data-act="dup" '+(s?'':'disabled ')+'data-tip="Дублировать" aria-label="Дублировать">'+ic('dup')+'</button><button type="button" class="dr-ib" data-act="del" '+(s?'':'disabled ')+'data-tip="Удалить (Delete)" aria-label="Удалить">'+ic('trash')+'</button>'+'<span class="hint">'+(s?'Ручки — размер, форма, поворот · Shift — добавить фигуру':'Нажмите на фигуру или обведите рамкой')+'</span>';}
  else if(t==='cells'){const er=D.cmode==='erase';
    h='<button type="button" class="dr-ib'+(er?'':' on')+'" data-cm="draw" data-tip="Карандаш: заливает ячейки" aria-label="Карандаш" aria-pressed="'+!er+'">'+ic('pen')+'</button><button type="button" class="dr-ib'+(er?' on':'')+'" data-cm="erase" data-tip="Ластик: очищает ячейки (Shift — наоборот)" aria-label="Ластик" aria-pressed="'+er+'">'+ic('eraser')+'</button><button type="button" class="dr-ib" data-act="cclr" '+(curCell()?'':'disabled ')+'data-tip="Очистить слой" aria-label="Очистить слой">'+ic('trash')+'</button><button type="button" class="dr-ib'+(D.cshow?' on':'')+'" data-act="cshow" data-tip="Показать сетку" aria-label="Показать сетку" aria-pressed="'+D.cshow+'">'+ic('gridv')+'</button><span class="hint">Размер</span><input id="dr-csz" type="range" min="1" max="7" value="'+D.cs.size+'" aria-label="Размер кисти, ячеек"><output>'+D.cs.size+'</output>';}
  if(ui.opt.dataset.k!==h){ui.opt.innerHTML=h;ui.opt.dataset.k=h;}}
function renderGridPane(){
  const gp=D.gp[D.grid],tile=D.grid==='tile',none=D.grid==='none';
  let h='<div class="dr-sec"><div class="dr-pills" role="group" aria-label="Сетка">'+Object.keys(GRIDS).filter(k=>k!=='cell').map(k=>'<button type="button" data-g="'+k+'" class="'+(k===D.grid?'on':'')+'" aria-pressed="'+(k===D.grid)+'">'+GRIDS[k].n+'</button>').join('')+'</div>';
  if(!none)h+='<div class="dr-row"><label for="dr-rows">'+(tile?'Делений на сторону':'Ячеек по высоте')+' <output>'+gp.rows+'</output></label><input id="dr-rows" type="range" min="'+(tile?2:3)+'" max="'+(tile?8:24)+'" value="'+gp.rows+'"></div>';
  if(!tile)h+='<div class="dr-row"><label for="dr-cols">Ширина знака, ячеек <output>'+cur.cols+'</output></label><input id="dr-cols" type="range" min="2" max="24" value="'+cur.cols+'"></div>';
  h+='<label class="dr-sw">Привязка к сетке<input type="checkbox" id="dr-snap"'+(D.snap?' checked':'')+'><i></i></label>'
   +'<label class="dr-sw">Образец буквы<input type="checkbox" id="dr-ghs"'+(D.ghost?' checked':'')+'><i></i></label>'
   +'<label class="dr-sw">Соседние знаки<input type="checkbox" id="dr-nbs"'+(D.nbr?' checked':'')+'><i></i></label>'
   +'<div class="dr-row"><span class="lb">Холст</span><div class="dr-pills">'+[['auto','Как в приложении'],['light','Светлый'],['dark','Тёмный']].map(([k,n])=>'<button type="button" data-cvm="'+k+'" class="'+(D.cv===k?'on':'')+'">'+n+'</button>').join('')+'</div></div></div>';
  if(ui.pg.dataset.k!==h){const a=document.activeElement;const keep=a&&ui.pg.contains(a)&&a.id;ui.pg.innerHTML=h;ui.pg.dataset.k=h;if(keep){const n=ui.pg.querySelector('#'+keep);if(n)n.focus();}}}
/* панель «Интервалы и кернинг»: состояние переключателей, подписи, сравнение «без кернинга / с кернингом» */
function akText(){const t=ui.akt.value;return t.trim()?t:(D.set==='lat'?'AVATAR TOWER PLAY.':'АТАКА ТОВАР ПОЛЯ.');}
function akPaint(sOv){
  const c=ui.akpv;if(!c||!D.mounted)return;
  const host=c.parentNode,W=Math.max(160,Math.floor(host.clientWidth||260)),dpr=Math.min(2,window.devicePixelRatio||1),dk=effDark();
  const text=akText(),two=savedList().length>=2,kn=two?akKern(true,sOv):null;
  const key=text+'#'+W+'#'+dk+'#'+dpr+'#'+(kn?AKC.kn.k:'-')+'#'+(sOv!=null?sOv:'');
  if(AKC.pv===key)return;AKC.pv=key;
  const info={},inf=ch=>{if(ch in info)return info[ch];const r=R(ch);if(!r||!r.cs||!r.cs.length){info[ch]=null;return null;}
    const bb=impBBox(r.cs);if(!bb){info[ch]=null;return null;}const sp=spOf(ch);return info[ch]={r,ox:sp.l-bb.x0,w:(bb.x1-bb.x0)+sp.l+sp.r};};
  const run=useK=>{let x=0,pv='';const it=[];for(const ch of Array.from(text)){const a=inf(ch);if(useK&&pv&&kn&&a)x+=kn.pair(pv,ch);it.push({ch,a,x});x+=a?a.w:(ch===' '?280:550);pv=a?ch:'';}return {it,w:x};};
  const r0=run(false),r1=run(true),pad=12,lab=18,s=Math.min(0.045,(W-pad*2)/Math.max(r0.w,r1.w,400)),row=lab+Math.round(980*s),H=pad*2+row*2;
  c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);c.style.width='100%';c.style.height=H+'px';
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const rs=getComputedStyle(ui.root),tok=n=>rs.getPropertyValue(n).trim();
  ctx.fillStyle=tok('--dr-paper')||'#fff';ctx.fillRect(0,0,W,H);
  const ink=tok('--dr-ink')||'#141416';
  [[r0,'без кернинга'],[r1,two?'с кернингом':'нужно две буквы']].forEach(([r,lb],i)=>{
    const by=pad+i*row+lab+Math.round(760*s);
    ctx.globalAlpha=.72;ctx.fillStyle=ink;ctx.font='500 12px Onest,system-ui,sans-serif';ctx.textBaseline='alphabetic';ctx.fillText(lb,pad,pad+i*row+12);ctx.globalAlpha=1;
    for(const g of r.it){if(!g.a)continue;ctx.save();ctx.translate(pad+(g.x+g.a.ox)*s,by);ctx.scale(s,-s);ctx.fillStyle=ink;ctx.fill(gpath(g.a.r),'nonzero');ctx.restore();}});}
function renderSpk(){
  if(!ui.aksp)return;
  ui.akt.placeholder=D.set==='lat'?'AVATAR TOWER PLAY.':'АТАКА ТОВАР ПОЛЯ.';/* FX80 C10: образец по умолчанию виден как подсказка */
  const L=savedList().filter(ch=>!drnMarkInfo(ch)),n=L.length,o=D.ak.sp?optSp():null;
  ui.aksw.checked=!!D.ak.sp;ui.aksw.disabled=!n&&!D.ak.sp;
  ui.aksp.textContent=D.ak.sp?'Пересчитать интервалы':'Рассчитать интервалы';ui.aksp.disabled=!n;
  ui.akkw.checked=!!D.ak.k;ui.akkw.disabled=n<2&&!D.ak.k;
  ui.akk.textContent=D.ak.k?'Пересчитать кернинг':'Рассчитать кернинг';ui.akk.disabled=n<2;
  if(document.activeElement!==ui.aks)ui.aks.value=D.ak.s;ui.akso.textContent=ui.aks.value+' %';
  if(!n)ui.aksi.textContent='Нарисуйте и сохраните несколько букв — поля посчитаются по их форме.';
  else if(D.ak.sp&&o){const q=o.sp['о']||o.sp['o'];ui.aksi.textContent='Рассчитано для '+Object.keys(o.sp).length+' знаков · прямая сторона '+o.ref.sbS+'\u00A0ед.'+(q?' · «о»\u00A0'+q.l+'/'+q.r+'\u00A0ед.':'');}
  else ui.aksi.textContent='Выключено: поля такие, как раньше.';
  if(n<2)ui.aksk.textContent='Для кернинга нужно хотя бы две нарисованные буквы.';
  else if(D.ak.k){const kn=akKern(false);ui.aksk.textContent=kn&&kn.n?'Классов с кернингом: '+kn.n+'. Попадёт в шрифт при сборке.':D.ak.s===0?'Сила кернинга 0 %: пары не меняются. Поднимите «Силу», чтобы кернинг заработал.':'Подходящих пар пока нет: нарисуйте больше букв (А, Т, В, О, Г…).';}
  else ui.aksk.textContent='Выключено: в шрифте только таблица пар по умолчанию.';
  akPaint();}
function renderRecs(){
  let h='<div class="dr-sec"><button type="button" class="dr-b" data-chk="1">Проверить набор</button>';
  if(!D.recs.length)h+='<p class="dr-empty">Замечаний нет. Сохраняйте знаки — подсказки появятся здесь.</p>';
  for(const r of D.recs){const go=r.id==='miss'?chars().find(c=>!hasG(c)&&c!==cur.ch):(r.go===cur.ch?null:r.go);/* FX80 C15: кнопка не ведёт к уже открытому знаку */
    h+='<div class="dr-rec" data-r="'+r.id+'"><p>'+esc(r.txt)+'</p>'+(r.fix?'<button type="button" class="dr-b pri" data-fix="'+r.id+'">Исправить</button>':go?'<button type="button" class="dr-b" data-go="'+esc(go)+'">Перейти к «'+esc(go)+'»</button>':'')+'</div>';}
  h+='</div>';if(ui.pr.dataset.k!==h){ui.pr.innerHTML=h;ui.pr.dataset.k=h;}}
function sync(strip){
  if(!D.mounted)return;
  if(strip!==false)renderStrip();renderTop();toolBtns();renderOpt();
  const po=k=>{const h=ui.root.querySelector('#dr-ph-'+k);return !h||h.getAttribute('aria-expanded')==='true';};
  const lg=document.getElementById('lg-draw');if(lg&&lg.parentNode!==ui.lgh)ui.lgh.appendChild(lg);
  ui.cpane.hidden=D.tool!=='cells';
  if(D.tool==='cells'&&po('cells'))renderCellsPane();
  if(po('grid'))renderGridPane();if(po('con'))renderCon();if(po('recs'))renderRecs();if(po('spk'))renderSpk();renderNote();
  ui.gcur.textContent=cur.ch||'';
  ui.undo.disabled=!cur.undo.length;ui.redo.disabled=!cur.redo.length;ui.clr.disabled=!cur.items.length;ui.mir.disabled=!cur.items.length;
  ui.gh.classList.toggle('on',D.ghost);ui.gh.setAttribute('aria-pressed',D.ghost);
  ui.sv.disabled=!cur.items.length&&!cur.pen;syncTheme();placeDock();redraw();}
/* ---------------- полиграмма, составные знаки ---------------- */
function makeDraft(){
  const ch=cur.ch,d=draftFor(ch);if(!d){toast('Нет исходных букв для заготовки «'+ch+'»');return;}
  pushUndo('Заготовка');cur.items=jc(d.items);cur.sel=-1;cur.pen=null;markDirty();sync();
  toast('Заготовка '+d.label+' — проверьте, поправьте и сохраните');}
function makeMarkDraft(){
  const ch=cur.ch,mi=drnMarkInfo(ch);if(!mi)return;
  const it=drnMarkDraft(ch,clamp(Math.round(stemMed()*0.45),30,64),Wd()/2,mi[4]==='b'?130:560);if(!it)return;
  pushUndo('Заготовка');cur.items=jc(it);cur.sel=-1;cur.pen=null;markDirty();sync();toast('Заготовка знака «'+mi[1]+'» — поправьте и сохраните');}
function detach(){
  const ch=cur.ch,c=isSaved(ch)?null:comp(ch);if(!c){return;}
  const cs=drnCp(c.cs),sp=spOf(ch);
  D.g[ch]={items:[{k:'add',t:'merged',cs:drnCp(cs)}],s:true,cs,cols:cur.cols,sp:{l:sp.l,r:sp.r}};
  loadCur(ch);D.built=false;analyze();persistNow();sync(true);toast('«'+ch+'» разобран: теперь это обычный знак');}
function resetAnc(){const t=ancTarget();if(!t||!D.g[t.ch])return;D.g[t.ch].anc=null;D.built=false;persistSoon();sync(false);}
function renderNote(){
  if(!ui.note)return;
  const ch=cur.ch,sv=isSaved(ch),mi=drnMarkInfo(ch);let h='',cls='dr-note';
  const c=!sv&&!cur.items.length?comp(ch):null;
  if(c)h='<span>Составной знак: '+esc(c.base)+' + '+esc(c.mark)+'. Меняется вместе с основой и знаком</span><button type="button" class="dr-b" data-cact="detach" title="Превратить в обычный знак, который можно править вручную">Разобрать</button>';
  else if(!sv&&cur.items.some(i=>i.t==='draft')){cls+=' draft';h='<span>Заготовка'+(DRN_REC[ch]?' из полиграммы':'')+': проверьте, поправьте и сохраните</span>';}
  else if(!sv&&!cur.items.length&&!cur.pen){
    const d=DRN_REC[ch]?draftFor(ch):null;
    if(d)h='<span>Можно начать с заготовки: '+esc(d.label).replace(/ → /g,'\u00A0→\u00A0')+'</span><button type="button" class="dr-b pri" data-cact="draft" title="Собрать первый вариант буквы из уже нарисованных">Создать заготовку</button>';
    else if(mi)h='<span>'+esc(mi[1])+(ch==='˘'?': концы толще середины':'')+'</span><button type="button" class="dr-b" data-cact="mkdraft" title="Нарисовать знак заготовкой, которую можно править">Заготовка знака</button>';}
  ui.note.className=cls;ui.note.hidden=!h;if(ui.note.dataset.k!==h){ui.note.innerHTML=h;ui.note.dataset.k=h;}}
function renderCon(){
  const ch=cur.ch,f=drnFamOf(ch),mem=polyMembers(ch),mi=drnMarkInfo(ch),dr=DRN_REC[ch]?draftFor(ch):null,sv=isSaved(ch),cm=!sv&&comp(ch);
  const chip=(c,extra)=>{const m=mem.find(x=>x.ch===c);return '<button type="button" data-cg="'+esc(c)+'" class="'+(isSaved(c)?'':'off')+(c===ch?' cur':'')+'" title="'+esc(c)+(isSaved(c)?' — нарисована':' — ещё не нарисована')+'" aria-label="'+esc(c)+'">'+esc(c)+(m&&D.poly?'<i style="background:'+m.tint+'"></i>':'')+'</button>';};
  let h='<div class="dr-sec"><h3 class="dr-h">Полиграмма</h3><p class="dr-hint">Буквы одной конструкции строятся по общей схеме. Контуры уже нарисованных букв семейства ложатся на холст бледными линиями.</p>'
    +'<label class="dr-sw">Накладывать полиграмму<input type="checkbox" id="dr-poly"'+(D.poly?' checked':'')+'><i></i></label>';
  if(f)h+='<div class="dr-row"><span class="lb">'+f.n+'</span></div><div class="dr-fam">'+Array.from(f.c).map(c=>chip(c)).join('')+'</div>';
  else if(DRN_REC[ch])h+='<div class="dr-row"><span class="lb">Строится из</span></div><div class="dr-fam">'+DRN_REC[ch][0].map(c=>chip(c)).join('')+'</div>';
  else h+='<p class="dr-hint">У знака «'+esc(mi?mi[1]:ch)+'» нет семейства в полиграмме.</p>';
  if(DRN_REC[ch]&&!sv)h+=dr?'<button type="button" class="dr-b pri" data-cact="draft">Заготовка из полиграммы: '+esc(dr.label)+'</button>':'<p class="dr-hint">Нарисуйте '+DRN_REC[ch][0].map(c=>'«'+esc(c)+'»').join(' или ')+' — получите заготовку для «'+esc(ch)+'».</p>';
  h+='<h3 class="dr-h">Диакритика</h3><p class="dr-hint">Нарисуйте знак отдельно — буквы с ним (Й, Ё, Ў, Ï…) соберутся сами и обновятся, когда изменится основа или знак.</p>'
    +'<div class="dr-fam mk">'+DRN_MARKS.map(m=>'<button type="button" data-cg="'+esc(m[0])+'" class="'+(isSaved(m[0])?'':'off')+(m[0]===ch?' cur':'')+'" title="'+m[1]+(isSaved(m[0])?' — нарисован':' — ещё не нарисован')+'" aria-label="'+m[1]+'"><b class="mg">'+esc(m[0])+'</b> '+m[1]+'</button>').join('')+'</div>'
    +'<label class="dr-sw">Якоря на холсте<input type="checkbox" id="dr-anc"'+(D.anc?' checked':'')+'><i></i></label>'
    +'<p class="dr-hint">Ромбик — место крепления знака, сверху и снизу. Перетащите его, чтобы сдвинуть знак на всех составных буквах; двойной щелчок возвращает авторасчёт.</p>';
  const n=compCount();h+='<p class="dr-hint">Составных знаков: '+n+(n?'. Они помечены в списке значком «+».':'. Нарисуйте основу и знак — например, «И» и кратку — получите «Й» автоматически.')+'</p>';
  if(sv&&!drnMarkInfo(ch)&&D.g[ch].anc)h+='<button type="button" class="dr-b" data-cact="resetanc">Сбросить якоря знака</button>';
  if(cm)h+='<button type="button" class="dr-b" data-cact="detach">Разобрать «'+esc(ch)+'» в обычный знак</button>';
  if(mi&&!sv)h+='<button type="button" class="dr-b" data-cact="mkdraft">Заготовка знака «'+esc(mi[1])+'»</button>';
  h+='</div>';
  if(ui.cn.dataset.k!==h){const a=document.activeElement;const keep=a&&ui.cn.contains(a)&&a.id;ui.cn.innerHTML=h;ui.cn.dataset.k=h;if(keep){const x=ui.cn.querySelector('#'+keep);if(x)x.focus();}}}
/* ---------------- проверка шрифта ---------------- */
/* настоящий шрифт в памяти: свой минимальный сборщик (drnBuildTTF), текущий шрифт приложения не затрагивается */
let tf={key:'',ok:false,busy:false};
function testFont(){
  cellFlushAll();const L=allList(),sm=stemMed();
  const key=L.map(ch=>{const r=R(ch),sp=spOf(ch);return ch+r.cs.length+':'+Math.round((impBBox(r.cs)||{x1:0}).x1)+':'+sp.l+'/'+sp.r;}).join('|');
  if(key!==tf.key&&!tf.busy&&typeof FontFace==='function'){
    tf.key=key;tf.ok=false;tf.busy=true;
    try{const gl=L.map(ch=>{const r=R(ch),bb=impBBox(r.cs),sp=spOf(ch);return {uni:ch.codePointAt(0),adv:Math.round(sp.l+(bb.x1-bb.x0)+sp.r),cs:drnMove(drnCp(r.cs),sp.l-bb.x0,0)};});
      const bytes=drnBuildTTF(gl,'DrTestFont').bytes,f=new FontFace('DrTestFont',bytes.buffer);
      f.load().then(()=>{document.fonts.add(f);tf.ok=true;tf.busy=false;if(!ui.mt.hidden)renderTest();}).catch(()=>{tf.busy=false;});}
    catch(e){tf.busy=false;}}
  return tf.ok&&tf.key===key;}
function openTest(){
  if(!savedList().length){toast('Сохраните хотя бы один знак');return;}
  commitCur(true);setTT(effDark());
  ui.mt.hidden=false;ui.tso.textContent=ui.ts.value;renderTest();}
function setTT(dk){ui.tt.classList.toggle('dk',dk);ui.tt.style.setProperty('--dr-paper',drTok(dk?'--cvd-paper':'--cvl-paper'));ui.tth.innerHTML=ic(dk?'sun':'moon');}
function closeTest(){ui.mt.hidden=true;}
function renderTest(){
  if(ui.mt.hidden)return;
  const FF=testFont();
  const sz=+ui.ts.value,dk=ui.tt.classList.contains('dk'),raw=ui.tx.value,ph=!raw.trim(),text=ph?PANGR[D.set==='lat'?'en':D.set==='num'?'num':'ru']:raw,W=Math.max(200,ui.tt.clientWidth||600),s=sz/1000;
  const lh=sz*1.35,adv={},cs={};let lines=[],x=0,line=[];const pad=sz*0.3,maxX=W-pad*2;
  const info=ch=>{if(ch in adv)return adv[ch];const r=R(ch);if(!r){adv[ch]=null;return null;}
    const bb=impBBox(r.cs),sp=spOf(ch);adv[ch]={ox:sp.l-bb.x0,w:(bb.x1-bb.x0)+sp.l+sp.r};return adv[ch];};
  const fw=ch=>(ch===' '?0.28:0.55)*sz,kv=(a,b)=>D.ak.k?akPair(a,b)*s:0,wordsW=w=>{let t=0,pv='';for(const ch of w){const a=info(ch);t+=(pv&&a?kv(pv,ch):0)+(a?a.w*s:fw(ch));pv=a?ch:'';}return t;};
  for(const para of text.split('\n')){x=0;line=[];
    for(const word of para.split(/(\s+)/)){if(!word)continue;const ww=wordsW(word);
      if(x+ww>maxX&&line.length&&!/^\s+$/.test(word)){lines.push(line);line=[];x=0;}
      {let pv='';for(const ch of word){const a=info(ch),w=a?a.w*s:fw(ch);if(pv&&a)x+=kv(pv,ch);line.push({ch,a,x});x+=w;pv=a?ch:'';}}}
    lines.push(line);}
  const H=Math.max(160,Math.ceil(lines.length*lh+pad*1.4)),c=ui.tc,dpr=Math.min(2,window.devicePixelRatio||1);
  c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);c.style.width=W+'px';c.style.height=H+'px';
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=drTok(dk?'--cvd-paper':'--cvl-paper');ctx.fillRect(0,0,W,H);
  const ink=drTok(dk?'--cvd-ink':'--cvl-ink'),mut=drTok(dk?'--cvd-mut':'--cvl-mut');
  const RC=[];if(ph)ctx.globalAlpha=.4;/* пусто: образец по умолчанию приглушён */
  lines.forEach((ln,i)=>{const by=pad*0.4+sz*0.95+i*lh;
    for(const g of ln){RC.push({ch:g.ch,x0:pad+g.x,x1:pad+g.x+(g.a?g.a.w*s:fw(g.ch)),y0:by-sz*0.8,y1:by+sz*0.22});
      if(g.a&&FF){ctx.fillStyle=ink;ctx.font='400 '+sz+'px DrTestFont';ctx.fillText(g.ch,pad+g.x,by);}
      else if(g.a){ctx.save();ctx.translate(pad+g.x+g.a.ox*s,by);ctx.scale(s,-s);ctx.fillStyle=ink;ctx.fill(gpath(R(g.ch)),'nonzero');ctx.restore();}
      else if(g.ch.trim()){const w=fw(g.ch);ctx.save();ctx.strokeStyle=mut;ctx.globalAlpha=.55;ctx.setLineDash([4,3]);ctx.lineWidth=1;
        ctx.strokeRect(pad+g.x+2,by-sz*0.74,w-4,sz*0.96);ctx.restore();ctx.fillStyle=mut;ctx.font='500 '+sz*0.6+'px Onest,system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(g.ch,pad+g.x+w/2,by);ctx.textAlign='left';}}});
  ctx.globalAlpha=1;smpCommit('dr',[RC],ph?'':raw,{left:pad,line:{y0:pad*0.4+sz*0.95-sz*0.8,y1:pad*0.4+sz*0.95+sz*0.22},pitch:lh,spw:fw(' ')});}
/* ---------------- шрифт ---------------- */
/* FX80 C13: имя в nameID 1 — до 31 символа (старый предел name-таблицы), без символов, ломающих имя файла и разметку, и без эмодзи */
const NAME_MAX=31;
const nameStrip=v=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f\/\\:<>"|?*]/g,'').replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D\u20E3]/gu,'');
function cleanName(v){
  let t=nameStrip(v).replace(/\s+/g,' ').replace(/^[\s.]+/,'');
  const a=Array.from(t);if(a.length>NAME_MAX)t=a.slice(0,NAME_MAX).join('');
  return t.trim();}
function nameHint(raw){
  const h=ui.root&&ui.root.querySelector('#dr-nmh');if(!h)return;
  raw=String(raw||'');const cut=Array.from(nameStrip(raw)).length>NAME_MAX,bad=nameStrip(raw)!==raw;
  h.textContent=bad?'Убраны символы / \\ : < > и эмодзи — в названии шрифта они не работают.':cut?'Название обрезано до '+NAME_MAX+' символов: так его читают все программы.':'Не длиннее '+NAME_MAX+' символов, без / \\ : < > и эмодзи.';
  h.classList.toggle('warn',bad||cut);}
function tinyGlyphs(){/* знаки, чей рисунок меньше пятой части высоты прописной: при сборке такие растягивают до размера буквы */
  const out=[];for(const ch of savedList()){if(drnMarkInfo(ch))continue;const z=impCat(ch).z;if(z==='pun'||z==='sym'||z==='idot'||z==='jdot'||z==='mark')continue;
    const bb=impBBox(D.g[ch].cs);if(bb&&Math.max(bb.x1-bb.x0,bb.y1-bb.y0)<DRN.cap*0.2)out.push(ch);}
  return out;}
function openFont(){
  cellFlushAll();if(!savedList().length){toast('Сначала сохраните хотя бы один знак');return;}
  commitCur(true);ui.nm.value=cleanName(D.name)||'Мой шрифт';nameHint(ui.nm.value);
  const fc=foreignCount(),few=savedList().length<3,tn=tinyGlyphs();
  ui.mfi.textContent='Знаков в шрифте: '+allList().length+'. Он откроется в редакторе, где доступны параметры, кернинг, сверка и скачивание.'+(few?' Нарисовано мало знаков: в шрифте будут только они, без остальных букв, цифр и знаков. Дорисовать можно позже.':'')+(tn.length?' Очень мелкие знаки ('+tn.slice(0,6).map(c=>'«'+c+'»').join(' ')+') при сборке растянут до размера буквы — увеличьте их, если это не точка.':'')+(fc?' В «Собрать из своих знаков» уже загружено знаков: '+fc+' — они будут заменены нарисованными.':'');
  ui.mfo.querySelector('span').textContent=fc?'Заменить и создать шрифт':'Создать шрифт';
  ui.mf.hidden=false;setTimeout(()=>ui.nm.focus(),30);}
function foreignCount(){return typeof IMP==='undefined'?0:Object.keys(IMP.glyphs).filter(c=>IMP.glyphs[c]&&IMP.glyphs[c].c&&IMP.glyphs[c].c.length&&IMP.glyphs[c].src!=='draw').length;}
function buildFont(name){
  if(typeof iuRegisterNow!=='function'||typeof IMP==='undefined'){toast('Сборка пока недоступна. Перезагрузите страницу и попробуйте снова');return false;}
  cellFlush();cellFlushAll();commitCur(true);
  const L=allList();if(!L.length)return false;
  for(const k of Object.keys(IMP.glyphs))delete IMP.glyphs[k];
  const sm=stemMed(),SP={},KEY={};
  /* знаки диакритики идут в шрифт как комбинируемые (U+0300…), составные буквы — как обычные знаки с контурами */
  for(const ch of L){const r=R(ch),mi=drnMarkInfo(ch),key=mi?mi[3]:ch,cs=drnMove(drnCp(r.cs),0,DRN.OFF),bb=impBBox(cs);if(!bb)continue;
    if(isSaved(ch)){r.sp=r.sp||drnAutoSp(r.cs,sm)||{l:50,r:50};}
    SP[ch]=spOf(ch);KEY[ch]=key;
    IMP.glyphs[key]={c:cs,bb,k:1,src:'draw',adj:null,v:++IMP.ver};}
  IMP.family=name;IMP.ver++;
  /* оптические поля -> adj.l/adj.r (сверх общего поля шрифта sb), они сохраняются вместе с проектом */
  try{impNormalize();const sb0=(IMP.dflt&&IMP.dflt.regular&&IMP.dflt.regular.sb)||50;
    for(const ch of L){const g=IMP.glyphs[KEY[ch]],sp=SP[ch];if(!g||!sp)continue;
      const l=Math.max(-sb0+6,sp.l-sb0),rr=Math.max(-sb0+6,sp.r-sb0);if(l||rr)g.adj={l:Math.round(l),r:Math.round(rr)};}
    IMP.ver++;}catch(e){}
  try{iuRegisterNow();if(S.fontId!=='imp')switchFont('imp');
    /* Причина: движок (finalGlyph/opticalSB) ставит чернила знака на оптическое поле шрифта и игнорирует adj.l/adj.r, вшитые в контур, —
       построенный шрифт получал 47/47 вместо рекомендованных 104/104. Рекомендованные поля пишутся правками знака sbL/sbR (разница к тому, что даёт движок). */
    try{const st=S.styles.regular;S.edits=S.edits||{};
      for(const ch of L){const key=KEY[ch],sp=SP[ch];if(!key||!sp||!GL[key])continue;
        const g=finalGlyph(key,st,{});if(!g||!g.cs||!g.cs.length)continue;
        let x0=1e9,x1=-1e9;for(const c of g.cs)for(const q of flatC(c,8)){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}
        if(x0>x1)continue;
        const dl=Math.round(sp.l-x0),dr=Math.round(sp.r-(g.adv-x1));
        const E=S.edits[key]||(S.edits[key]={});
        if(dl)E.sbL=dl;else delete E.sbL;if(dr)E.sbR=dr;else delete E.sbR;
        if(!Object.keys(E).length)delete S.edits[key];}
      try{akApplyKern();}catch(e){console.warn('autokern',e&&e.message);}
      cache.clear();if(typeof GCACHE!=='undefined')GCACHE.clear();if(typeof syncPanel==='function')syncPanel();bump();}catch(e){}
    if(typeof iuClose==='function')iuClose();setTab('edit');}catch(e){toast('Не удалось собрать шрифт. Проверьте знаки и попробуйте ещё раз');return false;}
  try{if(S.lib&&S.lib.imp)S.lib.imp.family=name;if(S.fontId==='imp'){S.family=name;if(typeof buildLibrary==='function')buildLibrary();if(typeof shellHead==='function')shellHead();}}catch(e){}
  toast('Шрифт «'+name+'» создан — буквы заняли свои места');D.built=true;persistNow();sync();return true;}
/* ---------------- клавиатура ---------------- */
function typing(t){return t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&t.type!=='range'&&t.type!=='checkbox';}
function onKey(e){
  if(!D.mounted||!D.shown||!ui.root||!ui.root.getClientRects().length)return;
  const t=e.target,k=e.key,low=k.length===1?k.toLowerCase():k;
  if(!ui.mt.hidden||!ui.mf.hidden){if(k==='Escape'){closeTest();ui.mf.hidden=true;}return;}
  if(typing(t))return;
  if((e.ctrlKey||e.metaKey)&&!e.altKey){
    if(low==='z'||low==='я'){e.preventDefault();e.stopImmediatePropagation();e.shiftKey?redo():undo();return;}
    if(low==='y'||low==='н'){e.preventDefault();e.stopImmediatePropagation();redo();return;}
    if(low==='d'||low==='в'){e.preventDefault();dupSel();return;}
    if((low==='a'||low==='ф')&&D.tool==='select'&&cur.items.length){e.preventDefault();selectAll();return;}
    return;}
  if(e.altKey||e.metaKey)return;
  if(k==='Enter'){e.preventDefault();if(cur.pen&&cur.pen.nodes.length>=3&&!e.shiftKey){penFinish(false);sync();return;}saveGlyph();return;}
  if(XFC&&XFC.key(e))return;
  if(k==='Escape'){if(cur.pen){cur.pen=null;redraw();}else if(cur.sel>=0){cur.sel=-1;sync();}ui.pop.hidden=true;return;}
  if(k==='Backspace'&&cur.pen){e.preventDefault();cur.pen.nodes.pop();if(!cur.pen.nodes.length)cur.pen=null;redraw();return;}
  if(k==='Delete'||k==='Backspace'){if(cur.sel>=0){e.preventDefault();delSel();}return;}
  if(k.startsWith('Arrow')){
    if(t&&t.type==='range')return;
    if(cur.sel>=0&&D.tool==='select'){e.preventDefault();const c=D.snap&&D.grid!=='none'?cell():(e.shiftKey?10:1),d={ArrowLeft:[-c,0],ArrowRight:[c,0],ArrowUp:[0,c],ArrowDown:[0,-c]}[k];
      xfDraw().nudge(d[0],d[1]);return;}
    const L=chars(),i=L.indexOf(cur.ch),step=k==='ArrowLeft'||k==='ArrowUp'?-1:1;
    if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();const j=clamp(i+step,0,L.length-1);gotoChar(L[j],true);}
    return;}
  if((k==='='||k==='+')&&!e.ctrlKey){e.preventDefault();setTool('cells');return;}/* «7» снова ведёт к знаку «7» */
  const ti=['1','2','3','4','5','6'].indexOf(k);
  if(ti>=0&&!e.shiftKey){e.preventDefault();setTool(TOOLS[ti][0]);return;}
  if(k==='['||k===']'){D.w=clamp(D.w+(k===']'?6:-6),8,200);renderOpt();persistSoon();return;}
  if(k.length===1&&/\S/.test(k)&&!e.ctrlKey){
    const all=[k,k.toUpperCase(),k.toLowerCase()];
    for(const c of all){if(setOf(c)){e.preventDefault();gotoChar(c);return;}}}}
window.addEventListener('keydown',onKey,true);
/* ---------------- Ячейки: сетка ячеек, слитые чернила (геометрия — DRC в core_draw_n7.js) ----------------
   Слой ячеек — обычная фигура знака {k:'add',t:'cells',cs,cl}: cs — готовые чернила, cl — данные {g:настройки, c:главные ячейки, s:ячейки подсетки}.
   Чернила пересобираются из cl: при протяжке — быстрым черновым растром (раз в кадр), по отпусканию и после смены настроек — точным.
   Смена вида сетки плавно переходит: поля расстояний «было» и «стало» смешиваются по кривой --ease-std за --dur-base (без движения при prefers-reduced-motion). */
const CL_GRID=['a','b','t','rot','cols','rows','desc','sub','sa','sb','st','srot','sl'];
const CL_VIS=['a','b','t','rot','cols','rows','desc','rnd','sub','sa','sb','st','srot','sl'];
/* Слои: каждый слой — своя фигура-«ячейки» в cur.items (порядок среди них = порядок слоёв); cur.al — номер активного слоя среди слоёв */
const cellItems=()=>cur.items.filter(it=>it.cl);
const curCell=()=>{const L=cellItems();if(!L.length)return null;if(!(cur.al>=0&&cur.al<L.length))cur.al=Math.max(0,Math.min(L.length-1,cur.al|0));return L[cur.al];};
const clLabel=(it,k)=>it.cl.n||('Слой '+(k+1));
function cellNewName(){const u=new Set(cellItems().map((it,k)=>clLabel(it,k)));let n=u.size+1;while(u.has('Слой '+n))n++;return 'Слой '+n;}
const cellN=it=>it&&it.cl?drcCount(it):0;
function cellsIn(g,arr,sub){const o=[];for(let q=0;q<arr.length;q+=2)if(drcInBox(g,arr[q],arr[q+1],sub))o.push(arr[q],arr[q+1]);return o;}
function cellSrc(it){const g=it.cl.g;return [g,cellsIn(g,it.cl.c,0),g.sub?cellsIn(g,it.cl.s,1):null];}
function cellRegen(it){
  const [g,c,s]=cellSrc(it);
  it.cs=(c.length||(s&&s.length))?drcInk(g,c,s):[];
  it._p=null;it._ov=null;it._anim=null;it._stale=false;it._fld=null;}
/* ---- настройки ---- */
function cellSyncGp(){const g=D.gp.cell;g.rows=D.cs.rows;g.cols=D.cs.cols;if(D.grid==='cell')cur.cols=D.cs.cols;}
function autoGrid(){
  const want=D.tool==='cells'||!!curCell();
  if(want&&D.grid!=='cell'){D.pg=D.grid;D.grid='cell';cellSyncGp();}
  else if(!want&&D.grid==='cell'){D.grid=GRIDS[D.pg]&&D.pg!=='cell'?D.pg:'mod';cur.cols=D.gp[D.grid].cols;if(D.grid==='tile')cur.cols=D.gp.tile.rows;}}
/* вид (настройки) -> все слои ячеек других знаков: пересчёт лениво, по одному знаку за такт */
function cellEachOther(fn){for(const ch of Object.keys(D.g)){if(ch===cur.ch)continue;const r=D.g[ch];let k=0;for(const it of r.items)if(it.cl)fn(it,r,k++);}}/* k — номер слоя: связь идёт по номеру слоя */
let rfT=0;
function cellRefreshGlyph(ch){const r=D.g[ch];if(!r)return;r._cst=false;for(const it of r.items)if(it.cl)cellRegen(it);
  if(r.s){const cs=drnEval(r.items);if(cs.length){r.cs=cs;r.sp=null;}else{r.s=false;r.cs=null;}}D.built=false;}
function cellFlushAll(){for(const ch of Object.keys(D.g))if(D.g[ch]._cst&&ch!==cur.ch)cellRefreshGlyph(ch);}
function cellRefreshStep(){rfT=0;const ch=Object.keys(D.g).find(c=>D.g[c]._cst&&c!==cur.ch);
  if(!ch){if(D.shown)sync(true);return;}cellRefreshGlyph(ch);rfT=setTimeout(cellRefreshStep,12);}
function cellRefreshSoon(){if(!rfT)rfT=setTimeout(cellRefreshStep,40);}
function cellLinkApply(it,keys,src){src=src||D.cs;let ch=false;for(const k of keys)if(it.cl.g[k]!==src[k]){it.cl.g[k]=src[k];ch=true;}return ch;}
/* связь по номеру слоя: настройки слоя k проекта (D.pl[k]) берут слои k всех знаков */
function cellLinkAll(){
  const keys=clKeys();if(!keys)return;D.pl[cur.al]=D.cs;let any=false;
  cellEachOther((o,r,ix)=>{const p=D.pl[ix];if(p&&cellLinkApply(o,keys,p)){r._cst=true;any=true;}});
  if(any)cellRefreshSoon();cellAdopt();}
function cellAfterMirror(){/* поворот слоя изменился: панель и связанные настройки берут новые значения */
  cellAdoptAct();cellItems().forEach((o,k)=>{if(D.pl[k])D.pl[k]=drcNorm(Object.assign({},D.pl[k],{rot:o.cl.g.rot,srot:o.cl.g.srot}));});
  D.pl[cur.al]=D.cs;cellLinkAll();}
const clKeys=()=>D.link==='all'?DRC_KEYS:D.link==='grid'?CL_GRID:null;
function cellSet(patch){
  const prev=D.cs,nw=drcNorm(Object.assign({},prev,patch)),vis=CL_VIS.some(k=>prev[k]!==nw[k]);
  let it=curCell();
  if(vis&&it&&cellN(it))cellAniFrom(it);
  D.cs=nw;D.pl[cur.al]=nw;const keys=clKeys();
  if(it){if(!keys){it.cl.g=drcNorm(Object.assign({},nw));}else cellLinkApply(it,keys);
    if(vis){it._stale=true;it._fld=null;}}
  if(keys){let any=false;const al=cur.al;cellEachOther((o,r,ix)=>{if(ix===al&&cellLinkApply(o,keys)){r._cst=true;any=true;}});if(any)cellRefreshSoon();}
  cellSyncGp();
  if(it&&vis)cellKick(it);
  if(it||keys)markDirty();else persistSoon();
  const fa=document.activeElement;if(ui.cl&&!(fa&&fa.type==='range'&&ui.cl.contains(fa)))renderCellsPane();/* панель всегда показывает настройки этого знака */
  redraw();}
/* жест настройки (протяжка ползунка) — один шаг отмены */
let cgT=0,cgOn=false;
function cellGesture(){if(!cgOn){pushUndo();cgOn=true;}clearTimeout(cgT);cgT=setTimeout(()=>{cgOn=false;},700);}
function cellAdopt(){/* после отмены/загрузки знака: панель берёт настройки активного слоя; при связи слои берут настройки проекта по номеру слоя */
  const L=cellItems();if(!L.length)return;
  const it=curCell(),keys=clKeys();
  if(!keys){D.cs=drcNorm(Object.assign({},it.cl.g,{act:D.cs.act}));D.pl[cur.al]=D.cs;}
  else{D.pl[cur.al]=D.cs;L.forEach((o,k)=>{const p=D.pl[k];if(p&&cellLinkApply(o,keys,p)){o._stale=true;cellRegen(o);}});
    D.cs=drcNorm(Object.assign({},D.cs,{size:it.cl.g.size,rnd:it.cl.g.rnd}));D.pl[cur.al]=D.cs;}
  cellSyncGp();}
function cellOnLoad(){
  cellCancelAnim();
  if(curCell()){cellAdopt();for(const o of cellItems())if(o._stale)cellRegen(o);}
  autoGrid();cellSyncGp();}
/* ---- рисование ячеек ---- */
function cellPos(raw,sub){const c=cellOr()/(sub?2:1);return [Math.floor(raw[0]/c),Math.floor(raw[1]/c)];}
function cellStamp(Q,i,j){
  const n=D.cs.size,o=Math.floor((n-1)/2);let ch=false;
  for(let a=0;a<n;a++)for(let b=0;b<n;b++){const x=i-o+a,y=j-o+b;if(!drcInBox(Q.g,x,y,Q.sub))continue;
    const S=Q.sub?Q.Ss:Q.S,k=drcKey(x,y);
    if(Q.erase){if(S.delete(k))ch=true;}else if(!S.has(k)){S.add(k);ch=true;}}
  return ch;}
function cellDown(e,raw){
  const erase=(D.cmode==='erase')!==!!e.shiftKey;let it=curCell();
  if(!it&&erase)return false;
  pushUndo();D.cdel=0;
  const fresh=!it,unhid=!!(it&&it.cl.h);
  if(fresh){it=cellMkItem(cellNewName());cur.items.push(it);cur.al=cellItems().length-1;cur.sel=-1;}
  else if(unhid)delete it.cl.h;/* рисование в скрытом слое показывает его */
  cellCancelAnim();if(it._stale)cellRegen(it);
  const g=it.cl.g,sub=!!g.sub&&D.cs.act==='sub';
  P={t:'cells',it,erase,sub,g,S:drcSet(it.cl.c),Ss:drcSet(it.cl.s),last:null,changed:false,fresh,unhid,pre:cur.undo.length};
  cellMove(raw);return true;}
function cellMkItem(n){return {k:'add',t:'cells',cs:[],cl:{g:drcNorm(D.cs),c:[],s:[],n}};}
function cellMove(raw){
  const Q=P,ij=cellPos(raw,Q.sub),path=Q.last?drcLine(Q.last,ij):[ij];let ch=false;
  for(const q of path)if(cellStamp(Q,q[0],q[1]))ch=true;
  Q.last=ij;
  if(ch){Q.changed=true;Q.it.cl.c=drcFromSet(Q.S);Q.it.cl.s=drcFromSet(Q.Ss);Q.it._stale=true;Q.it._fld=null;cellPreviewSoon(Q.it);}}
let pvRaf=0;
function cellPreviewSoon(it){if(pvRaf)return;pvRaf=requestAnimationFrame(()=>{pvRaf=0;cellPreview(it);redraw();});}
function cellPreview(it){
  const [g,c,s]=cellSrc(it),p=new Path2D();
  if(c.length||(s&&s.length))for(const l of drcInk(g,c,s,{rs:3,poly:true})){const q=l.pts;if(q.length<3)continue;p.moveTo(q[0][0],q[0][1]);for(let k=1;k<q.length;k++)p.lineTo(q[k][0],q[k][1]);p.closePath();}
  it._ov=p;}
function cellUp(p){
  const it=p.it;
  if(pvRaf){cancelAnimationFrame(pvRaf);pvRaf=0;}
  const drop=()=>{const i=cur.items.indexOf(it);if(i>=0)cur.items.splice(i,1);cur.al=Math.max(0,Math.min(cur.al,cellItems().length-1));};
  if(!p.changed){cur.undo.pop();if(p.unhid)it.cl.h=1;if(p.fresh&&!cellN(it))drop();it._ov=null;autoGrid();sync(false);return;}
  if(!cellN(it)&&cellItems().length===1)drop();/* единственный слой без ячеек исчезает; среди нескольких слоёв пустой остаётся */
  else cellRegen(it);
  markDirty();autoGrid();sync();}
function cellClear(){/* очистить активный слой; единственный слой исчезает совсем */
  const it=curCell();if(!it)return;pushUndo();cellCancelAnim();D.cdel=0;
  if(cellItems().length===1){cur.items.splice(cur.items.indexOf(it),1);cur.al=0;}
  else{it.cl.c=[];it.cl.s=[];it.cs=[];it._p=null;it._ov=null;it._fld=null;it._stale=false;}
  cur.sel=-1;markDirty();autoGrid();sync();}
/* ---- слои ---- */
function cellAdoptAct(keepSize){/* панель берёт настройки (всего слоя) активного слоя */
  const it=curCell();if(!it)return;
  D.cs=drcNorm(Object.assign({},it.cl.g,{act:D.cs.act,size:keepSize?D.cs.size:it.cl.g.size}));D.pl[cur.al]=D.cs;cellSyncGp();}
function cellSelect(k){
  const L=cellItems();if(k<0||k>=L.length)return;D.cdel=0;D.crn=-1;
  if(k===cur.al){sync(false);return;}
  cellCancelAnim();cellFlush();cur.al=k;cur.sel=-1;cellAdoptAct(true);autoGrid();persistSoon();sync(false);}
function cellAdd(dup){
  const a=curCell(),L=cellItems();if(L.length>=CL_MAX)return;
  pushUndo();cellCancelAnim();cellFlush();D.cdel=0;D.crn=-1;
  let it;
  if(dup&&a){it=jc(a);it.cl.n=((a.cl.n||'Слой '+(cur.al+1))+' копия').slice(0,CL_NAME);delete it.cl.h;}
  else it=cellMkItem(cellNewName());
  cur.items.splice(a?cur.items.indexOf(a)+1:cur.items.length,0,it);
  cur.al=a?cur.al+1:0;cur.sel=-1;cellAdoptAct(true);markDirty();autoGrid();sync();}
function cellDelete(){
  const it=curCell();if(!it)return;pushUndo();cellCancelAnim();D.cdel=0;D.crn=-1;
  cur.items.splice(cur.items.indexOf(it),1);cur.al=Math.max(0,Math.min(cur.al,cellItems().length-1));cur.sel=-1;
  cellAdoptAct();markDirty();autoGrid();sync();}
function cellShift(d){/* порядок слоёв: d=-1 выше в списке, +1 ниже */
  const L=cellItems(),k=cur.al,j=k+d;if(j<0||j>=L.length)return;
  pushUndo();D.cdel=0;const a=cur.items.indexOf(L[k]),b=cur.items.indexOf(L[j]);
  [cur.items[a],cur.items[b]]=[cur.items[b],cur.items[a]];
  const t=D.pl[k];D.pl[k]=D.pl[j];D.pl[j]=t;/* связанные настройки идут вместе со слоем */
  cur.al=j;markDirty();sync(false);}
function cellVis(k){
  const it=cellItems()[k];if(!it)return;pushUndo();
  if(it.cl.h)delete it.cl.h;else it.cl.h=1;
  markDirty();sync();}
function cellRename(k,v){
  const it=cellItems()[k];D.crn=-1;if(!it)return;
  v=String(v||'').replace(/\s+/g,' ').trim().slice(0,CL_NAME);
  if(v&&v!==clLabel(it,k)){pushUndo();it.cl.n=v;markDirty();}
  sync(false);}
function cellMirror(it,vert){
  const g=it.cl.g,fx=(i,k)=>g.cols*k-1-i,fy=(j,k)=>(g.rows-g.desc)*k-1-j;
  const m=(a,k)=>{const o=[];for(let q=0;q<a.length;q+=2)o.push(vert?a[q]:fx(a[q],k),vert?fy(a[q+1],k):a[q+1]);return o;};
  it.cl.c=m(it.cl.c,1);it.cl.s=m(it.cl.s,2);
  /* форма ячейки симметрична относительно вертикальной оси, поэтому: зеркало по горизонтали = поворот −θ, по вертикали = 180°−θ (точное зеркало и для треугольника, пятиугольника, любых поворотов) */
  for(const k of ['rot','srot'])it.cl.g[k]=(((vert?180:0)-it.cl.g[k])%360+360)%360;
  it._stale=true;cellRegen(it);}
/* ---- анимация перехода ---- */
const ANI={it:null,A:null,B:null,G:null,t0:0,dur:0,raf:0,pend:false,cv:null,im:null};
const aniDur=()=>{const v=window.__GT_CELLANIM;return v?(v>1?v:300):((window.MO&&MO.off())?0:(MO.D('base')||300));};/* __GT_CELLANIM — только для проверок: включает переход без MO, число — длительность в мс */
function aniEase(u){/* cubic-bezier из токена --ease-std */
  let b=[.4,0,.2,1];try{const m=/cubic-bezier\(([^)]+)\)/.exec(MO.E('std'));if(m){const v=m[1].split(',').map(Number);if(v.length===4&&v.every(isFinite))b=v;}}catch(e){}
  const bx=t=>3*b[0]*t*(1-t)*(1-t)+3*b[2]*t*t*(1-t)+t*t*t,by=t=>3*b[1]*t*(1-t)*(1-t)+3*b[3]*t*t*(1-t)+t*t*t;
  let lo=0,hi=1,t=u;for(let i=0;i<24;i++){t=(lo+hi)/2;if(bx(t)<u)lo=t;else hi=t;}return by(t);}
function fieldOf(it){
  const [g,c,s]=cellSrc(it);if(!(c.length||(s&&s.length)))return {e:1};
  const r=drcInk(g,c,s,{raw:1,rs:2});if(!r)return {e:1};
  return {sdf:drcSdf(r.m,r.R.W,r.R.H),W:r.R.W,H:r.R.H,ox:r.R.ox,oy:r.R.oy,rs:r.R.rs};}
function fSamp(F,x,y){
  if(!F||F.e)return 60;
  let u=(x-F.ox)/F.rs-0.5,v=(y-F.oy)/F.rs-0.5,out=0;
  if(u<0){out-=u;u=0;}else if(u>F.W-1){out+=u-(F.W-1);u=F.W-1;}
  if(v<0){out-=v;v=0;}else if(v>F.H-1){out+=v-(F.H-1);v=F.H-1;}
  const i=Math.floor(u),j=Math.floor(v),i1=Math.min(F.W-1,i+1),j1=Math.min(F.H-1,j+1),fu=u-i,fv=v-j,S=F.sdf,W=F.W;
  const a=S[j*W+i]*(1-fu)+S[j*W+i1]*fu,b=S[j1*W+i]*(1-fu)+S[j1*W+i1]*fu;
  return ((a*(1-fv)+b*fv)+out)*F.rs;}
function aniGrid(A,B){
  const fs=[A,B].filter(f=>f&&!f.e);if(!fs.length)return null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,rs=0;
  for(const f of fs){x0=Math.min(x0,f.ox);y0=Math.min(y0,f.oy);x1=Math.max(x1,f.ox+f.W*f.rs);y1=Math.max(y1,f.oy+f.H*f.rs);rs=Math.max(rs,f.rs);}
  return {ox:x0,oy:y0,rs,W:Math.ceil((x1-x0)/rs),H:Math.ceil((y1-y0)/rs)};}
function aniBlend(A,B,e,G){/* знаковое расстояние смеси в мировых единицах на сетке G */
  const out=new Float32Array(G.W*G.H);
  for(let j=0;j<G.H;j++){const y=G.oy+(j+.5)*G.rs;for(let i=0;i<G.W;i++){const x=G.ox+(i+.5)*G.rs;
    out[j*G.W+i]=fSamp(A,x,y)*(1-e)+fSamp(B,x,y)*e;}}
  return out;}
function cellAniFrom(it){
  if(aniDur()===0)return;
  if(ANI.it===it&&ANI.pend&&ANI.A)return;/* цель ещё не посчитана: «было» остаётся прежним */
  if(ANI.it===it&&ANI.A&&ANI.B&&ANI.G){/* переход уже идёт: продолжаем с того, что на экране */
    const e=aniEase(Math.min(1,(performance.now()-ANI.t0)/(ANI.dur||1))),G=ANI.G,s=aniBlend(ANI.A,ANI.B,e,G);
    ANI.A={sdf:s.map(v=>v/G.rs),W:G.W,H:G.H,ox:G.ox,oy:G.oy,rs:G.rs};return;}
  ANI.A=it._fld||fieldOf(it);}
function cellKick(it){
  if(aniDur()===0||!ANI.A){cellRegen(it);ANI.it=null;redraw();return;}
  ANI.it=it;ANI.pend=true;it._anim=it._anim||{e:0};
  if(!ANI.raf)ANI.raf=requestAnimationFrame(aniTick);}
function aniTick(now){
  ANI.raf=0;const it=ANI.it;if(!it||cur.items.indexOf(it)<0){ANI.it=null;return;}
  if(ANI.pend){ANI.pend=false;ANI.B=fieldOf(it);ANI.G=aniGrid(ANI.A,ANI.B);ANI.t0=now;ANI.dur=aniDur();}
  const u=Math.min(1,(now-ANI.t0)/(ANI.dur||1)),e=aniEase(u);
  if(u>=1||!ANI.G){const B=ANI.B;if(it._stale)cellRegen(it);else{it._p=null;it._ov=null;it._anim=null;}it._fld=B;ANI.it=null;ANI.A=null;redraw();return;}
  it._anim={e};redraw();ANI.raf=requestAnimationFrame(aniTick);}
function cellCancelAnim(){
  if(ANI.raf){cancelAnimationFrame(ANI.raf);ANI.raf=0;}
  if(ANI.it){ANI.it._anim=null;ANI.it=null;}ANI.A=null;}
function cellFlush(){/* актуальные чернила для снимка/сохранения; идущий переход не прерывается */
  for(const it of cur.items)if(it.cl&&it._stale){
    if(it===ANI.it){const [g,c,s]=cellSrc(it);it.cs=(c.length||(s&&s.length))?drcInk(g,c,s):[];it._stale=false;}
    else cellRegen(it);}}
/* кадр перехода: смесь полей -> альфа-картинка -> на слой чернил */
function aniPaint(L,it){
  const G=ANI.G;if(!G||!ANI.B)return false;
  const e=it._anim.e,w=G.W,h=G.H;
  if(!ANI.cv)ANI.cv=document.createElement('canvas');
  const cv=ANI.cv;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;ANI.im=null;}
  const x=cv.getContext('2d'),im=ANI.im||(ANI.im=x.createImageData(w,h)),d=im.data,A=ANI.A,B=ANI.B,rs=G.rs;/* буфер кадра переиспользуется: только альфа */
  for(let j=0;j<h;j++){const y=G.oy+(j+.5)*rs;for(let i=0;i<w;i++){const xx=G.ox+(i+.5)*rs;
    const v=(fSamp(A,xx,y)*(1-e)+fSamp(B,xx,y)*e)/rs,a=v<=-0.5?1:v>=0.5?0:0.5-v;d[(j*w+i)*4+3]=a*255;}}
  x.putImageData(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle=D.col.ink;x.fillRect(0,0,w,h);x.globalCompositeOperation='source-over';
  L.imageSmoothingEnabled=true;L.drawImage(cv,G.ox,G.oy,w*rs,h*rs);return true;}
/* ---- сетка на холсте ---- */
let cgCache=null;
function cellGridPaths(g){
  const k=[g.a,g.b,g.t,g.rot,g.cols,g.rows,g.desc,g.sub,g.sa,g.sb,g.st,g.srot,g.sl].join('|');
  if(cgCache&&cgCache.k===k)return cgCache;
  const c=700/g.rows,mk=(a,b,t,rot,cs,nx,ny,j0)=>{const p=new Path2D(),pure=a==='circle'&&b==='circle',S=pure?null:drcShape(a,b,t,rot);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const cx=(i+.5)*cs,cy=(j0+j+.5)*cs;
      if(pure){p.moveTo(cx+cs/2,cy);p.arc(cx,cy,cs/2,0,Math.PI*2);}
      else{p.moveTo(cx+S[0][0]*cs,cy+S[0][1]*cs);for(let q=1;q<S.length;q++)p.lineTo(cx+S[q][0]*cs,cy+S[q][1]*cs);p.closePath();}}
    return p;};
  const rows=g.rows+g.desc,main=mk(g.a,g.b,g.t,g.rot,c,g.cols,rows,-g.desc);
  let sub=null;if(g.sub){sub=g.sl?mk(g.a,g.b,g.t,g.rot,c/2,g.cols*2,rows*2,-g.desc*2):mk(g.sa,g.sb,g.st,g.srot,c/2,g.cols*2,rows*2,-g.desc*2);}
  return cgCache={k,main,sub};}
function strokeW(ctx,path,color,lw,alpha){ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.lineWidth=lw/V.s;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.stroke(path);ctx.restore();}
function drawCellGrid(ctx){
  if(!D.cshow)return;const a=curCell(),g=a?a.cl.g:D.cs,gp=cellGridPaths(g),col=D.col,sa=g.sub&&D.cs.act==='sub';
  strokeW(ctx,gp.main,col.grid,1,sa?.45:1);
  if(gp.sub)strokeW(ctx,gp.sub,col.grid2,1,sa?1:.65);}
function cellFoot(raw){
  const a=curCell(),g=a?a.cl.g:D.cs,sub=!!g.sub&&D.cs.act==='sub',ij=cellPos(raw,sub),n=D.cs.size,o=Math.floor((n-1)/2),out=[];
  for(let a=0;a<n;a++)for(let b=0;b<n;b++){const x=ij[0]-o+a,y=ij[1]-o+b;if(drcInBox(g,x,y,sub))out.push([x,y]);}
  return {sub,g,cells:out};}
function drawCellHover(ctx){
  if(!cur.hc)return;const f=cellFoot(cur.hc);if(!f.cells.length)return;
  const g=f.g,c=700/g.rows/(f.sub?2:1),sh=f.sub&&!g.sl?drcShape(g.sa,g.sb,g.st,g.srot):drcShape(g.a,g.b,g.t,g.rot),p=new Path2D();
  for(const [i,j] of f.cells){const cx=(i+.5)*c,cy=(j+.5)*c;p.moveTo(cx+sh[0][0]*c,cy+sh[0][1]*c);for(let q=1;q<sh.length;q++)p.lineTo(cx+sh[q][0]*c,cy+sh[q][1]*c);p.closePath();}
  ctx.save();ctx.translate(X(0),Y(0));ctx.scale(V.s,-V.s);ctx.lineWidth=1.8/V.s;ctx.strokeStyle=D.col.acc;ctx.setLineDash(D.cmode==='erase'?[4/V.s,3/V.s]:[]);ctx.stroke(p);
  ctx.globalAlpha=.12;ctx.fillStyle=D.col.acc;ctx.fill(p);ctx.restore();}
/* ---- панель «Сетка ячеек» ---- */
const CL_ICO={circle:'M12 3.2a8.8 8.8 0 100 17.6 8.8 8.8 0 000-17.6z',square:'M4.6 4.6h14.8v14.8H4.6z',diamond:'M12 2.6l9.4 9.4-9.4 9.4L2.6 12z',tri:'M12 3.4l9.2 16.4H2.8z',
  pent:'M12 3.3l9.13 6.63-3.49 10.74H6.36L2.87 9.93z',hex:'M21.2 12l-4.6 7.97H7.4L2.8 12l4.6-7.97h9.2z',oct:'M21.42 15.9l-5.52 5.52H8.1L2.58 15.9V8.1L8.1 2.58h7.8l5.52 5.52z'};
for(const k in CL_ICO)ICO['c_'+k]=CL_ICO[k];
const clName=k=>(DRC.SH.find(s=>s[0]===k)||[k,k])[1];
const plur=(n,a,b,c)=>{const m=n%100,d=n%10;return (m>10&&m<20)?c:d===1?a:(d>1&&d<5)?b:c;};
function clKeysAct(){return D.cs.sub&&D.cs.act==='sub'&&!D.cs.sl?['sa','sb','st','srot']:['a','b','t','rot'];}
function clChips(attr,cur_){return '<div class="dr-shp" role="group">'+DRC.SH.map(([k,n])=>'<button type="button" class="dr-ib'+(cur_===k?' on':'')+'" data-'+attr+'="'+k+'" title="'+n+'" aria-label="'+n+'" aria-pressed="'+(cur_===k)+'">'+ic('c_'+k,18)+'</button>').join('')+'</div>';}
function clRange(id,label,min,max,val,unit,extra){return '<div class="dr-row"><label for="'+id+'">'+label+' <output>'+val+(unit||'')+'</output></label><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" value="'+val+'">'+(extra||'')+'</div>';}
/* список слоёв: глаз, имя (двойной щелчок или карандаш — переименовать), число ячеек; ниже кнопки и строка состояния */
const clStatus=(N,K)=>N+' '+plur(N,'ячейка','ячейки','ячеек')+' · '+K+' '+plur(K,'слой','слоя','слоёв');
function clLayersHTML(){
  const L=cellItems(),K=L.length,N=L.reduce((a,it)=>a+cellN(it),0),a=curCell(),cb=(act,ico,t,dis)=>'<button type="button" class="dr-ib" data-lact="'+act+'" title="'+t+'" aria-label="'+t+'"'+(dis?' disabled':'')+'>'+ic(ico,18)+'</button>';
  let h='<div class="dr-lay">';
  if(K)h+='<div class="dr-lays" role="listbox" aria-label="Слои ячеек">'+L.map((it,k)=>{
    const on=k===cur.al,hid=!!it.cl.h,nm=clLabel(it,k);
    return '<div class="dr-ly'+(on?' on':'')+(hid?' off':'')+'" role="option" aria-selected="'+on+'">'
      +'<button type="button" class="dr-ib dr-ly-e" data-lvis="'+k+'" title="'+(hid?'Показать слой':'Скрыть слой — скрытые слои не попадают в шрифт')+'" aria-label="'+(hid?'Показать':'Скрыть')+' слой «'+esc(nm)+'»" aria-pressed="'+!hid+'">'+ic(hid?'eyeoff':'eye',18)+'</button>'
      +(D.crn===k?'<input type="text" class="dr-ly-in" id="dr-lyin" maxlength="'+CL_NAME+'" value="'+esc(nm)+'" aria-label="Имя слоя" autocomplete="off" spellcheck="false">'
        :'<button type="button" class="dr-ly-nm" data-lsel="'+k+'" title="'+esc(nm)+'">'+esc(nm)+'</button>')
      +'<span class="dr-ly-c" title="Ячеек в слое">'+cellN(it)+'</span></div>';}).join('')+'</div>';
  else h+='<p class="dr-hint">Проведите по сетке — появится «Слой 1»</p>';
  if(D.cdel&&a)h+='<div class="dr-conf" role="alertdialog" aria-label="Удалить слой"><span>Удалить «'+esc(clLabel(a,cur.al))+'»?</span><div class="dr-pills"><button type="button" data-lact="delok" class="on">Удалить</button><button type="button" data-lact="delno">Отмена</button></div></div>';
  else h+='<div class="dr-lbar" role="toolbar" aria-label="Действия со слоями">'+cb('add','plus','Добавить слой',K>=CL_MAX)+cb('dup','dup','Дублировать слой',!a||K>=CL_MAX)+cb('ren','pen','Переименовать слой',!a)
    +cb('up','up','Выше в списке',!a||cur.al<1)+cb('down','down','Ниже в списке',!a||cur.al>=K-1)+cb('del','trash','Удалить слой',!a)+'</div>';
  h+='<p class="dr-hint">'+(K?clStatus(N,K):'Пока пусто: проведите по сетке')+'</p>';
  if(K>1)h+='<p class="dr-hint">Скрытые слои не попадают в шрифт</p>';
  return h+'<p class="dr-sub">'+(a?'Настройки слоя «'+esc(clLabel(a,cur.al))+'»':'Настройки нового слоя')+'</p></div>';}
let clBusy=false;
function renderCellsPane(){
  const c=D.cs,ks=clKeysAct(),n=cellN(curCell()),sw=(id,t,on)=>'<label class="dr-sw">'+t+'<input type="checkbox" id="'+id+'"'+(on?' checked':'')+'><i></i></label>',
    pill=(a,k,t,on)=>'<button type="button" data-'+a+'="'+k+'" class="'+(on?'on':'')+'" aria-pressed="'+!!on+'">'+t+'</button>';
  let h='<div class="dr-sec">'+clLayersHTML();
  if(c.sub)h+='<div class="dr-pills" role="group" aria-label="Активная сетка">'+pill('cact','main','Главная сетка',c.act!=='sub')+pill('cact','sub','Подсетка',c.act==='sub')+'</div>';
  h+='<div class="dr-row"><span class="lb">Форма A</span>'+clChips('cla',c[ks[0]])+'</div>'
   +'<div class="dr-row"><span class="lb">Форма B</span>'+clChips('clb',c[ks[1]])+'</div>'
   +clRange('dr-ct','Переход',0,100,c[ks[2]],' %','<div class="dr-ends"><span>'+clName(c[ks[0]])+'</span><span>'+clName(c[ks[1]])+'</span></div>')
   +clRange('dr-cr','Поворот',0,360,c[ks[3]],'°')
   +'<div class="dr-two">'+clRange('dr-cc','Столбцы',3,24,c.cols)+clRange('dr-crw','Строки',3,24,c.rows)+'</div>'
   +'<div class="dr-two">'+clRange('dr-cd','Нижние ряды',0,4,c.desc)+clRange('dr-cz','Размер кисти',1,7,c.size)+'</div>'
   +clRange('dr-cn','Скругление стыков',0,100,c.rnd,' %')
   +sw('dr-csub','Подсетка',c.sub);
  if(c.sub)h+=sw('dr-csl','Связать сетки',c.sl);
  h+='<div class="dr-row"><span class="lb">Связь с проектом</span><div class="dr-pills" role="group">'+[['none','Нет'],['grid','Сетки'],['all','Все настройки']].map(([k,t])=>pill('clk',k,t,D.link===k)).join('')+'</div></div>'
   +'<div class="dr-pills"><button type="button" data-ca="rand">Случайно</button><button type="button" data-ca="reset">Сброс</button><button type="button" data-ca="clear"'+(n?'':' disabled')+'>Очистить слой</button></div>'
   +sw('dr-cshow','Показать сетку',D.cshow)+'</div>';
  if(ui.cl.dataset.k!==h&&!clBusy){const a=document.activeElement,keep=a&&ui.cl.contains(a)&&a.id;clBusy=true;try{ui.cl.innerHTML=h;ui.cl.dataset.k=h;}finally{clBusy=false;}if(keep){const e=ui.cl.querySelector('#'+keep);if(e)e.focus();}}}/* clBusy: удаление поля имени вызывает blur/change — повторная перерисовка внутри не нужна */
function clWire(){
  const on=(e,t,f)=>e.addEventListener(t,f),B=ui.cl;
  on(B,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const ks=clKeysAct(),d=b.dataset;
    if(d.lvis!==undefined){cellVis(+d.lvis);return;}
    if(d.lsel!==undefined){cellSelect(+d.lsel);return;}
    if(d.lact){const a=d.lact;
      if(a==='add'||a==='dup')cellAdd(a==='dup');
      else if(a==='ren'){D.crn=cur.al;D.cdel=0;renderCellsPane();const i=B.querySelector('#dr-lyin');if(i){i.focus();i.select();}}
      else if(a==='up'||a==='down')cellShift(a==='up'?-1:1);
      else if(a==='del'){const it=curCell();if(it&&cellN(it)){D.cdel=1;D.crn=-1;renderCellsPane();}else cellDelete();}
      else if(a==='delok')cellDelete();else if(a==='delno'){D.cdel=0;renderCellsPane();}
      return;}
    if(d.cla){pushUndo();cellSet({[ks[0]]:d.cla});}
    else if(d.clb){pushUndo();cellSet({[ks[1]]:d.clb});}
    else if(d.cact){D.cs.act=d.cact;persistSoon();}
    else if(d.clk){D.link=d.clk;if(D.link!=='none'){pushUndo();cellLinkAll();markDirty();}persistSoon();}
    else if(d.ca==='rand'){pushUndo();const r=drcRandom(D.cs);cellSet({a:r.a,b:r.b,t:r.t,rot:r.rot,rnd:r.rnd});}
    else if(d.ca==='reset'){pushUndo();const f=DRC.DEF;cellSet({a:f.a,b:f.b,t:f.t,rot:f.rot,rnd:f.rnd,cols:f.cols,rows:f.rows,desc:f.desc,size:f.size,sub:f.sub,sa:f.sa,sb:f.sb,st:f.st,srot:f.srot,sl:f.sl,act:'main'});}
    else if(d.ca==='clear'){cellClear();return;}
    sync();});
  on(B,'input',e=>{const t=e.target,ks=clKeysAct(),v=+t.value,id=t.id;
    const map={'dr-ct':[ks[2],''],'dr-cr':[ks[3],'°'],'dr-cc':['cols',''],'dr-crw':['rows',''],'dr-cd':['desc',''],'dr-cz':['size',''],'dr-cn':['rnd','']};
    if(map[id]){cellGesture();const o=t.closest('.dr-row').querySelector('output');if(o)o.textContent=v+(id==='dr-ct'||id==='dr-cn'?' %':id==='dr-cr'?'°':'');
      cellSet({[map[id][0]]:v});if(id==='dr-cz'||id==='dr-cc'||id==='dr-crw'||id==='dr-cd'||id==='dr-cn')cellDockSync();return;}
    if(id==='dr-csub'||id==='dr-csl'||id==='dr-cshow'){
      if(id==='dr-cshow'){D.cshow=t.checked;persistSoon();redraw();sync(false);return;}
      pushUndo();const p=id==='dr-csub'?{sub:t.checked?1:0,act:t.checked?D.cs.act:'main'}:{sl:t.checked?1:0};cellSet(p);sync();}});
  on(B,'change',e=>{if(e.target.id!=='dr-lyin')sync();});
  on(B,'dblclick',e=>{const b=e.target.closest('[data-lsel]');if(!b)return;cellSelect(+b.dataset.lsel);D.crn=cur.al;renderCellsPane();const i=B.querySelector('#dr-lyin');if(i){i.focus();i.select();}});
  on(B,'keydown',e=>{if(e.target.id!=='dr-lyin')return;
    if(e.key==='Enter'){e.preventDefault();cellRename(D.crn,e.target.value);}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();D.crn=-1;sync(false);}});
  on(B,'focusout',e=>{if(e.target.id==='dr-lyin'&&D.crn>=0)cellRename(D.crn,e.target.value);});}
function cellDockSync(){const o=ui.opt.querySelector('#dr-csz');if(o&&+o.value!==D.cs.size){o.value=D.cs.size;const q=o.parentNode.querySelector('output');if(q)q.textContent=D.cs.size;}}

/* ---------------- публичный вход ---------------- */
/* T1 v82 merge: the one-time storage note (#nsn, fixed bottom-left in the shell) would cover the left end of the drawing toolbar.
   On this screen it is lifted to sit directly above the toolbar (never over it) and centred on it; the shell position returns when the screen is left. */
function nsnPlace(){
  const n=document.getElementById('nsn');if(!n)return;
  const dk=document.getElementById('dr-dock'),on=document.body.classList.contains('dr-on')&&dk&&dk.offsetParent;
  if(!on){n.style.bottom=n.style.left=n.style.top='';return;}
  const bar=dk.closest('.dr-bar'),t=Math.min(dk.getBoundingClientRect().top,bar?bar.getBoundingClientRect().top:1e9);
  n.style.top='auto';n.style.bottom=Math.round(innerHeight-t+8)+'px';
  if(innerWidth>720){const w=n.offsetWidth,r=dk.getBoundingClientRect();n.style.left=Math.round(Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2)))+'px';}else n.style.left='';}
let nsnMo=null;
function nsnWatch(){
  if(nsnMo)return;nsnMo=new MutationObserver(()=>nsnPlace());nsnMo.observe(document.body,{childList:true,attributes:true,attributeFilter:['class']});
  addEventListener('resize',nsnPlace);try{if(window.ResizeObserver)new ResizeObserver(nsnPlace).observe(document.getElementById('dr-dock')||document.body);}catch(e){}}
function mount(el){
  if(D.mounted)return;
  restore();build(el);D.mounted=true;nsnWatch();if(window.__GT_TEST)exposeTest();
  loadCur(setOf(D.ch)?D.ch:SETS[D.set].s[0]);
  readCol();syncTheme();analyze();sync();
  setTimeout(()=>{size();redraw();},0);}
function onShow(){if(!D.mounted)return;D.shown=true;document.body.classList.add('dr-on');D.col=null;size();sync();setTimeout(()=>{size();redraw();},50);}
function onHide(){D.shown=false;document.body.classList.remove('dr-on');if(!D.mounted)return;commitCur(true);persistNow();if(ui.mt)ui.mt.hidden=true;}
function hasWork(){if(!D.mounted)return false;if(D.built)return false;
  return cur.items.length>0||Object.keys(D.g).some(c=>D.g[c].items.length||D.g[c].s);}
/* профиль (m43): удалить рисунок, перечитать его из хранилища после восстановления копии, переименовать */
function resetAll(){
  if(!D.mounted){try{localStorage.removeItem(LSK);}catch(e){}return;}
  ustClear();D.g={};D.built=false;D.name='Мой шрифт';cur.items=[];cur.undo=[];cur.redo=[];cur.sel=-1;cur.dirty=false;
  persistNow();loadCur(setOf(D.ch)?D.ch:SETS[D.set].s[0]);analyze();sync();if(D.shown)redraw();}
function reloadAll(){
  if(!D.mounted)return;
  ustReset();D.g={};D.built=false;restore();loadCur(setOf(D.ch)?D.ch:SETS[D.set].s[0]);analyze();sync();if(D.shown)redraw();}
function histApply(o){if(!D.mounted)return;ustReset();D.g={};D.built=false;restore(o);loadCur(setOf(D.ch)?D.ch:SETS[D.set].s[0]);analyze();sync();if(D.shown)redraw();persistSoon();}
function histSer(){const a=packAll(),c={m:JSON.stringify(a.m)};for(const ch in a.g)c['g\u0001'+ch]=JSON.stringify(a.g[ch]);return c;}
function histGlyph(js){try{const r=JSON.parse(js);const cs=r.s&&r.c?impUnpackC(r.c):drnEval(unpackItems(r.i));return cs;}catch(e){return [];}}
function setName(n){
  n=cleanName(n);if(!n)return;
  if(D.mounted){D.name=n;persistNow();sync();return;}
  try{const o=JSON.parse(localStorage.getItem(LSK)||'null');if(o){o.name=n;localStorage.setItem(LSK,JSON.stringify(o));}}catch(e){}}
function packNow(){if(!D.mounted)return null;const a=packAll();a.m.g=a.g;return a.m;}
window.GT_DRAW={redraw,pack:packNow,hist:{ser:histSer,apply:histApply,glyph:histGlyph,ready:()=>D.mounted},mount,onShow,onHide,hasWork,reset:resetAll,reload:reloadAll,setName,openChars:()=>{try{return allList().filter(ch=>D.g[ch]&&D.g[ch].items&&D.g[ch].items.some(i=>i.pen&&!i.pen.closed));}catch(e){return [];}},edit:ch=>{if(D.mounted&&ch)gotoChar(ch);}};
function exposeTest(){window.GT_DRAW._t={redraw,readCol,D,cur,V,comp,ancInfo,draftFor,polyMembers,allList,R,makeDraft,detach,drawPoly,buildFont,testFontOk:()=>tf.ok,w2s:(x,y)=>{const r=ui.cv.getBoundingClientRect();return [r.left+X(x)*r.width/V.w,r.top+Y(y)*r.height/V.h];},analyze,applyFix,snapPt,optSp,akKern,akPair,akSetSp,akSetKern,akSetStr,akApplyKern,spOf,AK:()=>D.ak,evalGlyph:()=>drnEval(cur.items),selAll,setSel,xf:()=>xfDraw(),XF,cl:{cellItems,CL_MAX,clStatus,curCell,cellN,cellSet,cellRegen,cellFlush,cellFlushAll,ANI,aniDur,fieldOf,DRC,drcInk,cellMirror}};}
})();
