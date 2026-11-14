#!/bin/bash
# builds core_kaplya.js from kap/ parts, then assemble
cd "$(dirname "$0")"
( echo "/* ===== «Капля» (Kaplya Drop): поле капсул + гладкое объединение, изоконтур, Безье. Части: kap/engine.js build.js glyphs.js api.js tail.js (сборка mk_kaplya.sh) ===== */"; echo "(function(){"; cat kap/engine.js kap/build.js kap/glyphs.js kap/api.js kap/tail.js; echo "})();" ) > core_kaplya.js
