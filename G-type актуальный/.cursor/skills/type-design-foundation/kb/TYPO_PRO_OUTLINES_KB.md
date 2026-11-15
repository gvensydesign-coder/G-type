# Pro display-serif outline construction: measured rules (study only, no outlines copied)
Sources (OFL): Yeseva One (Y), Playfair Display 700 (P7) and 900 (P9), Prata (Pr). Compared with OURS = af2-Regular_stageB. All numbers measured by script (tools in `pro78/tools/`; cubic fits from TrueType splines, thickness = inscribed-circle diameter on a 4 px/unit raster). UPM 1000.
Normalisation: S = lowercase n stem (Y 160, P7 144, P9 180, Pr 100, OURS 146); X = x-height (Y 500, P7 517, P9 519, Pr 518, OURS 510). "med" = median of the 4 pro fonts, range in brackets. Absolute units (u) are given where they are weight-independent.

## 0. The big picture (three facts that drive everything)
1. Hairlines are an ABSOLUTE size, not a fraction of S: ring hair 20u (Y 20, P7 20, P9 20, Pr 22; OURS 26). Thin diagonals 26-32u (OURS 26). Tip of serifs ~ 15-21u (= hairline). So hair/S falls as weight rises (0.11-0.14 for S 144-180).
2. Pros make bowls and arches with FEW nodes (4-node ovals; n = 22-26 nodes; OURS n = 29) and put weight where the pen would: round sides = 1.04-1.10 S (not 1.00), thick plateau out to 30 deg from the side, then a fast fall to the hair (see 3).
3. Joins are not "clipped rings": the arch leaves the stem with a notch/crotch, the shoulder lands on the stem at 0.70X (not 0.50X), the flag is a flat-topped bracket.

## 1. Node structure
| glyph | Y | P7 | P9 | Pr | OURS |
|---|---|---|---|---|---|
| o (outer+inner) | 4+4 | 4+4 | 4+4 | 4+6 | 4+4 |
| n | 24 | 26 | 26 | 22 | 29 |
| e | 17 | 14 | 14 | 12 | 11 |
| a | 31 | 23 | 23 | 23 | 20 |
| r / y | 21 / 21 | 20 / 29 | 20 / 29 | 18 / 22 | 24 / 26 |
Rules: (a) every smooth node of a bowl/arch/shoulder sits on an extreme (tangent H or V); P7/P9 n has exactly 1 smooth off-extreme node, Y 3, Pr 0. (b) Off-extreme smooth nodes appear only on diagonal-to-curve transitions (y, a bowl-join, Y arch notch). (c) Everything else is corner: serif tips, stem/serif meets, notch, crotch, terminal cuts. (d) A shoulder is ONE cubic top-extreme -> stem tangent (P/Pr) or 2 (Y), never a full quarter-ellipse.
Cut corners: terminal cuts are 2 corner nodes, 0.3-1.0 S apart, never with handles on the cut.

## 2. Curve tension (kappa = handle length / projection of chord on handle direction; circle = 0.552)
| curve | top/near-top handle | side/stem handle | notes |
|---|---|---|---|
| o outer (4 cubics) | Y .625 / P7 .60,.71 / P9 .64,.70 / Pr .56,.60 -> med 0.63 | same values (alternate .60/.71 around ring, 180 deg rotational) | squarer than circle: 0.60-0.71. OURS .575/.563 |
| o inner counter | horizontal handle at top/bottom: Y .96 P7 .96 P9 .99 Pr .76 -> med 0.96 | vertical handle at sides: .23 .22 .16 .50 -> med 0.22 | counter is a tall lens: flat top, tight sides. OURS .80 / .30 |
| n outer shoulder (top extreme -> stem face at 0.70X, ONE cubic fit, err<0.4u) | Y .48 P7 .83 P9 .84 Pr .60 -> med 0.72 | .62 .63 .64 .68 -> med 0.635 | dy = 0.28-0.33X (OURS 0.53X, ka .54 kb .60); dx 0.8-1.55 S |
| n inner arch right half (stem face -> top) | top .86 (P7) .82 (P9) .77 (Pr) | vertical at stem .55 .56 .54 | OURS stem handle 0.32 (too short) |
| n inner arch left half (top -> crotch) | top .63 (P7) .55 (P9) | crotch handle .49 (vertical) .55 | P7/P9 arrive tangent to the stem (0 deg) |
| foot/head bracket | tip handle (horizontal) 0.81 L (P7), 0.88 L (P9) | stem handle (vertical) 0.68 rise (P7), 0.61 (P9) | OURS 0.31 L / ~0.5 rise |
| y / r / f ball | see sec. 6 | | |
Generator rule: ring outer kx=ky=0.64 (alternate 0.60 left-of-axis / 0.70 right-of-axis if you want the pro "breathing"); counter kx(top)=0.95, ky(side)=0.22.

