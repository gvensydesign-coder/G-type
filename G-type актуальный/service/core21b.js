/* ===== «Свой шрифт из файлов»: модель, нормализация, шрифт «imp» =====
   IMP.glyphs[символ] = {c:[контуры SVG-импорта, 1000 ед. = высота холста], bb, src:'A.svg', adj:{dy,s}, v}
   Из набора считается нормализация (IMP.norm): единая шкала по медианам (прописные, строчные, выносные), базовая линия,
   метрики IMP.M (прописная, x-высота, выносные), толщина ствола/горизонтали. Знаки GL шрифта FONTS.imp — обычные записи
   {shape,w,k,opt}: предпросмотр, правка точек, Сверка, кернинг, экспорт работают как у остальных шрифтов.
   Параметры imp: ширина (масштаб по x с компенсацией ствола), метрики (кусочная карта по y), насыщенность (смещение контура
   с сохранением узлов, предел — по просвету знака), наклон с оптической поправкой (icomp), поля, интервал.
   Без импортированных знаков (IMP.glyphs пуст) шрифт не регистрируется и остальные шрифты не меняются. */
const IMP={glyphs:{},ver:0,M:{cap:700,xh:500,asc:760,desc:210},stem0:140,hair0:112,mode:'B',split:false,ready:false,
  family:'My Font',norm:{},nv:-1,lim:{},par:new Map(),fill:{},warn:{}};
/* безопасное PostScript-имя из названия шрифта: кириллица -> латиница, слова с кириллицей пишутся с заглавной, остальное как есть */
const IMP_TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
function psSafe(s,fb){const r=psSafe0(s);if(r)return r;if(fb!==undefined)return fb;const f=typeof FONTS==='object'&&typeof CUR_FONT==='string'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].family;return f?(psSafe0(f)||'Font'):'Font';}
/* FX80 B02/B05: название без букв и цифр («!!!», «😀»), пустое или из пробелов -> собственное название шрифта */
function famOwn(id){const F=typeof FONTS==='object'&&FONTS[id||(typeof CUR_FONT==='string'?CUR_FONT:'')];return (F&&F.family)||'Volt Noir';}
function famEff(fam,id){fam=String(fam==null?'':fam).trim();return /[\p{L}\p{N}]/u.test(fam)?fam:famOwn(id);}
function psSafe0(s){return String(s||'').split(/\s+/).map(w=>{if(!/[а-яё]/i.test(w))return w;let o='';for(const c of w){const l=c.toLowerCase(),t=IMP_TR[l];o+=t==null?c:t;}return o.charAt(0).toUpperCase()+o.slice(1);}).join('').replace(/[^A-Za-z0-9]/g,'');}
function impTag(){const ks=Object.keys(IMP.glyphs).filter(c=>impRaw(c));return (ks.length&&ks.every(c=>IMP.glyphs[c].src==='draw')?'Нарисован вручную':'Из ваших файлов')+' · '+ks.length+' знаков';}
const IMPT={
  LU:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',LL:'abcdefghijklmnopqrstuvwxyz',
  CU:'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',CL:'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
  DIG:'0123456789',PUN:'.,:;!?-–—()"\'«»…',
  SYM:'@#$%&*+=<>_~^`°•×÷±§©®™€₽№£¥¢/\\|[]{}‘’‚“”„¡¿−·',
  CYX:'ІЇЄҐіїєґЎўЂђЋћЈјЉљЊњЏџЅѕЃѓЌќҒғҚқҢңӨөҮүҰұҺһӘә',
  MARKS:[['́','acute','Акут'],['̀','grave','Гравис'],['̂','circ','Циркумфлекс'],['̌','caron','Гачек'],['̈','dier','Умлаут'],
    ['̇','dot','Точка'],['̊','ring','Кольцо'],['̄','macron','Макрон'],['̃','tilde','Тильда'],['̆','breve','Бреве'],
    ['̋','dacute','Двойной акут'],['̧','ced','Седиль'],['̨','ogon','Огонэк']]};
const IMP_MARKCH={};for(const [c,n] of IMPT.MARKS)IMP_MARKCH[n]=c;
const IMP_ISMARK=ch=>ch.length===1&&ch.charCodeAt(0)>=0x300&&ch.charCodeAt(0)<=0x36F;
/* односимвольные пары «одна буква — один знак» в обе стороны (кириллица ↔ латиница) */
const IMP_TWIN=(()=>{const m={};for(const cy in SK_TWIN){m[cy]=SK_TWIN[cy];m[SK_TWIN[cy]]=cy;}return m;})();
/* ---------- слоты библиотеки ---------- */
function impSlots(){
  const L=IMPT;
  const mk=(id,title,chars)=>({id,title,chars:Array.from(chars)});
  const base=(lc,uc,name)=>[mk(name+'U','Прописные',uc),mk(name+'L','Строчные',lc),mk(name+'D','Цифры',L.DIG),mk(name+'P','Знаки препинания',L.PUN)];
  return {
    lat:{basic:base(L.LL,L.LU,'lat'),ext:[mk('latX','Буквы с диакритикой',EXTLAT),mk('latS','Символы',L.SYM),mk('latM','Акценты — отдельные знаки',IMPT.MARKS.map(m=>m[0]).join(''))]},
    cyr:{basic:base(L.CL,L.CU,'cyr'),ext:[mk('cyrX','Расширенная кириллица',L.CYX)]}};}
/* ---------- имя файла -> символ ---------- */
const IMP_AGL={space:' ',exclam:'!',quotedbl:'"',numbersign:'#',dollar:'$',percent:'%',ampersand:'&',quotesingle:"'",parenleft:'(',parenright:')',asterisk:'*',plus:'+',comma:',',hyphen:'-',period:'.',slash:'/',
  zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',colon:':',semicolon:';',less:'<',equal:'=',greater:'>',question:'?',at:'@',bracketleft:'[',backslash:'\\',bracketright:']',
  asciicircum:'^',underscore:'_',braceleft:'{',bar:'|',braceright:'}',asciitilde:'~',endash:'–',emdash:'—',quoteleft:'‘',quoteright:'’',quotedblleft:'“',quotedblright:'”',quotesinglbase:'‚',quotedblbase:'„',
  ellipsis:'…',guillemotleft:'«',guillemotright:'»',guillemetleft:'«',guillemetright:'»',bullet:'•',degree:'°',multiply:'×',divide:'÷',plusminus:'±',section:'§',copyright:'©',registered:'®',trademark:'™',
  Euro:'€',ruble:'₽',numero:'№',sterling:'£',yen:'¥',cent:'¢',exclamdown:'¡',questiondown:'¿',minus:'−',periodcentered:'·',germandbls:'ß',dotlessi:'ı',AE:'Æ',ae:'æ',OE:'Œ',oe:'œ',
  Oslash:'Ø',oslash:'ø',Lslash:'Ł',lslash:'ł',Dcroat:'Đ',dcroat:'đ',nbspace:' ',
  acute:'́',grave:'̀',circumflex:'̂',caron:'̌',dieresis:'̈',dotaccent:'̇',ring:'̊',macron:'̄',tilde:'̃',breve:'̆',hungarumlaut:'̋',cedilla:'̧',ogonek:'̨'};
const IMP_CYRN={be:'б',ve:'в',ge:'г',de:'д',ie:'е',io:'ё',zhe:'ж',ze:'з',ishort:'й',iishort:'й',shorti:'й',ka:'к',el:'л',em:'м',en:'н',pe:'п',er:'р',es:'с',te:'т',ef:'ф',ha:'х',kha:'х',tse:'ц',che:'ч',sha:'ш',shcha:'щ',
  hardsign:'ъ',yeru:'ы',yery:'ы',softsign:'ь',ereversed:'э',yu:'ю',ya:'я',ghe:'г',yi:'ї',ukrie:'є',ghe_up:'ґ'};
