/* ===== регистрация шрифта «Пиксель» (Pixel Grid) ===== */
recipes1(PXE);recipes2(PXE,PXG);recipes3(PXE,PXG);const PX4=recipes4(PXE,PXG);recipes5(PXE,PXG,PX4.T);
const PXT=PX4.T;
const PXV=FONTS.volt;
const F={id:'pixel',name:'Пиксель',family:'Pixel Grid',tag:'Пиксельная сетка · акциденция',S0:80,GL:{},charset:'extended',
  desc:'Пиксельный шрифт на настоящей сетке: буквы строятся из клеток, а не из контуров. Разрешение (5–24 клеток на высоту прописной), насыщенность в пикселях и форма клетки — квадрат, точка, скруглённый квадрат, ромб — меняются свободно; штрихи, чаши и диагонали пересчитываются по правилам сетки. Есть вариант с пиксельными засечками и кисть для правки клеток.',
  sample:'Пиксель · Pixel 1234'};
F.sampleText='ПОИГРАЙ СО МНОЙ';
/* ---------- параметры ---------- */
const PX_RMIN=/*RMIN*/6,PX_RMAX=24;
const PXLIM=/*LIMITS*/{};
const PXP=['res','pw','ptr','pshape','pgap','pstag','pserif'];
if(!PARAMS.some(r=>r[0]==='res'))PARAMS.push(
  ['res','Разрешение, клеток на высоту',PX_RMIN,PX_RMAX,1,'Пиксели'],
  ['pw','Насыщенность, px',1,5,0.5,'Пиксели'],
  ['ptr','Просвет между буквами, px',0,4,1,'Пиксели'],
  ['pserif','Засечки',0,1,1,'Пиксели'],
  ['pshape','Форма пикселя',0,3,1,'Пиксельная сетка'],
  ['pgap','Зазор между пикселями, %',0,40,1,'Пиксельная сетка'],
  ['pstag','Сдвиг рядов',0,2,1,'Пиксельная сетка']);
const pxMaxPw=(res,serif)=>{const r=PXLIM[res];return r&&r[serif?1:0]>0?r[serif?1:0]:1;};
const pxSerifOk=res=>{const r=PXLIM[res];return !!r&&r[1]>0;};
const pxU=res=>Math.floor(700/res);
const pxShear=H=>CL(Math.round(H/3),3,6);
const pxRound2=v=>Math.round(v*2)/2;
function pxLim(p){
  const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('res',PX_RMIN,PX_RMAX,12);q.res=Math.round(q.res);
  cl('pserif',0,pxSerifOk(q.res)?1:0,0);q.pserif=q.pserif>0.5?1:0;
  cl('pw',1,pxMaxPw(q.res,q.pserif),1.5);q.pw=pxRound2(q.pw);
  cl('ptr',0,4,1);q.ptr=Math.round(q.ptr);
  cl('pshape',0,3,0);q.pshape=Math.round(q.pshape);
  cl('pgap',0,40,0);q.pgap=Math.round(q.pgap);
  cl('pstag',0,2,0);q.pstag=Math.round(q.pstag);
  const u=pxU(q.res),K=PXE.ctx(q.res,q.pw,q.pserif);
  q.pu=u;q.capH=q.res*u;q.xh=K.X*u;q.asc=K.A*u;q.desc=K.D*u;
  q.stem=K.sv*u;q.hair=K.sh*u;q.sb=0;q.track=q.ptr*u;q.space=Math.max(2,Math.round(K.X*0.5))*u;
  q.wdth=100;q.ov=0;q.slant=(+p.slant>0)?Math.round(Math.atan(1/pxShear(q.res))*1800/Math.PI)/10:0;
  q.opsp=0;q.icomp=0;q.tabular=0;q.mono=0;q.rough=0;q.optic=0;q.diag=1;q.round=1;q.kappa=0.5523;q.innerR=1;q.spur=0;
  for(const r of PARAMS){const k=r[0];if(!(k in L))L[k]=[q[k],q[k]];}
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='pixel')return _pl(p,font);return pxLim(p);};
/* вес семейства: ступени в пикселях; Bold не менее 1.25 x Regular там, где позволяет разрешение */
function pxFam(p,wn){
  const q=pxLim(p).q,r=q.res,mx=pxMaxPw(r,q.pserif);
  /* ровная лестница штриха (stem px): Light/Regular/Bold/Black; Bold >= 1.25 x Regular там, где позволяет разрешение */
  const a=r<=9?[1,1.5,2,2]:r===10?[1,1.5,2,2.5]:r<=15?[1.5,2,2.5,3]:r<=17?[1.5,2.5,3,3.5]:r<=19?[2,2.5,3.5,4]:[2,3,4,5];
  for(let i=0;i<4;i++)a[i]=Math.min(a[i],mx);
  const i=FAM_W.findIndex(w=>w[0]===wn);return a[i<0?1:i];}
