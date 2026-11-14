/* ===== Stage 5B: исправления одним щелчком во вкладке «Проверка» =====
   Кнопка «Исправить» стоит на знаке только там, где есть безопасное автоматическое исправление; «Исправить всё» — на всей группе.
   Исправления:
     mar  — «Выровнять поля»: у знака замечание «выходит за поля» / «тесные поля» -> правки sbL/sbR (S.edits), цель — 0.6 медианы полей чистых знаков (8…60 ед.);
     spk  — «Убрать пятна»: «мелкое пятно» / «вырожденный контур» у собранного из своих знаков шрифта: контуры меньше порога удаляются;
     dir  — «Развернуть контуры»: направление контура не совпадает с признаком «отверстие» (внешний — против часовой, отверстие — по часовой);
     dup  — «Слить узлы»: соседние узлы ближе 1 ед. без ручек (одна точка вместо двух);
     ext  — «Добавить узлы»: кривая Безье имеет экстремум между узлами — в экстремуме ставится узел (форма не меняется);
     ovl  — «Объединить контуры»: внешние контуры перекрываются — точное объединение (csgUnion).
   dir/dup/ext/ovl проверяют сырые контуры шрифта «Свой» (IMP.glyphs[ch].c) и добавляют замечания в карточку знака (жёлтые).
   Каждое исправление идёт через общую историю: snap() + HIST.labeled('ed', подпись, …) = одна запись, «Отменить» возвращает всё; затем знак проверяется
   заново (proofChar). Если проверка не прошла (пустой контур, новая ошибка, сместился габарит, замечание осталось) — знак возвращается как был, а замечание помечается
   «автоматически не исправляется» (до следующего изменения знака). Исправление не трогает «Сбросить правки» и не меняет данные других знаков. */
const PFIX={fail:new Map(),busy:false,KIND:{
  mar:{n:'Поля',b:'Выровнять поля'},spk:{n:'Пятна',b:'Убрать пятна'},dir:{n:'Направление',b:'Развернуть контуры'},
  dup:{n:'Узлы',b:'Слить узлы'},ext:{n:'Крайние точки',b:'Добавить узлы'},ovl:{n:'Перекрытия',b:'Объединить контуры'}}};
const pfOk=v=>Number.isFinite(v)&&Math.abs(v)<20000;
const pfCopy=cs=>cs.map(c=>({hole:!!c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null}))}));
const pfArea=c=>impArea(flatC(c,6));
/* ---- сырые контуры: поиск и правка ---- */
function pfDupPred(a,b){return Math.hypot(a.x-b.x,a.y-b.y)<1&&!(a.b&&Math.hypot(a.b.x-a.x,a.b.y-a.y)>3)&&!(b.a&&Math.hypot(b.a.x-b.x,b.a.y-b.y)>3);}
function pfMergeDup(c){
  const N=c.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null}));let cnt=0;
  for(let i=0;i<N.length&&N.length>3;){const a=N[i],b=N[(i+1)%N.length];
    if(pfDupPred(a,b)){a.b=b.b;N.splice((i+1)%N.length,1);cnt++;if(i>=N.length)i=0;}else i++;}
  return {c:{hole:c.hole,nodes:N},n:cnt};}
function pfCountDup(c){const n=c.nodes;let k=0;if(n.length<=3)return 0;for(let i=0;i<n.length;i++)if(pfDupPred(n[i],n[(i+1)%n.length]))k++;return k;}
/* первый экстремум кубической кривой строго внутри сегмента (параметр) или null; P — четыре точки [x,y] */
function pfExtT(P){
  let best=null;
  for(let ax=0;ax<2;ax++){const p0=P[0][ax],p1=P[1][ax],p2=P[2][ax],p3=P[3][ax],u=p1-p0,v=p2-p1,w=p3-p2,A=u-2*v+w,B=2*(v-u),C=u,ts=[];
    if(Math.abs(A)<1e-9){if(Math.abs(B)>1e-9)ts.push(-C/B);}
    else{const D=B*B-4*A*C;if(D>1e-9){const q=Math.sqrt(D);ts.push((-B-q)/(2*A),(-B+q)/(2*A));}}
    for(const t of ts){if(!(t>0.02&&t<0.98))continue;
      const o=1-t,val=o*o*o*p0+3*o*o*t*p1+3*o*t*t*p2+t*t*t*p3,lo=Math.min(p0,p3),hi=Math.max(p0,p3);
      if(val>hi+0.5||val<lo-0.5){if(best==null||t<best.t)best={t,ax};}}}
  return best;}