(function(){const sfx={'́':'acute','̀':'grave','̂':'circumflex','̈':'dieresis','̃':'tilde','̊':'ring','̄':'macron','̆':'breve','̌':'caron','̧':'cedilla','̨':'ogonek','̇':'dotaccent','̋':'hungarumlaut'};
  for(const ch of EXTLAT){const d=ch.normalize('NFD');if(d.length===2&&sfx[d[1]]&&/[A-Za-z]/.test(d[0])&&IMP_AGL[d[0]+sfx[d[1]]]==null)IMP_AGL[d[0]+sfx[d[1]]]=ch;}})();
function impNameToChar(file){
  let n=String(file).replace(/^.*[\\/]/,'').replace(/\.(svg|png|jpe?g|webp)$/i,'').trim();if(!n)return null;
  let cs=null;
  const m=/^(.*?)[ _.\-](upper|uppercase|cap|caps|capital|uc|lower|lowercase|small|lc|smallcap)$/i.exec(n);
  if(m&&m[1]){n=m[1];cs=/^(upper|uppercase|cap|caps|capital|uc)$/i.test(m[2])?'u':'l';}
  else{const m2=/^(upper|uppercase|cap|capital|uc|lower|lowercase|small|lc)[ _.\-](.+)$/i.exec(n);if(m2){n=m2[2];cs=/^(upper|uppercase|cap|capital|uc)$/i.test(m2[1])?'u':'l';}}
  const fin=c=>{if(!c)return null;if(cs==='u'){const u=c.toUpperCase();if(Array.from(u).length===1)return u;}if(cs==='l'){const l=c.toLowerCase();if(Array.from(l).length===1)return l;}return c;};
  let h=/^(?:u\+|U\+|uni|0x|&#x|\\u)([0-9a-fA-F]{4,6});?$/.exec(n)||/^[uU]([0-9a-fA-F]{4,6})$/.exec(n);
  if(h){const cp=parseInt(h[1],16);if(cp>0x20&&cp<0x110000&&!(cp>=0xD800&&cp<=0xDFFF))return fin(String.fromCodePoint(cp));return null;}
  if(Array.from(n).length===1)return fin(n);
  if(IMP_AGL[n]!=null)return fin(IMP_AGL[n]);
  const lo=n.toLowerCase();
  if(IMP_CYRN[lo]!=null){const c=IMP_CYRN[lo];return cs==='u'?c.toUpperCase():cs==='l'?c:(/^[A-Z]/.test(n)?c.toUpperCase():c);}
  if(IMP_AGL[lo]!=null&&!/[A-Z]/.test(lo.slice(1)))return fin(IMP_AGL[lo]);
  return null;}
/* ---------- категории знака ---------- */
const IMP_LXH='acemnorsuvwxz',IMP_LASC='bdfhklß',IMP_LDES='gpqy',IMP_CXH='авгезиклмнопстхчшэюяьыъ',IMP_CASC='бђћ',IMP_CDES='руфцщдџ';
const IMP_BELOW=new Set('ÇçŞşŢţĄąĘęĮįŲųĢģĶķĻļŅņŖŗȘșȚț'.split(''));
/* {z, base} — z: cap|xh|asc|desc|idot|jdot|fig|pun|sym|mark; base — буква, по которой считается шкала (без диакритики) */
function impCat(ch){
  if(IMP_ISMARK(ch))return {z:'mark'};
  const c0=ch.normalize('NFD'),b=c0[0],plain=Array.from(c0).length===1;
  const below=IMP_BELOW.has(ch);
  const base=b;
  let z=null;
  if(/\p{Lu}/u.test(b))z='cap';
  else if(/\p{Ll}/u.test(b)){
    if(b==='i'||b==='ı'||b==='і'||b==='ї')z=b==='ı'?'xh':'idot';else if(b==='j'||b==='ј')z='jdot';
    else if(IMP_LXH.includes(b)||IMP_CXH.includes(b))z='xh';else if(IMP_LASC.includes(b)||IMP_CASC.includes(b))z='asc';
    else if(IMP_LDES.includes(b)||IMP_CDES.includes(b))z='desc';else z='xh';
    if(b==='ё'||b==='й'||b==='ў'){z=b==='ў'?'desc':'idot';}
    if(b==='ђ'||b==='ћ')z='asc';}
  else if(/\d/.test(b))z='fig';
  else if(IMPT.PUN.includes(b)&&!'()'.includes(b))z='pun';
  else z='sym';
  return {z,base,plain,below,acc:!plain};}
/* ожидаемая зона знака для метрик M: [нижняя, верхняя, якорь('b' — низ, 't' — верх, 'c' — центр)] и допускает ли индивидуальную подгонку */
const IMP_PZ={'.':['b',0,110],',':['t',110],':':['b',0,500],';':['t',500],'!':['b',0,700],'?':['b',0,700],'¡':['b',0,700],'¿':['b',0,700],
  '-':['c',250],'–':['c',250],'—':['c',250],'−':['c',270],'+':['c',270],'=':['c',270],'×':['c',270],'÷':['c',270],'±':['c',270],'<':['c',270],'>':['c',270],'·':['c',250],'•':['c',330],'…':['b',0],
  '"':['t',700],"'":['t',700],'“':['t',700],'”':['t',700],'‘':['t',700],'’':['t',700],'„':['t',110],'‚':['t',110],'`':['t',700],'^':['t',700],'*':['t',700],'°':['t',700],'~':['c',330],
  '«':['c',250],'»':['c',250],'_':['t',-90],'(':['b',-210,760],')':['b',-210,760],'[':['b',-210,760],']':['b',-210,760],'{':['b',-210,760],'}':['b',-210,760],
  '/':['b',-80,780],'\\':['b',-80,780],'|':['b',-210,760]};
function impZone(ch,cat){
  const M=IMP.M;
  switch(cat.z){
    case 'cap':return cat.below||'QЦЩДЏ'.includes(cat.base)?{a:'t',v:M.cap,H:null}:{a:'b',v:0,H:cat.acc?null:M.cap};
    case 'fig':return {a:'b',v:0,H:M.cap};
    case 'xh':return cat.below?{a:'t',v:M.xh,H:M.xh}:{a:'b',v:0,H:cat.acc?null:M.xh};
    case 'asc':return cat.below?{a:'t',v:M.asc,H:M.asc}:{a:'b',v:0,H:cat.acc?null:M.asc};
    case 'desc':return cat.acc||cat.base==='ф'?{a:'b',v:-M.desc,H:null}:{a:'t',v:M.xh,H:M.xh+M.desc};
    case 'idot':return {a:'b',v:0,H:cat.acc?null:M.asc*0.97};
    case 'jdot':return {a:'t',v:M.asc*0.97,H:M.asc*0.97+M.desc};
    case 'pun':case 'sym':{const z=IMP_PZ[ch];
      if(z){if(z[0]==='b')return {a:'b',v:z[1],H:z[2]!=null&&z[2]>=400?z[2]-z[1]:null};if(z[0]==='t')return {a:'t',v:z[1],H:null};return {a:'c',v:z[1],H:null};}
      return {a:'b',v:0,H:M.cap};}}
  return {a:'b',v:0,H:null};}
/* ---------- геометрия: пересечения линии с контурами ---------- */
function impRuns(cs,axis,pos){
  const polys=cs.map(c=>flatC(c,12)),xs=[];
  for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];
    const u0=axis==='h'?a[1]:a[0],u1=axis==='h'?b[1]:b[0];
    if((u0<=pos&&u1>pos)||(u1<=pos&&u0>pos)){const t=(pos-u0)/(u1-u0);const v=axis==='h'?a[0]+t*(b[0]-a[0]):a[1]+t*(b[1]-a[1]);xs.push([v,u1>u0?1:-1]);}}
  xs.sort((p,q)=>p[0]-q[0]);const out=[];let w=0,st=null;
  for(const [v,d] of xs){const was=w;w+=d;if(was===0&&w!==0)st=v;else if(was!==0&&w===0&&st!=null){out.push([st,v]);st=null;}}
  return out;}
