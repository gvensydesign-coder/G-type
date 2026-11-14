/* ===== VOLT core: параметры, примитивы, искажение сеткой ===== */
const K0 = 0.5523;
/* пробельные знаки: обычный и неразрывный (ширина p.space), тонкий U+2009 и узкий неразрывный U+202F (1/8–1/5 кегля) */
function isSpaceCh(c){const n=c?c.charCodeAt(0):0;return n===32||n===160||n===0x2009||n===0x202f;}
function thinSpace(p){const s=+p.space||200;return Math.round(Math.min(0.8*s,Math.min(200,Math.max(125,s*0.5))));}
function spaceAdv(c,p){const n=c.charCodeAt(0);return (n===0x2009||n===0x202f)?thinSpace(p):p.space;}
const PARAMS = [
  // key, label, min, max, step, group
  ['wdth','Ширина, %',80,140,1,'Пропорции'],
  ['capH','Высота прописных',620,760,1,'Пропорции'],
  ['xh','Высота строчных',440,600,1,'Пропорции'],
  ['asc','Верхние выносные',700,840,1,'Пропорции'],
  ['desc','Нижние выносные',160,260,1,'Пропорции'],
  ['stem','Основные штрихи',70,320,1,'Штрихи'],
  ['hair','Соединительные штрихи',40,220,1,'Штрихи'],
  ['diag','Диагонали',0.85,1.15,0.01,'Штрихи'],
  ['optic','Оптика: утолщение в овалах, %',0,40,1,'Штрихи'],
  ['round','Радиус углов',0,1.6,0.01,'Форма'],
  ['kappa','Кривизна углов',0,0.85,0.01,'Форма'],
  ['innerR','Радиус отверстий',0.5,1.4,0.05,'Форма'],
  ['rough','Шероховатость среза',0,60,1,'Форма'],
  ['spur','Засечки-шпоры',0,260,1,'Форма'],
  ['ov','Свисание овалов',0,22,1,'Форма'],
  ['aper','Апертура, %',8,50,1,'Конструкция'],
  ['bar','Высота перекладин, %',46,58,0.5,'Конструкция'],
  ['mv','Апекс М, %',0,45,1,'Конструкция'],
  ['trap','Ловушки для краски, %',0,80,1,'Конструкция'],
  ['join','Присоединение: сужение, %',0,60,1,'Конструкция'],
  ['slant','Угол наклона, °',-4,16,0.5,'Наклон и ритм'],
  ['icomp','Компенсация курсива, %',0,100,1,'Наклон и ритм'],
  ['sb','Полуапроши (боковые поля)',10,90,1,'Наклон и ритм'],
  ['opsp','Оптические отступы, %',0,100,1,'Наклон и ритм'],
  ['track','Трекинг',-40,60,1,'Наклон и ритм'],
  ['space','Межсловный пробел',140,420,1,'Наклон и ритм'],
];
const DEFAULTS = {
  regular:{wdth:100,capH:700,xh:500,asc:760,desc:210,stem:190,hair:62,diag:1.1,optic:0,round:1,kappa:0.5523,innerR:1,spur:120,ov:12,slant:0,sb:48,track:0,space:260,stemScale:0,tabular:0,mono:0,rough:0},
  italic: {wdth:96,capH:700,xh:500,asc:760,desc:210,stem:186,hair:60,diag:1.1,optic:0,round:1,kappa:0.5523,innerR:1,spur:120,ov:12,slant:12,sb:48,track:0,space:250,stemScale:0,tabular:0,mono:0,rough:0},
};
const LAT_N = 5;               // узлов сетки по каждой оси
const BOX_Y0 = -260, BOX_Y1 = 960;
const BOX_H = BOX_Y1 - BOX_Y0;

