/* ===== OpenType-функции расширенных шрифтов (m29 · OT): капитель, цифры, дроби, индексы, альтернаты, лигатуры =====
   Только Вольт, Квадра, Кодекс, Линия, Пропись (OTO.IDS). Базовые шрифты (Устав, Ротунда, Модуль, Рывок) не затрагиваются.
   Новые знаки — записи GL с составными именами (a.sc, one.osf, one.numr …), как m.ss01 и zero.tnum: они не входят в CHARSET,
   строятся из ТЕХ ЖЕ функций формы, что базовые знаки, но при пересчитанных метриках (p2): ползунки шрифта действуют на них же.
   entry.opt.ot = [[feature, исходный знак], …] — какие подстановки GSUB ведут к этому знаку (читает otFeaturesO1 / OTO.preview).
   Пересчёт метрик (см. OTO.p2): вертикальные размеры (capH, xh, asc, desc) умножаются на sy, штрих и волосная — на коэффициенты sw/hw. */
/* o.xs(g,q,dy,isSkel) — добавка к знаку: штрихи скелета или контуры */
var OTO={IDS:['volt','kvadra','stroka','codex','liniya','propis'],NAMES:{},plan:{}};
OTO.on=id=>OTO.IDS.indexOf(id==null?(typeof CUR_FONT==='string'?CUR_FONT:''):id)>=0;
const OTO_DIG=['zero','one','two','three','four','five','six','seven','eight','nine'];
/* имя глифа по AGL: латиница и цифры — собственные имена, прочее — uniXXXX */
const otoName=ch=>{const c=ch.codePointAt(0);if(/^[A-Za-z]$/.test(ch))return ch;if(c>=48&&c<=57)return OTO_DIG[c-48];return 'uni'+c.toString(16).toUpperCase().padStart(4,'0');};
/* ---- настройка по шрифтам: капитель (высота = xh·hx; ширина шире прописных на wx относительно масштаба по высоте) ---- */
OTO.CFG={
  volt:  {hx:1.06,wx:1.08,dd:0.95,sbx:0.03,ssw:0.92,shw:0.95},
  kvadra:{hx:1.06,wx:1.08,dd:0.95,sbx:0.03,ssw:0.92,shw:0.95},
  stroka:{hx:1.06,wx:1.08,dd:0.95,sbx:0.03,ssw:0.92,shw:0.95},
  codex: {hx:1.06,wx:1.10,dd:0.95,sbx:0.03,ssw:0.92,shw:0.95},
  liniya:{hx:1.06,wx:1.10,dd:0.95,sbx:0.035,ssw:0.92,shw:0.95},
  propis:{hx:1.06,wx:1.10,dd:0.95,sbx:0.03,ssw:0.92,shw:0.95}};
/* значения по умолчанию для общих конструкций */
OTO.NUM={s:0.60,wx:1.12,sub:-0.10,c:0.30};
/* штрих мелких цифр: масштаб s с оптической прибавкой c (меньше у тяжёлых начертаний, чтобы не закрывать просветы 4 8 6 9) */
OTO.smW=p=>{const n=OTO.NUM;if(typeof CUR_FONT==='string'&&OTO.OUTSC.indexOf(CUR_FONT)>=0)return {sw:n.s,hw:n.s};/* перо Прописи: строго пропорциональное уменьшение */
  const c=Math.max(-0.12,Math.min(n.c,n.c-(sE(p)/p.capH-0.15)*1.8));return {sw:n.s*(1+c),hw:n.s*(1+c*0.8)*Math.max(0.55,Math.min(1,1-Math.max(0,p.hair/p.capH-0.15)*3))};};
/* ширина знака B при параметрах p */
OTO.W=(B,p)=>typeof B.w==='function'?B.w(p):B.w*p.wdth/100;
/* p2: вертикальный масштаб sy (capH, xh, asc, desc), множители штриха sw и волосной hw; o.cap — высота «прописной» в p2 */
OTO.p2=(p,o)=>{const q=Object.assign({},p),sy=o.sy==null?1:o.sy;
  q.capH=o.cap!=null?o.cap:p.capH*sy;q.xh=o.xh!=null?o.xh:p.xh*sy;q.asc=o.asc!=null?o.asc:p.asc*sy;q.desc=o.desc!=null?o.desc:p.desc*sy;
  if(o.sw!=null&&o.sw!==1){q.stem=p.stem*o.sw;}
  if(o.hw!=null&&o.hw!==1){q.hair=p.hair*o.hw;}
  if(o.hcap)q.hair=Math.min(q.hair,q.stem*o.hcap);/* волосная не толще штриха в 1.6 раза: у крайних сочетаний ползунков тонкий ствол при толстой волосной рвёт знак */
  if(o.ov!=null)q.ov=o.ov;
  if(o.aperK&&p.aper!=null)q.aper=Math.min(60,p.aper*o.aperK);/* уменьшенный знак: апертура открывается шире, чтобы просвет остался таким же */
  if(o.nospur)q.spur=0;
  if(o.conn!=null)q.conn=o.conn;
  if(o.lim){const sm=q.capH*Math.max(0.28,Math.min(0.37,0.30+(p.wdth-80)*0.0016));if(q.stem>sm)q.stem=sm;/* штрих капители не толще доли её высоты: уже знак — тоньше штрих */
    const r=paramLimits(q).q;for(const k of ['stem','hair','round','innerR','ov','diag'])if(r[k]!=null&&q[k]!=null)q[k]=r[k];}/* пределы шрифта для уменьшенной высоты (как safeP для обычного знака) */
  return q;};
