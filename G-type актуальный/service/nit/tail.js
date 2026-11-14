/* ---------- «Нить» (nit): параметры, страховка топологии, регистрация в продукте (по образцу applik/tail.js и stolb/tail.js) ----------
   Ключи ползунков имеют префикс n…: nlw «Толщина линии» (0..100, стебель 0.022..0.112 высоты прописной; ЕДИНСТВЕННАЯ толщина шрифта: host stem только выводится из неё,
   веса семейства и пресеты «Характер» её не трогают), nwd «Ширина», nwob «Дрожь руки», njn «Стыки», nseed «Вариант».
   Поля зашиты в контур (opt.fixed, sb = 0, opsp = 0): их считает генератор по профилю знака. */
const NZ_DEF={nlw:5,nwd:30,nwob:80,njn:40,nseed:1};
const NZ_LIM={nlw:[2,80],nwd:[0,100],nwob:[0,100],njn:[0,100],nseed:[0,999]};
const NZ_CAP=740,NZ_XH=480,NZ_ASC=900,NZ_DESC=260;
const nzNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const nzS=t=>NZ_CAP*(0.022+0.09*t/100);
/* параметры продукта -> параметры генератора */
const nzEng=p=>({S:nzS(nzNum(p.nlw,NZ_DEF.nlw)),width:nzNum(p.nwd,NZ_DEF.nwd),wob:nzNum(p.nwob,NZ_DEF.nwob),join:nzNum(p.njn,NZ_DEF.njn),seed:Math.round(nzNum(p.nseed,NZ_DEF.nseed))});
const nzKey=(ch,e)=>ch+'|'+[e.S.toFixed(3),e.width,e.wob,e.join,e.seed].join('|');
const nzPen=S=>skPen('ell',{rx:S/2,ry:S/2,ang:0,stem:S});
const nzFont={pen:null,simpTol:0.3,nodeBudget:0};
/* щели-«волоски» между почти параллельными штрихами (дыра меньше (1.2·S)²: перо заплыло бы) заливаются: пинхолы — дефект, настоящие просветы шрифта ≥ (2.6·S)² */
function nzContours(strokes,S){const sk=nzSkel(strokes,S);nzFont.pen=()=>nzPen(S);
  const cs=skShape(sk,nzFont,{stem:S,hair:S,term:0,nib:0},'nit'),lim=Math.pow(1.2*S,2);
  return cs.filter(c=>!(c.hole&&nzArea(c)<lim));}
/* топология по контурам объединения (точно, без растра): части = внешние контуры, дыры = контуры-дыры; площади по ломаной */
function nzArea(c){const P=flatC(c,6);let a=0;for(let i=0;i<P.length;i++){const q=P[(i+1)%P.length];a+=P[i][0]*q[1]-q[0]*P[i][1];}return Math.abs(a/2);}
function nzRaster(cs){const parts=[],holes=[];for(const c of cs)(c.hole?holes:parts).push(nzArea(c));return {parts,holes};}
/* ---------- сборка знака и страховка топологии ----------
   эталон = тот же знак с тем же зерном при толщине по умолчанию, ширине по умолчанию, дрожи 0, стыках 40: части и дыры эталона — «как задумано».
   если части/дыры/пылинки не те (или дыра меньше (1.1 S)²) — пересборка с меньшей дрожью, затем с замкнутыми стыками и т.д. */
const nzCache=new Map(),nzRefC=new Map(),nzFB={n:0,tot:0};
function nzBuildRaw(ch,e){const g=NIT.glyph(ch,{S:e.S,width:e.width,wob:e.wob,join:e.join,seed:e.seed});if(!g)return null;
  const cs=nzContours(g.strokes,e.S);return {ch,adv:g.adv,cs,e,sbl:g.bbox[0],bbox:g.bbox};}