const impMed=a=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
/* ---------- аффинное преобразование контуров ---------- */
function impAff(cs,fx,fy){const T=(p)=>p&&{x:fx(p.x),y:fy(p.y)};
  return cs.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:fx(n.x),y:fy(n.y),a:T(n.a),b:T(n.b)}))}));}
/* ---------- нормализация набора ---------- */
function impRaw(ch){const r=IMP.glyphs[ch];return r&&r.c&&r.c.length?r:null;}
function impGlyphBB(r){if(!r.bb)r.bb=impBBox(r.c);return r.bb;}
const IMP_ROUND='OCGSocesОСЭЗосэзЄє0368';
function impNormalize(){
  const G=IMP.glyphs,ks=Object.keys(G).filter(ch=>impRaw(ch));
  const info={};for(const ch of ks){const r=G[ch],b0=impGlyphBB(r);if(!b0)continue;const k=r.k||1,bb={x0:b0.x0*k,y0:b0.y0*k,x1:b0.x1*k,y1:b0.y1*k};info[ch]={r,bb,k,H:bb.y1-bb.y0,W:bb.x1-bb.x0,cat:impCat(ch)};}
  const pick=(set,filter)=>Object.keys(info).filter(ch=>set.includes(ch)&&(!filter||filter(info[ch])));
  const capRef=pick('EFHIKLNTZЕНПГТИКМЛ'),capAll=Object.keys(info).filter(ch=>info[ch].cat.z==='cap'&&info[ch].cat.plain&&!'QJЦЩДЂЏ'.includes(ch));
  const capSet=capRef.length>=3?capRef:capAll;
  const xhRef=pick('nmrxzvwuнпмтгкишч'),xhAll=Object.keys(info).filter(ch=>info[ch].cat.z==='xh'&&info[ch].cat.plain&&ch!=='ı');
  const xhSet=xhRef.length>=3?xhRef:xhAll;
  const ascSet=pick('bdhkl'),desSet=pick('pqgyруфцщ'),figSet=Object.keys(info).filter(ch=>info[ch].cat.z==='fig');
  const medH=s=>impMed(s.map(ch=>info[ch].H));
  const M={cap:700,xh:500,asc:760,desc:210};let mode='B',split=false,base=0;
  /* общая шкала: прописные -> 700 */
  let Hc=medH(capSet),Hx=medH(xhSet),Sc,Sx;
  if(Hc==null&&figSet.length)Hc=medH(figSet);
  if(Hc!=null)Sc=700/Hc;
  if(Hx!=null){if(Sc!=null){const xm=Hx*Sc;if(xm>=0.58*700&&xm<=0.88*700){Sx=Sc;M.xh=Math.round(xm);}else{Sx=500/Hx;split=true;}}else Sx=500/Hx;}
  if(Sc==null)Sc=Sx!=null?Sx*1.4:1;
  if(Sx==null)Sx=Sc;
  /* общая базовая линия (набор нарисован на одном холсте): низ плоских знаков */
  const flatBot=[...pick('EFHIKLNTZЕНПГТИКМЛ'),...pick('nmrxzvwнпмтгкишч')].map(ch=>info[ch].bb.y0);
  if(flatBot.length>=3){
    const b0=impMed(flatBot),spread=Math.max(...flatBot)-Math.min(...flatBot);
    const desLow=desSet.filter(ch=>info[ch].bb.y0<b0-0.1*Hc*1);
    const rndLow=pick('OCQoceосэ').filter(ch=>{const d=b0-info[ch].bb.y0;return d>0.003*(Hc||700)&&d<0.06*(Hc||700);});
    if(Hc!=null&&spread<=0.02*Hc&&(desLow.length>=1||(desSet.length===0&&rndLow.length>=2))){mode='A';base=b0;}}
  /* выносные */
  if(ascSet.length){const am=medH(ascSet)*Sx;if(am>=M.cap-20&&am<=M.cap*1.25)M.asc=Math.round(Math.max(M.cap+10,Math.min(M.cap+150,am)));else M.asc=M.cap+60;}else M.asc=M.cap+60;
  if(M.asc<M.xh+120)M.asc=M.xh+120;
  if(desSet.length){const dm=medH(desSet.filter(ch=>'pq'.includes(ch)||'рф'.includes(ch)).length?desSet.filter(ch=>'pqрф'.includes(ch)):desSet)*Sx-M.xh;if(dm>=120&&dm<=300)M.desc=Math.round(dm);}
  IMP.M=M;IMP.mode=mode;IMP.split=split;
  /* знаки */
  const norm={};
  for(const ch of Object.keys(info)){
    const I=info[ch],{cat,bb}=I,r=I.r,adj=r.adj||{};
    let S=cat.z==='cap'||cat.z==='fig'||cat.z==='sym'||cat.z==='pun'?Sc:Sx;
    if(cat.z==='mark')S=Sx;
    if(adj.s)S*=adj.s/100;
    let dy;
    if(cat.z==='mark'){dy=-bb.y0*S;}
    else if(mode==='A'){dy=-base*S;}
    else{
      const Z=impZone(ch,cat);
      if(Z.H&&!adj.s){const Si=Z.H/I.H;if(Math.abs(Si/S-1)>0.22)S=Si;}
      /* обрезанный по контуру файл (bbox = чернила): у круглых знаков вылеты уходят на одну сторону — центрируем чернила в полосе зоны */
      const hs=(bb.y1-bb.y0)*S;
      if(Z.H&&Z.a==='b'&&!cat.below&&!cat.acc&&IMP_ROUND.includes(ch)&&hs>Z.H*1.004&&hs<Z.H*1.12)dy=Z.v+Z.H/2-((bb.y0+bb.y1)/2)*S;
      else if(Z.a==='b')dy=Z.v-bb.y0*S;else if(Z.a==='t')dy=Z.v-bb.y1*S;else dy=Z.v-((bb.y0+bb.y1)/2)*S;}
    dy+=adj.dy||0;
    const dx=-bb.x0*S+(adj.l||0);
    const kk=I.k,cs=impAff(r.c,x=>x*kk*S+dx,y=>y*kk*S+dy);
    const nb=impBBox(cs);
    norm[ch]={cs,W:Math.max(1,nb.x1-nb.x0+(adj.l||0)+(adj.r||0)),bb:nb,cat,S};}
  IMP.norm=norm;IMP.nv=IMP.ver;IMP.lim={};IMP.par=new Map();IMP.glob=null;
  /* стволы: ствол — минимальная пробежка по горизонтали у I l H Н i; горизонталь — перекладина T Т E Е */
  const stemOf=ch=>{const N=norm[ch];if(!N)return null;const y=ch.toUpperCase()===ch&&N.cat.z==='cap'?IMP.M.cap*0.4:IMP.M.xh*0.4;const R=impRuns(N.cs,'h',y);if(!R.length)return null;return Math.min(...R.map(q=>q[1]-q[0]));};
  const st=[];for(const ch of 'IlHНiıLEFТ|1'){const v=stemOf(ch);if(v!=null&&v>8&&v<450)st.push(v);}
  for(const ch of 'ТГПнпиm'){const v=stemOf(ch);if(v!=null&&v>8&&v<450&&st.length<3)st.push(v);}
  IMP.stem0=Math.round(impMed(st)||Math.max(40,IMP.M.cap*0.19));
  const hs=[];for(const ch of 'TТEЕF'){const N=norm[ch];if(!N)continue;const x=N.W*(ch==='T'||ch==='Т'?0.12:0.55);const R=impRuns(N.cs,'v',x);
    const top=R.filter(q=>q[1]>IMP.M.cap*0.8);if(top.length)hs.push(top[top.length-1][1]-top[top.length-1][0]);}
  IMP.hair0=Math.round(Math.max(20,Math.min(IMP.stem0*1.15,impMed(hs)||IMP.stem0*0.82)));
  IMP.dflt=impDefaults();
}
function impNorm(ch){if(IMP.nv!==IMP.ver)impNormalize();return IMP.norm[ch]||null;}
function impDefaults(){
  const M=IMP.M,sb=Math.max(22,Math.min(70,Math.round(IMP.stem0*0.27)));
  const base=Object.assign({},DEFAULTS.regular,{wdth:100,capH:M.cap,xh:M.xh,asc:M.asc,desc:M.desc,stem:IMP.stem0,hair:IMP.hair0,ov:0,slant:0,sb,track:0,space:Math.round(M.cap*0.33/10)*10,opsp:100,icomp:0});
  const it=Object.assign({},DEFAULTS.italic,base,{slant:11,wdth:98,icomp:60});
  return {regular:base,italic:it};}
