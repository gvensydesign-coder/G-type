# Строка Sans (Stroka Sans, id `stroka`) — recipe

Text neo-grotesk (ParaType: Гротески · новые гротески; for UI and running text), Cyrillic + Latin, regular + italic, Light/Regular/Bold/Black, variable (wght + core_vfx axes), OpenType like Kvadra (smcp/c2sc, onum/lnum/tnum/pnum, frac, sups/subs/sinf, ordn, ss01 arched m, liga fi/fl/ff*), locl BGR/SRB/MKD.

## Files and how it is wired
- `core11s.js` (before core12): `STK` constructions, **active only when `p.stk=1`** (`STK.wrap(name, fn)` replaces `GR.name` by a dispatcher: `p.stk ? new : old`). Volt/Kvadra have no `stk`, so their glyphs are the same code path (golden md5 unchanged). Derived glyphs (accents, `.sc`, `.osf`, locl, ligatures) follow automatically because composites call the base `shape(g)` with Stroka's `p`.
- `core12s.js` (after core_w, before core_ot_o1): registers `FONTS.stroka` = clone of the final Volt/Kvadra `GL` (own entry objects, so Stroka may get own widths: digits 560–600, zero narrower than O) + DEFAULTS, `GR.Breve` hook (Cyrillic breve for Stroka), ß hook.
- `core_w.js`: `WSCALE.stroka=0.64` (weight scale: Regular = stem/xh 0.20, Light 74, Regular 106, Bold 147, Black 178), `FAM_HAIR.stroka`, family width growth capped (Black ≈ +5 %, not 120), word space, `KERN_TABLE.stroka` (class table measured at export).
- `core_ot_o1.js` (IDS, CFG, LIG_FONTS), `core_meta_l1.js` (META_FAM), `core13.js` (mark gap), `core20.js` (join), `ui_lib_u1.js` (tags `ngrot normal text cl vf`, year 2026, LIB_POP/LIB_NEW; new tag `text` «Текстовые»), tests: `check.sh`, `tests/ot_check.py`, `vfcheck.py`, `t11/t11q/t12/stress` font lists.

## Parameters (DEFAULTS.regular; italic = same, wdth 85, slant 9, icomp 45)
capH 700, xh 525 (0.75), asc 740, desc 205, ov 10, wdth 94, stem 111, hair 99 (0.89), round 1.0, kappa 0.60 (squircle, elliptical corners via rpE), innerR 1, aper 30, bar 52, mv 0, trap 0, join 10, sb 52, track 0, space 290, `stk:1`.
Limits come from the shared `paramLimits` (calibrated for the grotesk skeleton); stress 150 × seeds 1,5,9 × regular+italic and `pres` = 0 topology diffs.

## Signature decisions (all consistent over Cyrillic / Latin / digits)
1. **Metrics**: x-height 0.75 cap, ascender +40 over cap (l b d h taller than I), descender 205.
2. **Squircle ovals** (round 1.0, kappa 0.62 ≈ superellipse n 2.6): flat-ish sides, tight shoulders, vertical axis — Kvadra is a near-circle (0.95/0.56).
3. **Low contrast + optical thinning**: hair/stem 0.89 (ladder .93/.89/.84/.78), `join` 10 thins bars where bowls enter stems (R B Б в ь ы b p d).
4. **Moderate width** (wdth 86 ≈ 85 % of Kvadra) with lighter colour (stem/xh 0.20 vs 0.28); heavy weights grow only ≈5 % in width.
5. **Horizontal terminal cuts** c e s a 2 3 5 6 9 С Э З (aperture 30 %, widens with weight).
6. **a**: double-storey, straight stem, no tail, flat-cut hook terminal (`STK.a`: arch ring + cut, bowl ring, flat stem on the baseline).
7. **g**: single-storey with an open hook tail (vertical cut); j and the Cyrillic descender forms share it; **y/у**: straight tail, also in italic.
8. **t**: flat top with a slanted cut, crossbar to x-height, curved foot with horizontal cut (`STK.foot`: ring quadrant, radius = foot height).
9. **l** gets a short curved tail (same foot) and **J** is the mirrored foot — one hook family (t l J) so I / l / 1 stay distinct.
10. **f**: narrow, flat-bar hook with vertical cut and crossbar overhang both sides.
11. **G**: no spur, bar + vertical return; **R**: straight diagonal leg from the bowl; **Q**: short straight diagonal tail; **1**: light flag, no foot; **0** narrower than O.
12. **Л** with a ~8° leg (never П), **Д** with short feet, **к К ж Ж** share the arm/leg junction with a notched fork.
13. **й**: calm shallow breve, ends thicker than the bottom (Cyrillic breve); **ь ы**: bowl reaches 56 % of x-height with a join notch; **З** round top vs **3** flat top (З/3/Э distinct).
14. **ß**: stem curving into the upper arch, closed lower bowl; **m** = Cyrillic «м» (arched m in ss01), n/r classic.