/* ширина: «свободная» часть масштабируется wx, часть, зависящая от штриха (nst·stem), остаётся */
OTO.width=(B,p,q,wx)=>{const w0=OTO.W(B,q),d=8,nst=(OTO.W(B,Object.assign({},q,{stem:q.stem+d}))-w0)/d;
  const sp=Math.max(0,Math.min(nst,4))*q.stem;return Math.max(40,Math.round(wx*(w0-sp)+sp));};
/* запись-вариант знака B: o.p2(p) -> p2; o.h(q) -> высота g.h; o.dy(q) -> сдвиг по y; o.wx — масштаб свободной ширины;
   o.k — вид ('cap'|'xh'), o.hz(p) — высота зоны для оптических полей, o.base/o.ot/o.feat — метаданные подстановки */
/* преобразование контуров с сохранением признака дыры и порядка обхода (xf пересчитывает направление по признаку; у сырых контуров скелета он не всегда выставлен) */
const otoXf=(cs,fn)=>cs.map(c=>KEEPOP({hole:c.hole,nodes:c.nodes.map(n=>{const p=fn(n.x,n.y),a=n.a&&fn(n.a.x,n.a.y),b=n.b&&fn(n.b.x,n.b.y);return {x:p[0],y:p[1],a:a?{x:a[0],y:a[1]}:null,b:b?{x:b[0],y:b[1]}:null};})},c));
function otoVariant(fontId,B,o){
  const F=()=>FONTS[fontId];
  const q2=p=>o.p2(p),dyOf=(p,q)=>o.dy?o.dy(p,q):0;
  const e={k:o.k||'cap',hz:o.hz,opt:Object.assign({alt:true,base:o.base,feat:o.feat,ot:o.ot},o.opt||{}),
    w:p=>{const q=q2(p);return o.w?o.w(p,q):OTO.width(B,p,q,o.wx);}};
  const mkG2=g=>{const q=q2(g.p);return makeG(q,g.w,o.h(q,g.p));};
  const shift=(cs,dy)=>dy?xf(cs,(x,y)=>[x,y+dy]):cs;
  if(B.skel){
    e.skel=g=>{const q=q2(g.p),sk=B.skel(makeG(q,g.w,o.h(q,g.p))),dy=dyOf(g.p,q),s2=dy?skXf(sk,(x,y)=>[x,y+dy]):sk;return o.xs?s2.concat(o.xs(g,q,dy,true)):s2;};
    e.shape=g=>skShape(e.skel(g),F(),q2(g.p));
  }else{
    e.shape=g=>{const q=q2(g.p),dy=dyOf(g.p,q),cs=shift(B.shape(makeG(q,g.w,o.h(q,g.p)))||[],dy);return o.xs?cs.concat(o.xs(g,q,dy,false)):cs;};
  }
  return e;}
/* ---- капитель: A.sc … ---- */
/* тяжёлые начертания: штрих капители уменьшается сильнее (иначе в уменьшенной высоте закрываются просветы) */
OTO.wF=p=>{const F=FONTS[CUR_FONT],d=(F&&F.DEFAULTS&&F.DEFAULTS.regular)||p;return 1+Math.max(0,sE(p)/p.capH-sE(d)/d.capH)*2.5+Math.max(0,(20-(p.aper==null?26:p.aper))/20)*0.15;};
OTO.scExt=p=>{const F=FONTS[CUR_FONT],d=(F&&F.DEFAULTS&&F.DEFAULTS.regular)||p;
  return sE(p)/p.capH-sE(d)/d.capH>0.05||p.hair*1.1/p.capH-d.hair*1.1/d.capH>0.1||(p.aper!=null&&p.aper<20)||p.wdth<90;};
OTO.hvS=p=>{const F=FONTS[CUR_FONT],d=(F&&F.DEFAULTS&&F.DEFAULTS.regular)||p,rs=sE(p)/p.capH-sE(d)/d.capH,rh=p.hair*1.1/p.capH-d.hair*1.1/d.capH;
  return Math.max(0.5,Math.min(1,1-Math.max(0,rs,rh)*2.2-Math.max(0,95-p.wdth)*0.012));};
