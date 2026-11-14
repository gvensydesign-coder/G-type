/* ===== «Пиксель» (Pixel Grid): шрифт на клеточной сетке. Части: pix/engine.js glyphs1-5.js render.js reg.js (сборка mk_pixel.sh; таблица пределов насыщенности pix/limits.json генерируется из рецептов) ===== */
(function(){
/* PXE: pixel glyph engine (pure). Coordinates: x = column (right), y = row from baseline (up). Cell (x,y) = [x,x+1)x[y,y+1). */
const PXE=(function(){
const CL=(v,a,b)=>Math.max(a,Math.min(b,v));
/* ---- weight ladder: index -> [sv (vertical stem), sh (horizontal bar)] ---- */
const LADDER=[[1,1],[2,1],[2,2],[3,2],[3,3],[4,3],[4,4],[5,4],[5,5]];
function weightPx(pw,serif){const i=CL(Math.round((pw-1)*2),0,LADDER.length-1);let [sv,sh]=LADDER[i];
  if(serif)sh=Math.max(1,Math.round(sh*0.6));return [sv,sh];}
/* ---- context ---- */
function ctx(res,pw,serif){
  const H=res,[sv,sh]=weightPx(pw,serif);
  const X=H<=6?5:Math.max(4,Math.round(H*0.7)),A=H,D=Math.max(2,Math.round(H*0.27));
  const K={H,X,A,D,sv,sh,serif:!!serif,res};
  K.mh=H>=14?3:2;                               /* mark height */
  K.mt=sv>=3?2:1;                               /* mark stroke */
  K.gap=1;                                      /* gap between letter and mark */
  /* base widths */
  K.Wc=Math.max(2*sv+2,Math.round(H*0.5+sv));   /* round cap width */
  K.Wn=Math.max(2*sv+2,Math.round(X*0.5+sv));   /* lowercase n width */
  K.sf=H>=24?3:H>=15?2:1;K.sfh=sv>=3&&H>=18?2:1;     /* serif: length, height */
  K.ym=Math.ceil((H-sh)/2);                     /* middle bar (caps) */
  K.xm=Math.ceil((X-sh)/2);                     /* middle bar (lowercase) */
  return K;}
/* diagonal run that keeps the stem weight: perpendicular thickness ~ sv, so run = sv*sqrt(1+m^2); sv=1 keeps a 2-wide run for 4-connectivity */
function dlw(sv,spread,rows){const m=spread/Math.max(1,rows);return Math.max(sv>1?sv:2,Math.round(sv*Math.sqrt(1+m*m)-0.2));}
/* ---- bitmap ---- */
class Bm{
  constructor(K){this.K=K;this.ox=12;this.oy=K.D+4;this.w=96;this.h=K.D+K.H+22;this.a=new Uint8Array(this.w*this.h);}
  ix(x,y){x+=this.ox;y+=this.oy;return (x<0||y<0||x>=this.w||y>=this.h)?-1:y*this.w+x;}
  s(x,y,v){const i=this.ix(x,y);if(i>=0)this.a[i]=v==null?1:v;}
  c(x,y){const i=this.ix(x,y);if(i>=0)this.a[i]=0;}
  g(x,y){const i=this.ix(x,y);return i>=0?this.a[i]:0;}
  rect(x0,y0,x1,y1,v){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)this.s(x,y,v);}
  clear(x0,y0,x1,y1){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)this.c(x,y);}
  cells(){const o=[];for(let y=-this.oy;y<this.h-this.oy;y++)for(let x=-this.ox;x<this.w-this.ox;x++)if(this.g(x,y))o.push([x,y,this.g(x,y)]);return o;}
}
/* corner inset table for radius r */
const INS={};
function ins(r){if(INS[r])return INS[r];const t=[];for(let j=0;j<r;j++){const x=r-Math.sqrt(Math.max(0,r*r-(r-j-0.5)*(r-j-0.5)));t.push(Math.round(x));}
  for(let j=1;j<t.length;j++)if(t[j]>t[j-1])t[j]=t[j-1];return INS[r]=t;}
function rrInside(w,h,r,i,j){/* i col from left, j row from top */
  if(i<0||j<0||i>=w||j>=h)return false;const t=ins(r);let k=0;if(j<r)k=t[j];else if(h-1-j<r)k=t[h-1-j];
  return i>=k&&i<w-k;}
function radius(w,h,f){const m=Math.min(w,h);if(m<4)return 0;return CL(Math.round(m*(f==null?0.28:f)),1,Math.floor(m/2));}
/* ---- primitives ---- */
function prims(K,B){
  const P={K,B};
  P.vs=(x,y0,y1,w)=>{B.rect(x,y0,x+(w||K.sv),y1);};
  P.hb=(y,x0,x1,h)=>{B.rect(x0,y,x1,y+(h||K.sh));};
  /* ring (outer box [x0,x1)x[y0,y1)), tv/th stroke, r radius factor, corners mask [tl,tr,br,bl] = round? */
  P.ring=(x0,y0,x1,y1,o)=>{o=o||{};const w=x1-x0,h=y1-y0,tv=Math.max(1,Math.min(o.tv||K.sv,Math.floor((w-1)/2))),th=Math.max(1,Math.min(o.th||K.sh,Math.floor((h-1)/2)));
    const r=o.r!=null?o.r:radius(w,h,o.rf),iw=w-2*tv,ih=h-2*th,ri=o.ri!=null?o.ri:Math.max(0,r-Math.min(tv,th)),cm=o.cm||[1,1,1,1];
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=x-x0,j=y1-1-y;
      /* corner mask: square corners where cm=0 */
      const left=i<w/2,top=j<h/2,ci=top?(left?0:1):(left?3:2);
      let inO=cm[ci]?rrInside(w,h,r,i,j):true;
      let inI=false;if(iw>0&&ih>0){const ii=i-tv,jj=j-th;inI=cm[ci]?rrInside(iw,ih,ri,ii,jj):(ii>=0&&jj>=0&&ii<iw&&jj<ih);}
      if(inO&&!inI)B.s(x,y,1);}};
  /* diagonal from (xa,ya) to (xb,yb) in cell edges; wd = nominal horizontal run; y from ya..yb exclusive; run grows so rows always share an edge (4-connected) */
  P.dg=(xa,ya,xb,yb,wd,o)=>{wd=wd||K.sv;const lo=Math.min(ya,yb),hi=Math.max(ya,yb),m=Math.abs(xb-xa)/Math.max(1,hi-lo);const we=m>0.01?Math.max(wd,Math.ceil(m-1e-9)+1):wd;
    for(let y=lo;y<hi;y++){const t=(y+0.5-ya)/(yb-ya);const xc=xa+(xb-xa)*t;const x0=Math.floor(xc-we/2+0.5+1e-9+(o&&o.bias||0));B.rect(x0,y,x0+we,y+1);}};
  /* line by left edges: row ya has left edge xa, row yb has left edge xb (rows inclusive); run d grows to keep 4-connectivity */
  P.ln=(xa,ya,xb,yb,d,v)=>{const lo=Math.min(ya,yb),hi=Math.max(ya,yb),n=Math.max(1,hi-lo),m=Math.abs(xb-xa)/n,de=m>0.01?Math.max(d,Math.ceil(m-1e-9)+1):d;
    for(let y=lo;y<=hi;y++){const t=hi===lo?0:(y-ya)/(yb-ya);const x0=Math.floor(xa+(xb-xa)*t+0.5+1e-9);B.rect(x0,y,x0+de,y+1,v);}return de;};
  /* staircase leg: spread s(y) = floor(|y-yp|/m) from apex row yp */
  P.dot=(x,y,d)=>{d=d||K.sv;B.rect(x,y,x+d,y+d,2);};
  return P;}
/* острова: 4-связные компоненты клеток-чернил (v=1) из <= 2 клеток; задуманные точки (v=2) и знаки (v=3) не считаются. -> число островов */
function islands(cells,max){max=max||2;const m=new Map();for(const c of cells)if(c[2]===1||c[2]==null)m.set(c[0]+','+c[1],1);let n=0;
  for(const k of [...m.keys()]){if(!m.has(k))continue;const [x,y]=k.split(',').map(Number);const st=[[x,y]];m.delete(k);let sz=0;
    while(st.length){const [a,b]=st.pop();sz++;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(a+dx)+','+(b+dy);if(m.has(q)){m.delete(q);st.push([a+dx,b+dy]);}}}
    if(sz<=max)n++;}return n;}
return {islands,dlw,CL,LADDER,weightPx,ctx,Bm,prims,ins,rrInside,radius};
})();
if(typeof module!=='undefined')module.exports=PXE;
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
/* Cyrillic capitals (distinct from Latin), extended Cyrillic bases, punctuation and symbols */
function recipes3(PXE,G){
const {CL}=PXE;const {sub,mirrorBox,rot180,flipV,legs,capW,tl}=G._h;
const dd=K=>K.sv;                              /* dot size */
G['Г']=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.92);P.vs(0,0,H);P.hb(H-sh,sv,W);};
G['Ґ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.92),ho=H>=14?2:1;P.vs(0,0,H);P.hb(H-sh,sv,W);P.vs(W-sv,H-sh,H+ho);};
G['П']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.vs(0,0,H);P.vs(W-sv,0,H);P.hb(H-sh,sv,W-sv);};
G['Б']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym;P.ring(0,0,W,ym+sh+0,{cm:[0,1,1,0]});P.vs(0,0,H);P.hb(H-sh,sv,capW(K,0.95));};
G['Ь']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,yb=Math.round(H*0.56);P.ring(0,0,W,yb,{cm:[0,1,1,0]});P.vs(0,0,H);};
G['Ъ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,yb=Math.round(H*0.56),o=Math.max(1,Math.round(H/8));
  P.ring(o+sv-sv+0,0,W+o,yb,{cm:[0,1,1,0]});P.vs(o,0,H);P.hb(H-sh,0,o+sv+1);};
G['Ы']=P=>{const {K,B}=P,{H,sv,sh}=K,Wb=Math.max(K.Wc-1,2*sv+2),yb=Math.round(H*0.56);P.ring(0,0,Wb,yb,{cm:[0,1,1,0]});P.vs(0,0,H);P.vs(Wb+1+(K.serif?2*K.sf:0),0,H);};
G['Д']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc+2,fd=Math.max(1,Math.round(K.D*0.45));let W2=W;
  P.hb(H-sh,2,W2-1);P.vs(2,sh,H);P.vs(W2-sv-1,sh,H);P.hb(0,0,W2);P.vs(0,-fd,sh);P.vs(W2-sv,-fd,sh);B.clear(0,-fd,0,0);};
G['Ж']=P=>{const {K,B}=P,{H,sv,sh}=K;let W=K.Wc*1.4|0;if((W-sv)&1)W++;const cx=(W-sv)/2,ym=K.ym;P.vs(cx,0,H);
  P.dg(sv/2,H,cx+sv/2-0.0,ym+Math.floor(sh/2),sv);P.dg(sv/2,0,cx+sv/2,ym+Math.floor(sh/2),sv);
  P.dg(W-sv/2,H,cx+sv/2,ym+Math.floor(sh/2),sv);P.dg(W-sv/2,0,cx+sv/2,ym+Math.floor(sh/2),sv);};
