/* ===== «Свой шрифт из файлов»: библиотека знаков, загрузка SVG, панель знака, хранение =====
   Данные и движок — core21.js / core21b.js (IMP). Здесь только интерфейс:
   — карточка «Собрать из своих знаков» на странице «Шрифты» и кнопка в шапке; полноэкранная библиотека ячеек
     (Латиница / Кириллица × Базовые / Расширенные), перетаскивание файла в ячейку, пакетная загрузка по имени файла;
   — шрифт «Свой шрифт» (FONTS.imp) появляется в списке шрифтов после первой загрузки; панель «Знак из файла» в редакторе;
   — хранение: знаки лежат в проекте (файл) и отдельным ключом localStorage; не поместились — остаются в памяти,
     интерфейс просит сохранить проект файлом.
   Подключается обёртками (как ui_custom.js): функции других файлов не правятся. */
const IMPKEY='gtype-imp-v1';
const IU={empty:false,sc:'lat',lv:'basic',pick:null,pending:[],open:false,busy:false,quota:false,lsVer:-1,pop:null,regT:0,popCh:null,redo:[]};
const iuEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iuName=ch=>{if(ch===' ')return 'пробел';if(IMP_ISMARK(ch)){const m=IMPT.MARKS.find(x=>x[0]===ch);return m?m[2]:'знак';}return ch;};
const iuOwn=ch=>!!(IMP.glyphs[ch]&&IMP.glyphs[ch].c&&IMP.glyphs[ch].c.length);
/* ---------- хранение ---------- */
const _projectJSON_imp=projectJSON;
projectJSON=function(){const o=_projectJSON_imp();if(!IU.skipPack){const p=impPack();if(p)o.imp=p;}return o;};
/* знаки в localStorage — отдельным ключом и один раз: в общий проект они не попадают (IU.skipPack),
   строка собирается только при изменении набора и нигде не копится */
function iuSaveLS(){
  if(IU.lsVer===IMP.ver)return;
  try{const p=impPack();if(p)localStorage.setItem(IMPKEY,JSON.stringify(p));else localStorage.removeItem(IMPKEY);IU.lsVer=IMP.ver;IU.quota=false;iuQuotaUI();}
  catch(e){if(!storeOk()){noStoreNote();return;}IU.quota=true;iuQuotaUI();if(!IU.warned){IU.warned=true;toast('Знаки не помещаются в память браузера — сохраните проект файлом');}}}
const _persistWrite_base=persistWrite;
persistWrite=function(){IU.skipPack=true;try{_persistWrite_base();}finally{IU.skipPack=false;}iuSaveLS();};
const _applyProject_imp=applyProject;
applyProject=function(pr){
  if(pr&&typeof pr==='object'){
    if(!IU.booted){IU.booted=true;if(!pr.imp){try{const s=localStorage.getItem(IMPKEY);if(s)pr=Object.assign({},pr,{imp:JSON.parse(s)});}catch(e){}}}
    if(pr.imp){impUnpack(pr.imp);IU.lsVer=-1;impRegister();iuSyncDefaults(true);if(typeof buildLibrary==='function'&&document.getElementById('libcards'))buildLibrary();}}
  const r=_applyProject_imp(pr);
  if(IU.open)iuRender();
  return r;};
function iuQuotaUI(){const q=document.getElementById('imp-quota');if(q)q.hidden=!IU.quota;}
/* ---------- значения по умолчанию шрифта следуют за набором ---------- */
function iuSyncDefaults(){
  const F=FONTS.imp;if(!F||!IMP.ready)return;
  const old=IU.dold,nw=F.DEFAULTS;IU.dold=JSON.parse(JSON.stringify(nw));
  const sl=S.lib.imp;if(!sl||!old)return;
  const st=(S.fontId==='imp')?S.styles:sl.styles;
  for(const k of ['regular','italic'])if(st&&st[k])for(const q of ['capH','xh','asc','desc','stem','hair','sb','space']){
    const p=st[k].p;if(p[q]==null||Math.abs(p[q]-old[k][q])<1e-9)p[q]=nw[k][q];}}
/* ---------- пересборка шрифта ---------- */
function iuRegisterNow(){
  clearTimeout(IU.regT);const had=!!FONTS.imp;
  const F=impRegister();
  /* образец: если набор только латинский или только кириллический */
  if(F){const has=s=>{let n=0,t=0;for(const c of s){if(c===' ')continue;t++;if(F.GL[c])n++;}return t?n/t:1;};
    F.sampleText=undefined;
    if(has(S.text)<0.7){const cand=['Съешь ещё этих мягких французских булок, да выпей чаю','Pack my box with five dozen liquor jugs 0123456789','Аа Бб Вв Гг Дд Ее 123','Aa Bb Cc Dd Ee 123'];
      let best=cand[3],bv=-1;for(const t of cand){const v=has(t);if(v>=0.95){best=t;break;}if(v>bv){bv=v;best=t;}}F.sampleText=best;}}
  iuSyncDefaults();
  if(F&&!had){S.lib.imp=S.lib.imp||mkSlot('imp');iuSyncDefaults();}
  if(typeof buildLibrary==='function')buildLibrary();
  if(S.fontId==='imp'){
    if(!FONTS.imp){switchFont('volt');}
    else{useFont('imp');cache.clear();DESIGN=null;if(typeof TWC!=='undefined')TWC.delete('imp');
      if(!GL[S.sel])S.sel=CHARSET.find(c=>GL[c]&&c!==' ')||S.sel;
      buildGlyphList();syncPanel();bump();}}
  else if(typeof drawLibrary==='function')drawLibrary();
  if(typeof persist==='function')persist();
  iuRender();iuSyncPanel();}
