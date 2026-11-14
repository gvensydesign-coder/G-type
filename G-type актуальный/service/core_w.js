/* ===== Вес шрифта: определение по толщине и параметры семейства =====
   Толщина меряется отношением ствола к высоте строчных (stem/xh): Вольт по умолчанию 236/540≈0.44 — Bold,
   Квадра 150/530≈0.28 и Кодекс 140/500≈0.28 — Regular. Семейство строится к фиксированным отношениям,
   поэтому имя каждого веса соответствует его фактической толщине (для Вольта Bold = текущие настройки). */
const WCLASS=[[0.17,200,'ExtraLight'],[0.263,300,'Light'],[0.33,400,'Regular'],[0.37,500,'Medium'],[0.41,600,'SemiBold'],[0.46,700,'Bold'],[0.505,800,'ExtraBold'],[1e9,900,'Black']];
/* плотность конструкции: унциал Кодекса с засечками и узкими чашами «забивается» раньше гротеска —
   его шкала весов сдвинута (те же имена при меньшем stem/xh) */
const WSCALE={codex:0.86,stroka:0.67};
const wScale=()=>WSCALE[typeof CUR_FONT==='string'?CUR_FONT:'']||1;
/* FX80 C14: шрифт, собранный из нарисованных знаков, всегда «Regular»: суффикс в файле и nameID 2 не прыгают от толщины штриха между сборками */
function impDrawnFont(){if(typeof CUR_FONT==='undefined'||CUR_FONT!=='imp'||typeof IMP==='undefined'||!IMP.glyphs)return false;
  if(IMP._dv!==IMP.ver){IMP._dv=IMP.ver;IMP._dr=Object.keys(IMP.glyphs).some(k=>IMP.glyphs[k]&&IMP.glyphs[k].src==='draw');}return IMP._dr;}
function weightOf(p){const q=safeP(p);const r=q.stem/q.xh/wScale();if(impDrawnFont())return {r,weight:400,name:'Regular'};for(const [lim,wc,wn] of WCLASS)if(r<lim)return {r,weight:wc,name:wn};}
/* названия насыщенности по-русски (ParaType): в интерфейсе и меню экспорта; имена файлов и стилей (Light/Regular/Bold/Black) не меняются */
const WN_RU={Thin:'Сверхсветлое',ExtraLight:'Сверхсветлое',Light:'Светлое',Regular:'Нормальное',Medium:'Полужирное',SemiBold:'Полужирное',Bold:'Жирное',ExtraBold:'Сверхжирное',Black:'Сверхжирное'};
const wnRu=n=>WN_RU[n]||n;
/* веса семейства: имя, usWeightClass, целевое stem/xh */
const FAM_W=[['Light',300,0.22],['Regular',400,0.315],['Bold',700,0.437],['Black',900,0.53]];
/* ближайший вес семейства к текущим настройкам */
function famNearest(p){const r=weightOf(p).r;/* r уже в шкале шрифта */let b=FAM_W[0],bd=1e9;for(const w of FAM_W){const d=Math.abs(Math.log(r/w[2]));if(d<bd){bd=d;b=w;}}return b[0];}
/* ширина: тяжелее — шире (и при сильном утолщении относительно исходных настроек), иначе просветы ы, в, e схлопываются */
/* параметры веса wn из текущих параметров p: ствол к целевому отношению, горизонтали мягче,
   в тяжёлых — шире апертура, круглее и крупнее просветы, тоньше врезки; в светлых — наоборот */
