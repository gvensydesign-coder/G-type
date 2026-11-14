/* ===== FIX-ENGINE: outline hygiene — shared post-union step =====
   Gated per font by FONTS[id].hyg = {snap, minSeg, smooth:[lo,hi], blunt, flat} (absent = off). Operates on the final contours of finalGlyph (cubic nodes {x,y,a,b}).
   1. snap:   straight segment longer than 25 u that is off an axis by <= snap u (default 3) becomes exactly horizontal / vertical (both end nodes and their handles move together);
   2. minSeg: segments shorter than minSeg u (default 6) are merged (a handle-less corner next to the short segment is dropped, two curved ends collapse into one node);
   3. smooth: a node with a curve on at least one side whose in/out tangents differ by smooth[0]..smooth[1] degrees (default 4..18) gets collinear handles (lengths kept);
   4. blunt:  a handle-less corner between two straight edges with an interior angle < blunt degrees (default 20) is cut by a flat of `flat` u (default 2).
   Verified by tools/outl.py (counts) and XOR against the previous build (FIX_ENGINE.md). */
const HYG_DEF={snap:3,minSeg:6,smooth:[4,18],blunt:20,flat:2,crotch:null,crotchD:26};
const hygHas=(n,k)=>{const h=n[k];return !!(h&&(Math.abs(h.x-n.x)>0.01||Math.abs(h.y-n.y)>0.01));};
function hygContour(c,cfg){
  if(!c||!c.nodes||c.nodes.length<4)return c;
  let n=c.nodes.map(q=>({x:q.x,y:q.y,a:q.a&&{x:q.a.x,y:q.a.y},b:q.b&&{x:q.b.x,y:q.b.y}}));
  const straight=(p,q)=>!hygHas(p,'b')&&!hygHas(q,'a');
  /* 1. snap to the axes */
  if(cfg.snap>0){const T=cfg.snap;
    for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];if(p===q||!straight(p,q))continue;
      const dx=q.x-p.x,dy=q.y-p.y;
      if(Math.abs(dy)>0.01&&Math.abs(dy)<=T&&Math.abs(dx)>=25){const y=(p.y+q.y)/2;for(const m of [p,q]){const d=y-m.y;m.y=y;if(m.a)m.a.y+=d;if(m.b)m.b.y+=d;}}
      else if(Math.abs(dx)>0.01&&Math.abs(dx)<=T&&Math.abs(dy)>=25){const x=(p.x+q.x)/2;for(const m of [p,q]){const d=x-m.x;m.x=x;if(m.a)m.a.x+=d;if(m.b)m.b.x+=d;}}}}
  /* 2. merge short segments */
  if(cfg.minSeg>0){const thr=cfg.minSeg;
    for(let it=0;it<8;it++){const L=n.length;if(L<5)break;let hit=null;
      for(let i=0;i<L;i++){const a=n[i],b=n[(i+1)%L];if(Math.hypot(a.x-b.x,a.y-b.y)<thr){
        /* два угла без ручек — один узел посередине (ошибка не больше половины отрезка), один угол — он и убирается, две кривые — слияние с внешними ручками */
        const pa=!hygHas(a,'a')&&!hygHas(a,'b'),pb=!hygHas(b,'a')&&!hygHas(b,'b');
        if(pa&&pb){hit=[i,'mid'];break;}if(pa){hit=[i,'drop'];break;}if(pb){hit=[(i+1)%L,'drop'];break;}
        /* две кривые: сливаем только если отбрасываемые ручки короткие (иначе короткий отрезок — часть формы, например петля) */
        const hl=(q,k)=>hygHas(q,k)?Math.hypot(q[k].x-q.x,q[k].y-q.y):0;
        if(hl(a,'b')<=2*thr&&hl(b,'a')<=2*thr){hit=[i,'fuse'];break;}}}
      if(!hit)break;
      if(hit[1]==='drop')n.splice(hit[0],1);
      else if(hit[1]==='mid'){const i=hit[0],j=(i+1)%L,a=n[i],b=n[j];n[i]={x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:null,b:null};n.splice(j,1);}
      else{const i=hit[0],j=(i+1)%L,a=n[i],b=n[j],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2,a:a.a&&{x:a.a.x,y:a.a.y},b:b.b&&{x:b.b.x,y:b.b.y}};n[i]=m;n.splice(j,1);}}}
  /* 3. smooth near-tangent joins */
  if(cfg.smooth){const lo=cfg.smooth[0]*Math.PI/180,hi=cfg.smooth[1]*Math.PI/180,L=n.length;
    const unit=(x,y)=>{const l=Math.hypot(x,y);return l>1e-6?[x/l,y/l]:null;};
    for(let i=0;i<L;i++){const p=n[(i+L-1)%L],q=n[i],r=n[(i+1)%L];
      const ha=hygHas(q,'a'),hb=hygHas(q,'b');if(!ha&&!hb)continue;
      /* incoming tangent: own handle or the straight edge from the previous node; outgoing likewise */
      const uin=ha?unit(q.x-q.a.x,q.y-q.a.y):unit(q.x-p.x,q.y-p.y),uout=hb?unit(q.b.x-q.x,q.b.y-q.y):unit(r.x-q.x,r.y-q.y);
      if(!uin||!uout)continue;
      const ang=Math.acos(Math.max(-1,Math.min(1,uin[0]*uout[0]+uin[1]*uout[1])));
      if(ang<lo||ang>hi)continue;
      /* a straight side keeps its direction; two curved sides meet on the bisector */
      let d;if(ha&&hb)d=unit(uin[0]+uout[0],uin[1]+uout[1]);else if(ha)d=uout;else d=uin;
      if(!d)continue;
      /* смещение конца ручки не больше 5 u: длинные ручки — это форма (узел сопряжения чаши и ствола), не шум */
      const na=ha?(()=>{const l=Math.hypot(q.x-q.a.x,q.y-q.a.y);return {x:q.x-d[0]*l,y:q.y-d[1]*l};})():null,nb=hb?(()=>{const l=Math.hypot(q.b.x-q.x,q.b.y-q.y);return {x:q.x+d[0]*l,y:q.y+d[1]*l};})():null;
      if((na&&Math.hypot(na.x-q.a.x,na.y-q.a.y)>(cfg.smoothMax||3))||(nb&&Math.hypot(nb.x-q.b.x,nb.y-q.b.y)>(cfg.smoothMax||3)))continue;
      if(na)q.a=na;if(nb)q.b=nb;}}
  /* 3b. crotch fillet (integration c): a concave union vertex whose tangents break by crotch[0]..crotch[1] degrees (the 12-24 deg kinks where two strokes meet: Kvadra 6 9, Volt Œ æ,
     Stroka s з; mild convex tangent breaks 8-15 deg such as Kvadra e get the same fillet) gets a tiny G1 cubic fillet: both sides are cut back by d = min(crotchD, 0.4 x chord) and joined by a cubic with the cut tangents. Convex corners are never touched. */
  if(cfg.crotch){const lo=cfg.crotch[0]*Math.PI/180,hi=cfg.crotch[1]*Math.PI/180,D=cfg.crotchD||26;
    const fillLeft=cfg._fillLeft!==false;/* fill side: sign of the largest contour of the glyph (set in outlineHygiene); holes have the opposite area sign but the same fill side */
    const P=(p,q)=>[[p.x,p.y],hygHas(p,'b')?[p.b.x,p.b.y]:[p.x,p.y],hygHas(q,'a')?[q.a.x,q.a.y]:[q.x,q.y],[q.x,q.y]];
    const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
    const split=(C,t)=>{const a=lerp(C[0],C[1],t),b=lerp(C[1],C[2],t),c=lerp(C[2],C[3],t),d=lerp(a,b,t),e=lerp(b,c,t),f=lerp(d,e,t);return [[C[0],a,d,f],[f,e,c,C[3]]];};
    const bez=(C,t)=>split(C,t)[0][3];
    const unit=(a,b)=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]);return l>1e-6?[(b[0]-a[0])/l,(b[1]-a[1])/l]:null;};
    const tanEnd=C=>unit(C[2],C[3])||unit(C[1],C[3])||unit(C[0],C[3]),tanStart=C=>unit(C[0],C[1])||unit(C[0],C[2])||unit(C[0],C[3]);
    /* t (measured from the end 'fromEnd' of cubic C) at which the point is at chord distance d from that end */
    const cutT=(C,d,fromEnd)=>{const q=fromEnd?C[3]:C[0];let a=0,b=1;for(let k=0;k<24;k++){const m=(a+b)/2,pt=bez(C,fromEnd?1-m:m);if(Math.hypot(pt[0]-q[0],pt[1]-q[1])<d)a=m;else b=m;}return fromEnd?1-(a+b)/2:(a+b)/2;};
    const out=[];const L=n.length,hit=new Array(L).fill(null);
    for(let i=0;i<L;i++){const p=n[(i+L-1)%L],q=n[i],r=n[(i+1)%L];
      const Ci=P(p,q),Co=P(q,r),ti=tanEnd(Ci),to=tanStart(Co);if(!ti||!to)continue;
      const cr=ti[0]*to[1]-ti[1]*to[0],ang=Math.acos(Math.max(-1,Math.min(1,ti[0]*to[0]+ti[1]*to[1])));
      const vex=(cr>0)===fillLeft;/* convex corner: only the mild tangent breaks (crotchVex, default 8..15 deg) are rounded — they are joins that should be smooth, not corners */
      const vlo=(cfg.crotchVex?cfg.crotchVex[0]:99)*Math.PI/180,vhi=(cfg.crotchVex?cfg.crotchVex[1]:0)*Math.PI/180;
      if(vex?(ang<vlo||ang>vhi):(ang<lo||ang>hi))continue;
      const li=Math.hypot(Ci[3][0]-Ci[0][0],Ci[3][1]-Ci[0][1]),lo2=Math.hypot(Co[3][0]-Co[0][0],Co[3][1]-Co[0][1]),d=Math.min(D,0.4*li,0.4*lo2);
      if(d<6)continue;hit[i]={Ci,Co,d};}
    /* neighbouring hits would cut the same edge twice: keep the first */
    for(let i=0;i<L;i++)if(hit[i]&&hit[(i+1)%L])hit[(i+1)%L]=null;
    if(hit[0]&&hit[L-1])hit[0]=null;
    for(let i=0;i<L;i++){const h=hit[i],q=n[i];if(!h){out.push(q);continue;}
      const t1=cutT(h.Ci,h.d,true),t2=cutT(h.Co,h.d,false),lc=split(h.Ci,t1)[0],rc=split(h.Co,t2)[1],m1=lc[3],m2=rc[0];
      const T1=tanEnd(lc),T2=tanStart(rc),c=Math.hypot(m2[0]-m1[0],m2[1]-m1[1]),k=0.36*c;
      /* the previous node's outgoing handle is shortened by the cut, the next node's incoming handle likewise */
      n[(i+L-1)%L].b={x:lc[1][0],y:lc[1][1]};
      out.push({x:m1[0],y:m1[1],a:{x:lc[2][0],y:lc[2][1]},b:{x:m1[0]+T1[0]*k,y:m1[1]+T1[1]*k}});
      out.push({x:m2[0],y:m2[1],a:{x:m2[0]-T2[0]*k,y:m2[1]-T2[1]*k},b:{x:rc[1][0],y:rc[1][1]}});
      const nx=n[(i+1)%L];nx.a={x:rc[2][0],y:rc[2][1]};}
    n=out;}
  /* 4. blunt needles */
  if(cfg.blunt>0){const out=[],L=n.length,th=cfg.blunt*Math.PI/180,flat=cfg.flat||2;
    for(let i=0;i<L;i++){const p=n[(i+L-1)%L],q=n[i],r=n[(i+1)%L];
      if(hygHas(q,'a')||hygHas(q,'b')||hygHas(p,'b')||hygHas(r,'a')){out.push(q);continue;}
      const e1=[p.x-q.x,p.y-q.y],e2=[r.x-q.x,r.y-q.y],l1=Math.hypot(e1[0],e1[1]),l2=Math.hypot(e2[0],e2[1]);
      if(l1<1e-6||l2<1e-6){out.push(q);continue;}
      const ang=Math.acos(Math.max(-1,Math.min(1,(e1[0]*e2[0]+e1[1]*e2[1])/(l1*l2))));
      if(ang>=th||ang<0.5*Math.PI/180){out.push(q);continue;}
      const d=(flat/2)/Math.sin(ang/2);
      if(d>0.4*l1||d>0.4*l2){out.push(q);continue;}
      out.push({x:q.x+e1[0]/l1*d,y:q.y+e1[1]/l1*d,a:null,b:null},{x:q.x+e2[0]/l2*d,y:q.y+e2[1]/l2*d,a:null,b:null});}
    n=out;}
  return Object.assign({},c,{nodes:n});
}
const hygArea=c=>{const n=c.nodes;let a2=0;for(let i=0;i<n.length;i++){const p=n[i],q=n[(i+1)%n.length];a2+=p.x*q.y-q.x*p.y;}return a2;};
function outlineHygiene(cs,cfg){let big=0;for(const c of cs){if(!c||!c.nodes)continue;const a=hygArea(c);if(Math.abs(a)>Math.abs(big))big=a;}
  const cf=Object.assign({},cfg,{_fillLeft:big>=0});return cs.map(c=>hygContour(c,cf));}
