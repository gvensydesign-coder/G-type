/* ===== «Перо»: интерфейс рисования дополнительных элементов на готовых знаках =====
   Данные и движок — core22.js (S.edits[знак].deco). Режим «Перо» в панели холста: «Штрих» (скелет, расширенный пером шрифта) и
   «Фигура» (замкнутая кривая Безье: клик — угол, протяжка — плавный узел, клик по первому узлу — замкнуть), «Добавить» / «Вырезать».
   Элементы правятся после рисования (узлы, ручки, тип, перо, толщина), перечислены в списке знака и копируются на похожие знаки.
   Подключается обёртками, как ui_custom.js: функции других файлов не правятся. */
const PND={tool:'s',op:'add',sel:null,grp:[],xf:false,curId:null,hover:null,ptr:'mouse',tap:{t:0,x:0,y:0},u0:0,before:null,warn:'',statT:0,sim:null};
const penOn=()=>S.mode==='pen'&&S.tab==='edit';
const penList=()=>{const e=S.edits[S.sel];return e&&Array.isArray(e.deco)?e.deco:[];};
const penEl=id=>penList().find(e=>e.id===id)||null;
const penCurEl=()=>PND.curId?penEl(PND.curId):null;
function penDeco(create){let e=S.edits[S.sel];
  if(!e){if(!create)return null;S.edits[S.sel]={};e=S.edits[S.sel];}
  if(!Array.isArray(e.deco)){if(!create)return null;e.deco=[];}
  return e.deco;}
function penM(){const raw=rawGlyph();return raw?decoMetrics(S.sel,safeP(cur().p),raw.w):null;}
const penHasInk=()=>{const g=rawGlyph();return !!(g&&g.cs&&g.cs.length);};
const penSnapshot=()=>{const e=S.edits[S.sel];return e?JSON.stringify(e):null;};
function penRestore(before){if(before==null)delete S.edits[S.sel];else S.edits[S.sel]=JSON.parse(before);}
function penTidy(){const e=S.edits[S.sel];if(e&&Array.isArray(e.deco)&&!e.deco.length)delete e.deco;cleanEdit();}
/* edits с deco не считались «пустыми» старым cleanEdit: он видел ключ deco и удалял правки знака целиком */
const _clean_pn=cleanEdit;
cleanEdit=function(){const e=S.edits[S.sel],d=e&&e.deco;if(!(Array.isArray(d)&&d.length))return _clean_pn();
  delete e.deco;try{_clean_pn();}finally{const e2=S.edits[S.sel]||(S.edits[S.sel]={});e2.deco=d;}};
/* ---------- стили ---------- */
(function(){const st=document.createElement('style');st.textContent=`
[data-mode=pen]{--ic:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3.2l5.2 6.6-2.4 8.2H9.2L6.8 9.8z'/%3E%3Cpath d='M12 11.2V16'/%3E%3Ccircle cx='12' cy='10' r='1.1'/%3E%3Cpath d='M8.6 21h6.8'/%3E%3C/svg%3E")}
.stage>.nrow:has(#pnp:not([hidden])){display:flex!important}
body.pn-on .specwrap{display:none}
.pnp{width:100%;margin-left:0;flex-direction:column;align-items:stretch;gap:8px}
.pnp .cur{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;min-width:0;max-width:100%}
.pnp .seg button{padding:5px 10px;font-size:var(--fs-sm)}
.pn-st{font-size:var(--fs-sm);color:var(--muted);min-height:16px}
.pn-st.bad{color:var(--danger)}
#pensec .cus{display:flex;flex-direction:column;gap:10px}
.pn-list{display:flex;flex-direction:column;gap:6px}
.pn-row{display:flex;align-items:center;gap:6px;background:var(--panel);border-radius:var(--r-pill);padding:3px 4px 3px 4px}
.pn-row.on{box-shadow:inset 0 0 0 1.5px var(--ink);background:var(--surface-3)}
.pn-row .pn-name{flex:1;min-width:0;text-align:left;background:none;border:0;padding:6px 10px;cursor:pointer;font-weight:600;font-size:var(--fs-md);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pn-row .pn-op{border:0;border-radius:var(--r-pill);padding:5px 11px;font-size:var(--fs-sm);font-weight:600;cursor:pointer;background:var(--paper);color:var(--ink)}
.pn-row .pn-op.cut{background:var(--ink);color:var(--on-ink)}
.pn-row .pn-x{width:28px;height:28px;border-radius:50%;border:0;background:none;cursor:pointer;font-size:var(--fs-lg);line-height:1;color:var(--ink)}
.pn-row .pn-x:hover{background:var(--paper)}
.pn-hint{font-size:var(--fs-sm);color:var(--muted);line-height:1.4}
.pn-warn{font-size:var(--fs-sm);color:var(--danger);line-height:1.4}
.pn-sim{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto}
.pn-grid{display:flex;flex-wrap:wrap;gap:5px;max-height:34vh;overflow:auto}
.pn-grid .chip{min-width:34px;text-align:center;padding:6px 8px}
.pn-grid .chip.on,.pn-pre .chip.on{background:var(--ink);color:var(--on-ink)}
.pn-pre{display:flex;flex-wrap:wrap;gap:6px}
.pn-lab{font-size:var(--fs-sm);color:var(--muted);margin-top:2px}
`;document.head.appendChild(st);})();
/* ---------- привязка курсора: направляющие и шаг (как в «Свой знак») ---------- */
/* привязка в единицах шрифта (допуск и округление не зависят от масштаба экрана): одинаковый результат на любом устройстве */
const PEN_SNAP_TOL=14;
function penSnapPt(x,y,alt){const r=drSnapPt(x,y,alt,PEN_SNAP_TOL);PND.snapHit=r.hit;return [Math.round(r.p[0]),Math.round(r.p[1])];}
const penClamp=(x,y)=>[Math.max(-300,Math.min(1600,x)),Math.max(-520,Math.min(1200,y))];
function penNodeXY(el,ni,M){return decoRes(el.n[ni],M);}
function penSetPos(n,x,y,M){const o=decoAnch(x,y,M);n.hx=o.hx;n.dx=o.dx;n.vy=o.vy;n.dy=o.dy;
  if(o.vy==='m'){n.m0=o.m0;n.m1=o.m1;n.t=o.t;}else{delete n.m0;delete n.m1;delete n.t;}}