OTO.scP=(id,p)=>{const c=OTO.CFG[id],h=p.xh*c.hx,sy=h/p.capH;return {lim:1,hcap:1.6,sy,cap:h,xh:h*(p.xh/p.capH),asc:p.asc*sy,desc:p.desc*sy,nospur:id==='codex',sw:(id==='propis'?c.ssw-Math.max(0,sE(p)/p.capH-0.14)*2.5:c.ssw)*OTO.hvS(p),hw:c.shw*Math.max(0.6,OTO.hvS(p)),aperK:Math.min(2,Math.min(1.45,1.08/sy)*(1+Math.max(0,(24-(p.aper==null?26:p.aper))/24)*0.8))};};
function otoAddSC(id){
  const F=FONTS[id],G=F.GL,have=new Set(F.CHARSET);
  const ups=F.CHARSET.filter(c=>/\p{Lu}/u.test(c)&&G[c]&&c.length===1);
  const tmp={};
  for(const U of ups){
    const L=U.toLowerCase();let lo=null;
    if(L.length===1&&L!==U&&have.has(L))lo=L;
    const nm=otoName(lo||U)+'.sc';if(G[nm])continue;
    const ot=[['c2sc',U]];if(lo)ot.push(['smcp',lo]);
    const B=G[U];
    const ky=p=>p.xh*OTO.CFG[id].hx/p.capH,kx=p=>ky(p)*(1+(OTO.CFG[id].wx-1)*0.0);
    let e=(OTO.SCOUT[id]==='*'||(OTO.SCOUT[id]||'').includes(U))?{k:'cap',hz:p=>p.xh*OTO.CFG[id].hx,opt:{alt:true,base:U,feat:'smcp',ot},w:p=>Math.round(OTO.W(B,p)*kx(p)),
      shape:g=>otoXf(B.shape(makeG(g.p,OTO.W(B,g.p),g.p.capH))||[],(x,y)=>[x*kx(g.p),y*ky(g.p)])}:
    otoVariant(id,B,{k:'cap',base:U,feat:'smcp',ot,wx:OTO.CFG[id].wx*1,
      p2:p=>{const o=OTO.scP(id,p);if(id==='propis'&&'ЦЩ'.includes(U)){o.sw*=0.72;o.hw*=0.8;}return OTO.p2(p,o);},h:q=>q.capH,hz:p=>p.xh*OTO.CFG[id].hx,
      w:(p,q)=>{const r=q.capH/p.capH;return OTO.width(B,p,q,OTO.CFG[id].wx*r*(1+Math.max(0,110-p.wdth)*0.01)*OTO.wF(p)*(U==='W'?1.18:1));}});
    if(id==='volt'||id==='kvadra'||id==='stroka'){/* крайние положения ползунков (очень тяжёлый штрих, закрытая апертура, узкий знак): капитель — масштаб контура прописной */
      const v=e,wo=p=>Math.round(OTO.W(B,p)*kx(p)),so=g=>otoXf(B.shape(makeG(g.p,OTO.W(B,g.p),g.p.capH))||[],(x,y)=>[x*kx(g.p),y*ky(g.p)]);
      e={k:v.k,hz:v.hz,opt:v.opt,w:p=>OTO.scExt(p)?wo(p):v.w(p),shape:g=>OTO.scExt(g.p)?so(g):v.shape(g)};}
    e.opt.sc=1;e.opt.grp='sc';e.opt.own=1;e.opt.sbx=p=>(p.xh*OTO.CFG[id].hx)*OTO.CFG[id].sbx;tmp[nm]=e;
    /* ı → i.sc (то же, что I.sc) */
  }
  Object.assign(G,tmp);
}
/* ---- цифры: oldstyle (.osf пропорциональные, .tosf табличные), числитель/знаменатель, индексы ---- */
/* знаки, у которых капитель строится масштабом контура основы (параметрическая версия при крайних ползунках теряет топологию) */
OTO.SCOUT={codex:'*',propis:'*'};
/* шрифты, у которых малые цифры — масштаб контура основной цифры */
OTO.OUTSC=['codex','liniya','propis'];
OTO.NUMS=['0','1','2','3','4','5','6','7','8','9'];
/* вид минускульной цифры: short (0 1 2 — высота строчных), asc (6 8 — выносные вверх), desc (3 4 5 7 9 — вниз) */
OTO.OSF_KIND={'0':'short','1':'short','2':'short','3':'desc','4':'desc','5':'desc','6':'asc','7':'desc','8':'asc','9':'desc'};
OTO.hvK=p=>1+Math.max(0,sE(p)/p.capH-0.2)*3.5;/* тяжёлые начертания: апертура шире */
OTO.osW=p=>1-Math.max(0,sE(p)/p.capH-0.18)*1.4;
OTO.osfP=(id,kind,p)=>{const c=OTO.CFG[id];
  if(kind==='short'){const h=p.xh;return {cap:h,xh:h*0.75,asc:p.asc*h/p.capH,desc:p.desc*h/p.capH,nospur:1,top:h,dy:0,aperK:OTO.hvK(p),sw:OTO.osW(p),hw:Math.min(1,OTO.osW(p)+0.1)};}
  if(kind==='asc'){const h=p.capH+(p.asc-p.capH)*0.35;return {cap:h,xh:p.xh,asc:p.asc,desc:p.desc,nospur:1,top:h,dy:0,aperK:OTO.hvK(p)};}
  /* desc: верх на линии строчных, цифра уходит под базовую; полная высота ≈ 0.97 прописной, не глубже 0.9 выносной */
  const H=Math.min(p.capH*c.dd,p.xh+0.9*p.desc);return {cap:H,xh:p.xh,asc:p.asc,desc:p.desc,nospur:1,top:p.xh,dy:-(H-p.xh),aperK:OTO.hvK(p)};};
/* индексные знаки: s — масштаб, dy — сдвиг базовой линии в долях прописной (sup: верх на линии прописных, dnom: на базовой, sub: ниже базовой) */
OTO.smP=(p,pos)=>{const n=OTO.NUM,s=n.s,h=p.capH*s;
  const dy=pos==='numr'?p.capH-h:pos==='subs'?p.capH*n.sub:0;
  const w=OTO.smW(p);return {q:{sy:s,cap:h,xh:p.xh*s,asc:p.asc*s,desc:p.desc*s,sw:w.sw,hw:w.hw,nospur:1,ov:p.ov*s,aperK:1.5*OTO.hvK(p)},dy};};
