# RECIPE cond — condensed tall display grotesque (stage 1, base set)

Engine: copy of the stsepka pipeline (pieces -> raster 2 px/u -> holes -> trace -> DP 2.2 px -> 0.5 u lattice -> fillet -> cubic).
Files: cond/{engine,letters,glyphs,spacing,tail}.js -> mk_cond.sh -> core_cond.js (after core_stsepka.js in assemble.py).
Passport: META_FAM.cond (core_meta_l1.js), hygiene row (core_hyg.js). Tools: build_cond.js, fam_cond.js, stress_cond.js, dev.sh.

## 1. Reference measurement (poster, 8 samples; ink width / cap height, stem / cap height)
| sample | stem/cap |
|---|---|
| LIMITED .104 | PRETZEL .119 | REGION .099 | BOSTON .115 |
| CRUSHER .097 | GRIND .153 | INFLUENCER .101 | KAGURO .129 |

Median stem/cap 0.109. Medians of ink width / cap: H .224 (H-like H,U .228), O .264, round (O C G D) .244, E .187,
R .246, S .243, N .263, T .243, M .393, K .295, A .288, L .193, Z .274, B .264, P .267, G .288.
Counter / cap median 0.031 (0.023 – 0.037). Corners: tight radius, round bowls are stadiums, flat terminals.

## 2. Design (median of the 8)
- UPM 1000, cap 700, x-height 525 (0.75), asc 730, desc 170. Regular stem 88 (0.126 cap; the poster median is 0.109 but the poster samples read heavier, so lead review set 0.122-0.128).
- Ink widths are ~1.11x the poster median (H .266, O .31, E .216): deliberate, so that counters stay readable (30 u vs poster 22 u).
- Corners: registered round corners only (bowl corners R = rnd*1.1*S ~ 0.8 S; straight corners nearly sharp, Rs=0.13 R).
- Contrast: horizontals T = S(1 - 0.30*ctr), default ctr 35%. Counters cmin = max(24, 0.31 S). Terminals flat; optional slanted hook cut (ucut).
- No ink traps, no stencil (Kaguro), no extreme compression (Influencer).
- R = stem + bowl + diagonal leg (vertical leg read as A). G bar detached from the stem (otherwise reads as 6).
  Д: floor bar + legs with feet; Л: straight leg, lean <= .055 H (flat variant widened to .32); Ж: central stem + mirrored K-arms;
  З round top with waist notch; 3 flat top; 0 narrow ring with slash; Й breve U-shaped, mark gap max(40, .34 S); Ё dots .72 S.
- © and @ are boxes (bars, not a ring: a ring hole would delete inner glyph) with a small inner c / a.

## 3. Parameters (default = median design)
stem 60-176 (88), wdth 80-130 (100), xh 462-574 (525), urnd 0-100 (72), uctr 0-100 (35), uap 60-140 (100), ucut 0-100 (0), ugap 14-70 (30).
Weights: Light 62, Regular 88, Bold 124 (x1.41), Black 158 (x1.80; +27% over Bold). Italic: slant 10, icomp 40, wdth 98.

## 4. QA numbers
- stress_cond.js: `20 5` 6346 combos bad 0; `40 3` 9686 bad 0; `30 11` 8016 bad 0; `pres` 3674 bad 0.
- 12 px (cap 12 px) misread IoU, unhinted 8x supersample: Regular max (excluding shared glyphs) Э/З .92, Й/И .92, з/э .92, I/L .92;
  O/0 .90 Bold, .92 Black; В/8 .92 Bold; Б/6 .81; S/5 .82; З/3 .82; I/l .83. Exempt by project rule (shared glyph): Н/H 1.0, п/n .91-.98.
  Note: hinted PIL raster gave O/0 .99; browsers do not hint, so the audit uses supersampling.
- Kerning (kmeasure Regular): n-n 30, space 230, clos15 16/40 (stsepka 17/40), opt15 0/40, overlaps 0, none > 0.8 space.
- meta_check fam: 128 files, 16 families, bad 0. Golden lib md5: 30/30 OK (other fonts unchanged); assemble.py builds.
- Mark zone: Й top 807 (Light) .. 898 (Black), under hhea asc 920; marks rise with weight (breve thickness), vertical metrics constant.

