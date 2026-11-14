/* ---------- «Кортес» (kortes): параметры, перевод контуров в формат хоста, регистрация, GSUB/GPOS, правила росчерков (по образцу tyaga/tail.js) ----------
   Ключи ползунков: kwt «Насыщенность» (толщина стойки, ед. на 1000), kct «Контраст», ksr «Острота засечек», ksw «Росчерки» (длина хвоста R и Я),
   kwd «Ширина» (%), kap «Апрош» (ед. на пару). Безопасные пределы получены прогоном 32 наборов (stress_kortes.js): топология как при значениях по умолчанию, ни одной крошки.
   Знак = ops прототипа (painter order: add / subtract), собирается поэтапным csgUnion хоста; ломаные -> кривые (csgFit); тяжёлые знаки пера — растровым путём хоста.
   Росчерки: ОДНА таблица правил KTR используется и для GSUB (calt = ss01), и для образца в приложении (KTS.pre) — расхождения невозможны. */
const KT_DEF={kwt:137,kct:45,ksr:50,ksw:60,kwd:100,kap:8};
const KT_LIM={kwt:[118,158],kct:[20,70],ksr:[25,75],ksw:[30,75],kwd:[92,112],kap:[-20,60]};
const KT_KEYS=['kwt','kct','ksr','ksw','kwd','kap'];
const KT_CAP=700,KT_ASC=960,KT_DESC=300;
const ktNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const ktClamp=(k,v)=>Math.min(KT_LIM[k][1],Math.max(KT_LIM[k][0],ktNum(v,KT_DEF[k])));
/* параметры продукта -> параметры генератора */
const ktP=p=>({weight:ktClamp('kwt',p&&p.kwt),contrast:ktClamp('kct',p&&p.kct),sharp:ktClamp('ksr',p&&p.ksr),swash:ktClamp('ksw',p&&p.ksw),width:ktClamp('kwd',p&&p.kwd)/100,apros:ktClamp('kap',p&&p.kap)});
const ktPK=P=>[P.weight,P.contrast,P.sharp,P.swash,P.width,P.apros].join('|');
const ktHair=P=>P.weight*(0.62-0.0055*P.contrast);
/* микроступеньки: прямой отрезок короче tol между двумя прямыми стыками стягивается в один узел (середина) */
function ktTiny(n,tol){n=n.slice();
  for(let guard=0;guard<40&&n.length>3;guard++){let hit=-1;
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if(a.b||b.a)continue;if(Math.hypot(a.x-b.x,a.y-b.y)<tol){hit=i;break;}}
    if(hit<0)break;const a=n[hit],j=(hit+1)%n.length,b=n[j];
    const m={x:Math.round((a.x+b.x)*5)/10,y:Math.round((a.y+b.y)*5)/10,a:a.a,b:b.b};
    n[hit]=m;n.splice(j,1);}
  return n;}
/* ops (painter order) -> контуры хоста. Подряд идущие группы: add, sub, add, sub, add... — по две группы за один csgUnion (sub + post). Знаки пера (много ops) — растр хоста */
function ktBool(ops){
  const mk=(o,op)=>{const c=mkc(o[1].map(q=>({x:q[0],y:q[1],a:null,b:null})),false);if(op)c.op=op;return c;};
  const runs=[];for(const o of ops){const l=runs[runs.length-1];if(l&&l.m===o[0])l.o.push(o);else runs.push({m:o[0],o:[o]});}
  const ras=ops.length>60;let cur=null;
  for(let i=0;i<runs.length;){
    const all=[...(cur||[])];
    if(runs[i].m===1){all.push(...runs[i].o.map(o=>mk(o)));i++;}
    if(i<runs.length&&runs[i].m===0){all.push(...runs[i].o.map(o=>mk(o,'sub')));i++;}
    if(i<runs.length&&runs[i].m===1){all.push(...runs[i].o.map(o=>mk(o,'post')));i++;}
    cur=ras?csgUnionRaster(all):csgUnion(all);}
  if(!cur)return [];
  if(ras)cur=cur.map(c=>({hole:c.hole,nodes:ktTiny(c.nodes,6)}));
  if(!ras){const o=[];for(const c of cur){const n=csgFit(c.nodes.map(q=>[q.x,q.y]),0,0);if(n)o.push({hole:c.hole,nodes:ktTiny(n,6)});}cur=o;}
  /* крошки: контур площадью < 350 ед.^2 (0.035 S^2 при S = 100) — как в фильтре прототипа */
  const ar=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
  return cur.filter(c=>ar(c)>=350);}
