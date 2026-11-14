/* ===== Декоративные начертания (d1): контурное, оконтуренное, оттенённое, выворотное =====
   Геометрия выводится из контуров любого шрифта: кривые → ломаная (адаптивно) → смещение ломаной кусками
   (прямоугольники по рёбрам + клинья в углах) → булева алгебра по правилу winding на плоском графе пересечений
   → подгонка кривых (csgFit) с узлами на экстремумах. Выворотное строится без булевой алгебры (прямоугольник − знак).
   Вход:  opts.decorate = {style, params}; style ∈ outline | inline_in | inline_out | shadow | cameo.
   Параметры — в процентах основного штриха (stem), поэтому веса семейства получают пропорциональные линии;
   верхние пределы берутся из измеренной минимальной толщины штриха и ширины внутрибуквенных просветов. */
const DCS_STYLES={
  outline:{ru:'Контурное',suffix:'Outline',tip:'Только линия по контуру знака, середина пустая.'},
  inline_in:{ru:'Оконтуренное — внутренняя линия',suffix:'Inline',tip:'Чёрный знак с белой линией внутри, на расстоянии от края.'},
  inline_out:{ru:'Оконтуренное — внешняя обводка',suffix:'Inline Outer',tip:'Чёрный знак и вторая линия вокруг него через просвет.'},
  shadow:{ru:'Оттенённое',suffix:'Shadow',tip:'Знак с тенью-выдавкой под углом: сплошной, отделённой или штриховой.'},
  cameo:{ru:'Выворотное',suffix:'Cameo',tip:'Белая буква на чёрном прямоугольнике на каждый знак.'}
};
const DCS_DEF={
  outline:{w:14,join:'miter'},
  inline_in:{d:12,w:8,join:'miter'},
  inline_out:{g:9,w:9,join:'miter'},
  shadow:{angle:-45,depth:50,variant:'block',w:10,g:7,pitch:36,join:'miter'},
  cameo:{pad:16,round:0,gap:2}
};
/* ---------- ломаная из контура ---------- */
function dcFlat(c,tol){
  const n=c.nodes,L=n.length,pts=[];tol=tol||0.3;
  for(let i=0;i<L;i++){
    const a=n[i],b=n[(i+1)%L];pts.push([a.x,a.y]);
    const p1=a.b||a,p2=b.a||b;
    if((p1.x===a.x&&p1.y===a.y)&&(p2.x===b.x&&p2.y===b.y))continue;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1e-9;
    const d=Math.max(Math.abs((p1.x-a.x)*dy-(p1.y-a.y)*dx),Math.abs((p2.x-a.x)*dy-(p2.y-a.y)*dx))/len;
    const N=Math.max(2,Math.min(48,Math.ceil(Math.sqrt(0.75*d/tol))));
    for(let k=1;k<N;k++){const t=k/N,u=1-t;
      pts.push([u*u*u*a.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*b.y]);}
  }
  return pts;
}
function dcArea(P){let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1];}return s/2;}
/* контуры глифа → ориентированные многоугольники (внешние против часовой, дыры по часовой; чернила слева) */
function dcPolys(cs){
  const out=[];
  for(const c of cs){if(!c.nodes||c.nodes.length<3)continue;
    let P=dcFlat(c,0.45);if(P.length<3)continue;
    const a=dcArea(P);if(Math.abs(a)<0.5)continue;
    if((!!c.hole)===(a>0))P.reverse();
    out.push(P);}
  return out;
}
/* ---------- булева алгебра: плоский граф пересечений + winding ---------- */
function dcBool(groups,F,minArea){
  dcBool.drop=0;const G=groups.length,q3=v=>Math.round(v*1000)/1000;
  const X0=[],Y0=[],X1=[],Y1=[],SG=[];
  for(let g=0;g<G;g++)for(const P of groups[g]){
    const pts=[];
    for(const p of P){const x=q3(p[0]),y=q3(p[1]),l=pts[pts.length-1];if(l&&l[0]===x&&l[1]===y)continue;pts.push([x,y]);}
    while(pts.length>1&&pts[0][0]===pts[pts.length-1][0]&&pts[0][1]===pts[pts.length-1][1])pts.pop();
    if(pts.length<3)continue;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];X0.push(a[0]);Y0.push(a[1]);X1.push(b[0]);Y1.push(b[1]);SG.push(g);}
  }
  const N=X0.length;if(!N)return [];
  /* вершины на целочисленной сетке 1e-3 */
  const VX=[],VY=[],vmap=new Map();
  const vid=(x,y)=>{const k=Math.round(x*1e6)+','+Math.round(y*1e6);let v=vmap.get(k);if(v===undefined){v=VX.length;VX.push(x);VY.push(y);vmap.set(k,v);}return v;};
  const SV0=new Int32Array(N),SV1=new Int32Array(N);
  for(let i=0;i<N;i++){SV0[i]=vid(X0[i],Y0[i]);SV1[i]=vid(X1[i],Y1[i]);}
  /* сетка для поиска пересечений (CSR: счёт → префиксные суммы → заполнение) */
  const MNX=new Float64Array(N),MXX=new Float64Array(N),MNY=new Float64Array(N),MXY=new Float64Array(N);
  let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;
  for(let i=0;i<N;i++){MNX[i]=Math.min(X0[i],X1[i]);MXX[i]=Math.max(X0[i],X1[i]);MNY[i]=Math.min(Y0[i],Y1[i]);MXY[i]=Math.max(Y0[i],Y1[i]);
    if(MNX[i]<bx0)bx0=MNX[i];if(MXX[i]>bx1)bx1=MXX[i];if(MNY[i]<by0)by0=MNY[i];if(MXY[i]>by1)by1=MXY[i];}
  const C=24,gx0=Math.floor(bx0/C),gy0=Math.floor(by0/C),GW=Math.floor(bx1/C)-gx0+1,GH=Math.floor(by1/C)-gy0+1;
  const cstart=new Int32Array(GW*GH+1);
  for(let i=0;i<N;i++){const c0=Math.floor(MNX[i]/C)-gx0,c1=Math.floor(MXX[i]/C)-gx0,r0=Math.floor(MNY[i]/C)-gy0,r1=Math.floor(MXY[i]/C)-gy0;
    for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++)cstart[cy*GW+cx+1]++;}
  for(let k=0;k<GW*GH;k++)cstart[k+1]+=cstart[k];
  const citems=new Int32Array(cstart[GW*GH]),cfill=cstart.slice(0,GW*GH);
  for(let i=0;i<N;i++){const c0=Math.floor(MNX[i]/C)-gx0,c1=Math.floor(MXX[i]/C)-gx0,r0=Math.floor(MNY[i]/C)-gy0,r1=Math.floor(MXY[i]/C)-gy0;
    for(let cy=r0;cy<=r1;cy++)for(let cx=c0;cx<=c1;cx++)citems[cfill[cy*GW+cx]++]=i;}
  const spl=new Array(N);
  const addSplit=(i,t,v)=>{(spl[i]||(spl[i]=[])).push(t,v);};
  for(let cell=0;cell<GW*GH;cell++){
    const o0=cstart[cell],m=cstart[cell+1]-o0;if(m<2)continue;
    const cx=cell%GW+gx0,cy=Math.floor(cell/GW)+gy0;
    for(let a=0;a<m;a++){const i=citems[o0+a];
      const rx=X1[i]-X0[i],ry=Y1[i]-Y0[i];
      const ix0=MNX[i],ix1=MXX[i],iy0=MNY[i],iy1=MXY[i];
      for(let b=a+1;b<m;b++){const j=citems[o0+b];
        if(MXX[j]<ix0-2e-3||MNX[j]>ix1+2e-3||MXY[j]<iy0-2e-3||MNY[j]>iy1+2e-3)continue;
        {/* вершина, лежащая на чужом ребре в пределах допуска (T-стык после округления): ребро режется в этой вершине — «snap rounding» */
          const li0=rx*rx+ry*ry,sx0=X1[j]-X0[j],sy0=Y1[j]-Y0[j],lj0=sx0*sx0+sy0*sy0;
          for(let k=0;k<2;k++){const v=k?SV1[j]:SV0[j];if(v===SV0[i]||v===SV1[i])continue;const x=k?X1[j]:X0[j],y=k?Y1[j]:Y0[j];
            if(Math.floor(x/C)!==cx||Math.floor(y/C)!==cy)continue;
            const t=((x-X0[i])*rx+(y-Y0[i])*ry)/li0;if(t<=1e-9||t>=1-1e-9)continue;
            const dx=X0[i]+t*rx-x,dy=Y0[i]+t*ry-y;if(dx*dx+dy*dy<2.56e-6)addSplit(i,t,v);}
          for(let k=0;k<2;k++){const v=k?SV1[i]:SV0[i];if(v===SV0[j]||v===SV1[j])continue;const x=k?X1[i]:X0[i],y=k?Y1[i]:Y0[i];
            if(Math.floor(x/C)!==cx||Math.floor(y/C)!==cy)continue;
            const u=((x-X0[j])*sx0+(y-Y0[j])*sy0)/lj0;if(u<=1e-9||u>=1-1e-9)continue;
            const dx=X0[j]+u*sx0-x,dy=Y0[j]+u*sy0-y;if(dx*dx+dy*dy<2.56e-6)addSplit(j,u,v);}
        }
        if(SV0[i]===SV0[j]||SV0[i]===SV1[j]||SV1[i]===SV0[j]||SV1[i]===SV1[j]){
          /* соседние рёбра с общей вершиной: пересекаются только при коллинеарном наложении */
          const sx=X1[j]-X0[j],sy=Y1[j]-Y0[j];
          if(Math.abs(rx*sy-ry*sx)>1e-9*(Math.hypot(rx,ry)*Math.hypot(sx,sy)))continue;
        }
        const sx=X1[j]-X0[j],sy=Y1[j]-Y0[j],den=rx*sy-ry*sx,qx=X0[j]-X0[i],qy=Y0[j]-Y0[i];
        const li=rx*rx+ry*ry,lj=sx*sx+sy*sy;
        if(den*den>1e-18*li*lj){
          const t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den,e=1e-9;
          if(t<-e||t>1+e||u<-e||u>1+e)continue;
          let px,py;
          if(t<=e){px=X0[i];py=Y0[i];}else if(t>=1-e){px=X1[i];py=Y1[i];}
          else if(u<=e){px=X0[j];py=Y0[j];}else if(u>=1-e){px=X1[j];py=Y1[j];}
          else{px=X0[i]+t*rx;py=Y0[i]+t*ry;}
          if(Math.floor(px/C)!==cx||Math.floor(py/C)!==cy)continue;
          const v=vid(px,py);
          if(t>e&&t<1-e&&v!==SV0[i]&&v!==SV1[i])addSplit(i,t,v);
          if(u>e&&u<1-e&&v!==SV0[j]&&v!==SV1[j])addSplit(j,u,v);
        }else{
          /* параллельные: только коллинеарное наложение */
          const dist=Math.abs(qx*ry-qy*rx)/Math.sqrt(li||1);
          if(dist>2e-3)continue;
          const ends=[[SV0[j],X0[j],Y0[j]],[SV1[j],X1[j],Y1[j]]];
          for(const [v,x,y] of ends){const t=((x-X0[i])*rx+(y-Y0[i])*ry)/li;
            if(t>1e-9&&t<1-1e-9&&Math.floor(x/C)===cx&&Math.floor(y/C)===cy&&v!==SV0[i]&&v!==SV1[i])addSplit(i,t,v);}
          const ends2=[[SV0[i],X0[i],Y0[i]],[SV1[i],X1[i],Y1[i]]];
          for(const [v,x,y] of ends2){const u=((x-X0[j])*sx+(y-Y0[j])*sy)/lj;
            if(u>1e-9&&u<1-1e-9&&Math.floor(x/C)===cx&&Math.floor(y/C)===cy&&v!==SV0[j]&&v!==SV1[j])addSplit(j,u,v);}
        }
      }
    }
  }
  /* подрёбра: каждое ребро режется в вершинах пересечений; дальше всё считается по ним (согласованная геометрия после округления) */
  const EA0=[],EB0=[],EG0=[];
  for(let i=0;i<N;i++){
    const s=spl[i];
    if(!s){EA0.push(SV0[i]);EB0.push(SV1[i]);EG0.push(SG[i]);continue;}
    const arr=[];for(let k=0;k<s.length;k+=2)arr.push([s[k],s[k+1]]);arr.sort((p,r)=>p[0]-r[0]);
    let prev=SV0[i];for(const [t,v] of arr){if(v===prev)continue;EA0.push(prev);EB0.push(v);EG0.push(SG[i]);prev=v;}
    if(prev!==SV1[i]){EA0.push(prev);EB0.push(SV1[i]);EG0.push(SG[i]);}
  }
  const NE=EA0.length,QX0=new Float64Array(NE),QY0=new Float64Array(NE),QX1=new Float64Array(NE),QY1=new Float64Array(NE);
  for(let k=0;k<NE;k++){QX0[k]=VX[EA0[k]];QY0[k]=VY[EA0[k]];QX1[k]=VX[EB0[k]];QY1[k]=VY[EB0[k]];}
  /* полосы по Y для луча */
  const BH=8,bands=new Map();
  for(let k=0;k<NE;k++){if(QY0[k]===QY1[k])continue;const b0=Math.floor(Math.min(QY0[k],QY1[k])/BH),b1=Math.floor(Math.max(QY0[k],QY1[k])/BH);
    for(let b=b0;b<=b1;b++){let l=bands.get(b);if(!l)bands.set(b,l=[]);l.push(k);}}
  const wL=new Int32Array(G),wR=new Int32Array(G);
  const wind=(px,py,w)=>{w.fill(0);const l=bands.get(Math.floor(py/BH));if(!l)return;
    for(let q=0;q<l.length;q++){const k=l[q],y0=QY0[k],y1=QY1[k];
      if((y0<=py)!==(y1<=py)){const x=QX0[k]+(py-y0)*(QX1[k]-QX0[k])/(y1-y0);if(x>px)w[EG0[k]]+=y1>y0?1:-1;}}};
  /* отбор по заливке слева/справа */
  const EA=[],EB=[],seen=new Set(),done=new Set();
  const consider=(va,vb)=>{
    if(va===vb)return;
    const uk=va<vb?va*1048576+vb:vb*1048576+va;if(done.has(uk))return;done.add(uk);
    const ax=VX[va],ay=VY[va],bx=VX[vb],by=VY[vb],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
    const ep=1e-5,nx=-dy/len*ep,ny=dx/len*ep,mx=(ax+bx)/2,my=(ay+by)/2;
    wind(mx+nx,my+ny,wL);wind(mx-nx,my-ny,wR);
    const fl=F(wL),fr=F(wR);if(fl===fr)return;
    const a=fl?va:vb,b=fl?vb:va,key=a*1048576+b;
    if(seen.has(key))return;seen.add(key);EA.push(a);EB.push(b);
  };
  for(let k=0;k<NE;k++)consider(EA0[k],EB0[k]);
  /* сборка петель: заливка слева, на развилке — самый левый поворот */
  const nV=VX.length,out=new Array(nV);
  for(let e=0;e<EA.length;e++){(out[EA[e]]||(out[EA[e]]=[])).push(e);}
  const used=new Uint8Array(EA.length),loops=[];
  for(let e0=0;e0<EA.length;e0++){
    if(used[e0])continue;
    const start=EA[e0],path=[];let e=e0,ok=false,guard=0;
    while(guard++<200000){
      used[e]=1;path.push(EA[e]);const v=EB[e];
      if(v===start){ok=true;break;}
      const cand=(out[v]||[]).filter(k=>!used[k]);
      if(!cand.length)break;
      if(cand.length===1){e=cand[0];continue;}
      const dx=VX[v]-VX[EA[e]],dy=VY[v]-VY[EA[e]];let best=-9,pick=cand[0];
      for(const k of cand){const ex=VX[EB[k]]-VX[v],ey=VY[EB[k]]-VY[v];const ang=Math.atan2(dx*ey-dy*ex,dx*ex+dy*ey);if(ang>best){best=ang;pick=k;}}
      e=pick;
    }
    if(!ok||path.length<3){dcBool.drop=(dcBool.drop||0)+1;continue;}
    const P=path.map(v=>[VX[v],VY[v]]);
    const la=Math.abs(dcArea(P));if(la<(minArea==null?1:minArea))continue;
    {let pr=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];pr+=Math.hypot(b[0]-a[0],b[1]-a[1]);}if(2*la/pr<1.2)continue;} /* волосяные обрывки */
    loops.push(P);
  }
  dcBool.stat={N,edges:EA.length,loops:loops.length,V:nV};
  return loops;
}
/* ---------- подгонка кривых ---------- */
/* Рамер—Дуглас—Пекер по индексам для замкнутой ломаной: возвращает отсортированный список сохранённых индексов */
function dcRDPi(P,eps){
  const n=P.length;if(n<4)return P.map((_,i)=>i);
  let i1=0,dm=-1;for(let i=1;i<n;i++){const d=(P[i][0]-P[0][0])**2+(P[i][1]-P[0][1])**2;if(d>dm){dm=d;i1=i;}}
  const keep=new Uint8Array(n);keep[0]=keep[i1]=1;
  const rec=(a,b)=>{const A=P[a%n],B=P[b%n];const dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-9;let mx=-1,mi=-1;
    for(let k=a+1;k<b;k++){const q=P[k%n];const d=Math.abs((q[0]-A[0])*dy-(q[1]-A[1])*dx)/L;if(d>mx){mx=d;mi=k;}}
    if(mx>eps){keep[mi%n]=1;rec(a,mi);rec(mi,b);}};
  rec(0,i1);rec(i1,n);
  const out=[];for(let i=0;i<n;i++)if(keep[i])out.push(i);return out;}
