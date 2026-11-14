/* ---------- скелеты знаков (в координатах внешнего бокса: x 0..W, y 0..h; осевые линии отступают на o = R) ---------- */
const GD={};
const kE=(cx,cy,rx,ry,a0,a1)=>{const n=Math.max(2,Math.ceil(Math.abs(a1-a0)/6)),o=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return o;};
const kRP=(pts,rad)=>{const n=pts.length,out=[pts[0]];for(let i=1;i<n-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1],l1=Math.hypot(a[0]-b[0],a[1]-b[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]),t=Math.min(rad,l1*0.5,l2*0.5);
  if(t<1){out.push(b);continue;}const p1=[b[0]+(a[0]-b[0])/l1*t,b[1]+(a[1]-b[1])/l1*t],p2=[b[0]+(c[0]-b[0])/l2*t,b[1]+(c[1]-b[1])/l2*t];
  for(let s=0;s<=6;s++){const u=s/6,v=1-u;out.push([v*v*p1[0]+2*u*v*b[0]+u*u*p2[0],v*v*p1[1]+2*u*v*b[1]+u*u*p2[1]]);}}
  out.push(pts[n-1]);return out;};
const kCat=(...a)=>{const o=[];for(const s of a)for(const q of s){const l=o[o.length-1];if(l&&Math.hypot(l[0]-q[0],l[1]-q[1])<0.5)continue;o.push(q);}return o;};
function kKit(P,k){const o=P.R,W=P.W,h=k==='xh'?P.X:P.H,c=W/2,X=P.X,H=P.H,As=P.As,D=P.D;
  const K={P,o,W,h,c,X,H,As,D,rc:o*1.25,hw:0.94};
  K.E=kE;K.RP=kRP;K.cat=kCat;
  K.ring=(cx,cy,rx,ry)=>({p:kE(cx,cy,rx,ry,0,360),c:true});
  K.dot=(x,y,s)=>({p:[[x,y]],dot:true,w:s||1});
  K.ln=(x0,y0,x1,y1,w)=>({p:[[x0,y0],[x1,y1]],w:w||1});
  K.mir=(sp)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],q[1]]),nb:t.nb?[t.nb[1],t.nb[0]]:undefined});});
  K.rotc=(sp,yc)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],2*yc-q[1]])});});
  K.rot=(sp)=>sp.map(s=>{const t=Array.isArray(s)?{p:s}:s;return Object.assign({},t,{p:t.p.map(q=>[W-q[0],h-q[1]])});});
  /* чаша справа: от (x0,yT) вправо, дуга полуэллипсом до (x0,yB) */
  K.bowl=(x0,yT,yB,xR,rxk)=>{const ry=(yT-yB)/2,rx=Math.min(xR-x0,ry*(rxk||1.0));return kCat([[x0,yT]],[[xR-rx,yT]],kE(xR-rx,(yT+yB)/2,rx,ry,90,-90),[[x0,yB]]);};
  /* арка n: левая точка (x0,cy) -> дуга -> правая стойка вниз до yb */
  return K;}
const wdf=(base,nst)=>p=>base*p.wdth/100+(nst/2)*1.15*(p.stem-76);
const gdef=(chars,k,base,nst,fn,extra)=>{for(const ch of chars)GD[ch]=Object.assign({k,w:wdf(base,nst),fn},extra||{});};
const gdefU=(low,wx,wc,nst,fn,nst2)=>{gdef(low,'xh',wx,nst,fn);gdef(low.toUpperCase(),'cap',wc,nst2==null?nst:nst2,fn);};
/* ===== латиница, строчные ===== */
const arch=(K,x0,x1,cy,yb)=>kCat(kE((x0+x1)/2,cy,(x1-x0)/2,Math.min((x1-x0)/2*0.95,K.h-K.o-cy),180,0),[[x1,yb]]);
const archY=(K)=>{const ry=(K.W/2-K.o)*0.92;return K.X-K.o-ry;};
GD.o={k:'xh',w:wdf(570,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
const apd=K=>(2*K.o-76)*0.28+34*K.P.m;
GD.c={k:'xh',w:wdf(520,2),fn:K=>[{p:kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,40+apd(K),320-apd(K))}]};
GD.e={k:'xh',w:wdf(560,2),fn:K=>[{p:[[K.o,K.h*0.5],[K.W-K.o,K.h*0.5]],w:K.hw},{p:kE(K.c,K.h/2,K.c-K.o,K.h/2-K.o,0,360-(36+apd(K)*1.4))}]};
const ringStem=(K,right,top,bot)=>[K.ring(K.c,K.X/2,K.c-K.o,K.X/2-K.o),K.ln(right?K.W-K.o:K.o,top,right?K.W-K.o:K.o,bot)];
GD.a={k:'xh',w:wdf(560,2),fn:K=>ringStem(K,true,K.X-K.o,K.o)};
GD.d={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,true,K.As-K.o,K.o)};
GD.b={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,false,K.As-K.o,K.o)};
GD.p={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,false,K.X-K.o,-K.D+K.o)};
GD.q={k:'xh',w:wdf(570,2),fn:K=>ringStem(K,true,K.X-K.o,-K.D+K.o)};
GD.g={k:'xh',w:wdf(570,2),fn:K=>{const rh=Math.max(24,Math.min((K.W-2*K.o)*0.5,(K.D-2*K.o-24)/2)),by=-K.D+K.o;
  return [K.ring(K.c,K.X/2,K.c-K.o,K.X/2-K.o),{p:kCat([[K.W-K.o,K.X-K.o]],[[K.W-K.o,by+rh]],kE(K.W-K.o-rh,by+rh,rh,rh,0,-165))}];}};
