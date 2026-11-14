/* ===== OpenType: альтернативные глифы, GSUB (case, ss01, tnum/pnum), GPOS (kern классами) ===== */
/* --- 1. Неэкодированные альтернаты: записи GL с ключами-именами, в CHARSET не попадают --- */
const OT_DIG=['zero','one','two','three','four','five','six','seven','eight','nine'];
const OT_CASE={'(':'parenleft',')':'parenright','[':'bracketleft',']':'bracketright','{':'braceleft','}':'braceright',
  '-':'hyphen','–':'endash','—':'emdash','«':'guillemotleft','»':'guillemotright','‹':'guilsinglleft','›':'guilsinglright','·':'periodcentered','@':'at'};
function otBBoxY(cs){let y0=1e9,y1=-1e9;for(const c of cs){if(c.op==='sub'||c.hole)continue;for(const q of flatC(c,8)){if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1];}}return y1>y0?[y0,y1]:null;}
/* классическая m (две арки) на компонентах гротеска: ствол + две арки как у n, просветы оптически сжаты */
GR.mArch=g=>{const k=gk(g),{w,h,S,H,ov}=k,c=(w-3*S)/2,w1=2*S+c,x2=w1-S;
  /* выемка в месте, где вторая арка выходит из среднего ствола */
  const nx=x2+S*0.5,nw=Math.max(S*0.22,H*0.3),nd=Math.max(H*0.5,16),notch=()=>k.cutP([[nx-nw*1.6,h+ov+60],[nx-nw*1.6,h+ov+1],[nx,h+ov-nd],[nx+nw*1.6,h+ov+1],[nx+nw*1.6,h+ov+60]])[0];
  const a1=GRP(1,[...k.ring(0,0,w1,h+ov,[0,0,1,0],null,null,[0,0,1,1]),k.cut(S,-80,w1-S,H+1)[0],notch()]);
  const a2=GRP(2,[...k.ring(x2,0,w,h+ov,[0,0,1,0],null,null,[0,0,1,1]),k.cut(x2+S,-80,w-S,H+1)[0],notch()]);
  return [k.st(0,0,S,h),...a1,...a2,...k.trapAt(S,h-H-2,0.6,-0.8),...k.trapAt(x2+S,h-H-2,0.6,-0.8)];};
function otAddAlternates(G,grot){
  const add=(name,base,extra,o)=>{const B=G[base];if(!B)return;G[name]=Object.assign({},B,extra||{},{opt:Object.assign({},B.opt||{},{alt:true,base},o||{})});};
  /* case: знаки поднимаются к центру прописных */
  for(const ch in OT_CASE){const B=G[ch];if(!B)continue;
    add(OT_CASE[ch]+'.case',ch,{shape:g=>{const cs=B.shape(g)||[],bb=otBBoxY(cs);if(!bb)return cs;let dy=g.p.capH/2-(bb[0]+bb[1])/2;const lim=g.p.capH+(g.p.ov||0);if(bb[1]<=lim+1)dy=Math.min(dy,lim-bb[1]);return xf(cs,(x,y)=>[x,y+dy]);}},{feat:'case'});}
  /* tnum / pnum: цифры одной ширины и пропорциональные */
  OT_DIG.forEach((n,i)=>{add(n+'.tnum',String(i),null,{feat:'tnum',tnum:true});add(n+'.pnum',String(i),null,{feat:'pnum',pnum:true});});
  /* ss01: арочная m */
  if(grot){const n=G['n'];G['m.ss01']={shape:GR.mArch,k:'xh',w:p=>{const S=sE(p),wn=(typeof n.w==='function'?n.w(p):n.w*p.wdth/100);return 3*S+2*Math.max(wn-2*S,S*0.5)*0.88;},opt:{alt:true,base:'m',feat:'ss01'}};}
  else if(G['n']){const n=G['n'];const wn=p=>(typeof n.w==='function'?n.w(p):n.w*p.wdth/100);
    G['m.ss01']={shape:g=>{const S=sE(g.p),w1=(g.w+S)/2,g1=Object.assign({},g,{w:w1});const a=n.shape(g1)||[];
      return [...GRP(1,a),...GRP(2,xf(n.shape(g1)||[],(x,y)=>[x+g.w-w1,y]))];},k:'xh',w:p=>{const S=sE(p);return 2*wn(p)*0.94-S;},opt:{alt:true,base:'m',feat:'ss01'}};}
}
(function(){otAddAlternates(FONTS.volt.GL,true);if(FONTS.codex)otAddAlternates(FONTS.codex.GL,false);})();
/* альтернаты текущего шрифта: имя -> {base, feat} */
function otAlternates(){const o=[];for(const k in GL){const d=GL[k];if(d&&d.opt&&d.opt.alt)o.push({name:k,base:d.opt.base,feat:d.opt.feat,lang:d.opt.lang,style:d.opt.style,ot:d.opt.ot,own:d.opt.own,grp:d.opt.grp,kernAs:d.opt.kernAs,lig:d.opt.lig});/* lang/style — для locl (core19); ot/own/grp — core_ot_o1 */}return o;}
/* входит ли альтернат в экспорт (статика и вариативный шрифт строят один и тот же порядок знаков) */
function otAltOk(a,have,tabOn,italic){
  if(!have.has(a.base))return false;if(a.grp==='liga'&&typeof OTO!=='undefined'&&OTO.LIG_FONTS.indexOf(CUR_FONT)<0)return false;/* Вольт и Квадра делят GL: лигатуры только у Квадры */
  if(a.feat==='tnum'&&tabOn)return false;if(a.feat==='pnum'&&!tabOn)return false;
  if(a.style&&a.style!=='both'&&a.style!==(italic?'italic':'roman'))return false;/* locl: курсивные формы только в курсиве */
  return true;}

