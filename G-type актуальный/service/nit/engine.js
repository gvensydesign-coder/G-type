/* «Нить»: генератор рисунка (порт nit.js раунда 2b без изменений логики): штрихи-скелеты одного круглого пера с рукой, стыками и оптическим спейсингом. */
const NIT={};
NIT.DEF={weight:5,width:30,wob:80,join:40,seed:1};
NIT.M={upm:1000,cap:740,xh:480,asc:900,desc:-260,space:250};
NIT.RANGE={weight:[0,100],width:[0,100],wob:[0,100],join:[-100,100],seed:[0,999]};
const D2R=Math.PI/180;
function hash(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
/* ---------- stroke constructors (design space, y up) ---------- */
const ln=(x0,y0,x1,y1,a,b,wm)=>({p:[[x0,y0],[x1,y1]],sm:0,j:[a|0,b|0],wm:wm||1});
const pl=(p,a,b,wm)=>({p,sm:0,j:[a|0,b|0],wm:wm||1});
const cv=(p,a,b,wm)=>({p,sm:1,j:[a|0,b|0],wm:wm||1});
const ell=(cx,cy,rx,ry,a0,a1,j0,j1,mod)=>{const n=Math.max(2,Math.ceil(Math.abs(a1-a0)/30)),p=[];
  for(let i=0;i<=n;i++){const ad=a0+(a1-a0)*i/n,a=ad*D2R,f=mod?mod(ad):1;p.push([cx+rx*f*Math.cos(a),cy+ry*f*Math.sin(a)]);}return cv(p,j0,j1);};
/* hand modulation for round forms: 1st/2nd harmonic radius wobble + slight spiral so the closure overlaps like a pen stroke */
const hm=(K,a0)=>{const w=K.wob,e1=(0.03+0.03*K.u())*w,e2=(0.02+0.025*K.u())*w,p1=K.u()*360,p2=K.u()*360,sp=(K.u()<0.5?-1:1)*(0.025+0.04*K.u())*Math.min(1,0.3+w);
  return a=>1+e1*Math.cos((a-p1)*D2R)+e2*Math.cos(2*(a-p2)*D2R)+sp*(a-a0)/360;};
const dot=(x,y,K,m)=>({p:[[x,y],[x+K.S*0.05,y+K.S*0.05]],sm:0,j:[0,0],wm:m||1.5,dot:1});
/* высота точки над буквой: на тонкой линии 0.13 кегля, на жирной точка и стебель не должны слипаться */
const dOff=K=>Math.max(K.cap*0.13,K.S*2.6);
/* радиус малых колец (°, о в №, круги %) не меньше 1.5 S: просвет кольца не заплывает */
const rMin=(K,r)=>Math.max(r,1.5*K.S);
const lerp=(a,b,t)=>a+(b-a)*t;
/* ---------- shape library: K={w,h,ov,S,cap,xh,jn,u(),lc} ---------- */
const OV=K=>[K.w/2,K.h/2,K.w/2,K.h/2+K.ov];
const oval=K=>{const [cx,cy,rx,ry]=OV(K),a0=70+K.u()*50,ex=K.jn*12+5+K.u()*4;return [ell(cx,cy,rx,ry,a0,a0+360+ex,0,0,hm(K,a0))];};
const bowlR=(K,y0,y1,xr,x0)=>{x0=x0||0;const w=xr-x0,ym=(y0+y1)/2;
  return cv([[x0,y1],[x0+w*0.55,y1+K.h*0.005],[xr,lerp(y1,ym,0.62)],[x0+w*0.62,ym+K.h*0.01],[x0,y0]],1,1);};
const bowlD=(K,y0,y1,xr,x0)=>{x0=x0||0;const w=xr-x0,ym=(y0+y1)/2;
  return cv([[x0,y1],[x0+w*0.5,y1],[xr,lerp(y1,ym,0.6)],[xr,lerp(y0,ym,0.6)],[x0+w*0.5,y0],[x0,y0]],1,1);};
const arcC=(K,a0,a1)=>{const [cx,cy,rx,ry]=OV(K);return ell(cx,cy,rx,ry,a0,a1);};
const breve=(K,x)=>{const yb=K.h+K.cap*0.15,w=K.w*0.55;return cv([[x-w/2,yb+K.cap*0.05],[x,yb-K.cap*0.005],[x+w/2,yb+K.cap*0.05]]);};
const SH={};
SH.A=K=>{const {w,h}=K;return [ln(0,0,w*0.5,h,0,2),ln(w*0.5,h,w,0,2,0),ln(w*0.2,h*0.32,w*0.8,h*0.3,1,1)];};
SH.Be=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(0,h,w*0.92,h,1,0),cv([[0,h*0.54],[w*0.5,h*0.58],[w*0.97,h*0.31],[w*0.55,h*0.0],[0,0]],1,1)];};
SH.B=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h],[w*0.55,h],[w*0.92,h*0.76],[w*0.55,h*0.535],[0,h*0.52]],1,1),cv([[0,h*0.52],[w*0.6,h*0.525],[w,h*0.27],[w*0.58,0],[0,0]],1,1)];};
SH.Ge=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(0,h,w,h,1,0)];};
SH.De=K=>{const {w,h}=K,d=K.cap*0.15;return [ln(w*0.88,h,w*0.88,0,0,1),ln(w*0.88,h,w*0.68,h*0.995,1,2),cv([[w*0.68,h*0.995],[w*0.58,h*0.72],[w*0.44,h*0.42],[w*0.24,h*0.16],[w*0.02,0]],2,1),ln(0,0,w,0,0,0),ln(w*0.03,0,w*0.03,-d,1,0),ln(w*0.97,0,w*0.97,-d,1,0)];};
SH.E=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(0,h,w,h,1,0),ln(0,h*0.5,w*0.86,h*0.5,1,0),ln(0,0,w,0,1,0)];};
SH.Yo=K=>{const y=K.h+dOff(K),sp=Math.max(K.w*0.22,K.S*1.4);return [...SH.E(K),dot(K.w*0.5-sp,y,K),dot(K.w*0.5+sp,y,K)];};
SH.Zhe=K=>{const {w,h}=K,c=w/2;return [ln(c,h,c,0),ln(0,h,c,h*0.53,0,1),ln(c,h*0.47,0,0,1,0),ln(w,h,c,h*0.53,0,1),ln(c,h*0.47,w,0,1,0)];};
SH.Ze=K=>{const {w,h}=K;return [cv([[w*0.06,h*0.88],[w*0.5,h],[w*0.9,h*0.78],[w*0.3,h*0.525]],0,2),cv([[w*0.3,h*0.525],[w*0.62,h*0.53],[w,h*0.27],[w*0.5,0],[w*0.04,h*0.11]],2,0)];};
SH.Ee=K=>{const {w,h}=K;return [cv([[w*0.1,h*0.9],[w*0.55,h],[w,h*0.72],[w,h*0.3],[w*0.55,0],[w*0.08,h*0.1]]),ln(w*0.3,h*0.5,w*0.96,h*0.5,0,1)];};
SH.I=K=>{const {w,h}=K;return [ln(w*0.5,h,w*0.5,0),ln(w*0.1,h,w*0.9,h,1,1),ln(w*0.1,0,w*0.9,0,1,1)];};
SH.Ii=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(w,h,w,0),ln(w,h,0,0,1,1)];};
SH.Ish=K=>[...SH.Ii(K),breve(K,K.w/2)];
SH.Ka=K=>{const {w,h}=K,ax=w*0.02,ay=h*0.42,t=(h-h*0.62)/(h-ay),sx=lerp(w,ax,t);return [ln(0,h,0,0),ln(w,h,ax,ay,0,1),ln(sx,h*0.62,w,0,1,0)];};
SH.El=K=>{const {w,h}=K,xt=w*0.74;return [ln(w,h,w,0),ln(w,h,xt,h*0.995,1,2),cv([[xt,h*0.995],[w*0.64,h*0.72],[w*0.5,h*0.42],[w*0.26,h*0.16],[-w*0.1,0]],2,0)];};
SH.M=K=>{const {w,h}=K;return [ln(0,0,0,h),ln(w,h,w,0),pl([[0,h],[w*0.5,h*0.34],[w,h]],1,1)];};
SH.H=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(w,h,w,0),ln(0,h*0.5,w,h*0.49,1,1)];};
SH.O=K=>oval(K);
SH.Pe=K=>{const {w,h}=K;return [ln(0,0,0,h),ln(0,h,w,h,1,2),ln(w,h,w,0,2,0)];};
SH.R=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h],[w*0.6,h],[w,h*0.77],[w*0.6,h*0.45],[0,h*0.43]],1,1)];};
SH.Er=K=>{const {w,h}=K;return [...SH.R(K),ln(w*0.45,h*0.44,w*0.98,0,1,0)];};
SH.C=K=>{const [cx,cy,rx,ry]=OV(K);return [ell(cx,cy,rx,ry,52,308,0,0,hm(K,52))];};
SH.T=K=>{const {w,h}=K;return [ln(0,h,w,h),ln(w*0.5,h,w*0.5,0,1,0)];};
SH.U_=K=>{const {w,h}=K,dy=K.lc===2?-h*0.3:0;const x1=lerp(w,w*0.18,(h-h*0.38)/(h-dy)),yy=h*0.38;
  return [ln(w,h,w*0.18,dy,0,0),ln(0,h,lerp(w,w*0.18,(h-yy)/(h-dy)),yy,0,1)];};