/* ---------- загрузка файлов ---------- */
const iuTick=()=>new Promise(r=>setTimeout(r,0));
function iuCharOk(ch){return typeof ch==='string'&&Array.from(ch).length===1&&ch.length===1&&ch.charCodeAt(0)>0x20&&!(ch.charCodeAt(0)>=0x7F&&ch.charCodeAt(0)<=0xA0)&&!(ch.charCodeAt(0)>=0xD800&&ch.charCodeAt(0)<=0xDFFF);}
function iuStatus(t,bad){const el=document.getElementById('imp-status');if(!el)return;el.textContent=t||'';el.classList.toggle('bad',!!bad);}
async function iuIngest(files,forced){
  if(IU.busy)return;IU.busy=true;
  const all=[...files],list=all.filter(f=>/\.svg$/i.test(f.name)||f.type==='image/svg+xml');
  const rast=all.filter(f=>!list.includes(f)&&trIsRaster(f));
  const notSvg=all.filter(f=>!list.includes(f)&&!rast.includes(f)).map(f=>f.name);
  /* одна картинка и понятно, чей это знак — окно предпросмотра с ползунками */
  if(rast.length===1&&!list.length&&!notSvg.length){const c1=forced||impNameToChar(rast[0].name);
    if(c1&&iuCharOk(c1)){IU.busy=false;trStart(c1,rast[0]);return;}}
  const okSet=new Set(),dups=[],warn=new Set(),miss=[],bad=[],empty=[],cplx=[],got={};
  let t0=performance.now();const big=list.length>8;let snapped=false;
  const tr={ok:[],bad:[],empty:[],cplx:[],miss:[]};
  try{
    if(rast.length){const r=await trBatch(rast,forced,(i,n,nm)=>iuStatus('Обвожу картинку '+i+' из '+n+': '+nm+'…'));
      for(const k in tr)tr[k]=r[k];for(const c of r.ok)okSet.add(c);snapped=r.ok.length>0;}
    for(let i=0;i<list.length;i++){
      const f=list[i];let text='';
      if(performance.now()-t0>40||big&&i%4===0){iuStatus((big?'Загрузка ':'Разбор ')+(i+1)+' из '+list.length+': '+f.name+'…');await iuTick();t0=performance.now();}
      try{text=await f.text();}catch(e){bad.push(f.name);continue;}
      const ch=forced||impNameToChar(f.name);
      if(!ch||!iuCharOk(ch)){miss.push({name:f.name,text});continue;}
      if(!snapped){snap();snapped=true;}
      let r;try{r=impSet(ch,text,f.name);}catch(e){r={ok:false,reason:'bad'};}
      if(!r.ok){if(r.reason==='complex')cplx.push(f.name+' ('+r.n+')');else if(r.reason==='bad')bad.push(f.name);else empty.push(f.name);continue;}
      if(got[ch]!=null)dups.push(ch+' ('+got[ch]+' → '+f.name+')');
      got[ch]=f.name;okSet.add(ch);for(const w of r.warn)warn.add(w);}
  }finally{IU.busy=false;}
  miss.push(...tr.miss.map(n=>({name:n,text:''})));
  if(miss.length)IU.pending=IU.pending.concat(miss).slice(-60);
  iuStatus('');
  const ok=okSet.size;
  if(ok){iuRegisterNow();}else iuRender();
  /* FX80 C02: один счёт непринятых файлов и список «файл — причина» (в тосте только число) */
  const fails=[];
  const addF=(arr,why)=>{for(const n of arr)fails.push(String(n)+' — '+why);};
  addF(miss.map(m=>m.name),'не понятно, какой это знак (имя файла)');
  addF(bad,'не удалось прочитать SVG');
  addF(empty,'нет контуров (только текст, изображение или пустой файл)');
  addF(cplx,'слишком сложный знак, упростите контуры (до '+IMP_MAXSUB+')');
  addF(notSvg,'не SVG и не PNG/JPG/WEBP');
  addF(tr.bad,'картинка не открылась');
  addF(tr.empty,'в картинке нет контуров (порог можно поменять через загрузку в ячейку)');
  addF(tr.cplx,'слишком сложная картинка (до '+TRC.MAXC+' контуров)');
  const parts=[],probs=[];
  if(ok)parts.push('Загружено знаков: '+ok);
  if(dups.length){parts.push(dups.length===1?dups[0].split(' ')[0]+': дубликат, взят последний':'дубликатов: '+dups.length+', взят последний');probs.push('Дубликаты (взят последний): '+dups.slice(0,5).join(', ')+(dups.length>5?' и ещё '+(dups.length-5):''));}
  if(fails.length){parts.push('не принято файлов: '+fails.length+' (список ниже)');probs.push('Не принято файлов: '+fails.length+'.');
    for(const f of fails.slice(0,8))probs.push(f);if(fails.length>8)probs.push('…и ещё '+(fails.length-8));}
  const wm={white:'белые заливки пропущены, отверстия из них не вырезаются',text:'текст не импортируется',image:'изображения пропущены',clip:'обтравка не учитывается',mask:'маски не учитываются',dash:'пунктир заменён сплошной линией',paint:'градиенты заменены чёрным',foreignobject:'вставки пропущены'};
  const ws=[...warn].map(w=>wm[w]).filter(Boolean);
  if(parts.length)toast(parts.join(' · ')+(ws.length?' ('+ws.join('; ')+')':''));
  else toast('Нет файлов для загрузки');
  if(probs.length)iuStatus(probs.join('\n'),true);
}
/* ---------- рисунок знака в ячейке ---------- */
function iuCsOf(ch){
  if(iuOwn(ch)||IMP_ISMARK(ch)){const N=impNorm(ch);return N?{cs:N.cs,w:N.W,own:true}:null;}
  const F=FONTS.imp;if(!F||!F.GL[ch])return null;
  try{const p=F.DEFAULTS.regular,d=F.GL[ch],w=typeof d.w==='function'?d.w(p):d.w,g=makeG(p,w,d.k==='xh'?p.xh:p.capH);const cs=d.shape(g)||[];return {cs,w,own:false};}catch(e){return null;}}
function iuPathD(cs){let d='';const f=v=>Math.round(v*10)/10;
  for(const c of cs){const n=c.nodes;if(!n||n.length<2)continue;d+='M'+f(n[0].x)+' '+f(n[0].y);
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if(a.b||b.a){const p1=a.b||a,p2=b.a||b;d+='C'+f(p1.x)+' '+f(p1.y)+' '+f(p2.x)+' '+f(p2.y)+' '+f(b.x)+' '+f(b.y);}else d+='L'+f(b.x)+' '+f(b.y);}
    d+='Z';}return d;}
function iuSvg(ch,o){
  o=o||{};const M=IMP.M,r=iuCsOf(ch);
  const H=M.asc+M.desc+90,y0=-(M.asc+40),vw=o.vw||1160;
  if(!r||!r.cs.length)return '';
  const mark=IMP_ISMARK(ch),bb=impBBox(r.cs);
  const cx=mark&&bb?(bb.x0+bb.x1)/2:r.w/2;
  const ty=mark?((M.cap)-(bb.y0+bb.y1)/2)*0:0;
  const guides=o.guides?`<g stroke="currentColor" stroke-opacity=".18" stroke-width="3" fill="none"><line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="0" y2="0"/><line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="${-M.xh}" y2="${-M.xh}"/><line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="${-M.cap}" y2="${-M.cap}"/><line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="${-M.asc}" y2="${-M.asc}"/><line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="${M.desc}" y2="${M.desc}"/></g>`
    :`<line x1="${cx-vw/2}" x2="${cx+vw/2}" y1="0" y2="0" stroke="currentColor" stroke-opacity=".14" stroke-width="4"/>`;
  return `<svg viewBox="${(cx-vw/2).toFixed(0)} ${y0} ${vw} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${guides}<path transform="scale(1,-1)" fill="currentColor" fill-rule="nonzero" d="${iuPathD(r.cs)}"/></svg>`;}
