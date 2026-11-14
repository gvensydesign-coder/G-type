/* ===== «Кортес» (Kortes): тяжёлая антиква с клиновидными засечками и росчерками R/Я. Части: kortes/k_core.js k_letters.js k_more.js k_r2.js k_ext.js k_extra.js pairs.js tail.js (сборка mk_kortes.sh) ===== */
(function(){
/* «Кортес» (working id `kortes`) — core: geometry kit. Glyph = {pos:[polys], neg:[polys]}; final shape = union(pos) minus union(neg). y up, UPM 1000, cap 700. */
(function(root){'use strict';
const K={};
K.M={upm:1000,cap:700,asc:960,desc:-300,ov:10};
K.DEF={weight:137,contrast:45,sharp:50,swash:60,width:1,apros:8};
K.RANGE={weight:[118,158],contrast:[20,70],sharp:[25,75],swash:[0,100],width:[0.92,1.12],apros:[-20,60]};
const cos=Math.cos,sin=Math.sin,PI=Math.PI,hyp=Math.hypot,abs=Math.abs,min=Math.min,max=Math.max;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
/* ---------- path building (L / C segments sampled to polylines) ---------- */
function cub(p0,p1,p2,p3,n){const o=[];for(let i=1;i<=n;i++){const t=i/n,u=1-t;o.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]);}return o;}
function nfor(p0,p1,p2,p3){const L=hyp(p1[0]-p0[0],p1[1]-p0[1])+hyp(p2[0]-p1[0],p2[1]-p1[1])+hyp(p3[0]-p2[0],p3[1]-p2[1]);return clamp(Math.ceil(L/13),4,60);}
/* pth(start, ['L',x,y] | ['C',x1,y1,x2,y2,x,y] ...) */
function pth(p0,...segs){const o=[p0.slice()];let cur=p0;for(const s of segs){if(s[0]==='L'){cur=[s[1],s[2]];o.push(cur);}else{const p1=[s[1],s[2]],p2=[s[3],s[4]],p3=[s[5],s[6]];for(const q of cub(cur,p1,p2,p3,nfor(cur,p1,p2,p3)))o.push(q);cur=p3;}}return o;}
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
const ccw=p=>area(p)<0?p.slice().reverse():p;
/* rounded box with elliptical corners rad=[tl,tr,br,bl] each number|[rx,ry]; k = handle factor (0.5523 circle; larger = squarer) */
function rr(x0,y0,x1,y1,rad,k){k=k||0.60;const R=rad.map(r=>Array.isArray(r)?r:[r,r]);const [tl,tr,br,bl]=R;
  const w=x1-x0,h=y1-y0;
  const o=[[x0+bl[0],y0]];
  const corner=(from,c1,c2,to)=>{for(const q of cub(from,c1,c2,to,nfor(from,c1,c2,to)))o.push(q);};
  o.push([x1-br[0],y0]);
  if(br[0]>0.5&&br[1]>0.5)corner([x1-br[0],y0],[x1-br[0]+br[0]*k*1.0,y0],[x1,y0+br[1]-br[1]*k],[x1,y0+br[1]]);else o.push([x1,y0]);
  o.push([x1,y1-tr[1]]);
  if(tr[0]>0.5&&tr[1]>0.5)corner([x1,y1-tr[1]],[x1,y1-tr[1]+tr[1]*k],[x1-tr[0]+tr[0]*k,y1],[x1-tr[0],y1]);else o.push([x1,y1]);
  o.push([x0+tl[0],y1]);
  if(tl[0]>0.5&&tl[1]>0.5)corner([x0+tl[0],y1],[x0+tl[0]-tl[0]*k,y1],[x0,y1-tl[1]+tl[1]*k],[x0,y1-tl[1]]);else o.push([x0,y1]);
  o.push([x0,y0+bl[1]]);
  if(bl[0]>0.5&&bl[1]>0.5)corner([x0,y0+bl[1]],[x0,y0+bl[1]-bl[1]*k],[x0+bl[0]-bl[0]*k,y0],[x0+bl[0],y0]);
  return dedupe(o);}
function dedupe(p){const o=[];for(const q of p){const l=o[o.length-1];if(!l||hyp(q[0]-l[0],q[1]-l[1])>0.05)o.push(q);}if(o.length>1&&hyp(o[0][0]-o[o.length-1][0],o[0][1]-o[o.length-1][1])<0.05)o.pop();return o;}
/* lens counter: tips (xt,yt) top and (xb,yb) bottom; leftmost x = xl at mid, rightmost = xr at mid; f = handle length fraction */
function lens(xt,yt,xb,yb,xl,xr,f){f=f||0.30;const d=yt-yb;
  const cl=(xl-0.125*(xt+xb))/0.75,cr=(xr-0.125*(xt+xb))/0.75;
  const L=pth([xt,yt],['C',cl,yt-f*d,cl,yb+f*d,xb,yb]);
  const R=cub([xb,yb],[cr,yb+f*d],[cr,yt-f*d],[xt,yt],26);
  return dedupe(L.concat(R));}
const scyC=(poly,x)=>{const ys=[];const n=poly.length;for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))ys.push(a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]));}return ys.sort((p,q)=>p-q);};
function safeLens(c,outer,xt,yt,xb,yb,xl,xr,f,m){m=m==null?Math.max(c.h*0.75,16):m;const a=scyC(outer,xt),b=scyC(outer,xb);if(a.length)yt=Math.min(yt,a[a.length-1]-m);if(b.length)yb=Math.max(yb,b[0]+m);return lens(xt,yt,xb,yb,xl,xr,f);}
const circ=(cx,cy,r,n)=>{n=n||30;const o=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n;o.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return o;};
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const quad=(a,b,c,d)=>[a,b,c,d];
const dia=(cx,cy,rx,ry)=>[[cx,cy-ry],[cx+rx,cy],[cx,cy+ry],[cx-rx,cy]];
/* nib stroke: centreline pts, elliptical nib half axes a (along theta), b; returns closed polygon */
function nib(pts,a,b,th){const n=pts.length,Lp=[],Rp=[];const c=cos(th),s=sin(th);
  for(let i=0;i<n;i++){const p0=pts[max(0,i-1)],p1=pts[min(n-1,i+1)];let tx=p1[0]-p0[0],ty=p1[1]-p0[1];const l=hyp(tx,ty)||1;tx/=l;ty/=l;
    const nx=-ty,ny=tx;const u0=c*nx+s*ny,u1=-s*nx+c*ny;const d=Math.sqrt(a*a*u0*u0+b*b*u1*u1)||1;const sx=a*a*u0/d,sy=b*b*u1/d;
    const wx=c*sx-s*sy,wy=s*sx+c*sy;Lp.push([pts[i][0]+wx,pts[i][1]+wy]);Rp.push([pts[i][0]-wx,pts[i][1]-wy]);}
  return Lp.concat(Rp.reverse());}
/* swept nib: union of convex hulls of consecutive nib ellipses (never self-intersects; used instead of the offset polygon) */
function hull(pts){pts=pts.slice().sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[];for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}const up=[];for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}lo.pop();up.pop();return lo.concat(up);}
function sweep(pts,a,b,th){const c=cos(th),s=sin(th);const E=[];const ell=(p)=>{const o=[];for(let i=0;i<28;i++){const t=2*PI*i/28,x=a*cos(t),y=b*sin(t);o.push([p[0]+c*x-s*y,p[1]+s*x+c*y]);}return o;};
  for(const p of pts)E.push(ell(p));const out=[];for(let i=0;i+1<pts.length;i++)out.push(hull(E[i].concat(E[i+1])));return out;}
/* tapered blade along centreline pts with width profile wf(t) (full width) ; t in 0..1 */
function blade(pts,wf){const n=pts.length,Lp=[],Rp=[];let tot=0;const cum=[0];for(let i=1;i<n;i++){tot+=hyp(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);cum.push(tot);}
  for(let i=0;i<n;i++){const p0=pts[max(0,i-1)],p1=pts[min(n-1,i+1)];let tx=p1[0]-p0[0],ty=p1[1]-p0[1];const l=hyp(tx,ty)||1;tx/=l;ty/=l;const w=wf(cum[i]/tot)/2;
    Lp.push([pts[i][0]-ty*w,pts[i][1]+tx*w]);Rp.push([pts[i][0]+ty*w,pts[i][1]-tx*w]);}
  return dedupe(Lp.concat(Rp.reverse()));}
/* transforms */
const mapP=(poly,f)=>poly.map(f);
const bbox=polys=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of polys)for(const q of p){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}return{x0,y0,x1,y1};};
class Gl{constructor(){this.ops=[];}
  add(...ps){for(const p of ps)if(p&&p.length>2)this.ops.push([1,ccw(p)]);return this;}
  sub(...ps){for(const p of ps)if(p&&p.length>2)this.ops.push([0,ccw(p)]);return this;}
  xf(f){const g=new Gl();g.ops=this.ops.map(o=>[o[0],o[1].map(f)]);return g;}
  mirX(xm){return this.xf(q=>[2*xm-q[0],q[1]]);}
  shift(dx,dy){return this.xf(q=>[q[0]+dx,q[1]+dy]);}
  scale(s,ox,oy){return this.xf(q=>[ox+(q[0]-ox)*s,oy+(q[1]-oy)*s]);}
  merge(o){this.ops.push(...o.ops);return this;}
  get pos(){return this.ops.filter(o=>o[0]).map(o=>o[1]);}
  bbox(){return bbox(this.pos);}}
Object.assign(K,{safeLens,circ,clamp,cub,pth,rr,lens,rect,quad,dia,nib,sweep,blade,area,ccw,Gl,bbox,dedupe});
root.KortesCore=K;

})(typeof window!=='undefined'?window:globalThis);
/* letters: caps Latin + Cyrillic. Each builder: (c)=>{g:Gl, W:inkWidth, sb:[l,r]} ; coords start at ink x=0 */
(function(root){'use strict';
const K=root.KortesCore;
const {clamp,cub,pth,rr,lens,rect,quad,dia,nib,blade,Gl}=K;
const hyp=Math.hypot,min=Math.min,max=Math.max,PI=Math.PI,cos=Math.cos,sin=Math.sin,abs=Math.abs;
function ctx(P){
  const C=700,S=P.weight,hr=0.62-0.0055*P.contrast,h=S*hr,ov=10;
  const c={P,C,S,h,ov,wk:P.width};
  c.hb=Math.max(h*1.25,0.30*S); c.bar=Math.max(h*1.0,0.26*S);
  c.sr=40+1.2*P.sharp; c.sh=125-0.45*P.sharp;
  c.bh=c.sh*1.05; c.bw=c.bh*c.sr/c.sh;
  c.w=v=>v*c.wk; c.R=S*1.04;
  c.nibA=S*0.5; c.nibB=Math.max(h*0.5,6); c.th=22*PI/180;
  c.sw=P.swash/100; return c;}
const flB=(c,xa,xb,rl,rr_,y)=>{y=y||0;return [[xa-rl,y],[xb+rr_,y],[xb,y+c.sh],[xa,y+c.sh]];};
const flT=(c,xa,xb,rl,rr_,y)=>{y=y==null?c.C:y;return [[xa-rl,y],[xa,y-c.sh],[xb,y-c.sh],[xb+rr_,y]];};
/* leg: slanted stem; bottom (bo,bi) at y0, top (to,ti) at y1 ; fb/ft = [reachL,reachR] or null */
function leg(c,bo,bi,to,ti,y0,y1,fb,ft){const out=[[[bo,y0],[bi,y0],[ti,y1],[to,y1]]];const H=y1-y0,u=c.sh/H;
  if(fb)out.push([[bo-fb[0],y0],[bi+fb[1],y0],[bi+(ti-bi)*u,y0+c.sh],[bo+(to-bo)*u,y0+c.sh]]);
  if(ft)out.push([[to-ft[0],y1],[ti+ft[1],y1],[ti+(bi-ti)*u,y1-c.sh],[to+(bo-to)*u,y1-c.sh]]);
  return out;}
const bDR=(c,x1,yb,k)=>{k=k||1;return [[x1-c.bw*k,yb+3],[x1,yb+3],[x1,yb-c.bh*k]];};
const bDL=(c,x0,yb,k)=>{k=k||1;return [[x0,yb+3],[x0+c.bw*k,yb+3],[x0,yb-c.bh*k]];};
const bUR=(c,x1,yt,k)=>{k=k||1;return [[x1-c.bw*k,yt-3],[x1,yt+c.bh*k],[x1,yt-3]];};
const bUL=(c,x0,yt,k)=>{k=k||1;return [[x0,yt-3],[x0,yt+c.bh*k],[x0+c.bw*k,yt-3]];};
const brD=(c,xs,yb,dir,k)=>{k=k||0.7;return [[xs,yb+3],[xs+dir*c.sr*k,yb+3],[xs,yb-c.sh*k]];};
const brU=(c,xs,yt,dir,k)=>{k=k||0.7;return [[xs,yt-3],[xs+dir*c.sr*k,yt-3],[xs,yt+c.sh*k]];};
function ringO(c,x0,x1,wl,wr,opt){opt=opt||{};const C=c.C,ov=c.ov;
  const rx=(x1-x0)/2,ry=(C+2*ov)/2;
  const outer=rr(x0,-ov,x1,C+ov,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],opt.k||0.62);
  const xl=x0+wl,xr=x1-wr,ytop=C+ov-c.h*(opt.ht||0.95),ybot=-ov+c.h*(opt.hb||0.95),Wi=xr-xl;
  const tx=opt.tt==null?0.14:opt.tt;
  const counter=K.safeLens(c,outer,xl+tx*Wi,ytop,xr-tx*Wi,ybot,xl,xr,opt.f||0.30);
  return{outer,counter,xl,xr,ytop,ybot,Wi};}
function bowl(c,xs,x1,y0,y1,opt){opt=opt||{};const rad=opt.r==null?(y1-y0)*0.50:opt.r;
  const outer=rr(xs-70,y0,x1,y1,[0,[rad*0.95,rad],[rad*0.95,rad],0],0.60);
  const ht=opt.ht==null?c.h*0.95:opt.ht,hb=opt.hb==null?c.h*0.95:opt.hb,wr=(opt.wr==null?c.S*0.98:opt.wr)*1.12*((c.EX&&c.EX.wrk)||1.15);
  const xl=xs+(opt.gl==null?4:opt.gl),xr=x1-wr,ytop=y1-ht,ybot=y0+hb,Wi=xr-xl;
  const counter=K.safeLens(c,outer,xl+(opt.tt==null?0.16:opt.tt)*Wi,ytop,xr-((c.EX&&c.EX.ttb)||0.16)*Wi,ybot,xl,xr,(c.EX&&c.EX.f)||opt.f||0.26);
  return{outer,counter};}
const fin=(g,W,sb)=>({g,W,sb:sb||[14,14]});
const breve=(c,xc,w)=>{const {C,S}=c;const hw=w/2,Yb=C+64,h=122,tv=Math.max(c.h*1.3,46);const Yt=Yb+h,tw=tv*hw/h*0.78;
  /* wedge tick: V with flat-cut ends and a pointed foot (same straight-facet family as the serifs) */
  return [[xc-hw,Yt],[xc-hw+tw,Yt],[xc,Yb+tv],[xc+hw-tw,Yt],[xc+hw,Yt],[xc,Yb]];};
const L={};
/* ================= straight-stem family */
L.I=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=S+2*sr;
  g.add(rect(sr,sh-2,sr+S,C-sh+2),flB(c,sr,sr+S,sr,sr),flT(c,sr,sr+S,sr,sr));return fin(g,W,[8,8]);};
L.H=c=>{const g=new Gl(),{S,C,sr,sh}=c;const sd=S*0.98;const W=Math.max(c.w(720),2*sr+2*sd+150);
  const gap=W-2*sr-2*sd,ri=Math.min(sr,(gap-50)/2),x1=sr,x2=W-sr-sd;
  g.add(rect(x1,sh-2,x1+sd,C-sh+2),rect(x2,sh-2,x2+sd,C-sh+2));
  g.add(flB(c,x1,x1+sd,sr,ri),flT(c,x1,x1+sd,sr,ri),flB(c,x2,x2+sd,ri,sr),flT(c,x2,x2+sd,ri,sr));
  const yb=C*0.52;g.add(rect(x1+sd-2,yb-c.bar/2,x2+2,yb+c.bar/2));return fin(g,W,[6,6]);};
L.E=c=>{const g=new Gl(),{S,C,sr,sh,hb,bar}=c;const W=Math.max(c.w(560),S+sr+270);const xs=sr,xe=W-4;
  g.add(rect(xs,sh-2,xs+S,C-sh+2),flT(c,xs,xs+S,sr,0),flB(c,xs,xs+S,sr,0));
  g.add(rect(xs,C-hb,xe,C),bDR(c,xe,C-hb),brD(c,xs+S,C-hb,1,0.9));
  g.add(rect(xs,0,xe,hb),bUR(c,xe,hb,1.25),brU(c,xs+S,hb,1,0.9));
  const ym=C*0.50,xm=xs+S+(xe-xs-S)*0.80;g.add(rect(xs+S-2,ym-bar/2,xm,ym+bar/2),bDR(c,xm,ym-bar/2,0.62),bUR(c,xm,ym+bar/2,0.5));
  return fin(g,W,[8,8]);};
L.F=c=>{const g=new Gl(),{S,C,sr,sh,hb,bar}=c;const W=Math.max(c.w(530),S+sr+250);const xs=sr,xe=W-4;
  g.add(rect(xs,sh-2,xs+S,C-sh+2),flT(c,xs,xs+S,sr,0),flB(c,xs,xs+S,sr,sr));
  g.add(rect(xs,C-hb,xe,C),bDR(c,xe,C-hb),brD(c,xs+S,C-hb,1,0.9));
  const ym=C*0.50,xm=xs+S+(xe-xs-S)*0.78;g.add(rect(xs+S-2,ym-bar/2,xm,ym+bar/2),bDR(c,xm,ym-bar/2,0.62),bUR(c,xm,ym+bar/2,0.5));
  return fin(g,W,[8,6]);};
L.L=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(600),S+sr+270);const xs=sr,xe=W-4;
  g.add(rect(xs,sh-2,xs+S,C-sh+2),flT(c,xs,xs+S,sr,sr),flB(c,xs,xs+S,sr,0));
  g.add(rect(xs,0,xe,hb),bUR(c,xe,hb,1.45),brU(c,xs+S,hb,1,0.9));return fin(g,W,[8,4]);};
L.T=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(610),S+2*sr+160);const xc=W/2;
  g.add(rect(4,C-hb,W-4,C),bDR(c,W-4,C-hb),bDL(c,4,C-hb));
  g.add(rect(xc-S/2,sh-2,xc+S/2,C-hb+2),flB(c,xc-S/2,xc+S/2,sr,sr),brD(c,xc+S/2,C-hb,1,0.9),brD(c,xc-S/2,C-hb,-1,0.9));
  return fin(g,W,[4,4]);};
L['Г']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(470),S+sr+170);const xs=sr,xe=W-4;
  g.add(rect(xs,sh-2,xs+S,C-sh+2),flB(c,xs,xs+S,sr,sr),flT(c,xs,xs+S,sr,0));
  g.add(rect(xs,C-hb,xe,C),bDR(c,xe,C-hb),brD(c,xs+S,C-hb,1,0.9));return fin(g,W,[8,4]);};
