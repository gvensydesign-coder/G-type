# Recipe: condensed Old-Russian "ustav/viaz" display face on the skeleton engine

1. Engine: skeleton + elliptical pen (stem x hair, nib angle 0). Vertical stems fat, horizontals hairline; no custom pen needed.
2. Flare = node weights, not outlines: bottom node w=1+0.3*flare/100, top node half of that; offset the stem axis by hx*fe so the outer edge stays on the metric line.
3. Lancet bowls: corner node at the right vertex with di/do = -(90-v), -(90+v), miter join. Keep v ~ 1.1*al (al = point*38 deg); sharper looks like a leaf cut-out, and it self-intersects when stem is heavy.
4. Both bowl apexes (top/bottom) are corner nodes too; for 8 make the two ovals' apex centrelines coincide (e = hy*0.9 - ov) - otherwise a gap or lens hole appears at some parameter combos.
5. Thin sloped crossbars: slope is a param, but cap the rise (<= 0.1h) and start drop-serifs at the bar-end y (not y=0) or L/E/F split into two parts.
6. Drop serifs: length min(l*drop+hy, 0.26h); square dots (sqDot) for . : ; ё й.
7. Unicase lowercase = same forms at x-height, only ascender/descender letters differ (б д р у ф, b d p q ...). Arched n/m/h/r with pointed arch; Latin m arched, ss01 gives the cyrillic form.
8. Latin twins: SK_TWIN maps Cyrillic to Latin glyphs, so A B C E H K M O P T X a c e o p x y s i j must exist.
9. Widths: width helper bw*wdth + nst*(stem-S0)*0.85 (+flare term); heavy weights need width growth (+6%*(k-1)) and flare reduced (flare*(1-0.55(k-1))), hair ~ k^0.45.
10. Limits are where the work is: tighten F.lim (stemWK, wdth min, stem max, hairR) until stress 150x2 is 0; condensed + heavy bowls close counters first (4 B P R Б В Ь Ы Я).
11. Proof false-positives: per-font F.proof hook (stemSet, barSkip) - arched n and sloped-bar letters (З Э Е F) are exempt from the vertical-bar-thickness check; sb 38 fixes "tight margins" on flat T Г Ъ 7.
12. Guillemets must grow with the pen (4.6*stem vs the standard 2.4) or they leave the margins in Bold/Black.
13. Do not scale the width helper with 1.1: the face wants to be tall and narrow (width factor 1.0, stem 110 at cap 700).
14. Basic charset: one flag (charset:'basic'), pruned CHARSET/GROUPS, skip skExtend, cover/proof count only the basic set.
15. Source of truth is core_ustav_n1.js (ust_head/ust_body.js are stale pre-edit copies; there is no build step) - edit core_ustav_n1.js only.
16. У/у/y: the left arm must be a straight diagonal to the right stem (diag K,L,h -> R,0.35h). A vertical-then-curved arm reads as Ч («Чстав»).
17. Е/F/e: short tick at the middle-bar end (midBar). Tick length must not use hair-scaled drop(): cap by 0.05h so the lower counter never closes (stress hole 1/0->1/1 at xh 470, hair 90).
18. Narrower: change DEFAULTS wdth (95 / italic 92) and lim wdth min 92, not the WP width factor (0.95 closed B P Ы Ь 8 r counters at wdth 88 in stress).
19. Ъ/ъ need bw 440 at wdth 92 (420 split the bowl counter with stem=hair=90, slope 16).
20. W87 F: «ступенька на контуре» on М N И Й l (Light/Regular, l Bold/Black) = core_hyg.js step 4 "blunt needles": the 15-20 deg ink spike where a stem meets a diagonal was cut by a default 2 u flat, i.e. a 2 u straight segment between two corners (< 6 u lint threshold; minSeg:0 for ustav keeps it from merging). Fix at construction level: HYG.ustav flat:8 (a real chisel flat, > 6 u even after the 12 deg slant shear). Do not set minSeg>0 for ustav (it would merge real serif edges).
