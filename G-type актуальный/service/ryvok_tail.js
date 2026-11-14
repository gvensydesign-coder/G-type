/* ================= регистр, наборы, параметры ================= */
const G=F.GL;
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ',latl='abcdefghijklmnopqrstuvwxyz',cy='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',cyl='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',sym='.,:;!?"\'-–—()/&№«»‘’“”„…−·•°©₽@#%*+=\\|';
for(const c of lat+cy)if(G[c])G[c.toLowerCase()]=G[c];
G['y']=G['У'];
F.GROUPS=[['Латиница · прописные',lat],['Латиница · строчные',latl],['Кириллица · прописные',cy],['Кириллица · строчные',cyl],['Цифры','0123456789'],['Знаки',sym]];
F.CHARSET=[...lat,...latl,...cy,...cyl,...'0123456789',...sym,' '].filter(c=>G[c]);
for(const c of Object.keys(G))if(!F.CHARSET.includes(c))delete G[c];
const R0={wdth:104,capH:700,xh:700,asc:910,desc:190,stem:220,hair:183,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:14,track:0,space:330,
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,
  cham:60,spk:72,fury:70,lean:85,spkU:70,spkD:100,spkS:80,sym:20,persp:0,blade:0};
F.DEFAULTS={regular:{...R0},italic:{...R0,wdth:104,slant:12,space:340,blade:70,spkD:100,lean:100,spkU:60,spkS:90,fury:80,sym:30}};
const HID=['hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn'];
F.params={wdth:['Ширина знаков, %',88,130,1],capH:['Высота прописных',640,760,1],stem:['Основные штрихи',170,290,1]};
for(const k of HID)F.params[k]=null;
F.methods=[
  ['Характер','Готовые системы лезвий.',[
    ['Прорыв',{spk:72,fury:70,lean:85,spkU:70,spkD:100,spkS:80,sym:20,persp:0,blade:0,slant:0,cham:60}],
    ['Симметрия',{spk:62,fury:65,lean:60,spkU:70,spkD:100,spkS:90,sym:100,persp:18,blade:0,slant:0,cham:50}],
    ['Скорость',{spk:66,fury:80,lean:100,spkU:60,spkD:100,spkS:90,sym:30,persp:0,blade:70,slant:12,cham:60}],
    ['Чистый',{spk:0,fury:0,persp:0,blade:0,slant:0,cham:40}]]],
  ['Вес','Толщина вертикалей.',[['Жирный',{stem:196}],["Тяжёлый",{stem:220}],["Чёрный",{stem:245}]]],
  ['Лезвия','Длина лезвий.',[['Короткие',{spk:30}],['Средние',{spk:55}],['Длинные',{spk:100}]]],
  ['Перспектива','Трапеция знака.',[['Прямая',{persp:0}],['Вниз шире',{persp:30}],['Вверх шире',{persp:-30}]]],
  ['Скорость','Удлинение левых клинков.',[['Нет',{blade:0}],['Клинки',{blade:55}],['Мечи',{blade:100}]]],
  ['Срезы','Косые срезы и фаски колец.',[['Прямые',{cham:15}],['Срез',{cham:60}],['Грань',{cham:100}]]]];
F.sym=false;F.wK=0;F.nodeBudget=0;
const ALLCH=[...lat,...latl,...cy,...cyl,...'0123456789'].join('');
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IHНПL',stemFy:[0.62,0.68],hang:true,asc:ALLCH,desc:ALLCH,holeK:0.02,aboveBase:true};
/* пределы взаимозависимы: капитель → ширина → вертикаль (две вертикали + щель в самом узком знаке) → горизонталь (0.85 вертикали,
   но три перекладины + две щели ≥ 0.09h) → лезвия (длины от высоты; вылеты вверх/вниз задают asc/desc) → перспектива/клинки */
function ryLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('capH',640,760,700);cl('wdth',88,130,104);
  const h=q.capH,u=h*q.wdth/100;
  cl('stem',120,Math.min(0.38*h,(0.98*u-0.27*h)/2),220);q.stem=Math.round(q.stem);
  q.hair=Math.round(Math.min(q.stem*0.85,0.262*h));/* FX3: stem floor 120 for the Light weight */L.hair=[q.hair,q.hair];
  cl('xh',h,h,h);cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);
  cl('cham',0,100,60);cl('spk',0,100,72);cl('fury',0,100,70);cl('lean',-100,100,85);cl('spkU',0,100,70);cl('spkD',0,100,100);cl('spkS',0,100,80);cl('sym',0,100,20);
  cl('persp',-60,60,0);cl('blade',0,100,0);
  cl('sb',6,40,14);
  const d=D(q);
  const mg=Math.max(0.3*q.stem,40),mk=Math.max(mg+0.8*q.stem,mg+0.5*q.stem+Math.max(0.06*h,40)),asc=Math.ceil(h+Math.max(0.24*h,d.Utop,mk))+2,desc=Math.ceil(Math.max(0.3*h,0.12*h+d.Dmax))+2;
  cl('asc',asc,asc,asc);cl('desc',desc,desc,desc);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='ryvok')return _pl(p,font);return ryLim(p);};
