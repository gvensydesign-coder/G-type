/* ===== «Перо»: дополнительные элементы на готовых знаках (шпора, капля, засечка, прорезь, трафаретный разрыв) =====
   Данные: S.edits[знак].deco = [ элемент ], элемент:
     { id, k:'s'|'f',             — штрих (скелет, расширенный пером шрифта) или замкнутая фигура Безье
       op:'add'|'cut',            — добавить к знаку (объединение) или вырезать (вычитание)
       n:[узел], c?:1,            — узлы; c — фигура замкнута
       pen?:{m:'font'|'round',sc}, wt?:0|1, s0?, cap0?, cap1? }   — только у штриха: перо, «толщина от веса», ствол при создании, окончания
     узел: { hx:'L'|'C'|'R', dx,   — по горизонтали от левого края / центра / правого края знака
             vy:'b'|'x'|'c'|'a'|'d'|'m', dy, (m0,m1,t)   — по вертикали от линии (baseline, x-height, cap, ascender, descender)
                                                         или пропорционально между двумя линиями (vy:'m')
             type:'smooth'|'corner', a:[dx,dy]|null, b:[dx,dy]|null, w? }  — ручки хранятся смещением от узла
   Привязка относительна, поэтому ползунки высоты и ширины двигают элемент вместе со знаком, а в семействе и вариативном
   шрифте он собирается на каждом мастере по его метрикам. Применяется в finalGlyph до объединения контуров
   (обёртки applyEdits/finalGlyph ниже: core4 не правится); без элементов ничто в шрифтах не меняется. */
const DECO={LIM:{els:10,nodes:28,total:80,off:900,handle:700,sc0:0.4,sc1:2.4},ctx:[]};
const decoNum=(v,lo,hi,d)=>{v=+v;return isFinite(v)?Math.max(lo,Math.min(hi,v)):d;};
const decoR1=v=>Math.round(v*10)/10;
function decoLines(p){return {b:0,x:p.xh,c:p.capH,a:p.asc,d:-p.desc};}
const decoSetOf=ch=>{const d=GL[ch];return d&&d.k==='xh'?['d','b','x','a']:['d','b','c'];};
const DECO_LINE_NAME={b:'базовая',x:'x-height',c:'cap-height',a:'ascender',d:'descender'};
function decoMetrics(ch,p,w){return {w,L:decoLines(p),set:decoSetOf(ch)};}
/* ---------- привязка ---------- */
function decoRes(n,M){
  const x=(n.hx==='R'?M.w:n.hx==='C'?M.w/2:0)+n.dx;
  const y=n.vy==='m'?M.L[n.m0]+n.t*(M.L[n.m1]-M.L[n.m0])+n.dy:M.L[n.vy]+n.dy;
  return {x,y};}
/* ближайшая привязка для точки (x,y): по горизонтали — левый край / центр / правый край; по вертикали — ближайшая линия
   метрик, а далеко от линий (середина знака) — пропорционально между двумя соседними, чтобы точка следовала за высотой */
function decoAnch(x,y,M){
  const w=M.w;let hx='L',best=Math.abs(x);
  if(Math.abs(x-w/2)<best-1e-9){hx='C';best=Math.abs(x-w/2);}
  if(Math.abs(x-w)<best-1e-9)hx='R';
  const o={hx,dx:decoR1(hx==='L'?x:hx==='C'?x-w/2:x-w)};
  const ls=M.set.map(k=>[k,M.L[k]]).sort((a,b)=>a[1]-b[1]);
  let near=ls[0],nd=1e9,lo=null,hi=null;
  for(const l of ls){const d=Math.abs(y-l[1]);if(d<nd){nd=d;near=l;}if(l[1]<=y)lo=l;if(l[1]>=y&&!hi)hi=l;}
  if(lo&&hi&&hi[1]-lo[1]>1&&nd>0.22*(hi[1]-lo[1])){o.vy='m';o.m0=lo[0];o.m1=hi[0];o.t=Math.round((y-lo[1])/(hi[1]-lo[1])*1000)/1000;o.dy=0;}
  else{o.vy=near[0];o.dy=decoR1(y-near[1]);}
  return o;}