/* ломаная → узлы (углы, прямые, кривые Безье); точки кривых берутся из исходной плотной ломаной */
function dcFit(L0){
  /* убрать почти совпадающие соседние точки */
  const L=[];for(const p of L0){const l=L[L.length-1];if(!l||Math.abs(p[0]-l[0])+Math.abs(p[1]-l[1])>0.02)L.push(p);}
  while(L.length>2&&Math.abs(L[0][0]-L[L.length-1][0])+Math.abs(L[0][1]-L[L.length-1][1])<=0.02)L.pop();
  const N=L.length;if(N<3)return null;
  const K=dcRDPi(L,0.3),n=K.length;if(n<3)return null;
  const P=K.map(i=>L[i]);
  const dir=i=>vnorm(v2(P[(i+1)%n],P[i]));
  const corner=new Uint8Array(n);
  for(let i=0;i<n;i++){const a=dir((i-1+n)%n),b=dir(i);const ang=Math.acos(Math.max(-1,Math.min(1,vdot(a,b))))*180/Math.PI;if(ang>38)corner[i]=1;}
  const slen=i=>vlen(v2(P[(i+1)%n],P[i]));
  const lineSeg=new Uint8Array(n);
  for(let i=0;i<n;i++){const d=dir(i),Ln=slen(i);const ax=Math.abs(d[0])>0.9994||Math.abs(d[1])>0.9994;
    /* отрезок: длинный, либо между двумя углами без промежуточных точек */
    if((ax&&Ln>=14)||Ln>=50)lineSeg[i]=1;}
  for(let i=0;i<n;i++)if(lineSeg[i]){corner[i]=corner[i]||2;corner[(i+1)%n]=corner[(i+1)%n]||2;}
  let s0=-1;for(let i=0;i<n;i++)if(corner[i]){s0=i;break;}
  let smooth=false;if(s0<0){smooth=true;let li=0;for(let i=1;i<n;i++)if(P[i][0]<P[li][0])li=i;s0=li;}
  const order=[];for(let k=0;k<=n;k++)order.push((s0+k)%n);
  const runs=[];let cur=[order[0]];
  for(let k=1;k<=n;k++){const i=order[k];cur.push(i);if(k===n||corner[i]){runs.push(cur);cur=[i];}}
  const beziers=[];
  for(const run of runs){
    const ia=run[0],ib=run[run.length-1];
    /* исходные точки между K[ia] и K[ib] */
    const pts=[];let j=K[ia];const je=K[ib];pts.push(L[j]);
    let guard=0;do{j=(j+1)%N;pts.push(L[j]);}while(j!==je&&guard++<N+2); /* замкнутый обход (ia===ib) — полный круг */
    if(run.length===2){beziers.push({line:true,b:[pts[0],pts[0],pts[pts.length-1],pts[pts.length-1]]});continue;}
    const tA=()=>{if(corner[ia]===2&&lineSeg[(ia-1+n)%n])return dir((ia-1+n)%n);if(smooth&&!corner[ia])return vnorm(v2(P[(ia+1)%n],P[(ia-1+n)%n]));return vnorm(v2(pts[Math.min(pts.length-1,2)],pts[0]));};
    const tB=()=>{if(corner[ib]===2&&lineSeg[ib]){const d=dir(ib);return [-d[0],-d[1]];}if(smooth&&!corner[ib])return vnorm(v2(P[(ib-1+n)%n],P[(ib+1)%n]));return vnorm(v2(pts[Math.max(0,pts.length-3)],pts[pts.length-1]));};
    const tl=tA(),tr=tB();
    for(const bz0 of fitCubic(pts,tl,tr,0.6)){
      const A=bz0[0],B=bz0[3],Ln=vlen(v2(B,A))||1;const dev=q=>Math.abs((q[0]-A[0])*(B[1]-A[1])-(q[1]-A[1])*(B[0]-A[0]))/Ln;
      if(dev(bz0[1])<0.5&&dev(bz0[2])<0.5){beziers.push({line:true,b:[A,A,B,B]});continue;}
      for(const sb of extremaSplit(bz0))beziers.push({b:sb});}}
  for(let k=beziers.length-1;k>0&&beziers.length>2;k--){const p=beziers[k-1],q=beziers[k];if(!p.line||!q.line)continue;
    const d1=vnorm(v2(p.b[3],p.b[0])),d2=vnorm(v2(q.b[3],q.b[0]));if(vdot(d1,d2)>0.9995){p.b=[p.b[0],p.b[0],q.b[3],q.b[3]];beziers.splice(k,1);}}
  const out=[];
  for(let k=0;k<beziers.length;k++){const B=beziers[k].b,isL=beziers[k].line;
    const nd={x:B[0][0],y:B[0][1],a:null,b:isL?null:{x:B[1][0],y:B[1][1]}};
    const prv=beziers[(k-1+beziers.length)%beziers.length];if(!prv.line)nd.a={x:prv.b[2][0],y:prv.b[2][1]};
    out.push(nd);}
  for(const nd of out){for(const h of ['a','b']){const q=nd[h];if(!q)continue;const dx=Math.abs(q.x-nd.x),dy=Math.abs(q.y-nd.y);
      if(dy<dx*0.08)q.y=nd.y;else if(dx<dy*0.08)q.x=nd.x;}}
  const rd=v=>Math.round(v*10)/10;
  for(const nd of out){nd.x=rd(nd.x);nd.y=rd(nd.y);if(nd.a){nd.a.x=rd(nd.a.x);nd.a.y=rd(nd.a.y);}if(nd.b){nd.b.x=rd(nd.b.x);nd.b.y=rd(nd.b.y);}}
  return out.length>=2?out:null;}
