# ParaType glossary — condensed knowledge base (source: info.paratype.ru/glossary, 454 terms, read in full 2026-10-25)

## 1. Classification (use for tags; Russian labels as ParaType uses them)
- **Антиква** (serif): старого стиля [венецианская = гуманистическая (Jenson), гаральды (итало-французская; Garamond, Aldus), голландская (van Dijck, Kis), английская (Caslon)] · переходная (барокко; Baskerville) · нового стиля = классицистическая (Didot, Bodoni, Walbaum; vertical axis, unbracketed thin serifs) · англо-шотландская (Scotch; bracketed serifs) · малоконтрастная (Clarendon/Ionic, legibility types) · латинские (oversized triangular serifs, display).
- **Брусковые** (slab): египетские (no bracket, monoline, 1815) · кларендоны (bracketed) · геометрические · гуманистические · итальянские (reverse contrast).
- **Гротески** (sans): старые (Akzidenz, Franklin) · новые (neo-grotesque: Helvetica, Univers; closed, uniform widths, large x-height, oblique not italic) · геометрические (Futura, Avant Garde; circle/square/triangle) · гуманистические (Gill, Frutiger; open, true italics).
- **Рукописные** (script): by tool — ширококонечное перо, остроконечное перо, кисть, other; by joining — связные / полусвязные / несвязные. Gothic and Old-Russian are separate groups.
- **Готические** (blackletter): текстура, ротунда (круглоготический; Italy/Spain XV c., wide, one break, many rounds), бастарда/швабахер, фрактура, канцлей.
- **Древнерусские / кириллические рукописные**: устав (XI–XV, slow majuscule, near-square, no lowercase; late forms angular), полуустав (from XIV, upper+lower, ligatures), скоропись, **вязь** (decorative ligatured ornament script — NOT a synonym of устав).
- **Акцидентные (display)**: by purpose, not by structure; decorative styles: контурное (outline), оконтуренное (inline), оттенённое (shaded/3D), выворотное (cameo), фактурное, трафаретное, машинописное, экранное.
- **Неалфавитные** (dingbats, ornaments, политипаж/флерон, виньетки, бордюры).
- Function: текстовые (6–14/16 pt) · заголовочные/титульные (>14–16 pt) · крупнокегельные/плакатные (>36…96 pt).

## 2. Anatomy terms (RU ↔ EN) — use in UI labels
основной штрих/штамб (stem) · соединительный штрих (hairline) · перекладина/кроссбар (bar) · горизонталь (arm) · дуга (arc) · полуовал (bowl) · овал · ось овалов (axis; ~30° in old style, vertical in modern) · наплыв (stress) · внутрибуквенный просвет (counter) · глаз (eye of e) · апертура (closed/semi/open) · апекс · узел (knot of Ж К) · спина (spine of S) · петля (loop of g) · присоединение (link) · ухо (ear) · хвост (tail) · шип (spur of G, b) · засечка/сериф (одно/двусторонняя; скруглённая adnate / нескруглённая abrupt; скругление = bracket) · вертикальная засечка (beak) · концевой элемент (terminal) · каплевидный элемент (ball/teardrop) · ловушка (ink trap; inner angles < 30°) · росчерк (swash) · выносные элементы верхний/нижний · свисание (overshoot, верхнее/нижнее) · боковое свисание (kern beyond sidebearing) · двухчастная конструкция (double-storey a g).
Lines: базовая линия/линия шрифта · линия строчных (x-height line) · линия прописных (cap line) · линии верхних/нижних выносных. Heights: рост/высота строчных (x-height, «очко шрифта» large/small), рост прописных (cap height).

