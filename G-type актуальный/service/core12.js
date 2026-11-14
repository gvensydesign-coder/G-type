/* ===== Три шрифта G-type ===== */
(function(){
  const GG=buildGrotesk();const base=FONTS.volt;
  const GP={round:['Округлость овалов',0.3,1,0.01],kappa:['Натяжение кривых',0,0.8,0.01],innerR:['Округлость просветов',0.5,1.4,0.01],spur:null,optic:null,rough:null};
  const V0={wdth:116,capH:700,xh:540,asc:760,desc:210,stem:236,hair:122,diag:1,optic:0,round:0.62,kappa:0.62,innerR:1,spur:0,ov:10,slant:0,sb:38,track:-6,space:330,stemScale:0,tabular:0,mono:0,rough:0,opsp:100,aper:22,bar:53,mv:22,trap:0,join:25,icomp:0};
  FONTS.volt=Object.assign({},base,{GL:GG,
    id:'volt',name:'Вольт',family:'Volt Grotesk',tag:'Широкий гротеск · нуар',
    desc:'Широкий тяжёлый гротеск: мощные вертикали, тонкие горизонтали, плоские срезы концов. Пресеты — Нуар, Глыба, Скос.',
    sample:'ВОЛЬТ Noir 2077',
    DEFAULTS:{regular:{...V0},italic:{...V0,wdth:112,stem:229,hair:118,slant:10,space:320,icomp:45,ital:1}},
    params:GP,
    methods:[
      ['Характер','Готовые системы штриха на одном скелете.',[['Нуар',{stem:236,hair:122,wdth:116,round:0.62,kappa:0.62,aper:22,trap:0,mv:22,sb:38,join:25}],
        ['Глыба',{stem:300,hair:150,wdth:132,round:0.42,kappa:0,aper:12,trap:60,mv:30,sb:40,join:50}],
        ['Скос',{stem:196,hair:110,wdth:82,round:0.38,kappa:0,aper:16,trap:0,mv:14,sb:30}],
        ['Мягкий',{stem:220,hair:130,wdth:112,round:1,kappa:0.56,aper:26,trap:0,mv:0,sb:40}]]],
      ['Вес','Толщина вертикалей и горизонталей.',[['Полужирный',{stem:170,hair:96}],['Жирный',{stem:236,hair:122}],['Чёрный',{stem:290,hair:148}]]],
      ['Контраст','Горизонтали относительно вертикалей.',[['Низкий',{hair:p=>Math.round(p.stem*0.82)}],['Средний',{hair:p=>Math.round(p.stem*0.62)}],['Высокий',{hair:p=>Math.round(p.stem*0.45)}]]],
      ['Ширина','Общая ширина знаков.',[['Узкий',{wdth:86}],['Обычный',{wdth:104}],['Широкий',{wdth:116}],['Экстра',{wdth:132}]]],
      ['Апертура','Насколько раскрыты концы у С, Э, З, 2, 3, 5, 6.',[['Закрытая',{aper:10}],['Средняя',{aper:22}],['Открытая',{aper:38}]]],
      ['Ловушки','Вырезы в острых внутренних углах: держат форму в жирном.',[['Нет',{trap:0}],['Лёгкие',{trap:40}],['Глубокие',{trap:80}]]],
    ]});
  /* l с хвостом несимметрична по замыслу: проверка симметрии (ui_c, SYM) её пропускает */
  FONTS.volt.proof={asymSkip:'lł'};
  const K0={wdth:104,capH:700,xh:530,asc:750,desc:210,stem:150,hair:126,diag:1,optic:0,round:0.95,kappa:0.56,innerR:1.05,spur:0,ov:12,slant:0,sb:52,track:2,space:310,stemScale:0,tabular:0,mono:0,rough:0,opsp:100,aper:34,bar:52,mv:0,trap:0,join:20,icomp:0};
  FONTS.kvadra=Object.assign({},base,{GL:GG,
    id:'kvadra',name:'Квадра',family:'Kvadra Sans',tag:'Нейтральный гротеск',
    desc:'Спокойный гротеск с почти круглыми овалами и низким контрастом — для текста и интерфейсов.',
    sample:'Квадра Sans 2026',
    DEFAULTS:{regular:{...K0},italic:{...K0,wdth:101,stem:146,hair:123,slant:9,space:305,icomp:45,ital:1}},
    params:GP,
    methods:[
      ['Вес','Толщина штриха.',[['Светлый',{stem:86,hair:78}],['Обычный',{stem:150,hair:126}],['Полужирный',{stem:196,hair:160}],['Чёрный',{stem:250,hair:196}]]],
      ['Контраст','Горизонтали относительно вертикалей.',[['Монолиния',{hair:p=>p.stem}],['Лёгкий',{hair:p=>Math.round(p.stem*0.84)}],['Заметный',{hair:p=>Math.round(p.stem*0.66)}]]],
      ['Овал','Форма круглых знаков.',[['Круглый',{round:0.98,kappa:0.56}],['Мягкий квадрат',{round:0.7,kappa:0.64}],['Квадратный',{round:0.4,kappa:0.6}]]],
      ['Ширина','Общая ширина знаков.',[['Узкий',{wdth:88}],['Обычный',{wdth:104}],['Широкий',{wdth:122}]]],
      ['Апертура','Насколько раскрыты концы у С, Э, З, 2, 3, 5, 6.',[['Закрытая',{aper:18}],['Средняя',{aper:34}],['Открытая',{aper:48}]]],
    ]});
  FONTS.kvadra.proof={asymSkip:'lł'};
  /* Кодекс: спокойнее по умолчанию, без новых параметров гротеска */
  const cd=FONTS.codex;delete FONTS.codex;
  for(const st of ['regular','italic'])Object.assign(cd.DEFAULTS[st],{stem:140,hair:50,diag:25,round:0.75,spur:0,icomp:st==='italic'?35:0});
  cd.params=Object.assign({},cd.params,{aper:null,bar:null,mv:null,trap:null,join:null,rough:null});
  /* (Y1) ползунки Кодекса: минимум пера 90 (ниже рвутся 5, 2, S, у K замыкается развилка), вензеля до «Пышных» (240) — дальше петли заливают прописные */
  cd.params.stem=['Основной штрих (широкая сторона)',90,220,1];cd.params.spur=['Росчерки, размер',0,240,1];
  FONTS.codex=cd;
})();
/* стартовое состояние — Вольт */
DEFAULTS.regular={opsp:100,...FONTS.volt.DEFAULTS.regular};DEFAULTS.italic={opsp:100,...FONTS.volt.DEFAULTS.italic};
