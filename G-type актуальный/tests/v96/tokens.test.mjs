import { createSuite, openPage, eq, assert, sleep } from "./lib.mjs";

const TOK = {
  "--fs-xs": "12px",
  "--accent": "#fc473c",
  "--accent-hover": "#ed3f35",
  "--accent-press": "#de3931",
  "--dur-open": "450ms",
  "--dur-close": "250ms",
  "--dur-fast": "180ms",
  "--dur-instant": "90ms",
};

const normBg = (s) => {
  const m = String(s || "")
    .trim()
    .toLowerCase()
    .match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return String(s || "").trim().toLowerCase();
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
};

async function priRestBg(page, sel) {
  const bg = await page.ev(
    `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).backgroundColor`
  );
  return normBg(bg);
}

export default async function run() {
  const t = createSuite("tokens");
  const page = await openPage();
  try {
    await page.goto("home");
    for (const [k, v] of Object.entries(TOK)) {
      await t.check(`${k} = ${v}`, async () => {
        const got = await page.ev(
          `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(k)}).trim().toLowerCase()`
        );
        eq(got, v);
      });
    }

    const priSel = "#home-search .btn.pri";
    await t.check("home «Найти» .btn.pri rest = --accent (light)", async () => {
      eq(await priRestBg(page, priSel), TOK["--accent"]);
    });

    await t.check("accent fills: hover/press tokens darker than rest", async () => {
      const parse = (h) => {
        const m = h.match(/#([0-9a-f]{6})/i);
        assert(m, "hex " + h);
        const n = parseInt(m[1], 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
      };
      const lum = ({ r, g, b }) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const a = lum(parse(TOK["--accent"]));
      const h = lum(parse(TOK["--accent-hover"]));
      const p = lum(parse(TOK["--accent-press"]));
      assert(h < a && p < h, `expected accent-hover/press darker than accent (${a} > ${h} > ${p})`);
      const css = await page.ev(
        `(()=>{const s=document.getElementById('gtype-brand-accent');return s?s.textContent:''})()`
      );
      assert(css.includes("accent-hover") && css.includes("accent-press"), "brand accent style block");
    });

    await page.ev(`document.documentElement.dataset.theme='dark'`);
    await sleep(200);
    await t.check("home «Найти» .btn.pri rest = --accent (dark)", async () => {
      eq(await priRestBg(page, priSel), TOK["--accent"]);
    });
  } finally {
    page.close();
  }
  return t.results;
}