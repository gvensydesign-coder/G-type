/* ===== Кернинг: вкладка-редактор пар =====
   Данные: S.styles[s].ku {'ab':v} — исключения пары (0 = не кернить), S.styles[s].kc {'L|R':v} — значения классов;
   логика и пределы — core15 (kernInfo, kernApply, kernReset). Здесь только интерфейс. */
const KP_GROUPS=[
  ['Заглавные','AV AT AY AW AU LT LY LV PA TA VA WA YA OA OV OT FA RT KO'],
  ['Заглавная + строчная','Ta Te To Tr Ty Va Ve Vo Ya Ye Yo Wa Wo Fa Fo Pa Po Ke'],
  ['Знаки','T. T, V. V, Y. F. P. L” A” L’ T« T» »A «T r. f.'],
  ['Цифры','11 17 74 47 71 77 14 41'],
  ['Кириллица','ГА ТА УА ЛТ ЛУ РА Г. Т. У. Ту Те То Гд Го Ва Ра Ку'],
];
const KK={a:'A',b:'V',ctx:'auto',mode:'exc',txt:'Ту Ты ТАВО AVA «Т.» WAY',only:false,snapped:false,txtItems:[],bigGeo:null,drag:null,listT:0};
const kkSt=()=>S.styles[S.style];
const kkGet=ch=>(GL[ch]&&GL[ch].skel)?getFinal(ch,S.style,FAST):getFinal(ch,S.style);
const kkInfo=(a,b)=>kernInfo(a,b,kkSt(),S.style,kkGet);
const kkHas=ch=>!!(GL[ch]&&kkGet(ch));
/* FX80 D14: в поле значения тоже один знак минуса (U+2212), как в подписях и кнопках */
const kkNum=v=>String(Math.round(v)).replace('-','\u2212');
const kkParse=t=>{t=String(t).replace(/[\u2212\u2013\u2014]/g,'-').replace(',','.').trim();return t===''||!/^[-+]?\d+(\.\d+)?$/.test(t)?NaN:+t;};
const kkFmt=v=>(v>0?'+':v<0?'−':'')+Math.abs(Math.round(v));
const kkCls=(T,n)=>{const m=Array.from(T[n]||'');return m.slice(0,7).join(' ')+(m.length>7?' …':'');};
const KK_SRC={exc:'Ваше исключение для этой пары',cls:'Ваше значение класса',guard:'Класс, поправлено защитой от столкновения',autoexc:'Авто: исключение внутри класса',
  autocls:'Авто: значение класса',table:'Авто: таблица пар',none:'Кернинга нет',locked:'Пропись: буквы соединяются, между ними кернинг не применяется'};
/* строка знаков с кернингом: позиции в единицах кегля sc */
function kkRun(str,sc){let x=0,pv='';const it=[];
  for(const ch of Array.from(str)){const gn=ctxName(pv,ch),g=kkGet(gn);if(!g){pv=ch;continue;}
    if(pv&&it.length)x+=kernOf(pv,ch,S.style)*sc;
    it.push({ch,gn,g,x,w:g.adv*sc});x+=g.adv*sc;pv=ch;}
  return {it,w:x};}
function kkFill(c,r,sc,ox,base,col,pick){
  for(let i=0;i<r.it.length;i++){const q=r.it[i];if(!q.g.cs.length)continue;
    c.fillStyle=(pick?pick(i):col);c.fill(pathOf(q.g.cs,(x,y)=>[ox+q.x+x*sc,base-y*sc]),'nonzero');}}
function kkCtxChar(){
  if(KK.ctx==='HH')return 'H';if(KK.ctx==='nn')return 'n';if(KK.ctx==='pair')return '';
  return /\p{Ll}/u.test(KK.a)||/\p{Ll}/u.test(KK.b)?'n':'H';}
