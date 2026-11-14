/* ===== «Обвести картинку»: PNG/JPG/WEBP → контуры знака =====
   Движок — core26.js (trcRun). Здесь: чтение картинки, окно предпросмотра (порог, гладкость, мелочь, инверсия),
   запись знака в набор «Свой шрифт» (IMP) и пакетная автотрассировка для библиотеки (вызывается из ui_imp.js). */
const TR={tok:0,ctx:null,img:null,ch:null,res:null,busy:0};
const trIsRaster=f=>/\.(png|jpe?g|webp)$/i.test(f.name||'')||/^image\/(png|jpe?g|webp)$/.test(f.type||'');
async function trDecode(file){
  const url=URL.createObjectURL(file);
  try{
    const im=await new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>bad(new Error('decode'));i.src=url;});
    const ow=im.naturalWidth,oh=im.naturalHeight;if(!ow||!oh)throw new Error('decode');
    const sc=Math.min(1,TRC.MAXSIDE/Math.max(ow,oh)),W=Math.max(1,Math.round(ow*sc)),H=Math.max(1,Math.round(oh*sc));
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.imageSmoothingQuality='high';
    cx.fillStyle='#fff';cx.fillRect(0,0,W,H);cx.clearRect(0,0,W,H);cx.drawImage(im,0,0,W,H);
    const img=trcGrayOf(cx.getImageData(0,0,W,H).data,W,H);
    img.scale=sc;img.name=file.name;img.cv=cv;img.prep={};
    return img;
  }finally{URL.revokeObjectURL(url);}}
const trPrep=(img,inv)=>img.prep[inv?1:0]||(img.prep[inv?1:0]=trcPrepare(img,inv));
const trTick=()=>new Promise(r=>setTimeout(r,0));
/* без окна: порог Оцу, гладкость и мелочь по умолчанию; время делится на порции */
async function trAuto(img){
  const prep=trPrep(img,img.inv),it=trcRun(prep,{thr:prep.otsu,smooth:40,speck:3});
  let r,t0=performance.now();
  while(!(r=it.next()).done){if(performance.now()-t0>20){await trTick();t0=performance.now();}}
  return r.value;}
const trMsg=res=>!res?'':res.err==='complex'?'Слишком сложное изображение: '+res.n+' контуров, допустимо до '+TRC.MAXC+'. Увеличьте «Убрать мелочь» или поменяйте порог.'
  :res.err==='nodes'?'Слишком много узлов ('+res.n+'). Увеличьте гладкость или уберите мелочь.'
  :res.err==='empty'?'Контуров не найдено. Поменяйте порог или нажмите «Инвертировать».':'';
function trApply(ch,res,img){
  snap();
  if(!impSetTraced(ch,res,img.name,1/img.scale))return false;
  iuRegisterNow();return true;}