/* --- 2. Кернинг классами --- */
/* классы по правой стороне левого знака (L) и по левой стороне правого знака (R) */
const KC_L={
  T:'TŤТГЃҐҒ',Y:'YÝŸУЎ',V:'VW',A:'AÀÁÂÃÄÅĀĂĄА',O:'OÒÓÔÕÖŌŐØОQDĎЮ©',P:'PРÞ₽',F:'F',L:'LĹĽŁ',K:'KКЌҚЖXХ',
  Soft:'ЬЪБЉЊ',R:'RŘ',
  t:'rřгґѓтғ',v:'vwyýÿуўү',o:'oòóôõöōőøоbpрþюэбф',k:'kкќқжxх',e:'eèéêëēėěęеёcçćčсє',f:'f',
  per:'.,…„‚',hy:'-–—',gl:'«‹',qo:'“‘„‚',
  d7:'7',dg:'02345689'};
const KC_R={
  A:KC_L.A,O:'OÒÓÔÕÖŌŐØОQCÇĆČСGĞЄ©',T:'TŤТ',Y:'YÝŸ',U:'УЎ',V:'VW',J:'J',L:'ЛДЉ',
  o:'oòóôõöōőøоcçćčсeèéêëēėěęеёєaàáâãäåāăąаdďqgğ',v:'vwyýÿуўү',l:'лдљ',
  per:'.,…„‚',hy:'-–—',qc:'”’"\'',gr:'»›',
  e7:'7',e4:'4',e1:'1',eo:'0235689'};
/* встроенная базовая таблица (Вольт и Квадра): какие пары классов кернятся и с какой силой.
   Значения не хранятся числом — они измеряются при экспорте по профилям итоговых контуров
   (площадь белого между знаками против эталона HH / nn), поэтому таблица сама масштабируется
   при смене ширины, веса, полей и наклона. Ручные пары state.kern перекрывают классы. */
const KERN_TABLE_BASE=[
  ['T','A'],['T','O'],['T','J'],['T','L'],['T','o'],['T','v'],['T','l'],['T','per',0.75],['T','hy',0.75],['T','gr',0.75],['T','qc',0.75],
  ['Y','A'],['Y','O'],['Y','J'],['Y','L'],['Y','o'],['Y','v'],['Y','l'],['Y','per',0.75],['Y','hy',0.75],['Y','gr',0.75],
  ['V','A'],['V','O'],['V','J'],['V','L'],['V','o'],['V','l'],['V','per',0.75],['V','hy',0.75],['V','gr',0.75],
  ['A','T'],['A','Y'],['A','U'],['A','V'],['A','O',0.4],['A','v'],['A','qc',0.75],['A','hy',0.5],['A','gr',0.6],
  ['O','A',0.5],['O','T',0.5],['O','Y',0.5],['O','U',0.5],['O','V',0.5],['O','L',0.5],['O','per',0.5],
  ['P','A'],['P','J'],['P','L'],['P','o',0.5],['P','per',0.75],
  ['F','A'],['F','J'],['F','o',0.5],['F','per',0.75],
  ['L','T'],['L','Y'],['L','U'],['L','V'],['L','O',0.4],['L','v'],['L','qc',0.75],['L','hy',0.6],['L','gr',0.6],
  ['K','O',0.5],['K','o',0.5],['K','v',0.5],['K','hy',0.6],
  ['Soft','T'],['Soft','Y'],['Soft','U'],['Soft','V'],['Soft','qc',0.75],
  ['R','T',0.5],['R','Y',0.5],['R','U',0.5],['R','V',0.5],
  ['t','per',0.75],['t','o',0.5],['t','l'],['t','hy',0.6],['t','gr',0.6],
  ['v','per',0.75],['v','o',0.5],['v','l'],['v','hy',0.6],
  ['o','v',0.5],['o','l',0.5],
  ['k','o',0.5],['k','hy',0.6],
  ['e','v',0.4],['e','l',0.4],
  ['f','per',0.6],['f','o',0.5],['f','qc',0.75],
  ['per','qc',0.75],['per','gr',0.75],
  ['hy','T',0.75],['hy','Y',0.75],['hy','U',0.75],['hy','V',0.75],['hy','A',0.6],['hy','J',0.6],
  ['gl','T',0.75],['gl','Y',0.75],['gl','U',0.75],['gl','V',0.75],['gl','A',0.6],['gl','J',0.6],
  ['qo','A',0.75],['qo','J',0.75],['qo','L',0.75],
  /* цифры (только пропорциональные): 7 и 4 открыты, у 1 флажок слева */
  ['d7','e4',0.75],['d7','e1',0.6],['d7','eo',0.5],['dg','e7',0.5],['dg','e4',0.5],['dg','e1',0.5]];