G['З']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym,t=tl(K,0.14);P.ring(0,ym,W-1,H);B.clear(0,ym+sh,sv,Math.max(ym+sh+1,H-sh-t));P.ring(0,0,W,ym+sh);B.clear(0,Math.min(sh+t,ym-1),sv,ym);};
G['И']=P=>{const {K,B}=P,{H,sv}=K,W=K.Wc+(sv>2?1:0);P.vs(0,0,H);P.vs(W-sv,0,H);P.dg(W-sv/2-0.5,H,sv/2+0.5,0,sv);};
G['Л']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.vs(W-sv,0,H);P.hb(H-sh,1,W);P.dg(Math.round(W*0.42)+sv/2,H-sh,sv/2,0,sv);};
G['У']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;const ym=Math.round(H*0.42);P.dg(W-sv/2,H,Math.round(W*0.25)+sv/2,0,sv);P.dg(sv/2,H,Math.round(W*0.5)-0.0,ym,sv);};
G['Ф']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.round(K.Wc*1.3)|0,ya=Math.round(H*0.2);let w=W;if((w-sv)&1)w++;P.ring(0,ya,w,H-ya);P.vs((w-sv)/2,0,H);};
G['Ц']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,fd=Math.max(1,Math.round(K.D*0.45));P.vs(0,0,H);P.vs(W-sv,0,H);P.hb(0,sv,W);P.vs(W-sv+0,-fd,sh);P.vs(W,-fd,0);P.vs(W-sv,-fd,sh);};
G['Ч']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym;P.vs(0,ym,H);P.hb(ym,0,W);P.vs(W-sv,0,H);};
G['Ш']=P=>{const {K,B}=P,{H,sv,sh}=K;let W=K.Wc*1.35|0;if((W-sv)&1)W++;P.vs(0,0,H);P.vs(W-sv,0,H);P.vs((W-sv)/2,0,H);P.hb(0,0,W);};
G['Щ']=P=>{const {K,B}=P,{H,sv,sh}=K,fd=Math.max(1,Math.min(Math.round(K.D),Math.round(K.D*0.85)));/* FX2g: хвост Щ вдвое глубже, чем у Ц: Ш/Щ различимы при 12 px */G['Ш'](P);const bb=G._h.bbox(P);P.vs(bb.x1-sv,-fd,sh);P.hb(-fd,Math.max(bb.x0,bb.x1-(fd<=sh?3:Math.max(4,Math.ceil(5/sv)))*sv),bb.x1);};
G['Э']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym;P.ring(0,0,W,H);const a=Math.max(1,Math.round(H*0.12));B.clear(0,Math.max(sh,ym-a),sv,Math.min(H-sh,ym+sh+a));P.hb(ym,Math.max(sv,Math.round(W*0.3)),W-sv);};
G['Є']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym,t=tl(K,0.2);P.ring(0,0,W,H);B.clear(W-sv,Math.min(sh+t,ym-1),W,Math.max(H-sh-t,ym+sh+1));P.hb(ym,sv,Math.min(Math.round(W*0.7),W-sv));};
G['Ю']=P=>{const {K,B}=P,{H,sv,sh}=K,Wr=Math.max(K.Wc,2*sv+3),x0=sv+Math.max(1,sv-1);P.vs(0,0,H);P.hb(K.ym,sv,x0+1);P.ring(x0,0,x0+Wr,H);};
G['Я']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;G.R(P);mirrorBox(P,W,-K.D,H+2);};
G['Ј']=null;
G['Ђ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,1.0),X=K.X;G.T(P);};
G['Љ']=P=>{const {K,B}=P,{H,sv,sh}=K;G['Л'](P);const Wl=Math.max(K.Wc-1,2*sv+2),o=P._lw?P._lw:0;const bb=G._h.bbox(P);const x0=bb.x1-sv,yb=Math.round(H*0.56);P.ring(x0,0,x0+Wl,yb,{cm:[0,1,1,0]});P.vs(x0,0,H);};
G['Њ']=P=>{const {K,B}=P,{H,sv,sh}=K;const Wh=Math.max(K.Wc-1,2*sv+2);P.vs(0,0,H);P.vs(Wh-sv,0,H);P.hb(K.ym,sv,Wh-sv);const o=Wh+1,yb=Math.round(H*0.56);P.ring(o,0,o+Wh,yb,{cm:[0,1,1,0]});P.vs(o,0,H);};
G['Ћ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;G.T(P);};
G['Џ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,fd=Math.max(1,Math.round(K.D*0.45)),xm=Math.floor((W-sv)/2);P.vs(0,0,H);P.vs(W-sv,0,H);P.hb(0,sv,W-sv);P.vs(xm,-fd,sh);P.vs(xm,-fd,0);P.vs(xm,-fd,sh);};
G['Ғ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=capW(K,0.92);G['Г'](P);P.hb(K.ym,0,Math.max(sv+2,Math.round(W*0.7)));};
G['Қ']=P=>{const {K,B}=P,{H,sv,sh}=K;G.K(P);const bb=G._h.bbox(P);P.vs(bb.x1-sv,-Math.max(1,Math.round(K.D*0.45)),sh);};
G['Ң']=P=>{const {K,B}=P,{H,sv,sh}=K;G.H(P);const bb=G._h.bbox(P);P.vs(bb.x1-sv,-Math.max(1,Math.round(K.D*0.45)),sh);};
G['Ө']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H);P.hb(K.ym,sv+0,W-sv,sh);};
G['Ү']=null;
G['Ұ']=P=>{const {K,B}=P,{H,sv,sh}=K;G.Y(P);const bb=G._h.bbox(P);P.hb(Math.round(H*0.28),bb.x0+Math.max(0,(bb.x1-bb.x0-sv-2)>>1)-0,bb.x1-Math.max(0,(bb.x1-bb.x0-sv-2)>>1),sh);};
G['Һ']=null;
G['Ә']=P=>{const {K,B}=P,{H,sv,sh}=K;G['Э'](P);/* Э with the other aperture */ };
/* ---- Latin extras ---- */
G['ı']=P=>{const {K,B}=P;P.vs(0,0,K.X);};
G['ß']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,ym=K.ym,t=1;P.vs(0,0,H);P.ring(0,ym,W,H,{cm:[0,1,1,0]});B.clear(0,0,0,0);P.ring(0,0,W,ym+sh,{cm:[0,1,1,0]});B.clear(0,0,sv,H);P.vs(0,0,H);B.clear(0,ym+0,sv,ym+sh);};
G['Æ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;const Wa=Math.max(K.Wc,2*sv+3);P.vs(0,0,H);P.hb(0,sv,Wa+Wa);};
/* ---- punctuation and symbols (all at cap/x-height proportions) ---- */
const dotP=(P,x,y)=>{const d=P.K.sv;P.B.rect(x,y,x+d,y+d,2);};
G['.']=P=>{dotP(P,0,0);};
G[',']=P=>{const {K,B}=P,d=K.sv;B.rect(0,0,d,d,2);const t=Math.max(1,Math.round(K.D*0.5));B.rect(0,-t,Math.max(1,d-1),0,2);if(d>=2)B.rect(0,-t,d-1,0,2);};
G[':']=P=>{const {K}=P;dotP(P,0,0);dotP(P,0,K.X-K.sv);};
G[';']=P=>{const {K,B}=P,d=K.sv;G[','](P);dotP(P,0,K.X-d);};
G['!']=P=>{const {K,B}=P,{H,sv,sh}=K;P.vs(0,Math.max(sv+2,Math.round(H*0.28)),H);dotP(P,0,0);};
G['?']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,hh=Math.round(H*0.62),t=tl(K,0.14),cx=Math.floor((W-sv)/2);
  P.ring(0,H-hh,W,H);B.clear(0,H-hh,cx,H-hh+sh);B.clear(0,H-hh+sh,sv,Math.max(H-hh+sh+1,Math.min(H-sh,H-hh+sh+t)));
  P.vs(cx,Math.min(sv+Math.max(1,sh),H-hh),H-hh+sh);dotP(P,cx,0);};
G['"']=P=>{const {K,B}=P,{H,sv}=K,h2=Math.max(2,Math.round(H*0.3));P.vs(0,H-h2,H);P.vs(sv+Math.max(1,Math.round(sv)),H-h2,H);};
G["'"]=P=>{const {K,B}=P,{H,sv}=K,h2=Math.max(2,Math.round(H*0.3));P.vs(0,H-h2,H);};
G['-']=P=>{const {K,B}=P,{H,sv,sh}=K;P.hb(Math.round(H*0.4),0,Math.max(3,Math.round(K.Wc*0.6)));};
G['–']=P=>{const {K,B}=P,{H,sv,sh}=K;P.hb(Math.round(H*0.4),0,Math.max(4,Math.round(K.Wc*0.95)));};
G['—']=P=>{const {K,B}=P,{H,sv,sh}=K;P.hb(Math.round(H*0.4),0,Math.max(6,Math.round(K.Wc*1.5)));};
G['−']=P=>{const {K,B}=P,{H,sv,sh}=K;P.hb(Math.round(H*0.4)+(sh>1?0:0),0,Math.max(4,Math.round(K.Wc*0.9)));};
G['(']=P=>{const {K,B}=P,{H,sv,sh}=K,d=K.D,a=Math.max(1,Math.round(sv*0.7));P.vs(1,-d+1,H+d-1,Math.max(1,sv));P.hb(H+d-1-0,2,sv+2,Math.max(1,sh));P.hb(-d,2,sv+2,Math.max(1,sh));};
G[')']=P=>{G['('](P);const bb=G._h.bbox(P);mirrorBox(P,bb.x1,-K0(P),P.K.H+P.K.D);};
const K0=P=>P.K.D;
G['[']=P=>{const {K,B}=P,{H,sv,sh}=K,d=K.D;P.vs(0,-d,H+d-0);P.hb(H+d-sh,sv,sv+2);P.hb(-d,sv,sv+2);};
G[']']=P=>{G['['](P);const bb=G._h.bbox(P);mirrorBox(P,bb.x1,-P.K.D,P.K.H+P.K.D);};
G['{']=null;G['}']=null;
G['/']=P=>{const {K,B}=P,{H,sv}=K,d=Math.round(K.D*0.5),W=Math.max(3,Math.round(K.Wc*0.8));P.dg(W-sv/2,H+d,sv/2,-d,sv);};
G['\\']=P=>{G['/'](P);mirrorBox(P,Math.max(3,Math.round(P.K.Wc*0.8)),-P.K.D,P.K.H+P.K.D);};
G['|']=P=>{const {K,B}=P,{H,sv}=K,d=K.D;P.vs(0,-d,H+d-0);};
G['•']=P=>{const {K,B}=P,{H,sv}=K,d=Math.max(2,sv+1);B.rect(0,Math.round(H*0.4)-0,d,Math.round(H*0.4)+d,2);};
G['·']=null;
G['°']=P=>{const {K,B}=P,{H,sv,sh}=K,d=Math.max(3,Math.round(H*0.3));P.ring(0,H-d,d,H,{tv:1,th:1});};
G['_']=P=>{const {K,B}=P,{sh}=K;P.hb(-K.D,0,Math.max(5,K.Wc),sh);};
G['~']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(5,Math.round(K.Wc*0.9)),y=Math.round(H*0.4);const q=Math.floor(W/3);B.rect(0,y,q,y+sh+1,1);B.rect(q,y+1,W-q,y+1+sh,1);B.rect(W-q,y,W,y+sh+1,1);B.clear(0,y+sh,q,y+sh+1);B.clear(W-q,y+sh,W,y+sh+1);B.clear(0,y,0,y);};
G['^']=P=>{const {K,B}=P,{H,sv}=K;const n=Math.max(2,Math.round(H*0.2));for(let k=0;k<n;k++){B.rect(n-1-k,H-1-n+1+k-0,n-k+sv-1,H-n+k+0,1);B.rect(n-1+k,H-n+k,n+k+sv-1,H-n+k+1,1);}};
G['`']=P=>{const {K,B}=P,{H,sv}=K;const n=Math.max(2,Math.round(H*0.18));for(let k=0;k<n;k++)B.rect(k,H-1-k,k+Math.max(1,sv-0),H-k,1);};
G['+']=P=>{const {K,B}=P,{H,sv,sh}=K;let W=Math.max(5,Math.round(K.Wc*0.8));if((W-sv)&1)W++;const y=Math.round(H*0.4);P.hb(y,0,W);P.vs((W-sv)/2,y-Math.floor((W-sh)/2)+sh-1+0,y+Math.ceil((W+sh)/2)-1);};
G['=']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(5,Math.round(K.Wc*0.8)),y=Math.round(H*0.4);P.hb(y+sh+1,0,W);P.hb(y-sh-0,0,W);};
G['×']=P=>{const {K,B}=P,{H,sv,sh}=K,n=Math.max(3,Math.round(H*0.4));const W=n+sv-1;const y=Math.round(H*0.4)-Math.floor(n/2);P.dg(sv/2,y,n+sv/2-1,y+n,sv);P.dg(sv/2,y+n,n+sv/2-1,y,sv);};
G['<']=P=>{const {K,B}=P,{H,sv,sh}=K,n=Math.max(3,Math.round(H*0.3)),y=Math.round(H*0.5);P.dg(n+sv/2,y+n,sv/2+0.0,y,sv);P.dg(sv/2,y,n+sv/2,y-n,sv);};
G['>']=P=>{G['<'](P);const n=Math.max(3,Math.round(P.K.H*0.3));mirrorBox(P,n+P.K.sv,-P.K.D,P.K.H+P.K.D);};
G['*']=P=>{const {K,B}=P,{H,sv,sh}=K,d=Math.max(3,Math.round(H*0.3)|1),y=H-d;const c=(d-1)>>1;P.vs(c,y,y+d,1);B.rect(0,y+c,d,y+c+1,1);B.s(0,y,1);B.s(d-1,y,1);B.s(0,y+d-1,1);B.s(d-1,y+d-1,1);B.clear(c,y,c+1,y);};
G['#']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(7,K.Wc+1),a=Math.round(W/3),b=W-a-1;P.vs(a-1,0,H,1+(sv>2?1:0));P.vs(b,0,H,1+(sv>2?1:0));P.hb(Math.round(H*0.62),0,W,1+(sh>2?1:0));P.hb(Math.round(H*0.28),0,W,1+(sh>2?1:0));};
G['%']=P=>{const {K,B}=P,{H,sv,sh}=K,d=Math.max(3,Math.round(H*0.34)),wd=Math.max(1,sv-1);
  let W=Math.max(2*d+2,K.Wc+2);
  for(;W<Math.max(2*d+2,K.Wc+2)+10;W++){/* the stroke must stay clear of both rings by an empty column/row */
    const B2=new PXE.Bm(K),P2=PXE.prims(K,B2);P2.dg(W-1-0.5,H,0.5,0,wd);let ok=true;
    for(const [x,y] of B2.cells()){if((x<=d&&y>=H-d-1)||(x>=W-d-1&&y<=d)){ok=false;break;}}
    if(ok)break;}
  P.ring(0,H-d,d,H,{tv:1,th:1});P.ring(W-d,0,W,d,{tv:1,th:1});P.dg(W-1-0.5,H,0.5,0,wd);};
G['&']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc+3,ym=Math.round(H*0.56);P.ring(1,ym,W-2,H);P.ring(0,0,W-1,ym+sh);
  B.clear(W-1-sv,sh,W-1,ym);P.dg(W-sv/2,0,sv,ym+sh,sv);};
G['@']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.round(K.Wc*1.3),o=Math.round(K.D*0.4);P.ring(0,-o,W,H);const w2=Math.max(3,W-2*sv-2),y0=Math.round(H*0.3),h2=Math.max(3,Math.round(H*0.4));P.ring(W-sv-w2,y0,W-sv,y0+h2,{tv:Math.max(1,sv-1),th:1});B.clear(Math.round(W*0.5),-o,W,-o+sh);B.rect(W-sv,y0,W,y0+h2);};
G['$']=P=>{const {K,B}=P;G.S(P);const bb=G._h.bbox(P);const x=Math.floor((bb.x1-bb.x0-1)/2);B.rect(x,-1,x+1,0,1);B.rect(x,K.H,x+1,K.H+1,1);if(K.sv>=2){B.rect(x+1,-1,x+2,0,1);B.rect(x+1,K.H,x+2,K.H+1,1);}};
G['€']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc+1,t=tl(K,0.2);const y1=Math.round(H*0.6),y2=Math.round(H*0.3);
  P.ring(1,0,W,H);B.clear(W-sv,Math.min(sh+t,y2-1),W,Math.max(H-sh-t,y1+sh+1));P.hb(y1,0,W-1);P.hb(y2,0,W-1);};