function pfSegP(a,b){return [[a.x,a.y],a.b?[a.b.x,a.b.y]:[a.x,a.y],b.a?[b.a.x,b.a.y]:[b.x,b.y],[b.x,b.y]];}
function pfCountExt(c){const n=c.nodes;let k=0;for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if(!a.b&&!b.a)continue;if(pfExtT(pfSegP(a,b)))k++;}return k;}
function pfAddExt(c){
  const N=c.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null}));let cnt=0;
  const lerp=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],near=(p,x,y)=>Math.abs(p[0]-x)<1e-6&&Math.abs(p[1]-y)<1e-6;
  for(let pass=0;pass<4;pass++){let ch=false;
    for(let i=0;i<N.length&&N.length<1500;i++){
      const a=N[i],j=(i+1)%N.length,b=N[j];if(!a.b&&!b.a)continue;
      const P=pfSegP(a,b),e=pfExtT(P);if(!e)continue;
      const t=e.t,Q0=lerp(P[0],P[1],t),Q1=lerp(P[1],P[2],t),Q2=lerp(P[2],P[3],t),R0=lerp(Q0,Q1,t),R1=lerp(Q1,Q2,t),S=lerp(R0,R1,t);
      R0[e.ax]=S[e.ax];R1[e.ax]=S[e.ax];/* касательная в крайней точке строго горизонтальна / вертикальна */
      a.b=near(Q0,a.x,a.y)?null:{x:Q0[0],y:Q0[1]};b.a=near(Q2,b.x,b.y)?null:{x:Q2[0],y:Q2[1]};
      N.splice(i+1,0,{x:S[0],y:S[1],a:{x:R0[0],y:R0[1]},b:{x:R1[0],y:R1[1]}});cnt++;ch=true;i++;}
    if(!ch)break;}
  return {c:{hole:c.hole,nodes:N},n:cnt};}
const pfDirBad=c=>{if(c.nodes.length<3)return false;const a=pfArea(c);return Math.abs(a)>1&&((a>0)!==!c.hole);};
function pfBox(c){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const n of c.nodes){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x);y1=Math.max(y1,n.y);}return {x0,y0,x1,y1};}
const pfBoxHit=(p,q)=>p.x0<q.x1&&q.x0<p.x1&&p.y0<q.y1&&q.y0<p.y1;
const pfCount=m=>{let k=0;for(let i=0;i<m.length;i++)if(m[i])k++;return k;};
/* перекрываются ли внешние контуры: сумма площадей по контурам больше площади объединения */
function pfOverlap(cs){
  const out=cs.filter(c=>!c.hole&&c.nodes.length>=3);if(out.length<2)return false;
  const bx=out.map(pfBox);let hit=false;for(let i=0;i<out.length&&!hit;i++)for(let j=i+1;j<out.length;j++)if(pfBoxHit(bx[i],bx[j])){hit=true;break;}
  if(!hit)return false;
  let S=0;for(const c of cs){if(c.nodes.length<3)continue;S+=(c.hole?-1:1)*pfCount(rast([c]));}
  const U=pfCount(rast(cs));return S-U>Math.max(40,0.004*U);}
/* разбор сырой записи знака: {dir,dup,ext,ovl}; по записи кэшируется */
const _pfScan=new WeakMap();
function pfScan(rec){
  if(!rec||!rec.c||!rec.c.length)return null;let r=_pfScan.get(rec);if(r)return r;
  r={dir:0,dup:0,ext:0,ovl:false};
  try{for(const c of rec.c){if(!c||!c.nodes||c.nodes.some(n=>!pfOk(n.x)||!pfOk(n.y)))return null;if(pfDirBad(c))r.dir++;r.dup+=pfCountDup(c);r.ext+=pfCountExt(c);}
    r.ovl=pfOverlap(rec.c);}catch(e){return null;}
  _pfScan.set(rec,r);return r;}
