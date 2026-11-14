/* «Тяга» (working id `tyaga`) — stretch-monoline display caps. Param-driven generator, no dependencies, Node + browser.
   Glyph = union of simple closed contours (rects, parallelograms with horizontal cuts, half-ring bands). Contours are exported
   as segment lists {t:'L'|'A'} (lines and elliptic arcs), all CCW, overlapping — the host does csgUnion (tyaga_ttf.py does it for the prototype).
   API
     Tyaga.glyph(ch, P, k)  -> {contours, W, adv, sb, cls, w0, k}      k = stretch factor (1 = base width), clamped by class
     Tyaga.parse(str)       -> items [{ch,k|null,step}]  ('~' after a letter = font-level extender, steps 1.5 2 3 4 6)
     Tyaga.layoutLine(items, P) / Tyaga.justify(lines, P, opts) / Tyaga.drawLine(ctx,...)
   P = {stroke,round,base,apr,lead,stretch}  (see DEF/RANGE). Units: UPM 1000, cap 700, y up. */
(function(root){
'use strict';
const T={};
T.M={upm:1000,cap:700,asc:950,desc:-260};
T.DEF={stroke:0.1875,round:1,base:1,apr:0.135,lead:0.135,stretch:1};
T.RANGE={stroke:[0.12,0.23],round:[0,1],base:[0.8,1.3],apr:[0.04,0.3],lead:[0.06,0.4],stretch:[1,6]};
T.STEPS={f:[1.5,2,3,4,6],d:[1.5,2],n:[]};   // font alternates .s1..s5 (free) / .s1..s2 (diagonal)
T.KMAX={f:6,d:2,n:1};
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
def('?',0.62,'n',(c,W)=>{const xs=W/2-c.S/2;return [c.bowl(xs,W,c.T,c.M),c.hb(0,xs+8,c.T),c.vb(xs,0.31*c.H,c.M),c.rect(xs,0,xs+c.S,c.S)];});
/* --- rounds --- */
const ringH=c=>c.H+2*c.ov;
def('C',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H);return [c.cs(0,W,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2)];},c=>c.rxC+0.3*c.H);
def('O',1.0,'f',(c,W)=>c.stad(0,W,c.H+c.ov,-c.ov,c.rxC,c.S2),c=>2*c.rxC);
def('Э',1.0,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H);const tl=0.55*c.H;return [c.cs(W,0,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2),c.hb(W-tl,W-c.S2/2,c.M)];},c=>c.rxC+0.6*c.H);
def('D',1.0,'f',(c,W)=>[stem(c),c.cs(W,0,c.H,0,c.r*Math.min(c.rxC,W-c.S-0.1*c.H),c.r*c.H/2,c.S)],c=>c.rxC+c.S+0.1*c.H);
def('G',1.05,'f',(c,W)=>{const rx=Math.min(c.rxC,W-0.3*c.H),S=c.S;return [c.cs(0,W,c.H+c.ov,-c.ov,c.r*rx,c.r*ringH(c)/2,c.S2),c.vb(W-S,-c.ov,c.M+S/2),c.hb(W-0.5*c.H,W,c.M)];},c=>c.rxC+0.4*c.H);
def('Q',1.0,'f',(c,W)=>{const hw=c.hw(0.17*c.H,0.31*c.H);return [...c.stad(0,W,c.H+c.ov,-c.ov,c.rxC,c.S2),c.dg(W-0.36*c.H,-0.14*c.H,W-0.53*c.H,0.8*c.S,hw)];},c=>2*c.rxC);
def('Ю',1.2,'f',(c,W)=>{const x0=c.S+0.1*c.H,rx=0.42*c.H;return [stem(c),c.hb(0,x0+c.S2/2,c.M),...c.stad(x0,W,c.H+c.ov,-c.ov,rx,c.S2)];},c=>c.S+0.1*c.H+2*0.42*c.H);
def('Ф',1.15,'f',(c,W)=>{const RH=0.74*c.H,y0=(c.H-RH)/2;return [c.vb((W-c.S)/2,-c.ov,c.H+c.ov),...c.stad(0,W,y0+RH,y0,RH/2,c.S)];},c=>0.74*c.H+0.3*c.H);
def('U',1.0,'f',(c,W)=>[c.cup(W,c.H,c.H,Math.min(0.45*c.H,W/2))]);
def('J',0.8,'f',(c,W)=>[c.cup(W,0.4*c.H,c.H,Math.min(0.3*c.H,W/2))],c=>c.S*2+0.4*c.H);
def('0',0.85,'f',(c,W)=>{const S=c.S,hw=c.hw(0.4*W,c.H-S);return [...c.stad(0,W,c.H+c.ov,-c.ov,0.4*c.H,c.S2),c.dg(0.3*W-hw/2,S/2,0.7*W-hw/2,c.H-S/2,hw)];},c=>0.8*c.H);
def('8',0.95,'f',(c,W)=>{const x0=0.04*c.H;return [...c.stad(x0,W-x0,c.T+c.S/2,c.M-c.S/2,c.RO,c.S),...c.stad(0,W,c.M+c.S/2,-0+0,c.RO,c.S)];},c=>2*c.RO+0.2*c.H);
def('6',0.95,'f',(c,W)=>{const RH=0.64*c.H,S=c.S,y0=RH/2,ry=c.H-y0,rx=c.r*Math.min(c.rxC,W*0.5),cx=rx,cy=c.r*ry,Wt=0.78*W;
  const p=new Path(0,y0);if(cy>0.5)p.l(0,c.H-cy);if(cx>0.5&&cy>0.5)p.a(cx,c.H-cy,cx,cy,180,90);p.l(Wt,c.H).l(Wt,c.H-S);
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
def('%',0,'n',(c)=>{const W=1.25*c.H,t=0.8*c.S,h=0.44*c.H,hw=c.hw(W-0.2*c.H,c.H);return [...c.stad(0,0.5*c.H,c.H,c.H-h,0.25*c.H,t),...c.stad(W-0.5*c.H,W,h,0,0.25*c.H,t),c.dg(0.1*W,0,W-0.1*W-hw,c.H,hw)];});
def('№',0,'n',(c)=>{const W=1.55*c.H,Wn=0.9*c.H,t=0.8*c.S,x0=Wn+0.1*c.H;return [...G.N.f(c,Wn),...c.stad(x0,W,0.9*c.H,0.5*c.H,0.22*c.H,t),c.hb(x0,W,0.36*c.H,t)];});
def('&',0,'n',(c)=>{const W=1.0*c.H,t=c.S*0.8,hw=c.hw(0.6*W,0.55*c.H);return [...c.stad(0.14*W,0.7*W,c.H,0.5*c.H,0.22*c.H,t),c.cs(0,0.84*W,0.6*c.H,0,c.r*0.3*c.H,c.r*0.3*c.H,t),c.dg(W-hw,0,0.2*W,0.55*c.H,hw)];});
/* aliases: identical shared Cyrillic / Latin forms (one glyph) and lowercase -> caps */
const AL={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','У':'Y','І':'I','Ј':'J'};
G.P=G['Р'];G.B=G['В'];G.X=G['Х'];
T.canon=ch=>{let u=ch.toUpperCase();if(u.length!==1)u=ch;return AL[u]||u;};
T.has=ch=>!!G[T.canon(ch)];
T.charset=(()=>{const a=[];const add=(s)=>{for(const ch of s)a.push(ch);};add('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ');add('ABCDEFGHIJKLMNOPQRSTUVWXYZ');add('0123456789');add('.,:;!?«»„“”‘’"\'-–—…()/&№+−=%');return a;})();
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
T.KERN=[
 {l:['Г','T','F'],r:['A','Д','Л'],v:-0.07},
 {l:['A'],r:['T','Y','V','W'],v:-0.07},
 {l:['Л'],r:['T','Y','V','W','Г'],v:-0.07},
 {l:['Д'],r:['T','Y','V','W'],v:-0.04},
 {l:['T','Y','V','W','Г','A','Л','F'],r:['.',',','…'],v:-0.08},
 {l:['Y','V','W','T'],r:['O','C','Q','G'],v:-0.025}];
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
      const gl=T.glyph(it.ch,P,1);const cap=(T.KMAX[g.cls]-1)*gl.w0;const sc=(SC[key]||(g.cls==='d'?1:4))+idx*0.001;cand.push({it,w0:gl.w0,cap,sc,e:0});});
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
  items.forEach((it,i)=>{const sp=it.ch===' '||it.ch===' ';
    if(sp){x+=T.SPACE*T.M.cap+P.apr*T.M.cap;return;}
    const g=T.glyph(it.ch,P,it.k||1);if(!g)return;out.push({g,x:x+sb-(0)+(g.sbL-sb),item:it,idx:i});x+=g.adv+tr;});
  return{glyphs:out,width:x-sb};};
