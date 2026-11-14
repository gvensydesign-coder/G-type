/* ---------- «Тяга» (tyaga): параметры, перевод контуров в формат хоста, регистрация (по образцу nit/tail.js, stsepka) ----------
   Ключи ползунков с префиксом t…: tsw «Толщина» (% высоты прописных), trd «Скругление», tbs «Базовая ширина», tap «Апрош», tst «Растяжка (по умолчанию)»,
   tlg «Межстрочный» (виден только при блоке). Безопасные пределы взяты из прототипа (qa.py: все крайние сочетания дают ту же топологию).
   Знак = f(ширина): растягиваются только прямые горизонтали; k — множитель ширины (свободные до ×6, диагональные до ×2, остальные не тянутся).
   Шрифт: «~» после буквы = растянутая форма .s1…s5 (GSUB calt/liga/clig), «~» — знак нулевой ширины. */
const TY_DEF={tsw:18.75,trd:100,tbs:100,tap:13.5,tlg:13.5,tst:1};
const TY_LIM={tsw:[12,23],trd:[0,100],tbs:[80,130],tap:[4,30],tlg:[6,40],tst:[1,6]};
const TY_KEYS=['tsw','trd','tbs','tap','tlg','tst'];
const TY_CAP=700,TY_ASC=950,TY_DESC=260;
const tyNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const tyClamp=(k,v)=>Math.min(TY_LIM[k][1],Math.max(TY_LIM[k][0],tyNum(v,TY_DEF[k])));
/* параметры продукта -> параметры генератора (доли высоты прописных) */
const tyP=p=>TYG.clampP({stroke:tyClamp('tsw',p&&p.tsw)/100,round:tyClamp('trd',p&&p.trd)/100,base:tyClamp('tbs',p&&p.tbs)/100,apr:tyClamp('tap',p&&p.tap)/100,lead:tyClamp('tlg',p&&p.tlg)/100,stretch:tyClamp('tst',p&&p.tst)});
const tyStem=tsw=>Math.round(tyClamp('tsw',tsw)*TY_CAP)/100;
/* сегменты (отрезки и дуги эллипса) -> узлы хоста: дуга режется по 90° на кубики */
function tyNodes(seg,dx){
  const pcs=[];
  for(const s of seg){
    if(s.t==='L'){pcs.push({p:[s.x0,s.y0]});continue;}
    const n=Math.max(1,Math.ceil(Math.abs(s.a1-s.a0)/90-1e-9));
    for(let i=0;i<n;i++){
      const a=(s.a0+(s.a1-s.a0)*i/n)*Math.PI/180,b=(s.a0+(s.a1-s.a0)*(i+1)/n)*Math.PI/180,h=4/3*Math.tan((b-a)/4);
      const P0=i===0?[s.x0,s.y0]:[s.cx+s.rx*Math.cos(a),s.cy+s.ry*Math.sin(a)];
      pcs.push({p:P0,c1:[P0[0]-h*s.rx*Math.sin(a),P0[1]+h*s.ry*Math.cos(a)],c2:[s.cx+s.rx*Math.cos(b)+h*s.rx*Math.sin(b),s.cy+s.ry*Math.sin(b)-h*s.ry*Math.cos(b)]});}
  }
  const N=pcs.length,nodes=pcs.map(q=>({x:q.p[0]+dx,y:q.p[1],a:null,b:q.c1?{x:q.c1[0]+dx,y:q.c1[1]}:null}));
  for(let i=0;i<N;i++){const q=pcs[i];if(q.c2){const j=(i+1)%N;nodes[j].a={x:q.c2[0]+dx,y:q.c2[1]};}}
  return nodes;}