/* абсолютные узлы элемента в координатах построения знака */
function decoAbs(el,M){
  return el.n.map(n=>{const q=decoRes(n,M);
    const o={x:q.x,y:q.y,type:n.type==='smooth'?'smooth':'corner',a:null,b:null};
    if(n.a)o.a={x:q.x+n.a[0],y:q.y+n.a[1]};if(n.b)o.b={x:q.x+n.b[0],y:q.y+n.b[1]};
    if(n.w!=null)o.w=n.w;return o;});}
/* узел из абсолютной точки */
function decoNodeAt(x,y,M,type){const o=decoAnch(x,y,M);o.type=type==='smooth'?'smooth':'corner';o.a=null;o.b=null;return o;}
/* переезд линии для копии на знак другой высоты (строчный ↔ прописной) */
function decoRemapLines(el,from,to){
  const mp={x:'c',c:'x'};
  if(from===to)return el;
  for(const n of el.n){if(mp[n.vy])n.vy=mp[n.vy];if(n.vy==='m'){if(mp[n.m0])n.m0=mp[n.m0];if(mp[n.m1])n.m1=mp[n.m1];}}
  return el;}
/* ---------- очистка данных (проект из файла, отмена) ---------- */
function decoSanEl(r,ids){
  if(!r||typeof r!=='object'||!Array.isArray(r.n))return null;
  const L=DECO.LIM,k=r.k==='f'?'f':'s',o={id:'',k,op:r.op==='cut'?'cut':'add',n:[]};
  let id=typeof r.id==='string'&&/^[A-Za-z0-9_]{1,12}$/.test(r.id)?r.id:'';
  if(!id||ids.has(id)){let i=ids.size+1;while(ids.has('e'+i))i++;id='e'+i;}
  ids.add(id);o.id=id;
  const H=h=>{if(!Array.isArray(h)||!isFinite(+h[0])||!isFinite(+h[1]))return null;let dx=decoNum(h[0],-L.handle,L.handle,0),dy=decoNum(h[1],-L.handle,L.handle,0);
    const l=Math.hypot(dx,dy);if(l>L.handle){dx*=L.handle/l;dy*=L.handle/l;}return [dx,dy];};
  for(const q of r.n){
    if(o.n.length>=L.nodes||!q||typeof q!=='object')break;
    const hx=q.hx==='R'||q.hx==='C'?q.hx:'L',n={hx,dx:decoNum(q.dx,-L.off,L.off,0),type:q.type==='smooth'?'smooth':'corner'};
    if(q.vy==='m'&&DECO_VY.includes(q.m0)&&DECO_VY.includes(q.m1)&&q.m0!==q.m1){n.vy='m';n.m0=q.m0;n.m1=q.m1;n.t=decoNum(q.t,-0.6,1.6,0.5);}
    else n.vy=DECO_VY.includes(q.vy)?q.vy:'b';
    n.dy=decoNum(q.dy,-L.off,L.off,0);
    n.a=H(q.a);n.b=H(q.b);
    if(q.w!=null&&isFinite(+q.w))n.w=decoNum(q.w,0,2,1);
    o.n.push(n);}
  if(!o.n.length)return null;
  if(k==='f'){if(o.n.length<3)return null;o.c=1;}
  else{
    const pn=r.pen||{};o.pen={m:pn.m==='round'?'round':'font',sc:decoNum(pn.sc,L.sc0,L.sc1,1)};
    o.wt=r.wt===0?0:1;o.s0=decoNum(r.s0,10,600,190);
    const cap=v=>typeof v==='string'&&/^[RFHVXBT]$/.test(v)?v:undefined;
    const c0=cap(r.cap0),c1=cap(r.cap1);if(c0)o.cap0=c0;if(c1)o.cap1=c1;}
  return o;}
const DECO_VY=['b','x','c','a','d'];
function decoSan(list){
  if(!Array.isArray(list))return [];
  const out=[],ids=new Set();let tot=0;
  for(const r of list){if(out.length>=DECO.LIM.els)break;const e=decoSanEl(r,ids);if(!e||tot+e.n.length>DECO.LIM.total)continue;tot+=e.n.length;out.push(e);}
  return out;}
