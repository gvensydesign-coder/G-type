/* ===== «Тяга» (Tyaga): растягиваемые монолинейные капители. Части: tyaga/engine.js ext.js tail.js (сборка mk_tyaga.sh) ===== */
(function(){
/* ===== «Тяга» (tyaga): растягиваемые монолинейные капители. Порт tyaga.js (прототип w82/S1) — логика построения знаков без изменений; части: tyaga/engine.js tail.js (сборка mk_tyaga.sh) ===== */
const TYG=(function(){

const T={};
T.M={upm:1000,cap:700,asc:950,desc:-260};
T.DEF={stroke:0.1875,round:1,base:1,apr:0.135,lead:0.135,stretch:1};
T.RANGE={stroke:[0.12,0.23],round:[0,1],base:[0.8,1.3],apr:[0.04,0.3],lead:[0.06,0.4],stretch:[1,6]};
T.STEPS={f:[1.5,2,3,4,6],d:[1.5,2],h:[1.5,2],n:[]};   // font alternates .s1..s5 (free) / .s1..s2 (diagonal; h = symbols with straight horizontals, free but capped at x2)
T.KMAX={f:6,d:2,h:2,n:1};
const D2R=Math.PI/180, cos=Math.cos, sin=Math.sin;
/* ---------- segments / contours ---------- */
const sL=(x0,y0,x1,y1)=>({t:'L',x0,y0,x1,y1});
const sA=(cx,cy,rx,ry,a0,a1)=>({t:'A',cx,cy,rx,ry,a0,a1,x0:cx+rx*cos(a0*D2R),y0:cy+ry*sin(a0*D2R),x1:cx+rx*cos(a1*D2R),y1:cy+ry*sin(a1*D2R)});
class Path{
  constructor(x,y){this.s=[];this.x=x;this.y=y;this.sx=x;this.sy=y;}
  l(x,y){if(Math.hypot(x-this.x,y-this.y)<1e-6)return this;this.s.push(sL(this.x,this.y,x,y));this.x=x;this.y=y;return this;}
  a(cx,cy,rx,ry,a0,a1){const g=sA(cx,cy,rx,ry,a0,a1);this.l(g.x0,g.y0);g.x0=this.x;g.y0=this.y;this.s.push(g);this.x=g.x1;this.y=g.y1;return this;}
  done(){this.l(this.sx,this.sy);return this.s;}
}
const poly=pts=>{const p=new Path(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)p.l(pts[i][0],pts[i][1]);return p.done();};
const flat=(c,step)=>{const o=[];for(const g of c){if(g.t==='L')o.push([g.x0,g.y0]);else{const n=Math.max(2,Math.ceil(Math.abs(g.a1-g.a0)/(step||10)));for(let i=0;i<n;i++){const a=(g.a0+(g.a1-g.a0)*i/n)*D2R;o.push([g.cx+g.rx*cos(a),g.cy+g.ry*sin(a)]);}}}return o;};
const area=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;};
const rev=c=>c.slice().reverse().map(g=>g.t==='L'?sL(g.x1,g.y1,g.x0,g.y0):Object.assign({},g,{a0:g.a1,a1:g.a0,x0:g.x1,y0:g.y1,x1:g.x0,y1:g.y0}));
const ccw=c=>area(flat(c))<0?rev(c):c;
const xf=(c,sx,sy,ox,oy)=>c.map(g=>{
  if(g.t==='L')return sL(ox+sx*g.x0,oy+sy*g.y0,ox+sx*g.x1,oy+sy*g.y1);
  const a0=Math.atan2(sy*sin(g.a0*D2R),sx*cos(g.a0*D2R))/D2R, a1=a0+sx*sy*(g.a1-g.a0);
  return sA(ox+sx*g.cx,oy+sy*g.cy,g.rx,g.ry,a0,a1);});
const mirX=(cs,xm)=>cs.map(c=>xf(c,-1,1,2*xm,0));
const mirY=(cs,ym)=>cs.map(c=>xf(c,1,-1,0,2*ym));
const rot=(cs,cx,cy)=>cs.map(c=>xf(c,-1,-1,2*cx,2*cy));
const mov=(cs,dx,dy)=>cs.map(c=>xf(c,1,1,dx,dy));
const bbox=cs=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const c of cs)for(const p of flat(c,3)){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}return{x0,y0,x1,y1};};
/* ---------- construction kit (context c) ---------- */
function kit(P){
  const H=T.M.cap,S=P.stroke*H,r=P.round,c={H,S,r,S2:S*1.08,ov:0.0104*H};
  c.T=H-S/2;c.M=H/2;c.B=S/2;c.R4=(H-S)/4;c.RO=c.R4+S/2;      // R4: half the bar spacing of a double bowl; RO: its outer radius
  c.rxC=0.465*H;                                               // outer half-width of the С half-ellipse (measured)
  c.dB=0.083*H;c.ob=0.02*H;                                    // lower bowl / Р bowl poke 3 px past the flat edge (measured)
                                                  // upper bowl of В З 8 is shorter than the lower one (measured)
  c.D=0.26*H;                                                  // descender of Д Ц Щ
  c.blob=(x0,y0,x1,y1,rad)=>{rad=Math.min(rad,(x1-x0)/2,(y1-y0)/2);if(rad<0.5)return poly([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);const p=new Path(x0+rad,y0);p.l(x1-rad,y0).a(x1-rad,y0+rad,rad,rad,270,360).l(x1,y1-rad).a(x1-rad,y1-rad,rad,rad,0,90).l(x0+rad,y1).a(x0+rad,y1-rad,rad,rad,90,180).l(x0,y0+rad).a(x0+rad,y0+rad,rad,rad,180,270);return p.done();};
  c.rbar=(cx,cy,L,t,deg)=>{const a=deg*D2R,ux=cos(a),uy=sin(a),vx=-uy,vy=ux,h=L/2,w=t/2;return poly([[cx-ux*h-vx*w,cy-uy*h-vy*w],[cx+ux*h-vx*w,cy+uy*h-vy*w],[cx+ux*h+vx*w,cy+uy*h+vy*w],[cx-ux*h+vx*w,cy-uy*h+vy*w]]);};
  c.rect=(x0,y0,x1,y1)=>poly([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
  c.hb=(x0,x1,yc,t)=>c.rect(x0,yc-(t||S)/2,x1,yc+(t||S)/2);
  c.vb=(x,y0,y1,t)=>c.rect(x,y0,x+(t||S),y1);
  c.hw=(dx,dy)=>Math.min(2.2*S,S*Math.hypot(dx,dy)/Math.max(dy,1));  // horizontal width that keeps the PERPENDICULAR stroke = S (measured И)
  c.dg=(xb,yb,xt,yt,hw)=>poly([[xb,yb],[xb+hw,yb],[xt+hw,yt],[xt,yt]]);
  /* half-ring band: round end at xRound, butt (flat) end at xButt, outer top/bottom yTo/yBo, outer corner radii cx,cy, thickness t */
  c.cs=(xR,xB,yTo,yBo,cx,cy,t)=>{
    const d=xB>xR?1:-1;cy=Math.min(cy,(yTo-yBo)/2);cx=Math.min(cx,Math.abs(xB-xR)-1);t=t||S;
    const cxi=cx-t,cyi=cy-t,ar=cx>0.5&&cy>0.5,ai=cxi>0.5&&cyi>0.5;
    const A=(a)=>d>0?a:180-a;
    const p=new Path(xB,yTo);
    p.l(xR+d*cx,yTo);
    if(ar)p.a(xR+d*cx,yTo-cy,cx,cy,A(90),A(180));
    p.l(xR,yBo+cy);
    if(ar)p.a(xR+d*cx,yBo+cy,cx,cy,A(180),A(270));
    p.l(xB,yBo).l(xB,yBo+t);
    if(ai){p.l(xR+d*(t+cxi),yBo+t);p.a(xR+d*(t+cxi),yBo+t+cyi,cxi,cyi,A(270),A(180));p.l(xR+d*t,yTo-t-cyi);p.a(xR+d*(t+cxi),yTo-t-cyi,cxi,cyi,A(180),A(90));}
    else{p.l(xR+d*t,yBo+t);p.l(xR+d*t,yTo-t);}
    p.l(xB,yTo-t);
    return p.done();};
  /* bowl between two bar centre lines (stem-side butt xB, round extreme xR) */
  c.bowl=(xB,xR,ycT,ycB)=>{const h=ycT-ycB+S,rho=r*h/2;return c.cs(xR,xB,ycT+S/2,ycB-S/2,rho,rho,S);};
  c.rho=()=>r*c.RO;                                            // corner radius of a double-bowl end
  c.stad=(x0,x1,yTo,yBo,rx,t)=>{const xm=(x0+x1)/2,w=x1-x0,cx=r*Math.min(rx,w/2-2),cy=r*(yTo-yBo)/2,dl=(w-2*cx)>14?8:0;
    return [c.cs(x0,xm+dl,yTo,yBo,cx,cy,t),c.cs(x1,xm-dl,yTo,yBo,cx,cy,t)];};
  /* cup: stems with rounded bottom (U, J) ; lt/rt = top of the left/right stem */
  c.cup=(W,lt,rt,rho)=>{rho=r*rho;const ri=rho-S;const p=new Path(0,lt);
    p.l(0,rho);if(rho>0.5)p.a(rho,rho,rho,rho,180,270);p.l(W-rho,0);if(rho>0.5)p.a(W-rho,rho,rho,rho,270,360);
    p.l(W,rt).l(W-S,rt);
    if(ri>0.5){p.l(W-S,rho);p.a(W-rho,rho,ri,ri,360,270);p.l(rho,S);p.a(rho,rho,ri,ri,270,180);}else{p.l(W-S,S).l(S,S);}
    p.l(S,lt);return p.done();};
  return c;
}
/* ---------- glyph table ----------
   w: base width in cap heights (×base slider), cls: f free / d diagonal / n none, mn: minimum width fn(c)  */
const G={};
const def=(ch,w,cls,f,mn)=>{G[ch]={w,cls,f,mn};};
const OPT={C:[0.028,0],G:[0.028,0],O:[0.022,0.022],Q:[0.022,0.022],'0':[0.022,0.022],'Э':[0,0.028],D:[0,0.01],Ю:[0,0.022]};  // extra left/right sidebearing of round ends, in H (measured: С starts 4 px inside the flat edge)
const stem=c=>c.vb(0,0,c.H);
/* --- straight family --- */
def('E',1.0,'f',(c,W)=>[stem(c),c.hb(0,W,c.T),c.hb(0,W,c.M),c.hb(0,W,c.B)]);
def('Ё',1.0,'f',(c,W)=>{const d=0.72*c.S,y=c.H+0.4*c.S,g=0.6*d;return [...G.E.f(c,W),c.rect(W/2-g/2-d,y,W/2-g/2,y+d),c.rect(W/2+g/2,y,W/2+g/2+d,y+d)];});
def('F',0.9,'f',(c,W)=>[stem(c),c.hb(0,W,c.T),c.hb(0,W,c.M)]);
def('Г',0.85,'f',(c,W)=>[stem(c),c.hb(0,W,c.T)]);
def('L',0.85,'f',(c,W)=>[stem(c),c.hb(0,W,c.B)]);
def('H',1.0,'f',(c,W)=>[stem(c),c.vb(W-c.S,0,c.H),c.hb(0,W,c.M)]);
def('П',1.0,'f',(c,W)=>[stem(c),c.vb(W-c.S,0,c.H),c.hb(0,W,c.T)]);
def('T',1.0,'f',(c,W)=>[c.hb(0,W,c.T),c.vb((W-c.S)/2,0,c.H)]);
def('I',0.0,'n',(c,W)=>[stem(c)]);
def('Ш',1.35,'f',(c,W)=>[stem(c),c.vb((W-c.S)/2,0,c.H),c.vb(W-c.S,0,c.H),c.hb(0,W,c.B)]);
def('Щ',1.45,'f',(c,W)=>[stem(c),c.vb((W-c.S)/2,0,c.H),c.vb(W-c.S,-c.D,c.H),c.hb(0,W,c.B)]);
def('Ц',1.05,'f',(c,W)=>[stem(c),c.vb(W-c.S,-c.D,c.H),c.hb(0,W,c.B)]);
def('Ч',1.0,'f',(c,W)=>{const yq=0.42*c.H;return [c.vb(0,yq-c.S/2,c.H),c.vb(W-c.S,0,c.H),c.hb(0,W,yq)];});
def('Д',1.4,'f',(c,W)=>{const S=c.S,f=1.9*S,D=0.24*c.H;return [c.hb(f,W-f,c.T),c.vb(f,0,c.H),c.vb(W-f-S,0,c.H),c.hb(0,W,S/2),c.vb(0,-D,S),c.vb(W-S,-D,S)];},c=>4*c.S+2*1.9*c.S);
/* --- double-bowl family --- */
def('В',1.0,'f',(c,W)=>[stem(c),c.bowl(0,W-c.dB,c.T,c.M),c.bowl(0,W+c.ob,c.M,c.B)]);
def('Р',1.0,'f',(c,W)=>[stem(c),c.bowl(0,W+c.ob,c.T,c.M)]);
def('Ь',0.8,'f',(c,W)=>[stem(c),c.bowl(0,W+c.ob,c.M,c.B)]);
def('Б',1.0,'f',(c,W)=>[stem(c),c.hb(0,W,c.T),c.bowl(0,W+c.ob,c.M,c.B)]);
def('Ъ',1.15,'f',(c,W)=>{const F=0.3*c.H;return [c.hb(0,F+c.S,c.T),c.vb(F,0,c.H),c.bowl(F,W+c.ob,c.M,c.B)];},c=>0.3*c.H+c.S+c.RO+0.1*c.H);
def('Ы',1.0,'f',(c,W)=>{const g=0.1*c.H,Wb=W-g-c.S;return [stem(c),c.bowl(0,Wb,c.M,c.B),c.vb(W-c.S,0,c.H)];},c=>c.S+c.RO+0.1*c.H+0.1*c.H+c.S);
def('Я',0.95,'d',(c,W)=>{const S=c.S;const hw=c.hw(W*0.7,c.M);return [c.vb(W-S,0,c.H),c.bowl(W,0,c.T,c.M),c.dg(0.12*W,0,W-S-hw+S*0.5,c.M,hw)];});
def('З',1.0,'f',(c,W)=>{const x0=0.4*c.H;return [c.bowl(x0,W-c.dB,c.T,c.M),c.bowl(x0,W+c.ob,c.M,c.B),c.hb(0,x0+8,c.T),c.hb(0,x0+8,c.B)];},c=>0.4*c.H+c.RO+0.1*c.H);
def('3',0.95,'d',(c,W)=>{const S=c.S,x0=0.3*c.H,hw=c.hw(W-x0-S,c.T-c.M);return [c.hb(0,W,c.T),c.dg(x0,c.M,W-hw,c.T,hw),c.bowl(x0,W+c.ob,c.M,c.B),c.hb(0,x0+8,c.B)];},c=>0.3*c.H+c.RO+0.1*c.H);
def('5',0.95,'f',(c,W)=>[c.hb(0,W,c.T),c.vb(0,c.M-c.S/2,c.H),c.bowl(0,W,c.M,c.B)]);
def('S',1.0,'f',(c,W)=>{const rho=c.rho();return [c.bowl(W-rho,0,c.T,c.M),c.bowl(rho,W,c.M,c.B),c.hb(W-rho-4,W,c.T),c.hb(0,rho+4,c.B)];},c=>2*c.RO+0.2*c.H);
def('?',0.62,'n',(c,W)=>{const S=c.S,xs=W/2-S/2,yd=Math.max(0.31*c.H,1.75*S);return [c.bowl(xs,W,c.T,c.M),c.hb(0,xs+8,c.T),c.vb(xs,yd,c.M),c.rect(xs,0,xs+S,S)];});
/* --- rounds --- */
const ringH=c=>c.H+2*c.ov;
def('C',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H);return [c.cs(0,W,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2)];},c=>c.rxC+0.3*c.H);
def('O',1.0,'f',(c,W)=>c.stad(0,W,c.H+c.ov,-c.ov,c.rxC,c.S2),c=>2*c.rxC);
def('Э',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H);const tl=0.55*c.H;return [c.cs(W,0,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2),c.hb(W-tl,W-c.S2/2,c.M)];},c=>c.rxC+0.6*c.H);
def('D',1.0,'f',(c,W)=>[stem(c),c.cs(W,0,c.H,0,c.r*Math.min(c.rxC,W-c.S-0.1*c.H),c.r*c.H/2,c.S)],c=>c.rxC+c.S+0.1*c.H);
def('G',1.05,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H),S=c.S;return [c.cs(0,W,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2),c.vb(W-S,-c.ov,c.M+S/2),c.hb(W-0.5*c.H,W,c.M)];},c=>c.rxC+0.4*c.H);
def('Q',1.0,'f',(c,W)=>{const S=c.S,hw=c.hw(0.2*c.H,0.3*c.H+0.7*S);return [...c.stad(0,W,c.H+c.ov,-c.ov,c.rxC,c.S2),c.dg(W-0.34*c.H,-0.2*c.H,W-0.54*c.H,0.7*S,hw)];},c=>2*c.rxC);
def('Ю',1.2,'f',(c,W)=>{const x0=c.S+0.1*c.H,rx=0.42*c.H;return [stem(c),c.hb(0,x0+c.S2/2,c.M),...c.stad(x0,W,c.H+c.ov,-c.ov,rx,c.S2)];},c=>c.S+0.1*c.H+2*0.42*c.H);
def('Ф',1.15,'f',(c,W)=>{const RH=0.74*c.H,y0=(c.H-RH)/2;return [c.vb((W-c.S)/2,-c.ov,c.H+c.ov),...c.stad(0,W,y0+RH,y0,RH/2,c.S)];},c=>0.74*c.H+0.3*c.H);
def('U',1.0,'f',(c,W)=>[c.cup(W,c.H,c.H,Math.min(0.45*c.H,W/2))]);
def('J',0.8,'f',(c,W)=>[c.cup(W,0.42*c.H,c.H,Math.min(0.4*c.H,W/2))],c=>c.S*2+0.4*c.H);
def('0',0.85,'f',(c,W)=>{const S=c.S,hw=c.hw(0.4*W,c.H-S);return [...c.stad(0,W,c.H+c.ov,-c.ov,0.4*c.H,c.S2),c.dg(0.3*W-hw/2,S/2,0.7*W-hw/2,c.H-S/2,hw)];},c=>0.8*c.H);
def('8',0.95,'f',(c,W)=>{const x0=0.04*c.H;return [...c.stad(x0,W-x0,c.T+c.S/2,c.M-c.S/2,c.RO,c.S),...c.stad(0,W,c.M+c.S/2,-0+0,c.RO,c.S)];},c=>2*c.RO+0.2*c.H);
def('6',0.95,'f',(c,W)=>{const RH=0.64*c.H,S=c.S,y0=RH/2,ry=c.H-y0,rx=c.r*Math.min(c.rxC,W*0.5),cx=rx,cy=c.r*ry,Wt=0.78*W;
  const p=new Path(0,y0);p.l(0,c.H-cy);if(cx>0.5&&cy>0.5)p.a(cx,c.H-cy,cx,cy,180,90);p.l(Wt,c.H).l(Wt,c.H-S);
  if(cx-S>0.5&&cy-S>0.5){p.l(cx,c.H-S);p.a(cx,c.H-cy,cx-S,cy-S,90,180);}else p.l(S,c.H-S);p.l(S,y0);
  return [...c.stad(0,W,RH,0,RH/2,S),p.done()];},c=>0.64*c.H+0.3*c.H);
