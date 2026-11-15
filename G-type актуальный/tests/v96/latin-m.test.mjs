import { createSuite, openPage, sleep, assert } from "./lib.mjs";

// Owner rule: Latin m keeps the original arched form, so U+006D must not be
// the Cyrillic м (U+043C) outline. Known pending: fails for some fonts until
// the fix lands; the runner reports it but only `--strict` turns it into a failure.
// Fonts without a real lowercase (owner: Модуль, Рывок, Аппликация, Тяга, Кортес): their
// lowercase code points draw the capitals, so Latin m = Latin M and nothing is compared.
const NO_LOWERCASE = new Set(["modul", "ryvok", "applik", "tyaga", "kortes"]);
export default async function run() {
  const t = createSuite("latin-m");
  const page = await openPage();
  try {
    await page.goto("library");
    await page.ev(`document.querySelector('#onb-skip')?.click()`);
    const ids = await page.ev(`[...new Set([...document.querySelectorAll('#view-library .lcard[data-font]')].map(e=>e.dataset.font))]`);
    assert(ids.length >= 12, "library lists too few fonts: " + ids.length);
    const rows = [];
    for (const id of ids) {
      await page.ev(`location.hash='#library'`);
      await page.ev(`document.querySelector('#view-library .lcard[data-font="${id}"]').click()`);
      let cur = "";
      for (let i = 0; i < 20 && cur !== id; i++) { await sleep(200); cur = await page.ev(`(0,eval)("S").fontId`); }
      const r = await page.ev(`(()=>{const NO_LC=new Set(${JSON.stringify([...NO_LOWERCASE])});const S_=(0,eval)("S");const sig=g=>g?JSON.stringify(g.cs,(k,v)=>typeof v==='function'?undefined:v):null;
        const st=S_.style||'regular';const G=(0,eval)("FONTS")[S_.fontId].GL;
        const raw=g=>g?JSON.stringify(g,(k,v)=>typeof v==='function'?undefined:v):null;const hasLc=!!(G['a']&&G['\\u0430']&&raw(G['a'])!==raw(G['A']));
        const m=gfSmart('m',st),c=gfSmart('\\u043c',st);
        return {id:S_.fontId,hasLc:hasLc&&!NO_LC.has(S_.fontId),same:!!m&&!!c&&sig(m)===sig(c),missing:!m||!c}})()`);
      rows.push(r);
    }
    for (const r of rows) {
      await t.check(`${r.id}: ${r.hasLc ? "U+006D differs from U+043C" : "no lowercase, skipped"}`, async () => {
        assert(r.id, "font did not open");
        if (!r.hasLc) return;
        assert(!r.missing, "glyph m or м missing");
        assert(!r.same, "Latin m is identical to Cyrillic м");
      }, { pending: true });
    }
  } finally { page.close(); }
  return t.results;
}
