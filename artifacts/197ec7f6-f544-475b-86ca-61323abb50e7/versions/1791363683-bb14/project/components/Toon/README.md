3D-аватары зверей: восемь toon-голов (WebGL2), которые выглядят как 2D-иллюстрация, но объёмны и двигаются. API в бандле: `Buddy.Toon`; модули зверей лежат в `assets/Toon`.

| Зверь | Класс | Файл |
| --- | --- | --- |
| Кошка | `CatToon` | `assets/Toon/cat-toon.js` |
| Собака | `DogToon` | `dog-toon.js` |
| Зайчик | `BunnyToon` | `bunny-toon.js` |
| Лиса | `FoxToon` | `fox-toon.js` |
| Медведь | `BearToon` | `bear-toon.js` |
| Панда | `PandaToon` | `panda-toon.js` |
| Енот | `RaccoonToon` | `raccoon-toon.js` |
| Хомяк | `HamsterToon` | `hamster-toon.js` |

```js
// 1. подключите модуль (скрипт без зависимостей) и бандл
// 2. хост и монтирование
el.innerHTML = Buddy.Toon.host('dog', 120);            // квадрат 120px + плоский запасной вариант
var dog = Buddy.Toon.mount(el.firstChild, 'dog');     // null, если модуля нет, нет WebGL2 или движение выключено
dog.play('happy'); dog.auto(); dog.blink(); dog.lookAt(0.4, -0.2); dog.set({ outline: 0, halftone: 0.42 });
dog.react('surprise', 1500);                          // клип на 1.5 с, потом живой режим
Buddy.Toon.gaze(dog, el.firstChild, e.clientX, e.clientY); // посмотреть на касание
```

**Анимации (15 клипов).** `rest` покой, `idle` дыхание, `sway` покачивание, `look_around` осматривается, `curious` любопытство, `sleepy` сонный, `happy` радость, `bounce` подпрыгивает, `dance` танец, `nod_yes` кивает, `shake_no` мотает головой, `surprise` удивление, `shy` смущение, `laugh` смех, `sniff` принюхивание. Живой режим `auto()` сам складывает из них осмысленные движения.

**Эффект по умолчанию.** Контур выключен, полутон 0.42, плоскость 0.9, контровой свет 1.4, линии 1.6. Любое значение меняется на лету (`set`). Камера `setView(yaw, pitch, zoom)`, в кадре зум 0.7.

**Правила.**
- Один живой зверь на экран; рядом с сообщениями статичная картинка.
- Хост строго квадратный (`--sz`); холст 160% и `pointer-events: none` уже заданы классом `.bd-toon`.
- Без WebGL2, без модуля и при `prefers-reduced-motion` остаётся плоская иллюстрация.
- Размер от 44px до 168px, не больше 200px. Не накладывайте контур.
- Состояние ассистента всегда дублируйте текстом.