const ktCache=new Map(),ktGen=new Map();
function ktGlyph(key,P){const gk=key+'|'+ktPK(P);let g=ktGen.get(gk);if(g===undefined){g=Kortes.glyph(key,P)||null;ktGen.set(gk,g);if(ktGen.size>1200){let n=0;for(const q of ktGen.keys()){ktGen.delete(q);if(++n>400)break;}}}return g;}
function ktGet(key,p,which){
  const P=ktP(p);const ck=key+'|'+(which||'')+'|'+ktPK(P);let r=ktCache.get(ck);
  if(r===undefined){const g=ktGlyph(key,P),s=g&&(which?g.alts[which]:g);
    r=s?{key,adv:s.adv,cs:ktBool(s.ops)}:null;ktCache.set(ck,r);
    if(ktCache.size>3000){let n=0;for(const q of ktCache.keys()){ktCache.delete(q);if(++n>1000)break;}}}
  return r;}
const ktKey=ch=>{const u=ch.length===1&&ch.toUpperCase().length===1?ch.toUpperCase():ch;return Kortes.keyOf(u);};
/* ---------- набор знаков ---------- */
const KT_CAPS=Kortes.charset();/* заглавные, цифры, знаки */
const KT_CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',KT_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',KT_DIG='0123456789';
const KT_SYM=[...Kortes.charset()].filter(c=>!/[\p{L}\d]/u.test(c)).join('');
const KT_LOWER=[...KT_CY,...KT_LAT].map(c=>c.toLowerCase()).filter((c,i,a)=>a.indexOf(c)===i);
const ktLo=ch=>{const l=ch.toLowerCase();return l.length===1&&l.toUpperCase()===ch?l:'';};
const KT_XCY=[...Kortes.EXT_CY],KT_XCYL=KT_XCY.map(ktLo).filter(Boolean),KT_XLAT=[...Kortes.EXT_LAT],KT_XLATL=KT_XLAT.map(ktLo).filter(Boolean);
const KT_ALL=[...new Set([...KT_CY,...KT_CY.toLowerCase(),...KT_LAT,...KT_LAT.toLowerCase(),...KT_DIG,...KT_SYM,...KT_XCY,...KT_XCYL,...KT_XLAT,...KT_XLATL])];
const ktName=ch=>'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
const ktAltName=(key,which)=>ktName(key)+'.'+which;
/* ---------- единая таблица правил росчерков (GSUB calt = ss01 и образец) ---------- */
const KTR={
  round:['O','C','G','Э'],      /* ключи знаков: кириллические О С — те же знаки, что латинские O C */
  Q:['Q'],
  /* R: правый хвост, если следующий знак круглый (.sw) или Q (.swq, короткий) */
  R:{base:'R',ahead:[['round','sw'],['Q','swq']]},
  /* Я — зеркало R: левый хвост (.sw) после круглой буквы, короткий (.swq) после Q (W88: хвост Q не задевается); не после Q; не если эту же круглую букву уже подпирает хвост R */
  YA:{base:'Я',after:[['round','sw'],['Q','swq']],unlessBackTail:'R'}};
/* применение к массиву ключей: массив имён вариантов (или null) по позициям */
function ktApplyKeys(keys){
  const out=keys.map(()=>null),R=KTR.R,Y=KTR.YA;
  for(let i=0;i<keys.length;i++){if(keys[i]!==R.base)continue;const nx=keys[i+1];if(nx==null)continue;
    for(const [set,alt] of R.ahead){if(KTR[set].includes(nx)){out[i]=alt;break;}}}
  for(let i=0;i<keys.length;i++){if(keys[i]!==Y.base||i<1)continue;const pv=keys[i-1];
    for(const [set,alt] of Y.after){if(!KTR[set].includes(pv))continue;
      if(i>=2&&keys[i-2]===Y.unlessBackTail&&out[i-2])break;
      out[i]=alt;break;}}
  return out;}
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const KT_ROWS=[['kwt','Насыщенность, ед.',KT_LIM.kwt[0],KT_LIM.kwt[1],1,'Линия'],['kct','Контраст, %',KT_LIM.kct[0],KT_LIM.kct[1],1,'Линия'],
  ['ksr','Острота засечек, %',KT_LIM.ksr[0],KT_LIM.ksr[1],1,'Засечки'],['ksw','Росчерки R и Я, %',KT_LIM.ksw[0],KT_LIM.ksw[1],1,'Росчерки'],
  ['kwd','Ширина, %',KT_LIM.kwd[0],KT_LIM.kwd[1],1,'Пропорции'],['kap','Апрош, ед.',KT_LIM.kap[0],KT_LIM.kap[1],1,'Пропорции']];
