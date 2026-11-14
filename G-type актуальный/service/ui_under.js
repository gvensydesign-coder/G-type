/* ===== «Подложка» (W96-U): бледный образец под холстом знака — только зрительная опора, никакой автообводки =====
   Источники: (1) любой шрифт библиотеки — тот же знак, что и у текущего (следует за переключением знака), по линии шрифта и в единицах UPM холста;
   (2) своя картинка (PNG/JPG/WebP/SVG: файл или перетаскивание) — двигать / масштабировать / поворачивать ручками или числами, «Закрепить».
   Рисуется ТОЛЬКО на холсте (хуки GT_UNDER.ed / GT_UNDER.dr в drawEditor и draw): в данные знака, историю правок, метрики, проверки и экспорт не попадает.
   Хранение: настройки gtype-under-v1 и положения картинок gtype-under-tf-v1 (localStorage), сами картинки (<= 1600 px, JPEG <= 600 КБ) в IndexedDB gtype-under-v1/img.
   Всё свое: классы un-*, CSS вставляется отсюда (template.html не трогаем). Горячая клавиша Alt+U. */
(function(){
'use strict';
const LS='gtype-under-v1',TFK='gtype-under-tf-v1',DBN='gtype-under-v1',MAXIMG=40,MAXCH=600000,MAXPX=1600,MASKPX=1200,CAP=700;
const U={mode:'off',font:'',sty:'regular',op:25,over:false,dx:0,sheet:false};
const TF={};                 /* ключ -> {x,y,h,rot,lock,t}: положение картинки (единицы шрифта, h — высота) */
const IMG=new Map();         /* ключ -> {ready,mask,w,h,data,tint} */
let UI=null,OPEN=false,CTX='ed',LAST={},volatile=false,warned=false,msgT=0,drawCh=null;
const q=(s,r)=>(r||document).querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const guard=f=>{try{return f();}catch(e){return undefined;}};
function toastN(m){guard(()=>{if(typeof window.toast==='function')window.toast(m);});}
/* ---------- хранение ---------- */
function loadLS(){guard(()=>{const o=JSON.parse(localStorage.getItem(LS)||'null');if(o&&typeof o==='object'){
    if(['off','font','img'].includes(o.m))U.mode=o.m;if(typeof o.f==='string')U.font=o.f;if(o.s==='italic')U.sty='italic';
    if(isFinite(o.o))U.op=clamp(Math.round(o.o),10,60);U.over=!!o.v;if(isFinite(o.dx))U.dx=clamp(Math.round(o.dx),-400,400);U.sheet=!!o.sh;}});
  guard(()=>{const t=JSON.parse(localStorage.getItem(TFK)||'null');if(t&&typeof t==='object')for(const k in t){const r=t[k];
    if(r&&isFinite(r.x)&&isFinite(r.y)&&isFinite(r.h)&&isFinite(r.rot))TF[k]={x:+r.x,y:+r.y,h:clamp(+r.h,20,4000),rot:+r.rot,lock:!!r.lock,t:+r.t||0};}});}
let lsT=0;
function saveLS(){clearTimeout(lsT);lsT=setTimeout(()=>{guard(()=>localStorage.setItem(LS,JSON.stringify({m:U.mode,f:U.font,s:U.sty,o:U.op,v:U.over,dx:U.dx,sh:U.sheet})));},200);}   /* запись не на каждый шаг ползунка */
addEventListener('pagehide',()=>{if(lsT){clearTimeout(lsT);lsT=0;guard(()=>localStorage.setItem(LS,JSON.stringify({m:U.mode,f:U.font,s:U.sty,o:U.op,v:U.over,dx:U.dx,sh:U.sheet})));}});
let tfT=0;
function saveTF(){clearTimeout(tfT);tfT=setTimeout(()=>{guard(()=>localStorage.setItem(TFK,JSON.stringify(TF)));},300);}
let dbp=null;
function dbOpen(){if(dbp)return dbp;dbp=new Promise(res=>{try{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>{r.result.createObjectStore('img');};
    r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null);}catch(e){res(null);}});return dbp;}
/* null = хранилище недоступно или операция не удалась; {v} = результат */
async function dbOp(mode,fn){const d=await dbOpen();if(!d)return null;
  return new Promise(res=>{try{const t=d.transaction('img',mode),rq=fn(t.objectStore('img'));t.oncomplete=()=>res({v:rq&&rq.result});t.onerror=t.onabort=()=>res(null);}catch(e){res(null);}});}
function noteVolatile(){volatile=true;if(!warned){warned=true;toastN('Подложка не сохранится после перезагрузки: хранилище браузера заполнено или закрыто');}}
async function dbPut(key,data){const r=await dbOp('readwrite',s=>s.put(data,key));if(!r)noteVolatile();return !!r;}
function dbDel(key){dbOp('readwrite',s=>s.delete(key));}
/* не больше MAXIMG картинок: старейшие уходят */
function sweep(){const ks=Object.keys(TF);if(ks.length<=MAXIMG)return;ks.sort((a,b)=>TF[a].t-TF[b].t);
  while(ks.length>MAXIMG){const k=ks.shift();delete TF[k];IMG.delete(k);dbDel(k);}saveTF();}
/* ---------- ключи ---------- */
function chNow(){return CTX==='dr'?drawCh:(typeof S!=='undefined'?S.sel:null);}
function keyFor(ctx,ch,sheet){const base=ctx==='dr'?'dr:':'ed:'+(typeof S!=='undefined'?S.fontId:'')+':';return ch||sheet?base+(sheet?'*':ch):null;}
const curKey=()=>keyFor(CTX,chNow(),U.sheet);
/* ---------- картинка -> маска «чернил» (тёмное = непрозрачное, бумага = прозрачная) ---------- */
function buildMask(src){
  const sw=src.width,sh=src.height,k=Math.min(1,MASKPX/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*k)),h=Math.max(1,Math.round(sh*k));
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d',{willReadFrequently:true});c.drawImage(src,0,0,w,h);
  const d=c.getImageData(0,0,w,h),a=d.data,hist=new Uint32Array(256),n=w*h;
  for(let i=0;i<n;i++){const L=(a[i*4]*299+a[i*4+1]*587+a[i*4+2]*114)/1000|0;hist[L]++;}
  let acc=0,lo=0,hi=255;for(let v=0;v<256;v++){acc+=hist[v];if(acc>=n*.02){lo=v;break;}}acc=0;for(let v=255;v>=0;v--){acc+=hist[v];if(acc>=n*.35){hi=v;break;}}
  if(hi-lo<30){lo=0;hi=255;}
  const span=hi-lo;
  for(let i=0;i<n;i++){const L=(a[i*4]*299+a[i*4+1]*587+a[i*4+2]*114)/1000;a[i*4]=a[i*4+1]=a[i*4+2]=0;a[i*4+3]=Math.round(255*clamp((hi-L)/span,0,1));}
  c.putImageData(d,0,0);return {mask:cv,w:sw,h:sh};}