SH.Ef=K=>{const {w,h}=K;return [ln(w*0.5,h*1.04,w*0.5,-h*0.04),ell(w*0.5,h*0.5,w*0.5,h*0.31,95,95+362)];};
SH.X=K=>{const {w,h}=K;return [ln(0,h,w,0),ln(w,h*1.01,0,h*0.01)];};
SH.Ce=K=>{const {w,h}=K,d=K.cap*0.17;return [ln(0,h,0,0,0,1),ln(w*0.88,h,w*0.88,0,0,1),ln(0,0,w,0,1,0),ln(w,0,w,-d,1,0)];};
SH.Che=K=>{const {w,h}=K;return [cv([[0,h],[0,h*0.64],[w*0.18,h*0.45],[w*0.6,h*0.4],[w,h*0.43]],0,1),ln(w,h,w,0)];};
SH.Sha=K=>{const {w,h}=K;return [ln(0,h,0,0,0,1),ln(w*0.5,h,w*0.5,0,0,1),ln(w,h,w,0,0,1),ln(0,0,w,0,1,1)];};
SH.Shcha=K=>{const {w,h}=K,d=K.cap*0.17;return [...SH.Sha(K),ln(w,0,w,-d,1,0)];};
SH.Tv=K=>{const {w,h}=K,x=w*0.36;return [ln(-w*0.04,h,x,h,0,1),ln(x,h,x,0,1,0),cv([[x,h*0.57],[lerp(x,w,0.55),h*0.61],[w,h*0.3],[lerp(x,w,0.55),0],[x,0]],1,1)];};
SH.Mk=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h*0.57],[w*0.55,h*0.61],[w,h*0.3],[w*0.55,0],[0,0]],1,1)];};
SH.Yery=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h*0.57],[w*0.36,h*0.6],[w*0.66,h*0.3],[w*0.36,0],[0,0]],1,1),ln(w,h,w,0)];};
SH.Yu=K=>{const {w,h}=K,x0=w*0.32,rx=(w-x0)/2;return [ln(0,h,0,0),ln(0,h*0.5,x0,h*0.5,1,1),(()=>{const a0=250+K.u()*40;return ell(x0+rx,h/2,rx,h/2+K.ov,a0,a0+360+K.jn*12+5);})()];};
SH.Ya=K=>{const {w,h}=K;return [ln(w,h,w,0),cv([[w,h],[w*0.42,h],[0,h*0.77],[w*0.42,h*0.46],[w,h*0.44]],1,1),ln(w*0.5,h*0.455,0,0,1,0)];};
/* Latin only */
SH.D=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h],[w*0.55,h],[w,h*0.68],[w,h*0.32],[w*0.55,0],[0,0]],1,1)];};
SH.F=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(0,h,w,h,1,0),ln(0,h*0.5,w*0.86,h*0.5,1,0)];};
SH.G=K=>{const [cx,cy,rx,ry]=OV(K);return [ell(cx,cy,rx,ry,48,362),ln(K.w,K.h*0.47,K.w*0.5,K.h*0.47,1,0)];};
SH.J=K=>{const {w,h}=K;return [cv([[w,h],[w,h*0.3],[w*0.72,h*0.03],[w*0.3,0],[0,h*0.17]])];};
SH.L=K=>{const {w,h}=K;return [ln(0,h,0,0),ln(0,0,w,0,1,0)];};
SH.N=K=>{const {w,h}=K;return [ln(0,0,0,h),ln(w,h,w,0),ln(0,h,w,0,1,1)];};
SH.Q=K=>[...oval(K),ln(K.w*0.55,K.h*0.22,K.w*1.04,-K.h*0.1)];
SH.S=K=>{const {w,h}=K;return [cv([[w*0.93,h*0.85],[w*0.55,h],[w*0.08,h*0.78],[w*0.5,h*0.52],[w*0.95,h*0.27],[w*0.5,0],[w*0.03,h*0.14]])];};
SH.Uu=K=>{const {w,h}=K;return [cv([[0,h],[0,h*0.36],[w*0.18,h*0.07],[w*0.5,0],[w*0.82,h*0.07],[w,h*0.36],[w,h]])];};
SH.V=K=>{const {w,h}=K;return [ln(0,h,w*0.5,0,0,2),ln(w*0.5,0,w,h,2,0)];};
SH.W=K=>{const {w,h}=K;return [ln(0,h,w*0.25,0,0,2),ln(w*0.25,0,w*0.5,h*0.72,2,2),ln(w*0.5,h*0.72,w*0.75,0,2,2),ln(w*0.75,0,w,h,2,0)];};
SH.Y=K=>{const {w,h}=K;return [ln(0,h,w*0.5,h*0.5,0,1),ln(w,h,w*0.5,h*0.5,0,1),ln(w*0.5,h*0.52,w*0.5,0,1,0)];};
SH.Z=K=>{const {w,h}=K;return [ln(0,h,w,h,0,2),ln(w,h,0,0,2,2),ln(0,0,w,0,2,0)];};
/* lowercase specials */
SH.i=K=>{const {w,h}=K;return [ln(w*0.5,h,w*0.5,0),dot(w*0.5,h+dOff(K),K)];};
SH.j=K=>{const {w,h}=K;return [cv([[w*0.6,h],[w*0.6,h*0.1],[w*0.45,-K.cap*0.17],[w*0.05,-K.cap*0.2]]),dot(w*0.6,h+dOff(K),K)];};
SH.l=K=>{const {w,h}=K,hh=K.cap*1.07;return [cv([[w*0.18,hh],[w*0.18,h*0.1],[w*0.3,0],[w*0.7,0]])];};
SH.b6=K=>{const {w,h}=K,top=K.cap*1.0;return [cv([[w*0.92,top],[w*0.55,top*0.97],[w*0.08,top*0.68],[w*0.02,h*0.35]],0,0),...oval(Object.assign({},K,{h:h*0.74,ov:K.ov*0.7})).map(s=>s)];};
const ASC=K=>K.cap*1.07,DSC=K=>K.cap*0.25;
const ring=K=>{const {w,h}=K,a0=70+K.u()*50;return ell(w/2,h/2,w/2,h/2+K.ov,a0,a0+360+K.jn*12+8,0,0,hm(K,a0));};
SH.la=K=>{const {w,h}=K;return [ring(K),ln(w,h*1.02,w,0,0,0)];};
SH.lb=K=>{const {w,h}=K;return [ln(0,ASC(K),0,0),ring(K)];};
SH.ld=K=>{const {w,h}=K;return [ln(w,ASC(K),w,0),ring(K)];};
SH.le=K=>{const {w,h}=K;return [ell(w/2,h/2,w/2,h/2+K.ov,0,328+K.u()*12,0,0,hm(K,0)),ln(0,h*0.5,w,h*0.5,1,1)];};
SH.lf=K=>{const {w,h}=K,a=ASC(K);return [cv([[w*0.95,a*0.97],[w*0.6,a],[w*0.3,a*0.86],[w*0.3,0]]),ln(0,h*0.98,w*0.85,h*0.98,0,1)];};
SH.lg=K=>{const {w,h}=K,d=DSC(K);return [ring(K),cv([[w,h*1.02],[w,-d*0.3],[w*0.6,-d],[w*0.12,-d*0.85]])];};
SH.lh=K=>{const {w,h}=K;return [ln(0,ASC(K),0,0),cv([[0,h*0.55],[w*0.3,h*1.0],[w*0.8,h*0.95],[w,h*0.5],[w,0]],1,0)];};
SH.lk=K=>{const {w,h}=K,ax=w*0.02,ay=h*0.4,t=0.5,sx=lerp(w,ax,t),sy=lerp(h,ay,t);return [ln(0,ASC(K),0,0),ln(w,h,ax,ay,0,1),ln(sx,sy,w,0,1,0)];};
SH.lm=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h*0.55],[w*0.15,h*0.98],[w*0.4,h*0.95],[w*0.5,h*0.5],[w*0.5,0]],1,0),cv([[w*0.5,h*0.55],[w*0.65,h*0.98],[w*0.9,h*0.95],[w,h*0.5],[w,0]],1,0)];};
SH.ln=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h*0.55],[w*0.3,h*1.0],[w*0.8,h*0.95],[w,h*0.5],[w,0]],1,0)];};
SH.lp=K=>{const {w,h}=K;return [ln(0,h,0,-DSC(K)),ring(K)];};
SH.lq=K=>{const {w,h}=K;return [ln(w,h,w,-DSC(K)),ring(K)];};
SH.lr=K=>{const {w,h}=K;return [ln(0,h,0,0),cv([[0,h*0.55],[w*0.35,h*1.0],[w*0.95,h*0.95]],1,0)];};
SH.lt=K=>{const {w,h}=K;return [cv([[w*0.42,h*1.38],[w*0.42,h*0.22],[w*0.58,0],[w,h*0.1]]),ln(0,h*0.98,w*0.9,h*0.98,0,1)];};
SH.lu=K=>{const {w,h}=K;return [cv([[0,h],[0,h*0.3],[w*0.4,0],[w,h*0.06]],0,1),ln(w,h,w,0,0,0)];};
/* ---------- digits ---------- */
SH.d0=K=>[...oval(K),ln(K.w*0.1,K.h*0.14,K.w*0.9,K.h*0.86)];
SH.d1=K=>{const {w,h}=K;return [ln(w*0.62,h,w*0.62,0),ln(w*0.04,h*0.72,w*0.62,h,0,1)];};
SH.d2=K=>{const {w,h}=K;return [cv([[w*0.04,h*0.78],[w*0.4,h],[w*0.93,h*0.77],[w*0.52,h*0.38],[0,0]],0,1),ln(0,0,w,0,1,0)];};
SH.d3=K=>{const {w,h}=K;return [pl([[w*0.03,h],[w,h],[w*0.4,h*0.56]],0,2),cv([[w*0.4,h*0.56],[w*0.66,h*0.57],[w*0.97,h*0.31],[w*0.5,0],[0,h*0.12]],2,0)];};
SH.d4=K=>{const {w,h}=K;return [ln(w*0.72,h,w*0.72,0),ln(w*0.72,h,0,h*0.3,1,0),ln(0,h*0.3,w,h*0.3,1,0)];};
SH.d5=K=>{const {w,h}=K;return [ln(w*0.95,h,w*0.12,h,0,2),ln(w*0.12,h,w*0.05,h*0.53,2,2),cv([[w*0.05,h*0.53],[w*0.55,h*0.63],[w*0.98,h*0.32],[w*0.5,0],[0,h*0.1]],2,0)];};
SH.d6=K=>{const {w,h}=K;return [ln(w*0.82,h,w*0.03,h*0.36,0,1),ell(w*0.5,h*0.3,w*0.5,h*0.3,185,185+358+K.jn*10)];};
SH.d7=K=>{const {w,h}=K;return [ln(0,h,w,h,0,2),ln(w,h,w*0.3,0,2,0)];};
SH.d8=K=>{const {w,h}=K;return [ell(w*0.5,h*0.27,w*0.5,h*0.27,90,90+360+K.jn*8+4),ell(w*0.5,h*0.765,w*0.42,h*0.235,270,270+360+K.jn*8+4)];};
SH.d9=K=>{const {w,h}=K;return [ln(w*0.18,0,w*0.97,h*0.64,0,1),ell(w*0.5,h*0.7,w*0.5,h*0.3,5,5+358+K.jn*10)];};
/* ---------- punctuation: K.h = cap, own widths ---------- */
const P_={};
const dt=(x,y,K)=>dot(x,y,K,Math.max(1.5,0.05*K.cap/K.S*1.6));
P_['.']=K=>[dt(0,K.S*0.9,K)];
P_[',']=K=>[ln(0,K.S*0.9,-K.cap*0.06,-K.cap*0.1,0,0,1.15)];
P_[':']=K=>[dt(0,K.S*0.9,K),dt(0,K.xh*0.62,K)];
P_[';']=K=>[ln(0,K.S*0.9,-K.cap*0.06,-K.cap*0.1,0,0,1.15),dt(0,K.xh*0.62,K)];
P_['!']=K=>[ln(0,K.cap,0.0,K.cap*0.3),dt(0,K.S*0.9,K)];
P_['?']=K=>{const w=K.cap*0.34,h=K.cap;return [cv([[0,h*0.8],[w*0.3,h],[w*0.85,h*0.84],[w*0.65,h*0.58],[w*0.45,h*0.4],[w*0.45,h*0.3]]),dt(w*0.45,K.S*0.9,K)];};
P_['-']=K=>[ln(0,K.xh*0.55,K.cap*0.22,K.xh*0.55)];
P_['–']=K=>[ln(0,K.xh*0.55,K.cap*0.42,K.xh*0.55)];
P_['—']=K=>[ln(0,K.xh*0.55,K.cap*0.82,K.xh*0.55)];
P_['‒']=K=>[ln(0,K.xh*0.55,K.cap*0.3,K.xh*0.55)];
P_['−']=K=>[ln(0,K.xh*0.55,K.cap*0.3,K.xh*0.55)];
P_['…']=K=>{const d=Math.max(K.cap*0.15,K.S*3.2);return [dt(0,K.S*0.9,K),dt(d,K.S*0.9,K),dt(2*d,K.S*0.9,K)];};
P_['·']=K=>[dt(0,K.xh*0.55,K)];P_['•']=K=>[{p:[[0,K.cap*0.4],[0.1,K.cap*0.4+.1]],sm:0,j:[0,0],wm:2.6,dot:1}];
P_["'"]=K=>[ln(0,K.cap,-K.cap*0.02,K.cap*0.82)];
const qs=K=>Math.max(K.cap*0.12,K.S*2.6);
P_['"']=K=>[ln(0,K.cap,-K.cap*0.02,K.cap*0.82),ln(qs(K),K.cap,qs(K)-K.cap*0.02,K.cap*0.82)];
const cm=(x,y,K,up)=>ln(x,y,x-K.cap*0.05,y-K.cap*0.16,0,0,1.15);
P_['‘']=K=>[ln(K.cap*0.05,K.cap*0.82,0,K.cap,0,0,1)];P_['’']=K=>[cm(0.05*K.cap,K.cap,K)];
P_['“']=K=>[ln(K.cap*0.05,K.cap*0.84,0,K.cap,0,0,1),ln(K.cap*0.05+qs(K),K.cap*0.84,qs(K),K.cap,0,0,1)];
P_['”']=K=>[cm(K.cap*0.05,K.cap,K),cm(K.cap*0.05+qs(K),K.cap,K)];
P_['„']=K=>[cm(K.cap*0.05,K.cap*0.02,K),cm(K.cap*0.05+qs(K),K.cap*0.02,K)];
P_['‚']=K=>[cm(K.cap*0.05,K.cap*0.02,K)];
const chev=(x,K,dir)=>{const a=K.cap*0.12,y0=K.cap*0.36,y1=K.cap*0.7;return pl([[x+(dir<0?a:0),y1],[x+(dir<0?0:a),(y0+y1)/2],[x+(dir<0?a:0),y0]]);};
P_['«']=K=>[chev(0,K,-1),chev(K.cap*0.17,K,-1)];P_['»']=K=>[chev(0,K,1),chev(K.cap*0.17,K,1)];
P_['‹']=K=>[chev(0,K,-1)];P_['›']=K=>[chev(0,K,1)];
P_['(']=K=>[cv([[K.cap*0.16,K.cap*1.0],[0,K.cap*0.6],[0,K.cap*0.2],[K.cap*0.16,-K.cap*0.1]])];
P_[')']=K=>[cv([[0,K.cap*1.0],[K.cap*0.16,K.cap*0.6],[K.cap*0.16,K.cap*0.2],[0,-K.cap*0.1]])];
P_['[']=K=>[pl([[K.cap*0.14,K.cap*1.0],[0,K.cap*1.0],[0,-K.cap*0.08],[K.cap*0.14,-K.cap*0.08]])];
P_[']']=K=>[pl([[0,K.cap*1.0],[K.cap*0.14,K.cap*1.0],[K.cap*0.14,-K.cap*0.08],[0,-K.cap*0.08]])];
P_['/']=K=>[ln(0,-K.cap*0.05,K.cap*0.3,K.cap*1.0)];P_['\\']=K=>[ln(0,K.cap*1.0,K.cap*0.3,-K.cap*0.05)];
P_['|']=K=>[ln(0,-K.cap*0.1,0,K.cap*1.0)];
P_['_']=K=>[ln(0,-K.cap*0.08,K.cap*0.5,-K.cap*0.08)];
P_['+']=K=>[ln(0,K.xh*0.55,K.cap*0.34,K.xh*0.55),ln(K.cap*0.17,K.xh*0.55-K.cap*0.17,K.cap*0.17,K.xh*0.55+K.cap*0.17)];
P_['=']=K=>[ln(0,K.xh*0.55+K.cap*0.07,K.cap*0.34,K.xh*0.55+K.cap*0.07),ln(0,K.xh*0.55-K.cap*0.07,K.cap*0.34,K.xh*0.55-K.cap*0.07)];
P_['<']=K=>[pl([[K.cap*0.26,K.xh*0.55+K.cap*0.18],[0,K.xh*0.55],[K.cap*0.26,K.xh*0.55-K.cap*0.18]])];
P_['>']=K=>[pl([[0,K.xh*0.55+K.cap*0.18],[K.cap*0.26,K.xh*0.55],[0,K.xh*0.55-K.cap*0.18]])];
P_['*']=K=>{const c=K.cap*0.82,r=K.cap*0.1,x=K.cap*0.1;return [ln(x,c-r,x,c+r),ln(x-r*0.87,c-r*0.5,x+r*0.87,c+r*0.5),ln(x-r*0.87,c+r*0.5,x+r*0.87,c-r*0.5)];};
P_['~']=K=>[cv([[0,K.xh*0.5],[K.cap*0.1,K.xh*0.62],[K.cap*0.22,K.xh*0.5],[K.cap*0.32,K.xh*0.62]])];
P_['°']=K=>{const r=rMin(K,K.cap*0.07);return [ell(r,K.cap*0.9-r*0.35,r,r,90,90+362)];};
P_['#']=K=>{const w=Math.max(K.cap*0.4,K.S*5.6),h=K.cap*0.78,a=w*(0.3-(w/(K.cap*0.4)-1)*0.04),b=w*0.65+(w*0.3-a);return [ln(a,0,a+w*0.12,h),ln(b,0,b+w*0.12,h),ln(0,h*0.35,w,h*0.37),ln(0,h*0.68,w,h*0.7)];};
P_['%']=K=>{const w=Math.max(K.cap*0.5,K.S*6.2),h=K.cap*0.78,r=rMin(K,K.cap*0.09);return [ln(w*0.9,h*1.0,w*0.1,0),ell(r,h-r*1.3,r,r*1.3,90,452),ell(w-r,r*1.3,r,r*1.3,90,452)];};
P_['@']=K=>{const w=K.cap*0.62,h=K.cap*0.78,cx=w/2,cy=h/2;return [ell(cx,cy,w/2,h/2,40,330),ell(cx,cy,w*0.2,h*0.16,90,452),ln(cx+w*0.2,cy+h*0.14,cx+w*0.2,cy-h*0.12),cv([[cx+w*0.2,cy-h*0.12],[w*0.9,cy-h*0.1],[w*0.97,cy+h*0.1]])];};
P_['&']=K=>{const w=K.cap*0.5,h=K.cap*0.78;return [cv([[w,h*0.02],[w*0.3,h*0.45],[w*0.18,h*0.78],[w*0.42,h*0.96],[w*0.68,h*0.76],[w*0.1,h*0.2],[w*0.28,0],[w*0.58,h*0.12],[w*0.95,h*0.5]])];};
P_['©']=K=>{const r=K.cap*0.3;return [ell(r,r,r,r,90,452),ell(r,r,r*0.38,r*0.42,50,310)];};
P_['₽']=K=>{const w=K.w0,h=K.cap;return [ln(0,h,0,0),cv([[0,h],[w*0.55,h],[w,h*0.74],[w*0.55,h*0.4],[0,h*0.38]],1,1),ln(-w*0.2,h*0.28,w*0.62,h*0.28)];};
P_['$']=K=>{const w=K.cap*0.4,h=K.cap*0.78;return [cv([[w*0.9,h*0.8],[w*0.5,h*0.97],[w*0.1,h*0.76],[w*0.5,h*0.52],[w*0.92,h*0.27],[w*0.5,h*0.05],[w*0.05,h*0.2]]),ln(w*0.5,h*1.08,w*0.5,-h*0.08)];};
P_['€']=K=>{const w=K.cap*0.42,h=K.cap*0.78;return [ell(w*0.5,h/2,w*0.5,h/2,48,312),ln(-w*0.05,h*0.58,w*0.55,h*0.58),ln(-w*0.05,h*0.4,w*0.55,h*0.4)];};
P_['§']=K=>{const w=K.cap*0.3,h=K.cap*0.9;return [cv([[w*0.9,h*0.9],[w*0.4,h],[w*0.05,h*0.8],[w*0.5,h*0.58],[w*0.95,h*0.35],[w*0.55,h*0.15],[w*0.1,h*0.25]])];};
P_['№']=K=>{const {w0,cap}=K;return [ln(0,0,0,cap),ln(w0,cap,w0,0),ln(0,cap,w0,0,1,1),ell(w0+cap*0.32+Math.max(0,rMin(K,cap*0.1)-cap*0.1),cap*0.78,rMin(K,cap*0.1),Math.max(cap*0.13,rMin(K,cap*0.1)),90,452),ln(w0+cap*0.2,cap*0.57,w0+cap*0.44,cap*0.57)];};
/* ---------- glyph table: chars -> {fn, wf(w/h), ns(stem gaps), rd(round), lc: lowercase variant} ---------- */
const TB={};
const def=(chars,fn,wf,ns,rd,o)=>{for(const c of chars)TB[c]=Object.assign({fn,wf,ns:ns||0,rd:rd||0},o||{});};
def('А',SH.A,0.52,0,0);def('Б',SH.Be,0.38,0,2.9);def('В',SH.B,0.40,0,3.4);def('Г',SH.Ge,0.30,0,0);def('Д',SH.De,0.56,1,0);
def('Е',SH.E,0.33,0,0);def('Ё',SH.Yo,0.33,0,0);def('Ж',SH.Zhe,0.66,2,0);def('З',SH.Ze,0.40,0,3.4);def('И',SH.Ii,0.38,1,0);def('Й',SH.Ish,0.38,1,0);
def('К',SH.Ka,0.42,0,0);def('Л',SH.El,0.56,0,0);def('М',SH.M,0.56,2,0);def('Н',SH.H,0.36,1,0);def('О',SH.O,0.42,0,3.1);
def('П',SH.Pe,0.38,1,0);def('Р',SH.R,0.36,0,2.9);def('С',SH.C,0.40,0,2.6);def('Т',SH.T,0.42,0,0);def('У',SH.U_,0.42,0,0);
def('Ф',SH.Ef,0.50,0,5.4);def('Х',SH.X,0.44,0,0);def('Ц',SH.Ce,0.44,1,0);def('Ч',SH.Che,0.38,1,0);def('Ш',SH.Sha,0.62,2,0);def('Щ',SH.Shcha,0.64,2,0);
def('Ъ',SH.Tv,0.56,0,2.9);def('Ы',SH.Yery,0.58,2,2.9);def('Ь',SH.Mk,0.38,0,2.9);def('Э',SH.Ee,0.40,0,2.6);def('Ю',SH.Yu,0.64,1,3.1);def('Я',SH.Ya,0.38,0,2.9);
def('ABCEHKMOPTXabcehkmoptx'.replace(/[a-z]/g,''),null,0);  // placeholder (no-op)
const LAT={A:'А',B:'В',C:'С',E:'Е',H:'Н',K:'К',M:'М',O:'О',P:'Р',T:'Т',X:'Х'};
for(const k in LAT)TB[k]=TB[LAT[k]];
def('D',SH.D,0.42,0,3.0);def('F',SH.F,0.32,0,0);def('G',SH.G,0.42,0,2.8);def('I',SH.I,0.26,0,0);def('J',SH.J,0.32,0,2.4);def('L',SH.L,0.32,0,0);
def('N',SH.N,0.38,1,0);def('Q',SH.Q,0.42,0,3.1);def('R',SH.Er,0.38,0,2.9);def('S',SH.S,0.38,0,2.8);def('U',SH.Uu,0.38,1,2.2);def('V',SH.V,0.44,0,0);
def('W',SH.W,0.70,0,0);def('Y',SH.Y,0.42,0,0);def('Z',SH.Z,0.38,0,0);
def('0',SH.d0,0.32,0,3.4);def('1',SH.d1,0.26,0,0);def('2',SH.d2,0.38,0,2.6);def('3',SH.d3,0.38,0,3.4);def('4',SH.d4,0.40,0,0);def('5',SH.d5,0.38,0,2.8);
def('6',SH.d6,0.38,0,2.8);def('7',SH.d7,0.38,0,0);def('8',SH.d8,0.36,0,3.0);def('9',SH.d9,0.38,0,2.8);
/* lowercase = small caps of the same hand (same function at x-height, 1.1x wider since the pen stays the same) */
const lcm=(a,b)=>{for(let i=0;i<a.length;i++){const u=TB[b[i]];TB[a[i]]=Object.assign({},u,{lc:1});}};
lcm('абвгдежзийклмнопрстуфхцчшщъыьэюя','АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ');
lcm('абвгдежзийклмнопрстуфхцчшщъыьэюя'.slice(0,0),'');
TB['ё']=Object.assign({},TB['Ё'],{lc:1});
lcm('abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const LL={a:[SH.la,0.58],b:[SH.lb,0.58],d:[SH.ld,0.58],e:[SH.le,0.62],f:[SH.lf,0.4],g:[SH.lg,0.58],h:[SH.lh,0.52],k:[SH.lk,0.5],m:[SH.lm,0.9],n:[SH.ln,0.52],p:[SH.lp,0.58],q:[SH.lq,0.58],r:[SH.lr,0.42],t:[SH.lt,0.48],u:[SH.lu,0.52]};
for(const k in LL)TB[k]={fn:LL[k][0],wf:LL[k][1],ns:0,rd:2.9,lc:1};
/* round Cyrillic small caps: nearly round о, rounder с э з, е as ring+bar */
TB['о']=Object.assign({},TB['О'],{wf:0.68,lc:1});TB['o']=TB['о'];TB['с']=Object.assign({},TB['С'],{wf:0.5,lc:1});TB['c']=TB['с'];
TB['э']=Object.assign({},TB['Э'],{wf:0.52,lc:1});TB['з']=Object.assign({},TB['З'],{wf:0.5,lc:1});
TB['е']={fn:SH.le,wf:0.6,ns:0,rd:2.9,lc:1};TB['ё']={fn:K=>{const sp=Math.max(K.w*0.21,K.S*1.4);return [...SH.le(K),dot(K.w*0.51-sp,K.h+dOff(K),K),dot(K.w*0.51+sp,K.h+dOff(K),K)];},wf:0.6,ns:0,rd:2.9,lc:1};
TB['б']={fn:SH.b6,wf:0.40,ns:0,rd:2.9,lc:1};
TB['у']={fn:K=>{K.lc=2;return SH.U_(K);},wf:0.42,ns:0,rd:0,lc:1};
TB['y']=TB['y'];TB['i']={fn:SH.i,wf:0.0,ns:0,rd:0,lc:1,fixw:1};TB['j']={fn:SH.j,wf:0.0,ns:0,rd:0,lc:1,fixw:1};TB['l']={fn:SH.l,wf:0.3,ns:0,rd:0,lc:1};
TB['y']={fn:K=>{K.lc=2;return SH.Y(K).slice(0,0).concat(SH.U_(K));},wf:0.42,ns:0,rd:0,lc:1};
TB['і']=TB['i'];TB['ї']=TB['i'];
/* punctuation */
for(const c in P_)TB[c]={fn:P_[c],punct:1,wf:0,ns:0,rd:0};
TB['₽'].wf=0.36;TB['№'].wf=0.38;TB['№'].punct=0;
NIT.charset='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?\'"-–—‒−…·•‘’“”„«»()[]/\\|_+=<>*~°#%@&©₽$€§№';
/* ---------- sampling ---------- */
function sample(st){const p=st.p,out=[];
  if(!st.sm||p.length<3){for(let i=0;i<p.length-1;i++){const a=p[i],b=p[i+1],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(d/10));
    for(let k=(i?1:0);k<=n;k++)out.push([lerp(a[0],b[0],k/n),lerp(a[1],b[1],k/n)]);}return out;}
  const n=p.length,T=i=>{const a=p[Math.max(0,i-1)],b=p[Math.min(n-1,i+1)],f=(i==0||i==n-1)?1:0.5;return [(b[0]-a[0])*f*(i==0||i==n-1?1:1),(b[1]-a[1])*f];};
  out.push(p[0].slice());
  for(let i=0;i<n-1;i++){const a=p[i],b=p[i+1],m0=T(i),m1=T(i+1),d=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(2,Math.ceil(d/8));
    for(let s=1;s<=k;s++){const t=s/k,t2=t*t,t3=t2*t,h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
      out.push([h00*a[0]+h10*m0[0]+h01*b[0]+h11*m1[0],h00*a[1]+h10*m0[1]+h01*b[1]+h11*m1[1]]);}}
  return out;}