GD.n={k:'xh',w:wdf(540,2),fn:K=>{const cy=archY(K);return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:arch(K,K.o,K.W-K.o,cy,K.o)}];}};
GD.h={k:'xh',w:wdf(540,2),fn:K=>{const cy=archY(K);return [K.ln(K.o,K.As-K.o,K.o,K.o),{p:arch(K,K.o,K.W-K.o,cy,K.o)}];}};
GD.m={k:'xh',w:wdf(830,3),fn:K=>{const ry=(K.W/4-K.o)*0.95,cy=K.X-K.o-ry,x1=K.W/2;return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:arch(K,K.o,x1,cy,K.o)},{p:arch(K,x1,K.W-K.o,cy,K.o)}];}};
GD.u={k:'xh',w:wdf(540,2),fn:K=>{const ry=(K.W/2-K.o)*0.92,cy=K.o+ry;return [{p:kCat([[K.o,K.X-K.o]],kE(K.c,cy,K.c-K.o,ry,180,360))},K.ln(K.W-K.o,K.X-K.o,K.W-K.o,K.o)];}};
GD.r={k:'xh',w:wdf(400,1.4),fn:K=>{const ww=K.W,ry=(ww*1.25-K.o)*0.5,cy=K.X-K.o-ry;return [K.ln(K.o,K.X-K.o,K.o,K.o),{p:kE(K.o+ry*1.15,cy,ry*1.15,ry,180,50)}];}};
const wi=p=>p.stem*1.25+60;
GD.i={k:'xh',w:wi,fn:K=>[K.ln(K.c,K.X-K.o,K.c,K.o),K.dot(K.c,K.X+K.P.gDot+K.o*K.P.dotK,1)]};
GD.l={k:'xh',w:wi,fn:K=>[K.ln(K.c,K.As-K.o,K.c,K.o)]};
GD.j={k:'xh',w:p=>wi(p)+120,fn:K=>{const rh=Math.max(24,Math.min(K.W*0.34,(K.D-2*K.o-24)/2)),by=-K.D+K.o,xs=K.W-K.o-0;return [{p:kCat([[xs,K.X-K.o]],[[xs,by+rh]],kE(xs-rh,by+rh,rh,rh,0,-140))},K.dot(xs,K.X+K.P.gDot+K.o*K.P.dotK,1)];}};
GD.t={k:'xh',w:wdf(400,1.5),fn:K=>{const xs=K.W*0.42,Tt=K.X*1.26,rt=Math.min(K.W-xs-K.o,K.X*0.3);
  return [{p:kCat([[xs,Tt-K.o]],[[xs,K.o+rt]],kE(xs+rt,K.o+rt,rt,rt,180,300))},{p:[[K.o,K.X-K.o],[K.W-K.o,K.X-K.o]],w:K.hw}];}};
GD.f={k:'xh',w:wdf(400,1.5),fn:K=>{const xs=K.W*0.42,Tt=K.As,rf=Math.min(K.W-xs-K.o,K.X*0.30);
  return [{p:kCat([[xs,K.o]],[[xs,Tt-K.o-rf]],kE(xs+rf,Tt-K.o-rf,rf,rf,180,70))},{p:[[K.o,K.X-K.o],[xs+(K.W-K.o-xs)*0.5,K.X-K.o]],w:K.hw}];}};
GD.k={k:'xh',w:wdf(520,1.6),fn:K=>{const ym=K.X*0.40,x1=K.W-K.o,ya=K.X-K.o,t=0.40,jx=K.o+(x1-K.o)*t,jy=ym+(ya-ym)*t;
  return [K.ln(K.o,K.As-K.o,K.o,K.o),K.ln(K.o,ym,x1,ya),K.ln(jx,jy,x1,K.o)];}};
const sPath=(K,x0,x1,y0,y1)=>{const hs=y1-y0,ru=hs*0.245,rl=hs*0.255,cx=(x0+x1)/2,rx=(x1-x0)/2;
  const t=Math.max(0,Math.min(1.3,(2*K.o-134)/81)),a=22*t;
  return {p:kCat(kE(cx+rx*0.02,y1-ru,rx,ru,28+a,270),kE(cx-rx*0.02,y0+rl,rx,rl,90,-152+a))};};
