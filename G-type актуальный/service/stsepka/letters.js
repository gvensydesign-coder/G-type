/* ---------- «Сцепка»: рецепты букв (прописные формы; строчные — те же формы, ниже и тоньше) ---------- */
function stCtx(o){o=o||{};const S=o.S==null?138:o.S,rnd=o.rnd==null?0.45:o.rnd;
  const c={S,T:0.8*S,wd:o.wd==null?1:o.wd,r:rnd*S,ri:0.5*rnd*S,gap:o.gap==null?44:o.gap,lcr:o.lcr==null?0.72:o.lcr,jump:o.jump==null?1:o.jump,cmin:Math.max(46,0.30*S),lc:false,rnd};
  return c;}
function stSub(c,k){const d=Object.assign({},c);d.lc=true;d.S=c.S*k;d.T=c.T*k;d.r=c.r*k;d.ri=c.ri*k;return d;}
const ST_LET={};
function stReg(chars,wr,ns,flags,f){flags=flags||{};for(const ch of chars)ST_LET[ch]={f,wr,ns,lw:!!flags.lw,rs:!!flags.rs,at:!!flags.at,af:!!flags.af,ch};}
const ST_MINW={'И':S=>2.8*S+40,'N':S=>2.8*S+40,'К':S=>2.45*S+40,'K':S=>2.45*S+40,'Л':S=>3.0*S,'D':S=>2.95*S,'В':S=>2.45*S,'B':S=>2.45*S,'Б':S=>2.45*S,'8':S=>2.45*S};
function stWidth(ch,c,H){const d=ST_LET[ch];const m=ST_MINW[ch]?ST_MINW[ch](c.S):0;
  let raw=Math.max(1.08*d.wr*H*c.wd,d.ns*c.S+(d.ns-1)*c.cmin+(ch==='1'?0.5*c.S:0),m);
  if(c.lc&&'ВB8Б'.includes(ch))raw*=1.16;
  const q=0.5*c.S,lo=Math.max(d.ns*c.S+(d.ns-1)*c.cmin+(ch==='1'?0.5*c.S:0),m);
  return Math.max(Math.round(raw/q)*q,Math.ceil(lo/q)*q);}
/* build: -> {polys,w} ; x0 ink from 0 */
function stBuild(ch,c,H,xt,xf,w){const d=ST_LET[ch];if(w==null)w=stWidth(ch,c,H);
  return {polys:d.f(c,w,H,xt||0,xf||0),w,ext:Math.max(xt||0,xf||0)};}
const rr=stRR;
function stRing(x0,y0,x1,y1,c,ri){const S=c.S,T=c.T;return [rr(x0,y0,x1,y1),stRH(x0+S,y0+T,x1-S,y1-T)];}
const stYm=(c,H)=>0.47*H;
/* ---- прямые ---- */
stReg('ОO',.54,2,{lw:1,rs:1},(c,w,H)=>stRing(0,0,w,H,c));
/* CS68: 0 ≠ О — кольцо с косой чертой в счётчике (одинаковые ствол/радиусы), ширина прежняя */
stReg('0',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(0,0,w,T),rr(0,H-T,w,H),stPara([S*0.9,T*0.9],[w-S*0.9,H-T*0.9],0.5*S)];});
stReg('НH',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H);return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,ym-T/2,w-S+1,ym+T/2)];});
stReg('П',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,H-T,w-S+1,H)];});
const stG=(c,w,H,xt)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,H-T,w+xt,H)];};
stReg('ГF',.46,1,{lw:1,at:1},(c,w,H,xt)=>stG(c,w,H,xt));
stReg('F',.46,1,{lw:1,at:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,ym=stYm(c,H);return stG(c,w,H,xt).concat([rr(S-1,ym-T/2,w*0.84,ym+T/2)]);});
stReg('ТT',.54,1,{at:1},(c,w,H,xt)=>{const S=c.S,T=c.T;return [rr(0,H-T,w+xt,H),rr(w/2-S/2,0,w/2+S/2,H-T+1)];});
stReg('ЕE',.46,1,{lw:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,ym=stYm(c,H);return [rr(0,0,S,H),rr(0,H-T,w,H),rr(S-1,ym-T/2,w*0.86,ym+T/2),rr(0,0,w+xf,T)];});
stReg('L',.46,1,{lw:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(0,0,w+xf,T)];});
stReg('I',.12,1,{lw:1,rs:1},(c,w,H)=>[rr(0,0,w,H)]);/* FX2g: I = голый ствол (ширина по S, 0.22·H давало 177 u при штрихе 118 в Light) */
const stU=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(S-1,0,w-S+1,T)];};
stReg('U',.54,2,{lw:1,rs:1},stU);
stReg('Ц',.56,2,{lw:1,rs:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,g=c.gap,D=g+T,ext=Math.max(xf,0.6*S);
  return stU(c,w,H).concat([rr(w-S,-D,w,1),rr(w-1,-D,w+ext,-g)]);});