/* лестница горизонталей: hair/stem по весам Light/Regular/Bold/Black */
const FAM_HAIR={volt:{Light:0.64,Regular:0.594,Bold:0.517,Black:0.478},kvadra:{Light:0.829,Regular:0.689,Bold:0.543,Black:0.494},stroka:{Light:0.94,Regular:0.89,Bold:0.85,Black:0.75}};
function famParams(p,wn){
  const w=FAM_W.find(x=>x[0]===wn);if(!w)return {...p};
  const q0=safeP(p),r0=q0.stem/q0.xh/wScale();
  const out={...p};
  const stem=Math.min(Math.round(p.stem*w[2]/r0),Math.floor(q0.xh*0.5));
  const k=stem/p.stem;out.stem=stem;
  /* поля: тяжёлые веса чуть шире (sb ~ stem^0.3, до +20%); лёгкие не уже исходных — оптическая компенсация диагоналей работает от глубины зоны,
     а не от sb, и в уменьшенных полях диагонали расходились бы. У соединяемой Прописи sb=0 — не трогаем */
  if(p.sb>0)out.sb=Math.round(p.sb*Math.min(1.2,Math.max(1,Math.pow(k,0.3))));
  const heavy=Math.max(0,Math.min(1,(w[2]/0.437-1)/0.21)),light=Math.max(0,Math.min(1,(1-w[2]/0.437)/0.5));
  /* горизонтали: до Bold — как ствол^0.85, тяжелее Bold — заметно медленнее (^0.3), чтобы не забивать просветы */
  const kB=Math.min(k,0.437/r0),kH=k/kB;
  out.hair=Math.round(p.hair*Math.pow(kB,0.85)*Math.pow(kH,0.3));
  /* в весах тяжелее исходного горизонталь не толще ~0.24·xh — иначе у e, a, s, э схлопываются просветы */
  if(k>1)out.hair=Math.max(Math.round(p.hair*(1-0.1*heavy)),Math.min(out.hair,Math.round(q0.xh*(0.24-0.02*heavy))));
  /* Кодекс расширяет просветы тяжёлых весов в самой конструкции (cxWx, core7) — общий масштаб ширины растёт втрое слабее */
  const wdK=CUR_FONT==='codex'?0.35:1;
  if(p.wdth!=null)out.wdth=Math.round(Math.min(140,Math.max(80,p.wdth*(1+wdK*(0.09*heavy-0.03*light+(k>1?0.08*Math.min(1,(k-1)/0.6):0))),wdK<1?0:p.wdth+(120-p.wdth)*heavy)));
  /* Строка — текстовый гротеск: тяжёлые веса растут в ширину слабо (Black ≈ +5%), Regular = исходная ширина, а не до 120 */
  if(CUR_FONT==='stroka'&&p.wdth!=null){const tl=Math.log(w[2]/0.315);out.wdth=Math.round(p.wdth*(1+(tl<0?0.03:0.095)*tl));}
  if(p.aper!=null)out.aper=Math.round(Math.min(50,p.aper*(1+0.38*heavy-0.15*light)));
  if(p.innerR!=null)out.innerR=Math.round(Math.min(1.4,Math.max(0.5,p.innerR*(1+0.15*heavy-0.05*light)))*100)/100;
  if(p.join!=null)out.join=Math.round(Math.min(60,p.join*(1-0.45*heavy+0.25*light)));
  /* Вольт/Квадра: лестница горизонталей строго растёт по весам (в абсолютных единицах), контраст hz/stem падает к тяжёлым;
     потолок — paramLimits (просветы в, е, а, э при x-высоте 530–540: ≈130 u). Отношения заданы к штриху при контрасте по умолчанию
     (Вольт Bold = текущие настройки), пользовательский контраст сохраняется множителем c */
  /* межсловный пробел Вольта/Квадры ≈ 1/3 кегля и растёт с шириной (вполовину), не выше 340 */
  if((CUR_FONT==='volt'||CUR_FONT==='kvadra'||CUR_FONT==='stroka')&&p.space>0&&p.wdth>0&&out.wdth>0)out.space=Math.min(340,Math.round(p.space*(1+0.5*(out.wdth/p.wdth-1))));
  const HR=FAM_HAIR[typeof CUR_FONT==='string'?CUR_FONT:''];
  if(HR&&HR[wn]!=null&&p.hair>0&&p.stem>0){const D=FONTS[CUR_FONT].DEFAULTS[p.ital?'italic':'regular'],c=(p.hair/p.stem)/(D.hair/D.stem);
    out.hair=Math.round(out.stem*HR[wn]*c);
    const Lh=paramLimits(out).L.hair;if(Lh)out.hair=Math.max(Math.ceil(Lh[0]),CUR_FONT==='stroka'?out.hair:Math.min(out.hair,Math.floor(Lh[1])));}
  return out;
}
/* Вольт/Квадра: классовый кернинг точки/запятой после открытых справа знаков (7 Р Г Ф Т Ч): интервал до точки не шире межсловного пробела.
   Таблица базовая из core15; здесь — усиление строк per и новая строка для 7 (значения по-прежнему измеряются при экспорте, KERN_MAX не меняется) */
(function(){if(typeof KERN_TABLE==='undefined'||typeof KERN_TABLE_BASE==='undefined')return;
  const strong={'T|per':1,'P|per':1,'F|per':1},add=[['d7','per',1],['Y','per',1]];
  const t=KERN_TABLE_BASE.map(r=>(r[1]==='per'&&strong[r[0]+'|per']!=null)?[r[0],r[1],strong[r[0]+'|per']]:r.slice());
  for(const r of add)if(!t.some(q=>q[0]===r[0]&&q[1]===r[1]))t.push(r);
  KERN_TABLE.volt=t;KERN_TABLE.kvadra=t.map(r=>r.slice());KERN_TABLE.stroka=t.map(r=>r.slice());
})();
