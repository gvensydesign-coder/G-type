/* lowercase Latin + digits. Uses helpers exposed by recipes1 via PXG._h */
function recipes2(PXE,G){
const {CL}=PXE;const h=G._h;const {sub,mirrorBox,rot180,flipV,legs,capW,tl,apr}=h;
const thin=(P,patch)=>PXE.prims(Object.assign({},P.K,patch),P.B);
const lo=(P,f)=>f(sub(P,P.K.X,P.K.Wn,P.K.xm));
/* letters at x-height built from cap recipes */
for(const c of 'vwxzkAu'.slice(0,5))G[c]=P=>{const Q=sub(P,P.K.X,P.K.Wn+(c==='w'?3:c==='v'||c==='x'?1:0),P.K.xm);G['VWXZK'['vwxzk'.indexOf(c)]](Q);};
G.o=P=>{const {K}=P;P.ring(0,0,K.Wn,K.X);};
G['o.w']=P=>{const {K}=P;P.ring(0,0,Math.max(K.Wn,2*K.sv+3),K.X);};
G.c=P=>{const {K,B}=P,{X,sv,sh}=K,W=K.Wn,t=tl({H:X},0.2);P.ring(0,0,W,X);const [a,b]=apr(X,sh,t);B.clear(W-sv,a,W,b);};
G.e=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin(P,{sh}),xm=Math.ceil((X-sh)/2);Q.ring(0,0,W,X);Q.hb(xm,sv,W-sv);B.clear(W-sv,Math.max(sh,Math.min(sh+1,xm-1)),W,xm);};
G.n=P=>{const {K,B}=P,{X,sv,sh}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,1,0,0]});B.clear(sv,0,W-sv,sh);};
G.h=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=K.Wn;G.n(P);P.vs(0,X,A);};
G.m=null;
G.u=P=>{const {K,B}=P,{X,sv,sh}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,0,1,0]});B.clear(sv,X-sh,W-sv,X);};
G.r=P=>{const {K,B}=P,{X,sv,sh}=K,W=Math.max(K.Wn-1,2*sv+1),t=Math.max(1,Math.round(X*0.2));P.vs(0,0,X);P.hb(X-sh,0,W);P.vs(W-sv,X-sh-t,X);};
G.t=P=>{const {K,B}=P,{X,sv,sh,H}=K,W=Math.max(K.Wn-1,2*sv+1),tt=X+1+Math.round((H-X)*0.4);P.vs(1,0,tt);P.hb(X-sh,0,W);P.hb(0,1,W,sh);P.vs(W-sv,0,sh+Math.max(1,Math.round(X*0.2)));};
G.f=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=Math.max(K.Wn-1,2*sv+1);P.vs(1,0,A-sh);P.hb(A-sh,1,W);P.hb(X-sh,0,W-1);};
G.i=P=>{const {K,B}=P,{X,sv,sh}=K,d=sv;P.vs(0,0,X);B.rect(0,X+1,d,X+1+d,2);};
G.l=P=>{const {K,B}=P,{X,sv,sh,A}=K;P.vs(0,0,A);P.hb(0,sv,sv+Math.max(1,Math.round(K.H/8)),sh);};
G.j=P=>{const {K,B}=P,{X,sv,sh,D}=K,d=sv,W=Math.max(K.Wn-2,2*sv);const x=W-sv;P.vs(x,-D+sh,X);P.hb(-D,0,x+sv,sh);P.vs(0,-D,-D+sh+1);B.rect(x,X+1,x+d,X+1+d,2);};
G.b=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,1,1,0]});P.vs(0,0,A);};
G.d=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[1,0,0,1]});P.vs(W-sv,0,A);};
G.p=P=>{const {K,B}=P,{X,sv,sh,D}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,1,1,0]});P.vs(0,-D,X);};
G.q=P=>{const {K,B}=P,{X,sv,sh,D}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[1,0,0,1]});P.vs(W-sv,-D,X);};
G.g=P=>{const {K,B}=P,{X,sv,D}=K,W=K.Wn,shg=Math.max(1,Math.min(K.sh,D-1)),Q=thin(P,{sh:Math.max(1,Math.min(K.sh,Math.floor((X-2)/3)))});
  Q.ring(0,0,W,X,{cm:[1,0,0,1]});P.vs(W-sv,-D+shg,X);P.hb(-D,1,W-1,shg);
  const c=D-shg,st=Math.min(2,c-1);if(st>0)P.vs(0,-D+shg,-D+shg+st);};
G.a=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin(P,{sh});
  const xm=Math.max(sh+1,Math.min(X-2*sh-1,Math.floor((X-sh)*0.52))),cnt=X-sh-(xm+sh),t=Math.min(Math.max(1,Math.round(X*0.15)),Math.max(0,cnt-1));
  Q.ring(0,0,W,xm+sh,{cm:[0,0,1,1]});Q.vs(W-sv,0,X);Q.hb(X-sh,1,W);if(t>0)Q.vs(0,X-sh-t,X-sh);
  B.clear(0,xm+sh,W-sv,X-sh-t);};
