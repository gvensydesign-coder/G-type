/* ===== «Применить к похожим» для правок точек (S.edits[знак] с ключами 'контур:узел' и S.edits[знак].sk) =====
   Узел-источник описывается структурой знака, а не координатами: роль контура (дыра / вычитание / число узлов / кривизна),
   размер и положение контура в знаке, положение узла внутри контура (u,v), касательные, плавный/угловой.
   В целевом знаке ищется узел с наименьшей «ценой» соответствия; ниже порога — соответствия нет и узел пропускается.
   Сдвиги переводятся в единицы зоны: по X — по отношению размеров контура (стебель остаётся стеблем, арка — аркой),
   по Y — по отношению высот знаков. Скелетные шрифты: те же правила для узлов скелета (S.edits[знак].sk). Чистые функции. */
const SIM={TN:1.05,TC:1.9,TS:1.0};
const simAng=(x,y)=>Math.atan2(y,x);
const simLn=a=>{a=((a%Math.PI)+Math.PI)%Math.PI;return a;};
const simAD=(a,b)=>{let d=Math.abs(simLn(a)-simLn(b));if(d>Math.PI/2)d=Math.PI-d;return d;};/* 0…π/2, прямые без направления */
function simTan(ns,i,closed){
  const n=ns.length,A=ns[i],P=ns[(i-1+n)%n],N=ns[(i+1)%n];
  const hasP=closed||i>0,hasN=closed||i<n-1;
  const o=hasN?(A.b&&(Math.abs(A.b.x-A.x)+Math.abs(A.b.y-A.y)>0.5)?[A.b.x-A.x,A.b.y-A.y]:(N.a&&(Math.abs(N.a.x-A.x)+Math.abs(N.a.y-A.y)>0.5)&&!A.b?[N.a.x-A.x,N.a.y-A.y]:[N.x-A.x,N.y-A.y])):null;
  const q=hasP?(A.a&&(Math.abs(A.a.x-A.x)+Math.abs(A.a.y-A.y)>0.5)?[A.x-A.a.x,A.y-A.a.y]:(P.b&&(Math.abs(P.b.x-A.x)+Math.abs(P.b.y-A.y)>0.5)&&!A.a?[A.x-P.b.x,A.y-P.b.y]:[A.x-P.x,A.y-P.y])):null;
  return {o:o&&(o[0]||o[1])?simAng(o[0],o[1]):null,i:q&&(q[0]||q[1])?simAng(q[0],q[1]):null};}
function simTD(a,b){/* угол между наборами касательных, 0…1 */
  const L=(x,y)=>x==null||y==null?null:simAD(x,y);
  const pair=(a1,a2,b1,b2)=>{const d=[L(a1,b1),L(a2,b2)].filter(v=>v!=null);return d.length?d.reduce((s,v)=>s+v,0)/d.length/(Math.PI/2):0.5;};
  return Math.min(pair(a.i,a.o,b.i,b.o),pair(a.i,a.o,b.o,b.i));}
function simBox(P){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const q of P){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}return {x0,y0,x1,y1,w:Math.max(x1-x0,1),h:Math.max(y1-y0,1)};}
/* ---- контуры построения ---- */
function simDescC(B){
  return B.cs.map((c,ci)=>{const bb=simBox(flatC(c,6)),ns=c.nodes;let cur=0;
    const nd=ns.map((n,i)=>{const t=simTan(ns,i,true),curved=!!((n.a&&Math.hypot(n.a.x-n.x,n.a.y-n.y)>0.5)||(n.b&&Math.hypot(n.b.x-n.x,n.b.y-n.y)>0.5));if(curved)cur++;
      const smooth=curved&&n.a&&n.b&&simAD(simAng(n.x-n.a.x,n.y-n.a.y),simAng(n.b.x-n.x,n.b.y-n.y))<0.12;
      return {x:n.x,y:n.y,u:(n.x-bb.x0)/bb.w,v:(n.y-bb.y0)/bb.h,gx:n.x/B.w,gy:n.y/B.h,t,curved,smooth,hasA:!!n.a,hasB:!!n.b};});
    return {ci,hole:!!c.hole,op:c.op||'',n:ns.length,bb,cx:(bb.x0+bb.x1)/2/B.w,cy:(bb.y0+bb.y1)/2/B.h,cf:cur/ns.length,nd};});}
