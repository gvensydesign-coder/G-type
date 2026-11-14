/* ===== core_meta_l1: паспорт шрифта при экспорте (OS/2, name, gasp, head) и «О шрифте» =====
   buildTTF (core3b) вызывает metaTables(ctx) одной строкой и подменяет четыре таблицы: 'OS/2', 'name', 'gasp', 'head'.
   Контуры, метрики, cmap, GSUB/GPOS, kern, post, hhea, maxp этим файлом не затрагиваются.
   Что считается и откуда:
   — usWeightClass: вес из buildTTF (opts.weight / имя веса); usWidthClass: отношение ширины Н к высоте прописных
     у умолчательных параметров шрифта (ParaType: узкое 40–60 %, широкое ≥ 100 %), умноженное на отношение
     текущего параметра wdth к wdth, которое даёт семейство для этого веса (семейство не «прыгает» между классами);
   — fsSelection: ITALIC(0) | BOLD(5) | REGULAR(6) | USE_TYPO_METRICS(7); macStyle в head согласован;
   — ulUnicodeRange: каждый блок OpenType 1.7, в который попал хотя бы один знак cmap (как fontTools intersectUnicodeRanges);
   — ulCodePageRange: кодовая страница Windows считается поддержанной, если есть ВСЕ её буквы (Lu/Ll/Lt, кроме ƒ и µ — знаки, а не буквы
     алфавита) и ≥ 75 % остальных печатных знаков;
   — sxHeight / sCapHeight измеряются по знакам x (х) и H (Н) — плоские верхние границы без свисаний;
   — PANOSE (10 цифр): тип семейства, засечки, вес (ствол/высота прописных), пропорции (ширина Н), контраст (горизонталь/ствол),
     разброс штриха, плечи, форма буквы (наклон), средняя линия, высота строчных — таблицы значений и расшифровка по-русски ниже;
   — name: ID 1/2 по RIBBI, 16/17 — типографское семейство и начертание, 4, 6, 3, 5, ID 10 — описание (русское из FONT_META, если есть,
     и английское по паспорту), записи упорядочены по (платформа, кодировка, язык, ID);
   — gasp: сглаживание без привязки к сетке до 8 ppem и сетка + сглаживание дальше (инструкций хинтинга в файле нет);
   — head.flags: 0x0003 (линия шрифта в y=0, левый край знака в x=0); бит 3 «целый ppem» не ставится — инструкций нет. */