if(!PARAMS.some(r=>r[0]==='kwt')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...KT_ROWS);}
const F={id:'kortes',name:'Кортес',family:'Kortes',tag:'Антиква · клиновидные засечки и росчерки',S0:137,GL:{},charset:'extended',
  desc:'Тяжёлая акцидентная антиква из одних заглавных букв (строчные дают те же буквы): клиновидные расходящиеся засечки, линзовидные просветы, острые концы. Буква R, если за ней идёт круглая, выпускает длинный росчерк под соседа, а Я — зеркальный росчерк влево после круглой буквы; работает в Figma и Word (calt, ss01). Для афиш, обложек и заголовков.',
  sample:'Кортес · Kortes',ss01Name:'Росчерки R и Я',ss02Name:'Верхние знаки'};
F.sampleText='ROMARTA\nКОРТЕС\nЗОЯ ВСЯ';
const ktEntry=(key,which)=>({shape:g=>{const r=ktGet(key,g.p,which);return r?r.cs:[];},w:p=>{const r=ktGet(key,p,which);return r?r.adv:0;},k:'cap',
  opt:which?{fixed:true,alt:true,base:key,feat:'kortes',own:true,kernAs:true,ktAlt:which}:{fixed:true}});
const byKey=new Map();
for(const ch of KT_ALL){const key=ktKey(ch);if(!(Kortes.PUNCT[key]||Kortes.LETTERS[key]))continue;let e=byKey.get(key);if(!e){e=ktEntry(key);byKey.set(key,e);}F.GL[ch]=e;}
const KT_SPC=['\u0020','\u00a0','\u2009','\u202f'];
for(const sp of KT_SPC)F.GL[sp]={shape:()=>[],skel:()=>[],w:(sp==='\u2009'||sp==='\u202f')?(p=>thinSpace(p)):(p=>ktSpace(p)),k:'cap',opt:{}};

function ktSpace(p){return Kortes.spaceW(ktP(p));}
/* варианты: .sw / .swq (R, Я), .sup (все буквы и цифры); основа — ключ знака; в CHARSET не входят */
const KT_ALTS=[];/* {name,key,which,chars:[…]} */
{const probe=Kortes.glyph;const P0=ktP({});
 for(const [key,e] of byKey){const g=ktGlyph(key,P0);if(!g)continue;const chars=Object.keys(F.GL).filter(x=>F.GL[x]===e);
  for(const which of ['sw','swq','sup']){if(!g.alts[which])continue;const nm=ktAltName(key,which);F.GL[nm]=ktEntry(key,which);KT_ALTS.push({name:nm,key,which,chars});}}}
