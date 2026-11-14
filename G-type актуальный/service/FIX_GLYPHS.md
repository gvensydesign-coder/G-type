# FIX_GLYPHS: glyph-level fixes from audit30 (work tree fx2)

Images are in `fx2/img/`. Baseline fonts: `fam0/` (before), current build: `fam/` (after). Numbers come from fontTools (`tools/gcheck.py`, `tools/kinks.py`, `tools/gdiff.py`) and a PIL IoU probe (`tools/iou_pair.py`: cap 12 and 24 px, ink left-aligned).

## P1

1. Renessa: curved parentheses and open quotes. `( )` are now curved arcs (nodes in core_renessa.js); `“ ‘` are the 180 degree rotation of `” ’` (same pen, same width, top at capH). Images: `ren_before.png`, `ren_final.png` (Black before/after).
2. Pixel
   - Ш/Щ, ш/щ: Щ tail 2 cells deep (0.85 D) plus a left foot bar under the last stem (pix/glyphs3.js). IoU 12 px Regular Ш/Щ 0.98 to 0.815, ш/щ 0.96 to 0.742; Bold 0.810/0.751; Black 0.815/0.751; Light 0.863/0.806 (Light is the only weight above 0.85, the stem is 1 cell). Images: `px_shsch_before.png`, `px_shsch_after.png`.
   - Zero: `0` is now a slashed zero by default, `О` stays a plain ring (pix/glyphs2.js, alts, reg, gen_limits). IoU О/0 Regular 0.70 to 0.58, Black 1.00 to 0.89. ss01 now means "arched m and plain zero". Topology table `pix/limits.json` is unchanged (cmp with limits0.json). Image: `px_zero_ba.png` (rows: Black before, Black after, Regular before, Regular after).
3. Ustav `l`: tailed l (core_ustav_n1.js). IoU I/l at 12 px: Regular 1.00 to 0.86, Black 1.00 to 0.85 (24 px: 0.96 to 0.83, 1.00 to 0.85). Image: `ust_a1.png`.
4. Rotunda `3` vs `З`: flat-top 3 (core25.js). IoU З/3 Regular 0.96 to 0.63 (24 px 0.58), Black 0.85 to 0.73 (24 px 0.70). Image: `rot_a1.png`.
5. Modul
   - Л Bold/Black: keyhole disc is back (core24.js, clamp of the inter-leg gap, cap on xi). `modul_L_before.png`, `modul_L_after.png`, `modul_final.png`.
   - `?` BlackItalic: no self-intersection and no specks (sub-box edge shifted by 8 u when the leg is within 8 u of the radius). `modul_q_before.png`, `modul_q_after.png`.
6. Applik (applik/glyphs.js, applik/build.js)
   - R: pinholes in Bold/Black and the Italic self-intersection removed (leg extension `aBack(...,.11)`). `ap_R_before.png`, `ap_R_after.png`.
   - S/s: one piece (arc angles 280 / -150 instead of a spine strip). `ap_S_before.png`, `ap_S_after.png`.
   - Lowercase height: lowercase was already built at 0.86 capH; lean, scatter and baseline jitter inflated wide glyphs (х ш я ф ж). A post-build height clamp in `aBuild` now holds them to 0.86 capH for every seed.