const KC_DSC='gğģpqyýÿþуўүфдцщрjјʒҗқҳQДЦЩ,;„()[]{}';
const KERN_TABLE={volt:KERN_TABLE_BASE,kvadra:KERN_TABLE_BASE,codex:KERN_TABLE_BASE};
/* профиль знака: края краски по строкам (шаг 10), в координатах строки (с полями) */
/* предел кернинга: 15% кегля (UPM 1000); растяжка — не больше 6% */
const KERN_MAX=150,KERN_POS=60,KERN_GAP=60;
/* RS10: per-font minimum gap cap (FONTS[id].kernGap, Stroka) and extra kerning classes (FONTS[id].kcL / kcR) */
const kdm=()=>{const F=typeof FONTS!=='undefined'&&typeof CUR_FONT==='string'&&FONTS[CUR_FONT];return (F&&F.kernD)||0.9;};
const kfm=()=>{const F=typeof FONTS!=='undefined'&&typeof CUR_FONT==='string'&&FONTS[CUR_FONT];return (F&&F.kernF)||1;};
/* FIX-ENGINE: per-font kerning limits — FONTS[id].kernMax (default KERN_MAX 150), FONTS[id].kernTwin (unicase: lowercase twins join the capital classes) */
const kmx=()=>{const F=typeof FONTS!=='undefined'&&typeof CUR_FONT==='string'&&FONTS[CUR_FONT];return (F&&F.kernMax)||KERN_MAX;};
let KMREF={U:0,L:0};
const kgc=()=>{const F=typeof FONTS!=='undefined'&&typeof CUR_FONT==='string'&&FONTS[CUR_FONT];return (F&&F.kernGap)||KERN_GAP;};
/* шаг профиля 5 ед.: тонкие рёбра (кромка L и низ »), попавшие между строк при шаге 10, иначе не видны защите от столкновений */
const KP_Y0=-320,KP_Y1=1040,KP_N=272;
function kernProfile(cs,adv){const pr=inkProfile(cs,KP_Y0,KP_Y1,KP_N);let r0=-1,r1=-1;
  for(let j=0;j<KP_N;j++)if(pr.L[j]!=null){if(r0<0)r0=j;r1=j;}
  return {L:pr.L,R:pr.R,r0,r1,adv,xmin:pr.xmin,xmax:pr.xmax};}
/* белое между знаками: средний (с ограничением глубины D) и минимальный зазор в общей полосе высот */
function kernGap(a,b,D,y0,y1){if(a.r0<0||b.r0<0)return null;
  let lo=Math.max(a.r0,b.r0),hi=Math.min(a.r1,b.r1);
  /* y0..y1 — только строки в этой полосе высот (кернинг по телу знака без «рогов») */
  if(y0!=null){const st=(KP_Y1-KP_Y0)/KP_N;lo=Math.max(lo,Math.ceil((y0-KP_Y0)/st));hi=Math.min(hi,Math.floor((y1-KP_Y0)/st));}
  if(hi<lo){const g=(a.adv-a.xmax)+b.xmin;return {avg:Math.min(g,D),min:g};}
  let s=0,n=0,mn=1e9;
  for(let j=lo;j<=hi;j++){const ra=a.R[j],lb=b.L[j];
    if(ra==null||lb==null){s+=D;n++;continue;}const g=(a.adv-ra)+lb;s+=Math.min(g,D);n++;if(g<mn)mn=g;}
  if(mn>1e8)mn=D;return {avg:s/n,min:mn};}
/* значение пары: выравнивание площади белого к эталону + защита от столкновения */
function kernMeasure(a,b,t,f,p){const D=t+Math.max(p.stem,p.hair)*kdm(),G0=Math.max(Math.min(t*0.4,kgc()),12);
  const g=kernGap(a,b,D);if(!g)return null;
  /* font.kernBody=[y0,y1,gap] (доли высоты прописных): среднее считается по телу знака, защита от столкновения — по полному профилю */
  const kb=typeof FONTS!=='undefined'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].kernBody,gb=kb?(kernGap(a,b,D,kb[0]*p.capH,kb[1]*p.capH)||g):g;
  f=f*kfm();let k=f*(t-gb.avg);k=Math.max(k,kb?-400:-kmx());k=Math.min(k,t*0.6,KERN_POS);k=Math.max(k,G0-g.min);
  /* FIX-ENGINE: FONTS[id].kernMin={f,cap,fl,sp} (cap — предел сжатия для пар прописных) — пары «прописная–прописная» (обе стороны высотой ≥ 0.85 капы): ближайший зазор = f × зазор H–H (диагонали AV TA УА, круглые ТО, лапы ДА);
     для всех пар потолок: ближайший зазор не шире sp × межсловный пробел (0.8). Без хука поведение прежнее. */
  const KM=typeof FONTS!=='undefined'&&FONTS[CUR_FONT]&&FONTS[CUR_FONT].kernMin;
  if(KM&&a.r0>=0&&b.r0>=0&&(!kb||KM.body)){const sts=(KP_Y1-KP_Y0)/KP_N,cH=p.capH||700;
    if((a.r1-a.r0)*sts>=0.85*cH&&(b.r1-b.r0)*sts>=0.85*cH&&KMREF.U>0){k=Math.max(-(KM.cap||kmx()),Math.min(KERN_POS,Math.round((KM.f||1)*KMREF.U-g.min)));}
    const fl=(KM.fl||0.85)*(KMREF.U||0);if(fl>0&&g.min+k<fl)k=Math.min(KERN_POS,Math.round(fl-g.min));
    const gmax=(KM.sp||0.8)*spaceAdv(' ',p);if(g.min+k>gmax)k=Math.max(-kmx(),Math.round(gmax-g.min));}
  return {k,min:g.min,G0};}
