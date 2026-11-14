/* ---------- «Столб» (stolb): рецепты букв. Высокий сжатый гротеск: прямые стойки, овалы — прямоугольники с малым радиусом.
   Круглые углы регистрируются в рецепте (rc), прямые углы получают лишь малый радиус Rs. Прописные H = 700; строчные — те же рецепты на высоте x. ---------- */
function cnCtx(o){o=o||{};const S=o.S==null?88:o.S,rnd=o.rnd==null?0.72:o.rnd,ctr=o.ctr==null?0.35:o.ctr,ap=o.ap==null?1:o.ap,ct=o.ct==null?0:o.ct;
  const R=rnd*1.1*S,T=Math.min(S*(1-0.30*ctr),0.150*700),wd0=o.wd==null?1:o.wd,cw=Math.max(22,0.26*S);
  return {cw,cx:cw*Math.max(0.9,Math.min(1.4,wd0)),S,T,Tr:Math.min(S,Math.min(T+0.05*S,0.158*700)),D:1.03*S,R,ri:0.38*R,Rs:rnd>0.005?Math.max(1.2,0.13*R):0,ap,ct,wd:o.wd==null?1:o.wd,gap:o.gap==null?30:o.gap,lcr:o.lcr==null?0.75:o.lcr,
    kw:Math.max(0.78,1+0.42*(S/88-1)),cmin:Math.max(22,0.26*S),lc:false,rnd,ctr,jump:0};}
function cnSub(c,k){const d=Object.assign({},c);d.lc=true;d.S=c.S*k;d.T=c.T*k;d.Tr=c.Tr*k;d.D=c.D*k;d.R=c.R*k;d.ri=c.ri*k;d.Rs=c.Rs*k;d.cmin=Math.max(22,c.cmin*(0.5+0.5*k));d.cw=d.cmin;d.cx=Math.max(20,c.cx*(0.5+0.5*k));return d;}
/* ---- наборы кусков с реестром круглых углов ---- */
const rr=cnRR;
function cat(){const out=[],rc=[];for(const a of arguments){if(!a)continue;if(Array.isArray(a)){for(const q of a)out.push(q);if(a.rc)for(const r of a.rc)rc.push(r);}else out.push(a);}out.rc=rc;return out;}
const reg=(...pts)=>{const a=[];a.rc=pts;return a;};
const cnMov=(P,dx,dy)=>{const o=cnShift(P,dx,dy);o.rc=(P.rc||[]).map(r=>[r[0]+dx,r[1]+(dy||0)]);return o;};
const cnMirP=(P,w)=>{const o=cnMirror(P,w);o.rc=(P.rc||[]).map(r=>[w-r[0],r[1]]);return o;};
const cnFlipY=(P,H)=>{const o=P.map(q=>({p:q.p.map(v=>[v[0],H-v[1]]).reverse(),h:q.h}));o.rc=(P.rc||[]).map(r=>[r[0],H-r[1]]);return o;};
const cnRot=(P,w,H)=>{const o=P.map(q=>({p:q.p.map(v=>[w-v[0],H-v[1]]),h:q.h}));o.rc=(P.rc||[]).map(r=>[w-r[0],H-r[1]]);return o;};
/* кольцо (овал): внешние круглые углы по сторонам o.l/o.r/o.t/o.b, внутренние — всегда */
function cnRing(x0,y0,x1,y1,c,o){o=o||{};const S=c.S,Tt=c.Tr,rc=[];
  const L=o.l!==false,Rr=o.r!==false,Tp=o.t!==false,Bt=o.b!==false;
  if(Tp&&L)rc.push([x0,y1]);if(Tp&&Rr)rc.push([x1,y1]);if(Bt&&L)rc.push([x0,y0]);if(Bt&&Rr)rc.push([x1,y0]);
  rc.push([x0+S,y0+Tt],[x1-S,y0+Tt],[x1-S,y1-Tt],[x0+S,y1-Tt]);
  const a=[rr(x0,y0,x1,y1),cnRH(x0+S,y0+Tt,x1-S,y1-Tt)];a.rc=rc;return a;}
/* вертикальный крючок со срезом: свободный конец (yTip) срезан косо на c.ct, внешняя сторона outer ('l'|'r'); dir −1 — висит вниз от yBase, +1 — растёт вверх */
function cnHook(x0,x1,yBase,yTip,outer,c){const ang=c.ct*20*Math.PI/180,off=Math.min(0.5*(x1-x0)*Math.tan(ang)*2,0.6*Math.abs(yTip-yBase)),dir=yTip<yBase?-1:1;
  /* внешний край короче: срез «уходит» к внутреннему краю */
  const yo=yTip-dir*off,yi=yTip;const xo=outer==='r'?x1:x0,xi=outer==='r'?x0:x1;
  const P=[[x0,yBase],[x1,yBase]];
  const tip=outer==='r'?[[x1,yo],[x0,yi]]:[[x1,yi],[x0,yo]];
  return cnSolid(P.concat(tip));}
const CN_LET={};
function cnReg(chars,wr,ns,f,o){o=o||{};for(const ch of chars)CN_LET[ch]=Object.assign({f,wr,ns,ch},o);}
const cnYm=(c,H)=>0.47*H;
/* ширина знака (ink): wr·H·wd·kw, но не меньше стоек + просветов (+ собственный минимум знака) */
function cnWidth(ch,c,H){const d=CN_LET[ch];
  if(d.wf)return Math.round(d.wf(c,H));
  if(d.eq)return Math.round(d.ns*c.S+(d.ns-1)*c.cx+(d.ex?d.ex(c,H):0));const lo0=d.ns*c.S+(d.ns-1)*c.cmin*(d.cmf||1)+(d.ex?d.ex(c,H):0);
  let raw=Math.max(d.wr*H*c.wd*c.kw,lo0,d.mn?d.mn(c,H):0);const q=1;return Math.round(raw/q)*q;}
