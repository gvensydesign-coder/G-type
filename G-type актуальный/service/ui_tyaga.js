/* ===== «Тяга»: «~» в образце и инструмент «Блок» =====
   1) Образец и тестер рисуются контурами, а не системным шрифтом, поэтому GSUB не применяется. Та же подстановка, что пишется в экспорт
      (буква + «~»×n -> буква.sN), выполняется здесь: буква заменяется служебным символом U+F8xx (OTU.ch), «~» убираются.
   2) «Блок»: когда открыта «Тяга», у образца есть режим «Блок» — многострочный текст, ширина блока, выключка («На одну букву» / «Равномерно»),
      ручная растяжка правого края буквы (мышь/касание; с клавиатуры: стрелки вверх-вниз выбирают букву, влево-вправо растягивают),
      выгрузка PNG/SVG и «Скопировать текст с ~» (тот же текст с тильдами даёт такую же растяжку в Figma и Word с файлом шрифта).
   Состояние блока лежит в слоте шрифта (S.tyb → S.lib.tyaga.tyb), сохраняется в проекте и в localStorage вместе с ползунками.
   Стили: блок «T2» в template.html; описание: MANIFEST.md, RECIPE_tyaga.md; тест: tests/e2e_tyaga.py. */
(function(){
if(typeof FONTS==='undefined'||!FONTS.tyaga||typeof TYG==='undefined'||typeof TYS==='undefined')return;
const F=FONTS.tyaga,CAP=TYG.M.cap;
const on=()=>typeof CUR_FONT==='string'&&CUR_FONT==='tyaga';
const DEF_TXT='ПЛЕ\nСНЕ\nВЫЙ\nСЫР';
/* ---------- «~» в образце ---------- */
const keyOf=(name)=>{const m=/^uni([0-9A-F]+)\.s(\d)$/.exec(name||'');return m?{ch:String.fromCodePoint(parseInt(m[1],16)),n:+m[2]}:null;};
function pre(text){
  if(typeof text!=='string'||!on()||text.indexOf('~')<0||typeof OTU==='undefined')return text;
  return text.split('\n').map(line=>{
    const a=[...line],out=[];
    for(let i=0;i<a.length;i++){
      const c=a[i];if(c==='~')continue;
      let n=0;while(a[i+1+n]==='~')n++;
      const cl=n&&TYG.has(c)?TYG.CLASS(c):null,st=cl&&TYG.STEPS[cl];
      if(st&&st.length){out.push(OTU.ch(TYS.altName(TYG.canon(c),Math.min(n,st.length))));i+=n;}
      else out.push(c);}
    return out.join('');}).join('\n');}
const _lay=layout;
layout=function(text,key){const a=Array.prototype.slice.call(arguments);a[0]=pre(text);return _lay.apply(this,a);};
if(typeof ttLayout==='function'){const _t=ttLayout;ttLayout=function(text,k){const a=Array.prototype.slice.call(arguments);a[0]=pre(text);return _t.apply(this,a);};}
/* кернинг у растянутой формы — как у её основы (в файле так же: kernAs) */
if(typeof classKernValue==='function'){const _ckv=classKernValue;
  classKernValue=function(a,b){const A=Array.prototype.slice.call(arguments);
    if(on()&&typeof OTU!=='undefined'){for(const i of [0,1]){const k=keyOf(OTU.rev.get(A[i]));if(k)A[i]=k.ch;}}
    return _ckv.apply(this,A);};}
/* миниатюры списка знаков: масштаб по полному ink-боксу шрифта (высота с выносными и точками Ё, ширина самого широкого знака), центр — по ink знака; поля 10% ячейки */
let tfKey='',tfBox=null;
function tfBoxOf(){const key=S.style+'|'+JSON.stringify(cur().p);if(key===tfKey&&tfBox)return tfBox;
  let y0=1e9,y1=-1e9,wm=0;
  for(const ch of CHARSET){if(ch==='~'||ch.trim()===''||isSpaceCh(ch))continue;const g=getFinal(ch,S.style);if(!g||!g.cs.length)continue;
    let a=1e9,b=-1e9;for(const c of g.cs)for(const n of c.nodes)for(const z of [n,n.a,n.b]){if(!z)continue;if(z.y<y0)y0=z.y;if(z.y>y1)y1=z.y;if(z.x<a)a=z.x;if(z.x>b)b=z.x;}
    wm=Math.max(wm,b-a);}
  tfKey=key;return tfBox={y0,y1,wm};}
window.thumbFit=function(g,w,h){
  if(!on()||!g||!g.cs.length)return null;
  const B=tfBoxOf(),pad=Math.max(4,Math.min(w,h)*0.1);
  const sc=Math.min((h-2*pad)/(B.y1-B.y0),(w-2*pad)/B.wm);
  let a=1e9,b=-1e9;for(const c of g.cs)for(const n of c.nodes)for(const z of [n,n.a,n.b]){if(!z)continue;if(z.x<a)a=z.x;if(z.x>b)b=z.x;}
  return {sc,ox:w/2-(a+b)/2*sc,oy:h/2+(B.y0+B.y1)/2*sc};};
/* ---------- состояние блока ---------- */
const CL=(v,a,b)=>Math.min(b,Math.max(a,v));
function tbClean(d){
  const o={on:false,txt:DEF_TXT,w:5.55,just:true,mode:'one',man:{}};
  if(!d||typeof d!=='object')return o;
  if(typeof d.txt==='string')o.txt=d.txt.replace(/[^\S\n]+$/gm,'').split('\n').slice(0,12).join('\n').slice(0,400);
  if(isFinite(+d.w))o.w=CL(+d.w,2,16);
  o.seen=d.seen?1:0;o.on=!!d.on;o.just=d.just!==false;o.mode=d.mode==='eq'?'eq':'one';
  if(d.man&&typeof d.man==='object')for(const k of Object.keys(d.man).slice(0,200)){const v=d.man[k];
    if(/^\d{1,2}:\d{1,3}$/.test(k)&&Array.isArray(v)&&isFinite(+v[0])&&typeof v[1]==='string'&&v[1].length<=2)o.man[k]=[CL(+v[0],1,6),v[1]];}
  return o;}
/* единственный источник — слот шрифта (S.lib.tyaga.tyb): состояние не кешируется отдельно, поэтому загрузка проекта и переключение шрифтов его не теряют */
const CLEAN=new WeakSet();
const tbMake=d=>{const o=tbClean(d);CLEAN.add(o);return o;};
const TB=()=>{const sl=S.lib&&S.lib.tyaga;if(sl){if(!sl.tyb||!CLEAN.has(sl.tyb))sl.tyb=tbMake(sl.tyb);S.tyb=sl.tyb;return sl.tyb;}if(!S.tyb||!CLEAN.has(S.tyb))S.tyb=tbMake(S.tyb);return S.tyb;};
const _stash=stash;stash=function(){const r=_stash.apply(this,arguments);if(S.fontId==='tyaga'&&S.tyb&&S.lib.tyaga)S.lib.tyaga.tyb=S.tyb;return r;};
const _mk=mkSlot;mkSlot=function(id,d){const s=_mk.apply(this,arguments);if(id==='tyaga'&&d&&d.tyb)s.tyb=tbMake(d.tyb);return s;};
const _act=activate;activate=function(id){const r=_act.apply(this,arguments);sync();return r;};
const _bp=buildPanel;buildPanel=function(){
  if(S.fontId==='tyaga'||on())F.params.tlg=TB().on?['Межстрочный (блок), %',TYS.LIM.tlg[0],TYS.LIM.tlg[1],0.5]:null;
  return _bp.apply(this,arguments);};
/* ---------- разметка ---------- */
let W=null,sel=null,hits=[],drag=null,hover=null,view={sc:1,ox:0,oy:0,bw:0},lastModel=null;
function mount(){
  const sw=document.getElementById('specwrap'),body=document.getElementById('sw-body');if(!sw||!body||W)return;
  W={};
  const tog=document.createElement('div');tog.className='tyb-tog';tog.hidden=true;
  tog.innerHTML='<div class="seg" id="tyb-view" role="group" aria-label="Вид образца"><button type="button" data-m="smp" aria-pressed="true">Образец</button><button type="button" data-m="blk" aria-pressed="false">Блок</button></div>';
  const hd=sw.querySelector(':scope>.pane-h');sw.insertBefore(tog,hd?hd.nextSibling:sw.firstChild);
  const st=document.createElement('div');st.className='tyb-stage';st.id='tyb-stage';st.hidden=true;
  st.innerHTML='<canvas id="tyb-cv" tabindex="0" role="application" aria-roledescription="блок букв" aria-label="Блок. Стрелки вверх и вниз выбирают букву, стрелки влево и вправо растягивают её" width="10" height="10"></canvas>';
  sw.appendChild(st);
  const ct=document.createElement('div');ct.className='tyb-ctl';ct.id='tyb-ctl';ct.hidden=true;
  ct.innerHTML=
   '<div class="tyb-grid">'+
    '<div class="tyb-txtw"><label class="tyb-lab" for="tyb-txt">Текст блока</label><textarea class="inp" id="tyb-txt" rows="4" spellcheck="false" autocomplete="off" placeholder="Печатайте строки блока" aria-describedby="tyb-hint"></textarea></div>'+
    '<div class="tyb-opts">'+
     '<div class="ctl"><label for="tyb-w"><span>Ширина блока</span><output id="tyb-wo" for="tyb-w"></output></label><input type="range" id="tyb-w" min="2" max="16" step="0.05" aria-label="Ширина блока в высотах прописной"></div>'+
     '<label class="tgl"><input type="checkbox" role="switch" id="tyb-just"><span>Выровнять блок</span></label>'+
     '<div class="seg" id="tyb-mode" role="group" aria-label="Как распределять растяжку"><button type="button" data-v="one" aria-pressed="true">На одну букву</button><button type="button" data-v="eq" aria-pressed="false">Равномерно</button></div>'+
    '</div>'+
   '</div>'+
   '<p class="tyb-hint" id="tyb-hint">Потяните правый край буквы. С клавиатуры: стрелки вверх и вниз выбирают букву, влево и вправо растягивают, Delete возвращает ширину. «~» после буквы фиксирует шаг.</p>'+
   '<p class="tyb-info" id="tyb-info" role="status" aria-live="polite"></p>'+
   '<div class="tyb-act"><button class="btn sm" type="button" id="tyb-rst">Сбросить растяжку</button><button class="btn sm" type="button" id="tyb-cp" title="Тот же текст с тильдами даёт такую же растяжку в Figma и Word со шрифтом Тяга">Скопировать текст с ~</button><button class="btn sm" type="button" id="tyb-svg">SVG</button><button class="btn sm pri" type="button" id="tyb-png">Скачать PNG</button><p class="tyb-cphint" id="tyb-cphint">Вставляя текст с «~» в Word, включите «Стандартные лигатуры» (Шрифт → Дополнительно). В Figma растяжка работает сразу.</p></div>';
  body.insertBefore(ct,body.firstChild);
  W={sw,tog,st,ct,cv:st.querySelector('#tyb-cv'),txt:ct.querySelector('#tyb-txt'),w:ct.querySelector('#tyb-w'),wo:ct.querySelector('#tyb-wo'),just:ct.querySelector('#tyb-just'),mode:ct.querySelector('#tyb-mode'),info:ct.querySelector('#tyb-info')};
  tog.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const t=TB();const v=b.dataset.m==='blk';if(t.on===v)return;t.on=v;if(v&&sw._pane&&!sw._pane.open)sw._pane.set(true,true,true);save();sync();rebuild();}));
  W.txt.addEventListener('input',()=>{const t=TB();t.txt=W.txt.value.split('\n').slice(0,12).join('\n').slice(0,400);if(W.txt.value!==t.txt)W.txt.value=t.txt;prune();save();draw();});
  W.w.addEventListener('input',()=>{TB().w=+W.w.value;save();draw();});
  W.just.addEventListener('change',()=>{TB().just=W.just.checked;save();sync();draw();});
  W.mode.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{TB().mode=b.dataset.v;save();sync();draw();}));
  ct.querySelector('#tyb-rst').addEventListener('click',()=>{TB().man={};sel=null;save();draw();say('Ручная растяжка сброшена');});
  ct.querySelector('#tyb-cp').addEventListener('click',copyTilde);
  ct.querySelector('#tyb-svg').addEventListener('click',()=>exportFile('svg'));
  ct.querySelector('#tyb-png').addEventListener('click',()=>exportFile('png'));
  bindCanvas();
  if(window.ResizeObserver)new ResizeObserver(()=>{if(visible())draw();}).observe(st);
  new MutationObserver(()=>{if(visible())draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
const visible=()=>!!(W&&on()&&TB().on&&!W.st.hidden);
function save(){if(typeof persist==='function')persist();}
function rebuild(){if(typeof buildPanel==='function'&&on()){buildPanel();if(typeof syncPanel==='function')syncPanel();}}
function say(m){if(W&&W.info){W.info.textContent=m;W.info.dataset.bad='';}}
function badNote(M){if(!W||!W.info)return;const i=W.info;if(M.bad.size){if(!i.textContent||i.dataset.bad==='1'){i.textContent='Нет знака в шрифте, пропущено: '+[...M.bad].join(' ');i.dataset.bad='1';}}else if(i.dataset.bad==='1'){i.textContent='';i.dataset.bad='';}}
function sync(){
  if(!W)mount();if(!W)return;
  const is=on(),t=is?TB():null,blk=!!(is&&t.on);
  W.tog.hidden=!is;W.st.hidden=!blk;W.ct.hidden=!blk;
  W.sw.classList.toggle('tyb-on',blk);const ve=document.getElementById('view-edit');if(ve)ve.classList.toggle('tyb-ed',blk);
  if(!is)return;
  if(blk&&!W.autoOpened&&W.sw._pane){W.autoOpened=1;if(!W.sw._pane.open)W.sw._pane.set(true,true,true);}/* блок сохранён включённым: после загрузки образец раскрывается один раз за сессию */
  if(!t.seen&&W.sw._pane){t.seen=1;if(!W.sw._pane.open)W.sw._pane.set(true,true,true);}/* первый заход в «Тягу»: образец раскрыт, чтобы был виден переключатель «Блок» (без записи в настройки панели) */
  W.tog.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String((b.dataset.m==='blk')===blk));b.classList.toggle('on',(b.dataset.m==='blk')===blk);});
  if(document.activeElement!==W.txt)W.txt.value=t.txt;
  W.w.value=t.w;W.wo.textContent=t.w.toFixed(2)+' H';W.wo.title='H — высота прописной';
  W.w.style.setProperty('--lo','0%');W.w.style.setProperty('--hi',((t.w-2)/14*100).toFixed(1)+'%');
  W.just.checked=t.just;W.w.disabled=!t.just;
  W.mode.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.v===t.mode));b.classList.toggle('on',b.dataset.v===t.mode);b.disabled=!t.just;});
  if(blk)requestAnimationFrame(draw);
}
/* ---------- модель блока ---------- */
const engP=()=>{const p=cur().p;return TYS.eng(p);};
function parse(){
  const t=TB(),bad=new Set();
  const lines=t.txt.split('\n').map(s=>{const it=TYG.parse(s);return it.filter(x=>{const sp=x.ch===' '||x.ch===' ';if(!sp&&!TYG.has(x.ch)){bad.add(x.ch);return false;}return true;});});
  return {lines,bad};}
