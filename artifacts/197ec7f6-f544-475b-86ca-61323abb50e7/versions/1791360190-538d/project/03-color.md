# Цвет и темы

## Стратегия

Три слоя токенов, каждый ссылается на нижний:

1. **Шкалы** (`violet-50 … 950`, `orange`, `green`, `pink`, `sky`, `yellow`, `ink`): сырые значения, одинаковые в обеих темах. Менять оттенок бренда нужно здесь.
2. **Семантика** (`bg-*`, `text-*`, `border-*`, `brand*`, `accent-*`, статусы): роли, у которых значение зависит от темы. Это единственный слой, которым пользуются компоненты.
3. **Компоненты**: ничего не определяют, только читают семантику (`var(--bg-surface)`).

Поэтому смена бренд-цвета = правка одной ссылки (`brand` → `{violet-600}`), а новая тема = новый столбец значений в `tokens.json`.

## Роли цвета

| Роль | Светлая | Тёмная | Где |
| --- | --- | --- | --- |
| `bg-app` | `ink-50` #F7F6FB | #130F2B | фон экрана |
| `bg-surface` | #FFFFFF | #1D1946 | карточки, поле, лист |
| `bg-surface-raised` | #FFFFFF | #272159 | активная вкладка, вложенные плитки |
| `bg-surface-sunken` | `ink-100` | #16123A | дорожки, подложка таб-бара |
| `bg-surface-tint` | `violet-50` | #231E52 | строка привычки на листе |
| `bg-inverse` | `ink-900` | #F6F4FF | чёрный акцент: send, plus, Apple, активный фильтр |
| `text-primary` | `ink-900` | #F6F4FF | заголовки и текст |
| `text-secondary` | `ink-600` | #C9C4EC | описания |
| `text-muted` | #6B6888 | #A8A2D2 | единицы, подсказки |
| `brand` | `violet-600` | `violet-600` | кнопка, фокус, прогресс; текст на нём белый |
| `brand-soft` | `violet-100` | #342C78 | мягкая заливка |
| `hero-from → hero-to` | `violet-600 → violet-400` | `violet-800 → violet-900` | шапка |
| `hero-card` | `violet-700` | #4B43C2 | карточка прогресса |
| `badge-count` | #CE4609 | #CE4609 | счётчик непрочитанного; цифра белая, не красный |

## Цвета категорий

| Категория | Заливка | Мягкая плитка | Цветной текст | Маскот / предмет |
| --- | --- | --- | --- | --- |
| Вода | `accent-sky` | `accent-sky-soft` | `accent-sky-ink` | `water-glass`, `bottle` |
| Сон, энергия | `accent-orange` | `accent-orange-soft` | `accent-orange-ink` | Sunny, `moon`, `dumbbell` |
| Движение, рост | `accent-green` | `accent-green-soft` | `accent-green-ink` | Leafy, `bike`, `leaf` |
| Питание, сердце, дневник | `accent-pink` | `accent-pink-soft` | `accent-pink-ink` | `apple`, `heart`, `book` |
| Фокус, мысли | `brand` | `brand-soft` | `text-brand` | Buddy |
| Советы, искры | `accent-yellow` | `accent-yellow-soft` | `accent-yellow-ink` | `bulb`, `sparkle` |

Правило: категория всегда обозначается цветом **и** иконкой/подписью.

## Рецепты градиентов

| Имя | CSS | Где |
| --- | --- | --- |
| hero | `linear-gradient(180deg, var(--hero-from), var(--hero-to))` | шапка экрана |
| wash | `linear-gradient(180deg, var(--bg-wash-violet) 0%, var(--bg-app) 46%, var(--bg-wash-peach) 100%)` | онбординг, чат, вход |
| outline | `linear-gradient(135deg, var(--violet-300), var(--pink-300) 55%, var(--orange-300))` | обводка поля чата |
| cover-aurora | два радиальных пятна `violet-300` и `sky-300` поверх `linear-gradient(135deg, sky-200, violet-200)` | обложки |
| cover-sunset | `pink-300`, `yellow-300` поверх `orange-300 → yellow-200` | обложки |
| cover-candy | `pink-200`, `orange-200` поверх `violet-200 → pink-300` | обложки |
| cover-lagoon | `sky-300`, `green-300` поверх `green-200 → sky-300` | обложки |

Готовые переменные: `--bd-grad-hero`, `--bd-grad-wash`, `--bd-grad-outline`; классы `bd-cover--aurora | sunset | candy | lagoon`. Градиентов в тёмной теме столько же, они сами подтягивают тёмные значения через токены (`hero-*`, `bg-wash-*`); обложки одинаково яркие в обеих темах.

## Принципы тёмной темы

