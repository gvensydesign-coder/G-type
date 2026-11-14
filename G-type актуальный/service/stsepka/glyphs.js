/* ---------- «Сцепка»: полный базовый набор поверх рецептов: строчные, акценты, цифры, знаки ---------- */
const ST_CAPH=700;
const ST_CYR_U='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',ST_CYR_L='абвгдежзийклмнопрстуфхцчшщъыьэюя';
const ST_LAT_U='ABCDEFGHIJKLMNOPQRSTUVWXYZ',ST_LAT_L='abcdefghijklmnopqrstuvwxyz',ST_DIG='0123456789';
const ST_PUNCT=[...'.,:;!?«»„“”‘’"\'-–—()/&№…@#%*−·•°+=\\|₽©'];
const ST_SPACES={' ':300,' ':300,' ':120,' ':150};
const ST_LC_DY={b:.085,d:.085,f:.085,h:.085,k:.085,l:.085,t:.06,i:.04,j:-.03,g:-.085,p:-.085,q:-.085,y:-.085,'б':.085,'ф':-.085,'р':-.085,'ц':-.03,'щ':-.03,'д':-.03};
const ST_LC_BASE={};{const a=ST_LAT_L+ST_CYR_L,b=ST_LAT_U+ST_CYR_U;for(let i=0;i<a.length;i++)ST_LC_BASE[a[i]]=b[i];}
const stBaseOf=ch=>ST_LC_BASE[ch]||ch;
/* FX2g: строчный ствол = 0.88 S (как у прописных лесенка весов), предел по высоте строчных 0.27·xh вместо 0.245·xh: 101/118/130/135 вместо 104/121/123/123 (Bold = Black раньше) */
const stLcCtx=c=>stSub(c,Math.min(0.86,0.27*c.lcr*ST_CAPH/c.S));
const stDot=(x,y,d)=>rr(x,y,x+d,y+d);
const ST_JK=1.15;
/* Й: сплошной треугольник в левом верхнем счётчике «И», слитый со стойкой и с верхней линией, одна широкая косая щель (JK·g) к диагонали */
function stJtri(c,w,H){const S=c.S,m=(w-S)/H,xe=y=>m*y,k=Math.sqrt(1+m*m),g=c.gap,hs=ST_JK*g*k,yt=(S+hs)/m;
  if(H-yt<0.35*S)return [];
  return [stSolid([[S*0.5,yt-4],[S+1,yt],[xe(H)-hs,H],[S*0.5,H]])];}
function stAccents(ch,c,H,w){const S=c.S;let out=[];
  if(ch==='ё'||ch==='Ё'){const d=0.62*S,gap=0.5*d,tot=2*d+gap,x0=(w-tot)/2,y0=H+0.30*S;out=[stDot(x0,y0,d),stDot(x0+d+gap,y0,d)];}
  if(ch==='й'||ch==='Й')out=out.concat(stJtri(c,w,H));
  return out;}
/* знак -> {cs:[{hole,nodes,poly}], w, dy, polys(острые куски, до скруглений)} */
function stGlyphPiece(ch,c){const Hcap=ST_CAPH;
  if(ST_SPACES[ch]!=null)return {cs:[],w:ST_SPACES[ch],dy:0,raw:[]};
  const lc=ST_LC_BASE[ch]!=null&&ch!==ch.toUpperCase();
  if(ST_DIG.includes(ch)||ST_LAT_U.includes(ch)||ST_CYR_U.includes(ch)||ST_LC_BASE[ch]!=null||'ЁёЙй'.includes(ch)){
    let b;if(ch==='Ё'||ch==='ё')b='Е';else if(ch==='Й'||ch==='й')b='И';else b=stBaseOf(ch);
    const up=(ch!==ch.toLowerCase()&&ch===ch.toUpperCase())||ST_DIG.includes(ch)||ch==='Ё'||ch==='Й';
    let H,cc;if(up){H=Hcap;cc=c;}else{H=Hcap*c.lcr;cc=stLcCtx(c);}
    let dy=0;if(ST_LC_BASE[ch]!=null&&ch!==ch.toUpperCase()){dy=(ST_LC_DY[ch]||0)*c.jump*Hcap;if(ch==='ф')H=Hcap*(c.lcr+0.17);}
    const P=stBuild(b,cc,H);const raw=P.polys.concat(stAccents(ch,cc,H,P.w));
    return {cs:stFinish(raw,cc.r,cc.ri),w:P.w,dy,raw};}
  const Q=stPunct(ch,c,Hcap);if(!Q)return null;
  return {cs:stFinish(Q.polys,c.r,c.ri),w:Q.w,dy:0,raw:Q.polys};}