G['₽']=P=>{const {K,B}=P,{H,sv,sh}=K;G.P(P);P.hb(Math.round(H*0.28),0,Math.max(sv+3,Math.round(K.Wc*0.8)));};
G['№']=P=>{const {K,B}=P,{H,sv,sh}=K;const Wn=Math.max(K.Wc,2*sv+3);P.vs(0,0,H);P.vs(Wn-sv,0,H);P.dg(sv/2,H,Wn-sv/2,0,sv);const o=Wn+2,d=Math.round(H*0.5);P.ring(o,H-d-0,o+Math.max(4,Math.round(Wn*0.7)),H-0,{r:1});};
G['«']=P=>{const {K,B}=P,{H,sv,sh}=K,n=Math.max(2,Math.round(H*0.18)),y=Math.round(H*0.4);for(const o of [0,Math.max(sv,2)+2]){P.dg(o+n+sv/2-0.5,y+n,o+sv/2,y,Math.max(1,sv-0));P.dg(o+sv/2,y,o+n+sv/2-0.5,y-n,Math.max(1,sv-0));}};
G['»']=P=>{G['«'](P);const n=Math.max(2,Math.round(P.K.H*0.18));mirrorBox(P,Math.max(P.K.sv,2)+2+n+P.K.sv,-P.K.D,P.K.H+P.K.D);};
G['‹']=P=>{const {K,B}=P,{H,sv}=K,n=Math.max(2,Math.round(H*0.18)),y=Math.round(H*0.4);P.dg(n+sv/2-0.5,y+n,sv/2,y,sv);P.dg(sv/2,y,n+sv/2-0.5,y-n,sv);};
G['›']=P=>{G['‹'](P);const n=Math.max(2,Math.round(P.K.H*0.18));mirrorBox(P,n+P.K.sv,-P.K.D,P.K.H+P.K.D);};
G['‘']=P=>{const {K,B}=P,{H,sv}=K,d=sv,t=Math.max(1,Math.round(K.D*0.4));B.rect(0,H-d,d,H,2);B.rect(Math.max(1,d-1),H,d,H+t,2);G._q=1;mirrorBox(P,d,H-d,H+t);};
G['’']=P=>{const {K,B}=P,{H,sv}=K,d=sv,t=Math.max(1,Math.round(K.D*0.4));B.rect(0,H-d,d,H,2);B.rect(0,H-d-t,Math.max(1,d-1),H-d,2);};
G['‚']=P=>{const {K,B}=P,d=K.sv,t=Math.max(1,Math.round(K.D*0.5));B.rect(0,0,d,d,2);B.rect(0,-t,Math.max(1,d-1),0,2);};
G['“']=P=>{const {K}=P;G['‘'](P);const bb=G._h.bbox(P);const w=bb.x1-bb.x0;const cells=P.B.cells();for(const [x,y,v] of cells)P.B.s(x+w+1,y,v);};
G['”']=P=>{const {K}=P;G['’'](P);const bb=G._h.bbox(P);const w=bb.x1-bb.x0;const cells=P.B.cells();for(const [x,y,v] of cells)P.B.s(x+w+1,y,v);};
G['„']=P=>{const {K}=P;G['‚'](P);const bb=G._h.bbox(P);const w=bb.x1-bb.x0;const cells=P.B.cells();for(const [x,y,v] of cells)P.B.s(x+w+1,y,v);};
G['…']=P=>{const {K,B}=P,d=K.sv;for(let i=0;i<3;i++)B.rect(i*(d+1),0,i*(d+1)+d,d,2);};
G['¡']=P=>{const {K,B}=P,{H,sv}=K;P.vs(0,0,Math.max(2,H-Math.max(sv+2,Math.round(H*0.28))-sv-1+0));dotP(P,0,H-sv);};
G['¿']=P=>{G['?'](P);const bb=G._h.bbox(P);rot180(P,bb.x1,-0,P.K.H);};
G['⁄']=P=>{const {K,B}=P,{H,sv}=K,W=Math.max(3,Math.round(K.Wc*0.8)),y=Math.round(H*0.05);P.dg(W-sv/2+Math.round(H*0.3),H,sv/2,0,Math.max(1,sv-0));};
G['ª']=P=>{const {K,B}=P;const Q=sub(P,K.X,K.Wn,K.xm);const K2=Object.assign({},K,{X:Math.max(3,Math.round(K.X*0.65)),H:K.H});P.K=K2;};
return G;}
if(typeof module!=='undefined')module.exports=recipes3;
/* character table, marks, composition, serif, cleanup, italic, edits */
function recipes4(PXE,G){
const {CL}=PXE;const {sub,mirrorBox,rot180,flipV,bbox}=G._h;
/* ---- marks ---- */
const MK={};
const mdims=K=>({mh:K.mh,mt:K.mt});
function put(B,x,y,w,v){B.rect(x,y,x+w,y+1,v==null?3:v);}
MK.acute=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++)put(B,cx-Math.floor(mh/2)+k,y+k,mt);};
MK.grave=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++)put(B,cx+Math.floor(mh/2)-k-mt+1,y+k,mt);};
MK.circumflex=(K,B,cx,y,wm)=>{const {mh,mt}=K;const w=wm;for(let k=0;k<mh;k++){const d=mh-1-k;put(B,cx-Math.floor(w/2)+Math.floor(w/2)-d-0,y+k,mt);}
  for(let k=0;k<mh;k++){const d=mh-1-k;put(B,cx+d+ (w%2?0:0),y+k,mt);}};
MK.caron=(K,B,cx,y,wm)=>{const {mh,mt}=K;for(let k=0;k<mh;k++){const d=k;put(B,cx-d,y+k,mt);put(B,cx+d,y+k,mt);}};
MK.macron=(K,B,cx,y,wm)=>{const w=Math.max(3,wm);B.rect(cx-Math.floor(w/2),y,cx-Math.floor(w/2)+w,y+Math.max(1,K.mt>1?2:1),3);};
MK.breve=(K,B,cx,y,wm)=>{const w=Math.max(4,wm),x0=cx-Math.floor(w/2),ew=Math.max(1,Math.min(K.sv>=2?2:1,Math.floor((w-1)/3))),bt=Math.max(1,K.mt),tot=K.H>=12?K.mh+1:K.mh;
  B.rect(x0,y,x0+w,y+bt,3);B.rect(x0,y,x0+ew,y+tot,3);B.rect(x0+w-ew,y,x0+w,y+tot,3);};
MK.tilde=(K,B,cx,y,wm)=>{const mt=K.mt,w=Math.max(4,wm);const x0=cx-Math.floor(w/2);for(let i=0;i<w;i+=1){const up=(i%2===1)?1:0;put(B,x0+i*1,y+(up?1:0),1);}if(mt>1){for(let i=0;i<w;i++){const up=(i%2===1)?1:0;put(B,x0+i,y+(up?1:0)+0,1);}}};
MK.diaeresis=(K,B,cx,y,wm)=>{const d=Math.max(1,K.sv>=3?2:1),g=Math.max(1,wm-2*d);const x0=cx-Math.floor((2*d+g)/2);B.rect(x0,y,x0+d,y+d,3);B.rect(x0+d+g,y,x0+2*d+g,y+d,3);};
MK.dot=(K,B,cx,y,wm)=>{const d=Math.max(1,K.sv>=3?2:(K.sv>=2?2:1));B.rect(cx-Math.floor(d/2),y,cx-Math.floor(d/2)+d,y+d,3);};
MK.ring=(K,B,cx,y,wm)=>{const x0=cx-1;B.rect(x0+1,y,x0+2,y+1,3);B.rect(x0,y+1,x0+1,y+2,3);B.rect(x0+2,y+1,x0+3,y+2,3);B.rect(x0+1,y+2,x0+2,y+3,3);};
MK.dblacute=(K,B,cx,y,wm)=>{MK.acute(K,B,cx-1-Math.floor(K.mt/2),y,wm);MK.acute(K,B,cx+1+K.mh-1,y,wm);};
MK.cedilla=(K,B,cx,y,wm)=>{B.rect(cx,-1,cx+K.mt,0,3);B.rect(cx-1,-2,cx+K.mt-1,-1,3);B.rect(cx,-2,cx+K.mt,-1,3);};
MK.ogonek=(K,B,cx,y,wm)=>{B.rect(cx,-1,cx+K.mt,0,3);B.rect(cx+K.mt,-2,cx+K.mt+1,-1,3);};
/* mark height rows (for ring 3) */
const mhOf=(K,kind)=>kind==='ring'?3:(kind==='dot'||kind==='diaeresis'?Math.max(1,K.sv>=2?2:1):(kind==='macron'?1:K.mh));
const mwOf=(K,kind)=>{const mh=K.mh;switch(kind){case'acute':case'grave':return mh+K.mt-1;case'circumflex':case'caron':return 2*(mh-1)+K.mt;case'macron':return 3+(K.sv>=3?1:0);
  case'breve':return 4;case'tilde':return 4;case'diaeresis':return 2*Math.max(1,K.sv>=3?2:1)+Math.max(1,Math.round(K.sv/2));case'dot':return 1;case'ring':return 3;default:return 3;}};
/* ---- character table ---- */
const T={};/* ch -> {r:recipeKey|fn, h:'cap'|'x', marks:[[kind,pos]], top:'cap'|'x'|'asc'} */
const lat='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for(const c of lat){T[c]={r:c,k:'cap'};}
for(const c of 'abcdefghijklmnopqrstuvwxyz'){T[c]={r:c,k:'xh'};}
for(const c of '0123456789')T[c]={r:c,k:'cap'};
/* Cyrillic twins */
const twins={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','І':'I','Ј':'J','Ѕ':'S','Ү':'Y','а':'a','с':'c','е':'e','о':'o','р':'p','у':'y','х':'x','і':'i','ј':'j','ѕ':'s','һ':'h','ү':'y'};
for(const c in twins)T[c]=T[twins[c]];
for(const c of 'БГДЖЗИЛПУФЦЧШЩЪЫЬЭЮЯЂЉЊЋЏҐҒҚҢӨҰҺӘЄ')T[c]={r:c,k:'cap'};
/* lowercase Cyrillic as small-capital forms at x-height: [recipe, widthKey] */
const low={'в':'B','г':'Г','д':'Д','ж':'Ж','з':'З','и':'И','к':'K','л':'Л','н':'H','п':'П','т':'T','ц':'Ц','ч':'Ч','ш':'Ш','щ':'Щ','ъ':'Ъ','ы':'Ы','ь':'Ь','э':'Э','ю':'Ю','я':'Я'};
for(const c in low)T[c]={r:low[c],k:'xh',small:1};
T['б']={r:'б',k:'xh'};T['ф']={r:'ф',k:'xh'};
T['ђ']={r:'ђ',k:'xh'};T['ћ']={r:'ћ',k:'xh'};T['љ']={r:'љ',k:'xh'};T['њ']={r:'њ',k:'xh'};T['џ']={r:'џ',k:'xh',small:1};
T['ғ']={r:'ғ',k:'xh'};T['қ']={r:'қ',k:'xh'};T['ң']={r:'ң',k:'xh'};T['ө']={r:'ө',k:'xh'};T['ұ']={r:'ұ',k:'xh'};T['ә']={r:'ә',k:'xh'};T['є']={r:'є',k:'xh'};T['ґ']={r:'ґ',k:'xh'};
T['ı']={r:'ı',k:'xh'};T['ß']={r:'ß',k:'cap'};T['Æ']={r:'Æ',k:'cap'};T['æ']={r:'æ',k:'xh'};T['Œ']={r:'Œ',k:'cap'};T['œ']={r:'œ',k:'xh'};
T['Ø']={r:'O',k:'cap',ov:'slash'};T['ø']={r:'o.w',k:'xh',ov:'slash'};T['Ł']={r:'L',k:'cap',ov:'lbar'};T['ł']={r:'l',k:'xh',ov:'lbar'};T['Đ']={r:'D',k:'cap',ov:'dbar'};T['đ']={r:'d',k:'xh',ov:'dbar'};
/* punctuation */
for(const c of '.,:;!?"\'-–—−()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…¡¿⁄ªº‹›·')T[c]={r:c,k:'cap',ns:1};
/* composites: [base, mark] ; position 'top' / 'bot' */
const CM=[
 ['À','A','grave'],['Á','A','acute'],['Â','A','circumflex'],['Ã','A','tilde'],['Ä','A','diaeresis'],['Å','A','ring'],['Ā','A','macron'],['Ă','A','breve'],['Ą','A','ogonek'],
 ['à','a','grave'],['á','a','acute'],['â','a','circumflex'],['ã','a','tilde'],['ä','a','diaeresis'],['å','a','ring'],['ā','a','macron'],['ă','a','breve'],['ą','a','ogonek'],
 ['Ç','C','cedilla'],['Ć','C','acute'],['Č','C','caron'],['ç','c','cedilla'],['ć','c','acute'],['č','c','caron'],
 ['Ď','D','caron'],['ď','d','tick'],['È','E','grave'],['É','E','acute'],['Ê','E','circumflex'],['Ë','E','diaeresis'],['Ē','E','macron'],['Ė','E','dot'],['Ě','E','caron'],['Ę','E','ogonek'],
 ['è','e','grave'],['é','e','acute'],['ê','e','circumflex'],['ë','e','diaeresis'],['ē','e','macron'],['ė','e','dot'],['ě','e','caron'],['ę','e','ogonek'],
 ['Ğ','G','breve'],['ğ','g','breve'],['Ì','I','grave'],['Í','I','acute'],['Î','I','circumflex'],['Ï','I','diaeresis'],['Ī','I','macron'],['İ','I','dot'],['Į','I','ogonek'],
 ['ì','ı','grave'],['í','ı','acute'],['î','ı','circumflex'],['ï','ı','diaeresis'],['ī','ı','macron'],['į','i','ogonek'],
 ['Ñ','N','tilde'],['Ń','N','acute'],['Ň','N','caron'],['ñ','n','tilde'],['ń','n','acute'],['ň','n','caron'],
 ['Ò','O','grave'],['Ó','O','acute'],['Ô','O','circumflex'],['Õ','O','tilde'],['Ö','O','diaeresis'],['Ō','O','macron'],['Ő','O','dblacute'],
 ['ò','o','grave'],['ó','o','acute'],['ô','o','circumflex'],['õ','o','tilde'],['ö','o','diaeresis'],['ō','o','macron'],['ő','o','dblacute'],
 ['Ř','R','caron'],['ř','r','caron'],['Ś','S','acute'],['Ş','S','cedilla'],['Š','S','caron'],['ś','s','acute'],['ş','s','cedilla'],['š','s','caron'],
 ['Ť','T','caron'],['ť','t','tick'],['Ù','U','grave'],['Ú','U','acute'],['Û','U','circumflex'],['Ü','U','diaeresis'],['Ū','U','macron'],['Ů','U','ring'],['Ű','U','dblacute'],
 ['ù','u','grave'],['ú','u','acute'],['û','u','circumflex'],['ü','u','diaeresis'],['ū','u','macron'],['ů','u','ring'],['ű','u','dblacute'],
 ['Ý','Y','acute'],['Ÿ','Y','diaeresis'],['ý','y','acute'],['ÿ','y','diaeresis'],['Ź','Z','acute'],['Ż','Z','dot'],['Ž','Z','caron'],['ź','z','acute'],['ż','z','dot'],['ž','z','caron'],
 ['Ё','Е','diaeresis'],['ё','е','diaeresis'],['Й','И','breve'],['й','и','breve'],['Ў','У','breve'],['ў','у','breve'],['Ї','І','diaeresis'],['ї','ı','diaeresis'],
 ['Ѓ','Г','acute'],['ѓ','г','acute'],['Ќ','К','acute'],['ќ','к','acute']];
for(const [c,b,m] of CM)T[c]={base:b,mark:m};
T['Ë']=T['Ё'];T['ë']=T['ё'];
/* ---- render one base recipe into a Bm ---- */
const HC=new Set(['3','?','¿','&','Æ','Đ','D','Ø','G']);
function drawBase(K,spec,B){
  let P=PXE.prims(K,B);const r=spec.r;
  /* тяжёлый вес на малой высоте: у сложных знаков горизонтали не толще (H-3)/4, иначе чаши и просветы схлопываются */
  if(HC.has(r)){const hc=Math.max(1,Math.floor((K.H-3)/4));if(K.sh>hc){const K2=Object.assign({},K,{sh:hc});K2.ym=Math.ceil((K.H-hc)/2);P=PXE.prims(K2,B);}}
  if(spec.small){const Q=sub(P,K.X,K.Wn,K.xm);const f=G[r];if(!f)return false;f(Q);return true;}
  const f=G[r];if(!f)return false;f(P);return true;}
/* overlays */
function overlay(K,B,ov){const bb=B.cells();let x0=1e9,x1=-1e9;for(const [x] of bb){x0=Math.min(x0,x);x1=Math.max(x1,x);}
  const sv=K.sv,sh=Math.min(K.sh,Math.max(1,Math.floor((K.H-3)/4)));
  if(ov==='slash'){let ya=1e9,yb=-1e9;for(const c of bb){ya=Math.min(ya,c[1]);yb=Math.max(yb,c[1]);}const n=yb-ya+1,bw=x1-x0+1,hs=Math.max(1,Math.round(sh/2));
    /* линия идёт из левого нижнего угла просвета в правый верхний и продолжается до краёв знака: просвет всегда делится */
    const hx0=x0+sv,hx1=x1-sv,hy0=ya+sh,hy1=yb-sh,sl=(hx1-hx0)/Math.max(1,hy1-hy0);
    for(let y=ya;y<=yb;y++){const x=CL(Math.round(hx0+(y-hy0)*sl),x0,x1-hs+1);B.rect(x,y,x+hs,y+1,1);}}
  if(ov==='lbar'){const H=K.k!=='cap'?K.A:K.H;const y=Math.round(H*0.45);B.rect(x0-1,y,x1+2,y+sh,1);}
  if(ov==='dbar'){if(K.k!=='cap'){const y=Math.min(K.A-sh,K.X+Math.max(1,Math.round((K.A-K.X)/2)));B.rect(x1-K.sv-1,y,x1+2,y+sh,1);}else{const y=Math.round(K.H*0.5);B.rect(x0-1,y,x1+2,y+sh,1);}}
}
/* число замкнутых просветов (4-связный фон, не касающийся рамки) */
function holesOf(B){const cs=B.cells();if(!cs.length)return 0;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  x0--;y0--;x1++;y1++;const W=x1-x0+1,H=y1-y0+1,m=new Uint8Array(W*H);for(const [x,y] of cs)m[(y-y0)*W+x-x0]=1;let n=0;const seen=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++){if(m[i]||seen[i])continue;let b=false;const st=[i];seen[i]=1;while(st.length){const k=st.pop(),x=k%W,y=(k-x)/W;if(!x||!y||x===W-1||y===H-1)b=true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=W||Y>=H)continue;const j=Y*W+X;if(!m[j]&&!seen[j]){seen[j]=1;st.push(j);}}}
    if(!b)n++;}return n;}
