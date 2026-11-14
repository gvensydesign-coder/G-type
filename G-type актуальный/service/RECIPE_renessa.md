# Ренесса (Renessa Serif, id `renessa`) — recipe

Old-style (Renaissance) antiqua, Cyrillic + Latin, regular + italic, Light/Regular/Bold/Black. ParaType: Антиква · старого стиля. Tags `serif renais wpen text cl vf`, year 1495 (style epoch, like Rotunda 1719). Italic = the same skeleton slanted 9° with optical compensation (`slant 9, icomp 40`), as every engine font does — not a separate cursive.

## Files and wiring
- `core_renessa.js` (after core26, before core_renessa_w): the whole font — skeleton glyphs `d(ch, K=>[strokes], advance, kind, nst, nsl)`, helpers, registration (`skRegister(F)`). Digits via `dg`. **`skPunct(F);` redefines punctuation incl. `&`; a custom `d('&')` must come after it.**
- `core_renessa_w.js`: weight ladder. Light 0.77 / Regular 1 / Bold 1.25 / Black 1.4 of the default stem (63/82/103/115), width +3 % Bold, +6 % Black, hair ladder 19/25/28/28 scaled by the hair slider, `WSCALE.renessa=0.578`; `weightOf`/`famNearest` are overridden for Renessa so names follow this ladder (the shared 0.22/0.315/0.437/0.53 ladder would call Black «Bold»).
- `core_renessa_o.js`: OpenType — figures (onum lnum tnum pnum sups subs sinf), currency tabular forms, fraction bar + `frac`, `ordn`; kerning hooks. No smcp/c2sc, case, liga, ss01, locl (Stroka has them; not drawn).
- `core18.js` (`st.dot + st.poly`: a dot stroke carrying its own filled contour = serifs) and `core18c.js`, `core_basic_n1.js` (do not reset `ser brk hsl ball fla` params of other fonts).
- Registration points (same as Stroka): `assemble.py` file list, `ui_lib_u1.js` (tags `serif` «Антиква», `renais` «Ренессанс», FONT_META, LIB_POP/LIB_NEW), `core_meta_l1.js` (META_FAM: PANOSE cove serifs, IBM class 1/3 Venetian), `t10par.sh`, `check.sh` (proof, stress, vf, vfax, uniwidth lanes), `tests/e2e_shell.py` (YEARS, font count), `tests/ot_check.py`, `golden.md5`.

## Construction
1. Pen: elliptical broad-nib (`K.spec`: rx = stem/2·m, ry = hair/2·m, nib 7°). Thick-left/lower stress and the slanted oval axis come from the pen, not from drawn swells. `K.spT` = thin pen (0.55 rx, for diagonals). Lowercase pen = 0.92 of capital pen. Effective hair is capped at 0.3 stem (`paramLimits`); default hair 25 → 24.6 at stem 82.
2. Skeleton strokes: `nodes([[x,y,dir,{w}]],K.tens)` + `SKB.st(ns,capStart,capEnd)` (caps F H V J R T). `K.pa` wobbles with many nodes — use few nodes with matching tangents.
3. Serif module: `slab` (bracketed foot/head serif with wedge end), `beak` (wedge end of T E Г Z 2 and arcs), `flag` (left head flag of б ф 1), `ribbon` (б r bowl flag as a polygon), `spur` (Ґ ґ), `tailF` (Ц Щ ц щ tail = baseline bar + beak), `tick`, `zDiag`, `hwd` (half-width of a diagonal for serif placement). Parameters: `ser` length, `brk` bracket, `hsl` head-serif cut angle, `ball` drops, `fla` stem flare.
4. Metrics: capH 700, xh 450 (0.64), asc 745, desc 230, sb 36, space 210, nib 7.

## User-approved glyph rules (rounds 5–8c; keep)
- Z z: two small vertical serifs (beaks) at the top-left and bottom-right bar ends. Ц Щ ц щ: bottom stroke continues right at the baseline with a small vertical tick/wedge. 2: slightly longer base with crisp vertical tick. 7: bar ends at the diagonal's top-right edge.
- б: uniform ribbon flag, blunt cut, slightly upturned tip, smooth join into the stem, shoulder softened (flag ≈ 60 % of stem thickness); r same family. ф: short ascender, left flag on the top. Э/Є: wavy quill bar. Ґ ґ: wedge spur.
- &: one smooth single-path stroke (foot → leg → loop → descender → bowl → lighter arm with the font's wedge cut), free bracketed foot serif that does not merge with the bowl, advance 570. Quirks: defined after `skPunct`.
- All serifs, spurs and tips are angular wedges like the font's own; no round blobs.

## Weights and sliders
- Sliders: stem 70–88, hair 14–26, nib 3–16, wdth 96–108, capH 660–740, desc, xh, asc, `ser 28–52`, `brk 0–40`, `hsl 14–36`, `ball 25–65`, `fla 0–50`; all others hidden. Limits are as wide as stress passes (150 × seeds 1,2 × regular+italic and `pres` family weights = 0 topology diffs).
- Э at Black: terminals would meet at the bar level (mirrored pen) → `K.apx` opens the aperture by 0.4°/unit above stem 96.
- Hair slider was inert before (generic engine pinned hair to 0.3 stem); now live, default unchanged.

## Kerning
Hooks of core15: `kernGap 26, kernD 1.5, kernF 0.85`, extra classes `kcL {Ls Tc Ch Yc Za}`, `kcR {Ls Tc Ch Hd st}`, `KERN_TABLE.renessa` = base table + rows for Т/У/Л pairs. Values are measured from the outlines at export. Proof (`qa_ANT/kernproof.py`): AV ТА Го LT Ту ГА P. Г. Т. «А» Yo To Va, HOHO/nono spacing.

## Checks
`./check.sh fast` (t10 26 lib TTFs, lib-md5, proof-renessa 8 lines, homo 13), slow lanes: fam-md5/famcheck/meta-fam, vf-build/vf-check, vfax-*, uniwidth, stress-renessa, stress40, e2e (shell year/count, tester, lang, ot, rows, panes, overflow).
Lessons: heavy stems break counters first (Э); never fit hair by the generic limits of other fonts; define `&` after `skPunct`; t12p flags `&` at Black if the advance is too narrow for the ink.
