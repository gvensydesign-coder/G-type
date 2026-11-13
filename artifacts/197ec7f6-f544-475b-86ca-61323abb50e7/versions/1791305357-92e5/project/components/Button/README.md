Основная кнопка действия: капсула 44px или 56px с жирной подписью `label-md` / `label-lg`.

**Когда использовать.** Одно главное действие на экран. Остальные действия вторичные.

| Вариант | Класс | Назначение |
| --- | --- | --- |
| Primary | `bd-btn--primary` | Главное действие. Заливка `brand`, свечение `shadow-brand`, текст `text-on-brand`. |
| Secondary | `bd-btn--secondary` | Равноправная альтернатива. `bg-surface`, контур `border-strong`. |
| Soft | `bd-btn--soft` | Менее важное действие внутри карточки. `brand-soft` + `text-brand`. |
| Dark | `bd-btn--dark` | Системные входы (Apple), главный призыв на светлом фоне. `bg-inverse`. |
| Ghost | `bd-btn--ghost` | Третичное действие, ссылки-кнопки. Без заливки. |

**Размеры.** По умолчанию 44px (`size-button-md`). Крупная `bd-btn--lg` 56px (`size-button-lg`) для онбординга и входа. `bd-btn--block` растягивает на всю ширину.

**Что передаёт потребитель.** Подпись (глагол: «Добавить привычку», «Продолжить»), опционально иконку из набора Icons. Логотипы Apple и Google подставляются официальными знаками: в превью стоят буквы-заглушки (`logo: 'A'`).

```js
Buddy.Button({ label: 'Add habit', icon: 'plus' })
Buddy.Button({ label: 'Continue with Apple', variant: 'dark', size: 'lg', block: true, logo: 'A' })
```

```html
<button class="bd-btn bd-btn--primary"><svg class="bd-icon">…</svg>Add habit</button>
```

**Состояния.** hover `brand-hover`, pressed `brand-pressed` + сжатие 0.97 за `dur-instant`, focus-visible `ring-focus`, disabled `opacity-disabled` без тени.

**Правила.**
- Подпись в одну строку, без точки, максимум три слова в компактной кнопке.
- На заливке `brand` только `text-on-brand`. На оранжевом, голубом и жёлтом акценте белый текст запрещён, берите `on-accent`.
- Не ставьте две primary-кнопки рядом. Пара «primary + secondary» или «dark + secondary».
- Подпись на заливке `brand` всегда белая (`text-on-brand` = `ink-0`) в обеих темах. Заливка в тёмной теме не светлеет: `violet-600`, hover `violet-700`, pressed `violet-800`. Не ставьте тёмный текст на фиолетовые кнопки.