def('9',0.95,'f',(c,W)=>rot(G['6'].f(c,W),W/2,c.H/2),c=>0.66*c.H+0.1*c.H);
/* --- diagonal family --- */
def('Л',1.0,'d',(c,W)=>{const hw=c.hw((W-c.S)/2,c.H);return [c.dg(0,0,W/2-hw/2,c.H,hw),c.dg(W-hw,0,W/2-hw/2,c.H,hw)];});
def('V',1.0,'d',(c,W)=>mirY(G['Л'].f(c,W),c.H/2));
def('A',1.0,'d',(c,W)=>{const hw=c.hw((W-c.S)/2,c.H),yq=0.3*c.H;const lx=(W/2-hw/2)*yq/c.H;return [...G['Л'].f(c,W),c.hb(lx+hw/2,W-lx-hw/2,yq)];});
def('И',1.0,'d',(c,W)=>{const hw=c.hw(W-c.S,c.H);return [stem(c),c.vb(W-c.S,0,c.H),c.dg(0,0,W-hw,c.H,hw)];});
def('N',1.0,'d',(c,W)=>mirX(G['И'].f(c,W),W/2));
def('Й',1.0,'d',(c,W)=>{const hw=c.hw(W-c.S,c.H),S=c.S;const xl=(W-hw)*(1-S/c.H),bs=Math.min(S,0.42*(xl-S)),bx=(S+xl)/2-bs/2;return [...G['И'].f(c,W),c.rect(bx,c.H-bs,bx+bs,c.H)];});
def('Х',1.0,'d',(c,W)=>{const hw=c.hw(W-c.S,c.H);return [c.dg(0,0,W-hw,c.H,hw),c.dg(W-hw,0,0,c.H,hw)];});
def('K',1.0,'d',(c,W)=>{const hw=c.hw(W-c.S,0.58*c.H),S=c.S,yk=0.42*c.H;return [stem(c),c.dg(S/2,yk,W-hw,c.H,hw),c.dg(W-hw,0,S/2,yk,hw)];});
def('Z',1.0,'d',(c,W)=>{const hw=c.hw(W-c.S,c.H);return [c.hb(0,W,c.T),c.hb(0,W,c.B),c.dg(0,0,W-hw,c.H,hw)];});
def('Y',1.0,'d',(c,W)=>{const yv=0.45*c.H,hw=c.hw((W-c.S)/2,c.H-yv);return [c.dg(W/2-hw/2,yv,0,c.H,hw),c.dg(W/2-hw/2,yv,W-hw,c.H,hw),c.vb(W/2-c.S/2,0,yv+c.S*0.5)];});
def('Ж',1.3,'d',(c,W)=>{const hw=c.hw((W-c.S)/2,c.M);const q=[c.dg((W-hw)/2,c.M,0,c.H,hw),c.dg((W-hw)/2,c.M,W-hw,c.H,hw)];return [c.vb((W-c.S)/2,0,c.H),...q,...mirY(q,c.M)];});
def('M',1.3,'d',(c,W)=>{const hw=c.hw(W/2-c.S,c.H);const l=c.dg(W/2-hw/2,0,0,c.H,hw);return [stem(c),c.vb(W-c.S,0,c.H),l,...mirX([l],W/2)];});
def('W',1.45,'d',(c,W)=>{const hw=c.hw(W/4,c.H),yp=0.86*c.H;const q=[c.dg(W/4-hw/2,0,0,c.H,hw),c.dg(W/4-hw/2,0,W/2-hw/2,yp,hw)];return [...q,...mirX(q,W/2)];});
def('R',1.0,'d',(c,W)=>{const hw=c.hw(0.45*W,c.M);return [stem(c),c.bowl(0,W,c.T,c.M),c.dg(W-hw,0,0.3*W,c.M,hw)];});
def('2',0.95,'d',(c,W)=>{const xa=Math.max(0.3*c.H,W-0.62*c.H),S=c.S,hw=c.hw(xa,c.M);return [c.hb(0,xa+8,c.T),c.bowl(xa,W-c.dB,c.T,c.M),c.dg(0,0,xa,c.M+c.S/2,hw),c.hb(0,W,c.B)];},c=>0.3*c.H+c.RO+0.1*c.H);
def('4',1.0,'d',(c,W)=>{const S=c.S,yq=0.3*c.H,xs=0.66*W,hw=c.hw(xs-S,c.H-yq);return [c.hb(0,W,yq),c.vb(xs,0,c.H),c.dg(0,yq,xs-hw+S,c.H,hw)];});
def('7',0.95,'d',(c,W)=>{const hw=c.hw(W-0.3*c.H,c.H);return [c.hb(0,W,c.T),c.dg(0.24*c.H,0,W-hw,c.T,hw)];});
def('1',0.45,'n',(c,W)=>{const S=c.S,hw=1.3*S,dy=0.22*c.H,dx=0.84*dy;return [c.vb(W-S,0,c.H),c.dg(Math.max(0,W-hw-dx),c.H-dy,W-hw,c.H,hw)];});
/* --- punctuation / symbols --- */
const comma=(c)=>{const S=c.S;return poly([[0,S],[S,S],[S,0],[0.6*S,-0.25*c.H],[0,-0.25*c.H]]);};
const quoteMark=(c)=>mov([comma(c)],0,c.H-c.S)[0];
def('.',0,'n',c=>[c.rect(0,0,c.S,c.S)]);
def(',',0,'n',c=>[comma(c)]);
def(':',0,'n',c=>[c.rect(0,0,c.S,c.S),c.rect(0,0.36*c.H,c.S,0.36*c.H+c.S)]);
def(';',0,'n',c=>[c.rect(0,0.36*c.H,c.S,0.36*c.H+c.S),comma(c)]);
def('!',0,'n',c=>[c.rect(0,0,c.S,c.S),c.rect(0,0.31*c.H,c.S,c.H)]);
def('…',0,'n',c=>[c.rect(0,0,c.S,c.S),c.rect(2*c.S,0,3*c.S,c.S),c.rect(4*c.S,0,5*c.S,c.S)]);
def("'",0,'n',c=>[c.rect(0,0.6*c.H,c.S,c.H)]);
def('"',0,'n',c=>[c.rect(0,0.6*c.H,c.S,c.H),c.rect(2*c.S,0.6*c.H,3*c.S,c.H)]);
def('’',0,'n',c=>[quoteMark(c)]);
def('‘',0,'n',c=>rot([quoteMark(c)],c.S/2,c.H-0.125*c.H-c.S/2));
def('”',0,'n',c=>[quoteMark(c),mov([quoteMark(c)],2*c.S,0)[0]]);
def('“',0,'n',c=>{const a=[quoteMark(c),mov([quoteMark(c)],2*c.S,0)[0]];return rot(a,1.5*c.S,c.H-0.125*c.H-c.S/2);});
def('„',0,'n',c=>[comma(c),mov([comma(c)],2*c.S,0)[0]]);
def('-',0.42,'f',(c,W)=>[c.hb(0,W,c.M)]);
def('–',0.75,'f',(c,W)=>[c.hb(0,W,c.M)]);
def('—',1.25,'f',(c,W)=>[c.hb(0,W,c.M)]);
def('−',0.7,'f',(c,W)=>[c.hb(0,W,c.M)]);
def('=',0.7,'f',(c,W)=>[c.hb(0,W,c.M+c.S),c.hb(0,W,c.M-c.S)]);
def('+',0.7,'f',(c,W)=>[c.hb(0,W,c.M),c.vb(W/2-c.S/2,c.M-0.35*c.H,c.M+0.35*c.H)]);
def('/',0.62,'n',(c,W)=>{const hw=c.hw(W,c.H);return [c.dg(0,-0.04*c.H,W-hw,c.H+0.04*c.H,hw)];});
def('(',0.3,'n',(c,W)=>[c.cs(0,W-0.02*c.H,c.H+0.07*c.H,-0.07*c.H,c.r*0.3*c.H,c.r*(c.H+0.14*c.H)/2,c.S)]);
def(')',0.3,'n',(c,W)=>[c.cs(W,0.02*c.H,c.H+0.07*c.H,-0.07*c.H,c.r*0.3*c.H,c.r*(c.H+0.14*c.H)/2,c.S)]);
const chevK=c=>{const dx=0.2*c.H,hh=0.28*c.H,hw=0.92*c.S*Math.hypot(dx,hh)/hh;return{dx,hh,hw,off:1.75*hw};};
const chev=(c,x,k)=>[c.dg(x,c.M,x+k.dx,c.M+k.hh,k.hw),c.dg(x,c.M,x+k.dx,c.M-k.hh,k.hw)];
def('«',0,'n',c=>{const k=chevK(c);return [...chev(c,0,k),...chev(c,k.off,k)];});
def('»',0,'n',c=>{const k=chevK(c),Wc=k.off+k.dx+k.hw;return mirX([...chev(c,0,k),...chev(c,k.off,k)],Wc/2);});
def('%',0,'n',(c)=>{const S=c.S,H=c.H,t=0.64*S,wR=0.5*H,hR=0.46*H,g=Math.max(0.3*S,36);
  /* ring boxes keep a clear gap g from the slash at every stroke: slash width hw = S/cos, W adapts (fixed point) */
  let W=1.25*H,hw=c.hw(W,H);for(let i=0;i<6;i++){W=Math.max(1.25*H,hw+(wR+g)/(1-hR/H));hw=c.hw(W-hw,H);}
  return [...c.stad(0,wR,H,H-hR,wR/2,t),...c.stad(W-wR,W,hR,0,wR/2,t),c.dg(0,0,W-hw,H,hw)];});