function otoAddFigures(id){
  const F=FONTS[id],G=F.GL;
  /* имена .tnum/.pnum -> .tf/.pf (AGL: Adobe) */
  for(const k of Object.keys(G)){const m=/^([a-z]+)\.(tnum|pnum)$/.exec(k);if(m&&OTO_DIG.includes(m[1])){G[m[1]+(m[2]==='tnum'?'.tf':'.pf')]=G[k];delete G[k];}}
  OTO.NUMS.forEach((ch,d)=>{const B=G[ch];if(!B)return;const nm=OTO_DIG[d],kind=OTO.OSF_KIND[ch];
    for(const tab of [false,true]){
      if(OTO.OUTSC.indexOf(id)>=0){/* перо: минускульная цифра — масштаб контура основной цифры (штрих и волосная в одном масштабе) */
        const ky=p=>OTO.osfP(id,kind,p).cap/p.capH,kx=p=>Math.pow(ky(p),0.6);
        G[nm+(tab?'.tosf':'.osf')]={k:'cap',hz:p=>OTO.osfP(id,kind,p).top,opt:{alt:true,base:ch,feat:'onum',grp:tab?'tosf':'osf',own:1,tnum:tab||undefined,pnum:tab?undefined:true},
          w:p=>Math.round(OTO.W(B,p)*kx(p)),
          shape:g=>{const p=g.p,wb=OTO.W(B,p),P=OTO.osfP(id,kind,p),a=ky(p),b=kx(p),dx=(g.w-wb*b)/2;
            return otoXf(B.shape(makeG(p,wb,p.capH))||[],(x,y)=>[x*b+dx,y*a+P.dy]);}};
        continue;}
      const e=otoVariant(id,B,{k:'cap',base:ch,feat:'onum',wx:1,p2:p=>OTO.p2(p,OTO.osfP(id,kind,p)),h:q=>q.capH,
        dy:p=>OTO.osfP(id,kind,p).dy,hz:p=>OTO.osfP(id,kind,p).top,
        opt:{grp:tab?'tosf':'osf',own:1,tnum:tab||undefined,pnum:tab?undefined:true}});
      G[nm+(tab?'.tosf':'.osf')]=e;}
    for(const pos of ['numr','dnom','subs']){
      if(OTO.OUTSC.indexOf(id)>=0){/* перо Прописи: знак уменьшается целиком по контуру базовой цифры (штрих и волосная — в том же масштабе, топология не меняется) */
        const sc=OTO.NUM.s,e={k:'cap',hz:p=>p.capH*sc,opt:{alt:true,base:ch,feat:pos==='numr'?'sups':pos==='subs'?'subs':'frac',grp:pos,own:1,pnum:true,sbx:p=>p.capH*0.014},
          w:p=>Math.round(OTO.W(B,p)*sc*1.06),
          shape:g=>{const p=g.p,wb=OTO.W(B,p),h=p.capH*sc,dy=pos==='numr'?p.capH-h:pos==='subs'?p.capH*OTO.NUM.sub:0,dx=(g.w-wb*sc)/2;
            return otoXf(B.shape(makeG(p,wb,p.capH))||[],(x,y)=>[x*sc+dx,y*sc+dy]);}};
        G[nm+'.'+pos]=e;continue;}
      const e=otoVariant(id,B,{k:'cap',base:ch,feat:pos==='numr'?'sups':pos==='subs'?'subs':'frac',wx:OTO.NUM.wx*OTO.NUM.s,
        p2:p=>OTO.p2(p,OTO.smP(p,pos).q),h:q=>q.capH,dy:p=>OTO.smP(p,pos).dy,hz:p=>p.capH*OTO.NUM.s,
        w:(p,q)=>OTO.width(B,p,q,OTO.NUM.wx*OTO.NUM.s),opt:{grp:pos,own:1,pnum:true,sbx:p=>p.capH*0.014}});
      G[nm+'.'+pos]=e;}});
}
/* ---- валюта в табличной ширине: $ € ₽ ---- */
OTO.CUR={'$':'dollar','€':'Euro','₽':'uni20BD'};
OTO.cur=ch=>OTO.on()&&OTO.CUR[ch]!=null;
function otoAddCurrency(id){
  const G=FONTS[id].GL;
  for(const ch in OTO.CUR){const B=G[ch];if(!B)continue;
    G[OTO.CUR[ch]+'.tf']=Object.assign({},B,{opt:Object.assign({},B.opt||{},{alt:true,base:ch,feat:'tnum',tnum:true,grp:'ctf',own:1})});
    G[OTO.CUR[ch]+'.pf']=Object.assign({},B,{opt:Object.assign({},B.opt||{},{alt:true,base:ch,feat:'pnum',pnum:true,grp:'cpf',own:1})});}
}
/* ---- дробная черта U+2044 (45°, не косая «/»), порядковые ª º ---- */
OTO.barA=p=>Math.round(p.capH*0.30);
OTO.barGeom=p=>{const c=p.capH,y0=-0.04*c,y1=1.02*c,dy=y1-y0,gp=0.04*c,s=OTO.NUM.s;
  /* левый край черты на нижней границе числителя стоит правее числителя на зазор gp */
  const x0=-p.sb-p.track*0+gp-(c-s*c-y0);return {y0,y1,x0,dx:dy,dy};};