const KT_G=s=>[...s].filter(c=>F.GL[c]).join('');
F.GROUPS=[['Кириллица · прописные',KT_G(KT_CY)],['Кириллица · строчные',KT_G(KT_CY.toLowerCase())],['Латиница · прописные',KT_G(KT_LAT)],['Латиница · строчные',KT_G(KT_LAT.toLowerCase())],['Кириллица · расширенная',KT_G(KT_XCY.join('')+KT_XCYL.join(''))],['Латиница · расширенная',KT_G(KT_XLAT.join('')+KT_XLATL.join(''))],['Цифры',KT_DIG],['Знаки',KT_G(KT_SYM)]];
F.CHARSET=KT_ALL.concat(KT_SPC).filter(c=>F.GL[c]);
F._basicDone=true;
F.raw=(ch,p)=>ktGet(ktKey(ch),p);
const K0={wdth:100,capH:KT_CAP,xh:KT_CAP,asc:KT_ASC,desc:KT_DESC,stem:KT_DEF.kwt,hair:Math.round(ktHair(ktP({}))*10)/10,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:Kortes.spaceW(ktP({})),
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,kwt:KT_DEF.kwt,kct:KT_DEF.kct,ksr:KT_DEF.ksr,ksw:KT_DEF.ksw,kwd:KT_DEF.kwd,kap:KT_DEF.kap};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','stem','sb','track','space'];
F.params={};for(const k of HID)F.params[k]=null;
F.pen=null;
F.methods=[
  ['Характер','Контраст и острота засечек: от мягкой тяжёлой антиквы до резкой плакатной.',[['Образец',{kct:45,ksr:50}],['Резкий',{kct:62,ksr:70}],['Мягкий',{kct:28,ksr:30}],['Плакатный',{kwt:150,kct:35,ksr:55}]]],
  ['Насыщенность','Толщина стоек, единицы на 1000.',[['Лёгкий',{kwt:122}],['Образец',{kwt:137}],['Плотный',{kwt:148}],['Жирный',{kwt:158}]]],
  ['Росчерки','Длина хвоста у R и Я в паре с круглой буквой.',[['Короткие',{ksw:35}],['Образец',{ksw:60}],['Длинные',{ksw:75}]]]];
F.coverNarrow=false;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=100;
const KT_ALLCH=[...KT_CY,...KT_CY.toLowerCase(),...KT_LAT,...KT_LAT.toLowerCase(),...KT_DIG,...KT_XCY,...KT_XCYL,...KT_XLAT,...KT_XLATL].join('');
F.proof={stem:p=>ktClamp('kwt',p.kwt),noBar:true,stemSet:' ',hang:true,asc:KT_ALLCH,desc:KT_ALLCH,descX:0,holeK:0.004};
function ktLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=Math.min(hi,Math.max(lo,+v));};
  for(const k of KT_KEYS)cl(k,KT_LIM[k][0],KT_LIM[k][1],KT_DEF[k]);
  q.stem=q.kwt;q.hair=Math.round(ktHair(ktP(q))*10)/10;L.stem=[q.stem,q.stem];L.hair=[q.hair,q.hair];
  q.space=Kortes.spaceW(ktP(q));L.space=[q.space,q.space];
  cl('capH',KT_CAP,KT_CAP,KT_CAP);cl('wdth',100,100,100);cl('xh',KT_CAP,KT_CAP,KT_CAP);cl('asc',KT_ASC,KT_ASC,KT_ASC);cl('desc',KT_DESC,KT_DESC,KT_DESC);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',0,0,0);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='kortes')return _pl(p,font);return ktLim(p);};
/* имя веса: значение по умолчанию (stem/xh = 137/700) читается Regular (0.315) */
WSCALE.kortes=0.6213;
/* семейство Light/Regular/Bold/Black: Regular = значение пользователя, Light = x0.75 (не тоньше предела), Bold = на 55 % пути к пределу, Black = предел */
const KT_FAMT=(u,wn)=>wn==='Light'?Math.max(KT_LIM.kwt[0],u*0.75):wn==='Bold'?u+(KT_LIM.kwt[1]-u)*0.55:wn==='Black'?KT_LIM.kwt[1]:u;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='kortes'){if(['Light','Regular','Bold','Black'].includes(wn))o.kwt=Math.min(KT_LIM.kwt[1],Math.max(KT_LIM.kwt[0],Math.round(KT_FAMT(ktClamp('kwt',p.kwt),wn))));return paramLimits(o,'kortes').q;}
  return o;};
