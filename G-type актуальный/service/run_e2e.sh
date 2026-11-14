#!/bin/bash
cd "$(dirname "$0")"
for l in "$@"; do
  arg=""; [ "$l" = kaplya ] && arg="$PWD/index.html"
  timeout 900 python3 tests/e2e_$l.py $arg > logs/e2e/$l.log 2>&1; rc=$?
  echo "$l rc=$rc $(grep -E '^(PASS|FAIL)' logs/e2e/$l.log | head -1 | cut -c1-150)" >> logs/e2e/summary.txt
done
echo DONE >> logs/e2e/summary.txt
