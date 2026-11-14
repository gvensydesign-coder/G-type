#!/bin/bash
# sheets.sh: key sheets into qa_PX (3 resolutions x 4 weights)
cd "$(dirname "$0")/.."
for r in 8 12 16; do
  for w in Light Regular Bold Black; do node pix/mkttf.js qa_PX/r${r}_$w.ttf regular $w "{\"res\":$r}" >/dev/null & done; wait
  c=$([ $r = 8 ] && echo 4 || ([ $r = 12 ] && echo 3 || echo 2)); u=$((700/r))
  python3 pix/render_sheet.py qa_PX/w$r.png $(( (c*1000+u/2)/u )) qa_PX/r${r}_Light.ttf qa_PX/r${r}_Regular.ttf qa_PX/r${r}_Bold.ttf qa_PX/r${r}_Black.ttf
done