function prune(){const t=TB(),m=parse().lines;for(const k of Object.keys(t.man)){const [l,i]=k.split(':').map(Number),it=m[l]&&m[l][i];if(!it||it.ch!==t.man[k][1])delete t.man[k];}}
function model(){
  const t=TB(),P=engP(),{lines,bad}=parse();
  lines.forEach((l,li)=>l.forEach((it,i)=>{const m=t.man[li+':'+i];if(m&&m[1]===it.ch){it.k=m[0];it.manual=true;}else{it.manual=false;if(!it.fixed)it.k=null;}}));
  let Wt=0;
  if(t.just)Wt=TYG.justify(lines,P,{width:t.w*CAP,mode:t.mode});
  else{const gk=P.stretch;lines.forEach(l=>{l.slack=0;l.forEach(it=>{if(it.fixed||it.manual||it.ch===' ')return;const cl=TYG.CLASS(it.ch);if(!cl||cl==='n'||gk<=1)return;it.k=Math.min(TYG.KMAX[cl],gk);});});}
  const lays=lines.map(l=>TYG.layoutLine(l,P,t.just?l.slack:0));
  return {P,lines,lays,Wt,bad};}
function vext(lay){let up=0,dn=0;for(const q of lay.glyphs){const b=q.g.bbox;up=Math.max(up,b.y1-CAP);dn=Math.max(dn,-b.y0);}return {up:Math.max(0,up),dn:Math.max(0,dn)};}
function geometry(M,wCss,maxH){
  const pad=Math.max(16,Math.min(32,wCss*0.04)),ext=M.lays.map(vext),slant=Math.tan((cur().p.slant||0)*Math.PI/180);
  const blockW=Math.max(1,M.Wt||0,...M.lays.map(l=>l.width))+CAP*slant*0.9;
  let y=0;const ys=[];
  M.lays.forEach((l,i)=>{ys.push(y);const gap=Math.max(M.P.lead*CAP,ext[i].dn+(ext[i+1]?ext[i+1].up:0)+0.05*CAP);y+=CAP+(i<M.lays.length-1?gap:0);});
  const top=Math.max(0.1*CAP,ext[0]?ext[0].up+0.04*CAP:0),bot=Math.max(0.1*CAP,ext.length?ext[ext.length-1].dn+0.04*CAP:0),blockH=(y||CAP)+top+bot;
  const sc=Math.min(0.5,(wCss-2*pad)/blockW,(maxH-2*pad)/blockH);
  return {pad,blockW,blockH,top,bot,ys,sc,slant,hCss:Math.round(blockH*sc+2*pad)};}
