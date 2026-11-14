/* punctuation, symbols, assembly (spacing, alternates, kerning, charset) */
(function(root){'use strict';
const K=root.KortesCore;
const LT={ctx:root.KortesLettersCtx,L:root.KortesLetters,atoms:root.KortesAtoms};
const L=LT.L,ctx=LT.ctx,A=LT.atoms;const {rr,lens,rect,quad,dia,nib,blade,pth,Gl,circ}=K;const {flB,flT,leg,ringO,fin}=A;
const PI=Math.PI;
const D=(c)=>({rx:c.S*0.40,ry:c.S*0.50});
/* ---------- punctuation / symbols (first drafts in the face's wedge + diamond logic) */
function comma(c,up){const g=new Gl(),{S}=c;const d=D(c);g.add(dia(d.rx+4,d.ry*1.0+10,d.rx,d.ry));g.add(blade(pth([d.rx+4,d.ry+0],['C',d.rx+4,-40,d.rx-30,-100,d.rx-70,-150]),t=>S*0.62*(1-t*0.9)+4));return g;}
const P={};
P['.']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,d.ry+2,d.rx,d.ry));return fin(g,2*d.rx+8,[22,22]);};
P[',']=c=>{const g=comma(c);return fin(g,c.S*0.8+30,[18,18]);};
P[':']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,d.ry+2,d.rx,d.ry),dia(d.rx+4,c.C*0.62,d.rx,d.ry));return fin(g,2*d.rx+8,[22,22]);};
P[';']=c=>{const d=D(c),g=comma(c);g.add(dia(d.rx+4,c.C*0.62,d.rx,d.ry));return fin(g,c.S*0.8+30,[18,18]);};
P['!']=c=>{const d=D(c),{S,C}=c,g=new Gl();const w=S*1.0;g.add([[0,C],[w,C],[w*0.68,d.ry*2+70],[w*0.32,d.ry*2+70]],dia(w/2,d.ry+2,d.rx,d.ry));return fin(g,w,[22,22]);};
P['?']=c=>{const {S,C}=c,d=D(c),g=new Gl();const W=c.w(430);
  const p=pth([W*0.10,0.80*C],['C',W*0.14,1.04*C,W*0.90,1.06*C,W*0.88,0.74*C],['C',W*0.86,0.52*C,W*0.46,0.50*C,W*0.46,0.30*C]);g.add(...K.sweep(p,c.nibA*0.95,c.nibB,26*PI/180));g.add(dia(W*0.46,d.ry+2,d.rx,d.ry));return fin(g,W,[14,10]);};
const dash=(f)=>(c)=>{const g=new Gl(),W=c.w(f),t=c.hb*1.25,y=c.C*0.34;g.add([[0,y-t/2],[W-t*0.5,y-t/2],[W,y+t/2],[t*0.5,y+t/2]]);return fin(g,W,[18,18]);};
P['-']=dash(260);P['–']=dash(480);P['—']=dash(860);P['‒']=c=>{return dash(520)(c);};
P['−']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.15,y=c.C*0.40;g.add(rect(0,y-t/2,W,y+t/2));return fin(g,W,[40,40]);};
P['+']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.15,y=c.C*0.40,s=c.S*0.8;g.add(rect(0,y-t/2,W,y+t/2),rect(W/2-s/2,y-W/2+t*0.0,W/2+s/2,y+W/2));return fin(g,W,[40,40]);};
P['=']=c=>{const g=new Gl(),W=c.w(480),t=c.hb*1.05;g.add(rect(0,c.C*0.40+60,W,c.C*0.40+60+t),rect(0,c.C*0.40-60-t,W,c.C*0.40-60));return fin(g,W,[40,40]);};
P['•']=c=>{const g=new Gl();const r=c.S*0.62;g.add(circ(r,c.C*0.5,r));return fin(g,2*r,[40,40]);};
P['·']=c=>{const d=D(c),g=new Gl().add(dia(d.rx+4,c.C*0.42,d.rx,d.ry));return fin(g,2*d.rx+8,[30,30]);};
P['°']=c=>{const g=new Gl();const r=c.S*0.52;g.add(circ(r,c.C-r,r));g.sub(circ(r,c.C-r,r-Math.min(c.h*0.9,r*0.58)));return fin(g,2*r,[24,24]);};
P['*']=c=>{const g=new Gl(),S=c.S,y=c.C-S*0.72;const W=S*1.5;const bar=(a)=>{const hw=S*0.17,l=S*0.72;const ca=Math.cos(a),sa=Math.sin(a);return [[W/2-l*ca-hw*sa,y-l*sa+hw*ca],[W/2+l*ca-hw*sa,y+l*sa+hw*ca],[W/2+l*ca+hw*sa,y+l*sa-hw*ca],[W/2-l*ca+hw*sa,y-l*sa-hw*ca]];};
  g.add(bar(PI/2),bar(PI/2+PI/3),bar(PI/2-PI/3));return fin(g,W,[30,30]);};