const tyCont=(cs,dx)=>cs.map(c=>mkc(tyNodes(c,dx),false));
/* знак при параметрах p и множителе k: контуры хоста (без объединения: его делает finalGlyph) */
const tyCache=new Map();
function tyGet(ch,p,k){
  const P=tyP(p),key=TYG.canon(ch);const g=TYG.glyph(ch,P,k);if(!g)return null;
  const ck=key+'|'+[P.stroke,P.round,P.base,P.apr].join('|')+'|'+(k||1);let r=tyCache.get(ck);
  if(!r){r={ch:key,adv:g.adv,sbL:g.sbL,W:g.W,k:g.k,cls:g.cls,cs:null,g};tyCache.set(ck,r);if(tyCache.size>3000){let n=0;for(const q of tyCache.keys()){tyCache.delete(q);if(++n>1000)break;}}}
  if(!r.cs)r.cs=tyCont(g.contours,g.sbL);
  return r;}
const tyCls=ch=>TYG.CLASS(ch);
/* множитель обычного знака: «Растяжка» (tst), не выше предела класса */
const tyK0=(ch,p)=>{const c=tyCls(ch);return c&&c!=='n'?Math.min(TYG.KMAX[c],tyClamp('tst',p&&p.tst)):1;};
/* ступени растяжки шрифта: .sN = шаг лестницы (1.5 2 3 4 6) × tst, не выше предела класса; при tst=1 — ровно прототип */
const tyStepK=(ch,n,p)=>{const c=tyCls(ch),st=TYG.STEPS[c];if(!st||n<1||n>st.length)return null;return Math.min(TYG.KMAX[c],st[n-1]*tyClamp('tst',p&&p.tst));};
/* ---------- набор знаков ---------- */
const TY_CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',TY_CYL='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',TY_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',TY_LATL='abcdefghijklmnopqrstuvwxyz',TY_DIG='0123456789';
const TY_SYM='.,:;!?«»„“”‘’…"\'-–—−()/&№+=%@#*©₽°•·\\|';
/* W88: extended set — Ukrainian Є Ї Ґ (І Ї), Belarusian Ў, Serbian/Macedonian Ђ Ј Љ Њ Ћ Џ Ѕ, Kazakh Ә Ғ Қ Ң Ө Ұ Ү Һ І, Latin Extended-A + Latin-1 capitals (lower case = same glyph) */
const tyLow=s=>[...s].map(c=>c.toLowerCase()).filter(c=>Array.from(c).length===1&&c!==c.toUpperCase());
const TY_XCY=[...new Set([...TYG.extCy,'Ѕ','Ј','Ү','І'])].join(''),TY_XCYL=tyLow(TY_XCY).join(''),TY_XLAT=[...new Set(TYG.extLat)].join(''),TY_XLATL=tyLow(TY_XLAT).join('');
const TY_ALL=[...new Set([...TY_CY,...TY_CYL,...TY_LAT,...TY_LATL,...TY_DIG,...TY_SYM,...TY_XCY,...TY_XCYL,...TY_XLAT,...TY_XLATL])];
const tyName=ch=>'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
const tyAltName=(canon,n)=>tyName(canon)+'.s'+n;
/* «~» «Тяги» — служебный знак без контура (проверки пустых знаков пропускают его, как пробелы) */
globalThis.isTyTilde=ch=>ch==='~'&&typeof CUR_FONT==='string'&&CUR_FONT==='tyaga';
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const TY_ROWS=[['tsw','Толщина, %',TY_LIM.tsw[0],TY_LIM.tsw[1],0.25,'Линия'],['trd','Скругление, %',TY_LIM.trd[0],TY_LIM.trd[1],5,'Линия'],
  ['tbs','Базовая ширина, %',TY_LIM.tbs[0],TY_LIM.tbs[1],1,'Пропорции'],['tap','Апрош, %',TY_LIM.tap[0],TY_LIM.tap[1],0.5,'Пропорции'],
  ['tst','Растяжка, ×',TY_LIM.tst[0],TY_LIM.tst[1],0.05,'Растяжка'],['tlg','Межстрочный (блок), %',TY_LIM.tlg[0],TY_LIM.tlg[1],0.5,'Растяжка']];