/* список элементов знака; у альтернат (zero.tnum, m.hi…) — элементы базового знака, кроме ss01/locl (другая форма) */
function decoList(ch,edits,ed){
  if(ed&&ed.deco)return decoSan(ed.deco);
  const o=GL[ch]&&GL[ch].opt;
  if(edits&&o&&o.base&&o.base!==ch&&o.feat!=='ss01'&&o.feat!=='locl'){const eb=edGet(edits,o.base);if(eb&&eb.deco)return decoSan(eb.deco);}
  return [];}
/* ---------- геометрия элемента ---------- */
function decoPenScale(el,p){const pen=el.pen||{sc:1};let sc=pen.sc||1;if(el.wt===0)sc*=(el.s0||sE(p))/Math.max(sE(p),1);return Math.max(0.15,Math.min(3.5,sc));}
/* контуры элемента (до объединения со знаком): штрих — скелет и перо шрифта (core20), фигура — кривая Безье */
function decoGeom(el,M,p,fid){
  const A=decoAbs(el,M);
  if(el.k==='f'){if(A.length<3)return [];return csgUnion([{hole:false,nodes:A.map(n=>({x:n.x,y:n.y,a:n.a,b:n.b}))}]);}
  const rec={pen:{mode:el.pen&&el.pen.m==='round'?'round':'font',sc:decoPenScale(el,p)},skel:[]};
  if(A.length===1)rec.skel=[{dot:true,x:A[0].x,y:A[0].y,r:null}];
  else{const st={nodes:A.map(n=>{const o={x:n.x,y:n.y,a:n.a,b:n.b,type:n.type};if(n.w!=null)o.w=n.w;return o;})};
    if(el.cap0)st.cap0=el.cap0;if(el.cap1)st.cap1=el.cap1;rec.skel=[st];}
  return skShape(cuSkelOf(rec,p,fid),cuFont(fid,rec),p);}
/* знак + элементы: сначала сложение (подряд идущие «добавить» — одним объединением), затем вычитание; порядок списка сохраняется */
function decoMerge(cs,list,ch,ed,p0){
  try{
    const p=safeP(p0),fid=CUR_FONT,w=glyphWidth(ch,p,ed),M=decoMetrics(ch,p,w);
    let U=csgUnion(cs.filter(c=>!c.off));
    if(!U)return null;
    let run=[],runOp=null;
    const flush=()=>{if(!run.length)return;
      U=csgUnion(runOp==='cut'?U.concat(run.map(c=>({hole:c.hole,nodes:c.nodes,op:'sub'}))):U.concat(run));run=[];};
    for(const el of list){const g=decoGeom(el,M,p,fid);if(!g||!g.length)continue;if(runOp!==el.op){flush();runOp=el.op;}for(const c of g)run.push(c);}
    flush();return U;
  }catch(e){return null;}}
/* ---------- подключение к finalGlyph (без правки core4) ---------- */
const _fg_deco=finalGlyph;
finalGlyph=function(ch,st,edits,opt){DECO.ctx.push({ch,st,edits,opt:opt||{}});try{return _fg_deco(ch,st,edits,opt);}finally{DECO.ctx.pop();}};
const _ae_deco=applyEdits;
applyEdits=function(cs,ed){
  _ae_deco(cs,ed);
  const c=DECO.ctx[DECO.ctx.length-1];if(!c||c.opt.keepOff)return;
  if(!(ed&&ed.deco)&&!(c.edits&&GL[c.ch]&&GL[c.ch].opt&&GL[c.ch].opt.base))return;
  const list=decoList(c.ch,c.edits,ed);if(!list.length)return;
  const out=decoMerge(cs,list,c.ch,ed,c.st.p);
  if(out){cs.length=0;for(const q of out)cs.push(q);}};
/* ---------- проверка топологии ---------- */
function decoPolyA(P){let a=0;for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length];a+=q[0]*r[1]-r[0]*q[1];}return Math.abs(a)/2;}
function decoStats(cs){
  let parts=0,holes=0,minA=1e18,area=0,bad=false;const polys=[];
  for(const c of cs){for(const n of c.nodes)if(!isFinite(n.x)||!isFinite(n.y))bad=true;
    const P=flatC(c,8);polys.push(P);const A=decoPolyA(P);
    if(c.hole){holes++;area-=A;}else{parts++;area+=A;}
    if(A<minA)minA=A;}
  if(!bad&&typeof vfCrossSeverity==='function'&&vfCrossSeverity(polys)>18)bad=true;
  return {parts,holes,minA:cs.length?minA:0,area,bad};}