GD.s={k:'xh',w:wdf(480,3.2),fn:K=>[sPath(K,K.o,K.W-K.o,K.o,K.h-K.o)]};
GD.v={k:'xh',w:wdf(560,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.o],[K.W-K.o,K.h-K.o]],K.o*1.6)}]};
GD.w={k:'xh',w:wdf(820,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W*0.26,K.o],[K.c,K.h*0.66],[K.W*0.74,K.o],[K.W-K.o,K.h-K.o]],K.o*1.4)}]};
GD.x={k:'xh',w:wdf(540,2),fn:K=>[K.ln(K.o,K.h-K.o,K.W-K.o,K.o),K.ln(K.W-K.o,K.h-K.o,K.o,K.o)]};
GD.y={k:'xh',w:wdf(560,2),fn:K=>{const x2=K.W*0.22,y2=-K.D+K.o,x1=K.W-K.o,ya=K.X-K.o,t=(K.o+30-ya)/(y2-ya),jx=x1+(x2-x1)*t;
  return [K.ln(K.o,ya,jx,K.o+30),K.ln(x1,ya,x2,y2)];}};
GD.z={k:'xh',w:wdf(500,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3),w:1}]};
/* ===== прописные ===== */
GD.A={k:'cap',w:wdf(700,2.2),fn:K=>{const yb=K.h*0.30,t=(yb-K.o)/(K.h-2*K.o),xl=K.o+(K.c-K.o)*t,xr=K.W-xl;
  return [{p:kRP([[K.o,K.o],[K.c,K.h-K.o],[K.W-K.o,K.o]],K.o*1.4)},{p:[[xl,yb],[xr,yb]],w:K.hw}];}};
const bowlSt=(K,yT,yB,xR,rxk)=>({p:K.bowl(K.o,yT,yB,xR,rxk)});
GD.B={k:'cap',w:wdf(600,2),fn:K=>{const ym=K.h*0.535;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,ym,K.W-K.o*1.0-8,1.0),bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD.C={k:'cap',w:wdf(620,2),fn:K=>[{p:kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,40+apd(K),320-apd(K))}]};
GD.D={k:'cap',w:wdf(640,2),fn:K=>{const rx=Math.min(K.W*0.55,K.h/2-K.o);return [K.ln(K.o,K.o,K.o,K.h-K.o),{p:kCat([[K.o,K.h-K.o]],[[K.W-K.o-rx,K.h-K.o]],kE(K.W-K.o-rx,K.h/2,rx,K.h/2-K.o,90,-90),[[K.o,K.o]])}];}};
GD.E={k:'cap',w:wdf(520,1.6),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},{p:[[K.o,K.h*0.5],[K.W-K.o*1.0-K.W*0.1,K.h*0.5]],w:K.hw},{p:[[K.o,K.o],[K.W-K.o,K.o]],w:K.hw}]};
GD.F={k:'cap',w:wdf(500,1.6),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},{p:[[K.o,K.h*0.5],[K.W-K.o-K.W*0.1,K.h*0.5]],w:K.hw}]};
GD.G={k:'cap',w:wdf(660,2),fn:K=>[{p:kCat(kE(K.c+K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,46+apd(K)*1.6,360),[[K.c+K.o*0.1,K.h/2]])}]};
GD.H={k:'cap',w:wdf(640,2),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),K.ln(K.W-K.o,K.o,K.W-K.o,K.h-K.o),{p:[[K.o,K.h*0.5],[K.W-K.o,K.h*0.5]],w:K.hw}]};
GD.I={k:'cap',w:wi,fn:K=>[K.ln(K.c,K.o,K.c,K.h-K.o)]};
GD.J={k:'cap',w:wdf(440,1.4),fn:K=>{const rj=Math.min((K.W-2*K.o)*0.7,K.h*0.25),xs=K.W-K.o;return [{p:kCat([[xs,K.h-K.o]],[[xs,K.o+rj]],kE(xs-rj,K.o+rj,rj,rj,0,-165))}];}};
GD.K={k:'cap',w:wdf(600,1.6),fn:K=>{const ym=K.h*0.40,x1=K.W-K.o,ya=K.h-K.o,t=0.42,jx=K.o+(x1-K.o)*t,jy=ym+(ya-ym)*t;
  return [K.ln(K.o,K.o,K.o,K.h-K.o),K.ln(K.o,ym,x1,ya),K.ln(jx,jy,x1,K.o)];}};