/* ---------- смещение контура (узлы сохраняются) ---------- */
/* эллиптическое перо rx × ry: узел сдвигается по нормали (острые углы — по биссектрисе), ручки подбираются по точкам смещённой кривой */
function impGrow(cs,rx,ry){
  if(!(Math.abs(rx)>1e-6||Math.abs(ry)>1e-6))return cs;
  const ax=Math.max(1e-3,Math.abs(rx)),ay=Math.max(1e-3,Math.abs(ry)),s=Math.abs(rx)>=Math.abs(ry)?(rx<0?-1:1):(ry<0?-1:1);
  const nrm=v=>{const l=Math.hypot(v[0],v[1]);return l>1e-12?[v[0]/l,v[1]/l]:null;};
  return cs.map(c=>{
    const N=c.nodes,n=N.length;if(n<2)return c;
    const P=N.map(q=>[q.x/ax,q.y/ay]),A=N.map(q=>q.a?[q.a.x/ax,q.a.y/ay]:null),B=N.map(q=>q.b?[q.b.x/ax,q.b.y/ay]:null);
    const tin=[],tout=[],V=[];
    for(let i=0;i<n;i++){
      const p=P[i],pr=P[(i-1+n)%n],nx=P[(i+1)%n];
      tin.push(nrm(A[i]?[p[0]-A[i][0],p[1]-A[i][1]]:[p[0]-pr[0],p[1]-pr[1]])||nrm([p[0]-pr[0],p[1]-pr[1]])||[1,0]);
      tout.push(nrm(B[i]?[B[i][0]-p[0],B[i][1]-p[1]]:[nx[0]-p[0],nx[1]-p[1]])||nrm([nx[0]-p[0],nx[1]-p[1]])||[1,0]);}
    const rt=t=>[t[1],-t[0]];
    for(let i=0;i<n;i++){
      const ni=rt(tin[i]),no=rt(tout[i]),d=ni[0]*no[0]+ni[1]*no[1];
      let v;if(d>0.9962){const m=nrm([ni[0]+no[0],ni[1]+no[1]])||ni;v=[m[0]*s,m[1]*s];}
      else if(1+d<1e-3)v=[ni[0]*s,ni[1]*s];
      else{const k=s/(1+d);v=[(ni[0]+no[0])*k,(ni[1]+no[1])*k];const l=Math.hypot(v[0],v[1]);if(l>2.4){v=[v[0]/l*2.4,v[1]/l*2.4];}}
      V.push(v);}
    const Q=P.map((p,i)=>[p[0]+V[i][0],p[1]+V[i][1]]);
    const outA=new Array(n).fill(null),outB=new Array(n).fill(null);
    for(let i=0;i<n;i++){
      const j=(i+1)%n,p0=P[i],p3=P[j],p1=B[i]||p0,p2=A[j]||p3;
      const line=!B[i]&&!A[j];if(line)continue;
      const q0=Q[i],q3=Q[j],t0=tout[i],t3=tin[j];
      const bez=(t)=>{const u=1-t;return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]];};
      const der=(t)=>{const u=1-t;return [3*u*u*(p1[0]-p0[0])+6*u*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0]),3*u*u*(p1[1]-p0[1])+6*u*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1])];};
      let C00=0,C01=0,C11=0,X0=0,X1=0;
      for(let k=1;k<=7;k++){const t=k/8,pt=bez(t),dv=nrm(der(t))||t0,nn=rt(dv);
        const O=[pt[0]+nn[0]*s,pt[1]+nn[1]*s],u=1-t,b1=3*t*u*u,b2=3*t*t*u,b0=u*u*u,b3=t*t*t;
        const A1=[t0[0]*b1,t0[1]*b1],A2=[-t3[0]*b2,-t3[1]*b2];
        const tmp=[O[0]-(q0[0]*(b0+b1)+q3[0]*(b2+b3)),O[1]-(q0[1]*(b0+b1)+q3[1]*(b2+b3))];
        C00+=A1[0]*A1[0]+A1[1]*A1[1];C01+=A1[0]*A2[0]+A1[1]*A2[1];C11+=A2[0]*A2[0]+A2[1]*A2[1];X0+=A1[0]*tmp[0]+A1[1]*tmp[1];X1+=A2[0]*tmp[0]+A2[1]*tmp[1];}
      const det=C00*C11-C01*C01;let al=0,be=0;
      const chord=Math.hypot(q3[0]-q0[0],q3[1]-q0[1]);
      if(Math.abs(det)>1e-9){al=(X0*C11-X1*C01)/det;be=(C00*X1-C01*X0)/det;}
      const l0=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]),l3=Math.hypot(p3[0]-p2[0],p3[1]-p2[1]),lc=Math.hypot(p3[0]-p0[0],p3[1]-p0[1])||1;
      if(!(al>=0)||!(be>=0)||al>chord*1.6+1||be>chord*1.6+1){al=l0*chord/lc;be=l3*chord/lc;}
      outB[i]=[q0[0]+t0[0]*al,q0[1]+t0[1]*al];outA[j]=[q3[0]-t3[0]*be,q3[1]-t3[1]*be];}
    const U=(q)=>q&&{x:q[0]*ax,y:q[1]*ay};
    return {hole:c.hole,nodes:Q.map((q,i)=>({x:q[0]*ax,y:q[1]*ay,a:U(outA[i]),b:U(outB[i])})),op:c.op,grp:c.grp};});}
