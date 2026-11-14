/* ---------- рецепты знаков (юникейс; строчные = те же формы, мельче, со своим зерном) ----------
   Координаты: x 0..W, y 0..H (H = высота прописных), кусок = K.strip / K.rect / K.ring / K.arc / K.poly; gl:[dx,dy] = «приклеенный» кусок (зазор), направление от стыка к свободному концу */
const R=AREC,w=aWmin;
/* FX2g: корень полосы-ноги продлён назад по её оси (на долю длины), чтобы торец целиком лежал в стенке чаши и стойке: иначе между стойкой, низом чаши и косым торцом оставался замкнутый треугольник-пинхол (Bold/Black, 24-45 u²) */
const aBack=(p0,p1,f)=>[p0[0]+(p0[0]-p1[0])*f,p0[1]+(p0[1]-p1[1])*f];
/* ----- кириллица ----- */
R['А']={w:w(.9,3.0,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.55,0],[W*.465,H],a,a*.92),K.strip([W-b*.5,0],[W*.55,H-8],b*.9,b*.82),K.hs(W*.2,W*.84,H*.2,c*.6,H*.014)];}};
R['Б']={w:w(.66,2.2,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.82,W*.97,H-b*.42,b*.84,-H*.018,{gl:[1,0]}),
    K.ring(a*.45,0,W,H*.63,a*.66,c*.8,c*.95,c*.8,[K.sn(S*.2),[S*.9,'soft'],[S*.9,'soft'],0],[S*.14,S*.2,S*.2,S*.1])];}};
R['В']={w:w(.7,2.5,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,H*.45,W*.92,H,a*.66,b*.7,b*.92,b*.8,[0,0,[S*.9,'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0]),
    K.ring(a*.45,0,W,H*.6,a*.66,c*.8,c*.95,b*.75,[K.sn(S*.12),[S*.95,'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Г']={w:w(.52,1.7,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  let v=[V(0,0),V(a,0),V(a*1.02,H-b*.9),V(W,H-b*.82),V(W*.99,H),V(0,H)];v=aSnip(v,4,S*.3,true);return [K.poly(v)];}};
R['Д']={w:w(.78,2.8,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.6,fh=H*.17,ft=W*.15;
  const base=[V(0,-fh),V(ft,-fh),V(ft*1.1,0),V(W-ft*1.2,0),V(W-ft,-fh*.92),V(W,-fh*.92),V(W,bt),V(0,bt)];
  return [K.poly(base),K.strip([W*.27,bt*.4],[W*.45,H],a*.9,a*.82),K.strip([W*.74,bt*.4],[W*.57,H-6],b*.9,b*.8)];}};
R['Е']={w:w(.54,1.8,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.vs(a*.5,0,H,a,H*.008),K.hs(a*.3,W,H-b*.38,b*.76,-H*.014),K.hs(a*.82,W*.84,H*.5,c*.62,H*.02,{gl:[1,0]}),K.hs(a*.3,W*.95,d*.38,d*.76,H*.012)];}};
R['Ё']={w:R['Е'].w,f:K=>{const p=R['Е'].f(K),{H,S,W}=K,d=Math.max(.13*H,S*.64);
  p.push(K.dot(W*.28,H*1.1,d,{mark:1}),K.dot(W*.6,H*1.1,d,{mark:1}));return p;}};
R['Ж']={w:w(1.0,4,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.35,H],[W-a*.4,0],a*.92,a*.82),K.strip([W-b*.35,H],[b*.5,0],b*.86,b*.8),K.vs(W*.5,0,H,c*1.05,H*.01)];}};
R['З']={w:w(.62,2.2,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W*.48,H*.735,W*.43,H*.265,a*.92,a*.8,160,-90,5),K.arc(W*.5,H*.28,W*.5,H*.28,b*1.0,b*.84,92,-155,5)];}};
R['И']={w:w(.7,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.05,0,{tp:.84}),K.vs(W-b*.5,0,H,b*.88,H*.01),K.strip([a*.55,H*.07],[W-b*.55,H*.93],c*.8,c*.7)];}};
R['Й']={w:R['И'].w,f:K=>{const p=R['И'].f(K),{H,S,W}=K,t=Math.max(.1*H,S*.62);
  const v=[V(W*.26,H*1.07),V(W*.5,H*1.04,0),V(W*.74,H*1.07),V(W*.72,H*1.07+t,0),V(W*.5,H*1.07+t*.45,0),V(W*.28,H*1.07+t)];
  p.push(K.P([V(W*.24,H*1.18),V(W*.5,H*1.1,.28),V(W*.76,H*1.18),V(W*.74,H*1.18+t),V(W*.5,H*1.1+t*.7,0),V(W*.26,H*1.18+t)],{mark:1}));return p;}};
