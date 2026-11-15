import { createSuite, openPage, openEditor, RAIL_JS, eq, assert } from "./lib.mjs";

const HOME = ["G-type", "Главная", "Библиотека", "Избранное", "Сообщество", "Тёмная тема", "Подсказки", "Проект", "Профиль"];
const norm = (l) => l.map((s) => (s.startsWith("G-type") ? "G-type" : s.startsWith("Профиль") ? "Профиль" : s));

export default async function run() {
  const t = createSuite("rail");
  const page = await openPage();
  try {
    await page.goto("home", 1440, 900);
    await t.check("home rail at 1440: G-type, Главная, Библиотека, Избранное, Сообщество, Тёмная тема, Подсказки, Проект, Профиль", async () => {
      eq(norm(await page.ev(RAIL_JS)), HOME, "home rail buttons");
    });
    await t.check("no «Искажение» button anywhere on the rail (home)", async () => {
      const r = await page.ev(`[...document.querySelectorAll('.rail *')].filter(e=>/Искажени/i.test((e.getAttribute('aria-label')||'')+(e.title||'')+(e.dataset.tip||'')+(e.id||'')+e.textContent)).map(e=>e.tagName+'#'+e.id)`);
      assert(r.length === 0, "found: " + r.join(", "));
    });

    await openEditor(page);
    await t.check("editor rail keeps Главная, Библиотека, Избранное, Сообщество, Подсказки, Профиль", async () => {
      const l = norm(await page.ev(RAIL_JS));
      const want = ["Главная", "Библиотека", "Избранное", "Сообщество", "Подсказки", "Профиль"];
      const got = l.filter((x) => want.includes(x));
      eq(got, want, "editor rail nav buttons (all: " + l.join(" | ") + ")");
    });
    await t.check("editor rail drops «Тёмная тема» and «Проект»; no «Искажение» button", async () => {
      const l = await page.ev(RAIL_JS);
      assert(!l.includes("Тёмная тема"), "Тёмная тема still on editor rail");
      assert(!l.includes("Проект"), "Проект still on editor rail");
      assert(!l.some((x) => /Искажени/.test(x)), "Искажение on editor rail");
    });

    await page.goto("home", 390, 844);
    await t.check("phone 390 home bar: 7 buttons, no Подсказки", async () => {
      const l = await page.ev(RAIL_JS);
      assert(l.length === 7, `${l.length} buttons: ${l.join(" | ")}`);
      assert(!l.includes("Подсказки"), "Подсказки present on phone bar");
      assert(!l.some((x) => /Искажени/.test(x)), "Искажение on phone bar");
    });
  } finally { page.close(); }
  return t.results;
}