L['П']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(680),2*sd+2*sr+1.4*sr+110);const x1=sr,x2=W-sr-sd;
  g.add(rect(x1,sh-2,x1+sd,C-sh+2),rect(x2,sh-2,x2+sd,C-sh+2),rect(x1,C-hb,x2+sd,C));
  g.add(flB(c,x1,x1+sd,sr,sr*0.7),flB(c,x2,x2+sd,sr*0.7,sr),flT(c,x1,x1+sd,sr,0),flT(c,x2,x2+sd,0,sr));
  g.add(brD(c,x1+sd,C-hb,1,0.9),brD(c,x2,C-hb,-1,0.9));return fin(g,W,[6,6]);};
L.N=c=>{const g=new Gl(),{S,C,sr,sh}=c;const sl=S*0.8;const W=Math.max(c.w(740),2*sl+2*sr+170);const x1=sr,x2=W-sr-sl;
  g.add(rect(x1,sh-2,x1+sl,C-sh+2),rect(x2,sh-2,x2+sl,C-sh+2));
  g.add(quad([x1,C],[x1+S*1.1,C],[x2+sl,0],[x2+sl-S*1.1,0]));
  g.add(flB(c,x1,x1+sl,sr,sr*0.6),flT(c,x1,x1+sl,sr,0),flB(c,x2,x2+sl,sr*0.6,sr),flT(c,x2,x2+sl,sr*0.6,sr));return fin(g,W,[6,6]);};
L['И']=c=>{const g=new Gl(),{S,C,sr,sh}=c;const sl=S*0.8;const W=Math.max(c.w(740),2*sl+2*sr+170);const x1=sr,x2=W-sr-sl;
  g.add(rect(x1,sh-2,x1+sl,C-sh+2),rect(x2,sh-2,x2+sl,C-sh+2));
  g.add(quad([x2+sl,C],[x2+sl-S*1.1,C],[x1,0],[x1+S*1.1,0]));
  g.add(flB(c,x1,x1+sl,sr,sr*0.6),flT(c,x1,x1+sl,sr,sr*0.6),flB(c,x2,x2+sl,sr*0.6,sr),flT(c,x2,x2+sl,0,sr));return fin(g,W,[6,6]);};
L['Й']=c=>{const r=L['И'](c);r.g.add(breve(c,r.W/2+4,Math.min(r.W*0.46,330)));return r;};
/* ================= diagonals */
L.A=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(630),2*sr+330);const wl=S*0.86,wr=S*1.05;
  const xlo=sr*0.9,xli=xlo+wl,xro=W-sr*0.9,xri=xro-wr,ax=(xli+xri)/2+14,ay=C*0.76;
  const Lx=(y)=>xli+(ax-xli)*y/ay,Rx=(y)=>xri+(ax-xri)*y/ay;
  const tl=Lx(C)-wl,tr=Rx(C)+wr;
  // legs: left (bo,bi bottom ; to,ti top)
  for(const p of leg(c,xlo,xli,tl,Lx(C),0,C,[sr*0.9,sr*0.55],null))g.add(p);
  for(const p of leg(c,xri,xro,Rx(C),tr,0,C,[sr*0.55,sr*0.9],null))g.add(p);
  g.add(rect(tl,C-4,tr,C),[[tl,C],[tr,C],[tr,C-6],[tl,C-6]]);
  // right top flag
  const xoR=xro+(tr-xro)*(C-sh)/C;g.add([[tr-8,C],[tr+sr*1.05,C],[xoR,C-sh],[xoR-8,C-sh]]);
  // fill apex between legs above counter apex
  g.add([[Lx(ay)-2,ay-2],[ax,ay+0],[Rx(ay)+2,ay-2],[Rx(C),C],[Lx(C),C]]);
  // bar: flat top, slanted underside
  const yt=C*0.46,y1=C*0.20,y2=C*0.385;g.add([[Lx(y1)-6,y1],[Rx(y2)+6,y2],[Rx(yt)+6,yt],[Lx(yt)-6,yt]]);
  return fin(g,W,[2,2]);};
L.V=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(660),2*sr+300);const lw=S*1.2,tw=hb*1.6;const a=sr*0.5,b=W-sr*0.5,xv=W/2;
  for(const p of leg(c,xv-lw*0.35,xv+lw*0.6,a,a+lw,0,C,null,[sr*0.9,sr*0.5]))g.add(p);
  for(const p of leg(c,xv-tw*0.1,xv+lw*0.6,b-tw,b,0,C,null,[sr*0.5,sr*0.9]))g.add(p);
  g.add([[xv-lw*0.35,0],[xv+tw*0.9,0],[xv+tw*0.9,10],[xv-lw*0.35,10]]);return fin(g,W,[2,2]);};
L.X=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(680),2*sr+400);const lw=S*1.2,tw=hb*1.6,a=sr*0.5,b=W-sr*0.5;
  for(const p of leg(c,b-lw,b,a,a+lw,0,C,[sr*0.5,sr*0.9],[sr*0.9,sr*0.5]))g.add(p);
  for(const p of leg(c,a,a+tw,b-tw,b,0,C,[sr*0.9,sr*0.5],[sr*0.5,sr*0.9]))g.add(p);return fin(g,W,[2,2]);};
L['Х']=undefined;
L.Y=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(650),2*sr+300,2.4*sr+360);const kk=Math.min(1,(W-2.4*sr-24)/(S*1.85+hb*3.0)),lw=S*1.85*kk,tw=hb*3.0*kk;const a=sr*0.5,b=W-sr*0.5,xc=W/2,sd=S*1.4,yj=C*0.42;
  g.add(rect(xc-sd/2,sh-2,xc+sd/2,yj+20),flB(c,xc-sd/2,xc+sd/2,sr,sr));
  for(const p of leg(c,xc-sd/2,xc+sd/2-2,a,a+lw,yj,C,null,[sr*0.9,sr*0.5]))g.add(p);
  for(const p of leg(c,xc-tw*0.3,xc+sd/2-5,b-tw,b,yj-6,C,null,[sr*0.5,sr*0.9]))g.add(p);return fin(g,W,[2,2]);};
L.W=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(940),2*sr+640);const lw=S*0.95,tw=hb*1.5,a=sr*0.5,b=W-sr*0.5,x1=W*0.28,x2=W*0.72,xc=W/2;
  for(const p of leg(c,x1-lw*0.4,x1+lw*0.55,a,a+lw,0,C,null,[sr*0.9,sr*0.5]))g.add(p);
  for(const p of leg(c,x1-tw*0.1,x1+tw*0.9,xc-tw/2,xc+tw/2,0,C,null,null))g.add(p);
  for(const p of leg(c,x2-lw*0.4,x2+lw*0.55,xc-lw/2,xc+lw/2,0,C,null,null))g.add(p);
  for(const p of leg(c,x2-tw*0.1,x2+tw*0.9,b-tw,b,0,C,null,[sr*0.5,sr*0.9]))g.add(p);
  g.add(flT(c,xc-lw/2-4,xc+tw/2,sr*0.6,sr*0.6));return fin(g,W,[2,2]);};
L.Z=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(580),2*sr+300);
  g.add(rect(4,C-hb,W-4,C),bDL(c,4,C-hb));
  g.add(rect(4,0,W-4,hb),bUR(c,W-4,hb,1.1),bUL(c,4,hb,1.1));
  g.add([[W-sr*0.7,C-hb-1],[W-sr*0.7-S*1.05,C-hb-1],[sr*0.7,hb+1],[sr*0.7+S*1.05,hb+1]]);return fin(g,W,[4,4]);};
L.K=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(700),sd+2*sr+300);const xs=sr,yj=C*0.40;
  g.add(rect(xs,sh-2,xs+sd,C-sh+2),flT(c,xs,xs+sd,sr,sr*0.5),flB(c,xs,xs+sd,sr,sr*0.5));
  const ax=W-sr*0.5-hb*0.2,lx=W-sr*0.7,lw=S*1.0;
  for(const p of leg(c,xs+sd-6,xs+sd+hb*1.7,ax-hb*1.8,ax,yj-4,C,null,[sr*0.5,sr*0.9]))g.add(p);
  for(const p of leg(c,lx-lw,lx,xs+sd+6,xs+sd+6+lw*0.95,0,yj+hb*0.8,[sr*0.5,sr*0.9],null))g.add(p);
  g.add([[xs+sd,yj-hb],[xs+sd+hb*1.4,yj+hb*0.2],[xs+sd,yj+hb*0.9]]);return fin(g,W,[6,2]);};
/* ================= bowls */
L.P=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(590),S+sr+330);const xs=sr+S*0.95;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  const b=bowl(c,xs,W,C*0.36,C,{r:(C*0.64)*0.5,wr:S*0.9});g.add(b.outer);g.sub(b.counter);return fin(g,W,[8,6]);};
L.B=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(650),S+sr+360);const xs=sr+S*0.95;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  const ym=C*0.53,gp=c.bar*0.62;
  const u=bowl(c,xs,W*0.93+2,ym-gp+0,C,{r:(C-ym+gp)*0.5,wr:S*0.37,gl:4,ht:c.h*0.60,hb:c.h*0.60});const l=bowl(c,xs,W,0,ym+gp,{r:(ym+gp)*0.5,wr:S*0.41,gl:4,ht:c.h*0.60,hb:c.h*0.60});
  g.add(u.outer,l.outer);g.sub(u.counter,l.counter);return fin(g,W,[8,6]);};
L['Б']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(600),S+sr+340);const xs=sr+S*0.95;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  g.add(rect(sr,C-hb,W-6,C),bDR(c,W-6,C-hb),brD(c,xs,C-hb,1,0.9));
  const b=bowl(c,xs,W,0,C*0.62,{r:C*0.31,wr:S*0.44,hb:c.h*0.62});g.add(b.outer);g.sub(b.counter);return fin(g,W,[8,6]);};
L['Ь']=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(540),S+sr+300);const xs=sr+S*0.95;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  const b=bowl(c,xs,W,0,C*0.62,{r:C*0.31,wr:S*0.9});g.add(b.outer);g.sub(b.counter);return fin(g,W,[8,6]);};
L['Ъ']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const o=sr*1.5;const W=Math.max(c.w(660),S+sr+360)+o;const xs=sr+S*0.95+o;
  g.add(rect(sr+o,sh-2,xs,C-sh+2),flB(c,sr+o,xs,sr,sr));
  g.add(rect(4,C-hb,xs+30,C),bDL(c,4,C-hb,1.1),flT(c,sr+o,xs,0,0));
  const b=bowl(c,xs,W,0,C*0.62,{r:C*0.31,wr:S*0.9});g.add(b.outer);g.sub(b.counter);return fin(g,W,[4,6]);};
L['Ы']=c=>{const g=new Gl(),{S,C,sr,sh}=c;const bw=c.w(520);const xs=sr+S*0.95;const sd=S*0.98;const W=bw+sd+sr*0.9+46;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  const b=bowl(c,xs,bw,0,C*0.62,{r:C*0.31,wr:S*0.9});g.add(b.outer);g.sub(b.counter);
  const x2=W-sr*0.9-sd+0;g.add(rect(x2,sh-2,x2+sd,C-sh+2),flB(c,x2,x2+sd,sr*0.6,sr*0.9),flT(c,x2,x2+sd,sr*0.6,sr*0.9));return fin(g,W,[8,8]);};
L.D=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(660),S+sr+380);const xs=sr+S*0.95;
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,sr),flT(c,sr,xs,sr,0));
  const b=bowl(c,xs,W,0,C,{r:C*0.5,wr:S*0.95,tt:0.18});g.add(b.outer);g.sub(b.counter);return fin(g,W,[8,6]);};
L.R=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(640),S+sr+340);const xs=sr+S*0.95;
  const lx=W-sr*0.7,lw=S*1.0;const reachR=Math.min(sr,Math.max(24,(lx-lw-sr*0.4)-xs-46));
  g.add(rect(sr,sh-2,xs,C-sh+2),flB(c,sr,xs,sr,reachR),flT(c,sr,xs,sr,0));
  const yb=C*0.40;const b=bowl(c,xs,W-sr*0.15,yb,C,{r:(C-yb)*0.5,wr:S*0.9});g.add(b.outer);g.sub(b.counter);
  if(!c.noLeg)for(const p of leg(c,lx-lw,lx,xs+(W-xs)*0.18,xs+(W-xs)*0.18+lw*0.95,0,yb+30,[sr*0.4,sr*0.9],null))g.add(p);
  return {g,W,sb:[8,2],swashBase:{x:xs+(W-xs)*0.18+lw*0.5,y:yb+20,lw}};};
root.KortesLettersCtx=ctx;root.KortesLetters=L;root.KortesAtoms={flB,flT,leg,bDR,bDL,bUR,bUL,brD,brU,ringO,bowl,fin,breve};

})(typeof window!=='undefined'?window:globalThis);
/* more glyphs: rounds, M U J Q S, Cyrillic specifics, digits */
(function(root){'use strict';
const K=root.KortesCore;
const A=root.KortesAtoms;
const L=root.KortesLetters;
const {rr,lens,rect,quad,dia,nib,blade,pth,Gl}=K;
const {flB,flT,leg,bDR,bDL,bUR,bUL,brD,brU,ringO,bowl,fin,breve}=A;
const PI=Math.PI,min=Math.min,max=Math.max;
/* fit polygons to a box (keeps proportions of strokes mostly; used for nib strokes) */
function fitBox(poly,x0,y0,x1,y1){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const q of poly){a=min(a,q[0]);c=max(c,q[0]);b=min(b,q[1]);d=max(d,q[1]);}
  return poly.map(q=>[x0+(q[0]-a)*(x1-x0)/(c-a),y0+(q[1]-b)*(y1-y0)/(d-b)]);}
const stroke=(c,path,k)=>nib(path,c.nibA*(k||1),c.nibB,c.th);
const tailW=(w0)=>(t)=>Math.max(w0*Math.pow(1-t,1.15),0)+ (t<0.985?3:0);
/* swash tail: from P0 sweeping right under the next letter. returns polygon */
function tail(c,x0,y0,xEnd,dip,w0){const L=xEnd-x0;
  const pts=pth([x0,y0],['C',x0+0.30*L,y0-0.9*(y0+dip)*1.0-0,x0+0.62*L,-dip*1.25,xEnd,-26]);
  return blade(pts,tailW(w0));}
/* ================= rounds */
L.O=c=>{const g=new Gl(),{C,S,sh}=c;const W=c.w(580);const r=ringO(c,0,W,c.R,c.R*0.95);g.add(r.outer);g.sub(r.counter);
  return {g,W,sb:[22,22],tailAt:{x:W*0.76,y:46,w:c.S*0.34}};};
function Cbody(c,W,g){const {C,S,sr}=c;const r=ringO(c,0,W,c.R,c.R*0.92,{tt:0.12});g.add(r.outer);g.sub(r.counter);
  const xT=W*0.955,yT=C*0.70,yB=C*0.27;
  g.sub([[r.xl+r.Wi*0.45,yT-28],[xT,yT],[W+60,yT],[W+60,yB],[xT,yB],[r.xl+r.Wi*0.45,yB+28]]);
  g.sub([[xT+22,C+80],[xT-4,yT-1],[W+80,yT-1],[W+80,C+80]]);g.sub(rect(xT-2,-80,W+80,yB+1));
  g.add(bDR(c,xT-4,yT-1,0.95));g.add(bUR(c,xT,yB,0.9));return {r,xT,yT,yB};}
L.C=c=>{const g=new Gl();const W=c.w(520);const b=Cbody(c,W,g);
  return {g,W,sb:[22,10],tailAt:{x:W*0.76,y:46,w:c.S*0.32}};};
L.G=c=>{const g=new Gl(),{C,S,sr,sh}=c;const W=c.w(580);const r=ringO(c,0,W,c.R,c.R*0.92,{tt:0.12});g.add(r.outer);g.sub(r.counter);
  const xT=W*0.955,yT=C*0.70,yBar=C*0.47;
  g.sub([[r.xl+r.Wi*0.45,yT-28],[xT,yT],[W+60,yT],[W+60,yBar],[r.xl+r.Wi*0.3,yBar]]);
  g.sub([[xT+22,C+80],[xT-4,yT-1],[W+80,yT-1],[W+80,C+80]]);
  g.add(bDR(c,xT-4,yT-1,0.95));
  const sd=S*0.98;g.add(rect(W-sd,sh*0.3,W,yBar),rect(W*0.46,yBar-c.bar*1.1,W,yBar));
  return {g,W,sb:[22,6],tailAt:{x:W*0.76,y:46,w:c.S*0.32}};};
L.Q=c=>{const r=L.O(c);const g=r.g,{S,C}=c;const W=r.W;
  g.add(blade(pth([W*0.55,C*0.12],['C',W*0.70,-C*0.02,W*0.90,-C*0.12,W*1.08,-C*0.30]),t=>S*0.75*(1-t*0.55)+4));return {g,W:W*1.06,sb:[22,10]};};
L.U=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(700),2*sr+S*1.8+220);const sd=S*0.72,x1=sr,x2=W-sr-sd;
  g.add(rect(x1,0.3*C,x1+S,C-sh+2),flT(c,x1,x1+S,sr,sr*0.5),rect(x2,0,x2+sd,C-sh+2),flT(c,x2,x2+sd,sr*0.5,sr),flB(c,x2,x2+sd,sr*0.3,sr*1.0));
  const o=rr(x1,-c.ov,x2+sd,C*0.62,[0,0,[(x2+sd-x1)*0.5,C*0.62*0.95],[(x2+sd-x1)*0.5,C*0.62*0.95]],0.62);g.add(o);
  const xl=x1+S,xr=x2,cn=rr(xl,c.h*0.9,xr,C+40,[0,0,[(xr-xl)*0.5,(xr-xl)*0.5],[(xr-xl)*0.5,(xr-xl)*0.5]],0.60);g.sub(cn);
  g.add(rect(x1,0.3*C,x1+S,C-sh+2),rect(x2,0.3*C,x2+sd,C-sh+2));
  return fin(g,W,[6,6]);};
L.J=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(430),S+sr*1.7+150);const x=W-sr*0.7-S;
  g.add(rect(x,C*0.3,x+S,C-sh+2),flT(c,x,x+S,sr*1.0,sr*0.6));
  g.add(blade(pth([x+S*0.5,C*0.34],['C',x+S*0.5,-C*0.04,x-0.18*W,-C*0.04,x-0.38*W,C*0.18]),t=>S*(1-0.62*t)+6));
  g.add(bUL(c,x-0.38*W-8,C*0.16,0.9));return fin(g,W,[0,6]);};
L.M=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(860),2*sr+2*S+520);const xa=sr*0.8,dx=W*0.03,sd=S*1.0,xm=W/2;
  for(const p of leg(c,xa,xa+sd,xa+dx,xa+dx+sd,0,C,[sr*0.9,sr*0.6],[sr*0.9,0]))g.add(p);
  for(const p of leg(c,W-xa-sd,W-xa,W-xa-dx-sd,W-xa-dx,0,C,[sr*0.6,sr*0.9],[0,sr*0.9]))g.add(p);
  g.add(quad([xa+dx,C],[xa+dx+S*1.1,C],[xm+S*0.4,0],[xm-S*0.4,0]));
  g.add(quad([xm-S*0.05,0],[xm+S*0.5,0],[W-xa-dx-sd+4,C],[W-xa-dx-sd-hb*1.7,C]));
  return fin(g,W,[2,2]);};