const simRel=(a,b)=>Math.abs(Math.log(Math.max(a,1)/Math.max(b,1)));
function simCostC(s,t,Bs,Bt){
  let c=0;if(s.hole!==t.hole)c+=9;if(s.op!==t.op)c+=1.5;
  const dw=Math.min(simRel(s.bb.w,t.bb.w),simRel(s.bb.w/Bs.w,t.bb.w/Bt.w)),dh=Math.min(simRel(s.bb.h,t.bb.h),simRel(s.bb.h/Bs.h,t.bb.h/Bt.h));
  c+=1.2*(Math.min(dw,1.5)+Math.min(dh,1.5));
  c+=1.6*Math.abs(s.cy-t.cy)+0.5*Math.abs(s.cx-t.cx);
  c+=0.06*Math.min(Math.abs(s.n-t.n),6)+0.6*Math.abs(s.cf-t.cf);
  return c;}
function simCostN(s,t){
  let c=2.0*Math.hypot(s.u-t.u,s.v-t.v)+0.5*Math.abs(s.gx-t.gx)+1.0*Math.abs(s.gy-t.gy);
  c+=1.2*simTD(s.t,t.t);if(s.smooth!==t.smooth)c+=0.2;if(s.curved!==t.curved)c+=0.3;
  return c;}
/* ---- скелет ---- */
function simDescSk(r){/* r={w,h,skel} */
  const out=[];r.skel.forEach((st,si)=>{
    if(st.dot){out.push({si,ni:0,x:st.x,y:st.y,gx:st.x/r.w,gy:st.y/r.h,t:{o:null,i:null},end:0,closed:false,dot:true,smooth:true,n:1});return;}
    const ns=st.nodes,bb=simBox(ns.map(n=>[n.x,n.y]));
    ns.forEach((n,ni)=>{out.push({si,ni,x:n.x,y:n.y,gx:n.x/r.w,gy:n.y/r.h,u:(n.x-bb.x0)/bb.w,v:(n.y-bb.y0)/bb.h,t:simTan(ns,ni,!!st.closed),
      end:!st.closed&&ni===0?-1:(!st.closed&&ni===ns.length-1?1:0),closed:!!st.closed,dot:false,smooth:n.type!=='corner',n:ns.length});});});
  return out;}
function simCostS(s,t){
  let c=3.0*Math.hypot(s.gx-t.gx,s.gy-t.gy)+1.2*simTD(s.t,t.t);
  if(s.dot!==t.dot)c+=3;if(s.closed!==t.closed)c+=0.5;if(s.end!==t.end)c+=0.45;if(s.smooth!==t.smooth)c+=0.1;
  c+=0.04*Math.min(Math.abs(s.n-t.n),6);
  return c;}
const simCl=(v,L)=>Math.max(-L,Math.min(L,v));
const simR=(r,lo,hi)=>Math.max(lo,Math.min(hi,r));
/* ---- главный вызов ----
   srcCh/tgtCh — знаки; p — параметры стиля; edS/edT — правки источника/цели (до применения); sel — только эти ключи (или null).
   Возвращает {kind:'outline'|'skel', set:{ключ:запись}, matched, total, partial, miss} или {none:true,why}. */