def('№',0,'n',(c)=>{const S=c.S,H=c.H,t=0.66*S,Wn=0.9*H,wO=Math.max(0.5*H,3.3*t),hO=Math.max(0.48*H,3.1*t),x0=Wn+0.12*H,gp=0.35*t;
  return [...G.N.f(c,Wn),...c.stad(x0,x0+wO,H,H-hO,wO/2,t),c.hb(x0,x0+wO,H-hO-gp-t/2,t)];});
def('&',0,'n',(c)=>{const S=c.S,H=c.H,W=Math.max(1.0*H,6*S),hU=Math.max(0.56*H,2.6*S),yb=H-hU,xu0=0.16*W,xu1=xu0+Math.max(0.56*W,hU),xc=(xu0+xu1)/2,hL=yb+S,yt=yb+0.6*S;
  /* upper loop over a wider lower lobe sharing one bar; the diagonal leg starts inside that bar; the lobe bars stop under the loop (no shelf), the bottom bar runs to the foot and ends hidden inside the leg */
  let hw=c.hw(0.7*W,yt);hw=c.hw(W-hw-0.3*W,yt);const rl=c.r*hL/2;
  return [...c.stad(xu0,xu1,H,yb,(xu1-xu0)/2,S),c.cs(0,xc,hL,0,rl,rl,S),c.hb(xc-10,W-hw+10,S/2),c.dg(W-hw,0,0.3*W,yt,hw)];});
/* --- symbols @ # * © ₽ ° • · \ | (same construction logic: stroke S, butt ends, half-ring rounds, Скругление applies) ---
   h = symbols with straight horizontals: free stretch, capped at x2 (₽ #); the rest does not stretch */
def('₽',1.1,'h',(c,W)=>{const e=0.14*c.H,S=c.S;return [c.vb(e,0,c.H),c.bowl(e,W+c.ob,c.T,c.M),c.hb(0,e+(W-e)*0.78,0.22*c.H)];},c=>0.14*c.H+3.2*c.S);
def('#',1.0,'h',(c,W)=>{const S=c.S,a=0.16*c.H,d=0.21*c.H;return [c.vb(a,0,c.H),c.vb(W-a-S,0,c.H),c.hb(0,W,c.M-d),c.hb(0,W,c.M+d)];},c=>2*0.16*c.H+3*c.S);
def('@',0.97,'n',(c,W)=>{const S=c.S,r=c.r,t1=0.8*S,t2=0.7*S,hh=c.H+2*c.ov,rx=Math.min(c.rxC,W-0.3*c.H),di=0.44*c.H,xl=t1+0.55*S,xr=W-0.2*c.H,yb=t1-c.ov+0.45*S,yt=yb+di;
  return [c.cs(0,W,c.H+c.ov,-c.ov,r*rx,r*hh/2,t1),...c.stad(xl,xr,yt,yb,di/2,t2),c.vb(xr-t2,t1-c.ov-4,yt,t2)];},c=>1.35*c.S+0.64*c.H);
def('*',0,'n',c=>{const t=0.8*c.S,L=Math.max(0.46*c.H,2.6*c.S),sx=L/2*cos(30*D2R)+t/2*sin(30*D2R);return [c.rbar(sx,c.H-L/2,L,t,90),c.rbar(sx,c.H-L/2,L,t,30),c.rbar(sx,c.H-L/2,L,t,150)];});
def('©',0,'n',c=>{const t=0.62*c.S,Wd=c.H+2*c.ov,wc=0.42*c.H,hc=0.5*c.H,xl=Wd/2-wc/2-0.01*c.H,yc=c.H/2;
  return [...c.stad(0,Wd,c.H+c.ov,-c.ov,Wd/2,t),c.cs(xl,xl+wc,yc+hc/2,yc-hc/2,c.r*wc*0.75,c.r*hc/2,t)];});