/* число компонент ink (4-связность) */
function compsOf(B){const cs=B.cells();if(!cs.length)return 0;const m=new Set(cs.map(c=>c[0]+','+c[1]));let n=0;
  for(const [x,y] of cs){const k=x+','+y;if(!m.has(k))continue;n++;const st=[[x,y]];m.delete(k);while(st.length){const [a,b]=st.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const q=(a+dx)+','+(b+dy);if(m.has(q)){m.delete(q);st.push([a+dx,b+dy]);}}}}return n;}
/* ---- serif pass: stems with free ends get a foot / flag ---- */
function addSerifs(K,B,isCap){
  const sf=K.sf,sfh=K.sfh||1,sv=K.sv;const cs=B.cells();const g=(x,y)=>B.g(x,y)>0;
  let minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;for(const [x,y] of cs){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}
  /* find vertical runs of width sv-ish: scan columns for runs length>=3 */
  const add=[],grp=[];let cur=null;const gp=(x,y)=>{add.push([x,y]);cur.push([x,y]);};
  for(let x=minx;x<=maxx;x++){let y=miny;while(y<=maxy){if(!g(x,y)){y++;continue;}let y1=y;while(y1<=maxy&&g(x,y1))y1++;
      const len=y1-y;if(len>=Math.max(3,Math.round(K.X*0.5))){
        /* stem columns: measure width of run at mid */
        const ym=Math.floor((y+y1)/2);let xl=x;while(g(xl-1,ym)&&g(xl-1,y)===g(xl,y))xl--;
        if(xl===x){let xr=x;while(g(xr+1,ym))xr++;const w=xr-x+1;
          if(w<=sv+1&&w>=1){
            /* настоящий ствол: конец плоский на всю ширину (иначе это бок чаши с закруглённым углом) */
            const flatEnd=(yy)=>{for(let xx=x;xx<=xr;xx++)if(!g(xx,yy))return false;return true;};
            /* bottom end at baseline: serif both sides */
            const yb=y,yt=y1-1,tall=yt-yb+1>sfh;
            const freeAt=(yy,dir)=>{for(let k=1;k<=sf+1;k++){if(g(x+(dir<0?-k:w-1+k),yy))return false;}return true;};
            const wide=(yy)=>{/* the row at the end is the stem itself */let c=0;for(let xx=x-1;xx<=xr+1;xx++)if(g(xx,yy))c++;return c<=w;};
            if(tall&&yb===0&&wide(yb)&&flatEnd(yb)){if(freeAt(yb,-1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(x-k,yb+r);}if(freeAt(yb,1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(xr+k,yb+r);}}
            if(tall&&(yt===K.X-1||yt===K.H-1)&&wide(yt)&&flatEnd(yt)){if(freeAt(yt,-1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(x-k,yt-r);}if(isCap&&yt===K.H-1&&freeAt(yt,1)){cur=[];grp.push(cur);for(let k=1;k<=sf;k++)for(let r=0;r<sfh;r++)gp(xr+k,yt-r);}}
          }}}
      y=y1;}}
  const h0=holesOf(B),c0=compsOf(B);B.sg=[];for(const gq of grp){for(const [x,y] of gq)B.s(x,y,1);if(holesOf(B)>h0||compsOf(B)>c0)for(const [x,y] of gq)B.c(x,y);else B.sg.push(gq);}
}
/* 4-connectivity: diagonal-only contacts get one extra cell (top-row candidate) so staircases share edges */
function connect(B){const cs=B.cells();const add=[];
  for(const [x,y] of cs){
    if(B.g(x+1,y+1)&&!B.g(x+1,y)&&!B.g(x,y+1))add.push([x,y+1]);
    if(B.g(x+1,y-1)&&!B.g(x+1,y)&&!B.g(x,y-1))add.push([x+1,y]);}
  for(const [x,y] of add)B.s(x,y,1);}
/* orphan removal: value-1 cells without any 8-neighbour */
function orphans(B){for(const [x,y,v] of B.cells()){if(v!==1)continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&B.g(x+dx,y+dy))n++;if(!n)B.c(x,y);}}
/* tick for ď ť (comma-like apostrophe at upper right) */
function tick(K,B,x1,yTop){const t=Math.max(2,Math.round(K.H*0.22));const x=x1+1;B.rect(x,yTop-t,x+K.sv,yTop,3);}
function addMark(K,B,kind,base,k){
  const cs=B.cells();let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const [x,y] of cs){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(kind==='cedilla'||kind==='ogonek'){const cx=kind==='cedilla'?Math.floor((x0+x1)/2):x1-K.mt+1-(kind==='ogonek'?1:0);MK[kind](K,B,cx,0,3);return;}
  if(kind==='tick'){if(base==='t'){tick(K,B,K.sv,y1+1);return;}tick(K,B,x1,(base==='d')?K.A:K.X+Math.round((K.H-K.X)*0.5)+1);return;}
  const cap=k==='cap';let top=cap?K.H:K.X;
  /* tall lowercase (d, t) not accented; dotless forms top = X */
  const mh=mhOf(K,kind);let wm=mwOf(K,kind);
  const bw=x1-x0+1;if(kind==='breve')wm=Math.max(4,Math.round(bw*0.6));/* parity match for symmetric marks */
  if(['circumflex','caron','macron','breve','diaeresis','ring'].includes(kind)){if(((bw-wm)&1)!==0){wm+=1;}}
  const cx=x0+Math.floor((bw-1)/2)+((bw%2===0&&wm%2===0)?0:0);
  const ycur=top+K.gap;
  let cxx=x0+Math.floor(bw/2);
  if(kind==='circumflex'||kind==='caron'){cxx=x0+Math.floor((bw-K.mt)/2);if(((bw-K.mt)&1))cxx=x0+Math.floor((bw-K.mt)/2);}
  if(kind==='acute'||kind==='grave'){cxx=x0+Math.floor((bw-(K.mh+K.mt-1))/2)+Math.floor(K.mh/2);}
  if(kind==='tilde')cxx=x0+Math.floor(bw/2);
  if(kind==='dot')cxx=x0+Math.floor((bw-1)/2);
  if(kind==='ring')cxx=x0+Math.floor((bw-1)/2)+0;
  if(kind==='macron'||kind==='breve'||kind==='diaeresis')cxx=x0+Math.floor(bw/2);
  MK[kind](K,B,cxx,ycur,wm);
}
/* ---- main build: returns {cells:[[x,y,v]], minx,maxx} before italic/edit ---- */
function build(ch,K){return buildSpec(T[ch],K);}
function buildSpec(spec,K){
  if(!spec)return null;
  const B=new PXE.Bm(K);
  const baseSpec=spec.base?T[spec.base]:spec;
  K.k=baseSpec.k;
  if(!drawBase(K,baseSpec,B))return null;
  if(baseSpec.ov)overlay(K,B,baseSpec.ov);
  if(K.serif&&!baseSpec.ns)addSerifs(K,B,baseSpec.k==='cap');
  connect(B);orphans(B);
  if(spec.mark){addMark(K,B,spec.mark,spec.base,baseSpec.k);connect(B);}
  return B;}
/* Проверка засечек: добавленные клетки (с засечками минус без) — только ряды, примыкающие боком (в том же ряду) к стволу; острова <= 2 клеток недопустимы.
   Возвращает список замечаний. */
function serifAudit(ch,K){const spec=T[ch];if(!spec||spec.mark)return [];const B=buildSpec(spec,K);if(!B)return [];const o=[];
  for(const gq of (K.serif?(B.sg||[]):[])){const S=new Set(gq.map(c=>c[0]+','+c[1]));
    /* каждый ряд группы: пробег клеток засечки упирается боком (в том же ряду) в ствол, не входящий в группу */
    for(const [x,y] of gq){let ok=false;for(const d of [-1,1]){let xx=x;while(S.has((xx+d)+','+y))xx+=d;if(B.g(xx+d,y)&&!S.has((xx+d)+','+y)){ok=true;break;}}
      if(!ok){o.push(ch+': засечка без бокового касания ('+x+','+y+')');break;}}
    if(gq.length<=2&&gq.length<K.sf*(K.sfh||1))o.push(ch+': короткая засечка');}
  if(PXE.islands(B.cells())&&!/[.,:;!?¡¿"'‘’‚“”„…·•°ªº]/.test(ch)&&!spec.base)o.push(ch+': остров <= 2 клеток');
  return o;}
return {T,build,buildSpec,MK,mhOf,serifAudit};}
if(typeof module!=='undefined')module.exports=recipes4;
function recipes5(PXE,G,T){
const {CL}=PXE;const {sub,mirrorBox,rot180,flipV,bbox,capW,tl}=G._h;
G['б']=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,1,1,0]});P.vs(0,0,A);P.hb(A-sh,sv,Math.max(sv+2,W-1));};
G['ф']=P=>{const {K,B}=P,{X,sv,sh,A,D}=K,W=Math.max(K.Wn+2,3*sv+2);let w=W;if((w-sv)&1)w++;P.ring(0,0,w,X);P.vs((w-sv)/2,-D,A);};
G['ђ']=P=>{const {K,B}=P,{X,sv,sh,A,D}=K,W=K.Wn;G.n(P);P.vs(0,X,A);P.hb(A-sh-1,-1,sv+2+0,sh);const fd=Math.max(1,Math.round(D*0.5));P.vs(W-sv,-fd,sh);P.hb(-fd,W-sv-1,W-0,sh);};
G['ћ']=P=>{const {K,B}=P,{X,sv,sh,A}=K;G.h(P);P.hb(A-sh-1,-1,sv+2,sh);};
G['Ђ']=P=>{const {K,B}=P,{H,sv,sh,D}=K,W=K.Wc,yb=Math.round(H*0.56);P.hb(H-sh,0,W);P.vs(0,0,H);P.ring(0,0,W,yb,{cm:[0,1,0,0]});B.clear(sv,0,W-sv,sh);P.vs(W-sv,-Math.max(1,Math.round(D*0.5)),yb);};
G['Ћ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,yb=Math.round(H*0.56);P.hb(H-sh,0,W);P.vs(0,0,H);P.ring(0,0,W,yb,{cm:[0,1,0,0]});B.clear(sv,0,W-sv,sh);};
G['ә']=P=>{const {K,B}=P;G.e(P);rot180(P,K.Wn,0,K.X);};
G['Ә']=P=>{const {K,B}=P;const Q=sub(P,K.H,K.Wc,K.ym);const s=Object.assign({},Q.K);G.e(Object.assign({},P,{K:Object.assign({},K,{X:K.H,Wn:K.Wc,xm:K.ym})}));rot180(P,K.Wc,0,K.H);};
const thin5=(P,patch)=>PXE.prims(Object.assign({},P.K,patch),P.B);
G['æ']=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin5(P,{sh});const Wa=Math.max(W,2*sv+3);
  const xa=Math.max(sh+1,Math.min(X-2*sh-1,Math.floor((X-sh)*0.52))),xe=Math.ceil((X-sh)/2);
  Q.ring(0,0,Wa,xa+sh,{cm:[0,0,0,1]});Q.vs(Wa-sv,0,X);Q.hb(X-sh,0,Wa);
  const o=Wa-sv;Q.ring(o,0,o+W,X);Q.hb(xe,o+sv,o+W-sv);B.clear(o+W-sv,Math.max(sh,Math.min(sh+1,xe-1)),o+W,xe);};