/* ---------- рисование ---------- */
function drawGlyphAt(ctx,g,x,y,sc,color,slant){
  ctx.save();ctx.translate(x,y);ctx.scale(sc,-sc);if(slant)ctx.transform(1,0,slant,1,0,0);ctx.fillStyle=color;ctx.fill(TYG.pathOf(g),'nonzero');ctx.restore();}
function draw(){
  if(!visible())return;
  const cv=W.cv,M=model(),wCss=Math.max(240,Math.floor(W.st.clientWidth)),dpr=window.devicePixelRatio||1;
  const wide=window.innerWidth>1060,maxH=wide?Math.max(260,Math.min(640,window.innerHeight-190)):Math.max(220,Math.min(window.innerWidth<=720?340:420,Math.round(window.innerHeight*0.5)));
  const G=geometry(M,wCss,maxH);lastModel=M;
  const hCss=Math.max(120,G.hCss);
  cv.width=Math.round(wCss*dpr);cv.height=Math.round(hCss*dpr);cv.style.width=wCss+'px';cv.style.height=hCss+'px';W.st.style.minHeight=hCss+'px';
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,wCss,hCss);
  const ink=dsColor('glyph'),mark=dsColor('ink'),muted=dsColor('cv-muted'),line=dsColor('cv-line');
  const bwPx=(M.Wt||Math.max(...M.lays.map(l=>l.width),1))*G.sc,ox=Math.max(G.pad,(wCss-bwPx-CAP*G.slant*G.sc*0.9)/2),oy=G.pad+G.top*G.sc;
  view={sc:G.sc,ox,oy,bw:bwPx,w:wCss,h:hCss,slant:G.slant};
  const t=TB();
  if(!M.lines.some(l=>l.length)){x.fillStyle=muted;x.font='500 14px Onest, system-ui, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('Введите текст блока',wCss/2,hCss/2);hits=[];badNote(M);return;}
  if(t.just){x.save();x.strokeStyle=line;x.lineWidth=1;x.setLineDash([3,4]);x.beginPath();x.moveTo(Math.round(ox)+0.5,G.pad*0.4);x.lineTo(Math.round(ox)+0.5,hCss-G.pad*0.4);x.moveTo(Math.round(ox+bwPx)+0.5,G.pad*0.4);x.lineTo(Math.round(ox+bwPx)+0.5,hCss-G.pad*0.4);x.stroke();x.restore();}
  hits=[];
  M.lays.forEach((lay,li)=>{const base=oy+(G.ys[li]+CAP)*G.sc;
    lay.glyphs.forEach(q=>{drawGlyphAt(x,q.g,ox+q.x*G.sc,base,G.sc,ink,G.slant);
      const x0=ox+q.x*G.sc,x1=ox+(q.x+q.g.W)*G.sc,mid=base-CAP*G.sc/2;
      hits.push({li,idx:q.idx,x0,x1:x1+G.slant*(CAP/2)*G.sc,y0:base-CAP*G.sc,y1:base,g:q.g,item:q.item,mid,bx1:x1});});});
  // выбранная / наводимая буква: рамка и ручка правого края (цвет — ink, не акцент)
  const cur1=drag||sel,hv=drag||hover;
  if(cur1){const h=hits.find(q=>q.li===cur1.li&&q.idx===cur1.idx);if(h){x.save();x.strokeStyle=mark;x.lineWidth=1.5;x.setLineDash([]);
    const m=3;x.strokeRect(Math.round(h.x0)-m+0.5,Math.round(h.y0)-m+0.5,Math.round(h.bx1-h.x0)+2*m,Math.round(h.y1-h.y0)+2*m);x.restore();}}
  const hh=hv&&hits.find(q=>q.li===hv.li&&q.idx===hv.idx);
  if(hh&&grip(hh)){const gx=Math.min(wCss-7,hh.x1),gy=hh.mid;x.save();x.fillStyle=mark;
    const w=8,h=Math.min(44,(hh.y1-hh.y0)*0.55);x.beginPath();if(x.roundRect)x.roundRect(gx-w/2,gy-h/2,w,h,4);else x.rect(gx-w/2,gy-h/2,w,h);x.lineWidth=3;x.strokeStyle=dsColor('canvas');x.stroke();x.fill();/* ободок цвета бумаги: ручка читается и на чёрной стойке */
    if(drag){const lab='×'+(hh.g.W/hh.g.w0).toFixed(2);x.font='600 12px Onest, system-ui, sans-serif';const tw=Math.ceil(x.measureText(lab).width)+14,bx=Math.max(4,Math.min(wCss-tw-4,gx-tw/2)),by=Math.max(4,hh.y0-30);
      x.fillStyle=mark;x.beginPath();if(x.roundRect)x.roundRect(bx,by,tw,22,11);else x.rect(bx,by,tw,22);x.fill();x.fillStyle=dsColor('canvas');x.textAlign='center';x.textBaseline='middle';x.fillText(lab,bx+tw/2,by+11);}
    x.restore();}
  W.cv.dataset.blockw=(M.Wt||0).toFixed(1);badNote(M);
}
const grip=h=>h.g.cls!=='n'&&h.g.w0>0;
function info(h){if(!h){return;}const g=h.g,names={f:'свободная, до ×6',d:'диагональная, до ×2',h:'горизонтали, до ×2',n:'не тянется'};say(g.ch+' · '+names[g.cls]+' · ширина ×'+(g.W/g.w0).toFixed(2));}
/* ---------- жесты ---------- */
function bindCanvas(){
  const cv=W.cv;
  const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*(cv.clientWidth/(r.width||1)),(e.clientY-r.top)*(cv.clientHeight/(r.height||1))];};
  const coarse=()=>window.matchMedia&&matchMedia('(pointer:coarse)').matches;
  const pick=(mx,my)=>{let best=null;const R=coarse()?22:12;for(const q of hits){if(!grip(q))continue;if(my<q.y0-10||my>q.y1+10)continue;const d=Math.abs(mx-q.x1);if(d<R&&(!best||d<best.d))best={d,q};}return best&&best.q;};
  const body=(mx,my)=>hits.find(q=>mx>=q.x0&&mx<=q.bx1&&my>=q.y0&&my<=q.y1);
  cv.addEventListener('pointermove',e=>{const [mx,my]=pos(e);
    if(drag){const q=hits.find(h=>h.li===drag.li&&h.idx===drag.idx);if(!q)return;const g=q.g;const k=CL((mx-(q.x0))/view.sc/g.w0,1,TYG.KMAX[g.cls]);setMan(drag.li,drag.idx,q.item.ch,k);draw();info(hits.find(h=>h.li===drag.li&&h.idx===drag.idx));return;}
    const p=pick(mx,my);const nh=p?{li:p.li,idx:p.idx}:null;const ch=(nh&&hover&&nh.li===hover.li&&nh.idx===hover.idx)||(!nh&&!hover)?false:true;hover=nh;cv.style.cursor=p?'ew-resize':'default';if(ch)draw();if(p)info(p);});
  cv.addEventListener('pointerdown',e=>{const [mx,my]=pos(e);const p=pick(mx,my),b=body(mx,my);
    if(p){drag={li:p.li,idx:p.idx};sel={li:p.li,idx:p.idx};try{cv.setPointerCapture(e.pointerId);}catch(_){}cv.focus({preventScroll:true});e.preventDefault();draw();return;}
    if(b){sel={li:b.li,idx:b.idx};hover=null;cv.focus({preventScroll:true});draw();info(b);}else{sel=null;draw();}
  });
  const up=()=>{if(drag){drag=null;hover=null;save();draw();}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('pointerleave',()=>{if(!drag&&hover){hover=null;cv.style.cursor='default';draw();}});
  cv.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    const M=lastModel;if(!M)return;
    const order=[];M.lays.forEach((l,li)=>l.glyphs.forEach(q=>{if(q.g.cls!=='n')order.push({li,idx:q.idx,ch:q.item.ch,g:q.g});}));
    if(!order.length)return;
    let i=sel?order.findIndex(o=>o.li===sel.li&&o.idx===sel.idx):-1;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();i=i<0?0:CL(i+(e.key==='ArrowDown'?1:-1),0,order.length-1);sel={li:order[i].li,idx:order[i].idx};draw();announce(order[i]);return;}
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(i<0){i=0;sel={li:order[0].li,idx:order[0].idx};}
      const o=order[i],g=o.g,k0=g.W/g.w0,step=(e.shiftKey?0.5:0.1)*(e.key==='ArrowRight'?1:-1);
      const k=CL(Math.round((k0+step)*100)/100,1,TYG.KMAX[g.cls]);setMan(o.li,o.idx,o.ch,k);save();draw();
      const q=hits.find(h=>h.li===o.li&&h.idx===o.idx);say(o.ch+' · ширина ×'+(q?(q.g.W/q.g.w0):k).toFixed(2));return;}
    if((e.key==='Delete'||e.key==='Backspace'||e.key==='Home')&&sel){e.preventDefault();delete TB().man[sel.li+':'+sel.idx];save();draw();say('Ширина буквы возвращена');return;}
    if(e.key==='Escape'&&sel){sel=null;draw();say('');}
  });
  cv.addEventListener('focus',()=>{if(!sel&&lastModel){const f=lastModel.lays.flatMap((l,li)=>l.glyphs.filter(q=>q.g.cls!=='n').map(q=>({li,idx:q.idx,ch:q.item.ch,g:q.g})))[0];if(f&&!drag){sel={li:f.li,idx:f.idx};draw();announce(f);}}});
  cv.addEventListener('blur',()=>{if(!drag){draw();}});
}
function announce(o){const q=hits.find(h=>h.li===o.li&&h.idx===o.idx);const g=q?q.g:o.g;say(o.ch+' · '+({f:'свободная, до ×6',h:'горизонтали, до ×2'}[g.cls]||'диагональная, до ×2')+' · ширина ×'+(g.W/g.w0).toFixed(2));}
function setMan(li,idx,ch,k){const t=TB(),key=li+':'+idx;if(k<=1.0001)delete t.man[key];else t.man[key]=[Math.round(k*1000)/1000,ch];}
/* ---------- текст с «~» ---------- */
function ladder(ch){const cl=TYG.CLASS(ch),st=TYG.STEPS[cl]||[];return st.map((s,i)=>({n:i+1,k:TYS.stepK(ch,i+1,cur().p)}));}
function tildeText(){
  const M=model();
  return M.lines.map(l=>l.map(it=>{
    if(it.ch===' '||it.ch===' ')return ' ';
    let n=0;
    if(it.fixed)n=it.step||0;
    else{const g=TYG.glyph(it.ch,M.P,it.k||1),k=g.W/g.w0;
      if(k>1.01){const L=ladder(it.ch);if(L.length){let best=0,bd=Math.abs(k-1);for(const s of L){const d=Math.abs(k-s.k);if(d<bd){bd=d;best=s.n;}}n=best;}}}
    return it.ch+'~'.repeat(n);}).join('')).join('\n');}
