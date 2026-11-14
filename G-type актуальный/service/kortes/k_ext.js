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
