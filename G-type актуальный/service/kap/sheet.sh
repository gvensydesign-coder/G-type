#!/bin/bash
# usage: sheet.sh Weight out.png
W=$1; OUT=$2
i=0; files=""
for t in "abcdefghijklm" "nopqrstuvwxyz" "ABCDEFGHIJKLM" "NOPQRSTUVWXYZ" "АБВГДЁЖЗИЙКЛМ" "НОПРСТУФХЦЧШЩ" "ЪЫЬЭЮЯабвгдеёж" "зийклмнопрстуф" "хцчшщъыьэюя" "0123456789" ".,:;!?-–—()/&№«»“”„…−"; do
  node test.js "$t" $W /tmp/row_$i.json >/dev/null; files="$files /tmp/row_$i.json"; i=$((i+1)); done
python3 - $files <<PY
import sys
exec(open('render.py').read().split("if __name__")[0])
render(sys.argv[1:],'$OUT',scale=0.2)
PY