function cnBuild(ch,c,H){const d=CN_LET[ch];const w=cnWidth(ch,c,H);const P=d.f(c,w,H);return {polys:P,w,rc:P.rc||[]};}
/* крюк-терминал C/G/S: длина hk из апертуры */
const cnHk=(c,H,k)=>{const o=0.5*(1-0.62*c.ap)*H*(k||1);return Math.max(c.Tr+0.55*c.S,Math.min(o,0.40*H));};
/* ================= ПРЯМЫЕ ================= */
cnReg('ОO',.31,2,(c,w,H)=>cnRing(0,0,w,H,c),{});
cnReg('0',.245,2,(c,w,H)=>{const S=c.S;const P=cnRing(0,0,w,H,c);return cat(P,cnStP([w*0.5-S*0.36,H*0.10],[w*0.5+S*0.36,H*0.90],S*0.42));},{cmf:0.55});
function cnStP(p0,p1,wh){return cnPara(p0,p1,wh);}
cnReg('НH',.265,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,ym-T/2,w-S+1,ym+T/2)];},{});
cnReg('П',.265,2,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,H-T,w-S+1,H)];},{});
cnReg('Г',.215,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,H-T,w,H)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('F',.215,1,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.84,ym+T/2)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('ТT',.25,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,H-T,w,H),rr(w/2-S/2,0,w/2+S/2,H-T+1)];},{ex:(c)=>c.S+0.5*c.cmin*2});
cnReg('ЕE',.215,1,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.88,ym+T/2),rr(0,0,w,T)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('L',.215,1,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,0,w,T)];},{ex:(c)=>0.62*c.S+c.cmin*0.4});
cnReg('I',.0,1,(c,w,H)=>[rr(0,0,w,H)],{mn:(c)=>c.S});
CN_LET.I.wr=0.001;
/* U — чаша: круглые нижние углы */
cnReg('U',.265,2,(c,w,H)=>{const S=c.S,T=c.T;const a=[rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,c.Tr)];a.rc=[[0,0],[w,0],[S,c.Tr],[w-S,c.Tr]];return a;},{});
const cnTail=(c,w,H,dep)=>{const S=c.S,T=c.T;return [rr(w-S,-dep,w,1)];};
const cnDep=(c)=>Math.max(0.17*700,c.S*1.3);
cnReg('Ц',.28,2,(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,T)].concat(cnTail(c,w,H,cnDep(c)));},{});
const cnSh=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(w/2-S/2,0,w/2+S/2,H),rr(S-1,0,w-S+1,T)];};
cnReg('Ш',.43,3,cnSh,{});
cnReg('Щ',.445,3,(c,w,H)=>cnSh(c,w,H).concat(cnTail(c,w,H,cnDep(c))),{});
cnReg('Ч',.26,2,(c,w,H)=>{const S=c.S,T=c.T,yq=0.38*H;return [rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T)];},{});
/* Ь Ъ Ы Б: стойка + чаша (круглые правые углы) */
const cnBowl=(c,x0,y0,x1,y1)=>cnRing(x0,y0,x1,y1,c,{l:false});
cnReg('Ь',.27,2,(c,w,H)=>{const S=c.S,hb=0.60*H;return cat([rr(0,0,S,H)],cnBowl(c,0,0,w,hb));},{});
cnReg('Ъ',.33,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.60*H,fl=0.9*S;return cat([rr(0,H-T,fl+S,H),rr(fl,0,fl+S,H)],cnBowl(c,fl,0,w,hb));},{ns:2,ex:(c)=>0.9*c.S});
cnReg('Ы',.40,3,(c,w,H)=>{const S=c.S,hb=0.60*H,g=Math.max(22,0.30*S),bw=w-S-g;return cat([rr(0,0,S,H)],cnBowl(c,0,0,bw,hb),[rr(w-S,0,w,H)]);},{ex:(c)=>0.3*c.S});
cnReg('Б',.27,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.52*H;return cat([rr(0,0,S,H),rr(0,H-T,w,H)],cnBowl(c,0,0,w,hb));},{});
const cnTwo=(c,w,H,yu,lf,st)=>cat(cnRing(0,yu,w-(st||0.01*c.S),H,c,{l:lf,b:true}),cnRing(0,0,w,yu+c.Tr,c,{l:lf,t:true}));
cnReg('ВB',.29,2,(c,w,H)=>cnTwo(c,w,H,0.43*H,false,0.55*c.cmin),{ex:(c)=>0.55*c.cmin});
cnReg('8',.235,2,(c,w,H)=>cnTwo(c,w,H,0.50*H,true),{cmf:0.7});
const cnRru=(c,w,H)=>{const S=c.S,yu=0.40*H;return cat([rr(0,0,S,H)],cnBowl(c,0,yu,w,H));};
cnReg('РP',.265,2,cnRru,{});
/* R: чаша + прямая вертикальная нога */
const cnRl=(c,w,H)=>{const S=c.S,yu=0.40*H,wh=1.03*c.D;const xs=Math.max(w-wh/2-0.34*yu,S+0.5*wh+0.28*c.cmin);
  return cat(cnRru(c,w,H),[cnPara([xs,yu+0.4*c.Tr],[w-wh/2,0],wh)]);};