function otoAddBar(id){
  const F=FONTS[id],G=F.GL;
  const w=p=>Math.max(60,OTO.barA(p)-2*p.sb-p.track);
  const e={k:'cap',opt:{fixed:false,grp:'bar'},w};
  const sk=!!G['H'].skel;
  if(sk){
    e.skel=g=>{const q=OTO.barGeom(g.p),x0=q.x0-g.p.sb;
      return [{nodes:[{x:x0,y:q.y0,a:null,b:null,type:'corner'},{x:x0+q.dx,y:q.y1,a:null,b:null,type:'corner'}],cap0:'T',cap1:'T'}];};
    e.shape=g=>skShape(e.skel(g),F,g.p);
  }else{
    e.shape=g=>{const q=OTO.barGeom(g.p),k=gk(g),x0=q.x0-g.p.sb,hw=Math.max(Math.min(k.dw(q.dx,q.dy)*0.92,sE(g.p)*0.62),12);
      return [PG(g,[[x0,q.y0],[x0+hw,q.y0],[x0+q.dx+hw,q.y1],[x0+q.dx,q.y1]])];};
  }
  G['\u2044']=e;
  if(F.CHARSET.indexOf('\u2044')<0)F.CHARSET.push('\u2044');
  /* группа «Знаки» */
  for(const g of F.GROUPS)if(g[0]==='Знаки'&&g[1].indexOf('\u2044')<0)g[1]+='\u2044';
}
/* ---- ª º: верхняя строчная a / o с чертой ---- */
OTO.ordP=(p)=>{const s=0.64,h=p.xh*s;return {q:{sy:s,cap:p.capH*s,xh:h,asc:p.asc*s,desc:p.desc*s,sw:OTO.smW(p).sw,hw:OTO.smW(p).hw,nospur:1,conn:0,ov:p.ov*s},dy:p.capH-h-p.ov*s};};
function otoAddOrd(id){
  const F=FONTS[id],G=F.GL;
  for(const [ch,lo] of [['\u00AA','a'],['\u00BA','o']]){const B=G[lo];if(!B)continue;
    const sk=!!B.skel;
    const e=otoVariant(id,B,{k:'cap',base:ch,feat:'ordn',wx:OTO.NUM.wx*0.64,p2:p=>OTO.p2(p,OTO.ordP(p).q),h:q=>q.xh,dy:p=>OTO.ordP(p).dy,hz:p=>p.capH*0.5,
      w:(p,q)=>OTO.width(B,p,q,OTO.NUM.wx*0.64),opt:{grp:'ord',own:1},
      xs:(g,q,dy,isSk)=>{const x0=g.w*0.06,x1=g.w*0.94,t=Math.max(q.hair*0.9,22),yb=dy-q.ov-Math.max(t*0.9,26),y=yb-t/2;
        if(isSk)return [{nodes:[{x:x0+t/2,y,a:null,b:null,type:'corner'},{x:x1-t/2,y,a:null,b:null,type:'corner'}],cap0:'T',cap1:'T'}];
        return [PG(g,[[x0,yb-t/2],[x1,yb-t/2],[x1,yb+t/2],[x0,yb+t/2]])];}});
    e.opt.alt=false;delete e.opt.base;/* кодированные знаки — не альтернаты */
    G[ch]=e;if(F.CHARSET.indexOf(ch)<0)F.CHARSET.push(ch);
    for(const g of F.GROUPS)if(g[0]==='Знаки'&&g[1].indexOf(ch)<0)g[1]+=ch;}
}
/* ---- лигатуры fi fl ff ffi ffl (Квадра, Линия): перекладина первой f вливается в следующий знак ---- */
OTO.LIG_FONTS=['kvadra','stroka','liniya'];
OTO.LIGS=[['f_f',['f','f']],['f_i',['f','ı']],['f_l',['f','l']],['f_f_i',['f','f','ı']],['f_f_l',['f','f','l']]];
const OTO_LM=new Map();
/* сборка лигатуры: части ставятся по профилям — перекладина (пик справа на высоте строчных) заходит в следующую часть на ov, выносной элемент f не ближе G0 */
function otoLigBuild(parts,p){
  const key=CUR_FONT+'|'+parts.join('')+'|'+JSON.stringify(p);let r=OTO_LM.get(key);if(r)return r;
  const S=sE(p),H=p.hair,ovl=Math.max(22,Math.min(S,H)*1.1),G0=Math.max(34,Math.min(S,H)*0.7);
  let cs=null,w=0,adv0=0;const R=0;
  for(const ch of parts){const d=GL[ch];if(!d)throw new Error('lig part '+ch);const hh=d.k==='xh'?p.xh:p.capH,wi=glyphWidth(ch,p),sh=csgUnion(cloneC(d.shape(makeG(p,wi,hh))||[]));
    if(!cs){cs=sh;w=wi;continue;}
    const pa=kernProfile(cs,w),pb=kernProfile(sh,wi),st=(KP_Y1-KP_Y0)/KP_N,row=y=>Math.max(0,Math.min(KP_N-1,Math.floor((y-KP_Y0)/st)));
    /* перекладина: строка на высоте 0.55…1.0 строчных с самым правым краем первой части */
    let yb=-1,xr=-1e9;for(let j=row(p.xh*0.6);j<=row(p.xh*1.0);j++){const v=pa.R[j];if(v!=null&&v>xr){xr=v;yb=j;}}
    let dx=w*0.5;const jb=yb;
    if(jb>=0&&pb.L[jb]!=null)dx=xr-ovl-pb.L[jb];
    /* зазор выше перекладины (крючок f) и ниже (стебли) */
    const top=jb>=0?jb+Math.ceil((CUR_FONT==='stroka'?Math.min(S*0.6,H*1.2):S*0.6)/st):0,bot=jb>=0?jb-Math.ceil((H*1.2)/st):0;
    for(let j=0;j<KP_N;j++){const a=pa.R[j],b=pb.L[j];if(a==null||b==null)continue;
      if(j>=top||j<=bot){const need=a+G0-b;if(need>dx)dx=need;}}
    if(dx<w*0.3)dx=w*0.3;
    /* перемычка: перекладины соседних знаков всегда сливаются в одну (иначе при широком пере разрыв то есть, то нет — топология плавает) */
    if(jb>=0&&pb.L[jb]!=null&&xr>-1e8){let j0=jb,j1=jb;const lim=xr-ovl*0.6;while(j0>0&&pa.R[j0-1]!=null&&pa.R[j0-1]>=lim)j0--;while(j1<KP_N-1&&pa.R[j1+1]!=null&&pa.R[j1+1]>=lim)j1++;
      const y0=KP_Y0+j0*st+st*0.35,y1=KP_Y0+(j1+1)*st-st*0.35,bx0=xr-ovl*1.5,bx1=Math.max(bx0+ovl*3,dx+pb.L[jb]+ovl*1.5);
      if(y1>y0)cs.push(mkc([{x:bx0,y:y0},{x:bx1,y:y0},{x:bx1,y:y1},{x:bx0,y:y1}],false));}
    for(const c of sh)cs.push(mkc(c.nodes.map(n=>({x:n.x+dx,y:n.y,a:n.a&&{x:n.a.x+dx,y:n.a.y},b:n.b&&{x:n.b.x+dx,y:n.b.y}})),c.hole));
    w=dx+wi;}
  if(OTO_LM.size>200)OTO_LM.clear();
  r={cs,w};OTO_LM.set(key,r);return r;}