/* ---- замечания шрифта «Свой» в карточке знака ---- */
(function(){
  const _pc=proofChar;
  proofChar=function(ch,st,des){
    const r=_pc.apply(this,arguments);
    try{if(CUR_FONT==='imp'&&r&&r.issues){const rec=IMP.glyphs[ch],sc=rec&&pfScan(rec);
      if(sc){const add=(fx,t)=>{r.issues.push({lvl:1,t,fx});if(r.lvl<1)r.lvl=1;};
        if(sc.dir)add('dir','направление контура неверно: '+sc.dir+' шт.');
        if(sc.dup)add('dup','почти совпадающие узлы: '+sc.dup);
        if(sc.ext)add('ext','нет узлов в крайних точках: '+sc.ext);
        if(sc.ovl)add('ovl','контуры перекрываются');}}}catch(e){}
    return r;};
})();
/* ---- план исправления одного знака ---- */
const pfRange=id=>{try{const e=document.getElementById(id);const a=+e.min,b=+e.max;if(Number.isFinite(a)&&Number.isFinite(b))return [a,b];}catch(e){}return [-200,400];};
function pfMarTarget(res){
  const v=[];res.forEach(r=>{if(r.lsb==null||!(isLetter(r.ch)||isDigit(r.ch)))return;if(r.issues.some(i=>/поля/.test(i.t)))return;if(r.lsb>=4&&r.rsb>=4)v.push(r.lsb,r.rsb);});
  if(!v.length)return 12;v.sort((a,b)=>a-b);return Math.max(8,Math.min(60,Math.round(v[v.length>>1]*0.6)));}