/* ---------- просвет знака: пределы смещения ---------- */
function impClearance(cs){
  const pts=[];let cid=0;
  for(const c of cs){const N=c.nodes,n=N.length,start=pts.length;let L=0;const loc=[];
    for(let i=0;i<n;i++){const a=N[i],b=N[(i+1)%n],curve=!!(a.b||b.a),p0=[a.x,a.y],p1=a.b?[a.b.x,a.b.y]:p0,p2=b.a?[b.a.x,b.a.y]:[b.x,b.y],p3=[b.x,b.y];
      const len=Math.hypot(b.x-a.x,b.y-a.y)+(curve?Math.hypot(p1[0]-p0[0],p1[1]-p0[1])+Math.hypot(p3[0]-p2[0],p3[1]-p2[1]):0);
      const m=Math.max(1,Math.ceil(len/10));
      for(let k=0;k<m;k++){const t=k/m,u=1-t;
        const x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];
        let dx=3*u*u*(p1[0]-p0[0])+6*u*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0]),dy=3*u*u*(p1[1]-p0[1])+6*u*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1]);
        if(Math.hypot(dx,dy)<1e-6){dx=p3[0]-p0[0];dy=p3[1]-p0[1];}
        const l=Math.hypot(dx,dy)||1;loc.push([x,y,dy/l,-dx/l]);}}
    let acc=0;for(let i=0;i<loc.length;i++){const q=loc[i];pts.push({x:q[0],y:q[1],nx:q[2],ny:q[3],c:cid,s:acc});const nx=loc[(i+1)%loc.length];acc+=Math.hypot(nx[0]-q[0],nx[1]-q[1]);}
    for(let i=start;i<pts.length;i++)pts[i].L=acc;cid++;}
  let gap=Infinity,stem=Infinity;const MAXD=320;
  for(let i=0;i<pts.length;i++){const a=pts[i];
    for(let j=i+1;j<pts.length;j++){const b=pts[j];
      const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>MAXD||Math.abs(dy)>MAXD)continue;
      if(a.nx*b.nx+a.ny*b.ny>-0.5)continue;
      const d=Math.hypot(dx,dy);if(d<1e-6||d>MAXD)continue;
      if(a.c===b.c){let arc=Math.abs(a.s-b.s);arc=Math.min(arc,a.L-arc);if(arc<Math.max(30,5*d))continue;}
      const dot=(dx*a.nx+dy*a.ny)/d;
      if(dot>0.8){const dot2=-(dx*b.nx+dy*b.ny)/d;if(dot2>0.8&&d<gap&&d>=22)gap=d;}
      else if(dot<-0.8){const dot2=(dx*b.nx+dy*b.ny)/d;if(dot2>0.8&&d<stem)stem=d;}}}
  return {gap,stem};}
/* короткие прямые между углами: смещение не должно «выворачивать» их (длина после смещения ≥ 15% исходной) */
function impSegLimits(cs){
  let grow=Infinity,shrink=Infinity;
  for(const c of cs){const N=c.nodes,n=N.length;if(n<3)continue;
    const dirs=[],V=[];
    for(let i=0;i<n;i++){const p=N[i],pr=N[(i-1+n)%n],nx=N[(i+1)%n];
      const tin=(()=>{const q=p.a||pr;const dx=p.x-q.x,dy=p.y-q.y,l=Math.hypot(dx,dy);return l>1e-9?[dx/l,dy/l]:[1,0];})();
      const tout=(()=>{const q=p.b||nx;const dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy);return l>1e-9?[dx/l,dy/l]:[1,0];})();
      const ni=[tin[1],-tin[0]],no=[tout[1],-tout[0]],d=ni[0]*no[0]+ni[1]*no[1];
      let v;if(d>0.9962)v=[(ni[0]+no[0])/2,(ni[1]+no[1])/2];else if(1+d<1e-3)v=ni;else{const k=1/(1+d);v=[(ni[0]+no[0])*k,(ni[1]+no[1])*k];const l=Math.hypot(v[0],v[1]);if(l>2.4){v=[v[0]/l*2.4,v[1]/l*2.4];}}
      V.push(v);}
    for(let i=0;i<n;i++){const a=N[i],b=N[(i+1)%n];if(a.b||b.a)continue;
      const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<1e-6||L>400)continue;
      const t=[dx/L,dy/L],j=(i+1)%n,e=(V[j][0]-V[i][0])*t[0]+(V[j][1]-V[i][1])*t[1];
      if(e<-1e-6)grow=Math.min(grow,0.85*L/(-e));else if(e>1e-6)shrink=Math.min(shrink,0.85*L/e);}}
  return {grow,shrink};}
function impLimit(ch){
  if(IMP.nv!==IMP.ver)impNormalize();
  let L=IMP.lim[ch];if(L)return L;
  const N=IMP.norm[ch];
  if(!N)return IMP.lim[ch]={grow:0,shrink:0};
  const c=impClearance(N.cs);
  const sg=impSegLimits(N.cs);
  return IMP.lim[ch]={grow:Math.min(isFinite(c.gap)?Math.max(0,(c.gap-18)*0.5):250,sg.grow,250),shrink:Math.min(isFinite(c.stem)?Math.max(0,(c.stem-22)*0.5):250,sg.shrink,250),gap:c.gap,stem:c.stem};}
/* глобальные пределы насыщенности: 20-й процентиль по знакам набора */
function impGlobalLimits(){
  if(IMP.nv!==IMP.ver)impNormalize();
  if(IMP.glob)return IMP.glob;
  const g=[],s=[];for(const ch of Object.keys(IMP.norm)){if(IMP.norm[ch].cat.z==='mark')continue;const L=impLimit(ch);if(L.grow<250)g.push(L.grow);if(L.shrink<250)s.push(L.shrink);}
  const pct=(a,q)=>{if(!a.length)return 60;a.sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*q))];};
  return IMP.glob={grow:Math.max(8,pct(g,0.3)),shrink:Math.max(8,pct(s,0.3))};}
/* ---------- параметры знака при p ---------- */
function impYMap(z,p,ry){
  ry=ry||0;
  const M=IMP.M,dc=p.desc||M.desc,cp=p.capH||M.cap,xh=p.xh||M.xh,as=p.asc||M.asc;
  /* смещение контура на ry сдвигает верхние линии вниз, нижние вверх: после смещения высоты зон остаются заданными */
  const pts=z==='cap'||z==='fig'?[[-M.desc,-dc+ry],[0,ry],[M.cap,cp-ry]]:[[-M.desc,-dc+ry],[0,ry],[M.xh,xh-ry],[M.asc,as-ry]];
  const last=pts.length-1,s0=(pts[1][1]-pts[0][1])/(pts[1][0]-pts[0][0]),s1=(pts[last][1]-pts[last-1][1])/(pts[last][0]-pts[last-1][0]);
  let ident=true;for(const q of pts)if(Math.abs(q[0]-q[1])>1e-6)ident=false;
  const f=y=>{if(y<=pts[0][0])return pts[0][1]+(y-pts[0][0])*s0;if(y>=pts[last][0])return pts[last][1]+(y-pts[last][0])*s1;
    for(let i=1;i<=last;i++)if(y<=pts[i][0]){const a=pts[i-1],b=pts[i];return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}return y;};
  const avg=z==='cap'||z==='fig'?cp/M.cap:xh/M.xh;
  return {f,ident,avg};}
function impTopo(cs){let o=0,h=0,tiny=0;for(const c of cs){if(c.hole)h++;else o++;if(Math.abs(impArea(impFlat(c,4)))<30)tiny++;}return o+'/'+h+(tiny?'t':'');}
/* контуры знака при параметрах: масштаб по x, карта по y, смещение контура (rx, ry), сдвиг так, чтобы левый край был в 0 */
function impBuild(N,k,zone,p,rx,ry){
  const zf=zone?impYMap(zone,p,ry).f:(y=>y);
  let cs=impAff(N.cs,x=>x*k,zf);
  if(Math.abs(rx)>1e-6||Math.abs(ry)>1e-6)cs=impGrow(cs,rx,ry);
  return rx?impAff(cs,x=>x+rx,y=>y):cs;}