if(!PARAMS.some(r=>r[0]==='tsw')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...TY_ROWS);}
const F={id:'tyaga',name:'Тяга',family:'Tyaga',tag:'Монолиния · растягиваемые капители',S0:131,GL:{},charset:'extended',
  desc:'Геометрический минималистичный монолинейный шрифт из одних заглавных букв (строчные дают те же буквы). Растягиваются только прямые горизонтали: стойки, скругления и чаши остаются прежними. Знак «~» после буквы растягивает её в шрифте — в Figma и Word тоже; в платформе есть блок с выключкой по ширине. Для плакатов, афиш и заголовков.',
  sample:'Тяга · Stretch'};
F.sampleText='ПЛЕ\nСНЕ\nВЫЙ\nСЫР';
const tyEntry=ch=>({shape:g=>{const r=tyGet(ch,g.p,tyK0(ch,g.p));return r?r.cs:[];},w:p=>{const r=tyGet(ch,p,tyK0(ch,p));return r?r.adv:0;},k:'cap',opt:{fixed:true}});
const byCanon=new Map();
for(const ch of TY_ALL){if(!TYG.has(ch))continue;const c=TYG.canon(ch);let e=byCanon.get(c);if(!e){e=tyEntry(c);byCanon.set(c,e);}F.GL[ch]=e;}
F.GL['~']={shape:()=>[],w:()=>0,k:'cap',opt:{}};
F.GL[' ']={shape:()=>[],w:p=>tySpace(p),k:'cap',opt:{}};
for(const c of [' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '?(p=>tySpace(p)):(p=>thinSpace(p)),k:'cap',opt:{}};
function tySpace(p){return Math.round((TYG.SPACE+tyClamp('tap',p&&p.tap)/100)*TY_CAP);}
/* растянутые формы: GL-записи без кода (uniXXXX.sN), основа — канонический знак; в CHARSET не входят */
const TY_ALTS=[];/* {name,canon,n,chars:[…]} */
for(const [c,e] of byCanon){const cl=tyCls(c),st=TYG.STEPS[cl];if(!st||!st.length)continue;
  const chars=Object.keys(F.GL).filter(x=>F.GL[x]===e);
  for(let n=1;n<=st.length;n++){const nm=tyAltName(c,n);
    F.GL[nm]={shape:g=>{const r=tyGet(c,g.p,tyStepK(c,n,g.p));return r?r.cs:[];},w:p=>{const r=tyGet(c,p,tyStepK(c,n,p));return r?r.adv:0;},k:'cap',
      opt:{fixed:true,alt:true,base:c,feat:'tyaga',own:true,kernAs:true,tyAlt:n}};
    TY_ALTS.push({name:nm,canon:c,n,chars});}}
const TY_G=s=>[...s].filter(c=>F.GL[c]).join('');
F.GROUPS=[['Кириллица · прописные',TY_G(TY_CY)],['Кириллица · строчные',TY_G(TY_CYL)],['Кириллица · расширенная',TY_G(TY_XCY+TY_XCYL)],['Латиница · прописные',TY_G(TY_LAT)],['Латиница · строчные',TY_G(TY_LATL)],['Латиница · расширенная',TY_G(TY_XLAT+TY_XLATL)],['Цифры',TY_DIG],['Знаки',TY_G(TY_SYM)+'~']];
F.CHARSET=TY_ALL.concat(['~',' ',' ',' ',' ']).filter(c=>F.GL[c]);
F._basicDone=true;/* набор уже базовый; «~» — служебный знак нулевой ширины, который общая обрезка вырезала бы */
F.raw=(ch,p)=>tyGet(ch,p,tyK0(ch,p));
const K0={wdth:100,capH:TY_CAP,xh:TY_CAP,asc:TY_ASC,desc:TY_DESC,stem:131.25,hair:131.25,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:Math.round((TYG.SPACE+TY_DEF.tap/100)*TY_CAP),
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,tsw:TY_DEF.tsw,trd:TY_DEF.trd,tbs:TY_DEF.tbs,tap:TY_DEF.tap,tlg:TY_DEF.tlg,tst:TY_DEF.tst};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','stem','sb','track','space'];
F.params={};for(const k of HID)F.params[k]=null;
F.pen=null;
/* пресеты: «Вид» (линия и скругление) и «Растяжка» (шаг по умолчанию) */
F.methods=[
  ['Характер','Линия и скругление: от острой плакатной монолинии до мягкой.',[['Образец',{tsw:18.75,trd:100,tbs:100,tap:13.5}],['Острая',{tsw:18.75,trd:0,tbs:100,tap:13.5}],['Лёгкая',{tsw:14,trd:100,tbs:100,tap:13.5}],['Плотная',{tsw:22,trd:60,tbs:100,tap:10}]]],
  ['Толщина','Толщина линии, % высоты прописных.',[['Лёгкая',{tsw:14}],['Образец',{tsw:18.75}],['Плотная',{tsw:21}],['Жирная',{tsw:23}]]],
  ['Растяжка','Во сколько раз растянута каждая буква сама по себе. Блок и «~» растягивают по-своему.',[['Нет',{tst:1}],['×1.5',{tst:1.5}],['×2',{tst:2}],['×3',{tst:3}]]]];
F.coverNarrow=false;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=100;
const TY_ALLCH=[...TY_CY,...TY_CYL,...TY_LAT,...TY_LATL,...TY_DIG,...TY_XCY,...TY_XCYL,...TY_XLAT,...TY_XLATL].join('');
F.proof={stem:p=>tyStem(p.tsw),noBar:true,stemSet:' ',hang:true,asc:TY_ALLCH,desc:TY_ALLCH,descX:0,holeK:0.004};
function tyLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=Math.min(hi,Math.max(lo,+v));};
  for(const k of TY_KEYS)cl(k,TY_LIM[k][0],TY_LIM[k][1],TY_DEF[k]);
  q.tsw=Math.round(q.tsw*100)/100;q.stem=tyStem(q.tsw);q.hair=q.stem;L.stem=[q.stem,q.stem];L.hair=[q.stem,q.stem];
  q.space=Math.round((TYG.SPACE+q.tap/100)*TY_CAP);L.space=[q.space,q.space];
  cl('capH',TY_CAP,TY_CAP,TY_CAP);cl('wdth',100,100,100);cl('xh',TY_CAP,TY_CAP,TY_CAP);cl('asc',TY_ASC,TY_ASC,TY_ASC);cl('desc',TY_DESC,TY_DESC,TY_DESC);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',0,0,0);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='tyaga')return _pl(p,font);return tyLim(p);};