GD.L={k:'cap',w:wdf(480,1.4),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
GD.M={k:'cap',w:wdf(840,4.6),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.c,K.h*0.30],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
GD.N={k:'cap',w:wdf(660,2),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.o],[K.W-K.o,K.h-K.o]],K.o*1.3)}]};
GD.O={k:'cap',w:wdf(700,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
GD.P={k:'cap',w:wdf(560,2),fn:K=>[K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,K.h*0.40,K.W-K.o,1.0)]};
GD.Q={k:'cap',w:wdf(700,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o),K.ln(K.c+K.W*0.12,K.h*0.26,K.W-K.o*0.6,-K.D*0.55)]};
GD.R={k:'cap',w:wdf(600,2),fn:K=>{const ym=K.h*0.42;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,K.h-K.o,ym,K.W-K.o,1.0),K.ln(K.c*0.8,ym,K.W-K.o,K.o)];}};
GD.S={k:'cap',w:wdf(560,3),fn:K=>[sPath(K,K.o,K.W-K.o,K.o,K.h-K.o)]};
GD.T={k:'cap',w:wdf(580,1.6),fn:K=>[{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD.U={k:'cap',w:wdf(640,2),fn:K=>{const ry=(K.W/2-K.o)*0.95,cy=K.o+ry;return [{p:kCat([[K.o,K.h-K.o]],kE(K.c,cy,K.c-K.o,ry,180,360),[[K.W-K.o,K.h-K.o]])}];}};
GD.V={k:'cap',w:wdf(640,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.o],[K.W-K.o,K.h-K.o]],K.o*1.6)}]};
GD.W={k:'cap',w:wdf(960,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W*0.26,K.o],[K.c,K.h*0.70],[K.W*0.74,K.o],[K.W-K.o,K.h-K.o]],K.o*1.4)}]};
GD.X={k:'cap',w:wdf(620,2),fn:K=>[K.ln(K.o,K.h-K.o,K.W-K.o,K.o),K.ln(K.W-K.o,K.h-K.o,K.o,K.o)]};
GD.Y={k:'cap',w:wdf(620,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.c,K.h*0.42],[K.W-K.o,K.h-K.o]],K.o*1.3)},K.ln(K.c,K.h*0.42,K.c,K.o)]};
GD.Z={k:'cap',w:wdf(560,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],K.o*1.3)}]};
/* ===== кириллица (прописные; строчные — те же построения на высоте x, где форма капительная) ===== */
const sq=(K)=>K.o*1.3;
GD['Б']={k:'cap',w:wdf(560,2),fn:K=>{const ym=K.h*0.56;return [K.ln(K.o,K.o,K.o,K.h-K.o),{p:[[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],w:K.hw},bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD['Г']={k:'cap',w:wdf(470,1.6),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.h-K.o]],sq(K))}]};
GD['Д']={k:'cap',w:wdf(700,2.2),fn:K=>{const yb=K.h*0.17,x1=K.W*0.20,x2=K.W-x1,dy=-K.D*0.55;
  return [{p:kRP([[x1,yb],[x1,K.h-K.o],[x2,K.h-K.o],[x2,yb]],sq(K))},{p:[[K.o,yb],[K.W-K.o,yb]],w:K.hw},K.ln(K.o,yb,K.o,dy),K.ln(K.W-K.o,yb,K.W-K.o,dy)];}};
GD['Ж']={k:'cap',w:wdf(920,3),fn:K=>{const ym=K.h*0.5;return [K.ln(K.c,K.o,K.c,K.h-K.o),{p:kRP([[K.o,K.h-K.o],[K.c,ym],[K.o,K.o]],K.o*0.8),nb:[0,0]},{p:kRP([[K.W-K.o,K.h-K.o],[K.c,ym],[K.W-K.o,K.o]],K.o*0.8)}];}};
GD['З']={k:'cap',w:wdf(560,2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.235,rl=hs*0.265,rx=K.c-K.o,cx=K.c,ym=K.o+2*rl;
  return [{p:kCat(kE(cx,K.h-K.o-ru,rx*0.95,ru,140,-90),[[cx-rx*0.35,ym]])},{p:kCat([[cx-rx*0.35,ym]],kE(cx,K.o+rl,rx,rl,90,-140))}];}};