function penSetHandle(n,part,x,y,M,brk){const q=decoRes(n,M);let dx=x-q.x,dy=y-q.y,L=Math.hypot(dx,dy);
  if(L>DECO.LIM.handle){dx*=DECO.LIM.handle/L;dy*=DECO.LIM.handle/L;L=DECO.LIM.handle;}
  if(brk&&n.type!=='corner')n.type='corner';
  n[part]=[decoR1(dx),decoR1(dy)];
  const o=part==='a'?'b':'a';
  if(n.type==='smooth'&&L>1e-3){const lo=n[o]?Math.hypot(n[o][0],n[o][1])||L:L;n[o]=[decoR1(-dx/L*lo),decoR1(-dy/L*lo)];}}
function penSetType(el,ni,type,M){
  const n=el.n[ni];if(!n)return;n.type=type;
  if(type==='smooth'){const c=el.n.length,P=el.n[el.k==='f'?(ni-1+c)%c:Math.max(ni-1,0)],N=el.n[el.k==='f'?(ni+1)%c:Math.min(ni+1,c-1)];
    const q=decoRes(n,M),pp=decoRes(P,M),nn=decoRes(N,M);
    let u=[nn.x-pp.x,nn.y-pp.y];
    const la0=n.a?Math.hypot(n.a[0],n.a[1]):0,lb0=n.b?Math.hypot(n.b[0],n.b[1]):0;
    if(la0>.5&&lb0>.5){const ua=[-n.a[0]/la0,-n.a[1]/la0],ub=[n.b[0]/lb0,n.b[1]/lb0];u=[ua[0]+ub[0],ua[1]+ub[1]];}
    const l=Math.hypot(u[0],u[1])||1;u=[u[0]/l,u[1]/l];
    const la=la0>.5?la0:Math.hypot(pp.x-q.x,pp.y-q.y)/3,lb=lb0>.5?lb0:Math.hypot(nn.x-q.x,nn.y-q.y)/3;
    n.a=[decoR1(-u[0]*Math.max(la,10)),decoR1(-u[1]*Math.max(la,10))];n.b=[decoR1(u[0]*Math.max(lb,10)),decoR1(u[1]*Math.max(lb,10))];}}
/* ---------- создание элементов ---------- */
function penNewEl(){
  const p=safeP(cur().p),l=penDeco(true);let n=0;
  for(const e of l){const m=/^e(\d+)$/.exec(e.id);if(m)n=Math.max(n,+m[1]);}
  const el={id:'e'+(n+1),k:PND.tool,op:PND.op,n:[]};
  if(el.k==='f')el.c=1;else{el.pen={m:'font',sc:1};el.wt=1;el.s0=Math.round(sE(p));}
  l.push(el);return el;}
const penTotal=()=>penList().reduce((s,e)=>s+e.n.length,0);
function penAddNode(x,y){
  const M=penM();if(!M)return null;let el=penCurEl();
  if(!el){if(penList().length>=DECO.LIM.els){toast('Элементов не больше '+DECO.LIM.els+' на знак');return null;}}
  if(penTotal()>=DECO.LIM.total){toast('Узлов не больше '+DECO.LIM.total+' на знак');return null;}
  if(el&&el.n.length>=DECO.LIM.nodes){toast('В элементе не больше '+DECO.LIM.nodes+' узлов');return null;}
  PND.xf=false;const [cx,cy]=penClamp(x,y);
  if(el){const l=penNodeXY(el,el.n.length-1,M);if(Math.hypot(l.x-cx,l.y-cy)<6)return null;}
  if(!el){el=penNewEl();PND.curId=el.id;}
  const n=decoNodeAt(cx,cy,M,'corner');el.n.push(n);
  PND.sel={id:el.id,ni:el.n.length-1,part:'p'};return {el,n};}
/* ---------- проверка и откат ---------- */
const penStyles=()=>{const o=S.style==='italic'?['italic','regular']:['regular','italic'];return o.map(k=>S.styles[k]).filter(Boolean);};
function penValidate(){
  const e=S.edits[S.sel];if(!e||!Array.isArray(e.deco)||!e.deco.length)return {ok:true,sig:[]};
  const list=decoSan(e.deco.filter(x=>x.id!==PND.curId));
  try{return decoCheck(S.sel,e,list,penStyles());}catch(err){return {ok:false,msg:'Не удалось проверить форму, поэтому правку отменили. Попробуйте ещё раз'};}}
function penRevertTo(before,u0,msg){
  penRestore(before);if(undoStack.length>u0)undoStack.length=u0;
  PND.curId=null;PND.sel=null;PND.warn='';
  bump();syncNodeInfo();penSync();if(msg)toast(msg+' — правка отменена');}
/* после правки: форма допустима? иначе откат к before (undoStack — к длине u0) */
function penGuard(before,u0){
  const r=penValidate();
  if(!r.ok){penRevertTo(before,u0,r.msg);return false;}
  PND.warn=r.warn?'В светлом и сверхжирном весах форма знака с этим элементом различается ('+r.sig.join(' → ')+') — проверьте результат.':'';
  penTidy();bump();penSync();return true;}
/* общая обёртка действия: снимок для отмены, правка, проверка */
function penEdit(fn){const before=penSnapshot(),u0=undoStack.length;snap();fn();penTidy();bump();return penGuard(before,u0);}
function penFinish(){
  PND.xf=false;const el=penCurEl();if(!el){PND.curId=null;return true;}
  const before=PND.before,u0=PND.u0;PND.curId=null;
  if(el.k==='f'&&el.n.length<3){penRevertTo(before,u0,'Фигуре нужно минимум три узла');return false;}
  if(el.k==='f')el.c=1;
  if(!el.n.length){penRevertTo(before,u0,'');return false;}
  const ok=penGuard(before,u0);syncNodeInfo();schedule();return ok;}
/* ---------- преобразование элементов (ui_xform_x1.js): масштаб, форма, поворот выбранных элементов ---------- */
const penGroupIds=()=>{const h=PND.sel;if(!PND.xf||!h||PND.curId||!penEl(h.id))return [];return [h.id,...PND.grp.filter(id=>id!==h.id&&penEl(id))];};
function penElBox(el,M){const A=decoAbs(el,M);return A.length?impBBox([{hole:false,nodes:A.map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}))}]):null;}
/* узлы и ручки элемента после матрицы m: положение перепривязывается к линиям и краям знака, ручки хранятся смещением */
function penXfEl(el,m,M){
  const A=decoAbs(el,M);
  el.n.forEach((n,i)=>{const q=A[i],p=XF.pt(m,q.x,q.y),c=penClamp(p[0],p[1]);penSetPos(n,c[0],c[1],M);
    for(const h of ['a','b']){if(!q[h]){n[h]=null;continue;}const t=XF.pt(m,q[h].x,q[h].y);let dx=t[0]-p[0],dy=t[1]-p[1];const L=Math.hypot(dx,dy);
      if(L>DECO.LIM.handle){dx*=DECO.LIM.handle/L;dy*=DECO.LIM.handle/L;}n[h]=[decoR1(dx),decoR1(dy)];}});}
