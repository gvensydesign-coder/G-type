/* ===== Вариативный TrueType (ось wght 300–900): мастера = веса семейства =====
   Контуры каждого мастера — уже объединённый результат csgExact. Совместимость точек достигается сопоставлением:
   контуры -> кластеры, узлы -> выравнивание динамическим программированием (с вставкой узлов в кривую без изменения формы),
   недостающие контуры схлопываются в точку. Дальше все мастера переводятся в TrueType с одинаковым числом точек. */
const VF_NORM=[-1,0,0.6,1];                                   /* (w-400)/100 слева, (w-400)/500 справа */
const vfEv=(P,t)=>{const u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;return [a*P[0][0]+b*P[1][0]+c*P[2][0]+d*P[3][0],a*P[0][1]+b*P[1][1]+c*P[2][1]+d*P[3][1]];};
function vfSplit(P,t){const L=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
  const a=L(P[0],P[1]),b=L(P[1],P[2]),c=L(P[2],P[3]),d=L(a,b),e=L(b,c),f=L(d,e);return [[P[0],a,d,f],[f,e,c,P[3]]];}
function vfSub(P,t1,t2){ /* кусок кривой между t1 и t2 */
  if(t2<=t1){const p=vfEv(P,t1);return [p,p,p,p];}
  let R=P;if(t1>0)R=vfSplit(P,t1)[1];
  if(t2<1){const rel=(t2-t1)/(1-t1);R=vfSplit(R,Math.min(1,rel))[0];}
  return R.map(p=>p.slice());
}
const vfLen2=P=>{let l=0,pr=P[0];for(let k=1;k<=6;k++){const q=vfEv(P,k/6);l+=Math.hypot(q[0]-pr[0],q[1]-pr[1]);pr=q;}return l;};
function vfIsLine(P){const dx=P[3][0]-P[0][0],dy=P[3][1]-P[0][1],L=Math.hypot(dx,dy);
  const dv=z=>L<1e-9?Math.hypot(z[0]-P[0][0],z[1]-P[0][1]):Math.abs((z[0]-P[0][0])*dy-(z[1]-P[0][1])*dx)/L;
  return dv(P[1])<0.02&&dv(P[2])<0.02;}