const pfEdSig=ch=>S.fontId+'|'+S.style+'|'+ch+'|'+(S.fontId==='imp'&&IMP.glyphs[ch]?(IMP.glyphs[ch].v||0)+'.'+(IMP.glyphs[ch].id||0):'')+'|'+JSON.stringify(S.edits[ch]||0);
const pfFailKey=(ch,id)=>id+'|'+pfEdSig(ch);
/* возвращает {id,ch,apply(),revert(),verify(r0)} или null, если безопасного исправления нет */
function pfPlan(ch,id,r,res){
  if(id==='mar'){
    if(!r||r.lsb==null||!r.issues.some(i=>/выходит за поля|тесные поля/.test(i.t)))return null;
    const tgt=pfMarTarget(res),dl=r.lsb<tgt?tgt-r.lsb:0,dr=r.rsb<tgt?tgt-r.rsb:0;if(!dl&&!dr)return null;
    const e0=S.edits[ch],old=e0?JSON.parse(JSON.stringify(e0)):null,[l0,l1]=pfRange('sbL'),[r0,r1]=pfRange('sbR');
    const cl=(v,a,b)=>Math.max(a,Math.min(b,Math.round(v))),nl=cl(((e0&&e0.sbL)||0)+dl,l0,l1),nr=cl(((e0&&e0.sbR)||0)+dr,r0,r1);
    return {id,ch,
      apply(){const e=S.edits[ch]||(S.edits[ch]={});if(dl){if(nl)e.sbL=nl;else delete e.sbL;}if(dr){if(nr)e.sbR=nr;else delete e.sbR;}if(!Object.keys(e).length)delete S.edits[ch];},
      revert(){if(old)S.edits[ch]=old;else delete S.edits[ch];},
      verify(){const q=proofChar(ch,cur(),designComps());return !!(q&&q.bb&&q.lsb!=null&&!q.issues.some(i=>i.lvl>=2&&!r.issues.some(j=>j.lvl>=2&&j.t.replace(/\d+/g,'#')===i.t.replace(/\d+/g,'#')))&&q.lsb>=4&&q.rsb>=4&&!(dl&&q.lsb<r.lsb)&&!(dr&&q.rsb<r.rsb));}};}
  /* правки сырых контуров: только шрифт «Свой» и знак с собственными контурами */
  if(S.fontId!=='imp'||typeof IMP==='undefined')return null;
  const rec=IMP.glyphs[ch];if(!rec||!rec.c||!rec.c.length)return null;
  const sc=pfScan(rec);if(!sc)return null;
  let nc=null,tag='';
  if(id==='spk'){
    if(!r.issues.some(i=>/мелкое пятно|вырожденный контур/.test(i.t)))return null;
    const lim=Math.max(8,SPECK_K*(IMP.stem0||140)*(IMP.stem0||140));
    const keep=rec.c.filter(c=>c.nodes&&c.nodes.length>=3&&Math.abs(pfArea(c))>=lim);
    if(!keep.length||keep.length===rec.c.length||!keep.some(c=>!c.hole))return null;nc=pfCopy(keep);tag='spk';}
  else if(id==='dir'){if(!sc.dir)return null;nc=rec.c.map(c=>pfDirBad(c)?{hole:!!c.hole,nodes:reverseNodes(c.nodes)}:{hole:!!c.hole,nodes:pfCopy([c])[0].nodes});tag='dir';}
  else if(id==='dup'){if(!sc.dup)return null;nc=rec.c.map(c=>pfMergeDup(c).c);tag='dup';}
  else if(id==='ext'){if(!sc.ext)return null;nc=rec.c.map(c=>pfAddExt(c).c);tag='ext';}
  else if(id==='ovl'){if(!sc.ovl)return null;let u;try{u=csgUnion(pfCopy(rec.c));}catch(e){return null;}
    if(!u||!u.length)return null;nc=u.map(c=>({hole:!!c.hole,nodes:c.nodes}));
    const m0=rast(rec.c),m1=rast(nc);if(iou(m0,m1)<0.995)return null;tag='ovl';}
  else return null;
  if(!nc.length||nc.some(c=>!c.nodes||c.nodes.length<3||c.nodes.some(n=>!pfOk(n.x)||!pfOk(n.y)||(n.a&&!(pfOk(n.a.x)&&pfOk(n.a.y)))||(n.b&&!(pfOk(n.b.x)&&pfOk(n.b.y))))))return null;
  const nrec=Object.assign({},rec,{c:nc,bb:impBBox(nc),v:++IMP.ver});delete nrec.id;
  return {id,ch,rec,nrec,
    apply(){IMP.glyphs[ch]=nrec;},revert(){IMP.glyphs[ch]=rec;},
    verify(){const q=proofChar(ch,cur(),designComps());if(!q||!q.bb)return false;
      if(q.issues.some(i=>i.lvl>=2&&!(r.issues.some(j=>j.t.replace(/\d+/g,'#')===i.t.replace(/\d+/g,'#')))))return false;/* новая ошибка (числа в тексте не в счёт) */
      if(q.issues.some(i=>i.fx===tag))return false;
      if(tag==='spk'&&q.issues.some(i=>/мелкое пятно|вырожденный контур/.test(i.t)))return false;
      if(r.bb&&(Math.abs(q.bb.xmax-r.bb.xmax)>2.5||Math.abs(q.bb.xmin-r.bb.xmin)>2.5||Math.abs(q.bb.ymax-r.bb.ymax)>2.5||Math.abs(q.bb.ymin-r.bb.ymin)>2.5))return false;
      return true;}};}
/* какие исправления есть у знака: [{id}] (без неудавшихся) и список неудавшихся */
function pfFixesFor(ch,r,res){
  const out=[],na=[];if(!r||!r.issues||!r.issues.length)return {out,na};
  for(const id of ['mar','spk','dir','dup','ext','ovl']){
    if(PFIX.fail.has(pfFailKey(ch,id))){if(pfWants(id,r))na.push(id);continue;}
    let pl=null;try{pl=pfPlan(ch,id,r,res);}catch(e){pl=null;}
    if(pl)out.push(id);}
  return {out,na};}
function pfWants(id,r){return r.issues.some(i=>id==='mar'?/выходит за поля|тесные поля/.test(i.t):id==='spk'?/мелкое пятно|вырожденный контур/.test(i.t):i.fx===id);}
/* ---- применение: одна запись истории ---- */
function pfRefresh(touchedImp){
  if(touchedImp){IMP.ver++;iuRegisterNow();}
  else{cache.clear();if(typeof GCACHE!=='undefined')GCACHE.clear();bump();}}