let PNXF=null;
function xfPen(){
  if(PNXF)return PNXF;
  PNXF=XF.make({id:'pn',host:$('#stagebox'),
    enabled:()=>penOn()&&penGroupIds().length>0,
    bbox:()=>{if(!penOn())return null;const M=penM(),ids=penGroupIds();if(!M||!ids.length)return null;let b=null;for(const id of ids)b=XF.union(b,penElBox(penEl(id),M));return b;},
    key:()=>S.sel+'|'+penGroupIds().join(','),
    toS:(x,y)=>skMap().s(x,y),fromS:(sx,sy)=>skMap().inv(sx,sy),size:()=>[V.cw,V.ch],
    hostOffset:()=>{const c=$('#stage').getBoundingClientRect(),h=$('#stagebox').getBoundingClientRect();return [c.left-h.left,c.top-h.top];},
    snap:(ax,v)=>{const r=ax==='x'?drSnapPt(v,0,false,PEN_SNAP_TOL).p[0]:drSnapPt(0,v,false,PEN_SNAP_TOL).p[1];return r;},
    begin:()=>{const ids=penGroupIds();if(!ids.length)return false;const before=penSnapshot(),u0=undoStack.length;snap();drag={kind:'pn',mode:'xf',fw:penFw()};/* вид не «плывёт», пока элемент растёт */return {before,u0,ids,orig:JSON.parse(before)};},
    apply:(m,t)=>{const M=penM(),e=S.edits[S.sel];if(!M||!e)return false;
      e.deco=JSON.parse(JSON.stringify(t.orig.deco));for(const id of t.ids){const el=penEl(id);if(el)penXfEl(el,m,M);}bump();return true;},
    end:(t,moved)=>{if(drag&&drag.mode==='xf')drag=null;if(!moved){undoStack.length=Math.min(undoStack.length,t.u0);schedule();return true;}
      const ok=penGuard(t.before,t.u0);syncNodeInfo();penSync();schedule();return ok;},
    cancel:t=>{if(drag&&drag.mode==='xf')drag=null;penRestore(t.before);if(undoStack.length>t.u0)undoStack.length=t.u0;bump();penSync();},
    redraw:schedule});
  return PNXF;}
/* ---------- попадание и перетаскивание ---------- */
function penHit(sx,sy){
  const M=penM();if(!M)return null;const f=skMap().s,R=PND.ptr==='touch'?20:11;let best=null,bd=R;
  const sel=PND.sel;
  for(const el of penList()){
    el.n.forEach((n,ni)=>{
      const q0=decoRes(n,M);
      if(sel&&sel.id===el.id&&sel.ni===ni)for(const h of ['a','b']){const hd=n[h];if(!hd||Math.hypot(hd[0],hd[1])<0.5)continue;
        const q=f(q0.x+hd[0],q0.y+hd[1]),d=Math.hypot(q[0]-sx,q[1]-sy)-1;if(d<bd){bd=d;best={id:el.id,ni,part:h};}}
      const q=f(q0.x,q0.y),d=Math.hypot(q[0]-sx,q[1]-sy);if(d<bd){bd=d;best={id:el.id,ni,part:'p'};}});}
  return best;}
function penDown(e){
  const [sx,sy]=pt(e);PND.ptr=e.pointerType||'mouse';
  if(!penHasInk()){toast('У этого знака нет контура — выберите другой знак');return true;}
  const M=penM(),sm=skMap(),now=performance.now();
  const dbl=now-PND.tap.t<340&&Math.hypot(sx-PND.tap.x,sy-PND.tap.y)<18;PND.tap={t:dbl?0:now,x:sx,y:sy};
  $('#stage').setPointerCapture(e.pointerId);
  if(!PND.curId&&xfPen().down(e,sx,sy))return true;
  const hit=penHit(sx,sy),w=sm.inv(sx,sy),cur0=penCurEl();
  if(hit&&e.shiftKey&&!cur0&&PND.sel&&hit.id!==PND.sel.id&&penEl(hit.id)){/* Shift: добавить элемент в выделение (или убрать) */
    PND.grp=PND.grp.includes(hit.id)?PND.grp.filter(i=>i!==hit.id):[...PND.grp,hit.id];penSync();syncNodeInfo();schedule();return true;}
  if(hit&&!e.shiftKey&&PND.sel&&PND.grp.length&&hit.id!==PND.sel.id)PND.grp=[];
  if(dbl&&cur0&&(!hit||(hit.id===cur0.id&&hit.part==='p'&&hit.ni===cur0.n.length-1))){penFinish();return true;}
  if(hit){
    const el=penEl(hit.id);
    /* клик по первому узлу рисуемой фигуры — замкнуть */
    if(cur0&&cur0.id===hit.id&&cur0.k==='f'&&hit.part==='p'&&hit.ni===0&&cur0.n.length>=3){snap();PND.sel={id:el.id,ni:0,part:'p'};penFinish();return true;}
    if(cur0&&cur0.id!==hit.id){if(!penFinish())return true;}
    PND.sel=hit;PND.xf=true;/* ручки преобразования — только у элемента, выбранного нажатием */
    const before=penSnapshot(),u0=undoStack.length;snap();
    const n=el.n[hit.ni],q=decoRes(n,M),pos=hit.part==='p'?q:{x:q.x+n[hit.part][0],y:q.y+n[hit.part][1]};
    drag={kind:'pn',mode:'move',hit,off:[w[0]-pos.x,w[1]-pos.y],start:[pos.x,pos.y],sx,sy,moved:false,before,u0,fw:penFw()};
    syncNodeInfo();penSync();schedule();return true;}
  /* пустое место: новый узел */
  const [x,y]=penSnapPt(w[0],w[1],e.altKey);
  if(cur0&&cur0.k!==PND.tool)penFinish();
  const first=!penCurEl(),before0=penSnapshot(),u00=undoStack.length;
  snap();
  const r=penAddNode(x,y);
  if(!r){undoStack.length=u00;schedule();return true;}
  if(first){PND.u0=u00;PND.before=before0;}
  drag={kind:'pn',mode:'new',el:r.el,n:r.n,sx,sy,moved:false,fw:penFw()};
  bump();syncNodeInfo();penSync();schedule();return true;}
