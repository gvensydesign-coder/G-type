Набор из 47 линейных иконок на сетке 24×24: штрих 2px, круглые окончания и соединения, `currentColor`, безопасное поле 2px.

```js
Buddy.icon('flame', { size: 24 })                    // inline SVG, цвет от родителя
Buddy.icon('home', { size: 24, active: true })       // с лёгкой заливкой 16%
```

**Где лежат.** Данные: `assets/Icons/icons.json` (имя → внутренняя разметка SVG, один источник). Готовые файлы `assets/Icons/*.svg` покрашены в `violet-900` (`#26215F`), для Figma и дизайнеров. В коде используйте inline-вариант из бандла: он красится через `color`, а `<img>` покрасить нельзя.

**Размеры.** 16 (`size-icon-sm`, бейджи), 20 (`size-icon-md`, кнопки и поля), 24 (`size-icon-lg`, таб-бар и шапка), 32 (`size-icon-xl`, пустые состояния). Штрих масштабируется вместе с иконкой, в 16px допустим 2.5.

**Группы.** Навигация: `home` `tracker` `habits` `settings` `menu` `search` `bell` `chevron-*` `arrow-*`. Действия: `plus` `close` `check` `edit` `trash` `share` `send` `paperclip` `camera` `list-check` `more`. Время: `calendar` `clock` `alarm`. Привычки: `droplet` `moon` `bike` `dumbbell` `book` `apple` `flame` `sun` `leaf` `smile` `heart` `star` `bulb` `target` `compass` `user` `sparkle`. Статусы: `info` `warning` `check-circle`. Распознавание: `scan` (рамка-видоискатель с линией сканирования, кнопка «Сканер» и ID-слепок).

**Как добавить иконку.** Нарисуйте на 24px с отступом 2px, штрих 2px, без заливок и без скруглений меньше 1px. Добавьте разметку в `assets/Icons/icons.json` и в объект `ICONS` в `components/bundle.js` (см. раздел «Как расширять и использовать»). Не смешивайте с другими наборами.