/* таблица классов для начертания: {L:[[name,[gid..]]], R:[...], M:[[v..]..], vals:{'T|A':v}} */
function classKernTable(st,prof,isLow,fontId){
  let tbl=KERN_TABLE[fontId||CUR_FONT];if(!tbl){if(st.kc&&Object.keys(st.kc).length)tbl=[];else return null;}
  const P=st.p,tabNo=!!(P.tabular||P.mono>0),FT=FONTS[fontId||CUR_FONT]||{};
  /* unicase (Рывок, Модуль): строчные близнецы входят в те же классы, что прописные — аб = АБ */
  const twinOf=c=>{const l=c.toLowerCase(),u=c.toUpperCase(),t=l!==c?l:u;return t!==c&&Array.from(t).length===1?t:null;};
  const mem=(s)=>{let a=Array.from(s);if(FT.kernTwin){const x=a.slice();for(const c of x){const t=twinOf(c);if(t&&!a.includes(t)&&GL[t])a.push(t);}}return a.filter(ch=>prof(ch)&&!(tabNo&&isDigit(ch)));};
  const href=prof('H'),nref=prof('n')||prof('н');
  let tU=href?(kernGap(href,href,1e4)||{avg:2*P.sb}).avg:2*P.sb,tL=nref?(kernGap(nref,nref,1e4)||{avg:2*P.sb}).avg:tU;
  const kbd=FONTS[fontId||CUR_FONT]&&FONTS[fontId||CUR_FONT].kernBody;if(kbd){tU=tL=kbd[2]*P.capH;}
  KMREF={U:href?(kernGap(href,href,1e4)||{min:0}).min:0,L:nref?(kernGap(nref,nref,1e4)||{min:0}).min:0};
  const out={L:[],R:[],vals:{},tU,tL,pairs:{}};const li={},ri={};
  const FF=FONTS[fontId||CUR_FONT]||{},KL=FF.kcL?Object.assign({},KC_L,FF.kcL):KC_L,KR=FF.kcR?Object.assign({},KC_R,FF.kcR):KC_R;
  for(const [l,r,f0] of tbl){const A=mem(KL[l]||''),B=mem(KR[r]||'');if(!A.length||!B.length)continue;
    const f=f0==null?0.6:f0,ks=[],pk=[];
    for(const a of A)for(const b of B){if(kernBlocked(a,b))continue;/* integration: Propis lock honoured at the source */const t=(isLow(a)||isLow(b))?tL:tU;const m=kernMeasure(prof(a),prof(b),t,f,P);if(!m)continue;ks.push(m.k);pk.push([a+b,m.k]);}
    if(!ks.length)continue;ks.sort((x,y)=>x-y);
    let v=ks[Math.floor(ks.length/2)];v=Math.round(v/2)*2;
    /* пары, которым значение класса мешает (зазор уже в защитных пределах: kernMeasure даёт для них k выше) — исключения формата 1:
       так один «острый» знак класса не отменяет кернинг остальным */
    for(const [key,k] of pk){const kp=Math.round(k/2)*2;if(((kbd||FF.kernMin)?Math.abs(kp-v):kp-v)>=6)out.pairs[key]=kp;}
    if(Math.abs(v)>=6)for(const a of A)for(const b of B)if(kernBlocked(a,b))out.pairs[a+b]=0;/* the class value must not reach locked pairs */
    if(Math.abs(v)<6)continue;
    if(li[l]==null){li[l]=out.L.length;out.L.push([l,A]);}if(ri[r]==null){ri[r]=out.R.length;out.R.push([r,B]);}
    out.vals[l+'|'+r]=v;}
  /* j с хвостом под предыдущую букву: с выносными слева (g p q y у ф д ц щ …) хвост не должен на них наезжать —
     отдельные пары, только защита от столкновения (зазор не меньше G0 в общих строках) */
  const JR=mem('jј');
  if(JR.length&&JR.some(c=>GL[c]&&GL[c].opt&&(GL[c].opt.negL||GL[c].opt.tailL))){const G0=Math.max(Math.min(tL*0.4,kgc()),12);
    for(const a of mem(KC_DSC))for(const b of JR){const g=kernGap(prof(a),prof(b),1e4);if(!g)continue;const v=Math.round((G0-g.min)/2)*2;if(v>=6)out.pairs[a+b]=v;}}
  /* [кернинг-редактор] пользовательские значения классов st.kc {'L|R':v}: перекрывают авто-значение, автоисключения этих пар снимаются;
     защита от столкновения остаётся — пары, где значение класса приводит к зазору меньше G0, получают исключение с безопасным значением */
  if(st.kc)for(const key in st.kc){const [l,r]=key.split('|');const A=mem(KL[l]||''),B=mem(KR[r]||'');if(!A.length||!B.length)continue;
    if(kernBlocked&&A.every(a=>B.every(b=>kernBlocked(a,b))))continue;
    const v=Math.max(-kmx(),Math.min(kmx(),Math.round(+st.kc[key])||0));
    if(li[l]==null){li[l]=out.L.length;out.L.push([l,A]);}if(ri[r]==null){ri[r]=out.R.length;out.R.push([r,B]);}
    out.vals[l+'|'+r]=v;
    for(const a of A)for(const b of B){delete out.pairs[a+b];if(kernBlocked(a,b))continue;
      const t=(isLow(a)||isLow(b))?tL:tU,G0=Math.max(Math.min(t*0.4,kgc()),12),g=kernGap(prof(a),prof(b),1e4);if(!g)continue;
      const lim=Math.ceil((G0-g.min)/2)*2;if(v<lim)out.pairs[a+b]=Math.min(lim,kmx());}}
  return out;}
/* Пропись: все буквы соединяются — между буквами кернить нельзя */
function kernBlocked(a,b){return (typeof CUR_FONT==='string'&&CUR_FONT==='propis')&&isLetter(a)&&isLetter(b);}