function penMove(e){
  const [sx,sy]=pt(e),sm=skMap();
  if(PNXF&&PNXF.active){$('#stage').style.cursor=PNXF.move(e,sx,sy)||'';return;}
  const d=drag&&drag.kind==='pn'?drag:null;
  if(!d){const w=sm.inv(sx,sy);PND.hover=penSnapPt(w[0],w[1],e.altKey);const xc=!PND.curId&&penGroupIds().length?xfPen().move(e,sx,sy):'';
    $('#stage').style.cursor=xc||(penHit(sx,sy)?'pointer':'crosshair');schedule();return;}
  if(!d.moved&&Math.hypot(sx-d.sx,sy-d.sy)<3)return;d.moved=true;
  const w=sm.inv(sx,sy),M=penM();if(!M)return;
  if(d.mode==='new'){const n=d.n;let [tx,ty]=[w[0],w[1]];const q=decoRes(n,M);
    if(e.shiftKey)[tx,ty]=drAxisLock(tx,ty,q.x,q.y,true);
    const vx=tx-q.x,vy=ty-q.y,L=Math.hypot(vx,vy);
    if(L>6){const k=Math.min(1,DECO.LIM.handle/L);n.type='smooth';n.b=[decoR1(vx*k),decoR1(vy*k)];n.a=[decoR1(-vx*k),decoR1(-vy*k)];}
    bump();syncNodeInfo();return;}
  const el=penEl(d.hit.id),n=el&&el.n[d.hit.ni];if(!n)return;
  let tx=w[0]-d.off[0],ty=w[1]-d.off[1];
  if(e.shiftKey)[tx,ty]=drAxisLock(tx,ty,d.start[0],d.start[1],false);
  if(d.hit.part==='p'&&!e.altKey){const q=penSnapPt(tx,ty,false);tx=q[0];ty=q[1];}
  if(d.hit.part==='p'){const [cx,cy]=penClamp(tx,ty);penSetPos(n,cx,cy,M);}
  else penSetHandle(n,d.hit.part,tx,ty,M,e.altKey);
  bump();syncNodeInfo();}
function penUp(e){
  if(PNXF&&PNXF.active){PNXF.up(e);return true;}
  const d=drag&&drag.kind==='pn'?drag:null;if(!d)return false;drag=null;
  if(d.mode==='move'){
    if(!d.moved){undoStack.length=Math.min(undoStack.length,d.u0);schedule();return true;}
    if(!penCurEl()||penCurEl().id!==d.hit.id)penGuard(d.before,d.u0);else{bump();}
    syncNodeInfo();return true;}
  /* новый узел: контур проверяется, когда элемент закончен */
  bump();syncNodeInfo();penSync();schedule();return true;}
function penDelNode(){
  const h=PND.sel,el=h&&penEl(h.id);if(!el)return;
  const cur0=penCurEl();
  penEdit(()=>{
    const minN=el.k==='f'?3:1;
    if(el.n.length<=1||(el.k==='f'&&el.n.length<=minN)){const l=penDeco();l.splice(l.indexOf(el),1);PND.sel=null;if(PND.curId===el.id)PND.curId=null;}
    else{el.n.splice(h.ni,1);PND.sel={id:el.id,ni:Math.max(0,h.ni-1),part:'p'};}});
  void cur0;syncNodeInfo();schedule();}
function penDelEl(id){
  const el=penEl(id);if(!el)return;
  const before=penSnapshot(),u0=undoStack.length;snap();
  const l=penDeco();l.splice(l.indexOf(el),1);if(PND.curId===id)PND.curId=null;if(PND.sel&&PND.sel.id===id)PND.sel=null;
  penTidy();bump();penGuard(before,u0);syncNodeInfo();schedule();}
function penKey(e){
  const k=e.key;
  if(PNXF&&PNXF.key(e))return true;
  if(k==='Enter'){e.preventDefault();if(penCurEl())penFinish();else PND.sel=null;syncNodeInfo();penSync();schedule();return true;}
  if(k==='Escape'){e.preventDefault();if(penCurEl())penFinish();else PND.sel=null;syncNodeInfo();penSync();schedule();return true;}
  if(k==='Delete'||k==='Backspace'){e.preventDefault();if(PND.sel)penDelNode();return true;}
  const ar=drArrowStep(e);if(!ar)return false;const [dx,dy]=ar;
  e.preventDefault();const h=PND.sel,el=h&&penEl(h.id),M=penM();if(!el||!M)return true;
  if(PND.grp.length&&penGroupIds().length>1){xfPen().nudge(dx,dy);return true;}
  const n=el.n[h.ni];if(!n)return true;
  penEdit(()=>{const q=decoRes(n,M);
    if(h.part==='p')penSetPos(n,q.x+dx,q.y+dy,M);
    else if(n[h.part])penSetHandle(n,h.part,q.x+n[h.part][0]+dx,q.y+n[h.part][1]+dy,M,false);});
  syncNodeInfo();return true;}