## Not done / rejected
- True italic forms (cursive a/ɡ): Stroka italic is a slant with compensation (as Kvadra).
- Angled (stroke-perpendicular) terminals: rejected for text sizes, horizontal cuts read calmer at 12 px.
- Boxy foot with tw>0 on `l`: replaced by a solid rounded foot (a hollow foot closed the counter in Black).

## Tests
`./check.sh fast` (build, lib-md5 24 files, meta-lib, homo 12, t11/t12 with stroka, proof-stroka), slow lanes: fam-md5 (104), famcheck, meta-fam, vf-build/check (+vfax), ot-check, uniwidth (+uw-md5 40), e2e export/vfx/ot/kern/shell, stress150 stroka × seeds 1,5,9, stress-pres.

## Revision 2 (user feedback on the approval pack)
- Ovals: `rpE` (core11s, via the `gk` wrapper, only `p.stk`) gives corners rx != ry (STK_E 0.5): no stadium shapes. Disabled for kappa < 0.25 (chamfer) and for @ % (gap safety); stress 150 x seeds 1,5,9 bad 0.
- n r m: stem reaches h+ov (no 10-unit step at the top-left corner). u = n rotated 180 degrees. Latin m is the arched m by default; ss01 gives the Cyrillic-style м (inverted vs Kvadra; core12s swaps G.m / G["m.ss01"]).
- б: bowl whose left wall rises and bends into one arc ending in a short horizontal stroke with vertical cut (as f); Б, b d p q: plain stems.
- Л л (and Љ љ): vertical right stem and vertical left leg joined by the bar; leg ends in a leftward rounded foot (same foot as t l J). Д: same leg, bar with stem-wide feet.
- Ц ц Щ щ: tail = short vertical stroke under the right stem, stem wide, 58 % of descender, square end.
- a: dome top (half ellipse) with horizontal terminal, elliptical bowl, straight stem.