def('°',0,'n',c=>{const d=0.44*c.H;return c.stad(0,d,c.H,c.H-d,d/2,0.7*c.S);});
def('•',0,'n',c=>{const d=0.3*c.H;return [c.blob(0,c.M-d/2,d,c.M+d/2,c.r*d/2)];});
def('·',0,'n',c=>[c.rect(0,c.M-c.S/2,c.S,c.M+c.S/2)]);
def('\\',0.62,'n',(c,W)=>mirX(G['/'].f(c,W),W/2));
def('|',0,'n',c=>[c.vb(0,-0.24*c.H,c.H)]);
/* ---------- W88 A: extended set (Ukrainian, Belarusian, Serbian/Macedonian, Kazakh, Latin Extended-A + Latin-1 caps) ----------
   Caps only (lower case code points map to the same glyph through T.canon). New letters are built from the face's own components
   (stroke S, bowls, half-rings, butt ends) and get the stretch class of their base. Marks (top: dot, acute, grave, circumflex, caron, breve with thick ends,
   macron, tilde, ring, double acute, diaeresis; bottom: cedilla, comma, ogonek) are drawn with the stroke t = 0.58 S inside a fixed mark zone
   (top of the mark <= 890 u, so the line gap and the 950 u ascender are kept at every stroke) and attach at the top (or foot) anchor of the base. */
const MK={};
const mkM=c=>{const S=c.S,t=0.66*S,gap=0.4*S,room=890-(c.H+gap),mh=Math.max(Math.min(Math.max(0.19*c.H,2*t),room),1.6*t);return{t,gap,mh,y0:c.H+gap,mw:Math.max(0.36*c.H,3.2*t)};};
const hwOf=(t,dx,h)=>Math.min(2.4*t,t*Math.hypot(dx,h)/Math.max(h,1));
const dd=c=>Math.max(0.72*c.S,0.62*mkM(c).mh);/* dot size: >= 0.6 x acute height at light weights */
MK.dot=(c,cx)=>{const d=dd(c),m=mkM(c);return [c.rect(cx-d/2,m.y0,cx+d/2,m.y0+d)];};
MK.dier=(c,cx)=>{const d=dd(c),g=0.6*d,m=mkM(c);return [c.rect(cx-g/2-d,m.y0,cx-g/2,m.y0+d),c.rect(cx+g/2,m.y0,cx+g/2+d,m.y0+d)];};
MK.acute=(c,cx,x,dir)=>{const m=mkM(c),dx=0.42*m.mh,hw=hwOf(m.t,dx,m.mh),s=dir||1,xb=cx-s*dx/2-hw/2,xt=cx+s*dx/2-hw/2;return [c.dg(xb,m.y0,xt,m.y0+m.mh,hw)];};
MK.grave=(c,cx)=>MK.acute(c,cx,0,-1);
MK.dacute=(c,cx)=>{const m=mkM(c),o=0.5*m.mw*0.5;return [...MK.acute(c,cx-o),...MK.acute(c,cx+o)];};
MK.circ=(c,cx)=>{const m=mkM(c),w=m.mw,hw=hwOf(m.t,w/2,m.mh);return [c.dg(cx-w/2,m.y0,cx-hw/2,m.y0+m.mh,hw),c.dg(cx+w/2-hw,m.y0,cx-hw/2,m.y0+m.mh,hw)];};
MK.caron=(c,cx)=>{const m=mkM(c);return mirY(MK.circ(c,cx),m.y0+m.mh/2);};
MK.macron=(c,cx)=>{const m=mkM(c);return [c.hb(cx-m.mw/2,cx+m.mw/2,m.y0+m.t/2,m.t)];};
/* U-shaped cup at the origin: width wb, height hb, wall ts (ends) / bottom tb (round = Скругление) */
const cupM=(c,wb,hb,ts,tb)=>{const rho=c.r*Math.min(wb/2,hb*0.95),p=new Path(0,hb);
  p.l(0,rho);if(rho>0.5)p.a(rho,rho,rho,rho,180,270);p.l(wb-rho,0);if(rho>0.5)p.a(wb-rho,rho,rho,rho,270,360);p.l(wb,hb).l(wb-ts,hb);
  if(rho-ts>0.5&&rho-tb>0.5){p.l(wb-ts,rho);p.a(wb-rho,rho,rho-ts,rho-tb,360,270);p.l(rho,tb);p.a(rho,rho,rho-ts,rho-tb,270,180);}else{p.l(wb-ts,tb).l(ts,tb);}
  p.l(ts,hb);return p.done();};
/* breve: cup with thickened ends (Cyrillic form) */
MK.breve=(c,cx)=>{const m=mkM(c),wb=1.1*m.mw;return mov([cupM(c,wb,m.mh,1.22*m.t,0.8*m.t)],cx-wb/2,m.y0);};
MK.ring=(c,cx)=>{const m=mkM(c),d=Math.min(0.3*c.H,890-m.y0),tr=Math.min(0.42*c.S,0.24*d);return c.stad(cx-d/2,cx+d/2,m.y0+d,m.y0,d/2,tr);};
/* tilde: round-cornered square wave (cap + cup sharing the middle wall) — the face's own geometry */
MK.tilde=(c,cx)=>{const m=mkM(c),w=m.mw*1.3,t=m.t,wb=w/2+t/2,hb=0.66*m.mh,up=cupM(c,wb,hb,t,t);
  return [...mov([up],cx-t/2,m.y0),...mov(rot([up],wb/2,hb/2),cx-w/2,m.y0+m.mh-hb)];};
MK.ced=(c,cx)=>{const t=0.66*c.S,D=0.2*c.H;return [c.rect(cx-t/2,-D,cx+t/2,0.05*c.H),c.hb(cx-t/2-0.14*c.H,cx+t/2,-D+t/2,t)];};
MK.comma=(c,cx)=>{const w=0.8*c.S,b=-0.21*c.H;return [poly([[cx-w/2,0.12*c.S],[cx+w/2,0.12*c.S],[cx+w/2,b+0.25*w],[cx+0.1*w,b],[cx-w/2,b]])];};
MK.ogon=(c,x)=>{const t=0.66*c.S,D=0.2*c.H;return [c.rect(x,-D,x+t,0.14*c.H),c.hb(x,x+t+0.1*c.H,-D+t/2,t)];};
const NEWG={};/* canonical -> [base, kind] for kerning classes */
const comp=(ch,base,fn)=>{const b=G[base];if(!b)return;def(ch,b.w,b.cls,(c,W)=>fn(c,W,b),b.mn);NEWG[ch]=base;};
/* mark over the base: cx = anchor x (default W/2; fixed-size bases such as I use the stem centre) */
const over=(marks,opt)=>(c,W,b)=>{opt=opt||{};let cs=b.f(c,W);const cx=opt.cx?opt.cx(c,W):(b.w===0?c.S/2:W/2);
  for(const m of marks){const mc=MK[m.n||m](c,cx+(m.dx||0),W);cs=cs.concat(mc);}
  return cs;};
const under=(m,opt)=>(c,W,b)=>{const cs=b.f(c,W);const x=opt&&opt.x?opt.x(c,W):W/2;return cs.concat(m==='ogon'?MK.ogon(c,x):MK[m](c,x));};
/* I-based letters (w = 0): marks wider than the stem shift the stem right so nothing leaves the cell */
const iBased=(ch,mk)=>{def(ch,0,'n',(c)=>{const m=mkM(c),ext=mk==='dier'?(dd(c)*2.6):mk==='dot'?dd(c):m.mw,e=Math.max(0,(ext-c.S)/2);return mov([c.vb(0,0,c.H),...MK[mk](c,c.S/2)],e,0);});NEWG[ch]='I';};
/* ---- Latin Extended-A + Latin-1 capitals ---- */
const LAT_EXT=[
 ['Ā','A','macron'],['Ă','A','breve'],['Ć','C','acute'],['Ĉ','C','circ'],['Ċ','C','dot'],['Č','C','caron'],['Ď','D','caron'],
 ['Ē','E','macron'],['Ĕ','E','breve'],['Ė','E','dot'],['Ě','E','caron'],['Ĝ','G','circ'],['Ğ','G','breve'],['Ġ','G','dot'],['Ĥ','H','circ'],
 ['Ĵ','J','circ'],['Ĺ','L','acute'],['Ń','N','acute'],['Ň','N','caron'],['Ō','O','macron'],['Ŏ','O','breve'],['Ő','O','dacute'],
 ['Ŕ','R','acute'],['Ř','R','caron'],['Ś','S','acute'],['Ŝ','S','circ'],['Š','S','caron'],['Ť','T','caron'],
 ['Ũ','U','tilde'],['Ū','U','macron'],['Ŭ','U','breve'],['Ů','U','ring'],['Ű','U','dacute'],['Ŵ','W','circ'],['Ŷ','Y','circ'],['Ÿ','Y','dier'],
 ['Ź','Z','acute'],['Ż','Z','dot'],['Ž','Z','caron'],
 ['À','A','grave'],['Á','A','acute'],['Â','A','circ'],['Ã','A','tilde'],['Ä','A','dier'],['Å','A','ring'],['È','E','grave'],['É','E','acute'],['Ê','E','circ'],['Ë','E','dier'],
 ['Ñ','N','tilde'],['Ò','O','grave'],['Ó','O','acute'],['Ô','O','circ'],['Õ','O','tilde'],['Ö','O','dier'],['Ù','U','grave'],['Ú','U','acute'],['Û','U','circ'],['Ü','U','dier'],['Ý','Y','acute']];
for(const [ch,b,m] of LAT_EXT){comp(ch,b,over([m],b==='L'?{cx:c=>0.5*c.S+0.1*c.H}:null));}
for(const [ch,m] of [['Ì','grave'],['Í','acute'],['Î','circ'],['Ï','dier'],['Ĩ','tilde'],['Ī','macron'],['Ĭ','breve'],['İ','dot']])iBased(ch,m);
/* bottom marks */
for(const [ch,b,m] of [['Ç','C','ced'],['Ş','S','ced'],['Ţ','T','ced'],['Ģ','G','comma'],['Ķ','K','comma'],['Ļ','L','comma'],['Ņ','N','comma'],['Ŗ','R','comma']])
  comp(ch,b,under(m,b==='L'||b==='K'||b==='R'?{x:(c,W)=>b==='L'?0.6*c.S:W-0.9*c.S}:null));