R['К']={w:w(.72,2.3,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.008),K.strip([a*.75,H*.42],[W-b*.4,H*.99],b*.84,b*.72),K.strip([a*.85,H*.52],[W-c*.4,0],c*.9,c*.8)];}};
R['Л']={w:w(.8,2.7,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.55,0],[W*.5,H],a*1.02,a*.9),K.strip([W-b*.5,0],[W*.6,H-10],b*.9,b*.82)];}};
R['М']={w:w(1.04,4,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.vs(a*.5,0,H,a,H*.012),K.vs(W-b*.5,0,H,b*.9,-H*.01),K.strip([a*.55,H*.95],[W*.5,H*.22],c*.8,c*.7),K.strip([W-b*.55,H*.95],[W*.5,H*.2],d*.78,d*.7)];}};
R['Н']={w:w(.72,2.3,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a*1.04,-H*.012),K.vs(W-b*.5,0,H,b*.88,H*.01,{tp:.9}),K.hs(a*.4,W-b*.4,H*.47,c*.6,H*.035)];}};
R['О']={w:w(.8,2.9,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H,a,c*.82,b,c*.78,[K.sn(S*.7,24),[K.sn(S*.7,24),'soft'],K.sn(S*.8,20),K.sn(S*.6,20)],[K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10)])];}};
R['П']={w:w(.74,2.4,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  let v=[V(0,0),V(a,0),V(a*1.02,H-c*.82),V(W-b,H-c*.8),V(W-b*.98,0),V(W,0),V(W,H),V(0,H)];v=aSnip(v,7,S*.3);return [K.poly(v)];}};
R['Р']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.008),K.ring(a*.45,H*.34,W,H,a*.66,c*.8,b*.95,c*.8,[0,0,[K.sn(S*.9),'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0])];}};
R['С']={w:w(.78,2.8,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.84,42,320,6)];}};
R['Т']={w:w(.78,2.6,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.hs(0,W,H-a*.4,a*.8,-H*.018),K.vs(W*.52,0,H-a*.5,b,-W*.02,{gl:[0,-1]})];}};
R['У']={w:w(.78,2.5,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([W-b*.35,H],[b*.3,0],b*.92,b*.84),K.strip([a*.3,H],[W*.47,H*.4],a*.86,a*.78)];}};
R['Ф']={w:w(.96,3.4,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(W*.5,0,H,a*.92,W*.008),K.ring(0,H*.2,W,H*.82,b*.9,b*.72,b,b*.72,[K.sn(S*.8,30),K.sn(S*.7,30),K.sn(S*.9,30),K.sn(S*.7,30)],[K.sn(S*.22,10),K.sn(S*.2,10),K.sn(S*.25,10),K.sn(S*.2,10)])];}};
R['Х']={w:w(.82,2.8,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.35,H],[W-a*.4,0],a*.96,a*.86),K.strip([W-b*.4,H*.98],[b*.5,0],b*.78,b*.7)];}};
R['Ц']={w:w(.72,2.5,210),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W-b*.45,bt*.8,-H*.24,b*.8,W*.05)];}};
R['Ч']={w:w(.66,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W-b*.5,0,H,b,H*.008),K.vs(a*.5,H*.34,H,a*.95,H*.01,{tp:1.05}),K.hs(a*.3,W-b*.3,H*.4,c*.76,-H*.03)];}};
R['Ш']={w:w(1.02,3.6,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W*.5,0,H,c*.9,W*.012)];}};
R['Щ']={w:w(1.06,3.7,250),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),bt=S*.62;
  let v=[V(0,0),V(W,0),V(W,H),V(W-b,H),V(W-b*1.02,bt),V(a,bt*1.04),V(a*1.02,H),V(0,H)];
  return [K.poly(v),K.vs(W*.5,0,H,c*.9,W*.012),K.vs(W-b*.4,bt*.8,-H*.25,b*.82,W*.06)];}};
