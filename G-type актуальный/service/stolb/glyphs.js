/* ---------- «Столб» (stolb): строчные, акценты, цифры, знаки. Базовый набор (RU/EN, цифры, пунктуация, символы CS68) ---------- */
const CN_CAPH=700,CN_ASC=730,CN_DD=170;
const CN_CYR_U='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',CN_CYR_L='абвгдежзийклмнопрстуфхцчшщъыьэюя';
const CN_LAT_U='ABCDEFGHIJKLMNOPQRSTUVWXYZ',CN_LAT_L='abcdefghijklmnopqrstuvwxyz',CN_DIG='0123456789';
const CN_PUNCT=[...'.,:;!?«»„“”‘’"\'-–—()/&№…@#%*−·•°+=\\|₽©‒'];
const CN_SPACES={' ':1,' ':1,' ':1,' ':1};
const cnLcCtx=c=>{const k=Math.min(0.90,0.27*c.lcr*CN_CAPH/c.S);const d=cnSub(c,k),xh=c.lcr*CN_CAPH;d.T=Math.min(d.T,0.19*xh);d.Tr=Math.min(d.Tr,0.20*xh);d.asc=CN_ASC;d.dd=CN_DD;return d;};
/* ---- строчные латинские формы (собственные) ---- */
const cnArch=(c,w,H,hs)=>{const S=c.S,Tt=c.Tr;const P=[rr(0,0,S,hs),rr(w-S,0,w,H),rr(S-1,H-Tt,w,H)];P.rc=[[w,H],[w-S,H-Tt],[S,H-Tt]];return P;};
cnReg('n',.34,2,(c,w,H)=>cnArch(c,w,H,H),{});
cnReg('h',.34,2,(c,w,H)=>cnArch(c,w,H,c.asc),{});
cnReg('r',.26,1,(c,w,H)=>{const S=c.S,Tt=c.Tr,hk=Math.min(0.26*H,H-0.4*S-Tt);const P=[rr(0,0,S,H),rr(S-1,H-Tt,w,H),rr(w-0.85*S,H-hk,w,H)];P.rc=[[w,H],[S,H-Tt]];return P;},{ex:(c)=>0.85*c.S+0.6*c.cmin});
cnReg('b',.37,2,(c,w,H)=>cat([rr(0,0,c.S,c.asc)],cnRing(0,0,w,H,c,{t:false})),{});
cnReg('d',.37,2,(c,w,H)=>cnMirP(cat([rr(0,0,c.S,c.asc)],cnRing(0,0,w,H,c,{t:false})),w),{});
cnReg('p',.37,2,(c,w,H)=>cat([rr(0,-c.dd,c.S,H)],cnRing(0,0,w,H,c,{l:false,b:false})),{});
cnReg('q',.37,2,(c,w,H)=>cnMirP(cat([rr(0,-c.dd,c.S,H)],cnRing(0,0,w,H,c,{l:false,b:false})),w),{});
cnReg('a',.36,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,hm=Math.max(0.50*H,2*Tt+0.23*H),hk=Math.min(0.12*H+0.3*Tt,H-hm-Tt*0.5-0.26*H),x0=0.05*w;
  const bowl=cnRing(0,0,w,hm,c);
  const hd=Math.min(0.24*H,H-hm-0.20*H);const P=cat(bowl,[rr(w-S,0,w,H),rr(0,H-Tt,w,H),rr(0,H-hd,S,H)]);P.rc=P.rc.concat([[w,H],[0,H],[S,H-Tt],[w-S,H-Tt]]);return P;},{eq:1});
cnReg('e',.36,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,ym=0.54*H,gp=Math.max(0.55*S,0.22*H*c.ap),hk=Math.max(Tt+0.3*S,ym-T/2-gp);
  const P=[rr(0,0,S,H),rr(0,H-Tt,w,H),rr(S-1,ym-T/2,w,ym+T/2),rr(w-S,ym-T/2,w,H),rr(0,0,w,Tt),cnHook(w-S,w,Tt-1,Math.min(hk,ym-T/2-0.45*S),'r',c)];
  P.rc=[[0,H],[w,H],[0,0],[w,0],[S,Tt],[S,H-Tt],[w-S,H-Tt]];return P;},{});