/* ---------- drawing (canvas, y up inside) ---------- */
T.pathOf=(g)=>{const p=new Path2D();for(const c of g.contours){const f=c[0];p.moveTo(f.x0,f.y0);for(const s of c){if(s.t==='L')p.lineTo(s.x1,s.y1);else p.ellipse(s.cx,s.cy,s.rx,s.ry,0,s.a0*D2R,s.a1*D2R,s.a1<s.a0);}p.closePath();}return p;};
T.drawGlyph=(ctx,g,x,y,sc,color)=>{ctx.save();ctx.translate(x,y);ctx.scale(sc,-sc);ctx.fillStyle=color||'#000';ctx.fill(T.pathOf(g),'nonzero');ctx.restore();};
T.drawLine=(ctx,lay,x,y,sc,color)=>{for(const q of lay.glyphs)T.drawGlyph(ctx,q.g,x+q.x*sc,y,sc,color);};
/* export for the TTF builder */
T.exportGlyph=(ch,P,k)=>{const g=T.glyph(ch,P,k);const r=v=>Math.round(v*1000)/1000;
  return{adv:g.adv,sb:g.sb,sbL:g.sbL,W:g.W,contours:g.contours.map(c=>c.map(s=>s.t==='L'?{t:'L',x0:r(s.x0),y0:r(s.y0),x1:r(s.x1),y1:r(s.y1)}:{t:'A',cx:r(s.cx),cy:r(s.cy),rx:r(s.rx),ry:r(s.ry),a0:r(s.a0),a1:r(s.a1),x0:r(s.x0),y0:r(s.y0),x1:r(s.x1),y1:r(s.y1)}))};};
T.CLASS=ch=>{const g=G[T.canon(ch)];return g?g.cls:null;};
T._G=G;
if(typeof module!=='undefined'&&module.exports)module.exports=T;else root.Tyaga=T;
})(typeof window!=='undefined'?window:globalThis);
