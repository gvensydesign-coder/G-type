#!/usr/bin/env bash
# builds core_ryvok_n4.js from parts (body + tail), then assemble
cd "$(dirname "$0")"
cat ryvok_body.js ryvok_tail.js > core_ryvok_n4.js
echo "})();" >> core_ryvok_n4.js
python3 assemble.py | tail -1