/* ---- кернинг: классовые пары прототипа (по ключам знаков) + парные поправки; безопасный зазор проверяется по профилям при ТЕКУЩИХ параметрах ---- */
const KT_MEM=new Map();for(const ch of Object.keys(F.GL)){if(Array.from(ch).length!==1||!(F.GL[ch].opt&&F.GL[ch].opt.fixed)||F.GL[ch].opt.alt||/\s/.test(ch))continue;const c=ktKey(ch);(KT_MEM.get(c)||KT_MEM.set(c,[]).get(c)).push(ch);}
const ktKP=Kortes.KERNP.map(k=>({l:[...new Set(k[0].split(' ').map(ktKey))],r:[...new Set(k[1].split(' ').map(ktKey))],v:k[2]}));
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='kortes')return _ckt(st,prof,isLow,fontId);
  const Ls=new Set(),Rs=new Set(),vals={};
  for(const g of ktKP){for(const l of g.l)Ls.add(l);for(const r of g.r)Rs.add(r);}
  for(const g of ktKP)for(const l of g.l)for(const r of g.r)vals[l+'|'+r]=g.v;
  const mem=c=>(KT_MEM.get(c)||[]).filter(ch=>prof(ch));
  const G0=12;
  const altOf=new Map();for(const a of KT_ALTS){(altOf.get(a.key)||altOf.set(a.key,[]).get(a.key)).push(a.name);}
  const pf=new Map();
  const profs=c=>{const o=[];for(const ch of mem(c)){const q=prof(ch);if(q)o.push(q);}
    for(const nm of (altOf.get(c)||[])){let q=pf.get(nm);if(q===undefined){q=null;try{const g=finalGlyph(nm,st,{});q=g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;}catch(e){}pf.set(nm,q);}if(q)o.push(q);}return o;};
  const PM=new Map();const pr=c=>PM.get(c)||(PM.set(c,profs(c)),PM.get(c));
  const guard=(a,b,v)=>{if(v>=0)return v;for(const pa of pr(a))for(const pb of pr(b)){const g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil(G0-g.min));}return Math.min(0,Math.max(-150,v));};
  for(const key of Object.keys(vals)){const [a,b]=key.split('|');vals[key]=guard(a,b,vals[key]);}
  /* парные поправки (kern_pairs.json прототипа): имеют приоритет над классами */
  const pairs={};
  for(const [l,r,v] of KT_PAIRS){const a=ktKey(l),b=ktKey(r);const gv=guard(a,b,v);
    for(const x of (KT_MEM.get(a)||[]))for(const y of (KT_MEM.get(b)||[]))pairs[x+y]=gv;}
  const t=60;
  return {L:[...Ls].map(c=>[c,mem(c)]).filter(x=>x[1].length),R:[...Rs].map(c=>[c,mem(c)]).filter(x=>x[1].length),vals,tU:t,tL:t,pairs};};
KERN_TABLE.kortes=[];
/* ---- GSUB: calt (= ss01) росчерки по таблице KTR; ^ + знак -> верхний знак (calt, liga, clig); ss02 — все верхние ---- */
const ktChain=(back,input,ahead,li)=>{/* ChainContextSubst формат 3; li == null — правило «ничего не делать» (ignore) */
  const covs=[...back,...input,...ahead];const nrec=li==null?0:1;
  const head=2+2+2*back.length+2+2*input.length+2+2*ahead.length+2+4*nrec;let off=head;const offs=covs.map(c=>{const o=off;off+=c.length;return o;});
  const w=new BW();w.u16(3).u16(back.length);back.forEach((c,i)=>w.u16(offs[i]));w.u16(input.length);input.forEach((c,i)=>w.u16(offs[back.length+i]));
  w.u16(ahead.length);ahead.forEach((c,i)=>w.u16(offs[back.length+input.length+i]));w.u16(nrec);if(nrec)w.u16(0).u16(li);covs.forEach(c=>w.bytes(c));return w.b;};
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='kortes')return;
  const gids=chs=>[...new Set(chs.map(c=>gidByCh[c]).filter(x=>x!=null))];
  const memOf=key=>(KT_MEM.get(key)||[]);
  const gOf=keys=>gids(keys.flatMap(memOf));
  const cov=a=>otCoverage(a);
  const altG=(key,which)=>gidByName[ktAltName(key,which)];
  /* superiors */
  const sup=KT_ALTS.filter(a=>a.which==='sup'&&gidByName[a.name]!=null);
  const hat=gidByCh['^'];let lSup=null,lAll=null;
  if(sup.length){
    if(hat!=null){const L=[];for(const a of sup)for(const ch of a.chars){const b=gidByCh[ch];if(b!=null)L.push({comps:[hat,b],lig:gidByName[a.name]});}
      looks.push({type:4,subs:[otoLigSubst(L)]});lSup=looks.length-1;}
    const P=[];for(const a of sup)for(const ch of a.chars){const b=gidByCh[ch];if(b!=null)P.push([b,gidByName[a.name]]);}
    looks.push({type:1,subs:[otSingleSubst(P)]});lAll=looks.length-1;}
  /* swashes: правила из KTR */
  let lSw=null;
  const R=KTR.R,Y=KTR.YA;
  const rG=gOf([R.base]),yG=gOf([Y.base]);
  if(rG.length&&yG.length&&altG(R.base,'sw')!=null&&altG(Y.base,'sw')!=null&&altG(Y.base,'swq')!=null){
    const subOf=(base,which)=>{const t=altG(base,which);const P=gOf([base]).map(g=>[g,t]);looks.push({type:1,subs:[otSingleSubst(P)]});return looks.length-1;};
    const subs=[];
    for(const [set,alt] of R.ahead){const ah=gOf(KTR[set]);if(!ah.length||altG(R.base,alt)==null)continue;const li=subOf(R.base,alt);subs.push(ktChain([],[cov(rG)],[cov(ah)],li));}
    /* Я: сначала правило «ничего не делать», когда круглую букву уже подпирает хвост R (R или R.sw/.swq позади круглой) */
    const rAny=[...rG,...[altG(R.base,'sw'),altG(R.base,'swq')].filter(x=>x!=null)];
    for(const [set,yalt] of Y.after){const bk=gOf(KTR[set]);if(!bk.length)continue;const yi=subOf(Y.base,yalt);
      subs.push(ktChain([cov(bk),cov(rAny)],[cov(yG)],[],null));
      subs.push(ktChain([cov(bk)],[cov(yG)],[],yi));}
    looks.push({type:6,subs});lSw=looks.length-1;}
  const calt=[lSup,lSw].filter(x=>x!=null);
  if(calt.length)feats.push({tag:'calt',lookups:calt});
  if(lSup!=null){feats.push({tag:'liga',lookups:[lSup]});feats.push({tag:'clig',lookups:[lSup]});}
  if(lSw!=null)feats.push({tag:'ss01',lookups:[lSw],nameID:256});
  if(lAll!=null)feats.push({tag:'ss02',lookups:[lAll],nameID:257});};
