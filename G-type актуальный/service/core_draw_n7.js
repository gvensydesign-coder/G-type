/* ===== «Отрисуй свой шрифт»: геометрия и анализ набора (без DOM) =====
   Контур — как везде: {hole, nodes:[{x,y,a,b}]}, ручки a/b — абсолютные точки. Система «у вверх»: база y=0,
   прописные 700, строчные 500, выносные 760, нижние −210 (те же метрики, что у «Свой шрифт», IMP.M).
   Здесь: построение фигур (прямоугольник, эллипс, треугольник, сектор), обводка штриха в заливку,
   последовательное вычисление знака (сложение / вычитание через csgUnion), измерения и автоматические правки. */
const DRN={cap:700,xh:500,asc:760,desc:-210,ov:8,OFF:300,K:0.5522847498307936,
  STEMOK:'HIOEFLTNUDPhnmuoilНИПГТОЕЛШУбвдпнмлт',RAND:'OCGSQocegsОСЭЗосэз0368'};
const drnNd=(x,y,a,b)=>({x,y,a:a||null,b:b||null});
function drnCp(cs){return cs.map(c=>({hole:!!c.hole,nodes:c.nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null}))}));}
function drnAff(cs,fx,fy){return impAff(cs,fx,fy).map(c=>mkc(c.nodes,c.hole));}
function drnMove(cs,dx,dy){return drnAff(cs,x=>x+dx,y=>y+dy);}
function drnRect(x0,y0,x1,y1){return mkc([drnNd(x0,y0),drnNd(x1,y0),drnNd(x1,y1),drnNd(x0,y1)],false);}
function drnPoly(p){return mkc(p.map(q=>drnNd(q[0],q[1])),false);}
function drnEllipse(cx,cy,rx,ry){
  const K=DRN.K,N=[];
  for(let i=0;i<4;i++){const t=i*Math.PI/2,c=Math.cos(t),s=Math.sin(t),tx=-rx*s*K,ty=ry*c*K,x=cx+rx*c,y=cy+ry*s;
    N.push(drnNd(Math.round(x*1e6)/1e6,Math.round(y*1e6)/1e6,{x:x-tx,y:y-ty},{x:x+tx,y:y+ty}));}
  return mkc(N,false);}
/* сектор круга (a0<a1, радианы); при полном круге — эллипс */
function drnSector(cx,cy,r,a0,a1){
  const m=Math.max(1,Math.ceil((a1-a0)/(Math.PI/2)-1e-9)),d=(a1-a0)/m,t=4/3*Math.tan(d/4)*r,N=[drnNd(cx,cy)];
  for(let i=0;i<=m;i++){const th=a0+i*d,c=Math.cos(th),s=Math.sin(th),x=cx+r*c,y=cy+r*s,tx=-s*t,ty=c*t;
    N.push(drnNd(x,y,i>0?{x:x-tx,y:y-ty}:null,i<m?{x:x+tx,y:y+ty}:null));}
  return mkc(N,false);}
/* путь пера: узлы {x,y,a,b} -> контур (разомкнутый путь заливается по прямой между концами) */
function drnPenCs(nodes){if(nodes.length<3)return [];
  return [mkc(nodes.map(n=>({x:n.x,y:n.y,a:n.a?{x:n.a.x,y:n.a.y}:null,b:n.b?{x:n.b.x,y:n.b.y}:null})),false)];}
/* ---------- штрих -> заливка ---------- */
function drnRdp(P,eps){
  const keep=new Uint8Array(P.length);keep[0]=keep[P.length-1]=1;
  const st=[[0,P.length-1]];
  while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const A=P[a],B=P[b],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){const d=Math.abs((P[i][0]-A[0])*dy-(P[i][1]-A[1])*dx)/L;if(d>md){md=d;mi=i;}}
    if(md>eps&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b]);}}
  const o=[];for(let i=0;i<P.length;i++)if(keep[i])o.push(i);return o;}
function drnChaikin(P,W,n){
  for(let k=0;k<n;k++){const Q=[P[0]],V=[W[0]];
    for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];
      Q.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);
      V.push(.75*W[i]+.25*W[i+1],.25*W[i]+.75*W[i+1]);}
    Q.push(P[P.length-1]);V.push(W[W.length-1]);P=Q;W=V;}
  return [P,W];}
/* P — точки пути [[x,y]], Wd — диаметры в каждой точке; круглые концы; результат — упрощённые контуры */
function drnStroke(P,Wd){
  let pts=[],ws=[];
  for(let i=0;i<P.length;i++){const q=P[i];if(!pts.length||Math.hypot(q[0]-pts[pts.length-1][0],q[1]-pts[pts.length-1][1])>0.6){pts.push([q[0],q[1]]);ws.push(Math.max(2,Wd[i]));}}
  if(!pts.length)return [];
  if(pts.length===1)return [drnEllipse(pts[0][0],pts[0][1],ws[0]/2,ws[0]/2)];
  const minW=Math.min(...ws);
  const idx=drnRdp(pts,Math.max(1.5,minW*0.09));
  pts=idx.map(i=>pts[i]);ws=idx.map(i=>ws[i]);
  if(pts.length>2)[pts,ws]=drnChaikin(pts,ws,2);
  /* равномерная выборка: не более ~34 звеньев */
  let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
  const step=Math.max(minW*0.45,L/34),S=[pts[0]],SW=[ws[0]];let acc=0;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);let t=step-acc;
    while(t<=l){const u=t/l;S.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);SW.push(ws[i-1]+(ws[i]-ws[i-1])*u);t+=step;}
    acc=l-(t-step);}
  const e=pts[pts.length-1];if(Math.hypot(e[0]-S[S.length-1][0],e[1]-S[S.length-1][1])>step*0.3){S.push(e);SW.push(ws[ws.length-1]);}
  else{S[S.length-1]=e;}
  const cs=[];
  for(let i=0;i<S.length;i++){cs.push(drnEllipse(S[i][0],S[i][1],SW[i]/2,SW[i]/2));
    if(i<S.length-1){const a=S[i],b=S[i+1],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<0.5)continue;
      const nx=-dy/l,ny=dx/l,r1=SW[i]/2,r2=SW[i+1]/2;
      cs.push(drnPoly([[a[0]+nx*r1,a[1]+ny*r1],[b[0]+nx*r2,b[1]+ny*r2],[b[0]-nx*r2,b[1]-ny*r2],[a[0]-nx*r1,a[1]-ny*r1]]));}}
  let out;try{out=csgUnion(cs);}catch(e){out=cs;}
  try{const o2=impCleanup(out);if(o2.length)out=o2;}catch(e){}
  return out.map(c=>mkc(c.nodes,c.hole));}
