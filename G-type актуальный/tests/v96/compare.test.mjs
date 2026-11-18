// «Сравнение шрифтов»: входы, плашка, экран, избранное, черновики, история, геометрия карточек.
import { createSuite, openPage, sleep, assert, eq } from "./lib.mjs";

const Q = (s) => JSON.stringify(s);
const rectEq = (actual, expected, label) => {
  assert(Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, i) => Number.isFinite(value) && Math.abs(value - expected[i]) <= 0.11),
  `${label}: got ${Q(actual)}, want ${Q(expected)} (tolerance 0.11px)`);
};

// Размеры карточек сборки без compare.js (a1dc695): [w,h, образец, название, теги, каждый тег] относительно карточки.
const BASE_RECT = {t:{"volt":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,78.4,36,192.8,233,103.2,36],"kvadra":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,118.9,36,148.9,233,98.6,36,24,275,78.4,36],"stroka":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,118.9,36,148.9,233,98.6,36,24,275,85.9,36],"propis":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,95.7,36,125.7,233,147.2,36,24,275,74.8,36],"liniya":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,120.9,36,150.9,233,115.5,36],"codex":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,95.4,36,125.4,233,158.1,36],"rotunda":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,91.2,36,121.2,233,158.1,36,24,275,72.7,36],"ustav":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,116.2,36,146.2,233,57,36,209.3,233,58.1,36],"modul":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,120.9,36,150.9,233,91.6,36,24,275,103.2,36],"ryvok":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,78.4,36,192.8,233,103.2,36],"kaplya":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,103.2,36,133.2,233,145.3,36],"pixel":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,96,36,126,233,103.2,36],"renessa":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,72.6,36,102.6,233,86.3,36,24,275,158.1,36],"applik":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,103.2,36,133.2,233,145.3,36],"stsepka":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,58.1,36,88.1,233,103.2,36,24,275,145.3,36],"stolb":[366,335,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,58.1,36,172.5,233,103.2,36],"nit":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,95.7,36,125.7,233,58.1,36,24,275,115.5,36],"tyaga":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,120.9,36,150.9,233,115.5,36,24,275,103.2,36],"kortes":[366,377,12,12,342,168,12,198,342,29,12,233,342,78,24,233,72.6,36,102.6,233,103.2,36,24,275,145.3,36]},"d":{"volt":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,78.4,28,108.4,209,78.4,28,24,243,103.2,28],"kvadra":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,118.9,28,148.9,209,98.6,28,24,243,78.4,28],"stroka":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,118.9,28,148.9,209,98.6,28,24,243,85.9,28],"propis":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,95.7,28,24,243,147.2,28,177.2,243,74.8,28],"liniya":[323,321,12,12,299,144,12,174,299,29,12,209,299,62,24,209,120.9,28,24,243,115.5,28],"codex":[323,321,12,12,299,144,12,174,299,29,12,209,299,62,24,209,95.4,28,24,243,158.1,28],"rotunda":[323,321,12,12,299,144,12,174,299,29,12,209,299,96,24,209,91.2,28,24,243,158.1,28,24,277,72.7,28],"ustav":[323,321,12,12,299,144,12,174,299,29,12,209,299,62,24,209,116.2,28,146.2,209,57,28,24,243,58.1,28],"modul":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,120.9,28,150.9,209,91.6,28,24,243,103.2,28],"ryvok":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,78.4,28,108.4,209,78.4,28,24,243,103.2,28],"kaplya":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,103.2,28,24,243,145.3,28],"pixel":[323,287,12,12,299,144,12,174,299,29,12,209,299,28,24,209,96,28,126,209,103.2,28],"renessa":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,72.6,28,102.6,209,86.3,28,24,243,158.1,28],"applik":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,103.2,28,24,243,145.3,28],"stsepka":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,58.1,28,88.1,209,103.2,28,24,243,145.3,28],"stolb":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,78.4,28,108.4,209,58.1,28,24,243,103.2,28],"nit":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,95.7,28,125.7,209,58.1,28,24,243,115.5,28],"tyaga":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,120.9,28,24,243,115.5,28,145.5,243,103.2,28],"kortes":[323,287,12,12,299,144,12,174,299,29,12,209,299,62,24,209,72.6,28,102.6,209,103.2,28,24,243,145.3,28]},"p":{"volt":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,78.4,36,192.8,233,103.2,36],"kvadra":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,118.9,36,148.9,233,98.6,36,24,275,78.4,36],"stroka":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,118.9,36,148.9,233,98.6,36,24,275,85.9,36],"propis":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,95.7,36,125.7,233,147.2,36,24,275,74.8,36],"liniya":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,120.9,36,150.9,233,115.5,36],"codex":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,95.4,36,125.4,233,158.1,36],"rotunda":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,91.2,36,121.2,233,158.1,36,24,275,72.7,36],"ustav":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,116.2,36,146.2,233,57,36,209.3,233,58.1,36],"modul":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,120.9,36,150.9,233,91.6,36,24,275,103.2,36],"ryvok":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,78.4,36,192.8,233,103.2,36],"kaplya":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,103.2,36,133.2,233,145.3,36],"pixel":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,96,36,126,233,103.2,36],"renessa":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,72.6,36,102.6,233,86.3,36,24,275,158.1,36],"applik":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,103.2,36,133.2,233,145.3,36],"stsepka":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,58.1,36,88.1,233,103.2,36,24,275,145.3,36],"stolb":[366,285,12,12,342,168,12,198,342,29,12,233,342,36,24,233,78.4,36,108.4,233,58.1,36,172.5,233,103.2,36],"nit":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,95.7,36,125.7,233,58.1,36,24,275,115.5,36],"tyaga":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,120.9,36,150.9,233,115.5,36,24,275,103.2,36],"kortes":[366,327,12,12,342,168,12,198,342,29,12,233,342,78,24,233,72.6,36,102.6,233,103.2,36,24,275,145.3,36]}};

