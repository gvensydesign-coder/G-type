/* ===== VOLT: сверка, кернинг, файлы, запуск ===== */
/* ---------- растр для проверок ---------- */
const RX0=-250,RY1=1000,RW=520,RH=325,RK=0.25;
let _rc=null;
function rast(cs){
  if(!_rc){_rc=document.createElement('canvas');_rc.width=RW;_rc.height=RH;_rc.ctx=_rc.getContext('2d',{willReadFrequently:true});}
  const c=_rc.ctx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,RW,RH);c.fillStyle='#000';
  /* считываем только рамку знака (узлы и ручки + запас на сглаживание): остальное заведомо пусто */
  let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;
  for(const k of cs)for(const n of k.nodes){let x=n.x,y=n.y;
    if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;
    for(const h of [n.a,n.b])if(h){if(h.x<bx0)bx0=h.x;if(h.x>bx1)bx1=h.x;if(h.y<by0)by0=h.y;if(h.y>by1)by1=h.y;}}
  const m=new Uint8Array(RW*RH);
  if(bx0>bx1||!(isFinite(bx0+bx1+by0+by1)))return bx0>bx1?m:rastFull(cs,m);
  const X0=Math.max(0,Math.floor((bx0-RX0)*RK)-2),X1=Math.min(RW,Math.ceil((bx1-RX0)*RK)+3),
        Y0=Math.max(0,Math.floor((RY1-by1)*RK)-2),Y1=Math.min(RH,Math.ceil((RY1-by0)*RK)+3);
  if(X1<=X0||Y1<=Y0)return m;
  c.fill(pathOf(cs,(x,y)=>[(x-RX0)*RK,(RY1-y)*RK]),'nonzero');
  const w=X1-X0,d=c.getImageData(X0,Y0,w,Y1-Y0).data;
  for(let j=Y0;j<Y1;j++){let o=(j-Y0)*w*4+3,q=j*RW+X0;for(let i=0;i<w;i++,o+=4,q++)if(d[o]>127)m[q]=1;}
  return m;
}
function rastFull(cs,m){const c=_rc.ctx;c.fill(pathOf(cs,(x,y)=>[(x-RX0)*RK,(RY1-y)*RK]),'nonzero');
  const d=c.getImageData(0,0,RW,RH).data;for(let i=0;i<m.length;i++)m[i]=d[i*4+3]>127?1:0;return m;}
function maskInfo(m){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,n=0;
  const f=m.indexOf(1);if(f<0)return null;
  const ja=(f/RW)|0,jb=(m.lastIndexOf(1)/RW)|0;
  for(let j=ja;j<=jb;j++){const o=j*RW;for(let i=0;i<RW;i++)if(m[o+i]){n++;if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j;}}
  if(!n)return null;
  return {xmin:RX0+x0/RK,xmax:RX0+(x1+1)/RK,ymax:RY1-y0/RK,ymin:RY1-(y1+1)/RK,area:n};
}
function comps(m){
  const lab=new Uint8Array(m.length);let n=0;const st=[];
  for(let s=m.indexOf(1);s>=0;s=m.indexOf(1,s+1)){
    if(lab[s])continue;
    let size=0;st.length=0;st.push(s);lab[s]=1;
    while(st.length){const q=st.pop();size++;const x=q%RW,y=(q/RW)|0;
      if(x>0&&m[q-1]&&!lab[q-1]){lab[q-1]=1;st.push(q-1);}
      if(x<RW-1&&m[q+1]&&!lab[q+1]){lab[q+1]=1;st.push(q+1);}
      if(y>0&&m[q-RW]&&!lab[q-RW]){lab[q-RW]=1;st.push(q-RW);}
      if(y<RH-1&&m[q+RW]&&!lab[q+RW]){lab[q+RW]=1;st.push(q+RW);}}
    if(size>=8)n++;
  }
  return n;
}
function iou(a,b){let i=0,u=0;for(let k=0;k<a.length;k++){const x=a[k],y=b[k];if(x&&y)i++;if(x||y)u++;}return u?i/u:1;}
function mirrorMask(m,axisUnits){ // зеркало относительно вертикали x=axisUnits
  const o=new Uint8Array(m.length),ax=(axisUnits-RX0)*RK;
  for(let j=0;j<RH;j++)for(let i=0;i<RW;i++){const k=Math.round(2*ax-i-1);if(k>=0&&k<RW&&m[j*RW+k])o[j*RW+i]=1;}
  return o;
}
const upright=(ch,st,edits,withEdits)=>finalGlyph(ch,{p:{...st.p,slant:0},lat:st.lat,hg:st.hg},withEdits?edits:{});
/* вертикальный знак для сверки: у начертания без наклона это тот же знак, что уже лежит в кеше образца */
function uprightC(ch,st,withEdits){
  if(st.p.slant===0&&!S.live&&st===S.styles[S.style]&&(withEdits||!edGet(S.edits,ch))){const g=getFinal(ch,S.style);if(g)return g;}
  return upright(ch,st,S.edits,withEdits);}
function designComps(){
  if(DESIGN)return DESIGN;DESIGN={};
  const st={p:{...DEFAULTS.regular,slant:0},lat:newLattice(),hg:[]};
  for(const ch of CHARSET){if(isSpaceCh(ch)||isTyTilde(ch))continue;const g=finalGlyph(ch,st,{});DESIGN[ch]=comps(rast(g.cs));}
  return DESIGN;
}
const STEMSET=new Set('HILEFTПШЩЦНЕГЬЫЪБДhilnпшщцньыъгтb'.split(''));
const BASESET=new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя0123456789'.split(''));
const BARSET=new Set('EFHTZНЕГТПЗЭ'.split(''));
/* размеры просветов (замкнутые белые области внутри рамки знака), в пикселях */
function counterSizes(m,bi){const x0=Math.max(0,Math.floor((bi.xmin-RX0)*RK)-1),x1=Math.min(RW-1,Math.ceil((bi.xmax-RX0)*RK)+1),
  y0=Math.max(0,Math.floor((RY1-bi.ymax)*RK)-1),y1=Math.min(RH-1,Math.ceil((RY1-bi.ymin)*RK)+1);
  const seen=new Uint8Array(RW*RH),out=[];
  for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){const k=j*RW+i;if(m[k]||seen[k])continue;let st=[k],n=0,edge=false;seen[k]=1;
    while(st.length){const q=st.pop();n++;const x=q%RW,y=(q/RW)|0;if(x<=x0||x>=x1||y<=y0||y>=y1)edge=true;
      if(x<x1){const z=q+1;if(!m[z]&&!seen[z]){seen[z]=1;st.push(z);}}
      if(x>x0){const z=q-1;if(!m[z]&&!seen[z]){seen[z]=1;st.push(z);}}
      if(y<y1){const z=q+RW;if(!m[z]&&!seen[z]){seen[z]=1;st.push(z);}}
      if(y>y0){const z=q-RW;if(!m[z]&&!seen[z]){seen[z]=1;st.push(z);}}}
    if(!edge)out.push(n);}
  return out;}
const SYM=new Set('AHIMOTUVWXYoxvwuilЖАНОПТХШФжнопхтфш08'.split(''));
/* ---------- сверка ---------- */
const PF={ver:-1,style:'',res:null};
function computeProof(){
  if(PF.ver===ver&&PF.style===S.style&&PF.res)return PF.res;
  const st=cur(),des=designComps(),res=new Map();
  for(const ch of CHARSET){
    if(isSpaceCh(ch)||isTyTilde(ch))continue;
    res.set(ch,proofChar(ch,st,des));
  }
  PF.ver=ver;PF.style=S.style;PF.res=res;return res;
}
/* Абсолютные проверки контуров (не сравнение с «дизайном» самого шрифта, который у загруженных и нарисованных шрифтов совпадает с ошибкой):
   1) пятна: контур (чернильный или отверстие) меньше SPECK_K × ствол² у буквы или цифры. Задуманные точки (i, ё, й, диакритика) — от ~0.1 ствола²,
      у самого мелкого стокового знака (клетка Пикселя) 0.06; порог 0.035 даёт запас. Знаки препинания и символы не проверяются.
   2) вырожденные контуры: меньше трёх узлов или нулевая площадь.
   3) разомкнутые контуры: у «Своего знака» штрих скелета, концы которого сошлись почти вплотную, но не сомкнуты (на стыке остаётся щель или наплыв);
      у нарисованного шрифта — контур пера без замыкания (заливается по прямой между концами). */