L.S=c=>{const g=new Gl(),{S,C,sr}=c;const W=c.w(500);
  const A=[0.88*W,0.80*C];
  let p=pth(A,['C',0.80*W,1.04*C,0.14*W,1.04*C,0.12*W,0.74*C],['C',0.10*W,0.50*C,0.88*W,0.50*C,0.88*W,0.26*C],['C',0.90*W,-0.04*C,0.20*W,-0.04*C,0.12*W,0.20*C]);
  let poly=nib(p,c.nibA*1.05,c.nibB,26*PI/180);poly=fitBox(poly,0,-c.ov,W,C+c.ov);g.add(poly);
  return fin(g,W,[18,18]);};
/* ================= Cyrillic specifics */
L['Л']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(660),sd+S+2*sr+230);const x2=W-sr-sd,tl=W*0.30;
  for(const p of leg(c,sr*0.5,sr*0.5+S*0.9,tl,tl+S*0.9,0,C,[sr*0.9,sr*0.5],null))g.add(p);
  g.add(rect(x2,sh-2,x2+sd,C-sh+2),flB(c,x2,x2+sd,sr*0.6,sr),flT(c,x2,x2+sd,0,sr),rect(tl,C-hb*1.7,x2+sd,C));
  g.add([[tl+S*0.9-4,C-hb*1.7],[tl+S*0.9+sr*0.8,C-hb*1.7],[tl+S*0.9-4,C-hb*1.7-sh*0.8]]);return fin(g,W,[2,6]);};
L['Д']=c=>{const r=L['Л'](c);const {g,W}=r,{hb,sr}=c;const y0=-hb*0.95;
  g.add(rect(sr*0.2,y0,W-sr*0.15,6),bDL(c,sr*0.2,y0,1.3),bDR(c,W-sr*0.15,y0,1.3));return fin(g,W,[4,6]);};
L['Ц']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(700),2*sd+2*sr+170);const x1=sr,x2=W-sr-sd;
  g.add(rect(x1,sh-2,x1+sd,C-sh+2),rect(x2,sh-2,x2+sd,C-sh+2),rect(x1,0,W-4,hb*1.1));
  g.add(flB(c,x1,x1+sd,sr,0),flT(c,x1,x1+sd,sr,sr*0.5),flT(c,x2,x2+sd,sr*0.5,sr),flB(c,x2,x2+sd,0,0),bDR(c,W-4,0+3,1.5));return fin(g,W,[6,4]);};
L['Ш']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(960),3*sd+2*sr+300);const x1=sr,x3=W-sr-sd,x2=(x1+x3)/2;
  for(const x of [x1,x2,x3]){g.add(rect(x,sh-2,x+sd,C-sh+2),flT(c,x,x+sd,x===x1?sr:sr*0.4,x===x3?sr:sr*0.4));}
  g.add(flB(c,x1,x1+sd,sr,sr*0.4),flB(c,x3,x3+sd,sr*0.4,sr),rect(x1,0,x3+sd,hb*1.1),flB(c,x2,x2+sd,0,0));return fin(g,W,[6,6]);};
L['Щ']=c=>{const r=L['Ш'](c);const {g,W}=r,{sr}=c;g.add(bDR(c,W-sr*0.4+4,3,1.5));return fin(g,W+4,[6,6]);};
L['Ч']=c=>{const g=new Gl(),{S,C,sr,sh}=c;const sd=S*0.98;const W=Math.max(c.w(620),2*sd+2*sr+120);const x1=sr,x2=W-sr-sd;
  g.add(rect(x2,sh-2,x2+sd,C-sh+2),flB(c,x2,x2+sd,sr,sr),flT(c,x2,x2+sd,0,sr*0.6));
  const yb=C*0.44;g.add(rect(x1,yb,x1+sd,C-sh+2),flT(c,x1,x1+sd,sr,sr*0.5));
  g.add(rect(x1,yb-c.hb*1.25,x2+4,yb+c.hb*0.15),rect(x1,yb-c.hb*1.15,x1+sd,yb+20));return fin(g,W,[6,6]);};
L['У']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(640),2*sr+300);const tw=hb*1.9,a=sr*0.5,b=W-sr*0.5,yj=C*0.44,xb0=W*0.20;
  for(const p of leg(c,xb0,xb0+tw*1.25,b-tw,b,0,C,[sr*0.9,sr*0.5],[sr*0.5,sr*0.9]))g.add(p);
  const xd=xb0+(b-tw-xb0)*yj/C;for(const p of leg(c,xd-tw*0.2,xd+tw*1.2,a,a+S*1.05,yj,C,null,[sr*0.9,sr*0.5]))g.add(p);return fin(g,W,[2,2]);};
L['Ж']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(900),sd+2*sr+640);const xc=W/2,yj=C*0.46;
  g.add(rect(xc-sd/2,sh-2,xc+sd/2,C-sh+2),flB(c,xc-sd/2,xc+sd/2,sr,sr),flT(c,xc-sd/2,xc+sd/2,sr,sr));
  const half=(gR)=>{const e=xc+sd/2-6,ax=W-sr*0.5-hb*0.2,lx=W-sr*0.7,lw=S*0.95;
    for(const p of leg(c,e,e+hb*1.6,ax-hb*1.7,ax,yj-4,C,null,[sr*0.5,sr*0.9]))gR.add(p);
    for(const p of leg(c,lx-lw,lx,e+4,e+4+lw*0.9,0,yj+hb*0.6,[sr*0.5,sr*0.9],null))gR.add(p);};
  g.add(rect(xc-sd/2-hb*1.2,yj-hb*0.9,xc+sd/2+hb*1.2,yj+hb*0.9));
  const gr=new Gl();half(gr);g.merge(gr);g.merge(gr.mirX(xc));return fin(g,W,[2,2]);};
function threeish(c,W,flat){const g=new Gl(),{S,C,sr,hb}=c;let p;
  if(flat){g.add(rect(W*0.08,C-hb,W*0.9,C),bDL(c,W*0.08,C-hb),bDR(c,W*0.9,C-hb,0.0001));
    p=pth([W*0.84,C-hb*0.5],['C',W*0.70,C*0.70,W*0.55,C*0.60,W*0.38,C*0.53],['C',W*0.98,C*0.60,W*0.98,C*0.02,W*0.46,-0.0*C],['C',W*0.24,-0.03*C,W*0.10,0.10*C,W*0.10,0.20*C]);}
  else p=pth([W*0.14,0.82*C],['C',W*0.20,1.04*C,W*0.80,1.06*C,W*0.80,0.76*C],['C',W*0.80,0.58*C,W*0.62,0.53*C,W*0.38,0.53*C],['C',W*0.98,0.52*C,W*0.98,-0.04*C,W*0.46,-0.02*C],['C',W*0.24,-0.01*C,W*0.12,0.10*C,W*0.10,0.20*C]);
  let poly=nib(p,c.nibA*1.0,c.nibB,26*PI/180);g.add(poly);return g;}
L['З']=c=>{const W=c.w(480);const g=threeish(c,W,false);return fin(g,W,[18,16]);};
L['3']=c=>{const W=c.w(470);const g=threeish(c,W,true);return fin(g,W,[18,16]);};
L['Э']=c=>{const r=L.C(c);const g=r.g.mirX(r.W/2);const W=r.W,{C,bar}=c;g.add(rect(W*0.30,C*0.50-bar/2,W-c.R*0.9,C*0.50+bar/2));return {g,W,sb:[10,22]};};
L['Ю']=c=>{const g=new Gl(),{S,C,sr,sh,bar}=c;const sd=S*0.98,ow=c.w(560);const W=sr+sd+20+ow;
  g.add(rect(sr,sh-2,sr+sd,C-sh+2),flB(c,sr,sr+sd,sr,sr*0.5),flT(c,sr,sr+sd,sr,sr*0.5),rect(sr+sd-2,C*0.5-bar/2,sr+sd+22,C*0.5+bar/2));
  const x0=sr+sd+30;const r=ringO(c,x0,x0+ow,c.R*0.88,c.R*0.84);g.add(r.outer);g.sub(r.counter);return fin(g,x0+ow,[6,22]);};
L['Я']=c=>{const r=L.R(c);const g=r.g.mirX(r.W/2);return {g,W:r.W,sb:[2,8]};};
L['Ф']=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=c.w(720);const sd=S*0.98,xc=W/2;
  const r=ringO(c,0.0,W,c.R*0.82,c.R*0.82,{ht:0.9});const sc=(y)=>y;const o=r.outer.map(q=>[q[0],q[1]*0.76+C*0.12]);const cn=r.counter.map(q=>[q[0],q[1]*0.76+C*0.12]);
  g.add(o);g.sub(cn);g.add(rect(xc-sd/2,sh-2,xc+sd/2,C-sh+2),flB(c,xc-sd/2,xc+sd/2,sr,sr),flT(c,xc-sd/2,xc+sd/2,sr,sr));return fin(g,W,[14,14]);};
L['Ё']=c=>{const r=L.E(c);const {g,W}=r,{C,S}=c;const d=S*0.34;g.add(dia(W*0.40,C+95,d*0.8,d),dia(W*0.40+S*1.0,C+95,d*0.8,d));return fin(g,W,[8,8]);};
/* ================= digits */
L['0']=c=>{const g=new Gl();const W=c.w(500);const r=ringO(c,0,W,c.R,c.R*0.95,{tt:0.10});g.add(r.outer);g.sub(r.counter);g.add([[W*0.44,c.C*0.32],[W*0.44+c.h*0.6,c.C*0.32],[W*0.56,c.C*0.68],[W*0.56-c.h*0.6,c.C*0.68]]);return fin(g,W,[18,18]);};
L['1']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const xs=sr*1.6;const W=xs+S+sr;g.add(rect(xs,sh-2,xs+S,C),flB(c,xs,xs+S,sr,sr));
  g.add([[xs+S,C],[xs,C],[6,C-sh*1.3],[6,C-sh*1.3-hb*0.95],[xs,C-hb*0.4]]);return fin(g,W,[4,8]);};
L['2']=c=>{const g=new Gl(),{S,C,hb}=c;const W=c.w(500);
  const p=pth([W*0.10,0.80*C],['C',W*0.14,1.04*C,W*0.84,1.06*C,W*0.84,0.74*C],['C',W*0.84,0.46*C,W*0.30,0.28*C,W*0.12,hb*0.9]);
  g.add(nib(p,c.nibA*1.0,c.nibB,26*PI/180));g.add(rect(W*0.06,0,W*0.94,hb*1.1),bUR(c,W*0.94,hb*1.1,1.0));return fin(g,W,[14,10]);};
L['4']=c=>{const g=new Gl(),{S,C,sr,sh,bar}=c;const W=c.w(600),sd=S*0.98,x=W-sr*0.9-sd;const yb=C*0.28;
  g.add(rect(x,sh-2,x+sd,C),flB(c,x,x+sd,sr*0.9,sr*0.9),flT(c,x,x+sd,sr*0.3,0));
  g.add(quad([x-S*0.95,C],[x+6,C],[x+6,C-S*0.9],[sr*0.3+S*0.25,yb+bar]),quad([x-S*0.95,C],[x-S*0.2,C],[sr*0.3+S*0.7,yb],[sr*0.3,yb]));g.add(rect(sr*0.3+8,yb,W-sr*0.2,yb+bar));return fin(g,W,[6,6]);};
L['5']=c=>{const g=new Gl(),{S,C,hb}=c;const W=c.w(480);
  g.add(rect(W*0.20,C-hb,W*0.90,C),bDR(c,W*0.90,C-hb),quad([W*0.20,C],[W*0.20+S*0.85,C],[W*0.20+S*0.7,C*0.52],[W*0.20-S*0.05,C*0.48]));
  const p=pth([W*0.24,C*0.55],['C',W*0.60,C*0.68,W*0.96,C*0.56,W*0.94,C*0.30],['C',W*0.92,-0.04*C,W*0.30,-0.04*C,W*0.10,0.18*C]);g.add(nib(p,c.nibA*1.0,c.nibB,26*PI/180));return fin(g,W,[14,14]);};
function ringStroke(c,W,flip){const g=new Gl(),{C}=c;
  const r=ringO(c,0,W,c.R*0.92,c.R*0.92,{tt:0.12});const o=r.outer.map(q=>[q[0],q[1]*0.62+(flip?C*0.38:0)-(flip?0:c.ov*0.6)]);const cn=r.counter.map(q=>[q[0],q[1]*0.62+(flip?C*0.38:0)-(flip?0:c.ov*0.6)]);g.add(o);g.sub(cn);return g;}
L['6']=c=>{const W=c.w(500),{C,S}=c;const g=ringStroke(c,W,false);
  g.add(blade(pth([W*0.04,C*0.36],['C',W*0.0,C*0.80,W*0.30,C*1.04,W*0.88,C*0.98]),t=>S*(1-0.8*t)+6));return fin(g,W,[18,18]);};
L['9']=c=>{const W=c.w(500);const r=L['6'](c);return fin(r.g.xf(q=>[W-q[0],c.C-q[1]]),W,[18,18]);};
L['8']=c=>{const g=new Gl(),{C}=c;const W=c.w(500);
  const u=ringO(c,W*0.06,W*0.94,c.R*0.8,c.R*0.8,{tt:0.12});const l=ringO(c,0,W,c.R*0.88,c.R*0.88,{tt:0.12});
  const U=(q)=>[q[0],q[1]*0.52+C*0.485],Lw=(q)=>[q[0],q[1]*0.55-c.ov*0.5];
  g.add(u.outer.map(U),l.outer.map(Lw));g.sub(u.counter.map(U),l.counter.map(Lw));return fin(g,W,[18,18]);};
L['7']=c=>{const g=new Gl(),{S,C,hb,sr,sh}=c;const W=c.w(520);
  g.add(rect(6,C-hb,W-4,C),bDL(c,6,C-hb),quad([W-4,C],[W-4-S*1.0,C-4],[W*0.22,0],[W*0.22+S*0.9,0]),[[W-4,C],[W-4,C-hb],[W-4-sr*0.2,C-hb],[W-4,C-hb-sh*0.6]]);
  g.add(flB(c,W*0.22,W*0.22+S*0.9,sr*0.6,sr*0.5));return fin(g,W,[6,6]);};

})(typeof window!=='undefined'?window:globalThis);
/* Round 2: clean rebuilds. Loaded after kortes_more.js; overrides L[...] entries. */
(function(root){'use strict';
const K=root.KortesCore;
const A=root.KortesAtoms;
const L=root.KortesLetters;
const {rr,lens,rect,quad,dia,nib,blade,pth,Gl}=K;
const {flB,flT,leg,bDR,bDL,bUR,bUL,brD,brU,ringO,bowl,fin,breve}=A;
const PI=Math.PI,min=Math.min,max=Math.max,abs=Math.abs;const TH=26*PI/180;
/* scanline helpers */
const topY=(p,x)=>{const ys=scy(p,x);return ys.length?ys[ys.length-1]:null;};
const botY=(p,x)=>{const ys=scy(p,x);return ys.length?ys[0]:null;};
/* lens counter whose tips are clamped inside the outer outline (keeps topology stable at extreme weight/contrast) */
function safeLens(c,outer,xt,yt,xb,yb,xl,xr,f,m){m=m==null?Math.max(c.h*0.75,16):m;
  const to=topY(outer,xt),bo=botY(outer,xb);if(to!=null)yt=Math.min(yt,to-m);if(bo!=null)yb=Math.max(yb,bo+m);return lens(xt,yt,xb,yb,xl,xr,f);}

function sc(poly,y){const xs=[];const n=poly.length;for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}return xs.sort((p,q)=>p-q);}
const xR=(p,y)=>{const s=sc(p,y);return s.length?s[s.length-1]:null;};
const xL=(p,y)=>{const s=sc(p,y);return s.length?s[0]:null;};
const scy=(poly,x)=>{const ys=[];const n=poly.length;for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))ys.push(a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]));}return ys.sort((p,q)=>p-q);};
const mir=(poly,xm)=>poly.map(q=>[2*xm-q[0],q[1]]);
/* ring in box with lens counter; optional mouth on side 'R'/'L' between levels yU (upper cut) and yD (lower cut); spurs at cut faces.
   opt: wl,wr (wall widths), ht,hb, tt, f, side, yU, yD, noUp, noDn, bk (spur depth k) */
function arcRing(c,x0,x1,y0,y1,opt){opt=opt||{};const side0=opt.side;const g=new Gl();const rx=(x1-x0)/2,ry=(y1-y0)/2;
  const outer=rr(x0,y0,x1,y1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);
  const wl=opt.wl==null?c.R:opt.wl,wr=opt.wr==null?(side0?c.h*1.5:c.R*0.92):opt.wr;
  const xl=x0+wl,xr=x1-wr,ytop=y1-c.h*(opt.ht||0.95),ybot=y0+c.h*(opt.hb||0.95),Wi=xr-xl;const tx=opt.tt==null?0.13:opt.tt;
  const counter=safeLens(c,outer,xl+(opt.ttT==null?tx:opt.ttT)*Wi,ytop,xr-(opt.ttB==null?tx:opt.ttB)*Wi,ybot,xl,xr,opt.f||0.30);
  const side=opt.side;
  if(!side){g.add(outer);g.sub(counter);return {g,outer,counter,xl,xr,ytop,ybot};}
  // build as right-open in local coords; mirror for left
  const flip=side==='L';const xm0=(x0+x1)/2;
  const O=outer,Cn=counter;
  const yU=opt.yU,yD=opt.yD;
  const mid=(y)=>{const s=sc(Cn,y);return (s[0]+s[s.length-1])/2;};
  g.add(O);g.sub(Cn);
  const bk=opt.bk||1;
  const yUm=opt.mouthTop?y1+10:yU,yDm=opt.mouthBot?y0-10:yD;
  const cxU=opt.mouthTop?mid(ytop-6):mid(yU),cxD=opt.mouthBot?mid(ybot+6):mid(yD);
  g.sub([[cxU,yUm],[x1+80,yUm],[x1+80,yDm],[cxD,yDm]]);
  const spur=(yy,up)=>{const xc=xR(Cn,yy),xo=xR(O,yy);const dxdy=(xR(Cn,yy+4)-xR(Cn,yy-4))/8; // counter edge direction
    const run=xo-xc;let bh=abs(run/(dxdy||1e-3));bh=min(bh,run*(up?(opt.bkU||2.2):(opt.bkD||2.2)));
    // extend the edge tangent a little backwards so the join is smooth
    const ext=0,xs=xc-ext*Math.sign(1),ys=yy+(up?1:-1)*ext*bh/run*0+ (up?1:-1)*1.5;
    return up?[[xs,yy+ext*bh/run],[xo,yy-bh],[xo,yy+4],[xs,yy+4]]:[[xs,yy-ext*bh/run],[xo,yy+bh],[xo,yy-4],[xs,yy-4]];};
  if(!opt.noUp&&!opt.mouthTop)g.add(spur(yU,true));
  if(!opt.noDn&&!opt.mouthBot)g.add(spur(yD,false));
  const out=flip?g.mirX(xm0):g;
  return {g:out,outer,counter,xl,xr,ytop,ybot,Wi,xo:(yy)=>flip?x0+x1-xR(O,yy):xR(O,yy)};}
Object.assign(root.KortesAtoms,{arcRing,sc,xR,xL,scy});
L.C=c=>{const {C,ov}=c;const W=c.w(520);const r=arcRing(c,0,W,-ov,C+ov,{side:'R',yU:C*0.80,yD:C*0.17,tt:0.12,ttT:(c.EX&&c.EX.tT)||0.26,ttB:(c.EX&&c.EX.tB)||0.30,wr:(c.EX&&c.EX.wr)||64});
  return {g:r.g,W,sb:[22,10],tailAt:{x:W*0.70,y:34,w:c.S*0.32}};};