/* ---------- разметка ---------- */
function iuLevelCount(sc,lv){const S0=impSlots()[sc][lv];let n=0,t=0;for(const g of S0)for(const c of g.chars){t++;if(iuOwn(c))n++;}return [n,t];}
function iuGroupCount(g){let n=0,a=0;for(const c of g.chars){if(iuOwn(c))n++;else if(FONTS.imp&&FONTS.imp.GL[c]&&!IMP_ISMARK(c))a++;}return [n,g.chars.length,a];}
function iuBuildView(){
  if(document.getElementById('view-imp'))return;
  const v=document.createElement('section');v.className='impview';v.id='view-imp';v.hidden=true;v.setAttribute('aria-label','Библиотека знаков');
  v.innerHTML=`<div class="imp-top" id="imp-head">
    <h1 class="imp-h">Свой шрифт из <em>файлов</em></h1>
    <div class="imp-bar"><div class="seg" id="imp-sc" role="group" aria-label="Письменность"><button type="button" data-sc="lat">Латиница</button><button type="button" data-sc="cyr">Кириллица</button></div>
      <div class="seg" id="imp-lv" role="group" aria-label="Набор"><button type="button" data-lv="basic">Базовые</button><button type="button" data-lv="ext">Расширенные</button></div></div>
    <span class="imp-sp"></span>
    <div class="imp-act"><label class="btn imp-up" tabindex="0"><i class="ico i-plus"></i><span>Загрузить файлы</span><input type="file" id="imp-files" accept=".svg,image/svg+xml,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" multiple></label>
      <label class="btn imp-dir" title="Выбрать папку со знаками"><i class="ico i-folder"></i><span>Папкой</span><input type="file" id="imp-dir" webkitdirectory multiple></label>
      <button class="btn imp-go" id="imp-build" type="button"><i class="ico i-check"></i><span>Скачать шрифт</span></button></div>
  </div>
  <div class="imp-status" id="imp-status" role="status"></div>
  <div class="imp-quota" id="imp-quota" hidden><b>Не поместилось в память браузера.</b> Знаки остаются на странице, но после перезагрузки пропадут: сохраните проект файлом (значок папки слева).</div>
  <div class="imp-pend" id="imp-pend" hidden></div>
  <div class="imp-body">
    <div class="imp-lib" id="imp-lib"></div>
    <aside class="imp-side dw" id="imp-side" aria-label="Параметры набора" data-open="0" inert aria-hidden="true">
      ${paneHTML('imp-up','Загрузка','<button type="button" class="imp-dz" id="imp-dz"><i class="ico i-plus"></i><b>Перетащите файлы сюда</b><span>SVG, PNG, JPG, WEBP — картинки обведутся в контур. Имя файла подскажет знак: A.svg, Ж.svg, U+0416.svg, A_upper.svg, a_lower.svg. Размеры и базовая линия выровняются сами.</span></button>',{hid:'dr-ph-up',cls:'line'})}
      ${paneHTML('imp-opt','Параметры набора','<div class="imp-opts" role="group" aria-label="Параметры набора"><label class="imp-chk"><input type="checkbox" id="imp-emp"><span>Только пустые</span></label><label class="imp-chk"><input type="checkbox" id="imp-auto" checked><span>Заполнять недостающие автоматически</span></label><button class="btn imp-clear" id="imp-clear" type="button">Очистить набор</button></div>',{hid:'dr-ph-opt',cls:'line'})}
      ${paneHTML('imp-pv','Предпросмотр','<div class="imp-pvl" id="imp-pvl"><p class="imp-pve">Загрузите знаки, и здесь появится ваш набор.</p></div>',{hid:'dr-ph-pv',cls:'line'})}
      ${paneHTML('imp-lg','Языки набора','<div id="imp-lgh"></div>',{hid:'dr-ph-lg',cls:'line'})}
    </aside>
  </div>
  <div class="imp-drop" id="imp-drop" hidden><div>Отпустите файлы SVG или картинки<br><small>имя файла подскажет, какой это знак</small></div></div>`;
  const app=document.querySelector('.app');const lib=document.getElementById('view-lib');
  (lib&&lib.parentNode?lib.parentNode:app).insertBefore(v,lib?lib.nextSibling:null);
  v.querySelectorAll('.pane').forEach(pn=>paneInit(pn,pn.dataset.pane,true));
  v.querySelector('#imp-dz').addEventListener('click',()=>v.querySelector('#imp-files').click());
  /* блок «Языки вашего набора» создаёт ui_lang_l1.js; переносим его в панель */
  {const host=v.querySelector('#imp-lgh'),mv=()=>{const l=document.getElementById('imp-lang');if(l&&l.parentNode!==host)host.appendChild(l);};
   new MutationObserver(mv).observe(v,{childList:true,subtree:true});mv();}
  /* верхние кнопки */
  v.querySelector('#imp-files').addEventListener('change',e=>{const f=[...e.target.files];e.target.value='';if(f.length)iuIngest(f);});
  v.querySelector('#imp-dir').addEventListener('change',e=>{const f=[...e.target.files];e.target.value='';if(f.length)iuIngest(f);});
  v.querySelector('#imp-build').addEventListener('click',()=>{
    if(!impHasInk()){toast('Сначала загрузите хотя бы один знак');return;}
    iuRegisterNow();iuClose();if(S.fontId!=='imp')switchFont('imp');setTab('edit');});
  v.querySelectorAll('#imp-sc button').forEach(b=>b.addEventListener('click',()=>{IU.sc=b.dataset.sc;iuRender();}));
  v.querySelectorAll('#imp-lv button').forEach(b=>b.addEventListener('click',()=>{IU.lv=b.dataset.lv;iuRender();}));
  v.querySelector('#imp-emp').addEventListener('change',e=>{IU.empty=e.target.checked;iuRender();});
  v.querySelector('#imp-auto').addEventListener('change',e=>{IMP.autoFill=e.target.checked;IMP.ver++;iuRegisterNow();});
  v.querySelector('#imp-clear').addEventListener('click',e=>{if(!impHasInk())return;const b=e.currentTarget;
    /* подтверждение вторым нажатием (системные диалоги в песочнице не работают) */
    if(!b.dataset.arm){b.dataset.arm='1';b.dataset.t0=b.textContent;b.textContent='Удалить все знаки?';clearTimeout(b._t);b._t=setTimeout(()=>{delete b.dataset.arm;b.textContent=b.dataset.t0;},3000);return;}
    delete b.dataset.arm;clearTimeout(b._t);b.textContent=b.dataset.t0;
    for(const k of Object.keys(IMP.glyphs))delete IMP.glyphs[k];IMP.ver++;IU.pending=[];delete S.lib.imp;iuRegisterNow();toast('Набор очищен');});
  /* перетаскивание файлов на всё окно */
  let dc=0;const dz=v.querySelector('#imp-drop');
  const hasFiles=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
  v.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();dc++;dz.hidden=false;});
  v.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';});
  v.addEventListener('dragleave',e=>{if(!hasFiles(e))return;dc=Math.max(0,dc-1);if(!dc)dz.hidden=true;});
  v.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();dc=0;dz.hidden=true;
    const t=e.target.closest&&e.target.closest('.imp-slot');
    const files=[...e.dataTransfer.files];if(!files.length)return;
    if(t&&files.length===1){iuIngest(files,t.dataset.ch);}else iuIngest(files);});
}
function iuRender(){
  const v=document.getElementById('view-imp');if(!v)return;
  const sl=impSlots();
  v.querySelectorAll('#imp-sc button').forEach(b=>{const [n,t]=['basic','ext'].map(lv=>iuLevelCount(b.dataset.sc,lv)).reduce((a,c)=>[a[0]+c[0],a[1]+c[1]],[0,0]);
    b.classList.toggle('on',b.dataset.sc===IU.sc);b.textContent=(b.dataset.sc==='lat'?'Латиница':'Кириллица');b.title=n+' из '+t+' знаков';});
  v.querySelectorAll('#imp-lv button').forEach(b=>{const [n,t]=iuLevelCount(IU.sc,b.dataset.lv);b.classList.toggle('on',b.dataset.lv===IU.lv);
    b.textContent=(b.dataset.lv==='basic'?'Базовые':'Расширенные');b.title=n+' из '+t+' знаков';});
  const em=v.querySelector('#imp-emp');if(em)em.checked=IU.empty;
  const au=v.querySelector('#imp-auto');if(au)au.checked=IMP.autoFill!==false;
  const bb=v.querySelector('#imp-build');if(bb){bb.disabled=!impHasInk();}
  iuQuotaUI();
  /* нераспознанные файлы */
  const pe=v.querySelector('#imp-pend');
  if(IU.pending.length){pe.hidden=false;
    pe.innerHTML='<div class="pt"><b>Имя не распознано: '+IU.pending.length+'.</b> '+(IU.pick!=null?'Нажмите ячейку для файла «'+iuEsc(IU.pending[IU.pick].name)+'».':'Нажмите файл, затем ячейку, куда его поставить. Или переименуйте: A.svg, Ж.svg, U+0416.svg, A_upper.svg.')+'</div><div class="pc">'
      +IU.pending.map((f,i)=>'<button type="button" class="chip'+(IU.pick===i?' on':'')+'" data-i="'+i+'">'+iuEsc(f.name)+'</button>').join('')+'<button type="button" class="chip" data-x="1">Скрыть</button></div>';
    pe.querySelectorAll('button[data-i]').forEach(b=>b.addEventListener('click',()=>{IU.pick=IU.pick===+b.dataset.i?null:+b.dataset.i;iuRender();}));
    pe.querySelector('button[data-x]').addEventListener('click',()=>{IU.pending=[];IU.pick=null;iuRender();});}
  else{pe.hidden=true;IU.pick=null;}
  /* ячейки */
  const box=v.querySelector('#imp-lib');box.innerHTML='';
  const groups=sl[IU.sc][IU.lv];
  for(const g of groups){
    const [n,t,a]=iuGroupCount(g);
    const sec=document.createElement('section');sec.className='imp-grp';
    sec.innerHTML='<header><h3>'+g.title+'</h3><span class="cnt"><b>'+n+'</b> / '+t+(a?' <em>+'+a+' авто</em>':'')+'</span></header><div class="imp-grid"></div>';
    const grid=sec.querySelector('.imp-grid');
    for(const ch of g.chars){
      if(IU.empty&&iuOwn(ch))continue;
      const own=iuOwn(ch),F=FONTS.imp,auto=!own&&!IMP_ISMARK(ch)&&F&&F.GL[ch];
      const b=document.createElement('button');b.type='button';b.className='imp-slot '+(own?'own':auto?'auto':'empty');b.dataset.ch=ch;
      b.setAttribute('aria-label',(own?'Знак ':'Пустая ячейка ')+iuName(ch));
      const st=IMP.status&&IMP.status[ch];
      const hex='U+'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'),isL=/\p{L}/u.test(ch)&&ch.toLowerCase()!==ch.toUpperCase();
      const hint=ch+'.svg'+(isL?' · '+ch+(ch===ch.toUpperCase()?'_upper':'_lower')+'.svg':'')+' · '+hex;
      if(!(own||auto))b.title='Файл: '+hint;
      b.innerHTML='<span class="pv">'+(own||auto?iuSvg(ch):'<span class="big" aria-hidden="true">'+iuEsc(IMP_ISMARK(ch)?'\u25CC'+ch:ch)+'</span><i class="ico i-plus pl"></i>')+'</span><span class="lb">'+iuEsc(IMP_ISMARK(ch)?iuName(ch):(own||auto?ch:hex))+'</span>'
        +(auto?'<span class="tg" title="'+(st&&st.from?'Из знака '+iuEsc(st.from):'Собрано автоматически')+'">авто</span>':'')
        +(own&&IMP.warn[ch]?'<span class="wr" title="Часть файла пропущена (текст, изображение, маска, белая заливка)">!</span>':'');
      b.addEventListener('click',()=>iuSlotClick(ch,b));
      b.addEventListener('dragover',e=>{if(e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files')){e.preventDefault();b.classList.add('ov');}});
      b.addEventListener('dragleave',()=>b.classList.remove('ov'));
      b.addEventListener('drop',()=>b.classList.remove('ov'));
      grid.appendChild(b);}
    if(IU.empty&&!grid.children.length)continue;
    box.appendChild(sec);}
  try{iuPreview(v);}catch(e){}
}
function iuPreview(v){
  const box=v.querySelector('#imp-pvl');if(!box)return;
  const own=Object.keys(IMP.glyphs).filter(iuOwn).slice(0,40);
  box.innerHTML=own.length?own.map(ch=>'<span class="pvc" title="'+iuEsc(iuName(ch))+'">'+iuSvg(ch)+'</span>').join('')+(Object.keys(IMP.glyphs).filter(iuOwn).length>40?'<span class="imp-pve">…</span>':''):'<p class="imp-pve">Загрузите знаки, и здесь появится ваш набор.</p>';}
let iuFile=null;
function iuPickFile(ch){
  if(!iuFile){iuFile=document.createElement('input');iuFile.type='file';iuFile.accept='.svg,image/svg+xml,.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';iuFile.style.display='none';document.body.appendChild(iuFile);}
  iuFile.onchange=()=>{const f=[...iuFile.files];iuFile.value='';if(f.length)iuIngest(f,ch);};
  iuFile.click();}
function iuSlotClick(ch,btn){
  if(IU.pick!=null&&IU.pending[IU.pick]){const it=IU.pending[IU.pick];const r=impSet(ch,it.text,it.name);
    if(r.ok){IU.pending.splice(IU.pick,1);IU.pick=null;iuRegisterNow();toast('Знак «'+iuName(ch)+'» загружен');}else toast('В файле нет контуров');return;}
  if(!iuOwn(ch)){iuPickFile(ch);return;}
  iuPop(ch,btn);}
/* ---------- карточка знака: файл, смещение, масштаб ---------- */
function iuPopClose(){const p=document.getElementById('imp-pop');if(p)p.remove();IU.popCh=null;}
function iuPop(ch,btn){
  iuPopClose();const r=IMP.glyphs[ch];if(!r)return;
  IU.popCh=ch;
  const p=document.createElement('div');p.className='imp-pop';p.id='imp-pop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Знак '+iuName(ch));
  const a=r.adj||{};
  p.innerHTML=`<div class="pv" id="ip-pv">${iuSvg(ch,{guides:true,vw:1000})}</div>
    <div class="pn"><b>${iuEsc(iuName(ch))}</b><span>${iuEsc(r.src==='draw'?'нарисован':(r.src||''))}</span></div>
    <label class="ctl"><span>Выше / ниже</span><output id="ip-oy"></output><input type="range" id="ip-y" min="-120" max="120" step="1" value="${a.dy||0}"></label>
    <label class="ctl"><span>Масштаб, %</span><output id="ip-os"></output><input type="range" id="ip-s" min="70" max="140" step="1" value="${a.s||100}"></label>
    <div class="pb"><button type="button" class="btn sm" id="ip-rst">Сбросить</button><button type="button" class="btn sm" id="ip-rep">Заменить файл</button><button type="button" class="btn sm" id="ip-del">Убрать</button><button type="button" class="btn sm pri" id="ip-ok">Готово</button></div>`;
  document.getElementById('view-imp').appendChild(p);
  const place=()=>{const vr=document.getElementById('view-imp').getBoundingClientRect(),br=btn.getBoundingClientRect(),pw=p.offsetWidth,ph=p.offsetHeight;
    let x=br.left-vr.left+br.width/2-pw/2,y=br.bottom-vr.top+8;
    x=Math.max(8,Math.min(vr.width-pw-8,x));if(y+ph>vr.height-8)y=Math.max(8,br.top-vr.top-ph-8);p.style.left=x+'px';p.style.top=y+'px';};
  place();
  const sy=p.querySelector('#ip-y'),ss=p.querySelector('#ip-s'),oy=p.querySelector('#ip-oy'),os=p.querySelector('#ip-os');
  const show=()=>{oy.textContent=(+sy.value>0?'+':'')+sy.value;os.textContent=ss.value+'%';};show();
  let t=0;const apply=()=>{show();impAdjust(ch,{dy:+sy.value,s:+ss.value});p.querySelector('#ip-pv').innerHTML=iuSvg(ch,{guides:true,vw:1000});
    clearTimeout(t);t=setTimeout(()=>{iuRegisterNow();const pp=document.getElementById('imp-pop');if(pp)place();},90);};
  sy.addEventListener('input',apply);ss.addEventListener('input',apply);
  const uy=iuUndoOnce(sy);iuUndoOnce(ss);
  /* перетаскивание рисунка по вертикали */
  const pv=p.querySelector('#ip-pv');let drag=null;
  pv.addEventListener('pointerdown',e=>{uy.beg();drag={y:e.clientY,v:+sy.value};pv.setPointerCapture(e.pointerId);});
  pv.addEventListener('pointermove',e=>{if(!drag)return;const k=(IMP.M.asc+IMP.M.desc+90)/pv.getBoundingClientRect().height;sy.value=Math.max(-120,Math.min(120,Math.round(drag.v-(e.clientY-drag.y)*k)));apply();});
  pv.addEventListener('pointerup',()=>{drag=null;uy.end();});
  p.querySelector('#ip-rst').addEventListener('click',()=>{snap();sy.value=0;ss.value=100;apply();});
  p.querySelector('#ip-rep').addEventListener('click',()=>{iuPopClose();iuPickFile(ch);});
  p.querySelector('#ip-del').addEventListener('click',()=>{iuPopClose();impDrop(ch);iuRegisterNow();toast('Знак «'+iuName(ch)+'» убран');});
  p.querySelector('#ip-ok').addEventListener('click',()=>iuPopClose());
  setTimeout(()=>{document.addEventListener('pointerdown',iuPopOut,true);},0);
}
function iuPopOut(e){const p=document.getElementById('imp-pop');if(!p){document.removeEventListener('pointerdown',iuPopOut,true);return;}
  if(p.contains(e.target)||e.target.closest('.imp-slot'))return;document.removeEventListener('pointerdown',iuPopOut,true);iuPopClose();}
/* ---------- вход и выход ---------- */
function iuOpen(){
  iuBuildView();const lv=document.getElementById('view-lib'),v=document.getElementById('view-imp');
  if(S.tab!=='home')setTab('home');
  IU.open=true;lv.hidden=true;v.hidden=false;document.body.classList.add('imp-open');
  if(IMP.ready||impHasInk()){if(!FONTS.imp)impRegister();}
  iuRender();v.scrollTop=0;}
function iuClose(){const lv=document.getElementById('view-lib'),v=document.getElementById('view-imp');if(!v)return;
  iuPopClose();IU.open=false;v.hidden=true;document.body.classList.remove('imp-open');if(S.tab==='home')lv.hidden=false;}
/* ---------- отмена/повтор: смещения и масштабы знаков идут в общий стек ---------- */
IU.rid=0;IU.recs=new Map();
function iuAdjState(){if(S.fontId!=='imp'||!IMP.ready)return undefined;const m={},ids={};
  for(const ch of Object.keys(IMP.glyphs)){const r=IMP.glyphs[ch];if(!r)continue;if(r.adj)m[ch]=r.adj;if(!r.id)r.id=++IU.rid;ids[ch]=r.id;IU.recs.set(r.id,r);}
  while(IU.recs.size>80)IU.recs.delete(IU.recs.keys().next().value);
  m['#']=ids;return m;}
function iuAdjRestore(m){let ch2=false;
  const ids=m&&m['#'];
  if(ids){for(const ch of new Set([...Object.keys(IMP.glyphs),...Object.keys(ids)])){const cur=IMP.glyphs[ch],want=ids[ch];
    if(!want){if(cur){delete IMP.glyphs[ch];delete IMP.warn[ch];ch2=true;}}
    else if(!cur||cur.id!==want){const rec=IU.recs.get(want);if(rec){IMP.glyphs[ch]=rec;ch2=true;}}}}for(const ch of Object.keys(IMP.glyphs)){const r=IMP.glyphs[ch],a=m&&m[ch]?Object.assign({},m[ch]):null;
  if(JSON.stringify(r.adj||null)!==JSON.stringify(a)){r.adj=a;ch2=true;}}
  if(ch2){IMP.ver++;iuRegisterNow();if(IU.popCh&&document.getElementById('imp-pop'))iuPopClose();}}
const _snap_imp=snap;snap=function(){IU.redo.length=0;_snap_imp.apply(this,arguments);
  const st=iuAdjState();if(st===undefined)return;const i=undoStack.length-1,x=undoStack[i];if(typeof x==='string'&&x.endsWith('}'))undoStack[i]=x.slice(0,-1)+',"imp":'+JSON.stringify(st)+'}';};
const _undo_imp=undo;undo=function(){
  const n=undoStack.length,top=undoStack[n-1];let o=null;try{o=top&&JSON.parse(top);}catch(e){}
  const now=iuAdjState();
  const r=_undo_imp.apply(this,arguments);
  if(undoStack.length<n&&o&&o.imp!==undefined&&now!==undefined){IU.redo.push(now);iuAdjRestore(o.imp);}
  return r;};
const _redo_imp=redo;redo=function(){const n=undoStack.length,it=IU.redo[IU.redo.length-1];
  const r=_redo_imp.apply(this,arguments);
  if(undoStack.length>n&&it!==undefined&&S.fontId==='imp'){IU.redo.pop();iuAdjRestore(it);}
  return r;};
/* один шаг отмены на одно перетаскивание ползунка */
function iuUndoOnce(el){let armed=false;const beg=()=>{if(!armed){armed=true;snap();}},end=()=>{armed=false;};
  el.addEventListener('pointerdown',beg);el.addEventListener('keydown',beg);el.addEventListener('change',end);el.addEventListener('pointerup',()=>setTimeout(end,0));
  return {beg,end};}
/* ---------- заглушки для знаков, которых нет в наборе: только предпросмотр (образец, сравнение, редактор), экспорт идёт мимо getFinal ---------- */
const IU_PH=new Map();
function iuPhGlyph(ch,key){
  const p=S.styles[key]&&S.styles[key].p;if(!p)return null;
  const low=ch!==ch.toUpperCase()&&ch===ch.toLowerCase(),h=low?p.xh:p.capH,w=Math.round(h*(/[0-9]/.test(ch)?0.62:0.7)),t=Math.max(6,Math.round(p.hair*0.07)),sb=p.sb;
  const k=h+'|'+w+'|'+t+'|'+sb+'|'+(p.slant||0);let g=IU_PH.get(k);
  if(!g){const R=(x0,y0,x1,y1,hole)=>{const pts=hole?[[x0,y0],[x0,y1],[x1,y1],[x1,y0]]:[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];return {hole:!!hole,nodes:pts.map(q=>({x:q[0]+sb,y:q[1],a:null,b:null}))};};
    const tn=Math.tan((p.slant||0)*Math.PI/180);
    let cs=[R(0,0,w,h,false),R(t,t,w-t,h-t,true)];
    if(tn)cs=cs.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x+n.y*tn,y:n.y,a:null,b:null}))}));
    g={w,weff:w,adv:w+2*sb,cs,fx:0,fy:0,S:1,ph:true};IU_PH.set(k,g);if(IU_PH.size>40)IU_PH.delete(IU_PH.keys().next().value);}
  return Object.assign({ch},g);}