function impPar(ch,p){
  const N=impNorm(ch);if(!N)return {w:40,ident:true,k:1,rx:0,ry:0,N:null};
  const key=ch+'|'+(p.wdth||100)+'|'+p.capH+'|'+p.xh+'|'+p.asc+'|'+p.desc+'|'+p.stem+'|'+(p.slant||0)+'|'+(p.icomp||0);
  let r=IMP.par.get(key);if(r)return r;
  const sl=(p.slant||0)*Math.PI/180,kc=1-2*(1-Math.cos(sl))*((p.icomp||0)/100),k=(p.wdth||100)/100*kc;
  const z=['cap','fig','pun','sym'].includes(N.cat.z)?'cap':'xh';
  const zone=N.cat.z==='mark'?null:z,zm=zone?impYMap(z,p,0):{f:y=>y,ident:true,avg:1};
  const stem=p.stem||IMP.stem0,ratio=stem/IMP.stem0;
  let rx=(stem-IMP.stem0*k)/2,ry=(IMP.hair0*Math.pow(ratio,0.85)-IMP.hair0*zm.avg)/2;
  if(N.cat.z==='mark'){rx=(stem-IMP.stem0)/2*0.8;ry=(IMP.hair0*Math.pow(ratio,0.85)-IMP.hair0)/2*0.8;}
  if(rx>0||ry>0||rx<0||ry<0){const L=impLimit(ch);
    if(rx>L.grow)rx=L.grow;if(ry>L.grow)ry=L.grow;if(rx<-L.shrink)rx=-L.shrink;if(ry<-L.shrink)ry=-L.shrink;}
  let cs=null;
  const ident0=Math.abs(k-1)<1e-9&&zm.ident&&Math.abs(rx)<1e-6&&Math.abs(ry)<1e-6;
  if(!ident0){
    /* проверка топологии: число частей и отверстий как у исходного знака; иначе смещение уменьшается, пока знак не выдержит */
    if(!N.topo)N.topo=impTopo(N.cs);
    let f=1;const rx0=rx,ry0=ry;
    for(let t=0;t<9;t++){
      rx=rx0*f;ry=ry0*f;cs=impBuild(N,k,zone,p,rx,ry);
      if(Math.abs(rx)<1e-6&&Math.abs(ry)<1e-6)break;
      let ok=true;try{ok=impTopo(csgUnion(cs))===N.topo;}catch(e){ok=true;}
      if(ok)break;f*=0.8;if(t===8){rx=0;ry=0;cs=impBuild(N,k,zone,p,0,0);}}}
  r={w:Math.max(40,N.W*k+2*rx),ident:ident0,k,rx,ry,zm,zone,pp:p,N,cs};
  if(IMP.par.size>2500)IMP.par.clear();IMP.par.set(key,r);return r;}
function impShape(ch,g){
  const P=impPar(ch,g.p);if(!P.N)return [];
  return cloneC(P.ident?P.N.cs:P.cs);}
/* ---------- записи GL ---------- */
function impKind(ch){const z=impCat(ch).z;return z==='cap'||z==='fig'||z==='pun'||z==='sym'?'cap':'xh';}
function impDef(ch){return {k:impKind(ch),opt:{imp:1},w:p=>impPar(ch,p).w,shape:g=>impShape(ch,g)};}
/* кириллица ↔ латиница: один знак */
function impFillTwins(G,own,status){
  for(const a in IMP_TWIN){const b=IMP_TWIN[a];
    if(G[a]&&!G[b]&&!(IMP.glyphs[b]&&impRaw(b))){G[b]=G[a];status[b]={t:'twin',from:a};}}}
/* точка i/j убирается: ı — «i» без точки */
function impDotless(ch,src){
  const N=impNorm(src);if(!N)return null;
  const M=IMP.M,keep=N.cs.filter(c=>{const bb=impBBox([c]);return !(bb.y0>=M.xh*0.7);});
  if(!keep.length||keep.length===N.cs.length)return null;
  const bb=impBBox(keep);return keep.map(c=>c).length?{cs:impAff(keep,x=>x-bb.x0,y=>y),W:bb.x1-bb.x0}:null;}
function impPlaceMark(Gm,name,P,g,top,cx){
  /* пользовательский акцент: центр над базой, низ на top + зазор */
  const mk=Gm;const R=impNorm(mk);if(!R)return null;
  const p=g.p,cap=p.capH,gap=Math.max(26,cap*0.05);
  const bb=R.bb,mw=bb.x1-bb.x0;
  const kk=P.k;
  let x0,y0;
  if(name==='ced'){x0=cx-mw/2*kk;y0=-(bb.y1-bb.y0)+Math.min(40,(bb.y1-bb.y0)*0.2);}
  else if(name==='ogon'){x0=g.w-mw*kk*0.9;y0=-(bb.y1-bb.y0)+Math.min(30,(bb.y1-bb.y0)*0.2);}
  else{x0=cx-mw/2*kk;y0=top+gap;}
  let cs=impAff(R.cs,x=>x*kk+x0,y=>y+y0-bb.y0*0);
  if(Math.abs(P.rx)>1e-6||Math.abs(P.ry)>1e-6){const gg=impGrow(cs,P.rx*0.8,P.ry*0.8);cs=gg;}
  return cs;}