G['œ']=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin5(P,{sh}),xe=Math.ceil((X-sh)/2);
  Q.ring(0,0,W,X,{cm:[1,0,0,1]});const o=W-sv;Q.ring(o,0,o+W,X,{cm:[0,1,1,0]});Q.hb(xe,o+sv,o+W-sv);B.clear(o+W-sv,Math.max(sh,Math.min(sh+1,xe-1)),o+W,xe);B.clear(o,sh,o+sv,X-sh);Q.vs(o,0,X);};
G['Œ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H,{cm:[1,0,0,1]});const o=W-sv;P.vs(o,0,H);P.hb(0,o,o+W-1);P.hb(H-sh,o,o+W-1);P.hb(K.ym,o,o+W-2);};
G['Æ']=P=>{const {K,B}=P,{H,sv,sh}=K,Wa=Math.round(K.Wc*0.95);
  if(H<=7){/* на малой высоте у А-части нет места под просвет: берём целую А и пристраиваем к её правой ноге полки Е */
    G.A(P);const bb=G._h.bbox(P),x1=bb.x1,e=Math.max(sv+2,Math.round(K.Wc*0.7));const rr=y=>{let m=-1e9;for(let x=bb.x0;x<x1;x++)if(B.g(x,y))m=x;return m<-1e8?x1-sv:m+1;};
    const yA=H-sh,yM=K.ym,xe=x1-sv+e;P.hb(0,x1-sv,xe);P.hb(yA,rr(yA),xe);P.hb(yM,rr(yM),x1-sv+Math.max(sv+1,e-1));return;}const S=Math.max(1,Math.round((Wa-sv)/2));
  /* A-like left part: single diagonal to the E stem */
  P.vs(Wa-sv,0,H);P.dg(Wa-sv-0.5,H,sv/2,0,sv);P.hb(Math.round(H*0.3),Math.round(Wa*0.28),Wa);
  const o=Wa;P.hb(0,o,o+Math.max(sv+3,Math.round(K.Wc*0.8)));P.hb(H-sh,o,o+Math.max(sv+3,Math.round(K.Wc*0.8)));P.hb(K.ym,o,o+Math.max(sv+2,Math.round(K.Wc*0.7)));};
G['ª']=P=>{const {K,B}=P;/* small a with underline: built from sub-K */
  const s=Math.max(4,Math.round(K.H*0.5));const sv2=Math.max(1,Math.round(K.sv*0.7)),sh2=1;const K2=Object.assign({},K,{X:s,sv:sv2,sh:sh2,Wn:Math.max(2*sv2+2,Math.round(K.Wn*0.8)),xm:Math.floor((s-sh2)*0.5)});if(s<7){const Q=Object.assign({},P,{K:K2});Q.ring(0,0,K2.Wn,s,{cm:[1,0,0,1]});Q.vs(K2.Wn-sv2,0,s);}else G.a(Object.assign({},P,{K:K2}));
  const cs=B.cells();const dy=K.H-s;const t=cs.map(c=>c.slice());B.clear(-3,0,40,K.H+2);for(const [x,y,v] of t)B.s(x,y+dy,v);
  B.rect(0,dy-2,K2.Wn,dy-2+1,1);};
G['º']=P=>{const {K,B}=P;const s=Math.max(4,Math.round(K.H*0.5));const K2=Object.assign({},K,{X:s,Wn:Math.max(2*K.sv+1,Math.round(K.Wn*0.8))});G.o(Object.assign({},P,{K:K2}));
  const cs=B.cells();const dy=K.H-s;const t=cs.map(c=>c.slice());B.clear(-3,0,40,K.H+2);for(const [x,y,v] of t)B.s(x,y+dy,v);B.rect(0,dy-2,K2.Wn,dy-1,1);};
G['{']=P=>{const {K,B}=P,{H,sv,sh,D}=K,y0=-D,y1=H+D-1,ym=Math.round((y0+y1)/2);P.vs(2,ym+1,y1,sv);P.vs(2,y0+1,ym-0,sv);P.hb(y1-sh+1,3,sv+3,1);P.hb(y0,3,sv+3,1);P.hb(ym,0,3,1);};
G['}']=P=>{G['{'](P);const bb=bbox(P);mirrorBox(P,bb.x1,-P.K.D,P.K.H+P.K.D);};
/* CS68: © — круг-кольцо на высоту прописной и внутри клеточная «С» (кольцо с разрывом справа); при малом разрешении вместо С — одна клетка */
G['©']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(H,K.Wc+2);P.ring(0,0,W,H,{cm:[1,1,1,1]});
  const x0=sv+1,x1=W-sv-1,y0=sh+1,y1=H-sh-1;
  if(x1-x0>=3&&y1-y0>=3){P.ring(x0,y0,x1,y1,{tv:1,th:1});const ym=Math.round((y0+y1)/2);B.clear(x1-1,ym-(y1-y0>=5?1:0),x1,ym+1);}
  else{const cx=Math.floor(W/2),cy=Math.floor(H/2);B.rect(cx,cy,cx+1,cy+1,1);}};
G['·']=P=>{const {K,B}=P;B.rect(0,Math.round(K.H*0.4),K.sv,Math.round(K.H*0.4)+K.sv,2);};
/* ---- PX2: Л л (own width, leg reaches the baseline, top bar), м m (small-cap М), v w x y, breve ---- */
const lleg=(K)=>{const {H,sv,sh}=K;const lw=sv,g=sv>=4?2:1,S=Math.max(2,Math.round(H*0.3));return {lw,g,S,W:sv+g+lw+S};};
G['Л']=P=>{const {K,B}=P,{H,sv,sh}=K;const {lw,g,S,W}=lleg(K);
  P.vs(W-sv,0,H);P.hb(H-sh,Math.max(0,S-1),W);
  const top=H-sh-1,e=y=>Math.round(S*(1-Math.pow(1-y/Math.max(1,top),1.7)));
  for(let y=0;y<=top;y++){const x0=e(y),x1=Math.max(x0+lw,y<top?e(y+1)+1:0);B.rect(x0,y,Math.min(x1,W-sv-1),y+1);}
  B.rect(S,top,S+lw,H-sh);};
G.m=P=>{const {K,B}=P;G.M(sub(P,K.X,K.Wn+1,K.xm));};
G['m.ss01']=P=>{const {K,B}=P,{X,sv,sh}=K;let w1=K.Wn;const W=2*w1-sv;P.ring(0,0,w1,X,{cm:[0,1,0,0]});P.ring(w1-sv,0,W,X,{cm:[0,1,0,0]});B.clear(sv,0,w1-sv,sh);B.clear(w1,0,W-sv,sh);};
G.w=P=>{const {K,B}=P;G.W(sub(P,K.X,K.Wn+1,K.xm));};
G.y=P=>{const {K,B}=P,{X,sv,sh,D}=K;const W=Math.max(K.Wn+1,2*sv+2),dl=PXE.dlw(sv,(W-sv)/2,X);
  const cx=Math.floor((W-dl)/2);
  for(let y=0;y<X;y++){const t=(X-1-y)/Math.max(1,X-1);B.rect(Math.round(cx*t),y,Math.round(cx*t)+dl,y+1);}
  const xr=W-dl,xd=Math.max(0,cx-Math.round(cx*D/Math.max(1,X-1)));
  for(let y=-D;y<X;y++){const t=(X-1-y)/Math.max(1,X-1+D);const x0=Math.round(xr+(xd-xr)*t);B.rect(x0,y,x0+dl,y+1);}};
/* table updates */
T['м']=T['m']={r:'m',k:'xh'};T['є']={r:'Є',k:'xh',small:1};T['ґ']={r:'Ґ',k:'xh',small:1};T['ө']={r:'Ө',k:'xh',small:1};T['ғ']={r:'Ғ',k:'xh',small:1};T['қ']={r:'Қ',k:'xh',small:1};T['ң']={r:'Ң',k:'xh',small:1};T['ұ']={r:'Ұ',k:'xh',small:1};
T['џ']={r:'Џ',k:'xh',small:1};T['љ']={r:'Љ',k:'xh',small:1};T['њ']={r:'Њ',k:'xh',small:1};T['ә']={r:'ә',k:'xh'};T['Ә']={r:'Ә',k:'cap'};
T['Ђ']={r:'Ђ',k:'cap'};T['Ћ']={r:'Ћ',k:'cap'};T['Һ']={r:'h',k:'cap',hcap:1};
T['©']={r:'©',k:'cap',ns:1};T['ª']={r:'ª',k:'cap'};T['º']={r:'º',k:'cap'};T['‹']={r:'‹',k:'cap'};T['›']={r:'›',k:'cap'};
return G;}
if(typeof module!=='undefined')module.exports=recipes5;
/* ---- cells -> contours (pure; nodes {x,y,a,b}) ---- */
const PXR=(function(){
const KAP=0.5523;
const nd=(x,y)=>({x,y,a:null,b:null});
function rectNodes(x0,y0,x1,y1){return [nd(x0,y0),nd(x1,y0),nd(x1,y1),nd(x0,y1)];}
function roundRectNodes(x0,y0,x1,y1,r){r=Math.min(r,(x1-x0)/2,(y1-y0)/2);if(r<0.5)return rectNodes(x0,y0,x1,y1);const k=r*(1-KAP);
  /* counter-clockwise starting bottom-left after the corner */
  return [{x:x0+r,y:y0,a:{x:x0+k,y:y0},b:null},{x:x1-r,y:y0,a:null,b:{x:x1-k,y:y0}},
    {x:x1,y:y0+r,a:{x:x1,y:y0+k},b:null},{x:x1,y:y1-r,a:null,b:{x:x1,y:y1-k}},
    {x:x1-r,y:y1,a:{x:x1-k,y:y1},b:null},{x:x0+r,y:y1,a:null,b:{x:x0+k,y:y1}},
    {x:x0,y:y1-r,a:{x:x0,y:y1-k},b:null},{x:x0,y:y0+r,a:null,b:{x:x0,y:y0+k}}];}
function circleNodes(cx,cy,r){const k=r*KAP;return [{x:cx+r,y:cy,a:{x:cx+r,y:cy-k},b:{x:cx+r,y:cy+k}},{x:cx,y:cy+r,a:{x:cx+k,y:cy+r},b:{x:cx-k,y:cy+r}},
  {x:cx-r,y:cy,a:{x:cx-r,y:cy+k},b:{x:cx-r,y:cy-k}},{x:cx,y:cy-r,a:{x:cx-k,y:cy-r},b:{x:cx+k,y:cy-r}}];}
function diamondNodes(cx,cy,r){return [nd(cx+r,cy),nd(cx,cy+r),nd(cx-r,cy),nd(cx,cy-r)];}
/* union of axis-aligned rects -> loops of points [[x,y]...] (outer CCW, holes CW), diagonal touches are kept as separate loops */
function unionRects(rects){
  const xs=[...new Set(rects.flatMap(r=>[r[0],r[2]]))].sort((a,b)=>a-b),ys=[...new Set(rects.flatMap(r=>[r[1],r[3]]))].sort((a,b)=>a-b);
  const nx=xs.length-1,ny=ys.length-1;if(nx<1||ny<1)return [];
  const xi=new Map(xs.map((v,i)=>[v,i])),yi=new Map(ys.map((v,i)=>[v,i]));
  const F=new Uint8Array(nx*ny);
  for(const [x0,y0,x1,y1] of rects){for(let j=yi.get(y0);j<yi.get(y1);j++)for(let i=xi.get(x0);i<xi.get(x1);i++)F[j*nx+i]=1;}
  const f=(i,j)=>i>=0&&j>=0&&i<nx&&j<ny&&F[j*nx+i]===1;
  /* directed edges with the inside on the left (CCW outer) */
  const E=new Map();const key=(i,j)=>i*(ny+2)+j;
  const add=(a,b)=>{const k=key(a[0],a[1]);(E.get(k)||E.set(k,[]).get(k)).push(b);};
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){if(!F[j*nx+i])continue;
    if(!f(i,j-1))add([i,j],[i+1,j]);          /* bottom edge, going right */
    if(!f(i+1,j))add([i+1,j],[i+1,j+1]);      /* right edge, going up */
    if(!f(i,j+1))add([i+1,j+1],[i,j+1]);      /* top edge, going left */
    if(!f(i-1,j))add([i,j+1],[i,j]);}         /* left edge, going down */
  const loops=[];
  while(E.size){const k0=E.keys().next().value;const arr0=E.get(k0);const i0=Math.floor(k0/(ny+2)),j0=k0%(ny+2);let a=[i0,j0],b=arr0.shift();if(!arr0.length)E.delete(k0);
    const L=[a];let prev=a,cur=b,guard=0;
    while(!(cur[0]===L[0][0]&&cur[1]===L[0][1])&&guard++<100000){L.push(cur);const kk=key(cur[0],cur[1]);const out=E.get(kk);if(!out)break;
      /* choose the turn: prefer left turn (keeps diagonal touches as separate pieces) */
      const dx=cur[0]-prev[0],dy=cur[1]-prev[1];let bi=0,bs=-9;
      for(let t=0;t<out.length;t++){const ex=out[t][0]-cur[0],ey=out[t][1]-cur[1];const ex1=Math.sign(ex),ey1=Math.sign(ey);const cr=Math.sign(dx)*ey1-Math.sign(dy)*ex1;/* >0 left turn */const sc=cr>0?2:cr===0?1:0;if(sc>bs){bs=sc;bi=t;}}
      const nx2=out.splice(bi,1)[0];if(!out.length)E.delete(kk);prev=cur;cur=nx2;}
    loops.push(L.map(p=>[xs[p[0]],ys[p[1]]]));}
  return loops;}
/* drop collinear points */
function simplify(P){const o=[];const n=P.length;for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])!==0)o.push(b);}return o;}
function loopNodes(P,r){/* P polygon (rectilinear); round convex corners with radius r */
  P=simplify(P);const n=P.length;let area=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1];}const ccw=area>0;
  if(!(r>0.5))return P.map(p=>nd(p[0],p[1]));
  const out=[];
  for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);const convex=cross>0;
    if(!convex){out.push(nd(b[0],b[1]));continue;}
    const la=Math.hypot(b[0]-a[0],b[1]-a[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);const rr=Math.min(r,la/2,lc/2);
    const p1=[b[0]+(a[0]-b[0])/la*rr,b[1]+(a[1]-b[1])/la*rr],p2=[b[0]+(c[0]-b[0])/lc*rr,b[1]+(c[1]-b[1])/lc*rr];const k=1-KAP;
    out.push({x:p1[0],y:p1[1],a:null,b:{x:p1[0]+(b[0]-p1[0])*(1-k)*1,y:p1[1]+(b[1]-p1[1])*(1-k)*1}});
    out.push({x:p2[0],y:p2[1],a:{x:p2[0]+(b[0]-p2[0])*(1-k),y:p2[1]+(b[1]-p2[1])*(1-k)},b:null});}
  return out;}
