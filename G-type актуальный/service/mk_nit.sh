#!/bin/bash
# builds core_nit.js from nit/ parts (same pattern as mk_applik.sh / mk_stolb.sh)
cd "$(dirname "$0")"
( echo "/* ===== «Нить» (Nit): рукописный монолинейный шрифт, штрихи-скелеты + круглое перо. Части: nit/engine.js skel.js tail.js (сборка mk_nit.sh) ===== */"; echo "(function(){"; cat nit/engine.js nit/skel.js nit/tail.js; echo "})();" ) > core_nit.js
node --check core_nit.js && echo syntax ok