P['/']=c=>{const g=new Gl(),W=c.w(380);for(const p of leg(c,0,c.S*0.8,W-c.S*0.8,W,-50,c.C+50,null,null))g.add(p);return fin(g,W,[0,0]);};
P['\\']=c=>{const g=new Gl(),W=c.w(380);for(const p of leg(c,W-c.S*0.8,W,0,c.S*0.8,-50,c.C+50,null,null))g.add(p);return fin(g,W,[0,0]);};
P['|']=c=>{const g=new Gl();g.add(rect(0,-170,c.S*0.8,c.C+110));return fin(g,c.S*0.8,[40,40]);};
P['(']=c=>{const g=new Gl(),S=c.S;const p=pth([S*1.6,c.C+90],['C',S*0.3,c.C*0.7,S*0.3,c.C*0.0,S*1.6,-190]);g.add(...K.sweep(p,c.nibA*0.9,c.nibB,40*PI/180));return fin(g,S*1.7,[16,10]);};
P[')']=c=>{const f=P['('](c);return fin(f.g.mirX(f.W/2),f.W,[10,16]);};
P['#']=c=>{const g=new Gl(),S=c.S,W=c.w(640),t=c.bar;for(const y of [c.C*0.62,c.C*0.30])g.add(rect(0,y,W,y+t));for(const x of [W*0.30,W*0.62])g.add(quad([x-S*0.2,0],[x+S*0.5,0],[x+S*0.5+90,c.C],[x-S*0.2+90,c.C]));return fin(g,W+90,[20,20]);};
P['%']=c=>{const g=new Gl(),S=c.S,W=c.w(860);const sm=(x0,y0,w,h)=>{const r=ringO(c,0,w,S*0.7,S*0.7,{tt:0.1});const f=h/(c.C+20);return [r.outer.map(q=>[x0+q[0],y0+(q[1]+10)*f]),r.counter.map(q=>[x0+q[0],y0+(q[1]+10)*f])];};
  const a=sm(0,c.C*0.42,W*0.38,c.C*0.58),b=sm(W*0.62,0,W*0.38,c.C*0.58);g.add(a[0],b[0]);g.sub(a[1],b[1]);
  for(const p of leg(c,W*0.12,W*0.12+S*0.55,W*0.88-S*0.55,W*0.88,-10,c.C+10,null,null))g.add(p);return fin(g,W,[20,20]);};
P['@']=c=>{const g=new Gl(),W=c.w(760);const r=ringO(c,0,W,c.S*0.8,c.S*0.8,{tt:0.1});g.add(r.outer);g.sub(r.counter);
  const rin=ringO(c,W*0.34,W*0.66,c.S*0.42,c.S*0.42,{tt:0.1});const f=0.42;g.add(rin.outer.map(q=>[q[0],q[1]*f+c.C*0.29]));g.sub(rin.counter.map(q=>[q[0],q[1]*f+c.C*0.29]));
  g.add(rect(W*0.62,c.C*0.30,W*0.62+c.S*0.38,c.C*0.62));return fin(g,W,[20,20]);};
P['©']=c=>{const g=new Gl(),W=c.w(760);const r=ringO(c,0,W,c.S*0.6,c.S*0.6,{tt:0.1});g.add(r.outer);g.sub(r.counter);const ci=L.C(Object.assign(Object.create(c),{S:c.S*0.5,h:c.h*0.6,R:c.S*0.5*1.04,C:300,sr:c.sr*0.4,sh:c.sh*0.4,bh:c.bh*0.4,bw:c.bw*0.4}));
  g.add(ci.g.shift(W/2-ci.W/2,c.C*0.5-150));return fin(g,W,[20,20]);};