const _getFinal_imp=getFinal;
getFinal=function(ch,key,opt){
  if(CUR_FONT==='imp'&&FONTS.imp&&!GL[ch]&&/^[\p{L}\p{N}]$/u.test(ch)){const k='ph|'+key+'|'+ch;let v=cache.get(k);if(v===undefined){v=iuPhGlyph(ch,key);cache.set(k,v);}return v;}
  return _getFinal_imp.apply(this,arguments);};
function iuMissing(){if(S.fontId!=='imp'||!FONTS.imp)return [];const m=new Set();for(const ch of S.text)if(/^[\p{L}\p{N}]$/u.test(ch)&&!GL[ch])m.add(ch);return [...m];}
function iuNote(){
  let el=document.getElementById('imp-miss');const row=document.querySelector('.spectools .chiprow');if(!row)return;
  if(!el){el=document.createElement('button');el.type='button';el.id='imp-miss';el.className='chip imp-miss';el.addEventListener('click',()=>{const m=iuMissing();IU.empty=true;if(m.length){IU.sc=/[\u0400-\u04FF]/.test(m[0])?'cyr':'lat';}iuOpen();});row.parentNode.insertBefore(el,row);}
  const m=iuMissing();el.hidden=!m.length;
  if(m.length){const n=m.length,w=(n%10===1&&n%100!==11)?'знак не загружен':'знаков не загружено';el.textContent=n+' '+w+' · показать пустые ячейки';el.title='Нет в наборе: '+m.join(' ');}}