WSCALE.pixel=0.58;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='pixel'){const pw=pxFam(p,wn==='@vf'?'Regular':wn),q=pxLim({...p,pw}).q;if(wn==='@vf'){const e=FAM_W.find(x=>x[0]==='@vf');q.pvfw=e?e[1]:400;}return q;}
  return o;};
/* ---------- ячейки ---------- */
const pxCtxC=new Map(),pxBaseC=new Map(),pxOutC=new Map();
function pxCtx(res,pw,serif){const k=res+'|'+pw+'|'+serif;let K=pxCtxC.get(k);if(!K){K=PXE.ctx(res,pw,serif);pxCtxC.set(k,K);}return K;}
const pxKey=(d,q)=>d.px.id+'|'+q.res+'|'+q.pw+'|'+q.pserif;
/* базовые ячейки знака в координатах рецепта: [[x,y,v]] */
function pxBase(d,q){const k=pxKey(d,q);let r=pxBaseC.get(k);
  if(!r){const K=pxCtx(q.res,q.pw,q.pserif);const B=d.px.build(K,q);r=B?B.cells():[];if(pxBaseC.size>6000)pxBaseC.clear();pxBaseC.set(k,r);}
  return r;}
/* клеточный наклон: ряд y сдвигается на floor(y/st); одиночные диагональные стыки достраиваются */
function pxShearCells(cells,st){
  const out=cells.map(c=>[c[0]+Math.floor(c[1]/st),c[1],c[2]]);
  const S=new Set(out.map(c=>c[0]+','+c[1]));const add=[];
  for(const [x,y] of out){if(S.has((x+1)+','+(y+1))&&!S.has((x+1)+','+y)&&!S.has(x+','+(y+1)))add.push([x,y+1,1]);
    if(S.has((x+1)+','+(y-1))&&!S.has((x+1)+','+y)&&!S.has(x+','+(y-1)))add.push([x+1,y,1]);}
  return out.concat(add);}