/* ---------- отрисовка ---------- */
function penPath(el,M,f){const A=decoAbs(el,M);return skStrokePath({nodes:A,closed:el.k==='f'&&el.id!==PND.curId},f);}
function penPaint(c){
  const raw=rawGlyph(),M=penM();if(!raw||!M)return;
  const f=skMap().s,acc=css('--sel'),p=safeP(cur().p),fid=S.fontId,dragging=drag&&drag.kind==='pn';
  const U=getFinal(S.sel,S.style,{warp:false,slant:false,subdiv:false,rough:false});
  const P=pathOf(U?U.cs:[],(x,y)=>toS(x,y));
  drPaintGhost(c,P);
  c.save();c.lineCap='round';c.lineJoin='round';
  /* привязка курсора к направляющей */
  if(PND.hover&&!dragging)drPaintSnap(c,PND.snapHit,acc);
  const list=penList(),sel=PND.sel;
  /* области элементов: вырезы — красным (их нет в знаке), выбранный — контуром */
  const prev=SKX.FAST;if(dragging)SKX.FAST=true;
  try{for(const el of list){
    const isSel=(sel&&sel.id===el.id)||PND.grp.includes(el.id);if(!(el.op==='cut'||isSel))continue;
    if(el.k==='f'&&el.n.length<3)continue;
    let cs=[];try{cs=decoGeom(el,M,p,fid)||[];}catch(err){cs=[];}
    const Q=pathOf(cs,f);
    if(el.op==='cut'){c.fillStyle='rgba(0,0,0,.12)';c.fill(Q,'nonzero');c.strokeStyle=acc;c.lineWidth=1.2;c.setLineDash([4,3]);c.stroke(Q);c.setLineDash([]);}
    else if(isSel){c.strokeStyle=acc;c.globalAlpha=.55;c.lineWidth=1.2;c.stroke(Q);c.globalAlpha=1;}}}
  finally{SKX.FAST=prev;}
  /* скелеты и узлы */
  for(const el of list){
    const isSel=sel&&sel.id===el.id,act=el.id===PND.curId;
    c.strokeStyle=isSel||act?acc:'#000';c.lineWidth=isSel?2.2:1.5;c.globalAlpha=isSel||act?1:.7;
    if(el.n.length>=2)c.stroke(penPath(el,M,f));
    c.globalAlpha=1;
    const A=decoAbs(el,M);
    /* пунктир к курсору: куда пойдёт следующий отрезок */
    if(act&&PND.hover&&!dragging){const l=A[A.length-1],q=f(l.x,l.y),h=f(PND.hover[0],PND.hover[1]);
      c.strokeStyle=acc;c.globalAlpha=.5;c.setLineDash([4,4]);c.lineWidth=1.4;c.beginPath();c.moveTo(q[0],q[1]);c.lineTo(h[0],h[1]);c.stroke();c.setLineDash([]);c.globalAlpha=1;}
    A.forEach((nd,ni)=>{const q=f(nd.x,nd.y),isN=isSel&&sel.ni===ni;
      if(isN)for(const h of ['a','b']){const hd=nd[h];if(!hd||Math.hypot(hd.x-nd.x,hd.y-nd.y)<0.5)continue;
        drPaintHandle(c,q,f(hd.x,hd.y),sel.part===h,acc);}
      const first=el.k==='f'&&act&&ni===0&&A.length>=3;
      skNodeMark(c,q,nd.type!=='corner',isN&&sel.part==='p',acc,isN||first);});
    /* привязка выбранного узла: пунктир к линии метрик и к краю знака */
    if(isSel&&sel.ni>=0&&el.n[sel.ni]&&!dragging){const n=el.n[sel.ni],nd=A[sel.ni],q=f(nd.x,nd.y);
      c.strokeStyle=acc;c.globalAlpha=.4;c.setLineDash([2,4]);c.lineWidth=1;c.beginPath();
      const yv=n.vy==='m'?null:M.L[n.vy],xv=n.hx==='R'?M.w:n.hx==='C'?M.w/2:0;
      if(yv!=null){const t=f(nd.x,yv);c.moveTo(q[0],q[1]);c.lineTo(t[0],t[1]);}
      const t2=f(xv,nd.y);c.moveTo(q[0],q[1]);c.lineTo(t2[0],t2[1]);c.stroke();c.setLineDash([]);c.globalAlpha=1;}}
  c.restore();
  if(!PND.curId&&penGroupIds().length)xfPen().paint(c);else if(PNXF)PNXF.sync();
  if(!list.length){c.fillStyle='rgba(0,0,0,.4)';c.font='500 13px "Onest",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
    const q=toS(M.w/2,p.capH+70);c.fillText(PND.tool==='s'?'Клик — узел штриха · Enter — закончить':'Клик — угол, протяжка — плавный узел, первый узел — замкнуть',q[0],q[1]);c.textAlign='left';}}
const _dp_pn=drawPoints,_ds_pn=drawSmart,_hs_pn=hitSmart;
drawPoints=function(c,raw){if(penOn())return penPaint(c);return _dp_pn(c,raw);};
drawSmart=function(c){if(penOn())return;return _ds_pn(c);};
hitSmart=function(sx,sy){if(penOn())return null;return _hs_pn(sx,sy);};
/* ---------- вид: правый край включает элементы, выступающие за знак ---------- */
function penFw(){const M=penM();if(!M)return null;let x1=M.w;
  for(const el of penList()){let A;try{A=decoAbs(el,M);}catch(e){continue;}for(const n of A){for(const q of [n,n.a,n.b]){if(q&&q.x>x1)x1=q.x;}}}
  return x1>M.w+4?x1+70:null;}
const _view_pn=view;
view=function(){if(!penOn())return _view_pn();
  const had=drag;if(!had){drag={kind:'pn-view',fw:penFw()};V.fitH=null;}
  try{return _view_pn();}finally{if(drag&&drag.kind==='pn-view')drag=null;}};
/* ---------- события ---------- */
const _onDown_pn=onDown,_onMove_pn=onMove,_onUp_pn=onUp,_onDbl_pn=onDbl,_onKey_pn=onKey;
onDown=function(e){if(penOn()&&e.button!==1&&e.button!==2){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul))&&penDown(e))return;}return _onDown_pn(e);};
onMove=function(e){if(penOn()){if(!drag||drag.kind==='pn'){penMove(e);return;}}return _onMove_pn(e);};
onUp=function(e){if(penUp(e))return;return _onUp_pn(e);};
onDbl=function(e){if(penOn()){const [sx,sy]=pt(e);if(!(S.guides&&(sx<V.rul||sy<V.rul)))return;}return _onDbl_pn(e);};
onKey=function(e){if(S.tab==='edit'&&penOn()&&!(e.target.closest&&e.target.closest('input,textarea,select'))&&!(e.ctrlKey||e.metaKey)&&penKey(e))return;return _onKey_pn(e);};
/* смена знака / вкладки / режима: незаконченный элемент закрывается и проверяется на прежнем знаке */
const _sel_pn=selectGlyph;
selectGlyph=function(ch){if(PND.curId)penFinish();PND.sel=null;PND.grp=[];PND.warn='';_sel_pn(ch);if(penOn())penSync();};
const _tab_pn=setTab;
setTab=function(t){if(PND.curId&&t!==S.tab)penFinish();return _tab_pn.apply(this,arguments);};
const _undo_pn=undo;
undo=function(){const keep=PND.sel,kg=PND.grp;PND.curId=null;PND.sel=null;PND.warn='';const r=_undo_pn.apply(this,arguments);if(keep&&penEl(keep.id)){PND.sel=keep;PND.grp=kg;}penSync();return r;};
const _redo_pn=redo;
redo=function(){const keep=PND.sel,kg=PND.grp;PND.curId=null;PND.sel=null;PND.warn='';const r=_redo_pn.apply(this,arguments);if(keep&&penEl(keep.id)){PND.sel=keep;PND.grp=kg;}penSync();return r;};
/* ---------- проверка («Сверка»): части, заданные элементами, — замысел, а не отрыв ---------- */
const _proofChar_pn=proofChar;
proofChar=function(ch,st,des){const e=S.edits[ch];
  if(e&&Array.isArray(e.deco)&&e.deco.length&&des&&des[ch]!=null){
    try{const g=upright(ch,st,S.edits,true),parts=comps(rast(g.cs));if(parts!==des[ch]){des=Object.assign({},des);des[ch]=parts;}}catch(err){}}
  return _proofChar_pn(ch,st,des);};