/* вес (FX3): лестница шире, шаги видны даже при замере на 0.25 капы (там в штрих входят лапы-рога, +48): Light 126 · Regular 171 · Bold 231 · Black 266 при capH 700 (1.36 / 1.35 / 1.15; потолок штриха 0.38·capH) */
WSCALE.ryvok=0.62;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='ryvok'){const rt={Light:0.18,Regular:0.245,Bold:0.33,Black:0.38}[wn];if(rt)o.stem=Math.round(p.capH*rt);o.hair=Math.round(Math.min(o.stem*0.85,0.262*p.capH));o.wdth=wn==='Black'?Math.min(130,Math.round(p.wdth*1.04)):p.wdth;o.sb=p.sb;return paramLimits(o,'ryvok').q;}
  return o;};
/* кернинг: базовая таблица + классы «шипов»; значения меряются по профилям (площадь белого), защита от столкновения — kernMeasure */
Object.assign(KC_L,{yA:'EFLГTZSCGЕЁСЗЪБ2357',yD:'AVWXYKЖЛЯУ4М'});
Object.assign(KC_R,{yB:'TZSJЭЗ2357ТСCG',yC:'AVWXYЛДУ4',yF:'BDEFHIKLMNOPRUВГЕИЙКНПРЦЧШЩЬЫЮФ0689'});
/* кернинг по телу знака: font.kernBody=[0.15,0.9,0.1] — зазор между телами (без рогов) в полосе 0.15h–0.9h → 0.1h; защита рогов от столкновения — по полному профилю (kernMeasure) */
Object.assign(KC_L,{yL:lat+cy+'0123456789'});Object.assign(KC_R,{yR:lat+cy+'0123456789'});
F.kernBody=[0.15,0.9,0.1];F.kernTwin=true;/* FIX-ENGINE: строчные близнецы в классах прописных (аб = АБ) */
/* FX3: right-open letters (Г Т Р Ф …) before punctuation and opening quotes before letters: same body-gap rule, own classes */
Object.assign(KC_R,{yP:'.,:;!?»”’…„-–—)'});Object.assign(KC_L,{yQ:'«„“‘('});
KERN_TABLE.ryvok=[['yL','yR',1],['yL','yP',1],['yQ','yR',1]];
/* FX3: horn-to-horn clearance: after kerning the Euclidean white between the full profiles (horns included) is >= 0.06·capH (42 u) */
const _kmR=kernMeasure;
kernMeasure=function(a,b,t,f,p){const r=_kmR(a,b,t,f,p);if(!r||CUR_FONT!=='ryvok'||a.r0<0||b.r0<0)return r;
  const hg=0.06*p.capH,st=(KP_Y1-KP_Y0)/KP_N,m=Math.ceil(hg/st);let need=-1e9;
  for(let j=a.r0;j<=a.r1;j++){const ra=a.R[j];if(ra==null)continue;
    for(let q=Math.max(b.r0,j-m);q<=Math.min(b.r1,j+m);q++){const lb=b.L[q];if(lb==null)continue;const dy=(q-j)*st;if(Math.abs(dy)>=hg)continue;
      const n=Math.sqrt(hg*hg-dy*dy)-((a.adv-ra)+lb);if(n>need)need=n;}}
  if(need>r.k)r.k=Math.round(need);return r;};
/* FX3: exact slant for post/hhea (stems measure 11.8° at slant 12; the 18.7° seen in the audit came from the horn edges) */
F.italicAngle=p=>-Math.round(Math.atan(Math.tan((p&&p.slant||0)*Math.PI/180)+0.1317)*1800/Math.PI)/10;/* FIX-ENGINE: видимый наклон = сдвиг + собственный наклон рогов (замер Н, п, I курсива: 19–20° при сдвиге 12°) */
FONTS.ryvok=F;
/* ползунки «Шипы»/«Динамика» — только у Рывка: у остальных шрифтов скрыты */
for(const id in FONTS)if(id!=='ryvok'){const f=FONTS[id];f.params=f.params||{};for(const k of RY)if(!(k in f.params))f.params[k]=null;}
