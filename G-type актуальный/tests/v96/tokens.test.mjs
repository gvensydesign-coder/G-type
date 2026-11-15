import { createSuite, openPage, eq } from "./lib.mjs";

const TOK = { "--fs-xs": "12px", "--accent-press": "#de3931", "--dur-open": "450ms", "--dur-close": "250ms", "--dur-fast": "180ms", "--dur-instant": "90ms" };

export default async function run() {
  const t = createSuite("tokens");
  const page = await openPage();
  try {
    await page.goto("home");
    for (const [k, v] of Object.entries(TOK)) {
      await t.check(`${k} = ${v}`, async () => {
        const got = await page.ev(`getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(k)}).trim().toLowerCase()`);
        eq(got, v);
      });
    }
  } finally { page.close(); }
  return t.results;
}