for(const [ch,b] of [['Ą','A'],['Ę','E'],['Ų','U']])comp(ch,b,(c,W,bb)=>bb.f(c,W).concat(MK.ogon(c,W-1.25*c.S)));
def('Į',0,'n',c=>[c.vb(0,0,c.H),...MK.ogon(c,0)]);NEWG['Į']='I';
/* strokes and special forms */
comp('Đ','D',(c,W,b)=>{const e=0.16*c.H,cs=mov(b.f(c,W-e),e,0);return cs.concat([c.hb(0,e+c.S+0.1*c.H,c.M)]);});G['Ð']=G['Đ'];NEWG['Ð']='D';
comp('Ħ','H',(c,W,b)=>{const e=0.12*c.H,cs=mov(b.f(c,W-2*e),e,0);return cs.concat([c.hb(0,W,c.H*0.82)]);});
comp('Ŧ','T',(c,W,b)=>b.f(c,W).concat([c.hb(W/2-0.3*c.H,W/2+0.3*c.H,c.M)]));
comp('Ł','L',(c,W,b)=>{const e=0.2*c.H,S=c.S,xa=e-0.75*S,xb=e+1.75*S,yc=0.45*c.H,dy=0.16*c.H;/* W88: parallelogram of crossbar weight, symmetric across the stem */return mov(b.f(c,W-e),e,0).concat([poly([[xa,yc-dy/2-S/2],[xb,yc+dy/2-S/2],[xb,yc+dy/2+S/2],[xa,yc-dy/2+S/2]])]);});
comp('Ø','O',(c,W,b)=>{const hw=c.hw(0.8*W,1.08*c.H);return b.f(c,W).concat([c.dg(0.1*W,-0.04*c.H,W-hw-0.1*W,1.04*c.H,Math.min(hw,0.9*c.S*1.3))]);});
comp('Ŋ','N',(c,W,b)=>b.f(c,W).concat([c.vb(W-c.S,-c.D,0.05*c.H),c.hb(W-c.S-0.16*c.H,W,-c.D+c.S/2,c.S)]));
comp('Ŀ','L',(c,W,b)=>{const g=0.1*c.H;return mov(b.f(c,W-c.S-g),0,0).concat([c.rect(W-c.S,c.M-c.S/2,W,c.M+c.S/2)]);});
comp('Ľ','L',(c,W,b)=>mov(b.f(c,W-c.S-0.05*c.H),0,0).concat([c.rect(W-c.S,0.58*c.H,W,c.H)]));
G['Ŀ'].mn=c=>c.S*2+0.4*c.H;G['Ľ'].mn=c=>c.S*2+0.4*c.H;
def('Ĳ',1.0,'f',(c,W)=>{const Wj=Math.max(W-c.S-0.14*c.H,0.5*c.H);return [c.vb(0,0,c.H),...mov(G.J.f(c,Wj),c.S+0.14*c.H,0)];},c=>c.S*2+0.14*c.H+0.4*c.H+c.S);NEWG['Ĳ']='J';
def('Œ',1.5,'f',(c,W)=>{const Wo=0.72*W;const ring=c.stad(0,Wo,c.H+c.ov,-c.ov,c.rxC,c.S2);const x=Wo-Math.min(c.rxC,Wo/2),xm=Wo-c.S2/2;return [...ring,c.hb(x,W,c.T),c.hb(xm,W,c.M),c.hb(x,W,c.B)];},c=>2*c.rxC+0.7*c.H);NEWG['Œ']='O';
def('Æ',1.5,'d',(c,W)=>{const xs=0.55*W,hw=c.hw(xs-c.S,c.H),yq=0.3*c.H;return [c.dg(0,0,xs-hw,c.H,hw),c.vb(xs,0,c.H),c.hb(xs,W,c.T),c.hb(xs,W,c.M),c.hb(xs,W,c.B),c.hb(0.1*xs+0.12*c.H,xs,yq)];},c=>1.5*c.H*0.8);NEWG['Æ']='A';
/* ---- Cyrillic: Ukrainian, Belarusian, Serbian/Macedonian, Kazakh ---- */
def('Є',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H);const tl=0.55*c.H;return [c.cs(0,W,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2),c.hb(c.S2/2,tl,c.M)];},c=>c.rxC+0.6*c.H);
def('Ї',0,'n',c=>{const d=dd(c),e=Math.max(0,(2.6*d-c.S)/2);return mov([c.vb(0,0,c.H),...MK.dier(c,c.S/2)],e,0);});
def('Ґ',0.85,'f',(c,W)=>[stem(c),c.hb(0,W,c.T),c.vb(W-c.S,c.T,c.H+0.2*c.H)],c=>c.S*2+0.4*c.H);
comp('Ў','Y',over([{n:'breve'}]));
/* Й: base И + the same breve mark as Ў/Ă above the cap line (the old in-cap square notch read as a speck) */
{const bI=G['И'],bY=G['Й'];if(bI&&bY)def('Й',bY.w,bY.cls,(c,W)=>[...bI.f(c,W),...MK.breve(c,W/2)],bY.mn);}
def('Ђ',1.15,'f',(c,W)=>{const F=0.14*c.H;return [c.hb(0,W,c.T),c.vb(F,0,c.H),c.bowl(F,W+c.ob,c.M,c.B)];},c=>0.14*c.H+c.S+c.RO+0.1*c.H);
def('Ћ',1.1,'f',(c,W)=>{const F=0.14*c.H,ym=0.56*c.H;return [c.hb(0,F+c.S,c.T),c.vb(F,0,c.H),c.hb(F,W,ym),c.vb(W-c.S,0,ym+c.S/2)];},c=>0.14*c.H+2*c.S+0.3*c.H);
def('Һ',1.0,'f',(c,W)=>{const ym=0.58*c.H;return [stem(c),c.hb(0,W,ym),c.vb(W-c.S,0,ym+c.S/2)];});
def('Љ',1.45,'d',(c,W)=>{const Wl=0.62*W,hw=c.hw((Wl-c.S)/2,c.H),xa=Wl/2-hw/2,x0=Wl-hw+hw/2;const d1=c.dg(0,0,xa,c.H,hw),d2=c.dg(Wl-hw,0,xa,c.H,hw);
  const xm=0.75*Wl-0.75*hw+hw/2;return [d1,d2,c.bowl(xm,W+c.ob,c.M,c.B)];},c=>1.1*c.H+0.45*c.H);
def('Њ',1.45,'f',(c,W)=>{const Hn=0.74*c.H,xs=Hn-c.S;return [stem(c),c.vb(xs,0,c.H),c.hb(0,xs,c.M),c.bowl(xs,Math.max(W,Hn+c.RO)+c.ob,c.M,c.B)];},c=>0.74*c.H+c.RO+0.2*c.H);
def('Џ',1.05,'f',(c,W)=>[stem(c),c.vb(W-c.S,0,c.H),c.hb(0,W,c.B),c.vb((W-c.S)/2,-c.D,c.S)]);
def('Ә',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W*0.5),yb=c.M+c.S2/2,rr=c.r;
  /* schwa = turned e: closed lower ring whose top wall is the bar, upper arc open at the upper left */
  return [...c.stad(0,W,yb,-c.ov,rx,c.S2),c.cs(W,0.3*W,c.H+c.ov,yb-c.S2,rr*rx,rr*(c.H+c.ov-yb+c.S2)/2,c.S2)];},c=>2*c.rxC);
def('Ғ',0.95,'f',(c,W)=>{const e=0.2*c.H;return [c.vb(e,0,c.H),c.hb(e,W,c.T),c.hb(0,e+c.S+0.14*c.H,c.M)];},c=>0.2*c.H+c.S+0.3*c.H);
comp('Қ','K',(c,W,b)=>b.f(c,W).concat([c.vb(W-c.S,-c.D,0.05*c.H)]));
comp('Ң','H',(c,W,b)=>b.f(c,W).concat([c.vb(W-c.S,-c.D,0.05*c.H)]));
def('Ө',1.0,'f',(c,W)=>[...c.stad(0,W,c.H+c.ov,-c.ov,c.rxC,c.S2),c.hb(c.S2*0.5,W-c.S2*0.5,c.M)],c=>2*c.rxC);
comp('Ұ','Y',(c,W,b)=>b.f(c,W).concat([c.hb(W/2-0.26*c.H,W/2+0.26*c.H,0.26*c.H)]));
T.extCy=['Є','Ї','Ґ','Ў','Ђ','Ћ','Љ','Њ','Џ','Ә','Ғ','Қ','Ң','Ө','Ұ','Һ'];
T.extCyAlias={'Ѕ':'S','Ү':'Y'};
T.extLat=[...LAT_EXT.map(x=>x[0]),'Ì','Í','Î','Ï','Ĩ','Ī','Ĭ','İ','Ç','Ş','Ţ','Ģ','Ķ','Ļ','Ņ','Ŗ','Ą','Ę','Ų','Į','Đ','Ð','Ħ','Ŧ','Ł','Ø','Ŋ','Ŀ','Ľ','Ĳ','Œ','Æ'];
T.extBase=NEWG;

/* aliases: identical shared Cyrillic / Latin forms (one glyph) and lowercase -> caps */
const AL={'Ѕ':'S','Ү':'Y','А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','У':'Y','І':'I','Ј':'J'};
G.P=G['Р'];G.B=G['В'];G.X=G['Х'];
T.canon=ch=>{let u=ch.toUpperCase();if(u.length!==1)u=ch;return AL[u]||u;};
T.has=ch=>!!G[T.canon(ch)];
T.charset=(()=>{const a=[];const add=(s)=>{for(const ch of s)a.push(ch);};add('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ');add('ABCDEFGHIJKLMNOPQRSTUVWXYZ');add('0123456789');add('.,:;!?«»„“”‘’"\'-–—…()/&№+−=%@#*©₽°•·\\|');return a;})();
T.glyphKeys=()=>Object.keys(G);
/* ---------- glyph() ---------- */
const cache=new Map();
T.params=P=>Object.assign({},T.DEF,P||{});
function clampP(P){P=T.params(P);for(const k in T.RANGE){P[k]=Math.min(T.RANGE[k][1],Math.max(T.RANGE[k][0],P[k]));}return P;}
T.clampP=clampP;
T.baseW=(key,P)=>{P=clampP(P);const g=G[key],c=kit(P);const raw=g.w===0?null:g.w*c.H*P.base;return raw;};
T.glyph=(ch,P,k)=>{
  P=clampP(P);const key=T.canon(ch),g=G[key];if(!g)return null;
  const ck=key+'|'+P.stroke+'|'+P.round+'|'+P.base+'|'+P.apr+'|'+(k||1);const hit=cache.get(ck);if(hit)return hit;
  const c=kit(P);let W,w0;
  if(g.w===0){ // fixed-size glyph: width = bbox of its natural drawing
    const cs0=g.f(c,0).map(ccw);const b=bbox(cs0);W=b.x1;w0=W;k=1;
  }else{
    w0=g.w*c.H*P.base;if(g.mn)w0=Math.max(w0,g.mn(c));w0=Math.max(w0,3.2*c.S*(g.cls==='n'?0.5:1));
    const kmax=T.KMAX[g.cls];k=Math.min(kmax,Math.max(1,k||1));W=w0*k;
  }
  let cs=g.f(c,W);
  cs=cs.map(ccw);
  const b=bbox(cs);
  const sb=P.apr*c.H/2,op=OPT[key]||[0,0],sbL=sb+op[0]*c.H,sbR=sb+op[1]*c.H;
  const Wn=g.w===0?b.x1:W;               // advance counts the NOMINAL width; bowl overshoot pokes into the sidebearing like in the reference
  const out={ch:key,contours:cs,W:Wn,w0,k,cls:g.cls,sb,sbL,sbR,adv:Wn+sbL+sbR,xmin:b.x0,bbox:b};
  if(cache.size>4000)cache.clear();cache.set(ck,out);return out;
};
T.glyphFor=T.glyph;
/* ---------- kerning (class based, H units; mirrored into GPOS by build_ttf.py) ---------- */
/* kerning in font units (UPM 1000, cap 700): [left classes, right classes, tightening u]; measured room (nearest ink gap at kern 0, default Апрош) minus a safe gap, ≈ 0.35-0.45 of it;
   every value ≤ 110 u (limit 150 u = 15 % UPM), spread 14…110 (no saturation); the host clamps each value again by the real gaps of every member and alternate (core_tyaga classKernTable) */
