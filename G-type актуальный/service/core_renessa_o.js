/* ===== Ренесса: OT-цифры (onum/tnum/pnum/sups/frac/subs) — базовые цифры лайнинг; фигуры, валюта, дробная черта, порядковые; без капители, лигатур и росчерков ===== */
(()=>{const F=FONTS.renessa;if(!F||F._otoDone)return;F._otoDone=true;OTO.IDS.push('renessa');OTO.CFG.renessa={hx:1,wx:1,dd:0.95,sbx:0,ssw:0.95,shw:0.95};otoAddFigures('renessa');otoAddCurrency('renessa');otoAddBar('renessa');otoAddOrd('renessa');})();

/* Ренесса: кернинг (хуки core15: kernGap / kernD / kernF / kcL / kcR). Таблица базовая плюс строки для засечек и кириллицы; значения измеряются по контурам при экспорте */
(function(){const F=FONTS.renessa;if(!F||F._kernDone||typeof KERN_TABLE==='undefined'||typeof KERN_TABLE_BASE==='undefined')return;F._kernDone=true;
  F.kernGap=26;F.kernD=1.5;F.kernF=0.85;
  F.kcL={Ls:'Лл',Tc:'ТГ',Ch:'Чч',Yc:'УЎуўү',Za:'З3'};
  F.kcR={Ls:'ЛД',Tc:'ТГ',Ch:'ЧЦ',Hd:'Ъ',st:'HNMEFBDKRILPUhnmrbkpиийкмнпцчшщвгьыэюяБВГЕИКНПРШЬЫ'};
  const extra=[['T','st',0.3],['Y','st',0.4],['V','st',0.25],['Ls','v',1.4],['Ls','Y',1],['Ls','T',0.5],['ls','v',1.4],['O','Ls',0.4],['o','ls',0.3],['Tc','o',0.8],['Tc','v',0.8],['Tc','per',0.75],['Tc','hy',0.7],['Tc','gr',0.7]];
  KERN_TABLE.renessa=KERN_TABLE_BASE.concat(extra);
})();

/* Ренесса: оси вариативного шрифта — wght, wdth, opsz (ось slnt не проходит сверку со статикой: диагонали и засечки при наклоне перестраиваются) */
if(typeof VFX_FONT_AXES==='object')VFX_FONT_AXES.renessa=['wght','wdth','opsz'];
