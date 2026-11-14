#!/bin/bash
# builds core_tyaga.js from tyaga/ parts (same pattern as mk_nit.sh); tyaga/ext.js (extended set) is inlined into engine.js at //@@EXT@@
cd "$(dirname "$0")"
( echo "/* ===== «Тяга» (Tyaga): растягиваемые монолинейные капители. Части: tyaga/engine.js ext.js tail.js (сборка mk_tyaga.sh) ===== */"; echo "(function(){"; python3 -c "
import sys
e=open('tyaga/engine.js',encoding='utf-8').read();x=open('tyaga/ext.js',encoding='utf-8').read()
sys.stdout.write(e.replace('//@@EXT@@',x))"; cat tyaga/tail.js; echo "})();" ) > core_tyaga.js
node --check core_tyaga.js && echo syntax ok
