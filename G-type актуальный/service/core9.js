/* ===== Чистые вариации: прямые, ровные, без шероховатости и скосов ===== */
/* Одинаковые по форме буквы кириллицы и латиницы — один и тот же знак во всех шрифтах */
(function(){const MAP={'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i','ј':'j','ѕ':'s','І':'I','Ј':'J','Ѕ':'S'};
  const seen=new Set();
  for(const id in FONTS){const G=FONTS[id].GL;if(seen.has(G))continue;seen.add(G);
    for(const cy in MAP){const la=MAP[cy];if(G[cy]&&G[la])G[cy]=G[la];}}
})();
/* Латинские m, n, r повторяют кириллические м, п, г во всех шрифтах */
(function(){const MAP={'m':'м'};const seen=new Set();
  for(const id in FONTS){const G=FONTS[id].GL;if(seen.has(G))continue;seen.add(G);
    for(const la in MAP){const cy=MAP[la];if(G[cy]&&G[la])G[la]=G[cy];}}})();
