import { createSuite, openPage, assert, near } from "./lib.mjs";

const TITLES = ["Свой шрифт за четыре шага", "Собрать из своих знаков", "Отрисовать свой шрифт", "С листа бумаги"];
const TILES = `(()=>{const out=[...document.querySelectorAll('#createcards > *')].filter(e=>e.offsetWidth).map(e=>{const r=e.getBoundingClientRect();const ph=e.querySelector('.imp-ph');const p=ph&&ph.getBoundingClientRect();
return {t:e.textContent,x:r.left,y:r.top,w:r.width,h:r.height,ph:p?{x:p.left,y:p.top,r:p.right,b:p.bottom,w:p.width,h:p.height}:null,r:r.right,b:r.bottom}});return out})()`;

export default async function run() {
  const t = createSuite("laboratory");
  const page = await openPage();
  try {
    await page.goto("home", 1440, 900);
    await t.check("1440: four equal tiles in a 2x2 grid, in the specified order", async () => {
      const c = await page.ev(TILES);
      assert(c.length === 4, c.length + " tiles");
      const w = c.map((x) => x.w), h = c.map((x) => x.h);
      c.forEach((x) => { near(x.w, w[0], 2, "tile width"); near(x.h, h[0], 2, "tile height"); });
      const ys = [...new Set(c.map((x) => Math.round(x.y / 4)))], xs = [...new Set(c.map((x) => Math.round(x.x / 4)))];
      assert(ys.length === 2 && xs.length === 2, `not 2x2: ${xs.length} columns, ${ys.length} rows`);
      const ord = [...c].sort((a, b) => Math.round(a.y / 4) - Math.round(b.y / 4) || a.x - b.x).map((x) => x.t);
      TITLES.forEach((s, i) => assert(ord[i].includes(s), `position ${i + 1}: want «${s}», got «${ord[i].slice(0, 40)}»`));
    });
    await t.check("1440: illustrations are inside their tiles", async () => {
      const c = await page.ev(TILES);
      c.forEach((x, i) => {
        assert(x.ph && x.ph.w > 10 && x.ph.h > 10, `tile ${i + 1} has no illustration`);
        assert(x.ph.x >= x.x - 1 && x.ph.y >= x.y - 1 && x.ph.r <= x.r + 1 && x.ph.b <= x.b + 1, `illustration of tile ${i + 1} sticks out`);
      });
    });
    await page.goto("home", 390, 844);
    await t.check("390: tiles in one column, in order", async () => {
      const c = await page.ev(TILES);
      assert(c.length === 4, c.length + " tiles");
      c.forEach((x) => { near(x.x, c[0].x, 2, "tile left"); near(x.w, c[0].w, 2, "tile width"); });
      const ord = [...c].sort((a, b) => a.y - b.y);
      ord.forEach((x, i) => { assert(x.t.includes(TITLES[i]), `row ${i + 1}: want «${TITLES[i]}»`); if (i) assert(x.y >= ord[i - 1].b - 1, "tiles overlap"); });
    });
    await t.check("390: illustrations are inside their tiles", async () => {
      (await page.ev(TILES)).forEach((x, i) => {
        assert(x.ph && x.ph.w > 10, `tile ${i + 1} has no illustration`);
        assert(x.ph.x >= x.x - 1 && x.ph.y >= x.y - 1 && x.ph.r <= x.r + 1 && x.ph.b <= x.b + 1, `illustration of tile ${i + 1} sticks out`);
      });
    });
  } finally { page.close(); }
  return t.results;
}