P['₽']=c=>{const r=L.P(c);const {g,W}=r;g.add(rect(r.W*0.0+c.sr*0.3,c.C*0.20,W*0.82,c.C*0.20+c.bar*0.9));return fin(g,W,[8,6]);};
P['№']=c=>{const n=L.N(c);const g=n.g;const o=ringO(c,0,330,c.S*0.62,c.S*0.62,{tt:0.1});const f=0.5;g.add(o.outer.map(q=>[q[0]+n.W+20,q[1]*f+c.C*0.48]));g.sub(o.counter.map(q=>[q[0]+n.W+20,q[1]*f+c.C*0.48]));g.add(rect(n.W+20+30,c.C*0.46-c.bar,n.W+20+300,c.C*0.46-c.bar+c.bar*0.9));return fin(g,n.W+350,[6,10]);};
P['&']=c=>{const g=new Gl(),{S,C}=c;const W=c.w(640);const r=ringO(c,0,W*0.62,S*0.8,S*0.8,{tt:0.1});const f=0.52;g.add(r.outer.map(q=>[q[0]+W*0.04,q[1]*f+C*0.48]));g.sub(r.counter.map(q=>[q[0]+W*0.04,q[1]*f+C*0.48]));
  const u=ringO(c,0,W*0.5,S*0.7,S*0.7,{tt:0.1});g.add(u.outer.map(q=>[q[0]+W*0.17,q[1]*0.5+C*0.5]));g.sub(u.counter.map(q=>[q[0]+W*0.17,q[1]*0.5+C*0.5]));
  for(const p of leg(c,W*0.12,W*0.12+S*0.9,W-S*0.9,W,0,C*0.78,[c.sr*0.3,c.sr*0.5],null))g.add(p);return fin(g,W,[14,8]);};
P['«']=c=>{const g=new Gl(),S=c.S,W=c.w(520),t=c.hb*1.5;const ch=(x)=>[quad([x+S*0.9,c.C*0.62],[x+S*0.9,c.C*0.62-t],[x,c.C*0.34-t/2],[x,c.C*0.34+t/2]),quad([x,c.C*0.34+t/2],[x,c.C*0.34-t/2],[x+S*0.9,c.C*0.06],[x+S*0.9,c.C*0.06+t])];
  g.add(...ch(0),...ch(W*0.42));return fin(g,W*0.42+S*0.9,[20,20]);};