/* ---------- вычисление знака из списка фигур ---------- */
function drnEval(items){
  let acc=[];
  for(const it of items){
    if(it.cl&&it.cl.h)continue;/* скрытый слой ячеек не входит в знак и шрифт */
    const cs=drnCp(it.cs||[]);if(!cs.length)continue;
    try{
      if(it.k==='sub'){if(!acc.length)continue;acc=csgUnion([...acc,...cs.map(c=>({hole:false,nodes:c.nodes,op:'sub'}))]);}
      else acc=csgUnion([...acc,...cs]);
    }catch(e){if(it.k!=='sub')acc=[...acc,...cs];}}
  return acc.map(c=>({hole:!!c.hole,nodes:c.nodes}));}
/* ---------- вспомогательное ---------- */
function drnHit(cs,x,y){let on=false;
  for(const c of cs){const P=flatC(c,10);if(P.length<3||!impInPoly(P,x,y))continue;if(c.hole)return false;on=true;}
  return on;}
function drnAreaAbs(c){return Math.abs(impArea(flatC(c,6)));}
function drnPathD(cs){let d='';const f=v=>Math.round(v*10)/10;
  for(const c of cs){const n=c.nodes;if(!n||n.length<2)continue;d+='M'+f(n[0].x)+' '+f(n[0].y);
    for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];
      if(a.b||b.a){const p1=a.b||a,p2=b.a||b;d+='C'+f(p1.x)+' '+f(p1.y)+' '+f(p2.x)+' '+f(p2.y)+' '+f(b.x)+' '+f(b.y);}else d+='L'+f(b.x)+' '+f(b.y);}
    d+='Z';}
  return d;}
/* ---------- метрики и измерения ---------- */
function drnZone(ch){
  const c=impCat(ch),R=DRN;
  switch(c.z){
    case 'cap':return {top:R.cap,bot:(c.below||'QЦЩДЏ'.includes(c.base))?null:0};
    case 'fig':return {top:R.cap,bot:0};
    case 'xh':return {top:R.xh,bot:c.below?null:0};
    case 'asc':return {top:R.asc,bot:c.below?null:0};
    case 'desc':return {top:null,bot:R.desc};
    case 'idot':return {top:null,bot:0};
    default:return null;}}
function drnWidthAt(cs,y){let s=0;for(const r of impRuns(cs,'h',y))s+=r[1]-r[0];return s;}
/* округлая ли вершина (узкий пик) / подошва: ширина у края против ширины чуть глубже */
function drnRoundEdge(cs,bb,top){
  const e=top?bb.y1:bb.y0,s=top?-1:1,a=drnWidthAt(cs,e+s*4),b=drnWidthAt(cs,e+s*40);
  return b>1&&a/b<0.6;}
function drnStemOf(cs,bb){
  bb=bb||impBBox(cs);if(!bb)return null;const H=bb.y1-bb.y0,v=[];
  for(const f of [0.28,0.36,0.64,0.72]){const R=impRuns(cs,'h',bb.y0+H*f);if(R.length){const m=Math.min(...R.map(q=>q[1]-q[0]));if(m>6)v.push(m);}}
  return v.length?Math.min(...v):null;}
/* глубина стороны (среднее расстояние края чернил от габарита / высота) */
function drnSideDepth(cs,bb,side){
  const H=bb.y1-bb.y0;let s=0,n=0;
  for(let i=0;i<14;i++){const y=bb.y0+H*(0.08+0.84*i/13),R=impRuns(cs,'h',y);if(!R.length)continue;
    const e=side<0?R[0][0]-bb.x0:bb.x1-R[R.length-1][1];s+=e;n++;}
  return n?s/n/H:0;}
/* оптические поля: прямые стороны — полное поле, круглые и диагональные — меньше */
function drnAutoSp(cs,stem){
  const bb=impBBox(cs);if(!bb)return null;
  const base=0.55*stem+8,f=d=>Math.max(0.5,Math.min(1,1-d*3.5));
  return {l:Math.max(14,Math.round(base*f(drnSideDepth(cs,bb,-1)))),r:Math.max(14,Math.round(base*f(drnSideDepth(cs,bb,1))))};}
/* вертикальная подгонка знака к линиям: y' = t0 + (y−y0)(t1−t0)/(y1−y0) */
function drnFitY(cs,y0,y1,t0,t1){
  if(!(y1>y0))return cs;const k=(t1-t0)/(y1-y0);
  return drnAff(cs,x=>x,y=>t0+(y-y0)*k);}
/* пары кириллица/латиница в одну сторону (исходная → копия) для набора нарисованных */
function drnTwinPairs(have){
  const out=[];for(const a in IMP_TWIN){const b=IMP_TWIN[a];if(have(a)&&!have(b))out.push([a,b]);}
  return out;}