cnReg('g',.37,2,(c,w,H)=>{const S=c.S,Tt=c.Tr,dd=c.dd,hk=Math.min(0.55*dd+0.2*S,dd-0.1*S);
  const P=cat(cnRing(0,0,w,H,c),[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)]);P.rc=P.rc.concat([[w,-dd],[w-S,-dd+Tt]]);return P;},{});
cnReg('f',.30,1,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,xs=0.34*S+0.1*c.cmin;const P=[rr(xs,0,xs+S,c.asc),rr(xs,c.asc-Tt,w,c.asc),rr(0,H-T,xs+S+0.55*S,H)];P.rc=[[xs,c.asc],[w,c.asc]];return P;},{ex:(c)=>1.55*c.S+0.9*c.cmin});
cnReg('t',.30,1,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,xs=0.34*S+0.1*c.cmin;const P=[rr(xs,0,xs+S,0.94*c.asc),rr(0,H-T,w,H),rr(xs,0,w,Tt),rr(w-S*0.9,0,w,0.24*H)];P.rc=[[w,0],[xs,0],[xs+S,Tt]];return P;},{ex:(c)=>1.55*c.S+0.9*c.cmin});
cnReg('i',.001,1,(c,w,H)=>{const S=c.S,dh=0.82*S,gp=Math.max(0.62*S,0.12*H);return [rr(0,0,w,H),rr(0,H+gp,w,H+gp+dh)];},{mn:(c)=>c.S});
cnReg('j',.22,1,(c,w,H)=>{const S=c.S,Tt=c.Tr,dd=c.dd,dh=0.82*S,gp=Math.max(0.62*S,0.12*H),hk=Math.min(0.5*dd,dd-0.1*S);
  const P=[rr(w-S,-dd,w,H),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk),rr(w-S,H+gp,w,H+gp+dh)];P.rc=[[w,-dd],[w-S,-dd+Tt]];return P;},{ex:(c)=>0.9*c.S+0.3*c.cmin});
cnReg('l',.001,1,(c,w,H)=>{const S=c.S,Tt=c.Tr;const P=[rr(0,0,S,c.asc),rr(0,0,w,Tt)];P.rc=[[w,0]];return P;},{mn:(c)=>1.62*c.S});
cnReg('k',.34,2,(c,w,H)=>[rr(0,0,c.S,c.asc)].concat(cnKpart(c,w,H)),{mn:(c)=>2.5*c.S+c.cmin});
cnReg('y',.30,2,(c,w,H)=>{const dd=c.dd,D=cnDw(c,w-c.D,H+dd),yb=0.36*H,xl=D/2,xr=w-D/2;
  const P=[cnPara([xl,-dd],[xr,H],D)];const m=(xr-xl)/(H+dd);const xj=xl+m*(yb+dd);P.push(cnPara([xl,H],[xj,yb],D));return P;},{mn:(c)=>2.3*c.D+0.4*c.cmin});