const plen=pts=>{let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;};
function nearest(pts,q){let best=1e9,bp=null;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1;
  let t=((q[0]-a[0])*dx+(q[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));const x=a[0]+dx*t,y=a[1]+dy*t,d=Math.hypot(x-q[0],y-q[1]);if(d<best){best=d;bp=[x,y];}}return [best,bp];}
function trimEnd(pts,r,atEnd){const a=atEnd?pts.slice():pts.slice().reverse();let L=0;
  while(a.length>2){const d=Math.hypot(a[a.length-1][0]-a[a.length-2][0],a[a.length-1][1]-a[a.length-2][1]);if(L+d>r){const t=(r-L)/d,p=a[a.length-1],q=a[a.length-2];a[a.length-1]=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];break;}L+=d;a.pop();}
  return atEnd?a:a.reverse();}
function tangEnd(pts,atEnd){const n=pts.length,a=atEnd?pts[n-1]:pts[0];let q,i=atEnd?n-2:1;
  for(;;){q=pts[i];if(Math.hypot(a[0]-q[0],a[1]-q[1])>=9||i<=0||i>=n-1)break;i+=atEnd?-1:1;}
  const d=Math.hypot(a[0]-q[0],a[1]-q[1])||1;return [(a[0]-q[0])/d,(a[1]-q[1])/d];}