/* ---------- минимальный TTF в памяти (для окна проверки): glyf/loca/cmap/hmtx + необходимые name, OS/2, post ---------- */
function drnBuildTTF(gl,family){
  const glyphs=[{uni:null,adv:500,cs:[]}].concat(gl.slice().sort((a,b)=>a.uni-b.uni)),ng=glyphs.length;
  const glyf=new BW(),loca=[],metrics=[];let gx0=1e9,gy0=1e9,gx1=-1e9,gy1=-1e9,maxP=0,maxC=0,adv=0;
  for(const g of glyphs){loca.push(glyf.len);
    const conts=g.cs.map(contourToTT).filter(c=>c.length>=3);let np=0;conts.forEach(c=>np+=c.length);
    let x0=0,y0=0,x1=0,y1=0;
    if(conts.length){x0=y0=1e9;x1=y1=-1e9;conts.forEach(c=>c.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}));
      gx0=Math.min(gx0,x0);gy0=Math.min(gy0,y0);gx1=Math.max(gx1,x1);gy1=Math.max(gy1,y1);maxP=Math.max(maxP,np);maxC=Math.max(maxC,conts.length);
      glyf.i16(conts.length).i16(x0).i16(y0).i16(x1).i16(y1);let e=-1;conts.forEach(c=>{e+=c.length;glyf.u16(e);});glyf.u16(0);
      const fl=[],xs=[],ys=[];let px=0,py=0;conts.forEach(c=>c.forEach(p=>{fl.push(p.on?1:0);xs.push(p.x-px);ys.push(p.y-py);px=p.x;py=p.y;}));
      fl.forEach(f=>glyf.u8(f));xs.forEach(v=>glyf.i16(v));ys.forEach(v=>glyf.i16(v));glyf.pad4();}
    metrics.push([g.adv,x0]);adv=Math.max(adv,g.adv);}
  loca.push(glyf.len);if(gx0>1e8){gx0=gy0=0;gx1=gy1=0;}
  const locaT=new BW();loca.forEach(v=>locaT.u32(v));
  const hmtx=new BW();metrics.forEach(m=>hmtx.u16(m[0]).i16(m[1]));
  const pairs=glyphs.map((g,i)=>[g.uni,i]).filter(p=>p[0]!=null&&p[0]<0xFFFF).sort((a,b)=>a[0]-b[0]);
  const segs=[];for(const [u,gi] of pairs){const l=segs[segs.length-1];if(l&&u===l.end+1&&gi-u===l.delta)l.end=u;else segs.push({start:u,end:u,delta:gi-u});}
  segs.push({start:0xFFFF,end:0xFFFF,delta:1});
  const sc=segs.length,pw=1<<Math.floor(Math.log2(sc)),sub=new BW();
  sub.u16(4).u16(16+sc*8).u16(0).u16(sc*2).u16(pw*2).u16(Math.floor(Math.log2(sc))).u16(sc*2-pw*2);
  segs.forEach(s=>sub.u16(s.end));sub.u16(0);segs.forEach(s=>sub.u16(s.start));segs.forEach(s=>sub.u16(((s.delta%65536)+65536)%65536));segs.forEach(()=>sub.u16(0));
  const cmap=new BW();cmap.u16(0).u16(1).u16(3).u16(1).u32(12).bytes(sub.b);
  const head=new BW(),now=Math.floor(Date.now()/1000)+2082844800,A=Math.ceil(Math.max(gy1,760))+20,Dn=-Math.ceil(Math.max(-gy0,210))-20;
  head.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5F0F3CF5).u16(0x000B).u16(1000).u32(0).u32(now).u32(0).u32(now).i16(gx0).i16(gy0).i16(gx1).i16(gy1).u16(0).u16(8).i16(2).i16(1).i16(0);
  const hhea=new BW();hhea.u32(0x00010000).i16(A).i16(Dn).i16(0).u16(adv).i16(0).i16(0).i16(gx1).i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(ng);
  const maxp=new BW();maxp.u32(0x00010000).u16(ng).u16(maxP).u16(maxC).u16(0).u16(0).u16(2);for(let q=0;q<8;q++)maxp.u16(0);
  const cps=pairs.map(p=>p[0]),os2=new BW();
  os2.u16(4).i16(Math.round(metrics.reduce((a,m)=>a+m[0],0)/ng)).u16(400).u16(5).u16(0).i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350).i16(50).i16(300).i16(0)
     .bytes([2,0,5,0,0,0,0,0,0,0]).u32(0x80000203).u32(2).u32(0).u32(0).tag('GTYP').u16(64|128).u16(Math.min(0xFFFF,cps[0]||32)).u16(Math.min(0xFFFF,cps[cps.length-1]||32))
     .i16(A).i16(Dn).i16(0).u16(A).u16(-Dn).u32(1).u32(0).i16(500).i16(700).u16(0).u16(32).u16(0);
  const nm=new BW(),strs={1:family,2:'Regular',3:family+';draw',4:family,5:'Version 1.000',6:family.replace(/[^A-Za-z0-9]/g,'')||'Draw'},ids=[1,2,3,4,5,6],recs=[],store=[];let off=0;
  ids.forEach(id=>{const u=utf16(strs[id]);recs.push([id,u.length,off]);store.push(...u);off+=u.length;});
  nm.u16(0).u16(ids.length).u16(6+ids.length*12);recs.forEach(r=>nm.u16(3).u16(1).u16(0x409).u16(r[0]).u16(r[1]).u16(r[2]));nm.bytes(store);
  const post=new BW();post.u32(0x00030000).u32(0).i16(-130).i16(70).u32(0).u32(0).u32(0).u32(0).u32(0);
  const tables={'OS/2':os2.b,'cmap':cmap.b,'glyf':glyf.b,'head':head.b,'hhea':hhea.b,'hmtx':hmtx.b,'loca':locaT.b,'maxp':maxp.b,'name':nm.b,'post':post.b};
  const tags=Object.keys(tables).sort(),nt=tags.length,sr=(1<<Math.floor(Math.log2(nt)))*16,out=new BW();
  out.u32(0x00010000).u16(nt).u16(sr).u16(Math.floor(Math.log2(nt))).u16(nt*16-sr);
  let pos=12+nt*16;const lay={};tags.forEach(t=>{lay[t]=pos;pos+=(tables[t].length+3)&~3;});
  tags.forEach(t=>out.tag(t).u32(checksum(tables[t])).u32(lay[t]).u32(tables[t].length));
  tags.forEach(t=>out.bytes(tables[t]).pad4());
  const adj=(0xB1B0AFBA-checksum(out.b))>>>0,hp=lay['head']+8;
  out.b[hp]=(adj>>>24)&255;out.b[hp+1]=(adj>>>16)&255;out.b[hp+2]=(adj>>>8)&255;out.b[hp+3]=adj&255;
  return {bytes:new Uint8Array(out.b),glyphCount:ng};}

/* ===== Полиграмма: семейства букв одной конструкции и заготовки ===== */
const DRN_FAMS=[
  {n:'Штамбы',c:'НИПЦШЩЏ'},{n:'Овалы',c:'ОСЭЮФ'},{n:'Полуовалы',c:'ВРЬЪЫБ'},{n:'Диагонали',c:'АЛДЯ'},{n:'Узлы',c:'КЖХ'},
  {n:'Штамбы',c:'нипцшщџ'},{n:'Овалы',c:'осэюф'},{n:'Полуовалы',c:'врьъыб'},{n:'Диагонали',c:'алдя'},{n:'Узлы',c:'кжх'},
  {n:'Штамбы',c:'HNU'},{n:'Овалы',c:'OCDQ'},{n:'Полуовалы',c:'PBR'},{n:'Диагонали',c:'VAW'},
  {n:'Штамбы',c:'hnu'},{n:'Овалы',c:'ocdq'},{n:'Полуовалы',c:'pbr'},{n:'Диагонали',c:'vaw'}];
/* что брать за исходное для заготовки: буква -> [источники по порядку, способ] */
const DRN_REC={'П':[['Н','И','Ш'],'top'],'п':[['н','и','ш'],'top'],
  'Ц':[['Ш','П','Н','И'],'tail'],'ц':[['ш','п','н','и'],'tail'],'Щ':[['Ш','П','Н'],'tail3'],'щ':[['ш','п','н'],'tail3'],
  'Ш':[['Н','П','И'],'three'],'ш':[['н','п','и'],'three'],'Э':[['С'],'ebar'],'э':[['с'],'ebar'],
  'Ь':[['Р'],'flip'],'Ъ':[['Ь'],'flag'],'ъ':[['ь'],'flag'],'Ы':[['Ь'],'yery'],'ы':[['ь'],'yery'],
  'Е':[['Н','Г','П'],'efig']};
function drnFamOf(ch){return DRN_FAMS.find(f=>f.c.includes(ch))||null;}
/* буквы, наложение которых показывает полиграмма: семья + исходные для заготовки */
function drnPolyMembers(ch){
  const f=drnFamOf(ch),out=[];
  if(f)for(const c of f.c)if(c!==ch)out.push(c);
  const r=DRN_REC[ch];if(r)for(const c of r[0])if(c!==ch&&!out.includes(c))out.push(c);
  return out;}