/* main: cells [[x,y]], u (px size), shape 0 square 1 dot 2 rounded 3 diamond, gap (units), stag 0/1/2 */
function render(cells,u,shape,gap,stag){
  const out=[];if(!cells.length)return out;
  const g=Math.max(0,gap),h=u/4;
  const pos=c=>{let x=c[0]*u,y=c[1]*u;if(stag===1){const odd=((c[1]%2)+2)%2;x+=odd?h:-h;}else if(stag===2){const odd=((c[0]%2)+2)%2;y+=odd?h:-h;}return [x,y];};
  const P=cells.map(c=>pos(c));
  const sq=shape===0||shape===2;
  if(sq&&g<0.5){/* merged union */
    const rects=P.map(p=>[p[0],p[1],p[0]+u,p[1]+u]);const loops=unionRects(rects);const r=shape===2?0.3*u:0;
    for(const L of loops){const nodes=loopNodes(L,r);let ar=0;const n=nodes.length;for(let i=0;i<n;i++){const a=nodes[i],b=nodes[(i+1)%n];ar+=a.x*b.y-b.x*a.y;}out.push({nodes,hole:ar<0});}
    return out;}
  const gg=sq?g:Math.max(g,Math.max(2,u*0.04));/* round / diamond: «0» = touching, tiny clearance keeps contours separate */
  const s=u-gg,m=gg/2;
  for(const p of P){const x0=p[0]+m,y0=p[1]+m,x1=x0+s,y1=y0+s;let nodes;
    if(shape===0)nodes=rectNodes(x0,y0,x1,y1);else if(shape===2)nodes=roundRectNodes(x0,y0,x1,y1,0.3*u);
    else if(shape===1)nodes=circleNodes(p[0]+u/2,p[1]+u/2,s/2);else nodes=diamondNodes(p[0]+u/2,p[1]+u/2,s/2+(u-s)*0+0);
    out.push({nodes,hole:false});}
  return out;}
return {render,unionRects,loopNodes};})();
if(typeof module!=='undefined')module.exports=PXR;
/* alternates: pure builders (PXE, recipe table T, maxPw lookup). Each returns a bitmap for a given K (res context) and q (params). */
function altsLib(PXE,PX4,mxPw){
const T=PX4.T;
const CLp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* context for another height, weight capped to what that height can hold */
const ctxH=(Hh,q)=>PXE.ctx(Hh,Math.min(q.pw,mxPw(Math.max(5,Hh),q.pserif)),q.pserif);
const L={};
/* small capitals: capital recipe at x-height + 1 */
L.sc=ch=>(K,q)=>PX4.buildSpec(T[ch],ctxH(K.X+1,q));
/* figures at another height with a vertical offset: returns {build,dy(K)} */
const fig=(d,hf,df)=>({build:(K,q)=>{const H2=hf(K);return PX4.buildSpec(d==='0'?{r:'0p',k:'cap'}:T[d],ctxH(H2,q));},dy:df});/* малые цифры: нуль без черты */
const dd=K=>Math.max(1,Math.round(K.X*0.3));
L.osf=d=>{
  if('0 1 2'.includes(d))return fig(d,K=>K.X,K=>0);
  if(d==='6'||d==='8')return fig(d,K=>K.H,K=>0);
  return fig(d,K=>K.X+dd(K),K=>-dd(K));};
const hs=K=>Math.max(7,Math.round(K.H*0.55));
L.numr=d=>fig(d,hs,K=>K.H-hs(K));
L.dnom=d=>fig(d,hs,K=>0);
L.subs=d=>fig(d,hs,K=>-Math.round(hs(K)*0.3));
L.ss01={
  m:{spec:{r:'m.ss01',k:'xh'}},
  '0':{spec:{r:'0p',k:'cap'}}};/* ss01: гладкий нуль (по умолчанию нуль с чертой) */
/* case forms: same glyph, centred on the capital height (dy computed from the bitmap) */
L.caseList='()[]{}-–—«»‹›•';
return L;}
if(typeof module!=='undefined')module.exports=altsLib;
/* ===== регистрация шрифта «Пиксель» (Pixel Grid) ===== */
recipes1(PXE);recipes2(PXE,PXG);recipes3(PXE,PXG);const PX4=recipes4(PXE,PXG);recipes5(PXE,PXG,PX4.T);
const PXT=PX4.T;
const PXV=FONTS.volt;
const F={id:'pixel',name:'Пиксель',family:'Pixel Grid',tag:'Пиксельная сетка · акциденция',S0:80,GL:{},charset:'extended',
  desc:'Пиксельный шрифт на настоящей сетке: буквы строятся из клеток, а не из контуров. Разрешение (5–24 клеток на высоту прописной), насыщенность в пикселях и форма клетки — квадрат, точка, скруглённый квадрат, ромб — меняются свободно; штрихи, чаши и диагонали пересчитываются по правилам сетки. Есть вариант с пиксельными засечками и кисть для правки клеток.',
  sample:'Пиксель · Pixel 1234'};
F.sampleText='ПОИГРАЙ СО МНОЙ';
/* ---------- параметры ---------- */
const PX_RMIN=6,PX_RMAX=24;
const PXLIM={"5":[0,0],"6":[1,1],"7":[1.5,2],"8":[2,2],"9":[2,2],"10":[2.5,3],"11":[3,3],"12":[3,3],"13":[3,2],"14":[3,2],"15":[3,4],"16":[3.5,4],"17":[4,4.5],"18":[4.5,5],"19":[4,5],"20":[5,5],"21":[5,5],"22":[5,5],"23":[4.5,5],"24":[5,5]};
const PXP=['res','pw','ptr','pshape','pgap','pstag','pserif'];
if(!PARAMS.some(r=>r[0]==='res'))PARAMS.push(
  ['res','Разрешение, клеток на высоту',PX_RMIN,PX_RMAX,1,'Пиксели'],
  ['pw','Насыщенность, px',1,5,0.5,'Пиксели'],
  ['ptr','Просвет между буквами, px',0,4,1,'Пиксели'],
  ['pserif','Засечки',0,1,1,'Пиксели'],
  ['pshape','Форма пикселя',0,3,1,'Пиксельная сетка'],
  ['pgap','Зазор между пикселями, %',0,40,1,'Пиксельная сетка'],
  ['pstag','Сдвиг рядов',0,2,1,'Пиксельная сетка']);
const pxMaxPw=(res,serif)=>{const r=PXLIM[res];return r&&r[serif?1:0]>0?r[serif?1:0]:1;};
const pxSerifOk=res=>{const r=PXLIM[res];return !!r&&r[1]>0;};
const pxU=res=>Math.floor(700/res);
const pxShear=H=>CL(Math.round(H/3),3,6);
const pxRound2=v=>Math.round(v*2)/2;
function pxLim(p){
  const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=CL(+v,lo,hi);};
  cl('res',PX_RMIN,PX_RMAX,12);q.res=Math.round(q.res);
  cl('pserif',0,pxSerifOk(q.res)?1:0,0);q.pserif=q.pserif>0.5?1:0;
  cl('pw',1,pxMaxPw(q.res,q.pserif),1.5);q.pw=pxRound2(q.pw);
  cl('ptr',0,4,1);q.ptr=Math.round(q.ptr);
  cl('pshape',0,3,0);q.pshape=Math.round(q.pshape);
  cl('pgap',0,40,0);q.pgap=Math.round(q.pgap);
  cl('pstag',0,2,0);q.pstag=Math.round(q.pstag);
  const u=pxU(q.res),K=PXE.ctx(q.res,q.pw,q.pserif);
  q.pu=u;q.capH=q.res*u;q.xh=K.X*u;q.asc=K.A*u;q.desc=K.D*u;
  q.stem=K.sv*u;q.hair=K.sh*u;q.sb=0;q.track=q.ptr*u;q.space=Math.max(2,Math.round(K.X*0.5))*u;
  q.wdth=100;q.ov=0;q.slant=(+p.slant>0)?Math.round(Math.atan(1/pxShear(q.res))*1800/Math.PI)/10:0;
  q.opsp=0;q.icomp=0;q.tabular=0;q.mono=0;q.rough=0;q.optic=0;q.diag=1;q.round=1;q.kappa=0.5523;q.innerR=1;q.spur=0;
  for(const r of PARAMS){const k=r[0];if(!(k in L))L[k]=[q[k],q[k]];}
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='pixel')return _pl(p,font);return pxLim(p);};
/* вес семейства: ступени в пикселях; Bold не менее 1.25 x Regular там, где позволяет разрешение */
function pxFam(p,wn){
  const q=pxLim(p).q,r=q.res,mx=pxMaxPw(r,q.pserif);
  /* ровная лестница штриха (stem px): Light/Regular/Bold/Black; Bold >= 1.25 x Regular там, где позволяет разрешение */
  const a=r<=9?[1,1.5,2,2]:r===10?[1,1.5,2,2.5]:r<=15?[1.5,2,2.5,3]:r<=17?[1.5,2.5,3,3.5]:r<=19?[2,2.5,3.5,4]:[2,3,4,5];
  for(let i=0;i<4;i++)a[i]=Math.min(a[i],mx);
  const i=FAM_W.findIndex(w=>w[0]===wn);return a[i<0?1:i];}
WSCALE.pixel=0.58;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='pixel'){const pw=pxFam(p,wn==='@vf'?'Regular':wn),q=pxLim({...p,pw}).q;if(wn==='@vf'){const e=FAM_W.find(x=>x[0]==='@vf');q.pvfw=e?e[1]:400;}return q;}
  return o;};
/* ---------- ячейки ---------- */
const pxCtxC=new Map(),pxBaseC=new Map(),pxOutC=new Map();
function pxCtx(res,pw,serif){const k=res+'|'+pw+'|'+serif;let K=pxCtxC.get(k);if(!K){K=PXE.ctx(res,pw,serif);pxCtxC.set(k,K);}return K;}
const pxKey=(d,q)=>d.px.id+'|'+q.res+'|'+q.pw+'|'+q.pserif;
/* базовые ячейки знака в координатах рецепта: [[x,y,v]] */
function pxBase(d,q){const k=pxKey(d,q);let r=pxBaseC.get(k);
  if(!r){const K=pxCtx(q.res,q.pw,q.pserif);const B=d.px.build(K,q);r=B?B.cells():[];if(pxBaseC.size>6000)pxBaseC.clear();pxBaseC.set(k,r);}
  return r;}
/* клеточный наклон: ряд y сдвигается на floor(y/st); одиночные диагональные стыки достраиваются */
function pxShearCells(cells,st){
  const out=cells.map(c=>[c[0]+Math.floor(c[1]/st),c[1],c[2]]);
  const S=new Set(out.map(c=>c[0]+','+c[1]));const add=[];
  for(const [x,y] of out){if(S.has((x+1)+','+(y+1))&&!S.has((x+1)+','+y)&&!S.has(x+','+(y+1)))add.push([x,y+1,1]);
    if(S.has((x+1)+','+(y-1))&&!S.has((x+1)+','+y)&&!S.has(x+','+(y-1)))add.push([x+1,y,1]);}
  return out.concat(add);}
