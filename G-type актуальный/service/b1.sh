#!/bin/bash
# b1.sh font  -> assemble + lib build of one font into lib_out/
cd "$(dirname "$0")"; mkdir -p lib_out
python3 assemble.py >/dev/null && node -r ./fixed_clock.js t10lib.js lib_out "$1"
