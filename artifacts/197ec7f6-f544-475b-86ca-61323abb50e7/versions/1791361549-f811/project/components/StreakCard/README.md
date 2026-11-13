Карточка серии: маскот Buddy в пламени, число дней, девиз и неделя с розовой дорожкой.

```js
Buddy.StreakCard({ today: 3, title: '4 Days Streak', sub: 'Rise and Good', foot: '4 / 6 Habits completed today' })
```

**Строение.** Белая карточка `radius-2xl`, `shadow-md`, внутри: арт 148px (`buddy-streak`, `bd-anim-flicker`/`bd-anim-float`), заголовок `title-lg`, подпись `body` `text-muted`, неделя из семи колонок, итог дня `body`.

**Неделя.** Выполненные дни: розовые круги `accent-pink` с галочкой, соединённые мягкой дорожкой `accent-pink-soft`. Сегодня: круг 28px со свечением `shadow-glow-streak` и пульсом. Будущие дни показывают число даты в `text-muted`. Сегодняшняя подпись дня жирная и `accent-pink-ink`.

**Правила.**
- Заголовок говорит о достижении («4 Days Streak»), девиз поддерживает («Rise and Good»), а не оценивает.
- Если серия прервалась, Buddy меняется на `buddy-sleepy`, текст мягкий: «Let's start again». Красный цвет не используется.
- Перекрывает нижний край шапки на 56–70px.