const SPECK_K=0.035;
function proofSpecks(ch,g,st,PFX){
  if(!(isLetter(ch)||isDigit(ch)))return null;
  let stem=+((PFX&&PFX.stem)?PFX.stem(st.p):st.p.stem);if(!(stem>0))stem=100;
  /* порог снизу: у загруженных и нарисованных шрифтов 8 ед.² (всё, что пережило очистку импорта), у встроенных 60 — Аппликация Bold/Black даёт в «R» осколок 27 и 44 ед.² (меньше 0.7 % кегля), его ведёт геометрия шрифта, а не Сверка */
  const own=!!(FONTS[CUR_FONT]&&FONTS[CUR_FONT].imported),floor=own?8:60;
  const lim=Math.max(floor,SPECK_K*stem*stem);let n=0,least=1e9,deg=0;
  for(const c of g.cs){const nd=c.nodes;if(!nd||nd.length<2){deg++;continue;}/* два узла с ручками — законное кольцо (точка Прописи) */
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of nd){if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}
    const bw=x1-x0,bh=y1-y0;if(bw*bh>lim*4+400&&bw>0&&bh>0)continue;/* габарит заведомо больше порога: площадь не считаем */
    const a=Math.abs(impArea(flatC(c,6)));if(a<1){deg++;continue;}if(a<lim&&(own||a>=floor)){n++;if(a<least)least=a;}}
  return {specks:n,least:Math.round(least),deg};}
function proofOpen(ch){
  const out=[];
  try{const rec=typeof CU!=='undefined'&&CU.byFont&&CU.byFont[CUR_FONT]&&CU.byFont[CUR_FONT][ch];
    if(rec&&rec.skel){const stem=st0Stem();for(const sk of rec.skel){if(sk.dot||!sk.nodes||sk.closed||sk.nodes.length<3)continue;
      const a=sk.nodes[0],b=sk.nodes[sk.nodes.length-1],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<stem*0.9){out.push('штрих «'+ch+'» не замкнут: концы сошлись на '+Math.round(d)+' ед.');break;}}}}catch(e){}
  try{if(CUR_FONT==='imp'&&window.GT_DRAW&&GT_DRAW.openChars&&GT_DRAW.openChars().includes(ch))out.push('контур пера не замкнут: залит по прямой между концами');}catch(e){}
  return out;}