function impBuildGL(){
  const G={},status={},own=Object.keys(IMP.glyphs).filter(ch=>impRaw(ch)&&!IMP_ISMARK(ch));
  for(const ch of own){G[ch]=impDef(ch);status[ch]={t:'own'};}
  /* пробелы — как у «Вольта» */
  for(const c of [' ',' '])if(FONTS.volt&&FONTS.volt.GL[c])G[c]=FONTS.volt.GL[c];
  if(IMP.autoFill===false)return {G,status};
  impFillTwins(G,own,status);
  /* ı: i без точки (или загруженный) */
  const baseOf=(c)=>c.normalize('NFD')[0];
  const dl=G['i']&&!G['ı']&&impDotless('ı','i');
  if(G['ı']===undefined&&dl){const W0=dl.W,Ni={cs:dl.cs,W:W0,cat:{z:'xh'}};G['ı']={k:'xh',opt:{imp:1,auto:1},w:p=>{const P=impPar('i',p);return Math.max(40,W0*P.k+2*P.rx);},
    shape:g=>{const P=impPar('i',g.p);if(!P.N)return [];return impBuild(Ni,P.k,P.zone,g.p,P.rx,P.ry);}};status['ı']={t:'auto',from:'i'};}
  /* акцентные буквы: база + знак (свой знак из библиотеки или системный по штриху шрифта) */
  const userMark=n=>{const c=IMP_MARKCH[n];return c&&impRaw(c)?c:null;};
  const mk=(ch,base,mark)=>{
    if(G[ch])return;const B=G[base];if(!B)return;
    const um=userMark(mark);
    if(um){
      G[ch]={k:B.k,opt:{imp:1,auto:1},w:B.w,shape:g=>{const P=impPar(um,g.p);const out=[...B.shape(g)];
        const top=B.k==='cap'?g.p.capH:g.p.xh;const cx=g.w/2;const mc=impPlaceMark(um,mark,P,g,top,cx);if(mc)out.push(...mc);return out;}};
    }else{const tmp={};tmp[base]=B;compose(tmp,ch,base,[mark]);if(tmp[ch]){tmp[ch].opt=Object.assign({},tmp[ch].opt,{imp:1,auto:1});G[ch]=tmp[ch];}}
    if(G[ch])status[ch]={t:'auto',from:base};};
  /* ď ť: апостроф справа вместо гачека (как у встроенных шрифтов) */
  const apo=(ch,base,xOf)=>{if(G[ch]||!G[base]||(IMP.glyphs[ch]&&impRaw(ch)))return;const B=G[base];
    G[ch]={k:B.k,opt:{imp:1,auto:1},w:p=>B.w(p)+(xOf==='r'?p.stem*0.75:0),shape:g=>{const k=gk(g),d=mkDims(k,false),wb=B.w(g.p),top=g.p.asc,bs=B.shape(g);let x=xOf==='r'?wb+Math.max(24,k.S*0.25):wb*0.62;
      const bb=impBBox(bs);
      if(xOf!=='r'&&bb){const R=impRuns(bs,'h',bb.y1-12);if(R.length)x=R[R.length-1][1]-d.tw*0.55;}
      const yb=Math.min(top-d.mh0*1.1,(bb?bb.y1:top)-Math.max(30,d.t*0.9));
      return [...bs,k.poly([[x,yb],[x+d.tw*0.7,yb],[x+d.tw*1.1,top],[x+d.tw*0.4,top]])];}};status[ch]={t:'auto',from:base};};
  apo('ď','d','r');apo('ť','t','m');
  for(const ch of EXTLAT){const m=MARKOF[ch];if(!m||IMP.glyphs[ch]&&impRaw(ch))continue;let b=baseOf(ch);if(ch==='ı')continue;if('ìíîïī'.includes(ch))b='ı';if(!G[b])continue;
    mk(ch,b,m);}
  const lt=(ch,base,mark)=>{if(!(IMP.glyphs[ch]&&impRaw(ch)))mk(ch,base,mark);};
  lt('Ё','Е','dier');lt('ё','е','dier');lt('Й','И','breve');lt('й','и','breve');lt('Ѓ','Г','acute');lt('ѓ','г','acute');lt('Ќ','К','acute');lt('ќ','к','acute');lt('Ў','У','breve');lt('ў','у','breve');
  /* одинаковые формы: Ї = Ï, Ё = Ë */
  for(const [a,b] of [['Ї','Ï'],['ї','ï'],['Ё','Ë'],['ё','ë']]){if(G[a]&&!G[b]){G[b]=G[a];status[b]={t:'auto',from:a};}else if(G[b]&&!G[a]){G[a]=G[b];status[a]={t:'auto',from:b};}}
  /* латинские прямые знаки: Ø Ł Đ — с перекладиной по штриху шрифта */
  const bar=(ch,base,f)=>{if(G[ch]||!G[base])return;const tmp={};tmp[base]=G[base];compose(tmp,ch,base,[],{extra:f});if(tmp[ch]){tmp[ch].opt=Object.assign({},tmp[ch].opt,{imp:1,auto:1});G[ch]=tmp[ch];status[ch]={t:'auto',from:base};}};
  bar('Ø','O',(k,d)=>[band(k,k.w*0.06,-k.h*0.06,k.w*0.94,k.h*1.06,d.t*1.15)]);bar('ø','o',(k,d)=>[band(k,k.w*0.06,-k.h*0.08,k.w*0.94,k.h*1.08,d.t*1.1)]);
  bar('Ł','L',(k,d)=>[band(k,-k.S*0.25,k.h*0.34,k.S*1.35,k.h*0.6,d.t*1.1)]);bar('ł','l',(k,d)=>[band(k,-k.S*0.35,k.h*0.5,k.S*1.35,k.h*0.86,d.t*1.05)]);
  bar('Đ','D',(k,d)=>[k.st(-k.S*0.3,k.h*0.46-d.t/2,k.S*1.55,k.h*0.46+d.t/2)]);
  bar('Ғ','Г',(k,d)=>[k.st(-k.S*0.25,k.h*0.44,k.S*1.9,k.h*0.44+d.t)]);bar('ғ','г',(k,d)=>[k.st(-k.S*0.25,k.h*0.44,k.S*1.9,k.h*0.44+d.t)]);
  const fd=k=>Math.max(k.desc*0.62,k.H*1.5,90);
  bar('Қ','К',k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,Math.max(8,k.H*0.6))]);bar('қ','к',k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,Math.max(8,k.H*0.6))]);
  bar('Ң','Н',k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,Math.max(8,k.H*0.6))]);bar('ң','н',k=>[k.st(k.w-k.S*0.62,-fd(k)*0.75,k.w,Math.max(8,k.H*0.6))]);
  bar('Ө','О',(k,d)=>[k.st(k.S-1,k.h/2-d.t/2,k.w-k.S+1,k.h/2+d.t/2)]);bar('ө','о',(k,d)=>[k.st(k.S-1,k.h/2-d.t/2,k.w-k.S+1,k.h/2+d.t/2)]);
  for(const [a,b] of [['Ү','Y'],['ү','y'],['һ','h'],['Ѓ','Ѓ']])if(a!==b&&!G[a]&&G[b]){G[a]=G[b];status[a]={t:'auto',from:b};}
  /* диграфы Æ æ Œ œ — две буквы с перекрытием */
  const pair=(ch,a,b,ov)=>{if(G[ch]||!G[a]||!G[b])return;const A=G[a],B=G[b];
    G[ch]={k:A.k,opt:{imp:1,auto:1},w:p=>A.w(p)+B.w(p)-p.stem*ov,shape:g=>{const wa=A.w(g.p);return [...A.shape(g),...impAff(B.shape(g),x=>x+wa-g.p.stem*ov,y=>y)];}};status[ch]={t:'auto',from:a+b};};
  pair('Æ','A','E',0.45);pair('æ','a','e',0.45);pair('Œ','O','E',0.4);pair('œ','o','e',0.4);
  return {G,status};}
/* ---------- регистрация шрифта ---------- */
const IMP_HIDE=['hair','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','nib','press','term','tens','conn'];
function impHasInk(){return Object.keys(IMP.glyphs).some(ch=>impRaw(ch));}
function impGroups(G){
  const has=s=>Array.from(s).filter(c=>G[c]).join('');
  const L=IMPT,gr=[];
  const add=(t,s)=>{const x=has(s);if(x)gr.push([t,x]);};
  add('Латиница · прописные',L.LU);add('Латиница · строчные',L.LL);add('Кириллица · прописные',L.CU);add('Кириллица · строчные',L.CL);
  add('Латиница · диакритика',EXTLAT);add('Кириллица · расширенная',L.CYX);add('Цифры',L.DIG);add('Знаки',L.PUN+L.SYM+' ');
  const rest=Object.keys(G).filter(c=>!gr.some(g=>g[1].includes(c))&&c.length===1);if(rest.length)gr.push(['Прочее',rest.join('')]);
  return gr;}
function impRegister(){
  if(!impHasInk()){
    IMP.ready=false;
    if(FONTS.imp){if(CUR_FONT==='imp')useFont('volt');delete FONTS.imp;}
    return null;}
  impNormalize();IMP.glob=null;
  const {G,status}=impBuildGL();IMP.status=status;
  const chars=Object.keys(G);
  const order=[];for(const grp of impGroups(G))for(const c of grp[1])if(!order.includes(c))order.push(c);
  for(const c of chars)if(!order.includes(c))order.push(c);
  const sample=(()=>{const s=Array.from('ГРОТЕСК Typeface 2026').filter(c=>G[c]||c===' ').join('');return s.trim()?s:order.filter(c=>c!==' ').slice(0,10).join('');})();
  const lim=impGlobalLimits(),D=IMP.dflt;
  const F=Object.assign(FONTS.imp||{},{id:'imp',name:(IMP.family&&IMP.family!=='My Font')?IMP.family:'Свой шрифт',family:IMP.family||'My Font',tag:impTag(),
    desc:Object.keys(IMP.glyphs).every(c=>!impRaw(c)||IMP.glyphs[c].src==='draw')?'Шрифт, нарисованный вручную в мастерской.':'Шрифт, собранный из векторных знаков, которые вы загрузили.',sample,sampleText:null,
    GL:G,CHARSET:order,GROUPS:impGroups(G),imported:true,sym:false,methods:IMP_METHODS(),
    DEFAULTS:{regular:{...D.regular},italic:{...D.italic}},
    params:(()=>{const o={};for(const k of IMP_HIDE)o[k]=null;
      o.wdth=['Ширина, %',70,135,1];o.stem=['Насыщенность (толщина ствола)',Math.max(24,Math.round(IMP.stem0*0.4)),Math.round(IMP.stem0*2.3),1];
      o.capH=['Высота прописных',Math.round(IMP.M.cap*0.85),Math.round(IMP.M.cap*1.15),1];o.xh=['Высота строчных',Math.round(IMP.M.xh*0.7),Math.round(IMP.M.xh*1.25),1];
      o.asc=['Верхние выносные',Math.round(IMP.M.cap*0.95),Math.round(IMP.M.cap*1.35),1];o.desc=['Нижние выносные',90,320,1];
      o.slant=['Угол наклона, °',-8,16,0.5];return o;})(),
    proof:{stemSet:'HILEFTНПЕГЬ|Il'},imp:lim,S0:IMP.stem0,kernDemo:null});
  F.sampleText=undefined;
  FONTS.imp=F;IMP.ready=true;
  KERN_TABLE.imp=KERN_TABLE_BASE;
  if(typeof TWC!=='undefined')TWC.delete('imp');
  for(const k of Object.keys(_refSB))if(k.startsWith('imp|'))delete _refSB[k];
  if(typeof _ckCache!=='undefined')for(const k of Object.keys(_ckCache))if(k.indexOf('imp|')>=0||true)delete _ckCache[k];
  if(typeof CSG_CACHE!=='undefined'&&CSG_CACHE.size>2500)CSG_CACHE.clear();
  if(CUR_FONT==='imp')useFont('imp');
  return F;}