const _schedule_imp=schedule;
schedule=function(){try{iuNote();}catch(e){}return _schedule_imp.apply(this,arguments);};
/* ---------- карточка на странице «Шрифты» ---------- */
const _buildLibrary_imp=buildLibrary;
buildLibrary=function(){
  _buildLibrary_imp();
  const box=document.getElementById('createcards');if(!box)return;
  const n=Object.keys(IMP.glyphs).filter(iuOwn).length;
  const d=document.createElement('button');d.type='button';d.className='lcard imp-new';d.id='imp-card';
  d.innerHTML='<span class="imp-ph" aria-hidden="true"><i class="ico i-plus"></i><span class="ex">A Ж 7</span></span><span class="ln">Собрать из своих знаков</span><span class="lt">'+(n?'В библиотеке знаков: '+n+'. Добавить или заменить':'Загрузите SVG со своими буквами — получится шрифт')+'</span><span class="notch" aria-hidden="true"><span class="nb go"><i class="ico i-up"></i></span></span>';
  d.addEventListener('click',()=>iuOpen());
  box.insertBefore(d,box.firstChild);
  if(FONTS.imp)document.querySelectorAll('.lcard[data-font=imp] .lt').forEach(lt=>{lt.textContent=impTag();});
};
const _setTab_imp=setTab;
setTab=function(t){if(IU.open)iuClose();return _setTab_imp.apply(this,arguments);};
const _switchFont_imp=switchFont;
switchFont=function(id){if(IU.open)iuClose();const r=_switchFont_imp.apply(this,arguments);iuSyncPanel();return r;};
/* ---------- панель «Знак из файла» в редакторе ---------- */
function iuEnsurePanel(){
  if(document.getElementById('impsec'))return;
  const panel=document.querySelector('#pcard .panel');if(!panel)return;
  const d=paneEl('ed-imp','Знак из файла','<div class="imps" id="imps"></div>');d.id='impsec';d.hidden=true;
  panel.insertBefore(d,panel.firstChild);paneInit(d,'ed-imp',true);}