const KU=(l,r,u)=>({l:l.split(' '),r:r.split(' '),v:-u/700});
const PUN='. , … „',COL=': ;',DSH='- – — −',GQ='« »';
T.KERN=[
 /* caps before caps */
 KU('A','T',85),KU('A','Y',100),KU('A','V',105),KU('A','W',70),
 KU('Л','T',85),KU('Л','Y',100),KU('Л','V',105),KU('Л','W',70),KU('Л','Г',35),
 KU('Д','T',55),KU('Д','Y',60),KU('Д','V',55),KU('Д','W',40),
 KU('L','T',110),KU('L','Y',105),KU('L','V',90),KU('L','W',60),
 KU('Г T','A Л',85),KU('Г T','Д',85),KU('F','A Л',45),KU('F','Д',75),
 KU('Y V','A Л',100),KU('Y','Д',85),KU('V','Д',80),KU('W','A Л',65),KU('W','Д',55),
 KU('P','A Л',55),KU('P','Д',70),
 KU('T Г','Y',20),
 KU('T Г','O C Q G',30),KU('Y','O C Q G',40),KU('V','O C Q G',35),KU('W','O C Q G',30),
 /* punctuation after T Г У V W Y (F) */
 KU('Г','. , … „',110),KU('F','. , … „',105),KU('T','. , … „',95),KU('Y','. , … „',95),KU('V','. , … „',80),KU('W','. , … „',55),KU('A Л','. , … „',14),
 KU('Г',COL,105),KU('T',COL,90),KU('Y',COL,85),KU('V',COL,60),KU('W',COL,45),
 KU('Г',DSH,105),KU('T',DSH,90),KU('Y',DSH,70),KU('V',DSH,50),KU('W',DSH,35),
 KU('Г','« »',105),KU('T','«',90),KU('T','»',90),KU('Y','«',80),KU('Y','»',45),KU('V','«',50),KU('V','»',30),KU('W','«',40),KU('W','»',20),
 /* quotes / dashes before T Г У V W Y and А Л */
 KU('«','T',90),KU('«','Y',45),KU('«','V',30),KU('«','W',20),KU('«','A Л',30),
 KU('»','T',90),KU('»','Y',80),KU('»','V',50),KU('»','W',40),KU('»','A Л',50),
 KU(DSH,'T',90),KU(DSH,'Y',70),KU(DSH,'V',50),KU(DSH,'W',35),KU(DSH,'A Л',50),
 KU('"','A Л',45),KU('’ ” “ ‘','A Л',60),KU('A Л','"',45),KU('A Л','’ ” “ ‘',45),KU('A Л','«',50),KU('A Л','»',30),KU('A Л',DSH,50),
 /* digits */
 KU('1','1',20),KU('1','7',14),KU('7','4',60),KU('7','. , …',85),
 /* symbols (unchanged) */
 {l:['A','Л','Y','V','W'],r:['°','*'],v:-0.06},
 {l:['°','*'],r:['A','Л','Y','V','W'],v:-0.04}];
/* W88: new letters join the kerning classes of their base glyph */
{const ext=arr=>{const o=arr.slice();for(const k of Object.keys(NEWG)){if(arr.includes(NEWG[k])&&!o.includes(k))o.push(k);}return o;};for(const g of T.KERN){g.l=ext(g.l);g.r=ext(g.r);}}
const KM=new Map();T.KERN.forEach(g=>g.l.forEach(a=>g.r.forEach(b=>KM.set(a+'|'+b,g.v))));
T.kern=(a,b)=>KM.get(T.canon(a)+'|'+T.canon(b))||0;
/* ---------- text parsing / layout ---------- */
T.parse=(str)=>{const it=[];for(const ch of str){
  if(ch==='~'){const p=it[it.length-1];if(p&&p.ch!==' '&&T.has(p.ch)){const cl=G[T.canon(p.ch)].cls;const st=T.STEPS[cl];p.step=Math.min((p.step||0)+1,st.length);p.k=st.length?st[p.step-1]:null;p.fixed=!!st.length;}continue;}
  it.push({ch,k:null,step:0});}return it;};
T.SPACE=0.36;
T.itemAdv=(it,P)=>{P=clampP(P);if(it.ch===' '||it.ch===' ')return T.SPACE*T.M.cap+P.apr*T.M.cap;const g=T.glyph(it.ch,P,it.k||1);return g?g.adv:0.6*T.M.cap;};
T.lineInk=(items,P)=>{P=clampP(P);let s=0,n=0,pv=null;for(const it of items){s+=T.itemAdv(it,P);if(pv&&it.ch!==' '&&pv.ch!==' ')s+=T.kern(pv.ch,it.ch)*T.M.cap;pv=it;n++;}if(!n)return 0;const f=items.find(i=>i.ch!==' ');const sb=P.apr*T.M.cap/2;return Math.max(0,s-2*sb);};
/* scores: who takes the stretch first in «на одну букву» mode */
const SC={'C':10,'Е':9,'E':9,'Ё':9,'Э':9,'Ы':9,'Ь':8,'Ъ':8,'З':8,'3':6,'О':8,'O':8,'S':8,'G':8,'F':8,'Б':7,'Г':7,'T':7,'L':7,'D':7,'В':6,'B':6,'П':6,'Н':6,'H':6,'Р':6,'P':6,'U':6,'Ц':5,'Ч':5,'Ш':5,'Щ':5,'Ф':5,'Ю':5,'J':5,'Q':5,'-':3,'–':3,'—':3,'−':3,'=':3,'+':3};
T.justify=(lines,P,opts)=>{
  P=clampP(P);opts=opts||{};const mode=opts.mode||'one';let Wt=opts.width||0;
  const nat=lines.map(l=>{l.forEach(i=>{if(!i.fixed&&!i.manual)i.k=null;});return T.lineInk(l,P);});
  Wt=Math.max(Wt,Math.max.apply(null,nat));
  lines.forEach((l,li)=>{
    let need=Wt-nat[li];if(need<=0.5)return;
    const cand=[];l.forEach((it,idx)=>{if(it.fixed||it.manual||it.ch===' ')return;const key=T.canon(it.ch),g=G[key];if(!g||g.cls==='n'||g.w===0)return;
      const gl=T.glyph(it.ch,P,1);const cap=(T.KMAX[g.cls]-1)*gl.w0;const sc=(SC[key]||(g.cls==='d'?1:g.cls==='h'?1.5:4))+idx*0.001;cand.push({it,w0:gl.w0,cap,sc,e:0});});
    if(mode==='one'){cand.sort((a,b)=>b.sc-a.sc);for(const c of cand){const e=Math.min(c.cap,need);c.e=e;need-=e;if(need<=0.5)break;}}
    else{let act=cand.filter(c=>c.cap>0);for(let it=0;it<8&&need>0.5&&act.length;it++){const tw=act.reduce((s,c)=>s+c.w0*(c.sc>2?c.sc:0.4),0);let used=0;for(const c of act){const add=Math.min(c.cap-c.e,need*c.w0*(c.sc>2?c.sc:0.4)/tw);c.e+=add;used+=add;}need-=used;act=act.filter(c=>c.cap-c.e>0.5);}}
    cand.forEach(c=>{if(c.e>0.01)c.it.k=1+c.e/c.w0;});
    l.slack=Math.max(0,need);
  });
  return Wt;
};
/* line layout: returns {glyphs:[{g,x,item}], width}; slack (cannot stretch more) is spread as tracking */
T.layoutLine=(items,P,slack)=>{P=clampP(P);const out=[];let x=-P.apr*T.M.cap/2;const sb=P.apr*T.M.cap/2;
  const n=items.filter(i=>i.ch!==' ').length;const tr=slack&&n>1?slack/(n-1):0;
  let pv=null;/* same kerning as lineInk (and as the font file): the justified width is the width that is drawn */
  items.forEach((it,i)=>{const sp=it.ch===' '||it.ch===' ';
    if(sp){x+=T.SPACE*T.M.cap+P.apr*T.M.cap;pv=it;return;}
    const g=T.glyph(it.ch,P,it.k||1);if(!g)return;if(pv&&pv.ch!==' '&&pv.ch!==' ')x+=T.kern(pv.ch,it.ch)*T.M.cap;pv=it;out.push({g,x:x+sb-(0)+(g.sbL-sb),item:it,idx:i});x+=g.adv+tr;});
  return{glyphs:out,width:x-sb};};
/* ---------- drawing (canvas, y up inside) ---------- */
T.pathOf=(g)=>{const p=new Path2D();for(const c of g.contours){const f=c[0];p.moveTo(f.x0,f.y0);for(const s of c){if(s.t==='L')p.lineTo(s.x1,s.y1);else p.ellipse(s.cx,s.cy,s.rx,s.ry,0,s.a0*D2R,s.a1*D2R,s.a1<s.a0);}p.closePath();}return p;};
T.drawGlyph=(ctx,g,x,y,sc,color)=>{ctx.save();ctx.translate(x,y);ctx.scale(sc,-sc);ctx.fillStyle=color||'#000';ctx.fill(T.pathOf(g),'nonzero');ctx.restore();};
T.drawLine=(ctx,lay,x,y,sc,color)=>{for(const q of lay.glyphs)T.drawGlyph(ctx,q.g,x+q.x*sc,y,sc,color);};
T.CLASS=ch=>{const g=G[T.canon(ch)];return g?g.cls:null;};
T._G=G;
return T;
})();
/* ---------- «Тяга» (tyaga): параметры, перевод контуров в формат хоста, регистрация (по образцу nit/tail.js, stsepka) ----------
   Ключи ползунков с префиксом t…: tsw «Толщина» (% высоты прописных), trd «Скругление», tbs «Базовая ширина», tap «Апрош», tst «Растяжка (по умолчанию)»,
   tlg «Межстрочный» (виден только при блоке). Безопасные пределы взяты из прототипа (qa.py: все крайние сочетания дают ту же топологию).
   Знак = f(ширина): растягиваются только прямые горизонтали; k — множитель ширины (свободные до ×6, диагональные до ×2, остальные не тянутся).
   Шрифт: «~» после буквы = растянутая форма .s1…s5 (GSUB calt/liga/clig), «~» — знак нулевой ширины. */
