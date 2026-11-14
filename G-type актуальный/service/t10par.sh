#!/usr/bin/env bash
# t10 in two parallel lanes: propis (slowest, alone) and the other five fonts.
# Same output as t10.js: one "font style name weight psName bytes glyphs" line per TTF, 30 lines.
cd "$(dirname "$0")"
node -r ./fixed_clock.js t10lib.js . propis & p=$!
( for f in volt kvadra stroka codex liniya ustav rotunda modul ryvok kaplya pixel renessa applik stsepka stolb nit tyaga kortes; do node -r ./fixed_clock.js t10lib.js . "$f" || exit 1; done ) & q=$!
wait "$p"; rp=$?
wait "$q"; rq=$?
exit $(( rp || rq ))