function otoAddLiga(id){
  if(OTO.LIG_FONTS.indexOf(id)<0)return;
  const F=FONTS[id],G=F.GL;
  for(const [nm,parts] of OTO.LIGS){if(!parts.every(c=>G[c]))continue;
    G[nm]={k:'xh',opt:{alt:true,base:'f',feat:'liga',grp:'liga',own:1,lig:parts.map(c=>c==='ı'?'i':c)},
      w:p=>otoLigBuild(parts,p).w,shape:g=>cloneC(otoLigBuild(parts,g.p).cs)};}
}

/* ---- Пропись: salt (раздельные формы без входа/выхода) и swsh (росчерк-выход у строчных, подводящий штрих у прописных) ----
   Росчерк — волосная кривая остроконечного пера, продолжающая выход последнего штриха по его касательной. */
OTO.SALT=['a','e','o','c','d','g','а','д','е','о','с'];
OTO.swshU=p=>p.xh;
function otoAddScript(id){
  if(id!=='propis')return;
  const F=FONTS[id],G=F.GL,p0=safeP(F.DEFAULTS.regular),tmp={};
  const hOf=(B,p)=>B.k==='xh'?p.xh:p.capH;
  const ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
  for(const ch of F.CHARSET){
    if(ch.length!==1||!G[ch]||!G[ch].skel||!/^[A-Za-z\u0410-\u044F\u0401\u0451]$/.test(ch))continue;
    const noSw='fFkKкКЮ'.includes(ch);/* у этих знаков росчерк сходится с ногой или петлёй и меняет топологию при крайних ползунках */
    const B=G[ch],nm=otoName(ch),low=ch===ch.toLowerCase()&&ch!==ch.toUpperCase();
    let sk;try{sk=B.skel(makeG(p0,OTO.W(B,p0),hOf(B,p0)));}catch(e){continue;}
    const ss=sk.filter(s=>s.nodes);if(!ss.length)continue;
    if(OTO.SALT.includes(ch)){
      const e=otoVariant(id,B,{k:B.k,base:ch,feat:'salt',wx:1,p2:p=>OTO.p2(p,{conn:0}),h:q=>hOf(B,q),opt:{grp:'salt',own:1}});
      tmp[nm+'.salt']=e;}
    if(noSw){}else if(low){
      const l=ss[ss.length-1],n=l.nodes[l.nodes.length-1],m=l.nodes[l.nodes.length-2];
      if(!(l.cap1==='C'&&Math.abs(n.x-OTO.W(B,p0))<10&&n.y<p0.xh*0.4&&n.y>0))continue;
      const tail=(sk,p)=>{const L=sk.filter(s=>s.nodes),l=L[L.length-1],n=l.nodes[l.nodes.length-1],m=l.nodes[l.nodes.length-2];
        const th=n.a?ang(n.a,n):ang(m,n),u=OTO.swshU(p);
        const bk=0.16*u,tr=th*Math.PI/180;return [SKB.P([[n.x-bk*Math.cos(tr),n.y-bk*Math.sin(tr),th],[n.x+0.55*u,n.y+0.30*u,16],[n.x+1.1*u,n.y+0.36*u,-8],[n.x+1.6*u,n.y+0.14*u,-38]],'J','R',{tens:p.tens||1})];};
      const e={k:B.k,opt:{alt:true,base:ch,feat:'swsh',grp:'swsh',own:1,term:1},w:p=>OTO.W(B,p)+Math.round(1.6*OTO.swshU(p)),
        skel:g=>{let sk=B.skel(makeG(g.p,OTO.W(B,g.p),hOf(B,g.p)));/* W88: the dots of ё/й-like swash forms sit on the base loop top; the swash body rises ~0.04 xh above the base overshoot, so lift the dots (clear gap at every slider value) */if(sk.some(s=>s.dot)){const dy=Math.round(0.05*g.p.xh+0.5*(g.p.stem||0)*0.1);sk=sk.map(s=>s.dot?Object.assign({},s,{y:s.y+dy}):s);}return sk.concat(tail(sk,g.p));}};
      e.shape=g=>skShape(e.skel(g),F,g.p);tmp[nm+'.swsh']=e;
    }else{
      const n0=ss[0].nodes[0],n1=ss[0].nodes[1];const a0=n0.b?ang(n0,n0.b):ang(n0,n1);
      if(!(a0>=60&&a0<=115&&n0.x<OTO.W(B,p0)*0.4))continue;
      const lead=p=>Math.round(0.8*OTO.swshU(p));
      const e={k:B.k,opt:{alt:true,base:ch,feat:'swsh',grp:'swsh',own:1,lead:1},w:p=>OTO.W(B,p)+lead(p),
        skel:g=>{const L=lead(g.p),u=OTO.swshU(g.p),sk=B.skel(makeG(g.p,OTO.W(B,g.p),hOf(B,g.p))),s2=skXf(sk,(x,y)=>[x+L,y]);
          const t=s2.filter(s=>s.nodes)[0],n0=t.nodes[0],n1=t.nodes[1],a0=n0.b?ang(n0,n0.b):ang(n0,n1);
          return s2.concat([SKB.P([[n0.x-0.95*L,n0.y-0.8*u,40],[n0.x-0.45*L,n0.y-0.3*u,64],[n0.x,n0.y,a0]],'R','J',{tens:g.p.tens||1})]);}};
      e.shape=g=>skShape(e.skel(g),F,g.p);tmp[nm+'.swsh']=e;
    }
  }
  Object.assign(G,tmp);
}
function otoLigSubst(list){/* [{comps:[gid..],lig}] — формат 1, по первому знаку; длинные раньше */
  const by=new Map();list.forEach(x=>{const k=x.comps[0];(by.get(k)||by.set(k,[]).get(k)).push(x);});
  const firsts=[...by.keys()].sort((a,b)=>a-b),sets=firsts.map(f=>{const L=by.get(f).sort((a,b)=>b.comps.length-a.comps.length);
    const ligs=L.map(x=>{const w=new BW();w.u16(x.lig).u16(x.comps.length);x.comps.slice(1).forEach(g=>w.u16(g));return w.b;});
    const w=new BW();w.u16(ligs.length);let off=2+2*ligs.length;ligs.forEach(b=>{w.u16(off);off+=b.length;});ligs.forEach(b=>w.bytes(b));return w.b;});
  const cov=otCoverage(firsts),w=new BW();let off=6+2*sets.length;w.u16(1).u16(off+sets.reduce((a,b)=>a+b.length,0)).u16(sets.length);
  sets.forEach(b=>{w.u16(off);off+=b.length;});sets.forEach(b=>w.bytes(b));w.bytes(cov);return w.b;}