/* --- 3. Запись таблиц GSUB / GPOS --- */
function otCoverage(gids){const w=new BW();const s=[...new Set(gids)].sort((a,b)=>a-b);w.u16(1).u16(s.length);s.forEach(g=>w.u16(g));return w.b;}
function otClassDef(map){/* map: gid->class (>0) */const e=Object.keys(map).map(Number).sort((a,b)=>a-b),rg=[];
  for(const g of e){const c=map[g],l=rg[rg.length-1];if(l&&l[1]===g-1&&l[2]===c)l[1]=g;else rg.push([g,g,c]);}
  const w=new BW();w.u16(2).u16(rg.length);rg.forEach(r=>w.u16(r[0]).u16(r[1]).u16(r[2]));return w.b;}
/* SingleSubst формат 2 */
function otSingleSubst(pairs){pairs=pairs.slice().sort((a,b)=>a[0]-b[0]);const cov=otCoverage(pairs.map(p=>p[0]));
  const w=new BW();const hl=6+pairs.length*2;w.u16(2).u16(hl).u16(pairs.length);pairs.forEach(p=>w.u16(p[1]));w.bytes(cov);return w.b;}
/* ChainContextSubst формат 3: back/input — покрытия (ближайший предыдущий знак первым), подстановка lookup li во входной знак */
function otChain3(back,input,li){const covs=[...back,...input];const head=2+2+2*back.length+2+2*input.length+2+2+4;
  let off=head;const offs=covs.map(c=>{const o=off;off+=c.length;return o;});const w=new BW();
  w.u16(3).u16(back.length);for(let i=0;i<back.length;i++)w.u16(offs[i]);w.u16(input.length);for(let i=0;i<input.length;i++)w.u16(offs[back.length+i]);
  w.u16(0).u16(1).u16(0).u16(li);covs.forEach(c=>w.bytes(c));return w.b;}
/* PairPos формат 1 (отдельные пары, XAdvance первого знака) */
function otPairPos1(list){const by={};for(const [l,r,v] of list){(by[l]||(by[l]={}))[r]=v;}
  const firsts=Object.keys(by).map(Number).sort((a,b)=>a-b);
  const sets=firsts.map(f=>{const s=Object.keys(by[f]).map(Number).sort((a,b)=>a-b);const w=new BW();w.u16(s.length);s.forEach(g=>w.u16(g).i16(by[f][g]));return w.b;});
  const head=10+2*firsts.length;let off=head;const offs=sets.map(s=>{const o=off;off+=s.length;return o;});
  const cov=otCoverage(firsts);const w=new BW();w.u16(1).u16(off).u16(4).u16(0).u16(firsts.length);offs.forEach(o=>w.u16(o));sets.forEach(s=>w.bytes(s));w.bytes(cov);return w.b;}
/* PairPos формат 2 (классы) */
function otPairPos2(c1,c2,M){/* c1,c2: gid->class; M[i][j] */const n1=M.length,n2=M[0].length;
  const cov=otCoverage(Object.keys(c1).map(Number));const cd1=otClassDef(c1),cd2=otClassDef(c2);
  const head=16+n1*n2*2;const w=new BW();w.u16(2).u16(head).u16(4).u16(0).u16(head+cov.length).u16(head+cov.length+cd1.length).u16(n1).u16(n2);
  for(let i=0;i<n1;i++)for(let j=0;j<n2;j++)w.i16(M[i][j]);w.bytes(cov).bytes(cd1).bytes(cd2);return w.b;}
/* общий заголовок GSUB/GPOS: скрипты DFLT, cyrl, latn; extType — тип расширения (7 GSUB, 9 GPOS) */
function otLayoutTable(features,lookups,extType){
  const scripts=['DFLT','cyrl','latn'];features=features.slice().sort((a,b)=>a.tag<b.tag?-1:a.tag>b.tag?1:0);
  /* ScriptList */
  const ls=new BW();ls.u16(0).u16(0xFFFF).u16(features.length);features.forEach((f,i)=>ls.u16(i));
  const sl=new BW();sl.u16(scripts.length);const sHead=2+6*scripts.length,sSize=4+ls.len;
  scripts.forEach((t,i)=>sl.tag(t).u16(sHead+i*sSize));scripts.forEach(()=>{sl.u16(4).u16(0).bytes(ls.b);});
  /* FeatureList */
  const fl=new BW();fl.u16(features.length);const fts=features.map(f=>{const w=new BW();const base=4+2*f.lookups.length;
    w.u16(f.nameID?base:0).u16(f.lookups.length);f.lookups.forEach(x=>w.u16(x));if(f.nameID)w.u16(0).u16(f.nameID);return w.b;});
  let fo=2+6*features.length;features.forEach((f,i)=>{fl.tag(f.tag).u16(fo);fo+=fts[i].length;});fts.forEach(b=>fl.bytes(b));
  /* LookupList: каждый lookup — расширение, сами подтаблицы в конце (32-битные смещения) */
  const ll=new BW();ll.u16(lookups.length);const lts=lookups.map(L=>{const w=new BW();w.u16(extType).u16(L.flag||0).u16(L.subs.length);
    L.subs.forEach((s,i)=>w.u16(6+2*L.subs.length+8*i));L.subs.forEach(()=>w.u16(1).u16(L.type).u32(0));return w;});
  let lo=2+2*lookups.length;lts.forEach(w=>{ll.u16(lo);lo+=w.len;});
  const posSL=10,posFL=posSL+sl.len,posLL=posFL+fl.len;
  const out=new BW();out.u32(0x00010000).u16(posSL).u16(posFL).u16(posLL);out.bytes(sl.b).bytes(fl.b);
  const llStart=out.len;out.bytes(ll.b);const fix=[];
  lookups.forEach((L,i)=>{const lstart=out.len;out.bytes(lts[i].b);L.subs.forEach((s,k)=>fix.push([lstart+6+2*L.subs.length+8*k,s]));});
  for(const [extPos,s] of fix){while(out.len%2)out.u8(0);const off=out.len-extPos;const b=out.b;b[extPos+4]=(off>>>24)&255;b[extPos+5]=(off>>>16)&255;b[extPos+6]=(off>>>8)&255;b[extPos+7]=off&255;out.bytes(s);}
  return out.b;}