R['Ь']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,0,W,H*.62,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Ъ']={w:w(.8,2.7,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),fl=W*.36;
  return [K.hs(0,fl+a*.5,H-c*.4,c*.8,H*.014),K.vs(fl+a*.5,0,H,a,H*.01),K.ring(fl,0,W,H*.72,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0])];}};
R['Ы']={w:w(.98,3.4,230),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),x2=W-b*.5,wb=W-b*1.3-S*.45;
  return [K.vs(a*.5,0,H,a,-H*.01),K.ring(a*.45,0,wb,H*.67,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.9),'soft'],K.sn(S*.2),0],[0,S*.3,S*.4,0]),K.vs(x2,0,H,b*.92,H*.008)];}};
R['Э']={w:w(.74,2.6,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.84,138,-138,6),K.hs(W*.26,W*.78,H*.5,b*.6,H*.012,{gl:[-1,0]})];}};
R['Ю']={w:w(1.04,3.9,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),x0=W*.36;
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.3,x0+b*.9,H*.5,c*.6,-H*.012),
    K.ring(x0,0,W,H,b*.95,c*.8,b*.9,c*.78,[K.sn(S*.7,24),[K.sn(S*.7,24),'soft'],K.sn(S*.8,20),K.sn(S*.6,20)],[K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10),K.sn(S*.2,10)])];}};
R['Я']={w:w(.68,2.3,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W-a*.5,0,H,a,-H*.008),K.ring(0,H*.38,W-a*.4,H,b*.9,c*.8,a*.66,c*.8,[0,0,0,[K.sn(S*.6,30),K.sn(S*.7,40)]],[S*.2,S*.1,0,S*.12]),
    K.strip([W*.64,H*.46],[b*.3,0],c*.9,c*.8,{gl:[-.5,-1]})];}};
/* ----- латиница (только то, чего нет в кириллице) ----- */
R['D']={w:w(.74,2.5,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.ring(a*.45,0,W,H,a*.66,c*.8,b*.95,c*.8,[0,[K.sn(S*.8,20),'soft'],K.sn(S*.8,20),0],[0,S*.2,S*.3,0])];}};
R['F']={w:w(.52,1.8,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.hs(a*.3,W,H-b*.38,b*.78,H*.016),K.hs(a*.82,W*.82,H*.5,c*.62,-H*.02,{gl:[1,0]})];}};
R['G']={w:w(.82,2.9,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.arc(W/2,H/2,W/2,H/2,a*1.02,b*.86,40,362,7),K.hs(W*.46,W*.97,H*.5,b*.64,H*.008)];}};
R['I']={w:w(.24,1.2,70),f:K=>{const {H,S,W}=K,a=K.s(0);return [K.vs(W/2,0,H,a*1.05,H*.012,{tp:.9})];}};
R['J']={w:w(.58,2.1,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=b*.82;
  let v=[V(0,0),V(W,0),V(W*1.0,H),V(W-a,H),V(W-a*1.02,c),V(a*.95,c*1.02),V(a*.95,H*.3),V(0,H*.3)];v=aSnip(v,1,S*.7,true);return [K.poly(v)];}};
