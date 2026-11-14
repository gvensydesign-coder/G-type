/* ---------- построение знака: штрихи -> радиусы -> поле -> контур -> Безье; капли и подтёки ---------- */
const kPool=(y,X)=>{const g=1-y/(0.55*X);return g<=0?0:Math.pow(Math.min(1,g),1.3);};
function kPrepare(specs,P){
  const R=P.R,m=P.m;const strokes=[];
  for(const sp of specs){const o=Array.isArray(sp)?{p:sp}:sp;let pts=o.p.map(q=>[q[0],q[1]]);
    const w=o.w||1,r0=R*w;if(pts.length===1)pts.push([pts[0][0]+0.01,pts[0][1]]);
    strokes.push({orig:pts,o,r0,closed:!!o.c,dot:!!o.dot});}
  strokes.forEach((s,si)=>{
    const ds=Math.max(7,Math.min(15,s.r0*0.4));s.p=kResample(s.orig,ds);let n=s.p.length;
    /* концы: свободные получают каплю-утолщение */
    s.free=[false,false];
    if(!s.closed){for(let e=0;e<2;e++){const E=e?s.p[n-1]:s.p[0];let j=false;if(s.o.nb&&s.o.nb[e])j=true;
      if(!j)for(let q=0;q<strokes.length;q++){if(q===si)continue;if(kDistPoly(E[0],E[1],strokes[q].orig)<0.8*Math.max(s.r0,strokes[q].r0)){j=true;break;}}
      s.free[e]=!j;}}
    if(s.dot){s.free=[false,false];}
    if(P.trim>0&&!s.closed&&!s.dot&&n>5){const tl=P.trim*s.r0;let a=0,z=n-1,acc=0;
      if(s.free[0]){while(a<n-4&&acc<tl){acc+=Math.hypot(s.p[a+1][0]-s.p[a][0],s.p[a+1][1]-s.p[a][1]);a++;}}
      acc=0;if(s.free[1]){while(z>a+3&&acc<tl){acc+=Math.hypot(s.p[z][0]-s.p[z-1][0],s.p[z][1]-s.p[z-1][1]);z--;}}
      s.p=s.p.slice(a,z+1);n=s.p.length;}
    s.capE=[0,0];
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0];let c=1e9;
      for(let q=0;q<strokes.length;q++){if(q===si)continue;c=Math.min(c,kDistPoly(E[0],E[1],strokes[q].orig)-strokes[q].r0*0.9-0.2*s.r0-P.k*0.35);}
      s.capE[e]=c;}
    const L=[0];for(let i=1;i<n;i++)L.push(L[i-1]+Math.hypot(s.p[i][0]-s.p[i-1][0],s.p[i][1]-s.p[i-1][1]));s.L=L;const T=L[n-1];
    const neck=(!s.dot&&!s.closed&&T>5*s.r0)?(0.03+0.09*P.m):0;
    s.r=s.p.map((q,i)=>{let r=s.r0*(1+P.pm*kPool(q[1],P.X))*(1-neck*Math.sin(Math.PI*L[i]/T));
      if(s.dot)return s.r0*P.dotK;
      const Lb=Math.max(2.0*s.r0,26);
      for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],sd=e?T-L[i]:L[i];if(sd<Lb){const low=E[1]<0.32*P.X;const want=s.r0*(1+P.bm*(low?1.3:1)*kSS(0,1,1-sd/Lb));r=Math.max(r,Math.min(want,Math.max(s.r0,s.capE[e])));}}
      return r;});
  });
  return strokes;}