## 3. Stroke-width profiles (thickness / S; `profiles.png`)
**o ring**, angle from the side (0 = side, 90 = top hair), vertical axis, symmetric (tilt 0, thin points at x=centre for all fonts):
| deg | 0 | 15 | 30 | 45 | 60 | 75 | 90 |
|---|---|---|---|---|---|---|---|
| Y | 1.06 | 1.05 | .97 | .79 | .54 | .29 | .125 |
| P7 | 1.05 | 1.04 | 1.00 | .86 | .61 | .33 | .139 |
| P9 | 1.04 | 1.03 | .98 | .83 | .57 | .30 | .111 |
| Pr | 1.10 | 1.05 | .91 | .70 | .45 | .28 | .22 |
| OURS | 1.00 | .98 | .90 | .74 | .52 | .29 | .178 |
Rule: w(th)=h+(W-h)*u(th), W = 1.05 S (1.04-1.10), h = 20u, u = [1, .99, .95, .79, .51, .22, 0] at 0,15,30,45,60,75,90 deg (plateau to 30 deg, then fall; steepest 45-75 deg). OURS thins ~0.1 earlier (u(45)=.68, u(30)=.88) and its W=1.00.
**n arch** (rays from counter centre at 0.45X; 90 = top): right shoulder reaches full S at 40-50 deg in pros (u: 1.00 at 40 deg, .78-.90 at 50, .61-.66 at 60, .45-.51 at 70 (Y,P7), .30-.36 at 80). Thin minimum is LEFT of centre: at 100-120 deg for Y/P7/P9 (0.10-0.15 S = 18-22u), 0.22-0.28 S for Pr; left side then climbs to S within 120->135 deg (junction with stem). OURS: min at 90 deg (0.18), slower right shoulder (0.83 at 40, .69 at 50), left climb at 120 deg = .66 (pro .25-.62, i.e. pro hair persists further left). Rule: place the arch hair minimum at 0.30 of counter width from the LEFT stem (angle ~108 deg), hair = 20u, right shoulder thickens to S by 45 deg, left joins stem by 130 deg.
**c/e lower stroke** (180 = left, 270 = bottom, terminal at ~330 deg), two schools:
- P7/P9: monotone taper: 1.05 S at 200-220 deg, .93 at 240, .67 at 270 (bottom is NOT a hairline), .50 at 290, .31 at 310, .14 at 330 (terminal tip ~20u). ~ -0.0085 S per deg from 230 to 330.
- Y/Pr: classic ring: hair at bottom (Y .21, Pr .23 at 270) and hair held to the terminal (.14-.23 S).
- OURS: hair at bottom (.18), then re-swells to .52 (300) / .66 (310) wedge then cut: matches neither school (it follows the Baleny reference by eye).
**y tail** (path from tail end to the diagonal junction): pros = hairline stem (0.11-0.14 S for P; Y .17; Pr .26-.38) over 20-65 % of the path, then ball 0.66-0.75 S (P) / 0.9-1.0 S (Y) at the end. OURS = thick bucket 1.0 S over 20-40 %, thinning to 0.3 S.