function decoState(ch,st,ed,list){
  const e={};for(const k in ed)e[k]=ed[k];
  if(list&&list.length)e.deco=list;else delete e.deco;
  const g=finalGlyph(ch,st,{[edKey(ch)]:e},{slant:false,remap:false,warp:false,subdiv:false,rough:false});
  return g&&g.cs.length?decoStats(g.cs):null;}
/* Допустимость списка элементов: сложение — только слияние со знаком (без отрыва и без закрытых/перекрытых просветов),
   вычитание — не убирает часть целиком, не оставляет тонких обломков и просветов; во всех весах семейства (Light…Black),
   в прямом и курсивном начертаниях (правки знака общие для обоих). ed — правки знака, styles — {p,lat,hg} или массив таких.
   Возвращает {ok,msg?,sig,warn?}. */
const DECO_RC=new Map();
function decoBase(ch,s,ed){
  const e={};for(const k in ed)if(k!=='deco')e[k]=ed[k];
  const key=CUR_FONT+'|'+ch+'|'+JSON.stringify(s.p)+'|'+JSON.stringify(e)+'|'+(s.lat?JSON.stringify(s.lat).length:0);
  let r=DECO_RC.get(key);
  if(r===undefined){r=decoState(ch,s,e,null);if(DECO_RC.size>300)DECO_RC.clear();DECO_RC.set(key,r);}
  return r;}
function decoCheck(ch,ed,list,styles){
  ed=ed||{};
  if(!list||!list.length)return {ok:true,sig:[]};
  if(!Array.isArray(styles))styles=[styles];
  const adds=list.filter(e=>e.op!=='cut'),cuts=list.filter(e=>e.op==='cut');
  const sts=[],seen=new Set();
  const push=(nm,s)=>{const k=JSON.stringify(s.p);if(seen.has(k))return;seen.add(k);sts.push([nm,s]);};
  styles.forEach((st,i)=>{const it=i>0||st.p.slant>0?'курсив':'';
    push(it,st);
    for(const [wn] of FAM_W){try{push((it?it+', ':'')+'вес '+wn,{p:famParams(st.p,wn),lat:st.lat,hg:st.hg});}catch(e){}}});
  const sig=[];let sig0=null;
  for(const [nm,s] of sts){
    const w=nm?' ('+nm+')':'',bad=m=>({ok:false,msg:m+w,sig});
    const R=decoBase(ch,s,ed);if(!R)return {ok:true,sig:[]};
    const stem=sE(safeP(s.p)),thr=Math.min(0.3*stem*stem,0.8*R.minA);
    const S1=adds.length?decoState(ch,s,ed,adds):R;
    if(!S1||S1.bad)return bad('Контур получился некорректным');
    if(adds.length){
      if(S1.parts>R.parts)return bad('Элемент не касается знака — он отделился бы от буквы');
      if(S1.holes!==R.holes)return bad('Элемент замкнул или перекрыл просвет знака');
      if(S1.minA<thr)return bad('Слишком тонкий выступ или обломок');}
    let F=S1;
    if(cuts.length){
      F=decoState(ch,s,ed,list);const nc=cuts.length;
      if(!F||F.bad)return bad('Контур получился некорректным');
      if(F.parts<S1.parts)return bad('Вырез убрал часть знака целиком');
      if(F.parts>S1.parts+2*nc||F.holes>S1.holes+nc)return bad('Вырез дробит знак на части');
      if(F.minA<thr)return bad('Вырез оставляет слишком мелкий обломок или просвет');
      if(F.area<0.4*S1.area)return bad('Вырез съедает слишком много знака');}
    const sg=F.parts+'/'+F.holes;if(sig0===null)sig0=sg;sig.push(sg);}
  const warn=sig.some(x=>x!==sig0);
  return {ok:true,sig,warn};}
/* программный путь (тесты, импорт): положить элементы в правки знака */
/* элемент из абсолютных точек: pts=[[x,y,'s'?,[bdx,bdy]?]] в координатах построения знака ch при параметрах p */