cnReg('R',.285,2,cnRl,{});
/* Я (блочная система): правая сквозная стойка, чаша слева с общим просветом, нога от левого низа чаши до базовой линии; между ногой и стойкой щель = общий просвет */
const cnYa=(c,w,H)=>{const S=c.S,yu=0.40*H,Tr=c.Tr,sh=Math.tan(7*Math.PI/180)*(yu+Tr*0.5),dp=0.35*S,hh=0.30*S,yn=yu+Tr*0.35;
  const P=cat(cnMirP(cnRru(c,w,H),w),[cnPara([S/2,yu+Tr*0.5],[S/2-sh,0],S)]);
  P.push(cnHole([[-sh*0.3-2,yn+hh],[dp-sh*0.3,yn],[-sh*0.3-2,yn-hh]]));return P;};
cnReg('Я',.285,2,cnYa,{});
cnReg('D',.285,2,(c,w,H)=>cnRing(0,0,w,H,c,{l:false}),{});
cnReg('Q',.30,2,(c,w,H)=>{const S=c.S,T=c.T;return cat(cnRing(0,0,w,H,c),[rr(w-S*1.05,-0.62*T,w+0.55*S,0.5*T)]);},{});
const cnC=(c,w,H,hk)=>{const S=c.S,Tt=c.Tr;hk=hk==null?cnHk(c,H):hk;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hk,'r',c),cnHook(w-S,w,Tt-1,hk,'r',c)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt]];return P;};
cnReg('СC',.265,2,(c,w,H)=>cnC(c,w,H),{});
cnReg('G',.285,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,hk=cnHk(c,H,1),yh=0.52*H;
  const P=cat(cnC(c,w,H,hk).slice(0,4),[rr(w-S,0,w,yh),rr(Math.max(S+0.45*c.cmin,S+0.30*(w-2*S)),yh-T,w-S+1,yh)]);
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt]];return P;},{});
/* Э: зеркальная С с язычком слева; З: две чаши с талией и крюками слева */
cnReg('Э',.265,2,(c,w,H)=>cnMirP(cat(cnC(c,w,H,Math.min(cnHk(c,H),0.80*(cnYm(c,H)-c.T/2-0.35*c.S)))),w).concat([rr(0.30*w,cnYm(c,H)-c.T/2,w-c.S+1,cnYm(c,H)+c.T/2)]),{});
const cnThree=(c,w,H,flat,hookTop)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),nh=0.86*T,hk=Math.min(cnHk(c,H,0.9),0.8*(ym-T/2-0.35*S));
  const P=[rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+nh/2-2,w,H-Tt/2),rr(w-S,Tt/2,w,ym-nh/2+2),rr(Math.max(w*0.38,w-1.7*S),ym-nh/2,w-(flat?0:0.38*S),ym+nh/2)];
  if(hookTop)P.push(cnHook(0,S,H-Tt+1,H-hk,'l',c));P.push(cnHook(0,S,Tt-1,hk,'l',c));
  P.rc=flat?[[w,0],[w,H*0+ym+nh/2],[0,0]].concat([[w-S,H-Tt]]):[[0,H],[w,H],[w,0],[w,ym+nh/2],[w-S,H-Tt],[w-S,ym+nh/2]];
  if(flat)P.rc.push([w,ym-nh/2]);P.rc=P.rc.concat([[w,ym-nh/2]]);return P;};
cnReg('З',.265,2,(c,w,H)=>cnThree(c,w,H,false,true),{});
cnReg('3',.265,2,(c,w,H)=>cnThree(c,w,H,true,false),{});
cnReg('S',.28,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),hk=Math.min(cnHk(c,H,0.95),H-ym-T/2-0.30*S,ym-T/2-0.30*S);
  const P=[rr(0,H-Tt,w,H),rr(0,ym-T/2,S,H-Tt/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,Tt/2,w,ym+T/2),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hk,'r',c),cnHook(0,S,Tt-1,hk,'l',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[0,ym-T/2],[w,ym+T/2],[S,H-Tt],[w-S,Tt],[S,ym+T/2],[w-S,ym-T/2]];return P;},{});
cnReg('5',.265,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H)+0.02*H,hk=cnHk(c,H,0.8);
  const P=[rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,c.Tr/2,w,ym+T/2),rr(0,0,w,c.Tr),cnHook(0,S,c.Tr-1,Math.min(hk,ym-T/2-0.3*S),'l',c)];
  P.rc=[[w,ym+T/2],[w,0],[S,ym-T/2],[w-S,c.Tr]];return P;},{});
cnReg('2',.265,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,hk=Math.min(cnHk(c,H,0.8),0.30*H);
  const P=[rr(0,H-Tt,w,H),rr(w-S,0.50*H,w,H-Tt/2),cnPara([w-S*0.5,0.56*H],[S*0.5,T*0.6],1.02*S),rr(0,0,w,T),cnHook(0,S,H-Tt+1,H-hk,'l',c)];
  P.rc=[[w,H],[w-S,H-Tt],[w,0.50*H]];return P;},{mn:(c)=>2.4*c.S});
const cn6=(c,w,H)=>{const S=c.S,T=c.T,hb=0.62*H,hk=cnHk(c,H,0.8);
  const P=cat([rr(0,0,S,H),rr(0,H-c.Tr,w,H),cnHook(w-S,w,H-c.Tr+1,H-hk,'r',c)],cnRing(0,0,w,hb,c));P.rc=P.rc.concat([[0,H],[w,H]]);return P;};
