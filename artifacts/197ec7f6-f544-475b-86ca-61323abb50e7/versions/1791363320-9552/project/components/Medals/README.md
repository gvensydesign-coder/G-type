Фирменные ачивки: мягкие 3D-медали трёх форм (shield, hex, round) и шести тонов, закрытые и в процессе, плюс тост награды. Эмблема накладывается поверх базы, поэтому любая иконка подходит к любой форме.

```js
Buddy.Medal({ shape: 'shield', tone: 'orange', text: '7', label: 'Week streak', count: 7, shine: true })
Buddy.Medal({ shape: 'round', tone: 'green', emblem: 'bike', label: 'Move 100', locked: true, progress: 34 })
Buddy.MedalToast({ medals: [{ shape: 'round', tone: 'sky', emblem: 'droplet' }], title: 'You earned 3 badges!' })
```

| Параметр | Значения |
| --- | --- |
| `shape` | `shield`, `hex`, `round` |
| `tone` | `violet`, `orange`, `green`, `pink`, `sky`, `gold` |
| `size` | `sm` 56, `md` 88, `lg` 128 или число в px |
| `emblem` / `text` | имя иконки или короткий текст (цифра) |
| `locked`, `progress`, `count`, `shine`, `pop`, `compact` | состояние, прогресс 0–100, счётчик, блик, анимация получения, без подписи |

**Правила.** Название всегда словами (`label`), эмблема декоративна. Цвет по категории, не по уровню. Не больше трёх медалей в тосте, блик на одной-двух медалях экрана. Закрытые не красные: приглушённая форма с замком и понятный шаг. Анатомия, анимация получения и каталог: раздел «Ачивки».