/* сборка GSUB/GPOS для buildTTF: glyphs — [{name,uni,cs,adv,ch}] */
function buildOTL(glyphs,st,kmap,fontId){
  const gidByName={},gidByCh={};glyphs.forEach((g,i)=>{gidByName[g.name]=i;if(g.ch!=null&&g.uni!=null)gidByCh[g.ch]=i;});
  const res={};
  /* GSUB */
  const feats=[],looks=[];const featOf={};
  for(const g of glyphs){if(!g.alt)continue;const b=gidByCh[g.alt.base];if(b==null)continue;(featOf[g.alt.feat]||(featOf[g.alt.feat]=[])).push([b,gidByName[g.name]]);}
  const tab=!!st.p.tabular;
  const oto=typeof OTO!=='undefined'&&OTO.on(fontId);/* core_ot_o1: tnum/pnum собираются там (все четыре сочетания цифр) */
  for(const tag of (oto?['case','ss01']:['case','ss01',tab?'pnum':'tnum'])){const pr=featOf[tag];if(!pr||!pr.length)continue;
    looks.push({type:1,subs:[otSingleSubst(pr)]});feats.push({tag,lookups:[looks.length-1],nameID:tag==='ss01'?256:0});}
  /* calt (скелетная Пропись): после знака с верхним выходом — вариант с верхним входом (ChainContext формат 3) */
  if(featOf.calt&&featOf.calt.length){const F0=FONTS[fontId||CUR_FONT]||{},TE=F0.topExit||new Set();
    const back=[];glyphs.forEach((g,i)=>{const d=GL[g.ch];if((g.uni!=null&&TE.has(g.ch))||(d&&d.opt&&d.opt.topExit))back.push(i);});
    if(back.length){const li=looks.length;looks.push({type:1,subs:[otSingleSubst(featOf.calt)]});
      looks.push({type:6,subs:[otChain3([otCoverage(back)],[otCoverage(featOf.calt.map(x=>x[0]))],li)]});feats.push({tag:'calt',lookups:[looks.length-1]});}}
  /* [core19] locl: болгарские/сербские формы с языковыми системами */
  if(typeof loclFeatures==='function')loclFeatures(glyphs,gidByName,gidByCh,feats,looks);
  if(typeof otFeaturesO1==='function')otFeaturesO1(glyphs,gidByName,gidByCh,feats,looks,fontId,st);/* [core_ot_o1] */
  if(feats.length)res.GSUB=(typeof otLayoutTableL==='function'?otLayoutTableL:otLayoutTable)(feats,looks,7);
  res.nameIds=feats.filter(f=>f.nameID).map(f=>f.nameID);
  /* [/core19] */
  /* GPOS kern: ручные пары (формат 1) перед классами (формат 2) */
  const profs={};const byCh={};glyphs.forEach(g=>{if(g.ch!=null&&g.uni!=null)byCh[g.ch]=g;});
  const prof=ch=>{if(profs[ch]!==undefined)return profs[ch];const g=byCh[ch];return profs[ch]=g&&g.cs.length?kernProfile(g.cs,g.adv):null;};
  const isLow=ch=>{const d=GL[ch];return !!(d&&d.k==='xh'&&isLetter(ch));};
  const ct=classKernTable(st,prof,isLow,fontId);
  const ku=st.ku||{};
  /* locl-альтернаты (uniXXXX.loclBGR/SRB) встают в те же классы и исключения, что их основы */
  const loclOf={};glyphs.forEach((g,i)=>{if(g.alt&&(g.alt.feat==='locl'||g.alt.kernAs)&&gidByCh[g.alt.base]!=null)(loclOf[gidByCh[g.alt.base]]||(loclOf[gidByCh[g.alt.base]]=[])).push(i);});
  const man=[];for(const key of Object.keys(kmap||{})){const cc=Array.from(key);if(cc.length!==2||ku[key]!=null)continue;const l=gidByCh[cc[0]],r=gidByCh[cc[1]],v=Math.round(kmap[key]);
    if(l==null||r==null||!v)continue;man.push([l,r,Math.max(-32000,Math.min(32000,v))]);}
  /* пользовательские исключения (в т.ч. 0 — «не кернить»): предел 15% кегля и защита от столкновения по профилям текущего веса */
  for(const key of Object.keys(ku)){const cc=Array.from(key);if(cc.length!==2||kernBlocked(cc[0],cc[1]))continue;const l=gidByCh[cc[0]],r=gidByCh[cc[1]];if(l==null||r==null)continue;
    let v=Math.max(-kmx(),Math.min(kmx(),Math.round(+ku[key])||0));
    const pa=prof(cc[0]),pb=prof(cc[1]);if(pa&&pb){const t=(isLow(cc[0])||isLow(cc[1]))?(ct?ct.tL:0):(ct?ct.tU:0),G0=Math.max(Math.min(t*0.4,kgc()),12),g=kernGap(pa,pb,1e4);if(g)v=Math.max(v,Math.ceil(G0-g.min));}
    man.push([l,r,v]);}
  /* у альтернатива свой контур: значение не должно давать зазор меньше безопасного */
  const gprof={};const gp=i=>{if(gprof[i]!==undefined)return gprof[i];const g=glyphs[i];return gprof[i]=g&&g.cs.length?kernProfile(g.cs,g.adv):null;};
  const lowG=i=>{const g=glyphs[i];return !!(g&&g.ch!=null&&isLow(g.alt&&(g.alt.feat==='locl'||g.alt.kernAs)?g.alt.base:g.ch));};
  const guardV=(l,r,v)=>{if(v>=0)return v;const pa=gp(l),pb=gp(r);if(!pa||!pb)return v;const t=(lowG(l)||lowG(r))?(ct?ct.tL:0):(ct?ct.tU:0),G0=Math.max(Math.min(t*0.4,kgc()),12),g=kernGap(pa,pb,1e4);
    return g?Math.min(0,Math.max(v,Math.ceil((G0-g.min)/2)*2)):v;};
  const exLocl=list=>{const o=[];for(const [l,r,v] of list){for(const a of [l,...(loclOf[l]||[])])for(const b of [r,...(loclOf[r]||[])])if(a!==l||b!==r)o.push([a,b,guardV(a,b,v)]);}list.push(...o);};
  exLocl(man);
  const subs=[];
  if(man.length){/* делим на части, чтобы подтаблица не превысила 64К */const by={};man.forEach(m=>(by[m[0]]||(by[m[0]]=[])).push(m));let cur=[],sz=0;
    for(const f of Object.keys(by).map(Number).sort((a,b)=>a-b)){const n=by[f].length*4+4;if(sz+n>56000&&cur.length){subs.push(otPairPos1(cur));cur=[];sz=0;}cur.push(...by[f]);sz+=n;}
    if(cur.length)subs.push(otPairPos1(cur));}
  if(ct&&ct.pairs){const ap=[];for(const key in ct.pairs){if((kmap&&kmap[key]!=null)||ku[key]!=null)continue;const cc=Array.from(key),l=gidByCh[cc[0]],r=gidByCh[cc[1]];if(l!=null&&r!=null)ap.push([l,r,ct.pairs[key]]);}
    exLocl(ap);if(ap.length)subs.push(otPairPos1(ap));}
  if(ct&&Object.keys(ct.vals).length){const c1={},c2={};
    ct.L.forEach(([n,m],i)=>m.forEach(ch=>{c1[gidByCh[ch]]=i+1;}));ct.R.forEach(([n,m],j)=>m.forEach(ch=>{c2[gidByCh[ch]]=j+1;}));
    for(const b in loclOf){loclOf[b].forEach(x=>{if(c1[b]!=null)c1[x]=c1[b];if(c2[b]!=null)c2[x]=c2[b];});}
    /* лигатуры (Сцепка): слева от пары — класс последней буквы лигатуры, справа — класс первой */
    glyphs.forEach((g,i)=>{const lg=g.alt&&g.alt.lig;if(!lg||!lg.length)return;const f0=gidByCh[lg[0]],l0=gidByCh[lg[lg.length-1]];
      if(l0!=null&&c1[l0]!=null)c1[i]=c1[l0];if(f0!=null&&c2[f0]!=null)c2[i]=c2[f0];});
    const M=[];for(let i=0;i<=ct.L.length;i++){M.push(new Array(ct.R.length+1).fill(0));}
    ct.L.forEach(([l],i)=>ct.R.forEach(([r],j)=>{const v=ct.vals[l+'|'+r];if(v)M[i+1][j+1]=v;}));
    /* пары с locl-альтернатами внутри класса: проверка по их собственному контуру, при тесноте — исключение */
    const have=new Set();man.forEach(m=>have.add(m[0]+','+m[1]));
    const gx=[];const allx=Object.keys(c1).concat(Object.keys(c2)).filter((v,i,a)=>a.indexOf(v)===i).map(Number);
    const isLoc=new Set();for(const b in loclOf)loclOf[b].forEach(x=>isLoc.add(x));
    for(const x of isLoc){
      if(c1[x]){for(const y of allx)if(c2[y]){const v=M[c1[x]][c2[y]];if(v<0&&!have.has(x+','+y)){const nv=guardV(x,y,v);if(nv!==v){have.add(x+','+y);gx.push([x,y,nv]);}}}}
      if(c2[x]){for(const y of allx)if(c1[y]&&!isLoc.has(y)){const v=M[c1[y]][c2[x]];if(v<0&&!have.has(y+','+x)){const nv=guardV(y,x,v);if(nv!==v){have.add(y+','+x);gx.push([y,x,nv]);}}}}}
    if(gx.length)subs.push(otPairPos1(gx));
    subs.push(otPairPos2(c1,c2,M));res.classKern=ct;}
  if(subs.length)res.GPOS=otLayoutTable([{tag:'kern',lookups:[0]}],[{type:2,subs}],9);
  return res;}
