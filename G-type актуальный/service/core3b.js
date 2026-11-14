/* ===== TrueType ===== */
/* integration (g): deviation tolerance of the cubic->quad split, FONTS[id].c2qTol (default 1.5 u) */
function c2qTol(){return (typeof CUR_FONT==='string'&&typeof FONTS!=='undefined'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].c2qTol)||1.5;}
function c2q(P,out,depth){
  const p0=P[0],p1=P[1],p2=P[2],p3=P[3];
  const err=Math.hypot(p3[0]-3*p2[0]+3*p1[0]-p0[0],p3[1]-3*p2[1]+3*p1[1]-p0[1])*0.0481;
  /* FIX-ENGINE: управляющая точка — пересечение касательных на концах куска (а не среднее ручек): направление у концов точно как у кубики, поэтому гладкий узел остаётся гладким
     (прежняя формула давала изломы 1–15° в узлах); проверка отклонения по 7 точкам, иначе — деление пополам */
  let qx=(3*(p1[0]+p2[0])-p0[0]-p3[0])/4,qy=(3*(p1[1]+p2[1])-p0[1]-p3[1])/4;
  const d1=[p1[0]-p0[0],p1[1]-p0[1]],d2=[p2[0]-p3[0],p2[1]-p3[1]],cr=d1[0]*d2[1]-d1[1]*d2[0],chord=Math.hypot(p3[0]-p0[0],p3[1]-p0[1]);
  let ok=err<0.7;
  if(Math.abs(cr)>1e-9&&chord>1e-6){const w=[p3[0]-p0[0],p3[1]-p0[1]],t1=(w[0]*d2[1]-w[1]*d2[0])/cr,t2=(w[0]*d1[1]-w[1]*d1[0])/cr;
    /* оба луча идут навстречу друг другу (t1,t2 > 0) и пересечение не уходит далеко */
    if(t1>0&&t2>0){const ix=p0[0]+d1[0]*t1,iy=p0[1]+d1[1]*t1;
      if(Math.hypot(ix-p0[0],iy-p0[1])<2.5*chord){let mx=0;
        for(let k=1;k<8;k++){const u=k/8,v=1-u,cx=v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*p3[0],cy=v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*p3[1];
          const qxu=v*v*p0[0]+2*v*u*ix+u*u*p3[0],qyu=v*v*p0[1]+2*v*u*iy+u*u*p3[1];mx=Math.max(mx,Math.hypot(qxu-cx,qyu-cy));}
        /* кубика и квадратичная параметризованы по-разному: берём наименьшее расстояние до плотной выборки квадратичной */
        let md=0;for(let k=1;k<8;k++){const u=k/8,v=1-u,cx=v*v*v*p0[0]+3*v*v*u*p1[0]+3*v*u*u*p2[0]+u*u*u*p3[0],cy=v*v*v*p0[1]+3*v*v*u*p1[1]+3*v*u*u*p2[1]+u*u*u*p3[1];
          let best=1e9;for(let j=0;j<=24;j++){const a=j/24,b=1-a,sx=b*b*p0[0]+2*b*a*ix+a*a*p3[0],sy=b*b*p0[1]+2*b*a*iy+a*a*p3[1];const d=Math.hypot(sx-cx,sy-cy);if(d<best)best=d;}if(best>md)md=best;}
        if(md<c2qTol()){qx=ix;qy=iy;ok=true;}else ok=false;}else ok=err<0.7;}}
  if(ok||depth>=5){out.push([qx,qy,p3[0],p3[1]]);return;}
  const m=blossom(P,0.5,0.5,0.5);
  const A=[p0,blossom(P,0,0,0.5),blossom(P,0,0.5,0.5),m],B=[m,blossom(P,0.5,0.5,1),blossom(P,0.5,1,1),p3];
  c2q(A,out,depth+1);c2q(B,out,depth+1);
}
/* §10.2: узлы на экстремумах — кубика режется там, где dx/dt или dy/dt = 0 (после наклона экстремумы смещаются от узлов) */
function cubicExtremaT(P){
  const ts=[];
  for(let ax=0;ax<2;ax++){const a=P[0][ax],b=P[1][ax],c=P[2][ax],d=P[3][ax];
    const A=-a+3*b-3*c+d,B=2*(a-2*b+c),C=b-a; /* производная/3: A t^2 + B t + C */
    const add=t=>{if(!(t>0.004&&t<0.996))return;const u=1-t,v=u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d;if(v>Math.max(a,d)+1||v<Math.min(a,d)-1)ts.push(t);}; /* только настоящий недостающий экстремум (>1 ед. за концами) */
    if(Math.abs(A)<1e-9){if(Math.abs(B)>1e-9)add(-C/B);}
    else{const D=B*B-4*A*C;if(D>=0){const r=Math.sqrt(D);add((-B-r)/(2*A));add((-B+r)/(2*A));}}}
  return ts.sort((x,y)=>x-y).filter((t,i,a)=>i===0||t-a[i-1]>0.004);
}
function cubicPiece(P,t0,t1){return [blossom(P,t0,t0,t0),blossom(P,t0,t0,t1),blossom(P,t0,t1,t1),blossom(P,t1,t1,t1)];}
const near=(p,n)=>!p||(Math.abs(p.x-n.x)<0.01&&Math.abs(p.y-n.y)<0.01);
function contourToTT(c){
  const ns=reverseNodes(c.nodes),n=ns.length,pts=[];
  const push=(x,y,on)=>{x=Math.round(x);y=Math.round(y);const l=pts[pts.length-1];if(l&&l.on&&on&&l.x===x&&l.y===y)return;pts.push({x,y,on});};
  for(let i=0;i<n;i++){
    const a=ns[i],b=ns[(i+1)%n];
    push(a.x,a.y,true);
    const line=near(a.b,a)&&near(b.a,b);
    if(!line){
      const P=segPts(a,b),qs=[],ts=cubicExtremaT(P),cuts=[0,...ts,1];
      for(let m=0;m<cuts.length-1;m++){const Pm=ts.length?cubicPiece(P,cuts[m],cuts[m+1]):P;const q0=qs.length;c2q(Pm,qs,0);
        if(m<cuts.length-2)qs[qs.length-1].xt=1;}
      qs.forEach((q,k)=>{push(q[0],q[1],false);if(k<qs.length-1)push(q[2],q[3],true);});
    }
  }
  while(pts.length>1&&pts[0].on&&pts[pts.length-1].on&&pts[0].x===pts[pts.length-1].x&&pts[0].y===pts[pts.length-1].y)pts.pop();
  return pts;
}
class BW{
  constructor(){this.b=[];}
  u8(v){this.b.push(v&255);return this;}
  u16(v){this.b.push((v>>8)&255,v&255);return this;}
  i16(v){return this.u16(v<0?v+65536:v);}
  u32(v){v>>>=0;this.b.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);return this;}
  i32(v){return this.u32(v<0?v+4294967296:v);}
  tag(s){for(let i=0;i<4;i++)this.b.push(s.charCodeAt(i)&255);return this;}
  bytes(a){for(const x of a)this.b.push(x);return this;}
  get len(){return this.b.length;}
  pad4(){while(this.b.length%4)this.b.push(0);return this;}
}
function utf16(s){const o=[];for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);o.push(c>>8,c&255);}return o;}
function checksum(arr){let s=0;const n=arr.length;for(let i=0;i<n;i+=4){s=(s+(((arr[i]||0)<<24)>>>0)+((arr[i+1]||0)<<16)+((arr[i+2]||0)<<8)+(arr[i+3]||0))>>>0;}return s>>>0;}

