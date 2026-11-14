#!/bin/bash
# builds core_stsepka.js from stsepka/ parts (same pattern as mk_applik.sh)
cd "$(dirname "$0")"
( echo "/* ===== «Сцепка» (Stsepka Display): конструкторные лигатуры, кусками из прямых, один радиус. Части: stsepka/engine.js letters.js glyphs.js spacing.js lig.js api.js tail.js (сборка mk_stsepka.sh) ===== */"; echo "(function(){"; cat stsepka/engine.js stsepka/letters.js stsepka/glyphs.js stsepka/spacing.js stsepka/lig.js stsepka/api.js stsepka/tail.js; echo "})();" ) > core_stsepka.js
node --check core_stsepka.js && echo syntax ok