7. Stsepka (stsepka/*.js)
   - Lowercase stem ladder: clamp 0.27 xh instead of 0.245 xh: lowercase stem of н (measured on the raster) Light/Regular/Bold/Black 101/118/130/135 (before 104/121/123/123, Bold equal to Black); the stem is 0.86 of the capital stem, clamp 0.27 xh. Images `st_lc_black_before.png`, `st_lc_black_after.png`.
   - Latin I Light stem .12; з/э differentiated (Э bar and hooks), IoU э/з Black 12 px 0.64 (24 px 0.97); Э/3 0.91-0.93; В waist .42; Q tail so that Q/0 0.87-0.93. О/0 untouched. Images `st_ze_before.png`, `st_ze_after.png`, `st_lat_black_after.png`.
   - Ligatures: `HA` (H loses its right stem and reads as KAMMER) removed from calt/ss02 and the `МИН` triple (letters merge) removed from ss02. Counts calt 34 to 33, ss02 52 to 50 (tests/e2e_stsepka.py updated). Images `st_lig_probe.png` (before) and `st_lig_ba.png` (before top, after bottom).

## P2/P3

8. Liniya (core18c.js, shared with Propis)
   - Black Ă self-intersection: selfx 2 to 0 in Black and BlackItalic; Black Й/Ă breve stroke is capped at 0.62 of the arc depth so the bar no longer closes it (`liniya_before.png` top row vs `liniya_breve_after.png`).
   - `“ ‘` are now the 180 degree rotation of `” ’` (`liniya_q_after.png`). The same shared code fixed Propis (`propis_ba.png`).
   - `&` kink 13.5 to 11.7 degrees Regular, gone in Black/BlackItalic (node tangent removed). Comma join kinks (9-11 degrees) are a concave union crotch: three different start offsets only made them worse, left as is.
9. Stroka Black д/Д foot: foot width limited to 1.25 of its depth and set in from the plate end (core11s.js), so it no longer reads as a comma stuck to the previous word. Only Black and BlackItalic change. `stroka_d_before.png`, `stroka_d_after.png`.
10. Codex
    - `{ }`: one continuous ribbon instead of two meeting at the tip and ribbon width capped at 0.9 of the bend radius (core16.js). Holes in Black 4 to 0, one contour in every weight. `codex_before.png`, `codex_brace_after.png`.
    - `&`: upper loop opened up, heavy weights get a thinner ribbon. Upper counter area Black 15k to 29k u2 (Regular 21k), no extra holes. `codex_amp_before.png`, `codex_amp_after.png`.
    - ю needle 9.6 degrees: not reproducible (no turn above 8 degrees in ю of any weight with `tools/kinks.py`), nothing changed.
11. Small outline defects
    - Not fixed, they are union crotch kinks produced by the generic engine, not a glyph recipe: Kvadra 9 (17-24 degrees) and e (12 degrees), Stroka Black 3 (14.6), Volt Œ (17-18), Stroka A/Æ apex needle. Recommendation: a crotch-fillet pass in the outline hygiene lane (one small fillet at concave union vertices) fixes all of them at once.
    - Stroka l/ł feet 1-2 u off axis: the 2 u slope comes from the clipped slanted terminal in `STK.arcTop`; an attempt to extend the clipped inner box changed nothing. Left to outline hygiene (snap to axis after union).

## Not done on purpose (decision needed)

| Item | Recommendation |
|---|---|
| Codex uncial Е | Keep: it is a design decision of the style, not a defect. |
| Stroka Д/Ц/Щ tail length (-26 %) and О width | Needs a design call: lengthen the tails to about 150 u and widen О by 6 %; I did not touch them. |
| Volt tight spacing | Kerning/spacing agent: loosen Volt sidebearings by 4-6 u. |
| Weight ladder retuning of Kvadra/Volt/Liniya | Change per-font stem tables in core_w.js after a design review (Regular should sit near Frutiger Roman, Bold near Demi). |
| Stsepka О/0 | Keep: О and 0 are twins by design in Stsepka. |

## Checks
- `./check.sh fast`: 19 checks, 1 fail = lib-md5 (expected: the lib TTFs of applik, codex, liniya, pixel, propis, renessa, rotunda, stsepka, ustav changed on purpose). During that run proof-rotunda failed (my first flat-top 3 had a near-closed counter in Black and a step in Italic); fixed by building the 3 as one stroke, rerun proof-rotunda 8/8 PASS.
- After the final edit (Stsepka lowercase factor 0.88 to 0.86 and clamp 0.285 to 0.27 xh): `t12p.py` proofs stsepka (8/8), liniya, propis, ustav, modul (all 0 problems); e2e stsepka (calt=33 ss02=50), lang, export, pixel, kaplya, deco: all PASS (one lane at a time, timeout 300-900).
- Stress: `stress_applik.js 80 2`: 16770 combos, bad 0 (seed 1 earlier: 0 pinholes over 60-80 seeds). `stress_stsepka.js pres`: 4004 combos, bad 0. `stress_stsepka.js 80 1` with the 0.88 factor had one ъ smallhole (1856 u2 against the 1960 limit at stem 134 / xh 438 / wdth 125) and seed 2 had three (1952): fixed by the 0.86 factor and the 0.27 clamp (same combos now 2112 / 2048+); Final: `stress_stsepka.js 80 1` 14476 combos, bad 2; `40 2` 8316 combos, bad 2; `pres` 4004 combos, bad 0 (earlier run with the 0.285 clamp). All 4 remaining are the same case: lowercase ъ at the extreme corner wdth 125, xh 420-437, stem 137-150 has a small (but open) counter, 1712-1840 u2 against the 1960 u2 threshold. Recommendation: lower the stress threshold for lowercase to 0.0035 capH2, or cap wdth at 120 together with stem above 135. There are no scripts named "gapcheck" or "misread gate" in the tree; the equivalent is `tools/iou_pair.py` plus `stress_stsepka.js`.
- golden.md5: only the entries that changed on purpose were rewritten: fam/ 78 files (Applik, Codex, Liniya, Modul Bold/Black, Pixel, Propis (shared quotes/&), Renessa, Rotunda, Stroka Black/BlackItalic, Stsepka, Ustav), lib- 18 files, famuw/ 26 files (Codex, Liniya, Renessa, Stroka). The stale line `650068a3...  golden.md5` was already in golden0.md5 and was left alone. Unchanged: Volt, Kvadra, Ryvok, Kaplya, Stroka Regular/Light/Bold.
- Other agents: applik NBSP, thin space and NNBSP glyphs are missing (outside this task).
