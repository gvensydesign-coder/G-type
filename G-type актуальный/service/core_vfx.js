/* ===== Оси вариативного шрифта (wght, wdth, opsz, slnt) и униширинность =====
   Все оси строятся из тех же параметрических глифов: мастер = состояние параметров в углу пространства дизайна.
   Кривые (параметры p после famParams веса; t — координата дизайна оси opsz −1…+1, wr = wdth/100):
   • wght 300…900: famParams (Light 0.22 · Regular 0.315 · Bold 0.437 · Black 0.53 от xh), мастера Light/Bold/Black.
   • wdth (по умолчанию 75…125 %, у шрифта — в пределах paramLimits wdth): wdth ← wdth·wr; ствол и горизонталь ·wr^0.2
     (узкий — чуть тоньше, чтобы не закрывать просветы); sb ·wr^0.5; space ·wr^0.85. Мастера: Narrow/Wide + 6 углов wght×wdth (Light/Bold/Black × Narrow/Wide) — все 12 именованных экземпляров точные.
   • opsz 8…72 pt (по умолчанию 14), координата дизайна — по логарифму кегля (avar): t=ln(v/14)/ln(72/14) при v>14,
     −ln(14/v)/ln(14/8) при v<14. Для s=max(0,−t) (мелко) и u=max(0,t) (крупно), множитель = 1+a_s·s+a_u·u:
       sb 1+0.20s−0.12u · space 1+0.08s−0.05u · track +14s−6u (ед.) · hair 1+0.14s−0.18u · xh 1+0.03s−0.015u · aper 1+0.18s−0.10u
     (мелкий кегль: шире интервал, ниже контраст, выше x-height и шире апертуры; крупный — теснее, контрастнее).
   • slnt −12…0 (только прямое начертание шрифта с slant=0): slant=−slnt, icomp как у курсива шрифта; формы курсива (p.ital) не трогаются.
     Пропись (скрипт с собственным наклоном и формами) и италик-файлы получают наклон статикой (ital 0/1 в STAT).
   Униширинные: advance каждого знака любого веса = advance Regular; тело знака перераспределяется внутри advance
   (отношение левого/правого поля сохраняется), при нехватке места знак сжимается по горизонтали ровно настолько, чтобы остались поля. */
const VFX_AXES={
  wght:{tag:'wght',name:'Weight',ru:'Насыщенность',min:300,def:400,max:900},
  wdth:{tag:'wdth',name:'Width',ru:'Ширина',min:75,def:100,max:125},
  opsz:{tag:'opsz',name:'Optical size',ru:'Оптический размер',min:8,def:14,max:72},
  slnt:{tag:'slnt',name:'Slant',ru:'Наклон',min:-12,def:0,max:0}};
const VFX_ORDER=['wght','wdth','opsz','slnt'];
/* оси по шрифтам: Пропись — соединяемый скрипт с собственным наклоном и тонкими связками: только wght (наклон и ширина — отдельными начертаниями) */
/* W88 V: Нить (волосной рукописный штрих) и Кортес (после глифа Ю топология в узлах осей opsz/slnt расходится со статикой): только wght; Тяга: wght+opsz+slnt (wdth не проходит пробу: несовместимые мастера) */
const VFX_FONT_AXES={propis:['wght'],ustav:['wght','wdth','opsz'],nit:['wght'],kortes:['wght'],tyaga:['wght','opsz','slnt']};
function vfxAvailable(styleKey,p,font){
  const own=VFX_FONT_AXES[font||CUR_FONT]||VFX_ORDER;
  return VFX_ORDER.filter(t=>own.includes(t)&&!(t==='slnt'&&!(styleKey==='regular'&&!(p.slant>0.01))));
}
const VFX_OPSZ={sb:[0.20,-0.12],space:[0.08,-0.05],hair:[0.14,-0.18],xh:[0.03,-0.015],aper:[0.18,-0.10],track:[14,-6]};
/* кегль -> координата дизайна (логарифм) и обратно; avar переводит линейную пользовательскую шкалу в эту */
function vfxOpszT(v){const A=VFX_AXES.opsz;return v===A.def?0:v>A.def?Math.log(v/A.def)/Math.log(A.max/A.def):-Math.log(A.def/v)/Math.log(A.def/A.min);}
function vfxOpszV(t){const A=VFX_AXES.opsz;return t===0?A.def:t>0?A.def*Math.exp(t*Math.log(A.max/A.def)):A.def*Math.exp(t*Math.log(A.def/A.min));}
/* координата дизайна оси -> значение в единицах оси (ax: {tag,min,def,max}) и обратно */
function vfxReal(ax,c){
  if(ax.tag==='wght')return vfWeightOf(c);
  if(ax.tag==='opsz')return vfxOpszV(c);
  if(ax.tag==='slnt')return c*(ax.def-ax.min);
  return c<0?ax.def+c*(ax.def-ax.min):ax.def+c*(ax.max-ax.def);}