(function(){
const HYG={volt:{crotch:[8,30],crotchVex:[8,15]},kvadra:{crotch:[8,30],crotchVex:[8,15]},stroka:{minSeg:4.6,blunt:0,crotch:[8,30],crotchVex:[8,15]},codex:{},liniya:{minSeg:0,smooth:null,blunt:0},propis:{smooth:[4,12]},ustav:{snap:0,minSeg:0,flat:8},rotunda:{},renessa:{snap:0,minSeg:0,smooth:null},modul:{},ryvok:{blunt:0},stsepka:{blunt:0,smooth:null},stolb:{blunt:0,smooth:null},nit:{snap:0,minSeg:0,smooth:null,blunt:0},tyaga:{snap:0,minSeg:0,smooth:null,blunt:0},kortes:{snap:0,minSeg:0,smooth:null,blunt:0}};
for(const id in HYG)if(FONTS[id])FONTS[id].hyg=Object.assign({},HYG_DEF,HYG[id]);
const _fg=finalGlyph;
finalGlyph=function(ch,st,edits,opt){const g=_fg.apply(this,arguments);
  if(!g||!g.cs||!g.cs.length)return g;
  const F=typeof CUR_FONT==='string'&&FONTS[CUR_FONT],cfg=F&&F.hyg;if(!cfg||(opt&&opt.hyg===false))return g;
  return Object.assign({},g,{cs:outlineHygiene(g.cs,cfg)});};
})();