function tintOf(r,color){if(!r.tint)r.tint={};let t=r.tint[color];if(t)return t;
  const m=r.mask;t=document.createElement('canvas');t.width=m.width;t.height=m.height;const c=t.getContext('2d');c.fillStyle=color;c.fillRect(0,0,t.width,t.height);
  c.globalCompositeOperation='destination-in';c.drawImage(m,0,0);if(Object.keys(r.tint).length>3)r.tint={};r.tint[color]=t;return t;}
function imgFromData(data){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('img'));im.src=data;});}
async function makeRec(key,data){const im=await imgFromData(data),m=buildMask(im);const r={ready:true,mask:m.mask,w:m.w,h:m.h,data,tint:null};IMG.set(key,r);return r;}
/* запись для ключа; при первом обращении подгружается из IndexedDB (до этого null и позже перерисовка) */
function rec(key){if(!key)return null;const r=IMG.get(key);if(r)return r.ready?r:null;if(!TF[key])return null;
  IMG.set(key,{ready:false});
  dbOp('readonly',s=>s.get(key)).then(async o=>{const d=o&&o.v;
    if(typeof d!=='string'){IMG.delete(key);if(o){delete TF[key];saveTF();}repaint();sync();return;}
    try{await makeRec(key,d);}catch(e){IMG.delete(key);delete TF[key];saveTF();}repaint();sync();});
  return null;}
/* ---------- загрузка файла ---------- */
function say(t,err){const m=q('#un-msg');if(!m)return;m.textContent=t||'';m.classList.toggle('err',!!err);clearTimeout(msgT);if(t&&!err)msgT=setTimeout(()=>{m.textContent='';m.classList.remove('err');},4000);}
async function ingest(file,ctxId){
  if(!file)return;if(ctxId)CTX=ctxId;
  const key=curKey();if(!key){say('Сначала выберите знак',true);return;}
  const okT=/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)||/\.(png|jpe?g|webp|svg)$/i.test(file.name||'');
  if(!okT){say('Подойдут PNG, JPG, WebP или SVG',true);return;}
  if(file.size>20*1048576){say('Файл больше 20 МБ',true);return;}
  const url=URL.createObjectURL(file);
  try{
    const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('img'));i.src=url;});
    const nw=im.naturalWidth||1000,nh=im.naturalHeight||1000;let k=Math.min(1,MAXPX/Math.max(nw,nh)),data='',cv;
    for(let it=0;it<8;it++){
      cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(nw*k));cv.height=Math.max(1,Math.round(nh*k));
      const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);c.drawImage(im,0,0,cv.width,cv.height);
      for(const ql of [.85,.7,.55]){data=cv.toDataURL('image/jpeg',ql);if(data.length<=MAXCH)break;}
      if(data.length<=MAXCH)break;k*=.8;}
    if(data.length>MAXCH){say('Картинка слишком тяжёлая',true);return;}
    const W=LAST.W||600,h=Math.min(900,Math.max(200,1.6*Math.max(W,300)*nh/nw));
    const r=await makeRec(key,data);void r;
    TF[key]={x:0,y:0,h:Math.round(h),rot:0,lock:false,t:Date.now()};
    saveTF();sweep();dbPut(key,data);
    U.mode='img';saveLS();say('');repaint();sync();
  }catch(e){say('Не удалось открыть картинку',true);}
  finally{URL.revokeObjectURL(url);}
}
/* ---------- цвета ---------- */
const lumCache=new Map();
function lumOf(str){let v=lumCache.get(str);if(v!==undefined)return v;v=.8;
  guard(()=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle='#fff';c.fillStyle=str;c.fillRect(0,0,1,1);const d=c.getImageData(0,0,1,1).data;v=(d[0]*299+d[1]*587+d[2]*114)/255000;});
  if(lumCache.size>20)lumCache.clear();lumCache.set(str,v);return v;}