/* ---------- панель ---------- */
const _syncPanel_pn=syncPanel;
syncPanel=function(){if(S.mode==='pen'&&!penOk())S.mode='points';_syncPanel_pn();penMount();
  const b=$('[data-mode=pen]');if(b){b.classList.toggle('on',S.mode==='pen');}
  document.body.classList.toggle('pn-on',penOn());
  const sec=$('#pensec');if(sec)sec.hidden=!penOn();
  penSync();};
const penOk=()=>true;
const _syncNode_pn=syncNodeInfo;
syncNodeInfo=function(){const box=$('#pnp');
  if(!penOn()){if(box)box.hidden=true;return _syncNode_pn();}
  const nb=$('#nbtns');if(nb){nb.hidden=true;nb.style.visibility='hidden';}const sk=$('#skp');if(sk)sk.hidden=true;const cp=$('#cup');if(cp)cp.hidden=true;
  if(!box)return;box.hidden=false;penBar();};
function penMount(){
  const seg=$('[aria-label="Режим"]');
  if(seg&&!$('[data-mode=pen]')){const b=document.createElement('button');b.type='button';b.dataset.mode='pen';b.textContent='Перо';b.title='Перо: добавить или вырезать элемент на знаке (шпора, капля, засечка, прорезь)';
    b.addEventListener('click',()=>{S.mode='pen';S.node=null;syncPanel();schedule();});seg.appendChild(b);}
  const row=$('.nrow');
  if(row&&!$('#pnp')){const d=document.createElement('div');d.id='pnp';d.className='skp pnp';d.hidden=true;
    d.innerHTML=`<div class="cur">
<span class="seg" id="pn-tool" role="group" aria-label="Что рисовать"><button type="button" data-pnt="s" title="Штрих: линия, расширенная пером шрифта">Штрих</button><button type="button" data-pnt="f" title="Фигура: замкнутая кривая">Фигура</button></span>
<span class="seg" id="pn-op" role="group" aria-label="Действие"><button type="button" data-pno="add" title="Объединить со знаком">Добавить</button><button type="button" data-pno="cut" title="Вычесть из знака">Вырезать</button></span>
<span class="seg" id="pn-type" role="group" aria-label="Тип узла"><button type="button" data-pnk="smooth" title="Ручки на одной прямой">Гладкий</button><button type="button" data-pnk="corner" title="Излом: ручки независимы">Угловой</button></span>
<span class="skb"><button class="btn sm" id="pn-end" type="button" title="Enter · двойной клик">Готово</button><button class="btn sm" id="pn-del" type="button" title="Del">Удалить узел</button></span></div>
<div class="pn-st" id="pn-st"></div>`;
    row.appendChild(d);}
  const pan=$('.panel');
  if(pan&&!$('#pensec')){const q=paneEl('ed-pen','Перо: элементы знака','');q.id='pensec';q.hidden=true;
    q.querySelector('.pane-b').innerHTML=`<div class="cus"><div class="pn-list" id="pn-list"></div>
<div class="pn-hint" id="pn-hint"></div>
<div id="pn-props">
<div class="cur"><span class="seg" id="pn-pen" role="group" aria-label="Перо"><button type="button" data-pnp="font" title="Перо шрифта: толщина и контраст как у букв">Перо шрифта</button><button type="button" data-pnp="round" title="Круглое перо толщиной в ствол">Круглое</button></span></div>
<div class="cur"><label class="skw"><span>Толщина</span><input type="range" id="pn-sc" min="0.4" max="2.4" step="0.05" aria-label="Толщина пера"><output id="pn-sco"></output></label></div>
<div class="cur"><span class="seg" id="pn-cap" role="group" aria-label="Окончания"><button type="button" data-pnc="" title="Окончания как у шрифта">Как в шрифте</button><button type="button" data-pnc="R" title="Круглые">Круглые</button><button type="button" data-pnc="F" title="Плоские">Плоские</button></span></div>
<label class="chk" title="Толщина штриха растёт и падает вместе со стволом от светлого до сверхжирного; без галочки — остаётся такой, как нарисована"><input type="checkbox" id="pn-wt">Толщина от веса</label>
</div>
<div class="cur"><button class="btn sm pri" id="pn-sim" type="button" title="Скопировать элемент на другие знаки с привязкой к их краям и линиям">Применить к похожим…</button><button class="btn sm" id="pn-clr" type="button">Убрать всё со знака</button></div>
<div class="pn-warn" id="pn-warn"></div></div>`;
    pan.insertBefore(q,pan.firstChild);paneInit(q,'ed-pen',true);}
  if($('#pnp')&&$('#pensec')&&!penMount.bound){penMount.bound=1;penBind();}}
function penBar(){
  const h=PND.sel,el=h&&penEl(h.id),n=el&&el.n[h.ni],M=penM();
  const info=$('#ninfo'),st=$('#pn-st');
  $$('#pn-tool button').forEach(b=>b.classList.toggle('on',b.dataset.pnt===PND.tool));
  $$('#pn-op button').forEach(b=>b.classList.toggle('on',b.dataset.pno===PND.op));
  $$('#pn-type button').forEach(b=>{b.classList.toggle('on',!!n&&(b.dataset.pnk==='corner')===(n.type==='corner'));b.disabled=!n;});
  $('#pn-del').disabled=!n;$('#pn-end').disabled=!penCurEl();
  if(n&&M){const q=decoRes(n,M);
    const where=(n.hx==='L'?'левый край':n.hx==='R'?'правый край':'центр')+' · '+(n.vy==='m'?'между '+DECO_LINE_NAME[n.m0]+' и '+DECO_LINE_NAME[n.m1]:DECO_LINE_NAME[n.vy]);
    if(info)info.textContent='x '+Math.round(q.x)+'  y '+Math.round(q.y)+'   привязка: '+where;}
  else if(info)info.textContent=penList().length?'элементов '+penList().length+' · узлов '+penTotal():'';
  if(st){const empty=!penHasInk();
    st.textContent=empty?'У этого знака нет контура — выберите другой знак':PND.warn||'Привязка — к направляющим и шагу (Alt — без привязки). Элементы следуют за знаком при смене высоты и ширины.';
    st.classList.toggle('bad',!!PND.warn&&!empty);}}