function dcFitLoops(loops){
  const cs=[];
  for(const P of loops){
    const a=dcArea(P);
    const nodes=dcFit(P);if(!nodes||nodes.length<2){if(Math.abs(a)>20)dcFitLoops.lost=(dcFitLoops.lost||0)+1;continue;}
    if(Math.abs(a)<8)continue;
    cs.push({hole:a<0,nodes});
  }
  return cs;
}
/* ---------- куски смещения ---------- */
/* прямоугольник по ребру a→b на сторону s (+1 слева=внутрь, −1 справа=наружу), плюс клин в вершине, если там зазор */
function dcBand(polys,r,side,join){
  const out=[];
  for(const P of polys){
    const n=P.length,nx=new Array(n),ny=new Array(n),dxs=new Array(n),dys=new Array(n);
    for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];let dx=b[0]-a[0],dy=b[1]-a[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;dxs[i]=dx;dys[i]=dy;nx[i]=-dy*side;ny[i]=dx*side;}
    for(let i=0;i<n;i++){
      const a=P[i],b=P[(i+1)%n];if(Math.hypot(b[0]-a[0],b[1]-a[1])<1e-6)continue;
      const ax=a[0]+nx[i]*r,ay=a[1]+ny[i]*r,bx=b[0]+nx[i]*r,by=b[1]+ny[i]*r;
      out.push(side>0?[a,b,[bx,by],[ax,ay]]:[a,[ax,ay],[bx,by],b]);
      /* клин в вершине b между рёбрами i и i+1 */
      const j=(i+1)%n,cr=dxs[i]*dys[j]-dys[i]*dxs[j];
      const gap=side>0?cr<-1e-9:cr>1e-9;/* зазор между смещёнными кромками */
      if(!gap)continue;
      const cx=b[0],cy=b[1],p1=[cx+nx[i]*r,cy+ny[i]*r],p2=[cx+nx[j]*r,cy+ny[j]*r];
      const dot=nx[i]*nx[j]+ny[i]*ny[j],ang=Math.acos(Math.max(-1,Math.min(1,dot)));
      let poly;
      const lim=join==='round'?0:2.6;
      if(lim&&ang<Math.PI-0.35&&1/Math.cos(ang/2)<=lim){
        const mlen=r/Math.cos(ang/2),mx=nx[i]+nx[j],my=ny[i]+ny[j],ml=Math.hypot(mx,my)||1;
        poly=[[cx,cy],p1,[cx+mx/ml*mlen,cy+my/ml*mlen],p2];
      }else{
        poly=[[cx,cy],p1];const steps=Math.max(1,Math.ceil(ang/0.26));
        const a1=Math.atan2(ny[i],nx[i]);let da=Math.atan2(ny[j],nx[j])-a1;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;
        for(let k=1;k<steps;k++){const t=a1+da*k/steps;poly.push([cx+Math.cos(t)*r,cy+Math.sin(t)*r]);}
        poly.push(p2);
      }
      if(dcArea(poly)<0)poly.reverse();
      out.push(poly);
    }
  }
  return out;
}
/* выдавка: параллелограммы по рёбрам + копия знака (все ориентированы положительно) */
function dcSweep(polys,vx,vy){
  const out=[];
  for(const P of polys){
    const n=P.length;
    out.push(P.map(p=>p.slice()));out.push(P.map(p=>[p[0]+vx,p[1]+vy]));
    for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];const cr=(b[0]-a[0])*vy-(b[1]-a[1])*vx;if(Math.abs(cr)<1e-6)continue;
      const q=[a,b,[b[0]+vx,b[1]+vy],[a[0]+vx,a[1]+vy]];if(cr<0)q.reverse();out.push(q);}
  }
  return out;
}
/* полосы штриховки: параллельные прямым x·cos+y·sin = k·pitch, ширина pitch/2 */
function dcStripes(bb,ang,pitch){
  const out=[],c=Math.cos(ang),s=Math.sin(ang),cx=(bb[0]+bb[2])/2,cy=(bb[1]+bb[3])/2,R=Math.hypot(bb[2]-bb[0],bb[3]-bb[1])/2+pitch;
  const n=Math.ceil(R/pitch);
  for(let k=-n;k<=n;k++){const o=k*pitch,w=pitch/2;
    /* полоса вдоль направления (c,s), смещена на o по нормали (−s,c) */
    const ux=c,uy=s,vx=-s,vy=c;
    const P=(a,b)=>[cx+ux*a+vx*b,cy+uy*a+vy*b];
    out.push([P(-R,o),P(R,o),P(R,o+w),P(-R,o+w)]);}
  return out;
}
/* ---------- измерение шрифта: толщина штриха и ширина просветов ---------- */
function dcMeasure(sets){
  /* sets: массив cs; луч от середин рёбер внутрь (толщина) и из дыр наружу чернил (просвет) */
  const th=[],gp=[];
  for(const cs of sets){
    const polys=[];const hole=[];
    for(const c of cs){if(!c.nodes||c.nodes.length<3)continue;let P=dcFlat(c,0.5);const a=dcArea(P);if(Math.abs(a)<0.5)continue;if((!!c.hole)===(a>0))P.reverse();polys.push(P);hole.push(!!c.hole);}
    const X0=[],Y0=[],X1=[],Y1=[];
    polys.forEach(P=>{for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];X0.push(a[0]);Y0.push(a[1]);X1.push(b[0]);Y1.push(b[1]);}});
    const N=X0.length;
    const hit=(px,py,dx,dy,skip)=>{let best=1e9;
      for(let i=0;i<N;i++){if(i===skip)continue;const sx=X1[i]-X0[i],sy=Y1[i]-Y0[i],den=dx*sy-dy*sx;if(Math.abs(den)<1e-12)continue;
        const qx=X0[i]-px,qy=Y0[i]-py,t=(qx*sy-qy*sx)/den,u=(qx*dy-qy*dx)/den;if(t>0.5&&u>=0&&u<=1&&t<best)best=t;}return best;};
    let ei=0;
    polys.forEach((P,pi)=>{const n=P.length;let acc=0;
      for(let i=0;i<n;i++,ei++){const a=P[i],b=P[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);acc+=l;if(l<2||acc<18)continue;acc=0;
        const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,nx=-dy/l,ny=dx/l;
        const t=hit(mx,my,nx,ny,ei);if(t<1e8)th.push(t);
        if(hole[pi]){const g=hit(mx,my,-nx,-ny,ei);if(g<1e8)gp.push(g);}}});
  }
  const pc=(a,p,d)=>{if(!a.length)return d;a=a.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*p))];};
  return {tmin:pc(th,0.15,60),tmed:pc(th,0.5,100),cmin:pc(gp,0.15,120)};
}
const DCS_SAMPLE='оеaнилжсьФЯ'.split('');
const DCS_MCACHE=new Map();
function decoMeasureSt(st,edits,fid){
  const key=(fid||CUR_FONT)+'|'+JSON.stringify(st.p).slice(0,400);
  if(DCS_MCACHE.has(key))return DCS_MCACHE.get(key);
  const sets=[];for(const ch of DCS_SAMPLE){try{const g=finalGlyph(ch,st,edits||{});if(g&&g.cs&&g.cs.length)sets.push(g.cs);}catch(e){}}
  const m=dcMeasure(sets);m.stem=st.p&&st.p.stem?Math.min(st.p.stem,m.tmed*1.6):m.tmed;
  if((fid||CUR_FONT)==='nit')m.stem=Math.max(m.stem,44);/* «Нить»: проценты штриха от линии в 20 u дали бы линии < 2 u (целые координаты): опорный штрих ≥ 44 u */
  if(DCS_MCACHE.size>40)DCS_MCACHE.clear();DCS_MCACHE.set(key,m);return m;
}
/* абсолютные параметры (единицы шрифта) из процентов штриха с пределами; lim — максимумы в процентах для интерфейса */
function decoLimits(style,m){
  const s=m.stem||m.tmed||100,pc=v=>Math.max(1,Math.floor(v/s*100));
  const L={outline:{w:[2,pc(m.tmin*0.45)]},
    inline_in:{d:[2,pc(m.tmin*0.3)],w:[2,pc(m.tmin*0.3)]},
    inline_out:{g:[2,pc(m.cmin*0.3)],w:[2,pc(m.cmin*0.3)]},
    shadow:{depth:[6,Math.min(140,pc(m.tmed*1.6))],w:[2,pc(m.tmin*0.4)],g:[2,pc(m.tmin*0.4)],pitch:[10,60]},
    cameo:{pad:[0,60],round:[0,100],gap:[0,20]}};
  return L[style]||{};
}
function dcResolve(spec,m){
  const style=spec.style,def=DCS_DEF[style]||{},P=Object.assign({},def,spec.params||{});
  const s=m.stem||m.tmed||100,L=decoLimits(style,m),R={style,join:P.join||'miter',variant:P.variant||'block',angle:+P.angle||0};
  for(const k of Object.keys(L)){const v=+(P[k]!=null?P[k]:def[k]);R[k]=Math.max(L[k][0],Math.min(L[k][1],isFinite(v)?v:def[k]))/100*s;}
  /* суммарное смещение внутренней линии: не больше трети толщины тонкого штриха с каждой стороны */
  if(style==='inline_in'){const lim=m.tmin*0.42,t=R.d+R.w;if(t>lim){R.d*=lim/t;R.w*=lim/t;}}
  if(style==='inline_out'){const lim=m.cmin*0.42,t=R.g+R.w;if(t>lim){R.g*=lim/t;R.w*=lim/t;}}
  if(style==='cameo'){R.pad=(P.pad!=null?P.pad:def.pad)/100*s;R.round=(P.round!=null?P.round:def.round)/100;R.gap=(P.gap!=null?P.gap:def.gap)/100*s;}
  if(style==='shadow'){R.depth=Math.max(R.depth,6);R.pitchAbs=Math.max(8,R.pitch);}
  return R;
}
/* ---------- один знак ---------- */
function dcBBox(polys){let a=1e9,b=1e9,c=-1e9,d=-1e9;for(const P of polys)for(const p of P){if(p[0]<a)a=p[0];if(p[0]>c)c=p[0];if(p[1]<b)b=p[1];if(p[1]>d)d=p[1];}return [a,b,c,d];}
function dcJit(polys,amp){
  if(!amp)return polys;
  return polys.map(P=>P.map(p=>{const h=Math.sin(Math.round(p[0]*1000)*12.9898+Math.round(p[1]*1000)*78.233)*43758.5453,h2=Math.sin(Math.round(p[0]*1000)*39.346+Math.round(p[1]*1000)*11.135)*24634.6345;
    return [p[0]+((h-Math.floor(h))-0.5)*2*amp,p[1]+((h2-Math.floor(h2))-0.5)*2*amp];}));
}
function dcShapeOnce(polys,R,scale){
  const st=R.style;let r=null;
  dcBool.drop=0;
  if(st==='outline'){
    const w=R.w*scale,B=dcBand(polys,w,1,R.join);
    r={loops:dcBool([polys,B],W=>W[0]>0&&W[1]>0),core:()=>dcBool([polys,B],W=>W[0]>0&&W[1]<=0,4)};
  }else if(st==='inline_in'){
    const d=R.d*scale,w=R.w*scale,B1=dcBand(polys,d,1,R.join),B2=dcBand(polys,d+w,1,R.join);
    r={loops:dcBool([polys,B1,B2],W=>W[0]>0&&(W[1]>0||W[2]<=0)),core:()=>dcBool([polys,B2],W=>W[0]>0&&W[1]<=0,4)};
  }else if(st==='inline_out'){
    const g=R.g*scale,w=R.w*scale,B1=dcBand(polys,g,-1,R.join),B2=dcBand(polys,g+w,-1,R.join);
    r={loops:dcBool([polys,B1,B2],W=>W[0]>0||(W[2]>0&&W[1]<=0)),core:null};
  }else if(st==='shadow'){
    const a=R.angle*Math.PI/180,vx=Math.cos(a)*R.depth*scale,vy=Math.sin(a)*R.depth*scale,SW=dcSweep(polys,vx,vy);
    if(R.variant==='block'){const B=dcBand(polys,R.w*scale,1,R.join);
      r={loops:dcBool([polys,B,SW],W=>W[2]>0&&!(W[0]>0&&W[1]<=0)),core:()=>dcBool([polys,B],W=>W[0]>0&&W[1]<=0,4)};}
    else{
      const B=dcBand(polys,R.g*scale,-1,R.join);
      if(R.variant==='hatch'){
        /* штриховка: сначала область тени, затем полосы только внутри неё */
        const sh=dcBool([polys,B,SW],W=>W[2]>0&&W[1]<=0&&W[0]<=0);
        const bb=dcBBox(SW),H=dcStripes(bb,a+Math.PI/2,R.pitchAbs*scale*(typeof CUR_FONT==='string'&&CUR_FONT==='tyaga'?2:1));/* «Тяга»: растянутые формы до ×6 шириной — шаг штриховки вдвое крупнее, иначе узлов втрое больше нормы (tests/deco_check.py: 7× обычных) */
        const hl=sh.length?dcBool([sh,H],W=>W[0]>0&&W[1]>0,18):[];
        const face=dcBool([polys],W=>W[0]>0);
        r={loops:face.concat(hl),core:null,hatch:1};
      }else r={loops:dcBool([polys,B,SW],W=>W[0]>0||(W[2]>0&&W[1]<=0)),core:null};
    }
  }
  if(r)r.bad=dcBool.drop;
  return r;
}
/* безопасность: контрольные проверки топологии; при провале линии ужимаются (до 6 раз по 0.78),
   при обрыве контура — повтор с микросдвигом вершин (устраняет вырожденные параллельные рёбра) */