function drnDraftItem(cs,k){return {k:k||'add',t:'draft',cs:Array.isArray(cs)?cs:[cs]};}
/* измерения исходной буквы: штамбы на высоте 78% (потом 20%…), толщина перекладины в середине между штамбами */
function drnSrcInfo(cs){
  const bb=impBBox(cs);if(!bb)return null;const H=bb.y1-bb.y0;let R=[];
  for(const f of [0.78,0.2,0.66,0.34]){const r=impRuns(cs,'h',bb.y0+H*f).filter(q=>q[1]-q[0]>6);if(r.length>R.length)R=r;if(R.length>=3)break;}
  if(!R.length)return null;
  const w=impMed(R.map(q=>q[1]-q[0]));let tb=w*0.9;
  const xs=R.length>=2?(R[0][1]+R[1][0])/2:bb.x1-6,V=impRuns(cs,'v',xs).filter(q=>q[1]-q[0]>6);
  if(V.length){const t=V.map(q=>q[1]-q[0]);tb=Math.max(w*0.5,Math.min(w*1.4,Math.min(...t)));}
  return {bb,H,R,w,tb};}
/* get(ch) -> контуры нарисованной буквы или null. Результат: {items, from, label} */
function drnDraft(target,get){
  const rec=DRN_REC[target];if(!rec)return null;
  let src=null,cs=null;
  for(const c of rec[0]){const g=get(c);if(g&&g.length){src=c;cs=g;break;}}
  let flipped=false;
  if(!cs&&(rec[1]==='flag'||rec[1]==='yery')&&target===target.toUpperCase()){
    const p=get('Р');if(p&&p.length){const b=impBBox(p);cs=drnAff(p,x=>x,y=>b.y0+b.y1-y);src='Р';flipped=true;}}
  if(!cs)return null;
  const I=drnSrcInfo(cs);if(!I)return null;
  const {bb,H,R,w,tb}=I,x0=bb.x0,x1=bb.x1,y0=bb.y0,y1=bb.y1,it=[],rc=drnRect,A=a=>it.push(drnDraftItem(a));
  const m=rec[1];
  if(m==='top'){const L=R[0],Rt=R[R.length-1];A(rc(L[0],y0,L[1],y1));A(rc(Rt[0],y0,Rt[1],y1));A(rc(L[0],y1-tb,Rt[1],y1));}
  else if(m==='tail'||m==='tail3'){
    const L=R[0],Rt=R[R.length-1],ext=Math.min(w*0.55,Rt[1]-Rt[0]),W=(Rt[1]-L[0])*(R.length>=3&&m==='tail'?0.8:1),Rx=L[0]+W-ext,tail=Math.max(60,H*0.2);
    A(rc(L[0],y0,L[1],y1));A(rc(Rx-(Rt[1]-Rt[0]),y0,Rx,y1));
    if(m==='tail3'){const cx=(L[0]+Rx)/2,wm=R.length>=3?R[1][1]-R[1][0]:w;A(rc(cx-wm/2,y0,cx+wm/2,y1));}
    A(rc(L[0],y0,Rx,y0+tb));A(rc(Rx-(Rt[1]-Rt[0]),y0-tail,Rx+ext,y0+tb));}
  else if(m==='three'){const L=R[0],Rt=R[R.length-1],cx=(L[0]+Rt[1])/2;
    A(rc(L[0],y0,L[1],y1));A(rc(cx-w/2,y0,cx+w/2,y1));A(rc(Rt[0],y0,Rt[1],y1));A(rc(L[0],y0,Rt[1],y0+tb));}
  else if(m==='ebar'){
    const W=x1-x0,wid=drnStemOf(cs,bb)||w;
    A(drnAff(cs,x=>x0+x1-x,y=>y));A(rc(x0+W*0.4,(y0+y1)/2-wid*0.42,x1-wid*0.6,(y0+y1)/2+wid*0.42));}
  else if(m==='flip'){A(drnAff(cs,x=>x,y=>y0+y1-y));}
  else if(m==='flag'||m==='yery'){
    const L=R[0],sx=L[1],W=x1-x0;let mx,extra;
    if(m==='flag'){const d=1.2*w,s=Math.max(0.5,(W-d-w)/(W-w));mx=x=>x<=sx?x+d:sx+d+(x-sx)*s;extra=rc(x0,y1-w*0.9,x0+d+w,y1);}
    else{const g=0.75*w,s=Math.max(0.5,(W-2*w-g)/(W-w));mx=x=>x<=sx?x:sx+(x-sx)*s;extra=rc(x1-w,y0,x1,y1);}
    A(drnAff(cs,mx,y=>y));A(extra);}
  else if(m==='efig'){
    const L=R[0],W=x1-L[0],We=W*0.9;
    A(rc(L[0],y0,L[1],y1));A(rc(L[0],y1-tb,L[0]+We,y1));A(rc(L[0],(y0+y1)/2-tb*0.45,L[0]+We*0.82,(y0+y1)/2+tb*0.45));A(rc(L[0],y0,L[0]+We,y0+tb));}
  if(!it.length)return null;
  return {items:it,from:src,label:src+' → '+target,flipped};}

/* ===== Диакритика: знаки, якоря, составные знаки ===== */
/* [знак, название, id в «Свой шрифт», комбинируемый код, где крепится (t — сверху, b — снизу), винительный падеж] */
const DRN_MARKS=[['˘','Кратка','breve','̆','t','кратку'],['¨','Диэрезис','dier','̈','t','диэрезис'],['´','Акут','acute','́','t','акут'],
  ['`','Гравис','grave','̀','t','гравис'],['ˆ','Циркумфлекс','circ','̂','t','циркумфлекс'],['ˇ','Карон','caron','̌','t','карон'],
  ['¯','Макрон','macron','̄','t','макрон'],['˜','Тильда','tilde','̃','t','тильду'],['˚','Кружок','ring','̊','t','кружок'],
  ['¸','Седиль','ced','̧','b','седиль'],['˛','Огонёк','ogon','̨','b','огонёк'],['˙','Точка','dot','̇','t','точку']];
const DRN_COMB={};for(const m of DRN_MARKS)DRN_COMB[m[3]]=m[0];
const DRN_CLR=32,DRN_OVL=14,DRN_DOTTED='ijіј';
function drnMarkInfo(ch){return DRN_MARKS.find(m=>m[0]===ch)||null;}
/* таблица составных знаков: буква -> [основа, знак]. Основа и знак берутся из разложения Юникода */
function drnCompSpec(){
  if(drnCompSpec.m)return drnCompSpec.m;const m={};
  const cand='ЁёЙйЎўІіЇїЃѓЌќ'+(typeof EXTLAT==='string'?EXTLAT:'');
  for(const ch of cand){if(m[ch])continue;const d=ch.normalize('NFD');if(Array.from(d).length!==2)continue;
    const mk=DRN_COMB[d[1]];if(!mk||!/[A-Za-zЀ-ӿ]/.test(d[0])||'ďť'.includes(ch))continue;m[ch]=[d[0],mk];}
  return drnCompSpec.m=m;}