R['L']={w:w(.54,1.9,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(a*.5,0,H,a,H*.01),K.hs(a*.3,W,b*.36,b*.74,H*.012)];}};
R['N']={w:w(.74,2.4,220),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,-H*.01),K.vs(W-b*.5,0,H,b*.92,H*.012),K.strip([a*.55,H*.93],[W-b*.55,H*.07],c*.84,c*.7)];}};
R['Q']={w:R['О'].w,f:K=>{const p=R['О'].f(K),{H,S,W}=K,a=K.s(2);
  p.push(K.strip([W*.6,H*.14],[W*1.06,-H*.16],a*.8,a*.74));return p;}};
R['R']={w:w(.64,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(a*.5,0,H,a,H*.01),K.ring(a*.45,H*.38,W*.96,H,a*.66,c*.8,b*.95,c*.8,[0,0,[K.sn(S*.9),'soft'],K.sn(S*.12)],[0,S*.3,S*.4,0]),K.strip(aBack([W*.4,H*.45],[W-b*.3,0],.11),[W-b*.3,0],c*.86,c*.78)];}};
R['S']={w:w(.62,2.2,150),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  /* FX2g: S из двух дуг не склеивалась (зазор между концом верхней и началом нижней): верхняя дуга заканчивается на 280° (было 262°), нижняя начинается на 95° (было 85°): концы заходят друг под друга — один кусок, как у склеенных полос */
  return [K.arc(W*.5,H*.735,W*.46,H*.265,a*.92,a*.8,18,280,5),K.arc(W*.5,H*.28,W*.5,H*.28,b*1.0,b*.84,95,-150,5)];}};
R['U']={w:w(.74,2.5,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2)*.84;
  let v=[V(0,H),V(a,H),V(a*1.02,c),V(W-b,c*1.02),V(W-b*.98,H),V(W,H),V(W,0),V(0,0)];v=aSnip(v,7,S*.55);v=aSnip(v,6,S*.75,true);return [K.poly(v)];}};
R['V']={w:w(.8,2.7,130),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.strip([a*.35,H],[W*.485,0],a*.92,a*.8),K.strip([W-b*.4,H*.98],[W*.525,0],b*.86,b*.78)];}};
R['W']={w:w(1.16,4.1,110),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),d=K.s(3);
  return [K.strip([a*.3,H],[W*.24,0],a*.88,a*.78),K.strip([W*.26,0],[W*.5,H*.82],c*.78,c*.7),K.strip([W*.5,H*.8],[W*.74,0],d*.78,d*.7),K.strip([W*.76,0],[W-b*.3,H*.98],b*.86,b*.78)];}};
