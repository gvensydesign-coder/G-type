#!/bin/bash
# builds core_applik.js from applik/ parts (same pattern as mk_kaplya.sh)
cd "$(dirname "$0")"
( echo "/* ===== «Аппликация» (Applikatsiya Paper): детская бумажная аппликация, куски-многоугольники + зерно по id знака. Части: applik/engine.js build.js glyphs.js api.js (сборка mk_applik.sh) ===== */"; echo "(function(){"; cat applik/engine.js applik/build.js applik/glyphs.js applik/glyphs2.js applik/api.js applik/tail.js; echo "})();" ) > core_applik.js
node -e "require('./core_applik.js');console.log('load ok', Object.keys(APPLIK.REC).length,'recipes')"