/* контур движка -> замкнутая цепочка кубических сегментов (порядок как в contourToTT: reverseNodes) */
function vfCont(c){
  const ns=reverseNodes(c.nodes),n=ns.length;if(n<2)return null;
  let segs=[];
  for(let i=0;i<n;i++){const P=segPts(ns[i],ns[(i+1)%n]);segs.push(P);}
  /* вырожденные сегменты (длина ~0) убираем, цепочку склеиваем */
  const keep=segs.filter(P=>vfLen2(P)>1e-4);
  if(keep.length<2)return null;
  for(let i=0;i<keep.length;i++){const nx=keep[(i+1)%keep.length];keep[i][3]=nx[0];}
  return {hole:!!c.hole,segs:keep};
}
function vfInfo(segs){
  const n=segs.length,out=[],lens=[];let tot=0;
  for(const P of segs){const l=vfLen2(P);lens.push(l);tot+=l;}
  const dir=(p0,cands)=>{for(const q of cands){const dx=q[0]-p0[0],dy=q[1]-p0[1],l=Math.hypot(dx,dy);if(l>1e-6)return [dx/l,dy/l];}return [1,0];};
  let acc=0;
  for(let i=0;i<n;i++){
    const P=segs[i],Q=segs[(i+n-1)%n];
    const to=dir(P[0],[P[1],P[2],P[3]]);
    const fr=dir(Q[3],[Q[2],Q[1],Q[0]]);const ti=[-fr[0],-fr[1]]; /* направление входа: от предыдущей ручки к узлу */
    const corner=(ti[0]*to[0]+ti[1]*to[1])<0.966;
    out.push({x:P[0][0],y:P[0][1],corner,tx:to[0],ty:to[1],fr:tot>0?acc/tot:0});acc+=lens[i];
  }
  return out;
}
function vfPoly(segs,k){const o=[];for(const P of segs)for(let j=0;j<k;j++)o.push(vfEv(P,j/k));return o;}
function vfDistPoly(pt,poly){let best=1e18;const n=poly.length;
  for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;
    let t=L2>0?((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/L2:0;t=t<0?0:t>1?1:t;
    const d=(pt[0]-a[0]-dx*t)**2+(pt[1]-a[1]-dy*t)**2;if(d<best)best=d;}
  return Math.sqrt(best);}
/* выравнивание двух циклических списков узлов: список пар {a,b} (индекс или null) */
function vfDP(IA,IB,dA,dB,ax,ay){
  /* ax,ay: координаты узлов A, перенесённые в систему B (по габариту контура) */
  ax=ax||IA.map(a=>a.x);ay=ay||IA.map(a=>a.y);
  const n=IA.length,m=IB.length;
  const gA=i=>22+0.6*dA[i]+(IA[i].corner?15:0),gB=j=>22+0.6*dB[j]+(IB[j].corner?15:0);
  let best=null;
  const mcF=(j0)=>{const f0=IB[j0].fr;return (i,j)=>{const a=IA[i],b=IB[j];let fb=b.fr-f0;if(fb<0)fb+=1;
    return 0.5*Math.hypot(ax[i]-b.x,ay[i]-b.y)+(a.corner!==b.corner?35:0)+25*(1-(a.tx*b.tx+a.ty*b.ty))+80*Math.abs(a.fr-fb);};};
  const cand=[];for(let j=0;j<m;j++)cand.push([mcF(j)(0,j),j]);
  cand.sort((x,y)=>x[0]-y[0]);
  /* кандидаты: ближайшие по цене и ещё несколько равномерно по циклу — стартовый узел A мог остаться без пары */
  const js=cand.slice(0,Math.min(m,6)).map(x=>x[1]);
  for(const j0 of js){
    const mc=mcF(j0),W=m,cost=new Float64Array(n*W),bk=new Uint8Array(n*W);
    cost[0]=mc(0,j0);
    for(let p=0;p<n;p++)for(let q=0;q<m;q++){
      if(p===0&&q===0)continue;
      const jq=(j0+q)%m;let c=1e18,b=0;
      if(p>0&&q>0){const v=cost[(p-1)*W+q-1]+mc(p,jq);if(v<c){c=v;b=1;}}
      if(p>0){const v=cost[(p-1)*W+q]+gA(p);if(v<c){c=v;b=2;}}
      if(q>0){const v=cost[p*W+q-1]+gB(jq);if(v<c){c=v;b=3;}}
      cost[p*W+q]=c;bk[p*W+q]=b;
    }
    const tot=cost[(n-1)*W+m-1];
    if(!best||tot<best.tot){best={tot,j0,cost,bk,W};}
  }
  const {j0,bk,W}=best;const items=[];let p=n-1,q=m-1;
  while(p>0||q>0){const b=bk[p*W+q];
    if(b===1){items.push({a:p,b:(j0+q)%m});p--;q--;}
    else if(b===2){items.push({a:p,b:null});p--;}
    else{items.push({a:null,b:(j0+q)%m});q--;}}
  items.push({a:0,b:j0});items.reverse();
  return {items,j0};
}
/* координата на цепочке: u = индекс сегмента (от старта) + t */
function vfAt(segs,start,u){const n=segs.length,s=Math.floor(u+1e-12);const t=Math.max(0,Math.min(1,u-s));return vfEv(segs[(start+s)%n],t);}
function vfProject(segs,start,pt,lo,hi){
  if(hi<=lo+1e-9)return lo;
  const K=Math.max(10,Math.ceil((hi-lo)*16));let bu=lo,bd=1e18;
  for(let k=0;k<=K;k++){const u=lo+(hi-lo)*k/K,p=vfAt(segs,start,u),d=(p[0]-pt[0])**2+(p[1]-pt[1])**2;if(d<bd){bd=d;bu=u;}}
  let st=(hi-lo)/K;
  for(let it=0;it<14;it++){for(const u of [bu-st,bu+st]){if(u<lo||u>hi)continue;const p=vfAt(segs,start,u),d=(p[0]-pt[0])**2+(p[1]-pt[1])**2;if(d<bd){bd=d;bu=u;}}st*=0.5;}
  return bu;
}
/* пересобрать цепочку по списку событий [{u}] (u неубывающие, от start; последнее замыкается на start+len) */
function vfRebuild(segs,start,evU){
  const n=segs.length,out=[],E=evU.length;
  const pts=[];
  for(let k=0;k<E;k++){
    const u1=evU[k],u2=k+1<E?evU[k+1]:n;
    let s1=Math.floor(u1+1e-12),t1=Math.max(0,u1-s1),s2=Math.floor(u2+1e-12),t2=Math.max(0,u2-s2);
    let P;
    if(s2===s1)P=vfSub(segs[(start+s1)%n],t1,t2);
    else{ /* u2 лежит на границе (t2≈0) следующего сегмента */
      P=vfSub(segs[(start+s1)%n],t1,1);
      if(s2>s1+1||t2>1e-9){ /* на всякий случай: рядом стоящие события через границу */
        const P2=vfSub(segs[(start+s2)%n],0,t2);P[3]=P2[3].slice();P[2]=P[2].slice();}
    }
    out.push(P);
  }
  for(let i=0;i<E;i++){const nx=out[(i+1)%E];out[i][3]=nx[0];}
  return out;
}
/* A и B: цепочки сегментов. Возвращает {evA,evB,j0,rowsA,rowsB}: события для перестройки A (старт 0) и B (старт j0) */
function vfAlignPair(A,B){
  const IA=vfInfo(A),IB=vfInfo(B),polyA=vfPoly(A,12),polyB=vfPoly(B,12);
  /* перенос по габариту контура: A->B и B->A (масштаб ограничен), чтобы смещённые/разросшиеся знаки не путали пары */
  const bA=vfBBox(A),bB=vfBBox(B);
  const mk=(f,t)=>{const sx=Math.max(0.5,Math.min(2,(t[2]-t[0])>1&&(f[2]-f[0])>1?(t[2]-t[0])/(f[2]-f[0]):1)),sy=Math.max(0.5,Math.min(2,(t[3]-t[1])>1&&(f[3]-f[1])>1?(t[3]-t[1])/(f[3]-f[1]):1));
    const fx=(f[0]+f[2])/2,fy=(f[1]+f[3])/2,tx=(t[0]+t[2])/2,ty=(t[1]+t[3])/2;return p=>[tx+(p[0]-fx)*sx,ty+(p[1]-fy)*sy];};
  const AtoB=mk(bA,bB),BtoA=mk(bB,bA);
  const mA=IA.map(a=>AtoB([a.x,a.y])),mB=IB.map(b=>BtoA([b.x,b.y]));
  const dA=IA.map((a,i)=>vfDistPoly(mA[i],polyB)),dB=IB.map((b,j)=>vfDistPoly(mB[j],polyA));
  const {items,j0}=vfDP(IA,IB,dA,dB,mA.map(p=>p[0]),mA.map(p=>p[1]));
  const n=A.length,m=B.length,N=items.length;
  const uA=new Array(N),uB=new Array(N);
  for(let k=0;k<N;k++){const it=items[k];if(it.a!=null)uA[k]=it.a;if(it.b!=null)uB[k]=(it.b-j0+m)%m;}
  let loA=0,loB=0;
  for(let k=0;k<N;k++){
    const it=items[k];
    if(it.a!=null&&it.b!=null){loA=uA[k];loB=uB[k];continue;}
    if(it.a!=null){ /* узел A без пары: проекция на B между соседями */
      let hi=m;for(let q=k+1;q<N;q++)if(uB[q]!=null){hi=uB[q];break;}
      const u=vfProject(B,j0,mA[it.a],loB,Math.max(loB,hi));uB[k]=u;loB=u;loA=uA[k];
    }else{
      let hi=n;for(let q=k+1;q<N;q++)if(uA[q]!=null){hi=uA[q];break;}
      const u=vfProject(A,0,mB[it.b],loA,Math.max(loA,hi));uA[k]=u;loA=u;loB=uB[k];
    }
  }
  return {N,uA,uB,j0};
}
/* выровнять новый мастер M по семье (массив цепочек одинаковой структуры); возвращает новую семью и выровненный M */
function vfAlignInto(family,nearIdx,M){
  const r=vfAlignPair(family[nearIdx],M.__segs||M);
  const fam2=family.map(F=>vfRebuild(F,0,r.uA));
  const m2=vfRebuild(M.__segs||M,r.j0,r.uB);
  return {fam:fam2,m:m2};
}
function vfCentroid(segs){let sx=0,sy=0,c=0;for(const P of segs)for(let k=0;k<4;k++){sx+=P[k][0];sy+=P[k][1];c++;}return [sx/c,sy/c];}
function vfBBox(segs){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const P of segs)for(const q of P){x0=Math.min(x0,q[0]);x1=Math.max(x1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1]);}return [x0,y0,x1,y1];}
function vfArea(segs){let a=0;for(const P of segs){let pr=P[0];for(let k=1;k<=6;k++){const q=vfEv(P,k/6);a+=pr[0]*q[1]-q[0]*pr[1];pr=q;}}return a/2;}
/* цена соответствия контуров: центры в долях габарита всего знака (знаки растут с весом) + небольшая добавка за разницу габаритов */
function vfGB(list){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const c of list){const b=vfBBox(c.segs);x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);}return [x0,y0,Math.max(x1,x0+1),Math.max(y1,y0+1)];}
function vfCCost(a,b,ga,gb){const A=vfBBox(a.segs),B=vfBBox(b.segs),ca=vfCentroid(a.segs),cb=vfCentroid(b.segs);
  const nx=(c,g)=>(c[0]-g[0])/(g[2]-g[0]),ny=(c,g)=>(c[1]-g[1])/(g[3]-g[1]);
  const d=Math.hypot(nx(ca,ga)-nx(cb,gb),ny(ca,ga)-ny(cb,gb))*700;
  return d+0.1*(Math.abs(A[0]-B[0])+Math.abs(A[1]-B[1])+Math.abs(A[2]-B[2])+Math.abs(A[3]-B[3]));}
/* masters: контуры {hole,segs} по мастерам (отсортированы по координате оси), coords — их координаты, def — индекс умолчания.
   Возвращает {conts:[ [segs по мастерам] ...], collapsed} — у всех мастеров одинаковая структура цепочек */
