#!/bin/bash
# builds core_pixel_p1.js from pix/ parts (limits table generated from the recipes), then assemble
cd "$(dirname "$0")"
if [ -z "$SKIPLIM" ]; then node pix/gen_limits.js table > pix/limits.json.tmp && mv pix/limits.json.tmp pix/limits.json || exit 1; fi  # SKIPLIM=1 reuses pix/limits.json (the table takes ~2 min)
RMIN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('pix/limits.json','utf8')).rmin)")
LIM=$(node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('pix/limits.json','utf8')).table))")
( echo "/* ===== «Пиксель» (Pixel Grid): шрифт на клеточной сетке. Части: pix/engine.js glyphs1-5.js render.js reg.js (сборка mk_pixel.sh; таблица пределов насыщенности pix/limits.json генерируется из рецептов) ===== */"
  echo "(function(){"
  cat pix/engine.js pix/glyphs1.js pix/glyphs2.js pix/glyphs3.js pix/glyphs4.js pix/glyphs5.js pix/render.js pix/alts.js
  sed -e "s#/\*RMIN\*/6#$RMIN#" -e "s#/\*LIMITS\*/{}#$LIM#" pix/reg.js
  cat pix/vf.js
  echo "})();" ) > core_pixel_p1.js
