Сворачиваемая панель для второстепенных настроек. Основные инструменты остаются на виду.

## Разметка
```html
<section class="pane" id="pv-preview">
  <button class="pane-h" type="button" aria-expanded="true">
    <span class="pane-t">Предпросмотр</span><span class="pane-m">60 px</span><i class="pane-chev"></i>
  </button>
  <div class="pane-b">…</div>
</section>
<script>paneInit(document.getElementById('pv-preview'),'ed-preview',true);</script>
```
`paneInit(el, key, defaultOpen[, onToggle])` (ui_ds_s1.js) — единая реализация: ставит `aria-expanded` и `aria-controls`, прячет тело (`hidden`, класс `.shut`), кидает событие `pane:toggle` с `{key, open}`, помнит состояние в `localStorage['gtype-pane-'+key]`. Ключ — `<экран>-<имя>`: `ed-preview`, `dr-layers`.

## Варианты
`.pane.flat` — без поверхности; `.pane.line` — строка с нижней линией (панели рисования и импорта). `.pane-m` — необязательная мета справа (значение, счётчик).

## Правила
- Открытыми по умолчанию не больше одной второстепенной панели.
- Панели складываются друг на друга без своих отступов (зазор `--s2` автоматически).
- Заголовок 14px, полужирный, высота `--h-lg`; шеврон поворачивается за `--t` (200ms) и отключается при `prefers-reduced-motion`.