/* буква i/j без точки — основа для знаков сверху */
function drnDotless(cs,xh){return cs.filter(c=>{const b=impBBox([c]);return !(b&&b.y0>=(xh||DRN.xh)*0.9);});}
/* оптический центр: среднее между центром габарита и центром тяжести чернил у края */
function drnOptX(cs,bb,top){
  const H=bb.y1-bb.y0,cx=(bb.x0+bb.x1)/2;let sw=0,sm=0;
  for(let i=0;i<5;i++){const y=top?bb.y1-H*(0.03+0.05*i):bb.y0+H*(0.03+0.05*i);
    for(const r of impRuns(cs,'h',y)){const l=r[1]-r[0];sw+=l;sm+=l*(r[0]+r[1])/2;}}
  return sw>0?0.5*cx+0.5*sm/sw:cx;}
/* автоякоря: верхний (над буквой, с зазором) и нижний (на базовой линии, с нахлёстом) */
function drnAnch(cs,clr){
  const bb=impBBox(cs);if(!bb)return null;const c=clr==null?DRN_CLR:clr;
  return {top:{x:Math.round(drnOptX(cs,bb,true)),y:Math.round(bb.y1+c)},bot:{x:Math.round(drnOptX(cs,bb,false)),y:Math.round(bb.y0+DRN_OVL)}};}
/* знак крепится нижней (верхней) центральной точкой габарита к якорю */
function drnPlaceMark(mcs,pt,dir){
  const mb=impBBox(mcs);if(!mb)return mcs;const cx=(mb.x0+mb.x1)/2;
  return drnMove(mcs,pt.x-cx,dir==='b'?pt.y-mb.y1:pt.y-mb.y0);}
/* заготовки знаков: рисуются как обычные фигуры; кратка — с утолщёнными концами (ParaType) */
function drnMarkDraft(mark,w,cx,yb){
  w=w||70;cx=cx==null?250:cx;const E=drnEllipse,A=a=>({k:'add',t:'draft',cs:Array.isArray(a)?a:[a]}),out=[],h=130,s=110;
  switch(mark){
    case '˘':{const P=[],Wd=[];for(let i=0;i<=14;i++){const u=i/7-1;P.push([cx+u*s*1.05,yb+h*u*u]);Wd.push(w*(0.5+0.95*u*u));}out.push(A(drnStroke(P,Wd)));break;}
    case '¨':{const r=w*0.62;out.push(A(E(cx-s*0.55,yb+r,r,r)),A(E(cx+s*0.55,yb+r,r,r)));break;}
    case '˙':{const r=w*0.62;out.push(A(E(cx,yb+r,r,r)));break;}
    case '´':case '`':{const d=h*0.45,sg=mark==='´'?1:-1;out.push(A(drnPoly([[cx-sg*d/2,yb],[cx-sg*d/2+w*0.9,yb],[cx+sg*d/2+w*0.9,yb+h],[cx+sg*d/2,yb+h]])));break;}
    case 'ˆ':out.push(A(drnPoly([[cx-s*0.8,yb],[cx,yb+h],[cx+s*0.8,yb],[cx+s*0.8-w*1.1,yb],[cx,yb+h-w*1.45],[cx-s*0.8+w*1.1,yb]])));break;
    case 'ˇ':out.push(A(drnPoly([[cx-s*0.8,yb+h],[cx,yb],[cx+s*0.8,yb+h],[cx+s*0.8-w*1.1,yb+h],[cx,yb+w*1.45],[cx-s*0.8+w*1.1,yb+h]])));break;
    case '¯':out.push(A(drnRect(cx-s,yb+h*0.3,cx+s,yb+h*0.3+w*0.85)));break;
    case '˜':{const P=[],Wd=[];for(let i=0;i<=16;i++){const u=i/16;P.push([cx-s+2*s*u,yb+h*0.45+Math.sin(u*Math.PI*2)*h*0.28]);Wd.push(w*0.8);}out.push(A(drnStroke(P,Wd)));break;}
    case '˚':{const r=h*0.5;out.push(A(E(cx,yb+r,r,r)),{k:'sub',t:'draft',cs:[E(cx,yb+r,r-w*0.7,r-w*0.7)]});break;}
    case '¸':{const P=[[cx,yb],[cx,yb-35],[cx+30,yb-60],[cx+34,yb-95],[cx,yb-120],[cx-30,yb-112]];out.push(A(drnStroke(P,P.map(()=>w*0.7))));break;}
    case '˛':{const P=[[cx+30,yb],[cx+12,yb-38],[cx-10,yb-75],[cx+10,yb-110],[cx+48,yb-100]];out.push(A(drnStroke(P,P.map(()=>w*0.7))));break;}
    default:return null;}
  return out;}

/* ===== TTF: проверка наличия контуров у букв составных знаков делается в тестах ===== */

/* ===== Сетка ячеек (инструмент «Ячейки»): ячейки -> слитые чернила =====
   Состояние — данные: настройки сетки g и списки закрашенных ячеек (плоские пары [i,j,i,j…], j от базовой линии вверх, ниже базы — отрицательные).
   Чернила собираются заново из состояния: фигуры ячеек + прямые мостики полной ширины между соседями по сторонам -> растр -> закрытие (радиус r:
   вогнутые углы получают скругление) -> трассировка и подгонка Безье тем же csgTrace/csgFit, что и csgUnionRaster. Без DOM. */
const DRC={
  SH:[['circle','Круг'],['square','Квадрат'],['diamond','Ромб'],['tri','Треугольник'],['pent','Пятиугольник'],['hex','Шестиугольник'],['oct','Восьмиугольник']],
  SPEC:{circle:{n:0,R:0.5,ph:0},square:{n:4,R:0.70711,ph:Math.PI/4},diamond:{n:4,R:0.5,ph:0},tri:{n:3,R:0.56,ph:Math.PI/2},
    pent:{n:5,R:0.52,ph:Math.PI/2},hex:{n:6,R:0.5,ph:0},oct:{n:8,R:0.5412,ph:Math.PI/8}},
  NA:96,MAXPX:1.6e6,
  DEF:{a:'circle',b:'circle',t:0,rot:0,cols:10,rows:10,desc:0,size:1,rnd:40,sub:0,sa:'circle',sb:'circle',st:0,srot:0,sl:1,act:'main'}};
const DRC_KEYS=Object.keys(DRC.DEF);
function drcNorm(g){
  const d=DRC.DEF,o={},nm=(v,a,b,df)=>{v=Math.round(+v);return isFinite(v)?Math.max(a,Math.min(b,v)):df;},ks=k=>DRC.SPEC[k]?k:null;
  g=g||{};
  o.a=ks(g.a)||d.a;o.b=ks(g.b)||o.a;o.t=nm(g.t,0,100,0);o.rot=((nm(g.rot,0,720,0)%360)+360)%360;
  o.cols=nm(g.cols,3,24,d.cols);o.rows=nm(g.rows,3,24,d.rows);o.desc=nm(g.desc,0,4,0);o.size=nm(g.size,1,7,1);o.rnd=nm(g.rnd,0,100,d.rnd);
  o.sub=g.sub?1:0;o.sa=ks(g.sa)||d.sa;o.sb=ks(g.sb)||o.sa;o.st=nm(g.st,0,100,0);o.srot=((nm(g.srot,0,720,0)%360)+360)%360;
  o.sl=g.sl===0||g.sl===false?0:1;o.act=g.act==='sub'?'sub':'main';
  return o;}