## Revision 7: the «cap with a bend» (б cap) — Stroka's signature terminal device (user-approved, apply to ALL new glyphs)
**Rule.** Every free end of an arc (top = upper cap, bottom = the same device flipped vertically, left = mirrored) is built the way the б top is: the round form rises, bends over in ONE wide corner (squircle corner of the font, radius up to ~0.46 w / 0.95 of the arc height) into a **short horizontal stroke** that ends with a **slanted cut** (`STK.TN` = tan 0.35 ≈ 19°; the outer edge is shorter, the inner/lower edge longer — `\` at a right-hand top end, `/` at a left-hand top end, flipped for bottom ends). No terminal is ever cut on the descending part of an oval (that made spikes and slivers).
**Code (core11s.js).** `STK.arcTop(k,yA,a,xe,o)` = the б cap (wall x0 from yA up, bend, arm to xe; options x0, ro, ri, rf, gid, plain = vertical end for a spine); `STK.arcBot` = vertical flip about the arc box (feet and descender hooks); `STK.cshape(k,yb,yt,o)` = a «c» bracket from an upper and a lower cap with one shared wall (used by c C С є Э З s S 3 5 e-bottom); mirrored with MIRX for З Э 3. `STK.stroke/hookPath/pen` build a stroke along a centre line with the pen S×H (2 and 3: flat arm → wide bend → diagonal); the arm start is trimmed by the same slanted cut (`STK.capCut`). GRP ids of caps in one glyph must differ (a cap's inner counter subtracts inside its group only).
**Where it is used.** a (top cap = mirrored б cap, bowl stays), c e s C G S з э є е ё (С З Э Є Ё Е), f (top), t l J (bottom foot = flipped cap), j g and y-italic tail (`GR.tail`, flipped and mirrored), r (short flag arm with the n cleft), 2 (top-left end), 3 (top-left end, bend into the diagonal, lower bowl = c mirrored), 5 (stem + top bar = б cap, lower bowl cap), 6 9 (б cap + bowl with a round common bottom-left corner, no baseline step).
**Fallbacks.** 2 and 3 are stroke-path glyphs; when the pen is extreme (S/H outside 0.6–1.7, S+H > 0.62 h, or no room for the bend radius) they fall back to the older construction (`STK.n2o/n3o`) so stress topology stays intact. Cap lengths are clamped so that the vertical part of a cut never leaves a wall sliver (`STK.capE`, `STK.capX`).
**Junction fixes in the same pass.** m: the first arch is a symmetric hump whose right end enters the middle stem with the same cleft (rL, depth dT) as the second (= n) arch leaves it — equal depth/run on both sides of the middle stem (`STK.archG(...,sym)`). R/Я/я: the leg's inner edge runs to the stem notch (no flat tooth on the bowl bottom). 6/9: round shared bottom-left corner.
**Never do again:** cut a round form with a slanted line on its descending shoulder; put two caps with the same gid in one glyph; build terminals by `k.cut` rectangles (horizontal aperture cuts) for Stroka.

## Revision 8 (user bug list r8): leg join, Ж/К notches, caps, G
- **R Я я**: leg = one constant-width diagonal (`k.dgC`, pen-weight `k.dw`, same weight as the К arm), centre line from the bottom-right corner to `(max(1.6S, 0.48 wb), yb+H/2)`; its top is hidden in the bottom shelf of the bowl. No wedge/blob, no `e`-widened top (the old wedge added ~10 % ink: R/P colour +14.7 % -> peer-median band).
- **К к Ж ж** (`STK.kArms`, `STK.slot`): ink trap (выемка) in the sharp pocket between stem, arm and leg — a narrow slot (depth 0.38 S, mouth 0.2 S) along the pocket bisector into the arm/leg fork; plus optical thinning of the diagonals (`STK.dgK` 0.96 for К, `STK.dgZh` 0.90 for Ж via `STK.diag`, i.e. `p.diag` clone). The acute arm/stem wedge is NOT slotted (the slot would cut the stem). X x Y: crossings checked, unchanged (fork colour already in the peer band).
- **Caps (С З с з э Э Є е ё Latin e S s 5 G)**: `STK.capE = max(.66w, min(.93w, w - .12S - H*TN/2 - 8))` (was .6–.8 w and clipped to w−.5S: in Bold/Black the arm became a stub). The cut is the same slanted б cut. `e`: bar at 0.50 h (was .52), lower cap long like the б cap -> closed aperture. S s: both caps use the new capE (long arms).
- **З з waist** (`GR.Ze`): equal outer walls (no 4 % step), inner corners at the waist small (`STK.riW`=0.5 H), and the two small arcs that made a «tooth» replaced by a clean wedge notch on the outside (`STK.notchD` 0.42 S deep, `notchA` 0.5 H half-height, rounded apex, cut in every wall group: CSG subtracts only inside its own `grp`).
- **Inner radius** (`STK.rik`=0.5): inner corner radius of every `arcTop/arcBot` cap and of G = outer − 0.5 S (was −0.8 S) → no thick diagonal at the corner; G inner = outer − 0.5 S.
- **Colour audit** (`qa_STR/colour_audit.py`): ink / (advance × band) at 200 px; spec group median AND peer-family median (construction families), flag ±12 %. Raw group flags are dominated by structure (T Г 7 vs B В 8), so peer families are the real test. Remaining peer flags are structural (B/В/в two bowls, E/Е three arms, M/м, Z, T/Т/Г/Y/7/v/r light, C/c open).
- **Never**: a slot into a stem; two groups' walls overlapping at a waist without cutting every group.

## Revision 9 (digits 3 and 4)
- **3** (`n3`): upper section smaller than the lower (waist `ym` = clamp(0.545h, h-3H, 0.43h) so top ≈ 45 % in Light/Regular/Bold, ~50 % in Black where the diagonal needs room), top bar/bend 10 % narrower (`wt` = 0.9 w) than the full-width lower bowl. Extra fallback to `n3o` when w > 0.95 h (wdth > ~120 gave closed holes in numr/subs).
- **4** (`n4` wrap): stem flush with the advance box right edge (xs = w - S) and the crossbar ends at the stem's right edge (no overhang); diagonal logic unchanged.

## Revision 10 (independent QA review, 14 findings; approved design decisions kept: squircle flat-sided ovals, б-cap device, junction system, Ж/К traps, l with tail, slanted Cyrillic italic, techno character)
- **Digits** (`core12s` DS table, `core4` opts `sbl/sbr/sbt`): per-digit side-bearing additions (Regular units at sb 52, scaled by p.sb) applied only to proportional digits (`sbl/sbr`, optical spacing stays the base) and a uniform `sbt` (+11) to tabular `.tf` so all tabular advances stay equal. Pair gaps (bounds) now 86-102 in Regular, 107-124 in Black (letters nn 102/120); was 63-66 for 2 3 4 5. Digit kerning rows `dg|*` removed for Stroka (4's bar stuck out: 3-4 touched) and the 7 rows weakened to f 0.3.
- **Hairline ladder** (`FAM_HAIR.stroka` = .94/.89/.85/.75, Light/Regular/Bold/Black): the old ladder was cut by the shared `paramLimits` ceiling (128 u). Stroka-only relaxation in `paramLimits`: `if(font==='stroka'&&S>=120)hHi=max(hHi,min(0.86S,1.2hHi))`; `famParams` no longer clamps Stroka hair from above. Hair now Light 72 / Regular 99 / Bold 131 / Black 140 (contrast .94/.89/.85/.75). Black .80 (149) closed e/a counters to 45-55 u, so Black stops at .75 (e counters 62 u; Regular 124, Bold 75). Volt/Kvadra ladders untouched.
- **Double-bowl colour**: `STK.bowlG(...,hb,ht)` separate bottom/top bar thickness; B В в: middle bar 0.56 H (`STK.hmid`), outer bars 0.94 H (`STK.hout`); 8: hair x0.9 (`STK.hairF`, `n8` wrap). Peer-family colour (colour_audit): B +11%, в +13%, 8 +8%, б +5%, ф +10% (was +20/+22/+11/0/+9).
- **Kerning** (`core15` per-font hooks, all default to the old values): `FONTS[id].kernGap` (min gap floor, Stroka 30 instead of KERN_GAP 60 - the floor made every diagonal pair exactly -60), `kernD` (depth cap multiplier 2.6 instead of 0.9 - the cap made AV TA LT To Ya identical), `kernF` (strength scale 0.62), `kcL/kcR` (extra classes). Stroka classes: Ls/ls (Л л), Yc (У у), Ch (Ч Ц), st (straight-left-stem letters), table rows in `FONTS.stroka.kernRows`; punctuation rows x0.75 (P/F x0.55). Result (Regular): AV -72, ТА -94, LT -102, To -78, Ya -80, Ту -86, Ув -48, Лу -46, Г. -134, Р. -98, T. -98, Ол 0 (measured: foot of Л compensates). Values come from the outlines per class; exceptions per pair as before.
- **m**: advance 1.6 x n glyph width (945 vs n 628 = 1.50 n, was 1.40); cleft logic unchanged (STK.mArch symmetric notches).
- **y у**: no ink-trap wedge on the long diagonal (it made the kink); shoulder arm joins the diagonal (`STK.wrap('y')`).
- **Ж К ж к**: ink-trap slot has a rounded tip (radius = 0.34 slot width) instead of a sharp apex (`STK.slot`).
- **Spacing**: S +8, C С Є +5 per side (Light/Regular ST 63 -> 71, BC 87 -> 92, CD 80 -> 85).
- **z / 5 / S / s**: kept (z is a plain diagonal without caps device; 5 has a flat bar and vertical stem).
- **Accents**: dots and macron rise to the breve top (`MK` wraps in core12s): Й Ё Ў 869, й ё ў 707 (was 869/844 and 707/657).
- **Name table** (Stroka only, `core_meta_l1`): ID 0 «© 2026 G-type», 8 and 9 «G-type», 13 «SIL Open Font License 1.1», 14 «https://openfontlicense.org». Other fonts unchanged.
- **Ӏ ӏ** U+04C0/U+04CF added (copies of I). Ѣ ѣ ų still missing (not Ru/Uk/Be/Sr/Mk/Bg).
- **Tiny segments**: `STK.deTiny` (called from core4 after the union for p.stk) collapses fillets/segments <= 4.6 u (l, f_l, f_f_l, quotes, ł); the 4.5 u radii in the slit counter of Black a remain (a real corner radius).
- Never: pass the shared `KERN_GAP/0.9` caps for Stroka (saturates all pairs); kern `dg|e4` digits; add sbl/sbr to tabular digits.

## Revision 11: user's final corrections (б, 4, ф Ф, ю Ю)
- **б** (`be`, Б is a separate glyph with its plain stem, untouched): bowl = `STK.bowlG(...,rnd=true)` exactly like 6 — fully rounded closed bowl, stem starts above the bottom-left corner (`y0 = -ov + min(ro*(1+E), hv/2) + 2`), no straight segment/square corner at the baseline; б-cap springs from the wall as before.
- **4** (`n4`): crossbar left end starts on the diagonal's outer edge at the bar's top (`min(xl, xl*1.05H/(h-yc))`) — flush, no overhang left of the diagonal; right end flush with the stem.
- **ф Ф** (`Ef` wrapped): central stem + right bowl (`bowlG` b-type from the stem to w) + left bowl (`bowlG` d-type = `MIRX` about the stem's right edge); each has the b/d cleft + thin crotch top and bottom. Glyph width x1.14 (core12s) so the two counters stay open as о. Cap Ф: bowls 0.1h..0.9h, stem full height.
- **ю Ю** (`Yu` wrapped): н-like stem + bar + о-ring in one group; the bar meets the ring wall with a thin slit (STK.slot, depth .24S, width .09S, rounded tip, running along each bar edge into the ring wall) = thin crotch like b. Note: `k.joinCut` is inert in Stroka (k.jn=0); do not rely on it. A bisector slot made arrow-like cuts into the bar end — rejected.
- Lesson: wedge/slot cuts only subtract inside their own GRP id; the ring must share the group.