const vfN1=c=>Array.isArray(c)?c.reduce((s,v)=>s+Math.abs(v),0):Math.abs(c);
const vfD1=(a,b)=>Array.isArray(a)?a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0):Math.abs(a-b);
function vfMatchGlyph(masters,coords,def){
  coords=coords||VF_NORM;def=def==null?1:def;
  const NM=masters.length;
  const clusters=[]; /* clusters[c][k] = контур|null */
  const GB=masters.map(vfGB);
  masters[def].forEach(c=>{const a=new Array(NM).fill(null);a[def]=c;clusters.push(a);});
  const procOrder=[];for(let k=0;k<NM;k++)if(k!==def)procOrder.push(k);
  procOrder.sort((a,b)=>vfN1(coords[a])-vfN1(coords[b])||a-b);
  const done=[def],nearest=(k,list)=>list.reduce((b,x)=>vfD1(coords[x],coords[k])<vfD1(coords[b],coords[k])?x:b,list[0]);
  for(const k of procOrder){
    const cs=masters[k];
    const thr=cs.length===masters[def].length?1e9:260; /* при равном числе контуров сопоставляем всегда */
    const cmpK=nearest(k,done);
    const pairs=[];
    cs.forEach((c,ci)=>clusters.forEach((cl,li)=>{const rk=cl[cmpK]?cmpK:cl[def]?def:cl.findIndex(x=>x);const ref=cl[rk];if(ref&&!!ref.hole===!!c.hole)
      pairs.push([vfCCost(ref,c,GB[rk],GB[k]),ci,li]);}));
    pairs.sort((a,b)=>a[0]-b[0]);
    const usedC=new Set(),used=new Set();
    for(const [cost,ci,li] of pairs){if(usedC.has(ci)||used.has(li))continue;if(clusters[li][k])continue;
      if(cost>thr)continue;
      clusters[li][k]=cs[ci];usedC.add(ci);used.add(li);}
    cs.forEach((c,ci)=>{if(usedC.has(ci))return;const a=new Array(NM).fill(null);a[k]=c;clusters.push(a);});
    done.push(k);
  }
  const res=[];let collapsed=0;
  for(const cl of clusters){
    const present=[];for(let k=0;k<NM;k++)if(cl[k])present.push(k);
    const base=cl[def]?def:present[0];
    const seq=[base,...procOrder.filter(k=>k!==base&&cl[k])];
    let fam=[cl[base].segs.map(P=>P.map(p=>p.slice()))],famK=[base];
    for(const k of seq.slice(1)){
      const near=famK.indexOf(nearest(k,famK));
      const r=vfAlignInto(fam,near,cl[k].segs);
      fam=r.fam;fam.push(r.m);famK.push(k);
    }
    const by=new Array(NM).fill(null);famK.forEach((k,i)=>by[k]=fam[i]);
    for(let k=0;k<NM;k++){if(by[k])continue;
      const nb=nearest(k,famK),src=by[nb],c=vfCentroid(src);
      by[k]=src.map(()=>{const p=[c[0],c[1]];return [p,p.slice(),p.slice(),p.slice()];});
      for(let i=0;i<by[k].length;i++)by[k][i][3]=by[k][(i+1)%by[k].length][0];
      collapsed++;
    }
    res.push(by);
  }
  return {conts:res,collapsed};
}
/* мастера -> точки TrueType (одинаковое число точек у всех) */
function vfQuadCount(P){const err=Math.hypot(P[3][0]-3*P[2][0]+3*P[1][0]-P[0][0],P[3][1]-3*P[2][1]+3*P[1][1]-P[0][1])*0.0481;
  return Math.max(1,Math.min(8,Math.ceil(Math.cbrt(err/0.7))));}