/* растр 2 ед./пкс (как в stress_nit.js): части (8-связные) и замкнутые просветы (4-связные, от 12 ед.²). Ловит касания в точке и волосяные перемычки, которых нет в векторной топологии */
function nzRT(cs){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;const polys=cs.map(c=>flatC(c,8));
  for(const P of polys)for(const q of P){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  if(!(x1>x0))return {parts:0,holes:[]};const U=2,W=Math.ceil((x1-x0)/U)+10,H=Math.ceil((y1-y0)/U)+10,m=new Uint8Array(W*H);
  for(let j=0;j<H;j++){const y=y0+(j-5+0.5)*U,xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((a[1]<=y)!==(b[1]<=y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);let w=0;
    for(let k=0;k<xs.length-1;k++){w+=xs[k][1];if(w!==0){const i0=Math.ceil((xs[k][0]-x0)/U+5-0.5),i1=Math.floor((xs[k+1][0]-x0)/U+5-0.5);for(let i=Math.max(0,i0);i<=Math.min(W-1,i1);i++)m[j*W+i]=1;}}}
  const L=new Int32Array(W*H).fill(-1),q=new Int32Array(W*H);let parts=0;const holes=[];
  for(let st=0;st<W*H;st++){if(L[st]>=0)continue;const v=m[st],c8=v===1;let h=0,t=0,ar=0,edge=false;q[t++]=st;L[st]=st;
    while(h<t){const k=q[h++];ar++;const i=k%W,j=(k-i)/W;if(i===0||j===0||i===W-1||j===H-1)edge=true;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;if(!c8&&di&&dj)continue;const I=i+di,J=j+dj;if(I<0||J<0||I>=W||J>=H)continue;const kk=J*W+I;if(m[kk]===v&&L[kk]<0){L[kk]=st;q[t++]=kk;}}}
    if(v===1)parts++;else if(!edge&&ar*U*U>=12)holes.push(ar*U*U);}
  return {parts,holes};}
function nzTopo(r){return r.cs.length?nzRaster(r.cs):{parts:[],holes:[]};}
function nzRef(ch,seed){const k=ch+'|'+seed;let t=nzRefC.get(k);if(!t){const e={S:nzS(NZ_DEF.nlw),width:NZ_DEF.nwd,wob:0,join:NZ_DEF.njn,seed};const rr=nzBuildRaw(ch,e);t=nzTopo(rr);t.rt=nzRT(rr.cs);const h0=Math.pow(1.1*e.S,2);t.rt.big=t.rt.holes.filter(a=>a>=h0).length;nzRefC.set(k,t);}return t;}
function nzOK(r){if(!r.cs.length)return true;const t=nzTopo(r),ref=nzRef(r.ch,r.e.seed);if(!t)return false;
  if(t.holes.length!==ref.holes.length||t.parts.length!==ref.parts.length)return false;
  const hm=Math.pow(1.1*r.e.S,2);for(const a of t.holes)if(a<hm)return false;
  for(const a of t.parts)if(a<0.5*r.e.S*r.e.S)return false;
  const rt=nzRT(r.cs);if(rt.parts!==ref.rt.parts||rt.holes.filter(a=>a>=hm).length!==ref.rt.big)return false;
  return true;}
const NZ_CHAIN=[[0.8,1,1,1],[0.6,1,1,1],[0.4,1,1,1],[0.2,1,1,1],[0,1,1,1],[0,1,0.9,1],[0,1,0.8,1],[0,1,0.7,1],[0,1,1.1,1],[0,1,1.2,0.9],[0,1,1.4,0.8]];/* (дрожь, —, ширина, толщина): сначала спокойнее рука, потом уже/шире, потом тоньше */
function nzGet(ch,pIn){const e=nzEng(pIn),k=nzKey(ch,e);let r=nzCache.get(k);if(r)return r;
  r=nzBuildRaw(ch,e);nzFB.tot++;
  if(r&&!nzOK(r)){nzFB.n++;let ok=false;
    for(const [kw,kj,kws,kS] of NZ_CHAIN){const e2={S:e.S*kS,width:kws>=1?Math.min(100,e.width*kws+(kws>1?10:0)):e.width*kws,wob:e.wob*kw,join:Math.max(e.join,e.join*kj,25),seed:e.seed},r2=nzBuildRaw(ch,e2);
      if(r2&&nzOK(r2)){r=r2;r.fallback=[kw,kj,kws,kS].join('/');ok=true;break;}}
    if(!ok){r=nzBuildRaw(ch,{S:e.S,width:NZ_DEF.nwd,wob:0,join:NZ_DEF.njn,seed:e.seed});r.fallback='last';}}
  if(nzCache.size>4000)nzCache.clear();nzCache.set(k,r);return r;}
/* ---------- набор знаков ---------- */
const NZ_CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',NZ_CYL='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',NZ_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',NZ_LATL='abcdefghijklmnopqrstuvwxyz',NZ_DIG='0123456789';
const NZ_SYM='.,:;!?«»„“”‘’…"\'-–—\u2012\u2212()/&@№\u00b7\u00a9\u20bd#%*+=\\|\u00b0\u2022';
const NZ_SPC=[' ',' ',' '];
const nzCont=cs=>cs.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:{x:n.x,y:n.y},b:n.b?{x:n.b.x,y:n.b.y}:{x:n.x,y:n.y}})),c.hole));
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const NZ_KEYS=['nlw','nwd','nwob','njn','nseed'];
const NZ_ROWS=[['nlw','Толщина линии',0,100,1,'Линия'],['nwd','Ширина, %',0,100,1,'Линия'],['nwob','Дрожь руки, %',0,100,1,'Рука'],['njn','Стыки',0,100,1,'Рука'],['nseed','Вариант',0,999,1,'Рука']];
if(!PARAMS.some(r=>r[0]==='nlw')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...NZ_ROWS);}
const F={id:'nit',name:'Нить',family:'Nit',tag:'Рукописный · монолиния · капительные строчные',S0:20,GL:{},charset:'basic',
  desc:'Рукописный монолинейный шрифт, узкий: каждая буква — одна тонкая линия круглого пера, штрихи сходятся неровно, как фломастером. Строчные кириллицы — капительные, шире и свободнее прописных.',
  sample:'Нить · Thread'};
