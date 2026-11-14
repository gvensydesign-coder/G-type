/* ---------- «Сцепка»: конструкторные лигатуры — режимы пар, жёсткие нижние пороги, сборка ----------
   режимы: share (общая стойка, обе полной высоты) | roof (верхняя перекладина одной переходит в крышу другой: настоящее слияние)
           | shelf (рука над: партнёр ≥ .72 высоты) | nest (партнёр ступенью вверх/вниз ≥ .78 прописной / .88 строчной) | foot (стопа латинской L ≤ .5 ширины партнёра) */
const ST_YG0=-420,ST_YG1=1248;
const ST_FLOOR_CAPS=0.72,ST_NEST_CAPS=0.78,ST_NEST_LC=0.88,ST_FOOT_MAX=0.5;
const ST_SHARE={'НН':1,'НА':2,'НЕ':1,'НЫ':2,'НЬ':2,'НП':2,'НМ':2,'ПИ':1,'ПЕ':2,'ПА':2,'ПО':2,'ИМ':1,'ИИ':2,'ИП':2,'МИ':1,'ММ':1,'МА':2,'МН':2,
  'NN':1,'MM':1,'HM':2,'NM':2,'HE':1,'MA':1,'NA':2,'NE':2};
const ST_ROOF={'ЕТ':1,'ET':1};
const ST_SHELF={'ТО':1,'ТА':1,'ТИ':1,'ТН':2,'ТЬ':1,'ТЯ':2,'ТЕ':1,'ТС':2,'РО':1,'РА':1,'РЕ':2,'ГО':1,'ГА':1,'ГИ':2,'ГН':2,'ГЯ':2,'ГЕ':2,
  'PO':1,'PA':1,'PE':2,'TA':1,'TO':1,'TE':1,'TH':2,'TC':2};
const ST_NEST={'КА':1,'ХА':1,'KA':1,'XA':1};
const ST_FOOT={'LA':1,'LE':1,'LO':1};
const ST_TRIPLES={};
const ST_MODE_OF={},ST_TIER={};
for(const [tb,m] of [[ST_SHARE,'share'],[ST_ROOF,'roof'],[ST_SHELF,'shelf'],[ST_NEST,'nest'],[ST_FOOT,'foot']])for(const k in tb){ST_MODE_OF[k]=m;ST_TIER[k]=tb[k];}
for(const k in ST_TRIPLES)ST_TIER[k]=ST_TRIPLES[k];
const ST_LC_DROP=new Set(['нп','нн','пн','на','по','па']);   /* строчные: читаются как ю */
const stPairsAll=()=>Object.keys(ST_MODE_OF).concat(Object.keys(ST_TRIPLES)).map(k=>[k,ST_TIER[k]]);
const stNoLcDy=sp=>![...sp].some(ch=>ST_LC_DY[ch]!=null);
/* кусок: {polys,w} в абсолютных x */
const stPShift=(P,dx,dy)=>({polys:stShift(P.polys,dx,dy||0),w:P.w});
const stPBox=P=>stBBox(P.polys);
function stBP(ch,c,H,xt,xf){const b=({'Й':'И','Ё':'Е','й':'И','ё':'Е'})[ch]||stBaseOf(ch);return stBuild(b,c,H,xt,xf);}
function stTuck(A,B,g,ymax){const ar=stProfile(A.polys,'r',ST_YG0,ST_YG1,4),bl=stProfile(B.polys,'l',ST_YG0,ST_YG1,4);let best=null;
  for(let i=0;i<ar.length;i++){const y=ST_YG0+4*i;const a=ar[i],b=bl[i];if(a==null||b==null)continue;if(ymax!=null&&y>ymax)continue;const v=a-b+g;if(best===null||v>best)best=v;}
  return best;}