function pfApply(items,label){
  if(PFIX.busy||!items.length)return {done:0,failed:0};
  PFIX.busy=true;let res0,done=[],failed=[];
  try{
    res0=computeProof();
    const plans=[];
    for(const it of items){const r=res0.get(it.ch);let pl=null;try{pl=pfPlan(it.ch,it.id,r,res0);}catch(e){pl=null;}
      if(pl){pl.r0=r;plans.push(pl);}else failed.push(it);}
    if(plans.length){
      const run=()=>{
        snap();
        const imp=plans.some(p=>p.nrec),bad=[],live=[];
        for(const p of plans){try{p.apply();live.push(p);}catch(e){try{p.revert();}catch(x){}bad.push(p);}}
        try{pfRefresh(imp);}catch(e){for(const p of live){try{p.revert();}catch(x){}}bad.push(...live);live.length=0;try{pfRefresh(imp);}catch(x){}}
        for(const p of live){let ok=false;try{ok=p.verify();}catch(e){ok=false;}if(ok)done.push(p);else bad.push(p);}
        if(bad.length){for(const p of bad){try{p.revert();}catch(e){}}try{pfRefresh(imp);}catch(e){}for(const p of bad)failed.push({ch:p.ch,id:p.id});}
        if(!done.length){undoStack.pop();}
        S.node=null;};
      if(window.HIST&&HIST.labeled)HIST.labeled('ed',label,run);else run();}
  }finally{PFIX.busy=false;}
  for(const f of failed)PFIX.fail.set(pfFailKey(f.ch,f.id),1);
  try{if(typeof syncPanel==='function')syncPanel();}catch(e){}
  try{PF.ver=-1;if(typeof apSoon==='function')apSoon();}catch(e){}
  renderProof();
  return {done:done.length,failed:failed.length};}
function pfToast(r){
  if(!r.done&&!r.failed)return;
  toast(r.done?('Исправлено: '+r.done+(r.failed?'. Не удалось: '+r.failed+' — знаки оставлены как были':'')+'. «Отменить» вернёт всё как было'):'Автоматически исправить не удалось — знаки оставлены как были');}
const pfName=ch=>'«'+ch+'»';
function pfFixGlyph(ch,kinds){
  const ids=kinds&&kinds.length?kinds:null;const res=computeProof(),r=res.get(ch);if(!r)return;
  const f=pfFixesFor(ch,r,res).out.filter(id=>!ids||ids.includes(id));
  const lab=f.length===1?'Исправление: '+PFIX.KIND[f[0]].n.toLowerCase()+' '+pfName(ch):'Исправление знака '+pfName(ch);
  pfToast(pfApply(f.map(id=>({ch,id})),lab));}
/* близнецы А/A: поля у пары общие (один ключ правок edKey) — исправляем один раз; true = такое исправление уже учтено у близнеца */
function pfTwinSeen(ch,id,seen,first){
  if(id!=='mar')return false;const k=edKey(ch);
  if(seen.has(k)){return first?first.get(k):true;}seen.add(k);if(first)first.set(k,ch);return false;}
/* все исправимые замечания (по виду, если задан) */
function pfCollect(kind){
  const res=computeProof(),items=[],chars=new Set(),seen=new Set();
  for(const ch of CHARSET){const r=res.get(ch);if(!r)continue;for(const id of pfFixesFor(ch,r,res).out){if(kind&&id!==kind)continue;if(pfTwinSeen(ch,id,seen))continue;items.push({ch,id});chars.add(ch);}}
  return {items,chars:chars.size};}
function pfFixAll(kind){
  const c=pfCollect(kind);if(!c.items.length)return;
  const lab=kind?'Исправление: '+PFIX.KIND[kind].n.toLowerCase()+' у '+c.chars+' зн.':'Исправлено знаков: '+c.chars;
  pfToast(pfApply(c.items,lab));}
/* ---- интерфейс: кнопки в карточках и панель группы ---- */
function pfEnsureBar(){
  let b=document.getElementById('pfix');if(b)return b;
  const sm=document.getElementById('psum');if(!sm||!sm.parentNode)return null;
  b=document.createElement('div');b.id='pfix';b.className='pfix';b.hidden=true;b.setAttribute('role','group');b.setAttribute('aria-label','Исправления одним щелчком');
  sm.parentNode.insertBefore(b,sm.nextSibling);
  b.addEventListener('click',e=>{const t=e.target.closest('button[data-pfk]');if(!t)return;pfFixAll(t.dataset.pfk==='all'?null:t.dataset.pfk);});
  return b;}