function vfToTT(conts){
  const NM=conts.length?conts[0].length:0,pts=[],ends=[];for(let k=0;k<NM;k++)pts.push([]);
  let e=-1;
  for(const by of conts){
    const n=by[0].length;
    for(let s=0;s<n;s++){
      const Ps=by.map(c=>c[s]);
      const allLine=Ps.every(P=>vfIsLine(P));
      let nq=1;if(!allLine)for(const P of Ps)nq=Math.max(nq,vfQuadCount(P));
      for(let k=0;k<NM;k++){
        const P=Ps[k],o=pts[k];o.push([Math.round(P[0][0]),Math.round(P[0][1]),1]);
        if(!allLine){
          for(let j=0;j<nq;j++){
            const Q=nq===1?P:vfSub(P,j/nq,(j+1)/nq);
            o.push([Math.round((3*(Q[1][0]+Q[2][0])-Q[0][0]-Q[3][0])/4),Math.round((3*(Q[1][1]+Q[2][1])-Q[0][1]-Q[3][1])/4),0]);
            if(j<nq-1)o.push([Math.round(Q[3][0]),Math.round(Q[3][1]),1]);
          }
        }
      }
    }
    e=pts[0].length-1;ends.push(e);
  }
  return {pts,ends};
}
/* ---------- таблицы ---------- */
function vfParseSfnt(u8){
  const r16=o=>(u8[o]<<8)|u8[o+1],r32=o=>((u8[o]<<24)|(u8[o+1]<<16)|(u8[o+2]<<8)|u8[o+3])>>>0;
  const nt=r16(4),T={};
  for(let i=0;i<nt;i++){const o=12+i*16,tag=String.fromCharCode(u8[o],u8[o+1],u8[o+2],u8[o+3]);T[tag]=Array.from(u8.subarray(r32(o+8),r32(o+8)+r32(o+12)));}
  return T;
}
function vfParseName(arr){
  const r16=o=>(arr[o]<<8)|arr[o+1],cnt=r16(2),so=r16(4),recs=[];
  for(let i=0;i<cnt;i++){const o=6+i*12,len=r16(o+8),off=r16(o+10);let s='';for(let k=0;k<len;k+=2)s+=String.fromCharCode(r16(so+off+k));recs.push({id:r16(o+6),s});}
  return recs;
}
function vfBuildName(recs){ /* rec: {id,s,ru?} — ru добавляет русскую запись (Windows, 0x419) */
  const all=[];for(const r of recs){all.push({id:r.id,s:r.s,lang:0x409});if(r.ru)all.push({id:r.id,s:r.ru,lang:0x419});}
  all.sort((a,b)=>a.lang-b.lang||a.id-b.id);
  const name=new BW(),store=[],rr=[];let off=0;
  for(const r of all){const u=utf16(r.s);rr.push([r.id,u.length,off,r.lang]);store.push(...u);off+=u.length;}
  name.u16(0).u16(all.length).u16(6+all.length*12);
  rr.forEach(r=>name.u16(3).u16(1).u16(r[3]).u16(r[0]).u16(r[1]).u16(r[2]));name.bytes(store);return name.b;
}
const vfF2=v=>Math.round(v*16384);
const vfFix=v=>Math.round(v*65536);
function vfPackDeltas(a){
  const out=[],n=a.length,small=v=>v>=-128&&v<=127;let i=0;
  while(i<n){
    if(a[i]===0){let j=i;while(j<n&&a[j]===0&&j-i<64)j++;out.push(0x80|(j-i-1));i=j;continue;}
    let j=i;
    if(small(a[i])){while(j<n&&small(a[j])&&j-i<64&&!(a[j]===0&&j+1<n&&a[j+1]===0))j++;out.push(j-i-1);for(let k=i;k<j;k++)out.push(a[k]&255);}
    else{while(j<n&&!small(a[j])&&j-i<64)j++;out.push(0x40|(j-i-1));for(let k=i;k<j;k++)out.push((a[k]>>8)&255,a[k]&255);}
    i=j;}
  return out;
}
/* ---------- модель вариаций (как fontTools VariationModel); coords[k] — нормализованные координаты дизайна по осям ---------- */
const vfCmpA=(x,y)=>{for(let i=0;i<Math.min(x.length,y.length);i++){if(x[i]!==y[i])return x[i]<y[i]?-1:1;}return x.length-y.length;};
function vfModel(coords,def){
  const C=coords.map(c=>Array.isArray(c)?c.slice():[c]),A=C[0].length,n=C.length;
  const nz=c=>{const s=new Set();c.forEach((v,a)=>{if(v)s.add(a);});return s;};
  const axisPts=[];for(let a=0;a<A;a++)axisPts.push(new Set([0]));
  C.forEach(c=>{const z=nz(c);if(z.size===1){const a=[...z][0];axisPts[a].add(c[a]);}});
  const K=C.map(c=>{const z=[...nz(c)];return [[z.length],[-z.filter(a=>axisPts[a].has(c[a])).length],z,z.map(a=>c[a]<0?-1:1),z.map(a=>Math.abs(c[a]))];});
  const order=[];for(let k=0;k<n;k++)if(k!==def)order.push(k);
  order.sort((i,j)=>{for(let t=0;t<5;t++){const r=vfCmpA(K[i][t],K[j][t]);if(r)return r;}return i-j;});
  const mn=new Array(A).fill(0),mx=new Array(A).fill(0);
  C.forEach(c=>c.forEach((v,a)=>{if(v<mn[a])mn[a]=v;if(v>mx[a])mx[a]=v;}));
  const sup=new Array(n).fill(null),regs=[];
  for(const k of order){
    const c=C[k],region=c.map((v,a)=>v>0?[0,v,mx[a]]:v<0?[mn[a],v,0]:[0,0,0]),locAxes=nz(c);
    for(const R of regs){
      if(R.axes.size!==locAxes.size||![...R.axes].every(a=>locAxes.has(a)))continue;
      let rel=true;
      for(const a of locAxes){const pv=R.reg[a][1];if(!(pv===region[a][1]||(region[a][0]<pv&&pv<region[a][2]))){rel=false;break;}}
      if(!rel)continue;
      let best={},br=-1;
      for(const a of R.axes){const val=R.reg[a][1],lo=region[a][0],pk=region[a][1],hi=region[a][2];let nl=lo,nh=hi,ratio;
        if(val<pk){nl=val;ratio=(val-pk)/(lo-pk);}else if(pk<val){nh=val;ratio=(val-pk)/(hi-pk);}else continue;
        if(ratio>br){best={};br=ratio;}
        if(ratio===br)best[a]=[nl,pk,nh];}
      for(const a in best)region[a]=best[a];
    }
    regs.push({axes:locAxes,reg:region});sup[k]=region;
  }
  return {order,sup,coords:C,def,A};
}
const vfScalar=(S,x)=>{let s=1;
  for(let a=0;a<S.length;a++){const lo=S[a][0],pk=S[a][1],hi=S[a][2];if(pk===0)continue;const v=x[a];
    if(v===pk)continue;if(v<=lo||v>=hi)return 0;s*=v<pk?(v-lo)/(pk-lo):(hi-v)/(hi-pk);}
  return s;};
