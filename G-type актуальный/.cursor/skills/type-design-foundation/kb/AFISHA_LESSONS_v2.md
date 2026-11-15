# «Афиша 2» — lessons of the clean rebuild (Nov 2026; work stopped by the user, not integrated)

Last state: lowercase Latin a–z + Cyrillic а–я ё й on the v4/R5 system; caps not started.
Source kept for reference: scratchpad/serif71/tree/afisha2 (SPEC.md, spec2.js, prim2.js, glyphs2_lc.js); TTF snapshot serif71/sheets2/af2-Regular_stageB.ttf.

## User-approved forms
- а: bowl hairline rises to the stem at ~0.2X, pointed counter corner, spur at the stem foot.
- и й н п ш…: symmetric two-sided bracketed top serifs.
- е з э с: round outer bottom, horizontal-top wedge terminal; e bar full width (no є-misread).
- n h m arches (shoulder lands 0.70X, short V notch ≤0.88X), pro o ring profile, pointed v w apex.

## Rejected (do not repeat)
- Balls/teardrops (r f j t л g), ladle/bucket tails (y у), leaf я legs, g-like lowercase д, trapezoid д in lowercase, thin spike tails on ц щ, squared «L-bracket» б flag.
- «Thicker hairline + teardrop family» (v3): contrast already matched the reference (measured 0.17–0.18); the diagnosis was eyeballed.

## Method lessons
1. Measure the reference (afisha2/tools/measure_ref.py) before changing system parameters.
2. Fix shared primitives; per-glyph patching after marks never converges.
3. Read crosses across a sheet as a pattern (here a whole terminal family was rejected).
4. Quality gates in qa.py from the pro KB (ring profile, arch landing, notch, serif tip, node counts) catch regressions before the user sees them.
5. The lead views every sheet at ~300 px and in words at 40–80 px before sending.
6. Agents past ~400k tokens get sloppy — hand hard glyphs to a fresh agent with numeric specs; the lead tunes the last parameters himself when needed.
