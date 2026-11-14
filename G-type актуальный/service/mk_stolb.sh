#!/bin/bash
# builds core_stolb.js from stolb/ parts (same pattern as mk_stsepka.sh)
cd "$(dirname "$0")"
( echo "/* ===== «Столб» (Stolb Display): высокий сжатый гротеск. Части: stolb/engine.js letters.js glyphs.js spacing.js tail.js (сборка mk_stolb.sh) ===== */"; echo "(function(){"; cat stolb/engine.js stolb/letters.js stolb/glyphs.js stolb/spacing.js stolb/tail.js; echo "})();" ) > core_stolb.js
node --check core_stolb.js && echo syntax ok