/* ---------- glyph build ---------- */
const cache=new Map();
function norm(P){P=Object.assign({},NIT.DEF,P||{});const S0=P.S!=null?P.S:NIT.M.cap*(0.022+0.09*P.weight/100);
  return {S:S0,ws:0.75+0.85*P.width/100,wob:P.wob/100,jn:P.join/100,seed:P.seed|0,weight:P.weight};}
function build(ch,P){const N=norm(P),def=TB[ch];if(!def)return null;
  const key=ch+'|'+[N.S,N.ws,N.wob,N.jn,N.seed].join(',');if(cache.has(key))return cache.get(key);
  const M=NIT.M,lc=def.lc?1:0,h=def.punct?M.cap:(lc?M.xh:M.cap);
  const rs=rng(hash(ch+'#'+N.seed)),ru=rng(hash(ch+'~'+N.seed));      // rs: hand draws, ru: shape-choice draws
  const K={wob:N.wob,h,cap:M.cap,xh:M.xh,S:N.S,ov:h*0.012,jn:N.jn,u:ru,lc:lc};
  let w=def.wf*h*N.ws*(lc?1.18:1);const gm=2.7*N.S;
  w=Math.max(w,def.ns*gm,def.rd*N.S);if(def.fixw)w=0;K.w=w;K.w0=Math.max(def.wf*M.cap*N.ws,def.rd*N.S);
  let raw=def.fn(K).filter(Boolean);
  const wob=N.wob,gl=[];
  const lean=(rs()-0.5)*2*5.5*D2R*wob,hs=1+(rs()-0.5)*2*0.08*wob,dy=(rs()-0.5)*2*0.042*h*wob,wsc=1+(rs()-0.5)*2*0.07*wob;
  const R0=(def.punct?0.5:1)*0.17*h;
  /* 1: dense + hand */
  for(const st of raw){let pts=sample(st);const L=plen(pts)||1,e0=rs()-0.5,e1=rs()-0.5,f1=rs()*6.28,f2=rs()*6.28,wmr=rs(),extA=rs(),extB=rs(),jA=rs(),jB=rs();
    const tiny=st.dot||L<0.12*h*1.0;
    const sc=tiny?0.15:1;
    const emax=Math.min(0.065*h,0.055*L)*wob*sc,amp=Math.min(0.014*h,0.024*L)*wob*sc;
    const a=pts[0],b=pts[pts.length-1],chord=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const closed=chord<0.3*L;let nx,ny,cx=0,cy=0;
    if(closed){for(const q of pts){cx+=q[0];cy+=q[1];}cx/=pts.length;cy/=pts.length;nx=0;ny=1;}
    else{nx=-(b[1]-a[1])/chord;ny=(b[0]-a[0])/chord;}
    let acc=0;const out=[];
    for(let i=0;i<pts.length;i++){if(i)acc+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);const t=acc/L;
      const nz=0.65*Math.sin(6.283*1.15*t+f1)+0.35*Math.sin(6.283*2.6*t+f2);
      let off=(e0*(1-t)+e1*t)*2*emax+nz*amp,px=pts[i][0],py=pts[i][1];
      if(closed){const vx=px-cx,vy=py-cy,vl=Math.hypot(vx,vy)||1;px+=vx/vl*nz*amp*1.3;py+=vy/vl*nz*amp*1.3;
        px+=(e0-0.5+0.5)*0+0; /* oval keeps its form; tilt comes from glyph lean */}
      else{px+=nx*off;py+=ny*off;}
      out.push([px,py]);}
    gl.push({pts:out,j:st.j.slice(),wm:st.wm*(1+(wmr-0.5)*0.16*wob),dot:st.dot,extA,extB,jA,jB,L});}
  /* 2: joins. snap ends to nearest other stroke, then overshoot / retract by «Стыки» */
  let orig=null;
  for(const mode of [0,1]){if(mode===1)orig=gl.map(g=>g.pts.map(p=>p.slice()));
  gl.forEach((g,gi)=>{for(const end of [0,1]){const jf=g.j[end];const atEnd=end==1;let pts=g.pts;
    if(mode===1&&jf&&!g.dot){const e=atEnd?pts[pts.length-1]:pts[0];let bd=1e9,bq=null;
      orig.forEach((op,oi)=>{if(oi===gi)return;const [d,q]=nearest(op,e);if(d<bd){bd=d;bq=q;}});
      if(bq&&bd<R0*1.6){const dx=bq[0]-e[0],dy=bq[1]-e[1],Lb=Math.min(0.4*g.L,0.3*h);let acc=0;const n=pts.length;
        for(let i=0;i<n;i++){const k=atEnd?n-1-i:i;if(i){const a=pts[atEnd?k+1:k-1],b=pts[k];acc+=Math.hypot(b[0]-a[0],b[1]-a[1]);}
          const f=Math.max(0,1-acc/Lb);const f2=f*f*(3-2*f);pts[k]=[pts[k][0]+dx*f2,pts[k][1]+dy*f2];}}
      const u=atEnd?g.jB:g.jA;let amt;
      if(N.jn>=0)amt=Math.max(0.4*N.S,N.jn*0.055*h*(0.4+1.2*u));                                  // overshoot beyond the touching point
      else amt=-Math.min(0.3*g.L,(jf===2?0.5:1)*N.S*(1.0+(-N.jn)*0.6*(0.6+0.8*u)));   // retract: visible gap = (retract - S) per side
      if(amt>0){const t=tangEnd(pts,atEnd),e2=atEnd?pts[pts.length-1]:pts[0],q=[e2[0]+t[0]*amt,e2[1]+t[1]*amt];if(atEnd)pts.push(q);else pts.unshift(q);}
      else if(amt<0){g.pts=pts=trimEnd(pts,-amt,atEnd);}
    }else if(mode===0&&!jf&&!g.dot){const u=atEnd?g.extB:g.extA,amt=(u-0.5)*0.08*h*wob;
      if(amt>0){const t=tangEnd(pts,atEnd),e2=atEnd?pts[pts.length-1]:pts[0],q=[e2[0]+t[0]*amt,e2[1]+t[1]*amt];if(atEnd)pts.push(q);else pts.unshift(q);}
      else if(amt<0&&-amt<0.2*g.L){g.pts=pts=trimEnd(pts,-amt,atEnd);}}
  }});}
  /* 3: glyph-level lean / height / baseline / width */
  const tn=Math.tan(lean);
  for(const g of gl)g.pts=g.pts.map(p=>[p[0]*wsc+tn*p[1],p[1]*hs+dy]);
  /* 4: bbox + optical spacing from band profile */
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const g of gl){const r=N.S*g.wm/2;for(const p of g.pts){x0=Math.min(x0,p[0]-r);x1=Math.max(x1,p[0]+r);y0=Math.min(y0,p[1]-r);y1=Math.max(y1,p[1]+r);}}
  const nb=12,dmax=0.24*h,Lp=new Array(nb).fill(dmax),Rp=new Array(nb).fill(dmax);
  for(const g of gl){const r=N.S*g.wm/2;for(const p of g.pts){const b=Math.floor((p[1]-r*0)/h*nb);for(let bb=b-0;bb<=b;bb++){if(bb<0||bb>=nb)continue;
    Lp[bb]=Math.min(Lp[bb],Math.max(0,p[0]-r-x0));Rp[bb]=Math.min(Rp[bb],Math.max(0,x1-(p[0]+r)));}}}
  const mL=Lp.reduce((a,b)=>a+b,0)/nb,mR=Rp.reduce((a,b)=>a+b,0)/nb;
  const base=def.punct?0.075*M.cap:(lc?0.15*M.cap:0.092*M.cap);
  const sbL=Math.max(0.022*M.cap,base-0.36*Math.min(mL,dmax)),sbR=Math.max(0.022*M.cap,base-0.36*Math.min(mR,dmax));
  const shift=sbL-x0;const strokes=gl.map(g=>({pts:g.pts.map(p=>[p[0]+shift,p[1]]),w:N.S*g.wm,dot:g.dot?1:0}));
  const res={ch,strokes,adv:Math.round(x1-x0+sbL+sbR),bbox:[sbL,y0,sbL+x1-x0,y1],S:N.S};
  if(cache.size>6000)cache.clear();cache.set(key,res);return res;}
NIT.glyph=build;
NIT.spaceW=P=>NIT.M.space;
NIT.layout=(str,P,o)=>{o=o||{};const out=[];let x=0,lineStrokes=[];const track=o.track||0;
  for(const ch of str){if(ch===' '||ch===' '){x+=NIT.M.space+track;continue;}
    const g=build(ch,P);if(!g)continue;for(const s of g.strokes)out.push({pts:s.pts.map(p=>[p[0]+x,p[1]]),w:s.w});x+=g.adv+track;}
  return {strokes:out,width:x};};
