/* ---------- параметры -> структура P ---------- */
function kParams(p,W,k){const m=Math.max(0,Math.min(1,(p.melt==null?30:p.melt)/100)),q=Math.max(0,Math.min(1,(p.drip==null?28:p.drip)/100)),R=p.stem/2,H=p.capH,X=p.xh||Math.round(H*0.78*(1+0.05*m));
  const bm=Math.min(0.62,0.14+0.55*Math.pow(m,0.8)),it=p.slant>0?1.25:1;
  return {R,m,q,H,X,As:Math.round(H*1.03),D:Math.round(H*0.27+0.6*(p.stem-134)+70),W,pm:0.10*m,bm,dotK:1.0,
    k:16+60*Math.pow(m,1.1),nA:(2.5+0.034*H*Math.pow(m,1.3))*it,sy:1+0.4*Math.max(0,Math.min(1,(p.stem-100)/115)),h:8,err:1.3,holeMin:16,islMin:9,islArea:420,neckMin:15,dropMin:22,gap:22+0.1*p.stem,maxSat:3,sideMax:170,top:(p.asc||H*1.3)+4,DD:290,
    gDot:Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1),gBreve:Math.round(46+0.5*(16+60*Math.pow(m,1.1))+bm*R*1.1),seed:p.seed||0};}
const kRefH=new Map();
function kBuildOnce(ch,p,W,sc,trim){const d=KGL[ch];if(sc!==1)p=Object.assign({},p,{xh:Math.round(p.capH*0.78*(1+0.05*(p.melt/100)*sc))});const P=kParams(p,W,d.k);if(sc!==1){sc=Math.max(sc,0.04);P.k*=sc;P.nA*=sc;P.bm*=sc;P.pm*=sc;}P.trim=trim;P.sy=1+(P.sy-1)*Math.max(sc,0.5);const K=kKit(P,d.k);P.k0=d.k;return kBuild(d.fn(K),P,d.id);}
const kHoles=r=>r.contours.filter(c=>c.hole).length;
const kMains=r=>r.contours.filter(c=>!c.hole&&!c.sat).length;
function kGlyph(ch,p,Wouter){const d=KGL[ch];if(!d)return null;const W=Wouter||d.w(p);
  const rk=ch+'|'+p.capH+'|'+p.wdth;let ref=kRefH.get(rk);
  if(ref==null){const p0=Object.assign({},p,{stem:134,melt:30,drip:0,slant:0,xh:Math.round(p.capH*0.78*1.015)});const r0=kBuildOnce(ch,p0,d.w(p0),1,0);ref=[kHoles(r0),kMains(r0)];kRefH.set(rk,ref);}
  const bad=r=>Math.max(0,kHoles(r)-ref[0])*3+(kMains(r)!==ref[1]?5:0);
  let r=kBuildOnce(ch,p,W,1,0),bs=bad(r);
  if(bs>0){for(const [sc,tr] of [[0.7,0],[0.4,0],[0.15,0],[0,0],[0.7,0.3],[0.4,0.6],[0,1.0],[0,1.6]]){const r2=kBuildOnce(ch,p,W,sc,tr),b2=bad(r2);if(b2<bs){r=r2;bs=b2;}if(bs===0)break;}}
  return r;}