function iuSyncPanel(){
  iuEnsurePanel();const d=document.getElementById('impsec');if(!d)return;
  const on=S.fontId==='imp'&&IMP.ready;d.hidden=!on;
  {const g0=IMP.glyphs[S.sel],dr=!!(g0&&g0.src==='draw'&&g0.c&&g0.c.length),sm=d.querySelector('.pane-t');if(sm)sm.textContent=dr?'Нарисованный знак':'Знак из файла';d.dataset.dr=dr?'1':'';}
  const vf=document.querySelector('[data-x=vf]');if(vf){vf.hidden=S.fontId==='imp';}
  if(!on)return;
  const box=d.querySelector('#imps'),ch=S.sel,key=ch&&typeof edKey==='function'?edKey(ch):ch;
  const own=iuOwn(ch),st=IMP.status&&IMP.status[ch];
  let h='';
  if(own){const r=IMP.glyphs[ch],a=r.adj||{};
    h+=`<div class="ipv">${iuSvg(ch,{guides:true,vw:1000})}</div><div class="ipn">${iuEsc(r.src==='draw'?'':(r.src||'файл'))}</div>
      <label class="ctl"><span>Выше / ниже</span><output id="ie-oy">${(a.dy>0?'+':'')+(a.dy||0)}</output><input type="range" id="ie-y" min="-120" max="120" step="1" value="${a.dy||0}"></label>
      <label class="ctl"><span>Масштаб, %</span><output id="ie-os">${a.s||100}%</output><input type="range" id="ie-s" min="70" max="140" step="1" value="${a.s||100}"></label>
      <div class="row">${r.src==='draw'?'<button class="btn sm" id="ie-ed" type="button">Править в мастерской</button>':'<button class="btn sm" id="ie-rep" type="button">Заменить файл</button><button class="btn sm" id="ie-trc" type="button">Обвести картинку</button>'}<button class="btn sm" id="ie-rst" type="button">Сбросить</button><button class="btn sm" id="ie-del" type="button">Убрать</button></div>`;}
  else if(st&&st.t==='auto'||st&&st.t==='twin'){
    h+=`<p class="iph">Знак собран автоматически (из «${iuEsc(st.from)}»). Можно загрузить свой.</p><div class="row"><button class="btn sm" id="ie-rep" type="button">Загрузить свой знак</button><button class="btn sm" id="ie-trc" type="button">Обвести картинку</button></div>`;}
  else if(ch&&GL[ch]){h+=`<p class="iph">Знак собран автоматически.</p><div class="row"><button class="btn sm" id="ie-rep" type="button">Загрузить свой знак</button><button class="btn sm" id="ie-trc" type="button">Обвести картинку</button></div>`;}
  h+=`${own?`<div class="row"><button class="btn sm${IMX.on?' on':''}" id="ie-xf" type="button" aria-pressed="${IMX.on}" title="Ручки на холсте: размер, форма, поворот знака">Размер и поворот</button></div>`:''}<div class="row"><button class="btn sm" id="ie-lib" type="button">Библиотека знаков</button></div>
    <p class="iph">Насыщенность — смещение контура, предел ставится по просветам знаков. Вариативный экспорт для этого шрифта недоступен: семейство собирается из весов.</p>`;
  box.innerHTML=h;
  const q=s=>box.querySelector(s);
  if(own){let t=0;const sy=q('#ie-y'),ss=q('#ie-s');
    const ap=()=>{q('#ie-oy').textContent=(+sy.value>0?'+':'')+sy.value;q('#ie-os').textContent=ss.value+'%';impAdjust(ch,{dy:+sy.value,s:+ss.value});
      q('.ipv').innerHTML=iuSvg(ch,{guides:true,vw:1000});clearTimeout(t);t=setTimeout(()=>{const keep=S.sel;iuRegisterNow();S.sel=keep;},90);};
    sy.addEventListener('input',ap);ss.addEventListener('input',ap);iuUndoOnce(sy);iuUndoOnce(ss);
    q('#ie-rst').addEventListener('click',()=>{snap();sy.value=0;ss.value=100;ap();});
    q('#ie-del').addEventListener('click',()=>{impDrop(ch);iuRegisterNow();toast('Знак убран из набора');});}
  const ed=q('#ie-ed');if(ed)ed.addEventListener('click',()=>{if(window.GT_DRAW&&GT_DRAW.edit){setTab('draw');GT_DRAW.edit(ch);}});
  const rep=q('#ie-rep');if(rep)rep.addEventListener('click',()=>iuPickFile(ch));
  const trb=q('#ie-trc');if(trb)trb.addEventListener('click',()=>trPickFile(ch));
  q('#ie-lib').addEventListener('click',()=>{iuOpen();});
  const xb=q('#ie-xf');if(xb)xb.addEventListener('click',()=>{IMX.on=!IMX.on;xb.classList.toggle('on',IMX.on);xb.setAttribute('aria-pressed',IMX.on);if(!IMX.on&&XIMP)XIMP.sync();schedule();});
}
const _syncPanel_imp=syncPanel;
syncPanel=function(){_syncPanel_imp.apply(this,arguments);try{iuSyncPanel();}catch(e){}};
const _selectGlyph_imp=typeof selectGlyph==='function'?selectGlyph:null;
if(_selectGlyph_imp)selectGlyph=function(){const r=_selectGlyph_imp.apply(this,arguments);try{iuSyncPanel();}catch(e){}return r;};
/* ---------- кнопка в шапке страницы «Шрифты» ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  const row=document.querySelector('.hero .row');
  if(row&&!document.getElementById('go-imp')){const b=document.createElement('button');b.type='button';b.className='btn';b.id='go-imp';b.textContent='Собрать из своих знаков';b.addEventListener('click',()=>iuOpen());row.appendChild(b);}
  iuBuildView();iuEnsurePanel();
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&IU.open){if(document.getElementById('imp-pop'))iuPopClose();else iuClose();}});
  /* регистрация после загрузки проекта из хранилища */
  if(impHasInk()&&!FONTS.imp)impRegister();
  iuSyncPanel();
});
/* ---------- стили ---------- */
(function(){const st=document.createElement('style');st.textContent=`
.impview{overflow:hidden;display:flex;flex-direction:column;gap:var(--wg);padding:0;position:relative;min-width:0;min-height:0}
.impview[hidden]{display:none}
.imp-top{display:flex;align-items:center;gap:var(--s3);background:var(--surface);border-radius:var(--r-md);padding:var(--s2) var(--s3);box-shadow:var(--sh-1);flex:none;min-width:0}
.imp-h{margin:0;font:700 var(--fs-lg)/1.1 var(--f-ui);letter-spacing:-.01em;white-space:nowrap}
.imp-h em{font-style:normal;color:inherit}
.imp-sp{flex:1}
.imp-act{display:flex;gap:var(--s2);align-items:center;flex:none}
.imp-act .btn{min-height:var(--h-md);padding:0 var(--s4);font-size:var(--fs-md);font-weight:600;display:inline-flex;align-items:center;gap:var(--s2);background:var(--surface-2);border-radius:var(--r-pill);cursor:pointer;white-space:nowrap}
.imp-act .btn:hover{background:var(--surface-3)}
.imp-act .btn .ico{width:18px;height:18px}
.imp-act input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.imp-act .btn:focus-within{outline:2px solid var(--focus-ring);outline-offset:2px}
.imp-act .btn.imp-go{background:var(--accent);color:var(--on-accent)}.imp-act .btn.imp-go:hover{background:var(--accent-hover)}.imp-act .btn.imp-go:active{background:var(--accent-press)}
.imp-act .btn.imp-go:hover{filter:brightness(.92)}
.imp-act .btn.imp-go:disabled{background:var(--surface-2);color:var(--text-2);opacity:.7;filter:none;cursor:default}
.imp-status{min-height:0;font-size:var(--fs-md);color:var(--text-2);flex:none;white-space:pre-line;overflow-wrap:anywhere}
.imp-status:empty{display:none}
.imp-status.bad{color:var(--danger)}
.imp-bar{display:flex;gap:var(--s2);align-items:center;min-width:0}
.imp-bar .seg{background:var(--surface-2);padding:calc((var(--h-md) - var(--h-sm))/2);height:var(--h-md);align-items:center;flex:none}
.imp-bar .seg button{height:var(--h-sm);min-height:0;padding:0 var(--s3);font-size:var(--fs-md)}
.imp-bar .seg button em{font-style:normal;opacity:.72;margin-left:var(--s2);font-size:var(--fs-sm)}
.imp-bar .seg button.on em{opacity:.85}
.imp-chk{display:inline-flex;align-items:center;gap:var(--s2);font-size:var(--fs-md);cursor:pointer}
.imp-opts{display:grid;gap:var(--s3)}
.imp-miss{margin:0 0 var(--s2);background:var(--surface-3);color:var(--ink);font-weight:600}
.imp-miss[hidden]{display:none}
.imp-clear{justify-self:start;background:var(--surface-2);min-height:var(--h-md);padding:0 var(--s3);border-radius:var(--r-pill);font-size:var(--fs-md)}
.imp-quota{background:var(--danger);color:var(--on-danger);border-radius:var(--r-md);padding:var(--s3) var(--s4);font-size:var(--fs-md);flex:none}
.imp-pend{background:var(--surface);border-radius:var(--r-md);padding:var(--s3) var(--s4);display:grid;gap:var(--s2);font-size:var(--fs-md);flex:none}
.imp-pend .pc{display:flex;flex-wrap:wrap;gap:var(--s2)}
.imp-pend .chip.on{background:var(--ink);color:var(--surface)}
.imp-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 276px;gap:var(--wg)}
.imp-lib{display:grid;gap:var(--s3);align-content:start;overflow-y:auto;min-height:0;min-width:0;scrollbar-width:none}
.imp-lib::-webkit-scrollbar{display:none}
.imp-side{background:var(--surface);border-radius:var(--r-md);box-shadow:var(--sh-1);padding:var(--s1) var(--s3) var(--s2);overflow-y:auto;min-height:0;scrollbar-width:none;align-self:start;max-height:100%}
.imp-side::-webkit-scrollbar{display:none}
.imp-dz{display:grid;justify-items:center;gap:var(--s2);width:100%;padding:var(--s5) var(--s3);border:1.5px dashed var(--line-strong);border-radius:var(--r-sm);background:var(--surface-2);color:var(--text);text-align:center;cursor:pointer;font:inherit}
.imp-dz:hover{border-color:var(--accent);background:var(--accent-soft)}
.imp-dz .ico{width:24px;height:24px;color:var(--text-2)}
.imp-dz b{font-size:var(--fs-md);font-weight:600}
.imp-dz span{font-size:var(--fs-sm);color:var(--text-2);line-height:1.4}
.imp-pvl{display:flex;flex-wrap:wrap;gap:var(--s1)}
.imp-pvl .pvc{width:34px;height:var(--h-lg);border-radius:var(--r-xs);background:var(--surface-2);display:grid;place-items:center;padding:var(--s1);color:var(--text)}
.imp-pvl .pvc svg{width:100%;height:100%}
.imp-pve{margin:0;color:var(--text-2);font-size:var(--fs-sm)}
.imp-grp{background:var(--surface);border-radius:var(--r-md);box-shadow:var(--sh-1);padding:var(--s4) var(--s4) var(--s5)}
.imp-grp header{display:flex;align-items:baseline;gap:var(--s3);margin-bottom:var(--s3)}
.imp-grp h3{margin:0;font:600 var(--fs-lg) var(--f-ui);letter-spacing:-.01em}
.imp-grp .cnt{margin-left:auto;font-size:var(--fs-md);color:var(--text-2)}
.imp-grp .cnt b{color:var(--text);font-weight:600}
.imp-grp .cnt em{font-style:normal;margin-left:var(--s2)}
.imp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:var(--s2)}
.imp-slot{position:relative;display:grid;grid-template-rows:minmax(0,1fr) auto;justify-items:center;height:92px;padding:var(--s2) var(--s1);border:1.5px dashed var(--line-strong);border-radius:var(--r-sm);background:transparent;color:var(--ink);cursor:pointer;font:inherit;transition:background var(--dur-fast),border-color var(--dur-fast),transform var(--dur-fast)}
.imp-slot:hover{border-color:var(--ink)}
.imp-slot .pv{width:100%;min-height:0;display:grid;place-items:center}
.imp-slot .pv svg{width:100%;height:100%;max-height:60px}
.imp-slot .pv .ico{width:26px;height:26px;color:var(--text-3)}
.imp-slot .pv{position:relative}
.imp-slot .pv .big{font:700 clamp(26px,2.6vw,34px)/1 var(--f-ui);color:var(--text-2);opacity:.75}
.imp-slot .pv .pl{position:static;grid-row:1;width:16px;height:16px;padding:0;margin-bottom:var(--s2);opacity:.8}
.imp-slot .pv .big{grid-row:2}
.imp-slot.empty:hover .pv .pl{opacity:1;color:var(--accent)}
.imp-slot.empty:hover .pv .big{opacity:1;color:var(--ink)}
.imp-slot .lb{font:600 var(--fs-sm)/1 var(--f-ui);color:var(--muted);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.imp-slot.own{border:1.5px solid transparent;background:var(--surface-2)}
.imp-slot.own:hover{border-color:var(--text)}
.imp-slot.auto{border:1.5px solid transparent;background:var(--surface-2);color:var(--text-2)}
.imp-slot.auto .pv{opacity:.55}
.imp-slot .tg{position:absolute;top:var(--s2);left:var(--s2);font:600 var(--fs-xs)/1 var(--f-ui);background:var(--panel-2);color:var(--muted);border-radius:var(--r-pill);padding:var(--s1) var(--s2)}
.imp-slot .wr{position:absolute;top:var(--s2);right:var(--s2);width:18px;height:18px;border-radius:50%;background:var(--accent);color:var(--on-accent);font:700 var(--fs-sm)/18px var(--f-ui);text-align:center}
.imp-slot.ov{border-color:var(--accent);background:var(--accent-soft);transform:scale(1.04)}
.imp-slot.empty .lb{color:var(--muted);font-weight:500}
.imp-drop{position:absolute;inset:0;z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);border:3px dashed var(--accent);border-radius:var(--r);display:grid;place-items:center;text-align:center;font:700 var(--fs-2xl)/1.2 var(--f-ui);pointer-events:none}
.imp-drop small{display:block;margin-top:var(--s2);font:400 var(--fs-base) var(--f-ui);color:var(--muted)}
.imp-drop[hidden]{display:none}
.imp-pop{position:absolute;z-index:30;width:min(300px,calc(100% - 16px));background:var(--paper);border-radius:var(--r-lg);box-shadow:var(--sh-3);padding:var(--s3);display:grid;gap:var(--s3)}
.imp-pop .pv{height:150px;background:var(--card);border-radius:var(--r-md);cursor:ns-resize;touch-action:none}
.imp-pop .pv svg,.ipv svg{width:100%;height:100%;display:block}
.imp-pop .pn{display:flex;gap:var(--s2);align-items:baseline;font-size:var(--fs-md);color:var(--muted);min-width:0}
.imp-pop .pn b{font:700 var(--fs-lg) var(--f-ui);color:var(--ink)}
.imp-pop .pn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.imp-pop .ctl,.imps .ctl{display:grid;grid-template-columns:1fr auto;gap:var(--s0) var(--s2);font-size:var(--fs-md)}
.imp-pop .ctl input,.imps .ctl input{grid-column:1/-1;width:100%;accent-color:var(--accent)}
.imp-pop .pb{display:grid;grid-template-columns:1fr 1fr;gap:var(--s2)}
.imp-pop .pb .btn{min-height:var(--h-lg);padding:0 var(--s3);border-radius:var(--r-pill);justify-content:center;white-space:nowrap}
.imp-pop .pb #ip-rep{grid-column:1/-1;order:3}
.imp-pop .btn.pri{background:var(--accent);color:var(--on-accent);grid-column:1/-1;order:4;min-height:var(--h-lg);font-weight:600}
.ipv{height:130px;background:var(--card);border-radius:var(--r-sm);margin-bottom:var(--s2)}
.ipn{font-size:var(--fs-sm);color:var(--muted);margin:0 0 var(--s2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.imps{display:grid;gap:var(--s2)}
.imps .row{display:flex;flex-wrap:wrap;gap:var(--s2)}
.iph{margin:0;font-size:var(--fs-sm);color:var(--muted)}
.lcard.imp-new{background:var(--card);border:0;padding:var(--s3) var(--s3) var(--s5)}
.lcard.imp-new:hover{background:var(--card-2)}
.lcard.imp-new:hover .imp-ph{border-color:var(--ink)}
.lcard.imp-new .imp-ph{height:140px;margin:0 0 var(--s3);border-radius:var(--r-md);background:transparent;border:2px dashed var(--line-strong);display:grid;place-items:center;align-content:center;gap:var(--s2);color:var(--ink);transition:border-color var(--dur-fast)}
.lcard.imp-new .imp-ph .ico{width:var(--h-md);height:var(--h-md)}
.lcard.imp-new .imp-ph .ex{font:800 var(--fs-3xl)/1 var(--f-ui);letter-spacing:-.03em;color:var(--text-3)}
.lcard.imp-new .nb{border-color:var(--accent);background:var(--accent);color:var(--on-accent)}
.lcard.imp-new .notch{background:var(--bg)}
body.imp-open .top{display:none}
@media (max-width:1400px){.imp-top{gap:var(--s2)}.imp-act .btn{padding:0 var(--s3)}.imp-dir span{display:none}.imp-dir{padding:0 var(--s3)!important}.imp-bar .seg button{padding:0 var(--s2)}.imp-bar .seg button em{margin-left:var(--s1)}}
@media (max-width:1060px){.impview{overflow:visible}.imp-body{grid-template-columns:minmax(0,1fr);}.imp-lib{overflow:visible}.imp-side{align-self:stretch;max-height:none;overflow:visible}.imp-top{flex-wrap:wrap}.imp-sp{display:none}}
@media (max-width:720px){
  .imp-top{padding:var(--s3)}
  .imp-h{flex:1 1 100%}
  .imp-bar{flex:1 1 100%;overflow-x:auto}
  .imp-act{flex:1 1 100%;flex-wrap:wrap}.imp-act .btn{min-height:var(--h-md);padding:0 var(--s4);flex:1 1 auto;justify-content:center}.imp-act .imp-go{flex:1 1 100%}
  .imp-dir span{display:inline}
  .imp-grp{padding:var(--s3)}
  .imp-grid{grid-template-columns:repeat(auto-fill,minmax(68px,1fr))}
  .imp-slot{height:84px}
}`;document.head.appendChild(st);})();

