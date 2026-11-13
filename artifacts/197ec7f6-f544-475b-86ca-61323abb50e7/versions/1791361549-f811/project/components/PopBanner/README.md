Баннер, из которого выходит иллюстрация: маскот поднимается над верхним краем и заходит за боковой, блок остаётся скруглённой карточкой.

```js
Buddy.PopBanner({ tone: 'hero', title: 'Invite a friend', text: 'Habits stick better together', cta: 'Invite' })
Buddy.PopBanner({ tone: 'leafy', title: 'Start small', text: 'One minute a day', cta: 'Try it', over: 'lg', side: 'left' })
```

| Тон | Фон | Текст | Маскот |
| --- | --- | --- | --- |
| `hero` | `hero-card` | `text-on-hero` | Buddy |
| `sunny` | `accent-orange-soft` | `text-primary` | Sunny |
| `leafy` | `accent-green-soft` | `text-primary` | Leafy |
| `soft` | `brand-soft` | `text-primary` | Buddy |

**Вылет.** `over: 'md'` = `bleed-md` (20px), `over: 'lg'` = `bleed-lg` (36px). Боковой вылет 8px, не больше `bleed-sm`. Кнопка: `dark` на светлых тонах, `secondary` на `hero`.

**Отступы.** Блок сам резервирует вылет: `margin-top = space-3 + вылет`. Между двумя блоками с вылетом оставляйте не меньше `space-6`. Текстовая колонка уступает иллюстрации (отступ со стороны арта 124px при арте 128px).

**Правила.** Иллюстрация декоративна (`alt=""`), смысл только в тексте. Заголовок до четырёх слов, пояснение одна строка, одна кнопка. Не больше одного PopBanner на экран. Не обрезайте блок (`overflow` остаётся `visible`). Кнопка находится вне зоны вылета.