function copyTilde(){
  const txt=tildeText();
  const msg='Скопировано. В Figma и Word вставьте текст со шрифтом «Тяга»: «~» растягивает букву';
  if(window.PF&&PF.copyText)PF.copyText(txt,msg);
  else{try{navigator.clipboard.writeText(txt).then(()=>toast(msg),()=>toast('Не получилось скопировать'));}catch(e){toast('Не получилось скопировать');}}
  say('Скопировано: '+txt.replace(/\n/g,' / ').slice(0,80));
}
/* ---------- выгрузка ---------- */
function nodesToD(cs,tf){
  let d='';
  for(const c of cs){const n=c.nodes,N=n.length;if(!N)continue;const f=n[0],p0=tf(f.x,f.y);d+='M'+p0[0].toFixed(2)+' '+p0[1].toFixed(2);
    for(let i=0;i<N;i++){const a=n[i],b=n[(i+1)%N],p1=a.b||a,p2=b.a||b;
      if(a.b||b.a){const A=tf(p1.x,p1.y),B=tf(p2.x,p2.y),E=tf(b.x,b.y);d+='C'+A[0].toFixed(2)+' '+A[1].toFixed(2)+' '+B[0].toFixed(2)+' '+B[1].toFixed(2)+' '+E[0].toFixed(2)+' '+E[1].toFixed(2);}
      else{const E=tf(b.x,b.y);d+='L'+E[0].toFixed(2)+' '+E[1].toFixed(2);}}
    d+='Z';}
  return d;}