GD['И']={k:'cap',w:wdf(660,3.4),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['Й']={k:'cap',w:wdf(660,2),fn:K=>{const by=K.h+K.P.gBreve+K.o*0.0,ry=K.W*0.11,rx=K.W*0.20;return [...GD['И'].fn(K),{p:kE(K.c,by+K.o+ry,rx,ry,205,335)}];}};
GD['Л']={k:'cap',w:wdf(660,2),fn:K=>[{p:kRP([[K.o,K.o],[K.W*0.32,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['П']={k:'cap',w:wdf(640,2),fn:K=>[{p:kRP([[K.o,K.o],[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W-K.o,K.o]],sq(K))}]};
GD['Ф']={k:'cap',w:wdf(760,2.4),fn:K=>{const ry=K.h*0.32,rx=K.c-K.o*1.4;return [K.ring(K.c,K.h/2,rx,ry),K.ln(K.c,K.h-K.o,K.c,K.o)];}};
GD['Ц']={k:'cap',w:wdf(680,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],sq(K))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,-K.D*0.55)]};
GD['Ч']={k:'cap',w:wdf(600,2),fn:K=>{const ym1=K.h*0.58,ry1=K.h*0.20;return [{p:kCat([[K.o,K.h-K.o]],[[K.o,ym1]],kE(K.c,ym1,K.c-K.o,ry1,180,360))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,K.o)];}};
GD['Ш']={k:'cap',w:wdf(940,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o],[K.W-K.o,K.h-K.o]],sq(K))},K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD['Щ']={k:'cap',w:wdf(980,3),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.o,K.o],[K.W-K.o,K.o]],sq(K))},K.ln(K.W-K.o,K.h-K.o,K.W-K.o,-K.D*0.55),K.ln(K.c,K.h-K.o,K.c,K.o)]};
GD['Ъ']={k:'cap',w:wdf(680,2),fn:K=>{const x1=K.W*0.30,ym=K.h*0.60;return [K.ln(x1,K.o,x1,K.h-K.o),{p:[[K.o,K.h-K.o],[x1,K.h-K.o]],w:K.hw},{p:K.bowl(x1,ym,K.o,K.W-K.o,1.05)}];}};
GD['Ь']={k:'cap',w:wdf(560,2),fn:K=>{const ym=K.h*0.60;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,ym,K.o,K.W-K.o,1.05)];}};
GD['Ы']={k:'cap',w:wdf(840,6),fn:K=>{const ym=K.h*0.60,xr=K.W-K.o,xb=K.W*0.58;return [K.ln(K.o,K.o,K.o,K.h-K.o),bowlSt(K,ym,K.o,xb,1.05),K.ln(xr,K.o,xr,K.h-K.o)];}};
GD['Э']={k:'cap',w:wdf(580,2),fn:K=>[{p:kE(K.c-K.o*0.1,K.h/2,K.c-K.o*1.1,K.h/2-K.o,140-apd(K),-140+apd(K))},{p:[[K.c+K.o*1.2,K.h/2],[K.W-K.o,K.h/2]],w:K.hw,nb:[0,1]}]};
GD['Ю']={k:'cap',w:wdf(900,3),fn:K=>{const x1=K.o,xo=K.W*0.36,cx=(xo+K.W)/2,rx=(K.W-xo)/2-K.o;return [K.ln(x1,K.o,x1,K.h-K.o),{p:[[x1,K.h/2],[xo+K.o,K.h/2]],w:K.hw},K.ring(cx,K.h/2,rx,K.h/2-K.o)];}};
GD['Я']={k:'cap',w:wdf(600,2),fn:K=>K.mir(GD.R.fn(K))};
GD['Ё']={k:'cap',w:wdf(520,1.6),fn:K=>{const y=K.h+K.P.gDot+K.o*K.P.dotK;return [...GD.E.fn(K),K.dot(K.W*0.24,y,1),K.dot(K.W*0.76,y,1)];}};
/* ===== цифры ===== */
GD['0']={k:'cap',w:wdf(560,2),fn:K=>[K.ring(K.c,K.h/2,K.c-K.o,K.h/2-K.o)]};
GD['1']={k:'cap',w:wdf(400,1.4),fn:K=>{const x=K.W*0.62;return [K.ln(x,K.o,x,K.h-K.o),K.ln(x,K.h-K.o,K.o+4,K.h*0.78)];}};
GD['2']={k:'cap',w:wdf(540,2),fn:K=>{const ru=(K.h-2*K.o)*0.28,cy=K.h-K.o-ru;return [{p:kCat(kE(K.c,cy,K.c-K.o,ru,165,-40),[[K.o,K.o]],[[K.W-K.o,K.o]])}];}};
GD['3']={k:'cap',w:wdf(560,2),fn:GD['З'].fn};
GD['4']={k:'cap',w:wdf(600,2),fn:K=>{const x=K.W*0.70,yb=K.h*0.30;return [{p:kRP([[x,K.o],[x,K.h-K.o],[K.o,yb],[K.W-K.o,yb]],sq(K)*0.7)}];}};
GD['5']={k:'cap',w:wdf(540,2),fn:K=>{const yb=K.h*0.50,rb=(yb-K.o)/2*1.0;return [{p:kRP([[K.W-K.o,K.h-K.o],[K.o+K.W*0.08,K.h-K.o],[K.o+K.W*0.05,yb+K.o*0.4]],sq(K)*0.8)},{p:kCat([[K.o+K.W*0.05,yb+K.o*0.4]],kE(K.c-K.o*0.3,K.o+(yb+K.o*0.4-K.o)/2*1.0,K.c-K.o*0.7,(yb+K.o*0.4-K.o)/2,100,-150))}];}};
GD['6']={k:'cap',w:wdf(600,2),fn:K=>{const t=Math.max(0,Math.min(1,(2*K.o-100)/115)),ry=K.h*(K.P.k6r||0.27-0.065*t),cy=K.o+ry,xT=K.W*(0.74-0.08*t);return [K.ring(K.c,cy,K.c-K.o,ry),{p:kE(xT,cy,xT-K.o,K.h-K.o-cy,180,100)}];}};
GD['7']={k:'cap',w:wdf(520,2),fn:K=>[{p:kRP([[K.o,K.h-K.o],[K.W-K.o,K.h-K.o],[K.W*0.34,K.o]],sq(K))}]};
GD['8']={k:'cap',w:wdf(560,2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.235,rl=hs*0.265;return [K.ring(K.c,K.h-K.o-ru,K.c-K.o*1.5,ru),K.ring(K.c,K.o+rl,K.c-K.o,rl)];}};
GD['9']={k:'cap',w:wdf(560,2),fn:K=>K.rot(GD['6'].fn(K))};
/* ===== знаки ===== */
const dotW=p=>p.stem*1.25+50;
GD['.']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1)]};
GD[',']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1),K.ln(K.c,K.o*K.P.dotK,K.c-K.o*0.7,-K.o*2.4,0.75)]};
GD[':']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.o*K.P.dotK,1),K.dot(K.c,K.X-K.o*K.P.dotK,1)]};
GD[';']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.X-K.o*K.P.dotK,1),K.dot(K.c,K.o*K.P.dotK,1),K.ln(K.c,K.o*K.P.dotK,K.c-K.o*0.7,-K.o*2.4,0.75)]};
const yDotTop=K=>Math.max(K.h*0.30,3*K.o+K.P.gDot+K.o*K.P.bm);
GD['!']={k:'cap',w:dotW,fn:K=>[K.ln(K.c,K.h-K.o,K.c,yDotTop(K)),K.dot(K.c,K.o*K.P.dotK,1)]};
GD['?']={k:'cap',w:wdf(480,1.8),fn:K=>{const ru=(K.h-2*K.o)*0.27,cy=K.h-K.o-ru,xs=K.c;return [{p:kCat(kE(K.c,cy,K.c-K.o,ru,170,-55),[[xs,cy-ru*1.0]],[[xs,Math.min(yDotTop(K),cy-ru*1.0-10)]])},K.dot(K.c,K.o*K.P.dotK,1)];}};
const qd=(K,x,y,s)=>[K.dot(x,y,1),K.ln(x,y,x-K.o*0.6,y-K.o*2.6,0.72)];
GD["'"]={k:'cap',w:dotW,fn:K=>qd(K,K.c,K.h-K.o*K.P.dotK,1)};
GD['"']={k:'cap',w:p=>dotW(p)*2.7,fn:K=>[...qd(K,K.W*0.28,K.h-K.o*K.P.dotK),...qd(K,K.W*0.72,K.h-K.o*K.P.dotK)]};
GD['’']=GD["'"];
GD['‘']={k:'cap',w:dotW,fn:K=>K.rotc(qd(K,K.c,K.h-K.o*K.P.dotK),K.h-K.o*1.9)};
GD['”']=GD['"'];
GD['“']={k:'cap',w:p=>dotW(p)*2.7,fn:K=>K.rotc([...qd(K,K.W*0.28,K.h-K.o*K.P.dotK),...qd(K,K.W*0.72,K.h-K.o*K.P.dotK)],K.h-K.o*1.9)};
GD['„']={k:'xh',w:p=>dotW(p)*2.7,fn:K=>[...qd(K,K.W*0.28,K.o*K.P.dotK),...qd(K,K.W*0.72,K.o*K.P.dotK)]};
const dash=(f)=>({k:'xh',w:p=>Math.max(260,p.stem*f),fn:K=>[{p:[[K.o,K.X*0.42],[K.W-K.o,K.X*0.42]],w:K.hw}]});
GD['-']=dash(3.0);GD['–']=dash(4.4);GD['—']=dash(6.2);
GD['‒']={k:'xh',w:wdf(560,2),fn:K=>[{p:[[K.o,K.X*0.42],[K.W-K.o,K.X*0.42]],w:K.hw}]};/* figure dash = digit advance */
GD['−']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>[{p:[[K.o,K.X*0.5],[K.W-K.o,K.X*0.5]],w:K.hw}]};
GD['(']={k:'cap',w:wdf(300,0.8),fn:K=>{const ry=K.h*0.56,rx=K.h*0.34;return [{p:kE(K.o+rx,K.h*0.42,rx,ry,138,222)}];}};
GD[')']={k:'cap',w:wdf(300,0.8),fn:K=>K.mir(GD['('].fn(K))};
GD['/']={k:'cap',w:wdf(420,1.4),fn:K=>[K.ln(K.o,K.o-K.D*0.0,K.W-K.o,K.h-K.o)]};
GD['…']={k:'xh',w:p=>dotW(p)*3.2,fn:K=>[0.14,0.5,0.86].map(f=>K.dot(K.W*f,K.o*K.P.dotK,1))};
const guil=(K,left)=>{const m=K.X*0.5,a=K.X*0.2,dx=K.o*0.9,o=K.o,S=[];for(let i=0;i<2;i++){const x=o+i*(K.W*0.43);S.push({p:kRP([[x+dx*2.2,m+a],[x+dx*0.3,m],[x+dx*2.2,m-a]],o*0.6)});}return left?S:K.mir(S);};
GD['«']={k:'xh',w:wdf(660,3.4),fn:K=>guil(K,true)};
GD['»']={k:'xh',w:wdf(660,3.4),fn:K=>guil(K,false)};
GD['№']={k:'cap',w:wdf(1000,3),fn:K=>{const wn=K.W*0.50,xo=K.W*0.80,ro=K.h*0.17,K2=Object.assign({},K,{W:wn});return [...GD.N.fn(K2),K.ring(xo,K.h-K.o-ro,ro,ro),{p:[[xo-ro,K.o],[xo+ro,K.o]],w:0.7}];}};
GD['&']={k:'cap',w:wdf(660,2.2),fn:K=>{const hs=K.h-2*K.o,ru=hs*0.21,rl=hs*0.29,cu=K.W*0.40,cy=K.o+rl,rx=K.W*0.40;
  return [K.ring(cu,K.h-K.o-ru,ru*1.05,ru),{p:kCat(kE(K.W*0.46,cy,rx,rl,95,300),[[K.W-K.o,K.o+rl*0.5]])},K.ln(K.W-K.o,K.o,cu-ru*0.6,K.h-K.o-ru*1.8)];}};