## 4. Joins
- Arch NOTCH (outer, between flag/stem top and arch): vertical wall down the stem's right face to y = 0.85X (Y .85, P7 .847, P9 .882, Pr .792; med 0.85X; depth 0.15X = 64-90u), then the arch outer curve leaves at 56-64 deg from horizontal, i.e. the notch is a 26-34 deg sliver (P7 64, P9 59, Pr 56). Y: rounded V, bottom 0.85X. OURS: NO notch (top flat to arch).
- Inner CROTCH on the stem face: y = 0.80 Y, 0.718 P7, 0.788 P9, 0.724 Pr (med 0.75X; OURS 0.714X). Inner arch arrives at the stem at 0 deg (tangent, P7/P9), 21 deg (Y), 34 deg (Pr); OURS 13 deg. Rule: crotch 0.75X, join angle 0-20 deg (tangent preferred for bold).
- Arch top: inner top 0.925-0.96X, outer 0.99-1.018X (OURS .98 / 1.031).
- Stem pitch / X: Y .65, P7 .59, P9 .58, Pr .68 (OURS .78; Baleny target .785 by spec). Counter between stems = pitch-S = 1.03 S Y, 1.11 P7, 0.67 P9, 2.49 Pr, OURS 1.71.
- Bowl hairlines (a, b, d, p, q): hair enters the stem with a tapered wedge: the hair stays ~20-25u until ~0.35 S before the stem, then the inside corner is sharp (a: pointed counter at the stem, as in P7/P9/Pr/Y images `anatomy_a.png`); no fillet.

## 5. Serifs (n, left foot / left head; right foot mirrors with identical values)
| | Y | P7 | P9 | Pr | OURS |
|---|---|---|---|---|---|
| overhang L (S / u) | .374 / 60 | .444 / 64 | .311 / 56 | .698 / 70 | .417 / 61 |
| tip thickness (S / u) | .094 / 15 | .146 / 21 | .117 / 21 | .200 / 20 | .103 / 15 |
| height at stem face (S) | .187 | .645 | .516 | .299 | .342 |
| rise/L | .25 (wedge) | 1.12 | 1.28 | .14 (wedge) | .57 |
| bracket | straight wedge | concave cubic | concave cubic | straight wedge | mild curve |
Foot bracket profile (rise fraction at u = 10/25/50/75/90 % of L measured from the stem face): P7 .42/.20/.06/.01/0, P9 .38/.18/.06/.01/0 (hugging fillet: low until half the overhang, then climbs), wedge fonts .90/.75/.50/.25/.10 (linear), OURS .68/.48/.32/.16/.06 (between). Cubic for the P-type bracket from tip: P0=(0,t), P1=(0.85 L, t) horizontal, P2=(L, rise-0.65*rise) vertical, P3=(L, H); tip cut vertical, base slightly bowed (+4u toward stem). Underside of foot is flat to within 4u.
Head flag (n, h, i...): tip thickness = foot tip (0.12-0.15 S), TOP FLAT AT X (P: dips 3u at stem then rises 12u over the arch start; Y/Pr perfectly flat), underside = same bracket (face height P7 .756 S, P9 .605 S) or wedge; no slant (flag top angle 0-3 deg). OURS flag: top slopes 24 deg (down 0.21 S over 0.47 S), underside nearly flat.
Overhang is weight-independent: 56-70u = 0.11-0.135 X.

