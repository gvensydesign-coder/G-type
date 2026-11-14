#!/bin/bash
# keys.sh text out
T="$1"; O="$2"; f=""
for w in Light Regular Bold Black; do node test.js "$T" $w /tmp/k_$w.json >/dev/null; f="$f /tmp/k_$w.json"; done
python3 - $f <<PY
import sys
exec(open('render.py').read().split("if __name__")[0])
render(sys.argv[1:],'$O',scale=0.3)
PY
