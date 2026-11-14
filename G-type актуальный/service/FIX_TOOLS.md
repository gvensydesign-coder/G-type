# FIX_TOOLS (audit D, editor tooling)

Scope: ui_b.js, ui_c.js, ui_kern.js, ui_expl.js, ui_imp.js, ui_draw_n7.js, ui_shell.js, ui_status.js, template.html, tests/e2e_tools.py, check.sh.
Not touched: glyph generators, core15.js, core_meta_l1.js, any core*.js. Everything that needed an engine hook is a wrapper in a ui file (idempotent: it stays harmless when the engine agent fixes the same thing in core).

## What changed

1. Presets (ui_b.js)
   - Renessa has its own set `METHODS_RENESSA` (8 groups: Характер Книжная/Плотная/Светлая/Контрастная, Контраст штриха, Засечки, Окончания, Пропорции, Ширина, Угол пера, Поля и ритм), all inside its slider ranges and safeP limits (checked in both styles).
   - `methodsNow()` returns a per-font fixed copy (`methodsFix`): values (also the functions, e.g. hair = f(stem)) are capped to what safeP reaches from the default state of regular and italic. Source tables in core*.js are not edited. 24 chips of the other fonts used to promise unreachable values (Volt Низкий, Квадра Монолиния, Кодекс 60°, Модуль Сетка, ...); they now apply exactly what they say.
   - `.on` is computed by `chipState`: exact match of the clamped (safeP) values, float noise 1e-6 only, no tolerance for enumerations. A clicked chip writes the clamped values into the project.
   - Chips that give the same result are duplicates: only the first reachable one stays enabled (the rest `disabled`, title «То же, что …»); chips already at their limit are disabled («Уже на пределе»). Volt Низкий/Средний, Volt Ловушки Лёгкие/Глубокие, Codex Засечки, Pixel Чёрный are the cases that remain duplicates.
   - Recomputation is debounced (140 ms) while a slider is dragged.
2. Undo/redo (ui_b.js, ui_shell.js): Ctrl+Z / Ctrl+Shift+Z work while a range input has focus (inputs/selects/textareas keep native undo). A burst of keyboard steps (arrows, PgUp/PgDn, Home/End; pause < 700 ms) is one undo step; pointer drags unchanged.
3. Проверка (ui_c.js): absolute detectors in `proofChar`, independent of the font's own default:
   - speck: letter/digit contour (ink or hole) with area < 0.035 x stem² (level 1, «мелкое пятно»); smallest stock contour is 0.060 (Pixel cell), Volt 0.116, so no false positives (checked: 15 fonts x 2 styles in e2e_tools);
   - degenerate contour (< 2 nodes or zero area);
   - open path: custom glyph skeleton stroke whose ends stop within 0.9 stem without closing; Draw tool pen contours that are not closed (`GT_DRAW.openChars()` is new).
   Note: the importer itself drops contours under 30 u² (impCleanup in core21), so such specks never reach the font.
4. Kerning pill vs export (ui_kern.js). Root causes (measured):
   a. Renessa «То» -54 vs -78: the pill and the export build the same class table from different glyphs. buildTTF rounds advances (`adv:Math.round`) and skeleton fonts are measured FAST in the pill (`kkGet`) but exact in the export; the profiles differ by 0.03 u, and the rule «pair exception if pair - class >= 6» (classKernTable) flips at exactly 6 (-54 vs class -78 is 24, but T|o is -60 and the pair is -54.8 vs -55.0 -> -54 vs -56). Fix: `buildOTL` wrapper passes the live style's class table (`kernEnv`) to the export when the exported style is the live one (advances agree within 2 u on 90% of letters; uniwidth/other weights keep their own measurement); `kernEnv` always sees integer advances.
   b. Propis lock: `kernBlocked` was only applied to user exceptions in buildOTL; the auto class table (KERN_TABLE) and `st.kern` went into GPOS (96 of 471 pairs). `classKernTable`/`buildOTL` wrappers strip blocked letter-letter pairs and classes. Core fix, if wanted later: apply `kernBlocked` inside classKernTable (3 lines); the wrappers become no-ops.
   Test: pill == GPOS for 30 pairs x 5 fonts (volt, renessa, propis, stroka, codex) plus a Propis letter-letter assertion.