const st0Stem=()=>{try{return +cur().p.stem||100;}catch(e){return 100;}};
/* проверка одного знака (общая для вкладки «Сверка» и фоновой проверки ui_autoproof.js) */
function proofChar(ch,st,des){
  {
    const g=uprightC(ch,st,true),same=!edGet(S.edits,ch),rf=same?g:uprightC(ch,st,false);
    const m=rast(g.cs),mr=same?m:rast(rf.cs),bi=maskInfo(m),ri=same?bi:maskInfo(mr);
    const r={ch,adv:g.adv,issues:[],lvl:0,parts:comps(m),design:des[ch]};
    const add=(lvl,t)=>{r.issues.push({lvl,t});if(lvl>r.lvl)r.lvl=lvl;};
    if(!bi){add(2,'пустой контур');return r;}
    r.bb=bi;
    const e=S.edits[ch];
    /* рукописные шрифты: поля меряются без соединительных хвостов (связность 0) — сами хвосты по замыслу касаются соседей */
    const PFX=FONTS[CUR_FONT].proof||null;let bm=bi;
    if(PFX&&PFX.marginP){const gm=upright(ch,{...st,p:{...st.p,...PFX.marginP}},S.edits,true);bm=maskInfo(rast(gm.cs))||bi;}
    /* полосы соединений (высота входа/выхода): то, что выходит за поля только в них, — соединительный штрих */
    if(PFX&&PFX.band&&bm!==bi){const gm=upright(ch,{...st,p:{...st.p,...PFX.marginP}},S.edits,true),mm=rast(gm.cs),B=PFX.band(st.p);let x0=1e9,x1=-1e9;
      for(let j=0;j<RH;j++){const y=RY1-(j+0.5)/RK;if(B.some(b=>y>=b[0]&&y<=b[1]))continue;for(let i=0;i<RW;i++)if(mm[j*RW+i]){if(i<x0)x0=i;if(i>x1)x1=i;}}
      if(x1>=x0)bm={...bm,xmin:Math.max(bm.xmin,RX0+x0/RK),xmax:Math.min(bm.xmax,RX0+(x1+1)/RK)};}
    /* хвост под соседа (j Линии): левое поле меряется только выше базовой линии */
    if(PFX&&PFX.tailL&&PFX.tailL.includes(ch)){const mm=rast(g.cs);let x0=1e9;for(let j=0;j<RH;j++){const y=RY1-(j+0.5)/RK;if(y<0)continue;for(let i=0;i<RW;i++)if(mm[j*RW+i]){if(i<x0)x0=i;break;}}
      if(x0<1e9)bm={...bm,xmin:Math.max(bm.xmin,RX0+x0/RK)};}
    /* лезвия под соседа (Рывок): поля меряются по ink между базовой линией и капителью: кончики клинков ниже/выше намеренно заходят под/над соседние знаки */
    if(PFX&&PFX.aboveBase){let x0=1e9,x1=-1e9;for(let j=0;j<RH;j++){const yy=RY1-(j+0.5)/RK;if(yy<0||yy>st.p.capH+1)continue;for(let i=0;i<RW;i++)if(m[j*RW+i]){if(i<x0)x0=i;if(i>x1)x1=i;}}
      if(x1>=x0)bm={...bm,xmin:Math.max(bm.xmin,RX0+x0/RK),xmax:Math.min(bm.xmax,RX0+(x1+1)/RK)};}
    r.lsb=Math.round(bm.xmin);r.rsb=Math.round(g.adv-bm.xmax);
    /* j с хвостом под предыдущую букву (opt.negL): отрицательное левое поле задумано, поле меряется от ствола — выше базовой */
    if(r.lsb<0&&GL[ch]&&GL[ch].opt&&GL[ch].opt.negL){let x0=1e9;
      for(let j=0;j<RH;j++){if(RY1-(j+0.5)/RK<0)continue;for(let i=0;i<RW;i++)if(m[j*RW+i]){if(i<x0)x0=i;break;}}
      if(x0<1e9)r.lsb=Math.round(RX0+x0/RK);}
    /* б Codex: капля шеи нависает над следующей буквой выше строчных (opt.negR) — правое поле меряется от чаши в зоне строчных */
    if(r.rsb<0&&GL[ch]&&GL[ch].opt&&GL[ch].opt.negR){let x1=-1e9;const yl=st.p.xh*1.03;
      for(let j=0;j<RH;j++){if(RY1-(j+0.5)/RK>yl)continue;for(let i=RW-1;i>=0;i--)if(m[j*RW+i]){if(i>x1)x1=i;break;}}
      if(x1>-1e9)r.rsb=Math.round(g.adv-(RX0+(x1+1)/RK));}
    let np=r.parts,nd=r.design;if(PFX&&PFX.drops){np-=PFX.drops(ch,st.p);nd-=PFX.drops(ch,{...DEFAULTS.regular,slant:0});}
    {const sp=proofSpecks(ch,g,st,PFX);
      if(sp){if(sp.specks)add(1,'мелкое пятно: '+sp.specks+' шт., меньше '+sp.least+' ед.²');if(sp.deg)add(2,'вырожденный контур: '+sp.deg+' шт.');}
      for(const t of proofOpen(ch))add(1,t);}
    if(np>nd)add(2,'оторвалась часть: '+np+' вместо '+nd);
    else if(np<nd)add(1,'части слились: '+np+' вместо '+nd);
    const barG=GL[ch]&&GL[ch].opt&&(GL[ch].opt.grp==='bar'||(GL[ch].opt.grp==='ord'&&CUR_FONT==='propis'));/* дробная черта нависает над числителем и знаменателем по замыслу */
    if(barG){}
    else if(!(PFX&&PFX.hang)&&(r.lsb<0||r.rsb<0))add(1,'выходит за поля ('+Math.min(r.lsb,r.rsb)+')');
    else if(!(PFX&&PFX.hang)&&(r.lsb<4||r.rsb<4))add(1,'тесные поля ('+Math.min(r.lsb,r.rsb)+')');
    if(BASESET.has(ch)){const kd=GL[ch]&&GL[ch].k,top=kd==='xh'?st.p.xh:st.p.capH,lim=(st.p.ov||0)*1.5+16;
      const accent=/[ЁЙЇёйїіijбдфklbdfhtЄҐґ!?"'`^°%&#$@()\[\]{}|\/\\*‘’“”«»№₽€]/.test(ch),desc=/[gjpqyДЦЩдцщрфуЎў,;()\[\]{}|\/\\$@_₽№ЈјґҐ‚„QJ]/.test(ch);
      /* законные выносные и петли шрифта (Пропись: з, у, Y, f …) — до линии выносных */
      const dOK=PFX&&PFX.desc&&PFX.desc.includes(ch)&&bi.ymin>=-(st.p.desc+lim+(PFX.descX||0)),aOK=PFX&&PFX.asc&&PFX.asc.includes(ch)&&bi.ymax<=st.p.asc+lim;
      if(!accent&&!aOK&&!(kd==='xh'&&bi.ymax<=st.p.asc+lim)&&bi.ymax>top+lim)add(1,'выходит выше линии на '+Math.round(bi.ymax-top));
      if(!desc&&!dOK&&bi.ymin<-lim)add(1,'выходит ниже базовой на '+Math.round(-bi.ymin));}
    if(ri){
      const dt=bi.ymax-ri.ymax,db=bi.ymin-ri.ymin;
      if(Math.abs(dt)>28)add(1,'верх '+(dt>0?'выше':'ниже')+' конструкции на '+Math.round(Math.abs(dt)));
      if(Math.abs(db)>28)add(1,'низ '+(db>0?'выше':'ниже')+' конструкции на '+Math.round(Math.abs(db)));
    }
    /* ---- линтер: система толщин, просветы, ступеньки ---- */
    if(CUR_FONT!=='codex'){
      /* остроконечное перо: толщина ствола — волосная + нажим */
      const Sx=PFX&&PFX.stem?PFX.stem(st.p):st.p.stem;
      const Spx=Sx*RK,Hpx=st.p.hair*RK,kd=GL[ch]&&GL[ch].k,top=kd==='xh'?st.p.xh:st.p.capH;
      if((PFX&&PFX.stemSet?PFX.stemSet.includes(ch):STEMSET.has(ch))){const runs=[];for(const fy of (PFX&&PFX.stemFy||[0.22,0.42])){const j=Math.round((RY1-top*fy)*RK);if(j<0||j>=RH)continue;let i=0;
          while(i<RW){if(m[j*RW+i]){let e=i;while(e<RW&&m[j*RW+e])e++;const L=e-i;if(L>Spx*0.6&&L<Spx*1.45)runs.push(L);break;}else i++;}}
        if(runs.length){const dev=Math.max(...runs.map(L=>Math.abs(L/Spx-1)));if(dev>(PFX&&PFX.stemTol||0.12))add(1,'ствол отличается от системы на '+Math.round(dev*100)+'%');}}
      if(!(PFX&&PFX.noBar)&&!(PFX&&PFX.barSkip&&PFX.barSkip.includes(ch))&&BARSET.has(ch)){const i0=Math.round(((bi.xmin+bi.xmax)/2-RX0)*RK);const runs=[];let j=0;
        while(j<RH){if(m[j*RW+i0]){let e=j;while(e<RH&&m[e*RW+i0])e++;const L=e-j;if(L>Hpx*0.55&&L<Hpx*1.6)runs.push(L);j=e;}else j++;}
        if(runs.length){const dev=Math.max(...runs.map(L=>Math.abs(L/Hpx-1)));if(dev>0.14)add(1,'перекладина отличается от системы на '+Math.round(dev*100)+'%');}}
      /* просветы */
      const holes=counterSizes(m,bi);const minA=Math.pow(Math.min(Spx,Hpx*1.6),2)*(PFX&&PFX.holeK!=null?PFX.holeK:0.12);
      /* области < 4 пикс. — не просвет, а растровый «зажим» острого клина у стыка диагонали со штамбом */
      for(const a of holes)if(a>=4&&a<minA){add(1,'просвет почти закрыт');break;}
      /* ступеньки: короткие прямые отрезки между двумя углами */
      let steps=0;const lim=6;
      for(const c of g.cs){const n=c.nodes,N=n.length;for(let q=0;q<N;q++){const A=n[q],B=n[(q+1)%N];if(A.b||B.a)continue;const L=Math.hypot(B.x-A.x,B.y-A.y);if(L>0.5&&L<lim)steps++;}}
      if(steps)add(1,'ступенька на контуре ('+steps+')');
    }
    if(FONTS[CUR_FONT].sym&&SYM.has(ch)&&!(PFX&&PFX.asymSkip&&PFX.asymSkip.includes(ch))){
      const gs=st.p.rough>0?upright(ch,{p:{...st.p,rough:0},lat:st.lat,hg:st.hg},S.edits,true):g,ms=st.p.rough>0?rast(gs.cs):m;
      const mi=maskInfo(ms)||bi,mm=mirrorMask(ms,(mi.xmin+mi.xmax)/2),d=1-iou(ms,mm);
      r.asym=d;if(d>0.07)add(1,'асимметрия '+Math.round(d*100)+'%');
    }
    if(e&&(e.vg||e.wm||Object.keys(e).some(k=>k.indexOf(':')>0)||e.off))r.edited=true;
    return r;
  }
}
const COVER=[
  ['Латиница · прописные','ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['Латиница · строчные','abcdefghijklmnopqrstuvwxyz'],
  ['Кириллица · прописные','АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'],
  ['Кириллица · строчные','абвгдеёжзийклмнопрстуфхцчшщъыьэюя'],
  ['Украинские','ІЇЄҐіїєґ'],
  ['Латиница · диакритика','ÀÁÂÃÄÅĀĂàáâãäåāăÇĆČçćčĎďĐđÈÉÊËĒĖĚĘèéêëēėěęĞğÌÍÎÏĪİĮìíîïīıįŁłÑŃŇñńňÒÓÔÕÖŌŐØòóôõöōőøŘřŚŞŠśşšŤťÙÚÛÜŪŮŰùúûüūůűÝŸýÿŹŻŽźżžĄąÆæŒœß'],
  ['Кириллица · расширенная','ЃѓЌќЎўЂђЋћЉљЊњЏџҒғҚқҢңӨөҮүҰұҺһӘәЈјЅѕ'],
  ['Цифры','0123456789'],
  ['Знаки','.,:;!?"\'-–—()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…¡¿−'],  ['Пробелы','\u00a0\u2009\u202f'],
];
function renderCover(){
  const box=$('#cover');box.innerHTML='';let have=0,miss=[];
  /* базовый набор (charset:'basic'): полным считается только базовый — лишние разделы и знаки не показываются и не считаются пропущенными */
  const basic=typeof fontIsBasic==='function'&&fontIsBasic(),COV=basic?COVER.filter(c=>BASIC_TITLES.includes(c[0])).map(c=>[c[0],Array.from(c[1]).filter(isBasicChar).join('')]):COVER;
  for(const [t,chars] of COV){
    const d=document.createElement('div');d.className='cv';
    let ok=0;const h=document.createElement('div');h.className='cvh';
    const body=document.createElement('div');body.className='cvb';
    for(const ch of chars){const s=document.createElement('span');const has=!!GL[ch];s.textContent=isSpaceCh(ch)?({'\u00a0':'nb','\u2009':'тонк','\u202f':'узк'})[ch]:ch;s.title=isSpaceCh(ch)?({'\u00a0':'неразрывный пробел U+00A0','\u2009':'тонкий пробел U+2009','\u202f':'узкий неразрывный пробел U+202F'})[ch]:'';s.className=has?'ok':'no';if(has){ok++;have++;}else miss.push(ch);body.appendChild(s);}
    h.innerHTML='<span>'+t+'</span><b>'+ok+' / '+chars.length+'</b>';d.appendChild(h);d.appendChild(body);box.appendChild(d);
  }
  const all=Array.from(new Set(COV.map(c=>c[1]).join('')));
  $('#cover-sum').textContent='В шрифте '+CHARSET.length+' знаков (включая пробелы). '+(basic?'Базовый набор: ':'Из контрольного набора ')+'есть '+have+' из '+all.length+(miss.length?'; нет: '+miss.join(' '):'.');
}
let pst=0;function proofSoon(){clearTimeout(pst);pst=setTimeout(renderProof,120);}
const PGROUP={
  all:()=>true,
  lat:ch=>/[A-Za-z]/.test(ch),
  cyr:ch=>/[Ѐ-ӿ]/.test(ch),
  dig:ch=>/[0-9]/.test(ch),
  sym:ch=>!/[A-Za-z0-9Ѐ-ӿ]/.test(ch),
};
function renderProof(){
  if(S.tab!=='proof')return;
  const res=computeProof(),box=$('#pgrid');box.innerHTML='';
  let n=0,w=0,b=0;
  res.forEach(r=>{n++;if(r.lvl===1)w++;else if(r.lvl===2)b++;});
  $('#psum').innerHTML='Проверено <b>'+n+'</b> · чисто <b class="okc">'+(n-w-b)+'</b> · замечания <b class="'+(w?'warnc':'')+'">'+w+'</b> · ошибки <b class="'+(b?'badc':'')+'">'+b+'</b> · начертание «'+STYLE_NAMES[S.style]+'»';
  const list=[];
  for(const ch of CHARSET){const r=res.get(ch);if(!r)continue;if(!PGROUP[S.proof.grp](ch))continue;if(S.proof.onlyBad&&!r.lvl)continue;if(S.proof.only&&S.proof.only.indexOf(ch)<0)continue;/* ui_status.js: показать только знаки из плашки состояния */list.push(r);}
  box.style.setProperty('--cw',S.proof.size+'px');
  const cards=[];
  for(const r of list){
    const el=document.createElement('div');el.className='pc l'+r.lvl;
    const cv=document.createElement('canvas');
    el.appendChild(cv);
    const info=document.createElement('div');info.className='pi';
    const u='U+'+r.ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
    info.innerHTML='<div class="pt"><b>'+r.ch+'</b><span>'+u+'</span></div><div class="pm">шир. '+Math.round(r.adv)+(r.parts>1?' · частей '+r.parts:'')+'</div>'+(r.lsb!=null?'<div class="pm">поля '+r.lsb+' / '+r.rsb+'</div>':'')+
      (r.issues.length?'<ul>'+r.issues.map(i=>'<li class="i'+i.lvl+'">'+i.t+'</li>').join('')+'</ul>':'<div class="pok">без замечаний</div>');
    const act=document.createElement('div');act.className='pa';
    const be=document.createElement('button');be.type='button';be.className='chip';be.textContent='Править';be.addEventListener('click',()=>{S.sel=r.ch;S.node=null;setTab('edit');});
    act.appendChild(be);
    if(S.edits[r.ch]){const br=document.createElement('button');br.type='button';br.className='chip';br.textContent='Сбросить правки';br.addEventListener('click',()=>{snap();delete S.edits[r.ch];bump();toast('Правки знака «'+r.ch+'» сброшены');});act.appendChild(br);}
    info.appendChild(act);el.appendChild(info);box.appendChild(el);cards.push([cv,r]);
  }
  requestAnimationFrame(()=>cards.forEach(([cv,r])=>drawCard(cv,r)));
  renderTwins();renderMetrics();
}
function drawCard(cv,r){
  const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);
  const p=cur().p,g=getFinal(r.ch,S.style);if(!g)return;
  let sc=Math.min(h/1280,(w*0.94)/Math.max(g.adv,300));const y0=h*0.77;
  if(CUR_FONT==='tyaga'||CUR_FONT==='kortes'){const pad=parseFloat(css('--s2'))||8;sc=Math.min(sc,(h-y0-pad)/Math.max(1,p.desc),(w-2*pad)/Math.max(g.adv,300));}/* «Тяга»: выносные (Д Ц Щ) и широкие знаки не ближе отступа --s2 к краю ячейки */
  const ox=(w-g.adv*sc)/2;
  const ln=css('--guide'),mu=css('--muted');
  if(S.proof.metrics){
    c.lineWidth=1;c.font=MONO;c.textBaseline='bottom';c.textAlign='left';
    for(const [y,t] of [[0,'0'],[p.xh,'x'],[p.capH,'H'],[p.asc,'↑'],[-p.desc,'↓']]){
      const sy=y0-y*sc;c.strokeStyle=ln;c.setLineDash(y===0?[]:[3,4]);c.beginPath();c.moveTo(0,sy+.5);c.lineTo(w,sy+.5);c.stroke();}
    c.setLineDash([]);c.strokeStyle=css('--gv');c.globalAlpha=.55;
    c.beginPath();c.moveTo(ox+.5,0);c.lineTo(ox+.5,h);c.moveTo(ox+g.adv*sc+.5,0);c.lineTo(ox+g.adv*sc+.5,h);c.stroke();c.globalAlpha=1;
  }
  if(S.proof.ref&&r.ch.trim()){
    const gen=['sans-serif','serif','monospace'].includes(S.ref.font);
    c.font='700 '+(1000*sc*S.ref.scale/100)+'px '+(gen?S.ref.font:'"'+S.ref.font+'"')+',sans-serif';c.textBaseline='alphabetic';c.textAlign='left';
    c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=1;c.strokeText(r.ch,ox,y0);
  }
  const P=pathOf(g.cs,(x,y)=>[ox+x*sc,y0-y*sc]);
  c.fillStyle=r.lvl===2?dsColor('danger'):(r.lvl===1?dsColor('warn'):css('--glyph'));/* FX80 D07: токены --danger / --warn, а не литералы */c.fill(P,'nonzero');
}
/* двойники и «похожие» */
const TWINS=[['A','А'],['B','В'],['E','Е'],['K','К'],['M','М'],['H','Н'],['O','О'],['P','Р'],['C','С'],['T','Т'],['X','Х'],['a','а'],['e','е'],['o','о'],['p','р'],['c','с'],['x','х'],['y','у']];
const DISTINCT=[['З','Э','3'],['з','э'],['Ц','Щ'],['И','Й'],['О','0'],['Ч','4'],['Б','6'],['Ь','Ъ'],['Ш','Щ']];
function renderTwins(){
  const st=cur(),box=$('#twins');box.innerHTML='';
  const cache={};const M=ch=>cache[ch]||(cache[ch]=(()=>{const g=GL[ch]&&upright(ch,st,S.edits,true);return g?{m:rast(g.cs),adv:g.adv,cs:g.cs}:null;})());
  const mk=(list,title,twin)=>{
    const h=document.createElement('h4');h.textContent=title;box.appendChild(h);
    const row=document.createElement('div');row.className='twrow';
    for(const grp of list){
      const ms=grp.map(M);if(ms.some(x=>!x))continue;/* Stage 5B: в неполном наборе (нарисованный, загруженный шрифт) знака группы может не быть */let worst=twin?1:0,note='';
      for(let i=0;i<grp.length;i++)for(let j=i+1;j<grp.length;j++){const v=iou(ms[i].m,ms[j].m);worst=twin?Math.min(worst,v):Math.max(worst,v);}
      let bad;
      if(twin){bad=worst<0.97;note=Math.round(worst*100)+'%'+(ms[0].adv!==ms[1].adv?' · ширина '+ms[0].adv+'/'+ms[1].adv:'');}
      else{bad=worst>0.92;note='сходство '+Math.round(worst*100)+'%';}
      const it=document.createElement('div');it.className='tw'+(bad?' bad':'');
      const cv=document.createElement('canvas');it.appendChild(cv);
      const t=document.createElement('div');t.innerHTML='<b>'+grp.join(' ')+'</b><span>'+note+'</span>';it.appendChild(t);
      row.appendChild(it);
      requestAnimationFrame(()=>{const {c,w,h}=fitCanvas(cv);c.clearRect(0,0,w,h);const sc=h/1100,gap=w/grp.length;
        grp.forEach((ch,i)=>{c.fillStyle=bad?css('--warn'):css('--glyph');c.fill(pathOf(ms[i].cs,(x,y)=>[gap*i+gap/2-ms[i].adv*sc/2+x*sc,h*0.8-y*sc]),'nonzero');});});
    }
    box.appendChild(row);
  };
  mk(TWINS,'Латиница ↔ кириллица: одинаковые знаки должны совпадать',true);
  mk(DISTINCT,'Похожие знаки: должны различаться',false);
}
/* ---------- кернинг ---------- */
function profiles(key){
  const st=S.styles[key],out={};
  const set=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐабвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ0123456789.,:;!?"\'-«»“”‘’()'];
  for(const ch of set){
    const g=getFinal(ch,key);if(!g||!g.cs.length)continue;
    const m=rast(g.cs),L=[],Rr=[];let r0=1e9,r1=-1;
    for(let j=0;j<RH;j+=2){
      let lo=-1,hi=-1;const o=j*RW;
      for(let i=0;i<RW;i++)if(m[o+i]){lo=i;break;}
      if(lo>=0){for(let i=RW-1;i>=0;i--)if(m[o+i]){hi=i+1;break;}}
      if(lo<0){L.push(null);Rr.push(null);}else{L.push(RX0+lo/RK);Rr.push(RX0+hi/RK);if(L.length-1<r0)r0=L.length-1;if(L.length-1>r1)r1=L.length-1;}
    }
    out[ch]={L,R:Rr,r0,r1,adv:g.adv};
  }
  return out;
}
function pairGap(a,b){
  const lo=Math.max(a.r0,b.r0),hi=Math.min(a.r1,b.r1);if(hi<lo)return null;
  let sum=0,n=0,mn=1e9;const CAP=190;
  for(let j=lo;j<=hi;j++){
    const ra=a.R[j],lb=b.L[j];
    if(ra==null||lb==null){sum+=CAP;n++;continue;}
    const g=(a.adv-ra)+lb;sum+=Math.min(g,CAP);n++;if(g<mn)mn=g;
  }
  return n?{avg:sum/n,min:mn}:null;
}
/* Автокернинг стартового шрифта считается после первой отрисовки (≈0,6 с), но до любого действия пользователя или чтения кернинга. */
let KR_FONT='';/* шрифт, у которого прямое начертание уже посчитано фоновой задачей */
function ensureKern(){if(!S.kd){try{if(KR_FONT!==S.fontId)autoKern('regular');autoKern('italic');S.kd=true;}catch(e){}}}
function kernLater(){
  if(S.kd)return;
  const ev=['pointerdown','keydown','wheel','touchstart','focusin'],go=()=>{for(const e of ev)document.removeEventListener(e,go,true);ensureKern();};
  for(const e of ev)document.addEventListener(e,go,true);
  /* фоном и по частям (прямой, затем курсив), когда обложки уже нарисованы; любое действие пользователя считает всё сразу (go) */
  const f0=S.fontId,idl=f=>window.requestIdleCallback?requestIdleCallback(f,{timeout:4000}):setTimeout(f,50);
  setTimeout(()=>idl(()=>{if(S.kd||S.fontId!==f0)return;try{autoKern('regular');KR_FONT=f0;}catch(e){}idl(()=>{if(!S.kd)go();});}),1200);
}
function autoKern(key){
  const P=profiles(key);
  const tgt=(a,b)=>{const g=pairGap(P[a],P[b]);return g?g.avg:150;};
  const tU=tgt('H','H'),tL=tgt('n','n');
  const lat=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'],cyr=[...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐабвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ'],dig=[...'0123456789'];
  const right=[...'.,:;!?"\'-»”’)'],left=[...'«“‘(-'];
  const pairs=[];
  for(const grp of [lat,cyr])for(const a of grp)for(const b of grp)pairs.push([a,b]);
  for(const grp of [lat,cyr])for(const a of grp){for(const r of right)pairs.push([a,r]);for(const l of left)pairs.push([l,a]);}
  const kern={};
  for(const [a,b] of pairs){
    const pa=P[a],pb=P[b];if(!pa||!pb)continue;
    const g=pairGap(pa,pb);if(!g)continue;
    const low=/[a-zа-яёіїєґ]/.test(a)||/[a-zа-яёіїєґ]/.test(b);
    let k=0.4*((low?tL:tU)-g.avg);
    k=Math.max(k,18-g.min);
    k=Math.max(-140,Math.min(100,k));k=Math.round(k/4)*4;
    if(Math.abs(k)>=20)kern[a+b]=k;
  }
  S.styles[key].kern=kern;
  return Object.keys(kern).length;
}
/* ---------- вкладки ---------- */
const TAB_VIEWS={home:'view-lib',library:'view-library',fav:'view-fav',community:'view-comm',edit:'view-edit',proof:'view-proof',draw:'view-draw'};
const TAB_NAV=new Set(['home','library','fav','community','draw']);
function setTab(t){
  if(t==='edit'||t==='proof')ensureKern();
  if(t==='lib')t='home';
  S.tab=t;
  for(const k in TAB_VIEWS){const el=document.getElementById(TAB_VIEWS[k]);if(el)el.hidden=k!==t;}
  $$('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===(t==='draw'?'home':t)));
  document.body.classList.toggle('tab-proof',t==='proof');document.body.classList.toggle('tab-lib',TAB_NAV.has(t));
  requestAnimationFrame(()=>{
    if(LIB_VIEWS[t]){drawLibrary();}
    else if(t==='edit'){syncPanel();drawThumbs();schedule();}
    else if(t==='proof'){renderCover();renderProof();}
  });
  if(!TAB_NAV.has(t)&&window.autoProofSoon)autoProofSoon();
}
/* ---------- файлы ---------- */
let dlCap;async function getDL(){if(dlCap!==undefined)return dlCap;try{dlCap=(window.claude&&window.claude.use)?await window.claude.use('downloads'):null;}catch(e){dlCap=null;}return dlCap;}
async function saveFile(name,data,mime){
  const dl=await getDL();
  if(dl){try{await dl.save({filename:name,data});toast('Сохранено: '+name);return true;}catch(e){if(e&&e.code==='declined'){toast('Сохранение отменено');return false;}toast('Не удалось сохранить файл. Попробуйте ещё раз');return false;}}
  const blob=new Blob([data],{type:mime||'application/octet-stream'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);toast('Скачано: '+name);return true;
}
async function exportStyle(k,fmt){
  ensureKern();
  /* вес — по фактической толщине (stem/xh прямого начертания, общий для пары) */
  const w=weightOf(S.styles.regular.p);
  const r=buildTTF(k,S,{weight:w.weight,weightName:w.name,cff:fmt==='otf'}); /* otf: кубические контуры CFF прямо из движка (core_otf.js) */
  const base=psSafe(S.family),nm=r.psName||(base+'-'+w.name+(k==='italic'?'Italic':''));
  if(fmt==='woff'){const w=await buildWOFF(r.bytes);return saveFile(nm+'.woff',w,'font/woff');}
  if(fmt==='woff2'){await new Promise(q=>setTimeout(q,0));return saveFile(nm+'.woff2',await buildWOFF2(r.bytes),'font/woff2');}
  if(fmt==='otf')return saveFile(nm+'.otf',r.bytes,'font/otf');
  return saveFile(nm+'.ttf',r.bytes,'font/ttf');
}
/* ---------- семейство: 4 веса × 2 начертания одним архивом ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function makeZip(files){/* без сжатия (store) */
  const enc=new TextEncoder(),parts=[],central=[];let off=0;
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  for(const f of files){const nm=enc.encode(f.name),d=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data),c=crc32(d);
    const loc=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(c),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0)];
    parts.push(new Uint8Array(loc),nm,d);
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(c),...u32(d.length),...u32(d.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=loc.length+nm.length+d.length;}
  const cs=central.reduce((a,b)=>a+b.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cs),...u32(off),...u16(0)]);
  const all=[...parts,...central,end],tot=all.reduce((a,b)=>a+b.length,0),out=new Uint8Array(tot);let p=0;for(const a of all){out.set(a,p);p+=a.length;}return out;}
