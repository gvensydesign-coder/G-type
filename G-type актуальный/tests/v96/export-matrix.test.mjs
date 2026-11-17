import { createSuite, openPage, exportFormat, fontInfo, fontSignature, magic, assert, sleep } from "./lib.mjs";

const IDS = (process.env.GTYPE_FONT_GROUP || "").split(",").filter(Boolean);
const FORMATS = [
  ["ttf", ["\x00\x01\x00\x00", "true"], null],
  ["otf", ["OTTO"], null],
  ["woff", ["wOFF"], "woff"],
  ["woff2", ["wOF2"], "woff2"],
];

function sameSignature(base, other, id, fmt) {
  assert(other, `${id} ${fmt}: missing export signature`);
  for (const key of Object.keys(base)) {
    if (JSON.stringify(base[key]) === JSON.stringify(other[key])) continue;
    if (key === "advances") {
      const cp = Object.keys(base.advances).find(n => base.advances[n] !== other.advances[n]);
      throw new Error(`${id} ${fmt}: advance differs at U+${Number(cp).toString(16)} (${base.advances[cp]} vs ${other.advances[cp]})`);
    }
    if (key === "cmap") {
      const i = base.cmap.findIndex((n, i) => n !== other.cmap[i]);
      throw new Error(`${id} ${fmt}: cmap differs at index ${i}; lengths ${base.cmap.length}/${other.cmap.length}`);
    }
    throw new Error(`${id} ${fmt}: ${key} differs (${JSON.stringify(base[key])} vs ${JSON.stringify(other[key])})`);
  }
}

export default async function run() {
  assert(IDS.length > 0, "GTYPE_FONT_GROUP is required");
  const t = createSuite("export-matrix");
  const page = await openPage();
  try {
    for (const id of IDS) {
      let opened = false;
      await t.check(`${id}: opens in editor`, async () => {
        await page.goto("library");
        await page.ev(`document.querySelector("#onb-skip")?.click()`);
        await page.ev(`document.querySelector("#view-library .lcard[data-font=${id}]").click()`);
        for (let i = 0; i < 40; i++) {
          if (await page.ev(`(0,eval)("S").fontId===${JSON.stringify(id)}&&(0,eval)("S").tab==="edit"`)) break;
          await sleep(250);
        }
        opened = await page.ev(`(0,eval)("S").fontId===${JSON.stringify(id)}&&(0,eval)("S").tab==="edit"`);
        assert(opened, "font did not open");
      });
      if (!opened) continue;
      const signatures = {};
      for (const [fmt, magics, flavor] of FORMATS) {
        await t.check(`${id}: ${fmt} parses externally`, async () => {
          const r = await exportFormat(page, fmt);
          assert(r.name.toLowerCase().endsWith("." + fmt), "bad file name: " + r.name);
          assert(r.bytes.length > 5000, "file too small");
          assert(magics.includes(magic(r.bytes)), "bad magic");
          const info = fontInfo(r.bytes);
          assert(info.flavor === flavor, `bad flavor: ${info.flavor}`);
          assert(info.cmap > 100 && info.glyphs > 100, "font looks empty");
          assert(fmt === "otf" ? info.tables.includes("CFF ") : info.tables.includes("glyf"), "outline table missing");
          signatures[fmt] = fontSignature(r.bytes);
        });
      }
      await t.check(`${id}: Unicode, advances, metrics and OpenType agree in all formats`, async () => {
        const base = signatures.ttf;
        assert(base, "TTF export missing");
        for (const cp of [32, 65, 1040]) assert(base.cmap.includes(cp), `missing U+${cp.toString(16)}`);
        for (const [fmt] of FORMATS) sameSignature(base, signatures[fmt], id, fmt);
      });
    }
  } finally { page.close(); }
  return t.results;
}