R['Y']={w:w(.8,2.7,120),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.strip([a*.35,H],[W*.5,H*.44],a*.88,a*.8),K.strip([W-b*.35,H*.98],[W*.5,H*.44],b*.82,b*.76),K.vs(W*.5,0,H*.5,c,-W*.01)];}};
R['Z']={w:w(.68,2.3,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(0,W,H-a*.4,a*.76,-H*.012),K.strip([W-b*.4,H-a*.3],[b*.4,b*.3],b*.86,b*.78),K.hs(0,W*.98,c*.38,c*.78,H*.012)];}};
/* ----- цифры ----- */
R['0']={w:w(.62,2.1,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H,a*.95,c*.8,b*.95,c*.8,[K.sn(S*.7,20),K.sn(S*.6,20),[K.sn(S*.6,20),'soft'],K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)])];}};
R['1']={w:w(.4,1.7,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.vs(W*.62,0,H,a,-W*.02),K.strip([W*.64,H*.95],[W*.0,H*.6],b*.8,b*.7)];}};
R['2']={w:w(.62,2.2,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.arc(W/2,H*.7,W/2,H*.3,a*.98,a*.84,172,-40,5),K.strip([W-a*.35,H*.52],[b*.4,c*.5],b*.84,b*.76),K.hs(0,W,c*.38,c*.76,H*.01)];}};
R['3']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(W*.04,W*.96,H-a*.38,a*.76,-H*.012),K.strip([W-a*.5,H-a*.2],[W*.42,H*.52],a*.9,a*.78),K.arc(W*.47,H*.29,W*.5,H*.29,c*1.0,c*.84,108,-150,5)];}};
R['4']={w:w(.7,2.4,160),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.vs(W*.74,0,H,a,H*.006),K.strip([W*.7,H*.99],[b*.3,H*.3],b*.84,b*.76),K.hs(0,W,H*.3,c*.64,H*.012)];}};
R['5']={w:w(.62,2.1,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.hs(W*.16,W*.96,H-a*.38,a*.76,-H*.008),K.vs(W*.2+b*.4,H*.54,H,b*.92,-W*.02),K.arc(W*.48,H*.3,W*.52,H*.3,c*1.0,c*.84,135,-150,5)];}};
R['6']={w:w(.62,2.1,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,0,W,H*.64,a,c*.8,b*.95,c*.78,[K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.4,10)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)]),
    K.arc(W*1.0,H*.42,W*1.0,H*.58,a*1.0,a*.8,180,86,3)];}};
R['7']={w:w(.6,2.0,140),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1);
  return [K.hs(0,W,H-a*.38,a*.76,-H*.012),K.strip([W-b*.3,H-a*.2],[W*.3,0],b*.92,b*.8)];}};
R['8']={w:w(.64,2.2,190),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(W*.06,H*.47,W*.94,H,a*.9,c*.78,a*.9,c*.76,[K.sn(S*.5,16),K.sn(S*.5,16),K.sn(S*.5,16),K.sn(S*.5,16)],[K.sn(S*.1,8),K.sn(S*.1,8),K.sn(S*.1,8),K.sn(S*.1,8)]),
    K.ring(0,0,W,H*.6,b,c*.8,b*.95,c*.78,[K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)])];}};
R['9']={w:w(.62,2.1,180),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(0,H*.36,W,H,a*.95,c*.78,b,c*.8,[K.sn(S*.4,10),K.sn(S*.7,20),K.sn(S*.7,20),K.sn(S*.7,20)],[K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8),K.sn(S*.14,8)]),
    K.arc(W*.0,H*.58,W*1.0,H*.58,b*1.0,b*.8,0,-95,3)];}};
/* ----- знаки ----- */
const dotD=(H,S)=>aCL(S*.98,.16*H,.235*H);
R['.']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d)];}};
R[',']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d),K.strip([d*.72,d*.35],[d*.2,-K.H*.17],d*.62,d*.3,{flat:1})];}};
R[':']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,0,d),K.dot(d*.04,K.H*.5,d*.96)];}};
R[';']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(d*.04,K.H*.5,d*.96),K.dot(0,0,d),K.strip([d*.72,d*.35],[d*.2,-K.H*.17],d*.62,d*.3,{flat:1})];}};
const bang=K=>{const {H,S}=K,wt=S*1.14,wb=S*.62,d=dotD(H,S);return [K.P([V(0,H*.28),V((wt-wb)/2+wb,H*.28),V(wt,H),V(0,H)]),K.dot((wt-d)/2,0,d)];};
R['!']={sbk:.9,w:(H,S)=>Math.max(S*1.14,dotD(H,S)),f:K=>{const {H,S}=K,wt=Math.min(S*1.12,dotD(K.H,S)*1.15),d=dotD(H,S),y0=d+H*.13;
  const o=(Math.max(wt,d)-wt)/2;return [K.P([V(o+wt*.22,y0),V(o+wt*.78,y0),V(o+wt,H),V(o,H*.99)]),K.dot((Math.max(wt,d)-d)/2,0,d)];}};
