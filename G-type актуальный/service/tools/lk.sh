#!/bin/bash
# lk.sh font chars thr : rebuild fam for font and print kinks (Regular, Black, BlackItalic)
cd "$(dirname "$0")/.."; python3 assemble.py >/dev/null; node -r ./fixed_clock.js fam.js $1 >/dev/null 2>&1
F=$(ls fam | grep -i "^$2-Regular.ttf" | head -1)
for w in Regular Light Bold Black BlackItalic Italic; do echo "== $w"; python3 tools/kinks.py fam/$3-$w.ttf "$4" ${5:-8}; done
