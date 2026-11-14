/* ===== «Свой знак»: знаки, нарисованные скелетом и пером, в любом из пяти шрифтов =====
   Данные одного знака (CU.byFont[шрифт][символ]):
     { skel:[ {nodes:[{x,y,a,b,type,w,j?}], cap0, cap1, closed?} | {dot:true,x,y,r|null} ],
       k:'cap'|'xh',            — высота знака (прописная/строчная зона, оптические поля)
       pen:{mode:'font'|'round', sc:0.5…1.6},   — перо шрифта (или круглое) и множитель толщины
       w:null|число,            — ширина (null — по чернилам), поля считает система шрифта (finalGlyph)
       v }                      — номер версии (ключ кеша; меняется при каждой правке)
   Знак регистрируется как обычная запись GL[ch] (shape/w/k/opt) и попадает в CHARSET, поэтому предпросмотр, образец,
   Сверка, кернинг по классам и экспорт (статический, вариативный, семейство: cmap, uniXXXX) работают без изменений.
   Без своих знаков (CU.byFont пуст) ничто в шрифтах не меняется. */
const CU={byFont:{},alias:{},seq:0,GROUP:'Свои знаки',
  LIM:{strokes:12,nodes:32,total:96,xmin:-40,xmax:1200,ymin:-420,ymax:1100,handle:620,wmin:120,wmax:1500,gap:6},
  J:{volt:'miter',kvadra:'miter',stroka:'miter',codex:'miter',liniya:'round',propis:'round'},
  CAP:{liniya:'T',propis:'T'},
  PUA:[0xE000,0xF8FF]};
const cuNum=(v,lo,hi,d)=>{v=+v;return isFinite(v)?Math.max(lo,Math.min(hi,v)):d;};
/* символ, который можно нарисовать: ровно один код BMP (cmap формат 4), не управляющий, не пробел, не комбинируемый */
function cuCharOk(ch){if(typeof ch!=='string'||!ch)return false;const a=Array.from(ch);if(a.length!==1||ch.length!==1)return false;const c=ch.charCodeAt(0);
  return c>=0x21&&c<0xFFFE&&!(c>=0x7F&&c<=0xA0)&&c!==0xAD&&!(c>=0x300&&c<=0x36F)&&!(c>=0x200B&&c<=0x200F)&&!(c>=0x2028&&c<=0x202F)&&!(c>=0xD800&&c<=0xDFFF)&&c!==0xFEFF&&!(c>=0xFFF0);}
const cuIsPUA=ch=>{const c=ch.charCodeAt(0);return c>=CU.PUA[0]&&c<=CU.PUA[1];};
const cuUni=ch=>'U+'+ch.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0');
const cuMap=id=>CU.byFont[id]||(CU.byFont[id]={});
/* у знака есть чернила: хотя бы один штрих из двух узлов или точка */
function cuInk(rec){return !!(rec&&rec.skel&&rec.skel.some(st=>st.dot||(st.nodes&&st.nodes.length>=2)));}
function cuCount(rec){let n=0;for(const st of rec.skel)n+=st.dot?1:st.nodes.length;return n;}
/* очистка данных (проект из файла, отмена): числа в границах, лимиты по штрихам и узлам, неизвестные поля отбрасываются */
function cuSan(rec){
  const L=CU.LIM,r=rec||{},pn=r.pen||{};
  const o={skel:[],k:r.k==='xh'?'xh':'cap',pen:{mode:pn.mode==='round'?'round':'font',sc:cuNum(pn.sc,0.5,1.6,1)},w:null,v:++CU.seq};
  if(r.w!=null&&isFinite(+r.w))o.w=cuNum(r.w,L.wmin,L.wmax,null);
  if(typeof r.like==='string'&&r.like.length===1&&cuCharOk(r.like))o.like=r.like;
  const X=v=>cuNum(v,L.xmin,L.xmax,0),Y=v=>cuNum(v,L.ymin,L.ymax,0);
  const H=(h,n)=>{if(!h||!isFinite(+h.x)||!isFinite(+h.y))return null;let dx=X(h.x)-n.x,dy=Y(h.y)-n.y;const l=Math.hypot(dx,dy);
    if(l>L.handle){dx*=L.handle/l;dy*=L.handle/l;}return {x:n.x+dx,y:n.y+dy};};
  let total=0;
  for(const st of (Array.isArray(r.skel)?r.skel:[])){
    if(o.skel.length>=L.strokes||!st||typeof st!=='object')break;
    if(st.dot){if(total+1>L.total)break;o.skel.push({dot:true,x:X(st.x),y:Y(st.y),r:st.r==null?null:cuNum(st.r,6,260,null)});total++;continue;}
    if(!Array.isArray(st.nodes))continue;
    const ns=[];
    for(const q of st.nodes){if(ns.length>=L.nodes||total+ns.length>=L.total||!q||!isFinite(+q.x)||!isFinite(+q.y))break;
      const n={x:X(q.x),y:Y(q.y),a:null,b:null,type:q.type==='smooth'?'smooth':'corner'};
      n.a=H(q.a,n);n.b=H(q.b,n);
      if(q.w!=null&&isFinite(+q.w))n.w=cuNum(q.w,0,2,1);
      if(q.j==='miter'||q.j==='round'||q.j==='bevel')n.j=q.j;
      ns.push(n);}
    if(!ns.length)continue;
    total+=ns.length;
    const cap=v=>typeof v==='string'&&/^[RFHVXBT]$/.test(v)?v:undefined;
    const s={nodes:ns};const c0=cap(st.cap0),c1=cap(st.cap1);if(c0)s.cap0=c0;if(c1)s.cap1=c1;
    if(st.closed&&ns.length>=3)s.closed=true;
    o.skel.push(s);}
  return o;}