function simTransfer(srcCh,tgtCh,p,edS,edT,sel){
  const f=FONTS[CUR_FONT],isSk=!!(f&&typeof f.pen==='function'&&GL[srcCh]&&typeof GL[srcCh].skel==='function'&&GL[tgtCh]&&typeof GL[tgtCh].skel==='function');
  p=safeP(p);
  if(isSk)return simTransferSk(srcCh,tgtCh,p,edS,edT,sel);
  const keys=Object.keys(edS||{}).filter(k=>/^\d+:\d+$/.test(k)&&(!sel||sel.includes(k)));
  if(!keys.length)return {none:true,why:'нет правок точек'};
  const Bs=buildBase(srcCh,p,edS),Bt=buildBase(tgtCh,p,edT);if(!Bs||!Bt)return {none:true,why:'нет знака'};
  if(Math.abs(Math.log(Bt.w/Bs.w))>0.8||Math.abs(Math.log(Bt.h/Bs.h))>0.45)return {none:true,why:'нет соответствия'};
  const Ds=simDescC(Bs),Dt=simDescC(Bt),set={};let matched=0,miss=0;
  const rY=simR(Bt.h/Bs.h,0.6,1.7);
  for(const k of keys){
    const [ci,ni]=k.split(':').map(Number),sc=Ds[ci],sn=sc&&sc.nd[ni];if(!sn){miss++;continue;}
    /* контуры-кандидаты: лучший и «близнецы» (повторяющиеся кривые — арки m) */
    const cc=Dt.map(t=>({t,c:simCostC(sc,t,Bs,Bt)})).sort((a,b)=>a.c-b.c);
    if(!cc.length||cc[0].c>SIM.TC){miss++;continue;}
    const cand=[cc[0]];
    if(sc.cf>0.3)for(const o of cc.slice(1))if(o.t.n===cc[0].t.n&&o.t.hole===cc[0].t.hole&&o.c<=cc[0].c+0.35&&Math.abs(o.t.cy-cc[0].t.cy)<0.04&&o.c<=SIM.TC)cand.push(o);
    let any=false;
    for(const {t,c} of cand){
      let best=null,bc=1e9;
      for(const tn of t.nd){const q=simCostN(sn,tn)+0.35*c;if(q<bc){bc=q;best=tn;}}
      if(!best||bc>SIM.TN+0.35*SIM.TC*0.5)continue;
      const e0=edS[k],rX=simR(t.bb.w/sc.bb.w,0.6,1.7),e={};
      const LP=Math.max(30,p.stem*0.45),LH=Math.max(60,p.stem*0.9);
      if(e0.p)e.p=[simCl(e0.p[0]*rX,LP),simCl(e0.p[1]*rY,LP)];
      for(const h of ['a','b']){const v=e0[h];if(v===false){if(h==='a'?best.hasA:best.hasB)e[h]=false;}else if(v&&(h==='a'?best.hasA:best.hasB))e[h]=[simCl(v[0]*rX,LH),simCl(v[1]*rY,LH)];}
      if(!Object.keys(e).length)continue;
      set[t.ci+':'+t.nd.indexOf(best)]=e;any=true;}
    if(any)matched++;else miss++;}
  if(!matched)return {none:true,why:'нет соответствия'};
  return {kind:'outline',set,matched,total:keys.length,partial:matched<keys.length,miss};}
