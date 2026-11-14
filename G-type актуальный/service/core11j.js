/* ===== j с классическим отрицательным левым полем (Вольт, Квадра, Кодекс; ј — тот же знак) =====
   Ширина j = ширина i, ствол стоит там же, где ствол i, а хвост уходит влево за начало знака — под предыдущую букву.
   Поля j берутся от ствола (opt.fixed: оптический спейсинг мерил бы поле от кончика хвоста и давал «двойной пробел»).
   Форма хвоста не меняется: старая форма строится в старой ширине и сдвигается влево. */
(function(){
  const wOf=(d,p)=>typeof d.w==='function'?d.w(p):(d.opt&&d.opt.fixed?d.w:d.w*p.wdth/100);
  /* dxOf(g0,p) -> {dx, w}: сдвиг влево и новая ширина */
  const fix=(G,mOf)=>{const J=G&&G.j;if(!J||(J.opt&&J.opt.negL))return;
    const J0={w:J.w,opt:J.opt},s0=J.shape,cache=new Map();
    const m=p=>{const key=JSON.stringify(p);let r=cache.get(key);if(r)return r;
      const g0=makeG(p,wOf(J0,p),p.xh);r=mOf(g0,s0);if(cache.size>64)cache.clear();cache.set(key,r);return r;};
    J.w=p=>m(p).w;
    J.shape=g=>{const p=g.p,r=m(p),g0=makeG(p,wOf(J0,p)+(g.w-r.w),g.h),dx=r.dx;/* правка ширины (wm) — прибавкой */return xf(s0(g0)||[],(x,y)=>[x-dx,y]);};
    J.opt=Object.assign({},J.opt,{fixed:true,negL:true});};
  /* гротески: ствол j (w−S…w) встаёт на место ствола i (0…S), ширина — как у i */
  const I=FONTS.volt.GL.i,grot=g0=>{const w=wOf(I,g0.p);return {dx:g0.w-w,w};};
  fix(FONTS.volt.GL,grot);
  if(FONTS.kvadra&&FONTS.kvadra.GL!==FONTS.volt.GL)fix(FONTS.kvadra.GL,grot);
  /* Кодекс: ширина и начало знака — по краскам выше базовой линии (ствол, засечка, точка), хвост — ниже */
  if(FONTS.codex)fix(FONTS.codex.GL,(g0,s0)=>{const cs=(s0(g0)||[]).filter(c=>!c.hole&&c.op!=='sub');let y1=0;
    for(const c of cs)for(const q of flatC(c,8))if(q[1]>y1)y1=q[1];
    const pr=inkProfile(cs,0,y1,48);let L=1e9,R=-1e9;pr.L.forEach(v=>{if(v!=null&&v<L)L=v;});pr.R.forEach(v=>{if(v!=null&&v>R)R=v;});
    return R>L?{dx:L,w:R-L}:{dx:0,w:g0.w};});
})();