const inkFor=bg=>lumOf(bg)<.45?'rgb(214,217,226)':'rgb(64,66,76)';
/* ---------- рисование ---------- */
function paintFont(c,G,ink){
  if(!G.ch||!U.font||typeof libRun!=='function'||typeof FONTS==='undefined'||!FONTS[U.font])return 'none';
  let r;try{r=libRun(U.font,G.ch,null,U.sty);}catch(e){return 'none';}
  const it=r&&r.items&&r.items[0];if(!it)return 'miss';
  const g=it[0],off=(G.W-g.adv)/2+U.dx;
  const P=pathOf(g.cs,(x,y)=>G.px(x+off,y));
  c.save();c.globalAlpha=U.op/100;c.fillStyle=ink;c.fill(P,'nonzero');c.restore();return 'ok';}
let FR=null;           /* рамка картинки на экране (для ручек) */
function geomImg(G,tf,r){const hpx=tf.h*G.k,wpx=hpx*r.w/r.h,C=G.px(G.W/2+tf.x,CAP/2+tf.y),a=tf.rot*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
  const rot=(x,y)=>[C[0]+x*co-y*si,C[1]+x*si+y*co];
  return {C,hpx,wpx,a,pts:[rot(-wpx/2,-hpx/2),rot(wpx/2,-hpx/2),rot(wpx/2,hpx/2),rot(-wpx/2,hpx/2)],hs:rot(wpx/2,hpx/2),hr:rot(0,-hpx/2-30),hrBase:rot(0,-hpx/2),co,si};}
function paintImg(c,G,ink,r,tf){
  const f=geomImg(G,tf,r);c.save();c.globalAlpha=U.op/100;c.translate(f.C[0],f.C[1]);c.rotate(f.a);c.drawImage(tintOf(r,ink),-f.wpx/2,-f.hpx/2,f.wpx,f.hpx);c.restore();return f;}
function paintFrame(c,G,f,ink){
  c.save();c.strokeStyle=ink;c.fillStyle=G.paper;c.lineWidth=1.25;c.globalAlpha=.9;c.setLineDash([5,4]);
  c.beginPath();f.pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.stroke();c.setLineDash([]);
  c.beginPath();c.moveTo(f.hrBase[0],f.hrBase[1]);c.lineTo(f.hr[0],f.hr[1]);c.stroke();
  c.beginPath();c.arc(f.hr[0],f.hr[1],6,0,7);c.fill();c.stroke();
  c.beginPath();c.rect(f.hs[0]-5,f.hs[1]-5,10,10);c.fill();c.stroke();c.restore();}
/* pass 0: перед контуром, pass 1: после контура (и рамка ручек поверх всего) */
function paint(c,G,pass){
  if(pass===1)FR=null;
  if(!pass)LAST={ctx:G.id,ch:G.ch,mode:U.mode,W:G.W,over:U.over,font:U.font,drawn:false,miss:false,frame:false};
  if(U.mode==='off'||(!G.ch&&!U.sheet)){if(pass===1&&OPEN&&CTX===G.id)syncSoon();return;}
  const ink=inkFor(G.paper),top=U.over===!!pass;
  if(U.mode==='font'){if(top){const s=paintFont(c,G,ink);LAST.drawn=s==='ok';LAST.miss=s==='miss';}}
  else{const key=keyFor(G.id,G.ch,U.sheet),r=rec(key),tf=TF[key];
    if(r&&tf){let f;if(top){f=paintImg(c,G,ink,r,tf);LAST.drawn=true;}
      if(pass===1&&OPEN&&CTX===G.id&&!tf.lock){f=f||geomImg(G,tf,r);FR={id:G.id,f,G,key};paintFrame(c,G,f,ink);LAST.frame=true;}}}
  if(pass===1&&OPEN&&CTX===G.id)syncSoon();}