const penName=(el,i)=>(i+1)+' · '+(el.k==='f'?'Фигура':el.n.length===1?'Капля (точка)':'Штрих');
function penSync(){
  if(!$('#pensec'))return;
  if(PND.sel&&!penEl(PND.sel.id))PND.sel=null;
  if(!PND.sel)PND.grp=[];
  const list=penList(),box=$('#pn-list');if(!box)return;
  box.innerHTML='';
  list.forEach((el,i)=>{const r=document.createElement('div');r.className='pn-row'+(PND.sel&&PND.sel.id===el.id?' on':'');r.dataset.id=el.id;
    r.innerHTML='<button type="button" class="pn-name"></button><button type="button" class="pn-op'+(el.op==='cut'?' cut':'')+'" title="Переключить: добавить / вырезать"></button><button type="button" class="pn-x" title="Удалить элемент" aria-label="Удалить элемент">×</button>';
    r.querySelector('.pn-name').textContent=penName(el,i);r.querySelector('.pn-op').textContent=el.op==='cut'?'Вырезать':'Добавить';
    box.appendChild(r);});
  $('#pn-hint').textContent=list.length?'':'Знак пока без элементов. Выберите «Штрих» или «Фигура» под холстом и рисуйте прямо на знаке.';
  const el=PND.sel&&penEl(PND.sel.id),isS=!!el&&el.k==='s';
  $('#pn-props').hidden=!isS;
  if(isS){$$('#pn-pen button').forEach(b=>b.classList.toggle('on',b.dataset.pnp===(el.pen&&el.pen.m||'font')));
    const sc=$('#pn-sc');if(document.activeElement!==sc)sc.value=el.pen?el.pen.sc:1;$('#pn-sco').textContent=Math.round((el.pen?el.pen.sc:1)*100)+'%';
    $$('#pn-cap button').forEach(b=>{const c=b.dataset.pnc;b.classList.toggle('on',(el.cap0||'')===c&&(el.cap1||'')===c);});
    $('#pn-wt').checked=el.wt!==0;}
  $('#pn-sim').disabled=!list.length;$('#pn-clr').disabled=!list.length;
  const w=$('#pn-warn');if(w)w.textContent=PND.warn;
  if(penOn())penBar();}
function penBind(){
  $$('#pn-tool button').forEach(b=>b.addEventListener('click',()=>{if(PND.curId)penFinish();PND.tool=b.dataset.pnt;penSync();schedule();}));
  $$('#pn-op button').forEach(b=>b.addEventListener('click',()=>{PND.op=b.dataset.pno;
    const cu0=penCurEl();if(cu0&&cu0.op!==PND.op){cu0.op=PND.op;bump();}penSync();schedule();}));
  $$('#pn-type button').forEach(b=>b.addEventListener('click',()=>{const h=PND.sel,el=h&&penEl(h.id),M=penM();if(!el||!M)return;
    if(PND.curId===el.id){snap();penSetType(el,h.ni,b.dataset.pnk,M);bump();penSync();return;}
    penEdit(()=>penSetType(el,h.ni,b.dataset.pnk,M));}));
  bind('#pn-end','click',()=>{penFinish();penSync();});
  bind('#pn-del','click',penDelNode);
  const box=$('#pn-list');
  box.addEventListener('click',e=>{const r=e.target.closest('.pn-row');if(!r)return;const id=r.dataset.id,el=penEl(id);if(!el)return;
    if(e.target.closest('.pn-x')){penDelEl(id);return;}
    if(e.target.closest('.pn-op')){if(PND.curId&&PND.curId!==id)penFinish();penEdit(()=>{el.op=el.op==='cut'?'add':'cut';});schedule();return;}
    if(PND.curId&&PND.curId!==id)penFinish();
    PND.sel={id,ni:el.n.length-1,part:'p'};PND.grp=[];PND.xf=true;if(S.mode!=='pen'){S.mode='pen';syncPanel();}penSync();syncNodeInfo();schedule();});
  $$('#pn-pen button').forEach(b=>b.addEventListener('click',()=>{const el=PND.sel&&penEl(PND.sel.id);if(!el||el.k!=='s')return;penEdit(()=>{el.pen=el.pen||{m:'font',sc:1};el.pen.m=b.dataset.pnp;});}));
  $$('#pn-cap button').forEach(b=>b.addEventListener('click',()=>{const el=PND.sel&&penEl(PND.sel.id);if(!el||el.k!=='s')return;const c=b.dataset.pnc;
    penEdit(()=>{if(c){el.cap0=c;el.cap1=c;}else{delete el.cap0;delete el.cap1;}});}));
  bind('#pn-wt','change',()=>{const el=PND.sel&&penEl(PND.sel.id);if(!el||el.k!=='s'){penSync();return;}const on=$('#pn-wt').checked;
    penEdit(()=>{el.wt=on?1:0;el.s0=Math.round(sE(safeP(cur().p)));});});
  const sc=$('#pn-sc');let sb=null,su=0;
  sc.addEventListener('pointerdown',()=>{sb=penSnapshot();su=undoStack.length;snap();});
  sc.addEventListener('input',()=>{const el=PND.sel&&penEl(PND.sel.id);if(!el||el.k!=='s')return;if(sb==null&&!su){sb=penSnapshot();su=undoStack.length;snap();}
    el.pen=el.pen||{m:'font',sc:1};el.pen.sc=+sc.value;$('#pn-sco').textContent=Math.round(el.pen.sc*100)+'%';bump();});
  sc.addEventListener('change',()=>{const b0=sb,u0=su;sb=null;su=0;if(u0||b0!=null)penGuard(b0,u0);});
  bind('#pn-clr','click',()=>{if(!penList().length)return;penEdit(()=>{const e=S.edits[S.sel];if(e)delete e.deco;PND.sel=null;PND.curId=null;});toast('Элементы знака убраны');});
  bind('#pn-sim','click',penSimOpen);}