function vfxCoord(ax,v){
  if(ax.tag==='wght')return vfCoordOf(v);
  if(ax.tag==='opsz')return vfxOpszT(v);
  if(ax.tag==='slnt')return (v-ax.def)/(ax.def-ax.min);
  return v<ax.def?(v-ax.def)/(ax.def-ax.min):v>ax.def?(v-ax.def)/(ax.max-ax.def):0;}
/* пользовательская (линейная) нормализация значения: min→−1, def→0, max→1 */
const vfxUser=(ax,v)=>v<ax.def?(v-ax.def)/(ax.def-ax.min):v>ax.def?(v-ax.def)/(ax.max-ax.def):0;
/* параметры в точке пространства: loc={wght,wdth,opsz,slnt} в единицах осей */
function vfxParams(p,loc){
  const q=Object.assign({},p),wr=(loc.wdth||100)/100;
  if(wr!==1){
    if(q.wdth!=null)q.wdth=q.wdth*wr;
    const k=Math.pow(wr,0.2);if(q.stem!=null)q.stem=Math.round(q.stem*k);if(q.hair!=null)q.hair=Math.round(q.hair*k);
    if(q.sb>0)q.sb=Math.round(q.sb*Math.pow(wr,0.5));if(q.space>0)q.space=Math.round(q.space*Math.pow(wr,0.85));
  }
  const t=loc.opsz==null?0:vfxOpszT(loc.opsz);
  if(t!==0){
    const s=Math.max(0,-t),u=Math.max(0,t),f=a=>1+a[0]*s+a[1]*u,O=VFX_OPSZ;
    if(q.sb>0){q.sb=Math.round(q.sb*f(O.sb));q.track=Math.round((q.track||0)+O.track[0]*s+O.track[1]*u);}
    if(q.space>0)q.space=Math.round(q.space*f(O.space));
    if(q.hair!=null)q.hair=Math.round(q.hair*f(O.hair));
    if(q.xh!=null&&q.capH!=null&&q.xh<q.capH*0.9)q.xh=Math.round(q.xh*f(O.xh));
    if(q.aper!=null)q.aper=Math.round(q.aper*f(O.aper));
  }
  if(loc.slnt){
    q.slant=(q.slant||0)-loc.slnt;
    const it=typeof FONTS==='object'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].DEFAULTS&&FONTS[CUR_FONT].DEFAULTS.italic;
    q.icomp=Math.max(q.icomp||0,(it&&it.icomp)||40);
  }
  return q;
}
function vfxStyleState(styleKey,state,loc){
  const b=vfStateAtW(styleKey,state,loc.wght==null?400:loc.wght);
  b.p=vfxParams(b.p,loc);return b;
}
/* план: оси, мастера (координаты дизайна), тестовые точки. sel — список тегов; недоступные оси молча отбрасываются (plan.dropped) */
function vfxPlan(styleKey,state,sel){
  const p0=state.styles[styleKey].p;
  sel=sel&&sel.length?sel:['wght'];
  const axes=[],dropped=[];
  const pd=vfStateAtW(styleKey,state,400).p;
  for(const tag of VFX_ORDER){
    if(!sel.includes(tag))continue;
    const d=VFX_AXES[tag],ax={tag,name:d.name,ru:d.ru,min:d.min,def:d.def,max:d.max};
    if(!vfxAvailable(styleKey,p0).includes(tag)){dropped.push(tag+':'+(tag==='slnt'?'ital':'font'));continue;}
    if(tag==='wdth'){
      const pw=safeP(pd).wdth,L=paramLimits(pd).L.wdth||[80,140];
      ax.min=Math.max(75,Math.round(100*Math.max(L[0],0.75*pw)/pw));ax.max=Math.min(125,Math.round(100*Math.min(L[1],1.25*pw)/pw));
      /* узкий край не должен схлопывать контраст весов: ствол Bold/Black после safeP не меньше 88% от заданного */
      const stemOk=m=>[700,900].every(w=>{const r=vfxStyleState(styleKey,state,{wght:w,wdth:m,opsz:14,slnt:0}).p,c=safeP(r);return c.stem>=0.88*r.stem;});
      while(ax.min<100&&!stemOk(ax.min))ax.min++;
      if(ax.max<=100||ax.min>=100){dropped.push('wdth:range');continue;}
    }
    axes.push(ax);
  }
  if(!axes.length)axes.push(Object.assign({},VFX_AXES.wght));
  const A=axes.length,ix={};axes.forEach((a,i)=>ix[a.tag]=i);
  const mk=(vals,label)=>{const coord=new Array(A).fill(0);for(const t in vals)coord[ix[t]]=vals[t];
    const loc={wght:400,wdth:100,opsz:14,slnt:0};axes.forEach((a,i)=>{loc[a.tag]=vfxReal(a,coord[i]);});
    return {coord,loc,label:label||''};};
  const masters=[mk({},'Regular')];
  const has=t=>ix[t]!=null;
  if(has('wght')){masters.push(mk({wght:-1},'Light'),mk({wght:0.6},'Bold'),mk({wght:1},'Black'));}
  if(has('wdth')){masters.push(mk({wdth:-1},'Narrow'),mk({wdth:1},'Wide'));
    if(has('wght'))for(const w of [-1,0.6,1])for(const d of [-1,1])masters.push(mk({wght:w,wdth:d},(w<0?'Light':w<1?'Bold':'Black')+(d<0?'Narrow':'Wide')));}
  if(has('opsz'))masters.push(mk({opsz:-1},'Opsz8'),mk({opsz:1},'Opsz72'));
  if(has('slnt'))masters.push(mk({slnt:-1},'Slant'));
  /* униширинные: эталон advance — мастер с теми же wdth/opsz при весе по умолчанию и без наклона */
  masters.forEach((m,k)=>{
    const rc=m.coord.map((c,i)=>(axes[i].tag==='wght'||axes[i].tag==='slnt')?0:c);
    m.uwRef=masters.findIndex(o=>o.coord.every((c,i)=>c===rc[i]));
    if(m.uwRef===k)m.uwRef=-1;});
  /* точки проверки самопересечений: оси по линиям и попарные «диагонали» */
  const lines={wght:[-0.75,-0.5,-0.25,0.15,0.3,0.45,0.7,0.8,0.9],wdth:[-0.75,-0.5,-0.25,0.25,0.5,0.75],opsz:[-0.75,-0.5,-0.25,0.25,0.5,0.75],slnt:[-0.75,-0.5,-0.25]};
  const cross={wght:[-0.5,0.3,0.8],wdth:[-0.5,0.5],opsz:[-0.5,0.5],slnt:[-0.5]};
  const tests=[];
  axes.forEach((a,i)=>lines[a.tag].forEach(v=>{const c=new Array(A).fill(0);c[i]=v;tests.push(c);}));
  for(let i=0;i<A;i++)for(let j=i+1;j<A;j++)for(const u of cross[axes[i].tag])for(const v of cross[axes[j].tag]){const c=new Array(A).fill(0);c[i]=u;c[j]=v;tests.push(c);}
  if(A>2){ /* все оси сразу: знаки сторон, где линейная сумма дельт может «перелететь» (тонкая горизонталь уходит в минус) */
    const vals=axes.map(a=>a.tag==='wght'?[-0.6,-0.95,0.8,0.97]:a.tag==='slnt'?[-0.8,-0.97]:[-0.7,-0.97,0.7,0.97]);
    const rec=(i,c)=>{if(i===A){tests.push(c.slice());return;}for(const v of vals[i]){c[i]=v;rec(i+1,c);}};rec(0,new Array(A).fill(0));
  }
  if(A>=3){ /* 16 детерминированных случайных точек: многоосевые «провалы», которых нет на осях и диагоналях */
    let sd=12345;const rnd=()=>(sd=(sd*1103515245+12345)&0x7fffffff)/0x7fffffff;
    for(let n=0;n<16;n++)tests.push(axes.map(a=>a.tag==='slnt'?-rnd():a.tag==='wght'?-1+rnd()*2:(rnd()*2-1)));
  }
  const locOf=coord=>{const loc={wght:400,wdth:100,opsz:14,slnt:0};axes.forEach((a,i)=>{loc[a.tag]=vfxReal(a,coord[i]);});return loc;};
  return {axes,masters,def:0,coords:masters.map(m=>m.coord),tests,locOf,dropped,ix};
}
/* пробный проход: ось робастна, если на выборке знаков мастера по краям оси совместимы (нет схлопнутых контуров/аварийных путей) */
function vfxProbeAxes(styleKey,state,sel){
  const chars=[...'HOonaegsдфжыюяРБКЯ0&@%§'].filter(ch=>GL[ch]);
  const bad=[];
  for(const tag of sel){
    if(tag==='wght')continue;
    const plan=vfxPlan(styleKey,state,['wght',tag]);
    if(!plan.axes.some(a=>a.tag===tag)){bad.push(tag);continue;}
    const ms=plan.masters.filter(m=>m.label==='Regular'||['Light','Bold','Black','Narrow','Wide','Opsz8','Opsz72','Slant'].includes(m.label));
    let fail=0;
    for(const ch of chars){
      try{
        const per=ms.map(m=>{const st=vfxStyleState(styleKey,state,m.loc);const fg=finalGlyph(ch,st,state.edits);return fg.cs.map(vfCont).filter(Boolean);});
        const r=vfMatchGlyph(per,ms.map(m=>m.coord),0);
        const tt=vfToTT(r.conts);const n0=tt.pts[0].length;
        if(r.collapsed||tt.pts.some(P=>P.length!==n0))fail++;
      }catch(e){fail++;}
    }
    if(fail>Math.max(1,chars.length*0.12))bad.push(tag);
  }
  return bad;
}
/* ---------- таблицы ---------- */
function vfxF2(v){return Math.round(v*16384);}
function vfBuildFvar(plan,nm){
  const f=new BW(),A=plan.axes.length,NI=nm.inst.length,isz=4+4*A+2;
  f.u16(1).u16(0).u16(16).u16(2).u16(A).u16(20).u16(NI).u16(isz);
  plan.axes.forEach(a=>f.tag(a.tag).i32(vfFix(a.min)).i32(vfFix(a.def)).i32(vfFix(a.max)).u16(0).u16(nm.axis[a.tag]));
  nm.inst.forEach(it=>{f.u16(it.id).u16(0);it.vals.forEach(v=>f.i32(vfFix(v)));f.u16(0xFFFF);});
  return f.b;
}
/* avar: wght/wdth/slnt — тождество в узлах (у slnt обязательна и пара 1:1, даже когда максимум оси равен умолчанию — FX80 B08); opsz — логарифмическая шкала кегля */
function vfBuildAvar(plan){
  const a=new BW();a.u16(1).u16(0).u16(0).u16(plan.axes.length);
  for(const ax of plan.axes){
    let pairs=[[-1,-1],[0,0],[1,1]];
    if(ax.tag==='opsz'){
      pairs=[8,9,10,11,12,14,16,18,24,36,48,72].map(v=>[vfxUser(ax,v),vfxOpszT(v)]);
    }else if(ax.tag==='wght')pairs=[[-1,-1],[0,0],[0.6,0.6],[1,1]]; /* 700 = мастер Bold */
    a.u16(pairs.length);pairs.forEach(([f,t])=>a.i16(vfxF2(f)).i16(vfxF2(t)));
  }
  return a.b;
}
const VFX_WRU={Light:'Светлое',Regular:'Нормальное',Bold:'Жирное',Black:'Сверхжирное'};
const VFX_WDRU={Narrow:'узкое',Normal:'',Wide:'широкое'};
/* имена: оси, экземпляры (английские и русские), значения STAT. Возвращает записи name и таблицу идентификаторов */
function vfxNames(plan,baseIds,italic){
  let id=Math.max(299,...baseIds);
  const recs=[],axis={},st={};
  const add=(en,ru)=>{id++;recs.push({id,s:en,ru});return id;};
  plan.axes.forEach(a=>{axis[a.tag]=add(a.name,a.ru);});
  const wA=plan.axes.find(a=>a.tag==='wght'),dA=plan.axes.find(a=>a.tag==='wdth');
  const wts=wA?[['Light',300],['Regular',400],['Bold',700],['Black',900]]:[['Regular',400]];
  const wds=dA?[['Narrow',dA.min],['Normal',100],['Wide',dA.max]]:[['Normal',100]];
  const inst=[];
  for(const [dn,dv] of wds)for(const [wn,wv] of wts){
    const en=(dn==='Normal'?'':dn+' ')+(wn==='Regular'&&dn!=='Normal'?'':wn);
    const ru=[(wn==='Regular'&&dn!=='Normal')?'':VFX_WRU[wn],VFX_WDRU[dn]].filter(Boolean).join(' ');
    const vals=plan.axes.map(a=>a.tag==='wght'?wv:a.tag==='wdth'?dv:a.def);
    inst.push({id:add((en||'Regular').trim(),ru||'Нормальное'),vals});
  }
  /* подписи значений STAT */
  const S=(k,en,ru)=>{st[k]=add(en,ru);};
  S('Light','Light','Светлое');S('Regular','Regular','Нормальное');S('Bold','Bold','Жирное');S('Black','Black','Сверхжирное');
  S('Narrow','Narrow','Узкое');S('Normal','Normal','Нормальное');S('Wide','Wide','Широкое');
  S('Caption','Caption','Мелкий');S('Text','Text','Текст');S('Display','Display','Крупный');
  S('Upright','Upright','Прямое');S('Slanted','Slanted','Наклонное');S('Italic','Italic','Курсив');
  axis.ital=add('Italic','Курсив');
  return {recs,axis,inst,st};
}
function vfxStat(plan,nm,italic){
  const ax=plan.axes.map(a=>a.tag).concat(['ital']),nAx=ax.length,axSize=8;
  const idx={};ax.forEach((t,i)=>idx[t]=i);
  const vals=[];
  const F=v=>vfFix(v);
  const v1=(a,fl,n,v)=>{const t=new BW();t.u16(1).u16(idx[a]).u16(fl).u16(nm.st[n]).i32(F(v));return t.b;};
  const v2=(a,fl,n,nom,lo,hi)=>{const t=new BW();t.u16(2).u16(idx[a]).u16(fl).u16(nm.st[n]).i32(F(nom)).i32(F(lo)).i32(F(hi));return t.b;};
  const v3=(a,fl,n,v,link)=>{const t=new BW();t.u16(3).u16(idx[a]).u16(fl).u16(nm.st[n]).i32(F(v)).i32(F(link));return t.b;};
  for(const a of plan.axes){
    if(a.tag==='wght')vals.push(v1('wght',0,'Light',300),v3('wght',2,'Regular',400,700),v1('wght',0,'Bold',700),v1('wght',0,'Black',900));
    else if(a.tag==='wdth')vals.push(v1('wdth',0,'Narrow',a.min),v1('wdth',2,'Normal',100),v1('wdth',0,'Wide',a.max));
    else if(a.tag==='opsz')vals.push(v2('opsz',0,'Caption',8,8,12),v2('opsz',2,'Text',14,12,24),v2('opsz',0,'Display',72,24,72));
    else if(a.tag==='slnt')vals.push(v1('slnt',2,'Upright',0),v1('slnt',0,'Slanted',a.min));
  }
  vals.push(italic?v1('ital',0,'Italic',1):v3('ital',2,'Upright',0,1));
  const s=new BW(),axOff=20,avOff=axOff+nAx*axSize;
  s.u16(1).u16(2).u16(axSize).u16(nAx).u32(axOff).u16(vals.length).u32(avOff).u16(nm.st.Regular);
  ax.forEach(t=>s.tag(t).u16(nm.axis[t]).u16(idx[t]));
  let o=vals.length*2;const offs=vals.map(v=>{const x=o;o+=v.length;return x;});
  offs.forEach(v=>s.u16(v));vals.forEach(v=>s.bytes(v));
  return s.b;
}
/* ---------- униширинность ---------- */
/* вписать глиф (fg: контуры и advance движка) в заданный advance A. Возвращает {cs,adv,tight} (tight — доля сжатия, 0 если не сжимался) */
function uwFit(fg,A,p){
  let x0=1e9,x1=-1e9;
  for(const c of fg.cs)for(const q of flatC(c,8)){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];}
  if(!(x1>x0))return {cs:fg.cs,adv:A,tight:0};
  const ink=x1-x0,lsb=x0,rsb=fg.adv-x1,tot=lsb+rsb,slanted=!!(p&&p.slant>0.01);
  if(Math.abs(fg.adv-A)<0.5&&lsb>=0&&rsb>=0)return {cs:fg.cs,adv:A,tight:0};
  /* знаки с выносом по замыслу (j, f: хвост левее начала знака) — тело не трогаем, меняется только advance */
  if(lsb<-0.2*ink||(!slanted&&(lsb<0||rsb<0)))return {cs:fg.cs,adv:A,tight:0};
  /* ширина тела — по самой широкой строке контура (у курсива она меньше габарита из-за наклона) */
  const pr=inkProfile(fg.cs,-300,950,63);let rowW=0;
  for(let i=0;i<pr.L.length;i++)if(pr.L[i]!=null&&pr.R[i]!=null)rowW=Math.max(rowW,pr.R[i]-pr.L[i]);
  rowW=Math.max(rowW,slanted?ink*0.5:ink);
  const sb=(p&&p.sb>0)?p.sb:0,floor=0.25*sb; /* поля вдоль самой широкой строки: не меньше 0.25·sb (суммарно) */
  let cs=fg.cs,tight=0,w=ink;
  if(A-rowW<floor){const s=Math.max(0.6,(A-floor)/rowW);tight=1-s;w=ink*s;
    cs=cs.map(c=>mapNodes(c,(x,y)=>[x0+(x-x0)*s,y]));}
  const free=A-w;
  const L=(slanted&&(lsb<0||rsb<0))||tot<1e-6?free/2:free*Math.min(0.8,Math.max(0.2,lsb/tot));
  const dx=L-x0;
  cs=cs.map(c=>mapNodes(c,(x,y)=>[x+dx,y]));
  return {cs,adv:A,tight};
}
/* статика: подгонка всех знаков собранного шрифта (glyphs из buildTTF) под advance эталона. ref: имя глифа -> advance.
   Знак, не помещающийся в advance, сначала пересобирается движком с меньшей шириной (ed.wm: ствол остаётся, сжимаются просветы — оптическая подгонка),
   и только остаток добирается сжатием по горизонтали. */