function exportSVG(M){
  const G=geometry(M,1e6,1e9),slant=G.slant,pad=0.4*CAP;
  const Wt=Math.max(1,M.Wt||0,...M.lays.map(l=>l.width))+CAP*slant*0.9,Wv=Wt+2*pad,Hv=G.blockH+2*pad;
  let paths='';
  M.lays.forEach((lay,li)=>{const base=pad+G.top+G.ys[li]+CAP;
    for(const q of lay.glyphs){const r=TYS.get(q.item.ch,cur().p,q.g.k);if(!r)continue;
      const cs=csgUnion(r.cs.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{...n.a},b:n.b&&{...n.b}}))})));
      const ox=pad+q.x;paths+='<path d="'+nodesToD(cs,(X,Y)=>[ox+X+slant*Y,base-Y])+'" fill-rule="nonzero"/>';}});
  const w=Math.round(Wv),h=Math.round(Hv);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'"><title>Тяга: блок</title><rect width="'+w+'" height="'+h+'" fill="'+dsColor('canvas')+'"/><g fill="'+dsColor('glyph')+'">'+paths+'</g></svg>\n';}
function exportPNG(M){
  const G=geometry(M,1e6,1e9),pad=0.4*CAP,Wt=Math.max(1,M.Wt||0,...M.lays.map(l=>l.width))+CAP*G.slant*0.9;
  const sc=Math.min(1.6,2400/(Wt+2*pad)),w=Math.round((Wt+2*pad)*sc),h=Math.round((G.blockH+2*pad)*sc);
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=dsColor('canvas');x.fillRect(0,0,w,h);
  M.lays.forEach((lay,li)=>{const base=(pad+G.top+G.ys[li]+CAP)*sc;for(const q of lay.glyphs)drawGlyphAt(x,q.g,(pad+q.x)*sc,base,sc,dsColor('glyph'),G.slant);});
  return new Promise(res=>c.toBlob(b=>b.arrayBuffer().then(a=>res(new Uint8Array(a))),'image/png'));}
