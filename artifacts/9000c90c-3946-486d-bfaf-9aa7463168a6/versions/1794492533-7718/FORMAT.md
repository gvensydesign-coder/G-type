# Мастерская почеркушек — формат и обмен

Окно: редактор (кисти, листы, слои по цветам) → 3D-превью → смешение → обмен.
Исходники: `/mnt/project-files/scribble-studio/` (index.html, src/*.js, data/seed.json).

## Как Claude читает работу Michael
Данные лежат в db окна (ArtifactData):
| Коллекция | Документ | Что |
|---|---|---|
| `sheets` | `<id>` | лист: `{id, cls, role, name, ord, off, src, layers:[{id, name, color, o, mode, vis, strokes:[…]}]}` |
| `params` | `<класс>` | `{cls, p: {роль: {настройка: значение}}}` |
| `notes` | `<id>` | замечание: `{id, t, status: open/done, text, reply, where: sheet/preview/blend/general, …место}`. Отвечаю полем `reply` (update). |
| `handoff` | `<id>` | записка «Передать Claude»: `{text, t, sheets, byClass, openNotes, current}` |
| `blend` | `<A__B>` | смешение пары: `{mask: dataURL 256 px, seam: [штрихи шва в координатах участка 0..1]}` |

## Штрих
`{pts: [x, y, …] 0..1, pr: [нажим 0..1], w: толщина (доля листа), b: кисть, sd: зерно, c?: свой цвет, m?: наложение}`
Кисть `b`: `t` тип, `o` прозрачность, `pr` влияние нажима, `tp` сужение, `an` угол, `hd` резкость, `gr` зерно бумаги, `jt` дрожь, `fl` поток, `bl` растекание, `sc` масштаб узора.
Типы: water (акварель), ink, pen, nib, gouache, marker, chisel, felt (фломастер), pencil, charcoal (уголь), dry, brush, spray, speck, scratch, hatch, tuft, shard, flat, eraser.
Старые штрихи hand-library (`{pts, pr, w, b:{t,o,pr,tp,an}}`) и маски (`{val, a, w, pts}`) читаются как есть.

## Классы и роли
Классы: metal, wood, stone, earth, grass, hay, cloth, water, sky, light, fire, smoke, other.
Роли (ряд атласа): 0 shadow, 1 light, 2 aura, 3 glint, 4 mask, 5 fill, 6 edge.
Настройки ролей shadow/light/aura/glint/mask — те же, что в прошлой мастерской знаков (handmarks.js): dens, size (см), rot, str, thick; aura: off, dens, w, bright, rep, thick; mask: amp, size, soft, blur.

## Атлас класса (для игры)
1024 × 1792 px: 4 столбца (первые 4 включённых листа роли) × 7 рядов (роли), клетка 256. Слои запечены цветом с альфой; маска — серый фон 0.5, белое отодвигает тень, чёрное притягивает.
Шейдер (src/scribmat.js): проекция по главной оси нормали, клетки размером `size` см, плотность `dens`, поворот `rot`; тень/свет решает N·L + маска; аура — лента за силуэтом с `rep` повторами; всё дрожит шагами 8 к/с.

## Путь в Godot (только после одобрения Michael)
Атлас → `data/pnt/hand/<класс>_atlas.png`, настройки → `data/pnt/hand/params.json` (поля kinds[].S/L/A/M, как сейчас) — расширить PntStyle на роли fill/edge и новые классы. Перенос шейдера: функции `marks()`/`proj()` из scribmat.js в pnt_light.gdshaderinc.

## 3D-штрихи (3D-превью → «✎ Рисовать в 3D»)
db `paint3d/<id>`, экспорт «Скачать JSON» (`format: skazanie-paint3d`):
- `scene` — сцена превью (`one_<класс>`, `all`, `ref_entrance`, `ref_night`);
- `pts` — точки ленты xyz, м; `ns` — нормали плоскости рисования; `pr` — нажим; `w` — ширина ленты, м;
- `face`: `camera` — лента всегда к камере (линия), `ribbon` — лист в плоскости рисования;
- `b` — кисть мастерской, `c` — цвет, `sd` — зерно;
- `live`: `boil` (кипение 8 к/с), `sway` (колыхание, начало закреплено), `react` (расступается у курсора/героя), `grow` (прорисовка заново).
В Godot: ImmediateMesh/ArrayMesh-лента по `pts`, текстура — штрих кистью вдоль полосы (тот же рендер, что в окне), вершинный шейдер повторяет `live` (src/paint3d.js, VS).

## 3D-редактор (вкладка «3D-редактор»)
Та же структура, что у Редактора: класс → роль → лист → слои по цветам, но штрихи 3D (формат как у 3D-штрихов выше: `id, pts xyz, ns, pr, w (м), b, sd, face, live`).
Отдельная библиотека: db `sheets3d/<id>`, `params3d/<класс>`; экспорт «3D-библиотека (.json)» во вкладке «Обмен с игрой».
Координаты — метры вокруг предмета класса (он стоит в начале координат), чтобы в Godot штрихи вешались на объект класса.