R['?']={w:w(.5,1.9,100),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),d=dotD(H,S);
  return [K.arc(W/2,H*.7,W/2,H*.3,a*.98,a*.84,172,-98,5),K.vs(W*.46,d+H*.13,H*.5,b*.9,W*.01,{}),K.dot(W*.5-d/2,0,d)];}};
const chev=(K,dir)=>{const {H,S}=K,t=S*.5,hh=H*.2,dx=H*.16,yc=H*.45;
  const one=x=>dir<0?[K.strip([x+dx,yc+hh],[x,yc],t,t*.92,{flat:1}),K.strip([x,yc],[x+dx,yc-hh],t,t*.92,{flat:1})]:[K.strip([x,yc+hh],[x+dx,yc],t,t*.92,{flat:1}),K.strip([x+dx,yc],[x,yc-hh],t,t*.92,{flat:1})];
  return one(0).concat(one(dx*1.5+S*.3));};
R['«']={w:(H,S)=>H*.16*2.5+S*.8+14,f:K=>chev(K,-1)};
R['»']={w:(H,S)=>H*.16*2.5+S*.8+14,f:K=>chev(K,1)};
/* кавычки-запятые: «голова» + хвост; 9-образные (’ ” „) и 6-образные (‘ “) */
const qd=(H,S)=>aCL(S*.74,.125*H,.18*H);
const q9=(K,x,y)=>{const {H,S}=K,d=qd(H,S);return [K.dot(x,y,d,{mark:1}),K.strip([x+d*.72,y+d*.35],[x+d*.12,y-H*.15],d*.64,d*.42,{flat:1,mark:1,sn:0})];};
const q6=(K,x,y)=>{const {H,S}=K,d=qd(H,S);return [K.dot(x,y,d,{mark:1}),K.strip([x+d*.3,y+d*.65],[x+d*.9,y+d+H*.13],d*.64,d*.42,{flat:1,mark:1,sn:0})];};
const qW=(H,S,n)=>qd(H,S)*(n===2?2.45:1.1)+H*.04;
R['\u2019']={sbk:.8,w:(H,S)=>qW(H,S,1),f:K=>q9(K,0,K.H-qd(K.H,K.S)-6)};
R['\u2018']={sbk:.8,w:(H,S)=>qW(H,S,1),f:K=>q6(K,0,K.H-qd(K.H,K.S)-K.H*.14-8)};
R['\u201D']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S),y=K.H-d-6;return q9(K,0,y).concat(q9(K,d*1.35,y));}};
R['\u201C']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S),y=K.H-d-K.H*.14-8;return q6(K,0,y).concat(q6(K,d*1.35,y));}};
R['\u201E']={sbk:.8,w:(H,S)=>qW(H,S,2),f:K=>{const d=qd(K.H,K.S);return q9(K,0,0).concat(q9(K,d*1.35,0));}};
const H_=K=>K.H;
R['"']={sbk:.7,w:(H,S)=>S*1.9,f:K=>{const {H,S}=K;return [K.P([V(S*.04,H*.66),V(S*.5,H*.66),V(S*.8,H*.99),V(0,H*.97)],{mark:1}),K.P([V(S*1.0,H*.66),V(S*1.46,H*.66),V(S*1.8,H*.99),V(S*1.0,H*.97)],{mark:1})];}};
R["'"]={sbk:.8,w:(H,S)=>S*.9,f:K=>{const {H,S}=K;return [K.P([V(S*.04,H*.66),V(S*.5,H*.66),V(S*.8,H*.99),V(0,H*.97)],{mark:1})];}};
R['-']={sbk:.6,w:(H,S)=>H*.34,f:K=>{const {H,S}=K;return [K.hs(0,H*.34,H*.38,S*.62,H*.012,{mark:1})];}};
R['–']={sbk:.5,w:(H,S)=>H*.56,f:K=>{const {H,S}=K;return [K.hs(0,H*.56,H*.38,S*.6,H*.014,{mark:1})];}};
R['−']={sbk:.5,w:(H,S)=>H*.5,f:K=>{const {H,S}=K;return [K.hs(0,H*.5,H*.4,S*.62,H*.014,{mark:1})];}};
R['—']={sbk:.4,w:(H,S)=>H*.98,f:K=>{const {H,S}=K;return [K.hs(0,H*.98,H*.38,S*.6,H*.018,{mark:1})];}};
R['(']={sbk:.8,w:(H,S)=>H*.24+S*.6,f:K=>{const {H,S}=K,a=S*.78,rx=H*.26+S*.1;return [K.arc(rx,H*.43,rx,H*.58,a,a*.8,128,232,3,{})];}};
R[')']={sbk:.8,w:(H,S)=>H*.24+S*.6,f:K=>{const {H,S}=K,a=S*.78,rx=H*.26+S*.1;return [K.arc(0,H*.43,rx,H*.58,a*.8,a,52,-52,3,{})];}};
R['/']={sbk:.6,w:(H,S)=>H*.42+S*.4,f:K=>{const {H,S}=K,W=H*.42+S*.4;return [K.strip([S*.3,-H*.06],[W-S*.3,H*1.04],S*.72,S*.64)];}};
R['&']={w:w(.86,2.9,200),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2);
  return [K.ring(W*.08,H*.5,W*.74,H,a*.62,c*.7,a*.62,c*.66,[K.sn(S*.5,14),K.sn(S*.5,14),K.sn(S*.5,14),K.sn(S*.5,14)],[K.sn(S*.1,6),K.sn(S*.1,6),K.sn(S*.1,6),K.sn(S*.1,6)]),
    K.arc(W*.4,H*.28,W*.42,H*.28,b*.82,b*.7,75,325,5),K.strip([W*.22,H*.5],[W-c*.3,0],c*.8,c*.72)];}};