function stPlacePair(a,b,Hc,c,lc){const g=c.gap,S=c.S,T=c.T,key=(a+b).toUpperCase();let mode=ST_MODE_OF[key];
  if(!mode&&key==='ИН')mode='share';if(!mode)return null;
  const A0=stBP(a.toUpperCase(),c,Hc);
  if(mode==='share'){const B=stPShift(stBP(b.toUpperCase(),c,Hc),A0.w-S);return [A0,B,mode];}
  if(mode==='roof'){const B0=stBP(b.toUpperCase(),c,Hc);const dx=stTuck(A0,B0,g,Hc-T-4);const dxm=stPBox(A0)[2]-2-stPBox(B0)[0];
    if(dx>dxm+0.5)return null;return [A0,stPShift(B0,dxm),mode];}
  if(mode==='shelf'){if(lc)return null;const hB=Hc-T-g;if(hB<ST_FLOOR_CAPS*Hc)return null;
    const B0=stBP(b.toUpperCase(),c,hB);const dx=stTuck(A0,B0,g);const B=stPShift(B0,dx);const need=stPBox(B)[2]-A0.w;
    return [stBP(a.toUpperCase(),c,Hc,Math.max(0,need),0),B,mode];}
  if(mode==='nest'){const f=lc?ST_NEST_LC:ST_NEST_CAPS,hB=f*Hc;let best=null;
    for(const al of [0,1]){const B0=stBP(b.toUpperCase(),c,hB);const oy=al===0?0:Hc-hB;const B1=stPShift(B0,0,oy);
      const dx=stTuck(A0,B1,g);const wid=Math.max(stPBox(B1)[2]+dx,stPBox(A0)[2]);if(best===null||wid<best[0]-1)best=[wid,dx,B1];}
    return [A0,stPShift(best[2],best[1]),mode];}
  if(mode==='foot'){if(lc)return null;const oy=T+g,hB=Hc-oy;if(hB<ST_FLOOR_CAPS*Hc)return null;
    const B0=stPShift(stBP(b.toUpperCase(),c,hB),0,oy);const dx=stTuck(A0,B0,g);const B=stPShift(B0,dx);
    const bb=stPBox(B),wB=bb[2]-bb[0],xf=Math.max(0,bb[0]+ST_FOOT_MAX*wB-A0.w);
    return [stBP(a.toUpperCase(),c,Hc,0,xf),B,mode];}
  return null;}
/* topo: число дыр у куска */
const stHolesOf=P=>stTopo(P.polys).holes;
/* сборка лигатуры: spec из 2–3 букв (в нужном регистре); -> {cs,w,groups,info} или null */
function stCompose(spec,Hc,c,lc){if(lc==null)lc=spec[0]!==spec[0].toUpperCase();
  const chars=[...spec];const first=stPlacePair(chars[0],chars[1],Hc,c,lc);if(!first)return null;
  const parts=[first[0],first[1]],modes=[first[2]];
  if(chars.length===3){const m=first[2];if(m!=='share'&&m!=='roof')return null;
    const key=(chars[1]+chars[2]).toUpperCase();const m2=ST_MODE_OF[key]||(key==='ИН'?'share':null);if(m2!=='share'&&m2!=='roof')return null;
    const pp=stPlacePair(chars[1],chars[2],Hc,c,lc);if(!pp)return null;
    const offs=stPBox(first[1])[0]-stPBox(stBP(chars[1].toUpperCase(),c,Hc))[0];
    parts.push(stPShift(pp[1],offs));modes.push(m2);}
  let polys=[];const groups=[];
  chars.forEach((ch,i)=>{let P=parts[i].polys;if('ЙЁйё'.includes(ch))P=P.concat(stAccents(ch,c,Hc,parts[i].w));groups.push(stCopy(P));polys=polys.concat(P);});
  let cs=stFinish(polys,c.r,c.ri);
  let x0=1e9,x1=-1e9;for(const k of cs)for(const v of k.poly){if(v[0]<x0)x0=v[0];if(v[0]>x1)x1=v[0];}
  const sh=k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x-x0,y:n.y,a:{x:n.a.x-x0,y:n.a.y},b:{x:n.b.x-x0,y:n.b.y}})),poly:k.poly.map(v=>[v[0]-x0,v[1]])});
  cs=cs.map(sh);const gr=groups.map(g=>stShift(g,-x0,0));
  const plainW=chars.reduce((s,ch)=>s+stBP(ch.toUpperCase(),c,Hc).w,0);
  return {cs,w:x1-x0,groups:gr,info:{mode:modes[0],modes,spec,holes:parts.reduce((s,P)=>s+stHolesOf(P),0),saving:plainW-(x1-x0)}};}
/* набор: все допустимые лигатуры одного регистра. density — предел яруса для keep (по умолчанию 3 = все) */
function stLigSet(c,lower,density){density=density==null?3:density;const res=[];
  for(const [spec,tier] of stPairsAll()){const sp=lower?spec.toLowerCase():spec;
    if(lower&&(!stNoLcDy(sp)||ST_LC_DROP.has(sp)))continue;
    let H,cc;if(lower){H=ST_CAPH*c.lcr;cc=stLcCtx(c);}else{H=ST_CAPH;cc=c;}
    const P=stCompose(sp,H,cc,lower);if(!P)continue;
    let ok=tier<=density;const t=stTopo(P.cs.map(k=>({p:k.poly,h:k.hole})));if(t.holes!==P.info.holes)ok=false;
    res.push({spec:sp,tier,lower,cs:P.cs,w:P.w,groups:P.groups,info:P.info,keep:ok});}
  return res;}