async function ready(page, tab) {
  await page.ev(`document.querySelector('#onb-skip')?.click()`);
  for (let i = 0; i < 40; i++) {
    if (await page.ev(`!!window.GT_COMPARE&&(0,eval)("S").tab===${Q(tab)}&&!!document.querySelector('.lcard[data-font]')`).catch(() => false)) break;
    await sleep(250);
  }
  await page.ev(`(()=>{const t=document.querySelector('#tour.on');if(!t)return;const b=[...t.querySelectorAll('button,a')].find(x=>/Пропустить/.test(x.textContent));if(b)b.click()})()`);
  await sleep(400);
}
async function skipTour(page) {
  for (let i = 0; i < 3; i++) {
    const r = await page.ev(`(()=>{const t=document.querySelector('#tour.on');if(!t)return false;const b=[...t.querySelectorAll('button,a')].find(x=>/Пропустить/.test(x.textContent));if(b){b.click();return true}return false})()`);
    if (!r) break;
    await sleep(500);
  }
}
const rect = (sel) => `(()=>{const e=document.querySelector(${Q(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}})()`;
const sel = (page) => page.ev(`GT_COMPARE.sel()`);
const mouse = (page, x, y) => page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

async function menuAdd(page, id) {
  await page.ev(`document.querySelector('#libgrid .lcard[data-font=${id}]').scrollIntoView({block:'center'})`);
  await sleep(250);
  await page.ev(`document.querySelector('#libgrid .lcard[data-font=${id}] .lc-more').click()`);
  await sleep(350);
  await page.ev(`document.querySelector('.menu70 [data-m="cmp"]').click()`);
  await sleep(350);
}
async function reload(page, tab) {
  await page.ev(`location.reload()`);
  await sleep(1500);
  for (let i = 0; i < 80; i++) {
    if (await page.ev(`document.readyState==="complete"&&!!window.GT_COMPARE&&!!document.querySelector(".rail")`).catch(() => false)) break;
    await sleep(250);
  }
  await sleep(900);
  await skipTour(page);
}
async function makeDrafts(page) {
  return page.ev(`(async()=>{
    GT_DRAFTS.setPref('save');
    for(const id of ['volt','kvadra']){
      libOpen(id);await new Promise(r=>setTimeout(r,1400));
      const k=PARAMS[0][0],e=document.querySelector('#p_'+k);
      if(e){e.value=String(Math.round((+e.min+ +e.max)/2)+3);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
      await new Promise(r=>setTimeout(r,700));
      document.querySelector('.rail [data-tab=library]').click();
      await new Promise(r=>setTimeout(r,1400));
    }
    return GT_DRAFTS.list().filter(d=>d.mode==='edit').length;
  })()`);
}

const overlap = (a, b) => !(a.r <= b.x || a.x >= b.r || a.b <= b.y || a.y >= b.b);