/* ----- CS68: · • ° © ₽ @ # % * + = \ | — те же куски бумаги: диски-точки, полосы, кольца с неровными срезами ----- */
const rg4=(K,x0,y0,x1,y1,t,f)=>K.ring(x0,y0,x1,y1,t,t*.88,t*.96,t*.88,[K.sn(f,10),K.sn(f,10),K.sn(f,10),K.sn(f,10)],[K.sn(f*.2,6),K.sn(f*.2,6),K.sn(f*.2,6),K.sn(f*.2,6)]);
R['·']={sbk:.8,w:(H,S)=>dotD(H,S),f:K=>{const d=dotD(K.H,K.S);return [K.dot(0,K.H*.34-d/2,d)];}};
R['•']={sbk:.8,w:(H,S)=>dotD(H,S)*1.5,f:K=>{const d=dotD(K.H,K.S)*1.5;return [K.dot(0,K.H*.46-d/2,d)];}};
R['°']={sbk:.8,w:(H,S)=>H*.29,f:K=>{const {H,S}=K,s=H*.29,t=Math.min(S*.55,s*.36);return [rg4(K,0,H-s,s,H,t,s*.3)];}};
R['+']={w:w(.55,2.0,60),f:K=>{const {H,S,W}=K,ym=H*.44,a=Math.min(W,H*.56)/2;return [K.hs(0,W,ym,S*.62,H*.01,{mark:1}),K.vs(W/2,ym-a,ym+a,S*.66,H*.01,{mark:1})];}};
R['=']={w:w(.52,1.9,60),f:K=>{const {H,S,W}=K,g=Math.max(S*.5,H*.1);return [K.hs(0,W,H*.44+g,S*.56,H*.01,{mark:1}),K.hs(0,W*.98,H*.44-g,S*.56,-H*.01,{mark:1})];}};
R['\\']={sbk:.6,w:(H,S)=>H*.42+S*.4,f:K=>{const {H,S}=K,W=H*.42+S*.4;return [K.strip([S*.3,H*1.04],[W-S*.3,-H*.06],S*.72,S*.64)];}};
R['|']={sbk:.6,w:(H,S)=>S*.9,f:K=>{const {H,S}=K;return [K.vs(S*.42,-H*.08,H*.98,S*.8,H*.008)];}};
R['#']={w:w(.62,2.4,120),f:K=>{const {H,S,W}=K;return [K.vs(W*.32,0,H,S*.6,H*.01),K.vs(W*.7,0,H,S*.6,-H*.01),K.hs(0,W,H*.3,S*.52,H*.012),K.hs(0,W*.98,H*.64,S*.52,-H*.012)];}};
R['*']={w:w(.5,1.9,60),f:K=>{const {H,S,W}=K,cx=W/2,cy=H*.74,L=Math.min(W*.5,H*.2),t=S*.38;
  return [K.strip([cx,cy-L],[cx,cy+L],t,t*.9,{flat:1,mark:1}),K.strip([cx-L*.87,cy-L*.5],[cx+L*.87,cy+L*.5],t,t*.9,{flat:1,mark:1}),K.strip([cx-L*.87,cy+L*.5],[cx+L*.87,cy-L*.5],t,t*.9,{flat:1,mark:1})];}};