cnReg('6',.25,2,cn6,{cmf:0.7});
cnReg('9',.25,2,(c,w,H)=>cnRot(cn6(c,w,H),w,H),{cmf:0.7});
cnReg('4',.28,2,(c,w,H)=>{const S=c.S,T=c.T,yb=0.27*H,wh=0.92*S;
  return [rr(w-S,0,w,H),rr(0,yb,w,yb+T),cnPara([wh/2,yb+T-2],[w-S-wh*0.2,H],wh)];},{mn:(c)=>2.7*c.S});
cnReg('7',.265,1,(c,w,H)=>{const S=c.S,T=c.T,wh=1.02*S;return [rr(0,H-T,w,H),cnPara([w*0.30,0],[w-wh/2,H-T+2],wh)];},{mn:(c)=>2.35*c.S});
cnReg('1',.17,1,(c,w,H)=>{const S=c.S,fw=0.95*S;return [rr(w-S,0,w,H),cnSolid([[w-S,H],[w-S,H-1.25*S],[w-S-fw,H-0.78*S],[w-S-fw,H-0.78*S+0.70*S]])];},{ex:(c)=>0.95*c.S+0.2*c.cmin,mn:(c)=>2.0*c.S});
/* ================= ДИАГОНАЛЬНЫЕ ================= */
const CN_LEAN=14*Math.PI/180;
function cnKpart(c,w,H,x0){x0=x0||0;const S=c.S,T=c.T,ym=cnYm(c,H),wh=c.D/Math.cos(CN_LEAN),st=Math.max(0.35*S,c.cmin*0.75),xb=x0+S+st+wh/2;
  let xt=Math.min(x0+w-wh/2,xb+(H-ym)*Math.tan(17*Math.PI/180));xt=Math.max(xt,xb+4);
  return [rr(x0+S-1,ym-T/2,xb+wh/2,ym+T/2),cnPara([xb,ym],[xt,H],wh),cnPara([xb,ym],[xt,0],wh)];}
cnReg('КK',.29,2,(c,w,H)=>[rr(0,0,c.S,H)].concat(cnKpart(c,w,H)),{mn:(c)=>2.5*c.S+c.cmin});
cnReg('Ж',.52,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),wc=w/2,wh=c.D*0.98;
  const cen=rr(wc-S/2,0,wc+S/2,H);const g=Math.max(2,0.20*S),xl=wc-S/2-g,hw=xl;
  const arm=(x_in,x_out,sgn)=>[cnPara([x_in,ym+0.5],[x_out,H],wh),cnPara([x_in,ym-0.5],[x_out,0],wh)];
  const L=arm(wc-S/2+1,wh/2+0.5,-1),R_=arm(wc+S/2-1,w-wh/2-0.5,1);
  return [cen].concat(L,R_);},{mn:(c)=>3*c.S+1.7*c.D});
const cnI2=(c,w,H)=>{const S=c.S,x0=S*0.5,x1=w-S*0.5,xm=(x0+x1)/2,e=0.28*S,m=0.38*S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[x0-e,0],[x0+e,0],[xm+m,H/2],[x1+e,H],[x1-e,H],[xm-m,H/2]])];};
cnReg('ИN',.36,2,cnI2,{mn:(c)=>2.0*c.S+3.6*c.cmin});
cnReg('N',.36,2,(c,w,H)=>cnMirP(cnI2(c,w,H),w),{mn:(c)=>2.0*c.S+3.6*c.cmin});
cnReg('ХX',.29,2,(c,w,H)=>{const wh=0.92*c.D;return [cnPara([wh/2,0],[w-wh/2,H],wh),cnPara([w-wh/2,0],[wh/2,H],wh)];},{mn:(c)=>2.5*c.D+0.4*c.cmin});
cnReg('Y',.29,2,(c,w,H)=>{const S=c.S,wh=0.9*c.D,ymid=0.42*H;
  return [cnPara([wh/2,H],[w/2,ymid],wh),cnPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('У',.29,2,(c,w,H)=>{const D=c.D*0.98,yb=0.40*H;const xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,0],[xr,H],D)];const m=(xr-xl)/H;const xj=xl+m*yb;P.push(cnPara([xl,H],[xj,yb],D));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
cnReg('V',.29,2,(c,w,H)=>{const wh=0.92*c.D;return [cnPara([wh/2,H],[w/2,0],wh),cnPara([w-wh/2,H],[w/2,0],wh)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('W',.52,3,(c,w,H)=>{const wh=0.82*c.D,q=w/4;
  return [cnPara([wh/2,H],[q,0],wh),cnPara([2*q,H*0.64],[q,0],wh),cnPara([2*q,H*0.64],[3*q,0],wh),cnPara([w-wh/2,H],[3*q,0],wh)];},{mn:(c)=>3.2*c.D+0.8*c.cmin});
cnReg('МM',.42,2,(c,w,H)=>{const S=c.S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,H],[w/2,0.28*H],0.9*c.D),cnPara([w-S/2,H],[w/2,0.28*H],0.9*c.D)];},{mn:(c)=>2*c.S+2.4*c.D});
cnReg('Z',.265,2,(c,w,H)=>{const S=c.S,T=c.T,wh=1.0*S;return [rr(0,H-T,w,H),rr(0,0,w,T),cnPara([w-wh/2,H-T+2],[wh/2,T-2],wh)];},{mn:(c)=>2.3*c.S+0.5*c.cmin});
cnReg('Л',.32,2,(c,w,H)=>{const S=c.S,T=c.T,wh=c.D*1.0,lean=Math.max(0,Math.min(0.10*H,w-S-wh-c.cmin*0.9));
  return [rr(lean*0.35,H-T,w,H),rr(w-S,0,w,H),cnPara([wh/2,0],[wh/2+lean,H-T+2],wh)];},{mn:(c)=>S0(c)+c.D+c.cmin*1.1+0.06*700});
function S0(c){return c.S;}
cnReg('Д',.31,2,(c,w,H)=>{const S=c.S,T=c.T,dp=cnDep(c)*0.9,ex=0.50*S;
  /* верхняя полка, стойки, пол на базовой линии, ножки ниже базовой с наружными лапками */
  return [rr(0,H-T,w,H),rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,-0*dp,w-S+1,T),rr(0,-dp,S,2),rr(w-S,-dp,w,2),rr(-ex,-dp,S,-dp+T*0.92),rr(w-S,-dp,w+ex,-dp+T*0.92)];},{mn:(c)=>2*c.S+c.cmin*1.3});
cnReg('АA',.34,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,sh=1.0*S,ctop=Math.max(0.85*c.cmin,0.30*S),dx=Math.max(0,Math.min(0.12*w,(w-2*sh-ctop)/2)),yb=0.30*H;
  const P=[cnSolid([[0,0],[sh,0],[dx+sh,H],[dx,H]]),cnSolid([[w,0],[w-sh,0],[w-dx-sh,H],[w-dx,H]]),rr(dx,H-Tt,w-dx,H),rr(0.5*dx*yb/H+sh*0.5,yb,w-0.5*dx*yb/H-sh*0.5,yb+T)];
  P.rc=[[dx,H],[w-dx,H]];return P;},{mn:(c)=>2.0*c.S+0.85*c.cmin+0.30*c.S+0.14*700});
