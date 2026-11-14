---
name: type-design-foundation
description: Use for any font creation, editing, review or font-tool work: the reference knowledge base and the build-from-foundation workflow (base construction first, unique design second).
---

# Type design foundation

Rule zero: never invent a typeface from scratch. Build the standard construction first (metrics, control glyphs, components, spacing, kerning, OpenType), verify it, and only then apply the unique design layer (style parameters, signature forms). Unique decisions are deltas on a sound base. Use ParaType terminology (section 16) in every UI label, tag and report to the user.

## 1. Workflow (fixed order)
1. **Brief**: genre by ParaType classification (section 16), use (text/display), scripts (Latin, Cyrillic, extended), charset (basic or extended) and target languages, weights/styles, user rules.
2. **Metrics**: UPM 1000; cap height, x-height, ascender, descender, overshoot; vertical metrics policy (section 3).
3. **Construction system**: stem, hairline/horizontal, contrast axis, round vs straight ratio, terminals, joins, apertures. Store as parameters, not per-glyph numbers.
4. **Control glyphs**: H O n o (+ Н О н о, then a e s g). Approve these before anything else.
5. **Components**: stems, bowls/rings, arches, diagonals, terminals, serifs, dots, diacritic marks. Every glyph is assembled from components; shared Latin/Cyrillic forms are one glyph.
6. **Full set by families**: n-family (n h m u r), o-family (o c e d b p q), diagonals (v w x y k z), caps by structure (straight/round/diagonal), figures, punctuation, symbols, Cyrillic specifics, diacritics.
7. **Spacing** (section 5), then **kerning** (section 6).
8. **OpenType + export** (sections 8–9).
9. **QA** (section 10). Only now: **unique design layer** → re-run QA.