L.G=c=>{const {C,S,sr,sh,ov}=c;const W=c.w(580);const yBar=C*0.47;const r=arcRing(c,0,W,-ov,C+ov,{side:'R',yU:C*0.80,yD:yBar-6,tt:0.12,ttT:0.26,ttB:0.30,wr:64,noDn:true});const g=r.g;
  const xo=r.xo(yBar-c.bar*0.3);const xb=W*0.47;
  g.add(rect(xb,yBar-c.bar,xo,yBar));
  g.add([[xb,yBar-c.bar+3],[xb+c.bw*0.9,yBar-c.bar+3],[xb,yBar-c.bar-c.bh*0.55]]);
  return {g,W,sb:[22,6],tailAt:{x:W*0.70,y:34,w:c.S*0.32}};};
L['Э']=c=>{const {C,ov,bar}=c;const W=c.w(520);const r=arcRing(c,0,W,-ov,C+ov,{side:'L',yU:C*0.80,yD:C*0.17,tt:0.12,ttT:0.26,ttB:0.30,wr:64});const g=r.g;
  const ym=C*0.50,t=bar*0.8;g.add(rect(W*0.30,ym-t/2,W*0.86,ym+t/2));
  return {g,W,sb:[10,22],tailAt:{x:W*0.30,y:34,w:c.S*0.32}};};
L.Q=c=>{const g=new Gl(),{C,S}=c;const W=c.w(580);const r=ringO(c,0,W,c.R,c.R*0.95);g.add(r.outer);g.sub(r.counter);
  const tx=r.xr-0.14*r.Wi,ty=r.ybot+8;
  g.add(blade(pth([tx,ty],['C',tx+W*0.12,-C*0.06,W*0.84,-C*0.22,W*1.06,-C*0.19]),t=>S*0.55*Math.pow(1-t,0.9)+(t<0.985?4:0)));
  return {g,W:W*1.08,sb:[22,10]};};
L['0']=c=>{const g=new Gl(),{C}=c;const W=c.w(500);const r=ringO(c,0,W,c.R,c.R*0.95,{tt:0.10});g.add(r.outer);g.sub(r.counter);
  const t=c.h*0.30;const x0=r.xl+r.Wi*0.30,x1=r.xr-r.Wi*0.30;const y0=C*0.20,y1=C*0.80;
  g.add([[x0-t-10,y0-8],[x0+t-10,y0-8],[x1+t+10,y1+8],[x1-t+10,y1+8]]);return fin(g,W,[18,18]);};
const fitBox=(poly,x0,y0,x1,y1)=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const q of poly){a=min(a,q[0]);c=max(c,q[0]);b=min(b,q[1]);d=max(d,q[1]);}return poly.map(q=>[x0+(q[0]-a)*(x1-x0)/(c-a),y0+(q[1]-b)*(y1-y0)/(d-b)]);};
/* vertical wedge terminal: cut stroke polygon at x=xc (keep side 'L' or 'R' of xc) and hang a spur from the cut */
function vcut(c,g,poly,xc,keep,up,bk,ya,yb){const HP=poly.hulls||[poly];const scyA=(pp,x)=>{let o=[];for(const h of HP)o=o.concat(scy(h,x));return o.sort((a,b)=>a-b);};let ys=scyA(poly,xc).filter(v=>v>=ya&&v<=yb);const lo=ys[0],hi=ys[ys.length-1];bk=bk||1;
  const wk=Math.min(1.2,Math.pow(137/c.S,2.5));const w=c.bw*1.1*bk,bh=c.bh*1.0*bk*wk;
  g.sub(keep==='L'?rect(xc,ya,xc+400,yb):rect(xc-400,ya,xc,yb));
  const dir=keep==='L'?-1:1;const edge=[];
  for(let i=0;i<=8;i++){const x=xc+dir*w*i/8;const yy=scyA(poly,x).filter(v=>v>=ya&&v<=yb);if(!yy.length)continue;edge.push([x,up===false?yy[0]:yy[yy.length-1]]);}
  const e0=edge[0],e1=edge[edge.length-1];
  const xe=xc-dir*0.7;
  const nE=edge.length-1;
  if(up===false){g.add([[xe,lo-bh]].concat(edge.map((q,i)=>[i===0?xe:q[0],q[1]+(i===nE?0:3)])));}
  else {g.add([[xe,hi+bh]].concat(edge.map((q,i)=>[i===0?xe:q[0],q[1]-(i===nE?0:3)])));}}
L.S=c=>{const g=new Gl(),{S,C,sr}=c;const W=c.w(500);
  const A=[0.84*W,0.905*C];
  let p=pth(A,['C',0.74*W,1.07*C,0.14*W,1.04*C,0.12*W,0.74*C],['C',0.10*W,0.50*C,0.88*W,0.50*C,0.88*W,0.26*C],['C',0.90*W,-0.05*C,0.30*W,-0.07*C,0.16*W,0.095*C]);
  const a=c.nibA*1.08;let poly=nib(p,a,c.nibB,TH);let hs=K.sweep(p,a,c.nibB,TH);poly.hulls=null;{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of poly){x0=min(x0,q[0]);x1=max(x1,q[0]);y0=min(y0,q[1]);y1=max(y1,q[1]);}
    const f=q=>[(q[0]-x0)*W/(x1-x0),-c.ov+(q[1]-y0)*(C+2*c.ov)/(y1-y0)];poly=poly.map(f);hs=hs.map(h=>h.map(f));poly.hulls=hs;}
  g.add(...hs);
  vcut(c,g,poly,W*0.835,'L',false,0.85,C*0.70,C+60);
  vcut(c,g,poly,W*0.165,'R',true,0.85,-60,C*0.30);
  return fin(g,W,[18,18]);};
const nibS=(c,pts,k)=>{const a=c.nibA*(k||1.0);const p=nib(pts,a,c.nibB,TH);p.hulls=K.sweep(pts,a,c.nibB,TH);return p;};
L['6']=c=>{const {C,S,ov}=c;const W=c.w(500);const g=new Gl();
  const r=arcRing(c,0,W,-ov,C*0.64,{wl:c.R*0.95,wr:c.R*0.9,tt:0.12});g.merge(r.g);
  const wx=Math.hypot(c.nibA*0.9*Math.cos(TH),c.nibB*Math.sin(TH))+1;
  const poly=nibS(c,pth([wx,C*0.30],['C',wx,C*0.62,W*0.13,C*0.98,W*0.58,C*1.03],['C',W*0.74,C*1.0,W*0.82,C*0.95,W*0.88,C*0.88]),0.90);g.add(...poly.hulls);
  vcut(c,g,poly,W*0.865,'L',false,0.85,C*0.62,C+60);
  return fin(g,W,[18,18]);};
L['9']=c=>{const W=c.w(500);const r=L['6'](c);return fin(r.g.xf(q=>[W-q[0],c.C-q[1]]),W,[18,18]);};
function waistLower(c,W,g,wy,x0,xw){ // lower bowl stroke from waist, open on the left, terminal spur
  const {C}=c;const poly=nibS(c,pth([xw,wy],['C',W*0.99,wy+C*0.03,W*0.99,-C*0.04,W*0.50,-C*0.025],['C',W*0.28,-C*0.012,W*0.17,C*0.075,W*0.17,C*0.14]),1.0);g.add(...poly.hulls);
  vcut(c,g,poly,W*0.185,'R',true,0.85,-60,C*0.34);return poly;}
L['З']=c=>{const {C}=c;const W=c.w(480);const g=new Gl();const wy=C*0.535,xw=W*0.34;
  const up=nibS(c,pth([W*0.15,C*0.86],['C',W*0.20,C*1.06,W*0.80,C*1.07,W*0.80,C*0.77],['C',W*0.80,C*0.62,W*0.60,wy+C*0.02,xw,wy]),0.97);g.add(...up.hulls);
  vcut(c,g,up,W*0.185,'R',false,0.85,C*0.66,C+60);
  waistLower(c,W,g,wy,0,xw);return fin(g,W,[18,16]);};
L['3']=c=>{const {C,S,hb,sr}=c;const W=c.w(470);const g=new Gl();const wy=C*0.535,xw=W*0.34;
  g.add(rect(W*0.08,C-hb*1.05,W*0.90,C));g.add([[W*0.08,C-hb*1.05+3],[W*0.08+c.bw*1.1,C-hb*1.05+3],[W*0.08,C-hb*1.05-c.bh*0.9]]);
  g.add([[W*0.90,C-hb*1.05+3],[W*0.90-c.bw*0.9,C-hb*1.05+3],[W*0.90,C-hb*1.05-c.bh*1.0]]);
  const dg=nibS(c,pth([W*0.70,C-hb*0.55],['C',W*0.70,C*0.74,W*0.58,wy+C*0.06,xw,wy]),0.95);g.add(...dg.hulls);
  waistLower(c,W,g,wy,0,xw);g.sub(rect(-60,wy-c.hb*0.9,xw-c.nibA*0.35,wy+c.hb*0.9));return fin(g,W,[18,16]);};
L['5']=c=>{const {C,S,hb,bar}=c;const W=c.w(480);const g=new Gl();const xs=W*0.16,sd=S*0.98;
  g.add(rect(xs,C*0.50,xs+sd,C),rect(xs,C-hb*1.05,W*0.90,C));
  g.add([[xs,C-hb*1.05+3],[xs+c.bw*1.1,C-hb*1.05+3],[xs,C-hb*1.05-c.bh*0.9]]);
  g.add([[W*0.90,C-hb*1.05+3],[W*0.90-c.bw*0.9,C-hb*1.05+3],[W*0.90,C-hb*1.05-c.bh*1.0]]);
  g.add([[xs,C*0.50+2],[xs+sd,C*0.50+2],[xs+sd,C*0.50-c.sh*0.5],[xs,C*0.50]]);
  const poly=nibS(c,pth([xs+sd*0.5,C*0.56],['C',W*0.58,C*0.72,W*0.99,C*0.60,W*0.97,C*0.30],['C',W*0.95,-C*0.05,W*0.42,-C*0.065,W*0.18,C*0.10]),1.0);g.add(...poly.hulls);
  vcut(c,g,poly,W*0.185,'R',true,0.85,-60,C*0.30);return fin(g,W,[14,14]);};
L['2']=c=>{const {C,S,hb}=c;const W=c.w(500);const g=new Gl();
  const poly=nibS(c,pth([W*0.12,C*0.84],['C',W*0.16,C*1.05,W*0.86,C*1.07,W*0.86,C*0.74],['C',W*0.86,C*0.46,W*0.30,C*0.28,W*0.14,hb*0.8]),1.0);g.add(...poly.hulls);
  vcut(c,g,poly,W*0.155,'R',false,0.85,C*0.66,C+60);
  g.add(rect(0,0,W*0.94,hb*1.1),bUR(c,W*0.94,hb*1.1,1.0));return fin(g,W,[14,10]);};
/* ---------- Cyrillic structure rebuilds */
function legL(c,W,x2,sd){ // flared left leg of Л/Д : returns polys. foot at (xb0), top under bar at tl
  const {S,C,sr,sh,hb}=c;const xb0=sr*0.55,tl=W*0.285,yb=C-hb*1.7,wl=S*0.9;
  const outer=pth([xb0,0],['C',xb0+(tl-xb0)*0.10,C*0.30,tl-6,C*0.62,tl,yb]);
  const inner=pth([tl+wl,yb],['C',tl+wl+4,C*0.62,xb0+wl+22,C*0.30,xb0+wl,0]);
  return {leg:outer.concat(inner),xb0,tl,wl,yb};}
L['Л']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(660),sd+S+2*sr+230);const x2=W-sr-sd;
  const l=legL(c,W,x2,sd);g.add(l.leg);g.add(flB(c,l.xb0,l.xb0+l.wl,sr*0.95,sr*0.45));
  g.add(rect(x2,sh-2,x2+sd,C-sh+2),flB(c,x2,x2+sd,sr*0.6,sr),flT(c,x2,x2+sd,0,sr),rect(l.tl,C-hb*1.7,x2+sd,C));
  g.add(flT(c,l.tl,l.tl+l.wl,sr*0.7,0).map(q=>q));return fin(g,W,[2,6]);};
L['Д']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(700),sd+S+2*sr+260);const x2=W-sr-sd;
  const l=legL(c,W,x2,sd);const y0=-hb*1.0;
  g.add(l.leg);g.add(rect(x2,0,x2+sd,C-sh+2),flT(c,x2,x2+sd,0,sr),rect(l.tl,C-hb*1.7,x2+sd,C));
  g.add(rect(sr*0.15,y0,W-sr*0.1,hb*0.5));
  g.add([[sr*0.15,y0+2],[sr*0.15+c.bw*1.2,y0+2],[sr*0.15,y0-c.bh*1.1]],[[W-sr*0.1,y0+2],[W-sr*0.1-c.bw*1.2,y0+2],[W-sr*0.1,y0-c.bh*1.1]]);
  g.add(rect(l.xb0-4,0,x2+sd,hb*0.6));
  g.add(flT(c,l.tl,l.tl+l.wl,sr*0.7,0).map(q=>q));return fin(g,W,[4,6]);};
L['Ж']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.70;const W=Math.max(c.w(880),sd+2*sr+620);const xc=W/2,yj=C*0.47;
  g.add(rect(xc-sd/2,sh-2,xc+sd/2,C-sh+2),flB(c,xc-sd/2,xc+sd/2,sr,sr),flT(c,xc-sd/2,xc+sd/2,sr,sr));
  const half=(gR)=>{const e=xc+sd/2-4,ax=W-sr*0.45-hb*0.2,lx=W-sr*0.65,lw=S*0.82;
    for(const p of leg(c,e,e+hb*1.45,ax-hb*1.5,ax,yj-4,C,null,[sr*0.45,sr*0.85]))gR.add(p);
    for(const p of leg(c,lx-lw,lx,e+4,e+4+lw*0.85,0,yj+hb*0.4,[sr*0.45,sr*0.85],null))gR.add(p);
    gR.add([[e,yj-hb*0.8],[e+hb*1.1,yj+hb*0.1],[e,yj+hb*0.8]]);};
  const gr=new Gl();half(gr);g.merge(gr);g.merge(gr.mirX(xc));return fin(g,W,[2,2]);};
L['Ф']=c=>{const g=new Gl(),{S,C,sr,sh,ov}=c;const W=c.w(760);const sd=S*0.78,xc=W/2;
  const y0=C*0.14,y1=C*0.86;const rx=W/2,ry=(y1-y0)/2;
  const outer=K.rr(0,y0-ov,W,y1+ov,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);g.add(outer);
  const wl=c.R*0.72,xl=wl,xr=xc-sd/2+8,Wi=xr-xl,ytop=y1+ov-c.h*0.95,ybot=y0-ov+c.h*0.95;
  const cl=safeLens(c,outer,xl+0.30*Wi,ytop,xl+0.72*Wi,ybot,xl,xr,0.28);g.sub(cl,mir(cl,xc));
  g.add(rect(xc-sd/2,sh-2,xc+sd/2,C-sh+2),flB(c,xc-sd/2,xc+sd/2,sr,sr),flT(c,xc-sd/2,xc+sd/2,sr,sr));return fin(g,W,[14,14]);};
L.U=c=>{const g=new Gl(),{S,C,sr,sh,h}=c;const W=Math.max(c.w(700),2*sr+S*1.8+220);const sd=S*0.72,x1=sr,x2=W-sr-sd;
  const wd=x2+sd-x1,rb=wd*0.5;
  g.add(K.rr(x1,-c.ov,x2+sd,C-sh+2,[0,0,[rb,rb*0.9],[rb,rb*0.9]],0.62));
  const xl=x1+S,xr=x2,rc=(xr-xl)*0.5;g.sub(K.rr(xl,h*0.95,xr,C+60,[0,0,[rc,rc*1.1],[rc,rc*1.1]],0.60));
  g.add(flT(c,x1,x1+S,sr,sr*0.5),flT(c,x2,x2+sd,sr*0.5,sr),flB(c,x2,x2+sd,0,sr*0.85));return fin(g,W,[6,6]);};
L.J=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(450),S+sr*1.7+170);const x=W-sr*0.7-S;
  g.add(rect(x,C*0.40,x+S,C-sh+2),flT(c,x,x+S,sr*1.0,sr*0.6));
  const kJ=Math.sqrt(Math.max((S/2)**2-(c.nibB*Math.sin(TH))**2,1))/Math.cos(TH)/c.nibA;const poly=nibS(c,pth([x+S*0.5,C*0.52],['L',x+S*0.5,C*0.45],['C',x+S*0.5,-C*0.02,x-0.12*W,-C*0.075,x-0.28*W,C*0.055]),kJ);g.add(...poly.hulls);
  vcut(c,g,poly,x-0.26*W,'R',true,0.85,-60,C*0.30);return fin(g,W,[0,6]);};
L.M=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const W=Math.max(c.w(880),2*sr+2*S+540);const xa=sr*0.8,dx=W*0.055,sd=S*1.0,xm=W/2;
  for(const p of leg(c,xa,xa+sd,xa+dx,xa+dx+sd,0,C,[sr*0.9,sr*0.6],[sr*0.9,0]))g.add(p);
  for(const p of leg(c,W-xa-sd,W-xa,W-xa-dx-sd,W-xa-dx,0,C,[sr*0.6,sr*0.9],[0,sr*0.9]))g.add(p);
  g.add([[xa+dx,C],[xa+dx+S*1.15,C],[xm+S*0.38,2],[xm+S*0.08,-10],[xm-S*0.28,2]]);
  g.add([[xm-S*0.10,2],[xm+S*0.42,2],[W-xa-dx-sd+4,C],[W-xa-dx-sd-hb*1.7,C]]);
  return fin(g,W,[2,2]);};
L.A=c=>{const g=new Gl(),{S,C,sr,sh}=c;const W=Math.max(c.w(700),2*sr+380);const wl=S*0.66,wr=S*1.02;
  const xlo=sr*0.85,xli=xlo+wl,xro=W-sr*0.85,xri=xro-wr,ay=C*0.80;
  // inner edges meet at apex height ay: solve ax
  const ax=(xli+xri)/2+10;
  const Lx=(y)=>xli+(ax-xli)*y/ay,Rx=(y)=>xri+(ax-xri)*y/ay;
  const tl=Lx(C)-wl,tr=Rx(C)+wr;
  for(const p of leg(c,xlo,xli,tl,Lx(C),0,C,[sr*0.9,sr*0.5],null))g.add(p);
  for(const p of leg(c,xri,xro,Rx(C),tr,0,C,[sr*0.5,sr*0.9],null))g.add(p);
  g.add([[tl,C],[tr,C],[tr,C-8],[tl,C-8]]);
  g.add([[Lx(ay)-2,ay-2],[ax,ay],[Rx(ay)+2,ay-2],[Rx(C),C],[Lx(C),C]]);
  const xoR=xro+(tr-xro)*(C-sh)/C;g.add([[tr-8,C],[tr+sr*1.0,C],[xoR,C-sh],[xoR-8,C-sh]]);
  const yt=C*0.42,y1=C*0.17,y2=C*0.345;g.add([[Lx(y1)-6,y1],[Rx(y2)+6,y2],[Rx(yt)+6,yt],[Lx(yt)-6,yt]]);
  return fin(g,W,[2,2]);};