/* ===== CS68: · © ₽ @ # % * + = \ | ° • — штрихи той же системы; жидкость сливает перекрестия сама ===== */
const rWt=(K,f)=>K.o*f;                                   /* радиус штриха при весе f (вес w у штриха — доля радиуса R) */
GD['·']={k:'xh',w:dotW,fn:K=>[K.dot(K.c,K.X*0.5,1)]};   /* точка на середине x-высоты, вес точки */
GD['•']={k:'cap',w:p=>p.stem*2.0+50,fn:K=>[K.dot(K.c,K.h*0.42,1.7)]};
GD['°']={k:'cap',w:p=>p.stem*1.75+56,fn:K=>{const rr=K.o*0.5,rc=rr*2.3;return [Object.assign({p:kE(K.c,K.h-rr-rc,rc,rc,0,360),c:true},{w:0.5})];}};
/* + и =: ось минуса (середина x-высоты), плечи — штрих горизонталей */
const mathAx=K=>K.X*0.5;
GD['+']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>{const m=mathAx(K),a=Math.min(K.W/2-K.o,K.X/2-K.o*1.05);return [{p:[[K.c-a,m],[K.c+a,m]],w:K.hw},{p:[[K.c,m-a],[K.c,m+a]],w:K.hw}];}};
GD['=']={k:'xh',w:p=>p.stem*3.6+40,fn:K=>{const m=mathAx(K),t=K.o*0.8,g=Math.min(t+Math.max(K.o*0.9,K.X*0.1),K.X/2-t-4);return [{p:[[K.o,m+g],[K.W-K.o,m+g]],w:0.8},{p:[[K.o,m-g],[K.W-K.o,m-g]],w:0.8}];}};
GD['\\']={k:'cap',w:wdf(420,1.4),fn:K=>K.mir(GD['/'].fn(K))};
GD['|']={k:'cap',w:wi,fn:K=>[K.ln(K.c,K.h-K.o,K.c,-K.D*0.45)]};
GD['*']={k:'cap',w:wdf(470,1.4),fn:K=>{const r=Math.min(K.c-K.o,K.h*0.2),cy=K.h-K.o-r*1.02,o=[];for(let i=0;i<3;i++){const a=(90+i*60)*Math.PI/180;o.push({p:[[K.c+r*Math.cos(a),cy+r*Math.sin(a)],[K.c-r*Math.cos(a),cy-r*Math.sin(a)]],w:0.85});}return o;}};
GD['#']={k:'cap',w:wdf(760,3.4),fn:K=>{const t=K.h*0.80,b=K.h*0.04+K.o*0.0,x1=K.W*0.36,x2=K.W*0.66,s=K.W*0.05,y1=K.h*0.60,y2=K.h*0.27,o=[];
  o.push({p:[[K.o,y1],[K.W-K.o,y1]],w:0.8},{p:[[K.o,y2],[K.W-K.o,y2]],w:0.8});
  o.push({p:[[x1+s,K.h-K.o*0.9],[x1-s,K.o*0.9]],w:0.8},{p:[[x2+s,K.h-K.o*0.9],[x2-s,K.o*0.9]],w:0.8});return o;}};