function ed(c,pass){
  ensureEd();
  if(OPEN&&CTX!=='ed')close(true);CTX='ed';
  if(U.mode==='off'&&!OPEN){FR=null;return;}
  const G={id:'ed',ch:(typeof S!=='undefined'&&S.sel&&String(S.sel).trim())?S.sel:null,W:V.w,cw:V.cw,k:V.sc,paper:edBg(),px:(x,y)=>[V.ox+x*V.sc,V.oy-y*V.sc]};
  paint(c,G,pass);}
function dr(ctx,pass,P){
  ensureDr();drawCh=P.ch||null;
  if(OPEN&&CTX!=='dr')close(true);CTX='dr';
  if(U.mode==='off'&&!OPEN){FR=null;return;}
  paint(ctx,{id:'dr',ch:drawCh,W:P.W,cw:P.cw,k:P.s,paper:P.paper,px:(x,y)=>[P.X(x),P.Y(y)]},pass);}
let bgCache=['',''];
function edBg(){const el=q('#stagebox');if(!el)return '#fff';const t=document.documentElement.dataset.theme||'';
  if(bgCache[0]!==t){bgCache=[t,guard(()=>getComputedStyle(el).backgroundColor)||'#fff'];}return bgCache[1];}
function repaint(){if(CTX==='dr'){guard(()=>window.GT_DRAW.redraw());}else guard(()=>schedule());}
/* ---------- ручки: перетаскивание картинки ---------- */
let DRG=null;
function hit(e,host){
  if(!FR||!OPEN||U.mode!=='img')return null;const cv=host.querySelector('canvas');if(!cv||e.target!==cv)return null;
  const rc=cv.getBoundingClientRect(),sx=FR.G.cw/rc.width,x=(e.clientX-rc.left)*sx,y=(e.clientY-rc.top)*sx,f=FR.f;
  const near=(p,r)=>Math.hypot(p[0]-x,p[1]-y)<=r*sx;
  if(near(f.hr,12))return {k:'rot',x,y};if(near(f.hs,12))return {k:'scl',x,y};
  const dx=x-f.C[0],dy=y-f.C[1],lx=dx*f.co+dy*f.si,ly=-dx*f.si+dy*f.co;
  if(Math.abs(lx)<=f.wpx/2&&Math.abs(ly)<=f.hpx/2)return {k:'mov',x,y};return null;}
function attach(host,id){
  if(host._un)return;host._un=1;
  host.addEventListener('pointerdown',e=>{if(e.button!==0)return;CTX=id;const h=hit(e,host);if(!h)return;
    const tf=TF[FR.key];DRG={k:h.k,id:e.pointerId,x:h.x,y:h.y,tf:Object.assign({},tf),key:FR.key,G:FR.G,C:FR.f.C.slice(),d0:Math.hypot(h.x-FR.f.C[0],h.y-FR.f.C[1])||1,cv:host.querySelector('canvas'),sx:0};
    DRG.sx=FR.G.cw/DRG.cv.getBoundingClientRect().width;
    e.preventDefault();e.stopImmediatePropagation();guard(()=>DRG.cv.setPointerCapture(e.pointerId));},true);
  host.addEventListener('pointermove',e=>{
    if(DRG&&e.pointerId===DRG.id){e.stopImmediatePropagation();e.preventDefault();drag(e);return;}
    if(!FR||!OPEN)return;const cv=host.querySelector('canvas');if(!cv||e.target!==cv)return;
    const h=hit(e,host);cv.style.cursor=h?(h.k==='mov'?'move':h.k==='rot'?'grab':'nwse-resize'):'';},true);
  const end=e=>{if(DRG&&e.pointerId===DRG.id){e.stopImmediatePropagation();guard(()=>DRG.cv.releasePointerCapture(e.pointerId));DRG=null;saveTF();}};
  host.addEventListener('pointerup',end,true);host.addEventListener('pointercancel',end,true);
  /* перетаскивание файла на холст */
  host.addEventListener('dragover',e=>{if(e.dataTransfer&&[...e.dataTransfer.types||[]].includes('Files')){e.preventDefault();host.classList.add('un-drop');}});
  host.addEventListener('dragleave',e=>{if(e.target===host||!host.contains(e.relatedTarget))host.classList.remove('un-drop');});
  host.addEventListener('drop',e=>{host.classList.remove('un-drop');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(!f)return;e.preventDefault();
    CTX=id;if(!OPEN)openPanel(id);ingest(f,id);});}