async function exportFile(kind){
  const M=model();if(!M.lines.some(l=>l.length)){toast('В блоке нет текста');return;}
  if(kind==='svg')return saveFile('tyaga-blok.svg',exportSVG(M),'image/svg+xml');
  const data=await exportPNG(M);return saveFile('tyaga-blok.png',data,'image/png');}
/* ---------- перерисовка вместе со всем редактором ---------- */
const _bump=bump;bump=function(){const r=_bump.apply(this,arguments);if(visible())requestAnimationFrame(draw);return r;};
const _sp=syncPanel;syncPanel=function(){const r=_sp.apply(this,arguments);if(on()){sync();}return r;};
/* ---------- «Поделиться»: выровненный блок на постере (T4) ----------
   Постер рисует блок контурами движка, а не строкой шрифта: толщина идёт по весам Light…Black (как ось постера), ширина блока постоянна на всех весах (самая широкая строка на Black
   или ширина блока из редактора), выключка и ручная растяжка те же, что в «Блоке». Источник: режим «Знаки» — текст блока (S.tyb), «Своя фраза» — фраза, разбитая по словам на 1–3 строки. */
const pTsw=k=>{const u=cur().p,a=['Light','Regular','Bold','Black'].map(w=>famParams(u,w).tsw),i=Math.min(2,Math.max(0,Math.floor(k))),f=Math.min(1,Math.max(0,k-i));return a[i]+(a[i+1]-a[i])*f;};
const pP=k=>TYS.eng(Object.assign({},cur().p,{tsw:Math.round(pTsw(k)*10)/10}));
function pLines(txt,useMan){
  const t=TB();
  return txt.split('\n').map((s,li)=>{const l=TYG.parse(s).filter(x=>x.ch===' '||x.ch===' '||TYG.has(x.ch));
    if(useMan)l.forEach((it,i)=>{const m=t.man[li+':'+i];if(m&&m[1]===it.ch){it.k=m[0];it.manual=true;}});return l;});}