## 6. Terminals (ball / teardrop; r a f; also y j g)
Ball diameter / S (r, a, f, y, equal within a font): Y .72 (R = 57u), P7 1.02 (R 73u), P9 0.96 (R 87u), Pr 1.03 (R 52u); med 1.0 S for P/Pr; absolute R/X: .115 .14 .17 .10. OURS 0.50 S (R 36u).
Neck (thinnest, 1-3 R behind the ball) = 12-17u for P (0.083-0.12 S), 24u Y, 24u Pr -> neck/D 0.09-0.23 (OURS 0.35 but ball too small).
Construction: ball = 4 extreme nodes (circle k=.55) welded to the hairline arm; arm joins tangentially on the inside of the ball (axis points from ball centre toward the stem at 127-149 deg for r, 119-126 deg for f, 54-61 deg for a-top (ball sits upper-left of its arm), -38..-52 deg for y). The ball's outer edge sits above/inside the arm: arm centre-line passes through the ball's lower-left quadrant (teardrop).
Wedge cut terminals (e, c, s): vertical-ish cut 0.14-0.23 S long (P7 cut vertical at x=0.92X, y .28-.30X; Pr cut horizontal-ish 0.30X; OURS horizontal wedge 0.31X). Cut position is on lower right at 0.28-0.30X above baseline in all four pros + OURS.
e crossbar: bar centre at 0.615X (P7 .61, P9 .61, Pr .62; thickness .037-.048 X = 19-25u); Y is slanted 0.45-0.60 (centre .478). OURS 0.525X (too low by 0.09X), thickness .05X.

## 7. Diagonals
- Thick diagonal perpendicular width = 1.00 S (P/Pr/Y/OURS identical); thin diagonal perpendicular 0.18 S (Y .18, P7 .18, P9 .18, Pr .26): 26-32u. Angle from vertical, v thick: Y 27, P7 21, P9 21, Pr 22 (OURS 21); thin: 22, 17, 14, 20 (OURS 21): thin diagonal is 3-7 deg steeper than thick in P; they meet at a pointed vertex (v apex width at 0.04X: Y .36 S, P .57-.62 S, Pr .61; OURS 1.27 S -> flat-bottomed, ours too wide).
- v/y baseline overshoot -0.004..-0.04X (pointed). 
- y: thick diagonal from top-left flag to junction; thin from top-right with its own flag, tail = hair + ball (sec. 3, 6).
- k arm (thin diagonal, upper): perpendicular .27 Y, .40 P7, .47 P9, .37 Pr (OURS .18); angle from vertical 38, 34.5, 28, 47 deg (OURS 44). So pro k arms are 0.3-0.45 S thick, not hairline.
- Diagonal serifs: same unit as stem serifs sheared by the diagonal (OURS already follows).

## 8. Contrast and axis
hair/S at o top: Y .125, P7 .139, P9 .111, Pr .22 (OURS .178); side/S 1.04-1.10. Contrast side:hair ~ 7.5:1 (Y 8.5, P7 7.6, P9 9.4, Pr 5). Axis: exactly vertical, mirror-symmetric ring (thin points at centre +-0), overshoot o: 14-15u (Pr 9) = 0.029X. Thin joins: arch/stem hairline min 18-22u.

## 9. Cyrillic constructions (visual + nodes, see anatomy_be/de/zhe/ze/ka/el/ya/u_cy/e_rev/che.png)
- **б**: bowl = o-type ellipse with a tall narrow lens counter (Pr: counter sides nearly straight); flag = one ribbon starting on the bowl's LEFT outer edge at 0.60-0.65X, rising on a concave curve to the ascender (1.50X in Y/P/Pr), turning right and running nearly horizontal to a sheared end; ribbon thickness ~0.25-0.3 X at the end, thinning to a hair where it leaves the bowl; inner edge of the ribbon returns to the bowl top-left at ~1.0X (P: 1.1-1.15X). Top of the ribbon end is horizontal at the ascender (corner nodes 2 only). OURS ribbon starts at 1.0X from a vertical edge and is shorter (1.40-1.53X).
- **д**: pros draw the printed form: roof flat at X with serifs, left leg a long concave curve ending in a bracketed foot, right stem, base line at 0.0 with feet dropping to -0.32X (width ~0.12X, both feet vertical-cut, curved flare 0.33 S). Y/P foot brackets are the same concave cubic as sec. 5. OURS draws the oval/ковш variant (approved) — different topology (a 'g' like).
- **ж**: P/Y/Pr arms are S-curved (diagonal then curling into a ball at x-height; ball D ~1 S), central stem with crossbar nodes at 0.5X; arm joins are tangent smooth nodes, thin 20-30u. OURS: straight diagonal arms with flat serifs.
- **л**, **я** (leaf leg), **у**, **э**, **з**, **ч**, **к**: к arms follow sec. 7; э/з terminal and e/c terminals follow sec. 3 and 6; у tail = y tail; ч bowl hair meets stem at ~0.55X with thin wedge.