function uwApply(glyphs,ref,st,state){
  const rep=[];
  for(const g of glyphs){
    const A=ref[g.name];if(A==null)continue;if(!g.cs||!g.cs.length){g.adv=A;continue;}
    let r=uwFit({cs:g.cs,adv:g.adv},A,st.p);
    if(r.tight>0.02&&state&&g.ch&&!g.alt&&GL[g.ch]){
      const ed0=edGet(state.edits,g.ch)||{};let wm=ed0.wm||100,tight=r.tight;
      for(let it=0;it<3&&tight>0.01;it++){
        wm=Math.max((ed0.wm||100)*0.8,wm*(1-tight*0.9));
        let fg;try{fg=finalGlyph(g.ch,st,Object.assign({},state.edits,{[edKey(g.ch)]:Object.assign({},ed0,{wm})}));}catch(e){break;}
        const r2=uwFit({cs:fg.cs,adv:fg.adv},A,st.p);
        if(r2.tight<r.tight){r=r2;tight=r2.tight;}else break;
      }
    }
    g.cs=r.cs;g.adv=A;if(r.tight>0.0005)rep.push(g.name+':'+(r.tight*100).toFixed(1)+'%');
  }
  if(st.kern)uwCollide(glyphs,st);
  return rep;
}
/* столкновения соседних знаков при фиксированном advance: для всех пар букв (лат. + кирилл.) зазор по строкам; где он меньше нормы —
   ручная пара (положительный кернинг) в копии st.kern. Кернинг классов считается позже уже по подогнанным знакам и эту пару не перекрывает */
