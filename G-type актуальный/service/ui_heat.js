/* «Тепловая карта» (W96 H): как шрифт читается глазом. Где глаз спотыкается, там горячо.
   Считается по настоящим контурам знаков (профили краёв краски, метод площади), не по картинке:
   - пятно: толщина штриха и плотность знака против медианы его класса (строчные / прописные / цифры);
   - пробелы: белое между соседними знаками в полосе x-height (или высоты прописных), глубина ограничена,
     с учётом кернинга; сравнение с медианой контрольных пар шрифта (HH HO OO, nn no oo);
   - ритм: промежутки между вертикальными штрихами вдоль слова против соседних;
   - межсловный пробел против обычного апроша и 1/3 em.
   Два места показа: образец в редакторе (чип «Тепловая карта», обе строки) и блок во вкладке «Проверка» (тестовый текст + отчёт).
   Ничего не считается, пока карта скрыта. Всё в IIFE; наружу: window.HEAT. CSS: ui_heat.css; DESIGN_SYSTEM §23. */
(function(){
'use strict';
const N=48;                       /* строк сканирования от базовой до высоты прописных */
const LS='gtype-heat-v1';
const LAYERS=[['read','Чтение'],['tone','Пятно'],['gaps','Пробелы'],['rhy','Ритм']];
const LAYER_HINT={read:'Всё вместе',tone:'Знаки темнее или светлее соседей',gaps:'Апрош пар и пробел между словами',rhy:'Интервалы между штрихами'};
/* «Неровность задумана рисунком»: у этих шрифтов библиотеки часть видов сбоев входит в замысел (модульная сетка, лезвия, капли, прыжок знаков, связи).
   Ключ: id шрифта. Значение: виды мест (pair, tone, word, rhy), которые не считаются недостатком; 'all' = все. Своих шрифтов пользователя и обычные шрифты это не касается. */
const INTENT={modul:'tone,rhy,pair',ryvok:'all',tyaga:'pair',kaplya:'all',pixel:'tone,pair',applik:'all',stsepka:'tone,pair,rhy',kortes:'pair,tone',stolb:'tone,rhy',propis:'all'};
const intentKinds=()=>{const v=INTENT[(typeof S!=='undefined'&&S.fontId)||''];if(!v)return null;return v==='all'?new Set(['pair','tone','word','rhy']):new Set(v.split(','));};
const LW={read:{pair:1,tone:.8,word:.9,rhy:.5},tone:{tone:1},gaps:{pair:1,word:1},rhy:{rhy:1}};
const HM={on:false,layer:'read',key:null,last:null,n:{spec:0,pf:0}};
try{const o=JSON.parse(localStorage.getItem(LS)||'null');if(o&&LW[o.layer])HM.layer=o.layer;}catch(e){}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify({layer:HM.layer}));}catch(e){}};
const $q=(s,r)=>(r||document).querySelector(s);
const nb=' ';                  /* неразрывный пробел */
const pc=x=>Math.round(Math.abs(x)*100)+nb+'%';
const em2=x=>(Math.round(x*100)/100).toString().replace('.',',');
const med=a=>{if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),m=b.length>>1;return b.length&1?b[m]:(b[m-1]+b[m])/2;};
const clamp01=x=>x<0?0:x>1?1:x;
const cls=ch=>/\p{Lu}/u.test(ch)?'u':/\p{Ll}/u.test(ch)?'l':/\p{Nd}/u.test(ch)?'d':'p';
/* ---------------- профиль знака ---------------- */
const PC=new WeakMap();
function ymaxOf(g){let m=-1e9;for(const c of g.cs)for(const n of c.nodes)if(n.y>m)m=n.y;return m;}
function glyphOf(gn,key){try{return typeof gfSmart==='function'?gfSmart(gn,key):null;}catch(e){return null;}}
function scanGlyph(g,cap,xh){
  const step=cap/N,rows=new Array(N);for(let r=0;r<N;r++)rows[r]=[];
  for(const c of g.cs){const n=c.nodes;if(!n||n.length<2)continue;const P=flatC(c,8),m=P.length;
    for(let i=0;i<m;i++){const a=P[i],b=P[(i+1)%m];if(a[1]===b[1])continue;
      const lo=Math.min(a[1],b[1]),hi=Math.max(a[1],b[1]);
      let r0=Math.ceil(lo/step-0.5);if(r0<0)r0=0;
      for(let r=r0;r<N;r++){const yc=(r+.5)*step;if(yc>=hi)break;if(yc<lo)continue;
        rows[r].push([a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]),b[1]>a[1]?1:-1]);}}}
  const L=new Float32Array(N).fill(NaN),R=new Float32Array(N).fill(NaN),ink=new Float32Array(N),runs=new Array(N);
  let xmin=1e9,xmax=-1e9;
  for(let r=0;r<N;r++){const xs=rows[r].sort((p,q)=>p[0]-q[0]),rr=[];let wn=0,st=0;
    for(const [x,d] of xs){const was=wn;wn+=d;if(was===0&&wn!==0)st=x;else if(was!==0&&wn===0)rr.push([st,x]);}
    runs[r]=rr;if(rr.length){L[r]=rr[0][0];R[r]=rr[rr.length-1][1];let s=0;for(const q of rr)s+=q[1]-q[0];ink[r]=s;
      if(L[r]<xmin)xmin=L[r];if(R[r]>xmax)xmax=R[r];}}
  return {L,R,ink,runs,xmin,xmax,step};
}
/* P: профиль + показатели знака; cap/xh — высоты стиля (общая сетка строк у всех знаков) */
function prof(g,cap,xh){
  const k=cap+'|'+xh;let e=PC.get(g);if(e&&e.k===k)return e.P;
  const P=scanGlyph(g,cap,xh);P.g=g;P.adv=g.adv;
  const nX=Math.max(6,Math.round(xh/cap*N));P.nX=nX;
  const cl=g._hc;/* класс знака задаётся снаружи (по символу), здесь только цифры */
  const bandOf=n=>{let a=0;for(let r=0;r<n;r++)a+=P.ink[r];return a*P.step;};
  P.areaX=bandOf(nX);P.areaC=bandOf(N);
  /* толщина штриха: медиана ширин почти вертикальных прогонов краски в средних 60 % полосы (края прогона мало уходят по соседним строкам);
     диагонали и перекладины не считаются, их ширина по горизонтали больше толщины */
  const widths=[];
  {const a0=Math.floor(nX*.2),b0=Math.ceil(nX*.8);
   for(let r=Math.max(1,a0);r<Math.min(N-1,b0);r++)for(const q of P.runs[r]){const w=q[1]-q[0];if(w>0.5*nX*P.step)continue;
     const m=ch2=>{for(const z of P.runs[ch2])if(Math.abs((z[0]+z[1])/2-(q[0]+q[1])/2)<=Math.max(w,z[1]-z[0]))return z;return null;};
     const u=m(r-1),d=m(r+1);if(!u||!d)continue;const k1=.4*2*P.step,k2=1.0*2*P.step,dl=Math.abs(u[0]-d[0]),dr=Math.abs(u[1]-d[1]);
     if(Math.min(dl,dr)<=k1&&Math.max(dl,dr)<=k2)widths.push(w);}}
  P.sw=widths.length>=3?med(widths):NaN;/* без вертикальных стенок (диагонали, овалы) толщина не берётся: только плотность */
  /* вертикальные штрихи: прогон есть в трёх строках 0.3 / 0.5 / 0.7 от x-height с одним центром */
  P.stems=[];
  const rr=[.3,.5,.7].map(f=>Math.min(nX-1,Math.floor(f*nX)));
  for(const q of P.runs[rr[1]]){const w=q[1]-q[0],c=(q[0]+q[1])/2;if(w>0.6*xh||w<0.04*xh)continue;
    let ok=true;for(const k2 of [rr[0],rr[2]]){let hit=false;for(const z of P.runs[k2]){const c2=(z[0]+z[1])/2,w2=z[1]-z[0];if(Math.abs(c2-c)<=0.5*Math.max(w,w2)&&w2<0.66*xh){hit=true;break;}}if(!hit){ok=false;break;}}
    if(ok)P.stems.push({x0:q[0],x1:q[1],c});}
  PC.set(g,{k,P});return P;
}
/* ---------------- опора шрифта (контрольные знаки) ---------------- */
function metricsOf(key,get){
  const p=(S.styles[key]&&S.styles[key].p)||{};let cap=0,xh=0;
  for(const ch of ['H','Н','E','Е']){const g=get(ch);if(g&&g.cs.length){cap=ymaxOf(g);break;}}
  for(const ch of ['x','х','z','v','н','n']){const g=get(ch);if(g&&g.cs.length){xh=ymaxOf(g);break;}}
  if(!(cap>100))cap=p.capH||700;if(!(xh>60))xh=p.xh||cap*.7;
  return {cap,xh:Math.min(xh,cap*.98)};
}
function flatGap(A,B,nb_){let s=0,n=0;for(let r=0;r<nb_;r++){const ra=A.R[r],lb=B.L[r];if(ra!==ra||lb!==lb)continue;s+=A.adv-ra+lb;n++;}return n?s/n:NaN;}
function areaGap(A,B,dx,nb_,D){let s=0,mn=1e9;
  for(let r=0;r<nb_;r++){const ra=A.R[r],lb=B.L[r];if(ra!==ra||lb!==lb){s+=D;continue;}const g=dx+lb-ra;s+=g<D?g:D;if(g<mn)mn=g;}
  return {a:s/nb_,min:mn};}