/* строчные из кириллических/латинских прописных рецептов на высоте x (с масштабом ширины) */
const CN_LCMAP={o:'О',c:'С',s:'S',v:'V',w:'W',x:'Х',z:'Z',u:'U','в':'В','г':'Г','д':'Д','ж':'Ж','з':'З','и':'И','й':'И','к':'К','л':'Л','м':'М','н':'Н','п':'П','т':'Т','ц':'Ц','ч':'Ч','ш':'Ш','щ':'Щ','ъ':'Ъ','ы':'Ы','ь':'Ь','э':'Э','ю':'Ю','я':'Я','ё':'Е'};
for(const k in CN_LCMAP){const b=CN_LET[CN_LCMAP[k]];CN_LET[k]=Object.assign({},b,{ch:k,wr:b.wrl||b.wr*1.24});}
CN_LET.i.wr=CN_LET.l.wr=0.001;
cnReg('m',.62,3,(c,w,H)=>{const S=c.S,Tt=c.Tr,xm=(w-S)/2;const P=[rr(0,0,S,H),rr(xm,0,xm+S,H),rr(w-S,0,w,H),rr(S-1,H-Tt,xm+S,H),rr(xm,H-Tt,w,H)];P.rc=[[xm+S,H],[w,H],[S,H-Tt],[xm,H-Tt]];return P;},{mn:(c)=>3*c.S+2*c.cmin});
/* б — стойка с флажком + чаша; ф — овал со стойкой от нижнего до верхнего выносного */
cnReg('б',.34,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr;const P=cat([rr(0,0,S,c.asc),rr(0,c.asc-T,w*0.86,c.asc)],cnRing(0,0,w,H,c,{t:false}));return P;},{});
cnReg('ф',.4,3,(c,w,H)=>cnPhi(c,w,H,0,H,-c.dd,c.asc),{eq:1});
for(const ch of 'nhbdpqaegб')CN_LET[ch].eq=1;CN_LET.m.eq=1;CN_LET['ф'].eq=1;
/* ---- акценты ---- */
function cnDots(w,y0,c){const d=Math.min(0.72*c.S,w/2.5),g=0.5*d,x0=(w-2*d-g)/2;return [rr(x0,y0,x0+d,y0+d),rr(x0+d+g,y0,x0+2*d+g,y0+d)];}
function cnBreve(w,y0,c){const S=c.S,db=Math.min(0.80*S,w*0.30),gb=Math.max(0.34*S,22),wb=Math.min(2*db+gb,w*0.94),bt=0.62*c.T,mh=bt+0.80*db,x0=(w-wb)/2;
  const P=[rr(x0,y0,x0+db,y0+mh),rr(x0+wb-db,y0,x0+wb,y0+mh),rr(x0+db-1,y0,x0+wb-db+1,y0+bt)];P.rc=[[x0,y0],[x0+wb,y0],[x0+db,y0+bt],[x0+wb-db,y0+bt]];return P;}
const cnMarkGap=c=>Math.max(40,0.34*c.S);
/* ---- базовые знаки ---- */
const CN_BASE_UP={Ё:'Е',Й:'И'};
function cnGlyphPiece(ch,c){
  if(CN_SPACES[ch])return {cs:[],w:1,dy:0,raw:[],rc:[],space:true};
  let key=ch,cc=c,H=CN_CAPH,lower=false;
  const isDig=CN_DIG.includes(ch),isU=CN_LAT_U.includes(ch)||CN_CYR_U.includes(ch)||'ЁЙ'.includes(ch),isL=CN_LAT_L.includes(ch)||CN_CYR_L.includes(ch)||'ёй'.includes(ch);
  if(isDig||isU||isL){
    if(ch==='Ё')key='Е';else if(ch==='Й')key='И';else if(ch==='ё')key='e';else if(ch==='й')key='и';
    if(isL){H=CN_CAPH*c.lcr;cc=cnLcCtx(c);lower=true;}
    else if(ch==='Й'||ch==='Ё'){}
    const sh=CN_SHARED[key];if(sh&&!CN_LET[key])key=sh;
    const P=cnBuild(key,cc,H);let raw=P.polys,rc=(raw.rc||[]).slice();
    let extra=[];if(ch==='ё'||ch==='Ё'){extra=cnDots(P.w,H+cnMarkGap(cc),cc);}
    if(ch==='й'||ch==='Й'){const b=cnBreve(P.w,H+cnMarkGap(cc),cc);extra=b;rc=rc.concat(b.rc);}
    raw=Object.assign(raw.concat(extra),{rc});
    return {cs:cnFinish(raw,cc.R,cc.ri,rc,cc.Rs),w:P.w,dy:0,raw,rc};}
  const Q=cnPunct(ch,c,CN_CAPH);if(!Q)return null;
  return {cs:cnFinish(Q.polys,c.R,c.ri,Q.rc||[],c.Rs),w:Q.w,dy:0,raw:Q.polys,rc:Q.rc||[]};}