L['7']=c=>{const g=new Gl(),{S,C,hb,sr,sh}=c;const W=c.w(520);
  g.add(rect(6,C-hb,W-4,C),bDL(c,6,C-hb),[[W-4,C],[W-4,C-hb+3],[W-4-sr*0.2,C-hb+3],[W-4,C-hb-sh*0.6]]);
  for(const p of leg(c,W*0.20,W*0.20+S*0.95,W-4-S*1.0,W-4,0,C-hb+3,[sr*0.6,sr*0.55],null))g.add(p);
  return fin(g,W,[6,6]);};
/* ---------- symbols (round 2) */
root.KortesPunctR2=function(P){
 const plainRing=(c,x0,y0,x1,y1,wall)=>{const rx=(x1-x0)/2,ry=(y1-y0)/2;const o=K.rr(x0,y0,x1,y1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);const i=K.rr(x0+wall,y0+wall*0.8,x1-wall,y1-wall*0.8,[[rx-wall,ry-wall*0.8],[rx-wall,ry-wall*0.8],[rx-wall,ry-wall*0.8],[rx-wall,ry-wall*0.8]],0.62);return {o,i};};
 P['©']=c=>{const {C,ov}=c;const D=C+2*ov;const g=new Gl();const pr=plainRing(c,0,-ov,D,C+ov,c.h*1.25);g.add(pr.o);g.sub(pr.i);
  const cc=L.C(c);const sx=0.40,cx=D/2-cc.W*sx/2,cy=C/2-C*sx*0.5-ov*0.2;
  g.merge(cc.g.xf(q=>[cx+q[0]*sx,cy+q[1]*sx]));return fin(g,D,[16,16]);};
 P['@']=c=>{const {C,S,ov,sh,sr}=c;const W=c.w(860);const g=new Gl();
  /* W88: a real @ — heavy O-like ring with lens counter, an inner `a` (lens bowl, stem with a wedge ear), the ring OPEN at the lower right: the right/bottom wall is cut away with a slanted wedge terminal and the a-stem foot runs on into a thin pointed blade tail under the opening (the swash of the face) */
  const pr=plainRing(c,0,-ov,W,C+ov,S*0.62);g.add(pr.o);g.sub(pr.i);
  const bx0=W*0.27,bx1=W*0.64,by0=C*0.20,by1=C*0.68;const rx=(bx1-bx0)/2,ry=(by1-by0)/2;
  const ao=K.rr(bx0,by0,bx1,by1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);g.add(ao);
  const wl=S*0.52,sw=S*0.60;const xl=bx0+wl,xr=bx1-sw,Wi=xr-xl;g.sub(safeLens(c,ao,xl+0.12*Wi,by1-c.h*0.7,xr-0.12*Wi,by0+c.h*0.7,xl,xr,0.28));
  g.add(rect(bx1-sw,-ov+c.h*0.5,bx1+S*0.02,by1+C*0.05));
  g.add([[bx1-sw,by1+C*0.05],[bx1+S*0.02,by1+C*0.05],[bx1+S*0.02,by1+C*0.05+sh*0.6]]);
  const nx=bx1+S*0.03;g.sub([[nx,-ov-80],[W+80,-ov-80],[W+80,C*0.47],[W-S*1.0,C*0.37],[nx,C*0.20]]);
  const tx=bx1-sw*0.75,ty=-ov+S*0.30;
  g.add(blade(pth([tx,ty],["C",tx+W*0.16,ty-C*0.02,W*0.80,-C*0.15,W*1.02,-C*0.10]),t=>S*0.42*Math.pow(1-t,0.95)+(t<0.985?4:0)));
  return fin(g,W*1.0,[16,10]);};
 P['₽']=c=>{const r=L.P(c);const {g,W}=r;const {S,C,sr}=c;const xs=sr+S*0.95;
  g.add(rect(sr*0.35,C*0.215,xs+S*0.55,C*0.215+c.bar*0.85));return fin(g,W,[8,6]);};
 P['%']=c=>{const g=new Gl(),S=c.S,W=c.w(860),C=c.C;
  for(const p of leg(c,W*0.10,W*0.10+S*0.55,W*0.90-S*0.55,W*0.90,-10,C+10,null,null))g.add(p);
  const rings=[[0,C*0.40,W*0.40,C+8],[W*0.60,-8,W,C*0.60]];const cn=[];
  for(const [x0,y0,x1,y1] of rings){const rx=(x1-x0)/2,ry=(y1-y0)/2;const o=K.rr(x0,y0,x1,y1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);g.add(o);
    const w=S*0.50,xl=x0+w,xr=x1-w,Wi=xr-xl;cn.push(safeLens(c,o,xl+0.12*Wi,y1-c.h*0.8,xr-0.12*Wi,y0+c.h*0.8,xl,xr,0.28));}
  g.sub(...cn);return fin(g,W,[20,20]);};
 P['№']=c=>{const n=L.N(c);const g=n.g;const {C,S}=c;const ox=n.W+16,ow=300,oy0=C*0.42,oy1=C*1.0;const rx=ow/2,ry=(oy1-oy0)/2;
  const oo=K.rr(ox,oy0,ox+ow,oy1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);g.add(oo);const w=S*0.50,xl=ox+w,xr=ox+ow-w,Wi=xr-xl;g.sub(safeLens(c,oo,xl+0.14*Wi,oy1-c.h*0.8,xr-0.14*Wi,oy0+c.h*0.8,xl,xr,0.28));
  g.add(rect(ox+20,C*0.30,ox+ow-20,C*0.30+c.bar*0.8));return fin(g,ox+ow,[6,10]);};
 P['&']=c=>{const g=new Gl(),{S,C,ov}=c;const W=c.w(700);
  const up=[W*0.16,C*0.56,W*0.66,C+ov],lo=[0,-ov,W*0.80,C*0.62];const cn=[];
  for(const [x0,y0,x1,y1] of [up,lo]){const rx=(x1-x0)/2,ry=(y1-y0)/2;const o=K.rr(x0,y0,x1,y1,[[rx,ry],[rx,ry],[rx,ry],[rx,ry]],0.62);g.add(o);
    const w=(y1-y0>400?S*0.72:S*0.60),xl=x0+w,xr=x1-w,Wi=xr-xl;cn.push(safeLens(c,o,xl+0.14*Wi,y1-c.h*0.85,xr-0.14*Wi,y0+c.h*0.85,xl,xr,0.28));}
  g.sub(...cn);
  // diagonal from the upper loop to the lower-right foot, and a short arm to the upper right
  for(const p of leg(c,W-S*1.05,W+0,W*0.30,W*0.30+S*0.9,0,C*0.60,[0,c.sr*0.3],null))g.add(p);
  g.add(flB(c,W-S*1.05,W,0,c.sr*0.7));
  g.add([[W*0.46,C*0.49],[W*0.46+S*0.8,C*0.50],[W*0.97,C*0.64],[W*0.97,C*0.64+c.hb*1.0],[W*0.66,C*0.67],[W*0.46,C*0.60]]);
  return fin(g,W+8,[14,8]);};
};

})(typeof window!=='undefined'?window:globalThis);
/* W88 A: расширенный набор «Кортеса» (только прописные; строчные кодовые точки дают те же знаки).
   Надстрочные знаки — клинья и ромбы той же семьи, что засечки и точки Ё; Є, Ґ, Ў, Ђ… собраны из собственных деталей шрифта. */
(function(root){'use strict';
const K=root.KortesCore,A=root.KortesAtoms,L=root.KortesLetters;
const {rr,rect,quad,dia,blade,pth,Gl,circ,cub}=K;const {flB,flT,fin,bowl,breve}=A;
const PI=Math.PI;
/* ---------- знаки: g.add/sub в координатах буквы; y0 — нижняя кромка знака над прописной */
const YM=58;
const dotP=(c,x)=>{const d=c.S*0.34;return dia(x,c.C+95,d*0.8,d);};
const MK={
 dot:(g,c,x)=>g.add(dotP(c,x)),
 dier:(g,c,x)=>g.add(dotP(c,x-c.S*0.5),dotP(c,x+c.S*0.5)),
 acute:(g,c,x)=>{const S=c.S,y0=c.C+YM,h=S*0.98,dx=S*0.30;g.add(quad([x-dx-S*0.17,y0],[x-dx+S*0.17,y0],[x+dx+S*0.30,y0+h],[x+dx-S*0.30,y0+h]));},
 grave:(g,c,x)=>{const S=c.S,y0=c.C+YM,h=S*0.98,dx=S*0.30;g.add(quad([x+dx-S*0.17,y0],[x+dx+S*0.17,y0],[x-dx+S*0.30,y0+h],[x-dx-S*0.30,y0+h]));},
 dacute:(g,c,x)=>{MK.acute(g,c,x-c.S*0.48);MK.acute(g,c,x+c.S*0.48);},
 circ:(g,c,x)=>{const S=c.S,y0=c.C+YM,hw=S*0.68,h=S*0.98,t=S*0.34;g.add([[x-hw,y0],[x-hw+t,y0],[x,y0+h-t*0.95],[x+hw-t,y0],[x+hw,y0],[x,y0+h]]);},
 caron:(g,c,x)=>{const S=c.S,y0=c.C+YM,hw=S*0.56,h=S*1.0,t=S*0.32;g.add([[x-hw,y0+h],[x-hw+t,y0+h],[x,y0+t*0.95],[x+hw-t,y0+h],[x+hw,y0+h],[x,y0]]);},
 macron:(g,c,x)=>{const S=c.S,y=c.C+YM+S*0.42,hw=S*0.68,t=Math.max(c.h*0.62,26);g.add([[x-hw,y],[x-hw+t*0.7,y+t],[x+hw-t*0.7,y+t],[x+hw,y],[x+hw-t*0.7,y-t],[x-hw+t*0.7,y-t]]);},
 breve:(g,c,x)=>{/* Latin breve: bowl with a thick middle, same visual size as acute and circumflex */const S=c.S,y0=c.C+YM,hw=S*0.80,h=S*1.0,t=S*0.52,e=S*0.18,yt=y0+h;
   const o=[[x-hw,yt]].concat(cub([x-hw,yt],[x-hw*0.96,yt-h*0.72],[x-hw*0.42,y0],[x,y0],14),cub([x,y0],[x+hw*0.42,y0],[x+hw*0.96,yt-h*0.72],[x+hw,yt],14),[[x+hw-e,yt]],cub([x+hw-e,yt],[x+hw*0.74,yt-h*0.42],[x+hw*0.34,y0+t],[x,y0+t],14),cub([x,y0+t],[x-hw*0.34,y0+t],[x-hw*0.74,yt-h*0.42],[x-hw+e,yt],14));g.add(o);},
 ring:(g,c,x)=>{const S=c.S,r=S*0.62,y=c.C+YM+r;g.add(circ(x,y,r,36));g.sub(circ(x,y,r-S*0.27,36));},
 tilde:(g,c,x)=>{const S=c.S,y=c.C+YM+S*0.50,hw=S*0.92;
   const pts=pth([x-hw,y-S*0.12],['C',x-hw*0.55,y+S*0.50,x-hw*0.10,y+S*0.50,x,y+S*0.0],['C',x+hw*0.10,y-S*0.50,x+hw*0.55,y-S*0.50,x+hw,y+S*0.12]);
   g.add(blade(pts,t=>S*(0.20+0.30*Math.sin(Math.PI*t))+4));}};
/* нижние знаки: x — центр (или правый край) основания */
const BT={
 ced:(g,c,x)=>{const S=c.S;g.add(blade(pth([x+8,36],['C',x+S*0.55,-28,x+S*0.62,-92,x-S*0.05,-150]),t=>S*0.46*(1-0.55*t)+4));},
 comma:(g,c,x)=>{const S=c.S;g.add(dia(x,-96,S*0.27,S*0.34));g.add(blade(pth([x,-96],['C',x-S*0.06,-135,x-S*0.28,-170,x-S*0.58,-200]),t=>S*0.42*(1-0.80*t)+4));},
 ogon:(g,c,x)=>{const S=c.S;g.add(blade(pth([x,36],['C',x-S*0.05,-40,x+S*0.20,-92,x+S*0.80,-80]),t=>S*0.44*(1-0.62*t)+4));}};
const pts=g=>{const o=[];for(const p of g.pos)for(const q of p)o.push(q);return o;};
const topCx=(g,c)=>{let a=1e9,b=-1e9;for(const q of pts(g))if(q[1]>c.C-60&&q[1]<=740){if(q[0]<a)a=q[0];if(q[0]>b)b=q[0];}return a>b?0:(a+b)/2;};
const botX=(g,c,right)=>{let a=1e9,b=-1e9;for(const q of pts(g))if(q[1]<24&&q[1]>-40){if(q[0]<a)a=q[0];if(q[0]>b)b=q[0];}return a>b?0:right?b:(a+b)/2;};
const topCxA=(g,c,r)=>{const x=topCx(g,c);return x||r.W/2;};
const EXT_BASE={};
function comp(key,base,mark,opt){opt=opt||{};EXT_BASE[key]=base;
  L[key]=c=>{const r=L[base](c);const g=r.g;
    if(BT[mark]){const x=mark==='ogon'?(opt.mid?botX(g,c,false):botX(g,c,true)-c.S*0.62):botX(g,c,false);BT[mark](g,c,x);}
    else MK[mark](g,c,opt.cx?opt.cx(c,r,g):topCxA(g,c,r),r.W);
    return {g,W:r.W,sb:r.sb};};}
const SPEC={};
/* ---------- латиница: Latin-1 и Latin Extended-A (прописные) */
const LAT_EXT=[
 ['Ā','A','macron'],['Ă','A','breve'],['Ć','C','acute'],['Ĉ','C','circ'],['Ċ','C','dot'],['Č','C','caron'],['Ď','D','caron'],
 ['Ē','E','macron'],['Ĕ','E','breve'],['Ė','E','dot'],['Ě','E','caron'],['Ĝ','G','circ'],['Ğ','G','breve'],['Ġ','G','dot'],['Ĥ','H','circ'],
 ['Ĵ','J','circ'],['Ĺ','L','acute'],['Ń','N','acute'],['Ň','N','caron'],['Ō','O','macron'],['Ŏ','O','breve'],['Ő','O','dacute'],
 ['Ŕ','R','acute'],['Ř','R','caron'],['Ś','S','acute'],['Ŝ','S','circ'],['Š','S','caron'],['Ť','T','caron'],
 ['Ũ','U','tilde'],['Ū','U','macron'],['Ŭ','U','breve'],['Ů','U','ring'],['Ű','U','dacute'],['Ŵ','W','circ'],['Ŷ','Y','circ'],['Ÿ','Y','dier'],
 ['Ź','Z','acute'],['Ż','Z','dot'],['Ž','Z','caron'],
 ['À','A','grave'],['Á','A','acute'],['Â','A','circ'],['Ã','A','tilde'],['Ä','A','dier'],['Å','A','ring'],['È','E','grave'],['É','E','acute'],['Ê','E','circ'],['Ë','E','dier'],
 ['Ì','I','grave'],['Í','I','acute'],['Î','I','circ'],['Ï','I','dier'],['Ĩ','I','tilde'],['Ī','I','macron'],['Ĭ','I','breve'],['İ','I','dot'],
 ['Ñ','N','tilde'],['Ò','O','grave'],['Ó','O','acute'],['Ô','O','circ'],['Õ','O','tilde'],['Ö','O','dier'],['Ù','U','grave'],['Ú','U','acute'],['Û','U','circ'],['Ü','U','dier'],['Ý','Y','acute'],
 ['Ç','C','ced'],['Ş','S','ced'],['Ţ','T','ced'],['Ģ','G','comma'],['Ķ','K','comma'],['Ļ','L','comma'],['Ņ','N','comma'],['Ŗ','R','comma'],
 ['Ą','A','ogon'],['Ę','E','ogon'],['Ų','U','ogon'],['Į','I','ogon',{mid:true}]];
for(const [ch,b,m,o] of LAT_EXT)comp(ch,b,m,o);
const bar=c=>Math.max(c.bar*0.85,c.h*0.9);
const lbox=g=>g.bbox();
/* Đ Ð: D со штрихом через ствол */
L['Đ']=c=>{const r=L.D(c);const g=r.g;const ym=c.C*0.50,t=bar(c);g.add(rect(-S0(c)*0.0,ym-t/2,c.sr+c.S*1.40,ym+t/2));return {g,W:r.W,sb:r.sb};};
const S0=c=>c.S;
EXT_BASE['Đ']='D';
L['Ð']=L['Đ'];EXT_BASE['Ð']='D';
L['Ħ']=c=>{const r=L.H(c);const g=r.g,t=bar(c);g.add(rect(-6,c.C*0.83-t/2,r.W+6,c.C*0.83+t/2));return {g,W:r.W,sb:r.sb};};EXT_BASE['Ħ']='H';
L['Ŧ']=c=>{const r=L.T(c);const g=r.g,t=bar(c),xc=r.W/2;g.add(rect(xc-c.S*1.0,c.C*0.46-t/2,xc+c.S*1.0,c.C*0.46+t/2));return {g,W:r.W,sb:r.sb};};EXT_BASE['Ŧ']='T';
L['Ł']=c=>{const r=L.L(c);const g=r.g,t=bar(c),xs=c.sr;
  {const xa=xs-c.S*0.75,xb=xs+c.S*1.75,yc=c.C*0.45,dy=c.C*0.16,th=t*1.5;g.add(quad([xa,yc-dy/2-th/2],[xb,yc+dy/2-th/2],[xb,yc+dy/2+th/2],[xa,yc-dy/2+th/2]));}return {g,W:r.W,sb:r.sb};};EXT_BASE['Ł']='L';
L['Ø']=c=>{const r=L.O(c);const g=r.g,t=Math.max(c.h*1.25,c.bar),W=r.W;
  g.add(quad([W*0.02,-18],[W*0.02+t*1.9,-18],[W*0.98,c.C+18],[W*0.98-t*1.9,c.C+18]));return {g,W,sb:r.sb};};EXT_BASE['Ø']='O';
L['Ŋ']=c=>{const r=L.N(c);const g=r.g,{S,sr}=c;const sl=S*0.8,x2=r.W-sr-sl,xc=x2+sl*0.5;
  g.add(rect(x2,c.sh*0.4,x2+sl,c.C*0.2));
  g.add(blade(pth([xc,c.C*0.14],['C',xc,-c.C*0.06,xc-0.14*r.W,-c.C*0.20,xc-0.32*r.W,-c.C*0.12]),t=>S*0.92*(1-0.62*t)+6));
  return {g,W:r.W,sb:r.sb};};EXT_BASE['Ŋ']='N';
L['Ŀ']=c=>{const r=L.L(c);const g=r.g,d=c.S*0.34;g.add(dia(r.W*0.82,c.C*0.40,d*0.8,d*1.0));return {g,W:r.W,sb:r.sb};};EXT_BASE['Ŀ']='L';
L['Ľ']=c=>{const r=L.L(c);const g=r.g,{S,sr}=c,w=S*0.70,x=sr+S+sr+36;g.add([[x,c.C+30],[x+w,c.C+30],[x+w*0.62,c.C-S*1.25],[x+w*0.38,c.C-S*1.25]]);return {g,W:r.W,sb:r.sb};};EXT_BASE['Ľ']='L';
const joinX=(a,b,gap)=>{const bb=b.g.bbox(),ab=a.g.bbox();const g=new Gl().merge(b.g.shift(ab.x1+gap-bb.x0,0));g.merge(a.g);const nb=g.bbox();return {g,W:nb.x1-nb.x0,sb:[a.sb[0],b.sb[1]]};};
L['Ĳ']=c=>joinX(L.I(c),L.J(c),c.S*0.42);EXT_BASE['Ĳ']='I';
L['Œ']=c=>{const o=L.O(c),e=L.E(c);const g=new Gl().merge(o.g);const eb=e.g.bbox(),ob=o.g.bbox();
  g.merge(e.g.shift(ob.x1-c.S*0.96-(eb.x0+c.sr),0));const nb=g.bbox();return {g,W:nb.x1-nb.x0,sb:[o.sb[0],e.sb[1]]};};EXT_BASE['Œ']='O';
L['Æ']=c=>{const a=L.A(c),e=L.E(c);const g=new Gl().merge(a.g);const ab=a.g.bbox(),eb=e.g.bbox();
  const dx=ab.x1-c.S*0.55-(eb.x0+c.sr);g.merge(e.g.shift(dx,0));
  g.add(rect(ab.x0+(ab.x1-ab.x0)*0.5-4,c.C-c.hb,eb.x0+dx+c.S*0.9,c.C));
  const nb=g.bbox();return {g,W:nb.x1-nb.x0,sb:[a.sb[0],e.sb[1]]};};EXT_BASE['Æ']='A';
/* ---------- кириллица: украинская, белорусская, сербская/македонская, казахская */
L['Є']=c=>{const {C,bar:b}=c;const r=L.C(c);const g=r.g,W=r.W;const ym=C*0.50,t=b*0.8;g.add(rect(W*0.10,ym-t/2,W*0.70,ym+t/2));return {g,W,sb:[22,10]};};EXT_BASE['Є']='C';
L['Ї']=c=>{const r=L.I(c);MK.dier(r.g,c,r.W/2);return {g:r.g,W:r.W,sb:r.sb};};EXT_BASE['Ї']='I';
L['Ґ']=c=>{const r=L['Г'](c);const g=r.g,{S,C,hb}=c,W=r.W;g.add([[W-S*0.62,C-2],[W-5,C-2],[W-5,C+120],[W-S*0.62,C+56]]);return {g,W,sb:r.sb};};EXT_BASE['Ґ']='Г';
L['Ў']=c=>{const r=L['У'](c);r.g.add(breve(c,r.W/2+4,Math.min(r.W*0.46,330)));/* the font's own Й breve */return {g:r.g,W:r.W,sb:r.sb};};EXT_BASE['Ў']='У';
/* арка «н»: левая стойка, плечо, правая нога (общая основа Ђ Ћ Һ) */
function arch(c){const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98,sl=S*0.80;const W=Math.max(c.w(700),sd+sl+2*sr+210);const x1=sr,x2=W-sr-sl;
  const gapA=x2-(x1+sd),ri=Math.max(0,Math.min(sr,(gapA-70)/2)),top=C*0.64,rx=(x2+sl-x1)*0.46,ry=C*0.30;
  const o=rr(x1,C*0.10,x2+sl,top,[0,[rx,ry],0,0],0.60);g.add(o);
  const xl=x1+sd,xr=x2,rx2=Math.max(10,(xr-xl)*0.5),ry2=Math.min(ry*0.9,rx2);
  g.sub(rr(xl,-30,xr,top-c.h*0.92,[[rx2*0.9,ry2],[rx2*0.9,ry2],0,0],0.60));
  g.add(rect(x1,sh-2,x1+sd,C-sh+2),flB(c,x1,x1+sd,sr,ri),flT(c,x1,x1+sd,sr,sr),rect(x2,sh-2,x2+sl,C*0.40));
  return {g,W,x1,x2,sd,sl,top,ri};}
L['Һ']=c=>{const a=arch(c);a.g.add(flB(c,a.x2,a.x2+a.sl,a.ri,sc(c)));return fin(a.g,a.W,[8,8]);};
const sc=c=>c.sr;
L['Ћ']=c=>{const a=arch(c),{S,C,hb}=c;a.g.add(flB(c,a.x2,a.x2+a.sl,a.ri,c.sr));const y=C*0.80;a.g.add(rect(c.sr*0.0,y-hb*0.5,a.x1+a.sd+S*0.7,y+hb*0.5));return fin(a.g,a.W,[8,8]);};
L['Ђ']=c=>{const a=arch(c),{S,C,hb}=c;const g=a.g;g.add(rect(c.sr*0.0,C-hb*1.05,a.x2+a.sl*0.55,C));
  const xc=a.x2+a.sl*0.5;g.add(rect(a.x2,-C*0.02,a.x2+a.sl,C*0.2));g.add(blade(pth([xc,C*0.12],['C',xc,-C*0.10,xc-0.02*a.W,-C*0.19,xc-a.W*0.22,-C*0.15]),t=>a.sl*(1-0.55*t)+6));return fin(g,a.W,[8,8]);};
L['Љ']=c=>{const l=L['Л'](c),{S,C}=c;const g=l.g;const bb=l.g.bbox();const xs=bb.x1-c.sr*0.55;
  const b=bowl(c,xs,xs+Math.max(c.w(380),S*2.4),0,C*0.62,{r:C*0.31,wr:S*0.84});g.add(b.outer);g.sub(b.counter);return fin(g,l.W+Math.max(c.w(380),S*2.4)-c.sr*0.55,[8,6]);};
L['Њ']=c=>{const l=L.H(c),{S,C}=c;const g=l.g;const xs=l.W-c.sr;
  const b=bowl(c,xs,xs+Math.max(c.w(380),S*2.4),0,C*0.62,{r:C*0.31,wr:S*0.84});g.add(b.outer);g.sub(b.counter);return fin(g,l.W+Math.max(c.w(380),S*2.4)-c.sr,[8,6]);};
L['Џ']=c=>{const g=new Gl(),{S,C,sr,sh,hb}=c;const sd=S*0.98;const W=Math.max(c.w(700),2*sd+2*sr+170);const x1=sr,x2=W-sr-sd;
  g.add(rect(x1,sh-2,x1+sd,C-sh+2),rect(x2,sh-2,x2+sd,C-sh+2),rect(x1,0,x2+sd,hb*1.1));
  g.add(flB(c,x1,x1+sd,sr,0),flT(c,x1,x1+sd,sr,sr*0.5),flT(c,x2,x2+sd,sr*0.5,sr),flB(c,x2,x2+sd,0,sr));
  const xc=W/2,sw=S*0.9,yb=-C*0.2;g.add(rect(xc-sw/2,yb+sh-2,xc+sw/2,hb),flB(c,xc-sw/2,xc+sw/2,sr,sr,yb));return fin(g,W,[6,6]);};
L['Ә']=c=>{const r=L.O(c);const g=r.g,{C,bar:b}=c,W=r.W;const ym=C*0.5,t=b*0.8;g.add(rect(W*0.20,ym-t/2,W*0.90,ym+t/2));
  const xw=c.S*1.30;g.sub([[-40,ym+t*0.5-1],[xw,ym+t*0.5-1],[xw+W*0.14,C+30],[-40,C+30]]);return {g,W,sb:r.sb};};
L['Ғ']=c=>{const r=L['Г'](c);const g=r.g,t=bar(c),{S,sr}=c;g.add(rect(0,c.C*0.50-t/2,sr+S+S*0.55,c.C*0.50+t/2));return {g,W:r.W,sb:r.sb};};
L['Қ']=c=>{const r=L.K(c);const g=r.g,{S,sr,sh}=c;const xr=botX(g,c,true);
  g.add(rect(xr-S*1.75,-c.C*0.20+sh-2,xr-S*0.87,sh+6),flB(c,xr-S*1.75,xr-S*0.87,sr*0.6,sr*0.6,-c.C*0.20));return {g,W:r.W,sb:r.sb};};
L['Ң']=c=>{const r=L.H(c);const g=r.g,{S,sr,sh}=c;const sd=S*0.98,x2=r.W-sr-sd;g.add(rect(x2,-c.C*0.20+sh-2,x2+sd,sh+6),flB(c,x2,x2+sd,sr*0.6,sr*0.6,-c.C*0.20));return {g,W:r.W,sb:r.sb};};
L['Ө']=c=>{const r=L.O(c);const g=r.g,{C,bar:b}=c,W=r.W;const ym=C*0.5,t=b*0.8;g.add(rect(W*0.14,ym-t/2,W*0.86,ym+t/2));return {g,W,sb:r.sb};};
L['Ұ']=c=>{const r=L.Y(c);const g=r.g,t=bar(c),xc=r.W/2;g.add(rect(xc-c.S*0.95,c.C*0.20-t/2,xc+c.S*0.95,c.C*0.20+t/2));return {g,W:r.W,sb:r.sb};};
Object.assign(EXT_BASE,{'Ђ':'Г','Ћ':'Г','Һ':'Н','Љ':'Л','Њ':'Н','Џ':'Ц','Ә':'O','Ғ':'Г','Қ':'К','Ң':'Н','Ө':'O','Ұ':'Y'});
K.EXT_BASE=EXT_BASE;
K.EXT_CY='ЄІЇҐЎЂЈЉЊЋЏЅӘҒҚҢӨҰҮҺ';
K.EXT_LAT=[...LAT_EXT.map(x=>x[0]),'Đ','Ð','Ħ','Ŧ','Ł','Ø','Ŋ','Ŀ','Ľ','Ĳ','Œ','Æ'].join('');
})(typeof window!=='undefined'?window:globalThis);
/* punctuation, symbols, assembly (spacing, alternates, kerning, charset) */
(function(root){'use strict';
const K=root.KortesCore;
const LT={ctx:root.KortesLettersCtx,L:root.KortesLetters,atoms:root.KortesAtoms};
const L=LT.L,ctx=LT.ctx,A=LT.atoms;const {rr,lens,rect,quad,dia,nib,blade,pth,Gl,circ}=K;const {flB,flT,leg,ringO,fin}=A;
const PI=Math.PI;
const D=(c)=>({rx:c.S*0.40,ry:c.S*0.50});
/* ---------- punctuation / symbols (first drafts in the face's wedge + diamond logic) */
function comma(c,up){const g=new Gl(),{S}=c;const d=D(c);g.add(dia(d.rx+4,d.ry*1.0+10,d.rx,d.ry));g.add(blade(pth([d.rx+4,d.ry+0],['C',d.rx+4,-40,d.rx-30,-100,d.rx-70,-150]),t=>S*0.62*(1-t*0.9)+4));return g;}
const P={};
P['.']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,d.ry+2,d.rx,d.ry));return fin(g,2*d.rx+8,[22,22]);};
P[',']=c=>{const g=comma(c);return fin(g,c.S*0.8+30,[18,18]);};
P[':']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,d.ry+2,d.rx,d.ry),dia(d.rx+4,c.C*0.62,d.rx,d.ry));return fin(g,2*d.rx+8,[22,22]);};
P[';']=c=>{const d=D(c),g=comma(c);g.add(dia(d.rx+4,c.C*0.62,d.rx,d.ry));return fin(g,c.S*0.8+30,[18,18]);};
P['!']=c=>{const d=D(c),{S,C}=c,g=new Gl();const w=S*1.0;g.add([[0,C],[w,C],[w*0.68,d.ry*2+70],[w*0.32,d.ry*2+70]],dia(w/2,d.ry+2,d.rx,d.ry));return fin(g,w,[22,22]);};
P['?']=c=>{const {S,C}=c,d=D(c),g=new Gl();const W=c.w(430);
  const p=pth([W*0.10,0.80*C],['C',W*0.14,1.04*C,W*0.90,1.06*C,W*0.88,0.74*C],['C',W*0.86,0.52*C,W*0.46,0.50*C,W*0.46,0.30*C]);g.add(...K.sweep(p,c.nibA*0.95,c.nibB,26*PI/180));g.add(dia(W*0.46,d.ry+2,d.rx,d.ry));return fin(g,W,[14,10]);};
