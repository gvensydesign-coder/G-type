# W91 design review: «Сообщество»

Method: Playwright + getComputedStyle / getBoundingClientRect at 390, 768, 1280-ish (900/1060 breakpoints), 1440, 1920, light and dark, keyboard focus walk, hover/active/disabled/empty states.
References: library cards/tags/seg/vhead (`.lcard`, `.tag` 28/12/600, `.libview .seg` 36 with 30 thumb, `.vhead h2` 20/700), `.btn` sm/md/lg (28/34/42; phone 34/44/48), `.heart` 40, `.pane-h` focus (inset -2px), tokens `--r-*`, `--s*`, `--sh-*`.
Screens: S = /tmp/claude-0/-home-claude/ae8dbdd9-9dca-5b05-a704-bdc219f0916d/scratchpad ; before = S/w91/E_evidence/before, after = S/w91/E_evidence/after (DSF 2). Working shots at DSF 1: S/w91/rv/o1 (before), S/w91/rv/o2 (after).

Counts: blocker 0, major 6, minor 9, nit 7 (all fixed except those marked "user decision" / "kept").

## Major
| id | surface | measured vs expected | shot | fix |
|---|---|---|---|---|
| M1 | challenge «Как поможет G-type» | 5 cards in a 4-col auto-fill grid: the checklist card sits alone in row 2 (322 px of a 1294 px row, ~970 px dead area). Expected: no orphan row | before/coffee_1440_light, o1/coffee_768_dark | `.cm-tools` 4 / 2 / 1 columns, `.cm-tool-chk` spans the row in 2 columns |
| M2 | challenge «Уроки по теме» | lesson links were `.btn.sm` pills 141x81 px (2-3 wrapped lines, 999 radius on 81 px = capsule). Expected single-line `.btn.sm` 28 or a row | o1/coffee_1440_light | `.cm-lk` rows (full width, `--r-sm`, left text); font buttons = 2x2 grid |
| M3 | challenge «Мои работы» (empty) | left box 396 px, right box content 284 px: 112 px dead area under the empty card, CTA detached. Expected: empty state fills the card (DS empty pattern: icon, title, text, CTA) | o1/coffee_1440_light | empty card `flex:1`, centred, icon + CTA inside; outer CTA hidden while empty |
| M4 | challenge FAQ (`.pane-h`) | focus ring `outline-offset:2px` (`.cm :focus-visible` overrode the product's `-2px`), `.pane` has overflow hidden, so the ring is clipped on the left/right/top | focus walk | `.cm .pane-h:focus-visible{outline-offset:-2px}` |
| M5 | phones, all `.btn.sm` (Читать, Открыть, Все уроки, preset…) | 34 px high (touch minimum 40); heart centre 8 px below the «Читать» centre | meas 390 | `.cm .btn.sm,.cmf .btn.sm{min-height:var(--h-md)}` at <=720 (44), heart stays 10 px from the corner (approved) and the footer bottom padding is reduced on phones so the 44 px button centre = heart centre |
| M6 | article quiz, wrong answer | wrong option = grey inset border `--text-2` and the same empty dot as unselected: state not readable, not the system error colour. Expected `--danger` + icon (rule 3) | o2/quiz.png | `.cm-opt.no` danger-soft ground, danger border/text, × dot |

## Minor
| id | surface | measured vs expected | fix |
|---|---|---|---|
| m1 | challenge hero buttons | 34 px (`.btn`) vs banner buttons 42 (`.btn.lg`) | hero buttons `lg` |
| m2 | status pills | `.cm-st` 12/700, timeline «Сегодня» 13 px / 29 px high (`.cm-tl span` overrode); `.tag` is 12/600/28 | `.cm-st` 600, `.cm-tl .cm-st` 12/28 |
| m3 | tool cards vs section cards | padding 16 vs `.cm-box` 20: headings at x=108 vs 112 | `.cm-tool` pads `--s5` (`--s4` phone) |
| m4 | article CTA buttons | 36.3 px (inherited line-height 1.45) vs `.btn` md 34 | `line-height:1.25` |
| m5 | nested radii | demo canvas 16 inside 22 card, padding 12 (expected ~10, nearest token 12); work thumb img 12 inside 16/8 (expected 8) | 12 / 8 |
| m6 | Избранное article cards | footer not pinned (slack under «Читать», lesson cards pin with `margin-top:auto`) | `.cmf-card .cm-act{margin-top:auto}` |
| m7 | challenge hero 721-1060 px | poster 280 px left aligned in a single column, ~380 px empty to its right | text + 240 px poster side by side, one column only <=720 |
| m8 | «Мой прогресс» bar | 32x4 px stub next to «0 из 6» | 96 px |
| m9 | tool card buttons | font buttons 34 vs «Применить пресет» 28 in the neighbouring card | all `.btn.sm`, one height |

## Nit
| id | note | status |
|---|---|---|
| n1 | duplicate rules (`.cm-back` x2, `.cm-hint` x3, `.cm-fonts .btn,.cm-hint` override, `.cm-fonts` flex vs grid) | merged; `.cm-chc` pair and the icon sizes 12/14/18, 28 px circles, `right:10px` for non-heart parts kept (one-off geometry, no token exists) |
| n2 | `.cm-opt:active` had no pressed state | `--panel-2` |
| n3 | DESIGN_SYSTEM type line said `--fs-xs 11`, real token 12 | doc fixed |
| n4 | back button: icon glyph sits ~5 px inside the 22 px icon box relative to the h1 edge | kept (optical, same ghost button as elsewhere) |
| n5 | `.cm-term` inline tap target 26 px on phones | kept (inline text link, WCAG-exempt) |
| n6 | 768 hero: the two lg buttons wrap to two rows of unequal width | kept |
| n7 | 1920: 5-col lesson grid leaves a 1-card second row | kept, same as library |

## Checked, no issue
Reading width 53-73 chars per line at 1440 (680 px / 16 px / 1.65), 32-37 at 390; no text below 12 px; text contrast >= 4.5 in both themes (white on accent 3.44 is the documented bold>=14 px exception); no horizontal scroll at 390/768/1440/1920; accent only on primary buttons; shadows only `--sh-1/-3`; motion tokens only (`--dur-instant` exit < `--dur-fast`/`--dur-base` enter, reduced motion covered); focus rings neutral 2 px; pills 28 px / 12 px; `.btn.lg` 42 and `.heart` 40 identical to the library.

## Needs user decision
- D1: quiz option and demo-control borders use `--line-strong` (1.5:1 on `--surface`); the product's own inputs do the same, so a 3:1 border would be a system-wide change.
- D2: white on `#FC473C` = 3.44:1 (system rule 4: bold >= 14 px only). Section follows it.
- D3: banner cover radius 16 inside a 22 card with 20 padding (outer - padding = 2): kept as the approved 2-column banner.
- D4: lesson card body padding 16 vs library font card 12/12/16 (the library card is a notch card, another structure); kept.

## Tests
New lane `comm_system` in tests/e2e_comm.py (light + dark, 390 + 1440; landing, challenge, article, Избранное): pill spec, radii on scale, nested radius, hero = lg, touch >= 40, sibling padding, tool grid (no orphan, equal row heights, left edge), empty works fill, heart centring, quiz danger state, FAQ focus ring, neutral 2 px ring, no `!important`. Verified red on the pre-fix code (first failure: `cm-st run` weight 700).