/* вертикальные метрики по габаритам глифов (yMin/yMax) и параметрам; запас ~2% */
function fontVMetrics(p,yMin,yMax){
  if(!(yMax>yMin)){yMax=p.asc||760;yMin=-(p.desc||210);}
  const m=Math.max(10,Math.round((yMax-yMin)*0.02));
  const asc=Math.ceil(Math.max(yMax,p.asc||0,p.capH||0)+m);
  const desc=-Math.ceil(Math.max(-yMin,p.desc||0)+m);
  return {asc,desc,gap:0,winAsc:Math.max(asc,Math.ceil(yMax)),winDesc:Math.max(-desc,Math.ceil(-yMin)),yMin,yMax};
}
function buildTTF(styleKey,state,opts){
  opts=opts||{};
  const st=opts.decorate&&typeof decoStyleSt==='function'?decoStyleSt(state.styles[styleKey],opts.decorate):state.styles[styleKey]; /* d1: декоративные начертания */
  const family=famEff(state.family,opts.fontId||state.fontId)+(opts.decorate&&typeof decoFamilySuffix==='function'?decoFamilySuffix(opts.decorate):'');
  const italic=styleKey==='italic';
  /* вес: opts.weight (100…900) и opts.weightName ('Light'/'Regular'/'Bold'/'Black'…) */
  const WN={100:'Thin',200:'ExtraLight',300:'Light',400:'Regular',500:'Medium',600:'SemiBold',700:'Bold',800:'ExtraBold',900:'Black'};
  let wName=(opts.weightName||'').trim();
  let wClass=opts.weight|0;
  if(!wName)wName=WN[wClass]||'Regular';
  if(!wClass){const e=Object.entries(WN).find(x=>x[1].toLowerCase()===wName.toLowerCase().replace(/\s+/g,''));wClass=e?+e[0]:400;}
  wClass=Math.max(1,Math.min(1000,wClass));
  const isBold=/^bold$/i.test(wName),isReg=/^regular$/i.test(wName);
  const ribbi=isBold||isReg;
  /* name: ID1/2 по RIBBI, ID16/17 — типографское семейство */
  const nm1=ribbi?family:family+' '+wName;
  const nm2=(isBold?'Bold':'')+(isBold&&italic?' ':'')+(italic?'Italic':'')||'Regular';
  const nm17=isReg?(italic?'Italic':'Regular'):wName+(italic?' Italic':'');
  const psFam=psSafe(family,psSafe(famOwn(opts.fontId)));
  const psName=(psFam+'-'+nm17.replace(/[^A-Za-z0-9]/g,'')).slice(0,63);
  const full=family+' '+nm17;
  /* глифы */
  const glyphs=[];
  const nd=(x,y)=>({x,y,a:null,b:null});
  const notdef={name:'.notdef',uni:null,adv:620,cs:[
    {hole:false,nodes:[nd(60,0),nd(560,0),nd(560,700),nd(60,700)]},{hole:true,nodes:[nd(130,70),nd(130,630),nd(490,630),nd(490,70)]}]};
  glyphs.push(notdef);
  const enc=[];
  const CS=opts.chars||CHARSET;/* opts.chars: только нужные знаки (постер «Поделиться шрифтом») */
  for(const ch of CS){
    const fg=finalGlyph(ch,st,state.edits);
    const cp=ch.codePointAt(0);
    enc.push({name:'uni'+cp.toString(16).toUpperCase().padStart(4,'0'),uni:cp,ch,adv:Math.round(fg.adv),cs:fg.cs});
  }
  enc.sort((a,b)=>a.uni-b.uni);glyphs.push(...enc); // .notdef первым, затем по кодам
  /* неэкодированные альтернаты (m.ss01, parenleft.case, zero.tnum…): правки базового знака переносятся */
  const have=new Set(CS),tabOn=!!st.p.tabular;
  for(const a of (typeof otAlternates==='function'?otAlternates():[])){
    if(!otAltOk(a,have,tabOn,italic))continue;
    if(opts.altFeats&&opts.altFeats.indexOf(a.feat)<0)continue;/* opts.altFeats: только нужные OpenType-свойства (постер: свойства «по умолчанию», без swsh/smcp/case…) */
    const ed=(state.edits&&edGet(state.edits,a.base)&&a.feat!=='ss01'&&a.feat!=='locl'&&!a.own)?Object.assign({},state.edits,{[edKey(a.name)]:edGet(state.edits,a.base)}):state.edits;
    const fg=finalGlyph(a.name,st,ed);if(!fg)continue;
    glyphs.push({name:a.name,uni:null,ch:a.name,alt:a,adv:Math.round(fg.adv),cs:fg.cs});
  }
  if(opts.decorate&&typeof decoApply==='function')decoApply(glyphs,opts.decorate,st); /* d1 */
  const uwTight=opts.uw?uwApply(glyphs,opts.uw,st,state):null; /* униширинные: advance знаков = эталон (core_vfx.js); кернинг ниже считается уже по подогнанным знакам */
  const uwRef=opts.uwCollect?uwRefAdv(glyphs):null;
  const ng=glyphs.length;
  /* glyf + loca */
  const glyf=new BW(),loca=[];let gxMin=1e9,gyMin=1e9,gxMax=-1e9,gyMax=-1e9,maxPts=0,maxCont=0,advMax=0,minLsb=1e9,minRsb=1e9,xMaxExt=-1e9;
  const metrics=[],cffAll=[];
  for(const g of glyphs){
    loca.push(glyf.len);
    /* opts.cff (core_otf.js): кубические контуры для CFF-таблицы вместо glyf; габариты — по узлам (кубика режется на экстремумах) */
    const cffc=opts.cff?g.cs.map(contourToCFF).filter(Boolean):null;if(cffc)cffAll.push(cffc);
    const conts=cffc?cffc.map(c=>c.pts):g.cs.map(contourToTT).filter(c=>c.length>=3);
    let npts=0;conts.forEach(c=>npts+=c.length);
    let xMin=0,yMin=0,xMax=0,yMax=0;
    if(conts.length){xMin=1e9;yMin=1e9;xMax=-1e9;yMax=-1e9;
      conts.forEach(c=>c.forEach(p=>{xMin=Math.min(xMin,p.x);yMin=Math.min(yMin,p.y);xMax=Math.max(xMax,p.x);yMax=Math.max(yMax,p.y);}));
      gxMin=Math.min(gxMin,xMin);gyMin=Math.min(gyMin,yMin);gxMax=Math.max(gxMax,xMax);gyMax=Math.max(gyMax,yMax);
      maxPts=Math.max(maxPts,npts);maxCont=Math.max(maxCont,conts.length);
      if(!cffc){glyf.i16(conts.length).i16(xMin).i16(yMin).i16(xMax).i16(yMax);
      let e=-1;conts.forEach(c=>{e+=c.length;glyf.u16(e);});
      glyf.u16(0);
      const flags=[],xs=[],ys=[];let px=0,py=0;
      conts.forEach(c=>c.forEach(p=>{flags.push(p.on?1:0);xs.push(p.x-px);ys.push(p.y-py);px=p.x;py=p.y;}));
      flags.forEach(f=>glyf.u8(f));xs.forEach(v=>glyf.i16(v));ys.forEach(v=>glyf.i16(v));
      glyf.pad4();}
    }
    metrics.push([g.adv,conts.length?xMin:0]);
    advMax=Math.max(advMax,g.adv);
    if(conts.length){minLsb=Math.min(minLsb,xMin);minRsb=Math.min(minRsb,g.adv-xMax);xMaxExt=Math.max(xMaxExt,xMax);}
  }
  loca.push(glyf.len);
  const locaT=new BW();loca.forEach(v=>locaT.u32(v));
  const hmtx=new BW();metrics.forEach(m=>hmtx.u16(m[0]).i16(m[1]));
  /* cmap: формат 4 */
  const pairs=glyphs.map((g,i)=>[g.uni,i]).filter(p=>p[0]!=null&&p[0]<0xFFFF).sort((a,b)=>a[0]-b[0]);
  const segs=[];
  for(const [u,gi] of pairs){const l=segs[segs.length-1];if(l&&u===l.end+1&&gi-u===l.delta){l.end=u;}else segs.push({start:u,end:u,delta:gi-u});}
  segs.push({start:0xFFFF,end:0xFFFF,delta:1});
  const sc=segs.length,pw=1<<Math.floor(Math.log2(sc));
  const sub4=new BW();
  sub4.u16(4).u16(16+sc*8).u16(0).u16(sc*2).u16(pw*2).u16(Math.floor(Math.log2(sc))).u16(sc*2-pw*2);
  segs.forEach(s=>sub4.u16(s.end));sub4.u16(0);segs.forEach(s=>sub4.u16(s.start));
  segs.forEach(s=>sub4.u16(((s.delta%65536)+65536)%65536));segs.forEach(()=>sub4.u16(0));
  const cmap=new BW();cmap.u16(0).u16(2);cmap.u16(0).u16(3).u32(20);cmap.u16(3).u16(1).u32(20);cmap.bytes(sub4.b);
  /* head */
  const head=new BW();
  const now=Math.floor(Date.now()/1000)+2082844800;
  head.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5F0F3CF5).u16(0x000B).u16(1000).u32(0).u32(now).u32(0).u32(now)
      .i16(gxMin).i16(gyMin).i16(gxMax).i16(gyMax).u16((isBold?1:0)|(italic?2:0)).u16(8).i16(2).i16(1).i16(0);
  /* вертикальные метрики — по фактическим габаритам всех глифов, запас ~2% */
  const VM=fontVMetrics(st.p,gyMin,gyMax);
  const hhea=new BW();
  hhea.u32(0x00010000).i16(VM.asc).i16(VM.desc).i16(VM.gap).u16(advMax).i16(minLsb).i16(minRsb).i16(xMaxExt)
      .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(ng);
  {const _fu=FONTS[opts.fontId||CUR_FONT];if(!italic&&_fu&&_fu.uprightAngle){const t=Math.tan(-_fu.uprightAngle(st.p)*Math.PI/180),rise=1000,run=Math.round(1000*t);hhea.b.splice(18,4,(rise>>8)&255,rise&255,(run>>8)&255,run&255);}}/* FIX-ENGINE: прямое начертание с видимым наклоном письма (Пропись) */
  if(italic){ // каретка по наклону
    const t=Math.tan(st.p.slant*Math.PI/180);
    const rise=1000,run=Math.round(1000*t);hhea.b.splice(18,4,(rise>>8)&255,rise&255,(run>>8)&255,run&255);
  }
  /* maxp */
  const maxp=new BW();maxp.u32(0x00010000).u16(ng).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(2);for(let q=0;q<8;q++)maxp.u16(0);
  /* kern (формат 0) */
  const kp=[];const kmap=Object.assign({},st.kern||{},st.ku||{});
  const gidOf={};glyphs.forEach((g,gi)=>{if(g.uni!=null)gidOf[String.fromCodePoint(g.uni)]=gi;});
  for(const key of Object.keys(kmap)){const cc=Array.from(key);if(cc.length!==2)continue;const l=gidOf[cc[0]],r=gidOf[cc[1]],v=Math.round(kmap[key]);if(l==null||r==null||!v)continue;kp.push([l,r,Math.max(-32000,Math.min(32000,v))]);}
  /* капитель: кернинг соответствующих прописных, масштаб по высоте (OTO) */
  if(typeof OTO!=='undefined'&&OTO.on(CUR_FONT)){const sc={},f=OTO.CFG[CUR_FONT].hx*st.p.xh/st.p.capH;
    glyphs.forEach((g,gi)=>{if(g.alt&&g.alt.ot)for(const o of g.alt.ot)if(o[0]==='c2sc')sc[o[1]]=gi;});
    for(const key of Object.keys(kmap)){const cc=Array.from(key);if(cc.length!==2)continue;const l=sc[cc[0]],r=sc[cc[1]],v=Math.round(kmap[key]*f);if(l==null||r==null||!v)continue;kp.push([l,r,Math.max(-32000,Math.min(32000,v))]);}}
  kp.sort((x,y)=>x[0]-y[0]||x[1]-y[1]);
  let kern=null;
  if(kp.length){kern=new BW();const nk=kp.length,e=Math.floor(Math.log2(nk)),sr=(1<<e)*6;
    kern.u16(0).u16(1).u16(0).u16(14+6*nk).u16(1).u16(nk).u16(sr).u16(e).u16(nk*6-sr);kp.forEach(p=>kern.u16(p[0]).u16(p[1]).i16(p[2]));}
  /* OS/2 v4 */
  const os2=new BW();
  const avg=Math.round(metrics.reduce((a,m)=>a+m[0],0)/ng);
  /* fsSelection: ITALIC(0) | BOLD(5) | REGULAR(6) | USE_TYPO_METRICS(7) */
  const fsSel=(italic?1:0)|(isBold?32:0)|(!italic&&!isBold?64:0)|128;
  const PW={100:2,200:3,300:4,400:5,500:6,600:7,700:8,800:9,900:10};
  const panW=PW[Math.round(wClass/100)*100]||5;
  const cps=pairs.map(p=>p[0]);
  os2.u16(4).i16(avg).u16(wClass).u16(5).u16(0)
     .i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350)
     .i16(Math.max(20,Math.round(st.p.stem*0.4))).i16(Math.round(st.p.xh*0.6)).i16(0)
     .bytes([2,0,panW,0,0,0,0,0,0,0])
     .u32(0x80000203).u32(2).u32(0).u32(0)
     .tag('GTYP').u16(fsSel).u16(Math.min(0xFFFF,cps[0]||32)).u16(Math.min(0xFFFF,cps[cps.length-1]||0x2116))
     .i16(VM.asc).i16(VM.desc).i16(VM.gap).u16(VM.winAsc).u16(VM.winDesc)
     .u32(5).u32(0).i16(Math.round(st.p.xh)).i16(Math.round(st.p.capH)).u16(0).u16(32).u16(kp.length?2:1);
  /* name */
  const strs={1:nm1,2:nm2,3:'1.000;GTYP;'+psName,4:full,5:'Version 1.000',6:psName,16:family,17:nm17,256:(FONTS[CUR_FONT]&&FONTS[CUR_FONT].ss01Name)||'Классическая m'};
  const _s2=FONTS[CUR_FONT]&&FONTS[CUR_FONT].ss02Name;if(_s2)strs[257]=_s2;
  const ids=[1,2,3,4,5,6,16,17,256].concat(_s2?[257]:[]),name=new BW();
  let off=0;const recs=[],store=[];
  ids.forEach(id=>{const u=utf16(strs[id]);recs.push([id,u.length,off]);store.push(...u);off+=u.length;});
  name.u16(0).u16(ids.length).u16(6+ids.length*12);
  recs.forEach(r=>name.u16(3).u16(1).u16(0x409).u16(r[0]).u16(r[1]).u16(r[2]));name.bytes(store);
  /* post v3 */
  const post=new BW();
  const _fIA=FONTS[opts.fontId||CUR_FONT];const _ia=italic&&_fIA&&_fIA.italicAngle?_fIA.italicAngle(st.p):(!italic&&_fIA&&_fIA.uprightAngle?_fIA.uprightAngle(st.p):-(italic?st.p.slant:0));post.u32(0x00020000).i32(Math.round(_ia*65536)).i16(-130).i16(70).u32(0).u32(0).u32(0).u32(0).u32(0);
  { /* post v2: имена глифов (uniXXXX, m.ss01, parenleft.case …) */
    post.u16(ng);const strsP=[];glyphs.forEach((g,i)=>{if(i===0){post.u16(0);return;}post.u16(258+strsP.length);strsP.push(g.name.replace(/[^\x21-\x7e]/g,'_').slice(0,63));});
    strsP.forEach(n=>{post.u8(n.length);for(let i=0;i<n.length;i++)post.u8(n.charCodeAt(i));}); }
  /* GSUB (case, ss01, tnum/pnum) и GPOS (kern: ручные пары + классы) */
  const otl=typeof buildOTL==='function'?buildOTL(glyphs,st,st.kern||{},opts.decorate&&opts.decorate.style==='cameo'?'-nokern':opts.fontId):{}; /* d1: у выворотного нет класс-кернинга */
  /* gasp */
  const gasp=new BW();gasp.u16(1).u16(1).u16(0xFFFF).u16(0x000F);
  const tables={'OS/2':os2.b,'cmap':cmap.b,'gasp':gasp.b,'glyf':glyf.b,'head':head.b,'hhea':hhea.b,'hmtx':hmtx.b,'loca':locaT.b,'maxp':maxp.b,'name':name.b,'post':post.b};
  if(otl.GSUB)tables['GSUB']=otl.GSUB;if(otl.GPOS)tables['GPOS']=otl.GPOS;
  /* паспорт шрифта (core_meta_l1.js): подменяет только OS/2, name, gasp и head — контуры, метрики, cmap и OpenType-таблицы не трогает */
  if(typeof metaTables==='function')Object.assign(tables,metaTables({fontId:opts.fontId||CUR_FONT,st,family,italic,isBold,wName,wClass,strs,glyphs,VM,head:head.b,maxCtx:kp.length?2:1,nameIds:otl.nameIds||[]}));
  if(opts.cff){cffTablesSwap(tables,{cffAll,glyphs,psName,ng,maxpNote:1});}
  const tags=Object.keys(tables).sort();
  const nt=tags.length,sr=(1<<Math.floor(Math.log2(nt)))*16;
  const out=new BW();
  out.u32(opts.cff?0x4F54544F:0x00010000).u16(nt).u16(sr).u16(Math.floor(Math.log2(nt))).u16(nt*16-sr);
  let pos=12+nt*16;const layout={};
  tags.forEach(t=>{const L=tables[t].length;layout[t]=pos;pos+=(L+3)&~3;});
  tags.forEach(t=>{out.tag(t).u32(checksum(tables[t])).u32(layout[t]).u32(tables[t].length);});
  tags.forEach(t=>{out.bytes(tables[t]).pad4();});
  const sum=checksum(out.b);const adj=(0xB1B0AFBA-sum)>>>0;
  const hp=layout['head']+8;out.b[hp]=(adj>>>24)&255;out.b[hp+1]=(adj>>>16)&255;out.b[hp+2]=(adj>>>8)&255;out.b[hp+3]=adj&255;
  return {bytes:new Uint8Array(out.b),fileName:psName+(opts.cff?'.otf':'.ttf'),glyphCount:ng,psName,metrics:VM,classKern:otl.classKern||null,uwTight,uwRef};
}
/* ===== WOFF 1.0: таблицы TTF, сжатые zlib (deflate с заголовком) ===== */
async function zlibDeflate(u8){
  if(typeof CompressionStream==='function'){
    const cs=new CompressionStream('deflate');
    const out=new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer();
    return new Uint8Array(await out);
  }
  if(typeof require==='function'){try{return new Uint8Array(require('zlib').deflateSync(u8,{level:9}));}catch(e){}}
  return null;
}
async function buildWOFF(ttf,deflate){
  ttf=ttf instanceof Uint8Array?ttf:new Uint8Array(ttf);
  deflate=deflate||zlibDeflate;
  const r16=o=>(ttf[o]<<8)|ttf[o+1],r32=o=>((ttf[o]<<24)|(ttf[o+1]<<16)|(ttf[o+2]<<8)|ttf[o+3])>>>0;
  const flavor=r32(0),nt=r16(4),tabs=[];
  let sfntSize=12+16*nt;
  for(let i=0;i<nt;i++){const o=12+i*16;
    const t={tag:String.fromCharCode(ttf[o],ttf[o+1],ttf[o+2],ttf[o+3]),sum:r32(o+4),off:r32(o+8),len:r32(o+12)};
    t.data=ttf.subarray(t.off,t.off+t.len);sfntSize+=(t.len+3)&~3;tabs.push(t);}
  tabs.sort((a,b)=>a.tag<b.tag?-1:a.tag>b.tag?1:0);
  for(const t of tabs){let z=null;try{z=await deflate(t.data);}catch(e){z=null;}
    t.comp=(z&&z.length<t.len)?z:t.data;}
  const w=new BW();
  let pos=44+20*nt;
  for(const t of tabs){t.woff=pos;pos+=(t.comp.length+3)&~3;}
  const total=pos; /* последняя таблица тоже выровнена до 4 байт — иначе OTS (Chrome) отвергает файл */
  w.tag('wOFF').u32(flavor).u32(total).u16(nt).u16(0).u32(sfntSize).u16(1).u16(0)
   .u32(0).u32(0).u32(0).u32(0).u32(0);
  for(const t of tabs)w.tag(t.tag).u32(t.woff).u32(t.comp.length).u32(t.len).u32(t.sum);
  const out=new Uint8Array(total);out.set(w.b,0);
  for(const t of tabs)out.set(t.comp,t.woff);
  return out;
}
/* общие вертикальные метрики для семейства: одинаковый интерлиньяж во всех весах */
function unionVMetrics(list){
  const v=list.filter(Boolean);if(!v.length)return null;
  return {asc:Math.max(...v.map(m=>m.asc)),desc:Math.min(...v.map(m=>m.desc)),gap:0,
    winAsc:Math.max(...v.map(m=>m.winAsc)),winDesc:Math.max(...v.map(m=>m.winDesc))};
}
function setVMetrics(ttf,VM){
  const b=new Uint8Array(ttf),nt=(b[4]<<8)|b[5],dir={};
  const r32=o=>((b[o]<<24)|(b[o+1]<<16)|(b[o+2]<<8)|b[o+3])>>>0;
  for(let i=0;i<nt;i++){const o=12+i*16;dir[String.fromCharCode(b[o],b[o+1],b[o+2],b[o+3])]={rec:o,off:r32(o+8),len:r32(o+12)};}
  const w16=(o,v)=>{v=v<0?v+65536:v;b[o]=(v>>8)&255;b[o+1]=v&255;};
  const w32=(o,v)=>{b[o]=(v>>>24)&255;b[o+1]=(v>>>16)&255;b[o+2]=(v>>>8)&255;b[o+3]=v&255;};
  const H=dir['hhea'],O=dir['OS/2'],HD=dir['head'];if(!H||!O||!HD)return b;
  w16(H.off+4,VM.asc);w16(H.off+6,VM.desc);w16(H.off+8,VM.gap);
  w16(O.off+68,VM.asc);w16(O.off+70,VM.desc);w16(O.off+72,VM.gap);w16(O.off+74,VM.winAsc);w16(O.off+76,VM.winDesc);
  w32(HD.off+8,0);
  for(const t of ['hhea','OS/2','head']){const d=dir[t];w32(d.rec+4,checksum(b.subarray(d.off,d.off+d.len)));}
  w32(HD.off+8,(0xB1B0AFBA-checksum(b))>>>0);
  return b;
}
