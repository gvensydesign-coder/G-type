/* ===== Курсивные формы гротесков =====
   Включаются отдельным параметром p.ital=1 (задан в DEFAULTS.italic Вольта и Квадры), а не наклоном:
   прямое начертание никогда не меняется, наклон без ital даёт прежние формы.
   y/у — «u» с плавным хвостом; g и j получают тот же хвост, чтобы нижние выносные были одной системы. */
/* хвост выносного: ствол xs..xs+S уходит вниз и плавно (скруглённый внешний и внутренний угол) поворачивает влево
   до вертикального среза в xL; yS — верх ствола; gid — своя группа, вычитание просвета действует только на хвост */
/* глубина хвоста: как у g, но в тяжёлых весах опускается, чтобы между чашей и хвостом остался просвет */
GR.tailD=k=>Math.min(k.desc,Math.max(k.desc*0.82,k.H+k.ov+Math.max(30,k.H*0.3)));
GR.tail=(k,xs,xL,yS,gid)=>{const {S,H}=k,dd=GR.tailD(k),xR=xs+S;
  const rO=Math.max(0,Math.min(k.rad(xR-xL,dd*2),dd-H*0.35)),yTop=-dd+Math.max(rO*2.2,H*2.4);
  const rI=rO>0?Math.max(2,Math.min(k.radIn(rO,xs-xL,dd),(dd-H)*0.9)):0;
  return [...GRP(gid||4,[k.RR(xL,-dd,xR,yTop,[0,rO,0,0]),SUB(k.RR(xL-60,-dd+H,xs,yTop+60,[0,rI,0,0]))[0]]),k.st(xs,yTop-1,xR,yS)];};
GR.yItal=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.46;
  /* верх хвоста (как в GR.tail): если ствол хвоста не доходит до нижней перекладины чаши, стенку у стыка ничто не прикрывает */
  const dT=GR.tailD(k),rT=Math.max(0,Math.min(k.rad(w-w*0.08,dT*2),dT-H*0.35)),bare=-dT+Math.max(rT*2.2,H*2.4)-1>-ov+H;
  /* верх — как у u (чаша и два ствола), правый ствол продолжается в хвост; чаша примыкает к стволу с сужением */
  return [...GRP(1,[...k.ring(0,-ov,w,ym*2),k.cut(S,ym,w-S,h+40)[0],...k.ringJoins(0,-ov,w,ym*2,null,-1,0,1,null,bare)]),
    k.st(0,ym,S,h),...GR.tail(k,w-S,w*0.08,h)];};
(function(){
  const y0=GR.y,j0=GR.j,g0=GR.g;
  GR.y=g=>g.p.ital?GR.yItal(g):y0(g);
  GR.j=g=>{if(!g.p.ital)return j0(g);const k=gk(g),{w,h,S,H}=k;
    return [...GR.tail(k,w-S,0,h),k.dot(w-S,h+Math.max(40,S*0.4),S)];};
  GR.g=g=>{if(!g.p.ital)return g0(g);const k=gk(g),{w,h,S,H,ov}=k;
    return [...GR.bowlR(k),...GR.tail(k,w-S,w*0.08,h)];};
})();
