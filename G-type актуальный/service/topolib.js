/* Топология знаков для стресс-теста: растр (как QA: ~150 px на кегль), число частей и дыр,
   плюс «минимальный просвет»: после утолщения на 1 пиксель топология не меняется
   (в утолщённом растре считаются только дыры крупнее 12 px — узкое остриё ловушки не в счёт). */
module.exports=function(src){
const M=new Function(src+'\nreturn {FONTS,useFont,newLattice,finalGlyph,PARAMS,csgFlatten,csgMask,safeP,famParams,FAM_W,paramLimits:typeof paramLimits==="function"?paramLimits:null,glyphWidth,soOf:typeof soOf==="function"?soOf:null,OTO:typeof OTO==="undefined"?null:OTO};')();
const CH=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя0123456789&@%$\u2044'];
let PX=6; /* единиц шрифта на пиксель (шрифт может задать свой: F.topoPX(p)) */
let CURID=null;
/* малые цифры (числитель, знаменатель, индекс) растрируются в масштабе, обратном их размеру: пробел «в один пиксель» относителен размеру знака */
function rk(ch,p){const f=CURID&&M.FONTS[CURID],o=f&&f.GL[ch]&&f.GL[ch].opt;return o&&/^(numr|dnom|subs)$/.test(o.grp||'')?1/0.6:o&&o.grp==='sc'?Math.max(1,Math.min(1.6,(()=>{const q=M.safeP(p);return q.capH/(q.xh*M.OTO.CFG[CURID].hx);})())):1;}
function raster(cs,k){k=k||1;
  const polys=cs.map(c=>M.csgFlatten(c).map(q=>[q[0]/PX*k,q[1]/PX*k]));
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const P of polys)for(const q of P){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
  if(!(x1>x0))return null;x0=Math.floor(x0)-3;y0=Math.floor(y0)-3;const W=Math.ceil(x1-x0)+4,H=Math.ceil(y1-y0)+4;
  const m=new Uint8Array(W*H);M.csgMask(polys,x0,y0,W,H,m,1);return {m,W,H};}
function label(m,W,H,val){const lab=new Int32Array(W*H),st=[];let n=0;const sizes=[];
  for(let i=0;i<W*H;i++){if(m[i]!==val||lab[i])continue;n++;let sz=0;lab[i]=n;st.push(i);
    while(st.length){const k=st.pop();sz++;const x=k%W,y=(k-x)/W;
      if(x>0&&m[k-1]===val&&!lab[k-1]){lab[k-1]=n;st.push(k-1);}
      if(x<W-1&&m[k+1]===val&&!lab[k+1]){lab[k+1]=n;st.push(k+1);}
      if(y>0&&m[k-W]===val&&!lab[k-W]){lab[k-W]=n;st.push(k-W);}
      if(y<H-1&&m[k+W]===val&&!lab[k+W]){lab[k+W]=n;st.push(k+W);}}
    sizes.push(sz);}
  return {lab,n,sizes};}
function topoM(m,W,H,minHole){minHole=minHole||4;
  const ink=label(m,W,H,1);let parts=0;for(const s of ink.sizes)if(s>2)parts++;
  const bg=label(m,W,H,0);const border=new Set();
  for(let x=0;x<W;x++){border.add(bg.lab[x]);border.add(bg.lab[(H-1)*W+x]);}for(let y=0;y<H;y++){border.add(bg.lab[y*W]);border.add(bg.lab[y*W+W-1]);}
  let holes=0;for(let k=1;k<=bg.n;k++)if(!border.has(k)&&bg.sizes[k-1]>minHole)holes++;
  return parts+'/'+holes;}
function dil(m,W,H){const o=new Uint8Array(m);for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(m[y*W+x]){const k=y*W+x;if(x>0)o[k-1]=1;if(x<W-1)o[k+1]=1;if(y>0)o[k-W]=1;if(y<H-1)o[k+W]=1;}return o;}
const mk=p=>({p,lat:M.newLattice(),hg:[],kern:{}});
function topo(ch,st){const f0=CURID&&M.FONTS[CURID];PX=f0&&f0.topoPX?f0.topoPX(st.p):6;if(f0&&f0.topoP)st={...st,p:f0.topoP(st.p)};const g=M.finalGlyph(ch,st,{},{slant:false});if(!g)return null;const r=raster(g.cs,rk(ch,st.p));if(!r)return ['0/0','0/0'];
  return [topoM(r.m,r.W,r.H),topoM(dil(r.m,r.W,r.H),r.W,r.H,12)];}
/* эталон: умолчания шрифта (у Кодекса — без вензелей). Вензель Кодекса (spur) — завиток с шаром, который по замыслу
   ложится на вершину и может замкнуть «глазок»: с вензелем допускается 0…2 новых просвета на знак, но не новые части
   и не потеря просветов (буква не заливается, завиток не отрывается); без вензеля — строго как у эталона. */
function refTopo(id,sty){M.useFont(id);CURID=id;const f=M.FONTS[id];const p={...f.DEFAULTS[sty]};if(id==='codex')p.spur=0;
  const r={};for(const c of CH.concat(otExtra(f)))if(f.GL[c]){r[c]=topo(c,mk(p));
    /* знак OpenType: число частей и дыр — как у знака, от которого он образован (в упрощённом виде: сырая топология) */
    const o=f.GL[c].opt,b=o&&o.alt&&o.base&&r[o.base]&&o.grp!=='tosf'&&o.grp!=='osf'?o.base:null;if(b&&o.grp==='sc'||b&&/^(numr|dnom|subs)$/.test(o.grp))r[c]=[r[b][0],r[c][1]];}
  return r;}
/* знаки OpenType (core_ot_o1): капитель базового алфавита, цифры onum/числитель/знаменатель/индекс, дробная черта, ª º (OTX=0 — выключить) */
function otExtra(f){if(process.env.OTX==='0')return [];return Object.keys(f.GL).filter(k=>{const o=f.GL[k]&&f.GL[k].opt;return k.length>1&&o&&o.grp&&o.grp!=='ctf'&&o.grp!=='cpf'&&o.grp!=='tf'&&(o.grp!=='sc'||CH.includes(o.base));});}
const ph=t=>t.split('/').map(Number);
function check(id,sty,o,ref,chs){M.useFont(id);CURID=id;const f=M.FONTS[id];const p={...f.DEFAULTS[sty],...o};const errs=[];
  const sp=id==='codex'?M.safeP(p).spur||0:0;const st=mk(id==='codex'?{...p,spur:0}:p),stS=sp>0?mk(p):null;
  for(const c of (chs?[...chs]:Object.keys(ref))){if(!ref[c])continue;const t=topo(c,st);let rf=ref[c];
    /* знак OpenType, образованный подобием основного (капитель, малые цифры): ожидание — топология основы при тех же ползунках
       (подобие не меняет число частей и дыр; пиксельная сетка у пороговых щелей даёт ложные расхождения) */
    const go=f.GL[c].opt;if(go&&go.alt&&go.base&&/^(sc|osf|tosf|numr|dnom|subs)$/.test(go.grp||'')&&f.GL[go.base]){
      /* small figures (osf/tosf/numr/dnom/subs) draw the zero WITHOUT the slash by design (pixel: fig() in core_pixel_p1.js): the expectation is the smooth zero (ss01), not the slashed default */
      const gb=go.base==='0'&&go.grp!=='sc'&&f.GL['zero.ss01']?'zero.ss01':go.base;
      const tb=topo(gb,st);if(tb&&gb!==go.base)rf=tb;else if(tb&&ref[gb])rf=[ref[gb][0],ref[gb][1]];if(tb&&t[0]===tb[0]&&t[1]===tb[1])continue;}
    if(t[0]!==rf[0]){errs.push(c+':'+rf[0]+'→'+t[0]);continue;}if(t[1]!==rf[1]){errs.push(c+':gap '+rf[1]+'→'+t[1]);continue;}
    if(stS){const u=topo(c,stS);for(let i=0;i<2;i++){const a=ph(t[i]),b=ph(u[i]);if(b[0]!==a[0]||b[1]!==a[1]){errs.push(c+':'+(i?'gap ':'')+'вензель '+t[i]+'→'+u[i]);break;}}}}
  return errs;}
function ranges(id){const ov=M.FONTS[id].params||{},out=[];
  for(const [k,l,mn,mx,stp] of M.PARAMS){const o=ov[k];if(o===null)continue;const [,a,b,s]=Array.isArray(o)?o:[l,mn,mx,stp];out.push([k,a,b,s]);}
  return out;}
return {M,CH,topo,refTopo,check,ranges,mk};};
