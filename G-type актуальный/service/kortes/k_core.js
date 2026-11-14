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
