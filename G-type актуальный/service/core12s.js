/* ===== Строка Sans (stroka): регистрация шрифта ===== */
(function(){
  const kv=FONTS.kvadra,V=FONTS.volt;
  const G={};for(const ch in V.GL)G[ch]=Object.assign({},V.GL[ch]);
  /* RS10: palochka Ӏ ӏ = capital I (same outline and width) */
  if(G['I']){for(const ch of 'Ӏӏ')G[ch]=Object.assign({},G['I'],{opt:Object.assign({},G['I'].opt)});}
  /* ширины Строки: цифры на близкой ширине (табличные при желании), нуль уже O — не читается как буква; Ы/Ъ чуть уже, ß и @ по системе */
  for(const ch of '02356 89'.replace(' ','')){const e=G[ch];if(e&&typeof e.w==='number')e.w=ch==='0'?560:580;}
  /* RS11: ф Ф — two bowls around the stem need more width (counters as open as о) */
  for(const ch of 'фФ'){const e=G[ch];if(e){const o=e.w;e.w=typeof o==='function'?(p=>o(p)*1.14):o*1.14;}}
  /* RS10: digit side-bearings (proportional only, sbl/sbr) + tabular extra (sbt); Regular units at sb 52, scaled by p.sb */
  {const DS={'0':[7,7],'1':[15,0],'2':[19,9],'3':[18,6],'4':[20,0],'5':[10,5],'6':[0,13],'7':[19,14],'8':[7,7],'9':[13,0]};
   for(const ch in DS){const e=G[ch];if(!e)continue;const [a,b]=DS[ch];
     e.opt=Object.assign({},e.opt,{sbl:p=>Math.round(a*p.sb/52),sbr:p=>Math.round(b*p.sb/52),sbt:p=>Math.round(11*p.sb/52)});}}
  /* RS10: S and C side-bearings (Light/Regular ST 63, BC-CD tight): +8 / +5 per side */
  for(const [chs,v] of [['SЅ',8],['CСЄ',5]])for(const ch of chs){const e=G[ch];if(!e)continue;e.opt=Object.assign({},e.opt,{sbl:p=>Math.round(v*p.sb/52),sbr:p=>Math.round(v*p.sb/52)});}
  if(G['4']&&typeof G['4'].w==='number')G['4'].w=600;if(G['7']&&typeof G['7'].w==='number')G['7'].w=560;
  const P0={wdth:94,capH:700,xh:525,asc:740,desc:205,stem:111,hair:99,diag:1,optic:0,round:1,kappa:0.6,innerR:1.35,spur:0,ov:10,slant:0,sb:54,track:0,space:300,stemScale:0,tabular:0,mono:0,rough:0,opsp:100,aper:30,bar:52,mv:0,trap:0,join:0,icomp:0,stk:1};
  FONTS.stroka=Object.assign({},kv,{GL:G,CHARSET:kv.CHARSET.concat(G['Ӏ']?['Ӏ','ӏ']:[]),GROUPS:kv.GROUPS.map(x=>x.slice()),
    id:'stroka',name:'Строка',family:'Stroka Sans',tag:'Текстовый гротеск',
    desc:'Классический текстовый гротеск для интерфейсов и сплошного набора.',sample:'Строка Sans 2026',
    DEFAULTS:{regular:{...P0},italic:{...P0,wdth:93,slant:9,space:295,icomp:45,ital:1}},
    params:kv.params,
    methods:[
      ['Вес','Толщина штриха.',[['Светлый',{stem:74,hair:69}],['Обычный',{stem:106,hair:94}],['Полужирный',{stem:147,hair:123}],['Чёрный',{stem:178,hair:128}]]],
      ['Контраст','Горизонтали относительно вертикалей.',[['Монолиния',{hair:p=>p.stem}],['Лёгкий',{hair:p=>Math.round(p.stem*0.89)}],['Заметный',{hair:p=>Math.round(p.stem*0.74)}]]],
      ['Овал','Форма круглых знаков.',[['Круглый',{round:1,kappa:0.55}],['Квадрокруг',{round:1,kappa:0.62}],['Мягкий квадрат',{round:0.8,kappa:0.66}]]],
      ['Ширина','Общая ширина знаков.',[['Узкий',{wdth:86}],['Обычный',{wdth:94}],['Широкий',{wdth:104}]]],
      ['Апертура','Насколько раскрыты концы у с, е, а, З, 2, 3, 5, 6.',[['Закрытая',{aper:18}],['Средняя',{aper:30}],['Открытая',{aper:44}]]],
    ]});
  const KG_STROKA=30;
  /* RS10: Stroka kerning — class table measured from Stroka outlines (per-font min-gap cap, extra side-profile classes incl. Cyrillic) */
  FONTS.stroka.kernGap=KG_STROKA;FONTS.stroka.kernD=2.6;FONTS.stroka.kernF=0.62;
  FONTS.stroka.kcL={Ls:'Л',ls:'л',Ch:'Чч',Yc:'УЎуўү',Tc:'ТГ'};
  FONTS.stroka.kcR={st:'bhkmnprвгеийкнпрцчшщьыюмлБВГЕИКНПРШЬЫHNMEFBDKRILPUhnmrbkpиийкмнпцчшщвгьыэюя',Ch:'ЧЦ',Hd:'Ъ'};
  {const T=FONTS.stroka.kernRows=[
    ['T','st',0.35],['Y','st',0.65],['V','st',0.3],['F','st',0.2],['P','st',0.2],
    ['Ls','v',2.1],['Ls','Y',1.2],['Ls','T',0.5],['Ls','O',0.3],['ls','v',2.0],['ls','Y',1.0],['ls','l',0.3],
    ['O','Ls',0.5],['o','ls',0.3],['o','Ls',0.4],
    ['T','Ch',0.4],['Y','Ch',0.4],['v','Ch',0.3],
    ['P','gr',0.6],['P','qc',0.6],['P','hy',0.5],
    ['Yc','st',0.65],['v','st',0.25],['t','st',0.2]];}
  /* ширина Ц Щ Д с выносом базовой планки: + STK.ext(stem); Д — один вынос на обе стороны */
  for(const ch of 'цЦщЩдД'){const e=G[ch];if(!e)continue;const w0=e.w,x=('дД'.includes(ch)?(S=>2*STK.ext2(S)):STK.ext);e.w=p=>(typeof w0==='function'?w0(p):w0*p.wdth/100)+x(sE(p));}
  {const e1=G['u'];if(e1){const s1=e1.shape;e1.shape=g=>STK.on(g)?STK.u(g):s1(g);}}
  for(const ch of '@%'){const e2=G[ch];if(e2){const s2=e2.shape;e2.shape=g=>{if(!STK.on(g))return s2(g);STK.noE=true;try{return s2(g);}finally{STK.noE=false;}};}}
  {const mm=G['m'],ms=G['m.ss01'];if(mm&&ms){G['m']=Object.assign({},mm,{shape:ms.shape,w:ms.w});G['m.ss01']=Object.assign({},ms,{shape:mm.shape,w:mm.w,skel:mm.skel});FONTS.stroka.ss01Name='m в форме «м»';const sm=G['m'].shape;{const nn=G['n'];G['m'].w=p=>{const S=sE(p),wn=(typeof nn.w==='function'?nn.w(p):nn.w*p.wdth/100);return Math.max(1.6*wn,5.4*S);};}G['m'].shape=g=>STK.on(g)?STK.mArch(g):sm(g);}}
  {const e0=G['ß'];if(e0){const s0=e0.shape;e0.shape=g=>STK.on(g)?STK.ess(g):s0(g);}}
  /* бреве: полумесяц — толще в середине, концы сужаются (горизонтальный срез), по центру знака */
  const B0=GR.Breve;GR.Breve=function(k,x0,x1,y0){if(!(k.p&&k.p.stk))return B0.call(this,k,x0,x1,y0);
    const C=k.p.capH||700,cap=k.h>(k.p.xh||k.h)*1.05;let t=Math.min(Math.max(k.H*0.82,30),k.S*0.8);
    const ht=Math.min(t*1.6,C*(cap?0.17:0.2)),te=Math.max(t*0.3,12),xm=(x0+x1)/2,yt=y0+ht,K=0.5523,rx=xm-x0,ry=ht,rxi=xm-x0-te,ryi=ht-t,xi0=x0+te,xi1=x1-te;
    const N=(x,y,a,b)=>({x,y,a,b});
    return GRP(9,[mkc([N(x0,yt,null,{x:x0,y:yt-K*ry}),N(xm,y0,{x:xm-K*rx,y:y0},{x:xm+K*rx,y:y0}),N(x1,yt,{x:x1,y:yt-K*ry},null),
      N(xi1,yt,null,{x:xi1,y:yt-K*ryi}),N(xm,y0+t,{x:xm+K*rxi,y:y0+t},{x:xm-K*rxi,y:y0+t}),N(xi0,yt,{x:xi0,y:yt-K*ryi},null)],false)]);};
  /* RS10: one accent level per case: dots and macron rise to the top of the breve (Й Ё Ў / й ё ў) */
  for(const nm of ['dier','dot','macron']){const o=MK[nm];if(!o)continue;
    MK[nm]=function(k,cx,y,d){const cs=o.call(this,k,cx,y,d);if(!(k.p&&k.p.stk))return cs;
      const a=otBBoxY(cs),b=otBBoxY(GR.Breve(k,cx-d.mw*0.5,cx+d.mw*0.5,y));if(!a||!b)return cs;const dy=b[1]-a[1];
      return dy>0.5?xf(cs,(x,yy)=>[x,yy+dy]):cs;};}
  FONTS.stroka.proof={asymSkip:'lłuU'};
  KERN_TABLE.stroka=KERN_TABLE.stroka.filter(r=>r[0]!=='dg').map(r=>r[0]==='d7'?[r[0],r[1],0.3]:r).map(r=>r[1]==='per'?[r[0],r[1],(r[2]==null?0.6:r[2])*(r[0]==='P'||r[0]==='F'?0.55:0.75)]:r).concat(FONTS.stroka.kernRows);
})();