function drag(e){
  const D=DRG,tf=TF[D.key];if(!tf)return;const cv=D.cv,rc=cv.getBoundingClientRect(),x=(e.clientX-rc.left)*D.sx,y=(e.clientY-rc.top)*D.sx;
  if(D.k==='mov'){tf.x=Math.round(D.tf.x+(x-D.x)/D.G.k);tf.y=Math.round(D.tf.y-(y-D.y)/D.G.k);}
  else if(D.k==='scl'){tf.h=Math.round(clamp(D.tf.h*Math.hypot(x-D.C[0],y-D.C[1])/D.d0,40,4000));}
  else{let a=Math.atan2(y-D.C[1],x-D.C[0])*180/Math.PI+90;a=((a+540)%360)-180;if(e.shiftKey)a=Math.round(a/5)*5;if(Math.abs(a)<2)a=0;tf.rot=Math.round(a*10)/10;}
  tf.t=Date.now();repaint();syncSoon();}
/* ---------- панель ---------- */
const CSS=`:root{--i-under:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='8.5' y='8.5' width='12' height='12' rx='3'/%3E%3Cpath d='M15.5 4.5h-8a3 3 0 00-3 3v8'/%3E%3C/svg%3E")}
.i-under{--ic:var(--i-under)}
.tbtn.un-on{background:var(--ink);color:var(--on-ink)}
.tbtn.un-on:hover{background:var(--ink)}
.un-drop{outline:2px dashed var(--ink);outline-offset:-8px}
.un-p{position:fixed;z-index:90;width:328px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow-y:auto;scrollbar-width:none;box-sizing:border-box;background:var(--paper);color:var(--ink);border-radius:var(--r-lg);box-shadow:var(--sh-3),0 0 0 1px var(--line);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3);font:var(--fw-m) var(--fs-base)/1.3 var(--f-ui,Onest,system-ui,sans-serif)}
.un-p::-webkit-scrollbar{display:none}
.un-p[hidden]{display:none}
.un-h{display:flex;align-items:center;justify-content:space-between;gap:var(--s2);min-height:var(--h-md)}
.un-h b{font-size:var(--fs-lg);font-weight:var(--fw-b)}
.un-h .ibtn{width:var(--h-md);height:var(--h-md);background:var(--panel)}
.un-h .ibtn .ico{width:18px;height:18px}
.un-p .seg{display:flex;width:100%}
.un-p .seg button{flex:1 1 auto;min-width:0;padding:0 var(--s2);overflow:hidden;text-overflow:ellipsis}
.un-p .seg button:focus-visible,.un-p .btn:focus-visible,.un-p select:focus-visible,.un-p input:focus-visible,.un-p .ibtn:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}
.un-s{display:flex;flex-direction:column;gap:var(--s3)}
.un-s[hidden]{display:none}
.un-l{display:block;font-size:var(--fs-md);color:var(--text-2,var(--muted));margin-bottom:var(--s1)}
.un-l.r{display:flex;justify-content:space-between;align-items:baseline}
.un-l.r output{font-weight:var(--fw-sb);color:var(--ink);font-size:var(--fs-base)}
.un-p input[type=range]::-webkit-slider-thumb{background:var(--ink)}.un-p input[type=range]::-moz-range-thumb{background:var(--ink)}
.un-p select{-webkit-appearance:none;appearance:none;width:100%;height:var(--h-lg);border:0;border-radius:var(--r-pill);background:var(--panel) var(--i-chev-down) no-repeat right var(--s4) center/14px;padding:0 var(--s7) 0 var(--s4);color:var(--ink);font:var(--fw-m) var(--fs-base) var(--f-ui,Onest,system-ui,sans-serif);cursor:pointer;text-overflow:ellipsis}
.un-p input[type=number]{width:100%;box-sizing:border-box;height:var(--h-md);border:0;border-radius:var(--r-pill);background:var(--panel);padding:0 var(--s3);color:var(--ink);font:var(--fw-m) var(--fs-base) var(--f-ui,Onest,system-ui,sans-serif);-moz-appearance:textfield;appearance:textfield}
.un-p input[type=number]::-webkit-inner-spin-button{display:none}
.un-g{display:grid;grid-template-columns:1fr 1fr;gap:var(--s3)}
.un-g>div{min-width:0}
.un-r{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap}
.un-r .btn{flex:0 1 auto}
.un-p .chk{display:flex;gap:var(--s2);align-items:center;font-size:var(--fs-base);cursor:pointer}
.un-st{font-size:var(--fs-md);color:var(--text-2,var(--muted));min-height:1.3em;overflow-wrap:anywhere}
.un-st.err,.un-msg.err{color:var(--danger)}
.un-msg{font-size:var(--fs-md);color:var(--text-2,var(--muted));overflow-wrap:anywhere}.un-msg:empty{display:none}
.un-hint{font-size:var(--fs-md);color:var(--text-2,var(--muted))}
.un-foot[hidden]{display:none}
.un-numb{display:none}
.un-foot{display:flex;align-items:center;justify-content:space-between;gap:var(--s2);flex-wrap:wrap}
@media (max-width:560px){.un-numb{display:inline-flex}#un-tfw:not(.open){display:none}.un-p{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto;max-width:none;border-radius:var(--r-xl);max-height:58vh;padding:var(--s3);gap:var(--s2)}.un-s{gap:var(--s2)}.un-g{grid-template-columns:repeat(4,1fr);gap:var(--s2)}.un-g input[type=number]{padding:0 var(--s2)}.un-l{margin-bottom:2px}.un-p .un-hint{display:none}.un-p .un-foot .un-hint{display:inline}}`;
function injectCSS(){if(q('#un-css'))return;const s=document.createElement('style');s.id='un-css';s.textContent=CSS;document.head.appendChild(s);}
function build(){
  if(UI)return UI;injectCSS();
  const el=document.createElement('div');el.className='un-p';el.id='un-panel';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-label','Подложка');
  const ids=typeof FONTS!=='undefined'?Object.keys(FONTS):[];
  el.innerHTML=`<div class="un-h"><b>Подложка</b><button class="ibtn" id="un-x" type="button" aria-label="Закрыть" title="Закрыть (Esc)"><i class="ico i-close"></i></button></div>
<div class="seg" role="group" aria-label="Источник подложки" id="un-src"><button type="button" data-m="font">Шрифт</button><button type="button" data-m="img">Изображение</button><button type="button" data-m="off">Выкл</button></div>
<div class="un-s" data-s="font" hidden>
  <div><select id="un-font" aria-label="Шрифт подложки">${ids.map(i=>`<option value="${i}">${String(FONTS[i].name||i).replace(/</g,'&lt;')}</option>`).join('')}</select></div>
  <div class="seg" role="group" aria-label="Начертание" id="un-sty"><button type="button" data-s="regular">Прямой</button><button type="button" data-s="italic">Курсив</button></div>
  <div><label class="un-l r" for="un-dx"><span>Сдвиг по горизонтали</span><output id="un-dxo"></output></label><input type="range" id="un-dx" min="-300" max="300" step="5"></div>
</div>
<div class="un-s" data-s="img" hidden>
  <div class="un-r"><label class="btn sm file2"><i class="ico i-upload" style="width:16px;height:16px"></i><span>Загрузить</span><input type="file" id="un-file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"></label><button class="btn sm ghost un-numb" id="un-num" type="button" aria-expanded="false" aria-controls="un-tfw">Числами</button><span class="un-hint">или перетащите файл на холст</span></div>
  <div id="un-tfw">
    <div class="un-g"><div><label class="un-l" for="un-fx">X</label><input type="number" id="un-fx" step="5" aria-label="Сдвиг по X"></div><div><label class="un-l" for="un-fy">Y</label><input type="number" id="un-fy" step="5" aria-label="Сдвиг по Y"></div>
    <div><label class="un-l" for="un-fs">Масштаб, %</label><input type="number" id="un-fs" min="5" max="600" step="1"></div><div><label class="un-l" for="un-fr">Поворот, °</label><input type="number" id="un-fr" min="-180" max="180" step="0.5"></div></div>
  </div>
  <div class="un-r"><button class="btn sm" id="un-lock" type="button">Закрепить</button><label class="chk"><input type="checkbox" id="un-sheet">Для всех знаков</label></div>
</div>
<div class="un-s" data-s="common" hidden>
  <div><label class="un-l r" for="un-op"><span>Прозрачность</span><output id="un-opo"></output></label><input type="range" id="un-op" min="10" max="60" step="1"></div>
  <div class="seg" role="group" aria-label="Положение" id="un-ov"><button type="button" data-o="0">Под контуром</button><button type="button" data-o="1">Поверх</button></div>
</div>
<div class="un-st" id="un-st" aria-live="polite"></div>
<div class="un-msg" id="un-msg" role="status"></div>
<div class="un-foot" id="un-foot"><button class="btn sm" id="un-rm" type="button">Убрать картинку</button></div>`;
  document.body.appendChild(el);UI=el;
  /* события */
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);return;}e.stopPropagation();});
  q('#un-x',el).onclick=()=>close(false);
  el.addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(b){setMode(b.dataset.m);return;}
    const s=e.target.closest('#un-sty [data-s]');if(s){U.sty=s.dataset.s;saveLS();repaint();sync();return;}
    const o=e.target.closest('#un-ov [data-o]');if(o){U.over=o.dataset.o==='1';saveLS();repaint();sync();}});
  q('#un-font',el).onchange=e=>{U.font=e.target.value;saveLS();repaint();sync();};
  const rng=(id,fn)=>q(id,el).addEventListener('input',e=>{fn(+e.target.value);saveLS();repaint();syncSoon();});
  rng('#un-op',v=>{U.op=clamp(v,10,60);});rng('#un-dx',v=>{U.dx=v;});
  q('#un-file',el).onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';ingest(f,CTX);};
  const num=(id,fn)=>q(id,el).addEventListener('input',e=>{const key=curKey(),tf=TF[key];if(!tf||e.target.value===''||!isFinite(+e.target.value))return;fn(tf,+e.target.value);tf.t=Date.now();saveTF();repaint();});
  num('#un-fx',(t,v)=>{t.x=clamp(Math.round(v),-3000,3000);});num('#un-fy',(t,v)=>{t.y=clamp(Math.round(v),-3000,3000);});
  num('#un-fs',(t,v)=>{t.h=clamp(Math.round(v*CAP/100),20,4000);});num('#un-fr',(t,v)=>{t.rot=clamp(v,-180,180);});
  q('#un-num',el).onclick=e=>{const w=q('#un-tfw',el),on=!w.classList.contains('open');w.classList.toggle('open',on);e.currentTarget.setAttribute('aria-expanded',on?'true':'false');place();};
  q('#un-lock',el).onclick=()=>{const tf=TF[curKey()];if(!tf)return;tf.lock=!tf.lock;saveTF();repaint();sync();};
  q('#un-sheet',el).onchange=e=>{const on=e.target.checked,from=keyFor(CTX,chNow(),false),to=keyFor(CTX,chNow(),true);U.sheet=on;
    if(on&&from&&to&&TF[from]&&!TF[to]){const r=IMG.get(from);if(r&&r.ready){IMG.set(to,r);TF[to]=Object.assign({},TF[from],{t:Date.now()});saveTF();dbPut(to,r.data);}}
    saveLS();repaint();sync();};
  q('#un-rm',el).onclick=()=>{
    if(U.mode==='img'){const key=curKey();if(key&&(TF[key]||IMG.has(key))){delete TF[key];IMG.delete(key);dbDel(key);saveTF();say('Картинка убрана');repaint();sync();return;}}
    };
  return el;}
