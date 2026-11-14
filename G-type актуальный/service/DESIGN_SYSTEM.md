# G-type design system (m40)

Single source: the block `TOKENS m40` at the end of `<style>` in `template.html` (values), `DS components m40` right after it (component CSS), `ui_ds_s1.js` (behaviour, data). Live reference page: open `#ds` (or call `openDS()`); it renders every token and component in both themes.

Look: soft grey ground, off-white cards with a hairline lift, white floating surfaces, pill controls, thin dividers, accent #FC473C used sparingly. Onest, Russian UI, no visible scrollbars.

## 1. Rules

1. Only tokens in CSS: no literal hex, px font sizes or px radii outside the token block. Canvas drawing reads colours with `dsColor('accent'|'glyph'|'cv-muted'|'cv-line')`.
2. Font sizes only from `--fs-*`; radii only from `--r-*`; spacing from `--s*`; control heights from `--h-*`.
3. Errors and proof issues use `--danger` (never the brand accent). Brand accent = primary action and control state only (pressed, on, selected); focus is NOT accent. "Changed / clamped / emphasised" values are neutral: `--ink`, bold, underline (`.ctl output.clamp`, `.gn.mv`, `.mti.mv`, `.imp-h em`, hero `.n/.a`). Copy: one term «шрифт» (never «гарнитура»); the build action is «Скачать шрифт» everywhere; finishing a glyph edit is «Готово». Selection, outlines, glyph fill and nodes on canvases are NEUTRAL: `--sel` (#141416, editor family), `--dr-ink` (draw), `.dr-gl.cur` ink ring (D5).
4. Brand red `--accent` (#FC473C) is the colour of every primary action: `.btn.pri` = `--accent` background, white bold text (`--on-accent`), hover `--accent-hover`, pressed `--accent-press` (slightly deeper tints of the brand, never the old #C22D24/#D9342A). Red as a *meaning* is only for wrong/error/destructive (`--danger`, `.btn.danger`, `.btn.danger.solid` for destructive confirms). Overrides of `.btn` backgrounds in a panel (e.g. `#view-edit .nrow .btn`) must repeat the `.pri` colours. White on #FC473C is about 3.6:1: only for bold >= 14px button labels.
5. Text roles: `--text` body, `--text-2` secondary (AA on all surfaces), `--text-3` only for decorative/disabled text, never for content.
6. Base UI text 14px (`--fs-base`), dense panels 13px (`--fs-md`), never below 12px (`--fs-xs` is 12px since D5); canvas labels 12px with >= 4.5:1 (`--cvl-lab`/`--cvd-lab`).
7. One `.btn.pri` per screen region. Secondary actions `.btn`, tertiary `.btn.ghost`, destructive `.btn.danger`.
8. Secondary panels are collapsible `.pane`s; main tools stay visible.
9. Hover/press states change only background/shadow; focus is the neutral ink ring (`:focus-visible`: `outline:2px solid var(--focus-ring)`, offset 2px, halo `--focus`), never removed and never accent-coloured.
10. Motion: only the tokens of section 7 (`--dur-*`, `--ease-*`, `--stagger-*`), never literal ms or `cubic-bezier` in components. Legacy `--t-fast`/`--t`/`--ease` are aliases of `--dur-fast`/`--dur-base`/`--ease-out`; do not use them in new code. Reduced motion is honoured (section 7).

## 2. Tokens

### Colour (light / dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--g0 … --g900` | #fff … #17171a (g500 #6a6a72) | inverted ramp | raw greys, prefer semantic tokens |
| `--bg` | g100 #efeff1 | #0f0f11 | page ground |
| `--card` / `--card-2` | #fafafa / #f6f6f7 | #18181b / #202024 | cards on ground |
| `--paper` = `--surface` | #fff | #232328 | floating panels, inputs on cards |
| `--surface-2` | #f6f6f7 | #1c1c20 | inset fields |
| `--surface-3` / `--panel` | #efeff1 | #2c2c32 | hover, control fill |
| `--panel-2` | #e8e8eb | #383840 | pressed/hover of control fill |
| `--line` / `--line-strong` | #e8e8eb / #cfcfd4 | #32323a / #4a4a53 | hairlines, input borders |
| `--text` / `--ink` | #0b0b0c | #f2f2f4 | text, dark buttons (`--on-ink` is the text on them) |
| `--text-2` / `--muted` | #6a6a72 | #a3a3ae | secondary text |
| `--text-3` | #a3a3ab | #6f6f79 | hints, disabled |
| `--accent` | #FC473C | same | fills, focus, selection |
| `--accent-hover` / `--accent-press` | #ED3F35 / #DE3931 | same | `.btn.pri` hover / pressed (base = `--accent`) |
| `--accent-soft` / `--accent-text` | 10% accent / #C0281E | 22% / #ff7167 | tint bg, accent text |
| `--danger` / `--danger-soft` / `--on-danger` | #B42318 / 10% / #fff | #F97066 / 16% / dark | errors, proof issues |
| `--ok` `--ok-ink` `--ok-soft`; `--warn` `--warn-text` `--warn-soft` | green / amber | tuned | status |
| `--rail`, `--rail-hi`, `--on-rail` | #1c1c1e #fff #fff | #232328 #f2f2f4 #fff | left rail pill |
| `--canvas` | #fff | #eceef1 | glyph sheets stay light in both themes |
| `--track` / `--track-on` | g150 / g300 | #3d3d44 / #6b6b75 | slider track |
| `--focus-ring` | `--ink` | `--ink` | focus outline colour (every `:focus-visible` / `:focus-within` rule) |
| `--focus` | ink 16% | ink-light 28% | focus halo |

Legacy aliases (do not use in new code): `--panel --panel-2 --muted --accent-ink --bad --r --paper --card --ring`.

### Type
`--fs-xs 12 (11 before D5) · sm 12 · md 13 · base 14 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · hero clamp(40px,5.2vw,76px)`; weights 400/500/600/700/800 (`--fw-r --fw-m --fw-sb --fw-b`); `--lh-tight 1.1`, `--lh 1.45`.
Roles: 11 counters; 12 tags, hints; 13 dense panels; 14 UI text; 16 pane titles, search; 20 card titles; 24 section titles; 32 big numbers.

### Space, radius, shadow, height
`--s0 2 (hairline gaps only) · s1 4 · s2 8 · s3 12 · s4 16 · s5 20 · s6 24 · s7 32 · s8 48`
`--r-xs 8 · r-sm 12 · r-md 16 · r-lg 22 (cards) · r-xl 28 · r-pill 999`; circles use `50%`.
`--r-field` = `--r-pill`: the ONE radius for every search/text field with inner icon or button (`.srch`, `.srch.big`, `.psearch`, hero search). Variants (big, in hero, in panels) share one spec too: padding `4px 4px 4px --s4`, input 42px / `--fs-base`, button 46px (total 54px); only the fill may differ by surface.
`--sh-1` hairline lift (cards, panes) · `--sh-2` floating panel · `--sh-3` popover/menu/toast.
`--h-sm 28 · h-md 34 · h-lg 42` (phone <= 720px: 34 / 44 / 48, touch >= 44).

## 3. Components

| Component | Classes / markup | Notes |
|---|---|---|
| Button | `<button class="btn">`, `.pri` `.ink` `.ghost` `.danger` `.sm` | pill, height `--h-md`; `disabled` = 40% |
| Icon button | `<button class="ibtn" aria-label><i class="ico i-undo"></i></button>`, `.ibtn.sm`, `.tbtn` (flat) | always `aria-label` |
| Chip | `<button class="chip">`, `.on` `.sm` `.soft`; tag `<span class="tag">`; `<span class="badge">` `.danger` `.mute` | `.chip.on` is the ink pill |
| Segmented | `<div class="seg"><button class="on">…</button></div>`, `.seg.light` | one `.on` |
| Text input | `<input class="inp">`, `.pill`, `textarea.inp`, `aria-invalid="true"` | focus ring inset accent |
| Search | `<div class="srch"><i class="ico i-search"></i><input><button class="btn pri">Найти</button></div>` | `.srch.big` on home |
| Select | `<select class="sel">` | chevron from `--chev` (theme aware) |
| Checkbox / radio | `<label class="chk"><input type="checkbox"><span>Текст</span></label>`; radio the same with `type=radio` | brand round |
| Toggle | `<label class="tgl"><input type="checkbox" role="switch"><span>Текст</span></label>` | 34×20 |
| Slider | `<div class="ctl"><label><span>Имя</span><output>1</output></label><input type="range"></div>` | `--lo/--hi` set by app |
| Menu | `<div class="menu"><button>…</button><div class="divider"></div></div>`; `.xmenu` is the export menu | items `button`, `.on` = current |
| Tooltip | `<button class="tip" data-tip="Текст">`; rail uses `.rb[data-tip]` | shows on hover/focus |
| Card | `.card` (flat), `.surface` (floating), `.lcard` (font card), notch card `.notchc` + `.notch > .nb.go` | notch colour = `--bg` |
| Section header | `<h4 class="sec-h">Заголовок</h4>` | small uppercase, use sparingly |
| Divider | `<hr class="divider">` | |
| Empty state | `<div class="empty"><i class="ico i-heart"></i><b>…</b><span>…</span><button class="btn pri">…</button></div>` | |
| Toast | `toast('текст')` | ink pill, `--sh-3` |
| Rail | `#rail` > `.rpill` > `.rb[data-tab]`, mode tools `#rp-tools > .rb[data-rt]` | dark pill both themes; contextual, see «Rail» below |

### Transform handles (`ui_xform_x1.js`)
One shared component for «Выделение» in every working mode: `XF.make(adapter)` returns a controller; modes only supply an adapter (`bbox, key, toS/fromS, size, begin, apply, end, cancel, snap, redraw, host, enabled`).
- Look: `--sel` (dark ink, D5; was accent) 1.5px stroke, white fill, 8px corner squares, edge-midpoint handles, 10px rotation circle on a 26px arm above the top edge (flips below when there is no room). Hit area 24px (36px for touch), outside-corner zone rotates. Works on the light canvas in both themes; Russian `title` tooltips.
- Gestures: corner = scale (Shift proportional, Alt from centre), edge = one-axis stretch, rotation handle / outside corner = rotate (Shift snaps to 15°), arrows move (Shift ×10), Esc cancels the gesture, one undo step per gesture. Grid/guide snap comes from the adapter. Multi-select with Shift+click; the transform runs around the group box.
- Bar `#xf-bar-<id>`: W / H / angle fields, lock, «Отразить ↔», «Отразить ↕», «Повернуть 90°». The draw view's mirror button lives in this bar (`mirrorEl`), never duplicated.
- Geometry: `XF.affCs(cs, m)` transforms node points and Bézier handles and rebuilds contours with `mkc` (direction stays valid even under reflection). Each mode validates on `end` (draw: `drnEval`; pen: `penGuard`/`decoCheck`; custom: `cuCheck` strict; import: finite check).
- Modes: draw (all items), pen extras (elements, explicit selection), «Свой знак» (strokes), «Знак из файла» (button «Размер и поворот» in the import panel; uniform size goes to the glyph's «Масштаб», the rest rewrites the outline). Editor points mode does not use it: node offsets are clamped by `setNodeTarget`, so a free rubber-band transform would be silently clipped.
- Test: `tests/e2e_xform.py`.

### Editable sample (`ui_smp.js`)
No separate text field next to a canvas sample: the invisible `<textarea>/<input>` (`#txt`, `#kk-txt`, `#dr-tx`, `.hc-in`) lives inside the sample box (`.smp-box`), caret `.smp-caret` and selection `.smp-sel` are DOM overlays. Draw code passes `{ch,x0,x1,y0,y1}` per drawn glyph to `smpCommit(id,rows,text,opts)`. Gestures: click = caret (+ kerning pill / pair pick in a gap), drag = select, double click = word. Empty text draws the default sample muted. Enter adds a line only in multi-line samples; paste is plain text. Focus = accent inset ring (`.smp-on`). Kerning pill `#kk-pop` (`.nudge.pairpop`): pair, −/value/+, «К авто», «Открыть».
- Segmented groups: no font-weight/padding/border change on `.on`, no press scale; the `.mo-ind` indicator is positioned through the offsetParent chain (buttons inside `.vtw`). Test: `tests/e2e_segs.py`.
- Rail never repeats a control that sits in the view's top bar («Проверка»: only the metrics-table pane; «Свой шрифт из файлов»: no upload icon).

### Collapsible pane
```html
<section class="pane" id="pv-preview">
  <button class="pane-h" type="button" aria-expanded="true">
    <span class="pane-t">Предпросмотр</span><span class="pane-m">60 px</span><i class="pane-chev"></i>
  </button>
  <div class="pane-b"> … content … </div>
</section>
<script>paneInit(document.getElementById('pv-preview'),'ed-preview',true);</script>
```
- ONE implementation for the whole app (editor, draw, import, DS page): `paneInit(el, key, defaultOpen[, onToggle])` + `paneHTML(key, title, bodyHTML, {hid, bid, tip, cls, head})` / `paneEl(...)` (markup builders) + `paneOpenAll(root)`. `el` is the `.pane` element (or selector); header = direct child `.pane-h`, body = direct child `.pane-b`. Returns `{open, set(bool,silent,nosave), toggle()}` (also `el._pane`); `el.open` mirrors the state (setting it is not persisted).
- State: `localStorage['gtype-pane-'+key]` = `1|0` (try/catch); falls back to `defaultOpen`. Old keys (`gtype-ed-panes-v1`, `gt-pane-<key>`) are still read.
- ARIA: sets `aria-expanded` and `aria-controls`; body gets `hidden` when shut; class `.shut` on the pane (the only state class).
- Event: `pane:toggle` (bubbles, `detail {key, open}`) so canvases can resize.
- Variants: `.pane.flat` (no surface, no side padding), `.pane.line` (flat row with a bottom hairline, used in the draw/import side panels). Inside the editor the specimen header and the «Режимы»/«Оси» chips are compact `.pane-h` pills (contextual rule in the ED block). `.pane-m` = optional meta text (value, count). Stack panes directly; spacing is automatic.
- Every collapsible section is a `.pane`: there is NO `<details>/<summary>` in the app (editor settings column, proof metrics, language blocks included). Inside `.panel` (editor settings) panes are flat rows with a hairline (same spec as `.pane.line`); exactly ONE is open by default (`data-open="1"`, «Знак»), contextual panes (`#cusec #pensec #pxsec #impsec`) appear only in their mode. Code that still creates a `<details>` inside `.panel` is upgraded to a pane by `edUpgradeDetails()` (ui_ed_e1.js). `tests/e2e_panes.py` checks it. Parameter groups (`.grp h5`, main tools) share the pane chevron.
- Keys: use `<screen>-<name>` (`ed-preview`, `ed-glyphs`, `dr-layers`, `im-options`).

## 4. Platform data
`platformInfo()` (ui_ds_s1.js) returns facts computed live: `typefaces`, `ids`, `names`, `full` / `basic` (charset), `styles`, `weights`, `glyphsMax/Min/Total`, `formats [{id,label}]` (export menu), `axes [{tag,label}]` (VFX_ORDER), `features [{tag,label}]` (OpenType rows), `languages`, `scripts`, and `facts [{k,text}]`, Russian chip strings with correct plurals, ready for the home marquee.

## 5. Do / Don't
- Do: put new colours in the token block with both themes. Don't: write `#fff`, `#000`, `border-radius:10px`, `font-size:15px`.
- Do: use `.btn.pri` for the single main action. Don't: put white text on plain `--accent` below 14px bold (all `.btn.pri` incl. `.sm`, `#ex-menu`, `#tour-go` are bold >= `--fs-base`).
- Do: show errors with `--danger` + an icon or text, never colour alone. Don't: reuse the brand red for proof failures.
- Do: collapse secondary panels with `.pane`. Don't: stack more than one open secondary pane by default.
- Do: keep ids and `data-*` hooks stable (tests rely on them). Don't: restyle by id; use classes.
- Do: use `--sh-1` on cards, `--sh-2` on floating panels, `--sh-3` on popovers. Don't: add dark heavy shadows.
- Do: test both themes at 1440×900 and 390×844. Don't: rely on hover for essential info (touch).
- Do: composite fields (wrapper + icon + input + button, e.g. `.srch`, `.psearch`) show focus on the WRAPPER along its whole perimeter (`:focus-within`, inset 2px `--focus-ring` + inset 5px focus tint — never an outer halo, parents with overflow clip it); the inner input gets `outline:0;box-shadow:none`. Don't: let the global `:focus-visible` ring draw a partial frame around the inner input.
- Do: centre icons in icon buttons with flex/grid that has ONE in-flow item (hidden label text: `font-size:0;line-height:0`, or move it to `aria-label`). Don't: use `display:grid` with an icon `::before` plus a text node — the text becomes a second row and lifts the icon (caught by `tests/e2e_icons.py`, tolerance 2px).
- Do: put status/add marks (the `+` of empty slots) above the character, in their own row. Don't: overlay marks on glyph previews.
- Do: give user-generated lists (recent work) a close `×` (`.mwrap .mx`, top-right, 24px, always visible at low opacity, removes from list only, not the project).
- Do: every search field uses `--r-field` (pill, reference = home hero search). Don't: give a size/placement variant its own radius (v43 bug: `.srch.big` had `--r` 22px while the home search was pill).
- Do: a corner button sits in a REAL cut-out (`.lcard:has(>.notch)`): the card has no own background/shadow; its shape is drawn by two masked layers (`::before` 1px ring `--cring`, `::after` fill `--cbg`, inset 1px), and the preview canvas under the notch is cut by the same mask (`--cpad`). State colours change `--cbg`, not `background`. Don't: fake the notch with a page-coloured patch over a card that has a shadow/ring — the shadow shows a square "underlay" around the button.
- Do: canvas palettes of the draw screen come from tokens `--cvl-*` (light sheet) / `--cvd-*` (dark sheet), modal scrim `--scrim`; JS reads them via `drTok()`. Don't: write hex in the draw/import CSS.
- Do: all controls in one row share one height (library toolbar: language button = segments = 36px; `.btn.sm` rows: 28px). A control whose fill is invisible in one theme must still match the height of its neighbours in the other theme.
- Home hero (v48; headline, circles and rotating subline since m50: §6.2): no card — title, subtitle and search sit on the page ground; no fact chips. Background = `.hm-mesh` (two masked layers: pale outer `l1` sags deeper, saturated inner `l2` with 4 drifting brand blobs; shape = user-drawn curve, SVG masks) + `.hm-bg` font marquee at ~5% opacity, blurred, fading down. Library pages are full-bleed (`body.tab-lib .app{padding:0}`), the rail floats over the content with no underlay. Decorative layers must not create horizontal overflow: clip them inside their own box (`.hm-mesh{overflow:hidden}`), never with negative insets on the scroll container.

## 6. Rail (contextual, v52)
- `body[data-rm]` = home|library|fav|edit|proof|kern|draw|import (set by `railSync()` in ui_shell.js); `.rm-work` = any work mode, `.rm-ed` = editor family.
- Library pages: logo, Главная / Библиотека / Избранное, bottom group: theme, «?», project. Work modes: Главная + the mode's tool strip (`#rp-tools`, descriptors in `RAIL_TOOLS`), bottom: «?» only. Library/Избранное are reached via Главная.
- Tool = `<button class="rb" data-rt aria-label data-tip aria-pressed>`; pressed = its target is shown (soft highlight). Drawer tools open the rail drawer on their section (below); chk tools click a real checkbox; go tools scroll/focus; page panes (proof «Таблица метрик») toggle the `.pane`.
- Moved while working: `#projwrap` (+`#settings`, `#projpop`) -> work-mode top bar (`header.top` / `.dr-top` / `.imp-act`, class `rm-top`), `#theme-btn` -> `#help-act` inside the «?» popover. Same elements, same ids; restored on library pages.
- Phone: bar = Главная + <= 4 tools + «Ещё» (`#rail-more`: remaining tools, Проект, Подсказки и тема). Esc closes an open menu before it leaves «Кернинг».
- Icons added to the token set (RAIL block): glyphs, panel-right, sample, layers, ot, globe, alert, metrics, eye, table, kern, text, upload, bulb, more (+ classes for grid, points, skel, guides, snap). Test: `tests/e2e_rail.py`.
- Gotcha (icon bug): the DS checkbox rule `input[type=checkbox]:not(.dr-sw input,.tgl input)` has specificity 0,2,2 and `position:relative`; `.tools label.tg input{position:absolute}` had the same specificity and came earlier, so the hidden input stayed in flow and squeezed the `::before` icon to 0 width. Fixed with `.tools label.tg input[type=checkbox]{position:absolute}` and `gap:0`. `e2e_icons.py` now fails on a toggle without icon pixels (both states).

### Rail drawers (FLY)
- The settings columns are gone as layout columns. `#pcard` (editor), `#dr-side` (draw), `#imp-side` (import) are the SAME nodes with class `.dw` = ONE drawer per mode, attached to the rail side, overlaying the left edge of the canvas (grid item in the canvas cell on desktop; `position:fixed` next to the rail <= 1060px; bottom sheet, max 70vh, <= 720px). Surface `--surface`, `--sh-2`, `--r-xl`, width `--dw-w` 340px, hidden scrollbars. Glyph column («Знаки») moved to the right side of the canvas (editor, draw); import has none.
- State: `data-open="1|0"` (closed = `visibility:hidden`, `inert`, `aria-hidden`), `data-sec=<section|all>`, `data-solo="1"` when the section is one `.pane` (its header is hidden, the drawer title replaces it). Header `.dw-h` = `.dw-t` + `.dw-x` close (in the editor `#p-fold` is the close button, `.phead` the header; `#p-all` only in «Настройки»).
- API (ui_shell.js): `dwOpen(mode, sec)`, `dwClose(mode)`, `dwSec(mode)` (open section or null); sections per mode in `DW`: edit `params presets special grid ref ot lang` (`params` = search + Знак + Пресеты + parameter groups; `special` = Свой знак / Перо / Знак из файла / Пиксели, opens by itself when the mode starts), draw `cells grid con recs` (`cells` = «Сетка ячеек», visible only while the «Ячейки» tool is active), import `up opt pv lg`. `sec='all'` shows every section (tests: `dwOpen('edit','all')`). One section at a time; the clicked rail button is `aria-pressed`; the same button, Esc or × closes. Sections of the rail drawer open their panes (not persisted).
- Rail tools: edit = Настройки (`#rb-edit`), Знаки, Образец, Пресеты, Свой знак (when active), Сетка и направляющие, Эталон, OpenType, Языки; draw = Знаки, Сетка ячеек (tool «Ячейки» only), Сетка, Конструкция, Рекомендации и языки; import = Загрузка, Параметры набора, Предпросмотр, Языки набора. The old «панель настроек» toggles are removed. Tests: `e2e_rail.py` (drawer opens on section, pressed, title, Esc, ×), `e2e_panes.py` (opens the `all` view first).
- Work-mode grid (edit, draw, import): outer gutter = `--pad`; ONE gap token `--wg` (= `--pad`) between the sample / top bar, drawer, canvas and glyph column (no `--s2`/`--s3` mixes). The drawer is a column of the canvas row: margin 0, top and bottom = canvas, left = left edge of the first block (sample `.specwrap`, `.dr-top`, `.imp-top`); the canvas is pushed by `margin-left: var(--dw-w) + var(--wg)` (edit `#stagebox`, draw `.dr-mid`, import `.imp-lib`). Never give a drawer its own outer margin.
- Drawer insets: header height `--dw-hh`, header padding-inline = body padding-inline = `--dw-px` (20px); section headers and fields start at that inset (no extra padding-inline on `.pane-h`/`.pane-b` inside `.dw`); the close icon sits on the right inset and is centred in the header. Test: `tests/e2e_dwgrid.py` (all modes x sections x 1440/1280 x themes, 768/390 no overflow).
- Do: add a new settings section by adding a `.pane` to the drawer host and a section line in `DW` + a `dwTool`. Don't: add a second settings column or a second button for the same section.

## 6.2 Hero pattern (m50): home and library header

One pattern, two uses: `#view-lib .hero.hx` (home) and `#view-library .hero.hx.lib` (library). No card, no tilted «Начать» card. Background stays the v48 one (`.hm-mesh` blobs, home also `.hm-bg` ghost letters).
- DOM: `.hero.hx > .hx-in > h1.hx-h (3 × span.ln) + .hx-p.rtip + form.srch`. `.hx-in` is `width:max-content` = the widest headline line (the lines are `nowrap`); `.rtip` and `.srch` carry `width:100%; contain:inline-size`, so they never widen the block and are exactly as wide as the headline (tests: ±2 px). Phone (<=720px): `.hx-in{width:100%}`, lines wrap, font `clamp(38px,11.4vw,50px)` (library 36–46px), search full width.
- Headline: Onest 800, `-.045em`, `--hx-fs: clamp(46px,6.3vw,100px)` (library `clamp(42px,5.4vw,80px)`). Italic words (`.k`): `--f-serif-i` = Playfair Display Italic, weight `--hero-i-w` (650), size 1em, fallback Georgia, 'Times New Roman', serif (italic). Loaded with Onest in ONE Google Fonts link (`family=Playfair+Display:ital,wght@1,600..700`); never embedded. «G-type» = `.k.a`, accent colour. In the library the count is `.n` (accent), computed by `libHeadCount()` from `libIds().length`, genitive plural: 1, 21, 101 «шрифта», everything else «шрифтов».
- Every `.ln::before` is a zero-width space (`\200b`): a line with only an inline-block (the circles) would collapse in quirks mode, because the page has no doctype. Don't remove it.
- Circles `.cl`: three overlapping discs, 0.86em, overlap .28em, ring `--hero-ring` (= `--bg`) .045em. Home: accent + white nib icon, ink + grid icon, peach + «А» with kerning arrows (SVG, `currentColor`). Library: `.cl.aa`, three `canvas.lcv[data-circ]` drawn by `drawLibrary()` (Ренесса italic, Сцепка, Пропись: as in the approved sketch); `data-circ` = cap height as a share of the disc (.34 / .30 / .36), `data-sty="italic"`, `data-fill` = token name of the glyph colour.
- Tokens (TOKENS block, light / dark): `--hero-peach` #FFC4B6 / #F7B3A3, `--hero-c1` = accent, `--hero-c1-ink` = on-accent, `--hero-c2` = ink, `--hero-c2-ink` = on-ink (light disc with ink icon in dark theme), `--hero-c3` = peach, `--hero-c3-ink` #17171a, `--hero-ring`, `--hero-i-w`, `--f-serif-i`. No literal colours in the hero CSS (checked by tests/e2e_hero.py).
- Entrance: the one-time rise (6.9) applies to `.hx-in > h1 / .rtip / .srch` (CASC in ui_motion.js).

### Rotating tip (`.rtip`, ui_tips.js)
- Grey subline that cycles short messages about real features (home 10, library 6; the list is `MSG` in ui_tips.js, key words `*accent*` in `--accent-text`). Rules for messages: Russian, warm, <= 70 characters, no exclamation marks, each names a feature that exists (grep the UI before adding one).
- Stable box: all messages are stacked in ONE grid cell (`.rtip-v`), only one is visible, so the height = the tallest message and the width never changes: zero layout shift at any viewport width (phone wraps to two lines, the space is reserved).
- Motion (tokens only): every `--tip-gap` (4500ms) the old message fades and lifts `--tip-lift` (7px) in `--dur-fast` `--ease-in`; the new one rises from `--tip-rise` (8px) in `--dur-base` `--ease-out`, word by word with `--stagger-tight`, starting after the old one has left (delay `--dur-fast`). `html.nomo` and reduced motion zero the durations through the same tokens.
- Pauses (the tick does not count): pointer over the line, focus inside `.hx-in` (typing in the search), hidden tab, header out of view or its view hidden (IntersectionObserver + size check), a tour running (`TOUR.active()`), `prefers-reduced-motion` (then the first message stays, nothing moves). Time is kept while paused.
- Accessibility: the moving line is `aria-hidden="true"`, no `aria-live`; the full list is a visually hidden `<ul class="vh" aria-label="Подсказки">` in the same block. No links in messages (nothing to focus, nothing to trap).
- Test hooks: `TIPS.gap`, `TIPS.state(el)`, `TIPS.step(el)`, `TIPS.reset()`.

## 7. Motion (m41)
Source of truth: `MOTION_SKILL.md` (measured from the two reference videos). CSS half = block `MOTION m41` at the end of `<style>` in `template.html`; behaviour half = `ui_motion.js` (global `MO`). Test: `tests/e2e_motion.py`.

### Tokens (`:root`, TOKENS m40)
| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 90ms | press attack, tooltip/popover exit, label swap, drawer content delay |
| `--dur-fast` | 180ms | hover in, popover open, segmented indicator, toggle, section crossfade, view leaving |
| `--dur-base` | 300ms | hover out / press release, pane open, chevron, toast in, cascade items of lists (FLIP) |
| `--dur-slow` | 550ms | item rise (cascade), view enter |
| `--dur-expressive` | 1000ms | reserved (hero-scale counters) |
| `--dur-open` / `--dur-close` | 450 / 250ms | derived from skill 6.8: drawers, sheets, canvas push, pane close, removal |
| `--stagger-tight/base/wide` | 35 / 100 / 180ms | text/list steps, hero lines, cards; total cascade capped at 600ms, first 24 visible items only |
| `--ease-out` `.2,0,0,1` | enter, rise, open | `--ease-std` `.4,0,.2,1` colour/general | `--ease-inout` `.65,0,.35,1` morphs (indicator, export pill) | `--ease-in` `.4,0,1,1` leave/close | `--ease-out-soft` `0,0,.2,1` press release | `--ease-spring` linear() overshoot (checkbox release) |
| `--ease-travel` `.45,0,.1,1` | an element that TRAVELS a long way (card/sheet moving between two places, 0.5-1 s): slow start, long soft landing. Not for UI feedback; reserved for showreel-grade moves (no component uses it yet) | |
| `--ease-arrive` `.25,.8,.25,1` | something ARRIVES and settles (rolling digit entering, counters, content landing): fast approach, gentle stop | used by `MO.num` |

Reduced motion (`prefers-reduced-motion: reduce`): `--dur-fast/base/slow/expressive/open/close` = 1ms, staggers 0; popovers, drawers, toasts keep a 90ms opacity fade only; no transform, scale, clip, cascade, FLIP, ghosts, pane height animation, hero entrance, shake. The loader keeps spinning (functional).
Automation switch: under WebDriver (`navigator.webdriver`) the head script sets `html.nomo` (all durations 0s, `transition:none`, no WAAPI) unless the URL has `?motion=1`. Existing e2e lanes therefore run without waiting for animations; `tests/e2e_motion.py` and the demo use `?motion=1`.

### Recipes per component
| Component | Recipe | Timing |
|---|---|---|
| `.btn .chip .tag .sug .vlink .fchip .tbtn .menu button .xmenu button .seg button .vtabs button` | 6.1/6.2 press `scale(.97)`; hover in fast, out base | attack 90ms, release 300ms `--ease-out-soft` |
| `.coll .mcard .tile` | same, `scale(.985)` | |
| `.rb .nb .ibtn .arr .heart .hc-heart .mx .dw-x .logo` (round) | press grows to `scale(1.06)` (max) | same |
| checkbox / radio | press `.88`, release with `--ease-spring`; fill linear fast | |
| `label.tgl`, `.dr-sw` | 6.3 thumb `translateX` 180ms `--ease-std`, track colour linear, thumb stretches while pressed | |
| `.seg .vtabs .tt-tabs .dr-seg .imp-seg` | 6.4 ONE shared `.mo-ind` slides (translate + width) under the options; colour is probed from the real `.on` button so every context keeps its look | 180ms `--ease-inout` |
| focus ring | transparent 2px outline always present, colour fades in | 180ms |
| `.pane` | 6.7 body height + paddings + content opacity (WAAPI), chevron rotates | open 300ms `--ease-std`, close 250ms `--ease-in`, content fades after 60ms |
| rail drawers `.dw` (`#pcard #dr-side #imp-side`) | 6.8 clip-path wipe from the rail side + 20px slide + opacity, content fades 90ms later; section switch = 180ms crossfade, no re-slide; canvas push = margin animated in sync | open 450ms `--ease-out`, close 250ms `--ease-in` |
| `.xmenu .helpc .projpop .nudge .hcard` | 6.6 fade + 6px shift + .98 scale, node stays rendered (visibility) so `hidden` stays authoritative | open 180ms `--ease-out`, close 90ms `--ease-in` |
| phone `.rmore`, `.projpop`, export menu, drawers | 6.8 sheet rises 24px from the bar | open 450ms, close 250ms |
| `.cu-modal .dr-m` | scrim fade, card rises 8px + .97 -> 1 | in 180/300ms, out 250ms |
| `.toast` | 6.15 rise + fade | in 300ms, out 250ms |
| views (home, library, favourites, editor, proof, kern, draw, import, DS) | 6.16: leaving view = ghost clone (canvases copied) fades up 8px; entering view fades, content rises; library views cascade first 24 visible cards (6.9) | leave 180ms `--ease-in`, enter 550ms `--ease-out`, overlap 90ms |
| Прямой/Италик | canvas re-enters (opacity .35 -> 1) | 180ms |
| home hero (h1, p, search) | 6.9/6.11 one-time rise 14px, 100ms steps | 550ms, `html.mo-seen` stops it |
| rotating tip (`.rtip`, §6.2) | old words fade + lift 7px, new words rise from 8px with `--stagger-tight`, every 4500ms; pauses on hover, focus, hidden tab, off-screen, tour; static under reduced motion | 180ms `--ease-in` / 300ms `--ease-out` |
| recent-work card `×` | 7 FLIP: card collapses (ghost, .9 + fade), siblings slide, new card rises | 250ms / 300ms |
| favourite re-order | FLIP | 300ms `--ease-out` |
| `#ex-menu` export | 6.12: pill -> circle (450ms `--ease-inout`) -> 3-dot orbit loader (only if the work takes > 300ms) -> colour to success -> pill with «Готово», hold 900ms, back. Error: red pill «Ошибка» + shake. Button stays anchored (fixed width). Phone `#rail-dl` (round): no width morph | |
| import slots / counters | filled slot pops (scale .9 -> 1.04 -> 1); group counters tween 550ms, `tabular-nums` | |
| editor glyph list | 1-3 new glyphs pop in; a full rebuild does not cascade | |
| `.skel` | 6.13 shimmer 1.3s linear for waits > 300ms (none currently needed: library thumbs draw in one frame) | |

### Stage 1 additions (Stageshow rules)
- **Rolling numbers** `MO.num(el,text)` (ui_motion.js 6.14b): only the changed digits roll (old lifts 0.6em and fades, new rises from below), last digit first with `--stagger-tight`, `tabular-nums`, positions aligned to the right edge (a new leading digit appears, the rest stays). Used by: draw progress «N из M», library «Найдено: N из M», languages «N из M». Falls back to plain text when motion is off, the element is hidden or the non-digit text changes. Slider / kerning values stay 1:1 during a drag (never animated), but have `tabular-nums` and a fixed slot.
- **Popover anchor**: closed state is `scale(.97)` only (no translate) with `transform-origin` on the edge that faces the trigger (`.xmenu` top right, `.projpop` left bottom, `.helpc` left centre, `.nudge` top left), so the anchor edge never moves; checked by `tests/e2e_jank.py` (detector 4). Phone sheets keep the 24px rise from the bar by design.
- **Frame detectors** (`tests/e2e_jank.py`, slow lane): settle snap, appears-then-moves, near-empty frames, anchor drift (dynamic, virtual 60 fps clock) and tight inset (< 8px), near-tangent (1-3px), mixed icons (static, all views x both themes x 1440/400). New components must pass them or be added to `WL` with a reason.
- **Nested radius**: outer radius = inner radius + padding. A control of height h inside a frame with padding p: frame radius = h/2 + p (pills stay pills); a rounded-rect inner of radius r (token) inside padding p needs outer r + p (8 + 8 = `--r-md` 16; 12 + 4 = `--r-md` 16; 16 + 6 ~ `--r-lg` 22).
- **Label centring**: `text-box: trim-both cap alphabetic` is applied (inside `@supports`) to `.badge`. Onest sits 0.02em above the optical centre (font metrics: ascent 970, descent 305, cap 707), i.e. 0.3px at 14px, so flex buttons (the property does not reach anonymous flex items) are left as they are.

### Stage 2 additions
- **Live demos** (`ui_demos.js`, `ui_demos.css`; see MANIFEST «Stage 2»): faux product UI in a rounded `--r-lg` frame (`inset 0 0 0 1px --line`), hero card `--card` + `--sh-2`, satellites `--paper` + `--sh-3`, accent only for the brand action, success = `--ok` / `--ok-ink`. Both themes through the tokens. Motion inside the demos is its own scripted timeline (travel `cubic-bezier(.45,0,.1,1)`, arrive `(.25,.8,.25,1)`, 0.8-1 s, payoff holds 2 s) and is the only place where literal curves are allowed (they are the film, not UI transitions). Rules: poster first, play only when visible, `MO.off()` = poster only, reserved size (no shift).
- **Help button** `.dm-q` (28 px round, 16 px icon, `--text-2`, hover `--panel`) opens the shared `#dmpop` (`.helpc` surface). Add a hint: put `DM.hintHTML('<hint>', cls)` where the help belongs (hints: `cells|weight|kern|save` in `HINTS`, texts in `INFO`), nothing else. The popover closes on Esc (without closing the drawer behind it), outside click, resize of the trigger away.
- **Keyed rows** `MO.keyed`: chips/tags that change with a query must be updated by key, never by `innerHTML`; exit (`--dur-fast`, ease-in) shorter than entrance (`--dur-base`, ease-out).
- **Small icons**: icons <= 14 px are filled shapes (`--i-caret`), not strokes (a 1.8 stroke on a 24 grid is 0.9 px at 12 px). One icon size and one stroke width per toolbar (jank detector 7).

### Exceptions (documented, not hidden)
- `margin-left` on `#stagebox`, `.dr-mid`, `.imp-lib` (canvas push): the canvas has to re-fit its container each frame; transform/FLIP would stretch the bitmap.
- Pane body `height/padding/margin` (WAAPI): bodies are not single-wrapper containers, so `grid-template-rows: 0fr -> 1fr` would need re-wrapping the nodes that 28 modules address by id. Layout is contained by `overflow:hidden` for the duration only.
- `width` of the export button and of the segmented indicator (tiny elements).
- `clip-path` on drawers (paint only, small area).
- View Transitions API is NOT used: `document.startViewTransition` runs its callback asynchronously (the app, its tests and `setTab` consumers need `S.tab` and `hidden` to change synchronously) and blocks pointer input for the whole transition. The same effect is built from a cloned ghost of the leaving view + WAAPI on the entering one, input never blocked.
- Never animated: canvas drags, point moves, sliders, live preview, glyph edits (1:1 instant).

### Rules
- Do: new components take transitions from the tokens; hover state sets `transition-duration: var(--dur-fast)`, base state the slower out duration. Don't: write `.2s` or `cubic-bezier(` in a component.
- Do: `will-change` is not set; WAAPI/transitions promote layers only while running.
- Do: popovers keep `[hidden]` as the only state flag; the CSS keeps the node rendered for the exit.
- Do: use `MO.flipList(box, mutate, {key})` for list removal/re-order, `MO.flip(el, mutate)` for single elements, `MO.off()` before any new JS animation.

## 8. Profile section (m43)
- Views: `#view-profile` (profile) and `#view-pfolder` («Созданные шрифты»), tabs `profile` / `folder` (added to TAB_VIEWS/TAB_NAV). Code: `ui_prof_a.js` (data, render, layers, actions), `ui_prof_b.js` (image pick, crop, edit drawer, showcase editor), `ui_prof_c.js` (визитка, backup). CSS block `PROFILE m43` in template.html, tokens in the profile token group.
- Rail: `#rail-profile` is the LAST item of the rail, shown only in library modes (hidden by `body.rm-work`); avatar image / initials / neutral person icon; `.dot` (accent) while the profile is incomplete. In the folder the top item is `#rail-back` (back to the profile). No ring, no outline, no camera badge on any profile avatar.
- Cover: absolute layer under the rail, reaches left/top/right edges, alpha-ramp mask fades the bottom into `--bg`. Default = home-hero gradient + ghosted type letters (`paintGhost`); a user image fades identically. Cover and photo are changed only in the edit drawer (no buttons on the profile itself).
- Header: avatar, name, bio, then ONE row: social chips (<= 4, monograms) left, action button right on the same line, vertically centred (owner: «Поделиться» + «Редактировать профиль», guest: «Поделиться»); phone stacks them.
- Pinned works (`PROF.sections`, `ui_port.js`): <= 4 pinned finished fonts (`meta.pins`; the old 3-slot showcase migrates in `norm`), then «Работы» (pin / share per card, «Изменить порядок» = pointer drag by the grip + arrow buttons with `#sk-live` announcements, order in `meta.order`), then «Подборки» (`.pband` bands, rename dialog, inline delete confirm `.pband.confirm`). Samples painted in the real font on canvas; no number badges, no counters in headings.
- Profile look and license (drawer groups from `PORT.drawerHTML`, applied by «Сохранить»): name font (`meta.nameFont`, canvas in `h1.pf-name`), accent (`meta.acc`, `#view-profile[data-pacc]`, tokens `--pa-N` / `--pai-N`), default license (`meta.defLic`), per-font license (`meta.lic`). `GT_LICENSE(fontId)` feeds name IDs 13/14 in `metaNameTable` (OFL, CC BY-NC with URL, «Все права защищены» without ID 14); stock fonts without a choice keep their file as is. All of it travels in the profile backup.
- Export formats (W96-F): menu and `#xpv` chips are `.ttf`, `.otf`, `.woff2`, `.woff`, family `.zip`, «Вариативный», `.png`; under the chips one line of plain Russian (`.xpv-hint`, `--fs-md`, `--text-2`) says what the chosen format is for (TTF — для установки в систему; OTF — то же, кривые как в редакторе, удобно для дизайн-программ; WOFF2 — для сайтов, самый лёгкий; WOFF — для старых браузеров). Chips wrap at 1440, scroll sideways at 390.
- Export (`ui_port_x.js`): the file formats of the «Скачать» menu open «Перед скачиванием» (`#xpv`) first; sizes are estimates («≈»); the signature switch writes `meta.sign` (= name IDs 9/12). «Поделиться» draws a 1080x1350 card on canvas and saves it through `saveFile`.
- Own text: field `.ltx` in the library header and on home (shared, `sessionStorage gtype-libtxt-s`), chips are toggles; the cards' `⋯` menu (`PORT.cardMenu`) adds a font to a collection, favourites or share.
- Folder card (`.lcard.pfc`): arrow button and cut share the NOTCH44 geometry (`.notch` + `--cpad`); the fan is clipped with the same mask (`.pfc>.pfc-fan`), so the cut is always clean with or without the owner tools card and on phone. Test: `e2e_profile.py` profile_geom samples pixels around the cut.
- Layers (`PF.pushLayer`): drawer, crop, modals; Esc closes the top one, Tab is trapped; dirty drawer asks inline (`.pf-uc`), no alert/confirm/prompt anywhere. Phone: drawer = bottom sheet.
- Guest view: `profileView(profile,{owner:false})` — owner-only nodes (`.pf-own`, tools, checklist, drafts, edit controls) are not rendered at all.
- Destructive confirms are inline on the card (`.pf-fc.confirm`) with `.btn.danger.solid`.

## 9. Onboarding (m44)
Code: `ui_tour.js` (global `TOUR`), CSS block `ONBOARDING m44` in `template.html`, tokens `--tour-scrim` (55% black light / 65% dark), `--tour-w` (320px), `--z-tour` (200). Test: `tests/e2e_tour.py`. Demo/stills: `qa_tour/`.

### Anatomy
- One overlay `#tour`: ONE SVG path (viewport rect + rounded cut-out, `evenodd`) = scrim; `.tour-ring` = 2px `--accent` ring on the cut-out edge that pulses once on arrival (`--dur-slow`); `.tour-card` = `--paper`, `--sh-3`, `--r-lg`, max `--tour-w`.
- Cut-out = target rect + 6px padding (`pad` 6-8), radius = target radius + pad, kept inside the viewport. The ring is on the dimmed side, so it reads on the rail (dark in both themes) and in dark theme.
- Card: label (section, 12px caps) / title (`--fs-lg`, 600) / 1-2 sentences / progress dots (`--accent` = progress) + «N из M» / «Пропустить» (text link), «Назад» (`.btn.ghost.sm`), «Далее» (`.btn.pri.sm`, «Готово» on the last step). Arrow = 16x8 triangle on the side facing the target.
- Placement: right / left / bottom / top (step `side` first, then by geometry), clamped on screen, never over the cut-out; if no side fits the card takes the corner that covers the target least (no arrow). Phone <= 720px: bottom sheet above the bar (`--tour-bar`); if the target would be under it the page scrolls, otherwise the sheet moves to the top (`.up`).
- Modes: tour (`.tour.blk`, scrim, clicks outside the card are blocked, `allowClick` lets the target through) and single coachmark (`.tour.one`: no scrim, ring + card, one button «Понятно», never blocks: any press elsewhere, Esc or 9 s dismisses it).

### Rules
1. Tours run once, the first time the section is reached (`tour:<id>` in the hint set, `gtype-hints-v2`). Replays go through the «?» card; `TOUR.reset()` / «Сбросить подсказки» clears everything.
2. Never starts while a tour, menu, modal or drawer is open: it is queued (retry every 500 ms, expires after 2 min) and dropped if the user left the section.
3. A missing / hidden target is skipped silently; the counter is computed from the steps that exist when the tour starts (`lazy` steps, e.g. a drawer opened by `before`, count as existing).
4. Motion: scrim fade-in `--dur-base` / out `--dur-fast`; cut-out and ring glide between targets with a rAF tween (`--dur-base`, `--ease-std`, exception like the segmented indicator: a tiny SVG path); card fades + rises 6px (`--dur-fast`, `--ease-out`). Reduced motion / `html.nomo`: instant.
5. Keyboard: Esc skip, Left/Right back/next, Enter next (not when focus is on «Назад»/«Пропустить»), Tab trapped in the card, focus returned afterwards, each step announced through `aria-live`.
6. Automation: nothing starts under WebDriver unless the URL has `?tour=1` (add `?motion=1` to see motion); legacy flag `gtype-tour-v1=1` (used by the e2e lanes) also keeps auto-start off.
7. Accent only for ring, progress dots, primary button and the one-time dot on «?» (after the welcome tour was skipped); no red for anything else. No alert/confirm/prompt.
8. Contextual hints fire on the first REAL interaction (slider released, drag ended, pill opened, pane opened, dialog opened), after the trigger's own animation settled (anchor rect stable for 3 frames), never on load.

### How to add a step / tour / hint
- Step: add `T(title, text, {sel, lab, side, pad, allowClick, lazy, before, after, when})` to `TOURS[id].steps`. `sel` = selector, array of selectors (union), or function returning elements; texts may be functions. Use `before`/`after` to open and restore state (drawer). 3-6 steps, 1-2 short sentences, plain Russian.
- Tour: add `TOURS[id] = {label, ctx, go, steps}`; `ctx` = value of `ctxNow()` (S.tab, `import`), `go()` navigates for replays; add the id to `TOUR_ORDER` and `CTX_TOUR`.
- Hint: add `HINTS[id] = {t, d, side}` and call `TOUR.hint(id, anchorElOrFnOrRect, {delay, side, pad})` from the interaction (see `wireHints`). Id is stored forever, so pick a new id for a new meaning.
- Check a new step with `tools`-style stills: card inside the viewport, no overlap with the ring, no clipped text; add its section to `tests/e2e_tour.py` if it is a new tour.

### Hints and tours (current)
Tours: welcome (home), editor, proof, kern, profile, draw, import. Hints: slide (slider released), point (point drag ended), skel / draw (mode button), pair (click in the sample), kernpill (kern pill opens), export (menu opens), vfexp («Вариативный»), axes («Оси» pane), modes («Режимы» pane), cmp («Сравнить»), deco («Декор»), uniwidth (switch on), pixres (pixel section appears), pfvis (folder opens), vitrina / avcrop / backup (profile dialogs).


## 10. Голос и тон (m63)

Правила текстов интерфейса.

- Тепло и коротко, на «вы». Одна мысль в одной строке.
- Кнопки начинаются с глагола: «Скачать», «Сохранить пресет». Исключения: подписи переключателей состояния («Угол», «Плавная») и стандартная «Отмена».
- Без непонятного жаргона. Термин допустим, если рядом есть пояснение (например, «хинтинг» с описанием).
- Ошибка отвечает на два вопроса: что случилось и что делать дальше. Без обвинений («вы ошиблись», «неверно») и без шуток.
- Тосты об успехе и пустые состояния могут нести редкую лёгкую типографскую шутку. Не больше одной на экран, не в ошибках, не в aria-label.
- Без восклицательных знаков.
- Числа с единицами: «12 px», «60 МБ», «3 знака».
- Буква «ё» там, где она есть. Кавычки только «ёлочки».
- aria-label и title остаются простыми и описательными, без шуток.

Компоненты m63:
- Подборки (ui_podb.js): `.pband` с каруселью `.spc`, сценарные образцы, на телефоне один экран на карточку (scroll-snap, без полос прокрутки). Реальные карточки шрифтов остаются `.lcard[data-font]`.
- Пояснения к ползункам (ui_expl.js): `.xp-row`, `.xp` с мини-превью min/max, ленивая отрисовка и кэш. Переключатель «Показывать пояснения», ключ `gtype-expl-v1`.
- Статус шрифта (ui_status.js): плашка `#st-plaque` и блок `#xm-st` в меню экспорта. Уровни: ok (--ok), warn (--warn), bad (--danger). Ключ языков `gtype-status-lang-v1`.

### Draw: tool «Ячейки» (cell grid)
- Panel `.pane[data-pane=dr-cells]` («Сетка ячеек», hidden unless `D.tool==='cells'`, first pane of `#dr-side`, drawer section `cells`, rail icon `layers`). Uses only existing parts: `.dr-sec`, `.dr-row` + range (accent track), `.dr-pills`, `.dr-sw`, `.dr-hint`; three small additions in the draw CSS: `.dr-shp` (row of 34px round shape chips, `.dr-ib` + `.on` = ink), `.dr-two` (two sliders side by side, e.g. Столбцы/Строки), `.dr-ends` (end labels under «Переход»). Chips use `title`, not `data-tip` (the drawer clips tooltips).
- Dock options of the tool: Карандаш / Ластик (Shift inverts) / Очистить слой / Показать сетку + «Размер» 1–7 slider (the same value as in the panel). Key `=` (or `+`), tooltip «Ячейки (=)»; `7` is the glyph «7».
- Layers list (m83) at the top of the panel: `.dr-lays > .dr-ly` rows (round `--r-md`, `--surface-2`, active = `--ink` fill with `--surface` text, hidden = dimmed + struck name), eye `.dr-ib`, name button / inline `.dr-ly-in` (accent outline), count; `.dr-lbar` round icon buttons (add, duplicate, rename, up, down, delete); delete confirmation `.dr-conf` with `.dr-pills` buttons (not red: it is not an error); status via `.dr-hint`, `.dr-sub` label «Настройки слоя «…»».
- Canvas: cell outlines in `--dr-grid` (sub-grid `--dr-grid2`), hover footprint in accent. No new colours or tokens.
- Transition: `MO.off()` (reduced motion / automation) = instant; otherwise `--dur-base` with the `--ease-std` curve read from the tokens (`MO.D('base')`, `MO.E('std')`). For checks only: `window.__GT_CELLANIM=<ms>` forces it.

## 11. Library covers (Stage 3, Stageshow framing)
- A font cover is one canvas (`canvas.lcv`, drawn by `cvDraw` in ui_a.js with the font's own glyph paths; no extra font loads). Rules: one hero word >= 2/3 of the cover width (visible part), 10-40 % of the word bleeds off ONE edge (right / left / bottom, edge and share from `cvHash(id)`, shifted in .035 steps so the cut crosses ink, not a gap); 2 satellites of other kinds: black pill with the font's own «Аа» (glyph pair) and an outlined tag with the glyph count («357 знаков · VF», «базовый» for the basic set). 3 strings (list strip: 2). The top right corner belongs to the card notch (open button); the other corners are filled by the hero or a satellite.
- Words: real Russian words (Latin pool as fallback when the font lacks Cyrillic), picked so the cap height uses ~88 % of the free height (word length is adjusted from the measured advance: narrow fonts get long words, wide fonts short ones); the pick is cached per font and size. Own text (library «Свой текст» / «Название») replaces the word; if it does not fit the frame it is drawn without bleed, left aligned, with «…».
- Layouts by canvas height: `wide` 144 px (chips on top, floor 56 px under the notch), `phone` 168 px (<= 720 px: taller cover, larger chips, same hero rules but shorter words and bigger cap), `strip` (list view 60 px, mini card 76 px: hero + chip on the side opposite to the bleed). CSS: `--cvh` on `.lcard`.
- The «Базовый набор» label is hidden in grid cards (the tag says it) and stays in list rows. Canvas colours are the light-sheet tokens (`--glyph`, `--canvas`, `--glyph-dim`, `--muted`), both themes.
- Checks: `tests/e2e_covers.py` (hero >= 2/3, bleed, strings, quadrants, 400/768/1440, light/dark, deterministic, own text).

### 11.1 Project rule: nothing leaves the frame (no bleed)
This overrides the Stageshow rule «hero bleeds 10-40 % off an edge» for the whole project. No element may be cut by the edge of its frame: covers, demo stages (hero window, satellites, text), share poster, cards.
- Covers: the hero word lies completely inside the cover padding (14 px, strip 8 px) and under the chips row; it is fitted by ink bounds (glyph nodes and bezier handles, vertical too), never wider than the padding box and never under the card notch (top right 56 px). Width target >= 2/3 of the cover; shorter/longer words (and 24-30 letter phrases for the 7:1 list strips) are picked until width and height are used together. The tag is shortened («N знаков») when it would reach the notch. `dataset` of every cover: `ix0 ix1 iy0 iy1` (ink box), `vis`, `strings`, `layout`.
- Demos: hero windows are as large as their content (600x308), the stage keeps a 6 px inset for every element, content keeps 8 px inside the hero. Checked in `tests/demo_frame.py` (also run by e2e_demos).
- Share poster (§12): 24 px gutter on every side, hero measured with `actualBoundingBox*`.
- Test rule for new components: measure the ink/box of every element against its frame in every frame of the motion, not only at rest.

## 12. Share poster «Поделиться шрифтом» (Stage 3)
- Entry points: editor «Скачать» menu item «Поделиться шрифтом…» (`data-x=share`, not a file format, excluded from `platformInfo().formats`) and the draw top bar button `#dr-shareb` next to «Сохранить шрифт» (icon only below 1040 px; enabled when the font «Свой шрифт» exists). The older static share card (`PORT.share`, §profile/library) is unchanged.
- Panel `#pst` (ui_share.js, classes `pst-*`): scrim + card, desktop two columns (poster 360 px | title, name field, PNG, WebM), phone bottom sheet (poster width = min(52vh*.8, screen - 32), 44 px controls, no visible scrollbar). Open: opacity + 8 px rise `--dur-base`/`--ease-out`, close faster (`--dur-fast`). Esc anywhere closes, Tab is trapped, focus returns to the opener. Poster colours are the fixed light sheet in both themes; the card follows the theme.
- Poster = pure `draw(c,t)` on a 540x675 canvas, loop 7.4 s, poster frame 5.4 s (Black, everything composed). Reduced motion / automation (`MO.off()`) = poster frame only, no rAF. Weight morph on the real wght axis: the font of the user is built in the page as a variable font with only the poster's glyphs (`buildVariableTTF(..., {chars})`, 0.4 s Volt to ~12 s Propis, progress bar) and loaded as a FontFace; fonts without the axis fall back to a static face (weight does not move).
- Name: project/font name (editable, 24 chars), hero by ink bounds over the whole weight range, long names shrink to 64 px then two lines with an ink gap >= 8 % of the size. Export: PNG 1080x1350, WebM 720x900 (MediaRecorder on canvas.captureStream, vp9/vp8), both through `saveFile` (the artifact `downloads` capability, anchor fallback). No GIF.
- Check: `tests/e2e_share.py` (every 0.2 s of the loop for 4 names: all element boxes inside the frame, gutter at rest).

### 12.1 Poster formats, themes, phrase (Stage 4B)
- Controls in the dialog (`.seg.pst-seg`, in this order): Формат 1:1 / 4:5 / 9:16, Тема постера (Светлая / Тёмная / Акцент, with a colour dot), Что на постере (Знаки / Своя фраза); then the name field, the phrase field (placeholder «Своя фраза», visible only in phrase mode, fades in `--dur-base`, hides instantly), PNG (primary, full row), WebM, MP4 (only when the browser records MP4). Format change: preview pulse `--dur-base` `--ease-out` (opacity .4 -> 1, scale .97 -> 1), no animated resize.
- Poster palettes are fixed, independent of the app theme: light `#efeff1` / ink `#0b0b0c`; dark `#131316` / ink `#f4f4f6`; accent `#FC473C` / ink `#0b0b0c` (6.1:1), white cards. No-bleed rule (§11.1) holds in all formats: 24 px gutter, everything fitted by ink; the glyph size in the card follows the widest glyph; phrase and name never cross the card/field.
- Messages (`.pst-msg`): muted text only; dropped phrase chars are a hint, never an error colour.



## 13. First-run onboarding (Stage 4C)
Code: `ui_onb.js` (`ONB`), CSS `.onb-*` (end of the main style block), markup `#onb`. Reference: `scratchpad/stage4/onb/proto.html` (approved; do not redesign).
- Desktop: centred dialog 720 px (`--r-xl`, `--paper`, `--sh-3`, padding `--s5 --s6 --s6`) over `--tour-scrim`; phone (<= 560): bottom sheet with a 36x4 grabber, swipe between steps. Demo area = `aspect-ratio 720/340` (358/340 under 560 px container width), reserved by a container query, so nothing jumps.
- Anatomy: «ШАГ N ИЗ 4» (xs caps) + «Пропустить» (ghost) / demo / title (`--fs-2xl` 800, `--fs-xl` on phone) / text (`--fs-lg`, `--text-2`) / dots (current 20 px accent pill) + «Назад» (ghost) + «Далее» (accent; «Создать шрифт» on the last step, «Пропустить» hidden).
- Motion: open 450 ms (`cubic-bezier(.2,0,0,1)`), close 250 ms (`(.4,0,1,1)`), step: out 180 ms, in 300 ms after 120 ms (12 px shift); reduced motion = 90 ms fades, demos stay on the poster frame. Only the visible step's demo runs; all pause when the dialog closes.
- Behaviour: first visit only (`gtype.onb.v1`), never under automation unless `?onb=1`; Esc closes, Left/Right change step, Tab trapped, `.app` inert, focus returns to the opener; a click on the scrim does not close it. Accent only for the dot, the primary button and focus rings. Nothing crosses the dialog frame (checked at 1440 and 400, both themes, every step: `tests/e2e_onb.py`).

## 14. History panel «История» (Stage 4C)
Code: `ui_hist.js`, CSS `.hist-*`. Popover (desktop, 360 px, `--r-lg`, `--sh-3`, under its icon button) or bottom sheet (phone). Row = 56x40 preview tile (`--panel`) + label (600, max 2 lines) + time (xs, `--text-2`); current row on `--panel`, later (redo) rows at 55 % opacity; rows are 44+ px high, no scrollbar. Toolbar buttons `#undo` `#redo` `#hist-btn` use `.ibtn` (disabled = 40 % opacity); `#hist-btn[aria-expanded=true]` is inverted (ink on `--on-ink`). Icon `--i-history` (24 grid, 1.8 stroke, round caps). Labels are short Russian phrases with the old and new value; no toasts on undo/redo.

## 15. D5 design pass (rail, toolbars, neutral selection)
- **Rail**: one structure in every desktop mode: logo | Главная · Библиотека · Избранное | `.rsep` | tools of the mode | «?» · Проект/тема (home only) · Профиль. Buttons stay plain icons; hover/focus shows the small `.rb[data-tip]::after` tooltip to the right (no expansion). Phone bar unchanged.
- **Editor top bar**: ONE surface `body.rm-ed header.top`: style | mode | history | Проект | status | Скачать, `.tdv` dividers. It must fit at 1920 … 962 px and on the phone: the status plaque truncates (ellipsis), collapses to a dot chip at 1100-1399 px and hides below 1100; «Проект» turns icon-only <= 1180, the licence chip hides <= 1100 (block `== D5d ==`).
- **Missing is not an error**: a missing glyph in «Полнота набора» is neutral (hatched, `--text-2`), the status plaque for missing letters of a drawn font is amber; red stays for real errors. Twin cards (A/А) are fixed once.
- **Draw top bar**: set dropdown `#dr-setb` (name · progress) + `#dr-sets` listbox; actions that cannot be used yet are `hidden`, not disabled-grey (`actVis`, `.dr-in`).
- **Draw toolbar**: one `#dr-dock`: history | tools | actions, second row = active tool label `#dr-tlab` + options.
- **Selection colour**: `--sel` / `--dr-ink`, never `--accent`; error strokes `--danger`.

## 16. Home column cap and «Как это работает» slider (W82)
- **`--home-max`** (default `1720px`, set on `#view-lib`): max width of the home content column (`#view-lib>.vsec`, `#home-more`), centred with `margin-inline:auto`. It equals 3 slider cards at 560 px + 2 gaps, so rows do not spread on 2560/3840 screens. Change the token, never a per-section max-width.
- **Slider cards**: ONE stage format (720x340) for every demo, uniformly scaled (`transform:scale(cardWidth/720)`) to the card width at every width incl. the phone; there is no compact/adaptive layout and no `data-c`. Card width = min(720, (W-(n-1)gap)/n), n = floor((W+gap)/(440+gap)) (1 / 2 / 3 at phone-tablet / laptop / wide): a card is never narrower than 440 px (scale .61) except on the phone swipe row (card = 90% of the row, scale about .5). If all 6 fit, the row is static with no controls.
- **Controls**: prev/next `.arr` in the section head, dots (current = ink pill), ArrowLeft/Right on the focused region, swipe. Phone <= 719 px keeps the plain swipe row.
- **Motion**: loop without clones (slot = (i - idx) mod 4), WAAPI with `--dur-slow` / `--ease-out`. Autoplay 5.5 s, paused on hover, keyboard focus, touch (12 s), off-screen, hidden tab, reduced motion.
- **One-time storage note `#nsn`** is fixed bottom-left in the shell; on the draw screen `ui_draw_n7.js` lifts it above `#dr-dock` (centred on it), so it never covers the toolbar.

## 17. Tool «Блок» («Тяга», W83 T2)
- Where: the editor sample pane (`#specwrap`) when «Тяга» is the open font. Toggle `.seg#tyb-view` «Образец | Блок» in the pane header row (`.tyb-tog`); block mode adds `.tyb-on` to the pane and `.tyb-ed` to `#view-edit`. Canvas `#tyb-cv` sits on the paper surface (`--canvas`), glyph ink `--glyph`, selection frame/handle/badge in `--ink`; the ONLY accent-red control is `.btn.pri` «Скачать PNG».
- Desktop >= 1061 px: the pane spans the whole editor area (glyph list and stage hidden), canvas left (`minmax(0,1.6fr)`), controls right (`minmax(320px,1fr)`); the settings drawer pushes the pane right by `--dw-w` + `--wg`. <= 1060 px: stacked (canvas, text, width, toggle, segmented, hint, actions); <= 720 px: action grid (2 columns, «Скопировать текст с ~» and «Скачать PNG» full width). Nothing may overlap or leave the pane (asserted at 1440/1024/768/390 in `tests/e2e_tyaga.py`).
- Controls use the existing components only (`.seg`, `.ctl` range, `.tgl` switch, `textarea.inp`, `.btn.sm`); status line `#tyb-info` is `role=status`; the canvas is focusable (`tabindex=0`, focus = inset ring like other composite fields). Keyboard: ↑↓ choose a letter, ←→ stretch (Shift ×5), Delete/Home reset, Esc deselect. Touch: handle hit 22 px, `touch-action: pan-y`. No `alert/confirm/prompt`; feedback by `toast` and the status line.
- Copy (Russian, «на вы», verbs first): «Сбросить растяжку», «Скопировать текст с ~», «Скачать PNG», «SVG», «Выровнять блок», «На одну букву», «Равномерно», «Ширина блока», «Текст блока».

- **Home rules (W83 H2, checked by `tests/e2e_home_v83.py`)**:
  - **Demo panel inset**: the app-window panel `.dm-hero` of every «Как это работает» demo sits `--dm-in` (16 stage px, token on `.dm`) from the card edge on top, right and bottom, in the one stage (720x340) at every scale. One token, no per-demo hero offsets. Satellite tiles (`.dm-sat`, chips, cursor) may overlap the panel's left side but stay fully inside the card at every frame of the loop.
  - **Section headings**: the left edge of a heading's text equals the left edge of its section content and first card (+-1 px). Heading -> content is one gap everywhere: the `.vsec` gap (10 px) under the `.vhead`; no extra `margin-top` on a section body (the slider `.dm-car` has none). A head that wraps on a phone (controls on a second row) is measured by its box.
  - **Right edges**: no card of Лаборатория / «Как это работает» / По стилю / Избранное may be cut by the column or the viewport. The only cut rows are the deliberate swipe rows with a fade (`.hs-fade`: popular fonts, the demo row on phones).
  - **One shared template (W85 H3)**: all six demos use the same stage structure (CSS block `shared template` in `ui_demos.css`): panel `.dm-hero` (104,16, 600x308), header `.dm-hh` (title ... corner control, left 130), rail `.dm-rail`, ONE left floating tile `.dm-lt` (20,88, 168x136, canvas surface; per demo: sample word, glyph, kerning pair + «Кернинг» value, downloads list, files list), content area x 130..580, y 62..288 (panel coords). The corner button with state labels is the shared `.dm-bt` (d4 «Скачать шрифт» -> NN% -> «Готово», d5 «Создать шрифт» -> «Готово»): labels stacked in one grid cell (width = longest label), one label visible at a time, done state = ink pill with check. Per demo only content and the animation script differ. `e2e_home_v83.py` asserts identical tile/panel rects (+-1 px) across the 6 demos, content inside the area, no compact marker, one label at a time, constant button width.
  - **Six demos**: d1 Ячейки, d2 Насыщенность, d3 Кернинг, d4 Экспорт, d5 «Собрать знак из знаков» (SVG chips fly into glyph cells, cell fills, sample word fills, «Собрать шрифт» -> «Готово»), d6 «Отрисовать свой шрифт» (pen draws three strokes on the guide grid, strokes thicken into a glyph, it flies into its cell and the sample word). New demos follow the same stage, tokens, poster frame and cursor choreography; `a` (aria-label) describes the story.
  - **Demo text size (W88)**: inside `.dm` the type tokens are enlarged for the stage (`--fs-xs/sm` 19, `--fs-md` 20, `--fs-base` 21, `--fs-lg` 24, `--fs-xl` 28, `--fs-2xl` 30 stage px; `--dm-h` 38), so every label / caption / tile text renders >= 8.5 px on the 390 px phone (scale .457; audited over the whole loop). The ONE template stays (no adaptive variants): panel `.dm-hero` unchanged, left tile `.dm-lt` is now 20,88 196x148, content starts at `--dm-top` = 66. d5 cells show the 4-digit code (no «U+», no «+»); d4 tray button reads «Убрать» (the tray is 196 px wide).
  - **Panel inner padding (corner controls)**: one token `--dm-pad` (20 stage px, on `.dm`). The panel header row (`.dm-hh`: title + corner control such as «Сбросить», «Очистить», «Собрать шрифт», «Готово») sits `--dm-pad` from the panel's top AND right edges, so a corner control has equal top and right insets. Header height = control height (`--dm-h`) and the row is `align-items:center`, so the title is vertically centred on the control. All 6 demos. Content below the header starts at or below `--dm-pad + --dm-h`; content right edges equal the control's right edge. Checked by `e2e_home_v83.py` (|top - right| <= 1 stage px, title centre = control centre +-1).
  - **Header -> content gap**: `--dm-hgap` (8 stage px) between the panel header row and the first content element; content starts at `--dm-top` = `--dm-pad` + `--dm-h` + `--dm-hgap` (62) in every demo. If space is short, shrink the content (canvas, cells), never the gap. Asserted in `e2e_home_v83.py`.

## 18. Font feature hints (W88)
- Data: ONE optional field `FONT_META[id].hint` (`ui_lib_u1.js`, one short Russian sentence, no trailing period needed). Fonts with a hint now: Кортес (swashes appear by themselves), Тяга (`~` stretches, tool «Блок»), Нить (line thickness slider), Сцепка (ligatures, link gap).
- UI (`ui_fhint.js`, CSS `.fhint` in `template.html`): a note `#fhint` (`role=note`) at the top of the editor sample pane `#specwrap`, above the sample canvas, so it is visible in the sample and with «Тестер» on. Neutral: `--panel` surface, `--text-2` text, `--fs-sm`, close button 28 px with `i-close` (never red). Appears with `fh-in` (`--dur-base`), closes with a fade (`--dur-fast`); reduced motion: instant.
- Memory: closing stores `fh:<fontId>` in the hint set (`HINT_KEY`, `hintMark`), so it is per font and survives reload; «Сбросить подсказки» (`TOUR.reset`) brings all back. Test: `tests/e2e_fhint.py`.
- To add a hint: add `hint:'...'` to the font's `FONT_META` entry. Nothing else.

## 19. Startup cost (W88)
- Heavy work is off the first-paint path: the home ribbon `hmHero` builds one font per idle task and only while the home tab is open (`hmResume` on return), fading in `#hm-bg.on`; `drawLibrary` / `podbDraw` draw font by font and yield after `DL_BUDGET` (24 ms) so a cold start spreads over tasks while a warm redraw (theme, resize) stays one pass; autokern of the start font runs after covers in two idle steps (any interaction or `ensureKern()` still computes it at once). Glyph cache `LIBG` limit 2500. Budget test `tests/e2e_perf.py`.

- Сегментный переключатель (.dm-seg и любой pill-switch): бегунок имеет равные отступы со всех сторон дорожки в обоих положениях; общие классы (.dm-th) не должны задавать ему высоту. Проверка: tests/e2e_demo_text.py (SEG).

## 20. Section «Сообщество» (W89 C)
- Layout (W90): `.cm` has NO max-width: it is the library container (left 92 px = rail + pads, right = viewport − `--pad`; checked at 1280/1650/1920 ±1 px, article and challenge pages too). Section gap AND heading→content gap are one token `--cm-gap` = `clamp(18px,2.2vw,28px)` (the library's `.libview` gap, measured 28 px ≥1273 px, 18 px at 390). Section headings are the library `.vhead` row (40 px, h2 20/700/−.02em): «Уроки» left, filters (`.seg`, same component as the library sort) right, wrapping below at phone width; other `.cm-sec>h2` mirror it. Grids (lessons, challenge cards, favourites) = library grid: `repeat(auto-fill,minmax(min(100%,300px),1fr))`, gap `--pad`, one column ≤720 px. The reading column stays a fixed 680 px (`--cm-col`) centred in the container, so header, text, quiz and CTAs share one left edge.
- Small pills (`.cm-chip`, `.cm-st`, `.cm-tag`, `.cm-kick`, `.cm-today`) use the library `.tag` metrics: 28 px high (8/12 padding, 12 px/600, `--paper` ground, `--muted` text); the former 24 px pill rule is withdrawn. Lesson card (plain flex column, grid-stretched to equal height per row): tags (time, topic, read-status tag) → title (2-line clamp) → description (3-line clamp), full text in `title` → footer (Читать, В избранное) pinned with `margin-top:auto`. The level «Для новичков» is said once, as a muted note next to the «Уроки» heading (the card tag is gone, so the tag row never wraps from 360 px cards). The read status is the LAST tag: a check-icon-only 28 px tag when read, «N %» when partly read, nothing when unread (the article page keeps the full «Не прочитано» pill). Slack above the footer in a shorter card is at most about 2 lines (tested); the tightest card in a row has ≤ 24 px. Like button (lesson cards, article, Избранное cards) = the library `.heart` component unchanged (40 px, 24 px outline/filled icon, accent when pressed, bottom-right 10 px of the card like font cards); aria-label «В избранное: …» / «Убрать из избранного: …», same storage. «Читать» = `btn pri sm` (the existing primary button, accent). No countdown anywhere (removed from banner and challenge page; the status chip «Идёт · осталось N дней» and the dates remain) and no «Пример от G-type» tag. Banner (W90 pass 3): 2 columns ≥ 1060 px, text `1fr` | cover `1fr`, column gap `--s8` (`--s6` ≤1199), padding `--s5`; text vertically centred, title at the left padding (container-query font size so it fills its column), buttons row «Открыть челлендж» (`btn pri lg`) + «Как участвовать» (`btn lg` with chevron); the cover is the same 2:1 `.cm-cv` as the cards (own `cover` image if set, else the example poster recomposed for the landscape frame by `posterDraw(…, wide)`: one or two lines, centred, margins) at the right padding. Below 1060 px stacked. «Как участвовать» is a floating popover (`.cm-howp`, absolute in the banner, `aria-expanded` / `aria-controls`, role group): opens below its button, flips above when it would leave the banner/viewport, shifts horizontally to stay inside both; fade + 4 px shift, 150 ms in / 100 ms out (popover tokens), fade only with reduced motion; closes on Esc and second click (focus back to the button) and on outside click; it never moves the layout.
- Covers: the first paint of a cover is verified once (not blank); a failed or empty frame is retried (glyph cache dropped); the «Б» contour cover always shows the faint full outline under the drawing ink; the «R» swash fits with margin. Cards are `var(--card)` with `--sh-1` and an inset hairline; no element may leave its card.
- Colour: covers neutral; accent only on primary buttons («Открыть челлендж» on the banner, «Попробовать в G-type», «Подготовить работу») and errors (user decision, W89 C4: the accent covers and banner were rejected as too bright, so the earlier W89 C2 exception is withdrawn). Cover ground is `--panel`, glyphs `--text`, labels are `--surface` pills with a `--line-strong` hairline; everything is a token, so both themes work. The banner (`.cm-ban`) and the challenge hero are `--card` surfaces.
- Landing (no tab switch): banner (current challenge, countdown, accent «Открыть челлендж», poster example (fixed 4:5 slot)) → «Уроки» (filters Все / Избранное / Не прочитано + grid) → «Скоро» → «Идут сейчас» → «Завершённые». Article and challenge pages replace it; Back returns to the same scroll position. Content edges equal the library and Избранное.
- Covers show the concept: lines with labels (базовая линия, высота строчных, высота прописных, выносные, овал свисает за линии), thin vs black stem with measured «штрих N», «ТА» with the gap highlighted and «кернинг −N», serif circled «засечка», variable axes with live wght/slnt sliders, contour nodes «узел» and handles «ручка». All numbers come from the real font parameters. Labels are 12 px pills kept 4 px inside the canvas; `tests/e2e_comm.py` checks every frame of every loop at four sizes.
- Covers and demos live on the specimen canvas (`--canvas`, glyph `--glyph`) in both themes; the poster example uses the fixed share-dialog palettes.
- Cover frame: ONE ratio, 2:1 (`.cm-cv{aspect-ratio:2/1}`) on lesson cards, challenge cards and any article header; the canvas renders into the box at devicePixelRatio (max 2) with the backing store forced to exactly 2:1, so nothing is ever stretched. The banner/hero poster slot keeps its own fixed 4:5 ratio (`.cm-pv`, never height-capped). Own cover images: an optional `cover` field on a lesson or challenge entry (URL or data URI, plus `coverAlt`) renders `<img>` (`object-fit:cover`, `loading=lazy`) in the same 2:1 frame instead of the animated cover; the animation key is `anim`. Export size 1600×800 px (2:1), keep the important content inside a safe area with 64 px margins on every side (the card crops nothing at 2:1, but small screens show the image at about 330 px wide).
- «Как участвовать» popover (`.cm-howp`, `--sh-3`): opens DOWNWARD by default, anchored to the trigger's bottom-left with an 8 px offset, as a floating overlay it may extend below the banner card; flips up only when there is no room below in the viewport; shifted to keep a 16 px viewport margin; never covers the banner title or lead (asserted by `comm_pop`).
- Pass 4: below 1060 px «Как участвовать» is NOT a popover but an inline disclosure inside the banner card (`.cm-howp` as grid rows 0fr→1fr, `--dur-base`/`--ease-out`, instant under reduced motion, panel `--panel` with the card content edges as insets, pushes the cover down; the two banner buttons share one row when they fit, else both full width, gap `--s3`). Phone seg filter (`.cm-bar-f`, ≤720 px) spans the grid edges, segments justified, thumb inset equal on all sides (3 px). Challenge «Сроки»: the «Сегодня» marker is the `.cm-st.run` tag in the card header row (baseline with the title), card padding `--s4` on all sides. Hero poster has no grey panel: it fills a 320 px column (full width on phones). All `.cm-box` cards share `--s5` (`--s4` ≤720), heading→content gap and list spacing `--s3` (asserted by `comm_space`).
- Glossary terms: `.cm-term` with a dotted underline; one `#cm-pop` popover on body (hover, focus, tap; Esc and scroll close; clamped to the viewport). No native `title`.
- Motion: view change 8 px rise with `MO.D('base')` / `MO.E('out')`; one rAF loop for all canvases, paused when off-screen, hidden or under reduced motion.
- Storage: `gtype-comm-v1` (state, read, progress, favourites, quiz, per-challenge progress), `gtype-comm-works-v1` (own poster thumbnails); all in try/catch.
- Review (W89 R): banner and challenge hero are ordinary cards (`--r-lg`, `--sh-1`); all small pills are 24 px high; copy follows §10 (no antithesis flourishes, at most one em dash per paragraph); canvas palettes are read once per frame (`memo`), dead CSS/JS removed.
- Design review rules (W91, asserted by `comm_system`): (1) every small pill is 28 px / 12 px / 600 (the status pill too, also inside the timeline); (2) radii only from `--r-*`; a nested surface uses the token nearest to outer radius minus padding (demo canvas 12 inside the 22 card with 12 padding, work thumbnail 8 inside a 16 card with 8 padding); (3) challenge hero buttons are `.btn.lg` exactly like the banner buttons; row buttons inside tool cards are `.btn.sm`, never wrapped pills, multi-line links use `.cm-lk` rows (`--r-sm`); (4) on phones every `.btn.sm` inside the section is `--h-md` (44 px) so touch targets are >= 40 px; (5) all sibling cards of a kind share padding, and `.cm-tool` pads like `.cm-box` (`--s5`, `--s4` on phones) so headings share one left edge; (6) grids never leave an orphan: «Как поможет G-type» is 4 / 2 / 1 columns and the checklist card spans the full row in two columns; (7) an empty state inside a card fills the card (icon, title, text, CTA inside), no dead area; (8) the heart keeps the library position (10 px from the corner) and is centred on the footer button row: on phones the card bottom padding is `10px + --s5 - --h-md/2` (8 px) for the 44 px button; favourites cards pin the footer like lesson cards; (9) a wrong quiz answer is `--danger` with a × icon, a right one `--ok` with a check (never colour alone); (10) `.pane-h` focus ring stays inset (`outline-offset:-2px`) because `.pane` clips an outer ring; (11) 721-1060 px the challenge hero keeps text and poster side by side (240 px poster), one column only on phones; (12) no `!important` in `ui_comm.css`.
- Demo canvases (W91, asserted by `comm_demos`): every inline article demo keeps all its ink (glyphs, guide lines, labels, frames) at least 2 px (built with 8 px) away from every canvas edge, in every loop frame (poster too), every slider at min / mid / max and every chip / segment / switch state, at 360-1920 px. Fit a drawing to the UNION of every variant it can show (`inkUni`: raw + shaped run, all tilde counts, letter + word with descender), never to one of them. A magnifier is a lens inside the canvas, not a zoom of the whole picture: the glyphs stay whole and the slider magnifies only the lens («Увеличение» label = lens magnification, drawn from the rounded slider value). `label()` cuts text with an ellipsis instead of leaving the canvas. Guide/accent ink on the always-light specimen canvas uses `--glyph` (not `--ink`, which turns white in dark theme and made guide lines invisible). A demo may set `dhp` (phone canvas height) when its layout stacks. The rAF clock never goes below 0 (a hair-older timestamp gave an undefined font/word index and a blank frame).
- Reading progress (W92, asserted by `comm_progress`): a lesson card has NO «N %» tag. A partly read lesson (0 < p < 100 %, not marked read) shows a 3 px bar flush with the bottom edge of the 2:1 cover (`.cm-rp` inside `.cm-cv`, absolute, above the canvas and above an own `cover` image), square ends clipped by the cover / card radius, track = `--ink` at 18 % alpha, fill = `--ink` (neutral; never the accent), width = p %. `role="progressbar"` + `aria-valuenow` + a visually hidden «Прочитано N %». A read lesson keeps the check-icon «Прочитано» tag and no bar; an unread one has neither. The same bar on the «Избранное» article card (`.cmf-card`, no cover: the card clips it with `overflow:hidden`, bar on the card bottom edge), where a read article shows the same check tag. Both themes; the article header still shows its own «Прочитано N %» pill (`.cm-pb`).
- Loading (W92, asserted by `comm_lazy`): lesson/challenge texts and the section code are a separate compressed block `#zm` of index.html that is NOT inflated or parsed at start; `ui_comm_boot.js` (in the UI bundle) wraps `setTab`, the «Избранное» render and the font/param hooks and runs `__zrun('zm')` on first use (tab, `#community` deep link, article/challenge restored after reload, Back/Forward onto a community entry, favourites with articles, first font change while a challenge is active). Until then `COMM.built()` is false and `CM_DATA` is undefined.

## 21. «Сохранение процесса» и «Черновики» (W93)

- **What**: leaving the editor, draw or import mode with unsaved work asks «Сохранить процесс?». Drafts live in Профиль → «Черновики». All code is `ui_drafts.js`, all CSS is the `/* == DRAFTS W93 == */` block, every class, id and data attribute is namespaced `dd-` (`#dd-sect`, `.dd-card`, `#dd-rec`, `#dd-undo`, `[data-dd=…]`). `#dr-*` is taken by draw.
- **Leave dialog**: built from `PF.modal` (centred card at 1440, bottom sheet at 390, buttons stack: Сохранить, Не сохранять, Отмена). Primary = accent; «Не сохранять» is neutral outline (the accent stays on the one primary and on errors); name field prefilled «<font> · <mode>»; checkbox «Больше не спрашивать» stores the choice. The inline error `#dd-err` (cap 30, quota) keeps the dialog open and the work intact. Focus trap and Esc (= Отмена) come from `PF.modal`. No dialog when the form hash equals the entry hash.
- **Preference** `gtype-drafts-pref-v1` = ask | save | discard, changed in Черновики (segmented control «При выходе из режима»).
- **Guards**: UI clicks (rail tabs, logo, profile, Back), `popstate`, import Esc. Programmatic `setTab` is never blocked (legacy tests rely on it). A fresh entry from home or the library starts clean; a plain reload restores (`sessionStorage` `gtype-dsess-v1`). Ready/exported fonts and resumed drafts are `keep`.
- **Recovery**: `pagehide`/`visibilitychange:hidden` writes a mark (`gtype-drafts-mark-v1`); a new session offers once a non-blocking note `#dd-rec` «Есть несохранённый процесс от <дата>»: Восстановить · Сохранить в черновики · Удалить. Notes use `toastPlace` (no overlap with toasts, hidden under a modal, `z-index` 120). Ignored leftovers become an `auto` draft; a failed put never drops the work.
- **Storage**: IndexedDB `gtype-drafts-v1` (fallback localStorage, then memory). Schema `SCHEMA=1`, record `{id,v,mode,name,font,ts,data}`; restore validates and clamps (`projSanitize`), unknown version or missing font gives a friendly message and the draft stays. Cap `MAXD=30` (auto drafts count). Drafts are not favourites and not in the backup file.
- **Cards**: live preview (`libRun` with a slot override), name, mode pill (Редактор / Отрисовка / Импорт), date, «Продолжить», rename (inline), delete with undo toast. Empty state is the standard empty card. Sorted by newest.
- **Motion**: only `--dur-*` / `--ease-*`, opacity+transform, reduced motion disables it; list changes use `MO.flipList`.
- **Test lane**: `tests/e2e_drafts.py` (7 checks: flow, modes, prefs, recovery, manage, validate, geom), in `E2E` and the lean release.

## 22. Плашки и вложенные кнопки (W94)

User correction (4 annotated screens). Reference: the home search (`.srch`: pill, «Найти» inside with equal inset top / right / bottom, concentric radius) and the editor chips («N знаков требуют внимания»).
- **Pill for single-row bars** (`--r-pill`): any narrow, single-line plaque or bar that holds a button, chip, tag or X: editor top bar, recovery banner `.dd-rec`, notes `.drn`, toast, font hint `.fhint`, proof filter `.pfilt`, search, status plaque, seg tracks. Not a rounded rectangle (`--r-sm/--r-md`).
- **Concentric radius**: inner radius = outer radius − inset. For a pill bar the control is a pill as well (`--r-pill`); for a wrapped bar the radius is `control height / 2 + inset` (top bar on phones) or `--r-wrap` (22).
- **Equal inset = the bar's vertical padding**: token `--bar-in` (= `--s2`, 8 px; `.fhint` 4 px, phone top bar 4 px at <= 560). The nested control touches top, right and bottom with the same distance (<= 1 px difference); the left text inset is larger (`--s4`/`--s5`). Controls in a bar are one height (`--h-lg`, or `--h-md` in `.drn`), so the bar height = control + 2 × `--bar-in`.
- **Wrap fallback**: if the text wraps to 2+ lines the bar becomes a card: `.is-wrap` (set by `plFit(el, textSel)` in `ui_shell.js`: text taller than 1.5 lines; run on show and resize) switches to `--r-wrap`, actions go under the text, the X stays in the corner with equal inset 12 px. Phones: toast `--r-xl`; `.fhint` / `.pfilt` / `.drn` use `.is-wrap`.
- **Notched corner X (phone banner)**: `.dd-rec` at <= 720 px is a card (`.notchc`) with the X in `.notch > .nb`, the very construction of the Лаборатория cards (`--nn 56`, `--nr 18`, `--nb 40`); neutral ink ring, no accent; two buttons full width, stacked. At > 720 the notch is hidden and `.dd-rec-x` (round `.ibtn`) sits inside the pill.
- **Left as cards on purpose**: multi-line content (export menu `#ex-list`, `.xm-st`, `.st-pop`, community banner / hero / cards, draft cards, dialogs, section cards, `.cm-box`, quiz). Seg tracks and `.cm-chip` / `.cm-st` / `.tag` were already pills.
- **Article header** (`ui_comm.js` `chips(a,0,end)`): the heart and the «Прочитано» chip are the last item of the tag row (`.cm-chend`, `margin-left:auto`); when the tags wrap they stay right on the row they end on.
- **Test**: `tests/e2e_pills.py` lane `pills_geom` (1440 / 390, light / dark): single row → radius >= h/2 − 1 and insets within 1 px; wrapped → radius >= 16; nothing past the viewport.
- Do: new bar = pill + `--bar-in` + controls of one height. Don't: a rounded rectangle for one line of text, or a button with its own margin instead of the bar padding.

## 23. Тепловая карта (W96 H)

Где глаз спотыкается, там горячо. Показывает, как шрифт читается: пятно, апрош, ритм, межсловный пробел. Код `ui_heat.js` (всё в IIFE, наружу `window.HEAT`), CSS блок `HEAT W96` в `ui_heat.css` (вставляется в `template.html` на `/*HEAT_CSS*/`), тесты `tests/e2e_heat.py`.
- **Два места**: (1) «Образец» в редакторе: чип «Тепловая карта» стоит сразу после «Контекст», включает карту на обеих строках образца (прямая и курсив), следует за ползунком размера и за правкой текста (пересчёт через 110 мс после последней перерисовки, не во время перетаскивания, не при скрытой карте). Под чипами появляется `.heatbar`: слои + легенда. (2) «Проверка»: блок-панель `#heat-pf` («Тепловая карта», `.pane`, ключ `pf-heat`, по умолчанию открыта) перед «Знаки»: тестовый текст RU + EN + контрольные строки (нннонно, HHOHHOO, Illinois, шиншилла) с картой, переключатель «Прямое / Курсив», отчёт.
- **Слои** (`.seg`, pill с равным вложением 3 px): «Чтение» (всё вместе, по умолчанию), «Пятно» (знак темнее или светлее медианы своего класса), «Пробелы» (апрош пар + пробел между словами), «Ритм» (интервалы между вертикальными штрихами). Выбор слоя запоминается (`gtype-heat-v1`, try/catch).
- **Что считается** (по контурам знаков, не по картинке; `scanGlyph` даёт края краски по 48 строкам от базовой до высоты прописных; профили кешируются по объекту знака):
  - апрош пары: белое между правым краем левого знака и левым краем правого, строки полосы x-height (обе строчные, строчная + прописная) или высоты прописных (обе прописные или цифры); белое по строке ограничено глубиной `D = 1,6 × апрош прямой пары` (метод площади, открытые стороны т г у не засчитываются целиком); кернинг входит в расстояние. Сравнение с медианой контрольных пар шрифта (HH HO OO, nn no oo, кириллица тем же набором) → `dev = площадь / медиана − 1`. Если даже самое близкое место шире 1,2 апроша, `dev = max(dev, 0,9 × (мин/апрош − 1))` (белое одинаково велико по всей высоте, глубина его не обрезает). Касание (мин ≤ max(2 u, 12 % апроша)) → не меньше 0,78. Дыра рядом со знаком препинания — норма, не считается.
  - пятно: толщина штриха (медиана ширин почти вертикальных прогонов краски в средних 60 %; диагонали не считаются) и плотность (площадь краски / (ширина знака × высота полосы)) против медиан класса (строчные, прописные, цифры) по контрольному набору. `dev = 0,8 × штрих + 0,2 × плотность`; у знаков без вертикальных стенок только плотность × 0,4.
  - ритм: белое между последним штрихом левого знака и первым штрихом правого (оба у края знака) против медианы окна из 4+4 соседних промежутков; сбой, если отклонение ≥ 35 % и ≥ 70 u.
  - слова: белое между словами в x-height против апроша и против em: слипаются при < 2 апрошей или < 0,17 em; разваливаются при > 0,45 em (и при > 5 апрошей, если пробел шире 0,38 em).
  - степень 0…1: апрош слипание `(−dev − 0,25)/0,40`, дыра `(dev − 0,40)/0,50`, пятно `(|dev| − 0,20)/0,30`, ритм `(|dev| − 0,35)/0,45`.
  - «сторона знака»: одна сторона знака у двух и более разных соседей отклонилась в одну сторону (≥ 20 %, ≥ 60 % соседей) → запись про знак («о» справа), а не про каждую пару; для неё «Исправить поле».
  - «Ровность чтения» 0–100: `100 − 42·ср.апрош − 18·ср.пятно − 10·ср.пробел − 8·ритм − Σ 9·степень^1,5` по заметным местам (до 14; ритм и пробел вполовину).
- **Цвет, исключение для данных**: две шкалы по направлению сбоя, интенсивность = степень. Синяя (`--cv-heat-0…1`, светлый → насыщенный синий): просвет, дыра в паре, знак светлее нормы, пробел между словами шире нормы. Тёплая (`--cv-heat-2…4`: жёлтый, оранжевый, красный): слипание, касание, знак темнее нормы, узкий интервал. Ровный текст остаётся чистым: фона под строкой нет, цвет только на местах сбоя (капли, прозрачность не выше 0,70, ниже порога 0,06 не рисуется), за последним знаком строки цвета нет. Токены `--cv-heat-*` на светлом листе образца (одинаковы в обеих темах), `--heat-*` на поверхностях интерфейса (легенда, точки отчёта; в тёмной теме светлее). Красный `#E2392F` не равен акценту `#FC473C`. Цвет не единственный носитель: у каждого места есть подсказка словами.
- **Задумано рисунком шрифта** (`INTENT` в `ui_heat.js`, ключ = id шрифта библиотеки): у части шрифтов неровность часть замысла (модульная сетка, лезвия, капли, прыжок знаков, связи, письмо пером). Для таких шрифтов указанные виды мест (`pair`, `tone`, `word`, `rhy`, или `all`) не входят в оценку, не попадают в «Слабые места», на карте рисуются в 0,14 силы, подсказка говорит «неровность задумана рисунком шрифта», «Исправить» не предлагается. Отчёт показывает строку «Неровность задумана рисунком шрифта» с перечнем; если задумано всё (`all`), оценка не ставится («—»). Свои шрифты и обычные шрифты не затрагиваются. Список: modul, ryvok, tyaga, kaplya, pixel, applik, stsepka, kortes, stolb, propis.
- **Легенда** (W96-R): без фона и без пояснения «ровное без цвета»: две метки в строку, синяя полоска «просвет, светлее», тёплая «тесно, темнее»; высота `--h-md` (как дорожка слоёв), на телефоне переносится по словам. Строки-пояснения под слоями нет (текст слоя лежит в `title` кнопки).
- **Подсказка и карточка** (`.heat-tip`, `--sh-3`, `--r-md`): наведение показывает текст («ТА: просвет на 38 % больше среднего: пара разваливается»); щелчок или касание закрепляет карточку с кнопками `.btn.sm`: пара → «Исправить кернинг» (значение подбирается так, чтобы площадь белого стала равна медиане; один шаг отмены) и «Открыть в кернинге» (вкладка «Кернинг» с этой парой); сторона знака → «Исправить поле» (правка полей знака) и «Открыть знак»; пятно → «Открыть знак». Закрывается Esc, щелчком в сторону, прокруткой. На телефоне карточка внизу экрана. Щелчок по зазору с картой не открывает панель кернинга образца.
- **Отчёт** («Проверка», W96-R): число «из 100» + вердикт одной короткой строкой, без шкалы (шкала повторяла число). «В порядке»: одна карточка со строками «название — значение» (Апроши, Пятно, Пробел между словами, Ритм штрихов; 2–4 строки). «Сбои» (до 5): точка цвета степени, заголовок («СК», «о» справа), одна короткая фраза («апрош на 35 % меньше среднего, тесно.»), «×N» только у пар с повторами; метки вида нет; «Показать» рисует кольцо `.heat-ring` и прокручивает к месту, «Исправить» для пары и поля знака, иначе «Открыть знак». Для задуманной неровности одна строка «Неровность задумана рисунком. Не считаются: …».
- **Производительность**: образец 60 px (обе строки) считается за 10–30 мс (бюджет 60), блок «Проверки» около 60 мс на 380 знаков; ничего не считается, пока карта скрыта, панель закрыта или вкладка не активна; пересчёт откладывается и не идёт во время перетаскивания ползунков. Профили знаков кешируются в `WeakMap` по объекту знака (правка знака = новый объект = новый профиль).
- **Do**: новый слой = запись в `LAYERS` / `LW` (вес вида места) и функция оценки; новый вид места = `items.push({t,...})` с `sev` 0…1 и прямоугольником `x0 x1 y0 y1` в px холста. **Don't**: красить карту акцентом, добавлять тёмный фон под текст, показывать только цвет без слов, считать на скрытой карте.

## 24. «Подложка» (W96-U)

- **What**: a pale reference under the glyph canvas (editor and draw mode, incl. «Ячейки»): a library font (same character as the current glyph, UPM scale, centred in the glyph width, roman / italic, horizontal offset) or the user's own image (PNG / JPG / WebP / SVG, file or drop on the canvas; move / scale / rotate with canvas handles or the X / Y / Масштаб % / Поворот ° fields; «Закрепить»; per glyph by default, «Для всех знаков» = sheet). Never traced, never exported, never in history, metrics or QA: it is painted on the canvas only (hooks `GT_UNDER.ed` / `GT_UNDER.dr`).
- **Code**: all in `ui_under.js` (classes / ids `un-*`, CSS injected by the file as `<style id="un-css">`, icon `--i-under`). Button «Подложка (Alt+U)»: editor `.tbtn#un-btn` before the zoom group, draw `.dr-ib#un-dbtn` in the top-right pill. Pressed state = ink fill (`.un-on` / `.on`).
- **Panel** `.un-p` (W96-R): popover docked to the right edge of the canvas (glyph stays visible), bottom sheet at <= 560 px. Source seg (Шрифт / Изображение / Выкл), select pill (no caption: the select names itself), seg tracks and number pills with the standard equal inset, opacity 10–60 % (default 25), «Под контуром / Поверх». No status line unless it says something (no glyph, glyph missing in that font, how to move the picture, no picture for this glyph); no «Alt+U» label (it is in the button title); «Убрать картинку» only when a picture exists (in font mode «Выкл» does the job). Image tab: «Загрузить», «Закрепить» (neutral `.btn`, NOT primary: it is a toggle, the accent stays for the screen's real primary action and errors), «Для всех знаков»; the four number fields (X / Y / Масштаб / Поворот) are always visible on desktop and folded behind «Числами» on phones. Neutral slider thumb and focus ring. No scrollbar, no alert: errors are an inline line. Esc closes (focus inside the panel), closes on tab change. Opens with opacity + 6 px rise, `--dur-fast` / `--ease-out` read from the tokens; closing is instant.
- **Tint**: ink colour chosen from the canvas luminance (dark ink on light sheet, light ink on dark sheet); images are converted to an alpha mask (paper transparent) so a photo reads on both.
- **Storage**: `gtype-under-v1` (settings), `gtype-under-tf-v1` (positions), IndexedDB `gtype-under-v1/img` (JPEG <= 1600 px, <= 600 KB, max 40 images); memory only with a toast when storage is unavailable.
- **Test**: `tests/e2e_under.py` (lane `under`).

## 25. Export menu and dialog (W96-R)

- **Menu `#ex-list`**: items grouped by hairline separators `.xsep` (no captions): [Шрифт .ttf, Шрифт .otf] · [Для сайта .woff2, Старые браузеры .woff] · [Семейство .zip, Вариативный .zip] · [Образец .png, Поделиться шрифтом…]. The first item is bold on `--surface-3` (never `--accent-soft`: the accent is for the primary button and errors).
- **Variable font = ONE zip** `<Имя>-VF.zip`: `-VF.ttf` (+ `-VF-Italic.ttf`) in the root, `woff2/-VF.woff2` (+ Italic) in a folder, as in the family zip. Never several loose downloads for one choice. Dialog size estimate = the zip.
- **Dialog `#xpv`**: format chips are short names (TTF, OTF, WOFF2, WOFF, Семейство, Вариативный, PNG) and wrap at 390 (no sideways scrolling strip, nothing clipped); the one-line hint under them carries the meaning («Для сайтов, самый лёгкий»).
- **Toast placement** (`toastPlace`, ui_a.js): also keeps clear of the open underlay panel `.un-p` and a pinned heat card `.heat-tip.pin`.