const CTRL={
  low:'nohecsuagdpbqkvxyaonпнитсеуазрдкшх',
  up:'HOEBNMSTUAKPДНОПЕКСТИ',
  dig:'0123456789'};
const PAIRS_LOW=['nn','no','on','oo','нн','но','он','оо','пп','пн','ео','ое'],PAIRS_UP=['HH','HO','OH','OO','НН','НО','ОН','ОО','HE','EH','НЕ','ЕН'];
function reference(key,get){
  const m=metricsOf(key,get),cap=m.cap,xh=m.xh;
  const P=ch=>{const g=get(ch);return g&&g.cs&&g.cs.length?prof(g,cap,xh):null;};
  const nX=Math.max(6,Math.round(xh/cap*N));
  const ref={key,cap,xh,nX,step:cap/N,t:{},D:{},flat:{},tone:{}};
  for(const [c,set] of [['l',CTRL.low],['u',CTRL.up],['d',CTRL.dig]]){
    const sw=[],ds=[];
    for(const ch of new Set(Array.from(set))){const p=P(ch);if(!p||!(p.adv>0))continue;
      const band=c==='l'?xh:cap,area=c==='l'?p.areaX:p.areaC;
      if(p.sw>0)sw.push(p.sw);ds.push(area/(p.adv*band));}
    ref.tone[c]={sw:med(sw),dens:med(ds),n:ds.length};
  }
  const swAll=ref.tone.l.sw>0?ref.tone.l.sw:(ref.tone.u.sw>0?ref.tone.u.sw:cap*.12);
  const bands=[['xh',nX,PAIRS_LOW,['nn','нн','hh','пп']],['cap',N,PAIRS_UP,['HH','НН','EE','ЕЕ']]];
  for(const [b,n,pairs,fl] of bands){
    let flat=NaN;for(const q of fl){const A=P(q[0]),B=P(q[1]);if(A&&B){flat=flatGap(A,B,n);if(flat===flat)break;}}
    /* глубина белого ограничена: 1.6 прямого апроша (глубже открытые стороны т г у считались бы целиком) */
    const D=flat===flat&&flat>0?1.6*flat:(b==='xh'?xh:cap)*.3;
    const ar=[];for(const q of pairs){const A=P(q[0]),B=P(q[1]);if(A&&B)ar.push(areaGap(A,B,A.adv,n,D).a);}
    ref.flat[b]=flat;ref.D[b]=D;ref.t[b]=ar.length?med(ar):NaN;
  }
  /* типичная ширина штрихового интервала (для ритма) */
  return ref;
}
const toneOf=(ref,ch,p)=>{
  const c=cls(ch);if(c==='p')return null;const R=ref.tone[c];if(!R||!R.n)return null;
  const band=c==='l'?ref.xh:ref.cap,area=c==='l'?p.areaX:p.areaC;if(!(p.adv>0)||!(area>0))return null;
  const dens=area/(p.adv*band),dD=Math.max(-.6,Math.min(.6,dens/R.dens-1));
  if(!(R.sw>0&&p.sw>0))return {dev:.4*dD,dS:NaN,dD};
  const dS=Math.max(-.6,Math.min(.6,p.sw/R.sw-1));
  /* без вертикальных штрихов (s, з: тонкая спинка) тонкая толщина ненадёжна: вес вдвое меньше (толще нормы считается полностью) */
  return {dev:(p.stems&&p.stems.length||dS>0?.8:.5)*dS+.2*dD,dS,dD};
};
/* ---------------- оценки ---------------- */
const sevPair=d=>d<0?clamp01((-d-.25)/.40):clamp01((d-.40)/.50);
const sevTone=d=>clamp01((Math.abs(d)-.20)/.30);
/* слипание: пробел меньше 2 апрошей или уже 0.17 em; разваливание: шире 0.45 em (и вдвое шире ожидаемого по апрошу) */
const sevWord=(r,e)=>Math.max(r<2.0?clamp01((2.0-r)/.8)*clamp01((.30-e)/.07):0,e<.17?clamp01((.17-e)/.07):0,e>.45?clamp01((e-.45)/.15):0,(r>5&&e>.38)?clamp01((r-5)/3):0);
const sevRhy=d=>clamp01((Math.abs(d)-.35)/.45);
/* ---------------- анализ строк ----------------
   lines: [{chars:[{ch,gn,x}], ox, base, key}] — x, ox, base в px холста; sc — px на единицу шрифта (кегль/1000). */