const TY_DEF={tsw:18.75,trd:100,tbs:100,tap:13.5,tlg:13.5,tst:1};
const TY_LIM={tsw:[12,23],trd:[0,100],tbs:[80,130],tap:[4,30],tlg:[6,40],tst:[1,6]};
const TY_KEYS=['tsw','trd','tbs','tap','tlg','tst'];
const TY_CAP=700,TY_ASC=950,TY_DESC=260;
const tyNum=(v,d)=>(v==null||!isFinite(+v))?d:+v;
const tyClamp=(k,v)=>Math.min(TY_LIM[k][1],Math.max(TY_LIM[k][0],tyNum(v,TY_DEF[k])));
/* параметры продукта -> параметры генератора (доли высоты прописных) */
const tyP=p=>TYG.clampP({stroke:tyClamp('tsw',p&&p.tsw)/100,round:tyClamp('trd',p&&p.trd)/100,base:tyClamp('tbs',p&&p.tbs)/100,apr:tyClamp('tap',p&&p.tap)/100,lead:tyClamp('tlg',p&&p.tlg)/100,stretch:tyClamp('tst',p&&p.tst)});
const tyStem=tsw=>Math.round(tyClamp('tsw',tsw)*TY_CAP)/100;
/* сегменты (отрезки и дуги эллипса) -> узлы хоста: дуга режется по 90° на кубики */
function tyNodes(seg,dx){
  const pcs=[];
  for(const s of seg){
    if(s.t==='L'){pcs.push({p:[s.x0,s.y0]});continue;}
    const n=Math.max(1,Math.ceil(Math.abs(s.a1-s.a0)/90-1e-9));
    for(let i=0;i<n;i++){
      const a=(s.a0+(s.a1-s.a0)*i/n)*Math.PI/180,b=(s.a0+(s.a1-s.a0)*(i+1)/n)*Math.PI/180,h=4/3*Math.tan((b-a)/4);
      const P0=i===0?[s.x0,s.y0]:[s.cx+s.rx*Math.cos(a),s.cy+s.ry*Math.sin(a)];
      pcs.push({p:P0,c1:[P0[0]-h*s.rx*Math.sin(a),P0[1]+h*s.ry*Math.cos(a)],c2:[s.cx+s.rx*Math.cos(b)+h*s.rx*Math.sin(b),s.cy+s.ry*Math.sin(b)-h*s.ry*Math.cos(b)]});}
  }
  const N=pcs.length,nodes=pcs.map(q=>({x:q.p[0]+dx,y:q.p[1],a:null,b:q.c1?{x:q.c1[0]+dx,y:q.c1[1]}:null}));
  for(let i=0;i<N;i++){const q=pcs[i];if(q.c2){const j=(i+1)%N;nodes[j].a={x:q.c2[0]+dx,y:q.c2[1]};}}
  return nodes;}
const tyCont=(cs,dx)=>cs.map(c=>mkc(tyNodes(c,dx),false));
/* знак при параметрах p и множителе k: контуры хоста (без объединения: его делает finalGlyph) */
const tyCache=new Map();
function tyGet(ch,p,k){
  const P=tyP(p),key=TYG.canon(ch);const g=TYG.glyph(ch,P,k);if(!g)return null;
  const ck=key+'|'+[P.stroke,P.round,P.base,P.apr].join('|')+'|'+(k||1);let r=tyCache.get(ck);
  if(!r){r={ch:key,adv:g.adv,sbL:g.sbL,W:g.W,k:g.k,cls:g.cls,cs:null,g};tyCache.set(ck,r);if(tyCache.size>3000){let n=0;for(const q of tyCache.keys()){tyCache.delete(q);if(++n>1000)break;}}}
  if(!r.cs)r.cs=tyCont(g.contours,g.sbL);
  return r;}