/* образец: те же подстановки (KTR) над текстом -> служебные символы (ctxName в ui_ot_o1.js); ^ + знак -> верхний знак раньше правил росчерков, как в порядке lookup GSUB */
/* крошки, которые могли возникнуть при повторном объединении хостом, отбрасываются (как в фильтре прототипа) */
const _fgK=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fgK.apply(this,arguments);
  if(!g||!g.cs||CUR_FONT!=='kortes')return g;
  const ar=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
  const cs=g.cs.filter(c=>!c.nodes||ar(c)>=350);return cs.length===g.cs.length?g:Object.assign({},g,{cs});};
const KTS={rules:KTR,
  apply(text){const A=[...text],n=A.length;const hat=new Array(n).fill(false),sup=new Array(n).fill(false);
    for(let i=0;i<n-1;i++){if(A[i]!=='^'||sup[i])continue;const c=A[i+1];if(/[\p{L}\d]/u.test(c)&&F.GL[c]&&F.GL[ktAltName(ktKey(c),'sup')]){hat[i]=true;sup[i+1]=true;i++;}}
    const keys=A.map((c,i)=>sup[i]||hat[i]||!/\p{L}/u.test(c)||!F.GL[c]?'':ktKey(c));
    const alt=ktApplyKeys(keys),out=[];
    for(let i=0;i<n;i++){if(hat[i])continue;
      if(sup[i])out.push({c:A[i],n:ktAltName(ktKey(A[i]),'sup')});
      else if(alt[i])out.push({c:A[i],n:ktAltName(keys[i],alt[i])});
      else out.push({c:A[i]});}
    return out;}};
const KTS_ENG={eng:ktP,get:ktGet,alts:KT_ALTS,LIM:KT_LIM,DEF:KT_DEF,KEYS:KT_KEYS,rows:KT_ROWS,key:ktKey,name:ktName,altName:ktAltName,bool:ktBool,rules:KTR,applyKeys:ktApplyKeys};
Object.assign(KTS,KTS_ENG);
FONTS.kortes=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!KT_KEYS.includes(r[0])&&!['slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='kortes'){const f=FONTS[id];f.params=f.params||{};for(const k of KT_KEYS)if(!(k in f.params))f.params[k]=null;}
for(const r of KT_ROWS)F.params[r[0]]=[r[1],r[2],r[3],r[4]];
if(typeof globalThis!=='undefined')globalThis.KTS=KTS;
}