/* итог: контуры, продвижение; ed — {a:[[x,y]..],d:[[x,y]..]} (клетки рецепта, до наклона) */
function pxBuild(d,q,ed){
  const ek=ed?JSON.stringify(ed):'';
  const key=pxKey(d,q)+'|'+q.slant+'|'+q.ptr+'|'+q.pshape+'|'+q.pgap+'|'+q.pstag+'|'+ek+'|'+(d.px.pad?1:0);
  let r=pxOutC.get(key);if(r)return r;
  const u=q.pu;let cells=pxBase(d,q);
  if(ed&&(ed.a&&ed.a.length||ed.d&&ed.d.length)){
    const m=new Map(cells.map(c=>[c[0]+','+c[1],c]));
    for(const [x,y] of (ed.d||[]))m.delete(x+','+y);
    for(const [x,y] of (ed.a||[]))m.set(x+','+y,[x,y,1]);
    cells=[...m.values()];}
  {const K=pxCtx(q.res,q.pw,q.pserif);let dy=typeof d.px.dy==='function'?d.px.dy(K):(d.px.dy||0);
   if(d.px.center&&cells.length){let a=1e9,b=-1e9;for(const c of cells){if(c[1]<a)a=c[1];if(c[1]>b)b=b<c[1]?c[1]:b;}dy=Math.round(K.H/2-(a+b+1)/2);}
   if(dy)cells=cells.map(c=>[c[0],c[1]+dy,c[2]]);}
  if(q.slant>0)cells=pxShearCells(cells,pxShear(q.res));
  let x0=1e9,x1=-1e9;for(const c of cells){if(c[0]<x0)x0=c[0];if(c[0]>x1)x1=c[0];}
  if(!cells.length){x0=0;x1=-1;}
  let wpx=x1-x0+1,adv=wpx+q.ptr,sh=0;
  if(d.px.pad){const P=d.px.pad(q);if(P>adv){sh=Math.floor((P-adv)/2);adv=P;}}
  const gap=Math.round(u*q.pgap/100);
  const oc=cells.map(c=>[c[0]-x0+sh,c[1],c[2]]);
  const loops=cells.length?PXR.render(oc,u,q.pshape,gap,q.pstag):[];
  const cs=loops.map(l=>mkc(l.nodes,l.hole));
  r={cs,adv:adv*u,w:Math.max(wpx,0)*u,n:cells.length,x0,ox:x0-sh,cells:oc};
  if(pxOutC.size>4000)pxOutC.clear();pxOutC.set(key,r);return r;}
/* ---------- запись знаков ---------- */
const PXCH=[];
function pxAdd(name,spec,k,opt,px){
  const e={shape:g=>pxBuild(e,paramLimits(g.p,'pixel').q,null).cs,w:p=>pxBuild(e,paramLimits(p,'pixel').q,null).w||pxU(paramLimits(p,'pixel').q.res),k:k||'cap',opt:opt||{}};
  e.px=Object.assign({id:name},px||{});
  if(!e.px.build)e.px.build=K=>PX4.buildSpec(spec,K);
  return e;}
/* общие знаки: группы по общей записи T (латиница = кириллица) и по общим знакам Вольта */
const pxUF=new Map();const pxF=c=>{let r=c;while(pxUF.get(r)&&pxUF.get(r)!==r)r=pxUF.get(r);return r;};
const pxU2=(a,b)=>{a=pxF(a);b=pxF(b);if(a!==b)pxUF.set(b,a);};
for(const c of '·©')if(!PXV.CHARSET.includes(c))PXV.CHARSET.push(c);
for(const gr of PXV.GROUPS)if(gr[0]==='Знаки')for(const c of '·©')if(!gr[1].includes(c))gr[1]+=c;
const pxChars=PXV.CHARSET.filter(c=>!/[\s   ]/.test(c)&&PXT[c]);
{const byT=new Map(),byV=new Map();
 for(const c of pxChars){pxUF.set(c,c);}
 for(const c of pxChars){const t=PXT[c],v=PXV.GL[c];if(byT.has(t))pxU2(byT.get(t),c);else byT.set(t,c);if(v){if(byV.has(v))pxU2(byV.get(v),c);else byV.set(v,c);}}}
const pxGrp=new Map();
for(const c of pxChars){const r=pxF(c);let g=pxGrp.get(r);if(!g){g=[];pxGrp.set(r,g);}g.push(c);}
for(const [r,g] of pxGrp){
  g.sort((a,b)=>(a.charCodeAt(0)<128?0:1)-(b.charCodeAt(0)<128?0:1)||a.charCodeAt(0)-b.charCodeAt(0));
  const c0=g[0],spec=PXT[c0];
  const e=pxAdd(c0,spec,spec.k==='xh'?'xh':'cap',{});
  for(const c of g)F.GL[c]=e;}
F.CHARSET=PXV.CHARSET.filter(c=>F.GL[c]||/[\s   ]/.test(c));
F.GROUPS=PXV.GROUPS.map(gr=>[gr[0],gr[1]]);
/* пробелы */
for(const c of [' ',' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '||c===' '?(p=>p.space):(p=>pxThin(p)),k:'cap',opt:{}};
const pxThin=p=>{const q=paramLimits(p,'pixel').q;return Math.max(1,Math.floor(q.space/q.pu/2))*q.pu;};
/* ---------- альтернаты ---------- */
const PXA=altsLib(PXE,PX4,(h,serif)=>pxMaxPw(CL(h,5,PX_RMAX),serif));
const pxAlt=(name,base,feat,k,extra,px,spec)=>{const e=pxAdd(name,spec||null,k,Object.assign({alt:true,base,feat},extra||{}),px);F.GL[name]=e;return e;};
pxAlt('m.ss01','m','ss01','xh',null,null,{r:'m.ss01',k:'xh'});
pxAlt('zero.ss01','0','ss01','cap',null,null,{r:'0p',k:'cap'});
F.ss01Name='Арочная m и гладкий нуль';
for(const ch of PXA.caseList)if(F.GL[ch]&&PXT[ch])pxAlt(otoName(ch)+'.case',ch,'case',F.GL[ch].k,null,{center:true},PXT[ch]);
const PXDIG='0123456789';
const pxDigPad=q=>{let m=0;for(const c of PXDIG)m=Math.max(m,Math.round(pxBuild(F.GL[c],q,null).adv/q.pu));return m;};
for(const c of PXDIG){const n=otoName(c);
  pxAlt(n+'.tf',c,'tnum','cap',{tnum:true,grp:'tf'},{pad:pxDigPad},PXT[c]);
  for(const [kind,feat,grp] of [['osf','onum','osf'],['numr','sups','numr'],['dnom','frac','dnom'],['subs','subs','subs']]){
    const f=PXA[kind](c);pxAlt(n+'.'+kind,c,feat,'cap',{grp},{build:f.build,dy:f.dy,noEdit:true},null);}
  const f2=PXA.osf(c);pxAlt(n+'.tosf',c,'onum','cap',{grp:'tosf'},{build:f2.build,dy:f2.dy,pad:pxDigPad,noEdit:true},null);}
{const ups=F.CHARSET.filter(c=>c.length===1&&/\p{Lu}/u.test(c)&&F.GL[c]&&PXT[c]&&!/[ßǅ]/.test(c));
 for(const U of ups){const lo=U.toLowerCase();const hasLo=lo.length===1&&lo!==U&&F.CHARSET.includes(lo);
  const nm=otoName(hasLo?lo:U)+'.sc';if(F.GL[nm])continue;
  const ot=[['c2sc',U]];if(hasLo)ot.push(['smcp',lo]);
  pxAlt(nm,U,'smcp','cap',{grp:'sc',ot},{build:PXA.sc(U),noEdit:true},null);}}
OTO.IDS.push('pixel');OTO.CFG.pixel={hx:1.08,wx:1.05,dd:1,sbx:0,ssw:1,shw:1};F._otoDone=true;
/* ---------- сборка знака ---------- */
const _fgPx=finalGlyph;
const PXID={f:x=>x,active:false,inv:x=>x};
finalGlyph=function(ch,st,edits,opt){
  if(CUR_FONT!=='pixel')return _fgPx(ch,st,edits,opt);
  const d=GL[ch];if(!d||!d.px){
    if(d&&isSpaceCh(ch)){const q=paramLimits(st.p,'pixel').q;const a=ch===' '||ch===' '?q.space:pxThin(q);return {ch,w:a,weff:a,adv:a,cs:[],fx:PXID,fy:PXID,S:q.stem};}
    return _fgPx(ch,st,edits,opt);}
  let q=paramLimits(st.p,'pixel').q;if(opt&&opt.slant===false&&q.slant)q={...q,slant:0};
  const ed=edGet(edits,ch),pe=ed&&ed.px&&ed.px[q.res]||null;
  const pe2=d.opt&&d.opt.alt&&d.px.noEdit?null:pe;
  if(q.pvfw!=null){const v=PXVF.glyph(d,q,pe2);return {ch,w:v.w,weff:v.w,adv:v.adv,cs:v.cs,fx:PXID,fy:PXID,S:q.stem};}
  const b=pxBuild(d,q,pe2);
  return {ch,w:b.w,weff:b.w,adv:b.adv,cs:b.cs,fx:PXID,fy:PXID,S:q.stem};};
const _bbPx=buildBase;
buildBase=function(ch,p,ed){
  if(CUR_FONT!=='pixel')return _bbPx(ch,p,ed);
  const d=GL[ch];if(!d||!d.px)return _bbPx(ch,p,ed);
  const q=paramLimits(p,'pixel').q;const b=pxBuild(d,q,ed&&ed.px&&ed.px[q.res]||null);
  return {w:b.w,h:q.capH,S:q.stem,cs:b.cs};};
/* ---------- параметры по умолчанию ---------- */
const P0=Object.assign({},PXV.DEFAULTS.regular,{res:12,pw:2,ptr:1,pshape:0,pgap:0,pstag:0,pserif:0,slant:0});
F.DEFAULTS={regular:{...P0},italic:{...P0,slant:18.4}};
F.params={res:['Разрешение, клеток на высоту',PX_RMIN,PX_RMAX,1],pw:['Насыщенность, px',1,5,0.5],ptr:['Просвет между буквами, px',0,4,1],pserif:['Засечки',0,1,1],
  pshape:['Форма пикселя',0,3,1],pgap:['Зазор между пикселями, %',0,40,1],pstag:['Сдвиг рядов',0,2,1]};
for(const r of PARAMS)if(!(r[0] in F.params))F.params[r[0]]=null;
F.methods=[
  ['Разрешение','Сколько клеток укладывается в высоту прописной.',[['Грубое',{res:8}],['Среднее',{res:12}],['Тонкое',{res:16}],['Плотное',{res:24}]]],
  ['Вес','Толщина штриха в пикселях.',[['Светлый',{pw:1.5}],['Обычный',{pw:2}],['Жирный',{pw:3}],['Чёрный',{pw:4}]]],
  ['Форма пикселя','Как выглядит одна клетка.',[['Квадрат',{pshape:0,pgap:0}],['Точка',{pshape:1,pgap:8}],['Скруглённый',{pshape:2,pgap:0}],['Ромб',{pshape:3,pgap:6}]]],
  ['Засечки','Пиксельные засечки на стойках и верхних флажках.',[['Гротеск',{pserif:0}],['С засечками',{pserif:1}]]]];
/* ---------- интерфейс для редактора клеток (ui_pixel_p1.js) ---------- */
F.px={
  info:(ch,p,ed)=>{const q=paramLimits(p,'pixel').q,d=F.GL[ch];if(!d||!d.px)return null;const b=pxBuild(d,q,ed||null);
    return {q,u:q.pu,ox:b.ox,cells:b.cells,st:q.slant>0?pxShear(q.res):0,adv:b.adv,w:b.w};},
  baseHas:(ch,p,x,y)=>{const q=paramLimits(p,'pixel').q,d=F.GL[ch];return !!(d&&d.px&&pxBase(d,q).some(c=>c[0]===x&&c[1]===y));},
  toRecipe:(ch,p,cx,cy)=>{const i=F.px.info(ch,p,null);if(!i)return null;const sx=cx+pxBuild(F.GL[ch],i.q,null).ox;return [sx-(i.st?Math.floor(cy/i.st):0),cy];},
  remap:(ed,r0,r1)=>{const m=([x,y])=>[Math.floor((x+0.5)*r1/r0),Math.floor((y+0.5)*r1/r0)];
    const dd=l=>{const s=new Set(),o=[];for(const c of l||[]){const t=m(c),k=t[0]+','+t[1];if(!s.has(k)){s.add(k);o.push(t);}}return o;};
    const a=dd(ed&&ed.a),d=dd(ed&&ed.d).filter(c=>!a.some(e=>e[0]===c[0]&&e[1]===c[1]));return {a,d};},
  /* проверка засечек и островов (<= 2 клеток, не задуманных точек) для сверки */
  audit:(ch,p)=>{const q=paramLimits(p,'pixel').q;return PXT[ch]?PX4.serifAudit(ch,pxCtx(q.res,q.pw,q.pserif)):[];},
  maxPw:pxMaxPw,serifOk:pxSerifOk,
  fam:p=>{const q=pxLim(p).q;const o=FAM_W.map(w=>{const pw=pxFam(p,w[0]),K=PXE.ctx(q.res,pw,q.pserif);return {name:w[0],pw,sv:K.sv,sh:K.sh};});
    return {res:q.res,serif:q.pserif,max:pxMaxPw(q.res,q.pserif),rows:o,boldK:o[2].pw/o[1].pw,collapsed:o.some((r,i)=>i>0&&r.pw<=o[i-1].pw)};},
  RMIN:PX_RMIN,RMAX:PX_RMAX};
F.sym=false;F.wK=0;F.nodeBudget=0;
/* сверка: поля задаются клеткой (слева 0, справа «Просвет»), стебли — целое число клеток, растровые ступеньки — это и есть шрифт */
F.proof={stem:p=>p.stem,noBar:true,stemSet:'IHНПL',stemFy:[0.3,0.5],hang:true,holeK:0.02};
F.italicAngle=p=>-Math.round((+p.slant||0)*1.135*10)/10;/* FIX-ENGINE: видимый наклон ступеней сетки 15.9° при параметре 14 */
F.spaceNote='Пробел кратен клетке.';
/* топологический эталон для проверок: форма, зазор и сдвиг клетки не меняют число частей и дыр */
F.topoP=p=>Object.assign({},p,{pshape:0,pgap:0,pstag:0});
F.topoPX=p=>pxU(paramLimits(p,'pixel').q.res)/8;
FONTS.pixel=F;
KERN_TABLE.pixel=(KERN_TABLE.volt||[]).slice();
/* кернинг кратен клетке: сжатие округляется к нулю, защитные добавки вверх */
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  /* кернинг считается по сплошной сетке: форма, зазор и сдвиг клетки не должны менять посадку */
  const px=(fontId||CUR_FONT)==='pixel';let st2=st,prof2=prof;
  if(px){st2=Object.assign({},st,{p:F.topoP(st.p)});const pc={};
    prof2=ch=>{if(pc[ch]!==undefined)return pc[ch];const d=GL[ch];if(!d||!d.px)return pc[ch]=prof(ch);const g=finalGlyph(ch,st2,{},{});return pc[ch]=g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;};}
  const o=_ckt(st2,prof2,isLow,fontId);
  if((fontId||CUR_FONT)!=='pixel'||!o)return o;
  const u=paramLimits(st.p,'pixel').q.pu;
  const sn=v=>v<0?-Math.floor(-v/u)*u:Math.ceil(v/u)*u;
  for(const k of Object.keys(o.vals)){const v=sn(o.vals[k]);if(v)o.vals[k]=v;else delete o.vals[k];}
  for(const k of Object.keys(o.pairs)){const v=sn(o.pairs[k]);if(v)o.pairs[k]=v;else delete o.pairs[k];}
  return o;};