GD['%']={k:'cap',w:wdf(900,2.6),fn:K=>{const rr=K.o*0.55,rc=Math.max(rr*1.9,K.h*0.12),ry=rc*1.05;
  return [Object.assign({p:kE(K.o+rc*0.9,K.h-rr-ry,rc,ry,0,360),c:true},{w:0.55}),Object.assign({p:kE(K.W-K.o-rc*0.9,rr+ry,rc,ry,0,360),c:true},{w:0.55}),{p:[[K.W-K.o*1.4,K.h-K.o*0.9],[K.o*1.4,K.o*0.9]],w:0.8}];}};
GD['©']={k:'cap',w:wdf(900,2.4),fn:K=>{const f=Math.min(1,Math.pow(134/(2*K.o),1.15)),wr=0.8*f,wc=0.62*f,rx=K.c-K.o*wr,ry=K.h/2-K.o*wr,
  gap=K.P.gDot*0.55,avail=Math.min(rx,ry)-2*K.o*wr,ri=Math.max(K.o*0.3,0.34*Math.min(rx,ry)*0+0,Math.min(0.52*Math.min(rx,ry),avail-gap-K.o*wc));
  return [Object.assign(K.ring(K.c,K.h/2,rx,ry),{w:wr}),Object.assign({p:kE(K.c+ri*0.12,K.h/2,ri,ri,38,322)},{w:wc})];}};