/* имя веса по толщине: шкала подобрана так, чтобы значение по умолчанию (stem/xh = 0.1875) читалось Regular (0.315·0.5952) */
WSCALE.tyaga=0.5952;
/* семейство Light/Regular/Bold/Black: Regular = толщина пользователя, Light = ×0.75 (не тоньше 12 %), Bold = на 55 % пути к пределу 23 %, Black = предел */
const TY_FAMT=(u,wn)=>wn==='Light'?Math.max(TY_LIM.tsw[0],u*0.75):wn==='Bold'?u+(TY_LIM.tsw[1]-u)*0.55:wn==='Black'?TY_LIM.tsw[1]:u;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='tyaga'){if(['Light','Regular','Bold','Black'].includes(wn))o.tsw=Math.min(TY_LIM.tsw[1],Math.max(TY_LIM.tsw[0],Math.round(TY_FAMT(tyClamp('tsw',p.tsw),wn)*4)/4));return paramLimits(o,'tyaga').q;}
  return o;};
/* ---- кернинг: собственный (таблица прототипа, доли высоты), классы по каноническому знаку, строчные и латинские близнецы в том же классе ---- */
const TY_MEM=new Map();for(const ch of Object.keys(F.GL)){if(Array.from(ch).length!==1||!TYG.has(ch))continue;const c=TYG.canon(ch);(TY_MEM.get(c)||TY_MEM.set(c,[]).get(c)).push(ch);}
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='tyaga')return _ckt(st,prof,isLow,fontId);
  const Ls=new Set(),Rs=new Set(),vals={};
  for(const g of TYG.KERN){for(const l of g.l)Ls.add(TYG.canon(l));for(const r of g.r)Rs.add(TYG.canon(r));}
  for(const g of TYG.KERN)for(const l of g.l)for(const r of g.r){const a=TYG.canon(l),b=TYG.canon(r);vals[a+'|'+b]=Math.round(g.v*TY_CAP);}
  const mem=c=>(TY_MEM.get(c)||[]).filter(ch=>prof(ch));
  /* safety at THESE parameters: every member and every stretched alternate keeps a nearest ink gap >= G0 (0.42 of the Апрош, 12…60 u) after kerning; the value of a pair is the tightest of its members */
  const apr=tyClamp('tap',st&&st.p&&st.p.tap)/100*TY_CAP,G0=Math.max(12,Math.min(60,Math.round(0.42*apr)));
  const pc=new Map(),altOf=new Map();for(const a of TY_ALTS){(altOf.get(a.canon)||altOf.set(a.canon,[]).get(a.canon)).push(a.name);}
  const pf=(key,get)=>{if(pc.has(key))return pc.get(key);let r=null;try{r=get();}catch(e){}pc.set(key,r);return r;};
  const profs=c=>{const o=[];for(const ch of mem(c)){const q=prof(ch);if(q)o.push(q);}
    for(const nm of (altOf.get(c)||[])){const q=pf(nm,()=>{const g=finalGlyph(nm,st,{});return g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;});if(q)o.push(q);}return o;};
  const PM=new Map();const pr=c=>PM.get(c)||(PM.set(c,profs(c)),PM.get(c));
  for(const key of Object.keys(vals)){let v=vals[key];if(v>=0)continue;const [a,b]=key.split('|');
    for(const pa of pr(a))for(const pb of pr(b)){const g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil(G0-g.min));}
    vals[key]=Math.min(0,Math.max(-150,v));}
  const t=Math.min(150,G0/0.4);
  return {L:[...Ls].map(c=>[c,mem(c)]).filter(x=>x[1].length),R:[...Rs].map(c=>[c,mem(c)]).filter(x=>x[1].length),vals,tU:t,tL:t,pairs:{}};};
