/* ---------- «Сцепка»: параметры, кэш, метрики, кернинг, набор лигатур ---------- */
const ST_DEF={S:138,wd:1,rnd:0.45,gap:44,lcr:0.72,jump:1};
const ST_LIM={S:[112,164,1],wd:[0.85,1.25,0.01],rnd:[0.05,0.70,0.01],gap:[14,60,1],lcr:[0.60,0.84,0.01],jump:[0,1.5,0.05]};
function stSafe(p){const q=Object.assign({},ST_DEF,p||{});for(const k in ST_LIM){const [a,b]=ST_LIM[k];let v=+q[k];if(!isFinite(v))v=ST_DEF[k];q[k]=stCL(v,a,b);}q.S=Math.round(q.S);q.gap=Math.round(q.gap);return q;}
const ST_KEY=q=>[q.S,q.wd,q.rnd,q.gap,q.lcr,q.jump].join('|');
const ST_WEIGHTS={Light:118,Regular:138,Bold:152,Black:164};
const stShiftCS=(cs,dx,dy)=>cs.map(k=>({hole:k.hole,nodes:k.nodes.map(n=>({x:n.x+dx,y:n.y+dy,a:{x:n.a.x+dx,y:n.a.y+dy},b:{x:n.b.x+dx,y:n.b.y+dy}})),poly:k.poly.map(v=>[v[0]+dx,v[1]+dy])}));
/* метрики: поле слева/справа из оптического баланса, зашито в контур (x ink = sbl) */
function stFinishGlyph(cs,wRaw,cfg){
  if(!cs.length)return {cs:[],adv:wRaw,gs:{empty:true,sbl:0,sbr:0},dx:0,x0:0,x1:0};
  const polys=stPolysOf(cs),gs=stGS(polys,cfg),b=stBBox(polys);const dx=gs.sbl-b[0];
  return {cs:stShiftCS(cs,dx,0),adv:(b[2]-b[0])+gs.sbl+gs.sbr,gs,dx,x0:b[0],x1:b[2]};}
const stData_cache=new Map();
function stData(pIn){const q=stSafe(pIn),key=ST_KEY(q);let D=stData_cache.get(key);if(D)return D;
  const c=stCtx(q),cfg=stSpCfg(q.gap);
  D={q,c,cfg,key,gl:new Map(),lig:new Map(),sets:{},kc:new Map(),T0:null};
  D.glyph=ch=>{let g=D.gl.get(ch);if(g!==undefined)return g;
    const P=stGlyphPiece(ch,c);if(!P){D.gl.set(ch,null);return null;}
    let cs=P.cs;if(P.dy)cs=stShiftCS(cs,0,P.dy);
    g=stFinishGlyph(cs,P.w,cfg);g.dy=P.dy;g.raw=P.raw;g.ch=ch;D.gl.set(ch,g);return g;};
  /* лигатуры: каждая отдельно (профили дорогие), набор регистра — из отдельных */
  D.ligGet=spec=>{let r=D.lig.get(spec);if(r!==undefined)return r;
    const lower=spec[0]!==spec[0].toUpperCase(),sp0=spec.toUpperCase(),tier=ST_TIER[sp0];r=null;
    if(tier!=null&&(!lower||(stNoLcDy(spec)&&!ST_LC_DROP.has(spec)))){
      const H=lower?ST_CAPH*c.lcr:ST_CAPH,cc=lower?stLcCtx(c):c,P=stCompose(spec,H,cc,lower);
      if(P){const t=stTopo(P.cs.map(k=>({p:k.poly,h:k.hole})));const f=stFinishGlyph(P.cs,P.w,cfg);
        r={spec,tier,lower,cs:f.cs,w:P.w,groups:P.groups,info:P.info,adv:f.adv,gs:f.gs,dx:f.dx,keep:t.holes===P.info.holes};}}
    D.lig.set(spec,r);return r;};
  D.ligSet=lower=>{const k=lower?'l':'u';if(D.sets[k])return D.sets[k];const arr=[];
    for(const [spec] of stPairsAll()){const r=D.ligGet(lower?spec.toLowerCase():spec);if(r)arr.push(r);}
    return D.sets[k]=arr;};
  D.ligAll=()=>D.ligSet(false).concat(D.ligSet(true));
  D.kernTarget=()=>{if(D.T0==null){const h=D.glyph('Н');D.T0=stPair(h.gs,h.gs).area;}return D.T0;};
  /* кернинг пары знаков (только буквы и цифры) */
  D.kern=(a,b)=>{const id=a+'\u0001'+b;let k=D.kc.get(id);if(k!==undefined)return k;
    const ga=D.glyph(a),gb=D.glyph(b);k=0;
    if(ga&&gb&&!ga.gs.empty&&!gb.gs.empty&&stIsAlnum(a)&&stIsAlnum(b)){k=stKernFor(ga.gs,gb.gs,D.kernTarget(),cfg);if(Math.abs(k)<4)k=0;}
    D.kc.set(id,k);return k;};
  if(stData_cache.size>12)stData_cache.clear();
  stData_cache.set(key,D);return D;}
const stIsAlnum=ch=>/[\p{L}\p{N}]/u.test(ch);
const ST_KERN_CHARS=()=>[...ST_LAT_U+ST_LAT_L+ST_CYR_U+ST_CYR_L+'Ёё'+ST_DIG];
