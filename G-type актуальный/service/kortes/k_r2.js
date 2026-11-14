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
