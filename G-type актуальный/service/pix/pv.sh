#!/bin/bash
# pv.sh "text|line2" res pw serif out.png [cell]  -> quick cell preview from recipes (no TTF)
cd "$(dirname "$0")/.."
node pix/cellsheet.js "$1" $2 $3 $4 /tmp/pv_$$.json && python3 pix/cellsheet.py /tmp/pv_$$.json "$5" ${6:-8}; rm -f /tmp/pv_$$.json
