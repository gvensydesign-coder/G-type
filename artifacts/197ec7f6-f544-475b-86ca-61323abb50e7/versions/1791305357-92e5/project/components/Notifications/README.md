Уведомления: строка центра уведомлений, push iOS и Android, тосты и тост награды.

```js
Buddy.NotificationItem({ type: 'reminder', title: 'Drink Water', text: '…', time: '9:30', unread: true, actions: ['Done', 'Snooze'] })
Buddy.NotificationGroup({ title: 'Today', items: [ … ] })
Buddy.Push({ title: '…', text: '…', time: 'now' })                       // iOS, стекло
Buddy.Push({ platform: 'android', title: '…', text: '…' })              // Android heads-up
Buddy.Toast({ tone: 'success', icon: 'check-circle', title: 'Habit saved' })
```

| Тип | Тон и иконка |
| --- | --- |
| `reminder` | orange · alarm |
| `streak` | pink · flame |
| `badge` | yellow · trophy |
| `friend` | sky · users |
| `tip` | yellow · bulb |
| `system` | green · shield-check |
| `message` | violet · message |

**Правила.** Заголовок до 40 символов, тело до 90, один призыв, до двух действий. Непрочитанное: подсветка `bg-surface-tint` и квадратик `accent-pink`. Push на стекле (`glass-bg-strong`, `blur-lg`). Тост исчезает через 4 секунды, ошибки остаются до закрытия. Тихие часы 22:00–08:00 по умолчанию. Каналы Android и тексты: раздел «Виджеты, уведомления и иконка приложения».
