/* PXG: base glyph recipes. Recipe: (P)=>void drawing into P.B using P.K metrics. Lowercase letters of Cyrillic reuse cap recipes at x-height. */
const PXG={};
function recipes1(PXE){
const {CL,dlw}=PXE;
const G=PXG;
/* derived view: same bitmap, other height/width */
const sub=(P,h,W,ym)=>{const K=Object.assign({},P.K,{H:h,Wc:W==null?P.K.Wc:W});if(h<P.K.H)K.sh=Math.min(K.sh,Math.max(1,Math.floor((h-2)/3)));K.ym=ym==null?Math.ceil((h-K.sh)/2):ym;return PXE.prims(K,P.B);};
/* bitmap transforms inside box [0,W)x[y0,y1) */
const mirrorBox=(P,W,y0,y1)=>{const B=P.B,t=[];for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)t.push(B.g(x,y));let i=0;for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)B.s(W-1-x,y,t[i++]);};
const rot180=(P,W,y0,y1)=>{const B=P.B,t=[];for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)t.push(B.g(x,y));let i=0;for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)B.s(W-1-x,y1-1-(y-y0),t[i++]);};
const flipV=(P,W,y0,y1)=>{const B=P.B,t=[];for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)t.push(B.g(x,y));let i=0;for(let y=y0;y<y1;y++)for(let x=0;x<W;x++)B.s(x,y1-1-(y-y0),t[i++]);};
const bbox=P=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of P.B.cells()){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,x1:x1+1,y0,y1:y1+1};};
/* clear box for B.s with value 0 */
const clr=(B,x0,y0,x1,y1)=>B.clear(x0,y0,x1,y1);
/* triangle legs: rows y in [y0,y0+n); apex at the top (up=true) or bottom; plateau tw wide at xc; total spread S over n rows */
function legs(P,xc,tw,y0,n,S,up,run){const {K,B}=P;run=run||K.sv;
  for(let k=0;k<n;k++){const y=up?y0+n-1-k:y0+k;const s=n>1?Math.floor(k*S/(n-1)+0.5):0;
    B.rect(xc-s,y,xc-s+run,y+1);B.rect(xc+tw-run+s,y,xc+tw+s,y+1);}}
/* single diagonal from (xa,ya) to (xb,yb) given as cell centers: x centers, y edges. Uses rounding of linear interpolation */
const capW=(K,f)=>Math.max(2*K.sv+1,Math.round(K.Wc*f));
const tl=(K,f)=>CL(Math.round(K.H*f),1,5);
/* aperture rows for a C-like opening: [lo,hi) inside counter [sh,H-sh), never empty */
const apr=(H,sh,t)=>{let lo=sh+t,hi=H-sh-t;if(hi<=lo){lo=Math.max(sh,(H>>1)-1);hi=Math.min(H-sh,lo+2);if(hi<=lo)hi=lo+1;}return [lo,hi];};
G.I=P=>{const {K,B}=P,{H,sv,sh}=K,kk=CL(Math.round(H/6),1,3),bw=sv+2*kk;B.rect(kk,0,kk+sv,H);B.rect(0,0,bw,sh);B.rect(0,H-sh,bw,H);};
G.H=P=>{const {K,B}=P,{H,sv}=K,W=K.Wc;P.vs(0,0,H);P.vs(W-sv,0,H);P.hb(K.ym,sv,W-sv);};
G.E=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.92);P.vs(0,0,H);P.hb(0,sv,W);P.hb(H-sh,sv,W);P.hb(K.ym,sv,W-1-(sv>2?1:0));};
G.F=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.92);P.vs(0,0,H);P.hb(H-sh,sv,W);P.hb(K.ym,sv,W-1-(sv>2?1:0));};
G.U=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H,{cm:[0,0,1,1]});B.clear(sv,H-sh,W-sv,H);};
G.L=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.88);P.vs(0,0,H);P.hb(0,sv,W);};
G.T=P=>{const {K,B}=P,{H,sv,sh}=K;let W=K.Wc;if((W-sv)&1)W++;P.hb(H-sh,0,W);P.vs((W-sv)/2,0,H-sh);};
G.O=P=>{const {K}=P;P.ring(0,0,K.Wc,K.H);};
G.Q=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H);const t=Math.max(2,Math.round(H*0.2)),d=Math.max(1,Math.round(H*0.1));
  B.clear(W-sv,0,W,Math.max(1,sh));P.dg(W-sv-t+sv/2,t+sh,W+0.5,-d,sv);};