/* ---- контуры ---- */
function area(nodes){let s=0;for(let i=0;i<nodes.length;i++){const a=nodes[i],b=nodes[(i+1)%nodes.length];s+=a.x*b.y-b.x*a.y;}return s/2;}
function reverseNodes(nodes){const r=nodes.slice().reverse();return r.map(n=>({x:n.x,y:n.y,a:n.b,b:n.a}));}
function mkc(nodes,hole){const ar=area(nodes);const wantPos=!hole; if((ar>0)!==wantPos) nodes=reverseNodes(nodes);return {hole:!!hole,nodes};}
/* многоугольник со скруглёнными углами: pts=[[x,y,r],...] */
function rp(pts,g){
  const n=pts.length,out=[];
  for(let i=0;i<n;i++){
    const x=pts[i][0],y=pts[i][1],r0=pts[i][2]||0;
    if(!r0){out.push({x,y,a:null,b:null});continue;}
    const pr=pts[(i-1+n)%n],nx=pts[(i+1)%n];
    const d1=Math.hypot(pr[0]-x,pr[1]-y)||1,d2=Math.hypot(nx[0]-x,nx[1]-y)||1;
    /* фаска (kappa≈0) не больше трети стороны и не больше ствола: срез читается как срез, а не превращает овал в ромб */
    const cham=g.kappa<0.25,cap=cham?0.34:0.5;
    const r=Math.min(r0*g.round,d1*cap,d2*cap,cham&&g.S?g.S*0.95:1e9);
    const k=Math.min(0.95,Math.max(0,g.kappa));
    const p1x=x+(pr[0]-x)/d1*r,p1y=y+(pr[1]-y)/d1*r;
    const p2x=x+(nx[0]-x)/d2*r,p2y=y+(nx[1]-y)/d2*r;
    out.push({x:p1x,y:p1y,a:null,b:{x:p1x+(x-p1x)*k,y:p1y+(y-p1y)*k}});
    out.push({x:p2x,y:p2y,a:{x:p2x+(x-p2x)*k,y:p2y+(y-p2y)*k},b:null});
  }
  return out;
}
function RECT(g,x0,y0,x1,y1,r,hole){
  if(hole){x1=Math.max(x1,x0+14);y1=Math.max(y1,y0+14);}
  const rr=Array.isArray(r)?r:[r||0,r||0,r||0,r||0];
  return mkc(rp([[x0,y0,rr[0]],[x1,y0,rr[1]],[x1,y1,rr[2]],[x0,y1,rr[3]]],g),hole);
}
const R=(g,x0,y0,x1,y1,r)=>RECT(g,x0,y0,x1,y1,r,false);
const X=(g,x0,y0,x1,y1,r)=>RECT(g,x0,y0,x1,y1,r,true);
const PG=(g,pts,hole)=>mkc(rp(pts,g),hole);
const DG=(g,xb,yb,xt,yt,d)=>{d=d||g.D;return PG(g,[[xb,yb],[xb+d,yb],[xt+d,yt],[xt,yt]]);};
/* повёрнутый прямоугольник: центр, длина, толщина, угол (град., 0 = горизонт.) */
function RR(g,cx,cy,len,th,ang){const a=ang*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const q=[[-len/2,-th/2],[len/2,-th/2],[len/2,th/2],[-len/2,th/2]].map(([x,y])=>[cx+x*c-y*s,cy+x*s+y*c]);return PG(g,q);}
/* преобразование контуров (зеркало, поворот) */
function xf(cs,fn){return cs.map(c=>mkc(c.nodes.map(n=>{const p=fn(n.x,n.y),a=n.a&&fn(n.a.x,n.a.y),b=n.b&&fn(n.b.x,n.b.y);
  return {x:p[0],y:p[1],a:a?{x:a[0],y:a[1]}:null,b:b?{x:b[0],y:b[1]}:null};}),c.hole)).map((m,i)=>KEEPOP(m,cs[i]));}
const MIRX=(cs,w)=>xf(cs,(x,y)=>[w-x,y]);
const ROT=(cs,w,h)=>xf(cs,(x,y)=>[w-x,h-y]);
const FLIPY=(cs,yc)=>xf(cs,(x,y)=>[x,2*yc-y]);
const KEEPOP=(m,c)=>{if(c.op)m.op=c.op;if(c.grp)m.grp=c.grp;return m;};
const cloneC=cs=>cs.map(c=>KEEPOP({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a&&{x:n.a.x,y:n.a.y},b:n.b&&{x:n.b.x,y:n.b.y}}))},c));