P['»']=c=>{const f=P['«'](c);return fin(f.g.mirX(f.W/2),f.W,[20,20]);};
P['’']=c=>{const g=comma(c).shift(0,c.C-c.S*0.9);return fin(g,c.S*0.8+30,[18,18]);};
P['‘']=c=>{const f=P['’'](c);const g=f.g.xf(q=>[f.W-q[0],2*(c.C*0.8)-q[1]]);return fin(g,f.W,[18,18]);};
P['”']=c=>{const f=P['’'](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['“']=c=>{const f=P['‘'](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['„']=c=>{const f=P[','](c);const g=f.g.merge(f.g.shift(c.S*0.9,0));return fin(g,f.W+c.S*0.9,[18,18]);};
P['\'']=c=>{const g=new Gl(),w=c.S*0.7;g.add([[0,c.C],[w,c.C],[w*0.62,c.C-c.S*1.4],[w*0.38,c.C-c.S*1.4]]);return fin(g,w,[22,22]);};
P['"']=c=>{const f=P['\''](c);return fin(f.g.merge(f.g.shift(c.S*1.1,0)),f.W+c.S*1.1,[22,22]);};
P['…']=c=>{const d=D(c),g=new Gl();for(let i=0;i<3;i++)g.add(dia(d.rx+4+i*(2*d.rx+40),d.ry+2,d.rx,d.ry));return fin(g,3*(2*d.rx)+80+8,[20,20]);};
P['^']=c=>{const g=new Gl(),S=c.S;g.add([[0,c.C*0.55],[S*0.5,c.C*0.95],[S,c.C*0.55],[S*0.82,c.C*0.55],[S*0.5,c.C*0.80],[S*0.18,c.C*0.55]]);return fin(g,S,[30,30]);};
P['~']=c=>({g:new Gl(),W:0,sb:[0,0]});
if(root.KortesPunctR2)root.KortesPunctR2(P);
/* ---------- charset */
const CYR_SHARED={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','І':'I','Ѕ':'S','Ј':'J','Ү':'Y'};
const LAT='ABCDEFGHIJKLMNOPQRSTUVWXYZ',CYR='АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',DIG='0123456789';
const PUN=[...'.,:;!?-()/&"\'#%@*+=|\\^'].concat(['–','—','‒','−','…','«','»','„','“','”','‘','’','№','©','₽','·','°','•']);
const keyOf=(ch)=>CYR_SHARED[ch]||ch;
function charset(){const list=[];for(const ch of LAT+CYR+'Ё'+K.EXT_CY+K.EXT_LAT+DIG)list.push(ch);for(const ch of PUN)list.push(ch);return list;}
const sup=(P0,key)=>{const c2=ctx(Object.assign({},K.DEF,{weight:176,contrast:32,sharp:45,width:1,apros:P0.apros}));const r=(L[key]||P[key])(c2);const s=0.5;const g=r.g.xf(q=>[q[0]*s,q[1]*s+c2.C*0.5]);return {g,W:r.W*s,sb:[r.sb[0]*0.8+8,r.sb[1]*0.8+8]};};
const SWASH=new Set(['R','Я']);  /* R3: tails only on R and Я, pair-gated by calt */
const YQ=0.19;/* W88: Я after Q — short left tail (fraction of the full tail) that stops before Q's own tail */
function swashed(c,key,r,sh){const Lt=sh==='y'?Math.min(c.sw,0.5)*1100*YQ:c.sw*1100*(sh?0.62:1);if(c.sw*1100*(sh==='y'?1:sh?0.62:1)<60)return null;const W=r.W,S=c.S;let g=r.g;const sd=c.sr;
  if(key==='O'||key==='C'||key==='G'||key==='Э'){const ta=r.tailAt||{x:W*0.62,y:12,w:S*0.4};const x0=key==='Э'?W*0.74:ta.x;
    g=new Gl().merge(r.g);if(key==='O')g.add(tail(c,W*0.60,20,W+Lt*0.42,36,c.S*0.30));else g.add(tail(c,x0,ta.y,W+Lt*0.62,62,ta.w));return {g,W,sb:r.sb};}
  if(key==='R'){const c2=Object.create(c);c2.noLeg=true;const r2=L.R(c2);const b=r2.swashBase;const g2=r2.g;
    if(sh==='y'){const xe=W+Lt*0.68,Ln=xe-b.x;g2.add(blade(pth([b.x,b.y],['C',b.x+0.30*Ln,b.y*0.3-8,b.x+0.66*Ln,-36,xe,-44]),t=>Math.max(b.lw*0.85*Math.pow(1-t,1.2),0)+(t<0.985?4:0)));}else g2.add(tail(c,b.x,b.y,W+Lt*0.68,190,b.lw*1.05));return {g:g2,W,sb:r2.sb};}
  if(key==='Я'){const rs=swashed(c,'R',L.R(c),sh?'y':false);return {g:rs.g.mirX(W/2),W,sb:[2,8]};}  /* R3b: Я.sw = mirror of R.sw (tail sweeps LEFT under the preceding round letter) */
  return null;}
function tail(c,x0,y0,xEnd,dip,w0){const Ln=xEnd-x0;
  const pts=pth([x0,y0],['C',x0+0.30*Ln,y0>30&&dip<100?-dip*0.9:-dip*0.75,x0+0.66*Ln,-dip*1.15,xEnd,-108]);
  return blade(pts,t=>Math.max(w0*Math.pow(1-t,1.2),0)+(t<0.985?4:0));}
const PUNCR='. , : ; … ! ? - – — ) » ” ’';
const KERNP=[ // [leftKeys,rightKeys,value]  (keys are caps; Cyrillic twins map through keyOf)
 ['A Д Л','T Т V W Y У Ч Ъ',-55],                       // AT AV AW AY ЛТ ДТ
 ['A Д Л','C G O Q Э Ю Ф',-18],
 ['O C G Э','Я',-20],
 ['T Т Г F P Р V W Y У','A Д Л',-55],                  // TA VA WA YA PA ГА ТА УА
 ['T Т Г F P Р Y V W У','O C G Q Э Ю Ф',-25],
 ['T Т Г F P Р Y V W У','Z S З',-10],
 ['L','T Т V W Y У',-60],['Л','T Т У V W Y',-40],      // LT LV LY ЛТ
 ['T Т Г F P Р Y V W У',PUNCR,-60],                     // T. Г, У, V. Y,
 ['L Л','. , ’ ” ’',-25],
 ['R К K Я','T Т V W Y У',-20],
 ['O C Э D Ю','T Т V W Y У A Д',-20],
 ['Г','А A Д Л',-50],
 ['F','A Д Л',-30],['P Р','J',-10],
 ['Z','Z',-10]];
/* W88 A: новые знаки наследуют классы кернинга основы (составные — по EXT_BASE) */
for(const k of KERNP)for(const i of [0,1]){const l=k[i].split(' ');const add=[];for(const [x,b] of Object.entries(K.EXT_BASE))if(l.includes(b)&&!l.includes(x))add.push(x);if(add.length)k[i]=l.concat(add).join(' ');}
function build(Pin){const P0=Object.assign({},K.DEF,Pin||{});const c=ctx(P0);const out={params:P0,M:K.M,glyphs:{},kern:[]};
  const done={};
  for(const ch of charset()){const key=keyOf(ch);if(done[key]){done[key].chars.push(ch);continue;}
    const fn=L[key]||P[key];if(!fn){console.error('missing',key);continue;}
    const r=fn(c);const ap=P0.apros/2;
    const ink=(g)=>{let x0=1e9,x1=-1e9;for(const p of g.pos)for(const q of p){if(q[1]<-40||q[1]>740)continue;if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}if(x0>x1){const b=g.bbox();x0=b.x0;x1=b.x1;}return [x0,x1];};
    const [ix0,ix1]=ink(r.g);const sbL=r.sb[0]+ap,sbR=r.sb[1]+ap;const dx=sbL-ix0;const advV=Math.round(ix1-ix0+sbL+sbR);
    const mk=(rr_)=>({ops:rr_.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+dx).toFixed(1),+q[1].toFixed(1)])]),adv:advV});
    const G=mk(r);G.chars=[ch];G.alts={};
    if(SWASH.has(key)){const s=swashed(c,key,r);if(s){const ss=mk(Object.assign({},s,{W:r.W}));ss.adv=G.adv;G.alts.sw=ss;}const s2=swashed(c,key,r,true);if(s2){const ss=mk(Object.assign({},s2,{W:r.W}));ss.adv=G.adv;G.alts.swq=ss;}}
    if(/[A-ZА-ЯЁ0-9]/.test(key)){const s=sup(P0,key);const [sx0,sx1]=ink(s.g);const sbl=s.sb[0];G.alts.sup={ops:s.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+sbl-sx0).toFixed(1),+q[1].toFixed(1)])]),adv:Math.round(sx1-sx0+s.sb[0]+s.sb[1])};}
    done[key]=G;out.glyphs[key]=G;}
  out.space=Math.round(c.C*0.32+P0.apros);
  out.kern=KERNP.map(k=>({l:k[0].split(' ').map(keyOf),r:k[1].split(' ').map(keyOf),v:k[2]}));
  out.swashLen=c.sw*1100;return out;}
