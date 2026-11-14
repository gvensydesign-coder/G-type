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