/* values[k] — массив чисел по мастеру k (одинаковой длины); возвращает дельты (целые) по мастерам, у умолчания null */
function vfDeltas(model,values){
  const {order,sup,coords,def}=model,n=values.length,len=values[def].length,out=new Array(n).fill(null);
  for(const k of order){
    const d=new Array(len);
    for(let i=0;i<len;i++){
      let v=values[k][i]-values[def][i];
      for(const j of order){if(j===k)break;if(!out[j])continue;const s=vfScalar(sup[j],coords[k]);if(s)v-=s*out[j][i];}
      d[i]=Math.round(v);
    }
    out[k]=d;
  }
  return out;
}
const vfInter=S=>S.some(t=>t[1]!==0&&!(t[0]===Math.min(0,t[1])&&t[2]===Math.max(0,t[1])));
function vfBuildGvar(gl,A){ /* gl: [{n,coords,def,pts:[мастер][точка][x,y,on],advv:[мастер]}]; A — число осей */
  const ng=gl.length,datas=[];
  for(const g of gl){
    const np=g.n,model=g.model,tuples=[];
    const X=g.pts.map(P=>P.map(p=>p[0]).concat([0,0,0,0])),Y=g.pts.map(P=>P.map(p=>p[1]).concat([0,0,0,0]));
    g.advv.forEach((a,k)=>{X[k][np+1]=a;}); /* фантом 2: ширина (в значениях мастера) */
    const DX=vfDeltas(model,X),DY=vfDeltas(model,Y);
    for(const k of model.order){
      const dx=DX[k],dy=DY[k];let any=false;
      for(let i=0;i<dx.length;i++)if(dx[i]||dy[i]){any=true;break;}
      if(!any)continue;
      tuples.push({S:model.sup[k],ser:[0,...vfPackDeltas(dx),...vfPackDeltas(dy)]});
    }
    if(!tuples.length){datas.push([]);continue;}
    const hs=4+tuples.reduce((x,t)=>x+4+2*A+(vfInter(t.S)?4*A:0),0);
    const b=new BW();
    b.u16(tuples.length).u16(hs);
    for(const t of tuples){
      const inter=vfInter(t.S);
      b.u16(t.ser.length).u16(0x8000|0x2000|(inter?0x4000:0));
      t.S.forEach(s=>b.i16(vfF2(s[1])));
      if(inter){t.S.forEach(s=>b.i16(vfF2(s[0])));t.S.forEach(s=>b.i16(vfF2(s[2])));}
    }
    tuples.forEach(t=>b.bytes(t.ser));
    if(b.len%2)b.u8(0);
    datas.push(b.b);
  }
  const offs=[];let o=0;for(const d of datas){offs.push(o);o+=d.length;}offs.push(o);
  const hdrLen=20+offs.length*4;
  const gv=new BW();
  gv.u16(1).u16(0).u16(A).u16(0).u32(hdrLen).u16(ng).u16(1).u32(hdrLen);
  offs.forEach(v=>gv.u32(v));
  for(const d of datas)gv.bytes(d);
  return gv.b;
}
function vfBuildHvar(advs,model){ /* advs: [[advance по ядру мастеров] на глиф]; model — модель ядра */
  const ng=advs.length,h=new BW(),regs=model.order.map(k=>model.sup[k]);
  h.u16(1).u16(0).u32(20).u32(0).u32(0).u32(0); /* заголовок 20 байт: IVS сразу за ним */
  const rl=new BW();rl.u16(model.A).u16(regs.length);regs.forEach(R=>{R.forEach(s=>rl.i16(vfF2(s[0])).i16(vfF2(s[1])).i16(vfF2(s[2])));});
  const idat=new BW();idat.u16(ng).u16(regs.length).u16(regs.length);regs.forEach((_,i)=>idat.u16(i));
  for(const a of advs){const D=vfDeltas(model,a.map(v=>[v]));model.order.forEach(k=>idat.i16(D[k][0]));}
  const rlOff=12,idOff=rlOff+rl.len,ivs=new BW();
  ivs.u16(1).u32(rlOff).u16(1).u32(idOff).bytes(rl.b).bytes(idat.b);
  h.bytes(ivs.b);
  return h.b;
}
function vfAssemble(tables){
  const tags=Object.keys(tables).sort(),nt=tags.length,sr=(1<<Math.floor(Math.log2(nt)))*16;
  const out=new BW();
  out.u32(0x00010000).u16(nt).u16(sr).u16(Math.floor(Math.log2(nt))).u16(nt*16-sr);
  let pos=12+nt*16;const layout={};
  tags.forEach(t=>{layout[t]=pos;pos+=(tables[t].length+3)&~3;});
  tags.forEach(t=>{out.tag(t).u32(checksum(tables[t])).u32(layout[t]).u32(tables[t].length);});
  tags.forEach(t=>{out.bytes(tables[t]).pad4();});
  const sum=checksum(out.b),adj=(0xB1B0AFBA-sum)>>>0,hp=layout['head']+8;
  out.b[hp]=(adj>>>24)&255;out.b[hp+1]=(adj>>>16)&255;out.b[hp+2]=(adj>>>8)&255;out.b[hp+3]=adj&255;
  return new Uint8Array(out.b);
}
/* ---------- сборка ---------- */
/* state: как у buildTTF (state.styles[k].p — параметры умолчательного веса семейства-источника), веса — через famParams */
/* ---------- контроль интерполяции: самопересечения на промежуточных весах ---------- */
function vfFlat(xs,ys,on,ends){
  const polys=[];let s=0;
  for(const e of ends){const n=e-s+1,P=[];
    for(let i=0;i<n;i++){const a=s+i;if(!on[a])continue;const b=s+(i+1)%n;
      P.push([xs[a],ys[a]]);
      if(!on[b]){const c=s+(i+2)%n;for(let t=1;t<8;t++){const u=t/8,v=1-u;P.push([v*v*xs[a]+2*v*u*xs[b]+u*u*xs[c],v*v*ys[a]+2*v*u*ys[b]+u*u*ys[c]]);}}}
    polys.push(P);s=e+1;}
  return polys;
}
const vfShoe=P=>{let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
/* наибольшая площадь «петли» от самопересечения (внутри контура) или большое число при пересечении разных контуров */
function vfCrossSeverity(polys){
  const S=[];
  polys.forEach((P,pi)=>{const n=P.length;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
    S.push({a,b,pi,i,n,x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])});}});
  S.sort((p,q)=>p.x0-q.x0);
  let worst=0;
  for(let u=0;u<S.length;u++){const A=S[u];
    for(let v=u+1;v<S.length;v++){const B=S[v];if(B.x0>A.x1)break;
      if(B.y0>A.y1||B.y1<A.y0)continue;
      if(A.pi===B.pi){const d=Math.abs(A.i-B.i);if(d<=1||d===A.n-1)continue;}
      const rx=A.b[0]-A.a[0],ry=A.b[1]-A.a[1],sx=B.b[0]-B.a[0],sy=B.b[1]-B.a[1],den=rx*sy-ry*sx;if(Math.abs(den)<1e-9)continue;
      const qx=B.a[0]-A.a[0],qy=B.a[1]-A.a[1],t=(qx*sy-qy*sx)/den,w=(qx*ry-qy*rx)/den;
      if(t<=1e-4||t>=1-1e-4||w<=1e-4||w>=1-1e-4)continue;
      if(A.pi!==B.pi){worst=Math.max(worst,400);continue;}
      const P=polys[A.pi],n=A.n,X=[A.a[0]+rx*t,A.a[1]+ry*t];
      let i=A.i,j=B.i;if(i>j){const T=i;i=j;j=T;const X2=[B.a[0]+sx*w,B.a[1]+sy*w];void X2;}
      const L=[X];for(let k=i+1;k<=j;k++)L.push(P[k]);
      const R=[X];for(let k=j+1;k<=j+n-(j-i);k++)R.push(P[k%n]);
      worst=Math.max(worst,Math.min(Math.abs(vfShoe(L)),Math.abs(vfShoe(R))));
    }}
  return worst;
}
/* форма глифа на координате x по модели (без округления) */
function vfShapeAt(g,model,DX,DY,x){
  const n=g.n,xs=new Array(n),ys=new Array(n),d=model.def;
  for(let i=0;i<n;i++){xs[i]=g.pts[d][i][0];ys[i]=g.pts[d][i][1];}
  for(const k of model.order){const sc=vfScalar(model.sup[k],x);if(!sc)continue;const dx=DX[k],dy=DY[k];for(let i=0;i<n;i++){xs[i]+=sc*dx[i];ys[i]+=sc*dy[i];}}
  return vfFlat(xs,ys,g.pts[d].map(p=>p[2]),g.ends);
}
/* наименьший зазор между разными контурами глифа (тонкая связка/горизонталь между чашей и наружным контуром): на ней «рвётся» линейная сумма дельт нескольких осей */
function vfMinGap(polys){
  let best=1e9;const bb=polys.map(P=>{let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const q of P){a=Math.min(a,q[0]);c=Math.max(c,q[0]);b=Math.min(b,q[1]);d=Math.max(d,q[1]);}return [a,b,c,d];});
  for(let i=0;i<polys.length;i++)for(let j=i+1;j<polys.length;j++){
    const A=bb[i],B=bb[j];if(A[0]>B[2]+40||B[0]>A[2]+40||A[1]>B[3]+40||B[1]>A[3]+40)continue;
    for(const q of polys[i]){const d=vfDistPoly(q,polys[j]);if(d<best)best=d;}
    for(const q of polys[j]){const d=vfDistPoly(q,polys[i]);if(d<best)best=d;}
  }
  return best;
}
/* возвращает координату с самой заметной петлёй (или null) */
function vfDefect(g){
  let bad=null,bs=18;
  const n=g.n;if(!n)return null;
  const X=g.pts.map(P=>P.map(p=>p[0])),Y=g.pts.map(P=>P.map(p=>p[1]));
  const DX=vfDeltas(g.model,X),DY=vfDeltas(g.model,Y);
  const p0=vfShapeAt(g,g.model,DX,DY,g.coords[g.def]),sg=p0.map(P=>Math.sign(vfShoe(P))),gap0=vfMinGap(p0); /* ориентации контуров и наименьший зазор мастера по умолчанию */
  for(const x of g.tests){
    if(g.coords.some(c=>vfD1(c,x)<0.04))continue;
    const polys=vfShapeAt(g,g.model,DX,DY,x);
    let sv=vfCrossSeverity(polys);
    /* контур вывернулся (просвет «схлопнулся» и перешёл через ноль): ориентация сменилась — это дефект, даже если пересечений нет */
    if(polys.some((P,i)=>sg[i]&&Math.sign(vfShoe(P))!==sg[i]&&Math.abs(vfShoe(P))>4))sv=Math.max(sv,500);
    if(gap0<60){const gt=vfMinGap(polys);if(gt<Math.min(10,0.4*gap0))sv=Math.max(sv,300);}
    if(sv>bs){bs=sv;bad=x;}
  }
  return bad;
}
/* ---------- сборка ---------- */
const vfWeightOf=c=>Math.round(400+(c<0?c*100:c*500));
const vfCoordOf=w=>w<400?(w-400)/100:(w-400)/500;
const _vfNB={};
function vfNamedBad(p0){if(CUR_FONT==='pixel')return false;/* Пиксель: свой VF (pix/vf.js, топология клеток Regular) */
  const key=CUR_FONT+'|'+JSON.stringify(p0);if(_vfNB[key]!=null)return _vfNB[key];
  let bad=false;for(const [wn,wv,r] of FAM_W.slice()){const n=famParams(p0,wn);FAM_W.push(['@vf',wv,r]);let q;try{q=famParams(p0,'@vf');}finally{FAM_W.pop();}
    if(Math.abs(q.stem-n.stem)>1.5||Math.abs(q.wdth-n.wdth)>1.5){bad=true;break;}}
  const ks=Object.keys(_vfNB);if(ks.length>60)delete _vfNB[ks[0]];return _vfNB[key]=bad;}