const tyCls=ch=>TYG.CLASS(ch);
/* множитель обычного знака: «Растяжка» (tst), не выше предела класса */
const tyK0=(ch,p)=>{const c=tyCls(ch);return c&&c!=='n'?Math.min(TYG.KMAX[c],tyClamp('tst',p&&p.tst)):1;};
/* ступени растяжки шрифта: .sN = шаг лестницы (1.5 2 3 4 6) × tst, не выше предела класса; при tst=1 — ровно прототип */
const tyStepK=(ch,n,p)=>{const c=tyCls(ch),st=TYG.STEPS[c];if(!st||n<1||n>st.length)return null;return Math.min(TYG.KMAX[c],st[n-1]*tyClamp('tst',p&&p.tst));};
/* ---------- набор знаков ---------- */
const TY_CY='АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',TY_CYL='абвгдеёжзийклмнопрстуфхцчшщъыьэюя',TY_LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',TY_LATL='abcdefghijklmnopqrstuvwxyz',TY_DIG='0123456789';
const TY_SYM='.,:;!?«»„“”‘’…"\'-–—−()/&№+=%@#*©₽°•·\\|';
/* W88: extended set — Ukrainian Є Ї Ґ (І Ї), Belarusian Ў, Serbian/Macedonian Ђ Ј Љ Њ Ћ Џ Ѕ, Kazakh Ә Ғ Қ Ң Ө Ұ Ү Һ І, Latin Extended-A + Latin-1 capitals (lower case = same glyph) */
const tyLow=s=>[...s].map(c=>c.toLowerCase()).filter(c=>Array.from(c).length===1&&c!==c.toUpperCase());
const TY_XCY=[...new Set([...TYG.extCy,'Ѕ','Ј','Ү','І'])].join(''),TY_XCYL=tyLow(TY_XCY).join(''),TY_XLAT=[...new Set(TYG.extLat)].join(''),TY_XLATL=tyLow(TY_XLAT).join('');
const TY_ALL=[...new Set([...TY_CY,...TY_CYL,...TY_LAT,...TY_LATL,...TY_DIG,...TY_SYM,...TY_XCY,...TY_XCYL,...TY_XLAT,...TY_XLATL])];
const tyName=ch=>'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
const tyAltName=(canon,n)=>tyName(canon)+'.s'+n;
/* «~» «Тяги» — служебный знак без контура (проверки пустых знаков пропускают его, как пробелы) */
globalThis.isTyTilde=ch=>ch==='~'&&typeof CUR_FONT==='string'&&CUR_FONT==='tyaga';
/* ---------- регистрация ---------- */
if(typeof FONTS!=='undefined'&&typeof PARAMS!=='undefined'&&typeof mkc==='function'&&typeof paramLimits!=='undefined'){
const TY_ROWS=[['tsw','Толщина, %',TY_LIM.tsw[0],TY_LIM.tsw[1],0.25,'Линия'],['trd','Скругление, %',TY_LIM.trd[0],TY_LIM.trd[1],5,'Линия'],
  ['tbs','Базовая ширина, %',TY_LIM.tbs[0],TY_LIM.tbs[1],1,'Пропорции'],['tap','Апрош, %',TY_LIM.tap[0],TY_LIM.tap[1],0.5,'Пропорции'],
  ['tst','Растяжка, ×',TY_LIM.tst[0],TY_LIM.tst[1],0.05,'Растяжка'],['tlg','Межстрочный (блок), %',TY_LIM.tlg[0],TY_LIM.tlg[1],0.5,'Растяжка']];
if(!PARAMS.some(r=>r[0]==='tsw')){const i=PARAMS.findIndex(r=>r[0]==='stem');PARAMS.splice(i+1,0,...TY_ROWS);}
const F={id:'tyaga',name:'Тяга',family:'Tyaga',tag:'Монолиния · растягиваемые капители',S0:131,GL:{},charset:'extended',
  desc:'Геометрический минималистичный монолинейный шрифт из одних заглавных букв (строчные дают те же буквы). Растягиваются только прямые горизонтали: стойки, скругления и чаши остаются прежними. Знак «~» после буквы растягивает её в шрифте — в Figma и Word тоже; в платформе есть блок с выключкой по ширине. Для плакатов, афиш и заголовков.',
  sample:'Тяга · Stretch'};
F.sampleText='ПЛЕ\nСНЕ\nВЫЙ\nСЫР';
const tyEntry=ch=>({shape:g=>{const r=tyGet(ch,g.p,tyK0(ch,g.p));return r?r.cs:[];},w:p=>{const r=tyGet(ch,p,tyK0(ch,p));return r?r.adv:0;},k:'cap',opt:{fixed:true}});
const byCanon=new Map();
for(const ch of TY_ALL){if(!TYG.has(ch))continue;const c=TYG.canon(ch);let e=byCanon.get(c);if(!e){e=tyEntry(c);byCanon.set(c,e);}F.GL[ch]=e;}
F.GL['~']={shape:()=>[],w:()=>0,k:'cap',opt:{}};
F.GL[' ']={shape:()=>[],w:p=>tySpace(p),k:'cap',opt:{}};
for(const c of [' ',' ',' '])F.GL[c]={shape:()=>[],skel:()=>[],w:c===' '?(p=>tySpace(p)):(p=>thinSpace(p)),k:'cap',opt:{}};
function tySpace(p){return Math.round((TYG.SPACE+tyClamp('tap',p&&p.tap)/100)*TY_CAP);}
/* растянутые формы: GL-записи без кода (uniXXXX.sN), основа — канонический знак; в CHARSET не входят */
const TY_ALTS=[];/* {name,canon,n,chars:[…]} */
for(const [c,e] of byCanon){const cl=tyCls(c),st=TYG.STEPS[cl];if(!st||!st.length)continue;
  const chars=Object.keys(F.GL).filter(x=>F.GL[x]===e);
  for(let n=1;n<=st.length;n++){const nm=tyAltName(c,n);
    F.GL[nm]={shape:g=>{const r=tyGet(c,g.p,tyStepK(c,n,g.p));return r?r.cs:[];},w:p=>{const r=tyGet(c,p,tyStepK(c,n,p));return r?r.adv:0;},k:'cap',
      opt:{fixed:true,alt:true,base:c,feat:'tyaga',own:true,kernAs:true,tyAlt:n}};
    TY_ALTS.push({name:nm,canon:c,n,chars});}}
const TY_G=s=>[...s].filter(c=>F.GL[c]).join('');
F.GROUPS=[['Кириллица · прописные',TY_G(TY_CY)],['Кириллица · строчные',TY_G(TY_CYL)],['Кириллица · расширенная',TY_G(TY_XCY+TY_XCYL)],['Латиница · прописные',TY_G(TY_LAT)],['Латиница · строчные',TY_G(TY_LATL)],['Латиница · расширенная',TY_G(TY_XLAT+TY_XLATL)],['Цифры',TY_DIG],['Знаки',TY_G(TY_SYM)+'~']];
F.CHARSET=TY_ALL.concat(['~',' ',' ',' ',' ']).filter(c=>F.GL[c]);
F._basicDone=true;/* набор уже базовый; «~» — служебный знак нулевой ширины, который общая обрезка вырезала бы */
F.raw=(ch,p)=>tyGet(ch,p,tyK0(ch,p));
const K0={wdth:100,capH:TY_CAP,xh:TY_CAP,asc:TY_ASC,desc:TY_DESC,stem:131.25,hair:131.25,diag:1,optic:0,round:1,kappa:0.5523,innerR:1,spur:0,ov:0,slant:0,sb:0,track:0,space:Math.round((TYG.SPACE+TY_DEF.tap/100)*TY_CAP),
  stemScale:0,tabular:0,mono:0,rough:0,opsp:0,icomp:0,nib:0,press:0,seed:0,tsw:TY_DEF.tsw,trd:TY_DEF.trd,tbs:TY_DEF.tbs,tap:TY_DEF.tap,tlg:TY_DEF.tlg,tst:TY_DEF.tst};
F.DEFAULTS={regular:{...K0},italic:{...K0,slant:10}};
const HID=['wdth','capH','hair','xh','asc','desc','diag','optic','round','kappa','innerR','rough','spur','ov','aper','bar','mv','trap','join','stemScale','press','nib','opsp','icomp','flare','slope','point','drop','tens','term','conn','cham','spk','fury','lean','spkU','spkD','spkS','sym','persp','blade','tabular','mono','seed','stem','sb','track','space'];
F.params={};for(const k of HID)F.params[k]=null;
F.pen=null;
/* пресеты: «Вид» (линия и скругление) и «Растяжка» (шаг по умолчанию) */
F.methods=[
  ['Характер','Линия и скругление: от острой плакатной монолинии до мягкой.',[['Образец',{tsw:18.75,trd:100,tbs:100,tap:13.5}],['Острая',{tsw:18.75,trd:0,tbs:100,tap:13.5}],['Лёгкая',{tsw:14,trd:100,tbs:100,tap:13.5}],['Плотная',{tsw:22,trd:60,tbs:100,tap:10}]]],
  ['Толщина','Толщина линии, % высоты прописных.',[['Лёгкая',{tsw:14}],['Образец',{tsw:18.75}],['Плотная',{tsw:21}],['Жирная',{tsw:23}]]],
  ['Растяжка','Во сколько раз растянута каждая буква сама по себе. Блок и «~» растягивают по-своему.',[['Нет',{tst:1}],['×1.5',{tst:1.5}],['×2',{tst:2}],['×3',{tst:3}]]]];
F.coverNarrow=false;F.sym=false;F.wK=0;F.nodeBudget=0;F.coverTight=100;
const TY_ALLCH=[...TY_CY,...TY_CYL,...TY_LAT,...TY_LATL,...TY_DIG,...TY_XCY,...TY_XCYL,...TY_XLAT,...TY_XLATL].join('');
F.proof={stem:p=>tyStem(p.tsw),noBar:true,stemSet:' ',hang:true,asc:TY_ALLCH,desc:TY_ALLCH,descX:0,holeK:0.004};
function tyLim(p){const q=Object.assign({},p),L={};
  const cl=(k,lo,hi,dv)=>{if(!(hi>=lo))hi=lo;L[k]=[lo,hi];let v=q[k];if(v==null||!isFinite(+v))v=dv!=null?dv:lo;q[k]=Math.min(hi,Math.max(lo,+v));};
  for(const k of TY_KEYS)cl(k,TY_LIM[k][0],TY_LIM[k][1],TY_DEF[k]);
  q.tsw=Math.round(q.tsw*100)/100;q.stem=tyStem(q.tsw);q.hair=q.stem;L.stem=[q.stem,q.stem];L.hair=[q.stem,q.stem];
  q.space=Math.round((TYG.SPACE+q.tap/100)*TY_CAP);L.space=[q.space,q.space];
  cl('capH',TY_CAP,TY_CAP,TY_CAP);cl('wdth',100,100,100);cl('xh',TY_CAP,TY_CAP,TY_CAP);cl('asc',TY_ASC,TY_ASC,TY_ASC);cl('desc',TY_DESC,TY_DESC,TY_DESC);
  cl('diag',1,1,1);cl('optic',0,0,0);cl('round',1,1,1);cl('kappa',0.5523,0.5523,0.5523);cl('innerR',1,1,1);cl('rough',0,0,0);cl('spur',0,0,0);cl('ov',0,0,0);
  cl('nib',0,0,0);cl('press',0,0,0);cl('opsp',0,0,0);cl('icomp',0,0,0);cl('seed',0,0,0);cl('tabular',0,0,0);cl('mono',0,0,0);cl('stemScale',0,0,0);
  cl('sb',0,0,0);cl('track',0,0,0);cl('slant',0,20,0);
  return {q,L};}
const _pl=paramLimits;
paramLimits=function(p,font){font=font||(typeof CUR_FONT==='string'?CUR_FONT:'');if(font!=='tyaga')return _pl(p,font);return tyLim(p);};
/* имя веса по толщине: шкала подобрана так, чтобы значение по умолчанию (stem/xh = 0.1875) читалось Regular (0.315·0.5952) */
WSCALE.tyaga=0.5952;
/* семейство Light/Regular/Bold/Black: Regular = толщина пользователя, Light = ×0.75 (не тоньше 12 %), Bold = на 55 % пути к пределу 23 %, Black = предел */
const TY_FAMT=(u,wn)=>wn==='Light'?Math.max(TY_LIM.tsw[0],u*0.75):wn==='Bold'?u+(TY_LIM.tsw[1]-u)*0.55:wn==='Black'?TY_LIM.tsw[1]:u;
const _fp=famParams;
famParams=function(p,wn){const o=_fp(p,wn);
  if(CUR_FONT==='tyaga'){if(['Light','Regular','Bold','Black'].includes(wn))o.tsw=Math.min(TY_LIM.tsw[1],Math.max(TY_LIM.tsw[0],Math.round(TY_FAMT(tyClamp('tsw',p.tsw),wn)*4)/4));return paramLimits(o,'tyaga').q;}
  return o;};
/* ---- кернинг: собственный (таблица прототипа, доли высоты), классы по каноническому знаку, строчные и латинские близнецы в том же классе ---- */
const TY_MEM=new Map();for(const ch of Object.keys(F.GL)){if(Array.from(ch).length!==1||!TYG.has(ch))continue;const c=TYG.canon(ch);(TY_MEM.get(c)||TY_MEM.set(c,[]).get(c)).push(ch);}
const _ckt=classKernTable;
classKernTable=function(st,prof,isLow,fontId){
  if((fontId||CUR_FONT)!=='tyaga')return _ckt(st,prof,isLow,fontId);
  const Ls=new Set(),Rs=new Set(),vals={};
  for(const g of TYG.KERN){for(const l of g.l)Ls.add(TYG.canon(l));for(const r of g.r)Rs.add(TYG.canon(r));}
  for(const g of TYG.KERN)for(const l of g.l)for(const r of g.r){const a=TYG.canon(l),b=TYG.canon(r);vals[a+'|'+b]=Math.round(g.v*TY_CAP);}
  const mem=c=>(TY_MEM.get(c)||[]).filter(ch=>prof(ch));
  /* safety at THESE parameters: every member and every stretched alternate keeps a nearest ink gap >= G0 (0.42 of the Апрош, 12…60 u) after kerning; the value of a pair is the tightest of its members */
  const apr=tyClamp('tap',st&&st.p&&st.p.tap)/100*TY_CAP,G0=Math.max(12,Math.min(60,Math.round(0.42*apr)));
  const pc=new Map(),altOf=new Map();for(const a of TY_ALTS){(altOf.get(a.canon)||altOf.set(a.canon,[]).get(a.canon)).push(a.name);}
  const pf=(key,get)=>{if(pc.has(key))return pc.get(key);let r=null;try{r=get();}catch(e){}pc.set(key,r);return r;};
  const profs=c=>{const o=[];for(const ch of mem(c)){const q=prof(ch);if(q)o.push(q);}
    for(const nm of (altOf.get(c)||[])){const q=pf(nm,()=>{const g=finalGlyph(nm,st,{});return g&&g.cs&&g.cs.length?kernProfile(g.cs,g.adv):null;});if(q)o.push(q);}return o;};
  const PM=new Map();const pr=c=>PM.get(c)||(PM.set(c,profs(c)),PM.get(c));
  for(const key of Object.keys(vals)){let v=vals[key];if(v>=0)continue;const [a,b]=key.split('|');
    for(const pa of pr(a))for(const pb of pr(b)){const g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil(G0-g.min));}
    vals[key]=Math.min(0,Math.max(-150,v));}
  const t=Math.min(150,G0/0.4);
  return {L:[...Ls].map(c=>[c,mem(c)]).filter(x=>x[1].length),R:[...Rs].map(c=>[c,mem(c)]).filter(x=>x[1].length),vals,tU:t,tL:t,pairs:{}};};
KERN_TABLE.tyaga=[];
/* ---- GSUB: буква + «~»×n -> буква.sN (calt, liga, clig: Figma берёт calt, Word — liga/calt) ---- */
const _o1=otFeaturesO1;
otFeaturesO1=function(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  _o1.apply(this,arguments);
  const id=(fontId&&fontId!=='-nokern')?fontId:CUR_FONT;if(id!=='tyaga')return;
  const t=gidByCh['~'];if(t==null)return;const L=[];
  for(const a of TY_ALTS){const lig=gidByName[a.name];if(lig==null)continue;
    for(const ch of a.chars){const b=gidByCh[ch];if(b==null)continue;L.push({comps:[b,...new Array(a.n).fill(t)],lig});}}
  if(!L.length)return;
  looks.push({type:4,subs:[otoLigSubst(L)]});const li=looks.length-1;
  for(const tag of ['calt','clig','liga'])feats.push({tag,lookups:[li]});};
/* «~» — знак нулевой ширины (общий предел ширины знака в хосте — 40 u, здесь он обнуляется) */
const _fg=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fg.apply(this,arguments);if(g&&ch==='~'&&CUR_FONT==='tyaga')return Object.assign({},g,{adv:0,weff:0});return g;};
const TYS={eng:tyP,get:tyGet,alts:TY_ALTS,LIM:TY_LIM,DEF:TY_DEF,KEYS:TY_KEYS,K0:tyK0,stepK:tyStepK,name:tyName,altName:tyAltName,cont:tyCont,space:tySpace,stem:tyStem,rows:TY_ROWS};
FONTS.tyaga=F;
for(const r of PARAMS)if(!(r[0] in F.params)&&!TY_KEYS.includes(r[0])&&!['slant'].includes(r[0]))F.params[r[0]]=null;
for(const id in FONTS)if(id!=='tyaga'){const f=FONTS[id];f.params=f.params||{};for(const k of TY_KEYS)if(!(k in f.params))f.params[k]=null;}
for(const r of TY_ROWS)F.params[r[0]]=[r[1],r[2],r[3],r[4]];
F.params.tlg=null;/* «Межстрочный» виден только при блоке (ui_tyaga.js) */
if(typeof globalThis!=='undefined'){globalThis.TYG=TYG;globalThis.TYS=TYS;}
/* «~» «Тяги» — служебный знак без контура: проверки пустых знаков его пропускают, как пробелы */
}
})();