const stSh=(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,S,H),rr(w-S,0,w,H),rr(w/2-S/2,0,w/2+S/2,H),rr(S-1,0,w-S+1,T)];};
stReg('Ш',.82,3,{lw:1,rs:1},stSh);
stReg('Щ',.86,3,{lw:1,rs:1,af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,g=c.gap,D=g+T,ext=Math.max(xf,0.6*S);
  return stSh(c,w,H).concat([rr(w-S,-D,w,1),rr(w-1,-D,w+ext,-g)]);});
stReg('Ч',.52,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,yq=0.36*H;return [rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T)];});
stReg('Ь',.50,2,{lw:1},(c,w,H)=>{const S=c.S,hb=0.62*H;return [rr(0,0,S,H)].concat(stRing(0,0,w,hb,c));});
stReg('Ъ',.58,2,{},(c,w,H)=>{const S=c.S,T=c.T,hb=0.62*H,fl=0.85*S;const d=fl+2*S-w;if(-22<d&&d<22)w=fl+2*S-26;
  return [rr(0,H-T,fl+S,H),rr(fl,0,fl+S,H)].concat(stRing(fl,0,w,hb,c));});
stReg('Ы',.78,3,{lw:1,rs:1},(c,w,H)=>{const S=c.S,hb=0.62*H,g=Math.max(26,0.2*S),bw=w-S-g;
  return [rr(0,0,S,H)].concat(stRing(0,0,bw,hb,c),[rr(w-S,0,w,H)]);});
stReg('Б',.50,2,{lw:1,at:1},(c,w,H,xt)=>{const S=c.S,T=c.T,hb=0.58*H;return [rr(0,0,S,H),rr(0,H-T,w+xt,H)].concat(stRing(0,0,w,hb,c));});
const stTwo=(c,w,H,yu)=>stRing(0,yu,w,H,c).concat(stRing(0,0,w,yu+c.T,c));
stReg('ВB',.52,2,{lw:1},(c,w,H)=>stTwo(c,w,H,0.42*H));/* FX2g: талия 0.42 H (было 0.46) — В отличается от 8 (0.52) */
stReg('8',.46,2,{lw:1,rs:1},(c,w,H)=>stTwo(c,w,H,0.52*H));
const stRru=(c,w,H,xt)=>{const S=c.S,T=c.T,yu=0.40*H;const P=[rr(0,0,S,H)].concat(stRing(0,yu,w,H,c));if(xt)P.push(rr(w-1,H-T,w+xt,H));return P;};
stReg('РP',.50,2,{lw:1,at:1},stRru);
const stRl=(c,w,H)=>{const S=c.S,yu=0.40*H,wh=1.0*S;
  return stRru(c,w,H,0).concat([stPara([Math.max(w-wh/2-0.40*yu,S+0.5*wh+0.3*c.cmin),yu+0.45*c.T],[w-wh/2,0],wh)]);};
stReg('R',.54,2,{lw:1},stRl);
stReg('Я',.54,2,{rs:1},(c,w,H)=>stMirror(stRl(c,w,H),w));
stReg('D',.54,2,{lw:1},(c,w,H)=>{const S=c.S,T=c.T;return [rr(0,0,w,H),stRH(1.45*S,T,Math.max(w-S,1.45*S+0.45*S),H-T)];});
stReg('Q',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T;return stRing(0,0,w,H,c).concat([rr(w-1.55*S,-0.80*T,w+0.28*S,0.55*T)]);});/* FX2g: хвост Q — брусок под правой половиной кольца (было малый выступ): Q ≠ 0 */
const stC=(c,w,H,hk)=>{const S=c.S,T=c.T;hk=hk==null?(T+0.6*S):hk;hk=Math.min(hk,0.36*H);
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(w-S,0,w,hk)];};
stReg('СC',.52,2,{lw:1},(c,w,H)=>stC(c,w,H));
stReg('G',.54,2,{lw:1},(c,w,H)=>{const S=c.S,T=c.T,hk=Math.min(T+0.6*S,0.36*H),yh=0.52*H;
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(w-S,0,w,yh),rr(w*0.46,yh-T,w-S+1,yh)];});
/* FX2g: Э — перекладина длиннее (от 0.10 w) и крюки короче (≤ 0.8 от предела): З/Э/3 различимы при 12 px */
/* CS68: Э — одна чаша: сплошная прямая правая стойка без талии, короткий язычок слева (не касается стойки), крюки левых концов внутрь */
stReg('Э',.52,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=Math.min(T+0.3*S,0.8*(ym-T/2-0.35*S)),cw=w-2*S;
  return [rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,0,w,H),rr(0,H-hk,S,H),rr(0,0,S,hk),rr(0,ym-T/2,Math.max(S+0.2*S,0.55*cw+S*0.5),ym+T/2)];});