/* ---------- перо ---------- */
function cuPen(fid,p,rec){
  const F=FONTS[fid],pn=rec.pen||{mode:'font',sc:1},sc=pn.sc||1;
  if(pn.mode!=='round'&&F&&typeof F.pen==='function')return sc===1?F.pen(p):F.pen(Object.assign({},p,{stem:p.stem*sc,hair:p.hair*sc}));
  const S=Math.max(20,sE(p)*sc),H=Math.max(14,p.hair*sc);
  if(pn.mode==='round')return skPen('ell',{rx:S/2,ry:S/2,ang:0,stem:S});
  /* гротески: эллиптическое перо со стволом S и горизонталью H (контраст шрифта); Кодекс — широкое перо под углом p.diag */
  return skPen('ell',{rx:S/2,ry:H/2,ang:fid==='codex'?(p.diag||0):0,stem:S});}
function cuFont(fid,rec){const F=FONTS[fid]||{};
  return {pen:p=>cuPen(fid,p,rec),simpTol:F.simpTol,nodeBudget:F.nodeBudget,reduceTol:F.reduceTol,reduceCap:F.reduceCap};}
function cuDotR(rec,p){const pn=rec.pen||{sc:1};return Math.max(10,sE(p)*(pn.sc||1)/2*(pn.mode==='round'?1:0.92));}
/* скелет для движка: недостающие поля — по шрифту (окончания, стык углов) */
function cuSkelOf(rec,p,fid){
  const J=CU.J[fid]||'miter',cap=CU.CAP[fid]||'F';
  return rec.skel.map(st=>{
    if(st.dot)return {dot:true,x:st.x,y:st.y,r:st.r!=null?st.r:cuDotR(rec,p)};
    const ns=st.nodes.map((n,i)=>{const o={x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null,type:n.type==='smooth'?'smooth':'corner'};
      if(n.w!=null&&n.w!==1)o.w=n.w;if(o.type==='corner')o.j=n.j||J;return o;});
    const s={nodes:ns,cap0:st.cap0||cap,cap1:st.cap1||cap};
    if(st.closed)s.closed=true;else{ns[0].a=null;ns[ns.length-1].b=null;}return s;});}
/* чернильный габарит по необъединённым контурам пера */
function cuBBox(rec,fid,p){
  if(!cuInk(rec))return null;
  const key=fid+'|'+p.stem+'|'+p.hair+'|'+(p.diag||0)+'|'+(p.nib||0)+'|'+(p.press||0)+'|'+(p.wdth||0)+'|'+(p.stemScale||0);
  if(rec._bk===key&&rec._bv===rec.v)return rec._bb;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const prev=SKX.FAST;SKX.FAST=true;
  try{for(const c of skelToContours(cuSkelOf(rec,p,fid),cuPen(fid,p,rec),p))for(const n of c.nodes){
      for(const q of [n,n.a,n.b]){if(!q)continue;if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}}}
  finally{SKX.FAST=prev;}
  const bb=x1>x0?{x0,y0,x1,y1}:null;
  Object.defineProperty(rec,'_bk',{value:key,writable:true,enumerable:false,configurable:true});
  Object.defineProperty(rec,'_bv',{value:rec.v,writable:true,enumerable:false,configurable:true});
  Object.defineProperty(rec,'_bb',{value:bb,writable:true,enumerable:false,configurable:true});
  return bb;}
function cuWidth(rec,fid,p){
  if(rec.w!=null)return rec.w;
  const bb=cuBBox(rec,fid,p);
  return bb?Math.max(CU.LIM.wmin,Math.ceil(bb.x1/10)*10):Math.round((rec.k==='xh'?p.xh:p.capH)*0.6/10)*10;}
/* запись GL: обычный знак с функциями shape/w, ширина и поля — по системе шрифта */
function cuDef(ch,rec,fid){
  const d={k:rec.k==='xh'?'xh':'cap',opt:{cu:1},w:p=>cuWidth(rec,fid,p),cskel:g=>cuSkelOf(rec,g.p,fid)};
  d.shape=g=>cuInk(rec)?skShape(d.cskel(g),cuFont(fid,rec),g.p):[];
  return d;}