const dash=(f)=>(c)=>{const g=new Gl(),W=c.w(f),t=c.hb*1.25,y=c.C*0.34;g.add([[0,y-t/2],[W-t*0.5,y-t/2],[W,y+t/2],[t*0.5,y+t/2]]);return fin(g,W,[18,18]);};
P['-']=dash(260);P['–']=dash(480);P['—']=dash(860);P['‒']=c=>{return dash(520)(c);};
P['−']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.15,y=c.C*0.40;g.add(rect(0,y-t/2,W,y+t/2));return fin(g,W,[40,40]);};
P['+']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.15,y=c.C*0.40,s=c.S*0.8;g.add(rect(0,y-t/2,W,y+t/2),rect(W/2-s/2,y-W/2+t*0.0,W/2+s/2,y+W/2));return fin(g,W,[40,40]);};
P['=']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.05;g.add(rect(0,c.C*0.40+60,W,c.C*0.40+60+t),rect(0,c.C*0.40-60-t,W,c.C*0.40-60));return fin(g,W,[40,40]);};
P['•']=c=>{const g=new Gl();const r=c.S*0.62;g.add(circ(r,c.C*0.5,r));return fin(g,2*r,[40,40]);};
P['·']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,c.C*0.42,d.rx,d.ry));return fin(g,2*d.rx+8,[30,30]);};
P['°']=c=>{const g=new Gl();const r=c.S*0.52;g.add(circ(r,c.C-r,r));g.sub(circ(r,c.C-r,r-Math.min(c.h*0.9,r*0.58)));return fin(g,2*r,[24,24]);};
P['*']=c=>{const g=new Gl(),S=c.S,y=c.C-S*0.72;const W=S*1.5;const bar=(a)=>{const hw=S*0.17,l=S*0.72;const ca=Math.cos(a),sa=Math.sin(a);return [[W/2-l*ca-hw*sa,y-l*sa+hw*ca],[W/2+l*ca-hw*sa,y+l*sa+hw*ca],[W/2+l*ca+hw*sa,y+l*sa-hw*ca],[W/2-l*ca+hw*sa,y-l*sa-hw*ca]];};
  g.add(bar(PI/2),bar(PI/2+PI/3),bar(PI/2-PI/3));return fin(g,W,[30,30]);};
P['/']=c=>{const g=new Gl(),W=c.w(380);for(const p of leg(c,0,c.S*0.8,W-c.S*0.8,W,-50,c.C+50,null,null))g.add(p);return fin(g,W,[0,0]);};
P['\\']=c=>{const g=new Gl(),W=c.w(380);for(const p of leg(c,W-c.S*0.8,W,0,c.S*0.8,-50,c.C+50,null,null))g.add(p);return fin(g,W,[0,0]);};
P['|']=c=>{const g=new Gl();g.add(rect(0,-170,c.S*0.8,c.C+110));return fin(g,c.S*0.8,[40,40]);};
P['(']=c=>{const g=new Gl(),S=c.S;const p=pth([S*1.6,c.C+90],['C',S*0.3,c.C*0.7,S*0.3,c.C*0.0,S*1.6,-190]);g.add(...K.sweep(p,c.nibA*0.9,c.nibB,40*PI/180));return fin(g,S*1.7,[16,10]);};
P[')']=c=>{const f=P['('](c);return fin(f.g.mirX(f.W/2),f.W,[10,16]);};
P['#']=c=>{const g=new Gl(),S=c.S,W=c.w(640),t=c.bar;for(const y of [c.C*0.62,c.C*0.30])g.add(rect(0,y,W,y+t));for(const x of [W*0.30,W*0.62])g.add(quad([x-S*0.2,0],[x+S*0.5,0],[x+S*0.5+90,c.C],[x-S*0.2+90,c.C]));return fin(g,W+90,[20,20]);};
P['%']=c=>{const g=new Gl(),S=c.S,W=c.w(860);const sm=(x0,y0,w,h)=>{const r=ringO(c,0,w,S*0.7,S*0.7,{tt:0.1});const f=h/(c.C+20);return [r.outer.map(q=>[x0+q[0],y0+(q[1]+10)*f]),r.counter.map(q=>[x0+q[0],y0+(q[1]+10)*f])];};
  const a=sm(0,c.C*0.42,W*0.38,c.C*0.58),b=sm(W*0.62,0,W*0.38,c.C*0.58);g.add(a[0],b[0]);g.sub(a[1],b[1]);
  for(const p of leg(c,W*0.12,W*0.12+S*0.55,W*0.88-S*0.55,W*0.88,-10,c.C+10,null,null))g.add(p);return fin(g,W,[20,20]);};
P['@']=c=>{const g=new Gl(),W=c.w(760);const r=ringO(c,0,W,c.S*0.8,c.S*0.8,{tt:0.1});g.add(r.outer);g.sub(r.counter);
  const rin=ringO(c,W*0.34,W*0.66,c.S*0.42,c.S*0.42,{tt:0.1});const f=0.42;g.add(rin.outer.map(q=>[q[0],q[1]*f+c.C*0.29]));g.sub(rin.counter.map(q=>[q[0],q[1]*f+c.C*0.29]));
  g.add(rect(W*0.62,c.C*0.30,W*0.62+c.S*0.38,c.C*0.62));return fin(g,W,[20,20]);};
P['©']=c=>{const g=new Gl(),W=c.w(760);const r=ringO(c,0,W,c.S*0.6,c.S*0.6,{tt:0.1});g.add(r.outer);g.sub(r.counter);const ci=L.C(Object.assign(Object.create(c),{S:c.S*0.5,h:c.h*0.6,R:c.S*0.5*1.04,C:300,sr:c.sr*0.4,sh:c.sh*0.4,bh:c.bh*0.4,bw:c.bw*0.4}));
  g.add(ci.g.shift(W/2-ci.W/2,c.C*0.5-150));return fin(g,W,[20,20]);};
P['₽']=c=>{const r=L.P(c);const {g,W}=r;g.add(rect(r.W*0.0+c.sr*0.3,c.C*0.20,W*0.82,c.C*0.20+c.bar*0.9));return fin(g,W,[8,6]);};
P['№']=c=>{const n=L.N(c);const g=n.g;const o=ringO(c,0,330,c.S*0.62,c.S*0.62,{tt:0.1});const f=0.5;g.add(o.outer.map(q=>[q[0]+n.W+20,q[1]*f+c.C*0.48]));g.sub(o.counter.map(q=>[q[0]+n.W+20,q[1]*f+c.C*0.48]));g.add(rect(n.W+20+30,c.C*0.46-c.bar,n.W+20+300,c.C*0.46-c.bar+c.bar*0.9));return fin(g,n.W+350,[6,10]);};
P['&']=c=>{const g=new Gl(),{S,C}=c;const W=c.w(640);const r=ringO(c,0,W*0.62,S*0.8,S*0.8,{tt:0.1});const f=0.52;g.add(r.outer.map(q=>[q[0]+W*0.04,q[1]*f+C*0.48]));g.sub(r.counter.map(q=>[q[0]+W*0.04,q[1]*f+C*0.48]));
  const u=ringO(c,0,W*0.5,S*0.7,S*0.7,{tt:0.1});g.add(u.outer.map(q=>[q[0]+W*0.17,q[1]*0.5+C*0.5]));g.sub(u.counter.map(q=>[q[0]+W*0.17,q[1]*0.5+C*0.5]));
  for(const p of leg(c,W*0.12,W*0.12+S*0.9,W-S*0.9,W,0,C*0.78,[c.sr*0.3,c.sr*0.5],null))g.add(p);return fin(g,W,[14,8]);};