function setMode(m){U.mode=m;saveLS();repaint();sync();}
function place(){
  if(!UI||UI.hidden)return;
  if(innerWidth<=560){UI.style.left=UI.style.right=UI.style.top=UI.style.bottom='';UI.style.maxHeight='';return;}
  const cv=q(CTX==='dr'?'#dr-cv':'#stage');if(!cv)return;const rc=cv.getBoundingClientRect(),w=Math.min(328,innerWidth-16);
  /* у правого края холста (знак по центру остаётся виден); у отрисовки — под кнопками справа вверху */
  const tr=CTX==='dr'?q('#dr-tr'):null,top0=Math.max(8,Math.round(tr?tr.getBoundingClientRect().bottom+8:rc.top+12));
  const left=clamp(Math.round(rc.right-w-12),8,innerWidth-w-8);
  UI.style.right='auto';UI.style.bottom='auto';UI.style.left=left+'px';UI.style.top=top0+'px';
  UI.style.maxHeight=Math.max(220,Math.min(innerHeight-top0-8,rc.bottom-top0-8))+'px';}
let synT=0;function syncSoon(){if(synT)return;synT=requestAnimationFrame(()=>{synT=0;sync();});}
function sync(){
  for(const id of ['#un-btn','#un-dbtn']){const b=q(id);if(b){const on=U.mode!=='off';b.classList.toggle('un-on',on);b.classList.toggle('on',on&&id==='#un-dbtn');b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-expanded',OPEN&&((id==='#un-btn')===(CTX==='ed'))?'true':'false');}}
  if(!UI||UI.hidden)return;
  const key=curKey(),ch=chNow(),tf=key&&TF[key];
  UI.querySelectorAll('#un-src [data-m]').forEach(b=>{const on=b.dataset.m===U.mode;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  UI.querySelector('[data-s=font]').hidden=U.mode!=='font';UI.querySelector('[data-s=img]').hidden=U.mode!=='img';UI.querySelector('[data-s=common]').hidden=U.mode==='off';
  const fs=q('#un-font',UI);if(!U.font||!FONTS[U.font])U.font=(Object.keys(FONTS).find(i=>i!==(typeof S!=='undefined'?S.fontId:''))||Object.keys(FONTS)[0]||'');if(fs.value!==U.font)fs.value=U.font;
  UI.querySelectorAll('#un-sty [data-s]').forEach(b=>{const on=b.dataset.s===U.sty;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  const dx=q('#un-dx',UI);dx.value=U.dx;q('#un-dxo',UI).textContent=(U.dx>0?'+':'')+U.dx;dx.style.setProperty('--lo','0%');dx.style.setProperty('--hi',((U.dx+300)/6)+'%');
  const op=q('#un-op',UI);op.value=U.op;q('#un-opo',UI).textContent=U.op+' %';op.style.setProperty('--lo','0%');op.style.setProperty('--hi',((U.op-10)/50*100)+'%');
  UI.querySelectorAll('#un-ov [data-o]').forEach(b=>{const on=(b.dataset.o==='1')===U.over;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  const set=(id,v)=>{const i=q(id,UI);if(document.activeElement!==i)i.value=v;};
  q('#un-tfw',UI).style.opacity=tf?'':'.45';
  for(const id of ['#un-fx','#un-fy','#un-fs','#un-fr'])q(id,UI).disabled=!tf;
  if(tf){set('#un-fx',tf.x);set('#un-fy',tf.y);set('#un-fs',Math.round(tf.h/CAP*100));set('#un-fr',Math.round(tf.rot*10)/10);}
  const lk=q('#un-lock',UI);lk.disabled=!tf;lk.textContent=tf&&tf.lock?'Изменить':'Закрепить';
  q('#un-sheet',UI).checked=U.sheet;
  const st=q('#un-st',UI);let t='',er=false;
  if(U.mode==='font'){if(!ch)t='Выберите знак';else if(LAST.miss){t='В этом шрифте нет знака «'+ch+'»';er=true;}}
  else if(U.mode==='img'){if(!ch&&!U.sheet)t='Выберите знак';else if(tf&&!tf.lock)t='Угол: масштаб, кружок: поворот';else if(!tf)t='Для знака «'+(ch||'')+'» картинки нет';}
  st.textContent=t;st.classList.toggle('err',er);
  q('#un-foot',UI).hidden=!(U.mode==='img'&&tf);
  place();}
function openPanel(id){
  injectCSS();CTX=id||(typeof S!=='undefined'&&S.tab==='draw'?'dr':'ed');build();OPEN=true;UI.hidden=false;sync();repaint();
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches===false&&UI.animate)guard(()=>{const cs=getComputedStyle(document.documentElement);UI.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:parseFloat(cs.getPropertyValue('--dur-fast'))||180,easing:cs.getPropertyValue('--ease-out').trim()||'ease-out'});});}
function close(quiet){if(!UI||UI.hidden)return;OPEN=false;UI.hidden=true;FR=null;sync();repaint();
  if(!quiet){const b=q(CTX==='dr'?'#un-dbtn':'#un-btn');if(b)guard(()=>b.focus());}}
function toggle(id){if(OPEN&&UI&&!UI.hidden&&CTX===id)close(false);else{if(OPEN)close(true);openPanel(id);}}
/* ---------- кнопки на панелях инструментов ---------- */
function ensureEd(){
  if(q('#un-btn'))return;const z=q('#zout');if(!z||!z.parentNode)return;injectCSS();
  const b=document.createElement('button');b.className='tbtn';b.id='un-btn';b.type='button';b.setAttribute('aria-label','Подложка');b.title='Подложка (Alt+U)';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');b.setAttribute('aria-pressed','false');
  b.innerHTML='<i class="ico i-under"></i>';const sp=document.createElement('span');sp.className='tsep';z.before(b,sp);
  b.onclick=()=>toggle('ed');attach(q('#stagebox'),'ed');sync();}
function ensureDr(){
  const tr=q('#dr-tr');if(!tr)return;
  if(!q('#un-dbtn')){injectCSS();const b=document.createElement('button');b.className='dr-ib';b.id='un-dbtn';b.type='button';b.setAttribute('data-tip','Подложка (Alt+U)');b.setAttribute('aria-label','Подложка');b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');b.setAttribute('aria-pressed','false');
    b.innerHTML='<i class="ico i-under"></i>';const th=q('#dr-th');tr.insertBefore(b,th||tr.firstChild);b.onclick=()=>toggle('dr');attach(q('#dr-sq'),'dr');sync();}}
/* ---------- общие слушатели ---------- */
function visible(id){const cv=q(id==='dr'?'#dr-cv':'#stage');return !!(cv&&cv.getClientRects().length);}
addEventListener('keydown',e=>{
  if(e.altKey&&!e.ctrlKey&&!e.metaKey&&(e.code==='KeyU')){const id=typeof S!=='undefined'&&S.tab==='draw'?'dr':(typeof S!=='undefined'&&S.tab==='edit'?'ed':'');if(!id||!visible(id))return;e.preventDefault();e.stopPropagation();toggle(id);}},true);
addEventListener('resize',()=>{place();});
guard(()=>new MutationObserver(()=>{if(OPEN&&!visible(CTX))close(true);}).observe(document.body,{attributes:true,attributeFilter:['class']}));
loadLS();
guard(()=>{if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureEd,{once:true});else ensureEd();});
window.GT_UNDER={ed,dr,on:()=>U.mode!=='off'||OPEN,open:openPanel,close,
  _t:{U,TF,IMG,last:()=>LAST,key:curKey,open:()=>OPEN,ctx:()=>CTX,ingest,frame:()=>FR&&{id:FR.id,pts:FR.f.pts,hs:FR.f.hs,hr:FR.f.hr,C:FR.f.C},vol:()=>volatile}};
})();