function otFeaturesO1b(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  /* liga */
  const L=[];for(const g of glyphs){if(!g.alt||g.alt.feat!=='liga')continue;const d=GL[g.name];if(!d||!d.opt.lig)continue;const cg=d.opt.lig.map(c=>gidByCh[c]);if(cg.some(x=>x==null))continue;L.push({comps:cg,lig:gidByName[g.name]});}
  if(L.length){looks.push({type:4,subs:[otoLigSubst(L)]});feats.push({tag:'liga',lookups:[looks.length-1]});}
  /* salt, swsh (Пропись): swsh = росчерки только у последней буквы слова (выход) и у первой прописной (подвод) */
  for(const tag of ['salt','swsh']){
    const P=[];for(const g of glyphs){if(!g.alt||g.alt.feat!==tag)continue;const b=gidByCh[g.alt.base],me=gidByName[g.name];if(b!=null&&me!=null)P.push([b,me]);}
    if(!P.length)continue;
    looks.push({type:1,subs:[otSingleSubst(P)]});const l1=looks.length-1,ls=[l1];
    if(tag==='swsh'){
      const letters=[];for(const g of glyphs){const d=GL[g.name];if(g.alt&&g.alt.feat==='swsh'){letters.push(gidByName[g.name]);}else if(g.ch&&/\p{L}/u.test(g.ch)&&gidByCh[g.ch]!=null)letters.push(gidByCh[g.ch]);}
      const L=[...new Set(letters)].sort((a,b)=>a-b);
      const term=[],lead=[];for(const g of glyphs){if(!g.alt||g.alt.feat!=='swsh')continue;const b=gidByCh[g.alt.base],me=gidByName[g.name],d=GL[g.name];if(d&&d.opt.term)term.push([me,b]);else if(d&&d.opt.lead)lead.push([me,b]);}
      if(term.length){looks.push({type:1,subs:[otSingleSubst(term)]});const lr=looks.length-1;
        looks.push({type:6,subs:[otoChain3([],[otCoverage(term.map(x=>x[0]).sort((a,b)=>a-b))],[otCoverage(L)],lr)]});ls.push(looks.length-1);}
      if(lead.length){looks.push({type:1,subs:[otSingleSubst(lead)]});const lr=looks.length-1;
        looks.push({type:6,subs:[otoChain3([otCoverage(L)],[otCoverage(lead.map(x=>x[0]).sort((a,b)=>a-b))],[],lr)]});ls.push(looks.length-1);}
    }
    feats.push({tag,lookups:ls});
  }
}
/* ---- применение ко всем пяти шрифтам ---- */
OTO.build=function(){
  for(const id of OTO.IDS){const F=FONTS[id];if(!F||F._otoDone)continue;F._otoDone=true;
    otoAddSC(id);otoAddFigures(id);otoAddCurrency(id);otoAddBar(id);otoAddOrd(id);otoAddLiga(id);otoAddScript(id);}
};
OTO.build();
/* ===== GSUB: smcp c2sc onum lnum tnum pnum frac sups subs sinf ordn (+ salt swsh liga — ниже) ===== */
/* ReverseChainSingleSubst формат 1: покрытие входа, подстановки по порядку покрытия, lookahead-покрытия */
function otoReverse(covGids,subst,back,ahead){const cov=otCoverage(covGids),sorted=[...new Set(covGids)].sort((a,b)=>a-b);
  const mp=new Map();covGids.forEach((g,i)=>mp.set(g,subst[i]));
  const w=new BW(),n=2+2+2+2*back.length+2+2*ahead.length+2+2*sorted.length;
  const covs=[cov,...back,...ahead];let off=n;const offs=covs.map(c=>{const o=off;off+=c.length;return o;});
  w.u16(1).u16(offs[0]).u16(back.length);back.forEach((c,i)=>w.u16(offs[1+i]));
  w.u16(ahead.length);ahead.forEach((c,i)=>w.u16(offs[1+back.length+i]));
  w.u16(sorted.length);sorted.forEach(g=>w.u16(mp.get(g)));covs.forEach(c=>w.bytes(c));return w.b;}
/* ChainContextSubst формат 3 с lookahead: back — ближайший предыдущий первым */
function otoChain3(back,input,ahead,li){const covs=[...back,...input,...ahead];
  const head=2+2+2*back.length+2+2*input.length+2+2*ahead.length+2+4;let off=head;const offs=covs.map(c=>{const o=off;off+=c.length;return o;});
  const w=new BW();w.u16(3).u16(back.length);back.forEach((c,i)=>w.u16(offs[i]));w.u16(input.length);input.forEach((c,i)=>w.u16(offs[back.length+i]));
  w.u16(ahead.length);ahead.forEach((c,i)=>w.u16(offs[back.length+input.length+i]));w.u16(1).u16(0).u16(li);covs.forEach(c=>w.bytes(c));return w.b;}