const stThree=(c,w,H,hookTop,hookBot,hk,waist)=>{const S=c.S,T=c.T,ym=stYm(c,H),nh=0.9*T,hkm=Math.min(H-ym-T/2-0.35*S,ym-T/2-0.35*S);hk=Math.min(hk,hkm);
  const P=[rr(0,H-T,w,H),rr(0,0,w,T),rr(w-S,ym+nh/2-3,w,H-T/2),rr(w-S,T/2,w,ym-nh/2+3),rr(Math.max(w*0.42,w-1.62*S),ym-nh/2,w-(waist?0.4*S:0),ym+nh/2)];
  if(hookTop)P.push(rr(0,H-hk,S,H));if(hookBot)P.push(rr(0,0,S,hk));return P;};
stReg('З',.52,2,{},(c,w,H)=>stThree(c,w,H,true,true,c.T+0.75*c.S,true));
stReg('3',.52,2,{},(c,w,H)=>stThree(c,w,H,false,true,c.T+0.3*c.S));
stReg('S',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=Math.min(T+0.6*S,H-ym-T/2-0.35*S,ym-T/2-0.35*S);
  return [rr(0,H-T,w,H),rr(0,ym-T/2,S,H-T/2),rr(0,ym-T/2,w,ym+T/2),rr(w-S,T/2,w,ym+T/2),rr(0,0,w,T),rr(w-S,H-hk,w,H),rr(0,0,S,hk)];});
stReg('5',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),hk=T+0.3*S;
  return [rr(0,H-T,w,H),rr(0,ym-T/2,S,H),rr(0,ym-T/2,w,ym+T/2),rr(w-S,T/2,w,ym+T/2),rr(0,0,w,T),rr(0,0,S,hk)];});
stReg('2',.50,2,{},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H);
  return [rr(0,H-T,w,H),rr(w-S,ym-T/2,w,H-T/2),rr(0,ym-T/2,w,ym+T/2),rr(0,T/2,S,ym+T/2),rr(0,0,w,T)];});
const st6=(c,w,H)=>{const S=c.S,T=c.T,hb=0.60*H,hk=T+0.3*S;
  return [rr(0,0,S,H),rr(0,H-T,w,H),rr(w-S,H-hk,w,H)].concat(stRing(0,0,w,hb,c));};
stReg('6',.52,2,{lw:1},st6);
stReg('9',.52,2,{rs:1},(c,w,H)=>st6(c,w,H).map(q=>({p:q.p.map(v=>[w-v[0],H-v[1]]),h:q.h})));
stReg('4',.54,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,yb=0.24*H,wh=0.95*S;
  return [rr(w-S,0,w,H),rr(0,yb,w,yb+T),stPara([wh/2,yb+T],[w-S-wh/2,H],wh)];});
stReg('7',.50,1,{},(c,w,H)=>{const S=c.S,T=c.T,wh=1.05*S;return [rr(0,H-T,w,H),stPara([w*0.40,0],[w-wh/2,H-T],wh)];});
stReg('1',.38,1,{rs:1},(c,w,H)=>{const S=c.S,wh=S;return [rr(w-S,0,w,H),stPara([w-S/2,H],[wh*0.45,H-0.27*H],wh)];});
/* ---- диагональные ---- */
const ST_LEAN=12*Math.PI/180;
function stKpart(c,w,H,x0){x0=x0||0;const S=c.S,T=c.T,ym=stYm(c,H),wh=S/Math.cos(ST_LEAN),st=Math.max(0.42*S,c.cmin*0.9),xb=x0+S+st+wh/2;
  let xt=Math.min(x0+w-wh/2,xb+(H-ym)*Math.tan(16*Math.PI/180));xt=Math.max(xt,xb+4);
  return [rr(x0+S-1,ym-T/2,xb+wh/2,ym+T/2),stPara([xb,ym],[xt,H],wh),stPara([xb,ym],[xt,0],wh)];}