R['%']={w:w(.8,2.9,200),f:K=>{const {H,S,W}=K,s=Math.min(W*.38,H*.32),t=Math.min(S*.55,s*.36);
  return [rg4(K,0,H-s,s,H,t,s*.3),rg4(K,W-s,0,W,s,t,s*.3),K.strip([S*.3,-H*.05],[W-S*.3,H*1.03],S*.6,S*.52)];}};
R['©']={w:w(1.02,3.4,220),f:K=>{const {H,S,W}=K,hh=H*.94,y0=(H-hh)/2,cx=W/2,cy=H/2;
  return [rg4(K,0,y0,W,y0+hh,Math.min(S*.85,W*.17),S*.62),K.arc(cx,cy,W*.19,H*.19,S*.42,S*.38,42,320,5)];}};
R['₽']={w:R['Р'].w,f:K=>{const p=R['Р'].f(K),{H,S,W}=K;p.push(K.hs(0,W*.78,H*.19,S*.42,H*.006,{mark:1}));return p;}};
R['@']={w:w(1.0,3.3,220),f:K=>{const {H,S,W}=K,t=Math.min(S*.8,W*.15),cx=W/2,cy=H*.5,bt=Math.min(S*.32,W*.07);
  return [K.arc(cx,cy,W/2,H*.46,t,t*.9,14,338,7),rg4(K,W*.3,H*.3,W*.68,H*.6,bt,S*.1),K.vs(W*.66,H*.27,H*.64,S*.34,0,{mark:1})];}};

R['№']={w:w(1.3,4.7,170),f:K=>{const {H,S,W}=K,a=K.s(0),b=K.s(1),c=K.s(2),nw=W*.6,hh=H*.82,r=H*.4;
  return [K.vs(a*.5,0,hh,a*.92,0),K.vs(nw-b*.5,0,hh,b*.86,H*.01),K.strip([a*.35,hh*.97],[nw-b*.35,hh*.03],c*.72,c*.64),
    K.ring(nw+S*.2,H*.3,W,H*.8,b*.7,b*.7,b*.7,b*.7,[K.sn(S*.4,10),K.sn(S*.4,10),K.sn(S*.4,10),K.sn(S*.4,10)],[S*.06,S*.06,S*.06,S*.06]),
    K.hs(nw+S*.25,W,H*.18,b*.5,H*.01)];}};
R['…']={sbk:.8,w:(H,S)=>dotD(H,S)*3+H*.2,f:K=>{const d=dotD(K.H,K.S)*.92,g=K.H*.1;return [K.dot(0,0,d),K.dot(d+g,0,d),K.dot((d+g)*2,0,d)];}};
