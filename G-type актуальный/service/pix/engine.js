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