/* полигон (замкнутая ломаная) внутри? */
function kInPoly(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function kLoopsClean(iso,P){const {loops,v,nx,ny,x0,y0,h}=iso;const out=[];
  for(const L0 of loops){const L=kSmooth(L0,1),ar=kArea(L);if(Math.abs(ar)<300)continue;
    let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;for(const q of L){bx0=Math.min(bx0,q[0]);bx1=Math.max(bx1,q[0]);by0=Math.min(by0,q[1]);by1=Math.max(by1,q[1]);}
    /* глубина: максимум |v| внутри (для дыр v>0, для островов v<0) */
    let dep=0;const hole=ar<0;
    for(let j=Math.max(0,Math.floor((by0-y0)/h));j<=Math.min(ny-1,Math.ceil((by1-y0)/h));j++)for(let i=Math.max(0,Math.floor((bx0-x0)/h));i<=Math.min(nx-1,Math.ceil((bx1-x0)/h));i++){
      const val=v[j*nx+i];if(hole?val>0:val<0){const a=Math.abs(val);if(a>dep&&kInPoly(x0+i*h,y0+j*h,L))dep=a;}}
    if(hole?dep<P.holeMin:(dep<P.islMin||Math.abs(ar)<P.islArea))continue;
    out.push({L,hole,ar,dep});}
  return out;}
function kBuild(specs,P,key){P.key=key;
  const strokes=kPrepare(specs,P);const rng=kRng(kHash(key)^(P.seed||0));
  /* планирование подтёков: добавляют штрихи */
  const plan=kPlanDrips(strokes,P,rng);
  const all=strokes.concat(plan.drips);
  const seedN=(kHash(key)^((P.seed||0)*7919))|0,nz=kNoise(seedN);
  const sy=P.sy;
  const fldW=kMakeField(all.map(s=>({p:s.p.map(q=>[q[0],q[1]*sy]),r:s.r})),P.k,nz,P.nA);
  const fld={f:(x,y)=>fldW.f(x,y*sy),bb:fldW.bb};
  const iso=kIso(fldW.f,fldW.bb,P.h);
  const cl=kLoopsClean(iso,P);
  if(sy!==1)for(const c of cl){c.L=c.L.map(q=>[q[0],q[1]/sy]);}
  const contours=[];const polys=[];
  for(const c of cl){let nodes=kFitLoop(c.L,P.err);
    for(const e of [0.6,0.3]){if(!kSelfX(kFlatN(nodes)))break;nodes=kFitLoop(c.L,e);}if(nodes.length<3)continue;contours.push({hole:c.hole,nodes,ar:c.ar});polys.push(c.L);}
  const sats=kPlaceSats(strokes,plan,polys,P,rng,fld);
  for(const s of sats){const nodes=kFitLoop(s.poly,0.8);contours.push({hole:false,nodes,ar:kArea(s.poly),sat:true});}
  return {contours,meta:{sats:sats.length,drips:plan.drips.length/2,loops:cl.length}};}
/* ---------- подтёки (шея + бусина) ---------- */
function kPlanDrips(strokes,P,rng){const q=P.q,X=P.X,drips=[],anch=[];const noBot=/[CcСсSsЭэOoОоQGgЄє0@&8°©%•·]/.test(P.key||'');
  strokes.forEach(s=>{if(s.dot)return;const n=s.p.length;
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],F=e?s.p[n-3<0?0:n-3]:s.p[Math.min(2,n-1)];let dx=E[0]-F[0],dy=E[1]-F[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
      const rr=s.r[e?n-1:0];if((dy<-0.35||E[1]<0.3*X)&&E[1]-rr<=0.3*rr+6)anch.push({x:E[0],y:E[1],r:rr,dx,dy,kind:'end'});}
    /* низ округлых форм и нижние перекладины */
    let mi=0;for(let i=1;i<n;i++)if(s.p[i][1]<s.p[mi][1])mi=i;
    const yb=s.p[mi][1];if(!noBot&&yb<0.28*X&&yb-s.r[mi]<=0.3*s.r[mi]+6&&mi>0&&mi<n-1)anch.push({x:s.p[mi][0],y:yb,r:s.r[mi],dx:0,dy:-1,kind:'bot'});
    const T=s.L[n-1];let ymin=1e9,ymax=-1e9;for(const p of s.p){ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);}
  });
  /* перемешивание детерминированно */
  if(noBot){for(let i=anch.length-1;i>=0;i--)if(anch[i].y<0.35*X)anch.splice(i,1);}
  for(let i=anch.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[anch[i],anch[j]]=[anch[j],anch[i]];}
  const gate=(q<0.15?rng()<0.12:rng()<0.25+0.6*q);const maxD=(q<0.05||!gate)?0:1+(q>0.7&&rng()<0.5?1:0),pa=0.5+0.5*q;let nd=0;const placed=[];
  for(const a of anch){if(nd>=maxD)break;const u=rng();if(u>pa*(q>0.02?1:0))continue;
    {let ok=true;const rbT=Math.max(P.neckMin,0.2*P.R)*1.2+26,steps=Math.ceil((a.r+P.R*2.6)/18);
      for(let i=1;i<=steps&&ok;i++){const sy=a.y-a.r-6-i*18;
        for(const s of strokes){if(s.dot&&false)continue;const d=kDistPoly(a.x,sy,s.orig)-s.r0*1.25;if(d<rbT+P.R*0.5*(i>steps-3?1:0)+10){if(kDistPoly(a.x,sy,s.orig)<s.r0*1.25+4&&Math.hypot(a.x-a.x,sy-a.y)<a.r+14)continue;ok=false;break;}}}
      if(!ok)continue;}
    if(placed.some(p=>Math.abs(p.x-a.x)<2.2*P.R*1.4&&Math.abs(p.y-a.y)<4*P.R))continue;
    const rn=Math.max(P.neckMin,0.2*P.R*(0.9+0.4*rng())),rb=Math.max(rn*1.9,P.R*(0.34+0.4*P.m)*(0.85+0.4*rng()),P.dropMin);
    const len=a.r+Math.min(P.R*(0.5+1.5*q*rng()),q<0.4?0.12*X:0.3*X)+1.2*rb;
    const bx=a.x+(rng()-0.5)*0.15*P.R,by=Math.max(a.y-len,-P.DD+rb+2);
    drips.push({p:[[a.x,a.y-a.r*0.3],[bx,by]],r:[rn,rn],closed:false,free:[false,false],r0:rn,L:[0,len],orig:[[a.x,a.y],[bx,by]],isDrip:1});
    drips.push({p:[[bx,by],[bx+0.01,by]],r:[rb,rb],closed:false,free:[false,false],r0:rb,L:[0,0.01],orig:[[bx,by],[bx,by]],isDrip:1,bead:1});
    placed.push({x:a.x,y:a.y,bx,by,rb});nd++;}
  return {drips,anch,placed};}