/* ---- свободная деформация (FFD) ---- */
const BINOM=[1,4,6,4,1];
function bern(i,t){return BINOM[i]*Math.pow(t,i)*Math.pow(1-t,LAT_N-1-i);}
function newLattice(){const z=()=>Array.from({length:LAT_N},()=>Array(LAT_N).fill(0));return {dx:z(),dy:z()};}
function latActive(l){if(!l)return false;for(let i=0;i<LAT_N;i++)for(let j=0;j<LAT_N;j++)if(Math.abs(l.dx[i][j])>1e-4||Math.abs(l.dy[i][j])>1e-4)return true;return false;}
function ffdPoint(l,w,x,y){
  let u=Math.min(1,Math.max(0,x/w)),v=Math.min(1,Math.max(0,(y-BOX_Y0)/BOX_H));
  const bu=[],bv=[];for(let i=0;i<LAT_N;i++){bu.push(bern(i,u));bv.push(bern(i,v));}
  let dx=0,dy=0;
  for(let i=0;i<LAT_N;i++)for(let j=0;j<LAT_N;j++){const b=bu[i]*bv[j];dx+=b*l.dx[i][j];dy+=b*l.dy[i][j];}
  return [x+dx*w,y+dy*BOX_H];
}
/* бланкосом кубической кривой */
function blossom(P,a,b,c){
  const L=(p,q,t)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  const a0=L(P[0],P[1],a),a1=L(P[1],P[2],a),a2=L(P[2],P[3],a);
  const b0=L(a0,a1,b),b1=L(a1,a2,b);return L(b0,b1,c);
}
function segPts(n0,n1){
  const P0=[n0.x,n0.y],P3=[n1.x,n1.y];
  let P1=n0.b?[n0.b.x,n0.b.y]:null,P2=n1.a?[n1.a.x,n1.a.y]:null;
  if(!P1&&!P2){P1=[P0[0]+(P3[0]-P0[0])/3,P0[1]+(P3[1]-P0[1])/3];P2=[P0[0]+(P3[0]-P0[0])*2/3,P0[1]+(P3[1]-P0[1])*2/3];}
  else{if(!P1)P1=P0.slice();if(!P2)P2=P3.slice();}
  return [P0,P1,P2,P3];
}
/* делим контур на мелкие кубические куски и двигаем все точки через fn */
function warpContour(c,fn,step){
  const ns=c.nodes,n=ns.length,out=[];
  for(let i=0;i<n;i++){
    const P=segPts(ns[i],ns[(i+1)%n]);
    const len=Math.hypot(P[3][0]-P[0][0],P[3][1]-P[0][1])+Math.hypot(P[1][0]-P[0][0],P[1][1]-P[0][1])*0.5+Math.hypot(P[3][0]-P[2][0],P[3][1]-P[2][1])*0.5;
    const m=Math.min(18,Math.max(1,Math.ceil(len/step)));
    for(let k=0;k<m;k++){
      const t0=k/m,t1=(k+1)/m;
      const Q0=blossom(P,t0,t0,t0),Q1=blossom(P,t0,t0,t1),Q2=blossom(P,t0,t1,t1),Q3=blossom(P,t1,t1,t1);
      const w0=fn(Q0[0],Q0[1]),w1=fn(Q1[0],Q1[1]),w2=fn(Q2[0],Q2[1]);
      const o={x:w0[0],y:w0[1],a:null,b:{x:w1[0],y:w1[1]}};
      out.push(o);
      o._h2=w2;o._e=fn(Q3[0],Q3[1]);
    }
  }
  // собрать a-ручки: у узла j входящая ручка = _h2 предыдущего куска
  const N=out.length;
  for(let j=0;j<N;j++){const prev=out[(j-1+N)%N];out[j].a={x:prev._h2[0],y:prev._h2[1]};}
  out.forEach(o=>{delete o._h2;delete o._e;});
  return KEEPOP({hole:c.hole,nodes:out},c);
}
function mapNodes(c,fn){return KEEPOP({hole:c.hole,nodes:c.nodes.map(n=>{const p=fn(n.x,n.y),a=n.a&&fn(n.a.x,n.a.y),b=n.b&&fn(n.b.x,n.b.y);
  return {x:p[0],y:p[1],a:a?{x:a[0],y:a[1]}:null,b:b?{x:b[0],y:b[1]}:null};})},c);}

/* ---- направляющие: кусочно-линейная замена координат ---- */
function mkRemap(list){
  const a=list.slice().sort((x,y)=>x.s-y.s),src=[],tgt=[];
  for(const g of a){
    if(src.length&&g.s-src[src.length-1]<1){if(g.d&&!(tgt[tgt.length-1]-src[src.length-1]))tgt[tgt.length-1]=g.s+g.d;continue;}
    src.push(g.s);let t=g.s+g.d;if(tgt.length&&t<tgt[tgt.length-1]+2)t=tgt[tgt.length-1]+2;tgt.push(t);
  }
  const n=src.length;let active=false;for(let i=0;i<n;i++)if(Math.abs(tgt[i]-src[i])>1e-6)active=true;
  const map=(x,A,B)=>{
    if(n===0)return x;
    if(x<=A[0])return x+(B[0]-A[0]);
    if(x>=A[n-1])return x+(B[n-1]-A[n-1]);
    let i=1;while(i<n-1&&x>A[i])i++;
    const t=(x-A[i-1])/(A[i]-A[i-1]);return B[i-1]+t*(B[i]-B[i-1]);
  };
  return {active,src,tgt,f:x=>map(x,src,tgt),inv:x=>map(x,tgt,src)};
}
const VG_DEF=['L','S','C','WS','W'],HG_DEF=['D','B','XH','MID','CAP','ASC'];
const VG_NAME={L:'левый край',S:'грань стойки',C:'центр',WS:'грань справа',W:'правый край'};
const HG_NAME={D:'нижний выносной',B:'базовая линия',XH:'высота строчной',MID:'середина (талия)',CAP:'высота прописной',ASC:'верхний выносной'};
function evalVG(w,S,ed){
  const st=(ed&&ed.vg)||[],base={L:0,S:S,C:w/2,WS:w-S,W:w},out=[];
  for(const k of VG_DEF){const f=st.find(g=>g.k===k);out.push({k,s:base[k],d:f?f.d:0});}
  st.forEach(g=>{if(g.k==='x')out.push({k:'x',g,s:g.v,d:g.d});});
  return out;
}
function evalHG(p,list){
  const st=list||[],base={D:-p.desc,B:0,XH:p.xh,MID:p.capH/2,CAP:p.capH,ASC:p.asc},out=[];
  for(const k of HG_DEF){const f=st.find(g=>g.k===k);out.push({k,s:base[k],d:f?f.d:0});}
  st.forEach(g=>{if(g.k==='y')out.push({k:'y',g,s:g.v,d:g.d});});
  return out;
}