const stComma=(x,y,d)=>[stDot(x,y,d),stPara([x+d*0.62,y+d*0.2],[x+d*0.22,y-0.72*d],d*0.72)];
function stPunct(ch,c,H){const S=c.S,T=c.T,r=c.r,d=0.92*S,ym=0.47*H;let polys=[],w=0;
  if(ch==='.'){polys=[stDot(0,0,d)];w=d;}
  else if(ch===','){polys=stComma(0.15*d,0,d);w=1.15*d;}
  else if(ch===':'){polys=[stDot(0,0,d),stDot(0,0.36*H,d)];w=d;}
  else if(ch===';'){polys=[stDot(0.15*d,0.36*H,d)].concat(stComma(0.15*d,0,d));w=1.15*d;}
  else if(ch==='!'){polys=[rr(0,0.25*H,d,H),stDot(0,0,d)];w=d;}
  else if(ch==='?'){w=0.46*H;polys=[rr(0,H-T,w,H),rr(w-S,0.5*H,w,H-T/2),rr(w/2-S/2,0.5*H,w,0.5*H+T),rr(w/2-S/2,0.25*H,w/2+S/2,0.5*H+T/2),stDot(w/2-d/2,0,d)];}
  else if(ch==='«'||ch==='»'){const hh=0.17*H,yc=0.40*H,dx=0.16*H,t=0.8*S;
    const chev=(x0,flip)=>{let vs=[[0,yc],[dx,yc+hh],[dx+t,yc+hh],[t,yc],[dx+t,yc-hh],[dx,yc-hh]];if(flip)vs=vs.map(v=>[dx+t-v[0],v[1]]);return stSolid(vs.map(v=>[v[0]+x0,v[1]]));};
    const step=0.5*dx+1.3*t;w=dx+t+step;polys=[chev(0,ch==='»'),chev(step,ch==='»')];}
  else if('„“”‘’'.includes(ch)){const yh=(ch==='„')?0:('“”‘’'.includes(ch)?H-d*0.95:0),gp=0.45*d,n='„“”'.includes(ch)?2:1;
    for(let k=0;k<n;k++){let q=stComma(0,yh,d);q=stShift(q,k*(d+gp)+0.15*d,0);
      if(ch==='“'||ch==='‘'){const cy=yh+d/2,cx=0.15*d+k*(d+gp)+d/2;q=q.map(z=>({p:z.p.map(v=>[2*cx-v[0],2*cy-v[1]]),h:z.h}));}
      polys=polys.concat(q);}
    w=n*d+(n-1)*gp+0.3*d;}
  else if(ch==='"'){const b=0.8*S;polys=[rr(0,0.62*H,b,H),rr(b+0.5*b,0.62*H,2.5*b,H)];w=2.5*b;}
  else if(ch==="'"){const b=0.8*S;polys=[rr(0,0.62*H,b,H)];w=b;}
  else if(ch==='-'){w=0.36*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='–'){w=0.58*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='—'){w=0.92*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='−'){w=0.46*H;polys=[rr(0,ym-T*.55,w,ym+T*.55)];}
  else if(ch==='('||ch===')'){w=0.34*H;const wh=0.85*S;
    polys=[rr(0,0.12*H,wh,0.88*H),stPara([wh/2,0.84*H],[w-wh/2,1.02*H],wh),stPara([wh/2,0.16*H],[w-wh/2,-0.02*H],wh)];if(ch===')')polys=stMirror(polys,w);}
  else if(ch==='/'){w=0.50*H;const wh=0.8*S;polys=[stPara([wh/2,-0.04*H],[w-wh/2,1.0*H],wh)];}
  else if(ch==='&'){w=0.66*H;const wh=S;
    polys=stRing(w*0.08,0.50*H,w*0.92,H,c).concat(stRing(0,0,w*0.96,0.58*H,c),[stPara([w*0.5,0.6*H],[w-wh/2+0.1*S,0],wh)]);}
  else if(ch==='№'){const n=stBuild('N',c,H),o=stBuild('O',stSub(c,0.8),0.46*H);w=n.w+0.12*S+o.w;
    polys=n.polys.concat(stShift(o.polys,n.w+0.12*S,H-0.46*H),[rr(n.w+0.12*S,H-0.46*H-0.5*T,w,H-0.46*H-0.5*T+0.5*T*0.8)]);}
  else if(ch==='…'){const gp=0.45*d;w=3*d+2*gp;polys=[0,1,2].map(k=>stDot(k*(d+gp),0,d));}
  else if(ch==='@'){w=0.80*H;const h=0.80*H;polys=stRing(0,0,w,h,c).concat(stRing(w*0.30,h*0.5-0.20*H,w*0.70,h*0.5+0.20*H,stSub(c,0.62)));}
  else if(ch==='#'){w=0.62*H;const b=0.72*S;polys=[rr(w*0.2,0,w*0.2+b,H),rr(w*0.8-b,0,w*0.8,H),rr(0,H*0.28,w,H*0.28+b),rr(0,H*0.62,w,H*0.62+b)];}
  else if(ch==='%'){w=0.78*H;const s=0.30*H,wh=0.6*S;
    polys=stRing(0,H-s,s,H,stSub(c,0.45)).concat(stRing(w-s,0,w,s,stSub(c,0.45)),[stPara([wh/2,0],[w-wh/2,H],wh)]);}
  else if(ch==='*'){w=0.50*H;const b=0.46*S,cx=w/2,cy=0.76*H,L=0.2*H;
    polys=[rr(cx-b/2,cy-L,cx+b/2,cy+L),stPara([cx-L*.8,cy-L*.8],[cx+L*.8,cy+L*.8],b),stPara([cx+L*.8,cy-L*.8],[cx-L*.8,cy+L*.8],b),rr(cx-L,cy-b/2,cx+L,cy+b/2)];}
  else if(ch==='·'){polys=[stDot(0,0.5*c.lcr*H-d/2,d)];w=d;}
  else if(ch==='•'){const D=1.75*d;polys=[stDot(0,ym-D/2,D)];w=D;}
  else if(ch==='°'){const s=0.30*H;polys=stRing(0,H-s,s,H,stSub(c,0.45));w=s;}
  else if(ch==='+'){w=0.50*H;const b=0.72*S;polys=[rr(w/2-b/2,ym-w/2+0.04*H,w/2+b/2,ym+w/2-0.04*H),rr(0.04*H,ym-T*.55,w-0.04*H,ym+T*.55)];}
  else if(ch==='='){w=0.46*H;const g=0.17*H;polys=[rr(0,ym-g-T*.5,w,ym-g+T*.5),rr(0,ym+g-T*.5,w,ym+g+T*.5)];}
  else if(ch==='\\'){w=0.50*H;const wh=0.8*S;polys=[stPara([wh/2,1.0*H],[w-wh/2,-0.04*H],wh)];}
  else if(ch==='|'){const b=0.8*S;w=b;polys=[rr(0,-0.1*H,b,0.98*H)];}
  else if(ch==='₽'){const P=stBuild('P',c,H);w=P.w;polys=P.polys.concat([rr(-0.3*S,0.27*H,0.9*w,0.27*H+0.8*T)]);w=P.w+0.1*S;}
  else if(ch==='©'){const h=0.86*H;w=h;const b=0.5*S,ch2=0.34*H,cw=0.26*H,x0=(w-cw)/2,y0=(h-ch2)/2;
    polys=[rr(0,0,S,h),rr(w-S,0,w,h),rr(0,0,w,T),rr(0,h-T,w,h),rr(x0,y0,x0+b,y0+ch2),rr(x0,y0,x0+cw,y0+b),rr(x0,y0+ch2-b,x0+cw,y0+ch2)];}
  else return null;
  return {polys,w};}
function stAllChars(){return [...ST_LAT_U+ST_LAT_L+ST_CYR_U+ST_CYR_L+'Ёё'+ST_DIG].concat(ST_PUNCT,Object.keys(ST_SPACES));}