HM.analyze=function(lines,sc,opt){
  opt=opt||{};const t0=performance.now();
  const items=[],refs={},gcache={};
  for(let li=0;li<lines.length;li++){
    const ln=lines[li],key=ln.key;let get=gcache[key];
    if(!get){const m=new Map();gcache[key]=get=ch=>{let v=m.get(ch);if(v===undefined){v=glyphOf(ch,key);m.set(ch,v);}return v;};}
    const ref=refs[key]||(refs[key]=reference(key,get));
    const sp=get(' '),spAdv=sp&&sp.adv>0?sp.adv:250,cs=ln.chars;
    ln.ref=ref;
    const info=[];
    for(const c of cs){const g=get(c.gn||c.ch);info.push(g&&g.cs&&g.cs.length?{c,g,P:prof(g,ref.cap,ref.xh),xu:(c.x)/sc}:{c,g,P:null,xu:c.x/sc});}
    const yTop=cap=>ln.base-cap*sc;
    const pairsLine=[],wordsLine=[];
    for(let i=0;i<info.length;i++){
      const B=info[i];
      /* пятно */
      if(B.P&&opt.tone!==false){const tn=toneOf(ref,B.c.ch,B.P);
        if(tn){const cl=cls(B.c.ch),band=cl==='l'?ref.xh:ref.cap;
          items.push({t:'tone',ln:li,i,ch:B.c.ch,gn:B.c.gn||B.c.ch,key,dev:tn.dev,sev:sevTone(tn.dev),
            x0:ln.ox+B.xu*sc,x1:ln.ox+(B.xu+B.g.adv)*sc,y0:yTop(band),y1:ln.base});}}
      if(!i)continue;const A=info[i-1];if(!A.P||!B.P)continue;
      const dx=B.xu-A.xu,free=dx-A.g.adv;
      /* межсловный промежуток: между знаками был пробел */
      if(free>.45*spAdv){
        const nbX=ref.nX;let rmax=-1e9,lmin=1e9;
        for(let r=0;r<nbX;r++){if(A.P.R[r]===A.P.R[r]&&A.P.R[r]>rmax)rmax=A.P.R[r];if(B.P.L[r]===B.P.L[r]&&B.P.L[r]<lmin)lmin=B.P.L[r];}
        if(rmax>-1e8&&lmin<1e8){const wu=dx+lmin-rmax;
          wordsLine.push({i,wu,x0:ln.ox+(A.xu+rmax)*sc,x1:ln.ox+(B.xu+lmin)*sc});}
        continue;}
      if(typeof kernBlocked==='function'&&kernBlocked(A.c.ch,B.c.ch))continue;
      const ca=cls(A.c.ch),cb=cls(B.c.ch);
      const band=(ca==='u'||ca==='d')&&(cb==='u'||cb==='d')?'cap':'xh',n=band==='cap'?N:ref.nX,D=ref.D[band];
      const m=areaGap(A.P,B.P,dx,n,D);
      pairsLine.push({i,A,B,band,n,D,m,dx,ca,cb});
    }
    /* пары: отклонение от медианы контрольных пар */
    const tTxt=med(pairsLine.map(p=>p.m.a));
    for(const p of pairsLine){
      let t=ref.t[p.band];if(!(t>0))t=tTxt;if(!(t>0))continue;
      const flat=ref.flat[p.band]>0?ref.flat[p.band]:t;
      /* дыра: белое по площади (глубина ограничена) или самое близкое место: если даже оно дальше 1.2 апроша, пара точно рыхлая */
      let dev=p.m.a/t-1;if(p.m.min<1e8&&p.m.min>1.2*flat)dev=Math.max(dev,.9*(p.m.min/flat-1));
      let sev=sevPair(dev),touch=false;
      if(p.m.min<1e8&&p.m.min<=Math.max(2,.12*flat)){touch=true;sev=Math.max(sev,.78);}
      /* пунктуация: дыра рядом со знаком препинания — норма, ловим только слипание */
      if((p.ca==='p'||p.cb==='p')&&dev>0)sev=0;
      const bandH=(p.band==='cap'?ref.cap:ref.xh);
      const gx0=p.A.xu+p.A.P.xmax,gx1=p.B.xu+p.B.P.xmin;
      items.push({t:'pair',ln:li,i:p.i,a:p.A.c.ch,b:p.B.c.ch,gnA:p.A.c.gn||p.A.c.ch,gnB:p.B.c.gn||p.B.c.ch,key,dev,sev,touch,band:p.band,
        gap:p.m.a,tgt:t,site:{dx:p.dx,n:p.n,D:p.D,PA:p.A.P,PB:p.B.P,t},
        x0:ln.ox+Math.min(gx0,gx1)*sc-.16*1000*sc,x1:ln.ox+Math.max(gx0,gx1)*sc+.16*1000*sc,y0:yTop(bandH),y1:ln.base});
    }
    /* слова: пробел против апроша */
    const Lt=tTxt>0?tTxt:ref.t.xh;
    for(const w of wordsLine){if(!(Lt>0))continue;const r=w.wu/Lt;
      items.push({t:'word',ln:li,i:w.i,key,ratio:r,wu:w.wu,em:w.wu/1000,dev:r/3-1,sev:sevWord(r,w.wu/1000),x0:w.x0-.06*1000*sc,x1:w.x1+.06*1000*sc,y0:yTop(ref.xh),y1:ln.base});}
    /* ритм: белое между последним штрихом левого знака и первым штрихом правого (оба штриха у края знака), против медианы соседних */
    const iv=[];
    for(let i=1;i<info.length;i++){const A=info[i-1],B=info[i];if(!A.P||!B.P||!A.P.stems.length||!B.P.stems.length)continue;
      if(B.xu-A.xu-A.g.adv>.45*spAdv)continue;
      const sa=A.P.stems[A.P.stems.length-1],sb=B.P.stems[0],tol=Math.max(10,.3*(sa.x1-sa.x0));
      let rb=-1e9,lb=1e9;for(let r=0;r<ref.nX;r++){if(A.P.R[r]===A.P.R[r]&&A.P.R[r]>rb)rb=A.P.R[r];if(B.P.L[r]===B.P.L[r]&&B.P.L[r]<lb)lb=B.P.L[r];}
      if(rb-sa.x1>tol||sb.x0-lb>tol)continue;
      const w=B.xu+sb.x0-(A.xu+sa.x1);if(!(w>0&&w<600))continue;
      iv.push({w,i,a:A.c.ch,b:B.c.ch,x0:ln.ox+(A.xu+sa.x1)*sc,x1:ln.ox+(B.xu+sb.x0)*sc});}
    for(let k=0;k<iv.length;k++){const nbrs=[];for(let j=Math.max(0,k-4);j<=Math.min(iv.length-1,k+4);j++)if(j!==k)nbrs.push(iv[j].w);
      if(nbrs.length<3)continue;const md=med(nbrs);if(!(md>0))continue;const dev=iv[k].w/md-1,sev=Math.abs(iv[k].w-md)>=70?sevRhy(dev):0;
      if(sev<=0)continue;const z=iv[k];
      items.push({t:'rhy',ln:li,i:z.i,a:z.a,b:z.b,same:false,key,dev,sev,w:z.w,x0:z.x0,x1:z.x1,y0:yTop(ref.xh),y1:ln.base});}
  }
  const res=HM.summarize(items,lines,refs);res.ms=performance.now()-t0;return res;
};
/* группировка, «стороны знака», оценка, текст отчёта */
HM.summarize=function(allItems,lines,refs){
  const K=intentKinds();let anyI=false;
  for(const it of allItems){it.intended=!!(K&&K.has(it.t));if(it.intended)anyI=true;
    it.dir=it.t==='pair'?(it.dev>0&&!it.touch?'cool':'warm'):it.t==='tone'?(it.dev<0?'cool':'warm'):it.dev>0?'cool':'warm';}
  const items=allItems.filter(i=>!i.intended);
  const F=new Map();
  const add=(k,f,it)=>{let g=F.get(k);if(!g){g=Object.assign({k,items:[],sev:0,devs:[]},f);F.set(k,g);}g.items.push(it);g.devs.push(it.dev);if(it.sev>g.sev)g.sev=it.sev;it.f=g;return g;};
  const pairs=items.filter(i=>i.t==='pair');
  for(const it of pairs)add('p:'+it.key+it.a+'\u0001'+it.b,{t:'pair',a:it.a,b:it.b,key:it.key},it);
  /* сторона знака: у знака с одной стороны отклонение у нескольких разных соседей в одну сторону */
  const side=new Map();
  for(const g of F.values()){if(g.t!=='pair')continue;const dev=med(g.devs);
    for(const [ch,sd,o] of [[g.a,'r',g.b],[g.b,'l',g.a]]){const k=g.key+'|'+ch+'|'+sd;let s=side.get(k);if(!s)side.set(k,s={ch,sd,key:g.key,gs:[]});s.gs.push({g,dev,o});}}
  const sides=[];
  for(const s of side.values()){
    const bad=s.gs.filter(q=>Math.abs(q.dev)>=.2&&q.g.sev>0);
    if(s.gs.length<2||bad.length<2)continue;
    const sg=Math.sign(bad[0].dev);if(!bad.every(q=>Math.sign(q.dev)===sg))continue;
    if(bad.length<.6*s.gs.length)continue;
    const dev=med(bad.map(q=>q.dev));
    const its=[];for(const q of bad)its.push(...q.g.items);
    sides.push({t:'side',ch:s.ch,sd:s.sd,key:s.key,gs:bad.map(q=>q.g),n:bad.length,dev,sev:Math.max(...bad.map(q=>q.g.sev)),items:its,k:'s:'+s.key+s.ch+s.sd});
    for(const q of bad)q.g.inSide=true;
  }
  /* знак с двумя сторонами в списке: оставляем сильнейшую для каждой пары */
  const seen=new Set(),sidesU=[];
  sides.sort((a,b)=>b.sev*b.n-a.sev*a.n);
  for(const s of sides){const ks=s.gs.map(g=>g.k);if(ks.every(k=>seen.has(k))){continue;}ks.forEach(k=>seen.add(k));sidesU.push(s);}
  for(const g of F.values())if(g.inSide&&!sidesU.some(s=>s.gs.includes(g)))g.inSide=false;
  const finds=[];
  for(const g of F.values()){if(g.t==='pair'&&!g.inSide&&g.sev>=.25)finds.push(Object.assign(g,{rank:g.sev*(1+.12*Math.min(g.items.length,4))}));}
  for(const s of sidesU){finds.push(Object.assign(s,{rank:s.sev*(1.15+.12*Math.min(s.n,4))}));}
  /* пятно: один знак — одна запись */
  const tones=new Map();
  for(const it of items)if(it.t==='tone'){let g=tones.get(it.key+it.ch);if(!g)tones.set(it.key+it.ch,g={t:'tone',ch:it.ch,gn:it.gn,key:it.key,items:[],devs:[],sev:0,k:'t:'+it.key+it.ch});g.items.push(it);g.devs.push(it.dev);it.f=g;if(it.sev>g.sev)g.sev=it.sev;}
  for(const g of tones.values())if(g.sev>=.25){g.dev=med(g.devs);finds.push(Object.assign(g,{rank:g.sev*.95}));}
  const words=items.filter(i=>i.t==='word');
  if(words.length){const r=med(words.map(w=>w.ratio)),sv=sevWord(r,med(words.map(w=>w.em)));
    const g={t:'word',items:words,ratio:r,em:med(words.map(w=>w.em)),sev:sv,k:'w'};words.forEach(w=>w.f=g);
    if(sv>=.25)finds.push(Object.assign(g,{rank:sv*.9,dev:r/3-1}));}
  const rh=items.filter(i=>i.t==='rhy'),rg=new Map();
  for(const it of rh){const k='r:'+it.key+it.a+it.b+(it.same?'1':'0');let g=rg.get(k);if(!g)rg.set(k,g={t:'rhy',a:it.a,b:it.b,same:it.same,key:it.key,items:[],devs:[],sev:0,k});g.items.push(it);g.devs.push(it.dev);it.f=g;if(it.sev>g.sev)g.sev=it.sev;}
  for(const g of rg.values())if(g.sev>=.4){g.dev=med(g.devs);finds.push(Object.assign(g,{rank:g.sev*.55}));}
  finds.sort((a,b)=>b.rank-a.rank);
  /* общие числа */
  const pu=items.filter(i=>i.t==='pair'),tu=items.filter(i=>i.t==='tone'),ru=items.filter(i=>i.t==='rhy');
  const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const mP=mean(pu.map(i=>i.sev)),mT=mean(tu.map(i=>i.sev)),mW=mean(words.map(i=>i.sev));
  /* ритм считается по всем промежуткам, не только по отклонившимся: для среднего нужны и нули */
  const top=finds.slice(0,5);
  const noted=anyI?allItems.filter(i=>i.intended&&i.sev>=.5).length:0;
  let pen=42*mP+18*mT+10*mW+8*Math.min(1,ru.length/Math.max(6,pu.length))*mean(ru.map(i=>i.sev));
  /* каждое заметное место (до 14) стоит до 9 баллов; ритм и пробел между словами вполовину: они дублируют апрош */
  finds.slice(0,14).forEach((f,i)=>{pen+=7*Math.pow(f.sev,1.5)*(f.t==='rhy'||f.t==='word'?.5:1)*(i<8?1:.5);});
  const noScore=!!(K&&K.size>=4);
  const score=noScore?null:Math.max(0,Math.min(100,Math.round(100-pen)));
  const verdict0=noScore?'Оценка не ставится.':score>=90?(K&&K.size?'Сбоев не видно, кроме задуманных.':'Читается ровно.'):score>=78?'Ровно, но есть места, где глаз споткнётся.':score>=60?'Пятно неровное, сбои видны в тексте.':'Пятно рваное, глаз спотыкается на каждой строке.';
  const verdict=verdict0;
  const ok=pu.filter(i=>Math.abs(i.dev)<=.15).length,okT=tu.filter(i=>Math.abs(i.dev)<=.12).length;
  const strong=[];
  if(pu.length>=4){const r=ok/pu.length;strong.push({q:r,k:'gap',t:'Апроши',d:Math.round(r*100)+nb+'% в норме'});}
  if(tu.length>=4){const r=okT/tu.length;strong.push({q:r,k:'tone',t:'Пятно',d:Math.round(r*100)+nb+'% в норме'});}
  if(words.length){const r=med(words.map(w=>w.ratio)),e=med(words.map(w=>w.em));
    strong.push({q:r>=2.4&&r<=3.9?.95:r>=2.1&&r<=4.3?.6:.2,k:'word',t:'Пробел между словами',d:em2(e)+nb+'em'});}
  if(ru.length||pu.length){const all=lines.reduce((s,l)=>s+Math.max(0,l.chars.length-1),0)||1,r=1-Math.min(1,ru.filter(i=>i.sev>=.3).length/all*2.5);
    strong.push({q:r,k:'rhy',t:'Ритм штрихов',d:Math.round(r*100)+nb+'% без сбоев'});}
  const kerned=pu.filter(i=>i.dev>-.2&&i.dev<.2&&i.gap>0).length;
  const dedup=new Set();
  strong.sort((a,b)=>b.q-a.q);
  const sOut=strong.filter((s,i)=>i<2||s.q>=.78).slice(0,4);
  return {items:allItems,live:items,finds,top,noted,intended:anyI,intent:K?[...K]:[],score,verdict,strong:sOut,nPairs:pu.length,nGlyphs:tu.length,mP,mT,mW,refs,lines};
};
/* ---------------- тексты ---------------- */
const q=ch=>'«'+ch+'»'+(/^[A-Za-z]$/.test(ch)&&/[aceopxyABCEHKMOPTX]/.test(ch)?' лат.':'');/* латинские двойники кириллицы (o/о) иначе выглядят как один и тот же сбой */
const cap1=t=>t.charAt(0).toUpperCase()+t.slice(1);
const IKIND={pair:'апрош пары',tone:'плотность знака',word:'пробел между словами',rhy:'ритм штрихов'};
HM.text=function(it,f){
  if(it&&it.intended){const h=it.t==='pair'?q(it.a+it.b):it.t==='tone'?q(it.ch):it.t==='rhy'?q(it.a+(it.b||'')):'Пробел между словами';
    return {h,p:'задумано рисунком шрифта, исправлять не нужно.'};}
  f=f||it.f||it;
  if(f.t==='side'){const wide=f.dev>0;
    return {h:q(f.ch)+(f.sd==='r'?' справа':' слева'),
      p:'поле на '+pc(f.dev)+(wide?' шире':' уже')+' среднего, у '+f.n+' соседей '+(wide?'просвет.':'тесно.')};}
  if(f.t==='pair'||it.t==='pair'){const x=it.t==='pair'?it:f.items[0],pr=x.a+x.b;
    if(x.touch&&x.dev<0)return {h:pr,p:'знаки касаются.'};
    return {h:pr,p:x.dev<0?'апрош на '+pc(x.dev)+' меньше среднего, тесно.':'просвет на '+pc(x.dev)+' больше среднего.'};}
  if(f.t==='tone'){const d=med(f.devs);return {h:q(f.ch),p:'знак на '+pc(d)+(d>0?' темнее':' светлее')+' среднего, штрихи '+(d>0?'толще.':'тоньше.')};}
  if(f.t==='word'){const x=it.t==='word'?it:f.items[0],r=x.ratio;
    return {h:'Пробел между словами',p:em2(x.em)+nb+'em, '+(r<3?'слова сливаются.':'слова расходятся.')};}
  if(f.t==='rhy'){const x=it.t==='rhy'?it:f.items[0],d=x.dev;
    return {h:q(x.a+(x.same?'':x.b)),p:'интервал между штрихами на '+pc(d)+(d>0?' шире':' уже')+' соседних.'};}
  return {h:'',p:''};
};
const KIND={pair:'Пара',side:'Поле знака',tone:'Пятно',word:'Слова',rhy:'Ритм'};
/* ---------------- цвета ---------------- */
let RAMP=null,RAMP_UI=null;
const hex2=h=>{h=h.trim();if(h[0]==='#'){if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  const m=h.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2]]:[128,128,128];};
/* две шкалы: синяя (просвет, светлее) и тёплая (слипание, темнее): жёлтый, оранжевый, красный. Ровное места без цвета. */
const POS=[0,.5,1];
function readRamp(prefix){const cs=getComputedStyle(document.documentElement);const g=n=>hex2(cs.getPropertyValue(prefix+n)||'#888');return {cool:[g('0'),g('1')],warm:[g('2'),g('3'),g('4')]};}
function rampAt(R,v){v=clamp01(v);const W=R.warm;let a,b,t;if(v<.5){a=W[0];b=W[1];t=v/.5;}else{a=W[1];b=W[2];t=(v-.5)/.5;}return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function coolAt(R,v){v=clamp01(v);const a=R.cool[0],b=R.cool[1];return [a[0]+(b[0]-a[0])*v,a[1]+(b[1]-a[1])*v,a[2]+(b[2]-a[2])*v];}
const colorUI=(v,dir)=>{if(!RAMP_UI)RAMP_UI=readRamp('--heat-');const c=dir==='cool'?coolAt(RAMP_UI,v):rampAt(RAMP_UI,v);return 'rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')';};
let LUT=null;
function lut(){
  if(LUT)return LUT;if(!RAMP)RAMP=readRamp('--cv-heat-');
  LUT={cool:new Uint8ClampedArray(256*4),warm:new Uint8ClampedArray(256*4)};
  for(const d of ['cool','warm'])for(let k=0;k<256;k++){const v=k/255,c=d==='cool'?coolAt(RAMP,v):rampAt(RAMP,v),L=LUT[d];L[k*4]=c[0];L[k*4+1]=c[1];L[k*4+2]=c[2];
    L[k*4+3]=k<6?0:Math.round(255*Math.min(.7,.80*Math.pow(v,.8)+.08*v));}
  return LUT;
}
/* ---------------- рисование поверх ---------------- */
const accCv={cool:document.createElement('canvas'),warm:document.createElement('canvas')};
function paint(ov,W,H,res,layer){
  const hs=.5,w=Math.max(2,Math.ceil(W*hs)),h=Math.max(2,Math.ceil(H*hs));
  if(ov.width!==w||ov.height!==h){ov.width=w;ov.height=h;}
  const c=ov.getContext('2d');c.clearRect(0,0,w,h);
  if(!res)return;
  const A={};
  for(const d of ['cool','warm']){const cv=accCv[d];if(cv.width<w)cv.width=w;if(cv.height<h)cv.height=h;
    const a=A[d]=cv.getContext('2d',{willReadFrequently:true});a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='source-over';a.fillStyle='#000';a.fillRect(0,0,w,h);a.globalCompositeOperation='lighter';}
  const W_=LW[layer]||LW.read;
  /* фона под строкой нет: ровный текст остаётся чистым, светятся только места сбоя */
  for(const it of res.items){const wt=W_[it.t];if(!wt)continue;let v=it.sev*wt*(it.intended?.14:1);
    if(v<.06)continue;
    const a=A[it.dir||'warm'];
    const cx=(it.x0+it.x1)/2*hs,cy=(it.y0+it.y1)/2*hs;
    const em=1000*res.sc;
    let rx=Math.max((it.x1-it.x0)*.9,.62*em)*hs,ry=Math.max((it.y1-it.y0)*.85,.6*em)*hs;
    if(it.t==='tone'){rx=Math.max((it.x1-it.x0)*.95,.5*em)*hs;ry=Math.max((it.y1-it.y0)*.8,.55*em)*hs;}
    if(it.t==='word'){rx=Math.max(it.x1-it.x0,.4*em)*.8*hs;}
    if(it.t==='rhy'){rx=Math.max((it.x1-it.x0)*.9,.45*em)*hs;}
    a.save();a.translate(cx,cy);a.scale(rx,ry);
    const g=a.createRadialGradient(0,0,0,0,0,1);
    const Al=Math.min(1,Math.pow(v,.65)*1.25);
    g.addColorStop(0,'rgba(255,255,255,'+Al+')');g.addColorStop(.4,'rgba(255,255,255,'+Al*.7+')');g.addColorStop(.75,'rgba(255,255,255,'+Al*.22+')');g.addColorStop(1,'rgba(255,255,255,0)');
    a.fillStyle=g;a.fillRect(-1,-1,2,2);a.restore();}
  const L=lut(),dst=c.createImageData(w,h),dd=dst.data;
  for(const d of ['cool','warm']){const sd=A[d].getImageData(0,0,w,h).data,Ld=L[d];
    for(let i=0,n=w*h*4;i<n;i+=4){const k=sd[i];if(k<6)continue;const j=k*4,al=Ld[j+3];if(al<=dd[i+3])continue;dd[i]=Ld[j];dd[i+1]=Ld[j+1];dd[i+2]=Ld[j+2];dd[i+3]=al;}}
  c.putImageData(dst,0,0);
}
/* ---------------- вид (образец или «Проверка») ---------------- */
function mkView(o){/* o: {ov, host, hit, name} */
  const V={ov:o.ov,host:o.host,res:null,W:0,H:0,name:o.name,pin:null};
  V.paint=()=>{if(V.res&&V.W)paint(V.ov,V.W,V.H,V.res,HM.layer);else if(V.ov.width>1){V.ov.getContext('2d').clearRect(0,0,V.ov.width,V.ov.height);}};
  V.find=(x,y)=>{if(!V.res)return null;const W_=LW[HM.layer];let best=null,bs=0;
    for(const it of V.res.items){const wt=W_[it.t];if(!wt||it.sev*wt<.12)continue;
      const padX=it.t==='tone'?0:4;
      if(x<it.x0-padX||x>it.x1+padX||y<it.y0-4||y>it.y1+4)continue;
      const s=it.sev*wt-(it.t==='tone'?.05:0);if(s>bs){bs=s;best=it;}}
    return best;};
  return V;
}
/* подсказка / карточка */
let TIP=null,TIPV=null;
function tipEl(){if(TIP)return TIP;const d=document.createElement('div');d.id='heat-tip';d.className='heat-tip';d.hidden=true;d.setAttribute('role','dialog');d.setAttribute('aria-label','Тепловая карта');document.body.appendChild(d);TIP=d;
  d.addEventListener('click',e=>{const b=e.target.closest('[data-ha]');if(b)act(b.dataset.ha,TIP._f,TIP._it);});
  return d;}
function tipHide(){if(TIP){TIP.hidden=true;TIP.classList.remove('pin');}TIPV=null;}
function actionsFor(it,f){
  const a=[];
  if(f.t==='pair')a.push(['fix','Исправить кернинг'],['kern','Открыть в кернинге']);
  else if(f.t==='side')a.push(['fixs','Исправить поле'],['glyph','Открыть знак']);
  else if(f.t==='tone')a.push(['glyph','Открыть знак']);
  else if(f.t==='rhy'&&f.same)a.push(['glyph','Открыть знак']);
  if(it&&it.t==='pair'&&f.t==='side')a.push(['kern','Открыть в кернинге']);
  return a;
}
function tipShow(V,it,cx,cy,pin){
  const d=tipEl(),f=it.f||it;
  const f2=it.intended?f:(it.t==='pair'&&it.f&&it.f.inSide)?(V.res.finds.find(s=>s.t==='side'&&s.gs.includes(it.f))||f):f;
  const tx=HM.text(it,f2),acts=pin&&!it.intended?actionsFor(it,f2):[];
  d.innerHTML='<div class="ht-h"><i class="ht-dot" style="background:'+colorUI(it.sev,it.dir)+'"></i><b>'+tx.h+'</b>'+(it.intended?'<span class="ht-k">Задумано</span>':'')+'</div><p>'+cap1(tx.p)+'</p>'
    +(acts.length?'<div class="ht-a">'+acts.map(x=>'<button type="button" class="btn sm" data-ha="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>':'');
  d._f=f2;d._it=it;d.classList.toggle('pin',!!pin);d.hidden=false;TIPV=V;
  const w=d.offsetWidth,h=d.offsetHeight,vw=innerWidth,vh=innerHeight;
  let x=cx+14,y=cy+16;if(x+w>vw-8)x=Math.max(8,cx-w-14);if(x+w>vw-8)x=vw-w-8;if(y+h>vh-8)y=Math.max(8,cy-h-14);
  d.style.left=x+'px';d.style.top=y+'px';
}
/* действия */
function openGlyph(ch){try{if(S.tab!=='edit')setTab('edit');selectGlyph(ch);}catch(e){}}
function openKern(a,b,key){try{if(key&&S.styles[key]&&S.style!==key){S.style=key;try{syncPanel();}catch(e){}}kkPick(a,b);setTab('kern');}catch(e){}}
function solveDelta(sites,t){/* сдвиг δ, при котором средняя площадь белого по местам = t */
  const f=d=>{let s=0;for(const x of sites)s+=areaGap(x.PA,x.PB,x.dx+d,x.n,x.D).a;return s/sites.length-t;};
  let lo=-260,hi=260;if(f(lo)>0)return lo;if(f(hi)<0)return hi;
  for(let i=0;i<30;i++){const m=(lo+hi)/2;if(f(m)<0)lo=m;else hi=m;}return (lo+hi)/2;
}
function fixPair(f){
  const it=f.items[0],st=S.styles[f.key];if(!st)return;
  const d=Math.round(solveDelta([it.site],it.site.t));
  const get=ch=>(GL[ch]&&GL[ch].skel)?getFinal(ch,f.key,FAST):getFinal(ch,f.key);
  const info=kernInfo(f.a,f.b,st,f.key,get);if(info.blocked){toast('Между этими знаками кернинг не применяется');return;}
  const v0=Math.round(kernOf(f.a,f.b,f.key)),v1=Math.max(-info.hi,Math.min(info.hi,v0+d));
  snap();kernApply(st,f.a,f.b,v1,'exc',info);persist();schedule();
  toast('Кернинг '+f.a+f.b+': '+(v0<0?'−':'')+Math.abs(v0)+' → '+(v1<0?'−':'')+Math.abs(v1));
  HM.refresh();
}
function fixSide(f){
  const sites=[];for(const g of f.gs)for(const x of g.items.slice(0,1))sites.push(x.site);
  const t=med(sites.map(s=>s.t));
  const d=Math.round(solveDelta(sites,t));if(!d)return;
  const k=f.sd==='r'?'sbR':'sbL',e=S.edits[f.ch]||(S.edits[f.ch]={});
  const v0=e[k]||0;let v1=Math.max(-120,Math.min(120,v0+d));
  snap();if(v1)e[k]=v1;else delete e[k];
  if(!Object.keys(S.edits[f.ch]).length)delete S.edits[f.ch];
  bump();toast('Поле '+q(f.ch)+(f.sd==='r'?' справа: ':' слева: ')+(v0<0?'−':'')+Math.abs(v0)+' → '+(v1<0?'−':'')+Math.abs(v1));
  HM.refresh();
}
function act(a,f,it){
  if(!f)return;
  if(a==='fix'&&f.t==='pair')fixPair(f);
  else if(a==='fixs'&&f.t==='side')fixSide(f);
  else if(a==='glyph')openGlyph(f.ch||(it&&it.ch)||f.a);
  else if(a==='kern'){const x=it&&it.t==='pair'?it:(f.t==='pair'?f.items[0]:null);if(x)openKern(x.a,x.b,x.key);}
  tipHide();
}
/* ---------------- пара «слушатели» на холсте ---------------- */
function attach(V,target){
  let tm=0;
  const pt=e=>{const r=target.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  target.addEventListener('pointermove',e=>{
    if(!HM.on&&V.name==='spec')return;if(e.pointerType==='touch'||V.pin)return;
    if(e.buttons)return;
    const [x,y]=pt(e),it=V.find(x,y);
    if(it){tipShow(V,it,e.clientX,e.clientY,false);target.style.cursor='help';}
    else{if(TIPV===V&&!TIP.classList.contains('pin'))tipHide();target.style.cursor='';}
  });
  target.addEventListener('pointerleave',()=>{if(TIP&&!TIP.classList.contains('pin')&&TIPV===V)tipHide();target.style.cursor='';});
  target.addEventListener('pointerup',e=>{
    if(e.button!==0||(V.name==='spec'&&!HM.on))return;
    const [x,y]=pt(e),it=V.find(x,y);
    if(it){const t0=e.timeStamp;setTimeout(()=>{const p=$q('#kk-pop');if(p&&!p.hidden)p.hidden=true;},0);tipShow(V,it,e.clientX,e.clientY,true);}
    else if(TIP&&TIP.classList.contains('pin'))tipHide();
  });
}
document.addEventListener('pointerdown',e=>{if(TIP&&!TIP.hidden&&TIP.classList.contains('pin')&&!TIP.contains(e.target)&&!e.target.closest('#spec,.heat-sheet canvas'))tipHide();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TIP&&!TIP.hidden)tipHide();});
addEventListener('scroll',()=>{if(TIP&&!TIP.hidden&&!TIP.classList.contains('pin'))tipHide();},true);
/* ---------------- образец в редакторе ---------------- */
const SPEC={V:null,chip:null,bar:null,t:0,tok:0};
function specBuild(){
  if(SPEC.chip)return;const ctx=$q('#ctxb');if(!ctx)return;
  const chip=document.createElement('button');chip.type='button';chip.className='chip';chip.id='heatb';chip.setAttribute('aria-pressed','false');chip.title='Где глаз спотыкается: пятно, апрош, ритм';chip.textContent='Тепловая карта';
  ctx.after(chip);SPEC.chip=chip;
  const bar=document.createElement('div');bar.className='heatbar';bar.id='heatbar';bar.hidden=true;
  bar.innerHTML=layerSeg('heat-seg-s')+legendHTML();
  const tools=$q('.spectools');if(tools)tools.appendChild(bar);SPEC.bar=bar;
  const box=$q('#specbox'),cv=$q('#spec');
  const ov=document.createElement('canvas');ov.className='heat-ov';ov.id='heat-ov';ov.setAttribute('aria-hidden','true');box.appendChild(ov);
  const V=SPEC.V=mkView({ov,host:box,name:'spec'});attach(V,cv);
  chip.addEventListener('click',()=>HM.toggle());
  bar.addEventListener('click',layerClick);
  syncLayer();
}
function layerSeg(id){return '<div class="seg heat-seg" id="'+id+'" role="group" aria-label="Слой карты">'+LAYERS.map(l=>'<button type="button" data-hl="'+l[0]+'" aria-pressed="'+(l[0]===HM.layer)+'" title="'+LAYER_HINT[l[0]]+'">'+l[1]+'</button>').join('')+'</div>';}
function legendHTML(){return '<div class="heat-leg" role="img" aria-label="Синий: просвет или знак светлее. Тёплый: тесно или знак темнее"><span class="hl-k"><i class="hl-bar cool" aria-hidden="true"></i>просвет, светлее</span><span class="hl-k"><i class="hl-bar warm" aria-hidden="true"></i>тесно, темнее</span></div>';}
function layerClick(e){const b=e.target.closest('[data-hl]');if(!b)return;HM.setLayer(b.dataset.hl);}
function syncLayer(){document.querySelectorAll('.heat-seg [data-hl]').forEach(b=>{const on=b.dataset.hl===HM.layer;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});}
HM.setLayer=function(l){if(!LW[l])return;HM.layer=l;save();syncLayer();if(SPEC.V)SPEC.V.paint();if(PF.V)PF.V.paint();tipHide();};
HM.toggle=function(on){
  if(on===undefined)on=!HM.on;HM.on=!!on;
  specBuild();if(!SPEC.chip)return;
  SPEC.chip.classList.toggle('on',HM.on);SPEC.chip.setAttribute('aria-pressed',HM.on);SPEC.bar.hidden=!HM.on;
  document.getElementById('specbox').classList.toggle('heat-on',HM.on);
  if(HM.on){specSoon(0);}else{clearTimeout(SPEC.t);SPEC.V.res=null;SPEC.V.paint();tipHide();}
};
function specVisible(){return HM.on&&S.tab==='edit'&&!(window.TT&&TT.on)&&!(S.cmp&&S.cmp.on)&&!(window.DCU&&DCU.on)&&!document.hidden;}
function specSoon(ms){clearTimeout(SPEC.t);if(!specVisible())return;
  if(SPEC.V){SPEC.V.ov.classList.add('stale');}
  SPEC.t=setTimeout(specRun,ms==null?110:ms);}
function specRun(){
  if(!specVisible())return;
  if(S.live||(typeof drag!=='undefined'&&drag)){SPEC.t=setTimeout(specRun,160);return;}
  HM.n.spec++;const tA=performance.now();
  const cv=$q('#spec'),box=cv.parentElement,V=SPEC.V,fs=S.specFs||S.specSize,maxW=Math.max(200,box.clientWidth-40);
  const raw=String(S.text||''),ph=!raw.trim(),txt=ph?smpDefault():(raw.replace(/[ \t]+$/,'')||' ');
  const rows=['regular','italic'].filter(k=>S.styles[k]),sc=fs/1000,lines=[];let y=14;
  for(const k of rows){const L=layout(txt,k,fs,maxW);
    for(const line of L.lines){lines.push({chars:line.chars.map(c=>({ch:c.ch,gn:c.gn,x:c.x})),ox:20,base:y+fs*.86,key:k,top:y});y+=fs*1.15;}
    y+=10;}
  const tok0=++SPEC.tok;
  /* анализ отдельной задачей после раскладки: раскладка двух строк и анализ не складываются в одну долгую */
  setTimeout(()=>{if(tok0!==SPEC.tok||!specVisible())return;
  const res=HM.analyze(lines,sc);res.sc=sc;
  const r=cv.getBoundingClientRect();V.W=r.width;V.H=r.height;V.res=res;HM.last=res;HM.lastKey=null;
  V.ov.style.left=cv.offsetLeft+'px';V.ov.style.top=cv.offsetTop+'px';V.ov.style.width=r.width+'px';V.ov.style.height=r.height+'px';
  setTimeout(()=>{if(tok0!==SPEC.tok||V.res!==res)return;V.paint();V.ov.classList.remove('stale');HM.specMs=performance.now()-tA;},0);
  },0);
}
/* перехват рисования образца: карта пересчитывается после него */
const _ds=window.drawSpecimen;
if(typeof _ds==='function'){window.drawSpecimen=function(){const r=_ds.apply(this,arguments);try{if(HM.on)specSoon();}catch(e){}return r;};}
/* ---------------- «Проверка»: блок с отчётом ---------------- */
const TEXT=[
  'Съешь ещё этих мягких французских булок, да выпей чаю.',
  'Широкая электрификация южных губерний даст мощный толчок подъёму сельского хозяйства.',
  'Sphinx of black quartz, judge my vow. Pack my box with five dozen liquor jugs, 0123456789.',
  'Hamburgefonstiv Adhesion',
  'нннонно ооннооо HHOHHOO OOHOOHH',
  'Illinois милиция шиншилла immunity'].join('\n');
const PF={V:null,el:null,key:null,t:0,tok:0,cv:null,ov:null,res:null,sheet:null};
function pfBuild(){
  if(PF.el)return true;const host=$q('#view-proof'),after=$q('#cover-sum');if(!host||!after)return false;
  const html='<div class="heat-bar2"><div class="heat-row">'+layerSeg('heat-seg-p')+'<div class="seg heat-sty" id="heat-sty" role="group" aria-label="Начертание"><button type="button" data-hs="regular" aria-pressed="true">Прямое</button><button type="button" data-hs="italic" aria-pressed="false">Курсив</button></div></div>'+legendHTML()+'</div>'
    +'<div class="heat-sheet" id="heat-sheet"><canvas id="heat-txt" aria-label="Тестовый текст с тепловой картой"></canvas><canvas class="heat-ov" id="heat-pov" aria-hidden="true"></canvas></div>'
    +'<div class="heat-rep" id="heat-rep"></div>';
  const sec=paneEl('pf-heat','Тепловая карта',html,{tip:'Как шрифт читается: где глаз спотыкается',bid:'heat-b'});sec.id='heat-pf';sec.classList.add('mt');
  /* перед заголовком «Знаки» */
  const h3=[...host.querySelectorAll('h3')].find(h=>h.textContent.trim()==='Знаки');
  if(h3)h3.before(sec);else after.after(sec);
  paneInit(sec,'pf-heat',true);
  PF.el=sec;PF.cv=$q('#heat-txt',sec);PF.ov=$q('#heat-pov',sec);PF.sheet=$q('#heat-sheet',sec);
  PF.V=mkView({ov:PF.ov,host:PF.sheet,name:'pf'});attach(PF.V,PF.cv);
  sec.addEventListener('click',e=>{const b=e.target.closest('[data-hl]');if(b){layerClick(e);return;}
    const s=e.target.closest('[data-hs]');if(s){PF.key=s.dataset.hs;sec.querySelectorAll('[data-hs]').forEach(x=>{x.classList.toggle('on',x===s);x.setAttribute('aria-pressed',x===s);});pfSoon(0);return;}
    const r=e.target.closest('[data-rp]');if(r)repClick(r);});
  sec.addEventListener('pane:toggle',()=>pfSoon(0));
  syncLayer();
  const k=$q('#heat-sty',sec);if(k&&!S.styles.italic)k.hidden=true;
  return true;
}
function pfVisible(){const v=$q('#view-proof');return !!(PF.el&&v&&!v.hidden&&!PF.el.classList.contains('shut')&&!document.hidden);}
function pfSoon(ms){clearTimeout(PF.t);if(!pfVisible())return;PF.t=setTimeout(pfRun,ms==null?140:ms);}
function pfRun(){
  if(!pfVisible())return;
  HM.n.pf++;
  const key=PF.key&&S.styles[PF.key]?PF.key:S.style,cv=PF.cv,box=PF.sheet;
  const wBox=Math.max(240,box.clientWidth);if(!wBox)return;
  const fs=Math.round(Math.max(19,Math.min(30,wBox/30))),maxW=wBox-32,sc=fs/1000;
  ensureKernSafe();
  const L=layout(TEXT,key,fs,maxW);
  const lines=[];let y=16;
  for(const line of L.lines){if(!line.chars.length){y+=fs*.7;continue;}lines.push({chars:line.chars.map(c=>({ch:c.ch,gn:c.gn,x:c.x})),ox:16,base:y+fs*.9,key});y+=fs*1.5;}
  const H=Math.ceil(y+8);
  /* текст */
  const d=Math.min(devicePixelRatio||1,2);cv.style.height=H+'px';cv.style.width='100%';
  const w=Math.round(wBox*d),h=Math.round(H*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,wBox,H);
  const fg=css('--glyph');c.fillStyle=fg;
  for(const ln of lines)for(const ch of ln.chars){const g=glyphOf(ch.gn||ch.ch,key);if(!g||!g.cs.length)continue;c.fill(pathOf(g.cs,(x,yy)=>[ln.ox+ch.x+x*sc,ln.base-yy*sc]),'nonzero');}
  const res=HM.analyze(lines,sc);res.sc=sc;res.fs=fs;PF.res=res;HM.lastPf=res;
  const V=PF.V;V.res=res;V.W=wBox;V.H=H;PF.ov.style.width=wBox+'px';PF.ov.style.height=H+'px';
  const tok=++PF.tok;setTimeout(()=>{if(tok!==PF.tok||V.res!==res)return;V.paint();setTimeout(()=>{if(tok===PF.tok)repRender(res);},0);},0);
}
function ensureKernSafe(){try{if(!S.kd)ensureKern();}catch(e){}}
function intentNote(res){const n={pair:'апрош пар',tone:'плотность',word:'пробелы между словами',rhy:'ритм штрихов'},l=res.intent.map(k=>n[k]),all=res.intent.length>=4;
  return all?'У шрифта нет привычной нормы.':'Не считаются: '+l.join(', ')+'.';}
function repRender(res){
  const el=$q('#heat-rep',PF.el);if(!el)return;
  const sc=res.score;
  const strong=res.strong.map(s=>'<li class="hr-ok"><span>'+s.t+'</span><b>'+s.d+'</b></li>').join('');
  const weak=res.top.length?res.top.map((f,i)=>{const tx=HM.text(f.items[0],f),acts=actionsFor(f.items[0],f).filter(a=>a[0]==='fix'||a[0]==='fixs'||a[0]==='glyph');
    const ex=acts.find(a=>a[0]==='fix'||a[0]==='fixs'),gl=acts.find(a=>a[0]==='glyph');
    const cap=cap1(tx.p);
    return '<li class="hr-bad" data-i="'+i+'"><i class="ht-dot" style="background:'+colorUI(f.sev,f.items[0].dir)+'"></i><div class="hr-t"><b>'+tx.h+'</b>'+(f.items.length>1&&f.t==='pair'?'<span class="ht-k">×'+f.items.length+'</span>':'')+'<p>'+cap+'</p></div>'
      +'<div class="hr-a"><button type="button" class="btn sm" data-rp="show" data-i="'+i+'">Показать</button>'+(ex?'<button type="button" class="btn sm" data-rp="'+ex[0]+'" data-i="'+i+'">Исправить</button>':gl?'<button type="button" class="btn sm" data-rp="glyph" data-i="'+i+'">Открыть знак</button>':'')+'</div></li>';}).join('')
    :'<li class="hr-none">Явных сбоев нет.</li>';
  el.innerHTML='<div class="hr-score"><div class="hr-n"><b>'+(sc==null?'—':sc)+'</b>'+(sc==null?'':'<span>из 100</span>')+'</div><div class="hr-v"><h4>Ровность чтения</h4><p>'+res.verdict+'</p></div></div>'
    +(res.intended?'<p class="hr-intent"><b>Неровность задумана рисунком.</b> '+intentNote(res)+'</p>':'')
    +'<div class="hr-cols"><section><h4>В порядке</h4><ul class="hr-list">'+strong+'</ul></section><section><h4>Сбои</h4><ul class="hr-list">'+weak+'</ul></section></div>';
}
function repClick(b){
  const res=PF.res;if(!res)return;const f=res.top[+b.dataset.i];if(!f)return;const a=b.dataset.rp;
  if(a==='show')return showSpot(PF.V,f);
  act(a,f,f.items[0]);
}
function showSpot(V,f){
  const it=f.items.slice().sort((a,b)=>b.sev-a.sev)[0];if(!it)return;
  if(!LW[HM.layer][it.t]){HM.setLayer('read');}
  const host=V.host,el=document.createElement('i');el.className='heat-ring';
  const cx=(it.x0+it.x1)/2,w=Math.max(it.x1-it.x0,40),h=Math.max(it.y1-it.y0,30);
  el.style.left=(V.ov.offsetLeft+cx-w/2)+'px';el.style.top=(V.ov.offsetTop+it.y0-2)+'px';el.style.width=w+'px';el.style.height=(h+4)+'px';
  host.querySelectorAll('.heat-ring').forEach(x=>x.remove());host.appendChild(el);
  try{el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});}catch(e){}
  setTimeout(()=>el.remove(),2600);
}
/* перехват «Проверки» */
const _rp=window.renderProof;
if(typeof _rp==='function'){window.renderProof=function(){const r=_rp.apply(this,arguments);try{if(pfBuild())pfSoon();}catch(e){}return r;};}
/* тема: перекрасить без пересчёта */
new MutationObserver(()=>{RAMP=null;RAMP_UI=null;LUT=null;
  if(SPEC.V&&HM.on)SPEC.V.paint();
  if(PF.V&&pfVisible()){PF.V.paint();pfSoon(0);}
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
addEventListener('resize',()=>{if(HM.on)specSoon(160);if(PF.el)pfSoon(200);});
/* кнопка: чип добавляется сразу (редактор уже в DOM) */
function init(){specBuild();pfBuild();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
HM.refresh=function(){if(HM.on)specSoon(0);if(PF.el)pfSoon(0);};
HM.ref=reference;HM.prof=prof;HM.TEXT=TEXT;HM.areaGap=areaGap;
/* для тестов: анализ произвольного текста стилем key без интерфейса */
HM.run=function(txt,key,fs,maxW){
  fs=fs||60;maxW=maxW||4000;const L=layout(txt,key||S.style,fs,maxW),lines=[];let y=10;
  for(const line of L.lines){lines.push({chars:line.chars.map(c=>({ch:c.ch,gn:c.gn,x:c.x})),ox:20,base:y+fs*.86,key:key||S.style});y+=fs*1.15;}
  const res=HM.analyze(lines,fs/1000);res.sc=fs/1000;return res;};
window.HEAT=HM;
})();