const cnDot=(x,y,d)=>rr(x,y,x+d,y+d);
const cnComma=(x,y,d)=>[cnDot(x,y,d),cnPara([x+d*0.58,y+d*0.2],[x+d*0.22,y-0.74*d],d*0.78)];
function cnPunct(ch,c,H){const S=c.S,T=c.T,Tt=c.Tr,d=1.02*S,ym=0.47*H;let polys=[],w=0,rc=[];
  const sm=cnSub(c,0.62);
  if(ch==='.'){polys=[cnDot(0,0,d)];w=d;}
  else if(ch===','){polys=cnComma(0.1*d,0,d);w=1.2*d;}
  else if(ch===':'){polys=[cnDot(0,0,d),cnDot(0,0.375*H*1.0,d)];w=d;}
  else if(ch===';'){polys=[cnDot(0.1*d,0.375*H,d)].concat(cnComma(0.1*d,0,d));w=1.2*d;}
  else if(ch==='!'){polys=[rr(0,Math.max(0.26*H,d+Math.max(0.35*S,26)),d,H),cnDot(0,0,d)];w=d;}
  else if(ch==='?'){w=Math.max(0.27*H,2*S+0.6*c.cmin);const hk=0.20*H;polys=[rr(0,H-Tt,w,H),rr(w-S,0.50*H,w,H-Tt/2),rr(w/2-S/2,0.50*H,w,0.50*H+T),rr(w/2-S/2,Math.max(0.26*H,d+Math.max(0.35*S,26)),w/2+S/2,0.50*H+T/2),cnDot(w/2-d/2,0,d),rr(0,H-hk,S,H)];rc=[[w,H],[w-S,H-Tt],[w,0.50*H+T]];}
  else if(ch==='«'||ch==='»'){const hh=0.15*H,yc=0.40*H,dx=0.115*H,t=0.78*S;
    const chev=(x0,flip)=>{let vs=[[0,yc],[dx,yc+hh],[dx+t,yc+hh],[t,yc],[dx+t,yc-hh],[dx,yc-hh]];if(flip)vs=vs.map(v=>[dx+t-v[0],v[1]]);return cnSolid(vs.map(v=>[v[0]+x0,v[1]]));};
    const step=0.5*dx+1.1*t;w=dx+t+step;polys=[chev(0,ch==='»'),chev(step,ch==='»')];}
  else if('„“”‘’'.includes(ch)){const yh=(ch==='„')?0:H-d*0.98,gp=0.5*d,n='„“”'.includes(ch)?2:1;
    for(let k=0;k<n;k++){let q=cnComma(0,yh,d);q=cnShift(q,k*(d+gp)+0.12*d,0);
      if(ch==='“'||ch==='‘'){const cy=yh+d/2,cx=0.12*d+k*(d+gp)+d/2;q=q.map(z=>({p:z.p.map(v=>[2*cx-v[0],2*cy-v[1]]),h:z.h}));}
      polys=polys.concat(q);}
    w=n*d+(n-1)*gp+0.24*d;}
  else if(ch==='"'){const b=0.9*S;polys=[rr(0,0.60*H,b,H),rr(b*1.6,0.60*H,2.6*b,H)];w=2.6*b;}
  else if(ch==="'"){const b=0.9*S;polys=[rr(0,0.60*H,b,H)];w=b;}
  else if(ch==='-'){w=0.30*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='‒'){w=Math.max(0.27*H,2*S+c.cmin);polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='–'){w=0.46*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='—'){w=0.80*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='−'){w=0.36*H;polys=[rr(0,ym-T*.5,w,ym+T*.5)];}
  else if(ch==='('||ch===')'){w=0.28*H;const wh=0.88*S;
    polys=[rr(0,0.10*H,wh,0.90*H),cnPara([wh/2,0.86*H],[w-wh/2,1.02*H],wh),cnPara([wh/2,0.14*H],[w-wh/2,-0.02*H],wh)];if(ch===')')polys=cnMirror(polys,w);}
  else if(ch==='/'){w=0.40*H;const wh=0.85*S;polys=[cnPara([wh/2,-0.04*H],[w-wh/2,1.0*H],wh)];}
  else if(ch==='\\'){w=0.40*H;const wh=0.85*S;polys=[cnPara([wh/2,1.0*H],[w-wh/2,-0.04*H],wh)];}
  else if(ch==='|'){w=0.85*S;polys=[rr(0,-0.12*H,w,1.0*H)];}
  else if(ch==='&'){w=Math.max(0.46*H,(2*S+c.cmin+14)/0.84);const wh=0.95*S;const up=cnRing(w*0.04,0.50*H,w*0.88,H,c),lo=cnRing(0,0,w*0.98,0.56*H,c);
    polys=cat(up,lo,[cnPara([w*0.52,0.58*H],[w-wh/2+0.2*S,0],wh)]);rc=polys.rc;}
  else if(ch==='№'){const n=cnBuild('N',c,H),o=cnBuild('o',cnSub(c,0.62),0.56*H*0.82),gp=Math.max(0.30*S,18);w=n.w+gp+o.w;
    polys=cat(n.polys,cnMov(o.polys,n.w+gp,H-0.56*H*0.82),[rr(n.w+gp,H-0.56*H*0.82-0.9*T*0.62,w,H-0.56*H*0.82-0.9*T*0.62+0.55*T*0.62)]);rc=polys.rc;}
  else if(ch==='…'){const gp=0.55*d;w=3*d+2*gp;polys=[0,1,2].map(k=>cnDot(k*(d+gp),0,d));}
  else if(ch==='@'){let inn;const ss=sm.S,tt=sm.T,iw=2*ss+0.9*c.cmin+ss,ih=0.36*H;inn=cat(cnRing(0,0,iw-ss,ih,sm),[rr(iw-ss,0,iw,ih*0.75)]); const gp=Math.max(0.5*c.cmin,16);w=iw+2*(c.S+gp);const h=0.80*H,S2=c.S,T2=c.T,hi=ih;
    const box=[rr(0,0,S2,h),rr(w-S2,0,w,h),rr(S2-1,0,w-S2+1,T2),rr(S2-1,h-T2,w-S2+1,h)];
    polys=cat(box,cnMov(inn,S2+gp,h*0.5-hi*0.5));rc=[[0,0],[w,0],[0,h],[w,h]];}
  else if(ch==='#'){w=Math.max(0.46*H,3.1*S+30);const b=0.78*T,vs=0.82*S;polys=[rr(w*0.16,0,w*0.16+vs,H),rr(w*0.84-vs,0,w*0.84,H),rr(0,H*0.30,w,H*0.30+b),rr(0,H*0.60,w,H*0.60+b)];}
  else if(ch==='%'){const s=Math.max(0.27*H,2*sm.Tr+1.2*c.cmin+36),rw=Math.max(0.9*s,2*sm.S+1.2*c.cmin+24),wh=0.62*S;w=Math.max(0.60*H,1.75*rw,wh+(rw+25)*H/(H-s));polys=cat(cnRing(0,H-s,rw,H,sm),cnRing(w-rw,0,w,s,sm),[cnPara([wh/2,0],[w-wh/2,H],wh)]);rc=polys.rc;}
  else if(ch==='*'){w=0.34*H;const b=0.54*S,cx=w/2,cy=0.78*H,L=0.15*H;
    polys=[rr(cx-b/2,cy-L,cx+b/2,cy+L),cnPara([cx-L*.85,cy-L*.85],[cx+L*.85,cy+L*.85],b),cnPara([cx+L*.85,cy-L*.85],[cx-L*.85,cy+L*.85],b),rr(cx-L,cy-b/2,cx+L,cy+b/2)];}
  else if(ch==='·'){polys=[cnDot(0,0.5*c.lcr*H-d/2,d)];w=d;}
  else if(ch==='•'){const D=1.55*d;polys=cat(cnRing(0,ym-D/2,D,ym+D/2,{S:0,Tr:0,cmin:0}));polys=[cnDot(0,ym-D/2,D)];w=D;}
  else if(ch==='°'){const s=Math.max(0.24*H,2*sm.Tr+60);w=Math.max(s*0.8,2*sm.S+60);polys=cnRing(0,H-s,w,H,sm);rc=polys.rc;}
  else if(ch==='+'){w=0.36*H;const b=0.82*S;polys=[rr(w/2-b/2,ym-w/2+0.03*H,w/2+b/2,ym+w/2-0.03*H),rr(0.02*H,ym-T*.5,w-0.02*H,ym+T*.5)];}
  else if(ch==='='){w=0.36*H;const g=0.14*H;polys=[rr(0,ym-g-T*.5,w,ym-g+T*.5),rr(0,ym+g-T*.5,w,ym+g+T*.5)];}
  else if(ch==='₽'){const P=cnBuild('Р',c,H);w=P.w+0.3*S;polys=cat(P.polys,[rr(-0.30*S,0.27*H,P.w-0.1*S,0.27*H+0.8*T)]);rc=polys.rc;}
  else if(ch==='©'){let inn;const ss=sm.S,tt=sm.T,iw=2*ss+0.9*c.cmin,ih=0.36*H;inn=[rr(0,0,ss,ih),rr(ss-1,0,iw,tt),rr(ss-1,ih-tt,iw,ih)]; const gp=Math.max(0.5*c.cmin,16);w=iw+2*(c.S+gp);const h=0.80*H,S2=c.S,T2=c.T,hi=ih;
    const box=[rr(0,0,S2,h),rr(w-S2,0,w,h),rr(S2-1,0,w-S2+1,T2),rr(S2-1,h-T2,w-S2+1,h)];
    polys=cat(box,cnMov(inn,S2+gp,h*0.5-hi*0.5));rc=[[0,0],[w,0],[0,h],[w,h]];}
  else return null;
  polys=Object.assign(polys.slice?polys.slice():polys,{rc:rc||[]});
  return {polys,w,rc:rc||[]};}
const CN_SHARED={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y'};
/* строчная у: вариант B для всех (правая стойка ниже базовой, крюк влево) */
const CN_UVL=(typeof process!=='undefined'&&process.env&&process.env.COND_UVL)||'B';
cnReg('y',.30,2,(c,w,H)=>{const S=c.S,T=c.T,Tt=c.Tr,dd=c.dd,yq=0.42*H,hk=Math.max(Tt+0.2*S,0.65*dd);
  if(CN_UVL==='A'){const hA=0.22*H;const P=[rr(0,yq,S,H),rr(w-S,0,w,H),rr(0,yq,w-S+1,yq+T),rr(0,0,w,Tt),rr(0,0,S,hA)];
    P.rc=[[0,yq],[0,0],[w,0],[S,yq+T],[S,Tt],[w-S,Tt]];return P;}
  const P=[rr(0,yq,S,H),rr(w-S,-dd,w,H),rr(0,yq,w-S+1,yq+T),rr(0,-dd,w,-dd+Tt),rr(0,-dd,S,-dd+hk)];
  P.rc=[[0,yq],[0,-dd],[w,-dd],[S,yq+T],[S,-dd+Tt],[w-S,-dd+Tt]];return P;},{eq:1});