G.C=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,t=tl(K,0.2);P.ring(0,0,W,H);const [a,b]=apr(H,sh,t);B.clear(W-sv,a,W,b);};
G.G=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,t=tl(K,0.2),ym=Math.floor(H*0.46);
  P.ring(0,0,W,H);B.clear(W-sv,ym+sh,W,Math.max(ym+sh+1,H-sh-t));P.hb(ym,Math.round(W*0.45),W);};
G.D=P=>{const {K}=P;P.ring(0,0,K.Wc,K.H,{cm:[0,1,1,0]});};
G.B=P=>{const {K,B}=P,{H,sv,sh}=K,ym=K.ym,W=K.Wc;P.ring(0,ym,W-1,H,{cm:[0,1,1,0]});P.ring(0,0,W,ym+sh,{cm:[0,1,1,0]});};
G.P=P=>{const {K,B}=P,{H,sv,sh}=K,yb=Math.round(H*0.42),W=K.Wc;P.ring(0,yb,W,H,{cm:[0,1,1,0]});P.vs(0,0,H);};
G.R=P=>{const {K,B}=P,{H,sv,sh}=K,yb=Math.round(H*0.44),W=K.Wc;P.ring(0,yb,W,H,{cm:[0,1,1,0]});P.vs(0,0,H);
  P.dg(Math.round(W*0.42)+sv/2,yb+sh,W-sv/2,0,sv);};
G.S=P=>{const {K,B}=P,{H,sv,sh}=K,ym=K.ym,W=K.Wc,t=tl(K,0.14);
  P.ring(0,ym,W,H);B.clear(W-sv,ym+sh,W,Math.max(ym+sh+1,H-sh-t));
  P.ring(0,0,W,ym+sh);B.clear(0,Math.min(sh+t,ym-1),sv,ym);};
/* ---- diagonal capitals: left half drawn, mirrored where symmetric ---- */
const symR=(P,W,y0,y1)=>{const B=P.B;for(let y=y0;y<y1;y++)for(let x=0;x<Math.ceil(W/2);x++){const v=B.g(x,y);if(v)B.s(W-1-x,y,v);}};
/* apex geometry: leg run dl, plateau tp (same parity as W), left edge of the leg at row y: round(xt*y/(H-1)) */
function apex(K,W){const dl=dlw(K.sv,(W-K.sv)/2,K.H);let tp=dl+((W-dl)&1);const xt=Math.max(0,(W-tp)/2);return {dl,tp,xt};}
const rnd=v=>Math.floor(v+0.5+1e-9);
G.A=P=>{const {K,B}=P,{H,sv,sh}=K;const W=Math.max(K.Wc+1,2*Math.max(sv,2)+3);const {dl,xt}=apex(K,W);
  const x0=y=>rnd(xt*y/(H-1));
  for(let y=0;y<H;y++)B.rect(x0(y),y,x0(y)+dl,y+1);
  symR(P,W,0,H);
  let ym=0;for(let y=H-1;y>=0;y--)if(W-2*x0(y)>2*dl){ym=y;break;}
  const yb=Math.max(1,Math.min(Math.round(H*0.3),ym-sh));for(let y=yb;y<yb+sh;y++)B.rect(x0(y),y,W-x0(y),y+1);};
G.V=P=>{const {K,B}=P,{H,sv}=K;const W=Math.max(K.Wc+1,2*Math.max(sv,2)+3);const {dl,xt}=apex(K,W);
  const x0=y=>rnd(xt*y/(H-1));
  for(let y=0;y<H;y++)B.rect(x0(H-1-y),y,x0(H-1-y)+dl,y+1);symR(P,W,0,H);};
G.X=P=>{const {K,B}=P,{H,sv}=K;let W=Math.max(K.Wc+1,2*Math.max(sv,2)+3);if((W-Math.max(sv,2))&1)W++;const dl=dlw(sv,(W-sv)/2,H),xt=W-dl;
  for(let y=0;y<H;y++){const a=rnd(xt*(H-1-y)/(H-1));B.rect(a,y,a+dl,y+1);B.rect(xt-a,y,xt-a+dl,y+1);}};
G.Y=P=>{const {K,B}=P,{H,sv}=K;let W=Math.max(K.Wc+1,2*Math.max(sv,2)+3);if((W-sv)&1)W++;
  const yc=Math.max(2,Math.round(H*0.46)),cx=(W-sv)/2,dl=dlw(sv,cx,H-yc);
  for(let y=yc;y<H;y++){const a=rnd(cx*(y-yc)/Math.max(1,H-1-yc));const x=cx-a;B.rect(x,y,x+Math.max(dl,sv),y+1);}symR(P,W,yc,H);P.vs(cx,0,yc+1);};
