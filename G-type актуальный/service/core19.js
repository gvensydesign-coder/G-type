/* ===== core19: локализованные формы (GSUB locl) =====
   Болгарские (BGR): л Л д Д ж Ж к ю; сербские/македонские (SRB, MKD): б (прямой и курсив), г д п т (только курсив).
   Все формы — альтернативные неэкодированные знаки uniXXXX.loclBGR / .loclSRB на тех же компонентах шрифта; в TTF их несёт
   buildTTF (core3b) через otAlternates (core15), а GSUB locl с языковыми системами cyrl/BGR, cyrl/SRB, cyrl/MKD собирают
   loclFeatures + otLayoutTableL ниже. Правки знака-основы (ed) на альтернаты не переносятся — топология другая.
   Пропись (скрипт): формы по умолчанию уже рукописные (п = n, т = m, д = g), своих locl нет. */
const LOCL_TAGS={BGR:['BGR '],SRB:['SRB ','MKD ']};
const loclHex=ch=>'uni'+ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0');
/* альтернат: копия знака-основы с другой формой; shape (и skel) — новые, ширина — основы либо wfn */
function loclAdd(G,base,lang,style,patch,wfn){
  const B=G[base];if(!B)return null;
  const name=loclHex(base)+'.locl'+lang;
  G[name]=Object.assign({},B,patch,{w:wfn||B.w,opt:Object.assign({},B.opt||{},{alt:true,base,feat:'locl',lang,style})});
  return G[name];}
/* псевдоним: форма берётся у латинского знака (г=r, д=g, п=n, т=m) */
function loclAlias(G,base,lang,style,latin){
  const L=G[latin];if(!L)return null;
  return loclAdd(G,base,lang,style,{shape:L.shape,skel:L.skel,k:'xh'},L.w);}
/* ---------- гротески (Вольт, Квадра: общая таблица) ---------- */
const GRL={};
/* Λ: две диагонали без крюка; feet — основание с засечками вниз (д) */
GRL.lam=(g,feet)=>{const k=gk(g),{w,h,S,H}=k,m=feet?w*0.09:0,y0=feet?H*0.5:0,fd=k.fd(),tw=Math.max(S*0.62,H*1.1);
  const hw0=k.dw(Math.max(w/2-m,1),h-y0),hw=k.dw(Math.max(w/2-m-hw0/2,1),h-y0),xa=w/2;
  const o=[k.dgC(m+hw/2,y0,xa,h,hw),k.dgC(w-m-hw/2,y0,xa,h,hw)];
  if(feet)o.push(k.st(0,0,w,H),k.st(0,-fd,tw,H),k.st(w-tw,-fd,w,H));
  return o;};
/* ж: прямой «X» через ствол (без изломов К) */
GRL.zhe=g=>{const k=gk(g),{w,h,S}=k,cx=w/2,hw0=k.dw(w,h),hw=k.dw(Math.max(w-hw0,1),h);
  return [k.st(cx-S/2,0,cx+S/2,h),k.dgC(hw/2,h,w-hw/2,0,hw),k.dgC(w-hw/2,h,hw/2,0,hw)];};
/* к: плечо и нога сходятся в одной точке на стволе (классическая К) */
GRL.ka=g=>{const k=gk(g),{w,h,S}=k,yj=h*0.42,xj=S*0.75,hwA=k.dw(w-S,h-yj),hwL=k.dw(w-S,yj);
  return [k.st(0,0,S,h),...GRP(5,[k.dgC(xj,yj,w-hwA/2,h,hwA),k.dgC(xj,yj,w-hwL/2,0,hwL),k.cut(-2000,-200,0,h+200)[0]])];};
/* ю: кольцо чуть шире, перекладина на геометрической середине */
GRL.yu=g=>{const k=gk(g),{w,h,S,H,ov}=k,ym=h*0.5,ow=w*0.66,fr=(w-ow-S)*0.7;
  return [k.st(0,0,S,h),...GRP(7,[k.st(S-1,ym-H/2,w-ow+S,ym+H/2),...k.joinCut(S,ym+H/2,1,-1,{m:0.5,free:fr}),...k.joinCut(S,ym-H/2,1,1,{m:0.5,free:fr})]),...k.ring(w-ow,-ov,w,h+ov)];};
/* б (сербская): чаша + ствол, плавно переходящий в короткий флажок с загибом вниз (как δ) */
GRL.be=g=>{const k=gk(g),{w,h,S,H,ov}=k,a=k.asc,y0=h*0.42,fw=w*0.8,tick=Math.min(a*0.1,(a-h)*0.9+H);
  return [...k.ring(0,-ov,w,h+ov),...GRP(3,[...k.ring(0,y0,fw,a,[0,0,0,1],null,null,[0,0,0,1]),k.cut(S,y0-80,fw+40,a-H)[0],k.st(fw-S*0.8,a-H-tick,fw,a)])];};
