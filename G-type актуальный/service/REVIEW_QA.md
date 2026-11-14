# REVIEW_QA — G-type m40 (independent design / front-end review)

Method: Playwright, both themes, 1440x900 / 1280x800 / 1920x1080 / 390x844, 12 screens each (96 PNG before, 96 after).
Before: `qa_QA/before/<screen>_<theme>_<width>.png`. After: `qa_QA/after/...`. Extra tooling in the scratchpad: computed-style snapshot of 44 screens (195k elements) used as a regression gate for the CSS clean-up (0 diffs), contrast/clipping audit, Tab-focus audit.

## Scores (1-10): before -> after

| Screen | Before | After | Note |
|---|---|---|---|
| Home (hero + marquee) | 8 | 8.5 | marquee pauses on hover/focus, off under reduced-motion (verified in CSS); chips fine |
| Library | 8 | 8.5 | |
| Library, language dropdown | 7.5 | 7.5 | popover overlays cards by design; clipped list scrolls |
| Editor, default panes | 7 (light) / 4.5 (dark) | 8.5 / 8 | canvas > 50 % of area at 1440x900; dark active buttons were invisible |
| Editor, panes opened | 6.5 | 8 | specimen header + «Режимы»/«Оси» are now one chip language; canvas shrinks when the preview is opened (by design) |
| Проверка | 7.5 / 5 dark | 8.5 | |
| Кернинг | 7.5 / 5 dark | 8.5 | |
| Отрисуй свой шрифт | 8 | 8.5 | pane look = editor panes |
| Собрать из своих знаков | 7.5 | 8.5 | top bar no longer clips at 1280 |
| #ds page | 8 | 8.5 | |
| Export menu / toast | 8 | 8 | draw view places the toast bottom-right on purpose |

| DS aspect | Before | After |
|---|---|---|
| Tokens | 7 | 8.5 (draw/import fallbacks, px radii/fonts/shadows moved to tokens; 3 dead icon vars gone) |
| Components | 6.5 | 8.5 (one pane component, one markup, one state class) |
| Consistency | 6 | 8.5 (one active-state language, one chevron, one pane header) |
| Accessibility | 7 | 8.5 (all text >= AA except decorative empty-slot letters; focus ring on every Tab stop of 8 screens) |

## Defect list

1. Dark theme: active segment/chip/preset buttons were white text on a white pill («Прямой», «Все», «Авто», «Нуар», «Как в приложении»). Cause: 14 selectors paired `background:var(--ink)` with `color:var(--on-accent)`. Fixed (`--on-ink`). Before: `before/editor_dark_1440.png`, `before/proof_dark_1440.png`, `before/kern_dark_1440.png`, `before/draw_dark_1440.png`. After: `after/*_dark_1440.png`.
2. Editor rail: the single-button group rendered as a heavy dark ring around a white disc (pill padding around one button). Fixed: `.rpill.solo` is a plain round button, active = accent icon. Before: `before/editor_light_1440.png` (crop at x0-100,y230-340). After: `after/editor_light_1440.png`.
3. Canvas toolbar: guides/snap toggles were red-ringed circles while neighbouring mode buttons were ink-filled (two "active" languages in one toolbar). Fixed: ink fill.
4. Three pane implementations (`paneInit`, `edPane`, `drPane`) with three state classes (`.shut`, `.is-closed`, `.is-open`+hidden), two chevron directions, three header paddings and three storage keys. Consolidated into `paneInit/paneHTML/paneEl/paneOpenAll` (ui_ds_s1.js). `ui_dr_d1.js` deleted. Before: `before/draw_light_1440.png` vs `before/editor_open_light_1440.png`.
5. Text on `--text-3` (2.5:1 light, 3.15:1 dark) for glyph group captions, preset sub-heads, `.sub`, "no match" hint. Fixed -> `--text-2`.
6. Proof summary "чисто N" in `--ok` (3.49:1) -> `--ok-ink`; `.pok` likewise.
7. Import title accent word 3.44:1 at 16 px -> `--accent-text`; segment counts at opacity .55 -> .72/.85.
8. Import top bar at 1280: last segment count clipped ("0 / 182"). Fixed (tighter gaps/padding below 1400 px). `before/import_light_1280.png`.
9. Draw/import CSS: 130 `var(--x,#literal)` fallbacks, px radii 9-22, px fonts 12/13/14, literal shadows and `#fff`. Replaced by tokens.
10. Editor specimen/chip pane headers: chevron touched the label (gap 4). Gap now `--s2`.
11. Dead CSS: 17 rules / selectors matched nothing (`.sw-line`, `#sw-prev`, `.pane-chip`, `.i-proof`, `.i-kern`, `.i-chevron`, ...) plus 3 unused SVG icon vars. Removed.
12. 363 declarations overridden by a later rule with the same selector and context (v39 layer under the m40 layer). Removed; computed-style snapshot of 44 screens before/after: 0 differences.

Checked, no defect: no horizontal scroll, no text < 11 px (icon buttons use font-size 0 on purpose), focus ring on every Tab stop (home, library, editor, draw, import, kern, proof, #ds), single accent button per screen region (home «Найти»; editor «Скачать»; draw «Сохранить знак» then «Сохранить шрифт»; fav empty state), marquee `animation-play-state:paused` on hover/focus-within and `animation:none` for reduced-motion.

## Open (not changed)
- Control heights in draw/import are literal 30-38 px; mapping them to `--h-*` would make them 44 px on phones (`--h-md` is 44 below 720 px) and needs a mobile layout pass.
- In dark theme the canvas, specimen strip and glyph tiles stay light (`--canvas`): bright but consistent with the glyph-on-paper model.
- Toast sits bottom-right in the draw view and bottom-centre elsewhere; in the editor it covers the canvas toolbar for 2.6 s.
- `.panel>details` accordions (pen, custom glyph, import-from-file) are the older settings component; the `.pane` migration covered everything that used edPane/drPane.

## Release gate (W88 V)
`./check.sh release` is the pre-release gate: fast set + every slow lane (fam/golden md5, VF build/check/axes/features/golden, uniwidth, deco-geom, all e2e lanes, every stress-<font> lane with seed 1 + pres, stress-cover) on parallel workers; `RELEASE_DEEP=1` adds the other seeds (= the old full slow set, ~140 CPU-min). See MANIFEST «W88 V» for the measured time. A failed e2e lane is retried once; retries are listed in the SUMMARY line so flakes stay visible (a lane failing twice is a real failure). Exit status 1 if any lane fails.