/* ---------- большая пара ---------- */
function kkDrawBig(){
  const cv=$('#kk-big');if(!cv)return;const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  const a=KK.a,b=KK.b;KK.bigGeo=null;if(!a||!b||!kkHas(a)||!kkHas(b))return;
  const x=kkCtxChar(),s=(x&&kkHas(x))?x+a+b+x:a+b,ia=Array.from(s).length>2?1:0;
  const r1=kkRun(s,1/1000*1000);/* ширина в единицах */
  const fs=Math.min(h*0.58,(w*0.92)/Math.max(r1.w/1000,0.5)),sc=fs/1000,r=kkRun(s,sc),ox=(w-r.w)/2,base=h*0.74;
  c.strokeStyle=css('--guide-dim');c.lineWidth=1;c.beginPath();c.moveTo(0,base+.5);c.lineTo(w,base+.5);c.stroke();
  kkFill(c,r,sc,ox,base,css('--glyph'),i=>(i===ia||i===ia+1)?css('--glyph'):css('--glyph-dim'));
  const A=r.it[ia],B=r.it[ia+1];if(!A||!B)return;
  const xa=ox+A.x+A.w,xb=ox+B.x;
  /* линия конца левого знака и начала правого: расстояние между ними — кернинг */
  c.strokeStyle=css('--sel');c.lineWidth=1.5;c.globalAlpha=.8;
  c.beginPath();c.moveTo(xa+.5,base-fs*0.86);c.lineTo(xa+.5,base+fs*0.26);c.stroke();
  c.setLineDash([4,4]);c.beginPath();c.moveTo(xb+.5,base-fs*0.86);c.lineTo(xb+.5,base+fs*0.26);c.stroke();c.setLineDash([]);c.globalAlpha=1;
  const inf=kkInfo(a,b);
  c.font='600 15px "Onest",system-ui,sans-serif';c.fillStyle=css('--sel');c.textAlign='center';c.textBaseline='top';
  c.fillText(kkFmt(inf.v),(xa+xb)/2,base+fs*0.3);c.textAlign='start';
  KK.bigGeo={sc,ox,xa,xb,w,h};
  cv.style.cursor=inf.blocked?'not-allowed':'ew-resize';
}
/* ---------- строка из текста: клик между буквами выбирает пару ---------- */
function kkDrawTxt(){
  const cv=$('#kk-ctxt');if(!cv)return;const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  KK.txtItems=[];const fs=Math.min(64,Math.max(34,w/9)),sc=fs/1000,maxW=w-24;let y=8;
  const lines=[],ph=!String(KK.txt||'').trim(),T=ph?'Ту Ты ТАВО AVA «Т.» WAY':KK.txt,RC=[],y00=8;
  for(const para of T.split('\n')){let cur='';
    for(const wd of para.split(' ')){const t=cur?cur+' '+wd:wd;if(cur&&kkRun(t,sc).w>maxW){lines.push(cur);cur=wd;}else cur=t;}
    lines.push(cur);}
  const need=lines.length*fs*1.25+16;cv.style.height=need+'px';
  const g2=fitCanvas(cv);const cc=g2.c;cc.clearRect(0,0,g2.w,g2.h);
  lines.forEach((ln,li)=>{const r=kkRun(ln,sc),base=y+fs*0.86,ox=12;
    /* подсветка выбранной пары */
    for(const q of r.it)RC.push({ch:q.ch,x0:ox+q.x,x1:ox+q.x+q.w,y0:y+fs*0.04,y1:y+fs*1.12});
    for(let i=1;i<r.it.length;i++){const p=r.it[i-1],q=r.it[i];if(p.ch===' '||q.ch===' ')continue;
      KK.txtItems.push({li,i,a:p.ch,b:q.ch,x:ox+q.x,x0:ox+p.x,x1:ox+q.x+q.w,y0:y,y1:y+fs*1.2});}
    y+=fs*1.25;});
  const hit=KK.txtItems.find(t=>t.a===KK.a&&t.b===KK.b);
  /* подсветка всех вхождений выбранной пары */
  cc.fillStyle='rgba(20,20,22,.14)';   /* neutral: selection is not an error (D5) */
  for(const t of KK.txtItems)if(t.a===KK.a&&t.b===KK.b)cc.fillRect(t.x0,t.y0,t.x1-t.x0,t.y1-t.y0);
  /* глифы поверх подсветки */
  y=8;lines.forEach(ln=>{const r=kkRun(ln,sc);kkFill(cc,r,sc,12,y+fs*0.86,ph?css('--glyph-dim'):css('--glyph'));y+=fs*1.25;});
  smpCommit('kk',[RC],ph?'':String(KK.txt||''),{left:12,line:{y0:y00+fs*0.04,y1:y00+fs*1.12},pitch:fs*1.25,spw:fs*0.26});
}
/* ---------- панель управления ---------- */
function kkSync(){
  const a=KK.a,b=KK.b,ok=a&&b&&kkHas(a)&&kkHas(b);
  const ia=$('#kk-a'),ib=$('#kk-b');if(document.activeElement!==ia)ia.value=a;if(document.activeElement!==ib)ib.value=b;
  const info=$('#kk-info'),num=$('#kk-v');
  if(!ok){info.textContent='Введите два знака, которые есть в шрифте.';
    /* FX80 B07: у неверной пары значение не показывается и не меняется — поле и кнопки выключены */
    num.value='';num.disabled=true;$$('#kk-ctl [data-d]').forEach(x=>x.disabled=true);$('#kk-reset').disabled=true;return;}
  const i=kkInfo(a,b);
  if(!i.hasCls&&KK.mode==='cls')KK.mode='exc';
  if(document.activeElement!==num)num.value=kkNum(i.v);
  num.disabled=i.blocked;
  $$('#kk-ctl [data-d]').forEach(x=>x.disabled=i.blocked);
  $('#kk-reset').disabled=!(i.hasExc||i.kcSet);
  const m=$('#kk-mode');m.querySelector('[data-m=cls]').classList.toggle('dis',!i.hasCls);
  m.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m===KK.mode));
  const big=$('#kk-big');big.setAttribute('aria-valuenow',i.v);big.setAttribute('aria-valuemin',i.lo);big.setAttribute('aria-valuemax',i.hi);
  const rows=[];
  rows.push('<div class="kk-src"><b>'+kkEsc(KK_SRC[i.src]||'')+'</b>'+(i.src==='cls'||i.src==='autocls'||i.src==='guard'?' <span>'+kkEsc(kkCls(KC_L,i.l)+'  →  '+kkCls(KC_R,i.r))+'</span>':'')+'</div>');
  const meta=[];
  if(!i.blocked){meta.push('авто '+kkFmt(i.autoV));
    if(i.hasCls)meta.push('классы: '+kkEsc(kkCls(KC_L,i.l))+' | '+kkEsc(kkCls(KC_R,i.r)));else meta.push('своего класса нет — только исключение');
    if(i.gap!=null)meta.push('мин. зазор '+Math.round(i.gap+i.v)+' (безопасно от '+Math.round(i.G0)+')');
    meta.push('предел '+kkFmt(i.lo)+' … '+kkFmt(i.hi));}
  rows.push('<div class="kk-meta">'+meta.join(' · ')+'</div>');
  const fl=kkFlags(i);if(fl.length)rows.push('<div class="kk-flags">'+fl.map(t=>'<span class="kk-flag">'+t+'</span>').join('')+'</div>');
  info.innerHTML=rows.join('');
}
const kkEsc=s=>String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
function kkFlags(i){const f=[];if(i.blocked)return f;
  if(i.hit)f.push('Столкновение контуров');else if(i.tight)f.push('Зазор меньше безопасного');
  if(i.over)f.push('Больше ±15% кегля');return f;}