/* блоки Unicode → биты ulUnicodeRange [от, до, бит] (OpenType 1.7, BMP) */
const META_UR=[[0,127,0],[128,255,1],[256,383,2],[384,591,3],[592,687,4],[688,767,5],[768,879,6],[880,1023,7],[1024,1279,9],[1280,1327,9],[1328,1423,10],[1424,1535,11],[1536,1791,13],[1792,1871,71],[1872,1919,13],[1920,1983,72],[1984,2047,14],[2304,2431,15],[2432,2559,16],[2560,2687,17],[2688,2815,18],[2816,2943,19],[2944,3071,20],[3072,3199,21],[3200,3327,22],[3328,3455,23],[3456,3583,73],[3584,3711,24],[3712,3839,25],[3840,4095,70],[4096,4255,74],[4256,4351,26],[4352,4607,28],[4608,4991,75],[4992,5023,75],[5024,5119,76],[5120,5759,77],[5760,5791,78],[5792,5887,79],[5888,5919,84],[5920,5951,84],[5952,5983,84],[5984,6015,84],[6016,6143,80],[6144,6319,81],[6400,6479,93],[6480,6527,94],[6528,6623,95],[6624,6655,80],[6656,6687,96],[6912,7039,27],[7040,7103,112],[7168,7247,113],[7248,7295,114],[7424,7551,4],[7552,7615,4],[7616,7679,6],[7680,7935,29],[7936,8191,30],[8192,8303,31],[8304,8351,32],[8352,8399,33],[8400,8447,34],[8448,8527,35],[8528,8591,36],[8592,8703,37],[8704,8959,38],[8960,9215,39],[9216,9279,40],[9280,9311,41],[9312,9471,42],[9472,9599,43],[9600,9631,44],[9632,9727,45],[9728,9983,46],[9984,10175,47],[10176,10223,38],[10224,10239,37],[10240,10495,82],[10496,10623,37],[10624,10751,38],[10752,11007,38],[11008,11263,37],[11264,11359,97],[11360,11391,29],[11392,11519,8],[11520,11567,26],[11568,11647,98],[11648,11743,75],[11744,11775,9],[11776,11903,31],[11904,12031,59],[12032,12255,59],[12272,12287,59],[12288,12351,48],[12352,12447,49],[12448,12543,50],[12544,12591,51],[12592,12687,52],[12688,12703,59],[12704,12735,51],[12736,12783,61],[12784,12799,50],[12800,13055,54],[13056,13311,55],[13312,19903,59],[19904,19967,99],[19968,40959,59],[40960,42127,83],[42128,42191,83],[42240,42559,12],[42560,42655,9],[42752,42783,5],[42784,43007,29],[43008,43055,100],[43072,43135,53],[43136,43231,115],[43264,43311,116],[43312,43359,117],[43520,43615,118],[44032,55215,56],[55296,57343,57],[57344,63743,60],[63744,64255,61],[64256,64335,62],[64336,65023,63],[65024,65039,91],[65040,65055,65],[65056,65071,64],[65072,65103,65],[65104,65135,66],[65136,65279,67],[65280,65519,68],[65520,65535,69]];
/* знаки кодовых страниц Windows (0x20–0xFF без NBSP/SHY) → бит ulCodePageRange */
const META_CP={0:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ",1:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚„…†‡‰Š‹ŚŤŽŹ‘’“”•–—™š›śťžźˇ˘Ł¤Ą¦§¨©Ş«¬®Ż°±˛ł´µ¶·¸ąş»Ľ˝ľżŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢßŕáâăäĺćçčéęëěíîďđńňóôőö÷řůúűüýţ˙",2:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—™љ›њќћџЎўЈ¤Ґ¦§Ё©Є«¬®Ї°±Ііґµ¶·ё№є»јЅѕїАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя",3:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚ƒ„…†‡‰‹‘’“”•–—™›΅Ά£¤¥¦§¨©«¬®―°±²³΄µ¶·ΈΉΊ»Ό½ΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώ",4:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚ƒ„…†‡ˆ‰Š‹Œ‘’“”•–—˜™š›œŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏĞÑÒÓÔÕÖ×ØÙÚÛÜİŞßàáâãäåæçèéêëìíîïğñòóôõö÷øùúûüışÿ",7:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚„…†‡‰‹¨ˇ¸‘’“”•–—™›¯˛¢£¤¦§Ø©Ŗ«¬®Æ°±²³´µ¶·ø¹ŗ»¼½¾æĄĮĀĆÄÅĘĒČÉŹĖĢĶĪĻŠŃŅÓŌÕÖ×ŲŁŚŪÜŻŽßąįāćäåęēčéźėģķīļšńņóōõö÷ųłśūüżž˙",8:" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€‚ƒ„…†‡ˆ‰‹Œ‘’“”•–—˜™›œŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂĂÄÅÆÇÈÉÊË̀ÍÎÏĐÑ̉ÓÔƠÖ×ØÙÚÛÜỮßàáâăäåæçèéêë́íîïđṇ̃óôơö÷øùúûüư₫ÿ"};
const META_CP_NAMES={0:'Latin 1 (CP1252)',1:'Latin 2 (CP1250)',2:'Кириллица (CP1251)',3:'Греческий (CP1253)',4:'Турецкий (CP1254)',7:'Балтийский (CP1257)',8:'Вьетнамский (CP1258)'};
const META_UR_NAMES={0:'Basic Latin',1:'Latin-1',2:'Latin Extended-A',3:'Latin Extended-B',5:'Modifier Letters',6:'Combining Marks',7:'Greek',9:'Кириллица',29:'Latin Extended Additional',31:'General Punctuation',32:'Super/Subscripts',33:'Currency',35:'Letterlike',37:'Arrows',38:'Math Operators'};