(function(){
  const G=FONTS.volt.GL;
  const BG=['both'];
  loclAdd(G,'л','BGR','both',{shape:g=>GRL.lam(g,false)});loclAdd(G,'Л','BGR','both',{shape:g=>GRL.lam(g,false)});
  loclAdd(G,'д','BGR','both',{shape:g=>GRL.lam(g,true)});loclAdd(G,'Д','BGR','both',{shape:g=>GRL.lam(g,true)});
  loclAdd(G,'ж','BGR','both',{shape:GRL.zhe});loclAdd(G,'Ж','BGR','both',{shape:GRL.zhe});
  loclAdd(G,'к','BGR','both',{shape:GRL.ka});loclAdd(G,'ю','BGR','both',{shape:GRL.yu});
  loclAdd(G,'б','SRB','both',{shape:GRL.be});
  loclAlias(G,'г','SRB','italic','r');loclAlias(G,'д','SRB','italic','g');loclAlias(G,'п','SRB','italic','n');
  const n=G['n'];if(n)loclAdd(G,'т','SRB','italic',{shape:g=>GR.mArch(g),k:'xh'},p=>{const S=sE(p),wn=(typeof n.w==='function'?n.w(p):n.w*p.wdth/100);return 3*S+2*Math.max(wn-2*S,S*0.5)*0.88;});
})();
/* ---------- Кодекс ---------- */
const UXL={};
UXL.Le=K=>{const {L,R,S,h,cx}=K;return [K.bar(L+S*0.55,0,cx,h),K.bar(R-S*0.55,0,cx,h),...K.bot_(L+S*0.55,0,'f'),...K.bot_(R-S*0.55,0,'s')];};
UXL.ka=K=>{const {L,R,S,h}=K,xs=L+S/2;return [...K.stem(xs,0,h,'a','s'),K.bar(R-S*0.4,h,L+S*1.15,h*0.42),K.bar(R-S*0.25,0,L+S*1.15,h*0.42)];};
UXL.yu=K=>{const {L,R,S,h}=K,rw=K.bw*0.66,cxr=R-rw/2;return [...K.stem(L+S/2,0,h,'a','s'),K.rc(L+S-2,h/2-K.sy*0.5,cxr-rw/2+2,h/2+K.sy*0.5),...K.ring(cxr,h/2,rw/2,h/2+K.ov)];};
(function(){
  if(!FONTS.codex)return;const G=FONTS.codex.GL;
  const ux=(base,fn)=>loclAdd(G,base,'BGR','both',{shape:g=>fn(mkU(g,G[base].k==='cap',base))});
  ux('л',UXL.Le);ux('Л',UXL.Le);ux('к',UXL.ka);ux('ю',UXL.yu);
  loclAlias(G,'г','SRB','italic','r');loclAlias(G,'д','SRB','italic','g');loclAlias(G,'п','SRB','italic','n');loclAlias(G,'т','SRB','italic','m');
})();
/* ---------- Линия (скелет + перо) ---------- */
(function(){
  const F=FONTS.liniya;if(!F)return;const G=F.GL;
  const sk=(base,lang,style,fn)=>{const B=G[base];if(!B)return;const e=loclAdd(G,base,lang,style,{});
    e.skel=g=>fn(F.kit(g,base));e.shape=g=>skShape(e.skel(g),F,g.p);};
  const lam=K=>[SKB.P([[K.hx*1.15,0],[K.cx,K.T,null,{c:1,cy:K.h}],[K.w-K.hx*1.15,0]],'H','H')];
  const lamD=K=>{const {L,R,w,h,T,B}=K,dd=Math.max(K.desc*0.55,K.S*1.4),xb=L+w*0.06;
    return [SKB.P([[xb,B],[K.cx,T,null,{c:1,cy:h}],[w-xb,B]],'J','J'),K.hb(L,R,B,'J','J'),K.st(L,B,-dd,'J','H'),K.st(R,B,-dd,'J','H')];};
  const zhe=K=>{const {w,h,cx}=K,a=K.hx*1.15;return [K.st(cx,0,h),K.ln(a,h,w-a,0,'H','H'),K.ln(w-a,h,a,0,'H','H')];};
  const ka=K=>{const {L,w,h}=K,xa=w-K.hx*1.2,yj=h*0.42;return [K.st(L,0,h),K.ln(xa,h,L,yj,'H','J'),K.ln(L,yj,w-K.hx*1.15,0,'J','H')];};
  const yu=K=>{const {L,R,w,h}=K,xo0=L+K.S*1.3+w*0.04,ocx=(xo0+R)/2,rx=(R-xo0)/2;
    return [K.st(L,0,h),K.hb(L,xo0,h*0.5,'J','J'),K.ov_(ocx,h*0.5,rx,h*0.5+K.ov-K.hy)];};
  /* б (сербская): флажок загибается вниз, как δ */
  const be=K=>{const {L,R,h}=K,A=K.asc-K.hy,r=Math.min(A-h*0.92,(R-L)*0.45),ex=L+(R-L)*0.82;
    const ov=K.ov_(K.cx,h/2,(R-L)/2,h/2+K.ov-K.hy);
    return [ov,K.pa([[L,h*0.5,90],[L,A-r,90],[L+r,A,0],[ex,A-r*0.42,-62]],'J','R')];};
  sk('л','BGR','both',lam);sk('Л','BGR','both',lam);sk('д','BGR','both',lamD);sk('Д','BGR','both',lamD);
  sk('ж','BGR','both',zhe);sk('Ж','BGR','both',zhe);sk('к','BGR','both',ka);sk('ю','BGR','both',yu);
  sk('б','SRB','both',be);
  loclAlias(G,'г','SRB','italic','r');loclAlias(G,'д','SRB','italic','g');loclAlias(G,'п','SRB','italic','n');loclAlias(G,'т','SRB','italic','m');
})();
/* ---------- GSUB: locl с языковыми системами ---------- */
/* пары [основа, альтернат] по языкам -> по одному lookup и feature locl на язык (BGR; SRB+MKD) */
function loclFeatures(glyphs,gidByName,gidByCh,feats,looks){
  const by={};
  for(const g of glyphs){if(!g.alt||g.alt.feat!=='locl')continue;const b=gidByCh[g.alt.base];if(b==null)continue;(by[g.alt.lang]||(by[g.alt.lang]=[])).push([b,gidByName[g.name]]);}
  for(const lang of Object.keys(by).sort()){looks.push({type:1,subs:[otSingleSubst(by[lang])]});
    feats.push({tag:'locl',lookups:[looks.length-1],langs:LOCL_TAGS[lang]});}}
