/* ===== Гротески: нижний предел оптического поля у Y-образных знаков (Y Ý Ÿ Ү Ұ, У Ў) =====
   У Y развилка высоко, под плечами много белого, и оптический спейсинг прижимал плечи к соседям почти вплотную
   (поле ~7 ед. против 13 у V — Сверка: «тесные поля»). Здесь поле считается тем же opticalSB, но не опускается
   ниже, чем у V (0.35·sb). Форма знака не меняется: контур сдвигается, ширина пересчитывается (opt.fixed —
   итоговые поля задаются здесь, а не повторным оптическим расчётом). */
(function(){
  const G=FONTS.volt&&FONTS.volt.GL;if(!G||!G.Y)return;
  const wOf=(d,p)=>typeof d.w==='function'?d.w(p):(d.opt&&d.opt.fixed?d.w:d.w*p.wdth/100);
  const FL=0.35;
  const wrap=E=>{const s0=E.shape,cache=new Map();
    const m=p=>{const key=JSON.stringify(p);let r=cache.get(key);if(r)return r;
      const w0=wOf(E,p),h=E.k==='xh'?p.xh:p.capH,osp=p.opsp==null?100:p.opsp;r={dx:0,w:w0,w0};
      if(osp>0){const cs=s0(makeG(p,w0,h))||[],o=opticalSB(cs,h,p.sb,osp/100,refArea(E.k==='xh'?'xh':'cap',p));
        if(o){const fl=Math.min(p.sb,p.sb*FL),l=Math.max(o.l,fl),rr=Math.max(o.r,fl);r={dx:o.xmin-(l-p.sb),w:l+(o.xmax-o.xmin)+rr-2*p.sb,w0};}}
      if(cache.size>64)cache.clear();cache.set(key,r);return r;};
    return {shape:g=>{const r=m(g.p),cs=s0(makeG(g.p,r.w0+(g.w-r.w),g.h))||[]/* правка ширины знака (wm) — прибавкой */;return r.dx?xf(cs,(x,y)=>[x-r.dx,y]):cs;},
      w:p=>m(p).w,k:E.k,opt:Object.assign({},E.opt,{fixed:true,sbFloor:FL})};};
  const Y0=G.Y,done=new Map();
  /* ү строится из Y лениво (G['Y'].shape) в своей ширине — оставляем ему исходную форму */
  /* (объект меняется на месте: на него же ссылается составной ұ) */
  if(G['ү']&&G['ү'].shape)G['ү'].shape=g=>Y0.shape(g);
  for(const ch of 'YÝŸҮҰУЎ'){const E=G[ch];if(!E||(E.opt&&E.opt.sbFloor))continue;
    if(!done.has(E))done.set(E,wrap(E));G[ch]=done.get(E);}
})();