F.sampleText='СМЫСЛ ЖИЗНИ';
const nzIsLow=ch=>/\p{Ll}/u.test(ch);
const nzEntry=ch=>({shape:g=>{const r=nzGet(ch,g.p);return r?nzCont(r.cs):[];},w:p=>{const r=nzGet(ch,p);return r?r.adv:0;},k:nzIsLow(ch)?'xh':'cap',opt:{fixed:true}});
const NZ_ALL=[...NZ_CY,...NZ_CYL,...NZ_LAT,...NZ_LATL,...NZ_DIG,...NZ_SYM];
/* общие формы латиницы и кириллицы (A B C E H K M O P T X e o c x y = А В С Е Н К М О Р Т Х е о с х у): один знак GL, рисунок и поля одни (проверка homo) */
const NZ_SHARE={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х',e:'е',o:'о',c:'с',x:'х',y:'у'};
for(const ch of NZ_ALL){if(NZ_SHARE[ch]||!NIT.glyph(ch,{}))continue;F.GL[ch]=nzEntry(ch);}
for(const ch in NZ_SHARE)F.GL[ch]=F.GL[NZ_SHARE[ch]];
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
for(const c of NZ_SPC)F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '?(p=>p.space):(p=>thinSpace(p)),k:'cap',opt:{}};
const NZ_G=(s)=>[...s].filter(c=>F.GL[c]).join('');
F.GROUPS=[['Кириллица · прописные',NZ_G(NZ_CY)],['Кириллица · строчные (капитель)',NZ_G(NZ_CYL)],['Латиница · прописные',NZ_G(NZ_LAT)],['Латиница · строчные',NZ_G(NZ_LATL)],['Цифры',NZ_DIG],['Знаки',NZ_G(NZ_SYM)]];
F.CHARSET=NZ_ALL.concat([' ',...NZ_SPC]).filter(c=>F.GL[c]);
F.raw=(ch,p)=>nzGet(ch,p);
const K0={wdth:100,capH:NZ_CAP,xh:NZ_XH,asc:NZ_ASC,desc:NZ_DESC,stem:20,hair:20,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:250,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,nlw:NZ_DEF.nlw,nwd:NZ_DEF.nwd,nwob:NZ_DEF.nwob,njn:NZ_DEF.njn,nseed:NZ_DEF.nseed};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','stem','sb'];
F.params={};for(const k of HID)F.params[k]=null;
F.pen=p=>nzPen(nzS(nzNum(p.nlw,NZ_DEF.nlw)));
/* «Характер» не трогает толщину: пресеты меняют только руку (Ширина/Дрожь/Стыки); отдельный ряд «Толщина» — явный выбор пользователя */
const NP={
  poster:{nwd:30,nwob:80,njn:40},clean:{nwd:30,nwob:20,njn:60},lively:{nwd:30,nwob:100,njn:30},
  narrow:{nwd:5,nwob:70,njn:40},wide:{nwd:75,nwob:80,njn:40}};
F.methods=[
  ['Характер','Рука: как неровно ведёт линию. Толщину линии эти пресеты не меняют.',[['Плакатная',NP.poster],['Ровная',NP.clean],['Живая',NP.lively],['Узкая',NP.narrow],['Широкая',NP.wide]]],
  ['Толщина','Толщина линии: от плакатной нити до жирной монолинии. Явный выбор; именованные веса её не подменяют.',[['Нить',{nlw:5}],['Тонкая',{nlw:20}],['Средняя',{nlw:40}],['Жирная',{nlw:70}]]]];
F.coverNarrow=true;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=100;
const NZ_ALLCH=[...NZ_CY,...NZ_CYL,...NZ_LAT,...NZ_LATL,...NZ_DIG].join('');
F.proof={stem:p=>nzS(nzNum(p.nlw,NZ_DEF.nlw)),noBar:true,stemSet:' ',hang:true,asc:NZ_ALLCH,desc:NZ_ALLCH,descX:0,holeK:0.004};
function nzLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  for(const k of NZ_KEYS){const [a,b]=NZ_RANGE[k];cl(k,a,b,NZ_DEF[k]);}q.nseed=Math.round(q.nseed);q.nlw=Math.round(q.nlw*10)/10;
  q.stem=Math.round(nzS(q.nlw)*10)/10;q.hair=q.stem;L.stem=[q.stem,q.stem];L.hair=[q.stem,q.stem];
  cl('capH',NZ_CAP,NZ_CAP,NZ_CAP);cl('wdth',100,100,100);cl('xh',NZ_XH,NZ_XH,NZ_XH);cl('asc',NZ_ASC,NZ_ASC,NZ_ASC);cl('desc',NZ_DESC,NZ_DESC,NZ_DESC);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',-60,100,0);cl('space',150,420,250);cl('slant',0,20,0);
  return {q,L};}