/* ---------- применить к похожим ---------- */
const PEN_GROUPS=[
  ['n h m u ı r п и ш','nhmuırпиш'],
  ['o c e d b p q ф э','ocedbpqфэ'],
  ['H I E F L T N M U B D P R П Г Ш И Ц','HIEFLTNMUBDPRПГШИЦ'],
  ['O C G Q D S Э Ю Ф','OCGQDSЭЮФ'],
  ['v w x y k z ж ч','vwxykzжч'],
  ['V W X Y A K Z Ж Ч Я','VWXYAKZЖЧЯ']];
function penSimOpen(){
  const el0=PND.sel&&penEl(PND.sel.id),src=S.sel;
  if(!penList().length)return;
  if(PND.curId)penFinish();
  let el=$('#pnsim');
  if(!el){el=document.createElement('div');el.id='pnsim';el.className='cu-modal';el.hidden=true;
    el.innerHTML=`<div class="cu-card pn-sim" role="dialog" aria-labelledby="pn-sim-t"><h4 id="pn-sim-t">Применить к похожим</h4>
<div class="cu-msg" id="pn-sim-msg"></div>
<div class="pn-lab">Группы</div><div class="pn-pre" id="pn-sim-pre"></div>
<div class="pn-lab">Знаки вручную</div><div class="pn-grid" id="pn-sim-grid"></div>
<div class="cu-row end"><button type="button" class="btn" id="pn-sim-cancel">Отмена</button><button type="button" class="btn pri" id="pn-sim-go">Применить</button></div></div>`;
    document.body.appendChild(el);
    el.addEventListener('pointerdown',e=>{if(e.target===el)penSimClose();});
    $('#pn-sim-cancel').addEventListener('click',penSimClose);
    $('#pn-sim-go').addEventListener('click',penSimGo);
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden){e.stopPropagation();penSimClose();}},true);}
  const twin=c=>edKey(c);
  const avail=c=>!!(GL[c]&&!isSpaceCh(c)&&(isLetter(c)||isDigit(c))&&twin(c)!==twin(src));
  const sel=new Set(),seen=new Set();
  PND.sim={src,ids:el0?[el0.id]:penList().map(e=>e.id),sel,avail,twin};
  const grid=$('#pn-sim-grid');grid.innerHTML='';
  for(const c of CHARSET){if(!avail(c))continue;if(seen.has(twin(c)))continue;seen.add(twin(c));
    const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=c;b.dataset.ch=c;b.title=cuUni?cuUni(c):c;
    b.addEventListener('click',()=>{const k=twin(c);if(sel.has(k))sel.delete(k);else sel.add(k);penSimRefresh();});grid.appendChild(b);}
  const pre=$('#pn-sim-pre');pre.innerHTML='';
  PEN_GROUPS.forEach(([name,chars])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=name;
    const members=[...chars].filter(avail).map(twin);b.dataset.mem=members.join('|');
    b.addEventListener('click',()=>{const on=members.length&&members.every(k=>sel.has(k));for(const k of members){if(on)sel.delete(k);else sel.add(k);}penSimRefresh();});
    if(!members.length)b.hidden=true;pre.appendChild(b);
    if([...chars].some(c=>twin(c)===twin(src)))for(const k of members)sel.add(k);});
  el.hidden=false;penSimRefresh();}
function penSimRefresh(){
  const s=PND.sim;if(!s)return;
  $$('#pn-sim-grid .chip').forEach(b=>b.classList.toggle('on',s.sel.has(s.twin(b.dataset.ch))));
  $$('#pn-sim-pre .chip').forEach(b=>{const m=b.dataset.mem?b.dataset.mem.split('|'):[];b.classList.toggle('on',m.length>0&&m.every(k=>s.sel.has(k)));});
  const n=s.sel.size,els=s.ids.length;
  $('#pn-sim-msg').textContent='Копируется '+(els===1?'выбранный элемент':'элементов: '+els)+' знака «'+s.src+'». Положение привязано к линиям и краям каждого знака, поэтому подстраивается под его ширину и высоту. Одинаковые латинские и кириллические буквы — один знак.';
  const go=$('#pn-sim-go');go.disabled=!n;go.textContent=n?'Применить ('+n+')':'Применить';}
function penSimClose(){const el=$('#pnsim');if(el)el.hidden=true;PND.sim=null;}
function penSimGo(){
  const s=PND.sim;if(!s||!s.sel.size)return;
  const srcList=penList().filter(e=>s.ids.includes(e.id));if(!srcList.length){penSimClose();return;}
  const kindOf=c=>GL[c]&&GL[c].k==='xh'?'xh':'cap',k0=kindOf(s.src);
  let ok=[],skip=[];
  const before=JSON.stringify(S.edits),u0=undoStack.length;snap();
  const targets=[...s.sel];
  for(const t of targets){
    const e0=S.edits[t],ed=e0?JSON.parse(JSON.stringify(e0)):{};
    const list=decoSan(ed.deco||[]);
    let added=0;
    for(const sr of srcList){
      const c=JSON.parse(JSON.stringify(sr));
      const dup=list.some(x=>x.op===c.op&&x.k===c.k&&JSON.stringify(x.n)===JSON.stringify(c.n));if(dup)continue;
      decoRemapLines(c,k0,kindOf(t));
      let id=1;while(list.some(x=>x.id==='e'+id))id++;c.id='e'+id;
      if(list.length>=DECO.LIM.els)break;
      list.push(c);added++;}
    if(!added){skip.push(t);continue;}
    let r;try{r=decoCheck(t,ed,decoSan(list),penStyles());}catch(err){r={ok:false};}
    if(!r.ok){skip.push(t);continue;}
    ed.deco=decoSan(list);S.edits[t]=ed;ok.push(t);}
  penSimClose();
  if(!ok.length){undoStack.length=u0;try{S.edits=JSON.parse(before);}catch(err){}toast('Ни один знак не подошёл'+(skip.length?' ('+skip.join(' ')+')':'')+' — ничего не изменено');penSync();return;}
  bump();penSync();syncNodeInfo();schedule();
  toast('Применено к '+ok.length+': '+ok.join(' ')+(skip.length?' · пропущено (форма не допускает): '+skip.join(' '):''));}
document.addEventListener('DOMContentLoaded',()=>{penMount();syncPanel();});
