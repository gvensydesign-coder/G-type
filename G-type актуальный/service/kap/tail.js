/* ---------- шрифт «Капля» ---------- */
const F={id:'kaplya',name:'Капля',family:'Kaplya Drop',tag:'Растекание · капли · акциденция',S0:90,GL:{},charset:'basic',
  desc:'Акцидентный шрифт из капель и растекающейся краски: чем тяжелее вес, тем сильнее растекание, тем теснее буквы, пока чёрный не станет единым пятном. Светлые начертания читаются спокойно. Пресеты — Капля, Чистая, Пятно, Дождь.',
  sample:'Капля · ability'};
F.sampleText='Растекание';
if(!PARAMS.some(r=>r[0]==='melt'))PARAMS.push(['melt','Растекание, %',0,100,1,'Растекание'],['drip','Капли, %',0,100,1,'Растекание']);
const KP=['melt','drip'];
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?"\'-–—()/&№«»‘’“”„…−·©₽@#%*+=\\|°•';
const kCache=new Map();
function kKey(ch,p,W){return [ch,p.stem,p.melt,p.drip,p.capH,p.xh,p.asc,p.slant>0?1:0,p.seed||0,Math.round(W)].join('|');}
function kCached(ch,p,W){const key=kKey(ch,p,W);let r=kCache.get(key);if(!r){r=kGlyph(ch,p,W);if(kCache.size>1500)kCache.clear();kCache.set(key,r);}return r;}
const isLt=ch=>/[A-Za-zА-Яа-яЁё0-9]/.test(ch);
for(const ch of Object.keys(KGL)){const d=KGL[ch],lt=isLt(ch);
  F.GL[ch]={shape:g=>{const r=kCached(ch,g.p,g.w);return r.contours.map(c=>mkc(c.nodes.map(n=>({x:n.x,y:n.y,a:{x:n.a.x,y:n.a.y},b:{x:n.b.x,y:n.b.y}})),c.hole));},
    w:lt?d.w:(p=>d.w(p)-0.85*(p.track||0)),k:d.k==='xh'?'xh':'cap',opt:{}};}
F.GL[' ']={shape:()=>[],w:p=>p.space,k:'cap',opt:{}};
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' '].filter(c=>F.GL[c]);
for(const c of Object.keys(F.GL))if(!F.CHARSET.includes(c))delete F.GL[c];
F.raw=(ch,p)=>kGlyph(ch,p,F.GL[ch].w(p));
const K0={wdth:100,capH:700,xh:520,asc:800,desc:300,stem:134,hair:134,melt:30,drip:28,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:34,track:-46,space:240,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:100,icomp:0,nib:0,press:0,seed:0};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10,melt:34,space:236}};
const HID=['hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','sb','track','space','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade'];
F.params={wdth:['Ширина знаков, %',88,118,1],capH:['Высота прописных',640,760,1],stem:['Основной штрих',80,250,1],melt:['Растекание, %',0,100,1],drip:['Капли, %',0,100,1]};
for(const k of HID)F.params[k]=null;
F.methods=[
  ['Характер','Готовые системы растекания.',[
    ['Капля',{melt:30,drip:28,stem:134}],['Чистая',{melt:0,drip:0,stem:134}],['Пятно',{melt:100,drip:55,stem:215}],['Дождь',{melt:45,drip:100,stem:134}]]],
  ['Вес','Толщина штриха.',[['Светлый',{stem:100}],['Обычный',{stem:134}],['Жирный',{stem:175}],['Чёрный',{stem:215}]]],
  ['Растекание','Как расплывается краска.',[['Нет',{melt:0}],['Лёгкое',{melt:25}],['Сильное',{melt:60}],['Пятно',{melt:100}]]],
  ['Капли','Капли и подтёки.',[['Нет',{drip:0}],['Редкие',{drip:25}],['Частые',{drip:60}],['Дождь',{drip:100}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;
const ALLCH=[...lat,...latl,...cy,...cyl,...'0123456789'].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IlНH',stemFy:[0.5],stemTol:0.2,hang:true,asc:ALLCH,desc:ALLCH,descX:0,holeK:0.01,aboveBase:true,
  drops:(ch,p)=>{const q=safeP({...p,slant:0});const r=kCached(ch,q,glyphWidth(ch,q));return r.contours.filter(c=>c.sat).length;}};
/* допуски «экспериментальных» правил: контуры закрываются/сливаются по замыслу только в этих знаках и только при растекании ≥ 60 */
F.allowSlit='SsSs2G3зЗ5Ee';
F.allowClose='aeеаёzбвдзрфыьэюяЖжЗ36890&8@ВЭЭ№Фф₽©@%°';
function kLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',640,760,700);cl('wdth',88,118,100);cl('melt',0,100,30);cl('drip',0,100,28);
  const m=q.melt/100,h=q.capH;
  cl('stem',80,Math.min(250,0.31*h+0.2*(q.wdth-100)),134);q.stem=Math.round(q.stem);q.melt=Math.round(q.melt);q.drip=Math.round(q.drip);
  q.hair=q.stem;L.hair=[q.stem,q.stem];
  const xh=Math.round(h*0.78*(1+0.05*m));cl('xh',xh,xh,xh);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',100,100,100);cl('icomp',0,0,0);cl('seed',0,0,0);
  const tr=Math.round(-0.27*q.stem*Math.pow(m/0.3,0.9));cl('track',tr,tr,tr);cl('sb',34,34,34);
  const sp=Math.round(236+0.9*(-tr));cl('space',sp,sp,sp);
  const R=q.stem/2,bm=Math.min(0.62,0.14+0.55*Math.pow(m,0.8)),gd=Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1);
  const asc=Math.ceil(Math.max(h*1.03,xh+gd+2*R+8))+6;cl('asc',asc,asc,asc);
  const ds=Math.max(290,Math.round(h*0.27+0.6*(q.stem-134)+70))+6;cl('desc',ds,ds,ds);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='kaplya')return _pl(p,font);return kLim(p);};
WSCALE.kaplya=0.435;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='kaplya'){const t={Light:[100,10,8],Regular:[134,30,28],Bold:[175,58,55],Black:[215,88,80]}[wn];if(t){const k=p.stem/134;o.stem=Math.round(t[0]*Math.max(0.6,Math.min(1.4,k)));o.melt=t[1];o.drip=t[2];o.hair=o.stem;o.wdth=p.wdth;}return paramLimits(o,'kaplya').q;}
  return o;};
KERN_TABLE.kaplya=[];
FONTS.kaplya=F;
for(const id in FONTS)if(id!=='kaplya'){const f=FONTS[id];f.params=f.params||{};for(const k of KP)if(!(k in f.params))f.params[k]=null;}