/* радиус контура формы по направлению th (ячейка = 1, центр в нуле) */
function drcRad(kind,th){
  const s=DRC.SPEC[kind];if(!s.n)return s.R;
  const w=2*Math.PI/s.n;let u=((th-s.ph)%w+w)%w-w/2;return s.R*Math.cos(Math.PI/s.n)/Math.cos(u);}
/* форма ячейки: переход a->b (t 0..100), поворот rot° -> многоугольник [[x,y]] (ячейка = 1). Вершины обеих фигур входят в набор углов */
function drcShape(a,b,t,rot){
  const key=a+'|'+b+'|'+t+'|'+rot,C=drcShape.c||(drcShape.c=new Map()),h=C.get(key);if(h)return h;
  const r=rot*Math.PI/180,A=[],T=Math.PI*2,tt=t/100;
  for(let i=0;i<DRC.NA;i++)A.push(i*T/DRC.NA);
  for(const k of [a,b]){const s=DRC.SPEC[k];if(s.n)for(let i=0;i<s.n;i++)A.push(((s.ph+r+i*T/s.n)%T+T)%T);}
  A.sort((p,q)=>p-q);const L=[];for(const v of A)if(!L.length||v-L[L.length-1]>1e-6)L.push(v);
  const P=L.map(th=>{const q=th-r,rho=(1-tt)*drcRad(a,q)+tt*drcRad(b,q);return [Math.cos(th)*rho,Math.sin(th)*rho];});
  if(C.size>200)C.clear();C.set(key,P);return P;}
/* многоугольники слоя в мировых координатах: фигуры закрашенных ячеек и мостики между соседями по сторонам */
function drcPolys(cells,c,shape,rnd){
  const out=[],n=cells.length>>1;if(!n)return out;
  const S=drcSet(cells);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const p of shape){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1];}
  /* мостик = опорная ширина формы поперёк направления (ломаные края без зубцов); при скруглении 0 — не шире ячейки: видна фактура формы */
  if(!rnd){x0=Math.max(x0,-.5);x1=Math.min(x1,.5);y0=Math.max(y0,-.5);y1=Math.min(y1,.5);}
  for(let q=0;q<n;q++){const i=cells[2*q],j=cells[2*q+1],cx=(i+.5)*c,cy=(j+.5)*c;
    out.push(shape.map(p=>[cx+p[0]*c,cy+p[1]*c]));
    if(S.has(drcKey(i+1,j)))out.push([[cx,cy+y0*c],[cx+c,cy+y0*c],[cx+c,cy+y1*c],[cx,cy+y1*c]]);
    if(S.has(drcKey(i,j+1)))out.push([[cx+x0*c,cy],[cx+x1*c,cy],[cx+x1*c,cy+c],[cx+x0*c,cy+c]]);}
  return out;}
/* все многоугольники сетки: главная (ячейка c) и подсетка (ячейка c/2) */
function drcAllPolys(g,cells,sc){
  const c=700/g.rows,P=drcPolys(cells,c,drcShape(g.a,g.b,g.t,g.rot),g.rnd);
  if(g.sub&&sc&&sc.length)for(const p of drcPolys(sc,c/2,g.sl?drcShape(g.a,g.b,g.t,g.rot):drcShape(g.sa,g.sb,g.st,g.srot),g.rnd))P.push(p);
  return P;}
function drcRaster(polys,pad,rs,box){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  if(box){x0=box[0];y0=box[1];x1=box[2];y1=box[3];}
  else for(const P of polys)for(const q of P){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}
  if(!(x1>x0))return null;
  rs=Math.max(rs,Math.ceil(Math.sqrt((x1-x0+2*pad)*(y1-y0+2*pad)/DRC.MAXPX)));
  const ox=Math.floor((x0-pad)/rs)*rs,oy=Math.floor((y0-pad)/rs)*rs,W=Math.ceil((x1+pad-ox)/rs)+1,H=Math.ceil((y1+pad-oy)/rs)+1,m=new Uint8Array(W*H);
  const Q=polys.map(P=>{const R=P.map(q=>[(q[0]-ox)/rs,(q[1]-oy)/rs]);let a=0;for(let i=0;i<R.length;i++){const p=R[i],r=R[(i+1)%R.length];a+=p[0]*r[1]-r[0]*p[1];}
    return a<0?R.reverse():R;});
  csgMask(Q,0,0,W,H,m,1);
  return {m,W,H,ox,oy,rs};}
/* квадраты расстояний до ближайшего пикселя со значением on (Фельценшвальб) */
function drcEdt(m,W,H,on){
  const N=W*H,g=new Float32Array(N),n=Math.max(W,H),f=new Float64Array(n),d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);
  for(let i=0;i<N;i++)g[i]=m[i]===on?0:1e12;
  const one=len=>{let k=0;v[0]=0;z[0]=-1e20;z[1]=1e20;
    for(let q=1;q<len;q++){let s;for(;;){const p=v[k];s=((f[q]+q*q)-(f[p]+p*p))/(2*q-2*p);if(s<=z[k]){k--;continue;}break;}k++;v[k]=q;z[k]=s;z[k+1]=1e20;}
    k=0;for(let q=0;q<len;q++){while(z[k+1]<q)k++;const p=v[k];d[q]=(q-p)*(q-p)+f[p];}};
  for(let x=0;x<W;x++){for(let y=0;y<H;y++)f[y]=g[y*W+x];one(H);for(let y=0;y<H;y++)g[y*W+x]=d[y];}
  for(let y=0;y<H;y++){const o=y*W;for(let x=0;x<W;x++)f[x]=g[o+x];one(W);for(let x=0;x<W;x++)g[o+x]=d[x];}
  return g;}
/* закрытие радиусом rr (в пикселях): заполняет вогнутые углы дугой, выпуклые не трогает */
function drcClose(R,rr){
  if(rr<0.75)return R.m;
  const {m,W,H}=R,N=W*H,r2=rr*rr+0.25,d1=drcEdt(m,W,H,1),dil=new Uint8Array(N);
  for(let i=0;i<N;i++)dil[i]=d1[i]<=r2?1:0;
  const d2=drcEdt(dil,W,H,0),out=new Uint8Array(N);
  for(let i=0;i<N;i++)out[i]=(d2[i]>r2||m[i])?1:0;
  return out;}
/* знаковое расстояние закрытой маски в пикселях (внутри < 0) — для анимации перехода */
function drcSdf(m,W,H){
  const N=W*H,dI=drcEdt(m,W,H,1),dO=drcEdt(m,W,H,0),s=new Float32Array(N);
  for(let i=0;i<N;i++)s[i]=m[i]?-(Math.sqrt(dO[i])-0.5):(Math.sqrt(dI[i])-0.5);
  return s;}