cnReg('Ф',.50,3,(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return cat(cnRing(0,y0,w,y1,c),[rr(w/2-S/2,0,w/2+S/2,H)]);},{mn:(c)=>3*c.S+2.2*c.cmin});
cnReg('Ю',.48,3,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H),bl=0.55*S;
  return cat([rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)],cnRing(S+bl,0,w,H,c));},{mn:(c)=>3*c.S+0.55*c.S+c.cmin*1.2});
cnReg('J',.215,1,(c,w,H)=>{const S=c.S,T=c.T,hk=Math.min(c.Tr+0.4*S+0.1*H*0.4,0.30*H);
  const P=[rr(w-S,0,w,H),rr(0,0,w,c.Tr),rr(0,0,S,hk)];P.rc=[[w,0],[S,c.Tr]];return P;},{ex:(c)=>0.6*c.S+c.cmin*0.3});

/* ================= правки по замечаниям пользователя (R3) ================= */
const cnGap=c=>Math.max(14,c.cx*c.ap);
const cnDw=(c,dx,dy)=>c.D*Math.sqrt(dx*dx+dy*dy)/Math.abs(dy);   /* горизонтальная ширина диагонали при перпендикуляре D */
const EQ={eq:1};
for(const ch of 'ОO0НHПUЦШЩЧЬДDQ')if(CN_LET[ch])CN_LET[ch].eq=1;
for(const ch of '08')if(CN_LET[ch])CN_LET[ch].eq=1;
CN_LET['Ъ'].eq=1;CN_LET['Ы'].eq=1;CN_LET['Ю'].eq=1;CN_LET['Ф'].eq=1;
CN_LET['Ъ'].ex=(c)=>0.9*c.S;
for(const ch of 'ВB'){CN_LET[ch].eq=1;CN_LET[ch].ex=null;}
CN_LET['Б'].eq=1;CN_LET['РP'[0]].eq=1;CN_LET['P'].eq=1;CN_LET['R'].eq=1;CN_LET['Я'].eq=1;
CN_LET['Ы'].f=(c,w,H)=>{const S=c.S,hb=0.60*H,g=c.cx,bw=w-S-g;return cat([rr(0,0,S,H)],cnBowl(c,0,0,bw,hb),[rr(w-S,0,w,H)]);};CN_LET['Ы'].ex=null;
CN_LET['Ю'].f=(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H),bl=c.cx;return cat([rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)],cnRing(S+bl,0,w,H,c));};CN_LET['Ю'].ex=null;
CN_LET['0'].cmf=1;CN_LET['8'].cmf=1;
cnReg('6',.25,2,cn6,{eq:1});cnReg('9',.25,2,(c,w,H)=>cnRot(cn6(c,w,H),w,H),{eq:1});
/* И, N: чистая прямая диагональ с параллельными краями, без вырезов; ширина = 1.5 S + Wd/2 + 2.4 cx */
const cnWdI=(c,H)=>{let w=1.5*c.S+0.5*c.D+2.4*c.cx;for(let i=0;i<4;i++){const wd=cnDw(c,w-c.S,H);w=1.5*c.S+0.5*wd+2.4*c.cx;}return w;};
const cnI3=(c,w,H)=>{const S=c.S,wd=cnDw(c,w-S,H);return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,0],[w-S/2,H],wd)];};
cnReg('ИN',.3,2,cnI3,{wf:cnWdI});
cnReg('N',.3,2,(c,w,H)=>cnMirP(cnI3(c,w,H),w),{wf:cnWdI});
/* Л и А (А = Л + перекладина) */
const cnLamP=(c,H)=>{const lean=0.065*H;return {lean,wh:cnDw(c,lean,H-c.T)};};
const cnLamW=(c,H)=>{const p=cnLamP(c,H);return c.S+p.wh+p.lean+c.cx;};
const cnLam=(c,w,H)=>{const S=c.S,T=c.T,p=cnLamP(c,H),wh=p.wh,lean=p.lean;
  return [rr(lean*0.35,H-T,w,H),rr(w-S,0,w,H),cnPara([wh/2,0],[wh/2+lean,H-T+2],wh)];};