function dcShape(polys,R){
  const area0=polys.reduce((s,P)=>s+dcArea(P),0);
  const holes0=polys.filter(P=>dcArea(P)<0).length;
  /* средняя толщина штриха 2S/P: у тонких знаков (точки, засечки, узкие овалы) проверяем, что середина не заполнилась */
  let per=0;for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];per+=Math.hypot(b[0]-a[0],b[1]-a[1]);}
  const Lmax=Math.max(R.w||0,(R.d||0)+(R.w||0)),small=2*Math.abs(polys.reduce((q,P)=>q+dcArea(P),0))/Math.max(per,1)<3.2*Lmax;
  let scale=1,best=null;
  const JIT=[R.style==='shadow'?0.03:0,0.03,0.07,0.15];
  for(let it=0;it<9;it++){
    let r=null,ji=0;
    for(;ji<JIT.length;ji++){r=dcShapeOnce(dcJit(polys,JIT[ji]),R,scale);if(!r||!r.bad)break;}
    if(!r)return null;
    dcShape.st=dcShape.st||{calls:0,bad:0,shrink:0};if(!it)dcShape.st.calls++;if(r.bad)dcShape.st.bad++;if(it)dcShape.st.shrink++;
    const cs=dcFitLoops(r.loops);
    let ok=cs.length>0&&!r.bad;
    if(ok&&r.core&&small){const core=r.core();const ca=core.reduce((s,P)=>s+Math.abs(dcArea(P)),0);if(ca<Math.max(30,0.03*area0))ok=false;}
    if(ok&&R.style==='inline_out'){const h=cs.filter(c=>c.hole&&Math.abs(area(c.nodes))>12).length;if(h<holes0)ok=false;}
    if(cs.length&&(!best||ok||(!r.bad&&best.bad)))best=cs,best.bad=!!r.bad;
    if(ok)return cs;
    if(r.bad&&it===8)dcShape.st.unres=(dcShape.st.unres||0)+1; /* обрыв после микросдвигов: другая ширина меняет геометрию и обычно снимает вырождение */
    scale*=0.78;
  }
  return best;
}
/* выворотное: прямоугольник (со скруглением) минус знак; знак — отверстия, внутренние просветы знака — острова */
function dcRectNodes(x0,y0,x1,y1,r){
  const N=(x,y,a,b)=>({x,y,a:a||null,b:b||null});
  if(r<=0.5)return [N(x0,y0),N(x1,y0),N(x1,y1),N(x0,y1)];
  const k=r*0.5523;
  return [
    N(x0+r,y0,{x:x0+r-k,y:y0}),
    N(x1-r,y0,null,{x:x1-r+k,y:y0}),
    N(x1,y0+r,{x:x1,y:y0+r-k}),
    N(x1,y1-r,null,{x:x1,y:y1-r+k}),
    N(x1-r,y1,{x:x1-r+k,y:y1}),
    N(x0+r,y1,null,{x:x0+r-k,y:y1}),
    N(x0,y1-r,{x:x0,y:y1-r+k}),
    N(x0,y0+r,null,{x:x0,y:y0+r-k})];
}
function dcCameo(g,R,box,pol){
  /* знак, выходящий за свой кегельный отрезок (рукописные/кистевые), расширяет прямоугольник: ничто не торчит наружу чёрным */
  /* пересекающиеся внешние контуры (рукописные знаки) при обращении дали бы удвоенную намотку: сначала объединяем */
  let src=g.cs;
  const ou=src.filter(c=>!c.hole).map(c=>{let a=1e9,b=-1e9,l=1e9,h=-1e9;for(const n of c.nodes){if(n.x<a)a=n.x;if(n.x>b)b=n.x;if(n.y<l)l=n.y;if(n.y>h)h=n.y;}return [a,b,l,h];});
  let ov=false;for(let i=0;i<ou.length&&!ov;i++)for(let j=i+1;j<ou.length;j++)if(ou[i][0]<ou[j][1]&&ou[j][0]<ou[i][1]&&ou[i][2]<ou[j][3]&&ou[j][2]<ou[i][3]){ov=true;break;}
  if(ov){const u=dcFitLoops(dcBool([dcPolys(src)],W=>W[0]>0));if(u&&u.length)src=u;}
  let lo=0,hi=g.adv;
  for(const c of src)for(const n of c.nodes)for(const q of [n,n.a,n.b]){if(!q)continue;if(q.x<lo)lo=q.x;if(q.x>hi)hi=q.x;}
  const px=R.pad,gap=R.gap/2,sh=px-lo,W=hi-lo+2*px,x0=gap,x1=W-gap,y0=box[0],y1=box[1];
  const r=Math.min(R.round*Math.min((x1-x0),(y1-y0))/2,(x1-x0)/2-0.01,(y1-y0)/2-0.01);
  const rect=dcRectNodes(x0,y0,x1,y1,Math.max(0,r));
  const cs=[{hole:false,nodes:rect}];
  for(const c of src){
    const nodes=reverseNodes(c.nodes.map(n=>({x:n.x+sh,y:n.y,a:n.a&&{x:n.a.x+sh,y:n.a.y},b:n.b&&{x:n.b.x+sh,y:n.b.y}})));
    cs.push({hole:!c.hole,nodes});
  }
  return {cs,adv:W};
}
/* ---------- набор знаков (вызывается из buildTTF) ---------- */
/* высота прямоугольника выворотного: метрики шрифта и все знаки + поля; одна и та же в экспорте и предпросмотре */
function decoBoxOf(p,csList,R){
  p=p||{};let lo=-(p.desc||200),hi=Math.max(p.asc||0,p.capH||0,100);
  for(const cs of csList){if(!cs)continue;for(const c of cs)for(const n of c.nodes){for(const q of [n,n.a,n.b]){if(!q)continue;if(q.y<lo)lo=q.y;if(q.y>hi)hi=q.y;}}}
  return [Math.floor(lo-R.pad),Math.ceil(hi+R.pad)];
}
function decoApply(glyphs,spec,st){
  const style=spec&&spec.style;if(!DCS_STYLES[style])return;
  const sets=[];
  for(const g of glyphs){if(g.ch&&DCS_SAMPLE.indexOf(g.ch)>=0&&g.cs&&g.cs.length)sets.push(g.cs);}
  const m0=dcMeasure(sets);m0.stem=st&&st.p&&st.p.stem?Math.min(st.p.stem,m0.tmed*1.6):m0.tmed;
  if(typeof CUR_FONT==='string'&&CUR_FONT==='nit')m0.stem=Math.max(m0.stem,44);
  const R=dcResolve(spec,m0);
  let box=null;
  if(style==='cameo')box=decoBoxOf(st&&st.p,glyphs.slice(1).map(g=>g.cs),R);
  for(let i=1;i<glyphs.length;i++){
    const g=glyphs[i];if(!g.cs||!g.cs.length)continue;
    g.cs=decoGlyphCs(g.cs,g.adv,R,box,g);
  }
}
function decoGlyphCs(cs,adv,R,box,g){
  /* g.cs/g.adv заменяются на месте; вне набора (предпросмотр) — возвращается новый объект */
  if(cs.some(c=>c.op||c.grp))cs=csgUnion(cs);
  if(R.style==='cameo'){const o=dcCameo({cs,adv},R,box);if(g){g.adv=o.adv;}return o.cs;}
  const polys=dcPolys(cs);if(!polys.length)return cs;
  let out=dcShape(polys,R);if(!out||!out.length)return cs;
  /* Renessa: wedge serifs and hairline tips leave overlapping loops after the curve fit — merge them (nonzero fill == even-odd) */
  if(typeof CUR_FONT==='string'&&((CUR_FONT==='renessa'&&R.style!=='shadow_hatch')||CUR_FONT==='nit')){/* «Нить»: линия 20 u — внутренний контур и штриховка дают петли-перекрытия и щепки, как у волосяных засечек Ренессы */try{const u=csgUnion(out);if(u&&u.length)out=u;}catch(e){}
    /* the merge can leave sliver loops (area < 6 u², mean width < 0.5 u after rounding to integers): drop them, they carry no ink */
    const keep=out.filter(c=>{const P=dcFlat(c,0.3);let L=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];L+=Math.hypot(q[0]-p[0],q[1]-p[1]);}const A=Math.abs(dcArea(P));return A>=12&&2*A/Math.max(L,1e-9)>=1.3;});
    if(keep.length)out=keep;}
  /* общий предохранитель: контур-щепка (площадь < 12 u² или средняя ширина < 1.3 u: с запасом над порогом 6 u² / 0.5 u из tests/deco_check.py, округление до целых) не несёт чернил; Вольт З в shadow_solid оставлял такой хвост */
  {const keep=out.filter(c=>{const P=dcFlat(c,0.3);let L=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];L+=Math.hypot(q[0]-p[0],q[1]-p[1]);}const A=Math.abs(dcArea(P));return A>=12&&2*A/Math.max(L,1e-9)>=1.3;});
    if(keep.length&&keep.length<out.length)out=keep;}
  /* поля: линия снаружи и тень выходят за кегельную площадку — сдвиг и расширение */
  let dl=0,dr=0;
  if(R.style==='inline_out'){dl=dr=Math.ceil(R.g+R.w);}
  else if(R.style==='shadow'){const vx=Math.cos(R.angle*Math.PI/180)*R.depth;dl=Math.max(0,-vx);dr=Math.max(0,vx);if(R.variant!=='block'){dl+=0;}dl=Math.ceil(dl);dr=Math.ceil(dr);}
  if(dl||dr){out=out.map(c=>({hole:c.hole,nodes:c.nodes.map(n=>({x:n.x+dl,y:n.y,a:n.a&&{x:n.a.x+dl,y:n.a.y},b:n.b&&{x:n.b.x+dl,y:n.b.y}}))}));}
  if(g)g.adv=adv+dl+dr;
  return out;
}
/* для buildTTF: имя семейства и начертание без кернинга у выворотного (поле знака другое) */
function decoFamilySuffix(spec){const d=DCS_STYLES[spec&&spec.style];return d?' '+d.suffix:'';}
function decoStyleSt(st,spec){
  if(spec&&spec.style==='cameo')return Object.assign({},st,{kern:{},ku:{}});
  return st;
}
/* для предпросмотра и тестов: знак целиком {cs,adv}; кеш по ключу */
const DCS_GCACHE=new Map();
function decoGlyph(g,spec,m,box,key){
  const R=dcResolve(spec,m);
  const k=key?key+'|'+JSON.stringify(R)+(box?box.join(','):''):null;
  if(k&&DCS_GCACHE.has(k))return DCS_GCACHE.get(k);
  const o={cs:g.cs,adv:g.adv};
  const cs=decoGlyphCs(g.cs,g.adv,R,box,o);
  const r={cs,adv:o.adv};
  if(k){if(DCS_GCACHE.size>1500)DCS_GCACHE.clear();DCS_GCACHE.set(k,r);}
  return r;
}