function kkRenderList(){
  const box=$('#kk-list');if(!box)return;box.innerHTML='';let bad=0,tot=0;
  const user=[];const s=kkSt();
  for(const k of Object.keys(s.ku||{})){const c=Array.from(k);if(c.length===2)user.push(k);}
  const groups=[];
  if(user.length)groups.push(['Ваши исключения',user]);
  const kc=Object.keys(s.kc||{});
  KP_GROUPS.forEach(([t,str])=>groups.push([t,str.split(' ').filter(Boolean)]));
  for(const [title,list] of groups){
    const items=[];
    for(const p of list){const c=Array.from(p);if(c.length!==2||!kkHas(c[0])||!kkHas(c[1]))continue;
      const i=kkInfo(c[0],c[1]);tot++;const fl=kkFlags(i);if(fl.length)bad++;
      if(KK.only&&!fl.length)continue;items.push([p,c,i,fl]);}
    if(!items.length)continue;
    const h=document.createElement('h4');h.textContent=title;box.appendChild(h);
    const row=document.createElement('div');row.className='row kk-row';
    for(const [p,c,i,fl] of items){const b=document.createElement('button');b.type='button';
      b.className='chip kk-chip'+(c[0]===KK.a&&c[1]===KK.b?' on':'')+(fl.length?' bad':'')+((i.src==='exc'||i.src==='cls')?' usr':'');
      b.title=KK_SRC[i.src]+(fl.length?' · '+fl.join(', '):'');
      b.innerHTML='<span class="kk-pr">'+kkEsc(p)+'</span><span class="kk-val">'+(i.blocked?'—':kkFmt(i.v))+'</span>';
      b.addEventListener('click',()=>kkPick(c[0],c[1]));row.appendChild(b);}
    box.appendChild(row);}
  const cl=Object.keys(s.kc||{});
  $('#kk-sum').textContent='Пар в списке: '+tot+' · с замечаниями: '+bad+' · ваших исключений: '+Object.keys(s.ku||{}).length+', классов: '+cl.length;
  $('#kk-clear').disabled=!(Object.keys(s.ku||{}).length||cl.length);
}
function kernRender(light){
  if(S.tab!=='kern')return;
  kkSync();kkDrawBig();kkDrawTxt();
  if(light){clearTimeout(KK.listT);KK.listT=setTimeout(kkRenderList,160);}else{clearTimeout(KK.listT);kkRenderList();}
}
function kkPick(a,b){KK.a=a;KK.b=b;KK.snapped=false;kernRender();}
/* изменение значения: одно действие отмены на жест (перетаскивание, серия стрелок — отдельные шаги) */
function kkSet(v,gesture){
  const a=KK.a,b=KK.b;if(!a||!b||!kkHas(a)||!kkHas(b))return;
  const i=kkInfo(a,b);if(i.blocked){toast('Между буквами Прописи кернинг не применяется — они соединяются');return;}
  if(!gesture||!KK.snapped){snap();KK.snapped=!!gesture;}
  kernApply(kkSt(),a,b,v,KK.mode,i);
  persist();schedule();kernRender(!!gesture);
}
function kkReset(){
  const a=KK.a,b=KK.b;if(!a||!b)return;const i=kkInfo(a,b);snap();kernReset(kkSt(),a,b,i);persist();schedule();kernRender();
}
function kkCurV(){return kkInfo(KK.a,KK.b).v;}
function kkBuild(){
  const css0=document.createElement('style');css0.textContent=`
#view-kern .kk-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
#view-kern .kin{width:56px;text-align:center;font-size:var(--fs-lg);background:var(--panel);padding:7px 8px;border-radius:var(--r-sm)}
#kk-big,#kk-ctxt{width:100%;display:block;background:var(--panel);border-radius:var(--r);touch-action:pan-y;-webkit-user-select:none;user-select:none}
#kk-big{height:min(46vh,340px);cursor:ew-resize}
#kk-ctxt{height:96px;cursor:text}
#kk-big:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
#view-kern .kk-ctl{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:12px 0 6px}
#view-kern .kk-ctl .kin{width:78px}
#view-kern .kk-src b{font-weight:600}
#view-kern .kk-src span{color:var(--muted);margin-left:6px}
#view-kern .kk-meta{color:var(--muted);font-size:var(--fs-md);margin-top:2px}
#view-kern .kk-flags{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}
#view-kern .kk-flag{background:var(--warn-soft);color:var(--warn-text);border-radius:var(--r-pill);padding:3px 10px;font-size:var(--fs-md);font-weight:600}
#view-kern .kk-ttl{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 8px}
#view-kern .kk-chip{display:inline-flex;gap:8px;align-items:center;background:var(--panel)}
#view-kern .kk-chip .kk-pr{font-weight:700;font-size:var(--fs-base)}
#view-kern .kk-chip .kk-val{color:var(--muted);font-variant-numeric:tabular-nums;font-size:var(--fs-sm)}
#view-kern .kk-chip.on{background:var(--ink);color:var(--on-ink)}#view-kern .kk-chip.on .kk-val{color:var(--on-ink)}
#view-kern .kk-chip.bad{box-shadow:inset 0 0 0 2px var(--danger)}
#view-kern .kk-chip.usr .kk-val{font-weight:700}
#view-kern .kk-chip.on.usr .kk-val{color:var(--on-ink)}
#view-kern .kk-row{margin-bottom:6px}
#kk-sum{color:var(--muted);font-size:var(--fs-md)}
@media (max-width:560px){#kk-big{height:240px}#view-kern .kin{width:48px}}`;
  document.head.appendChild(css0);
  const sec=document.createElement('section');sec.className='proof';sec.id='view-kern';sec.hidden=true;sec.setAttribute('aria-label','Кернинг');
  sec.innerHTML=`
<div class="kk-bar">
  <span>Пара</span><input class="kin" id="kk-a" maxlength="2" aria-label="Левый знак" autocomplete="off"><input class="kin" id="kk-b" maxlength="2" aria-label="Правый знак" autocomplete="off">
  <button class="btn sm" id="kk-sw" type="button" title="Поменять местами">⇄</button>
  <div class="seg" id="kk-cx" role="group" aria-label="Контекст"><button type="button" class="on" data-c="auto">Авто</button><button type="button" data-c="HH">H?H</button><button type="button" data-c="nn">n?n</button><button type="button" data-c="pair">Пара</button></div>
  ${window.DM?DM.hintHTML('kern','dm-qk'):''}
</div>
<canvas id="kk-big" tabindex="0" role="slider" aria-label="Кернинг пары: тяните вправо и влево или стрелками (Shift — по 10)"></canvas>
<div class="kk-ctl" id="kk-ctl">
  <button class="btn sm" type="button" data-d="-10">−10</button><button class="btn sm" type="button" data-d="-1">−1</button>
  <input class="kin" id="kk-v" type="text" inputmode="text" autocomplete="off" aria-label="Значение кернинга">
  <button class="btn sm" type="button" data-d="1">+1</button><button class="btn sm" type="button" data-d="10">+10</button>
  <button class="btn sm" id="kk-reset" type="button">К авто</button>
  <div class="seg" id="kk-mode" role="group" aria-label="Куда применить"><button type="button" data-m="exc" class="on">Только эта пара</button><button type="button" data-m="cls">Классы обеих сторон</button></div>
</div>
<div id="kk-info"></div>
<h3>В тексте</h3>
<div class="kk-ttl"><span style="color:var(--muted);font-size:var(--fs-md)">Печатайте прямо в образце. Нажмите между двумя буквами, чтобы выбрать пару</span></div>
<div id="kk-ctbox"><canvas id="kk-ctxt" aria-label="Образец текста"></canvas><input class="ktxt" id="kk-txt" aria-label="Текст для проверки: печатайте прямо в образце" maxlength="300" autocomplete="off" spellcheck="false"></div>
<h3>Основные пары</h3>
<div class="ptools"><label class="chk"><input type="checkbox" id="kk-only">Только с замечаниями</label><button class="btn sm" id="kk-clear" type="button">Сбросить мои правки</button><span id="kk-sum"></span></div>
<div id="kk-list"></div>`;
  $('#view-proof').after(sec);
  /* вход в кернинг: из параметров («Кернинг пар…») и из образца («Поправить пару») — вкладки нет */
  window.addEventListener('keydown',e=>{if(S.tab==='kern'&&e.key==='Escape'&&!e.target.closest('input'))setTab('edit');});
  $('#kern-open').addEventListener('click',e=>{e.preventDefault();setTab('kern');});
  /* образец в редакторе: печать прямо в нём; щелчок в зазор между буквами — каретка и панель кернинга пары (kkPairPop) */
  const spc=$('#spec'),sw=$('#specwrap');
  smpAttach('spec',{cv:spc,box:$('#specbox'),ta:$('#txt'),multi:true,max:5000,
    on:()=>!!sw&&!sw.classList.contains('shut'),
    crow:()=>S.style==='italic'?1:0,
    hide:()=>{const p=$('#kk-pop');if(p)p.hidden=true;},
    press:()=>{const p=$('#kk-pop');if(p)p.hidden=true;},
    tap:(h,e)=>{
      const t=$('#txt').value,L=Array.from(t.slice(0,h.i)).pop(),R=Array.from(t.slice(h.i))[0];
      if(!L||!R||/\s/.test(L)||/\s/.test(R)||h.dx>10||(S.cmp&&S.cmp.on&&h.row!==0))return;
      kkPopOpen(L,R,e.clientX,h);}});
  document.addEventListener('pointerdown',e=>{const p=$('#kk-pop');if(p&&!p.hidden&&!p.contains(e.target)&&!(e.target===spc))p.hidden=true;});
  window.addEventListener('keydown',e=>{const p=$('#kk-pop');if(p&&!p.hidden&&e.key==='Escape'){p.hidden=true;}},true);
  $('#kk-txt').value=KK.txt;
  /* поля пары */
  const rd=(id,key)=>$(id).addEventListener('input',e=>{const c=Array.from(e.target.value)[0];if(c){KK[key]=c;KK.snapped=false;kernRender();}});
  rd('#kk-a','a');rd('#kk-b','b');
  for(const id of ['#kk-a','#kk-b'])$(id).addEventListener('blur',()=>{$(id).value=KK[id==='#kk-a'?'a':'b'];});
  $('#kk-sw').addEventListener('click',()=>kkPick(KK.b,KK.a));
  $('#kk-cx').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;KK.ctx=b.dataset.c;$$('#kk-cx button').forEach(x=>x.classList.toggle('on',x===b));kkDrawBig();});
  $('#kk-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.classList.contains('dis'))return;KK.mode=b.dataset.m;kernRender();});
  $('#kk-ctl').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b)kkSet(kkCurV()+(+b.dataset.d));});
  $('#kk-v').addEventListener('change',e=>{if(!(KK.a&&KK.b&&kkHas(KK.a)&&kkHas(KK.b))){e.target.value='';return;}const v=kkParse(e.target.value);if(isFinite(v))kkSet(v);e.target.value=kkNum(kkCurV());});
  $('#kk-v').addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();kkSet(kkCurV()+(e.key==='ArrowUp'?1:-1)*(e.shiftKey?10:1));}else if(e.key==='Enter'){e.preventDefault();e.target.blur();}});
  $('#kk-reset').addEventListener('click',kkReset);
  $('#kk-only').addEventListener('change',e=>{KK.only=e.target.checked;kkRenderList();});
  $('#kk-clear').addEventListener('click',()=>{snap();const s=kkSt();s.ku={};s.kc={};persist();schedule();kernRender();toast('Ваш кернинг сброшен, остался автоматический — буквы подружились сами');});
  $('#kk-txt').addEventListener('input',e=>{KK.txt=e.target.value;kkDrawTxt();});
  /* текст проверки: печать прямо в образце; щелчок рядом с зазором между буквами ещё и выбирает пару */
  smpAttach('kk',{cv:$('#kk-ctxt'),box:$('#kk-ctbox'),ta:$('#kk-txt'),multi:false,max:300,
    on:()=>S.tab==='kern',
    tap:(h)=>{const t=$('#kk-txt').value,L=Array.from(t.slice(0,h.i)).pop(),R=Array.from(t.slice(h.i))[0];
      if(L&&R&&!/\s/.test(L)&&!/\s/.test(R)&&h.dx<40)kkPick(L,R);}});
  /* перетаскивание правого знака */
  const big=$('#kk-big');
  big.addEventListener('pointerdown',e=>{if(!KK.bigGeo)return;const i=kkInfo(KK.a,KK.b);if(i.blocked){toast('Между буквами Прописи кернинг не применяется — они соединяются');return;}
    big.setPointerCapture(e.pointerId);big.focus({preventScroll:true});snap();KK.drag={x:e.clientX,v:i.v,sc:KK.bigGeo.sc,moved:false};});
  big.addEventListener('pointermove',e=>{const d=KK.drag;if(!d)return;
    const v=Math.round(d.v+(e.clientX-d.x)/d.sc);if(!d.moved&&v===d.v)return;d.moved=true;
    kernApply(kkSt(),KK.a,KK.b,v,KK.mode,kkInfo(KK.a,KK.b));persist();schedule();kernRender(true);});
  const end=()=>{const d=KK.drag;KK.drag=null;if(d&&!d.moved)undoStack.pop();if(d&&d.moved)kernRender();};
  big.addEventListener('pointerup',end);big.addEventListener('pointercancel',end);
  big.addEventListener('keydown',e=>{const st=e.shiftKey?10:1;let d=0;
    if(e.key==='ArrowRight'||e.key==='ArrowUp')d=st;else if(e.key==='ArrowLeft'||e.key==='ArrowDown')d=-st;
    else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();kkReset();return;}else return;
    e.preventDefault();kkSet(kkCurV()+d);});
  window.addEventListener('resize',()=>{if(S.tab==='kern')kernRender();});
}
/* панель кернинга пары над образцом: пара, значение, −/+ (меняют кернинг сразу, живая перерисовка образца), «К авто», «Открыть» (вкладка «Кернинг») */
function kkPairPop(){
  let p=$('#kk-pop');if(p)return p;
  p=document.createElement('div');p.id='kk-pop';p.className='nudge pairpop';p.hidden=true;p.setAttribute('role','group');p.setAttribute('aria-label','Кернинг пары');
  p.innerHTML='<span class="pp-pair" id="pp-pair"></span>'
    +'<button class="pp-b" type="button" data-d="-1" aria-label="Сблизить пару (Shift — на 10)" title="Сблизить (Shift: на 10)">−</button>'
    +'<input class="pp-v" id="pp-v" type="number" step="1" aria-label="Значение кернинга пары">'
    +'<button class="pp-b" type="button" data-d="1" aria-label="Раздвинуть пару (Shift — на 10)" title="Раздвинуть (Shift: на 10)">+</button>'
    +'<button class="pp-b" type="button" id="pp-auto" title="Вернуть автоматический кернинг пары">К авто</button>'
    +'<button class="pp-b pp-open" type="button" id="pp-open">Открыть</button>'
    +'<span class="pp-t" id="pp-t" hidden></span>';
  p.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.d)kkPopSet(kkPopV()+(+b.dataset.d)*(e.shiftKey?10:1));
    else if(b.id==='pp-auto'){const a=p.dataset.a,c=p.dataset.b,i=kkInfo(a,c);if(i.blocked)return;KK.a=a;KK.b=c;snap();kernReset(kkSt(),a,c,i);persist();schedule();kkPopSync();toast('Кернинг подтянули — буквы подружились');}
    else if(b.id==='pp-open'){const a=p.dataset.a,c=p.dataset.b;p.hidden=true;kkPick(a,c);setTab('kern');}
  });
  p.addEventListener('change',e=>{if(e.target.id==='pp-v'&&e.target.value!=='')kkPopSet(+e.target.value);});
  p.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='pp-v'){e.preventDefault();e.target.blur();}});
  document.body.appendChild(p);return p;
}
function kkPopV(){const p=$('#kk-pop');return kkInfo(p.dataset.a,p.dataset.b).v;}
function kkPopSync(){
  const p=$('#kk-pop');if(!p)return;const i=kkInfo(p.dataset.a,p.dataset.b);
  $('#pp-pair').textContent=p.dataset.a+p.dataset.b;
  const v=$('#pp-v');if(document.activeElement!==v)v.value=Math.round(i.v);
  const bl=!!i.blocked;
  p.querySelectorAll('.pp-b:not(.pp-open),.pp-v').forEach(x=>{x.disabled=bl;});
  const t=$('#pp-t');t.hidden=!bl;t.textContent=bl?'Пропись: буквы соединяются':'';
}
function kkPopSet(v){
  const p=$('#kk-pop'),a=p.dataset.a,b=p.dataset.b;if(!kkHas(a)||!kkHas(b)||!isFinite(v))return;
  const i=kkInfo(a,b);if(i.blocked)return;
  KK.a=a;KK.b=b;if(!KK.snapped){snap();KK.snapped=true;}/* все нажатия, пока панель открыта на одной паре — один шаг отмены */
  kernApply(kkSt(),a,b,Math.round(v),KK.mode,i);persist();schedule();kkPopSync();
}
function kkPopOpen(a,b,cx,hit){
  if(typeof hintMark==='function'){hintMark('pair');hintHide();}
  const p=kkPairPop();p.dataset.a=a;p.dataset.b=b;KK.snapped=false;kkPopSync();
  p.hidden=false;
  const w=p.offsetWidth||300,h=p.offsetHeight||40,cr=$('#spec').getBoundingClientRect(),br=$('#specbox').getBoundingClientRect();
  /* место: сразу под парой; если там строки образца — над рамкой образца; иначе под рамкой. Знаки не закрываются никогда */
  const I=SMP_I.spec,lines=[];if(I)for(const B of I.rows)for(const q of B)lines.push([q.y0,q.y1]);
  const hits=y=>lines.some(l=>cr.top+l[1]>y&&cr.top+l[0]<y+h);
  const cand=[cr.top+hit.e.y1+6,br.top-h-6,br.bottom+6];
  let y=cand.find(v=>v>=8&&v+h<=innerHeight-8&&!hits(v));
  if(y==null)y=cand[2]+h<=innerHeight-8?cand[2]:cand[1];
  const lo=Math.max(12,cr.left||0);/* не заходит на рейл */
  p.style.left=Math.max(lo,Math.min(innerWidth-w-12,cx-w/2))+'px';p.style.top=y+'px';
  if(window.TOUR)TOUR.hint('kernpill',p);/* первый раз: что делают кнопки панели */
}
/* подключение к вкладкам и к bump (отмена, смена начертания) */
document.addEventListener('DOMContentLoaded',()=>{
  kkBuild();
  const _set=setTab;
  setTab=function(t){
    if(t!=='kern'){const v=$('#view-kern');if(v)v.hidden=true;return _set(t);}
    S.tab='kern';$('#view-lib').hidden=true;$('#view-edit').hidden=true;$('#view-proof').hidden=true;$('#view-kern').hidden=false;
    $$('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab==='kern'));
    document.body.classList.remove('tab-lib');document.body.classList.add('tab-proof');
    requestAnimationFrame(()=>{
      if(!kkHas(KK.a)||!kkHas(KK.b)){const f=FONTS[S.fontId]&&FONTS[S.fontId].kernDemo;KK.a=kkHas('A')?'A':CHARSET.find(c=>kkHas(c)&&c!==' ');KK.b=kkHas('V')?'V':KK.a;}
      kernRender();});
  };
  const _bump=bump;
  bump=function(){const r=_bump.apply(this,arguments);if(S.tab==='kern')kernRender();return r;};
});

/* ===== Кернинг: плашка = экспорт =====
   1) Экспорт округляет advance знаков до целых (buildTTF: adv:Math.round(fg.adv)), а плашка считала профили по дробным advance:
      на границе округления (разница пары и класса ровно 6) исключение «То» −54 в плашке пропадало из GPOS, где оставался класс −78.
      Теперь окружение кернинга (kernEnv) всегда строится по знакам с целым advance, как в экспорте.
   2) Замок Прописи: плашка показывает «заблокировано», а классовая таблица и таблица пар (KERN_TABLE) шли в GPOS (96 пар из 471).
      Обёртки над classKernTable и buildOTL убирают из экспорта пары букв, которые kernBlocked блокирует в интерфейсе. */
(function(){
  if(typeof kernEnv==='function'){const _ke=kernEnv;
    kernEnv=function(st,styleKey,get,auto){
      const g2=ch=>{const g=get?get(ch):finalGlyph(ch,st,{});return g&&g.adv!==Math.round(g.adv)?Object.assign({},g,{adv:Math.round(g.adv)}):g;};
      return _ke.call(this,st,styleKey,g2,auto);};}
  /* Skeleton fonts: the pill measures FAST glyphs (kkGet), the export measures exact ones; a 0.03-unit difference flips a pair exception at the 6-unit threshold.
     When the exported style is the live one (same glyph advances), the export takes the very same class table the pill reads (kernEnv). */
  let OTLX=null;
  if(typeof classKernTable==='function'){const _ck=classKernTable;
    classKernTable=function(st,prof,isLow,fontId){
      if(OTLX&&OTLX.st===st&&fontId==null&&OTLX.same){try{const env=kernEnv(st,OTLX.key,kkGet);if(env&&env.ct!==undefined)return env.ct;}catch(e){}}
      const r=_ck.apply(this,arguments);
      if(!r||typeof kernBlocked!=='function'||(fontId||CUR_FONT)!==CUR_FONT)return r;
      for(const key of Object.keys(r.pairs||{})){const cc=Array.from(key);if(cc.length===2&&kernBlocked(cc[0],cc[1]))delete r.pairs[key];}
      for(const key of Object.keys(r.vals||{})){const [l,rr]=key.split('|'),A=(r.L.find(x=>x[0]===l)||[0,[]])[1],B=(r.R.find(x=>x[0]===rr)||[0,[]])[1];
        let all=true,some=false;const bl=[];for(const a of A)for(const b of B){if(kernBlocked(a,b)){some=true;bl.push(a+b);}else all=false;}
        if(!some)continue;
        if(all)delete r.vals[key];else bl.forEach(k=>{r.pairs[k]=0;});}
      return r;};}
  if(typeof buildOTL==='function'){const _bo=buildOTL;
    buildOTL=function(glyphs,st,kmap,fontId){
      if(typeof kernBlocked==='function'&&kmap){const k2={};for(const key in kmap){const cc=Array.from(key);if(cc.length===2&&kernBlocked(cc[0],cc[1]))continue;k2[key]=kmap[key];}kmap=k2;}
      const prev=OTLX;OTLX=null;
      try{const key=S.styles&&st===S.styles.regular?'regular':S.styles&&st===S.styles.italic?'italic':null;
        if(key&&fontId==null){const env=kernEnv(st,key,kkGet);let miss=0,n=0;
          for(const g of glyphs){if(g.ch==null||g.uni==null||!isLetter(g.ch))continue;const q=env.prof(g.ch);n++;if(q&&Math.abs(q.adv-g.adv)>2)miss++;if(n>=80)break;}/* FAST и точный знак расходятся до ~1.5 ед.; расхождение у многих букв — униширина или другой вес */
          const same=n>0&&miss<=n*0.1;
          OTLX={st,key,same};}}catch(e){OTLX=null;}
      try{return _bo.call(this,glyphs,st,kmap,fontId);}finally{OTLX=prev;}};}
})();