/* ---------- капли-спутники ---------- */
function kPlaceSats(strokes,plan,polys,P,rng,fld){const q=P.q,X=P.X,out=[];if(q<0.3)return out;
  const cand=[];
  strokes.forEach(s=>{if(true)return;if(s.dot)return;const n=s.p.length;
    for(let e=0;e<2;e++){if(!s.free[e])continue;const E=e?s.p[n-1]:s.p[0],F=e?s.p[Math.max(0,n-4)]:s.p[Math.min(3,n-1)];let dx=E[0]-F[0],dy=E[1]-F[1];const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;cand.push({x:E[0],y:E[1],r:s.r[e?n-1:0],dx,dy});}
    let mi=0;for(let i=1;i<n;i++)if(s.p[i][1]<s.p[mi][1])mi=i;if(s.p[mi][1]<0.4*X&&mi>0&&mi<n-1)cand.push({x:s.p[mi][0],y:s.p[mi][1],r:s.r[mi],dx:0,dy:-1});});
  for(const d of plan.placed)cand.push({x:d.bx,y:d.by,r:d.rb,dx:0,dy:-1,drip:1});
  for(let i=cand.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cand[i],cand[j]]=[cand[j],cand[i]];}
  const want=Math.min(cand.length,(rng()<0.15+0.55*q?1:0),P.maxSat);
  const gS=Math.min(P.gap,0.11*P.X);const bad=(x,y,r)=>{if(fld.f(x,y)<r+gS+P.nA)return true;for(const poly of polys){if(kDistPoly(x,y,poly.concat([poly[0]]))<r+gS)return true;}for(const o of out)if(Math.hypot(o.x-x,o.y-y)<o.r+r+P.gap*0.8)return true;
    if(y-r<-P.DD+4||y+r>P.top)return true;if(x<-P.sideMax||x>P.W+P.sideMax)return true;return false;};
  for(const c of cand){if(out.length>=want)break;
    for(let t=0;t<5;t++){const rs=Math.max(P.dropMin+2,Math.min(c.r*0.8,P.R*(0.16+0.5*Math.pow(rng(),1.5))*(0.8+0.6*P.m)+6));
      const ang=-Math.PI/2+(rng()-0.5)*0.12;let ux=Math.cos(ang),uy=Math.sin(ang);
      const dist=c.r+Math.min(P.gap,0.11*P.X)+rs+rng()*8+(t*3),x=c.x+ux*dist,y=c.y+uy*dist;
      if(bad(x,y,rs))continue;
      const sq=0.9+rng()*0.25,poly=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;poly.push([x+Math.cos(a)*rs*sq,y+Math.sin(a)*rs/sq]);}
      out.push({x,y,r:rs,poly:poly.reverse().reverse()});break;}}
  return out;}

function kFlatN(n){const pts=[];for(let i=0;i<n.length;i++){const a=n[i],b=n[(i+1)%n.length];for(let s=0;s<6;s++){const t=s/6,u=1-t;pts.push([u*u*u*a.x+3*u*u*t*a.b.x+3*u*t*t*b.a.x+t*t*t*b.x,u*u*u*a.y+3*u*u*t*a.b.y+3*u*t*t*b.a.y+t*t*t*b.y]);}}return pts;}
function kSelfX(P){const n=P.length,o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;const c=P[j],d=P[(j+1)%n];
    if(Math.max(a[0],b[0])<Math.min(c[0],d[0])||Math.max(c[0],d[0])<Math.min(a[0],b[0])||Math.max(a[1],b[1])<Math.min(c[1],d[1])||Math.max(c[1],d[1])<Math.min(a[1],b[1]))continue;
    if(o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0)return true;}}return false;}
