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