function uwCollide(glyphs,st){
  const sb=st.p.sb>0?st.p.sb:0,minGap=Math.max(6,0.2*sb);
  const L=[];
  for(const g of glyphs){if(g.uni==null||g.alt||!g.cs||!g.cs.length)continue;const ch=String.fromCodePoint(g.uni);if(!isLetter(ch))continue;
    const pr=inkProfile(g.cs,-200,900,55);L.push({ch,adv:g.adv,L:pr.L,R:pr.R});}
  for(const a of L)for(const b of L){
    if(typeof kernBlocked==='function'&&kernBlocked(a.ch,b.ch))continue;
    let gap=1e9;
    for(let i=0;i<55;i++){if(a.R[i]==null||b.L[i]==null)continue;const d=a.adv+b.L[i]-a.R[i];if(d<gap)gap=d;}
    if(gap<minGap&&gap<1e8)st.kern[a.ch+b.ch]=Math.round(Math.min(80,minGap-gap)+(st.kern[a.ch+b.ch]>0?st.kern[a.ch+b.ch]:0));
  }
}

/* advance эталона по именам глифов (порядок и имена — как в buildTTF) */
function uwRefAdv(glyphs){const o={};for(const g of glyphs)o[g.name]=g.adv;return o;}
/* параметры веса для униширинного семейства: ширина и поля — как у Regular, остальное по famParams */
function uwFamParams(p,wn){
  const q=famParams(p,wn),r=famParams(p,'Regular');
  if(wn==='Regular')return q;
  q.wdth=r.wdth;q.sb=r.sb;q.track=r.track;q.space=r.space;
  return q;
}
/* семейство (статика): [{wn,k,r}] в порядке весов × (прямой, курсив). uw — униширинные: advance знаков = Regular прямой, кернинг пересчитывается по подогнанным знакам */
function famBuildAll(state,uw,weights,extra){
  weights=weights||FAM_W.map(w=>[w[0],w[1]]);
  const P=uw?uwFamParams:famParams,res={};let ref=null;
  const order=weights.slice().sort((a,b)=>(a[0]==='Regular'?0:1)-(b[0]==='Regular'?0:1));
  for(const [wn,wc] of order){
    const st={family:state.family,edits:state.edits,styles:{}};
    for(const k of ['regular','italic']){const s0=state.styles[k];st.styles[k]={p:P(s0.p,wn),lat:s0.lat,hg:s0.hg,kern:uw?Object.assign({},s0.kern):s0.kern,ku:s0.ku,kc:s0.kc};}
    for(const k of ['regular','italic']){
      const o=Object.assign({weight:wc,weightName:wn},extra||null),first=uw&&wn==='Regular'&&k==='regular';
      if(first)o.uwCollect=true;else if(uw)o.uw=ref;
      const r=buildTTF(k,st,o);if(first)ref=r.uwRef;
      res[wn+k]=r;
    }
  }
  const out=[];weights.forEach(([wn])=>['regular','italic'].forEach(k=>out.push({wn,k,r:res[wn+k]})));
  return out;
}
