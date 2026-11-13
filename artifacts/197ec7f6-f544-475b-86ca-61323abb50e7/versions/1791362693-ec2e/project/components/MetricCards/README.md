Три карточки трекера: `SleepCard` (столбики недели), `WorkoutCard` (кольцо) и `MetricRow` (строка с полосой, статусом и бейджем).

```js
Buddy.SleepCard({ values: [70, 30, 24, 40, 88, 62, 78] })
Buddy.WorkoutCard({ percent: 62, sub: '3 Hours Today' })
Buddy.MetricRow({ object: 'bottle', tone: 'sky', title: 'Drink Water', status: 'Poor', value: 3, total: 8 })
```

**Sleep.** Семь столбиков-капсул: дорожка `bg-surface-sunken`, заливка `accent-orange` вырастает снизу за `dur-slow` со сдвигом 40ms на столбик. Под столбиками буквы дней (`caption`).

**Workout.** Кольцо 64px, штрих 7px, `accent-green` по дорожке `track`, иконка внутри `accent-green-ink`.

**MetricRow.** Плитка, название, слово-статус, сегментированная полоса и бейдж `3/8` справа. Цвет бейджа отражает оценку (оранжевый «Poor», зелёный «Great»), но слово обязательно.

**Правила.**
- Карточка ведёт на детали: в заголовке шеврон `chevron-right`.
- Две карточки в ряд (`bd-grid-2`, зазор 12px). Строки метрик на всю ширину.
- Дни недели в графике одной буквой, как в системном календаре пользователя.