export default async function run() {
  const t = createSuite("compare");
  const page = await openPage();
  try {
    await page.goto("library", 1440, 900);
    await ready(page, "library");

    await t.check("меню «…» на карточке: «Сравнить» стоит после «В избранное» и до «Поделиться»", async () => {
      await page.ev(`document.querySelector('#libgrid .lcard[data-font=volt] .lc-more').click()`);
      await sleep(400);
      const items = await page.ev(`[...document.querySelectorAll('.menu70 [role=menuitem]')].map(b=>b.textContent.trim())`);
      eq(items, ["В подборку", "В избранное", "Сравнить", "Поделиться", "Открыть в редакторе"], "пункты меню");
    });
    await t.check("меню: «Сравнить» добавляет шрифт, плашка «Сравнение: Вольт · добавьте ещё один»", async () => {
      await page.ev(`document.querySelector('.menu70 [data-m="cmp"]').click()`);
      await sleep(600);
      eq(await sel(page), ["volt"], "выбор");
      const txt = await page.ev(`document.querySelector('#cmp-tray .cmp-tin').textContent.replace(/\\s+/g,' ').trim()`);
      assert(/Сравнение:\s*Вольт.*добавьте ещё один/.test(txt), "текст плашки: " + txt);
      assert(!(await page.ev(`!!document.querySelector('#cmp-go')`)), "кнопка «Сравнить» не должна быть при одном шрифте");
      assert(await page.ev(`document.querySelector('#cmp-tray').classList.contains('on')`), "плашка не показана");
    });
    await t.check("карточка при наведении: «Сравнить» в .hcard, плашка 1 → 2, главная кнопка «Сравнить 2»", async () => {
      await page.ev(`document.querySelector('#libgrid .lcard[data-font=stroka]').scrollIntoView({block:'center'})`);
      await sleep(300);
      const r = await page.ev(rect("#libgrid .lcard[data-font=stroka] canvas.lcv"));
      await mouse(page, r.x + 40, r.y + 40);
      await mouse(page, r.x + 60, r.y + 50);
      for (let i = 0; i < 20; i++) { await sleep(150); if (await page.ev(`!!document.querySelector('#hcard:not([hidden]) .hc-cmp')`)) break; }
      const lab = await page.ev(`document.querySelector('#hcard .hc-cmp').textContent.trim()`);
      eq(lab, "Сравнить", "подпись кнопки в hcard");
      await page.ev(`document.querySelector('#hcard .hc-cmp').click()`);
      await sleep(500);
      eq(await sel(page), ["volt", "stroka"], "выбор после hcard");
      eq(await page.ev(`document.querySelector('#cmp-go').textContent.trim()`), "Сравнить 2", "главная кнопка плашки");
      eq(await page.ev(`document.querySelector('#hcard .hc-cmp').textContent.trim()`), "В сравнении", "кнопка в hcard после выбора");
      await mouse(page, 5, 5);
      await sleep(600);
    });
    await t.check("плашка 2 → 4, на пятом шрифте сообщение и выбор не меняется", async () => {
      await menuAdd(page, "kvadra");
      await menuAdd(page, "propis");
      eq(await sel(page), ["volt", "stroka", "kvadra", "propis"], "четыре шрифта");
      eq(await page.ev(`document.querySelector('#cmp-go').textContent.trim()`), "Сравнить 4", "кнопка на четырёх");
      await menuAdd(page, "renessa");
      const toast = await page.ev(`document.querySelector('#toast').textContent`);
      assert(/уже четыре шрифта/.test(toast), "нет сообщения о пятом шрифте: " + toast);
      eq((await sel(page)).length, 4, "выбор остался из четырёх");
    });
    await t.check("плашка не накрывает рейл и тост (1440)", async () => {
      await page.ev(`toast('Проверка сообщения')`);
      await sleep(900);
      const tray = await page.ev(rect("#cmp-tray .cmp-tin")), rail = await page.ev(rect(".rail .rpill")) || (await page.ev(rect(".rail"))), toast = await page.ev(rect("#toast"));
      const rr = await page.ev(`[...document.querySelectorAll('.rail .rb')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}})`);
      for (const b of rr) assert(!overlap(tray, b), "плашка накрывает кнопку рейла");
      assert(!overlap(tray, toast), `плашка накрывает тост: ${JSON.stringify(tray)} / ${JSON.stringify(toast)}`);
      await sleep(5200);
    });
    await t.check("перезагрузка сохраняет выбор и плашку", async () => {
      await reload(page, "library");
      eq(await sel(page), ["volt", "stroka", "kvadra", "propis"], "выбор после перезагрузки");
      assert(await page.ev(`document.querySelector('#cmp-tray').classList.contains('on')`), "плашка не показана после перезагрузки");
    });
    await t.check("«Сравнить 4» открывает экран: Рядом / Наложение, слайдер, без метрик, одна главная кнопка", async () => {
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1500);
      assert(await page.ev(`!document.querySelector('#view-cmp').hidden&&GT_COMPARE.isOpen()`), "экран не открыт");
      eq(await page.ev(`[...document.querySelectorAll('#cmp-seg button')].map(b=>b.textContent.trim())`), ["Рядом", "Наложение"], "режимы");
      assert(await page.ev(`!!document.querySelector('#cmp-size')`), "нет слайдера размера");
      const txt = await page.ev(`document.querySelector('#view-cmp').textContent`);
      for (const w of ["Высота строчных", "Контраст", "Апертура"]) assert(txt.indexOf(w) < 0, "на экране метрика: " + w);
      eq(await page.ev(`document.querySelectorAll('#view-cmp .cmp-open.pri').length`), 1, "главных кнопок");
      eq(await page.ev(`document.querySelectorAll('#view-cmp .cmp-card').length`), 4, "карточек");
      eq(await page.ev(`document.querySelector('#view-cmp .cmp-card.sel').dataset.k`), "volt", "по умолчанию выбрана первая");
      eq(await page.ev(`!!document.querySelector('.rail')&&document.querySelector('.rail').getBoundingClientRect().width>0`), true, "рейл на экране сравнения");
    });
    await t.check("главная кнопка у выбранной карточки: клик и фокус переносят акцент", async () => {
      await page.ev(`document.querySelector('#view-cmp .cmp-card[data-k=propis]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
      await sleep(250);
      eq(await page.ev(`[...document.querySelectorAll('#view-cmp .cmp-open.pri')].map(b=>b.dataset.open)`), ["propis"], "акцент после нажатия");
      await page.ev(`(()=>{const b=document.querySelector('#view-cmp .cmp-card[data-k=stroka] .cmp-open');b.focus();b.dispatchEvent(new FocusEvent('focusin',{bubbles:true}))})()`);
      await sleep(250);
      eq(await page.ev(`[...document.querySelectorAll('#view-cmp .cmp-open.pri')].map(b=>b.dataset.open)`), ["stroka"], "акцент после фокуса");
      const bg = await page.ev(`getComputedStyle(document.querySelector('#view-cmp .cmp-open.pri')).backgroundColor`);
      assert(/252, 71, 60|rgb\(252/.test(bg), "фон главной кнопки не акцентный: " + bg);
      const fs = await page.ev(`(()=>{const s=getComputedStyle(document.querySelector('#view-cmp .cmp-open.pri'));return [s.fontSize,s.fontWeight]})()`);
      eq(fs, ["14px", "700"], "подпись главной кнопки");
      const sec = await page.ev(`getComputedStyle(document.querySelector('#view-cmp .cmp-open:not(.pri)')).backgroundColor`);
      assert(!/252, 71, 60/.test(sec), "у второстепенной кнопки акцентный фон");
    });
    await t.check("«Наложение»: холст контуров, у каждой карточки своя линия, Рядом возвращает", async () => {
      await page.ev(`document.querySelector('#cmp-seg [data-v=overlay]').click()`);
      await sleep(900);
      eq(await page.ev(`GT_COMPARE.view()`), "overlay", "режим");
      const h = await page.ev(`document.querySelector('#cmp-field canvas').getBoundingClientRect().height`);
      assert(h > 40, "холст наложения пуст: " + h);
      eq(await page.ev(`document.querySelectorAll('#cmp-legend .cmp-lg').length`), 4, "строк легенды");
      const marks = await page.ev(`[...document.querySelectorAll('#cmp-grid .cmp-card .cmp-mk line')].map(l=>l.getAttribute('stroke-dasharray')||'solid')`);
      eq(marks.length, 4, "меток у карточек");
      assert(new Set(marks).size === 4, "начертания линий не различаются: " + marks.join("|"));
      const same = await page.ev(`[...document.querySelectorAll('#cmp-legend .cmp-lg line')].map(l=>l.getAttribute('stroke-dasharray')||'solid')`);
      eq(same, marks, "легенда и метки карточек совпадают");
      await page.ev(`document.querySelector('#cmp-seg [data-v=side]').click()`);
      await sleep(500);
      eq(await page.ev(`GT_COMPARE.view()`), "side", "возврат в Рядом");
    });
    await t.check("«Закрыть» возвращает в библиотеку, выбор остаётся, фокус на кнопке плашки", async () => {
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(1000);
      assert(await page.ev(`document.querySelector('#view-cmp').hidden`), "экран остался открытым");
      eq(await page.ev(`(0,eval)("S").tab`), "library", "вкладка после закрытия");
      eq(await sel(page), ["volt", "stroka", "kvadra", "propis"], "выбор после закрытия");
      assert(await page.ev(`document.querySelector('#cmp-tray').classList.contains('on')`), "плашка не вернулась");
      eq(await page.ev(`document.activeElement&&document.activeElement.id`), "cmp-go", "фокус вернулся на кнопку плашки");
    });
    await t.check("Esc закрывает сравнение и возвращает фокус", async () => {
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1200);
      assert(await page.ev(`GT_COMPARE.isOpen()`), "экран не открылся");
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(1000);
      assert(!(await page.ev(`GT_COMPARE.isOpen()`)), "Esc не закрыл сравнение");
      eq(await page.ev(`document.activeElement&&document.activeElement.id`), "cmp-go", "фокус после Esc");
    });
    await t.check("текст набирается прямо в образце и общий для всех карточек", async () => {
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1200);
      await page.ev(`(()=>{const i=document.querySelector('#cmp-grid .cmp-card .cmp-in');i.focus();i.value='Мост и дом';i.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await sleep(400);
      const vals = await page.ev(`[...document.querySelectorAll('#view-cmp .cmp-in')].map(i=>i.value)`);
      assert(vals.length >= 5 && vals.every((v) => v === "Мост и дом"), "текст не общий: " + vals.join("|"));
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(900);
    });

    const flat = `(c=>{const q=c.getBoundingClientRect();const f=e=>{const r=e.getBoundingClientRect();return [r.x-q.x,r.y-q.y,r.width,r.height].map(v=>Math.round(v*10)/10)};return [...[q.width,q.height].map(v=>Math.round(v*10)/10),...f(c.querySelector('canvas.lcv')),...f(c.querySelector('.ln')),...f(c.querySelector('.lt')),...[...c.querySelectorAll('.lt .tag')].flatMap(f)]})`;
    await t.check("карточка библиотеки: rect карточки, образца, названия и тегов равен сборке без патча (1440, 19 шрифтов)", async () => {
      await page.ev(`(0,eval)("setTab")('library')`);
      await sleep(800);
      const r = await page.ev(`Object.fromEntries([...document.querySelectorAll('#libgrid .lcard')].map(c=>[c.dataset.font,(${flat})(c)]))`);
      eq(Object.keys(r).length, Object.keys(BASE_RECT.d).length, "число карточек");
      for (const id of Object.keys(BASE_RECT.d)) rectEq(r[id], BASE_RECT.d[id], "rect карточки " + id);
    });
    await t.check("«…» и сердечко в одной строке с тегами: одна ось, один размер, равный зазор; теги в строке без наложения (библиотека, 1440)", async () => {
      const r = await page.ev(`[...document.querySelectorAll('#libgrid .lcard')].map(c=>{
        const f=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2}};
        const lt=c.querySelector('.lt');
        return {id:c.dataset.font,h:f(c.querySelector('.heart')),m:f(c.querySelector('.lc-more')),cr:f(c),lt:f(lt),tags:[...c.querySelectorAll('.lt .tag')].map(f),
          mask:getComputedStyle(lt).webkitMaskImage}})`);
      assert(r.length >= 19, "мало карточек");
      for (const c of r) {
        assert(Math.abs(c.h.cy - c.m.cy) <= 1, `оси различаются: ${c.id}`);
        assert(Math.abs(c.h.w - c.m.w) <= 1 && Math.abs(c.h.h - c.m.h) <= 1, "размеры различаются");
        assert(Math.abs((c.h.x - c.m.r) - (c.cr.r - c.h.r)) <= 1 || c.h.x - c.m.r === 10, `зазор между кнопками: ${c.id} ${c.h.x - c.m.r}`);
        assert(c.m.y > c.cr.y + c.cr.h / 2, "«…» оказалась в строке названия");
        assert(c.m.b <= c.cr.b && c.h.b <= c.cr.b, "кнопка вышла за карточку");
        const lastY = Math.max(...c.tags.map((x) => x.cy));
        const slack = c.cr.b - 16 - c.lt.b;
        if (slack < 4) assert(Math.abs(c.m.cy - lastY) <= 8 || c.tags.every((x) => x.cy < c.m.y), `«…» не на оси последней строки тегов: ${c.id}`);
        assert(c.mask && c.mask !== "none", "у тегов нет затухания у кнопок: " + c.id);
        const hit = c.tags.filter((tg) => overlap(tg, c.m));
        for (const tg of hit) assert(tg.x < c.m.x - 0.5 && tg.r > c.m.x, `тег под «…» не обрезан: ${c.id}`);
        assert(!c.tags.some((tg) => overlap(tg, c.h)), "тег наезжает на сердечко: " + c.id);
      }
    });
    await t.check("«…» рядом с сердечком и в избранном, и на главной", async () => {
      await page.ev(`['volt','stroka'].forEach(k=>favSet(k,true));(0,eval)("setTab")('fav')`);
      await sleep(1200);
      const f = await page.ev(`(()=>{const c=document.querySelector('#favgrid .lcard');const h=c.querySelector('.heart').getBoundingClientRect(),m=c.querySelector('.lc-more').getBoundingClientRect();return {cy:Math.abs((h.y+h.height/2)-(m.y+m.height/2)),w:h.width-m.width,gap:h.x-m.right}})()`);
      assert(f.cy <= 1 && Math.abs(f.w) <= 1 && f.gap > 0 && f.gap < 16, "избранное: " + JSON.stringify(f));
      await page.ev(`(0,eval)("setTab")('home')`);
      await sleep(1200);
      const h2 = await page.ev(`(()=>{const c=document.querySelector('#libcards .lcard');const h=c.querySelector('.heart').getBoundingClientRect(),m=c.querySelector('.lc-more').getBoundingClientRect();return {cy:Math.abs((h.y+h.height/2)-(m.y+m.height/2)),w:h.width-m.width,gap:h.x-m.right}})()`);
      assert(h2.cy <= 1 && Math.abs(h2.w) <= 1 && h2.gap > 0 && h2.gap < 16, "главная: " + JSON.stringify(h2));
    });

    await t.check("рамка выбора не меняет rect карточки, образца, названия и тегов (обе темы)", async () => {
      await page.ev(`GT_COMPARE.clear();(0,eval)("setTab")('library')`);
      await sleep(900);
      for (const theme of ["light", "dark"]) {
        await page.ev(`document.documentElement.dataset.theme=${Q(theme)}`);
        await sleep(400);
        const grab = () => page.ev(`(()=>{const c=document.querySelector('#libgrid .lcard[data-font=kvadra]');const f=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)};
          return {card:f(c),cv:f(c.querySelector('canvas.lcv')),ln:f(c.querySelector('.ln')),lt:f(c.querySelector('.lt')),heart:f(c.querySelector('.heart')),more:f(c.querySelector('.lc-more')),notch:f(c.querySelector('.notch'))}})()`);
        await page.ev(`GT_COMPARE.clear()`);
        await sleep(500);
        const before = await grab();
        await page.ev(`GT_COMPARE.add('kvadra')`);
        await sleep(500);
        const after = await grab();
        eq(after, before, `rect до/после отметки (${theme})`);
        const ring = await page.ev(`(()=>{const c=document.querySelector('#libgrid .lcard[data-font=kvadra]');const a=getComputedStyle(c,'::after'),b=getComputedStyle(c);return {on:c.classList.contains('cmp-on'),inset:a.top,cring:b.getPropertyValue('--cring').trim(),ink:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),mask:a.webkitMaskImage.indexOf('Q')>0||a.webkitMaskImage.indexOf('A16 16')>0||a.webkitMaskImage.indexOf('A16')>0}})()`);
        assert(ring.on, "карточка не отмечена");
        eq(ring.inset, "2px", "толщина рамки по форме выреза");
        assert(ring.cring === "var(--ink)" || ring.cring === ring.ink, "цвет рамки не ink: " + ring.cring);
        assert(ring.mask, "у слоя рамки нет маски выреза");
        await page.ev(`GT_COMPARE.clear()`);
        await sleep(300);
      }
      await page.ev(`document.documentElement.dataset.theme='light'`);
    });
    await t.check("рамка выбора в режиме списка идёт по контуру карточки без сдвига", async () => {
      await page.ev(`document.querySelector('#libgrid').classList.add('list')`);
      await sleep(500);
      const g = () => page.ev(`(()=>{const c=document.querySelector('#libgrid .lcard[data-font=kvadra]');const r=c.getBoundingClientRect(),v=c.querySelector('canvas.lcv').getBoundingClientRect();return [r.x,r.y,r.width,r.height,v.x,v.y,v.width,v.height]})()`);
      const a = await g();
      await page.ev(`GT_COMPARE.add('kvadra')`);
      await sleep(400);
      eq(await g(), a, "rect в списке");
      await page.ev(`GT_COMPARE.clear();document.querySelector('#libgrid').classList.remove('list')`);
      await sleep(300);
    });

    await t.check("избранное 2–4: «Сравнить избранное» открывает сразу", async () => {
      await page.ev(`GT_COMPARE.clear();(0,eval)("setTab")('fav')`);
      await sleep(1000);
      eq(await page.ev(`[...FAVS].length`), 2, "в избранном два шрифта");
      await page.ev(`document.querySelector('#cmp-fav-btn').click()`);
      await sleep(1500);
      assert(await page.ev(`GT_COMPARE.isOpen()`), "экран не открылся сразу");
      eq((await page.ev(`GT_COMPARE.items()`)).sort(), ["stroka", "volt"], "шрифты из избранного");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(1000);
      eq(await page.ev(`(0,eval)("S").tab`), "fav", "возврат в избранное");
    });
    await t.check("избранное больше четырёх: отметки и плашка, потом экран", async () => {
      await page.ev(`GT_COMPARE.clear();['propis','renessa','modul'].forEach(k=>favSet(k,true));(0,eval)("setTab")('fav')`);
      await sleep(1200);
      eq(await page.ev(`[...FAVS].length`), 5, "пять избранных");
      await page.ev(`document.querySelector('#cmp-fav-btn').click()`);
      await sleep(600);
      assert(!(await page.ev(`GT_COMPARE.isOpen()`)), "с пятью шрифтами экран не должен открываться сразу");
      assert(await page.ev(`document.querySelector('#cmp-tray').classList.contains('on')`), "плашка не появилась");
      await page.ev(`document.querySelector('#favgrid .lcard[data-font=volt]').click()`);
      await sleep(300);
      await page.ev(`document.querySelector('#favgrid .lcard[data-font=modul]').click()`);
      await sleep(500);
      eq(await sel(page), ["volt", "modul"], "отметки в избранном");
      assert(await page.ev(`(0,eval)("S").tab`) === "fav", "клик по карточке в режиме отметок не должен открывать редактор");
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1500);
      eq((await page.ev(`GT_COMPARE.items()`)), ["volt", "modul"], "экран с отмеченными");
      assert(await page.ev(`document.querySelector('#view-cmp').textContent.indexOf('Строчные нарисованы как прописные')>0`), "нет пояснения для шрифта без строчных");
      await page.ev(`document.querySelector('#cmp-seg [data-v=overlay]').click()`);
      await sleep(900);
      assert(await page.ev(`document.querySelector('#cmp-legend').textContent.indexOf('строчные нарисованы как прописные')>0`), "нет пояснения в наложении");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(900);
      await page.ev(`GT_COMPARE.clear()`);
    });
    await t.check("один шрифт в сравнении: пустой слот с подсказкой, «Наложение» недоступно", async () => {
      await page.ev(`GT_COMPARE.add('volt');GT_COMPARE.add('stroka');GT_COMPARE.open()`);
      await sleep(1400);
      await page.ev(`document.querySelector('#cmp-grid [data-rm=stroka]').click()`);
      await sleep(900);
      assert(await page.ev(`!!document.querySelector('#cmp-grid .cmp-slot')`), "нет слота «Добавьте второй шрифт»");
      eq(await page.ev(`document.querySelector('#cmp-seg [data-v=overlay]').getAttribute('aria-disabled')`), "true", "наложение не отключено");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(900);
      await page.ev(`GT_COMPARE.clear()`);
    });

    await t.check("чип «Сравнить» в панели «Образец → Режимы» называется «Две строки»", async () => {
      await page.ev(`(0,eval)("libOpen")('volt')`);
      await sleep(1500);
      await skipTour(page);
      const r = () => page.ev(`(()=>{const b=document.querySelector('#cmpb');return {t:b.textContent,l:b.getAttribute('aria-label'),ti:b.title,s:document.querySelector('#cmpsrc').getAttribute('aria-label')}})()`);
      let v = await r();
      eq(v.t, "Две строки", "текст чипа");
      eq(v.l, "Две строки", "aria-label чипа");
      assert(/^Две строки/.test(v.ti), "title: " + v.ti);
      await page.ev(`document.querySelector('#cmpb').click()`);
      await sleep(500);
      v = await r();
      eq(v.t, "Две строки", "текст чипа во включённом режиме");
      eq(v.s, "Вариант для второй строки", "aria-label списка вариантов");
      await page.ev(`document.querySelector('#cmpb').click()`);
      await sleep(300);
    });
    await t.check("история редактора: «Сравнить» у исходного состояния открывает «Ваша версия / исходный»", async () => {
      await page.ev(`(()=>{const k=PARAMS[0][0],e=document.querySelector('#p_'+k);e.value=String(+e.value+(+e.max-+e.min)*0.25);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
      await sleep(1200);
      await page.ev(`document.querySelector('#hist-btn').click()`);
      await sleep(900);
      const rows = await page.ev(`[...document.querySelectorAll('#hist .hist-l li')].map(li=>({l:li.querySelector('.hist-lab').textContent,c:!!li.querySelector('.hist-cmp')}))`);
      assert(rows.some((r) => r.c), "в окне истории нет кнопок «Сравнить»: " + JSON.stringify(rows));
      assert(await page.ev(`!!document.querySelector('#hist .hist-cmpf')&&document.querySelector('#hist .hist-cmpf').textContent.indexOf('Сравнить с другим шрифтом')>=0`), "нет «Сравнить с другим шрифтом»");
      await page.ev(`[...document.querySelectorAll('#hist .hist-l li')].find(li=>/Исходное/.test(li.textContent)).querySelector('.hist-cmp').click()`);
      await sleep(1600);
      assert(await page.ev(`GT_COMPARE.isOpen()`), "сравнение не открылось из истории");
      eq(await page.ev(`[...document.querySelectorAll('#view-cmp .cmp-card .cmp-ft b')].map(b=>b.textContent)`), ["Ваша версия", "Вольт, исходный"], "карточки");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(1000);
      eq(await page.ev(`(0,eval)("S").tab`), "edit", "возврат в редактор");
    });
    await t.check("история: «Сравнить с другим шрифтом» открывает список библиотеки и сравнение", async () => {
      await page.ev(`document.querySelector('#hist-btn').click()`);
      await sleep(700);
      await page.ev(`document.querySelector('#hist .hist-cmpf').click()`);
      await sleep(400);
      assert(await page.ev(`document.querySelectorAll('#hist .hp-i').length>=10`), "список шрифтов не показан");
      await page.ev(`document.querySelector('#hist .hp-i[data-hp=stroka]').click()`);
      await sleep(1500);
      eq(await page.ev(`GT_COMPARE.items()`), ["h:live", "stroka"], "пара");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(900);
    });

    await t.check("черновики: только черновики между собой, без «С прошлой версией»", async () => {
      const n = await makeDrafts(page);
      eq(n, 2, "создано черновиков редактора");
      await page.ev(`(0,eval)("setTab")('profile')`);
      await sleep(2000);
      await skipTour(page);
      assert(await page.ev(`!!document.querySelector('#cmp-dd-btn')`), "нет кнопки «Сравнить» у черновиков");
      await page.ev(`document.querySelector('#cmp-dd-btn').click()`);
      await sleep(500);
      const cards = await page.ev(`[...document.querySelectorAll('#dd-grid .dd-card')].map(c=>c.dataset.card)`);
      assert(cards.length === 2, "карточек черновиков: " + cards.length);
      await page.ev(`document.querySelector('#dd-grid .dd-card').click()`);
      await sleep(400);
      const tray1 = await page.ev(`document.querySelector('#cmp-tray .cmp-tin').textContent`);
      assert(/добавьте ещё один черновик/.test(tray1), "плашка: " + tray1);
      assert(!/прошлой версией/.test(tray1), "в плашке осталась «С прошлой версией»");
      await page.ev(`document.querySelectorAll('#dd-grid .dd-card')[1].click()`);
      await sleep(500);
      eq((await sel(page)).length, 2, "выбрано два черновика");
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1600);
      assert(await page.ev(`GT_COMPARE.isOpen()`), "сравнение черновиков не открылось");
      eq(await page.ev(`[...document.querySelectorAll('#view-cmp .cmp-card .cmp-ft small')].map(s=>s.textContent)`), ["Черновик, редактор", "Черновик, редактор"], "подписи");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(1000);
      eq(await page.ev(`(0,eval)("S").tab`), "profile", "возврат в профиль");
      eq((await sel(page)).length, 2, "выбор сохранился после закрытия");
      const chosen = await sel(page);
      await reload(page, "profile");
      for (let i = 0; i < 40; i++) {
        if (await page.ev(`window.GT_DRAFTS?.ready()`)) break;
        await sleep(250);
      }
      eq(await sel(page), chosen, "выбор черновиков сохранился после перезагрузки");
      await page.ev(`GT_COMPARE.clear()`);
    });

    await page.goto("library", 390, 844);
    await ready(page, "library");
    await t.check("телефон 390: rect карточки равен сборке без патча; тач-цели «…» и сердечка не меньше 44; одна ось; теги не наезжают", async () => {
      const r = await page.ev(`Object.fromEntries([...document.querySelectorAll('#libgrid .lcard')].map(c=>{
        const q=c.getBoundingClientRect();const f=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,cy:r.y+r.height/2,rect:[r.x-q.x,r.y-q.y,r.width,r.height].map(v=>Math.round(v*10)/10)}};
        const lt=c.querySelector('.lt'),mask=getComputedStyle(lt).webkitMaskImage;
        return [c.dataset.font,{h:f(c.querySelector('.heart')),m:f(c.querySelector('.lc-more')),tags:[...c.querySelectorAll('.lt .tag')].map(f),mask,
          flat:[...[q.width,q.height].map(v=>Math.round(v*10)/10),...f(c.querySelector('canvas.lcv')).rect,...f(c.querySelector('.ln')).rect,...f(lt).rect,...[...c.querySelectorAll('.lt .tag')].flatMap(e=>f(e).rect)]}]}))`);
      for (const [id, c] of Object.entries(r)) {
        rectEq(c.flat, BASE_RECT.p[id], "rect карточки на телефоне " + id);
        assert(c.h.w >= 44 && c.h.h >= 44 && c.m.w >= 44 && c.m.h >= 44, `тач-цель меньше 44: ${c.h.w}x${c.h.h}, ${c.m.w}x${c.m.h}`);
        assert(Math.abs(c.h.cy - c.m.cy) <= 1, "оси различаются на телефоне");
        assert(Math.abs(c.h.w - c.m.w) <= 1 && Math.abs(c.h.h - c.m.h) <= 1, "размеры различаются на телефоне");
        const masked = c.mask && c.mask !== "none";
        for (const tg of c.tags) {
          assert(!overlap(tg, c.h) || masked, "тег наезжает на сердечко на телефоне");
          if (overlap(tg, c.m)) assert(masked && tg.x < c.m.x - 0.5, "тег под «…» не обрезан на телефоне");
        }
      }
    });
    await t.check("телефон, касание: сердечко и «…» вплотную справа в нижней строке карточки, как на десктопе; высота карточки прежняя; зоны не меньше 44", async () => {
      await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
      await page.ev(`location.reload()`);
      await sleep(2500);
      await ready(page, "library");
      const coarse = await page.ev(`matchMedia('(pointer:coarse)').matches`);
      if (!coarse) return;
      const r = await page.ev(`Object.fromEntries([...document.querySelectorAll('#libgrid .lcard')].map(c=>{
        const q=c.getBoundingClientRect();const f=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom,cy:r.y+r.height/2,rect:[r.x-q.x,r.y-q.y,r.width,r.height].map(v=>Math.round(v*10)/10)}};
        const lt=c.querySelector('.lt');
        return [c.dataset.font,{h:f(c.querySelector('.heart')),m:f(c.querySelector('.lc-more')),cr:f(c),tags:[...c.querySelectorAll('.lt .tag')].map(f),
          flat:[...[q.width,q.height].map(v=>Math.round(v*10)/10),...f(c.querySelector('canvas.lcv')).rect,...f(c.querySelector('.ln')).rect,...f(lt).rect,...[...c.querySelectorAll('.lt .tag')].flatMap(e=>f(e).rect)]}]}))`);
      for (const [id, c] of Object.entries(r)) {
        rectEq(c.flat, BASE_RECT.t[id], "rect карточки на телефоне (касание) " + id);
        assert(c.h.w >= 44 && c.h.h >= 44 && c.m.w >= 44 && c.m.h >= 44, "тач-цель меньше 44");
        assert(Math.abs(c.h.cy - c.m.cy) <= 1 && Math.abs(c.h.w - c.m.w) <= 1, "ось или размер различаются");
        assert(Math.abs(c.h.x - c.m.r - 10) <= 1, `зазор между кнопками ${c.h.x - c.m.r}`);
        assert(Math.abs(c.cr.r - c.h.r - 10) <= 1, `отступ сердечка от правого края ${c.cr.r - c.h.r}`);
        for (const tg of c.tags) assert(!overlap(tg, c.h) && !overlap(tg, c.m), "тег наезжает на кнопку " + id + JSON.stringify([tg, c.h, c.m]));
      }
    });
    await t.check("телефон: плашка над нижней панелью и не накрывает её; чипы шрифтов в одну строку", async () => {
      await page.ev(`GT_COMPARE.add('volt');GT_COMPARE.add('stroka')`);
      await sleep(900);
      const tray = await page.ev(rect("#cmp-tray .cmp-tin")), rail = await page.ev(rect(".rail"));
      assert(!overlap(tray, rail), `плашка накрывает нижнюю панель: ${JSON.stringify(tray)} / ${JSON.stringify(rail)}`);
      assert(tray.b <= rail.y, "плашка ниже верха панели");
      assert(tray.h <= rail.h + 12, `плашка выше нижней панели: ${tray.h} / ${rail.h}`);
      assert(Math.abs((rail.y - tray.b) - 8) <= 2, `зазор плашки над панелью: ${rail.y - tray.b}`);
      const row = await page.ev(`(()=>{const t=document.querySelector('#cmp-tray .cmp-tin');const go=document.querySelector('#cmp-go').getBoundingClientRect(),c=t.querySelector('.cmp-tchips');const cs=getComputedStyle(c);const ch=[...c.children].map(e=>e.getBoundingClientRect());return {goCy:go.y+go.height/2,tCy:t.getBoundingClientRect().y+t.getBoundingClientRect().height/2,goR:go.right,tR:t.getBoundingClientRect().right,rows:new Set(ch.map(r=>Math.round(r.y))).size,bar:cs.scrollbarWidth,goH:go.height,label:!!t.querySelector('.cmp-tl')&&getComputedStyle(t.querySelector('.cmp-tl')).display!=='none'}})()`);
      assert(Math.abs(row.goCy - row.tCy) <= 1 && row.rows === 1 && row.goH >= 44 && row.tR - row.goR <= 14, "плашка не в одну строку: " + JSON.stringify(row));
      await page.ev(`document.querySelector('#cmp-go').click()`);
      await sleep(1600);
      const chips = await page.ev(`(()=>{const c=document.querySelector('#cmp-chips');const ys=new Set([...c.children].map(e=>Math.round(e.getBoundingClientRect().top)));return {rows:ys.size,sw:c.scrollWidth>c.clientWidth}})()`);
      eq(chips.rows, 1, "чипы переносятся");
      assert(chips.sw, "чипы не прокручиваются");
      const cards = await page.ev(`[...document.querySelectorAll('#cmp-grid .cmp-card')].map(c=>c.getBoundingClientRect().left)`);
      assert(new Set(cards).size === 1, "на телефоне карточки не друг под другом");
      const sx = await page.ev(`document.documentElement.scrollWidth<=innerWidth+1`);
      assert(sx, "горизонтальная прокрутка страницы");
      await page.ev(`document.querySelector('#cmp-close').click()`);
      await sleep(900);
      await page.ev(`GT_COMPARE.clear()`);
    });
  } finally { page.close(); }
  return t.results;
}