## Where Afisha2 deviates most (ranked by visual impact; pro numbers are medians; Baleny reference may justify some, flagged)
1. n/h/m arch shoulder lands on the right stem at 0.50X (dy 0.53X) vs pro 0.70X (dy 0.28-0.33X, one cubic, top handle 0.60-0.84, stem handle 0.62-0.68). Our arch looks like a half-ring glued to stems.
2. No outer arch notch: pro notch bottom at 0.85X (0.79-0.88), 26-34 deg sliver, 0.15X deep; ours flat top to the arch start. Crotch is OK (0.714X vs 0.72-0.80) but its angle should be 0-20 deg and the inner right handle 0.55 (ours 0.32).
3. c/e/s lower stroke: ours hair bottom (.18 S) then re-swelling wedge to 0.66 S at 310 deg; pros either taper monotonically 1.05 -> .67 (bottom) -> .14 S at terminal (Playfair) or keep hair to the terminal (Yeseva/Prata). Check against Baleny before changing; if Baleny has a heavy terminal use Playfair taper, not re-swell.
4. Head flag: top slopes 24 deg (drop 0.21 S) with a thin flat underside; pros: flat top at X, tip 0.12-0.15 S (21u), concave bracket underside (face height 0.6-0.75 S). (Slope is from the Baleny measurement in SPEC; pros never slope.)
5. Ball terminals r/a/f/y: D = 0.50 S (R 36u) vs pro 0.72-1.03 S (med ~1.0 S for bold; R 0.10-0.17X) with neck 12-24u; ours reads as a dot not a teardrop.
6. Bowl weight distribution: side W = 1.00 S vs 1.04-1.10 S; thinning starts too early (30 deg: .90 vs .98; 45 deg: .74 vs .83) and hair 26u vs 20-22u (hair/S .178 vs .11-.14, or .22 for light Prata). Round-bowl outer kappa .57 vs pro .60-.71 (squarer); counter handles top .80 / side .30 vs .96 / .22.
7. Serif brackets: tip handle 0.31 L vs 0.81-0.88 L, rise/L 0.57 vs 1.1-1.3 (bracket school) and tip 15u vs 21u; our profile at 25 % from the stem is .48 vs .18-.20 (pro fillet hugs the base then climbs). If using the wedge school (Y/Pr) make it straight, 15-20u tip, rise 0.1-0.25 S.
8. y/j/g tails: bucket 1.0 S thick vs hair (0.11-0.14 S) tail + 0.75-1.0 S ball. e crossbar at 0.525X vs 0.615X (P/Pr), thickness 0.05X vs 0.04X.
9. v/w/y apex: flat 1.27 S wide at 0.04X vs pointed 0.36-0.62 S; k arm hair 0.18 S vs 0.27-0.47 S (thin/thick arms of k are not hairline in pros).
10. Arch thin-point is centred (90 deg, 18-26u) vs pro shifted left (100-120 deg) with right shoulder reaching full S by 45 deg (ours 0.83 at 40). Also Cyrillic: ж straight arms vs curled ball arms, д oval variant vs bracketed-foot form, б ribbon starts at 1.0X vs 0.60-0.65X; stem pitch 0.78X vs pro 0.58-0.68X (n/h/u) — pitch is a Baleny-target decision.