GD['@']={k:'cap',w:wdf(900,2.4),fn:K=>{const rx=K.c-K.o,ry=K.h/2-K.o,ri=Math.min(rx,ry)*0.44,cx=K.c-ri*0.12,cy=K.h*0.5,xs=cx+ri;
  return [Object.assign(K.ring(K.c,K.h/2,rx,ry),{w:0.8}),Object.assign(K.ring(cx,cy,ri,ri),{w:0.55}),{p:kCat([[xs,cy+ri*1.05]],[[xs,cy-ri*0.5]],kE(xs+ri*0.7,cy-ri*0.5,ri*0.7,ri*0.7,180,320)),w:0.55}];}};
GD['₽']={k:'cap',w:wdf(560,2),fn:K=>{const sx=K.o+K.W*0.12,yb=Math.max(K.h*0.18,K.o*1.1),tb=K.o*0.7,gap=Math.max(K.o*0.5,K.P.gDot*0.5),yB=Math.min(K.h*0.54,yb+tb+gap+K.o),x1=K.W-K.o;
  return [K.ln(sx,K.o,sx,K.h-K.o),{p:K.bowl(sx,K.h-K.o,yB,x1,1.0)},{p:[[K.o,yb],[sx+(x1-sx)*0.78,yb]],w:0.7}];}};
/* кириллица строчные = капительные формы на высоте x */
const same=[['в','В'],['г','Г'],['д','Д'],['ж','Ж'],['з','З'],['и','И'],['й','Й'],['л','Л'],['п','П'],['ц','Ц'],['ч','Ч'],['ш','Ш'],['щ','Щ'],['ъ','Ъ'],['ы','Ы'],['ь','Ь'],['э','Э'],['ю','Ю'],['я','Я'],['ё','']];
GD['б']={k:'xh',w:wdf(570,2),fn:K=>[K.ring(K.c,K.o+(K.X*0.9)/2-K.o+0,K.c-K.o,(K.X*0.9)/2-K.o),K.ln(K.o,K.As-K.o,K.o,K.o),{p:kRP([[K.o,K.As-K.o],[K.W*0.62,K.As-K.o],[K.W*0.84,K.As-K.o-K.X*0.1]],K.o*1.2)}].slice(0,2).concat([{p:[[K.o,K.As-K.o],[K.W*0.80,K.As-K.o-K.X*0.08]],w:K.hw}])};
GD['ф']={k:'xh',w:wdf(700,2.2),fn:K=>[K.ring(K.c,K.X/2,K.c-K.o*1.5,K.X/2-K.o),K.ln(K.c,K.As-K.o,K.c,-K.D+K.o)]};
GD['Ё'].fn=GD['Ё'].fn;
GD['ё']={k:'xh',w:wdf(560,2),fn:K=>{const y=K.X+K.P.gDot+K.o*K.P.dotK;return [...GD.e.fn(K),K.dot(K.W*0.25,y,1),K.dot(K.W*0.75,y,1)];}};
/* ===== сборка таблицы: общие знаки латиницы/кириллицы — один и тот же объект ===== */
const kLower={'в':['B',520,'xh'],'г':['Г',420,'xh'],'д':['Д',620,'xh'],'ж':['Ж',800,'xh'],'з':['З',470,'xh'],'и':['И',560,'xh'],'й':['Й',560,'xh'],'к':['K',520,'xh'],
  'л':['Л',560,'xh'],'м':['M',700,'xh'],'н':['H',540,'xh'],'п':['П',540,'xh'],'т':['T',480,'xh'],'ц':['Ц',580,'xh'],'ч':['Ч',520,'xh'],'ш':['Ш',800,'xh'],'щ':['Щ',860,'xh'],
  'ъ':['Ъ',580,'xh'],'ы':['Ы',800,'xh'],'ь':['Ь',500,'xh'],'э':['Э',490,'xh'],'ю':['Ю',770,'xh'],'я':['Я',520,'xh']};
const kNst={'в':2,'г':1.4,'д':2,'ж':3,'з':2,'и':2,'й':2,'к':1.6,'л':2,'м':3,'н':2,'п':2,'т':1.4,'ц':2,'ч':2,'ш':3,'щ':3,'ъ':2,'ы':6,'ь':2,'э':2,'ю':3,'я':2};
const kTwinLo={'а':'a','е':'e','о':'o','р':'p','с':'c','у':'y','х':'x'},kTwinUp={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','У':'Y','Х':'X'};
for(const c in kLower){const [src,wb]=kLower[c];GD[c]={k:'xh',w:wdf(wb,kNst[c]),fn:GD[src].fn};}
const KGL={};
for(const ch of Object.keys(GD)){GD[ch].id=ch;KGL[ch]=GD[ch];}
for(const c in kTwinLo)KGL[c]=GD[kTwinLo[c]];for(const c in kTwinUp)KGL[c]=GD[kTwinUp[c]];