for(const id in FONTS)if(id!=='pixel'){const f=FONTS[id];f.params=f.params||{};for(const k of PXP)if(!(k in f.params))f.params[k]=null;}
/* ===== variable weight (wght) for «Пиксель» =====
   Masters must be point-compatible while static weights change the cell topology, so the VF uses ONE topology: the Regular cell map.
   Weight = rectilinear offset of the merged Regular outline; vertex k of every master is vertex k of the same polygon
   (point-compatible by construction, no matcher needed).
   - dx, dy (cells) = static ladder (PXE.ctx sv/sh of Light/Bold/Black) minus Regular, per axis; Black goes a quarter cell further than Bold where the static ladder gives Bold == Black.
   - x: left faces stay, right faces move 2*dx (grid-aligned). y: symmetric growth by dy per face plus a piecewise-linear remap that pins the baseline,
     x-height, cap height, descender and glyph extremes (metrics never drift, vertex order is kept).
   - Static Bold/Black glyphs are wider than the dilated outline (counters keep their width): the missing width E is given to the emptiest columns (cell-rounded),
     so slits do not close and advances match the static family.
   - Per glyph the offset is scaled back (fx, fy) where a counter / stroke would close (clearance EPS cell): every master is a valid simple polygon set;
     outer loops may overlap (diagonal contacts) - nonzero fill renders the union.
   Grid shape: square or rounded (pshape 2) is kept; dot / diamond / gap / stagger are not part of the VF (solid grid is exported). */
const PXVF=(function(){
const EPS=0.34,STEP=0.1;
const cache=new Map();
function simplify(P){const n=P.length,o=[];for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])!==0)o.push(b);}return o;}
const area=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
/* cells -> loops [{P:[[x,y]..] (cell units, material on the left), hole, vx, sy}]; vx = x multiplier (left faces 0, right faces 2: x' = x + vx*dx), sy = outward y sign of the face */
function loopsOf(cells){
  const rects=cells.map(c=>[c[0],c[1],c[0]+1,c[1]+1]);
  const L=PXR.unionRects(rects).map(simplify).filter(P=>P.length>=4);
  return L.map(P=>{const n=P.length,vx=new Array(n),sy=new Array(n);
    for(let i=0;i<n;i++){const a=P[(i+n-1)%n],b=P[i],c=P[(i+1)%n];
      for(const [p,q] of [[a,b],[b,c]]){const ex=q[0]-p[0],ey=q[1]-p[1];
        if(ex===0)vx[i]=ey>0?2:0; /* going up = right-facing face (material on the left) */
        else sy[i]=-Math.sign(ex);}} /* going left = top face (+1), going right = bottom face (-1) */
    return {P,hole:area(P)<0,vx,sy};});}
/* y: symmetric growth (top faces up, bottom faces down by dy) and a piecewise-linear remap that pins lines carrying only top or only bottom faces
   (baseline, x-height, cap height, descender, glyph extremes), so metrics do not drift and every master keeps its vertex order */
function lineSet(K,loops){
  const s=new Set([-K.D,0,K.X,K.H]);let lo=1e9,hi=-1e9;
  for(const L of loops)for(const p of L.P){if(p[1]<lo)lo=p[1];if(p[1]>hi)hi=p[1];}
  s.add(lo);s.add(hi);return {lines:[...s].sort((a,b)=>a-b),lo,hi};}
function anchorsOf(loops,LS,dy){
  const top=new Set(),bot=new Set();
  for(const L of loops){const n=L.P.length;for(let i=0;i<n;i++){const a=L.P[i],b=L.P[(i+1)%n];if(a[1]===b[1])(b[0]<a[0]?top:bot).add(a[1]);}}
  const an=[];
  for(const y of LS.lines){if(y<LS.lo||y>LS.hi)continue;const t=top.has(y),b=bot.has(y);if(t&&!b)an.push([y+dy,y]);else if(b&&!t)an.push([y-dy,y]);}
  an.sort((p,q)=>p[0]-q[0]);
  const o=[];for(const a of an){const l=o[o.length-1];if(!l||(a[0]>l[0]+1e-9&&a[1]>l[1]+1e-9))o.push(a);}
  return o;}
function remap(an,y){
  if(!an.length)return y;
  if(y<=an[0][0])return an[0][1]+(y-an[0][0]);
  for(let i=0;i<an.length-1;i++){const a=an[i],b=an[i+1];if(y<=b[0])return a[1]+(y-a[0])*(b[1]-a[1])/(b[0]-a[0]);}
  const l=an[an.length-1];return l[1]+(y-l[0]);}
function xform(c,dx,dy,S){
  const an=anchorsOf(c.loops,c.LS,dy);
  return c.loops.map(L=>({hole:L.hole,P:L.P.map((p,i)=>[p[0]+L.vx[i]*dx+(S?S(p[0]):0),remap(an,p[1]+L.sy[i]*dy)])}));}
const sdist=(a,b)=>{const dx=Math.max(0,Math.max(Math.min(a[0],a[2]),Math.min(b[0],b[2]))-Math.min(Math.max(a[0],a[2]),Math.max(b[0],b[2]))),
  dy=Math.max(0,Math.max(Math.min(a[1],a[3]),Math.min(b[1],b[3]))-Math.min(Math.max(a[1],a[3]),Math.max(b[1],b[3])));return Math.hypot(dx,dy);};
function edgesOf(loops){const E=[];loops.forEach((L,li)=>{const n=L.P.length;for(let i=0;i<n;i++){const a=L.P[i],b=L.P[(i+1)%n];E.push([a[0],a[1],b[0],b[1],li,i,n,L.hole]);}});return E;}
function baseOf(loops){const E=edgesOf(loops),D=new Float32Array(E.length*E.length);
  for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++)D[i*E.length+j]=sdist(E[i],E[j]);return {E,D};}
/* valid master: every edge keeps its direction and stays >= EPS long; no two non-adjacent edges closer than EPS (outer-outer overlaps are unions; every other contact, also a pinch that already exists, locks the glyph at its Regular shape) */
function validAt(c,dx,dy,why,S){
  const E=edgesOf(xform(c,dx,dy,S)),base=c.base;
  for(let k=0;k<E.length;k++){const e=E[k],o=base.E[k],ux=Math.sign(o[2]-o[0]),uy=Math.sign(o[3]-o[1]);
    const len=(e[2]-e[0])*ux+(e[3]-e[1])*uy;
    if(len<EPS-1e-9){if(why)why.push('edge '+k+' len '+len.toFixed(2)+' at '+o[0]+','+o[1]);return false;}}
  for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){
    const a=E[i],b=E[j];
    if(a[4]===b[4]){const d=Math.abs(i-j);if(d<=1||d===a[6]-1)continue;}
    if(!a[7]&&!b[7]&&a[4]!==b[4])continue;
    if(sdist(a,b)<EPS-1e-9){if(why)why.push('pair '+i+'/'+j+' d '+sdist(a,b).toFixed(2));return false;}}
  return true;}
/* extra width E (cells, integer-rounded cumulative) goes to the emptiest columns (weight = emptiness^2) */
function stretchOf(cells,E){
  if(!(E>0))return null;
  let xa=1e9,xb=-1e9,ya=1e9,yb=-1e9;for(const c of cells){xa=Math.min(xa,c[0]);xb=Math.max(xb,c[0]);ya=Math.min(ya,c[1]);yb=Math.max(yb,c[1]);}
  const n=xb-xa+1,rows=yb-ya+1,cnt=new Array(n).fill(0);for(const c of cells)cnt[c[0]-xa]++;
  const w=cnt.map(k=>{const e=1-k/rows;return e*e;}),tot=w.reduce((a,b)=>a+b,0);
  if(!(tot>0))return null;
  const cum=[0];for(let i=0;i<n;i++)cum.push(cum[i]+E*w[i]/tot);
  const r=cum.map(v=>Math.round(v));
  return x=>r[Math.max(0,Math.min(n,x-xa))];}
function fit(c,Dx,Dy,Ws){
  const Ef=dx=>Math.max(0,Math.min(4,Ws==null?0:Ws-c.W-2*dx));
  const sf=dx=>stretchOf(c.cells,Math.round(Ef(dx)));
  let fx=1;if(Dx!==0)while(fx>1e-9&&!validAt(c,Dx*fx,0,null,sf(Dx*fx)))fx=Math.round((fx-STEP)*1e6)/1e6;
  fx=Math.max(0,fx);
  const dx=Dx*fx,S=sf(dx);
  let fy=1;if(Dy!==0)while(fy>1e-9&&!validAt(c,dx,Dy*fy,null,S))fy=Math.round((fy-STEP)*1e6)/1e6;
  fy=Math.max(0,fy);
  return {dx,dy:Dy*fy,fx,fy,E:Math.round(Ef(dx)),S};}
/* target offsets (cells, per face pair) of master weight w: static ladder minus Regular */
function targets(q,w){
  const ctx=pn=>PXE.ctx(q.res,pxFam(q,pn),q.pserif);
  const R=ctx('Regular'),M={Light:ctx('Light'),Bold:ctx('Bold'),Black:ctx('Black')};
  const d=K=>[(K.sv-R.sv)/2,(K.sh-R.sh)/2];
  let t;
  if(w<400)t=d(M.Light);else if(w===400)t=[0,0];else{
    const b=d(M.Bold),k=d(M.Black);
    /* Black = static Black; where the static ladder gives Bold == Black (low res) Black goes a quarter cell further so the instances stay distinct */
    t=(k[0]===b[0]&&k[1]===b[1])&&w>700?[b[0]+0.25,b[1]+0.25]:(w<=700?b:k);}
  return t;}
function build(d,q,pe){
  const q0=Object.assign({},q,{pshape:0,pgap:0,pstag:0});delete q0.pvfw;
  const b=pxBuild(d,q0,pe),cells=b.cells;
  const key=d.px.id+'|'+q.res+'|'+q.pw+'|'+q.pserif+'|'+q.slant+'|'+q.ptr+'|'+(pe?JSON.stringify(pe):'')+'|'+(d.px.pad?1:0);
  let c=cache.get(key);
  if(!c){let xa=1e9,xb=-1e9;for(const k of cells){xa=Math.min(xa,k[0]);xb=Math.max(xb,k[0]);}
    const K=pxCtx(q.res,q.pw,q.pserif),loops=cells.length?loopsOf(cells):[];
    c={cells,loops,LS:lineSet(K,loops),base:baseOf(loops),W:xb-xa+1,fits:{}};if(cache.size>3000)cache.clear();cache.set(key,c);}
  return {b,c,q0};}
/* VF glyph at master weight q.pvfw: Regular cell map (q.pw = Regular) offset per target; returns {cs,adv,w} */
function glyph(d,q,pe){
  const w=q.pvfw,{b,c,q0}=build(d,q,pe),u=q.pu;
  if(!c.cells.length)return {cs:[],adv:b.adv,w:b.w};
  const wk=w<400?300:w===400?400:w<=700?700:900; /* master weights; the VF only samples the 4 masters */
  let f=c.fits[wk];
  if(!f){
    if(wk===400)f={dx:0,dy:0,E:0,S:null};
    else{const [Dx,Dy]=targets(q,wk),qs=Object.assign({},q0,{pw:pxFam(q,wk===300?'Light':wk===700?'Bold':'Black')});
      f=fit(c,Dx,Dy,pxBuild(d,qs,pe).w/u);}
    c.fits[wk]=f;}
  const T=xform(c,f.dx,f.dy,f.S);
  const cs=T.map(L=>{const P=L.P.map(p=>[p[0]*u,p[1]*u]);
    const nodes=q.pshape===2?PXR.loopNodes(P,0.3*u):simplify(P).map(p=>({x:p[0],y:p[1],a:null,b:null}));
    return mkc(nodes,L.hole);});
  return {cs,adv:b.adv+(2*f.dx+f.E)*u,w:b.w+(2*f.dx+f.E)*u,fit:f};}
return {glyph,build,targets,validAt,EPS};})();
if(typeof VFX_FONT_AXES==='object')VFX_FONT_AXES.pixel=['wght'];
FONTS.pixel.px.vf=PXVF; /* test access */
/* masters (core3v): identical polygons in every master -> trivial point matching; no defect extras (validity is built into the masters) */
{const _vmg=vfMatchGlyph,_vdf=vfDefect;
 vfMatchGlyph=function(masters,coords,def){
  if(CUR_FONT==='pixel'){
    const m0=masters[0];
    if(masters.every(m=>m.length===m0.length&&m.every((c,i)=>c.segs.length===m0[i].segs.length&&!!c.hole===!!m0[i].hole)))
      return {conts:m0.map((c,i)=>masters.map(m=>m[i].segs)),collapsed:0};}
  return _vmg(masters,coords,def);};
 vfDefect=function(g){return CUR_FONT==='pixel'?null:_vdf(g);};}
})();