function IMP_METHODS(){
  return [
    ['Насыщенность','Толщина штрихов относительно ваших исходных знаков (смещение контура; пределы — по просветам знаков).',[
      ['Светлый',{stem:()=>Math.round(IMP.stem0*0.8)}],['Как в файлах',{stem:()=>IMP.stem0}],['Жирный',{stem:()=>Math.round(IMP.stem0*1.35)}]]],
    ['Ширина','Общий масштаб ширины знаков; толщина стволов при этом сохраняется.',[
      ['Узкий',{wdth:84}],['Обычный',{wdth:100}],['Широкий',{wdth:116}]]],
    ['Интервал','Полуапроши (боковые поля) и оптические отступы.',[
      ['Плотный',{sb:()=>Math.round(IMP.stem0*0.2)}],['Обычный',{sb:()=>Math.round(IMP.stem0*0.27)}],['Свободный',{sb:()=>Math.round(IMP.stem0*0.4)}]]]];}
/* методы со значениями-функциями: ui_b сравнивает числа — сводим к числам при построении */
/* ---------- пределы параметров (обёртка paramLimits) ---------- */
const _pl_imp=paramLimits;
paramLimits=function(p,font){
  font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');
  if(font!=='imp'||!FONTS.imp||!IMP.ready)return _pl_imp(p,font);
  const q=Object.assign({},p),L={},M=IMP.M,D=FONTS.imp.DEFAULTS.regular;
  const cl=(k,lo,hi)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=D[k]!=null?D[k]:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',M.cap*0.85,M.cap*1.15);cl('xh',q.capH*0.55,q.capH*0.9);cl('asc',q.capH+10,q.capH+170);cl('desc',90,320);
  cl('wdth',70,135);
  const g=impGlobalLimits(),s0=IMP.stem0;
  cl('stem',Math.max(24,s0-2*g.shrink,s0*0.4),Math.min(s0*2.3,s0+2*g.grow));
  q.hair=Math.round(IMP.hair0*Math.pow(q.stem/s0,0.85));
  q.ov=0;
  cl('slant',-8,16);cl('icomp',0,100);cl('sb',8,100);cl('opsp',0,100);cl('track',-40,80);cl('space',120,460);
  return {q,L};};
/* ---------- запись и удаление знаков ---------- */
function impSet(ch,svgText,name){
  const r=svgImport(svgText);
  if(!r.cs.length||!r.bb){const w=r.warn||[];return {ok:false,warn:w,reason:w.includes('complex')?'complex':(w.includes('bad')||w.includes('nosvg'))?'bad':'empty',n:r.n};}
  const rec={c:r.cs,bb:r.bb,k:r.vb&&r.units?1/r.units:1,src:name||'',adj:null,v:++IMP.ver};
  const old=IMP.glyphs[ch];if(old&&old.adj)rec.adj=old.adj;
  IMP.glyphs[ch]=rec;if(r.warn.length)IMP.warn[ch]=r.warn;else delete IMP.warn[ch];
  return {ok:true,warn:r.warn};}
function impDrop(ch){if(IMP.glyphs[ch]){delete IMP.glyphs[ch];delete IMP.warn[ch];IMP.ver++;return true;}return false;}
function impAdjust(ch,adj){const r=IMP.glyphs[ch];if(!r)return;const a=Object.assign({},r.adj||{},adj);
  if(!a.dy)delete a.dy;if(!a.s||a.s===100)delete a.s;if(!a.l)delete a.l;if(!a.r)delete a.r;r.adj=Object.keys(a).length?a:null;IMP.ver++;}
/* ---------- компактное хранение ---------- */
function impPackC(cs){return cs.map(c=>{const o=[];for(const n of c.nodes){const m=(n.a?1:0)|(n.b?2:0);o.push(Math.round(n.x*10)/10,Math.round(n.y*10)/10,m);if(n.a)o.push(Math.round(n.a.x*10)/10,Math.round(n.a.y*10)/10);if(n.b)o.push(Math.round(n.b.x*10)/10,Math.round(n.b.y*10)/10);}return [c.hole?1:0,o];});}
function impUnpackC(arr){const out=[];if(!Array.isArray(arr))return out;
  for(const e of arr){if(!Array.isArray(e)||!Array.isArray(e[1]))continue;const o=e[1],nodes=[];let i=0;
    while(i+2<o.length){const x=+o[i],y=+o[i+1],m=o[i+2]|0;i+=3;const n={x,y,a:null,b:null};
      if(m&1){n.a={x:+o[i],y:+o[i+1]};i+=2;}if(m&2){n.b={x:+o[i],y:+o[i+1]};i+=2;}
      if(!isFinite(x)||!isFinite(y))return out;nodes.push(n);}
    if(nodes.length>=3)out.push({hole:!!e[0],nodes});}
  return out;}
function impPack(){
  const g={};for(const ch of Object.keys(IMP.glyphs)){const r=IMP.glyphs[ch];if(!r.c||!r.c.length)continue;const o={c:impPackC(r.c)};if(r.src)o.n=r.src;if(r.adj)o.a=r.adj;if(r.k&&Math.abs(r.k-1)>1e-9)o.k=Math.round(r.k*1e6)/1e6;g[ch]=o;}
  return Object.keys(g).length?{v:1,family:IMP.family,autoFill:IMP.autoFill!==false,g}:null;}
function impUnpack(o){
  for(const k of Object.keys(IMP.glyphs))delete IMP.glyphs[k];IMP.warn={};
  if(o&&typeof o==='object'&&o.g&&typeof o.g==='object'){
    if(typeof o.family==='string')IMP.family=o.family.slice(0,40);IMP.autoFill=o.autoFill!==false;
    for(const ch of Object.keys(o.g)){if(!(Array.from(ch).length===1))continue;const r=o.g[ch],c=impUnpackC(r&&r.c);if(!c.length)continue;
      const bb=impBBox(c);if(!bb)continue;
      const rec={c,bb,k:isFinite(+r.k)&&+r.k>0?+r.k:1,src:typeof r.n==='string'?r.n.slice(0,80):'',adj:null,v:0};
      if(r.a&&typeof r.a==='object'){const a={};if(isFinite(+r.a.dy)&&+r.a.dy)a.dy=Math.max(-300,Math.min(300,+r.a.dy));if(isFinite(+r.a.s)&&+r.a.s&&+r.a.s!==100)a.s=Math.max(40,Math.min(250,+r.a.s));for(const q of 'lr')if(isFinite(+r.a[q])&&+r.a[q])a[q]=Math.max(-200,Math.min(300,+r.a[q]));if(Object.keys(a).length)rec.adj=a;}
      IMP.glyphs[ch]=rec;}}
  IMP.ver++;}