/* ---------- преобразование знака из файла (ui_xform_x1.js): размер, форма, поворот на холсте редактора ----------
   Равномерный размер идёт в «Масштаб» знака (adj.s: нормализация набора держит базовую линию и зоны),
   поворот, отражение и растяжение переписывают исходные контуры знака (новая запись — отмена возвращает прежнюю). */
const IMX={on:false,t:null};
let XIMP=null;
const impXfOn=()=>IMX.on&&S.tab==='edit'&&S.fontId==='imp'&&S.mode==='points'&&iuOwn(S.sel);
const impXfShown=()=>{const g=rawGlyph();return g?g.cs.filter(c=>!c.off&&c.op!=='sub'):[];};
/* исходные контуры -> показанные на холсте: масштаб и сдвиг по габаритам */
function impXfMap(){const r=IMP.glyphs[S.sel],Bd=impBBox(impXfShown()),Br=r&&impBBox(r.c);if(!Bd||!Br)return null;
  const sx=(Bd.x1-Bd.x0)/((Br.x1-Br.x0)||1),sy=(Bd.y1-Bd.y0)/((Br.y1-Br.y0)||1);return [sx,0,0,sy,Bd.x0-Br.x0*sx,Bd.y0-Br.y0*sy];}
function xfImp(){
  if(XIMP)return XIMP;
  XIMP=XF.make({id:'im',host:document.getElementById('stagebox'),
    enabled:()=>impXfOn(),
    bbox:()=>impXfOn()&&!(IMX.t&&false)?impBBox(impXfShown()):null,
    key:()=>S.sel,
    toS:(x,y)=>toS(x,y),fromS:(sx,sy)=>toW(sx,sy),size:()=>[V.cw,V.ch],
    hostOffset:()=>{const c=document.getElementById('stage').getBoundingClientRect(),h=document.getElementById('stagebox').getBoundingClientRect();return [c.left-h.left,c.top-h.top];},
    snap:(ax,v)=>ax==='x'?drSnapPt(v,0,false,8/V.sc).p[0]:drSnapPt(0,v,false,8/V.sc).p[1],
    begin:()=>{const N=impXfMap();if(!N||!IMP.glyphs[S.sel])return false;snap();return {ch:S.sel,N,m:XF.id(),shown:impXfShown()};},
    apply:(m,t)=>{t.m=m;IMX.t=t;schedule();return true;},
    end:(t,moved)=>{IMX.t=null;
      if(!moved||XF.isId(t.m)){undoStack.pop();schedule();return true;}
      const m=t.m,rec=IMP.glyphs[t.ch];if(!rec){undoStack.pop();return false;}
      const uni=Math.abs(m[1])<1e-9&&Math.abs(m[2])<1e-9&&Math.abs(m[0]-m[3])<1e-6&&m[0]>0;
      if(uni){const a=rec.adj||{},cur=a.s||100;impAdjust(t.ch,{s:Math.max(40,Math.min(250,Math.round(cur*m[0]*10)/10))});}
      else{const Mr=XF.mul(XF.inv(t.N),XF.mul(m,t.N)),c=XF.affCs(rec.c,Mr);
        if(!c.length||c.some(k=>k.nodes.some(n=>![n.x,n.y].every(isFinite)))){undoStack.pop();toast('Так знак сломается, поэтому правку отменили. Попробуйте изменить меньше');schedule();return false;}
        const r2=Object.assign({},rec,{c,bb:null,v:++IMP.ver});delete r2.id;IMP.glyphs[t.ch]=r2;IMP.ver++;}
      const keep=S.sel;iuRegisterNow();S.sel=keep;S.node=null;bump();iuSyncPanel();return true;},
    cancel:t=>{IMX.t=null;undoStack.pop();schedule();},
    redraw:schedule});
  return XIMP;}