/* product API: one glyph by character; ops are painter-order [mode, polygon] with the sidebearing shift already applied */
const CXC=new Map();
function glyph(ch,Pin){const P0=Object.assign({},K.DEF,Pin||{});const pk=[P0.weight,P0.contrast,P0.sharp,P0.swash,P0.width,P0.apros].join('|');
  let c=CXC.get(pk);if(!c){c=ctx(P0);CXC.set(pk,c);if(CXC.size>40)CXC.delete(CXC.keys().next().value);}
  const key=keyOf(ch.length===1&&ch.toUpperCase().length===1?ch.toUpperCase():ch);const fn=L[key]||P[key];if(!fn)return null;
  const r=fn(c);const ap=P0.apros/2;
  const ink=(g)=>{let x0=1e9,x1=-1e9;for(const p of g.pos)for(const q of p){if(q[1]<-40||q[1]>740)continue;if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}if(x0>x1){const b=g.bbox();x0=b.x0;x1=b.x1;}return [x0,x1];};
  const [ix0,ix1]=ink(r.g);const sbL=r.sb[0]+ap,sbR=r.sb[1]+ap;const dx=sbL-ix0;const advV=Math.round(ix1-ix0+sbL+sbR);
  const mk=(rr_)=>({ops:rr_.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+dx).toFixed(1),+q[1].toFixed(1)])]),adv:advV});
  const G=mk(r);G.key=key;G.alts={};
  if(SWASH.has(key)){const s=swashed(c,key,r);if(s){const ss=mk(Object.assign({},s,{W:r.W}));ss.adv=G.adv;G.alts.sw=ss;}const s2=swashed(c,key,r,true);if(s2){const ss=mk(Object.assign({},s2,{W:r.W}));ss.adv=G.adv;G.alts.swq=ss;}}
  if(/[A-ZА-ЯЁ0-9]/.test(key)){const s=sup(P0,key);const [sx0,sx1]=ink(s.g);const sbl=s.sb[0];G.alts.sup={ops:s.g.ops.map(o=>[o[0],o[1].map(q=>[+(q[0]+sbl-sx0).toFixed(1),+q[1].toFixed(1)])]),adv:Math.round(sx1-sx0+s.sb[0]+s.sb[1])};}
  return G;}
K.glyph=glyph;K.spaceW=P0=>{P0=Object.assign({},K.DEF,P0||{});return Math.round(700*0.32+P0.apros);};K.KERNP=KERNP;K.LETTERS=L;K.PUNCT=P;K.CYR_SHARED=CYR_SHARED;K.PUNCR=PUNCR;
K.build=build;K.charset=charset;K.keyOf=keyOf;K.SWASH=SWASH;K.PUNCT=P;
root.Kortes=K;
})(typeof window!=='undefined'?window:globalThis);
