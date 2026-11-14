#!/bin/bash
# builds core_kortes.js from kortes/ parts (same pattern as mk_tyaga.sh): the R1 generator (k_*.js, unchanged geometry) + product tail
cd "$(dirname "$0")"
( echo "/* ===== «Кортес» (Kortes): тяжёлая антиква с клиновидными засечками и росчерками R/Я. Части: kortes/k_core.js k_letters.js k_more.js k_r2.js k_ext.js k_extra.js pairs.js tail.js (сборка mk_kortes.sh) ===== */"; echo "(function(){"; cat kortes/k_core.js kortes/k_letters.js kortes/k_more.js kortes/k_r2.js kortes/k_ext.js kortes/k_extra.js kortes/pairs.js kortes/tail.js; echo "})();" ) > core_kortes.js
node --check core_kortes.js && echo syntax ok
