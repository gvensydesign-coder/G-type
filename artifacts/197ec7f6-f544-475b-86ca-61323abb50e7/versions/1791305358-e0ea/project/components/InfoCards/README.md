Информационные карточки: совет, инсайт с динамикой, статья, цитата с выходом за границу и шаги.

```js
Buddy.InfoCard({ tone: 'yellow', icon: 'bulb', eyebrow: 'Tip of the day', title: '…', text: '…', cta: 'Try it today' })
Buddy.InsightCard({ label: 'Water', value: '6.4', unit: 'glasses', tone: 'sky', trend: { dir: 'up', text: '+12%' }, spark: [3, 4, 5, 7] })
Buddy.ArticleCard({ cover: 'candy', mascot: 'buddy-sleepy', tag: 'Sleep', title: '…', minutes: '4 min read' })
Buddy.QuoteCard({ text: 'Small steps beat big promises.', by: 'Leafy, your coach' })
Buddy.StepsCard({ title: 'Your first week', steps: [{ t: '…', done: true }] })
```

**Правила.** Цвет по категории. Динамика всегда словом и иконкой, снижение не красное (`warning`). Спарклайн без осей, последняя точка выделена. Не больше двух информационных карточек подряд. Цитата выходит за верхний край (`bleed-md`) и резервирует отступ сверху. Обложки статей используют градиенты `bd-cover--*`. Анатомия: раздел «Экраны: диалог, профиль, уведомления, инсайты».