## 3. Metrics, spacing, units
- Кегль, кегельная площадка (em square), цифровая единица = 1/1000 кегля (UPM 1000). Digital fonts designed at базовый кегль 28 pt.
- Апрош = space between letters; **полуапрош = sidebearing** (each glyph has left/right); толщина литеры = advance (width + both sidebearings); ширина знака = ink width.
- Кернинг (pairs; positive/negative), кернинговые пары (hundreds–thousands), трекинг (uniform), разрядка (letterspacing for emphasis), межсловный пробел (≈1/3 em digital; Latin ≈ width of i), интерлиньяж, шпации: круглая (em), полукруглая (en), третная, четвертная, тонкая (1–2 pt), неразрывный пробел.
- Пропорции (by Н width/height): сверхузкое · узкое (40–60%) · нормальное · широкое (≥100%) · сверхширокое. Плотность очка (ГОСТ 3489.1–71: н width/height).
- Насыщенность: сверхсветлое (Thin/ExtraLight) · светлое (Light) · нормальное (Regular/Book) · полужирное (Medium/SemiBold) · жирное (Bold) · сверхжирное (Black/ExtraBold). **Rule: text Bold stem ≥ +25% vs Regular.**
- Контраст: неконтрастный · малоконтрастный · контрастный · сверхконтрастный. Old-style contrast 1:2–1:3.
- Постановка очка: прямое · курсив (cursive forms) · наклонное (oblique = slanted roman, not italic) · косой (back-slant, cartography). Italic slope usually 2°–20°; capitals slant less than lowercase in classic italics.
- Униширинные (uniwidth: same advances across weights — UI fonts) vs моноширинные vs пропорциональные.
- Типометрия: pt Adobe = 1/72" = 0.3528 mm; Didot 0.3759 mm; pica 12 pt; cicero 12 Didot pt. Size names: нонпарель 6, петит 8, боргес 9, корпус 10, цицеро 12, миттель 14, терция 16.

## 4. Characters and typesetting rules (character-set checklist)
- Figures: маюскульные/равновысокие (lining) · минускульные/старостильные (oldstyle) · табличные (tabular) · пропорциональные; € drawn on tabular width matching figures; indices: верхние (superior), нижние (inferior), суб/суперииндексы; дроби (fraction bar ≈45°, cap-figure height ≠ slash).
- Dashes: дефис (not spaced) · короткое тире – (ranges, unspaced between figures; ≠ minus) · длинное тире — (spaced with thin spaces in RU) · цифровое тире; minus separate.
- Quotes RU: «ёлочки» primary, „лапки“ inner; using "inches" is a gross error. German »inside«.
- № for Russian (not No./#); § spaced half-em; ‹› ; ¶; † ‡; * asterism; @; & (Et ligature); ¤ currency; ©.
- Ё mandatory in dictionaries/education; Cyrillic breve on Й/Ў has thickened ENDS (Latin breve thickens in the middle).
- Капитель = small caps slightly wider than caps, a bit taller than x-height (not scaled caps). Useful in Cyrillic too (а б е р с у ф differ).
- Лигатуры: Latin fi fl ff ffi ffl æ œ; not used in Russian; discretionary ct st as in italics/scripts.
- Альтернативные глифы, росчерки (swash) via OpenType.
- Инициал: стоящий (raised) / утопленный (drop cap) alignment rules.
- Pangrams RU: «В чащах юга жил-был цитрус… — да, но фальшивый экземпляръ», «Съешь ещё этих мягких французских булок, да выпей же чаю», «Экс-граф? Плюш изъят. Бьём чуждый цен хвощ!», «Южно-эфиопский грач увёл мышь за хобот на съезд ящериц».

## 5. Technology
- Формат: TrueType (quadratic B-splines; инструкции), PostScript Type 1 / CFF (cubic; хинты), OpenType (Unicode, features), веб: woff/woff2; вариативные: .ttf (gvar) or .otf (CFF2), name suffix VF/Variable; axes: wght, wdth, opsz (оптический размер), slnt/ital; Multiple Masters = ancestor (masters ×2 per axis).
- Interpolation requires matching point count/order/type in masters.
- Composite glyphs via anchors (якоря) — base + mark. Экстремальные точки = nodes at x/y extrema.
- Хинтование/автохинтинг (ttfautohint), алиасинг/антиалиасинг, grayscale, экранные шрифты.
- Метрики in file: advances, kerning pairs; PANOSE (10-digit classification in OS/2: family, serif, weight, proportion, contrast, stroke variation, arm, letterform, midline, x-height); кодировки CP1251 / Mac Cyrillic legacy; Unicode today.
- Полиграмма: overlay construction scheme of a letter group (Н И П Ц; О С Э Ю) used to draft related letters, then refined optically.
- Различимость (legibility of single glyphs) vs удобочитаемость (readability of text); цветность (typographic colour of a page).
- Language support = all alphabet letters + punctuation + locl forms of that language.