/* таблица знаков для подстановок: gid основы и вариантов по именам */
function otFeaturesO1(glyphs,gidByName,gidByCh,feats,looks,fontId,st){
  if(!OTO.on(fontId))return;
  const tabOn=!!st.p.tabular,add=(tag,li)=>feats.push({tag,lookups:li}),single=pairs=>{looks.push({type:1,subs:[otSingleSubst(pairs)]});return looks.length-1;};
  const gn=n=>gidByName[n],gc=c=>gidByCh[c];
  const uniq=a=>[...new Set(a.filter(x=>x!=null))];
  /* --- капитель --- */
  const smcp=[],c2sc=[];
  for(const g of glyphs){if(!g.alt||!g.alt.ot)continue;const me=gidByName[g.name];
    for(const [tag,from] of g.alt.ot){const f=gidByCh[from];if(f==null||f===me)continue;(tag==='smcp'?smcp:c2sc).push([f,me]);}}
  /* ı, ǰ без своей капители: ı → i.sc */
  if(smcp.length)add('smcp',[single(smcp)]);
  if(c2sc.length)add('c2sc',[single(c2sc)]);
  /* --- цифры: 4 состояния LP LT OP OT (lining/oldstyle × пропорциональные/табличные) --- */
  const D=OTO.NUMS.map((ch,d)=>{const n=OTO_DIG[d],X=gc(ch),a=tabOn?gn(n+'.pf'):X,b=tabOn?X:gn(n+'.tf');
    return {LP:a,LT:b,OP:gn(n+'.osf'),OT:gn(n+'.tosf'),numr:gn(n+'.numr'),dnom:gn(n+'.dnom'),subs:gn(n+'.subs')};});
  const pr=(f,t)=>D.filter(x=>x[f]!=null&&x[t]!=null).map(x=>[x[f],x[t]]);
  const cur=[];for(const ch in OTO.CUR){const X=gc(ch),a=gn(OTO.CUR[ch]+'.tf'),b=gn(OTO.CUR[ch]+'.pf');if(X==null)continue;
    cur.push({LP:tabOn?b:X,LT:tabOn?X:a});}
  const prC=(f,t)=>cur.filter(x=>x[f]!=null&&x[t]!=null).map(x=>[x[f],x[t]]);
  const lk=(pairs)=>pairs.length?single(pairs):null;
  const oneLk=(a,b)=>{const l=lk([...pr(a,b),...prC(a,b)]);return l==null?[]:[l];};
  if(D.some(x=>x.OP!=null)){add('onum',[single([...pr('LP','OP'),...pr('LT','OT')])]);add('lnum',[single([...pr('OP','LP'),...pr('OT','LT')])]);}
  {const t=[...pr('LP','LT'),...prC('LP','LT'),...pr('OP','OT')],p=[...pr('LT','LP'),...prC('LT','LP'),...pr('OT','OP')];
   if(t.length)add('tnum',[single(t)]);if(p.length)add('pnum',[single(p)]);}
  /* --- индексы: sups (= числитель), subs/sinf --- */
  const allV=[];D.forEach((x,i)=>{const v=uniq([x.LP,x.LT,x.OP,x.OT]);allV.push(v);});
  const toAll=(key)=>{const o=[];D.forEach((x,i)=>{if(x[key]!=null)for(const v of allV[i])o.push([v,x[key]]);});return o;};
  const sup=toAll('numr'),sub=toAll('subs');
  if(sup.length)add('sups',[single(sup)]);
  if(sub.length){const l=single(sub);add('subs',[l]);add('sinf',[l]);}
  /* --- дроби: числитель — цифры перед чертой (обратный проход), черта между числом и цифрой, знаменатель — цифры после черты --- */
  const bar=gn('uni2044'),slash=gc('/'),digs=uniq(allV.flat()),dnomPairs=toAll('dnom'),numrPairs=toAll('numr');
  if(bar!=null&&slash!=null&&numrPairs.length&&dnomPairs.length){
    const numrG=uniq(D.map(x=>x.numr)),dnomG=uniq(D.map(x=>x.dnom));
    const lDn=single(dnomPairs),lBar=single([[slash,bar]]);
    looks.push({type:8,subs:[otoReverse(numrPairs.map(x=>x[0]),numrPairs.map(x=>x[1]),[],[otCoverage([...numrG,slash,bar])])]});const lRev=looks.length-1;
    looks.push({type:6,subs:[otoChain3([otCoverage(numrG)],[otCoverage([slash])],[otCoverage(digs)],lBar)]});const lC1=looks.length-1;
    looks.push({type:6,subs:[otoChain3([otCoverage([bar,...dnomG])],[otCoverage(digs)],[],lDn)]});const lC2=looks.length-1;
    add('frac',[lRev,lC1,lC2]);}
  /* --- порядковые ª º: цифра + a/o --- */
  const ia=gc('a'),io=gc('o'),oa=gc('ª'),oo=gc('º');
  if(ia!=null&&io!=null&&oa!=null&&oo!=null){const l=single([[ia,oa],[io,oo]]);
    looks.push({type:6,subs:[otoChain3([otCoverage(digs)],[otCoverage([ia,io])],[],l)]});add('ordn',[looks.length-1]);}
  /* --- прочее (alt/swsh/liga) --- */
  if(typeof otFeaturesO1b==='function')otFeaturesO1b(glyphs,gidByName,gidByCh,feats,looks,fontId,st);
}