## 2. Anatomy and optics (rules)
- Overshoot (свисание): round and pointed forms exceed the flat lines by ~1–3% of the height (10–15 u at UPM 1000 for x-height 500). Apex/vertex of A V W M also overshoot or are cut.
- Horizontals look heavier than verticals of the same thickness: horizontals 80–90% of stem in a sans; more contrast in serif.
- Round stems are heavier at the extremes than straight stems (O side ≈ 105–110% of H stem); thin the bowl where it joins a stem (ink-trap logic, b d p q n). Ink traps (ловушки) where inner angles are < 30°.
- Optical center: crossbars of E F H sit slightly above geometric middle; upper bowls (B, 8, 3, S) smaller than lower.
- Diagonals: thinner than stems where they meet (A V W X K), use pen-ellipse width, not a constant offset.
- Round caps are slightly wider than straight caps' optical width; O is the widest base cap after M W.
- Lowercase vs caps: same construction logic, caps stems ~5–10% heavier than lowercase stems in text faces.
- Joins in heavy weights: notch or taper where arches enter stems so counters stay open (join compensation).
- Apertures (c e s a): open more in heavy and condensed styles.
- Axis (ось овалов): ~30° from vertical in old-style/broad-nib faces, vertical in modern/neo-grotesque; stress (наплыв) sits perpendicular to it. Measure the main axis on O.
- Italic: slant 8–12° with optical correction (rotate rounds slightly, keep stems' weight); true italic (курсив) forms where the genre requires; a slanted roman is «наклонное» (oblique), not italic. Classic italics: capitals slant slightly less than lowercase; most italics 2°–20°.
- Tangents: every curve-to-curve and curve-to-line join is G1 (collinear handles) unless it is an intended corner. Nodes on extremes (H/V tangents). No kinks, steps, or micro-segments.
- Bezier quality: handle length ~0.55 of the segment for circle-like arcs (κ = 0.5523 for a circle); "superellipse" tension 0.6–0.75 for squarish grotesks; avoid handles crossing.

## 3. Metrics and vertical policy
- Typical (UPM 1000): cap 700, x 500–540, asc 720–760, desc −200..−250. Digital fonts are designed at a base size of ~28 pt.
- hhea ascender/descender = OS/2 typo = real ink bbox of the set (or typo with USE_TYPO_METRICS bit 7); winAscent/winDescent ≥ max/min ink so nothing clips.
- lineGap 0; total ascender+|descender| ≈ 1.2× UPM for comfortable default leading.
- Accents on caps may exceed winAscent only if winAscent covers them. Editors must show the accent zone (up to cap + 0.35 em).

## 4. Cyrillic and Latin together
- Shared forms are identical glyphs/components: А В Е К М Н О Р С Т Х, а е о р с у х, і ј ѕ.
- A shared glyph must read correctly in BOTH scripts: a Latin-genre form that reads as another Cyrillic letter is a bug (round uncial E reads as Є). Check every shared glyph inside Cyrillic words.
- Cyrillic specifics (follow Zhukov/ParaType practice):
  - Д Л Ц Щ: descenders on the right (Ц Щ) or both feet (Д); Л with a hooked or straight left leg matching the style.
  - Ж К: arms match K; Ж symmetric, knot (узел) at optical center, not overloaded in heavy weights.
  - Б: top flag the length of Г's arm; б lowercase has an ascending flag/curve, never a scaled Б.
  - И Й: diagonal thinner than stems. **Cyrillic breve on Й/Ў has thickened ENDS** (teardrop ends in serif faces) — unlike the Latin breve, which thickens in the middle. Small, accent weight, never a spike.
  - Ы Ь Ъ Ю Я: bowls from Р/Ь component; Я is mirrored R logic, not a literal mirror. Ы = Ь + I with a normal inner gap; Ъ must differ clearly from Ь (flag).
  - З opens to the left and must differ from Э and from 3; У must differ from Ч and 4 (a curled left arm reads as Ч — use a straight diagonal).
  - Lowercase в д к л м н п т in roman are small caps–like but with lowercase stem weight and x-height optics; italic forms (д g-like, т m-like, и u-like, п n-like) for true italics/scripts.
  - У/у: Cyrillic у ≈ Latin y; capital У ≠ Y (straight left arm) — except in unicase display faces where a shared form is part of the design.
  - Ё is mandatory in dictionaries, education, ambiguous words; the diaeresis must clear the cap.
- Latin specifics: n and r are arch/shoulder forms; m is triple arch (a project rule may alias m to Cyrillic м — keep a stylistic set for the other form). W needs diagonals (two V's), not Ш logic; G needs a spur/bar so it doesn't read as C.
- When a reference shows only one script (or another script entirely, e.g. Japanese), design Cyrillic and Latin in the same construction logic, never by borrowing a generic form.

## 5. Spacing
- Terms: апрош = space between letters; полуапрош = sidebearing (left/right of each glyph); толщина литеры = advance; ширина знака = ink width; трекинг = uniform change; разрядка = letterspacing for emphasis.
- Method (Tracy, "Letters of Credit"): set n and o first: n side bearings from stem (left ≈ right, slightly less on arch side); o both sides ≈ 70–80% of n's straight side. H and O likewise. Straight sides = n/H, round sides = o/O, diagonal/open sides ≈ minimal.
- Area method (HT Letterspacer): equalize white area between glyph and a reference depth zone; good for automating, then correct optically.
- Test strings: nnonnoo / HHOHHOO / nnxnn / Ннонно / words with heavy rhythm (minimum, шиншилла, Иллюминация).
- Word space ≈ 1/3 em (Latin ≈ width of i); spaces needed in every font: space, NBSP (U+00A0), thin space U+2009 (≈ 1/5–1/8 em), NNBSP U+202F.
- Display faces: tighter; text faces: looser. Heavy weights need slightly more sidebearing. Wide letters with tails (Ж Ш Щ Ц Д) need their own width/sidebearing check.
- j, f tails may extend into neighbors (боковое свисание); kern collisions after descenders/ascenders.
- Ornaments that project sideways: space from the letter BODY, let the projection hang into neighbour space, kern by body-band gap with a full-profile collision guard.
- Uniwidth (униширинные) option: identical advances across weights/italic for UI fonts; monospaced = one advance for all glyphs.

## 6. Kerning
- Kern only after spacing is right. Use classes by shape: straight, round, diagonal, open-top (T F P), open-bottom (L), etc.
- Priority pairs: caps (AV AT LT LY PA TA VA WA YA), cap+lc (Ta Te To Va Ye), punctuation (T. V, F. P. „ » « “), figures (11, 17, 74), Cyrillic (ГА ТА УА ЛТ Г. Т. Ту Гд), quotes.
- Exceptions override classes; a class value = median of its pairs, outliers become exceptions. Keep values ≤ ~15% UPM; never let kerning create collisions.
- Localized/alternate/small-cap glyphs join the kerning classes of their base glyphs (small caps: scaled cap classes).
- For connecting scripts never kern across a connection.

## 7. Diacritics and composites
- Build from anchors (якоря): base + mark at top/bottom anchor (bbox centre or optical centre, clearance ≈ 30 u above, ogonek/cedilla overlap the base); caps use cap-height mark variants (flatter, lower); i/j use dotless bases.
- Marks share stroke weight with the face; dots round/square per the face; mark height ≈ 0.15–0.25 cap height, width ≤ 0.8 of the base.
- Ogonek, cedilla, comma-below attach to the base outline; caron on ď ť ľ Ľ is the apostrophe form with clearance.
- Check heavy and light weights: no fusion with base (min gap ≈ 0.3×stem), no detached slivers.
- Coverage baseline (extended charset): Latin-1, Latin Extended-A, Cyrillic basic + Ukrainian, Belarusian, Serbian/Macedonian (Ђ Ј Љ Њ Ћ Џ Ѕ, locl forms), Kazakh/Bashkir/Tatar if requested. Report support per LANGUAGE (CLDR main exemplars) with the exact missing letters.
- Basic charset (display faces on request): A–Z a–z, А–Я а–я Ёё, 0–9, . , : ; ! ? « » „ “ ” ‘ ’ " ' - – — … − ( ) / & №, space, NBSP, thin space, NNBSP. Declare it as a font property.
- Punctuation in the face's logic: « » real chevrons, „“ from the comma, … one glyph (tighter than three periods), − on figure width and the + bar axis, & distinct from 8, ? with a clean hook, № with an open o, 1 carrying stem weight.

## 8. OpenType features
- kern (GPOS, classes + pairs), mark/mkmk if marks are separate; liga (fi fl ff ffi ffl) only in Latin text faces — Russian uses no ligatures; case; tnum/pnum, lnum/onum (all 4 combinations; currency signs on tabular width); smcp/c2sc; frac (numr/dnom + fraction bar U+2044 at ~45°, not the slash), sups/subs/sinf, ordn; salt/swsh for scripts; ss01–ss20 named; calt for connecting scripts; locl for Serbian/Bulgarian.
- Small caps (капитель): true small caps, not scaled capitals — height ≈ x-height + 3–8%, slightly wider than caps, stem weight = lowercase stems, built from the same components. Useful in Cyrillic (а б е р с у ф differ); used with oldstyle figures.
- Oldstyle figures (минускульные): 6 8 ascend, 3 4 5 7 9 descend; lining (маюскульные) at cap height.
- Substitutions must be reversible and not break shaping across scripts; browsers split script runs, so calt cannot connect Cyrillic to Latin in one word. Glyph names follow AGL (a.sc, one.osf, one.tf, one.numr, uni2044).

## 9. Naming, passport and export
- Name IDs 1/2 (RIBBI: Regular/Italic/Bold/Bold Italic as one family), 4, 6 (ASCII PostScript; transliterate Cyrillic), 16/17 for other weights, ID 10 description; usWeightClass 100–900; usWidthClass from proportions; fsSelection bits; italicAngle negative for right slant; post format 2. File names and unique ID follow the user's font name.
- OS/2 passport: ulUnicodeRange/ulCodePageRange from the cmap (CP1251, CP1252, CP1250…), sFamilyClass, 10-digit PANOSE computed from parameters (family kind, serif, weight, proportion, contrast, stroke variation, arm, letterform, midline, x-height), fsType 0, x/cap height; gasp (smoothing small, grid-fit+smooth from ~9 ppem). Prove metadata-only changes by comparing glyf/hmtx/GSUB/GPOS byte-identity.
- Hinting: do not ship hand-rolled TrueType instructions you cannot verify at 9–14 px; prefer ttfautohint offline, otherwise state «no hinting» honestly.
- Weights (насыщенность): сверхсветлое Thin, светлое Light 300, нормальное Regular 400, полужирное Medium/SemiBold, жирное Bold 700, сверхжирное Black 900. **Bold stem ≥ 1.25× Regular** (ParaType rule for emphasis); Light < Regular < Bold < Black strictly. Stem/x-height ≈ 0.22 / 0.32 / 0.44 / 0.53 for sans; compensate apertures, counters, joins and width as weight grows. Display faces may be heavy-only.
- Proportions (by Н width/height): сверхузкое · узкое (40–60%) · нормальное · широкое (≥ 100%) · сверхширокое.
- Variable fonts: masters point-compatible; axes wght, wdth, opsz (оптический размер), slnt/ital; overlapping contours allowed (OVERLAP_SIMPLE); intermediate masters where an outline would self-cross; filter alternates identically in static and variable builders; suffix VF/Variable.
- Decorative styles (декоративные начертания) derived from outlines: контурное (outline), оконтуренное (inline / outer contour), оттенённое (shaded/3D, solid or hatched), выворотное (cameo). Offset by flatten → offset (miter/round) → exact boolean → refit; clamp offsets by the font's min stem/counter; node count ≤ ~4.5× (7× hatch); separate family names («<Family> Outline»).
- Validate with fontTools (load, save, compare, instancer vs static), render-test in a browser with features on/off.

## 10. QA checklist (run before any delivery)
1. Topology: expected contours/holes; no detached parts, stray micro-contours, wrong direction.
2. Outline quality: G1 joins, extrema nodes (экстремальные точки), no steps/kinks/notches, node count reasonable (sans ≤ ~20/glyph, script ≤ ~30, spiked display ≤ ~40).
3. Zones: nothing pokes outside its zone except intended overshoots and extenders.
4. Consistency: stems/horizontals within ±3% of system; shared Cyrillic/Latin glyphs identical; caps/lowercase share construction.
5. Counters: none closed in any weight; apertures readable at 12 px.
6. Spacing/kerning: test strings even; no collisions in 40+ critical pairs; no pair gap that reads as a word space.
7. Diacritics: clearance in all weights, anchors, caps variants, Cyrillic breve form.
8. Export: fontTools round-trip, names/weights/metrics/passport correct, features work in Chromium.
9. Parameter robustness: random/extreme sweeps keep topology identical to defaults; interdependent limits; fix with adaptive geometry first.
10. Visual: proof sheets per weight/style, text RU/EN at 16/48/120 px; the lead's eye on key images incl. the real editor view.
11. Genre check: reference crop vs ours side by side; reject «clean but generic».
12. Isolation: a font's sliders must not leak to other fonts or change their random-test sequences.
13. Misread audit (различимость): next to a plain reference font, list every glyph readable as another letter (Є/Е, Э/З/3, Ч/У/4, П/А, Λ/Л, Ш/W, C/G, 8/&, П/М, I/l/1, O/0, ив/иб, р/п). Automate with a 12-px pixel-IoU check; write the audit before fixing.
14. After changing width/slope defaults re-run every proof lane; exempt intentional features via per-font hooks.
15. Typography completeness: Russian quotes «»„“, — – - − distinct, …, №, NBSP/thin space, Ё, breve form, Bold ≥ +25%.
16. Typographic colour (цветность): a justified paragraph has even grey value; no rivers.

## 11. Construction recipes (parametric)
- **Grotesk**: rectangle stems, superellipse rings (tension 0.6–0.75), flat terminals cut horizontally or at a fixed angle, joins notched in heavy weights, diagonals by pen-ellipse width.
- **Geometric/monoline**: skeleton paths + round pen (offset curve with adaptive subdivision and Bezier refit), circles κ=0.5523, round or flat caps, joins round. Ligatures in monoline faces fuse crossbars at low hair — bridge or drop them.
- **Broad-nib (uncial, humanist serif)**: skeleton + elliptical/flat nib at fixed angle (20–35°); serifs as pen entry/exit, wedges; contrast from nib, not drawn thicks.
- **Pointed-pen script**: skeleton + pressure by direction (downstrokes thick, upstrokes hairline), slant 15–22°, connections at one height, entry/exit strokes, loops on descenders; swashes (росчерки) via swsh/salt with smooth junctions.
- **Rotunda (round gothic, Polanco-type)**: colour first — stem/xh ≈ 0.34, hair ≈ 0.06 xh, nib 28–38°, compact width, short ascenders, tight spacing (sb ≈ 42). Counters become lancets from the nib. Stem ends cut along the nib; never cut a stroke with a near-parallel line. Diamond dots. Е must be stem + bars (uncial E reads as Є); M straight stems + wedge; 1 with a low flat flag. Rejected on a pen-width engine: two-arc lancet bowls, rotunda feet (need dedicated terminal code).
- **Condensed Old-Russian display (ustav-inspired)**: skeleton + elliptical pen, fat verticals, hairline horizontals, flare via node weights, lancet bowls, thin sloped crossbars (rise ≤ 0.1 h), drop serifs ≤ 0.26 h, square dots, unicase; width ~95%; У straight diagonal arm; Е short tick (≤ 0.05 h). Exempt sloped bars (incl. H/Н) from bar checks. Classify as «Древнерусские · Устав», never «Вязь».
- **Modular grid display**: heavy slab minus keyholes; one stroke module; cell classes; unicase; tight modular spacing; overlap glued parts by 1–1.5 u. Diagonal letters from bands/wedge pockets; band cap ~0.3 w for Black. Traps: A needs a bar; З/3 a right waist notch; Y/У a band fork; W two V bands; G bar shelf + spur; M V to 0.5 h.
- **Spiked monumental display («Рывок»)**: heavy wide unicase grotesk, slit counters; horns grow out of the stroke (full stroke-end base, one straight + one concave edge, tip 28–34 u), along baseline/bars, placed per glyph on ~60–70% of letters; spacing from the body, body-band kerning. Rejected: uniform ears, thin spurs under the baseline.
- **Display/unique layer**: change parameters, signature forms via stylistic sets — never break the base construction or user rules.

## 12. Reference-driven design (user supplies images)
- Extract genre-defining traits first and list them as acceptance criteria. Build ORIGINAL letterforms; historic public-domain models may be followed more closely.
- First deliverable: side-by-side sheet of key letters. Colour first, details second.
- Ornaments read as part of the stroke silhouette; vary them by letter structure.
- Design missing letters from the same modules/pen, then check them in words.
- After two non-converging rounds, show the user 2–3 concrete directions.

## 13. User-drawn fonts (draw-your-font tools)
- Grids: modular rectangles (2×4, 3×4, 4×4 cells), circles + diagonals, 4×4 tile, 45° diagonal, pixel; snap to nodes, quadrants, intersections; one-click cell/triangle/quarter-disc fills.
- Every tool outputs filled closed contours (strokes outlined + simplified; eraser = subtract).
- Полиграмма: overlay drawn letters of one construction family as thin tinted outlines (no fills) and offer editable drafts (П←Н, Ш/Ц/Щ←Н·П·Ш, Э←С mirrored + bar, Ь←Р, Ъ←Ь + flag, Ы←Ь + stem, Е←Н/Г).
- Anchors: automatic top/bottom anchors, draggable; marks drawn once (кратка with thick ends, diaeresis, acute, grave, circumflex, caron, macron, tilde, ring, cedilla, ogonek, dot) generate Й Ё Ў Ї and accented Latin automatically, updating live; detachable.
- Assistant: stem consistency, heights/baseline/overshoot, optical sidebearings, specks, open paths, shared forms, oversized marks, languages covered + letters to draw next — each with an automatic fix where possible.
- Test as a REAL in-memory font (FontFace) before saving; persist sidebearing adjustments.

## 14. Professional type tester (conventions)
- Size as кегль in pt with mm (1 pt = 0.3528 mm) and px readout; интерлиньяж in pt and %; трекинг in 1/1000 em; выключка left/centre/right/justified + hyphenation; формат набора in characters (optimum 60–70, acceptable 45–75); never clip text — scale the preview and show the scale.
- Panels: Набор, Различимость (confusable pairs at 12 px), Цветность (grey evenness, rivers), Водопад (8–72 pt).
- Pangrams RU: «В чащах юга жил-был цитрус… — да, но фальшивый экземпляръ», «Съешь ещё этих мягких французских булок, да выпей же чаю», «Экс-граф? Плюш изъят. Бьём чуждый цен хвощ!», «Южно-эфиопский грач увёл мышь за хобот на съезд ящериц».

## 15. Font metadata and library tags
- One metadata entry per font drives covers, hover cards and search: id, name, year, desc (1–2 sentences in ParaType terms), tags[], sample, charset, styles, weights; a test fails if year/desc/tags are missing. Covers: «Название + год», sized by cap height.
- Tag facets: Группа (classification), Инструмент/конструкция, Пропорции, Контраст, Назначение (Текстовые/Акцидентные), Набор знаков, Языки, Технологии (Вариативный). Wrong labels seen: «Шрифт пера» (not a category → «Рукописные» + tool), «Вязь» for an ustav-based face.

## 16. ParaType glossary digest (info.paratype.ru/glossary, 454 terms)
- **Classification**: Антиква старого стиля (венецианская/гуманистическая, гаральды, голландская, английская), переходная, нового стиля (классицистическая), англо-шотландская; Брусковые (египетские, кларендоны, геометрические, гуманистические, итальянские = reverse contrast); Гротески (старые, новые, геометрические, гуманистические); Рукописные (ширококонечное / остроконечное перо / кисть; связные / полусвязные / несвязные); Готические (текстура, ротунда, бастарда/швабахер, фрактура, канцлей); Древнерусские (устав — near-square majuscule, no lowercase; полуустав; скоропись; вязь — ligatured ornament); Акцидентные (by purpose); Декоративные начертания; Неалфавитные. By size: текстовые 6–14/16 pt, заголовочные > 14–16 pt, крупнокегельные > 36 pt.
- **Anatomy**: основной штрих/штамб (stem), соединительный штрих (hairline), перекладина (bar), горизонталь (arm), дуга, полуовал (bowl), овал, ось овалов, наплыв (stress), внутрибуквенный просвет (counter), глаз, апертура (closed/semi/open), апекс, узел, спина, петля, присоединение, ухо, хвост, шип (spur), засечка (одно-/двусторонняя; скруглённая/нескруглённая), вертикальная засечка (beak), концевой элемент, каплевидный элемент, ловушка, росчерк, выносные элементы, свисание, двухчастная конструкция; lines: базовая/линия шрифта, линия строчных, линия прописных, линии выносных; рост/высота строчных, очко (large/small x-height).
- **Measures**: кегль, кегельная площадка (em), цифровая единица = 1/1000 em; pt Adobe 0.3528 mm, Didot 0.3759 mm; pica/cicero 12 pt; shpacii: круглая (em), полукруглая (en), третная, четвертная, тонкая; контраст: неконтрастный · малоконтрастный · контрастный · сверхконтрастный (old style 1:2–1:3); плотность очка (ГОСТ 3489.1–71, н width/height).
- **Typesetting rules**: Russian quotes «ёлочки» outer, „лапки“ inner — inch marks are a gross error; дефис (unspaced) ≠ короткое тире – (ranges, unspaced between figures) ≠ длинное тире — (thin-spaced in RU) ≠ минус −; № (not No./#), § with half-em space; € drawn on tabular figure width; капитель is not «caps at x-height»; инициал стоящий/утопленный alignment rules.
- **Technology**: TrueType = quadratic B-splines + инструкции; Type 1/CFF = cubic + хинты; OpenType = Unicode + features; web = woff/woff2; Multiple Masters → variable fonts (interpolation needs same point count/order/type); композитный знак via якоря; PANOSE 10 digits; полиграмма = overlay construction scheme for related letters; различимость (single glyphs) vs удобочитаемость (text) vs цветность (page grey).

## 17. References (consult when in doubt)
- ParaType glossary: https://info.paratype.ru/glossary/а (read the whole page in chunks; normal fetchers truncate it).
- Walter Tracy, *Letters of Credit*; Gerard Unger, *Theory of Type Design*; Karen Cheng, *Designing Type*; Fred Smeijers, *Counterpunch*; Gerrit Noordzij, *The Stroke*; Polanco, *Arte nuevo de escribir* (1719); Zhukov/ParaType Cyrillic publications; Ruderman's lectures.
- OpenType spec: https://learn.microsoft.com/typography/opentype/spec/ · Google Fonts guide: https://googlefonts.github.io/gf-guide/ · Glyphs tutorials: https://glyphsapp.com/learn · HT Letterspacer, fontTools, CLDR exemplar characters.

## 18. Applying this skill to a project
- Short English project brief next to the code (metrics, parameters with safe ranges, components, user rules, test commands) plus a glossary digest file (kb/PARATYPE_KB.md style). Agents read the brief + this skill, not each other's reports.
- New font: brief → control glyphs → components → full set → unique layer → metadata entry (year, desc, tags) → passport/languages check.
- Edits: fix the component, re-check all dependants.
- Per-font proof hooks instead of loosening global checks; font-specific sliders hidden on other fonts.
- UI labels use ParaType terms first with a plain tooltip («Основные штрихи», «Соединительные штрихи», «Апертура», «Свисание», «Полуапроши», «Апекс»; weights «Светлое/Нормальное/Жирное/Сверхжирное»).
- One source of truth per font file; delete stale split copies.
- After each font or genre: write a 10–20 line recipe (what worked, traps, rejected versions) and fold it into section 11.

## 19. G-type, where this lives

Installed 14 November 2026, 22:42 Moscow time, from the latest copy in the Claude export. Read this skill before creating, editing, reviewing or exporting a typeface.

- Recipes already in the service: `service/RECIPE_*.md` (Устав, Ротунда, Рывок, Модуль, Нить, Строка, Ренесса, Столб, Сцепка, Аппликация, Капля, Пиксель, Тяга, draft Кортес).
- Skeleton and pen API: `service/SKELETON_API.md`.
- Library passport: `service/FONT_META.md`.
- `kb/PARATYPE_KB.md` is not in the repo. Until it arrives, section 16 is the glossary to use.

When a pass changes construction, metrics, spacing, kerning, OpenType, a recipe, a proof hook or a library tag, update this file in the same pass as `g-type-design-system` and `ui-motion`. When the pass does not touch type construction, add one dated verification line here and leave the rules as they are. Verified 14 November 2026, 22:42 Moscow time: the skill is installed; no glyph was changed on this pass. Verified 15 November 2026, 00:35 Moscow time: moving «Искажение» into the settings group did not change construction, metrics, kerning or export baking. Verified 15 November 2026, 01:00 Moscow time: the skeleton and the editor lattice are drawn through the same distortion as the fill; stored construction, metrics, kerning and export baking are unchanged. Verified 15 November 2026, 01:19 Moscow time: a point, skeleton handle or grid corner dragged under distortion is stored as a construction delta; turning the effect off leaves that nudge, not the warp. Metrics, kerning and export baking are unchanged.