function simTransferSk(srcCh,tgtCh,p,edS,edT,sel){
  const K=(edS&&edS.sk)||{};
  const ops=e=>{const o={};const s=e&&e.sk;if(s)for(const k in s)if(k.endsWith(':ops'))o[k]=s[k];return o;};
  const rs=glyphSkeleton(srcCh,p,Object.assign({},edS||{},{sk:ops(edS)})),rt=glyphSkeleton(tgtCh,p,Object.assign({},edT||{},{sk:ops(edT)}));
  if(!rs||!rt)return {none:true,why:'нет скелета'};
  const Ds=simDescSk(rs),Dt=simDescSk(rt),set={},sKeys=Object.keys(K).filter(k=>!k.endsWith(':ops')&&(!sel||sel.includes(k)));
  if(!sKeys.length)return {none:true,why:'нет правок точек'};
  if(Math.abs(Math.log(rt.w/rs.w))>0.8||Math.abs(Math.log(rt.h/rs.h))>0.45)return {none:true,why:'нет соответствия'};
  const rY=simR(rt.h/rs.h,0.6,1.7),rX=simR(rt.w/rs.w,0.6,1.7);
  const find=(sn)=>{let best=null,bc=1e9;for(const t of Dt){const q=simCostS(sn,t);if(q<bc){bc=q;best=t;}}return bc<=SIM.TS?best:null;};
  let matched=0,miss=0;
  for(const k of sKeys){
    const [a,b]=k.split(':'),si=+a,v=K[k];
    if(b==='cap0'||b==='cap1'){
      const st=rs.skel[si];if(!st||st.dot||st.closed){miss++;continue;}
      const ni=b==='cap0'?0:st.nodes.length-1,sn=Ds.find(d=>d.si===si&&d.ni===ni),t=sn&&find(sn);
      if(!t||!t.end){miss++;continue;}
      set[t.si+':'+(t.end<0?'cap0':'cap1')]=v;matched++;continue;}
    const ni=+b,sn=Ds.find(d=>d.si===si&&d.ni===ni);if(!sn||typeof v!=='object'){miss++;continue;}
    const t=find(sn);if(!t){miss++;continue;}
    const e={};
    if(v.p)e.p=[simCl(v.p[0]*rX,SK_EDIT_LIM),simCl(v.p[1]*rY,SK_EDIT_LIM)];
    for(const h of ['a','b']){const q=v[h];if(q===false)e[h]=false;else if(q)e[h]=[simCl(q[0]*rX,SK_EDIT_LIM),simCl(q[1]*rY,SK_EDIT_LIM)];}
    if(v.w!=null)e.w=v.w;if(v.type&&!t.dot)e.type=v.type;
    if(!Object.keys(e).length)continue;
    set[t.si+':'+t.ni]=e;matched++;}
  if(!matched)return {none:true,why:'нет соответствия'};
  return {kind:'skel',set,matched,total:sKeys.length,partial:matched<sKeys.length,miss};}
/* правки цели после переноса (копия) */
function simMerge(edT,res){
  const ed=edT?JSON.parse(JSON.stringify(edT)):{};
  if(res.kind==='skel'){const K=ed.sk||(ed.sk={});for(const k in res.set)K[k]=JSON.parse(JSON.stringify(res.set[k]));}
  else for(const k in res.set)ed[k]=JSON.parse(JSON.stringify(res.set[k]));
  return ed;}
/* допустимость: во всех весах семейства и в обоих начертаниях части/просветы не меняются, нет самопересечений, нет обломков */
function simState(ch,st,ed){
  const g=finalGlyph(ch,st,{[edKey(ch)]:ed},{slant:false,remap:false,warp:false,subdiv:false,rough:false});
  return g&&g.cs.length?decoStats(g.cs):null;}
function simCheck(ch,edOld,edNew,styles){
  const sts=[],seen=new Set();
  const push=(nm,s)=>{const k=JSON.stringify(s.p);if(seen.has(k))return;seen.add(k);sts.push([nm,s]);};
  styles.forEach((st,i)=>{const it=i>0||st.p.slant>0?'курсив':'';push(it,st);
    for(const [wn] of FAM_W){try{push((it?it+', ':'')+'вес '+wn,{p:famParams(st.p,wn),lat:st.lat,hg:st.hg});}catch(e){}}});
  for(const [nm,s] of sts){const w=nm?' ('+nm+')':'',bad=m=>({ok:false,msg:m+w});
    const A=simState(ch,s,edOld||{}),B=simState(ch,s,edNew);
    if(!A)return {ok:true};
    if(!B||B.bad)return bad('Контур получился некорректным');
    if(B.parts!==A.parts)return bad('Знак распадётся на части или части сольются');
    if(B.holes!==A.holes)return bad('Просвет закроется или появится новый');
    const stem=sE(safeP(s.p));if(B.minA<Math.min(0.3*stem*stem,0.8*A.minA))return bad('Слишком тонкий выступ или обломок');}
  return {ok:true};}
