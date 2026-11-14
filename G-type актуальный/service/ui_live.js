/* ===== Живой предпросмотр: глиф без точного объединения контуров =====
   Для кадров во время перетаскивания ползунка/ручки. Контуры не объединяются (заливка — fillCSG),
   поля считаются по той же формуле, что в finalGlyph (opticalSB), но профиль краёв строится
   сканлиниями с той же логикой, что у csgUnion: группы, вычитание внутри группы, post поверх.
   После отпускания образец перерисовывается точно. */
function liveSpans(cats,y){
  /* cats: Map cat -> {add:[poly], sub:[poly]}; post — cat 'post'. Возвращает отрезки чернил на линии y */
  const iv=polys=>{const xs=[];for(const P of polys)for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];
      if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push([a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}
    xs.sort((p,q)=>p[0]-q[0]);const out=[];let wn=0,s=0;
    for(const [x,d] of xs){const was=wn;wn+=d;if(was===0&&wn!==0)s=x;else if(was!==0&&wn===0)out.push([s,x]);}return out;};
  const minus=(A,B)=>{if(!B.length)return A;const out=[];for(const [a0,a1] of A){let segs=[[a0,a1]];
      for(const [b0,b1] of B){const nx=[];for(const [s0,s1] of segs){if(b1<=s0||b0>=s1){nx.push([s0,s1]);continue;}if(b0>s0)nx.push([s0,b0]);if(b1<s1)nx.push([b1,s1]);}segs=nx;}
      out.push(...segs);}return out;};
  let all=[];
  for(const g of cats.values())all.push(...(g.post?iv(g.add):minus(iv(g.add),iv(g.sub))));
  return all.filter(s=>s[1]-s[0]>1e-6);
}
function liveProfile(cs,y0,y1,rows){
  const cats=new Map();let ymin=1e9,ymax=-1e9;
  for(const c of cs){const P=flatC(c,10);if(P.length<3)continue;
    const k=c.op==='post'?'post':'g'+(c.grp||0);let g=cats.get(k);if(!g)cats.set(k,g={add:[],sub:[],post:k==='post'});
    (c.op==='sub'?g.sub:g.add).push(P);if(c.op!=='sub')for(const q of P){if(q[1]<ymin)ymin=q[1];if(q[1]>ymax)ymax=q[1];}}
  if(!(ymax>ymin))return {xmin:0,xmax:0,L:[],R:[]};
  let xmin=1e9,xmax=-1e9;
  const step=Math.max(2,(ymax-ymin)/220);
  for(let y=ymin+step/2;y<ymax;y+=step){const sp=liveSpans(cats,y);for(const q of sp){if(q[0]<xmin)xmin=q[0];if(q[1]>xmax)xmax=q[1];}}
  const L=[],R=[];
  for(let r=0;r<rows;r++){const y=y0+(r+0.5)*(y1-y0)/rows;const sp=liveSpans(cats,y);
    if(!sp.length){L.push(null);R.push(null);continue;}
    L.push(Math.min(...sp.map(s=>s[0])));R.push(Math.max(...sp.map(s=>s[1])));}
  return {xmin,xmax,L,R};
}
function liveOpticalSB(cs,zoneH,sb,amt,aRef){
  const pr=liveProfile(cs,0,zoneH,40);if(!(pr.xmax>pr.xmin))return null;
  const depth=Math.max(zoneH*0.12,sb*1.2),n=pr.L.length,eps=zoneH*0.05;let aL=0,aR=0,cL=0,cR=0;
  for(let i=0;i<n;i++){const l=pr.L[i],r=pr.R[i];
    aL+=l==null?depth:Math.min(l-pr.xmin,depth);aR+=r==null?depth:Math.min(pr.xmax-r,depth);
    if(l!=null&&l-pr.xmin<eps)cL++;if(r!=null&&pr.xmax-r<eps)cR++;}
  aL/=n;aR/=n;cL/=n;cR/=n;
  const k=0.4*amt,lo=c=>sb*(c>=0.22?0.5:c>=0.09?0.35:0.12);
  const f=(a,c)=>Math.min(Math.max(sb-(a-aRef)*k,lo(c)),sb*1.25);
  return {xmin:pr.xmin,xmax:pr.xmax,l:f(aL,cL),r:f(aR,cR)};
}
function liveGlyphOf(ch,st,edits){
  /* скелетные шрифты: во время перетаскивания — ломаная огибающая штрихов без объединения */
  let g;if(typeof SKX!=='undefined'&&GL[ch]&&GL[ch].skel){SKX.FAST=true;try{g=finalGlyph(ch,st,edits,{union:false,slant:false});}finally{SKX.FAST=false;}}else g=finalGlyph(ch,st,edits,{union:false,slant:false});if(!g)return null;
  const p=st.p,ed=edits&&edits[ch],eL=(ed&&ed.sbL)||0,eR=(ed&&ed.sbR)||0;
  const t=Math.tan((p.slant||0)*Math.PI/180);
  const gd=GL[ch],go=gd.opt||{},bc=go.base||ch,isSpace=isSpaceCh(bc);
  let sb=p.sb+eL,adv=isSpace?spaceAdv(bc,p):g.weff+2*p.sb+p.track+eL+eR;
  const osp=p.opsp==null?100:p.opsp,tab=go.tnum?true:go.pnum?false:!!p.tabular;
  if(!isSpace&&osp>0&&!go.fixed&&(isLetter(bc)||(isDigit(bc)&&!tab))){
    const zh=gd.hz?gd.hz(p):gd.k==='xh'?p.xh:p.capH;const o=liveOpticalSB(g.cs,zh,p.sb,osp/100,refArea(gd.k==='xh'?'xh':'cap',p));
    if(o){const inkW=o.xmax-o.xmin;sb=o.l+eL-o.xmin;adv=o.l+inkW+o.r+p.track+eL+eR;}
  }
  if(!isSpace){let fixed=0;
    if(p.mono>0)fixed=p.mono;else if(tab&&(isDigit(bc)||(typeof OTO!=='undefined'&&OTO.cur(bc))))fixed=tabularWidth(p)+2*p.sb+p.track;
    if(fixed){sb+=(fixed-adv)/2;adv=fixed;}}
  if(!isSpace&&go.sbx){const x=typeof go.sbx==='function'?go.sbx(p):go.sbx;sb+=x;adv+=2*x;}
  const cs=(t!==0||sb!==0)?g.cs.map(c=>Object.assign(mapNodes(c,(x,y)=>[x+y*t+sb,y]),{off:c.off})):g.cs;
  const ic=(p.icomp||0)/100;
  if(t!==0&&ic>0){const th=-Math.atan(t)*ic*0.5,c0=Math.cos(th),s0=Math.sin(th);
    for(const c of cs)for(const n of c.nodes){if(!n.a||!n.b)continue;
      for(const h of ['a','b']){const dx=n[h].x-n.x,dy=n[h].y-n.y;n[h]={x:n.x+dx*c0-dy*s0,y:n.y+dx*s0+dy*c0};}}}
  return {ch,w:g.w,weff:g.weff,adv:Math.max(adv,0),cs,live:true};
}