KERN_TABLE.tyaga=[];
/* ---- GSUB: буква + «~»×n -> буква.sN (calt, liga, clig: Figma берёт calt, Word — liga/calt) ---- */
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='tyaga')return;
  const t=gidByCh['~'];if(t==null)return;const L=[];
  for(const a of TY_ALTS){const lig=gidByName[a.name];if(lig==null)continue;
    for(const ch of a.chars){const b=gidByCh[ch];if(b==null)continue;L.push({comps:[b,...new Array(a.n).fill(t)],lig});}}
  if(!L.length)return;
  looks.push({type:4,subs:[otoLigSubst(L)]});const li=looks.length-1;
  for(const tag of ['calt','clig','liga'])feats.push({tag,lookups:[li]});};
/* «~» — знак нулевой ширины (общий предел ширины знака в хосте — 40 u, здесь он обнуляется) */
const _fg=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fg.apply(this,arguments);if(g&&ch==='~'&&CUR_FONT==='tyaga')return Object.assign({},g,{adv:0,weff:0});return g;};
const TYS={eng:tyP,get:tyGet,alts:TY_ALTS,LIM:TY_LIM,DEF:TY_DEF,KEYS:TY_KEYS,K0:tyK0,stepK:tyStepK,name:tyName,altName:tyAltName,cont:tyCont,space:tySpace,stem:tyStem,rows:TY_ROWS};
FONTS.tyaga=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!TY_KEYS.includes(r[0])&&!['slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='tyaga'){const f=FONTS[id];f.params=f.params||{};for(const k of TY_KEYS)if(!(k in f.params))f.params[k]=null;}
for(const r of TY_ROWS)F.params[r[0]]=[r[1],r[2],r[3],r[4]];
F.params.tlg=null;/* «Межстрочный» виден только при блоке (ui_tyaga.js) */
if(typeof globalThis!=='undefined'){globalThis.TYG=TYG;globalThis.TYS=TYS;}
/* «~» «Тяги» — служебный знак без контура: проверки пустых знаков его пропускают, как пробелы */
}