const WEIGHTS=FAM_W; /* Light/Regular/Bold/Black: [имя, usWeightClass, stem/xh] — см. core_w.js */
async function exportFamily(){
  ensureKern();
  toast('Собираю семейство…');await new Promise(r=>setTimeout(r,30));
  const base=psSafe(S.family),built=[],files=[],woffs=[],woff2s=[],otfs=[];
  const uwF=typeof vfxOpts==='function'&&vfxOpts().uniwidth; /* «Униширинные» (ui_vfx.js): advance всех весов и италика = Regular */
  for(const {wn,k,r} of famBuildAll(S,uwF,WEIGHTS))built.push({nm:r.psName||(base+'-'+wn+(k==='italic'?'Italic':'')),r});
  const VM=unionVMetrics(built.map(x=>x.r.metrics)); /* единый интерлиньяж семейства */
  const cffB=famBuildAll(S,uwF,WEIGHTS,{cff:true}); /* те же знаки (кэш движка), другой контейнер контуров: CFF */
  for(const {nm,r} of built){const b=VM?setVMetrics(r.bytes,VM):r.bytes;
    files.push({name:nm+'.ttf',data:b});woffs.push({name:'woff/'+nm+'.woff',data:await buildWOFF(b)});
    await new Promise(q=>setTimeout(q,0));woff2s.push({name:'woff2/'+nm+'.woff2',data:await buildWOFF2(b)});}
  for(const {wn,k,r} of cffB){const nm=r.psName||(base+'-'+wn+(k==='italic'?'Italic':'')),b=VM?setVMetrics(r.bytes,VM):r.bytes;otfs.push({name:'otf/'+nm+'.otf',data:b});}
  return saveFile(base+(uwF?'-uniwidth':'')+'-family.zip',makeZip(files.concat(otfs,woff2s,woffs)),'application/zip');
}
/* ---------- вариативный шрифт: ось wght 300–900 по весам семейства, прямой и курсив ---------- */
async function exportVariable(){
  toast('Собираю вариативный шрифт…');await new Promise(r=>setTimeout(r,30));
  let last=0,yl=Date.now();
  let rs;
  /* tick зовётся на каждом знаке: подпись обновляется 4 раза в секунду, страница получает передышку каждые ~40 мс работы */
  const xo=typeof vfxOpts==='function'?vfxOpts():{};
  try{rs=await buildVariablePair(S,{axes:xo.axes,uniwidth:xo.uniwidth,tick:async(k,i,n)=>{const now=Date.now();
    if(now-last>250){last=now;toast('Вариативный шрифт: '+(k==='italic'?'италик ':'прямой ')+Math.round(i*100/n)+'%');}
    if(now-yl>40){await new Promise(r=>setTimeout(r,0));yl=Date.now();}}});}
  catch(e){toast('Не удалось собрать вариативный шрифт. Попробуйте ещё раз');return false;}
  const base=psSafe(S.family);
  /* вариативный: ОДИН архив: .ttf в корне, .woff2 в папке woff2/ (как у семейства); оси в CFF2 не собираются, поэтому .otf нет */
  const files=[],w2=[];
  for(const k of ['regular','italic']){if(!rs[k])continue;const vn=base+'-VF'+(xo.uniwidth?'-uniwidth':'')+(k==='italic'?'-Italic':'');
    files.push({name:vn+'.ttf',data:rs[k].bytes});
    await new Promise(q=>setTimeout(q,0));w2.push({name:'woff2/'+vn+'.woff2',data:await buildWOFF2(rs[k].bytes)});}
  return saveFile(base+'-VF'+(xo.uniwidth?'-uniwidth':'')+'.zip',makeZip(files.concat(w2)),'application/zip');
}
/* ---------- свои пресеты (в этом браузере) ---------- */
const PRE_KEY=()=>'gtype-presets-'+CUR_FONT;
/* T1 v82: сохранённые пресеты проверяются как файл проекта (projSanitize): числа приводятся к дорожке ползунка, не-числа и чужие ключи отбрасываются, список чинится в хранилище */
function preClean(raw,fid){
  const out=[];if(!Array.isArray(raw))return out;const F=FONTS[fid];if(!F)return out;
  const ok=new Set(PARAMS.map(e=>e[0]));for(const k of ['regular','italic'])for(const q in (F.DEFAULTS&&F.DEFAULTS[k])||{})ok.add(q);for(const q in F.params||{})ok.add(q);
  for(const it of raw){if(out.length>=24)break;if(!it||typeof it!=='object'||!it.p||typeof it.p!=='object'||Array.isArray(it.p))continue;
    const p={};for(const k of Object.keys(it.p)){if(k==='__proto__'||k==='constructor'||!ok.has(k)||k==='chamfer')continue;const v=it.p[k];if((typeof v==='number'&&isFinite(v))||(typeof v==='string'&&v.trim()!==''&&isFinite(+v)))p[k]=+v;}
    const pr={fonts:{[fid]:{styles:{regular:{p}}}}};projSanitize(pr);
    for(const k of Object.keys(p))if(typeof p[k]!=='number'||!isFinite(p[k]))delete p[k];
    let name=typeof it.name==='string'?it.name.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,40):'';if(!name)name='Пресет '+(out.length+1);
    out.push({name,p});}
  return out;}
