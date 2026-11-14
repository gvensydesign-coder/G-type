function recipes5(PXE,G,T){
const {CL}=PXE;const {sub,mirrorBox,rot180,flipV,bbox,capW,tl}=G._h;
G['б']=P=>{const {K,B}=P,{X,sv,sh,A}=K,W=K.Wn;P.ring(0,0,W,X,{cm:[0,1,1,0]});P.vs(0,0,A);P.hb(A-sh,sv,Math.max(sv+2,W-1));};
G['ф']=P=>{const {K,B}=P,{X,sv,sh,A,D}=K,W=Math.max(K.Wn+2,3*sv+2);let w=W;if((w-sv)&1)w++;P.ring(0,0,w,X);P.vs((w-sv)/2,-D,A);};
G['ђ']=P=>{const {K,B}=P,{X,sv,sh,A,D}=K,W=K.Wn;G.n(P);P.vs(0,X,A);P.hb(A-sh-1,-1,sv+2+0,sh);const fd=Math.max(1,Math.round(D*0.5));P.vs(W-sv,-fd,sh);P.hb(-fd,W-sv-1,W-0,sh);};
G['ћ']=P=>{const {K,B}=P,{X,sv,sh,A}=K;G.h(P);P.hb(A-sh-1,-1,sv+2,sh);};
G['Ђ']=P=>{const {K,B}=P,{H,sv,sh,D}=K,W=K.Wc,yb=Math.round(H*0.56);P.hb(H-sh,0,W);P.vs(0,0,H);P.ring(0,0,W,yb,{cm:[0,1,0,0]});B.clear(sv,0,W-sv,sh);P.vs(W-sv,-Math.max(1,Math.round(D*0.5)),yb);};
G['Ћ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc,yb=Math.round(H*0.56);P.hb(H-sh,0,W);P.vs(0,0,H);P.ring(0,0,W,yb,{cm:[0,1,0,0]});B.clear(sv,0,W-sv,sh);};
G['ә']=P=>{const {K,B}=P;G.e(P);rot180(P,K.Wn,0,K.X);};
G['Ә']=P=>{const {K,B}=P;const Q=sub(P,K.H,K.Wc,K.ym);const s=Object.assign({},Q.K);G.e(Object.assign({},P,{K:Object.assign({},K,{X:K.H,Wn:K.Wc,xm:K.ym})}));rot180(P,K.Wc,0,K.H);};
const thin5=(P,patch)=>PXE.prims(Object.assign({},P.K,patch),P.B);
G['æ']=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin5(P,{sh});const Wa=Math.max(W,2*sv+3);
  const xa=Math.max(sh+1,Math.min(X-2*sh-1,Math.floor((X-sh)*0.52))),xe=Math.ceil((X-sh)/2);
  Q.ring(0,0,Wa,xa+sh,{cm:[0,0,0,1]});Q.vs(Wa-sv,0,X);Q.hb(X-sh,0,Wa);
  const o=Wa-sv;Q.ring(o,0,o+W,X);Q.hb(xe,o+sv,o+W-sv);B.clear(o+W-sv,Math.max(sh,Math.min(sh+1,xe-1)),o+W,xe);};
G['œ']=P=>{const {K,B}=P,{X,sv}=K,W=K.Wn,sh=Math.max(1,Math.min(K.sh,Math.floor((X-2)/3))),Q=thin5(P,{sh}),xe=Math.ceil((X-sh)/2);
  Q.ring(0,0,W,X,{cm:[1,0,0,1]});const o=W-sv;Q.ring(o,0,o+W,X,{cm:[0,1,1,0]});Q.hb(xe,o+sv,o+W-sv);B.clear(o+W-sv,Math.max(sh,Math.min(sh+1,xe-1)),o+W,xe);B.clear(o,sh,o+sv,X-sh);Q.vs(o,0,X);};
G['Œ']=P=>{const {K,B}=P,{H,sv,sh}=K,W=K.Wc;P.ring(0,0,W,H,{cm:[1,0,0,1]});const o=W-sv;P.vs(o,0,H);P.hb(0,o,o+W-1);P.hb(H-sh,o,o+W-1);P.hb(K.ym,o,o+W-2);};
G['Æ']=P=>{const {K,B}=P,{H,sv,sh}=K,Wa=Math.round(K.Wc*0.95);
  if(H<=7){/* на малой высоте у А-части нет места под просвет: берём целую А и пристраиваем к её правой ноге полки Е */
    G.A(P);const bb=G._h.bbox(P),x1=bb.x1,e=Math.max(sv+2,Math.round(K.Wc*0.7));const rr=y=>{let m=-1e9;for(let x=bb.x0;x<x1;x++)if(B.g(x,y))m=x;return m<-1e8?x1-sv:m+1;};
    const yA=H-sh,yM=K.ym,xe=x1-sv+e;P.hb(0,x1-sv,xe);P.hb(yA,rr(yA),xe);P.hb(yM,rr(yM),x1-sv+Math.max(sv+1,e-1));return;}const S=Math.max(1,Math.round((Wa-sv)/2));
  /* A-like left part: single diagonal to the E stem */
  P.vs(Wa-sv,0,H);P.dg(Wa-sv-0.5,H,sv/2,0,sv);P.hb(Math.round(H*0.3),Math.round(Wa*0.28),Wa);
  const o=Wa;P.hb(0,o,o+Math.max(sv+3,Math.round(K.Wc*0.8)));P.hb(H-sh,o,o+Math.max(sv+3,Math.round(K.Wc*0.8)));P.hb(K.ym,o,o+Math.max(sv+2,Math.round(K.Wc*0.7)));};
G['ª']=P=>{const {K,B}=P;/* small a with underline: built from sub-K */
  const s=Math.max(4,Math.round(K.H*0.5));const sv2=Math.max(1,Math.round(K.sv*0.7)),sh2=1;const K2=Object.assign({},K,{X:s,sv:sv2,sh:sh2,Wn:Math.max(2*sv2+2,Math.round(K.Wn*0.8)),xm:Math.floor((s-sh2)*0.5)});if(s<7){const Q=Object.assign({},P,{K:K2});Q.ring(0,0,K2.Wn,s,{cm:[1,0,0,1]});Q.vs(K2.Wn-sv2,0,s);}else G.a(Object.assign({},P,{K:K2}));
  const cs=B.cells();const dy=K.H-s;const t=cs.map(c=>c.slice());B.clear(-3,0,40,K.H+2);for(const [x,y,v] of t)B.s(x,y+dy,v);
  B.rect(0,dy-2,K2.Wn,dy-2+1,1);};
G['º']=P=>{const {K,B}=P;const s=Math.max(4,Math.round(K.H*0.5));const K2=Object.assign({},K,{X:s,Wn:Math.max(2*K.sv+1,Math.round(K.Wn*0.8))});G.o(Object.assign({},P,{K:K2}));
  const cs=B.cells();const dy=K.H-s;const t=cs.map(c=>c.slice());B.clear(-3,0,40,K.H+2);for(const [x,y,v] of t)B.s(x,y+dy,v);B.rect(0,dy-2,K2.Wn,dy-1,1);};
G['{']=P=>{const {K,B}=P,{H,sv,sh,D}=K,y0=-D,y1=H+D-1,ym=Math.round((y0+y1)/2);P.vs(2,ym+1,y1,sv);P.vs(2,y0+1,ym-0,sv);P.hb(y1-sh+1,3,sv+3,1);P.hb(y0,3,sv+3,1);P.hb(ym,0,3,1);};
G['}']=P=>{G['{'](P);const bb=bbox(P);mirrorBox(P,bb.x1,-P.K.D,P.K.H+P.K.D);};
/* CS68: © — круг-кольцо на высоту прописной и внутри клеточная «С» (кольцо с разрывом справа); при малом разрешении вместо С — одна клетка */
G['©']=P=>{const {K,B}=P,{H,sv,sh}=K,W=Math.max(H,K.Wc+2);P.ring(0,0,W,H,{cm:[1,1,1,1]});
  const x0=sv+1,x1=W-sv-1,y0=sh+1,y1=H-sh-1;
  if(x1-x0>=3&&y1-y0>=3){P.ring(x0,y0,x1,y1,{tv:1,th:1});const ym=Math.round((y0+y1)/2);B.clear(x1-1,ym-(y1-y0>=5?1:0),x1,ym+1);}
  else{const cx=Math.floor(W/2),cy=Math.floor(H/2);B.rect(cx,cy,cx+1,cy+1,1);}};
G['·']=P=>{const {K,B}=P;B.rect(0,Math.round(K.H*0.4),K.sv,Math.round(K.H*0.4)+K.sv,2);};
/* ---- PX2: Л л (own width, leg reaches the baseline, top bar), м m (small-cap М), v w x y, breve ---- */
const lleg=(K)=>{const {H,sv,sh}=K;const lw=sv,g=sv>=4?2:1,S=Math.max(2,Math.round(H*0.3));return {lw,g,S,W:sv+g+lw+S};};
G['Л']=P=>{const {K,B}=P,{H,sv,sh}=K;const {lw,g,S,W}=lleg(K);
  P.vs(W-sv,0,H);P.hb(H-sh,Math.max(0,S-1),W);
  const top=H-sh-1,e=y=>Math.round(S*(1-Math.pow(1-y/Math.max(1,top),1.7)));
  for(let y=0;y<=top;y++){const x0=e(y),x1=Math.max(x0+lw,y<top?e(y+1)+1:0);B.rect(x0,y,Math.min(x1,W-sv-1),y+1);}
  B.rect(S,top,S+lw,H-sh);};
G.m=P=>{const {K,B}=P;G.M(sub(P,K.X,K.Wn+1,K.xm));};
G['m.ss01']=P=>{const {K,B}=P,{X,sv,sh}=K;let w1=K.Wn;const W=2*w1-sv;P.ring(0,0,w1,X,{cm:[0,1,0,0]});P.ring(w1-sv,0,W,X,{cm:[0,1,0,0]});B.clear(sv,0,w1-sv,sh);B.clear(w1,0,W-sv,sh);};
G.w=P=>{const {K,B}=P;G.W(sub(P,K.X,K.Wn+1,K.xm));};
G.y=P=>{const {K,B}=P,{X,sv,sh,D}=K;const W=Math.max(K.Wn+1,2*sv+2),dl=PXE.dlw(sv,(W-sv)/2,X);
  const cx=Math.floor((W-dl)/2);
  for(let y=0;y<X;y++){const t=(X-1-y)/Math.max(1,X-1);B.rect(Math.round(cx*t),y,Math.round(cx*t)+dl,y+1);}
  const xr=W-dl,xd=Math.max(0,cx-Math.round(cx*D/Math.max(1,X-1)));
  for(let y=-D;y<X;y++){const t=(X-1-y)/Math.max(1,X-1+D);const x0=Math.round(xr+(xd-xr)*t);B.rect(x0,y,x0+dl,y+1);}};
/* table updates */
T['м']=T['m']={r:'m',k:'xh'};T['є']={r:'Є',k:'xh',small:1};T['ґ']={r:'Ґ',k:'xh',small:1};T['ө']={r:'Ө',k:'xh',small:1};T['ғ']={r:'Ғ',k:'xh',small:1};T['қ']={r:'Қ',k:'xh',small:1};T['ң']={r:'Ң',k:'xh',small:1};T['ұ']={r:'Ұ',k:'xh',small:1};
T['џ']={r:'Џ',k:'xh',small:1};T['љ']={r:'Љ',k:'xh',small:1};T['њ']={r:'Њ',k:'xh',small:1};T['ә']={r:'ә',k:'xh'};T['Ә']={r:'Ә',k:'cap'};
T['Ђ']={r:'Ђ',k:'cap'};T['Ћ']={r:'Ћ',k:'cap'};T['Һ']={r:'h',k:'cap',hcap:1};
T['©']={r:'©',k:'cap',ns:1};T['ª']={r:'ª',k:'cap'};T['º']={r:'º',k:'cap'};T['‹']={r:'‹',k:'cap'};T['›']={r:'›',k:'cap'};
return G;}
if(typeof module!=='undefined')module.exports=recipes5;