/* окружение кернинга для начертания: таблица классов, карты символ->класс, профили; кэш по параметрам (auto — без пользовательских классов) */
const _ckCache={};
function kernEnv(st,styleKey,get,auto){
  const base=CUR_FONT+'|'+JSON.stringify(st.p)+'|'+JSON.stringify(st.hg||[])+'|'+(st.lat&&JSON.stringify(st.lat).length),key=base+(auto?'|A':'|'+JSON.stringify(st.kc||{}));
  const ck=auto?styleKey+'\u0001A':styleKey;let c=_ckCache[ck];
  if(!c||c.key!==key){const pc=(c&&c.base===base&&c.pc)||{};
    const prof=ch=>{if(pc[ch]!==undefined)return pc[ch];if(!GL[ch])return pc[ch]=null;const g=get?get(ch):finalGlyph(ch,st,{});return pc[ch]=g&&g.cs.length?kernProfile(g.cs,g.adv):null;};
    const isLow=ch=>{const d=GL[ch];return !!(d&&d.k==='xh'&&isLetter(ch));};
    const ct=classKernTable(auto?Object.assign({},st,{kc:null}):st,prof,isLow);
    const lc={},rc={};if(ct){ct.L.forEach(([n,m])=>m.forEach(ch=>lc[ch]=n));ct.R.forEach(([n,m])=>m.forEach(ch=>rc[ch]=n));}
    c=_ckCache[ck]={key,base,ct,lc,rc,pc,prof,isLow};}
  return c;}