/* то же, что otLayoutTable (core15), но feature с langs попадает только в LangSys этих языков (script cyrl) */
function otLayoutTableL(features,lookups,extType){
  const scripts=['DFLT','cyrl','latn'];features=features.slice().sort((a,b)=>a.tag<b.tag?-1:a.tag>b.tag?1:0);
  const defIdx=[],langIdx={};features.forEach((f,i)=>{if(f.langs)f.langs.forEach(l=>(langIdx[l]||(langIdx[l]=[])).push(i));else defIdx.push(i);});
  const mkLS=ix=>{const w=new BW();w.u16(0).u16(0xFFFF).u16(ix.length);ix.forEach(i=>w.u16(i));return w;};
  const defLS=mkLS(defIdx),langTags=Object.keys(langIdx).sort();
  const tabs=scripts.map(t=>{const w=new BW();
    if(t==='cyrl'&&langTags.length){const nl=langTags.length,lss=langTags.map(l=>mkLS(defIdx.concat(langIdx[l]).sort((a,b)=>a-b)));
      let o=4+6*nl;const dOff=o;o+=defLS.len;const offs=lss.map(ls=>{const q=o;o+=ls.len;return q;});
      w.u16(dOff).u16(nl);langTags.forEach((l,i)=>w.tag(l).u16(offs[i]));w.bytes(defLS.b);lss.forEach(ls=>w.bytes(ls.b));}
    else w.u16(4).u16(0).bytes(defLS.b);
    return w;});
  const sl=new BW();sl.u16(scripts.length);let so=2+6*scripts.length;scripts.forEach((t,i)=>{sl.tag(t).u16(so);so+=tabs[i].len;});tabs.forEach(w=>sl.bytes(w.b));
  const fl=new BW();fl.u16(features.length);const fts=features.map(f=>{const w=new BW();const base=4+2*f.lookups.length;
    w.u16(f.nameID?base:0).u16(f.lookups.length);f.lookups.forEach(x=>w.u16(x));if(f.nameID)w.u16(0).u16(f.nameID);return w.b;});
  let fo=2+6*features.length;features.forEach((f,i)=>{fl.tag(f.tag).u16(fo);fo+=fts[i].length;});fts.forEach(b=>fl.bytes(b));
  const ll=new BW();ll.u16(lookups.length);const lts=lookups.map(L=>{const w=new BW();w.u16(extType).u16(L.flag||0).u16(L.subs.length);
    L.subs.forEach((s,i)=>w.u16(6+2*L.subs.length+8*i));L.subs.forEach(()=>w.u16(1).u16(L.type).u32(0));return w;});
  let lo=2+2*lookups.length;lts.forEach(w=>{ll.u16(lo);lo+=w.len;});
  const posSL=10,posFL=posSL+sl.len,posLL=posFL+fl.len;
  const out=new BW();out.u32(0x00010000).u16(posSL).u16(posFL).u16(posLL);out.bytes(sl.b).bytes(fl.b);
  out.bytes(ll.b);const fix=[];
  lookups.forEach((L,i)=>{const lstart=out.len;out.bytes(lts[i].b);L.subs.forEach((s,k)=>fix.push([lstart+6+2*L.subs.length+8*k,s]));});
  for(const [extPos,s] of fix){while(out.len%2)out.u8(0);const off=out.len-extPos;const b=out.b;b[extPos+4]=(off>>>24)&255;b[extPos+5]=(off>>>16)&255;b[extPos+6]=(off>>>8)&255;b[extPos+7]=off&255;out.bytes(s);}
  return out.b;}
