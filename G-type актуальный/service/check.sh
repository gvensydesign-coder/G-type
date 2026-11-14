#!/usr/bin/env bash
# Test runner. usage: ./check.sh fast|slow|release
# fast: build, t10 (10 lib TTF, two parallel node lanes), lib md5, meta-lib (font passport + languages of the lib TTF), strip-tokens, homo, err, t11 (UI), t12 (proof).
# slow: fast set, then fam md5, famcheck, locl, variable fonts (build + fontTools), proof liniya/propis,
#       meta-fam (font passport of the family files), e2e browser checks (pen, import, custom glyph, kerning, export menu, project round-trip,
#       simedit, shell, draw, cells (grid-of-cells tool), jank (frame-level detectors), languages + passport), stress runs.
# release: fast set, then the SAME slow set as a job queue on RELEASE_JOBS parallel workers (default nproc+1), jobs claimed longest-first, dependent lanes wait for
#       their producer (fam/ or logs/vf); every e2e lane that fails is retried once (PASS line says "retry"); prints SUMMARY release with wall time, retried lanes and the slowest 3 jobs.
#       The lean release includes the community section (e2e-comm-1..4 = tests/e2e_comm.py in 4 groups).
#       Target < 40 min on 2 cores (serial slow was > 50 min). slow = the same jobs on one worker without retry (RELEASE_JOBS=1 ./check.sh release is the same plus retry).
# Prints one PASS/FAIL line per check. Full output goes to logs/<check>.log.
# On FAIL the last 20 log lines (cut to 200 chars) are printed under the line.
# Exit status: 0 when every check passes, 1 otherwise.
set -u
cd "$(dirname "$0")"
MODE="${1:-fast}"
case "$MODE" in fast|slow|release) ;; *) echo "usage: $0 fast|slow|release" >&2; exit 2;; esac
T_START=$(date +%s)
RETRY=0; [ "$MODE" = release ] && RETRY=1
# DEEP=1: every stress lane runs all its seeds/runs (slow always; release only with RELEASE_DEEP=1). Lean release: one seed per stress lane, each stress-<font> lane still present.
DEEP=0; { [ "$MODE" = slow ] || [ "${RELEASE_DEEP:-0}" = 1 ]; } && DEEP=1
mkdir -p logs
find logs -mindepth 1 -maxdepth 1 -exec rm -rf {} +   # logs are per run: no stale downloads/screenshots (screenshots only with GT_SHOTS=1)
mkdir -p logs/status logs/time logs/cpu logs/claim
PAGE="$PWD/index.html"

# check NAME COMMAND VERIFY KEY
#   COMMAND runs with bash -c; VERIFY runs with bash -c and stdin = the log file.
#   KEY (optional) runs on the log and its output is appended to the PASS line.
#   The result is also written to logs/status/NAME, so parallel lanes can be counted at the end.
# CPU seconds (user+sys) consumed so far by the children of this shell: the machine may be shared, so lane CPU time (not wall time) is the load-independent cost
cpu_now() { local p=$BASHPID; times > "logs/.times.$p"; CPU_NOW=$(awk 'NR==2{for(i=1;i<=2;i++){split($i,a,"m");sub("s","",a[2]);t+=a[1]*60+a[2]} printf "%.0f",t}' "logs/.times.$p"); rm -f "logs/.times.$p"; }
check() {
  local name="$1" cmd="$2" verify="$3" key="${4:-}"
  local log="logs/${name}.log" rc=0 t0=$(date +%s) tries=0 note="" out
  cpu_now; local c0=$CPU_NOW
  while :; do
    rc=0; bash -c "$cmd" > "$log" 2>&1 || rc=$?
    if [ "$rc" -eq 0 ] && bash -c "$verify" < "$log" > /dev/null 2>&1; then break; fi
    # release: an e2e lane that fails is retried once (browser/timing flakes); the retry is visible in the PASS line and in the summary
    if [ "$RETRY" = 1 ] && [ "$tries" = 0 ] && [[ "$name" == e2e-* ]]; then tries=1; cp "$log" "logs/${name}.first.log"; continue; fi
    break
  done
  [ "$tries" = 1 ] && note=" (retry 1)"
  echo $(( $(date +%s) - t0 )) > "logs/time/$name"; cpu_now; echo $(( CPU_NOW - c0 )) > "logs/cpu/$name"
  if [ "$rc" -eq 0 ] && bash -c "$verify" < "$log" > /dev/null 2>&1; then
    local k=""
    [ -n "$key" ] && k=$(bash -c "$key" < "$log" 2>/dev/null | head -1)
    out="PASS $name ${k}${note}"
    [ "$tries" = 1 ] && echo "$name" >> logs/retried
    echo PASS > "logs/status/$name"
  else
    out="FAIL $name rc=$rc log=$log${note}"$'\n'"$(tail -n 20 "$log" | cut -c1-200 | sed 's/^/    /')"
    echo FAIL > "logs/status/$name"
  fi
  printf '%s\n' "$out"   # one write: lines of parallel lanes do not interleave
}
# need NAME...: wait until the lanes that produce fam/ or logs/vf have finished (they are always claimed before their dependants)
need() { local n; for n in "$@"; do while [ ! -e "logs/status/$n" ]; do sleep 3; done; done; }

