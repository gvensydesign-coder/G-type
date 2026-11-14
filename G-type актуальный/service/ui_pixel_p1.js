/* ===== «Пиксель» (Pixel Grid): интерфейс =====
   Данные и движок — core_pixel_p1.js (FONTS.pixel.px). Здесь: переключатели формы пикселя / сдвига рядов / засечек вместо ползунков,
   инструменты «Пиксельная кисть» и «Пиксельная стёрка» в плавающей панели холста (только когда выбран этот шрифт), живой предпросмотр
   клетки под курсором, правки клеток в S.edits[знак].px[разрешение] = {a:[[x,y]..] добавлено, d:[[x,y]..] убрано} в координатах рецепта
   (до наклона), раздел панели «Пиксели»: ступени веса семейства, правки при смене разрешения (хранятся отдельно по разрешениям, перенос — кнопкой).
   Ничего не меняет у других шрифтов: все обёртки сразу возвращают исходное поведение, если CUR_FONT !== 'pixel'. */
(function(){
'use strict';
const isPx=()=>typeof CUR_FONT==='string'&&CUR_FONT==='pixel';
const API=()=>FONTS.pixel&&FONTS.pixel.px;
const MODES=['pxb','pxe'];
const isPxMode=m=>MODES.indexOf(m)>=0;
const ST={hover:null,drag:null,lastRes:null,seen:''};
/* сверка: острова <= 2 клеток и засечки без бокового касания — ошибка (читаются как точки и запятые) */
if(typeof proofChar==='function'){const _pc=proofChar;proofChar=function(ch,st,des){const r=_pc.apply(this,arguments);
  if(isPx()&&API()&&API().audit&&r&&r.issues){for(const t of API().audit(ch,st.p)){r.issues.push({lvl:2,t});r.lvl=2;}}return r;};}
/* ---------- подсказки ---------- */
Object.assign(PDESC,{
  res:'Сколько клеток укладывается в высоту прописной буквы. Меньше клеток — крупнее пиксель и грубее форма; больше — мельче и точнее.',
  pw:'Толщина штриха в клетках, шаг в полклетки. Ограничена разрешением и засечками: если толще, буквы теряют просветы. Предел показан на ползунке.',
  ptr:'Сколько пустых клеток между буквами.',
  pserif:'Пиксельные засечки: стойки получают ножки, верхние флажки — короткие полки. Диагонали и круглые концы остаются без засечек.',
  pshape:'Форма одной клетки: квадрат, круглая точка, скруглённый квадрат или ромб. Всё экспортируется настоящими контурами.',
  pgap:'Зазор между клетками в долях клетки. 0 — клетки сливаются в сплошной контур (у квадрата и скруглённого квадрата).',
  pstag:'Сдвиг клеток на четверть: ряды через один по горизонтали или колонки через одну по вертикали.'});
/* ---------- стили: кнопки режимов, скрытие чужих режимов ---------- */
const ico=d=>'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\''+d+'\'/%3E%3C/svg%3E")';
{const st=document.createElement('style');st.id='px-style';
 st.textContent='[data-mode=pxb]{--ic:'+ico('M5 19h4v-4H5z M9 15h4v-4H9z M13 11h4V7h-4z M17 7h3V4h-3z')+'}'
 +'[data-mode=pxe]{--ic:'+ico('M7 20h13 M5.5 13.5l8-8a2 2 0 013 0l3 3a2 2 0 010 3L12.5 20H8z M9.5 9.5l5 5')+'}'
 +'body:not(.px-on) .tools .seg button[data-mode^=px]{display:none}'
 +'body.px-on .tools .seg button:not([data-mode^=px]){display:none}'
 +'.ctl .pxs{display:flex;flex-wrap:wrap;margin-top:var(--s1)}'
 +'.ctl .pxs button{font-size:var(--fs-md);padding:0 var(--s3);height:var(--h-sm)}'
 +'#pxsec .pxn{font-size:var(--fs-md);color:var(--text-2);margin:var(--s2) 0}'
 +'#pxsec .pxn b{color:var(--text)}'
 +'#pxsec .pxn.warn{color:var(--warn-text)}'
 +'#pxsec table.pxt{width:100%;border-collapse:collapse;font-size:var(--fs-md)}'
 +'#pxsec table.pxt td,#pxsec table.pxt th{text-align:left;padding:var(--s1) var(--s2);border-bottom:1px solid var(--line);font-weight:var(--fw-r)}'
 +'#pxsec table.pxt th{color:var(--text-2);font-size:var(--fs-sm)}'
 +'#pxsec .pxb{display:flex;flex-wrap:wrap;gap:var(--s2);margin-top:var(--s2)}';
 document.head.appendChild(st);}
/* ---------- правки клеток ---------- */
const pxOf=(create)=>{let e=S.edits[S.sel];if(!e){if(!create)return null;S.edits[S.sel]={};e=S.edits[S.sel];}
  if(!e.px||typeof e.px!=='object'){if(!create)return null;e.px={};}
  const r=String(safeP(cur().p).res);let v=e.px[r];if(!v){if(!create)return null;v=e.px[r]={a:[],d:[]};}
  if(!Array.isArray(v.a))v.a=[];if(!Array.isArray(v.d))v.d=[];return v;};
const pxCount=v=>v?(v.a.length+v.d.length):0;
const hasPx=px=>!!px&&typeof px==='object'&&Object.keys(px).some(k=>pxCount(px[k])>0);
function pxTidy(){const e=S.edits[S.sel];if(!e||!e.px)return;
  for(const k of Object.keys(e.px)){const v=e.px[k];if(!v||!pxCount(v))delete e.px[k];}
  if(!Object.keys(e.px).length)delete e.px;
  cleanEdit();}
/* охват правок по всем знакам: {разрешение: число знаков} */
function pxCensus(){const o={};try{for(const ch of Object.keys(S.edits)){const e=S.edits[ch];if(e&&e.px)for(const r of Object.keys(e.px))if(pxCount(e.px[r]))o[r]=(o[r]||0)+1;}}catch(err){}return o;}
/* cleanEdit не знает про px: без обёртки он счёл бы знак «без правок» и удалил их */
const _clean_px=cleanEdit;
cleanEdit=function(){const e=S.edits[S.sel],px=e&&e.px;if(!hasPx(px))return _clean_px();
  delete e.px;try{_clean_px();}finally{const e2=S.edits[S.sel]||(S.edits[S.sel]={});e2.px=px;}};
/* ---------- клетка под курсором ---------- */
function cellAt(e){
  const [sx,sy]=pt(e),w=toW(sx,sy);const q=safeP(cur().p),u=q.pu;
  return [Math.floor(w[0]/u),Math.floor(w[1]/u)];}
function curInfo(){const A=API();return A&&A.info(S.sel,cur().p,S.edits[S.sel]&&S.edits[S.sel].px&&S.edits[S.sel].px[String(safeP(cur().p).res)]);}
/* одна клетка: op 'add' | 'del'; возвращает true, если что-то изменилось */
function paintCell(op,cx,cy){
  const A=API();if(!A||!GL[S.sel]||!GL[S.sel].px)return false;
  const i=curInfo();if(!i)return false;
  const have=i.cells.some(c=>c[0]===cx&&c[1]===cy);
  if(op==='add'&&have)return false;if(op==='del'&&!have)return false;
  const rec=A.toRecipe(S.sel,cur().p,cx,cy);if(!rec)return false;
  const v=pxOf(true),k=(c)=>c[0]===rec[0]&&c[1]===rec[1];
  const ia=v.a.findIndex(k),id=v.d.findIndex(k);
  if(op==='add'){if(id>=0)v.d.splice(id,1);else if(ia<0)v.a.push(rec);else return false;}
  else{if(ia>=0)v.a.splice(ia,1);else if(A.baseHas(S.sel,cur().p,rec[0],rec[1])){if(id<0)v.d.push(rec);else return false;}else return false;}
  return true;}
function paintLine(op,a,b){let [x0,y0]=a;const [x1,y1]=b;let ch=false;const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let er=dx-dy,n=0;
  for(;;){if(paintCell(op,x0,y0))ch=true;if((x0===x1&&y0===y1)||n++>400)break;const e2=2*er;if(e2>-dy){er-=dy;x0+=sx;}if(e2<dx){er+=dx;y0+=sy;}}
  return ch;}
function onPtr(kind,e){
  if(!isPx()||!isPxMode(S.mode))return;
  if(kind==='down'){if(e.button!==0)return;}
  const cv=$('#stage');if(!cv||e.target!==cv)return;
  const [sx,sy]=pt(e);
  if(sx<V.rul||sy<V.rul){if(kind!=='move')return;}
  if(kind==='down'){
    const op=(S.mode==='pxe')!==!!e.altKey?'del':'add';
    snap();ST.drag={op,last:null,changed:false,id:e.pointerId};
    try{cv.setPointerCapture(e.pointerId);}catch(_){}
    e.stopPropagation();e.preventDefault();
    const c=cellAt(e);ST.drag.last=c;if(paintCell(op,c[0],c[1])){ST.drag.changed=true;bump();}
    ST.hover=c;schedule();return;}
  if(kind==='move'){
    if(!ST.drag&&e.buttons)return;/* панорамирование средней/правой кнопкой — стандартный обработчик */
    const c=cellAt(e);
    if(ST.drag){e.stopPropagation();e.preventDefault();
      if(!ST.drag.last||c[0]!==ST.drag.last[0]||c[1]!==ST.drag.last[1]){if(paintLine(ST.drag.op,ST.drag.last||c,c)){ST.drag.changed=true;bump();}ST.drag.last=c;}}
    if(!ST.hover||ST.hover[0]!==c[0]||ST.hover[1]!==c[1]){ST.hover=c;schedule();}
    cv.style.cursor='crosshair';
    if(ST.drag)return;e.stopPropagation();return;}
  if(kind==='up'||kind==='cancel'){
    if(!ST.drag)return;e.stopPropagation();
    const d=ST.drag;ST.drag=null;
    if(!d.changed){undoStack.pop();}else{pxTidy();bump();}
    syncPanel();schedule();}}
/* перехват в фазе захвата: стандартные onDown/onMove/onUp ниже по цепочке не получают события в режимах кисти */
{const sb=document.getElementById('stagebox');
 if(sb){for(const [t,k] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancel']])sb.addEventListener(t,e=>onPtr(k,e),true);
   sb.addEventListener('pointerleave',()=>{if(ST.hover){ST.hover=null;schedule();}});}}
/* ---------- отрисовка: сетка, знак, клетка под курсором ---------- */
const _view=view;
view=function(){const g=_view.apply(this,arguments);
  if(isPx()&&V.t){V.t=0;V.wc=V.w;V.ox=$('#stage').getBoundingClientRect().width/2-(V.wc*V.sc)/2+S.view.px;}return g;};/* наклон считает сам шрифт: целыми клетками по рядам */
const _drawPoints=drawPoints,_drawSmart=drawSmart;
drawSmart=function(c){if(isPx()&&isPxMode(S.mode))return;return _drawSmart.apply(this,arguments);};
drawPoints=function(c,raw){
  if(!isPx()||!isPxMode(S.mode))return _drawPoints.apply(this,arguments);
  const A=API(),i=curInfo();if(!i)return _drawPoints.apply(this,arguments);
  const u=i.u,q=i.q,acc=css('--sel'),ink=css('--glyph');
  const x0=-4*u,x1=Math.max(V.w,i.w)+4*u,y0=-q.desc-2*u,y1=Math.max(q.asc,q.capH)+5*u;
  c.save();
  /* сетка клеток */
  c.lineWidth=1;c.strokeStyle=css('--line');c.globalAlpha=.9;c.beginPath();
  for(let x=Math.ceil(x0/u)*u;x<=x1;x+=u){const a=toS(x,y0),b=toS(x,y1);c.moveTo(a[0]+.5,a[1]);c.lineTo(b[0]+.5,b[1]);}
  for(let y=Math.ceil(y0/u)*u;y<=y1;y+=u){const a=toS(x0,y),b=toS(x1,y);c.moveTo(a[0],a[1]+.5);c.lineTo(b[0],b[1]+.5);}
  c.stroke();c.globalAlpha=1;
  /* строки: база, строчные, прописные */
  c.strokeStyle=css('--line-strong');c.beginPath();
  for(const y of [0,q.xh,q.capH]){const a=toS(x0,y),b=toS(x1,y);c.moveTo(a[0],a[1]+.5);c.lineTo(b[0],b[1]+.5);}
  c.stroke();
  /* знак */
  const fin=getFinal(S.sel,S.style,{warp:false,slant:true,subdiv:false,rough:false,keepOff:true,union:false});
  if(fin){c.fillStyle=ink;c.globalAlpha=.88;c.fill(pathOf(fin.cs,toS),'nonzero');c.globalAlpha=1;}
  /* правки: добавленные клетки обведены акцентом, убранные — пунктиром */
  const ed=S.edits[S.sel],pe=ed&&ed.px&&ed.px[String(q.res)];
  if(pe){const mapOut=(r)=>{const sx=r[0]+(i.st?Math.floor(r[1]/i.st):0)-i.ox;return [sx,r[1]];};
    c.lineWidth=2;c.strokeStyle=acc;for(const r of pe.a){const [cx,cy]=mapOut(r),a=toS(cx*u,cy*u),b=toS((cx+1)*u,(cy+1)*u);c.strokeRect(a[0]+1,b[1]+1,b[0]-a[0]-2,a[1]-b[1]-2);}
    c.setLineDash([3,3]);for(const r of pe.d){const [cx,cy]=mapOut(r),a=toS(cx*u,cy*u),b=toS((cx+1)*u,(cy+1)*u);c.strokeRect(a[0]+1,b[1]+1,b[0]-a[0]-2,a[1]-b[1]-2);}
    c.setLineDash([]);}
  /* курсор */
  if(ST.hover){const [cx,cy]=ST.hover,a=toS(cx*u,cy*u),b=toS((cx+1)*u,(cy+1)*u);
    c.fillStyle=acc;c.globalAlpha=.28;c.fillRect(a[0],b[1],b[0]-a[0],a[1]-b[1]);c.globalAlpha=1;
    c.strokeStyle=acc;c.lineWidth=2;c.strokeRect(a[0]+1,b[1]+1,b[0]-a[0]-2,a[1]-b[1]-2);}
  c.restore();};
/* ---------- панель параметров: переключатели вместо ползунков ---------- */
const SEGS={pshape:['Форма пикселя',['Квадрат','Точка','Скруглённый','Ромб']],pstag:['Сдвиг рядов',['Нет','Ряды','Колонки']],pserif:['Засечки',['Гротеск','С засечками']]};
const _buildPanel=buildPanel;
buildPanel=function(){_buildPanel.apply(this,arguments);
  if(!isPx())return;
  for(const key of Object.keys(SEGS)){const inp=$('#p_'+key);if(!inp)continue;const row=inp.closest('.ctl');if(!row||row.querySelector('.pxs'))continue;
    inp.hidden=true;inp.style.display='none';const lim=row.querySelector('.limh');if(lim)lim.remove();
    const out=$('#o_'+key);if(out)out.hidden=true;
    const seg=document.createElement('div');seg.className='seg pxs';seg.setAttribute('role','group');seg.setAttribute('aria-label',SEGS[key][0]);seg.dataset.pxk=key;
    SEGS[key][1].forEach((t,v)=>{const b=document.createElement('button');b.type='button';b.dataset.v=v;b.textContent=t;
      b.addEventListener('click',()=>{snap();cur().p[key]=v;bump();syncPanel();});seg.appendChild(b);});
    row.appendChild(seg);}
  const pg=$('#p_pgap');if(pg){/* зазор — только когда он что-то меняет */}
};
function segSync(){const q=safeP(cur().p);
  $$('.pxs').forEach(s=>{const v=+q[s.dataset.pxk];s.querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.v===v));});}
/* ---------- кнопки режимов на панели холста ---------- */
function mountTools(){
  const seg=$('[aria-label="Режим"]');if(!seg)return;
  for(const [m,t,d] of [['pxb','Кисть','Пиксельная кисть: клик или протяжка закрашивает клетки сетки. С зажатым Alt — стирает.'],['pxe','Стёрка','Пиксельная стёрка: клик или протяжка убирает клетки сетки.']]){
    if($('[data-mode='+m+']'))continue;
    const b=document.createElement('button');b.type='button';b.dataset.mode=m;b.textContent='Пиксельная '+(m==='pxb'?'кисть':'стёрка');b.title=d;b.setAttribute('aria-label',b.textContent);
    b.addEventListener('click',()=>{S.mode=m;S.node=null;syncPanel();schedule();});seg.appendChild(b);}}
/* ---------- раздел «Пиксели» ---------- */
function mountSection(){
  const pan=$('.panel');if(!pan||$('#pxsec'))return;
  const q=document.createElement('details');q.id='pxsec';q.open=true;q.hidden=true;
  q.innerHTML='<summary>Пиксели</summary><div class="cus" id="pxbody"></div>';
  const ps=$('#pensec');if(ps&&ps.parentNode===pan)pan.insertBefore(q,ps.nextSibling);else pan.insertBefore(q,pan.firstChild);}
const fx=v=>(Math.round(v*10)/10).toString().replace('.',',');
function syncSection(){
  const sec=$('#pxsec');if(!sec)return;sec.hidden=!isPx();if(!isPx())return;
  const body=$('#pxbody'),A=API();if(!body||!A)return;
  const p=cur().p,q=safeP(p),f=A.fam(p);
  const cen=pxCensus(),here=pxCount((S.edits[S.sel]&&S.edits[S.sel].px&&S.edits[S.sel].px[String(q.res)])||null);
  const others=Object.keys(cen).filter(r=>+r!==q.res).sort((a,b)=>a-b);
  const rows=f.rows.map(r=>'<tr><td>'+r.name+'</td><td>'+fx(r.pw)+' px</td><td>'+r.sv+' × '+r.sh+'</td></tr>').join('');
  const warn=f.collapsed?'При разрешении '+q.res+' клеток '+(q.pserif?'с засечками ':'')+'самые тяжёлые веса не помещаются: пределы сетки сводят соседние начертания в одно.':(f.boldK<1.25-1e-9?'Жирный толще обычного в '+fx(f.boldK)+' раза: у этого разрешения нет места для 1,25×.':'');
  const hint='Режим «Пиксельная кисть» и «Пиксельная стёрка» — на панели холста. Правки лежат отдельно для каждого разрешения и хранятся в проекте.';
  let notes='';
  if(others.length)notes+='<div class="pxn warn">Есть правки для других разрешений: '+others.map(r=>r+' ('+cen[r]+' '+(cen[r]===1?'знак':'знаков')+')').join(', ')+'. Они не потеряны — вернитесь к этому разрешению или перенесите сюда.</div>';
  const cur1=cen[String(q.res)]||0;
  notes+='<div class="pxn">Правки на разрешении '+q.res+': <b>'+cur1+'</b> '+(cur1===1?'знак':'знаков')+(here?'; у этого знака '+here+' клет.':'')+'</div>';
  body.innerHTML='<div class="pxn">'+hint+'</div>'
    +'<table class="pxt"><thead><tr><th>Вес семейства</th><th>Штрих</th><th>Стойка × перекладина</th></tr></thead><tbody>'+rows+'</tbody></table>'
    +(warn?'<div class="pxn warn">'+warn+'</div>':'<div class="pxn">Жирный толще обычного в <b>'+fx(f.boldK)+'</b> раза. Предел насыщенности на этом разрешении: <b>'+fx(f.max)+' px</b>.</div>')
    +notes
    +'<div class="pxb">'+(others.length?'<select class="sel" id="px-src" aria-label="Откуда переносить" title="С какого разрешения перенести правки">'+others.map(r=>'<option value="'+r+'">С разрешения '+r+'</option>').join('')+'</select><button class="btn sm" id="px-mv" type="button" title="Правки выбранного разрешения переносятся на ближайшие клетки текущей сетки; исходные правки остаются">Перенести правки</button>':'')
    +'<button class="btn sm" id="px-rs" type="button" title="Убрать пиксельные правки этого знака на текущем разрешении"'+(here?'':' disabled')+'>Сбросить правки знака</button></div>';
  const mv=$('#px-mv');if(mv)mv.addEventListener('click',()=>{const r0=+$('#px-src').value;remapAll(r0,q.res);});
  const rs=$('#px-rs');if(rs)rs.addEventListener('click',()=>{const e=S.edits[S.sel];if(!e||!e.px||!e.px[String(q.res)])return;snap();delete e.px[String(q.res)];pxTidy();bump();syncPanel();toast('Правки знака на разрешении '+q.res+' сброшены (Отменить вернёт)');});}
/* перенос: правки всех знаков с разрешения r0 на ближайшие клетки разрешения r1; обратимо одним шагом */
function remapAll(r0,r1){const A=API();if(!A)return;snap();let n=0,m=0;
  for(const ch of Object.keys(S.edits)){const e=S.edits[ch];if(!e||!e.px||!pxCount(e.px[String(r0)]))continue;
    const t=A.remap(e.px[String(r0)],r0,r1),cur0=e.px[String(r1)]||{a:[],d:[]};
    const has=(l,c)=>l.some(x=>x[0]===c[0]&&x[1]===c[1]);
    for(const c of t.a){if(!has(cur0.a,c)){cur0.a.push(c);m++;}const j=cur0.d.findIndex(x=>x[0]===c[0]&&x[1]===c[1]);if(j>=0)cur0.d.splice(j,1);}
    for(const c of t.d){if(!has(cur0.d,c)&&!has(cur0.a,c)){cur0.d.push(c);m++;}}
    e.px[String(r1)]=cur0;n++;}
  bump();syncPanel();toast('Перенесено правок: '+m+' в '+n+' '+(n===1?'знаке':'знаках')+' · разрешение '+r0+' → '+r1+' (Отменить вернёт)');}
/* ---------- синхронизация панели ---------- */
const _syncPanel=syncPanel;
syncPanel=function(){
  const on=isPx();document.body.classList.toggle('px-on',on);
  if(on&&!isPxMode(S.mode))S.mode='pxb';
  if(!on&&isPxMode(S.mode))S.mode='points';
  _syncPanel.apply(this,arguments);
  mountTools();mountSection();
  if(on){const b=$('[data-mode='+S.mode+']');$$('.tools [data-mode]').forEach(x=>x.classList.toggle('on',x.dataset.mode===S.mode));
    const nb=$('#nbtns');if(nb)nb.style.visibility='hidden';const ni=$('#ninfo');if(ni)ni.textContent=S.mode==='pxb'?'Кисть: клик или протяжка закрашивает клетки · Alt стирает':'Стёрка: клик или протяжка убирает клетки';
    segSync();
    /* смена разрешения: правки других разрешений не теряются, об этом сообщаем один раз */
    const r=safeP(cur().p).res;
    if(ST.lastRes!=null&&ST.lastRes!==r){const c=pxCensus(),o=Object.keys(c).filter(k=>+k!==r);
      if(o.length)toast('Пиксельные правки хранятся отдельно для каждого разрешения: сейчас '+r+', правки есть для '+o.join(', ')+'. Раздел «Пиксели» — перенос.');}
    ST.lastRes=r;}
  else ST.lastRes=null;
  syncSection();};
document.addEventListener('DOMContentLoaded',()=>{mountTools();mountSection();syncPanel();});
})();