G.s=P=>{const {K,B}=P,{X,sv,sh}=K,W=K.Wn,ym=Math.ceil((X-sh)/2),t=1;
  P.ring(0,ym,W,X);B.clear(W-sv,ym+sh,W,Math.max(ym+sh+1,X-sh-t));P.ring(0,0,W,ym+sh);B.clear(0,Math.min(sh+t,ym-1),sv,ym);};
G.y=P=>{const {K,B}=P,{X,sv,sh,D}=K;const W=K.Wn+1;const S=Math.max(1,Math.round((W-sv)/2));
  const n=X;legs(P,S,sv,0,n,S,false);/* V spreading from baseline up */
  /* continue right stroke down into descender */
  const xr=S+sv-sv+0;P.dg(S+sv/2+0.0,0,Math.max(sv/2,S-2)+0.0,-D,sv);};
G['м.d']=P=>{const {K,B}=P,{X,sv}=K;let W=K.Wn+3;if((W-sv)&1)W++;P.vs(0,0,X);P.vs(W-sv,0,X);const yv=Math.round(X*0.4),cx=(W-sv)/2;
  P.dg(sv/2,X,cx+sv/2,yv,sv);P.dg(W-sv/2,X,cx+sv/2,yv,sv);};
G.m=P=>{const {K,B}=P,{X,sv,sh}=K;let w1=K.Wn;const W=2*w1-sv;P.ring(0,0,w1,X,{cm:[0,1,0,0]});P.ring(w1-sv,0,W,X,{cm:[0,1,0,0]});B.clear(sv,0,w1-sv,sh);B.clear(w1,0,W-sv,sh);};
G['m.ss01']=G['м.d'];
/* digits */
G['0p']=P=>{const {K,B}=P,{H,sv}=K,W=Math.max(K.Wc-Math.max(1,Math.round(K.Wc*0.15)),2*sv+3);P.ring(0,0,W,H);};/* гладкий нуль (ss01) */
/* FX2g: нуль с чертой внутри просвета (угол в угол, 4-связно, концы упираются в кольцо): О и 0 различимы при любом весе и разрешении; просвет делится на 2 */
G['0']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(K.Wc-Math.max(1,Math.round(K.Wc*0.15)),2*sv+3);P.ring(0,0,W,H);
  const x0=sv,x1=W-sv,y0=sh,y1=H-sh,n=y1-y0,w=x1-x0;if(n>=3&&w>=2){P.ln(x0,y0,x1-1,y1-1,1);}};
G['1']=P=>{const {K,B}=P,{H,sv,sh}=K;const W=Math.max(K.Wc-1,sv+4);const x=Math.floor((W-sv)/2)+1;P.vs(x,0,H);P.hb(0,0,W);const f=Math.max(1,Math.round(H*0.18));
  for(let k=0;k<f;k++)B.rect(x-1-k,H-1-k,x,H-k,1);};
G['2']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,hh=Math.round(H*0.58),t=tl(K,0.14);P.ring(0,H-hh,W,H);B.clear(sv,H-hh,W,H-hh+sh);B.clear(0,H-hh,sv,H-hh+sh+t);
  P.dg(W-sv/2,H-hh+sh,sv/2,sh,sv);P.hb(0,0,W);};
G['3']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym,t=tl(K,0.14);P.hb(H-sh,0,W);const L=Math.max(2,H-ym-sh);P.dg(W-sv/2,H-sh,Math.max(sv/2+1,Math.round(W*0.38))+sv/2,ym+sh,sv);
  P.ring(0,0,W,ym+sh+Math.max(0,1-sh)+0);B.clear(0,Math.min(sh+t,ym-1),sv,ym);B.clear(0,ym+sh,W,ym+sh);P.hb(ym,Math.round(W*0.3),W-sv+1);};
G['4']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc+(sv>1?1:0),ym=Math.round(H*0.34);P.vs(W-sv-(sv>2?0:0)-0,0,H);P.hb(ym,0,W);P.dg(W-sv-sv/2+0.5,H,sv/2,ym+sh,sv);};
G['5']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=Math.round(H*0.5),t=tl(K,0.14);P.hb(H-sh,0,W);P.vs(0,ym,H);
  P.ring(0,0,W,ym+sh,{cm:[0,1,1,1]});B.clear(0,sh+t,sv,ym);B.clear(0,ym,sv,ym+sh);P.hb(ym,0,W-1);};
G['6']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,yb=Math.round(H*0.6),t=tl(K,0.14);P.ring(0,0,W,yb);P.vs(0,0,H-sh);P.hb(H-sh,1,W-sv+0);{const t2=Math.min(t,H-sh-yb-1);if(t2>0)P.vs(W-sv,H-sh-t2,H-sh);}};
G['9']=P=>{const {K,B}=P;G['6'](P);rot180(P,K.Wc,0,K.H);};
G['7']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.hb(H-sh,0,W);P.dg(W-sv/2,H-sh,Math.round(W*0.3)+sv/2,0,sv);};
G['8']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym;P.ring(0,ym,W-1,H);P.ring(0,0,W,ym+sh);};
return G;}
if(typeof module!=='undefined')module.exports=recipes2;