- Не инверсия. Тёмный фон с фиолетовым оттенком (#130F2B), а не серый или чёрный: сохраняется «тёплая» индивидуальность.
- Высота = светлота. Чем выше слой, тем светлее: `bg-app` #130F2B → `bg-surface` #1D1946 → `bg-surface-raised` #272159.
- Акценты поднимаются на шаг: `accent-orange` `500 → 400`, остальные аналогично, текст на них тёмный (`on-accent`). Исключение `brand`: остаётся `violet-600`, чтобы текст на основных кнопках был белым (`text-on-brand`) в обеих темах.
- Тени почти не видны, поэтому карточки получают контур `border-subtle` (`--bd-edge`), свечения `shadow-brand` на ярком фиолетовом остаются.
- Маскоты и объекты не перекрашиваются: их цвета подобраны так, чтобы читаться на обоих фонах.
- Инверсные элементы переворачиваются: чёрная кнопка отправки становится светлой (`bg-inverse` #F6F4FF) с тёмной иконкой.

## Матрица контраста (рассчитана по WCAG 2)

Минимум 4.5:1 для текста и 3:1 для контролов и фокуса. Значения Light / Dark:

| Пара | Light | Dark |
| --- | --- | --- |
| `text-primary` на `bg-app` | 15.65 | 17.07 |
| `text-primary` на `bg-surface` | 16.83 | 15.08 |
| `text-secondary` на `bg-surface` | 6.84 | 9.84 |
| `text-muted` на `bg-surface` | 5.30 | 6.85 |
| `text-muted` на `bg-app` | 4.93 | 7.75 |
| `text-brand` на `bg-surface` | 6.89 | 8.76 |
| `text-brand` на `brand-soft` | 5.68 | 6.31 |
| `text-on-brand` на `brand` | 5.21 | 5.21 |
| `text-on-hero` на `hero-from` | 5.21 | 10.03 |
| `text-on-hero-muted` на `hero-from` | 4.76 | 6.98 |
| `text-on-hero` на `hero-card` | 6.89 | 7.29 |
| `on-accent` на `accent-orange` | 6.88 | 8.28 |
| `on-accent` на `accent-green` | 6.11 | 8.34 |
| `on-accent` на `accent-pink` | 4.81 | 8.37 |
| `on-accent` на `accent-sky` | 7.21 | 9.42 |
| `on-accent` на `accent-yellow` | 10.65 | 12.32 |
| `accent-orange-ink` на `accent-orange-soft` | 5.00 | 7.61 |
| `accent-green-ink` на `accent-green-soft` | 5.60 | 7.69 |
| `accent-pink-ink` на `accent-pink-soft` | 4.67 | 6.58 |
| `accent-sky-ink` на `accent-sky-soft` | 4.89 | 6.94 |
| `accent-yellow-ink` на `accent-yellow-soft` | 4.87 | 8.54 |
| `success` / `warning` / `danger` / `info` на `bg-surface` | 6.23 / 5.36 / 5.51 / 5.61 | 9.60 / 11.58 / 7.87 / 8.86 |
| `border-control` на `bg-surface` (3:1) | 4.04 | 5.11 |
| `focus-ring` на `bg-app` (3:1) | 4.84 | 9.92 |
| `brand` на `bg-surface` как контрол (3:1) | 5.21 | 3.15 |
| белая цифра на `badge-count` | 4.66 | 4.66 |

**Известные исключения.** Заливки `accent-orange` (2.45), `accent-green` (2.76), `accent-sky` (2.34) на белом ниже 3:1: это декоративные цвета полос, колец и столбиков, значение всегда дублируется числом, словом или иконкой. Каждый такой случай отмечен в `usage` токена. Для текстов и иконок категории используйте `accent-*-ink`.

## Цветовая слепота

Статус не кодируется оттенком: каждый статус несёт слово и иконку (`check-circle`, `warning`, `info`), а на светлой теме «успех» `green-700` (#166F3C) и «ошибка» `pink-600` (#C42A55) отличаются по светлоте и форме иконки. Серия дней различима по галочке, а не по розовому цвету. Если нужна строгая проверка, добавьте третью тему `colorblind` с парой «синий успех / оранжевый риск» (в `tokens.json` это новый столбец значений для семантики `success`, `danger`, `accent-*`).

## Чего не делать

- Не назначайте цвет категории вручную: берите из таблицы.
- Не ставьте белый текст на `accent-orange`, `accent-sky`, `accent-yellow`, `accent-pink` (светлая тема).
- Не смешивайте шкалы в одном градиенте без токена: любой новый градиент заводите как переменную в `bundle.css`.
- Не используйте `ink-400` и `text-disabled` для информации.