/* ---------- регистрация в текущем шрифте ---------- */
/* одинаковые кириллические и латинские буквы — один знак: перерисованный знак получают и парные (тот же объект в GL шрифта) */
function cuTwins(id,ch){const G=FONTS[id]&&FONTS[id].GL,d=G&&G[ch],out=[];if(!d)return out;for(const c in G)if(c!==ch&&G[c]===d&&c.length===1)out.push(c);return out;}
function cuInstall1(id,ch){
  const rec=cuMap(id)[ch];if(!rec||id!==CUR_FONT)return;
  const def=cuDef(ch,rec,id),set=[ch,...cuTwins(id,ch)];
  for(const c of set){GL[c]=def;if(c!==ch)CU.alias[c]=ch;}
  /* альтернаты базового знака (m.ss01, o.hi, zero.tnum …) повторяют нарисованную форму */
  for(const k of Object.keys(GL)){const o=GL[k]&&GL[k].opt;if(o&&o.alt&&o.base&&set.includes(o.base))GL[k]=Object.assign({},def,{opt:Object.assign({},o,{cu:1})});}
  if(cuInk(rec)){if(!CHARSET.includes(ch))CHARSET.push(ch);}
  else{const i=CHARSET.indexOf(ch);if(i>=0&&!(FONTS[id].CHARSET||[]).includes(ch))CHARSET.splice(i,1);}
  if(!GROUPS.some(g=>g[1].includes(ch))){let g=GROUPS.find(x=>x.cu);if(!g){g=[CU.GROUP,''];g.cu=true;GROUPS.push(g);}g[1]+=ch;}}
function cuApply(id){const m=CU.byFont[id];if(!m||id!==CUR_FONT)return;
  for(const ch of Object.keys(m)){if(!cuCharOk(ch)){delete m[ch];continue;}if(cuInk(m[ch]))cuInstall1(id,ch);}}
/* кернинг по классам: новый знак с «кернинг как X» входит в те же классы, что X, и измеряется вместе с ними (медиана класса + исключения) */
let CU_KC0=null;
function cuKernApply(id){if(typeof KC_L==='undefined'||typeof KC_R==='undefined')return;
  if(!CU_KC0)CU_KC0={L:Object.assign({},KC_L),R:Object.assign({},KC_R)};
  for(const k in CU_KC0.L)KC_L[k]=CU_KC0.L[k];for(const k in CU_KC0.R)KC_R[k]=CU_KC0.R[k];
  const m=CU.byFont[id];if(!m)return;
  for(const ch of Object.keys(m)){const r=m[ch],ref=r&&r.like;if(!ref||ref===ch||!cuInk(r))continue;
    for(const T of [KC_L,KC_R])for(const k in T)if(T[k].includes(ref)&&!T[k].includes(ch))T[k]+=ch;}}
const _useFont_cu=useFont;
useFont=function(id){_useFont_cu(id);CU.alias={};cuApply(id);cuKernApply(id);};
/* записать знак (программный путь: тесты, импорт) */
/* вернуть исходный знак (или убрать новый) */
/* ---------- границы и безопасность ---------- */
/* ширина/левый край: сдвинуть скелет к левому краю и подогнать ширину по чернилам */
function cuFit(rec,fid,p){const bb=cuBBox(rec,fid,p);if(!bb)return rec;
  const dx=-bb.x0;
  for(const st of rec.skel){if(st.dot){st.x+=dx;continue;}for(const n of st.nodes){n.x+=dx;if(n.a)n.a.x+=dx;if(n.b)n.b.x+=dx;}}
  rec.v=++CU.seq;rec.w=null;return rec;}
/* топология и чистота контура при заданных параметрах: 'частей/просветов' или 'x' */
function cuTopo(fid,rec,p){
  try{const q=safeP(p),cs=skShape(cuSkelOf(rec,q,fid),cuFont(fid,rec),q);if(!cs.length)return 'x';
    let o=0,h=0;for(const c of cs){for(const n of c.nodes)if(!isFinite(n.x)||!isFinite(n.y))return 'x';if(c.hole)h++;else o++;}
    if(typeof vfCrossSeverity==='function'&&typeof flatC==='function'&&vfCrossSeverity(cs.map(c=>flatC(c,8)))>18)return 'x';
    return o+'/'+h;}catch(e){return 'x';}}
/* знак устойчив, если число частей и просветов одинаково в Light, текущем весе и Black (как у встроенных знаков) */
function cuSafety(fid,rec,p){
  if(!cuInk(rec))return {ok:true,sig:[]};
  const sig=[cuTopo(fid,rec,p)];
  for(const wn of ['Light','Black']){try{sig.push(cuTopo(fid,rec,famParams(p,wn)));}catch(e){sig.push('x');}}
  return {ok:sig[0]!=='x'&&sig.every(s=>s===sig[0]),sig};}