function pfDecorate(){
  if(S.tab!=='proof')return;
  const res=computeProof(),grid=document.getElementById('pgrid'),bar=pfEnsureBar();if(!grid)return;
  const seen=new Set(),first=new Map();
  for(const el of grid.querySelectorAll('.pc')){
    const b=el.querySelector('.pt b'),ch=b&&b.textContent;const r=ch&&res.get(ch);if(!r)continue;
    const f=pfFixesFor(ch,r,res),act=el.querySelector('.pa');
    const shown=[],twin=[];for(const id of f.out){const t=pfTwinSeen(ch,id,seen,first);if(t)twin.push(t);else shown.push(id);}
    if(twin.length&&act&&!shown.length){const n=document.createElement('small');n.className='pfx-na';n.textContent='исправится вместе с «'+twin[0]+'»';act.insertBefore(n,act.firstChild);el.classList.add('pfx');}
    if(shown.length&&act){const btn=document.createElement('button');btn.type='button';btn.className='chip fx';btn.textContent='Исправить';
      btn.title=shown.map(id=>PFIX.KIND[id].b).join(' · ');btn.setAttribute('aria-label','Исправить знак '+ch+': '+btn.title);
      btn.addEventListener('click',()=>pfFixGlyph(ch));act.insertBefore(btn,act.firstChild);el.classList.add('pfx');}
    if(f.na.length)for(const li of el.querySelectorAll('.pi li')){const fx=f.na.find(id=>(li.textContent&&((id==='mar'&&/поля/.test(li.textContent))||(id==='spk'&&/пятно|вырожден/.test(li.textContent))||(id==='dir'&&/направление/.test(li.textContent))||(id==='dup'&&/совпадающие/.test(li.textContent))||(id==='ext'&&/крайних/.test(li.textContent))||(id==='ovl'&&/перекрываются/.test(li.textContent)))));
      if(fx&&!li.querySelector('.pfx-na')){const s=document.createElement('small');s.className='pfx-na';s.textContent=' · автоматически не исправляется';li.appendChild(s);}}}
  if(bar){const c=pfCollect(null);bar.innerHTML='';bar.hidden=!c.items.length;
    if(c.items.length){
      const by={};for(const it of c.items)(by[it.id]=by[it.id]||new Set()).add(it.ch);
      const t=document.createElement('span');t.className='pfix-t';t.textContent='Можно исправить автоматически: '+c.chars+' '+(c.chars%10===1&&c.chars%100!==11?'знак':(c.chars%10>=2&&c.chars%10<=4&&(c.chars%100<10||c.chars%100>=20)?'знака':'знаков'));bar.appendChild(t);
      for(const id of Object.keys(by)){const k=document.createElement('button');k.type='button';k.className='chip';k.dataset.pfk=id;k.textContent=PFIX.KIND[id].n+' · '+by[id].size;k.title=PFIX.KIND[id].b;bar.appendChild(k);}
      const all=document.createElement('button');all.type='button';all.className='chip fx';all.dataset.pfk='all';all.textContent='Исправить всё ('+c.chars+')';bar.appendChild(all);}}}
(function(){const f=renderProof;renderProof=function(){const r=f.apply(this,arguments);try{pfDecorate();}catch(e){console.error(e);}return r;};})();
/* шрифт «Свой»: любое изменение набора знаков (в т.ч. отмена исправления) сбрасывает кеш знаков и сохранённые результаты фоновой проверки */
(function(){const f=iuRegisterNow;iuRegisterNow=function(){/* GCACHE ключуется параметрами и правками, но не самой записью IMP.glyphs: без сброса исправленный или восстановленный знак отдавался бы из кеша прежним */
  try{GCACHE.clear();}catch(e){}
  const r=f.apply(this,arguments);
  try{if(typeof APS!=='undefined')for(const st of APS.values())if(st.k.indexOf('imp|')===0){st.res.clear();st.eSig.clear();}PF.ver=-1;if(typeof apSoon==='function')apSoon();}catch(e){}return r;};})();
window.PFIX_API={fixGlyph:pfFixGlyph,fixAll:pfFixAll,collect:pfCollect,plan:pfPlan,scan:pfScan,fixesFor:pfFixesFor,fail:PFIX.fail};