/* итог: контуры, продвижение; ed — {a:[[x,y]..],d:[[x,y]..]} (клетки рецепта, до наклона) */
function pxBuild(d,q,ed){
  const ek=ed?JSON.stringify(ed):'';
  const key=pxKey(d,q)+'|'+q.slant+'|'+q.ptr+'|'+q.pshape+'|'+q.pgap+'|'+q.pstag+'|'+ek+'|'+(d.px.pad?1:0);
  let r=pxOutC.get(key);if(r)return r;
  const u=q.pu;let cells=pxBase(d,q);
  if(ed&&(ed.a&&ed.a.length||ed.d&&ed.d.length)){
    const m=new Map(cells.map(c=>[c[0]+','+c[1],c]));
    for(const [x,y] of (ed.d||[]))m.delete(x+','+y);
    for(const [x,y] of (ed.a||[]))m.set(x+','+y,[x,y,1]);
    cells=[...m.values()];}
  {const K=pxCtx(q.res,q.pw,q.pserif);let dy=typeof d.px.dy==='function'?d.px.dy(K):(d.px.dy||0);
   if(d.px.center&&cells.length){let a=1e9,b=-1e9;for(const c of cells){if(c[1]<a)a=c[1];if(c[1]>b)b=b<c[1]?c[1]:b;}dy=Math.round(K.H/2-(a+b+1)/2);}
   if(dy)cells=cells.map(c=>[c[0],c[1]+dy,c[2]]);}
  if(q.slant>0)cells=pxShearCells(cells,pxShear(q.res));
  let x0=1e9,x1=-1e9;for(const c of cells){if(c[0]<x0)x0=c[0];if(c[0]>x1)x1=c[0];}
  if(!cells.length){x0=0;x1=-1;}
  let wpx=x1-x0+1,adv=wpx+q.ptr,sh=0;
  if(d.px.pad){const P=d.px.pad(q);if(P>adv){sh=Math.floor((P-adv)/2);adv=P;}}
  const gap=Math.round(u*q.pgap/100);
  const oc=cells.map(c=>[c[0]-x0+sh,c[1],c[2]]);
  const loops=cells.length?PXR.render(oc,u,q.pshape,gap,q.pstag):[];
  const cs=loops.map(l=>mkc(l.nodes,l.hole));
  r={cs,adv:adv*u,w:Math.max(wpx,0)*u,n:cells.length,x0,ox:x0-sh,cells:oc};
  if(pxOutC.size>4000)pxOutC.clear();pxOutC.set(key,r);return r;}
/* ---------- запись знаков ---------- */
const PXCH=[];
function pxAdd(name,spec,k,opt,px){
  const e={shape:g=>pxBuild(e,paramLimits(g.p,'pixel').q,null).cs,w:p=>pxBuild(e,paramLimits(p,'pixel').q,null).w||pxU(paramLimits(p,'pixel').q.res),k:k||'cap',opt:opt||{}};
  e.px=Object.assign({id:name},px||{});
  if(!e.px.build)e.px.build=K=>PX4.buildSpec(spec,K);
  return e;}
/* общие знаки: группы по общей записи T (латиница = кириллица) и по общим знакам Вольта */
const pxUF=new Map();const pxF=c=>{let r=c;while(pxUF.get(r)&&pxUF.get(r)!==r)r=pxUF.get(r);return r;};
const pxU2=(a,b)=>{a=pxF(a);b=pxF(b);if(a!==b)pxUF.set(b,a);};
for(const c of '·©')if(!PXV.CHARSET.includes(c))PXV.CHARSET.push(c);
for(const gr of PXV.GROUPS)if(gr[0]==='Знаки')for(const c of '·©')if(!gr[1].includes(c))gr[1]+=c;
const pxChars=PXV.CHARSET.filter(c=>!/[\s   ]/.test(c)&&PXT[c]);
{const byT=new Map(),byV=new Map();
 for(const c of pxChars){pxUF.set(c,c);}
 for(const c of pxChars){const t=PXT[c],v=PXV.GL[c];if(byT.has(t))pxU2(byT.get(t),c);else byT.set(t,c);if(v){if(byV.has(v))pxU2(byV.get(v),c);else byV.set(v,c);}}}
const pxGrp=new Map();
for(const c of pxChars){const r=pxF(c);let g=pxGrp.get(r);if(!g){g=[];pxGrp.set(r,g);}g.push(c);}
for(const [r,g] of pxGrp){
  g.sort((a,b)=>(a.charCodeAt(0)<128?0:1)-(b.charCodeAt(0)<128?0:1)||a.charCodeAt(0)-b.charCodeAt(0));
  const c0=g[0],spec=PXT[c0];
  const e=pxAdd(c0,spec,spec.k==='xh'?'xh':'cap',{});
  for(const c of g)F.GL[c]=e;}
