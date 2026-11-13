Однострочное поле с подписью над ним: 56px, радиус `radius-lg`, контур 1.5px `border-control` (3:1 на `bg-surface`).

```js
Buddy.TextField({ label: 'Habit name', placeholder: 'Drink water' })
Buddy.TextField({ label: 'Daily goal', value: 'eight', error: 'Enter a number, for example 8' })
```

**Состояния.** Фокус: контур `focus-ring` + `ring-focus`. Ошибка: контур `danger`, под полем иконка `warning` и текст ошибки в `danger`. Подсказка: `caption` в `text-muted`.

**Правила.**
- Подпись всегда видима и связана с полем через `for`/`id`. Placeholder не заменяет подпись.
- Текст ошибки объясняет, как исправить: «Enter a number, for example 8», а не «Invalid value».
- Иконка внутри поля 20px, только слева.