G.K=P=>{const {K,B}=P,{H,sv,sh}=K;const dl0=Math.max(sv,2),W=Math.max(K.Wc+1,sv+2*dl0+1),ym=K.ym,dl=dlw(sv,W-dl0-sv,Math.round(H/2));P.vs(0,0,H);
  const ya=ym+Math.floor(sh/2);
  for(let y=ya;y<H;y++){const t=(y-ya)/Math.max(1,H-1-ya);const x0=rnd(sv-1+(W-dl-(sv-1))*t);B.rect(x0,y,x0+dl,y+1);}
  for(let y=0;y<ya;y++){const t=(ya-y)/Math.max(1,ya);const x0=rnd(sv-1+(W-dl-(sv-1))*t);B.rect(x0,y,x0+dl,y+1);}};
G.M=P=>{const {K,B}=P,{H,sv}=K;if(H<=6&&sv===1){P.vs(0,0,H);P.vs(4,0,H);B.s(1,H-2);B.s(3,H-2);B.s(2,H-3);return;}
  const dl0=Math.max(sv,2);let W=Math.max(K.Wc+2,2*sv+2*dl0-1);if((W-dl0)&1)W++;P.vs(0,0,H);P.vs(W-sv,0,H);
  const yv0=Math.max(Math.round(H*0.4),dl0+1),dl=dlw(sv,(W-dl0)/2-sv,H-yv0),cx=(W-dl)/2,yv=Math.max(Math.round(H*0.4),dl+1);
  P.ln(sv-1,H-1,Math.floor(cx),yv,dl);
  symR(P,W,yv,H);B.rect(Math.floor(cx),yv-1,Math.floor(cx)+dl,yv,1);};
G.W=P=>{const {K,B}=P,{H,sv}=K;const dl0=Math.max(sv,2);let W=Math.max(Math.round(K.Wc*1.7),5*dl0+2);if((W-dl0)&1)W++;
  const q=Math.floor((W-dl0)/4),dl=dlw(sv,q,H),yp=Math.max(Math.round(H*0.66),dl+1),cx=(W-dl)/2;
  for(let y=0;y<H;y++){const a=rnd(q*(H-1-y)/(H-1));B.rect(a,y,a+dl,y+1);}
  for(let y=0;y<yp;y++){const a=rnd((cx-q)*y/Math.max(1,yp-1));B.rect(q+a,y,q+a+dl,y+1);}
  symR(P,W,0,H);};
G.N=P=>{const {K,B}=P,{H,sv}=K;const dl0=Math.max(sv,2),W=Math.max(K.Wc+(sv>2?1:0),2*sv+dl0+1),dl=dlw(sv,W-dl0-1,H);P.vs(0,0,H);P.vs(W-sv,0,H);
  for(let y=0;y<H;y++){const x0=rnd(1+(W-dl-1)*(H-1-y)/(H-1));B.rect(x0,y,x0+dl,y+1);}};
G.Z=P=>{const {K,B}=P,{H,sv,sh}=K;const dl0=Math.max(sv,2),W=Math.max(capW(K,1.0),dl0+3),dl=dlw(sv,W-dl0,H-2*sh);P.hb(H-sh,0,W);P.hb(0,0,W);
  const y0=sh,y1=H-sh-1;for(let y=y0;y<=y1;y++){const t=(y-y0)/Math.max(1,y1-y0);const x0=rnd(t*(W-dl));B.rect(x0,y,x0+dl,y+1);}};
G.R=P=>{const {K,B}=P,{H,sv,sh}=K,yb=Math.round(H*0.44),W=K.Wc,dl=Math.max(sv,2);P.ring(0,yb,W,H,{cm:[0,1,1,0]});P.vs(0,0,H);
  const xs=Math.round(W*0.5)-1;for(let y=0;y<=yb;y++){const t=(yb-y)/Math.max(1,yb);const x0=rnd(xs+(W-dl-xs)*t);B.rect(x0,y,x0+dl,y+1);}};
G.Q=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H);const t=Math.max(2,Math.round(H*0.22)),dl=Math.max(sv,2),dn=Math.max(1,Math.round(H*0.1));
  B.clear(W-sv,0,W,Math.max(1,sh));
  for(let y=-dn;y<=t;y++){const k=(t-y)/(t+dn);const xa=W-dl-sv-1;const x0=rnd(xa+(W-dl-xa)*(1-k));B.rect(x0,y,x0+dl,y+1);}};
G.J=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(K.Wc-1,2*sv+2),st=Math.max(2,Math.round(H*0.28));
  B.rect(W-sv,0,W,H);B.rect(1,0,W,sh);B.rect(0,sh,sv,st+sh);};
G._h={sub,mirrorBox,rot180,flipV,legs,capW,tl,bbox,apr};
return G;}
if(typeof module!=='undefined')module.exports=recipes1;