function pFrame(lines,k,WT,mode){const P=pP(k);TYG.justify(lines,P,{width:WT,mode});return {P,lays:lines.map(l=>TYG.layoutLine(l,P,l.slack))};}
function pBuild(txt,useMan,fixedW){
  const t=TB(),lines=pLines(txt,useMan),mode=t.mode;let WT=fixedW||0;
  for(const k of [0,1,2,3]){const P=pP(k);WT=Math.max(WT,TYG.justify(lines,P,{width:fixedW||0,mode}));}
  return {lines,WT,mode};}
function pFit(txt,useMan,fixedW,aw,ah,capMax){
  const b=pBuild(txt,useMan,fixedW);if(!b.lines.some(l=>l.length))return null;
  const slant=Math.tan((cur().p.slant||0)*Math.PI/180),fr=pFrame(b.lines,3,b.WT,b.mode),ext=fr.lays.map(vext);
  const bw=b.WT+CAP*slant*0.9,P=fr.P,ys=[];let y=0;
  fr.lays.forEach((l,i)=>{ys.push(y);const gap=Math.max(P.lead*CAP,ext[i].dn+(ext[i+1]?ext[i+1].up:0)+0.05*CAP);y+=CAP+(i<fr.lays.length-1?gap:0);});
  const top=ext[0]?ext[0].up:0,bot=ext.length?ext[ext.length-1].dn:0,bh=y+top+bot;
  const sc=Math.min(aw/bw,ah/bh,capMax/CAP);
  return {b,ys,top,bot,bw,bh,sc,slant,size:CAP*sc,w:bw*sc,h:bh*sc};}