function preRead(k,fid){let s=null;try{s=localStorage.getItem(k);}catch(e){return [];}
  if(s===null)return [];let raw;try{raw=JSON.parse(s);}catch(e){raw=[];}
  const a=preClean(raw,fid);try{const j=JSON.stringify(a);if(j!==s)localStorage.setItem(k,j);}catch(e){}return a;}
function loadPre(){return preRead(PRE_KEY(),CUR_FONT);}
function savePre(a){try{localStorage.setItem(PRE_KEY(),JSON.stringify(a));}catch(e){}noStoreNote();}
function preHealAll(){for(const id in FONTS)preRead('gtype-presets-'+id,id);}
function renderPre(){const box=$('#mypre');if(!box)return;box.innerHTML='';const a=loadPre();
  {const ad=$('#mypre-add');if(ad){const full=a.length>=24;ad.disabled=full;ad.title=full?'Достигнут предел — 24 пресета. Удалите ненужный, чтобы сохранить новый':'';}}
  if(!a.length){box.innerHTML='<span style="color:var(--muted);font-size:12px">Пока пусто. Сохраните первый пресет, и он появится здесь</span>';return;}
  a.forEach((it,i)=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=it.name;b.title='Применить';
    b.addEventListener('click',()=>{const ok=preClean([it],CUR_FONT)[0];if(!ok){toast('Пресет повреждён и не применён');return;}snap();Object.assign(cur().p,ok.p);syncPanel();bump();toast('Применён «'+it.name+'»');});
    const x=document.createElement('button');x.className='chip';x.type='button';x.textContent='×';x.title='Удалить';
    x.addEventListener('click',()=>{const q=loadPre();q.splice(i,1);savePre(q);renderPre();syncCmp();});box.append(b,x);});}
