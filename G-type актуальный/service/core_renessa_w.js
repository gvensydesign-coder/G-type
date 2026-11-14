/* Ренесса: семейство весов (после core_w.js) */
(function(){
/* веса: Light 0.77 · Regular 1 · Bold 1.25 · Black 1.4 от ствола по умолчанию; пресеты весов выходят за узкий диапазон ползунка, но остаются в F.lim */
WSCALE.renessa=0.578;/* default stem 82 / xh 450 = Regular (r = 0.315) */
const _weightOf_ren=weightOf,_famNearest_ren=famNearest,REN_KW=[['Light',300,0.77],['Regular',400,1],['Bold',700,1.25],['Black',900,1.4]];
/* the family ladder is 0.77/1/1.25/1.4 of the default stem: names and the nearest preset follow it (the shared ladder 0.22/0.315/0.437/0.53 would call Black «Bold») */
const renKw=p=>{const q=safeP(p),D=FONTS.renessa.DEFAULTS.regular;return q.stem/D.stem;};
weightOf=function(p){if(CUR_FONT!=='renessa')return _weightOf_ren(p);const q=safeP(p),k=renKw(p),r=q.stem/q.xh/wScale();const t=k<0.877?['Light',300]:k<1.118?['Regular',400]:k<1.323?['Bold',700]:['Black',900];return {r,weight:t[1],name:t[0]};};
famNearest=function(p){if(CUR_FONT!=='renessa')return _famNearest_ren(p);return weightOf(p).name;};
const _famParams_ren=famParams;
/* ladders by weight class (the VF masters ask for the pseudo weight '@vf' with an arbitrary class, so everything is interpolated by class) */
const renLad=(w,pts)=>{if(w<=pts[0][0])return pts[0][1];for(let i=0;i<pts.length-1;i++)if(w<=pts[i+1][0])return pts[i][1]+(pts[i+1][1]-pts[i][1])*(w-pts[i][0])/(pts[i+1][0]-pts[i][0]);return pts[pts.length-1][1];};
const REN_STEM=[[300,0.77],[400,1],[700,1.25],[900,1.4]],REN_HAIR=[[300,19],[400,25],[700,28],[900,28]],REN_WD=[[300,1],[400,1],[700,1.03],[900,1.06]];
famParams=function(p,wn){const o=_famParams_ren(p,wn);
  if(CUR_FONT==='renessa'){const e=FAM_W.find(x=>x[0]===wn),W=e?e[1]:400;
    o.stem=Math.round(p.stem*renLad(W,REN_STEM));const k=o.stem/p.stem;
    o.hair=Math.round(renLad(W,REN_HAIR)*p.hair/25);/* pen ladder, scaled by the thin-stroke slider (capped at 0.3 stem in paramLimits) */
    if(p.wdth!=null)o.wdth=Math.round(p.wdth*renLad(W,REN_WD));
    o.fla=Math.round((p.fla!=null?p.fla:40)*(k>1?Math.max(0.3,1-(k-1)*0.8):1));o.ser=p.ser;
    return paramLimits(o,'renessa').q;}
  return o;};
})();