cnReg('Л',.3,2,cnLam,{wf:cnLamW});
cnReg('АA',.3,2,(c,w,H)=>{const S=c.S,T=c.T,p=cnLamP(c,H),ym=cnYm(c,H),xd=p.wh/2+p.lean*ym/(H-T+2);
  return cnLam(c,w,H).concat([rr(xd,ym-T/2,w-S+1,ym+T/2)]);},{wf:cnLamW});
/* Ф: стойка насквозь, два равных узких просвета */
cnReg('Ф',.4,3,(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return cat(cnRing(0,y0,w,y1,c),[rr(w/2-S/2,0,w/2+S/2,H)]);},{eq:1});
/* С: вертикальные терминалы сверху вниз и снизу вверх, щель по центру = просвет */
const cnC2=(c,w,H)=>{const S=c.S,Tt=c.Tr,g=cnGap(c),ym=H*0.5;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+g/2,w,H),rr(w-S,0,w,ym-g/2)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;};
cnReg('СC',.3,2,cnC2,{eq:1});
cnReg('G',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=cnGap(c),yh=0.52*H;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,yh+g,w,H),rr(w-S,0,w,yh),rr(S+c.cx,yh-T,w-S+1,yh)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;},{eq:1,ex:(c)=>0.75*c.S});
/* Э: зеркало Є: язычок и терминалы с щелью вокруг него */
cnReg('Э',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=cnGap(c),ym=cnYm(c,H);
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,ym+T/2+g,w,H),rr(w-S,0,w,ym-T/2-g),rr(S-1,ym-T/2,w-S-c.cx,ym+T/2)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return cnMirP(P,w);},{eq:1,ex:(c)=>0.8*c.S});
/* Б: верхняя полка с вертикальным сбросом справа (30 % кегля) */
cnReg('Б',.3,2,(c,w,H)=>{const S=c.S,T=c.T,hb=0.52*H;return cat([rr(0,0,S,H),rr(0,H-T,w,H),rr(w-S,0.70*H,w,H)],cnBowl(c,0,0,w,hb));},{eq:1});
/* З, 3: V-вырез справа в талии, крюки с щелью */
const cnThree2=(c,w,H,flat,hookTop)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),nh=0.86*T,g=cnGap(c);
  const P=[rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,Tt/2,w,H-Tt/2),rr(Math.max(w*0.38,w-1.7*S),ym-nh/2,w,ym+nh/2)];
  const dp=0.35*S,hh=0.30*S;P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));
  const hkU=Math.min(0.40*H,Math.max(0.10*H,(H-Tt)-(ym+nh/2)-g)),hkL=Math.min(0.40*H,Math.max(0.10*H,(ym-nh/2)-Tt-g));
  if(hookTop)P.push(cnHook(0,S,H-Tt+1,H-hkU,'l',c));P.push(cnHook(0,S,Tt-1,hkL,'l',c));
  P.rc=[[0,H],[0,0],[w,H],[w,0],[w-S,H-Tt],[w-S,Tt]];return P;};
cnReg('З',.3,2,(c,w,H)=>cnThree2(c,w,H,false,true),{eq:1});
cnReg('3',.3,2,(c,w,H)=>cnThree2(c,w,H,true,false),{eq:1});
/* S, 5, 6: крюки доходят до щели = просвет */
cnReg('S',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=cnYm(c,H),g=cnGap(c);
  const hkU=Math.min(0.40*H,Math.max(0.10*H,(H-Tt)-(ym+T/2)-g)),hkL=Math.min(0.40*H,Math.max(0.10*H,(ym-T/2)-Tt-g));
  const P=[rr(0,H-Tt,w,H),rr(0,ym-T/2,S,H-Tt/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,Tt/2,w,ym+T/2),rr(0,0,w,Tt),cnHook(w-S,w,H-Tt+1,H-hkU,'r',c),cnHook(0,S,Tt-1,hkL,'l',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[0,ym-T/2],[w,ym+T/2],[S,H-Tt],[w-S,Tt],[S,ym+T/2],[w-S,ym-T/2]];return P;},{eq:1});
cnReg('5',.3,2,(c,w,H)=>{const S=c.S,T=c.T,ym=cnYm(c,H)+0.02*H,g=cnGap(c),hk=Math.min(0.40*H,Math.max(0.10*H,(ym-T/2)-c.Tr-g));
  const P=[rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,c.Tr/2,w,ym+T/2),rr(0,0,w,c.Tr),cnHook(0,S,c.Tr-1,hk,'l',c)];
  P.rc=[[0,H],[0,0],[w,ym+T/2],[w,0],[S,ym-T/2],[w-S,c.Tr]];return P;},{eq:1});
function cn6b(c,w,H){const S=c.S,T=c.T,hb=0.62*H,g=cnGap(c),hk=Math.min(0.40*H,Math.max(0.10*H,H-c.Tr-hb-g));
  const P=cat([rr(0,0,S,H),rr(0,H-c.Tr,w,H),cnHook(w-S,w,H-c.Tr+1,H-hk,'r',c)],cnRing(0,0,w,hb,c));P.rc=P.rc.concat([[0,H],[w,H]]);return P;}