P['«']=c=>{const g=new Gl(),S=c.S,W=c.w(520),t=c.hb*1.5;const ch=(x)=>[quad([x+S*0.9,c.C*0.62],[x+S*0.9,c.C*0.62-t],[x,c.C*0.34-t/2],[x,c.C*0.34+t/2]),quad([x,c.C*0.34+t/2],[x,c.C*0.34-t/2],[x+S*0.9,c.C*0.06],[x+S*0.9,c.C*0.06+t])];
  g.add(...ch(0),...ch(W*0.42));return fin(g,W*0.42+S*0.9,[20,20]);};
P['»']=c=>{const f=P['«'](c);return fin(f.g.mirX(f.W/2),f.W,[20,20]);};
P['’']=c=>{const g=comma(c).shift(0,c.C-c.S*0.9);return fin(g,c.S*0.8+30,[18,18]);};
P['‘']=c=>{const f=P['’'](c);const g=f.g.xf(q=>[f.W-q[0],2*(c.C*0.8)-q[1]]);return fin(g,f.W,[18,18]);};
P['”']=c=>{const f=P['’'](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['“']=c=>{const f=P['‘'](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['„']=c=>{const f=P[','](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['\'']=c=>{const g=new Gl(),w=c.S*0.7;g.add([[0,c.C],[w,c.C],[w*0.62,c.C-c.S*1.4],[w*0.38,c.C-c.S*1.4]]);return fin(g,w,[22,22]);};
P['"']=c=>{const f=P['\''](c);return fin(f.g.merge(f.g.shift(c.S*1.1,0)),f.W+c.S*1.1,[22,22]);};
P['…']=c=>{const d=D(c),g=new Gl();for(let i=0;i<3;i++)g.add(dia(d.rx+4+i*(2*d.rx+40),d.ry+2,d.rx,d.ry));return fin(g,3*(2*d.rx)+80+8,[20,20]);};
P['^']=c=>{const g=new Gl(),S=c.S;g.add([[0,c.C*0.55],[S*0.5,c.C*0.95],[S,c.C*0.55],[S*0.82,c.C*0.55],[S*0.5,c.C*0.80],[S*0.18,c.C*0.55]]);return fin(g,S,[30,30]);};
P['~']=c=>({g:new Gl(),W:0,sb:[0,0]});
if(root.KortesPunctR2)root.KortesPunctR2(P);
/* ---------- charset */
const CYR_SHARED={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','І':'I','Ѕ':'S','Ј':'J','Ү':'Y'};
const LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',CYR='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',DIG='0123456789';
const PUN=[...'.,:;!?-()/&"\'#%@*+=|\\^'].concat(['–','—','‒','−','…','«','»','„','“','”','‘','’','№','©','₽','·','°','•']);
const keyOf=(ch)=>CYR_SHARED[ch]||ch;
function charset(){const list=[];for(const ch of LAT+CYR+'Ё'+K.EXT_CY+K.EXT_LAT+DIG)list.push(ch);for(const ch of PUN)list.push(ch);return list;}
const sup=(P0,key)=>{const c2=ctx(Object.assign({},K.DEF,{weight:176,contrast:32,sharp:45,width:1,apros:P0.apros}));const r=(L[key]||P[key])(c2);const s=0.5;const g=r.g.xf(q=>[q[0]*s,q[1]*s+c2.C*0.5]);return {g,W:r.W*s,sb:[r.sb[0]*0.8+8,r.sb[1]*0.8+8]};};
const SWASH=new Set(['R','Я']);  /* R3: tails only on R and Я, pair-gated by calt */
const YQ=0.19;/* W88: Я after Q — short left tail (fraction of the full tail) that stops before Q's own tail */
function swashed(c,key,r,sh){const Lt=sh==='y'?Math.min(c.sw,0.5)*1100*YQ:c.sw*1100*(sh?0.62:1);if(c.sw*1100*(sh==='y'?1:sh?0.62:1)<60)return null;const W=r.W,S=c.S;let g=r.g;const sd=c.sr;
  if(key==='O'||key==='C'||key==='G'||key==='Э'){const ta=r.tailAt||{x:W*0.62,y:12,w:S*0.4};const x0=key==='Э'?W*0.74:ta.x;
    g=new Gl().merge(r.g);if(key==='O')g.add(tail(c,W*0.60,20,W+Lt*0.42,36,c.S*0.30));else g.add(tail(c,x0,ta.y,W+Lt*0.62,62,ta.w));return {g,W,sb:r.sb};}
  if(key==='R'){const c2=Object.create(c);c2.noLeg=true;const r2=L.R(c2);const b=r2.swashBase;const g2=r2.g;
    if(sh==='y'){const xe=W+Lt*0.68,Ln=xe-b.x;g2.add(blade(pth([b.x,b.y],['C',b.x+0.30*Ln,b.y*0.3-8,b.x+0.66*Ln,-36,xe,-44]),t=>Math.max(b.lw*0.85*Math.pow(1-t,1.2),0)+(t<0.985?4:0)));}else g2.add(tail(c,b.x,b.y,W+Lt*0.68,190,b.lw*1.05));return {g:g2,W,sb:r2.sb};}
  if(key==='Я'){const rs=swashed(c,'R',L.R(c),sh?'y':false);return {g:rs.g.mirX(W/2),W,sb:[2,8]};}  /* R3b: Я.sw = mirror of R.sw (tail sweeps LEFT under the preceding round letter) */
  return null;}
function tail(c,x0,y0,xEnd,dip,w0){const Ln=xEnd-x0;
  const pts=pth([x0,y0],['C',x0+0.30*Ln,y0>30&&dip<100?-dip*0.9:-dip*0.75,x0+0.66*Ln,-dip*1.15,xEnd,-108]);
  return blade(pts,t=>Math.max(w0*Math.pow(1-t,1.2),0)+(t<0.985?4:0));}
const PUNCR='. , : ; … ! ? - – — ) » ” ’';
const KERNP=[ // [leftKeys,rightKeys,value]  (keys are caps; Cyrillic twins map through keyOf)
 ['A Д Л','T Т V W Y У Ч Ъ',-55],                       // AT AV AW AY ЛТ ДТ
 ['A Д Л','C G O Q Э Ю Ф',-18],
 ['O C G Э','Я',-20],
 ['T Т Г F P Р V W Y У','A Д Л',-55],                  // TA VA WA YA PA ГА ТА УА
 ['T Т Г F P Р Y V W У','O C G Q Э Ю Ф',-25],
 ['T Т Г F P Р Y V W У','Z S З',-10],
 ['L','T Т V W Y У',-60],['Л','T Т У V W Y',-40],      // LT LV LY ЛТ
 ['T Т Г F P Р Y V W У',PUNCR,-60],                     // T. Г, У, V. Y,
 ['L Л','. , ’ ” ’',-25],
 ['R К K Я','T Т V W Y У',-20],
 ['O C Э D Ю','T Т V W Y У A Д',-20],
 ['Г','А A Д Л',-50],
 ['F','A Д Л',-30],['P Р','J',-10],
 ['Z','Z',-10]];
/* W88 A: новые знаки наследуют классы кернинга основы (составные — по EXT_BASE) */
for(const k of KERNP)for(const i of [0,1]){const l=k[i].split(' ');const add=[];for(const [x,b] of Object.entries(K.EXT_BASE))if(l.includes(b)&&!l.includes(x))add.push(x);if(add.length)k[i]=l.concat(add).join(' ');}
function build(Pin){const P0=Object.assign({},K.DEF,Pin||{});const c=ctx(P0);const out={params:P0,M:K.M,glyphs:{},kern:[]};
  const done={};
  for(const ch of charset()){const key=keyOf(ch);if(done[key]){done[key].chars.push(ch);continue;}
    const fn=L[key]||P[key];if(!fn){console.error('missing',key);continue;}
    const r=fn(c);const ap=P0.apros/2;
    const ink=(g)=>{let x0=1e9,x1=-1e9;for(const p of g.pos)for(const q of p){if(q[1]<-40||q[1]>740)continue;if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}if(x0>x1){const b=g.bbox();x0=b.x0;x1=b.x1;}return [x0,x1];};
    const [ix0,ix1]=ink(r.g);const sbL=r.sb[0]+ap,sbR=r.sb[1]+ap;const dx=sbL-ix0;const advV=Math.round(ix1-ix0+sbL+sbR);
    const mk=(rr_)=>({ops:rr_.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+dx).toFixed(1),+q[1].toFixed(1)])]),adv:advV});
    const G=mk(r);G.chars=[ch];G.alts={};
    if(SWASH.has(key)){const s=swashed(c,key,r);if(s){const ss=mk(Object.assign({},s,{W:r.W}));ss.adv=G.adv;G.alts.sw=ss;}const s2=swashed(c,key,r,true);if(s2){const ss=mk(Object.assign({},s2,{W:r.W}));ss.adv=G.adv;G.alts.swq=ss;}}
    if(/[A-ZА-ЯЁ0-9]/.test(key)){const s=sup(P0,key);const [sx0,sx1]=ink(s.g);const sbl=s.sb[0];G.alts.sup={ops:s.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+sbl-sx0).toFixed(1),+q[1].toFixed(1)])]),adv:Math.round(sx1-sx0+s.sb[0]+s.sb[1])};}
    done[key]=G;out.glyphs[key]=G;}
  out.space=Math.round(c.C*0.32+P0.apros);
  out.kern=KERNP.map(k=>({l:k[0].split(' ').map(keyOf),r:k[1].split(' ').map(keyOf),v:k[2]}));
  out.swashLen=c.sw*1100;return out;}
/* product API: one glyph by character; ops are painter-order [mode, polygon] with the sidebearing shift already applied */
const CXC=new Map();
function glyph(ch,Pin){const P0=Object.assign({},K.DEF,Pin||{});const pk=[P0.weight,P0.contrast,P0.sharp,P0.swash,P0.width,P0.apros].join('|');
  let c=CXC.get(pk);if(!c){c=ctx(P0);CXC.set(pk,c);if(CXC.size>40)CXC.delete(CXC.keys().next().value);}
  const key=keyOf(ch.length===1&&ch.toUpperCase().length===1?ch.toUpperCase():ch);const fn=L[key]||P[key];if(!fn)return null;
  const r=fn(c);const ap=P0.apros/2;
  const ink=(g)=>{let x0=1e9,x1=-1e9;for(const p of g.pos)for(const q of p){if(q[1]<-40||q[1]>740)continue;if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}if(x0>x1){const b=g.bbox();x0=b.x0;x1=b.x1;}return [x0,x1];};
  const [ix0,ix1]=ink(r.g);const sbL=r.sb[0]+ap,sbR=r.sb[1]+ap;const dx=sbL-ix0;const advV=Math.round(ix1-ix0+sbL+sbR);
  const mk=(rr_)=>({ops:rr_.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+dx).toFixed(1),+q[1].toFixed(1)])]),adv:advV});
  const G=mk(r);G.key=key;G.alts={};
  if(SWASH.has(key)){const s=swashed(c,key,r);if(s){const ss=mk(Object.assign({},s,{W:r.W}));ss.adv=G.adv;G.alts.sw=ss;}const s2=swashed(c,key,r,true);if(s2){const ss=mk(Object.assign({},s2,{W:r.W}));ss.adv=G.adv;G.alts.swq=ss;}}
  if(/[A-ZА-ЯЁ0-9]/.test(key)){const s=sup(P0,key);const [sx0,sx1]=ink(s.g);const sbl=s.sb[0];G.alts.sup={ops:s.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+sbl-sx0).toFixed(1),+q[1].toFixed(1)])]),adv:Math.round(sx1-sx0+s.sb[0]+s.sb[1])};}
  return G;}
K.glyph=glyph;K.spaceW=P0=>{P0=Object.assign({},K.DEF,P0||{});return Math.round(700*0.32+P0.apros);};K.KERNP=KERNP;K.LETTERS=L;K.PUNCT=P;K.CYR_SHARED=CYR_SHARED;K.PUNCR=PUNCR;
K.build=build;K.charset=charset;K.keyOf=keyOf;K.SWASH=SWASH;K.PUNCT=P;
root.Kortes=K;
})(typeof window!=='undefined'?window:globalThis);
/* парные поправки прототипа R1 (kern_pairs.json, collide.py): [левый, правый, значение]; без пар с правым Я и без .sw */
const KT_PAIRS=[["A","Ю",0],["F","Z",2],["F","Ю",-2],["F","!",-18],["F","?",-10],["F",")",-22],["K","T",3],["K","V",3],["K","W",3],["K","Y",3],["K","У",3],["L",",",-14],["P",":",-22],["P",";",-18],["P","!",-34],["P","?",-18],["P","»",-18],["Q","Д",30],["Q",",",34],["Q",";",34],["Q",")",50],["T","Z",4],["T","Ю",0],["T","!",-16],["T","?",-8],["T",")",-20],["V","Z",6],["V","Ю",2],["V","!",-14],["V",")",-18],["W","Z",6],["W","Ю",2],["W","!",-14],["W",")",-18],["Y","Z",4],["Y","Ю",0],["Y","!",-16],["Y",")",-20],["Z","Z",2],["Г","Z",4],["Г","Ю",0],["Г","!",-16],["Г","?",-8],["Г",")",-20],["Д","T",0],["Д","V",0],["Д","W",0],["Д","Y",0],["Д","У",0],["Д","Ч",-4],["Д","Ъ",0],["Д","Ю",-4],["Д",")",28],["Л","T",1],["Л","V",1],["Л","W",1],["Л","Y",1],["Л","У",1],["Л","Ч",-3],["Л","Ъ",1],["Л","Ю",-3],["У","Z",6],["У","Ю",2],["У","!",-14],["У",")",-18],["Ц",")",36],["Я","T",0],["Я","V",0],["Я","W",0],["Я","Y",0],["Я","У",0],["(","Д",36],["(",",",40],["(",";",40],["(",")",60]];
/* ---------- «Кортес» (kortes): параметры, перевод контуров в формат хоста, регистрация, GSUB/GPOS, правила росчерков (по образцу tyaga/tail.js) ----------
   Ключи ползунков: kwt «Насыщенность» (толщина стойки, ед. на 1000), kct «Контраст», ksr «Острота засечек», ksw «Росчерки» (длина хвоста R и Я),
   kwd «Ширина» (%), kap «Апрош» (ед. на пару). Безопасные пределы получены прогоном 32 наборов (stress_kortes.js): топология как при значениях по умолчанию, ни одной крошки.
   Знак = ops прототипа (painter order: add / subtract), собирается поэтапным csgUnion хоста; ломаные -> кривые (csgFit); тяжёлые знаки пера — растровым путём хоста.
   Росчерки: ОДНА таблица правил KTR используется и для GSUB (calt = ss01), и для образца в приложении (KTS.pre) — расхождения невозможны. */
const KT_DEF={kwt:137,kct:45,ksr:50,ksw:60,kwd:100,kap:8};
const KT_LIM={kwt:[118,158],kct:[20,70],ksr:[25,75],ksw:[30,75],kwd:[92,112],kap:[-20,60]};
const KT_KEYS=['kwt','kct','ksr','ksw','kwd','kap'];
const KT_CAP=700,KT_ASC=960,KT_DESC=300;
const ktNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const ktClamp=(k,v)=>Math.min(KT_LIM[k][1],Math.max(KT_LIM[k][0],ktNum(v,KT_DEF[k])));
/* параметры продукта -> параметры генератора */
const ktP=p=>({weight:ktClamp('kwt',p&&p.kwt),contrast:ktClamp('kct',p&&p.kct),sharp:ktClamp('ksr',p&&p.ksr),swash:ktClamp('ksw',p&&p.ksw),width:ktClamp('kwd',p&&p.kwd)/100,apros:ktClamp('kap',p&&p.kap)});
const ktPK=P=>[P.weight,P.contrast,P.sharp,P.swash,P.width,P.apros].join('|');
const ktHair=P=>P.weight*(0.62-0.0055*P.contrast);
/* микроступеньки: прямой отрезок короче tol между двумя прямыми стыками стягивается в один узел (середина) */
function ktTiny(n,tol){n=n.slice();
  for(let guard=0;guard<40&&n.length>3;guard++){let hit=-1;
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];if(a.b||b.a)continue;if(Math.hypot(a.x-b.x,a.y-b.y)<tol){hit=i;break;}}
    if(hit<0)break;const a=n[hit],j=(hit+1)%n.length,b=n[j];
    const m={x:Math.round((a.x+b.x)*5)/10,y:Math.round((a.y+b.y)*5)/10,a:a.a,b:b.b};
    n[hit]=m;n.splice(j,1);}
  return n;}
/* ops (painter order) -> контуры хоста. Подряд идущие группы: add, sub, add, sub, add... — по две группы за один csgUnion (sub + post). Знаки пера (много ops) — растр хоста */
function ktBool(ops){
  const mk=(o,op)=>{const c=mkc(o[1].map(q=>({x:q[0],y:q[1],a:null,b:null})),false);if(op)c.op=op;return c;};
  const runs=[];for(const o of ops){const l=runs[runs.length-1];if(l&&l.m===o[0])l.o.push(o);else runs.push({m:o[0],o:[o]});}
  const ras=ops.length>60;let cur=null;
  for(let i=0;i<runs.length;){
    const all=[...(cur||[])];
    if(runs[i].m===1){all.push(...runs[i].o.map(o=>mk(o)));i++;}
    if(i<runs.length&&runs[i].m===0){all.push(...runs[i].o.map(o=>mk(o,'sub')));i++;}
    if(i<runs.length&&runs[i].m===1){all.push(...runs[i].o.map(o=>mk(o,'post')));i++;}
    cur=ras?csgUnionRaster(all):csgUnion(all);}
  if(!cur)return [];
  if(ras)cur=cur.map(c=>({hole:c.hole,nodes:ktTiny(c.nodes,6)}));
  if(!ras){const o=[];for(const c of cur){const n=csgFit(c.nodes.map(q=>[q.x,q.y]),0,0);if(n)o.push({hole:c.hole,nodes:ktTiny(n,6)});}cur=o;}
  /* крошки: контур площадью < 350 ед.^2 (0.035 S^2 при S = 100) — как в фильтре прототипа */
  const ar=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
  return cur.filter(c=>ar(c)>=350);}
const ktCache=new Map(),ktGen=new Map();
function ktGlyph(key,P){const gk=key+'|'+ktPK(P);let g=ktGen.get(gk);if(g===undefined){g=Kortes.glyph(key,P)||null;ktGen.set(gk,g);if(ktGen.size>1200){let n=0;for(const q of ktGen.keys()){ktGen.delete(q);if(++n>400)break;}}}return g;}
function ktGet(key,p,which){
  const P=ktP(p);const ck=key+'|'+(which||'')+'|'+ktPK(P);let r=ktCache.get(ck);
  if(r===undefined){const g=ktGlyph(key,P),s=g&&(which?g.alts[which]:g);
    r=s?{key,adv:s.adv,cs:ktBool(s.ops)}:null;ktCache.set(ck,r);
    if(ktCache.size>3000){let n=0;for(const q of ktCache.keys()){ktCache.delete(q);if(++n>1000)break;}}}
  return r;}
