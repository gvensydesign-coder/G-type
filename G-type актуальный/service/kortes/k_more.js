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