cnReg('6',.25,2,cn6b,{eq:1});cnReg('9',.25,2,(c,w,H)=>cnRot(cn6b(c,w,H),w,H),{eq:1});
/* диагонали: перпендикуляр ≈ 1.03 S (оптическая компенсация) */
cnReg('ХX',.29,2,(c,w,H)=>{const wh=cnDw(c,w-c.D,H);return [cnPara([wh/2,0],[w-wh/2,H],wh),cnPara([w-wh/2,0],[wh/2,H],wh)];},{mn:(c)=>2.5*c.D+0.4*c.cmin});
cnReg('Y',.29,2,(c,w,H)=>{const S=c.S,ymid=0.42*H,wh=cnDw(c,w/2-c.D/2,H-ymid);
  return [cnPara([wh/2,H],[w/2,ymid],wh),cnPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('У',.29,2,(c,w,H)=>{const D=cnDw(c,w-c.D,H),yb=0.40*H;const xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,0],[xr,H],D)];const m=(xr-xl)/H;const xj=xl+m*yb;P.push(cnPara([xl,H],[xj,yb],cnDw(c,xj-xl,H-yb)));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
cnReg('V',.29,2,(c,w,H)=>{const wh=cnDw(c,w/2-c.D/2,H);return [cnPara([wh/2,H],[w/2,0],wh),cnPara([w-wh/2,H],[w/2,0],wh)];},{mn:(c)=>2.2*c.D+0.4*c.cmin});
cnReg('W',.52,3,(c,w,H)=>{const q=w/4,wh=cnDw(c,q,H),wm=cnDw(c,q,0.64*H);
  return [cnPara([wh/2,H],[q,0],wh),cnPara([2*q,H*0.64],[q,0],wm),cnPara([2*q,H*0.64],[3*q,0],wm),cnPara([w-wh/2,H],[3*q,0],wh)];},{mn:(c)=>3.3*c.D+0.8*c.cmin});
cnReg('МM',.42,2,(c,w,H)=>{const S=c.S,wh=cnDw(c,w/2-S/2,0.72*H);
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S/2,H],[w/2,0.28*H],wh),cnPara([w-S/2,H],[w/2,0.28*H],wh)];},{mn:(c)=>2*c.S+2.4*c.D});
cnReg('Z',.265,2,(c,w,H)=>{const S=c.S,T=c.T,wh=cnDw(c,w-c.D,H-2*T);return [rr(0,H-T,w,H),rr(0,0,w,T),cnPara([w-wh/2,H-T+2],[wh/2,T-2],wh)];},{mn:(c)=>2.3*c.S+0.5*c.cmin});
cnReg('Ж',.52,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),wc=w/2,wh=cnDw(c,wc-S/2-c.D/2,H-ym);
  const cen=rr(wc-S/2,0,wc+S/2,H);
  const arm=(x_in,x_out)=>[cnPara([x_in,ym+0.5],[x_out,H],wh),cnPara([x_in,ym-0.5],[x_out,0],wh)];
  return [cen].concat(arm(wc-S/2+1,wh/2+0.5),arm(wc+S/2-1,w-wh/2-0.5));},{mn:(c)=>3*c.S+1.7*c.D});

cnReg('ВB',.29,2,(c,w,H)=>cnTwo(c,w,H,0.43*H,false,0.0001),{eq:1});

/* Ф: кольцо из полос (без дыры), стойка проходит насквозь через оба просвета */
const cnPhi=(c,w,H,y0,y1,yb,yt)=>{const S=c.S,Tt=c.Tr,a=w/2-S/2,b=w/2+S/2;
  const P=[rr(0,y0,S,y1),rr(w-S,y0,w,y1),rr(0,y1-Tt,w,y1),rr(0,y0,w,y0+Tt),rr(a,yb,b,yt)];
  P.rc=[[0,y0],[w,y0],[0,y1],[w,y1],[S,y0+Tt],[S,y1-Tt],[a,y0+Tt],[a,y1-Tt],[b,y0+Tt],[b,y1-Tt],[w-S,y0+Tt],[w-S,y1-Tt]];return P;};
cnReg('Ф',.4,3,(c,w,H)=>cnPhi(c,w,H,0.14*H,0.86*H,0,H),{eq:1});

/* 0: косая черта выступает за контур (отличие от О при равных просветах); 8: V-вырезы с обеих сторон в талии (отличие от В) */
cnReg('0',.245,2,(c,w,H)=>{const S=c.S;return cat(cnRing(0,0,w,H,c),[cnPara([S*0.55,0.12*H],[w-S*0.55,0.88*H],0.72*S)]);},{eq:1});
cnReg('8',.235,2,(c,w,H)=>{const yu=0.50*H,P=cnTwo(c,w,H,yu,true),ym=yu+c.Tr/2,dp=0.35*c.S,hh=0.30*c.S;
  P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]),cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]));return P;},{eq:1});

/* ===== правки пользователя, раунд 2 ===== */
/* N/И: диагональ от внутреннего верхнего угла левой стойки до внутреннего края правой на 50 % высоты; нижняя кромка — от левой на 50 % до внутреннего нижнего угла правой. Колонка просвета = 1.3 cx */
const cnN4=(c,w,H)=>{const S=c.S;return [rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[S-1,H],[w-S+1,H/2],[w-S+1,0],[S-1,H/2]])];};
cnReg('N',.3,2,cnN4,{eq:1,ex:(c)=>0.3*c.cx});
cnReg('И',.3,2,(c,w,H)=>cnMirP(cnN4(c,w,H),w),{eq:1,ex:(c)=>0.3*c.cx});
/* Д: корпус на сплошном основании по базовой линии, шире стоек на 0.25 S с каждой стороны, высота = S; без выносных ножек */
cnReg('Д',.3,2,(c,w,H)=>{const S=c.S,T=c.T,ex=0.25*S;return [rr(0,H-T,w,H),rr(0,0,S,H),rr(w-S,0,w,H),rr(-ex,0,w+ex,S)];},{eq:1});
/* В: V-вырез справа в талии */
cnReg('ВB',.29,2,(c,w,H)=>{const yu=0.43*H,P=cnTwo(c,w,H,yu,false,0.0001),ym=yu+c.Tr/2,dp=0.35*c.S,hh=0.30*c.S;
  P.push(cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1});
/* Ж: три стойки через общий просвет, стрелки-соединители на середине, V-вырезы снаружи боковых стоек; w = 3S + 2cx */
cnReg('Ж',.45,3,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),ah=0.15*H,dp=0.30*S,hh=0.26*S,a=w/2-S/2,b=w/2+S/2;
  const P=[rr(0,0,S,H),rr(a,0,b,H),rr(w-S,0,w,H),cnSolid([[S-1,ym+ah],[a+1,ym],[S-1,ym-ah]]),cnSolid([[w-S+1,ym+ah],[b-1,ym],[w-S+1,ym-ah]])];
  P.push(cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]),cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1});