## 4b. Review round 2
- cmin = max(22, .26 S). N/И: tapered diagonal (ends .56 S, middle .76 S wide), width .36 cap, open triangle counters.
- A: flat-top, straight tapered legs (stem 1.0 S, top counter >= .85 cmin, taper <= .12 w), width .34; Л/Д unchanged.
- В: stepped right edge (upper bowl narrower by .55 cmin), 8 narrower (.235). Latin m = real arched m (3 stems); Cyrillic м = wedge.
- a/а: double-storey, top arm inset .05 w with short hook, bowl >= .50 xh.
- stress: pres 3674 bad 0; seeds `12 21` 5010 bad 0, `12 77` 5010 bad 0. Misread audit 12 px: В/8 .85 (was .93), Б/6 .83, Regular max non-shared Я/R .93, I/L .93.

## 4c. USER RULES (approved by the user, apply to all future work on cond)
1. И/N/Й/и/й: the diagonal is one clean straight stroke with parallel straight edges from the bottom-left to the top-right join; no notches, thinning or steps at the joins.
2. Ф/ф: the vertical stem runs through the bowl as one solid stem in the centre of the counter, giving two equal narrow counters (= the common counter width). The ring is built from bars (a ring hole would delete the stem).
3. Closed-aperture terminals: С/C/с/c upper terminal drops, lower one rises (vertical stems on the right), leaving a gap at mid-height = counter width x aperture; G upper terminal drops to just above the crossbar (same gap); Б top arm has a vertical drop at its right end (30 % of cap length); Э/З/S/5/6/9 hooks run to the same small gap (length clamped 0.10-0.40 H to stay readable).
4. 3, З, з: a sharp V-notch cut into the right side at the waist, pointing left, depth 0.35 stem.
5. А (Cyrillic and Latin) is built from Л: the same left diagonal, flat top and right stem, plus a crossbar at the centre. Л and А are identical except for the bar.
6. Even internal space: every vertical counter has the same width cx = max(22, .26 stem) (x width slider factor clamp .9-1.4). Glyph width = n*stem + (n-1)*cx (+ fixed side treatments). Lowercase has its own value (scaled stem). И/N are the exception: the triangular counter base at the top is 2.4 cx.
7. Optical compensation: diagonals have perpendicular thickness 1.03 x stem (was 0.80-0.85). Horizontal width = D*sqrt(dx2+dy2)/dy.

## 5. Known / OPEN
- N/И diagonal heavy at 12 px (slit counters); Д feet heavy; Ж arms thin; З waist notch busy.
- Basic set only (charset 'basic'): brackets, § and extended symbols are not in the set by project rule.
- Poster H advance .224 vs brief .35-.45: brief range is a normal grotesque; this font follows the poster.

### 4c-2. USER RULES, round 2
1. N/И/Й/и/й: upper diagonal edge runs from the left stem's inner top corner to the right stem's inner edge at 50 % H; lower edge from the left stem's inner edge at 50 % to the right stem's inner bottom corner. Straight parallel edges, no notches. И is the mirror. Counter column x1.3 (ex = 0.3 cx). Diagonal thickness follows this geometry and is therefore thinner than the 1.03 S rule.
2. Д/д: no descender feet. Solid base bar AT the baseline, width = body + 0.25 S per side, height = S.
3. В: V-notch on the right at the waist, depth 0.35 S (as 3/З).
4. Ж/ж: width 3S+2cx; three full-height stems; arrow connectors at mid-height (0.3 H tall); outer V-notches (0.30 S deep) on the side stems.
5. Э: mirrored closed-aperture С + short tongue (0.5 cx), width 2S+cx. М: two stems + narrow central V, width 3S+2cx (V strokes thinner than 1.03 S: exception, no room). W stays wider (4 diagonals). Ш/Щ/Ю already 3S+2cx.
6. З/3/5/С/Э/S: bottom-left outer rounding = top-left (register both corners in rc).

### 4c-3. USER RULES, round 3 (Х У G W Y in the block system)
Х/х/X: two stems + bowtie connector (0.3 H tall, neck 0.36 S) + outer V-notches, width 2S+1.3cx. Y: two upper stems, rounded U-join at 45 %, centre stem S, width 2S+cx. У: variants via env COND_UV=A|B|C (default A; lowercase у always B). A = Ч construction + foot with upturned terminal; B = right stem descends (cnDep) with a left hook; C = Y construction + left-turning foot. G: closed С with lower stem up to 36 % H, aperture 0.33 H, tongue 0.6 cx (C/G IoU 0.85 at 12 px; any smaller aperture gives >0.88). W: vertical mirror of М, V up to 65 % H, width 3S+2cx. Pitfall: cnReg's 3rd arg is the stem count; a wrong count collapses the glyph silently.