const NZ_RANGE=Object.assign({},NZ_LIM);
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='nit')return _pl(p,font);return nzLim(p);};
/* имя веса по толщине, как у всех шрифтов продукта: шкала подобрана так, чтобы значение по умолчанию (стебель 19.6, stem/xh = 0.0408) читалось Regular (0.315·0.1296) */
WSCALE.nit=0.1296;
/* семейство Light/Regular/Bold/Black: ступени ОТ ТЕКУЩЕЙ толщины пользователя (Regular = её же), чтобы экспорт семейства не подменял выбор */
const NZ_FAMK={Light:0.70,Regular:1,Bold:1.39,Black:1.68};/* отношения FAM_W (0.22 / 0.315 / 0.437 / 0.53) к Regular */
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='nit'){const k=NZ_FAMK[wn];if(k){const S=nzS(nzNum(p.nlw,NZ_DEF.nlw))*k,t=(S/NZ_CAP-0.022)/0.09*100;o.nlw=Math.max(0,Math.min(NZ_RANGE.nlw[1],Math.round(t*10)/10));}return paramLimits(o,'nit').q;}
  return o;};
KERN_TABLE.nit=(typeof KERN_TABLE_BASE!=='undefined'?KERN_TABLE_BASE:[]).slice();
FONTS.nit=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!NZ_KEYS.includes(r[0])&&!['track','space','slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='nit'){const f=FONTS[id];f.params=f.params||{};for(const k of NZ_KEYS)if(!(k in f.params))f.params[k]=null;}
for(const r of NZ_ROWS)F.params[r[0]]=[r[1],NZ_RANGE[r[0]][0],NZ_RANGE[r[0]][1],r[4]];
if(typeof globalThis!=='undefined')globalThis.NIT=NIT;globalThis.NZS={eng:nzEng,get:nzGet,S:nzS,RANGE:NZ_RANGE,DEF:NZ_DEF,FB:nzFB,topo:nzTopo,ref:nzRef,raster:nzRaster,build:nzBuildRaw,ALL:NZ_ALL};
}