# ---- fast (about 2.5 min on 2 cores: t10 and t11/t12 run in parallel lanes) ----
fast() {
  if [ ! -s golden.md5 ]; then
    echo "FAIL preflight golden.md5 missing"; echo FAIL > logs/status/preflight; return
  fi
  check build "python3 assemble.py" \
    "grep -q '^mode=strip' && test -s index.html" \
    "cat"
  grep -qx PASS logs/status/build 2>/dev/null || return
  # lane A: lib TTF build, golden md5 of lib files, token check, homo, error check
  (
    check t10 "bash t10par.sh" \
      "test \$(wc -l < /dev/stdin) -eq \$((2*\$(node fontcount.js)))" \
      "wc -l"
    check lib-md5 "md5sum -c <(grep ' lib-' golden.md5)" \
      "grep -c ': OK\$' | grep -qx \$((2*\$(node fontcount.js))) && ! grep -q FAILED" \
      "grep -c ': OK\$'"
    check meta-lib "python3 tests/meta_check.py lib" \
      "tail -1 | grep -qx 'bad 0'" \
      "tail -2 | head -1"
    check strip-tokens "python3 -c \"import shutil,os,tempfile,subprocess; d=tempfile.mkdtemp(); [shutil.copy(f,d) for f in ['assemble.py','template.html','ui_demos.css','ui_comm.css','ui_heat.css']+[x for x in os.listdir('.') if x.startswith(('core','ui_')) and x.endswith('.js')]]; subprocess.run(['python3','assemble.py','--debug'],cwd=d,check=True,stdout=subprocess.DEVNULL); shutil.copy(os.path.join(d,'index.html'),'logs/debug.html')\" && node --expose-internals strip_tokens.js logs/debug.html index.html" \
      "grep -q 'mismatches 0'" \
      "grep 'mismatches'"
    check serif-pix "node pix/serifcheck.js" \
      "tail -1 | grep -qx 'bad 0'" \
      "tail -1"
    check homo "node homo.js" \
      "awk '/^fonts /{n=\$2;next} {c++; if(\$0 !~ / ok\$/)b++} END{exit !(n>0&&c==n&&!b)}'" \
      "wc -l"
    check err "python3 err.py $PAGE" \
      "tail -1 | grep -qx '\[\]'" \
      "tail -1"
  ) &
  # lane B: UI smoke (t11q = t11 without the in-page TTF build, which t10 covers), proof of the 3 base fonts
  (
    check t11 "python3 t11q.py $PAGE" \
      "tail -1 | grep -qx 'errors \[\]'" \
      "tail -1"
    check t12 "python3 t12.py $PAGE" \
      "test \$(grep -cE '^(volt|kvadra|stroka|codex) 0 \{\}\$' /dev/stdin) -eq 4" \
      "grep -cE '^(volt|kvadra|stroka|codex) 0 '"
    check proof-stroka "python3 t12p.py $PAGE stroka" \
      "grep -cE '^stroka (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^stroka (regular|italic) [A-Za-z]+ 0 '"
    check proof-rotunda "python3 t12p.py $PAGE rotunda" \
      "grep -cE '^rotunda (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^rotunda (regular|italic) [A-Za-z]+ 0 '"
    check deco-quick "node deco_make_d1.js $PWD/logs/deco_q modul outline,shadow_solid,cameo && python3 tests/deco_check.py $PWD/logs/deco_q modul outline,shadow_solid,cameo" \
      "tail -1 | grep -q '^PASS deco_check'" "tail -1 | cut -c1-100"
    check proof-kaplya "python3 t12p.py $PAGE kaplya" \
      "grep -cE '^kaplya (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^kaplya (regular|italic) [A-Za-z]+ 0 '"
    check proof-ryvok "python3 t12p.py $PAGE ryvok" \
      "grep -cE '^ryvok (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^ryvok (regular|italic) [A-Za-z]+ 0 '"
    check proof-applik "python3 t12p.py $PAGE applik" \
      "grep -cE '^applik (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^applik (regular|italic) [A-Za-z]+ 0 '"
    check proof-stsepka "python3 t12p.py $PAGE stsepka" \
      "grep -cE '^stsepka (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^stsepka (regular|italic) [A-Za-z]+ 0 '"
    check proof-nit "python3 t12p.py $PAGE nit" \
      "grep -cE '^nit (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^nit (regular|italic) [A-Za-z]+ 0 '"
    check proof-tyaga "python3 t12p.py $PAGE tyaga" \
      "grep -cE '^tyaga (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^tyaga (regular|italic) [A-Za-z]+ 0 '"
    check proof-kortes "python3 t12p.py $PAGE kortes" \
      "grep -cE '^kortes (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^kortes (regular|italic) [A-Za-z]+ 0 '"
    check proof-stolb "python3 t12p.py $PAGE stolb" \
      "grep -cE '^stolb (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^stolb (regular|italic) [A-Za-z]+ 0 '"
    check proof-pixel "python3 t12p.py $PAGE pixel" \
      "grep -cE '^pixel (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^pixel (regular|italic) [A-Za-z]+ 0 '"
    check proof-renessa "python3 t12p.py $PAGE renessa" \
      "grep -cE '^renessa (regular|italic) [A-Za-z]+ 0 ' | grep -qx 8" \
      "grep -cE '^renessa (regular|italic) [A-Za-z]+ 0 '"
  ) &
  wait
}

