#!/bin/bash
# dev build: concatenates core files in assemble.py order (unstripped) into dev_all.js (no UI)
cd "$(dirname "$0")"
./mk_stolb.sh >/dev/null
./mk_nit.sh >/dev/null
./mk_tyaga.sh >/dev/null
./mk_kortes.sh >/dev/null
python3 - <<'PY'
import re
s=open('assemble.py').read()
m=re.search(r"^files = (\[.*?\])",s,re.S|re.M)
files=eval(m.group(1))
open('dev_all.js','w').write('\n'.join(open(f).read() for f in files))
PY