/* ---------- окно предпросмотра ---------- */
function trDialog(){
  let el=document.getElementById('trdlg');if(el)return el;
  el=document.createElement('div');el.id='trdlg';el.className='cu-modal';el.hidden=true;
  el.innerHTML=`<div class="cu-card tr-card" role="dialog" aria-labelledby="tr-t"><h4 id="tr-t">Обвести картинку</h4>
    <div class="tr-view"><canvas id="tr-cv" aria-label="Предпросмотр контура"></canvas><div class="tr-busy" id="tr-busy" hidden>Считаю…</div></div>
    <div class="tr-msg" id="tr-msg" role="status"></div>
    <label class="ctl"><span>Порог</span><output id="tr-o1"></output><input type="range" id="tr-thr" min="1" max="254" step="1"></label>
    <label class="ctl"><span>Гладкость</span><output id="tr-o2"></output><input type="range" id="tr-sm" min="0" max="100" step="1" value="40"></label>
    <label class="ctl"><span>Убрать мелочь</span><output id="tr-o3"></output><input type="range" id="tr-sp" min="0" max="40" step="1" value="3"></label>
    <div class="cu-row"><label class="imp-chk"><input type="checkbox" id="tr-inv"><span>Инвертировать</span></label><span class="tr-n" id="tr-n"></span></div>
    <div class="cu-row end"><button type="button" class="btn" id="tr-cancel">Отмена</button><button type="button" class="btn pri" id="tr-ok">Применить</button></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('pointerdown',e=>{if(e.target===el)trClose();});
  el.querySelector('#tr-cancel').addEventListener('click',trClose);
  el.querySelector('#tr-ok').addEventListener('click',()=>{const T=TR;if(!T.res||T.res.err||!T.img)return;
    const ch=T.ch,res=T.res,img=T.img;trClose();
    if(trApply(ch,res,img))toast('Знак «'+iuName(ch)+'» обведён: узлов '+res.nodes);});
  for(const id of ['tr-thr','tr-sm','tr-sp'])el.querySelector('#'+id).addEventListener('input',trSchedule);
  el.querySelector('#tr-inv').addEventListener('change',()=>{const p=trPrep(TR.img,el.querySelector('#tr-inv').checked);el.querySelector('#tr-thr').value=p.otsu;trSchedule();});
  el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();trClose();}});
  return el;}
function trClose(){TR.tok++;const el=document.getElementById('trdlg');if(el)el.hidden=true;TR.img=null;TR.res=null;}
function trOpen(ch,img){
  const el=trDialog();TR.img=img;TR.ch=ch;TR.res=null;
  const cv=el.querySelector('#tr-cv');cv.width=img.W;cv.height=img.H;
  el.querySelector('#tr-t').textContent='Обвести картинку · знак «'+iuName(ch)+'»';
  el.querySelector('#tr-inv').checked=!!img.inv;
  el.querySelector('#tr-thr').value=trPrep(img,img.inv).otsu;
  el.querySelector('#tr-sm').value=40;el.querySelector('#tr-sp').value=3;
  el.hidden=false;trSchedule();setTimeout(()=>el.querySelector('#tr-ok').focus(),30);}
function trOpts(el){const inv=el.querySelector('#tr-inv').checked;return {inv,thr:+el.querySelector('#tr-thr').value,smooth:+el.querySelector('#tr-sm').value,speck:+el.querySelector('#tr-sp').value};}
function trSchedule(){
  const el=document.getElementById('trdlg'),img=TR.img;if(!el||!img)return;
  const o=trOpts(el),tok=++TR.tok;
  el.querySelector('#tr-o1').textContent=o.thr;el.querySelector('#tr-o2').textContent=o.smooth+'%';el.querySelector('#tr-o3').textContent=o.speck?'до '+o.speck+' пикс.':'нет';
  el.querySelector('#tr-busy').hidden=false;
  setTimeout(()=>{
    if(tok!==TR.tok)return;
    const prep=trPrep(img,o.inv),it=trcRun(prep,{thr:o.thr,smooth:o.smooth,speck:o.speck});
    const step=()=>{if(tok!==TR.tok)return;const t0=performance.now();let r;
      do{r=it.next();}while(!r.done&&performance.now()-t0<12);
      if(!r.done){setTimeout(step,0);return;}
      TR.res=r.value;trShow(el,img,r.value,o);};
    step();},0);}
function trShow(el,img,res,o){
  el.querySelector('#tr-busy').hidden=true;
  const cv=el.querySelector('#tr-cv'),cx=cv.getContext('2d');
  cx.setTransform(1,0,0,1,0,0);cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
  cx.globalAlpha=0.38;cx.drawImage(img.cv,0,0);cx.globalAlpha=1;
  const msg=trMsg(res),ok=!res.err;
  el.querySelector('#tr-msg').textContent=msg;el.querySelector('#tr-msg').classList.toggle('bad',!ok);
  el.querySelector('#tr-ok').disabled=!ok;
  el.querySelector('#tr-n').textContent=ok?'Узлов: '+res.nodes+' · контуров: '+res.loops:'';
  if(!ok)return;
  const {ox,oy,u}=res.tf,X=x=>ox+x/u,Y=y=>oy-y/u,lw=Math.max(1.5,img.W/500);
  cx.beginPath();
  for(const c of res.cs){const n=c.nodes;cx.moveTo(X(n[0].x),Y(n[0].y));
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
      if(a.b||b.a){const p1=a.b||a,p2=b.a||b;cx.bezierCurveTo(X(p1.x),Y(p1.y),X(p2.x),Y(p2.y),X(b.x),Y(b.y));}else cx.lineTo(X(b.x),Y(b.y));}
    cx.closePath();}
  cx.fillStyle='rgba(0,0,0,.14)';cx.fill('nonzero');
  cx.strokeStyle=(typeof dsColor==='function'?dsColor('sel'):'#141416');cx.lineWidth=lw;cx.stroke();
  cx.fillStyle='#111';const r=Math.max(2,lw*1.4);
  for(const c of res.cs)for(const n of c.nodes)cx.fillRect(X(n.x)-r,Y(n.y)-r,2*r,2*r);}
/* ---------- вход: выбор файла для знака ---------- */
let trPick=null;
function trPickFile(ch){
  if(!trPick){trPick=document.createElement('input');trPick.type='file';trPick.accept='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';trPick.style.display='none';document.body.appendChild(trPick);}
  trPick.onchange=()=>{const f=trPick.files[0];trPick.value='';if(f)trStart(ch,f);};
  trPick.click();}
async function trStart(ch,file){
  try{const img=await trDecode(file);trOpen(ch,img);}
  catch(e){toast('Не удалось открыть картинку «'+file.name+'». Подойдёт PNG, JPG или WEBP');}}
/* пакетно: список растровых файлов → знаки по имени файла; возвращает сводку */
async function trBatch(files,forced,onProgress){
  const r={ok:[],bad:[],empty:[],cplx:[],miss:[]};let snapped=false;
  for(let i=0;i<files.length;i++){const f=files[i],ch=forced||impNameToChar(f.name);
    if(!ch||!iuCharOk(ch)){r.miss.push(f.name);continue;}
    if(onProgress)onProgress(i+1,files.length,f.name);
    let img;try{img=await trDecode(f);}catch(e){r.bad.push(f.name);continue;}
    const res=await trAuto(img);
    if(res.err){(res.err==='empty'?r.empty:r.cplx).push(f.name+(res.n?' ('+res.n+')':''));continue;}
    if(!snapped){snap();snapped=true;}
    impSetTraced(ch,res,f.name,1/img.scale);r.ok.push(ch);}
  return r;}
(function(){const st=document.createElement('style');st.textContent=`
.tr-card{width:min(560px,100%);max-height:calc(100vh - 24px);overflow:auto}
.tr-view{position:relative;background:var(--canvas);border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;min-height:120px;overflow:hidden}
.tr-view canvas{display:block;max-width:100%;max-height:42vh;width:auto;height:auto}
.tr-busy{position:absolute;right:10px;top:8px;font-size:var(--fs-sm);color:var(--muted)}
.tr-msg{min-height:0;font-size:var(--fs-md);color:var(--muted)}.tr-msg:empty{display:none}.tr-msg.bad{color:var(--danger)}
.tr-n{margin-left:auto;font-size:var(--fs-md);color:var(--muted)}
.tr-card .btn.pri{background:var(--accent);color:var(--on-accent);font-weight:700}
.tr-card .btn.pri:disabled{opacity:.4;cursor:default}
.tr-card .ctl{display:grid;grid-template-columns:110px 1fr auto;gap:10px;align-items:center}
.tr-card .ctl output{order:3;font-size:var(--fs-sm);color:var(--muted);min-width:64px;text-align:right}
.tr-card .ctl input{order:2;width:100%}
@media(max-width:520px){.tr-card{padding:14px}.tr-view canvas{max-height:34vh}.tr-card .ctl{grid-template-columns:96px 1fr auto}}
`;document.head.appendChild(st);})();