stReg('КK',.54,2,{lw:1},(c,w,H)=>[rr(0,0,c.S,H)].concat(stKpart(c,w,H)));
stReg('Ж',1.0,3,{},(c,w,H)=>{const S=c.S,ym=stYm(c,H),wc=w/2;
  const cen=rr(wc-S/2,0,wc+S/2,H),L=rr(0,0,S,H),R_=rr(w-S,0,w,H),xs=wc-S/2+1,hb=1.7*S/2,hn=0.34*S;
  const lsp=stSolid([[S-1,ym-hb],[xs,ym-hn],[xs,ym+hn],[S-1,ym+hb]]),rsp=stSolid([[w-S+1,ym-hb],[wc+S/2-1,ym-hn],[wc+S/2-1,ym+hn],[w-S+1,ym+hb]]);
  return [L,R_,cen,lsp,rsp];});
const stI2=(c,w,H)=>{const S=c.S;return [rr(0,0,S,H),rr(w-S,0,w,H),stPara([S*0.5,0],[w-S*0.5,H],S)];};
stReg('ИN',.54,2,{lw:1,rs:1},stI2);
stReg('N',.54,2,{lw:1,rs:1},(c,w,H)=>stMirror(stI2(c,w,H),w));
stReg('ХX',.50,2,{},(c,w,H)=>{const S=c.S,wh=S;return [stPara([wh/2,0],[w-wh/2,H],wh),stPara([w-wh/2,0],[wh/2,H],wh)];});
stReg('Y',.50,2,{},(c,w,H)=>{const S=c.S,wh=S,ymid=0.42*H;
  return [stPara([wh/2,H],[w/2,ymid],wh),stPara([w-wh/2,H],[w/2,ymid],wh),rr(w/2-S/2,0,w/2+S/2,ymid+20)];});
stReg('У',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,g=c.gap,yb=0.42*H;
  return [rr(w-S,0,w,H),rr(0,yb,S,H),rr(S-1,yb,w-S+1,yb+T),rr(0,0,S,yb-g),rr(S-1,0,w-S+1,T)];});
stReg('V',.54,2,{},(c,w,H)=>{const S=c.S,wh=S;return [stPara([wh/2,H],[w/2,0],wh),stPara([w-wh/2,H],[w/2,0],wh)];});
stReg('W',.90,3,{},(c,w,H)=>{const S=c.S,wh=0.9*S,q=w/4;
  return [stPara([wh/2,H],[q,0],wh),stPara([2*q,H*0.58],[q,0],wh),stPara([2*q,H*0.58],[3*q,0],wh),stPara([w-wh/2,H],[3*q,0],wh)];});
stReg('МM',.70,3,{lw:1,rs:1},(c,w,H)=>{const S=c.S;
  return [rr(0,0,S,H),rr(w-S,0,w,H),stPara([S/2,H],[w/2,0.34*H],S),stPara([w-S/2,H],[w/2,0.34*H],S)];});
stReg('Z',.48,2,{af:1},(c,w,H,xt,xf)=>{const S=c.S,T=c.T,wh=S;return [rr(0,H-T,w,H),rr(0,0,w+xf,T),stPara([w-wh/2,H-T],[wh/2,T],wh)];});
stReg('Л',.58,2,{rs:1},(c,w,H)=>{const S=c.S,T=c.T,al=7*Math.PI/180,wh=S/Math.cos(al),lean=H*Math.tan(al),xl=lean;
  return [rr(xl,H-T,w,H),rr(w-S,0,w,H),stPara([wh/2,0],[wh/2+lean,H],wh)];});
stReg('Д',.54,2,{lw:1,rs:1,af:1},(c,w,H)=>{const S=c.S,T=c.T,D=0.8*T;
  return [rr(0,-D,S,H),rr(w-S,-D,w,H),rr(0,H-T,w,H),rr(S-1,0,w-S+1,T)];});
stReg('АA',.54,2,{lw:1,rs:1},(c,w,H)=>{const S=c.S,T=c.T,yb=0.30*H;
  const sol=stSolid([[0,0],[S,0],[S,yb],[w-S,yb],[w-S,0],[w,0],[w,H],[0,H]]);
  return [sol,stHole([[S,yb+T],[w-S,yb+T],[w-S,H-T],[S,H-T]])];});
stReg('Ф',.68,3,{},(c,w,H)=>{const S=c.S,y0=0.14*H,y1=0.86*H;return stRing(0,y0,w,y1,c).concat([rr(w/2-S/2,0,w/2+S/2,H)]);});
stReg('Ю',.80,3,{lw:1},(c,w,H)=>{const S=c.S,T=c.T,ym=stYm(c,H),bl=0.55*S;
  return [rr(0,0,S,H),rr(S-1,ym-T/2,S+bl+1,ym+T/2)].concat(stRing(S+bl,0,w,H,c));});
stReg('J',.46,1,{},(c,w,H)=>{const S=c.S,T=c.T,hk=T+0.5*S;return [rr(w-S,0,w,H),rr(0,0,w,T),rr(0,0,S,hk)];});
