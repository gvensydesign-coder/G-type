/* ---------- «Нить»: ломаные генератора -> гладкие штрихи скелета (узлы + ручки Безье), перо круглое -> skShape (смещение + объединение хоста) ----------
   Каждый штрих генератора (плотная ломаная ~8 ед. с рукой, стыками, перекрытием) подгоняется кубическими сегментами Эрмита:
   узлы по длине дуги, касательные по локальному направлению ломаной, узел добавляется там, где отклонение > TOL.
   Изломы (угол > 48° на окне 14 ед.) делят штрих на куски, которые перекрываются в вершине (круглое перо = круглый стык, как lineJoin=round). */
const NZ_TOL=0.12,NZ_NODE=48;
const nzDist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function nzCum(P){const c=[0];for(let i=1;i<P.length;i++)c.push(c[i-1]+nzDist(P[i],P[i-1]));return c;}
function nzAt(P,c,t){if(t<=0)return P[0].slice();const n=P.length;if(t>=c[n-1])return P[n-1].slice();let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<=t)lo=m;else hi=m;}
  const u=(t-c[lo])/((c[hi]-c[lo])||1);return [P[lo][0]+(P[hi][0]-P[lo][0])*u,P[lo][1]+(P[hi][1]-P[lo][1])*u];}
function nzTan(P,c,t,L,half){const a=nzAt(P,c,Math.max(0,t-half)),b=nzAt(P,c,Math.min(L,t+half));let dx=b[0]-a[0],dy=b[1]-a[1];const d=Math.hypot(dx,dy)||1;return [dx/d,dy/d];}
function nzBez(a,b,N0,N1,u){const w=1-u;return [w*w*w*a[0]+3*w*w*u*N0[0]+3*w*u*u*N1[0]+u*u*u*b[0],w*w*w*a[1]+3*w*w*u*N0[1]+3*w*u*u*N1[1]+u*u*u*b[1]];}
/* углы-изломы: индексы точек, где направление до и после (окно 14 ед.) расходится > 48° */
function nzCorners(P,c){const n=P.length,L=c[n-1],W=14,out=[];const ang=new Array(n).fill(0);
  for(let i=1;i<n-1;i++){if(c[i]<W*0.6||L-c[i]<W*0.6)continue;const A=nzAt(P,c,c[i]-W),B=nzAt(P,c,c[i]+W);
    const d1=[P[i][0]-A[0],P[i][1]-A[1]],d2=[B[0]-P[i][0],B[1]-P[i][1]],l1=Math.hypot(d1[0],d1[1]),l2=Math.hypot(d2[0],d2[1]);if(l1<4||l2<4)continue;
    ang[i]=Math.acos(Math.max(-1,Math.min(1,(d1[0]*d2[0]+d1[1]*d2[1])/(l1*l2))))*180/Math.PI;}
  for(let i=1;i<n-1;i++){if(ang[i]<48)continue;let best=true;for(let j=Math.max(1,i-3);j<=Math.min(n-2,i+3);j++)if(ang[j]>ang[i]||(ang[j]===ang[i]&&j<i))best=false;if(best)out.push(i);}
  return out;}
/* гладкий кусок -> узлы {x,y,a,b,w} */
function nzFitSmooth(P,wm){const c=nzCum(P),L=c[P.length-1];
  const m0=Math.max(1,Math.round(L/NZ_NODE));let ts=[];for(let k=0;k<=m0;k++)ts.push(L*k/m0);
  const build=()=>{const N=ts.map(t=>{const p=nzAt(P,c,t),T=nzTan(P,c,t,L,Math.min(7,L/2));return {t,p,T};});
    const segs=[];for(let k=0;k<N.length-1;k++){const d=(N[k+1].t-N[k].t)/3;
      segs.push({a:N[k].p,b:N[k+1].p,h0:[N[k].p[0]+N[k].T[0]*d,N[k].p[1]+N[k].T[1]*d],h1:[N[k+1].p[0]-N[k+1].T[0]*d,N[k+1].p[1]-N[k+1].T[1]*d],t0:N[k].t,t1:N[k+1].t});}
    return {N,segs};};
  let B=build();
  for(let it=0;it<5;it++){let worst=0,wt=-1,wk=-1;
    for(let k=0;k<B.segs.length;k++){const s=B.segs[k],S=[];for(let u=0;u<=14;u++)S.push(nzBez(s.a,s.b,s.h0,s.h1,u/14));
      for(let i=0;i<P.length;i++){if(c[i]<s.t0-0.01||c[i]>s.t1+0.01)continue;let md=1e9;
        for(let u=0;u<14;u++){const a=S[u],b=S[u+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((P[i][0]-a[0])*dx+(P[i][1]-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));md=Math.min(md,Math.hypot(P[i][0]-(a[0]+dx*t),P[i][1]-(a[1]+dy*t)));}
        if(md>worst){worst=md;wt=c[i];wk=k;}}}
    if(worst<=NZ_TOL)break;
    const s=B.segs[wk];ts.push((s.t0+s.t1)/2);ts.sort((x,y)=>x-y);B=build();}
  const N=B.N,out=[];
  for(let k=0;k<N.length;k++){const q=N[k],nd={x:q.p[0],y:q.p[1],a:null,b:null,type:'smooth',w:wm};
    if(k>0){const s=B.segs[k-1];nd.a={x:s.h1[0],y:s.h1[1]};}
    if(k<N.length-1){const s=B.segs[k];nd.b={x:s.h0[0],y:s.h0[1]};}
    out.push(nd);}
  return out;}
/* штрих генератора {pts,w,dot} -> штрихи скелета. S — толщина пера (ед.) */
function nzSkel(strokes,S){const out=[];
  for(const st of strokes){const P0=st.pts;if(!P0||!P0.length)continue;const wm=st.w/S;
    const P=[P0[0]];for(let i=1;i<P0.length;i++)if(nzDist(P0[i],P[P.length-1])>0.4)P.push(P0[i]);
    const c=nzCum(P),L=c[P.length-1]||0;
    if(st.dot&&P.length>=2&&L>=0.5){out.push({nodes:[{x:P[0][0],y:P[0][1],a:null,b:null,type:'smooth',w:wm},{x:P[P.length-1][0],y:P[P.length-1][1],a:null,b:null,type:'smooth',w:wm}],cap0:'R',cap1:'R'});continue;}
    if(st.dot||P.length<2||L<0.3*S){const m=nzAt(P,c,L/2);out.push({dot:true,x:m[0],y:m[1],r:S*wm/2});continue;}
    const cr=nzCorners(P,c),cuts=[0,...cr,P.length-1];
    for(let k=0;k<cuts.length-1;k++){const Q=P.slice(cuts[k],cuts[k+1]+1);if(Q.length<2)continue;
      const cq=nzCum(Q);if(cq[Q.length-1]<0.3*S){const m=Q[0];out.push({dot:true,x:m[0],y:m[1],r:S*wm/2});continue;}
      out.push({nodes:nzFitSmooth(Q,wm),cap0:'R',cap1:'R'});}}
  return out;}