/* ink(g,cells,sc,opt): opt.rs — шаг растра (1 — точный, 3 — черновой), opt.poly — ломаные без подгонки; opt.raw — вернуть {R,m} для анимации */
function drcInk(g,cells,sc,opt){
  opt=opt||{};g=drcNorm(g);
  const polys=drcAllPolys(g,cells,sc);if(!polys.length)return opt.raw?null:[];
  const c=700/g.rows,r=g.rnd/100*c*0.5,rs0=opt.rs||1,R=drcRaster(polys,r+4,rs0,opt.box);if(!R)return opt.raw?null:[];
  const m=drcClose(R,r/R.rs);
  if(opt.raw)return {R,m};
  return drcTrace(R,m,opt.poly,c);}
function drcTrace(R,m,poly,c){
  const {W,H,ox,oy,rs}=R,loops=csgTrace(m,W,H),out=[],minA=Math.pow(Math.max(2,c*0.1)/rs,2);
  for(const L of loops){let ar=0;for(let i=0;i<L.length;i++){const a=L[i],b=L[(i+1)%L.length];ar+=a[0]*b[1]-b[0]*a[1];}
    if(Math.abs(ar)/2<minA)continue;/* крупинки и щели меньше десятой доли ячейки — не чернила */
    if(poly){out.push({hole:ar<0,pts:csgRDP(L.map(q=>[ox+q[0]*rs,oy+q[1]*rs]),0.6*rs)});continue;}
    const nodes=csgFit(L,0,0);if(!nodes)continue;
    for(let it=0;it<3;it++){for(let q=0;q<nodes.length&&nodes.length>3;q++){const A=nodes[q],B=nodes[(q+1)%nodes.length];
      if(A.b||B.a)continue;const l=Math.hypot(B.x-A.x,B.y-A.y);if(l<4){A.x=(A.x+B.x)/2;A.y=(A.y+B.y)/2;A.b=B.b;nodes.splice((q+1)%nodes.length,1);q--;}}}
    const T=p=>p&&{x:ox+p.x*rs,y:oy+p.y*rs};
    const nn=nodes.map(n=>({x:Math.round((ox+n.x*rs)*10)/10,y:Math.round((oy+n.y*rs)*10)/10,a:T(n.a),b:T(n.b)}));
    out.push(mkc(nn,ar<0));}
  return out;}
/* ячейки (i,j) -> ключ, поиск и правка списка; ячейки хранятся плоским массивом пар */
const drcKey=(i,j)=>(j+300)*1024+(i+300);
function drcSet(cells){const S=new Set();for(let q=0;q<cells.length;q+=2)S.add(drcKey(cells[q],cells[q+1]));return S;}
function drcFromSet(S){const o=[];for(const k of S){o.push((k%1024)-300,Math.floor(k/1024)-300);}return o;}
/* ячейки вдоль отрезка a->b (индексы ячеек, алгоритм Брезенхэма): быстрая протяжка не оставляет щелей */
function drcLine(a,b){
  let [x,y]=a;const [x1,y1]=b,dx=Math.abs(x1-x),dy=-Math.abs(y1-y),sx=x<x1?1:-1,sy=y<y1?1:-1;let e=dx+dy;const o=[];
  for(let k=0;k<4096;k++){o.push([x,y]);if(x===x1&&y===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x+=sx;}if(e2<=dx){e+=dx;y+=sy;}}
  return o;}
/* границы допустимых ячеек: i 0..cols-1 (подсетка 0..2cols-1), j -desc..rows-1 */
function drcInBox(g,i,j,sub){const k=sub?2:1;return i>=0&&i<g.cols*k&&j>=-g.desc*k&&j<g.rows*k;}
function drcCount(it){return it&&it.cl?(it.cl.c.length+(it.cl.s?it.cl.s.length:0))>>1:0;}
/* случайный вид сетки (без размеров и ячеек) */
function drcRandom(g){
  const P=DRC.SH.map(s=>s[0]),pick=()=>P[Math.floor(Math.random()*P.length)],o=Object.assign({},g),a=pick();
  o.a=a;o.b=Math.random()<0.5?a:pick();o.t=o.a===o.b?0:Math.round(Math.random()*100);
  o.rot=[0,0,15,30,45,60,90,120][Math.floor(Math.random()*8)];o.rnd=Math.round(20+Math.random()*60);
  return drcNorm(o);}

/* ===== Stage 5B: оптические интервалы и автокернинг нарисованного шрифта (без DOM, детерминированно) =====
   Интервалы: по строкам внутри зоны знака (прописные 0..cap, строчные 0..xh) считается «белое» от габарита до края краски,
   глубина каждой строки ограничена (рога и просветы не раздувают поле). Сторона относится к классу: прямая (s), круглая (r),
   диагональная (d), открытая (o); поле = опорное поле прямой стороны − λ·средняя глубина, λ у классов один и тот же закон
   (круглая 1, диагональная 0.8, открытая 0.7 от λ круглой). Опора — «н»/«о» (или «n»/«o»), если они нарисованы:
   ствол «н» задаёт поле прямой стороны, «о» калибрует λ так, чтобы поле круглой стороны было 74–90 % от прямой.
   Кернинг: классы KC_L/KC_R и пары KERN_TABLE_BASE; значение класса = медиана по нарисованным парам: сила × (эталон HH/nn − средний зазор),
   предел −150…+60, зазор не меньше G0. Результат — таблица значений классов {'L|R':v} (формат st.kc редактора). */
function drnScan(cs,ys){
  const polys=cs.map(c=>flatC(c,10)),out=[];
  for(const y of ys){const xs=[];
    for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];
      if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);const r=[];let w=0,st=0;
    for(const [v,d] of xs){const was=w;w+=d;if(was===0&&w!==0)st=v;else if(was!==0&&w===0)r.push([st,v]);}
    out.push(r);}
  return out;}
/* вертикальная зона оптической площади знака */
function drnOptBand(ch,bb){
  const z=impCat(ch).z;let lo=bb.y0,hi=bb.y1;
  if(z==='cap'||z==='fig'){lo=Math.max(bb.y0,0);hi=Math.min(bb.y1,DRN.cap);}
  else if(z==='xh'||z==='asc'||z==='desc'||z==='idot'){lo=Math.max(bb.y0,0);hi=Math.min(bb.y1,DRN.xh);}
  if(!(hi-lo>=40)){lo=bb.y0;hi=bb.y1;}
  return [lo,hi];}
/* глубины краёв по строкам снизу вверх */
function drnOptDepth(ch,cs){
  const bb=impBBox(cs);if(!bb||!(bb.x1-bb.x0>0)||!(bb.y1-bb.y0>0))return null;
  const [lo,hi]=drnOptBand(ch,bb),H=hi-lo,W=bb.x1-bb.x0,N=36,Dm=Math.min(0.25*H,0.45*W),ys=[];
  for(let i=0;i<N;i++)ys.push(lo+H*(i+0.5)/N);
  const R=drnScan(cs,ys),dL=[],dR=[];
  for(const r of R){if(!r.length){dL.push(Dm);dR.push(Dm);continue;}
    dL.push(Math.min(Dm,Math.max(0,r[0][0]-bb.x0)));dR.push(Math.min(Dm,Math.max(0,bb.x1-r[r.length-1][1])));}
  return {dL,dR,H,W,bb};}