# ---- slow / release: job list; each job = one function (one or a few lanes), claimed by a pool of workers ----
# granularity matters: no single job may be longer than ~1/6 of the total, otherwise one worker carries the tail (shards: deco-geom 5, stress per seed/run, vfax per font)
j_deco() { local n="$1" fonts="$2" cmd="" f i v
  # all fonts x 7 variants in slow / RELEASE_DEEP=1; lean release: every font builds 2 of the 7 variants (font index i -> i, i+3 mod 7), so every variant is still built for ~5 fonts and every font is built
  if [ "$DEEP" = 1 ]; then cmd="node deco_make_d1.js $PWD/logs/deco$n $fonts"
  else local ALL=(volt kvadra stroka codex liniya propis ustav rotunda modul ryvok renessa applik stsepka stolb nit tyaga kortes) V=(outline inline_in inline_out shadow_block shadow_solid shadow_hatch cameo)
    for f in ${fonts//,/ }; do for i in "${!ALL[@]}"; do [ "${ALL[$i]}" = "$f" ] && break; done
      cmd+="node deco_make_d1.js $PWD/logs/deco$n $f ${V[$((i%7))]},${V[$(((i+3)%7))]} && "; done; fi
  check "deco-geom-$n" "${cmd}python3 tests/deco_check.py $PWD/logs/deco$n" \
    "tail -1 | grep -q '^PASS deco_check'" "tail -1 | cut -c1-120"; }
j_fam() { check fam-md5 "node -r ./fixed_clock.js fam.js && md5sum -c <(grep ' fam/' golden.md5)" \
    "grep -c ': OK\$' | grep -qx \$((8*\$(node fontcount.js))) && ! grep -q FAILED" \
    "grep -c ': OK\$'"; }
j_famc() { need fam-md5
  check famcheck "python3 famcheck.py" "tail -1 | grep -qx 'bad 0'" "tail -1"
  check meta-fam "python3 tests/meta_check.py fam" "tail -1 | grep -qx 'bad 0'" "tail -2 | head -1"
  check locl "python3 loclcheck.py fam/VoltGrotesk-Regular.ttf" "tail -1 | grep -q ' OK\$'" "tail -1"; }
VFIDS=volt,kvadra,stroka,codex,liniya,pixel,renessa,propis,rotunda,ustav,nit,tyaga,kortes   # 13 fonts x 2 styles
j_vfb() {
  # fixed clock: the VF files of the three newest fonts have golden md5 (golden.md5 lines «vf/...»)
  check vf-build "node -r ./fixed_clock.js vf.js $VFIDS $PWD/logs/vf" "grep -c ' glyphs ' | grep -qx 26" "grep -c ' glyphs '"; }
j_vfc() { need vf-build fam-md5
  check vf-check "python3 vfcheck.py $PWD/logs/vf $PWD/fam" "tail -1 | grep -qx 'bad 0'" "tail -1"
  check vf-md5 "cd logs && md5sum -c <(grep ' vf/' ../golden.md5)" "grep -c ': OK\$' | grep -qx 6 && ! grep -q FAILED" "grep -c ': OK\$'"; }
j_vff() { need vf-build fam-md5
  # OpenType in the VF of the new fonts, HarfBuzz in Chromium: Tyaga ~ -> .s1-.s5 (calt/liga/clig each alone, widths at wght 400/900 == static), Kortes calt swashes, kern
  check vf-feat "python3 tests/vf_feat_check.py $PWD/logs/vf $PWD/fam" "tail -1 | grep -q '^PASS vffeat '" "tail -1 | cut -c1-120"; }
j_vfl() { need vf-build fam-md5
  # Liniya fold-back loop detector (e-family, bowl/bar joins) on static weights + VF instances
  check liniya-loop "python3 tests/liniya_loop_check.py $PWD/fam $PWD/logs/vf" "tail -1 | grep -q ' bad 0\$'" "tail -1"
  # pixel VF (pix/vf.js: fixed Regular cell topology, weight = outline offset; single wght axis, so no vfax line): structure, gvar, in-between geometry, instances vs static family
  check vf-pixel "python3 tests/pxvf_check.py $PWD/logs/vf $PWD/fam" "tail -1 | grep -q '^PASS pxvf '" "tail -1 | cut -c1-120"; }
j_vfax() {
  # variable axes (core_vfx.js): wght+wdth+opsz+slnt VF per font (regular), instancer vs static builds at 38 points, topology at 20 random points
  check vfax-build "STY=regular node vf.js volt,kvadra,stroka,codex,liniya $PWD/logs/vfax wght,wdth,opsz,slnt && STY=regular node vf.js renessa $PWD/logs/vfax wght,wdth,opsz" \
    "awk '/ glyphs /{n++} /dropped [a-z]/{d++} END{exit !(n==6&&d==0)}'" "grep -c ' glyphs '"
  # Tyaga: wght+opsz+slnt (wdth fails the probe: incompatible masters; Nit and Kortes stay wght-only, covered by vf-build/vf-check/vf-feat)
  check vfax-build-tyaga "STY=regular node vf.js tyaga $PWD/logs/vfax wght,opsz,slnt" \
    "awk '/ glyphs /{n++} /dropped [a-z]/{d++} END{exit !(n==1&&d==0)}'" "grep -c ' glyphs '"; }
j_vfaxc() { need vfax-build vfax-build-tyaga
  check "vfax-check-$1" "node vfstatic.js $1 $PWD/logs/vfst_$1 && python3 tests/vf_axes_check.py $PWD/logs/vfax/$1-regular-VF.ttf $PWD/logs/vfst_$1 $PWD/logs/vfi_$1" \
    "tail -1 | grep -q ' OK\$'" "tail -1 | cut -c1-120"; }
j_misc() {
  check ot-check "python3 tests/ot_check.py" "tail -1 | grep -q '^PASS ot '" "tail -1"
  check ext-marks "node tests/ext_marks_check.js" "tail -1 | grep -qx 'bad 0'" "tail -1"
  check stress-cover "node tests/stress_cover.js check.sh" "tail -1 | grep -qx 'bad 0'" "head -1 | cut -c1-120"
  check proof-lp "python3 t12p.py $PAGE liniya,propis,ustav,modul" \
    "grep -cE '^(liniya|propis|ustav|modul) (regular|italic) [A-Za-z]+ 0 ' | grep -qx 32" \
    "grep -cE '^(liniya|propis|ustav|modul) (regular|italic) [A-Za-z]+ 0 '"; }
j_uw() {
  # uniwidth family: equal advances in every weight + italic, 40 critical pairs without collisions; golden md5 of the uniwidth outputs
  check uniwidth "node -r ./fixed_clock.js famuw.js volt,kvadra,stroka,codex,liniya,renessa $PWD/famuw && python3 tests/uniwidth_check.py $PWD/famuw VoltGrotesk && python3 tests/uniwidth_check.py $PWD/famuw KvadraSans && python3 tests/uniwidth_check.py $PWD/famuw StrokaSans && python3 tests/uniwidth_check.py $PWD/famuw CodexUncial && python3 tests/uniwidth_check.py $PWD/famuw Liniya && python3 tests/uniwidth_check.py $PWD/famuw RenessaSerif" \
    "grep -c '^uniwidth_check pairs 40 bad 0' | grep -qx 6" "grep -c '^uniwidth_check pairs 40 bad 0'"
  check uw-md5 "md5sum -c <(grep ' famuw/' golden.md5)" "grep -c ': OK\$' | grep -qx 48 && ! grep -q FAILED" "grep -c ': OK\$'"; }
# e2e checks (tests/e2e_*.py; e2e draw prints 4 PASS lines: draw, grids, phone, assist): one PASS/FAIL line each, each on its own fresh browser
# the lane passes when the script printed no FAIL line and at least one PASS line of its name (e2e profile prints profile_* lines only); a hung browser is killed after 25 min (counts as a failure, retried once in release)
# GT_REDUCED=1 (tests/common.py Session: prefers-reduced-motion) for every lane that does not test animation: the home mesh/ribbon otherwise burns ~1 core on every idle wait (reduced CPU of a lane by ~20 %)
ANIM=" motion jank perf demos demos_v81 demo_text home_v83 hero "
e2e() { local rm=1; [[ "$ANIM" == *" $1 "* ]] && rm=0; check "e2e-$1" "GT_REDUCED=$rm timeout 1500 python3 tests/e2e_$1.py" "awk '/^FAIL /{f=1} /^PASS $1/{p=1} END{exit !(p&&!f)}'" "grep -E '^(PASS|FAIL) ' | head -1 | cut -d' ' -f3-"; }
E2E="pen import custom kern export formats project trace simedit shell draw tester lang deco ot vfx vfnew pixel icons rows panes pxvf rail focus xform overflow dwgrid motion profile stsepka tyaga kortes cond tools cells demos covers share jank proof_fix autokern demos_v81 home_v83 fhint perf demo_text drafts pills heat under"
j_e2e() { [ "$1" = vfnew ] && need fam-md5; e2e "$1"; }
# e2e_comm (section «Сообщество»): one lane per group of its checks (tests/e2e_comm.py <check names>), so the 18 checks run in parallel in the lean release too; the lane passes when it printed no FAIL and one PASS per requested check
j_comm() { local n="$1"; shift; check "e2e-comm-$n" "timeout 1500 python3 tests/e2e_comm.py $*" "awk -v k=$# '/^FAIL /{f=1} /^PASS comm_/{p++} END{exit !(p==k&&!f)}'" "grep -cE '^PASS comm_' | sed 's/\$/ checks/'"; }
# sr FONT LABEL COMMAND: one stress run = one lane stress-FONT-LABEL (a TOTAL line with bad 0)
sr() { check "stress-$1-$2" "$3" "grep -E '^TOTAL' | grep -q 'bad 0\$'" "grep -E '^TOTAL' | tail -1"; }
j_sr() { sr "$@"; }
j_kern() { check kern-tyaga "node kern_tyaga.js 12" "grep -q 'bad 0\$'" "tail -1"; }
j_s150() { local font="$1" seed seeds="1"; [ "$DEEP" = 1 ] && seeds="1 5 9"; for seed in $seeds; do sr "150-$font" "$seed" "node stress.js $N150 $font regular,italic $seed"; done; }   # lanes stress-150-<font>-<seed>
# lean release (DEEP=0) keeps EVERY stress lane, font and seed 1, but with fewer random combos (each lane name stays the same; the TOTAL line shows the combo count); RELEASE_DEEP=1 / slow = the full counts
if [ "$DEEP" = 1 ]; then N150=150; N150F=150; NPR=150; N80=80; N60=60; N100=100; N40=40; F40=volt,kvadra,stroka,codex,liniya,propis,ustav,rotunda,modul,ryvok,renessa; else N150=30; N150F=30; NPR=15; N80=20; N60=12; N100=25; N40=40; F40=liniya,ustav,modul,rotunda; fi   # lean stress-40-all: the fonts without a 150-run lane of their own + rotunda (@), all 31 named extreme combos
# order = claim order (longest first, producers before their dependants)
JOBS=("j_deco 1 volt,kvadra,stroka,codex" "j_deco 2 liniya,propis,ustav,rotunda" "j_deco 3 modul,ryvok,renessa,applik,stsepka" "j_deco 4 tyaga,kortes" "j_deco 5 stolb,nit" j_fam j_vfb j_vfax
  "j_sr kaplya 1 node~stress_kaplya.js~$N150~regular,italic~1" "j_sr kaplya pres node~stress_kaplya.js~pres~regular,italic~1"
  "j_sr tyaga ext node~stress_tyaga.js~ext" "j_sr tyaga 60-1 node~stress_tyaga.js~60~1" j_kern
  "j_sr kortes 32-1 node~stress_kortes.js~32~1" "j_sr kortes 20-2 node~stress_kortes.js~20~2"
  "j_sr nit 60-1 node~stress_nit.js~$N60~1" "j_sr nit pres node~stress_nit.js~pres"
  "j_sr stsepka 80-1 node~stress_stsepka.js~$N80~1" "j_sr stsepka pres node~stress_stsepka.js~pres"
  "j_sr stolb 80-1 node~stress_stolb.js~$N80~1" "j_sr stolb pres node~stress_stolb.js~pres"
  "j_sr applik 100-1 node~stress_applik.js~$N100~1" "j_sr applik pres node~stress_applik.js~pres"
  j_famc j_vfc j_vff j_vfl "j_vfaxc volt" "j_vfaxc kvadra" "j_vfaxc stroka" "j_vfaxc codex" "j_vfaxc liniya" "j_vfaxc renessa" "j_vfaxc tyaga" j_uw j_misc
  "j_s150 volt" "j_s150 kvadra" "j_s150 stroka" "j_s150 codex")
for f in rotunda propis ryvok renessa pixel; do n=$N150F; [ $f = propis ] && n=$NPR; JOBS+=("j_sr $f 150-1 node~stress.js~$n~$f~regular,italic~1" "j_sr $f pres node~stress.js~pres~$f~regular,italic~1"); done
if [ "$DEEP" = 1 ]; then   # second/third seeds (the lean release keeps seed 1 + pres of every stress lane)
  JOBS+=("j_sr kaplya 2 node~stress_kaplya.js~150~regular,italic~2" "j_sr kaplya 3 node~stress_kaplya.js~150~regular,italic~3" "j_sr tyaga 60-2 node~stress_tyaga.js~60~2" "j_sr nit 60-2 node~stress_nit.js~60~2"
        "j_sr stsepka 80-2 node~stress_stsepka.js~80~2" "j_sr stolb 80-2 node~stress_stolb.js~80~2" "j_sr applik 100-2 node~stress_applik.js~100~2")
  for f in rotunda propis ryvok renessa pixel; do JOBS+=("j_sr $f 150-2 node~stress.js~150~$f~regular,italic~2"); done
fi
JOBS+=("j_sr pres all node~stress.js~pres" "j_sr 40 all node~stress.js~$N40~$F40~regular~1")   # deep F40 = node stress.js 40 volt,kvadra,stroka,codex,liniya,propis,ustav,rotunda,modul,ryvok,renessa regular 1
# lean release: only the font / file e2e lanes (LEAN_E2E: import, export, project, VF export, deco, OpenType, pixel, tyaga, kortes, stsepka ...); every other e2e lane (editor tools, UI shell/layout, demos, motion, jank, perf ...) runs in slow / RELEASE_DEEP=1 and is run by hand (each lane prints its own PASS line). A browser lane costs ~100 CPU-s: 45 lanes were > 70 CPU-min on their own
# e2e_comm (18 checks, 7m50s serial) is in the lean release too, as 4 lanes of ~2 min each (measured per check: layout 73, space 56, demos 47, covers 45, system 38, geo 30, pop 29, cta 25, progress 25, lazy 24, ratio 14, chall 13, lessons 12, pause 10, router 10, fav 9, article 8, reduced 5 s)
JOBS+=("j_comm 1 comm_layout comm_covers comm_nav" "j_comm 2 comm_space comm_demos comm_article" "j_comm 3 comm_system comm_geo comm_pop comm_fav comm_pause" "j_comm 4 comm_cta comm_progress comm_lazy comm_ratio comm_chall comm_lessons comm_router comm_reduced")
LEAN_E2E=" import custom export formats project vfnew deco ot pixel pxvf stsepka tyaga kortes drafts pills heat under "
for e in $E2E; do [ "$DEEP" != 1 ] && [[ "$LEAN_E2E" != *" $e "* ]] && continue; JOBS+=("j_e2e $e"); done
worker() { local i=0 job; for job in "${JOBS[@]}"; do
    i=$((i+1)); mkdir "logs/claim/$i" 2>/dev/null || continue
    # j_sr args: font label cmd (the command words are joined with ~ so a job is one string)
    set -- $job; if [ "$1" = j_sr ]; then j_sr "$2" "$3" "$(echo "$4" | tr '~' ' ')"; else $job; fi
  done; }
slow() {
  fast
  # slow = release without retry on one worker (override: RELEASE_JOBS=n); release: nproc+1 workers
  local nw="${RELEASE_JOBS:-}"; [ -z "$nw" ] && { [ "$MODE" = release ] && nw=$(( $(nproc) + 1 )) || nw=1; }
  local w pids=(); for ((w=0; w<nw; w++)); do worker & pids+=($!); done
  wait "${pids[@]}"
}

if [ "$MODE" = fast ]; then fast; else slow; fi
TOTAL=$(ls logs/status | wc -l)
FAILS=$(grep -l FAIL logs/status/* 2>/dev/null | wc -l)
WALL=$(( $(date +%s) - T_START ))
EXTRA=""
if [ "$MODE" = release ]; then
  RT=$( [ -s logs/retried ] && sort -u logs/retried | tr '\n' ' ' || echo none )
  TOP=$(for f in logs/time/*; do echo "$(cat "$f") $(basename "$f")"; done | sort -rn | head -3 | awk '{printf "%s=%ds ", $2, $1}')
  CPU=$(cat logs/cpu/* 2>/dev/null | awk '{s+=$1} END{printf "%d", s}')   # CPU seconds of all lanes: wall on an idle N-core machine ~ CPU/N (+ the longest chain)
  EXTRA=" wall=$((WALL/60))m$((WALL%60))s cpu=$((CPU/60))m load=$(cut -d' ' -f1 /proc/loadavg) retried=[${RT% }] slowest(wall): ${TOP% }"
fi
echo "SUMMARY $MODE checks=$TOTAL fail=$FAILS${EXTRA}"
[ "$FAILS" -eq 0 ]
