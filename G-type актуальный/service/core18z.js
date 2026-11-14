/* ===== Скелетные шрифты: OpenType-альтернаты, кернинг классами, веса семейства ===== */
(function(){
for(const id of ['liniya','propis']){const f=FONTS[id];if(!f)continue;const G=f.GL;
  otAddAlternates(G,false);
  /* ss01: m в форме кириллической «м» (у гротесков наоборот — там m=м по умолчанию, ss01 даёт арочную m) */
  f.ss01Name='m в форме «м»';
  if(G['м']){const M=G['м'];G['m.ss01']={shape:M.shape,skel:M.skel,w:M.w,k:'xh',opt:{alt:true,base:'m',feat:'ss01'}};}}
/* кернинг: Линия — общая таблица; Пропись — только пары, где левый знак не соединяется со следующим
   (прописные без выхода, знаки), иначе кернинг разорвал бы связь букв */
if(FONTS.liniya)KERN_TABLE.liniya=KERN_TABLE_BASE;
if(FONTS.propis){const ok=new Set(['T','V','P','F','O','L','Soft','per','hy','gl','qo']);
  KERN_TABLE.propis=KERN_TABLE_BASE.filter(r=>ok.has(r[0]));}
/* шкала веса: Регуляр Линии 86/490, Прописи 92/450 */
WSCALE.liniya=0.557;WSCALE.propis=0.649;
})();
/* веса: для Линии горизонтали пера следуют за вертикалями (монолиния сохраняется),
   для Прописи растёт нажим, волосная почти не меняется */
const _famParamsCore=famParams;
famParams=function(p,wn){const o=_famParamsCore(p,wn);
  if(CUR_FONT==='liniya'){o.hair=Math.round(o.stem*p.hair/p.stem);
    /* ширина: знаки Линии сами раздвигаются на толщину пера (nst·Δstem) — общий масштаб растёт лишь слегка */
    if(p.wdth!=null)o.wdth=Math.round(Math.min(140,Math.max(80,p.wdth*(1+0.05*Math.max(0,o.stem/p.stem-1)-0.02*Math.max(0,1-o.stem/p.stem)))));}
  else if(CUR_FONT==='propis'){const L=FONTS.propis.lim.stem,r=o.stem/p.stem;
    /* шкала нажима Прописи уже (70…120): насыщенности раскладываются внутри неё, иначе Bold и Black совпали бы */
    o.stem=Math.max(L[0],Math.min(L[1],Math.round(({Light:70,Regular:92,Bold:122,Black:134}[wn]||92)*p.stem/92)));/* Bold/Regular ≥ 1.28 с запасом на растр (FX2) */
    o.hair=Math.max(30,Math.round(p.hair*Math.pow(o.stem/p.stem,0.3)));
    if(p.wdth!=null)o.wdth=Math.round(p.wdth*(1+0.04*Math.max(0,o.stem/p.stem-1)));}
  /* скелетные шрифты: насыщенность сразу в пределах шрифта (иначе Сверка сравнивает с недостижимой толщиной) */
  if((CUR_FONT==='liniya'||CUR_FONT==='propis')&&typeof paramLimits==='function')return paramLimits(o,CUR_FONT).q;
  return o;};

/* Линия: j/ј/ĵ — поля как у i, хвост под предыдущую букву */
if(FONTS.liniya)for(const ch of 'jјĵ'){const g=FONTS.liniya.GL[ch];if(g){g.opt=Object.assign({},g.opt,{tailL:1});}}