/* класс стороны: s прямая, r круглая, d диагональная, o открытая */
function drnSideClass(d,H){
  const N=d.length,t=Math.floor(N/3),avg=(a,b)=>{let s=0;for(let i=a;i<b;i++)s+=d[i];return s/Math.max(1,b-a);};
  const lo=avg(0,t),mid=avg(t,N-t),hi=avg(N-t,N),m=avg(0,N);
  if(m<=0.03*H)return 's';
  const mx=Math.max(lo,hi,1e-6),mono=Math.abs(hi-lo)>0.5*mx,ends=(lo+hi)/2;
  if(!mono&&mid<0.65*ends)return 'r';
  if(mono)return 'd';
  return 'o';}
const DRN_LAM={s:1,r:1,d:0.8,o:0.7};
const drnMean=a=>{let s=0;for(const v of a)s+=v;return a.length?s/a.length:0;};
/* G: {ch:cs} нарисованные знаки (без комбинируемых). Возвращает {sp:{ch:{l,r,cl:'xy'}}, ref:{stem,sbS,lam,calib}} */
function drnOptSp(G,stemFallback){
  const chars=Object.keys(G).filter(ch=>!IMP_ISMARK(ch)&&G[ch]&&G[ch].length).sort(),prof={};
  for(const ch of chars){const p=drnOptDepth(ch,G[ch]);if(p)prof[ch]=p;}
  const refStem=(()=>{for(const ch of ['н','n','Н','H']){if(prof[ch]){const s=drnStemOf(G[ch],prof[ch].bb);if(s)return s;}}
    const v=[];for(const ch of chars){if(!DRN.STEMOK.includes(ch)||!prof[ch])continue;const s=drnStemOf(G[ch],prof[ch].bb);if(s)v.push(s);}
    return v.length?impMed(v):(stemFallback||80);})();
  const sbS=Math.max(20,Math.min(140,0.55*refStem+8));
  let lam=0.42,calib=false;
  for(const ch of ['о','o','О','O']){const p=prof[ch];if(!p)continue;
    const dm=(drnMean(p.dL)+drnMean(p.dR))/2;
    if(dm>5&&drnSideClass(p.dL,p.H)==='r'){const ratio=(sbS-lam*dm)/sbS;
      if(ratio<0.74){lam=(1-0.74)*sbS/dm;calib=true;}else if(ratio>0.9){lam=(1-0.9)*sbS/dm;calib=true;}
      break;}}
  const mn=Math.max(10,Math.round(0.2*sbS)),mx=Math.round(1.25*sbS),sp={};
  for(const ch of chars){const p=prof[ch];if(!p)continue;
    const cl=[drnSideClass(p.dL,p.H),drnSideClass(p.dR,p.H)],side=(d,c)=>Math.max(mn,Math.min(mx,Math.round(sbS-lam*DRN_LAM[c]*drnMean(d))));
    let l=side(p.dL,cl[0]),r=side(p.dR,cl[1]);
    if(Math.abs(l-r)<=3&&cl[0]===cl[1]){const a=Math.round((l+r)/2);l=r=a;}
    sp[ch]={l,r,cl:cl[0]+cl[1]};}
  return {sp,ref:{stem:Math.round(refStem),sbS:Math.round(sbS),lam:Math.round(lam*1000)/1000,calib}};}
/* автокернинг: G: {ch:{cs,l,r}}; strength 0..150 (%); возвращает {vals:{'L|R':v}, n, tU, tL, pair(a,b)} */
function drnKernAuto(G,strength,stemv){
  const F=Math.max(0,Math.min(150,+strength||0))/100,PR={};
  const prof=ch=>{if(PR[ch]!==undefined)return PR[ch];const g=G[ch];if(!g||!g.cs||!g.cs.length)return PR[ch]=null;
    const bb=impBBox(g.cs);if(!bb)return PR[ch]=null;const dx=g.l-bb.x0,cs=drnAff(g.cs,x=>x+dx,y=>y);
    return PR[ch]=kernProfile(cs,g.l+(bb.x1-bb.x0)+g.r);};
  const href=prof('Н')||prof('H'),nref=prof('н')||prof('n');
  const out={vals:{},n:0,tU:0,tL:0,F};
  if(!href&&!nref){out.pair=()=>0;return out;}
  const tU=href?(kernGap(href,href,1e4)||{avg:0}).avg:(kernGap(nref,nref,1e4)||{avg:0}).avg,tL=nref?(kernGap(nref,nref,1e4)||{avg:tU}).avg:tU;
  out.tU=tU;out.tL=tL;
  const low=ch=>/\p{Ll}/u.test(ch),sv=Math.max(stemv||80,20);
  const meas=(a,b,f)=>{const pa=prof(a),pb=prof(b);if(!pa||!pb)return null;const t=(low(a)||low(b))?tL:tU;if(!(t>0))return null;
    const D=t+sv*0.9,G0=Math.max(Math.min(t*0.4,60),12),g=kernGap(pa,pb,D);if(!g)return null;
    let k=f*F*(t-g.avg);k=Math.max(k,-150);k=Math.min(k,t*0.6,60);k=Math.max(k,G0-g.min);return Math.round(k);};
  const lcOf={},rcOf={};
  for(const row of KERN_TABLE_BASE){const l=row[0],r=row[1],f0=row[2]==null?0.6:row[2];
    const A=Array.from(KC_L[l]||'').filter(ch=>prof(ch)),B=Array.from(KC_R[r]||'').filter(ch=>prof(ch));
    if(!A.length||!B.length)continue;
    const ks=[];for(const a of A)for(const b of B){const k=meas(a,b,f0);if(k!=null)ks.push(k);}
    if(!ks.length)continue;ks.sort((x,y)=>x-y);
    let v=ks[Math.floor(ks.length/2)];v=Math.round(v/2)*2;if(Math.abs(v)<6)continue;
    out.vals[l+'|'+r]=Math.max(-150,Math.min(60,v));out.n++;
    for(const a of A)lcOf[a]=l;for(const b of B)rcOf[b]=r;}
  /* значение пары для предпросмотра: класс + защита от столкновения (как в экспорте) */
  out.pair=(a,b)=>{const l=lcOf[a],r=rcOf[b];if(!l||!r)return 0;let v=out.vals[l+'|'+r];if(!v)return 0;
    const pa=prof(a),pb=prof(b);if(pa&&pb){const t=(low(a)||low(b))?tL:tU,G0=Math.max(Math.min(t*0.4,60),12),g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil((G0-g.min)/2)*2);}
    return Math.min(0,v)||Math.max(0,v);};
  return out;}