const ktKey=ch=>{const u=ch.length===1&&ch.toUpperCase().length===1?ch.toUpperCase():ch;return Kortes.keyOf(u);};
/* ---------- набор знаков ---------- */
const KT_CAPS=Kortes.charset();/* заглавные, цифры, знаки */
const KT_CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',KT_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',KT_DIG='0123456789';
const KT_SYM=[...Kortes.charset()].filter(c=>!/[\p{L}\d]/u.test(c)).join('');
const KT_LOWER=[...KT_CY,...KT_LAT].map(c=>c.toLowerCase()).filter((c,i,a)=>a.indexOf(c)===i);
const ktLo=ch=>{const l=ch.toLowerCase();return l.length===1&&l.toUpperCase()===ch?l:'';};
const KT_XCY=[...Kortes.EXT_CY],KT_XCYL=KT_XCY.map(ktLo).filter(Boolean),KT_XLAT=[...Kortes.EXT_LAT],KT_XLATL=KT_XLAT.map(ktLo).filter(Boolean);
const KT_ALL=[...new Set([...KT_CY,...KT_CY.toLowerCase(),...KT_LAT,...KT_LAT.toLowerCase(),...KT_DIG,...KT_SYM,...KT_XCY,...KT_XCYL,...KT_XLAT,...KT_XLATL])];
const ktName=ch=>'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
const ktAltName=(key,which)=>ktName(key)+'.'+which;
/* ---------- единая таблица правил росчерков (GSUB calt = ss01 и образец) ---------- */
const KTR={
  round:['O','C','G','Э'],      /* ключи знаков: кириллические О С — те же знаки, что латинские O C */
  Q:['Q'],
  /* R: правый хвост, если следующий знак круглый (.sw) или Q (.swq, короткий) */
  R:{base:'R',ahead:[['round','sw'],['Q','swq']]},
  /* Я — зеркало R: левый хвост (.sw) после круглой буквы, короткий (.swq) после Q (W88: хвост Q не задевается); не после Q; не если эту же круглую букву уже подпирает хвост R */
  YA:{base:'Я',after:[['round','sw'],['Q','swq']],unlessBackTail:'R'}};
/* применение к массиву ключей: массив имён вариантов (или null) по позициям */
function ktApplyKeys(keys){
  const out=keys.map(()=>null),R=KTR.R,Y=KTR.YA;
  for(let i=0;i<keys.length;i++){if(keys[i]!==R.base)continue;const nx=keys[i+1];if(nx==null)continue;
    for(const [set,alt] of R.ahead){if(KTR[set].includes(nx)){out[i]=alt;break;}}}
  for(let i=0;i<keys.length;i++){if(keys[i]!==Y.base||i<1)continue;const pv=keys[i-1];
    for(const [set,alt] of Y.after){if(!KTR[set].includes(pv))continue;
      if(i>=2&&keys[i-2]===Y.unlessBackTail&&out[i-2])break;
      out[i]=alt;break;}}
  return out;}
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const KT_ROWS=[['kwt','Насыщенность, ед.',KT_LIM.kwt[0],KT_LIM.kwt[1],1,'Линия'],['kct','Контраст, %',KT_LIM.kct[0],KT_LIM.kct[1],1,'Линия'],
  ['ksr','Острота засечек, %',KT_LIM.ksr[0],KT_LIM.ksr[1],1,'Засечки'],['ksw','Росчерки R и Я, %',KT_LIM.ksw[0],KT_LIM.ksw[1],1,'Росчерки'],
  ['kwd','Ширина, %',KT_LIM.kwd[0],KT_LIM.kwd[1],1,'Пропорции'],['kap','Апрош, ед.',KT_LIM.kap[0],KT_LIM.kap[1],1,'Пропорции']];
if(!PARAMS.some(r=>r[0]==='kwt')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...KT_ROWS);}
const F={id:'kortes',name:'Кортес',family:'Kortes',tag:'Антиква · клиновидные засечки и росчерки',S0:137,GL:{},charset:'extended',
  desc:'Тяжёлая акцидентная антиква из одних заглавных букв (строчные дают те же буквы): клиновидные расходящиеся засечки, линзовидные просветы, острые концы. Буква R, если за ней идёт круглая, выпускает длинный росчерк под соседа, а Я — зеркальный росчерк влево после круглой буквы; работает в Figma и Word (calt, ss01). Для афиш, обложек и заголовков.',
  sample:'Кортес · Kortes',ss01Name:'Росчерки R и Я',ss02Name:'Верхние знаки'};
F.sampleText='ROMARTA\nКОРТЕС\nЗОЯ ВСЯ';
const ktEntry=(key,which)=>({shape:g=>{const r=ktGet(key,g.p,which);return r?r.cs:[];},w:p=>{const r=ktGet(key,p,which);return r?r.adv:0;},k:'cap',
  opt:which?{fixed:true,alt:true,base:key,feat:'kortes',own:true,kernAs:true,ktAlt:which}:{fixed:true}});
const byKey=new Map();
for(const ch of KT_ALL){const key=ktKey(ch);if(!(Kortes.PUNCT[key]||Kortes.LETTERS[key]))continue;let e=byKey.get(key);if(!e){e=ktEntry(key);byKey.set(key,e);}F.GL[ch]=e;}
const KT_SPC=['\u0020','\u00a0','\u2009','\u202f'];
for(const sp of KT_SPC)F.GL[sp]={shape:()=>[],skel:()=>[],w:(sp==='\u2009'||sp==='\u202f')?(p=>thinSpace(p)):(p=>ktSpace(p)),k:'cap',opt:{}};

function ktSpace(p){return Kortes.spaceW(ktP(p));}
/* варианты: .sw / .swq (R, Я), .sup (все буквы и цифры); основа — ключ знака; в CHARSET не входят */
const KT_ALTS=[];/* {name,key,which,chars:[…]} */
{const probe=Kortes.glyph;const P0=ktP({});
 for(const [key,e] of byKey){const g=ktGlyph(key,P0);if(!g)continue;const chars=Object.keys(F.GL).filter(x=>F.GL[x]===e);
  for(const which of ['sw','swq','sup']){if(!g.alts[which])continue;const nm=ktAltName(key,which);F.GL[nm]=ktEntry(key,which);KT_ALTS.push({name:nm,key,which,chars});}}}
const KT_G=s=>[...s].filter(c=>F.GL[c]).join('');
F.GROUPS=[['Кириллица · прописные',KT_G(KT_CY)],['Кириллица · строчные',KT_G(KT_CY.toLowerCase())],['Латиница · прописные',KT_G(KT_LAT)],['Латиница · строчные',KT_G(KT_LAT.toLowerCase())],['Кириллица · расширенная',KT_G(KT_XCY.join('')+KT_XCYL.join(''))],['Латиница · расширенная',KT_G(KT_XLAT.join('')+KT_XLATL.join(''))],['Цифры',KT_DIG],['Знаки',KT_G(KT_SYM)]];
F.CHARSET=KT_ALL.concat(KT_SPC).filter(c=>F.GL[c]);
F._basicDone=true;
F.raw=(ch,p)=>ktGet(ktKey(ch),p);
const K0={wdth:100,capH:KT_CAP,xh:KT_CAP,asc:KT_ASC,desc:KT_DESC,stem:KT_DEF.kwt,hair:Math.round(ktHair(ktP({}))*10)/10,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:Kortes.spaceW(ktP({})),
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,kwt:KT_DEF.kwt,kct:KT_DEF.kct,ksr:KT_DEF.ksr,ksw:KT_DEF.ksw,kwd:KT_DEF.kwd,kap:KT_DEF.kap};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','stem','sb','track','space'];
F.params={};for(const k of HID)F.params[k]=null;
F.pen=null;
F.methods=[
  ['Характер','Контраст и острота засечек: от мягкой тяжёлой антиквы до резкой плакатной.',[['Образец',{kct:45,ksr:50}],['Резкий',{kct:62,ksr:70}],['Мягкий',{kct:28,ksr:30}],['Плакатный',{kwt:150,kct:35,ksr:55}]]],
  ['Насыщенность','Толщина стоек, единицы на 1000.',[['Лёгкий',{kwt:122}],['Образец',{kwt:137}],['Плотный',{kwt:148}],['Жирный',{kwt:158}]]],
  ['Росчерки','Длина хвоста у R и Я в паре с круглой буквой.',[['Короткие',{ksw:35}],['Образец',{ksw:60}],['Длинные',{ksw:75}]]]];
F.coverNarrow=false;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=100;
const KT_ALLCH=[...KT_CY,...KT_CY.toLowerCase(),...KT_LAT,...KT_LAT.toLowerCase(),...KT_DIG,...KT_XCY,...KT_XCYL,...KT_XLAT,...KT_XLATL].join('');
F.proof={stem:p=>ktClamp('kwt',p.kwt),noBar:true,stemSet:' ',hang:true,asc:KT_ALLCH,desc:KT_ALLCH,descX:0,holeK:0.004};
function ktLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=Math.min(hi,Math.max(lo,+v));};
  for(const k of KT_KEYS)cl(k,KT_LIM[k][0],KT_LIM[k][1],KT_DEF[k]);
  q.stem=q.kwt;q.hair=Math.round(ktHair(ktP(q))*10)/10;L.stem=[q.stem,q.stem];L.hair=[q.hair,q.hair];
  q.space=Kortes.spaceW(ktP(q));L.space=[q.space,q.space];
  cl('capH',KT_CAP,KT_CAP,KT_CAP);cl('wdth',100,100,100);cl('xh',KT_CAP,KT_CAP,KT_CAP);cl('asc',KT_ASC,KT_ASC,KT_ASC);cl('desc',KT_DESC,KT_DESC,KT_DESC);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',0,0,0);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='kortes')return _pl(p,font);return ktLim(p);};
/* имя веса: значение по умолчанию (stem/xh = 137/700) читается Regular (0.315) */
WSCALE.kortes=0.6213;
/* семейство Light/Regular/Bold/Black: Regular = значение пользователя, Light = x0.75 (не тоньше предела), Bold = на 55 % пути к пределу, Black = предел */
const KT_FAMT=(u,wn)=>wn==='Light'?Math.max(KT_LIM.kwt[0],u*0.75):wn==='Bold'?u+(KT_LIM.kwt[1]-u)*0.55:wn==='Black'?KT_LIM.kwt[1]:u;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='kortes'){if(['Light','Regular','Bold','Black'].includes(wn))o.kwt=Math.min(KT_LIM.kwt[1],Math.max(KT_LIM.kwt[0],Math.round(KT_FAMT(ktClamp('kwt',p.kwt),wn))));return paramLimits(o,'kortes').q;}
  return o;};
/* ---- кернинг: классовые пары прототипа (по ключам знаков) + парные поправки; безопасный зазор проверяется по профилям при ТЕКУЩИХ параметрах ---- */
const KT_MEM=new Map();for(const ch of Object.keys(F.GL)){if(Array.from(ch).length!==1||!(F.GL[ch].opt&&F.GL[ch].opt.fixed)||F.GL[ch].opt.alt||/\s/.test(ch))continue;const c=ktKey(ch);(KT_MEM.get(c)||KT_MEM.set(c,[]).get(c)).push(ch);}
const ktKP=Kortes.KERNP.map(k=>({l:[...new Set(k[0].split(' ').map(ktKey))],r:[...new Set(k[1].split(' ').map(ktKey))],v:k[2]}));
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='kortes')return _ckt(st,prof,isLow,fontId);
  const Ls=new Set(),Rs=new Set(),vals={};
  for(const g of ktKP){for(const l of g.l)Ls.add(l);for(const r of g.r)Rs.add(r);}
  for(const g of ktKP)for(const l of g.l)for(const r of g.r)vals[l+'|'+r]=g.v;
  const mem=c=>(KT_MEM.get(c)||[]).filter(ch=>prof(ch));
  const G0=12;
  const altOf=new Map();for(const a of KT_ALTS){(altOf.get(a.key)||altOf.set(a.key,[]).get(a.key)).push(a.name);}
  const pf=new Map();
  const profs=c=>{const o=[];for(const ch of mem(c)){const q=prof(ch);if(q)o.push(q);}
    for(const nm of (altOf.get(c)||[])){let q=pf.get(nm);if(q===undefined){q=null;try{const g=finalGlyph(nm,st,{});q=g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;}catch(e){}pf.set(nm,q);}if(q)o.push(q);}return o;};
  const PM=new Map();const pr=c=>PM.get(c)||(PM.set(c,profs(c)),PM.get(c));
  const guard=(a,b,v)=>{if(v>=0)return v;for(const pa of pr(a))for(const pb of pr(b)){const g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil(G0-g.min));}return Math.min(0,Math.max(-150,v));};
  for(const key of Object.keys(vals)){const [a,b]=key.split('|');vals[key]=guard(a,b,vals[key]);}
  /* парные поправки (kern_pairs.json прототипа): имеют приоритет над классами */
  const pairs={};
  for(const [l,r,v] of KT_PAIRS){const a=ktKey(l),b=ktKey(r);const gv=guard(a,b,v);
    for(const x of (KT_MEM.get(a)||[]))for(const y of (KT_MEM.get(b)||[]))pairs[x+y]=gv;}
  const t=60;
  return {L:[...Ls].map(c=>[c,mem(c)]).filter(x=>x[1].length),R:[...Rs].map(c=>[c,mem(c)]).filter(x=>x[1].length),vals,tU:t,tL:t,pairs};};
KERN_TABLE.kortes=[];
/* ---- GSUB: calt (= ss01) росчерки по таблице KTR; ^ + знак -> верхний знак (calt, liga, clig); ss02 — все верхние ---- */
const ktChain=(back,input,ahead,li)=>{/* ChainContextSubst формат 3; li == null — правило «ничего не делать» (ignore) */
  const covs=[...back,...input,...ahead];const nrec=li==null?0:1;
  const head=2+2+2*back.length+2+2*input.length+2+2*ahead.length+2+4*nrec;let off=head;const offs=covs.map(c=>{const o=off;off+=c.length;return o;});
  const w=new BW();w.u16(3).u16(back.length);back.forEach((c,i)=>w.u16(offs[i]));w.u16(input.length);input.forEach((c,i)=>w.u16(offs[back.length+i]));
  w.u16(ahead.length);ahead.forEach((c,i)=>w.u16(offs[back.length+input.length+i]));w.u16(nrec);if(nrec)w.u16(0).u16(li);covs.forEach(c=>w.bytes(c));return w.b;};
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='kortes')return;
  const gids=chs=>[...new Set(chs.map(c=>gidByCh[c]).filter(x=>x!=null))];
  const memOf=key=>(KT_MEM.get(key)||[]);
  const gOf=keys=>gids(keys.flatMap(memOf));
  const cov=a=>otCoverage(a);
  const altG=(key,which)=>gidByName[ktAltName(key,which)];
  /* superiors */
  const sup=KT_ALTS.filter(a=>a.which==='sup'&&gidByName[a.name]!=null);
  const hat=gidByCh['^'];let lSup=null,lAll=null;
  if(sup.length){
    if(hat!=null){const L=[];for(const a of sup)for(const ch of a.chars){const b=gidByCh[ch];if(b!=null)L.push({comps:[hat,b],lig:gidByName[a.name]});}
      looks.push({type:4,subs:[otoLigSubst(L)]});lSup=looks.length-1;}
    const P=[];for(const a of sup)for(const ch of a.chars){const b=gidByCh[ch];if(b!=null)P.push([b,gidByName[a.name]]);}
    looks.push({type:1,subs:[otSingleSubst(P)]});lAll=looks.length-1;}
  /* swashes: правила из KTR */
  let lSw=null;
  const R=KTR.R,Y=KTR.YA;
  const rG=gOf([R.base]),yG=gOf([Y.base]);
  if(rG.length&&yG.length&&altG(R.base,'sw')!=null&&altG(Y.base,'sw')!=null&&altG(Y.base,'swq')!=null){
    const subOf=(base,which)=>{const t=altG(base,which);const P=gOf([base]).map(g=>[g,t]);looks.push({type:1,subs:[otSingleSubst(P)]});return looks.length-1;};
    const subs=[];
    for(const [set,alt] of R.ahead){const ah=gOf(KTR[set]);if(!ah.length||altG(R.base,alt)==null)continue;const li=subOf(R.base,alt);subs.push(ktChain([],[cov(rG)],[cov(ah)],li));}
    /* Я: сначала правило «ничего не делать», когда круглую букву уже подпирает хвост R (R или R.sw/.swq позади круглой) */
    const rAny=[...rG,...[altG(R.base,'sw'),altG(R.base,'swq')].filter(x=>x!=null)];
    for(const [set,yalt] of Y.after){const bk=gOf(KTR[set]);if(!bk.length)continue;const yi=subOf(Y.base,yalt);
      subs.push(ktChain([cov(bk),cov(rAny)],[cov(yG)],[],null));
      subs.push(ktChain([cov(bk)],[cov(yG)],[],yi));}
    looks.push({type:6,subs});lSw=looks.length-1;}
  const calt=[lSup,lSw].filter(x=>x!=null);
  if(calt.length)feats.push({tag:'calt',lookups:calt});
  if(lSup!=null){feats.push({tag:'liga',lookups:[lSup]});feats.push({tag:'clig',lookups:[lSup]});}
  if(lSw!=null)feats.push({tag:'ss01',lookups:[lSw],nameID:256});
  if(lAll!=null)feats.push({tag:'ss02',lookups:[lAll],nameID:257});};
/* образец: те же подстановки (KTR) над текстом -> служебные символы (ctxName в ui_ot_o1.js); ^ + знак -> верхний знак раньше правил росчерков, как в порядке lookup GSUB */
/* крошки, которые могли возникнуть при повторном объединении хостом, отбрасываются (как в фильтре прототипа) */
const _fgK=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fgK.apply(this,arguments);
  if(!g||!g.cs||CUR_FONT!=='kortes')return g;
  const ar=c=>{let a=0;const n=c.nodes;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a/2);};
  const cs=g.cs.filter(c=>!c.nodes||ar(c)>=350);return cs.length===g.cs.length?g:Object.assign({},g,{cs});};
const KTS={rules:KTR,
  apply(text){const A=[...text],n=A.length;const hat=new Array(n).fill(false),sup=new Array(n).fill(false);
    for(let i=0;i<n-1;i++){if(A[i]!=='^'||sup[i])continue;const c=A[i+1];if(/[\p{L}\d]/u.test(c)&&F.GL[c]&&F.GL[ktAltName(ktKey(c),'sup')]){hat[i]=true;sup[i+1]=true;i++;}}
    const keys=A.map((c,i)=>sup[i]||hat[i]||!/\p{L}/u.test(c)||!F.GL[c]?'':ktKey(c));
    const alt=ktApplyKeys(keys),out=[];
    for(let i=0;i<n;i++){if(hat[i])continue;
      if(sup[i])out.push({c:A[i],n:ktAltName(ktKey(A[i]),'sup')});
      else if(alt[i])out.push({c:A[i],n:ktAltName(keys[i],alt[i])});
      else out.push({c:A[i]});}
    return out;}};
const KTS_ENG={eng:ktP,get:ktGet,alts:KT_ALTS,LIM:KT_LIM,DEF:KT_DEF,KEYS:KT_KEYS,rows:KT_ROWS,key:ktKey,name:ktName,altName:ktAltName,bool:ktBool,rules:KTR,applyKeys:ktApplyKeys};
Object.assign(KTS,KTS_ENG);
FONTS.kortes=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!KT_KEYS.includes(r[0])&&!['slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='kortes'){const f=FONTS[id];f.params=f.params||{};for(const k of KT_KEYS)if(!(k in f.params))f.params[k]=null;}
for(const r of KT_ROWS)F.params[r[0]]=[r[1],r[2],r[3],r[4]];
if(typeof globalThis!=='undefined')globalThis.KTS=KTS;
}
})();