function vfStateAtW(styleKey,state,w){
  const s0=state.styles[styleKey],lst=FAM_W.map(x=>[x[1],x[2]]);
  let r=lst[lst.length-1][1];
  for(let i=0;i<lst.length-1;i++)if(w>=lst[i][0]&&w<=lst[i+1][0]){r=lst[i][1]+(lst[i+1][1]-lst[i][1])*(w-lst[i][0])/(lst[i+1][0]-lst[i][0]);break;}
  FAM_W.push(['@vf',w,r]);let p;try{p=famParams(s0.p,'@vf');}finally{FAM_W.pop();}
  /* FIX-ENGINE: famParams некоторых шрифтов (Пропись, Ротунда, Устав …) читает таблицу по ИМЕНИ веса: для '@vf' она возвращала параметры Regular (ось веса мертва,
     gvar пустой) или другие числа, чем статика (Устав: wdth 95 вместо 99). Если на именованных весах '@vf' расходится с именованным famParams, мастера берутся из именованных
     весов: на 300/400/700/900 — точно как статика, между ними — линейно. */
  if(vfNamedBad(s0.p)){let i=0;while(i<FAM_W.length-2&&w>FAM_W[i+1][1])i++;
    const A=FAM_W[i],B=FAM_W[i+1],t=Math.max(0,Math.min(1,(w-A[1])/(B[1]-A[1]))),pa=famParams(s0.p,A[0]),pb=famParams(s0.p,B[0]);
    p=Object.assign({},pa);
    for(const k in pa){if(typeof pa[k]==='number'&&typeof pb[k]==='number'&&pa[k]!==pb[k]){const v=pa[k]+(pb[k]-pa[k])*t;p[k]=(Number.isInteger(pa[k])&&Number.isInteger(pb[k]))?Math.round(v):v;}}}
  /* лестница горизонталей (FAM_HAIR, core_w.js) задана по именованным весам — между ними интерполируем линейно по весу, иначе мастера расходятся со статикой */
  if(typeof FAM_HAIR!=='undefined'&&FAM_HAIR[CUR_FONT]){
    let i=0;while(i<FAM_W.length-2&&w>FAM_W[i+1][1])i++;
    const A=FAM_W[i],B=FAM_W[i+1],t=Math.max(0,Math.min(1,(w-A[1])/(B[1]-A[1])));
    const ha=famParams(s0.p,A[0]).hair,hb=famParams(s0.p,B[0]).hair;
    if(ha>0&&hb>0)p.hair=Math.round(ha+(hb-ha)*t);
  }
  return {p,lat:s0.lat,hg:s0.hg,kern:s0.kern,ku:s0.ku,kc:s0.kc};
}
const VF_MAX_EXTRA=10;
/* static family vertical metrics of Pixel (as fam.js): union over Light/Regular/Bold/Black x regular/italic; cached per parameter set */
const PXVM_CACHE=new Map();
function pixelStaticVM(state){
  const key=JSON.stringify(['regular','italic'].map(k=>state.styles[k].p))+JSON.stringify(state.edits||{});
  if(PXVM_CACHE.has(key))return PXVM_CACHE.get(key);
  const list=[];
  for(const [wn,wc] of FAM_W){const st={family:state.family,edits:state.edits||{},styles:{}};
    for(const k of ['regular','italic'])st.styles[k]=Object.assign({},state.styles[k],{p:famParams(state.styles[k].p,wn)});
    for(const k of ['regular','italic'])list.push(buildTTF(k,st,{weight:wc,weightName:wn}).metrics);}
  const VM=unionVMetrics(list);if(PXVM_CACHE.size>8)PXVM_CACHE.clear();PXVM_CACHE.set(key,VM);return VM;}
