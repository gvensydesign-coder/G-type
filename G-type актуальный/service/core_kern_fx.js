/* ===== FIX-ENGINE: per-font kerning hooks for Kvadra, Volt, Liniya, Codex, Renessa, Propis, Rotunda, Ustav, Pixel =====
   Stroka had its own hooks (kernGap / kernD / kernF / kcL / kernRows, core12s). The other fonts shared the base table with the default depth (0.9 stem),
   strength and the 150-unit cap: 35-50 pairs ended on one clamp value, diagonals stayed 2-4x looser than the font's own n-n gap, T-O / A-U / D-A / «A were over-tight.
   Hooks (core15): FONTS[id].kernD (depth of the white-area window in stems), kernF (strength), kernMax (cap, default 150),
   kernMin={f,cap,fl,sp} (capital-capital pairs: closest approach = f x H-H gap, at most cap units tighter than unkerned, floor fl x H-H gap everywhere, ceiling sp x word space).
   Values are tuned by tools/kmeasure.py on the built TTFs (KERN_FX_LOG in FIX_ENGINE.md). */
(function(){
if(typeof KERN_TABLE==='undefined'||typeof KERN_TABLE_BASE==='undefined')return;
/* new classes: Д (feet) before A; Л before T Y U V Ч; shared by all fonts of this file (names are new, the base classes are untouched) */
Object.assign(KC_L,{fxDc:'ДЉ',fxLs:'Л'});
Object.assign(KC_R,{fxCh:'ЧЦ',fxJa:'я'});
const EXTRA=[['fxDc','A',1],['fxDc','V',0.6],['fxLs','T',1],['fxLs','Y',1],['fxLs','U',1],['fxLs','V',1],['fxLs','fxCh',1],['T','fxJa',0.5],['Y','fxJa',0.5],['P','fxJa',0.5],['d7','per',1]];
const FX={
  volt:   {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  kvadra: {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  liniya: {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  codex:  {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  renessa:{kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  rotunda:{kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  ustav:  {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  pixel:  {kernMin:{f:1,cap:116,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:232},
  nit:    {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},/* «Нить»: тонкая линия, поля уже оптические (профиль 12 полос) — кернинг добирает диагонали и открытые пары */
  tyaga:  {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},/* «Тяга»: кернинг собственный (classKernTable в core_tyaga.js); запись нужна только пределам исключений */
  kortes: {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},/* «Кортес»: кернинг собственный (classKernTable в core_kortes.js); запись нужна только пределам исключений */
  propis: {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  /* integration: Модуль lost its cap-pair targets when the lowercase twins joined the capital classes (class medians moved) — the same kernMin rule restores them */
  modul:  {kernMin:{f:1,cap:200,fl:0.85,sp:0.78},kernD:2.6,kernF:0.85,kernMax:320},
  /* Рывок: kernBody (body-only area rule for the blades) stays; kernMin.body=1 additionally gives the cap-cap closest approach and the word-space ceiling */
  ryvok:  {kernMin:{f:1,cap:300,fl:0.85,sp:0.78,body:1},kernD:2.6,kernF:0.85,kernMax:400}
};
/* Renessa: Т и Г стоят в двух левых классах (T и Tc); в GPOS побеждает последний, поэтому у Tc должны быть все строки T (ГА, ТО, ТУ … были без кернинга) */
if(KERN_TABLE.renessa){const have=new Set(KERN_TABLE.renessa.map(r=>r[0]+'|'+r[1]));
  KERN_TABLE.renessa=KERN_TABLE.renessa.concat(KERN_TABLE_BASE.filter(r=>r[0]==='T'&&!have.has('Tc|'+r[1])).map(r=>['Tc',r[1],r[2]]));}
for(const id in FX){const F=FONTS[id];if(!F)continue;Object.assign(F,FX[id]);
  if(KERN_TABLE[id]&&id!=='propis'){/* Propis: only non-connecting left classes stay in its table */
    const have=new Set(KERN_TABLE[id].map(r=>r[0]+'|'+r[1]));
    KERN_TABLE[id]=KERN_TABLE[id].concat(EXTRA.filter(r=>!have.has(r[0]+'|'+r[1])));}}
})();