const _dp_imx=drawPoints;
drawPoints=function(c,raw){_dp_imx(c,raw);
  if(!impXfOn()){if(XIMP)XIMP.sync();return;}
  if(IMX.t&&!XF.isId(IMX.t.m)){c.save();c.strokeStyle=css('--sel');c.lineWidth=1.5;c.setLineDash([5,3]);c.stroke(pathOf(XF.affCs(IMX.t.shown,IMX.t.m),toS));c.restore();}
  xfImp().paint(c);};
const _onDown_imx=onDown,_onMove_imx=onMove,_onUp_imx=onUp,_onKey_imx=onKey;
onDown=function(e){if(impXfOn()&&e.button!==1&&e.button!==2){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul))&&xfImp().down(e,sx,sy)){$('#stage').setPointerCapture(e.pointerId);return;}}return _onDown_imx(e);};
onMove=function(e){if(XIMP&&XIMP.active){const [sx,sy]=pt(e);$('#stage').style.cursor=XIMP.move(e,sx,sy)||'';return;}
  const r=_onMove_imx(e);if(impXfOn()&&!drag){const [sx,sy]=pt(e),cu=xfImp().move(e,sx,sy);if(cu)$('#stage').style.cursor=cu;}return r;};
onUp=function(e){if(XIMP&&XIMP.active){XIMP.up(e);return;}return _onUp_imx(e);};
onKey=function(e){if(XIMP&&XIMP.key(e))return;return _onKey_imx(e);};

/* Белая заливка поверх чёрной не вычитается из контура (движок читает заливку как «нет краски»): белое «отверстие» молча становилось сплошным.
   Теперь файл помечается предупреждением white — оно попадает в тост загрузки и в значок «!» у ячейки. */
(function(){
  if(typeof svgImport!=='function')return;const _si=svgImport;
  const WHITE=/fill\s*[:=]\s*["']?\s*(#fff(?:fff)?(?:ff)?\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1(?:\.0+)?\s*\))/i;
  svgImport=function(text){
    const r=_si.apply(this,arguments);
    try{if(r&&Array.isArray(r.warn)&&!r.warn.includes('white')&&WHITE.test(String(text)))r.warn.push('white');}catch(e){}
    return r;};
})();
