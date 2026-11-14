# Font metadata (library, covers, tags, hover card)

Everything the library UI shows about a font comes from one place: `FONT_META` and
`fmeta(id)` in `ui_lib_u1.js`. Cards, list rows, the popular row, favourites, mini
cards, search and the hover preview all read `fmeta(id)`; nothing else keeps its
own copy of a name, year, description or tag.

## Schema

`FONT_META[id]` is the only hand-written record. Add one entry per registered font.

| field    | type       | required | meaning |
|----------|------------|----------|---------|
| `year`   | number     | yes      | year printed on the cover and in the hover card (`2026`, `1204`, ...) |
| `desc`   | string     | yes      | 1-2 sentences of Russian text in proper terms for the hover card |
| `tags`   | string[]   | yes      | ids from `LIB_TAGS` (at least one) |
| `sample` | string     | no       | first line of the hover demo; the generic samples follow it |

`fmeta(id)` returns the normalised record used by the UI. Everything except the four
fields above is derived from the font itself, so it cannot go stale:

| field      | source |
|------------|--------|
| `id`       | the key |
| `name`     | `FONTS[id].name` (the user font takes the family name the user typed) |
| `cover`    | `name + ' ' + year`, the text drawn on every cover; no year: the name alone |
| `charset`  | `'basic'` when `FONTS[id].charset==='basic'`, otherwise `'ext'` |
| `glyphs`   | `FONTS[id].CHARSET.length` |
| `styles`   | `['regular','italic']` filtered by `FONTS[id].DEFAULTS` |
| `weights`  | `['Light','Regular','Bold','Black']` (`FAM_W` in `core_w.js`) for every font with family weights; empty for the user font `imp` |
| `tags`     | `FONT_META[id].tags`, unknown ids dropped, sorted by group then by position in `LIB_TAGS` |
| `desc`     | `FONT_META.desc`, falling back to `FONTS[id].desc`, then `FONTS[id].tag` |

Fallbacks keep the UI alive for a font without an entry (no year on the cover, no tags,
no weight strip when `FAM_W` is absent), but `tests/e2e_shell.py` (`meta_check`) fails
until the entry exists and is complete.

The user font (`imp`) has year = the current year and cover text = its own name + that
year, so it looks the same as the built-in fonts.

## Covers

Cover text is `fmeta(id).cover`. `drawLibrary` (`ui_a.js`) draws it for every
`canvas.lcv` that has no `data-txt` (cards, list rows, popular row, favourites, mini
cards). The size is set by cap-height, not by string width:

* cap height in px = `min(canvasHeight * COVER_H, (canvasWidth - 2 * pad) / COVER_K)`;
* `COVER_K` is the widest `width / cap` ratio of any cover string (Ryvok, 12.7) rounded
  up, so every font gets the same cap height in a given canvas;
* the baseline is the same for every font: the cap box is centred vertically;
* the cap height of a font is measured from its glyph "Н" (`libRun` in `ui_a.js`);
* a string that is still too wide (a very long user font name) shrinks to fit; this is
  the only case where sizes differ.

Fonts without lowercase letters (Modul, Ryvok) fall back to the upper-case glyph.

## Tags

`LIB_TAGS` is the single vocabulary: `[id, label, tileFont, searchWords, facet]`. Labels follow ParaType
terminology (`../kb/PARATYPE_KB.md`, section 1).

* `id` is stable and is what `FONT_META.tags` stores. Rename labels freely, never ids.
* Facets: `class` (Гротески, Новые гротески, Геометрические, Рукописные, Готические, Древнерусские, Унциальные),
  `tool` (Ширококонечное перо, Остроконечное перо, Связные, Ротунда, Устав, Модульные), `prop` (Узкие, Нормальные,
  Широкие), `contrast` (Неконтрастные), `purpose` (Текстовые, Акцидентные), `charset` (Базовый набор, Кириллица + латиница),
  `feature` (Вариативный). Cards and list rows show up to three tags of the first five facets; the hover card shows all.
* `TAG_PARENT` makes a sub-group part of its group for filtering (`ngrot`, `geo` -> `grot`; `rot` -> `gothic`;
  `ustav` -> `old`), so the tile "Гротески" also finds the new and geometric grotesques.
* `TILE_TAGS` lists the main groups that get a tile above the library list; detail tags are reached from cards,
  the hover card and search suggestions.
* `searchWords` are extra search words (synonyms).
* "Шрифт пера" is not a category: use a group tag (e.g. Рукописные) plus the tool tag (`wpen` / `ppen`).
  "Вязь" is a different script (ligatured ornament) and must not be used for Устав.

Search (`libMatch`) matches tag labels, synonyms, the name, family, description and year,
by word prefix with light morphology: a word of 5+ letters also matches with one or two
trailing letters removed (min stem 4), so `рукопис` finds `рукописный`, `пером` finds
`перо`. `libSuggest` offers up to five tags for the last word typed; Enter applies the
first one. Active tags live in `LQ.tags` (AND) and are shown as removable chips inside
the search field. Backspace in an empty field removes the last chip.

Clicking a tag on a card, a list row or in the hover card calls `libTagGo(id)`: the
library opens filtered by that tag and the font is not opened.

Строка (`stroka`, 2026): `['ngrot','normal','text','cl','vf']`; тег `text` («Текстовые», plain purpose facet) добавлен вместе с ней.

Ренесса (`renessa`, 1495): `['serif','renais','wpen','text','cl','vf']`; теги `serif` («Антиква») и `renais` («Ренессанс») — class-грани, добавлены вместе с ней (на плитки не вынесены).

## Hover card

`#hcard`, built once by `hcBuild()`, filled by `hcFill(id)`. Opens 700 ms after the
pointer enters a card (cancelled when it leaves earlier), immediately on keyboard focus,
or on a 550 ms long press on touch screens. It stays open while the pointer is on the
card or on the preview, and closes on leave (220 ms grace), Esc, scroll, resize, outside
press and view change. It is placed to the right of the card, flips to the left, then
below or above, and is always clamped into the viewport.

Content: name and year, description, tags, a live sample (cycles between the Russian
pangram, the English pangram and digits; typing in the field replaces it), a
Light/Regular/Bold/Black strip when `fmeta(id).weights` is not empty, glyph count,
charset and styles, the buttons "Открыть в редакторе" and the favourite heart.

## Adding a font

1. Register the font in `FONTS` as before.
2. Add `FONT_META[id] = {year, desc, tags}` in `ui_lib_u1.js` (plus `LIB_POP` / `LIB_NEW`
   if it should rank in those sorts).
3. Run `python3 tests/e2e_shell.py`; `meta_check` lists what is missing.

Нить (`nit`, 2026): `['hand','narrow','nocon','disp','basic','cl']`; в подборке «Рукописные и каллиграфия»; без тега `exp` (правила топологии не ослаблены), без `vf` (статичный шрифт).
Тяга (`tyaga`, 2026): `['geo','nocon','disp','exp','basic','cl']`; в подборке «Экспериментальные»; без `vf` (статичный шрифт, растяжка делается GSUB-лигатурами `буква~…`, а не осью).
Кортес (`kortes`, 2026): `['serif','disp','exp','basic','cl']`; в подборке «Экспериментальные»; без `vf` (статичный шрифт, росчерки R и Я делает GSUB calt/ss01).
