/* ===== Знаки по канону: ß (настоящий эсцет), Ł ł (диагональ через ствол), № Кодекса, ¡ ¿ − Кодекса,
   сербские/македонские Ј ј Ѕ ѕ (= J j S s, «одинаковые буквы — один знак») ===== */
(function(){
const GV=FONTS.volt.GL,GC=FONTS.codex&&FONTS.codex.GL;
const wOf=(d,p)=>typeof d.w==='function'?d.w(p):(d.opt&&d.opt.fixed?d.w:d.w*p.wdth/100);

/* ---------- ß гротесков ----------
   ствол с аскендером, переходящий скруглённой аркой в верхний полуовал; талия и нижний полуовал как у «3»;
   талия и низ нижней чаши к стволу не примыкают (плоские срезы) — это не «B». */
const eszG=g=>{const k=gk(g),{w,S,H,ov}=k,a=k.asc,ym=Math.max(k.h*0.86,a*0.5),wt=w*0.84,gap=Math.max(S*0.38,H*0.7,28);
  const T=GRP(1,[...k.ring(0,ym-H/2,wt,a+ov,[0,1,1,1],null,null,[0,1,1,1]),k.cut(S,ym-H/2-40,S+gap,ym+H/2+0.5)[0]]);
  const B=GRP(2,[...k.ring(0,-ov,w,ym+H/2,[0,1,1,0],null,null,[0,1,1,0]),k.cut(S,ym-H/2-0.5,S+gap,ym+H/2+40)[0],k.cut(-40,-ov-40,S+gap,H-ov+0.5)[0]]);
  return [k.st(0,0,S,ym),...T,...B];};
const bW=p=>wOf(GV['b'],p);
GV['ß']={shape:eszG,w:p=>Math.max(bW(p)*1.04,sE(p)*2.75+p.hair*0.6),k:'xh',opt:{}};

/* ---------- Ł ł гротесков: симметричная диагональ через ствол ---------- */
/* xc — центр ствола, yc — центр черты; длина по горизонтали — ствол + равные выносы, подъём ~0.55 */
const slashBar=(k,xc,yc,t,ext)=>{const ax=k.S/2+ext,dy=ax*0.6;return band(k,xc-ax,yc-dy,xc+ax,yc+dy,t);};
const extG=k=>Math.max(k.S*0.55,k.H*0.9,54);
const tG=k=>Math.max(26,Math.min(k.H*1.05,k.S*0.62));
const LG=GV['L'],lG=GV['l'];
GV['Ł']={shape:g=>{const k=gk(g);return [...LG.shape(g),slashBar(k,k.S/2,k.h*0.45,tG(k),extG(k))];},w:LG.w,k:'cap',opt:LG.opt||{}};
GV['ł']={shape:g=>{const k=gk(g);return [...lG.shape(g),slashBar(k,k.S/2,k.asc*0.5,tG(k),extG(k))];},w:lG.w,k:'xh',opt:lG.opt||{}};

/* ---------- Кодекс ---------- */
if(GC){
  const wv=(v,p)=>(typeof v==='function'?v(p):v)*p.wdth/100+2*soOf(p);
  /* ß пером: ствол со стопой, верхняя полуовальная арка (тонкая сверху, толстая справа), талия, широкий нижний полуовал,
     нижний волосной штрих возвращается к стволу и обрывается клинышком, не доходя до него */
  const eszC=K=>{const {L,R,S,H,ov}=K,bw=R-L,a=K.asc,sx=S,sy=K.sy,yW=a*0.46;
    const rx1=Math.min(Math.max(bw*0.42,sx+S*0.5),bw-S*1.75),cxU=L+rx1,ry1=(a+ov-yW)/2,cyU=yW+ry1;
    const rx2=R-cxU,ry2=(yW+sy+ov)/2,cyL=yW+sy-ry2,xs=L+S/2,gap=Math.max(S*0.42,H*1.8,36)+K.so,x0=L+S+gap;
    const o=[K.rc(L,0,L+S,cyU),...K.bot_(xs,0,'s'),K.band(cxU,cyU,rx1,ry1,180,-90,sx,sy),K.band(cxU,cyL,rx2,ry2,90,-90,S*0.95,sy)];
    if(cxU-x0>sy*0.5)o.push(K.rc(x0,-ov,cxU+2,-ov+sy),K.rc(x0,-ov,x0+sy*1.2,Math.max(S*0.55,sy*1.6)));
    return o;};
  GC['ß']={shape:g=>eszC(mkU(g,false,'ß')),w:p=>wv(Math.max(500,p.stem*2.6),p),k:'xh',opt:{}};

  /* Ł ł Кодекса: черта по перу (не тоньше волосной ×1.3), симметрично через ствол */
  const LC=GC['L'],lC=GC['l'];
  const barC=(K,xc,yc)=>{const ax=K.S/2+Math.max(K.S*0.6,K.H*2.2,52),dy=ax*0.6,th=Math.atan2(2*dy,2*ax);
    const t=Math.max(penWidth(K,th),K.sy*1.15);return K.bar(xc-ax,yc-dy,xc+ax,yc+dy,t);};
  GC['Ł']={shape:g=>{const K=mkU(g,true,'Ł');return [...LC.shape(g),barC(K,K.L+K.S/2,K.h*0.45)];},w:LC.w,k:'cap',opt:{}};
  GC['ł']={shape:g=>{const K=mkU(g,false,'ł');return [...lC.shape(g),barC(K,K.cx,K.asc*0.5)];},w:lC.w,k:'xh',opt:{}};

  /* № Кодекса: N Кодекса + º в его стиле (овал пером, черта-волосная под ним) */
  const NC=GC['N'],ordW=p=>Math.max(p.capH*0.3,p.stem*1.55)*p.wdth/100,ordG=p=>Math.max(24,p.stem*0.18);
  const numW=p=>wOf(NC,p)+ordG(p)+ordW(p);
  GC['№']={shape:g=>{const p=g.p,f=g.w/numW(p),wn=wOf(NC,p)*f,gn=Object.assign({},g,{w:wn});
      const K=mkU(g,true,'№'),{S,h}=K,ow=ordW(p)*f,ox=wn+ordG(p)*f,rx=ow/2,ry=Math.max(h*0.2,rx*0.92),cy=h-ry,
        sx=Math.max(S*0.62,K.H*1.6),sy=Math.max(K.sy*0.95,K.H*1.1);
      return [...NC.shape(gn),...K.ring(ox+rx,cy,rx,ry,sx,sy),K.rc(ox,cy-ry-sy*2.6,ox+ow,cy-ry-sy*1.45)];},
    w:numW,k:'cap',opt:{}};

  /* ¡ ¿ — перевёрнутые ! ? Кодекса (как в гротесках: поворот вокруг середины высоты строчных); − — как горизонталь «+» */
  const ex=GC['!'],qu=GC['?'];
  GC['¡']={shape:g=>xf(ex.shape(g),(x,y)=>[g.w-x,g.p.xh-y]),w:ex.w,k:'cap',opt:{}};
  GC['¿']={shape:g=>xf(qu.shape(g),(x,y)=>[g.w-x,g.p.xh-y]),w:qu.w,k:'cap',opt:{}};
  GC['−']={shape:g=>{const K=mkU(g,false,'−');return [K.rc(K.L,K.h*0.4-K.sy*0.6,K.R,K.h*0.4+K.sy*0.6)];},w:p=>wv(400,p),k:'cap',opt:{}};
  const f=FONTS.codex;for(const c of '¡¿−')if(!f.CHARSET.includes(c))f.CHARSET.push(c);
  for(const gr of f.GROUPS)if(gr[0]==='Знаки'){for(const c of '¡¿−')if(!gr[1].includes(c))gr[1]+=c;}
}

/* ---------- Ј ј Ѕ ѕ: тот же знак, что J j S s ---------- */
const SRB={'Ј':'J','ј':'j','Ѕ':'S','ѕ':'s'};
const seen=new Set();
for(const id in FONTS){const F=FONTS[id],G=F.GL;
  if(!seen.has(G)){seen.add(G);for(const c in SRB)if(G[SRB[c]])G[c]=G[SRB[c]];}
  for(const c in SRB)if(G[c]&&!F.CHARSET.includes(c))F.CHARSET.push(c);
  for(const gr of F.GROUPS||[])if(/расширенн/.test(gr[0])){for(const c in SRB)if(G[c]&&!gr[1].includes(c))gr[1]+=c;}}
})();