/* ---------- запуск ---------- */
function bind(sel,ev,fn){const e=$(sel);if(e)e.addEventListener(ev,fn);}
/* ---------- меню «Скачать» в шапке: один вход во все форматы ---------- */
const EX_RUN={
  ttf:async()=>{if(await exportStyle('regular'))await exportStyle('italic');},
  woff:async()=>{if(await exportStyle('regular','woff'))await exportStyle('italic','woff');},
  otf:async()=>{if(await exportStyle('regular','otf'))await exportStyle('italic','otf');},
  woff2:async()=>{if(await exportStyle('regular','woff2'))await exportStyle('italic','woff2');},
  fam:()=>exportFamily(),
  vf:()=>exportVariable(),
  png:()=>exportSpecimen(),
  share:()=>{if(window.SHARE)SHARE.open(S.fontId,S.family,{opener:$('#ex-menu')});}   /* постер шрифта: окно, не файл */
};
let exBusy=false;
function exOpen(on){
  const m=$('#ex-list'),b=$('#ex-menu');if(!m||!b)return;
  if(!on&&m.contains(document.activeElement))b.focus();
  m.hidden=!on;b.setAttribute('aria-expanded',on?'true':'false');
  if(on){const f=m.querySelector('[role=menuitem]:not([disabled])');if(f)f.focus();}
  if(on&&window.SHARE&&SHARE.warm)SHARE.warm(S.fontId,S.family);/* Stage 4A: постер собирается заранее, в простое */
}
async function exRun(x){
  const b=$('#ex-menu'),m=$('#ex-list');if(!b||!m||exBusy||!EX_RUN[x])return;
  exBusy=true;const items=[...m.querySelectorAll('[role=menuitem]')];items.forEach(y=>y.disabled=true);b.setAttribute('aria-busy','true');
  exOpen(false);
  try{await EX_RUN[x]();}catch(err){b.dataset.err='1';toast('Не удалось собрать файл. Попробуйте ещё раз');}
  finally{exBusy=false;items.forEach(y=>y.disabled=false);b.removeAttribute('aria-busy');}
}
function exMenuInit(){
  const b=$('#ex-menu'),m=$('#ex-list');if(!b||!m)return;
  b.addEventListener('click',e=>{e.stopPropagation();exOpen(m.hidden);});
  b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&m.hidden){e.preventDefault();exOpen(true);}});
  m.addEventListener('click',e=>{const it=e.target.closest('[role=menuitem]');if(!it||exBusy)return;
    if(window.PORT&&PORT.xpvWant(it.dataset.x)){exOpen(false);PORT.xpvOpen(it.dataset.x);return;}   /* форматы файлов шрифта сначала показывают «Перед скачиванием» */
    exRun(it.dataset.x);});
  m.addEventListener('keydown',e=>{const items=[...m.querySelectorAll('[role=menuitem]:not([disabled])')],n=items.length;if(!n)return;
    const i=items.indexOf(document.activeElement);
    if(e.key==='Escape'){e.preventDefault();exOpen(false);b.focus();}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+n)%n].focus();}
    else if(e.key==='Home'||e.key==='End'){e.preventDefault();items[e.key==='Home'?0:n-1].focus();}
    else if(e.key==='Tab')exOpen(false);});
  document.addEventListener('click',e=>{if(!m.hidden&&!e.target.closest('#xwrap,#rail-dlwrap'))exOpen(false);});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!m.hidden){exOpen(false);b.focus();}});
}
document.addEventListener('DOMContentLoaded',exMenuInit);
function init(){
  useFont('volt');
  try{const pr=persistLoad();if(pr){applyProject(pr);if(PROJ_FIX.bad||PROJ_FIX.clamped){PALL=true;persist();}}}catch(e){}
  kernLater();setTimeout(storageSweep,5000);
  buildLibrary();buildGlyphList();buildPanel();buildMethods();syncPanel();
  const cv=$('#stage');
  cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);
  cv.addEventListener('dblclick',onDbl);cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('keydown',onKey);
  $$('[data-style]').forEach(b=>b.addEventListener('click',()=>{S.style=b.dataset.style;S.node=null;syncPanel();bump();}));
  $$('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  bind('#logo','click',()=>setTab('home'));
  $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{S.mode=b.dataset.mode;S.node=null;syncPanel();schedule();}));
  $$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{snap();cur().lat=PRESETS[b.dataset.preset]();S.mode='grid';syncPanel();bump();}));
  bind('#fit','click',()=>{S.view={zoom:1,px:0,py:0};schedule();});
  bind('#zin','click',()=>{S.view.zoom=Math.min(8,S.view.zoom*1.25);schedule();});
  bind('#zout','click',()=>{S.view.zoom=Math.max(.4,S.view.zoom/1.25);schedule();});
  bind('#undo','click',undo);
  bind('#snap','change',e=>{S.snap=e.target.checked;});
  bind('#snapstep','change',e=>{S.snapStep=+e.target.value;});
  bind('#gd','change',e=>{S.guides=e.target.checked;schedule();});
  bind('#pts','change',e=>{S.parts=e.target.checked;schedule();});
  bind('#nc','click',nodeCorner);bind('#ns','click',nodeSmooth);bind('#nr','click',resetNode);
  bind('#addv','click',()=>{const b=buildBase(S.sel,cur().p,S.edits[S.sel]);addGuide('v',b?b.w*0.35:200);bump();syncPanel();});
  bind('#addh','click',()=>{addGuide('h',cur().p.xh*0.5);bump();syncPanel();});
  bind('#rvg','click',()=>{const E=S.edits[S.sel];if(E&&E.vg){snap();delete E.vg;cleanEdit();bump();syncPanel();}});
  bind('#rhg','click',()=>{if(cur().hg.length){snap();cur().hg=[];bump();syncPanel();}});
  bind('#allvg','click',()=>{const E=S.edits[S.sel];if(!E||!E.vg){toast('У этого знака нет сдвигов направляющих');return;}snap();
    const std=E.vg.filter(g=>g.k!=='x');let n=0;for(const ch of CHARSET){if(ch===S.sel||isSpaceCh(ch))continue;const e2=S.edits[ch]||(S.edits[ch]={});e2.vg=(e2.vg||[]).filter(g=>g.k==='x').concat(std.map(g=>({...g})));n++;}
    bump();toast('Сдвиги направляющих применены к '+n+' знакам');});
  bind('#sbL','input',e=>{ed().sbL=+e.target.value;$('#oL').textContent=e.target.value;cleanEdit();bump();});
  bind('#sbR','input',e=>{ed().sbR=+e.target.value;$('#oR').textContent=e.target.value;cleanEdit();bump();});
  bind('#wm','input',e=>{const v=+e.target.value;ed().wm=v===100?0:v;if(!ed().wm)delete ed().wm;$('#oW').textContent=v+'%';cleanEdit();S.node=null;bump();syncGuides();syncParts();});
  ['#sbL','#sbR','#wm'].forEach(s=>bind(s,'pointerdown',snap));
  bind('#rg','click',()=>{snap();delete S.edits[S.sel];S.node=null;syncPanel();bump();toast('Знак сброшен');});
  bind('#rl','click',()=>{snap();cur().lat=newLattice();bump();syncNodeInfo();});
  bind('#rs','click',()=>{snap();const st=cur();st.p={...DEFAULTS[S.style]};syncPanel();bump();toast('Параметры сброшены');});/* FX80 F3 (A11): сброс отвечает тостом */
  bind('#ra','click',()=>{const n=Object.keys(S.edits||{}).length;if(!n){toast('Правок знаков пока нет');return;}snap();S.edits={};S.node=null;syncPanel();bump();toast('Правки знаков сброшены');});
  bind('#cp','click',()=>{snap();const o=S.style==='regular'?'italic':'regular';const src=S.styles[S.style];
    S.styles[o].p={...src.p};S.styles[o].p.slant=o==='italic'?DEFAULTS.italic.slant:0;
    S.styles[o].lat=JSON.parse(JSON.stringify(src.lat));S.styles[o].hg=JSON.parse(JSON.stringify(src.hg));toast('Настройки скопированы в «'+STYLE_NAMES[o]+'»');bump();});
  bind('#fam','input',e=>{S.family=e.target.value;persist();});
  bind('#fam','change',e=>{const f=famEff(e.target.value,S.fontId);if(f!==String(e.target.value).trim()){S.family=f;e.target.value=f;persist();toast('Название шрифта пустое — возвращено «'+f+'»');}});
  bind('#txt','input',e=>{S.text=e.target.value;autosizeTxt();persist();schedule();});
  bind('#tsz','input',e=>{S.specSize=+e.target.value;$('#osz').textContent=S.specSize+' px';schedule();});
  bind('#ctxb','click',()=>{S.ctx=true;S.text=ctxText(S.sel);$('#txt').value=S.text;schedule();});
  $$('[data-sample]').forEach(b=>b.addEventListener('click',()=>{S.ctx=false;S.text=b.dataset.sample.replace(/\\n/g,'\n');$('#txt').value=S.text;autosizeTxt();persist();schedule();}));
  /* эталон */
  bind('#refon','change',e=>{S.ref.on=e.target.checked;schedule();});
  const refFit=()=>{try{const gen=['sans-serif','serif','monospace'].includes(S.ref.font);const c=document.createElement('canvas').getContext('2d');
      c.font='700 1000px '+(gen?S.ref.font:'"'+S.ref.font+'"')+',sans-serif';const a=c.measureText('H').actualBoundingBoxAscent;
      if(a>0){S.ref.scale=Math.max(30,Math.min(220,Math.round(cur().p.capH/a*100)));$('#refsc').value=S.ref.scale;$('#orefsc').textContent=S.ref.scale+'%';}}catch(x){}schedule();};
  bind('#reffit','click',()=>{S.ref.on=true;$('#refon').checked=true;refFit();});
  bind('#reffont','change',e=>{S.ref.font=e.target.value;refFit();if(S.tab==='proof')proofSoon();});
  bind('#refsc','input',e=>{S.ref.scale=+e.target.value;$('#orefsc').textContent=S.ref.scale+'%';schedule();if(S.tab==='proof')proofSoon();});
  bind('#refup','change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const ff=new FontFace('VoltRef',r.result);await ff.load();document.fonts.add(ff);
      const o=$('#reffont');if(![...o.options].some(x=>x.value==='VoltRef')){const op=document.createElement('option');op.value='VoltRef';op.textContent='Загруженный: '+f.name;o.appendChild(op);}
      o.value='VoltRef';S.ref.font='VoltRef';S.ref.on=true;$('#refon').checked=true;refFit();if(S.tab==='proof')proofSoon();toast('Эталонный шрифт загружен');}catch(x){toast('Не удалось прочитать шрифт. Подойдёт файл .ttf, .otf или .woff');}};r.readAsArrayBuffer(f);e.target.value='';});
  bind('#refimg','change',e=>{const f=e.target.files[0];if(!f)return;const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{S.ref.img=im;schedule();toast('Картинка-эталон загружена');};im.onerror=()=>toast('Не удалось открыть картинку. Подойдёт PNG или JPG');im.src=u;e.target.value='';});
  for(const [id,key] of [['#refia','imgA'],['#refis','imgS'],['#refix','imgX'],['#refiy','imgY']])bind(id,'input',e=>{S.ref[key]=+e.target.value;schedule();});
  bind('#refclr','click',()=>{S.ref.img=null;S.ref.on=false;$('#refon').checked=false;schedule();});
  /* сверка */
  $$('[data-pg]').forEach(b=>b.addEventListener('click',()=>{S.proof.grp=b.dataset.pg;$$('[data-pg]').forEach(x=>x.classList.toggle('on',x===b));renderProof();}));
  bind('#pbad','change',e=>{S.proof.onlyBad=e.target.checked;renderProof();});
  bind('#tokern','click',e=>{e.preventDefault();setTab('kern');});
  bind('#psz','input',e=>{S.proof.size=+e.target.value;renderProof();});
  bind('#pmet','change',e=>{S.proof.metrics=e.target.checked;renderProof();});
  bind('#pref','change',e=>{S.proof.ref=e.target.checked;renderProof();});
  /* файлы */
  bind('#ex-r','click',()=>exportStyle('regular'));
  bind('#ex-i','click',()=>exportStyle('italic'));
  bind('#mypre-add','click',()=>{const a=loadPre();if(a.length>=24){toast('Не больше 24 пресетов');return;}const p={};for(const [k] of PARAMS)if(cur().p[k]!=null)p[k]=cur().p[k];let pn=a.length+1;const used=new Set(a.map(x=>x.name));while(used.has('Пресет '+pn))pn++;a.push({name:'Пресет '+pn,p});savePre(a);renderPre();syncCmp();toast(stSay('Пресет сохранён — настройки в надёжных руках','Пресет добавлен, но после закрытия вкладки пропадёт'));});
  bind('#pj-s','click',()=>saveFile(psSafe(S.family)+'-project.json',JSON.stringify(projectJSON(),null,1),'application/json'));
  bind('#pj-l','change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const pj=JSON.parse(r.result),chk=projSanitize(pj);if(chk.bad){toast('Файл не открыт: в нём недопустимые значения параметров ('+chk.bad+'). Выберите проект, сохранённый в G-type');return;}snap();if(applyProject(pj)){S.view={zoom:1,px:0,py:0};buildGlyphList();buildPanel();buildMethods();syncPanel();syncLibrary();bump();drawLibrary();toast(chk.clamped?'Проект загружен, значения вне допустимого диапазона приведены к границам ('+chk.clamped+')':'Проект загружен');}else toast('В файле нет проекта G-type. Выберите файл, сохранённый кнопкой «Сохранить»');}catch(x){toast('Не удалось прочитать файл. Выберите проект, сохранённый в G-type');}};r.readAsText(f);e.target.value='';});
  /* смена размеров холста (поворот, другая вкладка, открытие «Сравнения», тур) — «По размеру» автоматически */
  {let lw=0,lh=0;new ResizeObserver(en=>{const r=en[0]&&en[0].contentRect;if(r&&r.width>0&&r.height>0&&(Math.abs(r.width-lw)>1||Math.abs(r.height-lh)>1)){if(lw||lh)S.view={zoom:1,px:0,py:0};lw=r.width;lh=r.height;}
    schedule();drawThumbs();drawLibrary();}).observe($('#stagebox'));}
  requestAnimationFrame(()=>drawLibrary());
  new ResizeObserver(()=>schedule()).observe($('#specbox'));
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>schedule());
  drawThumbs();schedule();preHealAll();renderPre();setTab(S.tab);
  initExtras();
}
document.addEventListener('DOMContentLoaded',init);