async function buildVariableTTF(styleKey,state,opts){
  opts=opts||{};
  const italic=styleKey==='italic';
  /* оси и мастера (core_vfx.js): по умолчанию одна ось wght — мастера Light/Regular/Bold/Black */
  let sel=opts.axes&&opts.axes.length?opts.axes.slice():['wght'];
  const probeDropped=sel.length>1?vfxProbeAxes(styleKey,state,sel):[];
  sel=sel.filter(t=>!probeDropped.includes(t));
  const plan=vfxPlan(styleKey,state,sel),def=plan.def,NM=plan.masters.length,A=plan.axes.length;
  plan.dropped.push(...probeDropped.map(t=>t+':incompatible'));
  const MS=plan.masters.map(m=>({family:state.family,edits:state.edits,styles:{[styleKey]:vfxStyleState(styleKey,state,m.loc)}}));
  const coreModel=vfModel(plan.coords,def);
  /* статический Regular: cmap/GSUB/GPOS/OS/2/post/name — общие таблицы */
  /* порядок глифов — как в buildTTF */
  const CS=opts.chars||CHARSET;/* opts.chars: только нужные знаки (постер «Поделиться шрифтом») */
  const have=new Set(CS),names=['.notdef'],keys=[null];
  const enc=[];for(const ch of CS){enc.push({ch,uni:ch.codePointAt(0)});}
  enc.sort((a,b)=>a.uni-b.uni);enc.forEach(e=>{names.push('uni'+e.uni.toString(16).toUpperCase().padStart(4,'0'));keys.push({ch:e.ch,alt:null});});
  const tabOn=!!MS[def].styles[styleKey].p.tabular;
  for(const a of (typeof otAlternates==='function'?otAlternates():[])){
    if(!otAltOk(a,have,tabOn,italic))continue;
    if(opts.altFeats&&opts.altFeats.indexOf(a.feat)<0)continue;/* opts.altFeats: только нужные OpenType-свойства (постер: свойства «по умолчанию», без swsh/smcp/case…) */
    names.push(a.name);keys.push({ch:a.name,alt:a});
  }
  const edFor=key=>{let ed=state.edits;
    if(key.alt&&state.edits&&edGet(state.edits,key.alt.base)&&key.alt.feat!=='ss01'&&!key.alt.own)ed=Object.assign({},state.edits,{[edKey(key.ch)]:edGet(state.edits,key.alt.base)});
    return ed;};
  /* предварительный прогрев: точные контуры основного мастера строятся по одному знаку с передышкой для страницы
     (дальше статическая сборка и основной цикл берут их из памяти skShape) */
  const warm=!!(opts.tick&&typeof SKX!=='undefined'&&GL[CHARSET[0]]&&GL[CHARSET[0]].skel),TOT=warm?keys.length*2:keys.length;
  if(warm){
    for(let gi=1;gi<keys.length;gi++){await opts.tick(styleKey,gi,TOT);try{finalGlyph(keys[gi].ch,MS[def].styles[styleKey],edFor(keys[gi]));}catch(e){}}}
  const stat=buildTTF(styleKey,MS[def],{weight:400,weightName:'Regular',fontId:opts.fontId,chars:opts.chars,altFeats:opts.altFeats});
  const T=vfParseSfnt(stat.bytes);
  const ng=names.length;if(ng!==stat.glyphCount)throw new Error('glyph order mismatch '+ng+' vs '+stat.glyphCount);
  const gl=[],fallbacks=[],extraStat={glyphs:0,masters:0},uwTight=[];
  const nd=(x,y)=>({x,y,a:null,b:null});
  /* advance в произвольной точке пространства по модели ядра (для промежуточных мастеров) */
  const evalCore=(adv,x)=>{const D=vfDeltas(coreModel,adv.map(v=>[v]));let v=adv[def];for(const k of coreModel.order)v+=vfScalar(coreModel.sup[k],x)*D[k][0];return Math.round(v);};
  const uw=!!opts.uniwidth;
  for(let gi=0;gi<ng;gi++){
    if(opts.tick)await opts.tick(styleKey,(warm?ng:0)+gi,TOT);
    const key=keys[gi];
    const getAt=(k,stt,refAdv)=>{ /* контуры и ширина знака в состоянии stt (refAdv — униширинный эталон advance) */
      if(gi===0){const nc=[{hole:false,nodes:[nd(60,0),nd(560,0),nd(560,700),nd(60,700)]},{hole:true,nodes:[nd(130,70),nd(130,630),nd(490,630),nd(490,70)]}];return {cs:nc.map(vfCont).filter(Boolean),adv:620};}
      const ed=edFor(key);
      /* промежуточные мастера скелетных шрифтов — без финального упрощения узлов (сопоставление мастеров само выравнивает число узлов), основной Regular — как в статике */
      const nr=typeof SKX!=='undefined'&&k!==def;if(nr)SKX.NORED=true;let fg;try{fg=finalGlyph(key.ch,stt,ed);}finally{if(nr)SKX.NORED=false;}
      if(refAdv!=null&&!(key.alt&&key.alt.feat==='fixed')){const r=uwFit({cs:fg.cs,adv:fg.adv},refAdv,stt.p);if(r.tight>0.0005)uwTight.push(names[gi]+':'+(r.tight*100).toFixed(1)+'%');fg={cs:r.cs,adv:r.adv};}
      return {cs:fg.cs.map(vfCont).filter(Boolean),adv:Math.round(fg.adv)};
    };
    const core=new Array(NM);
    for(let k=0;k<NM;k++)if(plan.masters[k].uwRef<0||!uw)core[k]=getAt(k,MS[k].styles[styleKey]);
    for(let k=0;k<NM;k++)if(!core[k])core[k]=getAt(k,MS[k].styles[styleKey],core[plan.masters[k].uwRef].adv);
    const adv4=core.map(c=>c.adv);
    let masters=core.map(c=>c.cs),coords=plan.coords.map(c=>c.slice()),advv=adv4.slice(),extras=[];
    let rec=null,yb=null;
    for(let it=0;;it++){
      if(masters.every(c=>!c.length)){rec={n:0,ends:[],pts:masters.map(()=>[]),coords,def,model:vfModel(coords,def),adv:adv4,advv};break;}
      let tt,r;
      try{
        r=vfMatchGlyph(masters,coords,def);tt=vfToTT(r.conts);
        const n0=tt.pts[0].length;for(let k=1;k<masters.length;k++)if(tt.pts[k].length!==n0)throw new Error('point count mismatch');
      }catch(e){ /* аварийный путь (не должен срабатывать): глиф без вариаций по форме, в отчёт попадает как static */
        const c0=masters[def];tt=vfToTT(c0.map(c=>masters.map(()=>c.segs)));r={collapsed:0,stat:true};fallbacks.push(names[gi]+':STATIC('+(e&&e.message)+')');extras=[];
      }
      const n=tt.pts[0].length;
      if(!yb)yb=tt.pts.slice(0,NM).map(P=>P.reduce((a,p)=>[Math.min(a[0],p[1]),Math.max(a[1],p[1])],[1e9,-1e9]));
      rec={n,ends:tt.ends,pts:tt.pts,coords,def,model:vfModel(coords,def),adv:adv4,advv,collapsed:r.collapsed,tests:plan.tests};
      if(r.stat)break;
      if(extras.length>=VF_MAX_EXTRA)break;
      const bad=vfDefect(rec);if(bad==null)break;
      /* промежуточный мастер из движка на проблемном весе — шов исчезает (sparse master в gvar) */
      if(opts.tick)await opts.tick(styleKey,(warm?ng:0)+gi,TOT);
      const eloc=plan.locOf(bad),w=Math.round(eloc.wght),est=vfxStyleState(styleKey,state,eloc);
      const ex=getAt(-1,est,uw?evalCore(adv4,bad.map((c,i)=>(plan.axes[i].tag==='wght'||plan.axes[i].tag==='slnt')?0:c)):null);
      masters=masters.slice();coords=coords.slice();advv=advv.slice();
      masters.push(ex.cs);coords.push(bad);advv.push(evalCore(adv4,bad));
      extras.push(plan.axes.map((a,i)=>a.tag+Math.round(eloc[a.tag]*10)/10).join('/'));
    }
    /* дефект остался и после добавочных мастеров: глиф отказывается от самых капризных осей (сначала opsz — самый тонкий эффект, потом wdth, slnt и их пары) —
       контур никогда не ломается, у такого знака меняется только advance (HVAR) */
    if(rec.n&&!rec.stat&&A>1&&vfDefect(rec)!=null){
      let fixed=false;
      for(const drop of [['opsz'],['slnt'],['wdth'],['opsz','slnt'],['opsz','wdth'],['slnt','wdth'],['opsz','wdth','slnt']]){
        const di=drop.map(t=>plan.axes.findIndex(a=>a.tag===t)).filter(i=>i>=0);if(!di.length)continue;
        const keep=coords.map((c,i)=>i).filter(i=>di.every(a=>coords[i][a]===0));
        if(keep.length===coords.length)continue;
        try{
          const c2=keep.map(i=>coords[i]),r2=vfMatchGlyph(keep.map(i=>masters[i]),c2,def),t2=vfToTT(r2.conts);
          if(t2.pts.some(P=>P.length!==t2.pts[0].length))continue;
          const rc={n:t2.pts[0].length,ends:t2.ends,pts:t2.pts,coords:c2,def,model:vfModel(c2,def),adv:adv4,advv:keep.map(i=>advv[i]),collapsed:r2.collapsed,tests:plan.tests};
          if(vfDefect(rc)==null){rec=rc;fixed=true;fallbacks.push(names[gi]+':axes-'+drop.join('-'));break;}
        }catch(e){}
      }
      if(!fixed){const t2=vfToTT(masters[def].map(c=>[c.segs]));
        rec={n:t2.pts[0].length,ends:t2.ends,pts:t2.pts,coords:[coords[def]],def:0,model:vfModel([coords[def]],0),adv:adv4,advv:[advv[def]],collapsed:0,tests:plan.tests};
        fallbacks.push(names[gi]+':STATIC(defect)');}
    }
    rec.yb=yb;
    if(rec.collapsed)fallbacks.push(names[gi]+':collapsed');
    if(extras.length){extraStat.glyphs++;extraStat.masters+=extras.length;fallbacks.push(names[gi]+':+'+extras.join(','));}
    rec.name=names[gi];gl.push(rec);
  }
  /* glyf/loca/hmtx по умолчанию (Regular) */
  const glyf=new BW(),loca=[],hm=new BW();
  let gxMin=1e9,gyMin=1e9,gxMax=-1e9,gyMax=-1e9,maxPts=0,maxCont=0,advMax=0,minLsb=1e9,minRsb=1e9,xMaxExt=-1e9;
  const yb=[1e9,-1e9];
  const perMasterY=plan.masters.map(()=>[1e9,-1e9]);
  for(const g of gl){
    loca.push(glyf.len);const P=g.pts[g.def];let xMin=0,yMin=0,xMax=0,yMax=0;
    if(g.yb)g.yb.forEach((y,m)=>{perMasterY[m][0]=Math.min(perMasterY[m][0],y[0]);perMasterY[m][1]=Math.max(perMasterY[m][1],y[1]);});
    if(P.length){
      xMin=1e9;yMin=1e9;xMax=-1e9;yMax=-1e9;P.forEach(p=>{xMin=Math.min(xMin,p[0]);yMin=Math.min(yMin,p[1]);xMax=Math.max(xMax,p[0]);yMax=Math.max(yMax,p[1]);});
      /* bbox по умолчанию; для глифа в head берём объединение мастеров */
      gxMin=Math.min(gxMin,xMin);gyMin=Math.min(gyMin,yMin);gxMax=Math.max(gxMax,xMax);gyMax=Math.max(gyMax,yMax);
      maxPts=Math.max(maxPts,P.length);maxCont=Math.max(maxCont,g.ends.length);
      glyf.i16(g.ends.length).i16(xMin).i16(yMin).i16(xMax).i16(yMax);
      g.ends.forEach(e=>glyf.u16(e));glyf.u16(0);
      const fl=[],xs=[],ys=[];let px=0,py=0;
      P.forEach((p,i)=>{let f=p[2]?1:0;if(i===0)f|=0x40; /* OVERLAP_SIMPLE на первой точке */fl.push(f);xs.push(p[0]-px);ys.push(p[1]-py);px=p[0];py=p[1];});
      fl.forEach(f=>glyf.u8(f));xs.forEach(v=>glyf.i16(v));ys.forEach(v=>glyf.i16(v));glyf.pad4();
    }
    const adv=g.adv[def];
    hm.u16(adv).i16(P.length?xMin:0);advMax=Math.max(advMax,adv);
    if(P.length){minLsb=Math.min(minLsb,xMin);minRsb=Math.min(minRsb,adv-xMax);xMaxExt=Math.max(xMaxExt,xMax);}
  }
  loca.push(glyf.len);
  const locaT=new BW();loca.forEach(v=>locaT.u32(v));
  /* head: bbox, indexToLocFormat=1 (long) уже в статике */
  const head=T['head'].slice();
  const w16=(arr,o,v)=>{v=v<0?v+65536:v;arr[o]=(v>>8)&255;arr[o+1]=v&255;};
  w16(head,36,gxMin);w16(head,38,gyMin);w16(head,40,gxMax);w16(head,42,gyMax);
  const hhea=T['hhea'].slice();w16(hhea,10,advMax);w16(hhea,12,minLsb);w16(hhea,14,minRsb);w16(hhea,16,xMaxExt);
  const maxp=T['maxp'].slice();w16(maxp,6,maxPts);w16(maxp,8,maxCont);
  /* name: добавить оси и экземпляры */
  const nrec=vfParseName(T['name']);
  const nm17=(nrec.find(r=>r.id===17)||{}).s||'Regular';
  const vnm=vfxNames(plan,nrec.map(r=>r.id),italic);
  nrec.push(...vnm.recs);
  void nm17;
  const tables={'OS/2':T['OS/2'],'cmap':T['cmap'],'gasp':T['gasp'],'glyf':glyf.b,'head':head,'hhea':hhea,'hmtx':hm.b,'loca':locaT.b,'maxp':maxp,'name':vfBuildName(nrec),'post':T['post'],
    'fvar':vfBuildFvar(plan,vnm),'avar':vfBuildAvar(plan),'gvar':vfBuildGvar(gl,A),'HVAR':vfBuildHvar(gl.map(g=>g.adv),coreModel),'STAT':vfxStat(plan,vnm,italic)};
  if(T['GSUB'])tables['GSUB']=T['GSUB'];if(T['GPOS'])tables['GPOS']=T['GPOS'];
  /* вертикальные метрики: объединение по мастерам */
  const VMs=perMasterY.map((y,k)=>fontVMetrics(MS[k].styles[styleKey].p,y[0],y[1]));
  /* integration (d): Pixel VF masters are pinned to the Regular extents while the static weights overshoot (Black 986/-232): hhea/OS2 follow the static family (union of its 8 files) */
  const VMpx=!opts.vm&&CUR_FONT==='pixel'?pixelStaticVM(state):null;
  const VM=opts.vm||VMpx||unionVMetrics(VMs);
  let bytes=vfAssemble(tables);
  bytes=setVMetrics(bytes,VM);
  const psName=stat.psName.replace(/-.*$/,'')+'-VF'+(italic?'Italic':'');
  return {bytes,fileName:psName+'.ttf',glyphCount:ng,metrics:VM,vmList:VMpx?[VMpx]:VMs,fallbacks,psName,axes:plan.axes.map(a=>a.tag),axisInfo:plan.axes.map(a=>({tag:a.tag,min:a.min,def:a.def,max:a.max})),axesDropped:plan.dropped,masters:NM,uniwidth:uw?[...new Set(uwTight)]:null};
}
/* оба начертания с общими вертикальными метриками (как у семейства) */
async function buildVariablePair(state,opts){
  opts=opts||{};const rs={};
  for(const k of ['regular','italic'])rs[k]=await buildVariableTTF(k,state,opts);
  const VM=unionVMetrics(['regular','italic'].flatMap(k=>rs[k].vmList));
  for(const k of ['regular','italic'])rs[k].bytes=setVMetrics(rs[k].bytes,VM);
  return rs;
}
