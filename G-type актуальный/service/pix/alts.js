/* alternates: pure builders (PXE, recipe table T, maxPw lookup). Each returns a bitmap for a given K (res context) and q (params). */
function altsLib(PXE,PX4,mxPw){
const T=PX4.T;
const CLp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* context for another height, weight capped to what that height can hold */
const ctxH=(Hh,q)=>PXE.ctx(Hh,Math.min(q.pw,mxPw(Math.max(5,Hh),q.pserif)),q.pserif);
const L={};
/* small capitals: capital recipe at x-height + 1 */
L.sc=ch=>(K,q)=>PX4.buildSpec(T[ch],ctxH(K.X+1,q));
/* figures at another height with a vertical offset: returns {build,dy(K)} */
const fig=(d,hf,df)=>({build:(K,q)=>{const H2=hf(K);return PX4.buildSpec(d==='0'?{r:'0p',k:'cap'}:T[d],ctxH(H2,q));},dy:df});/* малые цифры: нуль без черты */
const dd=K=>Math.max(1,Math.round(K.X*0.3));
L.osf=d=>{
  if('0 1 2'.includes(d))return fig(d,K=>K.X,K=>0);
  if(d==='6'||d==='8')return fig(d,K=>K.H,K=>0);
  return fig(d,K=>K.X+dd(K),K=>-dd(K));};
const hs=K=>Math.max(7,Math.round(K.H*0.55));
L.numr=d=>fig(d,hs,K=>K.H-hs(K));
L.dnom=d=>fig(d,hs,K=>0);
L.subs=d=>fig(d,hs,K=>-Math.round(hs(K)*0.3));
L.ss01={
  m:{spec:{r:'m.ss01',k:'xh'}},
  '0':{spec:{r:'0p',k:'cap'}}};/* ss01: гладкий нуль (по умолчанию нуль с чертой) */
/* case forms: same glyph, centred on the capital height (dy computed from the bitmap) */
L.caseList='()[]{}-–—«»‹›•';
return L;}
if(typeof module!=='undefined')module.exports=altsLib;