F.CHARSET=PXV.CHARSET.filter(c=>F.GL[c]||/[\s   ]/.test(c));
F.GROUPS=PXV.GROUPS.map(gr=>[gr[0],gr[1]]);
/* пробелы */
for(const c of [' ',' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '||c===' '?(p=>p.space):(p=>pxThin(p)),k:'cap',opt:{}};
const pxThin=p=>{const q=paramLimits(p,'pixel').q;return Math.max(1,Math.floor(q.space/q.pu/2))*q.pu;};
/* ---------- альтернаты ---------- */
const PXA=altsLib(PXE,PX4,(h,serif)=>pxMaxPw(CL(h,5,PX_RMAX),serif));
const pxAlt=(name,base,feat,k,extra,px,spec)=>{const e=pxAdd(name,spec||null,k,Object.assign({alt:true,base,feat},extra||{}),px);F.GL[name]=e;return e;};
pxAlt('m.ss01','m','ss01','xh',null,null,{r:'m.ss01',k:'xh'});
pxAlt('zero.ss01','0','ss01','cap',null,null,{r:'0p',k:'cap'});
F.ss01Name='Арочная m и гладкий нуль';
for(const ch of PXA.caseList)if(F.GL[ch]&&PXT[ch])pxAlt(otoName(ch)+'.case',ch,'case',F.GL[ch].k,null,{center:true},PXT[ch]);
const PXDIG='0123456789';
const pxDigPad=q=>{let m=0;for(const c of PXDIG)m=Math.max(m,Math.round(pxBuild(F.GL[c],q,null).adv/q.pu));return m;};
for(const c of PXDIG){const n=otoName(c);
  pxAlt(n+'.tf',c,'tnum','cap',{tnum:true,grp:'tf'},{pad:pxDigPad},PXT[c]);
  for(const [kind,feat,grp] of [['osf','onum','osf'],['numr','sups','numr'],['dnom','frac','dnom'],['subs','subs','subs']]){
    const f=PXA[kind](c);pxAlt(n+'.'+kind,c,feat,'cap',{grp},{build:f.build,dy:f.dy,noEdit:true},null);}
  const f2=PXA.osf(c);pxAlt(n+'.tosf',c,'onum','cap',{grp:'tosf'},{build:f2.build,dy:f2.dy,pad:pxDigPad,noEdit:true},null);}
{const ups=F.CHARSET.filter(c=>c.length===1&&/\p{Lu}/u.test(c)&&F.GL[c]&&PXT[c]&&!/[ßǅ]/.test(c));
 for(const U of ups){const lo=U.toLowerCase();const hasLo=lo.length===1&&lo!==U&&F.CHARSET.includes(lo);
  const nm=otoName(hasLo?lo:U)+'.sc';if(F.GL[nm])continue;
  const ot=[['c2sc',U]];if(hasLo)ot.push(['smcp',lo]);
  pxAlt(nm,U,'smcp','cap',{grp:'sc',ot},{build:PXA.sc(U),noEdit:true},null);}}
OTO.IDS.push('pixel');OTO.CFG.pixel={hx:1.08,wx:1.05,dd:1,sbx:0,ssw:1,shw:1};F._otoDone=true;
/* ---------- сборка знака ---------- */
const _fgPx=finalGlyph;
const PXID={f:x=>x,active:false,inv:x=>x};
finalGlyph=function(ch,st,edits,opt){
  if(CUR_FONT!=='pixel')return _fgPx(ch,st,edits,opt);
  const d=GL[ch];if(!d||!d.px){
    if(d&&isSpaceCh(ch)){const q=paramLimits(st.p,'pixel').q;const a=ch===' '||ch===' '?q.space:pxThin(q);return {ch,w:a,weff:a,adv:a,cs:[],fx:PXID,fy:PXID,S:q.stem};}
    return _fgPx(ch,st,edits,opt);}
  let q=paramLimits(st.p,'pixel').q;if(opt&&opt.slant===false&&q.slant)q={...q,slant:0};
  const ed=edGet(edits,ch),pe=ed&&ed.px&&ed.px[q.res]||null;
  const pe2=d.opt&&d.opt.alt&&d.px.noEdit?null:pe;
  if(q.pvfw!=null){const v=PXVF.glyph(d,q,pe2);return {ch,w:v.w,weff:v.w,adv:v.adv,cs:v.cs,fx:PXID,fy:PXID,S:q.stem};}
  const b=pxBuild(d,q,pe2);
  return {ch,w:b.w,weff:b.w,adv:b.adv,cs:b.cs,fx:PXID,fy:PXID,S:q.stem};};
const _bbPx=buildBase;
buildBase=function(ch,p,ed){
  if(CUR_FONT!=='pixel')return _bbPx(ch,p,ed);
  const d=GL[ch];if(!d||!d.px)return _bbPx(ch,p,ed);
  const q=paramLimits(p,'pixel').q;const b=pxBuild(d,q,ed&&ed.px&&ed.px[q.res]||null);
  return {w:b.w,h:q.capH,S:q.stem,cs:b.cs};};
/* ---------- параметры по умолчанию ---------- */
const P0=Object.assign({},PXV.DEFAULTS.regular,{res:12,pw:2,ptr:1,pshape:0,pgap:0,pstag:0,pserif:0,slant:0});
F.DEFAULTS={regular:{...P0},italic:{...P0,slant:18.4}};
F.params={res:['Разрешение, клеток на высоту',PX_RMIN,PX_RMAX,1],pw:['Насыщенность, px',1,5,0.5],ptr:['Просвет между буквами, px',0,4,1],pserif:['Засечки',0,1,1],
  pshape:['Форма пикселя',0,3,1],pgap:['Зазор между пикселями, %',0,40,1],pstag:['Сдвиг рядов',0,2,1]};
for(const r of PARAMS)if(!(r[0] in F.params))F.params[r[0]]=null;
F.methods=[
  ['Разрешение','Сколько клеток укладывается в высоту прописной.',[['Грубое',{res:8}],['Среднее',{res:12}],['Тонкое',{res:16}],['Плотное',{res:24}]]],
  ['Вес','Толщина штриха в пикселях.',[['Светлый',{pw:1.5}],['Обычный',{pw:2}],['Жирный',{pw:3}],['Чёрный',{pw:4}]]],
  ['Форма пикселя','Как выглядит одна клетка.',[['Квадрат',{pshape:0,pgap:0}],['Точка',{pshape:1,pgap:8}],['Скруглённый',{pshape:2,pgap:0}],['Ромб',{pshape:3,pgap:6}]]],
  ['Засечки','Пиксельные засечки на стойках и верхних флажках.',[['Гротеск',{pserif:0}],['С засечками',{pserif:1}]]]];
/* ---------- интерфейс для редактора клеток (ui_pixel_p1.js) ---------- */
F.px={
  info:(ch,p,ed)=>{const q=paramLimits(p,'pixel').q,d=F.GL[ch];if(!d||!d.px)return null;const b=pxBuild(d,q,ed||null);
    return {q,u:q.pu,ox:b.ox,cells:b.cells,st:q.slant>0?pxShear(q.res):0,adv:b.adv,w:b.w};},
  baseHas:(ch,p,x,y)=>{const q=paramLimits(p,'pixel').q,d=F.GL[ch];return !!(d&&d.px&&pxBase(d,q).some(c=>c[0]===x&&c[1]===y));},
  toRecipe:(ch,p,cx,cy)=>{const i=F.px.info(ch,p,null);if(!i)return null;const sx=cx+pxBuild(F.GL[ch],i.q,null).ox;return [sx-(i.st?Math.floor(cy/i.st):0),cy];},
  remap:(ed,r0,r1)=>{const m=([x,y])=>[Math.floor((x+0.5)*r1/r0),Math.floor((y+0.5)*r1/r0)];
    const dd=l=>{const s=new Set(),o=[];for(const c of l||[]){const t=m(c),k=t[0]+','+t[1];if(!s.has(k)){s.add(k);o.push(t);}}return o;};
    const a=dd(ed&&ed.a),d=dd(ed&&ed.d).filter(c=>!a.some(e=>e[0]===c[0]&&e[1]===c[1]));return {a,d};},
  /* проверка засечек и островов (<= 2 клеток, не задуманных точек) для сверки */
  audit:(ch,p)=>{const q=paramLimits(p,'pixel').q;return PXT[ch]?PX4.serifAudit(ch,pxCtx(q.res,q.pw,q.pserif)):[];},
  maxPw:pxMaxPw,serifOk:pxSerifOk,
  fam:p=>{const q=pxLim(p).q;const o=FAM_W.map(w=>{const pw=pxFam(p,w[0]),K=PXE.ctx(q.res,pw,q.pserif);return {name:w[0],pw,sv:K.sv,sh:K.sh};});
    return {res:q.res,serif:q.pserif,max:pxMaxPw(q.res,q.pserif),rows:o,boldK:o[2].pw/o[1].pw,collapsed:o.some((r,i)=>i>0&&r.pw<=o[i-1].pw)};},
  RMIN:PX_RMIN,RMAX:PX_RMAX};
F.sym=false;F.wK=0;F.nodeBudget=0;
/* сверка: поля задаются клеткой (слева 0, справа «Просвет»), стебли — целое число клеток, растровые ступеньки — это и есть шрифт */
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IHНПL',stemFy:[0.3,0.5],hang:true,holeK:0.02};
F.italicAngle=p=>-Math.round((+p.slant||0)*1.135*10)/10;/* FIX-ENGINE: видимый наклон ступеней сетки 15.9° при параметре 14 */
F.spaceNote='Пробел кратен клетке.';
/* топологический эталон для проверок: форма, зазор и сдвиг клетки не меняют число частей и дыр */
F.topoP=p=>Object.assign({},p,{pshape:0,pgap:0,pstag:0});
F.topoPX=p=>pxU(paramLimits(p,'pixel').q.res)/8;
FONTS.pixel=F;
KERN_TABLE.pixel=(KERN_TABLE.volt||[]).slice();
/* кернинг кратен клетке: сжатие округляется к нулю, защитные добавки вверх */
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  /* кернинг считается по сплошной сетке: форма, зазор и сдвиг клетки не должны менять посадку */
  const px=(fontId||CUR_FONT)==='pixel';let st2=st,prof2=prof;
  if(px){st2=Object.assign({},st,{p:F.topoP(st.p)});const pc={};
    prof2=ch=>{if(pc[ch]!==undefined)return pc[ch];const d=GL[ch];if(!d||!d.px)return pc[ch]=prof(ch);const g=finalGlyph(ch,st2,{},{});return pc[ch]=g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;};}
  const o=_ckt(st2,prof2,isLow,fontId);
  if((fontId||CUR_FONT)!=='pixel'||!o)return o;
  const u=paramLimits(st.p,'pixel').q.pu;
  const sn=v=>v<0?-Math.floor(-v/u)*u:Math.ceil(v/u)*u;
  for(const k of Object.keys(o.vals)){const v=sn(o.vals[k]);if(v)o.vals[k]=v;else delete o.vals[k];}
  for(const k of Object.keys(o.pairs)){const v=sn(o.pairs[k]);if(v)o.pairs[k]=v;else delete o.pairs[k];}
  return o;};
for(const id in FONTS)if(id!=='pixel'){const f=FONTS[id];f.params=f.params||{};for(const k of PXP)if(!(k in f.params))f.params[k]=null;}