/* Э: зеркальная закрытая С с короткой перемычкой */
cnReg('Э',.3,2,(c,w,H)=>{const S=c.S,T=c.T,tl=0.5*c.cx;
  return cnMirP(cat(cnC2(c,w,H),[rr(S-1,H*0.5-0.45*T,S+tl,H*0.5+0.45*T)]),w);},{eq:1});
/* М: две стойки и узкая центральная V; w = 3S + 2cx */
cnReg('МM',.3,3,(c,w,H)=>{const S=c.S,cx=c.cx,inner=w-2*S,wh=(inner-cx)/2,ymin=0.28*H,xc=w/2;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S+wh/2,H],[xc,ymin],wh),cnPara([w-S-wh/2,H],[xc,ymin],wh)];},{eq:1});

/* ===== правки пользователя, раунд 3: Х У G W Y в блочной системе ===== */
const CN_UV='A';
/* Х: две стойки + бабочка-соединитель на середине + V-вырезы снаружи; 2S+1.3cx */
cnReg('ХX',.3,2,(c,w,H)=>{const S=c.S,ym=cnYm(c,H),ah=0.15*H,dp=0.30*S,hh=0.26*S,nk=0.18*S,xc=w/2;
  const P=[rr(0,0,S,H),rr(w-S,0,w,H),cnSolid([[S-1,ym+ah],[xc,ym+nk],[w-S+1,ym+ah],[w-S+1,ym-ah],[xc,ym-nk],[S-1,ym-ah]])];
  P.push(cnHole([[-2,ym+hh],[dp,ym],[-2,ym-hh]]),cnHole([[w+2,ym+hh],[w-dp,ym],[w+2,ym-hh]]));return P;},{eq:1,ex:(c)=>0.3*c.cx});
/* Y: две верхние стойки, скруглённый U-стык на 45 %, центральная стойка S; 2S+cx */
cnReg('Y',.3,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,yb=0.45*H;
  const P=[rr(0,yb,S,H),rr(w-S,yb,w,H),rr(0,yb,w,yb+Tt),rr(w/2-S/2,0,w/2+S/2,yb+2)];
  P.rc=[[0,yb],[w,yb],[S,yb+Tt],[w-S,yb+Tt]];return P;},{eq:1});
/* У: три варианта (COND_UV=A|B|C) */
const cnUup=(c,w,H,yq,ext)=>{const S=c.S,T=c.T;return [rr(0,yq,S,H),rr(w-S,ext,w,H),rr(0,yq,w-S+1,yq+T)];};
cnReg('У',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,yq=0.42*H,dd=cnDep(c);let P;
  if(CN_UV==='B'){const hk=Math.max(Tt+0.2*S,0.65*dd);
    P=cat(cnUup(c,w,H,yq,-dd),[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)]);
    P.rc=[[0,yq],[0,-dd],[w,-dd],[S,yq+T],[S,-dd+Tt],[w-S,-dd+Tt]];}
  else if(CN_UV==='C'){const yb=0.45*H;
    P=[rr(0,yb,S,H),rr(w-S,yb,w,H),rr(0,yb,w,yb+Tt),rr(w/2-S/2,0,w/2+S/2,yb+2),rr(0,0,w/2+S/2,Tt)];
    P.rc=[[0,yb],[w,yb],[0,0],[S,yb+Tt],[w-S,yb+Tt],[w/2-S/2,Tt]];}
  else{const hk=0.20*H;
    P=cat(cnUup(c,w,H,yq,0),[rr(0,0,w,Tt),rr(0,0,S,hk)]);
    P.rc=[[0,yq],[0,0],[w,0],[S,yq+T],[S,Tt],[w-S,Tt]];}
  return P;},{eq:1});
/* G: закрытая С, нижняя стойка поднята до середины + язычок влево; 2S+cx */
cnReg('G',.3,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,g=0.33*H,yh=0.36*H,tl=0.6*c.cx;
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(0,0,w,Tt),rr(w-S,yh+g,w,H),rr(w-S,0,w,yh),rr(w-S-tl,yh-0.8*T,w-S+1,yh)];
  P.rc=[[0,H],[0,0],[w,H],[w,0],[S,Tt],[S,H-Tt],[w-S,Tt],[w-S,H-Tt]];return P;},{eq:1});
/* W: вертикальное зеркало М: две стойки + центральная перевёрнутая V до 65 %; 3S+2cx */
cnReg('W',.3,3,(c,w,H)=>{const S=c.S,cx=c.cx,inner=w-2*S,wh=(inner-cx)/2,ymax=0.65*H,xc=w/2;
  return [rr(0,0,S,H),rr(w-S,0,w,H),cnPara([S+wh/2,0],[xc,ymax],wh),cnPara([w-S-wh/2,0],[xc,ymax],wh)];},{eq:1});