/* значение кернинга пары для превью (классы + ручные), кэш по параметрам */
function classKernValue(a,b,st,styleKey,get){
  const c=kernEnv(st,styleKey,get);
  if(!c.ct)return 0;if(c.ct.pairs&&c.ct.pairs[a+b])return c.ct.pairs[a+b];const l=c.lc[a],r=c.rc[b];return (l&&r&&c.ct.vals[l+'|'+r])||0;}
/* итоговое значение пары для произвольного начертания (сравнение, экспорт-превью): исключение > ручная > пара > класс */
function kernStVal(a,b,st,tag,get){const u=st.ku;if(u&&u[a+b]!=null)return u[a+b];const k=st.kern;if(k&&k[a+b])return k[a+b];
  try{return classKernValue(a,b,st,tag,get);}catch(e){return 0;}}
/* --- пользовательский кернинг: st.ku {'ab':v} — исключения (0 = не кернить), st.kc {'L|R':v} — значения классов --- */
const kcFirst=(T,ch)=>{for(const n in T)if(T[n].includes(ch))return n;return null;};
/* полная информация о паре: значение, источник, классы, пределы, флаги */
function kernInfo(a,b,st,styleKey,get){
  const c=kernEnv(st,styleKey,get),ca=kernEnv(st,styleKey,get,true);
  const l=c.lc[a]||kcFirst(KC_L,a),r=c.rc[b]||kcFirst(KC_R,b),ck=l&&r?l+'|'+r:null;
  const blocked=kernBlocked(a,b),ku=st.ku&&st.ku[a+b],lg=st.kern&&st.kern[a+b];
  const pairV=c.ct&&c.ct.pairs?c.ct.pairs[a+b]:null,clsV=c.ct&&ck?c.ct.vals[ck]:null;
  const aPair=ca.ct&&ca.ct.pairs?ca.ct.pairs[a+b]:null,aCls=ca.ct&&ck?ca.ct.vals[ck]:null;
  const kcSet=!!(st.kc&&ck&&st.kc[ck]!=null);
  let v=0,src='none';
  if(blocked){v=0;src='locked';}
  else if(ku!=null){v=ku;src='exc';}
  else if(lg){v=lg;src='table';}
  else if(pairV){v=pairV;src=kcSet?'guard':'autoexc';}
  else if(clsV!=null&&(clsV||kcSet)){v=clsV;src=kcSet?'cls':'autocls';}
  const autoV=blocked?0:(lg||aPair||aCls||0);
  const pa=c.prof(a),pb=c.prof(b),t=(c.isLow(a)||c.isLow(b))?(c.ct?c.ct.tL:0):(c.ct?c.ct.tU:0),G0=Math.max(Math.min(t*0.4,kgc()),12);
  const g=pa&&pb?kernGap(pa,pb,1e4):null;
  let lo=-kmx();if(g)lo=Math.max(lo,Math.ceil(G0-g.min));
  return {v,src,l,r,ck,hasCls:!!ck&&!blocked,blocked,autoV,lo,hi:kmx(),gap:g?g.min:null,G0,
    over:Math.abs(v)>kmx(),tight:g?(v<0&&g.min+v<G0-0.5):false,hit:g?(g.min+v<=0):false,kcSet,hasExc:ku!=null,hasTable:!!lg};}
/* применить значение: mode 'exc' — исключение для пары, 'cls' — для классов обеих сторон */
function kernApply(st,a,b,v,mode,info){
  info=info||kernInfo(a,b,st,'kapply');if(info.blocked)return false;
  v=Math.round(+v)||0;v=Math.max(info.lo,Math.min(info.hi,v));
  if(mode==='cls'&&info.hasCls){const A=Array.from(KC_L[info.l]||''),B=Array.from(KC_R[info.r]||'');
    (st.kc||(st.kc={}))[info.ck]=v;
    if(st.ku)delete st.ku[a+b];
    if(st.kern)for(const x of A)for(const y of B)delete st.kern[x+y];}
  else (st.ku||(st.ku={}))[a+b]=v;
  return true;}
/* вернуть к авто: убрать исключение и пользовательское значение класса этой пары */
function kernReset(st,a,b,info){info=info||kernInfo(a,b,st,'kapply');
  if(st.ku)delete st.ku[a+b];if(st.kc&&info.ck)delete st.kc[info.ck];}