/* фраза -> 1…maxN строк по словам: берётся раскладка с наибольшим кеглем (при равенстве меньше строк) */
function pPhrase(phrase,aw,ah,capMax,maxN){
  const ws=phrase.split(/\s+/).filter(Boolean);if(!ws.length)return null;let best=null;
  const P=pP(3),wid=a=>TYG.lineInk(TYG.parse(a.join(' ')),P);
  const split=(i,n)=>{if(n===1)return [[ws.slice(i)]];const o=[];for(let j=i+1;j<=ws.length-n+1;j++)for(const r of split(j,n-1))o.push([ws.slice(i,j),...r]);return o;};
  for(let n=1;n<=Math.min(maxN,ws.length);n++){
    let pick=null;for(const parts of split(0,n)){const mx=Math.max(...parts.map(wid));if(!pick||mx<pick.mx-1)pick={mx,txt:parts.map(a=>a.join(' ')).join('\n')};}
    const f=pFit(pick.txt,false,0,aw,ah,capMax);if(f&&(!best||f.sc>best.sc*1.04))best=f;}
  return best;}
function pDraw(ctx,f,k,x0,y0,sc,color){
  const fr=pFrame(f.b.lines,k,f.b.WT,f.b.mode),recs=[];
  fr.lays.forEach((lay,li)=>{const base=y0+(f.top+f.ys[li]+CAP)*sc;let a=1e9,b=-1e9,u=0,d=0;
    for(const q of lay.glyphs){drawGlyphAt(ctx,q.g,x0+q.x*sc,base,sc,color,f.slant);const bb=q.g.bbox;a=Math.min(a,x0+(q.x+bb.x0)*sc);b=Math.max(b,x0+(q.x+bb.x1)*sc+f.slant*bb.y1*sc);u=Math.max(u,bb.y1);d=Math.max(d,-bb.y0);}
    recs.push({x0:a,x1:b,y0:base-u*sc,y1:base+d*sc});});
  return recs;}
const pOn=()=>on()&&TB().on;
window.TYB={poster:{on:pOn,fit:pFit,phrase:pPhrase,draw:pDraw,text:()=>TB().txt,width:()=>TB().just?TB().w*CAP:0},model,tildeText,state:TB,draw,sync,pre,exportSVG:()=>exportSVG(model()),select:(li,idx)=>{sel={li,idx};draw();},hits:()=>hits,view:()=>view,mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mount();sync();});else{mount();sync();}
})();