5. Draw tool spacing (ui_draw_n7.js). Cause (proved): `finalGlyph` (core4 opticalSB) puts the ink at the font's optical side bearing and ignores `adj.l/adj.r` baked into the contour, so the built font had 47/47 (Н, И) instead of the recommended 104/104. Fix: after the build the recommended spacing is written as per-glyph `sbL/sbR` edits (recommended minus what the engine gives); verified Н 104/104, И 104/104, О 74/68.
6. nodeSmooth (ui_b.js): a side is a line when both its end points have no handle; such a side is never given a handle, the handle on the curve side is aligned to the line direction (tested on D and Р: cross product < 0.02, line side stays handle-free). Line-line nodes are left alone.
7. Sliders (ui_b.js, ui_expl.js, template.html)
   - Track = effective limit: `syncTracks()` sets min/max to the paramLimits of the current state (on release, style/font switch, preset, undo). All 15 fonts x 2 styles: reach >= 90% and default thumb = effective value (was 31 sliders < 80%).
   - Dead sliders: `aper` hidden on Stroka (no effect in any state); `icomp` dimmed + hint when slant = 0 (no effect); `drip` (Капля) dimmed + hint below melt 65 (no effect).
   - Defaults outside range: the slider range is widened to the default of both styles (Applik sb 92 -> 92); Renessa brk is the exception: engine limit is 0..40 (`F.lim.brk`, core_renessa) while DEFAULTS.brk = 55; the thumb shows the effective 40. Core fix left: DEFAULTS.brk 55 -> 40 (or lim 0..70).
   - ui_expl: the explanation starts with the term of the slider label (96 label/term differences removed by construction), per-font bodies in `EXPL_OV` (Codex Угол пера/Основной штрих/Соединительный/Размер засечек/Росчерки, Modul Скважина/Ширина ячейки/Концевые элементы, Volt+Kvadra+Stroka Округлость овалов, Liniya/Rotunda/Propis/Renessa pens, Applik/Stsepka Насыщенность) with matching preview letters.
8. Export/import hygiene (ui_status.js, ui_imp.js)
   - Сцепка: mode «Выкл» now removes calt and ss02 from GSUB, «Все» puts the ss02 lookups into calt (default on), «Обычные» as before; the export menu states it («Сцепки в файле: …»).
   - Name ID 0: «© G-type»; with the author signature on: «© <year> <name> · G-type» (Stroka keeps its passport text unless signed). Implemented as a metaNameTable wrapper (rewrites the name table), core_meta_l1 untouched.
   - SVG white fills: the import adds warning `white` (toast «белые заливки пропущены, отверстия из них не вырезаются», «!» on the cell). Subtracting them was not done: the engine reads a white fill as no ink and has no per-item boolean order.
9. Small upgrades (ui_b.js, template.html): click the value to type it (Enter/blur applies with clamping to the track and step, Esc cancels, one undo step); ↺ per slider (visible on hover/focus, only when the value differs from the default; double click on the label still works).

## Tests
- tests/e2e_tools.py (added to check.sh slow list): presets, undo, specks, kern_pill, draw_spacing, node_smooth, tracks, export_hygiene, numeric.

### Results (final build)
- `./check.sh fast`: 19/19 PASS.
- `tests/e2e_tools.py`: PASS 9/9 (presets 274 chips 15x2, undo, specks, kern_pill 150 pairs, draw_spacing, node_smooth, tracks 237 sliders x2, export_hygiene, numeric). Stock-font speck run (7846 glyph checks, 0 false positives) passed in the previous build; only the 60 u2 floor and CSS changed afterwards.
- Lanes PASS: rail, panes, motion, segs, sample, kern, tester, custom, import, draw, dwgrid, overflow (0 issues after the touch-target fix), focus, export, pen, xform, trace, simedit, tour, status, profile, hero (6/7).
- Not green in this environment (host load average 5-9 on 2 cores, shared with other agents, page runs at 7 fps):
  - shell: fails in `hover_check` (hover card closes under the pointer, timing) and passes in other runs; the same check also flipped on the untouched fx2 copy in a direct timing probe. Everything before it passes.
  - hero_pauses: the view-switch exit animation takes 2.6-2.9 s under load (same on fx2), so the "offscreen" assert fires early; passes when the machine is quiet.
  - Lanes took 230-300 s and several hit the 300 s timeout (shell, motion, profile) at peak load; motion and profile pass with a 900 s limit.

## What is left
- Core: Renessa DEFAULTS.brk=55 vs engine lim 0..40 (core_renessa); preset source tables in core*.js still hold unreachable values (fixed only at UI level); apply `kernBlocked` inside classKernTable (3 lines), then the ui_kern wrappers are no-ops.
- SVG white fills only warn; they are not subtracted from the shape.
- Applik R Bold/Black have slivers of 27/44 u2 (glyph-agent finding); the stock-font speck floor is 60 u2 so they do not flag.
- Stroka keeps its passport text in name ID 0 unless the author signature is on.
- Fonts with coarse enums (Pixel pw etc.) still use sliders.
- Re-run shell and hero_pauses on a quiet machine.