/* по семействам: род PANOSE, засечки, ось, плечи, форма буквы, класс IBM. Остальное считается из параметров. Шрифт пользователя — нейтральные значения. */
const META_FAM={
  volt:{kind:2,serif:11,arm:2,form:'contact',cls:[8,5]},
  kvadra:{kind:2,serif:11,arm:2,form:'contact',cls:[8,5]},
  stroka:{kind:2,serif:11,arm:2,form:'contact',cls:[8,5]},
  liniya:{kind:2,serif:15,arm:2,form:'rounded',cls:[8,3]},
  codex:{kind:2,serif:14,arm:7,form:'contact',axis:'diag',cls:[10,1]},
  propis:{kind:3,cls:[10,3]},
  ustav:{kind:2,serif:11,arm:4,form:'square',cls:[9,3]},
  rotunda:{kind:2,serif:14,arm:7,form:'rounded',axis:'diag',cls:[9,2]},
  modul:{kind:2,serif:11,arm:2,form:'square',cls:[9,3]},
  ryvok:{kind:2,serif:11,arm:3,form:'square',cls:[9,3]},
  renessa:{kind:2,serif:2,arm:3,form:'contact',axis:'diag',cls:[1,3]},
  stsepka:{kind:2,serif:11,arm:2,form:'rounded',cls:[8,0]},
  stolb:{kind:2,serif:11,arm:2,form:'contact',cls:[8,0]},
  nit:{kind:3,cls:[10,8]},
  tyaga:{kind:2,serif:11,arm:2,form:'square',cls:[8,0]},
  kortes:{kind:2,serif:14,arm:3,form:'contact',cls:[9,3]}
};
const META_FAM_DEF={kind:2,serif:11,arm:2,form:'contact',cls:[0,0]};
/* расшифровка PANOSE по-русски: [название признака, {значение: слово}] для рода 2 (текст) и 3 (рукописный) */
const META_PAN_KIND={2:'Латинский текстовый',3:'Латинский рукописный',4:'Латинский акцидентный',5:'Латинские символы'};
const META_PAN_TXT=[
  ['Род',META_PAN_KIND],
  ['Засечки',{0:'любые',1:'не определены',2:'вогнутые',3:'тупые вогнутые',4:'квадратные вогнутые',5:'тупые квадратные вогнутые',6:'квадратные',7:'тонкие',8:'овальные',9:'преувеличенные',10:'треугольные',11:'без засечек (нормальный гротеск)',12:'без засечек (тупой)',13:'без засечек (перпендикулярный)',14:'расширенные концы',15:'скруглённые'}],
  ['Насыщенность',{0:'любая',1:'не определена',2:'сверхсветлое',3:'светлое',4:'тонкое',5:'нормальное',6:'среднее',7:'полужирное',8:'жирное',9:'сверхжирное',10:'чёрное',11:'экстрачёрное'}],
  ['Пропорции',{0:'любые',1:'не определены',2:'старого стиля',3:'нового стиля',4:'равной ширины',5:'широкие',6:'узкие',7:'сверхширокие',8:'сверхузкие',9:'моноширинные'}],
  ['Контраст',{0:'любой',1:'не определён',2:'неконтрастный',3:'очень малый',4:'малоконтрастный',5:'ниже среднего',6:'средний',7:'выше среднего',8:'контрастный',9:'сверхконтрастный'}],
  ['Изменение штриха',{0:'любое',1:'не определено',2:'нет',3:'плавное, диагональная ось',4:'плавное, переходное',5:'плавное, вертикальная ось',6:'плавное, горизонтальная ось',7:'резкое, вертикальная ось',8:'резкое, горизонтальная ось',9:'мгновенное, вертикальная ось',10:'мгновенное, горизонтальная ось'}],
  ['Плечи букв',{0:'любые',1:'не определены',2:'прямые горизонтальные',3:'прямые клиновидные',4:'прямые вертикальные',5:'прямые с одной засечкой',6:'прямые с двумя засечками',7:'непрямые горизонтальные',8:'непрямые клиновидные',9:'непрямые вертикальные',10:'непрямые с одной засечкой',11:'непрямые с двумя засечками'}],
  ['Форма буквы',{0:'любая',1:'не определена',2:'прямая, касание',3:'прямая, утяжелённая',4:'прямая, коробчатая',5:'прямая, приплюснутая',6:'прямая, скруглённая',7:'прямая, со смещением',8:'прямая, квадратная',9:'наклонная, касание',10:'наклонная, утяжелённая',11:'наклонная, коробчатая',12:'наклонная, приплюснутая',13:'наклонная, скруглённая',14:'наклонная, со смещением',15:'наклонная, квадратная'}],
  ['Средняя линия',{0:'любая',1:'не определена',2:'стандартная, обрезанная',3:'стандартная, заострённая',4:'стандартная, с засечками',5:'высокая, обрезанная',6:'высокая, заострённая',7:'высокая, с засечками',8:'постоянная, обрезанная',9:'постоянная, заострённая',10:'постоянная, с засечками',11:'низкая, обрезанная',12:'низкая, заострённая',13:'низкая, с засечками'}],
  ['Высота строчных',{0:'любая',1:'не определена',2:'постоянная, малая',3:'постоянная, средняя',4:'постоянная, крупная',5:'убывающая, малая',6:'убывающая, средняя',7:'убывающая, крупная'}]
];
const META_PAN_SCR=[
  ['Род',META_PAN_KIND],
  ['Инструмент',{0:'любой',1:'не определён',2:'плоское перо',3:'остроконечное перо с нажимом',4:'резец',5:'круглое перо',6:'кисть',7:'грубый',8:'фломастер',9:'дикая кисть'}],
  ['Насыщенность',META_PAN_TXT[2][1]],
  ['Расстановка',{0:'любая',1:'не определена',2:'пропорциональная',3:'моноширинная'}],
  ['Пропорции',{0:'любые',1:'не определены',2:'сверхузкие',3:'узкие',4:'нормальные',5:'широкие',6:'сверхширокие'}],
  ['Контраст',META_PAN_TXT[4][1]],
  ['Топология',{0:'любая',1:'не определена',2:'прямая, несвязная',3:'прямая, с хвостами',4:'прямая, связная',5:'курсив, несвязный',6:'курсив, с хвостами',7:'курсив, связный',8:'готическая, несвязная',9:'готическая, с хвостами',10:'готическая, связная'}],
  ['Форма',{0:'любая',1:'не определена',2:'вертикальная, без петель',3:'вертикальная, с петлями',4:'вертикальная, много петель',5:'вертикальная, крайне много петель',6:'наклонная, без петель',7:'наклонная, с петлями',8:'наклонная, много петель',9:'наклонная, крайне много петель',10:'утрированная, без петель',11:'утрированная, с петлями',12:'утрированная, много петель',13:'утрированная, крайне много петель'}],
  ['Концевые элементы',{0:'любые',1:'не определены',2:'нет, без петель',3:'нет, замкнутые петли',4:'нет, открытые петли',5:'острые, без петель',6:'острые, замкнутые петли',7:'острые, открытые петли',8:'сужающиеся, без петель',9:'сужающиеся, замкнутые петли',10:'сужающиеся, открытые петли',11:'круглые, без петель',12:'круглые, замкнутые петли',13:'круглые, открытые петли'}],
  ['Высота строчных',{0:'любая',1:'не определена',2:'очень низкая',3:'низкая',4:'средняя',5:'высокая',6:'очень высокая'}]
];
const META_W_NAMES={1:'сверхузкое',2:'очень узкое',3:'узкое',4:'полуузкое',5:'нормальное',6:'полуширокое',7:'широкое',8:'очень широкое',9:'сверхширокое'};
const META_FAMCLASS={0:'не указан',8:'гротески',9:'акцидентные',10:'рукописные'};
function metaWeightWord(w){return w<=200?'сверхсветлое':w<=300?'светлое':w<=400?'нормальное':w<=600?'полужирное':w<=700?'жирное':'сверхжирное';}
/* наибольший y / ширина / высота по узлам контуров знака */
function metaBox(cs){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  const tt=typeof contourToTT==='function';/* те же точки, что уходят в glyf: габарит совпадает с yMax файла */
  for(const c of cs||[]){const pts=tt?contourToTT(c):c.nodes;if(tt&&pts.length<3)continue;for(const n of pts){x0=Math.min(x0,n.x);x1=Math.max(x1,n.x);y0=Math.min(y0,n.y);y1=Math.max(y1,n.y);}}
  return x1>x0?{x0,x1,y0,y1,w:x1-x0,h:y1-y0}:null;
}
/* ширина Н / высота прописных у умолчательных параметров шрифта (без наклона); кэш по шрифту и параметрам */
const META_HR={};
function metaHRatio(fontId){
  const f=typeof FONTS!=='undefined'&&FONTS[fontId];if(!f||!f.DEFAULTS||!f.DEFAULTS.regular)return null;
  const D=f.DEFAULTS.regular,key=fontId+'|'+JSON.stringify(D);
  if(META_HR[key]!==undefined)return META_HR[key];
  let r=null;
  try{
    const s0={p:Object.assign({},D,{slant:0}),lat:newLattice(),hg:[],kern:{}};
    for(const ch of ['Н','H']){const g=finalGlyph(ch,s0,{},{slant:false});const b=g&&metaBox(g.cs);if(b&&b.h>0){r=b.w/b.h;break;}}
  }catch(e){r=null;}
  const ks=Object.keys(META_HR);if(ks.length>40)delete META_HR[ks[0]];
  META_HR[key]=r;return r;
}
/* отношение для текущего веса: wdth этого веса к wdth, который даёт семейство при умолчательных настройках */
function metaWidthRatio(fontId,p,wName,styleKey){
  const f=FONTS[fontId],r0=metaHRatio(fontId);if(r0==null)return null;
  let k=1;
  try{const D=f.DEFAULTS[styleKey]||f.DEFAULTS.regular;const ref=(typeof famParams==='function'?famParams(D,wName):D);
    if(p.wdth!=null&&ref&&ref.wdth)k=p.wdth/ref.wdth;}catch(e){}
  return r0*k;
}
function metaWidthClass(r){
  if(r==null)return 5;
  const T=[0.45,0.55,0.65,0.78,1.00,1.15,1.30,1.60];
  let i=0;while(i<T.length&&r>=T[i])i++;
  return i+1;
}
/* PANOSE: десять цифр по параметрам. ctx: {fontId, p (параметры), italic, wClass, wr (отношение Н), heights:{x,cap,asc}} */
function metaPanose(ctx){
  const fam=Object.assign({},META_FAM_DEF,META_FAM[ctx.fontId]||{}),p=ctx.p;
  const cap=ctx.heights.cap||p.capH||700,xh=ctx.heights.x||p.xh||500;
  const sc=p.stem/cap;
  /* FIX-ENGINE: цифра веса PANOSE = usWeightClass (100→2 … 900→10), а не замер ствола: имя веса, класс и PANOSE не расходятся */
  const wc=ctx.wClass,wt=wc?Math.max(2,Math.min(11,Math.round(wc/100)+1)):(sc<0.045?2:sc<0.065?3:sc<0.09?4:sc<0.14?5:sc<0.16?6:sc<0.18?7:sc<0.225?8:sc<0.265?9:sc<0.34?10:11);
  const hs=p.hair/Math.max(1,p.stem);
  const contrast=hs>=0.97?2:hs>=0.85?3:hs>=0.7?4:hs>=0.55?5:hs>=0.42?6:hs>=0.32?7:hs>=0.22?8:9;
  const slanted=(+p.slant||0)>=2;
  const r=ctx.wr;
  if(fam.kind===3){
    /* рукописный: инструмент, вес, расстановка, пропорции, контраст, топология, форма, концевые, высота строчных */
    const asc=ctx.heights.asc||p.asc||xh*1.5,xa=xh/asc;
    const asp=r==null?4:r<0.45?2:r<0.65?3:r<1.15?4:r<1.6?5:6;
    const conn=(p.conn||0)>=50;
    const form=(+p.slant||0)>=24?10:slanted?7:3;
    return [3,3,wt,2,asp,contrast,conn?7:5,form,10,xa<0.45?2:xa<0.55?3:xa<0.65?4:xa<0.75?5:6];
  }
  const prop=(p.mono?9:r==null?4:r<0.45?8:r<0.65?6:r<1.00?4:r<1.30?5:7);
  const stroke=contrast<=3?2:(fam.axis==='diag'?3:5);
  const lf={contact:2,rounded:6,square:8}[fam.form]||2;
  const xr=xh/cap;
  return [2,fam.serif,wt,prop,contrast,stroke,fam.arm,lf+(slanted?7:0),2,xr<0.62?2:xr<0.78?3:4];
}
function metaPanoseText(pan){
  const T=pan[0]===3?META_PAN_SCR:META_PAN_TXT;
  return T.map((t,i)=>({k:t[0],v:t[1][pan[i]]!=null?t[1][pan[i]]:String(pan[i])}));
}
/* допустимые значения для проверки: максимальная цифра по позициям */
/* ulUnicodeRange: 4 слова (Uint) */
function metaUniRanges(cps){
  const bits=new Set();
  for(const c of cps){
    let lo=0,hi=META_UR.length-1;
    while(lo<=hi){const m=(lo+hi)>>1,r=META_UR[m];if(c<r[0])hi=m-1;else if(c>r[1])lo=m+1;else{bits.add(r[2]);break;}}
    if(c>0xFFFF)bits.add(57);
  }
  const w=[0,0,0,0];bits.forEach(b=>{w[b>>5]=(w[b>>5]|(1<<(b&31)))>>>0;});
  return {words:w,bits:[...bits].sort((a,b)=>a-b)};
}
/* ulCodePageRange: страница поддержана, если есть все буквы и ≥ 75 % остальных знаков */
function metaCodePages(cpSet){
  const bits=[];
  for(const k of Object.keys(META_CP)){
    let L=0,Lh=0,O=0,Oh=0;
    const skip=k==='0'?'ÐÞðþ':'';/* FIX-ENGINE: Ð Þ ð þ (исландский/фарерский) для западноевропейской CP1252 не обязательны */
    for(const c of META_CP[k]){if(skip.includes(c))continue;const has=cpSet.has(c.codePointAt(0));if(/[\p{Lu}\p{Ll}\p{Lt}]/u.test(c)&&c!=='ƒ'&&c!=='µ'){L++;if(has)Lh++;}else{O++;if(has)Oh++;}}
    if(L===Lh&&(!O||Oh/O>=0.75))bits.push(+k);
  }
  const w=[0,0];bits.forEach(b=>{w[b>>5]=(w[b>>5]|(1<<(b&31)))>>>0;});
  return {words:w,bits:bits.sort((a,b)=>a-b)};
}
const metaBlockNames=bits=>bits.map(b=>META_UR_NAMES[b]).filter(Boolean);
/* общий расчёт: из него берут и таблицы экспорта, и экран «О шрифте» */
function metaCompute(ctx){
  const fontId=ctx.fontId,fam=Object.assign({},META_FAM_DEF,META_FAM[fontId]||{});
  const p=ctx.st.p,italic=!!ctx.italic;
  const wr=metaWidthRatio(fontId,p,ctx.wName,italic?'italic':'regular');
  const widthClass=metaWidthClass(wr);
  const g=ch=>{for(const gl of ctx.glyphs){if(gl.uni===ch.codePointAt(0)){const b=metaBox(gl.cs);if(b)return b;}}return null;};
  const hx=(g('x')||g('х')||g('z')),hc=(g('H')||g('Н')),ha=(g('d')||g('l')||g('б'));
  const heights={x:hx?Math.round(hx.y1):Math.round(p.xh),cap:hc?Math.round(hc.y1):Math.round(p.capH),asc:ha?Math.round(ha.y1):Math.round(p.asc||0)};
  const panose=metaPanose({fontId,p,italic,wClass:ctx.wClass,wr,heights});
  const ur=metaUniRanges(ctx.cps),cp=metaCodePages(new Set(ctx.cps));
  const fsSel=(italic?1:0)|(ctx.isBold?32:0)|(!italic&&!ctx.isBold?64:0)|128;
  return {fontId,weightClass:ctx.wClass,widthClass,widthName:META_W_NAMES[widthClass],weightWord:metaWeightWord(ctx.wClass),
    wr,heights,panose,panoseText:metaPanoseText(panose),ur,cp,fsSel,familyClass:fam.cls,
    blocks:metaBlockNames(ur.bits),codePages:cp.bits.map(b=>META_CP_NAMES[b]).filter(Boolean)};
}
/* ---- сериализация таблиц ---- */
function metaDesc(fontId){
  let d='';
  try{if(typeof fmeta==='function')d=fmeta(fontId).desc||'';}catch(e){}
  if(!d&&typeof FONTS!=='undefined'&&FONTS[fontId])d=FONTS[fontId].desc||FONTS[fontId].tag||'';
  return d;
}
function metaNameTable(ctx,m){
  const en={},ru={};
  Object.keys(ctx.strs).forEach(k=>{en[k]=ctx.strs[k];});
  /* FIX-ENGINE: имена 256/257 (подпись ss01/ss02) нужны только если в GSUB есть признак, который на них ссылается */
  for(const id of [256,257])if(en[id]!=null&&!(ctx.nameIds&&ctx.nameIds.includes(id)))delete en[id];
  const lang=(typeof langCover==='function')?langCover(ctx.fontId,ctx.cpsSet).filter(r=>r.status==='full').map(r=>r.name):[];
  const wn=ctx.wName+(ctx.italic?' Italic':'');
  en[10]=ctx.family+' '+wn+': parametric typeface made in G-type. Weight class '+ctx.wClass+', width class '+m.widthClass+
    ', '+ctx.glyphCount+' glyphs, scripts: '+(m.ur.bits.includes(9)?'Cyrillic':'')+(m.ur.bits.includes(9)&&(m.ur.bits.includes(0))?' + ':'')+(m.ur.bits.includes(0)?'Latin':'')+
    (lang.length?'; '+lang.length+' languages (letters, punctuation and quotation marks).':'.');
  const d=metaDesc(ctx.fontId);if(d)ru[10]=d;
  /* RS10: Stroka passport — copyright, manufacturer, designer, license (SIL OFL 1.1) and its URL */
  if(ctx.fontId==='stroka'){en[0]='© 2026 G-type';en[8]='G-type';en[9]='G-type';en[13]='SIL Open Font License 1.1';en[14]='https://openfontlicense.org';}
  /* m43: подпись автора из профиля (GT_AUTHOR задаёт интерфейс; в Node его нет, поэтому эталонные хеши не меняются): ID 9 — имя, ID 12 — сайт */
  if(typeof GT_AUTHOR!=='undefined'&&GT_AUTHOR&&GT_AUTHOR.name){en[9]=String(GT_AUTHOR.name).slice(0,60);if(GT_AUTHOR.url)en[12]=String(GT_AUTHOR.url).slice(0,200);}
  /* лицензия из профиля: GT_LICENSE(fontId) -> {txt,url}|null (задаёт интерфейс; в Node его нет, эталонные хеши не меняются): ID 13 — описание, ID 14 — ссылка (нет ссылки: ID 14 не пишется) */
  if(typeof GT_LICENSE==='function'){const lc=GT_LICENSE(ctx.fontId);if(lc&&lc.txt){en[13]=String(lc.txt).slice(0,200);if(lc.url)en[14]=String(lc.url).slice(0,200);else delete en[14];}}
  const recs=[];
  const add=(lid,o)=>Object.keys(o).map(Number).sort((a,b)=>a-b).forEach(id=>{recs.push([lid,id,utf16(String(o[id]))]);});
  add(0x409,en);add(0x419,ru);
  const name=new BW(),store=[];let off=0;
  recs.forEach(r=>{r.push(off);store.push(...r[2]);off+=r[2].length;});
  name.u16(0).u16(recs.length).u16(6+recs.length*12);
  recs.forEach(r=>name.u16(3).u16(1).u16(r[0]).u16(r[1]).u16(r[2].length).u16(r[3]));
  name.bytes(store);return name.b;
}
function metaOS2(ctx,m){
  const os2=new BW(),VM=ctx.VM,p=ctx.st.p,cps=ctx.cps;
  const adv=ctx.glyphs.map(g=>g.adv).filter(a=>a>0);
  const avg=adv.length?Math.round(adv.reduce((a,b)=>a+b,0)/adv.length):0;
  const bmp=cps.filter(c=>c<=0xFFFF);
  os2.u16(4).i16(avg).u16(ctx.wClass).u16(m.widthClass).u16(0)
     .i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350)
     .i16(Math.max(20,Math.round(p.stem*0.4))).i16(Math.round(m.heights.x*0.6)).i16((m.familyClass[0]<<8)|m.familyClass[1])
     .bytes(m.panose)
     .u32(m.ur.words[0]).u32(m.ur.words[1]).u32(m.ur.words[2]).u32(m.ur.words[3])
     .tag('GTYP').u16(m.fsSel).u16(Math.min(0xFFFF,bmp[0]||32)).u16(Math.min(0xFFFF,bmp[bmp.length-1]||0x2116))
     .i16(VM.asc).i16(VM.desc).i16(VM.gap).u16(VM.winAsc).u16(VM.winDesc)
     .u32(m.cp.words[0]).u32(m.cp.words[1]).i16(m.heights.x).i16(m.heights.cap).u16(0).u16(32).u16(ctx.maxCtx||1);
  return os2.b;
}
/* gasp v1: до 8 ppem — сглаживание без привязки к сетке (0x0A = DOGRAY | SYMMETRIC_SMOOTHING), дальше — сетка + сглаживание (0x0F) */
function metaGasp(){const g=new BW();g.u16(1).u16(2).u16(8).u16(0x000A).u16(0xFFFF).u16(0x000F);return g.b;}
function metaTables(ctx){
  ctx.cps=ctx.cps||ctx.glyphs.filter(g=>g.uni!=null).map(g=>g.uni).sort((a,b)=>a-b);
  ctx.cpsSet=new Set(Array.from(ctx.cps,c=>String.fromCodePoint(c)));
  ctx.glyphCount=ctx.glyphs.length;
  const m=metaCompute(ctx);
  const head=ctx.head.slice();head[16]=0;head[17]=3;
  return {'OS/2':metaOS2(ctx,m),'name':metaNameTable(ctx,m),'gasp':metaGasp(),'head':head};
}
/* паспорт для интерфейса: те же числа без сборки файла. state — как у buildTTF; styleKey — 'regular'|'italic' */
function metaPassport(state,styleKey,opts){
  opts=opts||{};
  const st=state.styles[styleKey],fontId=opts.fontId||CUR_FONT,f=FONTS[fontId];
  const glyphs=[];
  for(const ch of CHARSET){const fg=finalGlyph(ch,st,state.edits);if(fg)glyphs.push({uni:ch.codePointAt(0),adv:Math.round(fg.adv),cs:fg.cs});}
  const w=(typeof weightOf==='function')?weightOf(st.p):{weight:400,name:'Regular'};
  const wClass=opts.weight||w.weight,wName=opts.weightName||w.name;
  const ctx={fontId,st,italic:styleKey==='italic',wClass,wName,isBold:/^bold$/i.test(wName),glyphs,
    cps:glyphs.map(g=>g.uni).sort((a,b)=>a-b)};
  const m=metaCompute(ctx);
  const cpsSet=new Set(Array.from(ctx.cps,c=>String.fromCodePoint(c)));
  const lang=(typeof langCover==='function')?langCover(fontId,cpsSet):[];
  return Object.assign(m,{wName,glyphCount:ctx.cps.length,family:state.family||(f&&f.family)||'',italic:ctx.italic,lang,
    panoseHex:m.panose.join(' '),classText:(META_FAMCLASS[m.familyClass[0]]||'')});
}
/* FIX-ENGINE: шрифты, зарегистрированные после core_basic_n1 (Пиксель, Аппликация, Сцепка), тоже получают пробелы и цифровое тире */
if(typeof basicExtras==='function')for(const id of Object.keys(FONTS))basicExtras(id);
